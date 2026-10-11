import { voiceOf, type Note, type Voice } from './audio'
import { lengthOf } from './voices'

// The game's voices go through here so that they can be cut. A scene that a
// touch ends, and a game that is put to rest, are silent from that moment:
// a long note does not ring on. Each voice gets a gain of its own between it
// and the output; a cut closes every gain that is still sounding, and a
// voice that was still waiting for the browser to allow sound never starts.

type Sounding = { gain: GainNode; until: number }

export class SoundBus {
  private sounding: Sounding[] = []
  /** Raised by every cut: a voice made before the cut is not played after it. */
  private cuts = 0

  /** A list of notes as one voice that a later cut ends. */
  voice(notes: readonly Note[]): Voice {
    const made = this.cuts
    const play = voiceOf(notes)
    const length = lengthOf(notes)
    return (context, out, at) => {
      if (made !== this.cuts) return
      // The ones that have rung out are let go of.
      this.sounding = this.sounding.filter((one) => {
        if (one.until > at) return true
        one.gain.disconnect()
        return false
      })
      const gain = context.createGain()
      gain.connect(out)
      this.sounding.push({ gain, until: at + length + 0.1 })
      play(context, gain, at)
    }
  }

  /** Everything that is sounding stops now, and nothing made before this moment starts. */
  cut(): void {
    this.cuts += 1
    for (const one of this.sounding) {
      one.gain.gain.value = 0
      one.gain.disconnect()
    }
    this.sounding = []
  }
}
