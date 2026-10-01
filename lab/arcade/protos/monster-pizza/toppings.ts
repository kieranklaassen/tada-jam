// The things that go on a pizza: what they are called, what they look like in
// a bowl, in the thought bubble and on the base, and when they unlock.

import { sprite } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'

export type KindKey = 'cheese' | 'pepperoni' | 'mushroom' | 'worm' | 'eyeball' | 'sock' | 'slime' | 'gummy'

export interface Kind {
  key: KindKey
  silly: boolean
  // Particle colours when it plops.
  colors: readonly string[]
  // Coins in the jar before its bowl appears (0: there from the start).
  unlock: number
  // Diameter on the pizza.
  size: number
  bowl: string
}

export const KINDS: Record<KindKey, Kind> = {
  cheese: { key: 'cheese', silly: false, colors: ['#ffe27a', '#ffd04d', '#fff3b0'], unlock: 0, size: 50, bowl: '#ffb347' },
  pepperoni: { key: 'pepperoni', silly: false, colors: ['#c8372d', '#e0563f'], unlock: 0, size: 60, bowl: '#6fc3ff' },
  mushroom: { key: 'mushroom', silly: false, colors: ['#ff6b5a', '#fff1dc'], unlock: 0, size: 58, bowl: '#8fe08a' },
  worm: { key: 'worm', silly: true, colors: ['#ff9aa8', '#e8708a'], unlock: 0, size: 64, bowl: '#c79bff' },
  eyeball: { key: 'eyeball', silly: true, colors: ['#ffffff', '#7fd4ff'], unlock: 0, size: 54, bowl: '#ff8fb8' },
  sock: { key: 'sock', silly: true, colors: ['#ff5d5d', '#ffffff', '#9be38a'], unlock: 3, size: 64, bowl: '#ffe14d' },
  slime: { key: 'slime', silly: true, colors: ['#7be04a', '#b6f57a', '#3fae2a'], unlock: 8, size: 66, bowl: '#ff9a5c' },
  gummy: { key: 'gummy', silly: true, colors: ['#ff4d6d', '#ffd23f', '#5ed36a'], unlock: 14, size: 60, bowl: '#7fe0d8' },
}

export const ALL_KINDS: readonly KindKey[] = ['cheese', 'pepperoni', 'mushroom', 'worm', 'eyeball', 'sock', 'slime', 'gummy']

const EMOJI: Partial<Record<KindKey, string>> = { cheese: '🧀', mushroom: '🍄', worm: '🪱' }
const SOCK = ['#ff4d5e', '#3aa0ff', '#a05cff', '#2fc46a']
const IRIS = ['#3aa0ff', '#4cc46a', '#b0703a', '#a05cff']
const GUMMY = ['#ff4d6d', '#ffc21a', '#4fd06a', '#ff8a2a']

