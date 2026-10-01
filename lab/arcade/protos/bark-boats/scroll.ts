// The painting itself: one long sheet, painted once in strips and scrolled
// under the boat. The order is a watercolourist's: pencil first, then the big
// wet washes (sky, hills, meadow, water, bank), then what stands on them,
// then the evening glazed over the downstream end. Long washes are sampled at
// fixed world positions and every separate thing has its own seed, so a wash
// or a tree that crosses from one strip to the next meets itself exactly.

import { TAU } from '../../kit/math.ts'
import { PAPER, makeCanvas, mix, oval, place, rgb, rng, roughen } from './paint.ts'
import type { Box, G, Pt, Rand, Wash } from './paint.ts'
import { DROP, LEN, LIP_FAR, LIP_NEAR, SHEET_H, STONE, VIEW_W, farEdge, meadowTop, nearEdge, ridge, sstep } from './world.ts'

interface Feature {
  z: number
  x0: number
  x1: number
  seed: number
  paint(g: G, r: Rand): void
}

export interface Scroll {
  // Paint a little more of the sheet, for about this many milliseconds;
  // false when it is finished.
  work(ms: number): boolean
  // Draw the strips under this view (finishing them first if need be).
  draw(g: G, camX: number, camY: number): void
}

// A steady hand-tremor along x: the same wherever it is sampled from.
function nz(x: number, s: number): number {
  return Math.sin(x * 0.071 + s) * 0.5 + Math.sin(x * 0.173 + s * 1.7) * 0.3 + Math.sin(x * 0.393 + s * 2.3) * 0.2
}

// A long wash between two lines, sampled at fixed places. Each one stops a
// little short of the ends of the paper, at its own ragged distance.
function band(x0: number, x1: number, top: (x: number) => number, bot: (x: number) => number, k: number, step = 34, from = 0, to = LEN): Pt[] {
  const lo = Math.max(from, 12 + 13 * (0.5 + 0.5 * Math.sin(k * 12.9898)))
  const hi = Math.min(to, LEN - 12 - 13 * (0.5 + 0.5 * Math.sin(k * 78.233)))
  const a = Math.floor((x0 - 120) / step) * step
  const b = Math.ceil((x1 + 120) / step) * step
  const xs: number[] = []
  for (let x = a; x <= b; x += step) {
    const c = Math.min(hi, Math.max(lo, x))
    if (xs.length === 0 || c > xs[xs.length - 1]!) xs.push(c)
  }
  if (xs.length < 2) return []
  const pts: Pt[] = []
  for (const x of xs) pts.push([x, top(x)])
  for (let i = xs.length - 1; i >= 0; i--) pts.push([xs[i]!, bot(xs[i]!)])
  return pts
}

function ramp(g: G, stops: readonly [number, string][]): CanvasGradient {
  const gr = g.createLinearGradient(0, 0, LEN, 0)
  for (const [x, c] of stops) gr.addColorStop(Math.min(1, Math.max(0, x / LEN)), c)
  return gr
}

// ---------------------------------------------------------------- evening

// The evening, glazed over the land downstream: first warm, then blue-violet.
// [x, r, g, b, strength]
const GLAZE: readonly [number, number, number, number, number][] = [
  [0, 250, 214, 160, 0],
  [2700, 250, 214, 160, 0],
  [3450, 248, 196, 140, 0.5],
  [3950, 176, 150, 190, 0.7],
  [4500, 132, 132, 198, 0.86],
  [LEN, 124, 126, 196, 0.88],
]

