/**
 * Backward compatibility wrapper delegating to modern SoundManager.
 * Preserves existing signatures while wiring to unified settings & audio context.
 */

import { soundManager } from './soundManager';

let memoryMuted = false;

export function isSoundMuted(): boolean {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem('uno_flip_sound_muted') === 'true';
  }
  return memoryMuted;
}

export function setSoundMuted(muted: boolean): void {
  memoryMuted = muted;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem('uno_flip_sound_muted', muted ? 'true' : 'false');
  }
  soundManager.updateSettings(!muted, true, muted ? 0 : 80);
}

export function toggleSoundMuted(): boolean {
  const current = isSoundMuted();
  const next = !current;
  setSoundMuted(next);
  return next;
}

export function playPenaltySound(count?: number): void {
  soundManager.playReceivePenalty(count || 2);
}

export function playUnoCallSound(): void {
  soundManager.playCallUno();
}

export function playUnoSound(): void {
  soundManager.playCallUno();
}

export function playFlipSound(): void {
  soundManager.playFlipCard();
}

export function playCardDrawSound(): void {
  soundManager.playCardDraw();
}

export function playCardPlaySound(): void {
  soundManager.playCardPlay();
}

export function playTurnStartSound(): void {
  soundManager.playTurnStart();
}

export function playTurnWarningSound(): void {
  soundManager.playTurnWarning();
}

export function playVictorySound(): void {
  soundManager.playVictory();
}

export function playDefeatSound(): void {
  soundManager.playDefeat();
}
