import { GOOSE, BEAR, type Who } from './ends'
import { GROUND, HANG, RIGHT, pegAt } from './layout'
import type { Play } from './play'
import type { Point } from './stage'

// What the ghost hand shows, chosen from what stands there now. A move is
// shown, never an outcome: no hand leads the animal into the stable.

export type Move = { from: Point; to: Point; drag: boolean; lean: number }

const body = (play: Play, who: Who): Point => ({ x: play.halves[who].x, y: GROUND - play.halves[who].y - 170 })
const aside = (at: Point, dx: number, dy = 0): Point => ({ x: Math.max(260, Math.min(RIGHT - 20, at.x + dx)), y: at.y + dy })

export function demosFor(play: Play, index: number): Move[] {
  const front = body(play, GOOSE), rear = body(play, BEAR)
  if (play.ended) return []
  const apart = play.gap >= 0 ? 1 : -1
  switch (index % 4) {
    case 0:
      // Two hands at once, one for each half: pulled apart, or uncrossed where they are tied.
      return [{ from: front, to: play.tied ? { x: rear.x, y: front.y } : aside(front, 130 * apart), drag: true, lean: 0.12 * apart }, { from: rear, to: play.tied ? { x: front.x, y: rear.y } : aside(rear, -130 * apart), drag: true, lean: -0.12 * apart }]
    case 1: {
      const peg = play.pegs.findIndex((end) => end !== null)
      const at = { x: pegAt(peg).x, y: pegAt(peg).y + HANG }
      return [{ from: at, to: at, drag: false, lean: 0 }]
    }
    case 2:
      return [{ from: front, to: aside(front, front.x < 780 ? 190 : -190), drag: true, lean: 0 }]
    default:
      return [{ from: front, to: front, drag: false, lean: 0 }, { from: rear, to: rear, drag: false, lean: 0 }]
  }
}
