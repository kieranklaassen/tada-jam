// Procedural round snacks for Snack Merge. Each kind paints itself once into an
// offscreen canvas (made inside `create`, never at import time); the game draws
// that canvas rotated and squashed, then a live face on top.

import { TAU } from '../../kit/math.ts'

export interface Kind {
  name: string
  // Physical radius in logical pixels.
  r: number
  // Main colour (banner text) and the particle colours of its pop.
  color: string
  burst: readonly string[]
  // Face centre (in radii, down is positive) and one eye's radius (in radii).
  faceY: number
  eye: number
  paint(c: CanvasRenderingContext2D, r: number): void
}

// How far the painted canvas reaches past the radius (stems, crowns).
export const ART_REACH = 1.6
const ART_SCALE = 2

function ball(c: CanvasRenderingContext2D, r: number, light: string, mid: string, dark: string, outline: string): void {
  const grad = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r)
  grad.addColorStop(0, light)
  grad.addColorStop(0.55, mid)
  grad.addColorStop(1, dark)
  const lw = Math.max(2.5, r * 0.065)
  c.beginPath()
  c.arc(0, 0, r - lw / 2, 0, TAU)
  c.fillStyle = grad
  c.fill()
  c.lineWidth = lw
  c.strokeStyle = outline
  c.stroke()
}

function shine(c: CanvasRenderingContext2D, r: number, alpha = 0.45): void {
  c.beginPath()
  c.ellipse(-r * 0.42, -r * 0.52, r * 0.26, r * 0.13, -0.7, 0, TAU)
  c.fillStyle = `rgba(255,255,255,${alpha})`
  c.fill()
}

function dot(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  c.beginPath()
  c.arc(x, y, r, 0, TAU)
  c.fillStyle = fill
  c.fill()
}

function wobbly(c: CanvasRenderingContext2D, r: number, amp: number, lobes: number, phase: number, fill: string): void {
  c.beginPath()
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * TAU
    const rr = r * (1 + amp * Math.sin(a * lobes + phase))
    if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  c.closePath()
  c.fillStyle = fill
  c.fill()
}

const SPRINKLES = ['#ffffff', '#ffe14d', '#4db8ff', '#5ed36a', '#ff5d5d', '#b07cff']

// Sprinkles on a ring, skipping the arc where the face sits (straight down).
function sprinkles(c: CanvasRenderingContext2D, r: number, count: number, skip: number): void {
  c.lineCap = 'round'
  c.lineWidth = Math.max(2, r * 0.06)
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + 0.3
    const fromDown = Math.abs(((a - Math.PI / 2 + Math.PI * 3) % TAU) - Math.PI)
    if (fromDown < skip) continue
    const rad = r * (0.5 + ((i * 37) % 10) * 0.022)
    const x = Math.cos(a) * rad
    const y = Math.sin(a) * rad
    const t = i * 2.4
    c.strokeStyle = SPRINKLES[i % SPRINKLES.length]!
    c.beginPath()
    c.moveTo(x - Math.cos(t) * r * 0.06, y - Math.sin(t) * r * 0.06)
    c.lineTo(x + Math.cos(t) * r * 0.06, y + Math.sin(t) * r * 0.06)
    c.stroke()
  }
}

function punchHole(c: CanvasRenderingContext2D, x: number, y: number, r: number, rim: string, dough: string): void {
  dot(c, x, y, r * 1.45, dough)
  c.save()
  c.globalCompositeOperation = 'destination-out'
  dot(c, x, y, r, '#000')
  c.restore()
  c.beginPath()
  c.arc(x, y, r, 0, TAU)
  c.lineWidth = Math.max(2, r * 0.22)
  c.strokeStyle = rim
  c.stroke()
}

function starShape(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.5
    if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  c.closePath()
  c.fillStyle = fill
  c.fill()
}

