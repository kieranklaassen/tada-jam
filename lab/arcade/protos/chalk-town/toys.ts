// How the things on the pavement are drawn: three wooden cars seen from
// above, three peg people and a wooden dog standing up, the chalks, the rag,
// the sun and the cloud. All worn paint over bare wood.

import { CHALK, CHALK_DARK } from './ground.ts'

const TAU = Math.PI * 2
const WOOD = '#c9a36f'
const WOOD_DARK = '#8d6a3f'

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

const CAR_PAINT = ['#b8442f', '#3f7a8c', '#d2a62e']
const CAR_ROOF = ['#d9705a', '#6aa3b2', '#ecc95e']

// A wooden car from above, nose along +x. `lift` 0..1 raises it off its shadow.
export function drawCar(g: CanvasRenderingContext2D, x: number, y: number, angle: number, variant: number, lift: number, sun: number, wobble: number): void {
  g.save()
  g.translate(x, y)
  // The shadow falls down the screen whichever way the car points.
  g.save()
  g.translate(3 + lift * 5, 6 + lift * 12)
  g.rotate(angle)
  g.fillStyle = `rgba(0,0,0,${(0.2 + 0.2 * sun) * (1 - lift * 0.4)})`
  rr(g, -32, -19, 64, 38, 9)
  g.fill()
  g.restore()
  g.translate(0, -lift * 8)
  g.rotate(angle + wobble)
  const s = 1 + lift * 0.1
  g.scale(s, s)
  // Wheels: dark turned discs showing at the sides.
  g.fillStyle = '#2a211a'
  for (const wx of [-19, 19]) {
    for (const wy of [-18, 18]) {
      rr(g, wx - 8, wy - 4.5, 16, 9, 3.5)
      g.fill()
    }
  }
  g.fillStyle = '#5a4634'
  for (const wx of [-19, 19]) {
    for (const wy of [-19.5, 19.5]) g.fillRect(wx - 5, wy - 1, 10, 2)
  }
  // The body: bare wood at the edges where the paint has chipped.
  g.fillStyle = WOOD
  rr(g, -32, -15, 64, 30, 8)
  g.fill()
  g.fillStyle = CAR_PAINT[variant]
  rr(g, -30, -13.5, 60, 27, 7)
  g.fill()
  g.fillStyle = WOOD
  g.fillRect(24, -14, 5, 3)
  g.fillRect(-31, 6, 4, 6)
  g.fillRect(-8, 11.5, 12, 2.5)
  if (variant === 1) {
    // A pickup: cab forward, open bed of bare wood behind.
    g.fillStyle = WOOD_DARK
    rr(g, -26, -10, 26, 20, 3)
    g.fill()
    g.fillStyle = 'rgba(0,0,0,0.25)'
    g.fillRect(-26, -10, 26, 4)
    g.fillStyle = CAR_ROOF[variant]
    rr(g, 2, -11, 17, 22, 5)
    g.fill()
    g.fillStyle = '#243038'
    rr(g, 14, -9, 5, 18, 2)
    g.fill()
  } else if (variant === 2) {
    // A little bus: long roof, a row of windows down each side.
    g.fillStyle = CAR_ROOF[variant]
    rr(g, -24, -10, 46, 20, 5)
    g.fill()
    g.fillStyle = '#243038'
    for (let i = 0; i < 4; i++) {
      g.fillRect(-20 + i * 10, -12.5, 6, 3)
      g.fillRect(-20 + i * 10, 9.5, 6, 3)
    }
    rr(g, 19, -8, 5, 16, 2)
    g.fill()
  } else {
    g.fillStyle = CAR_ROOF[variant]
    rr(g, -14, -11, 26, 22, 6)
    g.fill()
    g.fillStyle = '#243038'
    rr(g, 7, -9, 6, 18, 2)
    g.fill()
    rr(g, -15, -8, 4, 16, 2)
    g.fill()
  }
  // Headlamps and a line of light along the top edge.
  g.fillStyle = '#f3e7b8'
  g.beginPath()
  g.arc(28, -8, 2.6, 0, TAU)
  g.arc(28, 8, 2.6, 0, TAU)
  g.fill()
  g.strokeStyle = 'rgba(255,245,225,0.35)'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(-24, -12.5)
  g.lineTo(22, -12.5)
  g.stroke()
  g.restore()
}

const COAT = ['#b5503c', '#3d6f96', '#5f8a4a']
const HAIR = ['#3a2a1e', '#c58e3c', '#1f1a18']

