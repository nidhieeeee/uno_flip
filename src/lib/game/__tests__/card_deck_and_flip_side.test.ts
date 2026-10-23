import { describe, it, expect } from 'vitest';
import {
  DARK_COLORS,
  LIGHT_COLORS,
  drawValidStartingCard,
  generateUnoFlipDeck,
  shuffleDeck,
} from '../deck';
import {
  getCardPenaltyValue,
  isValidPlay,
  processCardPlay,
} from '../engine';
import { GamePlayer, GameRoom, UnoFlipCard } from '../types';

describe('UNO FLIP Canonical Deck Composition & Integrity', () => {
  it('generates an exact 112-card deck with stable unique IDs', () => {
    const deck = generateUnoFlipDeck();
    expect(deck).toHaveLength(112);

    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(112);

    // Every card must have a valid c-XXX id format
    deck.forEach((card, index) => {
      const expectedId = `c-${String(index + 1).padStart(3, '0')}`;
      expect(card.id).toBe(expectedId);
    });
  });

  it('guarantees both faces exist on every card and are distinct', () => {
    const deck = generateUnoFlipDeck();

    deck.forEach((card) => {
      expect(card.light).toBeDefined();
      expect(card.dark).toBeDefined();

      expect(card.light.type).toBeDefined();
      expect(card.dark.type).toBeDefined();
      expect(card.light.color).toBeDefined();
      expect(card.dark.color).toBeDefined();

      // If both faces are number cards, their values must NEVER be the same
      if (card.light.type === 'number' && card.dark.type === 'number') {
        expect(card.light.value).not.toBe(card.dark.value);
        expect(card.light.value).toBeGreaterThanOrEqual(1);
        expect(card.light.value).toBeLessThanOrEqual(9);
        expect(card.dark.value).toBeGreaterThanOrEqual(1);
        expect(card.dark.value).toBeLessThanOrEqual(9);
      }
    });
  });

  it('has exact official Light Side distribution (112 faces)', () => {
    const deck = generateUnoFlipDeck();

    // 72 number cards (18 per color: 1-9, two each)
    const lightNumbers = deck.filter((c) => c.light.type === 'number');
    expect(lightNumbers).toHaveLength(72);

    for (const color of LIGHT_COLORS) {
      const colorNumbers = lightNumbers.filter((c) => c.light.color === color);
      expect(colorNumbers).toHaveLength(18);

      for (let num = 1; num <= 9; num++) {
        const count = colorNumbers.filter((c) => c.light.value === num).length;
        expect(count).toBe(2);
      }
    }

    // 32 colored action cards (8 of each type, 2 per color)
    for (const action of ['draw_one', 'reverse', 'skip', 'flip'] as const) {
      const actions = deck.filter((c) => c.light.type === action);
      expect(actions).toHaveLength(8);

      for (const color of LIGHT_COLORS) {
        const colorActions = actions.filter((c) => c.light.color === color);
        expect(colorActions).toHaveLength(2);
      }
    }

    // 8 Wild cards on Light Side
    expect(deck.filter((c) => c.light.type === 'wild')).toHaveLength(4);
    expect(deck.filter((c) => c.light.type === 'wild_draw_two')).toHaveLength(4);
  });

  it('has exact official Dark Side distribution (112 faces)', () => {
    const deck = generateUnoFlipDeck();

    // 72 number cards (18 per color: 1-9, two each)
    const darkNumbers = deck.filter((c) => c.dark.type === 'number');
    expect(darkNumbers).toHaveLength(72);

    for (const color of DARK_COLORS) {
      const colorNumbers = darkNumbers.filter((c) => c.dark.color === color);
      expect(colorNumbers).toHaveLength(18);

      for (let num = 1; num <= 9; num++) {
        const count = colorNumbers.filter((c) => c.dark.value === num).length;
        expect(count).toBe(2);
      }
    }

    // 32 colored action cards (8 of each type, 2 per color)
    for (const action of ['draw_five', 'reverse', 'skip_everyone', 'flip'] as const) {
      const actions = deck.filter((c) => c.dark.type === action);
      expect(actions).toHaveLength(8);

      for (const color of DARK_COLORS) {
        const colorActions = actions.filter((c) => c.dark.color === color);
        expect(colorActions).toHaveLength(2);
      }
    }

    // 8 Wild cards on Dark Side
    expect(deck.filter((c) => c.dark.type === 'wild')).toHaveLength(4);
    expect(deck.filter((c) => c.dark.type === 'wild_draw_five')).toHaveLength(4);
  });

  it('generates consistent card identity across multiple generator calls without random mutation', () => {
    const deckA = generateUnoFlipDeck();
    const deckB = generateUnoFlipDeck();

    expect(deckA).toHaveLength(112);
    expect(deckB).toHaveLength(112);

    for (let i = 0; i < 112; i++) {
      expect(deckA[i].id).toBe(deckB[i].id);
      expect(deckA[i].light).toEqual(deckB[i].light);
      expect(deckA[i].dark).toEqual(deckB[i].dark);
    }
  });
});

