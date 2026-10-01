// The things that move: jars, the brush, the sponge, a clothes peg.

import type { JarSpec } from './room.ts'

type G = CanvasRenderingContext2D
const TAU = Math.PI * 2

const rgb = (c: readonly number[], a = 1): string => `rgba(${c[0]! | 0},${c[1]! | 0},${c[2]! | 0},${a})`
const shade = (c: readonly number[], k: number): [number, number, number] => [c[0]! * k, c[1]! * k, c[2]! * k]

// How far down from the rim the liquid stands.
export const LIQUID_DROP = 15

function bodyPath(g: G, jar: JarSpec, top: number, inset: number): void {
  const { x, y, rx, ry, h } = jar
  const rb = rx * 0.9
  const t = top / h
  const rt = rx + (rb - rx) * t - inset
  const yt = y + top
  g.beginPath()
  g.moveTo(x - rt, yt)
  g.lineTo(x - rb + inset, y + h)
  g.ellipse(x, y + h, rb - inset, ry * 0.9 - inset * 0.3, 0, Math.PI, 0, true)
  g.lineTo(x + rt, yt)
  g.ellipse(x, yt, rt, ry * (rt / rx), 0, 0, Math.PI, true)
  g.closePath()
}

export interface JarLook {
  // Colour of the liquid seen through the glass.
  liquid: readonly number[]
  // 0..1, a ring spreading on the surface after a dip; 1 is calm.
  ripple: number
  // 0..1, how far a slow highlight has slid across the glass.
  glint: number
  // Seconds, for the slow life of the surface.
  time: number
}

// The back of the jar and its liquid. The brush is drawn after this and
// before `drawJarFront` so its hairs go into the water.
export function drawJarBack(g: G, jar: JarSpec, look: JarLook): void {
  const { x, y, rx, ry } = jar
  bodyPath(g, jar, 0, 0)
  g.fillStyle = 'rgba(236,244,242,0.42)'
  g.fill()
  bodyPath(g, jar, LIQUID_DROP, 3)
  const grad = g.createLinearGradient(x - rx, 0, x + rx, 0)
  grad.addColorStop(0, rgb(shade(look.liquid, 1.02)))
  grad.addColorStop(0.45, rgb(look.liquid))
  grad.addColorStop(1, rgb(shade(look.liquid, 0.78)))
  g.fillStyle = grad
  g.fill()
  // The surface, lighter where the sky is in it.
  const ys = y + LIQUID_DROP
  const rs = rx * 0.97 - 3
  const rys = ry * 0.9
  g.beginPath()
  g.ellipse(x, ys, rs, rys, 0, 0, TAU)
  g.fillStyle = rgb([look.liquid[0]! * 0.82 + 46, look.liquid[1]! * 0.82 + 46, look.liquid[2]! * 0.82 + 44])
  g.fill()
  const sway = Math.sin(look.time * 0.7 + x) * 4
  g.beginPath()
  g.ellipse(x - rs * 0.3 + sway, ys - rys * 0.25, rs * 0.34, rys * 0.3, -0.1, 0, TAU)
  g.fillStyle = 'rgba(255,255,255,0.3)'
  g.fill()
  if (look.ripple < 1) {
    for (let k = 0; k < 2; k++) {
      const t = look.ripple - k * 0.28
      if (t <= 0) continue
      g.beginPath()
      g.ellipse(x, ys, rs * (0.15 + 0.8 * t), rys * (0.15 + 0.8 * t), 0, 0, TAU)
      g.strokeStyle = `rgba(255,255,255,${0.55 * (1 - t)})`
      g.lineWidth = 2
      g.stroke()
    }
  }
}

