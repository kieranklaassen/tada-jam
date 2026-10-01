// Everything in the picture, drawn the way a five-year-old would: the sky and
// the glade painted once and kept (with a dusk twin), the gnome-made parts,
// the gnomes themselves, and the mushroom, which is drawn live while it grows
// and kept as a sprite once the finger lifts.

import { TAU, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { INK, PAPER, box, dot, ink, makeCanvas, makeSprite, nightCopy, oval, paint, rng, scribble, stroke, thing, tone } from './kid.ts'
import type { G, Pt, Rand, Sprite } from './kid.ts'
import { FERNY, STREAM, SUNNY, TRAY, inWater, onTray, skyline, slotX } from './world.ts'
import type { CapKind } from './world.ts'

export const WOOD = '#c7803c'
export const WOOD_INK = '#7a4a26'
const SKIN = '#ffd9b0'

export const DOOR_COLORS = ['#3f8fe0', '#ffc531', '#4db85a', '#9a62d6', '#ff8a3a'] as const
export const HATS = ['#ee3d2c', '#ffb81f', '#3f8fe0', '#4db85a', '#9a62d6', '#ff7a2a', '#e8559a', '#2fb5b0', '#ee3d2c', '#3f8fe0'] as const
const COATS = ['#3f8fe0', '#4db85a', '#ff8a3a', '#9a62d6', '#ffc531', '#2fb5b0', '#4db85a', '#e8559a', '#ffc531', '#ff8a3a'] as const
export const CLOTH_COLORS = ['#ff5a4a', '#ffd23a', '#4aa3f0', '#ff8fc0', '#7bd06a'] as const

const CAP: Record<CapKind, string> = { red: '#ee3d2c', brown: '#b9713a', pale: '#f4d5ea' }
const SPOT: Record<CapKind, string> = { red: '#ffffff', brown: '#f3c682', pale: '#b98ad6' }

// ------------------------------------------------------------ the mushroom

export interface Shape {
  // Half the stem's width, its height, half the cap's width, the cap's height.
  sw: number
  stemH: number
  rx: number
  capH: number
}

// A short press is a small round one; a long press is tall with a wide cap.
export function shapeOf(grow: number): Shape {
  return { sw: lerp(17, 29, grow), stemH: lerp(38, 150, grow ** 1.15), rx: lerp(43, 108, grow), capH: lerp(42, 70, grow) }
}

const SPOTS: readonly Pt[] = [
  [-0.5, 0.38],
  [0.06, 0.62],
  [0.52, 0.4],
  [-0.2, 0.2],
  [0.3, 0.17],
  [-0.74, 0.13],
  [0.77, 0.14],
  [-0.27, 0.74],
]

// Origin at the middle of the foot of the stem, one unit to a pixel.
export function paintShroom(g: G, sh: Shape, kind: CapKind, seed: number, grow: number, night = 0): void {
  const r = rng(seed)
  const bw = sh.sw * 1.18
  for (let i = 0; i < 5; i++) {
    const x = lerp(-bw - 9, bw + 9, i / 4) + (r() * 2 - 1) * 3
    stroke(g, [[x, 4], [x + (r() * 2 - 1) * 5, -6 - r() * 6]], r, tone('#2e8b3c', night), 3, 0.5)
  }
  const stem: Pt[] = [
    [-bw, 2],
    [-bw * 1.04, -sh.stemH * 0.25],
    [-sh.sw * 0.9, -sh.stemH * 0.65],
    [-sh.sw * 0.86, -sh.stemH - 4],
    [sh.sw * 0.86, -sh.stemH - 4],
    [sh.sw * 0.9, -sh.stemH * 0.65],
    [bw * 1.04, -sh.stemH * 0.25],
    [bw, 2],
    [0, 5],
  ]
  thing(g, stem, tone('#fffdf6', night), r, 4.5, 2.5, tone(INK, night))
  const yb = -sh.stemH
  const cap: Pt[] = [...oval(0, yb, sh.rx, sh.capH, 11, Math.PI, TAU), [sh.rx * 0.62, yb + 8], [0, yb + 10], [-sh.rx * 0.62, yb + 8]]
  thing(g, cap, tone(CAP[kind], night), r, 4.5, 3.5, tone(INK, night))
  const n = Math.min(SPOTS.length, 3 + Math.floor(grow * 5.5))
  for (let i = 0; i < n; i++) {
    const s = SPOTS[i]!
    const rad = (5 + 6 * grow) * (0.8 + r() * 0.4)
    dot(g, s[0] * sh.rx * 0.9, yb - s[1] * sh.capH * 0.94, rad, tone(SPOT[kind], night), r, tone(INK, night), 2.5)
  }
}

export function bakeShroom(sh: Shape, kind: CapKind, seed: number, grow: number, scale: number): Sprite {
  const w = sh.rx * 2 + 56
  const h = sh.stemH + sh.capH + 48
  return makeSprite(w, h, w / 2, h - 20, scale, (g) => paintShroom(g, sh, kind, seed, grow))
}

// ------------------------------------------------------------ gnome-made parts

function doorPts(): Pt[] {
  return [[-15, 0], [-15, 0], [-15.5, -26], ...oval(0, -27, 15, 17, 7, Math.PI, TAU), [15.5, -26], [15, 0], [15, 0], [0, 1]]
}

function paintDoor(g: G, r: Rand, color: string): void {
  thing(g, doorPts(), color, r, 3.5, 2)
  g.globalAlpha = 0.35
  stroke(g, [[-5, -4], [-5, -24]], r, INK, 2, 0.6)
  stroke(g, [[5, -4], [5, -24]], r, INK, 2, 0.6)
  g.globalAlpha = 1
  dot(g, 0, -31, 5.5, '#bfe6ff', r, INK, 2)
  dot(g, 9, -15, 2.3, INK, r, null)
}

function paintWindow(g: G, r: Rand, round: boolean, lit: boolean): void {
  const glass = lit ? '#ffe14a' : '#bfe6ff'
  if (round) {
    dot(g, 0, 0, 13, WOOD, r, INK, 3)
    dot(g, 0, 0, 8.5, glass, r, INK, 2)
  } else {
    thing(g, box(-12.5, -12.5, 25, 25), WOOD, r, 3, 1.5)
    thing(g, box(-8, -8, 16, 16), glass, r, 2, 1)
  }
  stroke(g, [[0, -8], [0, 8]], r, INK, 2, 0.5)
  stroke(g, [[-8, 0], [8, 0]], r, INK, 2, 0.5)
}

function paintChimney(g: G, r: Rand): void {
  thing(g, box(-9, -34, 18, 38), '#f0703c', r, 3.5, 2)
  g.globalAlpha = 0.55
  stroke(g, [[-8, -12], [8, -12]], r, INK, 2, 0.5)
  stroke(g, [[-8, -23], [8, -23]], r, INK, 2, 0.5)
  stroke(g, [[0, -12], [0, -23]], r, INK, 2, 0.5)
  g.globalAlpha = 1
  thing(g, box(-13, -41, 26, 9), '#d2502c', r, 3.5, 1.5)
}

// Origin where the floor meets the stem; the balcony reaches out to +x.
function paintBalcony(g: G, r: Rand): void {
  stroke(g, [[5, 6], [-1, 22]], r, WOOD_INK, 3.5, 0.6)
  thing(g, box(-3, 0, 46, 7), WOOD, r, 3, 1.5)
  for (const x of [5, 17, 29, 41]) stroke(g, [[x, 0], [x + (r() * 2 - 1), -18]], r, WOOD_INK, 3.2, 0.5)
  stroke(g, [[-1, -18], [21, -19], [44, -18]], r, WOOD_INK, 4, 0.7)
}

// Origin at the hook it hangs from.
function paintLantern(g: G, r: Rand, lit: boolean): void {
  stroke(g, [[0, 0], [0, 9]], r, INK, 2.5, 0.4)
  thing(g, box(-7, 13, 14, 17), lit ? '#ffdc3a' : '#fff6c9', r, 2.8, 1.2)
  thing(g, [[-10, 13], [-10, 13], [0, 6], [0, 6], [10, 13], [10, 13]], '#ee3d2c', r, 2.8, 1.2)
  stroke(g, [[-8, 31], [8, 31]], r, INK, 3.2, 0.4)
}

function paintPole(g: G, r: Rand): void {
  stroke(g, [[0, 2], [1, -40], [0, -78]], r, WOOD_INK, 5.5, 0.8)
  stroke(g, [[0, -70], [-7, -84]], r, WOOD_INK, 4, 0.5)
  stroke(g, [[0, -70], [7, -85]], r, WOOD_INK, 4, 0.5)
}

const CLOTH_SHAPES: readonly Pt[][] = [
  // A shirt, a kerchief, trousers, a sock, a little dress.
  [[-8, 0], [8, 0], [15, 6], [11, 11], [8, 8], [8, 21], [-8, 21], [-8, 8], [-11, 11], [-15, 6]],
  [[-8, 0], [-8, 0], [8, 0], [8, 0], [8, 16], [8, 16], [-8, 16], [-8, 16]],
  [[-8, 0], [8, 0], [10, 23], [2, 23], [0, 9], [-2, 23], [-10, 23]],
  [[-4, 0], [4, 0], [4, 12], [11, 15], [10, 21], [-4, 20]],
  [[-5, 0], [5, 0], [6, 7], [13, 22], [-13, 22], [-6, 7]],
]

function paintCloth(g: G, r: Rand, shape: number, color: string): void {
  thing(g, CLOTH_SHAPES[shape % CLOTH_SHAPES.length]!, color, r, 2.5, 1.5)
}

// Two rails and their rungs in one stroke, from the foot to the top.
export function ladderPath(g: G, x0: number, y0: number, x1: number, y1: number, half: number, r: Rand): void {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1
  const nx = (-(y1 - y0) / len) * half
  const ny = ((x1 - x0) / len) * half
  const j = () => (r() * 2 - 1) * 0.9
  g.beginPath()
  g.moveTo(x0 + nx + j(), y0 + ny + j())
  g.lineTo(x1 + nx + j(), y1 + ny + j())
  g.moveTo(x0 - nx + j(), y0 - ny + j())
  g.lineTo(x1 - nx + j(), y1 - ny + j())
  const rungs = Math.max(2, Math.round(len / 13))
  for (let i = 0; i < rungs; i++) {
    const t = (i + 0.6) / rungs
    const x = lerp(x0, x1, t)
    const y = lerp(y0, y1, t)
    g.moveTo(x + nx + j(), y + ny + j())
    g.lineTo(x - nx + j(), y - ny + j())
  }
}

// ------------------------------------------------------------ the folk

// Origin between the boots. Legs and arms are drawn live so they can walk,
// sweep and reach; this is the coat, the beard and the pointed hat.
function paintGnome(g: G, r: Rand, hat: string, coat: string, beard: boolean): void {
  thing(g, [[-13, -8], [-13.5, -9], [-8, -35], [8, -35], [13.5, -9], [13, -8], [0, -6]], coat, r, 3, 2)
  dot(g, 0.5, -17, 1.6, INK, r, null)
  dot(g, 0, -25, 1.6, INK, r, null)
  thing(g, oval(0, -43, 10.5, 10, 10), SKIN, r, 3, 1.5)
  if (beard) thing(g, [[-10, -42], [-7.5, -30], [0, -21], [7.5, -30], [10, -42], [4, -38.5], [0, -37.5], [-4, -38.5]], '#ffffff', r, 2.6, 1)
  else stroke(g, [[-3.5, -38], [0, -36.5], [3.5, -38]], r, INK, 1.8, 0.2)
  dot(g, -3.7, -45.5, 1.5, INK, r, null)
  dot(g, 3.9, -45.5, 1.5, INK, r, null)
  dot(g, 0.3, -41.5, 2.3, '#ff8f7a', r, null)
  thing(g, [[-13.5, -50], [-13, -50.5], [-5, -69], [2.5, -89], [3, -89], [7, -67], [13, -50.5], [13.5, -50], [0, -48.5]], hat, r, 3, 2)
}

function paintBundle(g: G, r: Rand, color: string): void {
  dot(g, 0, 0, 9.5, color, r, INK, 2.8)
  dot(g, -3, -2, 1.6, '#ffffff', r, null)
  dot(g, 3.5, 2, 1.6, '#ffffff', r, null)
  dot(g, 2, -4.5, 1.4, '#ffffff', r, null)
  stroke(g, [[-3, -8], [0, -12], [4, -8]], r, INK, 2.4, 0.4)
}

function paintSnail(g: G, r: Rand): void {
  const body: Pt[] = [[-32, 0], [-36, -5], [-22, -9], [4, -9], [18, -12], [22, -27], [30, -29], [33, -12], [37, -2], [34, 1]]
  thing(g, body, '#ffe07a', r, 3.2, 2)
  stroke(g, [[26, -27], [23, -40]], r, INK, 2.6, 0.4)
  stroke(g, [[30, -28], [33, -41]], r, INK, 2.6, 0.4)
  dot(g, 23, -41, 2.4, INK, r, null)
  dot(g, 33, -42, 2.4, INK, r, null)
  dot(g, 30.5, -17, 1.4, INK, r, null)
  thing(g, oval(-6, -24, 20, 19, 11), '#ff9a4a', r, 3.2, 2.5)
  const spiral: Pt[] = []
  for (let i = 0; i < 16; i++) {
    const a = i * 0.72 + 0.4
    const rad = 14 - i * 0.82
    spiral.push([-6 + Math.cos(a) * rad, -24 + Math.sin(a) * rad * 0.95])
  }
  stroke(g, spiral, r, '#a84a1c', 2.8, 0.5)
  // The little crook its lamp hangs from.
  stroke(g, [[-2, -42], [3, -58], [14, -62]], r, WOOD_INK, 3, 0.5)
}

function paintFern(g: G, r: Rand): void {
  const greens = ['#2f9a4a', '#49b24c', '#23803f']
  for (let f = 0; f < 6; f++) {
    const lean = lerp(-1, 1, f / 5) + (r() * 2 - 1) * 0.12
    const len = 92 + r() * 34 - Math.abs(lean) * 16
    const color = greens[f % 3]!
    const stalk: Pt[] = []
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      stalk.push([lean * 74 * t * (0.5 + t * 0.6), -len * t * (1 - Math.abs(lean) * 0.35 * t)])
    }
    stroke(g, stalk, r, color, 4, 0.8)
    for (let i = 1; i < 8; i++) {
      const p = stalk[i]!
      const q = stalk[i + 1]!
      const dx = q[0] - p[0]
      const dy = q[1] - p[1]
      const d = Math.hypot(dx, dy) || 1
      const leaf = 17 * (1 - i / 9)
      for (const side of [-1, 1]) {
        const ex = p[0] + (-dy / d) * leaf * side + (dx / d) * leaf * 0.5
        const ey = p[1] + (dx / d) * leaf * side + (dy / d) * leaf * 0.5
        stroke(g, [[p[0], p[1]], [ex, ey]], r, color, 5, 0.8)
      }
    }
  }
}

