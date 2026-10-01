// The two places: the hallway (cached once) and the garden in four weathers
// (one cached backdrop each). Only what moves is drawn per frame.

import { TAU, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { blob, grain, hash, leaf, makeCanvas, woodGrain } from './paint.ts'
import type { G } from './paint.ts'

export type Weather = 'rain' | 'snow' | 'wind' | 'sun'
export const WEATHERS: readonly Weather[] = ['rain', 'snow', 'wind', 'sun']

export const HALL = {
  floorY: 640,
  win: { x: 54, y: 106, w: 236, h: 296 },
  door: { x: 1022, y: 146, w: 142, h: 500 },
  childX: 430,
  childY: 730,
  doorX: 1090,
  doorY: 684,
  pegY: 200,
  shelfY: 154,
  benchY: 588,
  cat: { x: 170, y: 700 },
} as const

export const YARD = {
  horizon: 530,
  doorX: 126,
  doorY: 658,
  top: 612,
  bottom: 764,
  scale: 0.6,
} as const

interface Sky {
  top: string
  low: string
  hill: string
  ground: string
  groundLow: string
  crown: string
}

export const SKY: Record<Weather, Sky> = {
  rain: { top: '#93a6ae', low: '#c5cfcd', hill: '#7d957f', ground: '#7c9a6c', groundLow: '#68875c', crown: '#5b7a56' },
  snow: { top: '#c3d0da', low: '#eef1f2', hill: '#e9eef1', ground: '#f6f8f8', groundLow: '#dfe8ee', crown: '#f4f6f6' },
  wind: { top: '#9fc0cc', low: '#ece6cf', hill: '#c5a257', ground: '#c9ab5f', groundLow: '#b3924a', crown: '#cf7f3a' },
  sun: { top: '#8fc9e2', low: '#e6f1dc', hill: '#9cc57d', ground: '#93c36f', groundLow: '#7bb05c', crown: '#6fa552' },
}

function rr(g: G, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  g.beginPath()
  g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
  g.fillStyle = fill
  g.fill()
}

function vgrad(g: G, y0: number, y1: number, a: string, b: string): CanvasGradient {
  const grad = g.createLinearGradient(0, y0, 0, y1)
  grad.addColorStop(0, a)
  grad.addColorStop(1, b)
  return grad
}

// ---------------------------------------------------------------- hallway

export function buildHall(rand: () => number): HTMLCanvasElement {
  const [canvas, g] = makeCanvas(W, H)
  const F = HALL.floorY
  // Lime-washed wall.
  g.fillStyle = vgrad(g, 0, F, '#f4e9d6', '#ecdcc3')
  g.fillRect(0, 0, W, F)
  for (let i = 0; i < 46; i++) {
    blob(g, rand() * W, rand() * F, 60 + rand() * 120, 30 + rand() * 60, rand() < 0.5 ? 'rgba(255,250,238,0.10)' : 'rgba(205,170,120,0.05)', i + 2, 0.2)
  }
  // Floorboards.
  g.fillStyle = vgrad(g, F, H, '#c39a6b', '#b08455')
  g.fillRect(0, F, W, H - F)
  const rows = [F, F + 34, F + 76, F + 126, H]
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r]!
    const y1 = rows[r + 1]!
    woodGrain(g, 0, y0, W, y1 - y0, rand, 3 + r)
    g.strokeStyle = 'rgba(95,60,30,0.28)'
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(0, y0)
    g.lineTo(W, y0 + (rand() - 0.5) * 2)
    for (let x = rand() * 300; x < W; x += 260 + rand() * 240) {
      g.moveTo(x, y0)
      g.lineTo(x + (rand() - 0.5) * 4, y1)
    }
    g.stroke()
  }
  // Skirting board.
  rr(g, -10, F - 30, W + 20, 34, 4, '#d9bf98')
  g.fillStyle = 'rgba(120,80,40,0.18)'
  g.fillRect(0, F + 2, W, 5)

  // A small picture: a hill and a sun, painted wet-on-wet.
  rr(g, 348, 118, 124, 96, 6, '#b88755')
  rr(g, 358, 128, 104, 76, 3, '#f6efdf')
  g.save()
  g.beginPath()
  g.rect(358, 128, 104, 76)
  g.clip()
  blob(g, 432, 156, 15, 15, 'rgba(226,170,70,0.75)', 3, 0.1)
  blob(g, 396, 206, 60, 30, 'rgba(120,150,110,0.6)', 5, 0.1)
  blob(g, 452, 212, 44, 22, 'rgba(109,144,156,0.5)', 6, 0.1)
  g.restore()

  // The window recess shadow, the sill and the rod.
  const w = HALL.win
  rr(g, w.x - 16, w.y - 16, w.w + 32, w.h + 34, 6, '#c9a877')
  rr(g, w.x - 9, w.y - 9, w.w + 18, w.h + 18, 4, '#e2c79c')
  rr(g, w.x - 30, w.y + w.h + 10, w.w + 60, 18, 6, '#c19a66')
  woodGrain(g, w.x - 30, w.y + w.h + 10, w.w + 60, 18, rand, 2)

  // Coat rack: a shelf, a backboard, four pegs.
  const sy = HALL.shelfY
  g.fillStyle = 'rgba(110,75,40,0.14)'
  g.fillRect(612, sy + 12, 366, 10)
  rr(g, 600, sy, 390, 15, 6, '#b88755')
  woodGrain(g, 600, sy, 390, 15, rand, 2)
  for (const bx of [628, 962]) {
    g.beginPath()
    g.moveTo(bx - 8, sy + 15)
    g.lineTo(bx + 8, sy + 15)
    g.lineTo(bx, sy + 34)
    g.closePath()
    g.fillStyle = '#a27447'
    g.fill()
  }
  rr(g, 616, HALL.pegY - 17, 358, 32, 12, '#c4955f')
  woodGrain(g, 616, HALL.pegY - 17, 358, 32, rand, 4)
  for (const px of PEGS) {
    g.beginPath()
    g.ellipse(px + 3, HALL.pegY + 6, 11, 9, 0, 0, TAU)
    g.fillStyle = 'rgba(90,55,25,0.3)'
    g.fill()
    g.beginPath()
    g.arc(px, HALL.pegY, 10, 0, TAU)
    g.fillStyle = '#e0bd8a'
    g.fill()
    g.strokeStyle = '#a67c4d'
    g.lineWidth = 2.5
    g.stroke()
    g.beginPath()
    g.arc(px, HALL.pegY, 4.5, 0, TAU)
    g.strokeStyle = 'rgba(166,124,77,0.6)'
    g.lineWidth = 1.5
    g.stroke()
  }

  // Boot bench.
  const by = HALL.benchY
  g.beginPath()
  g.ellipse(795, 672, 200, 16, 0, 0, TAU)
  g.fillStyle = 'rgba(80,50,25,0.16)'
  g.fill()
  for (const lx of [632, 938]) {
    rr(g, lx, by + 12, 22, 74, 5, '#a27447')
  }
  rr(g, 640, by + 50, 310, 12, 5, '#a27447')
  rr(g, 610, by, 370, 19, 7, '#c4955f')
  woodGrain(g, 610, by, 370, 19, rand, 3)
  g.fillStyle = 'rgba(90,55,25,0.2)'
  g.fillRect(616, by + 19, 358, 4)

  // Braided rug.
  const rugs = ['#a9524b', '#e9dcc3', '#6d909c', '#e9dcc3', '#c58a4f', '#e9dcc3']
  for (let i = 0; i < rugs.length; i++) {
    const k = 1 - i * 0.15
    blob(g, HALL.childX, HALL.childY + 14, 196 * k, 46 * k, rugs[i]!, 21, 0.025, 14)
  }
  g.strokeStyle = 'rgba(80,50,30,0.16)'
  g.lineWidth = 1.6
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * TAU
    const k = 0.94
    g.beginPath()
    g.moveTo(HALL.childX + Math.cos(a) * 196 * k, HALL.childY + 14 + Math.sin(a) * 46 * k)
    g.lineTo(HALL.childX + Math.cos(a + 0.05) * 196, HALL.childY + 14 + Math.sin(a + 0.05) * 46)
    g.stroke()
  }

  // The cat's cushion.
  blob(g, HALL.cat.x, HALL.cat.y + 14, 104, 30, 'rgba(80,50,25,0.14)', 8, 0.05)
  blob(g, HALL.cat.x, HALL.cat.y + 4, 98, 30, '#8d6a8a', 9, 0.05, 12)
  blob(g, HALL.cat.x, HALL.cat.y - 2, 90, 24, '#a6839f', 10, 0.05, 12)

  // Door frame.
  const d = HALL.door
  rr(g, d.x - 14, d.y - 14, d.w + 28, d.h + 16, 6, '#c9a877')
  woodGrain(g, d.x - 14, d.y - 14, d.w + 28, d.h + 16, rand, 9)
  // A woven mat at the door.
  blob(g, d.x + d.w / 2 - 14, F + 26, 92, 17, '#a98a5c', 13, 0.04, 12)
  g.strokeStyle = 'rgba(100,70,35,0.3)'
  g.lineWidth = 2
  for (let i = -5; i <= 5; i++) {
    g.beginPath()
    g.moveTo(d.x + d.w / 2 - 14 + i * 15 - 5, F + 14)
    g.lineTo(d.x + d.w / 2 - 14 + i * 15 + 5, F + 38)
    g.stroke()
  }

  grain(g, 0, 0, W, H, rand, 5200, 0.05)
  return canvas
}