export function drawJarFront(g: G, jar: JarSpec, look: JarLook): void {
  const { x, y, rx, ry, h } = jar
  // Glass: a pale edge both sides, a long highlight, the rim.
  bodyPath(g, jar, 0, 0)
  g.strokeStyle = 'rgba(120,150,160,0.5)'
  g.lineWidth = 2.2
  g.stroke()
  g.beginPath()
  g.moveTo(x - rx * 0.68, y + 18)
  g.quadraticCurveTo(x - rx * 0.76, y + h * 0.55, x - rx * 0.62, y + h - 8)
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.lineWidth = 6
  g.stroke()
  g.beginPath()
  g.moveTo(x + rx * 0.7, y + 24)
  g.lineTo(x + rx * 0.66, y + h * 0.6)
  g.strokeStyle = 'rgba(255,255,255,0.22)'
  g.lineWidth = 3
  g.stroke()
  if (look.glint > 0 && look.glint < 1) {
    const gx = x - rx * 0.8 + look.glint * rx * 1.6
    const a = Math.sin(look.glint * Math.PI) * 0.5
    g.beginPath()
    g.moveTo(gx + 5, y + 16)
    g.lineTo(gx - 5, y + h - 10)
    g.strokeStyle = `rgba(255,255,255,${a})`
    g.lineWidth = 9
    g.stroke()
  }
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, TAU)
  g.strokeStyle = 'rgba(250,253,252,0.9)'
  g.lineWidth = 4.5
  g.stroke()
  g.beginPath()
  g.ellipse(x, y, rx + 2, ry + 1.5, 0, 0.15, Math.PI - 0.15)
  g.strokeStyle = 'rgba(110,140,150,0.45)'
  g.lineWidth = 1.6
  g.stroke()
}

// Clips to the inside of the jar's liquid, for clouds of rinsed-off colour.
export function clipLiquid(g: G, jar: JarSpec): void {
  bodyPath(g, jar, LIQUID_DROP, 3)
  g.clip()
}

export interface BrushLook {
  // Tip of the hairs.
  x: number
  y: number
  // 0 stands upright with the handle up; positive leans the handle right.
  angle: number
  // 0 in the air, 1 pressed on the paper (the hairs splay).
  press: number
  // Height above the table, for the shadow.
  lift: number
  tip: readonly number[]
  // 0..1, how much of the hair is stained.
  stain: number
  // Per-hair unevenness, the same one the paint uses.
  bristles: Float32Array
}

const HAIR = [218, 196, 156]

function brushShape(g: G, press: number): void {
  const half = 21 + press * 6
  const len = 44 - press * 9
  // Hairs.
  g.beginPath()
  g.moveTo(-half, -2)
  g.quadraticCurveTo(-half * 0.5, 3, 0, 1)
  g.quadraticCurveTo(half * 0.5, -1, half, -3)
  g.lineTo(18, -len)
  g.lineTo(-18, -len)
  g.closePath()
}

export function drawBrush(g: G, b: BrushLook): void {
  const len = 44 - b.press * 9
  // Shadow first: further from the brush the higher it is held.
  g.save()
  g.translate(b.x + b.lift * 0.5, b.y + b.lift)
  g.rotate(b.angle)
  g.globalAlpha = 0.16
  g.fillStyle = '#3a2410'
  brushShape(g, b.press)
  g.fill()
  g.beginPath()
  g.roundRect(-13, -len - 142, 26, 144, 12)
  g.fill()
  g.restore()

  g.save()
  g.translate(b.x, b.y)
  g.rotate(b.angle)
  g.globalAlpha = 1
  // Handle: tapering honey-coloured wood with a worn end.
  g.beginPath()
  g.moveTo(-12, -len - 22)
  g.quadraticCurveTo(-15, -len - 62, -7, -len - 134)
  g.quadraticCurveTo(0, -len - 146, 7, -len - 134)
  g.quadraticCurveTo(15, -len - 62, 12, -len - 22)
  g.closePath()
  g.fillStyle = '#c98b4a'
  g.fill()
  g.strokeStyle = 'rgba(110,66,28,0.55)'
  g.lineWidth = 1.6
  g.stroke()
  g.beginPath()
  g.moveTo(-6, -len - 32)
  g.quadraticCurveTo(-8, -len - 80, -3, -len - 126)
  g.strokeStyle = 'rgba(255,232,190,0.55)'
  g.lineWidth = 4
  g.stroke()
  // Ferrule: dull tin, two crimps.
  g.beginPath()
  g.roundRect(-19, -len - 26, 38, 28, 4)
  g.fillStyle = '#b8b2a4'
  g.fill()
  g.strokeStyle = 'rgba(90,84,74,0.55)'
  g.lineWidth = 1.6
  g.stroke()
  g.fillStyle = 'rgba(255,255,255,0.45)'
  g.fillRect(-14, -len - 24, 6, 24)
  g.strokeStyle = 'rgba(90,84,74,0.4)'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(-18, -len - 17)
  g.lineTo(18, -len - 17)
  g.moveTo(-18, -len - 9)
  g.lineTo(18, -len - 9)
  g.stroke()
  // Hairs, stained from the tip up.
  brushShape(g, b.press)
  g.fillStyle = rgb(HAIR)
  g.fill()
  if (b.stain > 0.01) {
    const grad = g.createLinearGradient(0, 2, 0, -len)
    grad.addColorStop(0, rgb(b.tip, Math.min(1, 0.5 + b.stain)))
    grad.addColorStop(0.55, rgb(b.tip, Math.min(1, b.stain)))
    grad.addColorStop(1, rgb(b.tip, 0))
    g.fillStyle = grad
    g.fill()
  }
  g.strokeStyle = 'rgba(90,60,30,0.22)'
  g.lineWidth = 1.1
  const half = 21 + b.press * 6
  for (let i = 0; i < 7; i++) {
    const t = (i + 0.5) / 7
    const k = b.bristles[i % b.bristles.length]!
    g.beginPath()
    g.moveTo(-half + t * half * 2, -1 - (1 - k) * 8)
    g.lineTo(-17 + t * 34, -len + 2)
    g.stroke()
  }
  g.restore()
}

