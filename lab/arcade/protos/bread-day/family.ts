// The family who come to the table when the bread is out: a grandmother, a
// father and a small sister, made like wool dolls. Their faces are two eyes and
// a small mouth, calm, and they do nothing but sit, take bread and eat it.

import { TAU } from '../../kit/math.ts'
import { TABLE_Y } from './scene.ts'
import type { Piece } from './dough.ts'

export interface Figure {
  x: number
  headY: number
  r: number
  kind: 'oma' | 'papa' | 'child'
  skin: string
  skinLine: string
  wool: string
  woolLine: string
  hair: string
  // 0 away, 1 seated.
  here: number
  hold: Piece | null
  queue: Piece[]
  // 1 just after a bite, falling to 0.
  bite: number
  // Seconds until the next bite.
  wait: number
  // 1 just after being touched, falling to 0: a small nod.
  nod: number
  seed: number
}

export function makeFamily(): Figure[] {
  const base = { here: 0, hold: null, queue: [], bite: 0, wait: 0, nod: 0 }
  return [
    { ...base, queue: [], x: 302, headY: 262, r: 39, kind: 'oma', skin: '#edc9a6', skinLine: '#c79a74', wool: '#c79a45', woolLine: '#9c7430', hair: '#d9d5cc', seed: 1 },
    { ...base, queue: [], x: 492, headY: 256, r: 40, kind: 'papa', skin: '#dcae84', skinLine: '#b3855e', wool: '#586f8c', woolLine: '#3f5470', hair: '#6a4a30', seed: 2 },
    { ...base, queue: [], x: 672, headY: 280, r: 32, kind: 'child', skin: '#f0ceac', skinLine: '#cba07a', wool: '#c4756a', woolLine: '#9c5750', hair: '#a8683a', seed: 3 },
  ]
}

// Where a figure holds its bread, in front of its chest.
export function holdPoint(f: Figure): { x: number; y: number } {
  return { x: f.x, y: TABLE_Y + 4 - f.bite * 30 }
}

