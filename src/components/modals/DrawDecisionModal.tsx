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
  onPlay: () => Promise<void> | void;
  onKeep: () => Promise<void> | void;
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
  const [selectedAction, setSelectedAction] = useState<'play' | 'keep' | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setSelectedAction(null);
    }
  }

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen || !decisionDeadline) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 200);
    return () => clearInterval(interval);
  }, [isOpen, decisionDeadline]);

  const secondsLeft =
    isOpen && decisionDeadline
      ? Math.max(0, Math.ceil((new Date(decisionDeadline).getTime() - currentTime) / 1000))
      : null;

  if (!isOpen || !card) return null;

  const isBusy = isSubmitting || selectedAction !== null;

  const handlePlay = async () => {
    if (isBusy) return;
    setSelectedAction('play');
    try {
      await onPlay();
    } catch {
      setSelectedAction(null);
    }
  };

  const handleKeep = async () => {
    if (isBusy) return;
    setSelectedAction('keep');
    try {
      await onKeep();
    } catch {
      setSelectedAction(null);
    }
  };

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
            onClick={handleKeep}
            disabled={isBusy}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#15191F] border border-[#2D333B] text-[#9BA3AF] hover:text-white hover:bg-[#252B35] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedAction === 'keep' ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Hand className="w-4 h-4" />
            )}
            <span>{selectedAction === 'keep' ? 'Keeping...' : 'Keep Card'}</span>
          </button>

          {/* Play Card Button */}
          <button
            onClick={handlePlay}
            disabled={isBusy}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm bg-[#27AE60] text-white hover:bg-[#219653] shadow-lg shadow-[#27AE60]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedAction === 'play' ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4 stroke-[3]" />
            )}
            <span>{selectedAction === 'play' ? 'Playing...' : 'Play Card'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
