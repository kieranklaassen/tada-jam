// Everything painted once and kept: the wood, the tree, and each gathered
// thing as a small sprite with a daylight and a dusk version. Shapes are
// wobbly on purpose and edges are soft; nothing here runs per frame except
// `drawSprite`.

import { TAU, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { CX, HOLLOW, PUDDLE, farHillY, floorBack, hillY, moundTop, treeLeft, treeRight } from './world.ts'

type G = CanvasRenderingContext2D
type Pt = [number, number]
export type Rand = () => number

export type Kind = 'bark' | 'twig' | 'moss' | 'acorn' | 'pebble' | 'leaf' | 'feather' | 'shell'

export interface Sprite {
  day: HTMLCanvasElement
  night: HTMLCanvasElement
  w: number
  h: number
}

export interface Art {
  fgDay: HTMLCanvasElement
  fgNight: HTMLCanvasElement
  pieces: Record<Kind, Sprite[]>
  sprigs: Sprite[]
  mushroom: Sprite
  glow: HTMLCanvasElement
  cloud: HTMLCanvasElement
  sunDay: HTMLCanvasElement
  sunDusk: HTMLCanvasElement
  rays: HTMLCanvasElement
  dapple: HTMLCanvasElement
  touch: HTMLCanvasElement
}

// Where the mouth of a snail shell is, from its centre, and how big.
export const APERTURE = { x: 30, y: -8, rx: 27, ry: 17 }
// The little knothole window above the hollow.
export const KNOT = { x: 796, y: 318, rx: 15, ry: 19 }

export function rng(seed: number): Rand {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(w: number, h: number, scale: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * scale)
  c.height = Math.ceil(h * scale)
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.scale(scale, scale)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  return [c, g]
}

const DUSK = '#131a44'

function nightCopy(src: HTMLCanvasElement, alpha = 0.54): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.drawImage(src, 0, 0)
  g.globalCompositeOperation = 'source-atop'
  g.globalAlpha = alpha
  g.fillStyle = DUSK
  g.fillRect(0, 0, c.width, c.height)
  return c
}

function sprite(w: number, h: number, scale: number, paint: (g: G) => void): Sprite {
  const [c, g] = canvas(w, h, scale)
  g.translate(w / 2, h / 2)
  paint(g)
  return { day: c, night: nightCopy(c), w, h }
}

// Draw a sprite centred (or anchored at ax, ay as fractions of its size),
// crossfading from its daylight to its dusk version as `night` goes 0 to 1.
export function drawSprite(g: G, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = 1, night = 0, ax = 0.5, ay = 0.5): void {
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  if (sx !== 1 || sy !== 1) g.scale(sx, sy)
  const dx = -s.w * ax
  const dy = -s.h * ay
  if (night < 0.99) g.drawImage(s.day, dx, dy, s.w, s.h)
  if (night > 0.01) {
    const a = g.globalAlpha
    g.globalAlpha = a * Math.min(1, night)
    g.drawImage(s.night, dx, dy, s.w, s.h)
    g.globalAlpha = a
  }
  g.restore()
}

// ---------------------------------------------------------------- shapes

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

// A hand-cut oval: `wob` is how uneven, `power` below 1 squares it off.
function blobPts(r: Rand, cx: number, cy: number, rx: number, ry: number, wob = 0.08, n = 12, power = 1): Pt[] {
  const pts: Pt[] = []
  const phase = r() * TAU
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU
    const k = 1 + (r() * 2 - 1) * wob
    const c = Math.cos(a)
    const s = Math.sin(a)
    pts.push([cx + Math.sign(c) * Math.abs(c) ** power * rx * k, cy + Math.sign(s) * Math.abs(s) ** power * ry * k])
  }
  return pts
}

function blob(g: G, r: Rand, cx: number, cy: number, rx: number, ry: number, fill: string | CanvasGradient, wob = 0.08, n = 12): void {
  smooth(g, blobPts(r, cx, cy, rx, ry, wob, n))
  g.fillStyle = fill
  g.fill()
}

function oval(g: G, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, rot = 0): void {
  g.beginPath()
  g.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU)
  g.fillStyle = fill
  g.fill()
}

function leafDab(g: G, x: number, y: number, len: number, wid: number, rot: number, fill: string): void {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const hx = (c * len) / 2
  const hy = (s * len) / 2
  g.beginPath()
  g.moveTo(x - hx, y - hy)
  g.quadraticCurveTo(x - s * wid, y + c * wid, x + hx, y + hy)
  g.quadraticCurveTo(x + s * wid, y - c * wid, x - hx, y - hy)
  g.fillStyle = fill
  g.fill()
}

function stroke(g: G, x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.strokeStyle = color
  g.lineWidth = width
  g.stroke()
}

function pick<T>(r: Rand, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(r() * items.length))]!
}

// A tapering curved limb (a root, a branch). Returns its centre line.
function limb(g: G, p0: Pt, c: Pt, p1: Pt, w0: number, w1: number, fill: string | CanvasGradient): Pt[] {
  const left: Pt[] = []
  const right: Pt[] = []
  const mid: Pt[] = []
  const N = 14
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const u = 1 - t
    const x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0]
    const y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]
    const tx = 2 * u * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0])
    const ty = 2 * u * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1])
    const tl = Math.hypot(tx, ty) || 1
    const w = lerp(w0, w1, t) / 2
    left.push([x + (-ty / tl) * w, y + (tx / tl) * w])
    right.unshift([x - (-ty / tl) * w, y - (tx / tl) * w])
    mid.push([x, y])
  }
  g.beginPath()
  g.moveTo(left[0]![0], left[0]![1])
  for (const p of left) g.lineTo(p[0], p[1])
  const tip = mid[N]!
  const r0 = right[0]!
  g.quadraticCurveTo(tip[0] + (p1[0] - c[0]) * 0.06, tip[1] + (p1[1] - c[1]) * 0.06, r0[0], r0[1])
  for (const p of right) g.lineTo(p[0], p[1])
  g.closePath()
  g.fillStyle = fill
  g.fill()
  return mid
}

