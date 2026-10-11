import { CARDS, type CardId } from './sprites'
import { STAGE } from './stage'
import { BUSHES, DOOR, FLOOR, ROWS } from './yard'

// The printed sheets of the toy theatre. Every card is painted once, in stage
// units, as a hand-coloured engraving: a flat tint laid a little off its
// line, a sepia outline, and ruled hatching for shade. Nothing here moves and
// nothing here is drawn each frame (render.ts stamps what this paints).
// No letter, numeral or sign is drawn anywhere: the clock's face is plain, with two hands.

type C = CanvasRenderingContext2D

export const INK = '#3b2b20'
export const PAPER = '#f4ecd8'
const TINT = {
  sky: '#cfe4e2', far: '#c9dab7', hill: '#a9c68e', grass: '#bcd28c', path: '#e3d6a2', wood: '#c9a36b', darkWood: '#8a6a45',
  barn: '#b9563d', roof: '#6f5c4c', straw: '#e6c765', crimson: '#a62a32', crimsonDark: '#7d1d27', gold: '#dba945',
  water: '#8cc0cc', leaf: '#6f9e52', leafLight: '#93bd68', white: '#fbf7ea', orange: '#ea8c2c', grey: '#989aa2', mask: '#46424c',
  cream: '#f1e3c2', tan: '#cf9a62', brown: '#8d5c3a', blue: '#6f8fb0', red: '#d2503f', skin: '#edc39b', frog: '#74b05a', black: '#2c2b33',
  teal: '#4fa39a', potato: '#c89b60', pink: '#e89a9a',
} as const

// --- The engraver's few moves -----------------------------------------------

const oval = (c: C, x: number, y: number, rx: number, ry: number, turn = 0): void => { c.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2) }
const poly = (c: C, points: readonly number[], close = true): void => {
  c.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1])
  if (close) c.closePath()
}
/** A closed soft shape through the points. */
const blob = (c: C, p: readonly number[]): void => {
  const n = p.length / 2
  const mid = (i: number): [number, number] => [(p[(i % n) * 2] + p[((i + 1) % n) * 2]) / 2, (p[(i % n) * 2 + 1] + p[((i + 1) % n) * 2 + 1]) / 2]
  const [sx, sy] = mid(n - 1)
  c.moveTo(sx, sy)
  for (let i = 0; i < n; i++) { const [mx, my] = mid(i); c.quadraticCurveTo(p[i * 2], p[i * 2 + 1], mx, my) }
  c.closePath()
}

/** A tinted shape: the colour laid a little off the line, as a hand-coloured print is, and then the line. */
function tint(c: C, colour: string | null, shape: () => void, line = 2.2): void {
  if (colour) {
    c.save()
    c.translate(1.3, 0.9)
    c.beginPath()
    shape()
    c.fillStyle = colour
    c.fill()
    c.restore()
  }
  if (line > 0) {
    c.beginPath()
    shape()
    c.lineWidth = line
    c.lineJoin = 'round'
    c.lineCap = 'round'
    c.strokeStyle = INK
    c.stroke()
  }
}

/** An open ink line. */
function stroke(c: C, points: readonly number[], line = 2, colour: string = INK): void {
  c.beginPath()
  poly(c, points, false)
  c.lineWidth = line
  c.lineJoin = 'round'
  c.lineCap = 'round'
  c.strokeStyle = colour
  c.stroke()
}

/** Ruled shading inside a shape: fine parallel lines, as an engraver lays a tone. */
function hatch(c: C, shape: () => void, box: readonly [number, number, number, number], gap = 5, slope = -0.8, alpha = 0.28): void {
  const [x, y, w, h] = box
  c.save()
  c.beginPath()
  shape()
  c.clip()
  c.beginPath()
  for (let at = -h; at < w + h; at += gap) { c.moveTo(x + at, y); c.lineTo(x + at + h * slope, y + h) }
  c.lineWidth = 0.9
  c.strokeStyle = INK
  c.globalAlpha = alpha
  c.stroke()
  c.restore()
}

const dot = (c: C, x: number, y: number, r: number, colour: string = INK): void => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = colour; c.fill() }
const eyeHole = (c: C, x: number, y: number, r: number): void => tint(c, '#fffdf6', () => oval(c, x, y, r, r), 1.8)

/** The little wooden slide a figure stands on in its groove. */
const slide = (c: C, x: number, y: number, w: number): void => {
  tint(c, TINT.wood, () => c.rect(x, y, w, 9), 1.8)
  stroke(c, [x + 6, y + 4.5, x + w - 6, y + 4.5], 0.9)
}

// --- The raccoon ------------------------------------------------------------

function raccoonTail(c: C, at: readonly number[]): void {
  for (let i = 0; i < at.length; i += 2) tint(c, (i / 2) % 2 ? TINT.mask : TINT.grey, () => oval(c, at[i], at[i + 1], 14 - i * 0.4, 11.5), 2)
}

function raccoonHead(c: C, dy: number): void {
  tint(c, TINT.grey, () => poly(c, [64, 34 + dy, 58, 8 + dy, 80, 24 + dy]))
  tint(c, TINT.grey, () => poly(c, [98, 24 + dy, 112, 2 + dy, 120, 28 + dy]))
  tint(c, TINT.mask, () => poly(c, [66, 26 + dy, 62, 15 + dy, 72, 24 + dy]), 0)
  tint(c, TINT.mask, () => poly(c, [104, 22 + dy, 111, 10 + dy, 115, 24 + dy]), 0)
  const head = (): void => oval(c, 92, 50 + dy, 37, 29)
  tint(c, TINT.grey, head)
  hatch(c, head, [54, 20 + dy, 40, 60], 5)
  tint(c, TINT.mask, () => blob(c, [60, 48 + dy, 74, 36 + dy, 98, 33 + dy, 122, 38 + dy, 127, 50 + dy, 112, 60 + dy, 86, 62 + dy, 66, 60 + dy]), 1.6)
  tint(c, TINT.cream, () => oval(c, 111, 63 + dy, 17, 12), 1.8)
  tint(c, TINT.black, () => oval(c, 126, 59 + dy, 6, 5), 1.4)
  stroke(c, [104, 69 + dy, 112, 73 + dy, 121, 68 + dy], 1.8)
  stroke(c, [57, 56 + dy, 49, 58 + dy, 57, 62 + dy, 50, 66 + dy, 59, 68 + dy], 1.8)
  eyeHole(c, 84, 50 + dy, 8)
  eyeHole(c, 105, 48 + dy, 8)
}

function raccoon(c: C, carry: boolean): void {
  const dy = carry ? 18 : 0
  slide(c, 24, 128 + dy, 86)
  raccoonTail(c, [38, 108 + dy, 27, 94 + dy, 19, 78 + dy, 17, 61 + dy, 21, 46 + dy])
  if (carry) {
    tint(c, TINT.grey, () => oval(c, 60, 44, 8, 24, -0.22))
    tint(c, TINT.grey, () => oval(c, 116, 40, 8, 24, 0.28))
    tint(c, TINT.mask, () => oval(c, 55, 22, 8, 7))
    tint(c, TINT.mask, () => oval(c, 122, 18, 8, 7))
  }
  const body = (): void => oval(c, 64, 95 + dy, 31, 34)
  tint(c, TINT.grey, body)
  hatch(c, body, [30, 60 + dy, 30, 72], 5)
  tint(c, TINT.cream, () => oval(c, 72, 101 + dy, 17, 22), 1.4)
  tint(c, TINT.mask, () => oval(c, 48, 125 + dy, 15, 7))
  tint(c, TINT.mask, () => oval(c, 82, 125 + dy, 14, 7))
  if (!carry) {
    tint(c, TINT.grey, () => oval(c, 98, 91, 18, 7.5, -0.4))
    tint(c, TINT.mask, () => oval(c, 113, 83, 7.5, 6.5))
    tint(c, TINT.grey, () => oval(c, 92, 104, 16, 7, -0.1))
    tint(c, TINT.mask, () => oval(c, 108, 102, 7, 6))
  }
  raccoonHead(c, dy)
}

