// The shadow box. Every layer is a sheet of coloured paper cut with scissors,
// baked once with its grain, a light edge where the cut catches the lamp, and
// the soft shadow it throws on the sheet behind. Nothing here runs per frame
// except `drawLayer` and `tone`.

import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { DOOR_R, HOLLOWS, LIMBS, PEEKS, STUB_TWIGS, TRUNK, backRidge, farHill, groundTop, limbAt, nearHill, trunkHalf } from './world.ts'
import type { Limb, Pt } from './world.ts'

type G = CanvasRenderingContext2D
export type Rand = () => number

// How far a layer is painted past the field, so it can slide.
export const M = 24

export interface Layer {
  day: HTMLCanvasElement
  night: HTMLCanvasElement
  x: number
  y: number
  w: number
  h: number
}

export interface Paper {
  skyDay: HTMLCanvasElement
  skyGold: HTMLCanvasElement
  skyNight: HTMLCanvasElement
  far: Layer
  near: Layer
  canopy: Layer
  tree: Layer
  ground: Layer
  fringe: Layer
  grass: Layer
  clumps: Layer[]
  clouds: Layer[]
  sun: Layer
  rays: Layer
  glow: HTMLCanvasElement
  frame: HTMLCanvasElement
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

function mk(w: number, h: number, scale: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * scale))
  c.height = Math.max(1, Math.ceil(h * scale))
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.scale(scale, scale)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  return [c, g]
}

// ---------------------------------------------------------------- colour

const NIGHT: [number, number, number] = [24, 32, 78]
const LAMP: [number, number, number] = [255, 200, 128]

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Each colour's dusk shades, worked out once: eleven depths of night by five
// of lamplight.
const tones = new Map<string, (string | undefined)[]>()

// A paper colour as it looks now: `night` 0..1 sinks it toward indigo, `lit`
// 0..1 is how much lantern light falls on it.
export function tone(hex: string, night: number, lit = 0): string {
  const n = Math.round(night * 10)
  if (n <= 0) return hex
  const l = Math.round(lit * 4)
  let shades = tones.get(hex)
  if (!shades) {
    shades = []
    tones.set(hex, shades)
  }
  const at = n * 5 + l
  const hit = shades[at]
  if (hit) return hit
  const c = rgb(hex)
  const dark = (n / 10) * 0.7 * (1 - (l / 4) * 0.72)
  const warm = (n / 10) * (l / 4) * 0.2
  const out: number[] = []
  for (let i = 0; i < 3; i++) {
    const v = c[i]! + (NIGHT[i]! - c[i]!) * dark
    out.push(Math.round(v + (LAMP[i]! - v) * warm))
  }
  const made = `rgb(${out[0]},${out[1]},${out[2]})`
  shades[at] = made
  return made
}

// ---------------------------------------------------------------- scissors

function smooth(g: G, pts: Pt[]): void {
  const n = pts.length
  const last = pts[n - 1]!
  const first = pts[0]!
  g.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2)
  for (let i = 0; i < n; i++) {
    const p = pts[i]!
    const q = pts[(i + 1) % n]!
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
  }
  g.closePath()
}

// A hand-cut round: never quite a circle.
function roundPts(r: Rand, cx: number, cy: number, rx: number, ry: number, wob = 0.06, n = 11): Pt[] {
  const pts: Pt[] = []
  const phase = r() * TAU
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU
    const k = 1 + (r() * 2 - 1) * wob
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return pts
}

function round(g: G, r: Rand, cx: number, cy: number, rx: number, ry: number, fill: string, wob = 0.06, n = 11): void {
  g.beginPath()
  smooth(g, roundPts(r, cx, cy, rx, ry, wob, n))
  g.fillStyle = fill
  g.fill()
}

// A leaf cut in two snips: pointed at both ends.
export function leafPath(g: G, x: number, y: number, len: number, wid: number, rot: number): void {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const hx = (c * len) / 2
  const hy = (s * len) / 2
  g.moveTo(x - hx, y - hy)
  g.quadraticCurveTo(x - s * wid, y + c * wid, x + hx, y + hy)
  g.quadraticCurveTo(x + s * wid, y - c * wid, x - hx, y - hy)
}

