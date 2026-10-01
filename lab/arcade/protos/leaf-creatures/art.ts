// Everything is drawn once, in wax crayon, and kept: the wood, the ferns, the
// wind, and each treasure as a small sprite. The look is block and stick
// crayon on toothy paper: every mark is a bundle of thin waxy streaks, and the
// paper's grain is cut back out of each layer so the white of the page shows
// through. Leaves are rubbings: the edge and the veins come up dark, the way
// they do when a crayon is rubbed over a real leaf under the paper.

import { TAU, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

type G = CanvasRenderingContext2D
export type Pt = [number, number]
export type Rand = () => number

export interface Sprite {
  img: HTMLCanvasElement
  w: number
  h: number
}

export type Kind = 'maple' | 'oak' | 'beech' | 'willow' | 'aspen' | 'twig' | 'cap' | 'acorn' | 'conker' | 'cone' | 'wing' | 'feather' | 'berry' | 'seed'
export type Cls = 'leaf' | 'stick' | 'eye' | 'nut' | 'cone' | 'wingy' | 'berry' | 'fluff'

// Half length along the piece's own x axis, half width across it.
export interface KindDef {
  len: number
  wid: number
  cls: Cls
  n: number
}

export const KINDS: Record<Kind, KindDef> = {
  maple: { len: 70, wid: 64, cls: 'leaf', n: 3 },
  oak: { len: 76, wid: 38, cls: 'leaf', n: 3 },
  beech: { len: 66, wid: 37, cls: 'leaf', n: 3 },
  willow: { len: 88, wid: 20, cls: 'leaf', n: 3 },
  aspen: { len: 52, wid: 48, cls: 'leaf', n: 2 },
  twig: { len: 70, wid: 13, cls: 'stick', n: 3 },
  cap: { len: 29, wid: 29, cls: 'eye', n: 2 },
  acorn: { len: 33, wid: 20, cls: 'nut', n: 2 },
  conker: { len: 30, wid: 29, cls: 'nut', n: 2 },
  cone: { len: 48, wid: 32, cls: 'cone', n: 2 },
  wing: { len: 54, wid: 20, cls: 'wingy', n: 2 },
  feather: { len: 70, wid: 20, cls: 'wingy', n: 3 },
  berry: { len: 30, wid: 28, cls: 'berry', n: 2 },
  seed: { len: 54, wid: 28, cls: 'fluff', n: 2 },
}

export interface Art {
  bg: HTMLCanvasElement
  pieces: Record<Kind, Sprite[]>
  lid: Sprite
  pupil: Sprite
  glint: Sprite
  fernBack: Sprite[]
  fernFront: Sprite[]
  branch: Sprite[]
  child: Sprite
  streak: Sprite
  swirl: Sprite
  motes: Sprite[]
  shade: Sprite
  sun: Sprite
}

// The bare earth where a creature is laid out, shared with the game.
export const EARTH = { x: 590, y: 458, rx: 258, ry: 166 }
// Where a creature beds down, under the ferns at the back of the clearing.
export const SPOTS: Pt[] = [
  [236, 240],
  [474, 232],
  [708, 234],
  [946, 240],
]

const PAPER = '#f4ecd9'
// The crayon box (close to the old Stockmar block set).
const C = {
  lemon: '#f3d64c',
  gold: '#f0b232',
  orange: '#e98a2f',
  vermilion: '#d9532d',
  carmine: '#b3353d',
  rust: '#ab592f',
  ochre: '#c99a40',
  brown: '#7c4c2d',
  umber: '#573727',
  ygreen: '#a8b64a',
  green: '#6a9646',
  bgreen: '#46877a',
  blue: '#557db3',
  ultra: '#46529b',
  violet: '#7a5797',
  rviolet: '#9a4c79',
  white: '#fffdf4',
  sky: '#bcd0e6',
}

const WIND = '#8fb2dc'

export function rng(seed: number): Rand {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rgb(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mixHex(a: string, b: string, t: number): string {
  const A = rgb(a)
  const B = rgb(b)
  const v = (i: number) => Math.round(lerp(A[i]!, B[i]!, t))
  return `#${((1 << 24) | (v(0) << 16) | (v(1) << 8) | v(2)).toString(16).slice(1)}`
}

// The scale of the canvas being painted. Painting is synchronous, so one
// module variable is enough.
let SC = 1
let TOOTH: HTMLCanvasElement | null = null

function canvas(w: number, h: number, scale: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * scale)
  c.height = Math.ceil(h * scale)
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.scale(scale, scale)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  SC = scale
  return [c, g]
}

// The paper's grain as a tile of holes: where it is opaque the crayon skipped.
function makeTooth(r: Rand): HTMLCanvasElement {
  const N = 256
  const c = document.createElement('canvas')
  c.width = N
  c.height = N
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  const img = g.createImageData(N, N)
  const coarse = new Float32Array(32 * 32)
  const mid = new Float32Array(128 * 128)
  for (let i = 0; i < coarse.length; i++) coarse[i] = r()
  for (let i = 0; i < mid.length; i++) mid[i] = r()
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const cx = x / 8
      const cy = y / 8
      const x0 = Math.floor(cx) % 32
      const y0 = Math.floor(cy) % 32
      const x1 = (x0 + 1) % 32
      const y1 = (y0 + 1) % 32
      const fx = cx - Math.floor(cx)
      const fy = cy - Math.floor(cy)
      const co = lerp(lerp(coarse[y0 * 32 + x0]!, coarse[y0 * 32 + x1]!, fx), lerp(coarse[y1 * 32 + x0]!, coarse[y1 * 32 + x1]!, fx), fy)
      const mi = mid[(y >> 1) * 128 + (x >> 1)]!
      const n = 0.4 * r() + 0.38 * mi + 0.22 * co
      const t = Math.min(1, Math.max(0, (n - 0.5) / 0.13))
      img.data[(y * N + x) * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255)
    }
  }
  g.putImageData(img, 0, 0)
  return c
}

// Paint a layer of crayon on its own sheet, bite the paper's tooth out of it,
// and lay it on `dst`. `bite` is how much of the grain shows: 1 for a light
// hand, less for a crayon pressed hard.
function crayon(dst: G, r: Rand, bite: number, paint: (g: G) => void): void {
  const c = document.createElement('canvas')
  c.width = dst.canvas.width
  c.height = dst.canvas.height
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.setTransform(dst.getTransform())
  g.lineCap = 'round'
  g.lineJoin = 'round'
  paint(g)
  if (TOOTH && bite > 0) {
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'destination-out'
    g.globalAlpha = bite
    const k = SC * 1.3
    g.scale(k, k)
    g.translate(-Math.floor(r() * 256), -Math.floor(r() * 256))
    const pat = g.createPattern(TOOTH, 'repeat')
    if (pat) {
      g.fillStyle = pat
      g.fillRect(0, 0, c.width / k + 256, c.height / k + 256)
    }
  }
  dst.save()
  dst.setTransform(1, 0, 0, 1, 0, 0)
  dst.globalAlpha = 1
  dst.drawImage(c, 0, 0)
  dst.restore()
}

// ---------------------------------------------------------------- marks

// One pull of a crayon along a line: a bundle of thin streaks, some pressed
// harder than others, a few skipped, with ragged ends. Wide for the flat of a
// block crayon, narrow for the point of a stick.
function band(g: G, r: Rand, pts: Pt[], width: number, color: string, pressure: number): void {
  const m = pts.length
  if (m < 2) return
  const nx: number[] = []
  const ny: number[] = []
  for (let i = 0; i < m; i++) {
    const a = pts[Math.max(0, i - 1)]!
    const b = pts[Math.min(m - 1, i + 1)]!
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    nx.push(-dy / l)
    ny.push(dx / l)
  }
  const n = Math.max(2, Math.round(width / 1.5))
  g.strokeStyle = color
  for (let k = 0; k < n; k++) {
    const u = (k + r()) / n - 0.5
    if (n > 4 && r() < 0.1) continue
    const edge = 1 - Math.abs(u * 2) ** 3 * 0.55
    g.globalAlpha = Math.min(1, pressure * (0.38 + 0.62 * r()) * edge)
    g.lineWidth = 1.1 + r() * 1.7
    const o = u * width
    const wob = (r() - 0.5) * Math.min(2, width * 0.12)
    const trim0 = r() * Math.min(7, width * 0.5)
    const trim1 = r() * Math.min(7, width * 0.5)
    g.beginPath()
    for (let i = 0; i < m; i++) {
      const p = pts[i]!
      let x = p[0] + nx[i]! * (o + (i % 2 ? wob : -wob))
      let y = p[1] + ny[i]! * (o + (i % 2 ? wob : -wob))
      if (i === 0) {
        x += ny[i]! * trim0
        y -= nx[i]! * trim0
        g.moveTo(x, y)
      } else {
        if (i === m - 1) {
          x -= ny[i]! * trim1
          y += nx[i]! * trim1
        }
        g.lineTo(x, y)
      }
    }
    g.stroke()
  }
  g.globalAlpha = 1
}

