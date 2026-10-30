import { describe, it, expect, vi, beforeEach } from 'vitest';
import { soundManager } from '../../audio/soundManager';
import {
  isSoundMuted,
  toggleSoundMuted,
  playCardDrawSound,
  playCardPlaySound,
  playFlipSound,
  playPenaltySound,
  playUnoSound,
  playTurnStartSound,
  playTurnWarningSound,
  playVictorySound,
  playDefeatSound,
} from '../../audio/sound';

describe('Web Audio SoundManager & 10 Game Event Sounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset sound manager to default state
    soundManager.setSoundEnabled(true);
    soundManager.setSoundEffectsEnabled(true);
    soundManager.setVolume(70);
  });

  it('initializes with expected default volume and states', () => {
    expect(soundManager.getVolume()).toBe(70);
    expect(soundManager.isSoundEnabled()).toBe(true);
    expect(soundManager.isSoundEffectsEnabled()).toBe(true);
  });

  it('clamps volume properly between 0 and 100', () => {
    soundManager.setVolume(-15);
    expect(soundManager.getVolume()).toBe(0);

    soundManager.setVolume(150);
    expect(soundManager.getVolume()).toBe(100);

    soundManager.setVolume(50);
    expect(soundManager.getVolume()).toBe(50);
  });

  it('toggles master sound enabled / muted state cleanly', () => {
    expect(soundManager.isSoundEnabled()).toBe(true);
    soundManager.setSoundEnabled(false);
    expect(soundManager.isSoundEnabled()).toBe(false);
    soundManager.setSoundEnabled(true);
    expect(soundManager.isSoundEnabled()).toBe(true);
  });

  it('plays all 10 required game events without throwing in any environment', () => {
    // 1. Draw a card
    expect(() => soundManager.playCardDraw()).not.toThrow();

    // 2. Play a card
    expect(() => soundManager.playCardPlay()).not.toThrow();

    // 3. Flip card
    expect(() => soundManager.playFlipCard()).not.toThrow();

    // 4. Penalty stacking (progressive sound)
    expect(() => soundManager.playPenaltyStack(2)).not.toThrow();
    expect(() => soundManager.playPenaltyStack(4)).not.toThrow();
    expect(() => soundManager.playPenaltyStack(8)).not.toThrow();

    // 5. Receive penalty cards (drawing sequence)
    expect(() => soundManager.playReceivePenalty(1)).not.toThrow();
    expect(() => soundManager.playReceivePenalty(4)).not.toThrow();

    // 6. Call UNO
    expect(() => soundManager.playCallUno()).not.toThrow();

    // 7. Turn starts
    expect(() => soundManager.playTurnStart()).not.toThrow();

    // 8. Turn timer warning
    expect(() => soundManager.playTurnWarning()).not.toThrow();

    // 9. Win the game
    expect(() => soundManager.playVictory()).not.toThrow();

    // 10. Lose the game
    expect(() => soundManager.playDefeat()).not.toThrow();
  });

  it('respects sound effects disabled setting', () => {
    soundManager.setSoundEffectsEnabled(false);
    expect(soundManager.isSoundEffectsEnabled()).toBe(false);

    // Should gracefully skip without errors
    expect(() => soundManager.playCardPlay()).not.toThrow();
    expect(() => soundManager.playVictory()).not.toThrow();
  });

  it('unlocks audio context on interaction without throwing', () => {
    expect(() => soundManager.unlockAudio()).not.toThrow();
  });

  it('provides backwards-compatible wrappers in sound.ts', () => {
    expect(isSoundMuted()).toBe(false);

    const toggled = toggleSoundMuted();
    expect(toggled).toBe(true);
    expect(isSoundMuted()).toBe(true);

    const restored = toggleSoundMuted();
    expect(restored).toBe(false);
    expect(isSoundMuted()).toBe(false);

    // Test wrapper delegates
    expect(() => playCardDrawSound()).not.toThrow();
    expect(() => playCardPlaySound()).not.toThrow();
    expect(() => playFlipSound()).not.toThrow();
    expect(() => playPenaltySound(2)).not.toThrow();
    expect(() => playUnoSound()).not.toThrow();
    expect(() => playTurnStartSound()).not.toThrow();
    expect(() => playTurnWarningSound()).not.toThrow();
    expect(() => playVictorySound()).not.toThrow();
    expect(() => playDefeatSound()).not.toThrow();
  });
});

