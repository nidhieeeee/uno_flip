'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Side, UnoFlipCard } from '@/lib/game/types';
import { UnoCard } from '../card/UnoCard';
import { computeHandLayout } from '@/lib/game/handLayout';
import { soundManager } from '@/lib/audio/soundManager';
import { useSettings } from '@/lib/settings/SettingsContext';
import { launchCardPlayOverlay } from '@/lib/game/cardAnimation';
import { Check, Clock, Eye, Flame, ShieldAlert, Sparkles } from 'lucide-react';

interface PlayerHandProps {
  cards: UnoFlipCard[];
  activeSide: Side;
  isMyTurn: boolean;
  isValidCard: (card: UnoFlipCard) => boolean;
  onPlayCard: (card: UnoFlipCard) => void;
  onCallUno: () => void | Promise<any>;
  hasCalledUno: boolean;
  unoDeclarationDeadline?: string | null;
  isPenalized?: boolean;
  penaltyMessage?: string | null;
  disabled?: boolean;
  turnSecondsLeft?: number | null;
  drawPenalty?: number;
  canStack?: boolean;
}

/**
 * Hook to manage countdown without impure calls during render or synchronous setState in effects.
 */
function useDeadlineCountdown(deadline?: string | null): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      const resetTimer = setTimeout(() => {
        setSecondsLeft(null);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const calc = () => Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
    const initTimer = setTimeout(() => {
      setSecondsLeft(calc());
    }, 0);

    const interval = setInterval(() => {
      setSecondsLeft(calc());
    }, 250);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [deadline]);

  return secondsLeft;
}

/**
 * Isolated countdown badge to prevent ticking intervals from re-rendering the cards container.
 */
const UnoCountdownBadge: React.FC<{
  deadline: string | null | undefined;
  isUnoVulnerable: boolean;
}> = React.memo(({ deadline, isUnoVulnerable }) => {
  const secondsLeft = useDeadlineCountdown(deadline);

  if (!isUnoVulnerable || secondsLeft === null || secondsLeft <= 0) {
    return null;
  }

  return (
    <div className="mb-2 px-3.5 py-1 rounded-full bg-[#ED1C24] border border-white/20 text-white text-xs font-black tracking-wider uppercase shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-150">
      <Flame className="w-3.5 h-3.5 fill-current text-[#FFCC00]" />
      <span>CALL UNO NOW! {secondsLeft}s remaining or +2 cards penalty!</span>
    </div>
  );
});
UnoCountdownBadge.displayName = 'UnoCountdownBadge';

/**
 * Isolated UNO Button to handle countdown text without re-rendering player cards.
 */