function seg(x1: number, y1: number, x2: number, y2: number, bow = 0): Pt[] {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const l = Math.hypot(x2 - x1, y2 - y1) || 1
  return [
    [x1, y1],
    [mx - ((y2 - y1) / l) * bow, my + ((x2 - x1) / l) * bow],
    [x2, y2],
  ]
}

function arcPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, rot = 0): Pt[] {
  const n = Math.max(3, Math.ceil((Math.abs(a1 - a0) * Math.max(rx, ry)) / 14), Math.ceil(Math.abs(a1 - a0) * 2.6))
  const pts: Pt[] = []
  const cr = Math.cos(rot)
  const sr = Math.sin(rot)
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n)
    const x = Math.cos(a) * rx
    const y = Math.sin(a) * ry
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr])
  }
  return pts
}

// Rub the flat of a crayon back and forth over a round area, all one way.
function hatch(g: G, r: Rand, cx: number, cy: number, radius: number, angle: number, bw: number, color: string, pressure: number, gap = 0.72): void {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  for (let o = -radius; o <= radius; o += bw * gap * (0.8 + r() * 0.4)) {
    const half = Math.sqrt(Math.max(0, radius * radius - o * o)) * (0.92 + r() * 0.16)
    if (half < 3) continue
    const px = cx - dy * o
    const py = cy + dx * o
    const tilt = (r() - 0.5) * 0.12
    const ex = Math.cos(angle + tilt)
    const ey = Math.sin(angle + tilt)
    band(g, r, seg(px - ex * half, py - ey * half, px + ex * half, py + ey * half, (r() - 0.5) * bw * 0.5), bw, color, pressure * (0.8 + r() * 0.3))
  }
}

// The same, over an oval, with each pull ending raggedly at its edge.
function hatchOval(g: G, r: Rand, cx: number, cy: number, rx: number, ry: number, angle: number, bw: number, color: string, pressure: number, gap = 0.72): void {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const reach = Math.max(rx, ry)
  const A = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
  for (let o = -reach; o <= reach; o += bw * gap * (0.8 + r() * 0.4)) {
    const B = 2 * ((-dy * o * dx) / (rx * rx) + (dx * o * dy) / (ry * ry))
    const Cc = (dy * o * dy * o) / (rx * rx) + (dx * o * dx * o) / (ry * ry) - 1
    const disc = B * B - 4 * A * Cc
    if (disc <= 0) continue
    const q = Math.sqrt(disc)
    const t0 = (-B - q) / (2 * A) - r() * 9 + 3
    const t1 = (-B + q) / (2 * A) + r() * 9 - 3
    if (t1 - t0 < 8) continue
    const px = cx - dy * o
    const py = cy + dx * o
    band(g, r, seg(px + dx * t0, py + dy * t0, px + dx * t1, py + dy * t1, (r() - 0.5) * bw * 0.6), bw, color, pressure * (0.85 + r() * 0.25))
  }
}

// Scribble round and round, the way a small hand colours in a ball.
function rounds(g: G, r: Rand, cx: number, cy: number, rx: number, ry: number, bw: number, color: string, pressure: number, inner = 0): void {
  for (let s = 1; s > inner; s -= (bw * 0.7) / Math.max(rx, ry)) {
    const a = r() * TAU
    band(g, r, arcPts(cx, cy, Math.max(1, rx * s - bw * 0.4), Math.max(1, ry * s - bw * 0.4), a, a + TAU * (0.8 + r() * 0.35)), bw, color, pressure * (0.8 + r() * 0.3))
  }
}

// A short stamp from the end of a block crayon.
function dab(g: G, r: Rand, x: number, y: number, len: number, wid: number, rot: number, color: string, pressure: number): void {
  const c = (Math.cos(rot) * len) / 2
  const s = (Math.sin(rot) * len) / 2
  band(g, r, seg(x - c, y - s, x + c, y + s, (r() - 0.5) * 2), wid, color, pressure)
}

function smooth(g: G, pts: Pt[]): void {
  const n = pts.length
  const last = pts[n - 1]!
  const first = pts[0]!
  g.beginPath()
  g.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2)
  for (let i = 0; i < n; i++) {
    const p = pts[i]!
    const q = pts[(i + 1) % n]!
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
  }
  g.closePath()
}

function poly(g: G, pts: Pt[]): void {
  g.beginPath()
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
  g.closePath()
}

function blobPts(r: Rand, cx: number, cy: number, rx: number, ry: number, wob = 0.08, n = 12): Pt[] {
  const pts: Pt[] = []
  const phase = r() * TAU
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU
    const k = 1 + (r() * 2 - 1) * wob
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return pts
}

function pick<T>(r: Rand, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(r() * items.length))]!
}

// ---------------------------------------------------------------- sprites

const SPR = 2

function sprite(w: number, h: number, paint: (g: G) => void): Sprite {
  const [c, g] = canvas(w, h, SPR)
  g.translate(w / 2, h / 2)
  paint(g)
  return { img: c, w, h }
}

export function drawSprite(g: G, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = 1): void {
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  if (sx !== 1 || sy !== 1) g.scale(sx, sy)
  g.drawImage(s.img, -s.w / 2, -s.h / 2, s.w, s.h)
  g.restore()
}

// The soft violet smudge a thing leaves on the ground under it.
function smudge(dst: G, r: Rand, shape: (g: G) => void): void {
  crayon(dst, r, 1, (g) => {
    g.translate(2.5, 4.5)
    shape(g)
    g.fillStyle = '#4b3558'
    g.globalAlpha = 0.34
    g.fill()
  })
}

// ---------------------------------------------------------------- leaves

interface LeafSpec {
  pts: Pt[]
  pointed: boolean
  veins: Pt[][]
  stem: Pt[]
}

const MAPLE: Pt[] = [
  [0, 1],
  [13, 0.68],
  [27, 0.4],
  [41, 0.72],
  [55, 0.95],
  [68, 0.68],
  [86, 0.38],
  [103, 0.5],
  [118, 0.66],
  [136, 0.44],
  [160, 0.3],
]

function mapleSpec(r: Rand, L: number): LeafSpec {
  const ox = -0.22 * L
  const k = L * 1.22
  const pts: Pt[] = [[ox - 0.2 * k, 0]]
  const at = (deg: number, rad: number, side: number): Pt => {
    const a = (deg * Math.PI) / 180
    const q = rad * (1 + (r() - 0.5) * 0.1)
    return [ox + Math.cos(a) * k * q, side * Math.sin(a) * k * q]
  }
  for (let i = MAPLE.length - 1; i >= 0; i--) pts.push(at(MAPLE[i]![0], MAPLE[i]![1], -1))
  for (let i = 1; i < MAPLE.length; i++) pts.push(at(MAPLE[i]![0], MAPLE[i]![1], 1))
  const veins: Pt[][] = []
  for (const [deg, rad] of [
    [0, 0.9],
    [55, 0.84],
    [-55, 0.84],
    [118, 0.56],
    [-118, 0.56],
  ] as Pt[]) {
    const a = (deg * Math.PI) / 180
    const ex = ox + Math.cos(a) * k * rad
    const ey = -Math.sin(a) * k * rad
    veins.push(seg(ox, 0, ex, ey, (r() - 0.5) * 4))
    if (rad > 0.7) {
      for (const side of [-1, 1]) {
        const t = 0.5
        const bx = lerp(ox, ex, t)
        const by = lerp(0, ey, t)
        const b = a + side * 0.6
        veins.push(seg(bx, by, bx + Math.cos(b) * k * 0.2, by - Math.sin(b) * k * 0.2))
      }
    }
  }
  return { pts, pointed: true, veins, stem: seg(ox - 0.16 * k, 0, -L - 16, (r() - 0.5) * 8, 2) }
}