// What stands up against the sky is painted after the glaze, in colours
// already mixed with the evening at the place it stands.
type Tone = (c: string) => string
function toneAt(x: number, strength = 0.8): Tone {
  let k = 1
  while (k < GLAZE.length - 1 && GLAZE[k]![0] < x) k++
  const p = GLAZE[k - 1]!
  const q = GLAZE[k]!
  const u = Math.min(1, Math.max(0, (x - p[0]) / (q[0] - p[0])))
  const a = (p[4] + (q[4] - p[4]) * u) * strength
  if (a < 0.004) return (c) => c
  // Mix the two stops the way the canvas does: premultiplied.
  const w0 = p[4] * (1 - u)
  const w1 = q[4] * u
  const m = [0, 1, 2].map((i) => (p[i + 1]! * w0 + q[i + 1]! * w1) / (w0 + w1)) as [number, number, number]
  return (c) => {
    const v = rgb(c)
    return toHex(v[0] * (1 - a * (1 - m[0] / 255)), v[1] * (1 - a * (1 - m[1] / 255)), v[2] * (1 - a * (1 - m[2] / 255)))
  }
}
function toHex(r: number, g: number, b: number): string {
  const q = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${((1 << 24) | (q(r) << 16) | (q(g) << 8) | q(b)).toString(16).slice(1)}`
}

// ---------------------------------------------------------------- things

// A lobed outline: an oval whose edge swells and dips, like a tree's crown.
function lumpy(r: Rand, cx: number, cy: number, rx: number, ry: number, n: number, bump: number): Pt[] {
  const pts: Pt[] = []
  const ph = r() * TAU
  for (let i = 0; i < n; i++) {
    const a = ph + (i / n) * TAU
    const k = 1 + (i % 2 === 0 ? 1 : -1) * bump * (0.4 + r() * 0.9)
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return pts
}

// A hummock: flat along the bottom, lobed over the top.
function hummock(r: Rand, x: number, y: number, w: number, h: number): Pt[] {
  const pts: Pt[] = [
    [x - w / 2, y],
    [x - w * 0.15, y + 2],
    [x + w * 0.2, y + 1],
    [x + w / 2, y],
  ]
  const n = Math.max(3, Math.round(w / 34))
  for (let i = 0; i < n; i++) {
    const t = 1 - (i + 0.5) / n
    const lift = Math.sin(Math.PI * t) ** 0.7
    pts.push([x - w / 2 + w * t + (r() - 0.5) * 8, y - h * lift * (0.62 + r() * 0.5) - 4])
  }
  return pts
}

function trunk(box: Box, g: G, r: Rand, x: number, base: number, top: number, w: number, lean: number, color: string, t: Tone): void {
  const l: Pt[] = []
  const rr: Pt[] = []
  const N = 6
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const cx = x + lean * u * u
    const y = base + (top - base) * u
    const hw = (w / 2) * (1 - u * 0.62) + (i === 0 ? w * 0.3 : 0)
    l.push([cx - hw, y])
    rr.unshift([cx + hw, y])
  }
  const pts = l.concat(rr)
  box.lift(g, r, pts, 0.85, 0, t(PAPER))
  box.pencil(g, r, l, { a: 0.55 })
  box.pencil(g, r, rr, { a: 0.45 })
  box.wash(g, r, pts, { color: t(color), a: 0.8, pool: 0.7, mottle: 0.6, rough: 1.2, step: 16, fade: [Math.PI, 0.45] })
}

// cols: the leaf green, a sunlit yellow-green, a deep shadow green.
function crown(box: Box, g: G, r: Rand, cx: number, cy: number, rad: number, cols: readonly string[], t: Tone, strength = 1): void {
  const outline = lumpy(r, cx, cy, rad * 1.05, rad * 0.9, 16, 0.1)
  // Paper kept clear for the crown, then the under-drawing: a loose loop or
  // two that the paint will not follow.
  box.lift(g, r, lumpy(r, cx, cy, rad * 0.94, rad * 0.8, 12, 0.1), 0.86, 1.5, t(PAPER))
  box.pencil(g, r, oval(cx + r() * 8 - 4, cy + r() * 6 - 3, rad * 1.0, rad * 0.86, 10, r() * TAU), { closed: true, a: 0.4, jit: rad * 0.08, step: rad * 0.6 })
  const holes = [oval(cx + (r() - 0.5) * rad * 0.9, cy + (r() - 0.2) * rad * 0.6, rad * 0.1, rad * 0.07, 6, r() * TAU), oval(cx + (r() - 0.5) * rad, cy + (r() - 0.6) * rad * 0.7, rad * 0.08, rad * 0.05, 6, r() * TAU)]
  box.wash(g, r, outline, {
    color: t(cols[0]!),
    a: strength,
    pool: 0.8,
    mottle: 0.6,
    grain: 0.5,
    rough: rad * 0.05,
    step: rad * 0.3,
    lost: 1,
    holes,
    fade: [-2.2, 0.22],
    charge: [
      { color: t(cols[2]!), n: 4, size: rad * 0.42, a: 0.9 },
      { color: t(cols[1]!), n: 3, size: rad * 0.4, a: 0.9 },
    ],
  })
  // Shade under the crown, laid over once the first wash was dry.
  box.wash(g, r, lumpy(r, cx + rad * 0.16, cy + rad * 0.36, rad * 0.74, rad * 0.44, 9, 0.15), { color: t(cols[2]!), a: 0.62 * strength, pool: 0.5, mottle: 0.6, rough: 3, lost: 2 })
  // A few leaves flicked off the edge.
  for (let i = 0; i < 7; i++) {
    const a = r() * TAU
    const d = rad * (1.02 + r() * 0.22)
    const s = 3 + r() * 5
    box.wash(g, r, oval(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.86, s * 1.3, s, 6, r() * TAU), { color: t(cols[i % 2 === 0 ? 0 : 2]!), a: 0.8, pool: 0.7, mottle: 0, grain: 0.2, rough: 1, step: 5 })
  }
}

function roundTree(box: Box, g: G, r: Rand, x: number, base: number, h: number, cols: readonly string[], t: Tone): void {
  const rad = h * 0.36
  box.wash(g, r, oval(x + rad * 0.34, base + 3, rad * 0.95, 8, 9), { color: t('#7f9a78'), a: 0.4, soft: 5, mottle: 0.3, pool: 0, rough: 2 })
  trunk(box, g, r, x, base, base - h * 0.62, h * 0.085, (r() - 0.5) * 16, '#a88566', t)
  box.pencil(g, r, [[x, base - h * 0.5], [x - rad * 0.4, base - h * 0.72]], { a: 0.4, passes: 1 })
  box.pencil(g, r, [[x + 2, base - h * 0.52], [x + rad * 0.45, base - h * 0.78]], { a: 0.4, passes: 1 })
  crown(box, g, r, x + (r() - 0.5) * 10, base - h * 0.68, rad, cols, t)
}

function birch(box: Box, g: G, r: Rand, x: number, base: number, h: number, t: Tone): void {
  const lean = (r() - 0.5) * 34
  const w = 11 + r() * 4
  const l: Pt[] = []
  const rr: Pt[] = []
  const N = 7
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const cx = x + lean * u * u
    const y = base - h * u
    const hw = (w / 2) * (1 - u * 0.6)
    l.push([cx - hw, y])
    rr.unshift([cx + hw, y])
  }
  // The trunk is paper kept white, with a grey shadow down one side.
  box.lift(g, r, l.concat(rr), 0.96, 0, t(PAPER))
  box.wash(g, r, rr.concat(rr.map(([px, py]) => [px - w * 0.4, py] as Pt).reverse()), { color: t('#aaa6bd'), a: 0.6, pool: 0.3, rough: 0.8, mottle: 0.4 })
  box.pencil(g, r, l, { a: 0.6 })
  box.pencil(g, r, rr, { a: 0.55 })
  for (let i = 0; i < 9; i++) {
    const u = 0.05 + r() * 0.8
    const cx = x + lean * u * u
    const y = base - h * u
    const hw = (w / 2) * (1 - u * 0.6)
    box.pencil(g, r, [[cx - hw + r() * 2, y], [cx - hw + 3 + r() * hw, y + (r() - 0.5) * 2]], { a: 0.8, w: 1.9, passes: 1, jit: 0.3 })
  }
  // Twigs and a loose veil of leaves.
  const tx = x + lean
  const ty = base - h
  const cols = ['#cfdc6c', '#b2d064', '#e2df78']
  for (let i = 0; i < 4; i++) {
    const u = 0.55 + i * 0.1
    const sx = x + lean * u * u
    const sy = base - h * u
    const dir = i % 2 === 0 ? -1 : 1
    box.pencil(g, r, [[sx, sy], [sx + dir * (18 + r() * 14), sy - 22 - r() * 10], [sx + dir * (34 + r() * 18), sy - 20 + r() * 16]], { a: 0.45, passes: 1 })
  }
  const n = 5 + Math.floor(r() * 3)
  for (let i = 0; i < n; i++) {
    const a = r() * TAU
    const d = h * (0.06 + r() * 0.2)
    const br = h * (0.075 + r() * 0.07)
    const leafy = lumpy(r, tx + Math.cos(a) * d * 1.2, ty + h * 0.2 + Math.sin(a) * d, br * (1 + r() * 0.5), br * (0.7 + r() * 0.3), 9, 0.2)
    box.wash(g, r, leafy, {
      color: t(cols[i % 3]!),
      a: 0.8,
      pool: 0.7,
      mottle: 0.6,
      rough: 2,
      step: 9,
      lost: 1,
      charge: [{ color: t('#93bd62'), n: 1, size: br * 0.5, a: 0.7 }],
    })
  }
  box.splatter(g, r, tx, ty + h * 0.22, h * 0.42, 24, t('#a9c655'), 0.6, 2.6)
}

function bush(box: Box, g: G, r: Rand, x: number, y: number, rad: number, cols: readonly string[], t: Tone): void {
  const pts = hummock(r, x, y, rad * 2.3, rad * 1.25)
  box.lift(g, r, pts, 0.85, 2, t(PAPER))
  box.pencil(g, r, oval(x, y - rad * 0.5, rad * 1.1, rad * 0.7, 9, 0, Math.PI, TAU), { a: 0.36, jit: 3 })
  box.wash(g, r, pts, {
    color: t(cols[0]!),
    a: 0.95,
    pool: 0.75,
    mottle: 0.6,
    rough: 2.5,
    step: 14,
    fade: [-2, 0.25],
    charge: [
      { color: t(cols[2]!), n: 2, size: rad * 0.5, a: 0.85 },
      { color: t(cols[1]!), n: 2, size: rad * 0.5, a: 0.8 },
    ],
  })
  box.splatter(g, r, x, y - rad * 0.6, rad * 1.5, 9, t(cols[0]!), 0.55)
}

const DAY: Tone = (c) => c

function rock(box: Box, g: G, r: Rand, x: number, y: number, w: number, h: number, moss = 0.5, t: Tone = DAY): void {
  // Sits on y: a lump with a flattish foot, lit from the upper left.
  const pts: Pt[] = []
  const n = 8
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (Math.PI * i) / (n - 1)
    const k = 0.84 + r() * 0.32
    pts.push([x + Math.cos(a) * (w / 2) * k, y + Math.sin(a) * h * k])
  }
  pts.push([x + w * 0.36, y + h * 0.1], [x - w * 0.32, y + h * 0.12])
  box.lift(g, r, pts, 0.94, 0, t(PAPER))
  box.pencil(g, r, pts, { closed: true, a: 0.55, jit: 1.6 })
  const warm = r() < 0.5
  box.wash(g, r, pts, {
    color: t(warm ? '#c4b8b4' : '#b6b0ca'),
    a: 0.72,
    pool: 0.7,
    mottle: 0.8,
    grain: 0.9,
    rough: 2,
    step: 18,
    fade: [-2.3, 0.6],
    charge: [{ color: t('#d8c092'), n: 2, size: w * 0.18, a: 0.6 }],
  })
  // The side turned from the light: a second, cooler wash over the first.
  const facet: Pt[] = [
    [x + w * 0.06, y - h * 0.9],
    [x + w * 0.34, y - h * 0.7],
    [x + w * 0.48, y - h * 0.2],
    [x + w * 0.36, y + h * 0.1],
    [x - w * 0.04, y + h * 0.1],
    [x + w * 0.12, y - h * 0.36],
  ]
  box.wash(g, r, facet, { color: t('#8e88b2'), a: 0.6, pool: 0.6, mottle: 0.7, grain: 0.7, rough: 2.5, step: 16, lost: 1 })
  box.pencil(g, r, [[x + w * 0.06, y - h * 0.9], [x + w * 0.12, y - h * 0.36], [x - w * 0.04, y + h * 0.08]], { a: 0.45, passes: 1, jit: 1.5 })
  if (w > 60) box.pencil(g, r, [[x - w * 0.3, y - h * 0.4], [x - w * 0.14, y - h * 0.3], [x - w * 0.1, y - h * 0.1]], { a: 0.38, passes: 1, jit: 1.2 })
  if (r() < moss) box.wash(g, r, oval(x - w * 0.12 + r() * w * 0.16, y - h * 0.86, w * 0.26, h * 0.16, 8), { color: t('#a3c160'), a: 0.85, pool: 0.5, rough: 2, lost: 1 })
  for (let i = 0; i < 4; i++) {
    const hx = x + w * (0.16 + i * 0.07)
    box.pencil(g, r, [[hx, y - h * (0.46 - i * 0.08)], [hx + w * 0.07, y - h * 0.06]], { a: 0.4, passes: 1 })
  }
}

function tuft(box: Box, g: G, r: Rand, x: number, y: number, s: number, color: string): void {
  const n = 5 + Math.floor(r() * 4)
  for (let i = 0; i < n; i++) {
    const dx = (i - n / 2) * 4.5 * s + (r() - 0.5) * 4
    const h = (16 + r() * 20) * s
    const lean = dx * 0.9 + (r() - 0.5) * 8
    const blade: Pt[] = [
      [x + dx * 0.4, y],
      [x + dx * 0.4 + lean * 0.4, y - h * 0.6],
      [x + dx * 0.4 + lean, y - h],
    ]
    if (i % 2 === 0) box.pencil(g, r, blade, { a: 0.45, passes: 1, jit: 0.7 })
    box.dry(g, r, blade, 2.8 * s, color, 0.8)
  }
}

function flowers(box: Box, g: G, r: Rand, x: number, y: number, spread: number, n: number, color: string): void {
  for (let i = 0; i < n; i++) {
    const fx = x + (r() - 0.5) * spread
    const fy = y + (r() - 0.5) * spread * 0.4
    const h = 10 + r() * 14
    box.pencil(g, r, [[fx + (r() - 0.5) * 4, fy + h], [fx, fy]], { a: 0.45, passes: 1, jit: 0.6 })
    const s = 3.6 + r() * 3
    if (color === 'white') {
      box.lift(g, r, oval(fx, fy, s * 1.2, s, 7), 0.95)
      box.pencil(g, r, oval(fx, fy, s * 1.2, s, 7), { closed: true, a: 0.3, passes: 1, jit: 0.5 })
      box.wash(g, r, oval(fx, fy, s * 0.4, s * 0.4, 5), { color: '#e9b93c', a: 0.95, pool: 0.4, rough: 0.4, mottle: 0, grain: 0 })
    } else {
      box.wash(g, r, oval(fx, fy, s * 1.25, s, 7, r() * TAU), { color, a: 0.9, pool: 0.8, mottle: 0.4, rough: 1, step: 5, grain: 0.2 })
    }
  }
}

function dock(box: Box, g: G, r: Rand, x: number, y: number, s: number): void {
  // Three broad leaves fanning from one root.
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * 0.62 + (r() - 0.5) * 0.2
    const len = (44 + r() * 20) * s
    const leaf: Pt[] = [
      [0, 0],
      [len * 0.35, -len * 0.2],
      [len * 0.8, -len * 0.1],
      [len, 0],
      [len * 0.75, len * 0.12],
      [len * 0.3, len * 0.18],
    ]
    const p = place(leaf, x, y, a)
    box.pencil(g, r, p, { closed: true, a: 0.4, jit: 1 })
    box.wash(g, r, p, { color: i === 1 ? '#8fba63' : '#a6c868', a: 0.8, pool: 0.75, mottle: 0.5, rough: 1.5, step: 12, fade: [a, 0.4] })
    box.pencil(g, r, [[x, y], [x + Math.cos(a) * len * 0.9, y + Math.sin(a) * len * 0.9]], { a: 0.36, passes: 1 })
  }
}

function reedsPainted(box: Box, g: G, r: Rand, x: number, y: number, n: number, h: number): void {
  for (let i = 0; i < n; i++) {
    const bx = x + (r() - 0.5) * n * 9
    const hh = h * (0.6 + r() * 0.5)
    const lean = (r() - 0.5) * 22
    const stalk: Pt[] = [
      [bx, y],
      [bx + lean * 0.3, y - hh * 0.5],
      [bx + lean, y - hh],
    ]
    box.dry(g, r, stalk, 2.6, '#7f9d55', 0.8)
    if (r() < 0.45) box.wash(g, r, oval(bx + lean, y - hh - 6, 3.4, 10, 7, lean * 0.02), { color: '#8a5f42', a: 0.9, pool: 0.6, rough: 0.6, step: 5 })
    if (i % 3 === 0) box.pencil(g, r, stalk, { a: 0.42, passes: 1, jit: 0.6 })
  }
}

// ---------------------------------------------------------------- features

function buildFeatures(box: Box): Feature[] {
  const fr = rng(4242)
  const list: Feature[] = []
  let seed = 100
  const add = (z: number, x: number, half: number, paint: (g: G, r: Rand) => void) => {
    list.push({ z, x0: x - half, x1: x + half, seed: seed++ * 7919, paint })
  }
  // [leaf green, sunlit, shadow]
  const greens = [
    ['#84bb5c', '#d8e070', '#4f8f62'],
    ['#93c058', '#e0e074', '#5a9a68'],
    ['#7cb46c', '#cbdc6c', '#4b8a70'],
  ] as const

  // Rolling green hills in front of the far blue ones: each its own wash,
  // darker where two overlap.
  for (let x = -100; x < LEN + 200; x += 300 + fr() * 260) {
    const hx = x
    const w = 300 + fr() * 240
    const h = 22 + fr() * 26
    const col = fr() < 0.5 ? '#b3d19a' : '#c5d892'
    add(15, hx, w, (g, r) => {
      const pts: Pt[] = []
      const lo = Math.max(18, hx - w)
      const hi = Math.min(LEN - 18, hx + w)
      if (hi - lo < 60) return
      const N = 14
      for (let i = 0; i <= N; i++) {
        const px = lo + ((hi - lo) * i) / N
        const u = (px - hx) / w
        pts.push([px, meadowTop(px) - h * Math.cos((Math.PI / 2) * u) ** 2 + 2])
      }
      box.pencil(g, r, pts.map(([px, py]) => [px, py - 3] as Pt), { a: 0.36, jit: 1.5 })
      for (let i = N; i >= 0; i--) {
        const px = lo + ((hi - lo) * i) / N
        pts.push([px, meadowTop(px) + 5])
      }
      box.lift(g, r, pts, 0.4, 2)
      box.wash(g, r, pts, { color: col, a: 0.7, pool: 0.7, mottle: 0.6, grain: 0.45, rough: 1.5, step: 40, charge: [{ color: '#9fc6a4', n: 2, size: w * 0.2, a: 0.5 }] })
    })
  }

  // Woods on the far hills: soft blue blots laid into the hill wash.
  for (let x = 120; x < LEN - 100; x += 210 + fr() * 300) {
    const wx = x
    const ww = 70 + fr() * 110
    const up = fr()
    add(12, wx, ww + 30, (g, r) => {
      const top = ridge(wx)
      const span = Math.max(20, meadowTop(wx) - top - 26)
      const y = top + 16 + up * span * 0.5
      box.wash(g, r, hummock(r, wx, y + 12, ww * 2, 20 + r() * 12), { color: r() < 0.5 ? '#8ea6cc' : '#9ab4c4', a: 0.36, soft: 6, mottle: 0.5, pool: 0, rough: 3, step: 14 })
    })
  }

  // The far tree line: small copses along the top of the meadow, blue with
  // distance, each tree a dab on a pencil stalk.
  for (let x = 40; x < LEN - 40; x += 120 + fr() * 220) {
    const cx = x
    const n = 2 + Math.floor(fr() * 4)
    const col = greens[Math.floor(fr() * 3)]!
    add(20, cx, 120, (g, r) => {
      for (let i = 0; i < n; i++) {
        const tx = cx + (i - (n - 1) / 2) * 26 + (r() - 0.5) * 12
        const rad = 11 + r() * 12
        const base = meadowTop(tx) + 4
        const ty = base - rad * 1.25 - r() * 6
        box.pencil(g, r, [[tx, ty + rad * 0.4], [tx + (r() - 0.5) * 3, base]], { a: 0.5, passes: 1 })
        const dab = lumpy(r, tx, ty, rad * 1.08, rad * 0.94, 10, 0.09)
        box.lift(g, r, dab, 0.72, 1.5)
        box.wash(g, r, dab, {
          color: mix(col[0], '#7fa9ac', 0.42),
          a: 0.86,
          pool: 0.75,
          mottle: 0.5,
          rough: 1.5,
          step: 8,
          fade: [-2.2, 0.3],
          charge: [{ color: mix(col[2], '#567f96', 0.4), n: 1, size: rad * 0.6, a: 0.8 }],
        })
      }
    })
  }

  // The far bank: birches, round trees, bushes and stones, left to right.
  // These stand against the sky, so they are painted after the evening glaze
  // in colours that already carry it.
  const far = (x: number, back: number) => farEdge(x) - back
  const tall = (x: number, half: number, paint: (g: G, r: Rand, t: Tone) => void, strength = 0.8) => add(92, x, half, (g, r) => paint(g, r, toneAt(x, strength)))
  tall(150, 170, (g, r, t) => {
    birch(box, g, r, 118, far(118, 34), 268, t)
    birch(box, g, r, 192, far(192, 52), 216, t)
  })
  tall(372, 80, (g, r, t) => bush(box, g, r, 372, far(372, 14), 30, greens[1], t))
  tall(742, 150, (g, r, t) => roundTree(box, g, r, 742, far(742, 40), 236, greens[0], t))
  tall(1090, 120, (g, r, t) => birch(box, g, r, 1090, far(1090, 30), 240, t))
  let kind = 0
  for (let x = 1380; x < 3700; x += 250 + fr() * 190) {
    const tx = x
    const k = kind++ % 4
    const back = 22 + fr() * 36
    // Nothing downstream stands so tall that it would cross the sun.
    const h = Math.min(172 + fr() * 44, far(tx, back) - 206)
    if (Math.abs(tx - 3400) < 170) continue
    if (k === 0) tall(tx, 170, (g, r, t) => roundTree(box, g, r, tx, far(tx, back), h, greens[Math.floor(r() * 3)]!, t))
    else if (k === 1)
      tall(tx, 150, (g, r, t) => {
        birch(box, g, r, tx, far(tx, back), h, t)
        if (r() < 0.6) birch(box, g, r, tx + 58, far(tx + 58, back + 16), h - 34, t)
      })
    else if (k === 2)
      tall(tx, 110, (g, r, t) => {
        bush(box, g, r, tx, far(tx, 14), 30 + r() * 12, greens[1], t)
        bush(box, g, r, tx + 56, far(tx + 56, 22), 24, greens[2], t)
      })
    else
      tall(tx, 110, (g, r, t) => {
        rock(box, g, r, tx, far(tx, 8), 78, 34, 0.6, t)
      })
  }
  // The leaning tree whose branch the kingfisher sits on.
  tall(3390, 240, (g, r, t) => {
    const base = far(3360, 26)
    trunk(box, g, r, 3360, base, base - 130, 22, 40, '#a2805f', t)
    const branch: Pt[] = [
      [3392, base - 96],
      [3430, base - 62],
      [3478, base - 44],
      [3520, base - 52],
    ]
    box.dry(g, r, branch, 7, t('#9a785a'), 0.95)
    box.pencil(g, r, branch, { a: 0.55 })
    box.pencil(g, r, [[3478, base - 44], [3500, base - 24]], { a: 0.5 })
    crown(box, g, r, 3404, base - 164, 72, greens[2], t)
  })
  // Flowers and tufts in the far meadow.
  const blooms = ['#dd5a48', '#e9b93c', '#9a80cc', 'white'] as const
  for (let x = 60; x < LEN - 60; x += 70 + fr() * 120) {
    const fx = x
    const c = blooms[Math.floor(fr() * 4)]!
    const u = fr()
    if (fx > LIP_FAR.x - 80 && fx < LIP_FAR.x + 170) continue
    add(25, fx, 70, (g, r) => {
      const y = meadowTop(fx) + 26 + u * (farEdge(fx) - meadowTop(fx) - 48)
      flowers(box, g, r, fx, y, 46, 3 + Math.floor(r() * 4), c)
    })
  }
  for (let x = 30; x < LEN - 30; x += 60 + fr() * 90) {
    const fx = x
    if (fx > LIP_FAR.x - 100 && fx < LIP_FAR.x + 150) continue
    add(52, fx, 50, (g, r) => tuft(box, g, r, fx, farEdge(fx) + 3, 0.85, '#7ea458'))
  }

  // The mound of the bank: its shading, the flat stone, the toadstool.
  add(70, 590, 620, (g, r) => {
    box.wash(g, r, oval(140, 800, 300, 110, 12), { color: '#8fb565', a: 0.5, soft: 36, mottle: 0.5, pool: 0, rough: 6 })
    box.wash(g, r, oval(1040, 815, 280, 100, 12), { color: '#8fb565', a: 0.46, soft: 36, mottle: 0.5, pool: 0, rough: 6 })
    box.wash(g, r, oval(600, 596, 400, 22, 12), { color: '#ece58c', a: 0.5, soft: 14, mottle: 0.4, pool: 0, rough: 4 })
    for (let i = 0; i < 30; i++) {
      const mx = 60 + r() * 1060
      const my = nearEdge(mx) + 30 + r() * 220
      box.splatter(g, r, mx, my, 30, 10, r() < 0.5 ? '#86ab52' : '#a8bd5c', 0.5, 2.4)
    }
    for (let i = 0; i < 16; i++) {
      const mx = 50 + r() * 1080
      const my = nearEdge(mx) + 40 + r() * 210
      const sz = 0.55 + r() * 0.3
      if (Math.abs(mx - STONE.x) < 190 && Math.abs(my - STONE.y - 10) < 50) continue
      tuft(box, g, r, mx, my, sz, '#8fb158')
    }
  })
  add(72, STONE.x, 210, (g, r) => {
    const cx = STONE.x
    const cy = STONE.y
    const top = oval(cx, cy, 154, 25, 16)
    const side: Pt[] = oval(cx, cy, 154, 25, 12, 0, 0, Math.PI).concat(oval(cx, cy + 27, 150, 24, 12, 0, Math.PI, 0))
    box.wash(g, r, oval(cx + 14, cy + 40, 176, 22, 12), { color: '#6f8f66', a: 0.5, soft: 7, mottle: 0.4, pool: 0, rough: 3 })
    box.lift(g, r, top.concat([]), 0.9)
    box.pencil(g, r, side, { closed: true, a: 0.55, jit: 1.4 })
    box.wash(g, r, side, { color: '#a199b8', a: 0.74, pool: 0.75, mottle: 0.8, grain: 0.9, rough: 1.6, fade: [Math.PI, 0.5], charge: [{ color: '#7d7699', n: 3, size: 36, a: 0.7 }] })
    box.pencil(g, r, top, { closed: true, a: 0.6, jit: 1.5 })
    box.wash(g, r, top, {
      color: '#d2ccd9',
      a: 0.62,
      pool: 0.6,
      mottle: 0.9,
      grain: 0.9,
      rough: 1.6,
      fade: [-2.6, 0.7],
      charge: [
        { color: '#e2cfa6', n: 3, size: 46, a: 0.7 },
        { color: '#aaa4c2', n: 2, size: 40, a: 0.6 },
      ],
    })
    box.pencil(g, r, [[cx - 60, cy - 6], [cx - 20, cy + 3], [cx + 6, cy - 2]], { a: 0.45, passes: 1 })
    box.pencil(g, r, [[cx + 62, cy + 8], [cx + 96, cy + 2]], { a: 0.45, passes: 1 })
    for (let i = 0; i < 7; i++) box.pencil(g, r, [[cx - 120 + i * 14, cy + 22 + i * 1.4], [cx - 112 + i * 14, cy + 40 + i * 1.2]], { a: 0.36, passes: 1 })
    box.splatter(g, r, cx + 90, cy + 2, 30, 9, '#d9c15a', 0.75, 2.2)
    box.wash(g, r, oval(cx - 128, cy + 30, 34, 13, 8), { color: '#9fc05e', a: 0.8, pool: 0.4, rough: 2, lost: 1 })
    box.wash(g, r, oval(cx + 140, cy + 36, 28, 11, 8), { color: '#93b85c', a: 0.8, pool: 0.4, rough: 2, lost: 1 })
    tuft(box, g, r, cx - 164, cy + 40, 1, '#7ea458')
    tuft(box, g, r, cx + 170, cy + 44, 0.9, '#7ea458')
  })
  add(71, 446, 70, (g, r) => {
    const toad = (x: number, y: number, s: number) => {
      const stem: Pt[] = [
        [x - 7 * s, y],
        [x - 5 * s, y - 30 * s],
        [x + 5 * s, y - 30 * s],
        [x + 8 * s, y],
      ]
      box.lift(g, r, stem, 0.95)
      box.wash(g, r, stem, { color: '#e6d5a8', a: 0.6, pool: 0.6, rough: 0.8, mottle: 0.4 })
      box.pencil(g, r, stem, { a: 0.55 })
      const cap = oval(x, y - 30 * s, 30 * s, 23 * s, 9, 0, Math.PI, TAU).concat([[x + 26 * s, y - 25 * s], [x - 26 * s, y - 25 * s]])
      box.lift(g, r, cap, 0.95)
      const spots = [oval(x - 13 * s, y - 40 * s, 4.6 * s, 3.6 * s, 6), oval(x + 3 * s, y - 46 * s, 5 * s, 3.6 * s, 6), oval(x + 16 * s, y - 37 * s, 3.8 * s, 3 * s, 6), oval(x - 2 * s, y - 34 * s, 3 * s, 2.4 * s, 6)]
      box.wash(g, r, cap, { color: '#d8503a', a: 0.92, pool: 0.8, mottle: 0.5, rough: 1.2, step: 10, holes: spots, fade: [-2.4, 0.4] })
      box.pencil(g, r, cap, { closed: true, a: 0.55, jit: 1 })
    }
    box.wash(g, r, oval(452, 601, 40, 7, 8), { color: '#6f8f66', a: 0.45, soft: 4, pool: 0, mottle: 0.2 })
    toad(446, 598, 1)
    toad(412, 606, 0.6)
    tuft(box, g, r, 474, 602, 0.8, '#7ea458')
  })
  add(74, 70, 120, (g, r) => {
    dock(box, g, r, 62, 800, 1.5)
    tuft(box, g, r, 150, 804, 1.4, '#6f9850')
  })
  add(74, 1120, 110, (g, r) => {
    dock(box, g, r, 1128, 806, 1.4)
    tuft(box, g, r, 1040, 808, 1.3, '#6f9850')
    flowers(box, g, r, 1150, 690, 40, 4, '#9a80cc')
  })
  add(74, 40, 60, (g, r) => flowers(box, g, r, 46, 640, 44, 4, '#e9b93c'))

  // The near bank downstream: a low fringe of tufts, stones and flowers.
  for (let x = 1260; x < LEN - 40; x += 46 + fr() * 70) {
    const fx = x
    const pick = fr()
    if (fx > LIP_NEAR.x - 170 && fx < LIP_NEAR.x + 130) continue
    add(75, fx, 80, (g, r) => {
      const y = nearEdge(fx)
      if (pick < 0.5) tuft(box, g, r, fx, y + 12 + r() * 10, 1 + r() * 0.5, r() < 0.5 ? '#6f9850' : '#86aa56')
      else if (pick < 0.68) flowers(box, g, r, fx, y + 28, 50, 3 + Math.floor(r() * 3), blooms[Math.floor(r() * 4)]!)
      else if (pick < 0.82) rock(box, g, r, fx, y + 36, 50 + r() * 30, 18 + r() * 8, 0.7)
      else if (pick < 0.92) dock(box, g, r, fx, y + 46, 0.9)
      else reedsPainted(box, g, r, fx, y + 10, 6, 70)
    })
  }

  // The waterfall: a pale veil over the slanting lip, foam and mist where it
  // lands, and boulders at either end.
  add(60, (LIP_FAR.x + LIP_NEAR.x) / 2, 260, (g, r) => {
    const at = (u: number): Pt => [LIP_FAR.x + (LIP_NEAR.x - LIP_FAR.x) * u, LIP_FAR.y + (LIP_NEAR.y - LIP_FAR.y) * u]
    const quad: Pt[] = [at(0), at(1), [at(1)[0] + 5, at(1)[1] + DROP], [at(0)[0] + 5, at(0)[1] + DROP]]
    box.wash(g, r, quad, { color: '#c4e2ee', a: 0.5, pool: 0.2, mottle: 0.9, rough: 3, step: 30 })
    // Blue let down the face in long uneven strokes, paper left between.
    for (let i = 0; i < 30; i++) {
      const [x, y] = at((i + r()) / 30)
      const from = r() * 26
      const len = DROP * (0.34 + r() * 0.66)
      const st: Pt[] = [
        [x, y + from],
        [x + 1.5 + (r() - 0.5) * 4, y + from + len * 0.5],
        [x + 4 + (r() - 0.5) * 5, y + Math.min(DROP - 4, from + len)],
      ]
      box.dry(g, r, st, 3 + r() * 9, i % 5 === 0 ? '#6fa8cc' : i % 2 === 0 ? '#9ccbe0' : '#b9dcea', 0.7)
      if (i % 4 === 0) box.pencil(g, r, st, { a: 0.3, passes: 1 })
    }
    for (let i = 0; i < 9; i++) {
      const [x, y] = at((i + r()) / 9)
      const top = 8 + r() * 30
      box.lift(g, r, [[x - 3, y + top], [x + 3, y + top], [x + 6, y + DROP - 10], [x, y + DROP - 6]], 0.6, 2)
    }
    // The lip itself: darker where the water gathers before it goes over.
    box.dry(g, r, [at(0.02), at(0.5), at(0.98)], 5, '#5f9cc4', 0.7)
    box.pencil(g, r, [at(0), at(0.5), at(1)], { a: 0.55, jit: 2 })
    // Foam and mist where it lands.
    box.lift(g, r, [[at(0)[0] - 10, at(0)[1] + DROP - 12], [at(0)[0] + 50, at(0)[1] + DROP + 6], [at(1)[0] + 60, at(1)[1] + DROP + 4], [at(1)[0] - 6, at(1)[1] + DROP - 14]], 0.5, 9)
    for (let i = 0; i < 18; i++) {
      const [x, y] = at((i + r() * 0.9) / 18)
      const fw = 12 + r() * 20
      box.lift(g, r, oval(x + 12 + r() * 26, y + DROP - 2 + r() * 8, fw, fw * (0.3 + r() * 0.2), 8), 0.9, 2.5)
      if (i % 3 === 0) box.pencil(g, r, oval(x + 26, y + DROP + 4, 14, 5, 6, 0, 0.4, 2.6), { a: 0.34, passes: 1, jit: 1.2 })
    }
  })
  add(93, LIP_FAR.x + 34, 180, (g, r) => {
    const t = toneAt(LIP_FAR.x)
    rock(box, g, r, LIP_FAR.x + 56, LIP_FAR.y + DROP + 14, 150, 128, 1, t)
    rock(box, g, r, LIP_FAR.x - 40, LIP_FAR.y + 8, 84, 42, 1, t)
    rock(box, g, r, LIP_FAR.x + 150, LIP_FAR.y + DROP + 8, 70, 40, 0.4, t)
  })
  add(94, LIP_NEAR.x - 20, 200, (g, r) => {
    const t = toneAt(LIP_NEAR.x)
    rock(box, g, r, LIP_NEAR.x - 44, LIP_NEAR.y + DROP + 24, 170, 120, 1, t)
    rock(box, g, r, LIP_NEAR.x + 78, LIP_NEAR.y + DROP + 46, 84, 40, 0.5, t)
    rock(box, g, r, LIP_NEAR.x - 150, LIP_NEAR.y + 40, 60, 26, 0.6, t)
  })

  // The pond: a willow at its far end, a bush where the brook comes in.
  tall(4410, 120, (g, r, t) => {
    bush(box, g, r, 4400, farEdge(4400) - 14, 38, greens[2], t)
    bush(box, g, r, 4462, farEdge(4462) - 24, 26, greens[1], t)
  })
  tall(
    5216,
    200,
    (g, r, t) => {
      const base = 648
      trunk(box, g, r, 5222, base, base - 150, 24, -20, '#a88a6a', t)
      const cols = ['#b6d070', '#e0e080', '#86b472']
      crown(box, g, r, 5210, base - 180, 76, cols, t, 0.85)
      // The curtain: long thin strokes falling from the crown's edge.
      for (let i = 0; i < 24; i++) {
        const u = i / 23
        const sx = 5210 - 84 + u * 168 + (r() - 0.5) * 8
        const sy = base - 180 + 30 + Math.abs(u - 0.5) * 26 + r() * 14
        const len = 84 + r() * 60 - Math.abs(u - 0.5) * 50
        const sway = (u - 0.5) * 34 + (r() - 0.5) * 10
        const st: Pt[] = [
          [sx, sy],
          [sx + sway * 0.5, sy + len * 0.5],
          [sx + sway * 0.7, sy + len],
        ]
        box.dry(g, r, st, 2.4 + r() * 2.2, t(cols[i % 3]!), 0.62)
        if (i % 4 === 0) box.pencil(g, r, st, { a: 0.3, passes: 1 })
      }
    },
    0.5,
  )
  add(76, 5246, 80, (g, r) => {
    rock(box, g, r, 5246, 786, 96, 44, 1)
    tuft(box, g, r, 5210, 800, 1.2, '#6f9850')
  })
  add(53, 4700, 520, (g, r) => {
    reedsPainted(box, g, r, 4600, farEdge(4600) + 12, 9, 80)
    reedsPainted(box, g, r, 4850, farEdge(4850) + 10, 7, 70)
    rock(box, g, r, 5168, 604 + DROP + 6, 60, 26, 1)
    reedsPainted(box, g, r, 5140, 604 + DROP + 70, 10, 96)
    reedsPainted(box, g, r, 5150, 604 + DROP - 60, 6, 70)
  })

  return list.sort((a, b) => a.z - b.z)
}

// ---------------------------------------------------------------- the sheet

const SKY_TOP: readonly [number, string][] = [
  [0, '#7fbde8'],
  [2500, '#86bce6'],
  [3250, '#9db2e0'],
  [3900, '#978dd0'],
  [4500, '#6a70ba'],
  [LEN, '#5a66b0'],
]
const SKY_LOW: readonly [number, string][] = [
  [0, '#fcf1c4'],
  [2500, '#fbe6a8'],
  [3250, '#fcc888'],
  [3900, '#f7a376'],
  [4500, '#f19478'],
  [LEN, '#ec8b80'],
]

interface Cloud {
  x: number
  y: number
  w: number
  h: number
  gaps: { pts: Pt[]; blur: number; a?: number }[]
}

export function createScroll(box: Box, scale: number): Scroll {
  const features = buildFeatures(box)
  const count = Math.ceil(LEN / VIEW_W)
  const tiles: (HTMLCanvasElement | null)[] = new Array<HTMLCanvasElement | null>(count).fill(null)

  // Clouds are paper the sky wash was kept off: a few soft heaps, firmer
  // along the top where the wash stopped, lost underneath.
  const cr = rng(909)
  const clouds: Cloud[] = []
  for (let x = 250; x < 3500; x += x < 600 ? 370 : x < 1000 ? 720 : 340 + cr() * 280) {
    const w = 150 + cr() * 140
    const h = 44 + cr() * 30
    const y = x < 1000 ? (x < 600 ? 104 : 168) : 110 + cr() * 80
    const gaps: Cloud['gaps'] = [{ pts: oval(x, y - h * 0.1, w * 0.5, h * 0.3, 10), blur: 12 }]
    const n = 3 + Math.floor(cr() * 2)
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n
      const lobe = h * (0.45 + 0.5 * Math.sin(Math.PI * u)) * (0.8 + cr() * 0.4)
      gaps.push({ pts: roughen(cr, oval(x - w * 0.36 + w * 0.72 * u, y - h * 0.2 - lobe * 0.5, (w / n) * 0.62, lobe * 0.62, 9), 3, 16), blur: 4.5 })
    }
    clouds.push({ x, y, w, h, gaps })
  }
  // In the evening the clouds are long bars of rose and violet instead.
  const bars: { x: number; y: number; w: number; h: number; c: string }[] = []
  for (let x = 3500; x < LEN; x += 240 + cr() * 240) {
    bars.push({ x, y: 150 + cr() * 150 + 60 * sstep(3600, 4400, x), w: 200 + cr() * 220, h: 8 + cr() * 8, c: cr() < 0.4 ? '#e99a8c' : '#9a8fce' })
  }

  function* paint(index: number): Generator<void, HTMLCanvasElement, void> {
    const x0 = index * VIEW_W
    const w = Math.min(VIEW_W, LEN - x0)
    const x1 = x0 + w
    const [canvas, g] = makeCanvas(w, SHEET_H, scale)
    g.fillStyle = PAPER
    g.fillRect(0, 0, w, SHEET_H)
    g.translate(-x0, 0)
    // One seed per long wash, the same on every strip.
    const R = (k: number) => rng(5000 + Math.round(k * 2) * 131)
    const near = features.filter((f) => f.x1 > x0 - 60 && f.x0 < x1 + 60)
    const upTo = function* (z: number, from: number): Generator<void, void, void> {
      for (const f of near) {
        if (f.z < from || f.z >= z) continue
        f.paint(g, rng(f.seed))
        yield
      }
    }

    // Pencil first: the skyline and the edges of the brook.
    const line = (fn: (x: number) => number, k: number, off: number, a: number) => {
      const pts: Pt[] = []
      for (let x = Math.floor((x0 - 60) / 30) * 30; x <= x1 + 60; x += 30) if (x > 20 && x < LEN - 20) pts.push([x, fn(x) + off + nz(x, k) * 2.4])
      if (pts.length > 1) box.pencil(g, R(k), pts, { a, jit: 0.9, passes: 2 })
    }
    line(ridge, 1, -4, 0.5)
    line(farEdge, 4, 2, 0.5)
    line(nearEdge, 5, -2, 0.5)

    // Sky: wet in wet, blue from above, warm from the hills, cloud left dry.
    const gaps = clouds.filter((c) => c.x + c.w > x0 - 80 && c.x - c.w < x1 + 80).flatMap((c) => c.gaps)
    box.wash(g, R(10), band(x0, x1, () => -60, (x) => 96 + 44 * nz(x * 0.17, 3), 10), { color: '#7fbde8', style: ramp(g, SKY_TOP), a: 0.42, soft: 40, mottle: 0.5, grain: 0.4, rough: 0, tex: 2, pool: 0, gaps })
    yield
    box.wash(g, R(11), band(x0, x1, () => -60, (x) => ridge(x) - 96 + 30 * nz(x * 0.21, 5), 11), { color: '#7fbde8', style: ramp(g, SKY_TOP), a: 0.66, soft: 38, mottle: 0.6, grain: 0.45, rough: 0, tex: 2, pool: 0, gaps })
    yield
    box.wash(g, R(12), band(x0, x1, (x) => ridge(x) - 120 + 26 * nz(x * 0.19, 8), (x) => ridge(x) + 40, 12), { color: '#fbe3a0', style: ramp(g, SKY_LOW), a: 0.8, soft: 34, mottle: 0.4, grain: 0.35, rough: 0, tex: 2, pool: 0 })
    yield
    for (const c of clouds) {
      if (c.x + c.w < x0 - 40 || c.x - c.w > x1 + 40) continue
      box.wash(g, rng(Math.round(c.x) * 31 + 7), oval(c.x + 8, c.y + c.h * 0.02, c.w * 0.4, c.h * 0.2, 9), { color: '#b4b0d2', a: 0.42, soft: 9, mottle: 0.4, pool: 0, rough: 3 })
    }
    for (const b of bars) {
      if (b.x + b.w < x0 - 40 || b.x - b.w > x1 + 40) continue
      const br = rng(Math.round(b.x) * 37 + 3)
      box.wash(g, br, [[b.x - b.w / 2, b.y], [b.x - b.w * 0.1, b.y - b.h], [b.x + b.w / 2, b.y - b.h * 0.3], [b.x + b.w * 0.2, b.y + b.h * 0.7]], { color: b.c, a: 0.5, pool: 0.4, mottle: 0.5, rough: 2, step: 30, lost: 2 })
    }

    // Hills: the far ones cool and pale; green ones roll in front of them.
    box.wash(g, R(20), band(x0, x1, (x) => ridge(x) + 2.5 * nz(x, 21), (x) => meadowTop(x) + 5, 20), { color: '#a3badc', a: 0.64, pool: 0.7, mottle: 0.7, grain: 0.5, rough: 0, tex: 2 })
    yield
    yield* upTo(24, 0)

    // The far meadow, with turf darkening to the water.
    box.wash(g, R(24), band(x0, x1, (x) => meadowTop(x) + 3 * nz(x, 25), (x) => farEdge(x) + 2 + 2 * nz(x, 26), 24), { color: '#d6e283', a: 0.78, pool: 0.45, mottle: 0.6, grain: 0.5, rough: 0, tex: 2 })
    yield
    box.wash(g, R(27), band(x0, x1, (x) => farEdge(x) - 34 + 9 * nz(x * 0.5, 28), (x) => farEdge(x) + 2, 27), { color: '#9dc266', a: 0.55, soft: 9, mottle: 0.5, grain: 0.4, rough: 0, tex: 2, pool: 0 })
    yield
    for (let cx = Math.floor((x0 - 200) / 170) * 170; cx < x1 + 200; cx += 170) {
      const dr = rng(cx * 13 + 5)
      const px = cx + dr() * 120
      if (px < 80 || px > LEN - 80) continue
      const py = meadowTop(px) + 28 + dr() * Math.max(10, farEdge(px) - meadowTop(px) - 70)
      box.wash(g, dr, oval(px, py, 50 + dr() * 50, 11 + dr() * 9, 9), { color: dr() < 0.5 ? '#a8cb6c' : '#efe28a', a: 0.5, soft: 9, mottle: 0.5, pool: 0, rough: 3 })
    }
    yield* upTo(40, 24)

    // The brook. Paper is left along both edges; that is its sparkle.
    const lipAt = (x: number) => LIP_FAR.y + ((LIP_NEAR.y - LIP_FAR.y) * (LIP_FAR.x - x)) / (LIP_FAR.x - LIP_NEAR.x)
    const water = (k: number, top: (x: number) => number, bot: (x: number) => number, o: Wash) => {
      // Above the fall the brook ends at the slanting lip; below, it begins there.
      if (x0 < LIP_FAR.x + 60) {
        const up = band(x0, Math.min(x1, LIP_FAR.x), top, bot, k, 34, 0, LIP_FAR.x).filter((p) => !(p[0] > LIP_NEAR.x && p[1] > lipAt(p[0])))
        if (up.length > 2) box.wash(g, R(k), up, o)
      }
      if (x1 > LIP_NEAR.x - 60) {
        const low = band(Math.max(x0, LIP_NEAR.x), x1, top, bot, k + 0.5, 34, LIP_NEAR.x, LEN).filter((p) => !(p[0] < LIP_FAR.x && p[1] < lipAt(p[0]) + DROP))
        if (low.length > 2) box.wash(g, R(k + 0.5), low, o)
      }
    }
    water(40, (x) => farEdge(x) + 5 + 2.5 * nz(x, 41), (x) => nearEdge(x) - 4 + 2.5 * nz(x, 42), { color: '#a2d8e2', a: 0.74, pool: 0.6, mottle: 0.8, grain: 0.4, rough: 0, tex: 2 })
    yield
    water(43, (x) => farEdge(x) + 5, (x) => farEdge(x) + 40 + 8 * nz(x * 0.6, 44), { color: '#8dba8c', a: 0.5, soft: 9, mottle: 0.6, grain: 0.3, rough: 0, tex: 2, pool: 0 })
    yield
    water(45, (x) => (farEdge(x) + nearEdge(x)) / 2 + 16 * nz(x * 0.3, 46), (x) => nearEdge(x) - 8, { color: '#7db8dc', a: 0.42, soft: 22, mottle: 0.6, grain: 0.3, rough: 0, tex: 2, pool: 0 })
    yield
    // Streaks: darker strokes of current, and paper lifted back for light.
    for (let cx = Math.floor((x0 - 200) / 120) * 120; cx < x1 + 200; cx += 120) {
      const sr = rng(cx * 17 + 3)
      for (let i = 0; i < 3; i++) {
        const px = cx + sr() * 120
        const u = sr()
        const len = 40 + sr() * 70
        const bend = (sr() - 0.5) * 5
        const wide = 2.2 + sr() * 2.4
        if (px < 40 || px > LEN - 190 || Math.abs(px - (LIP_FAR.x + LIP_NEAR.x) / 2) < 190) continue
        const fy = farEdge(px)
        const py = fy + 24 + u * Math.max(10, nearEdge(px) - fy - 44)
        if (i === 0) box.lift(g, sr, [[px, py - 1.6], [px + len * 0.5, py - 2.8], [px + len, py - 1], [px + len * 0.5, py + 1.8]], 0.8, 1.5)
        else box.dry(g, sr, [[px, py], [px + len * 0.5, py + bend], [px + len, py + 1]], wide, '#5f9fc0', 0.5)
      }
    }
    yield* upTo(64, 40)

    // The near bank: moss and grass, an earth lip where it meets the water.
    box.wash(g, R(64), band(x0, x1, (x) => nearEdge(x) + 2 + 2.5 * nz(x, 65), () => SHEET_H + 40, 64), { color: '#c6d97a', a: 0.8, pool: 0.55, mottle: 0.6, grain: 0.55, rough: 0, tex: 2 })
    yield
    box.wash(g, R(66), band(x0, x1, (x) => nearEdge(x) + 2, (x) => nearEdge(x) + 18 + 6 * nz(x * 0.6, 67), 66), { color: '#8fb35c', a: 0.55, soft: 7, mottle: 0.6, grain: 0.4, rough: 0, tex: 2, pool: 0 })
    yield
    box.wash(g, R(68), band(x0, x1, (x) => farEdge(x) - 3 + 1.5 * nz(x, 69), (x) => farEdge(x) + 6 + 2 * nz(x, 70), 68), { color: '#b98b5c', a: 0.6, pool: 0.5, mottle: 0.6, grain: 0.5, rough: 0, tex: 2 })
    yield
    for (let cx = Math.floor((x0 - 200) / 150) * 150; cx < x1 + 200; cx += 150) {
      const dr = rng(cx * 29 + 11)
      const px = cx + dr() * 130
      if (px < 90 || px > LEN - 90) continue
      const py = nearEdge(px) + 44 + dr() * 190
      box.wash(g, dr, oval(px, py, 60 + dr() * 70, 15 + dr() * 14, 9), { color: dr() < 0.55 ? '#9bbd60' : '#ece486', a: 0.45, soft: 12, mottle: 0.6, pool: 0, rough: 3 })
    }
    yield* upTo(90, 64)

    // Evening comes downstream: a warm glaze, then a blue-violet one, over
    // the land and the water but not the sky.
    if (x1 > 2600) {
      box.wash(g, R(90), band(x0, x1, (x) => ridge(x) + 1, () => SHEET_H + 40, 90, 34, 2600), { color: '#8a88c4', style: ramp(g, GLAZE.map(([x, cr, cg, cb, ca]) => [x, `rgba(${cr},${cg},${cb},${ca})`] as [number, string])), a: 1, pool: 0, mottle: 0, grain: 0, rough: 0 })
    }
    if (x1 > 4000) {
      // The last light lying on the pond, stars, and a thin moon.
      const lr = rng(31337)
      const glow: Pt[] = []
      for (let x = 4380; x <= 5120; x += 74) glow.push([x, farEdge(x) + 26])
      for (let x = 5120; x >= 4380; x -= 74) glow.push([x, farEdge(x) + 120 + 30 * nz(x * 0.3, 9)])
      box.lift(g, lr, glow, 0.2, 22, '#f8b99c')
      for (let i = 0; i < 9; i++) {
        const px = 4880 + lr() * 170
        const py = 600 + i * 15 + lr() * 8
        const len = 60 + lr() * 90 - i * 4
        box.lift(g, lr, [[px - len / 2, py], [px, py - 2.6], [px + len / 2, py], [px, py + 2.6]], 0.55, 2, '#fbc79a')
      }
      for (let i = 0; i < 34; i++) {
        const px = 4080 + lr() * 1180
        const py = 118 + lr() * (ridge(px) - 118 - 120)
        const s = 1 + lr() * 1.3
        box.lift(g, lr, oval(px, py, s, s, 5), 0.55 + lr() * 0.4)
      }
      const moon: Pt[] = oval(4700, 190, 24, 24, 12, -0.5, -1.25, 1.25).concat(oval(4690, 190, 19.5, 24, 10, -0.5, 1.2, -1.2))
      box.lift(g, lr, moon, 0.92, 1.5, '#fdf3d0')
    }
    yield* upTo(200, 90)
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.scale(scale, scale)
    box.tooth(g, w, SHEET_H, 0.22, -x0 * scale)
    return canvas
  }

  // One strip is always under the brush; a strip the view needs before its
  // turn is finished on the spot.
  let job: { index: number; gen: Generator<void, HTMLCanvasElement, void> } | null = null
  const finish = (i: number): HTMLCanvasElement => {
    const gen = job && job.index === i ? job.gen : paint(i)
    if (job && job.index === i) job = null
    for (;;) {
      const step = gen.next()
      if (step.done) {
        tiles[i] = step.value
        return step.value
      }
    }
  }
  const tile = (i: number): HTMLCanvasElement => tiles[i] ?? finish(i)

  return {
    work(ms) {
      const until = performance.now() + ms
      for (;;) {
        if (!job) {
          const i = tiles.indexOf(null)
          if (i === -1) return false
          job = { index: i, gen: paint(i) }
        }
        const step = job.gen.next()
        if (step.done) {
          tiles[job.index] = step.value
          job = null
        }
        if (performance.now() >= until) return job !== null || tiles.indexOf(null) !== -1
      }
    },
    draw(g, camX, camY) {
      const first = Math.max(0, Math.floor(camX / VIEW_W))
      const last = Math.min(count - 1, Math.floor((camX + VIEW_W - 0.001) / VIEW_W))
      for (let i = first; i <= last; i++) {
        const t = tile(i)
        const x0 = i * VIEW_W
        const w = Math.min(VIEW_W, LEN - x0)
        // Only the part of the strip that is on the field.
        const sx = Math.max(0, camX - x0)
        const ex = Math.min(w, camX + VIEW_W - x0)
        if (ex <= sx) continue
        g.drawImage(t, sx * scale, camY * scale, (ex - sx) * scale, 820 * scale, x0 + sx - camX, 0, ex - sx, 820)
      }
    },
  }
}
