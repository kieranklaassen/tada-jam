import type { Point } from './input'
import { ladderOf } from './shapes'

// The small painted marks that could be taken for a sign if they were drawn
// evenly: the stars of the night sky, the knotted rope under a bell house's
// door, the grain on the end of the log. Each is kept here as plain numbers,
// uneven on purpose, so that a test can hold it: no level bar, no two strokes
// stacked level, no closed ring, no posts with rungs across, no two dabs on a
// short line, no fan of nested arcs. The painter reads these and adds nothing
// of its own.

/** One dab of paint: where, how long and how wide, and how far its long side is turned from level, in radians. */
export type Dab = { x: number; y: number; rx: number; ry: number; tilt: number }

/** The stars: one plump dab each, no two of a size or a tilt, and none lying level. */
export const STARS: readonly Dab[] = ([
  [498, 70, 5, 0.6], [552, 196, 3.2, -0.9], [640, 120, 4.2, 1.1], [706, 232, 2.6, -0.5], [760, 62, 3.6, 0.8],
  [842, 168, 5.4, -1.15], [910, 96, 2.8, 0.45], [1052, 150, 4, -0.7], [474, 240, 3, 1], [1100, 232, 2.4, -0.55],
] as const).map(([x, y, r, tilt]) => ({ x, y, rx: r * 1.3, ry: r * 0.95, tilt }))

/**
 * What hangs under a bell house's door for its gnome to climb: one rope with knots in it, and nothing across it.
 * It hangs a little askew and in a slack curve, the knots are swellings on the rope at uneven steps and of uneven
 * size, and its end frays into a tuft. There is one rope only: two posts with rungs across are never painted. A
 * rope too short for two knots to lie well apart has one knot and its tuft, never two dabs on a short line.
 */
export type Rope = { line: readonly Point[]; knots: readonly { x: number; y: number; r: number; tilt: number }[]; tuft: readonly (readonly [Point, Point])[] }

const KNOT_AT = [0.34, 0.8, 0.52, 0.93, 0.1] as const
const KNOT_R = [3.1, 3.9, 2.7, 3.5, 2.9] as const
/** A rope has one knot for about each of these units of its length. */
const KNOT_EVERY = 26

/** Where the rope is, a share of the way down: askew to the stem's side and bowed, never a straight upright line. */
function ropeAt(size: number, share: number): Point {
  const { x, y0, y1 } = ladderOf(size), length = y1 - y0
  const askew = 4 + 0.5 * size, bow = 2.2 + 0.25 * size
  return { x: x - askew * share + bow * Math.sin(Math.PI * share) + 0.6 * bow * Math.sin(Math.PI * 2 * share), y: y0 + length * share }
}

/** The rope of a bell house of this size, let down a `share` of its length (1 is all of it). */
export function ropeParts(size: number, share = 1): Rope {
  const { y0, y1 } = ladderOf(size), length = y1 - y0, out = Math.max(0, Math.min(1, share))
  const steps = Math.max(4, Math.round(length / 5)), line: Point[] = []
  for (let i = 0; i <= steps; i++) line.push(ropeAt(size, (out * i) / steps))
  // One knot on a short rope and up to four on the longest, in an order that is not top to bottom.
  const count = Math.max(1, Math.min(5, Math.round(length / KNOT_EVERY)))
  const knots = KNOT_AT.slice(0, count).map((at, i) => ({ at, r: KNOT_R[i] })).filter((knot) => knot.at <= out).map((knot) => {
    const p = ropeAt(size, knot.at), next = ropeAt(size, knot.at + 0.02)
    return { x: p.x, y: p.y, r: knot.r, tilt: Math.atan2(next.y - p.y, next.x - p.x) }
  })
  const end = ropeAt(size, out)
  const tuft: [Point, Point][] = [[end, { x: end.x - 3.2, y: end.y + 4.5 }], [end, { x: end.x + 1.4, y: end.y + 5.4 }]]
  return { line, knots, tuft }
}

/**
 * The grain on the end of the log: a few broken pieces of its year rings, round a heart that lies on the end but
 * off its middle (`dx`, `dy` from the middle of the end). Each piece is a short arc: how far out it lies, from
 * which angle to which (in degrees, clockwise from the right, as the canvas turns), and how thick it is painted.
 * The pieces lie at uneven steps, each is short, no two are of a length or a width, and each lies on another side
 * of the heart than the one inside it, so that they neither close into a ring nor open out as a fan from a corner.
 */
export const LOG_FACE = { rx: 22, ry: 31 } as const
export const LOG_GRAIN = { dx: -5, dy: 6, pieces: [{ r: 6.5, from: 200, to: 280, wide: 2.4 }, { r: 13, from: 110, to: 170, wide: 2 }, { r: 20, from: 340, to: 390, wide: 3 }, { r: 28, from: 255, to: 300, wide: 2.2 }] } as const
