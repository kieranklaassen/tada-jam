// Everything Tea Time looks like, painted once into offscreen canvases inside
// `createArt` (never at import time) so a frame is a handful of blits plus the
// few things that really move. The look is soft watercolour and coloured
// pencil: washes with uneven tone, thin warm outlines, visible linen and wood.

import { TAU, clamp, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

export type G = CanvasRenderingContext2D
export type Rand = () => number

// The far edge of the table. Guests sit behind it; everything below is cloth.
export const FAR = 338
// How far the table's sides lean out per pixel of depth.
export const SLOPE = 200 / (H - FAR)
export const leftEdge = (y: number): number => 110 - (y - FAR) * SLOPE
export const rightEdge = (y: number): number => 1070 + (y - FAR) * SLOPE

export const INK = 'rgba(96,70,52,0.62)'
export const TEA: readonly [number, number, number] = [184, 102, 30]
export const MILKY: readonly [number, number, number] = [226, 192, 148]

export interface Sprite {
  c: HTMLCanvasElement
  w: number
  h: number
  ax: number
  ay: number
}

export function rng(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A canvas `w` by `h` logical pixels whose drawing origin is the anchor
// (ax, ay), painted at `scale` backing pixels per logical pixel.
function sprite(scale: number, w: number, h: number, ax: number, ay: number, seed: number, paint: (g: G, r: Rand) => void): Sprite {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * scale)
  c.height = Math.ceil(h * scale)
  const g = c.getContext('2d')
  if (g) {
    g.scale(scale, scale)
    g.translate(ax, ay)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    paint(g, rng(seed))
  }
  return { c, w, h, ax, ay }
}

export function put(g: G, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = sx): void {
  if (rot === 0 && sx === 1 && sy === 1) {
    g.drawImage(s.c, x - s.ax, y - s.ay, s.w, s.h)
    return
  }
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale(sx, sy)
  g.drawImage(s.c, -s.ax, -s.ay, s.w, s.h)
  g.restore()
}

type Pt = [number, number]

function smoothClosed(g: G, pts: Pt[]): void {
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

// A closed, slightly uneven oval: the hand-drawn stand-in for an ellipse.
function blobPts(x: number, y: number, rx: number, ry: number, r: Rand, wob = 0.05, n = 12): Pt[] {
  const pts: Pt[] = []
  const turn = r() * TAU
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * TAU
    const k = 1.04 + (r() - 0.5) * 2 * wob
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k])
  }
  return pts
}

function soft(g: G, x: number, y: number, rx: number, ry: number, rgb: string, alpha: number): void {
  g.save()
  g.translate(x, y)
  g.scale(rx, ry)
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1)
  grad.addColorStop(0, `rgba(${rgb},${alpha})`)
  grad.addColorStop(1, `rgba(${rgb},0)`)
  g.fillStyle = grad
  g.beginPath()
  g.arc(0, 0, 1, 0, TAU)
  g.fill()
  g.restore()
}

// Fill a path the way a wash dries: a base tone with lighter and darker pools
// inside it, then an optional pencil line round the edge.
function wash(g: G, path: () => void, base: string, r: Rand, box: readonly [number, number, number, number], opts: { pools?: number; light?: number; dark?: number; line?: string | null; lineW?: number } = {}): void {
  const [bx, by, bw, bh] = box
  g.save()
  path()
  g.fillStyle = base
  g.fill()
  g.clip()
  const pools = opts.pools ?? 6
  for (let i = 0; i < pools; i++) {
    const x = bx + r() * bw
    const y = by + r() * bh
    const size = (0.25 + r() * 0.35) * Math.max(bw, bh)
    if (i % 2 === 0) soft(g, x, y, size, size * (0.5 + r() * 0.5), '255,250,235', opts.light ?? 0.2)
    else soft(g, x, y, size, size * (0.5 + r() * 0.5), '90,60,30', opts.dark ?? 0.1)
  }
  g.restore()
  const line = opts.line === undefined ? INK : opts.line
  if (line) {
    path()
    g.strokeStyle = line
    g.lineWidth = opts.lineW ?? 2.2
    g.stroke()
  }
}

function washBlob(g: G, x: number, y: number, rx: number, ry: number, base: string, r: Rand, opts: { wob?: number; n?: number; pools?: number; light?: number; dark?: number; line?: string | null; lineW?: number } = {}): void {
  const pts = blobPts(x, y, rx, ry, r, opts.wob ?? 0.04, opts.n ?? 12)
  wash(g, () => smoothClosed(g, pts), base, r, [x - rx, y - ry, rx * 2, ry * 2], opts)
}

function speckle(g: G, x: number, y: number, w: number, h: number, r: Rand, count: number, rgb: string, aMax: number, size = 1.6): void {
  for (let i = 0; i < count; i++) {
    g.fillStyle = `rgba(${rgb},${(r() * aMax).toFixed(3)})`
    const s = 0.5 + r() * size
    g.fillRect(x + r() * w, y + r() * h, s, s)
  }
}

function leafShape(g: G, x: number, y: number, len: number, wide: number, rot: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(wide, len * 0.45, 0, len)
  g.quadraticCurveTo(-wide, len * 0.45, 0, 0)
  g.closePath()
  g.restore()
}

const GREENS = ['#7ea167', '#8fb276', '#6f955b', '#9dbd82', '#86a96c']

// ---------------------------------------------------------------- backdrop

