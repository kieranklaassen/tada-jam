import { BERRY_LEN, ON_BANK_Y, restOf, restOnBank, widthOf, type Rest } from './blocks'
import { BLOCK_H, GROUND_Y, SUN, SUN_PULL, cutReach, freeIce, type Point } from './ground'
import type { Toy, World } from './toy'
import { bars, openHoles, wall } from './toyPieces'

// What a first visit finds, and what the ghost hand may show.

/** The berry block, which lies by its bush on every first visit. */
export const BERRY: Rest = restOf('berry', BERRY_LEN, 952, 786, 'lying')

/**
 * What a first visit finds. Age is a hint and never a gate: the youngest, and a child whose age is not known,
 * find one block already cut and two standing as a step; from seven the pond is whole and the snow bare. Every
 * kind of thing and every action is there for every child either way.
 */
export function firstWorld(childAge: number | null): World {
  const day = { night: false, drift: 0, icicles: [] }
  if (childAge !== null && childAge >= 7) return { ...day, blocks: [{ ...BERRY }], holes: [] }
  return {
    ...day,
    blocks: [{ ...BERRY }, restOf('clear', 150, 560, 606, 'lying'), restOf('cloudy', 170, 700, ON_BANK_Y, 'built'), restOf('clear', 96, 712, ON_BANK_Y - BLOCK_H, 'built')],
    holes: [{ x: 560, y: 672, angle: 0, len: 150 }],
  }
}

/** Lines the ghost hand may draw, tried in order: a start and a direction, across the clear middle first. */
const HINT_LINES: readonly (readonly [number, number, number])[] = [
  [470, 690, -0.12],
  [520, 620, 0.1],
  [620, 730, -0.05],
  [380, 660, 0.2],
  [700, 640, 0.15],
  [300, 700, -0.2],
  [760, 700, 0.05],
]

export type Hint = { kind: 'cut' | 'carry' | 'sun'; from: Point; to: Point }

/**
 * One move the child could make now, for the ghost hand: a line across free ice, a lying thing carried up to
 * the bank, or the sun pulled down, or lifted when it is night. `turn` is which showing of this idle stretch
 * it is: the three take turns. It shows how a thing is done and never what to build. Null when the clearing
 * offers none of them.
 */
export function hintOf(toy: Toy, turn: number): Hint | null {
  const cut = (): Hint | null => {
    for (const [x, y, angle] of HINT_LINES) {
      const reach = cutReach({ x, y }, angle, 190, openHoles(toy), bars(toy))
      if (freeIce(x, y, openHoles(toy), bars(toy)) && reach.len >= 150) return { kind: 'cut', from: { x, y }, to: { x: x + Math.cos(angle) * reach.len, y: y + Math.sin(angle) * reach.len } }
    }
    return null
  }
  const carry = (): Hint | null => {
    const piece = toy.pieces.find((p) => p.mode === 'rest' && p.rest.place === 'lying')
    if (!piece) return null
    const rest = restOnBank(widthOf(piece), 520, GROUND_Y - 200, wall(toy))
    return rest ? { kind: 'carry', from: { x: piece.x, y: piece.y }, to: { x: rest.x, y: rest.y } } : null
  }
  const sun = (): Hint => ({ kind: 'sun', from: { x: SUN.x, y: toy.sunY - (toy.night ? 30 : 0) }, to: { x: SUN.x, y: toy.night ? SUN_PULL.up - 50 : SUN_PULL.down + 46 } })
  const order = [cut, carry, sun]
  for (let i = 0; i < 3; i++) {
    const hint = order[(turn + i) % 3]()
    if (hint) return hint
  }
  return null
}
