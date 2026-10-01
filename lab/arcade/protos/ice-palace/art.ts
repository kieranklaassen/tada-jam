// Everything printed once and kept. The look is a gritty relief print: four
// inks on ice-white paper (night blue, gold, one red, and the paper itself),
// edges cut by hand, ink that did not quite cover, and colour plates that sit
// a little off the key plate. Nothing here runs per frame except `put`.

import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

type G = CanvasRenderingContext2D
export type Pt = [number, number]
export type Rand = () => number

export const PAPER = '#f1f0e7'
export const INK = '#1b2658'
export const GOLD = '#e3a52a'
export const RED = '#d04a30'
const NIGHT = '#1d3690'
export const ink = (a: number): string => `rgba(27,38,88,${a})`
// The same blue rolled thin: where the plate is a screen, not a solid.
export const tint = (a: number): string => `rgba(36,86,200,${a})`

// The line every block stands on, the pond, the snow drift, the sun.
export const GROUND = 548
export const POND = { x: 300, y: 674, rx: 250, ry: 78 }
export const DRIFT = { x: 942, y: 690, rx: 168, ry: 78 }
export const SUN = { x: 1066, top: 112, r: 46 }
export const SKY_H = 430
export const ICE_H = 64

export const farHill = (x: number): number => 286 + 22 * Math.sin(x / 260 + 2.0) + 8 * Math.sin(x / 97)
export const nearHill = (x: number): number => 330 + 26 * Math.sin(x / 330 + 2.2) + 10 * Math.sin(x / 120 + 1)
// The bough the icicles hang from: its middle and half its thickness.
export const boughY = (x: number): number => 46 + 0.17 * x + 6 * Math.sin(x / 90)
export const boughHalf = (x: number): number => 12 - 8 * Math.min(1, Math.max(0, x / 440))

export interface Sprite {
  c: HTMLCanvasElement
  w: number
  h: number
}

export interface IceSprite {
  day: Sprite
  gold: Sprite
}

export interface Art {
  S: number
  landDay: HTMLCanvasElement
  landNight: HTMLCanvasElement
  skyDay: HTMLCanvasElement
  skyGold: HTMLCanvasElement
  skyNight: HTMLCanvasElement
  grain: HTMLCanvasElement
  cloud: Sprite
  sunGold: Sprite
  sunRed: Sprite
  rays: Sprite
  afterglow: Sprite
  aurora: Sprite[]
  star: Sprite
  light: Sprite
  halo: Sprite
  streak: Sprite
  icicle: Sprite
  icicleNight: Sprite
  spire: Sprite
  brick: Sprite
  brickNight: Sprite
  ball: Sprite
  ballNight: Sprite
  child: Sprite
  kingStand: Sprite
  kingSit: Sprite
  robin: Sprite
  robinNight: Sprite
  frost: Sprite
  mark: Sprite
  dent: Sprite
  dash: Sprite
  ice(w: number, variant: number): IceSprite
  cap(w: number): Sprite
}

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

// A sprite painted around its own centre.
function sprite(w: number, h: number, scale: number, paint: (g: G) => void): Sprite {
  const [c, g] = canvas(w, h, scale)
  g.translate(w / 2, h / 2)
  paint(g)
  return { c, w, h }
}

export function put(g: G, s: Sprite, x: number, y: number): void {
  g.drawImage(s.c, x - s.w / 2, y - s.h / 2, s.w, s.h)
}

// The same picture with night-blue ink rolled thinly over it.
function tinted(src: Sprite, alpha: number, color = INK): Sprite {
  const c = document.createElement('canvas')
  c.width = src.c.width
  c.height = src.c.height
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.drawImage(src.c, 0, 0)
  g.globalCompositeOperation = 'source-atop'
  g.globalAlpha = alpha
  g.fillStyle = color
  g.fillRect(0, 0, c.width, c.height)
  return { c, w: src.w, h: src.h }
}

// ---------------------------------------------------------------- the knife

// Break a path into short runs and nudge each point: an edge cut by hand.
function rough(r: Rand, pts: Pt[], closed: boolean, step = 13, jit = 1.2): Pt[] {
  const out: Pt[] = []
  const n = pts.length
  const m = closed ? n : n - 1
  for (let i = 0; i < m; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % n]!
    const d = Math.hypot(b[0] - a[0], b[1] - a[1])
    const k = Math.max(1, Math.round(d / step))
    for (let j = 0; j < k; j++) {
      const t = j / k
      out.push([a[0] + (b[0] - a[0]) * t + (r() * 2 - 1) * jit, a[1] + (b[1] - a[1]) * t + (r() * 2 - 1) * jit])
    }
  }
  if (!closed) out.push(pts[n - 1]!)
  return out
}

function trace(g: G, pts: Pt[], closed: boolean): void {
  g.beginPath()
  g.moveTo(pts[0]![0], pts[0]![1])
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0], pts[i]![1])
  if (closed) g.closePath()
}

function fillRough(g: G, r: Rand, pts: Pt[], color: string, step = 13, jit = 1.2): void {
  trace(g, rough(r, pts, true, step, jit), true)
  g.fillStyle = color
  g.fill()
}

// A gouged line: it swells and thins as the tool leans.
function cut(g: G, r: Rand, pts: Pt[], color: string, width: number, closed = false, step = 11, jit = 1): void {
  const p = rough(r, pts, closed, step, jit)
  if (closed) p.push(p[0]!)
  g.strokeStyle = color
  let w = width
  for (let i = 0; i < p.length - 1; i++) {
    w = Math.min(width * 1.35, Math.max(width * 0.6, w + (r() - 0.5) * width * 0.5))
    g.lineWidth = w
    g.beginPath()
    g.moveTo(p[i]![0], p[i]![1])
    g.lineTo(p[i + 1]![0], p[i + 1]![1])
    g.stroke()
  }
}

function disc(g: G, r: Rand, x: number, y: number, rad: number, color: string, jit = 0.9): void {
  const pts: Pt[] = []
  const n = Math.max(8, Math.round(rad * 0.9))
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad])
  }
  fillRough(g, r, pts, color, 999, jit)
}

