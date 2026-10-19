'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase/client';
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
      const res = await fetch(`/api/game/state?code=${code}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch room state');
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

    fetch(`/api/game/state?code=${roomCode}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          if (data.error) {
            setError(data.error);
          } else {
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

  // Realtime subscription setup
  useEffect(() => {
    if (!room?.id || !currentProfile?.id) return;

    const roomId = room.id;
    const profileId = currentProfile.id;

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { ack: false },
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

    // Listen for changes on game_players (joins, leaves, ready, card counts)
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
        refreshState();
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

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Connected to Realtime
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, currentProfile?.id, refreshState]);

  // Actions
  const playCard = async (
    cardId: string,
    chosenColor?: CardColor,
    calledUno?: boolean
  ) => {
    if (!room || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/game/play', {
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
      const res = await fetch('/api/game/draw', {
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const callUno = async () => {
    if (!room) return;
    try {
      const res = await fetch('/api/game/call-uno', {
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
      const res = await fetch('/api/game/challenge-uno', {
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
      const res = await fetch('/api/room/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, isReady }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update ready state');
      }
      await refreshState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startGame = async () => {
    if (!room) return;
    try {
      const res = await fetch('/api/room/start', {
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
      const res = await fetch('/api/game/rematch', {
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
      await fetch('/api/room/leave', {
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
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatarColor }),
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        setCurrentProfile(data.profile);
      }
    } catch {
      // Ignored
    }
  };

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