// A peg person, feet at (x, y). `hop` is pixels off the ground; `face` is -1
// or 1 for which way they look.
export function drawPerson(g: CanvasRenderingContext2D, x: number, y: number, variant: number, hop: number, face: number, lift: number, sun: number, lean: number): void {
  const air = hop + lift * 16
  g.fillStyle = `rgba(0,0,0,${(0.2 + 0.2 * sun) / (1 + air * 0.03)})`
  g.beginPath()
  g.ellipse(x + 4 + air * 0.35, y + 4 + air * 0.5, 15 - Math.min(5, air * 0.15), 6.5, 0, 0, TAU)
  g.fill()
  g.save()
  g.translate(x, y - air)
  g.rotate(lean)
  const s = 1 + lift * 0.1
  g.scale(s, s)
  // The body, turned from one piece: wide at the foot.
  g.fillStyle = WOOD_DARK
  g.beginPath()
  g.moveTo(-13, 0)
  g.quadraticCurveTo(-13, 3.5, 0, 3.5)
  g.quadraticCurveTo(13, 3.5, 13, 0)
  g.lineTo(8, -28)
  g.lineTo(-8, -28)
  g.closePath()
  g.fill()
  g.fillStyle = COAT[variant]
  g.beginPath()
  g.moveTo(-12.4, -3)
  g.lineTo(12.4, -3)
  g.lineTo(8, -28)
  g.lineTo(-8, -28)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(255,240,220,0.22)'
  g.beginPath()
  g.moveTo(-9, -4)
  g.lineTo(-5.5, -27)
  g.lineTo(-2.5, -27)
  g.lineTo(-5, -4)
  g.fill()
  // A chip in the paint.
  g.fillStyle = WOOD
  g.fillRect(5, -12, 4, 3)
  // The head.
  g.fillStyle = '#e2c193'
  g.beginPath()
  g.arc(0, -37, 11.5, 0, TAU)
  g.fill()
  g.fillStyle = HAIR[variant]
  g.beginPath()
  g.arc(0, -37, 11.5, Math.PI * 1.05, Math.PI * 1.95)
  g.quadraticCurveTo(0, -42 + face * 0, -11.3, -39)
  g.fill()
  g.fillStyle = '#2a1e16'
  g.beginPath()
  g.arc(-4 + face * 2, -35.5, 1.7, 0, TAU)
  g.arc(4 + face * 2, -35.5, 1.7, 0, TAU)
  g.fill()
  g.strokeStyle = 'rgba(90,50,34,0.8)'
  g.lineWidth = 1.3
  g.beginPath()
  g.arc(face * 2, -32.5, 3, 0.25 * Math.PI, 0.75 * Math.PI)
  g.stroke()
  g.fillStyle = 'rgba(255,255,255,0.25)'
  g.beginPath()
  g.arc(-4.5, -41.5, 3, 0, TAU)
  g.fill()
  g.restore()
}

