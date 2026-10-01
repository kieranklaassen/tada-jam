// Drawing for Campfire Nights: cached pine sprites and ground, the camper, the
// fire with a face, shadow critters, and the things you build. Nothing here
// touches the DOM until it is called from `create`.

import { circle, ellipse, face, line, rrect, shadow, sprite, squash, volume } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.lineJoin = 'round'
  g.lineCap = 'round'
  return [c, g]
}

// ---------------------------------------------------------------- pines

export interface PinePalette {
  trunk: string
  tiers: readonly [string, string, string]
  line: string
  light: string
}

export const PINE_NEAR: PinePalette = { trunk: '#94613a', tiers: ['#2c8a4c', '#36a15a', '#46ba6a'], line: '#1b5535', light: 'rgba(255,255,255,0.17)' }
export const PINE_MID: PinePalette = { trunk: '#4d3625', tiers: ['#1f6b45', '#23774b', '#298553'], line: '#124330', light: 'rgba(255,255,255,0.07)' }
export const PINE_FAR: PinePalette = { trunk: '#2e241d', tiers: ['#15533c', '#185c41', '#1b6647'], line: '#0d3628', light: 'rgba(255,255,255,0.04)' }

export const PINE_W = 160
export const PINE_H = 210
// The base of the trunk inside the sprite.
export const PINE_BASE_Y = 202

export function pineSprite(p: PinePalette): HTMLCanvasElement {
  const [c, g] = makeCanvas(PINE_W, PINE_H)
  g.fillStyle = p.trunk
  g.strokeStyle = p.line
  g.lineWidth = 4
  g.beginPath()
  g.roundRect(68, 150, 24, 50, 7)
  g.fill()
  g.stroke()
  const tiers: readonly (readonly [number, number, number])[] = [
    [162, 70, 76],
    [116, 57, 70],
    [74, 43, 64],
  ]
  tiers.forEach(([baseY, hw, h], i) => {
    const cx = 80
    g.beginPath()
    g.moveTo(cx - hw, baseY)
    g.quadraticCurveTo(cx - hw * 0.3, baseY - h * 0.5, cx, baseY - h)
    g.quadraticCurveTo(cx + hw * 0.3, baseY - h * 0.5, cx + hw, baseY)
    g.quadraticCurveTo(cx, baseY + 20, cx - hw, baseY)
    g.closePath()
    g.fillStyle = p.tiers[i as 0 | 1 | 2]
    g.fill()
    g.stroke()
    g.beginPath()
    g.moveTo(cx - hw * 0.74, baseY - 3)
    g.quadraticCurveTo(cx - hw * 0.3, baseY - h * 0.45, cx - 5, baseY - h * 0.82)
    g.quadraticCurveTo(cx - hw * 0.16, baseY - h * 0.3, cx - hw * 0.74, baseY - 3)
    g.fillStyle = p.light
    g.fill()
  })
  return c
}

export function drawPine(g: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, s: number, rot = 0, sx = 1, sy = 1): void {
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale(s * sx, s * sy)
  g.drawImage(img, -PINE_W / 2, -PINE_BASE_Y)
  g.restore()
}

export function drawStump(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 26 * s, 1, 0.2)
  rrect(g, x - 15 * s, y - 16 * s, 30 * s, 20 * s, 6 * s, '#94613a', '#5d3a20', 3)
  ellipse(g, x, y - 15 * s, 15 * s, 7 * s, '#e6bb84')
  g.strokeStyle = '#b98752'
  g.lineWidth = 2
  g.beginPath()
  g.ellipse(x, y - 15 * s, 8 * s, 3.5 * s, 0, 0, TAU)
  g.stroke()
}

// ---------------------------------------------------------------- ground

