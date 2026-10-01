// Wash Day's painted things. Everything here is drawn once into an offscreen
// layer inside `create` and blitted afterwards: the garden, the tub, the
// washboard, the basket, the garments and their mud. Nothing runs at import.

import { TAU, clamp, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

export type Rand = () => number

// Where things stand in the garden. Shared with the game so paint and play agree.
export const LINE_X0 = 120
export const LINE_X1 = 955
export const LINE_Y = 150
export const TX = 470
export const RIM_Y = 612
export const RIM_RX = 212
export const RIM_RY = 60
export const WATER_Y = 628
export const WATER_RX = 192
export const WATER_RY = 47
export const BOARD_TOP = 412
export const DOOR = { x: 1052, y: 338, w: 110, h: 290 }
export const SOAP_HOME = { x: 190, y: 700 }
export const BLANKET = { x: 778, y: 712 }
// Padding around a garment inside its own layer.
export const PAD = 12

export interface Layer {
  c: HTMLCanvasElement
  g: CanvasRenderingContext2D
  w: number
  h: number
  s: number
}

export function layer(w: number, h: number, s: number): Layer {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * s)
  c.height = Math.ceil(h * s)
  const g = c.getContext('2d')!
  g.scale(s, s)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  return { c, g, w, h, s }
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: string, b: string, t: number): string {
  const p = rgb(a)
  const q = rgb(b)
  const k = clamp(t, 0, 1)
  return `rgb(${Math.round(lerp(p[0], q[0], k))},${Math.round(lerp(p[1], q[1], k))},${Math.round(lerp(p[2], q[2], k))})`
}

// Negative darkens toward a warm brown, positive lightens toward cream.
export function shade(hex: string, amt: number): string {
  return amt < 0 ? mix(hex, '#3a2a20', -amt) : mix(hex, '#fff6e2', amt)
}

