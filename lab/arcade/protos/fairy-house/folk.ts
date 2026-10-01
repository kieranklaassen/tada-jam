// How the small folk look: a felt bell of a body, a wooden-bead head, a soft
// pointed hat. Two eyes and a small mouth, calm. Drawn with their feet at the
// origin so they can stand, sit, lie down and climb.

import { TAU } from '../../kit/math.ts'

type G = CanvasRenderingContext2D

export interface Look {
  hat: string
  hatShade: string
  body: string
  bodyShade: string
  beard: boolean
  // An acorn cap instead of a pointed hat.
  cap: boolean
}

export const LOOKS: readonly Look[] = [
  { hat: '#c9553c', hatShade: '#a23f2c', body: '#6b7fa8', bodyShade: '#526590', beard: true, cap: false },
  { hat: '#e2ac42', hatShade: '#bd8a2c', body: '#7f9c56', bodyShade: '#64803f', beard: false, cap: false },
  { hat: '#9a6f43', hatShade: '#74502e', body: '#c9708a', bodyShade: '#a85670', beard: false, cap: true },
]

export interface Pose {
  // Radians: 0 is standing.
  rot: number
  // 1 is round; above is tall and thin.
  stretch: number
  // 0 open, 1 shut.
  eyes: number
  // 0 standing, 1 sitting.
  sit: number
  // Each hand's offset from where it hangs.
  lx: number
  ly: number
  rx: number
  ry: number
  // The tip of the hat, -1..1.
  hat: number
  // Where the eyes point, -1..1.
  look: number
  // Feet phase while walking.
  step: number
  size: number
}