export function paintGround(rand: () => number, fireX: number, fireY: number, mid: HTMLCanvasElement, far: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = makeCanvas(W, H)
  g.save()
  g.translate(fireX, fireY)
  g.scale(1, 0.72)
  const grad = g.createRadialGradient(0, 0, 60, 0, 0, 700)
  grad.addColorStop(0, '#9adf7a')
  grad.addColorStop(0.42, '#74c866')
  grad.addColorStop(0.8, '#479f54')
  grad.addColorStop(1, '#357f48')
  g.fillStyle = grad
  g.fillRect(-W, -H * 2, W * 2, H * 4)
  g.restore()

  // Mown-looking patches so the grass is not one flat wash.
  for (let i = 0; i < 26; i++) {
    const x = rand() * W
    const y = 130 + rand() * (H - 130)
    ellipse(g, x, y, 50 + rand() * 80, 18 + rand() * 26, rand() < 0.5 ? 'rgba(255,255,200,0.06)' : 'rgba(20,80,40,0.07)', rand() * 0.6 - 0.3)
  }

  // Trodden dirt around the fire.
  for (let i = 0; i < 10; i++) {
    const a = rand() * TAU
    ellipse(g, fireX + Math.cos(a) * 46, fireY + 6 + Math.sin(a) * 26, 70 + rand() * 40, 40 + rand() * 24, 'rgba(203,165,110,0.3)')
  }
  ellipse(g, fireX, fireY + 4, 92, 56, '#cfa873')
  ellipse(g, fireX, fireY + 4, 62, 36, '#c09863')

  const greens = ['#3c9149', '#5dba5e', '#2f7f44', '#86d974']
  for (let i = 0; i < 340; i++) {
    const x = rand() * W
    const y = 130 + rand() * (H - 140)
    if (Math.hypot(x - fireX, (y - fireY) * 1.5) < 120) continue
    const len = 7 + rand() * 7
    g.strokeStyle = greens[Math.floor(rand() * greens.length)]!
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(x - 5, y)
    g.lineTo(x - 7, y - len * 0.8)
    g.moveTo(x, y)
    g.lineTo(x, y - len)
    g.moveTo(x + 5, y)
    g.lineTo(x + 7, y - len * 0.8)
    g.stroke()
  }

  const petals = ['#ffffff', '#ffe36e', '#ffb3d1', '#c9b6ff']
  for (let i = 0; i < 54; i++) {
    const x = 60 + rand() * (W - 120)
    const y = 150 + rand() * (H - 220)
    if (Math.hypot(x - fireX, (y - fireY) * 1.5) < 130) continue
    const col = petals[Math.floor(rand() * petals.length)]!
    for (let k = 0; k < 5; k++) circle(g, x + Math.cos((k / 5) * TAU) * 4.5, y + Math.sin((k / 5) * TAU) * 4.5, 3.4, col)
    circle(g, x, y, 2.8, '#ffb02e')
  }

  for (let i = 0; i < 9; i++) {
    const x = 80 + rand() * (W - 160)
    const y = 180 + rand() * (H - 300)
    if (Math.hypot(x - fireX, y - fireY) < 140) continue
    const r = 9 + rand() * 9
    ellipse(g, x, y + r * 0.35, r * 1.15, r * 0.45, 'rgba(0,0,0,0.16)')
    ellipse(g, x, y, r, r * 0.72, '#97a1a8')
    ellipse(g, x - r * 0.2, y - r * 0.25, r * 0.55, r * 0.3, '#c5ced3')
  }

  for (let i = 0; i < 7; i++) {
    const side = rand() < 0.5 ? 0 : 1
    const x = side ? W - 70 - rand() * 120 : 70 + rand() * 120
    const y = 200 + rand() * (H - 330)
    rrect(g, x - 3, y - 2, 6, 10, 3, '#f6ead6')
    g.beginPath()
    g.ellipse(x, y - 2, 10, 8, 0, Math.PI, TAU)
    g.fillStyle = '#e8443a'
    g.fill()
    circle(g, x - 4, y - 6, 1.8, '#ffffff')
    circle(g, x + 3, y - 5, 1.6, '#ffffff')
  }

  // The forest wall: a far row, a nearer row, and the sides, back to front.
  const border: { x: number; y: number; s: number; img: HTMLCanvasElement }[] = []
  for (let x = -30; x < W + 40; x += 52) border.push({ x: x + rand() * 20, y: 78 + rand() * 22, s: 0.95 + rand() * 0.25, img: far })
  for (let x = -10; x < W + 40; x += 64) border.push({ x: x + rand() * 24, y: 124 + rand() * 24, s: 0.8 + rand() * 0.22, img: mid })
  for (let y = 190; y < H - 30; y += 58) {
    border.push({ x: -14 + rand() * 20, y: y + rand() * 20, s: 0.95 + rand() * 0.2, img: far })
    border.push({ x: W + 14 - rand() * 20, y: y + rand() * 20, s: 0.95 + rand() * 0.2, img: far })
    border.push({ x: 26 + rand() * 26, y: y + 26 + rand() * 20, s: 0.78 + rand() * 0.2, img: mid })
    border.push({ x: W - 26 - rand() * 26, y: y + 26 + rand() * 20, s: 0.78 + rand() * 0.2, img: mid })
  }
  border.sort((a, b) => a.y - b.y)
  for (const b of border) {
    ellipse(g, b.x, b.y, 44 * b.s, 12 * b.s, 'rgba(0,0,0,0.18)')
    drawPine(g, b.img, b.x, b.y, b.s)
  }
  return c
}

