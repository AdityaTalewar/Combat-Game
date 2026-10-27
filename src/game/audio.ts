/**
 * Procedural Web Audio Engine for Tactical Military Combat Simulator
 * Generates high-fidelity weapon blasts, mechanical reloads, casing bounces,
 * bullet supersonic cracks, explosions, radio chatter, and tactical hit markers.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.75, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Powerful firearm blast with tailored profile based on caliber
   */
  public playGunshot(type: 'assault' | 'sniper' | 'shotgun' | 'pistol' | 'enemy') {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Transient sharp crack (supersonic muzzle pop)
    const crackLen = type === 'sniper' ? 0.08 : type === 'shotgun' ? 0.07 : 0.04;
    const crackBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * crackLen), this.ctx.sampleRate);
    const crackData = crackBuf.getChannelData(0);
    for (let i = 0; i < crackData.length; i++) {
      crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.012));
    }
    const crackSrc = this.ctx.createBufferSource();
    crackSrc.buffer = crackBuf;

    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(type === 'sniper' ? 3200 : 2200, t);

    const crackGain = this.ctx.createGain();
    const cVol = type === 'sniper' ? 1.0 : type === 'shotgun' ? 0.9 : type === 'pistol' ? 0.5 : 0.7;
    crackGain.gain.setValueAtTime(cVol, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + crackLen);

    crackSrc.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackSrc.start(t);

    // 2. Body blast (shaped noise burst)
    const bodyLen = type === 'sniper' ? 0.6 : type === 'shotgun' ? 0.45 : type === 'pistol' ? 0.2 : 0.35;
    const bodyBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * bodyLen), this.ctx.sampleRate);
    const bodyData = bodyBuf.getChannelData(0);
    for (let i = 0; i < bodyData.length; i++) {
      bodyData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.09));
    }
    const bodySrc = this.ctx.createBufferSource();
    bodySrc.buffer = bodyBuf;

    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    const cutoff = type === 'sniper' ? 850 : type === 'shotgun' ? 1200 : type === 'pistol' ? 900 : 1100;
    bodyFilter.frequency.setValueAtTime(cutoff, t);
    bodyFilter.frequency.exponentialRampToValueAtTime(120, t + bodyLen);

    const bodyGain = this.ctx.createGain();
    bodyGain.gain.setValueAtTime(type === 'sniper' ? 0.95 : 0.7, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + bodyLen);

    bodySrc.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(this.masterGain);
    bodySrc.start(t);

    // 3. Sub-bass punch (percussive sine thump)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    const startFreq = type === 'sniper' ? 150 : type === 'shotgun' ? 130 : 110;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.16);

    const punchVol = type === 'sniper' ? 1.0 : type === 'shotgun' ? 0.85 : 0.55;
    oscGain.gain.setValueAtTime(punchVol, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Bullet casing falling and bouncing on gravel or concrete
   */
  public playCasingDrop() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime + 0.35 + Math.random() * 0.1; // delay after shot
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = 2800 + Math.random() * 800;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.9, t + 0.05);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);

    // Second bounce
    const t2 = t + 0.1;
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.05, t2);
    gain2.gain.setValueAtTime(0.06, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.04);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.05);
  }

  /**
   * Tactical reload mechanical interactions (mag out, mag in, bolt release)
   */
  public playReloadStep(step: 'out' | 'in' | 'bolt') {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = step === 'bolt' ? 'sawtooth' : 'triangle';

    if (step === 'out') {
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.linearRampToValueAtTime(220, t + 0.08);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    } else if (step === 'in') {
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.linearRampToValueAtTime(620, t + 0.07);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    } else {
      // Bolt slap / rack
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.12);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Dry fire trigger click
   */
  public playDryFire() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.03);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Fire selector switch switch (Semi / Burst / Auto)
   */
  public playSelectorClick() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.linearRampToValueAtTime(1100, t + 0.03);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Steel target impact ding with pitch variation and resonance
   */
  public playSteelTargetDing(distanceMeters: number = 50) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Realistic acoustic delay (speed of sound ~340 m/s)
    const acousticDelay = Math.min(distanceMeters / 340, 1.2);
    const t = this.ctx.currentTime + acousticDelay;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1650, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2480, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.9);
    osc2.stop(t + 0.9);
  }

  /**
   * Tactical Hit marker audio feedback (tactile body thud or kill confirm ding)
   */
  public playHitMarker(isFatal: boolean = false, isHeadshot: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (isHeadshot) {
      // Crisp metallic helmet ping
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, t);
      osc.frequency.exponentialRampToValueAtTime(1750, t + 0.12);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    } else if (isFatal) {
      // Distinct double tone kill confirm
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1320, t + 0.06);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    } else {
      // Soft tactical tick
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(240, t + 0.04);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  /**
   * Grenade explosion / explosive barrel blast with massive low end and debris rumble
   */
  public playExplosion() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Sub rumble
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(85, t);
    sub.frequency.exponentialRampToValueAtTime(24, t + 0.8);
    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 1.3);

    // Blast noise
    const len = 1.2;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * len), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.35));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + len);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + len);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(t);
  }

  /**
   * Procedural synthesized tactical military radio chatter
   */
  public playRadioChatter(type: 'contact' | 'reloading' | 'clear' | 'take_cover') {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Squelch / burst tone
    const squelch = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    squelch.type = 'sawtooth';
    squelch.frequency.setValueAtTime(1200, t);
    squelch.frequency.linearRampToValueAtTime(1450, t + 0.04);
    sGain.gain.setValueAtTime(0.12, t);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    squelch.connect(sGain);
    sGain.connect(this.masterGain);
    squelch.start(t);
    squelch.stop(t + 0.06);

    // Synthesized radio voice cadence
    const durations = type === 'contact' ? [0.08, 0.12, 0.09] : [0.1, 0.1, 0.15];
    let offset = 0.06;
    for (let i = 0; i < durations.length; i++) {
      const vOsc = this.ctx.createOscillator();
      const vGain = this.ctx.createGain();
      const vFilter = this.ctx.createBiquadFilter();

      vFilter.type = 'bandpass';
      vFilter.frequency.value = 1600;
      vFilter.Q.value = 3.5;

      vOsc.type = 'triangle';
      const baseFreq = type === 'contact' ? 240 + i * 40 : 200 + (durations.length - i) * 30;
      vOsc.frequency.setValueAtTime(baseFreq, t + offset);
      vOsc.frequency.linearRampToValueAtTime(baseFreq * 0.9, t + offset + durations[i]);

      vGain.gain.setValueAtTime(0.16, t + offset);
      vGain.gain.exponentialRampToValueAtTime(0.001, t + offset + durations[i]);

      vOsc.connect(vFilter);
      vFilter.connect(vGain);
      vGain.connect(this.masterGain);

      vOsc.start(t + offset);
      vOsc.stop(t + offset + durations[i]);
      offset += durations[i] + 0.04;
    }
  }

  /**
   * Footstep sound matching soldier stance & speed
   */
  public playFootstep(isSprinting: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80 + Math.random() * 30, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.07);

    gain.gain.setValueAtTime(isSprinting ? 0.22 : 0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }
}

export const audio = new SoundEngine();