// Ink that did not take: specks of whatever is underneath. With `erase` the
// specks are holes; otherwise they are paper printed over ink.
function salt(g: G, r: Rand, x: number, y: number, w: number, h: number, n: number, erase: boolean, color = PAPER): void {
  g.save()
  g.globalCompositeOperation = erase ? 'destination-out' : 'source-atop'
  g.fillStyle = erase ? '#000' : color
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.3 + r() * 0.6
    const s = 0.7 + r() * r() * 2.4
    g.fillRect(x + r() * w, y + r() * h, s, s * (0.5 + r()))
  }
  g.restore()
}

function stipple(g: G, r: Rand, x: number, y: number, rx: number, ry: number, n: number, color: string): void {
  g.fillStyle = color
  for (let i = 0; i < n; i++) {
    const a = r() * TAU
    const d = Math.sqrt(r())
    const s = 1.2 + r() * 1.8
    g.fillRect(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, s, s)
  }
}

function fourStar(g: G, r: Rand, x: number, y: number, long: number, short: number, color: string, edge = 0): void {
  const pts: Pt[] = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2
    const d = i % 2 === 0 ? long : short
    pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d])
  }
  fillRough(g, r, pts, color, 999, 0.5)
  if (edge > 0) cut(g, r, pts, INK, edge, true, 999, 0.4)
}

// ---------------------------------------------------------------- the land

function fir(g: G, r: Rand, x: number, base: number, h: number, w: number): void {
  const tiers = Math.max(3, Math.round(h / 46))
  g.fillStyle = INK
  g.fillRect(x - w * 0.045, base - h * 0.12, w * 0.09, h * 0.12)
  for (let i = 0; i < tiers; i++) {
    const yTop = base - h + (h * 0.9 * i) / tiers - (i === 0 ? 0 : 10)
    const yBot = base - h + (h * 0.9 * (i + 1)) / tiers + 4
    const half = (w / 2) * (0.34 + (0.66 * (i + 1)) / tiers)
    fillRough(
      g,
      r,
      [
        [x, yTop],
        [x + half, yBot],
        [x + half * 0.55, yBot - 6],
        [x + half * 0.1, yBot + 3],
        [x - half * 0.5, yBot - 6],
        [x - half, yBot],
      ],
      INK,
      9,
      1.7,
    )
    if (h > 70) {
      // Snow on the boughs: the paper cut back in, on the side toward the sun.
      const t = yBot - yTop
      cut(g, r, [[x + half * 0.12, yTop + t * 0.42], [x + half * 0.62, yBot - 9]], PAPER, 3.4)
      cut(g, r, [[x - half * 0.1, yTop + t * 0.6], [x - half * 0.5, yBot - 9]], PAPER, 2.2)
    }
  }
}

export function inPond(x: number, y: number, k: number): boolean {
  const dx = (x - POND.x) / (POND.rx * k)
  const dy = (y - POND.y) / (POND.ry * k)
  return dx * dx + dy * dy < 1
}

export function inDrift(x: number, y: number, k: number): boolean {
  const dx = (x - DRIFT.x) / (DRIFT.rx * k)
  const dy = (y - DRIFT.y) / (DRIFT.ry * k)
  return dx * dx + dy * dy < 1
}

