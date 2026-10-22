import { describe, it, expect } from 'vitest';
import { generateUnoFlipDeck } from '../deck';
import {
  calculateNextSeat,
  drawFromPile,
  drawUntilColor,
  isValidPlay,
  processCardPlay,
} from '../engine';
import { GamePlayer, GameRoom, UnoFlipCard } from '../types';

describe('UNO FLIP Deck Generation', () => {
  it('should generate an exact 112-card deck', () => {
    const deck = generateUnoFlipDeck();
    expect(deck).toHaveLength(112);
  });

  it('should generate 72 number cards with values 1-9', () => {
    const deck = generateUnoFlipDeck();
    const numbers = deck.filter((c) => c.light.type === 'number');
    expect(numbers).toHaveLength(72);
    numbers.forEach((c) => {
      expect(c.light.value).toBeGreaterThanOrEqual(1);
      expect(c.light.value).toBeLessThanOrEqual(9);
      expect(c.dark.type).toBe('number');
      expect(c.dark.value).toBe(c.light.value);
    });
  });

  it('should have 8 of each action card on light and paired dark sides', () => {
    const deck = generateUnoFlipDeck();
    expect(deck.filter((c) => c.light.type === 'draw_one')).toHaveLength(8);
    expect(deck.filter((c) => c.dark.type === 'draw_five')).toHaveLength(8);

    expect(deck.filter((c) => c.light.type === 'reverse')).toHaveLength(8);
    expect(deck.filter((c) => c.dark.type === 'reverse')).toHaveLength(8);

    expect(deck.filter((c) => c.light.type === 'skip')).toHaveLength(8);
    expect(deck.filter((c) => c.dark.type === 'skip_everyone')).toHaveLength(8);

    expect(deck.filter((c) => c.light.type === 'flip')).toHaveLength(8);
    expect(deck.filter((c) => c.dark.type === 'flip')).toHaveLength(8);
  });

  it('should have 4 Wild and 4 Wild Draw action cards', () => {
    const deck = generateUnoFlipDeck();
    expect(deck.filter((c) => c.light.type === 'wild')).toHaveLength(4);
    expect(deck.filter((c) => c.dark.type === 'wild')).toHaveLength(4);

    expect(deck.filter((c) => c.light.type === 'wild_draw_two')).toHaveLength(4);
    expect(deck.filter((c) => c.dark.type === 'wild_draw_color')).toHaveLength(4);
  });
});

describe('Card Play Validation', () => {
  const blue5: UnoFlipCard = {
    id: '1',
    light: { color: 'blue', type: 'number', value: 5 },
    dark: { color: 'purple', type: 'number', value: 5 },
  };

  const blue7: UnoFlipCard = {
    id: '2',
    light: { color: 'blue', type: 'number', value: 7 },
    dark: { color: 'purple', type: 'number', value: 7 },
  };

  const red5: UnoFlipCard = {
    id: '3',
    light: { color: 'red', type: 'number', value: 5 },
    dark: { color: 'pink', type: 'number', value: 5 },
  };

  const green9: UnoFlipCard = {
    id: '4',
    light: { color: 'green', type: 'number', value: 9 },
    dark: { color: 'orange', type: 'number', value: 9 },
  };

  const wildCard: UnoFlipCard = {
    id: '5',
    light: { color: 'wild', type: 'wild' },
    dark: { color: 'wild', type: 'wild' },
  };

  it('allows same color card', () => {
    expect(isValidPlay(blue7, blue5, 'light', 'blue')).toBe(true);
  });

  it('allows same number card with different color', () => {
    expect(isValidPlay(red5, blue5, 'light', 'blue')).toBe(true);
  });

  it('disallows different color and number', () => {
    expect(isValidPlay(green9, blue5, 'light', 'blue')).toBe(false);
  });

  it('allows wild card regardless of top card', () => {
    expect(isValidPlay(wildCard, blue5, 'light', 'blue')).toBe(true);
  });

  it('respects active chosen color for dark side', () => {
    // On dark side, blue5 is purple 5
    const pink7: UnoFlipCard = {
      id: '6',
      light: { color: 'red', type: 'number', value: 7 },
      dark: { color: 'pink', type: 'number', value: 7 },
    };
    expect(isValidPlay(pink7, blue5, 'dark', 'pink')).toBe(true);
    expect(isValidPlay(pink7, blue5, 'dark', 'teal')).toBe(false);
  });
});