export const KINDS: readonly Kind[] = [
  {
    name: 'BLUEBERRY',
    r: 29,
    color: '#7f95ff',
    burst: ['#9db4ff', '#5468e8', '#ffffff'],
    faceY: 0.12,
    eye: 0.2,
    paint(c, r) {
      ball(c, r, '#a9bdff', '#5468e8', '#2e3a9e', '#232a78')
      starShape(c, 0, -r * 0.62, r * 0.3, '#232a78')
      dot(c, 0, -r * 0.62, r * 0.09, '#5468e8')
      shine(c, r)
    },
  },
  {
    name: 'CHERRY',
    r: 38,
    color: '#ff5468',
    burst: ['#ff8a8a', '#e82c3c', '#6cc04a'],
    faceY: 0.12,
    eye: 0.18,
    paint(c, r) {
      c.lineCap = 'round'
      c.strokeStyle = '#4f9a3a'
      c.lineWidth = r * 0.12
      c.beginPath()
      c.moveTo(0, -r * 0.8)
      c.quadraticCurveTo(r * 0.05, -r * 1.3, r * 0.5, -r * 1.38)
      c.stroke()
      c.beginPath()
      c.ellipse(r * 0.66, -r * 1.27, r * 0.3, r * 0.15, 0.5, 0, TAU)
      c.fillStyle = '#6cc04a'
      c.fill()
      ball(c, r, '#ff9c9c', '#e82c3c', '#a8122a', '#7d0f22')
      shine(c, r, 0.55)
    },
  },
  {
    name: 'COOKIE',
    r: 48,
    color: '#f0b565',
    burst: ['#f5cf8e', '#dfa55a', '#5a3418'],
    faceY: 0.14,
    eye: 0.15,
    paint(c, r) {
      ball(c, r, '#f8d79c', '#e0a85c', '#bd7f38', '#8a5a26')
      const chips: [number, number, number][] = [
        [-0.55, -0.45, 0.13],
        [0, -0.66, 0.12],
        [0.5, -0.5, 0.14],
        [-0.74, 0.12, 0.11],
        [0.74, 0.08, 0.12],
        [-0.5, 0.62, 0.12],
        [0.46, 0.64, 0.13],
      ]
      for (const [x, y, s] of chips) {
        dot(c, x * r, y * r, s * r, '#5a3418')
        dot(c, x * r - s * r * 0.3, y * r - s * r * 0.3, s * r * 0.3, '#8a5a36')
      }
    },
  },
  {
    name: 'DONUT',
    r: 60,
    color: '#ff8fc0',
    burst: ['#ff8fc0', '#ffd0e4', '#ffe14d', '#4db8ff'],
    faceY: 0.42,
    eye: 0.11,
    paint(c, r) {
      ball(c, r, '#f9dba6', '#e8b06a', '#c4873f', '#94602a')
      wobbly(c, r * 0.8, 0.07, 7, 1, '#ff8fc0')
      c.beginPath()
      c.ellipse(-r * 0.36, -r * 0.5, r * 0.22, r * 0.09, -0.7, 0, TAU)
      c.fillStyle = 'rgba(255,255,255,0.5)'
      c.fill()
      sprinkles(c, r, 16, 0.95)
      punchHole(c, 0, -r * 0.12, r * 0.19, '#94602a', '#e8b06a')
    },
  },
  {
    name: 'BURGER',
    r: 73,
    color: '#f0a040',
    burst: ['#eaa446', '#6cc04a', '#e8402f', '#ffcc33'],
    faceY: -0.46,
    eye: 0.11,
    paint(c, r) {
      const lw = Math.max(2.5, r * 0.065)
      c.save()
      c.beginPath()
      c.arc(0, 0, r - lw / 2, 0, TAU)
      c.clip()
      c.fillStyle = '#dc9a40'
      c.fillRect(-r, r * 0.5, r * 2, r)
      c.fillStyle = '#6e3b1e'
      c.fillRect(-r, r * 0.26, r * 2, r * 0.3)
      c.fillStyle = '#8a4c28'
      c.fillRect(-r, r * 0.26, r * 2, r * 0.07)
      // Cheese with drips.
      c.fillStyle = '#ffcc33'
      c.beginPath()
      c.moveTo(-r, r * 0.16)
      c.lineTo(r, r * 0.16)
      c.lineTo(r, r * 0.28)
      for (let i = 0; i < 5; i++) {
        const x = r - (i + 0.5) * (r * 0.4)
        c.lineTo(x + r * 0.12, r * 0.28)
        c.lineTo(x, r * (0.4 + (i % 2) * 0.06))
        c.lineTo(x - r * 0.12, r * 0.28)
      }
      c.lineTo(-r, r * 0.28)
      c.closePath()
      c.fill()
      c.fillStyle = '#e8402f'
      c.fillRect(-r, r * 0.06, r * 2, r * 0.12)
      // Frilly lettuce.
      c.fillStyle = '#6cc04a'
      c.beginPath()
      c.moveTo(-r, r * 0.12)
      for (let i = 0; i <= 12; i++) {
        const x = -r + (i / 12) * r * 2
        c.quadraticCurveTo(x - r / 12, r * (i % 2 ? 0.17 : 0.07), x, r * 0.12)
      }
      c.lineTo(r, -r * 0.06)
      c.lineTo(-r, -r * 0.06)
      c.closePath()
      c.fill()
      const bun = c.createLinearGradient(0, -r, 0, 0)
      bun.addColorStop(0, '#f7c46c')
      bun.addColorStop(1, '#e2993a')
      c.fillStyle = bun
      c.fillRect(-r, -r, r * 2, r * 0.98)
      c.restore()
      c.beginPath()
      c.arc(0, 0, r - lw / 2, 0, TAU)
      c.lineWidth = lw
      c.strokeStyle = '#8a5522'
      c.stroke()
      const seeds: [number, number, number][] = [
        [-0.62, -0.52, 0.5],
        [-0.34, -0.8, 0.2],
        [0.34, -0.8, -0.2],
        [0.62, -0.52, -0.5],
        [0, -0.86, 0],
      ]
      for (const [x, y, rot] of seeds) {
        c.beginPath()
        c.ellipse(x * r, y * r, r * 0.07, r * 0.035, rot + Math.PI / 2, 0, TAU)
        c.fillStyle = '#fff4d0'
        c.fill()
      }
      shine(c, r, 0.3)
    },
  },
  {
    name: 'PIZZA',
    r: 87,
    color: '#ffd65c',
    burst: ['#ffd65c', '#d8432a', '#dfa152', '#6cc04a'],
    faceY: 0,
    eye: 0.1,
    paint(c, r) {
      ball(c, r, '#f6d59a', '#dfa152', '#b9772f', '#8a5522')
      dot(c, 0, 0, r * 0.83, '#d8432a')
      wobbly(c, r * 0.77, 0.035, 9, 0.4, '#ffd65c')
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.52
        const x = Math.cos(a) * r * 0.56
        const y = Math.sin(a) * r * 0.56
        dot(c, x, y, r * 0.14, '#d83a2e')
        dot(c, x - r * 0.04, y - r * 0.03, r * 0.035, '#a82218')
        dot(c, x + r * 0.05, y + r * 0.04, r * 0.03, '#a82218')
        const b = a + TAU / 12
        c.beginPath()
        c.ellipse(Math.cos(b) * r * 0.6, Math.sin(b) * r * 0.6, r * 0.08, r * 0.04, b, 0, TAU)
        c.fillStyle = '#4f9a3a'
        c.fill()
      }
      shine(c, r, 0.3)
    },
  },
  {
    name: 'CAKE',
    r: 102,
    color: '#ff9cc6',
    burst: ['#ff9cc6', '#ffffff', '#ffe14d', '#4db8ff'],
    faceY: 0.24,
    eye: 0.1,
    paint(c, r) {
      ball(c, r, '#ffd9ea', '#ff9cc6', '#e76aa2', '#b8447c')
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU
        const x = Math.cos(a) * r * 0.76
        const y = Math.sin(a) * r * 0.76
        dot(c, x, y, r * 0.16, '#f3c1d8')
        dot(c, x - r * 0.015, y - r * 0.02, r * 0.14, '#ffffff')
      }
      const candles = ['#4db8ff', '#ffe14d', '#5ed36a']
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * r * 0.3
        const base = -r * (0.22 + (i === 1 ? 0.06 : 0))
        const h = r * 0.36
        c.fillStyle = candles[i]!
        c.beginPath()
        c.roundRect(x - r * 0.05, base - h, r * 0.1, h, r * 0.03)
        c.fill()
        c.strokeStyle = 'rgba(255,255,255,0.8)'
        c.lineWidth = r * 0.025
        for (let k = 1; k < 4; k++) {
          c.beginPath()
          c.moveTo(x - r * 0.05, base - h * (k / 4) + r * 0.03)
          c.lineTo(x + r * 0.05, base - h * (k / 4) - r * 0.03)
          c.stroke()
        }
        c.beginPath()
        c.ellipse(x, base - h - r * 0.09, r * 0.06, r * 0.1, 0, 0, TAU)
        c.fillStyle = '#ff9a2e'
        c.fill()
        c.beginPath()
        c.ellipse(x, base - h - r * 0.07, r * 0.03, r * 0.055, 0, 0, TAU)
        c.fillStyle = '#fff2a0'
        c.fill()
      }
      shine(c, r, 0.35)
    },
  },
  {
    name: 'WATERMELON',
    r: 118,
    color: '#5ed36a',
    burst: ['#5ed36a', '#1f7a34', '#ff5d6c', '#ffffff'],
    faceY: 0.1,
    eye: 0.1,
    paint(c, r) {
      c.strokeStyle = '#7a5a2a'
      c.lineCap = 'round'
      c.lineWidth = r * 0.07
      c.beginPath()
      c.moveTo(0, -r * 0.92)
      c.quadraticCurveTo(r * 0.02, -r * 1.12, r * 0.18, -r * 1.12)
      c.stroke()
      ball(c, r, '#a4ea8c', '#43b04e', '#1f7a34', '#14602a')
      c.save()
      c.beginPath()
      c.arc(0, 0, r * 0.95, 0, TAU)
      c.clip()
      c.fillStyle = 'rgba(20,96,42,0.75)'
      for (const k of [-2, -1, 1, 2]) {
        const x = k * r * 0.38
        const w = r * 0.085
        c.beginPath()
        c.moveTo(0, -r)
        c.quadraticCurveTo((x - w) * 2, 0, 0, r)
        c.quadraticCurveTo((x + w) * 2, 0, 0, -r)
        c.fill()
      }
      c.restore()
      shine(c, r, 0.4)
    },
  },
  {
    name: 'KING DONUT',
    r: 136,
    color: '#ffd21f',
    burst: ['#ffd21f', '#a557ff', '#ffffff', '#ff5d5d', '#4db8ff'],
    faceY: 0.42,
    eye: 0.095,
    paint(c, r) {
      ball(c, r, '#fff3b0', '#ffc83a', '#e08e12', '#a86500')
      wobbly(c, r * 0.8, 0.06, 8, 2, '#a557ff')
      c.beginPath()
      c.ellipse(-r * 0.36, -r * 0.5, r * 0.22, r * 0.08, -0.7, 0, TAU)
      c.fillStyle = 'rgba(255,255,255,0.45)'
      c.fill()
      sprinkles(c, r, 22, 0.9)
      punchHole(c, 0, -r * 0.1, r * 0.16, '#a86500', '#ffc83a')
      // The crown sits on top and pokes out of the circle.
      c.beginPath()
      c.moveTo(-r * 0.42, -r * 0.82)
      c.lineTo(-r * 0.5, -r * 1.32)
      c.lineTo(-r * 0.22, -r * 1.08)
      c.lineTo(0, -r * 1.45)
      c.lineTo(r * 0.22, -r * 1.08)
      c.lineTo(r * 0.5, -r * 1.32)
      c.lineTo(r * 0.42, -r * 0.82)
      c.quadraticCurveTo(0, -r * 0.98, -r * 0.42, -r * 0.82)
      c.closePath()
      c.fillStyle = '#ffd21f'
      c.fill()
      c.lineJoin = 'round'
      c.lineWidth = r * 0.04
      c.strokeStyle = '#a86500'
      c.stroke()
      dot(c, 0, -r * 1.06, r * 0.07, '#ff4d6d')
      dot(c, -r * 0.27, -r * 0.98, r * 0.05, '#4db8ff')
      dot(c, r * 0.27, -r * 0.98, r * 0.05, '#5ed36a')
    },
  },
]

