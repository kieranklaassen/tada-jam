import { voiceOf, type Note, type Voice } from './audio'

// A scene's sounds go through a gain of their own. A touch that ends the scene, and a put-away, shut that gain
// at once, so a scene is silent from the frame it ends on: the tail of a hoot or a whistle that had already
// started does not ring on into what the touch does next.

/** How many of a scene's voices are kept to be shut off. Older ones have long finished sounding. */
const KEPT = 48

export class SceneGain {
  private open: GainNode[] = []

  /** The notes as one voice that sounds through a gain this object can shut. */
  voice(notes: readonly Note[]): Voice {
    const inner = voiceOf(notes)
    return (context, out, at) => {
      const gain = context.createGain()
      gain.connect(out)
      this.open.push(gain)
      if (this.open.length > KEPT) this.open.shift()!.disconnect()
      inner(context, gain, at)
    }
  }

  /** Shuts off everything the scene has sounding, from now. */
  hush(): void {
    for (const gain of this.open) {
      gain.gain.value = 0
      gain.disconnect()
    }
    this.open = []
  }
}
