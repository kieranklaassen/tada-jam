// The journal's drawing materials: a pen, hatching, a thin wash, a pencil
// and the quick ring it draws, gold dust, tape and the paper itself. Everything a page shows is built from these, so
// the look has one home.
//
// Rules of the look: the pen is one blue-black ink whose line swells and thins
// a little with pressure and tapers at its ends; a wash is thin, transparent
// and multiplied, with a loose edge and a darker rim where pigment pools; the
// pencil is grey and grainy; nothing is opaque paint. All unevenness comes
// from `hash`, never from `Math.random`, so the same page draws the same
// picture.

import type { Mote } from './live'

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

/** The brown of a flower's anthers, the darker of gold dust's two tones. */
export const ANTHER = '#9a6a10'

/**
 * Gold dust, all of it in one pass: specks are gathered by their alpha into a few steps and each step is one fill.
 * Most are the gold of a flower's eye and some the brown of its anthers; which, a speck keeps by its radius.
 * `paired` draws each as two small gold dots side by side: a footprint.
 */
export function drawSpecks(ctx: Ctx, specks: readonly Mote[], paired = false): void {
  const base = ctx.globalAlpha
  ctx.globalCompositeOperation = 'source-over'
  for (let tone = 0; tone < 2; tone++) {
    ctx.fillStyle = tone ? ANTHER : WASH.gold
    for (let step = 1; step <= 5; step++) {
      let any = false
      for (const { x, y, r, alpha } of specks) {
        if ((!paired && Math.round(r * 97) % 4 === 0 ? 1 : 0) !== tone || Math.min(5, Math.ceil(alpha * 5)) !== step) continue
        if (!any) ctx.beginPath()
        any = true
        for (const side of paired ? [-1, 1] : [0]) {
          const cx = x + side * r * 1.5, cy = y + side * r * 0.5
          ctx.moveTo(cx + r, cy)
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
        }
      }
      if (!any) continue
      ctx.globalAlpha = (base * step) / 5
      ctx.fill()
    }
  }
  ctx.globalAlpha = base
}

/** A hex colour at an opacity, for a gradient stop. */
function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/** The same outline, pushed about by the hand: a wash never follows the line exactly. */
function loosen(pts: readonly Pt[], seed: number, by: number): Pt[] {
  // The whole wash also sits a little off the drawing, as a brush laid after the pen does.
  const dx = (hash(seed, 81) - 0.5) * by * 1.3, dy = (hash(seed, 82) - 0.5) * by * 1.3
  return pts.map(([x, y], i) => [x + dx + by * drift(seed, i / 3), y + dy + by * drift(seed + 3, i / 3)] as const)
}

/**
 * A wash that runs out: the colour is at its strongest at the height `from` and gone at the height `to`, as a wash is
 * that was laid wet and drawn down with clean water. Three loose layers give it a soft uneven edge, and it has no rim:
 * nothing pooled, so it stands as a tone and never as a shape with an outline. For the setting of a page.
 */
export function fadeWash(ctx: Ctx, pts: readonly Pt[], colour: string, o: { alpha?: number; from: number; to: number; seed?: number; loose?: number }): void {
  const { alpha = 0.3, from, to, seed = 1, loose = 3 } = o
  const fade = ctx.createLinearGradient(0, from, 0, to)
  fade.addColorStop(0, tint(colour, 1))
  fade.addColorStop(0.6, tint(colour, 0.45))
  fade.addColorStop(1, tint(colour, 0))
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = fade
  const base = ctx.globalAlpha
  for (let layer = 0; layer < 3; layer++) {
    ctx.globalAlpha = base * alpha * (layer === 0 ? 0.6 : 0.3)
    trace(ctx, loosen(pts, seed + layer * 11, loose * (0.5 + layer * 0.8)), true)
    ctx.fill()
  }
  ctx.restore()
}

export type WashOpts = { seed?: number; alpha?: number; rim?: number; loose?: number }

/**
 * A thin transparent wash inside an outline, multiplied onto what is under
 * it. Three loose layers give an uneven soft edge, and a rim inside the edge
 * is darker, where the pigment pooled as it dried.
 */
