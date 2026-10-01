// Synthesized sound for the arcade round: raw Web Audio, no files. The stage
// unlocks the context inside the first real touch; before that every call is a
// silent no-op, and none of this touches the DOM at import time.
//
// Most cues take a `step`: a whole number that walks up a major pentatonic
// scale, so a combo can play step 0, 1, 2, 3... and always sound like music.

export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth'

export interface ToneOptions {
  // Start frequency in Hz, and where it glides to (default: stays).
  freq: number
  to?: number
  // Seconds.
  dur?: number
  type?: Wave
  // 0..1, default 0.25.
  vol?: number
  // Seconds from now.
  delay?: number
  attack?: number
}

export interface NoiseOptions {
  dur?: number
  vol?: number
  // Filter centre in Hz, and where it sweeps to.
  freq?: number
  to?: number
  filter?: 'lowpass' | 'highpass' | 'bandpass'
  q?: number
  delay?: number
}

export interface Sfx {
  // Low level: one oscillator with a pitch glide and a fast decay.
  tone(options: ToneOptions): void
  // Low level: filtered noise (whooshes, splats, crunches, rain).
  noise(options?: NoiseOptions): void
  // A note on the pentatonic scale, step 0 is C5; negative steps go down.
  note(step: number, dur?: number, type?: Wave, vol?: number): void
  // Frequency for a scale step, for building your own cues.
  scale(step: number): number

  pop(step?: number): void
  boing(step?: number): void
  coin(step?: number): void
  ding(step?: number): void
  tick(): void
  thud(strength?: number): void
  whoosh(): void
  splat(): void
  chomp(): void
  zap(): void
  crunch(): void
  // Soft "not that": never harsh, never a punishment.
  nope(): void
  slideUp(): void
  slideDown(): void
  // Three rising notes for a small win; a longer flourish for a big one.
  win(): void
  fanfare(): void

  setMuted(muted: boolean): void
  readonly muted: boolean
  // For the stage: call inside a real pointer event.
  unlock(): void
  dispose(): void
}

const PENTATONIC = [0, 2, 4, 7, 9]
const C5 = 523.25

export function scaleFreq(step: number): number {
  const s = Math.round(step)
  const octave = Math.floor(s / PENTATONIC.length)
  const degree = ((s % PENTATONIC.length) + PENTATONIC.length) % PENTATONIC.length
  return C5 * 2 ** (octave + PENTATONIC[degree]! / 12)
}

// A little random detune so a repeated cue never sounds like a machine gun.
function vary(amount = 0.04): number {
  return 1 + (Math.random() * 2 - 1) * amount
}

