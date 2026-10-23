'use client';

import React, { useEffect, useState } from 'react';
import { GamePlayer, Side } from '@/lib/game/types';
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

  // Auto-dismiss penalty effect so it only shows for a brief duration (2.5 seconds)
  useEffect(() => {
    if (!showPenalty) return;
    const timer = setTimeout(() => {
      setShowPenalty(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [showPenalty]);

  const nickname = player.profile?.nickname || `Player ${player.seat_index + 1}`;
  const initial = nickname.charAt(0).toUpperCase();
  const avatarBg = player.profile?.avatar_color || '#1677E8';
  const cardCount = player.card_count;
  const isDisconnected = !player.is_connected && Boolean(player.disconnected_at);

  // Can this player be challenged for not calling UNO?
  const canChallenge =
    isVulnerable && cardCount === 1 && !player.has_called_uno && !showPenalty && !isDisconnected;

  return (
    <div
      id={`opponent-seat-${player.profile_id}`}
      className={`relative flex flex-col items-center select-none transition-transform ${isDisconnected ? 'opacity-70' : ''
        }`}
    >
      {/* Floating Penalty Announcement Tag */}
      {showPenalty && (
        <div className="absolute -top-6 sm:-top-7 z-30 px-1.5 sm:px-2 py-0.5 rounded bg-[#ED1C24] text-white text-[8px] sm:text-[10px] font-black tracking-wider uppercase shadow-md animate-bounce whitespace-nowrap">
          {penaltyLabel}
        </div>
      )}

      {/* Disconnected Grace Period Badge */}
      {!showPenalty && isDisconnected && (
        <div className="absolute -top-6 sm:-top-7 z-30 px-1.5 sm:px-2 py-0.5 rounded-full bg-[#ED1C24] text-white text-[8px] sm:text-[9px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1 animate-pulse whitespace-nowrap">
          <WifiOff className="w-2.5 h-2.5" />
          <span>Disconnected</span>
        </div>
      )}

      {/* Player Card Container */}
      <div
        className={`flex flex-col items-center p-1.5 xs:p-2 sm:p-2.5 rounded-lg border transition-all ${showPenalty
            ? 'bg-[#1E232B] border-[#ED1C24] ring-2 ring-[#ED1C24]/60'
            : isDisconnected
              ? 'bg-[#1E232B] border-dashed border-[#ED1C24]/60'
              : isCurrentTurn
                ? 'bg-[#1E232B] border-[#FFCC00]'
                : 'bg-[#15191F] border-[#2D333B]'
          }`}
      >
        {/* Avatar with initial */}
        <div className="relative">
          <div
            className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-base text-white border transition-all ${showPenalty
                ? 'border-[#ED1C24] ring-2 ring-[#ED1C24]'
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
              className="absolute -top-1 -right-1 bg-[#FFCC00] text-[#15191F] p-0.5 rounded-full"
              title="Host"
            >
              <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
            </div>
          )}
        </div>

        {/* Player Name & Turn Status */}
        <div className="mt-0.5 sm:mt-1 flex flex-col items-center w-full">
          <span className="text-[10px] sm:text-xs font-semibold text-white truncate max-w-[55px] xs:max-w-[70px] sm:max-w-[95px] md:max-w-[120px] text-center">
            {nickname}
          </span>

          <div className="flex items-center gap-1 text-[9px] sm:text-[10px]">
            {isDisconnected ? (
              <span className="text-[#ED1C24] font-semibold flex items-center gap-0.5">
                <WifiOff className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                Offline
              </span>
            ) : (
              <span
                className={`transition-all ${showPenalty ? 'text-[#ED1C24] font-bold' : 'text-[#9BA3AF]'
                  }`}
              >
                {cardCount} {cardCount === 1 ? 'card' : 'cards'}
              </span>
            )}
            {isCurrentTurn && !isDisconnected && (
              <span className="font-bold text-[#FFCC00] uppercase tracking-wider hidden xs:inline">
                • Turn
              </span>
            )}
          </div>
        </div>

        {/* UNO Declared Badge */}
        {cardCount === 1 && player.has_called_uno && (
          <div className="mt-0.5 sm:mt-1 flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded bg-[#ED1C24] text-[8px] sm:text-[10px] font-black text-white">
            <Flame className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
            <span>UNO</span>
          </div>
        )}

        {/* Catch / Call Out Button when player has 1 card without calling UNO */}
        {canChallenge && onChallengeUno && (
          <button
            onClick={() => onChallengeUno(player.profile_id)}
            className="mt-1 flex items-center justify-center gap-1 min-h-[36px] sm:min-h-[40px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-[#ED1C24] text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-wider hover:bg-[#D3141B] active:scale-95 transition-all shadow-sm animate-pulse cursor-pointer touch-manipulation"
            title={`Catch ${nickname} for not calling UNO!`}
          >
            <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Catch!</span>
          </button>
        )}
      </div>
    </div>
  );
};