function paintLand(g: G, r: Rand): void {
  // The far hill: a thin roll of blue, laid a little off its edge.
  const far: Pt[] = []
  for (let x = -20; x <= W + 20; x += 20) far.push([x, farHill(x)])
  const farPoly: Pt[] = [...far, [W + 20, 470], [-20, 470]]
  fillRough(g, r, farPoly, PAPER, 16, 1.4)
  g.save()
  g.translate(3, 2.5)
  fillRough(g, r, farPoly, tint(0.34), 16, 1.4)
  g.restore()
  for (let k = 0; k < 3; k++) {
    const a = 120 + r() * 300 + k * 120
    const pts: Pt[] = []
    for (let x = a; x < a + 280 + r() * 240; x += 24) pts.push([x, farHill(x) + 13 + k * 11 + Math.sin(x / 50) * 3])
    cut(g, r, pts, PAPER, 2.4)
  }
  // Small firs along its ridge, leaving the place where the sun goes down.
  for (let x = 6; x < W; x += 15 + r() * 18) {
    if ((x > 360 && x < 800 && r() < 0.86) || (x > 1000 && x < 1132)) continue
    fir(g, r, x, farHill(x) + 5, 26 + r() * 30, 16 + r() * 10)
  }

  // The near hill and the clearing: bare paper under one strong line.
  const near: Pt[] = []
  for (let x = -20; x <= W + 20; x += 18) near.push([x, nearHill(x)])
  fillRough(g, r, [...near, [W + 20, H + 20], [-20, H + 20]], PAPER, 18, 1.2)
  for (let x = 14; x < W; x += 8 + r() * 5) {
    const slope = nearHill(x + 9) - nearHill(x - 9)
    if (slope > -1.4) continue
    const rows = 2 + Math.floor(r() * 3)
    for (let j = 0; j < rows; j++) {
      const y = nearHill(x) + 9 + j * 8
      const len = 7 + r() * 8
      cut(g, r, [[x, y], [x - len * 0.75, y + len * 0.65]], ink(0.55), 1.7)
    }
  }
  cut(g, r, near, INK, 4.2, false, 14, 1.1)

  // Firs that stand at the sides of the clearing.
  fir(g, r, 178, 438, 128, 70)
  fir(g, r, 112, 462, 204, 100)
  fir(g, r, 36, 486, 262, 126)
  fir(g, r, 1112, 442, 118, 62)
  fir(g, r, 1158, 488, 250, 120)

  // Snow lying in the clearing: a few thin blue hollows and scattered grit.
  const hollows: [number, number, number, number][] = [
    [660, 598, 150, 9],
    [120, 560, 110, 7],
    [1040, 574, 100, 7],
    [650, 742, 130, 8],
  ]
  for (const [x, y, rx, ry] of hollows) {
    const pts: Pt[] = []
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU
      pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry * (Math.sin(a) > 0 ? 1 : 0.35)])
    }
    fillRough(g, r, pts, tint(0.13), 20, 1)
  }
  {
    const pts: Pt[] = []
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU
      pts.push([600 + Math.cos(a) * 420, GROUND + 12 + Math.sin(a) * (Math.sin(a) > 0 ? 15 : 7)])
    }
    fillRough(g, r, pts, tint(0.1), 22, 1.4)
    for (let x = 200; x < 1000; x += 26 + r() * 40) cut(g, r, [[x, GROUND + 6 + r() * 14], [x + 10 + r() * 16, GROUND + 6 + r() * 14]], ink(0.32), 1.6)
  }
  for (let i = 0; i < 34; i++) {
    const x = 30 + r() * (W - 60)
    const y = 392 + r() * 400
    if (inPond(x, y, 1.12) || inDrift(x, y, 1.15)) continue
    stipple(g, r, x, y, 14 + r() * 16, 4 + r() * 4, 4 + Math.floor(r() * 6), ink(0.5))
  }
  for (let i = 0; i < 16; i++) {
    const x = 60 + r() * (W - 120)
    const y = 580 + r() * 200
    if (inPond(x, y, 1.15) || inDrift(x, y, 1.2)) continue
    cut(g, r, [[x, y], [x + 16 + r() * 22, y + (r() - 0.5) * 3]], ink(0.42), 1.8)
  }

  // The pond: thin blue for ice, a strong bank, white where skates and wind
  // have scored it.
  const pond: Pt[] = []
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * TAU
    const k = 1 + 0.045 * Math.sin(3 * a + 1) + 0.03 * Math.sin(5 * a + 2)
    pond.push([POND.x + Math.cos(a) * POND.rx * k, POND.y + Math.sin(a) * POND.ry * k])
  }
  g.save()
  g.translate(3.5, 2.5)
  fillRough(g, r, pond, tint(0.32), 14, 1.2)
  g.restore()
  const bank: Pt[] = []
  for (let i = 23; i <= 43; i++) bank.push([pond[i]![0] * 0.985 + POND.x * 0.015, pond[i]![1] + 8])
  cut(g, r, bank, ink(0.55), 5)
  for (let i = 0; i < 13; i++) {
    const a = r() * TAU
    const d = Math.sqrt(r()) * 0.74
    const x = POND.x + Math.cos(a) * POND.rx * d
    const y = POND.y + Math.sin(a) * POND.ry * d + 6
    const len = 20 + r() * 44
    cut(g, r, [[x, y], [x + len, y - len * 0.16]], PAPER, 1.6 + r() * 1.6)
  }
  for (let i = 0; i < 3; i++) {
    const pts: Pt[] = []
    const a0 = r() * TAU
    for (let j = 0; j < 9; j++) {
      const a = a0 + j * 0.2
      pts.push([POND.x + (i - 1) * 70 + Math.cos(a) * 92, POND.y + 8 + Math.sin(a) * 27])
    }
    cut(g, r, pts, PAPER, 2)
  }
  cut(g, r, pond, INK, 4.6, true, 13, 1.1)

  // Dry reeds at the bank, gold heads.
  for (let i = 0; i < 5; i++) {
    const x = 44 + i * 13 + r() * 5
    const top = 566 + r() * 34
    const lean = (r() - 0.3) * 16
    cut(g, r, [[x, 652 + r() * 8], [x + lean * 0.4, 612], [x + lean, top]], INK, 2.2)
    g.save()
    g.translate(x + lean + 1.5, top - 6)
    g.rotate(lean * 0.02)
    fillRough(g, r, [[-3.5, -9], [3.5, -9], [4.5, 7], [-4.5, 7]], GOLD, 6, 0.8)
    g.restore()
  }

  // The drift where the snow is gathered.
  const drift: Pt[] = []
  for (let i = 0; i <= 26; i++) {
    const t = i / 26
    const lump = Math.sin(t * Math.PI) ** 0.75
    drift.push([DRIFT.x - DRIFT.rx - 26 + (DRIFT.rx * 2 + 52) * t, DRIFT.y + 52 - (DRIFT.ry + 52) * lump - 7 * Math.sin(t * 9 + 1) * lump])
  }
  fillRough(g, r, [...drift, [DRIFT.x + DRIFT.rx + 26, DRIFT.y + 60], [DRIFT.x - DRIFT.rx - 26, DRIFT.y + 60]], PAPER, 14, 1)
  cut(g, r, drift.slice(1, 26), INK, 4.2, false, 13, 1.1)
  {
    const pts: Pt[] = []
    for (let i = 14; i <= 25; i++) pts.push([drift[i]![0] - 6, drift[i]![1] + 12])
    pts.push([DRIFT.x + DRIFT.rx + 6, DRIFT.y + 52], [DRIFT.x + 30, DRIFT.y + 52], [DRIFT.x + 76, DRIFT.y + 6])
    g.save()
    g.translate(2.5, 2)
    fillRough(g, r, pts, tint(0.14), 14, 1)
    g.restore()
  }
  stipple(g, r, DRIFT.x + 70, DRIFT.y + 26, 82, 30, 70, ink(0.5))
  stipple(g, r, DRIFT.x - 40, DRIFT.y + 44, 110, 12, 40, ink(0.45))
  for (let i = 0; i < 7; i++) {
    const x = DRIFT.x - 110 + i * 38 + r() * 10
    cut(g, r, [[x, DRIFT.y + 54 + r() * 5], [x + 18, DRIFT.y + 53 + r() * 5]], ink(0.5), 2)
  }
  for (let i = 0; i < 5; i++) fourStar(g, r, DRIFT.x - 100 + r() * 190, DRIFT.y - 40 + r() * 56, 5, 1.4, ink(0.6))

  // Grass through the snow along the bottom edge.
  for (let x = 14; x < W; x += 30 + r() * 60) {
    const y = 800 + r() * 14
    const n = 3 + Math.floor(r() * 3)
    for (let j = 0; j < n; j++) cut(g, r, [[x + j * 4, y], [x + j * 4 + (j - n / 2) * 4, y - 12 - r() * 12]], INK, 2)
  }

  // The bough in the corner, with snow lying along it and winter berries.
  const up: Pt[] = []
  const down: Pt[] = []
  for (let x = -14; x <= 442; x += 22) {
    up.push([x, boughY(x) - boughHalf(x)])
    down.unshift([x, boughY(x) + boughHalf(x)])
  }
  fillRough(g, r, [...up, [452, boughY(452)], ...down], INK, 11, 1.5)
  const twigs: [number, number, number][] = [
    [70, -0.9, 62],
    [176, -0.7, 78],
    [262, -1.1, 50],
    [352, -0.5, 64],
    [404, 0.5, 34],
  ]
  for (const [x, a, len] of twigs) {
    const y = boughY(x)
    const ex = x + Math.cos(a) * len
    const ey = y + Math.sin(a) * len
    cut(g, r, [[x, y], [x + Math.cos(a) * len * 0.5 + 3, y + Math.sin(a) * len * 0.5 - 2], [ex, ey]], INK, 4.4)
    if (len > 55) cut(g, r, [[x + Math.cos(a) * len * 0.55, y + Math.sin(a) * len * 0.55], [ex - 4, ey + 20]], INK, 2.6)
  }
  for (let x = 6; x < 420; x += 50 + r() * 26) {
    const len = 26 + r() * 20
    const pts: Pt[] = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      pts.push([x + len * t, boughY(x + len * t) - boughHalf(x + len * t) - 1 - Math.sin(t * Math.PI) * 9])
    }
    for (let i = 6; i >= 0; i--) pts.push([x + (len * i) / 6, boughY(x + (len * i) / 6) - boughHalf(x + (len * i) / 6) + 3])
    fillRough(g, r, pts, PAPER, 9, 0.7)
    cut(g, r, pts.slice(0, 7), INK, 1.8)
  }
  for (const [x, a, len] of [twigs[1]!, twigs[3]!]) {
    const ex = x + Math.cos(a) * len
    const ey = boughY(x) + Math.sin(a) * len
    for (let i = 0; i < 4; i++) {
      const bx = ex - 6 + (i % 2) * 11 + r() * 3
      const by = ey + 22 + Math.floor(i / 2) * 10 + r() * 3
      cut(g, r, [[ex - 4, ey + 18], [bx, by - 4]], INK, 1.4)
      disc(g, r, bx + 1.5, by + 1, 5.4, RED, 0.7)
      g.fillStyle = PAPER
      g.fillRect(bx - 1, by - 2.4, 2, 1.6)
    }
  }

  salt(g, r, 0, 240, W, H - 240, 5200, false)
}

