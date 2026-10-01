// The four places the track runs through: palettes, roadside props, a painted
// backdrop each (cached to a canvas made inside `create`), and the striped
// ground that sells the speed.

import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { HY, ZNEAR, FAR, scaleAt, sx, sy } from './cam.ts'
import type { Cam } from './cam.ts'

export interface PropLook {
  c: string
  size: number
  // Floats above the ground (space junk) instead of standing on it.
  float?: boolean
}

export interface Zone {
  name: string
  emoji: string
  ground: [string, string]
  road: [string, string]
  kerb: [string, string]
  dash: string
  haze: string
  props: PropLook[]
  critter: string
  // Obstacle colours.
  barrier: [string, string]
  beam: [string, string, string]
  // Cart: body, roof, side, the thing on top.
  cart: [string, string, string, string]
  // Train: body, roof, side, stripe.
  train: [string, string, string, string]
  rainbowRoad?: boolean
}

export const ZONES: Zone[] = [
  {
    name: 'CITY',
    emoji: '🏙️',
    ground: ['#c3ccd6', '#b6c0cb'],
    road: ['#5d6673', '#555e6b'],
    kerb: ['#f4f6f8', '#f2b632'],
    dash: '#f4f6f8',
    haze: '#d7f1ff',
    props: [
      { c: '🏢', size: 560 },
      { c: '🏬', size: 470 },
      { c: '🏨', size: 520 },
      { c: '🏦', size: 440 },
      { c: '🏪', size: 400 },
      { c: '🌳', size: 340 },
      { c: '🌳', size: 300 },
      { c: '🚦', size: 250 },
    ],
    critter: '🐦',
    barrier: ['#ef3e3e', '#ffffff'],
    beam: ['#ffc91f', '#2b2b33', '#c9960a'],
    cart: ['#ffc629', '#ffe07a', '#d99a0b', '🚕'],
    train: ['#2f80ed', '#7fb4ff', '#1f5fbf', '#ffd23f'],
  },
  {
    name: 'BEACH',
    emoji: '🏖️',
    ground: ['#f7e0a3', '#f1d68f'],
    road: ['#c99256', '#bd864a'],
    kerb: ['#ffffff', '#35b8f5'],
    dash: '#f9ebc8',
    haze: '#c9f4f2',
    props: [
      { c: '🌴', size: 540 },
      { c: '🌴', size: 460 },
      { c: '🌴', size: 600 },
      { c: '⛱️', size: 320 },
      { c: '🏄', size: 270 },
      { c: '🦩', size: 230 },
      { c: '🐚', size: 120 },
      { c: '🏰', size: 260 },
    ],
    critter: '🦀',
    barrier: ['#ff8a1f', '#ffffff'],
    beam: ['#e0b04a', '#6b4320', '#a87722'],
    cart: ['#ffffff', '#ffd1e6', '#d9dfe6', '🍦'],
    train: ['#ff5a5f', '#ff9a9d', '#c93a40', '#ffffff'],
  },
  {
    name: 'CANDY LAND',
    emoji: '🍭',
    ground: ['#ffc4e3', '#ffb4da'],
    road: ['#8a563a', '#7d4c32'],
    kerb: ['#ffffff', '#ff5fa2'],
    dash: '#ffe0ef',
    haze: '#ffe6f5',
    props: [
      { c: '🍭', size: 500 },
      { c: '🍭', size: 400 },
      { c: '🧁', size: 360 },
      { c: '🍩', size: 300 },
      { c: '🍦', size: 430 },
      { c: '🍬', size: 200 },
      { c: '🍰', size: 320 },
      { c: '🎂', size: 380 },
    ],
    critter: '🐥',
    barrier: ['#ff5fa2', '#ffffff'],
    beam: ['#5ee6c3', '#0f6b57', '#2fb896'],
    cart: ['#ff8fc7', '#fff2f8', '#e066a3', '🍒'],
    train: ['#b06a3b', '#ffffff', '#8a4f28', '#ff5fa2'],
  },
  {
    name: 'SPACE',
    emoji: '🚀',
    ground: ['#4a4f70', '#434866'],
    road: ['#2a2d52', '#252848'],
    kerb: ['#ffffff', '#22d3ee'],
    dash: '#ffffff',
    haze: '#5b3aa8',
    props: [
      { c: '🪐', size: 420, float: true },
      { c: '🛸', size: 300, float: true },
      { c: '🚀', size: 380 },
      { c: '👽', size: 190 },
      { c: '🌍', size: 360, float: true },
      { c: '🛰️', size: 280, float: true },
      { c: '🌙', size: 300, float: true },
      { c: '⭐', size: 160, float: true },
    ],
    critter: '👾',
    barrier: ['#a855f7', '#67e8f9'],
    beam: ['#22d3ee', '#0b1033', '#0e9ab0'],
    cart: ['#9aa5b8', '#d5dbe6', '#6d7789', '📡'],
    train: ['#7c3aed', '#c4b5fd', '#4c1d95', '#67e8f9'],
    rainbowRoad: true,
  },
]

