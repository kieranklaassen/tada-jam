// template: cartridge/audio.ts v3

// Every sound is synthesized with raw Web Audio. The context is created inside
// the child's first touch, suspended while the game is unattended or hidden,
// and rebuilt if WebKit leaves it interrupted.
//
// A browser may refuse to start audio on touch-down and allow it on the lift.
// So the unlock is tried on both, and the newest sound of a touch that could
// not sound yet is kept and played once when the unlock lands. A first tap is
// then heard, a moment late, and never dropped.
//
// One touch, one voice. Only the newest sound waits for the unlock, so that a
// rub is not heard as a burst when it lands. A game whose touch sets off more
// than one sound joins them into one voice (`voiceOf`), or the first touch of
// a visit loses all but the last.

type ExtendedState = AudioContextState | 'interrupted'

/** One sound: build its nodes on `context`, connect them to `out`, and start them at `at`. */
export type Voice = (context: AudioContext, out: AudioNode, at: number) => void

/** Seconds the scene's gain takes to close when a touch ends the scene. */
export const SCENE_CUT_S = 0.008
/** The master gain. */
const MASTER = 0.6

export class GameAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  /** What the master gain plays into. */
  private output: AudioNode | null = null
  private active = true
  private failed = false
  /** Fingers on the glass: the touch is over only when the last one lifts. */
  private touching = 0
  /** Unlocks the browser has not answered yet. */
  private asking = 0
  private held: Voice | null = null
  /** The gain a scene's notes go through, apart from the answers to touches, and the ones that have been closed and wait to be let go. */
  private sceneBus: GainNode | null = null
  private closing: { bus: GainNode; until: number }[] = []

  /** Call first in every touch-down handler. */
  touchDown(): void {
    // A second finger or a palm landing inside a touch must not drop the sound the first finger is waiting to hear.
    if (this.touching === 0) this.held = null
    this.touching += 1
    this.unlock()
  }

  /** Call last in every lift handler, after the game has played the lift's own sound, and when a touch is cancelled. */
  touchUp(): void {
    // Nor must their lift end the touch: the first finger is still down, and its later sounds still wait for the unlock.
    if (this.touching > 0) this.touching -= 1
    this.unlock()
  }

  play(voice: Voice): void {
    if (!this.active) return
    const context = this.context
    if (context && context.state === 'running') {
      voice(context, this.master!, context.currentTime)
      return
    }
    // Not running yet. Inside a touch, or while its unlock is still being answered, the newest sound waits for it.
    if (this.touching > 0 || this.asking > 0) this.held = voice
  }

  /**
   * Plays the notes of a scene through the scene's own gain, so that the touch that ends the scene can silence
   * what is still ringing of it without touching its own answer. Before the unlock has landed they wait as any
   * other sound does.
   */
  playScene(voice: Voice): void {
    if (!this.active) return
    const context = this.context
    if (!context || context.state !== 'running') { this.play(voice); return }
    this.closing = this.closing.filter((closed) => {
      if (closed.until > context.currentTime) return true
      closed.bus.disconnect()
      return false
    })
    if (!this.sceneBus) {
      const bus = context.createGain()
      bus.gain.setValueAtTime(1, context.currentTime)
      bus.connect(this.master!)
      this.sceneBus = bus
    }
    voice(context, this.sceneBus, context.currentTime)
  }

  /**
   * A touch ended the scene, or the game was put away: the scene's gain closes within a few milliseconds, and
   * whatever of the scene was ringing is silent. The next scene gets a gain of its own.
   */
  cutScene(): void {
    const context = this.context, bus = this.sceneBus
    this.sceneBus = null
    if (!context || !bus) return
    const now = context.currentTime
    bus.gain.setValueAtTime(1, now)
    bus.gain.exponentialRampToValueAtTime(0.0001, now + SCENE_CUT_S)
    // No note is longer than this: after it the closed gain has nothing left to carry.
    this.closing.push({ bus, until: now + SCENE_CUT_S + 2 })
  }

  /**
   * Put-away closes every sound, the answers to touches included: whatever is ringing is cut off from the output
   * at once, and what sounds after the return goes through a new gain. A tail that the suspended context would
   * otherwise finish on return is never heard.
   */
  cutAll(): void {
    this.sceneBus = null
    this.closing = []
    const context = this.context, old = this.master
    if (!context || !old || !this.output) return
    old.disconnect()
    const master = context.createGain()
    master.gain.value = MASTER
    master.connect(this.output)
    this.master = master
  }

  /** Attended and visible, or not. A resting game is silent. */
  setActive(active: boolean): void {
    this.active = active
    if (!active) {
      // Nothing rings on into the next visit: not a scene, and not the answer to a touch either.
      this.cutAll()
      // A resting game ends its touch: the lift will never arrive.
      this.held = null
      this.touching = 0
    }
    if (!this.context) return
    if (active) void this.context.resume().catch(() => {})
    else void this.context.suspend().catch(() => {})
  }

  dispose(): void {
    this.held = null
    this.teardown()
  }

  private unlock(): void {
    const state = this.context?.state as ExtendedState | undefined
    if (this.context && (state === 'closed' || state === 'interrupted')) this.teardown()
    // This runs inside the touch handler: a sound that cannot start must never stop the touch.
    if (!this.context && !this.failed) {
      try {
        this.build()
      } catch {
        this.failed = true
        this.teardown()
      }
    }
    const context = this.context
    if (!context || !this.active) return
    if (context.state === 'running') {
      this.release(context)
      return
    }
    this.asking += 1
    const answered = (): void => {
      this.asking -= 1
      // Refused: the sound stays held for the lift's try, and the next touch-down forgets it, so it is never heard late.
      if (this.context === context && context.state === 'running') this.release(context)
    }
    context.resume().then(answered, answered)
  }

  /** The unlock landed: the sound that was waiting plays once. */
  private release(context: AudioContext): void {
    const voice = this.held
    this.held = null
    if (voice && this.active) voice(context, this.master!, context.currentTime)
  }

  private build(): void {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    const context = new AudioCtor()
    this.context = context
    const master = context.createGain()
    master.gain.value = MASTER
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -18
    master.connect(compressor).connect(context.destination)
    this.master = master
    this.output = compressor
  }

  private teardown(): void {
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
    this.output = null
    this.sceneBus = null
    this.closing = []
  }
}

