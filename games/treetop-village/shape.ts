import { PLACES, type Fit, type Pt } from './tree'
import type { Kind } from './ways'

// The shape of each piece as plain numbers, shared by the painter, the frame
// and the tests, so that a walker's feet are where the piece is drawn.

/** How far above its two pegs a bucket's line runs, and the cup that hangs from it: from the line down to its rim and to its bottom. */
export const LINE_UP = 58
export const CUP = { rim: -42, bottom: -3, top: 44, foot: 34 }
/** How many printings a bucket's wheels have as they turn, and a rope bridge's bump as it travels along it. */
export const TURNS = 6, RIPPLES = 5
/** How far the seat of a swing on a span hangs below its line. */
export const SEAT_DROP = 62

/**
 * Where a walker's feet are on a piece, `t` along it from `pa`, as a drop below
 * the straight line between the pegs. A plank, a ladder and a slide are
 * straight; a bridge and a string sag; a bucket's line runs above the pegs.
 */
export function dropAt(kind: Kind, fit: Fit, t: number): number {
  if (fit === 'rise') return 0
  switch (kind) {
    case 'bridge': return 24 * Math.sin(Math.PI * t)
    case 'lanterns': return -8 + 120 * t * (1 - t)
    case 'bucket': return -LINE_UP + 40 * t * (1 - t)
    case 'slide': return 5 + 20 * t * (1 - t)
    default: return 0
  }
}

/** Where a walker's feet are, `t` along a piece: on the piece, and stepping on and off it from the landing at its two ends. */
export function feetAt(kind: Kind, fit: Fit, t: number): number {
  return dropAt(kind, fit, t) * Math.max(0, Math.min(1, t * 8, (1 - t) * 8))
}

/** How much further a piece gives under a weight or a bounce, `t` along it: what sags sags deeper, what is flat is pushed down whole. */
export function bowAt(kind: Kind, fit: Fit, t: number, bounce: number): number {
  if (fit === 'rise' || bounce === 0) return 0
  return kind === 'bridge' || kind === 'lanterns' || kind === 'slide' ? dropAt(kind, fit, t) * BOW * bounce : PUSH * bounce
}
/** How much deeper a sagging piece sags at a bounce of 1, and how far a flat one is pushed down. */
export const BOW = 0.6
export const PUSH = 7

/** The point a swing's seat hangs from, and where the seat is at rest. */
export function seatOf(place: number): { pin: Pt; seat: Pt } {
  const { pa, pb, fit } = PLACES[place]
  if (fit === 'span') { const pin = { x: (pa.x + pb.x) / 2, y: pa.y - 4 }; return { pin, seat: { x: pin.x, y: pin.y + SEAT_DROP } } }
  return { pin: { x: pb.x, y: pb.y }, seat: { x: pa.x + (pb.x - pa.x) * 0.25, y: pa.y - 22 } }
}

/** How many lanterns hang on a string in this place, and where each is, as `t` along it. */
export function lanternsOf(place: number): number[] {
  const { pa, pb } = PLACES[place]
  const count = Math.max(3, Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y) / 48))
  return Array.from({ length: count }, (_, index) => (index + 0.5) / count)
}

/** How many rungs a ladder has in this place. */
export function rungsOf(place: number): number {
  const { pa, pb } = PLACES[place]
  return Math.max(3, Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y) / 26))
}

const quad = (a: Pt, c: Pt, b: Pt): Pt[] => Array.from({ length: 11 }, (_, i) => { const t = i / 10, u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y } })

/**
 * The lines a piece is drawn along where it hangs at rest, so that a finger
 * finds the piece where it is seen: the sag of a bridge and its handrail, the
 * line and posts of a bucket, the seat of a swing and its ropes, each glass
 * of a string of lanterns, the curl of a slide. A bucket's cup is not here:
 * it runs, so whoever asks adds it where it is.
 */
export function shapeOf(kind: Kind, place: number): Pt[][] {
  const { pa: a, pb: b, fit } = PLACES[place]
  const span = fit === 'span'
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
  const up = (p: Pt, by: number): Pt => ({ x: p.x, y: p.y - by })
  switch (kind) {
    case 'plank':
    case 'ladder':
      return [[a, b]]
    case 'bridge': {
      const sag = span ? 24 : 0, side = span ? 0 : 16
      const slats = Array.from({ length: 11 }, (_, i) => { const t = i / 10, s = Math.sin(t * Math.PI); return { x: a.x + (b.x - a.x) * t + side * s, y: a.y + (b.y - a.y) * t + sag * s } })
      return span ? [slats, slats.map((p) => up(p, 18))] : [slats]
    }
    case 'bucket':
      return [span ? quad(up(a, LINE_UP), { x: mx, y: a.y - LINE_UP + 20 }, up(b, LINE_UP)) : [up(a, LINE_UP), up(b, LINE_UP)], [a, up(a, LINE_UP)], [b, up(b, LINE_UP)]]
    case 'swing': {
      const { pin, seat } = seatOf(place)
      const hung: Pt[][] = [[pin, seat], [{ x: seat.x - 24, y: seat.y }, { x: seat.x + 24, y: seat.y }]]
      return span ? [quad(up(a, 6), { x: mx, y: a.y + 6 }, up(b, 6)), ...hung] : hung
    }
    case 'lanterns': {
      const string = quad(up(a, 8), { x: mx + (span ? 0 : -44), y: my + (span ? 60 : 0) - 8 }, up(b, 8))
      const control = { x: mx + (span ? 0 : -44), y: my + (span ? 60 : 0) - 8 }
      const glasses = lanternsOf(place).map((t) => { const u = 1 - t, x = u * u * a.x + 2 * u * t * control.x + t * t * b.x, y = u * u * (a.y - 8) + 2 * u * t * control.y + t * t * (b.y - 8); return [{ x, y: y + 8 }, { x, y: y + 30 }] })
      return [string, ...glasses]
    }
    case 'slide': {
      const length = Math.hypot(b.x - a.x, b.y - a.y), nx = (b.y - a.y) / length
      return [quad(a, { x: mx - nx * (span ? 10 : 34) + (span ? 0 : (a.x - b.x) * 0.3), y: my + (span ? 10 : 26) }, b)]
    }
  }
}

/** How far a point is from the nearest of some lines. */
export function farFrom(at: Pt, lines: readonly Pt[][]): number {
  let nearest = Infinity
  for (const line of lines) {
    for (let i = 0; i + 1 < line.length; i++) {
      const p = line[i], q = line[i + 1]
      const dx = q.x - p.x, dy = q.y - p.y, long = dx * dx + dy * dy
      const t = long === 0 ? 0 : Math.max(0, Math.min(1, ((at.x - p.x) * dx + (at.y - p.y) * dy) / long))
      nearest = Math.min(nearest, Math.hypot(at.x - (p.x + dx * t), at.y - (p.y + dy * t)))
    }
  }
  return nearest
}