// ------------------------------------------------------------ small ground things

const PEBBLES = ['#cfcddc', '#ebe2cf', '#aeacc0', '#e0bda0', '#f4f1ea'] as const

export function paintPebble(g: G, x: number, y: number, size: number, seed: number, night: number): void {
  const r = rng(seed)
  const rad = (7.5 + r() * 3) * size
  const pts = oval(x, y, rad, rad * 0.72, 8)
  paint(g, pts, tone(PEBBLES[Math.floor(r() * PEBBLES.length)]!, night), r, 1.2)
  ink(g, pts, r, tone(INK, night), 2.6, 0.7)
}

// A stepping stone: bigger, flatter, with the water drawn round it.
export function paintStone(g: G, x: number, y: number, size: number, seed: number, night: number): void {
  const r = rng(seed)
  const rx = (16 + r() * 4) * size
  const ry = rx * 0.56
  stroke(g, oval(x, y + ry * 0.55, rx * 1.3, ry * 0.9, 7, 0.15, Math.PI - 0.15), r, tone('#ffffff', night), 3, 0.8)
  const pts = oval(x, y, rx, ry, 9)
  paint(g, pts, tone(r() < 0.5 ? '#cfcddc' : '#b9b7ca', night), r, 1.5)
  ink(g, pts, r, tone(INK, night), 3, 0.8)
}