export const PEGS: readonly number[] = [666, 764, 858, 950]

// What can be seen outdoors through a pane or the open door.
export function drawView(g: G, x: number, y: number, w: number, h: number, weather: Weather, t: number, tree: boolean): void {
  const s = SKY[weather]
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  g.fillStyle = vgrad(g, y, y + h, s.top, s.low)
  g.fillRect(x, y, w, h)
  if (weather === 'sun') {
    const pulse = 1 + Math.sin(t * 0.8) * 0.04
    g.beginPath()
    g.arc(x + w * 0.26, y + h * 0.22, 46 * pulse, 0, TAU)
    g.fillStyle = 'rgba(255,240,180,0.45)'
    g.fill()
    g.beginPath()
    g.arc(x + w * 0.26, y + h * 0.22, 27, 0, TAU)
    g.fillStyle = '#f7d976'
    g.fill()
  } else {
    // Slow clouds; quick ones in the wind.
    const speed = weather === 'wind' ? 26 : 5
    for (let i = 0; i < 3; i++) {
      const cx = x - 60 + ((t * speed * (0.7 + i * 0.3) + i * 140) % (w + 160))
      blob(g, cx, y + h * (0.14 + i * 0.13), 56, 16, weather === 'rain' ? 'rgba(120,135,142,0.5)' : 'rgba(255,255,255,0.6)', i + 3, 0.12)
    }
  }
  blob(g, x + w * 0.3, y + h * 0.92, w * 0.75, h * 0.24, s.hill, 4, 0.05)
  g.fillStyle = s.ground
  g.fillRect(x, y + h * 0.84, w, h * 0.16)
  if (tree) {
    const tx = x + w * 0.7
    const base = y + h * 0.88
    const sway = Math.sin(t * (weather === 'wind' ? 2.6 : 0.6)) * (weather === 'wind' ? 0.1 : 0.012)
    g.save()
    g.translate(tx, base)
    g.rotate((weather === 'wind' ? 0.12 : 0) + sway)
    g.strokeStyle = '#7a5a3e'
    g.lineWidth = 12
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, -h * 0.34)
    g.stroke()
    if (weather === 'snow') {
      g.lineWidth = 6
      g.beginPath()
      g.moveTo(0, -h * 0.3)
      g.lineTo(-38, -h * 0.5)
      g.moveTo(0, -h * 0.34)
      g.lineTo(34, -h * 0.56)
      g.moveTo(0, -h * 0.34)
      g.lineTo(-4, -h * 0.62)
      g.stroke()
      blob(g, -30, -h * 0.5, 22, 8, '#ffffff', 2, 0.1)
      blob(g, 28, -h * 0.56, 22, 8, '#ffffff', 3, 0.1)
      blob(g, -3, -h * 0.63, 16, 8, '#ffffff', 4, 0.1)
    } else {
      blob(g, 0, -h * 0.5, 62, 58, s.crown, 6, 0.1, 10)
      blob(g, -22, -h * 0.56, 30, 26, 'rgba(255,255,255,0.14)', 7, 0.1)
    }
    g.restore()
  }
  if (weather === 'rain') {
    g.strokeStyle = 'rgba(235,244,246,0.75)'
    g.lineWidth = 2.4
    g.beginPath()
    for (let i = 0; i < 26; i++) {
      const px = x + hash(i * 1.7) * (w + 30)
      const py = y + ((t * (300 + hash(i * 2.9) * 120) + hash(i * 4.3) * h) % (h + 30)) - 20
      g.moveTo(px, py)
      g.lineTo(px - 5, py + 20)
    }
    g.stroke()
    // Drops running down the glass.
    g.fillStyle = 'rgba(240,248,250,0.65)'
    for (let i = 0; i < 6; i++) {
      const px = x + 14 + hash(i * 9.1) * (w - 28)
      const py = y + ((t * (9 + hash(i * 3.3) * 16) + hash(i * 6.1) * h) % h)
      g.beginPath()
      g.ellipse(px, py, 3.2, 5.5, 0, 0, TAU)
      g.fill()
    }
  } else if (weather === 'snow') {
    g.fillStyle = '#ffffff'
    for (let i = 0; i < 24; i++) {
      const px = x + hash(i * 1.7) * w + Math.sin(t * 0.9 + i) * 10
      const py = y + ((t * (22 + hash(i * 2.9) * 24) + hash(i * 4.3) * h) % (h + 10)) - 5
      g.beginPath()
      g.arc(px, py, 2.6 + hash(i * 7.7) * 3, 0, TAU)
      g.fill()
    }
  } else if (weather === 'wind') {
    for (let i = 0; i < 8; i++) {
      const px = x - 20 + ((t * (120 + hash(i * 2.9) * 90) + hash(i * 4.3) * w) % (w + 40))
      const py = y + h * (0.15 + hash(i * 1.7) * 0.7) + Math.sin(t * 3 + i * 2) * 12
      leaf(g, px, py, 15, t * 5 + i, i % 2 ? '#cf7f3a' : '#b9573a')
    }
  }
  g.restore()
}

