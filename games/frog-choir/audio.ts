import type { Sound } from './controller'
import { CAST, type Character } from './view/frog'

// Every sound on the pond is synthesized with raw Web Audio. Each frog has
// its own voice: the show-off is brassy with a scoop up into the note, the
// bouncy one a plucked "rib-bit", the sleepy one a low slow hum that sags,
// the shy one a breathy little whistle, and the crooner a vowel "ahh" with
// a wide late vibrato. A soft echo over the water ties them together.
//
// The context is only created inside a real touch, is suspended while the
// pond is unattended or hidden, and is rebuilt if WebKit leaves it
// `interrupted` or `closed`. Loop notes arrive a little early with a delay,
// so they land on the audio clock exactly on the beat.

type ExtendedState = AudioContextState | 'interrupted'

export class PondAudio implements Sound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private echo: GainNode | null = null
  private noise: AudioBuffer | null = null
  private active = true

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
    compressor.threshold.value = -16
    compressor.ratio.value = 3
    master.connect(compressor).connect(context.destination)

    // An echo across the water: a lowpassed feedback delay.
    const echo = context.createGain()
    echo.gain.value = 0.22
    const delay = context.createDelay(1)
    delay.delayTime.value = 0.31
    const feedback = context.createGain()
    feedback.gain.value = 0.28
    const damp = context.createBiquadFilter()
    damp.type = 'lowpass'
    damp.frequency.value = 1900
    echo.connect(delay).connect(damp).connect(feedback).connect(delay)
    damp.connect(compressor)

    const noise = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    this.context = context
    this.master = master
    this.echo = echo
    this.noise = noise
  }

  private teardown(): void {
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
    this.echo = null
    this.noise = null
  }

  private ready(): { ctx: AudioContext; out: GainNode; echo: GainNode } | null {
    if (!this.context || !this.master || !this.echo || !this.active) return null
    return { ctx: this.context, out: this.master, echo: this.echo }
  }

  /** A gain node wired to the dry bus and, a little, to the echo. */
  private bus(ctx: AudioContext, out: GainNode, echo: GainNode, wet: number): GainNode {
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(out)
    if (wet > 0) {
      const send = ctx.createGain()
      send.gain.value = wet
      gain.connect(send).connect(echo)
    }
    return gain
  }

  voice(frog: number, pitch: number, delay: number, strength: number): void {
    const audio = this.ready()
    if (!audio) return
    const character = CAST[frog]?.character
    if (!character) return
    const at = audio.ctx.currentTime + Math.max(0, delay)
    VOICES[character](audio.ctx, this.bus(audio.ctx, audio.out, audio.echo, 0.5), pitch, at, Math.min(1.3, strength), this.noise!)
  }

  plink(pitch: number, strength: number): void {
    const audio = this.ready()
    if (!audio) return
    const { ctx } = audio
    const t = ctx.currentTime
    const gain = this.bus(ctx, audio.out, audio.echo, 0.6)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(pitch * 2.02, t)
    osc.frequency.exponentialRampToValueAtTime(pitch * 2, t + 0.05)
    const overtone = ctx.createOscillator()
    overtone.type = 'sine'
    overtone.frequency.value = pitch * 5.1
    const overtoneGain = ctx.createGain()
    overtoneGain.gain.setValueAtTime(0.18, t)
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    overtone.connect(overtoneGain).connect(gain)
    osc.connect(gain)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.32 * strength, t + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
    osc.start(t)
    overtone.start(t)
    osc.stop(t + 0.6)
    overtone.stop(t + 0.2)
  }

  bloop(pitch: number): void {
    const audio = this.ready()
    if (!audio) return
    const { ctx } = audio
    const t = ctx.currentTime
    const gain = this.bus(ctx, audio.out, audio.echo, 0.35)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(pitch * 0.8, t)
    osc.frequency.exponentialRampToValueAtTime(pitch * 2.1, t + 0.09)
    osc.connect(gain)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.start(t)
    osc.stop(t + 0.2)
  }

  lift(frog: number): void {
    const audio = this.ready()
    if (!audio) return
    const { ctx } = audio
    const t = ctx.currentTime
    const base = 330 * (CAST[frog]?.scale ? 1 / CAST[frog].scale : 1)
    const gain = this.bus(ctx, audio.out, audio.echo, 0.2)
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(base, t)
    osc.frequency.exponentialRampToValueAtTime(base * 2, t + 0.16)
    osc.connect(gain)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    osc.start(t)
    osc.stop(t + 0.25)
  }

  land(frog: number): void {
    const audio = this.ready()
    if (!audio || !this.noise) return
    const { ctx } = audio
    const t = ctx.currentTime
    const weight = CAST[frog]?.scale ?? 1
    const gain = this.bus(ctx, audio.out, audio.echo, 0.15)
    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(190 / weight, t)
    thump.frequency.exponentialRampToValueAtTime(80 / weight, t + 0.09)
    thump.connect(gain)
    const pat = ctx.createBufferSource()
    pat.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const patGain = ctx.createGain()
    patGain.gain.value = 0.5
    pat.connect(filter).connect(patGain).connect(gain)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.34 * weight, t + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
    thump.start(t)
    pat.start(t, Math.random() * 0.5)
    thump.stop(t + 0.16)
    pat.stop(t + 0.16)
  }

  splash(): void {
    const audio = this.ready()
    if (!audio || !this.noise) return
    const { ctx } = audio
    const t = ctx.currentTime
    const gain = this.bus(ctx, audio.out, audio.echo, 0.4)
    const source = ctx.createBufferSource()
    source.buffer = this.noise
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 1.2
    band.frequency.setValueAtTime(2600, t)
    band.frequency.exponentialRampToValueAtTime(500, t + 0.35)
    source.connect(band).connect(gain)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42)
    source.start(t, Math.random() * 0.4)
    source.stop(t + 0.45)
    for (let i = 0; i < 3; i++) {
      const drop = ctx.createOscillator()
      drop.type = 'sine'
      const start = t + 0.12 + i * 0.07 + Math.random() * 0.03
      const f = 700 + Math.random() * 500
      drop.frequency.setValueAtTime(f, start)
      drop.frequency.exponentialRampToValueAtTime(f * 2.2, start + 0.05)
      const dropGain = ctx.createGain()
      dropGain.gain.setValueAtTime(0.0001, start)
      dropGain.gain.exponentialRampToValueAtTime(0.12, start + 0.005)
      dropGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.07)
      drop.connect(dropGain).connect(audio.out)
      drop.start(start)
      drop.stop(start + 0.08)
    }
  }

  chime(): void {
    const audio = this.ready()
    if (!audio) return
    const { ctx } = audio
    const t = ctx.currentTime
    ;[1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
      const start = t + i * 0.075
      const gain = this.bus(ctx, audio.out, audio.echo, 0.8)
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = f
      const shimmer = ctx.createOscillator()
      shimmer.type = 'sine'
      shimmer.frequency.value = f * 2.76
      const shimmerGain = ctx.createGain()
      shimmerGain.gain.value = 0.25
      shimmer.connect(shimmerGain).connect(gain)
      osc.connect(gain)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.13, start + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6)
      osc.start(start)
      shimmer.start(start)
      osc.stop(start + 0.65)
      shimmer.stop(start + 0.65)
    })
  }

  preview(pitch: number): void {
    const audio = this.ready()
    if (!audio) return
    const { ctx } = audio
    const t = ctx.currentTime
    const gain = this.bus(ctx, audio.out, audio.echo, 0.3)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = pitch
    osc.connect(gain)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
    osc.start(t)
    osc.stop(t + 0.32)
  }
}

