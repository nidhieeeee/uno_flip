import {
  DarkColor,
  LightColor,
  UnoFlipCard,
} from './types';

export const LIGHT_COLORS: LightColor[] = ['red', 'yellow', 'green', 'blue'];
export const DARK_COLORS: DarkColor[] = ['pink', 'teal', 'orange', 'purple'];

/**
 * Generates the complete, canonical 112-card double-sided deck for UNO FLIP.
 * 
 * Composition:
 * Light Side:
 * - 72 Number cards (1-9, two of each in Red, Yellow, Green, Blue)
 * - 8 Draw One (+1) cards (two of each in Red, Yellow, Green, Blue)
 * - 8 Reverse cards (two of each in Red, Yellow, Green, Blue)
 * - 8 Skip cards (two of each in Red, Yellow, Green, Blue)
 * - 8 Flip cards (two of each in Red, Yellow, Green, Blue)
 * - 4 Wild cards
 * - 4 Wild Draw Two (+2) cards
 * Total: 112 cards
 * 
 * Dark Side:
 * - 72 Number cards (1-9, two of each in Pink, Teal, Orange, Purple)
 * - 8 Draw Five (+5) cards (two of each in Pink, Teal, Orange, Purple)
 * - 8 Reverse cards (two of each in Pink, Teal, Orange, Purple)
 * - 8 Skip Everyone cards (two of each in Pink, Teal, Orange, Purple)
 * - 8 Flip cards (two of each in Pink, Teal, Orange, Purple)
 * - 4 Wild cards
 * - 4 Wild Draw Color cards
 * Total: 112 cards
 * 
 * Each physical card has a stable unique ID (`c-001` through `c-112`) and two distinct faces.
 * The two faces do not reuse the same number with a different color (light.value !== dark.value).
 */
export function generateUnoFlipDeck(): UnoFlipCard[] {
  const deck: UnoFlipCard[] = [];
  let cardIndex = 1;

  const getNextId = () => `c-${String(cardIndex++).padStart(3, '0')}`;

  // 1. 72 Number cards (1 to 9, two copies per color)
  // Each physical number card has two distinct faces where light.value !== dark.value.
  // The numbers and colors are varied systematically so that:
  // - No card reuses the same number on its two faces (light.value !== dark.value for all 72 cards).
  // - Every dark color receives exactly two of each number 1 to 9 (18 number cards per color = 72 dark number faces).
  // - Colors are distributed across all pairs (e.g. Red is paired with Teal and Orange; Yellow with Orange and Purple; etc.).
  for (let c = 0; c < LIGHT_COLORS.length; c++) {
    const lightColor = LIGHT_COLORS[c];

    for (let num = 1; num <= 9; num++) {
      for (let copy = 0; copy < 2; copy++) {
        // copy 0 offsets by +4 (mod 9), copy 1 offsets by +5 (mod 9). Neither offset is 0 mod 9, so light.value !== dark.value.
        const numOffset = copy === 0 ? 4 : 5;
        const darkNum = ((num - 1 + numOffset) % 9) + 1;
        const darkColorIndex = (c + (copy === 0 ? 1 : 2)) % DARK_COLORS.length;
        const darkColor = DARK_COLORS[darkColorIndex];

        deck.push({
          id: getNextId(),
          light: { color: lightColor, type: 'number', value: num },
          dark: { color: darkColor, type: 'number', value: darkNum },
        });
      }
    }
  }

  // 2. Action cards (32 cards total)
  // Light Side: Draw One (8), Reverse (8), Skip (8), Flip (8)
  // Dark Side:  Draw Five (8), Reverse (8), Skip Everyone (8), Flip (8)
  // Distributed 2 copies per color across both sides with distinct cross-color pairings.
  for (let c = 0; c < LIGHT_COLORS.length; c++) {
    const lightColor = LIGHT_COLORS[c];

    // Draw One (+1 on Light) <-> Draw Five (+5 on Dark)
    for (let copy = 0; copy < 2; copy++) {
      const darkColor = DARK_COLORS[(c + (copy === 0 ? 3 : 1)) % DARK_COLORS.length];
      deck.push({
        id: getNextId(),
        light: { color: lightColor, type: 'draw_one' },
        dark: { color: darkColor, type: 'draw_five' },
      });
    }

    // Reverse on Light <-> Reverse on Dark
    for (let copy = 0; copy < 2; copy++) {
      const darkColor = DARK_COLORS[(c + (copy === 0 ? 2 : 3)) % DARK_COLORS.length];
      deck.push({
        id: getNextId(),
        light: { color: lightColor, type: 'reverse' },
        dark: { color: darkColor, type: 'reverse' },
      });
    }

    // Skip on Light <-> Skip Everyone on Dark
    for (let copy = 0; copy < 2; copy++) {
      const darkColor = DARK_COLORS[(c + (copy === 0 ? 1 : 2)) % DARK_COLORS.length];
      deck.push({
        id: getNextId(),
        light: { color: lightColor, type: 'skip' },
        dark: { color: darkColor, type: 'skip_everyone' },
      });
    }

    // Flip on Light <-> Flip on Dark
    for (let copy = 0; copy < 2; copy++) {
      const darkColor = DARK_COLORS[(c + (copy === 0 ? 2 : 3)) % DARK_COLORS.length];
      deck.push({
        id: getNextId(),
        light: { color: lightColor, type: 'flip' },
        dark: { color: darkColor, type: 'flip' },
      });
    }
  }

  // 3. Wild cards (8 total)
  // 4 standard Wild cards (Light Wild <-> Dark Wild)
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: getNextId(),
      light: { color: 'wild', type: 'wild' },
      dark: { color: 'wild', type: 'wild' },
    });
  }

  // 4 penalty Wild cards:
  // Light Wild Draw Two (+2) <-> Dark Wild Draw Five (+5)
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: getNextId(),
      light: { color: 'wild', type: 'wild_draw_two' },
      dark: { color: 'wild', type: 'wild_draw_five' },
    });
  }

  return deck;
}

/**
 * Fisher-Yates shuffle algorithm for cryptographically sound or unbiased randomization.
 */
export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Selects an initial valid starting discard card from a shuffled draw pile.
 * In UNO FLIP, the starting card must be a number card (or non-wild action card, but starting
 * with a number card provides the smoothest and most balanced game start).
 */
export function drawValidStartingCard(pile: UnoFlipCard[]): {
  startingCard: UnoFlipCard;
  remainingPile: UnoFlipCard[];
} {
  const remaining = [...pile];
  const index = remaining.findIndex(
    (c) => c.light.type === 'number' && c.light.color !== 'wild'
  );

  if (index === -1) {
    // Fallback if none found
    const startingCard = remaining.pop()!;
    return { startingCard, remainingPile: remaining };
  }

  const [startingCard] = remaining.splice(index, 1);
  return { startingCard, remainingPile: remaining };
}
