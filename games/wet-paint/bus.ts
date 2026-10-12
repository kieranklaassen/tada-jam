import type { Voice } from './audio'

// A way to cut sound off. Every sound of the game is sent through one bus,
// and a scene's sounds through a second one inside it. Closing a bus silences
// whatever is still ringing on it at once and for good; the next sound gets a
// new one. A touch that ends a scene closes the scene's bus, and a put-away
// closes both, so nothing of a scene is heard after it has ended and nothing
// at all rings on into a visit that has been put away.

export class Bus {
  private node: GainNode | null = null
  private on: AudioContext | null = null
  private readonly parent: Bus | null

  constructor(parent: Bus | null = null) {
    this.parent = parent
  }

  /** Where a sound on this bus is sent. */
  into(context: AudioContext, out: AudioNode): AudioNode {
    if (!this.node || this.on !== context) {
      this.node = context.createGain()
      this.on = context
      this.node.connect(this.parent ? this.parent.into(context, out) : out)
    }
    return this.node
  }

  /** The same voice, sent through this bus. */
  through(voice: Voice): Voice {
    return (context, out, at) => voice(context, this.into(context, out), at)
  }

  /** Whatever rings on this bus is silent from now on. */
  close(): void {
    if (this.node) {
      this.node.gain.value = 0
      this.node.disconnect()
    }
    this.node = null
    this.on = null
  }
}
