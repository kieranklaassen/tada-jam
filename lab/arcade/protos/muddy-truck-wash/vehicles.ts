// The five vehicles, drawn in a local 760 by 470 box with the ground at
// y = 450 and the front pointing right. Bodies are painted once to an
// offscreen canvas; wheels and the face are drawn live on top.

import { TAU } from '../../kit/math.ts'

export const VW = 760
export const VH = 470
export const OUT = '#2a2140'

type C = CanvasRenderingContext2D

export interface Wheel {
  x: number
  y: number
  r: number
  hub: string
}

export interface VehicleDef {
  key: string
  colors: readonly string[]
  wheels: readonly Wheel[]
  face: { x: number; y: number; size: number }
  // Where a bird sits.
  perch: { x: number; y: number }
  // Horn pitch in Hz.
  honk: number
  body(c: C, paint: string): void
}

function rr(c: C, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = true): void {
  c.beginPath()
  c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
  c.fillStyle = fill
  c.fill()
  if (stroke) {
    c.strokeStyle = OUT
    c.lineWidth = 6
    c.lineJoin = 'round'
    c.stroke()
  }
}

// A painted panel: flat colour, a glossy band on top, a shaded band below.
function panel(c: C, x: number, y: number, w: number, h: number, r: number, paint: string): void {
  rr(c, x, y, w, h, r, paint, false)
  c.save()
  c.beginPath()
  c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
  c.clip()
  c.fillStyle = 'rgba(255,255,255,0.26)'
  c.beginPath()
  c.roundRect(x + 12, y + 10, w - 24, Math.max(10, h * 0.2), 14)
  c.fill()
  c.fillStyle = 'rgba(0,0,0,0.13)'
  c.fillRect(x, y + h * 0.8, w, h * 0.2)
  c.restore()
  c.beginPath()
  c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
  c.strokeStyle = OUT
  c.lineWidth = 6
  c.stroke()
}

function pane(c: C, x: number, y: number, w: number, h: number, r: number): void {
  rr(c, x, y, w, h, r, '#c4efff')
  c.save()
  c.beginPath()
  c.roundRect(x, y, w, h, r)
  c.clip()
  c.strokeStyle = 'rgba(255,255,255,0.85)'
  c.lineCap = 'round'
  c.lineWidth = 10
  c.beginPath()
  c.moveTo(x + w * 0.2, y + h * 0.9)
  c.lineTo(x + w * 0.5, y + h * 0.1)
  c.stroke()
  c.lineWidth = 5
  c.beginPath()
  c.moveTo(x + w * 0.42, y + h * 0.9)
  c.lineTo(x + w * 0.68, y + h * 0.2)
  c.stroke()
  c.restore()
}

function disc(c: C, x: number, y: number, r: number, fill: string): void {
  c.beginPath()
  c.arc(x, y, r, 0, TAU)
  c.fillStyle = fill
  c.fill()
  c.strokeStyle = OUT
  c.lineWidth = 5
  c.stroke()
}

function thick(c: C, pts: readonly (readonly [number, number])[], width: number, fill: string): void {
  c.lineCap = 'round'
  c.lineJoin = 'round'
  for (const pass of [0, 1]) {
    c.beginPath()
    pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)))
    c.strokeStyle = pass === 0 ? OUT : fill
    c.lineWidth = pass === 0 ? width + 12 : width
    c.stroke()
  }
}

function poly(c: C, pts: readonly (readonly [number, number])[], fill: string, width = 6): void {
  c.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)))
  c.closePath()
  c.fillStyle = fill
  c.fill()
  c.strokeStyle = OUT
  c.lineWidth = width
  c.lineJoin = 'round'
  c.stroke()
}

const STEEL = '#b9bccb'
const DARK = '#3b3550'