// ---------------------------------------------------------------- the sky

function paintSkyDay(g: G, r: Rand): void {
  g.fillStyle = PAPER
  g.fillRect(0, 0, W, SKY_H)
  g.fillStyle = tint(0.27)
  g.fillRect(0, 0, W, SKY_H)
  // Thin lines near the top where the roller came down harder.
  for (let y = 6; y < 150; y += 7 + (y / 150) * 16 + r() * 3) {
    const x0 = r() * 120
    cut(g, r, [[x0, y], [x0 + 300 + r() * 400, y + (r() - 0.5) * 3], [W - r() * 100, y + (r() - 0.5) * 3]], tint(0.2), 2.2, false, 60, 0.8)
  }
  // Wind: long shallow cuts of bare paper.
  for (let i = 0; i < 9; i++) {
    const x = r() * (W - 300)
    const y = 60 + r() * 230
    const len = 140 + r() * 260
    cut(g, r, [[x, y], [x + len * 0.5, y - 3 + r() * 6], [x + len, y]], PAPER, 1.6 + r() * 2.2, false, 30, 0.8)
  }
  salt(g, r, 0, 0, W, SKY_H, 1500, false)
}

function paintSkyGold(g: G, r: Rand): void {
  // Evening comes up from the hills as bars of gold that thin toward the top.
  for (let y = SKY_H - 4; y > 96; y -= 15) {
    const t = (y - 96) / (SKY_H - 100)
    const th = 12.5 * t ** 1.5
    if (th < 0.8) continue
    const pts: Pt[] = [[-10, y - th / 2], [W + 10, y - th / 2 + (r() - 0.5) * 2], [W + 10, y + th / 2], [-10, y + th / 2 + (r() - 0.5) * 2]]
    fillRough(g, r, pts, GOLD, 40, 0.9)
  }
  salt(g, r, 0, 0, W, SKY_H, 2600, true)
}

function paintSkyNight(g: G, r: Rand): void {
  g.fillStyle = INK
  g.fillRect(0, 0, W, SKY_H)
  // The roller's passes show as slightly thinner bands.
  for (let i = 0; i < 7; i++) {
    g.fillStyle = `rgba(241,240,231,${0.008 + r() * 0.014})`
    g.fillRect(0, r() * SKY_H, W, 14 + r() * 40)
  }
  for (let i = 0; i < 90; i++) {
    const x = r() * W
    const y = r() * (SKY_H - 110)
    if (r() < 0.24) fourStar(g, r, x, y, 3.5 + r() * 4, 1 + r(), r() < 0.45 ? GOLD : PAPER)
    else {
      g.fillStyle = PAPER
      g.globalAlpha = 0.5 + r() * 0.5
      const s = 1.2 + r() * 1.8
      g.fillRect(x, y, s, s)
      g.globalAlpha = 1
    }
  }
  salt(g, r, 0, 0, W, SKY_H, 900, false)
}

function paintAurora(g: G, r: Rand, w: number, h: number, phase: number): void {
  // Curtains of light as rows of knife strokes hanging from a wandering line.
  const top = (x: number): number => 34 + 18 * Math.sin(x / 70 + phase) + 9 * Math.sin(x / 31 + phase * 2)
  const len = (x: number): number => (h - 96) * (0.5 + 0.3 * Math.sin(x / 96 + phase * 3) + 0.2 * Math.sin(x / 23 + phase))
  for (let x = 6; x < w - 6; x += 6.5 + r() * 2) {
    const y0 = top(x)
    const l = Math.max(24, len(x)) * (0.8 + r() * 0.3)
    const edge = Math.min(1, x / 60, (w - x) / 60)
    const gold = r() < 0.42
    g.globalAlpha = (0.55 + r() * 0.45) * edge
    cut(g, r, [[x, y0], [x + (r() - 0.5) * 2, y0 + l * 0.6], [x + (r() - 0.5) * 3, y0 + l]], gold ? GOLD : PAPER, gold ? 3.4 : 2.6, false, 30, 0.7)
    if (r() < 0.2) {
      g.globalAlpha = 0.85 * edge
      cut(g, r, [[x + 3, y0 - 6], [x + 3, y0 - 20 - r() * 12]], RED, 2.4)
    }
  }
  g.globalAlpha = 1
  salt(g, r, 0, 0, w, h, 500, true)
}

// ---------------------------------------------------------------- pieces

function blockShape(w: number, h: number): Pt[] {
  const a = w / 2
  const b = h / 2
  return [
    [-a + 4, -b],
    [a - 5, -b + 1],
    [a, -b + 5],
    [a - 1, b - 3],
    [a - 4, b],
    [-a + 3, b - 1],
    [-a, b - 4],
    [-a + 1, -b + 4],
  ]
}

