import { demoAt, nearest } from './guide'
import type { Play } from './play'
import type { Beat, Finger, Spot } from './round'

// The hand asks the painter for a picture, and he paints the back he sees. It
// turns the sitter twice, until its face is his way, and asks again: another
// picture of the same animal, because it was turned.

export function openingBeats(play: Play): Beat[] {
  const { game } = play
  const calm = (): boolean => !game.busy
  const painter = (): Spot => play.aim.px(demoAt(game, 'paint')!)
  const sitter = (): Spot => { const p = game.poses[nearest(game)]; return play.aim.px({ x: p.x, y: p.y + 1.5, z: p.z }) }
  return [
    { wait: 1.6, from: painter },
    { wait: 1, ready: calm, from: sitter },
    { wait: 0.7, ready: calm, from: sitter },
    { wait: 0.9, ready: calm, from: painter },
  ]
}

export function fingerOn(play: Play): Finger {
  return {
    down: (id, at) => { play.down(id, at.x, at.y) },
    move: (id, at) => play.move(id, at.x, at.y),
    up: (id, at) => play.up(id, at.x, at.y),
    cancel: (id) => play.cancel(id),
  }
}
