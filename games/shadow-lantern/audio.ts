import type { Sound } from './controller'
import type { CreatureKind } from './creatures'

// Every sound in the theatre is synthesized with raw Web Audio: paper
// rustles and taps, the pin's tick, a soft kalimba note as each dot of the
// outline falls into shadow, the sleeper's hum, the peel, each creature's
// own little voice, and a few quiet crickets. The context is only created
// inside the child's first tap, is suspended while the theatre is unattended
// or hidden, and is rebuilt if WebKit leaves it `interrupted` or `closed`.

type ExtendedState = AudioContextState | 'interrupted'

/** C major pentatonic from C5, for the dots. */
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51]

export class LanternAudio implements Sound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private slideGain: GainNode | null = null
  private humGain: GainNode | null = null
  private sources: AudioScheduledSourceNode[] = []
  private active = true
  private nextCricket = 0
  private slideLevel = 0
  private lastSlide = 0
  private lastHum = 0

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
      this.slideGain?.gain.setTargetAtTime(0, this.context.currentTime, 0.02)
      this.humGain?.gain.setTargetAtTime(0, this.context.currentTime, 0.02)
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
    master.gain.value = 0.6
    const compressor = context.createDynamicsCompressor()
    master.connect(compressor).connect(context.destination)
    const noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    // A small wooden theatre: a procedural decaying-noise impulse.
    const length = Math.round(context.sampleRate * 0.9)
    const impulse = context.createBuffer(2, length, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6
    }
    const convolver = context.createConvolver()
    convolver.buffer = impulse
    const warm = context.createBiquadFilter()
    warm.type = 'lowpass'
    warm.frequency.value = 2600
    const room = context.createGain()
    room.gain.value = 0.2
    master.connect(room).connect(warm).connect(convolver).connect(compressor)

    // A shape sliding over the stage: looping paper noise whose level follows speed.
    const slide = context.createBufferSource()
    slide.buffer = noise
    slide.loop = true
    const slideFilter = context.createBiquadFilter()
    slideFilter.type = 'bandpass'
    slideFilter.frequency.value = 1900
    slideFilter.Q.value = 0.9
    const slideGain = context.createGain()
    slideGain.gain.value = 0
    slide.connect(slideFilter).connect(slideGain).connect(master)
    slide.start()

    // The sleeper's hum, a low breathy tone that swells as the outline fills.
    const hum = context.createOscillator()
    hum.type = 'sine'
    hum.frequency.value = 118
    const vibrato = context.createOscillator()
    vibrato.frequency.value = 0.35
    const vibratoDepth = context.createGain()
    vibratoDepth.gain.value = 6
    vibrato.connect(vibratoDepth).connect(hum.frequency)
    const humGain = context.createGain()
    humGain.gain.value = 0
    hum.connect(humGain).connect(master)
    hum.start()
    vibrato.start()

    this.context = context
    this.master = master
    this.noise = noise
    this.slideGain = slideGain
    this.humGain = humGain
    this.sources = [slide, hum, vibrato]
    this.nextCricket = context.currentTime + 4
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
    this.noise = null
    this.slideGain = null
    this.humGain = null
  }

  private live(): AudioContext | null {
    return this.context && this.master && this.active && this.context.state === 'running' ? this.context : null
  }

  /** A tone with a quick attack and exponential decay, optionally gliding. */
  private tone(type: OscillatorType, from: number, to: number, start: number, duration: number, gain: number, attack = 0.006): void {
    const context = this.context!
    const osc = context.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(from, start)
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration * 0.8)
    const env = context.createGain()
    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(gain, start + attack)
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(env).connect(this.master!)
    osc.start(start)
    osc.stop(start + duration + 0.05)
  }

  /** Filtered noise with a shaped envelope; the filter can sweep. */
  private hiss(type: BiquadFilterType, fromHz: number, toHz: number, start: number, duration: number, gain: number, q = 1): void {
    const context = this.context!
    const source = context.createBufferSource()
    source.buffer = this.noise
    const filter = context.createBiquadFilter()
    filter.type = type
    filter.Q.value = q
    filter.frequency.setValueAtTime(fromHz, start)
    if (toHz !== fromHz) filter.frequency.exponentialRampToValueAtTime(toHz, start + duration)
    const env = context.createGain()
    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.03, duration * 0.3))
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.connect(filter).connect(env).connect(this.master!)
    source.start(start, Math.random() * 1.5)
    source.stop(start + duration + 0.05)
  }

  pick(): void {
    const c = this.live()
    if (!c) return
    this.hiss('bandpass', 3200, 2400, c.currentTime, 0.09, 0.12, 1.4)
  }

  drop(height: number): void {
    const c = this.live()
    if (!c) return
    const t = c.currentTime
    const weight = Math.min(1, 0.4 + height * 0.35)
    this.tone('sine', 190, 120, t, 0.12, 0.22 * weight)
    this.hiss('highpass', 2500, 2500, t, 0.04, 0.08 * weight)
  }

  turn(): void {
    const c = this.live()
    if (!c) return
    const t = c.currentTime
    this.tone('triangle', 950, 900, t, 0.05, 0.12)
    this.tone('triangle', 1320, 1250, t + 0.06, 0.05, 0.09)
  }

  slide(speed: number): void {
    this.slideLevel = Math.max(this.slideLevel, Math.min(0.07, speed * 0.0012))
  }

  dot(fill: number): void {
    const c = this.live()
    if (!c) return
    const note = PENTATONIC[Math.max(0, Math.min(PENTATONIC.length - 1, Math.floor(fill * PENTATONIC.length)))]
    const t = c.currentTime
    this.tone('sine', note, note, t, 0.5, 0.07, 0.004)
    this.tone('sine', note * 2.01, note * 2.01, t, 0.18, 0.02, 0.004)
  }

  /** Every frame: the sleeper's hum, the sliding paper, and now and then a cricket. */
  stir(level: number): void {
    const c = this.live()
    if (!c) return
    const hum = level > 0.15 ? Math.round((level - 0.15) * 50) / 1000 : 0
    if (this.humGain && hum !== this.lastHum) {
      this.lastHum = hum
      this.humGain.gain.setTargetAtTime(hum, c.currentTime, 0.3)
    }
    // The slide level falls away by itself unless a drag keeps feeding it.
    const slide = this.slideLevel < 0.004 ? 0 : this.slideLevel
    if (this.slideGain && Math.abs(slide - this.lastSlide) > 0.002) {
      this.lastSlide = slide
      this.slideGain.gain.setTargetAtTime(slide, c.currentTime, 0.05)
    }
    this.slideLevel *= 0.8
    if (c.currentTime >= this.nextCricket) {
      const t = c.currentTime
      for (let i = 0; i < 3; i++) this.tone('sine', 4400, 4300, t + i * 0.07, 0.04, 0.012, 0.004)
      this.nextCricket = t + 6 + Math.random() * 7
    }
  }

  snuffle(kind: CreatureKind): void {
    const c = this.live()
    if (!c) return
    const t = c.currentTime
    this.hiss('bandpass', 900, 500, t, 0.25, 0.08, 2)
    const low = kind === 'whale' ? 90 : kind === 'dragon' ? 110 : kind === 'bird' ? 420 : 200
    this.tone('sine', low, low * 0.8, t + 0.08, 0.35, 0.06, 0.04)
  }

  wake(): void {
    const c = this.live()
    if (!c) return
    const t = c.currentTime
    // A warm rising arpeggio and a shimmer.
    ;[261.63, 329.63, 392, 523.25].forEach((f, i) => this.tone('sine', f, f, t + i * 0.09, 1.2, 0.07, 0.02))
    this.hiss('highpass', 6000, 6000, t + 0.3, 0.6, 0.02)
  }

  peel(): void {
    const c = this.live()
    if (!c) return
    this.hiss('bandpass', 700, 3600, c.currentTime, 0.55, 0.12, 1.6)
  }

  voice(kind: CreatureKind): void {
    const c = this.live()
    if (!c) return
    const t = c.currentTime
    switch (kind) {
      case 'bird':
        this.tone('sine', 2300, 3400, t, 0.09, 0.08)
        this.tone('sine', 2500, 3600, t + 0.13, 0.09, 0.07)
        break
      case 'fish':
        for (let i = 0; i < 3; i++) this.tone('sine', 480 + i * 60, 920 + i * 80, t + i * 0.08, 0.05, 0.08)
        break
      case 'snail':
        this.tone('sine', 330, 250, t, 0.5, 0.08, 0.03)
        this.tone('sine', 495, 380, t + 0.05, 0.4, 0.03, 0.03)
        break
      case 'whale':
        this.tone('sine', 140, 225, t, 0.7, 0.1, 0.12)
        this.tone('sine', 225, 170, t + 0.6, 0.8, 0.08, 0.05)
        break
      case 'fox':
        this.tone('triangle', 700, 1150, t, 0.1, 0.09)
        this.tone('triangle', 1100, 800, t + 0.1, 0.1, 0.07)
        break
      case 'dragon':
        this.hiss('lowpass', 900, 300, t, 0.45, 0.14)
        this.tone('sawtooth', 70, 62, t + 0.1, 0.5, 0.05, 0.05)
        break
      default: {
        const unreachable: never = kind
        void unreachable
      }
    }
  }

  lamp(): void {
    const c = this.live()
    if (!c) return
    this.hiss('lowpass', 400, 900, c.currentTime, 0.45, 0.12)
  }

  sparkle(): void {
    const c = this.live()
    if (!c) return
    const t = c.currentTime
    this.tone('sine', 1760, 1760, t, 0.3, 0.04)
    this.tone('sine', 2637, 2637, t + 0.05, 0.25, 0.025)
  }
}
