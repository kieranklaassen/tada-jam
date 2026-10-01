// Everything Slingshot Smash draws: the meadow, the slingshot, the blocks, the
// creatures you fling and the jelly monsters you fling them at.

import { circle, ellipse, eyes, face, line, rrect, sprite, star } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Material, ShotKind } from './towers.ts'

export const GROUND = 700
// Where the pouch rests between the fork tips.
export const REST = { x: 212, y: 546 }
const FORK_BACK = { x: 242, y: 530 }
const FORK_FRONT = { x: 184, y: 526 }
const NECK = { x: 212, y: 622 }

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

// The static meadow, painted once.
export function makeBackdrop(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')
  if (!g) return canvas
  const r = lcg(7)

  const skyGrad = g.createLinearGradient(0, 0, 0, GROUND)
  skyGrad.addColorStop(0, '#3fb2f2')
  skyGrad.addColorStop(0.6, '#a5e2ff')
  skyGrad.addColorStop(1, '#e9f9ff')
  g.fillStyle = skyGrad
  g.fillRect(0, 0, W, H)

  // Sun with a soft glow.
  const glow = g.createRadialGradient(520, 120, 20, 520, 120, 190)
  glow.addColorStop(0, 'rgba(255,250,200,0.95)')
  glow.addColorStop(1, 'rgba(255,250,200,0)')
  g.fillStyle = glow
  g.fillRect(320, -80, 400, 400)
  circle(g, 520, 120, 52, '#fff3a6')
  circle(g, 520, 120, 42, '#ffe766')

  // Far hills, hazy, then nearer ones.
  ellipse(g, 180, 760, 460, 300, '#b5e8c4')
  ellipse(g, 760, 800, 560, 330, '#a6e2b6')
  ellipse(g, 1150, 760, 360, 270, '#b5e8c4')
  g.globalAlpha = 0.75
  sprite(g, '🏰', 392, 468, 74)
  g.globalAlpha = 1
  ellipse(g, 420, 800, 420, 290, '#8fd98c')
  ellipse(g, -40, 790, 330, 260, '#84d37f')
  ellipse(g, 1010, 830, 520, 270, '#84d37f')
  sprite(g, '🌳', 66, 560, 96)
  sprite(g, '🌲', 548, 592, 70)
  sprite(g, '🌳', 470, 600, 58)
  sprite(g, '🌲', 1128, 596, 76)

  // The field everything stands on.
  const grass = g.createLinearGradient(0, GROUND - 40, 0, H)
  grass.addColorStop(0, '#79d65a')
  grass.addColorStop(0.4, '#5cc044')
  grass.addColorStop(1, '#3c9a34')
  g.fillStyle = grass
  g.beginPath()
  g.moveTo(0, GROUND)
  g.lineTo(W, GROUND)
  g.lineTo(W, H)
  g.lineTo(0, H)
  g.closePath()
  g.fill()
  g.fillStyle = '#93e66c'
  g.fillRect(0, GROUND, W, 7)
  // Tufts along the edge and scattered through the grass.
  for (let i = 0; i < 90; i++) {
    const x = r() * W
    const onEdge = i < 46
    const y = onEdge ? GROUND + 2 : GROUND + 16 + r() * 96
    const s = 7 + r() * 9
    g.fillStyle = onEdge ? '#6fcf4f' : r() < 0.5 ? '#4fb33c' : '#7bd85c'
    g.beginPath()
    g.moveTo(x - s * 0.7, y)
    g.lineTo(x - s * 0.3, y - s * 1.3)
    g.lineTo(x, y - s * 0.2)
    g.lineTo(x + s * 0.35, y - s * 1.6)
    g.lineTo(x + s * 0.7, y)
    g.closePath()
    g.fill()
  }
  for (let i = 0; i < 9; i++) sprite(g, r() < 0.5 ? '🌼' : '🌸', 30 + r() * (W - 60), GROUND + 34 + r() * 70, 20 + r() * 8)
  return canvas
}

