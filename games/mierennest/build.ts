import { EARTH, OPEN, at, clone, isLump, put, settle, type Ground, type Kind, type Lump } from './ground'

// What the child's ant does to the ground: it digs earth, picks up one lump, and sets it down. Pure: each call
// changes the ground it is given and says what happened, and the caller lets the ground come to rest. No cell is
// ever dug that the finger did not touch.
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

/** A cell of the grid. */
export type Cell = { x: number; y: number }

/** Every open cell the ant can walk to from where it stands, 1 or 0 a cell: its open way. */
export function openWay(ground: Ground, ant: Cell): Uint8Array {
  const { cols, rows, cells } = ground
  const way = new Uint8Array(cells.length)
  if (at(ground, ant.x, ant.y) !== OPEN) return way
  const queue = [ant.y * cols + ant.x]
  way[queue[0]] = 1
  while (queue.length > 0) {
    const i = queue.pop()!
    const x = i % cols, y = Math.floor(i / cols)
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const n = ny * cols + nx
      if (way[n] === 0 && cells[n] === OPEN) {
        way[n] = 1
        queue.push(n)
      }
    }
  }
  return way
}

/**
 * A lump in the ant's jaws: what it is and the cell it was picked from. The lump stays in that cell of the ground
 * for as long as it is carried, so the cell still bears what stood on it and nothing moves into it; the ground
 * changes only when the lump is set down in another cell.
 */
export type Carried = { kind: Lump; from: number }

/** Whether the ant can take this lump: it is a lump, and the ant's open way reaches one of its four sides. */
export function canPickUp(ground: Ground, ant: Cell, x: number, y: number): boolean {
  if (!isLump(at(ground, x, y))) return false
  const way = openWay(ground, ant)
  const reached = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < ground.cols && cy < ground.rows && way[cy * ground.cols + cx] === 1
  return reached(x - 1, y) || reached(x + 1, y) || reached(x, y - 1) || reached(x, y + 1)
}

/** Takes the lump in the jaws. The ground is not changed. Gives null where there is no lump the ant can reach. */
export function pickUp(ground: Ground, ant: Cell, x: number, y: number): Carried | null {
  if (!canPickUp(ground, ant, x, y)) return null
  return { kind: at(ground, x, y) as Lump, from: y * ground.cols + x }
}

/**
 * Sets the lump down in the cell where the finger lets go: an open cell on the ant's open way, never in the top
 * row, where the mouth is. The lump leaves the cell it came from and lies in the new one; the caller then lets
 * the ground come to rest. Let go anywhere else, nothing changes: the lump is still where it was picked up, and
 * null is given. A drag that is taken away and a put-away under a dragging finger need no call at all.
 */
export function setDown(ground: Ground, ant: Cell, carried: Carried, cx: number, cy: number): number | null {
  const x = Math.floor(cx), y = Math.floor(cy)
  if (y < 1 || x < 0 || x >= ground.cols || y >= ground.rows || at(ground, x, y) !== OPEN) return null
  const to = y * ground.cols + x
  if (openWay(ground, ant)[to] !== 1) return null
  put(ground, carried.from % ground.cols, Math.floor(carried.from / ground.cols), OPEN)
  put(ground, x, y, carried.kind)
  return to
}

/** The ground as a save holds it: everything come to rest, so nothing is saved in the air. A carried lump is in its own cell already. */
export function asSaved(ground: Ground): Ground {
  const saved = clone(ground)
  settle(saved)
  return saved
}