const PETALS = ['#ff5a4a', '#ff8fc0', '#ffffff', '#b98ad6', '#ffb81f'] as const

export function paintFlower(g: G, x: number, y: number, size: number, seed: number, night: number): void {
  const r = rng(seed)
  const h = (13 + r() * 8) * size
  stroke(g, [[x, y], [x + (r() * 2 - 1) * 3, y - h]], r, tone('#2e8b3c', night), 3, 0.5)
  const color = tone(PETALS[Math.floor(r() * PETALS.length)]!, night)
  const a0 = r() * TAU
  for (let i = 0; i < 5; i++) {
    const a = a0 + (i / 5) * TAU
    dot(g, x + Math.cos(a) * 5 * size, y - h + Math.sin(a) * 5 * size, 3.6 * size, color, r, null)
  }
  dot(g, x, y - h, 3 * size, tone('#ffd23a', night), r, tone(INK, night), 1.6)
}

function tuft(g: G, r: Rand, x: number, y: number): void {
  for (let i = -1; i <= 1; i++) stroke(g, [[x + i * 4, y], [x + i * 7 + (r() * 2 - 1) * 2, y - 9 - r() * 6]], r, '#2e8b3c', 3, 0.4)
}

// ------------------------------------------------------------ the sky

function paintSky(g: G, r: Rand, night: boolean): void {
  g.fillStyle = night ? tone(PAPER, 1) : PAPER
  g.fillRect(0, 0, W, 350)
  for (let y = 18; y < 336; y += 27) {
    const t = y / 336
    let colors: readonly string[]
    if (!night) colors = ['#a9def5', '#9cd6f1', '#b6e4f7']
    else if (t < 0.48) colors = ['#262a78', '#2c3186', '#232770']
    else if (t < 0.7) colors = ['#4a3f96', '#5c4aa0']
    else if (t < 0.84) colors = ['#b05c9c', '#c66a9a']
    else colors = ['#f58e6a', '#ffa86a']
    const breakAt = r() < 0.4 ? 0.25 + r() * 0.5 : -1
    const x0 = 8 + r() * 22
    const x1 = W - 8 - r() * 22
    const runs: [number, number][] = breakAt < 0 ? [[x0, x1]] : [[x0, lerp(x0, x1, breakAt) - 12], [lerp(x0, x1, breakAt) + 14, x1]]
    for (const [a, b] of runs) {
      const pts: Pt[] = []
      for (let i = 0; i <= 7; i++) pts.push([lerp(a, b, i / 7), y + (r() * 2 - 1) * 4])
      g.globalAlpha = 0.93
      stroke(g, pts, r, colors[Math.floor(r() * colors.length)]!, 30 + r() * 5, 0)
    }
  }
  g.globalAlpha = 1
  if (night) {
    for (let i = 0; i < 30; i++) {
      const x = 300 + r() * 720
      const y = 14 + r() * 170
      const s = 3 + r() * 3
      dot(g, x, y, s, '#ffe66a', r, null)
      stroke(g, [[x - s * 2, y], [x + s * 2, y]], r, '#ffe66a', 2.4, 0.4)
      stroke(g, [[x, y - s * 2], [x, y + s * 2]], r, '#ffe66a', 2.4, 0.4)
    }
    const moon: Pt[] = [...oval(610, 78, 34, 34, 9, 0.9, TAU - 0.9), ...oval(628, 78, 26, 28, 6, TAU - 1.25, 1.25)]
    thing(g, moon, '#ffec80', r, 4, 2.5, '#e6a21e')
  } else {
    for (const [cx, cy, rx, ry] of [[505, 66, 72, 25], [748, 132, 52, 20], [370, 150, 40, 16]] as const) {
      const pts: Pt[] = []
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU
        const k = i % 2 ? 1.14 : 0.9
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
      }
      thing(g, pts, '#ffffff', r, 4, 3, '#5aa6de')
    }
  }
}

