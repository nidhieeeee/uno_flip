import { describe, it, expect } from 'vitest';
import { processCardPlay, processUnoChallenge } from '../engine';
import { GamePlayer, GameRoom, UnoFlipCard } from '../types';

describe('Multiplayer Game Rules & Penalties', () => {
  const dummyPlayers: GamePlayer[] = [
    {
      id: 'p1',
      room_id: 'r1',
      profile_id: 'prof-alice',
      seat_index: 0,
      is_ready: true,
      is_host: true,
      is_connected: true,
      card_count: 2,
      has_called_uno: false,
      profile: { id: 'prof-alice', nickname: 'Alice', avatar_color: '#EF4444' },
    },
    {
      id: 'p2',
      room_id: 'r1',
      profile_id: 'prof-bob',
      seat_index: 1,
      is_ready: true,
      is_host: false,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'prof-bob', nickname: 'Bob', avatar_color: '#3B82F6' },
    },
    {
      id: 'p3',
      room_id: 'r1',
      profile_id: 'prof-charlie',
      seat_index: 2,
      is_ready: true,
      is_host: false,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'prof-charlie', nickname: 'Charlie', avatar_color: '#10B981' },
    },
  ];

  const baseRoom: GameRoom = {
    id: 'r1',
    code: 'ROOM99',
    host_id: 'prof-alice',
    status: 'playing',
    max_players: 4,
    current_side: 'light',
    active_color: 'red',
    current_turn_seat: 0,
    direction: 1,
    top_card: {
      id: 'top-1',
      light: { color: 'red', type: 'number', value: 3 },
      dark: { color: 'pink', type: 'number', value: 3 },
    },
    draw_pile_count: 60,
    draw_penalty: 0,
    winner_id: null,
    uno_called_by: [],
    pending_color_selection: false,
    last_action: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const drawCardsPile: UnoFlipCard[] = Array.from({ length: 20 }, (_, i) => ({
    id: `draw-${i}`,
    light: { color: 'green', type: 'number', value: (i % 9) + 1 },
    dark: { color: 'orange', type: 'number', value: (i % 9) + 1 },
  }));

  it('Wild Draw Two initiates 2 penalty cards stack and advances to next player', () => {
    const wildDrawTwo: UnoFlipCard = {
      id: 'w-d2',
      light: { color: 'wild', type: 'wild_draw_two' },
      dark: { color: 'wild', type: 'wild_draw_color' },
    };

    const res = processCardPlay({
      room: baseRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: wildDrawTwo,
      chosenColor: 'blue',
      drawPile: drawCardsPile,
      discardPile: [],
      calledUno: true,
    });

    expect(res.penaltyDrawnCards).toHaveLength(0);
    expect(res.updatedRoom.draw_penalty).toBe(2);
    expect(res.updatedRoom.active_color).toBe('blue');
    // Bob (seat 1) gets turn to stack or draw
    expect(res.updatedRoom.current_turn_seat).toBe(1);
  });

  it('Draw Five on Dark Side initiates 5 penalty cards stack and advances to next player', () => {
    const darkRoom: GameRoom = {
      ...baseRoom,
      current_side: 'dark',
      active_color: 'pink',
    };

    const drawFiveCard: UnoFlipCard = {
      id: 'd5',
      light: { color: 'red', type: 'draw_one' },
      dark: { color: 'pink', type: 'draw_five' },
    };

    const res = processCardPlay({
      room: darkRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: drawFiveCard,
      drawPile: drawCardsPile,
      discardPile: [],
      calledUno: false,
    });

    expect(res.penaltyDrawnCards).toHaveLength(0);
    expect(res.updatedRoom.draw_penalty).toBe(5);
    // Bob (seat 1) gets turn to stack or draw
    expect(res.updatedRoom.current_turn_seat).toBe(1);
  });

  it('Wild Draw Color on Dark Side forces next player to draw until target dark color appears', () => {
    const darkRoom: GameRoom = {
      ...baseRoom,
      current_side: 'dark',
      active_color: 'orange',
    };

    const wildDrawColor: UnoFlipCard = {
      id: 'wdc',
      light: { color: 'wild', type: 'wild_draw_two' },
      dark: { color: 'wild', type: 'wild_draw_color' },
    };

    const customDrawPile: UnoFlipCard[] = [
      { id: 'c-teal', light: { color: 'yellow', type: 'number', value: 1 }, dark: { color: 'teal', type: 'number', value: 1 } },
      { id: 'c-pink1', light: { color: 'red', type: 'number', value: 2 }, dark: { color: 'pink', type: 'number', value: 2 } },
      { id: 'c-pink2', light: { color: 'red', type: 'number', value: 3 }, dark: { color: 'pink', type: 'number', value: 3 } },
    ];

    const res = processCardPlay({
      room: darkRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: wildDrawColor,
      chosenColor: 'teal',
      drawPile: customDrawPile,
      discardPile: [],
      calledUno: false,
    });

    expect(res.affectedPlayerId).toBe('prof-bob');
    expect(res.penaltyDrawnCards?.length).toBeGreaterThanOrEqual(1);
    const lastDrawn = res.penaltyDrawnCards![res.penaltyDrawnCards!.length - 1];
    expect(lastDrawn.dark.color).toBe('teal');
  });

  it('Flip card flips active side and sets next active color to the flipped top card color', () => {
    const flipCard: UnoFlipCard = {
      id: 'flip-test',
      light: { color: 'red', type: 'flip' },
      dark: { color: 'pink', type: 'flip' },
    };

    const res = processCardPlay({
      room: baseRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: flipCard,
      drawPile: drawCardsPile,
      discardPile: [],
      calledUno: false,
    });

    expect(res.updatedRoom.current_side).toBe('dark');
    expect(res.updatedRoom.active_color).toBe('pink');
    expect(res.updatedRoom.current_turn_seat).toBe(1); // Bob is next
  });

  it('Records player calling UNO in uno_called_by', () => {
    const normalCard: UnoFlipCard = {
      id: 'norm',
      light: { color: 'red', type: 'number', value: 7 },
      dark: { color: 'pink', type: 'number', value: 7 },
    };

    const res = processCardPlay({
      room: baseRoom,
      player: dummyPlayers[0],
      players: dummyPlayers,
      card: normalCard,
      drawPile: drawCardsPile,
      discardPile: [],
      calledUno: true,
    });

    expect(res.updatedRoom.uno_called_by).toContain('prof-alice');
  });
});