function raccoonShock(c: C): void {
  // Flat out in the air, every limb a different way, tail bristling.
  tint(c, TINT.grey, () => poly(c, [104, 112, 150, 96, 138, 110, 156, 116, 138, 122, 152, 134, 132, 132, 136, 146, 112, 128]))
  stroke(c, [122, 106, 126, 132], 3, TINT.mask)
  stroke(c, [136, 108, 138, 128], 3, TINT.mask)
  for (const [x, y, turn] of [[38, 84, -0.6], [124, 80, 0.6], [50, 132, 0.6], [108, 136, -0.6]] as const) {
    tint(c, TINT.grey, () => oval(c, x, y, 20, 8, turn))
    tint(c, TINT.mask, () => oval(c, x + (x < 80 ? -15 : 15), y + (turn * (x < 80 ? 1 : -1) < 0 ? -9 : 9) * (y > 100 ? -1 : 1) * -1, 7.5, 6.5))
  }
  const body = (): void => oval(c, 80, 100, 30, 32)
  tint(c, TINT.grey, body)
  hatch(c, body, [50, 68, 28, 64], 5)
  tint(c, TINT.cream, () => oval(c, 80, 106, 17, 20), 1.4)
  tint(c, TINT.grey, () => poly(c, [50, 44, 44, 16, 68, 34]))
  tint(c, TINT.grey, () => poly(c, [94, 34, 118, 14, 112, 46]))
  tint(c, TINT.grey, () => oval(c, 80, 62, 40, 30))
  tint(c, TINT.mask, () => blob(c, [46, 62, 58, 48, 80, 52, 104, 48, 116, 62, 104, 78, 80, 72, 58, 78]), 1.6)
  tint(c, TINT.cream, () => oval(c, 81, 84, 16, 13), 1.8)
  tint(c, '#5a2b2b', () => oval(c, 81, 88, 8, 9), 1.6)
  tint(c, TINT.black, () => oval(c, 81, 74, 6, 4.5), 1.4)
  eyeHole(c, 68, 66, 10)
  eyeHole(c, 94, 66, 10)
}

// --- The goose --------------------------------------------------------------

type GooseParts = {
  /** How far the body is moved in its card, and how it leans. */
  x: number; y: number; lean: number
  /** The neck as a closed shape, and the head. */
  neck: readonly number[]
  head: readonly [number, number, number]
  /** The beak's two halves, and whether a tongue shows. */
  upper: readonly number[]; lower: readonly number[]; tongue?: readonly [number, number]
  eye: readonly [number, number, number] | null
  brow: readonly number[]
  wing: 'folded' | 'up' | 'hip'
  kick?: boolean
  slideAt: number
}

function goose(c: C, p: GooseParts): void {
  const { x, y } = p
  slide(c, 36 + x * 0.4, p.slideAt, 100)
  // Legs and feet.
  const foot = (fx: number, fy: number): void => tint(c, TINT.orange, () => poly(c, [fx - 14, fy, fx + 16, fy, fx + 2, fy - 11]), 1.8)
  stroke(c, [70 + x, 176 + y, 70 + x, p.slideAt - 4], 5, TINT.orange)
  stroke(c, [70 + x, 176 + y, 70 + x, p.slideAt - 4], 1.2)
  foot(70 + x, p.slideAt)
  if (p.kick) {
    stroke(c, [100 + x, 172 + y, 150 + x, 164 + y], 5, TINT.orange)
    stroke(c, [100 + x, 172 + y, 150 + x, 164 + y], 1.2)
    tint(c, TINT.orange, () => poly(c, [148 + x, 144 + y, 186 + x, 150 + y, 190 + x, 168 + y, 180 + x, 186 + y, 150 + x, 182 + y]), 1.8)
    stroke(c, [156 + x, 164 + y, 184 + x, 156 + y], 1.2)
    stroke(c, [156 + x, 168 + y, 184 + x, 174 + y], 1.2)
  } else {
    stroke(c, [98 + x, 176 + y, 98 + x, p.slideAt - 4], 5, TINT.orange)
    stroke(c, [98 + x, 176 + y, 98 + x, p.slideAt - 4], 1.2)
    foot(98 + x, p.slideAt)
  }
  // Tail, body, wing.
  tint(c, TINT.white, () => poly(c, [26 + x, 132 + y, 4 + x, 106 + y, 22 + x, 112 + y, 10 + x, 90 + y, 32 + x, 104 + y, 44 + x, 122 + y]))
  if (p.wing === 'up') tint(c, TINT.white, () => blob(c, [58 + x, 150 + y, 22 + x, 110 + y, 2 + x, 62 + y, 30 + x, 78 + y, 40 + x, 60 + y, 62 + x, 96 + y, 86 + x, 130 + y]))
  tint(c, TINT.white, () => blob(c, p.neck))
  const body = (): void => oval(c, 78 + x, 146 + y, 57, 43, p.lean)
  tint(c, TINT.white, body)
  hatch(c, body, [20 + x, 150 + y, 120, 44], 5, -0.8, 0.22)
  if (p.wing === 'folded' || p.wing === 'hip') {
    // A folded wing, pointing back to the tail, with three rows of feather tips.
    const wing = (): void => { c.moveTo(112 + x, 132 + y); c.quadraticCurveTo(78 + x, 118 + y, 44 + x, 136 + y); c.lineTo(30 + x, 150 + y); c.lineTo(46 + x, 152 + y); c.lineTo(38 + x, 164 + y); c.lineTo(58 + x, 162 + y); c.lineTo(56 + x, 172 + y); c.quadraticCurveTo(96 + x, 174 + y, 112 + x, 132 + y); c.closePath() }
    tint(c, '#efe6cf', wing, 1.8)
    for (const [wx, wy] of [[62, 146], [78, 142], [94, 140], [70, 158], [86, 155]]) { c.beginPath(); c.arc(wx + x, wy + y, 7, 0.3, 2.6); c.lineWidth = 1.1; c.strokeStyle = INK; c.stroke() }
  } else {
    tint(c, TINT.white, () => blob(c, [96 + x, 150 + y, 60 + x, 124 + y, 30 + x, 96 + y, 62 + x, 102 + y, 70 + x, 86 + y, 96 + x, 112 + y, 116 + x, 140 + y]))
    stroke(c, [48 + x, 104 + y, 80 + x, 126 + y], 1.2)
    stroke(c, [66 + x, 98 + y, 92 + x, 126 + y], 1.2)
  }
  // Head and beak.
  const [hx, hy, hr] = p.head
  tint(c, TINT.orange, () => poly(c, p.upper), 1.8)
  tint(c, TINT.orange, () => poly(c, p.lower), 1.8)
  if (p.tongue) tint(c, TINT.pink, () => oval(c, p.tongue![0], p.tongue![1], 9, 4, 0.2), 1.2)
  tint(c, TINT.white, () => oval(c, hx, hy, hr, hr * 0.84))
  if (p.eye) eyeHole(c, p.eye[0], p.eye[1], p.eye[2])
  else tint(c, INK, () => { c.moveTo(hx - 8, hy - 3); c.quadraticCurveTo(hx, hy + 6, hx + 8, hy - 3); c.quadraticCurveTo(hx, hy + 1, hx - 8, hy - 3) }, 1.4)
  stroke(c, p.brow, 3)
}