const UnoButton: React.FC<{
  disabled: boolean;
  isCallingUno: boolean;
  hasCalledUno: boolean;
  justCalledUno: boolean;
  isUnoVulnerable: boolean;
  deadline?: string | null;
  cardCount: number;
  onClick: () => void;
}> = React.memo(({
  disabled,
  isCallingUno,
  hasCalledUno,
  justCalledUno,
  isUnoVulnerable,
  deadline,
  cardCount,
  onClick,
}) => {
  const secondsLeft = useDeadlineCountdown(deadline);

  const buttonDisabled = disabled || isCallingUno || hasCalledUno || cardCount !== 1;

  return (
    <button
      onClick={onClick}
      disabled={buttonDisabled}
      className={`flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all touch-manipulation active:scale-95 ${
        hasCalledUno || justCalledUno
          ? 'bg-[#27AE60] text-white border border-[#27AE60] shadow-sm cursor-default'
          : isUnoVulnerable
          ? 'bg-[#FFCC00] text-[#15191F] ring-2 ring-[#ED1C24] ring-offset-2 ring-offset-[#15191F] shadow-md font-black hover:bg-[#E6B800] scale-105 cursor-pointer'
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
      <span>
        {hasCalledUno || justCalledUno
          ? 'UNO Declared!'
          : isUnoVulnerable && secondsLeft !== null && secondsLeft > 0
          ? `Call UNO (${secondsLeft}s)!`
          : 'Call UNO'}
      </span>
    </button>
  );
});
UnoButton.displayName = 'UnoButton';

const PlayerHandComponent: React.FC<PlayerHandProps> = ({
  cards,
  activeSide,
  isMyTurn,
  isValidCard,
  onPlayCard,
  onCallUno,
  hasCalledUno,
  unoDeclarationDeadline,
  isPenalized = false,
  penaltyMessage,
  disabled = false,
  turnSecondsLeft,
  drawPenalty = 0,
  canStack = false,
}) => {
  const { settings } = useSettings();
  const [peekOtherSide, setPeekOtherSide] = useState(false);
  const [prevActiveSide, setPrevActiveSide] = useState(activeSide);
  if (activeSide !== prevActiveSide) {
    setPrevActiveSide(activeSide);
    setPeekOtherSide(false);
  }
  const [isCallingUno, setIsCallingUno] = useState(false);
  const [justCalledUno, setJustCalledUno] = useState(false);
  const [showPenalty, setShowPenalty] = useState(isPenalized);
  const [prevIsPenalized, setPrevIsPenalized] = useState(isPenalized);

  if (isPenalized !== prevIsPenalized) {
    setPrevIsPenalized(isPenalized);
    setShowPenalty(isPenalized);
  }

  // Auto-dismiss penalty notification badge after 2.5s
  useEffect(() => {
    if (!showPenalty) return;
    const timer = setTimeout(() => {
      setShowPenalty(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [showPenalty]);

  const displaySide: Side = peekOtherSide
    ? activeSide === 'light'
      ? 'dark'
      : 'light'
    : activeSide;

  // Responsive hand container measurements with thresholding to prevent subpixel layout thrashing
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width > 0) {
          setContainerWidth((prev) => (Math.abs(prev - width) >= 4 ? width : prev));
        }
      }
      if (typeof window !== 'undefined') {
        const mobile = window.innerWidth < 640;
        setIsMobile((prev) => (prev !== mobile ? mobile : prev));
      }
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  // Compute responsive dynamic card sizing and overlap
  const layout = computeHandLayout(cards.length, containerWidth, isMobile);

  // References for FLIP and GSAP card entrance / rearrangement animations
  const prevCardsRef = useRef<UnoFlipCard[]>(cards);
  const prevCardIdsRef = useRef<string[]>(cards.map((c) => c.id));
  const prevContainerWidthRef = useRef<number>(containerWidth);
  const cardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevPositionsRef = useRef<Map<string, { left: number; top: number }>>(new Map());
  const isInitialMount = useRef(true);

  useLayoutEffect(() => {
    // Initial mount: capture baseline card positions without animating
    if (isInitialMount.current) {
      isInitialMount.current = false;
      cardElementsRef.current.forEach((el, id) => {
        const rect = el.getBoundingClientRect();
        prevPositionsRef.current.set(id, { left: rect.left, top: rect.top });
      });
      prevCardsRef.current = cards;
      prevCardIdsRef.current = cards.map((c) => c.id);
      prevContainerWidthRef.current = containerWidth;
      return;
    }

    const currentIds = cards.map((c) => c.id);
    const prevIds = prevCardIdsRef.current;

    // Check if card IDs or container width actually changed
    const idsIdentical =
      prevIds.length === currentIds.length &&
      prevIds.every((id, i) => id === currentIds[i]);
    const widthIdentical = prevContainerWidthRef.current === containerWidth;

    // If neither card IDs nor container width changed, avoid recreating animations or touching GSAP
    if (idsIdentical && widthIdentical) {
      return;
    }

    const prevIdSet = new Set(prevIds);
    const newlyAddedCards = cards.filter((c) => !prevIdSet.has(c.id));
    const newlyAddedIdSet = new Set(newlyAddedCards.map((c) => c.id));

    // 1. Capture current visual positions of existing elements before clearing transforms
    const currentVisualPositions = new Map<string, { left: number; top: number }>();
    cards.forEach((c) => {
      const el = cardElementsRef.current.get(c.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        currentVisualPositions.set(c.id, { left: rect.left, top: rect.top });
      }
    });

    // 2. Kill running tweens on existing cards and clear transforms to measure true resting positions
    cards.forEach((c) => {
      const el = cardElementsRef.current.get(c.id);
      if (el) {
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: 'transform' });
      }
    });

    // 3. Batch measure resting layout positions
    const restingPositions = new Map<string, DOMRect>();
    cards.forEach((c) => {
      const el = cardElementsRef.current.get(c.id);
      if (el) {
        restingPositions.set(c.id, el.getBoundingClientRect());
      }
    });

    const isReducedMotion =
      settings.animation_intensity === 'reduced' ||
      !settings.animations_enabled ||
      (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // If animations are completely disabled by user settings, skip all GSAP tweens
    if (!settings.animations_enabled) {
      prevPositionsRef.current.clear();
      restingPositions.forEach((rect, id) => {
        prevPositionsRef.current.set(id, { left: rect.left, top: rect.top });
      });
      prevCardsRef.current = cards;
      prevCardIdsRef.current = currentIds;
      prevContainerWidthRef.current = containerWidth;
      return;
    }

    // 4. Smoothly slide existing cards into their new layout slots
    cards.forEach((c) => {
      if (newlyAddedIdSet.has(c.id)) return;
      const el = cardElementsRef.current.get(c.id);
      const newRect = restingPositions.get(c.id);
      if (!el || !newRect) return;

      const prevPos = currentVisualPositions.get(c.id) || prevPositionsRef.current.get(c.id);
      if (prevPos) {
        const deltaX = prevPos.left - newRect.left;
        const deltaY = prevPos.top - newRect.top;

        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          gsap.fromTo(
            el,
            { x: deltaX, y: deltaY },
            {
              x: 0,
              y: 0,
              duration: isReducedMotion ? 0.08 : 0.16,
              ease: 'power2.out',
              clearProps: 'transform',
            }
          );
        }
      }
    });

    // 5. Animate newly drawn cards (from draw pile #deck-pile-container)
    const deckEl = typeof document !== 'undefined' ? document.getElementById('deck-pile-container') : null;
    const deckRect = deckEl ? deckEl.getBoundingClientRect() : null;

    newlyAddedCards.forEach((c, index) => {
      const el = cardElementsRef.current.get(c.id);
      const newRect = restingPositions.get(c.id);
      if (!el || !newRect) return;

      const delay = isReducedMotion ? 0 : Math.min(0.12, index * 0.03);

      if (deckRect) {
        const dx = deckRect.left + deckRect.width / 2 - (newRect.left + newRect.width / 2);
        const dy = deckRect.top + deckRect.height / 2 - (newRect.top + newRect.height / 2);
        const scale = isReducedMotion ? 1 : Math.min(1.15, deckRect.width / Math.max(1, newRect.width));

        gsap.fromTo(
          el,
          {
            x: dx,
            y: dy,
            scale,
            opacity: 0.85,
            rotation: isReducedMotion ? 0 : -5,
          },
          {
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            rotation: 0,
            delay,
            duration: isReducedMotion ? 0.08 : 0.22,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          }
        );
      } else {
        gsap.fromTo(
          el,
          { y: 25, opacity: 0, scale: 0.9 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            delay,
            duration: isReducedMotion ? 0.08 : 0.2,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          }
        );
      }
    });

    // 6. Record resting positions for next update
    prevPositionsRef.current.clear();
    restingPositions.forEach((rect, id) => {
      prevPositionsRef.current.set(id, { left: rect.left, top: rect.top });
    });
    prevCardsRef.current = cards;
    prevCardIdsRef.current = currentIds;
    prevContainerWidthRef.current = containerWidth;
  }, [cards, containerWidth]);

  const handleCallUnoClick = async () => {
    if (isCallingUno || hasCalledUno || cards.length !== 1) return;
    setIsCallingUno(true);
    soundManager.playCallUno();
    setJustCalledUno(true);
    setTimeout(() => setJustCalledUno(false), 2000);
    try {
      await onCallUno();
    } finally {
      setIsCallingUno(false);
    }
  };

  const handleCardClick = (card: UnoFlipCard, el: HTMLElement | null, playable: boolean) => {
    if (!playable) return;

    if (cards.length === 1 && !hasCalledUno && !justCalledUno) {
      alert('⚠️ You have 1 card left! You must click "Call UNO" before playing your final card!');
      return;
    }

    const face = displaySide === 'light' ? card.light : card.dark;

    // Regular non-wild cards fly immediately toward discard pile as a separate temporary overlay
    // Wild cards will fly upon color selection in GameBoard to prevent premature disappearances
    if (face.color !== 'wild' && el) {
      launchCardPlayOverlay(el, card.id);
    }

    onPlayCard(card);
  };

  const isUnoVulnerable = cards.length === 1 && !hasCalledUno && !justCalledUno;

  return (
    <div
      id="player-hand-container"
      className={`relative w-full flex flex-col items-center select-none transition-all duration-200 ${
        showPenalty ? 'p-2 rounded-xl border border-[#ED1C24] bg-[#ED1C24]/10' : ''
      }`}
    >
      {/* Floating Penalty Notification Badge */}
      {showPenalty && (
        <div className="absolute -top-7 z-30 px-3 py-1 rounded-full bg-[#ED1C24] border border-white/20 text-white text-xs font-black tracking-wider uppercase shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{penaltyMessage || '+2 CARDS PENALTY — You forgot to call UNO!'}</span>
        </div>
      )}

      {/* Floating UNO Declaration Countdown Banner (isolated in subcomponent) */}
      {!showPenalty && (
        <UnoCountdownBadge
          deadline={unoDeclarationDeadline}
          isUnoVulnerable={isUnoVulnerable}
        />
      )}

      {/* Controls Bar: Turn Indicator, Penalty Prompt, UNO & Peek Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-2 max-w-full px-2">
        {/* Local Player Turn Indicator Pill */}
        {isMyTurn ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFCC00] text-[#15191F] text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(255,204,0,0.3)] border border-amber-300">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>YOUR TURN</span>
            {turnSecondsLeft !== null && turnSecondsLeft !== undefined && (
              <span className="font-mono font-bold bg-[#15191F]/20 px-1.5 py-0.5 rounded text-[10px]">
                {turnSecondsLeft}s
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#15191F]/80 border border-[#2D333B] text-[#9BA3AF] text-xs font-semibold">
            <Clock className="w-3 h-3 text-[#9BA3AF]" />
            <span>Waiting for opponent...</span>
          </div>
        )}

        {/* Penalty Stacking Action Hint */}
        {isMyTurn && drawPenalty > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#ED1C24] text-white text-[11px] font-black uppercase tracking-wider shadow-md border border-red-400/40">
            <span>{canStack ? `DRAW ${drawPenalty} OR STACK` : `DRAW +${drawPenalty} PENALTY`}</span>
          </div>
        )}

        {/* UNO Button */}
        <UnoButton
          disabled={disabled}
          isCallingUno={isCallingUno}
          hasCalledUno={hasCalledUno}
          justCalledUno={justCalledUno}
          isUnoVulnerable={isUnoVulnerable}
          deadline={unoDeclarationDeadline}
          cardCount={cards.length}
          onClick={handleCallUnoClick}
        />

        {/* Peek Other Side Toggle Button */}
        <button
          onClick={() => setPeekOtherSide((prev) => !prev)}
          className={`flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer touch-manipulation active:scale-95 ${
            peekOtherSide
              ? 'bg-[#1E232B] border-[#FFCC00] text-[#FFCC00]'
              : 'bg-[#1E232B] border-[#2D333B] text-[#9BA3AF] hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{peekOtherSide ? 'Viewing Other Side' : 'Peek Other Side'}</span>
        </button>
      </div>

      {/* Responsive, Animated Cards Container: No Horizontal Scrollbar */}
      <div
        ref={containerRef}
        className="w-full max-w-4xl px-1 sm:px-2 py-1 flex justify-center items-end min-h-[105px] xs:min-h-[125px] sm:min-h-[165px] overflow-visible"
      >
        <div
          className="flex items-end justify-center"
          style={{
            width: layout.totalWidth ? `${layout.totalWidth}px` : 'auto',
            minHeight: `${layout.cardHeight}px`,
          }}
        >
          {cards.map((card, index) => {
            const playable = isMyTurn && !disabled && !peekOtherSide && isValidCard(card);
            const marginLeft =
              index === 0
                ? 0
                : layout.step < layout.cardWidth
                ? layout.step - layout.cardWidth
                : layout.gap;

            return (
              <div
                key={card.id}
                ref={(el) => {
                  if (el) cardElementsRef.current.set(card.id, el);
                  else cardElementsRef.current.delete(card.id);
                }}
                data-card-id={card.id}
                style={{
                  zIndex: index + 10,
                  width: `${layout.cardWidth}px`,
                  height: `${layout.cardHeight}px`,
                  marginLeft: `${marginLeft}px`,
                  flexShrink: 0,
                  transition: 'width 0.2s ease-out, height 0.2s ease-out',
                  willChange: 'transform',
                }}
                className={`relative ${
                  playable
                    ? 'hover:-translate-y-2.5 hover:z-40 transition-transform duration-150'
                    : ''
                }`}
              >
                <UnoCard
                  card={card}
                  side={displaySide}
                  isPlayable={playable}
                  onClick={() =>
                    handleCardClick(card, cardElementsRef.current.get(card.id) || null, playable)
                  }
                  size="custom"
                  width={layout.cardWidth}
                  height={layout.cardHeight}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const PlayerHand = React.memo(PlayerHandComponent);
