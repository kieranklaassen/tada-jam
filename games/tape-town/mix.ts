import { voiceOf, type Voice } from './audio'
import type { Sound } from './voices'

// Where the town's sounds go on their way out: one bus for the two scenes
// of the shoebox, and one for everything else. A scene that a touch ends is
// silent from that frame: its bus is taken off the output with whatever was
// still ringing in it, and a fresh one stands in for the next scene. Put
// away, both buses go, so that nothing is left to sound when the game is
// opened again.

type Bus = { node: GainNode; out: AudioNode }

export class Mix {
  private context: AudioContext | null = null
  private scene: Bus | null = null
  private room: Bus | null = null

  private bus(context: AudioContext, out: AudioNode, which: 'scene' | 'room'): GainNode {
    if (this.context !== context) {
      // A new audio context (the old one was closed): nothing of the old graph is of use.
      this.context = context
      this.scene = this.room = null
    }
    let bus = this[which]
    if (!bus || bus.out !== out) {
      const node = context.createGain()
      node.connect(out)
      bus = this[which] = { node, out }
    }
    return bus.node
  }

  /** Everything one call or one step of the town set off, as one voice: the scene's sounds into the scene's bus, the rest into the room's. */
  voice(sounds: readonly Sound[]): Voice {
    const scene = sounds.filter((sound) => sound.scene).flatMap((sound) => sound.notes)
    const room = sounds.filter((sound) => !sound.scene).flatMap((sound) => sound.notes)
    return (context, out, at) => {
      if (scene.length) voiceOf(scene)(context, this.bus(context, out, 'scene'), at)
      if (room.length) voiceOf(room)(context, this.bus(context, out, 'room'), at)
    }
  }

  /** A touch ended the scene: whatever of it was still sounding, or was still to sound, is silent from now. */
  cutScene(): void {
    this.scene?.node.disconnect()
    this.scene = null
  }

  /** Put away: nothing goes on sounding, and nothing is left to sound on return. */
  closeAll(): void {
    this.cutScene()
    this.room?.node.disconnect()
    this.room = null
  }
}