function paintIce(S: number, w: number, seed: number): IceSprite {
  const h = ICE_H
  const shape = blockShape(w, h)
  const body = (g: G, r: Rand, fill: string, glass: string): void => {
    g.save()
    g.translate(2.5, 2)
    fillRough(g, r, shape, fill, 15, 0.9)
    g.restore()
    // The glass cuts: slanting bars of whatever is behind the plate.
    const n = Math.max(2, Math.round(w / 44))
    g.save()
    g.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 16 + ((w - 46) * (i + r() * 0.5)) / n
      const slant = 20
      cut(g, r, [[x, h / 2 - 9], [x + slant, -h / 2 + 9]], '#000', i % 2 === 0 ? 6 : 3, false, 16, 0.6)
    }
    g.restore()
    salt(g, r, -w / 2, -h / 2, w, h, w * 0.5, true)
    // The bevel, and a crack or two.
    cut(g, r, [[-w / 2 + 9, -h / 2 + 8], [w / 2 - 14, -h / 2 + 8.5]], glass, 1.8, false, 22, 0.6)
    cut(g, r, [[-w / 2 + 8.5, -h / 2 + 12], [-w / 2 + 8, h / 2 - 12]], glass, 1.8, false, 22, 0.6)
    const cx = w * (r() * 0.5 - 0.1)
    cut(g, r, [[cx, h / 2 - 5], [cx + 7, h / 2 - 17], [cx + 3, h / 2 - 26]], glass, 1.5, false, 9, 0.6)
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = glass
      g.lineWidth = 1.3
      g.beginPath()
      g.arc(w * (r() - 0.5) * 0.7, h * (r() - 0.5) * 0.5, 1.6 + r() * 1.6, 0, TAU)
      g.stroke()
    }
    cut(g, r, shape, INK, 3.6, true, 14, 0.8)
  }
  return {
    day: sprite(w + 16, h + 16, S, (g) => body(g, rng(seed), tint(0.3), ink(0.55))),
    gold: sprite(w + 16, h + 16, S, (g) => body(g, rng(seed), GOLD, 'rgba(241,240,231,0.85)')),
  }
}

function paintBrick(g: G, r: Rand): void {
  const w = 92
  const h = 64
  const a = w / 2
  const b = h / 2
  const shape: Pt[] = [
    [-a + 9, -b + 1],
    [a - 10, -b],
    [a - 2, -b + 8],
    [a, b - 9],
    [a - 8, b],
    [-a + 8, b - 1],
    [-a, b - 9],
    [-a + 2, -b + 8],
  ]
  fillRough(g, r, shape, PAPER, 10, 1.3)
  stipple(g, r, a - 22, b - 16, 20, 14, 38, ink(0.55))
  stipple(g, r, 0, b - 8, a - 12, 5, 24, ink(0.5))
  cut(g, r, [[-a + 14, -b + 12], [-a + 30, -b + 11]], ink(0.45), 1.8)
  cut(g, r, [[-6, -4], [8, -5]], ink(0.4), 1.6)
  cut(g, r, shape, INK, 3.6, true, 11, 1.1)
}

function paintBall(g: G, r: Rand): void {
  const pts: Pt[] = []
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU
    pts.push([Math.cos(a) * 31, Math.sin(a) * 30 + (Math.sin(a) > 0.7 ? -2 : 0)])
  }
  fillRough(g, r, pts, PAPER, 999, 1.1)
  for (let i = 0; i < 46; i++) {
    const a = 0.1 + r() * 1.5
    const d = 16 + r() * 12
    g.fillStyle = ink(0.55)
    g.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.4 + r() * 1.6, 1.4 + r() * 1.6)
  }
  cut(g, r, [[-16, -14], [-8, -20]], ink(0.4), 1.8)
  cut(g, r, pts, INK, 3.6, true, 999, 0.9)
}

function paintCap(g: G, r: Rand, w: number): void {
  const a = w / 2
  const topPts: Pt[] = []
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    topPts.push([-a - 4 + (w + 8) * t, 5 - 19 * Math.sin(t * Math.PI) ** 0.55 - 2.5 * Math.sin(t * 11)])
  }
  const under: Pt[] = []
  for (let i = 10; i >= 0; i--) {
    const t = i / 10
    under.push([-a - 4 + (w + 8) * t, 7 + 3 * Math.sin(t * 17)])
  }
  fillRough(g, r, [...topPts, ...under], PAPER, 9, 0.8)
  cut(g, r, [...topPts, ...under], INK, 3, true, 10, 0.7)
  stipple(g, r, a * 0.4, 0, a * 0.5, 4, Math.round(w / 6), ink(0.5))
}

function paintIcicle(g: G, r: Rand, up: boolean): void {
  // Painted hanging; the spire is the same thing set on its head.
  if (up) g.rotate(Math.PI)
  const shape: Pt[] = [
    [-13, -50],
    [13, -50],
    [10, -30],
    [7, 4],
    [3.5, 34],
    [1, 50],
    [-2.5, 30],
    [-7, 0],
    [-11, -30],
  ]
  fillRough(g, r, shape, PAPER, 14, 0.7)
  g.save()
  g.translate(1.5, 1)
  fillRough(g, r, [[-2, -46], [10, -46], [5, 2], [1.5, 40]], tint(0.3), 14, 0.6)
  g.restore()
  cut(g, r, shape, INK, 3, true, 14, 0.7)
  cut(g, r, [[-5, -40], [-3, -8]], ink(0.5), 1.5)
}

function paintChild(g: G, r: Rand): void {
  // A frost child: a small bell of a cloak, a pointed hood, a red scarf.
  const cloak: Pt[] = [
    [5, -33],
    [10, -24],
    [12, -10],
    [14, 6],
    [21, 25],
    [10, 28],
    [0, 25],
    [-10, 28],
    [-21, 25],
    [-14, 6],
    [-12, -10],
    [-7, -22],
    [-1, -30],
  ]
  fillRough(g, r, cloak, PAPER, 9, 0.7)
  stipple(g, r, 9, 16, 8, 8, 12, ink(0.5))
  cut(g, r, cloak, INK, 2.8, true, 9, 0.6)
  cut(g, r, [[-8.5, -6], [-5, -14.5], [1, -17], [7, -14], [9.5, -6]], ink(0.75), 1.6, false, 6, 0.4)
  g.save()
  g.translate(1.6, 1.2)
  fillRough(g, r, [[-12, -1], [12, -2], [13, 4], [20, 12], [15, 15], [9, 5.5], [-12, 5]], RED, 8, 0.6)
  g.restore()
  g.fillStyle = INK
  g.fillRect(-4.6, -9.6, 2.6, 2.8)
  g.fillRect(2.6, -9.6, 2.6, 2.8)
  cut(g, r, [[-12, 31], [-2, 31]], INK, 2.2)
  cut(g, r, [[3, 31], [13, 31]], INK, 2.2)
  salt(g, r, -24, -36, 48, 72, 18, true)
}

