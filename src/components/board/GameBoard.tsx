'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CardColor, GamePlayer, GameRoom, PlayerProfile, Side, UnoFlipCard } from '@/lib/game/types';
import { isValidPlay } from '@/lib/game/engine';
import { formatGameActionMessage, getActionUniqueKey, FormattedGameEvent } from '@/lib/game/activityLog';
import { DiscardPile } from '../card/DiscardPile';
import { DeckPile } from '../card/DeckPile';
import { PlayerHand } from './PlayerHand';
import { OpponentSeat } from './OpponentSeat';
import { GameActivityFeed } from './GameActivityFeed';
import { ColorPickerModal } from '../modals/ColorPickerModal';
import { GameOverModal } from '../modals/GameOverModal';
import { HowToPlayModal } from '../modals/HowToPlayModal';
import { DrawDecisionModal } from '../modals/DrawDecisionModal';
import { UfLogo } from '../common/UfLogo';
import { isSoundMuted, playFlipSound, playPenaltySound, toggleSoundMuted } from '@/lib/audio/sound';
import {
  launchCardPlayOverlay,
  launchOpponentPlayOverlay,
  launchOpponentDrawOverlay,
} from '@/lib/game/cardAnimation';
import {
  Clock,
  FlipHorizontal,
  HelpCircle,
  LogOut,
  RotateCcw,
  RotateCw,
  ShieldAlert,
  Sparkles,
  UserMinus,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface GameBoardProps {
  room: GameRoom;
  players: GamePlayer[];
  me: GamePlayer | null;
  myHand: UnoFlipCard[];
  currentProfile: PlayerProfile | null;
  onPlayCard: (cardId: string, chosenColor?: CardColor, calledUno?: boolean) => Promise<any>;
  onDrawCard: () => void;
  onSubmitDrawDecision?: (action: 'play' | 'keep', chosenColor?: CardColor) => Promise<any>;
  onCallUno: () => void;
  onChallengeUno: (targetPlayerId: string) => void;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  room,
  players,
  me,
  myHand,
  currentProfile,
  onPlayCard,
  onDrawCard,
  onSubmitDrawDecision,
  onCallUno,
  onChallengeUno,
  onRematch,
  onLeaveRoom,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState<UnoFlipCard | null>(null);
  const [isFromDrawDecision, setIsFromDrawDecision] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [penalizedPlayerId, setPenalizedPlayerId] = useState<string | null>(null);
  const [penaltyAnnouncement, setPenaltyAnnouncement] = useState<{
    message: string;
    isTargetMe: boolean;
  } | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [soundMuted, setSoundMutedState] = useState(isSoundMuted());
  const [currentTurnTime, setCurrentTurnTime] = useState(() => Date.now());
  const [events, setEvents] = useState<FormattedGameEvent[]>([]);
  const recordedEventKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Suspend countdown if draw decision is pending or no deadline is set
    if (room.pending_draw_decision || !room.turn_deadline || room.status !== 'playing') {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTurnTime(Date.now());
    }, 200);
    return () => clearInterval(interval);
  }, [room.turn_deadline, room.pending_draw_decision, room.status]);

  const turnSecondsLeft =
    !room.pending_draw_decision && room.turn_deadline && room.status === 'playing'
      ? Math.max(0, Math.ceil((new Date(room.turn_deadline).getTime() - currentTurnTime) / 1000))
      : null;

  const boardRef = useRef<HTMLDivElement>(null);
  const prevSideRef = useRef<Side>(room.current_side);
  const lastHandledActionTimestamp = useRef<number>(0);
  const penaltyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const actionBannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (penaltyTimerRef.current) clearTimeout(penaltyTimerRef.current);
      if (actionBannerTimerRef.current) clearTimeout(actionBannerTimerRef.current);
    };
  }, []);

  const isLight = room.current_side === 'light';
  const isMyTurn = me !== null && room.current_turn_seat === me.seat_index;

  // Active player details
  const activePlayer = players.find((p) => p.seat_index === room.current_turn_seat);
  const activePlayerName = isMyTurn
    ? 'YOUR TURN'
    : `${activePlayer?.profile?.nickname || 'Player'} is playing...`;

  // GSAP 3D Board Flip Animation when side changes (brief and noticeable: ~280ms)
  useEffect(() => {
    if (prevSideRef.current !== room.current_side && boardRef.current) {
      prevSideRef.current = room.current_side;
      playFlipSound();

      const isReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (isReducedMotion) {
        gsap.fromTo(
          boardRef.current,
          { opacity: 0.7 },
          { opacity: 1, duration: 0.15, ease: 'power1.out' }
        );
      } else {
        // Animate 3D board flip cleanly and quickly (280ms)
        gsap.fromTo(
          boardRef.current,
          { rotateY: -180, scale: 0.96, opacity: 0.8 },
          {
            rotateY: 0,
            scale: 1,
            opacity: 1,
            duration: 0.28,
            ease: 'power2.out',
          }
        );
      }
    }
  }, [room.current_side]);

  // Synchronize Live Game Activity Feed with authoritative confirmed events
  useEffect(() => {
    if (!room.last_action) return;
    const action = room.last_action;
    const key = getActionUniqueKey(action);

    if (recordedEventKeysRef.current.has(key)) return;
    recordedEventKeysRef.current.add(key);

    const formattedMsg = formatGameActionMessage(action, room.current_side);
    const newEvt: FormattedGameEvent = {
      id: key,
      type: action.type,
      message: formattedMsg,
      playerName: action.playerName || 'Player',
      timestamp: action.timestamp || Date.now(),
    };

    setEvents((prev) => [...prev.slice(-9), newEvt]);
  }, [room.last_action, room.current_side]);

  // Record win event authoritatively in feed upon match conclusion
  useEffect(() => {
    if (room.status === 'finished' && room.winner_id) {
      const winKey = `win_${room.id}_${room.winner_id}`;
      if (!recordedEventKeysRef.current.has(winKey)) {
        recordedEventKeysRef.current.add(winKey);
        const winner = players.find((p) => p.profile_id === room.winner_id);
        const isMeWinner = room.winner_id === me?.profile_id;
        const winnerName = isMeWinner ? 'You' : winner?.profile?.nickname || 'Player';
        const winEvt: FormattedGameEvent = {
          id: winKey,
          type: 'win',
          message: `${winnerName} wins!`,
          playerName: winnerName,
          timestamp: Date.now(),
        };
        setEvents((prev) => [...prev.slice(-9), winEvt]);
      }
    }
  }, [room.status, room.winner_id, room.id, players, me?.profile_id]);

  // Handle Penalty Action Animation, Sound, and Temporary Action Banners
  useEffect(() => {
    if (!room.last_action) return;
    const action = room.last_action;
    if (action.timestamp === lastHandledActionTimestamp.current) return;
    lastHandledActionTimestamp.current = action.timestamp;

    const isPenalty =
      action.type === 'challenge_uno' ||
      (typeof action.message === 'string' &&
        action.message.toLowerCase().includes('penalty'));

    if (isPenalty) {
      const targetId = action.targetPlayerId || action.playerId;
      if (!targetId) return;

      const isTargetMe = targetId === me?.profile_id;
      let bannerMsg = action.message || 'Penalty applied!';
      if (action.type === 'challenge_uno' && isTargetMe) {
        bannerMsg = 'CAUGHT! You forgot to call UNO! (+2 cards penalty)';
      }

      setTimeout(() => {
        setPenalizedPlayerId(targetId);
        setPenaltyAnnouncement({
          message: bannerMsg,
          isTargetMe,
        });
      }, 0);

      // Play penalty sound
      playPenaltySound();

      // Trigger GSAP Flying cards animation
      if (typeof window !== 'undefined') {
        const targetEl = isTargetMe
          ? document.getElementById('player-hand-container')
          : document.getElementById(`opponent-card-stack-${targetId}`) ||
            document.getElementById(`opponent-seat-${targetId}`);

        if (targetEl) {
          // Subtle shake target area
          gsap.fromTo(
            targetEl,
            { x: -6 },
            { x: 0, duration: 0.35, ease: 'power2.out' }
          );

          // Fly penalty cards from draw pile to opponent seat using authentic UNO FLIP card-back
          if (!isTargetMe) {
            const cardCountToFly = Math.min(action.drawnCount || 2, 3);
            launchOpponentDrawOverlay(targetEl, room.current_side, cardCountToFly);
          }
        }
      }

      // Automatically dismiss penalty effect after 2.5 seconds
      if (penaltyTimerRef.current) {
        clearTimeout(penaltyTimerRef.current);
      }
      penaltyTimerRef.current = setTimeout(() => {
        setPenalizedPlayerId(null);
        setPenaltyAnnouncement(null);
        penaltyTimerRef.current = null;
      }, 2500);
    } else {
      // Normal game action (play, draw, pass, flip)
      // Trigger opponent card-back flight animations
      if (typeof window !== 'undefined' && action.playerId && action.playerId !== me?.profile_id) {
        const opponentSeatEl =
          document.getElementById(`opponent-card-stack-${action.playerId}`) ||
          document.getElementById(`opponent-seat-${action.playerId}`);

        if (opponentSeatEl) {
          if (action.type === 'play') {
            launchOpponentPlayOverlay(opponentSeatEl, room.current_side);
          } else if (action.type === 'draw') {
            const count = action.drawnCount || 1;
            launchOpponentDrawOverlay(opponentSeatEl, room.current_side, count);
          }
        }
      }

      if (action.message) {
        // Normal game action banner (play, pass, flip) — auto-dismiss after 3s
        setTimeout(() => {
          setActionBanner(action.message);
        }, 0);
        if (actionBannerTimerRef.current) {
          clearTimeout(actionBannerTimerRef.current);
        }
        actionBannerTimerRef.current = setTimeout(() => {
          setActionBanner(null);
          actionBannerTimerRef.current = null;
        }, 3000);
      }
    }
  }, [room.last_action, room.current_side, me?.profile_id]);

  // Handle card click
  const handleCardClick = useCallback(
    async (card: UnoFlipCard) => {
      const face = room.current_side === 'light' ? card.light : card.dark;
      if (face.color === 'wild') {
        setPendingCard(card);
        setShowColorPicker(true);
        return;
      }

      await onPlayCard(card.id, undefined, me?.has_called_uno);
    },
    [room.current_side, onPlayCard, me?.has_called_uno]
  );

  const handleColorSelected = async (chosenColor: CardColor) => {
    if (!pendingCard) return;
    const cardId = pendingCard.id;
    const isFromDraw = isFromDrawDecision;

    setShowColorPicker(false);
    setPendingCard(null);
    setIsFromDrawDecision(false);

    // Launch flying overlay for the played wild card as a separate temporary overlay
    if (typeof window !== 'undefined') {
      const el = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
      if (el) {
        launchCardPlayOverlay(el, cardId);
      }
    }

    if (isFromDraw) {
      if (onSubmitDrawDecision) {
        await onSubmitDrawDecision('play', chosenColor);
      }
    } else {
      await onPlayCard(cardId, chosenColor, me?.has_called_uno);
    }
  };

  const isValidCard = useCallback(
    (card: UnoFlipCard) =>
      isValidPlay(card, room.top_card, room.current_side, room.active_color, room.draw_penalty || 0),
    [room.top_card, room.current_side, room.active_color, room.draw_penalty]
  );

  const canStack = (room.draw_penalty || 0) > 0 && myHand.some(isValidCard);

  // Organize opponents around the table relative to current player seat
  const mySeat = me?.seat_index ?? 0;
  const opponents = players
    .filter((p) => p.profile_id !== currentProfile?.id)
    .sort((a, b) => {
      const diffA = (a.seat_index - mySeat + players.length) % players.length;
      const diffB = (b.seat_index - mySeat + players.length) % players.length;
      return diffA - diffB;
    });

  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(room.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] select-none bg-[url('/background.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white flex flex-col justify-between overflow-hidden relative">
      {/* Ambient Lighting Overlay for Light / Dark side immersion */}
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-500 ${
          isLight ? 'bg-black/20' : 'bg-black/45'
        }`}
      />

      {/* TOP HUD BAR */}
      <header className="relative z-20 w-full max-w-5xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between border-b border-[#2D333B]/80 bg-[#15191F]/90 backdrop-blur-md rounded-b-xl shadow-lg pt-[max(0.35rem,env(safe-area-inset-top,0px))] shrink-0">
        {/* Room Info & Side Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="flex items-center gap-1.5">
            <UfLogo size="xs" />
            <span className="hidden sm:inline font-black text-[11px] tracking-wide text-white">
              UNO FLIP
            </span>
          </div>

          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider ${
              isLight
                ? 'bg-[#FFCC00] text-[#15191F]'
                : 'bg-[#2D333B] text-white border border-[#404752]'
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{isLight ? 'Light Side' : 'Dark Side'}</span>
            <span className="xs:hidden">{isLight ? 'Light' : 'Dark'}</span>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-mono font-medium text-[#9BA3AF] bg-[#1E232B] px-2 sm:px-3 py-1 rounded-lg border border-[#2D333B] hover:text-white active:scale-95 transition-all touch-manipulation cursor-pointer"
            title="Click to copy room code"
          >
            <span className="text-[#9BA3AF] hidden xs:inline">Room:</span>
            <span className="text-white font-bold">{room.code}</span>
            {codeCopied && (
              <span className="text-[#27AE60] text-[9px] font-bold uppercase tracking-wider ml-0.5">
                Copied!
              </span>
            )}
          </button>
        </div>

        {/* Action Banner / Turn Banner */}
        <div className="flex items-center px-1">
          <div
            className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all max-w-[130px] xs:max-w-[180px] sm:max-w-none truncate ${
              isMyTurn
                ? 'bg-[#FFCC00] text-[#15191F] shadow-[0_0_12px_rgba(255,204,0,0.3)] border border-amber-300'
                : 'bg-[#1E232B] text-[#9BA3AF] border border-[#2D333B]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{activePlayerName}</span>
          </div>
        </div>

        {/* Sound, Rules & Exit */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sound Mute Toggle Button */}
          <button
            onClick={() => {
              const next = toggleSoundMuted();
              setSoundMutedState(next);
            }}
            className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-lg bg-[#1E232B] hover:bg-[#252B35] active:scale-95 border border-[#2D333B] text-[#9BA3AF] hover:text-white transition-all cursor-pointer flex items-center justify-center touch-manipulation"
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {soundMuted ? (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ED1C24]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#27AE60]" />
            )}
          </button>

          <button
            onClick={() => setShowRules(true)}
            className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-lg bg-[#1E232B] hover:bg-[#252B35] active:scale-95 border border-[#2D333B] text-[#9BA3AF] hover:text-white transition-all cursor-pointer flex items-center justify-center touch-manipulation"
            title="Rules"
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFCC00]" />
          </button>
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-lg bg-[#1E232B] hover:bg-red-950/40 active:scale-95 border border-[#2D333B] hover:border-[#ED1C24]/50 text-[#9BA3AF] hover:text-[#ED1C24] transition-all cursor-pointer flex items-center justify-center touch-manipulation"
            title="Leave Game"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* Prominent Penalty Announcement Banner */}
      {penaltyAnnouncement && (
        <div className="absolute top-13 sm:top-14 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
          <div className="bg-[#ED1C24] border border-white/40 text-white text-xs sm:text-sm font-black px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
            <span>{penaltyAnnouncement.message}</span>
          </div>
        </div>
      )}

      {/* Floating Action Announcement Toast */}
      {actionBanner && !penaltyAnnouncement && (
        <div className="absolute top-13 sm:top-14 inset-x-0 z-30 flex justify-center pointer-events-none px-4">
          <div className="bg-[#1E232B] border border-[#2D333B] text-white text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {room.last_action?.type === 'player_left' ? (
              <UserMinus className="w-4 h-4 text-[#ED1C24]" />
            ) : room.last_action?.type === 'player_disconnected' ? (
              <WifiOff className="w-4 h-4 text-[#FFCC00]" />
            ) : room.last_action?.type === 'player_reconnected' ? (
              <Wifi className="w-4 h-4 text-[#27AE60]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#FFCC00]" />
            )}
            <span>{actionBanner}</span>
          </div>
        </div>
      )}

      {/* Desktop/Tablet Live Activity Feed Docked on Left Table Area */}
      <div className="hidden sm:block absolute left-4 top-16 z-20 pointer-events-none">
        <GameActivityFeed events={events} />
      </div>

      {/* MAIN GAME TABLE (GSAP Ref) */}
      <main
        ref={boardRef}
        className="relative z-10 flex-1 flex flex-col items-center justify-start sm:justify-evenly max-w-5xl mx-auto w-full px-1 xs:px-2 pt-2 sm:pt-4 pb-1 min-h-0"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Opponents Row (Top / Sides) */}
        <div
          className={`w-full flex items-center ${
            opponents.length === 1 ? 'justify-center' : 'justify-around'
          } mt-0.5 sm:mt-1 mb-1 sm:mb-2 max-w-3xl px-1 shrink-0 z-10`}
        >
          {opponents.map((opponent, idx) => (
            <OpponentSeat
              key={opponent.id}
              player={opponent}
              isCurrentTurn={opponent.seat_index === room.current_turn_seat}
              activeSide={room.current_side}
              isVulnerable={room.uno_challenge_target === opponent.profile_id}
              isPenalized={penalizedPlayerId === opponent.profile_id}
              penaltyLabel={
                penalizedPlayerId === opponent.profile_id && penaltyAnnouncement
                  ? penaltyAnnouncement.message.includes('+1')
                    ? '+1 CARD PENALTY'
                    : '+2 CARDS PENALTY'
                  : '+2 CARDS PENALTY'
              }
              onChallengeUno={onChallengeUno}
              position={
                opponents.length === 1
                  ? 'top'
                  : opponents.length === 2
                  ? idx === 0
                    ? 'left'
                    : 'right'
                  : idx === 0
                  ? 'left'
                  : idx === 1
                  ? 'top'
                  : 'right'
              }
            />
          ))}
        </div>

        {/* Mobile-only compact Live Activity Feed ticker */}
        <div className="flex sm:hidden w-full justify-center px-2 my-0.5 pointer-events-none">
          <GameActivityFeed events={events.slice(-1)} className="max-w-xs" />
        </div>

        {/* Central Arena: Direction Ring, Discard Pile, Draw Pile */}
        <div className="relative flex items-center justify-center gap-3 xs:gap-6 sm:gap-10 p-2.5 xs:p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-[#1E232B]/85 backdrop-blur-md border border-[#2D333B]/80 shadow-2xl">
          {/* Direction Indicator Widget */}
          <div
            className="absolute -top-3 flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 rounded-lg bg-[#15191F] border border-[#2D333B] text-[10px] sm:text-[11px] font-bold text-[#9BA3AF]"
            title={`Direction: ${room.direction === 1 ? 'Clockwise' : 'Counter-Clockwise'}`}
          >
            {room.direction === 1 ? (
              <>
                <RotateCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#1677E8]" />
                <span>Clockwise</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#ED1C24]" />
                <span>Counter-Clockwise</span>
              </>
            )}
          </div>

          {/* Active Penalty Stack Badge */}
          {(room.draw_penalty || 0) > 0 && (
            <div className="absolute -top-3.5 right-2 sm:right-4 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#ED1C24] text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg border border-red-300/40">
              <span className="w-2 h-2 rounded-full bg-white inline-block" />
              <span>STACK: +{room.draw_penalty} CARDS</span>
            </div>
          )}

          {/* Draw Pile */}
          <DeckPile
            count={room.draw_pile_count}
            activeSide={room.current_side}
            isMyTurn={isMyTurn}
            onDraw={onDrawCard}
            drawPenalty={room.draw_penalty}
          />

          {/* Discard Pile */}
          <DiscardPile
            topCard={room.top_card}
            side={room.current_side}
            activeColor={room.active_color}
          />
        </div>

        {/* Turn Prompt Hint & Synchronized Turn Countdown */}
        {room.status === 'playing' && (
          <div className="mt-1.5 xs:mt-2 sm:mt-3 flex flex-col sm:flex-row items-center gap-1 sm:gap-2.5 px-2 text-center max-w-full">
            {room.pending_draw_decision ? (
              <div className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-black tracking-wider uppercase flex items-center gap-1.5 bg-[#1E232B] border border-[#FFCC00]/40 text-[#FFCC00] shadow-md">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {room.pending_draw_decision.player_id === me?.profile_id
                    ? 'DECISION PENDING'
                    : 'PLAYER DECIDING...'}
                </span>
              </div>
            ) : (
              turnSecondsLeft !== null && (
                <div
                  className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-black tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-md ${
                    turnSecondsLeft <= 5
                      ? 'bg-[#D32F2F] text-white border border-[#FF8A80] shadow-[0_0_8px_rgba(211,47,47,0.3)]'
                      : turnSecondsLeft <= 10
                      ? 'bg-[#E65100] text-white border border-[#FFB74D]/40'
                      : 'bg-[#15191F] border border-[#2D333B] text-[#FFCC00]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>TURN: {turnSecondsLeft}s</span>
                </div>
              )
            )}

            {isMyTurn && !room.pending_draw_decision && (
              <div className="text-[11px] sm:text-sm font-black tracking-wide flex items-center gap-1.5">
                {(room.draw_penalty || 0) > 0 ? (
                  <span className="text-[#FF8080] font-black">
                    {canStack
                      ? `🔥 DRAW ${room.draw_penalty} OR STACK PENALTY`
                      : `⚠️ PENALTY ACTIVE (+${room.draw_penalty}) • DRAW FROM PILE`}
                  </span>
                ) : (
                  <span className="text-[#FFCC00]">
                    YOUR TURN • Play a matching card or draw
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM HUD: Player Hand */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] px-1 xs:px-2 flex flex-col items-center shrink-0">
        <PlayerHand
          cards={myHand}
          activeSide={room.current_side}
          isMyTurn={isMyTurn}
          isValidCard={isValidCard}
          onPlayCard={handleCardClick}
          onCallUno={onCallUno}
          hasCalledUno={me?.has_called_uno ?? false}
          unoDeclarationDeadline={
            room.uno_declaration_player_id === me?.profile_id
              ? room.uno_declaration_deadline
              : null
          }
          isPenalized={penalizedPlayerId === me?.profile_id}
          penaltyMessage={
            penalizedPlayerId === me?.profile_id && penaltyAnnouncement?.isTargetMe
              ? penaltyAnnouncement.message
              : null
          }
          turnSecondsLeft={turnSecondsLeft}
          drawPenalty={room.draw_penalty || 0}
          canStack={canStack}
        />
      </footer>

      {/* Modals */}
      <ColorPickerModal
        isOpen={showColorPicker}
        side={room.current_side}
        onSelectColor={handleColorSelected}
        onCancel={() => {
          setShowColorPicker(false);
          setIsFromDrawDecision(false);
          setPendingCard(null);
        }}
      />

      {/* Draw and Decide Modal */}
      <DrawDecisionModal
        isOpen={Boolean(
          room.status === 'playing' &&
          room.pending_draw_decision &&
          room.pending_draw_decision.player_id === me?.profile_id &&
          !showColorPicker
        )}
        card={room.pending_draw_decision?.card || null}
        side={room.current_side}
        decisionDeadline={room.pending_draw_decision?.decision_deadline}
        onKeep={async () => {
          if (onSubmitDrawDecision) {
            await onSubmitDrawDecision('keep');
          }
        }}
        onPlay={async () => {
          const card = room.pending_draw_decision?.card;
          if (!card) return;
          const activeFace = room.current_side === 'light' ? card.light : card.dark;
          if (activeFace.color === 'wild') {
            setPendingCard(card);
            setIsFromDrawDecision(true);
            setShowColorPicker(true);
            return;
          }
          if (typeof window !== 'undefined') {
            const el = document.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement;
            if (el) {
              launchCardPlayOverlay(el, card.id);
            }
          }
          if (onSubmitDrawDecision) {
            await onSubmitDrawDecision('play');
          }
        }}
      />

      <GameOverModal
        isOpen={room.status === 'finished'}
        room={room}
        players={players}
        currentProfileId={currentProfile?.id || ''}
        onRematch={onRematch}
        onReturnLobby={onLeaveRoom}
        isHost={me?.is_host ?? false}
      />

      <HowToPlayModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Leave Game Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="relative w-full max-w-sm rounded-xl bg-[#1E232B] border border-[#2D333B] p-6 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-[#ED1C24]/50 text-[#ED1C24] flex items-center justify-center mb-3">
              <LogOut className="w-6 h-6 stroke-[2.2]" />
            </div>

            <h3 className="text-lg font-bold text-white">Leave Match?</h3>
            <p className="text-[#9BA3AF] text-xs sm:text-sm mt-2 leading-relaxed">
              Are you sure you want to leave? If you forfeit, the remaining player(s) will continue or win immediately.
            </p>

            <div className="flex gap-2 w-full mt-5 sm:mt-6">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-lg font-medium text-xs text-[#9BA3AF] border border-[#2D333B] hover:bg-[#15191F] hover:text-white active:scale-95 transition-all flex items-center justify-center cursor-pointer touch-manipulation"
              >
                Stay in Game
              </button>
              <button
                onClick={async () => {
                  setShowLeaveConfirm(false);
                  await onLeaveRoom();
                }}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-lg font-bold text-xs uppercase tracking-wider bg-[#ED1C24] hover:bg-[#D3141B] active:scale-95 text-white transition-all flex items-center justify-center cursor-pointer shadow-sm touch-manipulation"
              >
                Forfeit & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