function leaf(g: G, x: number, y: number, len: number, wid: number, rot: number, fill: string, crease?: string): void {
  g.beginPath()
  leafPath(g, x, y, len, wid, rot)
  g.fillStyle = fill
  g.fill()
  if (crease) {
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    g.beginPath()
    g.moveTo(x - c * len * 0.36, y - s * len * 0.36)
    g.lineTo(x + c * len * 0.4, y + s * len * 0.4)
    g.strokeStyle = crease
    g.lineWidth = 1.2
    g.stroke()
  }
}

// The outline of a tapering limb, added to the current path.
function limbPath(g: G, l: Limb, dy = 0, thin = 1): void {
  const left: Pt[] = []
  const right: Pt[] = []
  const N = 16
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const u = 1 - t
    const at = limbAt(l, t)
    const tx = 2 * u * (l.c[0] - l.p0[0]) + 2 * t * (l.p1[0] - l.c[0])
    const ty = 2 * u * (l.c[1] - l.p0[1]) + 2 * t * (l.p1[1] - l.c[1])
    const tl = Math.hypot(tx, ty) || 1
    const w = (at.w * thin) / 2
    left.push([at.x + (-ty / tl) * w, at.y + dy + (tx / tl) * w])
    right.unshift([at.x - (-ty / tl) * w, at.y + dy - (tx / tl) * w])
  }
  g.moveTo(left[0]![0], left[0]![1])
  for (const p of left) g.lineTo(p[0], p[1])
  for (const p of right) g.lineTo(p[0], p[1])
  g.closePath()
}

function pick<T>(r: Rand, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(r() * items.length))]!
}

// One sheet glued on another: a small close shadow under whatever `fn` draws.
function glued(g: G, S: number, fn: () => void, depth = 1): void {
  g.shadowColor = 'rgba(40,28,18,0.3)'
  g.shadowBlur = 3.5 * S * depth
  g.shadowOffsetX = 1.2 * S * depth
  g.shadowOffsetY = 2.2 * S * depth
  fn()
  g.shadowColor = 'transparent'
  g.shadowBlur = 0
  g.shadowOffsetX = 0
  g.shadowOffsetY = 0
}

// ---------------------------------------------------------------- baking

function grain(r: Rand): HTMLCanvasElement {
  const [c, g] = mk(256, 256, 1)
  for (let i = 0; i < 2600; i++) {
    g.globalAlpha = 0.025 + r() * 0.05
    g.fillStyle = r() < 0.5 ? '#fffaf0' : '#2e2218'
    g.fillRect(r() * 256, r() * 256, 1 + r() * 1.6, 1 + r() * 1.6)
  }
  // A few fibres.
  g.lineWidth = 0.8
  for (let i = 0; i < 70; i++) {
    g.globalAlpha = 0.05 + r() * 0.06
    g.strokeStyle = r() < 0.6 ? '#fffaf0' : '#3a2a1c'
    const x = r() * 256
    const y = r() * 256
    const a = r() * TAU
    const l = 4 + r() * 9
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 4, x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
  return c
}

interface Cast {
  blur: number
  dx: number
  dy: number
  a: number
}

// The dusk copy of a sheet. It is kept at the field's own resolution even on
// a sharper screen: dusk is dim, and it halves what the box keeps in memory.
function nightCopy(src: HTMLCanvasElement, mix: number, shrink = 1): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(src.width * shrink))
  c.height = Math.max(1, Math.ceil(src.height * shrink))
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.drawImage(src, 0, 0, c.width, c.height)
  g.globalCompositeOperation = 'source-atop'
  g.globalAlpha = mix
  g.fillStyle = `rgb(${NIGHT[0]},${NIGHT[1]},${NIGHT[2]})`
  g.fillRect(0, 0, c.width, c.height)
  return c
}

