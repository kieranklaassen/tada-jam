// The child on the path and the animals met along it. All drawn live from a
// few shapes so they can breathe, look and move. Faces are two eyes and very
// little else.

import { TAU, dot, oval } from './paint.ts'
import type { G } from './paint.ts'

export interface FigurePose {
  dir: number
  // Walk cycle, radians; `walk` fades it in and out (0 standing, 1 walking).
  phase: number
  walk: number
  crouch: number
  hop: number
  // -1..1, where the eyes rest.
  look: number
  blink: boolean
  // The tip of the cap trails behind.
  capLag: number
  coat: string
  scarf: string | null
  carried: number
}

const SKIN = '#f3d0aa'
const DARK = '#3a2a22'

export function drawFigure(g: G, x: number, y: number, p: FigurePose, time: number): void {
  const d = p.dir
  const bob = Math.abs(Math.sin(p.phase)) * 4 * p.walk + Math.sin(time * 1.8) * 1.1 * (1 - p.walk)
  g.fillStyle = 'rgba(40,30,20,0.18)'
  g.beginPath()
  g.ellipse(x, y + 3, 30 - Math.min(10, p.hop * 0.3), 8, 0, 0, TAU)
  g.fill()

  g.save()
  g.translate(x, y - p.hop)
  g.scale(1 + p.crouch * 0.1, 1 - p.crouch * 0.27)
  const by = -bob

  // Legs and boots.
  for (let i = 0; i < 2; i++) {
    const a = p.phase + i * Math.PI
    const footX = Math.sin(a) * 15 * p.walk + (i === 0 ? -7 : 7)
    const footY = -Math.max(0, Math.cos(a)) * 7 * p.walk
    g.strokeStyle = '#5a4636'
    g.lineWidth = 11
    g.beginPath()
    g.moveTo(i === 0 ? -7 : 7, by - 44)
    g.lineTo(footX, footY - 7)
    g.stroke()
    oval(g, footX + d * 4, footY - 5, 11.5, 6.5, '#6e4628')
  }

  // The far arm swings behind the coat.
  const swing = Math.sin(p.phase) * 0.55 * p.walk
  g.strokeStyle = p.coat
  g.lineWidth = 10
  g.beginPath()
  g.moveTo(-d * 10, by - 92)
  g.lineTo(-d * 14 + Math.sin(swing) * 16, by - 62 + Math.abs(swing) * 4)
  g.stroke()
  dot(g, -d * 14 + Math.sin(swing) * 16, by - 60 + Math.abs(swing) * 4, 5.2, SKIN)

  // The coat, a soft bell.
  g.beginPath()
  g.moveTo(-15, by - 101)
  g.quadraticCurveTo(-25, by - 70, -30, by - 40)
  g.quadraticCurveTo(0, by - 32, 30, by - 40)
  g.quadraticCurveTo(25, by - 70, 15, by - 101)
  g.quadraticCurveTo(0, by - 107, -15, by - 101)
  g.fillStyle = p.coat
  g.fill()
  g.strokeStyle = 'rgba(40,30,20,0.16)'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(-28, by - 43)
  g.quadraticCurveTo(0, by - 35, 28, by - 43)
  g.stroke()
  dot(g, d * 3, by - 84, 2.2, 'rgba(40,30,20,0.3)')
  dot(g, d * 4, by - 70, 2.2, 'rgba(40,30,20,0.3)')

  // The near arm carries the little basket.
  const hx = d * 21 - Math.sin(swing) * 6
  const hy = by - 60
  g.strokeStyle = p.coat
  g.lineWidth = 10
  g.beginPath()
  g.moveTo(d * 11, by - 93)
  g.lineTo(hx, hy)
  g.stroke()
  g.strokeStyle = '#a87a40'
  g.lineWidth = 2.6
  g.beginPath()
  g.arc(hx + d * 2, hy + 14, 12, Math.PI, 0)
  g.stroke()
  g.beginPath()
  g.moveTo(hx + d * 2 - 13, hy + 13)
  g.lineTo(hx + d * 2 - 10, hy + 28)
  g.lineTo(hx + d * 2 + 10, hy + 28)
  g.lineTo(hx + d * 2 + 13, hy + 13)
  g.closePath()
  g.fillStyle = '#c99b5a'
  g.fill()
  g.strokeStyle = 'rgba(120,80,40,0.6)'
  g.lineWidth = 1.2
  for (let k = 0; k < 2; k++) {
    g.beginPath()
    g.moveTo(hx + d * 2 - 12 + k, hy + 18 + k * 5)
    g.lineTo(hx + d * 2 + 12 - k, hy + 18 + k * 5)
    g.stroke()
  }
  const bits = ['#d5482b', '#e8b63c', '#7fb0d6']
  for (let k = 0; k < Math.min(3, p.carried); k++) dot(g, hx + d * 2 - 6 + k * 6, hy + 12, 3.6, bits[k])
  dot(g, hx, hy, 5.4, SKIN)

  if (p.scarf) {
    g.strokeStyle = p.scarf
    g.lineWidth = 9
    g.beginPath()
    g.moveTo(-13, by - 100)
    g.quadraticCurveTo(0, by - 95, 13, by - 100)
    g.stroke()
    g.lineWidth = 8
    g.beginPath()
    g.moveTo(-d * 9, by - 99)
    g.quadraticCurveTo(-d * (20 + p.capLag * 8), by - 90, -d * (22 + p.capLag * 14), by - 76)
    g.stroke()
  }

  // Head, hair, face.
  const hxh = d * 2
  const hyh = by - 122
  dot(g, hxh - d * 3, hyh - 2, 22, '#8a5a34')
  dot(g, hxh, hyh, 21, SKIN)
  g.globalAlpha = 0.3
  dot(g, hxh + d * 5 - 10, hyh + 7, 5, '#e8857a')
  dot(g, hxh + d * 5 + 10, hyh + 7, 5, '#e8857a')
  g.globalAlpha = 1
  const ex = hxh + d * 5 + p.look * 2.5
  if (p.blink) {
    g.strokeStyle = DARK
    g.lineWidth = 1.8
    for (const s of [-7, 7]) {
      g.beginPath()
      g.moveTo(ex + s - 2.6, hyh)
      g.lineTo(ex + s + 2.6, hyh)
      g.stroke()
    }
  } else {
    dot(g, ex - 7, hyh, 2.7, DARK)
    dot(g, ex + 7, hyh, 2.7, DARK)
  }
  g.strokeStyle = '#a8584a'
  g.lineWidth = 1.8
  g.beginPath()
  g.arc(hxh + d * 5, hyh + 6, 4.5, 0.2 * Math.PI, 0.8 * Math.PI)
  g.stroke()

  // The red felt cap; its tip follows a moment late.
  const tipX = hxh - d * (15 + p.capLag * 11)
  const tipY = hyh - 51 + Math.abs(p.capLag) * 7
  g.beginPath()
  g.moveTo(hxh - 23, hyh - 5)
  g.quadraticCurveTo(hxh - 19, hyh - 31, tipX, tipY)
  g.quadraticCurveTo(hxh + 17, hyh - 33, hxh + 23, hyh - 5)
  g.quadraticCurveTo(hxh, hyh - 15, hxh - 23, hyh - 5)
  g.fillStyle = '#c8452f'
  g.fill()
  g.globalAlpha = 0.25
  g.strokeStyle = '#7a2418'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(hxh - 21, hyh - 6)
  g.quadraticCurveTo(hxh, hyh - 15, hxh + 21, hyh - 6)
  g.stroke()
  g.globalAlpha = 1
  g.restore()
}

