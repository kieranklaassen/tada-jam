// The journal's drawing materials: a pen, hatching, a thin wash, a pencil,
// tape and the paper itself. Everything a page shows is built from these, so
// the look has one home.
//
// Rules of the look: the pen is one blue-black ink whose line swells and thins
// a little with pressure and tapers at its ends; a wash is thin, transparent
// and multiplied, with a loose edge and a darker rim where pigment pools; the
// pencil is grey and grainy; nothing is opaque paint. All unevenness comes
// from `hash`, never from `Math.random`, so the same page draws the same
// picture.

export type Ctx = CanvasRenderingContext2D
export type Pt = readonly [number, number]

/** The palette. Washes are named for the pigment they stand for and are always laid thin. */
export const INK = '#1f2a44'
export const PENCIL = '#5f5d5a'
export const PAPER = '#f3ead6'
export const SCRAP = '#f8f2e2'
export const WASH = {
  red: '#d42a36', pink: '#f29abb', shade: '#8fa3bd', spot: '#4d0a1a', gold: '#e6ac1e',
  leaf: '#7fa63e', stem: '#93a850', clay: '#cf6f3f', wet: '#4b3323', dry: '#d9c297',
  wood: '#b98d5a', zinc: '#9aa9a6', brass: '#c99a2e', glass: '#a9cfd6', tape: '#e4cf8f',
} as const

/** A number from 0 up to 1 that depends only on the two whole numbers given. */
export function hash(seed: number, index = 0): number {
  let h = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((index | 0) + 0x7f4a7c15, 0xc2b2ae35)
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/** A seed made of several whole numbers, so a drawing's parts never share their jitter. */
export function seedOf(...parts: number[]): number {
  let seed = 0x51ed270b
  for (const part of parts) seed = Math.floor(hash(seed, Math.round(part)) * 4294967296)
  return seed
}

/** Smooth unevenness from -1 to 1 along a line: the hand's slow wander. */
export function drift(seed: number, along: number): number {
  const at = Math.floor(along), f = along - at
  const a = hash(seed, at), b = hash(seed, at + 1)
  return (a + (b - a) * f * f * (3 - 2 * f)) * 2 - 1
}

/** A smooth line through the given points, as many short steps. */
export function curve(pts: readonly Pt[], closed = false, gap = 2.5): Pt[] {
  const n = pts.length, out: Pt[] = []
  const at = (i: number): Pt => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const steps = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / gap))
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t
      out.push([0, 1].map((k) => 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3)) as unknown as Pt)
    }
  }
  out.push(closed ? out[0] : pts[n - 1])
  return out
}

/** Points round an ellipse, for `curve`-free outlines. */
export function oval(cx: number, cy: number, rx: number, ry: number, turn = 0, count = 28): Pt[] {
  const cos = Math.cos(turn), sin = Math.sin(turn), out: Pt[] = []
  for (let i = 0; i <= count; i++) {
    const a = (i / count) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry
    out.push([cx + x * cos - y * sin, cy + x * sin + y * cos])
  }
  return out
}

export function trace(ctx: Ctx, pts: readonly Pt[], close = false): void {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  if (close) ctx.closePath()
}

export type PenOpts = { w?: number; seed?: number; ink?: string; taper?: number; wobble?: number; alpha?: number }

/**
 * One pen stroke along a line. The stroke is a filled ribbon: its width
 * follows the pressure of the hand, which wanders, and thins to a point over
 * `taper` of its length at each end (0 for a line that closes on itself).
 */
export function pen(ctx: Ctx, pts: readonly Pt[], o: PenOpts = {}): void {
  const n = pts.length
  if (n < 2) return
  const { w = 1.25, seed = 1, ink = INK, taper = 0.2, wobble = 0.35, alpha = 1 } = o
  const run = [0]
  for (let i = 1; i < n; i++) run.push(run[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const total = run[n - 1] || 1, left: Pt[] = [], right: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len
    const t = run[i] / total
    const end = taper > 0 ? Math.min(1, t / taper, (1 - t) / taper) : 1
    const half = (w / 2) * (0.84 + 0.3 * drift(seed, run[i] / (9 * w))) * (0.22 + 0.78 * Math.sqrt(end))
    const off = wobble * w * drift(seed + 7, run[i] / (14 * w))
    left.push([pts[i][0] + nx * (off + half), pts[i][1] + ny * (off + half)])
    right.push([pts[i][0] + nx * (off - half), pts[i][1] + ny * (off - half)])
  }
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.fillStyle = ink
  trace(ctx, left.concat(right.reverse()), true)
  ctx.fill()
  ctx.restore()
}

/** A row of dots made with the pen's tip, for stippling. */
export function dot(ctx: Ctx, x: number, y: number, r: number, ink: string = INK): void {
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 0.9, 0.4, 0, Math.PI * 2)
  ctx.fill()
}

