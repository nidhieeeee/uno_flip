'use client';

import React from 'react';
import { CardColor, Side, UnoFlipCard } from '@/lib/game/types';
import { Ban, FlipHorizontal, RefreshCw, Sparkles, Users } from 'lucide-react';

interface UnoCardProps {
  card: UnoFlipCard;
  side: Side;
  isPlayable?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const UnoCard: React.FC<UnoCardProps> = ({
  card,
  side,
  isPlayable = false,
  onClick,
  className = '',
  size = 'md',
}) => {
  const face = side === 'light' ? card.light : card.dark;
  const isLight = side === 'light';

  // Dimension presets
  const sizeStyles = {
    sm: 'w-14 h-20 text-xs rounded-md',
    md: 'w-20 h-28 sm:w-24 sm:h-36 text-sm sm:text-base rounded-lg',
    lg: 'w-28 h-40 sm:w-32 sm:h-48 text-base sm:text-lg rounded-xl',
  }[size];

  // Classic Flat Solid Colors
  const getCardBgColor = (color: CardColor | 'wild') => {
    switch (color) {
      // Light Side Colors
      case 'red':
        return 'bg-[#ED1C24] text-white';
      case 'yellow':
        return 'bg-[#FFCC00] text-[#111827]';
      case 'green':
        return 'bg-[#27AE60] text-white';
      case 'blue':
        return 'bg-[#1677E8] text-white';

      // Dark Side Colors
      case 'pink':
        return 'bg-[#D81B60] text-white';
      case 'teal':
        return 'bg-[#00897B] text-white';
      case 'orange':
        return 'bg-[#E65100] text-white';
      case 'purple':
        return 'bg-[#7B1FA2] text-white';

      case 'wild':
        return isLight ? 'bg-[#1E232B] text-white' : 'bg-[#111418] text-white';
      default:
        return 'bg-[#2D333B] text-white';
    }
  };

  const getSymbolColorClass = (color: CardColor | 'wild') => {
    switch (color) {
      case 'red':
        return 'text-[#ED1C24]';
      case 'yellow':
        return 'text-[#D4A000]';
      case 'green':
        return 'text-[#27AE60]';
      case 'blue':
        return 'text-[#1677E8]';
      case 'pink':
        return 'text-[#D81B60]';
      case 'teal':
        return 'text-[#00897B]';
      case 'orange':
        return 'text-[#E65100]';
      case 'purple':
        return 'text-[#7B1FA2]';
      default:
        return 'text-[#111827]';
    }
  };

  const renderSymbol = () => {
    if (face.type === 'number') {
      return (
        <span
          className={`font-black text-3xl sm:text-5xl tracking-tighter select-none ${getSymbolColorClass(
            face.color
          )}`}
        >
          {face.value}
        </span>
      );
    }

    if (face.type === 'draw_one') {
      return (
        <span
          className={`font-black text-2xl sm:text-3xl select-none ${getSymbolColorClass(
            face.color
          )}`}
        >
          +1
        </span>
      );
    }

    if (face.type === 'draw_five') {
      return (
        <span
          className={`font-black text-2xl sm:text-3xl select-none ${getSymbolColorClass(
            face.color
          )}`}
        >
          +5
        </span>
      );
    }

    if (face.type === 'wild_draw_two') {
      return <span className="font-black text-2xl sm:text-3xl select-none text-white">+2</span>;
    }

    if (face.type === 'wild_draw_color') {
      return (
        <div className="flex flex-col items-center select-none text-white">
          <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 text-[#FFCC00]" />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">COLOR</span>
        </div>
      );
    }

    if (face.type === 'reverse') {
      return (
        <RefreshCw
          className={`w-6 h-6 sm:w-9 sm:h-9 stroke-[2.5] ${getSymbolColorClass(face.color)}`}
        />
      );
    }

    if (face.type === 'skip') {
      return (
        <Ban className={`w-6 h-6 sm:w-9 sm:h-9 stroke-[2.5] ${getSymbolColorClass(face.color)}`} />
      );
    }

    if (face.type === 'skip_everyone') {
      return (
        <div className="flex flex-col items-center">
          <Users className={`w-5 h-5 sm:w-8 sm:h-8 ${getSymbolColorClass(face.color)}`} />
          <span className="text-[9px] font-black uppercase tracking-widest text-white">ALL</span>
        </div>
      );
    }

    if (face.type === 'flip') {
      return (
        <div className="flex flex-col items-center">
          <FlipHorizontal
            className={`w-6 h-6 sm:w-8 sm:h-8 stroke-[2.5] ${getSymbolColorClass(face.color)}`}
          />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-800">
            FLIP
          </span>
        </div>
      );
    }

    if (face.type === 'wild') {
      return (
        <div className="relative w-8 h-8 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-white">
          {isLight ? (
            <div className="w-full h-full grid grid-cols-2 grid-rows-2">
              <div className="bg-[#ED1C24]" />
              <div className="bg-[#1677E8]" />
              <div className="bg-[#FFCC00]" />
              <div className="bg-[#27AE60]" />
            </div>
          ) : (
            <div className="w-full h-full grid grid-cols-2 grid-rows-2">
              <div className="bg-[#D81B60]" />
              <div className="bg-[#00897B]" />
              <div className="bg-[#E65100]" />
              <div className="bg-[#7B1FA2]" />
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const cornerLabel = () => {
    if (face.type === 'number') return face.value;
    if (face.type === 'draw_one') return '+1';
    if (face.type === 'draw_five') return '+5';
    if (face.type === 'wild_draw_two') return '+2';
    if (face.type === 'wild_draw_color') return '🎨';
    if (face.type === 'reverse') return '⇄';
    if (face.type === 'skip') return '⊘';
    if (face.type === 'skip_everyone') return '⊘⊘';
    if (face.type === 'flip') return '⮂';
    if (face.type === 'wild') return '★';
    return '';
  };

  return (
    <div
      onClick={isPlayable && onClick ? onClick : undefined}
      className={`relative select-none transition-colors duration-150 ${sizeStyles} ${
        isPlayable
          ? 'cursor-pointer ring-2 ring-[#FFCC00]'
          : 'cursor-default opacity-95'
      } ${className}`}
    >
      {/* Outer Card Frame: Classic White Border on Light, Dark Border on Dark */}
      <div
        className={`w-full h-full rounded-[inherit] p-1.5 flex flex-col justify-between border ${
          isLight
            ? 'bg-white border-slate-300 shadow-sm'
            : 'bg-[#111418] border-[#2D333B] shadow-sm'
        }`}
      >
        {/* Inner Solid Card Body */}
        <div
          className={`relative w-full h-full rounded-[calc(inherit-3px)] ${getCardBgColor(
            face.color
          )} flex flex-col justify-between p-1 sm:p-1.5 overflow-hidden`}
        >
          {/* Top-Left Corner Symbol */}
          <div className="flex items-center justify-start text-[11px] sm:text-xs font-black leading-none">
            {cornerLabel()}
          </div>

          {/* Classic Center Oval */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-4/5 h-3/5 rounded-[50%] transform -rotate-[25deg] flex items-center justify-center border ${
                face.color === 'wild'
                  ? 'bg-transparent border-transparent'
                  : isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-white border-slate-300'
              }`}
            >
              <div className="transform rotate-[25deg] flex items-center justify-center">
                {renderSymbol()}
              </div>
            </div>
          </div>

          {/* Bottom-Right Corner Symbol (Rotated 180) */}
          <div className="flex items-center justify-end text-[11px] sm:text-xs font-black leading-none rotate-180">
            {cornerLabel()}
          </div>
        </div>
      </div>
    </div>
  );
};
