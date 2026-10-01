// The cast of Animal Tower. Each kind is a list of physics parts in its own
// "design" coordinates plus a drawing in the same coordinates, so what the
// child sees is what collides. Ears, tails and spikes poke a few pixels past
// the parts on purpose: they read as soft.

import Matter from 'matter-js'
import { eyes } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'
import type { Sfx } from '../../kit/sfx.ts'

export type Mood = 'happy' | 'nervous' | 'wow' | 'glee'

export interface Face {
  mood: Mood
  // Where the pupils point, in the animal's own frame.
  lookX: number
  lookY: number
  blink: number
  // Seconds, for tails and wings.
  t: number
  // 0 still, 1 flapping hard (the bird).
  flap: number
  // Shear for the jelly.
  wob: number
}

type Part =
  | { t: 'r'; x: number; y: number; w: number; h: number; ch?: number }
  | { t: 'c'; x: number; y: number; r: number }
  | { t: 'p'; pts: readonly (readonly [number, number])[] }

export interface Kind {
  key: string
  parts: readonly Part[]
  density: number
  restitution: number
  friction: number
  // 0 tiny, 1 normal, 2 heavy, 3 enormous: drives thud, dust and shake.
  heft: number
  // Start pitch of its falling yelp, Hz.
  yelp: number
  draw(g: CanvasRenderingContext2D, f: Face): void
  voice(sfx: Sfx): void
}

export interface Box {
  cx: number
  cy: number
  w: number
  h: number
}

const INK = '#2a1c33'

function paint(g: CanvasRenderingContext2D, fill: string, stroke?: string, width = 5): void {
  g.fillStyle = fill
  g.fill()
  if (stroke) {
    g.strokeStyle = stroke
    g.lineWidth = width
    g.lineJoin = 'round'
    g.stroke()
  }
}

// Centre-anchored rounded rectangle path.
function rr(g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, r: number): void {
  g.beginPath()
  g.roundRect(cx - w / 2, cy - h / 2, w, h, Math.min(r, w / 2, h / 2))
}

function el(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rot = 0): void {
  g.beginPath()
  g.ellipse(cx, cy, rx, ry, rot, 0, TAU)
}

function stroke(g: CanvasRenderingContext2D, color: string, width: number): void {
  g.strokeStyle = color
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.stroke()
}

// Eyes that carry the mood. gap 0 draws one eye (a side view).
function peepers(g: CanvasRenderingContext2D, f: Face, x: number, y: number, size: number, gap = 1.15): void {
  if (f.mood === 'glee') {
    g.beginPath()
    for (const side of gap === 0 ? [0] : [-1, 1]) {
      const ex = x + side * size * gap
      g.moveTo(ex - size * 0.8, y + size * 0.3)
      g.quadraticCurveTo(ex, y - size * 0.9, ex + size * 0.8, y + size * 0.3)
    }
    stroke(g, INK, Math.max(3, size * 0.34))
    return
  }
  const s = f.mood === 'wow' ? size * 1.2 : size
  eyes(g, x, y, s, f.lookX, f.lookY, f.blink, (gap * size) / s)
  if (f.mood === 'nervous') {
    const dx = x + size * (gap + 1.9)
    const dy = y - size * 1.5 + ((f.t * 40) % 14)
    g.beginPath()
    g.moveTo(dx, dy - size * 0.9)
    g.quadraticCurveTo(dx + size * 0.6, dy, dx, dy + size * 0.35)
    g.quadraticCurveTo(dx - size * 0.6, dy, dx, dy - size * 0.9)
    paint(g, '#8fdcff', '#3d9ad1', 2)
  }
}

