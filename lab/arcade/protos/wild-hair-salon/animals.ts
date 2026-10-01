// The salon's customers: what each one's hair is made of, where it grows, and
// how its face is drawn. Faces are drawn in head-local coordinates (the head is
// an ellipse RX by RY around the origin) so the whole head can tilt and squash.

import { eyes, star } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'
import { makeStrand } from './hair.ts'
import type { HairFeel, HairStyle, Strand } from './hair.ts'

export const RX = 158
export const RY = 146
export const INK = '#3a2418'

export type Kind = 'lion' | 'poodle' | 'yak' | 'porcupine'
export type Expr = 'idle' | 'giggle' | 'wow' | 'ah' | 'choo' | 'proud' | 'love'

export interface Stowaway {
  ch: string
  lx: number
  ly: number
  // Sits on the face under front hair, not behind the head.
  front: boolean
}

export interface Spec {
  kind: Kind
  style: HairStyle
  hair: string[]
  tip: string | null
  width: number
  feel: HairFeel
  cape: string
  capeDot: string
  // Giggle pitch in Hz.
  voice: number
  stowaways: Stowaway[]
  // Where the idle hint rubs, relative to the head centre.
  hintY: number
}

export const SPECS: Spec[] = [
  {
    kind: 'lion',
    style: 'lock',
    hair: ['#e0621f', '#c9501a', '#f07a2a'],
    tip: null,
    width: 22,
    feel: { stiff: 5, grav: 3000, drag: 0.985, droop: 1.25 },
    cape: '#4db8ff',
    capeDot: '#bfe6ff',
    voice: 330,
    stowaways: [
      { ch: '🐤', lx: -182, ly: -52, front: false },
      { ch: '🐭', lx: 60, ly: -212, front: false },
      { ch: '🦋', lx: 188, ly: 26, front: false },
    ],
    hintY: -215,
  },
  {
    kind: 'poodle',
    style: 'curl',
    hair: ['#ffffff', '#f4f0ff', '#fff6fb'],
    tip: null,
    width: 36,
    feel: { stiff: 6.5, grav: 2400, drag: 0.982, droop: 1.1 },
    cape: '#ff7ac8',
    capeDot: '#ffd1ec',
    voice: 620,
    stowaways: [
      { ch: '🦴', lx: 0, ly: -178, front: false },
      { ch: '🎾', lx: -172, ly: 158, front: false },
      { ch: '🧦', lx: 172, ly: 158, front: false },
    ],
    hintY: -190,
  },
  {
    kind: 'yak',
    style: 'lock',
    hair: ['#6b4226', '#54321c', '#80522f'],
    tip: null,
    width: 24,
    feel: { stiff: 2.6, grav: 3400, drag: 0.98, droop: 1 },
    cape: '#5ed36a',
    capeDot: '#c9f5cf',
    voice: 210,
    stowaways: [
      { ch: '🐸', lx: 0, ly: -6, front: true },
      { ch: '🍎', lx: -178, ly: 80, front: false },
      { ch: '🐞', lx: 180, ly: 60, front: false },
    ],
    hintY: -40,
  },
  {
    kind: 'porcupine',
    style: 'spike',
    hair: ['#4a3426', '#3d2a1f', '#5a4030'],
    tip: '#fff3d6',
    width: 26,
    feel: { stiff: 15, grav: 1200, drag: 0.988, droop: 0.4 },
    cape: '#ffb02e',
    capeDot: '#ffe3a8',
    voice: 480,
    stowaways: [
      { ch: '🍄', lx: -150, ly: -150, front: false },
      { ch: '🍓', lx: 20, ly: -232, front: false },
      { ch: '🎈', lx: 172, ly: -125, front: false },
    ],
    hintY: -215,
  },
]

const DEG = Math.PI / 180