const GOOSE: Record<'goose' | 'gooseAlert' | 'gooseHonk' | 'gooseKick' | 'gooseStrut', GooseParts> = {
  goose: {
    x: 0, y: 0, lean: -0.12, slideAt: 212, wing: 'folded',
    neck: [104, 124, 108, 86, 116, 60, 132, 54, 148, 62, 138, 92, 134, 128], head: [134, 48, 22],
    upper: [150, 39, 178, 49, 150, 51], lower: [150, 51, 174, 52, 150, 58], eye: [134, 46, 6.5], brow: [123, 35, 143, 40],
  },
  gooseAlert: {
    x: 0, y: 36, lean: -0.12, slideAt: 248, wing: 'folded',
    neck: [100, 162, 106, 100, 118, 56, 134, 46, 150, 56, 140, 104, 132, 164], head: [134, 42, 23],
    upper: [150, 30, 180, 38, 150, 43], lower: [150, 47, 174, 53, 150, 55], eye: [134, 40, 7.5], brow: [122, 25, 142, 22],
  },
  gooseHonk: {
    x: 20, y: 24, lean: -0.1, slideAt: 236, wing: 'up',
    neck: [124, 152, 128, 108, 136, 72, 152, 60, 168, 70, 158, 110, 152, 156], head: [152, 56, 24],
    upper: [166, 38, 206, 28, 172, 54], lower: [168, 60, 202, 80, 164, 68], tongue: [180, 58], eye: [152, 52, 8], brow: [138, 36, 160, 40],
  },
  gooseKick: {
    x: 12, y: 16, lean: -0.36, slideAt: 222, wing: 'up', kick: true,
    neck: [96, 136, 96, 96, 104, 66, 120, 56, 136, 64, 126, 98, 126, 142], head: [122, 52, 23],
    upper: [136, 40, 168, 44, 138, 54], lower: [138, 54, 162, 60, 136, 62], eye: [122, 50, 7], brow: [110, 36, 132, 42],
  },
  gooseStrut: {
    x: 0, y: 14, lean: -0.34, slideAt: 226, wing: 'hip',
    neck: [102, 132, 104, 94, 112, 62, 128, 50, 146, 60, 136, 96, 132, 138], head: [134, 46, 22],
    upper: [146, 34, 168, 10, 154, 42], lower: [150, 44, 172, 18, 156, 48], eye: null, brow: [124, 34, 142, 30],
  },
}

// --- The other figures ------------------------------------------------------

function dog(c: C): void {
  tint(c, TINT.tan, () => oval(c, 112, 134, 31, 27))
  const body = (): void => blob(c, [60, 156, 54, 104, 74, 72, 108, 76, 128, 112, 128, 160])
  tint(c, TINT.tan, body)
  hatch(c, body, [90, 70, 44, 92], 5)
  tint(c, TINT.cream, () => oval(c, 70, 120, 12, 24), 1.4)
  tint(c, TINT.tan, () => c.roundRect(60, 116, 15, 44, 6))
  tint(c, TINT.tan, () => c.roundRect(80, 120, 15, 40, 6))
  tint(c, TINT.red, () => blob(c, [58, 88, 78, 96, 100, 92, 100, 102, 78, 106, 58, 98]), 1.8)
  dot(c, 76, 106, 5, TINT.gold)
  tint(c, TINT.tan, () => oval(c, 60, 62, 37, 31))
  tint(c, TINT.brown, () => oval(c, 66, 52, 17, 15), 0)
  tint(c, TINT.cream, () => oval(c, 28, 75, 25, 17), 1.8)
  tint(c, TINT.black, () => oval(c, 9, 69, 8, 6.5), 1.4)
  stroke(c, [14, 84, 30, 88, 46, 82], 1.8)
  tint(c, TINT.pink, () => oval(c, 26, 93, 6.5, 9), 1.4)
  tint(c, TINT.brown, () => blob(c, [84, 38, 104, 46, 108, 82, 94, 96, 80, 72]))
  eyeHole(c, 56, 56, 7.5)
  stroke(c, [44, 44, 62, 42], 3)
}

function dogTail(c: C): void {
  tint(c, TINT.tan, () => blob(c, [6, 70, 8, 44, 24, 18, 44, 6, 50, 14, 36, 30, 24, 52, 20, 72]))
  tint(c, TINT.cream, () => blob(c, [34, 16, 44, 6, 50, 14, 40, 26]), 1.4)
}

function scarecrow(c: C): void {
  tint(c, '#9a7a52', () => oval(c, 125, 328, 42, 8), 1.8)
  tint(c, TINT.darkWood, () => c.rect(119, 150, 12, 178))
  tint(c, TINT.darkWood, () => c.rect(16, 150, 218, 10))
  for (const side of [-1, 1]) {
    const x = 125 + side * 108
    for (let i = 0; i < 7; i++) stroke(c, [x, 155, x + side * (20 - Math.abs(i - 3) * 3), 138 + i * 6], 1.6, i % 2 ? TINT.straw : INK)
  }
  tint(c, TINT.blue, () => poly(c, [18, 140, 74, 138, 74, 174, 24, 168]))
  tint(c, TINT.blue, () => poly(c, [176, 138, 232, 140, 226, 168, 176, 174]))
  const coat = (): void => poly(c, [70, 140, 180, 140, 198, 264, 162, 254, 125, 270, 90, 254, 54, 264])
  tint(c, TINT.blue, coat)
  hatch(c, coat, [125, 140, 80, 130], 5)
  tint(c, TINT.red, () => c.rect(84, 196, 26, 24), 1.6)
  tint(c, TINT.gold, () => c.rect(146, 176, 22, 20), 1.6)
  for (let i = 0; i < 9; i++) stroke(c, [62 + i * 15, 258, 56 + i * 15, 282 + (i % 3) * 6], 1.6, i % 2 ? TINT.straw : INK)
  stroke(c, [66, 226, 186, 226], 3, TINT.darkWood)
  tint(c, TINT.red, () => poly(c, [98, 138, 152, 138, 125, 172]))
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) stroke(c, [125 + side * 38, 66 + i * 5, 125 + side * (56 - i * 2), 58 + i * 9], 1.6, i % 2 ? INK : TINT.straw)
  // The bare peg he would so like a hat on.
  tint(c, TINT.wood, () => c.rect(121, 30, 8, 26), 1.8)
  tint(c, TINT.wood, () => oval(c, 125, 28, 7, 6), 1.8)
  const head = (): void => blob(c, [84, 58, 125, 48, 166, 58, 172, 104, 152, 138, 98, 138, 78, 104])
  tint(c, '#e6d3a3', head)
  hatch(c, head, [140, 50, 34, 90], 5)
  tint(c, TINT.orange, () => poly(c, [125, 100, 117, 114, 133, 114]), 1.6)
  // A stitched mouth with seven teeth, so it can never be read as a letter.
  const teeth: number[] = []
  for (let i = 0; i <= 14; i++) teeth.push(100 + i * 3.6, 123 + (i % 2 ? -4 : 3))
  stroke(c, teeth, 1.8)
  eyeHole(c, 108, 96, 9.5)
  eyeHole(c, 142, 96, 9.5)
  stroke(c, [97, 82, 114, 76], 2.6)
  stroke(c, [136, 76, 153, 82], 2.6)
}

function crow(c: C): void {
  stroke(c, [28, 46, 26, 58], 2)
  stroke(c, [38, 46, 40, 58], 2)
  tint(c, TINT.black, () => poly(c, [14, 36, 0, 52, 18, 46]))
  tint(c, TINT.black, () => oval(c, 32, 36, 21, 14, -0.2))
  tint(c, '#b89c4a', () => poly(c, [56, 14, 70, 21, 56, 25]), 1.6)
  tint(c, TINT.black, () => oval(c, 46, 20, 12, 11))
  eyeHole(c, 47, 18, 4.5)
}