// A strip of treetops along the bottom edge, drawn over everything that walks.
export const FRONT_H = 150

export function paintFront(rand: () => number, mid: HTMLCanvasElement, far: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = makeCanvas(W, FRONT_H)
  const row: { x: number; y: number; s: number; img: HTMLCanvasElement }[] = []
  for (let x = -20; x < W + 40; x += 62) row.push({ x: x + rand() * 26, y: FRONT_H + 96 + rand() * 30, s: 0.9 + rand() * 0.25, img: mid })
  for (let x = 10; x < W + 40; x += 70) row.push({ x: x + rand() * 26, y: FRONT_H + 138 + rand() * 20, s: 1 + rand() * 0.2, img: far })
  row.sort((a, b) => a.y - b.y)
  for (const b of row) drawPine(g, b.img, b.x, b.y, b.s)
  return c
}

// ---------------------------------------------------------------- small things

export function drawLog(g: CanvasRenderingContext2D, x: number, y: number, rot = 0, s = 1): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(s, s)
  g.beginPath()
  g.roundRect(-18, -7, 36, 14, 6)
  g.fillStyle = '#a5683a'
  g.fill()
  g.strokeStyle = '#64391b'
  g.lineWidth = 3
  g.stroke()
  g.beginPath()
  g.ellipse(14, 0, 5, 6.5, 0, 0, TAU)
  g.fillStyle = '#ecc590'
  g.fill()
  g.lineWidth = 2
  g.stroke()
  g.strokeStyle = 'rgba(80,44,20,0.5)'
  g.beginPath()
  g.moveTo(-12, -2)
  g.lineTo(2, -2)
  g.moveTo(-8, 3)
  g.lineTo(6, 3)
  g.stroke()
  g.restore()
}

export function drawCone(g: CanvasRenderingContext2D, x: number, y: number, rot: number, s = 1): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(s, s)
  g.beginPath()
  g.ellipse(0, 0, 9, 13, 0, 0, TAU)
  g.fillStyle = '#9a6234'
  g.fill()
  g.strokeStyle = '#4f2d14'
  g.lineWidth = 3
  g.stroke()
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(-7, -4)
  g.quadraticCurveTo(0, 1, 7, -4)
  g.moveTo(-8, 3)
  g.quadraticCurveTo(0, 8, 8, 3)
  g.stroke()
  g.restore()
}

export function drawBush(g: CanvasRenderingContext2D, x: number, y: number, berries: number, wobble: number): void {
  shadow(g, x, y + 4, 40, 1, 0.2)
  squash(g, x, y, 1 / Math.sqrt(wobble), wobble, () => {
    circle(g, x - 20, y - 16, 20, '#2f9150', '#1b5535', 3)
    circle(g, x + 20, y - 16, 20, '#2f9150', '#1b5535', 3)
    circle(g, x, y - 26, 25, '#3aa65c', '#1b5535', 3)
    circle(g, x - 8, y - 32, 9, 'rgba(255,255,255,0.14)')
    const spots: readonly (readonly [number, number])[] = [
      [-19, -18],
      [4, -32],
      [19, -14],
    ]
    for (let i = 0; i < berries && i < spots.length; i++) {
      const [bx, by] = spots[i]!
      circle(g, x + bx, y + by, 8, '#ff4d6d', '#a3172f', 2.5)
      circle(g, x + bx - 2.5, y + by - 2.5, 2.4, '#ffd0d8')
    }
  })
}