function mossPatch(g: G, r: Rand, cx: number, cy: number, rx: number, ry: number): void {
  const pts = blobPts(r, cx, cy, rx, ry, 0.1, 14)
  g.strokeStyle = '#6f9440'
  g.lineWidth = 2.4
  const fuzz = Math.round(rx * 1.3)
  for (let i = 0; i < fuzz; i++) {
    const a = r() * TAU
    const ex = cx + Math.cos(a) * rx * 0.95
    const ey = cy + Math.sin(a) * ry * 0.95
    const l = 1.5 + r() * 2.5
    g.beginPath()
    g.moveTo(ex, ey)
    g.lineTo(ex + Math.cos(a) * l, ey + Math.sin(a) * l - 1)
    g.stroke()
  }
  smooth(g, pts)
  const grad = g.createRadialGradient(cx - rx * 0.25, cy - ry * 0.45, 2, cx, cy, rx * 1.15)
  grad.addColorStop(0, '#c2d970')
  grad.addColorStop(0.45, '#88ab48')
  grad.addColorStop(1, '#587b31')
  g.fillStyle = grad
  g.fill()
  g.save()
  g.clip()
  const n = Math.round(rx * ry * 0.13)
  const cols = ['#d6e68a', '#a9c659', '#4d7029', '#6f9539', '#93b34a']
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.3 + r() * 0.35
    oval(g, cx + (r() * 2 - 1) * rx, cy + (r() * 2 - 1) * ry, 1 + r() * 1.8, 1 + r() * 1.4, pick(r, cols))
  }
  g.globalAlpha = 0.3
  oval(g, cx, cy + ry * 0.9, rx, ry * 0.45, '#35501f')
  g.restore()
  g.globalAlpha = 1
}

// ---------------------------------------------------------------- pieces

function paintBark(g: G, r: Rand): void {
  const pts = blobPts(r, 0, 0, 90, 25, 0.07, 18, 0.55)
  g.save()
  g.translate(0, 6)
  smooth(g, pts)
  g.fillStyle = '#3d291c'
  g.fill()
  g.restore()
  smooth(g, pts)
  const grad = g.createLinearGradient(0, -26, 0, 26)
  grad.addColorStop(0, '#9a7650')
  grad.addColorStop(0.5, '#7f5c3d')
  grad.addColorStop(1, '#64452e')
  g.fillStyle = grad
  g.fill()
  g.save()
  g.clip()
  for (let i = 0; i < 9; i++) {
    const y = -22 + i * 5.5 + r() * 3
    g.beginPath()
    g.moveTo(-96, y)
    for (let x = -96; x < 96; x += 24) g.quadraticCurveTo(x + 12, y + (r() - 0.5) * 8, x + 24, y + (r() - 0.5) * 3)
    g.strokeStyle = `rgba(66,43,29,${0.35 + r() * 0.3})`
    g.lineWidth = 1.2 + r() * 2.6
    g.stroke()
  }
  for (let i = 0; i < 16; i++) {
    const x = -84 + r() * 168
    const y = -20 + r() * 40
    stroke(g, x, y, x + 8 + r() * 16, y + (r() - 0.5) * 3, `rgba(190,154,112,${0.25 + r() * 0.3})`, 1.5 + r() * 2)
  }
  g.globalAlpha = 0.7
  for (let i = 0; i < 4; i++) blob(g, r, -70 + r() * 140, -14 + r() * 28, 5 + r() * 8, 3 + r() * 4, pick(r, ['#b9c8a0', '#a8ba8c', '#c9cfae']), 0.2, 8)
  g.globalAlpha = 1
  g.restore()
  smooth(g, pts)
  g.strokeStyle = 'rgba(58,38,26,0.5)'
  g.lineWidth = 2
  g.stroke()
}

function paintTwig(g: G, r: Rand, len: number): void {
  const bend = (r() - 0.5) * 16
  const at = (t: number): Pt => [-len / 2 + len * t, Math.sin(t * Math.PI) * bend + Math.sin(t * 9 + bend) * 1.6]
  const st = 0.3 + r() * 0.35
  const sp = at(st)
  const dir = bend > 0 ? 1 : -1
  stroke(g, sp[0], sp[1], sp[0] + 14, sp[1] + dir * 17, '#7d5a3c', 7)
  oval(g, sp[0] + 14.5, sp[1] + dir * 17.5, 2.6, 2.6, '#dcbf94')
  const N = 22
  for (let i = 0; i < N; i++) {
    const a = at(i / N)
    const b = at((i + 1) / N)
    stroke(g, a[0], a[1] + 1.5, b[0], b[1] + 1.5, '#4f3524', 16 - 5 * (i / N))
  }
  for (let i = 0; i < N; i++) {
    const a = at(i / N)
    const b = at((i + 1) / N)
    stroke(g, a[0], a[1], b[0], b[1], '#86623f', 14.5 - 5 * (i / N))
  }
  for (let i = 0; i < N; i++) {
    const a = at(i / N)
    const b = at((i + 1) / N)
    stroke(g, a[0], a[1] - 3, b[0], b[1] - 3, 'rgba(196,156,112,0.85)', 4.6 - 1.4 * (i / N))
  }
  for (let i = 0; i < 9; i++) {
    const p = at(0.08 + r() * 0.86)
    stroke(g, p[0], p[1] - 3, p[0] + (r() - 0.5) * 3, p[1] + 4, 'rgba(60,40,26,0.4)', 1.4)
  }
  const k = at(0.72)
  oval(g, k[0], k[1], 5, 5.4, '#5a3d28')
  oval(g, k[0] - 0.6, k[1] - 0.8, 2.6, 2.8, '#8a6645')
  const e = at(0)
  oval(g, e[0] - 1.5, e[1], 3.4, 5.6, '#dcbf94')
  oval(g, e[0] - 1.5, e[1], 1.4, 2.6, '#b89668')
}

function paintMoss(g: G, r: Rand): void {
  mossPatch(g, r, 0, 4, 46, 27)
  for (let i = 0; i < 5; i++) {
    const x = -26 + r() * 52
    const y = -14 - r() * 6
    const top = y - 9 - r() * 6
    stroke(g, x, y, x + (r() - 0.5) * 5, top, '#7b6a3a', 1.2)
    oval(g, x + (r() - 0.5) * 5, top, 1.8, 2.4, '#b8763a')
  }
}

function paintAcorn(g: G, r: Rand): void {
  const cup = () => {
    g.beginPath()
    g.moveTo(-27, -7)
    g.bezierCurveTo(-27, 18, -13, 23, 0, 23)
    g.bezierCurveTo(13, 23, 27, 18, 27, -7)
    g.closePath()
  }
  cup()
  const grad = g.createLinearGradient(-20, -8, 14, 24)
  grad.addColorStop(0, '#b3844f')
  grad.addColorStop(1, '#7a5330')
  g.fillStyle = grad
  g.fill()
  g.save()
  g.clip()
  g.strokeStyle = 'rgba(84,54,30,0.6)'
  g.lineWidth = 1.3
  for (let row = 0; row < 6; row++) {
    const y = -5 + row * 5.2
    for (let x = -30 + (row % 2) * 4.5; x < 30; x += 9) {
      g.beginPath()
      g.arc(x + r(), y, 4.6, 0.1 * Math.PI, 0.9 * Math.PI)
      g.stroke()
    }
  }
  g.restore()
  oval(g, 0, -7, 27, 9.5, '#dcbc8a')
  const inner = g.createLinearGradient(0, -13, 0, 1)
  inner.addColorStop(0, '#6f4c2e')
  inner.addColorStop(1, '#a37a4f')
  oval(g, 0, -6.2, 22, 7, inner)
  g.beginPath()
  g.ellipse(0, -7, 27, 9.5, 0, Math.PI * 1.05, Math.PI * 1.95)
  g.strokeStyle = 'rgba(255,240,210,0.6)'
  g.lineWidth = 1.6
  g.stroke()
}

