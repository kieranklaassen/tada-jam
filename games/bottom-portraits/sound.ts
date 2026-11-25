import { voiceOf, type Voice } from './audio'
import type { Game } from './game'

// What is queued goes out as one voice, through two taps: one for a scene and
// one for everything else. A touch that ends a scene shuts the first.

type Tap = { context: BaseAudioContext; gain: GainNode }

export class Band {
  private readonly taps: (Tap | null)[] = [null, null]

  private tap(n: number, context: BaseAudioContext, out: AudioNode): AudioNode {
    const tap = this.taps[n]
    if (tap?.context === context) return tap.gain
    const gain = context.createGain()
    gain.connect(out)
    this.taps[n] = { context, gain }
    return gain
  }

  shut(n: number): void {
    const tap = this.taps[n]
    this.taps[n] = null
    tap?.gain.gain.setValueAtTime(0, tap.context.currentTime)
    tap?.gain.disconnect()
  }

  take(game: Game): Voice | null {
    if (game.hushed) this.shut(1)
    game.hushed = false
    if (game.cues.length === 0) return null
    const parts = game.cues.splice(0).map((cue) => ({ n: cue.scene ? 1 : 0, play: voiceOf(cue.notes) }))
    return (context, out, at) => { for (const part of parts) part.play(context, this.tap(part.n, context, out), at) }
  }

  silence(): void { this.shut(0); this.shut(1) }
}