// Cut a sheet: paint it, give it grain, a lit edge and a cast shadow, and keep
// a dusk copy.
function bake(tex: HTMLCanvasElement, S: number, x: number, y: number, w: number, h: number, cast: Cast, nightMix: number, paint: (g: G) => void): Layer {
  const [sheet, sg] = mk(w, h, S)
  sg.translate(-x, -y)
  paint(sg)
  sg.setTransform(1, 0, 0, 1, 0, 0)
  sg.globalCompositeOperation = 'source-atop'
  const pattern = sg.createPattern(tex, 'repeat')
  if (pattern) {
    sg.fillStyle = pattern
    sg.fillRect(0, 0, sheet.width, sheet.height)
  }

  const [edge, eg] = mk(w, h, S)
  eg.setTransform(1, 0, 0, 1, 0, 0)
  eg.drawImage(sheet, 0, 0)
  eg.globalCompositeOperation = 'source-in'
  eg.fillStyle = '#fff6e2'
  eg.fillRect(0, 0, edge.width, edge.height)

  const [out, og] = mk(w, h, S)
  og.setTransform(1, 0, 0, 1, 0, 0)
  og.shadowColor = `rgba(36,26,18,${cast.a})`
  og.shadowBlur = cast.blur * S
  og.shadowOffsetX = cast.dx * S
  og.shadowOffsetY = cast.dy * S
  og.drawImage(sheet, 0, 0)
  og.shadowColor = 'transparent'
  og.globalCompositeOperation = 'destination-over'
  og.globalAlpha = 0.7
  og.drawImage(edge, -0.9 * S, -1.3 * S)
  // The working sheets are done with; give their memory back now.
  sheet.width = 0
  edge.width = 0
  return { day: out, night: nightCopy(out, nightMix, S > 1.2 ? 1 / S : 1), x, y, w, h }
}

// Draw a sheet, slid by (ox, oy), fading to its dusk copy as night comes.
export function drawLayer(g: G, l: Layer, night: number, ox = 0, oy = 0): void {
  if (night < 0.995) g.drawImage(l.day, l.x + ox, l.y + oy, l.w, l.h)
  if (night > 0.005) {
    const a = g.globalAlpha
    g.globalAlpha = a * Math.min(1, night)
    g.drawImage(l.night, l.x + ox, l.y + oy, l.w, l.h)
    g.globalAlpha = a
  }
}

// ---------------------------------------------------------------- the sheets

function sky(tex: HTMLCanvasElement, stops: [number, string][], stars?: Rand): HTMLCanvasElement {
  const [c, g] = mk(W + M * 2, H, 1)
  const grad = g.createLinearGradient(0, 0, 0, 640)
  for (const [at, col] of stops) grad.addColorStop(at, col)
  g.fillStyle = grad
  g.fillRect(0, 0, W + M * 2, H)
  const pattern = g.createPattern(tex, 'repeat')
  if (pattern) {
    g.fillStyle = pattern
    g.fillRect(0, 0, W + M * 2, H)
  }
  if (stars) {
    // Pin-pricks in the night paper, with the lamp behind showing through.
    for (let i = 0; i < 90; i++) {
      const x = stars() * (W + M * 2)
      const y = stars() ** 1.5 * 340
      const rad = 0.8 + stars() * 1.5
      g.globalAlpha = 0.16
      g.fillStyle = '#ffe9b8'
      g.beginPath()
      g.arc(x, y, rad * 3.2, 0, TAU)
      g.fill()
      g.globalAlpha = 0.75 + stars() * 0.25
      g.fillStyle = '#fff4d6'
      g.beginPath()
      g.arc(x, y, rad, 0, TAU)
      g.fill()
    }
    g.globalAlpha = 1
  }
  return c
}