const STONES: readonly [string, string, string][] = [
  ['#dcd5c7', '#a39c90', '#6f6a62'],
  ['#c6c3be', '#86847f', '#5c5a58'],
  ['#e0d0b6', '#a8926f', '#77654a'],
  ['#b9c0c8', '#788089', '#525960'],
  ['#d2bfae', '#93806e', '#66574a'],
]

function paintPebble(g: G, r: Rand, v: number): void {
  const rx = 24 + r() * 8
  const ry = rx * (0.68 + r() * 0.1)
  const [light, base, dark] = STONES[v % STONES.length]!
  const pts = blobPts(r, 0, 0, rx, ry, 0.07, 9)
  g.save()
  g.translate(0, 4)
  smooth(g, pts)
  g.fillStyle = dark
  g.fill()
  g.restore()
  smooth(g, pts)
  const grad = g.createLinearGradient(-rx * 0.6, -ry, rx * 0.5, ry)
  grad.addColorStop(0, light)
  grad.addColorStop(1, base)
  g.fillStyle = grad
  g.fill()
  g.save()
  g.clip()
  for (let i = 0; i < 26; i++) {
    g.globalAlpha = 0.12 + r() * 0.2
    oval(g, (r() * 2 - 1) * rx, (r() * 2 - 1) * ry, 0.8 + r() * 1.4, 0.8 + r() * 1.2, r() < 0.5 ? dark : '#ffffff')
  }
  g.globalAlpha = 1
  if (v % 2 === 0) {
    g.beginPath()
    g.moveTo(-rx, -ry * 0.1 + r() * 6)
    g.quadraticCurveTo(0, ry * 0.5, rx, -ry * 0.2 + r() * 6)
    g.strokeStyle = 'rgba(245,240,228,0.65)'
    g.lineWidth = 3
    g.stroke()
  }
  g.restore()
  g.globalAlpha = 0.34
  oval(g, -rx * 0.28, -ry * 0.4, rx * 0.36, ry * 0.2, '#ffffff', -0.35)
  g.globalAlpha = 1
}

const LEAVES: readonly [string, string, string, string][] = [
  ['#f3d477', '#dfae45', '#b97f2c', '#8a5a22'],
  ['#e9a364', '#c96f3b', '#9c4a28', '#6f3018'],
  ['#cdd684', '#99b150', '#6a8736', '#4a6426'],
]

function paintLeaf(g: G, r: Rand, v: number): void {
  const [light, base, dark, vein] = LEAVES[v % LEAVES.length]!
  const L = 70
  const wd = 34
  stroke(g, -L + 2, 0, -L - 14, 4, vein, 3.2)
  const shape = () => {
    g.beginPath()
    g.moveTo(-L, 0)
    g.bezierCurveTo(-L * 0.6, -wd * 1.3, L * 0.3, -wd * 1.05, L, -1)
    g.bezierCurveTo(L * 0.35, wd * 1.0, -L * 0.55, wd * 1.25, -L, 0)
    g.closePath()
  }
  shape()
  const grad = g.createLinearGradient(0, -wd, 0, wd)
  grad.addColorStop(0, light)
  grad.addColorStop(0.5, base)
  grad.addColorStop(1, dark)
  g.fillStyle = grad
  g.fill()
  g.save()
  g.clip()
  g.globalAlpha = 0.2
  for (let i = 0; i < 7; i++) blob(g, r, -L + r() * 2 * L, (r() * 2 - 1) * wd, 6 + r() * 12, 4 + r() * 8, dark, 0.2, 8)
  g.globalAlpha = 1
  g.strokeStyle = vein
  g.lineWidth = 2.4
  g.beginPath()
  g.moveTo(-L, 0)
  g.quadraticCurveTo(0, -3, L, -1)
  g.stroke()
  g.globalAlpha = 0.5
  g.lineWidth = 1.3
  for (let i = 1; i <= 7; i++) {
    const x = -L + (2 * L * i) / 8.4
    const reach = wd * Math.sin((i / 8.4) * Math.PI) * 1.05
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(x, -2 + i * 0.1)
      g.quadraticCurveTo(x + 10, side * reach * 0.5, x + 20, side * reach)
      g.stroke()
    }
  }
  g.globalAlpha = 1
  g.restore()
  shape()
  g.strokeStyle = 'rgba(90,55,25,0.4)'
  g.lineWidth = 1.5
  g.stroke()
}

