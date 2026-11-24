import { CORD, MIDDLE, OSTRICH, PULL, SACKS, SHELF_Y, placeAt, shelfOf } from './layout'
import { count, PARTS, PLACES } from './monster'
import type { Play } from './play'
import type { Point } from './stage'

// What the ghost hand shows, chosen from what stands there now. A move is
// shown and never an answer: the part it carries and the place it carries it
// to are not what stands behind the curtain.

export type Move = { from: Point; to: Point; drag: boolean; hold?: boolean }

/** A part and a place of the twin that the hidden monster does not have so. */
export function example(play: Play): { from: Point; to: Point } {
  const { a, b } = play.world
  for (const place of ['right', 'left', 'lower', 'upper', 'bottom', 'top'] as const) {
    if (b.on[place]) continue
    for (const part of ['hand', 'foot', 'tail', 'nose', ...PARTS] as const) if (a.on[place]?.part !== part) return { from: shelfOf(part), to: placeAt('b', b.body, place) }
  }
  return { from: shelfOf('tail'), to: { x: 960, y: SHELF_Y - 200 } }
}

export function demoFor(play: Play, index: number): Move {
  const w = play.world
  const curtain: Move = { from: { x: 420, y: 470 }, to: { x: 420, y: 470 }, drag: false, hold: true }
  const cord: Move = { from: { x: CORD.x, y: CORD.y + 8 }, to: { x: CORD.x, y: CORD.y + 8 + PULL + 20 }, drag: true }
  const build: Move = { ...example(play), drag: true }
  if (w.open) {
    const sack = index % 2 === 0 ? 0 : 1
    switch (index % 3) {
      case 0: return { from: SACKS[sack], to: MIDDLE.a, drag: true }
      case 1: {
        const place = PLACES.find((one) => w.b.on[one]) ?? null
        const at = place ? placeAt('b', w.b.body, place) : { x: MIDDLE.b.x, y: MIDDLE.b.y }
        return { from: at, to: at, drag: false }
      }
      default: return cord
    }
  }
  const n = count(w.b)
  if (n === 0) return [curtain, build, { from: { x: OSTRICH.x, y: OSTRICH.y + 10 }, to: { x: OSTRICH.x, y: OSTRICH.y + 10 }, drag: false }, build][index % 4]
  return n === 1 ? [build, curtain, build, cord][index % 4] : [cord, curtain, build, cord][index % 4]
}
