import type { Kind } from './blocks'
import { BLOCK_H, DRIFT, SCOOPS } from './ground'
import { all, bar, blobby, dot, lens, oval, placed, poly, type Shape } from './print'

// The six things as the print lays them. Many things are one fill: every
// thing adds its shapes to five lists, one for each pull the view makes
// (paper under everything, the red, the blue, the cloudy flecks, and paper
// on top), so a wall of sixty blocks costs the same five fills as one block.
//
// A part left out of an ink (a glint, a berry's window) is wound the other
// way round, so the fills need no even-odd rule and two things that overlap
// while one is carried never cancel each other.

const H = BLOCK_H
const TAU = Math.PI * 2

/** An oval wound the other way: inside a shape of the same ink it is a part left out. */
const gap = (cx: number, cy: number, rx: number, ry: number, turn = 0): Shape => (g) => {
  g.moveTo(cx + Math.cos(turn) * rx, cy + Math.sin(turn) * rx)
  g.ellipse(cx, cy, rx, ry, turn, TAU, 0, true)
}

/** The five pulls. `lit` is paper that stays bare whatever the hour: under a thing a lamp's light reaches. */
export type Pulls = { under: Shape[]; lit: Shape[]; red: Shape[]; blue: Shape[]; cloud: Shape[]; top: Shape[] }
export const pulls = (): Pulls => ({ under: [], lit: [], red: [], blue: [], cloud: [], top: [] })

/** A thing as it is drawn now. */
export type Drawn = {
  kind: Kind
  len: number
  x: number
  y: number
  turn: number
  sx: number
  sy: number
  /** An icicle that hangs point down. */
  hung: boolean
  dent: readonly number[]
  /** How far its cap of fresh snow has settled, 0 for none to 1. */
  cap: number
  /** How warm a thumb has made it, 0 to 1. */
  heat: number
  /** How far a snowball has turned. */
  spin: number
  /** What is inside it lags behind it by this much: the berry in its block. */
  jiggle: number
  /** A lamp's light reaches it: the paper under it stays bare by night. */
  lit: boolean
}

/**
 * The shine on a block of clear ice: light caught along its upper edge and running a little way down one end,
 * so that it follows the block's own outline and is no mark laid on its face. Which end it turns down, how far
 * it runs along the top and how far down the end all follow from where the block is, so that no two blocks of a
 * wall shine alike and the shine slides along a block as it is carried.
 */
export function glintOf(len: number, x: number, y: number): { side: 1 | -1; along: number; down: number; from: number } {
  return {
    side: Math.sin(x / 41 + y / 37) > 0 ? 1 : -1,
    along: (len - 30) * (0.3 + 0.22 * Math.sin(x / 53 + y / 29 + 1)),
    down: 9 + 7 * Math.sin(x / 71 - y / 43 + 2),
    from: 3 + 5 * (0.5 + 0.5 * Math.sin(x / 97 + y / 61)),
  }
}
/** The shine as a part left out of the ink: a thin sliver along the top that turns the corner and thins out down the end. */
const glint = (len: number, x: number, y: number): Shape => {
  const { side, along, down, from } = glintOf(len, x, y), end = side * (len / 2 - 6), top = -H / 2 + 6
  const points: [number, number][] = [
    [end - side * (from + along), top], [end - side * (from + along * 0.5), top + 3.4], [end - side * 3, top + 3.6], [end - side * 2.6, top + 6 + down],
    [end, top + 4 + down * 0.6], [end + side * 0.6, top + 2], [end - side * 4, top],
  ]
  // Wound against the block's own outline, whichever end it turns down, so that it is a part left out of the ink.
  if (side < 0) points.reverse()
  return (g) => {
    g.moveTo(points[0][0], points[0][1])
    for (const [px, py] of points.slice(1)) g.lineTo(px, py)
    g.closePath()
  }
}

/**
 * The beads of water on a clear block under a warm thumb: where each is along the block, how high it starts,
 * how far it runs down, and how large it is. No two are the same size, they are at no even step, and they are
 * never level with one another.
 */