function mouth(g: CanvasRenderingContext2D, f: Face, x: number, y: number, s: number): void {
  if (f.mood === 'glee') {
    g.beginPath()
    g.arc(x, y - s * 0.3, s, 0, Math.PI)
    g.closePath()
    paint(g, '#5a1f2e', INK, Math.max(2, s * 0.18))
    el(g, x, y + s * 0.3, s * 0.45, s * 0.28)
    paint(g, '#ff7d95')
  } else if (f.mood === 'wow') {
    el(g, x, y + s * 0.2, s * 0.5, s * 0.7)
    paint(g, INK)
  } else if (f.mood === 'nervous') {
    g.beginPath()
    g.moveTo(x - s, y)
    g.quadraticCurveTo(x - s * 0.5, y - s * 0.6, x, y)
    g.quadraticCurveTo(x + s * 0.5, y + s * 0.6, x + s, y)
    stroke(g, INK, Math.max(2.5, s * 0.24))
  } else {
    g.beginPath()
    g.arc(x, y - s * 0.5, s, 0.15 * Math.PI, 0.85 * Math.PI)
    stroke(g, INK, Math.max(2.5, s * 0.24))
  }
}

function blush(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  el(g, x, y, r, r * 0.65)
  paint(g, 'rgba(255,120,150,0.45)')
}

const bear: Kind = {
  key: 'bear',
  parts: [{ t: 'r', x: 0, y: 0, w: 124, h: 108, ch: 24 }],
  density: 0.001,
  restitution: 0.05,
  friction: 0.85,
  heft: 1,
  yelp: 520,
  draw(g, f) {
    const C = '#c98a4b'
    const D = '#7a4a22'
    const L = '#f3d6a4'
    for (const side of [-1, 1]) {
      el(g, side * 42, -46, 18, 18)
      paint(g, C, D)
      el(g, side * 42, -46, 8, 8)
      paint(g, L)
    }
    rr(g, 0, 0, 124, 108, 24)
    paint(g, C, D)
    el(g, 0, 30, 34, 20)
    paint(g, L)
    for (const side of [-1, 1]) {
      el(g, side * 44, 42, 14, 10)
      paint(g, '#a86b35', D, 3)
    }
    el(g, 0, -6, 24, 17)
    paint(g, L)
    el(g, 0, -13, 8, 6)
    paint(g, INK)
    blush(g, -40, -8, 9)
    blush(g, 40, -8, 9)
    peepers(g, f, 0, -28, 10, 2.3)
    mouth(g, f, 0, 0, 8)
  },
  voice(sfx) {
    sfx.tone({ freq: 210, to: 130, dur: 0.2, type: 'triangle', vol: 0.28 })
  },
}

const hippo: Kind = {
  key: 'hippo',
  parts: [{ t: 'r', x: 0, y: 0, w: 180, h: 116, ch: 38 }],
  density: 0.0011,
  restitution: 0.05,
  friction: 0.85,
  heft: 2,
  yelp: 330,
  draw(g, f) {
    const C = '#b9a0e6'
    const D = '#6a55a3'
    const L = '#d9ccf5'
    for (const side of [-1, 1]) {
      el(g, side * 64, -52, 14, 14)
      paint(g, C, D)
      el(g, side * 64, -52, 6, 6)
      paint(g, '#f2a7c8')
    }
    rr(g, 0, 0, 180, 116, 38)
    paint(g, C, D)
    el(g, 0, 22, 68, 31)
    paint(g, L, D, 3)
    for (const side of [-1, 1]) {
      el(g, side * 22, 8, 7, 9)
      paint(g, D)
      rr(g, side * 30, 50, 15, 13, 4)
      paint(g, '#ffffff', D, 2.5)
    }
    blush(g, -66, -2, 10)
    blush(g, 66, -2, 10)
    peepers(g, f, 0, -28, 12, 2.4)
    mouth(g, f, 0, 32, 12)
  },
  voice(sfx) {
    sfx.tone({ freq: 120, to: 78, dur: 0.28, type: 'sawtooth', vol: 0.16 })
    sfx.boing(-5)
  },
}

