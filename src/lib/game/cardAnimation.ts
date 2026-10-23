import gsap from 'gsap';

// Keep track of active in-flight flying card overlays by cardId to prevent duplicate animations
const activeFlyingCardIds = new Set<string>();

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
 * Spawns a temporary, independent overlay element for the played card outside the hand hierarchy
 * and animates it smoothly from its source position to the discard pile (#discard-pile-container).
 * 
 * - The card is immediately detached/rendered as an overlay, leaving the actual hand state free to update.
 * - Prevents duplicate travel animations for the same card ID.
 * - Automatically removes the overlay once flight completes.
 */
export function launchCardPlayOverlay(
  sourceEl: HTMLElement | null,
  cardId: string,
  onComplete?: () => void
): boolean {
  if (typeof document === 'undefined' || !sourceEl) return false;

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

  const dx = discardRect.left + discardRect.width / 2 - (cardRect.left + cardRect.width / 2);
  const dy = discardRect.top + discardRect.height / 2 - (cardRect.top + cardRect.height / 2);
  const targetScale = Math.min(1.15, discardRect.width / Math.max(1, cardRect.width));
  const rotation = ((cardId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 15) - 7);

  gsap.to(overlay, {
    x: dx,
    y: dy,
    scale: targetScale,
    rotation,
    duration: 0.22, // 220ms snappy travel
    ease: 'power2.out',
    onComplete: () => {
      activeFlyingCardIds.delete(cardId);
      overlay.remove();
      if (onComplete) onComplete();
    },
  });

  return true;
}
