'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CardColor, GamePlayer, GameRoom, PlayerProfile, Side, UnoFlipCard } from '@/lib/game/types';
import { isValidPlay } from '@/lib/game/engine';
import { DiscardPile } from '../card/DiscardPile';
import { DeckPile } from '../card/DeckPile';
import { PlayerHand } from './PlayerHand';
import { OpponentSeat } from './OpponentSeat';
import { ColorPickerModal } from '../modals/ColorPickerModal';
import { GameOverModal } from '../modals/GameOverModal';
import { HowToPlayModal } from '../modals/HowToPlayModal';
import { DrawDecisionModal } from '../modals/DrawDecisionModal';
import { isSoundMuted, playPenaltySound, toggleSoundMuted } from '@/lib/audio/sound';
import {
  Clock,
  FlipHorizontal,
  HelpCircle,
  LogOut,
  RotateCcw,
  RotateCw,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
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
  const [penalizedPlayerId, setPenalizedPlayerId] = useState<string | null>(null);
  const [penaltyAnnouncement, setPenaltyAnnouncement] = useState<{
    message: string;
    isTargetMe: boolean;
  } | null>(null);
  const [soundMuted, setSoundMutedState] = useState(isSoundMuted());
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!room.turn_deadline || room.status !== 'playing') {
      setTurnSecondsLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(room.turn_deadline!).getTime() - Date.now()) / 1000)
      );
      setTurnSecondsLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [room.turn_deadline, room.status]);

  const boardRef = useRef<HTMLDivElement>(null);
  const prevSideRef = useRef<Side>(room.current_side);
  const lastHandledChallengeTimestamp = useRef<number>(0);

  const isLight = room.current_side === 'light';
  const isMyTurn = me !== null && room.current_turn_seat === me.seat_index;

  // Active player details
  const activePlayer = players.find((p) => p.seat_index === room.current_turn_seat);
  const activePlayerName = isMyTurn
    ? 'Your Turn!'
    : `${activePlayer?.profile?.nickname || 'Player'} is playing...`;

  // GSAP 3D Board Flip Animation when side changes
  useEffect(() => {
    if (prevSideRef.current !== room.current_side && boardRef.current) {
      prevSideRef.current = room.current_side;

      // Animate 3D board flip cleanly and quickly
      gsap.fromTo(
        boardRef.current,
        { rotateY: -180, scale: 0.95, opacity: 0.7 },
        {
          rotateY: 0,
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }
  }, [room.current_side]);

  // Handle Penalty Action Animation & Sound
  useEffect(() => {
    if (!room.last_action) return;
    if (
      room.last_action.type === 'challenge_uno' &&
      room.last_action.timestamp !== lastHandledChallengeTimestamp.current
    ) {
      lastHandledChallengeTimestamp.current = room.last_action.timestamp;
      const targetId = room.last_action.targetPlayerId;
      if (!targetId) return;

      const isTargetMe = targetId === me?.profile_id;

      const animFrame = requestAnimationFrame(() => {
        setPenalizedPlayerId(targetId);

        setPenaltyAnnouncement({
          message: isTargetMe
            ? 'CAUGHT! You forgot to call UNO! (+2 cards penalty)'
            : room.last_action?.message || 'Player caught forgetting UNO!',
          isTargetMe,
        });
      });

      // Play penalty sound
      playPenaltySound();

      // Trigger GSAP Flying cards animation
      if (typeof window !== 'undefined') {
        const deckEl = document.getElementById('deck-pile-container');
        const targetEl = isTargetMe
          ? document.getElementById('player-hand-container')
          : document.getElementById(`opponent-seat-${targetId}`);

        if (deckEl && targetEl) {
          const deckRect = deckEl.getBoundingClientRect();
          const targetRect = targetEl.getBoundingClientRect();

          // Shake target area
          gsap.fromTo(
            targetEl,
            { x: -8 },
            { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.3)' }
          );

          // Fly 2 penalty cards from draw pile to target
          for (let i = 0; i < 2; i++) {
            const flyCard = document.createElement('div');
            flyCard.className =
              'fixed z-50 pointer-events-none w-12 h-16 sm:w-16 sm:h-24 rounded-lg bg-[#ED1C24] border-2 border-white shadow-2xl flex items-center justify-center font-black text-sm text-white select-none';
            flyCard.innerText = '+1';
            flyCard.style.left = `${deckRect.left + deckRect.width / 2 - 24}px`;
            flyCard.style.top = `${deckRect.top + deckRect.height / 2 - 32}px`;
            document.body.appendChild(flyCard);

            gsap.to(flyCard, {
              x: targetRect.left + targetRect.width / 2 - (deckRect.left + deckRect.width / 2),
              y: targetRect.top + targetRect.height / 2 - (deckRect.top + deckRect.height / 2),
              rotation: i === 0 ? 360 : -360,
              scale: 0.7,
              opacity: 0.1,
              delay: i * 0.14,
              duration: 0.6,
              ease: 'power2.inOut',
              onComplete: () => {
                flyCard.remove();
              },
            });
          }
        }
      }

      const timer = setTimeout(() => {
        setPenalizedPlayerId(null);
        setPenaltyAnnouncement(null);
      }, 3500);

      return () => {
        cancelAnimationFrame(animFrame);
        clearTimeout(timer);
      };
    }
  }, [room.last_action, me?.profile_id]);

  // Display recent action banner (normal non-challenge events)
  const actionBanner =
    room.last_action && room.last_action.type !== 'challenge_uno'
      ? room.last_action.message
      : null;

  // Handle card click
  const handleCardClick = async (card: UnoFlipCard) => {
    const face = isLight ? card.light : card.dark;
    if (face.color === 'wild') {
      setPendingCard(card);
      setShowColorPicker(true);
      return;
    }

    await onPlayCard(card.id, undefined, me?.has_called_uno);
  };

  const handleColorSelected = async (chosenColor: CardColor) => {
    if (!pendingCard) return;
    setShowColorPicker(false);
    if (isFromDrawDecision) {
      setIsFromDrawDecision(false);
      if (onSubmitDrawDecision) {
        await onSubmitDrawDecision('play', chosenColor);
      }
    } else {
      await onPlayCard(pendingCard.id, chosenColor, me?.has_called_uno);
    }
    setPendingCard(null);
  };

  // Organize opponents around the table relative to current player seat
  const mySeat = me?.seat_index ?? 0;
  const opponents = players
    .filter((p) => p.profile_id !== currentProfile?.id)
    .sort((a, b) => {
      // Order clockwise relative to me
      const diffA = (a.seat_index - mySeat + players.length) % players.length;
      const diffB = (b.seat_index - mySeat + players.length) % players.length;
      return diffA - diffB;
    });

  return (
    <div className="min-h-screen select-none bg-[#15191F] text-white flex flex-col justify-between overflow-hidden relative">
      {/* TOP HUD BAR */}
      <header className="relative z-20 w-full max-w-5xl mx-auto px-4 py-3 flex items-center justify-between border-b border-[#2D333B]">
        {/* Room Info & Side Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              isLight
                ? 'bg-[#FFCC00] text-[#15191F]'
                : 'bg-[#2D333B] text-white border border-[#404752]'
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>{isLight ? 'Light Side' : 'Dark Side'}</span>
          </div>

          <div className="text-xs font-mono font-medium text-[#9BA3AF] bg-[#1E232B] px-3 py-1 rounded border border-[#2D333B]">
            Room: <span className="text-white font-bold">{room.code}</span>
          </div>
        </div>

        {/* Action Banner / Turn Banner */}
        <div className="flex items-center">
          <div
            className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${
              isMyTurn
                ? 'bg-[#FFCC00] text-[#15191F]'
                : 'bg-[#1E232B] text-[#9BA3AF] border border-[#2D333B]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{activePlayerName}</span>
          </div>
        </div>

        {/* Sound, Rules & Exit */}
        <div className="flex items-center gap-2">
          {/* Sound Mute Toggle Button */}
          <button
            onClick={() => {
              const next = toggleSoundMuted();
              setSoundMutedState(next);
            }}
            className="p-2 rounded bg-[#1E232B] hover:bg-[#252B35] border border-[#2D333B] text-[#9BA3AF] hover:text-white transition-colors cursor-pointer"
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4 text-[#ED1C24]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#27AE60]" />
            )}
          </button>

          <button
            onClick={() => setShowRules(true)}
            className="p-2 rounded bg-[#1E232B] hover:bg-[#252B35] border border-[#2D333B] text-[#9BA3AF] hover:text-white transition-colors cursor-pointer"
            title="Rules"
          >
            <HelpCircle className="w-4 h-4 text-[#FFCC00]" />
          </button>
          <button
            onClick={onLeaveRoom}
            className="p-2 rounded bg-[#1E232B] hover:bg-red-950/40 border border-[#2D333B] hover:border-[#ED1C24]/50 text-[#9BA3AF] hover:text-[#ED1C24] transition-colors cursor-pointer"
            title="Leave Game"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Prominent Penalty Announcement Toast Banner */}
      {penaltyAnnouncement && (
        <div className="absolute top-16 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
          <div className="bg-[#ED1C24] border-2 border-white text-white text-xs sm:text-sm font-black px-5 py-2.5 rounded-full shadow-2xl animate-bounce flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
            <span>{penaltyAnnouncement.message}</span>
          </div>
        </div>
      )}

      {/* Floating Action Announcement Toast */}
      {actionBanner && !penaltyAnnouncement && (
        <div className="absolute top-16 inset-x-0 z-30 flex justify-center pointer-events-none px-4">
          <div className="bg-[#1E232B] border border-[#2D333B] text-white text-xs sm:text-sm font-medium px-4 py-2 rounded shadow-md flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFCC00]" />
            <span>{actionBanner}</span>
          </div>
        </div>
      )}

      {/* MAIN GAME TABLE (GSAP Ref) */}
      <main
        ref={boardRef}
        className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-2"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Opponents Row (Top / Sides) */}
        <div className="w-full flex items-center justify-around mb-4 sm:mb-8">
          {opponents.map((opponent, idx) => (
            <OpponentSeat
              key={opponent.id}
              player={opponent}
              isCurrentTurn={opponent.seat_index === room.current_turn_seat}
              activeSide={room.current_side}
              isVulnerable={room.uno_challenge_target === opponent.profile_id}
              isPenalized={penalizedPlayerId === opponent.profile_id}
              onChallengeUno={onChallengeUno}
              position={idx === 1 ? 'top' : idx === 0 ? 'left' : 'right'}
            />
          ))}
        </div>

        {/* Central Arena: Direction Ring, Discard Pile, Draw Pile */}
        <div className="relative flex items-center justify-center gap-6 sm:gap-10 p-6 sm:p-8 rounded-xl bg-[#1E232B] border border-[#2D333B]">
          {/* Direction Indicator Widget */}
          <div
            className="absolute -top-3 flex items-center gap-1.5 px-3 py-0.5 rounded bg-[#15191F] border border-[#2D333B] text-[11px] font-bold text-[#9BA3AF]"
            title={`Direction: ${room.direction === 1 ? 'Clockwise' : 'Counter-Clockwise'}`}
          >
            {room.direction === 1 ? (
              <>
                <RotateCw className="w-3 h-3 text-[#1677E8]" />
                <span>Clockwise</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3 h-3 text-[#ED1C24]" />
                <span>Counter-Clockwise</span>
              </>
            )}
          </div>

          {/* Draw Pile */}
          <DeckPile
            count={room.draw_pile_count}
            activeSide={room.current_side}
            isMyTurn={isMyTurn}
            onDraw={onDrawCard}
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
          <div className="mt-3 flex flex-col sm:flex-row items-center gap-2">
            {turnSecondsLeft !== null && (
              <div
                className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-md ${
                  turnSecondsLeft <= 5
                    ? 'bg-[#ED1C24] text-white animate-pulse ring-2 ring-[#ED1C24]/60'
                    : turnSecondsLeft <= 10
                    ? 'bg-[#E65100] text-white'
                    : 'bg-[#15191F] border border-[#2D333B] text-[#FFCC00]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {room.pending_draw_decision
                    ? `DECISION: ${turnSecondsLeft}s`
                    : `TURN: ${turnSecondsLeft}s`}
                </span>
              </div>
            )}

            {isMyTurn && (
              <div className="text-xs sm:text-sm font-bold text-[#FFCC00] tracking-wide flex items-center gap-1.5">
                <span>YOUR TURN: Play a matching card or draw from the deck</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM HUD: Player Hand */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto pb-4 sm:pb-6 px-2 flex flex-col items-center">
        <PlayerHand
          cards={myHand}
          activeSide={room.current_side}
          isMyTurn={isMyTurn}
          isValidCard={(card) =>
            isValidPlay(card, room.top_card, room.current_side, room.active_color)
          }
          onPlayCard={handleCardClick}
          onCallUno={onCallUno}
          hasCalledUno={me?.has_called_uno ?? false}
          unoDeclarationDeadline={
            room.uno_declaration_player_id === me?.profile_id
              ? room.uno_declaration_deadline
              : null
          }
          isPenalized={penalizedPlayerId === me?.profile_id}
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
          room.pending_draw_decision.player_id === me?.profile_id
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
    </div>
  );
};
