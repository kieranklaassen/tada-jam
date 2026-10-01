// The playground: where everything stands, the backdrop painted once to an
// offscreen canvas, and the pieces that move (seesaw plank, trampoline mat,
// swing seat, sprinkler water, ice-cream cart).

import { sprite } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { OUT } from './chars.ts'

type Ctx = CanvasRenderingContext2D

// Feet can stand anywhere in this band of grass.
export const BAND_TOP = 552
export const BAND_BOT = 742
export const GRASS_Y = 500

export const SLIDE = { x0: 138, y0: 290, x1: 178, y1: 500, x2: 322, y2: 508, baseGy: 548 }
export const SWING = { px: 640, py: 216, len: 236 }
export const SEESAW = { x: 620, gy: 698, pivotY: 654, half: 176, seat: 150, max: 0.22 }
export const TRAMP = { x: 992, gy: 706, rx: 118, top: 44 }
export const MUD = { x: 235, y: 700, rx: 160, ry: 47 }
export const SPRINK = { x: 404, y: 562, r: 104 }
export const CART = { x: 1078, gy: 578 }
export const SUN = { x: 1078, y: 176, r: 48 }
export const CASTLE = { x: 432, y: 380 }

// Point on the chute, u from 0 (top) to 1 (lip), and the slope there.
export function slidePoint(u: number): [number, number, number] {
  const k = 1 - u
  const x = k * k * SLIDE.x0 + 2 * k * u * SLIDE.x1 + u * u * SLIDE.x2
  const y = k * k * SLIDE.y0 + 2 * k * u * SLIDE.y1 + u * u * SLIDE.y2
  const dx = 2 * k * (SLIDE.x1 - SLIDE.x0) + 2 * u * (SLIDE.x2 - SLIDE.x1)
  const dy = 2 * k * (SLIDE.y1 - SLIDE.y0) + 2 * u * (SLIDE.y2 - SLIDE.y1)
  return [x, y - 12, Math.atan2(dy, dx)]
}

export function swingSeat(ang: number): [number, number] {
  return [SWING.px + Math.sin(ang) * SWING.len, SWING.py + Math.cos(ang) * SWING.len]
}

// Top of the plank at a seat. tilt > 0 means the right end is down.
export function seatPos(i: number, tilt: number): [number, number] {
  const s = i === 0 ? -1 : 1
  const c = Math.cos(tilt)
  const n = Math.sin(tilt)
  return [SEESAW.x + s * SEESAW.seat * c + 10 * n, SEESAW.pivotY + s * SEESAW.seat * n - 10 * c]
}

export function inMud(x: number, gy: number): boolean {
  const dx = (x - MUD.x) / (MUD.rx - 6)
  const dy = (gy - MUD.y) / (MUD.ry + 16)
  return dx * dx + dy * dy < 1
}

export function inSprinkler(x: number, gy: number): boolean {
  return Math.abs(x - SPRINK.x) < SPRINK.r && gy < SPRINK.y + 78
}

export function onTramp(x: number, gy: number): boolean {
  return Math.abs(x - TRAMP.x) < TRAMP.rx - 8 && Math.abs(gy - TRAMP.gy) < 78
}

function outlined(g: Ctx, x1: number, y1: number, x2: number, y2: number, w: number, fill: string): void {
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.strokeStyle = OUT
  g.lineWidth = w + 7
  g.stroke()
  g.strokeStyle = fill
  g.lineWidth = w
  g.stroke()
}

function box(g: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, lw = 4): void {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.fillStyle = fill
  g.fill()
  if (lw > 0) {
    g.lineWidth = lw
    g.strokeStyle = OUT
    g.stroke()
  }
}

function oval(g: Ctx, x: number, y: number, rx: number, ry: number, fill: string): void {
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, TAU)
  g.fillStyle = fill
  g.fill()
}

function tri(g: Ctx, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: string, lw = 4): void {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.lineTo(x3, y3)
  g.closePath()
  g.lineJoin = 'round'
  g.fillStyle = fill
  g.fill()
  if (lw > 0) {
    g.lineWidth = lw
    g.strokeStyle = OUT
    g.stroke()
  }
}

export const BACK_SCALE = 2

