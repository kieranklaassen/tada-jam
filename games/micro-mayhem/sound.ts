import type { Voice } from './audio'

// The gate every voice of the game plays through, so that sound can be cut in
// one frame: when a touch ends a scene, and when the game is put away. A
// voice gets a gain of its own between itself and the output; cutting closes
// every gain that may still be ringing and lets go of it.

/** Seconds after which a voice is over for certain: voices.test.ts holds every note under one second. */
const RINGS_FOR = 1.5

type Ringing = { context: AudioContext; gain: GainNode; until: number }

export class Gate {
  private ringing: Ringing[] = []

  /** `voice`, played through a gain that `cut` can close. */
  through(voice: Voice): Voice {
    return (context, out, at) => {
      this.ringing = this.ringing.filter((one) => one.context === context && one.until > at)
      const gain = context.createGain()
      gain.connect(out)
      this.ringing.push({ context, gain, until: at + RINGS_FOR })
      voice(context, gain, at)
    }
  }

  /** Every sound that is still ringing stops now. */
  cut(): void {
    for (const { context, gain } of this.ringing) {
      gain.gain.cancelScheduledValues(context.currentTime)
      gain.gain.setValueAtTime(0, context.currentTime)
      gain.disconnect()
    }
    this.ringing = []
  }

  /** How many voices may still be ringing. */
  get open(): number {
    return this.ringing.length
  }
}
