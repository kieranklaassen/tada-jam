import { GOOSE, BEAR, type Who } from './ends'
import { GROUND, HANG, LINE, PEGS, RIGHT, pegAt } from './layout'
import type { Play } from './play'
import type { Point } from './stage'

// What the ghost hand shows, chosen from what stands there now. A move is
// shown, never an outcome: no hand leads the animal into the stable.

export type Move = { from: Point; to: Point; drag: boolean; lean: number }

const body = (play: Play, who: Who): Point => ({ x: play.halves[who].x, y: GROUND - play.halves[who].y - 170 })
const aside = (at: Point, dx: number, dy = 0): Point => ({ x: Math.max(260, Math.min(RIGHT - 20, at.x + dx)), y: at.y + dy })

export function demosFor(play: Play, index: number): Move[] {
  const front = body(play, GOOSE), rear = body(play, BEAR)
  if (play.ended) return index === 0 ? [{ from: { x: 110, y: 560 }, to: { x: 110, y: 560 }, drag: false, lean: 0 }] : []
  const apart = play.gap >= 0 ? 1 : -1
  switch (index % 4) {
    case 0:
      return [{ from: front, to: aside(front, front.x < 780 ? 190 : -190), drag: true, lean: 0 }]
    case 1:
      // Two hands at once, one for each half.
      return [{ from: front, to: aside(front, 130 * apart), drag: true, lean: 0.12 * apart }, { from: rear, to: aside(rear, -130 * apart), drag: true, lean: -0.12 * apart }]
    case 2: {
      for (let peg = 0; peg < PEGS; peg++) if (play.pegs[peg] !== null) { const at = { x: pegAt(peg).x, y: pegAt(peg).y + HANG }; return [{ from: at, to: at, drag: false, lean: 0 }] }
      return [{ from: { x: LINE.left, y: LINE.y }, to: { x: LINE.left, y: LINE.y }, drag: false, lean: 0 }]
    }
    default:
      return [{ from: front, to: front, drag: false, lean: 0 }, { from: rear, to: rear, drag: false, lean: 0 }]
  }
}
