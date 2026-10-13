import type { Point } from './input'
import { TAPE_WIDTH, clampToField, type Kind } from './layout'

// A strip of tape: which roll it came off and its two ends, in whole stage
// units. Everything else about the floor (where roads join, what the car is
// on) is worked out from the strips, so the strips are all a save holds.

export type Strip = { kind: Kind; ax: number; ay: number; bx: number; by: number }

/** The floor keeps this many strips. Laying one more lifts the oldest. */
export const MAX_STRIPS = 64

export function lengthOf(strip: Strip): number {
  return Math.hypot(strip.bx - strip.ax, strip.by - strip.ay)
}

export function angleOf(strip: Strip): number {
  return Math.atan2(strip.by - strip.ay, strip.bx - strip.ax)
}

/** The point `d` units along a strip from its first end. */
export function along(strip: Strip, d: number): Point {
  const length = lengthOf(strip) || 1
  return { x: strip.ax + ((strip.bx - strip.ax) * d) / length, y: strip.ay + ((strip.by - strip.ay) * d) / length }
}

/** The nearest point of a strip's centre line to `at`: how far along it lies, and how far off it `at` is. */
export function nearestOn(strip: Strip, at: Point): { d: number; off: number } {
  const length = lengthOf(strip)
  if (length === 0) return { d: 0, off: Math.hypot(at.x - strip.ax, at.y - strip.ay) }
  const ux = (strip.bx - strip.ax) / length, uy = (strip.by - strip.ay) / length
  const d = Math.max(0, Math.min(length, (at.x - strip.ax) * ux + (at.y - strip.ay) * uy))
  return { d, off: Math.hypot(at.x - (strip.ax + ux * d), at.y - (strip.ay + uy * d)) }
}

/**
 * The strip a pull lays: from where the finger landed to where it lifted, both on the bare floor. A pull
 * shorter than a tape-width, a tap above all, lays a stub one tape-width long: along the pull when there was
 * one, and otherwise at `tilt`, centred on the tap.
 */
export function stripFrom(kind: Kind, from: Point, to: Point, tilt: number): Strip {
  const a = clampToField(from), b = clampToField(to)
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (length >= TAPE_WIDTH) return { kind, ax: Math.round(a.x), ay: Math.round(a.y), bx: Math.round(b.x), by: Math.round(b.y) }
  const angle = length > 6 ? Math.atan2(b.y - a.y, b.x - a.x) : tilt
  const middle = clampToField(length > 6 ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a, TAPE_WIDTH / 2)
  const hx = (Math.cos(angle) * TAPE_WIDTH) / 2, hy = (Math.sin(angle) * TAPE_WIDTH) / 2
  return { kind, ax: Math.round(middle.x - hx), ay: Math.round(middle.y - hy), bx: Math.round(middle.x + hx), by: Math.round(middle.y + hy) }
}

/** Whether a strip is a stub: tape with no length to travel along. */
export function isStub(strip: Strip): boolean {
  return lengthOf(strip) < TAPE_WIDTH * 1.3
}

/** Lays a strip on the floor. Returns the strips as they now lie and whether the oldest was lifted to make room. */
export function lay(strips: readonly Strip[], strip: Strip): { strips: Strip[]; lifted: Strip | null } {
  const next = [...strips, strip]
  const lifted = next.length > MAX_STRIPS ? next.shift()! : null
  return { strips: next, lifted }
}

/** A strip read from a save, or null when it is not one. */
export function readStrip(raw: unknown): Strip | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { kind, ax, ay, bx, by } = raw as Record<string, unknown>
  if (kind !== 0 && kind !== 1 && kind !== 2 && kind !== 3) return null
  const ends = [ax, ay, bx, by]
  if (!ends.every((value): value is number => typeof value === 'number' && Number.isFinite(value))) return null
  const a = clampToField({ x: ends[0], y: ends[1] }), b = clampToField({ x: ends[2], y: ends[3] })
  const strip: Strip = { kind, ax: Math.round(a.x), ay: Math.round(a.y), bx: Math.round(b.x), by: Math.round(b.y) }
  return lengthOf(strip) >= TAPE_WIDTH * 0.9 ? strip : null
}