// A bronze-green beetle, about 34 wide. `step` walks its legs, `open` lifts
// the wing cases.
export function drawBeetle(g: G, x: number, y: number, dir: number, step: number, open: number, time: number): void {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  g.strokeStyle = '#2a2a26'
  g.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    const w = Math.sin(step + i * 2.1) * 4
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(-7 + i * 7, s * 5)
      g.lineTo(-10 + i * 8 + w * s, s * 14)
      g.stroke()
    }
  }
  const wave = Math.sin(time * 5) * 0.25
  for (const s of [-1, 1]) {
    g.beginPath()
    g.moveTo(15, s * 2)
    g.quadraticCurveTo(24, s * (5 + wave * 6), 27, s * (10 + wave * 8))
    g.stroke()
  }
  if (open > 0.02) {
    g.globalAlpha = 0.5 * open
    oval(g, -8, -9 * open, 15, 6, '#e9f2f4', -0.5 * open)
    oval(g, -8, 9 * open, 15, 6, '#e9f2f4', 0.5 * open)
    g.globalAlpha = 1
  }
  for (const s of [-1, 1]) {
    g.save()
    g.translate(6, 0)
    g.rotate(s * open * 0.75)
    g.beginPath()
    g.ellipse(-9, 0, 15, 10.5, 0, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI : TAU)
    g.closePath()
    g.fillStyle = '#3f5f4c'
    g.fill()
    g.restore()
  }
  g.globalAlpha = 0.55
  oval(g, -5, -4, 7, 2.6, '#a9c9a2', -0.15)
  g.globalAlpha = 1
  g.strokeStyle = '#27382e'
  g.lineWidth = 1.2
  g.beginPath()
  g.moveTo(-17, 0)
  g.lineTo(6, 0)
  g.stroke()
  oval(g, 10, 0, 6, 7.5, '#2f3a34')
  dot(g, 16, 0, 4.6, '#27302b')
  dot(g, 17.5, -2.4, 1, '#ffffff')
  dot(g, 17.5, 2.4, 1, '#ffffff')
  g.restore()
}