export function drawWindow(g: G, weather: Weather, t: number, closed: number, evening: number, stir: number): void {
  const w = HALL.win
  drawView(g, w.x, w.y, w.w, w.h, weather, t, true)
  if (evening > 0.01) {
    // The day going down: gold first, then a little dusk.
    const grad = g.createLinearGradient(0, w.y, 0, w.y + w.h)
    grad.addColorStop(0, `rgba(226,128,96,${evening * 0.5})`)
    grad.addColorStop(1, `rgba(250,196,120,${evening * 0.55})`)
    g.fillStyle = grad
    g.fillRect(w.x, w.y, w.w, w.h)
    if (evening > 0.6) {
      g.fillStyle = `rgba(84,80,128,${(evening - 0.6) * 0.5})`
      g.fillRect(w.x, w.y, w.w, w.h)
    }
  }
  // Frame and glazing bars.
  g.strokeStyle = '#f3e6cc'
  g.lineWidth = 9
  g.strokeRect(w.x, w.y, w.w, w.h)
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(w.x + w.w / 2, w.y)
  g.lineTo(w.x + w.w / 2, w.y + w.h)
  g.moveTo(w.x, w.y + w.h * 0.42)
  g.lineTo(w.x + w.w, w.y + w.h * 0.42)
  g.stroke()
  if (weather === 'snow') blob(g, w.x + w.w / 2, w.y + w.h - 3, w.w / 2 - 6, 9, '#ffffff', 3, 0.12, 13)
  // A geranium on the sill.
  const px = w.x + w.w * 0.3
  const py = w.y + w.h + 10
  g.strokeStyle = '#6f8f5e'
  g.lineWidth = 3.5
  g.beginPath()
  g.moveTo(px, py - 30)
  g.quadraticCurveTo(px - 10, py - 54, px - 16, py - 62 + Math.sin(t * 0.9) * 1.5)
  g.moveTo(px, py - 30)
  g.quadraticCurveTo(px + 8, py - 58, px + 14, py - 70 + Math.sin(t * 0.7 + 1) * 1.5)
  g.stroke()
  leaf(g, px - 12, py - 44, 20, -0.5, '#7fa06b')
  leaf(g, px + 13, py - 48, 20, -2.4, '#6f8f5e')
  blob(g, px - 16, py - 64 + Math.sin(t * 0.9) * 1.5, 9, 8, '#c9655a', 2, 0.15)
  blob(g, px + 14, py - 72 + Math.sin(t * 0.7 + 1) * 1.5, 10, 9, '#c9655a', 3, 0.15)
  g.beginPath()
  g.moveTo(px - 20, py - 32)
  g.lineTo(px + 20, py - 32)
  g.lineTo(px + 15, py)
  g.lineTo(px - 15, py)
  g.closePath()
  g.fillStyle = '#c47f58'
  g.fill()
  rr(g, px - 23, py - 36, 46, 9, 4, '#b06d48')

  // Linen curtains on a wooden rod.
  rr(g, w.x - 34, w.y - 32, w.w + 68, 9, 4, '#a27447')
  for (const side of [-1, 1]) {
    const edge = side < 0 ? w.x - 22 : w.x + w.w + 22
    const width = lerp(54, w.w / 2 + 26, closed)
    const sway = (Math.sin(t * 0.7 + side) * 2.5 + Math.sin(t * 8 + side) * 7 * stir) * (1 - closed * 0.6)
    const top = w.y - 26
    const bottom = w.y + w.h + 36
    const waistY = w.y + w.h * 0.72
    const pinch = (1 - closed) * 0.42
    const dir = -side
    g.beginPath()
    g.moveTo(edge, top)
    g.lineTo(edge + dir * width, top)
    g.quadraticCurveTo(edge + dir * width * (1 - pinch * 0.2), (top + waistY) / 2, edge + dir * (width * (1 - pinch) + sway), waistY)
    g.quadraticCurveTo(edge + dir * (width * (1 - pinch * 0.3) + sway), (waistY + bottom) / 2, edge + dir * (width * 0.96 + sway * 1.6), bottom)
    g.lineTo(edge, bottom)
    g.closePath()
    g.fillStyle = '#f2e9d8'
    g.fill()
    g.strokeStyle = 'rgba(170,145,105,0.38)'
    g.lineWidth = 2.5
    const folds = Math.round(lerp(3, 7, closed))
    g.beginPath()
    for (let i = 1; i <= folds; i++) {
      const k = i / (folds + 1)
      g.moveTo(edge + dir * width * k, top + 6)
      g.quadraticCurveTo(edge + dir * width * k * (1 - pinch * 0.6), waistY, edge + dir * (width * k * 0.96 + sway * k), bottom - 4)
    }
    g.stroke()
    if (closed < 0.6) {
      g.globalAlpha = 1 - closed / 0.6
      g.beginPath()
      g.moveTo(edge, waistY - 6)
      g.quadraticCurveTo(edge + dir * width * 0.4, waistY + 8, edge + dir * (width * (1 - pinch) + sway + 2), waistY)
      g.strokeStyle = '#a9524b'
      g.lineWidth = 6
      g.stroke()
      g.globalAlpha = 1
    }
    // Wooden rings.
    g.fillStyle = '#c4955f'
    for (let i = 0; i < 4; i++) {
      g.beginPath()
      g.arc(edge + dir * (6 + (width - 12) * (i / 3)), top - 2, 5, 0, TAU)
      g.fill()
    }
  }
}