describe('Randomized Deck Shuffling & Fair Play', () => {
  it('shuffleDeck creates a fair permutation without duplicating or losing cards', () => {
    const originalDeck = generateUnoFlipDeck();
    const shuffled = shuffleDeck(originalDeck);

    expect(shuffled).toHaveLength(112);
    const shuffledIds = new Set(shuffled.map((c) => c.id));
    expect(shuffledIds.size).toBe(112);

    // Each card maintains its light and dark faces intact
    shuffled.forEach((card) => {
      const original = originalDeck.find((c) => c.id === card.id);
      expect(original).toBeDefined();
      expect(card.light).toEqual(original!.light);
      expect(card.dark).toEqual(original!.dark);
    });
  });

  it('produces non-identical deck orders across separate games/shuffles', () => {
    const deck = generateUnoFlipDeck();
    const shuffle1 = shuffleDeck(deck);
    const shuffle2 = shuffleDeck(deck);

    // The likelihood of two 112-card Fisher-Yates shuffles matching is 1/(112!) ≈ 0
    const areIdentical = shuffle1.every((card, i) => card.id === shuffle2[i].id);
    expect(areIdentical).toBe(false);
  });

  it('drawValidStartingCard reliably selects a non-wild Light number card', () => {
    const shuffled = shuffleDeck(generateUnoFlipDeck());
    const { startingCard, remainingPile } = drawValidStartingCard(shuffled);

    expect(remainingPile).toHaveLength(111);
    expect(startingCard.light.type).toBe('number');
    expect(startingCard.light.color).not.toBe('wild');
    expect(startingCard.light.value).toBeGreaterThanOrEqual(1);
    expect(startingCard.light.value).toBeLessThanOrEqual(9);
  });
});

