import gsap from 'gsap';
import { Side } from './types';

// Keep track of active in-flight flying card overlays by cardId to prevent duplicate animations
const activeFlyingCardIds = new Set<string>();

export interface AnimationConfig {
  animationsEnabled?: boolean;
  animationIntensity?: 'full' | 'reduced';
}

/**
 * Reads local animation configuration if not explicitly passed
 */
export function getCurrentAnimationConfig(): AnimationConfig {
  if (typeof window === 'undefined') {
    return { animationsEnabled: true, animationIntensity: 'full' };
  }
  try {
    const raw =
      localStorage.getItem('uno_player_preferences') ||
      localStorage.getItem('uno_guest_preferences');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        animationsEnabled: parsed.animations_enabled ?? true,
        animationIntensity: parsed.animation_intensity ?? 'full',
      };
    }
  } catch {}

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    animationsEnabled: true,
    animationIntensity: isReducedMotion ? 'reduced' : 'full',
  };
}

/**
 * Checks if a card is currently undergoing an in-flight play travel animation.
 */
export function isCardFlying(cardId: string): boolean {
  return activeFlyingCardIds.has(cardId);
}

/**
 * Cancels and clears any active flying overlay for a card (e.g. if a move was rejected by the server).
 */
export function cancelCardFlight(cardId: string): void {
  activeFlyingCardIds.delete(cardId);
  if (typeof document !== 'undefined') {
    const overlays = document.querySelectorAll(`[data-flying-card-id="${cardId}"]`);
    overlays.forEach((el) => el.remove());
  }
}

/**
 * Helper to create a stylized UNO FLIP card back element for DOM animations.
 */
export function createCardBackDOMElement(side: Side, width = 36, height = 52): HTMLElement {
  const el = document.createElement('div');
  el.className = `fixed z-50 pointer-events-none rounded-md border flex flex-col items-center justify-center select-none shadow-2xl ${
    side === 'light'
      ? 'bg-white border-slate-300 text-slate-800'
      : 'bg-[#111418] border-[#7B1FA2]/70 text-white'
  }`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;

  const inner = document.createElement('div');
  inner.className = `w-full h-full rounded-[inherit] flex flex-col items-center justify-center border ${
    side === 'light'
      ? 'border-slate-200 bg-[#1E232B] text-white'
      : 'border-purple-500/40 bg-gradient-to-b from-[#211134] to-[#120B1D] text-white'
  }`;

  const oval = document.createElement('div');
  oval.className = `w-5 h-5 rounded-full border flex items-center justify-center transform -rotate-12 ${
    side === 'light'
      ? 'border-white/60 bg-[#1677E8]/30'
      : 'border-[#D81B60]/80 bg-[#7B1FA2]/40'
  }`;

  const logo = document.createElement('span');
  logo.className = 'font-black text-[7px] text-white transform rotate-12 tracking-wider leading-none';
  logo.innerText = 'UNO';
  oval.appendChild(logo);

  const flip = document.createElement('span');
  flip.className = `text-[5px] font-black uppercase tracking-widest mt-0.5 leading-none ${
    side === 'light' ? 'text-[#FFCC00]' : 'text-[#00E5FF]'
  }`;
  flip.innerText = 'FLIP!';

  inner.appendChild(oval);
  inner.appendChild(flip);
  el.appendChild(inner);

  return el;
}

/**
 * Spawns a temporary, independent overlay element for the player's played card outside the hand hierarchy
 * and animates it smoothly from its source position to the discard pile (#discard-pile-container).
 */
export function launchCardPlayOverlay(
  sourceEl: HTMLElement | null,
  cardId: string,
  onComplete?: () => void,
  config?: AnimationConfig
): boolean {
  if (typeof document === 'undefined' || !sourceEl) return false;

  const currentConfig = config || getCurrentAnimationConfig();
  if (currentConfig.animationsEnabled === false) {
    if (onComplete) onComplete();
    return true;
  }

  // Prevent duplicate travel animations for the same card
  if (activeFlyingCardIds.has(cardId)) {
    return false;
  }

  const discardEl = document.getElementById('discard-pile-container');
  if (!discardEl) return false;

  activeFlyingCardIds.add(cardId);

  const cardRect = sourceEl.getBoundingClientRect();
  const discardRect = discardEl.getBoundingClientRect();

  // Clone source element to preserve exact visual fidelity (card face, colors, dimensions)
  const overlay = sourceEl.cloneNode(true) as HTMLElement;
  overlay.setAttribute('data-flying-card-id', cardId);
  overlay.id = `flying-play-${cardId}-${Date.now()}`;
  overlay.style.position = 'fixed';
  overlay.style.left = `${cardRect.left}px`;
  overlay.style.top = `${cardRect.top}px`;
  overlay.style.width = `${cardRect.width}px`;
  overlay.style.height = `${cardRect.height}px`;
  overlay.style.margin = '0';
  overlay.style.zIndex = '9999';
  overlay.style.pointerEvents = 'none';
  overlay.style.visibility = 'visible';
  overlay.style.transform = 'none';
  overlay.style.willChange = 'transform, opacity';

  document.body.appendChild(overlay);

  const isReduced =
    currentConfig.animationIntensity === 'reduced' ||
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const dx = discardRect.left + discardRect.width / 2 - (cardRect.left + cardRect.width / 2);
  const dy = discardRect.top + discardRect.height / 2 - (cardRect.top + cardRect.height / 2);
  const targetScale = Math.min(1.15, discardRect.width / Math.max(1, cardRect.width));
  const rotation = isReduced
    ? 0
    : (cardId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 15) - 7;

  gsap.to(overlay, {
    x: dx,
    y: dy,
    scale: targetScale,
    rotation,
    duration: isReduced ? 0.08 : 0.22, // 80ms if reduced, 220ms if full
    ease: 'power2.out',
    onComplete: () => {
      activeFlyingCardIds.delete(cardId);
      overlay.remove();
      if (onComplete) onComplete();
    },
  });

  return true;
}

