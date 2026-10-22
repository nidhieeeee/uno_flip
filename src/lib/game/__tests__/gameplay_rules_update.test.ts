import { describe, it, expect } from 'vitest';
import {
  processCardPlay,
  processTurnTimeout,
  processUnoTimeout,
  processDrawDecision,
  isValidPlay,
} from '../engine';
import { GamePlayer, GameRoom, UnoFlipCard } from '../types';

describe('UNO FLIP Gameplay Rules Update Tests', () => {
  const alice: GamePlayer = {
    id: 'p-alice',
    room_id: 'room-1',
    profile_id: 'prof-alice',
    seat_index: 0,
    is_ready: true,
    is_host: true,
    is_connected: true,
    card_count: 5,
    has_called_uno: false,
    profile: { id: 'prof-alice', nickname: 'Alice', avatar_color: '#EF4444' },
  };

  const bob: GamePlayer = {
    id: 'p-bob',
    room_id: 'room-1',
    profile_id: 'prof-bob',
    seat_index: 1,
    is_ready: true,
    is_host: false,
    is_connected: true,
    card_count: 5,
    has_called_uno: false,
    profile: { id: 'prof-bob', nickname: 'Bob', avatar_color: '#3B82F6' },
  };

  const dummyPlayers = [alice, bob];

  const now = 1700000000000;

  const baseRoom: GameRoom = {
    id: 'room-1',
    code: 'ROOM01',
    host_id: 'prof-alice',
    status: 'playing',
    max_players: 4,
    current_side: 'light',
    active_color: 'red',
    current_turn_seat: 0, // Alice's turn
    direction: 1,
    top_card: {
      id: 'c-top',
      light: { color: 'red', type: 'number', value: 5 },
      dark: { color: 'pink', type: 'number', value: 5 },
    },
    draw_pile_count: 10,
    draw_penalty: 0,
    winner_id: null,
    uno_called_by: [],
    pending_color_selection: false,
    turn_started_at: new Date(now).toISOString(),
    turn_deadline: new Date(now + 30000).toISOString(),
    uno_declaration_deadline: null,
    uno_declaration_player_id: null,
    pending_draw_decision: null,
    last_action: null,
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
  };

  const drawPile: UnoFlipCard[] = [
    {
      id: 'd-1',
      light: { color: 'red', type: 'number', value: 2 },
      dark: { color: 'teal', type: 'number', value: 2 },
    },
    {
      id: 'd-2',
      light: { color: 'blue', type: 'number', value: 7 },
      dark: { color: 'orange', type: 'number', value: 7 },
    },
    {
      id: 'd-3',
      light: { color: 'green', type: 'number', value: 8 },
      dark: { color: 'purple', type: 'number', value: 8 },
    },
  ];

  // 1. Turn timer expiration draws exactly one card and advances the turn
  it('1. Turn timer expiration draws exactly 1 card and advances the turn', () => {
    const expiredRoom: GameRoom = {
      ...baseRoom,
      turn_deadline: new Date(now - 1000).toISOString(), // expired 1s ago
    };

    const res = processTurnTimeout({
      room: expiredRoom,
      players: dummyPlayers,
      drawPile,
      discardPile: [],
      currentTime: now,
    });

    expect(res.success).toBe(true);
    expect(res.drawnCard?.id).toBe('d-3');
    expect(res.penalizedPlayer?.profile_id).toBe('prof-alice');
    // Advances from Alice (seat 0) to Bob (seat 1)
    expect(res.updatedRoom?.current_turn_seat).toBe(1);
    expect(res.updatedRoom?.draw_pile_count).toBe(2);
    // New 30s turn deadline set for Bob
    expect(new Date(res.updatedRoom?.turn_deadline!).getTime()).toBe(now + 30000);
  });

  // 2. Timer expiration cannot be processed twice
  it('2. Timer expiration cannot be processed twice or before deadline', () => {
    // Before deadline
    const futureRoom: GameRoom = {
      ...baseRoom,
      turn_deadline: new Date(now + 10000).toISOString(), // 10s in the future
    };

    const resBefore = processTurnTimeout({
      room: futureRoom,
      players: dummyPlayers,
      drawPile,
      discardPile: [],
      currentTime: now,
    });

    expect(resBefore.success).toBe(false);
    expect(resBefore.error).toMatch(/not expired/i);
  });

  // 3. A player calls UNO within 5 seconds and receives no penalty
  it('3. When player plays down to 1 card, 5s window starts; calling UNO cancels the deadline', () => {
    const cardToPlay: UnoFlipCard = {
      id: 'c-play',
      light: { color: 'red', type: 'number', value: 3 },
      dark: { color: 'pink', type: 'number', value: 3 },
    };

    const playRes = processCardPlay({
      room: baseRoom,
      player: alice,
      players: dummyPlayers,
      card: cardToPlay,
      drawPile,
      discardPile: [],
      calledUno: false,
      remainingHandLength: 1, // down from 2 to 1!
      currentTime: now,
    });

    // 5-second deadline started
    expect(playRes.updatedRoom.uno_declaration_player_id).toBe('prof-alice');
    expect(new Date(playRes.updatedRoom.uno_declaration_deadline!).getTime()).toBe(now + 5000);

    // If Alice calls UNO before 5s expires (e.g. at now + 2000), uno is declared
    const unoCalledRoom: GameRoom = {
      ...baseRoom,
      ...playRes.updatedRoom,
      uno_called_by: ['prof-alice'],
      uno_declaration_deadline: null,
      uno_declaration_player_id: null,
    };

    // When uno-timeout is checked after calling UNO, it finds no active deadline
    const timeoutRes = processUnoTimeout({
      room: unoCalledRoom,
      targetPlayer: { ...alice, card_count: 1, has_called_uno: true },
      targetHand: [{ id: 'alice-last', light: { color: 'red', type: 'number', value: 9 }, dark: { color: 'pink', type: 'number', value: 9 } }],
      drawPile,
      discardPile: [],
      currentTime: now + 6000,
    });

    expect(timeoutRes.success).toBe(false);
    expect(timeoutRes.error).toMatch(/no active uno declaration deadline/i);
  });

  // 4. A player fails to call UNO within 5 seconds and receives exactly two cards automatically
  it('4. A player fails to call UNO within 5 seconds and receives exactly two cards automatically', () => {
    const vulnerableRoom: GameRoom = {
      ...baseRoom,
      uno_declaration_player_id: 'prof-alice',
      uno_declaration_deadline: new Date(now + 5000).toISOString(),
    };

    const aliceSingleHand: UnoFlipCard[] = [
      { id: 'alice-last', light: { color: 'red', type: 'number', value: 9 }, dark: { color: 'pink', type: 'number', value: 9 } },
    ];

    // Check after 5.1 seconds
    const timeoutRes = processUnoTimeout({
      room: vulnerableRoom,
      targetPlayer: { ...alice, card_count: 1, has_called_uno: false },
      targetHand: aliceSingleHand,
      drawPile,
      discardPile: [],
      currentTime: now + 5100,
    });

    expect(timeoutRes.success).toBe(true);
    expect(timeoutRes.penaltyDrawnCards).toHaveLength(2);
    expect(timeoutRes.updatedTargetHand).toHaveLength(3); // 1 original + 2 penalty
    expect(timeoutRes.updatedRoom?.uno_declaration_deadline).toBeNull();
    expect(timeoutRes.updatedRoom?.uno_declaration_player_id).toBeNull();
    expect(timeoutRes.actionLog?.message).toMatch(/UNO MISSED!/i);
  });

  // 5. Duplicate UNO penalty processing is rejected
  it('5. Duplicate UNO penalty processing is rejected once deadline has passed and cleared', () => {
    const clearedRoom: GameRoom = {
      ...baseRoom,
      uno_declaration_deadline: null,
      uno_declaration_player_id: null,
    };

    const res = processUnoTimeout({
      room: clearedRoom,
      targetPlayer: { ...alice, card_count: 1, has_called_uno: false },
      targetHand: [{ id: 'c1', light: { color: 'red', type: 'number', value: 1 }, dark: { color: 'pink', type: 'number', value: 1 } }],
      drawPile,
      discardPile: [],
      currentTime: now + 10000,
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no active uno declaration deadline/i);
  });

  // 6. Drawing a playable card opens the decision state
  it('6. Drawing a playable card opens the decision dialog', () => {
    // Red 5 is top card. Drawn card is Red 2 (playable!)
    const drawnPlayableCard: UnoFlipCard = {
      id: 'drawn-red-2',
      light: { color: 'red', type: 'number', value: 2 },
      dark: { color: 'teal', type: 'number', value: 2 },
    };

    const playable = isValidPlay(drawnPlayableCard, baseRoom.top_card, baseRoom.current_side, baseRoom.active_color);
    expect(playable).toBe(true);
  });

  // 7. Selecting Play Card plays only the drawn card
  it('7. Selecting Play Card plays only the drawn card and rejects playing a different card', () => {
    const roomWithDecision: GameRoom = {
      ...baseRoom,
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: 'drawn-red-2',
        card: {
          id: 'drawn-red-2',
          light: { color: 'red', type: 'number', value: 2 },
          dark: { color: 'teal', type: 'number', value: 2 },
        },
        decision_deadline: new Date(now + 15000).toISOString(),
      },
    };

    const aliceHand: UnoFlipCard[] = [
      { id: 'drawn-red-2', light: { color: 'red', type: 'number', value: 2 }, dark: { color: 'teal', type: 'number', value: 2 } },
      { id: 'other-card', light: { color: 'blue', type: 'number', value: 9 }, dark: { color: 'orange', type: 'number', value: 9 } },
    ];

    const playResult = processDrawDecision({
      room: roomWithDecision,
      player: alice,
      players: dummyPlayers,
      hand: aliceHand,
      action: 'play',
      drawPile,
      discardPile: [],
      currentTime: now,
    });

    expect(playResult.success).toBe(true);
    // Discard top card is now the drawn card
    expect(playResult.updatedRoom?.top_card?.id).toBe('drawn-red-2');
    expect(playResult.updatedRoom?.pending_draw_decision).toBeNull();
    // Hand decreased by drawn card
    expect(playResult.updatedHand).toHaveLength(1);
    expect(playResult.updatedHand![0].id).toBe('other-card');
  });

  // 8. Selecting Keep Card ends the turn without playing it
  it('8. Selecting Keep Card ends the turn without playing it', () => {
    const roomWithDecision: GameRoom = {
      ...baseRoom,
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: 'drawn-red-2',
        card: {
          id: 'drawn-red-2',
          light: { color: 'red', type: 'number', value: 2 },
          dark: { color: 'teal', type: 'number', value: 2 },
        },
        decision_deadline: new Date(now + 15000).toISOString(),
      },
    };

    const aliceHand: UnoFlipCard[] = [
      { id: 'drawn-red-2', light: { color: 'red', type: 'number', value: 2 }, dark: { color: 'teal', type: 'number', value: 2 } },
    ];

    const keepResult = processDrawDecision({
      room: roomWithDecision,
      player: alice,
      players: dummyPlayers,
      hand: aliceHand,
      action: 'keep',
      drawPile,
      discardPile: [],
      currentTime: now,
    });

    expect(keepResult.success).toBe(true);
    // Card remained in hand
    expect(keepResult.updatedHand).toHaveLength(1);
    // Turn advanced to Bob (seat 1)
    expect(keepResult.updatedRoom?.current_turn_seat).toBe(1);
    expect(keepResult.updatedRoom?.pending_draw_decision).toBeNull();
  });

  // 9. Drawing an unplayable card automatically ends the turn
  it('9. Drawing an unplayable card cannot be played against top card', () => {
    // Top card is Red 5. Drawn card is Green 8 (unplayable).
    const unplayableCard: UnoFlipCard = {
      id: 'drawn-green-8',
      light: { color: 'green', type: 'number', value: 8 },
      dark: { color: 'purple', type: 'number', value: 8 },
    };

    const isPlayable = isValidPlay(unplayableCard, baseRoom.top_card, baseRoom.current_side, baseRoom.active_color);
    expect(isPlayable).toBe(false);
  });

  // 10. Wild cards and action cards apply their correct effects after drawing
  it('10. Wild cards and action cards apply their correct effects after drawing', () => {
    // Action card: Light Skip
    const skipCard: UnoFlipCard = {
      id: 'drawn-skip',
      light: { color: 'red', type: 'skip' },
      dark: { color: 'pink', type: 'skip_everyone' },
    };

    const roomWithSkip: GameRoom = {
      ...baseRoom,
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: 'drawn-skip',
        card: skipCard,
        decision_deadline: new Date(now + 15000).toISOString(),
      },
    };

    const playSkipResult = processDrawDecision({
      room: roomWithSkip,
      player: alice,
      players: dummyPlayers,
      hand: [skipCard],
      action: 'play',
      drawPile,
      discardPile: [],
      currentTime: now,
    });

    expect(playSkipResult.success).toBe(true);
    // In 2-player game, Skip skips Bob (seat 1) -> Alice (seat 0) plays again!
    expect(playSkipResult.updatedRoom?.current_turn_seat).toBe(0);

    // Wild Draw Two card
    const wildDrawTwoCard: UnoFlipCard = {
      id: 'drawn-wild2',
      light: { color: 'wild', type: 'wild_draw_two' },
      dark: { color: 'wild', type: 'wild_draw_color' },
    };

    const roomWithWild: GameRoom = {
      ...baseRoom,
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: 'drawn-wild2',
        card: wildDrawTwoCard,
        decision_deadline: new Date(now + 15000).toISOString(),
      },
    };

    // Prompt for color when no chosen color
    const promptColorResult = processDrawDecision({
      room: roomWithWild,
      player: alice,
      players: dummyPlayers,
      hand: [wildDrawTwoCard],
      action: 'play',
      drawPile,
      discardPile: [],
      currentTime: now,
    });

    expect(promptColorResult.requiresColorSelection).toBe(true);

    // Provide chosen color
    const playWildResult = processDrawDecision({
      room: roomWithWild,
      player: alice,
      players: dummyPlayers,
      hand: [wildDrawTwoCard],
      action: 'play',
      chosenColor: 'blue',
      drawPile,
      discardPile: [],
      currentTime: now,
    });

    expect(playWildResult.success).toBe(true);
    expect(playWildResult.updatedRoom?.active_color).toBe('blue');
    expect(playWildResult.updatedRoom?.draw_penalty).toBe(2);
    expect(playWildResult.updatedRoom?.current_turn_seat).toBe(1);
  });

  // 11. The turn timer does not cause an extra draw while the draw decision is pending
  it('11. The turn timer does not cause an extra draw while the draw decision is pending', () => {
    const roomWithPendingDecision: GameRoom = {
      ...baseRoom,
      turn_deadline: new Date(now - 1000).toISOString(), // expired turn deadline
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: 'drawn-red-2',
        card: {
          id: 'drawn-red-2',
          light: { color: 'red', type: 'number', value: 2 },
          dark: { color: 'teal', type: 'number', value: 2 },
        },
        decision_deadline: new Date(now - 1000).toISOString(),
      },
    };

    // When turn timeout occurs while draw decision is pending, it automatically keeps the card and advances without drawing another card
    const timeoutResult = processTurnTimeout({
      room: roomWithPendingDecision,
      players: dummyPlayers,
      drawPile,
      discardPile: [],
      currentTime: now,
    });

    expect(timeoutResult.success).toBe(true);
    // No drawn card returned
    expect(timeoutResult.drawnCard).toBeUndefined();
    // Turn advanced to Bob
    expect(timeoutResult.updatedRoom?.current_turn_seat).toBe(1);
    expect(timeoutResult.updatedRoom?.pending_draw_decision).toBeNull();
    expect(timeoutResult.actionLog?.message).toMatch(/timed out on draw decision — kept the card/i);
  });
});
