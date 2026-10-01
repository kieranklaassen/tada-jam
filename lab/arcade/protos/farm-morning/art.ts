// Farm Morning: the palette, the layout, the painted backdrop and the tools.
// Everything static is painted once into an offscreen layer (with a paper
// grain over it) so a frame only blits it and draws what moves.

import { TAU, clamp, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

export type RGB = readonly [number, number, number]
export type Pt = readonly [number, number]
type G = CanvasRenderingContext2D

export function css(c: RGB, a = 1): string {
  const r = Math.round(c[0])
  const g = Math.round(c[1])
  const b = Math.round(c[2])
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

// Positive lightens toward warm cream, negative darkens toward umber.
export function shade(c: RGB, k: number): RGB {
  return k >= 0 ? mix(c, [255, 246, 224], k) : mix(c, [48, 30, 22], -k)
}

// A small seeded generator so the painted world is the same every time.
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const C = {
  wood: [186, 146, 98] as RGB,
  woodLight: [214, 178, 128] as RGB,
  woodDark: [128, 92, 60] as RGB,
  madder: [186, 96, 70] as RGB,
  cream: [242, 228, 198] as RGB,
  roof: [118, 96, 82] as RGB,
  sage: [132, 164, 146] as RGB,
  iron: [78, 104, 90] as RGB,
  band: [92, 80, 70] as RGB,
  straw: [226, 196, 112] as RGB,
  hay: [214, 178, 92] as RGB,
  grain: [234, 184, 72] as RGB,
  earth: [214, 186, 140] as RGB,
  water: [132, 188, 208] as RGB,
  waterLight: [206, 234, 240] as RGB,
  wicker: [204, 164, 106] as RGB,
  dark: [62, 44, 34] as RGB,
  night: [26, 32, 74] as RGB,
}

// Where everything stands. One place, so the painter and the play agree.
export const L = {
  hen: { x: 154, floor: 402, wallL: 46, wallR: 262, eave: 236, peak: 150, holeL: 114, holeR: 194, holeTop: 312, rampBottom: 486, doorTravel: 94 },
  vent: { x: 154, y: 196 },
  nest: { l: 262, r: 396, back: 300, front: 338, bottom: 392, eggY: 330, eggs: [294, 329, 364] },
  basket: { x: 322, y: 456, slots: [[299, 447], [323, 443], [346, 448]] as Pt[] },
  pump: { x: 547, base: 528, pivotX: 539, pivotY: 356, handle: 108, spoutX: 602, spoutY: 410 },
  bucketHome: { x: 614, y: 530 },
  trough: { l: 686, r: 850, back: 452, front: 470, bottom: 524 },
  pony: { x: 1000, y: 530 },
  stable: { l: 838, r: 1160, top: 178, base: 472 },
  hook: { x: 1012, y: 224 },
  bin: { x: 118, top: 604, bottom: 716, rx: 60 },
  pile: { x: 690, y: 748 },
  goat: { x: 902, y: 744 },
  rack: { x: 1086, top: 602, vee: 672, base: 744 },
  yard: { l: 204, r: 585, t: 516, b: 752 },
  sun: { x: 600, low: 322, high: 104 },
}

// The hens' yard has a notch where the pump and bucket stand.
export function yardTop(x: number): number {
  return x > 440 ? 556 : L.yard.t
}

export function makeLayer(w: number, h: number, res: number, paint: (g: G) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * res)
  canvas.height = Math.ceil(h * res)
  const g = canvas.getContext('2d')
  if (g) {
    g.scale(res, res)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    paint(g)
  }
  return canvas
}

// A soft curve through points (the points are controls; the curve passes
// through their midpoints), which is what makes shapes look cut by hand.
export function smooth(g: G, pts: readonly Pt[], closed = true): void {
  const n = pts.length
  if (n < 3) return
  if (closed) {
    const last = pts[n - 1]
    const first = pts[0]
    g.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2)
    for (let i = 0; i < n; i++) {
      const p = pts[i]
      const q = pts[(i + 1) % n]
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
    }
    g.closePath()
    return
  }
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < n - 1; i++) {
    const p = pts[i]
    const q = pts[i + 1]
    if (i === n - 2) g.quadraticCurveTo(p[0], p[1], q[0], q[1])
    else g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
  }
}

function blobPts(r: () => number, cx: number, cy: number, rx: number, ry: number, n = 10, jitter = 0.12): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const k = 1.08 + (r() - 0.5) * 2 * jitter
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return pts
}

function blob(g: G, r: () => number, cx: number, cy: number, rx: number, ry: number, fill: string, n = 10, jitter = 0.12): void {
  g.beginPath()
  smooth(g, blobPts(r, cx, cy, rx, ry, n, jitter))
  g.fillStyle = fill
  g.fill()
}

function poly(g: G, pts: readonly Pt[], fill: string): void {
  g.beginPath()
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1])
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

// One board: slightly uneven corners, its own tint, and a little grain.
function plank(g: G, r: () => number, x: number, y: number, w: number, h: number, base: RGB, tone = 0.16): void {
  const j = 1.3
  const c = shade(base, (r() - 0.5) * tone)
  const o = () => (r() - 0.5) * j
  poly(g, [[x + o(), y + o()], [x + w + o(), y + o()], [x + w + o(), y + h + o()], [x + o(), y + h + o()]], css(c))
  const vertical = h > w
  g.strokeStyle = css(shade(c, -0.3), 0.3)
  g.lineWidth = 1
  const lines = 2 + Math.floor(r() * 2)
  for (let i = 0; i < lines; i++) {
    g.beginPath()
    if (vertical) {
      const gx = x + w * (0.2 + 0.6 * r())
      g.moveTo(gx, y + 3)
      g.quadraticCurveTo(gx + (r() - 0.5) * 5, y + h / 2, gx + (r() - 0.5) * 3, y + h - 3)
    } else {
      const gy = y + h * (0.2 + 0.6 * r())
      g.moveTo(x + 3, gy)
      g.quadraticCurveTo(x + w / 2, gy + (r() - 0.5) * 5, x + w - 3, gy + (r() - 0.5) * 3)
    }
    g.stroke()
  }
  // The shaded edge where the next board begins.
  g.strokeStyle = css(shade(c, -0.4), 0.35)
  g.lineWidth = 1.4
  g.beginPath()
  if (vertical) {
    g.moveTo(x + w, y + 1)
    g.lineTo(x + w, y + h - 1)
  } else {
    g.moveTo(x + 1, y + h)
    g.lineTo(x + w - 1, y + h)
  }
  g.stroke()
}

function softShadow(g: G, x: number, y: number, rx: number, ry: number, a = 0.14): void {
  g.fillStyle = `rgba(52,58,30,${a})`
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, TAU)
  g.fill()
}

function tuft(g: G, r: () => number, x: number, y: number, s: number, color: string): void {
  g.strokeStyle = color
  g.lineWidth = 1.6 + s
  const blades = 3 + Math.floor(r() * 3)
  for (let i = 0; i < blades; i++) {
    const lean = (i - (blades - 1) / 2) * 5 * s + (r() - 0.5) * 4
    g.beginPath()
    g.moveTo(x + lean * 0.3, y)
    g.quadraticCurveTo(x + lean * 0.6, y - 8 * s, x + lean * 1.5, y - (11 + r() * 8) * s)
    g.stroke()
  }
}

