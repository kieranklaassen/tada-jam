import type { Point } from './input'
import { BELL, COLX, SPOTS, cellAt } from './layout'
import type { Play } from './play'
import { wishAt, type Animal } from './things'
import { COLUMNS, columnOf, onGround, putOn, stays, tallest } from './town'

// What the idle guidance shows: one next act. It shows a move and never the
// one that grants what the mole would like, but in the one position that
// teaches that a vote can be changed.

export type Hint = { from: Point; to: Point | null; on: 'bell' | Animal; r: number }

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
  if ((demo % 2 === 0) !== play.unmet) return bell
  const move = otherMove(play)
  return move ?? (ground.length ? { from: belly(ground[0]), to: null, on: ground[0], r: 80 } : bell)
}

function otherMove(play: Play): Hint | null {
  const { town } = play, wish = wishAt(town.position).wish
  const from = town.columns.reduce((best, c, col) => (c.length > town.columns[best].length ? col : best), 0)
  for (const who of [...town.columns[from]].reverse()) for (let col = 0; col < COLUMNS; col++) {
    if (col === from || !stays(town, who, col)) continue
    const then = structuredClone(town)
    putOn(then, who, col)
    const won = tallest(then)
    // The first vote that has to be changed shows how.
    if (town.position !== 'one-over' && wish.length === won.length && wish.every((t) => won.includes(t))) continue
    const row = town.columns[columnOf(town, who)].indexOf(who)
    return { from: cellAt(from, row), to: { x: COLX[col], y: cellAt(col, town.columns[col].length).y }, on: who, r: 52 }
  }
  return null
}