function ridge(g: G, fn: (x: number) => number, fill: string, bottom: number): void {
  g.beginPath()
  g.moveTo(-M - 4, bottom)
  for (let x = -M - 4; x <= W + M + 4; x += 14) g.lineTo(x, fn(x))
  g.lineTo(W + M + 4, bottom)
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

function paintFar(g: G, S: number): void {
  ridge(g, backRidge, '#c8dcd3', 720)
  glued(g, S, () => ridge(g, farHill, '#a9c8b6', 720), 2)
}

function paintNear(g: G, r: Rand, S: number): void {
  ridge(g, nearHill, '#b9cf90', 720)
  // Little trees on the hill, glued on.
  glued(g, S, () => {
    for (const x of [30, 132, 214, 468, 540, 812, 1090, 1164]) {
      const y = nearHill(x) + 14 + r() * 10
      const tall = 30 + r() * 16
      g.fillStyle = '#9a7a56'
      g.fillRect(x - 2, y - tall * 0.5, 4, tall * 0.5)
      if (r() < 0.5) {
        round(g, r, x, y - tall * 0.78, 13 + r() * 5, 15 + r() * 5, pick(r, ['#8fb27a', '#7fa66c']), 0.08, 9)
      } else {
        g.beginPath()
        g.moveTo(x, y - tall - 12)
        g.lineTo(x + 13, y - tall * 0.38)
        g.lineTo(x - 13, y - tall * 0.38)
        g.closePath()
        g.fillStyle = pick(r, ['#86ab78', '#79a06e'])
        g.fill()
      }
    }
  })
}

function paintGround(g: G, r: Rand, S: number): void {
  ridge(g, groundTop, '#8fb568', H + M + 10)
  glued(
    g,
    S,
    () => {
      ridge(g, (x) => 748 + 6 * Math.sin(x / 120 + 2) + 3 * Math.sin(x / 41), '#7ea95c', H + M + 10)
    },
    1.6,
  )
  // Snipped tufts and daisies.
  for (let i = 0; i < 46; i++) {
    const x = r() * W
    const y = groundTop(x) + 12 + r() * 62
    g.fillStyle = r() < 0.5 ? '#a3c478' : '#7aa257'
    g.beginPath()
    g.moveTo(x - 5, y)
    g.lineTo(x - 2, y - 9 - r() * 5)
    g.lineTo(x, y - 2)
    g.lineTo(x + 3, y - 11 - r() * 5)
    g.lineTo(x + 6, y)
    g.closePath()
    g.fill()
  }
  glued(g, S, () => {
    for (let i = 0; i < 16; i++) {
      const x = r() * W
      if (Math.abs(x - TRUNK) < 130) continue
      const y = groundTop(x) + 10 + r() * 22
      g.fillStyle = pick(r, ['#fbf4e2', '#fbf4e2', '#f3d57a', '#e9b7b0'])
      g.beginPath()
      g.arc(x, y, 3.4 + r() * 1.4, 0, TAU)
      g.fill()
      g.fillStyle = '#e0a93c'
      g.beginPath()
      g.arc(x, y, 1.3, 0, TAU)
      g.fill()
    }
  }, 0.6)
}

function paintGrass(g: G, r: Rand, S: number): void {
  const blade = (x: number, tall: number, lean: number, fill: string) => {
    g.beginPath()
    g.moveTo(x - 7, H + 12)
    g.quadraticCurveTo(x - 2 + lean * 0.4, H - tall * 0.5, x + lean, H - tall)
    g.quadraticCurveTo(x + 3 + lean * 0.4, H - tall * 0.5, x + 7, H + 12)
    g.closePath()
    g.fillStyle = fill
    g.fill()
  }
  for (let x = -M; x < W + M; x += 13 + r() * 9) blade(x, 14 + r() * 16, (r() - 0.5) * 14, pick(r, ['#5e9048', '#6b9c50', '#548443']))
  glued(g, S, () => {
    for (let x = -M; x < W + M; x += 24 + r() * 22) blade(x, 10 + r() * 14, (r() - 0.5) * 12, pick(r, ['#8cba64', '#9cc670']))
  })
  // Paper flowers in the two corners, out of the way of the pile.
  glued(g, S, () => {
    for (const [x0, x1] of [
      [4, 120],
      [1060, 1176],
    ] as Pt[]) {
      for (let i = 0; i < 4; i++) {
        const x = x0 + r() * (x1 - x0)
        const y = H - 24 - r() * 16
        g.strokeStyle = '#4f7d40'
        g.lineWidth = 2.4
        g.beginPath()
        g.moveTo(x, H + 6)
        g.lineTo(x, y)
        g.stroke()
        const col = pick(r, ['#fbf4e2', '#f2cf63', '#e6a9a2', '#c9b4dc'])
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU + r()
          g.fillStyle = col
          g.beginPath()
          g.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4.4, 3, a, 0, TAU)
          g.fill()
        }
        g.fillStyle = '#d99a34'
        g.beginPath()
        g.arc(x, y, 2.6, 0, TAU)
        g.fill()
      }
    }
  })
}