function strands(g: G, r: () => number, cx: number, cy: number, rx: number, ry: number, count: number, len = 22): void {
  const tones = ['#ecd486', '#c9a24c', '#f3e2a6', '#b8903c', '#dcbc68']
  for (let i = 0; i < count; i++) {
    const a = r() * TAU
    const d = Math.sqrt(r())
    const x = cx + Math.cos(a) * rx * d
    const y = cy + Math.sin(a) * ry * d
    const dir = (r() - 0.5) * 2.4
    const l = len * (0.5 + r() * 0.8)
    g.strokeStyle = tones[Math.floor(r() * tones.length)]
    g.lineWidth = 1.2 + r() * 1.6
    g.beginPath()
    g.moveTo(x - Math.cos(dir) * l * 0.5, y - Math.sin(dir) * l * 0.3)
    g.quadraticCurveTo(x, y - 4 * r(), x + Math.cos(dir) * l * 0.5, y + Math.sin(dir) * l * 0.3)
    g.stroke()
  }
}

// ---------------------------------------------------------------------------
// The backdrop

function paintHills(g: G, r: () => number): void {
  g.fillStyle = '#a9c4ab'
  g.beginPath()
  g.moveTo(0, 306)
  g.bezierCurveTo(150, 250, 320, 262, 470, 300)
  g.bezierCurveTo(600, 334, 720, 296, 860, 262)
  g.bezierCurveTo(990, 232, 1100, 258, 1180, 286)
  g.lineTo(1180, 440)
  g.lineTo(0, 440)
  g.closePath()
  g.fill()
  // Small far trees, round as wooden toys.
  const far: [number, number, number][] = [[352, 274, 1], [384, 282, 0.7], [470, 300, 0.6], [712, 300, 0.8], [742, 296, 0.6], [640, 318, 0.55]]
  for (const [x, y, s] of far) {
    g.strokeStyle = 'rgba(110,104,86,0.7)'
    g.lineWidth = 2.5 * s
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x, y - 12 * s)
    g.stroke()
    blob(g, r, x, y - 20 * s, 13 * s, 14 * s, '#8fae93', 8, 0.1)
    blob(g, r, x - 3 * s, y - 24 * s, 7 * s, 7 * s, 'rgba(176,204,170,0.6)', 7, 0.1)
  }
  const meadow = g.createLinearGradient(0, 320, 0, 430)
  meadow.addColorStop(0, '#c9d98e')
  meadow.addColorStop(1, '#acc577')
  g.fillStyle = meadow
  g.beginPath()
  g.moveTo(0, 348)
  g.bezierCurveTo(220, 314, 430, 338, 640, 346)
  g.bezierCurveTo(840, 354, 1010, 320, 1180, 338)
  g.lineTo(1180, 440)
  g.lineTo(0, 440)
  g.closePath()
  g.fill()
  for (let i = 0; i < 46; i++) tuft(g, r, r() * W, 356 + r() * 40, 0.5, 'rgba(142,172,96,0.7)')
}

function paintYard(g: G, r: () => number): void {
  const grass = g.createLinearGradient(0, 396, 0, H)
  grass.addColorStop(0, '#b6cb80')
  grass.addColorStop(0.45, '#a3bf6e')
  grass.addColorStop(1, '#8fb060')
  g.fillStyle = grass
  g.beginPath()
  g.moveTo(-10, 402)
  for (let x = 0; x <= W + 60; x += 60) g.quadraticCurveTo(x - 30, 396 + (r() - 0.5) * 9, x, 400 + (r() - 0.5) * 6)
  g.lineTo(W + 10, H + 10)
  g.lineTo(-10, H + 10)
  g.closePath()
  g.fill()
  // Soft lighter and darker washes, the way paint pools.
  for (let i = 0; i < 16; i++) {
    const light = r() > 0.5
    blob(g, r, r() * W, 440 + r() * 380, 90 + r() * 120, 22 + r() * 30, light ? 'rgba(214,226,150,0.16)' : 'rgba(96,136,70,0.10)', 9, 0.2)
  }
  // Worn earth where feet go every day.
  const worn: [number, number, number, number][] = [
    [154, 506, 92, 22],
    [575, 540, 112, 20],
    [768, 536, 118, 18],
    [1000, 524, 196, 30],
    [118, 724, 92, 18],
    [1000, 750, 190, 20],
    [690, 752, 118, 16],
    [360, 640, 150, 46],
  ]
  for (const [x, y, rx, ry] of worn) {
    blob(g, r, x, y, rx, ry, 'rgba(216,190,144,0.62)', 11, 0.16)
    blob(g, r, x + 6, y + 2, rx * 0.6, ry * 0.55, 'rgba(226,204,160,0.5)', 9, 0.16)
  }
  for (let i = 0; i < 60; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(160,130,96,0.35)' : 'rgba(240,226,190,0.4)'
    g.beginPath()
    g.ellipse(250 + r() * 240, 606 + r() * 70, 1.5 + r() * 2, 1 + r() * 1.4, r() * 3, 0, TAU)
    g.fill()
  }
  for (let i = 0; i < 190; i++) {
    const y = 420 + r() * 392
    tuft(g, r, r() * W, y, 0.55 + (y - 400) / 700, r() > 0.45 ? 'rgba(112,150,74,0.55)' : 'rgba(196,214,128,0.6)')
  }
  // Daisies and a few dandelions.
  for (let i = 0; i < 34; i++) {
    const x = r() * W
    const y = 430 + r() * 372
    const s = 0.7 + (y - 400) / 600
    if (r() > 0.3) {
      g.fillStyle = 'rgba(252,248,236,0.95)'
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * TAU + r()
        g.beginPath()
        g.ellipse(x + Math.cos(a) * 3.2 * s, y + Math.sin(a) * 2.4 * s, 2.4 * s, 1.7 * s, a, 0, TAU)
        g.fill()
      }
      g.fillStyle = '#eec04e'
      g.beginPath()
      g.arc(x, y, 1.7 * s, 0, TAU)
      g.fill()
    } else {
      g.fillStyle = '#f0c648'
      g.beginPath()
      g.arc(x, y, 3 * s, 0, TAU)
      g.fill()
    }
  }
}

