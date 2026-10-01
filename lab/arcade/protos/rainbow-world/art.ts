// Everything Rainbow World shows is painted here once, into offscreen sprites,
// when the game is created: stained wood with grain, felt hats, silk, a wicker
// basket, the floor and the wool mat. Nothing at module top level touches the
// DOM; the game calls `paintAll` from inside `create`.

import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

export type Ctx = CanvasRenderingContext2D

// A cached picture. (ax, ay) is where the object's base point (the middle of
// its foot on the ground) sits inside the picture, in logical pixels.
export interface Sprite {
  c: HTMLCanvasElement
  ax: number
  ay: number
  w: number
  h: number
}

export const ARCH_R = [154, 134, 114, 94, 74, 54, 34]
export const ARCH_T = 20
const ARCH_COL = ['#c64f3a', '#e0863a', '#ebbf4e', '#86ab58', '#5598a0', '#56699f', '#8a5f98']

export const DOLLS = [
  { body: '#d98b7b', hat: '#b4524a' },
  { body: '#e3b65c', hat: '#c8872e' },
  { body: '#94ae6b', hat: '#5f7f4b' },
  { body: '#7fa9c3', hat: '#4d7797' },
  { body: '#a685a9', hat: '#7a5a86' },
]

export const SILKS = ['#6c9ec6', '#88b068', '#e4b84e']

export const STONES = [
  { w: 23, h: 27, col: '#b9b1a3' },
  { w: 19, h: 22, col: '#a39b90' },
  { w: 16, h: 20, col: '#cbc2b0' },
]

// The window light falls on the floor as a slanted four-pane patch.
const LIGHT = [
  [170, 150],
  [560, 132],
  [720, 500],
  [250, 560],
] as const