function pinnate(r: Rand, L: number, hw: (t: number) => number, n: number, x0 = -0.86, x1 = 0.8): Pt[][] {
  const veins: Pt[][] = [seg(-L * 0.95, 0, L * 0.9, 0, (r() - 0.5) * 3)]
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const x = lerp(x0 * L, x1 * L, t)
    const w = hw((x / L + 1) / 2)
    for (const side of [-1, 1]) veins.push(seg(x, 0, x + w * 0.62, side * w * 0.8, side * 2))
  }
  return veins
}

function oakSpec(r: Rand, L: number, W2: number): LeafSpec {
  const env = (t: number) => W2 * (0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, t) ** 1.25))
  const top: Pt[] = []
  const N = 9
  for (let i = 0; i < N; i++) {
    const t = (i + 0.6) / (N + 0.2)
    const peak = i % 2 === 1
    top.push([-L + 2 * L * t, -env(t) * (peak ? 1 : 0.5) * (0.92 + r() * 0.16)])
  }
  const pts: Pt[] = [[-L, 0], ...top, [L, 0], ...top.map((p): Pt => [p[0] + (r() - 0.5) * 5, -p[1] * (0.92 + r() * 0.16)]).reverse()]
  return { pts, pointed: false, veins: pinnate(r, L, env, 4, -0.72, 0.7), stem: seg(-L + 3, 0, -L - 14, (r() - 0.5) * 6, 1.5) }
}

function bez(p0: Pt, c1: Pt, c2: Pt, p1: Pt, n: number, skipFirst: boolean): Pt[] {
  const out: Pt[] = []
  for (let i = skipFirst ? 1 : 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push([u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1]])
  }
  return out
}

function lanceSpec(r: Rand, L: number, W2: number, n: number, belly: number): LeafSpec {
  const k = 1 + (r() - 0.5) * 0.12
  const up = bez([-L, 0], [-L * belly, -W2 * 1.5 * k], [L * 0.35, -W2 * 1.15 * k], [L, 0], 12, false)
  const dn = bez([L, 0], [L * 0.35, W2 * 1.15 / k], [-L * belly, W2 * 1.5 / k], [-L, 0], 12, true)
  dn.pop()
  const hw = (t: number) => W2 * Math.sin(Math.PI * t) ** 0.7
  return { pts: [...up, ...dn], pointed: true, veins: pinnate(r, L, hw, n), stem: seg(-L + 2, 0, -L - 13, (r() - 0.5) * 6, 1.5) }
}

function aspenSpec(r: Rand, L: number): LeafSpec {
  const pts: Pt[] = []
  const n = 22
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI
    const tip = 0.16 * Math.exp(-((a / 0.22) ** 2))
    const notch = 0.14 * Math.exp(-(((Math.abs(a) - Math.PI) / 0.3) ** 2))
    const q = (0.84 + tip - notch) * (1 + (r() - 0.5) * 0.05)
    pts.push([Math.cos(a) * L * q, Math.sin(a) * L * q * 0.96])
  }
  const veins: Pt[][] = [seg(-L * 0.7, 0, L * 0.86, 0)]
  for (const a of [0.55, -0.55, 1.15, -1.15]) veins.push(seg(-L * 0.62, 0, -L * 0.62 + Math.cos(a) * L * 1.15, Math.sin(a) * L * 0.92, a > 0 ? -5 : 5))
  return { pts, pointed: false, veins, stem: seg(-L * 0.7, 0, -L - 20, (r() - 0.5) * 10, 3) }
}

// A leaf as a rubbing: one crayon rubbed all one way, a second laid over part
// of it, and the edge and veins standing up dark with a pale gap beside them.
function paintLeaf(dst: G, r: Rand, spec: LeafSpec, base: string, over: string, L: number, wid: number): void {
  const path = (g: G) => (spec.pointed ? poly(g, spec.pts) : smooth(g, spec.pts))
  const ridge = mixHex(base, '#4a2618', 0.55)
  smudge(dst, r, path)
  path(dst)
  dst.fillStyle = mixHex(base, PAPER, 0.66)
  dst.fill()
  crayon(dst, r, 0.92, (g) => {
    g.save()
    path(g)
    g.clip()
    const ang = (r() - 0.5) * 1.2 + 0.6
    const reach = Math.max(L, wid) * 1.25
    hatch(g, r, 0, 0, reach, ang, 9, base, 1, 0.6)
    hatch(g, r, L * 0.5, (r() - 0.5) * wid, reach * 0.62, ang + (r() - 0.5) * 0.3, 9, over, 0.62, 0.7)
    hatch(g, r, -L * 0.7, (r() - 0.5) * wid, reach * 0.3, ang, 8, over, 0.35, 0.8)
    g.restore()
  })
  crayon(dst, r, 0.4, (g) => {
    g.save()
    path(g)
    g.clip()
    for (const v of spec.veins) band(g, r, v.map((p): Pt => [p[0] + 1.6, p[1] + 1.8]), 2.6, mixHex(base, PAPER, 0.75), 0.75)
    g.restore()
    band(g, r, spec.stem, 3.4, ridge, 0.95)
    spec.veins.forEach((v, i) => band(g, r, v, i === 0 ? 3 : 2.2, ridge, i === 0 ? 0.95 : 0.8))
    path(g)
    g.strokeStyle = ridge
    g.lineWidth = 2.4
    g.globalAlpha = 0.9
    g.stroke()
  })
}

const LEAF_COLOURS: Record<'maple' | 'oak' | 'beech' | 'willow' | 'aspen', [string, string][]> = {
  maple: [
    [C.vermilion, C.carmine],
    [C.orange, C.vermilion],
    [C.gold, C.orange],
  ],
  oak: [
    ['#dfa738', C.rust],
    [C.rust, C.brown],
    ['#bd7b31', C.rust],
  ],
  beech: [
    [C.gold, C.orange],
    [C.orange, C.rust],
    [C.ygreen, C.gold],
  ],
  willow: [
    [C.lemon, C.ygreen],
    [C.ygreen, C.green],
    [C.gold, C.ochre],
  ],
  aspen: [
    [C.lemon, C.gold],
    [C.orange, C.vermilion],
  ],
}

function leafSprite(r: Rand, kind: 'maple' | 'oak' | 'beech' | 'willow' | 'aspen', variant: number): Sprite {
  const d = KINDS[kind]
  const [base, over] = LEAF_COLOURS[kind][variant]!
  return sprite(d.len * 2 + 56, d.wid * 2 + 36, (g) => {
    const spec = kind === 'maple' ? mapleSpec(r, d.len) : kind === 'oak' ? oakSpec(r, d.len, d.wid) : kind === 'aspen' ? aspenSpec(r, d.len) : kind === 'willow' ? lanceSpec(r, d.len, d.wid, 6, 0.5) : lanceSpec(r, d.len, d.wid, 5, 0.62)
    paintLeaf(g, r, spec, base, over, d.len, d.wid)
  })
}

// ---------------------------------------------------------------- other treasures

function twigSprite(r: Rand, variant: number): Sprite {
  const L = KINDS.twig.len
  return sprite(L * 2 + 30, 96, (dst) => {
    const bend = variant === 1 ? 13 : (r() - 0.5) * 6
    const limbs: { pts: Pt[]; w: number }[] = []
    if (variant === 2) {
      limbs.push({ pts: seg(-L, 2, L * 0.12, 0, 2), w: 12.5 })
      limbs.push({ pts: seg(L * 0.1, 0, L, -L * 0.36, -3), w: 9.5 })
      limbs.push({ pts: seg(L * 0.1, 0, L * 0.88, L * 0.3, 3), w: 9 })
    } else {
      limbs.push({ pts: seg(-L, 0, L, (r() - 0.5) * 8, bend), w: 12.5 })
      const sx = lerp(-0.2, 0.3, r()) * L
      const up = variant === 1 ? 1 : -1
      limbs.push({ pts: seg(sx, up * (bend > 6 ? 5 : 0), sx + 20, up * 20, 0), w: 8 })
    }
    const stroke = (g: G, pts: Pt[], w: number) => {
      g.beginPath()
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
      g.lineWidth = w
      g.stroke()
    }
    crayon(dst, r, 1, (g) => {
      g.translate(2.5, 4.5)
      g.strokeStyle = '#4b3558'
      g.globalAlpha = 0.34
      for (const l of limbs) stroke(g, l.pts, l.w + 2)
    })
    dst.strokeStyle = mixHex(C.ochre, PAPER, 0.4)
    for (const l of limbs) stroke(dst, l.pts, l.w + 1.5)
    crayon(dst, r, 0.7, (g) => {
      for (const l of limbs) {
        band(g, r, l.pts, l.w, '#96623a', 0.95)
        band(g, r, l.pts.map((p): Pt => [p[0], p[1] + l.w * 0.34]), l.w * 0.4, C.umber, 0.95)
        band(g, r, l.pts.map((p): Pt => [p[0], p[1] - l.w * 0.26]), l.w * 0.3, C.ochre, 0.8)
      }
      for (let i = 0; i < 4; i++) {
        const x = lerp(-L * 0.8, L * 0.7, r())
        dab(g, r, x, (r() - 0.5) * 3, 5, 3, 1.4, C.umber, 0.9)
      }
      const e = limbs[0]!.pts[0]!
      dab(g, r, e[0] + 1, e[1], 6, 4, 1.57, mixHex(C.ochre, PAPER, 0.3), 1)
    })
  })
}

