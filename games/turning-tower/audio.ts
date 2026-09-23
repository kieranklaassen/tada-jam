import type { ChirpKind, Sound } from './controller'
import { LANTERN_HALF_SWING, type Greet, type Poke } from './motion'

// Every sound is synthesized with raw Web Audio (R14): stone grinding under
// the finger, detent ticks, a heavy settle with a small bell, slide scrapes,
// soft footsteps, a glassy shimmer when an impossible join appears, a warm
// chord at the door, the bird's quick chirps and wing beats, and each
// character's own answer to a poke (bird chirps, lantern chimes). The context
// is only created inside the child's first touch, is suspended while the game
// is unattended or hidden, and is rebuilt if WebKit leaves it interrupted or
// closed.

type ExtendedState = AudioContextState | 'interrupted'

// D major pentatonic, warm and open: nothing here can sound like a verdict.
const BELLS = [587.33, 659.25, 739.99, 880, 987.77, 1174.66]
const RING = [440, 493.88, 587.33, 659.25, 739.99]

/** Noise is drawn at mount, not inside the first touch; a looping buffer plays at any context rate. */
const PREPARED_RATE = 48000
const NOISE_SECONDS = 2
/** Mutually prime comb delays (seconds) and their feedback: the tail falls 60 dB in about 1.2 seconds, darker as it fades. */
const HALL_TAPS: readonly (readonly [number, number])[] = [
  [0.0297, 0.75],
  [0.0371, 0.77],
  [0.0411, 0.78],
  [0.0437, 0.79],
]

function noiseSamples(length: number): Float32Array {
  const data = new Float32Array(length)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return data
}

export class TowerAudio implements Sound {
  private readonly preparedNoise = noiseSamples(PREPARED_RATE * NOISE_SECONDS)
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private grindGain: GainNode | null = null
  private grindFilter: BiquadFilterNode | null = null
  private rumble: OscillatorNode | null = null
  private scrapeGain: GainNode | null = null
  private sources: AudioScheduledSourceNode[] = []
  private active = true
  private lastNotch = 0
  private lastStep = 0
  private lastFlap = 0
  private bell = 0

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
      this.grind(0)
      this.scrape(0)
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
    master.gain.value = 0.62
    const compressor = context.createDynamicsCompressor()
    master.connect(compressor).connect(context.destination)
    const noise = context.createBuffer(1, this.preparedNoise.length, PREPARED_RATE)
    noise.getChannelData(0).set(this.preparedNoise)

    // A stone hall from damped feedback delays, run on the audio thread. A
    // convolver's impulse would be built on the main thread inside the first
    // touch: over 100 ms on a slow tablet, exactly when the child first reaches out.
    const dark = context.createBiquadFilter()
    dark.type = 'lowpass'
    dark.frequency.value = 1800
    // The grinding rumble stays out of the combs, which would ring at their low harmonics.
    const clear = context.createBiquadFilter()
    clear.type = 'highpass'
    clear.frequency.value = 240
    const hall = context.createGain()
    hall.gain.value = 0.22
    const tail = context.createGain()
    tail.gain.value = 0.09
    master.connect(hall).connect(clear).connect(dark)
    tail.connect(compressor)
    for (const [seconds, feedback] of HALL_TAPS) {
      const delay = context.createDelay(0.1)
      delay.delayTime.value = seconds
      const damp = context.createBiquadFilter()
      damp.type = 'lowpass'
      damp.frequency.value = 2200
      // Q is in dB here: anything above −3 peaks above unity at the cutoff, and the loop would grow.
      damp.Q.value = -3
      const echo = context.createGain()
      echo.gain.value = feedback
      dark.connect(delay)
      delay.connect(damp).connect(echo).connect(delay)
      damp.connect(tail)
    }

    const loop = (gainValue: number) => {
      const source = context.createBufferSource()
      source.buffer = noise
      source.loop = true
      const gain = context.createGain()
      gain.gain.value = gainValue
      source.start()
      this.sources.push(source)
      return { source, gain }
    }

    // Grinding stone: band-passed noise over a low sawtooth rumble.
    const grind = loop(0)
    const grindFilter = context.createBiquadFilter()
    grindFilter.type = 'bandpass'
    grindFilter.frequency.value = 260
    grindFilter.Q.value = 1.4
    grind.source.connect(grindFilter).connect(grind.gain).connect(master)
    const rumble = context.createOscillator()
    rumble.type = 'sawtooth'
    rumble.frequency.value = 48
    const rumbleFilter = context.createBiquadFilter()
    rumbleFilter.type = 'lowpass'
    rumbleFilter.frequency.value = 160
    rumble.connect(rumbleFilter).connect(grind.gain)
    rumble.start()
    this.sources.push(rumble)