// ------------------------------------------------------------ the glade

function crown(cx: number, cy: number, rx: number, ry: number, n = 12): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const k = i % 2 ? 1.1 : 0.93
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return pts
}

function lollipop(g: G, r: Rand, x: number, trunkH: number, rad: number, green: string, dark: string): void {
  const base = skyline(x) + 14
  const tw = rad * 0.42
  thing(g, box(x - tw / 2, base - trunkH, tw, trunkH + 4), '#a8683a', r, 4.5, 3)
  const top = crown(x, base - trunkH - rad * 0.62, rad, rad * 0.95)
  paint(g, top, green, r, 5)
  scribble(g, top, dark, r, { angle: -0.9, gap: 15, width: 6, alpha: 0.4, over: 3 })
  ink(g, top, r, INK, 4.5, 2)
}

function fir(g: G, r: Rand, x: number, h: number, w: number): void {
  const base = skyline(x) + 14
  thing(g, box(x - 7, base - 20, 14, 24), '#a8683a', r, 4, 2)
  for (let i = 0; i < 3; i++) {
    const by = base - 16 - i * h * 0.26
    const hw = w * (1 - i * 0.22)
    const th = h * 0.44
    thing(g, [[-hw + x, by], [-hw + x, by], [x, by - th], [x, by - th], [hw + x, by], [hw + x, by], [x, by + 3]], '#2f9460', r, 4.5, 3)
  }
}

