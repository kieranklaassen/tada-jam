import { noise, tone, type Voice } from './audio'
import { VOICES, type Asked } from './voices'

// The bridge from the numbers of voices.ts to sound. Everything the toy asked
// for in one step or one touch becomes one voice, so the first touch of a
// visit is held whole for the unlock (audio.ts). Every note starts when the
// voice starts: nothing is put off inside a voice, so what is heard belongs
// to the frame that asked for it.
//
// Sounds go through one of two gains. What belongs to a scene goes through
// the scene's, so the touch that ends a scene silences all of it in that
// frame, tails included; everything else goes through the other. Both are
// closed when the game is put away, so nothing is left ringing when it is
// opened again.

/** The most sounds one step may start: a full clearing of scuttlers asks for more than an ear can tell apart. */
export const MOST_AT_ONCE = 6

type Gains = { context: BaseAudioContext; out: AudioNode; play: GainNode | null; scene: GainNode | null }

export class Bus {
  private gains: Gains | null = null

  private gain(context: BaseAudioContext, out: AudioNode, which: 'play' | 'scene'): GainNode {
    if (!this.gains || this.gains.context !== context || this.gains.out !== out) this.gains = { context, out, play: null, scene: null }
    let gain = this.gains[which]
    if (!gain) {
      gain = context.createGain()
      gain.gain.value = 1
      gain.connect(out)
      this.gains[which] = gain
    }
    return gain
  }

  /** What the toy asked for, as one voice. */
  voice(asked: readonly Asked[]): Voice {
    const list = asked.slice(0, MOST_AT_ONCE)
    return (context, out, at) => {
      for (const { key, pitch, level, scene } of list) {
        const to = this.gain(context, out, scene ? 'scene' : 'play')
        for (const note of VOICES[key]) {
          const glide = note.glideTo === undefined ? undefined : note.glideTo * pitch
          if (note.kind === 'tone') tone(context, to, at, note.frequency * pitch, note.wave ?? 'sine', note.peak * level, note.attack, note.decay, glide)
          else noise(context, to, at, note.frequency * pitch, note.q ?? 1, note.peak * level, note.attack, note.decay, glide)
        }
      }
    }
  }

  private shut(which: 'play' | 'scene'): void {
    const gains = this.gains, gain = gains?.[which]
    if (!gains || !gain) return
    // Silent from now: whatever is still ringing through this gain is not heard, and the next sound gets a new one.
    gain.gain.cancelScheduledValues(gains.context.currentTime)
    gain.gain.setValueAtTime(0, gains.context.currentTime)
    gains[which] = null
  }

  /** A touch has ended a scene: everything the scene was sounding is silent from this call. */
  hush(): void {
    this.shut('scene')
  }

  /** The game is put away: nothing it was sounding is heard again. */
  close(): void {
    this.shut('scene')
    this.shut('play')
  }
}