// Draw one topping centred on (x, y), about `size` across. `variant` picks a
// colour for the ones that come in colours; lookX and lookY aim an eyeball.
export function drawTopping(
  g: CanvasRenderingContext2D,
  kind: KindKey,
  x: number,
  y: number,
  size: number,
  rot = 0,
  sx = 1,
  sy = 1,
  variant = 0,
  lookX = 0,
  lookY = 0,
): void {
  const emoji = EMOJI[kind]
  if (emoji) {
    sprite(g, emoji, x, y, size, rot, sx, sy)
    return
  }
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale((sx * size) / 100, (sy * size) / 100)
  if (kind === 'pepperoni') {
    g.beginPath()
    g.arc(0, 0, 48, 0, TAU)
    g.fillStyle = '#b3262a'
    g.fill()
    g.lineWidth = 8
    g.strokeStyle = '#6e1216'
    g.stroke()
    g.fillStyle = '#8a1a1e'
    for (const [px, py, pr] of [[-16, -14, 9], [18, -6, 7], [-4, 20, 10], [20, 22, 5], [-26, 12, 5]] as const) {
      g.beginPath()
      g.arc(px, py, pr, 0, TAU)
      g.fill()
    }
    g.beginPath()
    g.ellipse(-14, -26, 16, 7, -0.5, 0, TAU)
    g.fillStyle = 'rgba(255,255,255,0.3)'
    g.fill()
  } else if (kind === 'eyeball') {
    g.beginPath()
    g.arc(0, 0, 47, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
    g.lineWidth = 6
    g.strokeStyle = '#8a7a90'
    g.stroke()
    g.strokeStyle = 'rgba(230,70,70,0.55)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(-44, 6)
    g.lineTo(-28, 0)
    g.lineTo(-22, 8)
    g.moveTo(40, -18)
    g.lineTo(27, -10)
    g.stroke()
    const ix = lookX * 17
    const iy = lookY * 17
    g.beginPath()
    g.arc(ix, iy, 24, 0, TAU)
    g.fillStyle = IRIS[variant % IRIS.length]!
    g.fill()
    g.beginPath()
    g.arc(ix, iy, 12, 0, TAU)
    g.fillStyle = '#1e1428'
    g.fill()
    g.beginPath()
    g.arc(ix - 8, iy - 9, 6, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
  } else if (kind === 'slime') {
    const lobes = [[0, 0, 31], [-30, -8, 16], [28, -13, 15], [-15, 27, 14], [23, 22, 17], [2, -30, 13], [-34, 22, 7], [40, 8, 6]] as const
    for (const pass of [0, 1]) {
      g.fillStyle = pass === 0 ? '#2f8a1c' : '#74dc3c'
      g.beginPath()
      for (const [bx, by, br] of lobes) {
        g.moveTo(bx + br + (pass === 0 ? 5 : 0), by)
        g.arc(bx, by, br + (pass === 0 ? 5 : 0), 0, TAU)
      }
      g.fill()
    }
    g.beginPath()
    g.ellipse(-10, -12, 14, 8, -0.6, 0, TAU)
    g.fillStyle = 'rgba(255,255,255,0.65)'
    g.fill()
    g.beginPath()
    g.arc(14, 10, 6, 0, TAU)
    g.arc(-6, 18, 4, 0, TAU)
    g.arc(24, -12, 3, 0, TAU)
    g.fillStyle = '#b9f77c'
    g.fill()
  } else if (kind === 'sock') {
    const color = SOCK[variant % SOCK.length]!
    g.lineCap = 'round'
    g.lineJoin = 'round'
    for (const pass of [0, 1]) {
      g.strokeStyle = pass === 0 ? '#3a2340' : color
      g.lineWidth = pass === 0 ? 46 : 36
      g.beginPath()
      g.moveTo(-8, -30)
      g.lineTo(-8, 16)
      g.lineTo(22, 26)
      g.stroke()
    }
    g.strokeStyle = '#ffffff'
    g.lineWidth = 7
    g.lineCap = 'butt'
    g.beginPath()
    g.moveTo(-26, -8)
    g.lineTo(10, -8)
    g.moveTo(-26, 6)
    g.lineTo(10, 6)
    g.stroke()
    g.fillStyle = '#ffffff'
    g.strokeStyle = '#3a2340'
    g.lineWidth = 5
    g.beginPath()
    g.roundRect(-30, -50, 44, 20, 8)
    g.fill()
    g.stroke()
    g.beginPath()
    g.arc(28, 28, 13, -1.2, 1.9)
    g.fillStyle = '#ffe14d'
    g.fill()
    g.beginPath()
    g.arc(-12, 20, 10, 1.4, 3.6)
    g.fill()
  } else {
    // A gummy bear: ears, head, tummy, four paws.
    const color = GUMMY[variant % GUMMY.length]!
    g.fillStyle = color
    g.strokeStyle = 'rgba(0,0,0,0.22)'
    g.lineWidth = 5
    const blob = (bx: number, by: number, rx: number, ry: number) => {
      g.beginPath()
      g.ellipse(bx, by, rx, ry, 0, 0, TAU)
      g.fill()
      g.stroke()
    }
    blob(-20, -38, 10, 10)
    blob(20, -38, 10, 10)
    blob(-28, 0, 11, 9)
    blob(28, 0, 11, 9)
    blob(-16, 38, 12, 10)
    blob(16, 38, 12, 10)
    blob(0, 12, 25, 28)
    blob(0, -22, 23, 20)
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.beginPath()
    g.ellipse(-8, -28, 8, 5, -0.5, 0, TAU)
    g.ellipse(-8, 4, 7, 12, 0.2, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(0,0,0,0.45)'
    g.beginPath()
    g.arc(-8, -22, 3, 0, TAU)
    g.arc(8, -22, 3, 0, TAU)
    g.fill()
  }
  g.restore()
}