function farmer(c: C, up: boolean): void {
  const dy = up ? 26 : 0
  if (up) {
    const chest = (): void => poly(c, [26, 146, 30, 92, 110, 92, 114, 146])
    tint(c, '#c98b3c', chest)
    hatch(c, chest, [26, 92, 90, 54], 6)
    stroke(c, [50, 92, 46, 146], 4, TINT.brown)
    stroke(c, [90, 92, 94, 146], 4, TINT.brown)
    tint(c, '#c98b3c', () => oval(c, 122, 84, 9, 24, 0.5))
    tint(c, TINT.skin, () => oval(c, 132, 62, 8, 7))
  } else {
    const arms = (): void => blob(c, [12, 122, 16, 92, 44, 82, 96, 82, 124, 92, 128, 122])
    tint(c, '#c98b3c', arms)
    hatch(c, arms, [12, 82, 116, 40], 6)
    tint(c, TINT.skin, () => oval(c, 52, 106, 13, 8))
    tint(c, TINT.skin, () => oval(c, 90, 106, 13, 8))
  }
  const hy = up ? 52 : 62
  tint(c, TINT.skin, () => oval(c, 44, hy + 2, 6, 8))
  tint(c, TINT.skin, () => oval(c, 96, hy + 2, 6, 8))
  tint(c, TINT.skin, () => oval(c, 70, hy, 27, 25))
  tint(c, '#e0a184', () => oval(c, 70, hy + 7, 8, 7), 1.6)
  tint(c, '#f1ede2', () => blob(c, [46, hy + 14, 70, hy + 10, 94, hy + 14, 88, hy + 26, 70, hy + 19, 52, hy + 26]), 1.8)
  if (up) {
    // Awake: eyes open under a hat pushed back, lips pursed to whistle.
    dot(c, 60, hy - 4, 3)
    dot(c, 80, hy - 4, 3)
    stroke(c, [52, hy - 12, 66, hy - 10], 2.4)
    stroke(c, [74, hy - 10, 88, hy - 12], 2.4)
    tint(c, '#7a3b3b', () => oval(c, 70, hy + 22, 3.5, 3.5), 1.4)
    tint(c, TINT.straw, () => blob(c, [40, hy - 22, 48, hy - 46, 92, hy - 46, 100, hy - 22]))
    tint(c, TINT.straw, () => oval(c, 70, hy - 20, 46, 8))
    stroke(c, [45, hy - 28, 95, hy - 28], 4, TINT.red)
  } else {
    // Asleep: the hat is pulled down over his eyes.
    const crown = (): void => blob(c, [42, 54, 48, 20, 92, 20, 98, 54])
    tint(c, TINT.straw, crown)
    hatch(c, crown, [44, 20, 54, 34], 5, 0.8)
    stroke(c, [46, 44, 94, 44], 4, TINT.red)
    tint(c, TINT.straw, () => oval(c, 70, 54, 47, 9))
  }
  void dy
}

/** Woken, but not up: the hat is tipped back on one side and one eye is open under it. */
function farmerPeek(c: C): void {
  const arms = (): void => blob(c, [12, 122, 16, 92, 44, 82, 96, 82, 124, 92, 128, 122])
  tint(c, '#c98b3c', arms)
  hatch(c, arms, [12, 82, 116, 40], 6)
  tint(c, TINT.skin, () => oval(c, 52, 106, 13, 8))
  tint(c, TINT.skin, () => oval(c, 90, 106, 13, 8))
  tint(c, TINT.skin, () => oval(c, 44, 64, 6, 8))
  tint(c, TINT.skin, () => oval(c, 96, 64, 6, 8))
  tint(c, TINT.skin, () => oval(c, 70, 62, 27, 25))
  tint(c, '#e0a184', () => oval(c, 70, 69, 8, 7), 1.6)
  tint(c, '#f1ede2', () => blob(c, [46, 76, 70, 72, 94, 76, 88, 88, 70, 81, 52, 88]), 1.8)
  // One eye open and its brow up; the other still shut.
  tint(c, '#fffdf6', () => oval(c, 82, 56, 6, 5), 1.6)
  dot(c, 83, 56, 2.8)
  stroke(c, [74, 46, 90, 44], 2.4)
  stroke(c, [54, 58, 64, 58], 2.2)
  c.save()
  c.translate(70, 44)
  c.rotate(-0.26)
  const crown = (): void => blob(c, [-28, 0, -22, -34, 22, -34, 28, 0])
  tint(c, TINT.straw, crown)
  hatch(c, crown, [-26, -34, 54, 34], 5, 0.8)
  stroke(c, [-24, -10, 24, -10], 4, TINT.red)
  tint(c, TINT.straw, () => oval(c, 0, 0, 47, 9))
  c.restore()
}

function frog(c: C): void {
  tint(c, TINT.frog, () => oval(c, 14, 62, 12, 5))
  tint(c, TINT.frog, () => oval(c, 70, 62, 12, 5))
  const body = (): void => oval(c, 42, 46, 31, 19)
  tint(c, TINT.frog, body)
  hatch(c, body, [12, 46, 60, 20], 4, -0.8, 0.25)
  tint(c, '#dfe8b8', () => oval(c, 42, 55, 18, 8), 1.2)
  tint(c, TINT.frog, () => oval(c, 27, 24, 12, 12))
  tint(c, TINT.frog, () => oval(c, 57, 24, 12, 12))
  eyeHole(c, 27, 22, 7.5)
  eyeHole(c, 57, 22, 7.5)
  c.beginPath()
  c.moveTo(16, 44)
  c.quadraticCurveTo(42, 56, 68, 44)
  c.lineWidth = 2
  c.strokeStyle = INK
  c.stroke()
}

// --- The set pieces ---------------------------------------------------------

function bush(c: C): void {
  const lumps = [[42, 56, 36, TINT.leaf], [154, 56, 36, TINT.leaf], [98, 46, 42, TINT.leafLight], [70, 66, 32, TINT.leafLight], [126, 68, 32, TINT.leaf]] as const
  for (const [x, y, r, colour] of lumps) {
    const lump = (): void => { c.rect(0, 0, 196, 84); }
    c.save()
    c.beginPath()
    lump()
    c.clip()
    tint(c, colour, () => oval(c, x, y, r, r * 0.92))
    hatch(c, () => oval(c, x, y, r, r * 0.92), [x, y - r, r, r * 2], 5, -0.8, 0.22)
    c.restore()
  }
  for (const [x, y] of [[34, 44], [70, 26], [112, 22], [150, 42], [92, 54], [58, 70], [128, 70], [168, 66]]) {
    c.beginPath()
    c.moveTo(x - 9, y)
    c.quadraticCurveTo(x, y - 9, x + 9, y)
    c.quadraticCurveTo(x, y + 3, x - 9, y)
    c.lineWidth = 1.3
    c.strokeStyle = INK
    c.stroke()
  }
  for (const [x, y] of [[52, 34], [130, 40], [100, 70], [24, 64], [174, 52]]) { dot(c, x, y, 4.2, TINT.red); c.lineWidth = 1; c.strokeStyle = INK; c.stroke() }
  stroke(c, [8, 84, 188, 84], 2.2)
}

function nest(c: C): void {
  tint(c, '#7a5a34', () => oval(c, 75, 34, 60, 12), 1.6)
  const bowl = (): void => blob(c, [6, 28, 22, 62, 75, 72, 128, 62, 144, 28, 122, 42, 75, 48, 28, 42])
  tint(c, TINT.straw, bowl)
  hatch(c, bowl, [6, 28, 140, 44], 6, 1.6, 0.4)
  hatch(c, bowl, [6, 28, 140, 44], 9, -2.2, 0.3)
  for (const [x1, y1, x2, y2] of [[10, 34, -2, 22], [20, 54, 4, 60], [136, 36, 148, 22], [128, 56, 146, 60], [60, 68, 54, 76], [96, 68, 104, 76]]) stroke(c, [x1, y1, x2, y2], 1.8)
}

function kennel(c: C): void {
  const walls = (): void => c.rect(22, 72, 132, 98)
  tint(c, TINT.wood, walls)
  for (let x = 44; x < 154; x += 22) stroke(c, [x, 76, x, 168], 1.1)
  hatch(c, walls, [110, 72, 44, 98], 5)
  tint(c, '#4a3528', () => { c.moveTo(54, 170); c.lineTo(54, 118); c.quadraticCurveTo(88, 78, 122, 118); c.lineTo(122, 170); c.closePath() })
  const roof = (): void => poly(c, [4, 80, 88, 8, 172, 80, 162, 90, 88, 28, 14, 90])
  tint(c, TINT.barn, roof)
  hatch(c, roof, [88, 8, 84, 82], 5)
  tint(c, TINT.wood, () => poly(c, [28, 78, 88, 28, 148, 78]), 0)
  stroke(c, [28, 78, 88, 28, 148, 78], 1.6)
}

function bowl(c: C): void {
  const body = (): void => poly(c, [6, 10, 78, 10, 68, 37, 16, 37])
  tint(c, TINT.blue, body)
  hatch(c, body, [44, 10, 34, 27], 4)
  tint(c, '#dfe6ea', () => oval(c, 42, 10, 36, 6.5), 1.8)
  tint(c, '#51606e', () => oval(c, 42, 11, 28, 4), 0)
}

