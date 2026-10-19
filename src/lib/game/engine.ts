import {
  CardColor,
  DarkColor,
  GameActionLog,
  GamePlayer,
  GameRoom,
  LightColor,
  Side,
  UnoFlipCard,
} from './types';
import { DARK_COLORS, LIGHT_COLORS, shuffleDeck } from './deck';

/**
 * Validates if a card can be legally played onto the current discard pile.
 */
export function isValidPlay(
  card: UnoFlipCard,
  topCard: UnoFlipCard | null,
  activeSide: Side,
  activeColor: CardColor | null
): boolean {
  if (!topCard) return true;

  const cardFace = activeSide === 'light' ? card.light : card.dark;
  const topFace = activeSide === 'light' ? topCard.light : topCard.dark;

  // Wild cards can always be played
  if (cardFace.color === 'wild') {
    return true;
  }

  // Matching active color (e.g. from previously chosen Wild or top card)
  if (activeColor && cardFace.color === activeColor) {
    return true;
  }

  // Matching color directly with top card
  if (topFace.color !== 'wild' && cardFace.color === topFace.color) {
    return true;
  }

  // Matching number (1-9)
  if (
    cardFace.type === 'number' &&
    topFace.type === 'number' &&
    cardFace.value !== undefined &&
    cardFace.value === topFace.value
  ) {
    return true;
  }

  // Matching action type (Skip on Skip, Reverse on Reverse, Flip on Flip, etc.)
  if (cardFace.type !== 'number' && cardFace.type === topFace.type) {
    return true;
  }

  return false;
}

/**
 * Calculates the next turn seat index given current seat, player count, direction, and step.
 */
export function calculateNextSeat(
  currentSeat: number,
  playerCount: number,
  direction: 1 | -1,
  step = 1
): number {
  if (playerCount <= 0) return 0;
  const delta = direction * step;
  return ((currentSeat + delta) % playerCount + playerCount) % playerCount;
}

/**
 * Draws `count` cards from the draw pile. If draw pile is depleted, reshuffles discard pile.
 */
export function drawFromPile(
  drawPile: UnoFlipCard[],
  discardPile: UnoFlipCard[],
  count: number
): {
  drawn: UnoFlipCard[];
  newDrawPile: UnoFlipCard[];
  newDiscardPile: UnoFlipCard[];
} {
  let currentDraw = [...drawPile];
  let currentDiscard = [...discardPile];
  const drawn: UnoFlipCard[] = [];

  for (let i = 0; i < count; i++) {
    if (currentDraw.length === 0) {
      if (currentDiscard.length <= 1) {
        // No cards left to draw at all
        break;
      }
      // Keep top card on discard pile, shuffle the rest into draw pile
      const topDiscard = currentDiscard[currentDiscard.length - 1];
      const restDiscard = currentDiscard.slice(0, currentDiscard.length - 1);
      currentDraw = shuffleDeck(restDiscard);
      currentDiscard = [topDiscard];
    }

    const card = currentDraw.pop();
    if (card) {
      drawn.push(card);
    }
  }

  return {
    drawn,
    newDrawPile: currentDraw,
    newDiscardPile: currentDiscard,
  };
}

/**
 * Handles the Dark Side "Wild Draw Color":
 * The next player must draw cards one by one until they draw a card of the chosen Dark color.
 */
export function drawUntilColor(
  drawPile: UnoFlipCard[],
  discardPile: UnoFlipCard[],
  targetColor: DarkColor
): {
  drawn: UnoFlipCard[];
  newDrawPile: UnoFlipCard[];
  newDiscardPile: UnoFlipCard[];
} {
  let currentDraw = [...drawPile];
  let currentDiscard = [...discardPile];
  const drawn: UnoFlipCard[] = [];

  while (true) {
    if (currentDraw.length === 0) {
      if (currentDiscard.length <= 1) {
        break; // Out of cards
      }
      const topDiscard = currentDiscard[currentDiscard.length - 1];
      const restDiscard = currentDiscard.slice(0, currentDiscard.length - 1);
      currentDraw = shuffleDeck(restDiscard);
      currentDiscard = [topDiscard];
    }

    const card = currentDraw.pop();
    if (!card) break;
    drawn.push(card);

    // Check if the drawn card matches targetColor on dark side
    if (card.dark.color === targetColor) {
      break;
    }
  }

  return {
    drawn,
    newDrawPile: currentDraw,
    newDiscardPile: currentDiscard,
  };
}

export interface PlayCardResult {
  updatedRoom: Partial<GameRoom>;
  updatedDrawPile: UnoFlipCard[];
  updatedDiscardPile: UnoFlipCard[];
  affectedPlayerId?: string;
  penaltyDrawnCards?: UnoFlipCard[];
  actionLog: GameActionLog;
}

/**
 * Pure engine function to process playing a card from a player's hand.
 */
