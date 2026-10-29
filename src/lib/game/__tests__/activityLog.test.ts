import { describe, it, expect } from 'vitest';
import { formatGameActionMessage, getActionUniqueKey } from '../activityLog';
import { GameActionLog, UnoFlipCard } from '../types';

describe('Activity Log Formatter', () => {
  const sampleCard: UnoFlipCard = {
    id: 'c-1',
    light: { color: 'green', type: 'number', value: 7 },
    dark: { color: 'teal', type: 'draw_five' },
  };

  const sampleFlipCard: UnoFlipCard = {
    id: 'c-flip',
    light: { color: 'yellow', type: 'flip' },
    dark: { color: 'orange', type: 'flip' },
  };

  const sampleDrawTwoCard: UnoFlipCard = {
    id: 'c-d2',
    light: { color: 'blue', type: 'draw_two' },
    dark: { color: 'purple', type: 'number', value: 3 },
  };

  it('formats number card plays properly ("Alex played Green 7")', () => {
    const action: GameActionLog = {
      type: 'play',
      playerId: 'p1',
      playerName: 'Alex',
      card: sampleCard,
      side: 'light',
      message: 'Alex played green 7',
      timestamp: 1000,
    };
    expect(formatGameActionMessage(action, 'light')).toBe('Alex played Green 7');
  });

  it('formats Draw Two card plays properly ("Sam played Draw Two")', () => {
    const action: GameActionLog = {
      type: 'play',
      playerId: 'p2',
      playerName: 'Sam',
      card: sampleDrawTwoCard,
      side: 'light',
      message: 'Sam played blue draw_two',
      timestamp: 2000,
    };
    expect(formatGameActionMessage(action, 'light')).toBe('Sam played Draw Two (+2)');
  });

  it('formats flip card plays properly ("Nidhi flipped to the Dark Side")', () => {
    const action: GameActionLog = {
      type: 'flip',
      playerId: 'p3',
      playerName: 'Nidhi',
      card: sampleFlipCard,
      side: 'dark',
      message: 'Nidhi played flip',
      timestamp: 3000,
    };
    expect(formatGameActionMessage(action, 'dark')).toBe('Nidhi flipped to the Dark Side');
  });

  it('formats draw actions properly ("Alex drew 4 cards")', () => {
    const action: GameActionLog = {
      type: 'draw',
      playerId: 'p1',
      playerName: 'Alex',
      drawnCount: 4,
      message: 'Alex drew 4 cards',
      timestamp: 4000,
    };
    expect(formatGameActionMessage(action, 'light')).toBe('Alex drew 4 cards');
  });

  it('formats UNO calls properly ("Sam called UNO!")', () => {
    const action: GameActionLog = {
      type: 'call_uno',
      playerId: 'p2',
      playerName: 'Sam',
      message: 'Sam declared UNO!',
      timestamp: 5000,
    };
    expect(formatGameActionMessage(action, 'light')).toBe('Sam called UNO!');
  });

  it('formats win event properly ("Nidhi wins!")', () => {
    const action: GameActionLog = {
      type: 'win',
      playerId: 'p3',
      playerName: 'Nidhi',
      message: 'Nidhi has won the game!',
      timestamp: 6000,
    };
    expect(formatGameActionMessage(action, 'light')).toBe('Nidhi wins!');
  });

  it('generates consistent unique keys for deduplication', () => {
    const action1: GameActionLog = {
      type: 'draw',
      playerId: 'p1',
      playerName: 'Alex',
      drawnCount: 2,
      message: 'Alex drew 2 cards',
      timestamp: 7000,
    };
    const action2: GameActionLog = { ...action1 };

    expect(getActionUniqueKey(action1)).toBe(getActionUniqueKey(action2));
  });

  it('never reveals opponents private card identities during draw actions', () => {
    const opponentDrawAction: GameActionLog = {
      type: 'draw',
      playerId: 'opp-1',
      playerName: 'Opponent',
      drawnCount: 1,
      message: 'Opponent drew 1 card',
      timestamp: 8000,
    };
    const formatted = formatGameActionMessage(opponentDrawAction, 'light');
    expect(formatted).toBe('Opponent drew 1 card');
    expect(formatted).not.toContain('color');
    expect(formatted).not.toContain('value');
  });
});