export interface SpongeLook {
  x: number
  y: number
  press: number
  lift: number
  stain: readonly number[]
  stainAlpha: number
  turn: number
}

const SPONGE_RADII = [1, 0.93, 1.05, 0.9, 0.98, 1.08, 0.92, 1.02, 0.9, 1.04, 0.95, 1.06]
const SPONGE_PORES: readonly (readonly [number, number, number])[] = [
  [-22, -10, 6],
  [-4, -16, 4],
  [14, -12, 7],
  [26, 2, 4],
  [6, 2, 5],
  [-14, 6, 5],
  [-28, 8, 3.4],
  [18, 14, 4.4],
  [-2, 16, 3.6],
  [-18, 18, 3],
  [30, -8, 3],
]

function spongePath(g: G, rx: number, ry: number): void {
  const n = SPONGE_RADII.length
  const pt = (i: number): [number, number] => {
    const a = (i / n) * TAU
    const r = SPONGE_RADII[((i % n) + n) % n]!
    return [Math.cos(a) * rx * r, Math.sin(a) * ry * r]
  }
  g.beginPath()
  const [sx, sy] = pt(0)
  const [lx, ly] = pt(n - 1)
  g.moveTo((sx + lx) / 2, (sy + ly) / 2)
  for (let i = 0; i < n; i++) {
    const [px, py] = pt(i)
    const [qx, qy] = pt(i + 1)
    g.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2)
  }
  g.closePath()
}

export function drawSponge(g: G, s: SpongeLook): void {
  const rx = 46 * (1 + s.press * 0.08)
  const ry = 33 * (1 - s.press * 0.14)
  g.save()
  g.translate(s.x + s.lift * 0.5, s.y + 5 + s.lift)
  g.rotate(s.turn)
  spongePath(g, rx, ry)
  g.fillStyle = 'rgba(58,36,16,0.2)'
  g.fill()
  g.restore()
  g.save()
  g.translate(s.x, s.y)
  g.rotate(s.turn)
  spongePath(g, rx, ry)
  g.fillStyle = '#e6c57c'
  g.fill()
  if (s.stainAlpha > 0.01) {
    g.fillStyle = rgb(s.stain, s.stainAlpha)
    g.fill()
  }
  g.strokeStyle = 'rgba(150,110,50,0.5)'
  g.lineWidth = 2
  g.stroke()
  g.beginPath()
  g.ellipse(-8, -10, rx * 0.62, ry * 0.42, -0.1, 0, TAU)
  g.fillStyle = 'rgba(255,240,190,0.3)'
  g.fill()
  g.fillStyle = 'rgba(140,96,40,0.42)'
  for (const [px, py, pr] of SPONGE_PORES) {
    g.beginPath()
    g.ellipse(px, py * (ry / 33), pr, pr * 0.8, 0.3, 0, TAU)
    g.fill()
  }
  g.restore()
}

// A wooden clothes peg, drawn hanging down from (x, y) on the line.
export function drawPeg(g: G, x: number, y: number, tilt: number, grip: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(tilt)
  const open = (1 - grip) * 2.5
  g.fillStyle = '#dcb47a'
  g.strokeStyle = 'rgba(120,80,40,0.6)'
  g.lineWidth = 1.2
  for (const side of [-1, 1]) {
    g.beginPath()
    g.roundRect(side === -1 ? -6 - open : 0.5 + open, -12, 5.5, 34, 2)
    g.fill()
    g.stroke()
  }
  g.strokeStyle = '#8b8a86'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(-7 - open, 2)
  g.lineTo(7 + open, 2)
  g.stroke()
  g.restore()
}
