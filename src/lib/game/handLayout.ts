/**
 * Pure layout calculation utility for responsive, non-overflowing player hands in UNO FLIP.
 * Dynamically computes card dimensions and overlapping steps based on card count and available container width.
 */

export interface HandLayoutResult {
  cardWidth: number;
  cardHeight: number;
  step: number; // horizontal distance from one card's left to the next card's left
  overlap: number; // positive if overlapping (cardWidth - step)
  totalWidth: number;
  gap: number; // positive if cards have spacing between them
}

export function computeHandLayout(
  cardCount: number,
  containerWidth: number,
  isMobile = false
): HandLayoutResult {
  if (cardCount <= 0) {
    const cardWidth = isMobile ? 84 : 112;
    return {
      cardWidth,
      cardHeight: Math.round(cardWidth * 1.42),
      step: 0,
      overlap: 0,
      totalWidth: 0,
      gap: 0,
    };
  }

  // Padding inside container to prevent edge touching
  const horizontalPadding = isMobile ? Math.min(16, Math.max(8, containerWidth * 0.04)) : 32;
  const availableWidth = Math.min(containerWidth, Math.max(260, containerWidth - horizontalPadding));

  // Maximum and minimum card dimensions
  const maxCardWidth = isMobile ? 84 : 112;
  const minCardWidth = isMobile ? 44 : 56;
  const aspectRatio = 1.42;

  // Single card
  if (cardCount === 1) {
    const cardWidth = Math.min(maxCardWidth, availableWidth);
    const cardHeight = Math.round(cardWidth * aspectRatio);
    return {
      cardWidth,
      cardHeight,
      step: cardWidth,
      overlap: 0,
      totalWidth: cardWidth,
      gap: 0,
    };
  }

  // Two cards: display them large and clearly with comfortable spacing
  if (cardCount === 2) {
    let cardWidth = maxCardWidth;
    let comfortableGap = isMobile ? 12 : 18;
    if (2 * cardWidth + comfortableGap > availableWidth) {
      comfortableGap = isMobile ? 8 : 10;
      cardWidth = Math.min(maxCardWidth, Math.floor((availableWidth - comfortableGap) / 2));
    }
    const cardHeight = Math.round(cardWidth * aspectRatio);
    const totalWidth = 2 * cardWidth + comfortableGap;
    return {
      cardWidth,
      cardHeight,
      step: cardWidth + comfortableGap,
      overlap: 0,
      totalWidth,
      gap: comfortableGap,
    };
  }

  // Hand with 3 or more cards:
  // As card count grows, interpolate card size down between max and min card width
  // Range from 3 cards to 12 cards scales from max down to min width
  const countFactor = Math.min(1, Math.max(0, (cardCount - 3) / 9));
  let cardWidth = Math.round(maxCardWidth - countFactor * (maxCardWidth - minCardWidth));

  // Determine ideal spacing without overlap if it fits
  const idealGap = isMobile ? 8 : 12;
  const totalIfIdeal = cardCount * cardWidth + (cardCount - 1) * idealGap;

  if (totalIfIdeal <= availableWidth) {
    // Fits with ideal spacing!
    const cardHeight = Math.round(cardWidth * aspectRatio);
    return {
      cardWidth,
      cardHeight,
      step: cardWidth + idealGap,
      overlap: 0,
      totalWidth: totalIfIdeal,
      gap: idealGap,
    };
  }

  // Check if fits touching (gap = 0, no overlap)
  if (cardCount * cardWidth <= availableWidth) {
    const gap = Math.max(0, Math.floor((availableWidth - cardCount * cardWidth) / (cardCount - 1)));
    const actualGap = Math.min(gap, idealGap);
    const cardHeight = Math.round(cardWidth * aspectRatio);
    const step = cardWidth + actualGap;
    return {
      cardWidth,
      cardHeight,
      step,
      overlap: 0,
      totalWidth: cardWidth + (cardCount - 1) * step,
      gap: actualGap,
    };
  }

  // Overlap is required.
  // Calculate needed step so that cardWidth + (cardCount - 1) * step <= availableWidth
  let step = (availableWidth - cardWidth) / (cardCount - 1);
  const minStep = isMobile ? 16 : 22; // Ensures corner symbol (+1, +2, +5, color, number) remains visible

  // If step is less than minStep, reduce cardWidth further down to minCardWidth
  if (step < minStep && cardWidth > minCardWidth) {
    cardWidth = minCardWidth;
    step = Math.max(minStep * 0.85, (availableWidth - cardWidth) / (cardCount - 1));
  }

  // Cap step to cardWidth (step cannot exceed card width when overlapping)
  step = Math.min(cardWidth, step);
  const cardHeight = Math.round(cardWidth * aspectRatio);
  const overlap = Math.max(0, cardWidth - step);
  const totalWidth = Math.min(availableWidth, Math.round(cardWidth + (cardCount - 1) * step));

  return {
    cardWidth,
    cardHeight,
    step: Math.round(step * 10) / 10,
    overlap: Math.round(overlap * 10) / 10,
    totalWidth,
    gap: 0,
  };
}