export function drawCloud(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  g.fillStyle = 'rgba(255,255,255,0.92)'
  g.beginPath()
  g.arc(x - 46 * s, y + 8 * s, 30 * s, 0, TAU)
  g.arc(x - 10 * s, y - 12 * s, 40 * s, 0, TAU)
  g.arc(x + 34 * s, y, 34 * s, 0, TAU)
  g.arc(x + 66 * s, y + 12 * s, 24 * s, 0, TAU)
  g.rect(x - 50 * s, y + 8 * s, 120 * s, 28 * s)
  g.fill()
}

const blockCache = new Map<string, HTMLCanvasElement>()
export const BLOCK_PAD = 4

// A block painted once per material and size, then stamped with a rotation.
export function blockSprite(mat: Material, w: number, h: number): HTMLCanvasElement {
  const key = `${mat}-${w}-${h}`
  const hit = blockCache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = w + BLOCK_PAD * 2
  canvas.height = h + BLOCK_PAD * 2
  blockCache.set(key, canvas)
  const g = canvas.getContext('2d')
  if (!g) return canvas
  g.translate(BLOCK_PAD, BLOCK_PAD)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const r = lcg(w * 31 + h * 7)
  const wide = w >= h
  if (mat === 'wood') {
    rrect(g, 2, 2, w - 4, h - 4, 6, '#e0a661', '#8a5426', 4)
    g.strokeStyle = '#c58a47'
    g.lineWidth = 2.5
    const lanes = Math.max(1, Math.round((wide ? h : w) / 14) - 1)
    for (let i = 1; i <= lanes; i++) {
      const o = ((wide ? h : w) * i) / (lanes + 1)
      const a = 8 + r() * 10
      const b = (wide ? w : h) - 8 - r() * 10
      g.beginPath()
      if (wide) {
        g.moveTo(a, o)
        g.quadraticCurveTo((a + b) / 2, o + (r() - 0.5) * 6, b, o)
      } else {
        g.moveTo(o, a)
        g.quadraticCurveTo(o + (r() - 0.5) * 6, (a + b) / 2, o, b)
      }
      g.stroke()
    }
    g.fillStyle = 'rgba(255,240,200,0.35)'
    if (wide) g.fillRect(8, 5, w - 16, 3)
    else g.fillRect(5, 8, 3, h - 16)
  } else if (mat === 'ice') {
    rrect(g, 2, 2, w - 4, h - 4, 7, 'rgba(178,230,255,0.86)', '#57aee6', 4)
    g.save()
    g.beginPath()
    g.roundRect(4, 4, w - 8, h - 8, 5)
    g.clip()
    g.strokeStyle = 'rgba(255,255,255,0.8)'
    g.lineWidth = 5
    const span = Math.max(w, h)
    for (const o of [0.22, 0.34, 0.75]) {
      g.beginPath()
      g.moveTo(span * o * 2 - h, h + 4)
      g.lineTo(span * o * 2, -4)
      g.stroke()
    }
    g.restore()
  } else {
    rrect(g, 2, 2, w - 4, h - 4, 8, '#a9afb9', '#565b65', 4)
    for (let i = 0; i < Math.round((w * h) / 420); i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(80,86,96,0.35)' : 'rgba(255,255,255,0.3)'
      g.beginPath()
      g.arc(8 + r() * (w - 16), 8 + r() * (h - 16), 2 + r() * 3, 0, TAU)
      g.fill()
    }
    g.fillStyle = 'rgba(255,255,255,0.28)'
    g.fillRect(9, 5, w - 18, 3)
  }
  return canvas
}

function beam(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number): void {
  line(g, x1, y1, x2, y2, '#5a3412', width + 8)
  line(g, x1, y1, x2, y2, '#a06c38', width)
  line(g, x1 - width * 0.22, y1, x2 - width * 0.22, y2, '#bd8a52', width * 0.28)
}

// The far band and the whole wooden fork: drawn before the creature.
export function drawSlingBack(g: CanvasRenderingContext2D, px: number, py: number, stretch: number): void {
  line(g, FORK_BACK.x, FORK_BACK.y + 6, px + 6, py + 6, '#4a1414', 11 - stretch * 4)
  beam(g, NECK.x + 4, NECK.y, FORK_BACK.x, FORK_BACK.y, 16)
  beam(g, NECK.x, GROUND + 8, NECK.x, NECK.y, 20)
  beam(g, NECK.x - 2, NECK.y, FORK_FRONT.x, FORK_FRONT.y, 16)
  line(g, FORK_BACK.x - 8, FORK_BACK.y + 4, FORK_BACK.x + 8, FORK_BACK.y + 8, '#4a1414', 7)
  ellipse(g, NECK.x, GROUND + 8, 30, 9, '#4fae3c')
}