function paintKing(g: G, r: Rand, sit: boolean): void {
  // Old King Winter: a tall white cloak, a long beard, a small gold crown.
  // Seated, the cloak spreads and he is two thirds the height.
  const hem = sit ? 58 : 86
  const spread = sit ? 66 : 46
  const sh = sit ? -28 : -52
  const head = sh - 15
  const cloak: Pt[] = [
    [-20, sh - 4],
    [20, sh - 4],
    [30, sh + 16],
    [spread * 0.72, hem * 0.45],
    [spread, hem - 4],
    [spread * 0.55, hem + 2],
    [spread * 0.1, hem - 2],
    [-spread * 0.4, hem + 2],
    [-spread, hem - 4],
    [-spread * 0.72, hem * 0.45],
    [-30, sh + 16],
  ]
  // The staff behind his arm.
  cut(g, r, [[-spread * 0.82 - 4, hem + 1], [-spread * 0.82 - 2, head - 34]], INK, 4)
  fourStar(g, r, -spread * 0.82 - 2, head - 44, 14, 4.6, GOLD, 1.8)
  fillRough(g, r, cloak, PAPER, 12, 1)
  // The red lining where the cloak falls open.
  g.save()
  g.translate(2, 1.5)
  fillRough(g, r, [[-2, sh + 34], [4, sh + 34], [15, hem - 3], [5, hem - 1], [-11, hem - 3]], RED, 12, 0.8)
  g.restore()
  cut(g, r, [[-2, sh + 34], [-12, hem - 2]], INK, 2.2)
  cut(g, r, [[4, sh + 34], [16, hem - 2]], INK, 2.2)
  // Folds.
  cut(g, r, [[-22, sh + 22], [-spread * 0.62, hem - 8]], ink(0.7), 2)
  cut(g, r, [[24, sh + 24], [spread * 0.64, hem - 8]], ink(0.7), 2)
  cut(g, r, [[-12, sh + 46], [-spread * 0.3, hem - 6]], ink(0.5), 1.6)
  cut(g, r, [[14, sh + 50], [spread * 0.36, hem - 6]], ink(0.5), 1.6)
  stipple(g, r, spread * 0.5, hem - 16, spread * 0.3, 12, 40, ink(0.5))
  cut(g, r, cloak, INK, 3.4, true, 12, 0.9)
  // Fur along the hem and the collar: short strokes.
  for (let x = -spread + 6; x < spread - 4; x += 6.5) cut(g, r, [[x, hem - 9 - Math.abs(x) * 0.02], [x + 1.5, hem - 14]], INK, 1.6)
  // The arm that holds the staff.
  fillRough(g, r, [[-26, sh + 12], [-spread * 0.82 + 2, sh + 40], [-spread * 0.82 - 8, sh + 46], [-34, sh + 30]], PAPER, 10, 0.6)
  cut(g, r, [[-26, sh + 12], [-spread * 0.82 + 2, sh + 40], [-spread * 0.82 - 8, sh + 46], [-34, sh + 30]], INK, 2.6, true, 10, 0.6)
  // Head, beard, crown.
  disc(g, r, 0, head, 17, PAPER, 0.8)
  const beard: Pt[] = [
    [-17, head + 1],
    [-19, head + 20],
    [-12, head + 44],
    [-2, head + (sit ? 62 : 74)],
    [8, head + 46],
    [18, head + 22],
    [17, head + 1],
    [9, head + 4],
    [0, head + 7],
    [-9, head + 4],
  ]
  fillRough(g, r, beard, PAPER, 9, 0.8)
  cut(g, r, beard, INK, 2.6, true, 9, 0.7)
  for (let i = -1; i <= 1; i++) {
    cut(g, r, [[i * 7, head + 14], [i * 6 - 2, head + 30], [i * 4, head + 46]], ink(0.6), 1.5, false, 8, 0.8)
  }
  const arc: Pt[] = []
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI
    arc.push([Math.cos(a) * 17, head + Math.sin(a) * 17])
  }
  cut(g, r, arc, INK, 2.8, false, 8, 0.6)
  g.fillStyle = INK
  g.beginPath()
  g.arc(-6.5, head - 3, 1.9, 0, TAU)
  g.arc(6.5, head - 3, 1.9, 0, TAU)
  g.fill()
  cut(g, r, [[-10.5, head - 9.5], [-7, head - 10.5], [-3.5, head - 9.5]], ink(0.6), 1.4, false, 999, 0.3)
  cut(g, r, [[3.5, head - 9.5], [7, head - 10.5], [10.5, head - 9.5]], ink(0.6), 1.4, false, 999, 0.3)
  g.save()
  g.translate(1.5, 1)
  fillRough(
    g,
    r,
    [
      [-15, head - 11],
      [-17, head - 27],
      [-9, head - 19],
      [-5, head - 30],
      [0, head - 20],
      [5, head - 30],
      [9, head - 19],
      [17, head - 27],
      [15, head - 11],
    ],
    GOLD,
    999,
    0.6,
  )
  g.restore()
  cut(
    g,
    r,
    [
      [-15, head - 11],
      [-17, head - 27],
      [-9, head - 19],
      [-5, head - 30],
      [0, head - 20],
      [5, head - 30],
      [9, head - 19],
      [17, head - 27],
      [15, head - 11],
    ],
    INK,
    2,
    true,
    999,
    0.5,
  )
  salt(g, r, -80, -110, 160, 220, 70, true)
}

