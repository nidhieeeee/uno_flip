/**
 * Professional Web Audio API Sound System for UNO FLIP
 * 100% original, royalty-free synthesized audio assets with zero external dependencies.
 * Full support for Master Sound, Sound Effects, Volume (0-100%), and browser autoplay unlocking.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isUnlocked: boolean = false;

  private soundEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private volume: number = 0.8; // 0.0 to 1.0

  constructor() {
    if (typeof window !== 'undefined') {
      this.attachUnlockListeners();
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      this.ctx = new AudioContextClass();

      // Master Gain -> Destination
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.soundEnabled ? this.volume : 0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain -> Master Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 1 : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Unlock AudioContext on first user gesture to comply with browser autoplay policies.
   */
  public unlockAudio(): void {
    if (this.isUnlocked) return;
    const ctx = this.initContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.isUnlocked = true;
      }).catch(() => {});
    } else {
      this.isUnlocked = true;
    }
  }

  private attachUnlockListeners(): void {
    const handleGesture = () => {
      this.unlockAudio();
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };

    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
  }

  /**
   * Updates player sound settings dynamically in real time without reloading.
   */
  public updateSettings(soundEnabled: boolean, sfxEnabled: boolean, volumePercent: number): void {
    this.soundEnabled = soundEnabled;
    this.sfxEnabled = sfxEnabled;
    this.volume = Math.max(0, Math.min(100, volumePercent)) / 100;

    if (this.ctx && this.masterGain && this.sfxGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.soundEnabled ? this.volume : 0, now);

      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 1 : 0, now);
    }
  }

  public getVolume(): number {
    return Math.round(this.volume * 100);
  }

  public setVolume(volumePercent: number): void {
    this.updateSettings(this.soundEnabled, this.sfxEnabled, volumePercent);
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.updateSettings(enabled, this.sfxEnabled, this.getVolume());
  }

  public isSoundEffectsEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setSoundEffectsEnabled(enabled: boolean): void {
    this.updateSettings(this.soundEnabled, enabled, this.getVolume());
  }

  private canPlay(): boolean {
    return this.soundEnabled && this.sfxEnabled && this.volume > 0;
  }

  /**
   * Helper to get output destination for SFX
   */
  private getDestination(): GainNode | null {
    if (!this.canPlay()) return null;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return null;
    return this.sfxGain;
  }

  // =========================================================================
  // 1. DRAW A CARD: Soft, tactile card-drawing slide sound (120ms)
  // =========================================================================
  public playCardDraw(): void {
    const dest = this.getDestination();
    const ctx = this.ctx;
    if (!dest || !ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  // =========================================================================
  // 2. PLAY A CARD: Short, crisp card-placement snap / thud (90ms)
  // =========================================================================
  public playCardPlay(): void {
    const dest = this.getDestination();
    const ctx = this.ctx;
    if (!dest || !ctx) return;

    try {
      const now = ctx.currentTime;

      // Click transient
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(650, now);
      clickOsc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

      clickGain.gain.setValueAtTime(0.28, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      clickOsc.connect(clickGain);
      clickGain.connect(dest);

      clickOsc.start(now);
      clickOsc.stop(now + 0.05);

      // Soft body thud
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(180, now);
      thudOsc.frequency.exponentialRampToValueAtTime(70, now + 0.09);

      thudGain.gain.setValueAtTime(0.24, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      thudOsc.connect(thudGain);
      thudGain.connect(dest);

      thudOsc.start(now);
      thudOsc.stop(now + 0.1);
    } catch {}
  }

  // =========================================================================
  // 3. FLIP CARD: Distinctive dual-tone whoosh with resonant snap (280ms)
  // =========================================================================
  public playFlipCard(): void {
    const dest = this.getDestination();
    const ctx = this.ctx;
    if (!dest || !ctx) return;

    try {
      const now = ctx.currentTime;

      // Resonant whoosh sweep
      const whooshOsc = ctx.createOscillator();
      const whooshGain = ctx.createGain();
      whooshOsc.type = 'sine';
      whooshOsc.frequency.setValueAtTime(580, now);
      whooshOsc.frequency.exponentialRampToValueAtTime(160, now + 0.22);

      whooshGain.gain.setValueAtTime(0.25, now);
      whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      whooshOsc.connect(whooshGain);
      whooshGain.connect(dest);

      whooshOsc.start(now);
      whooshOsc.stop(now + 0.24);

      // Crisp landing snap
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(380, now + 0.12);
      snapOsc.frequency.exponentialRampToValueAtTime(90, now + 0.28);

      snapGain.gain.setValueAtTime(0.2, now + 0.12);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      snapOsc.connect(snapGain);
      snapGain.connect(dest);

      snapOsc.start(now + 0.12);
      snapOsc.stop(now + 0.28);
    } catch {}
  }

  // =========================================================================
  // 4. PENALTY STACKING: Progressive tension chord that scales with stack count
  // =========================================================================
  public playPenaltyStack(stackCount: number = 2): void {
    const dest = this.getDestination();
    const ctx = this.ctx;
    if (!dest || !ctx) return;

    try {
      const now = ctx.currentTime;
      // Frequency rises with higher penalty stacks (+2: 320Hz, +4: 400Hz, +6: 480Hz, +8: 580Hz)
      const baseFreq = Math.min(680, 280 + stackCount * 36);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.18);

      osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.88, now + 0.18);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.22);
      osc2.stop(now + 0.22);
    } catch {}
  }

  // =========================================================================
  // 5. RECEIVE PENALTY CARDS: Rapid sequential card-drawing flutter (280ms)
  // =========================================================================
  public playReceivePenalty(cardCount: number = 2): void {
    const dest = this.getDestination();
    const ctx = this.ctx;
    if (!dest || !ctx) return;

    try {
      const now = ctx.currentTime;
      const ticks = Math.min(4, Math.max(2, cardCount));

      for (let i = 0; i < ticks; i++) {
        const offset = now + i * 0.065;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320 - i * 35, offset);
        osc.frequency.exponentialRampToValueAtTime(140, offset + 0.08);

        gain.gain.setValueAtTime(0.18, offset);
        gain.gain.exponentialRampToValueAtTime(0.001, offset + 0.08);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(offset);
        osc.stop(offset + 0.085);
      }
    } catch {}
  }

  // =========================================================================
  // 6. CALL UNO: Cheerful, bright double-chime notification (C5 -> G5) (220ms)
  // =========================================================================
  public playCallUno(): void {
    const dest = this.getDestination();
    const ctx = this.ctx;
    if (!dest || !ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 783.99]; // C5, G5

      notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.24, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(startTime);
        osc.stop(startTime + 0.21);
      });
    } catch {}
  }

  // =========================================================================
  // 7. TURN STARTS: Subtle, polite turn notification chime (E5 -> A5) (180ms)
  // =========================================================================
  public playTurnStart(): void {
    const dest = this.getDestination();
    const ctx = this.ctx;
    if (!dest || !ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 880.0]; // E5, A5

      notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(startTime);
        osc.stop(startTime + 0.17);
      });
    } catch {}
  }

  // =========================================================================
  // 8. TURN TIMER WARNING: Soft, non-intrusive clock warning pulse (80ms)
  // =========================================================================
  public playTurnWarning(): void {
    const dest = this.getDestination();
    const ctx = this.ctx;
    if (!dest || !ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.07);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  // =========================================================================
  // 9. WIN THE GAME: Celebratory victory fanfare arpeggio (450ms)
  // =========================================================================
  public playVictory(): void {
    const dest = this.getDestination();
    const ctx = this.ctx;
    if (!dest || !ctx) return;

    try {
      const now = ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      chord.forEach((freq, idx) => {
        const startTime = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.24, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch {}
  }

  // =========================================================================
  // 10. LOSE THE GAME: Subtle, calm match result sound (320ms)
  // =========================================================================
  public playDefeat(): void {
    const dest = this.getDestination();
    const ctx = this.ctx;
    if (!dest || !ctx) return;

    try {
      const now = ctx.currentTime;
      const chord = [440.0, 392.0, 349.23]; // A4, G4, F4 descending gentle

      chord.forEach((freq, idx) => {
        const startTime = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.24);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch {}
  }
}

// Global singleton instance
export const soundManager = new SoundManager();
