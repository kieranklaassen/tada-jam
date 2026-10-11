// template: cartridge/audio.ts v2

// Every sound is synthesized with raw Web Audio. The context is created inside
// the child's first touch, suspended while the game is unattended or hidden,
// and rebuilt if WebKit leaves it interrupted.
//
// A browser may refuse to start audio on touch-down and allow it on the lift.
// So the unlock is tried on both, and the newest sound of a touch that could
// not sound yet is kept and played once when the unlock lands. A first tap is
// then heard, a moment late, and never dropped.

type ExtendedState = AudioContextState | 'interrupted'

/** One sound: build its nodes on `context`, connect them to `out`, and start them at `at`. */
export type Voice = (context: AudioContext, out: AudioNode, at: number) => void

export class GameAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private active = true
  private failed = false
  /** Fingers on the glass: the touch is over only when the last one lifts. */
  private touching = 0
  /** Unlocks the browser has not answered yet. */
  private asking = 0
  private held: Voice | null = null

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

  /** Attended and visible, or not. A resting game is silent. */
  setActive(active: boolean): void {
    this.active = active
    if (!active) {
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
    master.gain.value = 0.6
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -18
    master.connect(compressor).connect(context.destination)
    this.master = master
  }

  private teardown(): void {
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
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

/** The blank surface's answer to a touch. A game replaces it with its own voices. */
export const tick: Voice = (context, out, at) => tone(context, out, at, 660, 'triangle', 0.12, 0.004, 0.12, 520)