function paintRobin(g: G, r: Rand): void {
  const body: Pt[] = []
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU
    body.push([Math.cos(a) * 13, Math.sin(a) * 11])
  }
  cut(g, r, [[-10, 2], [-24, -3]], INK, 4.5)
  fillRough(g, r, body, PAPER, 999, 0.6)
  g.save()
  g.translate(1.5, 1.2)
  fillRough(g, r, [[3, -5], [11, -2], [10, 6], [2, 9], [-3, 3]], RED, 999, 0.5)
  g.restore()
  cut(g, r, body, INK, 2.6, true, 999, 0.5)
  fillRough(g, r, [[12, -4], [19, -2], [12, 0]], GOLD, 999, 0.3)
  g.fillStyle = INK
  g.fillRect(6, -6.5, 2.6, 2.6)
  cut(g, r, [[-7, -4], [-1, 2]], INK, 2)
  cut(g, r, [[-2, 10], [-2, 16]], INK, 1.5)
  cut(g, r, [[3, 10], [3, 16]], INK, 1.5)
}

function paintSun(S: number, r: Rand, color: string): Sprite {
  return sprite(120, 120, S, (g) => {
    disc(g, r, 0, 0, SUN.r, color, 1.1)
    // Carved rings: bare paper.
    for (const rad of [16, 30]) {
      const pts: Pt[] = []
      const a0 = r() * TAU
      for (let i = 0; i <= 14; i++) {
        const a = a0 + (i / 14) * TAU * 0.72
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad])
      }
      cut(g, r, pts, 'rgba(241,240,231,0.75)', 2.2, false, 999, 0.5)
    }
    salt(g, r, -60, -60, 120, 120, 90, true)
  })
}