// ---------------------------------------------------------------- the fire

function flameShape(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sway: number, fill: string): void {
  g.beginPath()
  g.moveTo(x - w, y - w * 0.3)
  g.bezierCurveTo(x - w * 1.2, y - h * 0.5, x - w * 0.15 + sway * 0.5, y - h * 0.7, x + sway, y - h)
  g.bezierCurveTo(x + w * 0.3 + sway * 0.5, y - h * 0.68, x + w * 1.2, y - h * 0.5, x + w, y - w * 0.3)
  g.quadraticCurveTo(x, y + w * 0.55, x - w, y - w * 0.3)
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

export interface FireLook {
  // 0 is embers, 1 is a full blaze.
  level: number
  // A spring around 1: above 1 just after a log lands.
  kick: number
  time: number
  mood: Mood
  lookX: number
  lookY: number
  out: boolean
}

export function drawFire(g: CanvasRenderingContext2D, x: number, y: number, f: FireLook): void {
  const stones = 9
  const stone = (i: number) => {
    const a = (i / stones) * TAU + 0.2
    const sx = x + Math.cos(a) * 50
    const sy = y + Math.sin(a) * 25
    ellipse(g, sx, sy, 13, 10, i % 2 ? '#8d979e' : '#a2acb2')
    ellipse(g, sx - 2, sy - 3, 7, 4, 'rgba(255,255,255,0.28)')
  }
  for (let i = 0; i < stones; i++) if (Math.sin((i / stones) * TAU + 0.2) < 0) stone(i)
  ellipse(g, x, y, 40, 19, '#3a2a22')
  drawLog(g, x - 4, y - 5, 0.32, 1.25)
  drawLog(g, x + 4, y - 5, -0.34, 1.25)
  if (f.out) {
    for (let i = 0; i < 3; i++) {
      const t = (f.time * 0.7 + i / 3) % 1
      g.globalAlpha = (1 - t) * 0.5
      circle(g, x + Math.sin(f.time * 2 + i * 2) * 10, y - 20 - t * 80, 10 + t * 16, '#c8ccd4')
    }
    g.globalAlpha = 1
  } else {
    const lv = Math.sqrt(Math.max(0.02, f.level))
    const h = (44 + 92 * lv) * f.kick
    const w = (20 + 26 * lv) * (0.6 + 0.4 * f.kick)
    const t = f.time
    const s1 = Math.sin(t * 6.3) * w * 0.22
    const s2 = Math.sin(t * 8.1 + 2) * w * 0.2
    const s3 = Math.sin(t * 10.7 + 4) * w * 0.16
    const warm = f.level < 0.16
    flameShape(g, x, y - 6, w, h * (1 + 0.06 * Math.sin(t * 12.7)), s1, warm ? '#e0502a' : '#ff5a1f')
    flameShape(g, x, y - 5, w * 0.72, h * 0.74 * (1 + 0.08 * Math.sin(t * 15.1 + 1)), s2, '#ff9d1f')
    flameShape(g, x, y - 4, w * 0.44, h * 0.46 * (1 + 0.1 * Math.sin(t * 17.3 + 2)), s3, '#ffe45c')
    const fs = 4.2 + 2.6 * lv
    face(g, x + s2 * 0.3, y - 10 - h * 0.24, fs, f.mood, f.lookX, f.lookY, 0)
  }
  for (let i = 0; i < stones; i++) if (Math.sin((i / stones) * TAU + 0.2) >= 0) stone(i)
}

export function drawTorch(g: CanvasRenderingContext2D, x: number, y: number, time: number, lit: boolean): void {
  shadow(g, x, y + 2, 18, 1, 0.22)
  rrect(g, x - 5, y - 58, 10, 60, 4, '#94613a', '#5d3a20', 3)
  rrect(g, x - 11, y - 66, 22, 12, 5, '#6d7880', '#3d454b', 3)
  if (lit) {
    const h = 34 * (1 + 0.1 * Math.sin(time * 13 + x))
    flameShape(g, x, y - 64, 11, h, Math.sin(time * 7 + x) * 3, '#ff6a1f')
    flameShape(g, x, y - 63, 6.5, h * 0.6, Math.sin(time * 9 + x) * 2, '#ffe45c')
  }
}

// `snap` is 0 when set, 1 just after it fired.
export function drawTrap(g: CanvasRenderingContext2D, x: number, y: number, snap: number, armed: boolean): void {
  ellipse(g, x, y, 40, 21, '#6d7880')
  ellipse(g, x, y, 40, 21, 'rgba(0,0,0,0)')
  g.strokeStyle = '#3d454b'
  g.lineWidth = 3
  g.beginPath()
  g.ellipse(x, y, 40, 21, 0, 0, TAU)
  g.stroke()
  ellipse(g, x, y, 22, 11, armed ? '#ff5d5d' : '#8d979e')
  const teeth = 12
  const tall = armed ? 15 + snap * 16 : 5
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * TAU
    const bx = x + Math.cos(a) * 34
    const by = y + Math.sin(a) * 17
    g.beginPath()
    g.moveTo(bx - 6, by)
    g.lineTo(bx + 6, by)
    g.lineTo(bx - Math.cos(a) * snap * 10, by - tall)
    g.closePath()
    g.fillStyle = '#f4f6f8'
    g.fill()
    g.strokeStyle = '#59636a'
    g.lineWidth = 2
    g.stroke()
  }
}