// Sky, hills, a far castle, fence, grass, and the pieces that never move.
// Splats and flowers are painted into it later, so they cost nothing per frame.
export function makeBackdrop(rand: () => number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W * BACK_SCALE
  canvas.height = H * BACK_SCALE
  const g = canvas.getContext('2d')!
  g.scale(BACK_SCALE, BACK_SCALE)
  g.lineCap = 'round'
  g.lineJoin = 'round'

  const skyGrad = g.createLinearGradient(0, 0, 0, GRASS_Y)
  skyGrad.addColorStop(0, '#5fbdff')
  skyGrad.addColorStop(0.7, '#bfeaff')
  skyGrad.addColorStop(1, '#eafaff')
  g.fillStyle = skyGrad
  g.fillRect(0, 0, W, GRASS_Y + 10)

  // Sun glow (the face is drawn live).
  const glow = g.createRadialGradient(SUN.x, SUN.y, 20, SUN.x, SUN.y, 170)
  glow.addColorStop(0, 'rgba(255,244,170,0.9)')
  glow.addColorStop(1, 'rgba(255,244,170,0)')
  g.fillStyle = glow
  g.fillRect(SUN.x - 180, SUN.y - 180, 360, 360)

  // Far hills.
  oval(g, 180, 520, 420, 150, '#b5e6c0')
  oval(g, 930, 540, 520, 180, '#a6dfb4')
  oval(g, 520, 560, 400, 150, '#96d9a0')

  // The castle on its hill, pale so it sits far away.
  const cx = CASTLE.x
  const cy = CASTLE.y
  const wall = '#ead9ff'
  const shade = '#d2bcf5'
  const roof = '#ff9ec4'
  const far = '#a98fd0'
  g.lineWidth = 3
  const farBox = (x: number, y: number, w: number, h: number, fill: string): void => {
    g.fillStyle = fill
    g.fillRect(x, y, w, h)
    g.strokeStyle = far
    g.strokeRect(x, y, w, h)
  }
  const farRoof = (x: number, y: number, w: number, h: number): void => {
    g.beginPath()
    g.moveTo(x - 5, y)
    g.lineTo(x + w + 5, y)
    g.lineTo(x + w / 2, y - h)
    g.closePath()
    g.fillStyle = roof
    g.fill()
    g.strokeStyle = far
    g.stroke()
    g.beginPath()
    g.moveTo(x + w / 2, y - h)
    g.lineTo(x + w / 2, y - h - 16)
    g.stroke()
    g.fillStyle = '#ffd23f'
    g.beginPath()
    g.moveTo(x + w / 2, y - h - 16)
    g.lineTo(x + w / 2 + 14, y - h - 11)
    g.lineTo(x + w / 2, y - h - 6)
    g.fill()
  }
  farBox(cx - 58, cy, 28, 86, shade)
  farBox(cx + 30, cy + 8, 28, 78, shade)
  farBox(cx - 34, cy + 22, 68, 64, wall)
  farBox(cx - 15, cy - 26, 30, 112, wall)
  farRoof(cx - 58, cy, 28, 34)
  farRoof(cx + 30, cy + 8, 28, 32)
  farRoof(cx - 15, cy - 26, 30, 40)
  g.fillStyle = far
  g.beginPath()
  g.roundRect(cx - 9, cy + 56, 18, 30, [9, 9, 0, 0])
  g.fill()
  for (const [wx, wy] of [[-50, 22], [38, 28], [-6, -8], [-6, 22]] as const) {
    g.beginPath()
    g.roundRect(cx + wx, cy + wy, 10, 15, [5, 5, 0, 0])
    g.fill()
  }

  // Bushes along the horizon.
  for (let x = -20; x < W + 40; x += 62) {
    const r = 30 + rand() * 16
    oval(g, x + rand() * 20, 486 - rand() * 6, r, r * 0.8, rand() < 0.5 ? '#63bf6e' : '#57b565')
  }

  // Grass.
  const grass = g.createLinearGradient(0, GRASS_Y - 10, 0, H)
  grass.addColorStop(0, '#a3e672')
  grass.addColorStop(1, '#63c653')
  g.fillStyle = grass
  g.fillRect(0, GRASS_Y - 8, W, H - GRASS_Y + 8)
  // Mown bands that widen towards the child.
  g.fillStyle = 'rgba(255,255,255,0.07)'
  let by = GRASS_Y
  for (let i = 0; i < 6; i++) {
    const bh = 18 + i * 9
    if (i % 2 === 0) g.fillRect(0, by, W, bh)
    by += bh
  }

  // A white picket fence at the back.
  g.fillStyle = '#ffffff'
  g.strokeStyle = '#c9d6e8'
  g.lineWidth = 2
  g.fillRect(0, 478, W, 7)
  g.fillRect(0, 498, W, 7)
  for (let x = 6; x < W; x += 30) {
    g.beginPath()
    g.moveTo(x, 514)
    g.lineTo(x, 472)
    g.lineTo(x + 9, 462)
    g.lineTo(x + 18, 472)
    g.lineTo(x + 18, 514)
    g.closePath()
    g.fill()
    g.stroke()
  }
  g.fillStyle = 'rgba(40,90,40,0.12)'
  g.fillRect(0, 514, W, 6)

  // Tufts and daisies.
  g.strokeStyle = 'rgba(40,120,50,0.5)'
  g.lineWidth = 3
  for (let i = 0; i < 90; i++) {
    const x = rand() * W
    const y = 530 + rand() * (H - 540)
    g.beginPath()
    g.moveTo(x - 6, y)
    g.lineTo(x - 2, y - 9)
    g.moveTo(x, y)
    g.lineTo(x, y - 12)
    g.moveTo(x + 6, y)
    g.lineTo(x + 3, y - 8)
    g.stroke()
  }
  for (let i = 0; i < 26; i++) {
    const x = rand() * W
    const y = 535 + rand() * (H - 550)
    g.fillStyle = '#ffffff'
    for (let k = 0; k < 5; k++) {
      g.beginPath()
      g.arc(x + Math.cos((k / 5) * TAU) * 4.5, y + Math.sin((k / 5) * TAU) * 4.5, 3.2, 0, TAU)
      g.fill()
    }
    g.fillStyle = '#ffd23f'
    g.beginPath()
    g.arc(x, y, 3, 0, TAU)
    g.fill()
  }

  paintSlide(g)
  paintSwingFrame(g)
  paintSprinkler(g)
  paintMud(g)
  return canvas
}

