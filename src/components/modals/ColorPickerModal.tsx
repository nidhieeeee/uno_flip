'use client';

import React from 'react';
import { CardColor, Side } from '@/lib/game/types';
import { DARK_COLORS, LIGHT_COLORS } from '@/lib/game/deck';
import { Palette, X } from 'lucide-react';

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

  const getColorDetails = (color: CardColor) => {
    switch (color) {
      // Light Side
      case 'red':
        return {
          bg: 'bg-[#ED1C24]',
          text: 'text-white',
          border: 'border-red-400/50',
          dot: 'bg-white',
          label: 'Red',
        };
      case 'yellow':
        return {
          bg: 'bg-[#FFCC00]',
          text: 'text-[#111827]',
          border: 'border-amber-300',
          dot: 'bg-[#111827]',
          label: 'Yellow',
        };
      case 'green':
        return {
          bg: 'bg-[#27AE60]',
          text: 'text-white',
          border: 'border-emerald-400/50',
          dot: 'bg-white',
          label: 'Green',
        };
      case 'blue':
        return {
          bg: 'bg-[#1677E8]',
          text: 'text-white',
          border: 'border-blue-400/50',
          dot: 'bg-white',
          label: 'Blue',
        };

      // Dark Side
      case 'pink':
        return {
          bg: 'bg-[#D81B60]',
          text: 'text-white',
          border: 'border-pink-400/50',
          dot: 'bg-white',
          label: 'Pink',
        };
      case 'teal':
        return {
          bg: 'bg-[#00897B]',
          text: 'text-white',
          border: 'border-teal-400/50',
          dot: 'bg-white',
          label: 'Teal',
        };
      case 'orange':
        return {
          bg: 'bg-[#E65100]',
          text: 'text-white',
          border: 'border-orange-400/50',
          dot: 'bg-white',
          label: 'Orange',
        };
      case 'purple':
        return {
          bg: 'bg-[#7B1FA2]',
          text: 'text-white',
          border: 'border-purple-400/50',
          dot: 'bg-white',
          label: 'Purple',
        };

      default:
        return {
          bg: 'bg-[#2D333B]',
          text: 'text-white',
          border: 'border-slate-500',
          dot: 'bg-white',
          label: color,
        };
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose Wild Card Color"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xs rounded-2xl bg-[#1E232B] border border-[#2D333B] p-5 sm:p-6 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-150">
        {/* Header Icon */}
        <div className="w-11 h-11 rounded-xl bg-[#15191F] border border-[#2D333B] text-[#FFCC00] flex items-center justify-center mb-2.5 shadow-inner">
          <Palette className="w-5 h-5 stroke-[2.2]" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-white tracking-wide">Choose Color</h3>
        <p className="text-[#9BA3AF] text-xs text-center mt-0.5 mb-4">
          Select next active color for the{' '}
          <span className="font-bold text-white">{isLight ? 'Light' : 'Dark'} Side</span>
        </p>

        {/* 2x2 Grid of Color Choices */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {colors.map((color) => {
            const details = getColorDetails(color);
            return (
              <button
                key={color}
                onClick={() => onSelectColor(color)}
                className={`min-h-[58px] h-16 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-150 active:scale-95 border flex flex-col items-center justify-center gap-1 cursor-pointer touch-manipulation shadow-md hover:brightness-105 ${details.bg} ${details.text} ${details.border}`}
              >
                <span className={`w-2 h-2 rounded-full ${details.dot} opacity-80`} />
                <span>{details.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="mt-4 min-h-[44px] px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#9BA3AF] hover:text-white rounded-lg hover:bg-[#15191F] transition-colors touch-manipulation cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
};