function patchPts(r: Rand, x: number, y: number, rx: number, ry: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU
    const k = 0.92 + r() * 0.16
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k])
  }
  return pts
}

function streaks(g: G, r: Rand, pts: Pt[], colors: readonly string[], step: number, width: number, alpha: number): void {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const p of pts) {
    x0 = Math.min(x0, p[0])
    x1 = Math.max(x1, p[0])
    y0 = Math.min(y0, p[1])
    y1 = Math.max(y1, p[1])
  }
  g.save()
  g.beginPath()
  g.moveTo(pts[0]![0], pts[0]![1])
  for (const p of pts) g.lineTo(p[0], p[1])
  g.closePath()
  g.clip()
  g.globalAlpha = alpha
  for (let y = y0 + step * 0.4; y < y1; y += step * (0.8 + r() * 0.4)) {
    const a = lerp(x0, x1, r() * 0.3)
    const b = lerp(x0, x1, 0.7 + r() * 0.3)
    const line: Pt[] = []
    for (let i = 0; i <= 6; i++) line.push([lerp(a, b, i / 6), y + (r() * 2 - 1) * 5])
    stroke(g, line, r, colors[Math.floor(r() * colors.length)]!, width * (0.7 + r() * 0.6), 0)
  }
  g.restore()
}