/**
 * Animates a face-down UNO FLIP card back moving from an opponent's seat to the discard pile.
 */
export function launchOpponentPlayOverlay(
  opponentSeatEl: HTMLElement | null,
  side: Side,
  onComplete?: () => void,
  config?: AnimationConfig
): boolean {
  if (typeof document === 'undefined' || !opponentSeatEl) return false;

  const currentConfig = config || getCurrentAnimationConfig();
  if (currentConfig.animationsEnabled === false) {
    if (onComplete) onComplete();
    return true;
  }

  const discardEl = document.getElementById('discard-pile-container');
  if (!discardEl) return false;

  const sourceRect = opponentSeatEl.getBoundingClientRect();
  const discardRect = discardEl.getBoundingClientRect();

  const overlay = createCardBackDOMElement(side, 32, 46);
  overlay.style.left = `${sourceRect.left + sourceRect.width / 2 - 16}px`;
  overlay.style.top = `${sourceRect.top + sourceRect.height / 2 - 23}px`;
  document.body.appendChild(overlay);

  const isReduced =
    currentConfig.animationIntensity === 'reduced' ||
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const dx = discardRect.left + discardRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
  const dy = discardRect.top + discardRect.height / 2 - (sourceRect.top + sourceRect.height / 2);

  gsap.to(overlay, {
    x: dx,
    y: dy,
    scale: 1.15,
    rotation: isReduced ? 0 : 25,
    duration: isReduced ? 0.08 : 0.22,
    ease: 'power2.out',
    onComplete: () => {
      overlay.remove();
      if (onComplete) onComplete();
    },
  });

  return true;
}

/**
 * Animates face-down UNO FLIP card back(s) moving from the draw pile toward an opponent's seat.
 */
export function launchOpponentDrawOverlay(
  opponentSeatEl: HTMLElement | null,
  side: Side,
  count = 1,
  onComplete?: () => void,
  config?: AnimationConfig
): boolean {
  if (typeof document === 'undefined' || !opponentSeatEl) return false;

  const currentConfig = config || getCurrentAnimationConfig();
  if (currentConfig.animationsEnabled === false) {
    if (onComplete) onComplete();
    return true;
  }

  const deckEl = document.getElementById('deck-pile-container');
  if (!deckEl) return false;

  const deckRect = deckEl.getBoundingClientRect();
  const targetRect = opponentSeatEl.getBoundingClientRect();

  const isReduced =
    currentConfig.animationIntensity === 'reduced' ||
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cardsToFly = Math.min(count, 3);
  let finished = 0;

  for (let i = 0; i < cardsToFly; i++) {
    const overlay = createCardBackDOMElement(side, 30, 44);
    overlay.style.left = `${deckRect.left + deckRect.width / 2 - 15}px`;
    overlay.style.top = `${deckRect.top + deckRect.height / 2 - 22}px`;
    document.body.appendChild(overlay);

    const dx = targetRect.left + targetRect.width / 2 - (deckRect.left + deckRect.width / 2);
    const dy = targetRect.top + targetRect.height / 2 - (deckRect.top + deckRect.height / 2);
    const delay = isReduced ? 0 : i * 0.04;

    gsap.to(overlay, {
      x: dx,
      y: dy,
      scale: 0.85,
      rotation: isReduced ? 0 : i === 0 ? -15 : 15,
      delay,
      duration: isReduced ? 0.08 : 0.22,
      ease: 'power2.out',
      onComplete: () => {
        overlay.remove();
        finished++;
        if (finished === cardsToFly && onComplete) {
          onComplete();
        }
      },
    });
  }

  return true;
}
