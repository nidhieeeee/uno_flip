import { describe, expect, it } from 'vitest';
import {
  calculateNextSeat,
  drawFromPile,
  getCardPenaltyValue,
  isValidPlay,
  processCardPlay,
  resolveCardEffect,
} from '../engine';
import { GamePlayer, GameRoom, UnoFlipCard } from '../types';

describe('Dark Side Wild Card Effects & Penalty Regression Tests', () => {
  const dummyPlayers: GamePlayer[] = [
    {
      id: 'p1',
      room_id: 'r1',
      profile_id: 'prof-alice',
      seat_index: 0,
      is_ready: true,
      is_host: true,
      is_connected: true,
      card_count: 5,
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
    {
      id: 'p4',
      room_id: 'r1',
      profile_id: 'prof-diana',
      seat_index: 3,
      is_ready: true,
      is_host: false,
      is_connected: true,
      card_count: 5,
      has_called_uno: false,
      profile: { id: 'prof-diana', nickname: 'Diana', avatar_color: '#F59E0B' },
    },
  ];

  const regularWildCard: UnoFlipCard = {
    id: 'c-wild-regular',
    light: { color: 'wild', type: 'wild' },
    dark: { color: 'wild', type: 'wild' },
  };

  const wildDrawFiveCard: UnoFlipCard = {
    id: 'c-wild-d5',
    light: { color: 'wild', type: 'wild_draw_two' },
    dark: { color: 'wild', type: 'wild_draw_five' },
  };

  const darkNumberCard: UnoFlipCard = {
    id: 'c-pink-7',
    light: { color: 'red', type: 'number', value: 7 },
    dark: { color: 'pink', type: 'number', value: 3 },
  };

  const darkFlipCard: UnoFlipCard = {
    id: 'c-flip-1',
    light: { color: 'blue', type: 'flip' },
    dark: { color: 'teal', type: 'flip' },
  };

  const darkDrawFiveCard: UnoFlipCard = {
    id: 'c-orange-d5',
    light: { color: 'yellow', type: 'draw_one' },
    dark: { color: 'orange', type: 'draw_five' },
  };

  const baseDarkRoom: GameRoom = {
    id: 'r1',
    code: 'DARK01',
    host_id: 'prof-alice',
    max_players: 4,
    status: 'playing',
    current_side: 'dark',
    active_color: 'pink',
    current_turn_seat: 0,
    direction: 1,
    top_card: darkNumberCard,
    draw_pile_count: 60,
    draw_penalty: 0,
    winner_id: null,
    uno_called_by: [],
    pending_color_selection: false,
    last_action: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleDrawPile: UnoFlipCard[] = Array.from({ length: 40 }, (_, i) => ({
    id: `draw-${i}`,
    light: { color: 'yellow', type: 'number', value: (i % 9) + 1 },
    dark: { color: 'teal', type: 'number', value: (i % 9) + 1 },
  }));

  describe('1. Centralized Server-Side Card Effect Resolver', () => {
    it('resolves Regular Wild on Dark Side to 0 penalty, wild=true, requiresColorSelection=true', () => {
      const effect = resolveCardEffect(regularWildCard, 'dark');
      expect(effect.cardType).toBe('wild');
      expect(effect.penaltyValue).toBe(0);
      expect(effect.isPenalty).toBe(false);
      expect(effect.isWild).toBe(true);
      expect(effect.isFlip).toBe(false);
      expect(effect.step).toBe(1);
      expect(effect.requiresColorSelection).toBe(true);

      expect(getCardPenaltyValue(regularWildCard, 'dark')).toBe(0);
    });

    it('resolves Wild Draw Five on Dark Side to 5 penalty, wild=true, requiresColorSelection=true', () => {
      const effect = resolveCardEffect(wildDrawFiveCard, 'dark');
      expect(effect.cardType).toBe('wild_draw_five');
      expect(effect.penaltyValue).toBe(5);
      expect(effect.isPenalty).toBe(true);
      expect(effect.isWild).toBe(true);
      expect(effect.isFlip).toBe(false);
      expect(effect.step).toBe(1);
      expect(effect.requiresColorSelection).toBe(true);

      expect(getCardPenaltyValue(wildDrawFiveCard, 'dark')).toBe(5);
    });

    it('resolves Flip Card to 0 penalty on both Light and Dark sides', () => {
      const darkEffect = resolveCardEffect(darkFlipCard, 'dark');
      expect(darkEffect.cardType).toBe('flip');
      expect(darkEffect.penaltyValue).toBe(0);
      expect(darkEffect.isPenalty).toBe(false);
      expect(darkEffect.isFlip).toBe(true);

      const lightEffect = resolveCardEffect(darkFlipCard, 'light');
      expect(lightEffect.cardType).toBe('flip');
      expect(lightEffect.penaltyValue).toBe(0);
      expect(lightEffect.isPenalty).toBe(false);
      expect(lightEffect.isFlip).toBe(true);
    });
  });

  describe('2. Regular Wild Card Play on Dark Side', () => {
    it('changes the active color and adds exactly zero penalty cards', () => {
      const playResult = processCardPlay({
        room: baseDarkRoom,
        player: dummyPlayers[0],
        players: dummyPlayers,
        card: regularWildCard,
        chosenColor: 'teal',
        drawPile: sampleDrawPile,
        discardPile: [darkNumberCard],
        calledUno: false,
        remainingHandLength: 4,
      });

      // Active color changes to chosen color
      expect(playResult.updatedRoom.active_color).toBe('teal');
      // Draw penalty is strictly 0
      expect(playResult.updatedRoom.draw_penalty).toBe(0);
      // Zero penalty cards assigned to any player
      expect(playResult.penaltyDrawnCards).toHaveLength(0);
      expect(playResult.affectedPlayerId).toBeUndefined();
      // Turn advances normally to next player (Bob, seat 1)
      expect(playResult.updatedRoom.current_turn_seat).toBe(1);

      // Log message does NOT mention penalty or stack
      expect(playResult.actionLog.message).not.toContain('penalty');
      expect(playResult.actionLog.message).not.toContain('+5');
      expect(playResult.actionLog.drawnCount).toBe(0);
    });
  });

  describe('3. Wild Draw Five (+5) Card Play on Dark Side', () => {
    it('changes the color, adds exactly 5 cards to pending penalty stack, and advances turn', () => {
      const playResult = processCardPlay({
        room: baseDarkRoom,
        player: dummyPlayers[0],
        players: dummyPlayers,
        card: wildDrawFiveCard,
        chosenColor: 'purple',
        drawPile: sampleDrawPile,
        discardPile: [darkNumberCard],
        calledUno: false,
        remainingHandLength: 4,
      });

      // Active color changes to chosen color
      expect(playResult.updatedRoom.active_color).toBe('purple');
      // Draw penalty is exactly 5
      expect(playResult.updatedRoom.draw_penalty).toBe(5);
      // Advances turn to Bob (seat 1) to stack or draw
      expect(playResult.updatedRoom.current_turn_seat).toBe(1);

      // Action log explicitly records +5 penalty
      expect(playResult.actionLog.message).toContain('+5 cards! Stack total: 5');
    });
  });

  describe('4. Stacking Rules Validation (Regular Wild vs Wild Draw Five)', () => {
    it('disallows Regular Wild during an active penalty stack', () => {
      // Penalty stack of 5 is active
      const isRegularWildValid = isValidPlay(
        regularWildCard,
        darkDrawFiveCard,
        'dark',
        'orange',
        5
      );
      // Regular Wild has 0 penalty value and CANNOT be used during a penalty stack
      expect(isRegularWildValid).toBe(false);
    });

    it('allows Wild Draw Five to stack on an active Draw Five (+5) stack', () => {
      const isWildDrawFiveValid = isValidPlay(
        wildDrawFiveCard,
        darkDrawFiveCard,
        'dark',
        'orange',
        5
      );
      expect(isWildDrawFiveValid).toBe(true);
    });

    it('accumulates stack from 5 to 10 when Wild Draw Five is stacked on Draw Five', () => {
      const roomWithActiveStack: GameRoom = {
        ...baseDarkRoom,
        current_turn_seat: 1, // Bob's turn
        draw_penalty: 5,
        top_card: darkDrawFiveCard,
        active_color: 'orange',
      };

      const playResult = processCardPlay({
        room: roomWithActiveStack,
        player: dummyPlayers[1],
        players: dummyPlayers,
        card: wildDrawFiveCard,
        chosenColor: 'pink',
        drawPile: sampleDrawPile,
        discardPile: [darkDrawFiveCard],
        calledUno: false,
        remainingHandLength: 4,
      });

      expect(playResult.updatedRoom.draw_penalty).toBe(10); // 5 + 5 = 10
      expect(playResult.updatedRoom.active_color).toBe('pink');
      expect(playResult.updatedRoom.current_turn_seat).toBe(2); // Advances to Charlie
      expect(playResult.actionLog.message).toContain('+5 cards! Stack total: 10');
    });
  });

  describe('5. Flip Card Effect without Penalty', () => {
    it('switches active side between Light and Dark without adding any draw penalty', () => {
      const flipResult = processCardPlay({
        room: baseDarkRoom,
        player: dummyPlayers[0],
        players: dummyPlayers,
        card: darkFlipCard,
        drawPile: sampleDrawPile,
        discardPile: [darkNumberCard],
        calledUno: false,
        remainingHandLength: 4,
      });

      // Side toggled to light
      expect(flipResult.updatedRoom.current_side).toBe('light');
      // Draw penalty remains 0
      expect(flipResult.updatedRoom.draw_penalty).toBe(0);
      expect(flipResult.penaltyDrawnCards).toHaveLength(0);
      expect(flipResult.actionLog.type).toBe('flip');
      expect(flipResult.actionLog.message).not.toContain('penalty');
    });
  });

  describe('6. Playing Regular Wild after Penalty has Resolved', () => {
    it('does not carry over an old resolved penalty when regular Wild is played', () => {
      // Step A: Alice played a +5 card
      const stepA = processCardPlay({
        room: { ...baseDarkRoom, current_turn_seat: 0, draw_penalty: 0 },
        player: dummyPlayers[0],
        players: dummyPlayers,
        card: wildDrawFiveCard,
        chosenColor: 'orange',
        drawPile: sampleDrawPile,
        discardPile: [darkNumberCard],
        calledUno: false,
      });
      expect(stepA.updatedRoom.draw_penalty).toBe(5);
      expect(stepA.updatedRoom.current_turn_seat).toBe(1); // Bob's turn

      // Step B: Bob cannot stack, draws the 5 penalty cards and passes turn
      const { drawn: bobDrawn, newDrawPile } = drawFromPile(stepA.updatedDrawPile, stepA.updatedDiscardPile, 5);
      expect(bobDrawn).toHaveLength(5);

      const roomAfterBobResolved: GameRoom = {
        ...baseDarkRoom,
        current_turn_seat: 2, // Charlie's turn
        draw_penalty: 0, // Penalty is fully cleared and resolved!
        top_card: wildDrawFiveCard,
        active_color: 'orange',
      };

      // Step C: Charlie plays a regular Wild card
      const stepC = processCardPlay({
        room: roomAfterBobResolved,
        player: dummyPlayers[2],
        players: dummyPlayers,
        card: regularWildCard,
        chosenColor: 'purple',
        drawPile: newDrawPile,
        discardPile: [...stepA.updatedDiscardPile],
        calledUno: false,
        remainingHandLength: 3,
      });

      // Penalty must remain 0 and never resurrect the old +5 penalty
      expect(stepC.updatedRoom.draw_penalty).toBe(0);
      expect(stepC.penaltyDrawnCards).toHaveLength(0);
      expect(stepC.updatedRoom.active_color).toBe('purple');
      expect(stepC.updatedRoom.current_turn_seat).toBe(3); // Advances to Diana
      expect(stepC.actionLog.drawnCount).toBe(0);
      expect(stepC.actionLog.message).not.toContain('+5');
      expect(stepC.actionLog.message).not.toContain('penalty');
    });
  });

  describe('7. Multiplayer Synchronization Consistency', () => {
    it('emits synchronized state ensuring all clients observe 0 penalty for Regular Wild', () => {
      const result = processCardPlay({
        room: baseDarkRoom,
        player: dummyPlayers[0],
        players: dummyPlayers,
        card: regularWildCard,
        chosenColor: 'pink',
        drawPile: sampleDrawPile,
        discardPile: [],
        calledUno: false,
      });

      // Verify that every state property transmitted to Supabase / client subscribers
      // has exact deterministic values
      expect(result.updatedRoom.draw_penalty).toBe(0);
      expect(result.updatedRoom.active_color).toBe('pink');
      expect(result.updatedRoom.current_side).toBe('dark');
      expect(result.actionLog.drawnCount).toBe(0);
      expect(result.actionLog.message).toContain('Alice played wild');
      expect(result.actionLog.message).not.toContain('cards!');
    });
  });
});
