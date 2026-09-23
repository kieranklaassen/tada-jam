import type { Cue, Sound } from './controller'
import type { Phase } from './cycle'
import type { AnimalKey, HomeKey } from './layout'

// Every sound in the forest is synthesized with raw Web Audio: a voice and
// a yawn for each animal, soft thuds that follow weight, a warm chime when
// someone settles, quiet snores, the physical sounds of a wrong fit (a
// bonk, a splash, a slide, a flop), a knock for each kind of home, and at
// night a music-box "Twinkle Twinkle" (public domain) over a soft pad. The
// context is created inside the child's first tap, suspended while the
// forest is unattended or hidden, and rebuilt if WebKit leaves it
// `interrupted` or `closed`.

type ExtendedState = AudioContextState | 'interrupted'

const NOTE = { G3: 196, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5 } as const

/** Each animal's own note, for its settle chime and its sleepy murmur. */
const ANIMAL_NOTE: Record<AnimalKey, number> = { owl: NOTE.C5, fox: NOTE.D5, rabbit: NOTE.E5, bear: NOTE.G4, fish: NOTE.A4, songbird: NOTE.G5 }

type Chord = readonly [number, number, number]
const CHORD: Record<'C' | 'F' | 'G', Chord> = {
  C: [130.81, 164.81, 196],
  F: [174.61, 220, 261.63],
  G: [98, 123.47, 146.83],
}

/** Twinkle Twinkle Little Star: [note, beats] per line, with one chord per two beats. */
const LINE_A: readonly [number, number][] = [
  [NOTE.C5, 1], [NOTE.C5, 1], [NOTE.G5, 1], [NOTE.G5, 1], [NOTE.A5, 1], [NOTE.A5, 1], [NOTE.G5, 2],
]
const LINE_B: readonly [number, number][] = [
  [NOTE.F5, 1], [NOTE.F5, 1], [NOTE.E5, 1], [NOTE.E5, 1], [NOTE.D5, 1], [NOTE.D5, 1], [NOTE.C5, 2],
]
const LINE_C: readonly [number, number][] = [
  [NOTE.G5, 1], [NOTE.G5, 1], [NOTE.F5, 1], [NOTE.F5, 1], [NOTE.E5, 1], [NOTE.E5, 1], [NOTE.D5, 2],
]
const LULLABY: readonly (readonly [number, number][])[] = [LINE_A, LINE_B, LINE_C, LINE_C, LINE_A, LINE_B]
const LULLABY_CHORDS: readonly (keyof typeof CHORD)[][] = [
  ['C', 'C', 'F', 'C'],
  ['F', 'C', 'G', 'C'],
  ['C', 'F', 'C', 'G'],
  ['C', 'F', 'C', 'G'],
  ['C', 'C', 'F', 'C'],
  ['F', 'C', 'G', 'C'],
]
const BEAT = 0.52

const TWINKLE_NOTES = [NOTE.C6, NOTE.E6, NOTE.G5, NOTE.A5, NOTE.E5]