const croc: Kind = {
  key: 'croc',
  parts: [
    { t: 'r', x: 0, y: 8, w: 264, h: 54, ch: 16 },
    { t: 'c', x: 80, y: -14, r: 20 },
  ],
  density: 0.001,
  restitution: 0.04,
  friction: 0.9,
  heft: 1,
  yelp: 420,
  draw(g, f) {
    const C = '#66c760'
    const D = '#2c7a36'
    const L = '#d3f2a6'
    g.beginPath()
    for (let x = -120; x < 40; x += 22) {
      g.moveTo(x, -16)
      g.lineTo(x + 11, -29)
      g.lineTo(x + 22, -16)
    }
    paint(g, '#3f9e48', D, 3)
    el(g, 80, -14, 20, 20)
    paint(g, C, D)
    rr(g, 0, 8, 264, 54, 16)
    paint(g, C, D)
    el(g, 80, -6, 17, 12)
    paint(g, C)
    rr(g, -14, 27, 220, 11, 5)
    paint(g, L)
    for (const x of [-72, 58]) {
      rr(g, x, 29, 36, 12, 6)
      paint(g, '#3f9e48', D, 3)
    }
    // Tail stripes.
    g.beginPath()
    for (const x of [-112, -96, -80]) {
      g.moveTo(x, -8)
      g.lineTo(x, 12)
    }
    stroke(g, '#3f9e48', 5)
    el(g, 120, -10, 4, 3)
    paint(g, D)
    if (f.mood === 'wow' || f.mood === 'glee') {
      g.beginPath()
      g.moveTo(44, 8)
      g.lineTo(130, -2)
      g.lineTo(130, 24)
      g.closePath()
      paint(g, '#8a2238', D, 3)
    } else {
      g.beginPath()
      g.moveTo(130, 10)
      g.lineTo(52, 10)
      g.quadraticCurveTo(40, 10, 36, 0)
      stroke(g, D, 4)
    }
    g.beginPath()
    for (let x = 62; x < 124; x += 15) {
      g.moveTo(x, 10)
      g.lineTo(x + 5, 19)
      g.lineTo(x + 10, 10)
    }
    paint(g, '#ffffff', D, 2)
    peepers(g, f, 80, -18, 11, 0)
  },
  voice(sfx) {
    sfx.crunch()
  },
}

const giraffe: Kind = {
  key: 'giraffe',
  parts: [
    { t: 'r', x: -10, y: 85, w: 124, h: 90, ch: 12 },
    { t: 'r', x: 30, y: -20, w: 42, h: 140 },
    { t: 'r', x: 52, y: -108, w: 88, h: 46, ch: 16 },
  ],
  density: 0.001,
  restitution: 0.05,
  friction: 0.85,
  heft: 1,
  yelp: 700,
  draw(g, f) {
    const C = '#ffd24d'
    const D = '#a86a1a'
    const S = '#d18a2c'
    // Tail.
    g.beginPath()
    g.moveTo(-70, 52)
    g.quadraticCurveTo(-86, 60, -80 + Math.sin(f.t * 5) * 4, 84)
    stroke(g, D, 5)
    el(g, -80 + Math.sin(f.t * 5) * 4, 88, 6, 8)
    paint(g, D)
    // Legs, back pair darker.
    for (const [x, c] of [[-38, '#e8b93a'], [10, '#e8b93a'], [-60, C], [40, C]] as const) {
      rr(g, x, 106, 22, 48, 8)
      paint(g, c, D)
      rr(g, x, 124, 22, 12, 5)
      paint(g, D)
    }
    rr(g, -10, 66, 124, 58, 24)
    paint(g, C, D)
    rr(g, 30, -22, 42, 150, 16)
    paint(g, C, D)
    // Hide the seam where the neck meets the body.
    rr(g, 26, 56, 40, 30, 10)
    paint(g, C)
    // Ossicones and ear.
    g.beginPath()
    g.moveTo(22, -128)
    g.lineTo(20, -140)
    g.moveTo(40, -128)
    g.lineTo(42, -140)
    stroke(g, D, 5)
    el(g, 20, -142, 5, 5)
    paint(g, S)
    el(g, 42, -142, 5, 5)
    paint(g, S)
    el(g, 8, -116, 13, 7, -0.5)
    paint(g, C, D, 3)
    rr(g, 52, -108, 88, 46, 18)
    paint(g, C, D)
    rr(g, 30, -84, 38, 20, 8)
    paint(g, C)
    rr(g, 78, -104, 34, 36, 14)
    paint(g, '#fff0c2')
    el(g, 88, -112, 3, 3)
    paint(g, D)
    for (const [x, y, r] of [[-42, 58, 11], [-14, 74, 9], [12, 56, 8], [-58, 78, 7], [28, 22, 8], [24, -12, 7], [36, -40, 7], [28, -66, 6], [36, 80, 7]] as const) {
      el(g, x, y, r, r * 0.85, 0.4)
      paint(g, S)
    }
    blush(g, 66, -96, 7)
    peepers(g, f, 50, -114, 10, 0)
    mouth(g, f, 86, -94, 6)
  },
  voice(sfx) {
    sfx.tone({ freq: 520, to: 760, dur: 0.16, type: 'sine', vol: 0.22 })
  },
}

