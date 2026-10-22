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
        <div className="absolute -top-7 z-30 px-2 py-0.5 rounded bg-[#ED1C24] text-white text-[10px] font-black tracking-wider uppercase shadow-md animate-bounce whitespace-nowrap">
          {penaltyLabel}
        </div>
      )}

      {/* Disconnected Grace Period Badge */}
      {!showPenalty && isDisconnected && (
        <div className="absolute -top-7 z-30 px-2 py-0.5 rounded-full bg-[#ED1C24] text-white text-[9px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1 animate-pulse whitespace-nowrap">
          <WifiOff className="w-2.5 h-2.5" />
          <span>Disconnected</span>
        </div>
      )}

      {/* Player Card Container */}
      <div
        className={`flex flex-col items-center p-2.5 rounded-lg border transition-all ${showPenalty
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
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base text-white border transition-all ${showPenalty
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
            {isDisconnected ? (
              <span className="text-[#ED1C24] font-semibold flex items-center gap-0.5">
                <WifiOff className="w-2.5 h-2.5" />
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