const CROWN: [number, number, number][] = [
  [246, 46, 108],
  [380, 12, 122],
  [520, 0, 122],
  [650, -10, 132],
  [790, 0, 122],
  [930, 12, 122],
  [1070, 34, 122],
  [1186, 70, 112],
  [304, 152, 104],
  [430, 122, 110],
  [560, 112, 100],
  [740, 112, 100],
  [870, 122, 110],
  [1000, 142, 110],
  [1124, 186, 110],
  [258, 250, 78],
  [366, 232, 88],
  [944, 226, 90],
  [1084, 272, 98],
  [1166, 336, 80],
  [522, 212, 78],
  [790, 206, 78],
  [650, 172, 90],
]

function paintCanopy(g: G, r: Rand, S: number): void {
  // The back sheet: one big scalloped cut.
  g.fillStyle = '#4d7c49'
  g.beginPath()
  for (const [x, y, rad] of CROWN) {
    g.moveTo(x + rad, y)
    g.arc(x, y, rad, 0, TAU)
  }
  g.fill()
  // Lighter sheets glued over it, each a little higher and to the left, the
  // way light falls on a crown.
  glued(
    g,
    S,
    () => {
      for (const [x, y, rad] of CROWN) {
        if (r() < 0.2) continue
        round(g, r, x - rad * 0.12 + (r() - 0.5) * 20, y - rad * 0.14 + (r() - 0.5) * 16, rad * (0.58 + r() * 0.1), rad * (0.5 + r() * 0.1), '#63934f', 0.1, 10)
      }
    },
    1.6,
  )
  glued(g, S, () => {
    for (const [x, y, rad] of CROWN) {
      if (r() < 0.4) continue
      round(g, r, x - rad * 0.28 + (r() - 0.5) * 24, y - rad * 0.3 + (r() - 0.5) * 18, rad * (0.26 + r() * 0.1), rad * (0.22 + r() * 0.08), '#7fae58', 0.12, 9)
    }
  })
  // Single leaves snipped out and stuck round the edges.
  glued(g, S, () => {
    const greens = ['#3f6c40', '#5b8c4a', '#86b35c', '#9cc267', '#6d9d52']
    for (const [x, y, rad] of CROWN) {
      const n = 5 + Math.floor(r() * 4)
      for (let i = 0; i < n; i++) {
        const a = r() * TAU
        const d = rad * (0.78 + r() * 0.3)
        const lx = x + Math.cos(a) * d
        const ly = y + Math.sin(a) * d
        if (lx < 170 && ly > 60) continue
        const gold = r() < 0.07
        leaf(g, lx, ly, 22 + r() * 16, 7 + r() * 4, a + (r() - 0.5) * 1.2, gold ? '#e2b84e' : pick(r, greens), gold ? '#f0d58a' : undefined)
      }
    }
  }, 0.8)
}