function paintTree(g: G, r: () => number): void {
  // Trunk, mostly behind the henhouse.
  g.fillStyle = '#8a6a4e'
  g.beginPath()
  g.moveTo(4, 410)
  g.quadraticCurveTo(14, 300, 8, 200)
  g.lineTo(40, 196)
  g.quadraticCurveTo(34, 300, 44, 410)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(70,48,34,0.35)'
  g.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    g.beginPath()
    g.moveTo(12 + i * 7, 400)
    g.quadraticCurveTo(16 + i * 6, 320, 14 + i * 6, 230)
    g.stroke()
  }
  const leaves: [number, number, number, number, string][] = [
    [30, 150, 96, 80, '#7fa25e'],
    [120, 120, 84, 70, '#86aa62'],
    [-10, 80, 80, 66, '#7a9c58'],
    [84, 62, 92, 56, '#8cae66'],
    [176, 96, 60, 52, '#93b46c'],
    [40, 200, 70, 44, '#75985a'],
    [150, 176, 56, 40, '#7fa25e'],
  ]
  for (const [x, y, rx, ry, col] of leaves) blob(g, r, x, y, rx, ry, col, 11, 0.16)
  // Lighter dabs on the sunward side, a few already turning gold.
  for (let i = 0; i < 34; i++) {
    const x = -20 + r() * 240
    const y = 30 + r() * 190
    blob(g, r, x, y, 10 + r() * 14, 7 + r() * 9, r() > 0.78 ? 'rgba(226,190,96,0.6)' : 'rgba(170,198,116,0.5)', 7, 0.2)
  }
  const apples: Pt[] = [[20, 118], [70, 176], [112, 92], [168, 132], [44, 60], [142, 196], [200, 104]]
  for (const [x, y] of apples) {
    g.fillStyle = '#c4553c'
    g.beginPath()
    g.arc(x, y, 7.5, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(244,196,150,0.6)'
    g.beginPath()
    g.arc(x - 2.4, y - 2.6, 2.4, 0, TAU)
    g.fill()
  }
}

function paintFence(g: G, r: () => number): void {
  const base: RGB = [176, 156, 128]
  softShadow(g, 610, 406, 230, 5, 0.1)
  for (const y of [340, 370]) {
    g.strokeStyle = css(shade(base, -0.05 + r() * 0.1))
    g.lineWidth = 9
    g.beginPath()
    g.moveTo(398, y + r() * 4)
    for (let x = 470; x <= 830; x += 72) g.quadraticCurveTo(x - 36, y + (r() - 0.5) * 7, x, y + (r() - 0.5) * 5)
    g.stroke()
    g.strokeStyle = 'rgba(255,246,224,0.3)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(400, y - 3)
    g.lineTo(828, y - 3 + (r() - 0.5) * 4)
    g.stroke()
  }
  for (let x = 416; x <= 820; x += 67) {
    const top = 318 + (r() - 0.5) * 8
    plank(g, r, x - 7, top, 14, 406 - top, base, 0.12)
    g.fillStyle = css(shade(base, 0.2))
    g.beginPath()
    g.ellipse(x, top, 7, 2.6, 0, 0, TAU)
    g.fill()
  }
}

function paintStable(g: G, r: () => number): void {
  const S = L.stable
  softShadow(g, 1000, 478, 200, 12, 0.12)
  // The dark, warm inside.
  const inside = g.createLinearGradient(0, S.top, 0, S.base)
  inside.addColorStop(0, '#4a3529')
  inside.addColorStop(0.7, '#5d4534')
  inside.addColorStop(1, '#6e5540')
  g.fillStyle = inside
  g.fillRect(S.l, S.top, S.r - S.l, S.base - S.top)
  g.strokeStyle = 'rgba(30,18,12,0.28)'
  g.lineWidth = 1.5
  for (let x = S.l + 30; x < S.r; x += 34) {
    g.beginPath()
    g.moveTo(x + (r() - 0.5) * 2, S.top + 4)
    g.lineTo(x + (r() - 0.5) * 2, S.base - 30)
    g.stroke()
  }
  // Straw bedding.
  blob(g, r, 1000, 462, 168, 22, '#d6b666', 14, 0.1)
  blob(g, r, 960, 456, 110, 12, '#e4c97c', 12, 0.14)
  strands(g, r, 1000, 460, 168, 16, 110, 26)
  // Gable boards.
  g.save()
  g.beginPath()
  g.moveTo(812, 160)
  g.lineTo(998, 72)
  g.lineTo(1186, 160)
  g.closePath()
  g.clip()
  for (let y = 60; y < 162; y += 20) plank(g, r, 806, y, 386, 20, [190, 152, 106], 0.14)
  g.restore()
  // Hayloft window with straw peeping out.
  g.fillStyle = '#4a3529'
  g.beginPath()
  g.arc(998, 124, 17, 0, TAU)
  g.fill()
  g.strokeStyle = css(C.cream)
  g.lineWidth = 4
  g.stroke()
  strands(g, r, 998, 134, 14, 6, 14, 18)
  // Posts and lintel.
  plank(g, r, 820, 170, 22, 306, C.wood, 0.14)
  plank(g, r, 1156, 170, 22, 306, C.wood, 0.14)
  plank(g, r, 810, 156, 374, 24, shade(C.wood, -0.08), 0.1)
  // Roof boards.
  const roofFill = css(C.roof)
  poly(g, [[794, 172], [998, 54], [998, 78], [806, 188]], roofFill)
  poly(g, [[1202, 172], [998, 54], [998, 78], [1190, 188]], css(shade(C.roof, -0.12)))
  g.strokeStyle = 'rgba(255,240,214,0.28)'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(796, 170)
  g.lineTo(998, 55)
  g.lineTo(1200, 170)
  g.stroke()
  g.strokeStyle = 'rgba(50,34,26,0.3)'
  g.lineWidth = 1.4
  for (let i = 1; i < 8; i++) {
    const t = i / 8
    g.beginPath()
    g.moveTo(lerp(794, 998, t), lerp(172, 54, t))
    g.lineTo(lerp(806, 998, t), lerp(188, 78, t))
    g.moveTo(lerp(1202, 998, t), lerp(172, 54, t))
    g.lineTo(lerp(1190, 998, t), lerp(188, 78, t))
    g.stroke()
  }
  // The peg the brush hangs from.
  g.strokeStyle = css(C.woodDark)
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(L.hook.x, 180)
  g.lineTo(L.hook.x, 190)
  g.stroke()
}

