import { CardColor, GameActionLog, Side, UnoFlipCard } from './types';

export interface FormattedGameEvent {
  id: string;
  type: GameActionLog['type'];
  message: string;
  playerName: string;
  timestamp: number;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns a human-friendly card label, e.g. "Green 7", "Draw Two", "Wild (Blue)", "Reverse"
 */
export function formatCardPlayName(card: UnoFlipCard, side: Side, chosenColor?: CardColor): string {
  const face = side === 'light' ? card.light : card.dark;

  if (face.type === 'number') {
    return `${capitalize(face.color)} ${face.value}`;
  }

  switch (face.type) {
    case 'draw_one':
      return 'Draw One (+1)';
    case 'draw_two':
      return 'Draw Two (+2)';
    case 'draw_five':
      return 'Draw Five (+5)';
    case 'wild_draw_two':
      return chosenColor ? `Wild Draw Two (${capitalize(chosenColor)})` : 'Wild Draw Two (+2)';
    case 'wild_draw_five':
      return chosenColor ? `Wild Draw Five (${capitalize(chosenColor)})` : 'Wild Draw Five (+5)';
    case 'wild_draw_color':
      return chosenColor ? `Wild Draw Color (${capitalize(chosenColor)})` : 'Wild Draw Color';
    case 'reverse':
      return `${capitalize(face.color)} Reverse`;
    case 'skip':
      return `${capitalize(face.color)} Skip`;
    case 'skip_everyone':
      return `${capitalize(face.color)} Skip Everyone`;
    case 'flip':
      return 'Flip';
    case 'wild':
      return chosenColor ? `Wild (${capitalize(chosenColor)})` : 'Wild';
    default:
      return `${capitalize(face.color)} card`;
  }
}

/**
 * Generates a unique deduplication key for a game action
 */
export function getActionUniqueKey(action: GameActionLog): string {
  return `${action.timestamp}_${action.type}_${action.playerId}_${action.card?.id || ''}_${action.drawnCount || 0}_${action.targetPlayerId || ''}`;
}

/**
 * Formats authoritative GameActionLog into a concise, readable game message
 * Guaranteed never to reveal private card details of opponents
 */
export function formatGameActionMessage(action: GameActionLog, currentSide: Side): string {
  const name = action.playerName || 'Player';

  switch (action.type) {
    case 'play': {
      if (action.card) {
        // Determine the side on which the card was played
        // For flip cards or when side changed, use the face matching action.card
        const playSide = action.side && action.side !== currentSide ? (currentSide === 'light' ? 'dark' : 'light') : currentSide;
        const face = playSide === 'light' ? action.card.light : action.card.dark;

        if (face.type === 'flip') {
          return `${name} flipped to the ${action.side === 'dark' ? 'Dark' : 'Light'} Side`;
        }

        const cardName = formatCardPlayName(action.card, playSide, action.chosenColor);
        return `${name} played ${cardName}`;
      }

      // Fallback clean message
      return `${name} played a card`;
    }

    case 'flip':
      return `${name} flipped to the ${action.side === 'dark' ? 'Dark' : 'Light'} Side`;

    case 'draw': {
      const count = action.drawnCount || 1;
      return `${name} drew ${count} card${count > 1 ? 's' : ''}`;
    }

    case 'call_uno':
      return `${name} called UNO!`;

    case 'challenge_uno': {
      const target = action.targetPlayerName || 'opponent';
      return `${name} caught ${target} (+2 cards penalty)`;
    }

    case 'win':
      return `${name} wins!`;

    case 'pass':
      return `${name} passed turn`;

    case 'player_disconnected':
      return `${name} disconnected`;

    case 'player_reconnected':
      return `${name} reconnected`;

    case 'player_left':
    case 'forfeit':
      return `${name} left the match`;

    case 'start':
      return 'Match started';

    default:
      return action.message || `${name} acted`;
  }
}