export function drawDoor(g: G, weather: Weather, t: number, open: number, glintA: number, evening: number): void {
  const d = HALL.door
  const e = open * open * (3 - 2 * open)
  if (e > 0.01) {
    drawView(g, d.x, d.y, d.w, d.h, weather, t, false)
    g.fillStyle = `rgba(255,248,225,${0.2 * e})`
    g.fillRect(d.x, d.y, d.w, d.h)
  }
  const lw = d.w * (1 - 0.84 * e)
  const lx = d.x + d.w - lw
  const k = lw / d.w
  rr(g, lx, d.y, lw, d.h, 4, '#8fa58a')
  g.fillStyle = `rgba(40,60,45,${0.26 * e})`
  g.fillRect(lx, d.y, lw, d.h)
  // Two glass panes and two wooden panels.
  const s = SKY[weather]
  for (let i = 0; i < 2; i++) {
    const px = lx + (14 + i * 62) * k
    rr(g, px, d.y + 22, 52 * k, 130, 5, s.low)
    if (evening > 0.01) rr(g, px, d.y + 22, 52 * k, 130, 5, `rgba(236,150,100,${evening * 0.5})`)
    g.fillStyle = 'rgba(255,255,255,0.22)'
    g.fillRect(px + 6 * k, d.y + 30, 9 * k, 112)
    g.strokeStyle = '#7b9276'
    g.lineWidth = 3
    g.strokeRect(px, d.y + 22, 52 * k, 130)
    rr(g, px, d.y + 178, 52 * k, 130, 5, '#84997f')
    rr(g, px, d.y + 334, 52 * k, 140, 5, '#84997f')
  }
  // Brass handle.
  const hx = lx + 20 * k
  const hy = d.y + 286
  g.beginPath()
  g.arc(hx, hy, 9, 0, TAU)
  g.fillStyle = '#b9933f'
  g.fill()
  g.strokeStyle = '#b9933f'
  g.lineWidth = 8
  g.beginPath()
  g.moveTo(hx, hy)
  g.lineTo(hx + 30 * k, hy + 2)
  g.stroke()
  g.strokeStyle = 'rgba(255,240,190,0.6)'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(hx + 3, hy - 2)
  g.lineTo(hx + 26 * k, hy)
  g.stroke()
  if (glintA > 0.01) {
    g.save()
    g.globalAlpha = glintA
    g.fillStyle = '#fffbe8'
    const r = 13
    const gx = hx + 16 * k
    const gy = hy - 4
    g.beginPath()
    g.moveTo(gx, gy - r)
    g.quadraticCurveTo(gx, gy, gx + r, gy)
    g.quadraticCurveTo(gx, gy, gx, gy + r)
    g.quadraticCurveTo(gx, gy, gx - r, gy)
    g.quadraticCurveTo(gx, gy, gx, gy - r)
    g.fill()
    g.restore()
  }
  // Daylight on the floor when the door stands open.
  if (e > 0.01) {
    g.beginPath()
    g.moveTo(d.x, HALL.floorY + 4)
    g.lineTo(d.x + d.w * (1 - k) + 10, HALL.floorY + 4)
    g.lineTo(d.x + d.w - 30, HALL.floorY + 150)
    g.lineTo(d.x - 150, HALL.floorY + 150)
    g.closePath()
    g.fillStyle = `rgba(255,246,215,${0.2 * e})`
    g.fill()
  }
}