function paintSlide(g: Ctx): void {
  const base = SLIDE.baseGy - 18
  // Shadow on the grass.
  oval(g, 190, base + 6, 190, 20, 'rgba(30,80,40,0.16)')
  // Ladder.
  outlined(g, 62, 300, 30, base, 8, '#4db8ff')
  outlined(g, 96, 300, 66, base, 8, '#4db8ff')
  for (let i = 1; i <= 5; i++) {
    const k = i / 6
    outlined(g, 62 - 32 * k + 2, 300 + (base - 300) * k, 96 - 30 * k - 2, 300 + (base - 300) * k, 6, '#ffd23f')
  }
  // Tower posts.
  outlined(g, 68, 230, 68, base, 10, '#2fbfae')
  outlined(g, 134, 230, 134, base, 10, '#2fbfae')
  // Chute: a red trough seen from the side.
  g.beginPath()
  g.moveTo(SLIDE.x0, SLIDE.y0)
  g.quadraticCurveTo(SLIDE.x1, SLIDE.y1, SLIDE.x2, SLIDE.y2)
  g.lineTo(SLIDE.x2 + 30, SLIDE.y2 + 2)
  g.lineCap = 'round'
  g.strokeStyle = OUT
  g.lineWidth = 31
  g.stroke()
  g.strokeStyle = '#ff5a4f'
  g.lineWidth = 23
  g.stroke()
  g.beginPath()
  g.moveTo(SLIDE.x0 + 5, SLIDE.y0 - 4)
  g.quadraticCurveTo(SLIDE.x1 + 6, SLIDE.y1 - 9, SLIDE.x2, SLIDE.y2 - 7)
  g.lineTo(SLIDE.x2 + 28, SLIDE.y2 - 5)
  g.strokeStyle = '#ff9a8f'
  g.lineWidth = 5
  g.stroke()
  // Chute supports.
  outlined(g, 262, 508, 262, base, 7, '#2fbfae')
  outlined(g, 336, 518, 336, base, 7, '#2fbfae')
  // Platform, rail and a flag. No roof: whoever sits up there must be seen.
  box(g, 54, 288, 94, 16, 7, '#ffd23f')
  outlined(g, 62, 256, 72, 256, 6, '#ffd23f')
  outlined(g, 68, 228, 68, 168, 3, '#ffffff')
  tri(g, 68, 168, 104, 180, 68, 194, '#ff78b4', 3.5)
  for (const x of [68, 134]) {
    g.beginPath()
    g.arc(x, 228, 9, 0, TAU)
    g.fillStyle = '#ffd23f'
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = OUT
    g.stroke()
  }
}

