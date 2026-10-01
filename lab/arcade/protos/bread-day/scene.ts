// The farmhouse kitchen that never changes (wall, peg rail, the oven's
// masonry, the table), plus the things on the table that are painted once and
// then moved about as sprites. Everything is drawn by hand with canvas in a
// small warm palette: plaster, beech, oak, stoneware, linen, one cool blue.

import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

// The far edge of the table top. Above it is wall, below it is table.
export const TABLE_Y = 340

// Where things stand. Crock and jug are given by the centre of their base.
export const CROCK = { x: 118, y: 520 }
export const JUG = { x: 116, y: 728 }
// The mixing bowl's opening (an ellipse seen from above and in front).
export const BOWL = { x: 385, y: 590, rx: 150, ry: 90 }
// The floor of the bowl, where flour, water and dough lie.
export const FLOOR = { x: 385, y: 604, rx: 108, ry: 56 }
export const SALT = { x: 262, y: 432 }
export const SEEDS = { x: 648, y: 408 }
// The kneading board, which is also the peel that goes into the oven.
export const BOARD = { x: 812, y: 592, w: 516, h: 262, handle: 92 }
export const OVEN = { x: 1000, left: 836, right: 1164, mouthL: 872, mouthR: 1128, mouthTop: 114, mouthBottom: 274, inX: 992, inY: 213, inScale: 0.41 }
export const PEG = { x: 772, y: 96 }
export const WINDOW = { x: 50, y: 34, w: 222, h: 196 }