export function buildStrands(spec: Spec, rand: () => number, dye: string | null): Strand[] {
  const out: Strand[] = []
  const natural = (shade: number): string[] => {
    const c = dye ?? spec.hair[shade % spec.hair.length]!
    return spec.tip ? [c, c, spec.tip, spec.tip] : [c, c, c, c]
  }
  // `theta` is measured from straight up, clockwise.
  const ring = (n: number, spread: number, scale: number, base: number, front: boolean, fan = 1): void => {
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1)
      const theta = (-spread + u * 2 * spread) * DEG
      const dir = theta * fan
      out.push(
        makeStrand(
          Math.sin(theta) * RX * scale,
          -Math.cos(theta) * RY * scale,
          Math.sin(dir),
          -Math.cos(dir),
          base * (0.88 + rand() * 0.24),
          front,
          spec.width,
          natural(i + Math.floor(rand() * 3)),
          Math.round(u * 9),
        ),
      )
    }
  }
  const tuft = (n: number, half: number, y: number, base: number): void => {
    for (let i = 0; i < n; i++) {
      const x = -half + (i / (n - 1)) * 2 * half
      out.push(makeStrand(x, y, x / (half * 2.2), -1, base * (0.85 + rand() * 0.3), true, spec.width * 0.9, natural(i), 5 + i))
    }
  }

  if (spec.kind === 'lion') {
    ring(25, 142, 0.9, 128, false)
    ring(22, 136, 0.95, 86, false)
    tuft(5, 46, -RY * 0.84, 52)
  } else if (spec.kind === 'poodle') {
    ring(13, 58, 0.78, 84, false, 1.5)
    ring(12, 50, 0.8, 62, true, 1.6)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 10; i++) {
        const a = (-75 + (i / 9) * 150) * DEG
        out.push(makeStrand(side * 170 + Math.sin(a) * 14, 116, Math.sin(a), Math.cos(a), 46 + rand() * 18, true, spec.width, natural(i), i))
      }
    }
  } else if (spec.kind === 'yak') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 11; i++) {
        const theta = side * (52 + (i / 10) * 72) * DEG
        out.push(
          makeStrand(Math.sin(theta) * RX * 0.93, -Math.cos(theta) * RY * 0.93, side * 0.42, 1, 150 + rand() * 50, false, spec.width, natural(i + Math.floor(rand() * 3)), i),
        )
      }
    }
    for (let i = 0; i < 19; i++) {
      const x = -138 + (i / 18) * 276
      const y = -RY * Math.sqrt(Math.max(0, 1 - (x / RX) ** 2)) * 0.78
      out.push(makeStrand(x, y, (x / 138) * 0.34, 1, (150 - Math.abs(x) * 0.22) * (0.9 + rand() * 0.2), true, spec.width, natural(i + Math.floor(rand() * 3)), Math.round(i / 2)))
    }
    tuft(5, 40, -RY * 0.9, 44)
  } else {
    ring(21, 124, 0.84, 165, false)
    ring(20, 116, 0.9, 122, false)
    ring(16, 102, 0.95, 80, false)
    tuft(5, 40, -RY * 0.84, 40)
  }
  return out
}

function oval(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke: string | null = INK, rot = 0, width = 5): void {
  g.beginPath()
  g.ellipse(x, y, rx, ry, rot, 0, TAU)
  g.fillStyle = fill
  g.fill()
  if (stroke) {
    g.lineWidth = width
    g.strokeStyle = stroke
    g.stroke()
  }
}

export interface FaceState {
  expr: Expr
  lookX: number
  lookY: number
  blink: number
  // 0..1, how close the sneeze is.
  sneeze: number
  earL: number
  earR: number
  nose: number
  time: number
  blush: number
  sweat: boolean
}