// The near band and the leather pouch: drawn over the creature's tummy.
export function drawSlingFront(g: CanvasRenderingContext2D, px: number, py: number, stretch: number): void {
  line(g, FORK_FRONT.x, FORK_FRONT.y + 6, px - 4, py + 10, '#7a2222', 11 - stretch * 4)
  line(g, FORK_FRONT.x - 8, FORK_FRONT.y + 8, FORK_FRONT.x + 8, FORK_FRONT.y + 4, '#7a2222', 7)
  ellipse(g, px - 2, py + 11, 15, 9, '#5a3412')
  ellipse(g, px - 2, py + 10, 11, 5.5, '#8a5a30')
}

// Stretch along an angle without rotating what is drawn.
export function stretchAlong(g: CanvasRenderingContext2D, x: number, y: number, angle: number, s: number, fn: () => void): void {
  g.save()
  g.translate(x, y)
  g.rotate(angle)
  g.scale(s, 1 / Math.sqrt(s))
  g.rotate(-angle)
  g.translate(-x, -y)
  fn()
  g.restore()
}

const SHOT_COLORS: Record<ShotKind, { fill: string; edge: string; belly: string }> = {
  basic: { fill: '#ff6a3d', edge: '#a82c12', belly: '#ffc29a' },
  split: { fill: '#3f9dff', edge: '#1b55b8', belly: '#bfe2ff' },
  mini: { fill: '#3f9dff', edge: '#1b55b8', belly: '#bfe2ff' },
  bomb: { fill: '#4a4458', edge: '#1f1b29', belly: '#77708a' },
  heavy: { fill: '#d63d5e', edge: '#7d1430', belly: '#ff9db0' },
}

export interface ShotLook {
  rot: number
  mood: Mood
  lookX: number
  lookY: number
  blink: number
  time: number
}

// One of the creatures you fling. (x, y) is the centre of its round body.
export function drawShot(g: CanvasRenderingContext2D, type: ShotKind, x: number, y: number, r: number, look: ShotLook): void {
  const c = SHOT_COLORS[type]
  g.save()
  g.translate(x, y)
  if (look.rot) g.rotate(look.rot)
  const edge = Math.max(3, r * 0.13)
  if (type === 'basic') {
    line(g, 0, -r * 0.9, -r * 0.3, -r * 1.45, c.edge, r * 0.26)
    line(g, 0, -r * 0.9, r * 0.22, -r * 1.38, c.edge, r * 0.26)
    line(g, 0, -r * 0.9, -r * 0.3, -r * 1.45, c.fill, r * 0.13)
    line(g, 0, -r * 0.9, r * 0.22, -r * 1.38, c.fill, r * 0.13)
  } else if (type === 'split' || type === 'mini') {
    g.fillStyle = c.edge
    g.beginPath()
    for (const a of [-0.55, 0, 0.55]) {
      const bx = Math.sin(a) * r * 0.9
      const by = -Math.cos(a) * r * 0.9
      g.moveTo(bx - r * 0.22, by + r * 0.1)
      g.lineTo(Math.sin(a) * r * 1.55, -Math.cos(a) * r * 1.55)
      g.lineTo(bx + r * 0.22, by + r * 0.1)
    }
    g.fill()
  } else if (type === 'bomb') {
    line(g, 0, -r * 0.9, r * 0.34, -r * 1.42, '#c9a26b', r * 0.18)
    const flick = 0.75 + 0.35 * Math.sin(look.time * 31)
    star(g, r * 0.36, -r * 1.48, r * 0.42 * flick, '#ff9d2e', look.time * 9)
    star(g, r * 0.36, -r * 1.48, r * 0.24 * flick, '#fff3a6', -look.time * 7)
  } else {
    circle(g, -r * 0.66, -r * 0.72, r * 0.26, c.fill, c.edge, edge)
    circle(g, r * 0.66, -r * 0.72, r * 0.26, c.fill, c.edge, edge)
  }
  circle(g, 0, 0, r, c.fill, c.edge, edge)
  ellipse(g, 0, r * 0.42, r * 0.6, r * 0.42, c.belly)
  ellipse(g, -r * 0.42, -r * 0.55, r * 0.26, r * 0.14, 'rgba(255,255,255,0.5)', -0.6)
  const es = r * 0.24
  face(g, 0, -r * 0.14, es, look.mood, look.lookX, look.lookY, look.blink)
  if (type === 'bomb' || type === 'heavy') {
    g.strokeStyle = '#1e1428'
    g.lineWidth = Math.max(2.5, es * 0.4)
    g.lineCap = 'round'
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * es * 2.2, -r * 0.14 - es * 1.8)
      g.lineTo(side * es * 0.5, -r * 0.14 - es * 1.15)
      g.stroke()
    }
  }
  g.restore()
}

