import { voiceOf, type Voice } from './audio'
import type { SoundEvent } from './toy'
import { notesOf } from './voices'

// How the sounds the model asks for reach the speaker. Each sound goes out
// through one of two gains of its own: one for the three short scenes, one
// for everything else. A scene that a touch ends is cut at its gain, in the
// frame of the touch, so nothing of it is heard after; a put-away cuts both.
// A cut gain is thrown away and the next sound gets a fresh one.

export type Out = { play(voice: Voice): void }
type Group = 'scene' | 'world'

export class Bus {
  private readonly gains: Record<Group, { context: AudioContext; node: GainNode } | null> = { scene: null, world: null }
  /** How many times each gain has been cut: a voice that was held back before a cut does not sound after it. */
  private readonly cuts: Record<Group, number> = { scene: 0, world: 0 }

  constructor(private readonly out: Out) {}

  /** Everything the model asked for at this moment of its clock, as one voice, now. */
  play(events: readonly SoundEvent[]): void {
    if (events.length === 0) return
    const asked = events.map((event) => ({ group: (event.scene ? 'scene' : 'world') as Group, voice: voiceOf(notesOf(event.id, event.part, event.pitch)) }))
    const cuts = { ...this.cuts }
    this.out.play((context, out, at) => {
      for (const one of asked) if (this.cuts[one.group] === cuts[one.group]) one.voice(context, this.gain(context, out, one.group), at)
    })
  }

  /** The scene's sound stops now. */
  cutScene(): void {
    this.cut('scene')
  }

  /** All sound stops now: the game is put away. */
  closeAll(): void {
    this.cut('scene')
    this.cut('world')
  }

  private gain(context: AudioContext, out: AudioNode, group: Group): AudioNode {
    const held = this.gains[group]
    if (held && held.context === context) return held.node
    const node = context.createGain()
    node.gain.value = 1
    node.connect(out)
    this.gains[group] = { context, node }
    return node
  }

  private cut(group: Group): void {
    this.cuts[group] += 1
    const held = this.gains[group]
    this.gains[group] = null
    if (!held) return
    try {
      held.node.gain.cancelScheduledValues(held.context.currentTime)
      held.node.gain.setValueAtTime(0, held.context.currentTime)
      held.node.disconnect()
    } catch {
      // A context that was closed under the gain is silent already.
    }
  }
}
