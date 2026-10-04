import type { Arrangement } from './arrangement'
import { weightOn } from './arrangement'
import type { Playground } from './motion'
import { Scene, sceneLength, type Beat } from './scene'
import type { Director } from './scenes'
import type { FriendId } from './world'

// What a scene will do to the sand, read before it starts. A scene's outcome
// is saved at its first beat, and the marks are part of that outcome: every
// bite the plank makes and every hollow a friend lands in. So the scene is
// first played on a silent twin of the playground, in the same fixed steps,
// and what the twin does to the sand is what goes into the save. Pure.

/** One thing done to the sand: an end of the plank biting it, or a friend landing in it. */
export type SandOp = { type: 'bite'; x: number; weight: number; speed: number } | { type: 'hollow'; x: number; z: number; id: FriendId }

/** Seconds the twin plays on after the scene's last beat, so that whatever the last beat set going has come to rest. */
export const AFTER = 5
const STEP = 1 / 60

/**
 * Plays a scene on a twin of `play` and returns what it did to the sand, in
 * order. `build` makes the scene's beats for whoever directs it; `ends` is
 * the arrangement the saved world has, where everyone is when it is over.
 */
export function forecast(play: Playground, ends: Arrangement, build: (director: Director) => Beat[]): SandOp[] {
  const twin = play.fork()
  twin.takeEvents()
  const director: Director = { play: twin, cut: false, ends, react: () => {}, voice: () => {}, nextSaid: () => 0, expectLanding: () => {} }
  const beats = build(director), scene = new Scene(beats)
  const ops: SandOp[] = []
  let time = 0
  scene.start(time, () => {})
  const until = sceneLength(beats) + AFTER
  while (time < until) {
    time += STEP
    scene.update(time)
    twin.advance(STEP)
    for (const event of twin.takeEvents()) {
      if (event.type === 'knock') ops.push({ type: 'bite', x: event.x, weight: weightOn(twin.arrangement, event.end), speed: event.speed })
      else if (event.type === 'land' && event.on === 'sand') ops.push({ type: 'hollow', x: event.x, z: event.z, id: event.id })
    }
    if (!scene.running && twin.settled) break
  }
  return ops
}
