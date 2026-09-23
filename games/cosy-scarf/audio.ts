import { DANCE_SECONDS, type Sound } from './controller'
import type { AnimalKey } from './state'

// Every sound in Cosy Scarf is synthesized with raw Web Audio: wooden needle
// clicks, woolly thumps, a zip for unravelling, a note per yarn colour, and
// each animal's own voice and dance tune (played on the scarf's stripes).
// The context is created inside the child's first tap, suspended while the
// game is unattended or hidden, and rebuilt if WebKit leaves it interrupted.

/** One pentatonic note per yarn colour, so any stripe order sounds kind. */
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]

type ExtendedState = AudioContextState | 'interrupted'

function note(colour: number): number {
  return NOTES[((colour % NOTES.length) + NOTES.length) % NOTES.length]
}

const RATE = 48000

type Samples = Float32Array<ArrayBuffer>

/** The noise and the woolly room's impulse, made once at mount so the first tap only copies them. */
function samples(): { noise: Samples; impulse: [Samples, Samples] } {
  const noise = new Float32Array(RATE)
  for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1
  const length = Math.round(RATE * 0.9)
  const channel = (): Samples => {
    const data = new Float32Array(length)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 4
    return data
  }
  return { noise, impulse: [channel(), channel()] }
}

export class ScarfAudio implements Sound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private active = true
  private lastStitch = 0
  private lastStep = 0
  private readonly samples = samples()

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
    compressor.threshold.value = -18
    master.connect(compressor).connect(context.destination)
    const noise = context.createBuffer(1, RATE, RATE)
    noise.copyToChannel(this.samples.noise, 0)

    // A soft, woolly room: a short procedural impulse, darker than the direct sound.
    const impulse = context.createBuffer(2, this.samples.impulse[0].length, RATE)
    impulse.copyToChannel(this.samples.impulse[0], 0)
    impulse.copyToChannel(this.samples.impulse[1], 1)
    const convolver = context.createConvolver()
    convolver.buffer = impulse
    const dark = context.createBiquadFilter()
    dark.type = 'lowpass'
    dark.frequency.value = 1800
    const room = context.createGain()
    room.gain.value = 0.22
    master.connect(room).connect(dark).connect(convolver).connect(compressor)
    this.context = context
    this.master = master
    this.noise = noise
  }

  private teardown(): void {
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
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

  private hiss(frequency: number, q: number, peak: number, decay: number, at: number, type: BiquadFilterType = 'bandpass', sweepTo?: number): void {
    const context = this.context!
    const source = context.createBufferSource()
    source.buffer = this.noise
    source.playbackRate.value = 0.85 + Math.random() * 0.3
    const filter = context.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(frequency, at)
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + decay)
    filter.Q.value = q
    source.connect(filter).connect(this.envelope(context, peak, 0.004, decay, at))
    source.start(at, Math.random() * 0.5, decay + 0.06)
  }

  private tone(frequency: number, type: OscillatorType, peak: number, attack: number, decay: number, at: number, glideTo?: number, lowpass?: number): void {
    const context = this.context!
    const osc = context.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, at)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + attack + decay)
    const out = this.envelope(context, peak, attack, decay, at)
    if (lowpass) {
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = lowpass
      osc.connect(filter).connect(out)
    } else osc.connect(out)
    osc.start(at)
    osc.stop(at + attack + decay + 0.05)
  }

  /** A tremolo voice: an oscillator whose loudness shakes `rate` times a second (shivers, purrs). */
  private shake(frequency: number, type: OscillatorType, peak: number, duration: number, rate: number, at: number, glideTo: number, lowpass: number): void {
    const context = this.context!
    const osc = context.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, at)
    osc.frequency.exponentialRampToValueAtTime(glideTo, at + duration)
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = lowpass
    const tremolo = context.createGain()
    tremolo.gain.value = 0.5
    const lfo = context.createOscillator()
    lfo.frequency.value = rate
    const depth = context.createGain()
    depth.gain.value = 0.5
    lfo.connect(depth).connect(tremolo.gain)
    osc.connect(filter).connect(tremolo).connect(this.envelope(context, peak, 0.03, duration, at))
    osc.start(at)
    lfo.start(at)
    osc.stop(at + duration + 0.1)
    lfo.stop(at + duration + 0.1)
  }

  private bar(frequency: number, peak: number, at: number, decay = 0.55): void {
    this.tone(frequency, 'sine', peak, 0.004, decay, at)
    this.tone(frequency * 3.98, 'sine', peak * 0.22, 0.002, 0.06, at)
  }

  stitch(colour: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (now - this.lastStitch < 0.035) return
    this.lastStitch = now
    this.hiss(3800 + Math.random() * 900, 5, 0.07, 0.025, now, 'bandpass')
    this.tone(note(colour) * 2, 'sine', 0.018, 0.002, 0.05, now)
  }

  row(colour: number): void {
    const context = this.ready()
    if (!context) return
    this.bar(note(colour), 0.2, context.currentTime + 0.02)
  }

  hop(colour: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(150, 'sine', 0.2, 0.006, 0.14, now, 95)
    this.hiss(500, 0.9, 0.08, 0.08, now, 'lowpass')
    this.tone(note(colour) / 2, 'triangle', 0.07, 0.01, 0.16, now + 0.02, note(colour) * 0.75)
  }

  unravel(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.hiss(700, 3, 0.16, 0.2, now, 'bandpass', 3200)
    for (let i = 0; i < 4; i++) this.hiss(2600 - i * 350, 8, 0.05, 0.02, now + 0.03 + i * 0.04, 'bandpass')
  }

  paint(colour: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(note(colour) * 2, 'triangle', 0.08, 0.003, 0.18, now)
    this.tone(note(colour), 'sine', 0.07, 0.004, 0.3, now + 0.01)
  }

  flutter(open: boolean): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (let i = 0; i < 4; i++) this.hiss(1300 + i * 90, 2.5, 0.07, 0.035, now + i * 0.055, 'bandpass')
    const [a, b] = open ? [NOTES[2], NOTES[4]] : [NOTES[4], NOTES[2]]
    this.tone(a * 2, 'sine', 0.06, 0.004, 0.14, now + 0.05)
    this.tone(b * 2, 'sine', 0.06, 0.004, 0.2, now + 0.16)
  }

  hum(unit: readonly number[]): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime + 0.08
    unit.forEach((colour, i) => {
      const at = now + i * 0.2
      this.tone(note(colour) / 2, 'sine', 0.1, 0.05, 0.3, at)
      this.tone(note(colour), 'triangle', 0.025, 0.05, 0.22, at)
    })
  }

  offer(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(NOTES[3] * 2, 'sine', 0.07, 0.004, 0.9, now)
    this.tone(NOTES[5] * 2, 'sine', 0.05, 0.004, 1.1, now + 0.12)
    this.tone(NOTES[5] * 5.4, 'sine', 0.01, 0.002, 0.3, now + 0.12)
  }

  swish(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.hiss(380, 1.2, 0.18, 0.55, now, 'bandpass', 1700)
    this.hiss(1500, 1.5, 0.08, 0.35, now + 0.3, 'bandpass', 600)
  }

  warm(animal: AnimalKey): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (const [i, f] of [261.63, 329.63, 392, 523.25].entries()) {
      this.tone(f, 'sine', 0.07, 0.15, 1.8, now + i * 0.06)
      this.tone(f * 1.004, 'triangle', 0.02, 0.18, 1.3, now + i * 0.06)
    }
    this.happy(animal, 0.25)
  }

  shiver(animal: AnimalKey): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    switch (animal) {
      case 'bunny':
        for (let i = 0; i < 9; i++) this.hiss(4200, 7, 0.06, 0.012, now + i * 0.055, 'bandpass')
        this.tone(1250, 'sine', 0.035, 0.01, 0.25, now + 0.05, 980)
        return
      case 'penguin':
        this.shake(330, 'square', 0.06, 0.5, 22, now, 300, 900)
        return
      case 'fox':
        this.tone(760, 'triangle', 0.07, 0.04, 0.45, now, 520)
        this.shake(760, 'sine', 0.03, 0.45, 9, now, 520, 2000)
        return
      case 'bear':
        this.shake(96, 'sawtooth', 0.13, 0.7, 13, now, 82, 420)
        return
      default: {
        const never: never = animal
        return never
      }
    }
  }

  happy(animal: AnimalKey, delay = 0): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime + delay
    switch (animal) {
      case 'bunny':
        this.tone(900, 'sine', 0.08, 0.01, 0.12, now, 1500)
        this.tone(1300, 'sine', 0.06, 0.01, 0.1, now + 0.13, 1800)
        return
      case 'penguin':
        this.tone(420, 'square', 0.05, 0.01, 0.13, now, 400, 1300)
        this.tone(560, 'square', 0.05, 0.01, 0.2, now + 0.15, 540, 1300)
        return
      case 'fox':
        this.tone(700, 'triangle', 0.09, 0.005, 0.08, now, 1250)
        this.tone(1250, 'triangle', 0.07, 0.005, 0.1, now + 0.08, 800)
        return
      case 'bear':
        this.tone(140, 'sine', 0.16, 0.08, 0.5, now, 185)
        this.tone(280, 'triangle', 0.03, 0.08, 0.4, now, 370)
        return
      default: {
        const never: never = animal
        return never
      }
    }
  }

  dance(animal: AnimalKey, colours: readonly number[]): void {
    const context = this.ready()
    if (!context || colours.length === 0) return
    const start = context.currentTime + 0.05
    const length = DANCE_SECONDS[animal]
    switch (animal) {
      case 'bunny': {
        // A music box: quick, high, even.
        for (let i = 0, at = start; at < start + length - 0.2; i++, at += 0.2) {
          const f = note(colours[i % colours.length]) * 2
          this.tone(f, 'sine', 0.06, 0.002, 0.35, at)
          this.tone(f * 3, 'sine', 0.012, 0.002, 0.08, at)
        }
        return
      }
      case 'penguin': {
        // A reedy bassoon with a swing: long, short, long, short.
        for (let i = 0, at = start; at < start + length - 0.3; i++) {
          const long = i % 2 === 0
          this.tone(note(colours[i % colours.length]) / 2, 'sawtooth', 0.05, 0.02, long ? 0.26 : 0.14, at, undefined, 900)
          at += long ? 0.34 : 0.17
        }
        return
      }
      case 'fox': {
        // A dotted pluck, and a flick up at the end of each phrase.
        for (let i = 0, at = start; at < start + length - 0.2; i++) {
          const f = note(colours[i % colours.length])
          this.tone(f, 'triangle', 0.1, 0.002, 0.16, at)
          if (i % 4 === 3) this.tone(f * 1.5, 'triangle', 0.05, 0.002, 0.1, at + 0.09)
          at += i % 2 === 0 ? 0.3 : 0.15
        }
        return
      }
      case 'bear': {
        // A slow, low marimba and a stomp on every other beat.
        for (let i = 0, at = start; at < start + length - 0.3; i++, at += 0.42) {
          this.bar(note(colours[i % colours.length]) / 2, 0.16, at, 0.7)
          if (i % 2 === 0) {
            this.tone(75, 'sine', 0.22, 0.004, 0.18, at, 50)
            this.hiss(400, 0.8, 0.06, 0.1, at, 'lowpass')
          }
        }
        return
      }
      default: {
        const never: never = animal
        return never
      }
    }
  }

  crunch(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (let i = 0; i < 5; i++) this.hiss(1800 + Math.random() * 2400, 1.6, 0.07, 0.025, now + i * 0.022 + Math.random() * 0.01, 'bandpass')
  }

  basket(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.hiss(320, 6, 0.12, 0.22, now, 'bandpass', 260)
    for (let i = 0; i < 3; i++) this.hiss(2200 + i * 400, 6, 0.04, 0.02, now + 0.04 + i * 0.05, 'bandpass')
    this.tone(120, 'sine', 0.08, 0.01, 0.15, now, 90)
  }

  footstep(animal: AnimalKey, weight: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (now - this.lastStep < 0.06) return
    this.lastStep = now
    const level = 0.03 + weight * 0.08
    switch (animal) {
      case 'bunny':
        this.hiss(2400, 1.2, level * 0.8, 0.04, now, 'bandpass')
        return
      case 'penguin':
        this.hiss(1500, 1.4, level, 0.035, now, 'bandpass')
        this.tone(260, 'sine', level * 0.5, 0.003, 0.04, now, 200)
        return
      case 'fox':
        this.hiss(2800, 1.6, level * 0.7, 0.03, now, 'bandpass')
        return
      case 'bear':
        this.hiss(700, 0.9, level, 0.09, now, 'lowpass')
        this.tone(68, 'sine', level * 1.6, 0.004, 0.16, now, 48)
        return
      default: {
        const never: never = animal
        return never
      }
    }
  }
}