function paintSwingFrame(g: Ctx): void {
  const base = 530
  oval(g, SWING.px, base + 4, 150, 16, 'rgba(30,80,40,0.16)')
  const teal = '#ff9d42'
  for (const s of [-1, 1]) {
    outlined(g, SWING.px + s * 96, SWING.py, SWING.px + s * 128, base, 10, teal)
    outlined(g, SWING.px + s * 96, SWING.py, SWING.px + s * 70, base - 6, 10, teal)
  }
  outlined(g, SWING.px - 108, SWING.py, SWING.px + 108, SWING.py, 12, '#ffb45e')
  for (const s of [-1, 1]) {
    g.beginPath()
    g.arc(SWING.px + s * 14, SWING.py + 6, 5, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
    g.lineWidth = 3
    g.strokeStyle = OUT
    g.stroke()
  }
}

function paintSprinkler(g: Ctx): void {
  // A faint rainbow in the spray.
  const cols = ['#ff6b6b', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff']
  g.globalAlpha = 0.3
  g.lineWidth = 7
  cols.forEach((c, i) => {
    g.beginPath()
    g.arc(SPRINK.x, SPRINK.y - 6, 150 - i * 7, Math.PI * 1.08, Math.PI * 1.92)
    g.strokeStyle = c
    g.stroke()
  })
  g.globalAlpha = 1
  // Wet grass.
  oval(g, SPRINK.x, SPRINK.y + 14, 110, 26, 'rgba(60,150,90,0.25)')
  // Hose, back to a tap on the fence.
  g.beginPath()
  g.moveTo(SPRINK.x + 8, SPRINK.y + 8)
  g.bezierCurveTo(SPRINK.x + 70, SPRINK.y + 34, SPRINK.x + 104, SPRINK.y - 10, SPRINK.x + 84, SPRINK.y - 44)
  g.strokeStyle = OUT
  g.lineWidth = 13
  g.stroke()
  g.strokeStyle = '#3fbf6a'
  g.lineWidth = 7
  g.stroke()
  outlined(g, SPRINK.x + 84, SPRINK.y - 44, SPRINK.x + 84, SPRINK.y - 62, 6, '#8d9bb0')
  outlined(g, SPRINK.x + 74, SPRINK.y - 64, SPRINK.x + 94, SPRINK.y - 64, 5, '#ff5a4f')
  // Head.
  outlined(g, SPRINK.x - 16, SPRINK.y + 12, SPRINK.x + 16, SPRINK.y + 12, 7, '#8d9bb0')
  outlined(g, SPRINK.x, SPRINK.y + 10, SPRINK.x, SPRINK.y - 8, 7, '#8d9bb0')
  g.beginPath()
  g.arc(SPRINK.x, SPRINK.y - 12, 11, 0, TAU)
  g.fillStyle = '#ffd23f'
  g.fill()
  g.lineWidth = 4
  g.strokeStyle = OUT
  g.stroke()
}

const MUD_LOBES: readonly [number, number, number, number][] = [
  [0, 0, 160, 47],
  [-112, 12, 62, 26],
  [112, -10, 60, 26],
  [20, 28, 96, 22],
  [-40, -24, 84, 22],
]

function paintMud(g: Ctx): void {
  g.lineWidth = 9
  g.strokeStyle = '#5b381d'
  for (const [dx, dy, rx, ry] of MUD_LOBES) {
    g.beginPath()
    g.ellipse(MUD.x + dx, MUD.y + dy, rx, ry, 0, 0, TAU)
    g.stroke()
  }
  for (const [dx, dy, rx, ry] of MUD_LOBES) oval(g, MUD.x + dx, MUD.y + dy, rx, ry, '#7d5230')
  oval(g, MUD.x - 6, MUD.y + 4, 122, 30, '#6b4423')
  g.strokeStyle = '#a7783f'
  g.lineWidth = 5
  g.beginPath()
  g.ellipse(MUD.x - 30, MUD.y - 6, 70, 14, 0, Math.PI * 1.1, Math.PI * 1.6)
  g.stroke()
  g.beginPath()
  g.ellipse(MUD.x + 60, MUD.y + 14, 50, 10, 0, Math.PI * 0.1, Math.PI * 0.5)
  g.stroke()
  for (const [dx, dy, r] of [[-190, 6, 9], [186, 20, 8], [150, -40, 7], [-150, -34, 6], [-60, 52, 7]] as const) {
    oval(g, MUD.x + dx, MUD.y + dy, r * 1.4, r * 0.8, '#7d5230')
  }
}

// A splat of mud (or dropped ice cream) painted onto the backdrop for good.
export function paintSplat(g: Ctx, x: number, y: number, r: number, fill: string, hi: string): void {
  g.fillStyle = fill
  g.beginPath()
  g.ellipse(x, y, r * 1.5, r * 0.62, 0, 0, TAU)
  g.fill()
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * TAU
    const d = r * (1.1 + Math.random() * 0.9)
    g.beginPath()
    g.ellipse(x + Math.cos(a) * d * 1.3, y + Math.sin(a) * d * 0.5, r * 0.3, r * 0.17, 0, 0, TAU)
    g.fill()
  }
  g.fillStyle = hi
  g.beginPath()
  g.ellipse(x - r * 0.4, y - r * 0.12, r * 0.45, r * 0.15, 0, 0, TAU)
  g.fill()
}

export function drawSeesaw(g: Ctx, tilt: number): void {
  const { x, gy, pivotY, half } = SEESAW
  oval(g, x, gy + 6, half * 0.95, 13, 'rgba(30,80,40,0.18)')
  g.beginPath()
  g.moveTo(x - 36, gy + 6)
  g.lineTo(x + 36, gy + 6)
  g.lineTo(x + 11, pivotY + 4)
  g.lineTo(x - 11, pivotY + 4)
  g.closePath()
  g.lineJoin = 'round'
  g.fillStyle = '#4db8ff'
  g.fill()
  g.lineWidth = 4
  g.strokeStyle = OUT
  g.stroke()
  g.save()
  g.translate(x, pivotY)
  g.rotate(tilt)
  box(g, -half, -10, half * 2, 20, 10, '#ffd23f')
  for (const s of [-1, 1]) {
    box(g, s > 0 ? half - 54 : -half, -10, 54, 20, 10, '#ff5a4f')
    g.beginPath()
    g.moveTo(s * 100, -10)
    g.lineTo(s * 100, -40)
    g.moveTo(s * 100 - 12, -40)
    g.lineTo(s * 100 + 12, -40)
    g.strokeStyle = OUT
    g.lineWidth = 11
    g.stroke()
    g.strokeStyle = '#41c9c0'
    g.lineWidth = 5
    g.stroke()
  }
  g.beginPath()
  g.arc(0, 0, 9, 0, TAU)
  g.fillStyle = '#ffffff'
  g.fill()
  g.lineWidth = 4
  g.strokeStyle = OUT
  g.stroke()
  g.restore()
}

export function drawTramp(g: Ctx, sag: number): void {
  const { x, gy, rx, top } = TRAMP
  const y = gy - top
  oval(g, x, gy + 8, rx, 15, 'rgba(30,80,40,0.18)')
  for (const s of [-1, 1]) {
    outlined(g, x + s * (rx - 16), y + 6, x + s * (rx - 6), gy + 6, 6, '#9aa5b5')
    outlined(g, x + s * (rx - 60), y + 16, x + s * (rx - 58), gy + 12, 6, '#9aa5b5')
  }
  g.beginPath()
  g.ellipse(x, y, rx, 27, 0, 0, TAU)
  g.fillStyle = '#4d7dff'
  g.fill()
  g.lineWidth = 4
  g.strokeStyle = OUT
  g.stroke()
  // Spring ticks around the rim.
  g.strokeStyle = '#dfe8ff'
  g.lineWidth = 3
  g.beginPath()
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU
    g.moveTo(x + Math.cos(a) * (rx - 5), y + Math.sin(a) * 23)
    g.lineTo(x + Math.cos(a) * (rx - 17), y + Math.sin(a) * 17)
  }
  g.stroke()
  // The mat dips under a landing.
  g.beginPath()
  g.ellipse(x, y + sag * 0.3, rx - 19, 16 + Math.max(0, sag) * 0.3, 0, 0, TAU)
  g.fillStyle = '#343857'
  g.fill()
  g.lineWidth = 3
  g.strokeStyle = OUT
  g.stroke()
  g.beginPath()
  g.ellipse(x, y + sag * 0.75, 30, 7, 0, 0, TAU)
  g.fillStyle = '#ffd23f'
  g.fill()
}

