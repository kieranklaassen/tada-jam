import type { Point } from './input'
import { TAPE_WIDTH, type Kind } from './layout'
import { lengthOf, type Strip } from './tape'

// Where two tapes of different colours cross. The pair decides what the
// crossing is, whichever strip was laid first: nothing here reads the order.
// Crossings are worked out from the strips and never stored.

export type CrossingKind = 'bridge' | 'level' | 'jam' | 'trestle' | 'reeds' | 'tunnel'

/** Grey is 0, blue 1, green 2, yellow 3 (layout.ts). The six pairs, each one thing. */
const PAIRS: Record<string, CrossingKind> = { '0-1': 'bridge', '0-3': 'level', '0-2': 'jam', '1-3': 'trestle', '1-2': 'reeds', '2-3': 'tunnel' }

export function crossingOf(a: Kind, b: Kind): CrossingKind | null {
  return PAIRS[a < b ? `${a}-${b}` : `${b}-${a}`] ?? null
}

export type Crossing = {
  kind: CrossingKind
  /** The two strips, the one of the lower tape first (grey before blue before green before yellow). */
  low: Strip
  high: Strip
  /** How far along each the crossing lies, and how far to each side of that it reaches on that strip. */
  dLow: number
  dHigh: number
  reachLow: number
  reachHigh: number
  at: Point
}

/** Every place where two strips of different tapes cross: their centre lines meet inside both. */
export function crossingsOf(strips: readonly Strip[]): Crossing[] {
  const found: Crossing[] = []
  for (let i = 0; i < strips.length; i++) {
    for (let j = i + 1; j < strips.length; j++) {
      const p = strips[i], q = strips[j]
      const kind = crossingOf(p.kind, q.kind)
      if (!kind) continue
      const [low, high] = p.kind < q.kind ? [p, q] : [q, p]
      const ll = lengthOf(low), lh = lengthOf(high)
      if (ll === 0 || lh === 0) continue
      const lx = (low.bx - low.ax) / ll, ly = (low.by - low.ay) / ll, hx = (high.bx - high.ax) / lh, hy = (high.by - high.ay) / lh
      const cross = lx * hy - ly * hx
      // Two strips laid along each other do not cross: one lies on the other.
      if (Math.abs(cross) < 0.25) continue
      const wx = high.ax - low.ax, wy = high.ay - low.ay
      const dLow = (wx * hy - wy * hx) / cross, dHigh = (wx * ly - wy * lx) / cross
      if (dLow < 0 || dLow > ll || dHigh < 0 || dHigh > lh) continue
      // The other tape's width, seen along this one: wider the shallower the angle.
      const reach = Math.min(TAPE_WIDTH * 1.6, TAPE_WIDTH / 2 / Math.abs(cross))
      found.push({ kind, low, high, dLow, dHigh, reachLow: reach, reachHigh: reach, at: { x: low.ax + lx * dLow, y: low.ay + ly * dLow } })
    }
  }
  return found
}

/** A crossing as one of its strips meets it: where along that strip, how far it reaches, and the other strip. */
export type Met = { crossing: Crossing; d: number; reach: number; other: Strip }

/** The crossings on one strip, nearest its first end first. */
export function crossingsOn(all: readonly Crossing[], strip: Strip): Met[] {
  const met: Met[] = []
  for (const crossing of all) {
    if (crossing.low === strip) met.push({ crossing, d: crossing.dLow, reach: crossing.reachLow, other: crossing.high })
    else if (crossing.high === strip) met.push({ crossing, d: crossing.dHigh, reach: crossing.reachHigh, other: crossing.low })
  }
  return met.sort((a, b) => a.d - b.d)
}
