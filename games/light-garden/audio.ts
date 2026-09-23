import type { Sound } from './controller'
import type { CreatureEvent } from './creatures'
import type { CreatureKind, PieceKind } from './layout'

// Every sound is synthesized with raw Web Audio: sea glass on a lit glass
// top, a knob's soft detents, felt, and a little song for each creature as
// it wakes. The context is created inside the child's first tap, suspended
// whenever the garden is unattended or hidden, and rebuilt if WebKit leaves
// it `interrupted` or `closed` after backgrounding.

type ExtendedState = AudioContextState | 'interrupted'

// A major pentatonic from D: every creature's song sits in it, so any two
// overlapping wakes still sound like one garden.
const D = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51]

/** Glass rings with inharmonic partials; these ratios read as a small, thick pane. */
const GLASS_PARTIALS = [1, 2.32, 4.25, 6.63]

export class GardenAudio implements Sound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private active = true
  private lastTick = 0
  private lastDrop = 0

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
    else void this.context.suspend()
  }

  dispose(): void {
    this.teardown()
  }

  private build(): void {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    const context = new AudioCtor()
    const master = context.createGain()
    master.gain.value = 0.6
    const compressor = context.createDynamicsCompressor()
    master.connect(compressor).connect(context.destination)

    const noise = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    // A long, soft, dim room so glass notes bloom and fade: a procedural
    // impulse with a slow darkening tail, no recorded assets.
    const length = Math.round(context.sampleRate * 2.2)
    const impulse = context.createBuffer(2, length, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel)
      let smooth = 0
      for (let i = 0; i < length; i++) {
        const k = i / length
        smooth += ((Math.random() * 2 - 1) - smooth) * (0.9 - k * 0.75)
        samples[i] = smooth * (1 - k) ** 2.6
      }
    }
    const convolver = context.createConvolver()
    convolver.buffer = impulse
    const send = context.createGain()
    send.gain.value = 0.34
    master.connect(send).connect(convolver).connect(compressor)

    Object.assign(this, { context, master, noise })
  }

  private teardown(): void {
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
  }

  private ready(): AudioContext | null {
    return this.active && this.context && this.context.state === 'running' ? this.context : null
  }

  private envelope(context: AudioContext, peak: number, attack: number, decay: number, at: number, pan = 0): GainNode {
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
    if (pan !== 0 && context.createStereoPanner) {
      const panner = context.createStereoPanner()
      panner.pan.value = pan
      gain.connect(panner).connect(this.master!)
    } else gain.connect(this.master!)
    return gain
  }

  private tone(frequency: number, type: OscillatorType, peak: number, attack: number, decay: number, at: number, glideTo?: number, pan = 0): void {
    const context = this.context!
    const osc = context.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, at)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + attack + decay)
    osc.connect(this.envelope(context, peak, attack, decay, at, pan))
    osc.start(at)
    osc.stop(at + attack + decay + 0.05)
  }

  private noiseBurst(frequency: number, q: number, peak: number, attack: number, decay: number, at: number, type: BiquadFilterType = 'bandpass'): void {
    const context = this.context!
    const source = context.createBufferSource()
    source.buffer = this.noise
    source.playbackRate.value = 0.8 + Math.random() * 0.4
    const filter = context.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    filter.Q.value = q
    source.connect(filter).connect(this.envelope(context, peak, attack, decay, at))
    source.start(at, Math.random() * 0.5, attack + decay + 0.05)
  }

  /** One struck pane: a fundamental and its glassy overtones, the high ones dying first. */
  private glass(frequency: number, peak: number, decay: number, at: number, pan = 0): void {
    GLASS_PARTIALS.forEach((ratio, i) => {
      this.tone(frequency * ratio, 'sine', peak / (1 + i * 1.6), 0.002, decay / (1 + i * 0.9), at, undefined, pan)
    })
  }

  private pieceNote(kind: PieceKind): number {
    switch (kind) {
      case 'lamp':
        return D[2]
      case 'mirror':
        return D[5]
      case 'prism':
        return D[7]
      case 'filter':
        return D[4]
      default: {
        const never: never = kind
        return never
      }
    }
  }

  pick(kind: PieceKind): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.glass(this.pieceNote(kind) * 2, 0.05, 0.25, now)
    this.noiseBurst(3200, 1.2, 0.025, 0.003, 0.05, now, 'highpass')
  }

  drop(kind: PieceKind, strength: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (now - this.lastDrop < 0.04) return
    this.lastDrop = now
    const level = Math.min(1, strength)
    this.glass(this.pieceNote(kind), 0.07 + level * 0.07, 0.9, now)
    this.tone(170, 'sine', 0.08 * level, 0.003, 0.08, now, 110)
  }

  turn(kind: PieceKind): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.noiseBurst(2400, 4, 0.05, 0.002, 0.03, now)
    this.glass(this.pieceNote(kind) * 1.5, 0.045, 0.5, now + 0.02)
  }

  tick(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (now - this.lastTick < 0.03) return
    this.lastTick = now
    this.noiseBurst(3600, 5, 0.035, 0.001, 0.02, now)
    this.tone(1900, 'sine', 0.012, 0.001, 0.03, now)
  }

  home(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.noiseBurst(500, 0.8, 0.09, 0.004, 0.1, now, 'lowpass')
    this.tone(130, 'sine', 0.1, 0.004, 0.14, now, 90)
  }

  ripple(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(D[3] * 2, 'sine', 0.04, 0.02, 0.8, now, D[3] * 2.02)
    this.tone(D[5] * 2, 'sine', 0.02, 0.05, 0.7, now + 0.04)
  }

  garden(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    ;[0, 2, 4, 5, 7, 9].forEach((step, i) => {
      this.glass(D[step], 0.06, 3.2, now + i * 0.11, (i % 2 ? 0.4 : -0.4) * (i / 5))
      this.tone(D[step] * 0.5, 'sine', 0.035, 0.4, 2.6, now + i * 0.11)
    })
  }

  creature(kind: CreatureKind, event: CreatureEvent | 'poke' | 'nudge' | 'lift'): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    switch (event) {
      case 'stir':
        this.stir(kind, now)
        break
      case 'wake':
        this.wake(kind, now)
        break
      case 'awake':
      case 'perk':
        this.tone(this.voice(kind) * 2, 'sine', 0.05, 0.01, 0.25, now, this.voice(kind) * 2.25)
        break
      case 'drowsy':
        this.tone(this.voice(kind) * 1.5, 'triangle', 0.04, 0.2, 1.1, now, this.voice(kind) * 0.9)
        break
      case 'wander':
        break
      case 'nap':
        this.tone(this.voice(kind) * 0.5, 'sine', 0.035, 0.3, 1.4, now)
        break
      case 'poke':
        this.poke(kind, now)
        break
      case 'nudge':
        this.nudge(kind, now)
        break
      case 'lift':
        this.tone(this.voice(kind), 'sine', 0.05, 0.02, 0.3, now, this.voice(kind) * 1.6)
        break
      default: {
        const never: never = event
        return never
      }
    }
  }

  /** Each creature's home note: moth high and airy, snail low and slow. */
  private voice(kind: CreatureKind): number {
    switch (kind) {
      case 'moth':
        return D[7]
      case 'fish':
        return D[5]
      case 'snail':
        return D[0]
      case 'jelly':
        return D[3]
      default: {
        const never: never = kind
        return never
      }
    }
  }

  private stir(kind: CreatureKind, now: number): void {
    switch (kind) {
      case 'moth':
        for (let i = 0; i < 4; i++) this.noiseBurst(4200, 2, 0.02, 0.01, 0.04, now + i * 0.05)
        break
      case 'fish':
        this.tone(D[5], 'sine', 0.035, 0.005, 0.09, now, D[7])
        break
      case 'snail':
        this.tone(D[0], 'triangle', 0.03, 0.15, 0.5, now, D[1])
        break
      case 'jelly':
        this.glass(D[8], 0.02, 0.8, now)
        break
      default: {
        const never: never = kind
        return never
      }
    }
  }

  /** A little song as it wakes, shaped like how it moves. */
  private wake(kind: CreatureKind, now: number): void {
    switch (kind) {
      case 'moth':
        // A fluttering run up, and a trill at the top.
        ;[5, 6, 7, 8, 9].forEach((step, i) => this.tone(D[step], 'sine', 0.05, 0.004, 0.18, now + i * 0.06, undefined, -0.2 + i * 0.1))
        for (let i = 0; i < 6; i++) this.tone(D[i % 2 ? 9 : 10], 'sine', 0.03, 0.003, 0.08, now + 0.32 + i * 0.045)
        break
      case 'fish':
        // Three bubbles, each a quick upward bloop.
        ;[3, 5, 7].forEach((step, i) => this.tone(D[step] * 0.9, 'sine', 0.08, 0.004, 0.12, now + i * 0.12, D[step] * 1.25))
        this.noiseBurst(1800, 3, 0.03, 0.005, 0.12, now + 0.38)
        break
      case 'snail':
        // One long, slow slide and an answering note.
        this.tone(D[0], 'triangle', 0.07, 0.3, 1.4, now, D[2])
        this.tone(D[4] * 0.5, 'sine', 0.05, 0.4, 1.6, now + 0.9)
        break
      case 'jelly':
        // A shimmering bell chord that swells, then breathes out.
        ;[3, 5, 8].forEach((step, i) => this.glass(D[step], 0.05, 2.2, now + i * 0.18, i - 1))
        this.tone(D[3] * 0.5, 'sine', 0.04, 0.6, 1.6, now)
        break
      default: {
        const never: never = kind
        return never
      }
    }
  }

  private poke(kind: CreatureKind, now: number): void {
    const note = this.voice(kind) * (kind === 'snail' ? 2 : 1.5)
    this.tone(note, 'sine', 0.05, 0.004, 0.14, now, note * 1.12)
  }

  private nudge(kind: CreatureKind, now: number): void {
    switch (kind) {
      case 'fish':
        this.noiseBurst(1400, 2, 0.04, 0.003, 0.06, now)
        this.glass(D[6], 0.04, 0.4, now + 0.02)
        break
      case 'snail':
        this.tone(D[1], 'triangle', 0.025, 0.2, 0.5, now, D[0])
        break
      case 'moth':
        this.glass(D[9], 0.03, 0.3, now)
        break
      case 'jelly':
        this.glass(D[7], 0.035, 0.6, now)
        this.glass(D[7] * 1.01, 0.02, 0.6, now + 0.05)
        break
      default: {
        const never: never = kind
        return never
      }
    }
  }
}
