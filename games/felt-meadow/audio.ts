import { HUE_NOTE, type Hue } from './colors'
import type { PokeName } from './motion'

// Felt sounds, all synthesized with raw Web Audio: nothing is recorded or
// fetched. Wool swallows highs, so every hit is soft and low: pats, pomfs,
// plops into soil, a squeaky sprout, a music-box note per colour when a
// flower opens, and a quiet buzz that follows the bee. The context is created
// inside the child's first touch, suspended while the meadow is unattended or
// hidden, and rebuilt if WebKit leaves it interrupted after backgrounding.

type ExtendedState = AudioContextState | 'interrupted'

/** How far the buzz steps back under a moment that matters (about -12 dB). */
const BUZZ_DUCKED = 0.25
/** How long the buzz takes to come back once the moment has passed. */
const BUZZ_RETURN = 0.5

const PREPARED_RATE = 48000
const ROOM_SECONDS = 0.45

type Prepared = { noise: Float32Array; room: readonly [Float32Array, Float32Array] }
let prepared: Prepared | null = null

/**
 * A second of white noise and the wool room's impulse (a short, dark,
 * decaying noise), computed once per page when the meadow mounts. Filling
 * them inside the child's first touch stalled that very frame on a slow
 * device; now the touch only copies them into buffers.
 */
function prepare(): Prepared {
  if (prepared) return prepared
  const noise = new Float32Array(PREPARED_RATE)
  for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1
  const length = Math.round(PREPARED_RATE * ROOM_SECONDS)
  const room = [new Float32Array(length), new Float32Array(length)] as const
  for (const samples of room) {
    for (let i = 0; i < length; i++) {
      const fade = (1 - i / length) * (1 - i / length)
      samples[i] = (Math.random() * 2 - 1) * fade * fade
    }
  }
  prepared = { noise, room }
  return prepared
}

