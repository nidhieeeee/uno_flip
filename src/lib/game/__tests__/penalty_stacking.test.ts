import { describe, expect, it } from 'vitest';
import {
  calculateNextSeat,
  drawFromPile,
  getCardPenaltyValue,
  isValidPlay,
  processCardPlay,
  processTurnTimeout,
} from '../engine';
import { GamePlayer, GameRoom, UnoFlipCard } from '../types';

describe('Penalty Card Stacking Rules', () => {
  const dummyPlayers: GamePlayer[] = [
    {
      id: 'p1',
      room_id: 'room-1',
      profile_id: 'prof-alice',
      seat_index: 0,
      is_ready: true,
      is_host: true,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'prof-alice', nickname: 'Alice', avatar_color: 'blue' },
    },
    {
      id: 'p2',
      room_id: 'room-1',
      profile_id: 'prof-bob',
      seat_index: 1,
      is_ready: true,
      is_host: false,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'prof-bob', nickname: 'Bob', avatar_color: 'red' },
    },
    {
      id: 'p3',
      room_id: 'room-1',
      profile_id: 'prof-charlie',
      seat_index: 2,
      is_ready: true,
      is_host: false,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'prof-charlie', nickname: 'Charlie', avatar_color: 'green' },
    },
    {
      id: 'p4',
      room_id: 'room-1',
      profile_id: 'prof-diana',
      seat_index: 3,
      is_ready: true,
      is_host: false,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'prof-diana', nickname: 'Diana', avatar_color: 'yellow' },
    },
  ];

  const greenDrawTwo: UnoFlipCard = {
    id: 'c-green-d2',
    light: { color: 'green', type: 'draw_two' },
    dark: { color: 'orange', type: 'draw_five' },
  };

  const orangeDrawTwo: UnoFlipCard = {
    id: 'c-orange-d2',
    light: { color: 'yellow', type: 'draw_two' },
    dark: { color: 'orange', type: 'draw_two' },
  };

  const blueDrawOne: UnoFlipCard = {
    id: 'c-blue-d1',
    light: { color: 'blue', type: 'draw_one' },
    dark: { color: 'purple', type: 'draw_five' },
  };

  const redDrawOne: UnoFlipCard = {
    id: 'c-red-d1',
    light: { color: 'red', type: 'draw_one' },
    dark: { color: 'pink', type: 'draw_five' },
  };

  const purpleDrawFive: UnoFlipCard = {
    id: 'c-purple-d5',
    light: { color: 'blue', type: 'draw_one' },
    dark: { color: 'purple', type: 'draw_five' },
  };

  const pinkDrawFive: UnoFlipCard = {
    id: 'c-pink-d5',
    light: { color: 'red', type: 'draw_one' },
    dark: { color: 'pink', type: 'draw_five' },
  };

  const wildDrawTwo: UnoFlipCard = {
    id: 'c-wild-d2',
    light: { color: 'wild', type: 'wild_draw_two' },
    dark: { color: 'wild', type: 'wild_draw_color' },
  };

  const greenSeven: UnoFlipCard = {
    id: 'c-green-7',
    light: { color: 'green', type: 'number', value: 7 },
    dark: { color: 'orange', type: 'number', value: 7 },
  };

  const greenSkip: UnoFlipCard = {
    id: 'c-green-skip',
    light: { color: 'green', type: 'skip' },
    dark: { color: 'orange', type: 'skip_everyone' },
  };

  const regularWild: UnoFlipCard = {
    id: 'c-regular-wild',
    light: { color: 'wild', type: 'wild' },
    dark: { color: 'wild', type: 'wild' },
  };

  const baseRoom: GameRoom = {
    id: 'room-1',
    code: 'TESTROOM',
    host_id: 'prof-alice',
    max_players: 4,
    status: 'playing',
    current_side: 'light',
    active_color: 'green',
    current_turn_seat: 0,
    direction: 1,
    top_card: greenDrawTwo,
    draw_pile_count: 50,
    draw_penalty: 0,
    winner_id: null,
    uno_called_by: [],
    pending_color_selection: false,
    last_action: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('1. Card Play Validation during Penalty Stack', () => {
    it('returns correct numeric penalty value via getCardPenaltyValue', () => {
      expect(getCardPenaltyValue(blueDrawOne, 'light')).toBe(1);
      expect(getCardPenaltyValue(greenDrawTwo, 'light')).toBe(2);
      expect(getCardPenaltyValue(wildDrawTwo, 'light')).toBe(2);
      expect(getCardPenaltyValue(purpleDrawFive, 'dark')).toBe(5);
      expect(getCardPenaltyValue(greenSeven, 'light')).toBe(0);
      expect(getCardPenaltyValue(regularWild, 'light')).toBe(0);
      expect(getCardPenaltyValue(greenSkip, 'light')).toBe(0);
    });

    it('allows cross-color stacking of equal value penalty cards', () => {
      // Top card is Green +2, active penalty stack is 2
      // Player plays Orange/Yellow +2 (different color) -> Valid!
      const isValid = isValidPlay(orangeDrawTwo, greenDrawTwo, 'light', 'green', 2);
      expect(isValid).toBe(true);
    });

    it('allows stacking higher-value penalty cards on lower-value penalty cards', () => {
      // Top card is +2, stack is active (e.g. 2)
      // Playing a +5 on a +2 is valid!
      const isValid = isValidPlay(purpleDrawFive, greenDrawTwo, 'dark', 'orange', 2);
      expect(isValid).toBe(true);

      // Playing a +2 on a +1 is valid!
      const isValid2On1 = isValidPlay(greenDrawTwo, blueDrawOne, 'light', 'blue', 1);
      expect(isValid2On1).toBe(true);
    });

    it('allows stacking equal-value penalty cards', () => {
      // +1 on +1
      expect(isValidPlay(redDrawOne, blueDrawOne, 'light', 'blue', 1)).toBe(true);

      // +2 on +2
      expect(isValidPlay(wildDrawTwo, greenDrawTwo, 'light', 'green', 2)).toBe(true);

      // +5 on +5
      expect(isValidPlay(pinkDrawFive, purpleDrawFive, 'dark', 'purple', 5)).toBe(true);
    });

    it('rejects lower-value penalty cards on higher-value penalty cards', () => {
      // Top card is +5 on Dark Side, stack is active (e.g. 5)
      // Attempting to stack a +2 is rejected!
      const isTwoOnFiveValid = isValidPlay(orangeDrawTwo, purpleDrawFive, 'dark', 'purple', 5);
      expect(isTwoOnFiveValid).toBe(false);

      // Attempting to stack a +1 on a +2 on Light side is rejected!
      const isOneOnTwoValid = isValidPlay(blueDrawOne, greenDrawTwo, 'light', 'green', 2);
      expect(isOneOnTwoValid).toBe(false);

      // Attempting to stack a +1 on a Wild +2 is rejected!
      const isOneOnWildTwoValid = isValidPlay(blueDrawOne, wildDrawTwo, 'light', 'green', 2);
      expect(isOneOnWildTwoValid).toBe(false);
    });

    it('rejects normal number cards, action cards, and regular wild cards during active stack', () => {
      // Top card is Green +2, stack is 2
      // Green 7 (same color) -> Rejected!
      expect(isValidPlay(greenSeven, greenDrawTwo, 'light', 'green', 2)).toBe(false);

      // Green Skip (same color) -> Rejected!
      expect(isValidPlay(greenSkip, greenDrawTwo, 'light', 'green', 2)).toBe(false);

      // Regular Wild -> Rejected!
      expect(isValidPlay(regularWild, greenDrawTwo, 'light', 'green', 2)).toBe(false);
    });

    it('preserves normal play matching rules when no penalty stack is active (draw_penalty === 0)', () => {
      // When draw_penalty is 0, normal cards can be played on matching color
      expect(isValidPlay(greenSeven, greenDrawTwo, 'light', 'green', 0)).toBe(true);
      expect(isValidPlay(greenSkip, greenDrawTwo, 'light', 'green', 0)).toBe(true);
      expect(isValidPlay(regularWild, greenDrawTwo, 'light', 'green', 0)).toBe(true);
      // Non-matching card is rejected
      expect(isValidPlay(blueDrawOne, greenSeven, 'light', 'green', 0)).toBe(false);
    });
  });

  describe('2. Penalty Accumulation across Multiple Players', () => {
    it('accumulates penalties correctly from +2 -> +2 -> +5 to reach 9 total cards', () => {
      const drawPile: UnoFlipCard[] = Array.from({ length: 30 }, (_, i) => ({
        id: `draw-${i}`,
        light: { color: 'yellow', type: 'number', value: (i % 9) + 1 },
        dark: { color: 'teal', type: 'number', value: (i % 9) + 1 },
      }));

      // Step 1: Alice (seat 0) plays Green +2
      const step1 = processCardPlay({
        room: { ...baseRoom, current_turn_seat: 0, draw_penalty: 0 },
        player: dummyPlayers[0],
        players: dummyPlayers,
        card: greenDrawTwo,
        drawPile,
        discardPile: [],
        calledUno: false,
      });

      expect(step1.updatedRoom.draw_penalty).toBe(2);
      expect(step1.updatedRoom.current_turn_seat).toBe(1); // Advances to Bob (seat 1), not skipped!
      expect(step1.penaltyDrawnCards).toHaveLength(0); // No immediate draw!

      // Step 2: Bob (seat 1) stacks Orange +2
      const step2 = processCardPlay({
        room: {
          ...baseRoom,
          current_turn_seat: 1,
          draw_penalty: step1.updatedRoom.draw_penalty!,
          top_card: greenDrawTwo,
        },
        player: dummyPlayers[1],
        players: dummyPlayers,
        card: orangeDrawTwo,
        drawPile: step1.updatedDrawPile,
        discardPile: step1.updatedDiscardPile,
        calledUno: false,
      });

      expect(step2.updatedRoom.draw_penalty).toBe(4); // 2 + 2 = 4
      expect(step2.updatedRoom.current_turn_seat).toBe(2); // Advances to Charlie (seat 2), not skipped!
      expect(step2.penaltyDrawnCards).toHaveLength(0);

      // Step 3: Charlie (seat 2) stacks +5
      const step3 = processCardPlay({
        room: {
          ...baseRoom,
          current_side: 'dark',
          current_turn_seat: 2,
          draw_penalty: step2.updatedRoom.draw_penalty!,
          top_card: orangeDrawTwo,
        },
        player: dummyPlayers[2],
        players: dummyPlayers,
        card: purpleDrawFive,
        drawPile: step2.updatedDrawPile,
        discardPile: step2.updatedDiscardPile,
        calledUno: false,
      });

      expect(step3.updatedRoom.draw_penalty).toBe(9); // 4 + 5 = 9!
      expect(step3.updatedRoom.current_turn_seat).toBe(3); // Advances to Diana (seat 3)
      expect(step3.penaltyDrawnCards).toHaveLength(0);
    });
  });

  describe('3. Drawing Accumulated Penalty & Turn Resolution', () => {
    it('draws the full accumulated penalty from the deck and passes the turn', () => {
      const drawPile: UnoFlipCard[] = Array.from({ length: 20 }, (_, i) => ({
        id: `draw-${i}`,
        light: { color: 'yellow', type: 'number', value: (i % 9) + 1 },
        dark: { color: 'teal', type: 'number', value: (i % 9) + 1 },
      }));

      const activePenalty = 9;
      const { drawn, newDrawPile } = drawFromPile(drawPile, [], activePenalty);

      expect(drawn).toHaveLength(9);
      expect(newDrawPile).toHaveLength(11);

      // Turn advances to next player when drawing penalty
      const dianaSeat = 3;
      const nextSeat = calculateNextSeat(dianaSeat, dummyPlayers.length, 1, 1);
      expect(nextSeat).toBe(0); // Wraps around to Alice (seat 0)
    });
  });

  describe('4. Turn Timeout Resolution during Penalty Stack', () => {
    it('forces timed-out player to draw the entire accumulated penalty stack and passes turn', () => {
      const drawPile: UnoFlipCard[] = Array.from({ length: 20 }, (_, i) => ({
        id: `draw-${i}`,
        light: { color: 'red', type: 'number', value: (i % 9) + 1 },
        dark: { color: 'pink', type: 'number', value: (i % 9) + 1 },
      }));

      const now = Date.now();
      const roomWithActiveStack: GameRoom = {
        ...baseRoom,
        current_turn_seat: 3, // Diana's turn
        draw_penalty: 9, // 9 accumulated penalty cards!
        turn_deadline: new Date(now - 1000).toISOString(), // expired turn deadline
      };

      const timeoutResult = processTurnTimeout({
        room: roomWithActiveStack,
        players: dummyPlayers,
        drawPile,
        discardPile: [],
        currentTime: now,
      });

      expect(timeoutResult.success).toBe(true);
      expect(timeoutResult.penalizedPlayer?.profile_id).toBe('prof-diana');
      expect(timeoutResult.drawnCards).toHaveLength(9); // Drew all 9 penalty cards!
      expect(timeoutResult.updatedRoom?.draw_penalty).toBe(0); // Stack cleared
      expect(timeoutResult.updatedRoom?.current_turn_seat).toBe(0); // Turn advanced to Alice
      expect(timeoutResult.actionLog?.drawnCount).toBe(9);
      expect(timeoutResult.actionLog?.message).toContain('Drew +9 accumulated penalty cards');
    });
  });
});