const elephant: Kind = {
  key: 'elephant',
  parts: [
    { t: 'r', x: -20, y: 0, w: 172, h: 126, ch: 30 },
    { t: 'c', x: 78, y: -12, r: 52 },
    { t: 'r', x: 128, y: 24, w: 30, h: 78, ch: 12 },
  ],
  density: 0.0011,
  restitution: 0.05,
  friction: 0.85,
  heft: 2,
  yelp: 380,
  draw(g, f) {
    const C = '#9bbde0'
    const D = '#4a6f96'
    const E = '#7fa5cf'
    g.beginPath()
    g.moveTo(-104, -24)
    g.quadraticCurveTo(-120, -10, -114 + Math.sin(f.t * 4) * 4, 12)
    stroke(g, D, 5)
    rr(g, -20, 0, 172, 126, 30)
    paint(g, C, D)
    // Leg split and toenails.
    g.beginPath()
    g.moveTo(-28, 28)
    g.lineTo(-28, 60)
    stroke(g, D, 4)
    for (const x of [-92, -76, -60, -8, 8, 24]) {
      el(g, x, 57, 6, 5)
      paint(g, '#f4f0e6')
    }
    rr(g, 128, 24, 30, 78, 13)
    paint(g, C, D)
    g.beginPath()
    for (const y of [20, 34, 48]) {
      g.moveTo(118, y)
      g.lineTo(138, y)
    }
    stroke(g, D, 2.5)
    el(g, 78, -12, 52, 52)
    paint(g, C, D)
    rr(g, 124, 4, 22, 30, 8)
    paint(g, C)
    el(g, 44, -8, 30, 42, 0.12)
    paint(g, E, D)
    el(g, 46, -6, 17, 27, 0.12)
    paint(g, '#f2b3cf')
    g.beginPath()
    g.moveTo(98, 18)
    g.quadraticCurveTo(104, 40, 116, 34)
    stroke(g, '#ffffff', 8)
    blush(g, 106, -2, 8)
    peepers(g, f, 94, -30, 11, 0)
    mouth(g, f, 96, 10, 7)
  },
  voice(sfx) {
    sfx.tone({ freq: 310, to: 560, dur: 0.22, type: 'sawtooth', vol: 0.13 })
    sfx.tone({ freq: 560, to: 470, dur: 0.22, type: 'sawtooth', vol: 0.11, delay: 0.2 })
  },
}

const DOME: [number, number][] = []
for (let i = 0; i <= 10; i++) {
  const a = Math.PI + (i / 10) * Math.PI
  DOME.push([Math.cos(a) * 74, 32 + Math.sin(a) * 74])
}

const hedgehog: Kind = {
  key: 'hedgehog',
  parts: [{ t: 'p', pts: DOME }],
  density: 0.001,
  restitution: 0.1,
  friction: 0.8,
  heft: 1,
  yelp: 900,
  draw(g, f) {
    const D = '#5b3a1e'
    g.beginPath()
    for (let i = 0; i < 11; i++) {
      const a0 = Math.PI * (0.98 + i * 0.07)
      const a1 = a0 + Math.PI * 0.07
      const am = (a0 + a1) / 2
      g.moveTo(Math.cos(a0) * 70, 32 + Math.sin(a0) * 70)
      g.lineTo(Math.cos(am) * 90, 32 + Math.sin(am) * 90)
      g.lineTo(Math.cos(a1) * 70, 32 + Math.sin(a1) * 70)
    }
    paint(g, '#8a5a2e', D, 4)
    g.beginPath()
    g.arc(0, 32, 74, Math.PI, TAU)
    g.closePath()
    paint(g, '#a87442', D)
    // Inner rows of spikes as little ticks.
    g.beginPath()
    for (const [x, y] of [[-44, -2], [-22, -16], [2, -22], [-36, 18], [-12, 6], [10, -2]] as const) {
      g.moveTo(x, y)
      g.lineTo(x - 5, y - 11)
    }
    stroke(g, D, 4)
    el(g, 40, 10, 29, 20)
    paint(g, '#f8e0b8')
    el(g, 68, 14, 7, 7)
    paint(g, INK)
    for (const x of [-32, 28]) {
      el(g, x, 29, 13, 5)
      paint(g, D)
    }
    blush(g, 50, 18, 6)
    peepers(g, f, 38, 2, 9, 0)
    mouth(g, f, 54, 22, 5)
  },
  voice(sfx) {
    sfx.pop(3)
    sfx.tick()
  },
}

