'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GamePlayer, Side } from '@/lib/game/types';
import { CardBack } from '../card/CardBack';
import { Crown, Flame, ShieldAlert, WifiOff } from 'lucide-react';

interface OpponentSeatProps {
  player: GamePlayer;
  isCurrentTurn: boolean;
  activeSide: Side;
  isVulnerable?: boolean;
  isPenalized?: boolean;
  penaltyLabel?: string;
  onChallengeUno?: (playerId: string) => void;
  position: 'top' | 'left' | 'right';
}

export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  isCurrentTurn,
  activeSide,
  isVulnerable = false,
  isPenalized = false,
  penaltyLabel = '+2 CARDS PENALTY',
  onChallengeUno,
}) => {
  const [showPenalty, setShowPenalty] = useState(isPenalized);
  const [prevIsPenalized, setPrevIsPenalized] = useState(isPenalized);

  if (isPenalized !== prevIsPenalized) {
    setPrevIsPenalized(isPenalized);
    setShowPenalty(isPenalized);
  }

  // Auto-dismiss penalty banner effect after 2.5 seconds
  useEffect(() => {
    if (!showPenalty) return;
    const timer = setTimeout(() => {
      setShowPenalty(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [showPenalty]);

  // Subtle number transition when card count updates (180ms-250ms)
  const [countChanged, setCountChanged] = useState(false);
  const prevCountRef = useRef(player.card_count);

  useEffect(() => {
    if (prevCountRef.current !== player.card_count) {
      prevCountRef.current = player.card_count;
      const tickTimer = setTimeout(() => setCountChanged(true), 0);
      const resetTimer = setTimeout(() => setCountChanged(false), 220);
      return () => {
        clearTimeout(tickTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [player.card_count]);

  const nickname = player.profile?.nickname || `Player ${player.seat_index + 1}`;
  const initial = nickname.charAt(0).toUpperCase();
  const avatarBg = player.profile?.avatar_color || '#1677E8';
  const cardCount = player.card_count;
  const isDisconnected = !player.is_connected && Boolean(player.disconnected_at);

  // Can this player be challenged for not calling UNO?
  const canChallenge =
    isVulnerable && cardCount === 1 && !player.has_called_uno && !showPenalty && !isDisconnected;

  // Visual card stack: display up to 3 face-down UNO FLIP card backs
  const visualStackCount = Math.min(3, Math.max(0, cardCount));

  return (
    <div
      id={`opponent-seat-${player.profile_id}`}
      className={`relative flex flex-col items-center select-none transition-all duration-200 ${
        isDisconnected ? 'opacity-70' : ''
      }`}
    >
      {/* Floating Penalty Announcement Tag */}
      {showPenalty && (
        <div className="absolute -top-6 sm:-top-7 z-30 px-2 py-0.5 rounded bg-[#ED1C24] text-white text-[8px] sm:text-[10px] font-black tracking-wider uppercase shadow-md animate-in fade-in slide-in-from-bottom-1 duration-150 whitespace-nowrap">
          {penaltyLabel}
        </div>
      )}

      {/* Disconnected Grace Period Badge */}
      {!showPenalty && isDisconnected && (
        <div className="absolute -top-6 sm:-top-7 z-30 px-2 py-0.5 rounded-full bg-[#ED1C24] text-white text-[8px] sm:text-[9px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1 whitespace-nowrap">
          <WifiOff className="w-2.5 h-2.5" />
          <span>Disconnected</span>
        </div>
      )}

      {/* Player Card Container */}
      <div
        className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all duration-200 shadow-md ${
          showPenalty
            ? 'bg-[#1E232B] border-[#ED1C24] ring-2 ring-[#ED1C24]/60'
            : isDisconnected
            ? 'bg-[#1E232B] border-dashed border-[#ED1C24]/60'
            : isCurrentTurn
            ? 'bg-[#1E232B] border-[#FFCC00] ring-2 ring-[#FFCC00]/50 shadow-[0_0_12px_rgba(255,204,0,0.2)]'
            : 'bg-[#15191F]/90 border-[#2D333B] hover:border-[#404752]'
        }`}
      >
        {/* Left Section: Avatar + Name + Turn indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative shrink-0">
            <div
              className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm text-white border transition-all ${
                isCurrentTurn
                  ? 'border-[#FFCC00] ring-2 ring-[#FFCC00]/40'
                  : isDisconnected
                  ? 'border-[#ED1C24]/60'
                  : 'border-white/20'
              }`}
              style={{ backgroundColor: avatarBg }}
            >
              {initial}
            </div>

            {/* Host Crown */}
            {player.is_host && (
              <div
                className="absolute -top-1 -right-1 bg-[#FFCC00] text-[#15191F] p-0.5 rounded-full shadow"
                title="Host"
              >
                <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-white truncate max-w-[55px] xs:max-w-[70px] sm:max-w-[90px]">
              {nickname}
            </span>
            {isCurrentTurn && !isDisconnected && (
              <span className="text-[8px] sm:text-[9px] font-bold text-[#FFCC00] uppercase tracking-wider flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFCC00] inline-block" />
                <span>Turn</span>
              </span>
            )}
          </div>
        </div>

        {/* Divider line */}
        <div className="w-[1px] h-6 sm:h-8 bg-[#2D333B] shrink-0" />

        {/* Right Section: Compact Stack of Face-Down Cards + Count Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Card-Back Stack */}
          <div
            id={`opponent-card-stack-${player.profile_id}`}
            className="relative flex items-center justify-center w-8 sm:w-11 h-7 sm:h-10 shrink-0"
          >
            {visualStackCount > 0 ? (
              Array.from({ length: visualStackCount }).map((_, i) => {
                let transformStyle = '';
                if (visualStackCount === 3) {
                  transformStyle =
                    i === 0
                      ? 'rotate(-6deg) translateX(-2px)'
                      : i === 1
                      ? 'rotate(0deg)'
                      : 'rotate(6deg) translateX(2px)';
                } else if (visualStackCount === 2) {
                  transformStyle =
                    i === 0
                      ? 'rotate(-4deg) translateX(-1.5px)'
                      : 'rotate(4deg) translateX(1.5px)';
                } else {
                  transformStyle = 'rotate(0deg)';
                }

                return (
                  <div
                    key={i}
                    className="absolute transition-transform duration-200 pointer-events-none"
                    style={{
                      transform: transformStyle,
                      zIndex: i + 1,
                    }}
                  >
                    <CardBack side={activeSide} size="xs" />
                  </div>
                );
              })
            ) : (
              <div className="w-5 h-7 sm:w-7 sm:h-10 rounded border border-dashed border-[#2D333B] flex items-center justify-center text-[8px] text-[#9BA3AF]">
                0
              </div>
            )}
          </div>

          {/* Exact Card Count Pill with Subtle Transition */}
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={`px-1.5 sm:px-2 py-0.5 rounded-md bg-[#111418] border border-[#2D333B] flex items-center gap-1 text-[10px] sm:text-xs font-semibold transition-colors duration-200 ${
                countChanged ? 'border-[#FFCC00]' : ''
              }`}
            >
              <span
                className={`font-mono font-bold transition-all duration-200 inline-block ${
                  countChanged
                    ? 'scale-110 text-[#FFCC00]'
                    : showPenalty
                    ? 'text-[#ED1C24]'
                    : 'text-white'
                }`}
              >
                {cardCount}
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#9BA3AF] font-normal">
                {cardCount === 1 ? 'card' : 'cards'}
              </span>
            </div>

            {/* Prominent UNO! Badge when player has exactly 1 card */}
            {cardCount === 1 && (
              <div
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black tracking-wider uppercase shadow-sm transition-all ${
                  player.has_called_uno
                    ? 'bg-[#27AE60] text-white border border-[#27AE60]'
                    : isVulnerable
                    ? 'bg-[#ED1C24] text-white ring-1 ring-[#FFCC00]'
                    : 'bg-[#ED1C24] text-white'
                }`}
              >
                <Flame className="w-2.5 h-2.5 fill-current text-[#FFCC00]" />
                <span>UNO!</span>
              </div>
            )}

            {/* Catch UNO Challenge Button */}
            {canChallenge && onChallengeUno && (
              <button
                onClick={() => onChallengeUno(player.profile_id)}
                className="flex items-center justify-center gap-0.5 min-h-[24px] px-2 py-0.5 rounded bg-[#ED1C24] text-white font-bold text-[8px] sm:text-[9px] uppercase tracking-wider hover:bg-[#D3141B] active:scale-95 transition-all shadow-sm cursor-pointer touch-manipulation"
                title={`Catch ${nickname} for not calling UNO!`}
              >
                <ShieldAlert className="w-2.5 h-2.5 stroke-[2.5]" />
                <span>Catch!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
