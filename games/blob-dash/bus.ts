import { voiceOf, type Note, type Voice } from './audio'

// Where the loop's sounds go on their way to audio.ts's master: each voice
// through a gain of its own, so that a sound already playing can be closed.
// A scene's sounds are closed the moment a touch ends the scene, and every
// sound is closed when the game is put away. A voice that was still waiting
// for the browser to let sound start, and whose scene has ended or whose
// visit was put away meanwhile, never plays.

type Live = { gain: GainNode; context: BaseAudioContext; until: number; scene: boolean }

const length = (notes: readonly Note[]): number => notes.reduce((most, note) => Math.max(most, (note.delay ?? 0) + note.attack + note.decay), 0)

export class Bus {
  private live: Live[] = []
  /** Raised each time the scenes' sound, or all sound, is closed. A voice made before the last close of its kind is stale. */
  private sceneCuts = 0
  private cuts = 0

  /** One voice for everything a frame or a touch set off: the loop's own notes, and a scene's on a gain that a touch can close. */
  voice(main: readonly Note[], scene: readonly Note[] = []): Voice {
    const sceneCuts = this.sceneCuts, cuts = this.cuts
    return (context, out, at) => {
      if (cuts !== this.cuts) return
      this.sweep(context)
      if (main.length > 0) this.start(context, out, at, main, false)
      if (scene.length > 0 && sceneCuts === this.sceneCuts) this.start(context, out, at, scene, true)
    }
  }

  /** A touch ended a scene: whatever of the scene is sounding is silent from now. */
  cutScene(): void {
    this.sceneCuts += 1
    for (const voice of this.live) if (voice.scene) this.close(voice)
    this.live = this.live.filter((voice) => !voice.scene)
  }

  /** Put away: every sound is silent from now. */
  cutAll(): void {
    this.sceneCuts += 1
    this.cuts += 1
    for (const voice of this.live) this.close(voice)
    this.live = []
  }

  /** How many voices are still held, for the tests. */
  get sounding(): number {
    return this.live.length
  }

  private start(context: AudioContext, out: AudioNode, at: number, notes: readonly Note[], scene: boolean): void {
    const gain = context.createGain()
    gain.gain.value = 1
    gain.connect(out)
    this.live.push({ gain, context, until: at + length(notes) + 0.1, scene })
    voiceOf(notes)(context, gain, at)
  }

  private close(voice: Live): void {
    const now = voice.context.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(0, now)
    voice.gain.disconnect()
  }

  /** Lets go of the voices that have finished, and of any that belong to a context that is gone. */
  private sweep(context: BaseAudioContext): void {
    this.live = this.live.filter((voice) => {
      if (voice.context === context && voice.until > context.currentTime) return true
      voice.gain.disconnect()
      return false
    })
  }
}