function paintTree(g: G, r: Rand, S: number): void {
  const BARK = '#a57549'
  // Trunk and limbs are cut from the same brown sheet. Each is filled on its
  // own so that where they overlap they do not cut each other out.
  g.fillStyle = BARK
  g.beginPath()
  g.moveTo(TRUNK - trunkHalf(790), 790)
  for (let y = 790; y >= 214; y -= 24) g.lineTo(TRUNK - trunkHalf(y) + Math.sin(y / 37) * 2.5, y)
  g.quadraticCurveTo(TRUNK - 40, 196, TRUNK, 204)
  g.quadraticCurveTo(TRUNK + 40, 196, TRUNK + trunkHalf(214) + Math.sin(214 / 31 + 2) * 2.5, 214)
  for (let y = 238; y <= 790; y += 24) g.lineTo(TRUNK + trunkHalf(y) + Math.sin(y / 31 + 2) * 2.5, y)
  g.closePath()
  g.fill()
  for (const l of LIMBS) {
    g.beginPath()
    limbPath(g, l)
    g.fill()
  }
  // The twigs a string can be tied to.
  g.strokeStyle = BARK
  for (const [base, tip] of STUB_TWIGS) {
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(base[0], base[1])
    g.lineTo(tip[0], tip[1] + 6)
    g.stroke()
    g.lineWidth = 4.5
    g.beginPath()
    g.moveTo(tip[0] - 7, tip[1] - 5)
    g.lineTo(tip[0], tip[1] + 6)
    g.lineTo(tip[0] + 7, tip[1] - 5)
    g.stroke()
  }

  // Bark: darker and lighter strips glued along the trunk and under the limbs.
  glued(g, S, () => {
    g.fillStyle = '#8e603c'
    for (let i = 0; i < 8; i++) {
      g.beginPath()
      limbPath(g, LIMBS[i]!, i < 6 ? LIMBS[i]!.w0 * 0.2 : 2, i < 6 ? 0.34 : 0.3)
      g.fill()
    }
    for (let i = 0; i < 9; i++) {
      const y0 = 230 + r() * 380
      const len = 70 + r() * 120
      const half = trunkHalf(y0 + len / 2) - 14
      const x = TRUNK + (r() * 2 - 1) * half
      const wide = 4 + r() * 5
      const lean = (r() - 0.5) * 10
      g.fillStyle = r() < 0.62 ? '#8e603c' : '#bd8f62'
      g.beginPath()
      g.moveTo(x, y0)
      g.quadraticCurveTo(x + wide + lean, y0 + len / 2, x + lean * 0.4, y0 + len)
      g.quadraticCurveTo(x - wide + lean, y0 + len / 2, x, y0)
      g.fill()
    }
    // Two knots.
    for (const [x, y] of [
      [TRUNK - 34, 476],
      [TRUNK + 30, 316],
    ] as Pt[]) {
      round(g, r, x, y, 9, 7, '#8e603c', 0.1, 8)
      round(g, r, x, y, 4, 3, '#6f4a30', 0.1, 7)
    }
  }, 0.7)

  // A sprig of leaves at the end of each limb.
  glued(g, S, () => {
    const greens = ['#5b8c4a', '#86b35c', '#9cc267', '#6d9d52', '#74a550']
    for (let i = 0; i < LIMBS.length; i++) {
      if (i === 6 || i === 7) continue
      const l = LIMBS[i]!
      const out = Math.atan2(l.p1[1] - l.c[1], l.p1[0] - l.c[0])
      for (let k = 0; k < 4; k++) {
        const a = out + (k - 1.5) * 0.55 + (r() - 0.5) * 0.2
        const len = 26 + r() * 10
        leaf(g, l.p1[0] + Math.cos(a) * (len * 0.5 + 2), l.p1[1] + Math.sin(a) * (len * 0.5 + 2), len, 8 + r() * 3, a, pick(r, greens), '#c4e08e')
      }
    }
  }, 0.8)

  // The hollows: holes cut through the bark to a dark sheet behind.
  for (const hole of HOLLOWS) {
    round(g, r, hole.x, hole.y, DOOR_R - 3, DOOR_R - 1, '#2f221c', 0.03, 12)
    g.save()
    g.beginPath()
    g.ellipse(hole.x, hole.y, DOOR_R - 4, DOOR_R - 2, 0, 0, TAU)
    g.clip()
    g.fillStyle = '#4a352a'
    g.beginPath()
    g.ellipse(hole.x + 5, hole.y + 7, DOOR_R - 3, DOOR_R - 1, 0, 0, TAU)
    g.fill()
    g.restore()
  }
}