const penguin: Kind = {
  key: 'penguin',
  parts: [{ t: 'r', x: 0, y: 0, w: 82, h: 132, ch: 36 }],
  density: 0.001,
  restitution: 0.05,
  friction: 0.85,
  heft: 1,
  yelp: 760,
  draw(g, f) {
    const C = '#414a6b'
    const D = '#1f2438'
    for (const side of [-1, 1]) {
      el(g, side * 40, 8, 9, 30, side * (0.12 + f.flap * 0.5 * Math.abs(Math.sin(f.t * 20))))
      paint(g, C, D, 4)
    }
    rr(g, 0, 0, 82, 132, 36)
    paint(g, C, D)
    el(g, 0, 18, 28, 44)
    paint(g, '#ffffff')
    el(g, 0, -34, 27, 22)
    paint(g, '#ffffff')
    for (const side of [-1, 1]) {
      el(g, side * 17, 62, 15, 6)
      paint(g, '#ffa63d', '#c46d12', 3)
    }
    g.beginPath()
    g.moveTo(-9, -24)
    g.lineTo(9, -24)
    g.lineTo(0, -12)
    g.closePath()
    paint(g, '#ffa63d', '#c46d12', 3)
    blush(g, -24, -24, 6)
    blush(g, 24, -24, 6)
    peepers(g, f, 0, -38, 9, 1.5)
    if (f.mood !== 'happy') mouth(g, f, 0, -4, 5)
  },
  voice(sfx) {
    sfx.tone({ freq: 760, to: 520, dur: 0.1, type: 'square', vol: 0.09 })
  },
}

const mouse: Kind = {
  key: 'mouse',
  parts: [{ t: 'r', x: 0, y: 0, w: 70, h: 50, ch: 22 }],
  density: 0.0007,
  restitution: 0.15,
  friction: 0.85,
  heft: 0,
  yelp: 1800,
  draw(g, f) {
    const C = '#d2d2e0'
    const D = '#7e7e96'
    g.beginPath()
    g.moveTo(-32, 14)
    g.bezierCurveTo(-54, 22, -52, -6 + Math.sin(f.t * 6) * 4, -64, -4)
    stroke(g, '#f2a7c8', 4)
    for (const side of [-1, 1]) {
      el(g, side * 25, -22, 16, 16)
      paint(g, C, D, 4)
      el(g, side * 25, -22, 9, 9)
      paint(g, '#f7b8d2')
    }
    rr(g, 0, 0, 70, 50, 22)
    paint(g, C, D)
    g.beginPath()
    for (const side of [-1, 1]) {
      g.moveTo(side * 8, 10)
      g.lineTo(side * 26, 6)
      g.moveTo(side * 8, 12)
      g.lineTo(side * 26, 15)
    }
    stroke(g, D, 1.5)
    el(g, 0, 9, 5, 4)
    paint(g, '#ff7fa8')
    peepers(g, f, 0, -5, 7, 1.7)
    mouth(g, f, 0, 17, 4)
  },
  voice(sfx) {
    sfx.tone({ freq: 1900, to: 2500, dur: 0.07, type: 'sine', vol: 0.16 })
    sfx.tone({ freq: 2100, to: 2700, dur: 0.07, type: 'sine', vol: 0.16, delay: 0.1 })
  },
}

