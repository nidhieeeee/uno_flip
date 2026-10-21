'use client';

import React, { useEffect, useState } from 'react';
import { Side, UnoFlipCard } from '@/lib/game/types';
import { UnoCard } from '../card/UnoCard';
import { ArrowRight, Check, Clock, Hand } from 'lucide-react';

interface DrawDecisionModalProps {
  isOpen: boolean;
  card: UnoFlipCard | null;
  side: Side;
  decisionDeadline?: string | null;
  onPlay: () => void;
  onKeep: () => void;
  isSubmitting?: boolean;
}

export const DrawDecisionModal: React.FC<DrawDecisionModalProps> = ({
  isOpen,
  card,
  side,
  decisionDeadline,
  onPlay,
  onKeep,
  isSubmitting = false,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !decisionDeadline) {
      setSecondsLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(decisionDeadline).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [isOpen, decisionDeadline]);

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1E232B] border border-[#2D333B] p-6 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
        {/* Title */}
        <h3 className="text-lg font-black text-white text-center mb-1">
          You drew a playable card!
        </h3>
        <p className="text-xs text-[#9BA3AF] text-center mb-4">
          Do you want to play it now or keep it in your hand?
        </p>

        {/* Drawn Card Showcase */}
        <div className="my-2 p-3 bg-[#15191F] rounded-xl border border-[#2D333B]/60 flex items-center justify-center">
          <UnoCard card={card} side={side} isPlayable={false} size="lg" />
        </div>

        {/* Deadline countdown indicator */}
        {secondsLeft !== null && (
          <div className="mt-3 mb-4 flex items-center gap-1.5 text-xs text-[#FFCC00] font-bold">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>
              {secondsLeft > 0
                ? `${secondsLeft}s to decide (auto-keeps on timeout)`
                : 'Decision time expired — keeping card...'}
            </span>
          </div>
        )}

        {/* Decision Actions */}
        <div className="flex items-center gap-3 w-full mt-2">
          {/* Keep Card Button */}
          <button
            onClick={onKeep}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#15191F] border border-[#2D333B] text-[#9BA3AF] hover:text-white hover:bg-[#252B35] transition-all cursor-pointer disabled:opacity-50"
          >
            <Hand className="w-4 h-4" />
            <span>Keep Card</span>
          </button>

          {/* Play Card Button */}
          <button
            onClick={onPlay}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm bg-[#27AE60] text-white hover:bg-[#219653] shadow-lg shadow-[#27AE60]/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Play Card</span>
          </button>
        </div>
      </div>
    </div>
  );
};