function capSprite(r: Rand, variant: number): Sprite {
  return sprite(88, 88, (dst) => {
    const R = 27
    const rim = blobPts(r, 0, 0, R, R - 0.6, 0.035, 14)
    const col = variant === 0 ? C.brown : '#8a5a34'
    smudge(dst, r, (g) => smooth(g, rim))
    smooth(dst, rim)
    dst.fillStyle = mixHex(C.ochre, PAPER, 0.55)
    dst.fill()
    crayon(dst, r, 0.6, (g) => {
      // The knobbly outside, round and round.
      rounds(g, r, 0, 0, R, R, 5.5, col, 0.95, 0.64)
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU + r() * 0.2
        dab(g, r, Math.cos(a) * (R - 4), Math.sin(a) * (R - 4), 5.5, 3, a + 1.57, C.umber, 0.8)
      }
      // The pale hollow, shaded under its top lip so it reads as a cup.
      rounds(g, r, 0, 0.5, 16, 16, 4.5, C.ochre, 0.42)
      band(g, r, arcPts(0, 0.5, 15.5, 15.5, Math.PI * 1.08, Math.PI * 1.92), 5, C.umber, 0.7)
      band(g, r, arcPts(0, 1, 12.5, 12.5, Math.PI * 0.2, Math.PI * 0.8), 2.8, C.white, 0.7)
      band(g, r, seg(-R + 2, -7, -R - 6, -11), 3.8, C.umber, 0.9)
    })
  })
}

function lidSprite(r: Rand): Sprite {
  return sprite(48, 48, (dst) => {
    const pts = blobPts(r, 0, 0.5, 16.8, 16.8, 0.03, 12)
    smooth(dst, pts)
    dst.fillStyle = mixHex(C.rust, PAPER, 0.35)
    dst.fill()
    crayon(dst, r, 0.5, (g) => {
      g.save()
      smooth(g, pts)
      g.clip()
      hatch(g, r, 0, 0, 19, 0.1, 5, C.rust, 0.9, 0.6)
      hatch(g, r, 0, -10, 14, 0.1, 5, C.brown, 0.6, 0.7)
      g.restore()
      band(g, r, arcPts(0, -4, 12, 11, Math.PI * 0.14, Math.PI * 0.86), 3.4, C.umber, 1)
    })
  })
}

function pupilSprite(r: Rand): Sprite {
  return sprite(34, 34, (dst) => {
    crayon(dst, r, 0.25, (g) => {
      rounds(g, r, 0, 0, 10.4, 10.8, 3.6, '#3a2622', 1)
      rounds(g, r, 0, 0, 6, 6, 3, C.ultra, 0.35)
    })
    dst.fillStyle = C.white
    dst.beginPath()
    dst.arc(-3.1, -3.8, 2.4, 0, TAU)
    dst.fill()
  })
}

function glintSprite(r: Rand): Sprite {
  return sprite(120, 120, (dst) => {
    // Light caught on the rim: a milky ring, and short rays of white and
    // lemon pressed hard enough to show on the golden floor.
    crayon(dst, r, 0.5, (g) => {
      band(g, r, arcPts(0, 0, 33, 33, 0, TAU), 7, C.white, 0.9)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + 0.2
        const l = i % 2 ? 50 : 44
        band(g, r, seg(Math.cos(a) * 36, Math.sin(a) * 36, Math.cos(a) * l, Math.sin(a) * l), i % 2 ? 6 : 4.5, i % 2 ? C.white : C.lemon, 1)
      }
    })
  })
}

function acornSprite(r: Rand, variant: number): Sprite {
  return sprite(100, 76, (dst) => {
    const nut = blobPts(r, 6, 0, 25, 16.5, 0.03, 14)
    const cup = blobPts(r, -14, 0, 14, 18.5, 0.04, 12)
    const shape = (g: G) => {
      smooth(g, nut)
      g.fill()
      smooth(g, cup)
    }
    crayon(dst, r, 1, (g) => {
      g.translate(2.5, 4.5)
      g.fillStyle = '#4b3558'
      g.globalAlpha = 0.34
      shape(g)
      g.fill()
    })
    const nutCol = variant === 0 ? '#c48f3c' : C.ygreen
    dst.fillStyle = mixHex(nutCol, PAPER, 0.5)
    shape(dst)
    dst.fill()
    crayon(dst, r, 0.7, (g) => {
      g.save()
      smooth(g, nut)
      g.clip()
      for (let i = -3; i <= 3; i++) band(g, r, arcPts(-22, 0, 56, 6 + Math.abs(i) * 5.4, -0.5, 0.5).map((p): Pt => [p[0], i < 0 ? -Math.abs(p[1]) : Math.abs(p[1])]), 5.5, i > 1 ? C.rust : nutCol, 0.9)
      band(g, r, seg(-4, -8, 22, -7, -2), 3, C.white, 0.5)
      g.restore()
      dab(g, r, 31, 0, 5, 3, 0, C.umber, 1)
      g.save()
      smooth(g, cup)
      g.clip()
      hatch(g, r, -14, 0, 22, 1.2, 5, C.brown, 0.95, 0.6)
      hatch(g, r, -14, 0, 22, -0.4, 4, C.umber, 0.55, 1)
      g.restore()
      band(g, r, seg(-27, 0, -35, -3), 3.5, C.umber, 0.95)
    })
  })
}

function conkerSprite(r: Rand, variant: number): Sprite {
  return sprite(88, 86, (dst) => {
    const pts = blobPts(r, 0, 0, 28, 26.5, 0.035, 14)
    const col = variant === 0 ? '#8f4526' : '#7b3a2a'
    smudge(dst, r, (g) => smooth(g, pts))
    smooth(dst, pts)
    dst.fillStyle = mixHex(col, PAPER, 0.5)
    dst.fill()
    crayon(dst, r, 0.55, (g) => {
      g.save()
      smooth(g, pts)
      g.clip()
      rounds(g, r, 0, 0, 28, 27, 6, col, 1)
      rounds(g, r, 5, 6, 22, 20, 6, C.carmine, 0.35, 0.5)
      band(g, r, arcPts(0, 0, 23, 22, 0.3, 2.3), 6, C.umber, 0.6)
      g.restore()
    })
    // The pale patch where it sat in its shell, and a waxy shine.
    const patch = blobPts(r, -9, -9, 11, 8.5, 0.08, 10)
    smooth(dst, patch)
    dst.fillStyle = mixHex(C.ochre, PAPER, 0.62)
    dst.fill()
    crayon(dst, r, 0.8, (g) => {
      g.save()
      smooth(g, patch)
      g.clip()
      hatch(g, r, -9, -9, 13, 0.4, 4, C.ochre, 0.6, 0.8)
      g.restore()
      band(g, r, arcPts(0, 0, 20, 19, -0.9, -0.2), 2.6, C.white, 0.7)
    })
  })
}