export const BEADS: readonly { u: number; y: number; run: number; rx: number; ry: number }[] = [
  { u: -0.33, y: -14, run: 15, rx: 2, ry: 2.9 },
  { u: -0.08, y: -3, run: 22, rx: 3.3, ry: 4.6 },
  { u: 0.31, y: -9, run: 18, rx: 2.5, ry: 3.6 },
]

/** A snow block: its top sags a finger's width. */
const snowBody = (len: number): Shape => (g) => {
  const x = len / 2, y = H / 2
  g.moveTo(-x + 7, -y)
  g.quadraticCurveTo(0, -y + 7, x - 7, -y)
  g.quadraticCurveTo(x, -y, x, -y + 7)
  g.lineTo(x, y - 6)
  g.quadraticCurveTo(x, y, x - 6, y)
  g.lineTo(-x + 6, y)
  g.quadraticCurveTo(-x, y, -x, y - 6)
  g.lineTo(-x, -y + 7)
  g.quadraticCurveTo(-x, -y, -x + 7, -y)
  g.closePath()
}

/** An icicle standing point up in its place: `len` is its height. */
const spike = (len: number, grow: number): Shape => {
  const b = H / 2
  return poly(-9 - grow, b + grow * 0.4, -5 - grow, b - len * 0.5, 0, b - len - grow * 2, 5 + grow, b - len * 0.55, 9 + grow, b + grow * 0.4)
}

/** A thing's outline as a lamp's light lays it on the ground, about the thing's middle: what the light comes through, or what stops it. */
export function outlineOf(kind: Kind, len: number, grow = 0): Shape {
  if (kind === 'ball') return dot(0, (H - len) / 2, len / 2 + grow)
  if (kind === 'icicle') return spike(len, grow)
  return bar(0, 0, len + grow * 2, H + grow * 2, 7 + grow)
}

/** Adds one thing to the pulls. */
export function addThing(to: Pulls, d: Drawn): void {
  const at = (shape: Shape): Shape => placed(d.x, d.y, d.turn + (d.hung ? Math.PI : 0), d.sx, d.sy, shape)
  const len = d.len
  const under = (shape: Shape): void => {
    ;(d.lit ? to.lit : to.under).push(at(shape))
  }
  switch (d.kind) {
    case 'clear':
      // Paper shows round it, so that it is seen on the clear middle of the pond and over another block.
      under(bar(0, 0, len + 7, H + 7, 10))
      to.blue.push(at(all(bar(0, 0, len, H, 7), glint(len, d.x, d.y))))
      if (d.heat > 0) {
        // Under a warm thumb it sweats and sinks: beads of water run down its face, and a puddle spreads round its foot.
        const foot = d.y + (H / 2) * d.sy
        to.blue.push(oval(d.x, foot + 1, (len / 2) * (0.7 + d.heat * 0.6), 3 + d.heat * 7))
        to.top.push(at(all(...BEADS.map((bead) => oval(bead.u * len, bead.y + d.heat * bead.run, bead.rx, bead.ry + d.heat * 3)))))
      }
      break
    case 'cloudy':
      under(bar(0, 0, len + 7, H + 7, 10))
      to.blue.push(at(bar(0, 0, len, H, 7)))
      // A warm thumb melts the cloud out of it from its edges inward.
      to.cloud.push(at(bar(0, 0, len * (1 - d.heat * 0.9), H * (1 - d.heat * 0.9), 7)))
      break
    case 'snow':
      under(snowBody(len))
      // Shade along its foot and one side, a line of it in the sag, and a dimple wherever a fingertip went in.
      to.blue.push(at(all(
        bar(1, H / 2 - 3.5, len - 6, 7, 3.5), bar(len / 2 - 3.5, 4, 7, H - 14, 3.5), bar(-len / 2 + 2.5, 3, 5, H - 14, 2.5), lens(-len / 2 + 6, -H / 2 + 2, len / 2 - 6, -H / 2 + 2, 6, 2),
        ...d.dent.map((x) => lens(x - 10, -H / 2 + 12, x + 10, -H / 2 + 12, 6, 1.5)),
      )))
      break
    case 'ball': {
      // It sits on the floor of its place; a rim of shade and two specks turn with it.
      const r = len / 2, y = (H - len) / 2
      under(dot(0, y, r))
      to.blue.push(at(placed(0, y, d.spin, 1, 1, all(dot(0, 0, r), gap(-r * 0.14, -r * 0.14, r * 0.8, r * 0.8), dot(-r * 0.3, r * 0.1, r * 0.09), oval(r * 0.12, -r * 0.42, r * 0.12, r * 0.07, 0.5)))))
      break
    }
    case 'icicle':
      under(spike(len, 3))
      to.blue.push(at(all(spike(len, 0), poly(-3.5, H / 2 - 4, -1, H / 2 - 4, -1.5, H / 2 - len * 0.62))))
      break
    case 'berry': {
      // Ice with a window of bare paper in it, and in the window three berries on a leaf.
      const j = d.jiggle, swell = 1 + d.heat * 0.3
      under(bar(0, 0, len + 5, H + 5, 9))
      to.blue.push(at(all(bar(0, 0, len, H, 7), gap(0, 0, 27, 18), lens(-2 + j, -8, 15 + j, -15, 3.2, -1))))
      to.red.push(at(all(dot(-9 + j, 4, 7.5 * swell), dot(7 + j, 6, 7 * swell), dot(-1 + j, -5, 6.5 * swell))))
      break
    }
    default: d.kind satisfies never
  }
  if (d.cap > 0) {
    // Fresh snow on top: a band of bare paper that comes down thin and settles, under a thin line of shade, so that it is a layer on the block and no bite out of it.
    const drop = (1 - d.cap) * -26, thick = 4 + d.cap * 8, top = -H / 2 - thick + 6 + drop
    to.top.push(placed(d.x, d.y, d.turn, d.sx, d.sy, bar(0, top + thick / 2, len + 6, thick, thick / 2)))
    to.blue.push(placed(d.x, d.y, d.turn, d.sx, d.sy, lens(-len / 2 + 1, top + 2, len / 2 - 1, top + 2, -3.4, -1.2)))
  }
}