export function drawFence(g: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number, wobble: number): void {
  const pickets: { x: number; y: number }[] = []
  for (let i = -2; i <= 2; i++) pickets.push({ x: x + tx * i * 22, y: y + ty * i * 22 })
  pickets.sort((a, b) => a.y - b.y)
  const first = pickets[0]!
  const last = pickets[pickets.length - 1]!
  line(g, first.x, first.y - 14, last.x, last.y - 14, '#6b4424', 7)
  line(g, first.x, first.y - 30, last.x, last.y - 30, '#6b4424', 7)
  for (const p of pickets) {
    const lean = wobble * 0.2
    g.save()
    g.translate(p.x, p.y)
    g.rotate(lean)
    g.beginPath()
    g.moveTo(-8, 0)
    g.lineTo(-8, -38)
    g.lineTo(0, -48)
    g.lineTo(8, -38)
    g.lineTo(8, 0)
    g.closePath()
    g.fillStyle = '#c98e55'
    g.fill()
    g.strokeStyle = '#6b4424'
    g.lineWidth = 3
    g.stroke()
    g.restore()
  }
}

export function drawOwl(g: CanvasRenderingContext2D, x: number, y: number, time: number, hoot: number): void {
  shadow(g, x, y + 2, 20, 1, 0.22)
  rrect(g, x - 6, y - 50, 12, 52, 4, '#94613a', '#5d3a20', 3)
  rrect(g, x - 20, y - 54, 40, 9, 4, '#94613a', '#5d3a20', 3)
  const bob = Math.sin(time * 2.4) * 2
  const s = 1 + hoot * 0.25
  sprite(g, '🦉', x, y - 80 + bob - hoot * 8, 62, Math.sin(time * 1.3) * 0.05, s, 2 - s)
}

export function drawTent(g: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  shadow(g, x, y + 4, 60, 1, 0.22)
  sprite(g, '⛺', x, y - 38, 104)
  // A lantern on a hook.
  line(g, x + 52, y - 4, x + 52, y - 58, '#5d3a20', 5)
  line(g, x + 52, y - 58, x + 40, y - 58, '#5d3a20', 5)
  circle(g, x + 40, y - 46 + Math.sin(time * 3) * 1.5, 9, '#ffe45c', '#b3741a', 3)
}