// A wooden dog, feet centred on (x, y), nose towards `face`. `step` swings the
// legs; `wag` the tail; `wet` 0..1 sinks it into a chalk pond.
export function drawDog(g: CanvasRenderingContext2D, x: number, y: number, face: number, step: number, wag: number, lift: number, sun: number, wet: number, sit: number): void {
  const air = lift * 16
  if (wet < 0.5) {
    g.fillStyle = `rgba(0,0,0,${(0.2 + 0.2 * sun) / (1 + air * 0.03)})`
    g.beginPath()
    g.ellipse(x + 4 + air * 0.35, y + 3 + air * 0.5, 22, 6, 0, 0, TAU)
    g.fill()
  }
  g.save()
  g.translate(x, y - air + wet * 7)
  g.scale(face * (1 + lift * 0.1), 1 + lift * 0.1)
  if (wet > 0) {
    g.beginPath()
    g.rect(-40, -60, 80, 60 - wet * 9)
    g.clip()
  }
  const brown = '#9a6b3c'
  const dark = '#5f3f22'
  // Legs.
  g.fillStyle = dark
  const swing = Math.sin(step) * 4 * (1 - sit)
  g.fillRect(-14 + swing, -10, 5, 10)
  g.fillRect(8 - swing, -10, 5, 10)
  g.fillStyle = brown
  g.fillRect(-10 - swing, -10, 5, 10)
  g.fillRect(12 + swing, -10, 5, 10)
  // Tail.
  g.strokeStyle = dark
  g.lineWidth = 4
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(-17, -20)
  g.lineTo(-25 + Math.sin(wag) * 3, -31 - Math.abs(Math.cos(wag)) * 2)
  g.stroke()
  // Body and head.
  g.save()
  g.rotate(-sit * 0.22)
  g.fillStyle = brown
  rr(g, -19, -25, 38, 17, 8)
  g.fill()
  g.fillStyle = '#e8dcc6'
  g.beginPath()
  g.ellipse(-4, -22, 8, 4, 0, Math.PI, TAU)
  g.fill()
  g.fillStyle = brown
  g.beginPath()
  g.arc(19, -29, 10, 0, TAU)
  g.fill()
  rr(g, 22, -30, 13, 9, 4)
  g.fill()
  g.fillStyle = '#231a14'
  g.beginPath()
  g.arc(34.5, -27.5, 2.4, 0, TAU)
  g.arc(21, -31, 1.7, 0, TAU)
  g.fill()
  g.fillStyle = dark
  g.beginPath()
  g.ellipse(13.5, -31, 4.5, 8, 0.35, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(255,240,220,0.22)'
  g.fillRect(-13, -24, 22, 2.5)
  g.restore()
  g.restore()
}

// A fat pavement chalk lying at (x, y), `len` long.
export function drawChalk(g: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, color: number, lift: number, sun: number): void {
  g.save()
  g.translate(x, y)
  g.save()
  g.translate(3 + lift * 5, 5 + lift * 11)
  g.rotate(angle)
  g.fillStyle = `rgba(0,0,0,${(0.24 + 0.2 * sun) * (1 - lift * 0.35)})`
  rr(g, -len / 2, -15, len, 30, 9)
  g.fill()
  g.restore()
  g.translate(0, -lift * 6)
  g.rotate(angle)
  // Tapered a little, the drawing end worn to a slant.
  g.fillStyle = CHALK_DARK[color]
  g.beginPath()
  g.moveTo(-len / 2 + 6, -15)
  g.lineTo(len / 2 - 9, -13)
  g.quadraticCurveTo(len / 2 + 1, -9, len / 2 - 1, 3)
  g.quadraticCurveTo(len / 2 - 2, 12, len / 2 - 12, 13)
  g.lineTo(-len / 2 + 6, 15)
  g.quadraticCurveTo(-len / 2 - 3, 0, -len / 2 + 6, -15)
  g.fill()
  g.fillStyle = CHALK[color]
  g.beginPath()
  g.moveTo(-len / 2 + 7, -14)
  g.lineTo(len / 2 - 10, -12.5)
  g.quadraticCurveTo(len / 2 - 2, -8, len / 2 - 4, 0)
  g.lineTo(len / 2 - 14, 5)
  g.lineTo(-len / 2 + 6, 6)
  g.quadraticCurveTo(-len / 2 - 1, -3, -len / 2 + 7, -14)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.4)'
  g.fillRect(-len / 2 + 10, -11, len - 26, 3)
  // Pits and scuffs.
  g.fillStyle = 'rgba(60,50,40,0.22)'
  for (let i = 0; i < 7; i++) {
    const px = -len / 2 + 10 + ((i * 37 + color * 13) % Math.max(10, len - 22))
    const py = -9 + ((i * 11 + color * 5) % 19)
    g.fillRect(px, py, 2.2, 1.6)
  }
  g.restore()
}

