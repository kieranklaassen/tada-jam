// How an egg looks: a patterned shell rendered once to its own canvas, the
// zigzag it will split along, and the cracks that spread along that zigzag.
// Everything is in egg-local coordinates: the origin is the middle of the
// egg's base and up is negative y.

import { heart, star } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'

export const RX = 82
export const HH = 205
const PAD = 14
const RES = 2
// The zigzag has this many points; cracks spread outward from the middle one.
const ZIG = 9
export const ZIG_HALF = (ZIG - 1) / 2

export type Pattern = 'spots' | 'stripes' | 'zigzag' | 'stars' | 'hearts' | 'rings' | 'rainbow'

export interface Palette {
  base: string
  a: string
  b: string
  line: string
}

export const PALETTES: readonly Palette[] = [
  { base: '#ffd1e3', a: '#ff6fa3', b: '#ffffff', line: '#c9457c' },
  { base: '#c9e6ff', a: '#3d9bff', b: '#ffffff', line: '#2a73c4' },
  { base: '#d6f7c4', a: '#4fbd5d', b: '#fff59a', line: '#358f43' },
  { base: '#fff0a8', a: '#ff9f1c', b: '#ff6b57', line: '#cf8410' },
  { base: '#e5d4ff', a: '#9a63ff', b: '#ffc9f2', line: '#7040cc' },
  { base: '#ffdcbc', a: '#ff7f3f', b: '#ffffff', line: '#cf5c22' },
  { base: '#c2f4ee', a: '#22bfae', b: '#ffffff', line: '#178c7f' },
]
export const GOLD: Palette = { base: '#ffd83d', a: '#fff8c9', b: '#ffae00', line: '#b87400' }
export const RAINBOW: Palette = { base: '#ffffff', a: '#ff5d8f', b: '#4db8ff', line: '#7a48d6' }
export const PATTERNS: readonly Pattern[] = ['spots', 'stripes', 'zigzag', 'stars', 'hearts', 'rings']

export interface EggLook {
  canvas: HTMLCanvasElement
  w: number
  h: number
  palette: Palette
  zig: [number, number][]
  branches: { at: number; pts: [number, number][] }[]
}

export function eggPath(g: CanvasRenderingContext2D, rx = RX, hh = HH): void {
  g.beginPath()
  g.moveTo(0, -hh)
  g.bezierCurveTo(rx * 0.72, -hh, rx, -hh * 0.6, rx, -hh * 0.38)
  g.bezierCurveTo(rx, -hh * 0.1, rx * 0.64, 0, 0, 0)
  g.bezierCurveTo(-rx * 0.64, 0, -rx, -hh * 0.1, -rx, -hh * 0.38)
  g.bezierCurveTo(-rx, -hh * 0.6, -rx * 0.72, -hh, 0, -hh)
  g.closePath()
}

function paint(g: CanvasRenderingContext2D, palette: Palette, pattern: Pattern): void {
  const r = (a: number, b: number) => a + Math.random() * (b - a)
  const two = () => (Math.random() < 0.5 ? palette.a : palette.b)
  if (pattern === 'spots') {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        g.beginPath()
        g.arc((col - 1) * 60 + (row % 2) * 30 - 15 + r(-9, 9), -HH * 0.94 + row * 46 + r(-9, 9), r(11, 22), 0, TAU)
        g.fillStyle = two()
        g.fill()
      }
    }
  } else if (pattern === 'stripes' || pattern === 'zigzag') {
    const rows = [-0.86, -0.64, -0.4, -0.18]
    rows.forEach((row, i) => {
      g.beginPath()
      for (let x = -RX - 10; x <= RX + 10; x += 10) {
        const k = (x + RX) / 20
        const wave = pattern === 'stripes' ? Math.sin(k * 1.3 + i) * 7 : (Math.round(k) % 2 === 0 ? -9 : 9)
        const y = row * HH + wave
        if (x === -RX - 10) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.strokeStyle = i % 2 === 0 ? palette.a : palette.b
      g.lineWidth = pattern === 'stripes' ? 19 : 12
      g.lineJoin = 'round'
      g.stroke()
    })
  } else if (pattern === 'stars' || pattern === 'hearts') {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        const x = (col - 1) * 58 + (row % 2) * 29 - 14 + r(-6, 6)
        const y = -HH * 0.93 + row * 44 + r(-6, 6)
        if (pattern === 'stars') star(g, x, y, r(13, 19), two(), r(-0.4, 0.4))
        else heart(g, x, y, r(11, 15), two())
      }
    }
  } else if (pattern === 'rings') {
    for (let i = 0; i < 8; i++) {
      g.beginPath()
      g.arc(r(-RX * 0.8, RX * 0.8), r(-HH * 0.95, -10), r(12, 22), 0, TAU)
      g.strokeStyle = two()
      g.lineWidth = 7
      g.stroke()
    }
  } else {
    const bands = ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff']
    bands.forEach((color, i) => {
      g.fillStyle = color
      g.fillRect(-RX - 5, -HH + (i * HH) / bands.length - 2, RX * 2 + 10, HH / bands.length + 4)
    })
    for (let i = 0; i < 7; i++) star(g, r(-RX * 0.7, RX * 0.7), r(-HH * 0.9, -20), r(8, 13), '#ffffff', r(0, 1))
  }
}

