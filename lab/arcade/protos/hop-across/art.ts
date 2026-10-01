// Drawing for Hop Across: the frog, the toy traffic, the river things and the
// bugs. Everything is drawn around a "feet" point so it sits on its lane.

import { circle, ellipse, eyes, line, rrect, sprite, squash, star } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'

export type FrogMood = 'happy' | 'wow' | 'yum' | 'dizzy'

const INK = '#1e1428'
const FROG = '#62d13c'
const FROG_DARK = '#3fa62c'
const BELLY = '#d9f7a1'

export interface FrogPose {
  x: number
  // Feet on the ground (before height is taken off).
  y: number
  sx: number
  sy: number
  rot: number
  mood: FrogMood
  lookX: number
  lookY: number
  blink: number
  // 0 on the ground, 1 at the top of a hop: the legs trail.
  air: number
  // Breathing, around 1.
  throat: number
}

export function drawFrog(g: CanvasRenderingContext2D, p: FrogPose): void {
  const { x, y } = p
  g.save()
  if (p.rot !== 0) {
    g.translate(x, y - 32)
    g.rotate(p.rot)
    g.translate(-x, -(y - 32))
  }
  squash(g, x, y, p.sx, p.sy, () => {
    // Back legs: tucked on the ground, trailing in the air.
    const trail = p.air * 16
    for (const side of [-1, 1]) {
      ellipse(g, x + side * 31, y - 11 + trail * 0.5, 17, 11 + trail * 0.4, FROG_DARK, side * (0.5 - p.air * 0.3))
      ellipse(g, x + side * 40, y - 2 + trail, 13, 6, FROG_DARK, side * 0.2)
    }
    // Body and belly.
    ellipse(g, x, y - 31, 41, 31, FROG)
    ellipse(g, x, y - 24, 28, 20 * p.throat, BELLY)
    ellipse(g, x - 18, y - 48, 12, 6, 'rgba(255,255,255,0.28)', -0.5)
    // Front feet.
    for (const side of [-1, 1]) ellipse(g, x + side * 17, y - 3 + trail * 0.3, 10, 6, FROG_DARK)
    // Eye bumps.
    for (const side of [-1, 1]) circle(g, x + side * 20, y - 57, 17, FROG)
    if (p.mood === 'dizzy') {
      g.strokeStyle = INK
      g.lineWidth = 4
      g.lineCap = 'round'
      for (const side of [-1, 1]) {
        const ex = x + side * 20
        g.beginPath()
        g.moveTo(ex - 8, y - 65)
        g.lineTo(ex + 8, y - 49)
        g.moveTo(ex + 8, y - 65)
        g.lineTo(ex - 8, y - 49)
        g.stroke()
      }
    } else {
      eyes(g, x, y - 58, 12, p.lookX, p.lookY, p.blink, 1.68)
    }
    // Cheeks.
    for (const side of [-1, 1]) ellipse(g, x + side * 29, y - 33, 7, 4.5, 'rgba(255,120,150,0.55)')
    // Mouth.
    g.strokeStyle = INK
    g.fillStyle = INK
    g.lineWidth = 3.5
    g.lineCap = 'round'
    g.beginPath()
    if (p.mood === 'wow') {
      g.ellipse(x, y - 34, 9, 11, 0, 0, TAU)
      g.fill()
      ellipse(g, x, y - 29, 5.5, 5, '#ff6b8a')
    } else if (p.mood === 'dizzy') {
      g.moveTo(x - 14, y - 34)
      g.quadraticCurveTo(x - 7, y - 41, x, y - 34)
      g.quadraticCurveTo(x + 7, y - 27, x + 14, y - 34)
      g.stroke()
    } else {
      g.arc(x, y - 44, 17, 0.2 * Math.PI, 0.8 * Math.PI)
      g.stroke()
      if (p.mood === 'yum') ellipse(g, x + 6, y - 25, 5, 6, '#ff6b8a', 0.3)
    }
  })
  g.restore()
}

