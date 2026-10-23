// Web Audio API sound effects for classic card game actions (no external audio assets needed)

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('uno_flip_sound_muted') === 'true';
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('uno_flip_sound_muted', muted ? 'true' : 'false');
}

export function toggleSoundMuted(): boolean {
  const current = isSoundMuted();
  const next = !current;
  setSoundMuted(next);
  return next;
}

/**
 * Plays a short, distinct penalty buzzer sound when a player is caught forgetting UNO.
 */
export function playPenaltySound(): void {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Two rapid descending sawtooth buzz tones
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.18);
    osc.frequency.setValueAtTime(260, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.42);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch {
    // Audio playback error safely ignored
  }
}

/**
 * Plays a cheerful celebratory chime when a player calls UNO.
 */
export function playUnoCallSound(): void {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.26);
    });
  } catch {
    // Audio playback error safely ignored
  }
}

/**
 * Plays a dynamic whoosh / flip sound effect when the deck or game flips sides.
 */
export function playFlipSound(): void {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Resonant whoosh sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.28);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);

    // Followed by a crisp snap/landing
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();

    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(350, now + 0.15);
    snapOsc.frequency.exponentialRampToValueAtTime(90, now + 0.35);

    snapGain.gain.setValueAtTime(0.12, now + 0.15);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);

    snapOsc.start(now + 0.15);
    snapOsc.stop(now + 0.35);
  } catch {
    // Audio playback error safely ignored
  }
}