describe('Flip Card & Side Transition Game Engine Logic', () => {
  const dummyPlayers: GamePlayer[] = [
    {
      id: 'p1',
      room_id: 'r1',
      profile_id: 'player-1',
      seat_index: 0,
      is_ready: true,
      is_host: true,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'player-1', nickname: 'Alice', avatar_color: '#EF4444' },
    },
    {
      id: 'p2',
      room_id: 'r1',
      profile_id: 'player-2',
      seat_index: 1,
      is_ready: true,
      is_host: false,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'player-2', nickname: 'Bob', avatar_color: '#3B82F6' },
    },
  ];

  const baseLightRoom: GameRoom = {
    id: 'r1',
    code: 'ROOM01',
    host_id: 'player-1',
    status: 'playing',
    max_players: 2,
    current_side: 'light',
    active_color: 'blue',
    current_turn_seat: 0,
    direction: 1,
    top_card: {
      id: 'c-top',
      light: { color: 'blue', type: 'number', value: 3 },
      dark: { color: 'teal', type: 'number', value: 7 },
    },
    draw_pile_count: 80,
    draw_penalty: 0,
    winner_id: null,
    uno_called_by: [],
    pending_color_selection: false,
    last_action: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('switches current_side globally from light to dark when a Light Flip card is played', () => {
    const flipCard: UnoFlipCard = {
      id: 'c-flip-1',
      light: { color: 'blue', type: 'flip' },
      dark: { color: 'orange', type: 'flip' },
    };

    const res = processCardPlay({
      room: baseLightRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: flipCard,
      drawPile: [],
      discardPile: [],
      calledUno: false,
    });

    expect(res.updatedRoom.current_side).toBe('dark');
    expect(res.updatedRoom.active_color).toBe('orange'); // Uses the dark face color of the played flip card
    expect(res.updatedRoom.top_card?.id).toBe('c-flip-1');
    expect(res.actionLog.type).toBe('flip');
    expect(res.actionLog.side).toBe('dark');
  });

  it('switches current_side globally from dark to light when a Dark Flip card is played', () => {
    const baseDarkRoom: GameRoom = {
      ...baseLightRoom,
      current_side: 'dark',
      active_color: 'orange',
      top_card: {
        id: 'c-top-dark',
        light: { color: 'green', type: 'number', value: 2 },
        dark: { color: 'orange', type: 'number', value: 8 },
      },
    };

    const flipCard: UnoFlipCard = {
      id: 'c-flip-2',
      light: { color: 'green', type: 'flip' },
      dark: { color: 'orange', type: 'flip' },
    };

    const res = processCardPlay({
      room: baseDarkRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: flipCard,
      drawPile: [],
      discardPile: [],
      calledUno: false,
    });

    expect(res.updatedRoom.current_side).toBe('light');
    expect(res.updatedRoom.active_color).toBe('green'); // Uses the light face color of the played flip card
    expect(res.updatedRoom.top_card?.id).toBe('c-flip-2');
    expect(res.actionLog.type).toBe('flip');
    expect(res.actionLog.side).toBe('light');
  });

  it('correctly evaluates card playability on the active side', () => {
    // Physical card c-01: Light is Red 5, Dark is Teal 9
    const cardA: UnoFlipCard = {
      id: 'c-01',
      light: { color: 'red', type: 'number', value: 5 },
      dark: { color: 'teal', type: 'number', value: 9 },
    };

    // Physical card c-02: Light is Blue 5, Dark is Orange 2
    const cardB: UnoFlipCard = {
      id: 'c-02',
      light: { color: 'blue', type: 'number', value: 5 },
      dark: { color: 'orange', type: 'number', value: 2 },
    };

    // On Light Side:
    // cardA (Red 5) can be played on cardB (Blue 5) because values match (5 === 5)
    expect(isValidPlay(cardA, cardB, 'light', 'blue')).toBe(true);

    // On Dark Side:
    // cardA is now Teal 9, cardB is now Orange 2.
    // They do NOT match color (teal !== orange) and do NOT match value (9 !== 2).
    expect(isValidPlay(cardA, cardB, 'dark', 'orange')).toBe(false);

    // If active color on dark side was chosen as 'teal', cardA is now playable!
    expect(isValidPlay(cardA, cardB, 'dark', 'teal')).toBe(true);
  });

  it('applies correct side-specific penalty rules (Draw One on Light vs Draw Five on Dark)', () => {
    const drawCard: UnoFlipCard = {
      id: 'c-draw',
      light: { color: 'red', type: 'draw_one' },
      dark: { color: 'pink', type: 'draw_five' },
    };

    // On Light Side, penalty is 1
    expect(getCardPenaltyValue(drawCard, 'light')).toBe(1);

    // On Dark Side, penalty is 5
    expect(getCardPenaltyValue(drawCard, 'dark')).toBe(5);
  });

  it('keeps both faces intact when switching hands or dealing', () => {
    const deck = generateUnoFlipDeck();
    const handAlice = deck.slice(0, 7);

    // Alice looks at light faces initially
    const aliceLightFaces = handAlice.map((c) => c.light);
    expect(aliceLightFaces).toHaveLength(7);

    // Global side switches to dark: Alice immediately sees dark faces for the exact same cards
    const aliceDarkFaces = handAlice.map((c) => c.dark);
    expect(aliceDarkFaces).toHaveLength(7);

    // Every card in hand has distinct faces and retains identical ID
    handAlice.forEach((c) => {
      expect(c.id).toBeDefined();
      if (c.light.type === 'number' && c.dark.type === 'number') {
        expect(c.light.value).not.toBe(c.dark.value);
      }
    });
  });
});