export class ForestAudio implements Sound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private active = true
  private readonly last = new Map<string, number>()
  private twinkle = 0

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

  cue(cue: Cue, animal: AnimalKey | null, strength: number): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    switch (cue) {
      case 'pickup':
        if (this.throttle('voice', now, 0.18)) this.voice(animal, now, strength, 1.1)
        return
      case 'trick':
        if (this.throttle('voice', now, 0.18)) this.voice(animal, now, 1, 1.25)
        return
      case 'answer':
        // Just after the knock, a little lower than its pickup call: "that's mine".
        if (this.throttle('voice', now, 0.18)) this.voice(animal, now + 0.2, strength * 0.85, 1)
        return
      case 'yawn':
      case 'invite':
        if (this.throttle('yawn', now, 0.8)) this.yawn(animal, now, cue === 'invite' ? 1 : 0.7)
        return
      case 'land':
        if (this.throttle(`land-${animal}`, now, 0.12)) this.thud(now, strength)
        return
      case 'settle':
        this.settle(animal, now)
        return
      case 'snore':
        if (this.throttle('snore', now, 1.1)) this.snore(animal, now)
        return
      case 'bumped':
        // A soft pillowy boing, kept well under the settle chime: a wrong fit is never the loudest moment.
        this.tone(230, 'sine', 0.1, 0.018, 0.3, now, 175)
        this.noiseBurst(320, 0.8, 0.07, 0.12, now + 0.02, 'lowpass')
        return
      case 'shiver':
        for (let i = 0; i < 6; i++) this.noiseBurst(1800, 1.2, 0.05, 0.05, now + i * 0.07)
        this.tone(ANIMAL_NOTE[animal ?? 'rabbit'] * 1.5, 'triangle', 0.06, 0.02, 0.3, now + 0.1, ANIMAL_NOTE[animal ?? 'rabbit'] * 1.3)
        return
      case 'splash':
        this.noiseBurst(1300, 0.8, 0.3, 0.45, now)
        this.tone(420, 'sine', 0.12, 0.005, 0.12, now + 0.05, 1200)
        this.tone(560, 'sine', 0.08, 0.005, 0.1, now + 0.16, 1500)
        return
      case 'shake':
        for (let i = 0; i < 5; i++) this.noiseBurst(2600, 0.9, 0.09, 0.06, now + i * 0.08)
        return
      case 'slid':
        this.tone(900, 'sine', 0.1, 0.02, 0.5, now, 300)
        return
      case 'tipped':
        this.tone(340, 'triangle', 0.07, 0.03, 0.35, now, 250)
        this.noiseBurst(2200, 0.9, 0.12, 0.12, now + 0.05)
        this.noiseBurst(1800, 0.9, 0.09, 0.1, now + 0.2)
        return
      case 'flop':
        this.noiseBurst(900, 1.5, 0.22, 0.09, now)
        this.thud(now, 0.3)
        return
      case 'plop':
        this.tone(480, 'sine', 0.22, 0.004, 0.16, now, 1400)
        this.noiseBurst(1600, 1, 0.08, 0.2, now + 0.03)
        return
      case 'flap':
        for (let i = 0; i < 4; i++) this.noiseBurst(1100, 0.6, 0.2, 0.09, now + i * 0.13, 'lowpass')
        return
      case 'wake':
        this.yawn(animal, now, 0.8)
        this.tone(ANIMAL_NOTE[animal ?? 'owl'], 'sine', 0.05, 0.3, 1.2, now + 0.6)
        return
      case 'exit':
        this.noiseBurst(400, 1, 0.08, 0.1, now + 0.9, 'lowpass')
        return
      case 'hover':
        if (this.throttle('hover', now, 0.25)) {
          this.tone(NOTE.G5, 'sine', 0.06, 0.01, 0.35, now)
          this.tone(NOTE.C6, 'sine', 0.04, 0.01, 0.4, now + 0.07)
        }
        return
      case 'stir':
        this.murmur(animal, now)
        return
      case 'rustle':
        if (this.throttle('rustle', now, 0.1)) this.noiseBurst(3200, 0.6, 0.12 * strength, 0.22, now, 'highpass')
        return
      case 'twinkle': {
        const note = TWINKLE_NOTES[this.twinkle++ % TWINKLE_NOTES.length]
        this.musicBox(note, now, 0.16)
        return
      }
      default: {
        const unreachable: never = cue
        return unreachable
      }
    }
  }

  knock(home: HomeKey): void {
    const context = this.ready()
    if (!context || !this.throttle('knock', context.currentTime, 0.12)) return
    const now = context.currentTime
    switch (home) {
      case 'hollow':
        this.knockWood(now, 520, 0.26)
        this.knockWood(now + 0.14, 470, 0.2)
        return
      case 'nest':
        this.noiseBurst(2600, 0.9, 0.28, 0.08, now)
        this.knockWood(now + 0.02, 880, 0.12)
        this.noiseBurst(2200, 0.9, 0.2, 0.08, now + 0.12)
        return
      case 'den':
      case 'burrow':
      case 'cave':
        this.thud(now, home === 'cave' ? 0.9 : 0.5)
        this.noiseBurst(300, 1, 0.1, 0.15, now, 'lowpass')
        return
      case 'pond':
        this.tone(640, 'sine', 0.18, 0.004, 0.14, now, 1100)
        return
      default: {
        const unreachable: never = home
        return unreachable
      }
    }
  }

  phase(phase: Phase): void {
    const context = this.ready()
    if (!context) return
    const now = context.currentTime
    switch (phase) {
      case 'nightfall':
        this.musicBox(NOTE.G5, now + 0.8, 0.12)
        this.musicBox(NOTE.C6, now + 1.3, 0.12)
        this.musicBox(NOTE.E6, now + 1.8, 0.12)
        return
      case 'night':
        this.lullaby(now + 0.4)
        return
      case 'dawn':
        for (let i = 0; i < 9; i++) this.chirp(now + 0.8 + i * 0.55 + Math.random() * 0.3, 0.07)
        return
      case 'dusk':
        return
      default: {
        const unreachable: never = phase
        return unreachable
      }
    }
  }

  // --- the voices -------------------------------------------------------------------

  private voice(animal: AnimalKey | null, at: number, strength: number, lift: number): void {
    const s = 0.6 + 0.4 * Math.min(1, strength)
    switch (animal) {
      case 'owl':
        this.tone(392 * lift, 'sine', 0.15 * s, 0.05, 0.32, at, 360 * lift)
        this.tone(370 * lift, 'sine', 0.135 * s, 0.05, 0.42, at + 0.4, 330 * lift)
        return
      case 'fox':
        this.tone(760 * lift, 'triangle', 0.14 * s, 0.01, 0.12, at, 1250 * lift)
        this.tone(1100 * lift, 'triangle', 0.1 * s, 0.01, 0.12, at + 0.13, 700 * lift)
        return
      case 'rabbit':
        this.noiseBurst(4200, 2, 0.08 * s, 0.04, at)
        this.noiseBurst(4200, 2, 0.08 * s, 0.04, at + 0.09)
        this.tone(1500 * lift, 'sine', 0.07 * s, 0.01, 0.1, at + 0.18, 1900 * lift)
        return
      case 'bear':
        this.growl(120 * lift, at, 0.5, 0.2 * s)
        return
      case 'fish':
        this.tone(300 * lift, 'sine', 0.2 * s, 0.005, 0.1, at, 900 * lift)
        this.tone(380 * lift, 'sine', 0.16 * s, 0.005, 0.1, at + 0.14, 1100 * lift)
        return
      case 'songbird':
        for (let i = 0; i < 3; i++) this.chirp(at + i * 0.11, 0.1 * s)
        return
      case null:
        return
      default: {
        const unreachable: never = animal
        return unreachable
      }
    }
  }

  private yawn(animal: AnimalKey | null, at: number, strength: number): void {
    const g = 0.12 * strength
    switch (animal) {
      case 'owl':
        this.tone(420, 'sine', g, 0.25, 0.9, at, 300)
        this.noiseBurst(900, 0.7, g * 0.3, 0.8, at + 0.1, 'lowpass')
        return
      case 'fox':
        this.tone(900, 'triangle', g * 0.8, 0.15, 0.7, at, 480)
        return
      case 'rabbit':
        this.tone(1300, 'sine', g * 0.6, 0.12, 0.5, at, 800)
        return
      case 'bear':
        this.growl(140, at, 1.3, g * 1.4)
        return
      case 'fish':
        for (let i = 0; i < 3; i++) this.tone(260 + i * 90, 'sine', g, 0.01, 0.12, at + i * 0.18, 700 + i * 150)
        return
      case 'songbird':
        this.tone(3200, 'sine', g * 0.6, 0.05, 0.45, at, 1900)
        return
      case null:
        return
      default: {
        const unreachable: never = animal
        return unreachable
      }
    }
  }

  private settle(animal: AnimalKey | null, at: number): void {
    const note = ANIMAL_NOTE[animal ?? 'owl']
    this.musicBox(note, at + 0.1, 0.16)
    this.musicBox(note * 1.5, at + 0.32, 0.12)
    this.musicBox(note * 2, at + 0.54, 0.1)
    this.noiseBurst(700, 0.6, 0.06, 0.9, at + 0.5, 'lowpass')
  }

  private snore(animal: AnimalKey | null, at: number): void {
    const heavy = animal === 'bear' ? 1.6 : animal === 'songbird' ? 0.5 : 1
    if (animal === 'songbird') {
      this.tone(2400, 'sine', 0.02, 0.3, 0.6, at, 2100)
      return
    }
    this.noiseBurst(260 / heavy, 1.2, 0.05 * heavy, 0.9, at, 'lowpass')
    this.tone(90 / heavy, 'sine', 0.03 * heavy, 0.4, 0.6, at)
  }

  private murmur(animal: AnimalKey | null, at: number): void {
    const note = ANIMAL_NOTE[animal ?? 'owl'] * 0.5
    this.tone(note, 'sine', 0.08, 0.08, 0.45, at, note * 0.85)
    this.tone(note * 1.01, 'triangle', 0.03, 0.08, 0.45, at + 0.05, note * 0.86)
  }

  private growl(frequency: number, at: number, length: number, peak: number): void {
    const context = this.context!
    const osc = context.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(frequency, at)
    osc.frequency.linearRampToValueAtTime(frequency * 0.72, at + length)
    const wobble = context.createOscillator()
    wobble.frequency.value = 9
    const depth = context.createGain()
    depth.gain.value = frequency * 0.05
    wobble.connect(depth).connect(osc.frequency)
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 420
    osc.connect(filter).connect(this.envelope(context, peak, 0.08, length, at))
    osc.start(at)
    wobble.start(at)
    osc.stop(at + length + 0.15)
    wobble.stop(at + length + 0.15)
  }

  private chirp(at: number, peak: number): void {
    const f = 2500 + Math.random() * 1400
    this.tone(f, 'sine', peak, 0.008, 0.07, at, f * 1.35)
  }

  /** Even the bear's landing stays a little under the settle chime: getting into bed is the loudest moment. */
  private thud(at: number, weight: number): void {
    const w = Math.min(1.2, weight)
    this.tone(150 - w * 80, 'sine', 0.14 + w * 0.16, 0.004, 0.14 + w * 0.12, at, 50)
    this.noiseBurst(420 - w * 200, 0.8, 0.06 + w * 0.075, 0.1 + w * 0.06, at, 'lowpass')
  }

  private knockWood(at: number, pitch: number, peak: number): void {
    this.tone(pitch, 'sine', peak, 0.002, 0.07, at, pitch * 0.8)
    this.noiseBurst(pitch * 3, 1.5, peak * 0.5, 0.025, at)
  }

  private musicBox(frequency: number, at: number, peak: number): void {
    this.tone(frequency, 'sine', peak, 0.004, 1.3, at)
    this.tone(frequency * 4, 'sine', peak * 0.12, 0.002, 0.25, at)
  }

  private lullaby(start: number): void {
    let beat = 0
    LULLABY.forEach((line, l) => {
      for (const [note, beats] of line) {
        this.musicBox(note, start + beat * BEAT, 0.13)
        beat += beats
      }
      LULLABY_CHORDS[l].forEach((name, c) => {
        const at = start + (l * 8 + c * 2) * BEAT
        for (const f of CHORD[name]) this.tone(f, 'triangle', 0.022, 0.35, 2 * BEAT + 0.6, at)
      })
    })
  }

  // --- plumbing ---------------------------------------------------------------------

  private throttle(key: string, now: number, gap: number): boolean {
    const last = this.last.get(key) ?? -Infinity
    if (now - last < gap) return false
    this.last.set(key, now)
    return true
  }

  private build(): void {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    const context = new AudioCtor()
    const master = context.createGain()
    master.gain.value = 0.7
    const compressor = context.createDynamicsCompressor()
    master.connect(compressor).connect(context.destination)
    const noise = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    // A soft woodland room: a procedural decaying-noise impulse.
    const impulseLength = Math.round(context.sampleRate * 1.2)
    const impulse = context.createBuffer(2, impulseLength, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel)
      for (let i = 0; i < impulseLength; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / impulseLength) ** 4
    }
    const convolver = context.createConvolver()
    convolver.buffer = impulse
    const warm = context.createBiquadFilter()
    warm.type = 'lowpass'
    warm.frequency.value = 3000
    const room = context.createGain()
    room.gain.value = 0.22
    master.connect(room).connect(warm).connect(convolver).connect(compressor)
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

  private noiseBurst(frequency: number, q: number, peak: number, decay: number, at: number, type: BiquadFilterType = 'bandpass'): void {
    const context = this.context!
    const source = context.createBufferSource()
    source.buffer = this.noise
    source.playbackRate.value = 0.8 + Math.random() * 0.4
    const filter = context.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    filter.Q.value = q
    source.connect(filter).connect(this.envelope(context, peak, 0.003, decay, at))
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
}