const whale: Kind = {
  key: 'whale',
  parts: [
    { t: 'r', x: 10, y: 0, w: 304, h: 128, ch: 60 },
    { t: 'r', x: -162, y: -24, w: 56, h: 60, ch: 10 },
  ],
  density: 0.0012,
  restitution: 0.05,
  friction: 0.85,
  heft: 3,
  yelp: 240,
  draw(g, f) {
    const C = '#4fa8ec'
    const D = '#2060a0'
    const wag = Math.sin(f.t * 3) * 0.08
    // Tail stalk and flukes.
    rr(g, -150, -6, 60, 44, 16)
    paint(g, C, D)
    el(g, -176, -40, 24, 13, 0.95 + wag)
    paint(g, C, D)
    el(g, -156, -46, 24, 13, -0.45 + wag)
    paint(g, C, D)
    rr(g, 10, 0, 304, 128, 60)
    paint(g, C, D)
    rr(g, -132, -4, 40, 34, 12)
    paint(g, C)
    // Pale belly with grooves.
    g.save()
    rr(g, 10, 0, 298, 122, 58)
    g.clip()
    g.fillStyle = '#e8f6ff'
    g.fillRect(-150, 26, 330, 50)
    g.beginPath()
    for (const y of [38, 50]) {
      g.moveTo(-90, y)
      g.lineTo(130, y)
    }
    stroke(g, '#b9dcf5', 3)
    g.restore()
    el(g, 12, 34, 34, 13, 0.5)
    paint(g, '#3b8fd6', D, 4)
    el(g, 52, -60, 9, 4)
    paint(g, D)
    blush(g, 132, 10, 10)
    peepers(g, f, 112, -14, 13, 0)
    mouth(g, f, 136, 28, 10)
  },
  voice(sfx) {
    sfx.tone({ freq: 95, to: 55, dur: 0.7, type: 'sine', vol: 0.4 })
    sfx.tone({ freq: 300, to: 620, dur: 0.5, type: 'sine', vol: 0.12, delay: 0.1 })
    sfx.noise({ dur: 0.5, vol: 0.18, freq: 900, to: 3000, filter: 'bandpass', delay: 0.05 })
  },
}

const jelly: Kind = {
  key: 'jelly',
  parts: [{ t: 'p', pts: [[-72, 52], [72, 52], [50, -52], [-50, -52]] }],
  density: 0.0007,
  restitution: 0.55,
  friction: 0.6,
  heft: 1,
  yelp: 620,
  draw(g, f) {
    g.save()
    g.transform(1, 0, f.wob + Math.sin(f.t * 5) * 0.03, 1, 0, 0)
    g.translate(0, 0)
    g.beginPath()
    g.moveTo(-72, 52)
    g.lineTo(72, 52)
    g.lineTo(54, -36)
    g.quadraticCurveTo(50, -52, 34, -52)
    g.lineTo(-34, -52)
    g.quadraticCurveTo(-50, -52, -54, -36)
    g.closePath()
    paint(g, 'rgba(255,105,160,0.9)', '#c43c78')
    g.beginPath()
    g.moveTo(-40, -36)
    g.quadraticCurveTo(-52, 0, -54, 36)
    stroke(g, 'rgba(255,255,255,0.65)', 9)
    el(g, 26, -40, 14, 5)
    paint(g, 'rgba(255,255,255,0.5)')
    blush(g, -30, 10, 8)
    blush(g, 30, 10, 8)
    peepers(g, f, 0, -6, 10, 1.6)
    mouth(g, f, 0, 20, 8)
    g.restore()
  },
  voice(sfx) {
    sfx.tone({ freq: 280, to: 560, dur: 0.14, type: 'sine', vol: 0.25 })
    sfx.tone({ freq: 340, to: 640, dur: 0.14, type: 'sine', vol: 0.2, delay: 0.13 })
    sfx.tone({ freq: 400, to: 700, dur: 0.14, type: 'sine', vol: 0.14, delay: 0.26 })
  },
}