export function drawCat(g: G, t: number, twitch: number, purr: number): void {
  const c = HALL.cat
  const breathe = 1 + Math.sin(t * 1.5) * 0.035 + purr * Math.sin(t * 30) * 0.008
  g.save()
  g.translate(c.x, c.y)
  // Tail, wrapped round the front.
  g.beginPath()
  g.moveTo(58, -6)
  g.quadraticCurveTo(70, 22, 10, 18 + Math.sin(t * 0.8) * 1.5)
  g.quadraticCurveTo(-18, 16, -30, 8 + twitch * 5)
  g.strokeStyle = '#b87a40'
  g.lineWidth = 15
  g.stroke()
  g.save()
  g.scale(1, breathe)
  blob(g, 8, -18, 62, 30, '#cf8f50', 4, 0.05, 11)
  g.strokeStyle = 'rgba(150,90,40,0.5)'
  g.lineWidth = 5
  g.beginPath()
  for (let i = 0; i < 4; i++) {
    g.moveTo(-2 + i * 17, -44 + Math.abs(i - 1.5) * 3)
    g.quadraticCurveTo(2 + i * 17, -34, -1 + i * 17, -26)
  }
  g.stroke()
  g.restore()
  // Head, tucked down.
  g.beginPath()
  g.arc(-44, -16, 25, 0, TAU)
  g.fillStyle = '#d4975a'
  g.fill()
  for (const side of [-1, 1]) {
    g.beginPath()
    const ex = -44 + side * 16
    const lift = side > 0 ? twitch * 7 : twitch * 3
    g.moveTo(ex - 10, -32)
    g.lineTo(ex + side * 3, -52 - lift)
    g.lineTo(ex + 10, -32)
    g.closePath()
    g.fillStyle = '#cf8f50'
    g.fill()
  }
  g.strokeStyle = '#6b4526'
  g.lineWidth = 2.6
  g.beginPath()
  g.arc(-54, -15, 5.5, 0.15 * Math.PI, 0.85 * Math.PI)
  g.moveTo(-28.5, -13)
  g.arc(-34, -15, 5.5, 0.15 * Math.PI, 0.85 * Math.PI)
  g.stroke()
  g.beginPath()
  g.ellipse(-44, -7, 3.4, 2.4, 0, 0, TAU)
  g.fillStyle = '#b0605a'
  g.fill()
  g.restore()
}

// ---------------------------------------------------------------- garden

export interface Puddle {
  x: number
  y: number
  rx: number
  ry: number
}

export const PUDDLES: readonly Puddle[] = [
  { x: 520, y: 706, rx: 104, ry: 31 },
  { x: 792, y: 652, rx: 84, ry: 23 },
  { x: 1024, y: 724, rx: 104, ry: 30 },
]
export const STREAM = { y: 592, x0: 268, x1: 1122 } as const
export const BED = { x0: 424, x1: 766, y: 646 } as const
export const POOL = { x: 968, y: 706, rx: 142, ry: 44 } as const
export const PILES: readonly { x: number; y: number }[] = [
  { x: 724, y: 712 },
  { x: 1012, y: 668 },
]