function paintHenhouse(g: G, r: () => number): void {
  const N = L.hen
  softShadow(g, 160, 448, 150, 12, 0.14)
  // Legs.
  for (const x of [58, 234]) plank(g, r, x, N.floor, 16, 44, C.woodDark, 0.1)
  // Walls: upright madder-red boards cut to the gable.
  g.save()
  g.beginPath()
  g.moveTo(N.wallL, N.floor)
  g.lineTo(N.wallL, N.eave)
  g.lineTo(N.x, N.peak)
  g.lineTo(N.wallR, N.eave)
  g.lineTo(N.wallR, N.floor)
  g.closePath()
  g.clip()
  for (let x = N.wallL - 2; x < N.wallR; x += 24) plank(g, r, x, N.peak - 6, 24, N.floor - N.peak + 10, C.madder, 0.14)
  g.restore()
  // Floor beam.
  plank(g, r, 38, N.floor - 6, 232, 13, C.woodDark, 0.1)
  // Vent in the gable.
  g.fillStyle = '#3d2b22'
  g.beginPath()
  g.arc(L.vent.x, L.vent.y, 12, 0, TAU)
  g.fill()
  g.strokeStyle = css(C.cream)
  g.lineWidth = 4
  g.stroke()
  // The pop-hole: a dark arch in a cream frame, with runners for the door.
  g.fillStyle = css(C.cream)
  g.beginPath()
  g.roundRect(N.holeL - 8, N.holeTop - 100, 6, 100 + (N.floor - N.holeTop), 2)
  g.roundRect(N.holeR + 2, N.holeTop - 100, 6, 100 + (N.floor - N.holeTop), 2)
  g.fill()
  g.beginPath()
  g.roundRect(N.holeL - 8, N.holeTop - 8, N.holeR - N.holeL + 16, N.floor - N.holeTop + 8, [16, 16, 2, 2])
  g.fill()
  g.fillStyle = '#3a2820'
  g.beginPath()
  g.roundRect(N.holeL, N.holeTop, N.holeR - N.holeL, N.floor - N.holeTop, [12, 12, 0, 0])
  g.fill()
  // Straw on the sill.
  strands(g, r, N.x, N.floor - 5, 34, 4, 16, 16)
  // Roof boards.
  poly(g, [[28, 250], [N.x, 132], [N.x, 156], [40, 266]], css(C.roof))
  poly(g, [[280, 250], [N.x, 132], [N.x, 156], [268, 266]], css(shade(C.roof, -0.12)))
  g.strokeStyle = 'rgba(255,240,214,0.28)'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(30, 248)
  g.lineTo(N.x, 133)
  g.lineTo(278, 248)
  g.stroke()
  g.strokeStyle = 'rgba(50,34,26,0.3)'
  g.lineWidth = 1.4
  for (let i = 1; i < 6; i++) {
    const t = i / 6
    g.beginPath()
    g.moveTo(lerp(28, N.x, t), lerp(250, 132, t))
    g.lineTo(lerp(40, N.x, t), lerp(266, 156, t))
    g.moveTo(lerp(280, N.x, t), lerp(250, 132, t))
    g.lineTo(lerp(268, N.x, t), lerp(266, 156, t))
    g.stroke()
  }
  // The ramp, with cleats for small feet.
  softShadow(g, 160, N.rampBottom + 2, 60, 7, 0.12)
  poly(g, [[124, N.floor], [184, N.floor], [204, N.rampBottom], [104, N.rampBottom]], css(C.woodLight))
  g.strokeStyle = css(shade(C.woodLight, -0.3), 0.4)
  g.lineWidth = 1.2
  g.beginPath()
  g.moveTo(144, N.floor)
  g.lineTo(136, N.rampBottom)
  g.moveTo(166, N.floor)
  g.lineTo(172, N.rampBottom)
  g.stroke()
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.6) / 5.2
    const y = lerp(N.floor, N.rampBottom, t)
    const half = lerp(30, 50, t)
    g.strokeStyle = css(C.wood)
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(N.x - half, y)
    g.lineTo(N.x + half, y + (r() - 0.5) * 2)
    g.stroke()
  }

  // The nest box on the side wall.
  const B = L.nest
  softShadow(g, 330, 400, 76, 6, 0.1)
  // Bracket legs.
  plank(g, r, 372, B.bottom - 4, 12, 56, C.woodDark, 0.1)
  g.strokeStyle = css(C.woodDark)
  g.lineWidth = 7
  g.beginPath()
  g.moveTo(272, 420)
  g.lineTo(306, B.bottom + 2)
  g.stroke()
  // Inside: back wall and straw.
  poly(g, [[B.l, B.back], [B.r, B.back], [B.r + 2, B.front + 4], [B.l - 2, B.front + 4]], '#5a4332')
  blob(g, r, 329, B.front - 6, 62, 15, '#d8ba6a', 12, 0.1)
  strands(g, r, 329, B.front - 8, 60, 13, 60, 22)
  // Front and side boards.
  plank(g, r, B.l - 3, B.front, B.r - B.l + 6, 28, C.wood, 0.12)
  plank(g, r, B.l - 3, B.front + 28, B.r - B.l + 6, 28, C.wood, 0.12)
  g.strokeStyle = css(C.cream, 0.9)
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(B.l - 2, B.front + 1)
  g.lineTo(B.r + 2, B.front + 1)
  g.stroke()
  // Straw hanging over the front edge.
  strands(g, r, 329, B.front + 2, 58, 3, 16, 16)
}

function paintTrough(g: G, r: () => number): void {
  const T = L.trough
  softShadow(g, 768, T.bottom + 6, 104, 9, 0.16)
  // Feet.
  plank(g, r, T.l + 14, T.bottom - 6, 16, 14, C.woodDark, 0.1)
  plank(g, r, T.r - 30, T.bottom - 6, 16, 14, C.woodDark, 0.1)
  // The wet inside, seen a little from above.
  poly(g, [[T.l + 8, T.back], [T.r - 8, T.back], [T.r - 2, T.front + 3], [T.l + 2, T.front + 3]], '#5c4a3a')
  g.strokeStyle = css(shade(C.wood, -0.1))
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(T.l + 6, T.back)
  g.lineTo(T.r - 6, T.back)
  g.stroke()
  // Front boards, tapering down.
  const rows = 3
  for (let i = 0; i < rows; i++) {
    const y0 = lerp(T.front, T.bottom - 4, i / rows)
    const y1 = lerp(T.front, T.bottom - 4, (i + 1) / rows)
    const inset = i * 5
    plank(g, r, T.l + inset, y0, T.r - T.l - inset * 2, y1 - y0, C.wood, 0.14)
  }
  // Rim, lit from above.
  g.strokeStyle = css(shade(C.woodLight, 0.12))
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(T.l - 2, T.front + 1)
  g.lineTo(T.r + 2, T.front + 1)
  g.stroke()
  // Iron straps.
  g.strokeStyle = css(C.band, 0.8)
  g.lineWidth = 5
  for (const x of [T.l + 30, T.r - 30]) {
    g.beginPath()
    g.moveTo(x, T.front + 4)
    g.lineTo(x + (x < 768 ? 4 : -4), T.bottom - 6)
    g.stroke()
  }
}

function paintPump(g: G, r: () => number): void {
  const U = L.pump
  softShadow(g, U.x + 8, U.base + 4, 62, 8, 0.16)
  // Stone slab and wooden plinth.
  blob(g, r, U.x + 30, U.base + 2, 86, 12, '#b9b2a2', 12, 0.08)
  blob(g, r, U.x + 26, U.base - 1, 70, 8, 'rgba(226,220,204,0.6)', 10, 0.1)
  plank(g, r, U.x - 30, U.base - 20, 60, 16, C.woodDark, 0.1)
  // Body.
  const body = g.createLinearGradient(U.x - 16, 0, U.x + 16, 0)
  body.addColorStop(0, css(shade(C.iron, 0.2)))
  body.addColorStop(0.45, css(C.iron))
  body.addColorStop(1, css(shade(C.iron, -0.3)))
  g.fillStyle = body
  g.beginPath()
  g.roundRect(U.x - 14, 384, 28, U.base - 20 - 384, 5)
  g.fill()
  // Wider head with the spout.
  g.beginPath()
  g.roundRect(U.x - 19, 366, 38, 56, 9)
  g.fill()
  g.fillStyle = css(shade(C.iron, -0.12))
  g.beginPath()
  g.moveTo(U.x + 14, 388)
  g.quadraticCurveTo(U.spoutX - 4, 386, U.spoutX + 6, 396)
  g.lineTo(U.spoutX + 6, U.spoutY)
  g.lineTo(U.spoutX - 8, U.spoutY)
  g.quadraticCurveTo(U.spoutX - 10, 404, U.x + 14, 408)
  g.closePath()
  g.fill()
  g.fillStyle = '#2c3a33'
  g.beginPath()
  g.ellipse(U.spoutX - 1, U.spoutY, 7, 2.6, 0, 0, TAU)
  g.fill()
  // Cap and pivot ears.
  g.fillStyle = css(shade(C.iron, 0.1))
  g.beginPath()
  g.ellipse(U.x, 366, 21, 7, 0, 0, TAU)
  g.fill()
  g.fillStyle = css(shade(C.iron, -0.2))
  g.beginPath()
  g.roundRect(U.pivotX - 9, U.pivotY - 12, 18, 22, 5)
  g.fill()
  // Bands and a highlight.
  g.strokeStyle = css(shade(C.iron, -0.35), 0.7)
  g.lineWidth = 3
  for (const y of [430, 486]) {
    g.beginPath()
    g.moveTo(U.x - 15, y)
    g.lineTo(U.x + 15, y)
    g.stroke()
  }
  g.strokeStyle = 'rgba(232,244,226,0.35)'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(U.x - 8, 392)
  g.lineTo(U.x - 8, U.base - 28)
  g.stroke()
}