    const scrape = loop(0)
    const scrapeFilter = context.createBiquadFilter()
    scrapeFilter.type = 'bandpass'
    scrapeFilter.frequency.value = 1100
    scrapeFilter.Q.value = 2.2
    scrape.source.connect(scrapeFilter).connect(scrape.gain).connect(master)

    // Dusk air: a barely-there wind that breathes.
    const wind = loop(0.018)
    const windFilter = context.createBiquadFilter()
    windFilter.type = 'lowpass'
    windFilter.frequency.value = 420
    const lfo = context.createOscillator()
    lfo.frequency.value = 0.07
    const lfoDepth = context.createGain()
    lfoDepth.gain.value = 0.012
    lfo.connect(lfoDepth).connect(wind.gain.gain)
    lfo.start()
    this.sources.push(lfo)
    wind.source.connect(windFilter).connect(wind.gain).connect(master)

    this.context = context
    this.master = master
    this.noise = noise
    this.grindGain = grind.gain
    this.grindFilter = grindFilter
    this.rumble = rumble
    this.scrapeGain = scrape.gain
  }

  private teardown(): void {
    for (const source of this.sources) {
      try {
        source.stop()
      } catch {
        // already stopped
      }
    }
    this.sources = []
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
    this.grindGain = null
    this.grindFilter = null
    this.rumble = null
    this.scrapeGain = null
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

  private burst(frequency: number, q: number, peak: number, decay: number, at: number, type: BiquadFilterType = 'bandpass'): void {
    const context = this.context!
    const source = context.createBufferSource()
    source.buffer = this.noise
    const filter = context.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    filter.Q.value = q
    source.connect(filter).connect(this.envelope(context, peak, 0.003, decay, at))
    source.start(at, Math.random() * 1.5, decay + 0.05)
  }

  private tone(frequency: number, type: OscillatorType, peak: number, attack: number, decay: number, at: number, glideTo?: number): void {
    const context = this.context!
    const osc = context.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, at)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + attack + decay * 0.6)
    osc.connect(this.envelope(context, peak, attack, decay, at))
    osc.start(at)
    osc.stop(at + attack + decay + 0.05)
  }

  grind(level: number): void {
    if (!this.context || !this.grindGain || !this.grindFilter || !this.rumble) return
    const now = this.context.currentTime
    const l = this.active ? Math.min(1, level) : 0
    this.grindGain.gain.setTargetAtTime(l * 0.16, now, 0.05)
    this.grindFilter.frequency.setTargetAtTime(200 + l * 260, now, 0.08)
    this.rumble.frequency.setTargetAtTime(42 + l * 20, now, 0.1)
  }

  scrape(level: number): void {
    if (!this.context || !this.scrapeGain) return
    this.scrapeGain.gain.setTargetAtTime(this.active ? Math.min(1, level) * 0.1 : 0, this.context.currentTime, 0.05)
  }

  notch(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (now - this.lastNotch < 0.05) return
    this.lastNotch = now
    this.burst(2600, 3, 0.09, 0.025, now, 'highpass')
    this.tone(820, 'triangle', 0.05, 0.002, 0.04, now, 600)
  }

  settle(weight: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    // Tablet speakers barely play below 200 Hz, so the weight is carried by a
    // knock whose harmonics they can play; the deep sine is only for headphones,
    // kept low so it cannot pump the compressor and duck the bell.
    this.tone(74, 'sine', 0.08 + weight * 0.08, 0.006, 0.42, now, 44)
    this.tone(180, 'triangle', 0.07 + weight * 0.08, 0.004, 0.22, now, 120)
    this.burst(520, 1.2, 0.08 + weight * 0.14, 0.09, now, 'lowpass')
    const bell = BELLS[this.bell % BELLS.length]
    this.bell += 2
    this.tone(bell, 'sine', 0.06, 0.004, 1.5, now + 0.03)
    this.tone(bell * 2.76, 'sine', 0.015, 0.002, 0.4, now + 0.03)
  }

  bump(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(128, 'sine', 0.16, 0.004, 0.12, now, 92)
    this.burst(380, 1, 0.08, 0.06, now, 'lowpass')
  }

  step(foot: number, onBird: boolean): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (now - this.lastStep < 0.07) return
    this.lastStep = now
    this.burst(foot ? 1650 : 1350, 1.6, 0.045, 0.035, now)
    this.tone(foot ? 330 : 294, 'sine', 0.03, 0.003, 0.05, now)
    if (onBird) this.burst(3200, 1.2, 0.02, 0.05, now)
  }

  shimmer(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    const notes = [1318.5, 1568, 1975.5, 2637]
    notes.forEach((f, i) => {
      this.tone(f, 'sine', 0.045, 0.01, 0.7, now + i * 0.05)
      this.tone(f * 1.006, 'sine', 0.02, 0.01, 0.6, now + i * 0.05)
    })
  }

  door(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    for (const [i, f] of [293.66, 369.99, 440, 587.33, 739.99].entries()) {
      this.tone(f, 'sine', 0.07, 0.35 + i * 0.05, 2.4, now + i * 0.06)
      this.tone(f * 2.002, 'triangle', 0.012, 0.4, 1.6, now + i * 0.06)
    }
    this.tone(73.4, 'sine', 0.09, 0.5, 2.2, now)
  }

  enter(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.burst(900, 0.6, 0.07, 0.5, now, 'lowpass')
    this.tone(1174.66, 'sine', 0.06, 0.01, 1.4, now + 0.1)
    this.tone(1760, 'sine', 0.03, 0.01, 1.1, now + 0.18)
  }

  travel(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.burst(420, 0.7, 0.08, 0.55, now, 'lowpass')
    this.tone(98, 'sine', 0.08, 0.1, 0.5, now)
  }

  arrive(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(880, 'sine', 0.05, 0.005, 0.7, now)
    this.tone(1174.66, 'sine', 0.045, 0.005, 0.9, now + 0.09)
    this.tone(110, 'sine', 0.1, 0.004, 0.18, now, 70)
  }

  chirp(kind: ChirpKind): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    switch (kind) {
      case 'hop':
        this.tone(2700, 'sine', 0.045, 0.003, 0.05, now, 3700)
        return
      case 'huff':
        this.tone(1500, 'triangle', 0.04, 0.005, 0.1, now, 1050)
        this.burst(2200, 1.4, 0.03, 0.08, now)
        return
      case 'peep':
        this.tone(3100, 'sine', 0.04, 0.003, 0.035, now, 3500)
        this.tone(3100, 'sine', 0.035, 0.003, 0.035, now + 0.07, 3600)
        return
      default: {
        const unreachable: never = kind
        return unreachable
      }
    }
  }

  flap(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (now - this.lastFlap < 0.06) return
    this.lastFlap = now
    this.burst(760, 0.8, 0.04, 0.05, now)
  }

  poke(kind: Poke): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    switch (kind) {
      case 'ruffle':
        // A scolding double chirp over a rustle of feathers.
        this.tone(2700, 'sine', 0.05, 0.003, 0.05, now, 2000)
        this.tone(2500, 'sine', 0.045, 0.003, 0.05, now + 0.07, 1850)
        this.burst(3200, 1.2, 0.02, 0.07, now)
        return
      case 'puff':
        // A low rolling trill as the chest swells.
        for (let i = 0; i < 5; i++) this.tone(1250 - i * 40, 'triangle', 0.035 - i * 0.005, 0.004, 0.03, now + i * 0.034)
        this.burst(1400, 0.8, 0.015, 0.12, now + 0.02, 'lowpass')
        return
      case 'bob':
        // One rising pip for each of the two flaps.
        this.tone(2300, 'sine', 0.045, 0.003, 0.04, now + 0.09, 3000)
        this.tone(2700, 'sine', 0.045, 0.003, 0.04, now + 0.22, 3400)
        return
      default: {
        const unreachable: never = kind
        return unreachable
      }
    }
  }

  greet(kind: Greet): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    switch (kind) {
      case 'look-out':
        this.tone(1760, 'sine', 0.06, 0.003, 0.9, now)
        this.tone(2637, 'sine', 0.025, 0.003, 0.6, now + 0.01)
        return
      case 'bow':
        // A soft falling pair, slow in and slow out.
        this.tone(1318.51, 'sine', 0.045, 0.03, 0.9, now)
        this.tone(880, 'sine', 0.05, 0.04, 1.2, now + 0.3)
        return
      case 'swing':
        // The lantern rings once each way, half a pendulum swing apart.
        this.tone(1760, 'sine', 0.05, 0.003, 0.7, now)
        this.tone(1975.53, 'sine', 0.035, 0.003, 0.7, now + LANTERN_HALF_SWING)
        return
      default: {
        const unreachable: never = kind
        return unreachable
      }
    }
  }

  wonder(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(392, 'triangle', 0.05, 0.03, 0.14, now)
    this.tone(494, 'triangle', 0.05, 0.03, 0.28, now + 0.16, 587)
  }

  tock(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(480, 'sine', 0.08, 0.002, 0.06, now, 280)
    this.burst(900, 1.5, 0.05, 0.03, now)
  }

  grip(): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    this.tone(660, 'triangle', 0.06, 0.002, 0.05, now, 520)
    this.burst(2100, 2, 0.05, 0.02, now)
  }

  air(): void {
    const context = this.ready()
    if (!context) return
    this.burst(2600, 0.9, 0.018, 0.14, context.currentTime)
  }

  ringTap(slot: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    const f = RING[slot % RING.length]
    this.tone(f, 'sine', 0.08, 0.003, 0.5, now)
    this.tone(f * 3.99, 'sine', 0.02, 0.002, 0.08, now)
  }
}
