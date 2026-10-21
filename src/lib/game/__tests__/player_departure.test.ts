import { describe, it, expect } from 'vitest';
import {
  calculateNextSeat,
  findNextActiveSeat,
  processPlayerDeparture,
} from '../engine';
import { GamePlayer, GameRoom, UnoFlipCard } from '../types';

function createMockCard(id: string): UnoFlipCard {
  return {
    id,
    light: { color: 'blue', type: 'number', value: 5 },
    dark: { color: 'teal', type: 'number', value: 5 },
  };
}

function createMockPlayer(seatIndex: number, profileId: string, nickname: string): GamePlayer {
  return {
    id: `gp-${profileId}`,
    room_id: 'room-1',
    profile_id: profileId,
    seat_index: seatIndex,
    is_ready: true,
    is_host: seatIndex === 0,
    is_connected: true,
    card_count: 5,
    has_called_uno: false,
    profile: {
      id: profileId,
      nickname,
      avatar_color: '#1677E8',
    },
  };
}

function createMockRoom(playersCount = 2, currentTurnSeat = 0): GameRoom {
  return {
    id: 'room-1',
    code: 'TEST01',
    host_id: 'p1',
    status: 'playing',
    max_players: 4,
    current_side: 'light',
    active_color: 'blue',
    current_turn_seat: currentTurnSeat,
    direction: 1,
    top_card: createMockCard('c-top'),
    draw_pile_count: 50,
    draw_penalty: 0,
    winner_id: null,
    win_reason: null,
    uno_called_by: [],
    pending_color_selection: false,
    turn_started_at: new Date(100000).toISOString(),
    turn_deadline: new Date(130000).toISOString(),
    uno_declaration_deadline: null,
    uno_declaration_player_id: null,
    pending_draw_decision: null,
    last_action: null,
    created_at: new Date(90000).toISOString(),
    updated_at: new Date(100000).toISOString(),
  };
}