/** The drift by King Winter's feet, lower for every scoop taken from it; a low heap is left when it has given all it has. */
export function addDrift(to: Pulls, taken: number): void {
  const left = 1 - (Math.min(SCOOPS, Math.max(0, taken)) / SCOOPS) * 0.78
  const { cx, cy, rx, ry } = DRIFT
  const foot = cy + ry, high = ry * 2.4 * left
  // A soft heap with a smaller shoulder: each a dome of the blue with a dome of bare paper laid on it a little up and to the left, so the heap has a thin line over its top and shade down its right side.
  const dome = (x0: number, x1: number, h: number): Shape => (g) => {
    g.moveTo(x0, foot)
    g.bezierCurveTo(x0 + (x1 - x0) * 0.08, foot - h * 1.25, x1 - (x1 - x0) * 0.25, foot - h * 1.35, x1, foot)
    g.closePath()
  }
  const big = [cx - rx * 0.5, cx + rx] as const, small = [cx - rx, cx + rx * 0.08] as const
  to.under.push(all(dome(big[0], big[1], high), dome(small[0], small[1], high * 0.6)))
  to.blue.push(all(dome(big[0], big[1], high), dome(small[0], small[1], high * 0.6), lens(cx - rx * 0.96, foot, cx + rx * 1.06, foot, -1, 5)))
  to.top.push(all(dome(big[0] + 3, big[1] - 5 - 9 * left, high - 3), dome(small[0] + 3, small[1] - 4 - 4 * left, high * 0.6 - 3)))
}

/** The heap of snow gathered under a scooping finger: larger the further the hand has gone. */
export function addScoop(to: Pulls, x: number, y: number, len: number): void {
  const r = 12 + Math.min(1, len / 240) * 26
  to.under.push(blobby([x - r, y + 6, x - r * 0.7, y - r * 0.7, x, y - r, x + r * 0.8, y - r * 0.5, x + r, y + 6]))
  to.blue.push(lens(x - r * 0.9, y + 5, x + r * 0.9, y + 5, -3, 4))
}
