// The customers. Each species is a gumdrop body with its own colour, eye
// count, headgear and favourite silly topping; one pose struct drives the
// squash, the look, the mouth and the mood.

import { TAU } from '../../kit/math.ts'
import type { KindKey } from './toppings.ts'

export type MonMood = 'happy' | 'wow' | 'yuck' | 'dizzy' | 'love'

export interface Species {
  body: string
  dark: string
  belly: string
  // Half width and full height.
  w: number
  h: number
  eyes: 1 | 2 | 3
  top: 'horns' | 'antenna' | 'spikes' | 'ears' | 'bunny'
  fur: boolean
  fav: KindKey
  teeth: number
  // Scale step for its voice.
  pitch: number
  huge: boolean
}

export const SPECIES: readonly Species[] = [
  { body: '#9b6bff', dark: '#5b37b8', belly: '#cdb8ff', w: 122, h: 300, eyes: 2, top: 'horns', fur: false, fav: 'worm', teeth: 2, pitch: 0, huge: false },
  { body: '#5fd068', dark: '#2a8a3a', belly: '#c4f5b8', w: 106, h: 318, eyes: 1, top: 'antenna', fur: false, fav: 'eyeball', teeth: 3, pitch: 3, huge: false },
  { body: '#ff9a3c', dark: '#c4601a', belly: '#ffd9a8', w: 134, h: 282, eyes: 3, top: 'spikes', fur: false, fav: 'sock', teeth: 4, pitch: -2, huge: false },
  { body: '#4db8ff', dark: '#1f78c2', belly: '#cdeaff', w: 124, h: 300, eyes: 2, top: 'ears', fur: true, fav: 'slime', teeth: 2, pitch: 1, huge: false },
  { body: '#ff7ac8', dark: '#c2408c', belly: '#ffd0ea', w: 102, h: 272, eyes: 2, top: 'bunny', fur: false, fav: 'gummy', teeth: 1, pitch: 5, huge: false },
  { body: '#ff5d5d', dark: '#a82626', belly: '#ffb9a8', w: 158, h: 345, eyes: 2, top: 'horns', fur: true, fav: 'sock', teeth: 5, pitch: -5, huge: true },
]

export interface Pose {
  x: number
  // Where its feet are (below the counter edge, so the counter hides them).
  base: number
  sx: number
  sy: number
  lean: number
  // 0 shut .. 1 wide open.
  mouth: number
  mood: MonMood
  lookX: number
  lookY: number
  blink: number
  // Colour wash over the body (slime green, burnt red) and how strong.
  tint: string
  tintAmount: number
  eyeScale: number
  drool: number
  time: number
}

export function faceY(sp: Species, base: number): number {
  return base - sp.h * 0.64
}

export function mouthY(sp: Species, base: number): number {
  return faceY(sp, base) + (sp.eyes === 1 ? 82 : 66)
}

function bodyPath(g: CanvasRenderingContext2D, sp: Species, x: number, base: number): void {
  const n = 56
  g.beginPath()
  g.moveTo(x - sp.w, base + 30)
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI
    const c = Math.cos(a)
    const s = Math.sin(a)
    const fur = sp.fur && i % 2 === 1 && i > 3 && i < n - 3 ? 1.05 : 1
    g.lineTo(x + Math.sign(c) * Math.abs(c) ** 0.7 * sp.w * fur, base - Math.abs(s) ** 0.8 * sp.h * fur)
  }
  g.lineTo(x + sp.w, base + 30)
  g.closePath()
}

function tri(g: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, fill: string, stroke?: string): void {
  g.beginPath()
  g.moveTo(ax, ay)
  g.lineTo(bx, by)
  g.lineTo(cx, cy)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  if (stroke) {
    g.lineWidth = 5
    g.lineJoin = 'round'
    g.strokeStyle = stroke
    g.stroke()
  }
}

function eye(g: CanvasRenderingContext2D, x: number, y: number, r: number, p: Pose): void {
  const open = p.mood === 'yuck' ? 0.5 : Math.max(0.08, 1 - p.blink)
  g.beginPath()
  g.ellipse(x, y, r, r * open, 0, 0, TAU)
  g.fillStyle = '#ffffff'
  g.fill()
  g.lineWidth = Math.max(3, r * 0.16)
  g.strokeStyle = '#2b1d3a'
  g.stroke()
  if (p.mood === 'dizzy') {
    g.lineWidth = r * 0.26
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x - r * 0.5, y - r * 0.5)
    g.lineTo(x + r * 0.5, y + r * 0.5)
    g.moveTo(x + r * 0.5, y - r * 0.5)
    g.lineTo(x - r * 0.5, y + r * 0.5)
    g.stroke()
    return
  }
  if (p.mood === 'love') {
    const hr = r * 0.5 * (1 + Math.sin(p.time * 10) * 0.12)
    g.beginPath()
    g.moveTo(x, y + hr * 0.9)
    g.bezierCurveTo(x - hr * 1.6, y - hr * 0.2, x - hr * 0.7, y - hr * 1.3, x, y - hr * 0.4)
    g.bezierCurveTo(x + hr * 0.7, y - hr * 1.3, x + hr * 1.6, y - hr * 0.2, x, y + hr * 0.9)
    g.fillStyle = '#ff3b6b'
    g.fill()
    return
  }
  if (open < 0.3) return
  const pr = r * (p.mood === 'wow' ? 0.36 : 0.52)
  const px = x + p.lookX * r * 0.42
  const py = y + p.lookY * r * 0.42 * open
  g.beginPath()
  g.arc(px, py, pr, 0, TAU)
  g.fillStyle = '#1e1428'
  g.fill()
  g.beginPath()
  g.arc(px - pr * 0.3, py - pr * 0.35, pr * 0.34, 0, TAU)
  g.fillStyle = '#ffffff'
  g.fill()
}