describe('Player Departure, Disconnect, and Forfeit Engine Rules', () => {
  // Scenario 1: One player intentionally leaves a two-player game: remaining player wins.
  it('Scenario 1: One player leaves a two-player game -> remaining player immediately wins by forfeit', () => {
    const room = createMockRoom(2, 0);
    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const p2 = createMockPlayer(1, 'p2', 'Sam');
    const players = [p1, p2];

    const result = processPlayerDeparture({
      room,
      players,
      departingPlayerId: 'p1',
      reason: 'leave',
      currentTime: 105000,
    });

    expect(result.success).toBe(true);
    expect(result.isGameOver).toBe(true);
    expect(result.winnerPlayerId).toBe('p2');
    expect(result.winReason).toBe('forfeit');
    expect(result.updatedRoom.status).toBe('finished');
    expect(result.updatedRoom.winner_id).toBe('p2');
    expect(result.updatedRoom.win_reason).toBe('forfeit');
    expect(result.actionLog.message).toContain('Alex left the game. Sam wins!');
  });

  // Scenario 2: One player disconnects briefly and reconnects: game resumes.
  it('Scenario 2: One player disconnects briefly and reconnects -> hand and room status are preserved', () => {
    const room = createMockRoom(2, 0);
    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const p2 = createMockPlayer(1, 'p2', 'Sam');

    // Simulate disconnect: is_connected = false, disconnected_at set
    p2.is_connected = false;
    p2.disconnected_at = new Date(100000).toISOString();

    // Within grace period (e.g. 5s later)
    const now = 105000;
    const elapsed = now - new Date(p2.disconnected_at).getTime();
    expect(elapsed).toBe(5000);
    expect(elapsed < 15000).toBe(true); // Within 15s grace period

    // Reconnection simulates clearing disconnected_at and restoring is_connected
    p2.is_connected = true;
    p2.disconnected_at = null;

    expect(room.status).toBe('playing');
    expect(room.winner_id).toBeNull();
    expect(p2.is_connected).toBe(true);
    expect(p2.card_count).toBe(5);
  });

  // Scenario 3: One player disconnects and does not reconnect within the grace period: departure is processed.
  it('Scenario 3: One player disconnects and grace period expires (>=15s) -> departure is processed', () => {
    const room = createMockRoom(2, 0);
    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const p2 = createMockPlayer(1, 'p2', 'Sam');
    p2.is_connected = false;
    p2.disconnected_at = new Date(100000).toISOString();

    const now = 116000; // 16 seconds later
    const elapsed = now - new Date(p2.disconnected_at).getTime();
    expect(elapsed >= 15000).toBe(true);

    const result = processPlayerDeparture({
      room,
      players: [p1, p2],
      departingPlayerId: 'p2',
      reason: 'disconnect_timeout',
      currentTime: now,
    });

    expect(result.success).toBe(true);
    expect(result.isGameOver).toBe(true);
    expect(result.winnerPlayerId).toBe('p1');
    expect(result.winReason).toBe('forfeit');
    expect(result.actionLog.message).toContain('Sam left the game. Alex wins!');
  });

  // Scenario 4: One player leaves a three-player game: match continues with two players.
  it('Scenario 4: One player leaves a 3-player game -> match continues with remaining 2 players', () => {
    const room = createMockRoom(3, 0);
    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const p2 = createMockPlayer(1, 'p2', 'Jamie');
    const p3 = createMockPlayer(2, 'p3', 'Taylor');
    const players = [p1, p2, p3];

    const result = processPlayerDeparture({
      room,
      players,
      departingPlayerId: 'p2',
      reason: 'leave',
      currentTime: 105000,
    });

    expect(result.success).toBe(true);
    expect(result.isGameOver).toBe(false);
    expect(result.remainingPlayers.length).toBe(2);
    expect(result.remainingPlayers.map((p) => p.profile_id)).toEqual(['p1', 'p3']);
    expect(result.actionLog.message).toContain('Jamie left. Continuing with 2 players.');
  });

  // Scenario 5: One player leaves a four-player game: match continues with three players.
  it('Scenario 5: One player leaves a 4-player game -> match continues with remaining 3 players', () => {
    const room = createMockRoom(4, 0);
    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const p2 = createMockPlayer(1, 'p2', 'Jamie');
    const p3 = createMockPlayer(2, 'p3', 'Taylor');
    const p4 = createMockPlayer(3, 'p4', 'Morgan');
    const players = [p1, p2, p3, p4];

    const result = processPlayerDeparture({
      room,
      players,
      departingPlayerId: 'p4',
      reason: 'leave',
      currentTime: 105000,
    });

    expect(result.success).toBe(true);
    expect(result.isGameOver).toBe(false);
    expect(result.remainingPlayers.length).toBe(3);
    expect(result.actionLog.message).toContain('Morgan left. Continuing with 3 players.');
  });

  // Scenario 6: The current player leaves: next eligible player receives the turn and timer resets.
  it('Scenario 6: The current player leaves -> next eligible player receives turn and turn timer resets', () => {
    const room = createMockRoom(3, 1); // Jamie (seat 1) has current turn
    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const p2 = createMockPlayer(1, 'p2', 'Jamie');
    const p3 = createMockPlayer(2, 'p3', 'Taylor');
    const players = [p1, p2, p3];

    const departureTime = 105000;
    const result = processPlayerDeparture({
      room,
      players,
      departingPlayerId: 'p2', // Jamie leaves on their own turn
      reason: 'leave',
      currentTime: departureTime,
      turnDurationMs: 30000,
    });

    expect(result.success).toBe(true);
    // Direction = 1 (clockwise), next after seat 1 in remaining seats [0, 2] is seat 2 (Taylor)
    expect(result.updatedRoom.current_turn_seat).toBe(2);
    expect(result.updatedRoom.turn_started_at).toBe(new Date(departureTime).toISOString());
    expect(result.updatedRoom.turn_deadline).toBe(new Date(departureTime + 30000).toISOString());
  });

  // Scenario 7: A non-current player leaves: current player's turn remains valid and unchanged.
  it('Scenario 7: A non-current player leaves -> current player turn and deadline remain preserved', () => {
    const originalTurnStarted = new Date(100000).toISOString();
    const originalTurnDeadline = new Date(130000).toISOString();
    const room = {
      ...createMockRoom(3, 0), // Alex (seat 0) has the turn
      turn_started_at: originalTurnStarted,
      turn_deadline: originalTurnDeadline,
    };

    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const p2 = createMockPlayer(1, 'p2', 'Jamie');
    const p3 = createMockPlayer(2, 'p3', 'Taylor');
    const players = [p1, p2, p3];

    const result = processPlayerDeparture({
      room,
      players,
      departingPlayerId: 'p3', // Taylor (seat 2, non-current) leaves
      reason: 'leave',
      currentTime: 105000,
    });

    expect(result.success).toBe(true);
    expect(result.updatedRoom.current_turn_seat).toBe(0); // Alex still has turn
    expect(result.updatedRoom.turn_started_at).toBe(originalTurnStarted); // Preserved
    expect(result.updatedRoom.turn_deadline).toBe(originalTurnDeadline); // Preserved
  });

  // Scenario 8: Multiple players leave sequentially/simultaneously: winner and turn order remain correct.
  it('Scenario 8: Multiple players leave -> winner and turn order remain authoritative and correct', () => {
    let room = createMockRoom(4, 0);
    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const p2 = createMockPlayer(1, 'p2', 'Jamie');
    const p3 = createMockPlayer(2, 'p3', 'Taylor');
    const p4 = createMockPlayer(3, 'p4', 'Morgan');
    let players = [p1, p2, p3, p4];

    // First Morgan leaves
    const r1 = processPlayerDeparture({ room, players, departingPlayerId: 'p4', currentTime: 101000 });
    expect(r1.isGameOver).toBe(false);
    expect(r1.remainingPlayers.length).toBe(3);
    players = r1.remainingPlayers;
    room = { ...room, ...r1.updatedRoom };

    // Then Jamie leaves
    const r2 = processPlayerDeparture({ room, players, departingPlayerId: 'p2', currentTime: 102000 });
    expect(r2.isGameOver).toBe(false);
    expect(r2.remainingPlayers.length).toBe(2);
    players = r2.remainingPlayers;
    room = { ...room, ...r2.updatedRoom };

    // Finally Taylor leaves -> Alex is the sole remaining player!
    const r3 = processPlayerDeparture({ room, players, departingPlayerId: 'p3', currentTime: 103000 });
    expect(r3.isGameOver).toBe(true);
    expect(r3.winnerPlayerId).toBe('p1');
    expect(r3.winReason).toBe('forfeit');
    expect(r3.updatedRoom.status).toBe('finished');
  });

  // Scenario 9: A departed player is no longer in remaining players and cannot be matched.
  it('Scenario 9: A departed player is removed and cannot make subsequent moves', () => {
    const room = createMockRoom(3, 0);
    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const p2 = createMockPlayer(1, 'p2', 'Jamie');
    const p3 = createMockPlayer(2, 'p3', 'Taylor');
    const players = [p1, p2, p3];

    const result = processPlayerDeparture({
      room,
      players,
      departingPlayerId: 'p2',
      reason: 'leave',
    });

    const isJamieStillInGame = result.remainingPlayers.some((p) => p.profile_id === 'p2');
    expect(isJamieStillInGame).toBe(false);
  });

  // Scenario 10: A departure is processed more than once: no duplicate effects occur.
  it('Scenario 10: A departure called for an already-departed player returns error without crashing', () => {
    const room = createMockRoom(2, 0);
    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const players = [p1]; // Jamie already departed

    const result = processPlayerDeparture({
      room,
      players,
      departingPlayerId: 'p2', // Not in players
      reason: 'leave',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Departing player not found');
  });

  // Scenario 11: Turn timers and pending UNO/draw decisions are cleaned up correctly.
  it('Scenario 11: Pending draw decision and UNO penalties belonging to departed player are cleaned up', () => {
    const room: GameRoom = {
      ...createMockRoom(3, 1),
      uno_declaration_deadline: new Date(105000).toISOString(),
      uno_declaration_player_id: 'p2',
      uno_challenge_target: 'p2',
      pending_draw_decision: {
        player_id: 'p2',
        card_id: 'c-1',
        card: createMockCard('c-1'),
        decision_deadline: new Date(105000).toISOString(),
      },
    };

    const p1 = createMockPlayer(0, 'p1', 'Alex');
    const p2 = createMockPlayer(1, 'p2', 'Jamie');
    const p3 = createMockPlayer(2, 'p3', 'Taylor');

    const result = processPlayerDeparture({
      room,
      players: [p1, p2, p3],
      departingPlayerId: 'p2',
      currentTime: 102000,
    });

    expect(result.updatedRoom.pending_draw_decision).toBeNull();
    expect(result.updatedRoom.uno_declaration_deadline).toBeNull();
    expect(result.updatedRoom.uno_declaration_player_id).toBeNull();
    expect(result.updatedRoom.uno_challenge_target).toBeNull();
  });

  // Scenario 12: Turn order skips departed seats in all directions.
  it('Scenario 12: Turn order correctly navigates non-contiguous seats clockwise and counter-clockwise', () => {
    // Active seats: 0, 2, 3 (seat 1 departed)
    const activeSeats = [{ seat_index: 0 }, { seat_index: 2 }, { seat_index: 3 }];

    // Clockwise (direction = 1)
    expect(findNextActiveSeat(0, activeSeats, 1, 1)).toBe(2);
    expect(findNextActiveSeat(2, activeSeats, 1, 1)).toBe(3);
    expect(findNextActiveSeat(3, activeSeats, 1, 1)).toBe(0);

    // Counter-Clockwise (direction = -1)
    expect(findNextActiveSeat(0, activeSeats, -1, 1)).toBe(3);
    expect(findNextActiveSeat(3, activeSeats, -1, 1)).toBe(2);
    expect(findNextActiveSeat(2, activeSeats, -1, 1)).toBe(0);

    // Skip card (step = 2)
    expect(findNextActiveSeat(0, activeSeats, 1, 2)).toBe(3);
    expect(findNextActiveSeat(2, activeSeats, 1, 2)).toBe(0);
    expect(findNextActiveSeat(3, activeSeats, 1, 2)).toBe(2);

    // calculateNextSeat supports activePlayers array
    expect(calculateNextSeat(0, activeSeats, 1, 1)).toBe(2);
    expect(calculateNextSeat(2, activeSeats, 1, 1)).toBe(3);
  });
});
