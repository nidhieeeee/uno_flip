'use client';

import React from 'react';
import { CardColor, Side, UnoFlipCard } from '@/lib/game/types';
import { UnoCard } from './UnoCard';

interface DiscardPileProps {
  topCard: UnoFlipCard | null;
  side: Side;
  activeColor: CardColor | null;
}

export const DiscardPile: React.FC<DiscardPileProps> = ({
  topCard,
  side,
  activeColor,
}) => {
  const getColorDot = (color: CardColor | null) => {
    switch (color) {
      case 'red':
        return 'bg-[#ED1C24]';
      case 'yellow':
        return 'bg-[#FFCC00]';
      case 'green':
        return 'bg-[#27AE60]';
      case 'blue':
        return 'bg-[#1677E8]';
      case 'pink':
        return 'bg-[#D81B60]';
      case 'teal':
        return 'bg-[#00897B]';
      case 'orange':
        return 'bg-[#E65100]';
      case 'purple':
        return 'bg-[#7B1FA2]';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div id="discard-pile-container" className="flex flex-col items-center select-none">
      {/* Top Discard Card */}
      <div className="relative p-0.5 rounded-lg">
        {topCard ? (
          <UnoCard card={topCard} side={side} size="md" />
        ) : (
          <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-lg border-2 border-dashed border-[#2D333B] flex items-center justify-center text-[#9BA3AF] text-xs font-medium">
            Empty
          </div>
        )}
      </div>

      {/* Active Color Tag */}
      {activeColor && (
        <div className="mt-2 flex items-center gap-2 px-3 py-1 rounded-md bg-[#1E232B] border border-[#2D333B] text-xs font-semibold text-white">
          <span className="text-[#9BA3AF] text-[11px] font-normal">Active:</span>
          <div className={`w-3 h-3 rounded-full ${getColorDot(activeColor)}`} />
          <span className="capitalize">{activeColor}</span>
        </div>
      )}
    </div>
  );
};