function paintBackdrop(g: G, r: Rand): void {
  const sky = g.createLinearGradient(0, 0, 0, 340)
  sky.addColorStop(0, '#d3e4e2')
  sky.addColorStop(1, '#f7efdc')
  g.fillStyle = sky
  g.fillRect(0, 0, W, 360)
  soft(g, 930, 70, 460, 300, '255,247,222', 0.75)

  // A far hill and a nearer hedge of round bushes.
  g.fillStyle = '#cddcc0'
  g.beginPath()
  g.moveTo(0, 268)
  g.bezierCurveTo(200, 214, 380, 252, 560, 236)
  g.bezierCurveTo(760, 216, 930, 196, W, 240)
  g.lineTo(W, 360)
  g.lineTo(0, 360)
  g.closePath()
  g.fill()
  soft(g, 420, 250, 300, 60, '255,255,255', 0.25)
  const hedge = ['#aac495', '#9fbc8a', '#b4cc9f', '#a5c090']
  for (let i = 0; i < 17; i++) {
    const x = -50 + i * 78 + r() * 26
    const rad = 60 + r() * 42
    washBlob(g, x, 318 + r() * 16, rad, rad * 0.72, hedge[i % hedge.length]!, r, { wob: 0.07, n: 10, line: null, pools: 5, light: 0.24, dark: 0.12 })
  }
  for (let i = 0; i < 12; i++) {
    const x = -20 + i * 110 + r() * 40
    washBlob(g, x, 338 + r() * 8, 46 + r() * 20, 30 + r() * 10, '#93b37f', r, { wob: 0.08, n: 9, line: null, pools: 3 })
  }

  // Grass.
  const grass = g.createLinearGradient(0, 330, 0, H)
  grass.addColorStop(0, '#b6cc96')
  grass.addColorStop(1, '#9dbb80')
  g.fillStyle = grass
  g.fillRect(0, 344, W, H - 344)
  for (let i = 0; i < 20; i++) soft(g, r() * W, 360 + r() * 460, 120 + r() * 120, 40 + r() * 40, i % 2 ? '235,240,190' : '90,130,80', 0.16)
  g.lineWidth = 2
  for (let i = 0; i < 420; i++) {
    const x = r() * W
    const y = 350 + r() * 470
    const len = 6 + r() * 9 + (y - 350) * 0.012
    g.strokeStyle = r() < 0.5 ? 'rgba(104,146,90,0.5)' : 'rgba(214,228,170,0.55)'
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + (r() - 0.5) * 6, y - len * 0.6, x + (r() - 0.5) * 9, y - len)
    g.stroke()
  }
  // Daisies where the grass shows at the table's sides.
  for (let i = 0; i < 16; i++) {
    const left = i % 2 === 0
    const y = 380 + r() * 400
    const edge = left ? leftEdge(y) - 50 : rightEdge(y) + 50
    const x = left ? r() * Math.max(10, edge) : edge + r() * Math.max(10, W - edge)
    if (x < 6 || x > W - 6) continue
    const size = 3.4 + (y - 380) * 0.006
    g.fillStyle = '#fffaf0'
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * TAU + r()
      g.beginPath()
      g.ellipse(x + Math.cos(a) * size, y + Math.sin(a) * size * 0.7, size * 0.75, size * 0.5, a, 0, TAU)
      g.fill()
    }
    g.fillStyle = '#e8bd55'
    g.beginPath()
    g.ellipse(x, y, size * 0.6, size * 0.45, 0, 0, TAU)
    g.fill()
  }

  // The tree: a trunk at the left, one long bough over the table.
  const trunk = (): void => {
    g.beginPath()
    g.moveTo(-14, 372)
    g.bezierCurveTo(14, 270, 26, 130, 16, -10)
    g.lineTo(94, -10)
    g.bezierCurveTo(88, 130, 84, 262, 118, 366)
    g.quadraticCurveTo(60, 352, -14, 372)
    g.closePath()
  }
  wash(g, trunk, '#94755a', r, [-14, -10, 132, 380], { pools: 8, light: 0.16, dark: 0.16, line: 'rgba(84,60,44,0.55)', lineW: 2.4 })
  g.save()
  trunk()
  g.clip()
  for (let i = 0; i < 26; i++) {
    const x = 6 + r() * 96
    const y = r() * 340
    g.strokeStyle = r() < 0.5 ? 'rgba(70,50,36,0.3)' : 'rgba(210,180,150,0.3)'
    g.lineWidth = 1.4 + r() * 1.6
    g.beginPath()
    g.moveTo(x, y)
    g.bezierCurveTo(x + 5, y + 14, x - 5, y + 28, x + 2, y + 40 + r() * 20)
    g.stroke()
  }
  soft(g, 96, 180, 40, 200, '50,36,26', 0.22)
  g.restore()
  const bough: Array<[number, number, number, number, number, number, number]> = [
    [60, 170, 170, 84, 330, 64, 30],
    [330, 64, 480, 42, 640, 40, 20],
    [640, 40, 800, 34, 940, 26, 13],
    [940, 26, 1040, 20, 1130, 30, 8],
  ]
  for (const pass of [0, 1]) {
    for (const [x1, y1, cx, cy, x2, y2, width] of bough) {
      g.strokeStyle = pass === 0 ? 'rgba(84,60,44,0.6)' : '#94755a'
      g.lineWidth = pass === 0 ? width + 4 : width
      g.beginPath()
      g.moveTo(x1, y1)
      g.quadraticCurveTo(cx, cy, x2, y2)
      g.stroke()
    }
  }

  // The canopy: deep at the trunk, a thin fringe along the top elsewhere.
  for (const layer of [0, 1]) {
    for (let x = -50; x < W + 60; x += 40) {
      const deep = clamp(1 - x / 260, 0, 1)
      const bottom = lerp(layer === 0 ? 74 : 54, layer === 0 ? 150 : 112, deep) + Math.sin(x * 0.021) * 10 + r() * 12
      const rad = 52 + r() * 26
      washBlob(g, x + r() * 20, bottom - rad * 0.8, rad, rad * 0.8, GREENS[(Math.floor(r() * 3) + layer * 2) % GREENS.length]!, r, { wob: 0.09, n: 9, line: null, pools: 4, light: 0.2, dark: 0.14 })
    }
  }
  for (let i = 0; i < 260; i++) {
    const x = r() * (W + 40) - 20
    const deep = clamp(1 - x / 260, 0, 1)
    const y = r() * lerp(72, 140, deep)
    leafShape(g, x, y, 13 + r() * 9, 4.5 + r() * 2, r() * TAU)
    g.fillStyle = r() < 0.5 ? 'rgba(186,212,150,0.55)' : 'rgba(88,128,74,0.45)'
    g.fill()
  }
  speckle(g, 0, 0, W, H, r, 2600, '90,70,50', 0.05)
  speckle(g, 0, 0, W, H, r, 1600, '255,255,255', 0.07)
}