export function lightPoint(u: number, v: number): [number, number] {
  const [a, b, c, d] = LIGHT
  const tx = a[0] + (b[0] - a[0]) * u
  const ty = a[1] + (b[1] - a[1]) * u
  const bx = d[0] + (c[0] - d[0]) * u
  const by = d[1] + (c[1] - d[1]) * u
  return [tx + (bx - tx) * v, ty + (by - ty) * v]
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: string, b: string, t: number): string {
  const A = hex(a)
  const B = hex(b)
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`
}

function makeSprite(ss: number, w: number, h: number, ax: number, ay: number, paint: (g: Ctx) => void): Sprite {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * ss)
  c.height = Math.ceil(h * ss)
  const g = c.getContext('2d')
  if (g) {
    g.scale(ss, ss)
    g.translate(ax, ay)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    paint(g)
  }
  return { c, ax, ay, w, h }
}

export function blit(g: Ctx, s: Sprite): void {
  g.drawImage(s.c, -s.ax, -s.ay, s.w, s.h)
}

// A closed, smooth outline through the points: the scroll-saw line of a
// carved wooden animal.
function smooth(g: Ctx, pts: readonly (readonly [number, number])[]): void {
  const n = pts.length
  g.beginPath()
  g.moveTo(pts[0]![0], pts[0]![1])
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!
    const p1 = pts[i]!
    const p2 = pts[(i + 1) % n]!
    const p3 = pts[(i + 2) % n]!
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1])
  }
  g.closePath()
}

type Box = readonly [number, number, number, number]

function grain(g: Ctx, r: () => number, box: Box, strength = 1, vertical = false): void {
  const [x0, y0, x1, y1] = box
  const a0 = vertical ? x0 : y0
  const a1 = vertical ? x1 : y1
  const b0 = vertical ? y0 : x0
  const b1 = vertical ? y1 : x1
  for (let a = a0 - 2; a < a1 + 2; a += 2.5 + r() * 5) {
    const amp = 0.8 + r() * 2.4
    const ph = r() * 6
    const len = 30 + r() * 60
    g.beginPath()
    for (let b = b0 - 6; b <= b1 + 8; b += 7) {
      const off = a + Math.sin(b / len + ph) * amp
      if (vertical) g.lineTo(off, b)
      else g.lineTo(b, off)
    }
    g.strokeStyle = `rgba(78,46,18,${(0.05 + r() * 0.11) * strength})`
    g.lineWidth = 0.6 + r() * 1.3
    g.stroke()
  }
}

// A chunky piece of wood: the front face in its stain with grain showing
// through, and a lighter top face above it, as seen by someone sitting on the
// floor looking slightly down.
function solid(g: Ctx, shape: () => void, base: string, r: () => number, box: Box, depth: number, paintGrain?: () => void): void {
  const top = mix(base, '#fff4dc', 0.3)
  for (let k = depth; k >= 1; k--) {
    g.save()
    g.translate(0, -k)
    shape()
    g.fillStyle = top
    g.fill()
    g.restore()
  }
  g.save()
  g.translate(0, -depth)
  shape()
  g.strokeStyle = 'rgba(84,52,24,0.2)'
  g.lineWidth = 1
  g.stroke()
  g.restore()

  shape()
  g.fillStyle = base
  g.fill()
  g.save()
  shape()
  g.clip()
  if (paintGrain) paintGrain()
  else grain(g, r, box)
  const shade = g.createLinearGradient(0, box[1], 0, box[3])
  shade.addColorStop(0, 'rgba(255,244,220,0.2)')
  shade.addColorStop(0.45, 'rgba(255,244,220,0)')
  shade.addColorStop(1, 'rgba(70,36,10,0.16)')
  g.fillStyle = shade
  g.fillRect(box[0] - 6, box[1] - 6, box[2] - box[0] + 12, box[3] - box[1] + 12)
  g.restore()
  shape()
  g.strokeStyle = 'rgba(84,52,24,0.34)'
  g.lineWidth = 1.3
  g.stroke()
}

function archShape(g: Ctx, R: number, r: number, back: boolean): void {
  g.beginPath()
  if (!back) {
    g.arc(0, 0, R, Math.PI, 0, false)
    g.lineTo(r, 0)
    if (r > 0.5) g.arc(0, 0, r, 0, Math.PI, true)
  } else {
    g.arc(0, -R, R, 0, Math.PI, false)
    g.lineTo(-r, -R)
    if (r > 0.5) g.arc(0, -R, r, Math.PI, 0, true)
  }
  g.closePath()
}

const ARCH_DEPTH = 10

function paintArch(ss: number, i: number, back: boolean): Sprite {
  const R = ARCH_R[i]!
  const r = Math.max(0, R - ARCH_T)
  const col = ARCH_COL[i]!
  const rand = mulberry(31 + i * 7 + (back ? 100 : 0))
  return makeSprite(ss, R * 2 + 12, R + ARCH_DEPTH + 10, R + 6, R + ARCH_DEPTH + 5, (g) => {
    const cy = back ? -R : 0
    solid(g, () => archShape(g, R, r, back), col, rand, [-R, -R, R, 0], ARCH_DEPTH, () => {
      // Grain follows the bend, as it does on a rainbow sawn from one board.
      for (let rr = r + 2; rr < R; rr += 2.2 + rand() * 3) {
        const a0 = rand() * 2.2
        const a1 = a0 + 0.5 + rand() * 2.4
        g.beginPath()
        if (back) g.arc(0, cy, rr, a0, Math.min(Math.PI, a1))
        else g.arc(0, cy, rr, Math.PI + a0, Math.min(TAU, Math.PI + a1))
        g.strokeStyle = `rgba(70,36,12,${0.05 + rand() * 0.11})`
        g.lineWidth = 0.7 + rand() * 1.4
        g.stroke()
      }
      // Stain sits unevenly: a few pale washes.
      for (let k = 0; k < 3; k++) {
        const a0 = rand() * 2.4
        g.beginPath()
        if (back) g.arc(0, cy, r + 4 + rand() * (ARCH_T - 8), a0, a0 + 0.6)
        else g.arc(0, cy, r + 4 + rand() * (ARCH_T - 8), Math.PI + a0, Math.PI + a0 + 0.6)
        g.strokeStyle = 'rgba(255,240,210,0.1)'
        g.lineWidth = 5
        g.stroke()
      }
    })
  })
}

function rrectPath(g: Ctx, x: number, y: number, w: number, h: number, rad: number): void {
  g.beginPath()
  g.roundRect(x, y, w, h, rad)
}

function paintBlock(ss: number, w: number, h: number, col: string, seed: number): Sprite {
  const rand = mulberry(seed)
  const d = 9
  return makeSprite(ss, w + 10, h + d + 10, w / 2 + 5, h + d + 5, (g) => {
    solid(g, () => rrectPath(g, -w / 2, -h, w, h, 3.5), col, rand, [-w / 2, -h, w / 2, 0], d, () => grain(g, rand, [-w / 2, -h, w / 2, 0], 1.1, h > w))
  })
}

function paintRoof(ss: number): Sprite {
  const rand = mulberry(77)
  const d = 9
  return makeSprite(ss, 144, 62 + d + 12, 72, 62 + d + 6, (g) => {
    const shape = () => {
      g.beginPath()
      g.moveTo(-63, 0)
      g.lineTo(-4, -60)
      g.quadraticCurveTo(0, -63, 4, -60)
      g.lineTo(63, 0)
      g.quadraticCurveTo(65, 2, 62, 2)
      g.lineTo(-62, 2)
      g.quadraticCurveTo(-65, 2, -63, 0)
      g.closePath()
    }
    solid(g, shape, '#c47f56', rand, [-65, -62, 65, 2], d)
  })
}

function paintDoll(ss: number, i: number, asleep: boolean): Sprite {
  const rand = mulberry(200 + i * 13)
  const { body, hat } = DOLLS[i]!
  return makeSprite(ss, 64, 122, 32, 116, (g) => {
    // The turned body, wide at the foot and narrow at the neck.
    const shape = () => {
      g.beginPath()
      g.moveTo(-20, -5)
      g.quadraticCurveTo(-21, 0, -15, 0)
      g.lineTo(15, 0)
      g.quadraticCurveTo(21, 0, 20, -5)
      g.bezierCurveTo(21, -30, 15, -48, 10.5, -57)
      g.lineTo(-10.5, -57)
      g.bezierCurveTo(-15, -48, -21, -30, -20, -5)
      g.closePath()
    }
    shape()
    g.fillStyle = body
    g.fill()
    g.save()
    shape()
    g.clip()
    grain(g, rand, [-22, -60, 22, 2], 0.9, true)
    const round = g.createLinearGradient(-22, 0, 22, 0)
    round.addColorStop(0, 'rgba(60,30,10,0.22)')
    round.addColorStop(0.32, 'rgba(255,246,224,0.2)')
    round.addColorStop(0.62, 'rgba(255,246,224,0)')
    round.addColorStop(1, 'rgba(60,30,10,0.26)')
    g.fillStyle = round
    g.fillRect(-24, -62, 48, 66)
    g.restore()
    shape()
    g.strokeStyle = 'rgba(84,52,24,0.32)'
    g.lineWidth = 1.2
    g.stroke()

    // The head: bare wood.
    g.beginPath()
    g.arc(0, -68, 15, 0, TAU)
    g.fillStyle = '#efd5ab'
    g.fill()
    g.save()
    g.clip()
    grain(g, rand, [-16, -84, 16, -52], 0.55, true)
    const ball = g.createRadialGradient(-5, -73, 2, 0, -68, 17)
    ball.addColorStop(0, 'rgba(255,248,230,0.4)')
    ball.addColorStop(0.6, 'rgba(255,248,230,0)')
    ball.addColorStop(1, 'rgba(70,36,10,0.2)')
    g.fillStyle = ball
    g.fillRect(-18, -86, 36, 36)
    g.restore()
    g.beginPath()
    g.arc(0, -68, 15, 0, TAU)
    g.strokeStyle = 'rgba(84,52,24,0.3)'
    g.lineWidth = 1.1
    g.stroke()

    // A calm face.
    g.fillStyle = 'rgba(214,118,98,0.26)'
    for (const s of [-1, 1]) {
      g.beginPath()
      g.arc(s * 9.5, -62.5, 3.3, 0, TAU)
      g.fill()
    }
    g.strokeStyle = '#3d2c24'
    g.fillStyle = '#3d2c24'
    g.lineWidth = 1.4
    for (const s of [-1, 1]) {
      g.beginPath()
      if (asleep) {
        g.arc(s * 5.6, -67.5, 2.6, 0.12 * Math.PI, 0.88 * Math.PI)
        g.stroke()
      } else {
        g.arc(s * 5.6, -66, 1.9, 0, TAU)
        g.fill()
      }
    }
    g.beginPath()
    g.arc(0, -62.2, 3.2, 0.22 * Math.PI, 0.78 * Math.PI)
    g.strokeStyle = 'rgba(150,84,66,0.85)'
    g.lineWidth = 1.2
    g.stroke()

    // A felt cap with a tip that leans a little.
    const lean = (i % 2 === 0 ? 1 : -1) * (3 + i)
    const cap = () => {
      g.beginPath()
      g.moveTo(-17.5, -70)
      g.bezierCurveTo(-15, -86, -5 + lean * 0.3, -100, lean, -110)
      g.bezierCurveTo(lean + 3, -99, 14, -86, 17.5, -70)
      g.quadraticCurveTo(0, -79.5, -17.5, -70)
      g.closePath()
    }
    cap()
    g.fillStyle = hat
    g.fill()
    g.save()
    cap()
    g.clip()
    for (let k = 0; k < 90; k++) {
      const x = -18 + rand() * 36
      const y = -112 + rand() * 44
      const a = rand() * TAU
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3)
      g.strokeStyle = rand() < 0.5 ? 'rgba(255,240,215,0.16)' : 'rgba(40,20,10,0.13)'
      g.lineWidth = 0.8
      g.stroke()
    }
    const side = g.createLinearGradient(-18, 0, 18, 0)
    side.addColorStop(0, 'rgba(40,20,10,0.12)')
    side.addColorStop(0.35, 'rgba(255,240,215,0.16)')
    side.addColorStop(1, 'rgba(40,20,10,0.2)')
    g.fillStyle = side
    g.fillRect(-20, -114, 40, 48)
    g.restore()
    cap()
    g.strokeStyle = mix(hat, '#2a160c', 0.35)
    g.lineWidth = 1.2
    g.stroke()
  })
}

function dot(g: Ctx, x: number, y: number, r: number, col: string): void {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fillStyle = col
  g.fill()
}

function paintHorse(ss: number): Sprite {
  const rand = mulberry(301)
  const d = 7
  return makeSprite(ss, 140, 126, 68, 119, (g) => {
    const tail = [
      [-45, -63],
      [-55, -58],
      [-61, -40],
      [-58, -20],
      [-51, -22],
      [-52, -40],
      [-46, -52],
    ] as const
    solid(g, () => smooth(g, tail), '#6d4b35', rand, [-62, -64, -44, -18], d)
    const body = [
      [-46, 0],
      [-48, -20],
      [-49, -44],
      [-45, -60],
      [-36, -68],
      [-20, -69],
      [-2, -67],
      [12, -70],
      [21, -82],
      [27, -96],
      [31, -108],
      [37, -100],
      [47, -97],
      [58, -88],
      [62, -79],
      [55, -74],
      [45, -75],
      [39, -66],
      [36, -48],
      [34.5, -24],
      [34, 0],
      [20, 0],
      [19.5, -24],
      [14, -38],
      [-6, -41],
      [-24, -39],
      [-31, -26],
      [-32, 0],
    ] as const
    solid(g, () => smooth(g, body), '#bb8b5d', rand, [-50, -108, 62, 0], d)
    // The mane, painted on.
    smooth(g, [
      [13, -71],
      [20, -85],
      [26, -99],
      [31, -107],
      [33, -98],
      [28, -86],
      [22, -74],
      [18, -68],
    ])
    g.fillStyle = '#6d4b35'
    g.fill()
    dot(g, 46, -90, 2.3, '#33231b')
  })
}

function paintSheep(ss: number): Sprite {
  const rand = mulberry(302)
  const d = 7
  return makeSprite(ss, 108, 92, 52, 85, (g) => {
    for (const x of [-30, 8]) solid(g, () => rrectPath(g, x, -26, 13, 26, 3), '#5c4a3d', rand, [x, -26, x + 13, 0], d)
    const wool: [number, number][] = []
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * TAU
      const bump = 1 + 0.07 * Math.sin(a * 9)
      wool.push([-7 + Math.cos(a) * 37 * bump, -43 + Math.sin(a) * 23 * bump])
    }
    solid(g, () => smooth(g, wool), '#f1e7d4', rand, [-46, -68, 32, -18], d, () => {
      for (let k = 0; k < 16; k++) {
        const x = -38 + rand() * 60
        const y = -60 + rand() * 36
        g.beginPath()
        g.arc(x, y, 3 + rand() * 4, rand() * TAU, rand() * TAU + 3.2)
        g.strokeStyle = 'rgba(120,96,64,0.16)'
        g.lineWidth = 1.2
        g.stroke()
      }
    })
    const head = () => {
      g.beginPath()
      g.ellipse(34, -51, 13.5, 10.5, 0.35, 0, TAU)
    }
    solid(g, head, '#5c4a3d', rand, [20, -62, 48, -40], 5)
    g.beginPath()
    g.ellipse(25, -60, 6, 3.4, -0.5, 0, TAU)
    g.fillStyle = '#4c3c31'
    g.fill()
    dot(g, 38, -53, 1.9, '#f4ead8')
  })
}

function paintFox(ss: number): Sprite {
  const rand = mulberry(303)
  const d = 7
  return makeSprite(ss, 132, 80, 66, 73, (g) => {
    const tail = [
      [-16, -30],
      [-32, -40],
      [-49, -37],
      [-59, -25],
      [-52, -14],
      [-34, -13],
      [-20, -19],
    ] as const
    solid(g, () => smooth(g, tail), '#cf7b3d', rand, [-60, -42, -14, -12], d, () => {
      grain(g, rand, [-60, -42, -14, -12])
      dot(g, -60, -24, 15, '#f3e6cc')
    })
    const body = [
      [-23, 0],
      [-24, -14],
      [-22, -28],
      [-12, -37],
      [4, -38],
      [18, -37],
      [27, -44],
      [30, -60],
      [37, -49],
      [44, -58],
      [47, -45],
      [56, -37],
      [60, -31],
      [54, -27],
      [44, -24],
      [37, -17],
      [33, 0],
      [22, 0],
      [20, -15],
      [6, -18],
      [-9, -16],
      [-11, 0],
    ] as const
    solid(g, () => smooth(g, body), '#cf7b3d', rand, [-25, -60, 60, 0], d, () => {
      grain(g, rand, [-25, -60, 60, 0])
      g.beginPath()
      g.ellipse(40, -22, 9, 8, 0.4, 0, TAU)
      g.fillStyle = 'rgba(243,230,204,0.9)'
      g.fill()
    })
    dot(g, 43, -42, 2, '#33231b')
    dot(g, 59, -31.5, 2.2, '#33231b')
  })
}

function paintBird(ss: number): Sprite {
  const rand = mulberry(304)
  const d = 5
  return makeSprite(ss, 66, 56, 33, 50, (g) => {
    const body = [
      [-7, 0],
      [-16, -7],
      [-19, -17],
      [-27, -27],
      [-17, -27],
      [-8, -30],
      [0, -36],
      [9, -39],
      [17, -35],
      [20, -27],
      [17, -15],
      [11, -5],
      [5, 0],
    ] as const
    // The beak first, so the body overlaps its root.
    g.beginPath()
    g.moveTo(17, -34)
    g.lineTo(28, -29)
    g.lineTo(18, -25)
    g.closePath()
    g.fillStyle = '#d99a3c'
    g.fill()
    solid(g, () => smooth(g, body), '#6f9dbf', rand, [-28, -40, 21, 0], d, () => {
      grain(g, rand, [-28, -40, 21, 0], 0.9)
      g.beginPath()
      g.ellipse(8, -8, 12, 9, -0.5, 0, TAU)
      g.fillStyle = 'rgba(241,229,204,0.9)'
      g.fill()
    })
    smooth(g, [
      [-14, -22],
      [-4, -25],
      [4, -20],
      [0, -12],
      [-10, -11],
    ])
    g.fillStyle = 'rgba(70,104,134,0.85)'
    g.fill()
    dot(g, 11, -31, 1.9, '#2b2019')
  })
}

function paintCone(ss: number, seed: number): Sprite {
  const rand = mulberry(seed)
  return makeSprite(ss, 44, 58, 22, 53, (g) => {
    const shape = () =>
      smooth(g, [
        [0, -48],
        [10, -41],
        [16, -26],
        [14, -10],
        [5, -1],
        [-5, -1],
        [-14, -10],
        [-16, -26],
        [-10, -41],
      ])
    shape()
    g.fillStyle = '#74503a'
    g.fill()
    g.save()
    shape()
    g.clip()
    for (let row = 0; row < 7; row++) {
      const y = -42 + row * 6.6
      const half = 17 - Math.abs(row - 3.4) * 2.2
      const n = Math.max(2, Math.round(half / 4.2))
      for (let k = 0; k <= n; k++) {
        const x = -half + (k / n) * half * 2 + (row % 2) * 3 - 1.5 + (rand() - 0.5) * 1.4
        g.beginPath()
        g.arc(x, y, 5.2, 0.1 * Math.PI, 0.9 * Math.PI)
        g.strokeStyle = 'rgba(190,150,108,0.9)'
        g.lineWidth = 1.6
        g.stroke()
        g.beginPath()
        g.arc(x, y + 1.6, 5.2, 0.15 * Math.PI, 0.85 * Math.PI)
        g.strokeStyle = 'rgba(48,28,16,0.35)'
        g.lineWidth = 1.2
        g.stroke()
      }
    }
    const round = g.createLinearGradient(-17, 0, 17, 0)
    round.addColorStop(0, 'rgba(30,16,8,0.3)')
    round.addColorStop(0.35, 'rgba(255,236,200,0.14)')
    round.addColorStop(1, 'rgba(30,16,8,0.34)')
    g.fillStyle = round
    g.fillRect(-18, -50, 36, 52)
    g.restore()
  })
}

function paintStone(ss: number, i: number): Sprite {
  const rand = mulberry(500 + i * 9)
  const { w, h, col } = STONES[i]!
  return makeSprite(ss, w * 2 + 10, h + 10, w + 5, h + 5, (g) => {
    const pts: [number, number][] = []
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU
      const wob = 1 + (rand() - 0.5) * 0.14
      pts.push([Math.cos(a) * w * wob, -h / 2 + Math.sin(a) * (h / 2) * wob])
    }
    smooth(g, pts)
    g.fillStyle = col
    g.fill()
    g.save()
    g.clip()
    for (let k = 0; k < 26; k++) dot(g, -w + rand() * w * 2, -h + rand() * h, 0.5 + rand() * 0.9, rand() < 0.5 ? 'rgba(60,54,48,0.25)' : 'rgba(255,252,244,0.3)')
    const round = g.createLinearGradient(0, -h, 0, 0)
    round.addColorStop(0, 'rgba(255,252,244,0.38)')
    round.addColorStop(0.5, 'rgba(255,252,244,0)')
    round.addColorStop(1, 'rgba(40,34,30,0.3)')
    g.fillStyle = round
    g.fillRect(-w - 2, -h - 2, w * 2 + 4, h + 4)
    g.restore()
    smooth(g, pts)
    g.strokeStyle = 'rgba(60,52,44,0.3)'
    g.lineWidth = 1
    g.stroke()
  })
}

// ---- silk ----

export const SILK_HALF = 165
const SILK_RY = 62

function silkEdge(g: Ctx, rand: () => number, scale = 1): void {
  const pts: [number, number][] = []
  const n = 22
  // A hand-hemmed edge wanders slowly; it does not jitter.
  const p1 = rand() * 6
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU
    const cx = Math.cos(a)
    const sy = Math.sin(a)
    // A rounded square laid flat, a little narrower at the far edge.
    const x = Math.sign(cx) * Math.abs(cx) ** 0.62 * 150 * (1 - 0.07 * -sy)
    const y = Math.sign(sy) * Math.abs(sy) ** 0.62 * SILK_RY
    const wander = Math.sin(a * 3 + p1) * 5 + Math.sin(a * 5 + p1 * 2) * 3
    pts.push([(x + cx * wander) * scale, (y + sy * wander * 0.7) * scale])
  }
  smooth(g, pts)
}

function paintSilkFlat(ss: number, i: number): Sprite {
  const col = SILKS[i]!
  return makeSprite(ss, 340, 156, 170, 76, (g) => {
    silkEdge(g, mulberry(600 + i))
    const fill = g.createLinearGradient(-150, -60, 150, 60)
    fill.addColorStop(0, mix(col, '#fffaf0', 0.3))
    fill.addColorStop(0.5, col)
    fill.addColorStop(1, mix(col, '#2a2030', 0.16))
    g.globalAlpha = 0.93
    g.fillStyle = fill
    g.fill()
    g.globalAlpha = 1
    g.save()
    g.clip()
    const rand = mulberry(640 + i)
    // Soft creases: a dark line with a light one beside it.
    for (let k = 0; k < 7; k++) {
      const x0 = -150 + rand() * 300
      const lean = (rand() - 0.5) * 120
      g.beginPath()
      g.moveTo(x0, -70)
      g.quadraticCurveTo(x0 + lean * 0.2 + (rand() - 0.5) * 40, 0, x0 + lean, 70)
      g.strokeStyle = `rgba(30,24,40,${0.05 + rand() * 0.06})`
      g.lineWidth = 3 + rand() * 5
      g.stroke()
    }
    g.restore()
    silkEdge(g, mulberry(600 + i))
    g.strokeStyle = mix(col, '#fffaf0', 0.45)
    g.lineWidth = 1.6
    g.globalAlpha = 0.7
    g.stroke()
    g.globalAlpha = 1
  })
}

// The sheen is its own picture so the game can let it drift: the only sign
// that the cloth is silk and the air in the room is moving.
function paintSilkSheen(ss: number, i: number): Sprite {
  return makeSprite(ss, 340, 156, 170, 76, (g) => {
    silkEdge(g, mulberry(600 + i), 0.94)
    g.save()
    g.clip()
    const rand = mulberry(680 + i)
    for (let k = 0; k < 5; k++) {
      const x0 = -140 + rand() * 280
      const lean = (rand() - 0.5) * 110
      g.beginPath()
      g.moveTo(x0, -70)
      g.quadraticCurveTo(x0 + lean * 0.3 + (rand() - 0.5) * 50, 0, x0 + lean, 70)
      g.strokeStyle = `rgba(255,252,240,${0.07 + rand() * 0.08})`
      g.lineWidth = 12 + rand() * 18
      g.stroke()
    }
    g.restore()
  })
}

function paintSilkHeap(ss: number, i: number): Sprite {
  const col = SILKS[i]!
  return makeSprite(ss, 150, 74, 74, 60, (g) => {
    // A silk let fall in a soft heap: lumps, not a neat fold.
    const shape = () =>
      smooth(g, [
        [-62, 1],
        [-59, -12],
        [-46, -23],
        [-33, -37],
        [-16, -45],
        [-2, -39],
        [11, -45],
        [26, -37],
        [37, -24],
        [52, -17],
        [64, -5],
        [67, 4],
        [42, 9],
        [12, 5],
        [-18, 10],
        [-46, 7],
      ])
    shape()
    const fill = g.createLinearGradient(-50, -46, 50, 10)
    fill.addColorStop(0, mix(col, '#fffaf0', 0.36))
    fill.addColorStop(0.55, col)
    fill.addColorStop(1, mix(col, '#2a2030', 0.2))
    g.fillStyle = fill
    g.fill()
    g.save()
    shape()
    g.clip()
    const folds: [number, number, number, number, number, number][] = [
      [-36, -32, -40, -12, -30, 6],
      [-12, -43, -12, -22, -4, 4],
      [13, -43, 20, -24, 22, 5],
      [38, -22, 46, -8, 52, 5],
    ]
    for (const [x0, y0, cx, cy, x1, y1] of folds) {
      g.beginPath()
      g.moveTo(x0, y0)
      g.quadraticCurveTo(cx, cy, x1, y1)
      g.strokeStyle = 'rgba(30,24,40,0.1)'
      g.lineWidth = 4
      g.stroke()
      g.beginPath()
      g.moveTo(x0 - 4, y0 + 1)
      g.quadraticCurveTo(cx - 6, cy - 1, x1 - 7, y1 - 1)
      g.strokeStyle = 'rgba(255,252,240,0.24)'
      g.lineWidth = 6
      g.stroke()
    }
    g.restore()
    shape()
    g.strokeStyle = mix(col, '#2a2030', 0.26)
    g.lineWidth = 1.1
    g.stroke()
  })
}

function silkFill(g: Ctx, col: string, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const fill = g.createLinearGradient(x0, y0, x1, y1)
  fill.addColorStop(0, mix(col, '#fffaf0', 0.32))
  fill.addColorStop(0.5, col)
  fill.addColorStop(1, mix(col, '#2a2030', 0.2))
  return fill
}

// A silk pinched in the fingers: it hangs from (px, py) and its hem lags
// behind at hx.
export function drawSilkHeld(g: Ctx, i: number, px: number, py: number, hx: number, time: number): void {
  const col = SILKS[i]!
  const hy = py + 132
  const sway = hx - px
  g.beginPath()
  g.moveTo(px, py)
  g.bezierCurveTo(px + 20, py + 34, hx + 76, hy - 62, hx + 62, hy)
  for (let k = 0; k < 4; k++) {
    const xa = hx + 62 - k * 31
    const dip = 8 + Math.sin(time * 2.2 + k * 1.7) * 4
    g.quadraticCurveTo(xa - 15, hy + dip + (k % 2) * 5, xa - 31, hy - (k === 3 ? 0 : 2))
  }
  g.bezierCurveTo(hx - 76, hy - 62, px - 20, py + 34, px, py)
  g.closePath()
  g.fillStyle = silkFill(g, col, px - 70, py, px + 70, hy)
  g.globalAlpha = 0.95
  g.fill()
  g.globalAlpha = 1
  g.lineWidth = 3
  for (let k = 0; k < 4; k++) {
    const u = -0.75 + k * 0.5
    g.beginPath()
    g.moveTo(px + u * 4, py + 8)
    g.quadraticCurveTo(px + u * 30 + sway * 0.3, py + 60, hx + u * 58, hy - 2)
    g.strokeStyle = k % 2 === 0 ? 'rgba(30,24,40,0.12)' : 'rgba(255,252,240,0.3)'
    g.stroke()
  }
}

// A silk lying over things: `h` is the height of the cloth above the ground
// line `y` at evenly spaced points across its width. Where nothing holds it
// up it lies on the floor like any spread silk, so a low bump and a tall hill
// are the same cloth.
export function drawSilkDrape(g: Ctx, i: number, x: number, y: number, h: readonly number[], k: number): void {
  const col = SILKS[i]!
  const n = h.length - 1
  const x0 = x - SILK_HALF
  const step = (SILK_HALF * 2) / n
  const ry = 46
  let peak = 0
  let peakAt = 0
  for (let j = 0; j <= n; j++) {
    if (h[j]! > peak) {
      peak = h[j]!
      peakAt = j
    }
  }
  const lie = (j: number): number => ry * Math.sqrt(Math.max(0, 1 - ((j / n) * 2 - 1) ** 2))
  const topY = (j: number): number => y - Math.max(h[j]! * k, lie(j) * 0.9)
  const hemY = (j: number): number => y + lie(j) * (1 + 0.07 * Math.sin(j * 1.9 + i))
  g.beginPath()
  g.moveTo(x0, y)
  for (let j = 1; j < n; j++) {
    const xa = x0 + j * step
    const xb = x0 + (j + 1) * step
    g.quadraticCurveTo(xa, topY(j), (xa + xb) / 2, (topY(j) + topY(j + 1)) / 2)
  }
  g.lineTo(x0 + SILK_HALF * 2, y)
  for (let j = n - 1; j > 0; j--) {
    const xa = x0 + j * step
    const xb = x0 + (j - 1) * step
    g.quadraticCurveTo(xa, hemY(j), (xa + xb) / 2, (hemY(j) + hemY(j - 1)) / 2)
  }
  g.closePath()
  g.fillStyle = silkFill(g, col, x - 130, y - peak * k, x + 130, y + ry)
  g.globalAlpha = 0.96
  g.fill()
  g.globalAlpha = 1
  // Folds fall from the top of the hill and run out across the floor.
  const peakX = x0 + peakAt * step
  const peakY = y - peak * k
  for (let f = 0; f < 7; f++) {
    const u = -1 + (f / 6) * 2
    const sx = peakX + u * 26
    const j = Math.max(0, Math.min(n, Math.round((sx - x0) / step)))
    const sy = Math.max(peakY, y - h[j]! * k) + 6
    const ex = x + u * (SILK_HALF - 30)
    const je = Math.max(0, Math.min(n, Math.round((ex - x0) / step)))
    const ey = y + lie(je) * 0.8
    g.beginPath()
    g.moveTo(sx, sy)
    g.quadraticCurveTo((sx + ex) / 2 + u * 16, (sy + y) / 2 - 4, ex, ey)
    g.strokeStyle = f % 2 === 0 ? 'rgba(30,24,40,0.09)' : 'rgba(255,252,240,0.22)'
    g.lineWidth = f % 2 === 0 ? 3 : 5
    g.stroke()
  }
  g.beginPath()
  g.moveTo(x0 + SILK_HALF * 2 - 22, y - 2)
  g.lineTo(x0 + SILK_HALF * 2 - 2, y + 1)
  g.strokeStyle = mix(col, '#fffaf0', 0.45)
  g.lineWidth = 1.4
  g.stroke()
}

// ---- basket ----

export const BASKET_RX = 138
const BASKET_RY = 30
export const BASKET_H = 112

function paintBasketBack(ss: number): Sprite {
  return makeSprite(ss, 300, 80, 150, 40, (g) => {
    // The base point of this sprite is the centre of the rim.
    g.beginPath()
    g.ellipse(0, 0, BASKET_RX, BASKET_RY, 0, 0, TAU)
    const inside = g.createLinearGradient(0, -BASKET_RY, 0, BASKET_RY)
    inside.addColorStop(0, '#8a6540')
    inside.addColorStop(1, '#5d4129')
    g.fillStyle = inside
    g.fill()
    g.save()
    g.clip()
    for (let k = -6; k <= 6; k++) {
      g.beginPath()
      g.moveTo(k * 22, -BASKET_RY)
      g.quadraticCurveTo(k * 20, 0, k * 17, BASKET_RY)
      g.strokeStyle = 'rgba(40,24,12,0.22)'
      g.lineWidth = 3
      g.stroke()
    }
    g.restore()
    g.beginPath()
    g.ellipse(0, 0, BASKET_RX, BASKET_RY, 0, Math.PI, TAU)
    g.strokeStyle = '#b3854d'
    g.lineWidth = 11
    g.stroke()
    braid(g, Math.PI, TAU)
  })
}

function braid(g: Ctx, a0: number, a1: number): void {
  for (let a = a0 + 0.03; a < a1; a += 0.085) {
    const x = Math.cos(a) * BASKET_RX
    const y = Math.sin(a) * BASKET_RY
    g.beginPath()
    g.moveTo(x - 3, y - 4.5)
    g.lineTo(x + 3, y + 4.5)
    g.strokeStyle = 'rgba(96,62,30,0.5)'
    g.lineWidth = 1.6
    g.stroke()
    g.beginPath()
    g.moveTo(x - 6, y - 4)
    g.lineTo(x - 1, y + 3.5)
    g.strokeStyle = 'rgba(244,214,160,0.4)'
    g.lineWidth = 1.4
    g.stroke()
  }
}

function paintBasketFront(ss: number): Sprite {
  const rand = mulberry(900)
  return makeSprite(ss, 300, BASKET_H + 60, 150, 24, (g) => {
    const bottomRx = 108
    const body = () => {
      g.beginPath()
      g.ellipse(0, 0, BASKET_RX, BASKET_RY, 0, Math.PI, 0, true)
      g.lineTo(bottomRx, BASKET_H - 20)
      g.ellipse(0, BASKET_H - 20, bottomRx, 20, 0, 0, Math.PI, false)
      g.closePath()
    }
    body()
    g.fillStyle = '#c0935a'
    g.fill()
    g.save()
    body()
    g.clip()
    // Woven rows: short willow strokes, each row shifted half a stitch.
    const rows = 11
    for (let row = 0; row < rows; row++) {
      const v = row / (rows - 1)
      const rx = BASKET_RX + (bottomRx - BASKET_RX) * v
      const cy = v * (BASKET_H - 20)
      const ry = BASKET_RY + (20 - BASKET_RY) * v
      const stitches = 15
      for (let k = 0; k < stitches; k++) {
        const u0 = (k + (row % 2) * 0.5) / stitches
        const a0 = Math.PI - u0 * Math.PI
        const a1 = a0 - (Math.PI / stitches) * 0.82
        if (a1 < -0.05) continue
        g.beginPath()
        g.ellipse(0, cy + 6, rx, ry, 0, a0, Math.max(0, a1), true)
        const tone = rand()
        g.strokeStyle = tone < 0.4 ? '#d2a76b' : tone < 0.8 ? '#b98b52' : '#a87a45'
        g.lineWidth = 8.5
        g.stroke()
        g.beginPath()
        g.ellipse(0, cy + 9.5, rx, ry, 0, a0, Math.max(0, a1), true)
        g.strokeStyle = 'rgba(70,42,18,0.3)'
        g.lineWidth = 1.4
        g.stroke()
      }
    }
    const round = g.createLinearGradient(-BASKET_RX, 0, BASKET_RX, 0)
    round.addColorStop(0, 'rgba(50,28,10,0.32)')
    round.addColorStop(0.3, 'rgba(255,236,196,0.14)')
    round.addColorStop(0.7, 'rgba(255,236,196,0)')
    round.addColorStop(1, 'rgba(50,28,10,0.36)')
    g.fillStyle = round
    g.fillRect(-BASKET_RX - 4, -BASKET_RY - 4, BASKET_RX * 2 + 8, BASKET_H + BASKET_RY + 30)
    g.restore()
    g.beginPath()
    g.ellipse(0, 0, BASKET_RX, BASKET_RY, 0, 0, Math.PI)
    g.strokeStyle = '#bf9257'
    g.lineWidth = 13
    g.stroke()
    braid(g, 0, Math.PI)
  })
}

// ---- the room ----

function paintRoom(ss: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.ceil(W * ss)
  c.height = Math.ceil(H * ss)
  const g = c.getContext('2d')
  if (!g) return c
  g.scale(ss, ss)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  const rand = mulberry(11)

  // The wall and its skirting board.
  const wall = g.createLinearGradient(0, 0, 0, 96)
  wall.addColorStop(0, '#f3e9d7')
  wall.addColorStop(1, '#eadcc3')
  g.fillStyle = wall
  g.fillRect(0, 0, W, 96)
  g.fillStyle = '#e2d2b6'
  g.fillRect(0, 92, W, 26)
  g.fillStyle = 'rgba(255,250,236,0.6)'
  g.fillRect(0, 92, W, 3)
  g.fillStyle = 'rgba(90,60,30,0.18)'
  g.fillRect(0, 114, W, 4)

  // Floorboards, wider as they come towards us.
  const rows = [118, 146, 180, 221, 270, 328, 396, 475, 566, 670, 790, H + 40]
  for (let i = 0; i < rows.length - 1; i++) {
    const y0 = rows[i]!
    const y1 = rows[i + 1]!
    let x = -rand() * 300
    while (x < W) {
      const len = 260 + rand() * 420
      const tone = mix('#c8975f', rand() < 0.5 ? '#d9ad74' : '#b98652', rand() * 0.55)
      g.fillStyle = tone
      g.fillRect(x, y0, len, y1 - y0)
      g.save()
      g.beginPath()
      g.rect(x, y0, len, y1 - y0)
      g.clip()
      grain(g, rand, [x, y0, x + len, y1], 0.75)
      g.restore()
      g.fillStyle = 'rgba(70,42,18,0.3)'
      g.fillRect(x + len - 1, y0, 1.6, y1 - y0)
      x += len
    }
    g.fillStyle = 'rgba(70,42,18,0.34)'
    g.fillRect(0, y0 - 1, W, 1.8)
    g.fillStyle = 'rgba(255,236,200,0.18)'
    g.fillRect(0, y0 + 1, W, 1.2)
  }
  // The far floor is a little dimmer.
  const far = g.createLinearGradient(0, 118, 0, 330)
  far.addColorStop(0, 'rgba(70,40,16,0.2)')
  far.addColorStop(1, 'rgba(70,40,16,0)')
  g.fillStyle = far
  g.fillRect(0, 118, W, 212)

  // The mat: thick undyed wool felt with a blanket-stitched edge.
  const mat = (dx: number, dy: number, inset: number) => {
    const tl: [number, number] = [96 + inset + dx, 206 + inset * 0.7 + dy]
    const tr: [number, number] = [1084 - inset + dx, 206 + inset * 0.7 + dy]
    const br: [number, number] = [1150 - inset + dx, 790 - inset + dy]
    const bl: [number, number] = [30 + inset + dx, 790 - inset + dy]
    const rad = 38 - inset * 0.5
    g.beginPath()
    g.moveTo((tl[0] + tr[0]) / 2, tl[1])
    g.arcTo(tr[0], tr[1], br[0], br[1], rad)
    g.arcTo(br[0], br[1], bl[0], bl[1], rad)
    g.arcTo(bl[0], bl[1], tl[0], tl[1], rad)
    g.arcTo(tl[0], tl[1], tr[0], tr[1], rad)
    g.closePath()
  }
  mat(5, 9, -2)
  g.fillStyle = 'rgba(60,34,12,0.22)'
  g.fill()
  mat(0, 6, 0)
  g.fillStyle = '#cdbf9f'
  g.fill()
  mat(0, 0, 0)
  g.fillStyle = '#eadfc8'
  g.fill()
  g.save()
  mat(0, 0, 0)
  g.clip()
  for (let k = 0; k < 40; k++) {
    const x = rand() * W
    const y = 200 + rand() * 600
    const rad = 60 + rand() * 120
    const blot = g.createRadialGradient(x, y, 0, x, y, rad)
    const tint = rand() < 0.5 ? '255,250,238' : '170,146,104'
    blot.addColorStop(0, `rgba(${tint},${tint.startsWith('255') ? 0.1 : 0.05})`)
    blot.addColorStop(1, `rgba(${tint},0)`)
    g.fillStyle = blot
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  for (let k = 0; k < 2600; k++) {
    const x = 20 + rand() * (W - 40)
    const y = 200 + rand() * 600
    const a = rand() * TAU
    const len = 2 + rand() * 5
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + Math.cos(a + 0.6) * len * 0.6, y + Math.sin(a + 0.6) * len * 0.6, x + Math.cos(a) * len, y + Math.sin(a) * len)
    g.strokeStyle = rand() < 0.5 ? 'rgba(255,252,242,0.3)' : 'rgba(128,104,70,0.12)'
    g.lineWidth = 0.8
    g.stroke()
  }
  g.restore()
  // Blanket stitch: a running thread and a tick over the edge.
  const corners: [number, number][] = [
    [118, 222],
    [1062, 222],
    [1124, 768],
    [56, 768],
  ]
  g.strokeStyle = 'rgba(182,104,72,0.85)'
  g.lineWidth = 2
  for (let e = 0; e < 4; e++) {
    const a = corners[e]!
    const b = corners[(e + 1) % 4]!
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const ux = (b[0] - a[0]) / len
    const uy = (b[1] - a[1]) / len
    const from = 26
    const to = len - 26
    g.beginPath()
    g.moveTo(a[0] + ux * from, a[1] + uy * from)
    g.lineTo(a[0] + ux * to, a[1] + uy * to)
    g.stroke()
    for (let s = from; s <= to; s += 17) {
      const jx = (rand() - 0.5) * 1.6
      const x = a[0] + ux * s
      const y = a[1] + uy * s
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + uy * 13 + jx, y - ux * 13)
      g.stroke()
    }
  }

  // Afternoon light through a four-pane window, soft at the edges.
  const panes: [number, number, number, number][] = [
    [0, 0.47, 0, 0.47],
    [0.53, 1, 0, 0.47],
    [0, 0.47, 0.53, 1],
    [0.53, 1, 0.53, 1],
  ]
  for (const [u0, u1, v0, v1] of panes) {
    for (let f = 0; f < 6; f++) {
      const e = f * 0.009
      g.beginPath()
      const p = [lightPoint(u0 + e, v0 + e), lightPoint(u1 - e, v0 + e), lightPoint(u1 - e, v1 - e), lightPoint(u0 + e, v1 - e)]
      g.moveTo(p[0]![0], p[0]![1])
      for (let k = 1; k < 4; k++) g.lineTo(p[k]![0], p[k]![1])
      g.closePath()
      g.fillStyle = 'rgba(255,243,208,0.07)'
      g.fill()
    }
  }
  return c
}

// A soft warm spot: sun coming through the leaves outside the window.
function paintLeaf(ss: number): Sprite {
  return makeSprite(ss, 120, 120, 60, 60, (g) => {
    const blot = g.createRadialGradient(0, 0, 4, 0, 0, 58)
    blot.addColorStop(0, 'rgba(255,240,190,0.17)')
    blot.addColorStop(0.55, 'rgba(255,240,190,0.08)')
    blot.addColorStop(1, 'rgba(255,238,176,0)')
    g.fillStyle = blot
    g.fillRect(-60, -60, 120, 120)
  })
}

export interface Art {
  room: HTMLCanvasElement
  leaf: Sprite
  arch: Sprite[]
  archBack: Sprite[]
  doll: Sprite[]
  dollAsleep: Sprite[]
  horse: Sprite
  sheep: Sprite
  fox: Sprite
  bird: Sprite
  cube: Sprite[]
  plank: Sprite[]
  plankUp: Sprite[]
  roof: Sprite
  cone: Sprite[]
  stone: Sprite[]
  silkFlat: Sprite[]
  silkSheen: Sprite[]
  silkHeap: Sprite[]
  basketBack: Sprite
  basketFront: Sprite
}

export function paintAll(ss: number): Art {
  return {
    room: paintRoom(ss),
    leaf: paintLeaf(ss),
    arch: ARCH_R.map((_, i) => paintArch(ss, i, false)),
    archBack: ARCH_R.map((_, i) => paintArch(ss, i, true)),
    doll: DOLLS.map((_, i) => paintDoll(ss, i, false)),
    dollAsleep: DOLLS.map((_, i) => paintDoll(ss, i, true)),
    horse: paintHorse(ss),
    sheep: paintSheep(ss),
    fox: paintFox(ss),
    bird: paintBird(ss),
    cube: [paintBlock(ss, 58, 58, '#dcb67c', 401), paintBlock(ss, 58, 58, '#d3a970', 402)],
    plank: [paintBlock(ss, 150, 30, '#d8b178', 403), paintBlock(ss, 150, 30, '#cfa46a', 404)],
    plankUp: [paintBlock(ss, 30, 150, '#d8b178', 405), paintBlock(ss, 30, 150, '#cfa46a', 406)],
    roof: paintRoof(ss),
    cone: [paintCone(ss, 451), paintCone(ss, 452)],
    stone: STONES.map((_, i) => paintStone(ss, i)),
    silkFlat: SILKS.map((_, i) => paintSilkFlat(ss, i)),
    silkSheen: SILKS.map((_, i) => paintSilkSheen(ss, i)),
    silkHeap: SILKS.map((_, i) => paintSilkHeap(ss, i)),
    basketBack: paintBasketBack(ss),
    basketFront: paintBasketFront(ss),
  }
}