export function wash(ctx: Ctx, pts: readonly Pt[], colour: string, o: WashOpts = {}): void {
  const { seed = 1, alpha = 0.5, rim = 0.3, loose = 1 } = o
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, reach = Math.hypot(x1 - x0, y1 - y0) / 2 || 1
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.strokeStyle = colour
  const base = ctx.globalAlpha
  // The first layer is uneven across the shape: the pigment ran to one side as the wash was laid.
  const run = hash(seed, 91) * Math.PI * 2, settle = ctx.createLinearGradient(cx - Math.cos(run) * reach, cy - Math.sin(run) * reach, cx + Math.cos(run) * reach, cy + Math.sin(run) * reach)
  settle.addColorStop(0, tint(colour, 0.5))
  settle.addColorStop(0.55 + 0.25 * hash(seed, 92), tint(colour, 0.78))
  settle.addColorStop(1, tint(colour, 1))
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = layer === 0 ? settle : colour
    ctx.globalAlpha = base * alpha * (layer === 0 ? 0.74 : 0.26)
    trace(ctx, loosen(pts, seed + layer * 11, loose * (0.5 + layer * 0.7)), true)
    ctx.fill()
  }
  trace(ctx, loosen(pts, seed, loose * 0.5), true)
  ctx.clip()
  // Two blooms, where a drop of water pushed the pigment into a darker ring.
  for (let i = 0; i < 2; i++) {
    const bx = x0 + (x1 - x0) * hash(seed, 93 + i), by = y0 + (y1 - y0) * hash(seed, 95 + i), r = reach * (0.3 + 0.3 * hash(seed, 97 + i))
    const bloom = ctx.createRadialGradient(bx, by, r * 0.2, bx, by, r)
    bloom.addColorStop(0, tint(colour, 0))
    bloom.addColorStop(0.8, tint(colour, 0.22))
    bloom.addColorStop(1, tint(colour, 0))
    ctx.fillStyle = bloom
    ctx.globalAlpha = base * alpha
    ctx.fillRect(bx - r, by - r, r * 2, r * 2)
  }
  if (rim > 0) {
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

/** The idle ladder's ring: one quick pencil circle of radius `r` about the origin, not quite closed, its end overrunning its start. */
export function paintRing(ctx: Ctx, r: number): void {
  const ring: Pt[] = [], count = Math.max(24, Math.round(r * 1.1))
  for (let i = 0; i <= count; i++) {
    const u = i / count, a = -2.3 + u * Math.PI * 2 * 0.97, far = r * (0.955 + 0.09 * u + 0.012 * drift(77, u * 6))
    ring.push([Math.cos(a) * far, Math.sin(a) * far * 0.975])
  }
  pencil(ctx, ring, { seed: 77, w: 2.1, alpha: 0.9 })
  pencil(ctx, ring.slice(2, Math.round(count * 0.8)).map(([x, y]) => [x * 1.014 + 0.3, y * 1.014] as const), { seed: 78, w: 1.4, alpha: 0.6 })
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
  const fibres = Math.round((width * height) / 800)
  for (let i = 0; i < fibres; i++) {
    const x = hash(seed, i) * width, y = hash(seed + 1, i) * height, a = hash(seed + 2, i) * Math.PI, len = 3 + hash(seed + 3, i) * 9
    ctx.strokeStyle = hash(seed + 4, i) < 0.5 ? 'rgba(255,252,240,0.3)' : 'rgba(150,120,80,0.08)'
    ctx.lineWidth = 0.5 + hash(seed + 5, i) * 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 1.5, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len)
    ctx.stroke()
  }
  for (let i = 0; i < 16; i++) {
    const x = hash(seed + 6, i) * width, y = hash(seed + 7, i) * height, r = 5 + hash(seed + 8, i) * (i < 3 ? 34 : 12)
    const spot = ctx.createRadialGradient(x, y, 0, x, y, r)
    spot.addColorStop(0, `rgba(170,120,60,${0.07 + 0.08 * hash(seed + 9, i)})`)
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