type Voice = (ctx: AudioContext, out: GainNode, pitch: number, at: number, strength: number, noise: AudioBuffer) => void

function shape(gain: AudioParam, at: number, peak: number, attack: number, hold: number, release: number): number {
  gain.setValueAtTime(0.0001, at)
  gain.exponentialRampToValueAtTime(peak, at + attack)
  gain.setValueAtTime(peak, at + attack + hold)
  gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release)
  return at + attack + hold + release + 0.02
}

/** Brassy, scooping up into the note, with a filter that opens as it swells. */
const showoffVoice: Voice = (ctx, out, pitch, at, strength) => {
  const saw = ctx.createOscillator()
  saw.type = 'sawtooth'
  saw.frequency.setValueAtTime(pitch * 0.94, at)
  saw.frequency.exponentialRampToValueAtTime(pitch, at + 0.07)
  const square = ctx.createOscillator()
  square.type = 'square'
  square.frequency.setValueAtTime(pitch * 0.47, at)
  square.frequency.exponentialRampToValueAtTime(pitch * 0.5, at + 0.07)
  const squareGain = ctx.createGain()
  squareGain.gain.value = 0.25
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 4
  filter.frequency.setValueAtTime(500, at)
  filter.frequency.exponentialRampToValueAtTime(2600, at + 0.12)
  filter.frequency.exponentialRampToValueAtTime(1100, at + 0.5)
  saw.connect(filter)
  square.connect(squareGain).connect(filter)
  filter.connect(out)
  const end = shape(out.gain, at, 0.2 * strength, 0.03, 0.26, 0.22)
  saw.start(at)
  square.start(at)
  saw.stop(end)
  square.stop(end)
}