// ---------------------------------------------------------------- the camper

export interface CamperLook {
  jacket: string
  jacketDark: string
  hat: string
  brim: string
  pom: string
  skin: string
}

export const LOOK_CAMPER: CamperLook = { jacket: '#ff5d4d', jacketDark: '#b3332b', hat: '#ffb02e', brim: '#fff0c2', pom: '#ffffff', skin: '#ffd2a8' }
export const LOOK_FRIEND: CamperLook = { jacket: '#4db8ff', jacketDark: '#246a9e', hat: '#7bd88f', brim: '#eafff0', pom: '#ff7ac8', skin: '#e9b48a' }

export interface CamperPose {
  // Feet.
  x: number
  y: number
  hop: number
  stretch: number
  lean: number
  facing: number
  run: number
  moving: number
  mood: Mood
  lookX: number
  lookY: number
  blink: number
  logs: number
  // -1 resting, else 0..1 through a swing.
  swing: number
  // -1 not throwing, else 0..1.
  throwing: number
  shiver: number
  golden: boolean
  time: number
}

function drawAxe(g: CanvasRenderingContext2D, hx: number, hy: number, angle: number, facing: number, golden: boolean): void {
  g.save()
  g.translate(hx, hy)
  g.scale(facing, 1)
  g.rotate(angle)
  line(g, 0, 6, 0, -34, '#7a4a26', 6)
  g.beginPath()
  g.moveTo(-2, -38)
  g.lineTo(18, -44)
  g.quadraticCurveTo(24, -32, 18, -20)
  g.lineTo(-2, -26)
  g.closePath()
  g.fillStyle = golden ? '#ffd23e' : '#cfd8dd'
  g.fill()
  g.strokeStyle = golden ? '#a86a00' : '#56626a'
  g.lineWidth = 3
  g.stroke()
  g.restore()
}

export function drawCamper(g: CanvasRenderingContext2D, look: CamperLook, p: CamperPose): void {
  const x = p.x + (p.shiver > 0 ? Math.sin(p.time * 70) * 2.6 * p.shiver : 0)
  const y = p.y - p.hop
  shadow(g, p.x, p.y + 3, 30, 1 - Math.min(0.5, p.hop / 140))
  const [sx, sy] = volume(p.stretch)
  squash(
    g,
    x,
    y,
    sx,
    sy,
    () => {
      const stride = Math.sin(p.run) * p.moving
      ellipse(g, x - 10, y - 4 - Math.max(0, stride) * 9, 9, 6.5, '#4a3426')
      ellipse(g, x + 10, y - 4 - Math.max(0, -stride) * 9, 9, 6.5, '#4a3426')

      const back = x - p.facing * 5
      rrect(g, back - 17, y - 56, 34, 34, 9, '#8a5a34', '#5d3a20', 3)

      const bob = Math.abs(stride) * 2
      ellipse(g, x, y - 27 - bob, 21, 23, look.jacket)
      g.strokeStyle = look.jacketDark
      g.lineWidth = 3
      g.beginPath()
      g.ellipse(x, y - 27 - bob, 21, 23, 0, 0, TAU)
      g.stroke()
      line(g, x, y - 42 - bob, x, y - 10 - bob, look.jacketDark, 3)

      // Hands: the facing one holds the axe (or throws), the other swings.
      const hy = y - 28 - bob
      const offHand = x - p.facing * 23
      circle(g, offHand, hy - stride * 5, 6.5, look.skin, '#8a5230', 2.5)
      const axeHand = x + p.facing * 24
      if (p.throwing >= 0) {
        const reach = Math.sin(Math.min(1, p.throwing) * Math.PI)
        circle(g, axeHand + p.facing * reach * 12, hy - 10 - reach * 22, 7, look.skin, '#8a5230', 2.5)
      } else {
        const sw = p.swing < 0 ? -0.35 + stride * 0.15 : p.swing < 0.45 ? lerp(-1.9, 1.5, (p.swing / 0.45) ** 2) : lerp(1.5, -0.35, (p.swing - 0.45) / 0.55)
        const ay = hy + stride * 5
        drawAxe(g, axeHand, ay, sw, p.facing, p.golden)
        circle(g, axeHand, ay, 6.5, look.skin, '#8a5230', 2.5)
      }

      const hx = x + p.lookX * 2.5
      const hyHead = y - 64 - bob * 1.3
      circle(g, hx, hyHead, 20, look.skin, '#8a5230', 3)
      circle(g, hx - 12, hyHead + 7, 4.5, 'rgba(255,120,120,0.45)')
      circle(g, hx + 12, hyHead + 7, 4.5, 'rgba(255,120,120,0.45)')
      face(g, hx + p.lookX * 2, hyHead + 1, 4.8, p.mood, p.lookX, p.lookY, p.blink)
      // Beanie.
      g.beginPath()
      g.arc(hx, hyHead - 5, 21, Math.PI * 1.02, Math.PI * 1.98)
      g.closePath()
      g.fillStyle = look.hat
      g.fill()
      g.strokeStyle = '#8a5230'
      g.lineWidth = 3
      g.stroke()
      rrect(g, hx - 23, hyHead - 12, 46, 10, 5, look.brim, '#8a5230', 3)
      if (p.logs <= 0) circle(g, hx - p.lean * 30, hyHead - 28, 7.5, look.pom, '#8a5230', 2.5)
      // The wood rides stacked on the hat and sways a beat late: the taller
      // the stack, the sillier the wobble.
      for (let i = 0; i < p.logs && i < 10; i++) {
        const lag = (Math.sin(p.time * 7 - i * 0.55) * p.moving * 1.6 - p.lean * 22) * (0.4 + i * 0.35)
        drawLog(g, hx + lag + (i % 2 ? 3 : -3), hyHead - 33 - i * 10.5, (i % 2 ? 0.07 : -0.07) + lag * 0.006, 1.05)
      }
    },
    p.lean,
  )
}

