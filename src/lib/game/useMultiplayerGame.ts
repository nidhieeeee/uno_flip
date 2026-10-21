'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase/client';
import { apiFetch, setClientPlayerToken } from './clientSession';
import {
  CardColor,
  GamePlayer,
  GameRoom,
  PlayerProfile,
  UnoFlipCard,
} from './types';

export function useMultiplayerGame(roomCode: string | null) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [me, setMe] = useState<GamePlayer | null>(null);
  const [myHand, setMyHand] = useState<UnoFlipCard[]>([]);
  const [currentProfile, setCurrentProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refresh entire game state from server
  const refreshState = useCallback(async (codeToFetch?: string) => {
    const code = codeToFetch || roomCode;
    if (!code) return;

    try {
      const res = await apiFetch(`/api/game/state?code=${code}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch room state');
      }

      if (data.token) {
        setClientPlayerToken(data.token);
      }

      setRoom(data.room);
      setPlayers(data.players || []);
      setMe(data.me);
      setMyHand(data.myHand || []);
      if (data.currentProfile) {
        setCurrentProfile(data.currentProfile);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to sync with game server');
    } finally {
      setIsLoading(false);
    }
  }, [roomCode]);

  // Initial load
  useEffect(() => {
    let ignore = false;
    if (!roomCode) return;

    apiFetch(`/api/game/state?code=${roomCode}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          if (data.error) {
            setError(data.error);
          } else {
            if (data.token) {
              setClientPlayerToken(data.token);
            }
            setRoom(data.room);
            setPlayers(data.players || []);
            setMe(data.me);
            setMyHand(data.myHand || []);
            if (data.currentProfile) {
              setCurrentProfile(data.currentProfile);
            }
            setError(null);
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Failed to sync with game server');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [roomCode]);

  const roomRef = useRef(room);
  roomRef.current = room;

  const currentProfileRef = useRef(currentProfile);
  currentProfileRef.current = currentProfile;

  const refreshStateRef = useRef(refreshState);
  refreshStateRef.current = refreshState;

  const leaveTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Realtime subscription setup - only re-subscribe if room.id or currentProfile.id changes
  useEffect(() => {
    if (!room?.id || !currentProfile?.id) return;

    const roomId = room.id;
    const profileId = currentProfile.id;

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { ack: false },
        presence: { key: profileId },
      },
    });

    // Listen for changes on game_rooms
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) {
          setRoom(payload.new as GameRoom);
        }
      }
    );

    // Listen for changes on game_players (joins, leaves, ready, card counts, disconnects)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `room_id=eq.${roomId}`,
      },
      () => {
        // Refresh players list
        refreshStateRef.current();
      }
    );

    // Listen for updates on player's own private hand
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_player_hands',
        filter: `room_id=eq.${roomId}`,
      },
      (payload: any) => {
        if (payload.new && payload.new.profile_id === profileId) {
          setMyHand(payload.new.cards || []);
        }
      }
    );

    // Presence: Detect unexpected disconnections with debounce to avoid false alarms
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
      const leftProfileId = key || leftPresences?.[0]?.profileId;
      if (!leftProfileId || leftProfileId === profileId) return;

      if (leaveTimersRef.current.has(leftProfileId)) {
        clearTimeout(leaveTimersRef.current.get(leftProfileId)!);
      }

      // Check after 6 seconds: did this player actually leave, or was it a brief reconnect/render?
      const timer = setTimeout(() => {
        const state = channel.presenceState();
        const isStillPresent = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.profileId === leftProfileId)
        );

        if (!isStillPresent && roomRef.current?.status === 'playing') {
          apiFetch('/api/room/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, profileId: leftProfileId }),
          }).catch(() => {});
        }
        leaveTimersRef.current.delete(leftProfileId);
      }, 6000);

      leaveTimersRef.current.set(leftProfileId, timer);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
      const joinedProfileId = key || newPresences?.[0]?.profileId;
      if (joinedProfileId && leaveTimersRef.current.has(joinedProfileId)) {
        clearTimeout(leaveTimersRef.current.get(joinedProfileId)!);
        leaveTimersRef.current.delete(joinedProfileId);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({
            profileId,
            nickname: currentProfileRef.current?.nickname || 'Player',
            onlineAt: new Date().toISOString(),
          });
        } catch {
          // Fallback
        }
      }
    });

    const handleBeforeUnload = () => {
      if (roomRef.current?.status === 'playing') {
        try {
          navigator.sendBeacon?.(
            '/api/room/disconnect',
            new Blob([JSON.stringify({ roomId, profileId })], { type: 'application/json' })
          );
        } catch {
          // Ignored
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      leaveTimersRef.current.forEach((t) => clearTimeout(t));
      leaveTimersRef.current.clear();
      supabase.removeChannel(channel);
    };
  }, [room?.id, currentProfile?.id]);

  // Server-authoritative disconnect grace period monitor (15 seconds)
  useEffect(() => {
    if (!room?.id || room.status !== 'playing') return;

    const roomId = room.id;
    const interval = setInterval(async () => {
      const now = Date.now();
      for (const player of players) {
        if (
          player.profile_id !== currentProfile?.id &&
          !player.is_connected &&
          player.disconnected_at
        ) {
          const disconnectedTime = new Date(player.disconnected_at).getTime();
          if (now - disconnectedTime >= 15000) {
            try {
              await apiFetch('/api/room/disconnect-timeout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, targetPlayerId: player.profile_id }),
              });
              await refreshState();
            } catch {
              // Server validates authority
            }
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.id, room?.status, players, currentProfile?.id, refreshState]);

  // Actions
  const playCard = async (
    cardId: string,
    chosenColor?: CardColor,
    calledUno?: boolean
  ) => {
    if (!room || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/game/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          cardId,
          chosenColor,
          calledUno,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresColorSelection) {
          return { requiresColorSelection: true, cardId: data.cardId, side: data.side };
        }
        throw new Error(data.error || 'Play failed');
      }

      if (data.myHand) {
        setMyHand(data.myHand);
      }
      await refreshState();
      return { success: true };
    } catch (err: any) {
      alert(err.message);
      return { error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const drawCard = async () => {
    if (!room || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/game/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Draw failed');
      }
      if (data.myHand) {
        setMyHand(data.myHand);
      }
      await refreshState();
      return data;
    } catch (err: any) {
      alert(err.message);
      return { error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDrawDecision = async (action: 'play' | 'keep', chosenColor?: CardColor) => {
    if (!room || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/game/draw-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, action, chosenColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresColorSelection) {
          return { requiresColorSelection: true, cardId: data.cardId, side: data.side };
        }
        throw new Error(data.error || 'Draw decision failed');
      }
      if (data.myHand) {
        setMyHand(data.myHand);
      }
      await refreshState();
      return { success: true, action: data.action };
    } catch (err: any) {
      alert(err.message);
      return { error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const callUno = async () => {
    if (!room) return;
    try {
      const res = await apiFetch('/api/game/call-uno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to call UNO');
      }
      await refreshState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const challengeUno = async (targetPlayerId: string) => {
    if (!room) return;
    try {
      const res = await apiFetch('/api/game/challenge-uno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, targetPlayerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Challenge failed');
      }
      await refreshState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleReady = async (isReady: boolean) => {
    if (!room) return;
    try {
      const res = await apiFetch('/api/room/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, isReady }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update ready state');
      }
      if (data.token) {
        setClientPlayerToken(data.token);
      }
      await refreshState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startGame = async () => {
    if (!room) return;
    try {
      const res = await apiFetch('/api/room/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start game');
      }
      await refreshState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const rematch = async () => {
    if (!room) return;
    try {
      const res = await apiFetch('/api/game/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to rematch');
      }
      await refreshState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const leaveRoom = async () => {
    if (!room) return;
    try {
      await apiFetch('/api/room/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
      });
    } catch {
      // Ignored
    }
  };

  const updateProfile = async (nickname: string, avatarColor?: string) => {
    try {
      const res = await apiFetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatarColor }),
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        setCurrentProfile(data.profile);
      }
      if (data.token) {
        setClientPlayerToken(data.token);
      }
    } catch {
      // Ignored
    }
  };

  // Server-authoritative turn timeout & UNO timeout monitor
  useEffect(() => {
    if (!room?.id || room.status !== 'playing') return;

    const roomId = room.id;
    let turnTimeoutSent = false;
    let unoTimeoutSent = false;

    const interval = setInterval(async () => {
      const now = Date.now();

      // 1. Check turn deadline (30s default or decision deadline)
      if (room.turn_deadline) {
        const turnDeadlineMs = new Date(room.turn_deadline).getTime();
        if (now >= turnDeadlineMs && !turnTimeoutSent) {
          turnTimeoutSent = true;
          try {
            await apiFetch('/api/game/turn-timeout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId }),
            });
            await refreshState();
          } catch {
            // Handled on server
          }
        }
      }

      // 2. Check 5-second UNO declaration deadline
      if (room.uno_declaration_deadline) {
        const unoDeadlineMs = new Date(room.uno_declaration_deadline).getTime();
        if (now >= unoDeadlineMs && !unoTimeoutSent) {
          unoTimeoutSent = true;
          try {
            await apiFetch('/api/game/uno-timeout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId }),
            });
            await refreshState();
          } catch {
            // Handled on server
          }
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [room?.id, room?.status, room?.turn_deadline, room?.uno_declaration_deadline, refreshState]);

  return {
    room,
    players,
    me,
    myHand,
    currentProfile,
    isLoading,
    error,
    isSubmitting,
    playCard,
    drawCard,
    submitDrawDecision,
    callUno,
    challengeUno,
    toggleReady,
    startGame,
    rematch,
    leaveRoom,
    updateProfile,
    refreshState,
  };
}