function paintFringe(g: G, r: Rand, S: number): void {
  const greens = ['#8fbb5e', '#a6cc6b', '#74a550', '#9cc267']
  g.fillStyle = '#74a550'
  g.beginPath()
  for (let x = 200; x < W + M; x += 46) {
    const rad = 26 + r() * 14
    g.moveTo(x + rad, -8)
    g.arc(x, -8 + r() * 6, rad, 0, TAU)
  }
  g.fill()
  glued(g, S, () => {
    for (let x = 190; x < W + M; x += 20 + r() * 16) {
      const gold = r() < 0.06
      leaf(g, x, 14 + r() * 22, 30 + r() * 16, 9 + r() * 4, Math.PI / 2 + (r() - 0.5) * 1.1, gold ? '#e2b84e' : pick(r, greens), gold ? '#f0d58a' : '#c4e08e')
    }
  })
}

function paintClump(g: G, r: Rand, S: number, cx: number, cy: number): void {
  const greens = ['#8fbb5e', '#a6cc6b', '#74a550', '#9cc267', '#82b157']
  // A bunch of leaves: a scalloped sheet, lighter rounds on it, and a row of
  // single leaves along the top for someone to look over.
  g.fillStyle = '#6a9c4c'
  g.beginPath()
  for (const [dx, dy, rad] of [
    [-36, 24, 26],
    [-10, 10, 31],
    [22, 15, 29],
    [42, 32, 23],
    [-22, 42, 27],
    [14, 44, 29],
  ] as [number, number, number][]) {
    g.moveTo(cx + dx + rad, cy + dy)
    g.arc(cx + dx, cy + dy, rad, 0, TAU)
  }
  g.fill()
  glued(g, S, () => {
    round(g, r, cx - 16, cy + 16, 21, 18, '#7fae55', 0.1, 9)
    round(g, r, cx + 22, cy + 24, 19, 16, '#8fbb5e', 0.1, 9)
    round(g, r, cx - 30, cy + 38, 15, 13, '#8fbb5e', 0.1, 8)
    round(g, r, cx + 4, cy + 46, 17, 13, '#7fae55', 0.1, 8)
  })
  glued(g, S, () => {
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.92 + (i / 6) * Math.PI * 0.84 + (r() - 0.5) * 0.25
      const d = 36 + r() * 6
      const gold = r() < 0.1
      leaf(g, cx + Math.cos(a) * d * 1.15, cy + 26 + Math.sin(a) * d, 28 + r() * 8, 9 + r() * 3, a + (r() - 0.5) * 0.5, gold ? '#e2b84e' : pick(r, greens), gold ? '#f0d58a' : '#c4e08e')
    }
  }, 0.8)
}

function paintCloud(g: G, r: Rand, w: number): void {
  g.fillStyle = '#fbf6ea'
  g.beginPath()
  const n = 4 + Math.floor(r() * 2)
  for (let i = 0; i < n; i++) {
    const x = 34 + (i / (n - 1)) * (w - 68)
    const rad = 20 + r() * 12 - Math.abs(i - (n - 1) / 2) * 3
    g.moveTo(x + rad, 46)
    g.arc(x, 46 - r() * 6, rad, 0, TAU)
  }
  g.rect(30, 46, w - 60, 16)
  g.fill()
}

function radial(size: number, stops: [number, string][]): HTMLCanvasElement {
  const [c, g] = mk(size, size, 1)
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [at, col] of stops) grad.addColorStop(at, col)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return c
}