function paintFeather(g: G, r: Rand): void {
  const at = (t: number): Pt => [-64 + 128 * t, 9 - 18 * t - Math.sin(t * Math.PI) * 7]
  const half = (t: number) => (t < 0.2 ? 0 : 17 * Math.sin(Math.PI * ((t - 0.2) / 0.8) ** 0.62))
  const up: Pt[] = []
  const down: Pt[] = []
  for (let i = 0; i <= 24; i++) {
    const t = 0.2 + (0.8 * i) / 24
    const p = at(t)
    up.push([p[0], p[1] - half(t)])
    down.unshift([p[0] + 2, p[1] + half(t) * 0.82])
  }
  const vane = () => {
    g.beginPath()
    g.moveTo(up[0]![0], up[0]![1])
    for (const p of up) g.lineTo(p[0], p[1])
    for (const p of down) g.lineTo(p[0], p[1])
    g.closePath()
  }
  // Down at the quill end.
  g.strokeStyle = 'rgba(250,246,236,0.85)'
  g.lineWidth = 1.4
  for (let i = 0; i < 10; i++) {
    const p = at(0.14 + r() * 0.1)
    g.beginPath()
    g.moveTo(p[0], p[1])
    g.quadraticCurveTo(p[0] - 4 + r() * 10, p[1] + (r() - 0.5) * 22, p[0] - 8 + r() * 16, p[1] + (r() - 0.5) * 30)
    g.stroke()
  }
  vane()
  const grad = g.createLinearGradient(0, -20, 0, 22)
  grad.addColorStop(0, '#fbf6e8')
  grad.addColorStop(1, '#e2d7bd')
  g.fillStyle = grad
  g.fill()
  g.save()
  g.clip()
  // Jay bars on the upper web.
  for (let i = 0; i < 7; i++) {
    const t = 0.36 + i * 0.085
    const p = at(t)
    g.beginPath()
    g.moveTo(p[0], p[1])
    g.lineTo(p[0] + 9, p[1] - 24)
    g.lineTo(p[0] + 16, p[1] - 24)
    g.lineTo(p[0] + 6.5, p[1])
    g.closePath()
    g.fillStyle = i % 2 === 0 ? 'rgba(104,152,201,0.85)' : 'rgba(54,70,102,0.7)'
    g.fill()
  }
  g.strokeStyle = 'rgba(128,112,84,0.2)'
  g.lineWidth = 1
  for (let i = 0; i < 44; i++) {
    const p = at(0.2 + (0.8 * i) / 44)
    g.beginPath()
    g.moveTo(p[0], p[1])
    g.lineTo(p[0] + 11, p[1] - 22)
    g.moveTo(p[0], p[1])
    g.lineTo(p[0] + 11, p[1] + 20)
    g.stroke()
  }
  g.globalAlpha = 0.5
  oval(g, 62, -12, 16, 14, '#8f8672')
  g.globalAlpha = 1
  g.restore()
  g.globalCompositeOperation = 'destination-out'
  for (const t of [0.52, 0.78]) {
    const p = at(t)
    stroke(g, p[0] + 3, p[1] + 3, p[0] + 11, p[1] + 20, '#000', 1.6)
  }
  g.globalCompositeOperation = 'source-over'
  g.beginPath()
  const q0 = at(0)
  g.moveTo(q0[0], q0[1])
  for (let i = 1; i <= 20; i++) {
    const p = at(i / 20)
    g.lineTo(p[0], p[1])
  }
  g.strokeStyle = '#cdbf9d'
  g.lineWidth = 2.2
  g.stroke()
  const q1 = at(0.16)
  stroke(g, q0[0], q0[1], q1[0], q1[1], '#f3ecd8', 3.2)
}

function paintShell(g: G, r: Rand, v: number): void {
  const cx = -14
  const cy = 4
  const pts = blobPts(r, cx, cy, 42, 38, 0.03, 16)
  // The mouth's lip reaches out to the right.
  g.beginPath()
  g.ellipse(APERTURE.x - 2, APERTURE.y + 4, APERTURE.rx + 6, APERTURE.ry + 9, -0.2, 0, TAU)
  g.fillStyle = v === 0 ? '#d9b780' : '#c9a98a'
  g.fill()
  smooth(g, pts)
  const grad = g.createRadialGradient(cx - 12, cy - 14, 3, cx, cy, 46)
  if (v === 0) {
    grad.addColorStop(0, '#fbeecb')
    grad.addColorStop(0.55, '#e8c98d')
    grad.addColorStop(1, '#b98652')
  } else {
    grad.addColorStop(0, '#f6ead9')
    grad.addColorStop(0.55, '#dcc0a2')
    grad.addColorStop(1, '#a77f62')
  }
  g.fillStyle = grad
  g.fill()
  g.save()
  g.clip()
  g.strokeStyle = 'rgba(120,82,48,0.16)'
  g.lineWidth = 1.2
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU
    stroke(g, cx + Math.cos(a) * 10, cy + Math.sin(a) * 9, cx + Math.cos(a + 0.25) * 44, cy + Math.sin(a + 0.25) * 40, 'rgba(120,82,48,0.16)', 1.2)
  }
  g.restore()
  g.beginPath()
  const turns = 2.55
  for (let i = 0; i <= 90; i++) {
    const a = (i / 90) * turns * TAU
    const rad = 37 * (1 - i / 90) ** 0.85
    const x = cx - 3 + Math.cos(a - 0.5) * rad
    const y = cy - 2 + Math.sin(a - 0.5) * rad * 0.92
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.strokeStyle = v === 0 ? 'rgba(150,100,56,0.85)' : 'rgba(128,88,64,0.85)'
  g.lineWidth = 2.8
  g.stroke()
  // The mouth.
  g.beginPath()
  g.ellipse(APERTURE.x, APERTURE.y, APERTURE.rx, APERTURE.ry, -0.12, 0, TAU)
  g.fillStyle = '#fcf3da'
  g.fill()
  const inner = g.createLinearGradient(0, APERTURE.y - 14, 0, APERTURE.y + 14)
  inner.addColorStop(0, '#4a3122')
  inner.addColorStop(1, '#7d5a3e')
  g.beginPath()
  g.ellipse(APERTURE.x, APERTURE.y + 1, APERTURE.rx - 5, APERTURE.ry - 4.5, -0.12, 0, TAU)
  g.fillStyle = inner
  g.fill()
  g.globalAlpha = 0.4
  oval(g, cx - 14, cy - 18, 12, 7, '#ffffff', -0.5)
  g.globalAlpha = 1
}

function paintMushroom(g: G, r: Rand): void {
  // Anchored near the bottom: the sprite is 110 by 120 and the foot is at y 50.
  const stem = g.createLinearGradient(-12, 0, 12, 0)
  stem.addColorStop(0, '#fbf4e2')
  stem.addColorStop(1, '#d9cdb2')
  g.beginPath()
  g.moveTo(-9, -4)
  g.bezierCurveTo(-10, 20, -15, 40, -13, 50)
  g.quadraticCurveTo(0, 56, 13, 50)
  g.bezierCurveTo(15, 40, 10, 20, 9, -4)
  g.closePath()
  g.fillStyle = stem
  g.fill()
  g.beginPath()
  g.moveTo(-14, 8)
  g.quadraticCurveTo(0, 20, 14, 8)
  g.quadraticCurveTo(0, 13, -14, 8)
  g.fillStyle = '#efe5cc'
  g.fill()
  oval(g, 0, -4, 36, 8, '#e9dcc0')
  g.beginPath()
  g.moveTo(-44, -4)
  g.bezierCurveTo(-42, -40, -18, -52, 0, -52)
  g.bezierCurveTo(18, -52, 42, -40, 44, -4)
  g.quadraticCurveTo(0, 6, -44, -4)
  g.closePath()
  const cap = g.createRadialGradient(-12, -38, 4, 0, -20, 52)
  cap.addColorStop(0, '#e0684a')
  cap.addColorStop(0.6, '#c4432e')
  cap.addColorStop(1, '#9c3122')
  g.fillStyle = cap
  g.fill()
  g.save()
  g.clip()
  const spots: Pt[] = [[-22, -30], [-2, -40], [18, -32], [-32, -12], [-10, -20], [10, -16], [30, -12], [0, -4], [-20, -2], [22, -2]]
  for (const [x, y] of spots) blob(g, r, x + (r() - 0.5) * 3, y, 4.5 + r() * 2.5, 3.4 + r() * 2, '#fbf3e4', 0.15, 8)
  g.restore()
}

