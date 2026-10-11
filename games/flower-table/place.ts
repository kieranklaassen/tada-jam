import { PATH, PATH_CLEAR } from './layout'
import { BED, PLANTS, SOIL_Y, type Kind } from './plants'

// Where a piece comes to lie on the path. Pure: the garden asks for a place
// and gets the nearest free one. The rule it keeps is the sheet's "Nothing
// the game sets down covers a target": a piece that lies flat is wholly
// inside the band of the path, below the earth of the bed, the table and
// both visitors, so no touch meant for a stem, the vase or a visitor can land
// on it, and none meant for it can land on them.

/** How far a piece's flower reaches to either side of its stalk, by plant: what a flat piece keeps between itself and the bed. */
export const LATERAL: Record<Kind, number> = { sunflower: 56, poppy: 42, onion: 50, thistle: 42, ivy: 34, dandelion: 44 }

/** A piece as the path knows it: its cut end, its length, and how it is turned from upright. */
export type Lying = { x: number; y: number; rot: number; len: number }

/** Flat on the path: turned to one side or the other. Upright: a thistle that stuck in like a dart. */
export const isUpright = (rot: number): boolean => Math.abs(rot) < 0.5

/** Two stems must stand at least this far apart for a thistle to stick between them, so each keeps room for a finger. */
const SLOT_GAP = 44

/** The places between two stems of the bed where a thistle let fall by the child can stick upright, one thistle to a place. */
export const SLOTS: readonly number[] = BED.slice(1).flatMap((spot, index) => (spot.x - BED[index].x >= SLOT_GAP ? [Math.round((BED[index].x + spot.x) / 2)] : []))

/** How near its spine a finger must land to take an upright thistle above the path. Half the least gap to a stem, less a little. */
export const UPRIGHT_REACH = 12

/** The highest a flat piece of this plant may lie, so that its flower stays below the earth of the bed. */
export function floorOf(kind: Kind, scale: number, head: boolean): number {
  const reach = head ? LATERAL[kind] * scale * 0.7 : 8
  return Math.min(PATH.bottom, Math.max(PATH.top, Math.round(PATH_CLEAR + reach)))
}

function taken(at: Lying, others: readonly Lying[]): number {
  // How much of this place others already lie on: the length shared with each one that lies in the same row, and
  // less for one that lies a row or two away, whose flower it would still lie across.
  const a0 = Math.min(at.x, at.x + Math.sin(at.rot) * at.len), a1 = Math.max(at.x, at.x + Math.sin(at.rot) * at.len)
  let shared = 0
  for (const other of others) {
    if (isUpright(other.rot)) continue
    const apart = Math.abs(other.y - at.y)
    if (apart >= 44) continue
    const b0 = Math.min(other.x, other.x + Math.sin(other.rot) * other.len), b1 = Math.max(other.x, other.x + Math.sin(other.rot) * other.len)
    shared += Math.max(0, Math.min(a1, b1) - Math.max(a0, b0) + 10) * (apart < 11 ? 1 : apart < 22 ? 0.5 : 0.25)
  }
  return shared
}

/**
 * The nearest free place to `x` for a piece that lies flat: inside the frame, in a row of the path low enough
 * for its flower, turned the way `toRight` asks where there is room for that. Where every place near is taken
 * it lies on the one least taken. `tilt` is a small turn off the level, in radians.
 */
export function flatPlace(x: number, piece: { kind: Kind; scale: number; len: number; head: boolean }, others: readonly Lying[], toRight: boolean, tilt: number): { x: number; y: number; rot: number } {
  const top = floorOf(piece.kind, piece.scale, piece.head)
  const rows: number[] = []
  // The highest row first: nearest the bed and the table, and with all of its flower inside the frame.
  for (let y = top; y <= PATH.bottom; y += 11) rows.push(y)
  let best: { x: number; y: number; rot: number } | null = null, bestCost = Infinity
  for (let step = 0; step < 40 && bestCost > 0; step++) {
    const shift = Math.ceil(step / 2) * 30 * (step % 2 ? 1 : -1)
    for (const side of [toRight, !toRight]) {
      const dir = side ? 1 : -1
      const at = Math.round(Math.min(PATH.right, Math.max(PATH.left, x + shift)))
      const end = at + dir * piece.len
      if (end > PATH.right || end < PATH.left) continue
      for (const y of rows) {
        const rot = Math.round(dir * (Math.PI / 2 + Math.abs(tilt)) * 100) / 100
        // Farther from where it was let go costs a little, so the nearest free place wins.
        const cost = taken({ x: at, y, rot, len: piece.len }, others) * 100 + Math.abs(shift) * 0.01 + (side === toRight ? 0 : 0.001)
        if (cost < bestCost) { best = { x: at, y, rot }; bestCost = cost }
        if (cost < 1) break
      }
    }
  }
  // A piece longer than the path is wide cannot happen (the tallest stem is far shorter), so `best` is set.
  return best ?? { x: Math.round(Math.min(PATH.right - piece.len, Math.max(PATH.left, x))), y: PATH.bottom, rot: 1.57 }
}

/** The earth of the bed in front of the stems, where the foot of a thistle that stuck upright stands. */
export const EARTH = { top: SOIL_Y + 4, bottom: SOIL_Y + 12 } as const

/** Whether a finger at this height is over the bed: from above its tallest flower down to its earth. */
export function overBed(y: number): boolean {
  return y <= PATH_CLEAR && y >= SOIL_Y - TALLEST - 40
}
const TALLEST = Math.max(...BED.map((spot) => PLANTS[spot.kind].full * spot.scale))

/** How far to either side of a place between two stems a thistle let go still sticks there: between those two stems. */
const SLOT_REACH = 30

/** The free place nearest `x` where a thistle can stick upright, or null where every place near is taken. */
export function uprightPlace(x: number, others: readonly Lying[]): number | null {
  let best: number | null = null, bestD = SLOT_REACH
  for (const slot of SLOTS) {
    const d = Math.abs(slot - x)
    if (d >= bestD || others.some((other) => isUpright(other.rot) && Math.abs(other.x - slot) < 20)) continue
    best = slot; bestD = d
  }
  return best
}

/** Whether a flower of this plant at this size keeps clear of the bed when it lies at `y`. For the overlap test. */
export function clearOfBed(kind: Kind, scale: number, head: boolean, y: number): boolean {
  return y >= floorOf(kind, scale, head) - 0.5 && y - (head ? PLANTS[kind].headR * scale * 0.7 : 0) >= PATH_CLEAR - 0.5
}