/** A plain enveloped oscillator, the smallest building block of a voice. */
export function tone(context: AudioContext, out: AudioNode, at: number, frequency: number, type: OscillatorType, peak: number, attack: number, decay: number, glideTo?: number): void {
  const osc = context.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, at)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + attack + decay)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  osc.connect(gain).connect(out)
  osc.start(at)
  osc.stop(at + attack + decay + 0.05)
  osc.onended = () => {
    osc.disconnect()
    gain.disconnect()
  }
}

/** One and a half seconds of white noise for each context, made the first time a sound asks for it. */
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>()

function noiseBuffer(context: AudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(context)
  if (!buffer) {
    buffer = context.createBuffer(1, Math.round(context.sampleRate * 1.5), context.sampleRate)
    const data = buffer.getChannelData(0)
    // A fixed stream, so the grain is the same on every device.
    let s = 0x1234abcd
    for (let i = 0; i < data.length; i++) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5
      data[i] = (s >>> 0) / 2 ** 31 - 1
    }
    noiseBuffers.set(context, buffer)
  }
  return buffer
}

/**
 * An enveloped band of noise, the other building block: a scrub, a spray, wind, an engine. `frequency` is the
 * middle of the band and `q` how narrow it is: under 1 is a wide hiss, 10 and over is close to a whistle.
 */
export function noise(context: AudioContext, out: AudioNode, at: number, frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): void {
  const source = context.createBufferSource()
  source.buffer = noiseBuffer(context)
  source.loop = true
  const band = context.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = q
  band.frequency.setValueAtTime(frequency, at)
  if (glideTo) band.frequency.exponentialRampToValueAtTime(glideTo, at + attack + decay)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  source.connect(band).connect(gain).connect(out)
  // Each sound starts somewhere else in the noise, so two never sound the same.
  source.start(at, (at * 7.31) % 1.2)
  source.stop(at + attack + decay + 0.05)
  source.onended = () => {
    source.disconnect()
    band.disconnect()
    gain.disconnect()
  }
}

/**
 * One part of a voice written as plain numbers: a tone or a band of noise, with what `tone` and `noise` take.
 * A game keeps its voices as lists of these in a pure module of its own, where a test holds every pitch, peak
 * and length in range, since nobody may have heard the game before it is shown.
 */
export type Note = {
  kind: 'tone' | 'noise'
  /** Hertz: the tone's pitch, or the middle of the noise band. */
  frequency: number
  /** Where the pitch glides to by the end of the note, if it moves. */
  glideTo?: number
  /** A tone's wave, a sine when left out. A noise has none. */
  wave?: OscillatorType
  /** How narrow a noise's band is, 1 when left out. A tone has none. */
  q?: number
  /** The loudest point, as a gain from 0 to 1. */
  peak: number
  /** Seconds up to the peak, and seconds down from it. */
  attack: number
  decay: number
  /** Seconds after the voice starts that this note starts, 0 when left out. */
  delay?: number
}

/**
 * A list of notes as one voice. Everything one touch sets off goes into one call, the notes of each sound one
 * after the other in the list, so the touch is one voice and the unlock holds all of it.
 */
export function voiceOf(notes: readonly Note[]): Voice {
  return (context, out, at) => {
    for (const note of notes) {
      const start = at + (note.delay ?? 0)
      if (note.kind === 'tone') tone(context, out, start, note.frequency, note.wave ?? 'sine', note.peak, note.attack, note.decay, note.glideTo)
      else noise(context, out, start, note.frequency, note.q ?? 1, note.peak, note.attack, note.decay, note.glideTo)
    }
  }
}

/** The blank surface's answer to a touch. A game replaces it with its own voices. */
export const tick: Voice = (context, out, at) => tone(context, out, at, 660, 'triangle', 0.12, 0.004, 0.12, 520)
