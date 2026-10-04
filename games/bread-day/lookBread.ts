import type { Ctx } from './lookCut'
import { INK } from './lookInk'
import type { Bread } from './stuff'

// What the oven made, cut with the same tools as the raw stuff (lookStuff.ts
// hands them over as a kit, so this file draws and owns nothing). Gold is the
// oven's ink and appears nowhere else on the peel. A bread stays plain: a
// contour, its crust, and the two or three cuts that say which bread it is.
// - airy: a tall dome with three open scores, each its own length and height
// - the brick: squat, straight-edged, one straight crack
// - crumbly: a broken edge, torn cuts, crumbs beside it
// - a pancake: flat, with a rim line
// - dark: the same bread hatched over its lower two thirds, in a heavier contour
// - black: the key block itself, with thin gold cracks and a cleared rim

/** The painter's tools and scratch, lent for one frame. `spot` and `sweep` place marks by turn and distance (1 is the edge), so they ride a squash. */
export type Kit = {
  g: Ctx
  /** The place `spot` last found. */
  x: number
  y: number
  outer: number[]
  inner: number[]
  bend: number[]
  /** One fixed value from -1 to 1 per point: the hand's unevenness, the same every frame. */
  jag: readonly number[]
  /** Grains for a heap: turn, distance, size, lie. */
  grains: readonly (readonly number[])[]
  spot(turn: number, far: number): void
  sweep(from: number, to: number, far: number, count?: number): number[]
  /** Fills `outer` and `inner`: the cut edge, and the inside of a contour `thin` up and left to `thick` low and right. */
  edge(rag: number, thin: number, thick: number, pinched: boolean): void
  /** The cuts a finger left in a heap. */
  furrows(marks: readonly number[], fresh: number): void
  ink(colour: string): void
  print(): void
  lay(g: Ctx, p: readonly number[], round: boolean, m?: number): void
  line(g: Ctx, p: readonly number[], w: number, ends?: number, m?: number): void
  ring(g: Ctx, x: number, y: number, r: number, a: number, b: number, w: number, ends?: number): void
  chip(g: Ctx, x: number, y: number, r: number, turn: number): void
}

const TAU = Math.PI * 2
/** Scores across a risen loaf, in units of the loaf (0,0 its middle, 1 its edge): from, to, width. Three, slanted alike, no two the same. */
const SCORES = [[-0.58, 0.2, -0.38, -0.3, 7], [-0.2, 0.12, 0.08, -0.62, 10], [0.27, -0.04, 0.5, -0.44, 8]]
/** Where a brick cracked: one straight line from its top; a burnt one has a second, short. */
const CRACKS = [[-0.2, -0.96, 0.1, -0.1, 5], [0.42, 0.3, 0.62, -0.2, 3.4]]
/** Where a crumbly loaf broke: turn round the edge, and how deep the break runs. */
const BREAKS = [[0.1, 0.6], [0.44, 0.72], [0.69, 0.58]]
/** The lie of the hatching on a dark crust. */
const LIE = -0.42

/** One straight cut between two places given in units of the loaf. */
function slash(k: Kit, u0: number, v0: number, u1: number, v1: number, w: number, ends = 0.1): void {
  for (let i = 0; i < 3; i++) {
    const u = u0 + ((u1 - u0) * i) / 2, v = v0 + ((v1 - v0) * i) / 2
    k.spot(Math.atan2(v, u) / TAU, Math.hypot(u, v))
    k.bend[i * 2] = k.x; k.bend[i * 2 + 1] = k.y
  }
  k.line(k.g, k.bend, w, ends, 6)
}