export function drawSwing(g: Ctx, ang: number): void {
  const [sx, sy] = swingSeat(ang)
  const c = Math.cos(ang)
  const n = Math.sin(ang)
  g.lineCap = 'round'
  g.strokeStyle = '#7a5a3a'
  g.lineWidth = 5
  g.beginPath()
  for (const s of [-1, 1]) {
    g.moveTo(SWING.px + s * 14, SWING.py + 6)
    g.lineTo(sx + s * 26 * c, sy - s * 26 * n)
  }
  g.stroke()
  g.save()
  g.translate(sx, sy)
  g.rotate(-ang)
  box(g, -34, -2, 68, 13, 6, '#ff5a4f')
  g.restore()
}

// Arcs of droplets fanning out of the sprinkler. One path, one fill.
export function drawWater(g: Ctx, t: number, gush: number): void {
  const ox = SPRINK.x
  const oy = SPRINK.y - 20
  const grav = 1100
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.27 + Math.sin(t * 1.3) * 0.12
    const sp = (470 + gush * 240) * (1 - Math.abs(i - 2) * 0.04)
    const vx = Math.sin(a) * sp
    const vy = Math.cos(a) * sp
    const life = (2 * vy) / grav + 0.05
    for (let k = 0; k < 8; k++) {
      const u = (t * 0.8 + k / 8 + i * 0.37) % 1
      const tt = u * life
      const x = ox + vx * tt
      const y = oy - vy * tt + 0.5 * grav * tt * tt
      const r = 7.5 - u * 3
      g.moveTo(x + r, y)
      g.arc(x, y, r, 0, TAU)
    }
  }
  g.fillStyle = 'rgba(150,218,255,0.92)'
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.95)'
  g.lineWidth = 2
  g.stroke()
  // Thin streams under the droplets so the fan reads as arcs.
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.27 + Math.sin(t * 1.3) * 0.12
    const sp = (470 + gush * 240) * (1 - Math.abs(i - 2) * 0.04)
    const vx = Math.sin(a) * sp
    const vy = Math.cos(a) * sp
    const life = (2 * vy) / grav + 0.05
    g.moveTo(ox, oy)
    g.quadraticCurveTo(ox + vx * life * 0.5, oy - vy * life * 0.5, ox + vx * life, oy - vy * life + 0.5 * grav * life * life)
  }
  g.strokeStyle = 'rgba(190,232,255,0.5)'
  g.lineWidth = 4
  g.stroke()
}