function house(g: G, rand: () => number, weather: Weather): void {
  // Plaster wall with a tiled eave.
  g.fillStyle = vgrad(g, 150, 650, '#f1e3c9', '#e4d0ae')
  g.fillRect(0, 150, 214, 500)
  for (let i = 0; i < 12; i++) blob(g, rand() * 200, 180 + rand() * 440, 50, 30, 'rgba(255,250,235,0.14)', i + 30, 0.2)
  g.fillStyle = 'rgba(120,85,45,0.16)'
  g.fillRect(206, 150, 8, 500)
  // Stone footing.
  rr(g, -10, 624, 226, 32, 6, '#b7aa98')
  // Doorway: the warm hall inside.
  g.beginPath()
  g.roundRect(54, 318, 144, 326, [70, 70, 0, 0])
  g.fillStyle = '#a27447'
  g.fill()
  g.beginPath()
  g.roundRect(65, 330, 122, 314, [60, 60, 0, 0])
  g.fillStyle = vgrad(g, 330, 644, '#7b563a', '#c39a6b')
  g.fill()
  g.beginPath()
  g.roundRect(65, 330, 122, 314, [60, 60, 0, 0])
  g.fillStyle = 'rgba(255,225,170,0.16)'
  g.fill()
  // The open door leaf, seen edge on.
  rr(g, 65, 384, 19, 260, 4, '#8fa58a')
  g.fillStyle = 'rgba(40,60,45,0.25)'
  g.fillRect(78, 386, 6, 258)
  // Step.
  blob(g, 128, 660, 116, 17, '#a99c8a', 14, 0.04, 12)
  blob(g, 126, 655, 110, 13, '#c5baa8', 15, 0.04, 12)
  // Eave.
  g.beginPath()
  g.moveTo(0, 96)
  g.lineTo(262, 150)
  g.lineTo(262, 176)
  g.lineTo(0, 158)
  g.closePath()
  g.fillStyle = weather === 'snow' ? '#f6f8f8' : '#b9694a'
  g.fill()
  if (weather !== 'snow') {
    g.strokeStyle = 'rgba(110,50,30,0.35)'
    g.lineWidth = 2.5
    for (let x = 14; x < 262; x += 22) {
      g.beginPath()
      g.moveTo(x, 100 + x * 0.2)
      g.lineTo(x + 3, 158 + x * 0.07)
      g.stroke()
    }
  }
  g.fillStyle = 'rgba(90,60,30,0.18)'
  g.fillRect(0, 168, 214, 9)
  // Downpipe.
  rr(g, 220, 170, 15, 410, 6, '#93a39b')
  g.fillStyle = 'rgba(255,255,255,0.25)'
  g.fillRect(223, 176, 3, 398)
  g.beginPath()
  g.moveTo(220, 574)
  g.quadraticCurveTo(222, 596, 252, 592)
  g.lineTo(252, 578)
  g.quadraticCurveTo(236, 580, 235, 566)
  g.closePath()
  g.fillStyle = '#93a39b'
  g.fill()
  // A lantern by the door.
  rr(g, 22, 400, 22, 32, 5, '#6f6253')
  rr(g, 26, 405, 14, 20, 3, '#f2d98c')
}