const digger: VehicleDef = {
  key: 'digger',
  colors: ['#ffc928', '#ff8a3d', '#38c6d9'],
  wheels: [
    { x: 172, y: 401, r: 26, hub: STEEL },
    { x: 294, y: 401, r: 26, hub: STEEL },
    { x: 416, y: 401, r: 26, hub: STEEL },
    { x: 538, y: 401, r: 26, hub: STEEL },
  ],
  face: { x: 376, y: 218, size: 31 },
  perch: { x: 585, y: 62 },
  honk: 330,
  body(c, paint) {
    // Boom, stick and bucket behind the cab.
    thick(c, [[450, 262], [585, 104], [668, 224]], 48, paint)
    c.strokeStyle = STEEL
    c.lineWidth = 12
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(478, 300)
    c.lineTo(552, 176)
    c.stroke()
    disc(c, 585, 104, 15, '#fff0b8')
    disc(c, 668, 224, 13, '#fff0b8')
    poly(c, [[626, 214], [714, 214], [720, 254], [704, 304], [686, 280], [668, 306], [650, 280], [632, 304], [620, 254]], '#8c8aa0')
    // Tracks.
    rr(c, 112, 352, 486, 98, 49, '#4b4560')
    rr(c, 134, 374, 442, 54, 27, '#2f2a3d', false)
    // Engine, exhaust, cab.
    rr(c, 152, 168, 24, 60, 8, '#6b6780')
    panel(c, 112, 218, 196, 146, 24, paint)
    c.strokeStyle = 'rgba(42,33,64,0.45)'
    c.lineWidth = 6
    for (let i = 0; i < 3; i++) {
      c.beginPath()
      c.moveTo(140, 270 + i * 22)
      c.lineTo(230, 270 + i * 22)
      c.stroke()
    }
    panel(c, 262, 112, 228, 252, 30, paint)
    rr(c, 248, 94, 256, 32, 14, DARK)
  },
}

const tractor: VehicleDef = {
  key: 'tractor',
  colors: ['#4fc44f', '#4a9bff', '#ff5d8f'],
  wheels: [
    { x: 236, y: 338, r: 112, hub: '#ffd84d' },
    { x: 590, y: 384, r: 66, hub: '#ffd84d' },
  ],
  face: { x: 468, y: 270, size: 27 },
  perch: { x: 262, y: 40 },
  honk: 294,
  body(c, paint) {
    rr(c, 556, 124, 20, 100, 8, '#6b6780')
    rr(c, 546, 110, 40, 20, 8, DARK)
    panel(c, 330, 210, 334, 158, 32, paint)
    rr(c, 632, 238, 32, 100, 10, '#ffe27a')
    c.strokeStyle = 'rgba(42,33,64,0.5)'
    c.lineWidth = 5
    for (let i = 0; i < 3; i++) {
      c.beginPath()
      c.moveTo(636, 262 + i * 24)
      c.lineTo(660, 262 + i * 24)
      c.stroke()
    }
    panel(c, 150, 84, 226, 284, 28, paint)
    pane(c, 178, 112, 170, 110, 16)
    rr(c, 126, 62, 274, 36, 14, DARK)
  },
}

const monster: VehicleDef = {
  key: 'monster',
  colors: ['#a66bff', '#25c9a5', '#ff6b4a'],
  wheels: [
    { x: 196, y: 344, r: 106, hub: '#ff6b6b' },
    { x: 574, y: 344, r: 106, hub: '#ff6b6b' },
  ],
  face: { x: 436, y: 212, size: 28 },
  perch: { x: 386, y: 34 },
  honk: 220,
  body(c, paint) {
    rr(c, 116, 80, 20, 84, 8, STEEL)
    rr(c, 146, 94, 20, 70, 8, STEEL)
    rr(c, 150, 284, 470, 36, 12, '#4b4560')
    panel(c, 262, 56, 252, 134, 36, paint)
    pane(c, 288, 78, 200, 84, 18)
    panel(c, 84, 150, 612, 152, 36, paint)
    // Flames on the tail.
    poly(c, [[92, 200], [226, 196], [176, 218], [262, 226], [184, 242], [236, 266], [92, 270]], '#ffb02e', 4)
    poly(c, [[94, 214], [170, 214], [142, 228], [190, 234], [140, 246], [160, 258], [94, 258]], '#ffe14d', 0.01)
    rr(c, 676, 238, 46, 46, 12, '#d9dce6')
    disc(c, 674, 196, 14, '#fff6b0')
  },
}