/** Rib-bit: two quick plucks, the second brighter. */
const bouncyVoice: Voice = (ctx, out, pitch, at, strength) => {
  out.gain.setValueAtTime(strength * 0.9, at)
  for (const [offset, bright] of [
    [0, 900],
    [0.2, 2200],
  ] as const) {
    const start = at + offset
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(pitch * 1.06, start)
    osc.frequency.exponentialRampToValueAtTime(pitch, start + 0.04)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(bright, start)
    filter.frequency.exponentialRampToValueAtTime(400, start + 0.14)
    const pluck = ctx.createGain()
    const end = shape(pluck.gain, start, 0.22, 0.006, 0.03, 0.12)
    osc.connect(filter).connect(pluck).connect(out)
    osc.start(start)
    osc.stop(end)
  }
}

/** A low hum an octave down, slow to swell, sagging at the end like a yawn. */
const sleepyVoice: Voice = (ctx, out, pitch, at, strength) => {
  const low = pitch / 2
  const tri = ctx.createOscillator()
  tri.type = 'triangle'
  tri.frequency.setValueAtTime(low, at)
  tri.frequency.setValueAtTime(low, at + 0.5)
  tri.frequency.exponentialRampToValueAtTime(low * 0.9, at + 0.85)
  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(low / 2, at)
  sub.frequency.setValueAtTime(low / 2, at + 0.5)
  sub.frequency.exponentialRampToValueAtTime(low * 0.45, at + 0.85)
  const subGain = ctx.createGain()
  subGain.gain.value = 0.5
  const hum = ctx.createBiquadFilter()
  hum.type = 'lowpass'
  hum.frequency.value = 700
  tri.connect(hum)
  sub.connect(subGain).connect(hum)
  hum.connect(out)
  const end = shape(out.gain, at, 0.42 * strength, 0.2, 0.32, 0.36)
  tri.start(at)
  sub.start(at)
  tri.stop(end)
  sub.stop(end)
}

/** A breathy little whistle an octave up, with a puff of air before it. */
const shyVoice: Voice = (ctx, out, pitch, at, strength, noise) => {
  const high = pitch * 2
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(high * 0.98, at)
  osc.frequency.linearRampToValueAtTime(high, at + 0.1)
  const wobble = ctx.createOscillator()
  wobble.frequency.value = 6
  const wobbleDepth = ctx.createGain()
  wobbleDepth.gain.value = high * 0.006
  wobble.connect(wobbleDepth).connect(osc.frequency)
  osc.connect(out)
  const breath = ctx.createBufferSource()
  breath.buffer = noise
  const airy = ctx.createBiquadFilter()
  airy.type = 'bandpass'
  airy.frequency.value = high * 1.5
  airy.Q.value = 2
  const breathGain = ctx.createGain()
  shape(breathGain.gain, at, 0.08, 0.04, 0.05, 0.2)
  breath.connect(airy).connect(breathGain).connect(out)
  const end = shape(out.gain, at, 0.3 * strength, 0.08, 0.16, 0.2)
  osc.start(at)
  wobble.start(at)
  breath.start(at, Math.random() * 0.5)
  osc.stop(end)
  wobble.stop(end)
  breath.stop(end)
}

/** An "ahh" vowel an octave down, with a wide vibrato that blooms late. */
const croonerVoice: Voice = (ctx, out, pitch, at, strength) => {
  const low = pitch / 2
  const saw = ctx.createOscillator()
  saw.type = 'sawtooth'
  saw.frequency.value = low
  const vibrato = ctx.createOscillator()
  vibrato.frequency.value = 5.2
  const depth = ctx.createGain()
  depth.gain.setValueAtTime(0, at)
  depth.gain.linearRampToValueAtTime(low * 0.018, at + 0.35)
  vibrato.connect(depth).connect(saw.frequency)
  const mix = ctx.createGain()
  mix.gain.value = 1
  for (const [frequency, q, level] of [
    [760, 6, 1],
    [1150, 7, 0.55],
    [2500, 8, 0.2],
  ] as const) {
    const formant = ctx.createBiquadFilter()
    formant.type = 'bandpass'
    formant.frequency.value = frequency
    formant.Q.value = q
    const formantGain = ctx.createGain()
    formantGain.gain.value = level
    saw.connect(formant).connect(formantGain).connect(mix)
  }
  mix.connect(out)
  const end = shape(out.gain, at, 0.9 * strength, 0.09, 0.42, 0.34)
  saw.start(at)
  vibrato.start(at)
  saw.stop(end)
  vibrato.stop(end)
}

const VOICES: Record<Character, Voice> = {
  showoff: showoffVoice,
  bouncy: bouncyVoice,
  sleepy: sleepyVoice,
  shy: shyVoice,
  crooner: croonerVoice,
}
