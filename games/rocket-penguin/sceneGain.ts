import type { Voice } from './audio'

// The game's own gain, between its voices and the audio's output. Putting the
// game away suspends the audio (audio.ts), and a suspended sound would finish
// its tail when the game comes back. So every voice is played through this
// gain, and at put-away the gain is taken off the output: whatever was still
// sounding into it is never heard again, and the next voice gets a new gain.

export class SceneGain {
  private gain: GainNode | null = null
  private made: BaseAudioContext | null = null

  /** The same voice, played through the scene's gain. */
  through(voice: Voice): Voice {
    return (context, out, at) => {
      if (!this.gain || this.made !== context) {
        this.close()
        this.gain = context.createGain()
        this.gain.connect(out)
        this.made = context
      }
      voice(context, this.gain, at)
    }
  }

  /** Whatever is sounding is cut off for good: it will not finish when the audio comes back. */
  close(): void {
    this.gain?.disconnect()
    this.gain = null
    this.made = null
  }
}