export type RGB = readonly [number, number, number]

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function css(c: RGB, alpha = 1): string {
  return alpha >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`
}

// A small repeatable generator for textures, so the kitchen is the same
// kitchen every time.
export function rng(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export interface Sprite {
  canvas: HTMLCanvasElement
  // Where the sprite's own origin sits inside its canvas, in logical pixels.
  ox: number
  oy: number
  w: number
  h: number
}

// Paint something once at 2x. `paint` draws around (0, 0); the origin is put
// `ox`, `oy` in from the canvas corner.
export function makeSprite(w: number, h: number, ox: number, oy: number, paint: (g: CanvasRenderingContext2D) => void): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * 2)
  canvas.height = Math.ceil(h * 2)
  const g = canvas.getContext('2d')
  if (g) {
    g.scale(2, 2)
    g.translate(ox, oy)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    paint(g)
  }
  return { canvas, ox, oy, w, h }
}

export function drawSprite(g: CanvasRenderingContext2D, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = sx): void {
  if (rot === 0 && sx === 1 && sy === 1) {
    g.drawImage(s.canvas, x - s.ox, y - s.oy, s.w, s.h)
    return
  }
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale(sx, sy)
  g.drawImage(s.canvas, -s.ox, -s.oy, s.w, s.h)
  g.restore()
}

// The mouth of the oven: straight sides and a low arch.
export function mouthPath(g: CanvasRenderingContext2D, grow = 0): void {
  const l = OVEN.mouthL - grow
  const r = OVEN.mouthR + grow
  const top = OVEN.mouthTop - grow
  g.beginPath()
  g.moveTo(l, OVEN.mouthBottom)
  g.lineTo(l, top + 52)
  g.bezierCurveTo(l, top - 6, r, top - 6, r, top + 52)
  g.lineTo(r, OVEN.mouthBottom)
  g.closePath()
}

function speckle(g: CanvasRenderingContext2D, rand: () => number, x: number, y: number, w: number, h: number, count: number, color: string, size = 1.4): void {
  g.fillStyle = color
  for (let i = 0; i < count; i++) {
    g.beginPath()
    g.arc(x + rand() * w, y + rand() * h, 0.4 + rand() * size, 0, TAU)
    g.fill()
  }
}

// Long, slightly wandering lines: wood grain.
function grain(g: CanvasRenderingContext2D, rand: () => number, x: number, y: number, w: number, h: number, count: number, color: string): void {
  g.strokeStyle = color
  for (let i = 0; i < count; i++) {
    const gy = y + rand() * h
    const from = x + rand() * w * 0.4
    const to = from + w * (0.25 + rand() * 0.6)
    const bend = (rand() - 0.5) * 9
    g.lineWidth = 0.8 + rand() * 1.4
    g.beginPath()
    g.moveTo(from, gy)
    g.bezierCurveTo(from + (to - from) * 0.3, gy + bend, from + (to - from) * 0.7, gy - bend, Math.min(x + w, to), gy + bend * 0.4)
    g.stroke()
  }
}

export function buildBackdrop(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W * 2
  canvas.height = H * 2
  const g = canvas.getContext('2d')
  if (!g) return canvas
  g.scale(2, 2)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  const rand = rng(11)

  // Lime-washed plaster, a little uneven.
  const wall = g.createLinearGradient(0, 0, 0, TABLE_Y)
  wall.addColorStop(0, '#f3e8d2')
  wall.addColorStop(1, '#e9d9bd')
  g.fillStyle = wall
  g.fillRect(0, 0, W, TABLE_Y)
  for (let i = 0; i < 70; i++) {
    g.fillStyle = rand() < 0.5 ? 'rgba(255,252,240,0.05)' : 'rgba(168,136,96,0.022)'
    g.beginPath()
    g.ellipse(rand() * W, rand() * TABLE_Y, 40 + rand() * 120, 16 + rand() * 46, rand() * 0.6 - 0.3, 0, TAU)
    g.fill()
  }
  speckle(g, rand, 0, 0, W, TABLE_Y, 900, 'rgba(140,110,70,0.06)')

  // The dim space behind the table, where the family's chairs are.
  const gap = g.createLinearGradient(0, TABLE_Y - 70, 0, TABLE_Y)
  gap.addColorStop(0, 'rgba(120,88,52,0)')
  gap.addColorStop(1, 'rgba(120,88,52,0.26)')
  g.fillStyle = gap
  g.fillRect(0, TABLE_Y - 70, W, 70)

  // A peg rail, Shaker fashion.
  g.fillStyle = 'rgba(110,80,45,0.16)'
  g.beginPath()
  g.roundRect(392, 90, 420, 18, 5)
  g.fill()
  g.fillStyle = '#b4854f'
  g.strokeStyle = '#8a6238'
  g.lineWidth = 2
  g.beginPath()
  g.roundRect(390, 84, 420, 18, 5)
  g.fill()
  g.stroke()
  grain(g, rand, 394, 87, 410, 12, 7, 'rgba(110,75,40,0.3)')
  for (const px of [432, 602, PEG.x]) {
    g.fillStyle = 'rgba(90,60,30,0.25)'
    g.beginPath()
    g.ellipse(px + 3, 101, 9, 8, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#c4955c'
    g.beginPath()
    g.arc(px, 95, 8.5, 0, TAU)
    g.fill()
    g.stroke()
    g.fillStyle = 'rgba(255,240,210,0.5)'
    g.beginPath()
    g.arc(px - 2.5, 92.5, 3, 0, TAU)
    g.fill()
  }

  // A bunch of dried lavender on the first peg.
  g.strokeStyle = '#8f9870'
  g.lineWidth = 2
  for (let i = 0; i < 9; i++) {
    const a = (i - 4) * 0.075
    const len = 74 + rand() * 22
    const ex = 432 + Math.sin(a) * len
    const ey = 120 + Math.cos(a) * len
    g.beginPath()
    g.moveTo(432 + a * 20, 118)
    g.quadraticCurveTo(432 + Math.sin(a) * len * 0.5 + 3, 120 + len * 0.5, ex, ey)
    g.stroke()
    g.fillStyle = i % 2 === 0 ? '#9a86b8' : '#8672a6'
    for (let k = 0; k < 5; k++) {
      g.beginPath()
      g.ellipse(ex + (rand() - 0.5) * 5, ey - k * 6 + 6, 3.6, 5, a, 0, TAU)
      g.fill()
    }
  }
  g.strokeStyle = '#b89a6a'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(432, 97)
  g.lineTo(432, 116)
  g.stroke()
  g.strokeStyle = '#c9ad7a'
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(424, 118)
  g.lineTo(440, 119)
  g.stroke()

  // A little birch whisk on the second.
  g.strokeStyle = '#b89a6a'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(602, 97)
  g.lineTo(602, 112)
  g.stroke()
  g.strokeStyle = '#a57a48'
  g.lineWidth = 7
  g.beginPath()
  g.moveTo(602, 112)
  g.lineTo(602, 146)
  g.stroke()
  g.strokeStyle = '#8a6a44'
  g.lineWidth = 1.6
  for (let i = 0; i < 11; i++) {
    const a = (i - 5) * 0.07
    g.beginPath()
    g.moveTo(602 + a * 14, 146)
    g.quadraticCurveTo(602 + a * 60, 172, 602 + a * 150 + (rand() - 0.5) * 4, 196 + rand() * 8)
    g.stroke()
  }
  g.strokeStyle = '#d8c39a'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(596, 148)
  g.lineTo(608, 148)
  g.stroke()

  // The wood oven: a whitewashed dome with a brick arch round its mouth.
  const { left: L, right: R, x: cx } = OVEN
  g.fillStyle = 'rgba(110,80,45,0.14)'
  g.beginPath()
  g.moveTo(L - 14, TABLE_Y)
  g.lineTo(L - 14, 160)
  g.bezierCurveTo(L - 14, 60, 900, 10, cx, 10)
  g.lineTo(cx, TABLE_Y)
  g.closePath()
  g.fill()
  const dome = () => {
    g.beginPath()
    g.moveTo(L, TABLE_Y)
    g.lineTo(L, 150)
    g.bezierCurveTo(L, 62, 902, 16, cx, 16)
    g.bezierCurveTo(1098, 16, R, 62, R, 150)
    g.lineTo(R, TABLE_Y)
    g.closePath()
  }
  dome()
  const lime = g.createLinearGradient(L, 0, R, 0)
  lime.addColorStop(0, '#f8f1e2')
  lime.addColorStop(0.6, '#f1e7d2')
  lime.addColorStop(1, '#dfd0b4')
  g.fillStyle = lime
  g.fill()
  g.save()
  dome()
  g.clip()
  for (let i = 0; i < 26; i++) {
    g.fillStyle = rand() < 0.5 ? 'rgba(255,255,250,0.14)' : 'rgba(150,120,80,0.05)'
    g.beginPath()
    g.ellipse(L + rand() * (R - L), 20 + rand() * 320, 20 + rand() * 60, 10 + rand() * 30, rand() - 0.5, 0, TAU)
    g.fill()
  }
  // Years of smoke above the mouth.
  const soot = g.createRadialGradient(cx, 104, 10, cx, 104, 150)
  soot.addColorStop(0, 'rgba(90,70,50,0.28)')
  soot.addColorStop(1, 'rgba(90,70,50,0)')
  g.fillStyle = soot
  g.fillRect(L, 0, R - L, 200)
  speckle(g, rand, L, 16, R - L, 324, 260, 'rgba(120,95,60,0.09)')
  g.restore()
  dome()
  g.strokeStyle = '#c4b08a'
  g.lineWidth = 3
  g.stroke()

  // Brick arch: a thick band round the mouth, then the joints.
  mouthPath(g, 13)
  g.strokeStyle = '#8f5238'
  g.lineWidth = 31
  g.stroke()
  mouthPath(g, 13)
  g.strokeStyle = '#c47a57'
  g.lineWidth = 26
  g.stroke()
  g.strokeStyle = '#ecdcc0'
  g.lineWidth = 2.6
  const joint = (x: number, y: number, nx: number, ny: number) => {
    g.beginPath()
    g.moveTo(x - nx * 12, y - ny * 12)
    g.lineTo(x + nx * 12, y + ny * 12)
    g.stroke()
  }
  const ml = OVEN.mouthL - 13
  const mr = OVEN.mouthR + 13
  const mt = OVEN.mouthTop - 13
  for (let y = OVEN.mouthBottom - 30; y > mt + 60; y -= 32) {
    joint(ml, y, 1, 0)
    joint(mr, y, 1, 0)
  }
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    const u = 1 - t
    const bx = u * u * u * ml + 3 * u * u * t * ml + 3 * u * t * t * mr + t * t * t * mr
    const by = u * u * u * (mt + 52) + 3 * u * u * t * (mt - 6) + 3 * u * t * t * (mt - 6) + t * t * t * (mt + 52)
    const dx = 3 * u * u * 0 + 6 * u * t * (mr - ml) + 3 * t * t * 0
    const dy = 3 * u * u * -58 + 3 * t * t * 58
    const len = Math.hypot(dx, dy) || 1
    joint(bx, by, -dy / len, dx / len)
  }
  mouthPath(g, 0)
  g.fillStyle = '#2c1a12'
  g.fill()

  // The hearth stone under the mouth, and the wood store below it.
  g.fillStyle = '#a8946f'
  g.beginPath()
  g.roundRect(850, OVEN.mouthBottom + 4, 300, 16, 4)
  g.fill()
  g.fillStyle = '#cbb892'
  g.strokeStyle = '#9c8763'
  g.lineWidth = 2
  g.beginPath()
  g.roundRect(850, OVEN.mouthBottom - 2, 300, 16, 4)
  g.fill()
  g.stroke()
  g.fillStyle = '#3a2619'
  g.beginPath()
  g.moveTo(944, TABLE_Y)
  g.lineTo(944, 318)
  g.quadraticCurveTo(1000, 290, 1056, 318)
  g.lineTo(1056, TABLE_Y)
  g.closePath()
  g.fill()
  g.strokeStyle = '#c47a57'
  g.lineWidth = 5
  g.stroke()
  for (const [lx, ly, lr] of [
    [966, 328, 11],
    [990, 325, 13],
    [1016, 328, 11],
    [1038, 330, 9],
    [978, 310, 9],
    [1004, 307, 10],
    [1027, 312, 9],
  ] as const) {
    g.fillStyle = '#c59a66'
    g.strokeStyle = '#7d5a36'
    g.lineWidth = 2
    g.beginPath()
    g.arc(lx, ly, lr, 0, TAU)
    g.fill()
    g.stroke()
    g.strokeStyle = 'rgba(125,90,54,0.5)'
    g.lineWidth = 1
    g.beginPath()
    g.arc(lx, ly, lr * 0.55, 0, TAU)
    g.stroke()
  }

  // The table: wide oak planks, seen from a child's height standing at it.
  const top = g.createLinearGradient(0, TABLE_Y, 0, H)
  top.addColorStop(0, '#d9ae76')
  top.addColorStop(1, '#c6935c')
  g.fillStyle = top
  g.fillRect(0, TABLE_Y, W, H - TABLE_Y)
  const seams = [TABLE_Y, 398, 472, 566, 690, H + 40]
  for (let p = 0; p < seams.length - 1; p++) {
    const y0 = seams[p]!
    const y1 = seams[p + 1]!
    g.fillStyle = `rgba(${p % 2 === 0 ? '255,236,200' : '120,80,40'},${0.03 + rand() * 0.04})`
    g.fillRect(0, y0, W, y1 - y0)
    grain(g, rand, -60, y0 + 4, W + 120, y1 - y0 - 8, 9 + p * 3, 'rgba(126,84,44,0.16)')
    grain(g, rand, -60, y0 + 4, W + 120, y1 - y0 - 8, 4 + p, 'rgba(255,238,205,0.2)')
    // A knot or two.
    for (let k = 0; k < 2; k++) {
      const kx = rand() * W
      const ky = y0 + 14 + rand() * Math.max(4, y1 - y0 - 28)
      const kr = 5 + rand() * 6 + p
      g.strokeStyle = 'rgba(110,70,36,0.28)'
      g.lineWidth = 1.4
      for (let ring = 0; ring < 3; ring++) {
        g.beginPath()
        g.ellipse(kx, ky, kr * (1.8 + ring * 0.9), kr * (0.5 + ring * 0.32), 0, 0, TAU)
        g.stroke()
      }
      g.fillStyle = 'rgba(100,62,32,0.4)'
      g.beginPath()
      g.ellipse(kx, ky, kr * 0.9, kr * 0.34, 0, 0, TAU)
      g.fill()
    }
    if (p > 0) {
      g.strokeStyle = 'rgba(104,66,34,0.42)'
      g.lineWidth = 2.2
      g.beginPath()
      g.moveTo(0, y0)
      g.bezierCurveTo(W * 0.3, y0 + 1.5, W * 0.7, y0 - 1.5, W, y0 + 0.5)
      g.stroke()
      g.strokeStyle = 'rgba(255,236,200,0.28)'
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(0, y0 + 2.6)
      g.lineTo(W, y0 + 2.6)
      g.stroke()
    }
  }
  // The far edge, worn pale.
  g.fillStyle = '#ecc993'
  g.fillRect(0, TABLE_Y, W, 5)
  g.fillStyle = 'rgba(96,62,30,0.5)'
  g.fillRect(0, TABLE_Y - 2, W, 2.4)
  speckle(g, rand, 0, TABLE_Y, W, H - TABLE_Y, 1300, 'rgba(100,66,34,0.07)')
  return canvas
}

// ---------------------------------------------------------------- sprites

export function buildBoard(): Sprite {
  const { w, h, handle } = BOARD
  return makeSprite(w + handle + 30, h + 36, w / 2 + 12, h / 2 + 10, (g) => {
    const rand = rng(5)
    const shape = (dy: number) => {
      g.beginPath()
      g.roundRect(-w / 2, -h / 2 + dy, w, h, 30)
      g.roundRect(w / 2 - 12, -19 + dy, handle + 12, 38, 17)
    }
    // The board's thickness, then its top.
    shape(9)
    g.fillStyle = '#b88c56'
    g.fill()
    shape(0)
    const beech = g.createLinearGradient(0, -h / 2, 0, h / 2)
    beech.addColorStop(0, '#ecd0a0')
    beech.addColorStop(1, '#e2c08c')
    g.fillStyle = beech
    g.fill()
    g.save()
    shape(0)
    g.clip()
    grain(g, rand, -w / 2 - 20, -h / 2, w + handle + 40, h, 46, 'rgba(160,116,64,0.2)')
    grain(g, rand, -w / 2 - 20, -h / 2, w + handle + 40, h, 16, 'rgba(255,244,220,0.35)')
    // Flour rubbed into the middle from many bakings: a soft cloud of dabs.
    for (let i = 0; i < 300; i++) {
      const a = rand() * TAU
      const d = (rand() + rand() + rand()) / 3
      g.fillStyle = `rgba(255,252,243,${0.025 + rand() * 0.035})`
      g.beginPath()
      g.ellipse(Math.cos(a) * d * w * 0.62, Math.sin(a) * d * h * 0.6, 10 + rand() * 26, 6 + rand() * 12, rand() * 0.5 - 0.25, 0, TAU)
      g.fill()
    }
    speckle(g, rand, -w / 2, -h / 2, w, h, 420, 'rgba(255,252,244,0.5)', 1.6)
    g.restore()
    shape(0)
    g.strokeStyle = '#a97f4c'
    g.lineWidth = 2.6
    g.stroke()
    // The hole the peel hangs by.
    g.fillStyle = '#9a7142'
    g.beginPath()
    g.ellipse(w / 2 + handle - 22, 0, 8, 8, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#c99c64'
    g.beginPath()
    g.ellipse(w / 2 + handle - 22, 2.5, 6.5, 6, 0, 0, TAU)
    g.fill()
  })
}

// The crock's body. Its mouth and the flour inside are drawn live, on top.
export function buildCrock(): Sprite {
  return makeSprite(180, 190, 90, 176, (g) => {
    const rand = rng(3)
    const body = () => {
      g.beginPath()
      g.moveTo(-58, -8)
      g.bezierCurveTo(-76, -50, -74, -104, -66, -132)
      g.lineTo(66, -132)
      g.bezierCurveTo(74, -104, 76, -50, 58, -8)
      g.bezierCurveTo(30, 6, -30, 6, -58, -8)
      g.closePath()
    }
    body()
    const glaze = g.createLinearGradient(-74, 0, 74, 0)
    glaze.addColorStop(0, '#e7dcc6')
    glaze.addColorStop(0.35, '#efe6d3')
    glaze.addColorStop(1, '#c9b998')
    g.fillStyle = glaze
    g.fill()
    g.save()
    body()
    g.clip()
    speckle(g, rand, -80, -140, 160, 150, 240, 'rgba(120,96,64,0.22)', 1.3)
    // Two brushed indigo bands.
    g.strokeStyle = '#5f7592'
    g.lineWidth = 7
    g.beginPath()
    g.moveTo(-80, -96)
    g.quadraticCurveTo(0, -80, 80, -96)
    g.stroke()
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(-80, -82)
    g.quadraticCurveTo(0, -66, 80, -82)
    g.stroke()
    // A leaf sprig, brushed on by the potter.
    g.strokeStyle = '#5f7592'
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(-4, -22)
    g.quadraticCurveTo(-2, -42, 4, -58)
    g.stroke()
    g.fillStyle = '#5f7592'
    for (const [lx, ly, rot] of [
      [-10, -34, -0.9],
      [9, -40, 0.8],
      [-7, -48, -0.8],
      [11, -54, 0.9],
      [4, -62, 0.1],
    ] as const) {
      g.beginPath()
      g.ellipse(lx, ly, 8, 3.6, rot, 0, TAU)
      g.fill()
    }
    g.fillStyle = 'rgba(255,255,255,0.3)'
    g.beginPath()
    g.ellipse(-44, -70, 8, 44, 0.06, 0, TAU)
    g.fill()
    g.restore()
    body()
    g.strokeStyle = '#a8946e'
    g.lineWidth = 2.6
    g.stroke()
  })
}

export function buildJug(): Sprite {
  // Origin at the middle of the jug's body, so it tilts about its belly.
  return makeSprite(170, 190, 85, 100, (g) => {
    const rand = rng(8)
    // Handle, on the left.
    g.strokeStyle = '#6f8ea0'
    g.lineWidth = 15
    g.beginPath()
    g.moveTo(-36, -44)
    g.bezierCurveTo(-78, -52, -80, 22, -40, 30)
    g.stroke()
    g.strokeStyle = '#9fbac6'
    g.lineWidth = 10
    g.stroke()
    const body = () => {
      g.beginPath()
      g.moveTo(-34, -74)
      g.bezierCurveTo(-30, -46, -54, -26, -52, 22)
      g.bezierCurveTo(-52, 62, -38, 76, 0, 76)
      g.bezierCurveTo(38, 76, 52, 62, 52, 22)
      g.bezierCurveTo(54, -26, 32, -46, 36, -70)
      // The spout, pulled out to the right.
      g.lineTo(54, -84)
      g.lineTo(30, -80)
      g.closePath()
    }
    body()
    const enamel = g.createLinearGradient(-54, 0, 54, 0)
    enamel.addColorStop(0, '#a9c2cd')
    enamel.addColorStop(0.4, '#b6ccd5')
    enamel.addColorStop(1, '#84a2b1')
    g.fillStyle = enamel
    g.fill()
    g.save()
    body()
    g.clip()
    speckle(g, rand, -60, -90, 120, 170, 120, 'rgba(255,255,255,0.35)', 1.2)
    g.strokeStyle = '#f3ecdc'
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(-60, 10)
    g.quadraticCurveTo(0, 22, 60, 10)
    g.stroke()
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(-60, 22)
    g.quadraticCurveTo(0, 34, 60, 22)
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.34)'
    g.beginPath()
    g.ellipse(-30, 6, 7, 40, 0.1, 0, TAU)
    g.fill()
    g.restore()
    body()
    g.strokeStyle = '#64808f'
    g.lineWidth = 2.6
    g.stroke()
    // The mouth of the jug.
    g.fillStyle = '#5f7c8c'
    g.beginPath()
    g.ellipse(4, -77, 35, 9, -0.08, 0, TAU)
    g.fill()
    g.strokeStyle = '#e9eef0'
    g.lineWidth = 2.4
    g.stroke()
  })
}

// The outside of the mixing bowl, below its rim: turned wood.
export function buildBowl(): Sprite {
  const { rx, ry } = BOWL
  return makeSprite(rx * 2 + 30, ry * 2 + 150, rx + 15, ry + 12, (g) => {
    const rand = rng(21)
    const body = () => {
      g.beginPath()
      g.moveTo(-rx, 0)
      g.bezierCurveTo(-rx + 4, 70, -92, 122, 0, 122)
      g.bezierCurveTo(92, 122, rx - 4, 70, rx, 0)
      g.bezierCurveTo(rx, -ry * 1.33, -rx, -ry * 1.33, -rx, 0)
      g.closePath()
    }
    body()
    const wood = g.createLinearGradient(-rx, 0, rx, 0)
    wood.addColorStop(0, '#b98250')
    wood.addColorStop(0.4, '#c8935c')
    wood.addColorStop(1, '#9c6a3c')
    g.fillStyle = wood
    g.fill()
    g.save()
    body()
    g.clip()
    // Lathe rings, following the curve of the bowl.
    g.strokeStyle = 'rgba(110,70,36,0.24)'
    for (let i = 0; i < 9; i++) {
      const yy = 14 + i * 12 + rand() * 4
      g.lineWidth = 1 + rand() * 1.6
      g.beginPath()
      g.ellipse(0, yy - 46, rx * (1.02 - i * 0.045), 60, 0, 0.12 * Math.PI, 0.88 * Math.PI)
      g.stroke()
    }
    g.fillStyle = 'rgba(255,232,196,0.2)'
    g.beginPath()
    g.ellipse(-78, 56, 16, 40, 0.5, 0, TAU)
    g.fill()
    g.restore()
    body()
    g.strokeStyle = '#7f552f'
    g.lineWidth = 2.8
    g.stroke()
    // Inside of the bowl: darker at the far wall, paler on the floor.
    g.beginPath()
    g.ellipse(0, 0, rx - 9, ry - 7, 0, 0, TAU)
    const inside = g.createLinearGradient(0, -ry, 0, ry)
    inside.addColorStop(0, '#8d5f37')
    inside.addColorStop(0.55, '#b98452')
    inside.addColorStop(1, '#c9965f')
    g.fillStyle = inside
    g.fill()
    g.save()
    g.beginPath()
    g.ellipse(0, 0, rx - 9, ry - 7, 0, 0, TAU)
    g.clip()
    g.strokeStyle = 'rgba(96,60,30,0.2)'
    g.lineWidth = 1.4
    for (let i = 1; i < 5; i++) {
      g.beginPath()
      g.ellipse(0, 14 - i * 1.5, FLOOR.rx + i * 8 - 14, FLOOR.ry + i * 6 - 10, 0, 0, TAU)
      g.stroke()
    }
    g.fillStyle = 'rgba(255,236,204,0.16)'
    g.beginPath()
    g.ellipse(0, 26, FLOOR.rx - 8, FLOOR.ry - 14, 0, 0, TAU)
    g.fill()
    g.restore()
  })
}

// A small dish with something heaped in it: salt, or seeds.
export function buildDish(kind: 'salt' | 'seeds'): Sprite {
  return makeSprite(120, 96, 60, 52, (g) => {
    const rand = rng(kind === 'salt' ? 31 : 37)
    const clay = kind === 'salt' ? ['#c98a62', '#b06f4a', '#8c5536'] : ['#d6b062', '#bd9548', '#94722f']
    g.beginPath()
    g.moveTo(-46, 0)
    g.bezierCurveTo(-44, 26, -24, 34, 0, 34)
    g.bezierCurveTo(24, 34, 44, 26, 46, 0)
    g.closePath()
    g.fillStyle = clay[1]!
    g.fill()
    g.strokeStyle = clay[2]!
    g.lineWidth = 2.4
    g.stroke()
    g.beginPath()
    g.ellipse(0, 0, 46, 22, 0, 0, TAU)
    g.fillStyle = clay[0]!
    g.fill()
    g.stroke()
    g.beginPath()
    g.ellipse(0, 1, 38, 16, 0, 0, TAU)
    g.fillStyle = clay[2]!
    g.fill()
    g.save()
    g.beginPath()
    g.ellipse(0, 0, 40, 18, 0, 0, TAU)
    g.rect(-50, -50, 100, 50)
    g.clip()
    if (kind === 'salt') {
      g.fillStyle = '#f7f3ea'
      g.beginPath()
      g.moveTo(-36, 6)
      g.quadraticCurveTo(-8, -26, 8, -16)
      g.quadraticCurveTo(26, -10, 36, 6)
      g.quadraticCurveTo(0, 20, -36, 6)
      g.fill()
      speckle(g, rand, -30, -16, 60, 26, 60, 'rgba(190,180,160,0.7)', 1.2)
      speckle(g, rand, -30, -16, 60, 26, 40, 'rgba(255,255,255,0.9)', 1.2)
    } else {
      g.fillStyle = '#6f5a36'
      g.beginPath()
      g.moveTo(-36, 6)
      g.quadraticCurveTo(-10, -22, 6, -15)
      g.quadraticCurveTo(26, -10, 36, 6)
      g.quadraticCurveTo(0, 20, -36, 6)
      g.fill()
      for (let i = 0; i < 70; i++) {
        const a = rand() * TAU
        const d = Math.sqrt(rand())
        const sx = Math.cos(a) * d * 32
        const sy = -3 + Math.sin(a) * d * 13 - (1 - d) * 8
        seedShape(g, sx, sy, (i * 7) % 3, rand() * TAU, 1.05)
      }
    }
    g.restore()
  })
}

export const SEED_COLORS = ['#efe2b8', '#3b3340', '#a9a05a'] as const

// One seed: sesame (pale), poppy (dark, round), pumpkin (green, longer).
export function seedShape(g: CanvasRenderingContext2D, x: number, y: number, kind: number, rot: number, scale = 1): void {
  g.fillStyle = SEED_COLORS[kind % 3]!
  g.beginPath()
  if (kind % 3 === 1) g.arc(x, y, 2.9 * scale, 0, TAU)
  else g.ellipse(x, y, (kind % 3 === 2 ? 6.4 : 5) * scale, (kind % 3 === 2 ? 3.3 : 2.6) * scale, rot, 0, TAU)
  g.fill()
}

// The linen cloth, spread out. Origin at its middle.
export const CLOTH = { w: BOARD.w + 22, h: BOARD.h + 40 }

export function clothPath(g: CanvasRenderingContext2D, w: number, h: number, wave = 5): void {
  const hw = w / 2
  const hh = h / 2
  g.beginPath()
  g.moveTo(-hw + 12, -hh)
  const n = 7
  for (let i = 1; i <= n; i++) g.quadraticCurveTo(-hw + ((i - 0.5) / n) * w, -hh + (i % 2 === 0 ? wave : -wave), -hw + (i / n) * w - (i === n ? 12 : 0), -hh)
  g.quadraticCurveTo(hw + 2, -hh, hw, -hh + 12)
  for (let i = 1; i <= 4; i++) g.quadraticCurveTo(hw + (i % 2 === 0 ? wave : -wave), -hh + ((i - 0.5) / 4) * h, hw, -hh + (i / 4) * h - (i === 4 ? 12 : 0))
  g.quadraticCurveTo(hw, hh + 2, hw - 12, hh)
  for (let i = 1; i <= n; i++) g.quadraticCurveTo(hw - ((i - 0.5) / n) * w, hh + (i % 2 === 0 ? -wave : wave), hw - (i / n) * w + (i === n ? 12 : 0), hh)
  g.quadraticCurveTo(-hw - 2, hh, -hw, hh - 12)
  for (let i = 1; i <= 4; i++) g.quadraticCurveTo(-hw + (i % 2 === 0 ? -wave : wave), hh - ((i - 0.5) / 4) * h, -hw, hh - (i / 4) * h + (i === 4 ? 12 : 0))
  g.quadraticCurveTo(-hw, -hh - 2, -hw + 12, -hh)
  g.closePath()
}

function linen(g: CanvasRenderingContext2D, rand: () => number, w: number, h: number): void {
  g.fillStyle = '#f1e9d8'
  g.fill()
  // The weave: fine threads both ways, a little uneven.
  g.lineWidth = 1
  for (let x = -w / 2; x < w / 2; x += 5) {
    g.strokeStyle = `rgba(190,172,140,${0.1 + rand() * 0.14})`
    g.beginPath()
    g.moveTo(x + rand() * 2, -h / 2)
    g.lineTo(x + rand() * 2, h / 2)
    g.stroke()
  }
  for (let y = -h / 2; y < h / 2; y += 5) {
    g.strokeStyle = `rgba(255,255,250,${0.14 + rand() * 0.2})`
    g.beginPath()
    g.moveTo(-w / 2, y + rand() * 2)
    g.lineTo(w / 2, y + rand() * 2)
    g.stroke()
  }
}

export function buildCloth(): Sprite {
  const { w, h } = CLOTH
  return makeSprite(w + 24, h + 24, w / 2 + 12, h / 2 + 12, (g) => {
    const rand = rng(41)
    clothPath(g, w, h)
    g.save()
    g.clip()
    clothPath(g, w, h)
    linen(g, rand, w, h)
    // Madder-red stripes near each end.
    for (const side of [-1, 1]) {
      g.fillStyle = 'rgba(178,82,60,0.82)'
      g.fillRect(side * (w / 2 - 56) - 9, -h / 2 - 4, 18, h + 8)
      g.fillStyle = 'rgba(178,82,60,0.7)'
      g.fillRect(side * (w / 2 - 32) - 2.5, -h / 2 - 4, 5, h + 8)
      g.fillRect(side * (w / 2 - 80) - 2.5, -h / 2 - 4, 5, h + 8)
    }
    g.restore()
    clothPath(g, w, h)
    g.strokeStyle = '#c9b996'
    g.lineWidth = 2.4
    g.stroke()
  })
}

// The same cloth folded over its peg. Origin at the peg.
export function buildClothHung(): Sprite {
  return makeSprite(130, 220, 65, 14, (g) => {
    const rand = rng(43)
    // The loop it hangs by.
    g.strokeStyle = '#d8c9a8'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(-5, 0)
    g.lineTo(0, 22)
    g.lineTo(5, 0)
    g.stroke()
    const fold = (dx: number, w: number, len: number, shade: number) => {
      g.save()
      g.beginPath()
      g.moveTo(dx - 10, 18)
      g.quadraticCurveTo(dx - w / 2 - 4, 40, dx - w / 2, 70)
      g.lineTo(dx - w / 2 + 3, len)
      g.quadraticCurveTo(dx, len + 7, dx + w / 2 - 3, len - 2)
      g.lineTo(dx + w / 2, 70)
      g.quadraticCurveTo(dx + w / 2 + 4, 40, dx + 10, 18)
      g.closePath()
      g.clip()
      g.beginPath()
      g.rect(-70, 0, 140, 220)
      linen(g, rand, 140, 440)
      g.fillStyle = 'rgba(178,82,60,0.82)'
      g.fillRect(-70, len - 46, 140, 16)
      g.fillStyle = 'rgba(178,82,60,0.7)'
      g.fillRect(-70, len - 24, 140, 5)
      g.fillRect(-70, len - 58, 140, 5)
      if (shade > 0) {
        g.fillStyle = `rgba(120,96,60,${shade})`
        g.fillRect(-70, 0, 140, 220)
      }
      // Soft folds.
      g.strokeStyle = 'rgba(150,128,92,0.3)'
      g.lineWidth = 2
      for (const fx of [-w * 0.22, w * 0.18]) {
        g.beginPath()
        g.moveTo(dx + fx * 0.3, 30)
        g.quadraticCurveTo(dx + fx * 1.3, 90, dx + fx, len - 8)
        g.stroke()
      }
      g.restore()
      g.beginPath()
      g.moveTo(dx - 10, 18)
      g.quadraticCurveTo(dx - w / 2 - 4, 40, dx - w / 2, 70)
      g.lineTo(dx - w / 2 + 3, len)
      g.quadraticCurveTo(dx, len + 7, dx + w / 2 - 3, len - 2)
      g.lineTo(dx + w / 2, 70)
      g.quadraticCurveTo(dx + w / 2 + 4, 40, dx + 10, 18)
      g.closePath()
      g.strokeStyle = '#c9b996'
      g.lineWidth = 2.2
      g.stroke()
    }
    fold(8, 78, 176, 0.14)
    fold(-4, 84, 194, 0)
  })
}

// The wooden spoon, lying along +x from the bowl of the spoon (origin) to the
// end of its handle.
export function buildSpoon(): Sprite {
  return makeSprite(250, 70, 36, 35, (g) => {
    g.strokeStyle = '#8a5f36'
    g.lineWidth = 17
    g.beginPath()
    g.moveTo(14, 0)
    g.quadraticCurveTo(110, -5, 200, 0)
    g.stroke()
    g.strokeStyle = '#d2a56c'
    g.lineWidth = 12.5
    g.stroke()
    g.beginPath()
    g.ellipse(0, 0, 30, 22, 0, 0, TAU)
    g.fillStyle = '#d2a56c'
    g.fill()
    g.strokeStyle = '#8a5f36'
    g.lineWidth = 2.4
    g.stroke()
    g.beginPath()
    g.ellipse(-2, 1, 20, 14, 0, 0, TAU)
    g.fillStyle = '#b98a54'
    g.fill()
    g.strokeStyle = 'rgba(255,236,200,0.5)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(40, -3.5)
    g.quadraticCurveTo(110, -8, 190, -3.5)
    g.stroke()
  })
}

// The flour scoop, lying along +x: its open mouth at the origin end, its
// handle to the right. Flour is drawn live on top.
export function buildScoop(): Sprite {
  return makeSprite(170, 80, 50, 44, (g) => {
    g.strokeStyle = '#8a5f36'
    g.lineWidth = 16
    g.beginPath()
    g.moveTo(40, -6)
    g.lineTo(104, -12)
    g.stroke()
    g.strokeStyle = '#cfa068'
    g.lineWidth = 11.5
    g.stroke()
    g.beginPath()
    g.moveTo(-40, -8)
    g.quadraticCurveTo(-36, 26, 6, 26)
    g.quadraticCurveTo(40, 26, 46, -10)
    g.quadraticCurveTo(4, -2, -40, -8)
    g.closePath()
    g.fillStyle = '#c4935c'
    g.fill()
    g.strokeStyle = '#8a5f36'
    g.lineWidth = 2.4
    g.stroke()
    g.beginPath()
    g.ellipse(2, -8, 43, 9, -0.03, 0, TAU)
    g.fillStyle = '#9c6f42'
    g.fill()
    g.stroke()
  })
}

// One soft white puff, for steam.
export function buildPuff(): Sprite {
  return makeSprite(64, 64, 32, 32, (g) => {
    const grad = g.createRadialGradient(0, 0, 2, 0, 0, 30)
    grad.addColorStop(0, 'rgba(255,255,255,0.9)')
    grad.addColorStop(0.5, 'rgba(255,255,255,0.4)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(-32, -32, 64, 64)
  })
}
