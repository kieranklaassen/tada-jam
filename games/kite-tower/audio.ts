import type { PieceKind } from './pieces'

// Every sound in the playroom is synthesized with raw Web Audio: modal wood
// "toks" (three partials of a free wooden bar) pitched by the piece, a
// ratchet for the quarter turn, each doll's own footfall and giggle, the
// kite's wind, and a pentatonic run when the kite comes free. Nothing is
// spoken. The context is created inside the child's first touch, suspended
// while unattended or hidden, and rebuilt if WebKit leaves it interrupted.
//
// The expensive parts never land on a touch or a frame: the white noise (also
// the room's impulse) is filled in small slices after load, and each piece's
// tok is rendered once offline, so a landing plays one buffer through one gain
// instead of building a dozen nodes. Until those are ready, the same sounds
// are synthesized live.

export type Doll = 0 | 1 | 2

export interface KiteSound {
  unlock(): void
  setActive(active: boolean): void
  tok(kind: PieceKind, speed: number): void
  pickup(): void
  turn(): void
  putAway(): void
  step(doll: Doll): void
  climb(): void
  giggle(doll: Doll): void
  whee(): void
  boop(doll: Doll): void
  flutter(): void
  miss(): void
  wind(on: boolean): void
  freed(): void
  land(): void
  dispose(): void
}

const BAR_MODES = [1, 2.756, 5.404]
const PITCH: Record<PieceKind, number> = { cube: 560, pillar: 470, archL: 300, archM: 390, half: 420, plank: 340 }
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51]
const VOICE: Record<Doll, number> = { 0: 760, 1: 390, 2: 1020 }

type ExtendedState = AudioContextState | 'interrupted'

const BAKE_RATE = 48000
const NOISE_SAMPLES = BAKE_RATE
const NOISE_SLICE = 4096
const IMPULSE_SECONDS = 0.45
const TOK_SECONDS = 0.26
/** A tok's loudness at full speed; quieter toks scale the baked one down. */
const TOK_FULL = 0.39

function voiceTone(context: BaseAudioContext, out: AudioNode, freq: number, at: number, duration: number, gain: number, type: OscillatorType = 'sine', glideTo?: number): void {
  const osc = context.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + duration)
  const env = context.createGain()
  env.gain.setValueAtTime(0.0001, at)
  env.gain.exponentialRampToValueAtTime(gain, at + 0.006)
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  osc.connect(env).connect(out)
  osc.start(at)
  osc.stop(at + duration + 0.02)
}

function voiceBurst(context: BaseAudioContext, out: AudioNode, noise: AudioBuffer, at: number, duration: number, freq: number, q: number, gain: number, type: BiquadFilterType = 'bandpass'): void {
  const source = context.createBufferSource()
  source.buffer = noise
  const filter = context.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  filter.Q.value = q
  const env = context.createGain()
  env.gain.setValueAtTime(0.0001, at)
  env.gain.exponentialRampToValueAtTime(gain, at + 0.004)
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  source.connect(filter).connect(env).connect(out)
  source.start(at, Math.random() * 0.5)
  source.stop(at + duration + 0.02)
}

/** Three partials of a free wooden bar and a short knock, at full speed. */
function voiceTok(context: BaseAudioContext, out: AudioNode, noise: AudioBuffer, base: number, at: number, loud: number): void {
  BAR_MODES.forEach((ratio, i) => voiceTone(context, out, base * ratio, at, 0.22 / (i + 1), (0.34 * loud + 0.05) / (i * 1.6 + 1)))
  voiceBurst(context, out, noise, at, 0.025, base * 3, 1.4, 0.18 * loud + 0.03)
}

function whiteNoise(length: number): Float32Array<ArrayBuffer> {
  const data = new Float32Array(length)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return data
}