function mouth(g: CanvasRenderingContext2D, x: number, y: number, f: FaceState, cat: boolean): void {
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.strokeStyle = INK
  g.lineWidth = 5
  const e = f.expr
  if (e === 'giggle' || e === 'proud' || e === 'love') {
    const open = e === 'giggle' ? 30 + Math.sin(f.time * 26) * 5 : 24
    g.beginPath()
    g.moveTo(x - 30, y - 12)
    g.quadraticCurveTo(x, y - 12 + open * 1.5, x + 30, y - 12)
    g.closePath()
    g.fillStyle = '#6b1f2e'
    g.fill()
    g.stroke()
    g.save()
    g.clip()
    g.beginPath()
    g.ellipse(x, y - 12 + open * 0.78, 16, 9, 0, 0, TAU)
    g.fillStyle = '#ff7a96'
    g.fill()
    g.restore()
  } else if (e === 'wow') {
    oval(g, x, y, 11, 14, '#6b1f2e', INK, 0, 4)
  } else if (e === 'ah') {
    oval(g, x, y + 2, 12 + f.sneeze * 12, 12 + f.sneeze * 24, '#6b1f2e', INK, 0, 4)
  } else if (e === 'choo') {
    oval(g, x, y + 6, 30, 34, '#6b1f2e', INK, 0, 4)
  } else if (cat) {
    g.beginPath()
    g.arc(x - 14, y - 14, 14, 0.1 * Math.PI, 0.95 * Math.PI)
    g.stroke()
    g.beginPath()
    g.arc(x + 14, y - 14, 14, 0.05 * Math.PI, 0.9 * Math.PI)
    g.stroke()
  } else {
    g.beginPath()
    g.arc(x, y - 22, 28, 0.2 * Math.PI, 0.8 * Math.PI)
    g.stroke()
  }
}

function drawEyes(g: CanvasRenderingContext2D, y: number, f: FaceState): void {
  const gapPx = 60
  const e = f.expr
  g.lineCap = 'round'
  g.lineJoin = 'round'
  if (e === 'giggle' || e === 'proud') {
    g.strokeStyle = INK
    g.lineWidth = 7
    for (const side of [-1, 1]) {
      g.beginPath()
      g.arc(side * gapPx, y + 10, 20, 1.15 * Math.PI, 1.85 * Math.PI)
      g.stroke()
    }
    return
  }
  if (e === 'choo') {
    g.strokeStyle = INK
    g.lineWidth = 7
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * (gapPx + 18), y - 14)
      g.lineTo(side * (gapPx - 14), y)
      g.lineTo(side * (gapPx + 18), y + 14)
      g.stroke()
    }
    return
  }
  if (e === 'love') {
    for (const side of [-1, 1]) {
      star(g, side * gapPx, y, 34, INK, Math.sin(f.time * 5) * 0.2)
      star(g, side * gapPx, y, 27, '#ffe14d', Math.sin(f.time * 5) * 0.2)
    }
    return
  }
  const size = e === 'wow' ? 34 : 27
  const blink = e === 'ah' ? 0.35 + f.sneeze * 0.4 : e === 'wow' ? 0 : f.blink
  eyes(g, 0, y, size, f.lookX, e === 'wow' ? -0.8 : f.lookY, blink, gapPx / size)
}

function blush(g: CanvasRenderingContext2D, x: number, y: number, r: number, f: FaceState): void {
  const a = 0.3 + f.blush * 0.5
  for (const side of [-1, 1]) {
    g.beginPath()
    g.ellipse(side * x, y, r * 1.2, r * 0.8, 0, 0, TAU)
    g.fillStyle = `rgba(255,105,120,${a})`
    g.fill()
  }
}