function lily(c: C): void {
  tint(c, TINT.leafLight, () => { c.moveTo(58, 18); c.lineTo(108, 8); c.ellipse(58, 18, 54, 13, 0, -0.2, Math.PI * 2 - 0.55); c.closePath() }, 1.8)
  stroke(c, [58, 18, 20, 20], 1)
  stroke(c, [58, 18, 44, 28], 1)
  stroke(c, [58, 18, 84, 28], 1)
}

function reeds(c: C): void {
  for (const [x, top, lean] of [[24, 30, -8], [44, 8, 4], [62, 26, -2], [80, 14, 8], [98, 40, 12]] as const) {
    stroke(c, [x, 114, x + lean, top + 20], 2.6, '#5f8a48')
    stroke(c, [x, 114, x + lean, top + 20], 1)
    tint(c, TINT.brown, () => c.roundRect(x + lean - 5, top, 10, 26, 5), 1.6)
  }
  for (const [x, lean] of [[14, -14], [36, 12], [70, -12], [90, 16], [108, 10]]) {
    tint(c, '#7fae5c', () => { c.moveTo(x, 114); c.quadraticCurveTo(x + lean * 0.4, 70, x + lean, 46); c.quadraticCurveTo(x + lean * 0.8 + 5, 76, x + 7, 114); c.closePath() }, 1.4)
  }
}

function cloud(c: C): void {
  stroke(c, [80, 0, 80, 26], 1.4)
  stroke(c, [136, 0, 136, 22], 1.4)
  const puff = (): void => blob(c, [14, 66, 24, 40, 56, 40, 74, 16, 112, 14, 134, 36, 176, 36, 198, 64, 180, 86, 30, 86])
  tint(c, '#fdfbf3', puff)
  c.save()
  c.beginPath()
  puff()
  c.clip()
  c.beginPath()
  for (let y = 60; y < 90; y += 5) { c.moveTo(20, y); c.lineTo(194, y) }
  c.lineWidth = 0.9
  c.globalAlpha = 0.3
  c.strokeStyle = INK
  c.stroke()
  c.restore()
}

function sun(c: C): void {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, long = i % 2 ? 50 : 58
    tint(c, TINT.gold, () => poly(c, [62 + Math.cos(a - 0.13) * 36, 62 + Math.sin(a - 0.13) * 36, 62 + Math.cos(a) * long, 62 + Math.sin(a) * long, 62 + Math.cos(a + 0.13) * 36, 62 + Math.sin(a + 0.13) * 36]), 1.6)
  }
  const disc = (): void => oval(c, 62, 62, 32, 32)
  tint(c, '#f3cf58', disc)
  hatch(c, disc, [62, 30, 32, 64], 5, -0.8, 0.2)
}

function clothesPeg(c: C, x: number): void {
  tint(c, TINT.wood, () => c.rect(x - 3, 0, 6, 16), 1.4)
}

function longjohns(c: C): void {
  const suit = (): void => poly(c, [30, 10, 66, 10, 70, 20, 94, 46, 84, 58, 68, 42, 70, 76, 74, 130, 54, 132, 48, 86, 42, 132, 22, 130, 26, 76, 28, 42, 12, 58, 2, 46, 26, 20])
  tint(c, TINT.red, suit)
  hatch(c, suit, [48, 10, 48, 124], 5)
  stroke(c, [48, 14, 48, 70], 1.4)
  tint(c, '#e58a7a', () => c.rect(34, 70, 28, 16), 1.4)
  clothesPeg(c, 34)
  clothesPeg(c, 62)
}

function sheet(c: C): void {
  const cloth = (): void => { c.moveTo(6, 10); c.lineTo(120, 10); c.lineTo(122, 98); c.quadraticCurveTo(104, 110, 88, 100); c.quadraticCurveTo(66, 90, 46, 102); c.quadraticCurveTo(24, 112, 4, 98); c.closePath() }
  tint(c, '#fbf8ef', cloth)
  hatch(c, cloth, [70, 10, 54, 100], 6, -0.8, 0.2)
  stroke(c, [40, 12, 38, 98], 1)
  stroke(c, [84, 12, 86, 96], 1)
  tint(c, '#9fc0d8', () => c.rect(54, 40, 24, 22), 1.4)
  clothesPeg(c, 14)
  clothesPeg(c, 112)
}

function sock(c: C): void {
  const shape = (): void => poly(c, [10, 10, 34, 10, 34, 46, 42, 60, 36, 72, 14, 70, 10, 52])
  tint(c, '#f1e3c2', shape)
  c.save()
  c.beginPath()
  shape()
  c.clip()
  for (const y of [18, 30, 42]) { c.fillStyle = TINT.blue; c.fillRect(8, y, 30, 6) }
  c.restore()
  tint(c, null, shape)
  clothesPeg(c, 22)
}

function stagePeg(c: C): void {
  tint(c, TINT.red, () => poly(c, [15, 4, 29, 10, 15, 17]), 1.6)
  tint(c, TINT.wood, () => c.rect(12.5, 2, 5, 34), 1.6)
  tint(c, TINT.wood, () => oval(c, 15, 40, 7, 5), 1.6)
}

function hand(c: C): void {
  // A printer's pointing hand, fingertip at the top left.
  const shape = (): void => blob(c, [12, 8, 22, 10, 48, 44, 66, 40, 80, 52, 84, 74, 70, 90, 50, 88, 36, 72, 28, 52, 10, 22])
  tint(c, '#fbf6e8', shape, 2.4)
  stroke(c, [50, 50, 60, 62], 1.4)
  stroke(c, [58, 46, 70, 58], 1.4)
  stroke(c, [42, 58, 50, 72], 1.4)
  const cuff = (): void => poly(c, [60, 84, 84, 62, 92, 80, 88, 96, 78, 110, 62, 106])
  tint(c, TINT.crimson, cuff, 2.2)
  hatch(c, cuff, [60, 62, 34, 50], 4)
}

function feather(c: C): void {
  tint(c, TINT.white, () => { c.moveTo(2, 8); c.quadraticCurveTo(16, -4, 32, 7); c.quadraticCurveTo(16, 18, 2, 8) }, 1.4)
  stroke(c, [2, 8, 30, 7.5], 1)
}

function leaf(c: C): void {
  tint(c, TINT.leafLight, () => { c.moveTo(2, 8); c.quadraticCurveTo(12, -3, 22, 8); c.quadraticCurveTo(12, 17, 2, 8) }, 1.4)
}

// --- What the pairings leave, and the small props ---------------------------

function frogEars(c: C): void {
  frog(c)
  // His hands are clapped over where his ears would be.
  tint(c, TINT.frog, () => oval(c, 12, 30, 9, 13, 0.3))
  tint(c, TINT.frog, () => oval(c, 72, 30, 9, 13, -0.3))
}

function cabbageHeart(c: C): void {
  tint(c, '#c9e39a', () => blob(c, [4, 26, 10, 8, 23, 3, 36, 8, 42, 26, 34, 40, 23, 42, 12, 40]))
  c.lineWidth = 1.3
  c.strokeStyle = INK
  c.beginPath()
  c.moveTo(10, 20); c.quadraticCurveTo(23, 10, 36, 20)
  c.moveTo(23, 22); c.lineTo(23, 40)
  c.stroke()
}

function cabbagePad(c: C): void {
  const pad = (): void => blob(c, [4, 14, 22, 4, 62, 3, 84, 14, 66, 28, 24, 30])
  tint(c, '#8cc06a', pad)
  hatch(c, pad, [44, 3, 40, 28], 5, -0.8, 0.22)
  c.lineWidth = 1.4
  c.strokeStyle = INK
  c.beginPath()
  c.moveTo(12, 16); c.quadraticCurveTo(44, 6, 76, 15)
  c.moveTo(44, 10); c.quadraticCurveTo(40, 20, 46, 28)
  c.stroke()
}

