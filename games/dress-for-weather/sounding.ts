import { voiceOf, type Voice } from './audio'
import type { Group, Heard } from './hall'
import type { Sound } from './voices'

// What the hall queues for the ear, played so that a group can be silenced
// from one frame to the next. Each group (the scene, each garment, the hall's
// own things) sounds through a gain of its own. A hush closes that gain in a
// few milliseconds and forgets it, so whatever the group was still sounding
// is gone and its next note opens a new one. Without this a sound once
// started could only run out, and a scene ended by a touch was heard over
// the touch's own answer.

/** Seconds in which a hushed group falls silent: at once to the ear, and slow enough not to click. */
export const HUSH_SECONDS = 0.008

type Closed = { gain: GainNode; until: number }

export class Sounding {
  private context: AudioContext | null = null
  private open = new Map<Group, GainNode>()
  private closed: Closed[] = []

  /** `play` builds the notes of one group on its gain: the game's own synthesis, or a test's ear. */
  constructor(private readonly play: (notes: readonly Sound[], context: AudioContext, out: AudioNode, at: number) => void = (notes, context, out, at) => voiceOf(notes)(context, out, at)) {}

  /** Everything the hall queued in one go, as one voice: hushes and notes in the order they were queued. */
  voice(batch: readonly Heard[]): Voice {
    return (context, out, at) => {
      if (context !== this.context) {
        // A new context: the old one's nodes went with it.
        this.context = context
        this.open = new Map()
        this.closed = []
      }
      // Gains that have been silent long enough are let go.
      this.closed = this.closed.filter((old) => {
        if (old.until > at) return true
        old.gain.disconnect()
        return false
      })
      for (const heard of batch) {
        if ('hush' in heard) {
          for (const [group, gain] of [...this.open]) {
            if (heard.hush !== 'all' && heard.hush !== group) continue
            gain.gain.cancelScheduledValues(at)
            gain.gain.setValueAtTime(gain.gain.value, at)
            gain.gain.linearRampToValueAtTime(0, at + HUSH_SECONDS)
            this.open.delete(group)
            this.closed.push({ gain, until: at + HUSH_SECONDS + 0.05 })
          }
          continue
        }
        let gain = this.open.get(heard.group)
        if (!gain) {
          gain = context.createGain()
          gain.gain.value = 1
          gain.connect(out)
          this.open.set(heard.group, gain)
        }
        this.play(heard.notes, context, gain, at)
      }
    }
  }
}
