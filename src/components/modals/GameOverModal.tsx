'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GamePlayer, GameRoom } from '@/lib/game/types';
import { RotateCcw, Trophy } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  room: GameRoom;
  players: GamePlayer[];
  currentProfileId: string;
  onRematch: () => void;
  onReturnLobby: () => void;
  isHost: boolean;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  room,
  players,
  currentProfileId,
  onRematch,
  onReturnLobby,
}) => {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ED1C24', '#FFCC00', '#27AE60', '#1677E8'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const winner = players.find((p) => p.profile_id === room.winner_id);
  const isMeWinner = room.winner_id === currentProfileId;
  const sortedPlayers = [...players].sort((a, b) => a.card_count - b.card_count);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="relative w-full max-w-sm rounded-xl bg-[#1E232B] border border-[#2D333B] p-6 shadow-xl flex flex-col items-center text-center">
        {/* Trophy Icon */}
        <div className="w-12 h-12 rounded-full bg-[#FFCC00] text-[#15191F] flex items-center justify-center mb-3">
          <Trophy className="w-6 h-6 fill-current" />
        </div>

        {/* Victory Header */}
        <h2 className="text-xl font-bold text-white">
          {isMeWinner ? 'You Won!' : `${winner?.profile?.nickname || 'Player'} Won!`}
        </h2>
        <p className="text-[#9BA3AF] text-xs mt-1">Game over. Final standings:</p>

        {/* Final Standings List */}
        <div className="w-full mt-4 bg-[#15191F] rounded-lg p-3 border border-[#2D333B] flex flex-col gap-2">
          {sortedPlayers.map((player, idx) => {
            const isWinnerItem = idx === 0;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs ${
                  isWinnerItem
                    ? 'bg-[#27AE60]/20 text-[#27AE60] font-bold'
                    : 'text-[#9BA3AF]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold w-4 text-center">#{idx + 1}</span>
                  <span className="text-white truncate max-w-[120px]">
                    {player.profile?.nickname}
                    {player.profile_id === currentProfileId && ' (You)'}
                  </span>
                </div>

                <span>
                  {player.card_count === 0 ? 'Winner' : `${player.card_count} cards`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons: Simple Yellow Primary and Outlined Secondary */}
        <div className="flex flex-col gap-2 w-full mt-5">
          <button
            onClick={onRematch}
            className="w-full py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider bg-[#FFCC00] text-[#15191F] hover:bg-[#E6B800] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Play Again</span>
          </button>

          <button
            onClick={onReturnLobby}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-xs text-[#9BA3AF] border border-[#2D333B] hover:bg-[#15191F] hover:text-white transition-colors cursor-pointer"
          >
            Exit to Home
          </button>
        </div>
      </div>
    </div>
  );
};