/** What the crow leaves of the cabbage: a ruff of leaves round his neck. */
function collar(c: C): void {
  const leaves = [[8, 20, 0.5], [30, 28, 0.2], [56, 31, 0], [82, 28, -0.2], [104, 20, -0.5]] as const
  for (const [x, y, turn] of leaves) tint(c, x === 56 ? '#a5d07c' : '#8cc06a', () => oval(c, x, y, 17, 10, turn), 1.8)
  stroke(c, [20, 14, 56, 22, 92, 14], 1.3)
}

function mound(c: C): void {
  const heap = (): void => blob(c, [4, 40, 20, 14, 68, 4, 116, 14, 132, 40])
  tint(c, '#9a7250', heap)
  hatch(c, heap, [68, 4, 64, 36], 5, -0.8, 0.3)
  stroke(c, [30, 30, 40, 26], 1.4)
  stroke(c, [84, 22, 96, 25], 1.4)
}

function sparrow(c: C): void {
  tint(c, '#a9825a', () => oval(c, 17, 19, 13, 10))
  tint(c, '#8b6844', () => poly(c, [4, 16, 0, 26, 12, 22]), 1.4)
  tint(c, '#a9825a', () => oval(c, 25, 10, 8, 7), 1.6)
  tint(c, TINT.orange, () => poly(c, [31, 8, 36, 11, 31, 13]), 1.2)
  dot(c, 26, 9, 1.6)
}

function bubble(c: C): void {
  tint(c, '#eaf6f4', () => oval(c, 11, 11, 8.5, 8.5), 1.6)
  stroke(c, [7, 8, 9, 6], 1.2)
}

function waterDrop(c: C): void {
  tint(c, TINT.water, () => { c.moveTo(6, 1); c.quadraticCurveTo(12, 11, 6, 16); c.quadraticCurveTo(0, 11, 6, 1) }, 1.4)
}

function splash(c: C): void {
  const water = (): void => poly(c, [4, 70, 10, 36, 24, 52, 34, 10, 50, 44, 62, 2, 74, 44, 90, 12, 100, 52, 114, 34, 120, 70])
  tint(c, '#bfe0e6', water)
  hatch(c, water, [62, 2, 60, 68], 6, -0.8, 0.2)
}

/** An apple out of the tree: one flat red, a stalk, no face. */
function apple(c: C): void {
  tint(c, TINT.red, () => oval(c, 10, 13, 7.5, 7.5), 1.4)
  stroke(c, [10, 6, 12, 2], 1.4)
}

function clod(c: C): void {
  tint(c, '#9a7250', () => blob(c, [2, 8, 6, 2, 14, 3, 16, 9, 9, 12]), 1.3)
}

/** The egg pegged up in a sock: its top looks out. */
function sockEgg(c: C): void {
  tint(c, '#fbf3dc', () => oval(c, 26, 30, 13, 16), 2)
  const shape = (): void => blob(c, [8, 30, 26, 38, 44, 30, 48, 62, 44, 84, 26, 90, 8, 84, 4, 62])
  tint(c, '#f1e7cd', shape)
  c.save()
  c.beginPath(); shape(); c.clip()
  for (const y of [46, 60]) { c.fillStyle = TINT.blue; c.fillRect(0, y, 52, 6) }
  c.restore()
  tint(c, null, shape)
  clothesPeg(c, 26)
}

/** The prop that holds the washing line up: a forked pole. */
function pole(c: C): void {
  tint(c, TINT.wood, () => c.rect(9, 12, 8, 200), 1.8)
  stroke(c, [13, 16, 4, 2], 4, TINT.darkWood)
  stroke(c, [13, 16, 22, 2], 4, TINT.darkWood)
  stroke(c, [13, 40, 13, 200], 0.9)
}

/** The lower half of the barn door: planks and two rails, no brace that could be read as a sign. */
function halfDoor(c: C): void {
  tint(c, '#d98a5f', () => c.rect(0, 4, 112, 82))
  for (let x = 28; x < 112; x += 28) stroke(c, [x, 6, x, 84], 1.2)
  tint(c, '#b96d48', () => c.rect(4, 20, 104, 9), 1.4)
  tint(c, '#b96d48', () => c.rect(4, 62, 104, 9), 1.4)
  tint(c, TINT.wood, () => c.rect(-6, 0, 124, 9), 1.8)
}

// --- The six things: plain, one tint and one line each ----------------------

function ball(c: C): void {
  const round = (): void => oval(c, 30, 31, 25, 25)
  tint(c, TINT.red, round)
  c.save()
  c.beginPath()
  round()
  c.clip()
  c.beginPath()
  c.moveTo(2, 24)
  c.quadraticCurveTo(30, 40, 58, 24)
  c.lineTo(58, 34)
  c.quadraticCurveTo(30, 50, 2, 34)
  c.closePath()
  c.fillStyle = PAPER
  c.fill()
  c.restore()
  tint(c, null, round)
}

function potato(c: C): void {
  tint(c, TINT.potato, () => blob(c, [4, 30, 12, 12, 34, 6, 56, 10, 66, 28, 56, 44, 30, 47, 10, 42]))
  // One crease and one dimple: marks of a potato, not a row of dots.
  stroke(c, [20, 24, 27, 20, 33, 22], 1.4)
  dot(c, 47, 32, 1.6)
}

/** The potato the crow has pecked: two eyes and a mouth. */
function potatoFace(c: C): void {
  tint(c, TINT.potato, () => blob(c, [4, 30, 12, 12, 34, 6, 56, 10, 66, 28, 56, 44, 30, 47, 10, 42]))
  tint(c, '#5b3d27', () => oval(c, 25, 22, 4, 5), 1.2)
  tint(c, '#5b3d27', () => oval(c, 44, 21, 4, 5), 1.2)
  stroke(c, [22, 34, 28, 39, 40, 39, 47, 33], 2.4, '#5b3d27')
}

function clock(c: C): void {
  stroke(c, [20, 58, 14, 69], 3)
  stroke(c, [44, 58, 50, 69], 3)
  tint(c, TINT.gold, () => oval(c, 17, 13, 10, 8, -0.5))
  tint(c, TINT.gold, () => oval(c, 47, 13, 10, 8, 0.5))
  stroke(c, [32, 4, 32, 16], 2.4)
  tint(c, TINT.teal, () => oval(c, 32, 40, 25, 25))
  tint(c, '#fbf6e6', () => oval(c, 32, 40, 18.5, 18.5), 1.6)
  // A plain face and two hands: no numeral, and no marks round the rim to count.
  dot(c, 32, 40, 2.4)
  // The hands lie wide apart, at about ten to three: they make no corner and no tick.
  stroke(c, [32, 40, 22, 33], 2.2)
  stroke(c, [32, 40, 42, 39], 2.2)
}

function boot(c: C): void {
  const shape = (): void => blob(c, [14, 6, 42, 6, 44, 40, 62, 48, 70, 60, 68, 70, 12, 70, 12, 40])
  tint(c, TINT.brown, shape)
  tint(c, '#4f3423', () => c.rect(10, 66, 60, 7), 1.6)
  stroke(c, [34, 20, 44, 22], 1.6, PAPER)
  stroke(c, [34, 29, 44, 31], 1.6, PAPER)
  stroke(c, [36, 38, 46, 41], 1.6, PAPER)
  stroke(c, [16, 8, 10, 2, 18, 4], 1.6)
}

function cabbage(c: C): void {
  tint(c, '#8cc06a', () => blob(c, [6, 36, 12, 12, 36, 4, 60, 12, 68, 36, 58, 58, 36, 62, 14, 58]))
  c.lineWidth = 1.5
  c.strokeStyle = INK
  c.beginPath()
  c.moveTo(14, 26); c.quadraticCurveTo(36, 12, 58, 26)
  c.moveTo(12, 42); c.quadraticCurveTo(26, 30, 36, 44)
  c.moveTo(60, 42); c.quadraticCurveTo(46, 30, 36, 44)
  c.moveTo(36, 44); c.lineTo(36, 60)
  c.stroke()
}

function egg(c: C): void {
  tint(c, '#fbf3dc', () => { c.moveTo(25, 4); c.bezierCurveTo(40, 6, 48, 34, 44, 46); c.bezierCurveTo(40, 62, 10, 62, 6, 46); c.bezierCurveTo(2, 34, 10, 6, 25, 4); c.closePath() })
}