const RAINBOW = ['#ff5d6c', '#ff9f43', '#ffd93d', '#4cd97b', '#38bdf8', '#8b7bff', '#f472d0']
// The road in space: the same rainbow with the yellows taken out and the rest
// deepened, so gold coins still stand off it.
const ROAD_GLOW = ['#e0405a', '#d9582b', '#1faa6b', '#1498c8', '#3f6fe8', '#7a55e0', '#d044a8']
const ROAD_GLOW_DIM = ['#c53650', '#c04c24', '#1a965e', '#1187b2', '#3661d0', '#6b49c9', '#b93a95']

// A tiny repeatable generator, so the skyline is the same skyline every time.
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const BACK_W = W + 260
const BACK_H = HY + 4

function cloud(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  c.fillStyle = color
  c.beginPath()
  c.arc(x, y, r, 0, TAU)
  c.arc(x + r * 1.1, y + r * 0.15, r * 0.8, 0, TAU)
  c.arc(x - r * 1.1, y + r * 0.2, r * 0.7, 0, TAU)
  c.arc(x + r * 0.3, y - r * 0.55, r * 0.75, 0, TAU)
  c.fill()
}

function gradient(c: CanvasRenderingContext2D, top: string, bottom: string): void {
  const grad = c.createLinearGradient(0, 0, 0, BACK_H)
  grad.addColorStop(0, top)
  grad.addColorStop(1, bottom)
  c.fillStyle = grad
  c.fillRect(0, 0, BACK_W, BACK_H)
}

function emoji(c: CanvasRenderingContext2D, char: string, x: number, y: number, size: number): void {
  c.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(char, x, y)
}

function paintCity(c: CanvasRenderingContext2D): void {
  const r = lcg(7)
  gradient(c, '#3fb4ff', '#d3f1ff')
  // Sun with a soft halo.
  c.fillStyle = 'rgba(255,245,190,0.35)'
  c.beginPath()
  c.arc(BACK_W - 250, 80, 78, 0, TAU)
  c.fill()
  c.fillStyle = '#fff3a6'
  c.beginPath()
  c.arc(BACK_W - 250, 80, 46, 0, TAU)
  c.fill()
  cloud(c, 210, 70, 34, '#ffffff')
  cloud(c, 640, 46, 26, '#ffffff')
  cloud(c, 1010, 120, 30, 'rgba(255,255,255,0.9)')
  // Far skyline, pale.
  for (let x = -20; x < BACK_W; ) {
    const w = 46 + r() * 60
    const h = 60 + r() * 120
    c.fillStyle = '#a9d0f0'
    c.fillRect(x, BACK_H - h, w, h)
    if (r() < 0.3) c.fillRect(x + w * 0.4, BACK_H - h - 22, 6, 22)
    x += w + 2 + r() * 10
  }
  // Near skyline with lit windows.
  for (let x = -30; x < BACK_W; ) {
    const w = 60 + r() * 70
    const h = 40 + r() * 105
    c.fillStyle = r() < 0.5 ? '#6f9fd6' : '#7aa9dd'
    c.fillRect(x, BACK_H - h, w, h)
    c.fillStyle = '#ffeaa0'
    for (let wy = BACK_H - h + 10; wy < BACK_H - 10; wy += 16) {
      for (let wx = x + 9; wx < x + w - 12; wx += 15) {
        if (r() < 0.62) c.fillRect(wx, wy, 8, 9)
      }
    }
    x += w + 4 + r() * 22
  }
}