function paintGlade(g: G, r: Rand): void {
  // The green, with the paper left showing round the edge of the page.
  const ground: Pt[] = []
  for (let x = 7; x <= W - 7; x += 39) ground.push([x, skyline(x) + (r() * 2 - 1) * 2])
  ground.push([W - 7, skyline(W - 7)], [W - 8, H - 9], [W - 8, H - 9], [W / 2, H - 7], [9, H - 8], [9, H - 8])
  g.beginPath()
  g.moveTo(0, skyline(0) + 4)
  for (let x = 0; x <= W; x += 20) g.lineTo(x, skyline(x) + 4)
  g.lineTo(W, H)
  g.lineTo(0, H)
  g.closePath()
  g.fillStyle = PAPER
  g.fill()
  paint(g, ground, '#7fc650', r, 3)
  streaks(g, r, ground, ['#8bd15a', '#75bb49', '#86cc55', '#93d862'], 23, 22, 0.55)

  // Shade under the trees, and the places the sun reaches.
  for (const [x, y, rx, ry] of [[205, 462, 222, 74], [520, 322, 250, 30], [1105, 330, 120, 44], [590, 620, 130, 50]] as const) {
    const pts = patchPts(r, x, y, rx, ry)
    paint(g, pts, '#5fae4e', r, 5)
    streaks(g, r, pts, ['#57a548', '#66b653'], 19, 16, 0.5)
  }
  for (const p of SUNNY) {
    const pts = patchPts(r, p.x, p.y, p.rx, p.ry)
    paint(g, pts, '#c6e459', r, 6)
    streaks(g, r, pts, ['#d6ee6c', '#bbdc50', '#cfe862'], 21, 18, 0.6)
  }
  for (const p of FERNY) {
    const pts = patchPts(r, p.x, p.y, p.rx * 0.9, p.ry * 0.86)
    paint(g, pts, '#4f9f58', r, 5)
  }

  // The stream.
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 1; i < STREAM.length; i += 2) {
    const s = STREAM[i]!
    left.push([s.x - s.ty * s.hw, s.y + s.tx * s.hw])
    right.push([s.x + s.ty * s.hw, s.y - s.tx * s.hw])
  }
  const water: Pt[] = [...left, ...right.slice().reverse()]
  g.beginPath()
  g.moveTo(water[0]![0], water[0]![1])
  for (const p of water) g.lineTo(p[0] + (r() * 2 - 1) * 2.5, p[1] + (r() * 2 - 1) * 2.5)
  g.closePath()
  g.fillStyle = '#58b7ee'
  g.fill()
  streaks(g, r, water, ['#74c8f4', '#49a8e4'], 26, 15, 0.5)
  stroke(g, left, r, '#2459b0', 5, 2.2)
  stroke(g, right, r, '#2459b0', 5, 2.2)
  for (let i = 0; i < 9; i++) {
    const s = STREAM[4 + Math.floor(r() * 46)]!
    const side = r() < 0.5 ? -1 : 1
    const x = s.x + s.ty * (s.hw + 9) * side
    const y = s.y - s.tx * (s.hw + 9) * side
    if (onTray(x, y, 10)) continue
    const pts = oval(x, y, 9 + r() * 6, 6 + r() * 3, 8)
    thing(g, pts, r() < 0.5 ? '#cfcddc' : '#b9b7ca', r, 3, 1.5)
  }

  // Grass and flowers.
  for (let i = 0; i < 120; i++) {
    const x = 20 + r() * (W - 40)
    const y = 330 + r() * 470
    if (y < skyline(x) + 26 || inWater(x, y) || onTray(x, y, 14)) continue
    tuft(g, r, x, y)
  }
  for (let i = 0; i < 34; i++) {
    const x = 24 + r() * (W - 48)
    const y = 345 + r() * 440
    if (inWater(x, y) || onTray(x, y, 18)) continue
    paintFlower(g, x, y, 0.95, 100 + i * 7, 0)
  }

  // The trees at the back, and a bush where the stream comes out of them.
  lollipop(g, r, 292, 78, 52, '#49b24c', '#2f9a4a')
  fir(g, r, 372, 150, 46)
  lollipop(g, r, 455, 92, 58, '#3fa34d', '#2a8a45')
  fir(g, r, 548, 120, 40)
  lollipop(g, r, 622, 70, 48, '#5cbf4f', '#3fa34d')
  fir(g, r, 782, 132, 42)
  lollipop(g, r, 1082, 116, 80, '#3fa34d', '#2a8a45')
  fir(g, r, 1152, 110, 34)
  for (const [x, rx, ry] of [[700, 46, 26], [228, 34, 20], [850, 30, 16], [1010, 34, 18]] as const) {
    const y = skyline(x) + 4
    const pts = crown(x, y, rx, ry, 10)
    paint(g, pts, '#2f9460', r, 3)
    ink(g, pts, r, INK, 4, 1.5)
  }

  // The big tree the left-bank gnomes wait under.
  const trunk: Pt[] = [[30, 486], [70, 440], [84, 300], [80, 120], [80, 120], [192, 120], [192, 120], [188, 300], [202, 440], [244, 484], [186, 466], [142, 486], [98, 468]]
  thing(g, trunk, '#b46f3c', r, 5, 4)
  g.globalAlpha = 0.5
  stroke(g, [[112, 160], [108, 300], [116, 430]], r, WOOD_INK, 3.5, 2)
  stroke(g, [[160, 170], [164, 290], [158, 400]], r, WOOD_INK, 3.5, 2)
  g.globalAlpha = 1
  const knot: Pt[] = []
  for (let i = 0; i < 14; i++) {
    const a = i * 0.8
    knot.push([136 + Math.cos(a) * (15 - i), 336 + Math.sin(a) * (19 - i * 1.2)])
  }
  stroke(g, knot, r, WOOD_INK, 3.5, 0.8)
  const big = crown(128, 58, 250, 150, 16)
  paint(g, big, '#3fa34d', r, 6)
  scribble(g, big, '#2a8a45', r, { angle: -0.7, gap: 22, width: 8, alpha: 0.45, over: 5 })
  ink(g, big, r, INK, 5, 2.5)

  // A few wild ones at the edge of the wood, to say what grows here.
  for (const [x, y, s] of [[404, 334, 1], [596, 338, 0.8], [1012, 330, 0.9]] as const) {
    thing(g, box(x - 4 * s, y - 12 * s, 8 * s, 14 * s), '#fffdf6', r, 2.6, 1)
    thing(g, [...oval(x, y - 11 * s, 13 * s, 12 * s, 7, Math.PI, TAU), [x, y - 9 * s]], '#ee3d2c', r, 2.8, 1.5)
  }

  // The tray the gnomes made their parts for.
  thing(g, box(TRAY.x, TRAY.y, TRAY.w, TRAY.h), '#cf9150', r, 5, 3, WOOD_INK)
  const well = box(TRAY.x + 12, TRAY.y + 11, TRAY.w - 24, TRAY.h - 22)
  paint(g, well, '#e6b877', r, 2)
  streaks(g, r, well, ['#dba968', '#efc686'], 15, 7, 0.6)
  for (let i = 1; i < 7; i++) {
    const x = (slotX(i - 1) + slotX(i)) / 2
    g.globalAlpha = 0.45
    stroke(g, [[x, TRAY.y + 16], [x + (r() * 2 - 1) * 2, TRAY.y + TRAY.h - 16]], r, WOOD_INK, 3, 1)
    g.globalAlpha = 1
  }
}

