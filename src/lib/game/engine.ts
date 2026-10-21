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
 * Finds the next eligible active seat given the current seat, active players list, direction, and step.
 * Correctly accounts for non-contiguous seat indices when players have departed or disconnected.
 */
export function findNextActiveSeat(
  currentSeat: number,
  activePlayers: { seat_index: number }[],
  direction: 1 | -1,
  step = 1
): number {
  if (activePlayers.length === 0) return 0;
  if (activePlayers.length === 1) return activePlayers[0].seat_index;

  // Sort active seats in ascending order
  const sortedSeats = activePlayers.map((p) => p.seat_index).sort((a, b) => a - b);

  let currentIndex = sortedSeats.indexOf(currentSeat);
  if (currentIndex === -1) {
    // Current seat was removed; find closest position based on direction
    if (direction === 1) {
      const nextIdx = sortedSeats.findIndex((s) => s > currentSeat);
      currentIndex = nextIdx !== -1 ? nextIdx - 1 : sortedSeats.length - 1;
    } else {
      const prevIdx = sortedSeats.slice().reverse().findIndex((s) => s < currentSeat);
      currentIndex = prevIdx !== -1 ? sortedSeats.length - 1 - prevIdx + 1 : 0;
    }
  }

  const total = sortedSeats.length;
  const delta = direction * step;
  const targetIndex = ((currentIndex + delta) % total + total) % total;
  return sortedSeats[targetIndex];
}

/**
 * Calculates the next turn seat index given current seat, player count or active players array, direction, and step.
 */