function paintBin(g: G, r: () => number): void {
  const B = L.bin
  softShadow(g, B.x + 6, B.bottom + 4, 78, 10, 0.16)
  // A round wooden lid lying beside it.
  g.fillStyle = css(shade(C.wood, -0.2))
  g.beginPath()
  g.ellipse(B.x + 62, B.bottom + 14, 34, 9, 0, 0, TAU)
  g.fill()
  g.fillStyle = css(shade(C.woodLight, 0.04))
  g.beginPath()
  g.ellipse(B.x + 62, B.bottom + 10, 34, 9, 0, 0, TAU)
  g.fill()
  g.strokeStyle = css(C.woodDark, 0.5)
  g.lineWidth = 1.2
  g.beginPath()
  g.moveTo(B.x + 34, B.bottom + 8)
  g.lineTo(B.x + 90, B.bottom + 11)
  g.moveTo(B.x + 40, B.bottom + 14)
  g.lineTo(B.x + 84, B.bottom + 15)
  g.stroke()
  // Staves, a tub slightly wider at the top.
  g.save()
  g.beginPath()
  g.moveTo(B.x - B.rx, B.top)
  g.lineTo(B.x + B.rx, B.top)
  g.quadraticCurveTo(B.x + B.rx - 2, B.bottom - 20, B.x + B.rx - 10, B.bottom)
  g.quadraticCurveTo(B.x, B.bottom + 12, B.x - B.rx + 10, B.bottom)
  g.quadraticCurveTo(B.x - B.rx + 2, B.bottom - 20, B.x - B.rx, B.top)
  g.closePath()
  g.clip()
  for (let i = 0; i < 6; i++) plank(g, r, B.x - B.rx + i * 20, B.top - 4, 20, B.bottom - B.top + 20, C.wood, 0.16)
  // Rounded by shade at the sides.
  const round = g.createLinearGradient(B.x - B.rx, 0, B.x + B.rx, 0)
  round.addColorStop(0, 'rgba(60,40,24,0.28)')
  round.addColorStop(0.3, 'rgba(60,40,24,0)')
  round.addColorStop(0.7, 'rgba(60,40,24,0)')
  round.addColorStop(1, 'rgba(60,40,24,0.34)')
  g.fillStyle = round
  g.fillRect(B.x - B.rx, B.top, B.rx * 2, B.bottom - B.top + 14)
  g.restore()
  // Hoops.
  g.strokeStyle = css(C.band, 0.85)
  g.lineWidth = 6
  for (const y of [B.top + 30, B.bottom - 22]) {
    g.beginPath()
    g.moveTo(B.x - B.rx + 2, y - 3)
    g.quadraticCurveTo(B.x, y + 9, B.x + B.rx - 2, y - 3)
    g.stroke()
  }
  // The open top.
  g.fillStyle = '#5a4332'
  g.beginPath()
  g.ellipse(B.x, B.top, B.rx, 17, 0, 0, TAU)
  g.fill()
  g.strokeStyle = css(shade(C.woodLight, 0.1))
  g.lineWidth = 5
  g.beginPath()
  g.ellipse(B.x, B.top, B.rx, 17, 0, 0, TAU)
  g.stroke()
}

function paintRackLegs(g: G, r: () => number): void {
  const R = L.rack
  softShadow(g, R.x, R.base + 4, 78, 9, 0.16)
  g.lineWidth = 11
  g.strokeStyle = css(shade(C.woodDark, 0.06))
  g.beginPath()
  g.moveTo(R.x - 54, R.base)
  g.lineTo(R.x + 22, R.vee - 14)
  g.stroke()
  g.strokeStyle = css(C.woodDark)
  g.beginPath()
  g.moveTo(R.x + 54, R.base)
  g.lineTo(R.x - 22, R.vee - 14)
  g.stroke()
  g.strokeStyle = 'rgba(255,240,214,0.2)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(R.x + 50, R.base - 4)
  g.lineTo(R.x - 22, R.vee - 18)
  g.stroke()
  // The back of the crib, in shadow.
  poly(g, [[R.x - 62, R.top], [R.x + 62, R.top], [R.x + 30, R.vee], [R.x - 30, R.vee]], 'rgba(86,62,44,0.55)')
  void r
}

function paintBasket(g: G, r: () => number): void {
  const K = L.basket
  softShadow(g, K.x + 4, K.y + 50, 60, 8, 0.16)
  // The dark inside, behind the rim.
  g.fillStyle = '#6a4e36'
  g.beginPath()
  g.ellipse(K.x, K.y, 52, 11, 0, 0, TAU)
  g.fill()
  // Handle.
  g.strokeStyle = css(shade(C.wicker, -0.25))
  g.lineWidth = 8
  g.beginPath()
  g.moveTo(K.x - 48, K.y + 2)
  g.bezierCurveTo(K.x - 44, K.y - 76, K.x + 44, K.y - 76, K.x + 48, K.y + 2)
  g.stroke()
  g.strokeStyle = css(shade(C.wicker, 0.2), 0.7)
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(K.x - 46, K.y - 6)
  g.bezierCurveTo(K.x - 42, K.y - 76, K.x + 40, K.y - 78, K.x + 44, K.y - 10)
  g.stroke()
  // Body.
  g.save()
  g.beginPath()
  g.moveTo(K.x - 53, K.y)
  g.quadraticCurveTo(K.x, K.y + 22, K.x + 53, K.y)
  g.quadraticCurveTo(K.x + 50, K.y + 40, K.x + 34, K.y + 50)
  g.quadraticCurveTo(K.x, K.y + 58, K.x - 34, K.y + 50)
  g.quadraticCurveTo(K.x - 50, K.y + 40, K.x - 53, K.y)
  g.closePath()
  g.fillStyle = css(C.wicker)
  g.fill()
  g.clip()
  // Weave: rows of short over-and-under strokes.
  for (let row = 0; row < 6; row++) {
    const y = K.y + 10 + row * 8
    for (let i = -7; i <= 7; i++) {
      const x = K.x + i * 8 + (row % 2) * 4
      g.strokeStyle = (i + row) % 2 === 0 ? css(shade(C.wicker, 0.22)) : css(shade(C.wicker, -0.2))
      g.lineWidth = 3.4
      g.beginPath()
      g.moveTo(x - 3, y + (r() - 0.5) + Math.abs(i) * 0.25 - 3)
      g.lineTo(x + 3, y + (r() - 0.5) + Math.abs(i) * 0.25 - 3)
      g.stroke()
    }
  }
  const round = g.createLinearGradient(K.x - 54, 0, K.x + 54, 0)
  round.addColorStop(0, 'rgba(70,44,24,0.3)')
  round.addColorStop(0.3, 'rgba(70,44,24,0)')
  round.addColorStop(0.75, 'rgba(70,44,24,0)')
  round.addColorStop(1, 'rgba(70,44,24,0.32)')
  g.fillStyle = round
  g.fillRect(K.x - 56, K.y - 4, 112, 70)
  g.restore()
  // The braided front rim.
  g.strokeStyle = css(shade(C.wicker, -0.22))
  g.lineWidth = 7
  g.beginPath()
  g.moveTo(K.x - 52, K.y + 1)
  g.quadraticCurveTo(K.x, K.y + 22, K.x + 52, K.y + 1)
  g.stroke()
  g.strokeStyle = css(shade(C.wicker, 0.25), 0.8)
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(K.x - 50, K.y - 1)
  g.quadraticCurveTo(K.x, K.y + 19, K.x + 50, K.y - 1)
  g.stroke()
}