export function drawFolk(g: G, look: Look, x: number, y: number, p: Pose): void {
  g.save()
  g.translate(x, y)
  if (p.rot) g.rotate(p.rot)
  const s = Math.max(0.3, p.stretch)
  g.scale(p.size / Math.sqrt(s), p.size * s)

  const bh = 44 - p.sit * 9
  // Feet.
  g.fillStyle = '#4a3426'
  const sw = Math.sin(p.step) * 5 * (1 - p.sit)
  g.beginPath()
  g.ellipse(-9 + sw, -1 + p.sit * 2, 8, 4.6, 0, 0, TAU)
  g.ellipse(9 - sw, -1 + p.sit * 2, 8, 4.6, 0, 0, TAU)
  g.fill()

  // Body: a felt bell.
  g.beginPath()
  g.moveTo(-21, -3)
  g.bezierCurveTo(-26, -bh * 0.5, -15, -bh, 0, -bh - 2)
  g.bezierCurveTo(15, -bh, 26, -bh * 0.5, 21, -3)
  g.quadraticCurveTo(0, 4, -21, -3)
  g.closePath()
  g.fillStyle = look.body
  g.fill()
  g.beginPath()
  g.moveTo(4, -bh - 1)
  g.bezierCurveTo(16, -bh, 26, -bh * 0.5, 21, -3)
  g.quadraticCurveTo(12, 1, 6, 1)
  g.bezierCurveTo(14, -bh * 0.4, 12, -bh * 0.8, 4, -bh - 1)
  g.fillStyle = look.bodyShade
  g.fill()

  // Hands.
  const handY = -bh * 0.52
  g.fillStyle = '#f1cfa8'
  g.beginPath()
  g.arc(-21 + p.lx, handY + p.ly, 5.6, 0, TAU)
  g.arc(21 + p.rx, handY + p.ry, 5.6, 0, TAU)
  g.fill()

  // Head.
  const hy = -bh - 12
  g.beginPath()
  g.arc(0, hy, 15, 0, TAU)
  g.fillStyle = '#f3d3ad'
  g.fill()
  g.fillStyle = 'rgba(226,128,110,0.32)'
  g.beginPath()
  g.arc(-8.5 + p.look, hy + 4, 3.8, 0, TAU)
  g.arc(8.5 + p.look, hy + 4, 3.8, 0, TAU)
  g.fill()
  if (look.beard) {
    g.beginPath()
    g.moveTo(-14, hy + 2)
    g.bezierCurveTo(-15, hy + 22, -5, hy + 28, 0, hy + 29)
    g.bezierCurveTo(5, hy + 28, 15, hy + 22, 14, hy + 2)
    g.quadraticCurveTo(0, hy + 12, -14, hy + 2)
    g.fillStyle = '#f6f1e6'
    g.fill()
  }
  // Eyes and mouth.
  g.strokeStyle = '#3a2a22'
  g.fillStyle = '#3a2a22'
  g.lineWidth = 1.6
  g.lineCap = 'round'
  const ex = p.look * 1.8
  if (p.eyes > 0.5) {
    g.beginPath()
    g.arc(-5.6 + ex, hy - 2.2, 2.6, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
    g.beginPath()
    g.arc(5.6 + ex, hy - 2.2, 2.6, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
  } else {
    g.beginPath()
    g.arc(-5.6 + ex, hy - 1, 2, 0, TAU)
    g.arc(5.6 + ex, hy - 1, 2, 0, TAU)
    g.fill()
  }
  if (!look.beard) {
    g.beginPath()
    g.arc(ex, hy + 4.4, 3.2, 0.2 * Math.PI, 0.8 * Math.PI)
    g.stroke()
  }

  // Hat.
  const base = hy - 8
  if (look.cap) {
    g.beginPath()
    g.moveTo(-18, base + 3)
    g.bezierCurveTo(-18, base - 20, 18, base - 20, 18, base + 3)
    g.quadraticCurveTo(0, base + 9, -18, base + 3)
    g.closePath()
    g.fillStyle = look.hat
    g.fill()
    g.strokeStyle = look.hatShade
    g.lineWidth = 1.2
    for (let row = 0; row < 3; row++) {
      for (let cx = -12 + (row % 2) * 4; cx <= 12; cx += 8) {
        g.beginPath()
        g.arc(cx, base - 10 + row * 5.5, 3.8, 0.1 * Math.PI, 0.9 * Math.PI)
        g.stroke()
      }
    }
    g.beginPath()
    g.moveTo(0, base - 14)
    g.quadraticCurveTo(p.hat * 4, base - 20, 2 + p.hat * 7, base - 24)
    g.strokeStyle = look.hatShade
    g.lineWidth = 3.2
    g.stroke()
  } else {
    const tip = p.hat * 16
    g.beginPath()
    g.moveTo(-18, base + 3)
    g.quadraticCurveTo(0, base + 10, 18, base + 3)
    g.bezierCurveTo(12, base - 16, 6 + tip * 0.4, base - 34, tip, base - 46)
    g.bezierCurveTo(-5 + tip * 0.3, base - 30, -13, base - 14, -18, base + 3)
    g.closePath()
    g.fillStyle = look.hat
    g.fill()
    g.beginPath()
    g.moveTo(4, base + 7)
    g.quadraticCurveTo(12, base + 6, 18, base + 3)
    g.bezierCurveTo(12, base - 16, 6 + tip * 0.4, base - 34, tip, base - 46)
    g.bezierCurveTo(5 + tip * 0.3, base - 28, 7, base - 10, 4, base + 7)
    g.fillStyle = look.hatShade
    g.fill()
  }
  g.restore()
}

// A small lantern, hanging from (x, y).
export function drawLantern(g: G, x: number, y: number, lit: number): void {
  g.strokeStyle = '#4a3426'
  g.lineWidth = 1.6
  g.beginPath()
  g.arc(x, y + 5, 5, Math.PI, TAU)
  g.stroke()
  g.fillStyle = '#4a3426'
  g.fillRect(x - 6, y + 4, 12, 3)
  g.fillRect(x - 6, y + 20, 12, 3)
  g.beginPath()
  g.roundRect(x - 5, y + 7, 10, 13, 2)
  g.fillStyle = lit > 0.5 ? '#ffe9a6' : '#b9a67a'
  g.fill()
  if (lit > 0.5) {
    g.beginPath()
    g.ellipse(x, y + 14.5, 2.2, 3.6, 0, 0, TAU)
    g.fillStyle = '#fffbe6'
    g.fill()
  }
}