export function drawFigure(g: CanvasRenderingContext2D, f: Figure, time: number): void {
  if (f.here <= 0.001) return
  const drop = (1 - f.here) * 200
  const x = f.x
  const breathe = Math.sin(time * 0.9 + f.seed * 2) * 1.2
  const hy = f.headY + drop + f.bite * 5 + f.nod * 4 + breathe * 0.5
  const r = f.r
  const half = r * 1.9
  const neck = hy + r * 0.78
  const base = TABLE_Y + 12 + drop

  // Shoulders: one soft shape of knitted wool.
  g.beginPath()
  g.moveTo(x - half, base)
  g.bezierCurveTo(x - half, neck + 26 - breathe, x - half * 0.56, neck + 4, x - r * 0.36, neck)
  g.lineTo(x + r * 0.36, neck)
  g.bezierCurveTo(x + half * 0.56, neck + 4, x + half, neck + 26 - breathe, x + half, base)
  g.closePath()
  g.fillStyle = f.wool
  g.fill()
  g.strokeStyle = f.woolLine
  g.lineWidth = 2.6
  g.stroke()
  // Rows of stitches.
  g.strokeStyle = 'rgba(255,255,255,0.16)'
  g.lineWidth = 2
  g.setLineDash([5, 6])
  for (let row = 0; row < 3; row++) {
    const yy = neck + 24 + row * 14
    const span = half * (0.62 + row * 0.14)
    g.beginPath()
    g.moveTo(x - span, yy + 4)
    g.quadraticCurveTo(x, yy - 4, x + span, yy + 4)
    g.stroke()
  }
  g.setLineDash([])
  if (f.kind === 'oma') {
    // A shawl crossed at the front.
    g.strokeStyle = '#a65a44'
    g.lineWidth = 9
    g.beginPath()
    g.moveTo(x - r * 0.5, neck + 4)
    g.quadraticCurveTo(x - 4, neck + 22, x + 8, neck + 46)
    g.moveTo(x + r * 0.5, neck + 4)
    g.quadraticCurveTo(x + 4, neck + 22, x - 8, neck + 46)
    g.stroke()
  } else if (f.kind === 'child') {
    // A round collar.
    g.fillStyle = '#f3ead8'
    g.beginPath()
    g.ellipse(x - r * 0.3, neck + 7, r * 0.34, r * 0.2, 0.4, 0, TAU)
    g.ellipse(x + r * 0.3, neck + 7, r * 0.34, r * 0.2, -0.4, 0, TAU)
    g.fill()
  }

  // Hair behind the head.
  g.fillStyle = f.hair
  if (f.kind === 'oma') {
    g.beginPath()
    g.arc(x, hy - r * 1.0, r * 0.4, 0, TAU)
    g.fill()
    g.strokeStyle = '#b3aea3'
    g.lineWidth = 2
    g.stroke()
  } else if (f.kind === 'child') {
    for (const side of [-1, 1]) {
      g.beginPath()
      g.ellipse(x + side * r * 1.12, hy + r * 0.28, r * 0.3, r * 0.42, side * 0.3, 0, TAU)
      g.fill()
      g.fillStyle = '#b5503c'
      g.beginPath()
      g.arc(x + side * r * 0.98, hy - r * 0.04, r * 0.13, 0, TAU)
      g.fill()
      g.fillStyle = f.hair
    }
  }

  // Head.
  g.beginPath()
  g.arc(x, hy, r, 0, TAU)
  g.fillStyle = f.skin
  g.fill()
  g.strokeStyle = f.skinLine
  g.lineWidth = 2.4
  g.stroke()

  // Hair on top.
  g.fillStyle = f.hair
  g.beginPath()
  if (f.kind === 'papa') {
    g.arc(x, hy, r + 1.5, Math.PI * 1.06, Math.PI * 1.94)
    g.quadraticCurveTo(x + r * 0.2, hy - r * 0.5, x - r * 0.96, hy - r * 0.2)
  } else if (f.kind === 'oma') {
    g.arc(x, hy, r + 1.5, Math.PI * 1.02, Math.PI * 1.98)
    g.quadraticCurveTo(x + r * 0.5, hy - r * 0.62, x, hy - r * 0.56)
    g.quadraticCurveTo(x - r * 0.5, hy - r * 0.62, x - r, hy - r * 0.06)
  } else {
    g.arc(x, hy, r + 1.5, Math.PI * 0.98, Math.PI * 2.02)
    g.quadraticCurveTo(x + r * 0.4, hy - r * 0.42, x, hy - r * 0.36)
    g.quadraticCurveTo(x - r * 0.4, hy - r * 0.42, x - r, hy + r * 0.06)
  }
  g.closePath()
  g.fill()
  if (f.kind === 'papa') {
    // A short beard.
    g.beginPath()
    g.arc(x, hy, r + 1, Math.PI * 0.12, Math.PI * 0.88)
    g.quadraticCurveTo(x, hy + r * 0.46, x + r * 0.93, hy + r * 0.37)
    g.closePath()
    g.fill()
  }

  // The face: cheeks, two eyes, a small mouth.
  g.fillStyle = 'rgba(222,120,100,0.2)'
  g.beginPath()
  g.arc(x - r * 0.52, hy + r * 0.24, r * 0.2, 0, TAU)
  g.arc(x + r * 0.52, hy + r * 0.24, r * 0.2, 0, TAU)
  g.fill()
  const blink = (time + f.seed * 1.9) % (4.3 + f.seed * 0.8) < 0.14 || f.bite > 0.55
  g.fillStyle = '#4a3528'
  g.strokeStyle = '#4a3528'
  g.lineWidth = 2.2
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.34
    const ey = hy + r * 0.04
    g.beginPath()
    if (blink) {
      g.moveTo(ex - 3.6, ey)
      g.quadraticCurveTo(ex, ey + 2.4, ex + 3.6, ey)
      g.stroke()
    } else {
      g.arc(ex, ey, r * 0.085, 0, TAU)
      g.fill()
    }
  }
  const my = hy + r * 0.42
  g.beginPath()
  if (f.hold && f.hold.give >= 1 && f.bite < 0.5 && f.bite > 0.02) {
    // Chewing.
    g.ellipse(x, my, r * 0.1, r * 0.07 + Math.abs(Math.sin(time * 9)) * r * 0.05, 0, 0, TAU)
    g.fillStyle = '#8a4a3c'
    g.fill()
  } else {
    g.strokeStyle = f.kind === 'papa' ? '#3a2618' : '#8a4a3c'
    g.lineWidth = 2.2
    g.moveTo(x - r * 0.16, my - 1)
    g.quadraticCurveTo(x, my + r * 0.11, x + r * 0.16, my - 1)
    g.stroke()
  }
}

// Hands rest on the table edge, or come together under the bread.
export function drawHands(g: CanvasRenderingContext2D, f: Figure): void {
  if (f.here < 0.6) return
  const holding = f.hold !== null && f.hold.give > 0.6
  const point = holdPoint(f)
  const spread = holding ? f.r * 0.62 : f.r * 1.08
  const y = holding ? point.y + 12 : TABLE_Y + 9
  g.fillStyle = f.skin
  g.strokeStyle = f.skinLine
  g.lineWidth = 2.2
  for (const side of [-1, 1]) {
    // A cuff, then the hand.
    g.fillStyle = f.wool
    g.beginPath()
    g.ellipse(f.x + side * (spread + 7), y + 5, f.r * 0.3, f.r * 0.22, side * 0.5, 0, TAU)
    g.fill()
    g.fillStyle = f.skin
    g.beginPath()
    g.ellipse(f.x + side * spread, y, f.r * 0.27, f.r * 0.22, side * 0.3, 0, TAU)
    g.fill()
    g.stroke()
  }
}