// A paper grain over everything painted, so flat colour reads as hand-made.
function paintGrain(g: G, r: () => number): void {
  g.save()
  g.globalCompositeOperation = 'source-atop'
  for (let i = 0; i < 5200; i++) {
    const light = r() > 0.5
    g.fillStyle = light ? 'rgba(255,250,232,0.07)' : 'rgba(70,46,26,0.055)'
    g.beginPath()
    g.arc(r() * W, r() * H, 0.5 + r() * 1.3, 0, TAU)
    g.fill()
  }
  g.lineWidth = 0.8
  for (let i = 0; i < 420; i++) {
    const x = r() * W
    const y = r() * H
    const a = r() * TAU
    const l = 4 + r() * 9
    g.strokeStyle = r() > 0.5 ? 'rgba(255,250,232,0.07)' : 'rgba(70,46,26,0.05)'
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
  g.restore()
}

// A sheet of paper grain laid over the whole picture, moving things included,
// so the animals belong to the same page as the yard they stand in.
export function paintPaper(g: G): void {
  const r = seeded(404)
  for (let i = 0; i < 3600; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(255,250,232,0.075)' : 'rgba(70,46,26,0.05)'
    g.beginPath()
    g.arc(r() * W, r() * H, 0.5 + r() * 1.2, 0, TAU)
    g.fill()
  }
  g.lineWidth = 0.8
  for (let i = 0; i < 360; i++) {
    const x = r() * W
    const y = r() * H
    const a = r() * TAU
    const l = 4 + r() * 10
    g.strokeStyle = r() > 0.5 ? 'rgba(255,250,232,0.08)' : 'rgba(70,46,26,0.045)'
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
}

export function paintBackdrop(g: G): void {
  const r = seeded(20260930)
  paintHills(g, r)
  paintYard(g, r)
  paintTree(g, r)
  paintFence(g, r)
  paintStable(g, r)
  paintHenhouse(g, r)
  paintTrough(g, r)
  paintPump(g, r)
  paintBin(g, r)
  paintRackLegs(g, r)
  paintBasket(g, r)
  paintGrain(g, r)
}

// ---------------------------------------------------------------------------
// Sprites painted once

export const DOOR = { w: 84, h: 98 }

export function paintDoor(g: G): void {
  const r = seeded(5)
  for (let i = 0; i < 4; i++) plank(g, r, 1 + i * 20.5, 1, 20.5, DOOR.h - 2, C.sage, 0.14)
  // A Z brace and a wooden knob.
  g.strokeStyle = css(shade(C.sage, -0.22))
  g.lineWidth = 8
  g.beginPath()
  g.moveTo(6, 16)
  g.lineTo(DOOR.w - 6, 16)
  g.moveTo(6, DOOR.h - 26)
  g.lineTo(DOOR.w - 6, DOOR.h - 26)
  g.stroke()
  g.lineWidth = 7
  g.beginPath()
  g.moveTo(DOOR.w - 10, 20)
  g.lineTo(10, DOOR.h - 30)
  g.stroke()
  g.fillStyle = css(shade(C.woodLight, 0.1))
  g.beginPath()
  g.arc(DOOR.w / 2, DOOR.h - 12, 8, 0, TAU)
  g.fill()
  g.fillStyle = css(shade(C.woodDark, 0.1), 0.6)
  g.beginPath()
  g.arc(DOOR.w / 2 + 1.5, DOOR.h - 10.5, 4, 0, TAU)
  g.fill()
  g.globalCompositeOperation = 'source-atop'
  for (let i = 0; i < 160; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(255,250,232,0.08)' : 'rgba(40,50,40,0.07)'
    g.beginPath()
    g.arc(r() * DOOR.w, r() * DOOR.h, 0.5 + r() * 1.2, 0, TAU)
    g.fill()
  }
}

export const HAY = { w: 150, h: 90 }

// A tuft of hay, used for the forkful and the rack. Centre-bottom anchored.
export function paintHay(g: G): void {
  const r = seeded(31)
  blob(g, r, 75, 56, 58, 26, '#c9a650', 12, 0.14)
  blob(g, r, 74, 48, 52, 24, '#dcbc68', 12, 0.14)
  blob(g, r, 66, 40, 34, 14, '#ead08a', 10, 0.16)
  strands(g, r, 75, 50, 60, 26, 90, 30)
}

export const PILE = { w: 230, h: 140 }

export function paintPile(g: G): void {
  const r = seeded(47)
  blob(g, r, 115, 104, 98, 30, '#bf9c48', 14, 0.1)
  blob(g, r, 112, 86, 86, 40, '#d2b05c', 14, 0.12)
  blob(g, r, 108, 66, 62, 34, '#e0c274', 12, 0.14)
  blob(g, r, 100, 52, 36, 18, '#ecd692', 10, 0.16)
  strands(g, r, 112, 84, 96, 44, 170, 34)
}

export const RACK = { w: 150, h: 96 }

// The slatted front of the hay crib. Origin: the crib's top-left corner
// (L.rack.x - 75, L.rack.top - 10).
export function paintRackFront(g: G): void {
  const r = seeded(13)
  const cx = 75
  const top = 10
  const vee = top + (L.rack.vee - L.rack.top)
  for (let i = 0; i < 7; i++) {
    const t = i / 6
    const x0 = lerp(cx - 60, cx + 60, t)
    const x1 = lerp(cx - 28, cx + 28, t)
    g.strokeStyle = css(shade(C.wood, (r() - 0.5) * 0.2))
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(x0, top + 2)
    g.lineTo(x1, vee)
    g.stroke()
    g.strokeStyle = 'rgba(255,244,220,0.3)'
    g.lineWidth = 1.5
    g.beginPath()
    g.moveTo(x0 - 1.5, top + 4)
    g.lineTo(x1 - 1.5, vee - 2)
    g.stroke()
  }
  g.strokeStyle = css(shade(C.woodLight, 0.02))
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(cx - 66, top)
  g.lineTo(cx + 66, top + (r() - 0.5) * 2)
  g.stroke()
  g.strokeStyle = css(C.woodDark)
  g.lineWidth = 8
  g.beginPath()
  g.moveTo(cx - 32, vee)
  g.lineTo(cx + 32, vee)
  g.stroke()
}

// A soft round stamp, used to rub dust off.
export function paintDot(g: G, size: number): void {
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(0,0,0,1)')
  grad.addColorStop(0.55, 'rgba(0,0,0,0.85)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
}

// ---------------------------------------------------------------------------
// Sky

const SKY_NIGHT: readonly RGB[] = [[30, 36, 80], [46, 54, 104], [86, 88, 132]]
const SKY_DAWN: readonly RGB[] = [[132, 150, 198], [240, 178, 156], [253, 218, 156]]
const SKY_DAY: readonly RGB[] = [[130, 190, 228], [196, 228, 238], [250, 240, 212]]

// s runs from -1 (night) through 0 (first light) to 1 (full morning).
export function drawSky(g: G, s: number): void {
  const a = s >= 0 ? SKY_DAWN : SKY_NIGHT
  const b = s >= 0 ? SKY_DAY : SKY_DAWN
  const t = s >= 0 ? s : 1 + s
  const grad = g.createLinearGradient(0, 0, 0, 380)
  grad.addColorStop(0, css(mix(a[0], b[0], t)))
  grad.addColorStop(0.62, css(mix(a[1], b[1], t)))
  grad.addColorStop(1, css(mix(a[2], b[2], t)))
  g.fillStyle = grad
  g.fillRect(0, 0, W, 400)
}

export function drawSun(g: G, x: number, y: number, s: number, pulse: number): void {
  const high = clamp(s, 0, 1)
  const core = mix([250, 176, 96], [255, 232, 160], high)
  const radius = 44 + pulse * 5
  const glow = g.createRadialGradient(x, y, radius * 0.6, x, y, 190 + pulse * 20)
  glow.addColorStop(0, css(mix([255, 214, 150], [255, 246, 210], high), 0.55))
  glow.addColorStop(0.4, css(mix([255, 200, 140], [255, 246, 214], high), 0.2))
  glow.addColorStop(1, css([255, 226, 170], 0))
  g.fillStyle = glow
  g.beginPath()
  g.arc(x, y, 210, 0, TAU)
  g.fill()
  g.fillStyle = css(core)
  g.beginPath()
  g.arc(x, y, radius, 0, TAU)
  g.fill()
  g.fillStyle = css(shade(core, 0.4), 0.55)
  g.beginPath()
  g.arc(x - 9, y - 10, radius * 0.62, 0, TAU)
  g.fill()
}

export function drawCloud(g: G, x: number, y: number, size: number, s: number): void {
  const tone = s >= 0 ? mix([255, 214, 196], [255, 255, 250], s) : mix([255, 214, 196], [120, 124, 170], -s)
  g.fillStyle = css(tone, 0.78)
  g.beginPath()
  g.ellipse(x, y, 62 * size, 17 * size, 0, 0, TAU)
  g.ellipse(x - 26 * size, y - 9 * size, 30 * size, 17 * size, 0, 0, TAU)
  g.ellipse(x + 14 * size, y - 15 * size, 36 * size, 21 * size, 0, 0, TAU)
  g.ellipse(x + 44 * size, y - 5 * size, 24 * size, 13 * size, 0, 0, TAU)
  g.fill()
}

// ---------------------------------------------------------------------------
// Tools and small things that move

export function drawEgg(g: G, x: number, y: number, tint: RGB, rot = 0, scale = 1): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(scale, scale)
  g.fillStyle = css(tint)
  g.beginPath()
  g.moveTo(0, -22)
  g.bezierCurveTo(12, -22, 17, -4, 17, 5)
  g.bezierCurveTo(17, 16, 9, 21, 0, 21)
  g.bezierCurveTo(-9, 21, -17, 16, -17, 5)
  g.bezierCurveTo(-17, -4, -12, -22, 0, -22)
  g.fill()
  g.fillStyle = css(shade(tint, -0.25), 0.3)
  g.beginPath()
  g.ellipse(4, 9, 11, 9, 0.2, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(255,255,250,0.6)'
  g.beginPath()
  g.ellipse(-6, -8, 4.5, 7, 0.4, 0, TAU)
  g.fill()
  g.restore()
}

// Origin is the middle of the base. `held` lifts the rope handle taut.
export function drawBucket(g: G, x: number, y: number, tilt: number, fill: number, held: number, slosh: number): void {
  g.save()
  g.translate(x, y - 40)
  g.rotate(tilt)
  g.translate(0, 40)
  // Staves.
  g.fillStyle = css(C.woodLight)
  g.beginPath()
  g.moveTo(-42, -78)
  g.lineTo(42, -78)
  g.quadraticCurveTo(38, -30, 33, -2)
  g.quadraticCurveTo(0, 6, -33, -2)
  g.quadraticCurveTo(-38, -30, -42, -78)
  g.closePath()
  g.fill()
  g.strokeStyle = css(shade(C.woodLight, -0.3), 0.45)
  g.lineWidth = 1.4
  for (let i = -2; i <= 2; i++) {
    g.beginPath()
    g.moveTo(i * 15, -74)
    g.lineTo(i * 12, 0)
    g.stroke()
  }
  g.fillStyle = 'rgba(70,44,24,0.2)'
  g.beginPath()
  g.moveTo(14, -78)
  g.lineTo(42, -78)
  g.quadraticCurveTo(38, -30, 33, -2)
  g.lineTo(12, 2)
  g.closePath()
  g.fill()
  // Hoops.
  g.strokeStyle = css(C.band)
  g.lineWidth = 5.5
  g.beginPath()
  g.moveTo(-40, -58)
  g.quadraticCurveTo(0, -50, 40, -58)
  g.moveTo(-35, -18)
  g.quadraticCurveTo(0, -10, 35, -18)
  g.stroke()
  // The open top, and water in it.
  g.fillStyle = '#6a4e36'
  g.beginPath()
  g.ellipse(0, -78, 42, 11, 0, 0, TAU)
  g.fill()
  if (fill > 0.02) {
    const depth = 1 - fill
    g.save()
    g.beginPath()
    g.ellipse(0, -78, 40, 10, 0, 0, TAU)
    g.clip()
    g.translate(0, -78 + depth * 9)
    g.rotate(-tilt * 0.5 + slosh * 0.12)
    g.fillStyle = css(mix(C.water, [72, 110, 130], depth * 0.7))
    g.beginPath()
    g.ellipse(0, 0, 44 - depth * 10, 10 - depth * 3, 0, 0, TAU)
    g.fill()
    g.strokeStyle = css(C.waterLight, 0.7 - depth * 0.4)
    g.lineWidth = 2
    g.beginPath()
    g.ellipse(-8 + slosh * 6, -1, 16 - depth * 6, 3 - depth, 0, Math.PI * 1.05, Math.PI * 1.9)
    g.stroke()
    g.restore()
  }
  g.strokeStyle = css(shade(C.woodLight, 0.22))
  g.lineWidth = 4
  g.beginPath()
  g.ellipse(0, -78, 42, 11, 0, 0, TAU)
  g.stroke()
  // Rope handle: taut when carried, resting on the rim otherwise.
  g.strokeStyle = '#c8b089'
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(-41, -78)
  const apex = lerp(-58, -128, held)
  g.bezierCurveTo(-36, apex, 36, apex, 41, -78)
  g.stroke()
  g.strokeStyle = 'rgba(120,96,64,0.5)'
  g.lineWidth = 1
  g.stroke()
  g.restore()
}

// The bucket's pouring lip in world coordinates, for a tilt to the right.
export function bucketLip(x: number, y: number, tilt: number): Pt {
  const lx = 42
  const ly = -38
  return [x + lx * Math.cos(tilt) - ly * Math.sin(tilt), y - 40 + lx * Math.sin(tilt) + ly * Math.cos(tilt)]
}

// The scoop: handle toward the hand, bowl forward. `grain` is 0..1.
export function drawScoop(g: G, x: number, y: number, rot: number, grain: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.fillStyle = 'rgba(52,58,30,0.0)'
  // Handle.
  g.strokeStyle = css(C.woodDark)
  g.lineWidth = 13
  g.beginPath()
  g.moveTo(18, 0)
  g.lineTo(56, -4)
  g.stroke()
  g.strokeStyle = css(shade(C.wood, 0.1))
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(18, -1)
  g.lineTo(55, -5)
  g.stroke()
  // Bowl.
  g.fillStyle = css(shade(C.wood, -0.12))
  g.beginPath()
  g.moveTo(-40, -12)
  g.quadraticCurveTo(-48, 20, -18, 22)
  g.lineTo(12, 22)
  g.quadraticCurveTo(26, 20, 24, -12)
  g.closePath()
  g.fill()
  g.fillStyle = css(shade(C.woodLight, 0.05))
  g.beginPath()
  g.moveTo(-40, -12)
  g.quadraticCurveTo(-46, 14, -18, 16)
  g.lineTo(10, 16)
  g.quadraticCurveTo(22, 14, 24, -12)
  g.closePath()
  g.fill()
  // The open mouth.
  g.fillStyle = '#7a5a3c'
  g.beginPath()
  g.ellipse(-8, -12, 32, 7, 0, 0, TAU)
  g.fill()
  if (grain > 0.02) {
    const hg = 4 + grain * 15
    g.fillStyle = css(shade(C.grain, -0.12))
    g.beginPath()
    g.moveTo(-38, -12)
    g.quadraticCurveTo(-8, -12 - hg * 1.9, 22, -12)
    g.quadraticCurveTo(-8, -4, -38, -12)
    g.fill()
    g.fillStyle = css(shade(C.grain, 0.18))
    g.beginPath()
    g.ellipse(-12, -12 - hg * 0.55, 15 * grain + 4, hg * 0.32, -0.1, 0, TAU)
    g.fill()
    g.fillStyle = css(shade(C.grain, -0.3), 0.6)
    for (let i = 0; i < 7; i++) {
      const gx = -28 + ((i * 37) % 50)
      const gy = -13 - ((i * 13) % 5) * grain * 1.6
      g.beginPath()
      g.ellipse(gx, gy, 2, 1.3, i, 0, TAU)
      g.fill()
    }
  }
  g.strokeStyle = css(shade(C.woodLight, 0.2), 0.8)
  g.lineWidth = 2
  g.beginPath()
  g.ellipse(-8, -12, 32, 7, 0, 0.1, Math.PI - 0.1)
  g.stroke()
  g.restore()
}

export function drawBrush(g: G, x: number, y: number, rot: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  // Bristles peeping below the wooden back.
  g.strokeStyle = '#8a6c48'
  g.lineWidth = 2.2
  for (let i = -8; i <= 8; i++) {
    g.beginPath()
    g.moveTo(i * 4.4, 6)
    g.lineTo(i * 4.8 + (i % 2) * 1.2, 23 + (Math.abs(i) % 3))
    g.stroke()
  }
  g.strokeStyle = '#c9aa78'
  g.lineWidth = 1.2
  for (let i = -7; i <= 7; i += 2) {
    g.beginPath()
    g.moveTo(i * 4.4 + 2, 8)
    g.lineTo(i * 4.8 + 2, 22)
    g.stroke()
  }
  // Wooden back.
  g.fillStyle = css(shade(C.wood, -0.18))
  g.beginPath()
  g.ellipse(0, 2, 44, 17, 0, 0, TAU)
  g.fill()
  g.fillStyle = css(shade(C.woodLight, 0.08))
  g.beginPath()
  g.ellipse(0, -2, 43, 15, 0, 0, TAU)
  g.fill()
  g.strokeStyle = css(shade(C.wood, -0.2), 0.5)
  g.lineWidth = 1.2
  g.beginPath()
  g.ellipse(0, -2, 30, 8, 0, 0.3, Math.PI - 0.3)
  g.stroke()
  // Leather hand strap.
  g.strokeStyle = '#8f5a3c'
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(-26, -6)
  g.quadraticCurveTo(0, -24, 26, -6)
  g.stroke()
  g.strokeStyle = 'rgba(240,210,170,0.45)'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(-23, -9)
  g.quadraticCurveTo(0, -25, 23, -9)
  g.stroke()
  g.restore()
}

// The hay fork. The origin is the grip; the tines point along local -y.
export function drawFork(g: G, x: number, y: number, rot: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.strokeStyle = css(C.woodDark)
  g.lineWidth = 11
  g.beginPath()
  g.moveTo(0, 70)
  g.lineTo(0, -62)
  g.stroke()
  g.strokeStyle = css(shade(C.woodLight, 0.02))
  g.lineWidth = 7
  g.beginPath()
  g.moveTo(-1, 69)
  g.lineTo(-1, -62)
  g.stroke()
  // Iron ferrule and three tines.
  g.strokeStyle = css(C.band)
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(0, -58)
  g.lineTo(0, -70)
  g.stroke()
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(-20, -108)
  g.quadraticCurveTo(-22, -76, 0, -72)
  g.quadraticCurveTo(22, -76, 20, -108)
  g.moveTo(0, -72)
  g.lineTo(0, -112)
  g.stroke()
  g.restore()
}

// A slow warm glint: the material inviting, not a pointing hand.
export function drawGlint(g: G, x: number, y: number, radius: number, k: number): void {
  if (k <= 0.01) return
  const grad = g.createRadialGradient(x, y, 0, x, y, radius)
  grad.addColorStop(0, `rgba(255,248,214,${0.5 * k})`)
  grad.addColorStop(0.5, `rgba(255,240,190,${0.2 * k})`)
  grad.addColorStop(1, 'rgba(255,240,190,0)')
  g.fillStyle = grad
  g.beginPath()
  g.arc(x, y, radius, 0, TAU)
  g.fill()
}

export function drawStar(g: G, x: number, y: number, r: number, a: number): void {
  g.fillStyle = `rgba(255,246,214,${a})`
  g.beginPath()
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x, y, x + r, y)
  g.quadraticCurveTo(x, y, x, y + r)
  g.quadraticCurveTo(x, y, x - r, y)
  g.quadraticCurveTo(x, y, x, y - r)
  g.fill()
}