export const JELLY_COLORS = [
  { fill: '#7fe36c', edge: '#2f9a3a', light: '#c9f7bd' },
  { fill: '#ff8fd3', edge: '#c0428f', light: '#ffd2ee' },
  { fill: '#63e2d2', edge: '#1f9488', light: '#c4f6ef' },
  { fill: '#b594ff', edge: '#6a45cf', light: '#e2d6ff' },
]

export type JellyMood = 'smug' | 'wow' | 'yum' | 'dizzy'

// A gumdrop jelly monster. (x, y) is the centre of its physics circle; it
// squashes from its base.
export function drawJelly(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hue: number,
  sx: number,
  sy: number,
  mood: JellyMood,
  lookX: number,
  lookY: number,
  blink: number,
  wiggle: number,
): void {
  const c = JELLY_COLORS[hue % JELLY_COLORS.length]!
  g.save()
  g.translate(x, y + r)
  g.scale(sx, sy)
  g.translate(0, -r)
  g.beginPath()
  g.moveTo(-r * 1.04, r * 0.62)
  g.bezierCurveTo(-r * 1.14, -r * 0.72, -r * 0.58, -r * 1.14, wiggle * r * 0.12, -r * 1.14)
  g.bezierCurveTo(r * 0.58, -r * 1.14, r * 1.14, -r * 0.72, r * 1.04, r * 0.62)
  const lobe = (r * 2.08) / 3
  for (let i = 0; i < 3; i++) {
    const x1 = r * 1.04 - lobe * i
    g.quadraticCurveTo(x1 - lobe / 2, r * 1.42, x1 - lobe, r * 0.62)
  }
  g.closePath()
  g.globalAlpha = 0.93
  g.fillStyle = c.fill
  g.fill()
  g.globalAlpha = 1
  g.lineWidth = r * 0.14
  g.strokeStyle = c.edge
  g.stroke()
  ellipse(g, 0, r * 0.3, r * 0.62, r * 0.4, c.light)
  ellipse(g, -r * 0.5, -r * 0.62, r * 0.24, r * 0.13, 'rgba(255,255,255,0.75)', -0.7)
  const es = r * 0.25
  const ey = -r * 0.22
  if (mood === 'smug') {
    eyes(g, 0, ey, es, lookX, lookY, Math.max(0.42, blink))
    // Heavy lids and a lopsided smirk.
    g.strokeStyle = '#1e1428'
    g.lineCap = 'round'
    g.lineWidth = Math.max(2.5, es * 0.36)
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * es * 1.15 - es * 1.05, ey - es * 0.62)
      g.lineTo(side * es * 1.15 + es * 1.05, ey - es * (side < 0 ? 0.62 : 0.95))
      g.stroke()
    }
    g.lineWidth = Math.max(2.5, es * 0.3)
    g.beginPath()
    g.moveTo(-es * 0.9, ey + es * 1.9)
    g.quadraticCurveTo(es * 0.5, ey + es * 2.7, es * 1.3, ey + es * 1.35)
    g.stroke()
  } else {
    face(g, 0, ey, es, mood, lookX, lookY, blink)
  }
  g.restore()
}
