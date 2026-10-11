import { EARTH, OPEN, at, clone, isLump, put, settle, type Ground, type Kind, type Lump } from './ground'

// What the child's ant does to the ground: it digs earth, picks up one lump, and sets it down. Pure: each call
// changes the ground it is given and says what happened, and the caller lets the ground come to rest.
// Points are in cell units: (2.5, 4.5) is the middle of the cell in column 2, row 4.

/** What a dig did: the cells it opened, and the kinds it met that it cannot bite, each once. */
export type DigAnswer = { dug: number[]; met: Kind[] }

/** The four cells of a mouthful: the two-by-two block whose middle is nearest the finger. */
export function mouthful(cx: number, cy: number): { x: number; y: number }[] {
  const x = Math.round(cx), y = Math.round(cy)
  return [{ x: x - 1, y: y - 1 }, { x, y: y - 1 }, { x: x - 1, y }, { x, y }]
}

/** One mouthful at the finger. Earth is dug and is gone for good; everything else is met and stays. */
export function dig(ground: Ground, cx: number, cy: number): DigAnswer {
  const answer: DigAnswer = { dug: [], met: [] }
  for (const cell of mouthful(cx, cy)) {
    const kind = at(ground, cell.x, cell.y)
    if (kind === EARTH) {
      put(ground, cell.x, cell.y, OPEN)
      answer.dug.push(cell.y * ground.cols + cell.x)
    } else if (kind !== OPEN && !answer.met.includes(kind)) answer.met.push(kind)
  }
  return answer
}

/** A drag from one point to the next: a mouthful at every half cell of the way, and no further than the finger went. */
export function digAlong(ground: Ground, fromX: number, fromY: number, toX: number, toY: number): DigAnswer {
  const answer: DigAnswer = { dug: [], met: [] }
  const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toY - fromY) * 2))
  for (let n = 0; n <= steps; n++) {
    const part = dig(ground, fromX + ((toX - fromX) * n) / steps, fromY + ((toY - fromY) * n) / steps)
    answer.dug.push(...part.dug)
    for (const kind of part.met) if (!answer.met.includes(kind)) answer.met.push(kind)
  }
  return answer
}

/** A lump in the ant's jaws: what it is and the cell it was picked from. It is in no cell while it is carried. */
export type Carried = { kind: Lump; from: number }

/** Whether the ant can bite this cell loose: it is a lump with open ground on one of its four sides. */
export function canPickUp(ground: Ground, x: number, y: number): boolean {
  if (!isLump(at(ground, x, y))) return false
  return at(ground, x - 1, y) === OPEN || at(ground, x + 1, y) === OPEN || at(ground, x, y - 1) === OPEN || at(ground, x, y + 1) === OPEN
}

/** Picks the lump up, leaving its cell open. Gives null, and changes nothing, where there is no lump to bite loose. */
export function pickUp(ground: Ground, x: number, y: number): Carried | null {
  if (!canPickUp(ground, x, y)) return null
  const kind = at(ground, x, y) as Lump
  put(ground, x, y, OPEN)
  return { kind, from: y * ground.cols + x }
}

/** How far from the finger a lump may be set down, in cells. */
export const REACH = 2

/**
 * Sets the lump down in the open cell nearest the finger, within reach, and never in the top row, where the mouth
 * is. Gives the cell it went to, or null, with nothing changed, where there is no room: the caller then puts it back.
 */
export function setDown(ground: Ground, carried: Carried, cx: number, cy: number): number | null {
  const fx = Math.floor(cx), fy = Math.floor(cy)
  let best: { x: number; y: number; far: number } | null = null
  for (let y = fy - REACH; y <= fy + REACH; y++) {
    for (let x = fx - REACH; x <= fx + REACH; x++) {
      if (y < 1 || at(ground, x, y) !== OPEN) continue
      const far = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      if (best === null || far < best.far - 1e-9) best = { x, y, far }
    }
  }
  if (best === null) return null
  put(ground, best.x, best.y, carried.kind)
  return best.y * ground.cols + best.x
}

/**
 * Puts the lump back where it came from: its own cell, or, when something has fallen into that cell meanwhile, the
 * first open cell straight above it. A drag that is taken away and a put-away under a dragging finger both end here.
 */
export function putBack(ground: Ground, carried: Carried): number {
  const x = carried.from % ground.cols
  for (let y = Math.floor(carried.from / ground.cols); y >= 1; y--) {
    if (at(ground, x, y) === OPEN) {
      put(ground, x, y, carried.kind)
      return y * ground.cols + x
    }
  }
  // A whole column filled to the turf cannot happen while a lump is out of it: the lump left one cell open.
  throw new Error('no cell to put the lump back in')
}

/** The ground as a save holds it: the lump in the jaws back where it came from, and everything come to rest. */
export function asSaved(ground: Ground, carried: Carried | null): Ground {
  const saved = clone(ground)
  if (carried) putBack(saved, carried)
  settle(saved)
  return saved
}