// --- The stage itself -------------------------------------------------------

function backdrop(c: C): void {
  const W = STAGE.width, H = STAGE.height
  c.fillStyle = TINT.sky
  c.fillRect(0, 0, W, H)
  // An engraved sky: ruled lines, closer together towards the top.
  c.beginPath()
  for (let y = 70, gap = 5; y < 330; y += gap, gap += 0.35) { c.moveTo(0, y); c.lineTo(W, y) }
  c.lineWidth = 0.8
  c.strokeStyle = INK
  c.globalAlpha = 0.16
  c.stroke()
  c.globalAlpha = 1
  // Birds, as small filled shapes with two wings.
  for (const [x, y, s] of [[560, 150, 1], [596, 136, 0.8], [820, 96, 0.9], [270, 96, 0.7]]) {
    c.beginPath()
    c.moveTo(x - 12 * s, y - 4 * s); c.quadraticCurveTo(x - 5 * s, y - 9 * s, x, y); c.quadraticCurveTo(x + 5 * s, y - 9 * s, x + 12 * s, y - 4 * s)
    c.quadraticCurveTo(x + 5 * s, y - 5 * s, x, y + 3 * s); c.quadraticCurveTo(x - 5 * s, y - 5 * s, x - 12 * s, y - 4 * s)
    c.fillStyle = INK
    c.fill()
  }
  // The far hills, with a farmhouse, haystacks and round trees.
  const far = (): void => blob(c, [-40, 420, 0, 318, 150, 286, 330, 322, 480, 292, 640, 312, 800, 282, 980, 310, 1220, 290, 1240, 430])
  tint(c, TINT.far, far, 1.6)
  hatch(c, far, [0, 282, W, 140], 7, -2.4, 0.16)
  for (const [x, y, r] of [[420, 300, 16], [448, 304, 12], [700, 300, 15], [730, 296, 19], [764, 302, 12], [560, 304, 11]]) {
    stroke(c, [x, y, x, y + r + 8], 1.6)
    tint(c, '#9bbf8a', () => oval(c, x, y, r, r * 0.9), 1.4)
  }
  tint(c, '#efe2bf', () => c.rect(596, 290, 44, 22), 1.4)
  tint(c, TINT.barn, () => poly(c, [590, 290, 618, 272, 646, 290]), 1.4)
  tint(c, '#efe2bf', () => c.rect(630, 270, 7, 14), 1.2)
  for (const [x, y] of [[640, 262], [648, 252], [642, 242]]) tint(c, '#fdfbf3', () => oval(c, x, y, 6, 5), 1)
  for (const x of [500, 524, 838]) tint(c, TINT.straw, () => { c.moveTo(x - 12, 316); c.quadraticCurveTo(x, 290, x + 12, 316); c.closePath() }, 1.4)

  // The near hill, and a big apple tree behind the scarecrow.
  const hill = (): void => blob(c, [-40, 470, -20, 370, 200, 344, 420, 372, 640, 350, 900, 372, 1220, 350, 1240, 470])
  tint(c, TINT.hill, hill, 1.8)
  hatch(c, hill, [0, 344, W, 100], 6, -2.2, 0.18)
  tint(c, TINT.darkWood, () => poly(c, [118, 430, 128, 300, 108, 250, 150, 280, 160, 230, 176, 284, 210, 256, 186, 310, 196, 430]))
  for (const [x, y, r, colour] of [[90, 210, 70, TINT.leaf], [210, 190, 76, TINT.leaf], [150, 150, 78, TINT.leafLight], [70, 150, 50, TINT.leafLight], [250, 250, 46, TINT.leaf]] as const) {
    tint(c, colour, () => oval(c, x, y, r, r * 0.86))
    hatch(c, () => oval(c, x, y, r, r * 0.86), [x, y - r, r, r * 2], 6, -0.8, 0.2)
  }
  for (const [x, y] of [[90, 190], [130, 130], [176, 170], [220, 216], [70, 240], [250, 160], [196, 110]]) { dot(c, x, y, 7, TINT.red); c.lineWidth = 1.2; c.strokeStyle = INK; c.stroke() }

  // A picket fence along the back of the yard.
  stroke(c, [0, 402, 880, 402], 5, '#f1e7cd')
  stroke(c, [0, 402, 880, 402], 1)
  for (let x = 70; x < 880; x += 26) tint(c, '#f6eed8', () => poly(c, [x, 432, x, 386, x + 7, 376, x + 14, 386, x + 14, 432]), 1.3)

  // The barn, with the half-door the farmer leans on, a hayloft and a weathercock.
  const barn = (): void => poly(c, [880, 446, 880, 236, 998, 132, 1120, 236, 1120, 446])
  tint(c, TINT.barn, barn)
  for (let x = 904; x < 1120; x += 24) stroke(c, [x, 446, x, Math.max(152, 236 - (x < 998 ? x - 880 : 1120 - x) * 0.88)], 1)
  hatch(c, barn, [1020, 132, 100, 314], 6)
  tint(c, TINT.roof, () => poly(c, [866, 244, 998, 122, 1134, 244, 1124, 256, 998, 148, 876, 256]))
  tint(c, '#3f2c22', () => c.rect(972, 176, 52, 46))
  tint(c, TINT.straw, () => blob(c, [974, 222, 980, 204, 998, 198, 1018, 206, 1024, 222]), 1.4)
  tint(c, '#f1e7cd', () => { c.rect(DOOR.x - 6, DOOR.y - 6, DOOR.w + 12, DOOR.h + 12) }, 2.2)
  tint(c, '#3f2c22', () => c.rect(DOOR.x, DOOR.y, DOOR.w, 90), 1.6)
  // The dark of the barn behind the half-door, which is a card of its own and swings open (the washing line's rope is drawn live, too).
  tint(c, '#3f2c22', () => c.rect(DOOR.x, DOOR.y + 90, DOOR.w, DOOR.h - 90), 1.6)
  tint(c, TINT.straw, () => blob(c, [DOOR.x + 8, DOOR.y + DOOR.h, DOOR.x + 30, DOOR.y + DOOR.h - 26, DOOR.x + 70, DOOR.y + DOOR.h - 18, DOOR.x + 104, DOOR.y + DOOR.h]), 1.4)
  stroke(c, [998, 122, 998, 96], 2.4)
  tint(c, TINT.gold, () => blob(c, [982, 100, 990, 84, 1004, 80, 1010, 68, 1018, 80, 1012, 92, 1016, 102, 998, 104]), 1.6)

  // The yard floor: grass, the trodden lanes of the goose's round, and the grooves the figures slide in.
  c.fillStyle = TINT.grass
  c.fillRect(0, FLOOR.top + 14, W, H)
  const edge = (): void => blob(c, [-40, 470, -20, 432, 300, 440, 600, 430, 900, 442, 1220, 432, 1240, 470])
  tint(c, TINT.grass, edge, 0)
  const lane = (): void => blob(c, [400, 590, 430, 500, 700, 484, 980, 500, 1010, 590, 980, 656, 700, 668, 430, 656])
  tint(c, TINT.path, lane, 1.2)
  hatch(c, lane, [400, 484, 610, 184], 9, -3, 0.14)
  // The pond, flat on the floor at the front.
  const pond = (): void => blob(c, [300, 724, 318, 690, 440, 678, 562, 690, 584, 724, 562, 760, 440, 770, 318, 760])
  tint(c, TINT.water, pond, 2)
  c.save()
  c.beginPath()
  pond()
  c.clip()
  c.beginPath()
  for (let y = 690; y < 770; y += 9) for (let x = 300 + ((y / 9) % 2) * 22; x < 590; x += 46) { c.moveTo(x, y); c.quadraticCurveTo(x + 11, y - 5, x + 22, y) }
  c.lineWidth = 1.1
  c.globalAlpha = 0.5
  c.strokeStyle = INK
  c.stroke()
  c.restore()
  // Tufts, daisies, stones and molehills, so no stretch of floor is bare print.
  let s = 20261011
  const next = (): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
  for (let i = 0; i < 150; i++) {
    const x = 30 + next() * (W - 60), y = FLOOR.top + 30 + next() * (FLOOR.bottom - FLOOR.top - 40)
    const onPath = x > 420 && x < 990 && y > 496 && y < 660, inPond = x > 290 && x < 596 && y > 672
    if (inPond) continue
    const kind = next()
    if (kind < 0.62) {
      const tall = 7 + next() * 7
      stroke(c, [x - 5, y, x - 7, y - tall * 0.7], 1.2, onPath ? '#a89a62' : '#5f8a48')
      stroke(c, [x, y, x, y - tall], 1.2, onPath ? '#a89a62' : '#5f8a48')
      stroke(c, [x + 5, y, x + 8, y - tall * 0.8], 1.2, onPath ? '#a89a62' : '#5f8a48')
    } else if (kind < 0.84 && !onPath) {
      for (let p = 0; p < 6; p++) dot(c, x + Math.cos(p * 1.05) * 4, y + Math.sin(p * 1.05) * 4, 2.3, '#fffdf4')
      dot(c, x, y, 2.2, TINT.gold)
    } else if (kind < 0.94) {
      tint(c, '#cfc5ad', () => oval(c, x, y, 7 + next() * 5, 4 + next() * 2), 1.2)
    } else if (!onPath) {
      tint(c, '#9a7a52', () => { c.moveTo(x - 16, y); c.quadraticCurveTo(x, y - 20, x + 16, y); c.closePath() }, 1.4)
    }
  }
  for (const y of ROWS) {
    c.fillStyle = '#4d3a28'
    c.fillRect(0, y - 2, W, 5)
    stroke(c, [0, y - 3, W, y - 3], 1.2, '#e9d9a8')
    stroke(c, [0, y + 4, W, y + 4], 1, INK)
  }
  // Each bush keeps a patch of shade under it, so its groove reads where it stands.
  for (const b of BUSHES) tint(c, '#93b56e', () => oval(c, b.x, ROWS[b.row] + 10, 92, 9), 0)
}