export function drawMonster(g: CanvasRenderingContext2D, sp: Species, p: Pose): void {
  const { x, base } = p
  const top = base - sp.h
  g.save()
  g.translate(x, base)
  g.rotate(p.lean)
  g.scale(p.sx, p.sy)
  g.translate(-x, -base)

  // Headgear first, so the body overlaps where it joins.
  if (sp.top === 'horns') {
    for (const side of [-1, 1]) {
      const hx = x + side * sp.w * 0.52
      tri(g, hx - side * 26, top + 58, hx + side * 22, top + 40, hx + side * 40, top - 38, '#fff1cf', '#a8865a')
    }
  } else if (sp.top === 'antenna') {
    const sway = Math.sin(p.time * 3) * 12
    g.beginPath()
    g.moveTo(x, top + 12)
    g.quadraticCurveTo(x + sway * 0.4, top - 30, x + sway, top - 56)
    g.lineWidth = 9
    g.lineCap = 'round'
    g.strokeStyle = sp.dark
    g.stroke()
    g.beginPath()
    g.arc(x + sway, top - 62, 17, 0, TAU)
    g.fillStyle = '#ffe14d'
    g.fill()
    g.lineWidth = 5
    g.stroke()
  } else if (sp.top === 'spikes') {
    for (let i = -2; i <= 2; i++) {
      const hx = x + i * sp.w * 0.3
      const lift = 44 - Math.abs(i) * 8 + Math.sin(p.time * 4 + i) * 4
      tri(g, hx - 24, top + 40 + Math.abs(i) * 14, hx + 24, top + 40 + Math.abs(i) * 14, hx + i * 6, top - lift + Math.abs(i) * 14, sp.dark)
    }
  } else if (sp.top === 'ears') {
    for (const side of [-1, 1]) {
      const ex = x + side * sp.w * 0.7
      g.beginPath()
      g.arc(ex, top + 48, 38, 0, TAU)
      g.fillStyle = sp.body
      g.fill()
      g.lineWidth = 6
      g.strokeStyle = sp.dark
      g.stroke()
      g.beginPath()
      g.arc(ex, top + 48, 20, 0, TAU)
      g.fillStyle = sp.belly
      g.fill()
    }
  } else {
    for (const side of [-1, 1]) {
      const flop = side * (0.22 + Math.sin(p.time * 2.4 + side) * 0.06)
      g.save()
      g.translate(x + side * sp.w * 0.4, top + 30)
      g.rotate(flop)
      g.beginPath()
      g.ellipse(0, -52, 22, 62, 0, 0, TAU)
      g.fillStyle = sp.body
      g.fill()
      g.lineWidth = 6
      g.strokeStyle = sp.dark
      g.stroke()
      g.beginPath()
      g.ellipse(0, -52, 10, 42, 0, 0, TAU)
      g.fillStyle = sp.belly
      g.fill()
      g.restore()
    }
  }

  bodyPath(g, sp, x, base)
  g.fillStyle = sp.body
  g.fill()
  if (p.tintAmount > 0.01) {
    g.globalAlpha = Math.min(1, p.tintAmount) * 0.7
    g.fillStyle = p.tint
    g.fill()
    g.globalAlpha = 1
  }
  g.lineWidth = 7
  g.lineJoin = 'round'
  g.strokeStyle = sp.dark
  g.stroke()

  // Tummy, a shine and a few spots.
  g.beginPath()
  g.ellipse(x, base - sp.h * 0.16, sp.w * 0.62, sp.h * 0.22, 0, 0, TAU)
  g.fillStyle = sp.belly
  g.fill()
  g.beginPath()
  g.ellipse(x - sp.w * 0.5, top + sp.h * 0.22, sp.w * 0.14, sp.h * 0.1, 0.5, 0, TAU)
  g.fillStyle = 'rgba(255,255,255,0.3)'
  g.fill()
  g.fillStyle = sp.dark
  g.globalAlpha = 0.28
  for (const [ox, oy, r] of [[0.62, 0.5, 13], [0.72, 0.62, 8], [-0.7, 0.58, 10]] as const) {
    g.beginPath()
    g.arc(x + ox * sp.w, top + oy * sp.h, r, 0, TAU)
    g.fill()
  }
  g.globalAlpha = 1

  // Eyes.
  const fy = faceY(sp, base)
  const es = p.eyeScale * (p.mood === 'wow' ? 1.12 : 1)
  if (sp.eyes === 1) {
    eye(g, x, fy, 46 * es, p)
  } else if (sp.eyes === 2) {
    eye(g, x - 36, fy, 29 * es, p)
    eye(g, x + 36, fy, 29 * es, p)
  } else {
    eye(g, x - 58, fy + 4, 23 * es, p)
    eye(g, x + 58, fy + 4, 23 * es, p)
    eye(g, x, fy - 20, 26 * es, p)
  }

  // Cheeks.
  const my = mouthY(sp, base)
  g.fillStyle = 'rgba(255,90,130,0.35)'
  g.beginPath()
  g.arc(x - sp.w * 0.6, my - 8, 15, 0, TAU)
  g.arc(x + sp.w * 0.6, my - 8, 15, 0, TAU)
  g.fill()

  // Mouth.
  const open = p.mouth
  g.lineCap = 'round'
  if (open > 0.1) {
    const mw = 46 + open * 28
    const mh = 6 + open * 54
    const cy = my + mh * 0.55
    g.beginPath()
    g.ellipse(x, cy, mw, mh, 0, 0, TAU)
    g.fillStyle = '#4a0d26'
    g.fill()
    g.save()
    g.clip()
    g.beginPath()
    g.ellipse(x, cy + mh * 0.85, mw * 0.72, mh * 0.7, 0, 0, TAU)
    g.fillStyle = '#ff6b8a'
    g.fill()
    const n = sp.teeth
    const tw = Math.min(26, (mw * 1.5) / n)
    for (let i = 0; i < n; i++) {
      const tx = x + (i - (n - 1) / 2) * tw * 1.25
      const edge = cy - mh * Math.sqrt(Math.max(0, 1 - ((tx - x) / mw) ** 2))
      tri(g, tx - tw / 2, edge - 6, tx + tw / 2, edge - 6, tx, edge + 12 + open * 16, '#ffffff')
    }
    g.restore()
    g.beginPath()
    g.ellipse(x, cy, mw, mh, 0, 0, TAU)
    g.lineWidth = 6
    g.strokeStyle = '#2b1d3a'
    g.stroke()
  } else {
    g.lineWidth = 7
    g.strokeStyle = '#2b1d3a'
    g.beginPath()
    if (p.mood === 'yuck' || p.mood === 'dizzy') {
      g.moveTo(x - 40, my + 8)
      g.quadraticCurveTo(x - 20, my - 8, x, my + 8)
      g.quadraticCurveTo(x + 20, my + 24, x + 40, my + 8)
      g.stroke()
      if (p.mood === 'yuck') {
        g.beginPath()
        g.roundRect(x - 2, my + 8, 30, 40 + Math.sin(p.time * 14) * 5, 14)
        g.fillStyle = '#ff6b8a'
        g.fill()
        g.lineWidth = 5
        g.stroke()
      }
    } else if (p.mood === 'wow') {
      g.ellipse(x, my + 12, 16, 20, 0, 0, TAU)
      g.fillStyle = '#4a0d26'
      g.fill()
      g.stroke()
    } else {
      const wide = p.mood === 'love' ? 54 : 46
      g.arc(x, my - 22, wide, 0.16 * Math.PI, 0.84 * Math.PI)
      g.stroke()
      const n = Math.min(2, sp.teeth)
      for (let i = 0; i < n; i++) {
        const tx = x + (n === 1 ? 0 : i === 0 ? -20 : 20)
        tri(g, tx - 9, my + 17, tx + 9, my + 17, tx, my + 36, '#ffffff', '#2b1d3a')
      }
    }
  }
  if (p.drool > 0.05) {
    const dy = my + 28 + p.drool * 18 + Math.sin(p.time * 5) * 3
    g.beginPath()
    g.moveTo(x + 34, dy - 20)
    g.quadraticCurveTo(x + 26, dy, x + 34, dy + 6)
    g.quadraticCurveTo(x + 42, dy, x + 34, dy - 20)
    g.fillStyle = 'rgba(140,220,255,0.9)'
    g.fill()
  }
  g.restore()
}

// A bendy arm from the shoulder to wherever the hand is, with a mitten.
export function drawArm(g: CanvasRenderingContext2D, sp: Species, sx: number, sy: number, hx: number, hy: number, side: number): void {
  const mx = (sx + hx) / 2 + side * 26
  const my = (sy + hy) / 2 + 22
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(sx, sy)
  g.quadraticCurveTo(mx, my, hx, hy)
  g.lineWidth = 36
  g.strokeStyle = sp.dark
  g.stroke()
  g.lineWidth = 24
  g.strokeStyle = sp.body
  g.stroke()
  g.beginPath()
  g.arc(hx, hy, 25, 0, TAU)
  g.fillStyle = sp.body
  g.fill()
  g.lineWidth = 6
  g.strokeStyle = sp.dark
  g.stroke()
  g.fillStyle = '#fff1cf'
  for (let i = -1; i <= 1; i++) {
    g.beginPath()
    g.arc(hx + i * 13, hy - 17 + Math.abs(i) * 4, 5.5, 0, TAU)
    g.fill()
  }
}