// The ice-cream cart. `x` is its centre; the wheels turn as it rolls and the
// bell swings when `ring` is kicked.
export function drawCart(g: Ctx, x: number, ring: number): void {
  const gy = CART.gy
  oval(g, x, gy + 6, 86, 13, 'rgba(30,80,40,0.18)')
  // Umbrella.
  outlined(g, x - 4, gy - 96, x - 4, gy - 196, 5, '#ffffff')
  g.beginPath()
  g.moveTo(x - 84, gy - 184)
  g.quadraticCurveTo(x - 4, gy - 262, x + 76, gy - 184)
  g.closePath()
  g.fillStyle = '#ff78b4'
  g.fill()
  g.lineWidth = 4
  g.strokeStyle = OUT
  g.stroke()
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.moveTo(x - 32, gy - 184)
  g.quadraticCurveTo(x - 16, gy - 226, x - 4, gy - 222)
  g.quadraticCurveTo(x + 8, gy - 226, x + 24, gy - 184)
  g.closePath()
  g.fill()
  // Body.
  box(g, x - 74, gy - 100, 148, 74, 14, '#fff6fb')
  g.fillStyle = '#7fd8ff'
  for (let i = 0; i < 4; i++) g.fillRect(x - 62 + i * 36, gy - 97, 16, 68)
  box(g, x - 80, gy - 110, 160, 18, 9, '#41c9c0')
  outlined(g, x - 74, gy - 80, x - 104, gy - 104, 6, '#8d9bb0')
  sprite(g, '🍦', x, gy - 62, 46)
  // Bell.
  sprite(g, '🔔', x - 54, gy - 128 - Math.abs(ring) * 6, 34, ring * 0.6)
  // Wheels.
  for (const s of [-1, 1]) {
    const wx = x + s * 46
    const wy = gy - 18
    g.beginPath()
    g.arc(wx, wy, 20, 0, TAU)
    g.fillStyle = '#ffd23f'
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = OUT
    g.stroke()
    g.lineWidth = 3
    g.beginPath()
    const a = (x / 20) % TAU
    for (let k = 0; k < 3; k++) {
      g.moveTo(wx + Math.cos(a + (k * Math.PI) / 3) * 16, wy + Math.sin(a + (k * Math.PI) / 3) * 16)
      g.lineTo(wx - Math.cos(a + (k * Math.PI) / 3) * 16, wy - Math.sin(a + (k * Math.PI) / 3) * 16)
    }
    g.stroke()
  }
}
