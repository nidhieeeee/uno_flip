'use client';

import React from 'react';
import { CardColor, Side } from '@/lib/game/types';
import { DARK_COLORS, LIGHT_COLORS } from '@/lib/game/deck';

interface ColorPickerModalProps {
  isOpen: boolean;
  side: Side;
  onSelectColor: (color: CardColor) => void;
  onCancel: () => void;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  side,
  onSelectColor,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isLight = side === 'light';
  const colors = isLight ? LIGHT_COLORS : DARK_COLORS;

  const getColorButtonStyles = (color: CardColor) => {
    switch (color) {
      case 'red':
        return 'bg-[#ED1C24] text-white hover:brightness-105';
      case 'yellow':
        return 'bg-[#FFCC00] text-[#111827] hover:brightness-105';
      case 'green':
        return 'bg-[#27AE60] text-white hover:brightness-105';
      case 'blue':
        return 'bg-[#1677E8] text-white hover:brightness-105';
      case 'pink':
        return 'bg-[#D81B60] text-white hover:brightness-105';
      case 'teal':
        return 'bg-[#00897B] text-white hover:brightness-105';
      case 'orange':
        return 'bg-[#E65100] text-white hover:brightness-105';
      case 'purple':
        return 'bg-[#7B1FA2] text-white hover:brightness-105';
      default:
        return 'bg-[#2D333B] text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="relative w-full max-w-xs rounded-xl bg-[#1E232B] border border-[#2D333B] p-5 shadow-lg flex flex-col items-center">
        {/* Title */}
        <h3 className="text-base font-bold text-white mb-1">Select Color</h3>
        <p className="text-[#9BA3AF] text-xs text-center mb-4">
          Choose color for the {isLight ? 'Light' : 'Dark'} Side
        </p>

        {/* 2x2 Grid of Color Choices */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onSelectColor(color)}
              className={`min-h-[52px] h-14 sm:h-16 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all active:scale-95 border border-white/20 flex items-center justify-center cursor-pointer touch-manipulation ${getColorButtonStyles(
                color
              )}`}
            >
              {color}
            </button>
          ))}
        </div>

        {/* Cancel Button with proper tap target */}
        <button
          onClick={onCancel}
          className="mt-3.5 min-h-[44px] px-4 flex items-center justify-center text-xs text-[#9BA3AF] hover:text-white transition-colors touch-manipulation cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