// A red squirrel sitting up, about 70 tall, feet at (x, y).
export function drawSquirrel(g: G, x: number, y: number, dir: number, tail: number, acorn: boolean, blink: boolean, look: number): void {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  for (const [color, width] of [['#b85f33', 21], ['#dc8a55', 9]] as const) {
    g.strokeStyle = color
    g.lineWidth = width
    g.beginPath()
    g.moveTo(-11, -7)
    g.bezierCurveTo(-46, -4, -48 + tail * 12, -50, -19 + tail * 16, -63)
    g.stroke()
  }
  oval(g, 0, -20, 17, 22, '#b5582e')
  oval(g, -4, -9, 13, 10, '#a84f28')
  oval(g, 7, -17, 9, 15, '#f1dcc0')
  oval(g, 8, -1, 10, 4.2, '#8f4222')
  // Head with tufted ears.
  for (const ex of [1, 9]) {
    g.beginPath()
    g.moveTo(ex - 3, -55)
    g.lineTo(ex - 1, -72)
    g.lineTo(ex + 5, -57)
    g.closePath()
    g.fillStyle = '#a84f28'
    g.fill()
  }
  dot(g, 8, -46, 13.5, '#b5582e')
  oval(g, 16, -42, 7.5, 6, '#ecd0ad')
  if (blink) {
    g.strokeStyle = '#2a1c14'
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(8, -48)
    g.lineTo(14, -48)
    g.stroke()
  } else {
    dot(g, 11 + look * 1.2, -48, 2.8, '#2a1c14')
    dot(g, 10.2 + look * 1.2, -49, 0.9, '#ffffff')
  }
  dot(g, 22, -43.5, 1.7, '#3a2a22')
  g.strokeStyle = '#a84f28'
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(6, -29)
  g.lineTo(15, -31)
  g.stroke()
  if (acorn) {
    oval(g, 19, -31, 5, 6, '#c99a4e')
    g.beginPath()
    g.ellipse(19, -34, 5.6, 4, 0, Math.PI, 0)
    g.fillStyle = '#7b5631'
    g.fill()
  }
  g.restore()
}

