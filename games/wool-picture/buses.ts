import { voiceOf, type Note, type Voice } from './audio'

// Two ways out for the game's notes, each through a gain of its own: one for
// everything a touch or the toy sounds, one for what a scene sounds. A touch
// that ends a scene silences the scene's way out in that frame, with whatever
// was still ringing on it, and a put-away closes both. The next note makes a
// new way out. No clock is read here: a way out is cut by taking it off.

type Out = { context: AudioContext; gain: GainNode }

export class Buses {
  private ways: (Out | null)[] = [null, null]

  private way(index: number, context: AudioContext, out: AudioNode): GainNode {
    const held = this.ways[index]
    if (held && held.context === context) return held.gain
    const gain = context.createGain()
    gain.connect(out)
    this.ways[index] = { context, gain }
    return gain
  }

  private cut(index: number): void {
    const held = this.ways[index]
    this.ways[index] = null
    if (!held) return
    held.gain.gain.value = 0
    held.gain.disconnect()
  }

  /** One voice for everything one moment sounds: the toy's notes on their way out, a scene's on its own. */
  voice(notes: readonly Note[] | null, sceneNotes: readonly Note[] | null): Voice {
    return (context, out, at) => {
      if (notes) voiceOf(notes)(context, this.way(0, context, out), at)
      if (sceneNotes) voiceOf(sceneNotes)(context, this.way(1, context, out), at)
    }
  }

  /** A touch ended the scene: it is silent from this frame. */
  endScene(): void {
    this.cut(1)
  }

  /** Put away: all sound is closed. */
  closeAll(): void {
    this.cut(0)
    this.cut(1)
  }
}