// ---------------------------------------------------------------- table

function paintTable(g: G, r: Rand): void {
  // Where the cloth hangs down the two sides, and its shadow on the grass.
  for (const side of [-1, 1]) {
    const edge = side < 0 ? leftEdge : rightEdge
    g.beginPath()
    g.moveTo(edge(FAR), FAR + 4)
    g.lineTo(edge(H) + side * 6, H)
    g.lineTo(edge(H) + side * 140, H)
    g.lineTo(edge(FAR) + side * 30, FAR + 70)
    g.closePath()
    g.fillStyle = 'rgba(70,104,66,0.3)'
    g.fill()
    g.beginPath()
    g.moveTo(edge(FAR), FAR)
    for (let y = FAR; y <= H + 60; y += 40) g.lineTo(edge(y), y)
    for (let y = H + 60; y >= FAR; y -= 40) {
      const drop = 30 + (y - FAR) * 0.06
      g.lineTo(edge(y) + side * (3 + Math.sin(y * 0.09) * 2), y + drop + Math.sin(y * 0.05) * 5)
    }
    g.closePath()
    g.fillStyle = '#dccfb4'
    g.fill()
    g.strokeStyle = 'rgba(120,96,70,0.4)'
    g.lineWidth = 1.6
    g.stroke()
  }

  const top = (): void => {
    g.beginPath()
    g.moveTo(leftEdge(FAR), FAR)
    g.lineTo(rightEdge(FAR), FAR)
    g.lineTo(rightEdge(H + 40), H + 40)
    g.lineTo(leftEdge(H + 40), H + 40)
    g.closePath()
  }
  wash(g, top, '#f4ebd9', r, [0, FAR, W, H - FAR], { pools: 12, light: 0.3, dark: 0.045, line: null })
  g.save()
  top()
  g.clip()
  // Linen: threads running away from us and across.
  g.lineWidth = 1
  for (let i = 0; i <= 190; i++) {
    const t = i / 190 + (r() - 0.5) * 0.004
    g.strokeStyle = `rgba(150,120,84,${(0.03 + r() * 0.06).toFixed(3)})`
    g.beginPath()
    g.moveTo(lerp(leftEdge(FAR), rightEdge(FAR), t), FAR)
    g.lineTo(lerp(leftEdge(H), rightEdge(H), t), H)
    g.stroke()
  }
  for (let y = FAR + 3; y < H; y += 3.2 + (y - FAR) * 0.008) {
    g.strokeStyle = `rgba(150,120,84,${(0.03 + r() * 0.06).toFixed(3)})`
    g.beginPath()
    g.moveTo(0, y + (r() - 0.5))
    g.lineTo(W, y + (r() - 0.5))
    g.stroke()
  }
  // The creases from when it was folded in the drawer.
  g.strokeStyle = 'rgba(140,112,80,0.13)'
  g.lineWidth = 2.2
  g.beginPath()
  g.moveTo(W / 2 + 4, FAR)
  g.lineTo(W / 2 - 3, H)
  g.moveTo(leftEdge(538), 538)
  g.lineTo(rightEdge(538), 536)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(W / 2 + 7, FAR)
  g.lineTo(W / 2, H)
  g.moveTo(leftEdge(541), 541)
  g.lineTo(rightEdge(541), 539)
  g.stroke()
  // The far edge turns away from the light.
  const turn = g.createLinearGradient(0, FAR, 0, FAR + 26)
  turn.addColorStop(0, 'rgba(120,96,66,0.22)')
  turn.addColorStop(1, 'rgba(120,96,66,0)')
  g.fillStyle = turn
  g.fillRect(0, FAR, W, 26)
  g.restore()

  // A border of running stitch in madder red, sewn by hand.
  g.strokeStyle = '#c98674'
  g.lineWidth = 3.2
  const stitch = (x1: number, y1: number, x2: number, y2: number): void => {
    const length = Math.hypot(x2 - x1, y2 - y1)
    let at = r() * 6
    while (at < length - 6) {
      const run = 9 + r() * 5 + (y1 + ((y2 - y1) * at) / length - FAR) * 0.012
      const a = at / length
      const b = Math.min(1, (at + run) / length)
      const wob = (r() - 0.5) * 1.6
      g.beginPath()
      g.moveTo(lerp(x1, x2, a), lerp(y1, y2, a) + wob)
      g.lineTo(lerp(x1, x2, b), lerp(y1, y2, b) + wob)
      g.stroke()
      at += run + 8 + r() * 3
    }
  }
  const inset = (y: number): number => 30 + (y - FAR) * 0.05
  stitch(leftEdge(364) + inset(364), 364, rightEdge(364) - inset(364), 364)
  stitch(leftEdge(364) + inset(364), 364, leftEdge(H) + inset(H), H)
  stitch(rightEdge(364) - inset(364), 364, rightEdge(H) - inset(H), H)
  // Tiny cross-stitch flowers at the two far corners.
  for (const side of [-1, 1]) {
    const x = (side < 0 ? leftEdge(390) + 72 : rightEdge(390) - 72)
    const y = 392
    g.strokeStyle = '#c98674'
    g.lineWidth = 2.6
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * TAU - Math.PI / 2
      g.beginPath()
      g.moveTo(x + Math.cos(a) * 3, y + Math.sin(a) * 2)
      g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 6)
      g.stroke()
    }
    g.strokeStyle = '#8fa883'
    g.beginPath()
    g.moveTo(x - side * 12, y + 5)
    g.quadraticCurveTo(x - side * 24, y + 4, x - side * 30, y + 10)
    g.stroke()
  }
  speckle(g, 0, FAR, W, H - FAR, r, 1800, '120,90,60', 0.05)
}

// ---------------------------------------------------------------- tray

export const TRAY = { x0: 100, x1: 1080, y0: 584, y1: 766 }

