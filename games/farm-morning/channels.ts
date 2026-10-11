import { noise, tone, type Note, type Voice } from './audio'

// Voices that can be stopped. audio.ts starts a voice and lets every note of
// it run to its end, which is right for a tap's own sound. An answer is
// longer than that: its notes are scheduled seconds ahead, and a new use on
// the same animal starts a new answer at once. What was still to sound of the
// old one must then not sound, or a sneeze is heard with no body sneezing.
//
// So the parts of a voice that belong to a maker (an animal, the flock, a
// scene) play through that maker's channel: a gain of its own between the
// notes and the output. Stopping a channel fades that gain out in a few
// hundredths of a second and lets go of it; the notes behind it run out
// unheard. A part with no channel goes straight to the output.

export type Part<C extends string> = {
  channel: C | null
  /** Whether this part takes the channel over, stopping what was on it, or joins what is on it. */
  replace: boolean
  notes: readonly Note[]
}

type Bus = { context: AudioContext; gain: GainNode }

/** How long a stopped channel takes to fall silent, in seconds: short enough to be at once, long enough not to click. */
export const FADE_S = 0.03

export class Channels<C extends string> {
  private readonly buses = new Map<C, Bus>()
  private fading: { gain: GainNode; until: number }[] = []

  /**
   * The parts of what one touch (or one step) set off, as one voice for `GameAudio.play`. The channels are taken
   * when the voice starts and not when it is made, so a voice that waits for the unlock stops nothing while it waits.
   */
  voice(parts: readonly Part<C>[]): Voice {
    return (context, out, at) => {
      this.tidy(context.currentTime)
      for (const part of parts) {
        const to = part.channel === null ? out : this.bus(context, out, part.channel, part.replace)
        for (const note of part.notes) {
          const start = at + (note.delay ?? 0)
          if (note.kind === 'tone') tone(context, to, start, note.frequency, note.wave ?? 'sine', note.peak, note.attack, note.decay, note.glideTo)
          else noise(context, to, start, note.frequency, note.q ?? 1, note.peak, note.attack, note.decay, note.glideTo)
        }
      }
    }
  }

  /** Whatever these channels still had to sound does not sound. */
  stop(channels: readonly C[]): void {
    for (const channel of channels) this.end(channel)
  }

  /** Lets go of every channel, for a game that is unmounting. */
  dispose(): void {
    for (const channel of [...this.buses.keys()]) this.end(channel)
    for (const { gain } of this.fading) gain.disconnect()
    this.fading = []
  }

  private bus(context: AudioContext, out: AudioNode, channel: C, replace: boolean): AudioNode {
    const live = this.buses.get(channel)
    // A context that was rebuilt after an interruption has none of the old nodes.
    if (live && live.context === context && !replace) return live.gain
    if (live) this.end(channel)
    const gain = context.createGain()
    gain.gain.setValueAtTime(1, context.currentTime)
    gain.connect(out)
    this.buses.set(channel, { context, gain })
    return gain
  }

  private end(channel: C): void {
    const bus = this.buses.get(channel)
    if (!bus) return
    this.buses.delete(channel)
    const now = bus.context.currentTime
    bus.gain.gain.setValueAtTime(1, now)
    bus.gain.gain.linearRampToValueAtTime(0, now + FADE_S)
    this.fading.push({ gain: bus.gain, until: now + FADE_S * 2 })
    this.tidy(now)
  }

  /** A channel that has faded out is disconnected, so the notes behind it reach nothing. */
  private tidy(now: number): void {
    this.fading = this.fading.filter(({ gain, until }) => {
      if (now < until) return true
      gain.disconnect()
      return false
    })
  }
}