// ---------------------------------------------------------------- critters

export function drawCritterBody(g: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, seed: number, fill: string, edge: string): void {
  const cy = y - r * 0.95
  ellipse(g, x - r * 0.4, y - 2, r * 0.26, r * 0.16, edge)
  ellipse(g, x + r * 0.4, y - 2, r * 0.26, r * 0.16, edge)
  g.beginPath()
  const n = 26
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const rr = r * (i % 2 === 0 ? 1.13 + 0.07 * Math.sin(time * 9 + seed + i) : 0.88)
    const px = x + Math.cos(a) * rr
    const py = cy + Math.sin(a) * rr
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.strokeStyle = edge
  g.lineWidth = 3
  g.stroke()
}

export function drawCritterEyes(
  g: CanvasRenderingContext2D,
  x: number,
  cy: number,
  r: number,
  color: string,
  lookX: number,
  lookY: number,
  blink: number,
  angry: boolean,
  glow: number,
): void {
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.42
    const ey = cy - r * 0.06
    if (glow > 0) {
      g.globalAlpha = 0.2 * glow
      circle(g, ex, ey, r * 0.62, color)
      g.globalAlpha = 1
    }
    const open = Math.max(0.1, 1 - blink)
    ellipse(g, ex, ey, r * 0.28, r * 0.34 * open, color)
    if (open > 0.4) ellipse(g, ex + lookX * r * 0.1, ey + lookY * r * 0.1, r * 0.09, r * 0.22 * open, '#160f2b')
    if (angry) line(g, ex + side * r * 0.36, ey - r * 0.46, ex - side * r * 0.3, ey - r * 0.12, '#0b0d22', r * 0.2)
  }
}

export function drawDizzy(g: CanvasRenderingContext2D, x: number, cy: number, r: number): void {
  g.strokeStyle = '#ffffff'
  g.lineWidth = Math.max(2, r * 0.1)
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.42
    g.beginPath()
    g.moveTo(ex - r * 0.2, cy - r * 0.2)
    g.lineTo(ex + r * 0.2, cy + r * 0.2)
    g.moveTo(ex + r * 0.2, cy - r * 0.2)
    g.lineTo(ex - r * 0.2, cy + r * 0.2)
    g.stroke()
  }
}