const fire: VehicleDef = {
  key: 'fire',
  colors: ['#ff4f4f', '#ff4fa3', '#ffb21f'],
  wheels: [
    { x: 206, y: 388, r: 62, hub: '#e8e8f0' },
    { x: 582, y: 388, r: 62, hub: '#e8e8f0' },
  ],
  face: { x: 334, y: 238, size: 28 },
  perch: { x: 250, y: 96 },
  honk: 392,
  body(c, paint) {
    // Ladder.
    c.save()
    c.translate(76, 164)
    c.rotate(-0.06)
    for (let i = 0; i < 9; i++) rr(c, 16 + i * 44, -42, 10, 36, 3, STEEL)
    rr(c, 0, -48, 400, 12, 6, STEEL)
    rr(c, 0, -16, 400, 12, 6, STEEL)
    c.restore()
    rr(c, 562, 98, 58, 36, 14, '#4db8ff')
    panel(c, 60, 172, 444, 212, 24, paint)
    panel(c, 482, 128, 222, 256, 36, paint)
    pane(c, 568, 154, 114, 88, 16)
    rr(c, 63, 320, 638, 20, 0, '#ffffff', false)
    disc(c, 138, 246, 40, '#ffd84d')
    disc(c, 138, 246, 16, '#c98a1a')
    rr(c, 688, 342, 36, 40, 10, '#d9dce6')
    disc(c, 692, 296, 13, '#fff6b0')
  },
}

const bus: VehicleDef = {
  key: 'bus',
  colors: ['#ffb81f', '#58c7ff', '#7ddc5a'],
  wheels: [
    { x: 200, y: 392, r: 58, hub: '#e8e8f0' },
    { x: 586, y: 392, r: 58, hub: '#e8e8f0' },
  ],
  face: { x: 330, y: 282, size: 27 },
  perch: { x: 380, y: 72 },
  honk: 262,
  body(c, paint) {
    rr(c, 300, 92, 130, 30, 10, DARK)
    panel(c, 50, 110, 666, 274, 46, paint)
    for (let i = 0; i < 4; i++) pane(c, 84 + i * 114, 142, 94, 84, 14)
    pane(c, 556, 142, 130, 104, 18)
    rr(c, 53, 344, 660, 12, 0, 'rgba(42,33,64,0.8)', false)
    disc(c, 696, 298, 14, '#fff6b0')
    rr(c, 694, 348, 34, 32, 10, '#d9dce6')
  },
}

export const VEHICLES: readonly VehicleDef[] = [digger, tractor, monster, fire, bus]

// A wheel with chunky tread, drawn live so it can roll.
export function drawWheel(g: C, w: Wheel, roll: number): void {
  g.save()
  g.translate(w.x, w.y)
  g.beginPath()
  g.arc(0, 0, w.r, 0, TAU)
  g.fillStyle = '#2b2633'
  g.fill()
  g.strokeStyle = OUT
  g.lineWidth = 5
  g.stroke()
  g.rotate(roll)
  if (w.r > 40) {
    g.strokeStyle = '#47405a'
    g.lineWidth = w.r * 0.12
    g.lineCap = 'round'
    const n = 10
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU
      g.beginPath()
      g.moveTo(Math.cos(a) * w.r * 0.74, Math.sin(a) * w.r * 0.74)
      g.lineTo(Math.cos(a + 0.18) * w.r * 0.95, Math.sin(a + 0.18) * w.r * 0.95)
      g.stroke()
    }
  }
  g.beginPath()
  g.arc(0, 0, w.r * 0.56, 0, TAU)
  g.fillStyle = w.hub
  g.fill()
  g.strokeStyle = OUT
  g.lineWidth = Math.max(3, w.r * 0.06)
  g.stroke()
  g.fillStyle = 'rgba(42,33,64,0.55)'
  const bolts = w.r > 40 ? 5 : 3
  for (let i = 0; i < bolts; i++) {
    const a = (i / bolts) * TAU
    g.beginPath()
    g.arc(Math.cos(a) * w.r * 0.32, Math.sin(a) * w.r * 0.32, Math.max(2.5, w.r * 0.07), 0, TAU)
    g.fill()
  }
  g.beginPath()
  g.arc(0, 0, w.r * 0.13, 0, TAU)
  g.fillStyle = '#ffffff'
  g.fill()
  g.restore()
}
