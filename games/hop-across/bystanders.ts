import { CLOTH_COL, COLS, HOME_COL, SEAT_ROW, type Board } from './board'
import { DUCK_POST, DUCK_REACH, FAR_REACH, LANES, SQUARE, centreX, squareAt } from './layout'
import type { Scenery } from './scenery'

// Who a touch lands on, besides the board and the cat: the characters that stand round it. Each answers a touch
// as itself, and the touch then makes no hop and no step. Pure: the Mount asks, the view shows the answer.

export type Onlooker = 'teddy' | 'robot' | 'giraffe' | 'doll'
export type Bystander =
  | { who: 'duck' }
  /** The hamper behind a cloth, by the column of that cloth: the far one, or the home one once its picnic is behind the family. */
  | { who: 'hamper'; c: number }
  /** The old rabbit on the far cloth, and the one asleep on the home cloth once its picnic is behind the family. */
  | { who: 'old' }
  | { who: 'sleeper' }
  | { who: 'onlooker'; c: number; what: Onlooker }

/** Half the width of the old rabbit's head, in stage units. */
const OLD_HEAD = 36
const ONLOOKERS: readonly string[] = ['teddy', 'robot', 'giraffe', 'doll']

/**
 * The bystander at a point of the stage, or null where a touch is a hop. An old rabbit is touched on its seat,
 * unless she stands on a square next to it: then the touch sends her at it, and she bounces off its tummy. Above
 * the rim it is touched on its head, and the hamper behind it to both sides, at the home cloth as at the far one.
 */
export function bystanderAt(x: number, y: number, scenery: Scenery, board: Board): Bystander | null {
  if (y < LANES.y) {
    if (y < LANES.y - FAR_REACH) return null
    const c = Math.floor((x - LANES.x) / SQUARE.w)
    if (c < 0 || c >= COLS) return null
    const far = scenery.columns[c].far
    // The old rabbit's head and ears stand up in front of the hamper; the hamper shows to both sides of them.
    // Each cloth has its own: the thing touched answers, where it was touched. On the home cloth the old rabbit
    // is the one asleep.
    if (far === 'hamper') return Math.abs(x - centreX(c) - 8) <= OLD_HEAD ? { who: c === HOME_COL ? 'sleeper' : 'old' } : { who: 'hamper', c }
    return ONLOOKERS.includes(far) ? { who: 'onlooker', c, what: far as Onlooker } : null
  }
  if (y >= LANES.y + LANES.h) return Math.abs(x - DUCK_POST.x) <= DUCK_REACH ? { who: 'duck' } : null
  const square = squareAt(x, y)
  if (square.r !== SEAT_ROW) return null
  const rabbit = board.family[0]
  const beside = Math.abs(rabbit.c - square.c) + Math.abs(rabbit.r - square.r) === 1
  if (beside) return null
  if (square.c === CLOTH_COL) return { who: 'old' }
  if (square.c === HOME_COL && board.lanes[HOME_COL].kind === 'cloth') return { who: 'sleeper' }
  return null
}