function paintSprig(g: G, r: Rand): void {
  // Hangs from the top middle of its 180 by 170 sprite.
  const top: Pt = [0, -85]
  g.beginPath()
  g.moveTo(top[0], top[1])
  g.quadraticCurveTo(8, -50, -4 + r() * 12, -10)
  g.strokeStyle = '#6a4c36'
  g.lineWidth = 4
  g.stroke()
  const cols = ['#55813a', '#6b9844', '#4a7533', '#7ba54e', '#8cb356']
  for (let i = 0; i < 20; i++) {
    const t = i / 19
    const x = (r() - 0.5) * 20 + Math.sin(t * 3) * 8
    const y = -72 + t * 92
    const side = i % 2 === 0 ? -1 : 1
    const rot = Math.PI / 2 + side * (0.6 + r() * 0.5)
    const len = 34 + r() * 14
    leafDab(g, x + Math.cos(rot) * len * 0.45, y + Math.sin(rot) * len * 0.45, len, 9 + r() * 4, rot, pick(r, cols))
  }
  g.globalAlpha = 0.5
  for (let i = 0; i < 6; i++) leafDab(g, -30 + r() * 50, -60 + r() * 90, 22, 5, 1 + r() * 1.4, '#bfd46e')
  g.globalAlpha = 1
}

// ---------------------------------------------------------------- the scene