function trayPath(g: G, grow: number): void {
  const { x0, x1, y0, y1 } = TRAY
  const lean = 30
  const rad = 30 + grow
  g.beginPath()
  g.moveTo(x0 + lean + rad - grow, y0 - grow)
  g.lineTo(x1 - lean - rad + grow, y0 - grow)
  g.quadraticCurveTo(x1 - lean + grow, y0 - grow, x1 - lean + grow + 4, y0 + rad * 0.8)
  g.lineTo(x1 + grow - 4, y1 - rad * 0.8)
  g.quadraticCurveTo(x1 + grow, y1 + grow, x1 - rad + grow, y1 + grow)
  g.lineTo(x0 + rad - grow, y1 + grow)
  g.quadraticCurveTo(x0 - grow, y1 + grow, x0 - grow + 4, y1 - rad * 0.8)
  g.lineTo(x0 + lean - grow - 4, y0 + rad * 0.8)
  g.quadraticCurveTo(x0 + lean - grow, y0 - grow, x0 + lean + rad - grow, y0 - grow)
  g.closePath()
}

function paintTray(g: G, r: Rand): void {
  const { x0, x1, y0, y1 } = TRAY
  soft(g, (x0 + x1) / 2, y1 + 4, (x1 - x0) / 2 + 30, 34, '70,50,30', 0.3)
  // The near wall of the tray, seen from the side.
  g.save()
  g.translate(0, 9)
  trayPath(g, 0)
  g.fillStyle = '#a2713f'
  g.fill()
  g.strokeStyle = 'rgba(84,56,34,0.6)'
  g.lineWidth = 2.2
  g.stroke()
  g.restore()
  wash(g, () => trayPath(g, 0), '#d6aa72', r, [x0, y0, x1 - x0, y1 - y0], { pools: 9, light: 0.22, dark: 0.1, line: 'rgba(96,66,40,0.65)', lineW: 2.4 })
  // The floor, a little darker, with long grain.
  wash(g, () => trayPath(g, -13), '#c3935a', r, [x0, y0, x1 - x0, y1 - y0], { pools: 10, light: 0.16, dark: 0.12, line: 'rgba(96,66,40,0.4)', lineW: 1.8 })
  g.save()
  trayPath(g, -14)
  g.clip()
  for (let i = 0; i < 26; i++) {
    const y = y0 + 10 + r() * (y1 - y0 - 20)
    const start = x0 + r() * 200
    const len = 300 + r() * 600
    g.strokeStyle = r() < 0.6 ? 'rgba(110,74,40,0.2)' : 'rgba(236,204,150,0.28)'
    g.lineWidth = 1 + r() * 1.4
    g.beginPath()
    g.moveTo(start, y)
    g.bezierCurveTo(start + len * 0.3, y + (r() - 0.5) * 9, start + len * 0.7, y + (r() - 0.5) * 9, start + len, y + (r() - 0.5) * 5)
    g.stroke()
  }
  // A knot in the wood.
  for (let k = 0; k < 4; k++) {
    g.strokeStyle = 'rgba(110,74,40,0.22)'
    g.lineWidth = 1.3
    g.beginPath()
    g.ellipse(690, 742, 6 + k * 5, 2 + k * 2, 0.1, 0, TAU)
    g.stroke()
  }
  // The far wall throws a little shade onto the floor.
  const shade = g.createLinearGradient(0, y0, 0, y0 + 34)
  shade.addColorStop(0, 'rgba(84,54,28,0.3)')
  shade.addColorStop(1, 'rgba(84,54,28,0)')
  g.fillStyle = shade
  g.fillRect(x0, y0, x1 - x0, 34)
  g.restore()
  // Rope handles at both ends.
  for (const side of [-1, 1]) {
    const x = side < 0 ? x0 + 14 : x1 - 14
    const y = (y0 + y1) / 2 + 8
    for (const pass of [0, 1]) {
      g.strokeStyle = pass === 0 ? 'rgba(96,74,50,0.7)' : '#e2cfa8'
      g.lineWidth = pass === 0 ? 12 : 8
      g.beginPath()
      g.moveTo(x, y - 30)
      g.bezierCurveTo(x + side * 34, y - 30, x + side * 34, y + 30, x + side * 2, y + 30)
      g.stroke()
    }
    g.strokeStyle = 'rgba(150,120,84,0.6)'
    g.lineWidth = 1.6
    for (let k = 0; k < 9; k++) {
      const t = k / 8
      const a = lerp(-1.3, 1.3, t)
      const hx = x + side * (4 + Math.cos(a) * 22)
      const hy = y + Math.sin(a) * 30
      g.beginPath()
      g.moveTo(hx - 3, hy - 3)
      g.lineTo(hx + 3, hy + 3)
      g.stroke()
    }
  }
}

// ---------------------------------------------------------------- crockery

function paintSaucer(g: G, r: Rand): void {
  soft(g, 2, 6, 78, 24, '70,50,30', 0.28)
  const rim = blobPts(0, 0, 64, 20.5, r, 0.012, 16)
  wash(g, () => smoothClosed(g, rim), '#f6efe0', r, [-66, -22, 132, 44], { pools: 5, light: 0.3, dark: 0.07, lineW: 2 })
  g.strokeStyle = 'rgba(120,96,72,0.3)'
  g.lineWidth = 1.6
  g.beginPath()
  g.ellipse(0, 1, 36, 11, 0, 0, TAU)
  g.stroke()
  g.strokeStyle = 'rgba(143,168,131,0.9)'
  g.lineWidth = 2.4
  g.beginPath()
  g.ellipse(0, 0, 57, 17.5, 0, 0.2, TAU - 0.15)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.8)'
  g.lineWidth = 3
  g.beginPath()
  g.ellipse(0, 0, 50, 14.5, 0, Math.PI * 1.1, Math.PI * 1.45)
  g.stroke()
}