// Three stars circling a flattened frog's head.
export function drawDizzyStars(g: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  for (let i = 0; i < 3; i++) {
    const a = time * 7 + (i * TAU) / 3
    star(g, x + Math.cos(a) * 46, y - 40 + Math.sin(a) * 12, 10, '#ffe14d', a)
  }
}

export interface CarLook {
  body: string
  dark: string
}

export const CAR_LOOKS: readonly CarLook[] = [
  { body: '#ff5d5d', dark: '#c93a44' },
  { body: '#4db8ff', dark: '#2f86c9' },
  { body: '#ffb02e', dark: '#d9861a' },
  { body: '#b07cff', dark: '#8355cf' },
  { body: '#ff7ac8', dark: '#d14f9c' },
  { body: '#5ed3c0', dark: '#36a391' },
  { body: '#f4f4f8', dark: '#b9bccb' },
]

export const GOLD_LOOK: CarLook = { body: '#ffd83d', dark: '#e0a21a' }

function wheel(g: CanvasRenderingContext2D, x: number, y: number, spin: number): void {
  circle(g, x, y, 14, '#2b2b35')
  circle(g, x, y, 6.5, '#cfd3dd')
  g.strokeStyle = '#8a8fa0'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(x + Math.cos(spin) * 6, y + Math.sin(spin) * 6)
  g.lineTo(x - Math.cos(spin) * 6, y - Math.sin(spin) * 6)
  g.stroke()
}

function honkLines(g: CanvasRenderingContext2D, x: number, y: number, amount: number): void {
  g.strokeStyle = `rgba(255,255,255,${Math.min(1, amount)})`
  g.lineWidth = 5
  g.lineCap = 'round'
  const reach = 14 + (1 - amount) * 16
  for (const a of [-0.5, 0, 0.5]) {
    g.beginPath()
    g.moveTo(x + Math.cos(a) * reach, y + Math.sin(a) * reach)
    g.lineTo(x + Math.cos(a) * (reach + 14), y + Math.sin(a) * (reach + 14))
    g.stroke()
  }
}

export interface VehiclePose {
  x: number
  // Bottom of the wheels.
  y: number
  dir: number
  len: number
  look: CarLook
  truck: boolean
  gold: boolean
  driver: string
  // 0..1: honking and wide-eyed.
  shock: number
  // Small vertical bounce in pixels.
  bounce: number
  time: number
  // 0..1 night: headlights throw a cone.
  night: number
}

