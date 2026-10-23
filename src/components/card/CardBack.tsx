'use client';

import React from 'react';
import { Side } from '@/lib/game/types';

export interface CardBackProps {
  side: Side;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'custom';
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable UNO FLIP Card Back component.
 * Displays the authentic UNO FLIP logo with distinct Light and Dark side visual themes.
 * Never exposes any playable card faces or values.
 */
export const CardBack: React.FC<CardBackProps> = ({
  side,
  size = 'md',
  width,
  height,
  className = '',
  style,
}) => {
  const isLight = side === 'light';

  // Dimension presets
  const sizeStyles = {
    xs: 'w-6 h-9 sm:w-8 sm:h-12 rounded-sm sm:rounded-md p-0.5',
    sm: 'w-12 h-16 xs:w-14 xs:h-20 rounded-md p-1',
    md: 'w-16 h-22 xs:w-20 xs:h-28 sm:w-24 sm:h-36 rounded-lg p-1 sm:p-1.5',
    lg: 'w-22 h-32 xs:w-28 xs:h-40 sm:w-32 sm:h-48 rounded-xl p-1.5',
    custom: 'rounded-md p-0.5',
  }[size];

  const isXs = size === 'xs' || (typeof width === 'number' && width <= 36);

  return (
    <div
      style={{
        ...(typeof width === 'number' ? { width: `${width}px` } : {}),
        ...(typeof height === 'number' ? { height: `${height}px` } : {}),
        ...style,
      }}
      className={`relative select-none flex flex-col justify-between border shadow-sm transition-colors duration-200 ${
        isLight
          ? 'bg-white border-slate-300 text-slate-800'
          : 'bg-[#111418] border-[#7B1FA2]/60 text-white'
      } ${sizeStyles} ${className}`}
    >
      {/* Inner Themed Card Back Container */}
      <div
        className={`w-full h-full rounded-[inherit] flex flex-col items-center justify-center border transition-colors duration-200 overflow-hidden ${
          isLight
            ? 'border-slate-200 bg-[#1E232B] text-white'
            : 'border-purple-500/40 bg-gradient-to-b from-[#211134] to-[#120B1D] text-white'
        }`}
      >
        {/* Center Oval with UNO Brand */}
        <div
          className={`rounded-full border flex items-center justify-center transform -rotate-12 transition-transform duration-200 ${
            isXs
              ? 'w-4 h-4 sm:w-5 sm:h-5'
              : size === 'sm'
              ? 'w-7 h-7 sm:w-8 sm:h-8'
              : 'w-9 h-9 xs:w-11 xs:h-11 sm:w-14 sm:h-14'
          } ${
            isLight
              ? 'border-white/60 bg-[#1677E8]/25'
              : 'border-[#D81B60]/80 bg-[#7B1FA2]/40 shadow-inner shadow-purple-500/30'
          }`}
        >
          <span
            className={`font-black tracking-wider uppercase transform rotate-12 leading-none text-white ${
              isXs
                ? 'text-[5px] sm:text-[7px]'
                : size === 'sm'
                ? 'text-[8px] sm:text-[10px]'
                : 'text-[10px] xs:text-xs sm:text-sm tracking-widest'
            }`}
          >
            UNO
          </span>
        </div>

        {/* FLIP! Wordmark Badge */}
        <div
          className={`font-black uppercase tracking-widest leading-none ${
            isXs
              ? 'mt-0.5 text-[4px] sm:text-[5px]'
              : size === 'sm'
              ? 'mt-0.5 text-[6px] sm:text-[7px]'
              : 'mt-1 sm:mt-1.5 text-[7px] xs:text-[8px] sm:text-[9px]'
          } ${isLight ? 'text-[#FFCC00]' : 'text-[#00E5FF] drop-shadow'}`}
        >
          FLIP!
        </div>
      </div>
    </div>
  );
};