function coneSprite(r: Rand, variant: number): Sprite {
  const d = KINDS.cone
  return sprite(d.len * 2 + 34, d.wid * 2 + 34, (dst) => {
    const pts: Pt[] = []
    const n = 18
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU
      const c = Math.cos(a)
      const taper = 1 - 0.24 * (c + 1) * 0.5
      pts.push([c * d.len * (0.96 + r() * 0.05), Math.sin(a) * d.wid * taper * (0.96 + r() * 0.06)])
    }
    const col = variant === 0 ? C.brown : '#8b5a33'
    smudge(dst, r, (g) => smooth(g, pts))
    smooth(dst, pts)
    dst.fillStyle = mixHex(C.ochre, PAPER, 0.42)
    dst.fill()
    crayon(dst, r, 0.65, (g) => {
      g.save()
      smooth(g, pts)
      g.clip()
      hatch(g, r, 0, 0, d.len * 1.1, 0.2, 7, col, 0.7, 0.7)
      // Scales: rows of little cups, each row shifted half a step.
      let row = 0
      for (let x = -d.len + 6; x < d.len; x += 11) {
        const taper = 1 - 0.24 * (x / d.len + 1) * 0.5
        const h = d.wid * taper * Math.sqrt(Math.max(0.05, 1 - (x / d.len) ** 2))
        for (let y = -h + (row % 2 ? 6 : 0); y < h + 6; y += 12) {
          band(g, r, arcPts(x, y, 7.5, 6.5, -1.25, 1.25), 3, C.umber, 0.95)
          dab(g, r, x + 3, y, 4, 3, 1.57, C.ochre, 0.55)
        }
        row++
      }
      g.restore()
      band(g, r, seg(-d.len + 2, 0, -d.len - 8, 2), 4, C.umber, 0.95)
    })
  })
}

function wingSprite(r: Rand, variant: number): Sprite {
  const d = KINDS.wing
  return sprite(d.len * 2 + 30, d.wid * 2 + 36, (dst) => {
    const L = d.len
    const blade: Pt[] = [...bez([-L + 16, -5], [-L * 0.2, -d.wid * 1.05], [L * 0.6, -d.wid * 1.25], [L, -2], 10, false), ...bez([L, -2], [L * 0.8, d.wid * 1.2], [L * 0.1, d.wid * 0.95], [-L + 16, 7], 10, true)]
    const nub = blobPts(r, -L + 11, 1, 12, 10, 0.05, 10)
    const shape = (g: G) => {
      poly(g, blade)
      g.fill()
      smooth(g, nub)
    }
    crayon(dst, r, 1, (g) => {
      g.translate(2.5, 4.5)
      g.fillStyle = '#4b3558'
      g.globalAlpha = 0.3
      shape(g)
      g.fill()
    })
    const pale = variant === 0 ? '#dcbf72' : '#d4c57a'
    dst.fillStyle = mixHex(pale, PAPER, 0.6)
    shape(dst)
    dst.fill()
    crayon(dst, r, 0.95, (g) => {
      g.save()
      poly(g, blade)
      g.clip()
      hatch(g, r, 10, 0, L, 0.12, 6, pale, 0.85, 0.7)
      hatch(g, r, L * 0.75, 2, L * 0.4, 0.12, 6, variant === 0 ? C.rviolet : C.orange, 0.3, 0.9)
      g.restore()
    })
    crayon(dst, r, 0.5, (g) => {
      g.save()
      poly(g, blade)
      g.clip()
      for (let i = 0; i < 9; i++) {
        const t = i / 8
        band(g, r, seg(lerp(-L + 22, L * 0.55, t), -d.wid * 0.55, lerp(-L + 44, L * 0.98, t), d.wid * 0.85, -4), 1.8, C.rust, 0.6)
      }
      g.restore()
      band(g, r, bez([-L + 14, -6], [-L * 0.2, -d.wid * 1.05], [L * 0.6, -d.wid * 1.25], [L, -2], 10, false), 3.4, C.brown, 0.95)
      g.save()
      smooth(g, nub)
      g.clip()
      rounds(g, r, -L + 11, 1, 12, 10, 4.5, C.brown, 0.95)
      g.restore()
      rounds(g, r, -L + 11, 1, 12.5, 10.5, 2.4, C.umber, 0.8, 0.9)
    })
  })
}

function featherSprite(r: Rand, variant: number): Sprite {
  const d = KINDS.feather
  return sprite(d.len * 2 + 30, d.wid * 2 + 36, (dst) => {
    const L = d.len
    const vane: Pt[] = [...bez([-L + 26, 0], [-L * 0.35, -d.wid * 1.5], [L * 0.55, -d.wid * 1.1], [L, 0], 12, false), ...bez([L, 0], [L * 0.55, d.wid * 1.0], [-L * 0.3, d.wid * 1.35], [-L + 26, 0], 12, true)]
    const [a, b, tip] = variant === 0 ? [C.blue, C.ultra, C.white] : variant === 1 ? [C.ochre, C.brown, C.umber] : ['#cfc8bd', C.violet, C.violet]
    smudge(dst, r, (g) => poly(g, vane))
    poly(dst, vane)
    dst.fillStyle = mixHex(a, PAPER, 0.62)
    dst.fill()
    crayon(dst, r, 0.9, (g) => {
      g.save()
      poly(g, vane)
      g.clip()
      // Barbs: short pulls leaning toward the tip, either side of the quill.
      for (let x = -L + 22; x < L; x += 5) {
        const t = (x + L) / (2 * L)
        const bar = variant === 2 ? t > 0.72 : Math.floor(t * 9) % 2 === 0
        const col = bar ? b : a
        for (const side of [-1, 1]) band(g, r, seg(x, 0, x + 15, side * d.wid * 1.1, side * 2), 4.6, col, bar ? 0.8 : 0.9)
      }
      if (variant === 0) hatch(g, r, L * 0.8, 0, 16, 0.5, 5, tip, 0.7)
      g.restore()
    })
    crayon(dst, r, 0.45, (g) => {
      band(g, r, seg(-L - 6, 1, L - 4, 0, -2.5), 2.8, mixHex(PAPER, C.ochre, 0.25), 1)
      band(g, r, seg(-L - 8, 2.4, -L + 30, 1.2), 2, mixHex(b, '#3a2622', 0.4), 0.8)
    })
  })
}

function berrySprite(r: Rand, variant: number): Sprite {
  return sprite(92, 88, (dst) => {
    const col = variant === 0 ? C.vermilion : C.carmine
    const spots: Pt[] = [
      [6, -12],
      [15, 8],
      [-7, 11],
    ]
    const balls = spots.map((p) => blobPts(r, p[0], p[1], 12, 11.6, 0.04, 10))
    const stalks = spots.map((p) => seg(-26, -2, p[0] - 5, p[1] - 3, (r() - 0.5) * 5))
    crayon(dst, r, 1, (g) => {
      g.translate(2.5, 4.5)
      g.fillStyle = '#4b3558'
      g.globalAlpha = 0.32
      for (const b of balls) {
        smooth(g, b)
        g.fill()
      }
    })
    crayon(dst, r, 0.6, (g) => {
      for (const s of stalks) band(g, r, s, 3, C.brown, 0.95)
      band(g, r, seg(-26, -2, -34, -1), 4, C.umber, 0.95)
    })
    dst.fillStyle = mixHex(col, PAPER, 0.5)
    for (const b of balls) {
      smooth(dst, b)
      dst.fill()
    }
    crayon(dst, r, 0.6, (g) => {
      spots.forEach((p, i) => {
        g.save()
        smooth(g, balls[i]!)
        g.clip()
        rounds(g, r, p[0], p[1], 12, 12, 4.5, col, 1)
        band(g, r, arcPts(p[0], p[1], 9, 9, 0.3, 2.2), 4, C.carmine, 0.55)
        g.restore()
        band(g, r, arcPts(p[0], p[1], 7.5, 7.5, -2.5, -1.7), 2.4, C.white, 0.85)
        dab(g, r, p[0] + 6.5, p[1] + 5, 3, 2.4, 0.6, C.umber, 0.9)
      })
    })
  })
}

function seedSprite(r: Rand, variant: number): Sprite {
  const d = KINDS.seed
  return sprite(d.len * 2 + 30, d.wid * 2 + 34, (dst) => {
    const cx = 24
    const R = 26
    const head = blobPts(r, cx, 0, R, R, 0.03, 14)
    smudge(dst, r, (g) => smooth(g, head))
    crayon(dst, r, 0.6, (g) => {
      band(g, r, seg(-d.len, 2, cx - 4, 0, variant ? 5 : -4), 3.6, '#8f8a4a', 0.95)
    })
    smooth(dst, head)
    dst.fillStyle = '#f7f1e2'
    dst.globalAlpha = 0.94
    dst.fill()
    dst.globalAlpha = 1
    crayon(dst, r, 0.7, (g) => {
      const n = 26
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + r() * 0.1
        const l = R * (0.82 + r() * 0.14)
        band(g, r, seg(cx + Math.cos(a) * 5, Math.sin(a) * 5, cx + Math.cos(a) * l, Math.sin(a) * l), 1.6, i % 3 ? '#b7a98d' : '#9d92a8', 0.75)
        dab(g, r, cx + Math.cos(a) * l, Math.sin(a) * l, 3, 2.6, a + 1.57, i % 2 ? '#a89a80' : C.ochre, 0.8)
      }
      for (let i = 0; i < 12; i++) {
        const a = r() * TAU
        const l = R * (0.4 + r() * 0.3)
        dab(g, r, cx + Math.cos(a) * l, Math.sin(a) * l, 3, 2.4, a + 1.57, '#c2b59a', 0.7)
      }
      rounds(g, r, cx, 0, 5, 5, 3, C.brown, 0.9)
    })
  })
}

