import type { Voice } from './audio'

// The sounds of a scene go through a gain of their own, so that a touch which
// ends the scene can end them too. audio.ts starts every note of a voice at
// once, to play at its own time: without this, the bell rings on and the long
// fall of the dusk plays out after the scene they belong to is over.

/** How long the gain takes to close: within a frame, and no click. */
export const DROP_SECONDS = 0.012
/** No voice of a scene is longer than this: a gain older than it is forgotten. */
const KEPT_SECONDS = 6

export class SceneSound {
  private live: { context: BaseAudioContext; gain: GainNode; until: number }[] = []

  /** The same voice, played through a gain that `drop` closes. */
  through(voice: Voice): Voice {
    return (context, out, at) => {
      const gain = context.createGain()
      gain.gain.setValueAtTime(1, at)
      gain.connect(out)
      this.live = this.live.filter((one) => one.context === context && one.until > at)
      this.live.push({ context, gain, until: at + KEPT_SECONDS })
      voice(context, gain, at)
    }
  }

  /** The scene was ended by a touch: everything of it that is still sounding, or still to sound, is silent from now. */
  drop(): void {
    for (const { context, gain } of this.live) {
      const now = context.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + DROP_SECONDS)
    }
    this.live = []
  }

  /** How many gains are open: for the test. */
  get open(): number {
    return this.live.length
  }
}