// A hare facing us. `up` 0 is crouched low with ears showing, 1 is sitting up.
export function drawHare(g: G, x: number, y: number, up: number, white: boolean, ear: number, nose: number, blink: boolean): void {
  const fur = white ? '#f4f3ef' : '#b08a62'
  const shade = white ? '#d9dcdf' : '#96724c'
  const pale = white ? '#ffffff' : '#e3cfb0'
  g.save()
  g.translate(x, y + (1 - up) * 46)
  // Ears.
  const lay = (1 - up) * 0.35
  for (const s of [-1, 1]) {
    g.save()
    g.translate(s * 9, -86)
    g.rotate(s * (0.1 + lay) + (s > 0 ? ear * 0.9 : ear * 0.15))
    oval(g, 0, -28, 9, 31, fur)
    oval(g, 0, -27, 4.6, 23, '#e7b7ae')
    g.restore()
  }
  oval(g, 0, -30, 31, 33, fur)
  oval(g, 0, -23, 17, 21, pale)
  oval(g, -19, -10, 13, 12, shade)
  oval(g, 19, -10, 13, 12, shade)
  oval(g, -9, -3, 8, 5, pale)
  oval(g, 9, -3, 8, 5, pale)
  oval(g, 0, -70, 22, 20, fur)
  oval(g, -10, -63, 10, 8, pale)
  oval(g, 10, -63, 10, 8, pale)
  if (blink) {
    g.strokeStyle = '#2a1c14'
    g.lineWidth = 1.8
    for (const s of [-10, 10]) {
      g.beginPath()
      g.moveTo(s - 3, -75)
      g.lineTo(s + 3, -75)
      g.stroke()
    }
  } else {
    dot(g, -10, -75, 3.2, '#2a1c14')
    dot(g, 10, -75, 3.2, '#2a1c14')
    dot(g, -11, -76, 1, '#ffffff')
    dot(g, 9, -76, 1, '#ffffff')
  }
  g.beginPath()
  g.moveTo(-3.4, -67 + nose)
  g.lineTo(3.4, -67 + nose)
  g.lineTo(0, -63 + nose)
  g.closePath()
  g.fillStyle = '#d98a86'
  g.fill()
  g.strokeStyle = 'rgba(60,40,30,0.5)'
  g.lineWidth = 1.2
  g.beginPath()
  g.moveTo(0, -63 + nose)
  g.lineTo(0, -59)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.75)'
  g.lineWidth = 1
  for (const s of [-1, 1]) {
    for (let k = -1; k <= 1; k++) {
      g.beginPath()
      g.moveTo(s * 9, -62)
      g.lineTo(s * 27, -63 + k * 5)
      g.stroke()
    }
  }
  g.restore()
}

// A frog. `leap` 0 is sitting; toward 1 it stretches out along `angle`.
export function drawFrog(g: G, x: number, y: number, dir: number, leap: number, angle: number, blink: boolean, throat: number): void {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  if (leap > 0.05) {
    g.rotate(angle)
    g.strokeStyle = '#5f8f3f'
    g.lineWidth = 7
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(-14, s * 6)
      g.lineTo(-30 - leap * 12, s * 11)
      g.lineTo(-40 - leap * 16, s * 6)
      g.stroke()
    }
    oval(g, 0, 0, 22 + leap * 5, 13 - leap * 2, '#6fa04a')
    oval(g, 2, 3, 15, 7, '#cfe0a0')
    dot(g, 16, -7, 5.5, '#6fa04a')
    dot(g, 17.5, -8, 2.4, '#20261a')
    g.strokeStyle = '#5f8f3f'
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(10, 6)
    g.lineTo(24, 10)
    g.stroke()
    g.restore()
    return
  }
  oval(g, -17, -5, 12, 8, '#5f8f3f')
  oval(g, 17, -5, 12, 8, '#5f8f3f')
  oval(g, 0, -12, 23, 15, '#6fa04a')
  oval(g, 0, -6 - throat * 1.5, 15, 8 + throat * 3, '#d3e3a6')
  g.globalAlpha = 0.5
  for (const [sx, sy] of [[-9, -18], [6, -20], [12, -11], [-13, -9]]) dot(g, sx, sy, 2.4, '#4f7f37')
  g.globalAlpha = 1
  oval(g, -12, 1, 7, 3.5, '#5f8f3f')
  oval(g, 12, 1, 7, 3.5, '#5f8f3f')
  for (const s of [-1, 1]) {
    dot(g, s * 10, -25, 7.5, '#6fa04a')
    if (blink) {
      g.strokeStyle = '#20261a'
      g.lineWidth = 1.8
      g.beginPath()
      g.moveTo(s * 10 - 4, -25)
      g.lineTo(s * 10 + 4, -25)
      g.stroke()
    } else {
      dot(g, s * 10, -26, 4.8, '#f4f1d6')
      dot(g, s * 10 + 1, -26, 2.7, '#20261a')
    }
  }
  g.strokeStyle = 'rgba(40,60,30,0.6)'
  g.lineWidth = 1.6
  g.beginPath()
  g.arc(0, -22, 15, 0.25 * Math.PI, 0.75 * Math.PI)
  g.stroke()
  g.restore()
}