// ------------------------------------------------------------ everything

export interface Art {
  scale: number
  skyDay: HTMLCanvasElement
  skyNight: HTMLCanvasElement
  // The glade and its dusk twin, kept open so pebbles can be painted in.
  glade: HTMLCanvasElement
  gladeNight: HTMLCanvasElement
  gladeG: G
  gladeNightG: G
  sun: Sprite
  glow: HTMLCanvasElement
  doors: Sprite[]
  doorway: Sprite
  // [round, square] by [dark, lit].
  windows: [Sprite, Sprite][]
  chimney: Sprite
  balcony: Sprite
  lantern: [Sprite, Sprite]
  pole: Sprite
  ladderIcon: Sprite
  lineIcon: Sprite
  cloths: Sprite[]
  // Two drawings of each gnome, swapped slowly so the line breathes.
  gnomes: [Sprite, Sprite][]
  bundles: Sprite[]
  snail: Sprite
  ferns: Sprite[]
  bud: Sprite
}

export function buildArt(seed: number, scale: number): Art {
  const r = rng(seed)
  const [skyDay, sd] = makeCanvas(W, 350, scale)
  paintSky(sd, r, false)
  const [skyNight, sn] = makeCanvas(W, 350, scale)
  paintSky(sn, rng(seed + 5), true)

  const [glade, gladeG] = makeCanvas(W, H, scale)
  paintGlade(gladeG, r)
  const gladeNight = nightCopy(glade)
  const gladeNightG = gladeNight.getContext('2d')
  if (!gladeNightG) throw new Error('no 2d context')
  gladeNightG.scale(scale, scale)
  gladeNightG.lineCap = 'round'
  gladeNightG.lineJoin = 'round'

  const ps = scale * 1.3
  const sun = makeSprite(200, 200, 100, 100, scale, (g) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.1
      const long = i % 2 ? 84 : 76
      stroke(g, [[Math.cos(a) * 61, Math.sin(a) * 61], [Math.cos(a) * long, Math.sin(a) * long]], r, '#ff9c2a', 7, 1.5)
    }
    const disc = oval(0, 0, 50, 50, 14)
    paint(g, disc, '#ffd83a', r, 3)
    ink(g, disc, r, '#f08a1c', 5, 1.5)
    dot(g, -27, 12, 6.5, '#ffb48a', r, null)
    dot(g, 27, 12, 6.5, '#ffb48a', r, null)
  }, false)

  const [glow, gg] = makeCanvas(128, 128, 1)
  const grad = gg.createRadialGradient(64, 64, 2, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,224,130,0.62)')
  grad.addColorStop(0.35, 'rgba(255,196,90,0.28)')
  grad.addColorStop(1, 'rgba(255,170,60,0)')
  gg.fillStyle = grad
  gg.fillRect(0, 0, 128, 128)

  const doors = DOOR_COLORS.map((c) => makeSprite(46, 58, 23, 52, ps, (g) => paintDoor(g, r, c)))
  const doorway = makeSprite(46, 58, 23, 52, ps, (g) => {
    const pts = doorPts()
    g.beginPath()
    g.moveTo(pts[0]![0], pts[0]![1])
    for (const p of pts) g.lineTo(p[0], p[1])
    g.closePath()
    g.fillStyle = '#4a2a22'
    g.fill()
  })
  const win = (round: boolean, lit: boolean) => makeSprite(38, 38, 19, 19, ps, (g) => paintWindow(g, r, round, lit), !lit)
  const windows: [Sprite, Sprite][] = [
    [win(true, false), win(true, true)],
    [win(false, false), win(false, true)],
  ]
  const chimney = makeSprite(42, 60, 21, 50, ps, (g) => paintChimney(g, r))
  const balcony = makeSprite(66, 56, 10, 28, ps, (g) => paintBalcony(g, r))
  const lantern: [Sprite, Sprite] = [makeSprite(32, 42, 16, 5, ps, (g) => paintLantern(g, r, false)), makeSprite(32, 42, 16, 5, ps, (g) => paintLantern(g, r, true), false)]
  const pole = makeSprite(26, 96, 13, 90, ps, (g) => paintPole(g, r))
  const ladderIcon = makeSprite(50, 80, 25, 40, ps, (g) => {
    ladderPath(g, -9, 34, 9, -34, 9, r)
    g.strokeStyle = WOOD_INK
    g.lineWidth = 4
    g.stroke()
  })
  const cloths = CLOTH_COLORS.map((c, i) => makeSprite(40, 34, 20, 5, ps, (g) => paintCloth(g, r, i, c)))
  const lineIcon = makeSprite(84, 64, 42, 32, ps, (g) => {
    stroke(g, [[-32, 26], [-33, -22]], r, WOOD_INK, 4.5, 0.6)
    stroke(g, [[32, 26], [33, -22]], r, WOOD_INK, 4.5, 0.6)
    stroke(g, [[-33, -18], [0, -11], [33, -18]], r, INK, 2.4, 0.5)
    g.save()
    g.translate(-13, -14)
    paintCloth(g, r, 0, CLOTH_COLORS[0])
    g.translate(27, 0)
    paintCloth(g, r, 3, CLOTH_COLORS[1])
    g.restore()
  })

  const gnomes: [Sprite, Sprite][] = []
  const bundles: Sprite[] = []
  for (let i = 0; i < HATS.length; i++) {
    const beard = i % 3 !== 2
    const draw = (k: number) => makeSprite(50, 102, 25, 96, ps, (g) => paintGnome(g, rng(seed + 31 * i + k * 977), HATS[i]!, COATS[i]!, beard))
    gnomes.push([draw(1), draw(2)])
    bundles.push(makeSprite(28, 30, 14, 16, ps, (g) => paintBundle(g, r, DOOR_COLORS[(i + 2) % DOOR_COLORS.length]!)))
  }
  const snail = makeSprite(92, 76, 44, 68, ps, (g) => paintSnail(g, r))
  const ferns = [0, 1, 2].map(() => makeSprite(210, 156, 105, 148, scale, (g) => paintFern(g, r)))
  const bud = makeSprite(40, 34, 20, 28, ps, (g) => {
    thing(g, box(-4, -9, 8, 11), '#fffdf6', r, 2.6, 1)
    thing(g, [...oval(0, -9, 12, 11, 7, Math.PI, TAU), [0, -7]], '#ee3d2c', r, 2.8, 1.5)
  })

  return { scale, skyDay, skyNight, glade, gladeNight, gladeG, gladeNightG, sun, glow, doors, doorway, windows, chimney, balcony, lantern, pole, ladderIcon, lineIcon, cloths, gnomes, bundles, snail, ferns, bud }
}