function paintForeground(g: G, r: Rand, S: number): void {
  const hill = (fn: (x: number) => number, top: string, bottom: string) => {
    g.beginPath()
    g.moveTo(-20, 640)
    for (let x = -20; x <= W + 20; x += 16) g.lineTo(x, fn(x))
    g.lineTo(W + 20, 640)
    g.closePath()
    const grad = g.createLinearGradient(0, 290, 0, 520)
    grad.addColorStop(0, top)
    grad.addColorStop(1, bottom)
    g.fillStyle = grad
    g.shadowColor = top
    g.shadowBlur = 5 * S
    g.fill()
    g.shadowBlur = 0
  }
  hill(farHillY, '#c9dac0', '#b4c9a8')
  hill(hillY, '#b9d190', '#8fae76')
  for (let i = 0; i < 90; i++) {
    const x = r() * W
    const y = hillY(x) + 8 + r() * 90
    stroke(g, x, y, x + 3 + r() * 5, y - 3 - r() * 4, r() < 0.5 ? 'rgba(220,232,170,0.4)' : 'rgba(110,142,92,0.35)', 1.6)
  }

  // The wood beyond: misty crowns, then nearer ones, then bushes at the edge
  // of the floor.
  const crown = (x: number, y: number, rad: number, cols: readonly string[], trunkTo: number) => {
    stroke(g, x, y + rad * 0.2, x + (r() - 0.5) * 8, trunkTo, 'rgba(112,94,72,0.55)', rad * 0.15)
    g.shadowColor = cols[0]!
    g.shadowBlur = 4 * S
    for (let i = 0; i < 7; i++) blob(g, r, x + (r() - 0.5) * rad * 1.2, y + (r() - 0.5) * rad * 0.8, rad * (0.45 + r() * 0.3), rad * (0.4 + r() * 0.25), pick(r, cols), 0.12)
    g.shadowBlur = 0
    g.globalAlpha = 0.16
    g.shadowColor = '#d3e2ad'
    g.shadowBlur = 6 * S
    for (let i = 0; i < 3; i++) blob(g, r, x - rad * (0.15 + r() * 0.4), y - rad * (0.25 + r() * 0.3), rad * 0.4, rad * 0.28, '#d3e2ad', 0.15)
    g.shadowBlur = 0
    g.globalAlpha = 1
  }
  const farCols = ['#a9c39d', '#9dba93', '#b2c9a2']
  const midCols = ['#8aab78', '#7ea06c', '#93b17c']
  for (const x of [22, 100, 352, 420, 1012, 1088, 1160]) crown(x + (r() - 0.5) * 16, 408 + r() * 18, 34 + r() * 10, farCols, 560)
  for (const x of [-8, 74, 160, 250, 334, 410, 1046, 1124, 1190]) crown(x + (r() - 0.5) * 18, 474 + r() * 22, 56 + r() * 18, midCols, 590)
  const bushCols = ['#6f9257', '#62864c', '#7b9c5c', '#587c46']
  for (let x = -10; x <= W + 10; x += 34) {
    if (x > 360 && x < 1040) continue
    const y = floorBack(x) - 8 - r() * 14
    blob(g, r, x + (r() - 0.5) * 14, y, 26 + r() * 16, 20 + r() * 12, pick(r, bushCols), 0.14)
    g.globalAlpha = 0.35
    blob(g, r, x - 6, y - 9, 13, 8, '#bcd08a', 0.2)
    g.globalAlpha = 1
  }
  const fern = (x: number, y: number, lean: number, len: number) => {
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + lean + (k - 2) * 0.42
      let px = x
      let py = y
      for (let i = 0; i < 9; i++) {
        const t = i / 9
        const aa = a + (k - 2) * 0.12 * t * 2
        const nx = px + Math.cos(aa) * (len / 9)
        const ny = py + Math.sin(aa) * (len / 9) + t * 3
        stroke(g, px, py, nx, ny, '#4f7a3c', 2)
        const w = (1 - t) * 15 + 3
        leafDab(g, nx + Math.cos(aa + 1.3) * w * 0.5, ny + Math.sin(aa + 1.3) * w * 0.5, w, 3.4, aa + 1.3, '#5f8f44')
        leafDab(g, nx + Math.cos(aa - 1.3) * w * 0.5, ny + Math.sin(aa - 1.3) * w * 0.5, w, 3.4, aa - 1.3, '#6c9c4c')
        px = nx
        py = ny
      }
    }
  }
  fern(28, 598, -0.1, 74)
  fern(1156, 600, 0.12, 78)
  fern(1070, 596, -0.2, 54)

  // The forest floor.
  const ground = () => {
    g.beginPath()
    g.moveTo(-10, H + 10)
    for (let x = -10; x <= W + 10; x += 20) g.lineTo(x, floorBack(x))
    g.lineTo(W + 10, H + 10)
    g.closePath()
  }
  ground()
  const earth = g.createLinearGradient(0, 580, 0, H)
  earth.addColorStop(0, '#b08d64')
  earth.addColorStop(0.4, '#93714c')
  earth.addColorStop(1, '#775a3c')
  g.fillStyle = earth
  g.shadowColor = '#8a6a48'
  g.shadowBlur = 6 * S
  g.fill()
  g.shadowBlur = 0
  g.save()
  ground()
  g.clip()
  for (let i = 0; i < 44; i++) {
    g.globalAlpha = 0.16 + r() * 0.14
    blob(g, r, r() * W, 590 + r() * 240, 50 + r() * 110, 14 + r() * 26, r() < 0.5 ? '#c4a274' : '#5e4429', 0.2)
  }
  g.globalAlpha = 1
  const mossSpots: [number, number, number, number][] = [
    [60, 606, 110, 20], [310, 600, 80, 16], [1130, 606, 90, 20], [690, 640, 150, 16], [40, 790, 130, 30],
    [1140, 800, 130, 28], [560, 806, 180, 18], [820, 668, 70, 12], [470, 676, 60, 11],
  ]
  for (const [x, y, rx, ry] of mossSpots) {
    g.globalAlpha = 0.55
    blob(g, r, x, y, rx, ry, '#7f9c4c', 0.2, 14)
    g.globalAlpha = 0.35
    for (let i = 0; i < rx * 0.6; i++) oval(g, x + (r() * 2 - 1) * rx * 0.85, y + (r() * 2 - 1) * ry * 0.8, 1.6 + r() * 2, 1.2 + r() * 1.4, r() < 0.5 ? '#b7cf6c' : '#587b31')
  }
  g.globalAlpha = 1
  const litter = ['#c99a4a', '#b8763a', '#8f5a30', '#d4b45e', '#a0673a']
  for (let i = 0; i < 170; i++) {
    const x = r() * W
    const y = 592 + r() * 230
    const middle = x > 420 && x < 860 && y < 720
    if (middle && r() < 0.6) continue
    g.globalAlpha = 0.4 + r() * 0.3
    leafDab(g, x, y, 9 + r() * 8, 2.6 + r() * 2.4, r() * TAU, pick(r, litter))
  }
  for (let i = 0; i < 380; i++) {
    const x = r() * W
    const y = 590 + r() * 232
    const a = r() * TAU
    const l = 5 + r() * 8
    g.globalAlpha = 1
    stroke(g, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.5, r() < 0.55 ? 'rgba(72,50,30,0.22)' : 'rgba(222,194,146,0.2)', 1.3)
  }
  for (let i = 0; i < 16; i++) {
    g.globalAlpha = 0.6
    oval(g, r() * W, 600 + r() * 215, 2.5 + r() * 3, 2 + r() * 2, pick(r, ['#a39c90', '#86847f', '#b9ad98']))
  }
  g.globalAlpha = 1
  // Darker toward the near edge and the corners, like the shade of the canopy.
  const shade = g.createLinearGradient(0, 640, 0, H)
  shade.addColorStop(0, 'rgba(50,34,20,0)')
  shade.addColorStop(1, 'rgba(50,34,20,0.3)')
  g.fillStyle = shade
  g.fillRect(0, 600, W, H - 600)
  g.restore()

  // The puddle.
  g.globalAlpha = 0.8
  blob(g, r, PUDDLE.x, PUDDLE.y + 3, PUDDLE.rx + 11, PUDDLE.ry + 8, '#5d452e', 0.07, 16)
  g.globalAlpha = 1
  const waterPts = blobPts(r, PUDDLE.x, PUDDLE.y, PUDDLE.rx, PUDDLE.ry, 0.07, 16)
  smooth(g, waterPts)
  const water = g.createLinearGradient(0, PUDDLE.y - PUDDLE.ry, 0, PUDDLE.y + PUDDLE.ry)
  water.addColorStop(0, '#c9e0e4')
  water.addColorStop(1, '#8bb2c6')
  g.fillStyle = water
  g.fill()
  g.save()
  g.clip()
  g.globalAlpha = 0.22
  for (let i = 0; i < 5; i++) blob(g, r, PUDDLE.x - 70 + i * 34, PUDDLE.y - 22 + r() * 10, 22 + r() * 14, 9 + r() * 6, '#5f8a4a', 0.2)
  g.globalAlpha = 0.6
  g.strokeStyle = '#ffffff'
  g.lineWidth = 2.5
  g.beginPath()
  g.ellipse(PUDDLE.x - 14, PUDDLE.y + 6, 44, 11, -0.04, Math.PI * 0.1, Math.PI * 0.7)
  g.stroke()
  g.beginPath()
  g.ellipse(PUDDLE.x + 30, PUDDLE.y - 4, 24, 6, 0, Math.PI * 1.1, Math.PI * 1.6)
  g.stroke()
  g.restore()
  g.globalAlpha = 1

  // The tree. Its shade first.
  g.globalAlpha = 0.28
  oval(g, CX, 606, 372, 34, '#3a2818')
  g.globalAlpha = 1
  const trunk = () => {
    g.beginPath()
    g.moveTo(treeLeft(-10), -10)
    for (let y = 0; y <= 594; y += 8) g.lineTo(treeLeft(y) + Math.sin(y * 0.09) * 2.5, y)
    g.quadraticCurveTo(CX, 606, treeRight(594), 594)
    for (let y = 594; y >= -10; y -= 8) g.lineTo(treeRight(y) + Math.sin(y * 0.11 + 2) * 2.5, y)
    g.closePath()
  }
  trunk()
  const wood = g.createLinearGradient(430, 0, 980, 0)
  wood.addColorStop(0, '#553c2b')
  wood.addColorStop(0.3, '#7d5d42')
  wood.addColorStop(0.5, '#8d6b4b')
  wood.addColorStop(0.78, '#6c4e38')
  wood.addColorStop(1, '#4b3426')
  g.fillStyle = wood
  g.fill()
  g.save()
  trunk()
  g.clip()
  // Bark: long furrows that follow the flare of the roots.
  for (let i = 0; i < 90; i++) {
    const u = r()
    const y0 = -10 + r() * 480
    const y1 = y0 + 60 + r() * 220
    const ph = r() * 6
    g.beginPath()
    for (let y = y0; y <= y1; y += 16) {
      const x = lerp(treeLeft(y), treeRight(y), u) + Math.sin(y * 0.03 + ph) * 5
      if (y === y0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    const dark = r() < 0.62
    g.strokeStyle = dark ? `rgba(54,36,24,${0.2 + r() * 0.22})` : `rgba(196,162,120,${0.12 + r() * 0.14})`
    g.lineWidth = dark ? 1.5 + r() * 3.5 : 1.5 + r() * 2.5
    g.stroke()
  }
  g.globalAlpha = 0.16
  for (let i = 0; i < 7; i++) blob(g, r, 590 + r() * 240, 170 + r() * 150, 7 + r() * 12, 6 + r() * 9, '#b2bfa0', 0.25, 9)
  g.globalAlpha = 1
  // Shade under the canopy and at the very foot.
  const under = g.createLinearGradient(0, 0, 0, 260)
  under.addColorStop(0, 'rgba(34,26,18,0.45)')
  under.addColorStop(1, 'rgba(34,26,18,0)')
  g.fillStyle = under
  g.fillRect(300, 0, 800, 260)
  g.restore()

  // Roots that reach down onto the floor, lighter on their backs.
  const rootFill = (x0: number, x1: number) => {
    const grad = g.createLinearGradient(x0, 0, x1, 0)
    grad.addColorStop(0, '#8a6848')
    grad.addColorStop(1, '#6c4e38')
    return grad
  }
  const roots: [Pt, Pt, Pt, number, number][] = [
    [[584, 300], [478, 470], [392, 606], 10, 46],
    [[612, 330], [540, 510], [500, 634], 10, 46],
    [[592, 392], [572, 520], [596, 626], 14, 40],
    [[810, 392], [830, 520], [806, 628], 14, 40],
    [[792, 330], [866, 510], [902, 636], 10, 46],
    [[822, 300], [936, 470], [1008, 608], 10, 46],
  ]
  for (const [p0, c, p1, w0, w1] of roots) {
    const leftward = p1[0] < CX
    g.shadowColor = 'rgba(40,26,16,0.55)'
    g.shadowBlur = 9 * S
    g.shadowOffsetY = 3 * S
    const mid = limb(g, p0, c, p1, w0, w1, leftward ? rootFill(p1[0] - 30, p0[0] + 60) : rootFill(p0[0] - 60, p1[0] + 30))
    g.shadowBlur = 0
    g.shadowOffsetY = 0
    g.beginPath()
    for (let i = 2; i < mid.length; i++) {
      const p = mid[i]!
      const off = lerp(w0, w1, i / (mid.length - 1)) * 0.22
      if (i === 2) g.moveTo(p[0] - off, p[1] - off * 0.4)
      else g.lineTo(p[0] - off, p[1] - off * 0.4)
    }
    g.strokeStyle = 'rgba(206,172,128,0.3)'
    g.lineWidth = 5
    g.stroke()
    for (let k = 0; k < 4; k++) {
      g.beginPath()
      const shift = (k - 1.5) * 5
      for (let i = 1; i < mid.length; i++) {
        const p = mid[i]!
        if (i === 1) g.moveTo(p[0] + shift, p[1])
        else g.lineTo(p[0] + shift * (1 - i / mid.length) + Math.sin(i + k) * 1.2, p[1])
      }
      g.strokeStyle = 'rgba(54,36,24,0.26)'
      g.lineWidth = 1.6
      g.stroke()
    }
  }

  // Moss on the shoulders of the roots: soft enough to sleep in.
  mossPatch(g, r, 452, 566, 58, 22)
  mossPatch(g, r, 956, 568, 56, 21)
  mossPatch(g, r, 548, 600, 34, 12)
  mossPatch(g, r, 856, 604, 36, 12)
  mossPatch(g, r, 520, 440, 30, 16)
  mossPatch(g, r, 892, 452, 28, 14)
  mossPatch(g, r, 398, 600, 26, 10)
  mossPatch(g, r, 1004, 602, 28, 10)
  for (let i = 0; i < 12; i++) {
    const x = 400 + r() * 600
    const top = moundTop(x)
    if (!Number.isFinite(top)) continue
    const y = top + 14 + r() * 30
    if (Math.abs(x - CX) < 150) continue
    g.globalAlpha = 0.6
    blob(g, r, x, y, 12 + r() * 16, 5 + r() * 6, pick(r, ['#86a947', '#6f9440', '#9bb956']), 0.2, 9)
  }
  g.globalAlpha = 1

  // The hollow.
  const { x: hx, top: ht, bottom: hb, hw } = HOLLOW
  const arch = () => {
    g.beginPath()
    g.moveTo(hx - hw, hb + 2)
    g.bezierCurveTo(hx - hw - 6, 470, hx - hw * 0.78, ht, hx, ht)
    g.bezierCurveTo(hx + hw * 0.78, ht, hx + hw + 6, 470, hx + hw, hb + 2)
    g.quadraticCurveTo(hx, hb + 16, hx - hw, hb + 2)
    g.closePath()
  }
  arch()
  g.strokeStyle = '#a17d57'
  g.lineWidth = 16
  g.stroke()
  g.strokeStyle = 'rgba(54,36,24,0.45)'
  g.lineWidth = 2.5
  g.stroke()
  arch()
  const dark = g.createRadialGradient(hx, 540, 20, hx, 500, 190)
  dark.addColorStop(0, '#56392a')
  dark.addColorStop(0.6, '#33211a')
  dark.addColorStop(1, '#1e140f')
  g.fillStyle = dark
  g.fill()
  g.save()
  arch()
  g.clip()
  for (let i = 0; i < 26; i++) {
    const x = hx - hw + r() * hw * 2
    stroke(g, x, ht + r() * 60, x + (r() - 0.5) * 10, hb - 30 - r() * 40, 'rgba(160,120,84,0.1)', 2 + r() * 3)
  }
  const floor = g.createLinearGradient(0, hb - 34, 0, hb + 12)
  floor.addColorStop(0, '#5f432d')
  floor.addColorStop(1, '#9a7650')
  oval(g, hx, hb - 4, hw + 10, 30, floor)
  g.globalAlpha = 0.6
  for (let i = 0; i < 9; i++) leafDab(g, hx - 90 + r() * 180, hb - 16 + r() * 22, 10 + r() * 6, 3, r() * TAU, pick(r, litter))
  g.globalAlpha = 1
  for (let i = 0; i < 7; i++) {
    const x = hx - 70 + r() * 140
    const y0 = ht + 95 * (1 - Math.sqrt(Math.max(0, 1 - ((x - hx) / hw) ** 2))) - 2
    g.beginPath()
    g.moveTo(x, y0)
    g.quadraticCurveTo(x + (r() - 0.5) * 12, y0 + 14, x + (r() - 0.5) * 16, y0 + 18 + r() * 24)
    g.strokeStyle = 'rgba(120,88,60,0.7)'
    g.lineWidth = 1.6
    g.stroke()
  }
  g.restore()

  // A knothole window, and a bracket fungus.
  oval(g, KNOT.x, KNOT.y, KNOT.rx + 6, KNOT.ry + 6, '#a17d57', 0.1)
  oval(g, KNOT.x, KNOT.y + 1, KNOT.rx, KNOT.ry, '#2a1b14', 0.1)
  for (const [x, y, s] of [[602, 258, 1], [612, 280, 0.75], [596, 300, 0.6]] as const) {
    g.beginPath()
    g.ellipse(x, y, 24 * s, 9 * s, -0.1, Math.PI, TAU)
    g.fillStyle = '#e7c48c'
    g.fill()
    g.beginPath()
    g.ellipse(x, y, 24 * s, 4 * s, -0.1, 0, Math.PI)
    g.fillStyle = '#b98652'
    g.fill()
    g.beginPath()
    g.ellipse(x, y - 1, 17 * s, 5 * s, -0.1, Math.PI, TAU)
    g.strokeStyle = 'rgba(190,110,60,0.6)'
    g.lineWidth = 2
    g.stroke()
  }

  // The canopy: two boughs and masses of leaves across the top.
  limb(g, [590, 168], [470, 96], [318, 122], 36, 9, '#6a4c36')
  limb(g, [824, 176], [960, 104], [1110, 138], 36, 9, '#5e4330')
  const greens = ['#55813a', '#6b9844', '#4a7533', '#7ba54e', '#5f8c3e']
  const mass = (x: number, y: number, rad: number) => {
    const col = pick(r, greens)
    blob(g, r, x, y, rad, rad * 0.78, col, 0.14, 12)
    for (let j = 0; j < 12; j++) {
      const a = r() * TAU
      const d = rad * (0.75 + r() * 0.4)
      const hi = r() < 0.22
      leafDab(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.78, 18 + r() * 12, 5 + r() * 3.5, a + (r() - 0.5) * 1.4, hi ? '#a9c765' : pick(r, greens))
    }
  }
  for (let i = 0; i < 80; i++) {
    const x = 290 + r() * 910
    const depth = Math.abs(x - CX) < 250 ? 185 : 120
    mass(x, -34 + r() * r() * depth, 40 + r() * 46)
  }
  for (let i = 0; i < 9; i++) mass(-30 + r() * 170, -40 + r() * 70, 36 + r() * 34)
  for (let i = 0; i < 8; i++) mass(300 + r() * 120, 60 + r() * 60, 30 + r() * 26)
  for (let i = 0; i < 8; i++) mass(980 + r() * 190, 70 + r() * 70, 32 + r() * 28)
  g.globalAlpha = 0.45
  for (let i = 0; i < 70; i++) {
    const x = 290 + r() * 900
    leafDab(g, x, -20 + r() * 130, 16 + r() * 10, 4 + r() * 3, r() * TAU, '#cfdc7a')
  }
  g.globalAlpha = 1
}

function radial(size: number, stops: [number, string][]): HTMLCanvasElement {
  const [c, g] = canvas(size, size, 1)
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [at, col] of stops) grad.addColorStop(at, col)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return c
}

