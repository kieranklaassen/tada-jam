import { voiceOf, type GameAudio, type Note } from './audio'
import type { Speaker } from './play'

// The game's sounds on their way out. Every voice goes through a gain of its
// own, so it can be closed: a touch that ends a scene closes what the scene
// was sounding, in that frame, and putting the game away closes everything.
// A closed gain is silent at once and is let go of; one that has rung out is
// let go of the next time anything plays.

type Open = { gain: GainNode; context: AudioContext; until: number; scene: boolean }

const lengthOf = (notes: readonly Note[]): number => notes.reduce((most, note) => Math.max(most, (note.delay ?? 0) + note.attack + note.decay), 0)

export function speakerOf(audio: GameAudio): Speaker {
  let open: Open[] = []
  const close = (which: (voice: Open) => boolean): void => {
    open = open.filter((voice) => {
      if (!which(voice)) return true
      voice.gain.gain.setValueAtTime(0, voice.context.currentTime)
      voice.gain.disconnect()
      return false
    })
  }
  return {
    play(notes, scene) {
      if (notes.length === 0) return
      audio.play((context, out, at) => {
        close((voice) => voice.context !== context || voice.until < context.currentTime)
        const gain = context.createGain()
        gain.gain.setValueAtTime(1, at)
        gain.connect(out)
        open.push({ gain, context, until: at + lengthOf(notes) + 0.2, scene })
        voiceOf(notes)(context, gain, at)
      })
    },
    hushScene() { close((voice) => voice.scene) },
    hushAll() { close(() => true) },
  }
}