function paintPlate(g: G, r: Rand): void {
  soft(g, 2, 8, 104, 34, '70,46,24', 0.3)
  const rim = blobPts(0, 0, 90, 30, r, 0.012, 18)
  wash(g, () => smoothClosed(g, rim), '#f6efe0', r, [-92, -32, 184, 64], { pools: 6, light: 0.3, dark: 0.07, lineW: 2 })
  g.strokeStyle = 'rgba(120,96,72,0.3)'
  g.lineWidth = 1.6
  g.beginPath()
  g.ellipse(0, 1, 62, 19, 0, 0, TAU)
  g.stroke()
  // A hand-painted ring of little leaves.
  g.fillStyle = 'rgba(143,168,131,0.9)'
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU
    g.beginPath()
    g.ellipse(Math.cos(a) * 77, Math.sin(a) * 25, 5.5, 2.3, a + Math.PI / 2 + 0.5, 0, TAU)
    g.fill()
  }
  g.strokeStyle = 'rgba(255,255,255,0.8)'
  g.lineWidth = 3
  g.beginPath()
  g.ellipse(0, 0, 70, 22, 0, Math.PI * 1.1, Math.PI * 1.4)
  g.stroke()
}

function paintSponge(g: G, r: Rand): void {
  soft(g, 1, 2, 46, 13, '70,46,24', 0.3)
  // A natural sponge: a lumpy pale loaf, full of holes.
  const pts = blobPts(0, -19, 37, 21, r, 0.13, 10)
  wash(g, () => smoothClosed(g, pts), '#ecd9a8', r, [-40, -42, 80, 44], { pools: 6, light: 0.3, dark: 0.1, line: 'rgba(132,104,60,0.65)', lineW: 2 })
  g.save()
  smoothClosed(g, pts)
  g.clip()
  soft(g, 6, -4, 40, 12, '150,112,56', 0.3)
  for (let i = 0; i < 34; i++) {
    const a = r() * TAU
    const d = Math.sqrt(r()) * 0.98
    const x = Math.cos(a) * 36 * d
    const y = -19 + Math.sin(a) * 20 * d
    const size = 1.6 + r() * r() * 5.5
    g.fillStyle = `rgba(150,116,62,${(0.45 + r() * 0.35).toFixed(2)})`
    g.beginPath()
    g.ellipse(x, y, size, size * (0.6 + r() * 0.3), r() * 3, 0, TAU)
    g.fill()
    g.strokeStyle = 'rgba(255,248,224,0.6)'
    g.lineWidth = 1
    g.beginPath()
    g.ellipse(x, y + 0.8, size, size * 0.7, 0, 0.3, Math.PI - 0.3)
    g.stroke()
  }
  g.restore()
}

export const GLASS = 'rgba(226,240,236,0.5)'
const GLASS_LINE = 'rgba(92,118,114,0.85)'

// The belly of the glass teapot, in the pot's own coordinates (origin at the
// middle of its base). The tea inside is clipped to a slightly smaller oval.
export const POT_BELLY = { x: 0, y: -62, rx: 78, ry: 60 }

function paintPot(g: G): void {
  const b = POT_BELLY
  // The handle is bent cane, and goes on first so the glass sits in front.
  const handle = (): void => {
    g.beginPath()
    g.moveTo(54, -104)
    g.bezierCurveTo(132, -116, 136, -24, 60, -22)
  }
  handle()
  g.strokeStyle = 'rgba(92,60,34,0.85)'
  g.lineWidth = 17
  g.stroke()
  handle()
  g.strokeStyle = '#c6935c'
  g.lineWidth = 12.5
  g.stroke()
  g.strokeStyle = 'rgba(92,60,34,0.5)'
  g.lineWidth = 1.8
  for (const t of [0.2, 0.36, 0.52, 0.68, 0.84]) {
    const a = lerp(-1.25, 1.25, t)
    const x = 76 + Math.cos(a) * 42
    const y = -63 + Math.sin(a) * 42
    g.beginPath()
    g.moveTo(x - Math.cos(a) * 6, y - Math.sin(a) * 6)
    g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6)
    g.stroke()
  }
  handle()
  g.strokeStyle = 'rgba(255,236,200,0.5)'
  g.lineWidth = 3
  g.setLineDash([26, 60])
  g.stroke()
  g.setLineDash([])

  // Spout.
  g.beginPath()
  g.moveTo(-58, -30)
  g.bezierCurveTo(-94, -36, -96, -76, -111, -88)
  g.lineTo(-122, -101)
  g.bezierCurveTo(-100, -98, -88, -90, -64, -86)
  g.closePath()
  g.fillStyle = GLASS
  g.fill()
  g.strokeStyle = GLASS_LINE
  g.lineWidth = 2.6
  g.stroke()

  // Belly.
  g.beginPath()
  g.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, TAU)
  g.strokeStyle = GLASS_LINE
  g.lineWidth = 2.8
  g.stroke()
  g.strokeStyle = 'rgba(92,118,114,0.5)'
  g.lineWidth = 2
  g.beginPath()
  g.ellipse(0, -3, 40, 5, 0, 0.1, Math.PI - 0.1)
  g.stroke()

  // Lid: a glass dome with a wooden knob.
  g.beginPath()
  g.moveTo(-34, -118)
  g.quadraticCurveTo(0, -148, 34, -118)
  g.quadraticCurveTo(0, -110, -34, -118)
  g.closePath()
  g.fillStyle = 'rgba(232,243,239,0.6)'
  g.fill()
  g.strokeStyle = GLASS_LINE
  g.lineWidth = 2.6
  g.stroke()
  g.beginPath()
  g.arc(0, -140, 10.5, 0, TAU)
  g.fillStyle = '#c6935c'
  g.fill()
  g.strokeStyle = 'rgba(92,60,34,0.8)'
  g.lineWidth = 2.2
  g.stroke()
  g.beginPath()
  g.arc(-3, -143, 3, 0, TAU)
  g.fillStyle = 'rgba(255,240,210,0.7)'
  g.fill()

  // Light on the glass.
  g.strokeStyle = 'rgba(255,255,255,0.85)'
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(-50, -92)
  g.quadraticCurveTo(-68, -70, -62, -44)
  g.stroke()
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(-36, -104)
  g.lineTo(-30, -108)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.4)'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(58, -84)
  g.quadraticCurveTo(70, -62, 60, -34)
  g.stroke()
}

