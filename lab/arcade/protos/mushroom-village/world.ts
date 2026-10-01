// Where things are in the glade: the skyline, the stream and its two banks,
// the patches of sun and fern, the tray, and where the gnomes wait. Pure
// numbers, no canvas.

import { clamp, lerp } from '../../kit/math.ts'
import { W } from '../../kit/types.ts'

// The sun travels straight up and down in the gap between the trees.
export const SUN = { x: 930, up: 96, down: 292, r: 50 }

// The top edge of the green: a wobbly line with a hill where the sun sets.
export function skyline(x: number): number {
  return 300 - 30 * Math.exp(-(((x - SUN.x) / 190) ** 2)) + 7 * Math.sin(x / 130 + 1)
}

// Mushrooms stand between these two lines.
export const GROUND = { top: 366, bottom: 652 }

// Things further back are drawn a little smaller.
export function depth(y: number): number {
  return lerp(0.8, 1.08, clamp((y - GROUND.top) / (GROUND.bottom - GROUND.top), 0, 1))
}

// ------------------------------------------------------------ the stream

export interface StreamPoint {
  x: number
  y: number
  // Half the width of the water here.
  hw: number
  // Unit tangent (downstream) and the normal that points to the right bank.
  tx: number
  ty: number
}

const P = [
  [700, 286],
  [690, 470],
  [400, 500],
  [232, 840],
] as const

function bez(i: 0 | 1, t: number): number {
  const u = 1 - t
  return u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]
}

function dbez(i: 0 | 1, t: number): number {
  const u = 1 - t
  return 3 * u * u * (P[1][i] - P[0][i]) + 6 * u * t * (P[2][i] - P[1][i]) + 3 * t * t * (P[3][i] - P[2][i])
}

export const STREAM: StreamPoint[] = []
for (let i = 0; i <= 56; i++) {
  const t = i / 56
  const dx = dbez(0, t)
  const dy = dbez(1, t)
  const len = Math.hypot(dx, dy) || 1
  STREAM.push({ x: bez(0, t), y: bez(1, t), hw: lerp(21, 50, t), tx: dx / len, ty: dy / len })
}

export interface StreamHit {
  // Distance from the middle of the water, and the half-width there.
  d: number
  hw: number
  // 1 on the left bank (the big tree's side), -1 on the right.
  bank: 1 | -1
  // Index of the nearest sample.
  i: number
}

export function streamAt(x: number, y: number): StreamHit {
  let best = Infinity
  let at = 0
  for (let i = 0; i < STREAM.length; i++) {
    const s = STREAM[i]!
    const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y)
    if (d < best) {
      best = d
      at = i
    }
  }
  const s = STREAM[at]!
  const cross = s.tx * (y - s.y) - s.ty * (x - s.x)
  return { d: Math.sqrt(best), hw: s.hw, bank: cross > 0 ? 1 : -1, i: at }
}

export function inWater(x: number, y: number): boolean {
  const h = streamAt(x, y)
  return h.d < h.hw * 0.94
}

// A straight walk between two points that never wets a boot.
export function dryWalk(ax: number, ay: number, bx: number, by: number): boolean {
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 16))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    if (inWater(lerp(ax, bx, t), lerp(ay, by, t))) return false
  }
  return true
}

// ------------------------------------------------------------ sun, shade, fern

export interface Patch {
  x: number
  y: number
  rx: number
  ry: number
}

export const SUNNY: Patch[] = [
  { x: 850, y: 505, rx: 285, ry: 132 },
  { x: 300, y: 560, rx: 118, ry: 56 },
]

export const FERNY: Patch[] = [
  { x: 108, y: 612, rx: 118, ry: 62 },
  { x: 1092, y: 402, rx: 96, ry: 62 },
  { x: 470, y: 392, rx: 92, ry: 44 },
]

function inside(p: Patch, x: number, y: number, grow = 1): boolean {
  const dx = (x - p.x) / (p.rx * grow)
  const dy = (y - p.y) / (p.ry * grow)
  return dx * dx + dy * dy < 1
}

export type CapKind = 'red' | 'brown' | 'pale'

// The cap takes its colour from where it grows.
export function capAt(x: number, y: number): CapKind {
  for (const p of FERNY) if (inside(p, x, y)) return 'pale'
  for (const p of SUNNY) if (inside(p, x, y, 0.96)) return 'red'
  return 'brown'
}

// ------------------------------------------------------------ the tray

export type PartKind = 'door' | 'window' | 'chimney' | 'balcony' | 'ladder' | 'lantern' | 'line'

export const KINDS: readonly PartKind[] = ['door', 'window', 'chimney', 'balcony', 'ladder', 'lantern', 'line']

export const TRAY = { x: 438, y: 690, w: 704, h: 92, slot: 100, first: 490, cy: 734 }

export function slotX(i: number): number {
  return TRAY.first + i * TRAY.slot
}

export function onTray(x: number, y: number, pad = 0): boolean {
  return x > TRAY.x - pad && x < TRAY.x + TRAY.w + pad && y > TRAY.y - pad
}

// How many of each the gnomes made. Enough for a whole village, and it does
// run out.
export const STOCK: Record<PartKind, number> = { door: 10, window: 14, chimney: 8, balcony: 7, ladder: 7, lantern: 9, line: 6 }

// ------------------------------------------------------------ the gnomes' edge

export interface Spot {
  x: number
  y: number
  bank: 1 | -1
  // Where a newcomer walks in from.
  fromX: number
}

export const SPOTS: Spot[] = [
  { x: 70, y: 474, bank: 1, fromX: -50 },
  { x: 134, y: 498, bank: 1, fromX: -50 },
  { x: 204, y: 478, bank: 1, fromX: -50 },
  { x: 1136, y: 512, bank: -1, fromX: W + 50 },
  { x: 1090, y: 566, bank: -1, fromX: W + 50 },
  { x: 1140, y: 626, bank: -1, fromX: W + 50 },
]

// As many gnomes as there can be mushrooms.
export const MAX_SHROOMS = 10