export function processCardPlay(params: {
  room: GameRoom;
  player: GamePlayer;
  players: GamePlayer[];
  card: UnoFlipCard;
  chosenColor?: CardColor;
  drawPile: UnoFlipCard[];
  discardPile: UnoFlipCard[];
  calledUno: boolean;
  remainingHandLength?: number;
}): PlayCardResult {
  const {
    room,
    player,
    players,
    card,
    chosenColor,
    drawPile,
    discardPile,
    calledUno,
    remainingHandLength,
  } = params;

  const currentSide = room.current_side;
  const activeFace = currentSide === 'light' ? card.light : card.dark;
  const totalPlayers = players.length;

  let nextDirection = room.direction;
  let nextSide = room.current_side;
  let nextActiveColor: CardColor | null = null;
  let step = 1;
  let penaltyCards: UnoFlipCard[] = [];
  let affectedPlayerId: string | undefined = undefined;

  let newDrawPile = [...drawPile];
  let newDiscardPile = [...discardPile, card];

  // Action resolution
  switch (activeFace.type) {
    case 'number':
      nextActiveColor = activeFace.color as CardColor;
      step = 1;
      break;

    case 'reverse':
      nextActiveColor = activeFace.color as CardColor;
      if (totalPlayers === 2) {
        // In 2-player games, reverse acts as a skip
        step = 2;
      } else {
        nextDirection = (nextDirection === 1 ? -1 : 1) as 1 | -1;
        step = 1;
      }
      break;

    case 'skip': // Light Side
      nextActiveColor = activeFace.color as CardColor;
      step = 2;
      break;

    case 'skip_everyone': // Dark Side
      nextActiveColor = activeFace.color as CardColor;
      // Current player plays again immediately!
      step = 0;
      break;

    case 'draw_one': { // Light Side (+1)
      nextActiveColor = activeFace.color as CardColor;
      const targetSeat = calculateNextSeat(player.seat_index, totalPlayers, nextDirection, 1);
      const targetPlayer = players.find((p) => p.seat_index === targetSeat);
      if (targetPlayer) {
        affectedPlayerId = targetPlayer.profile_id;
        const drawResult = drawFromPile(newDrawPile, newDiscardPile, 1);
        penaltyCards = drawResult.drawn;
        newDrawPile = drawResult.newDrawPile;
        newDiscardPile = drawResult.newDiscardPile;
      }
      step = 2;
      break;
    }

    case 'draw_five': { // Dark Side (+5)
      nextActiveColor = activeFace.color as CardColor;
      const targetSeat = calculateNextSeat(player.seat_index, totalPlayers, nextDirection, 1);
      const targetPlayer = players.find((p) => p.seat_index === targetSeat);
      if (targetPlayer) {
        affectedPlayerId = targetPlayer.profile_id;
        const drawResult = drawFromPile(newDrawPile, newDiscardPile, 5);
        penaltyCards = drawResult.drawn;
        newDrawPile = drawResult.newDrawPile;
        newDiscardPile = drawResult.newDiscardPile;
      }
      step = 2;
      break;
    }

    case 'flip': {
      // Toggle side
      nextSide = currentSide === 'light' ? 'dark' : 'light';
      // The new top card's active color is its other side's color
      const flippedFace = nextSide === 'light' ? card.light : card.dark;
      nextActiveColor = flippedFace.color !== 'wild' ? (flippedFace.color as CardColor) : null;
      step = 1;
      break;
    }

    case 'wild':
      nextActiveColor = chosenColor || null;
      step = 1;
      break;

    case 'wild_draw_two': { // Light Side
      nextActiveColor = chosenColor || null;
      const targetSeat = calculateNextSeat(player.seat_index, totalPlayers, nextDirection, 1);
      const targetPlayer = players.find((p) => p.seat_index === targetSeat);
      if (targetPlayer) {
        affectedPlayerId = targetPlayer.profile_id;
        const drawResult = drawFromPile(newDrawPile, newDiscardPile, 2);
        penaltyCards = drawResult.drawn;
        newDrawPile = drawResult.newDrawPile;
        newDiscardPile = drawResult.newDiscardPile;
      }
      step = 2;
      break;
    }

    case 'wild_draw_color': { // Dark Side
      nextActiveColor = chosenColor || null;
      const targetSeat = calculateNextSeat(player.seat_index, totalPlayers, nextDirection, 1);
      const targetPlayer = players.find((p) => p.seat_index === targetSeat);
      if (targetPlayer && chosenColor && DARK_COLORS.includes(chosenColor as DarkColor)) {
        affectedPlayerId = targetPlayer.profile_id;
        const drawResult = drawUntilColor(newDrawPile, newDiscardPile, chosenColor as DarkColor);
        penaltyCards = drawResult.drawn;
        newDrawPile = drawResult.newDrawPile;
        newDiscardPile = drawResult.newDiscardPile;
      }
      step = 2;
      break;
    }
  }

  // Calculate next turn seat
  const nextSeat =
    step === 0
      ? player.seat_index // Same player (Skip Everyone)
      : calculateNextSeat(player.seat_index, totalPlayers, nextDirection, step);

  // UNO declaration status & catch window target
  let unoCalledBy = [...(room.uno_called_by || [])];
  if (calledUno && !unoCalledBy.includes(player.profile_id)) {
    unoCalledBy.push(player.profile_id);
  }

  // If player reaches exactly 1 card remaining without calling UNO, open catch window
  let unoChallengeTarget: string | null = null;
  if (params.remainingHandLength === 1) {
    if (!calledUno) {
      unoChallengeTarget = player.profile_id;
    }
  }

  const logMessage = `${player.profile?.nickname || 'Player'} played ${
    activeFace.type === 'number'
      ? `${activeFace.color} ${activeFace.value}`
      : `${activeFace.color || ''} ${activeFace.type.replace(/_/g, ' ')}`
  }${activeFace.type === 'flip' ? ' — FLIP!' : ''}${
    penaltyCards.length > 0 ? ` (+${penaltyCards.length} cards!)` : ''
  }`;

  const actionLog: GameActionLog = {
    type: activeFace.type === 'flip' ? 'flip' : 'play',
    playerId: player.profile_id,
    playerName: player.profile?.nickname || 'Player',
    card,
    side: nextSide,
    chosenColor: nextActiveColor || undefined,
    drawnCount: penaltyCards.length,
    message: logMessage,
    timestamp: Date.now(),
  };

  return {
    updatedRoom: {
      current_side: nextSide,
      active_color: nextActiveColor,
      current_turn_seat: nextSeat,
      direction: nextDirection,
      top_card: card,
      draw_pile_count: newDrawPile.length,
      uno_called_by: unoCalledBy,
      uno_challenge_target: unoChallengeTarget,
      last_action: actionLog,
      pending_color_selection: false,
    },
    updatedDrawPile: newDrawPile,
    updatedDiscardPile: newDiscardPile,
    affectedPlayerId,
    penaltyDrawnCards: penaltyCards,
    actionLog,
  };
}