// The box itself: the frame's shadow falling in from the edges.
function paintFrame(): HTMLCanvasElement {
  const [c, g] = mk(W / 4, H / 4, 1)
  const w = W / 4
  const h = H / 4
  const side = (x0: number, y0: number, x1: number, y1: number, a: number) => {
    const grad = g.createLinearGradient(x0, y0, x1, y1)
    grad.addColorStop(0, `rgba(40,28,20,${a})`)
    grad.addColorStop(1, 'rgba(40,28,20,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
  }
  side(0, 0, 0, 16, 0.3)
  side(0, 0, 14, 0, 0.26)
  side(w, 0, w - 8, 0, 0.14)
  side(0, h, 0, h - 8, 0.16)
  return c
}

export function buildPaper(seed: number, S: number): Paper {
  const r = rng(seed)
  const tex = grain(r)
  const far: Cast = { blur: 9, dx: 3, dy: 5, a: 0.22 }
  const mid: Cast = { blur: 12, dx: 5, dy: 8, a: 0.3 }
  const close: Cast = { blur: 14, dx: 6, dy: 10, a: 0.34 }
  const FW = W + M * 2

  const clumps = PEEKS.map(([x, y]) => bake(tex, S, x - 90, y - 50, 180, 140, close, 0.74, (g) => paintClump(g, r, S, x, y)))
  const clouds = [150, 190, 130].map((w) => bake(tex, S, 0, 0, w, 80, { blur: 8, dx: 4, dy: 7, a: 0.16 }, 0.6, (g) => paintCloud(g, r, w)))

  const sunDisc = (fill: string, inner: string) => (g: G) => {
    round(g, r, 70, 70, 44, 44, fill, 0.02, 16)
    round(g, r, 70, 70, 33, 33, inner, 0.03, 14)
  }
  const sun = bake(tex, S, 0, 0, 140, 140, { blur: 8, dx: 3, dy: 6, a: 0.22 }, 0, sunDisc('#f4c24e', '#f8d273'))
  // The sun's dusk copy is a deeper orange, not an indigo one.
  const low = bake(tex, S, 0, 0, 140, 140, { blur: 8, dx: 3, dy: 6, a: 0.22 }, 0, sunDisc('#f0964a', '#f6ad5e'))
  sun.night = low.day
  const rays = bake(tex, S, 0, 0, 220, 220, { blur: 6, dx: 2, dy: 4, a: 0.16 }, 0, (g) => {
    g.fillStyle = '#f7d98c'
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU
      const long = i % 2 === 0 ? 96 : 80
      g.beginPath()
      g.moveTo(110 + Math.cos(a - 0.13) * 54, 110 + Math.sin(a - 0.13) * 54)
      g.lineTo(110 + Math.cos(a) * long, 110 + Math.sin(a) * long)
      g.lineTo(110 + Math.cos(a + 0.13) * 54, 110 + Math.sin(a + 0.13) * 54)
      g.closePath()
      g.fill()
    }
  })

  return {
    skyDay: sky(tex, [
      [0, '#b7d7e4'],
      [0.5, '#d3e7e8'],
      [0.78, '#f1ecd9'],
      [1, '#f1ecd9'],
    ]),
    skyGold: sky(tex, [
      [0, '#e9cfae'],
      [0.45, '#f6cf9c'],
      [0.74, '#f4b488'],
      [1, '#f4b488'],
    ]),
    skyNight: sky(
      tex,
      [
        [0, '#182456'],
        [0.4, '#2b3b7c'],
        [0.6, '#5d5590'],
        [0.72, '#c07f7c'],
        [0.8, '#f2b070'],
        [1, '#f2b070'],
      ],
      r,
    ),
    far: bake(tex, S, -M, 400, FW, 330, far, 0.56, (g) => paintFar(g, S)),
    near: bake(tex, S, -M, 500, FW, 220, far, 0.64, (g) => paintNear(g, r, S)),
    canopy: bake(tex, S, -M, -M, FW, 480, mid, 0.72, (g) => paintCanopy(g, r, S)),
    tree: bake(tex, S, -M, -M, FW, 770, mid, 0.7, (g) => paintTree(g, r, S)),
    ground: bake(tex, S, -M, 630, FW, H - 630 + M, mid, 0.7, (g) => paintGround(g, r, S)),
    fringe: bake(tex, S, -M, -M, FW, 100, close, 0.76, (g) => paintFringe(g, r, S)),
    grass: bake(tex, S, -M, 760, FW, H - 760 + M, close, 0.78, (g) => paintGrass(g, r, S)),
    clumps,
    clouds,
    sun,
    rays,
    glow: radial(256, [
      [0, 'rgba(255,200,116,0.9)'],
      [0.18, 'rgba(255,174,84,0.5)'],
      [0.5, 'rgba(255,146,64,0.15)'],
      [1, 'rgba(255,140,60,0)'],
    ]),
    frame: paintFrame(),
  }
}
