/**
 * Web Audio API synthesizer for emergency alarms and cues.
 * Doesn't rely on external MP3 assets, ensuring 100% offline & robust playback.
 */

class StaffAudioService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private sirenIntervalId: number | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopEmergencySiren();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play a dual-frequency continuous emergency siren (Hi-Lo siren).
   */
  public playEmergencySiren(): void {
    if (this.isMuted) return;

    this.stopEmergencySiren();
    const ctx = this.getAudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, ctx.currentTime);

    // Subtle lowpass filter to prevent piercing harshness
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    this.activeOscillators.push(osc);
    this.activeGainNodes.push(gain);

    let high = true;
    this.sirenIntervalId = window.setInterval(() => {
      if (!this.audioCtx || this.isMuted) return;
      const targetFreq = high ? 960 : 700;
      high = !high;
      osc.frequency.exponentialRampToValueAtTime(targetFreq, this.audioCtx.currentTime + 0.28);
    }, 380);
  }

  /**
   * Stop the active emergency siren.
   */
  public stopEmergencySiren(): void {
    if (this.sirenIntervalId !== null) {
      clearInterval(this.sirenIntervalId);
      this.sirenIntervalId = null;
    }

    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    });
    this.activeOscillators = [];

    this.activeGainNodes.forEach((gain) => {
      try {
        gain.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeGainNodes = [];
  }

  /**
   * Play a quick priority beep alert (3 short pulses).
   */
  public playPriorityBeep(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();

    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now + i * 0.16);

      gain.gain.setValueAtTime(0, now + i * 0.16);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.13);
    }
  }

  /**
   * Play success notification chime (for status updates & report submit).
   */
  public playSuccessChime(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  }
}

export const staffAudioService = new StaffAudioService();