export class KiteAudio implements KiteSound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private windSource: AudioBufferSourceNode | null = null
  private windGain: GainNode | null = null
  private active = true
  private lastTok = 0
  private toksThisBurst = 0
  private noiseData: Float32Array<ArrayBuffer> | null = null
  private baked: Partial<Record<PieceKind, AudioBuffer>> = {}
  private timer: ReturnType<typeof setTimeout> | null = null
  private disposed = false

  constructor() {
    if (typeof window === 'undefined') return
    const data = new Float32Array(NOISE_SAMPLES)
    let filled = 0
    const slice = () => {
      this.timer = null
      if (this.disposed) return
      const end = Math.min(NOISE_SAMPLES, filled + NOISE_SLICE)
      for (let i = filled; i < end; i++) data[i] = Math.random() * 2 - 1
      filled = end
      if (filled < NOISE_SAMPLES) this.timer = setTimeout(slice, 0)
      else {
        this.noiseData = data
        this.timer = setTimeout(() => void this.bake(), 0)
      }
    }
    this.timer = setTimeout(slice, 0)
  }

  /** Renders each piece's tok once, off the main thread, so a landing is one buffer. */
  private async bake(): Promise<void> {
    this.timer = null
    const Offline = window.OfflineAudioContext
    if (!Offline || !this.noiseData) return
    for (const kind of Object.keys(PITCH) as PieceKind[]) {
      if (this.disposed) return
      try {
        const offline = new Offline(1, Math.round(BAKE_RATE * TOK_SECONDS), BAKE_RATE)
        const noise = offline.createBuffer(1, this.noiseData.length, BAKE_RATE)
        noise.copyToChannel(this.noiseData, 0)
        voiceTok(offline, offline.destination, noise, PITCH[kind], 0, 1)
        this.baked[kind] = await offline.startRendering()
      } catch {
        return
      }
    }
  }

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
      this.wind(false)
      void this.context.suspend()
    }
  }

  dispose(): void {
    this.disposed = true
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    this.teardown()
  }

  private build(): void {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    const context = new AudioCtor()
    const master = context.createGain()
    master.gain.value = 0.62
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -16
    master.connect(compressor).connect(context.destination)

    const noiseData = this.noiseData ?? whiteNoise(NOISE_SAMPLES)
    const noise = context.createBuffer(1, noiseData.length, BAKE_RATE)
    noise.copyToChannel(noiseData, 0)

    // A small wooden room: a short procedural impulse, no recorded assets.
    // The convolver needs the context's own rate; the two channels take
    // different stretches of the noise.
    const length = Math.min(Math.round(context.sampleRate * IMPULSE_SECONDS), noiseData.length >> 1)
    const impulse = context.createBuffer(2, length, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel)
      const offset = channel * (noiseData.length >> 1)
      for (let i = 0; i < length; i++) {
        const fade = 1 - i / length
        const fade2 = fade * fade
        samples[i] = noiseData[offset + i] * fade2 * fade2
      }
    }
    const room = context.createConvolver()
    room.buffer = impulse
    const send = context.createGain()
    send.gain.value = 0.12
    master.connect(send).connect(room).connect(compressor)

    const windSource = context.createBufferSource()
    windSource.buffer = noise
    windSource.loop = true
    const windFilter = context.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 520
    windFilter.Q.value = 0.8
    const lfo = context.createOscillator()
    lfo.frequency.value = 0.35
    const lfoDepth = context.createGain()
    lfoDepth.gain.value = 260
    lfo.connect(lfoDepth).connect(windFilter.frequency)
    const windGain = context.createGain()
    windGain.gain.value = 0
    windSource.connect(windFilter).connect(windGain).connect(master)
    windSource.start()
    lfo.start()

    this.context = context
    this.master = master
    this.noise = noise
    this.windSource = windSource
    this.windGain = windGain
  }

  private teardown(): void {
    try {
      this.windSource?.stop()
    } catch {
      // already stopped
    }
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
    this.noise = null
    this.windSource = null
    this.windGain = null
  }

  private ready(): { context: AudioContext; master: GainNode } | null {
    if (!this.context || !this.master || !this.active || this.context.state !== 'running') return null
    return { context: this.context, master: this.master }
  }

  private tone(freq: number, at: number, duration: number, gain: number, type: OscillatorType = 'sine', glideTo?: number): void {
    const live = this.ready()
    if (live) voiceTone(live.context, live.master, freq, at, duration, gain, type, glideTo)
  }

  private burst(at: number, duration: number, freq: number, q: number, gain: number, type: BiquadFilterType = 'bandpass'): void {
    const live = this.ready()
    if (live && this.noise) voiceBurst(live.context, live.master, this.noise, at, duration, freq, q, gain, type)
  }

  private now(): number {
    return this.context?.currentTime ?? 0
  }

  tok(kind: PieceKind, speed: number): void {
    const at = this.now()
    if (at - this.lastTok < 0.025) {
      if (++this.toksThisBurst > 3) return
    } else this.toksThisBurst = 0
    this.lastTok = at
    const live = this.ready()
    if (!live || !this.noise) return
    const loud = Math.min(1, speed / 6)
    const detune = 0.97 + Math.random() * 0.06
    const baked = this.baked[kind]
    if (!baked) {
      voiceTok(live.context, live.master, this.noise, PITCH[kind] * detune, at, loud)
      return
    }
    const source = live.context.createBufferSource()
    source.buffer = baked
    source.playbackRate.value = detune
    const gain = live.context.createGain()
    gain.gain.value = (0.34 * loud + 0.05) / TOK_FULL
    source.connect(gain).connect(live.master)
    source.start(at)
  }

  pickup(): void {
    const at = this.now()
    this.burst(at, 0.12, 1400, 0.7, 0.08)
    this.tone(880, at + 0.01, 0.07, 0.06, 'sine', 1180)
  }

  turn(): void {
    const at = this.now()
    for (let i = 0; i < 3; i++) {
      this.burst(at + i * 0.045, 0.02, 3200, 3, 0.14)
      this.tone(1500 - i * 120, at + i * 0.045, 0.03, 0.04, 'triangle')
    }
  }

  putAway(): void {
    const at = this.now()
    this.tone(330, at, 0.16, 0.18)
    this.tone(330 * 2.756, at, 0.07, 0.06)
    this.tone(262, at + 0.09, 0.2, 0.14)
  }

  step(doll: Doll): void {
    const at = this.now()
    if (doll === 0) {
      this.tone(210, at, 0.07, 0.12, 'sine', 140)
      this.burst(at, 0.03, 900, 1, 0.04)
    } else if (doll === 1) {
      this.tone(150, at, 0.12, 0.1, 'triangle', 120)
      this.burst(at, 0.05, 600, 2, 0.05)
    } else {
      this.tone(420, at, 0.035, 0.07, 'sine', 360)
    }
  }

  climb(): void {
    const at = this.now()
    this.tone(420, at, 0.14, 0.09, 'sine', 760)
    this.tone(280, at + 0.16, 0.09, 0.1, 'sine', 200)
  }

  giggle(doll: Doll): void {
    const at = this.now()
    const base = VOICE[doll]
    const count = doll === 1 ? 3 : doll === 2 ? 6 : 5
    const gap = doll === 1 ? 0.13 : doll === 2 ? 0.06 : 0.085
    for (let i = 0; i < count; i++) {
      const f = base * (1 + 0.08 * Math.sin(i * 2.1)) * (1 - i * 0.025)
      this.tone(f, at + i * gap, gap * 0.9, 0.07, 'triangle', f * 1.12)
    }
  }

  whee(): void {
    const at = this.now()
    this.tone(980, at, 0.55, 0.07, 'triangle', 330)
  }

  boop(doll: Doll): void {
    const at = this.now()
    const f = VOICE[doll]
    this.tone(f * 0.7, at, 0.18, 0.09, 'sine', f * 1.3)
    this.tone(f * 1.3, at + 0.1, 0.14, 0.05, 'sine', f)
  }

  flutter(): void {
    const at = this.now()
    for (let i = 0; i < 5; i++) this.burst(at + i * 0.05, 0.05, 2200 + i * 150, 1.2, 0.06)
  }

  /** A finger that finds nothing: a soft felt "poff" off the rug, quieter than anything wooden. */
  miss(): void {
    const at = this.now()
    this.burst(at, 0.09, 340, 0.9, 0.05, 'lowpass')
    this.tone(196, at, 0.11, 0.045, 'sine', 148)
  }

  wind(on: boolean): void {
    if (!this.context || !this.windGain) return
    const at = this.context.currentTime
    this.windGain.gain.cancelScheduledValues(at)
    this.windGain.gain.setTargetAtTime(on ? 0.16 : 0, at, on ? 0.4 : 0.6)
  }

  freed(): void {
    const at = this.now()
    PENTATONIC.forEach((f, i) => {
      this.tone(f, at + i * 0.07, 0.5, 0.08)
      this.tone(f * 4, at + i * 0.07, 0.12, 0.015)
    })
  }

  land(): void {
    const at = this.now()
    this.tone(180, at, 0.16, 0.16, 'sine', 110)
    this.burst(at, 0.06, 700, 1, 0.06)
    this.tone(PENTATONIC[4], at + 0.08, 0.6, 0.05)
    this.tone(PENTATONIC[7], at + 0.16, 0.7, 0.04)
  }
}