function paintSun(S: number, core: string, mid: string, edge: string): HTMLCanvasElement {
  const [c, g] = canvas(150, 150, S)
  const grad = g.createRadialGradient(68, 66, 4, 75, 75, 58)
  grad.addColorStop(0, core)
  grad.addColorStop(0.7, mid)
  grad.addColorStop(1, edge)
  g.shadowColor = mid
  g.shadowBlur = 10 * S
  const r = rng(77)
  blob(g, r, 75, 75, 55, 55, grad, 0.025, 18)
  g.shadowBlur = 0
  return c
}

export function buildArt(seed: number, S: number): Art {
  const r = rng(seed)
  const [fg, fgG] = canvas(W, H, S)
  paintForeground(fgG, r, S)
  // Paper grain over everything painted, so it does not look printed.
  fgG.globalCompositeOperation = 'source-atop'
  for (let i = 0; i < 12000; i++) {
    fgG.globalAlpha = 0.03 + r() * 0.05
    fgG.fillStyle = r() < 0.5 ? '#fff8e8' : '#3a2a1a'
    fgG.fillRect(r() * W, r() * H, 1 + r() * 1.8, 1 + r() * 1.8)
  }
  fgG.globalAlpha = 1
  fgG.globalCompositeOperation = 'source-over'

  const many = (n: number, w: number, h: number, paint: (g: G, i: number) => void): Sprite[] => {
    const out: Sprite[] = []
    for (let i = 0; i < n; i++) out.push(sprite(w, h, S, (g) => paint(g, i)))
    return out
  }
  const pieces: Record<Kind, Sprite[]> = {
    bark: many(3, 204, 76, (g) => paintBark(g, r)),
    twig: many(3, 180, 56, (g, i) => paintTwig(g, r, 146 + i * 8)),
    moss: many(3, 116, 84, (g) => paintMoss(g, r)),
    acorn: many(2, 66, 60, (g) => paintAcorn(g, r)),
    pebble: many(5, 76, 62, (g, i) => paintPebble(g, r, i)),
    leaf: many(3, 180, 100, (g, i) => paintLeaf(g, r, i)),
    feather: many(1, 150, 70, (g) => paintFeather(g, r)),
    shell: many(2, 130, 104, (g, i) => paintShell(g, r, i)),
  }

  const [cloud, cg] = canvas(320, 120, S)
  cg.shadowColor = '#fffaf0'
  cg.shadowBlur = 14 * S
  for (let i = 0; i < 9; i++) blob(cg, r, 60 + r() * 200, 62 + (r() - 0.5) * 26, 30 + r() * 36, 16 + r() * 14, 'rgba(255,250,240,0.55)', 0.12)

  const [rays, rg] = canvas(280, 280, S)
  rg.translate(140, 140)
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + (r() - 0.5) * 0.1
    const inner = 70 + r() * 4
    const outer = 96 + (i % 2) * 14 + r() * 8
    stroke(rg, Math.cos(a) * inner, Math.sin(a) * inner, Math.cos(a) * outer, Math.sin(a) * outer, 'rgba(255,226,150,0.6)', 7)
  }

  return {
    fgDay: fg,
    fgNight: nightCopy(fg, 0.6),
    pieces,
    sprigs: many(4, 180, 170, (g) => paintSprig(g, r)),
    mushroom: sprite(110, 120, S, (g) => paintMushroom(g, r)),
    glow: radial(128, [
      [0, 'rgba(255,232,170,1)'],
      [0.22, 'rgba(255,214,130,0.5)'],
      [0.6, 'rgba(255,196,110,0.12)'],
      [1, 'rgba(255,190,100,0)'],
    ]),
    cloud,
    sunDay: paintSun(S, '#fff6cf', '#ffe59a', '#ffd676'),
    sunDusk: paintSun(S, '#ffd9a0', '#ffac62', '#f58a4e'),
    rays,
    touch: radial(128, [
      [0, 'rgba(255,247,214,0.5)'],
      [0.55, 'rgba(255,242,190,0.34)'],
      [0.8, 'rgba(255,240,180,0.12)'],
      [1, 'rgba(255,240,180,0)'],
    ]),
    dapple: radial(128, [
      [0, 'rgba(255,244,190,0.5)'],
      [0.5, 'rgba(255,240,180,0.18)'],
      [1, 'rgba(255,240,180,0)'],
    ]),
  }
}
