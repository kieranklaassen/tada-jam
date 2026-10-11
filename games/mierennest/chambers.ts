import { MOUTH, OPEN, at, type Ground } from './ground'

// What the ground module recognises in what the child dug. Nothing here is placed from a menu: a room is found by
// a measure, and it is a chamber of the kingdom while air reaches it from the mouth.

/** A room holds a clear block at least this wide and this high, in cells. A tunnel two cells high is never a room. */
export const ROOM = { width: 4, height: 3 } as const

export type Room = {
  /** The cells of the room, lowest index first. */
  cells: number[]
  /** Air reaches it: a way of open cells leads to it from the mouth, however narrow. */
  aired: boolean
}

/** Every open cell that air reaches from the mouth, 1 or 0 a cell. */
export function aired(ground: Ground, mouth: readonly number[] = MOUTH): Uint8Array {
  const { cols, rows, cells } = ground
  const reached = new Uint8Array(cells.length)
  const queue: number[] = []
  for (const x of mouth) {
    if (x < cols && cells[x] === OPEN) {
      reached[x] = 1
      queue.push(x)
    }
  }
  while (queue.length > 0) {
    const i = queue.pop()!
    const x = i % cols, y = Math.floor(i / cols)
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const n = ny * cols + nx
      if (reached[n] === 0 && cells[n] === OPEN) {
        reached[n] = 1
        queue.push(n)
      }
    }
  }
  return reached
}

/**
 * The rooms in the ground. Every clear block of the room's measure is found; blocks that overlap or touch along a
 * side are one room. Rooms come in a fixed order, by their first cell.
 */
export function rooms(ground: Ground, mouth: readonly number[] = MOUTH): Room[] {
  const { cols, rows, cells } = ground
  const inBlock = new Uint8Array(cells.length)
  for (let y = 0; y + ROOM.height <= rows; y++) {
    for (let x = 0; x + ROOM.width <= cols; x++) {
      let clear = true
      for (let dy = 0; dy < ROOM.height && clear; dy++) for (let dx = 0; dx < ROOM.width; dx++) {
        if (at(ground, x + dx, y + dy) !== OPEN) {
          clear = false
          break
        }
      }
      if (clear) for (let dy = 0; dy < ROOM.height; dy++) for (let dx = 0; dx < ROOM.width; dx++) inBlock[(y + dy) * cols + x + dx] = 1
    }
  }
  const air = aired(ground, mouth)
  const seen = new Uint8Array(cells.length)
  const found: Room[] = []
  for (let start = 0; start < cells.length; start++) {
    if (inBlock[start] === 0 || seen[start] === 1) continue
    const room: Room = { cells: [], aired: false }
    const queue = [start]
    seen[start] = 1
    while (queue.length > 0) {
      const i = queue.pop()!
      room.cells.push(i)
      if (air[i] === 1) room.aired = true
      const x = i % cols, y = Math.floor(i / cols)
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        const n = ny * cols + nx
        if (inBlock[n] === 1 && seen[n] === 0) {
          seen[n] = 1
          queue.push(n)
        }
      }
    }
    room.cells.sort((a, b) => a - b)
    found.push(room)
  }
  return found
}

/** The chambers of the kingdom: the rooms air reaches. */
export const chambers = (ground: Ground, mouth: readonly number[] = MOUTH): Room[] => rooms(ground, mouth).filter((room) => room.aired)

/** The most workers the kingdom shows; past this it grows in rooms and halls. */
export const MOST_WORKERS = 16

/** What follows from the saved ground and is never stored: the workers, the queen's room and the height of the hill. */
export function kingdom(ground: Ground, mouth: readonly number[] = MOUTH): { chambers: Room[]; workers: number; queenRoom: number | null; hollow: number } {
  const lived = chambers(ground, mouth)
  // The queen lives in the largest chamber; of two as large, the one that comes first.
  let queenRoom: number | null = null
  lived.forEach((room, n) => {
    if (queenRoom === null || room.cells.length > lived[queenRoom].cells.length) queenRoom = n
  })
  let open = 0, diggable = 0
  for (let y = 1; y < ground.rows - 1; y++) for (let x = 0; x < ground.cols; x++) {
    diggable++
    if (at(ground, x, y) === OPEN) open++
  }
  return { chambers: lived, workers: Math.min(MOST_WORKERS, lived.length * 2), queenRoom, hollow: diggable === 0 ? 0 : open / diggable }
}
