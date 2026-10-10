import { PLACES, TRAY, placeAt } from './places'

// The tray as the rules see it: ten places, each holding a stack of toys,
// bottom first. A toy is named by its key. Nothing here moves or draws.

/** The most toys one place holds, one on another. */
export const STACK_MOST = 3

export type Tray = number[][]

export function emptyTray(): Tray {
  return Array.from({ length: PLACES }, () => [])
}

/** Where a toy stands: its place and how many toys are under it. */
export function whereIs(tray: Tray, key: number): { place: number; level: number } | null {
  for (let place = 0; place < tray.length; place++) {
    const level = tray[place].indexOf(key)
    if (level >= 0) return { place, level }
  }
  return null
}

/** The place nearest a point, wherever the point is: a point off the tray takes the place at its edge. */
export function nearestPlace(x: number, z: number): number {
  const column = Math.min(TRAY.columns - 1, Math.max(0, Math.floor((x - TRAY.x) / TRAY.cell)))
  const row = Math.min(TRAY.rows - 1, Math.max(0, Math.floor((z - TRAY.z) / TRAY.cell)))
  return row * TRAY.columns + column
}

const distance = (place: number, x: number, z: number) => {
  const at = placeAt(place)
  return Math.hypot(at.x - x, at.z - z)
}

/** The nearest place that passes `wanted`, or -1. Ties go to the lower place, so the answer never depends on chance. */
export function nearestWhere(tray: Tray, x: number, z: number, wanted: (stack: readonly number[], place: number) => boolean): number {
  let best = -1, least = Infinity
  for (let place = 0; place < tray.length; place++) {
    if (!wanted(tray[place], place)) continue
    const d = distance(place, x, z)
    if (d < least - 1e-9) { least = d; best = place }
  }
  return best
}

/** The nearest place with nothing on it, or -1 when every place holds something. */
export function nearestFree(tray: Tray, x: number, z: number, skip = -1): number {
  return nearestWhere(tray, x, z, (stack, place) => stack.length === 0 && place !== skip)
}

/** The nearest place a toy can be let go on: free, or a stack with room on top. Falls back to -1 only when the whole tray is stacked full. */
export function nearestWithRoom(tray: Tray, x: number, z: number, skip = -1): number {
  return nearestWhere(tray, x, z, (stack, place) => stack.length < STACK_MOST && place !== skip)
}

/** The nearest place that holds a toy within `reach` of a point, or -1: what a claw landing there closes on. */
export function nearestToy(tray: Tray, x: number, z: number, reach: number): number {
  const place = nearestWhere(tray, x, z, (stack) => stack.length > 0)
  return place >= 0 && distance(place, x, z) <= reach ? place : -1
}

export function take(tray: Tray, place: number): number | null {
  return tray[place].pop() ?? null
}

export function put(tray: Tray, place: number, key: number): void {
  tray[place].push(key)
}

export function remove(tray: Tray, key: number): void {
  for (const stack of tray) {
    const at = stack.indexOf(key)
    if (at >= 0) stack.splice(at, 1)
  }
}

/** How many toys are on the tray. */
export function count(tray: Tray): number {
  return tray.reduce((sum, stack) => sum + stack.length, 0)
}
