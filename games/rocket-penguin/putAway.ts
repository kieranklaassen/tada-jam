import type { IdleLadder } from './guidance'
import type { SceneGain } from './sceneGain'

// What going to rest takes back besides the toy itself, which the Mount makes
// again from what it has just saved: the sound that was still in the air, and
// the idle ladder. The game that comes back is one that has just been opened:
// silent, and with no glow and no ghost hand until it has stood idle again.

/** The game is put away at `seconds` of the attended clock. */
export function putAway(scene: SceneGain, ladder: IdleLadder, seconds: number): void {
  scene.close()
  ladder.touch(seconds)
}
