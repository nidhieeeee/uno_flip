'use client';

import React from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl bg-[#1E232B] border border-[#2D333B] p-5 sm:p-6 text-white scrollbar-thin">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-[#9BA3AF] hover:text-white hover:bg-[#15191F] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-[#FFCC00]" />
          <h2 className="text-lg font-bold">Rules: How to Play UNO FLIP</h2>
        </div>

        <div className="space-y-4 text-xs text-[#9BA3AF] leading-relaxed">
          {/* Overview */}
          <section className="bg-[#15191F] p-3.5 rounded-lg border border-[#2D333B]">
            <h3 className="text-sm font-semibold text-white mb-1">Dual-Sided Deck</h3>
            <p>
              Every card has a <strong>Light Side</strong> and a <strong>Dark Side</strong>. You start playing on the Light Side. Whenever a <strong>FLIP card</strong> is played, the entire game flips to the opposite side: hands, draw deck, and discard pile!
            </p>
          </section>

          {/* Light vs Dark Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Light Side */}
            <div className="p-3 rounded-lg bg-[#15191F] border border-[#2D333B]">
              <h4 className="font-bold text-[#1677E8] text-xs uppercase tracking-wider mb-2">
                Light Side
              </h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>• <strong>Colors:</strong> Red, Yellow, Green, Blue</li>
                <li>• <strong>Draw One (+1):</strong> Next player draws 1 and skips</li>
                <li>• <strong>Skip:</strong> Next player is skipped</li>
                <li>• <strong>Reverse:</strong> Changes direction</li>
                <li>• <strong>Wild Draw Two (+2):</strong> Choose color, next draws 2</li>
                <li>• <strong>Flip:</strong> Switches everyone to Dark Side</li>
              </ul>
            </div>

            {/* Dark Side */}
            <div className="p-3 rounded-lg bg-[#15191F] border border-[#2D333B]">
              <h4 className="font-bold text-[#D81B60] text-xs uppercase tracking-wider mb-2">
                Dark Side
              </h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>• <strong>Colors:</strong> Pink, Teal, Orange, Purple</li>
                <li>• <strong>Draw Five (+5):</strong> Next player draws 5 and skips</li>
                <li>• <strong>Skip Everyone:</strong> Skips all; you play again</li>
                <li>• <strong>Reverse:</strong> Changes direction</li>
                <li>• <strong>Wild Draw Color:</strong> Draws until chosen color</li>
                <li>• <strong>Flip:</strong> Switches everyone back to Light Side</li>
              </ul>
            </div>
          </div>

          {/* Calling UNO */}
          <section className="bg-[#15191F] p-3.5 rounded-lg border border-[#2D333B]">
            <h3 className="text-sm font-semibold text-white mb-1">Calling &ldquo;UNO&rdquo;</h3>
            <p>
              When you have 2 cards and play one (leaving you with 1 card), press the <strong>Call UNO</strong> button. If an opponent catches you with 1 card before you call UNO, they can click <strong>Catch UNO!</strong> to penalize you with 2 penalty cards.
            </p>
          </section>
        </div>

        {/* Primary Yellow Button */}
        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-lg bg-[#FFCC00] text-[#15191F] font-bold text-xs uppercase tracking-wider hover:bg-[#E6B800] transition-colors cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