describe('UNO Call Penalty & Catch Rules', () => {
  const alice: GamePlayer = {
    id: 'p1',
    room_id: 'r1',
    profile_id: 'prof-alice',
    seat_index: 0,
    is_ready: true,
    is_host: true,
    is_connected: true,
    card_count: 1,
    has_called_uno: false,
    profile: { id: 'prof-alice', nickname: 'Alice', avatar_color: '#EF4444' },
  };

  const bob: GamePlayer = {
    id: 'p2',
    room_id: 'r1',
    profile_id: 'prof-bob',
    seat_index: 1,
    is_ready: true,
    is_host: false,
    is_connected: true,
    card_count: 5,
    has_called_uno: false,
    profile: { id: 'prof-bob', nickname: 'Bob', avatar_color: '#3B82F6' },
  };

  const activeRoom: GameRoom = {
    id: 'r1',
    code: 'ROOM99',
    host_id: 'prof-alice',
    status: 'playing',
    max_players: 4,
    current_side: 'light',
    active_color: 'red',
    current_turn_seat: 1, // Bob's turn
    direction: 1,
    top_card: {
      id: 'top-1',
      light: { color: 'red', type: 'number', value: 3 },
      dark: { color: 'pink', type: 'number', value: 3 },
    },
    draw_pile_count: 20,
    draw_penalty: 0,
    winner_id: null,
    uno_called_by: [],
    uno_challenge_target: 'prof-alice', // Alice forgot to call UNO and is vulnerable
    pending_color_selection: false,
    last_action: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const testHandAlice: UnoFlipCard[] = [
    {
      id: 'alice-last-card',
      light: { color: 'red', type: 'number', value: 5 },
      dark: { color: 'pink', type: 'number', value: 5 },
    },
  ];

  const testDrawPile: UnoFlipCard[] = [
    {
      id: 'd-1',
      light: { color: 'blue', type: 'number', value: 1 },
      dark: { color: 'teal', type: 'number', value: 1 },
    },
    {
      id: 'd-2',
      light: { color: 'green', type: 'number', value: 2 },
      dark: { color: 'orange', type: 'number', value: 2 },
    },
    {
      id: 'd-3',
      light: { color: 'yellow', type: 'number', value: 3 },
      dark: { color: 'purple', type: 'number', value: 3 },
    },
  ];

  // 1. Player calls UNO successfully — no penalty
  it('1. Player calls UNO successfully — no penalty can be applied', () => {
    const aliceWithUno: GamePlayer = { ...alice, has_called_uno: true };
    const roomWithUnoCalled: GameRoom = { ...activeRoom, uno_challenge_target: null };

    const result = processUnoChallenge({
      room: roomWithUnoCalled,
      callerProfileId: 'prof-bob',
      callerPlayer: bob,
      targetPlayer: aliceWithUno,
      targetHand: testHandAlice,
      drawPile: testDrawPile,
      discardPile: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not active|already called UNO/i);
    expect(result.penaltyDrawnCards).toBeUndefined();
  });

  // 2. Player forgets UNO and gets caught in time — exactly 2 cards added
  it('2. Player forgets UNO and gets caught in time — exactly 2 cards added', () => {
    const result = processUnoChallenge({
      room: activeRoom,
      callerProfileId: 'prof-bob',
      callerPlayer: bob,
      targetPlayer: alice,
      targetHand: testHandAlice,
      drawPile: testDrawPile,
      discardPile: [],
    });

    expect(result.success).toBe(true);
    expect(result.penaltyDrawnCards).toHaveLength(2);
    expect(result.updatedTargetHand).toHaveLength(3); // 1 original + 2 penalty
    expect(result.updatedRoom?.uno_challenge_target).toBeNull();
    expect(result.actionLog?.type).toBe('challenge_uno');
    expect(result.actionLog?.targetPlayerId).toBe('prof-alice');
    expect(result.actionLog?.drawnCount).toBe(2);
  });

  // 3. Player forgets UNO but nobody catches them in time — no penalty
  it('3. Player forgets UNO but nobody catches them in time — window closes when next player plays/draws', () => {
    // When Bob plays a card, processCardPlay resets uno_challenge_target
    const normalCard: UnoFlipCard = {
      id: 'norm',
      light: { color: 'red', type: 'number', value: 7 },
      dark: { color: 'pink', type: 'number', value: 7 },
    };

    const playResult = processCardPlay({
      room: activeRoom,
      player: bob,
      players: [alice, bob],
      card: normalCard,
      drawPile: testDrawPile,
      discardPile: [],
      calledUno: false,
      remainingHandLength: 4, // Bob has 4 cards left
    });

    // Window closed for Alice because Bob began and completed his turn
    expect(playResult.updatedRoom.uno_challenge_target).toBeNull();

    // Now if anyone attempts to catch Alice, it fails
    const catchAttempt = processUnoChallenge({
      room: {
        ...activeRoom,
        uno_challenge_target: playResult.updatedRoom.uno_challenge_target ?? null,
      },
      callerProfileId: 'prof-bob',
      callerPlayer: bob,
      targetPlayer: alice,
      targetHand: testHandAlice,
      drawPile: testDrawPile,
      discardPile: [],
    });

    expect(catchAttempt.success).toBe(false);
    expect(catchAttempt.error).toMatch(/not active|expired/i);
  });

  // 4. Catch attempt after the deadline — rejected
  it('4. Catch attempt after the deadline — rejected', () => {
    const expiredRoom: GameRoom = { ...activeRoom, uno_challenge_target: null };

    const result = processUnoChallenge({
      room: expiredRoom,
      callerProfileId: 'prof-bob',
      callerPlayer: bob,
      targetPlayer: alice,
      targetHand: testHandAlice,
      drawPile: testDrawPile,
      discardPile: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/expired|not active/i);
  });

  // 5. Duplicate catch attempts — only one penalty
  it('5. Duplicate catch attempts — second attempt rejected', () => {
    // First catch succeeds
    const firstResult = processUnoChallenge({
      room: activeRoom,
      callerProfileId: 'prof-bob',
      callerPlayer: bob,
      targetPlayer: alice,
      targetHand: testHandAlice,
      drawPile: testDrawPile,
      discardPile: [],
    });

    expect(firstResult.success).toBe(true);

    // Second catch attempt with updated room and hand state
    const secondResult = processUnoChallenge({
      room: { ...activeRoom, ...firstResult.updatedRoom },
      callerProfileId: 'prof-charlie',
      targetPlayer: { ...alice, card_count: firstResult.updatedTargetHand!.length },
      targetHand: firstResult.updatedTargetHand!,
      drawPile: firstResult.updatedDrawPile!,
      discardPile: firstResult.updatedDiscardPile!,
    });

    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toBeDefined();
  });

  // 6. Player catches themselves — rejected
  it('6. Player catches themselves — rejected', () => {
    const result = processUnoChallenge({
      room: activeRoom,
      callerProfileId: 'prof-alice', // Alice catching herself
      callerPlayer: alice,
      targetPlayer: alice,
      targetHand: testHandAlice,
      drawPile: testDrawPile,
      discardPile: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cannot catch yourself/i);
  });

  // 7. Player's hand changes before the catch is processed — state is revalidated
  it("7. Player's hand changes before the catch is processed — state is revalidated", () => {
    // Alice drew a card or received cards, hand length is now 2
    const modifiedHand: UnoFlipCard[] = [
      ...testHandAlice,
      {
        id: 'c-new',
        light: { color: 'red', type: 'number', value: 1 },
        dark: { color: 'pink', type: 'number', value: 1 },
      },
    ];
    const modifiedPlayer: GamePlayer = { ...alice, card_count: 2 };

    const result = processUnoChallenge({
      room: activeRoom,
      callerProfileId: 'prof-bob',
      callerPlayer: bob,
      targetPlayer: modifiedPlayer,
      targetHand: modifiedHand,
      drawPile: testDrawPile,
      discardPile: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/does not have exactly 1 card/i);
  });

  // 8. The rule works correctly with multiplayer synchronization and both card sides
  it('8. Rule works correctly for Dark Side of UNO FLIP', () => {
    const darkRoom: GameRoom = {
      ...activeRoom,
      current_side: 'dark',
      active_color: 'pink',
    };

    const result = processUnoChallenge({
      room: darkRoom,
      callerProfileId: 'prof-bob',
      callerPlayer: bob,
      targetPlayer: alice,
      targetHand: testHandAlice,
      drawPile: testDrawPile,
      discardPile: [],
    });

    expect(result.success).toBe(true);
    expect(result.penaltyDrawnCards).toHaveLength(2);
    expect(result.updatedTargetHand).toHaveLength(3);
    expect(result.updatedRoom?.uno_challenge_target).toBeNull();
  });

  // 9. When playing down to 1 card without calling UNO, catch window opens
  it('9. When player reaches 1 card remaining without calling UNO, uno_challenge_target is set to that player', () => {
    const cardToPlay: UnoFlipCard = {
      id: 'c-play',
      light: { color: 'red', type: 'number', value: 3 },
      dark: { color: 'pink', type: 'number', value: 3 },
    };

    const res = processCardPlay({
      room: activeRoom,
      player: alice,
      players: [alice, bob],
      card: cardToPlay,
      drawPile: testDrawPile,
      discardPile: [],
      calledUno: false,
      remainingHandLength: 1, // Alice now has 1 card left
    });

    expect(res.updatedRoom.uno_challenge_target).toBe('prof-alice');
  });

  // 10. When player plays down to 1 card and DID call UNO, catch window remains null
  it('10. When player reaches 1 card remaining and called UNO, uno_challenge_target is null', () => {
    const cardToPlay: UnoFlipCard = {
      id: 'c-play',
      light: { color: 'red', type: 'number', value: 3 },
      dark: { color: 'pink', type: 'number', value: 3 },
    };

    const res = processCardPlay({
      room: activeRoom,
      player: alice,
      players: [alice, bob],
      card: cardToPlay,
      drawPile: testDrawPile,
      discardPile: [],
      calledUno: true,
      remainingHandLength: 1,
    });

    expect(res.updatedRoom.uno_challenge_target).toBeNull();
    expect(res.updatedRoom.uno_called_by).toContain('prof-alice');
  });
});