export function drawVehicle(g: CanvasRenderingContext2D, v: VehiclePose): void {
  const half = v.len / 2
  g.save()
  g.translate(v.x, v.y)
  g.scale(v.dir, 1)
  ellipse(g, 0, 0, half + 6, 11, 'rgba(0,0,0,0.22)')
  const b = -v.bounce
  const spin = (v.x / 14) * v.dir
  if (v.night > 0.02) {
    g.fillStyle = `rgba(255,240,150,${0.3 * v.night})`
    g.beginPath()
    g.moveTo(half - 4, -32 + b)
    g.lineTo(half + 190, -74 + b)
    g.lineTo(half + 190, 8)
    g.closePath()
    g.fill()
  }
  if (v.truck) {
    // Cargo box behind, cab in front.
    rrect(g, -half, -96 + b, v.len - 74, 76, 10, '#fff7e8')
    rrect(g, -half, -50 + b, v.len - 74, 14, 0, v.look.body)
    sprite(g, v.driver === '🐷' ? '🍎' : '🍌', -half + (v.len - 74) / 2, -72 + b, 34)
    rrect(g, half - 78, -84 + b, 78, 64, 14, v.look.body)
    rrect(g, half - 78, -34 + b, 78, 14, 6, v.look.dark)
    rrect(g, half - 64, -78 + b, 54, 38, 10, '#d6f2ff')
    sprite(g, v.driver, half - 37, -60 + b - v.shock * 4, 36 + v.shock * 10)
    circle(g, half - 5, -32 + b, 6, '#fff3a0')
    wheel(g, -half + 30, -13, spin)
    wheel(g, -half + 66, -13, spin)
    wheel(g, half - 34, -13, spin)
  } else {
    rrect(g, -half + 20, -88 + b, v.len * 0.56, 50, 16, v.look.body)
    rrect(g, -half, -52 + b, v.len, 34, 14, v.look.body)
    rrect(g, -half, -32 + b, v.len, 14, 7, v.look.dark)
    rrect(g, -half + 27, -82 + b, v.len * 0.56 - 14, 36, 11, '#d6f2ff')
    sprite(g, v.driver, -half + 20 + v.len * 0.28, -62 + b - v.shock * 4, 36 + v.shock * 10)
    circle(g, half - 7, -40 + b, 6.5, '#fff3a0')
    rrect(g, -half - 1, -46 + b, 7, 11, 3, '#ff4d5a')
    wheel(g, -half + 30, -13, spin)
    wheel(g, half - 30, -13, spin)
    if (v.gold) {
      ellipse(g, -half + 40, -46 + b, 22, 4, 'rgba(255,255,255,0.7)')
      for (let i = 0; i < 3; i++) {
        const a = v.time * 3 + i * 2.1
        star(g, Math.cos(a) * (half + 4), -50 + Math.sin(a * 1.3) * 34, 8 + Math.sin(v.time * 9 + i) * 3, '#fffbe0', a)
      }
    }
  }
  if (v.shock > 0.05) honkLines(g, half + 4, -40 + b, v.shock)
  g.restore()
}

export function drawLog(g: CanvasRenderingContext2D, x: number, y: number, len: number, dip: number): void {
  const half = len / 2
  const top = y - 36 + dip
  ellipse(g, x, y + 8, half + 8, 12, 'rgba(10,60,120,0.28)')
  rrect(g, x - half, top, len, 46, 23, '#9a5f33')
  rrect(g, x - half + 6, top + 3, len - 12, 17, 9, '#bf8450')
  g.strokeStyle = '#7d4a26'
  g.lineWidth = 3
  g.lineCap = 'round'
  for (let i = 1; i < len / 70; i++) {
    const lx = x - half + i * 70 - 12
    g.beginPath()
    g.moveTo(lx, top + 27)
    g.lineTo(lx + 26, top + 27)
    g.stroke()
  }
  ellipse(g, x + half - 12, top + 23, 11, 21, '#e7bb84')
  g.strokeStyle = '#b98a55'
  g.lineWidth = 2.5
  g.beginPath()
  g.ellipse(x + half - 12, top + 23, 5.5, 11, 0, 0, TAU)
  g.stroke()
}

export function drawPad(g: CanvasRenderingContext2D, x: number, y: number, dip: number, seed: number, time: number): void {
  const cy = y - 12 + dip
  const rot = Math.sin(time * 0.8 + seed * 9) * 0.12 + seed * 5
  ellipse(g, x, cy + 8, 46, 28, 'rgba(10,60,120,0.25)')
  g.save()
  g.translate(x, cy)
  g.scale(1, 0.66)
  g.rotate(rot)
  g.beginPath()
  g.moveTo(0, 0)
  g.arc(0, 0, 45, 0.25, TAU - 0.25)
  g.closePath()
  g.fillStyle = '#35a84b'
  g.fill()
  g.beginPath()
  g.moveTo(0, 0)
  g.arc(0, 0, 35, 0.4, TAU - 0.4)
  g.closePath()
  g.fillStyle = '#5ccb62'
  g.fill()
  g.restore()
  if (seed > 0.7) sprite(g, '🌸', x + 26, cy - 14, 26)
}

