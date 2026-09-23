import type { GardenSound, Scenery } from './controller'
import type { CreatureKind } from './creatures'
import type { PokeName } from './motion'

// Every sound on the hillside is synthesized with raw Web Audio: a brook
// that babbles louder as more water falls, hollow bamboo toks, the sluice
// board's wooden clunk, the mill's creak and a windchime that ring while a
// wheel turns, soft bell chords as a plot blooms, and a voice for each
// visitor. The context is created only inside the child's first tap, is
// suspended while the garden is unattended or hidden, and is rebuilt if
// WebKit leaves it `interrupted` or `closed` after backgrounding.

const PENTATONIC = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5]
const CHIME = [1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093]
/** Brook gain at full flow: a few dB under a bamboo tok, so the water the child built never buries their own touches. */
const BROOK = 0.1

type ExtendedState = AudioContextState | 'interrupted'

export class GardenAudio implements GardenSound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private brook: GainNode | null = null
  private brookSource: AudioBufferSourceNode | null = null
  private lfos: OscillatorNode[] = []
  private active = true
  private streamLevel = -1
  private nextCreak = 0
  private nextChime = 0
  private chimeStep = 0

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
    const noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    // An open-air hillside: a short, bright procedural reverb tail, no recorded assets.
    const impulseLength = Math.round(context.sampleRate * 1.1)
    const impulse = context.createBuffer(2, impulseLength, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel)
      for (let i = 0; i < impulseLength; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / impulseLength) ** 4
    }
    const convolver = context.createConvolver()
    convolver.buffer = impulse
    const air = context.createGain()
    air.gain.value = 0.2
    master.connect(air).connect(convolver).connect(compressor)

    // The brook: looping noise through two wandering band-passes (the babble) over a low rumble.
    const brook = context.createGain()
    brook.gain.value = 0
    brook.connect(master)
    const source = context.createBufferSource()
    source.buffer = noise
    source.loop = true
    const lfos: OscillatorNode[] = []
    for (const [centre, depth, rate, q, level] of [
      [900, 420, 0.7, 4, 0.5],
      [1700, 700, 1.3, 6, 0.3],
      [320, 80, 0.3, 0.8, 0.55],
    ]) {
      const filter = context.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = centre
      filter.Q.value = q
      const lfo = context.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = rate
      const lfoDepth = context.createGain()
      lfoDepth.gain.value = depth
      lfo.connect(lfoDepth).connect(filter.frequency)
      lfo.start()
      lfos.push(lfo)
      const gain = context.createGain()
      gain.gain.value = level
      source.connect(filter).connect(gain).connect(brook)
    }
    source.start()
    Object.assign(this, { context, master, noise, brook, brookSource: source, lfos, streamLevel: -1 })
  }

  private teardown(): void {
    for (const node of [this.brookSource, ...this.lfos]) {
      try {
        node?.stop()
      } catch {
        // already stopped
      }
    }
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
    this.brook = null
    this.brookSource = null
    this.lfos = []
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

  private noiseBurst(frequency: number, q: number, peak: number, decay: number, at: number, type: BiquadFilterType = 'bandpass', sweepTo?: number): void {
    const context = this.context!
    const source = context.createBufferSource()
    source.buffer = this.noise
    source.playbackRate.value = 0.8 + Math.random() * 0.4
    const filter = context.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(frequency, at)
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + decay)
    filter.Q.value = q
    source.connect(filter).connect(this.envelope(context, peak, 0.004, decay, at))
    source.start(at, Math.random() * 1.5, decay + 0.08)
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

  /** A bell: a sine with a quieter, slightly sharp overtone, long decay. */
  private bell(frequency: number, peak: number, decay: number, at: number): void {
    this.tone(frequency, 'sine', peak, 0.004, decay, at)
    this.tone(frequency * 2.76, 'sine', peak * 0.18, 0.002, decay * 0.4, at)
  }

  /** The hollow knock of bamboo on bamboo. */
  tok(pitch: number, weight = 1): void {
    const context = this.ready()
    if (!context) return
    const t = context.currentTime
    const f = 420 * pitch * (0.96 + Math.random() * 0.08)
    this.tone(f, 'triangle', 0.7, 0.002, 0.12, t, f * 0.82)
    this.tone(f * 2.3, 'sine', 0.18, 0.001, 0.05, t)
    this.noiseBurst(2600, 3, 0.26, 0.03, t)
    if (weight > 1) {
      this.tone(120, 'sine', 0.45 * (weight - 1), 0.003, 0.18, t, 70)
      this.noiseBurst(300, 0.8, 0.2 * (weight - 1), 0.1, t, 'lowpass')
    }
  }

  clunk(open: boolean, landIn: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    if (open) {
      this.tone(170, 'triangle', 0.5, 0.003, 0.18, now, 240)
      this.noiseBurst(700, 2, 0.24, 0.08, now)
      this.noiseBurst(900, 1.5, 0.075, 0.25, now + 0.05, 'bandpass', 1800)
      return
    }
    // A short wooden slide, the slam as the board lands, and the small knock of its one bounce.
    this.noiseBurst(1600, 2.5, 0.05, landIn, now, 'bandpass', 900)
    const t = now + landIn
    this.tone(210, 'triangle', 0.4, 0.002, 0.18, t, 120)
    this.noiseBurst(700, 2, 0.2, 0.07, t)
    this.tone(260, 'triangle', 0.1, 0.002, 0.06, t + 0.13, 180)
  }

  lift(weight: number): void {
    const context = this.ready()
    if (!context) return
    const t = context.currentTime
    const low = 1 / Math.sqrt(weight)
    this.noiseBurst(500 * low, 1.2, 0.28, 0.16 / low, t, 'bandpass', 1500 * low)
    this.tone(300 * low, 'sine', 0.26, 0.02 / low, 0.12 / low, t, 420 * low)
  }

  putBack(weight: number): void {
    const context = this.ready()
    if (!context) return
    const t = context.currentTime
    this.tone(150 / Math.sqrt(weight), 'sine', 0.35, 0.004, 0.16, t, 90 / Math.sqrt(weight))
    this.noiseBurst(400, 0.8, 0.13, 0.1, t, 'lowpass')
  }

  /** A plot in full bloom: a rising three-note bell chord from the pentatonic, one root per plot. */
  chime(step: number): void {
    const context = this.ready()
    if (!context) return
    const t = context.currentTime
    for (let i = 0; i < 3; i++) this.bell(PENTATONIC[(step * 2 + i * 2) % PENTATONIC.length] * 2, 0.08, 1.4, t + i * 0.11)
  }

  pop(): void {
    const context = this.ready()
    if (!context) return
    const t = context.currentTime
    this.tone(520, 'sine', 0.42, 0.002, 0.08, t, 1100)
    this.noiseBurst(1800, 2, 0.1, 0.05, t)
    this.bell(1567.98, 0.1, 0.6, t + 0.06)
  }

  rustle(): void {
    const context = this.ready()
    if (!context) return
    const t = context.currentTime
    for (let i = 0; i < 3; i++) this.noiseBurst(3200 + Math.random() * 1600, 0.9, 0.18, 0.07, t + i * 0.05 + Math.random() * 0.02, 'highpass')
  }

  splash(): void {
    const context = this.ready()
    if (!context) return
    const t = context.currentTime
    this.noiseBurst(1300, 0.9, 0.23, 0.3, t, 'bandpass', 500)
    for (let i = 0; i < 4; i++) {
      const f = 1300 + Math.random() * 1200
      this.tone(f, 'sine', 0.1, 0.002, 0.07, t + 0.04 + i * 0.07 + Math.random() * 0.03, f * 1.5)
    }
  }

  /** A swish through long grass, a plip in the creek, or a breath of wind with one windchime note. */
  scenery(where: Scenery): void {
    const context = this.ready()
    if (!context) return
    const t = context.currentTime
    switch (where) {
      case 'meadow':
        this.noiseBurst(2400, 0.8, 0.45, 0.16, t, 'bandpass', 1200)
        this.noiseBurst(4200, 0.9, 0.18, 0.06, t + 0.06, 'highpass')
        return
      case 'creek': {
        const f = 680 + Math.random() * 120
        this.tone(f, 'sine', 0.3, 0.002, 0.08, t, f * 2)
        this.tone(f * 1.45, 'sine', 0.14, 0.002, 0.06, t + 0.09, f * 2.6)
        this.noiseBurst(1500, 1, 0.14, 0.12, t, 'bandpass', 700)
        return
      }
      case 'sky':
        this.chimeStep = (this.chimeStep + 1 + Math.floor(Math.random() * 3)) % CHIME.length
        this.noiseBurst(700, 0.7, 0.05, 0.5, t, 'bandpass', 1600)
        this.bell(CHIME[this.chimeStep], 0.04, 1.8, t + 0.12)
        return
      default: {
        const never: never = where
        return never
      }
    }
  }

  arrive(kind: CreatureKind): void {
    const context = this.ready()
    if (!context) return
    const t = context.currentTime
    switch (kind) {
      case 'frog':
        this.ribbit(t, 150, 1.8)
        break
      case 'sparrow':
        for (let i = 0; i < 2; i++) this.chirp(t + i * 0.1, 3000 + Math.random() * 600, 1.35, 0.18)
        break
      case 'tanuki':
        // Three snuffles and a small contented hum as it settles.
        for (let i = 0; i < 3; i++) this.noiseBurst(700, 1.5, 0.15, 0.07, t + i * 0.13, 'lowpass')
        this.hum(t + 0.45, 200, 0.5)
        break
      default: {
        const never: never = kind
        return never
      }
    }
  }

  /** Each move has its own voice, timed to the beats of its animation. */
  poke(move: PokeName): void {
    const context = this.ready()
    if (!context) return
    const t = context.currentTime
    switch (move) {
      case 'spin-leap':
        // A rising whoop through the spin, a soft landing, then the ribbit.
        this.tone(320, 'sine', 0.08, 0.02, 0.36, t + 0.16, 760)
        this.noiseBurst(500, 1, 0.08, 0.08, t + 0.7, 'lowpass')
        this.ribbit(t + 0.8, 150, 1)
        break
      case 'croak-puff':
        // Two deep croaks, one per balloon.
        this.ribbit(t + 0.12, 96, 1.2)
        this.ribbit(t + 0.76, 88, 1.2)
        break
      case 'belly-flop':
        this.tone(380, 'sine', 0.06, 0.01, 0.12, t + 0.15, 520)
        this.tone(130, 'sine', 0.28, 0.003, 0.2, t + 0.57, 60)
        this.noiseBurst(600, 0.8, 0.18, 0.18, t + 0.57, 'lowpass', 250)
        this.ribbit(t + 1, 130, 0.6)
        break
      case 'startle-hover':
        // Alarm chirps over a flurry of wingbeats.
        for (let i = 0; i < 3; i++) this.chirp(t + i * 0.08, 3600 + i * 150, 1.2, 0.13)
        for (let i = 0; i < 9; i++) this.noiseBurst(2400, 0.9, 0.05, 0.035, t + 0.05 + i * 0.075, 'highpass')
        break
      case 'scold':
        // Chit-chit-chit, one per hop on the spot.
        for (let i = 0; i < 9; i++) {
          this.chirp(t + 0.1 + i * 0.13, 4100 - (i % 2) * 300, 0.74, 0.08)
          this.noiseBurst(5000, 3, 0.03, 0.02, t + 0.1 + i * 0.13)
        }
        break
      case 'hop-back':
        for (const at of [0.22, 0.46, 1.12, 1.36]) this.noiseBurst(3000, 2, 0.06, 0.025, t + at)
        // A questioning two-note tweet as it cocks its head at the finger.
        this.chirp(t + 0.56, 2800, 1.28, 0.12)
        this.chirp(t + 0.68, 3300, 1.18, 0.1)
        break
      case 'yawn-stretch':
        this.yawn(t + 0.4)
        break
      case 'roll-over':
        this.noiseBurst(600, 0.9, 0.07, 0.3, t + 0.3, 'lowpass', 1400)
        this.hum(t + 0.9, 180, 0.8)
        this.noiseBurst(600, 0.9, 0.06, 0.3, t + 1.9, 'lowpass', 1400)
        break
      case 'peek-and-burrow':
        for (const at of [0.2, 0.34]) this.noiseBurst(2600, 1.5, 0.025, 0.06, t + at)
        this.tone(230, 'triangle', 0.1, 0.02, 0.22, t + 0.62, 165)
        this.noiseBurst(500, 0.8, 0.07, 0.4, t + 1.15, 'lowpass', 1100)
        break
      default: {
        const never: never = move
        return never
      }
    }
  }

  /** A buzzy trill: four quick square pulses over a croaky band of noise. */
  private ribbit(at: number, pitch: number, loud: number): void {
    for (let i = 0; i < 4; i++) this.tone(pitch + i * pitch * 0.08, 'square', 0.07 * loud, 0.004, 0.035, at + i * 0.042, pitch * 0.8)
    this.noiseBurst(pitch * 6, 4, 0.05 * loud, 0.16, at, 'bandpass', pitch * 4.6)
  }

  private chirp(at: number, frequency: number, bend: number, peak: number): void {
    this.tone(frequency, 'sine', peak, 0.004, 0.06, at, frequency * bend)
  }

  /** A big sleepy yawn: up, then a long sigh down, with a little wobble. */
  private yawn(at: number): void {
    const context = this.context!
    const osc = context.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(260, at)
    osc.frequency.exponentialRampToValueAtTime(480, at + 0.4)
    osc.frequency.exponentialRampToValueAtTime(210, at + 1.3)
    this.wobbly(osc, 6, 9, 900, 0.12, 0.25, 1.1, at, 1.5)
  }

  /** A contented closed-mouth hum that rises and settles. */
  private hum(at: number, pitch: number, length: number): void {
    const context = this.context!
    const osc = context.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(pitch, at)
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.3, at + length * 0.35)
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.9, at + length)
    this.wobbly(osc, 4.5, 6, 600, 0.1, 0.12, length, at, length + 0.2)
  }

  private wobbly(osc: OscillatorNode, rate: number, depthHz: number, lowpass: number, peak: number, attack: number, decay: number, at: number, length: number): void {
    const context = this.context!
    const vibrato = context.createOscillator()
    vibrato.frequency.value = rate
    const depth = context.createGain()
    depth.gain.value = depthHz
    vibrato.connect(depth).connect(osc.frequency)
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = lowpass
    osc.connect(filter).connect(this.envelope(context, peak, attack, decay, at))
    osc.start(at)
    vibrato.start(at)
    osc.stop(at + length)
    vibrato.stop(at + length)
  }

  /** Called every frame: the brook follows how much water is falling; the mill creaks and the chime rings while a wheel turns. */
  flow(stream: number, wheels: number): void {
    const context = this.ready()
    if (!context || !this.brook) return
    const t = context.currentTime
    if (Math.abs(stream - this.streamLevel) > 0.02) {
      this.streamLevel = stream
      this.brook.gain.setTargetAtTime(stream * BROOK, t, 0.4)
    }
    if (wheels < 0.2) return
    if (t >= this.nextCreak) {
      this.nextCreak = t + 1.6 / wheels + Math.random() * 0.3
      const f = 190 + Math.random() * 40
      this.tone(f, 'sawtooth', 0.025 * wheels, 0.05, 0.22, t, f * 0.85)
      this.noiseBurst(1100, 8, 0.03 * wheels, 0.2, t, 'bandpass', 800)
    }
    if (t >= this.nextChime) {
      this.nextChime = t + (0.7 + Math.random() * 1.1) / wheels
      this.chimeStep = (this.chimeStep + 1 + Math.floor(Math.random() * 3)) % CHIME.length
      this.bell(CHIME[this.chimeStep], 0.035 * wheels, 1.8, t)
    }
  }
}
