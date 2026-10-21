'use client';

import React from 'react';
import { GamePlayer, Side } from '@/lib/game/types';
import { Crown, Flame, ShieldAlert } from 'lucide-react';

interface OpponentSeatProps {
  player: GamePlayer;
  isCurrentTurn: boolean;
  activeSide: Side;
  isVulnerable?: boolean;
  isPenalized?: boolean;
  onChallengeUno?: (playerId: string) => void;
  position: 'top' | 'left' | 'right';
}

export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  isCurrentTurn,
  isVulnerable = false,
  isPenalized = false,
  onChallengeUno,
}) => {
  const nickname = player.profile?.nickname || `Player ${player.seat_index + 1}`;
  const initial = nickname.charAt(0).toUpperCase();
  const avatarBg = player.profile?.avatar_color || '#1677E8';
  const cardCount = player.card_count;

  // Can this player be challenged for not calling UNO?
  const canChallenge = isVulnerable && cardCount === 1 && !player.has_called_uno && !isPenalized;

  return (
    <div
      id={`opponent-seat-${player.profile_id}`}
      className="relative flex flex-col items-center select-none transition-transform"
    >
      {/* Floating Penalty Announcement Tag */}
      {isPenalized && (
        <div className="absolute -top-7 z-30 px-2 py-0.5 rounded bg-[#ED1C24] text-white text-[10px] font-black tracking-wider uppercase shadow-md animate-bounce whitespace-nowrap">
          +2 CARDS PENALTY
        </div>
      )}

      {/* Player Card Container */}
      <div
        className={`flex flex-col items-center p-2.5 rounded-lg border transition-all ${
          isPenalized
            ? 'bg-[#1E232B] border-[#ED1C24] ring-2 ring-[#ED1C24]/60'
            : isCurrentTurn
            ? 'bg-[#1E232B] border-[#FFCC00]'
            : 'bg-[#15191F] border-[#2D333B]'
        }`}
      >
        {/* Avatar with initial */}
        <div className="relative">
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base text-white border transition-all ${
              isPenalized
                ? 'border-[#ED1C24] ring-2 ring-[#ED1C24]'
                : 'border-white/20'
            }`}
            style={{ backgroundColor: avatarBg }}
          >
            {initial}
          </div>

          {/* Host Crown */}
          {player.is_host && (
            <div
              className="absolute -top-1.5 -right-1.5 bg-[#FFCC00] text-[#15191F] p-0.5 rounded-full"
              title="Host"
            >
              <Crown className="w-3 h-3 fill-current" />
            </div>
          )}
        </div>

        {/* Player Name & Turn Status */}
        <div className="mt-1 flex flex-col items-center">
          <span className="text-xs font-semibold text-white truncate max-w-[90px] sm:max-w-[110px] text-center">
            {nickname}
          </span>

          <div className="flex items-center gap-1 text-[10px]">
            <span
              className={`transition-all ${
                isPenalized ? 'text-[#ED1C24] font-bold' : 'text-[#9BA3AF]'
              }`}
            >
              {cardCount} {cardCount === 1 ? 'card' : 'cards'}
            </span>
            {isCurrentTurn && (
              <span className="font-bold text-[#FFCC00] uppercase tracking-wider">
                • Turn
              </span>
            )}
          </div>
        </div>

        {/* UNO Declared Badge */}
        {cardCount === 1 && player.has_called_uno && (
          <div className="mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ED1C24] text-[10px] font-black text-white">
            <Flame className="w-2.5 h-2.5" />
            <span>UNO</span>
          </div>
        )}

        {/* Catch / Call Out Button when player has 1 card without calling UNO */}
        {canChallenge && onChallengeUno && (
          <button
            onClick={() => onChallengeUno(player.profile_id)}
            className="mt-1.5 flex items-center gap-1 px-2.5 py-1 rounded bg-[#ED1C24] text-white font-bold text-[10px] uppercase tracking-wider hover:bg-[#D3141B] active:scale-95 transition-all shadow-sm animate-pulse cursor-pointer"
            title={`Catch ${nickname} for not calling UNO!`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Catch!</span>
          </button>
        )}
      </div>
    </div>
  );
};