// The milk jug's glass body in its own coordinates (origin at the base).
export function jugBody(g: G, inset = 0): void {
  const i = inset
  g.beginPath()
  g.moveTo(-43 + i * 2, -87 + i)
  g.quadraticCurveTo(-20, -81 + i, 30 - i, -82 + i)
  g.bezierCurveTo(33 - i, -50, 34 - i, -22, 26 - i, -5 - i)
  g.quadraticCurveTo(0, 1 - i, -26 + i, -5 - i)
  g.bezierCurveTo(-34 + i, -22, -33 + i, -50, -31 + i, -68)
  g.quadraticCurveTo(-34 + i, -80, -43 + i * 2, -87 + i)
  g.closePath()
}

function paintJug(g: G): void {
  const handle = (): void => {
    g.beginPath()
    g.moveTo(30, -68)
    g.bezierCurveTo(64, -72, 62, -20, 29, -24)
  }
  handle()
  g.strokeStyle = GLASS_LINE
  g.lineWidth = 9
  g.stroke()
  handle()
  g.strokeStyle = 'rgba(240,248,245,0.95)'
  g.lineWidth = 4.4
  g.stroke()
  jugBody(g)
  g.strokeStyle = GLASS_LINE
  g.lineWidth = 2.6
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.9)'
  g.lineWidth = 4.5
  g.beginPath()
  g.moveTo(-22, -66)
  g.quadraticCurveTo(-26, -44, -21, -20)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.45)'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(20, -66)
  g.lineTo(21, -26)
  g.stroke()
}

// ---------------------------------------------------------------- guests

export interface GuestLook {
  // Neck, shoulders and mouth, measured up from the table edge at the seat.
  neckY: number
  shoulderX: number
  shoulderY: number
  mouthY: number
  eyeX: number
  eyeY: number
  eyeR: number
  arm: string
  armW: number
  hand: string
  handR: number
}

export const LOOKS: readonly GuestLook[] = [
  { neckY: -112, shoulderX: 48, shoulderY: -92, mouthY: -139, eyeX: 19, eyeY: -52, eyeR: 4.4, arm: '#cf8175', armW: 25, hand: '#f4d7b8', handR: 13 },
  { neckY: -104, shoulderX: 60, shoulderY: -84, mouthY: -140, eyeX: 23, eyeY: -68, eyeR: 4.8, arm: '#b98a5c', armW: 31, hand: '#c79a6c', handR: 17 },
  { neckY: -108, shoulderX: 46, shoulderY: -80, mouthY: -144, eyeX: 17, eyeY: -54, eyeR: 4, arm: '#e2c898', armW: 16, hand: '#ecd6ae', handR: 11 },
]

function paintDollBody(g: G, r: Rand): void {
  g.fillStyle = '#f0cfae'
  g.beginPath()
  g.ellipse(0, -110, 15, 13, 0, 0, TAU)
  g.fill()
  const dress = (): void => {
    g.beginPath()
    g.moveTo(-44, -104)
    g.quadraticCurveTo(-60, -98, -64, -68)
    g.lineTo(-86, 20)
    g.lineTo(86, 20)
    g.lineTo(64, -68)
    g.quadraticCurveTo(60, -98, 44, -104)
    g.quadraticCurveTo(0, -114, -44, -104)
    g.closePath()
  }
  wash(g, dress, '#cf8175', r, [-86, -110, 172, 130], { pools: 8, light: 0.2, dark: 0.12, line: 'rgba(120,60,52,0.6)' })
  g.save()
  dress()
  g.clip()
  // A small flower print.
  for (let i = 0; i < 34; i++) {
    const x = -80 + r() * 160
    const y = -96 + r() * 112
    g.fillStyle = 'rgba(250,226,206,0.75)'
    for (let p = 0; p < 4; p++) {
      const a = (p / 4) * TAU + r()
      g.beginPath()
      g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 1.7, 0, TAU)
      g.fill()
    }
  }
  g.restore()
  // A linen collar and two wooden buttons.
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(side * 2, -106)
    g.quadraticCurveTo(side * 30, -110, side * 34, -94)
    g.quadraticCurveTo(side * 18, -84, side * 2, -92)
    g.closePath()
    g.fillStyle = '#f6efe0'
    g.fill()
    g.strokeStyle = 'rgba(120,96,72,0.5)'
    g.lineWidth = 1.8
    g.stroke()
  }
  for (const y of [-72, -50]) {
    g.beginPath()
    g.arc(0, y, 4.4, 0, TAU)
    g.fillStyle = '#c6935c'
    g.fill()
    g.strokeStyle = 'rgba(92,60,34,0.7)'
    g.lineWidth = 1.4
    g.stroke()
  }
}

function paintDollHead(g: G, r: Rand): void {
  const yarn = ['#b9783e', '#c88947', '#a9682f', '#d09a56']
  // Hair behind the head.
  washBlob(g, 0, -60, 63, 59, '#a9682f', r, { wob: 0.03, line: 'rgba(96,58,26,0.6)' })
  // Two plaits of wool with sage ribbons.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      g.beginPath()
      g.ellipse(side * (58 + k * 1.4), -40 + k * 15.5, 11.5 - k * 0.5, 10, side * (k % 2 ? 0.55 : -0.55), 0, TAU)
      g.fillStyle = yarn[k % 2]!
      g.fill()
      g.strokeStyle = 'rgba(96,58,26,0.55)'
      g.lineWidth = 1.6
      g.stroke()
    }
    const by = 50
    const bx = side * 66
    g.fillStyle = '#8fa883'
    g.strokeStyle = 'rgba(70,96,66,0.7)'
    g.lineWidth = 1.5
    for (const wing of [-1, 1]) {
      g.beginPath()
      g.moveTo(bx, by)
      g.quadraticCurveTo(bx + wing * 16, by - 12, bx + wing * 15, by + 2)
      g.quadraticCurveTo(bx + wing * 12, by + 9, bx, by)
      g.fill()
      g.stroke()
    }
    g.fillStyle = yarn[0]!
    g.beginPath()
    g.ellipse(bx, by + 10, 6, 8, 0, 0, TAU)
    g.fill()
  }
  // Face.
  washBlob(g, 0, -56, 54, 52, '#f4d7b8', r, { wob: 0.014, n: 16, pools: 5, light: 0.22, dark: 0.05, line: 'rgba(150,104,76,0.55)' })
  soft(g, -31, -38, 15, 11, '232,140,120', 0.3)
  soft(g, 31, -38, 15, 11, '232,140,120', 0.3)
  // The fringe: strands of yarn from a centre parting.
  g.lineWidth = 6.4
  for (let i = -9; i <= 9; i++) {
    g.strokeStyle = yarn[Math.abs(i * 7 + 3) % yarn.length]!
    g.beginPath()
    g.moveTo(i * 1.4, -113)
    g.quadraticCurveTo(i * 5.4, -108 + Math.abs(i) * 0.6, i * 6.7, -82 + Math.abs(i) * 3.2 + r() * 3)
    g.stroke()
  }
  g.strokeStyle = 'rgba(96,58,26,0.35)'
  g.lineWidth = 1.2
  for (let i = -8; i <= 8; i += 2) {
    g.beginPath()
    g.moveTo(i * 1.6, -112)
    g.quadraticCurveTo(i * 5.6, -106, i * 6.9, -84 + Math.abs(i) * 3.2)
    g.stroke()
  }
  // A small calm mouth.
  g.strokeStyle = '#c0685a'
  g.lineWidth = 2.6
  g.beginPath()
  g.moveTo(-6, -28)
  g.quadraticCurveTo(0, -24, 6, -28)
  g.stroke()
}