export function rgba(hex: string, a: number): string {
  const p = rgb(hex)
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`
}

// A soft curve through points: hand-drawn rather than ruled.
export function smooth(g: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[], closed = true): void {
  const n = pts.length
  if (closed) {
    g.moveTo((pts[n - 1]![0] + pts[0]![0]) / 2, (pts[n - 1]![1] + pts[0]![1]) / 2)
    for (let i = 0; i < n; i++) {
      const a = pts[i]!
      const b = pts[(i + 1) % n]!
      g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    }
    g.closePath()
  } else {
    g.moveTo(pts[0]![0], pts[0]![1])
    for (let i = 1; i < n - 1; i++) {
      const a = pts[i]!
      const b = pts[i + 1]!
      g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    }
    g.lineTo(pts[n - 1]![0], pts[n - 1]![1])
  }
}

export function blobPath(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rand: Rand, wobble = 0.1, n = 9): void {
  const pts: [number, number][] = []
  const turn = rand() * TAU
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * TAU
    const k = 1 + (rand() - 0.5) * 2 * wobble
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  smooth(g, pts)
}

function blob(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, fill: string, rand: Rand, wobble = 0.1): void {
  g.beginPath()
  blobPath(g, cx, cy, rx, ry, rand, wobble)
  g.fillStyle = fill
  g.fill()
}

// Paper tooth: tiny dark and light flecks.
function speckle(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, n: number, rand: Rand, alpha = 0.05): void {
  for (let pass = 0; pass < 2; pass++) {
    g.fillStyle = pass === 0 ? `rgba(70,50,30,${alpha})` : `rgba(255,250,235,${alpha * 1.3})`
    for (let i = 0; i < n / 2; i++) {
      const r = 0.6 + rand() * 1.5
      g.fillRect(x + rand() * w, y + rand() * h, r, r)
    }
  }
}

export interface Season {
  skyTop: string
  skyLow: string
  hillFar: string
  hillNear: string
  hedge: string
  grassTop: string
  grassLow: string
  grassDark: string
  grassLight: string
  crown: [string, string, string, string]
  dab: string
  flowers: string[]
}

export const SEASONS: Season[] = [
  {
    // Early summer.
    skyTop: '#bfdde6',
    skyLow: '#f8efd8',
    hillFar: '#c6d9b8',
    hillNear: '#b2cd9a',
    hedge: '#86a875',
    grassTop: '#b9d48c',
    grassLow: '#93bb6d',
    grassDark: '#74a055',
    grassLight: '#d6e8a6',
    crown: ['#5c8a52', '#70a05c', '#8ab56b', '#aacd80'],
    dab: '#c4dd92',
    flowers: ['#ffffff', '#f6d55c', '#f2a7b5', '#ffffff'],
  },
  {
    // Autumn.
    skyTop: '#cbdde0',
    skyLow: '#fbe8c9',
    hillFar: '#d6cfa6',
    hillNear: '#c7c08a',
    hedge: '#a59a62',
    grassTop: '#c6ca86',
    grassLow: '#a7b06a',
    grassDark: '#87944f',
    grassLight: '#e0dd9d',
    crown: ['#a85c36', '#c57c3c', '#dba04a', '#edc569'],
    dab: '#f1d27c',
    flowers: ['#f6d55c', '#e9a35a', '#ffffff'],
  },
  {
    // Spring.
    skyTop: '#c4e2ec',
    skyLow: '#fcf2e2',
    hillFar: '#cfe2c0',
    hillNear: '#bbd8a3',
    hedge: '#93b780',
    grassTop: '#c2de95',
    grassLow: '#9fc878',
    grassDark: '#80ae5d',
    grassLight: '#dcefb0',
    crown: ['#6f9f60', '#86b572', '#a5cc88', '#f6cdd6'],
    dab: '#fde6ea',
    flowers: ['#ffffff', '#f6d55c', '#c9a7e0', '#f2a7b5'],
  },
]

function hill(g: CanvasRenderingContext2D, pts: [number, number][], color: string): void {
  g.beginPath()
  smooth(g, [[-40, pts[0]![1]], ...pts, [W + 40, pts[pts.length - 1]![1]]], false)
  g.lineTo(W + 40, 460)
  g.lineTo(-40, 460)
  g.closePath()
  g.fillStyle = color
  g.fill()
}

function trunk(g: CanvasRenderingContext2D, cx: number, baseY: number, rand: Rand): void {
  const left: [number, number][] = []
  const right: [number, number][] = []
  for (let y = -20; y <= baseY - 40; y += 70) {
    const t = clamp(y / baseY, 0, 1)
    const half = 23 + t * t * 13 + (rand() - 0.5) * 4
    const mid = cx + Math.sin(y * 0.011 + cx) * 5
    left.push([mid - half, y])
    right.push([mid + half, y])
  }
  left.push([cx - 40, baseY - 16], [cx - 62, baseY + 6])
  right.push([cx + 42, baseY - 14], [cx + 66, baseY + 8])
  g.beginPath()
  smooth(g, [...left, [cx, baseY + 12], ...right.reverse()], false)
  g.closePath()
  const grad = g.createLinearGradient(cx - 40, 0, cx + 40, 0)
  grad.addColorStop(0, '#a98a68')
  grad.addColorStop(0.45, '#8f7052')
  grad.addColorStop(1, '#73563d')
  g.fillStyle = grad
  g.fill()
  g.save()
  g.clip()
  for (let i = 0; i < 26; i++) {
    const x = cx - 34 + rand() * 68
    const y0 = rand() * baseY
    g.beginPath()
    g.moveTo(x, y0)
    g.quadraticCurveTo(x + (rand() - 0.5) * 10, y0 + 30, x + (rand() - 0.5) * 8, y0 + 50 + rand() * 50)
    g.strokeStyle = rand() < 0.6 ? 'rgba(74,52,34,0.35)' : 'rgba(214,186,150,0.3)'
    g.lineWidth = 1.5 + rand() * 2
    g.stroke()
  }
  g.restore()
}

function daisy(g: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, rand: Rand): void {
  const turn = rand() * TAU
  g.fillStyle = petal
  for (let i = 0; i < 6; i++) {
    const a = turn + (i / 6) * TAU
    g.beginPath()
    g.ellipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.55, r * 0.55, r * 0.36, a, 0, TAU)
    g.fill()
  }
  g.fillStyle = '#eeb93c'
  g.beginPath()
  g.arc(x, y, r * 0.38, 0, TAU)
  g.fill()
}

// The still garden is painted in three sittings (sky and land, grass and
// flowers, then the cottage, cloth and trees), so a new day can be got ready a
// little at a time while the old one rests.
export function paintGardenLand(L: Layer, S: Season, rand: Rand): void {
  const g = L.g
  const sky = g.createLinearGradient(0, 0, 0, 440)
  sky.addColorStop(0, S.skyTop)
  sky.addColorStop(1, S.skyLow)
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  const sun = g.createRadialGradient(360, 40, 10, 360, 40, 520)
  sun.addColorStop(0, 'rgba(255,247,214,0.85)')
  sun.addColorStop(0.4, 'rgba(255,244,210,0.3)')
  sun.addColorStop(1, 'rgba(255,244,210,0)')
  g.fillStyle = sun
  g.fillRect(0, 0, W, 520)
  // Washes of thin cloud, as if brushed on.
  for (let i = 0; i < 7; i++) {
    g.fillStyle = 'rgba(255,255,255,0.13)'
    g.beginPath()
    g.ellipse(rand() * W, 40 + rand() * 230, 120 + rand() * 160, 10 + rand() * 16, 0, 0, TAU)
    g.fill()
  }

  hill(g, [[0, 322], [150, 296], [330, 312], [520, 284], [720, 304], [900, 288], [1180, 312]], S.hillFar)
  hill(g, [[0, 356], [200, 334], [420, 350], [640, 330], [860, 346], [1180, 330]], S.hillNear)
  // A far hedgerow with round little trees.
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 128 + rand() * 50
    const y = 338 + Math.sin(x * 0.01) * 8 + rand() * 6
    blob(g, x, y, 13 + rand() * 9, 12 + rand() * 7, shade(S.hedge, 0.12), rand, 0.12)
  }
  for (let x = -20; x < W + 40; x += 30 + rand() * 16) {
    const r = 26 + rand() * 20
    blob(g, x, 392 - rand() * 10, r * 1.15, r, rand() < 0.5 ? S.hedge : shade(S.hedge, -0.08), rand, 0.14)
  }
  for (let i = 0; i < 60; i++) blob(g, rand() * W, 366 + rand() * 26, 6 + rand() * 7, 4 + rand() * 4, shade(S.hedge, 0.2), rand, 0.2)

  // The meadow.
  const lawn = g.createLinearGradient(0, 392, 0, H)
  lawn.addColorStop(0, S.grassTop)
  lawn.addColorStop(1, S.grassLow)
  g.fillStyle = lawn
  g.beginPath()
  const edge: [number, number][] = []
  for (let x = -40; x <= W + 40; x += 80) edge.push([x, 398 + (rand() - 0.5) * 8])
  smooth(g, edge, false)
  g.lineTo(W + 40, H)
  g.lineTo(-40, H)
  g.closePath()
  g.fill()
  // Sun patches and the trees' shade.
  for (let i = 0; i < 9; i++) {
    g.fillStyle = rgba(S.grassLight, 0.22)
    g.beginPath()
    g.ellipse(rand() * W, 440 + rand() * 340, 120 + rand() * 150, 18 + rand() * 30, 0, 0, TAU)
    g.fill()
  }
  for (const [x, y, rx] of [[150, 600, 190], [1000, 596, 170]] as const) {
    g.fillStyle = rgba(S.grassDark, 0.3)
    g.beginPath()
    g.ellipse(x, y, rx, 34, 0, 0, TAU)
    g.fill()
  }
}

export function paintGardenGrass(L: Layer, S: Season, rand: Rand): void {
  const g = L.g
  // Grass, stroke by stroke, longer toward the front; four brushes.
  for (let brush = 0; brush < 4; brush++) {
    g.beginPath()
    for (let i = 0; i < 430; i++) {
      const d = (brush < 2 ? rand() * 0.5 : 0.5 + rand() * 0.5) ** 0.8
      const x = rand() * W
      const y = 404 + d * 420
      const len = 4 + d * 13
      g.moveTo(x, y)
      g.quadraticCurveTo(x + (rand() - 0.5) * 4, y - len * 0.6, x + (rand() - 0.3) * 7, y - len)
    }
    g.strokeStyle = brush % 2 === 0 ? rgba(S.grassDark, 0.5) : rgba(S.grassLight, 0.55)
    g.lineWidth = brush < 2 ? 1.5 : 2.3
    g.stroke()
  }
  // Damp earth where the tub stands.
  g.fillStyle = 'rgba(116,88,54,0.2)'
  g.beginPath()
  g.ellipse(TX + 14, 752, 250, 42, 0, 0, TAU)
  g.fill()
  // Flowers.
  for (let i = 0; i < 90; i++) {
    const d = rand()
    const x = rand() * 1030
    const y = 420 + d * 390
    if (((x - TX) / 270) ** 2 + ((y - 690) / 120) ** 2 < 1) continue
    if (x > 650 && x < 930 && y > 630) continue
    const kind = S.flowers[Math.floor(rand() * S.flowers.length)]!
    const r = 2.5 + d * 4.5
    if (kind === '#ffffff') daisy(g, x, y, r, '#fffdf4', rand)
    else {
      g.fillStyle = kind
      g.beginPath()
      g.arc(x, y, r * 0.6, 0, TAU)
      g.fill()
      g.fillStyle = 'rgba(160,110,40,0.5)'
      g.beginPath()
      g.arc(x, y, r * 0.2, 0, TAU)
      g.fill()
    }
  }

}

export function paintGardenThings(L: Layer, rand: Rand): void {
  const g = L.g
  // The cottage corner on the right, with the doorway the basket comes from.
  g.beginPath()
  g.moveTo(1022, 200)
  g.lineTo(1184, 130)
  g.lineTo(1184, 656)
  g.lineTo(1022, 636)
  g.closePath()
  const wall = g.createLinearGradient(1022, 0, 1180, 0)
  wall.addColorStop(0, '#f5ead2')
  wall.addColorStop(1, '#eadbbb')
  g.fillStyle = wall
  g.fill()
  for (let i = 0; i < 26; i++) blob(g, 1030 + rand() * 150, 190 + rand() * 440, 10 + rand() * 22, 6 + rand() * 12, rand() < 0.5 ? 'rgba(255,252,240,0.35)' : 'rgba(190,165,120,0.12)', rand, 0.2)
  // The eave's shadow, timbers, lintel and door posts.
  g.fillStyle = 'rgba(110,84,50,0.16)'
  g.beginPath()
  g.moveTo(1022, 224)
  g.lineTo(1180, 160)
  g.lineTo(1180, 196)
  g.lineTo(1022, 256)
  g.closePath()
  g.fill()
  // The thatch, with a thick combed eave.
  g.beginPath()
  g.moveTo(978, 238)
  g.lineTo(1184, 152)
  g.lineTo(1184, -10)
  g.lineTo(1030, -10)
  g.closePath()
  g.fillStyle = '#c9aa6c'
  g.fill()
  for (let i = 0; i < 90; i++) {
    const x = 990 + rand() * 190
    const y = rand() * 230
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x - 7 - rand() * 8, y + 16 + rand() * 16)
    g.strokeStyle = rand() < 0.5 ? 'rgba(140,108,60,0.35)' : 'rgba(240,220,168,0.5)'
    g.lineWidth = 2
    g.stroke()
  }
  g.beginPath()
  g.moveTo(978, 238)
  g.lineTo(1184, 152)
  g.strokeStyle = '#a98a52'
  g.lineWidth = 9
  g.stroke()
  g.strokeStyle = 'rgba(240,220,168,0.6)'
  g.lineWidth = 2
  g.stroke()
  const timber = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = '#8b6a4a'
    g.beginPath()
    g.roundRect(x, y, w, h, 3)
    g.fill()
    g.fillStyle = 'rgba(255,236,200,0.18)'
    g.fillRect(x + 2, y + 2, Math.max(1, w * 0.3), Math.max(1, h - 4))
  }
  timber(1020, 226, 16, 412)
  timber(DOOR.x - 14, DOOR.y - 20, DOOR.w + 28, 16)
  timber(DOOR.x - 12, DOOR.y - 6, 12, DOOR.h + 8)
  timber(DOOR.x + DOOR.w, DOOR.y - 6, 12, DOOR.h + 8)
  // The stone step.
  g.beginPath()
  smooth(g, [[1030, 630], [1100, 626], [1184, 628], [1186, 660], [1100, 662], [1024, 658]])
  g.fillStyle = '#cdc4b2'
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.3)'
  g.beginPath()
  g.ellipse(1105, 636, 66, 6, 0, 0, TAU)
  g.fill()
  // A climbing rose beside the door.
  g.beginPath()
  smooth(g, [[1034, 640], [1042, 560], [1030, 470], [1042, 390], [1036, 320], [1070, 300], [1120, 306]], false)
  g.strokeStyle = '#6f8f58'
  g.lineWidth = 3.5
  g.stroke()
  for (let i = 0; i < 34; i++) {
    const t = rand()
    const x = t < 0.75 ? 1036 + (rand() - 0.5) * 26 : 1040 + rand() * 90
    const y = t < 0.75 ? 300 + rand() * 330 : 302 + (rand() - 0.5) * 18
    g.fillStyle = rand() < 0.5 ? '#7c9f62' : '#93b575'
    g.beginPath()
    g.ellipse(x, y, 7, 4, rand() * TAU, 0, TAU)
    g.fill()
  }
  for (let i = 0; i < 9; i++) {
    const x = i < 6 ? 1036 + (rand() - 0.5) * 24 : 1050 + rand() * 76
    const y = i < 6 ? 320 + i * 52 + rand() * 14 : 300 + (rand() - 0.5) * 12
    blob(g, x, y, 7, 7, '#e9a0aa', rand, 0.15)
    blob(g, x + 1, y + 1, 3.4, 3.4, '#d97b8a', rand, 0.15)
  }

  // The folding cloth on the grass: unbleached linen with two woven stripes.
  g.fillStyle = 'rgba(60,70,30,0.16)'
  g.beginPath()
  g.ellipse(BLANKET.x + 10, BLANKET.y + 12, 138, 78, 0, 0, TAU)
  g.fill()
  const cloth: [number, number][] = [[676, 650], [770, 643], [880, 648], [898, 712], [900, 780], [780, 786], [662, 782], [668, 712]]
  g.beginPath()
  smooth(g, cloth)
  g.fillStyle = '#efe4c9'
  g.fill()
  g.save()
  g.clip()
  for (let y = 640; y < 800; y += 4) {
    g.fillStyle = 'rgba(150,125,85,0.07)'
    g.fillRect(650, y, 270, 1.4)
  }
  for (let x = 650; x < 920; x += 4) {
    g.fillStyle = 'rgba(255,255,255,0.1)'
    g.fillRect(x, 630, 1.2, 170)
  }
  for (const [x, c] of [[690, '#c9654a'], [698, '#6f93bd'], [872, '#6f93bd'], [880, '#c9654a']] as const) {
    g.fillStyle = rgba(c, 0.7)
    g.fillRect(x, 630, 4, 170)
  }
  g.restore()
  g.beginPath()
  smooth(g, cloth)
  g.strokeStyle = 'rgba(150,125,85,0.5)'
  g.lineWidth = 2
  g.stroke()

  // The soap's wooden dish.
  g.fillStyle = 'rgba(60,70,30,0.2)'
  g.beginPath()
  g.ellipse(SOAP_HOME.x + 6, SOAP_HOME.y + 24, 58, 13, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#a67c50'
  g.beginPath()
  g.ellipse(SOAP_HOME.x, SOAP_HOME.y + 16, 56, 16, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#c69b69'
  g.beginPath()
  g.ellipse(SOAP_HOME.x, SOAP_HOME.y + 12, 56, 15, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#b3875a'
  g.beginPath()
  g.ellipse(SOAP_HOME.x, SOAP_HOME.y + 14, 44, 10, 0, 0, TAU)
  g.fill()

  // The two trees the line is tied between.
  trunk(g, 96, 590, rand)
  trunk(g, 978, 586, rand)
  for (const x of [LINE_X0 - 24, LINE_X1 + 23]) {
    for (let i = 0; i < 3; i++) {
      g.beginPath()
      g.moveTo(x - 26, LINE_Y - 6 + i * 5)
      g.quadraticCurveTo(x, LINE_Y - 2 + i * 5, x + 26, LINE_Y - 6 + i * 5)
      g.strokeStyle = i === 1 ? '#e6d8b4' : '#cbb88c'
      g.lineWidth = 3.5
      g.stroke()
    }
  }
  speckle(g, 0, 0, W, H, 9000, rand, 0.045)
}

export function paintCrown(L: Layer, S: Season, rand: Rand): void {
  const g = L.g
  const cx = L.w / 2
  const cy = L.h / 2 - 10
  const counts = [18, 18, 15, 12]
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < counts[pass]!; i++) {
      const a = rand() * TAU
      const rr = Math.sqrt(rand())
      const x = cx + Math.cos(a) * rr * (L.w * 0.38) - pass * 9
      const y = cy + Math.sin(a) * rr * (L.h * 0.33) - pass * 11
      const r = 48 - pass * 7 + rand() * 18
      g.globalAlpha = pass === 0 ? 1 : 0.92
      blob(g, x, y, r * 1.2, r, S.crown[pass]!, rand, 0.16)
    }
  }
  g.globalAlpha = 1
  for (let i = 0; i < 220; i++) {
    const a = rand() * TAU
    const rr = Math.sqrt(rand())
    const x = cx + Math.cos(a) * rr * (L.w * 0.44)
    const y = cy + Math.sin(a) * rr * (L.h * 0.4)
    g.fillStyle = rand() < 0.4 ? rgba(S.dab, 0.75) : rand() < 0.5 ? rgba(S.crown[0], 0.5) : rgba(S.crown[2], 0.6)
    g.beginPath()
    g.ellipse(x, y, 7 + rand() * 4, 3.5 + rand() * 2, rand() * TAU, 0, TAU)
    g.fill()
  }
}

export function paintCloud(L: Layer, rand: Rand): void {
  const g = L.g
  for (let i = 0; i < 9; i++) {
    const t = i / 8
    const x = 40 + t * (L.w - 80)
    const r = 11 + Math.sin(t * Math.PI) * 15 + rand() * 5
    blob(g, clamp(x, r * 1.6, L.w - r * 1.6), L.h * 0.64 - Math.sin(t * Math.PI) * 10, r * 1.5, r, 'rgba(255,255,255,0.5)', rand, 0.12)
  }
  g.fillStyle = 'rgba(255,255,255,0.5)'
  g.beginPath()
  g.ellipse(L.w / 2, L.h * 0.74, L.w * 0.4, L.h * 0.14, 0, 0, TAU)
  g.fill()
}

// The tub is painted in world coordinates shifted by (ox, oy).
function stavePoint(theta: number, f: number): [number, number] {
  const rx = lerp(RIM_RX, 184, f)
  const ry = lerp(RIM_RY, 50, f)
  return [TX + Math.cos(theta) * rx, lerp(RIM_Y, 742, f) + Math.sin(theta) * ry]
}

export function paintTubBack(L: Layer, ox: number, oy: number): void {
  const g = L.g
  g.translate(-ox, -oy)
  // The far half of the rim.
  g.fillStyle = '#c9a070'
  g.beginPath()
  g.ellipse(TX, RIM_Y, RIM_RX, RIM_RY, 0, 0, TAU)
  g.fill()
  // Inside: dark wet wood.
  const inner = g.createLinearGradient(0, RIM_Y - 52, 0, RIM_Y + 52)
  inner.addColorStop(0, '#6b4f36')
  inner.addColorStop(1, '#8c6a48')
  g.fillStyle = inner
  g.beginPath()
  g.ellipse(TX, RIM_Y, RIM_RX - 13, RIM_RY - 8, 0, 0, TAU)
  g.fill()
  for (let i = 1; i < 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI
    const x = TX + Math.cos(a) * (RIM_RX - 13)
    const y = RIM_Y + Math.sin(a) * (RIM_RY - 8)
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(TX + Math.cos(a) * (RIM_RX - 24), y + 30)
    g.strokeStyle = 'rgba(40,26,14,0.3)'
    g.lineWidth = 2
    g.stroke()
  }
}

export function paintTubFront(L: Layer, ox: number, oy: number, rand: Rand): void {
  const g = L.g
  g.translate(-ox, -oy)
  const wallPath = () => {
    g.beginPath()
    g.ellipse(TX, RIM_Y, RIM_RX, RIM_RY, 0, Math.PI, 0, true)
    g.lineTo(TX + 184, 742)
    g.ellipse(TX, 742, 184, 50, 0, 0, Math.PI)
    g.closePath()
  }
  wallPath()
  const wood = g.createLinearGradient(TX - RIM_RX, 0, TX + RIM_RX, 0)
  wood.addColorStop(0, '#b4875a')
  wood.addColorStop(0.3, '#d2a672')
  wood.addColorStop(0.75, '#b98a59')
  wood.addColorStop(1, '#94693f')
  g.fillStyle = wood
  g.fill()
  g.save()
  g.clip()
  const staves = 15
  for (let i = 0; i <= staves; i++) {
    const a0 = Math.PI - (i / staves) * Math.PI
    const a1 = Math.PI - ((i + 1) / staves) * Math.PI
    const [x0, y0] = stavePoint(a0, 0)
    const [x1, y1] = stavePoint(a0, 1)
    if (i < staves && i % 2 === 0) {
      const [x2, y2] = stavePoint(a1, 1)
      const [x3, y3] = stavePoint(a1, 0)
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x1, y1 + 20)
      g.lineTo(x2, y2 + 20)
      g.lineTo(x3, y3)
      g.closePath()
      g.fillStyle = 'rgba(255,240,205,0.12)'
      g.fill()
    }
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1 + 10)
    g.strokeStyle = 'rgba(92,62,34,0.45)'
    g.lineWidth = 2
    g.stroke()
  }
  for (let i = 0; i < 70; i++) {
    const x = TX - RIM_RX + rand() * RIM_RX * 2
    const y = RIM_Y + rand() * 190
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (rand() - 0.5) * 3, y + 14 + rand() * 30)
    g.strokeStyle = rand() < 0.5 ? 'rgba(92,62,34,0.16)' : 'rgba(255,240,205,0.16)'
    g.lineWidth = 1.5
    g.stroke()
  }
  // Two iron hoops.
  for (const f of [0.26, 0.8]) {
    const cy = lerp(RIM_Y, 742, f)
    const rx = lerp(RIM_RX, 184, f) + 1
    const ry = lerp(RIM_RY, 50, f)
    g.beginPath()
    g.ellipse(TX, cy, rx, ry, 0, 0, Math.PI)
    g.strokeStyle = '#6a5d53'
    g.lineWidth = 15
    g.stroke()
    g.beginPath()
    g.ellipse(TX, cy - 5, rx, ry, 0, 0.1, Math.PI - 0.1)
    g.strokeStyle = 'rgba(190,178,160,0.5)'
    g.lineWidth = 2
    g.stroke()
    for (const a of [0.9, 1.6, 2.3]) {
      g.fillStyle = '#4d433b'
      g.beginPath()
      g.arc(TX + Math.cos(a) * rx, cy + Math.sin(a) * ry, 2.6, 0, TAU)
      g.fill()
    }
  }
  g.restore()
  // The near half of the rim, seen from a little above.
  g.beginPath()
  g.ellipse(TX, RIM_Y, RIM_RX, RIM_RY, 0, 0, Math.PI)
  g.ellipse(TX, RIM_Y, RIM_RX - 13, RIM_RY - 8, 0, Math.PI, 0, true)
  g.closePath()
  g.fillStyle = '#dab582'
  g.fill()
  g.beginPath()
  g.ellipse(TX, RIM_Y, RIM_RX, RIM_RY, 0, 0.05, Math.PI - 0.05)
  g.strokeStyle = 'rgba(92,62,34,0.4)'
  g.lineWidth = 2
  g.stroke()
  // Two staves stand tall as handles.
  for (const side of [-1, 1]) {
    const x = TX + side * (RIM_RX - 9)
    g.fillStyle = side < 0 ? '#c79b68' : '#a87b4d'
    g.beginPath()
    g.roundRect(x - 15, RIM_Y - 52, 30, 66, 9)
    g.fill()
    g.strokeStyle = 'rgba(92,62,34,0.45)'
    g.lineWidth = 2
    g.stroke()
    g.fillStyle = 'rgba(60,40,24,0.55)'
    g.beginPath()
    g.ellipse(x, RIM_Y - 30, 7, 9, 0, 0, TAU)
    g.fill()
  }
}

export const BOARD_W = 244
export const BOARD_H = 300

// Local coordinates: x 0..244 with the middle at 122, y 0 is world 400.
export function paintBoard(L: Layer, rand: Rand): void {
  const g = L.g
  const cx = BOARD_W / 2
  // The zinc face.
  g.fillStyle = '#c5d1cf'
  g.beginPath()
  g.moveTo(cx - 88, 58)
  g.lineTo(cx + 88, 58)
  g.lineTo(cx + 94, BOARD_H)
  g.lineTo(cx - 94, BOARD_H)
  g.closePath()
  g.fill()
  for (let y = 70; y < BOARD_H; y += 11) {
    const wob = (rand() - 0.5) * 1.4
    g.beginPath()
    g.moveTo(cx - 90, y + wob)
    g.quadraticCurveTo(cx, y + 2.5 + wob, cx + 90, y + wob)
    g.strokeStyle = '#94a7a8'
    g.lineWidth = 2.6
    g.stroke()
    g.beginPath()
    g.moveTo(cx - 90, y + 4.5 + wob)
    g.quadraticCurveTo(cx, y + 7 + wob, cx + 90, y + 4.5 + wob)
    g.strokeStyle = 'rgba(240,247,246,0.85)'
    g.lineWidth = 2.2
    g.stroke()
  }
  // Rails.
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(cx + side * 86, 30)
    g.lineTo(cx + side * 104, 30)
    g.lineTo(cx + side * 110, BOARD_H)
    g.lineTo(cx + side * 92, BOARD_H)
    g.closePath()
    g.fillStyle = side < 0 ? '#cfa474' : '#b88c5c'
    g.fill()
    g.strokeStyle = 'rgba(92,62,34,0.4)'
    g.lineWidth = 2
    g.stroke()
  }
  // The arched head.
  g.beginPath()
  g.moveTo(cx - 104, 66)
  g.lineTo(cx - 104, 34)
  g.quadraticCurveTo(cx, -6, cx + 104, 34)
  g.lineTo(cx + 104, 66)
  g.closePath()
  const wood = g.createLinearGradient(0, 10, 0, 66)
  wood.addColorStop(0, '#d9b483')
  wood.addColorStop(1, '#c39a69')
  g.fillStyle = wood
  g.fill()
  g.strokeStyle = 'rgba(92,62,34,0.45)'
  g.lineWidth = 2
  g.stroke()
  for (let i = 0; i < 9; i++) {
    const y = 24 + i * 5
    g.beginPath()
    g.moveTo(cx - 92, y + 8)
    g.quadraticCurveTo(cx, y - 14 + i * 2.6, cx + 92, y + 8)
    g.strokeStyle = 'rgba(120,86,50,0.12)'
    g.lineWidth = 1.4
    g.stroke()
  }
}

export const BASKET_RX = 92
export const BASKET_RY = 22

// The basket's layers are painted around (ox, oy) = the middle of its rim.
export function paintBasketBack(L: Layer, ox: number, oy: number): void {
  const g = L.g
  g.translate(ox, oy)
  // Handles.
  for (const side of [-1, 1]) {
    g.beginPath()
    g.ellipse(side * (BASKET_RX - 4), -4, 13, 20, side * 0.3, 0, TAU)
    g.strokeStyle = '#b48446'
    g.lineWidth = 8
    g.stroke()
    g.strokeStyle = 'rgba(245,220,170,0.5)'
    g.lineWidth = 2
    g.stroke()
  }
  g.fillStyle = '#d2a665'
  g.beginPath()
  g.ellipse(0, 0, BASKET_RX, BASKET_RY, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#7d5a34'
  g.beginPath()
  g.ellipse(0, 1, BASKET_RX - 8, BASKET_RY - 5, 0, 0, TAU)
  g.fill()
}

export function paintBasketFront(L: Layer, ox: number, oy: number, rand: Rand): void {
  const g = L.g
  g.translate(ox, oy)
  const body = () => {
    g.beginPath()
    g.ellipse(0, 0, BASKET_RX, BASKET_RY, 0, Math.PI, 0, true)
    g.quadraticCurveTo(BASKET_RX - 2, 60, 70, 92)
    g.ellipse(0, 92, 70, 16, 0, 0, Math.PI)
    g.quadraticCurveTo(-BASKET_RX + 2, 60, -BASKET_RX, 0)
    g.closePath()
  }
  body()
  const wood = g.createLinearGradient(-BASKET_RX, 0, BASKET_RX, 0)
  wood.addColorStop(0, '#c4944f')
  wood.addColorStop(0.35, '#dfb573')
  wood.addColorStop(1, '#a97a3c')
  g.fillStyle = wood
  g.fill()
  g.save()
  g.clip()
  // Weave: short over-and-under strokes in rows.
  for (let row = 0; row < 8; row++) {
    const y = 24 + row * 12
    for (let col = -8; col <= 8; col++) {
      const x = col * 12 + (row % 2) * 6
      const bow = (1 - (x / BASKET_RX) ** 2) * 8
      g.beginPath()
      g.moveTo(x - 5, y + bow + (rand() - 0.5))
      g.quadraticCurveTo(x, y + bow - 3, x + 5, y + bow + (rand() - 0.5))
      g.strokeStyle = (col + row) % 2 === 0 ? 'rgba(248,226,176,0.75)' : 'rgba(132,92,44,0.6)'
      g.lineWidth = 5
      g.stroke()
    }
  }
  for (let x = -84; x <= 84; x += 24) {
    g.beginPath()
    g.moveTo(x, 10)
    g.lineTo(x * 0.8, 108)
    g.strokeStyle = 'rgba(120,82,40,0.22)'
    g.lineWidth = 3
    g.stroke()
  }
  g.restore()
  // The braided rim.
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI
    const x = Math.cos(a) * BASKET_RX
    const y = Math.sin(a) * BASKET_RY
    g.fillStyle = i % 2 === 0 ? '#e6bf80' : '#c3924e'
    g.beginPath()
    g.ellipse(x, y + 3, 9, 6, 0.5, 0, TAU)
    g.fill()
  }
  body()
  g.strokeStyle = 'rgba(110,74,34,0.4)'
  g.lineWidth = 2
  g.stroke()
}

export function paintBag(L: Layer): void {
  const g = L.g
  const cx = L.w / 2
  // The pouch, hung from a small wooden hanger.
  g.beginPath()
  smooth(g, [[cx - 40, 44], [cx, 54], [cx + 40, 44], [cx + 46, 100], [cx + 30, 126], [cx, 130], [cx - 30, 126], [cx - 46, 100]])
  g.fillStyle = '#e3d3ac'
  g.fill()
  g.save()
  g.clip()
  for (let y = 40; y < 134; y += 4) {
    g.fillStyle = 'rgba(150,125,85,0.09)'
    g.fillRect(0, y, L.w, 1.4)
  }
  g.fillStyle = 'rgba(120,96,60,0.12)'
  g.fillRect(cx + 16, 40, 40, 100)
  g.restore()
  g.beginPath()
  smooth(g, [[cx - 40, 44], [cx, 54], [cx + 40, 44], [cx + 46, 100], [cx + 30, 126], [cx, 130], [cx - 30, 126], [cx - 46, 100]])
  g.strokeStyle = 'rgba(140,112,70,0.6)'
  g.lineWidth = 2
  g.stroke()
  // A row of blue running stitch and a small stitched flower.
  g.setLineDash([7, 6])
  g.beginPath()
  g.moveTo(cx - 36, 62)
  g.quadraticCurveTo(cx, 71, cx + 36, 62)
  g.strokeStyle = '#6f93bd'
  g.lineWidth = 2.6
  g.stroke()
  g.setLineDash([])
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2
    g.fillStyle = '#c9654a'
    g.beginPath()
    g.ellipse(cx + Math.cos(a) * 8, 98 + Math.sin(a) * 8, 5.5, 3.6, a, 0, TAU)
    g.fill()
  }
  g.fillStyle = '#e3b04f'
  g.beginPath()
  g.arc(cx, 98, 4, 0, TAU)
  g.fill()
}

export function paintDoor(L: Layer, rand: Rand): void {
  const g = L.g
  const w = DOOR.w
  const h = DOOR.h
  g.fillStyle = '#8d6947'
  g.beginPath()
  g.roundRect(0, 0, w, h, 4)
  g.fill()
  for (let i = 0; i < 5; i++) {
    const x = (i / 5) * w
    g.fillStyle = i % 2 === 0 ? 'rgba(255,232,190,0.1)' : 'rgba(50,30,14,0.08)'
    g.fillRect(x, 0, w / 5, h)
    g.fillStyle = 'rgba(54,34,18,0.45)'
    g.fillRect(x - 1, 0, 2, h)
    for (let k = 0; k < 5; k++) {
      const gx = x + 4 + rand() * (w / 5 - 8)
      const gy = rand() * h
      g.beginPath()
      g.moveTo(gx, gy)
      g.lineTo(gx + (rand() - 0.5) * 3, gy + 20 + rand() * 40)
      g.strokeStyle = 'rgba(54,34,18,0.2)'
      g.lineWidth = 1.4
      g.stroke()
    }
  }
  for (const y of [46, h - 70]) {
    g.fillStyle = '#9b7550'
    g.beginPath()
    g.roundRect(3, y, w - 6, 24, 4)
    g.fill()
    g.strokeStyle = 'rgba(54,34,18,0.35)'
    g.lineWidth = 1.6
    g.stroke()
    g.fillStyle = '#4c4038'
    g.beginPath()
    g.roundRect(w - 46, y + 7, 46, 10, 4)
    g.fill()
  }
  // A small heart cut through the planks lets the lamplight out.
  g.fillStyle = '#f3cf86'
  g.beginPath()
  g.moveTo(w / 2, 122)
  g.bezierCurveTo(w / 2 - 22, 104, w / 2 - 12, 88, w / 2, 100)
  g.bezierCurveTo(w / 2 + 12, 88, w / 2 + 22, 104, w / 2, 122)
  g.fill()
  g.strokeStyle = 'rgba(54,34,18,0.5)'
  g.lineWidth = 2
  g.stroke()
  // The latch.
  g.fillStyle = '#4c4038'
  g.beginPath()
  g.roundRect(8, h / 2 + 6, 26, 7, 3)
  g.fill()
  g.fillStyle = '#d9b47f'
  g.beginPath()
  g.arc(20, h / 2 - 8, 8, 0, TAU)
  g.fill()
  g.strokeStyle = 'rgba(54,34,18,0.5)'
  g.lineWidth = 1.6
  g.stroke()
}

// A warm vignette and a last layer of paper tooth over everything.
export function paintVeil(L: Layer, rand: Rand): void {
  const g = L.g
  const v = g.createRadialGradient(W * 0.45, H * 0.42, 300, W * 0.5, H * 0.5, 820)
  v.addColorStop(0, 'rgba(120,84,40,0)')
  v.addColorStop(1, 'rgba(120,84,40,0.2)')
  g.fillStyle = v
  g.fillRect(0, 0, W, H)
  speckle(g, 0, 0, W, H, 7000, rand, 0.035)
}

// ---------------------------------------------------------------- garments

export type Kind = 'shirt' | 'trousers' | 'dress' | 'sock' | 'kerchief'

export interface Pattern {
  w: number
  h: number
  // Where pegs go, measured from the top middle.
  anchors: [number, number][]
}

export const PATTERNS: Record<Kind, Pattern> = {
  shirt: { w: 170, h: 156, anchors: [[-44, 6], [44, 6]] },
  trousers: { w: 126, h: 186, anchors: [[-40, 6], [40, 6]] },
  dress: { w: 164, h: 190, anchors: [[-29, 5], [29, 5]] },
  sock: { w: 96, h: 152, anchors: [[0, 6]] },
  kerchief: { w: 140, h: 138, anchors: [[-56, 6], [56, 6]] },
}

export function garmentPath(g: CanvasRenderingContext2D, kind: Kind): void {
  g.beginPath()
  if (kind === 'shirt') {
    g.moveTo(-22, 4)
    g.quadraticCurveTo(0, 24, 22, 4)
    g.lineTo(48, 8)
    g.lineTo(83, 42)
    g.lineTo(66, 72)
    g.lineTo(50, 58)
    g.quadraticCurveTo(54, 110, 62, 150)
    g.quadraticCurveTo(0, 160, -62, 150)
    g.quadraticCurveTo(-54, 110, -50, 58)
    g.lineTo(-66, 72)
    g.lineTo(-83, 42)
    g.lineTo(-48, 8)
  } else if (kind === 'trousers') {
    g.moveTo(-48, 2)
    g.lineTo(48, 2)
    g.quadraticCurveTo(58, 90, 61, 182)
    g.lineTo(13, 184)
    g.quadraticCurveTo(9, 112, 0, 76)
    g.quadraticCurveTo(-9, 112, -13, 184)
    g.lineTo(-61, 182)
    g.quadraticCurveTo(-58, 90, -48, 2)
  } else if (kind === 'dress') {
    g.moveTo(-38, 2)
    g.lineTo(-21, 2)
    g.lineTo(-19, 34)
    g.quadraticCurveTo(0, 46, 19, 34)
    g.lineTo(21, 2)
    g.lineTo(38, 2)
    g.lineTo(41, 68)
    g.quadraticCurveTo(68, 122, 80, 178)
    g.quadraticCurveTo(40, 192, 0, 185)
    g.quadraticCurveTo(-40, 192, -80, 178)
    g.quadraticCurveTo(-68, 122, -41, 68)
  } else if (kind === 'sock') {
    g.moveTo(-34, 2)
    g.lineTo(18, 2)
    g.lineTo(16, 92)
    g.quadraticCurveTo(18, 106, 30, 110)
    g.quadraticCurveTo(48, 116, 46, 132)
    g.quadraticCurveTo(42, 148, 18, 146)
    g.lineTo(-14, 144)
    g.quadraticCurveTo(-38, 142, -36, 116)
  } else {
    g.moveTo(-66, 3)
    g.quadraticCurveTo(0, 8, 66, 3)
    g.quadraticCurveTo(62, 70, 65, 132)
    g.quadraticCurveTo(0, 138, -65, 133)
    g.quadraticCurveTo(-62, 70, -66, 3)
  }
  g.closePath()
}

function stitch(g: CanvasRenderingContext2D, color: string, width = 1.8): void {
  g.setLineDash([5, 5])
  g.strokeStyle = color
  g.lineWidth = width
  g.stroke()
  g.setLineDash([])
}

function button(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = '#e2c595'
  g.beginPath()
  g.arc(x, y, 5.5, 0, TAU)
  g.fill()
  g.strokeStyle = 'rgba(100,70,40,0.6)'
  g.lineWidth = 1.2
  g.stroke()
  g.fillStyle = 'rgba(100,70,40,0.8)'
  g.fillRect(x - 2.4, y - 0.8, 1.6, 1.6)
  g.fillRect(x + 0.8, y - 0.8, 1.6, 1.6)
}

export function paintGarment(L: Layer, kind: Kind, color: string, trim: string, rand: Rand): void {
  const g = L.g
  const p = PATTERNS[kind]
  g.save()
  g.translate(L.w / 2, PAD)
  garmentPath(g, kind)
  g.fillStyle = color
  g.fill()
  g.save()
  g.clip()
  // Light from the left, and the weave of the cloth.
  const light = g.createLinearGradient(-p.w / 2, 0, p.w / 2, 0)
  light.addColorStop(0, 'rgba(255,248,225,0.2)')
  light.addColorStop(0.5, 'rgba(255,248,225,0)')
  light.addColorStop(1, 'rgba(60,36,20,0.14)')
  g.fillStyle = light
  g.fillRect(-p.w, -PAD, p.w * 2, p.h + PAD * 2)
  for (let y = 0; y < p.h + 6; y += 3.2) {
    g.fillStyle = 'rgba(60,36,20,0.055)'
    g.fillRect(-p.w, y + (rand() - 0.5) * 0.8, p.w * 2, 1.1)
  }
  for (let x = -p.w / 2; x < p.w / 2; x += 3.2) {
    g.fillStyle = 'rgba(255,248,225,0.07)'
    g.fillRect(x, -4, 1, p.h + 12)
  }
  const dark = shade(color, -0.22)
  if (kind === 'shirt') {
    g.beginPath()
    g.moveTo(-26, 2)
    g.quadraticCurveTo(0, 28, 26, 2)
    g.strokeStyle = trim
    g.lineWidth = 7
    g.stroke()
    g.beginPath()
    g.moveTo(0, 16)
    g.lineTo(0, 84)
    g.strokeStyle = dark
    g.lineWidth = 2
    g.stroke()
    button(g, 0, 36)
    button(g, 0, 62)
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * 78, 49)
      g.lineTo(side * 63, 76)
      g.strokeStyle = trim
      g.lineWidth = 7
      g.stroke()
      g.beginPath()
      g.moveTo(side * 49, 22)
      g.quadraticCurveTo(side * 46, 40, side * 50, 58)
      g.strokeStyle = dark
      g.lineWidth = 1.6
      g.stroke()
    }
    g.beginPath()
    g.moveTo(-62, 141)
    g.quadraticCurveTo(0, 151, 62, 141)
    stitch(g, trim)
  } else if (kind === 'trousers') {
    g.fillStyle = dark
    g.globalAlpha = 0.5
    g.fillRect(-60, 0, 120, 17)
    g.globalAlpha = 1
    g.beginPath()
    g.moveTo(-50, 21)
    g.lineTo(50, 21)
    stitch(g, trim)
    g.beginPath()
    g.moveTo(0, 18)
    g.lineTo(0, 78)
    g.strokeStyle = dark
    g.lineWidth = 2
    g.stroke()
    button(g, 0, 10)
    // A knee patch, stitched on by hand.
    g.fillStyle = '#e3b04f'
    g.beginPath()
    g.roundRect(22, 104, 28, 30, 5)
    g.fill()
    g.beginPath()
    g.roundRect(25, 107, 22, 24, 4)
    stitch(g, 'rgba(120,70,30,0.8)', 1.6)
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * 14, 172)
      g.lineTo(side * 60, 170)
      stitch(g, trim)
    }
  } else if (kind === 'dress') {
    for (let row = 0; row < 7; row++) {
      for (let col = -5; col <= 5; col++) {
        const x = col * 24 + (row % 2) * 12
        const y = 84 + row * 16
        g.fillStyle = trim
        g.beginPath()
        g.arc(x, y, 3.2, 0, TAU)
        g.fill()
      }
    }
    g.beginPath()
    g.moveTo(-42, 68)
    g.quadraticCurveTo(0, 76, 42, 68)
    g.strokeStyle = dark
    g.lineWidth = 2.4
    g.stroke()
    g.beginPath()
    g.moveTo(-78, 168)
    g.quadraticCurveTo(-40, 182, 0, 175)
    g.quadraticCurveTo(40, 182, 78, 168)
    stitch(g, trim)
    button(g, -29, 30)
    button(g, 29, 30)
  } else if (kind === 'sock') {
    g.fillStyle = trim
    for (const y of [38, 60, 82]) g.fillRect(-40, y, 70, 10)
    g.fillStyle = dark
    g.globalAlpha = 0.55
    g.beginPath()
    g.arc(-30, 128, 22, 0, TAU)
    g.fill()
    g.beginPath()
    g.arc(44, 134, 20, 0, TAU)
    g.fill()
    g.fillRect(-40, 0, 70, 24)
    g.globalAlpha = 1
    for (let x = -30; x < 20; x += 7) {
      g.fillStyle = 'rgba(255,248,225,0.3)'
      g.fillRect(x, 2, 2, 20)
    }
  } else {
    for (let i = -3; i <= 3; i++) {
      g.fillStyle = rgba('#6f93bd', 0.5)
      g.fillRect(i * 20 - 2.5, 0, 5, p.h + 4)
      g.fillRect(-p.w / 2, 68 + i * 20 - 2.5, p.w, 5)
    }
    g.beginPath()
    g.rect(-57, 12, 114, 112)
    stitch(g, '#c9654a', 2.2)
  }
  g.restore()
  garmentPath(g, kind)
  g.strokeStyle = rgba('#4a3222', 0.42)
  g.lineWidth = 2.2
  g.stroke()
  g.restore()
}

export interface MudGrid {
  cells: Float32Array
  cols: number
  rows: number
  cell: number
  total: number
}

// Mud splats, clipped to the cloth, and a coarse grid that knows where they are.
export function paintMud(L: Layer, kind: Kind, rand: Rand): MudGrid {
  const g = L.g
  const p = PATTERNS[kind]
  const blobs: { x: number; y: number; r: number }[] = []
  const n = kind === 'sock' ? 3 : 5
  for (let i = 0; i < n; i++) {
    blobs.push({
      x: (rand() - 0.5) * (p.w - 56),
      y: 30 + ((i + rand()) / n) * (p.h - 56),
      r: (kind === 'sock' ? 15 : 19) + rand() * 12,
    })
  }
  g.save()
  g.translate(L.w / 2, PAD)
  garmentPath(g, kind)
  g.clip()
  for (const b of blobs) {
    blob(g, b.x, b.y, b.r * 1.08, b.r, '#8a6645', rand, 0.22)
    for (let k = 0; k < 7; k++) {
      const a = rand() * TAU
      const d = b.r * (0.9 + rand() * 0.7)
      blob(g, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 2.5 + rand() * 4, 2.5 + rand() * 3, '#8a6645', rand, 0.2)
    }
  }
  for (const b of blobs) {
    blob(g, b.x + 2, b.y + 3, b.r * 0.62, b.r * 0.52, 'rgba(98,68,42,0.55)', rand, 0.25)
    blob(g, b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, b.r * 0.16, 'rgba(170,134,96,0.55)', rand, 0.2)
  }
  g.restore()

  const cell = 12
  const cols = Math.ceil(L.w / cell)
  const rows = Math.ceil(L.h / cell)
  const cells = new Float32Array(cols * rows)
  let total = 0
  g.save()
  g.translate(L.w / 2, PAD)
  garmentPath(g, kind)
  g.restore()
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const lx = (i + 0.5) * cell - L.w / 2
      const ly = (j + 0.5) * cell - PAD
      let muddy = false
      for (const b of blobs) if ((lx - b.x) ** 2 + (ly - b.y) ** 2 < (b.r * 0.95) ** 2) muddy = true
      if (!muddy) continue
      if (!g.isPointInPath((lx + L.w / 2) * L.s, (ly + PAD) * L.s)) continue
      cells[j * cols + i] = 1
      total++
    }
  }
  return { cells, cols, rows, cell, total: Math.max(1, total) }
}

// An old one-piece dolly peg, about 12 by 40, standing on (x, y) at its middle.
export function drawPeg(g: CanvasRenderingContext2D, x: number, y: number, rot = 0, scale = 1): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(scale, scale)
  g.fillStyle = '#e6c692'
  g.strokeStyle = 'rgba(120,84,44,0.75)'
  g.lineWidth = 1.6
  g.beginPath()
  g.roundRect(-6.5, -12, 13, 34, 4)
  g.fill()
  g.stroke()
  g.beginPath()
  g.arc(0, -17, 8, 0, TAU)
  g.fill()
  g.stroke()
  g.beginPath()
  g.moveTo(0, 2)
  g.lineTo(0, 21)
  g.strokeStyle = 'rgba(90,60,30,0.8)'
  g.lineWidth = 2
  g.stroke()
  g.fillStyle = 'rgba(255,250,235,0.5)'
  g.beginPath()
  g.arc(-2.5, -19.5, 2.6, 0, TAU)
  g.fill()
  g.restore()
}

export function drawBird(g: CanvasRenderingContext2D, x: number, y: number, face: number, flap: number, bob: number, look: number): void {
  g.save()
  g.translate(x, y + bob)
  g.scale(face, 1)
  // Tail, body, breast, head.
  g.fillStyle = '#7a5d44'
  g.beginPath()
  g.moveTo(-12, -6)
  g.lineTo(-32, -2 + flap * 4)
  g.lineTo(-28, 5 + flap * 4)
  g.lineTo(-10, 2)
  g.closePath()
  g.fill()
  g.fillStyle = '#8f6f52'
  g.beginPath()
  g.ellipse(0, -6, 17, 13, -0.15, 0, TAU)
  g.fill()
  g.fillStyle = '#e39a66'
  g.beginPath()
  g.ellipse(6, -3, 11, 9.5, -0.2, 0, TAU)
  g.fill()
  g.fillStyle = '#8f6f52'
  g.beginPath()
  g.arc(13 + look, -17, 9.5, 0, TAU)
  g.fill()
  g.fillStyle = '#e2b04a'
  g.beginPath()
  g.moveTo(21 + look, -19)
  g.lineTo(29 + look, -16)
  g.lineTo(21 + look, -14)
  g.closePath()
  g.fill()
  g.fillStyle = '#2f241c'
  g.beginPath()
  g.arc(16 + look, -19, 1.9, 0, TAU)
  g.fill()
  // Wing: folded when perched, beating in flight.
  g.fillStyle = '#6c5039'
  g.beginPath()
  if (flap > 0.02) {
    g.moveTo(-8, -10)
    g.quadraticCurveTo(-4, -10 - 30 * Math.sin(flap * Math.PI), 10, -12)
    g.quadraticCurveTo(2, -4, -8, -10)
  } else g.ellipse(-3, -6, 11, 7, 0.3, 0, TAU)
  g.fill()
  if (flap <= 0.02) {
    g.strokeStyle = '#6a5340'
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(-1, 6)
    g.lineTo(-1, 12)
    g.moveTo(5, 6)
    g.lineTo(5, 12)
    g.stroke()
  }
  g.restore()
}