/** The same outline, pushed about by the hand: a wash never follows the line exactly. */
function loosen(pts: readonly Pt[], seed: number, by: number): Pt[] {
  return pts.map(([x, y], i) => [x + by * drift(seed, i / 3), y + by * drift(seed + 3, i / 3)] as const)
}

export type WashOpts = { seed?: number; alpha?: number; rim?: number; loose?: number }

/**
 * A thin transparent wash inside an outline, multiplied onto what is under
 * it. Three loose layers give an uneven soft edge, and a rim inside the edge
 * is darker, where the pigment pooled as it dried.
 */
export function wash(ctx: Ctx, pts: readonly Pt[], colour: string, o: WashOpts = {}): void {
  const { seed = 1, alpha = 0.5, rim = 0.3, loose = 1 } = o
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = colour
  ctx.strokeStyle = colour
  const base = ctx.globalAlpha
  for (let layer = 0; layer < 3; layer++) {
    ctx.globalAlpha = base * alpha * (layer === 0 ? 0.62 : 0.3)
    trace(ctx, loosen(pts, seed + layer * 11, loose * (0.5 + layer * 0.7)), true)
    ctx.fill()
  }
  if (rim > 0) {
    trace(ctx, loosen(pts, seed, loose * 0.5), true)
    ctx.clip()
    ctx.globalAlpha = base * rim
    ctx.lineWidth = 2.2 + loose
    ctx.stroke()
  }
  ctx.restore()
}

export type HatchOpts = { seed?: number; angle?: number; gap?: number; w?: number; ink?: string; alpha?: number }

/** Parallel pen lines inside an outline, each a little uneven in length, weight and spacing. */
export function hatch(ctx: Ctx, pts: readonly Pt[], o: HatchOpts = {}): void {
  const { seed = 1, angle = -0.9, gap = 3, w = 0.7, ink = INK, alpha = 0.8 } = o
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, reach = Math.hypot(x1 - x0, y1 - y0) / 2
  const dx = Math.cos(angle), dy = Math.sin(angle)
  ctx.save()
  trace(ctx, pts, true)
  ctx.clip()
  ctx.strokeStyle = ink
  ctx.lineCap = 'round'
  const base = ctx.globalAlpha
  for (let i = 0, d = -reach; d < reach; i++, d += gap * (0.8 + 0.4 * hash(seed, i))) {
    const from = -reach * (0.75 + 0.25 * hash(seed + 1, i)), to = reach * (0.75 + 0.25 * hash(seed + 2, i))
    ctx.globalAlpha = base * alpha * (0.6 + 0.4 * hash(seed + 3, i))
    ctx.lineWidth = w * (0.7 + 0.6 * hash(seed + 4, i))
    ctx.beginPath()
    ctx.moveTo(cx - dy * d + dx * from, cy + dx * d + dy * from)
    ctx.lineTo(cx - dy * d + dx * to + hash(seed + 5, i) - 0.5, cy + dx * d + dy * to)
    ctx.stroke()
  }
  ctx.restore()
}

