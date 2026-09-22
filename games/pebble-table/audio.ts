// Every sound on the table is synthesized with raw Web Audio (KTD7): clay
// clacks, a cloth rustle, the beam's creak, and the pentatonic number voice.
// The context is only created inside the child's first real tap, is
// suspended while the table is unattended or hidden, and is rebuilt if
// WebKit leaves it `interrupted` or `closed` after backgrounding.

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66]

type ExtendedState = AudioContextState | 'interrupted'

export class TableAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private creakOsc: OscillatorNode | null = null
  private creakFilter: BiquadFilterNode | null = null
  private creakGain: GainNode | null = null
  private active = true
  private lastClack = 0

  /** Call from inside a pointerdown: creates or revives the context. */
  unlock(): void {
    const state = this.context?.state as ExtendedState | undefined
    if (this.context && (state === 'closed' || state === 'interrupted')) this.teardown()
    if (!this.context) this.build()
    if (this.active && this.context?.state === 'suspended') void this.context.resume()
  }

  setActive(active: boolean): void {
    this.active = active
    if (!this.context) return
    if (active) void this.context.resume()
    else {
      this.creak(0, 200)
      void this.context.suspend()
    }
  }

  dispose(): void {
    this.teardown()
  }

  private build(): void {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    const context = new AudioCtor()
    const master = context.createGain()
    master.gain.value = 0.7
    const compressor = context.createDynamicsCompressor()
    master.connect(compressor).connect(context.destination)
    const noise = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    const creakOsc = context.createOscillator()
    creakOsc.type = 'sawtooth'
    creakOsc.frequency.value = 150
    const creakFilter = context.createBiquadFilter()
    creakFilter.type = 'bandpass'
    creakFilter.Q.value = 6
    creakFilter.frequency.value = 600
    const creakGain = context.createGain()
    creakGain.gain.value = 0
    creakOsc.connect(creakFilter).connect(creakGain).connect(master)
    creakOsc.start()

    Object.assign(this, { context, master, noise, creakOsc, creakFilter, creakGain })
  }

  private teardown(): void {
    try {
      this.creakOsc?.stop()
    } catch {
      // already stopped
    }
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
    this.creakOsc = null
    this.creakFilter = null
    this.creakGain = null
  }

  private ready(): AudioContext | null {
    return this.active && this.context && this.context.state === 'running' ? this.context : null
  }

  private envelope(context: AudioContext, peak: number, attack: number, decay: number, at: number): GainNode {
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
    gain.connect(this.master!)
    return gain
  }

  private noiseBurst(frequency: number, q: number, peak: number, decay: number, at: number, type: BiquadFilterType = 'bandpass'): void {
    const context = this.context!
    const source = context.createBufferSource()
    source.buffer = this.noise
    source.playbackRate.value = 0.8 + Math.random() * 0.4
    const filter = context.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    filter.Q.value = q
    source.connect(filter).connect(this.envelope(context, peak, 0.003, decay, at))
    source.start(at, Math.random() * 0.5, decay + 0.05)
  }

  private tone(frequency: number, type: OscillatorType, peak: number, attack: number, decay: number, at: number, glideTo?: number): void {
    const context = this.context!
    const osc = context.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, at)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + attack + decay)
    osc.connect(this.envelope(context, peak, attack, decay, at))
    osc.start(at)
    osc.stop(at + attack + decay + 0.05)
  }

  /** A soft wooden tick under the finger. */
  touch(size = 1): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(420 / size, 'sine', 0.18, 0.004, 0.09, now)
    this.noiseBurst(2400, 3, 0.05, 0.03, now)
  }

  /** Clay on clay, as loud as the hit. */
  clack(intensity: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (now - this.lastClack < 0.025) return
    this.lastClack = now
    const level = Math.min(1, intensity)
    this.noiseBurst(1800 + Math.random() * 900, 4, 0.08 + level * 0.3, 0.05, now)
    this.tone(900 + Math.random() * 300, 'triangle', 0.04 + level * 0.1, 0.002, 0.05, now)
  }

  /** The cloth bag tipping. */
  rustle(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (let i = 0; i < 4; i++) this.noiseBurst(900 + i * 300, 1.2, 0.12, 0.12, now + i * 0.05, 'bandpass')
  }

  /** Stones dropping home into the bag. */
  clatter(count = 1): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (let i = 0; i < Math.min(5, count + 2); i++) {
      this.noiseBurst(1500 + Math.random() * 1200, 5, 0.22, 0.05, now + i * 0.045 + Math.random() * 0.02)
    }
    this.tone(160, 'sine', 0.2, 0.005, 0.18, now)
  }

  /** Continuous beam creak: gain 0 is silence. */
  creak(gain: number, pitch: number): void {
    if (!this.context || !this.creakGain || !this.creakOsc || !this.creakFilter) return
    const now = this.context.currentTime
    const level = this.active ? gain * 0.12 : 0
    this.creakGain.gain.setTargetAtTime(level, now, 0.05)
    this.creakOsc.frequency.setTargetAtTime(pitch, now, 0.08)
    this.creakFilter.frequency.setTargetAtTime(pitch * 4, now, 0.08)
  }

  /** One beat of the number voice, `delay` seconds from now. */
  beat(step: number, delay: number): void {
    const context = this.ready()
    if (!context) return
    const at = context.currentTime + delay
    const frequency = PENTATONIC[step % PENTATONIC.length]
    this.tone(frequency, 'sine', 0.26, 0.005, 0.42, at)
    this.tone(frequency * 2, 'triangle', 0.05, 0.003, 0.18, at)
  }

  /** The table settling when shares are fair: a soft, low chord. */
  chord(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (const [i, f] of [261.63, 329.63, 392].entries()) this.tone(f, 'sine', 0.1, 0.08, 1.4, now + i * 0.06)
  }

  munch(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (let i = 0; i < 3; i++) this.noiseBurst(700, 1.5, 0.16, 0.07, now + i * 0.22, 'lowpass')
  }

  hop(): void {
    const context = this.ready()
    if (!context) return
    this.tone(360, 'sine', 0.14, 0.01, 0.2, context.currentTime, 720)
  }

  whoosh(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.noiseBurst(500, 0.8, 0.14, 0.35, now, 'lowpass')
    this.tone(110, 'sine', 0.18, 0.01, 0.2, now + 0.3)
  }

  snick(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.noiseBurst(5200, 6, 0.22, 0.04, now, 'highpass')
    this.tone(1400, 'triangle', 0.06, 0.002, 0.08, now)
  }
}
