import {
  DarkColor,
  DarkCardType,
  LightColor,
  LightCardType,
  UnoFlipCard,
} from './types';

export const LIGHT_COLORS: LightColor[] = ['red', 'yellow', 'green', 'blue'];
export const DARK_COLORS: DarkColor[] = ['pink', 'teal', 'orange', 'purple'];

const COLOR_PAIRS: Record<LightColor, DarkColor> = {
  red: 'pink',
  yellow: 'teal',
  green: 'orange',
  blue: 'purple',
};

/**
 * Generates the complete, canonical 112-card double-sided deck for UNO FLIP.
 */
export function generateUnoFlipDeck(): UnoFlipCard[] {
  const deck: UnoFlipCard[] = [];
  let cardIndex = 1;

  const getNextId = () => `c-${String(cardIndex++).padStart(3, '0')}`;

  // 1. Color-specific cards for each of the 4 color pairs
  for (const lightColor of LIGHT_COLORS) {
    const darkColor = COLOR_PAIRS[lightColor];

    // Numbers 1 to 9 (two of each number)
    for (let num = 1; num <= 9; num++) {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({
          id: getNextId(),
          light: { color: lightColor, type: 'number', value: num },
          dark: { color: darkColor, type: 'number', value: num },
        });
      }
    }

    // Draw One (+1) on Light <-> Draw Five (+5) on Dark (2 copies)
    for (let copy = 0; copy < 2; copy++) {
      deck.push({
        id: getNextId(),
        light: { color: lightColor, type: 'draw_one' },
        dark: { color: darkColor, type: 'draw_five' },
      });
    }

    // Reverse on Light <-> Reverse on Dark (2 copies)
    for (let copy = 0; copy < 2; copy++) {
      deck.push({
        id: getNextId(),
        light: { color: lightColor, type: 'reverse' },
        dark: { color: darkColor, type: 'reverse' },
      });
    }

    // Skip on Light <-> Skip Everyone on Dark (2 copies)
    for (let copy = 0; copy < 2; copy++) {
      deck.push({
        id: getNextId(),
        light: { color: lightColor, type: 'skip' },
        dark: { color: darkColor, type: 'skip_everyone' },
      });
    }

    // Flip on Light <-> Flip on Dark (2 copies)
    for (let copy = 0; copy < 2; copy++) {
      deck.push({
        id: getNextId(),
        light: { color: lightColor, type: 'flip' },
        dark: { color: darkColor, type: 'flip' },
      });
    }
  }

  // 2. Wild cards (8 total)
  // 4 standard Wild cards (Light Wild <-> Dark Wild)
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: getNextId(),
      light: { color: 'wild', type: 'wild' },
      dark: { color: 'wild', type: 'wild' },
    });
  }

  // 4 penalty Wild cards:
  // Light Wild Draw Two (+2) <-> Dark Wild Draw Color
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: getNextId(),
      light: { color: 'wild', type: 'wild_draw_two' },
      dark: { color: 'wild', type: 'wild_draw_color' },
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
