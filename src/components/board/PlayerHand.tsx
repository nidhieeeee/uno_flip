'use client';

import React, { useState } from 'react';
import { Side, UnoFlipCard } from '@/lib/game/types';
import { UnoCard } from '../card/UnoCard';
import { playUnoCallSound } from '@/lib/audio/sound';
import { Check, Eye, Flame, ShieldAlert } from 'lucide-react';

interface PlayerHandProps {
  cards: UnoFlipCard[];
  activeSide: Side;
  isMyTurn: boolean;
  isValidCard: (card: UnoFlipCard) => boolean;
  onPlayCard: (card: UnoFlipCard) => void;
  onCallUno: () => void | Promise<any>;
  hasCalledUno: boolean;
  isPenalized?: boolean;
  disabled?: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  activeSide,
  isMyTurn,
  isValidCard,
  onPlayCard,
  onCallUno,
  hasCalledUno,
  isPenalized = false,
  disabled = false,
}) => {
  const [peekOtherSide, setPeekOtherSide] = useState(false);
  const [isCallingUno, setIsCallingUno] = useState(false);
  const [justCalledUno, setJustCalledUno] = useState(false);

  const displaySide: Side = peekOtherSide
    ? activeSide === 'light'
      ? 'dark'
      : 'light'
    : activeSide;

  const handleCallUnoClick = async () => {
    if (isCallingUno || hasCalledUno || cards.length !== 1) return;
    setIsCallingUno(true);
    playUnoCallSound();
    setJustCalledUno(true);
    setTimeout(() => setJustCalledUno(false), 2000);
    try {
      await onCallUno();
    } finally {
      setIsCallingUno(false);
    }
  };

  const isUnoVulnerable = cards.length === 1 && !hasCalledUno && !justCalledUno;

  return (
    <div
      id="player-hand-container"
      className={`relative w-full flex flex-col items-center select-none transition-all duration-200 ${
        isPenalized ? 'p-2 rounded-xl border border-[#ED1C24] bg-[#ED1C24]/10' : ''
      }`}
    >
      {/* Floating Penalty Notification Badge */}
      {isPenalized && (
        <div className="absolute -top-7 z-30 px-3 py-1 rounded-full bg-[#ED1C24] text-white text-xs font-black tracking-wider uppercase shadow-lg animate-bounce flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>+2 CARDS PENALTY — You forgot to call UNO!</span>
        </div>
      )}

      {/* Controls Bar: UNO & Peek Buttons */}
      <div className="flex items-center gap-2 mb-2">
        {/* Responsive UNO Button with Pulse Reminder */}
        <button
          onClick={handleCallUnoClick}
          disabled={disabled || isCallingUno || hasCalledUno || cards.length !== 1}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
            hasCalledUno || justCalledUno
              ? 'bg-[#27AE60] text-white border border-[#27AE60] shadow-sm cursor-default'
              : isUnoVulnerable
              ? 'bg-[#FFCC00] text-[#15191F] ring-2 ring-[#FFCC00] ring-offset-2 ring-offset-[#15191F] animate-pulse shadow-md font-black hover:bg-[#E6B800] scale-105 cursor-pointer'
              : 'bg-[#1E232B] text-[#9BA3AF]/50 border border-[#2D333B] opacity-50 cursor-not-allowed'
          }`}
          title={
            isUnoVulnerable
              ? 'WARNING: You have 1 card! Call UNO immediately!'
              : hasCalledUno || justCalledUno
              ? 'UNO declared!'
              : 'You can only call UNO when you have 1 card left'
          }
        >
          {hasCalledUno || justCalledUno ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <Flame className={`w-3.5 h-3.5 ${isUnoVulnerable ? 'text-[#ED1C24]' : ''}`} />
          )}
          <span>{hasCalledUno || justCalledUno ? 'UNO Declared!' : 'Call UNO'}</span>
        </button>

        {/* Peek Other Side Toggle Button */}
        <button
          onClick={() => setPeekOtherSide((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            peekOtherSide
              ? 'bg-[#1E232B] border-[#FFCC00] text-[#FFCC00]'
              : 'bg-[#1E232B] border-[#2D333B] text-[#9BA3AF] hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{peekOtherSide ? 'Viewing Other Side' : 'Peek Other Side'}</span>
        </button>
      </div>

      {/* Slightly Overlapping Row of Cards */}
      <div className="w-full max-w-4xl px-2 py-2 overflow-x-auto scrollbar-thin flex justify-start sm:justify-center items-end min-h-[130px] sm:min-h-[160px]">
        <div className="flex items-end -space-x-6 sm:-space-x-8 hover:space-x-0.5 sm:hover:space-x-1 transition-all duration-150 py-2 px-4">
          {cards.map((card, index) => {
            const playable = isMyTurn && !disabled && !peekOtherSide && isValidCard(card);

            return (
              <div
                key={card.id}
                className="transition-transform duration-150 origin-bottom"
                style={{ zIndex: index + 10 }}
              >
                <UnoCard
                  card={card}
                  side={displaySide}
                  isPlayable={playable}
                  onClick={() => {
                    if (playable) {
                      if (cards.length === 1 && !hasCalledUno && !justCalledUno) {
                        alert('⚠️ You have 1 card left! You must click "Call UNO" before playing your final card!');
                        return;
                      }
                      onPlayCard(card);
                    }
                  }}
                  size="md"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