function furStrokes(g: G, r: Rand, x: number, y: number, rx: number, ry: number, count: number): void {
  g.lineWidth = 1.5
  for (let i = 0; i < count; i++) {
    const a = r() * TAU
    const d = Math.sqrt(r())
    const px = x + Math.cos(a) * rx * d
    const py = y + Math.sin(a) * ry * d
    const dir = Math.atan2(py - y, px - x) + (r() - 0.5)
    g.strokeStyle = r() < 0.5 ? 'rgba(110,72,40,0.22)' : 'rgba(240,208,160,0.26)'
    g.beginPath()
    g.moveTo(px, py)
    g.lineTo(px + Math.cos(dir) * 6, py + Math.sin(dir) * 6)
    g.stroke()
  }
}

function paintBearBody(g: G, r: Rand): void {
  washBlob(g, 0, -30, 84, 84, '#b98a5c', r, { wob: 0.03, n: 14, pools: 8, light: 0.18, dark: 0.14, line: 'rgba(100,66,40,0.6)' })
  furStrokes(g, r, 0, -30, 80, 80, 150)
  washBlob(g, 0, -28, 44, 50, '#dab98f', r, { wob: 0.04, pools: 4, line: null })
  furStrokes(g, r, 0, -28, 40, 46, 50)
  // A sage bow.
  g.fillStyle = '#8fa883'
  g.strokeStyle = 'rgba(70,96,66,0.75)'
  g.lineWidth = 1.8
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(0, -96)
    g.quadraticCurveTo(side * 32, -116, side * 32, -94)
    g.quadraticCurveTo(side * 30, -78, 0, -92)
    g.closePath()
    g.fill()
    g.stroke()
  }
  g.beginPath()
  g.ellipse(0, -94, 7, 8, 0, 0, TAU)
  g.fill()
  g.stroke()
}

function paintBearHead(g: G, r: Rand): void {
  for (const side of [-1, 1]) {
    washBlob(g, side * 47, -102, 23, 22, '#b98a5c', r, { wob: 0.04, pools: 3, line: 'rgba(100,66,40,0.6)' })
    washBlob(g, side * 47, -100, 12, 12, '#dab98f', r, { wob: 0.05, pools: 2, line: null })
  }
  washBlob(g, 0, -58, 61, 54, '#b98a5c', r, { wob: 0.02, n: 16, pools: 7, light: 0.18, dark: 0.14, line: 'rgba(100,66,40,0.6)' })
  furStrokes(g, r, 0, -58, 57, 50, 120)
  washBlob(g, 0, -42, 28, 22, '#e6caa4', r, { wob: 0.03, pools: 3, light: 0.3, dark: 0.05, line: 'rgba(120,84,54,0.35)', lineW: 1.5 })
  g.fillStyle = '#4d382e'
  g.beginPath()
  g.moveTo(-9, -55)
  g.quadraticCurveTo(0, -60, 9, -55)
  g.quadraticCurveTo(5, -45, 0, -44)
  g.quadraticCurveTo(-5, -45, -9, -55)
  g.fill()
  g.strokeStyle = '#4d382e'
  g.lineWidth = 2.2
  g.beginPath()
  g.moveTo(0, -44)
  g.lineTo(0, -38)
  g.moveTo(-8, -35)
  g.quadraticCurveTo(-4, -31, 0, -37)
  g.quadraticCurveTo(4, -31, 8, -35)
  g.stroke()
}

function grain(g: G, r: Rand, x: number, y: number, rx: number, ry: number, count: number): void {
  g.lineWidth = 1.4
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count
    const py = y - ry + t * ry * 2
    const bend = (r() - 0.5) * 10
    g.strokeStyle = `rgba(170,124,70,${(0.16 + r() * 0.16).toFixed(2)})`
    g.beginPath()
    g.moveTo(x - rx, py)
    g.bezierCurveTo(x - rx * 0.3, py + bend, x + rx * 0.3, py - bend, x + rx, py + (r() - 0.5) * 6)
    g.stroke()
  }
}

function paintRabbitBody(g: G, r: Rand): void {
  const pts = blobPts(0, -40, 58, 76, r, 0.012, 16)
  wash(g, () => smoothClosed(g, pts), '#e8d0a6', r, [-60, -118, 120, 156], { pools: 6, light: 0.22, dark: 0.07, line: 'rgba(130,96,60,0.65)' })
  g.save()
  smoothClosed(g, pts)
  g.clip()
  grain(g, r, 0, -40, 60, 78, 13)
  soft(g, 0, -20, 30, 44, '255,252,244', 0.4)
  g.restore()
}