export function createSfx(): Sfx {
  let ac: AudioContext | null = null
  let master: GainNode | null = null
  let noiseBuffer: AudioBuffer | null = null
  let muted = false

  const ensure = (): AudioContext | null => {
    if (ac) return ac
    const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      ac = new Ctor()
    } catch {
      return null
    }
    const limiter = ac.createDynamicsCompressor()
    limiter.threshold.value = -12
    limiter.ratio.value = 8
    master = ac.createGain()
    master.gain.value = muted ? 0 : 0.7
    master.connect(limiter)
    limiter.connect(ac.destination)
    const length = ac.sampleRate
    noiseBuffer = ac.createBuffer(1, length, ac.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    return ac
  }

  // Usable once unlock() has run inside a touch. The context may still be
  // resuming then; its clock stands still until it does, so a cue scheduled
  // now plays the moment it wakes and the very first touch is not silent.
  const live = (): AudioContext | null => (ac && ac.state !== 'closed' && !muted ? ac : null)

  const tone = (o: ToneOptions): void => {
    const ctx = live()
    if (!ctx || !master) return
    const t0 = ctx.currentTime + (o.delay ?? 0)
    const dur = o.dur ?? 0.15
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = o.type ?? 'sine'
    osc.frequency.setValueAtTime(Math.max(20, o.freq), t0)
    if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur)
    const vol = o.vol ?? 0.25
    const attack = o.attack ?? 0.005
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(vol, t0 + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(gain)
    gain.connect(master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  const noise = (o: NoiseOptions = {}): void => {
    const ctx = live()
    if (!ctx || !master || !noiseBuffer) return
    const t0 = ctx.currentTime + (o.delay ?? 0)
    const dur = o.dur ?? 0.2
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = o.filter ?? 'bandpass'
    filter.Q.value = o.q ?? 1
    filter.frequency.setValueAtTime(Math.max(30, o.freq ?? 1200), t0)
    if (o.to !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t0 + dur)
    const gain = ctx.createGain()
    const vol = o.vol ?? 0.25
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 3))
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    src.start(t0, Math.random() * 0.5)
    src.stop(t0 + dur + 0.02)
  }

  const note = (step: number, dur = 0.22, type: Wave = 'triangle', vol = 0.22): void => {
    tone({ freq: scaleFreq(step), dur, type, vol })
  }

  return {
    tone,
    noise,
    note,
    scale: scaleFreq,

    pop(step = 0) {
      const f = scaleFreq(step) * 0.75 * vary()
      tone({ freq: f, to: f * 2.2, dur: 0.07, type: 'sine', vol: 0.3 })
      noise({ dur: 0.04, freq: 3000, vol: 0.12, filter: 'highpass' })
    },
    boing(step = 0) {
      const f = scaleFreq(step) * 0.3 * vary()
      tone({ freq: f, to: f * 2.4, dur: 0.22, type: 'triangle', vol: 0.3 })
      tone({ freq: f * 2, to: f * 3.2, dur: 0.18, type: 'sine', vol: 0.1, delay: 0.02 })
    },
    coin(step = 0) {
      const f = scaleFreq(step + 5)
      tone({ freq: f, dur: 0.07, type: 'square', vol: 0.11 })
      tone({ freq: f * 1.5, dur: 0.22, type: 'square', vol: 0.11, delay: 0.06 })
    },
    ding(step = 0) {
      const f = scaleFreq(step + 5)
      tone({ freq: f, dur: 0.5, type: 'sine', vol: 0.22 })
      tone({ freq: f * 2.01, dur: 0.3, type: 'sine', vol: 0.07 })
    },
    tick() {
      tone({ freq: 1400 * vary(0.08), dur: 0.03, type: 'square', vol: 0.07 })
    },
    thud(strength = 1) {
      const s = Math.max(0.2, Math.min(2, strength))
      tone({ freq: 150 * vary(), to: 45, dur: 0.16 + 0.06 * s, type: 'sine', vol: Math.min(0.6, 0.35 * s) })
      noise({ dur: 0.08, freq: 400, vol: 0.12 * s, filter: 'lowpass' })
    },
    whoosh() {
      noise({ dur: 0.22, freq: 500 * vary(0.2), to: 3200, vol: 0.16, q: 0.8 })
    },
    splat() {
      noise({ dur: 0.18, freq: 1800, to: 250, vol: 0.3, filter: 'lowpass' })
      tone({ freq: 240 * vary(), to: 70, dur: 0.14, type: 'sine', vol: 0.22 })
    },
    chomp() {
      noise({ dur: 0.06, freq: 900, vol: 0.28, filter: 'lowpass' })
      tone({ freq: 320 * vary(), to: 120, dur: 0.09, type: 'square', vol: 0.1 })
      noise({ dur: 0.05, freq: 700, vol: 0.2, filter: 'lowpass', delay: 0.11 })
    },
    zap() {
      tone({ freq: 1500 * vary(), to: 180, dur: 0.16, type: 'sawtooth', vol: 0.13 })
    },
    crunch() {
      for (let i = 0; i < 4; i++) noise({ dur: 0.04, freq: 1500 + Math.random() * 2500, vol: 0.2, delay: i * 0.025, q: 2 })
    },
    nope() {
      tone({ freq: 220, to: 160, dur: 0.16, type: 'triangle', vol: 0.18 })
      tone({ freq: 180, to: 130, dur: 0.2, type: 'triangle', vol: 0.18, delay: 0.12 })
    },
    slideUp() {
      tone({ freq: 300, to: 1200, dur: 0.25, type: 'sine', vol: 0.2 })
    },
    slideDown() {
      tone({ freq: 900, to: 200, dur: 0.3, type: 'sine', vol: 0.2 })
    },
    win() {
      for (let i = 0; i < 3; i++) tone({ freq: scaleFreq(i * 2), dur: 0.2, type: 'triangle', vol: 0.22, delay: i * 0.09 })
    },
    fanfare() {
      const steps = [0, 2, 4, 5, 7, 10]
      steps.forEach((s, i) => {
        tone({ freq: scaleFreq(s), dur: i === steps.length - 1 ? 0.7 : 0.18, type: 'triangle', vol: 0.22, delay: i * 0.1 })
        tone({ freq: scaleFreq(s) / 2, dur: 0.2, type: 'square', vol: 0.05, delay: i * 0.1 })
      })
    },

    setMuted(next) {
      muted = next
      if (master && ac) master.gain.setValueAtTime(next ? 0 : 0.7, ac.currentTime)
    },
    get muted() {
      return muted
    },
    unlock() {
      const ctx = ensure()
      if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {})
    },
    dispose() {
      const ctx = ac
      ac = null
      master = null
      noiseBuffer = null
      if (ctx) void ctx.close().catch(() => {})
    },
  }
}