export function drawBug(g: CanvasRenderingContext2D, x: number, y: number, time: number, seed: number, scale = 1): void {
  const pulse = 0.5 + 0.5 * Math.sin(time * 5 + seed * 20)
  circle(g, x, y + 4 * scale, (20 + pulse * 7) * scale, `rgba(255,236,110,${0.22 + pulse * 0.16})`)
  const flap = Math.sin(time * 40 + seed * 9) * 0.5
  for (const side of [-1, 1]) ellipse(g, x + side * 10 * scale, y - 9 * scale, 12 * scale, 6 * scale, 'rgba(255,255,255,0.8)', side * (0.5 + flap))
  ellipse(g, x, y + 5 * scale, 8 * scale, 9 * scale, '#ffe44d')
  ellipse(g, x, y - 3 * scale, 8.5 * scale, 8 * scale, '#3a2c4a')
  circle(g, x - 3.2 * scale, y - 5 * scale, 2.4 * scale, '#ffffff')
  circle(g, x + 3.2 * scale, y - 5 * scale, 2.4 * scale, '#ffffff')
}

const TRAIN_COLORS = ['#e8483f', '#4db8ff', '#ffb02e', '#5ed36a', '#b07cff']
export const TRAIN_CAR = 270
export const TRAIN_CARS = 5

// `x` is the nose; the train trails behind it, away from `dir`.
export function drawTrain(g: CanvasRenderingContext2D, x: number, y: number, dir: number): void {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  for (let i = TRAIN_CARS - 1; i >= 0; i--) {
    const left = -(i + 1) * TRAIN_CAR + 12
    const color = TRAIN_COLORS[i % TRAIN_COLORS.length]!
    ellipse(g, left + 125, 2, 132, 11, 'rgba(0,0,0,0.22)')
    rrect(g, left - 14, -30, 16, 8, 2, '#3a3a46')
    if (i === 0) {
      rrect(g, left, -78, 250, 62, 14, color)
      rrect(g, left, -118, 96, 60, 12, color)
      rrect(g, left + 14, -106, 60, 34, 8, '#d6f2ff')
      sprite(g, '🐵', left + 44, -88, 30)
      rrect(g, left + 150, -112, 34, 40, 6, '#3a3a46')
      rrect(g, left + 142, -122, 50, 14, 6, '#3a3a46')
      circle(g, left + 246, -48, 11, '#fff3a0')
      g.fillStyle = '#ffd83d'
      g.beginPath()
      g.moveTo(left + 250, -30)
      g.lineTo(left + 278, -2)
      g.lineTo(left + 236, -2)
      g.closePath()
      g.fill()
    } else {
      rrect(g, left, -104, 250, 88, 14, color)
      rrect(g, left, -104, 250, 18, 9, 'rgba(255,255,255,0.35)')
      for (let w = 0; w < 3; w++) rrect(g, left + 22 + w * 76, -78, 54, 34, 8, '#d6f2ff')
    }
    for (const wx of [40, 100, 160, 215]) circle(g, left + wx, -13, 13, '#2b2b35')
  }
  g.restore()
}

// A level-crossing lamp post; `flash` is 0 (off) or 1/2 (which lamp is lit).
export function drawSignal(g: CanvasRenderingContext2D, x: number, y: number, flash: number): void {
  line(g, x, y, x, y - 86, '#4a4e5e', 8)
  rrect(g, x - 30, y - 112, 60, 32, 12, '#2b2b35')
  circle(g, x - 14, y - 96, 10, flash === 1 ? '#ff3b3b' : '#6b2a2a')
  circle(g, x + 14, y - 96, 10, flash === 2 ? '#ff3b3b' : '#6b2a2a')
  if (flash === 1) circle(g, x - 14, y - 96, 18, 'rgba(255,60,60,0.35)')
  if (flash === 2) circle(g, x + 14, y - 96, 18, 'rgba(255,60,60,0.35)')
}