function pelmet(c: C): void {
  const W = STAGE.width
  const board = (): void => c.rect(0, 0, W, 40)
  tint(c, TINT.gold, board, 2)
  hatch(c, board, [0, 0, W, 40], 6, 0.8, 0.22)
  for (let x = 40; x < W; x += 80) tint(c, TINT.crimson, () => oval(c, x, 20, 16, 8), 1.4)
  // Swags of crimson with a gold fringe.
  for (let i = 0; i < 8; i++) {
    const x = i * (W / 8), w = W / 8
    const swag = (): void => { c.moveTo(x, 38); c.lineTo(x + w, 38); c.quadraticCurveTo(x + w / 2, 104, x, 38); c.closePath() }
    tint(c, TINT.crimson, swag)
    hatch(c, swag, [x + w / 2, 38, w / 2, 50], 5)
    c.beginPath()
    c.moveTo(x + 14, 44)
    c.quadraticCurveTo(x + w / 2, 84, x + w - 14, 44)
    c.lineWidth = 1.2
    c.strokeStyle = INK
    c.stroke()
    tint(c, TINT.gold, () => oval(c, x, 42, 9, 12), 1.6)
  }
  tint(c, TINT.gold, () => oval(c, W, 42, 9, 12), 1.6)
}

function apron(c: C): void {
  const W = STAGE.width
  const board = (): void => c.rect(0, 8, W, 52)
  tint(c, '#b78b55', board, 2)
  hatch(c, board, [0, 8, W, 52], 7, -0.8, 0.18)
  tint(c, TINT.gold, () => c.rect(0, 4, W, 9), 1.6)
  // A row of shell footlights and carved ovals along the front of the stage.
  for (let x = 60; x < W; x += 106) {
    tint(c, TINT.crimsonDark, () => oval(c, x + 53, 38, 30, 9), 1.4)
    const shell = (): void => { c.moveTo(x - 20, 14); c.quadraticCurveTo(x, -22, x + 20, 14); c.closePath() }
    tint(c, '#f3cf58', shell, 1.8)
    stroke(c, [x, 14, x, -2], 1)
    stroke(c, [x, 14, x - 10, 2], 1)
    stroke(c, [x, 14, x + 10, 2], 1)
  }
}

function curtain(c: C): void {
  // A side curtain tied back: wide at the rod, gathered at the tie, wide again at the floor.
  const cloth = (): void => { c.moveTo(0, 0); c.lineTo(126, 0); c.quadraticCurveTo(112, 220, 70, 392); c.quadraticCurveTo(100, 560, 120, 738); c.lineTo(0, 738); c.closePath() }
  tint(c, TINT.crimson, cloth)
  c.save()
  c.beginPath()
  cloth()
  c.clip()
  c.lineWidth = 1.3
  c.strokeStyle = INK
  c.globalAlpha = 0.6
  for (const [top, bottom] of [[22, 20], [50, 34], [78, 50], [104, 66]]) {
    c.beginPath()
    c.moveTo(top, 0); c.quadraticCurveTo(top - 6, 220, 58 * (top / 104) + 10, 392); c.quadraticCurveTo(bottom + 10, 560, bottom + 24, 738)
    c.stroke()
  }
  c.restore()
  hatch(c, cloth, [0, 0, 44, 738], 6, -0.3, 0.3)
  tint(c, TINT.gold, () => c.roundRect(-4, 378, 82, 22, 9), 1.8)
  tint(c, TINT.gold, () => oval(c, 80, 404, 9, 15), 1.6)
  for (let x = 6; x < 122; x += 12) stroke(c, [x, 738, x, 728], 2, TINT.gold)
}

/** Paints one card into a context whose origin is the card's top left corner, in stage units. */
export function paintCard(id: CardId, c: C): void {
  switch (id) {
    case 'backdrop': return backdrop(c)
    case 'pelmet': return pelmet(c)
    case 'apron': return apron(c)
    case 'curtain': return curtain(c)
    case 'sun': return sun(c)
    case 'cloud': return cloud(c)
    case 'longjohns': return longjohns(c)
    case 'sheet': return sheet(c)
    case 'sock': return sock(c)
    case 'farmer': return farmer(c, false)
    case 'farmerUp': return farmer(c, true)
    case 'scarecrow': return scarecrow(c)
    case 'crow': return crow(c)
    case 'nest': return nest(c)
    case 'bush': return bush(c)
    case 'kennel': return kennel(c)
    case 'bowl': return bowl(c)
    case 'dog': return dog(c)
    case 'dogTail': return dogTail(c)
    case 'lily': return lily(c)
    case 'frog': return frog(c)
    case 'reeds': return reeds(c)
    case 'raccoon': return raccoon(c, false)
    case 'raccoonCarry': return raccoon(c, true)
    case 'raccoonShock': return raccoonShock(c)
    case 'goose': case 'gooseAlert': case 'gooseHonk': case 'gooseKick': case 'gooseStrut': return goose(c, GOOSE[id])
    case 'ball': return ball(c)
    case 'potato': return potato(c)
    case 'clock': return clock(c)
    case 'boot': return boot(c)
    case 'cabbage': return cabbage(c)
    case 'egg': return egg(c)
    case 'peg': return stagePeg(c)
    case 'hand': return hand(c)
    case 'feather': return feather(c)
    case 'leaf': return leaf(c)
    case 'farmerPeek': return farmerPeek(c)
    case 'frogEars': return frogEars(c)
    case 'cabbageHeart': return cabbageHeart(c)
    case 'cabbagePad': return cabbagePad(c)
    case 'collar': return collar(c)
    case 'potatoFace': return potatoFace(c)
    case 'mound': return mound(c)
    case 'sparrow': return sparrow(c)
    case 'bubble': return bubble(c)
    case 'drop': return waterDrop(c)
    case 'splash': return splash(c)
    case 'clod': return clod(c)
    case 'apple': return apple(c)
    case 'sockEgg': return sockEgg(c)
    case 'pole': return pole(c)
    case 'halfDoor': return halfDoor(c)
  }
}

/** Cards that lie flat or fill the stage cast no shadow of their own. */
export const FLAT: readonly CardId[] = ['backdrop', 'pelmet', 'apron', 'lily']
export const CARD_IDS = Object.keys(CARDS) as CardId[]