// The head in local coordinates: ears behind, the skull, then the face.
export function drawHead(g: CanvasRenderingContext2D, spec: Spec, f: FaceState): void {
  const ns = 1 + f.nose * 0.35
  if (spec.kind === 'lion') {
    for (const side of [-1, 1]) {
      const wig = side < 0 ? f.earL : f.earR
      oval(g, side * 116, -108 - wig * 14, 44, 44 + wig * 6, '#f9bf4f')
      oval(g, side * 116, -104 - wig * 14, 24, 24, '#ff9aa8', null)
    }
    oval(g, 0, 0, RX, RY, '#f9bf4f')
    blush(g, 104, 36, 20, f)
    g.strokeStyle = 'rgba(90,50,20,0.55)'
    g.lineWidth = 3.5
    g.lineCap = 'round'
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        g.beginPath()
        g.moveTo(side * 52, 48 + i * 8)
        g.lineTo(side * 122, 34 + i * 20 + Math.sin(f.time * 2 + i) * 2)
        g.stroke()
      }
    }
    oval(g, -30, 54, 40, 33, '#fff0cf', null)
    oval(g, 30, 54, 40, 33, '#fff0cf', null)
    oval(g, 0, 80, 28, 18, '#fff0cf', null)
    drawEyes(g, -32, f)
    g.beginPath()
    g.moveTo(-24 * ns, 16)
    g.quadraticCurveTo(0, 8, 24 * ns, 16)
    g.quadraticCurveTo(12, 40 * (2 - ns), 0, 42 * (2 - ns))
    g.quadraticCurveTo(-12, 40 * (2 - ns), -24 * ns, 16)
    g.closePath()
    g.fillStyle = '#a0522d'
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = INK
    g.stroke()
    mouth(g, 0, 74, f, true)
  } else if (spec.kind === 'poodle') {
    for (const side of [-1, 1]) {
      const wig = side < 0 ? f.earL : f.earR
      oval(g, side * 168, 18, 40, 104, '#f2dfea', INK, side * (0.1 + wig * 0.25))
    }
    oval(g, 0, 0, RX, RY, '#fffaf4')
    blush(g, 108, 30, 20, f)
    oval(g, 0, 62, 70, 52, '#ffffff', 'rgba(58,36,24,0.25)', 0, 4)
    drawEyes(g, -34, f)
    oval(g, 0, 32, 25 * ns, 18 * (2 - ns), '#2b2230', INK, 0, 3)
    oval(g, -8, 26, 7, 4, 'rgba(255,255,255,0.7)', null)
    g.beginPath()
    g.moveTo(0, 50)
    g.lineTo(0, 62)
    g.lineWidth = 4
    g.strokeStyle = INK
    g.stroke()
    mouth(g, 0, 84, f, true)
  } else if (spec.kind === 'yak') {
    g.lineCap = 'round'
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * 96, -108)
      g.quadraticCurveTo(side * 215, -120, side * 196, -236)
      g.lineWidth = 44
      g.strokeStyle = INK
      g.stroke()
      g.lineWidth = 34
      g.strokeStyle = '#f6e9c9'
      g.stroke()
      const wig = side < 0 ? f.earL : f.earR
      oval(g, side * 166, -28 - wig * 12, 44, 22, '#8a5d3f', INK, side * (0.35 - wig * 0.5))
    }
    oval(g, 0, 0, RX, RY, '#a4724e')
    blush(g, 116, 10, 18, f)
    drawEyes(g, -34, f)
    oval(g, 0, 72, 96, 60, '#f3c9b5', INK, 0, 4)
    for (const side of [-1, 1]) oval(g, side * 32 * ns, 56, 12, 17 * (2 - ns), '#9a5a4e', null, side * 0.2)
    mouth(g, 0, 104, f, false)
  } else {
    for (const side of [-1, 1]) {
      const wig = side < 0 ? f.earL : f.earR
      oval(g, side * 122, -96 - wig * 12, 32, 32 + wig * 5, '#8a6248')
      oval(g, side * 122, -94 - wig * 12, 17, 17, '#f0a5a5', null)
    }
    oval(g, 0, 0, RX, RY, '#c99f78')
    oval(g, 0, 34, 116, 98, '#f6e2c6', null)
    blush(g, 98, 46, 20, f)
    drawEyes(g, -34, f)
    oval(g, 0, 30, 30 * ns, 22 * (2 - ns), INK, null)
    oval(g, -10, 22, 8, 5, 'rgba(255,255,255,0.6)', null)
    mouth(g, 0, 78, f, false)
    if (f.expr === 'idle' || f.expr === 'ah') {
      g.fillStyle = '#ffffff'
      g.strokeStyle = INK
      g.lineWidth = 3.5
      for (const side of [-1, 0]) {
        g.beginPath()
        g.rect(side * 13 + 0.5, 64, 12, 16)
        g.fill()
        g.stroke()
      }
    }
  }
  if (f.sweat) {
    // A sweat drop for the "where did my hair go" look.
    g.beginPath()
    g.moveTo(118, -92)
    g.quadraticCurveTo(136, -62, 118, -56)
    g.quadraticCurveTo(100, -62, 118, -92)
    g.fillStyle = '#9fe3ff'
    g.fill()
    g.lineWidth = 3
    g.strokeStyle = '#3a8fb5'
    g.stroke()
  }
}