export class FeltAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private buzzOsc: OscillatorNode | null = null
  private buzzGain: GainNode | null = null
  private buzzFilter: BiquadFilterNode | null = null
  private active = true
  private lastThud = 0
  private buzzLevel = 0
  private duckUntil = -Infinity

  constructor() {
    prepare()
  }

  unlock(): void {
    const state = this.context?.state as ExtendedState | undefined
    if (this.context && (state === 'closed' || state === 'interrupted')) this.teardown()
    if (!this.context) this.build()
    if (this.active && this.context?.state === 'suspended') void this.context.resume().catch(() => {})
  }

  setActive(active: boolean): void {
    this.active = active
    if (!this.context) return
    if (active) void this.context.resume().catch(() => {})
    else {
      this.buzz(0, 0)
      void this.context.suspend().catch(() => {})
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
    master.gain.value = 0.75
    const compressor = context.createDynamicsCompressor()
    master.connect(compressor).connect(context.destination)
    // Both are laid out at PREPARED_RATE; at the context's own rate they run a
    // few percent longer or shorter, which noise and a room tail never show.
    const { noise: noiseData, room: roomData } = prepare()
    const noise = context.createBuffer(1, noiseData.length, context.sampleRate)
    noise.getChannelData(0).set(noiseData)
    const impulse = context.createBuffer(2, roomData[0].length, context.sampleRate)
    impulse.getChannelData(0).set(roomData[0])
    impulse.getChannelData(1).set(roomData[1])
    const convolver = context.createConvolver()
    convolver.buffer = impulse
    const dark = context.createBiquadFilter()
    dark.type = 'lowpass'
    dark.frequency.value = 1500
    const room = context.createGain()
    room.gain.value = 0.2
    master.connect(room).connect(dark).connect(convolver).connect(compressor)

    const buzzOsc = context.createOscillator()
    buzzOsc.type = 'sawtooth'
    buzzOsc.frequency.value = 180
    const vibrato = context.createOscillator()
    vibrato.frequency.value = 7.5
    const vibratoDepth = context.createGain()
    vibratoDepth.gain.value = 7
    vibrato.connect(vibratoDepth).connect(buzzOsc.frequency)
    const buzzFilter = context.createBiquadFilter()
    buzzFilter.type = 'lowpass'
    buzzFilter.frequency.value = 600
    buzzFilter.Q.value = 0.7
    const buzzGain = context.createGain()
    buzzGain.gain.value = 0
    buzzOsc.connect(buzzFilter).connect(buzzGain).connect(master)
    buzzOsc.start()
    vibrato.start()

    Object.assign(this, { context, master, noise, buzzOsc, buzzGain, buzzFilter })
  }

  private teardown(): void {
    try {
      this.buzzOsc?.stop()
    } catch {
      // already stopped
    }
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
    this.buzzOsc = null
    this.buzzGain = null
    this.buzzFilter = null
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

  private hush(frequency: number, q: number, peak: number, decay: number, at: number, type: BiquadFilterType = 'lowpass'): void {
    const context = this.context!
    const source = context.createBufferSource()
    source.buffer = this.noise
    source.playbackRate.value = 0.7 + Math.random() * 0.4
    const filter = context.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    filter.Q.value = q
    source.connect(filter).connect(this.envelope(context, peak, 0.004, decay, at))
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

  /** A music-box tine: a sine with a quick bright partial, as a felt-muffled bell. */
  private tine(frequency: number, peak: number, at: number, decay = 0.9): void {
    this.tone(frequency, 'sine', peak, 0.004, decay, at)
    this.tone(frequency * 2.76, 'sine', peak * 0.18, 0.002, 0.12, at)
    this.tone(frequency * 5.4, 'sine', peak * 0.05, 0.001, 0.05, at)
  }

  /** A soft pat on felt. */
  pat(size = 1): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(210 / size, 'sine', 0.13, 0.006, 0.09, now, 150 / size)
    this.hush(700, 0.8, 0.07, 0.05, now)
  }

  /** A seed lifting off the felt: a tiny upward "pf". */
  lift(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.hush(1200, 1.2, 0.07, 0.06, now, 'bandpass')
    this.tone(360, 'sine', 0.08, 0.004, 0.08, now, 620)
  }

  /** A felt ball landing on felt: a muffled pomf, as loud as the fall. */
  thud(intensity = 1): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (now - this.lastThud < 0.03) return
    this.lastThud = now
    const level = Math.min(1, Math.max(0.2, intensity))
    this.tone(170, 'sine', 0.2 * level, 0.004, 0.14, now, 95)
    this.hush(500, 0.7, 0.1 * level, 0.07, now)
  }

  /** A seed pushed into soil: a round plop with a crumble. */
  plop(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(330, 'sine', 0.22, 0.005, 0.16, now, 120)
    for (let i = 0; i < 3; i++) this.hush(900 + i * 300, 1.5, 0.05, 0.04, now + 0.05 + i * 0.035, 'bandpass')
  }

  /** The stem shooting up: a small rising squeak. */
  sprout(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(420, 'triangle', 0.07, 0.02, 0.22, now, 980)
  }

  /** Petals opening: the colour's own note with a softer fifth after it. */
  bloom(hue: Hue): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    const note = HUE_NOTE[hue]
    this.duck(1.3)
    this.tine(note, 0.2, now, 1.2)
    this.tine(note * 1.5, 0.1, now + 0.11, 0.9)
    this.hush(2600, 0.6, 0.025, 0.25, now, 'highpass')
  }

  /** A flower stem wobbling after a tap. */
  boing(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(240, 'sine', 0.13, 0.008, 0.28, now, 420)
    this.tone(420, 'sine', 0.05, 0.1, 0.2, now + 0.12, 300)
  }

  /** A flower pulled out of its molehill. */
  pluck(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(260, 'sine', 0.16, 0.004, 0.07, now, 620)
    this.hush(1500, 1, 0.06, 0.08, now, 'bandpass')
  }

  /** The cloth pouch shuffling. */
  rustle(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (let i = 0; i < 4; i++) this.hush(600 + i * 200, 0.9, 0.06, 0.1, now + i * 0.06, 'bandpass')
  }

  /** The pouch offering its seeds after a tap: a shuffle, then a soft "pf" as each seed pops up in turn. */
  offer(stagger: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.rustle()
    for (let i = 0; i < 3; i++) this.tone(320 + i * 70, 'sine', 0.07, 0.004, 0.08, now + 0.02 + i * stagger, 560 + i * 110)
  }

  /** The pouch pushing a fresh seed up into its mouth. */
  refill(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(190, 'sine', 0.1, 0.01, 0.1, now, 280)
    this.hush(800, 1, 0.04, 0.06, now + 0.03)
  }

  /** A seed rolling home into the pouch. */
  home(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (let i = 0; i < 3; i++) this.hush(500 + i * 120, 1.2, 0.05, 0.06, now + i * 0.07)
    this.tone(150, 'sine', 0.12, 0.01, 0.16, now + 0.2, 100)
  }

  /** Continuous bee buzz: `level` 0 is silence. */
  buzz(level: number, pitch: number): void {
    if (!this.context || !this.buzzGain || !this.buzzOsc || !this.buzzFilter) return
    const now = this.context.currentTime
    this.buzzLevel = this.active ? level * 0.05 : 0
    const ducked = now < this.duckUntil
    const returning = now < this.duckUntil + BUZZ_RETURN
    this.buzzGain.gain.setTargetAtTime(this.buzzLevel * (ducked ? BUZZ_DUCKED : 1), now, ducked ? 0.03 : returning ? 0.2 : 0.08)
    this.buzzOsc.frequency.setTargetAtTime(pitch, now, 0.1)
    this.buzzFilter.frequency.setTargetAtTime(pitch * 3.2, now, 0.1)
  }

  /**
   * The drone sits right on the music-box notes (and on the snail's low
   * voice), so it steps back for `seconds` while something that matters is
   * heard, then drifts back up.
   */
  private duck(seconds: number): void {
    if (!this.context || !this.buzzGain) return
    const now = this.context.currentTime
    this.duckUntil = Math.max(this.duckUntil, now + seconds)
    this.buzzGain.gain.setTargetAtTime(this.buzzLevel * BUZZ_DUCKED, now, 0.03)
  }

  /** The bee sipping: a tiny slurp, then the colour's note as the pollen sticks. */
  sip(hue: Hue): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.duck(0.6)
    this.tone(700, 'sine', 0.05, 0.01, 0.12, now, 380)
    this.tine(HUE_NOTE[hue] * 2, 0.07, now + 0.16, 0.4)
  }

  /** Two pollen colours becoming one seed: both notes, then the new colour's. */
  mixed(a: Hue, b: Hue, result: Hue): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.duck(1.9)
    this.tine(HUE_NOTE[a], 0.12, now, 0.5)
    this.tine(HUE_NOTE[b], 0.12, now + 0.16, 0.5)
    this.tine(HUE_NOTE[result], 0.18, now + 0.4, 1.3)
    this.tine(HUE_NOTE[result] * 2, 0.06, now + 0.46, 0.8)
  }

  /**
   * The bee answering a poke in the voice of the move it makes: a zip up for
   * the spin-hop, a falling "whee" and a bounce for the tumble, and buzzy
   * little hee-hees behind its wings for the giggle. `seconds` is how long the
   * move runs, so the landing and the wing-fling line up with the motion.
   */
  beePoke(variant: PokeName<'bee'>, seconds: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.duck(seconds + 0.2)
    switch (variant) {
      case 'spin-hop':
        this.tone(300, 'sawtooth', 0.05, 0.01, 0.25, now, 900)
        this.tone(600, 'sine', 0.14, 0.01, 0.2, now, 1400)
        return
      case 'tumble':
        this.tone(980, 'sine', 0.04, 0.02, 0.4, now, 420)
        this.tone(1960, 'sine', 0.012, 0.02, 0.3, now, 840)
        this.thudAt(0.35, now + seconds * 0.75)
        this.tone(240, 'sine', 0.08, 0.008, 0.24, now + seconds * 0.75 + 0.03, 400)
        return
      case 'giggle':
        for (let i = 0; i < 5; i++) {
          const at = now + 0.08 + i * 0.12
          this.tone(820 - i * 30, 'triangle', 0.04, 0.006, 0.07, at, 660 - i * 30)
        }
        this.tone(420, 'sine', 0.06, 0.01, 0.16, now + seconds * 0.62, 880)
        return
      default: {
        const unhandled: never = variant
        return unhandled
      }
    }
  }

  /**
   * The snail answering a poke: a soft wet shloop into the shell, a slow
   * rising "boip" as its eyes stretch up, or a shloop, a shiver of trembles
   * inside, and a pop as both eyes come out. A tap on a tucked snail keeps it
   * in longer, so the peek itself stays silent rather than guess its moment.
   */
  snailPoke(variant: PokeName<'snail'>, seconds: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.duck(variant === 'tuck-and-peek' ? 0.4 : Math.min(seconds, 2))
    switch (variant) {
      case 'tuck-and-peek':
        this.shloop(now)
        return
      case 'tall-eyes':
        this.tone(260, 'sine', 0.07, 0.12, 0.3, now, 720)
        this.tone(720, 'sine', 0.025, 0.02, 0.2, now + 0.38, 620)
        return
      case 'shiver-in':
        this.shloop(now)
        for (let i = 0; i < 7; i++) this.tone(i % 2 === 0 ? 200 : 230, 'sine', 0.06, 0.004, 0.035, now + seconds * (0.16 + i * 0.08))
        this.tone(640, 'sine', 0.04, 0.006, 0.08, now + seconds * 0.72, 900)
        return
      default: {
        const unhandled: never = variant
        return unhandled
      }
    }
  }

  /**
   * The mouse answering a poke: two squeaks and a scurry home, three rising
   * squeaks as it stands up tall, or a wheeling squeak as it chases its tail.
   */
  mousePoke(variant: PokeName<'mouse'>): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.duck(0.8)
    switch (variant) {
      case 'leap-home':
        this.squeak(2100, 0.04, now)
        this.squeak(2300, 0.035, now + 0.09)
        for (let i = 0; i < 4; i++) this.hush(2400, 1.6, 0.02, 0.025, now + 0.16 + i * 0.05, 'bandpass')
        return
      case 'stand-and-squeak':
        for (let i = 0; i < 3; i++) this.squeak(1900 + i * 260, 0.042, now + 0.1 + i * 0.16)
        return
      case 'tail-chase':
        for (let i = 0; i < 5; i++) this.squeak(i % 2 === 0 ? 2200 : 2550, 0.03, now + i * 0.15)
        return
      default: {
        const unhandled: never = variant
        return unhandled
      }
    }
  }

  private shloop(at: number): void {
    this.tone(520, 'sine', 0.13, 0.01, 0.22, at, 160)
    this.hush(400, 2, 0.08, 0.18, at + 0.02, 'bandpass')
  }

  private squeak(frequency: number, peak: number, at: number): void {
    this.tone(frequency, 'sine', peak, 0.005, 0.06, at, frequency * 1.28)
  }

  private thudAt(level: number, at: number): void {
    this.tone(170, 'sine', 0.2 * level, 0.004, 0.14, at, 95)
    this.hush(500, 0.7, 0.1 * level, 0.07, at)
  }

  /** A molehill heaving under a tap: a low felt thump and a sniff from below. */
  heave(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(120, 'sine', 0.2, 0.01, 0.18, now, 80)
    this.hush(1800, 2, 0.03, 0.05, now + 0.2, 'bandpass')
    this.hush(1900, 2, 0.03, 0.05, now + 0.3, 'bandpass')
  }

  /** Brushing the grass. */
  brush(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.hush(1100, 0.6, 0.05, 0.12, now, 'bandpass')
  }
}