function paintBeach(c: CanvasRenderingContext2D): void {
  const r = lcg(21)
  gradient(c, '#22b8ff', '#ffe9b8')
  c.fillStyle = 'rgba(255,240,170,0.4)'
  c.beginPath()
  c.arc(BACK_W / 2 + 190, 120, 110, 0, TAU)
  c.fill()
  c.fillStyle = '#fff6b8'
  c.beginPath()
  c.arc(BACK_W / 2 + 190, 120, 62, 0, TAU)
  c.fill()
  cloud(c, 260, 78, 30, '#ffffff')
  cloud(c, 1120, 60, 36, '#ffffff')
  // The sea.
  const sea = c.createLinearGradient(0, BACK_H - 74, 0, BACK_H)
  sea.addColorStop(0, '#0e9fd0')
  sea.addColorStop(1, '#79e6e8')
  c.fillStyle = sea
  c.fillRect(0, BACK_H - 74, BACK_W, 74)
  c.fillStyle = 'rgba(255,255,255,0.75)'
  for (let i = 0; i < 46; i++) {
    const y = BACK_H - 68 + r() * 62
    c.fillRect(r() * BACK_W, y, 14 + r() * 40, 3)
  }
  // Islands.
  for (const [ix, iw, ih] of [
    [250, 150, 46],
    [1180, 210, 60],
  ] as const) {
    c.fillStyle = '#3fbf6f'
    c.beginPath()
    c.ellipse(ix, BACK_H - 70, iw / 2, ih, 0, Math.PI, TAU)
    c.fill()
    emoji(c, '🌴', ix - 10, BACK_H - 70 - ih - 12, 56)
  }
  emoji(c, '⛵', 760, BACK_H - 66, 50)
  emoji(c, '⛵', 500, BACK_H - 74, 28)
}

function paintCandy(c: CanvasRenderingContext2D): void {
  const r = lcg(99)
  gradient(c, '#ff8fd0', '#fff0fa')
  // A rainbow behind everything.
  RAINBOW.forEach((color, i) => {
    c.strokeStyle = color
    c.lineWidth = 13
    c.beginPath()
    c.arc(BACK_W / 2 + 60, BACK_H + 60, 330 - i * 13, Math.PI, TAU)
    c.stroke()
  })
  cloud(c, 190, 76, 38, '#ffffff')
  cloud(c, 1090, 60, 44, '#ffe0f3')
  cloud(c, 640, 40, 26, '#ffffff')
  // Ice-cream hills with drips of icing.
  const scoops = ['#a8f0d8', '#ff9fcc', '#fff1c4', '#c9b6ff', '#ffc09f']
  for (let x = -40; x < BACK_W + 80; x += 120 + r() * 60) {
    const rad = 80 + r() * 70
    c.fillStyle = scoops[Math.floor(r() * scoops.length)]
    c.beginPath()
    c.arc(x, BACK_H + rad * 0.35, rad, 0, TAU)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,0.85)'
    c.beginPath()
    c.ellipse(x, BACK_H + rad * 0.35 - rad * 0.86, rad * 0.5, rad * 0.16, 0, 0, TAU)
    c.fill()
  }
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 210 + r() * 60
    emoji(c, i % 2 === 0 ? '🍭' : '🍬', x, BACK_H - 40 - r() * 30, 40 + r() * 26)
  }
}