export function calculateNextSeat(
  currentSeat: number,
  playerCountOrPlayers: number | { seat_index: number }[],
  direction: 1 | -1,
  step = 1
): number {
  if (Array.isArray(playerCountOrPlayers)) {
    return findNextActiveSeat(currentSeat, playerCountOrPlayers, direction, step);
  }
  const playerCount = playerCountOrPlayers;
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

export interface ProcessCardPlayParams {
  room: GameRoom;
  player: GamePlayer;
  players: GamePlayer[];
  card: UnoFlipCard;
  chosenColor?: CardColor;
  drawPile: UnoFlipCard[];
  discardPile: UnoFlipCard[];
  calledUno: boolean;
  remainingHandLength?: number;
  currentTime?: number;
  turnDurationMs?: number;
  unoDurationMs?: number;
}

/**
 * Pure engine function to process playing a card from a player's hand.
 */
export function processCardPlay(params: ProcessCardPlayParams): PlayCardResult {
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
      const targetSeat = calculateNextSeat(player.seat_index, players, nextDirection, 1);
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
      const targetSeat = calculateNextSeat(player.seat_index, players, nextDirection, 1);
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
      const targetSeat = calculateNextSeat(player.seat_index, players, nextDirection, 1);
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
      const targetSeat = calculateNextSeat(player.seat_index, players, nextDirection, 1);
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
      : calculateNextSeat(player.seat_index, players, nextDirection, step);

  // UNO declaration status & catch window target
  let unoCalledBy = [...(room.uno_called_by || [])];
  if (calledUno && !unoCalledBy.includes(player.profile_id)) {
    unoCalledBy.push(player.profile_id);
  }

  const now = params.currentTime ?? Date.now();
  const turnDurationMs = params.turnDurationMs ?? 30000;
  const unoDurationMs = params.unoDurationMs ?? 5000;

  // If player reaches exactly 1 card remaining without calling UNO, start 5s window
  let unoChallengeTarget: string | null = null;
  let unoDeclarationDeadline: string | null = null;
  let unoDeclarationPlayerId: string | null = null;
  if (params.remainingHandLength === 1) {
    if (!calledUno) {
      unoChallengeTarget = player.profile_id;
      unoDeclarationPlayerId = player.profile_id;
      unoDeclarationDeadline = new Date(now + unoDurationMs).toISOString();
    }
  }

  const isGameOver = params.remainingHandLength === 0;
  const turnStartedAt = new Date(now).toISOString();
  const turnDeadline = new Date(now + turnDurationMs).toISOString();

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
    timestamp: now,
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
      uno_challenge_target: isGameOver ? null : unoChallengeTarget,
      turn_started_at: isGameOver ? null : turnStartedAt,
      turn_deadline: isGameOver ? null : turnDeadline,
      uno_declaration_deadline: isGameOver ? null : unoDeclarationDeadline,
      uno_declaration_player_id: isGameOver ? null : unoDeclarationPlayerId,
      pending_draw_decision: null,
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

export interface TurnTimeoutParams {
  room: GameRoom;
  players: GamePlayer[];
  drawPile: UnoFlipCard[];
  discardPile: UnoFlipCard[];
  currentTime?: number;
  turnDurationMs?: number;
}

export interface TurnTimeoutResult {
  success: boolean;
  error?: string;
  updatedRoom?: Partial<GameRoom>;
  updatedDrawPile?: UnoFlipCard[];
  updatedDiscardPile?: UnoFlipCard[];
  drawnCard?: UnoFlipCard;
  penalizedPlayer?: GamePlayer;
  actionLog?: GameActionLog;
}

/**
 * Pure engine function to process turn expiration when a player fails to act within the 30-second window.
 * If a draw decision was pending, the card is kept and the turn advances without drawing another card.
 * Otherwise, exactly 1 card is drawn for the timed-out player and the turn advances to the next player.
 */
export function processTurnTimeout(params: TurnTimeoutParams): TurnTimeoutResult {
  const { room, players, drawPile, discardPile } = params;
  const now = params.currentTime ?? Date.now();
  const turnDurationMs = params.turnDurationMs ?? 30000;

  if (room.status !== 'playing') {
    return { success: false, error: 'Game is not currently active' };
  }

  if (!room.turn_deadline) {
    return { success: false, error: 'No turn deadline set' };
  }

  const deadlineMs = new Date(room.turn_deadline).getTime();
  if (now < deadlineMs) {
    return { success: false, error: 'Turn deadline has not expired yet' };
  }

  const currentPlayer = players.find((p) => p.seat_index === room.current_turn_seat);
  if (!currentPlayer) {
    return { success: false, error: 'Current player not found' };
  }

  // If a draw decision is pending, resolve it by keeping the card without drawing another card
  if (room.pending_draw_decision && room.pending_draw_decision.player_id === currentPlayer.profile_id) {
    const nextSeat = calculateNextSeat(currentPlayer.seat_index, players, room.direction, 1);
    const actionLog: GameActionLog = {
      type: 'pass',
      playerId: currentPlayer.profile_id,
      playerName: currentPlayer.profile?.nickname || 'Player',
      message: `⏱️ ${currentPlayer.profile?.nickname || 'Player'} timed out on draw decision — kept the card.`,
      timestamp: now,
    };

    return {
      success: true,
      updatedRoom: {
        current_turn_seat: nextSeat,
        pending_draw_decision: null,
        turn_started_at: new Date(now).toISOString(),
        turn_deadline: new Date(now + turnDurationMs).toISOString(),
        uno_declaration_deadline: null,
        uno_declaration_player_id: null,
        last_action: actionLog,
      },
      actionLog,
    };
  }

  // Otherwise draw exactly 1 penalty card and advance the turn
  const drawResult = drawFromPile(drawPile, discardPile, 1);
  const drawnCard = drawResult.drawn[0];
  const nextSeat = calculateNextSeat(currentPlayer.seat_index, players, room.direction, 1);

  const actionLog: GameActionLog = {
    type: 'draw',
    playerId: currentPlayer.profile_id,
    playerName: currentPlayer.profile?.nickname || 'Player',
    targetPlayerId: currentPlayer.profile_id,
    targetPlayerName: currentPlayer.profile?.nickname || 'Player',
    drawnCount: 1,
    message: `⏱️ ${currentPlayer.profile?.nickname || 'Player'} ran out of time! +1 card penalty and turn passed.`,
    timestamp: now,
  };

  return {
    success: true,
    updatedRoom: {
      current_turn_seat: nextSeat,
      draw_pile_count: drawResult.newDrawPile.length,
      turn_started_at: new Date(now).toISOString(),
      turn_deadline: new Date(now + turnDurationMs).toISOString(),
      uno_declaration_deadline: null,
      uno_declaration_player_id: null,
      pending_draw_decision: null,
      last_action: actionLog,
    },
    updatedDrawPile: drawResult.newDrawPile,
    updatedDiscardPile: drawResult.newDiscardPile,
    drawnCard,
    penalizedPlayer: currentPlayer,
    actionLog,
  };
}

export interface UnoTimeoutParams {
  room: GameRoom;
  targetPlayer: GamePlayer;
  targetHand: UnoFlipCard[];
  drawPile: UnoFlipCard[];
  discardPile: UnoFlipCard[];
  currentTime?: number;
}

export interface UnoTimeoutResult {
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
 * Pure engine function to automatically apply the 2-card missed UNO penalty when the 5-second window expires.
 */
export function processUnoTimeout(params: UnoTimeoutParams): UnoTimeoutResult {
  const { room, targetPlayer, targetHand, drawPile, discardPile } = params;
  const now = params.currentTime ?? Date.now();

  if (room.status !== 'playing') {
    return { success: false, error: 'Game is not currently active' };
  }

  if (!room.uno_declaration_deadline) {
    return { success: false, error: 'No active UNO declaration deadline' };
  }

  const deadlineMs = new Date(room.uno_declaration_deadline).getTime();
  if (now < deadlineMs) {
    return { success: false, error: 'UNO declaration window has not expired yet' };
  }

  if (room.uno_declaration_player_id && room.uno_declaration_player_id !== targetPlayer.profile_id) {
    return { success: false, error: 'Target player does not match UNO declaration target' };
  }

  if (targetPlayer.card_count !== 1 || targetHand.length !== 1) {
    return { success: false, error: 'Player does not have exactly 1 card remaining' };
  }

  if (targetPlayer.has_called_uno) {
    return { success: false, error: 'Player already called UNO' };
  }

  // Draw exactly 2 penalty cards
  const drawResult = drawFromPile(drawPile, discardPile, 2);
  const penaltyDrawnCards = drawResult.drawn;
  const updatedTargetHand = [...targetHand, ...penaltyDrawnCards];

  const targetNickname = targetPlayer.profile?.nickname || 'Player';
  const actionLog: GameActionLog = {
    type: 'challenge_uno',
    playerId: targetPlayer.profile_id,
    playerName: targetNickname,
    targetPlayerId: targetPlayer.profile_id,
    targetPlayerName: targetNickname,
    drawnCount: 2,
    message: `🚨 UNO MISSED! ${targetNickname} failed to call UNO within 5s (+2 cards penalty)!`,
    timestamp: now,
  };

  return {
    success: true,
    updatedRoom: {
      uno_declaration_deadline: null,
      uno_declaration_player_id: null,
      uno_challenge_target: null,
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

export interface ProcessDrawDecisionParams {
  room: GameRoom;
  player: GamePlayer;
  players: GamePlayer[];
  hand: UnoFlipCard[];
  action: 'play' | 'keep';
  chosenColor?: CardColor;
  drawPile: UnoFlipCard[];
  discardPile: UnoFlipCard[];
  currentTime?: number;
  turnDurationMs?: number;
  unoDurationMs?: number;
}

export interface ProcessDrawDecisionResult {
  success: boolean;
  error?: string;
  requiresColorSelection?: boolean;
  cardId?: string;
  side?: Side;
  updatedRoom?: Partial<GameRoom>;
  updatedDrawPile?: UnoFlipCard[];
  updatedDiscardPile?: UnoFlipCard[];
  updatedHand?: UnoFlipCard[];
  isWinner?: boolean;
  actionLog?: GameActionLog;
  affectedPlayerId?: string;
  penaltyDrawnCards?: UnoFlipCard[];
}

/**
 * Pure engine function to process deciding whether to play or keep the drawn card.
 */
export function processDrawDecision(params: ProcessDrawDecisionParams): ProcessDrawDecisionResult {
  const {
    room,
    player,
    players,
    hand,
    action,
    chosenColor,
    drawPile,
    discardPile,
  } = params;
  const now = params.currentTime ?? Date.now();
  const turnDurationMs = params.turnDurationMs ?? 30000;

  if (room.status !== 'playing') {
    return { success: false, error: 'Game is not currently active' };
  }

  if (player.seat_index !== room.current_turn_seat) {
    return { success: false, error: 'Not your turn' };
  }

  if (!room.pending_draw_decision || room.pending_draw_decision.player_id !== player.profile_id) {
    return { success: false, error: 'No pending draw decision for this player' };
  }

  if (action === 'keep') {
    const nextSeat = calculateNextSeat(player.seat_index, players.length, room.direction, 1);
    const actionLog: GameActionLog = {
      type: 'pass',
      playerId: player.profile_id,
      playerName: player.profile?.nickname || 'Player',
      message: `${player.profile?.nickname || 'Player'} kept the drawn card.`,
      timestamp: now,
    };

    return {
      success: true,
      updatedRoom: {
        current_turn_seat: nextSeat,
        pending_draw_decision: null,
        turn_started_at: new Date(now).toISOString(),
        turn_deadline: new Date(now + turnDurationMs).toISOString(),
        uno_declaration_deadline: null,
        uno_declaration_player_id: null,
        last_action: actionLog,
      },
      updatedHand: hand,
      actionLog,
    };
  }

  // action === 'play'
  const drawnCardId = room.pending_draw_decision.card_id;
  const cardToPlay = hand.find((c) => c.id === drawnCardId);
  if (!cardToPlay) {
    return { success: false, error: 'Drawn card not found in your hand' };
  }

  // Validate legality
  const valid = isValidPlay(cardToPlay, room.top_card, room.current_side, room.active_color);
  if (!valid) {
    return { success: false, error: 'Drawn card cannot be legally played' };
  }

  const activeFace = room.current_side === 'light' ? cardToPlay.light : cardToPlay.dark;
  if (activeFace.color === 'wild' && !chosenColor) {
    return {
      success: false,
      requiresColorSelection: true,
      cardId: cardToPlay.id,
      side: room.current_side,
    };
  }

  const remainingHand = hand.filter((c) => c.id !== cardToPlay.id);
  const playResult = processCardPlay({
    room,
    player,
    players,
    card: cardToPlay,
    chosenColor,
    drawPile,
    discardPile,
    calledUno: false, // If now 1 card left, 5s window will start
    remainingHandLength: remainingHand.length,
    currentTime: now,
    turnDurationMs,
    unoDurationMs: params.unoDurationMs ?? 5000,
  });

  const isWinner = remainingHand.length === 0;
  if (isWinner && playResult.updatedRoom) {
    playResult.updatedRoom.status = 'finished';
    playResult.updatedRoom.winner_id = player.profile_id;
  }

  return {
    success: true,
    updatedRoom: {
      ...playResult.updatedRoom,
      pending_draw_decision: null,
    },
    updatedDrawPile: playResult.updatedDrawPile,
    updatedDiscardPile: playResult.updatedDiscardPile,
    updatedHand: remainingHand,
    isWinner,
    actionLog: playResult.actionLog,
    affectedPlayerId: playResult.affectedPlayerId,
    penaltyDrawnCards: playResult.penaltyDrawnCards,
  };
}

export interface PlayerDepartureParams {
  room: GameRoom;
  players: GamePlayer[];
  departingPlayerId: string;
  reason?: 'leave' | 'forfeit' | 'disconnect_timeout';
  currentTime?: number;
  turnDurationMs?: number;
}

export interface PlayerDepartureResult {
  success: boolean;
  error?: string;
  isGameOver: boolean;
  winnerPlayerId?: string | null;
  winReason?: string | null;
  updatedRoom: Partial<GameRoom>;
  remainingPlayers: GamePlayer[];
  departedPlayer: GamePlayer;
  actionLog: GameActionLog;
}

/**
 * Authoritative pure engine function for handling player departures, forfeits, and disconnect timeouts.
 * Handles 2-player forfeit (immediate winner declaration) and 3+ player continuation (skipping in turn rotation,
 * preserving game state, cancelling pending decisions/penalties, resetting timer if active turn).
 */
export function processPlayerDeparture(params: PlayerDepartureParams): PlayerDepartureResult {
  const { room, players, departingPlayerId, reason = 'leave' } = params;
  const now = params.currentTime ?? Date.now();
  const turnDurationMs = params.turnDurationMs ?? 30000;

  const departedPlayer = players.find((p) => p.profile_id === departingPlayerId);
  if (!departedPlayer) {
    return {
      success: false,
      error: 'Departing player not found in room',
      isGameOver: false,
      updatedRoom: {},
      remainingPlayers: players,
      departedPlayer: players[0] || ({} as GamePlayer),
      actionLog: {} as GameActionLog,
    };
  }

  const remainingPlayers = players.filter((p) => p.profile_id !== departingPlayerId);
  const departedName = departedPlayer.profile?.nickname || 'Player';

  // If match is not currently playing (e.g. lobby or finished)
  if (room.status !== 'playing') {
    const actionLog: GameActionLog = {
      type: 'player_left',
      playerId: departedPlayer.profile_id,
      playerName: departedName,
      message: `${departedName} left the room.`,
      timestamp: now,
    };

    return {
      success: true,
      isGameOver: false,
      updatedRoom: {
        last_action: actionLog,
      },
      remainingPlayers,
      departedPlayer,
      actionLog,
    };
  }

  // 1. If 0 players remain: game is abandoned
  if (remainingPlayers.length === 0) {
    const actionLog: GameActionLog = {
      type: 'player_left',
      playerId: departedPlayer.profile_id,
      playerName: departedName,
      message: `${departedName} left the game. Match abandoned.`,
      timestamp: now,
    };

    return {
      success: true,
      isGameOver: true,
      updatedRoom: {
        status: 'abandoned',
        turn_deadline: null,
        uno_declaration_deadline: null,
        uno_declaration_player_id: null,
        pending_draw_decision: null,
        last_action: actionLog,
      },
      remainingPlayers,
      departedPlayer,
      actionLog,
    };
  }

  // 2. If exactly ONE player remains (2-player game forfeit or last survivor):
  // Immediately declare the remaining active player the winner!
  if (remainingPlayers.length === 1) {
    const winner = remainingPlayers[0];
    const winnerName = winner.profile?.nickname || 'Player';
    const message = `${departedName} left the game. ${winnerName} wins!`;

    const actionLog: GameActionLog = {
      type: 'win',
      playerId: winner.profile_id,
      playerName: winnerName,
      message,
      timestamp: now,
    };

    return {
      success: true,
      isGameOver: true,
      winnerPlayerId: winner.profile_id,
      winReason: 'forfeit',
      updatedRoom: {
        status: 'finished',
        winner_id: winner.profile_id,
        win_reason: 'forfeit',
        turn_deadline: null,
        uno_declaration_deadline: null,
        uno_declaration_player_id: null,
        pending_draw_decision: null,
        last_action: actionLog,
      },
      remainingPlayers,
      departedPlayer,
      actionLog,
    };
  }

  // 3. Three or more players: match continues with remaining players
  const wasCurrentTurn = room.current_turn_seat === departedPlayer.seat_index;
  let nextTurnSeat = room.current_turn_seat;
  let nextTurnStartedAt = room.turn_started_at;
  let nextTurnDeadline = room.turn_deadline;

  if (wasCurrentTurn) {
    // Advance turn immediately to next eligible active player and reset turn timer
    nextTurnSeat = findNextActiveSeat(departedPlayer.seat_index, remainingPlayers, room.direction, 1);
    nextTurnStartedAt = new Date(now).toISOString();
    nextTurnDeadline = new Date(now + turnDurationMs).toISOString();
  }

  // Safely cancel / resolve pending decisions or UNO deadlines belonging to departed player
  const pendingDraw =
    room.pending_draw_decision?.player_id === departingPlayerId
      ? null
      : room.pending_draw_decision;

  const unoDeclarationDeadline =
    room.uno_declaration_player_id === departingPlayerId
      ? null
      : room.uno_declaration_deadline;

  const unoDeclarationPlayerId =
    room.uno_declaration_player_id === departingPlayerId
      ? null
      : room.uno_declaration_player_id;

  const unoChallengeTarget =
    room.uno_challenge_target === departingPlayerId
      ? null
      : room.uno_challenge_target;

  const message = `${departedName} left. Continuing with ${remainingPlayers.length} players.`;
  const actionLog: GameActionLog = {
    type: 'player_left',
    playerId: departedPlayer.profile_id,
    playerName: departedName,
    message,
    timestamp: now,
  };

  return {
    success: true,
    isGameOver: false,
    updatedRoom: {
      current_turn_seat: nextTurnSeat,
      turn_started_at: nextTurnStartedAt,
      turn_deadline: nextTurnDeadline,
      pending_draw_decision: pendingDraw,
      uno_declaration_deadline: unoDeclarationDeadline,
      uno_declaration_player_id: unoDeclarationPlayerId,
      uno_challenge_target: unoChallengeTarget,
      last_action: actionLog,
    },
    remainingPlayers,
    departedPlayer,
    actionLog,
  };
}