// ---------------------------------------------------------------- the wood

const BG = 1.5

function paper(g: G, r: Rand): void {
  g.fillStyle = PAPER
  g.fillRect(0, 0, W, H)
  // Fibres and flecks, so even the bare page has a hand-made grain.
  for (let i = 0; i < 2600; i++) {
    const x = r() * W
    const y = r() * H
    const a = r() * TAU
    const l = 2 + r() * 7
    g.globalAlpha = 0.05 + r() * 0.07
    g.strokeStyle = r() < 0.5 ? '#b89f7a' : '#ffffff'
    g.lineWidth = 0.7 + r() * 0.6
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
  g.globalAlpha = 1
}

function trunk(g: G, r: Rand, x: number, w: number, yb: number, cols: [string, number][], lean = 0): void {
  for (const [col, pressure] of cols) {
    const strokes = Math.max(1, Math.round(w / 13))
    for (let i = 0; i < strokes; i++) {
      const o = strokes === 1 ? 0 : lerp(-w / 2 + 7, w / 2 - 7, i / (strokes - 1)) + (r() - 0.5) * 4
      const flare = (o / (w / 2 || 1)) * w * 0.16
      band(g, r, [[x + o + lean, 12 + r() * 8], [x + o + lean * 0.4 + (r() - 0.5) * 3, yb * 0.55], [x + o + flare, yb + (r() - 0.5) * 8]], Math.min(16, w * 0.8), col, pressure * (0.85 + r() * 0.3))
    }
  }
}

function paintBackdrop(r: Rand): HTMLCanvasElement {
  const [c, dst] = canvas(W, H, BG)
  paper(dst, r)
  const M = 12
  const inEarth = (x: number, y: number, k = 1) => ((x - EARTH.x) / (EARTH.rx * k)) ** 2 + ((y - EARTH.y) / (EARTH.ry * k)) ** 2 < 1

  // A light hand: the low sun through the trees, the far wood, the first coat
  // of the floor.
  crayon(dst, r, 1, (g) => {
    for (let i = 0; i < 20; i++) {
      const rad = 46 + i * 21 + r() * 8
      const a0 = 0.06 + r() * 0.5
      const a1 = Math.PI - 0.06 - r() * 0.5
      band(g, r, arcPts(600, -6, rad * 1.5, rad * 0.62, a0, a1), 24, i < 7 ? C.lemon : C.gold, 0.62 - i * 0.02)
    }
    for (let i = 0; i < 11; i++) {
      const left = i % 2 === 0
      const x = left ? lerp(60, 380, r()) : lerp(800, 1120, r())
      band(g, r, seg(x, 30 + r() * 40, x + (r() - 0.5) * 30, 190 + r() * 40, (r() - 0.5) * 10), 22, C.sky, 0.4)
    }
    const far = [150, 205, 300, 352, 430, 512, 566, 640, 700, 792, 842, 905, 986, 1040]
    for (const x of far) trunk(g, r, x + (r() - 0.5) * 18, 9 + r() * 12, 205 + r() * 26, [[r() < 0.5 ? '#a9a3c9' : '#b7a0b8', 0.5]], (r() - 0.5) * 14)
    // The floor: long pulls with the flat of a golden block, each bowed a
    // little, the way an arm swings.
    for (let y = 226; y < H - M; y += 15) {
      let x = M + r() * 20
      while (x < W - M - 30) {
        const l = Math.min(W - M - 6 - x, 220 + r() * 260)
        const t = (y - 226) / (H - 226)
        band(g, r, seg(x, y + (r() - 0.5) * 6, x + l, y + (r() - 0.5) * 12, (r() - 0.5) * 16), 21, t < 0.25 ? C.gold : r() < 0.5 ? C.ochre : '#d7a544', 0.5 + t * 0.12)
        x += l * (0.72 + r() * 0.2)
      }
    }
  })

  // A firmer hand: the nearer trunks, the leaf fall on the floor, the canopy.
  crayon(dst, r, 0.85, (g) => {
    for (const [x, w, yb] of [
      [262, 40, 238],
      [398, 30, 226],
      [612, 34, 222],
      [826, 28, 228],
      [900, 44, 240],
    ] as [number, number, number][]) {
      trunk(g, r, x, w, yb, [
        [C.brown, 0.6],
        [C.violet, 0.3],
      ])
      for (let i = 0; i < 3; i++) band(g, r, seg(x + (r() - 0.5) * w * 0.7, 20 + r() * 60, x + (r() - 0.5) * w * 0.7, 120 + r() * 90, (r() - 0.5) * 5), 2.6, C.umber, 0.5)
    }
    // Russet and brown laid over the gold in patches, thicker toward the
    // edges of the page, so the middle stays light.
    for (let i = 0; i < 64; i++) {
      const x = M + 20 + r() * (W - 2 * M - 40)
      const y = 250 + r() * (H - 270 - M)
      if (inEarth(x, y, 1.08)) continue
      const far = Math.hypot((x - EARTH.x) / 590, (y - EARTH.y) / 400)
      const col = pick(r, [C.rust, C.orange, C.ochre, C.ochre, C.vermilion, C.rust, C.gold])
      const ang = (r() - 0.5) * 0.5
      const n = 2 + Math.floor(r() * 3)
      for (let k = 0; k < n; k++) {
        const l = 60 + r() * 130
        const yy = y + k * 13
        if (yy > H - M - 8) break
        band(g, r, seg(x - Math.cos(ang) * l, yy - Math.sin(ang) * l, x + Math.cos(ang) * l, yy + Math.sin(ang) * l, (r() - 0.5) * 10), 18, col, 0.13 + far * 0.2)
      }
    }
    // Cool shadow at the feet of the trees and in the near corners.
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1
      const x = side < 0 ? M + r() * 150 : W - M - r() * 150
      const y = 236 + r() * 60
      band(g, r, seg(x - 60, y, x + 60, y + (r() - 0.5) * 16, (r() - 0.5) * 8), 18, C.violet, 0.28)
    }
    // Fallen leaves as small stamps of colour, never as big as a treasure.
    for (let i = 0; i < 400; i++) {
      const x = M + 6 + r() * (W - 2 * M - 12)
      const y = 222 + r() * (H - 222 - M - 6)
      if (inEarth(x, y, 0.97)) continue
      const depth = (y - 222) / (H - 222)
      dab(g, r, x, y, 7 + depth * 9 + r() * 5, 4 + depth * 3, r() * Math.PI, pick(r, [C.gold, C.orange, C.vermilion, C.rust, C.lemon, C.brown, C.ochre, C.carmine]), 0.5 + r() * 0.3)
    }
    // The canopy: stamps of gold, orange and red, thick in the corners and
    // thin over the middle where the light comes through.
    for (let i = 0; i < 760; i++) {
      const x = M + r() * (W - 2 * M)
      const edge = Math.abs(x - W / 2) / (W / 2)
      const depth = 36 + edge * edge * 130 + (edge > 0.5 ? 50 : 0)
      const y = M + r() ** 1.4 * depth
      if (edge < 0.3 && r() < 0.55) continue
      dab(g, r, x, y, 15 + r() * 11, 9 + r() * 4, r() * Math.PI, pick(r, [C.gold, C.gold, C.orange, C.orange, C.vermilion, C.lemon, C.ygreen, C.carmine, C.rust]), 0.6 + r() * 0.35)
    }
    // Tufts of grass at the near corners, with the point of a green stick.
    for (const [bx, by] of [
      [58, 792],
      [1118, 790],
      [28, 300],
      [1152, 310],
    ] as Pt[]) {
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.2 + (r() - 0.5) * 0.15
        const l = 26 + r() * 30
        band(g, r, seg(bx + (i - 4) * 4, by, bx + (i - 4) * 4 + Math.cos(a) * l, by + Math.sin(a) * l, (i - 4) * 1.5), 3.2, pick(r, [C.green, C.ygreen, C.bgreen, C.ochre]), 0.9)
      }
    }
  })

  // A crayon pressed hard: the two great trunks that frame the clearing, and
  // the bare earth, coloured round and round.
  crayon(dst, r, 0.55, (g) => {
    for (const side of [-1, 1]) {
      const x = side < 0 ? 44 : W - 40
      const w = side < 0 ? 96 : 104
      trunk(g, r, x, w, 262, [
        [C.brown, 0.85],
        [C.umber, 0.6],
        [C.ultra, 0.25],
      ], side * -8)
      for (let i = 0; i < 9; i++) {
        const o = (r() - 0.5) * w * 0.8
        band(g, r, seg(x + o, 24 + r() * 60, x + o + (r() - 0.5) * 8, 110 + r() * 130, (r() - 0.5) * 6), 3, r() < 0.5 ? C.umber : C.ochre, 0.7)
      }
      // Roots running out into the leaves.
      for (let i = 0; i < 4; i++) {
        const out = -side * (40 + i * 34 + r() * 14)
        band(g, r, [[x - side * 10, 232 + i * 5], [x + out * 0.6, 262 + i * 5], [x + out, 276 + i * 7 + r() * 6]], 13 - i * 2, C.brown, 0.85)
        band(g, r, [[x - side * 10, 238 + i * 5], [x + out * 0.6, 268 + i * 5], [x + out, 281 + i * 7]], 5, C.umber, 0.6)
      }
    }
  })
  crayon(dst, r, 0.42, (g) => {
    const E = EARTH
    // First rubbed over with the flat of a dark block, then gone round and
    // round with a firmer hand, pressing hardest at the rim.
    hatchOval(g, r, E.x, E.y, E.rx - 6, E.ry - 5, -0.22, 22, '#603e2c', 0.95, 0.5)
    hatchOval(g, r, E.x, E.y, E.rx - 10, E.ry - 8, 0.42, 22, '#4c322a', 0.7, 0.55)
    hatchOval(g, r, E.x, E.y, E.rx - 16, E.ry - 12, 1.3, 22, '#603e2c', 0.45, 0.7)
    hatchOval(g, r, E.x - 20, E.y + 10, E.rx * 0.7, E.ry * 0.7, -0.22, 20, C.ultra, 0.14, 0.9)
    for (let s = 1; s > 0.25; s -= 0.1 + r() * 0.06) {
      const pieces = s > 0.6 ? 4 : 2
      for (let k = 0; k < pieces; k++) {
        const a = r() * TAU
        const span = (TAU / pieces) * (0.6 + r() * 0.7)
        const wob = 1 + (r() - 0.5) * 0.06
        band(g, r, arcPts(E.x + (r() - 0.5) * 8, E.y + (r() - 0.5) * 6, (E.rx - 12) * s * wob, (E.ry - 11) * s * wob, a, a + span), 18, s > 0.88 ? '#47302a' : r() < 0.6 ? C.brown : C.umber, s > 0.88 ? 0.75 : 0.35)
      }
    }
    for (let i = 0; i < 7; i++) {
      const a = r() * TAU
      const s = 0.3 + r() * 0.6
      band(g, r, arcPts(E.x, E.y, E.rx * s, E.ry * s, a, a + 0.5 + r() * 0.6), 16, C.violet, 0.22)
    }
  })
  // Crumbs and a few stray leaves on the earth's rim, so its edge is not a
  // drawn line.
  crayon(dst, r, 0.8, (g) => {
    const E = EARTH
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU
      const s = 0.2 + r() * 0.75
      dab(g, r, E.x + Math.cos(a) * E.rx * s, E.y + Math.sin(a) * E.ry * s, 3 + r() * 3, 2.6, r() * Math.PI, r() < 0.5 ? C.umber : C.ochre, 0.7)
    }
    for (let i = 0; i < 46; i++) {
      const a = r() * TAU
      const s = 0.97 + r() * 0.1
      dab(g, r, E.x + Math.cos(a) * E.rx * s, E.y + Math.sin(a) * E.ry * s, 10 + r() * 8, 5.5, r() * Math.PI, pick(r, [C.gold, C.orange, C.rust, C.ochre, C.vermilion]), 0.75)
    }
  })
  return c
}

