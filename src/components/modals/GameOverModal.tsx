'use client';

import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { GamePlayer, GameRoom } from '@/lib/game/types';
import { UfLogo } from '../common/UfLogo';
import { Crown, Home, RotateCcw, Trophy, UserMinus } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  room: GameRoom;
  players: GamePlayer[];
  currentProfileId: string;
  onRematch: () => void;
  onReturnLobby: () => void;
  isHost?: boolean;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  room,
  players,
  currentProfileId,
  onRematch,
  onReturnLobby,
}) => {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasFiredRef.current) {
      hasFiredRef.current = true;
      const isReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!isReducedMotion) {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ED1C24', '#FFCC00', '#27AE60', '#1677E8', '#7B1FA2'],
        });
      }
    } else if (!isOpen) {
      hasFiredRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const winner = players.find((p) => p.profile_id === room.winner_id);
  const isMeWinner = Boolean(room.winner_id && room.winner_id === currentProfileId);
  const winnerNickname = isMeWinner ? 'You' : winner?.profile?.nickname || 'Player';
  const isForfeit = room.win_reason === 'forfeit';

  const sortedPlayers = [...players].sort((a, b) => {
    // Winner is always first
    if (a.profile_id === room.winner_id) return -1;
    if (b.profile_id === room.winner_id) return 1;
    return a.card_count - b.card_count;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Over"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#1E232B] border border-[#2D333B] p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
        {/* Trophy / Victory Badge with UF Branding */}
        <div className="relative mb-3 flex items-center justify-center">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border ${
              isMeWinner
                ? 'bg-[#FFCC00] text-[#15191F] border-amber-300'
                : 'bg-[#15191F] text-[#FFCC00] border-[#2D333B]'
            }`}
          >
            {isMeWinner ? (
              <Trophy className="w-7 h-7 fill-current stroke-[2.2]" />
            ) : (
              <Crown className="w-7 h-7 fill-current stroke-[2.2]" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 shadow-md">
            <UfLogo size="xs" />
          </div>
        </div>

        {/* Victory Header */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
          {isMeWinner ? 'VICTORY!' : `${winnerNickname} Won!`}
        </h2>

        {isForfeit && (
          <div className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-[#ED1C24]/15 border border-[#ED1C24]/40 text-[#ED1C24] text-[10px] font-bold uppercase tracking-wider">
            <UserMinus className="w-3 h-3" />
            <span>Opponent Forfeit</span>
          </div>
        )}

        <p className="text-[#9BA3AF] text-xs sm:text-sm mt-1 sm:mt-1.5 leading-relaxed">
          {isForfeit
            ? room.last_action?.message || (isMeWinner ? 'An opponent left the game. You win!' : 'Match ended by forfeit.')
            : isMeWinner
            ? 'Congratulations! You cleared all cards and won the game!'
            : `${winnerNickname} cleared all cards and won the game.`}
        </p>

        {/* Final Standings List */}
        <div className="w-full mt-4 bg-[#15191F] rounded-xl p-3 border border-[#2D333B] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#9BA3AF] px-1 pb-1 border-b border-[#2D333B]/60">
            <span>Standings</span>
            <span>Cards</span>
          </div>

          {sortedPlayers.map((player, idx) => {
            const isPlayerWinner = player.profile_id === room.winner_id;
            const isMe = player.profile_id === currentProfileId;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isPlayerWinner
                    ? 'bg-[#27AE60]/15 border border-[#27AE60]/40 text-white font-bold'
                    : 'text-[#9BA3AF] bg-[#1E232B]/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-black w-5 text-center text-xs ${
                      isPlayerWinner ? 'text-[#FFCC00]' : 'text-[#9BA3AF]'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/20 shrink-0"
                    style={{ backgroundColor: player.profile?.avatar_color || '#1677E8' }}
                  >
                    {(player.profile?.nickname || 'P').charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[120px] text-white font-medium">
                    {player.profile?.nickname}
                    {isMe && <span className="text-[#9BA3AF] text-[10px] font-normal"> (You)</span>}
                  </span>
                </div>

                <div className="shrink-0 font-mono font-semibold">
                  {isPlayerWinner ? (
                    <span className="text-[#27AE60] text-[11px] font-bold uppercase tracking-wide">
                      Winner
                    </span>
                  ) : (
                    <span className="text-[#9BA3AF]">
                      {player.card_count} {player.card_count === 1 ? 'card' : 'cards'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons: Min 44px touch targets */}
        <div className="flex flex-col gap-2 w-full mt-5">
          <button
            onClick={onRematch}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-[#FFCC00] text-[#15191F] hover:bg-[#E6B800] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation shadow-md"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>Play Again</span>
          </button>

          <button
            onClick={onReturnLobby}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-semibold text-xs text-[#9BA3AF] border border-[#2D333B] bg-[#15191F] hover:bg-[#252B35] hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
          >
            <Home className="w-4 h-4" />
            <span>Exit to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
