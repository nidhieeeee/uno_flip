import { describe, it, expect } from 'vitest';
import {
  processCardPlay,
  processTurnTimeout,
  processDrawDecision,
  isValidPlay,
} from '../engine';
import { GamePlayer, GameRoom, UnoFlipCard } from '../types';

describe('Drawn Card Popup Timer and Decision Logic Tests', () => {
  const now = 1700000000000;

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

  const players = [alice, bob];

  const playableDrawnCard: UnoFlipCard = {
    id: 'c-drawn-red-7',
    light: { color: 'red', type: 'number', value: 7 },
    dark: { color: 'teal', type: 'number', value: 7 },
  };

  const wildDrawnCard: UnoFlipCard = {
    id: 'c-drawn-wild',
    light: { color: 'wild', type: 'wild' },
    dark: { color: 'wild', type: 'wild' },
  };

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
    turn_started_at: new Date(now - 29000).toISOString(),
    turn_deadline: null, // Normal turn timer suspended while draw decision is pending
    uno_declaration_deadline: null,
    uno_declaration_player_id: null,
    pending_draw_decision: null,
    last_action: null,
    created_at: new Date(now - 30000).toISOString(),
    updated_at: new Date(now).toISOString(),
  };

  // Scenario 1: The player draws a playable card with 1 second remaining and selects Play Card
  it('Scenario 1: Player draws playable card with 1s left; turn timer does not expire; selecting Play Card succeeds', () => {
    const roomWithPending: GameRoom = {
      ...baseRoom,
      turn_deadline: null, // Turn timer suspended
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: playableDrawnCard.id,
        card: playableDrawnCard,
        decision_deadline: new Date(now + 15000).toISOString(), // 15s to decide
      },
    };

    // Verify turn timeout check rejects because decision deadline is still active
    const timeoutCheck = processTurnTimeout({
      room: roomWithPending,
      players,
      drawPile: [],
      discardPile: [],
      currentTime: now + 500, // 500ms later (when original turn would have expired)
    });

    expect(timeoutCheck.success).toBe(false);
    expect(timeoutCheck.error).toMatch(/not expired yet/i);

    // Player selects Play Card
    const playResult = processDrawDecision({
      room: roomWithPending,
      player: alice,
      players,
      hand: [playableDrawnCard],
      action: 'play',
      drawPile: [],
      discardPile: [],
      currentTime: now + 1000,
    });

    expect(playResult.success).toBe(true);
    expect(playResult.updatedRoom?.pending_draw_decision).toBeNull();
    // Alice played down to 0 cards -> Winner!
    expect(playResult.isWinner).toBe(true);
  });

  // Scenario 2: The player draws a playable card with 1 second remaining and selects Keep Card
  it('Scenario 2: Player draws playable card with 1s left and selects Keep Card; turn advances to next player with fresh timer', () => {
    const roomWithPending: GameRoom = {
      ...baseRoom,
      turn_deadline: null, // Turn timer suspended
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: playableDrawnCard.id,
        card: playableDrawnCard,
        decision_deadline: new Date(now + 15000).toISOString(),
      },
    };

    const currentHand = [
      playableDrawnCard,
      {
        id: 'c-blue-9',
        light: { color: 'blue', type: 'number', value: 9 },
        dark: { color: 'orange', type: 'number', value: 9 },
      } as UnoFlipCard,
    ];

    const keepResult = processDrawDecision({
      room: roomWithPending,
      player: alice,
      players,
      hand: currentHand,
      action: 'keep',
      drawPile: [],
      discardPile: [],
      currentTime: now + 2000,
    });

    expect(keepResult.success).toBe(true);
    expect(keepResult.updatedHand).toHaveLength(2); // Kept the drawn card
    expect(keepResult.updatedRoom?.pending_draw_decision).toBeNull();
    // Turn advances to Bob (seat 1)
    expect(keepResult.updatedRoom?.current_turn_seat).toBe(1);
    // Fresh 30s timer started for Bob
    expect(new Date(keepResult.updatedRoom?.turn_deadline!).getTime()).toBe(now + 2000 + 30000);
  });

  // Scenario 3: Player selects Play Card while the original turn deadline passes
  it('Scenario 3: Original turn deadline passes while popup is open; player can still select Play Card and action is accepted', () => {
    const roomWithPending: GameRoom = {
      ...baseRoom,
      turn_deadline: null, // Was suspended when card was drawn
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: playableDrawnCard.id,
        card: playableDrawnCard,
        decision_deadline: new Date(now + 15000).toISOString(),
      },
    };

    // 5 seconds pass (way past original turn timer)
    const playResult = processDrawDecision({
      room: roomWithPending,
      player: alice,
      players,
      hand: [
        playableDrawnCard,
        {
          id: 'c-blue-1',
          light: { color: 'blue', type: 'number', value: 1 },
          dark: { color: 'purple', type: 'number', value: 1 },
        } as UnoFlipCard,
      ],
      action: 'play',
      drawPile: [],
      discardPile: [],
      currentTime: now + 5000,
    });

    expect(playResult.success).toBe(true);
    expect(playResult.updatedRoom?.pending_draw_decision).toBeNull();
    expect(playResult.updatedRoom?.top_card?.id).toBe(playableDrawnCard.id);
  });

  // Scenario 4: Player selects a Wild card and completes color selection
  it('Scenario 4: Player draws a Wild card; prompt requests color selection; playing with chosen color applies effect', () => {
    const roomWithPending: GameRoom = {
      ...baseRoom,
      turn_deadline: null,
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: wildDrawnCard.id,
        card: wildDrawnCard,
        decision_deadline: new Date(now + 15000).toISOString(),
      },
    };

    // Without chosenColor -> returns requiresColorSelection: true
    const promptColorResult = processDrawDecision({
      room: roomWithPending,
      player: alice,
      players,
      hand: [wildDrawnCard],
      action: 'play',
      drawPile: [],
      discardPile: [],
      currentTime: now + 1000,
    });

    expect(promptColorResult.success).toBe(false);
    expect(promptColorResult.requiresColorSelection).toBe(true);

    // With chosenColor: 'blue' -> completes play with chosenColor
    const completePlayResult = processDrawDecision({
      room: roomWithPending,
      player: alice,
      players,
      hand: [wildDrawnCard],
      action: 'play',
      chosenColor: 'blue',
      drawPile: [],
      discardPile: [],
      currentTime: now + 3000,
    });

    expect(completePlayResult.success).toBe(true);
    expect(completePlayResult.updatedRoom?.active_color).toBe('blue');
    expect(completePlayResult.updatedRoom?.top_card?.id).toBe(wildDrawnCard.id);
    expect(completePlayResult.updatedRoom?.pending_draw_decision).toBeNull();
  });

  // Scenario 5: Decision timeout occurs when decision deadline passes
  it('Scenario 5: When decision deadline expires, timeout auto-keeps card without drawing extra cards', () => {
    const roomWithPending: GameRoom = {
      ...baseRoom,
      turn_deadline: null,
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: playableDrawnCard.id,
        card: playableDrawnCard,
        decision_deadline: new Date(now - 100).toISOString(), // Expired 100ms ago
      },
    };

    const timeoutResult = processTurnTimeout({
      room: roomWithPending,
      players,
      drawPile: [],
      discardPile: [],
      currentTime: now,
    });

    expect(timeoutResult.success).toBe(true);
    // No additional card drawn
    expect(timeoutResult.drawnCard).toBeUndefined();
    // Turn passed to Bob
    expect(timeoutResult.updatedRoom?.current_turn_seat).toBe(1);
    expect(timeoutResult.updatedRoom?.pending_draw_decision).toBeNull();
    expect(timeoutResult.actionLog?.message).toMatch(/timed out on draw decision — kept the card/i);
    // Bob receives a fresh 30s timer
    expect(new Date(timeoutResult.updatedRoom?.turn_deadline!).getTime()).toBe(now + 30000);
  });

  // Scenario 6: Decision cannot be made if already resolved (pending_draw_decision is null)
  it('Scenario 6: Double-click or duplicate decision rejected if pending_draw_decision is already null', () => {
    const resolvedRoom: GameRoom = {
      ...baseRoom,
      pending_draw_decision: null,
    };

    const duplicatePlay = processDrawDecision({
      room: resolvedRoom,
      player: alice,
      players,
      hand: [playableDrawnCard],
      action: 'play',
      drawPile: [],
      discardPile: [],
      currentTime: now,
    });

    expect(duplicatePlay.success).toBe(false);
    expect(duplicatePlay.error).toMatch(/No pending draw decision/i);
  });

  // Scenario 7: Next player timer starts only after previous decision is resolved
  it('Scenario 7: Next player timer starts strictly when previous decision is processed', () => {
    const actionTimestamp = now + 4500;
    const roomWithPending: GameRoom = {
      ...baseRoom,
      turn_deadline: null,
      pending_draw_decision: {
        player_id: 'prof-alice',
        card_id: playableDrawnCard.id,
        card: playableDrawnCard,
        decision_deadline: new Date(now + 15000).toISOString(),
      },
    };

    const keepResult = processDrawDecision({
      room: roomWithPending,
      player: alice,
      players,
      hand: [playableDrawnCard, playableDrawnCard],
      action: 'keep',
      drawPile: [],
      discardPile: [],
      currentTime: actionTimestamp,
    });

    expect(keepResult.success).toBe(true);
    expect(new Date(keepResult.updatedRoom?.turn_started_at!).getTime()).toBe(actionTimestamp);
    expect(new Date(keepResult.updatedRoom?.turn_deadline!).getTime()).toBe(actionTimestamp + 30000);
  });
});