// Only the eyes above the water.
export function drawFrogEyes(g: G, x: number, y: number, blink: boolean): void {
  oval(g, x, y + 2, 17, 5, 'rgba(111,160,74,0.75)')
  for (const s of [-1, 1]) {
    dot(g, x + s * 8, y - 3, 6.5, '#6fa04a')
    if (!blink) {
      dot(g, x + s * 8, y - 4, 4, '#f4f1d6')
      dot(g, x + s * 8 + 0.6, y - 4, 2.2, '#20261a')
    }
  }
}

// A robin, about 40 across, feet at (x, y). `sing` 0..1 opens the beak.
export function drawRobin(g: G, x: number, y: number, dir: number, sing: number, bob: number, blink: boolean): void {
  g.save()
  g.translate(x, y - bob)
  g.scale(dir, 1)
  g.strokeStyle = '#4a3a30'
  g.lineWidth = 1.8
  g.beginPath()
  g.moveTo(-3, -4)
  g.lineTo(-4, bob + 1)
  g.moveTo(4, -4)
  g.lineTo(4, bob + 1)
  g.stroke()
  g.strokeStyle = '#6b523c'
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(-11, -13)
  g.lineTo(-25, -7 - sing * 4)
  g.stroke()
  oval(g, 0, -17, 16, 15, '#8a6c4c')
  oval(g, -4, -17, 10, 9, '#75593d', -0.3)
  oval(g, 6, -12, 10, 11, '#e27a3c')
  oval(g, 3, -5, 9, 5, '#f1e6d2')
  dot(g, 8, -27, 10.5, '#8a6c4c')
  oval(g, 11, -24, 7, 7, '#e27a3c')
  if (blink) {
    g.strokeStyle = '#1e1612'
    g.lineWidth = 1.5
    g.beginPath()
    g.moveTo(8, -30)
    g.lineTo(13, -30)
    g.stroke()
  } else {
    dot(g, 10.5, -30, 2.3, '#1e1612')
    dot(g, 10, -30.8, 0.8, '#ffffff')
  }
  g.fillStyle = '#3a2a20'
  g.beginPath()
  g.moveTo(17, -29 - sing * 2)
  g.lineTo(26, -27 - sing * 5)
  g.lineTo(17, -26)
  g.closePath()
  g.fill()
  if (sing > 0.1) {
    g.beginPath()
    g.moveTo(17, -26)
    g.lineTo(25, -24 + sing * 3)
    g.lineTo(17, -24)
    g.closePath()
    g.fill()
  }
  g.restore()
}

// A small bird crossing the sky: two strokes that beat.
export function drawSkyBird(g: G, x: number, y: number, flap: number, size: number): void {
  const w = Math.sin(flap) * size * 0.7
  g.strokeStyle = 'rgba(60,50,45,0.75)'
  g.lineWidth = 2.6
  g.beginPath()
  g.moveTo(x - size, y - w)
  g.quadraticCurveTo(x - size * 0.4, y - size * 0.35 - w * 0.2, x, y)
  g.quadraticCurveTo(x + size * 0.4, y - size * 0.35 - w * 0.2, x + size, y - w)
  g.stroke()
}

export function drawButterfly(g: G, x: number, y: number, flap: number, color: string): void {
  const k = Math.abs(Math.sin(flap))
  g.fillStyle = color
  for (const s of [-1, 1]) {
    g.beginPath()
    g.ellipse(x + s * 6 * k, y - 3, 7 * k + 1, 8, s * 0.4, 0, TAU)
    g.fill()
    g.beginPath()
    g.ellipse(x + s * 4.5 * k, y + 5, 5 * k + 1, 5, -s * 0.4, 0, TAU)
    g.fill()
  }
  g.strokeStyle = '#4a3a30'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(x, y - 6)
  g.lineTo(x, y + 7)
  g.stroke()
}