/** A pencil line: grey, lighter than the pen, and grainy, since graphite skips on the paper's tooth. */
export function pencil(ctx: Ctx, pts: readonly Pt[], o: { seed?: number; w?: number; alpha?: number } = {}): void {
  const { seed = 1, w = 1.1, alpha = 0.62 } = o
  ctx.save()
  ctx.strokeStyle = PENCIL
  ctx.lineCap = 'round'
  const base = ctx.globalAlpha
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < pts.length; i++) {
      const grain = hash(seed + pass * 31, i)
      if (grain < 0.12) continue
      ctx.globalAlpha = base * alpha * (0.35 + 0.65 * grain)
      ctx.lineWidth = w * (0.55 + 0.6 * hash(seed + 5, i + pass))
      const shift = pass * 0.45 * (hash(seed + 9, i) - 0.5)
      ctx.beginPath()
      ctx.moveTo(pts[i - 1][0] + shift, pts[i - 1][1] + shift)
      ctx.lineTo(pts[i][0] + shift, pts[i][1] + shift)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** A strip of tape from its middle: translucent, with torn ends and a faint edge. */
export function tape(ctx: Ctx, x: number, y: number, length: number, turn: number, seed = 1, width = 15): void {
  const half = length / 2, w = width / 2, edge: Pt[] = []
  for (let i = 0; i <= 6; i++) edge.push([half + (i % 2 ? 2.4 : 0) * hash(seed, i) + (i % 2 ? 0.8 : 0), -w + (i / 6) * width])
  for (let i = 6; i >= 0; i--) edge.push([-half - (i % 2 ? 2.4 : 0) * hash(seed + 1, i) - (i % 2 ? 0.8 : 0), -w + (i / 6) * width])
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  ctx.globalAlpha *= 0.62
  ctx.fillStyle = WASH.tape
  trace(ctx, edge, true)
  ctx.fill()
  ctx.globalAlpha *= 0.5
  ctx.strokeStyle = '#a8904c'
  ctx.lineWidth = 0.6
  for (const side of [-w + 0.4, w - 0.4]) { ctx.beginPath(); ctx.moveTo(-half, side); ctx.lineTo(half, side); ctx.stroke() }
  ctx.strokeStyle = '#fff8dc'
  for (let i = 0; i < 3; i++) {
    const at = -w + width * (0.25 + 0.25 * i) + hash(seed + 2, i) * 2
    ctx.beginPath(); ctx.moveTo(-half + 3, at); ctx.lineTo(half - 3, at + hash(seed + 3, i) - 0.5); ctx.stroke()
  }
  ctx.restore()
}

/**
 * The page: bare cream paper with faint fibres, a few foxed spots and edges
 * that have toned with age. It is painted once per size into a canvas of its
 * own and reused; nothing is ruled or printed on it.
 */
export function paintPaper(ctx: Ctx, width: number, height: number, seed = 20261003): void {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)
  ctx.lineCap = 'round'
  const fibres = Math.round((width * height) / 520)
  for (let i = 0; i < fibres; i++) {
    const x = hash(seed, i) * width, y = hash(seed + 1, i) * height, a = hash(seed + 2, i) * Math.PI, len = 3 + hash(seed + 3, i) * 9
    ctx.strokeStyle = hash(seed + 4, i) < 0.5 ? 'rgba(255,252,240,0.5)' : 'rgba(150,120,80,0.09)'
    ctx.lineWidth = 0.5 + hash(seed + 5, i) * 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 1.5, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len)
    ctx.stroke()
  }
  for (let i = 0; i < 16; i++) {
    const x = hash(seed + 6, i) * width, y = hash(seed + 7, i) * height, r = 5 + hash(seed + 8, i) * (i < 3 ? 34 : 12)
    const spot = ctx.createRadialGradient(x, y, 0, x, y, r)
    spot.addColorStop(0, `rgba(170,120,60,${0.05 + 0.07 * hash(seed + 9, i)})`)
    spot.addColorStop(0.6, 'rgba(170,120,60,0.03)')
    spot.addColorStop(1, 'rgba(170,120,60,0)')
    ctx.fillStyle = spot
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  const band = Math.min(width, height) * 0.09
  for (const [x0, y0, x1, y1] of [[0, 0, band, 0], [width, 0, width - band, 0], [0, 0, 0, band], [0, height, 0, height - band]]) {
    const tone = ctx.createLinearGradient(x0, y0, x1, y1)
    tone.addColorStop(0, 'rgba(160,120,70,0.13)')
    tone.addColorStop(1, 'rgba(160,120,70,0)')
    ctx.fillStyle = tone
    ctx.fillRect(0, 0, width, height)
  }
}