/** Draws one bread on the outline the kit holds. `ry` is its resting half-height; the marks are the finger's, for a dent and for crumbs. */
export function paintBread(k: Kit, bread: Bread, ry: number, marks: readonly number[], fresh: number): void {
  const { g, outer, inner, jag } = k, { crumb, crust } = bread, black = crust === 'black', dark = crust === 'dark'
  // Burnt, the crust is the key block and its cuts show gold; otherwise the crust is gold and its cuts are the key block.
  const body = black ? INK.key : INK.gold, cut = black ? INK.gold : INK.key, thin = black ? 0.45 : 1, n = outer.length / 2
  const press = fresh < 0 ? 0 : marks[fresh * 4 + 2]

  if (crumb === 'dust') {
    // Toasted flour is still a heap of dust: no contour, an edge of grains.
    // Burnt, it gets the cleared rim every dark thing in the print has, or it is lost against the dark.
    if (black) { k.edge(2, -2.4, -3.4, false); k.ink(INK.paper); k.lay(g, inner, false); k.print() }
    k.edge(2, 0, 0, false)
    k.ink(body); k.lay(g, outer, false); k.print()
    k.ink(cut)
    k.grains.forEach(([turn, far, size, lie], i) => { if (dark || i % 2 === 0) { k.spot(turn, far); k.chip(g, k.x, k.y, size * (dark ? 1.5 : 1.1), lie) } })
    for (let i = 0; i < n; i++) if (jag[(i * 7) % 96] < (outer[i * 2 + 1] > 0 ? 0.5 : -0.3)) k.chip(g, outer[i * 2] + jag[i + 13] * 1.5, outer[i * 2 + 1] + jag[i + 31] * 1.5, 2 + Math.max(0, outer[i * 2 + 1] / ry) * 2, i)
    k.furrows(marks, fresh)
    k.print()
    return
  }

  const flat = crumb === 'pancake', brick = crumb === 'dense', rough = crumb === 'crumbly', round = !brick && !rough, heavy = dark ? 1.45 : 1
  if (black) {
    k.edge(rough ? 3 : 0.5, -2.2, -3.4, false)
    k.ink(INK.paper); k.lay(g, inner, round); k.print()
  }
  k.edge(rough ? 3 : brick ? 0.3 : 0.5, (flat ? 2 : 3) * heavy, (flat ? 5 : 9.5) * heavy, false)
  k.ink(INK.key); k.lay(g, outer, round); k.print()
  if (!black) { k.ink(INK.gold); k.lay(g, inner, round); k.print() }

  k.ink(cut)
  if (dark) {
    // A darker bake is more of the block left standing: close hatching from a third of the way down, heavier low and right.
    const c = Math.cos(LIE), s = Math.sin(LIE)
    for (let i = 0; i < 9; i++) {
      const d = -0.3 + i * 0.145, half = 0.84 * Math.sqrt(1 - d * d) * (0.86 + 0.14 * jag[i + 50]), slip = 0.05 * jag[i + 60]
      slash(k, -d * s - (half - slip) * c, d * c - (half - slip) * s, -d * s + (half + slip) * c, d * c + (half + slip) * s, flat ? 2.6 : 3.6, 0.2)
    }
  }
  if (flat) {
    // The rim that browned first: a line just inside the edge, open in two places.
    k.line(g, k.sweep(0.04, 0.46, 0.76, 12), 2.8 * thin + 0.6); k.line(g, k.sweep(0.56, 0.97, 0.76, 12), 2.4 * thin + 0.6)
  } else if (brick) {
    for (let i = 0; i < (black ? 2 : 1); i++) slash(k, CRACKS[i][0], CRACKS[i][1], CRACKS[i][2], CRACKS[i][3], CRACKS[i][4] * (black ? 0.6 : 1), 0.05)
  } else if (rough) {
    for (const [turn, deep] of BREAKS) {
      k.spot(turn - 0.016, 0.97); g.moveTo(k.x, k.y); k.spot(turn + 0.018, 0.97); g.lineTo(k.x, k.y); k.spot(turn + 0.012, deep + (black ? 0.14 : 0)); g.lineTo(k.x, k.y); g.closePath()
    }
  } else {
    if (black) for (const [u0, v0, u1, v1, w] of SCORES) slash(k, u0, v0, u1, v1, w * thin)
    // It squashes under the finger: one carved crescent on the far side of the fingertip, shorter as the loaf springs back.
    if (press > 0) k.ring(g, marks[fresh * 4], marks[fresh * 4 + 1] + 4, 23, 0.75 - 0.2 * press, 0.75 + 0.2 * press, 4.2, 0.05)
  }
  k.print()

  if (round && !flat && !black) {
    // The scores opened in the oven: the crust is cut away there, and the paper shows.
    k.ink(INK.paper)
    for (const [u0, v0, u1, v1, w] of SCORES) slash(k, u0, v0, u1, v1, w)
    k.print()
  }
  if (rough && press > 0) {
    // A push sheds crumbs: a few chips fall beside the loaf on the side that was pushed, and are gone when the mark is.
    k.ink(body)
    for (let i = 0; i <= fresh; i++) {
      const life = marks[i * 4 + 2], right = marks[i * 4] >= 0
      for (let j = 0; j < 2; j++) {
        k.spot((right ? 0.07 : 0.43) + 0.06 * jag[i * 2 + j], 1.1 + 0.1 * (1 + jag[i * 2 + j + 40]))
        k.chip(g, k.x, k.y + (1 - life) * 9, (2.4 + 1.6 * (1 + jag[i + j + 70])) * Math.min(1, life * 3), i + j)
      }
    }
    k.print()
  }
}