// ---------------------------------------------------------------- ferns and branches

function frond(g: G, r: Rand, x0: number, y0: number, ang: number, len: number, curl: number, cols: string[], size = 1): void {
  const N = Math.max(6, Math.round(len / 8))
  const spine: Pt[] = []
  const dirs: number[] = []
  let x = x0
  let y = y0
  let a = ang
  for (let i = 0; i <= N; i++) {
    spine.push([x, y])
    dirs.push(a)
    a += (curl / N) * (0.5 + (i / N) * 1.5)
    x += (Math.cos(a) * len) / N
    y += (Math.sin(a) * len) / N
  }
  for (let i = 1; i < N; i++) {
    const t = i / N
    const pl = 24 * size * Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.15)) ** 0.7 * (1 - t * 0.35)
    const p = spine[i]!
    const col = cols[Math.min(cols.length - 1, Math.floor((t + (r() - 0.5) * 0.3) * cols.length + 0.2))] ?? cols[0]!
    for (const side of [-1, 1]) {
      const pa = dirs[i]! + side * 1.12
      band(g, r, seg(p[0], p[1], p[0] + Math.cos(pa) * pl, p[1] + Math.sin(pa) * pl, side * 1.5), 4.4, col, 0.95)
    }
  }
  band(g, r, spine, 3, mixHex(cols[0]!, C.umber, 0.45), 0.9)
}

const FERN_GREENS = [
  [C.green, C.green, C.ygreen, C.gold],
  [C.bgreen, C.green, C.ygreen],
  [C.ygreen, C.gold, C.orange],
  [C.green, C.ygreen, C.ochre, C.rust],
]

function fernBack(r: Rand): Sprite {
  return sprite(320, 200, (dst) => {
    dst.translate(0, 92)
    crayon(dst, r, 0.7, (g) => {
      const n = 7
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1)
        const ang = lerp(-Math.PI + 0.42, -0.42, t) + (r() - 0.5) * 0.14
        const side = t < 0.5 ? -1 : 1
        frond(g, r, (t - 0.5) * 34, 0, ang, 96 + r() * 44 + (1 - Math.abs(t - 0.5) * 2) * 26, side * (0.5 + r() * 0.5), FERN_GREENS[(i + Math.floor(r() * 4)) % 4]!, 0.95)
      }
    })
  })
}

function fernFront(r: Rand): Sprite {
  return sprite(320, 200, (dst) => {
    dst.translate(0, 92)
    crayon(dst, r, 0.7, (g) => {
      frond(g, r, -118, 2, -0.72, 118, 0.85, FERN_GREENS[0]!, 0.9)
      frond(g, r, 122, 0, -Math.PI + 0.66, 112, -0.9, FERN_GREENS[3]!, 0.9)
      frond(g, r, -128, 2, -1.25, 64, 0.4, FERN_GREENS[1]!, 0.7)
      frond(g, r, 132, 0, -Math.PI + 1.2, 60, -0.4, FERN_GREENS[2]!, 0.7)
    })
  })
}

// A bough hanging in from a top corner; `dir` is 1 for the left corner.
function branchSprite(r: Rand, dir: number): Sprite {
  return sprite(380, 220, (dst) => {
    dst.translate(-dir * 170, -96)
    crayon(dst, r, 0.75, (g) => {
      const main: Pt[] = [[0, 0], [dir * 110, 40], [dir * 220, 64], [dir * 318, 112]]
      band(g, r, main, 7, C.brown, 0.95)
      band(g, r, main.map((p): Pt => [p[0], p[1] + 2.5]), 3, C.umber, 0.8)
      const twigs: Pt[][] = [seg(dir * 110, 40, dir * 150, 122, dir * 8), seg(dir * 220, 64, dir * 244, 150, dir * 6), seg(dir * 170, 54, dir * 214, 18, 0)]
      for (const t of twigs) band(g, r, t, 3.4, C.brown, 0.9)
      for (const line of [main, ...twigs]) {
        const a = line[0]!
        const b = line[line.length - 1]!
        const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 13)
        for (let i = 1; i <= n; i++) {
          const t = i / n
          const j = Math.min(line.length - 2, Math.floor(t * (line.length - 1)))
          const u = t * (line.length - 1) - j
          const x = lerp(line[j]![0], line[j + 1]![0], u) + (r() - 0.5) * 26
          const y = lerp(line[j]![1], line[j + 1]![1], u) + (r() - 0.2) * 30
          dab(g, r, x, y, 15 + r() * 8, 8 + r() * 3, r() * Math.PI, pick(r, [C.gold, C.orange, C.orange, C.vermilion, C.lemon, C.carmine, C.ygreen]), 0.9)
        }
      }
    })
  })
}

