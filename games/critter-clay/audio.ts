import type { Sound } from './controller'
import type { Critter } from './critter'
import type { Routine, Temperament } from './gait'

// Every sound in the workshop is synthesized with raw Web Audio: clay
// squishes and pops, the bench's pat, the turntable's whirr, footsteps
// that follow each gait, and wordless little voices whose contour follows
// the critter's temperament and whose pitch follows its body (big heads are
// low, many small legs are high). The context is only created inside the
// child's first touch, is suspended while the workshop is unattended or
// hidden, and is rebuilt if WebKit leaves it `interrupted` or `closed`.

type ExtendedState = AudioContextState | 'interrupted'
type VoiceKind = 'wake' | 'greet' | 'tap' | 'carry' | 'land' | 'yawn'

/** Voice contours as (time share, pitch ratio) pairs: one per temperament. */
const CONTOUR: Record<Temperament, readonly (readonly [number, number])[]> = {
  shy: [
    [0, 1.06],
    [0.6, 0.94],
    [1, 0.88],
  ],
  curious: [
    [0, 0.92],
    [0.55, 1.02],
    [1, 1.32],
  ],
  bouncy: [
    [0, 1],
    [0.3, 1.28],
    [0.45, 1],
    [0.75, 1.4],
    [1, 1.2],
  ],
  bold: [
    [0, 0.84],
    [0.3, 0.98],
    [1, 0.8],
  ],
}

const VOICE_BASE: Record<Temperament, number> = { shy: 380, curious: 330, bouncy: 420, bold: 240 }
/** Vowel formants: shy hums, curious "oo", bouncy "ee", bold "ah". */
const FORMANT: Record<Temperament, readonly [number, number]> = { shy: [420, 1100], curious: [360, 900], bouncy: [520, 2200], bold: [760, 1300] }
const KIND: Record<VoiceKind, { length: number; gain: number; lift: number }> = {
  wake: { length: 0.55, gain: 0.2, lift: 1.1 },
  greet: { length: 0.32, gain: 0.15, lift: 1.05 },
  tap: { length: 0.2, gain: 0.14, lift: 1 },
  carry: { length: 0.42, gain: 0.16, lift: 1.25 },
  land: { length: 0.22, gain: 0.14, lift: 0.85 },
  yawn: { length: 0.8, gain: 0.14, lift: 0.8 },
}

const STEP_MIN_GAP = 0.055