describe('Turn Advancement & Action Effects', () => {
  const dummyPlayers: GamePlayer[] = [
    {
      id: 'p1',
      room_id: 'r1',
      profile_id: 'prof-1',
      seat_index: 0,
      is_ready: true,
      is_host: true,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'prof-1', nickname: 'Alice', avatar_color: '#EF4444' },
    },
    {
      id: 'p2',
      room_id: 'r1',
      profile_id: 'prof-2',
      seat_index: 1,
      is_ready: true,
      is_host: false,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'prof-2', nickname: 'Bob', avatar_color: '#3B82F6' },
    },
    {
      id: 'p3',
      room_id: 'r1',
      profile_id: 'prof-3',
      seat_index: 2,
      is_ready: true,
      is_host: false,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'prof-3', nickname: 'Charlie', avatar_color: '#10B981' },
    },
  ];

  const baseRoom: GameRoom = {
    id: 'r1',
    code: 'ROOM01',
    host_id: 'prof-1',
    status: 'playing',
    max_players: 4,
    current_side: 'light',
    active_color: 'blue',
    current_turn_seat: 0,
    direction: 1,
    top_card: {
      id: 'top',
      light: { color: 'blue', type: 'number', value: 1 },
      dark: { color: 'purple', type: 'number', value: 1 },
    },
    draw_pile_count: 50,
    draw_penalty: 0,
    winner_id: null,
    uno_called_by: [],
    pending_color_selection: false,
    last_action: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('calculates seats correctly in clockwise and counter-clockwise directions', () => {
    expect(calculateNextSeat(0, 3, 1, 1)).toBe(1);
    expect(calculateNextSeat(1, 3, 1, 1)).toBe(2);
    expect(calculateNextSeat(2, 3, 1, 1)).toBe(0);

    expect(calculateNextSeat(0, 3, -1, 1)).toBe(2);
    expect(calculateNextSeat(2, 3, -1, 1)).toBe(1);
  });

  it('processes Skip card by skipping the next seat', () => {
    const skipCard: UnoFlipCard = {
      id: 'skip-1',
      light: { color: 'blue', type: 'skip' },
      dark: { color: 'purple', type: 'skip_everyone' },
    };

    const res = processCardPlay({
      room: baseRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: skipCard,
      drawPile: [],
      discardPile: [],
      calledUno: false,
    });

    // Skips Bob (seat 1) -> Charlie (seat 2)
    expect(res.updatedRoom.current_turn_seat).toBe(2);
  });

  it('processes Skip Everyone (Dark Side) by keeping the turn on the same player', () => {
    const darkRoom: GameRoom = {
      ...baseRoom,
      current_side: 'dark',
      active_color: 'purple',
    };
    const skipEveryoneCard: UnoFlipCard = {
      id: 'skip-ev',
      light: { color: 'blue', type: 'skip' },
      dark: { color: 'purple', type: 'skip_everyone' },
    };

    const res = processCardPlay({
      room: darkRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: skipEveryoneCard,
      drawPile: [],
      discardPile: [],
      calledUno: false,
    });

    // Player 0 gets to play again!
    expect(res.updatedRoom.current_turn_seat).toBe(0);
  });

  it('processes Reverse correctly: reverses direction in 3+ player games', () => {
    const revCard: UnoFlipCard = {
      id: 'rev-1',
      light: { color: 'blue', type: 'reverse' },
      dark: { color: 'purple', type: 'reverse' },
    };

    const res = processCardPlay({
      room: baseRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: revCard,
      drawPile: [],
      discardPile: [],
      calledUno: false,
    });

    expect(res.updatedRoom.direction).toBe(-1);
    expect(res.updatedRoom.current_turn_seat).toBe(2);
  });

  it('processes Reverse as Skip in 2-player games', () => {
    const twoPlayers = dummyPlayers.slice(0, 2);
    const revCard: UnoFlipCard = {
      id: 'rev-1',
      light: { color: 'blue', type: 'reverse' },
      dark: { color: 'purple', type: 'reverse' },
    };

    const res = processCardPlay({
      room: baseRoom,
      player: twoPlayers[0],
      players: twoPlayers,
      card: revCard,
      drawPile: [],
      discardPile: [],
      calledUno: false,
    });

    // In 2 players, skipping player 1 lands back on player 0
    expect(res.updatedRoom.current_turn_seat).toBe(0);
  });

  it('processes Draw One: initiates +1 penalty stack and passes turn to next player', () => {
    const drawOneCard: UnoFlipCard = {
      id: 'd1',
      light: { color: 'blue', type: 'draw_one' },
      dark: { color: 'purple', type: 'draw_five' },
    };

    const sampleDrawPile: UnoFlipCard[] = [
      {
        id: 'pile1',
        light: { color: 'red', type: 'number', value: 3 },
        dark: { color: 'pink', type: 'number', value: 3 },
      },
    ];

    const res = processCardPlay({
      room: baseRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: drawOneCard,
      drawPile: sampleDrawPile,
      discardPile: [],
      calledUno: false,
    });

    expect(res.penaltyDrawnCards).toHaveLength(0);
    expect(res.updatedRoom.draw_penalty).toBe(1);
    expect(res.updatedRoom.current_turn_seat).toBe(1); // Next player (Bob) gets turn to stack or draw
  });

  it('processes Flip card: toggles side from light to dark', () => {
    const flipCard: UnoFlipCard = {
      id: 'flip-1',
      light: { color: 'blue', type: 'flip' },
      dark: { color: 'purple', type: 'flip' },
    };

    const res = processCardPlay({
      room: baseRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: flipCard,
      drawPile: [],
      discardPile: [],
      calledUno: false,
    });

    expect(res.updatedRoom.current_side).toBe('dark');
    expect(res.updatedRoom.active_color).toBe('purple');
    expect(res.updatedRoom.current_turn_seat).toBe(1);
  });

  it('drawUntilColor continues drawing until matching Dark color card is found', () => {
    const pile: UnoFlipCard[] = [
      {
        id: 'c1',
        light: { color: 'blue', type: 'number', value: 1 },
        dark: { color: 'teal', type: 'number', value: 1 },
      },
      {
        id: 'c2',
        light: { color: 'green', type: 'number', value: 2 },
        dark: { color: 'pink', type: 'number', value: 2 },
      },
      {
        id: 'c3',
        light: { color: 'red', type: 'number', value: 3 },
        dark: { color: 'orange', type: 'number', value: 3 },
      },
    ];

    // Target is 'teal' (which is c1 at the bottom of the stack, popped last)
    const result = drawUntilColor(pile, [], 'teal');
    expect(result.drawn).toHaveLength(3);
    expect(result.drawn[result.drawn.length - 1].dark.color).toBe('teal');
  });

  it('reshuffles discard pile when draw pile is empty', () => {
    const discard: UnoFlipCard[] = [
      { id: 'd1', light: { color: 'blue', type: 'number', value: 1 }, dark: { color: 'purple', type: 'number', value: 1 } },
      { id: 'd2', light: { color: 'red', type: 'number', value: 2 }, dark: { color: 'pink', type: 'number', value: 2 } },
      { id: 'd3', light: { color: 'green', type: 'number', value: 3 }, dark: { color: 'orange', type: 'number', value: 3 } }, // top of discard
    ];

    const result = drawFromPile([], discard, 2);
    expect(result.drawn).toHaveLength(2);
    expect(result.newDiscardPile).toHaveLength(1);
    expect(result.newDiscardPile[0].id).toBe('d3'); // top card remains!
  });
});
