'use client';

import React from 'react';
import { Side } from '@/lib/game/types';
import { Layers } from 'lucide-react';

interface DeckPileProps {
  count: number;
  activeSide: Side;
  isMyTurn: boolean;
  onDraw: () => void;
  disabled?: boolean;
  drawPenalty?: number;
}

export const DeckPile: React.FC<DeckPileProps> = ({
  count,
  activeSide,
  isMyTurn,
  onDraw,
  disabled = false,
  drawPenalty = 0,
}) => {
  const isLight = activeSide === 'light';
  const hasPenalty = drawPenalty > 0;

  return (
    <div id="deck-pile-container" className="flex flex-col items-center select-none">
      {/* Deck Stack */}
      <div
        className={`relative cursor-pointer transition-transform duration-150 ${
          isMyTurn && !disabled ? 'active:scale-95' : 'cursor-default'
        }`}
        onClick={isMyTurn && !disabled ? onDraw : undefined}
      >
        {/* Subtle stack offset edges for 3D card feel without heavy blur */}
        <div className="absolute top-1.5 left-1.5 w-20 h-28 sm:w-24 sm:h-36 bg-[#111418] rounded-lg border border-[#2D333B]" />
        <div className="absolute top-0.5 left-0.5 w-20 h-28 sm:w-24 sm:h-36 bg-[#181D24] rounded-lg border border-[#2D333B]" />

        {/* Top Deck Card */}
        <div
          className={`relative w-20 h-28 sm:w-24 sm:h-36 rounded-lg p-1.5 border transition-all duration-300 ${
            isMyTurn && !disabled
              ? hasPenalty
                ? 'ring-2 ring-[#ED1C24] border-[#ED1C24] animate-pulse'
                : 'ring-2 ring-[#FFCC00] border-[#FFCC00]'
              : isLight
              ? 'border-slate-300 shadow-sm'
              : 'border-[#7B1FA2]/50 shadow-sm'
          } ${isLight ? 'bg-white text-slate-800' : 'bg-[#111418] text-white'}`}
        >
          {/* Card Face Graphic for Active Side */}
          <div
            className={`w-full h-full rounded flex flex-col items-center justify-center p-2 border transition-colors duration-300 ${
              isLight
                ? 'border-slate-200 bg-[#1E232B] text-white'
                : 'border-purple-500/40 bg-gradient-to-b from-[#211134] to-[#120B1D] text-white'
            }`}
          >
            {/* Center Brand Oval */}
            <div
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center transform -rotate-12 transition-transform duration-300 ${
                isLight
                  ? 'border-white/50 bg-[#1677E8]/20'
                  : 'border-[#D81B60]/70 bg-[#7B1FA2]/30 shadow-inner shadow-purple-500/30'
              }`}
            >
              <span className="font-black text-xs sm:text-sm tracking-widest uppercase transform rotate-12">
                UNO
              </span>
            </div>

            <div
              className={`mt-1.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${
                isLight ? 'text-[#FFCC00]' : 'text-[#00E5FF] drop-shadow'
              }`}
            >
              FLIP!
            </div>
          </div>
        </div>
      </div>

      {/* Card Count & Action */}
      <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1E232B] border border-[#2D333B] text-[#9BA3AF] text-xs font-medium">
        <Layers className={`w-3.5 h-3.5 ${hasPenalty ? 'text-[#ED1C24]' : 'text-[#FFCC00]'}`} />
        <span>{count} cards</span>
      </div>

      {isMyTurn && !disabled && (
        <span
          className={`mt-1 text-[11px] uppercase tracking-wider ${
            hasPenalty
              ? 'font-black text-[#ED1C24] animate-pulse'
              : 'font-bold text-[#FFCC00]'
          }`}
        >
          {hasPenalty ? `Draw +${drawPenalty} Penalty` : 'Click to Draw'}
        </span>
      )}
    </div>
  );
};