export class WorkshopAudio implements Sound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private active = true
  private lastStep = 0
  private lastVoice = 0

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
    master.gain.value = 0.62
    const compressor = context.createDynamicsCompressor()
    master.connect(compressor).connect(context.destination)
    const noise = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    // a small bright workshop: a short procedural room, no recorded assets
    const length = Math.round(context.sampleRate * 0.45)
    const impulse = context.createBuffer(2, length, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 4
    }
    const convolver = context.createConvolver()
    convolver.buffer = impulse
    const room = context.createGain()
    room.gain.value = 0.12
    master.connect(room).connect(convolver).connect(compressor)
    this.context = context
    this.master = master
    this.noise = noise
  }

  private teardown(): void {
    const context = this.context
    this.context = null
    this.master = null
    this.noise = null
    if (context && context.state !== 'closed') void context.close().catch(() => undefined)
  }

  private ready(): { context: AudioContext; master: GainNode; now: number } | null {
    const { context, master } = this
    if (!context || !master || !this.active || context.state !== 'running') return null
    return { context, master, now: context.currentTime }
  }

  private envelope(context: AudioContext, at: number, attack: number, hold: number, release: number, peak: number): GainNode {
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack)
    gain.gain.setValueAtTime(Math.max(0.0002, peak), at + attack + hold)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release)
    return gain
  }

  /** A tone sliding from f0 to f1 through an optional low-pass. */
  private tone(type: OscillatorType, f0: number, f1: number, at: number, duration: number, peak: number, lowpass = 0): void {
    const ready = this.ready()
    if (!ready) return
    const { context, master } = ready
    const osc = context.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(f0, at)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + duration)
    const gain = this.envelope(context, at, Math.min(0.012, duration * 0.2), 0, duration, peak)
    let node: AudioNode = osc
    if (lowpass > 0) {
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = lowpass
      node = node.connect(filter)
    }
    node.connect(gain).connect(master)
    osc.start(at)
    osc.stop(at + duration + 0.05)
  }

  /** Filtered noise whose band slides from f0 to f1. */
  private hiss(at: number, duration: number, peak: number, type: BiquadFilterType, f0: number, f1: number, q = 1, attack = 0.005): void {
    const ready = this.ready()
    if (!ready || !this.noise) return
    const { context, master } = ready
    const source = context.createBufferSource()
    source.buffer = this.noise
    source.playbackRate.value = 0.8 + Math.random() * 0.4
    const filter = context.createBiquadFilter()
    filter.type = type
    filter.Q.value = q
    filter.frequency.setValueAtTime(f0, at)
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, f1), at + duration)
    const gain = this.envelope(context, at, attack, 0, duration, peak)
    source.connect(filter).connect(gain).connect(master)
    source.start(at, Math.random() * 0.5)
    source.stop(at + duration + 0.05)
  }

  private get now(): number {
    return this.context?.currentTime ?? 0
  }

  // --- clay and bench ------------------------------------------------------------

  pat(): void {
    const t = this.now
    this.tone('sine', 120, 70, t, 0.14, 0.32)
    this.hiss(t, 0.08, 0.1, 'lowpass', 600, 200)
  }

  pick(): void {
    const t = this.now
    this.hiss(t, 0.09, 0.12, 'bandpass', 900, 1800, 2)
    this.tone('sine', 480, 820, t + 0.01, 0.08, 0.14)
  }

  squish(pitch: number): void {
    const t = this.now
    this.hiss(t, 0.22, 0.26, 'bandpass', 1400 * pitch, 260 * pitch, 3, 0.02)
    this.tone('sine', 150 * pitch, 80 * pitch, t + 0.02, 0.18, 0.3)
  }

  pop(pitch: number): void {
    const t = this.now
    this.tone('sine', 950 * pitch, 320 * pitch, t, 0.06, 0.3)
    this.hiss(t, 0.03, 0.18, 'highpass', 2500, 1800)
  }

  boing(): void {
    const t = this.now
    const ready = this.ready()
    if (!ready) return
    const { context, master } = ready
    const osc = context.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(260, t)
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.06)
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.3)
    const wobble = context.createOscillator()
    wobble.frequency.value = 17
    const depth = context.createGain()
    depth.gain.setValueAtTime(40, t)
    depth.gain.exponentialRampToValueAtTime(1, t + 0.32)
    wobble.connect(depth).connect(osc.frequency)
    const gain = this.envelope(context, t, 0.008, 0, 0.32, 0.12)
    osc.connect(gain).connect(master)
    osc.start(t)
    wobble.start(t)
    osc.stop(t + 0.38)
    wobble.stop(t + 0.38)
  }

  whoosh(): void {
    const t = this.now
    this.hiss(t, 0.42, 0.14, 'bandpass', 300, 1600, 1.4, 0.12)
  }

  plop(): void {
    const t = this.now
    this.tone('sine', 340, 130, t, 0.12, 0.24)
    this.hiss(t, 0.05, 0.08, 'lowpass', 900, 300)
  }

  snore(pitch: number, size: number): void {
    const t = this.now
    this.hiss(t, 0.5 + 0.5 * size, 0.05 * size, 'lowpass', 380, 700, 0.8, 0.5)
    this.tone('triangle', (92 - 12 * size) * pitch, (82 - 10 * size) * pitch, t + 0.1, 0.4 + 0.5 * size, 0.06 * size, 300)
  }

  spin(speed: number): void {
    const t = this.now
    this.tone('sawtooth', 55 + 40 * speed, 40, t, 0.25 + 0.4 * speed, 0.05 + 0.08 * speed, 420)
    this.hiss(t, 0.3 + 0.4 * speed, 0.04 * speed, 'bandpass', 700, 300, 2)
  }

  mumble(pitch: number): void {
    const t = this.now
    this.tone('triangle', 190 * pitch, 170 * pitch, t, 0.16, 0.08, 700)
    this.tone('triangle', 175 * pitch, 150 * pitch, t + 0.2, 0.22, 0.07, 650)
  }

  sniff(pitch: number): void {
    const t = this.now
    for (const [at, f] of [
      [0, 1700],
      [0.13, 2100],
    ] as const) {
      this.hiss(t + at, 0.07, 0.05, 'bandpass', f * pitch, f * 1.35 * pitch, 4, 0.02)
    }
  }

  shake(pitch: number): void {
    const t = this.now
    for (let i = 0; i < 6; i++) this.hiss(t + i * 0.075, 0.05, 0.05 * (1 - i / 7), 'bandpass', 950 * pitch, 650 * pitch, 2, 0.01)
  }

  thud(level: number): void {
    const t = this.now
    this.tone('sine', 110, 55, t, 0.16, 0.26 * level)
    this.hiss(t, 0.06, 0.08 * level, 'lowpass', 500, 180)
  }

  // --- critters ---------------------------------------------------------------------

  step(routine: Routine, voice: number, level: number): void {
    const t = this.now
    if (t - this.lastStep < STEP_MIN_GAP || level < 0.2) return
    this.lastStep = t
    const v = voice * (0.94 + Math.random() * 0.12)
    const k = Math.min(1, level)
    switch (routine) {
      case 'inch':
        this.hiss(t, 0.16, 0.07 * k, 'bandpass', 500 * v, 240 * v, 3, 0.04)
        break
      case 'pogo':
        this.tone('sine', 180 * v, 520 * v, t, 0.1, 0.07 * k)
        break
      case 'waddle':
        this.tone('sine', 150 * v, 95 * v, t, 0.08, 0.1 * k)
        break
      case 'lope':
        this.tone('triangle', 210 * v, 140 * v, t, 0.06, 0.07 * k, 900)
        break
      case 'trot':
        this.tone('sine', 330 * v, 240 * v, t, 0.04, 0.06 * k)
        break
      case 'scuttle':
        this.hiss(t, 0.025, 0.05 * k, 'bandpass', 3200 * v, 2600 * v, 4)
        break
      default: {
        const unreachable: never = routine
        return unreachable
      }
    }
  }

  voice(critter: Critter, kind: VoiceKind): void {
    const ready = this.ready()
    if (!ready) return
    const { context, master, now } = ready
    if (now - this.lastVoice < 0.08) return
    this.lastVoice = now
    const temperament = critter.profile.temperament
    const shape = KIND[kind]
    const base = VOICE_BASE[temperament] * critter.profile.voice * shape.lift
    const length = shape.length
    const osc = context.createOscillator()
    osc.type = temperament === 'bold' ? 'sawtooth' : 'triangle'
    const contour = kind === 'yawn' || kind === 'land' ? CONTOUR.shy : CONTOUR[temperament]
    osc.frequency.setValueAtTime(base * contour[0][1], now)
    for (let i = 1; i < contour.length; i++) osc.frequency.exponentialRampToValueAtTime(base * contour[i][1] * (kind === 'carry' ? 1 + contour[i][0] * 0.4 : 1), now + length * contour[i][0])
    const [f1, f2] = FORMANT[temperament]
    const low = context.createBiquadFilter()
    low.type = 'bandpass'
    low.frequency.value = f1 * (kind === 'yawn' ? 1.3 : 1)
    low.Q.value = 3
    const high = context.createBiquadFilter()
    high.type = 'bandpass'
    high.frequency.value = f2
    high.Q.value = 5
    const body = context.createGain()
    body.gain.value = 1
    const gain = this.envelope(context, now, 0.02, length * 0.4, length * 0.6, shape.gain)
    osc.connect(low).connect(body)
    osc.connect(high).connect(body)
    const dry = context.createGain()
    dry.gain.value = 0.25
    osc.connect(dry).connect(body)
    body.connect(gain).connect(master)
    osc.start(now)
    osc.stop(now + length + 0.1)
  }
}