export function makeLook(palette: Palette, pattern: Pattern): EggLook {
  const w = RX * 2 + PAD * 2
  const h = HH + PAD * 2
  const canvas = document.createElement('canvas')
  canvas.width = w * RES
  canvas.height = h * RES
  const g = canvas.getContext('2d')
  if (g) {
    g.scale(RES, RES)
    g.translate(w / 2, h - PAD)
    g.save()
    eggPath(g)
    g.clip()
    g.fillStyle = palette.base
    g.fillRect(-RX - PAD, -HH - PAD, w, h)
    paint(g, palette, pattern)
    // Round it: a lit top-left and a shaded bottom-right.
    const shade = g.createRadialGradient(-RX * 0.35, -HH * 0.7, 8, 0, -HH * 0.45, HH * 0.78)
    shade.addColorStop(0, 'rgba(255,255,255,0.6)')
    shade.addColorStop(0.4, 'rgba(255,255,255,0)')
    shade.addColorStop(1, 'rgba(50,20,70,0.3)')
    g.fillStyle = shade
    g.fillRect(-RX - PAD, -HH - PAD, w, h)
    g.beginPath()
    g.ellipse(-RX * 0.42, -HH * 0.72, 13, 25, 0.45, 0, TAU)
    g.fillStyle = 'rgba(255,255,255,0.7)'
    g.fill()
    g.restore()
    eggPath(g)
    g.strokeStyle = palette.line
    g.lineWidth = 5
    g.stroke()
  }

  const zig: [number, number][] = []
  for (let i = 0; i < ZIG; i++) {
    const x = -RX * 1.1 + (i * RX * 2.2) / (ZIG - 1)
    const y = -HH * 0.46 + (i % 2 === 0 ? 1 : -1) * HH * 0.07 + (Math.random() - 0.5) * 8
    zig.push([x, y])
  }
  const branches: EggLook['branches'] = []
  // A few short side cracks; the split line itself does most of the talking.
  for (const at of [1, 7]) {
    const [x, y] = zig[at]!
    const dir = at % 2 === 0 ? 1 : -1
    const lean = (at < ZIG_HALF ? -1 : 1) * (5 + Math.random() * 8)
    branches.push({
      at,
      pts: [
        [x, y],
        [x + lean, y + dir * 15],
        [x - lean * 0.2, y + dir * (26 + Math.random() * 8)],
      ],
    })
  }
  return { canvas, w, h, palette, zig, branches }
}

export function drawLook(g: CanvasRenderingContext2D, look: EggLook): void {
  g.drawImage(look.canvas, -look.w / 2, -(look.h - PAD), look.w, look.h)
}

// Clip to the part of the shell above or below the split line.
export function clipHalf(g: CanvasRenderingContext2D, look: EggLook, top: boolean): void {
  g.beginPath()
  look.zig.forEach(([x, y], i) => (i === 0 ? g.moveTo(x - 20, y) : g.lineTo(i === ZIG - 1 ? x + 20 : x, y)))
  const edge = top ? -HH - PAD : PAD
  g.lineTo(RX + PAD + 20, edge)
  g.lineTo(-RX - PAD - 20, edge)
  g.closePath()
  g.clip()
}

// `reach` is how many zigzag points either side of the middle have cracked
// (0 is none, ZIG_HALF is all the way round). `glow` 0..1 lights the cracks
// from inside.
export function drawCracks(g: CanvasRenderingContext2D, look: EggLook, reach: number, glow: number): void {
  if (reach <= 0) return
  const lo = Math.max(0, ZIG_HALF - reach)
  const hi = Math.min(ZIG - 1, ZIG_HALF + reach)
  g.save()
  eggPath(g)
  g.clip()
  g.beginPath()
  for (let i = lo; i <= hi; i++) {
    const [x, y] = look.zig[i]!
    if (i === lo) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  for (const branch of look.branches) {
    if (branch.at < lo || branch.at > hi) continue
    branch.pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
  }
  g.lineJoin = 'round'
  g.lineCap = 'round'
  if (glow > 0) {
    g.strokeStyle = `rgba(255,255,255,${0.3 + glow * 0.35})`
    g.lineWidth = 13 + glow * 6
    g.stroke()
    g.strokeStyle = '#8a4b00'
    g.lineWidth = 6
    g.stroke()
    g.strokeStyle = '#fffbe0'
    g.lineWidth = 3
    g.stroke()
  } else {
    g.strokeStyle = 'rgba(255,255,255,0.75)'
    g.lineWidth = 9
    g.stroke()
    g.strokeStyle = '#4a2c1a'
    g.lineWidth = 4.5
    g.stroke()
  }
  g.restore()
}

// The jagged hole someone peeks through, centred on the split line.
export function holePath(g: CanvasRenderingContext2D, y: number, rx: number, ry: number): void {
  // A lens: widest in the middle and pinched to a point where it meets the
  // crack on either side, so it reads as the shell opening, not a blob.
  g.beginPath()
  const n = 9
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const px = -rx + t * rx * 2
    const open = Math.sin(t * Math.PI) ** 0.7
    g.lineTo(px, y - ry * open * (i % 2 === 0 ? 0.75 : 1.2))
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n
    const px = -rx + t * rx * 2 + rx / n
    const open = Math.sin(Math.min(1, t + 0.5 / n) * Math.PI) ** 0.7
    g.lineTo(px, y + ry * open * (i % 2 === 0 ? 1.2 : 0.75))
  }
  g.closePath()
}
