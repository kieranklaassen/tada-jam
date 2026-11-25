import type { Point } from './input'
import { BELL, COLX, SPOTS, cellAt, plaqueAt } from './layout'
import type { Play } from './play'
import type { Animal } from './things'
import { COLUMNS, columnOf, hasTools, onGround, putOn, ring, stays } from './town'

// What the idle guidance shows: one next act. It shows a move and never the
// one that grants what the mole would like, but in the one position that
// teaches that a vote can be changed.

export type Hint = { from: Point; to: Point | null; on: 'bell' | 'picture' | Animal; r: number }

const belly = (who: Animal): Point => ({ x: SPOTS[who].x, y: SPOTS[who].y - SPOTS[who].h * 0.45 })

export function hintFor(play: Play, demo: number): Hint | null {
  if (play.show || play.held) return null
  const { town } = play
  const bell: Hint = { from: BELL, to: null, on: 'bell', r: 70 }
  if (town.finished) return bell
  const ground = onGround(town)
  // Nobody is up yet: the first one is.
  if (ground.length && town.columns.every((c) => c.length === 0)) return { from: belly(ground[0]), to: null, on: ground[0], r: 80 }
  // When the last vote was not what the mole would like, changing it is the next thing.
  if (!town.stale && (demo % 2 === 0) !== town.unmet) return bell
  const move = otherMove(play)
  return move ?? (ground.length ? { from: belly(ground[0]), to: null, on: ground[0], r: 80 } : bell)
}

/** A drag out of the tallest column, or out of another, or else the third picture. */
function otherMove(play: Play): Hint | null {
  const { town } = play
  const order = [0, 1, 2].sort((a, b) => town.columns[b].length - town.columns[a].length)
  for (const from of order) for (const who of [...town.columns[from]].reverse()) for (let col = 0; col < COLUMNS; col++) {
    if (col === from || !stays(town, who, col)) continue
    const then = structuredClone(town)
    putOn(then, who, col)
    // The first vote that has to be changed shows how.
    if (town.position !== 'one-over' && ring(then).result?.met) continue
    const row = town.columns[columnOf(town, who)].indexOf(who)
    return { from: cellAt(from, row), to: { x: COLX[col], y: cellAt(col, town.columns[col].length).y }, on: who, r: 52 }
  }
  return hasTools(town) ? { from: plaqueAt(2), to: null, on: 'picture', r: 70 } : null
}