// ---------------------------------------------------------------- the wind

// A wind child, barely there: a round head and a long gown of pale strokes
// that ends in a curl. White and sky crayon, so it shows only where it crosses
// colour.
function childSprite(r: Rand): Sprite {
  return sprite(270, 120, (dst) => {
    // White crayon pressed over the page: a milky shape the lines sit on.
    crayon(dst, r, 0.6, (g) => {
      const top: Pt[] = []
      const bot: Pt[] = []
      for (let i = 0; i <= 14; i++) {
        const t = i / 14
        const w = 15 * (1 - t * 0.2) * (0.5 + t * 1.3) * (1 - t ** 3 * 0.7)
        const y = Math.sin(t * 5.2 + 1) * 8 * t
        top.push([78 - t * 190, y - w])
        bot.unshift([78 - t * 190, y + w])
      }
      g.globalAlpha = 0.62
      g.fillStyle = C.white
      smooth(g, [...top, ...bot])
      g.fill()
      g.globalAlpha = 0.9
      g.beginPath()
      g.arc(90, -2, 15, 0, TAU)
      g.fill()
    })
    crayon(dst, r, 0.8, (g) => {
      const cols = [WIND, C.white, C.sky, WIND, C.white, '#b9a7d6']
      for (let k = 0; k < 6; k++) {
        const o = (k - 2.5) * 5
        const pts: Pt[] = []
        for (let i = 0; i <= 16; i++) {
          const t = i / 16
          const spread = 1 - t * 0.55
          pts.push([78 - t * 196, o * spread * (0.4 + t * 1.6) + Math.sin(t * 5.2 + k * 0.5) * 9 * t])
        }
        band(g, r, pts, 7, cols[k]!, 0.95)
      }
      band(g, r, arcPts(-112, -4, 15, 13, 0.4, 5.2), 4.5, WIND, 0.9)
      band(g, r, arcPts(-112, -4, 8, 7, 1.2, 5.6), 3.5, C.white, 0.9)
      // Hair blown back, an arm held out ahead.
      for (let k = 0; k < 4; k++) band(g, r, seg(82, -10 + k * 2, 44 - k * 8, -24 - k * 4, -6), 3.2, k % 2 ? C.white : '#f1d98a', 0.9)
      band(g, r, seg(84, 8, 116, 15, 3), 4, WIND, 0.85)
      rounds(g, r, 90, -2, 13, 13, 4.5, C.white, 1)
      rounds(g, r, 90, -2, 14, 14, 2.6, WIND, 0.8, 0.84)
    })
    crayon(dst, r, 0.4, (g) => {
      dab(g, r, 92, -4, 2.6, 2.4, 0, C.blue, 0.6)
      dab(g, r, 98.5, -4, 2.6, 2.4, 0, C.blue, 0.6)
    })
  })
}

// One long breath of wind: a pale line that loops once.
function streakSprite(r: Rand): Sprite {
  return sprite(480, 120, (dst) => {
    crayon(dst, r, 0.8, (g) => {
      for (let k = -1; k < 3; k++) {
        const pts: Pt[] = []
        for (let i = 0; i <= 44; i++) {
          const t = i / 44
          let x = -220 + t * 440
          let y = Math.sin(t * 5.5 + k) * 12 + k * 13 - 6
          const u = (t - 0.5) / 0.2
          if (u > 0 && u < 1) {
            x -= Math.sin(u * TAU) * 30
            y -= (1 - Math.cos(u * TAU)) * 20
          }
          pts.push([x, y])
        }
        if (k < 0) {
          // A broad milky pull under the lines.
          band(g, r, pts.map((p): Pt => [p[0], p[1] + 12]), 22, C.white, 0.6)
          continue
        }
        band(g, r, pts, k === 0 ? 7.5 : 5, k === 1 ? WIND : C.white, 0.95)
      }
    })
  })
}

// A little curl of air for under the finger.
function swirlSprite(r: Rand): Sprite {
  return sprite(90, 90, (dst) => {
    crayon(dst, r, 0.8, (g) => {
      const pts: Pt[] = []
      for (let i = 0; i <= 30; i++) {
        const t = i / 30
        const a = t * TAU * 1.6
        const rad = 6 + t * 26
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad])
      }
      band(g, r, pts, 4.5, C.white, 0.95)
      band(g, r, pts.map((p): Pt => [p[0] * 0.8 + 3, p[1] * 0.8 + 2]), 3, WIND, 0.8)
    })
  })
}

function moteSprite(r: Rand, col: string): Sprite {
  return sprite(30, 20, (dst) => {
    crayon(dst, r, 0.7, (g) => {
      dab(g, r, 0, 0, 16, 8, 0, col, 1)
      band(g, r, seg(-8, 0, 8, 0), 1.6, mixHex(col, '#4a2618', 0.5), 0.8)
    })
  })
}

function shadeSprite(r: Rand): Sprite {
  return sprite(200, 90, (dst) => {
    crayon(dst, r, 1, (g) => {
      g.save()
      g.beginPath()
      g.ellipse(0, 0, 90, 34, 0, 0, TAU)
      g.clip()
      hatch(g, r, 0, 0, 96, 0.12, 9, '#4b3558', 0.75, 0.7)
      g.restore()
    })
  })
}

function sunSprite(r: Rand): Sprite {
  const [c, dst] = canvas(560, 380, 1)
  dst.translate(280, 190)
  crayon(dst, r, 1, (g) => {
    for (let i = 0; i < 7; i++) {
      const x = (r() - 0.5) * 380
      const y = (r() - 0.5) * 220
      g.save()
      smooth(g, blobPts(r, x, y, 60 + r() * 50, 34 + r() * 26, 0.2, 9))
      g.clip()
      hatch(g, r, x, y, 120, -0.9, 14, C.lemon, 0.6, 0.8)
      g.restore()
    }
  })
  return { img: c, w: 560, h: 380 }
}

export function makeArt(seed: number): Art {
  const r = rng(seed * 977 + 31)
  TOOTH = makeTooth(rng(4242))
  const many = (n: number, fn: (i: number) => Sprite) => Array.from({ length: n }, (_, i) => fn(i))
  const pieces: Record<Kind, Sprite[]> = {
    maple: many(KINDS.maple.n, (i) => leafSprite(r, 'maple', i)),
    oak: many(KINDS.oak.n, (i) => leafSprite(r, 'oak', i)),
    beech: many(KINDS.beech.n, (i) => leafSprite(r, 'beech', i)),
    willow: many(KINDS.willow.n, (i) => leafSprite(r, 'willow', i)),
    aspen: many(KINDS.aspen.n, (i) => leafSprite(r, 'aspen', i)),
    twig: many(KINDS.twig.n, (i) => twigSprite(r, i)),
    cap: many(KINDS.cap.n, (i) => capSprite(r, i)),
    acorn: many(KINDS.acorn.n, (i) => acornSprite(r, i)),
    conker: many(KINDS.conker.n, (i) => conkerSprite(r, i)),
    cone: many(KINDS.cone.n, (i) => coneSprite(r, i)),
    wing: many(KINDS.wing.n, (i) => wingSprite(r, i)),
    feather: many(KINDS.feather.n, (i) => featherSprite(r, i)),
    berry: many(KINDS.berry.n, (i) => berrySprite(r, i)),
    seed: many(KINDS.seed.n, (i) => seedSprite(r, i)),
  }
  const art: Art = {
    pieces,
    lid: lidSprite(r),
    pupil: pupilSprite(r),
    glint: glintSprite(r),
    fernBack: many(SPOTS.length, () => fernBack(r)),
    fernFront: many(SPOTS.length, () => fernFront(r)),
    branch: [branchSprite(r, 1), branchSprite(r, -1)],
    child: childSprite(r),
    streak: streakSprite(r),
    swirl: swirlSprite(r),
    motes: [C.gold, C.orange, C.vermilion, C.lemon, C.rust, C.carmine].map((col) => moteSprite(r, col)),
    shade: shadeSprite(r),
    sun: sunSprite(r),
    bg: paintBackdrop(r),
  }
  TOOTH = null
  return art
}