export function buildYard(weather: Weather, rand: () => number): HTMLCanvasElement {
  const [canvas, g] = makeCanvas(W, H)
  const s = SKY[weather]
  const hz = YARD.horizon
  g.fillStyle = vgrad(g, 0, hz, s.top, s.low)
  g.fillRect(0, 0, W, hz + 10)
  if (weather === 'sun') {
    blob(g, 880, 120, 96, 96, 'rgba(255,244,190,0.3)', 2, 0.03, 14)
    blob(g, 880, 120, 62, 62, 'rgba(255,240,170,0.45)', 3, 0.03, 14)
    blob(g, 880, 120, 42, 42, '#f7d976', 4, 0.03, 14)
  }
  if (weather === 'rain') {
    for (let i = 0; i < 9; i++) blob(g, rand() * W, 30 + rand() * 170, 150 + rand() * 120, 36 + rand() * 30, 'rgba(118,134,142,0.3)', i + 5, 0.14)
  }
  if (weather === 'snow') {
    for (let i = 0; i < 6; i++) blob(g, rand() * W, 40 + rand() * 180, 190, 44, 'rgba(255,255,255,0.3)', i + 5, 0.14)
  }
  // Far hills.
  blob(g, 420, hz + 40, 520, 150, weather === 'snow' ? '#dfe7ec' : s.hill, 6, 0.05, 12)
  blob(g, 1010, hz + 50, 420, 120, weather === 'snow' ? '#ecf1f3' : s.groundLow, 7, 0.05, 12)
  blob(g, 1010, hz + 50, 420, 120, 'rgba(255,255,255,0.22)', 7, 0.05, 12)

  // The tree.
  const tx = 1046
  g.strokeStyle = '#7a5a3e'
  g.lineWidth = 30
  g.beginPath()
  g.moveTo(tx, hz + 30)
  g.quadraticCurveTo(tx - 8, 420, tx + 4, 330)
  g.stroke()
  g.lineWidth = 13
  g.beginPath()
  g.moveTo(tx + 2, 380)
  g.quadraticCurveTo(tx - 40, 330, tx - 78, 286)
  g.moveTo(tx + 2, 360)
  g.quadraticCurveTo(tx + 44, 318, tx + 76, 262)
  g.moveTo(tx + 4, 340)
  g.quadraticCurveTo(tx + 6, 280, tx - 6, 214)
  g.stroke()
  if (weather === 'snow') {
    blob(g, tx - 62, 282, 42, 11, '#ffffff', 2, 0.1)
    blob(g, tx + 60, 262, 44, 11, '#ffffff', 3, 0.1)
    blob(g, tx - 6, 212, 28, 10, '#ffffff', 4, 0.1)
  } else if (weather === 'wind') {
    for (let i = 0; i < 44; i++) {
      const a = rand() * TAU
      const r = Math.sqrt(rand())
      leaf(g, tx + 8 + Math.cos(a) * 128 * r, 280 + Math.sin(a) * 96 * r, 26, rand() * TAU, ['#cf7f3a', '#b9573a', '#dba445', '#c9692f'][i % 4]!)
    }
  } else {
    blob(g, tx, 276, 150, 118, s.crown, 9, 0.08, 12)
    blob(g, tx - 44, 240, 76, 56, 'rgba(255,255,255,0.13)', 10, 0.1)
    blob(g, tx + 40, 320, 84, 52, 'rgba(30,60,30,0.12)', 11, 0.1)
  }

  // Ground.
  g.fillStyle = vgrad(g, hz, H, s.ground, s.groundLow)
  g.beginPath()
  g.moveTo(0, hz + 8)
  for (let x = 0; x <= W + 80; x += 80) g.lineTo(x, hz + Math.sin(x * 0.011 + 1) * 6)
  g.lineTo(W + 80, H)
  g.lineTo(0, H)
  g.closePath()
  g.fill()

  // Fence.
  for (let x = 236; x < W + 20; x += 46) {
    const top = 446 + (rand() - 0.5) * 8
    g.beginPath()
    g.moveTo(x - 13, hz + 14)
    g.lineTo(x - 13, top + 12)
    g.lineTo(x, top)
    g.lineTo(x + 13, top + 12)
    g.lineTo(x + 13, hz + 14)
    g.closePath()
    g.fillStyle = weather === 'snow' ? '#c9b79c' : '#d6c2a0'
    g.fill()
    g.strokeStyle = 'rgba(110,80,45,0.3)'
    g.lineWidth = 2
    g.stroke()
    if (weather === 'snow') blob(g, x, top + 3, 15, 7, '#ffffff', x, 0.15)
  }
  g.fillStyle = 'rgba(110,80,45,0.3)'
  g.fillRect(214, 478, W, 8)

  if (weather === 'rain') {
    // A flagstone path, dark with wet.
    for (let i = 0; i < 15; i++) {
      const px = 250 + i * 64 + (rand() - 0.5) * 20
      const py = 688 + Math.sin(i * 0.9) * 22 + (rand() - 0.5) * 12
      blob(g, px, py, 40 + rand() * 12, 15 + rand() * 5, 'rgba(150,150,140,0.55)', i + 40, 0.12)
    }
    // The gutter that runs along the fence to a little pond.
    g.strokeStyle = '#8a8f86'
    g.lineWidth = 38
    g.beginPath()
    g.moveTo(STREAM.x0 - 16, STREAM.y)
    g.lineTo(STREAM.x1, STREAM.y)
    g.stroke()
    blob(g, STREAM.x1 + 6, STREAM.y + 2, 70, 27, '#8a8f86', 51, 0.06)
    g.strokeStyle = '#a9c2c8'
    g.lineWidth = 25
    g.beginPath()
    g.moveTo(STREAM.x0 - 10, STREAM.y)
    g.lineTo(STREAM.x1, STREAM.y)
    g.stroke()
    blob(g, STREAM.x1 + 6, STREAM.y + 2, 60, 20, '#a9c2c8', 52, 0.06)
    for (const p of PUDDLES) {
      blob(g, p.x, p.y + 3, p.rx + 7, p.ry + 5, 'rgba(70,90,70,0.35)', p.x, 0.08, 12)
      blob(g, p.x, p.y, p.rx, p.ry, '#a9c2c8', p.x, 0.08, 12)
      blob(g, p.x - p.rx * 0.25, p.y - p.ry * 0.25, p.rx * 0.5, p.ry * 0.36, 'rgba(225,236,238,0.5)', p.x + 1, 0.1)
    }
  } else if (weather === 'snow') {
    for (let i = 0; i < 14; i++) blob(g, 240 + rand() * 940, 590 + rand() * 220, 120 + rand() * 90, 16 + rand() * 12, 'rgba(180,200,220,0.2)', i + 60, 0.1)
    blob(g, 110, 652, 150, 22, '#ffffff', 61, 0.08)
  } else if (weather === 'wind') {
    g.lineWidth = 3
    for (let i = 0; i < 90; i++) {
      const px = 230 + rand() * 950
      const py = 560 + rand() * 250
      g.strokeStyle = rand() < 0.5 ? 'rgba(150,115,45,0.5)' : 'rgba(230,205,130,0.6)'
      g.beginPath()
      g.moveTo(px, py)
      g.quadraticCurveTo(px + 6, py - 12, px + 18, py - 16)
      g.stroke()
    }
    for (let i = 0; i < 46; i++) leaf(g, 230 + rand() * 950, 560 + rand() * 250, 18, rand() * TAU, ['#cf7f3a', '#b9573a', '#dba445'][i % 3]!)
  } else {
    g.lineWidth = 3
    for (let i = 0; i < 80; i++) {
      const px = 230 + rand() * 950
      const py = 560 + rand() * 250
      g.strokeStyle = rand() < 0.5 ? 'rgba(90,150,70,0.5)' : 'rgba(190,225,140,0.6)'
      g.beginPath()
      g.moveTo(px, py)
      g.lineTo(px + 2, py - 12)
      g.stroke()
    }
    for (let i = 0; i < 26; i++) {
      const px = 230 + rand() * 950
      const py = 560 + rand() * 250
      blob(g, px, py, 5, 4, '#fffdf2', i, 0.2)
      blob(g, px, py, 2, 1.6, '#e9bf4f', i, 0.2)
    }
    // The flower bed: dug earth edged with stones.
    blob(g, (BED.x0 + BED.x1) / 2, BED.y + 4, (BED.x1 - BED.x0) / 2 + 26, 27, '#6b4a33', 70, 0.05, 14)
    blob(g, (BED.x0 + BED.x1) / 2, BED.y, (BED.x1 - BED.x0) / 2 + 20, 21, '#84603f', 71, 0.05, 14)
    for (let i = 0; i < 11; i++) blob(g, BED.x0 - 12 + i * 37, BED.y + 23 + Math.sin(i) * 2, 13, 8, '#c5baa8', i + 72, 0.15)
  }

  house(g, rand, weather)
  grain(g, 0, 0, W, H, rand, 4600, 0.045)
  return canvas
}

