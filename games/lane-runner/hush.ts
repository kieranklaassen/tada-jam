import { voiceOf, type Note, type Voice } from './audio'

// One way to make everything that is sounding stop at once. Every voice of
// the game goes out through a gain of its own making; `hush` cuts that gain
// loose, so the tails of whatever was sounding are gone on that frame, and
// the next voice gets a new one. A voice that was still waiting for the
// browser to let sound start when the hush came is never heard at all.

export class HushBus {
  private context: AudioContext | null = null
  private node: GainNode | null = null
  /** Counts the hushes: a voice belongs to the count it was made under. */
  private round = 0

  /** These notes as one voice that sounds through the bus. */
  voice(notes: readonly Note[]): Voice {
    const made = this.round, inner = voiceOf(notes.slice())
    return (context, out, at) => {
      // Hushed while it waited: it stays unheard.
      if (made !== this.round) return
      if (!this.node || this.context !== context) {
        this.node = context.createGain()
        this.node.connect(out)
        this.context = context
      }
      inner(context, this.node, at)
    }
  }

  /** Everything that is sounding stops now, and nothing that was waiting to sound is heard later. */
  hush(): void {
    this.round += 1
    const node = this.node
    this.node = null
    this.context = null
    if (!node) return
    try {
      node.gain.value = 0
      node.disconnect()
    } catch {
      // A context that has been closed has nothing left to cut.
    }
  }
}