const bird: Kind = {
  key: 'bird',
  parts: [{ t: 'r', x: 0, y: 0, w: 78, h: 68, ch: 31 }],
  density: 0.0006,
  restitution: 0.1,
  friction: 0.85,
  heft: 0,
  yelp: 1500,
  draw(g, f) {
    const C = '#ff6f61'
    const D = '#a8322a'
    const lift = f.flap * Math.sin(f.t * 34)
    for (const side of [-1, 1]) {
      el(g, side * (40 + f.flap * 12), 2 - f.flap * 8, 12 + f.flap * 12, 22, side * (0.2 + f.flap * 0.9 + lift * 0.7))
      paint(g, '#e2493c', D, 4)
    }
    g.beginPath()
    g.moveTo(-8, -32)
    g.lineTo(-12, -46)
    g.moveTo(0, -33)
    g.lineTo(0, -50)
    g.moveTo(8, -32)
    g.lineTo(13, -45)
    stroke(g, D, 5)
    rr(g, 0, 0, 78, 68, 31)
    paint(g, C, D)
    el(g, 0, 16, 24, 14)
    paint(g, '#ffd9c9')
    for (const side of [-1, 1]) {
      el(g, side * 13, 33, 10, 4)
      paint(g, '#ffa63d')
    }
    g.beginPath()
    g.moveTo(-10, -2)
    g.lineTo(10, -2)
    g.lineTo(0, 12)
    g.closePath()
    paint(g, '#ffb02e', '#c46d12', 3)
    peepers(g, f, 0, -14, 9, 1.45)
  },
  voice(sfx) {
    sfx.tone({ freq: 2300, to: 3000, dur: 0.07, type: 'sine', vol: 0.14 })
    sfx.tone({ freq: 2600, to: 3300, dur: 0.07, type: 'sine', vol: 0.14, delay: 0.11 })
  },
}

export const KINDS = { bear, hippo, croc, giraffe, elephant, hedgehog, penguin, mouse, whale, jelly, bird }

const boxes = new Map<string, Box>()

// Bounding box of a kind's parts, in design coordinates.
export function boxOf(kind: Kind): Box {
  const hit = boxes.get(kind.key)
  if (hit) return hit
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  const grow = (ax: number, ay: number, bx: number, by: number) => {
    x0 = Math.min(x0, ax)
    y0 = Math.min(y0, ay)
    x1 = Math.max(x1, bx)
    y1 = Math.max(y1, by)
  }
  for (const p of kind.parts) {
    if (p.t === 'r') grow(p.x - p.w / 2, p.y - p.h / 2, p.x + p.w / 2, p.y + p.h / 2)
    else if (p.t === 'c') grow(p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r)
    else for (const [x, y] of p.pts) grow(x, y, x, y)
  }
  const box = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 }
  boxes.set(kind.key, box)
  return box
}

export interface Built {
  body: Matter.Body
  // Centre of mass in design coordinates: where the drawing's origin sits
  // relative to body.position.
  comX: number
  comY: number
}

// Heavier to turn than real: a lean is slow enough to watch, and a landing
// rocks instead of rolling.
const INERTIA = 2

export function build(kind: Kind): Built {
  const { Bodies, Body, Vertices } = Matter
  const surface = { friction: kind.friction, frictionStatic: 1.4, restitution: kind.restitution, frictionAir: 0.012 }
  const one = kind.parts.length === 1
  const partOptions = one ? { density: kind.density, ...surface } : { density: kind.density }
  const bodies = kind.parts.map((p) => {
    if (p.t === 'r') return Bodies.rectangle(p.x, p.y, p.w, p.h, p.ch ? { ...partOptions, chamfer: { radius: p.ch } } : partOptions)
    if (p.t === 'c') return Bodies.circle(p.x, p.y, p.r, partOptions)
    const verts = p.pts.map(([x, y]) => ({ x, y }))
    const c = Vertices.centre(verts)
    return Bodies.fromVertices(c.x, c.y, [verts], partOptions)
  })
  let body = bodies[0]!
  if (!one) {
    body = Body.create({ parts: bodies, ...surface })
    // Matter sums the parts' inertias without the parallel-axis term, which
    // makes a long giraffe spin like a coin. Put the term back.
    let inertia = 0
    for (const part of bodies) {
      const dx = part.position.x - body.position.x
      const dy = part.position.y - body.position.y
      inertia += part.inertia + part.mass * (dx * dx + dy * dy) * 2
    }
    Body.setInertia(body, inertia * INERTIA)
  } else {
    Body.setInertia(body, body.inertia * INERTIA)
  }
  return { body, comX: body.position.x, comY: body.position.y }
}
