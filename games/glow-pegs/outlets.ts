import { voiceOf, type Voice } from './audio'
import { notesOf, type Cue } from './voices'

// Where a sound goes on its way out. Every sound of the game passes through
// one of two outlets: the scenes' own, and the one for everything else. An
// outlet can be shut: whatever is sounding through it is silent from that
// moment, and the next sound gets a fresh one. A scene ended by a touch shuts
// the scenes' outlet in the frame of the touch; a put-away shuts both, so no
// ringing note is left to carry on when the game is opened again.

export class Outlet {
  private gain: GainNode | null = null
  private on: AudioContext | null = null

  /** The same voice, sounding through this outlet. */
  through(voice: Voice): Voice {
    return (context, out, at) => {
      if (!this.gain || this.on !== context) {
        this.gain = context.createGain()
        this.gain.connect(out)
        this.on = context
      }
      voice(context, this.gain, at)
    }
  }

  /** Everything sounding through it stops now. */
  shut(): void {
    if (!this.gain) return
    this.gain.gain.value = 0
    this.gain.disconnect()
    this.gain = null
    this.on = null
  }
}

/** Everything one touch or one step set off, as one voice: the scenes' sounds through their outlet and the rest through the other. */
export function voiceFor(cues: readonly Cue[], play: Outlet, scene: Outlet): Voice {
  const own = cues.filter((cue) => cue.scene).flatMap(notesOf), rest = cues.filter((cue) => !cue.scene).flatMap(notesOf)
  const voices: Voice[] = []
  if (rest.length > 0) voices.push(play.through(voiceOf(rest)))
  if (own.length > 0) voices.push(scene.through(voiceOf(own)))
  return (context, out, at) => {
    for (const voice of voices) voice(context, out, at)
  }
}
