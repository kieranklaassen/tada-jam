import type { Species } from './motion'
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

    // A small, warm room: a procedural decaying-noise impulse, no recorded assets.
    const impulseLength = Math.round(context.sampleRate * 0.7)
    const impulse = context.createBuffer(2, impulseLength, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel)
      for (let i = 0; i < impulseLength; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / impulseLength) ** 3
    }
    const convolver = context.createConvolver()
    convolver.buffer = impulse
    const warm = context.createBiquadFilter()
    warm.type = 'lowpass'
    warm.frequency.value = 2400
    const room = context.createGain()
    room.gain.value = 0.16
    master.connect(room).connect(warm).connect(convolver).connect(compressor)

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

  /** A soft clay pat under the finger. */
  touch(size = 1): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(330 / size, 'sine', 0.16, 0.004, 0.11, now, 210 / size)
    this.noiseBurst(900, 1.4, 0.06, 0.04, now, 'lowpass')
  }

  /** Clay on clay: a dull thock with a low body, as loud as the hit. */
  clack(intensity: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (now - this.lastClack < 0.025) return
    this.lastClack = now
    const level = Math.min(1, intensity)
    this.noiseBurst(1000 + Math.random() * 500, 2.2, 0.08 + level * 0.26, 0.045, now)
    this.tone(260 + Math.random() * 90, 'sine', 0.06 + level * 0.16, 0.002, 0.07, now, 150)
  }

  /** The cloth bag tipping. */
  rustle(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (let i = 0; i < 5; i++) this.noiseBurst(700 + i * 260, 1.1, 0.11, 0.13, now + i * 0.045, 'bandpass')
  }

  /** Stones dropping home into the cloth bag: muffled knocks and a soft thump. */
  clatter(count = 1): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (let i = 0; i < Math.min(5, count + 2); i++) {
      this.noiseBurst(700 + Math.random() * 500, 2, 0.2, 0.06, now + i * 0.05 + Math.random() * 0.02, 'lowpass')
    }
    this.tone(140, 'sine', 0.22, 0.006, 0.2, now, 90)
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

  /** One beat of the number voice, `delay` seconds from now: a soft marimba bar. */
  beat(step: number, delay: number): void {
    const context = this.ready()
    if (!context) return
    const at = context.currentTime + delay
    const frequency = PENTATONIC[step % PENTATONIC.length]
    this.tone(frequency, 'sine', 0.24, 0.004, 0.5, at)
    this.tone(frequency * 4.01, 'sine', 0.06, 0.002, 0.07, at)
    this.tone(frequency * 2.99, 'triangle', 0.03, 0.003, 0.15, at)
  }

  /** The table settling when shares are fair: a soft, warm chord that blooms. */
  chord(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (const [i, f] of [261.63, 329.63, 392, 523.25].entries()) {
      this.tone(f, 'sine', 0.08, 0.12, 1.6, now + i * 0.07)
      this.tone(f * 1.003, 'triangle', 0.025, 0.14, 1.2, now + i * 0.07)
    }
  }

  /** Three "noms": a little vowel glide with a soft crunch. */
  munch(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (let i = 0; i < 3; i++) {
      const at = now + 0.22 + i * 0.3
      this.tone(290, 'triangle', 0.09, 0.02, 0.14, at, 210)
      this.noiseBurst(1400, 1.5, 0.08, 0.05, at + 0.04, 'bandpass')
    }
  }

  /** A springy boing: up, overshoot, settle. */
  /** A knock on the little house's door: the child's is bright and close, the house's answer deeper, from inside. */
  knock(fromHouse: boolean, delay = 0): void {
    const context = this.ready()
    if (!context) return
    const at = context.currentTime + delay
    this.noiseBurst(fromHouse ? 520 : 900, 3, fromHouse ? 0.22 : 0.3, 0.06, at)
    this.tone(fromHouse ? 150 : 210, 'sine', fromHouse ? 0.2 : 0.16, 0.003, 0.09, at, fromHouse ? 110 : 160)
  }

  /** The empty bowl, tapped: a soft clay chime. */
  ding(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(784, 'sine', 0.16, 0.004, 0.9, now)
    this.tone(1568, 'sine', 0.04, 0.004, 0.5, now)
    this.tone(1175, 'triangle', 0.03, 0.01, 0.6, now + 0.02)
  }

  /** The empty bag, tapped: a small deflating sigh. */
  sigh(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.noiseBurst(700, 0.8, 0.12, 0.45, now, 'lowpass')
    this.tone(260, 'sine', 0.06, 0.05, 0.4, now, 170)
  }

  /** A visitor squeaks when poked. */
  squeak(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(1300 + Math.random() * 300, 'sine', 0.08, 0.004, 0.08, now, 1900)
  }

  /** A hungry tummy, in the guest's own register: a soft low rumble, never a nag. */
  rumble(species: Species): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    const base = species === 'bear' ? 70 : species === 'rabbit' ? 115 : 150
    this.tone(base, 'sine', 0.12, 0.08, 0.35, now, base * 0.8)
    this.tone(base * 1.1, 'sine', 0.09, 0.06, 0.3, now + 0.28, base * 0.75)
    this.noiseBurst(300, 1, 0.05, 0.4, now, 'lowpass')
  }

  /** A guest being poked, in its own voice: a squeaky giggle, a low happy hum, or a tiny sniff-squeak. */
  poke(species: Species): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    switch (species) {
      case 'rabbit':
        for (let i = 0; i < 4; i++) this.tone(820 + i * 90 + Math.random() * 40, 'sine', 0.1, 0.005, 0.06, now + i * 0.075, 1000 + i * 90)
        return
      case 'bear':
        this.tone(150, 'triangle', 0.16, 0.04, 0.22, now, 128)
        this.tone(175, 'triangle', 0.14, 0.04, 0.3, now + 0.26, 140)
        return
      case 'hedgehog':
        this.noiseBurst(3200, 2, 0.08, 0.05, now, 'highpass')
        this.noiseBurst(3600, 2, 0.07, 0.04, now + 0.09, 'highpass')
        this.tone(1250, 'sine', 0.08, 0.004, 0.09, now + 0.18, 1650)
        return
      default: {
        const unknown: never = species
        return unknown
      }
    }
  }

  hop(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(280, 'sine', 0.13, 0.01, 0.12, now, 760)
    this.tone(760, 'sine', 0.08, 0.005, 0.16, now + 0.12, 520)
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
