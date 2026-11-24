import type { Point } from './input'
import type { Spot, Who } from './layout'
import type { Draped } from './model'

// Things on their way through the air.

export type Flight = { what: 'sausage' | 'blanket'; from: Point; to: Spot | 'basket'; t: number; seconds: number; of?: Who | Draped }

/** The size of a blanket rolled up as it flies. */
export const FOLD = 44

/** Where a flight is, on an arc over the straight line. */
export function flightAt(f: Flight, to: Point): Point & { k: number } {
  const k = Math.max(0, Math.min(1, f.t / f.seconds))
  const u = f.what === 'sausage' ? k * k * (3 - 2 * k) : 1 - (1 - k) * (1 - k)
  const rise = Math.min(160, 40 + Math.hypot(to.x - f.from.x, to.y - f.from.y) * 0.22)
  return { x: f.from.x + (to.x - f.from.x) * u, y: f.from.y + (to.y - f.from.y) * u - Math.sin(u * Math.PI) * rise, k }
}