// A rag: an old cotton cloth, grey with chalk.
export function drawRag(g: CanvasRenderingContext2D, x: number, y: number, angle: number, lift: number, sun: number, scrunch: number): void {
  g.save()
  g.translate(x, y)
  const pts: [number, number][] = [[-52, -22], [-30, -32], [-4, -27], [22, -34], [50, -24], [56, -2], [47, 20], [52, 30], [24, 33], [0, 27], [-26, 34], [-50, 26], [-57, 4]]
  const sx = 1 - scrunch * 0.12
  const sy = 1 - scrunch * 0.2
  const trace = (dx: number, dy: number): void => {
    g.beginPath()
    const n = pts.length
    for (let i = 0; i <= n; i++) {
      const p = pts[i % n]
      const q = pts[(i + 1) % n]
      const mx = ((p[0] + q[0]) / 2) * sx + dx
      const my = ((p[1] + q[1]) / 2) * sy + dy
      if (i === 0) g.moveTo(mx, my)
      else g.quadraticCurveTo(p[0] * sx + dx, p[1] * sy + dy, mx, my)
    }
    g.closePath()
  }
  g.save()
  g.rotate(angle)
  trace(4 + lift * 5, 6 + lift * 11)
  g.fillStyle = `rgba(0,0,0,${(0.24 + 0.2 * sun) * (1 - lift * 0.35)})`
  g.fill()
  g.restore()
  g.translate(0, -lift * 6)
  g.rotate(angle)
  trace(0, 0)
  g.fillStyle = '#9aa0a0'
  g.fill()
  g.save()
  g.clip()
  // A faded check, and the chalk it has picked up.
  g.strokeStyle = 'rgba(70,96,120,0.4)'
  g.lineWidth = 5
  for (let i = -60; i <= 60; i += 22) {
    g.beginPath()
    g.moveTo(i, -40)
    g.lineTo(i + 8, 40)
    g.moveTo(-64, i * 0.6)
    g.lineTo(64, i * 0.6 + 6)
    g.stroke()
  }
  const smudge: [number, number, number, number][] = [[-24, -6, 20, 2], [14, 8, 24, 3], [-4, 14, 16, 1], [26, -14, 15, 5], [-36, 12, 13, 0]]
  for (const [sx, sy, sr, c] of smudge) {
    g.fillStyle = CHALK[c]
    g.globalAlpha = 0.42
    g.beginPath()
    g.ellipse(sx, sy, sr, sr * 0.6, 0.4, 0, TAU)
    g.fill()
  }
  g.globalAlpha = 1
  // Folds.
  g.strokeStyle = 'rgba(30,34,38,0.35)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(-44, -12)
  g.quadraticCurveTo(-8, -2, 30, -22)
  g.moveTo(-30, 22)
  g.quadraticCurveTo(6, 6, 46, 14)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.3)'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(-44, -15)
  g.quadraticCurveTo(-8, -5, 30, -25)
  g.stroke()
  g.restore()
  g.restore()
}

export interface SkyArt {
  sun: HTMLCanvasElement
  fair: HTMLCanvasElement
  dark: HTMLCanvasElement
  // Logical size of each cloud picture.
  cw: number
  ch: number
}

function cloudArt(S: number, w: number, h: number, top: string, belly: string, seed: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.round(w * S)
  c.height = Math.round(h * S)
  const g = c.getContext('2d')!
  g.scale(S, S)
  let a = seed
  const rand = (): number => {
    a = (a * 16807) % 2147483647
    return a / 2147483647
  }
  const puffs: [number, number, number][] = [[0.2, 0.62, 0.2], [0.36, 0.44, 0.27], [0.55, 0.38, 0.3], [0.74, 0.5, 0.24], [0.86, 0.66, 0.16], [0.5, 0.68, 0.26], [0.3, 0.7, 0.2], [0.68, 0.7, 0.2]]
  // The whole shape first as a soft underside, then lit puffs on top.
  g.fillStyle = belly
  for (const [px, py, pr] of puffs) {
    g.beginPath()
    g.ellipse(px * w, py * h + 5, pr * w * 0.62, pr * h * 1.02, 0, 0, TAU)
    g.fill()
  }
  for (const [px, py, pr] of puffs) {
    const grad = g.createRadialGradient(px * w - 6, py * h - 8, 2, px * w, py * h, pr * w * 0.62)
    grad.addColorStop(0, top)
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.beginPath()
    g.ellipse(px * w, py * h, pr * w * 0.6, pr * h, 0, 0, TAU)
    g.fill()
  }
  // Grain, kept inside the cloud.
  g.globalCompositeOperation = 'source-atop'
  for (let i = 0; i < 500; i++) {
    g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(40,50,70,0.08)'
    g.fillRect(rand() * w, rand() * h, 1.6, 1.6)
  }
  return c
}

export function buildSky(S: number): SkyArt {
  const sun = document.createElement('canvas')
  sun.width = Math.round(150 * S)
  sun.height = Math.round(150 * S)
  const g = sun.getContext('2d')!
  g.scale(S, S)
  const glow = g.createRadialGradient(75, 75, 10, 75, 75, 75)
  glow.addColorStop(0, 'rgba(255,244,200,0.95)')
  glow.addColorStop(0.36, 'rgba(255,236,170,0.5)')
  glow.addColorStop(1, 'rgba(255,230,160,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, 150, 150)
  g.fillStyle = '#fff3c4'
  g.beginPath()
  g.arc(75, 75, 26, 0, TAU)
  g.fill()
  g.fillStyle = '#ffe58a'
  g.beginPath()
  g.arc(75, 75, 22, 0, TAU)
  g.fill()
  const cw = 230
  const ch = 96
  return { sun, fair: cloudArt(S, cw, ch, 'rgba(255,255,255,0.98)', '#c3ccd4', 7), dark: cloudArt(S, cw, ch, 'rgba(128,138,152,0.98)', '#4a525e', 11), cw, ch }
}