export function buildArt(seed: number, S: number): Art {
  const r = rng(seed)

  const [land, lg] = canvas(W, H, S)
  paintLand(lg, r)
  const landNight = tinted({ c: land, w: W, h: H }, 0.56, NIGHT).c

  const [skyDay, sdg] = canvas(W, SKY_H, S)
  paintSkyDay(sdg, r)
  const [skyGold, sgg] = canvas(W, SKY_H, S)
  paintSkyGold(sgg, r)
  const [skyNight, sng] = canvas(W, SKY_H, S)
  paintSkyNight(sng, r)

  // Paper tooth and stray specks, laid over the whole print at the end.
  const [grain, gg] = canvas(W, H, 1)
  for (let i = 0; i < 6500; i++) {
    const light = r() < 0.55
    gg.globalAlpha = light ? 0.1 + r() * 0.3 : 0.03 + r() * 0.09
    gg.fillStyle = light ? PAPER : INK
    const s = 0.8 + r() * r() * 2.6
    gg.fillRect(r() * W, r() * H, s, s * (0.5 + r()))
  }
  for (let i = 0; i < 60; i++) {
    gg.globalAlpha = 0.05 + r() * 0.08
    gg.strokeStyle = r() < 0.6 ? PAPER : INK
    gg.lineWidth = 0.8
    const x = r() * W
    const y = r() * H
    gg.beginPath()
    gg.moveTo(x, y)
    gg.lineTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 16)
    gg.stroke()
  }
  gg.globalAlpha = 1
  // The plates stop short of the paper's edge, and not in a straight line.
  {
    const top: Pt[] = [[-6, -6]]
    const bottom: Pt[] = [[-6, H + 6]]
    for (let x = -6; x <= W + 6; x += 26) {
      top.push([x, 7 + r() * 4.5])
      bottom.push([x, H - 7 - r() * 4.5])
    }
    top.push([W + 6, -6])
    bottom.push([W + 6, H + 6])
    const left: Pt[] = [[-6, -6]]
    const right: Pt[] = [[W + 6, -6]]
    for (let y = -6; y <= H + 6; y += 26) {
      left.push([7 + r() * 4.5, y])
      right.push([W - 7 - r() * 4.5, y])
    }
    left.push([-6, H + 6])
    right.push([W + 6, H + 6])
    for (const side of [top, bottom, left, right]) fillRough(gg, r, side, PAPER, 9, 1.1)
    gg.fillStyle = INK
    for (let i = 0; i < 26; i++) {
      gg.globalAlpha = 0.25 + r() * 0.4
      const along = r()
      const s = 1 + r() * 1.8
      if (r() < 0.5) gg.fillRect(along * W, r() < 0.5 ? 2 + r() * 6 : H - 3 - r() * 6, s, s)
      else gg.fillRect(r() < 0.5 ? 2 + r() * 6 : W - 3 - r() * 6, along * H, s, s)
    }
    gg.globalAlpha = 1
  }

  const cloud = sprite(300, 90, S, (g) => {
    const pts: Pt[] = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      pts.push([-130 + 260 * t, 14 - (26 + 10 * Math.sin(t * 9)) * Math.sin(t * Math.PI) ** 0.7])
    }
    fillRough(g, r, [...pts, [120, 20], [-124, 21]], PAPER, 12, 1.2)
    for (let i = 0; i < 4; i++) cut(g, r, [[-96 + i * 16, 27 + i * 5], [70 - i * 30, 27 + i * 5]], PAPER, 3, false, 30, 0.8)
    salt(g, r, -150, -45, 300, 90, 60, true)
  })

  const rays = sprite(220, 220, S, (g) => {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + (r() - 0.5) * 0.08
      const inner = 58 + r() * 3
      const outer = 74 + (i % 2) * 16 + r() * 6
      cut(g, r, [[Math.cos(a) * inner, Math.sin(a) * inner], [Math.cos(a) * outer, Math.sin(a) * outer]], GOLD, 5, false, 999, 0.6)
    }
  })

  const afterglow = sprite(260, 150, S, (g) => {
    // What the sun leaves on the ridge: red dots thinning outward.
    for (let y = -62; y < 60; y += 9) {
      for (let x = -124 + ((Math.round(y / 9) & 1) ? 4.5 : 0); x < 124; x += 9) {
        const d = Math.hypot(x / 124, (y - 46) / 104)
        const rad = 3.9 * (1 - d) ** 0.9
        if (d < 1 && rad > 0.5) {
          g.fillStyle = RED
          g.beginPath()
          g.arc(x, y, rad, 0, TAU)
          g.fill()
        }
      }
    }
  })

  const aurora = [0, 1, 2].map((i) => {
    const w = 560
    const h = 250
    const [c, g] = canvas(w, h, S)
    paintAurora(g, r, w, h, i * 2.1 + r() * 3)
    return { c, w, h }
  })

  const star = sprite(36, 36, S, (g) => {
    fourStar(g, r, 0, 0, 15, 3.6, GOLD)
    g.fillStyle = PAPER
    g.fillRect(-1.6, -1.6, 3.2, 3.2)
  })

  // The light a frost child hangs: a white flame with a red heart, on a thread.
  const light = sprite(40, 48, S, (g) => {
    cut(g, r, [[0, -22], [0, -8]], INK, 1.6)
    fourStar(g, r, 0, 2, 16, 5.5, PAPER)
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2
      cut(g, r, [[Math.cos(a) * 8, 2 + Math.sin(a) * 8], [Math.cos(a) * 13, 2 + Math.sin(a) * 13]], PAPER, 2)
    }
    disc(g, r, 0.5, 2.5, 3.2, RED, 0.4)
  })

  // Lantern light in a print: a screen of gold dots that thin with distance.
  const halo = sprite(320, 320, S, (g) => {
    g.fillStyle = GOLD
    for (let row = -17; row <= 17; row++) {
      for (let col = -17; col <= 17; col++) {
        const x = col * 9 + (row & 1 ? 4.5 : 0)
        const y = row * 9
        const d = Math.hypot(x, y) / 156
        if (d >= 1) continue
        const rad = 4.1 * (1 - d) ** 0.85 * (0.85 + r() * 0.3)
        if (rad < 0.45) continue
        g.beginPath()
        g.arc(x, y, rad, 0, TAU)
        g.fill()
      }
    }
  })

  // Sun through ice, lying on the snow: gold bars that taper away from it.
  const streak = sprite(400, 34, S, (g) => {
    for (let i = 0; i < 4; i++) {
      const y = -12 + i * 8
      const reach = 0.55 + r() * 0.45
      const x0 = 196 - 392 * reach
      fillRough(g, r, [[196, y - 2.8], [196, y + 2.8], [x0 + 60, y + 1.8], [x0, y + 0.3], [x0 + 60, y - 1.6]], GOLD, 26, 0.8)
    }
    salt(g, r, -200, -17, 400, 34, 120, true)
  })

  const brick = sprite(108, 80, S, (g) => paintBrick(g, r))
  const ball = sprite(80, 78, S, (g) => paintBall(g, r))

  const frost = sprite(96, 96, S, (g) => {
    // Breath on cold glass: feathers of white growing out from a point.
    g.strokeStyle = PAPER
    for (let i = 0; i < 26; i++) {
      const a = r() * TAU
      const len = 10 + r() * 30
      const x0 = Math.cos(a) * r() * 8
      const y0 = Math.sin(a) * r() * 8
      g.globalAlpha = 0.35 + r() * 0.4
      g.lineWidth = 1.4 + r() * 1.4
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len)
      g.stroke()
      for (let j = 1; j <= 3; j++) {
        const t = j / 4
        const bx = x0 + Math.cos(a) * len * t
        const by = y0 + Math.sin(a) * len * t
        const bl = (1 - t) * len * 0.36
        for (const side of [-1, 1]) {
          g.beginPath()
          g.moveTo(bx, by)
          g.lineTo(bx + Math.cos(a + side * 0.95) * bl, by + Math.sin(a + side * 0.95) * bl)
          g.stroke()
        }
      }
    }
    g.fillStyle = PAPER
    for (let i = 0; i < 90; i++) {
      const a = r() * TAU
      const d = r() * 40
      g.globalAlpha = 0.25 + r() * 0.5 * (1 - d / 44)
      g.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.5 + r() * 2, 1.5 + r() * 2)
    }
    g.globalAlpha = 1
  })

  const mark = sprite(40, 22, S, (g) => {
    const arc: Pt[] = []
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * 0.08 + (i / 8) * Math.PI * 0.84
      arc.push([Math.cos(a) * 13, -4 + Math.sin(a) * 7])
    }
    cut(g, r, arc, ink(0.6), 2.2, false, 999, 0.5)
    stipple(g, r, 0, -3, 8, 2.5, 6, ink(0.45))
  })

  const dent = sprite(84, 44, S, (g) => {
    const arc: Pt[] = []
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI
      arc.push([Math.cos(a) * 32, 6 + Math.sin(a) * 15])
    }
    g.save()
    g.translate(2, 1.5)
    fillRough(g, r, [...arc, [20, 12], [-20, 12]], tint(0.3), 10, 0.8)
    g.restore()
    cut(g, r, arc, INK, 2.8, false, 10, 0.7)
    for (let i = 0; i < 5; i++) cut(g, r, [[-20 + i * 9, -3 + (i % 2) * 3], [-23 + i * 9, 4 + (i % 2) * 3]], ink(0.6), 1.5)
  })

  const dash = sprite(120, 12, S, (g) => {
    for (let x = -56; x < 50; x += 13 + r() * 8) cut(g, r, [[x, (r() - 0.5) * 4], [x + 6 + r() * 8, (r() - 0.5) * 4]], ink(0.5), 1.8)
  })

  const robin = sprite(56, 40, S, (g) => paintRobin(g, r))
  const ices = new Map<string, IceSprite>()
  const caps = new Map<number, Sprite>()
  const icicle = sprite(44, 112, S, (g) => paintIcicle(g, r, false))
  const spire = sprite(44, 112, S, (g) => paintIcicle(g, r, true))

  return {
    S,
    landDay: land,
    landNight,
    skyDay,
    skyGold,
    skyNight,
    grain,
    cloud,
    sunGold: paintSun(S, r, GOLD),
    sunRed: paintSun(S, r, RED),
    rays,
    afterglow,
    aurora,
    star,
    light,
    halo,
    streak,
    icicle,
    icicleNight: tinted(icicle, 0.34, NIGHT),
    spire,
    brick,
    brickNight: tinted(brick, 0.26, NIGHT),
    ball,
    ballNight: tinted(ball, 0.26, NIGHT),
    child: sprite(56, 76, S, (g) => paintChild(g, r)),
    kingStand: sprite(150, 260, S, (g) => paintKing(g, r, false)),
    kingSit: sprite(176, 210, S, (g) => paintKing(g, r, true)),
    robin,
    robinNight: tinted(robin, 0.4, NIGHT),
    frost,
    mark,
    dent,
    dash,
    ice(w, variant) {
      const key = `${w}:${variant}`
      let s = ices.get(key)
      if (!s) {
        s = paintIce(S, w, 977 + w * 13 + variant * 101)
        ices.set(key, s)
      }
      return s
    },
    cap(w) {
      let s = caps.get(w)
      if (!s) {
        const rr = rng(31 + w)
        s = sprite(w + 20, 44, S, (g) => paintCap(g, rr, w))
        caps.set(w, s)
      }
      return s
    },
  }
}
