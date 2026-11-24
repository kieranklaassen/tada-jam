import { CORD, MIDDLE, OSTRICH, PULL, SACKS, placeAt, shelfOf } from './layout'
import { count, PLACES, type Part } from './monster'
import type { Play } from './play'
import type { Point } from './stage'

// What the ghost hand shows, chosen from what stands there now. A move is
// shown: look, ask the ostrich, open. A part is carried to its own place only
// in the first kind of round, where its outline stands there anyway, and once
// for a child whose first round is a hidden one.

export type Move = { from: Point; to: Point; drag: boolean; hold?: boolean; /** The magnet the hand carries. */ part?: Part }

export function demoFor(play: Play, index: number): Move {
  const w = play.world
  const curtain: Move = { from: { x: 420, y: 470 }, to: { x: 420, y: 470 }, drag: false, hold: true }
  const cord: Move = { from: { x: CORD.x, y: CORD.y + 8 }, to: { x: CORD.x, y: CORD.y + 8 + PULL + 20 }, drag: true }
  const draw: Move = { from: { x: 500, y: 430 }, to: { x: 250, y: 430 }, drag: true }
  if (play.inView) {
    // The first kind of round is there to be shown: this goes there.
    const one = play.missing()[index % Math.max(1, play.missing().length)]
    return one && !play.enough ? { from: shelfOf(one.part), to: placeAt('b', w.b.body, one.place), drag: true, part: one.part } : cord
  }
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
  const ostrich: Move = { from: { x: OSTRICH.x, y: OSTRICH.y + 10 }, to: { x: OSTRICH.x, y: OSTRICH.y + 10 }, drag: false }
  if (play.enough) return [draw, cord, curtain, draw][index % 4]
  // Whoever starts at a later place has not seen a part go on yet: one is shown, before the first pair has met.
  const one = play.missing()[0]
  if (w.pairs.length === 0 && count(w.b) === 0 && one && index % 2 === 0) return { from: shelfOf(one.part), to: placeAt('b', w.b.body, one.place), drag: true, part: one.part }
  return index % 2 ? ostrich : curtain
}