// Things that fall or blow across the garden, drawn from the clock alone.
export function drawWeatherFar(g: G, weather: Weather, t: number): void {
  if (weather === 'rain') {
    g.strokeStyle = 'rgba(232,242,244,0.5)'
    g.lineWidth = 2.6
    g.beginPath()
    for (let i = 0; i < 54; i++) {
      const px = hash(i * 1.7) * (W + 60)
      const py = ((t * (520 + hash(i * 2.9) * 220) + hash(i * 4.3) * H) % (H + 60)) - 40
      g.moveTo(px, py)
      g.lineTo(px - 8, py + 30)
    }
    g.stroke()
    // The gutter runs.
    g.strokeStyle = 'rgba(235,245,246,0.7)'
    g.lineWidth = 3
    g.beginPath()
    for (let i = 0; i < 14; i++) {
      const px = STREAM.x0 + ((t * 46 + i * 63) % (STREAM.x1 - STREAM.x0))
      const py = STREAM.y - 6 + (i % 3) * 6
      g.moveTo(px, py)
      g.lineTo(px + 18, py)
    }
    g.stroke()
    // Water falling from the downpipe.
    g.strokeStyle = 'rgba(215,232,236,0.8)'
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(252, 586)
    g.quadraticCurveTo(262 + Math.sin(t * 9) * 1.5, 588, 266, STREAM.y)
    g.stroke()
  } else if (weather === 'snow') {
    g.fillStyle = '#ffffff'
    for (let i = 0; i < 60; i++) {
      const px = hash(i * 1.7) * W + Math.sin(t * 0.8 + i) * 16
      const py = ((t * (34 + hash(i * 2.9) * 36) + hash(i * 4.3) * H) % (H + 20)) - 10
      g.beginPath()
      g.arc(px, py, 2.6 + hash(i * 7.7) * 4, 0, TAU)
      g.fill()
    }
  } else if (weather === 'wind') {
    for (let i = 0; i < 3; i++) {
      const cx = -160 + ((t * 30 * (0.7 + i * 0.3) + i * 480) % (W + 320))
      blob(g, cx, 70 + i * 70, 110, 26, 'rgba(255,255,255,0.55)', i + 3, 0.12)
    }
    for (let i = 0; i < 16; i++) {
      const px = -30 + ((t * (190 + hash(i * 2.9) * 150) + hash(i * 4.3) * W) % (W + 60))
      const py = 120 + hash(i * 1.7) * 620 + Math.sin(t * 2.6 + i * 2) * 26
      leaf(g, px, py, 20, t * 5 + i, ['#cf7f3a', '#b9573a', '#dba445'][i % 3]!)
    }
  } else {
    for (let i = 0; i < 2; i++) {
      const cx = -160 + ((t * 7 * (0.7 + i * 0.4) + 300 + i * 560) % (W + 320))
      blob(g, cx, 90 + i * 80, 120, 28, 'rgba(255,255,255,0.7)', i + 3, 0.12)
    }
  }
}

export function inPuddle(x: number, y: number): Puddle | null {
  for (const p of PUDDLES) {
    const dx = (x - p.x) / (p.rx + 14)
    const dy = (y - p.y) / (p.ry + 18)
    if (dx * dx + dy * dy <= 1) return p
  }
  return null
}

export function inPool(x: number, y: number, pad = 0): boolean {
  const dx = (x - POOL.x) / (POOL.rx + pad)
  const dy = (y - POOL.y) / (POOL.ry + pad)
  return dx * dx + dy * dy <= 1
}

export function drawPoolBack(g: G, t: number): void {
  blob(g, POOL.x, POOL.y + 12, POOL.rx + 16, POOL.ry + 14, 'rgba(40,80,40,0.2)', 80, 0.03, 14)
  g.beginPath()
  g.ellipse(POOL.x, POOL.y, POOL.rx + 12, POOL.ry + 12, 0, 0, TAU)
  g.fillStyle = '#e9dcc3'
  g.fill()
  g.beginPath()
  g.ellipse(POOL.x, POOL.y + 2, POOL.rx, POOL.ry, 0, 0, TAU)
  g.fillStyle = '#9ccadb'
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.lineWidth = 3
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    const px = POOL.x - 70 + i * 62 + Math.sin(t * 0.9 + i) * 8
    const py = POOL.y - 12 + i * 12
    g.moveTo(px, py)
    g.quadraticCurveTo(px + 16, py - 5, px + 34, py)
  }
  g.stroke()
}

// The near wall of the pool, drawn over anyone standing in it.
export function drawPoolFront(g: G): void {
  g.beginPath()
  g.ellipse(POOL.x, POOL.y + 2, POOL.rx + 12, POOL.ry + 12, 0, 0.04 * Math.PI, 0.96 * Math.PI)
  g.ellipse(POOL.x, POOL.y + 2, POOL.rx, POOL.ry, 0, 0.96 * Math.PI, 0.04 * Math.PI, true)
  g.closePath()
  g.fillStyle = '#e9dcc3'
  g.fill()
  g.beginPath()
  g.ellipse(POOL.x, POOL.y + 26, POOL.rx + 12, POOL.ry + 6, 0, 0.1 * Math.PI, 0.9 * Math.PI)
  g.ellipse(POOL.x, POOL.y + 2, POOL.rx + 12, POOL.ry + 12, 0, 0.9 * Math.PI, 0.1 * Math.PI, true)
  g.closePath()
  g.fillStyle = '#6d909c'
  g.fill()
  g.strokeStyle = '#e9dcc3'
  g.lineWidth = 5
  for (let i = -3; i <= 3; i++) {
    const a = Math.PI / 2 + i * 0.36
    const x = POOL.x + Math.cos(a) * (POOL.rx + 12)
    const y = POOL.y + 2 + Math.sin(a) * (POOL.ry + 12)
    g.beginPath()
    g.moveTo(x, y + 2)
    g.lineTo(x, y + 20 - Math.abs(i) * 2)
    g.stroke()
  }
}