function paintRabbitHead(g: G, r: Rand): void {
  for (const side of [-1, 1]) {
    g.save()
    g.translate(side * 21, -84)
    g.rotate(side * 0.13)
    const ear = (): void => {
      g.beginPath()
      g.ellipse(0, -44, 13.5, 46, 0, 0, TAU)
    }
    wash(g, ear, '#e8d0a6', r, [-14, -90, 28, 92], { pools: 3, line: 'rgba(130,96,60,0.65)' })
    g.beginPath()
    g.ellipse(0, -44, 6, 33, 0, 0, TAU)
    g.fillStyle = 'rgba(222,158,140,0.55)'
    g.fill()
    g.restore()
  }
  const pts = blobPts(0, -50, 46, 43, r, 0.012, 16)
  wash(g, () => smoothClosed(g, pts), '#e8d0a6', r, [-48, -95, 96, 90], { pools: 5, light: 0.22, dark: 0.07, line: 'rgba(130,96,60,0.65)' })
  g.save()
  smoothClosed(g, pts)
  g.clip()
  grain(g, r, 0, -50, 48, 44, 8)
  g.restore()
  soft(g, -26, -38, 12, 9, '226,150,130', 0.3)
  soft(g, 26, -38, 12, 9, '226,150,130', 0.3)
  g.fillStyle = '#c9776a'
  g.beginPath()
  g.ellipse(0, -40, 5.4, 3.8, 0, 0, TAU)
  g.fill()
  g.strokeStyle = '#b06a5e'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(0, -36)
  g.lineTo(0, -31)
  g.moveTo(-5, -29)
  g.quadraticCurveTo(0, -26, 5, -29)
  g.stroke()
}

// ---------------------------------------------------------------- small things

function paintLeafCluster(g: G, r: Rand): void {
  g.strokeStyle = '#8a6b50'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(0, -6)
  g.quadraticCurveTo(6, 26, -4, 58)
  g.stroke()
  const count = 6 + Math.floor(r() * 3)
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const x = lerp(2, -4, t) + (r() - 0.5) * 6
    const y = lerp(4, 58, t)
    const side = i % 2 === 0 ? 1 : -1
    const rot = side * (-0.7 - r() * 0.8) + (t > 0.9 ? 0 : 0)
    leafShape(g, x, y, 30 + r() * 14, 10 + r() * 3, rot)
    g.fillStyle = GREENS[Math.floor(r() * GREENS.length)]!
    g.fill()
    g.strokeStyle = 'rgba(88,122,74,0.35)'
    g.lineWidth = 1.2
    g.stroke()
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.strokeStyle = 'rgba(214,232,180,0.6)'
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(0, 4)
    g.lineTo(0, 26)
    g.stroke()
    g.restore()
  }
}

function paintLeaf(g: G, r: Rand): void {
  leafShape(g, 0, -15, 30, 10, 0)
  g.fillStyle = r() < 0.5 ? '#a9bd74' : '#c9b25e'
  g.fill()
  g.strokeStyle = 'rgba(96,110,56,0.6)'
  g.lineWidth = 1.3
  g.stroke()
  g.strokeStyle = 'rgba(240,240,200,0.6)'
  g.beginPath()
  g.moveTo(0, -11)
  g.lineTo(0, 12)
  g.stroke()
}

export interface Art {
  top: Sprite
  low: Sprite
  tray: Sprite
  saucer: Sprite
  plate: Sprite
  sponge: Sprite
  pot: Sprite
  jug: Sprite
  bodies: Sprite[]
  heads: Sprite[]
  clusters: Sprite[]
  leaf: Sprite[]
  light: Sprite
  puff: Sprite
  shade: Sprite
}

export function createArt(): Art {
  const scale = clamp(Math.round(globalThis.devicePixelRatio || 1), 1, 2)
  // The garden is painted once, then cut at the table edge: the scene above
  // it, and everything from the edge down with the table laid over. The guests
  // are drawn between the two, so the table hides their laps.
  const garden = sprite(scale, W, H, 0, 0, 11, paintBackdrop)
  return {
    top: sprite(scale, W, FAR, 0, 0, 1, (g) => g.drawImage(garden.c, 0, 0, W, H)),
    low: sprite(scale, W, H - FAR, 0, -FAR, 23, (g, r) => {
      g.drawImage(garden.c, 0, 0, W, H)
      paintTable(g, r)
    }),
    tray: sprite(scale, 1060, 240, -60, -560, 31, paintTray),
    saucer: sprite(2, 170, 64, 85, 28, 41, paintSaucer),
    plate: sprite(2, 220, 84, 110, 38, 43, paintPlate),
    sponge: sprite(2, 100, 60, 50, 44, 47, paintSponge),
    pot: sprite(2, 290, 180, 140, 164, 1, paintPot),
    jug: sprite(2, 130, 108, 58, 98, 1, paintJug),
    bodies: [sprite(2, 190, 150, 95, 124, 51, paintDollBody), sprite(2, 190, 150, 95, 124, 53, paintBearBody), sprite(2, 140, 150, 70, 124, 57, paintRabbitBody)],
    heads: [sprite(2, 180, 206, 90, 132, 61, paintDollHead), sprite(2, 190, 150, 95, 136, 63, paintBearHead), sprite(2, 130, 196, 65, 184, 67, paintRabbitHead)],
    clusters: [sprite(2, 110, 110, 55, 12, 71, paintLeafCluster), sprite(2, 110, 110, 55, 12, 73, paintLeafCluster), sprite(2, 110, 110, 55, 12, 79, paintLeafCluster)],
    leaf: [sprite(2, 30, 40, 15, 20, 83, paintLeaf), sprite(2, 30, 40, 15, 20, 84, paintLeaf)],
    light: sprite(1, 128, 128, 64, 64, 1, (g) => soft(g, 0, 0, 64, 64, '255,246,214', 1)),
    puff: sprite(1, 64, 64, 32, 32, 1, (g) => soft(g, 0, 0, 32, 32, '255,255,255', 1)),
    shade: sprite(1, 128, 64, 64, 32, 1, (g) => soft(g, 0, 0, 64, 32, '60,40,24', 1)),
  }
}
