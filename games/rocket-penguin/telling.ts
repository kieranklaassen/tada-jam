import { voiceOf, type Voice } from './audio'
import type { SceneGain } from './sceneGain'
import { notesOf, type Sound } from './voices'

// What the toy asked for since the last call, played as one voice through the
// scene's own gain. A touch that ended a scene comes first: whatever was still
// sounding is cut off in that frame, so the scene is silent from the touch on,
// and the touch's own answer is heard through a new gain.

/** The part of the toy this needs: whether a touch ended a scene, and the sounds asked for. */
export type Teller = { takeHush(): boolean; takeSounds(): Sound[] }

export function tellSounds(toy: Teller, scene: SceneGain, play: (voice: Voice) => void): void {
  if (toy.takeHush()) scene.close()
  const sounds = toy.takeSounds()
  if (sounds.length > 0) play(scene.through(voiceOf(notesOf(sounds))))
}
