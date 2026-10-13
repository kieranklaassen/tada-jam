import { voiceOf, type Voice } from './audio'
import type { Cue, Toy } from './toy'
import { notesOf } from './voices'

// Where the game's sounds are mixed. Everything goes through one gain, and
// the sounds of a scene through a second one inside it. When a touch ends a
// scene, the scene's gain is shut in that frame and thrown away, so whatever
// of the scene was still sounding or still to sound is silent from then on;
// when the game is put away the outer gain goes the same way. A sound that
// starts afterwards gets a new gain.

type Bus = { context: BaseAudioContext; gain: GainNode }

export class Desk {
  private all: Bus | null = null
  private scenes: Bus | null = null

  private bus(context: BaseAudioContext, out: AudioNode, scene: boolean): AudioNode {
    if (this.all?.context !== context) {
      const gain = context.createGain()
      gain.connect(out)
      this.all = { context, gain }
      this.scenes = null
    }
    if (!scene) return this.all.gain
    if (!this.scenes) {
      const gain = context.createGain()
      gain.connect(this.all.gain)
      this.scenes = { context, gain }
    }
    return this.scenes.gain
  }

  /** Everything the game queued in one frame, as one voice: each cue goes to the gain it belongs to. */
  voice(cues: readonly Cue[]): Voice {
    const parts = cues.map((cue) => ({ scene: cue.scene, play: voiceOf(notesOf(cue.sound, cue.variant, cue.pitch, cue.gain)) }))
    return (context, out, at) => { for (const part of parts) part.play(context, this.bus(context, out, part.scene), at) }
  }

  /**
   * What the Mount does with the game's sound after every touch and every frame, in this order: a scene a touch
   * has just ended is cut off (or, on a put-away, everything is), and then whatever was queued since is handed
   * back as one voice, or null when nothing was.
   */
  take(toy: Toy, all = false): Voice | null {
    if (all) this.hushAll()
    else if (toy.hushed) this.hushScene()
    toy.hushed = false
    return toy.cues.length > 0 ? this.voice(toy.cues.splice(0)) : null
  }

  private static shut(bus: Bus | null): void {
    if (!bus) return
    bus.gain.gain.setValueAtTime(0, bus.context.currentTime)
    bus.gain.disconnect()
  }

  /** A touch ended the scene: what is left of its sounds is cut off now. */
  hushScene(): void {
    Desk.shut(this.scenes)
    this.scenes = null
  }

  /** The game is put away: every sound is closed. */
  hushAll(): void {
    Desk.shut(this.scenes)
    Desk.shut(this.all)
    this.scenes = this.all = null
  }
}
