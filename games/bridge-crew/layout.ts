import { type Kind, type Part, type Point } from './kit'
import { COLS, ROWS, canPin, type Site } from './sites'

// Where the things a finger can reach lie, in grid cells (x right, y up), and
// which of them a touch means. Pure. The view draws from the same numbers, so
// what answers a touch is what is drawn there.

/** The tray of parts under the gap: its top edge, in cells below the river bed, and its height. */
export const TRAY = { top: -1.25, tall: 2.1 } as const

/** One compartment of the tray: the pile of one kind of part. */
export type Bay = { kind: Kind; x0: number; x1: number }

/** The tray's compartments, left to right: one for each kind the sheet's kit holds. */
export function bays(at: Site): Bay[] {
  const kinds = (['plank', 'stick', 'tube', 'thread'] as const).filter((kind) => at.kit[kind] > 0)
  const left = at.left[0] - 1, wide = at.right[0] - at.left[0] + 2
  return kinds.map((kind, i) => ({ kind, x0: left + (wide * i) / kinds.length, x1: left + (wide * (i + 1)) / kinds.length }))
}

/** The compartment under a touch, if the touch is in the tray. A little above and below the drawn box still counts. */
export function bayAt(at: Site, x: number, y: number): Bay | null {
  if (y > TRAY.top + 0.25 || y < TRAY.top - TRAY.tall - 0.6) return null
  return bays(at).find((bay) => x >= bay.x0 && x < bay.x1) ?? null
}

/** The grid point nearest a touch where a pin may go, and how far off it is. Null when the touch is off the grid. */
export function gridPointAt(at: Site, x: number, y: number): { point: Point; far: number } | null {
  if (x < -0.5 || x > COLS + 0.5 || y < -0.5 || y > ROWS + 0.5) return null
  let best: { point: Point; far: number } | null = null
  for (let gx = Math.floor(x) - 1; gx <= Math.ceil(x) + 1; gx++) {
    for (let gy = Math.floor(y) - 1; gy <= Math.ceil(y) + 1; gy++) {
      if (!canPin(at, [gx, gy])) continue
      const far = Math.hypot(gx - x, gy - y)
      if (!best || far < best.far) best = { point: [gx, gy], far }
    }
  }
  return best && best.far <= 1.5 ? best : null
}

/** How far a point is from the stretch between two others. */
export function farFromStretch(x: number, y: number, a: readonly [number, number], b: readonly [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], long = dx * dx + dy * dy
  const t = long === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / long))
  return Math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t))
}

/** A touch within this of a grid point means the pin there, whatever part passes by. */
export const PIN_REACH = 0.33
/** A touch within this of a part's body, and not on a pin, means the part. Together the two leave no dead ground on a bridge. */
export const PART_REACH = 0.5

/**
 * What a touch means: the pin at the nearest grid point, or a part's body.
 * `drawn` gives each part's two ends as they are drawn now, so a hanging part
 * is touched where it hangs.
 */
export function touched(at: Site, parts: readonly Part[], drawn: readonly { a: readonly [number, number]; b: readonly [number, number] }[], x: number, y: number): { pin: Point } | { part: number } | null {
  const grid = gridPointAt(at, x, y)
  let part = -1, far = PART_REACH
  parts.forEach((_, index) => {
    const d = farFromStretch(x, y, drawn[index].a, drawn[index].b)
    if (d <= far) { far = d; part = index }
  })
  if (grid && (grid.far <= PIN_REACH || part < 0)) return { pin: grid.point }
  return part >= 0 ? { part } : null
}