// The wildcard: a rainbow gumball that upgrades whatever it touches first.
export const STAR_KIND: Kind = {
  name: 'RAINBOW',
  r: 34,
  color: '#ffffff',
  burst: ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff'],
  faceY: 0.2,
  eye: 0.16,
  paint(c, r) {
    const lw = Math.max(3, r * 0.1)
    const grad = c.createConicGradient(0, 0, 0)
    const stops = ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff', '#ff5d5d']
    stops.forEach((s, i) => grad.addColorStop(i / (stops.length - 1), s))
    c.beginPath()
    c.arc(0, 0, r - lw / 2, 0, TAU)
    c.fillStyle = grad
    c.fill()
    c.lineWidth = lw
    c.strokeStyle = '#ffffff'
    c.stroke()
    starShape(c, 0, -r * 0.5, r * 0.3, '#ffffff')
    shine(c, r, 0.5)
  },
}

export interface Art {
  // The painted canvas for a tier (-1 is the wildcard).
  canvas(tier: number): HTMLCanvasElement
}

export function kindOf(tier: number): Kind {
  return tier < 0 ? STAR_KIND : KINDS[Math.min(tier, KINDS.length - 1)]!
}

export function makeArt(): Art {
  const make = (kind: Kind): HTMLCanvasElement => {
    const canvas = document.createElement('canvas')
    const size = Math.ceil(kind.r * ART_REACH * 2 * ART_SCALE)
    canvas.width = size
    canvas.height = size
    const c = canvas.getContext('2d')
    if (c) {
      c.translate(size / 2, size / 2)
      c.scale(ART_SCALE, ART_SCALE)
      kind.paint(c, kind.r)
    }
    return canvas
  }
  const canvases = KINDS.map(make)
  const starCanvas = make(STAR_KIND)
  return {
    canvas: (tier) => (tier < 0 ? starCanvas : canvases[Math.min(tier, canvases.length - 1)]!),
  }
}