function paintSpace(c: CanvasRenderingContext2D): void {
  const r = lcg(5)
  gradient(c, '#070a26', '#4a2a8f')
  for (const [nx, ny, nr, color] of [
    [300, 110, 210, 'rgba(236,72,153,0.28)'],
    [1000, 150, 250, 'rgba(34,211,238,0.22)'],
  ] as const) {
    const neb = c.createRadialGradient(nx, ny, 0, nx, ny, nr)
    neb.addColorStop(0, color)
    neb.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = neb
    c.fillRect(0, 0, BACK_W, BACK_H)
  }
  for (let i = 0; i < 170; i++) {
    const s = r() < 0.12 ? 3.2 : 1.6
    c.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.5})`
    c.beginPath()
    c.arc(r() * BACK_W, r() * (BACK_H - 20), s, 0, TAU)
    c.fill()
  }
  emoji(c, '🪐', 1090, 92, 110)
  emoji(c, '🌍', 300, 96, 74)
  emoji(c, '☄️', 700, 60, 50)
  // Moon hills on the horizon.
  for (let x = -60; x < BACK_W + 80; x += 150 + r() * 90) {
    const rad = 90 + r() * 80
    c.fillStyle = '#5b6088'
    c.beginPath()
    c.ellipse(x, BACK_H + rad * 0.55, rad * 1.3, rad, 0, 0, TAU)
    c.fill()
    c.fillStyle = '#4c5079'
    c.beginPath()
    c.ellipse(x + rad * 0.2, BACK_H - rad * 0.22, rad * 0.22, rad * 0.07, 0, 0, TAU)
    c.fill()
  }
}

export interface Backdrops {
  draw(g: CanvasRenderingContext2D, zone: number, cam: Cam, time: number): void
}

export function createBackdrops(): Backdrops {
  const painters = [paintCity, paintBeach, paintCandy, paintSpace]
  const canvases = painters.map((paint) => {
    const canvas = document.createElement('canvas')
    canvas.width = BACK_W
    canvas.height = BACK_H
    const c = canvas.getContext('2d')
    if (c) paint(c)
    return canvas
  })
  return {
    draw(g, zone, cam, time) {
      // A slow drift so the sky is never a still photo, and a small slide
      // against the fox's lane.
      const drift = Math.sin(time * 0.05) * 30
      g.drawImage(canvases[zone % canvases.length], -130 - cam.x * 34 + drift, 0)
    },
  }
}

function quad(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.lineTo(x3, y3)
  g.lineTo(x4, y4)
  g.closePath()
  g.fill()
}

const BAND = 380
// One haze gradient per zone per canvas, made on first use.
const hazeCache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasGradient>>()
const ROAD_HALF = 1.5
const KERB = 0.14

// The ground from the horizon to the bottom edge, in alternating bands that
// slide toward the camera. `splitZ` is where the next zone begins (beyond the
// rainbow arch), or Infinity.
export function drawGround(g: CanvasRenderingContext2D, cam: Cam, dist: number, near: Zone, far: Zone, splitZ: number): void {
  const first = Math.floor((dist + ZNEAR) / BAND)
  const last = Math.floor((dist + FAR + 1600) / BAND)
  // Whatever is beyond the last band.
  const farthest = last * BAND - dist >= splitZ ? far : near
  g.fillStyle = farthest.ground[0]
  g.fillRect(0, HY, W, H - HY)
  for (let i = last; i >= first; i--) {
    const zA = Math.max(i * BAND - dist, ZNEAR)
    const zB = (i + 1) * BAND - dist
    if (zB <= ZNEAR) continue
    const sA = scaleAt(zA)
    const sB = scaleAt(zB)
    const yA = sy(0, sA)
    const yB = sy(0, sB)
    const zone = zA >= splitZ ? far : near
    const odd = ((i % 2) + 2) % 2
    g.fillStyle = zone.ground[odd]
    g.fillRect(0, yB, W, yA - yB + 1)

    const lA = sx(cam, -ROAD_HALF, sA)
    const rA = sx(cam, ROAD_HALF, sA)
    const lB = sx(cam, -ROAD_HALF, sB)
    const rB = sx(cam, ROAD_HALF, sB)
    if (zone.rainbowRoad) {
      const k = ((i % ROAD_GLOW.length) + ROAD_GLOW.length) % ROAD_GLOW.length
      g.fillStyle = odd ? ROAD_GLOW[k] : ROAD_GLOW_DIM[k]
    } else {
      g.fillStyle = zone.road[odd]
    }
    quad(g, lA, yA + 0.5, rA, yA + 0.5, rB, yB, lB, yB)

    g.fillStyle = zone.kerb[odd]
    const kA = KERB * (rA - lA) / (ROAD_HALF * 2)
    const kB = KERB * (rB - lB) / (ROAD_HALF * 2)
    quad(g, lA - kA, yA + 0.5, lA, yA + 0.5, lB, yB, lB - kB, yB)
    quad(g, rA, yA + 0.5, rA + kA, yA + 0.5, rB + kB, yB, rB, yB)

    if (odd) {
      // Lane dashes: one per odd band on each inner lane line.
      g.fillStyle = zone.rainbowRoad ? 'rgba(255,255,255,0.85)' : zone.dash
      for (const lx of [-0.5, 0.5]) {
        const cA = sx(cam, lx, sA)
        const cB = sx(cam, lx, sB)
        const wA = 7 * sA
        const wB = 7 * sB
        quad(g, cA - wA, yA, cA + wA, yA, cB + wB, yB, cB - wB, yB)
      }
    }
  }
  // Haze on the horizon hides things popping in.
  const zone = splitZ < FAR ? far : near
  let hazes = hazeCache.get(g)
  if (!hazes) hazeCache.set(g, (hazes = new Map()))
  let haze = hazes.get(zone.haze)
  if (!haze) {
    haze = g.createLinearGradient(0, HY, 0, HY + 54)
    haze.addColorStop(0, zone.haze)
    haze.addColorStop(1, zone.haze + '00')
    hazes.set(zone.haze, haze)
  }
  g.fillStyle = haze
  g.fillRect(0, HY - 1, W, 56)
}
