import type { Voice } from './audio'

// Two ways out for a sound: the scene's, which a touch that ends the scene
// shuts on the frame of the touch, and everything else's. A put-away shuts
// both, so a sound that was ringing when the game was put away is not heard
// when it is opened again. Each voice plays through a gain of its own, which
// is all that is needed to shut it; audio.ts is as the template has it.

type Line = { gain: GainNode; until: number }

export class Bus {
  private readonly lines: { scene: Line[]; plain: Line[] } = { scene: [], plain: [] }

  /** `voice` as a voice that can be shut: `lasts` is how long it rings, in seconds. */
  through(voice: Voice, lasts: number, scene: boolean): Voice {
    return (context, out, at) => {
      const lines = scene ? this.lines.scene : this.lines.plain
      // Lines that have rung out are let go of here, with no timer.
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].until < context.currentTime) {
          lines[i].gain.disconnect()
          lines.splice(i, 1)
        }
      }
      const gain = context.createGain()
      gain.connect(out)
      lines.push({ gain, until: at + lasts + 0.1 })
      voice(context, gain, at)
    }
  }

  /** A touch ended the scene: whatever of it was still sounding is silent from now. */
  cutScene(): void {
    shut(this.lines.scene)
  }

  /** Put away: every sound is closed. */
  cutAll(): void {
    shut(this.lines.scene)
    shut(this.lines.plain)
  }

  /** How many voices could still be sounding. */
  get open(): { scene: number; plain: number } {
    return { scene: this.lines.scene.length, plain: this.lines.plain.length }
  }
}

function shut(lines: Line[]): void {
  for (const line of lines) {
    line.gain.gain.value = 0
    line.gain.disconnect()
  }
  lines.length = 0
}
