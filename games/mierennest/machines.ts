import { MOUTH, OPEN, at, put, type Ground, type Lump } from './ground'
import type { Shot } from './habits'
import type { Machine } from './save'

// The two machines as rules: where one can stand, what its shot passes, and where the lump lands. Pure. A machine
// stands on a floor two cells wide with two cells clear over it: its place is the lower left of those four cells.

/** How far a cannon's blast of sand carries, in cells: it is wide and short. A ball of mud and a stone go as far as the way is open. */
export const SAND_CARRIES = 6
/** The catapult's lob: this many cells up and this many along. */
export const LOB = { up: 3, along: 6 } as const
/** Seconds in a raid before a machine has its own lump in its cup again. */
export const RELOAD = 2

export const LUMP_OF: Record<Shot, Lump> = { sand: 2, mud: 3, stone: 4 }
export const SHOT_OF = (lump: Lump): Shot => (lump === 2 ? 'sand' : lump === 3 ? 'mud' : 'stone')

/** The four cells a machine stands in. */
export function cellsOf(machine: { x: number; y: number }, cols: number): number[] {
  const low = machine.y * cols + machine.x
  return [low, low + 1, low - cols, low - cols + 1]
}

/** The machine that stands in a cell, as its place in the list, or -1. */
export function machineAt(machines: readonly Machine[], x: number, y: number): number {
  return machines.findIndex((m) => (x === m.x || x === m.x + 1) && (y === m.y || y === m.y - 1))
}

/**
 * Whether a machine can stand with its lower left cell here: four open cells, a floor under both lower ones, not
 * in the mouth's column above the first row of earth, and in no other machine. `but` is the machine being moved.
 */
export function canStand(ground: Ground, machines: readonly Machine[], x: number, y: number, but = -1): boolean {
  if (y < 2 || y >= ground.rows - 1 || x < 0 || x + 1 >= ground.cols) return false
  for (const [cx, cy] of [[x, y], [x + 1, y], [x, y - 1], [x + 1, y - 1]]) {
    if (at(ground, cx, cy) !== OPEN) return false
    const other = machineAt(machines, cx, cy)
    if (other >= 0 && other !== but) return false
  }
  return at(ground, x, y + 1) !== OPEN && at(ground, x + 1, y + 1) !== OPEN
}

/** The place nearest a cell where a machine can stand, searched outward ring by ring; null where the ground has none. */
export function nearestStand(ground: Ground, machines: readonly Machine[], x: number, y: number, but = -1): { x: number; y: number } | null {
  for (let reach = 0; reach < ground.cols; reach++) {
    for (let cy = y - reach; cy <= y + reach; cy++) for (let cx = x - reach; cx <= x + reach; cx++) {
      if (Math.max(Math.abs(cx - x), Math.abs(cy - y)) !== reach) continue
      if (canStand(ground, machines, cx, cy, but)) return { x: cx, y: cy }
    }
  }
  return null
}

/**
 * Where a machine comes to stand once the ground is at rest: where it is, if it can stand there; otherwise down to
 * the first floor under it, and if a lump lies in its place there, the nearest place it can stand. Null when the
 * nest has no place for it at all.
 */
export function restPlace(ground: Ground, machines: readonly Machine[], index: number): { x: number; y: number } | null {
  const machine = machines[index]
  if (canStand(ground, machines, machine.x, machine.y, index)) return { x: machine.x, y: machine.y }
  let y = machine.y
  while (y + 1 < ground.rows - 1 && at(ground, machine.x, y + 1) === OPEN && at(ground, machine.x + 1, y + 1) === OPEN) y++
  return canStand(ground, machines, machine.x, y, index) ? { x: machine.x, y } : nearestStand(ground, machines, machine.x, y, index)
}

/** Where a machine is first set when the workers bring it: as near the foot of the shaft as it can stand. */
export function arrivalPlace(ground: Ground, machines: readonly Machine[]): { x: number; y: number } | null {
  let y = 1
  while (y + 1 < ground.rows && at(ground, MOUTH[0], y + 1) === OPEN) y++
  return nearestStand(ground, machines, MOUTH[0], y)
}

/**
 * The cells a shot passes, in order, from the machine to the last open cell before something stops it. The
 * cannon fires level along the floor it stands on, where a raider ant walks; the catapult lobs in an arc, up three cells and six along, and on down.
 * A low roof stops a lob short. An empty list means the shot has nowhere to go.
 */
export function shotPath(ground: Ground, machine: Machine): number[] {
  const { cols, rows } = ground
  const path: number[] = []
  const own = cellsOf(machine, cols)
  const take = (x: number, y: number): boolean => {
    // The turf's row is a roof to a shot, the mouth in it too: nothing is thrown out of the nest or left lying in its mouth.
    if (x < 0 || y < 1 || x >= cols || y >= rows) return false
    const cell = y * cols + x
    if (own.includes(cell) || path[path.length - 1] === cell) return true
    if (at(ground, x, y) !== OPEN) return false
    path.push(cell)
    return true
  }
  if (machine.kind === 'cannon') {
    const reach = machine.load === 'sand' ? SAND_CARRIES : cols
    for (let n = 0, x = machine.facing > 0 ? machine.x + 2 : machine.x - 1; n < reach; n++, x += machine.facing) if (!take(x, machine.y)) break
    return path
  }
  // The cup lets go over the middle of the machine, at the height of its top.
  const sx = machine.x + 1, sy = machine.y - 0.5
  let lastX = Math.floor(sx), lastY = Math.floor(sy)
  for (let n = 1; n < 200; n++) {
    const along = n * 0.25, t = along / LOB.along
    const y = sy - 4 * LOB.up * t * (1 - t)
    if (y >= rows) break
    const cx = Math.floor(sx + machine.facing * along), cy = Math.floor(y)
    if (take(cx, cy)) {
      lastX = cx
      lastY = cy
      continue
    }
    // Stopped on its way up, by a roof: it drops short, one cell on from where it was and straight down from there.
    if (cy < lastY && take(lastX + machine.facing, lastY)) for (let down = lastY + 1; take(lastX + machine.facing, down); down++);
    break
  }
  return path
}

/** What firing a machine outside a raid did: the cells the lump flew through, and the cell it came to lie in. */
export type Fired = { shot: Shot; path: number[]; landed: number }

/**
 * Fires a loaded machine in the nest itself. The lump really flies: it lies where it landed, as a cell of the
 * ground, and the machine is empty. Null, with nothing changed, where the machine is empty or its shot has nowhere
 * to go. The caller lets the ground come to rest.
 */
export function fireInNest(ground: Ground, machine: Machine): Fired | null {
  if (!machine.load) return null
  const path = shotPath(ground, machine)
  if (path.length === 0) return null
  const landed = path[path.length - 1]
  put(ground, landed % ground.cols, Math.floor(landed / ground.cols), LUMP_OF[machine.load])
  const shot = machine.load
  machine.load = null
  return { shot, path, landed }
}