export interface UnoChallengeParams {
  room: GameRoom;
  callerProfileId: string;
  targetPlayer: GamePlayer;
  targetHand: UnoFlipCard[];
  drawPile: UnoFlipCard[];
  discardPile: UnoFlipCard[];
  callerPlayer?: GamePlayer;
}

export interface UnoChallengeResult {
  success: boolean;
  error?: string;
  updatedRoom?: Partial<GameRoom>;
  updatedDrawPile?: UnoFlipCard[];
  updatedDiscardPile?: UnoFlipCard[];
  updatedTargetHand?: UnoFlipCard[];
  penaltyDrawnCards?: UnoFlipCard[];
  actionLog?: GameActionLog;
}

/**
 * Pure engine function to process challenging a player who forgot to call UNO.
 * Validates catch window, player states, draws exactly 2 penalty cards, and closes the window.
 */
export function processUnoChallenge(params: UnoChallengeParams): UnoChallengeResult {
  const { room, callerProfileId, targetPlayer, targetHand, drawPile, discardPile } = params;

  // 1. Room must be currently active
  if (room.status !== 'playing') {
    return { success: false, error: 'Game is not currently active' };
  }

  // 2. Caller cannot catch themselves
  if (callerProfileId === targetPlayer.profile_id) {
    return { success: false, error: 'You cannot catch yourself!' };
  }

  // 3. Catch window must be active for this target player
  if (!room.uno_challenge_target || room.uno_challenge_target !== targetPlayer.profile_id) {
    return {
      success: false,
      error: 'The catch window for this player is not active or has expired',
    };
  }

  // 4. Target player must have exactly 1 card remaining
  if (targetHand.length !== 1 || targetPlayer.card_count !== 1) {
    return {
      success: false,
      error: 'Player does not have exactly 1 card remaining',
    };
  }

  // 5. Target player must not have already called UNO
  if (targetPlayer.has_called_uno) {
    return {
      success: false,
      error: 'Player already called UNO',
    };
  }

  // 6. Draw exactly 2 penalty cards from draw pile (reshuffling discard if depleted)
  const drawResult = drawFromPile(drawPile, discardPile, 2);
  const penaltyDrawnCards = drawResult.drawn;
  const updatedTargetHand = [...targetHand, ...penaltyDrawnCards];

  const targetNickname = targetPlayer.profile?.nickname || 'Player';
  const callerNickname = params.callerPlayer?.profile?.nickname || 'Player';

  const actionLog: GameActionLog = {
    type: 'challenge_uno',
    playerId: callerProfileId,
    playerName: callerNickname,
    targetPlayerId: targetPlayer.profile_id,
    targetPlayerName: targetNickname,
    drawnCount: penaltyDrawnCards.length,
    message: `🚨 ${callerNickname} caught ${targetNickname} forgetting to call UNO! (+2 penalty cards)`,
    timestamp: Date.now(),
  };

  return {
    success: true,
    updatedRoom: {
      uno_challenge_target: null, // Window closes immediately upon penalty
      draw_pile_count: drawResult.newDrawPile.length,
      last_action: actionLog,
    },
    updatedDrawPile: drawResult.newDrawPile,
    updatedDiscardPile: drawResult.newDiscardPile,
    updatedTargetHand,
    penaltyDrawnCards,
    actionLog,
  };
}
