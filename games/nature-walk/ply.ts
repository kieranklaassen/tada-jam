import type { Season } from './wood'

// The look, laser-cut plywood layers, as a handful of painters. Every piece
// of the wood is a sheet of pale ply cut to a shape: flat wood with its
// grain, a thin wash of one stain where it has one, a burn just inside the
// cut and a thin burnt line along it, the thickness of the sheet showing its
// plies along the side away from the light, and the shadow it throws on the
// sheet behind it. Detail is engraved: a brown hairline, never a filled
// shape. Nothing here knows the game. Pieces are painted once into sprites;
// no painter runs in a frame.
//
// The light comes from the upper left for every piece, however the piece is
// turned or mirrored when it is stamped: a piece is painted once for each of
// eight ways the light can fall on it (`setLight`), and the view stamps the
// one that fits how the piece stands (`lightFor`).

export type G = CanvasRenderingContext2D
/** Adds one closed outline to the current path. */
export type Path = (g: G) => void
/** Left, top, right, bottom. */
export type Box = readonly [number, number, number, number]

export type Wood = { fill: string; grain: string }

export const WOOD = {
  board: { fill: '#f3e8cb', grain: '#e6d6ae' },
  birch: { fill: '#ecd9b1', grain: '#dbc391' },
  maple: { fill: '#e1c28d', grain: '#cfa970' },
  alder: { fill: '#cf9d68', grain: '#ba8452' },
  walnut: { fill: '#8d603e', grain: '#75492c' },
} as const satisfies Record<string, Wood>

export const SCORCH = '#39220f'
/** The burnt line along a cut, and the three plies that show on the side of a sheet, from the back of the sheet to its face. */
export const BURNT = '#6a4020'
export const PLIES = ['#7d532c', '#ecd6a6', '#a8763f'] as const
export const ENGRAVE = '#6e411d'
export const SHADOW = 'rgba(56, 31, 10, 0.3)'
export const BRASS = '#cda63f'
export const GLOW = '255, 190, 50'

/** The one stain of each season: what the leaves, the grass and the patches on the ground are washed with. */
export const STAIN: Readonly<Record<Season, { leaf: string; other: string; grass: string; float: string }>> = {
  spring: { leaf: '#9fd668', other: '#f5a3bf', grass: '#7cc455', float: '#7cc455' },
  summer: { leaf: '#3d9b56', other: '#f4d24a', grass: '#46a44e', float: '#46a44e' },
  autumn: { leaf: '#ea862a', other: '#cc4129', grass: '#cfa63a', float: '#dd6a2c' },
  winter: { leaf: '#f7fafc', other: '#b5d2e8', grass: '#e2edf4', float: '#d9ecf7' },
}

export type CutOptions = {
  /** The colour of the wash over the wood, if the piece is stained. */
  stain?: string
  /** How strong the wash is, from 0 to 1. */
  wash?: number
  /** How far the piece stands off the sheet behind it: the offset of its shadow. 0 throws none. */
  gap?: number
  /** Whether the grain is drawn. */
  grain?: boolean
  /** The direction of the grain, in radians from level. */
  slant?: number
  seed?: number
  /** The width of the scorched edge. */
  edge?: number
}

// --- The light ------------------------------------------------------------------

const TAU = Math.PI * 2
/** Down and to the right on the screen: where every shadow falls, and the side of a sheet that shows its plies. */
export const FALLS = Math.atan2(1, 0.55)
/** How many ways the light can fall on a painted piece. */
export const LIGHTS = 8
let falls = FALLS

/** Sets which way the light falls on what is painted next, in the piece's own frame: 0 is as on the screen. */
export function setLight(way: number): void {
  falls = FALLS + (way * TAU) / LIGHTS
}

/**
 * Which painted way of a piece to stamp under a transform, so that its shadow falls down and to the right on the
 * screen whatever the turn or the mirror. `a`, `b`, `c` and `d` are the transform's turn and scale, as a canvas has them.
 */
export function lightFor(a: number, b: number, c: number, d: number): number {
  const det = a * d - b * c
  if (Math.abs(det) < 1e-9) return 0
  const x = Math.cos(FALLS), y = Math.sin(FALLS)
  const angle = Math.atan2((-b * x + a * y) / det, (d * x - c * y) / det)
  return ((Math.round((angle - FALLS) / (TAU / LIGHTS)) % LIGHTS) + LIGHTS) % LIGHTS
}

/** The way the light falls, as a unit step in the units a context is drawing in now: a painter that has turned its context still throws its shadow the one way. */
function fall(g: G): { x: number; y: number } {
  const x = Math.cos(falls), y = Math.sin(falls)
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null
  if (!m || typeof m.a !== 'number') return { x, y }
  const det = m.a * m.d - m.b * m.c
  if (Math.abs(det) < 1e-9) return { x, y }
  const lx = (m.d * x - m.c * y) / det, ly = (-m.b * x + m.a * y) / det, long = Math.hypot(lx, ly) || 1
  return { x: lx / long, y: ly / long }
}

/** How thick a sheet shows along its side, from how far it stands off the sheet behind it. */
const thickOf = (gap: number): number => (gap > 0 ? Math.min(6, Math.max(2.6, gap * 0.8)) : 0)

function hash(seed: number, index: number): number {
  let h = (seed * 374761393 + index * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * Grain, across everything inside the clip. Fine, it is thin lines a little darker than the wood, nearly straight,
 * no two the same distance apart. Where a tier leaves the fine grain out, its stand-in is a few broad pale bands
 * the same way: a sheet of wood still, at a third of the strokes.
 */
function grainLines(g: G, box: Box, colour: string, slant: number, seed: number, fine: boolean, strength: number): void {
  const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2
  const half = Math.hypot(box[2] - box[0], box[3] - box[1]) / 2 + 4
  g.save()
  g.translate(cx, cy)
  g.rotate(slant)
  g.strokeStyle = colour
  g.lineWidth = fine ? 1.15 : 3.2
  g.globalAlpha = (fine ? 0.72 : 0.42) * strength
  g.beginPath()
  let line = 0
  for (let y = -half; y < half; y += fine ? 4.5 + hash(seed, line) * 6 : 15 + hash(seed, line) * 12, line++) {
    const phase = hash(seed, line + 500) * 6, depth = 1 + hash(seed, line + 900) * 2.4
    g.moveTo(-half, y)
    if (fine) for (let x = -half + 36; x <= half + 36; x += 36) g.lineTo(x, y + Math.sin(x * 0.011 + phase) * depth)
    else g.lineTo(half, y + Math.sin(phase) * depth * 2)
  }
  g.stroke()
  g.restore()
}

/**
 * One cut piece of ply: its shadow on the sheet behind, the side of the sheet with its three plies, the face with
 * its grain and its stain, the burn inside the cut and the burnt line along it. `box` bounds the outline.
 */
export function cut(g: G, path: Path, wood: Wood, box: Box, options: CutOptions = {}): void {
  const gap = options.gap ?? 5, thick = thickOf(gap)
  if (gap > 0) {
    const way = fall(g)
    const copy = (far: number, paint: () => void): void => { g.save(); g.translate(way.x * far, way.y * far); g.beginPath(); path(g); paint(); g.restore() }
    // The shadow falls from the back of the sheet, so it lies past the sheet's own thickness.
    copy(thick + gap * 0.95, () => { g.fillStyle = SHADOW; g.fill() })
    // The side of the sheet: three plies, the one at the back first. Each is filled and stroked, so that the
    // copies leave no gap between them along a thin part of the outline.
    g.lineJoin = 'round'
    PLIES.forEach((ply, index) => copy(thick * (1 - index / PLIES.length), () => { g.fillStyle = ply; g.fill(); g.strokeStyle = ply; g.lineWidth = thick / PLIES.length; g.stroke() }))
  }
  g.beginPath()
  path(g)
  g.fillStyle = wood.fill
  g.fill()
  g.save()
  g.clip()
  const fine = options.grain ?? true
  if (!options.stain) grainLines(g, box, wood.grain, options.slant ?? 0, options.seed ?? 1, fine, 1)
  if (options.stain) {
    g.globalAlpha = options.wash ?? 0.66
    g.fillStyle = options.stain
    g.fillRect(box[0] - 2, box[1] - 2, box[2] - box[0] + 4, box[3] - box[1] + 4)
    g.globalAlpha = 1
    // The grain shows through a stain: the same lines, in brown, over the wash.
    grainLines(g, box, 'rgb(72, 42, 16)', options.slant ?? 0, options.seed ?? 1, fine, 0.3)
  }
  // The burn just inside the cut: wide and faint, then narrow and darker. The clip keeps both inside.
  g.lineJoin = 'round'
  g.strokeStyle = 'rgba(96, 52, 18, 0.18)'
  g.lineWidth = 13
  g.beginPath()
  path(g)
  g.stroke()
  g.strokeStyle = 'rgba(74, 38, 12, 0.3)'
  g.lineWidth = 5.5
  g.beginPath()
  path(g)
  g.stroke()
  g.restore()
  // The cut itself: a thin burnt line, not a drawn outline. What sets a piece off from the sheet behind it is its
  // thickness and its shadow.
  g.lineJoin = 'round'
  g.strokeStyle = BURNT
  g.lineWidth = Math.max(0.01, (options.edge ?? 2.4) * 0.55)
  g.beginPath()
  path(g)
  g.stroke()
}

/** Engraved detail: a brown hairline along whatever `draw` traces. */
export function engrave(g: G, draw: (g: G) => void, width = 1.7, alpha = 0.85): void {
  g.save()
  g.globalAlpha = alpha
  g.strokeStyle = ENGRAVE
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  draw(g)
  g.stroke()
  g.restore()
}

/** A filled inlay with a scorched ring: an eye socket, a nose, a spot. */
export function inlay(g: G, x: number, y: number, r: number, colour: string, ring = 1.8): void {
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fillStyle = colour
  g.fill()
  if (ring > 0) {
    g.strokeStyle = SCORCH
    g.lineWidth = ring
    g.stroke()
  }
}

/** A brass pin: what a piece of the toy turns on. */
export function rivet(g: G, x: number, y: number, r = 5): void {
  inlay(g, x, y, r, BRASS, 1.4)
  g.beginPath()
  g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2)
  g.fillStyle = '#f7e39a'
  g.fill()
}

/** A round limb cut from ply: a worm, a stalk, a tail. A dark line under a lighter one, along whatever `draw` traces. */
export function tube(g: G, draw: (g: G) => void, width: number, colour: string, gap = 3): void {
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  if (gap > 0) {
    const way = fall(g), thick = Math.min(3, gap)
    g.save()
    g.translate(way.x * (thick + gap * 0.95), way.y * (thick + gap * 0.95))
    g.strokeStyle = SHADOW
    g.lineWidth = width + 3
    g.beginPath()
    draw(g)
    g.stroke()
    g.restore()
    // The side of the limb, away from the light.
    g.save()
    g.translate(way.x * thick, way.y * thick)
    g.strokeStyle = PLIES[0]
    g.lineWidth = width + 2.4
    g.beginPath()
    draw(g)
    g.stroke()
    g.restore()
  }
  g.strokeStyle = BURNT
  g.lineWidth = width + 2.4
  g.beginPath()
  draw(g)
  g.stroke()
  g.strokeStyle = colour
  g.lineWidth = width
  g.beginPath()
  draw(g)
  g.stroke()
  g.restore()
}

// --- Outlines -----------------------------------------------------------------

/** A smooth closed outline through the points, given flat as x, y, x, y. */
export function blob(points: readonly number[]): Path {
  return (g) => {
    const count = points.length / 2
    const px = (i: number) => points[((i % count) + count) % count * 2], py = (i: number) => points[((i % count) + count) % count * 2 + 1]
    g.moveTo((px(0) + px(1)) / 2, (py(0) + py(1)) / 2)
    for (let i = 1; i <= count; i++) g.quadraticCurveTo(px(i), py(i), (px(i) + px(i + 1)) / 2, (py(i) + py(i + 1)) / 2)
    g.closePath()
  }
}

/** A closed outline with straight sides. */
export function poly(points: readonly number[]): Path {
  return (g) => {
    g.moveTo(points[0], points[1])
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1])
    g.closePath()
  }
}

export function disc(x: number, y: number, r: number): Path {
  return (g) => {
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, Math.PI * 2)
    g.closePath()
  }
}

export function oval(x: number, y: number, rx: number, ry: number, turn = 0): Path {
  return (g) => {
    g.moveTo(x + rx * Math.cos(turn), y + rx * Math.sin(turn))
    g.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2)
    g.closePath()
  }
}

/** A ridge of ground: a smooth line through the points from left to right, closed along the bottom. */
export function ridge(points: readonly number[], bottom: number): Path {
  return (g) => {
    const count = points.length / 2
    g.moveTo(points[0], bottom)
    g.lineTo(points[0], points[1])
    for (let i = 1; i < count - 1; i++) g.quadraticCurveTo(points[i * 2], points[i * 2 + 1], (points[i * 2] + points[i * 2 + 2]) / 2, (points[i * 2 + 1] + points[i * 2 + 3]) / 2)
    g.lineTo(points[count * 2 - 2], points[count * 2 - 1])
    g.lineTo(points[count * 2 - 2], bottom)
    g.closePath()
  }
}

/** An open smooth line through the points, for engraving and for limbs. */
export function stroke(points: readonly number[]): (g: G) => void {
  return (g) => {
    const count = points.length / 2
    g.moveTo(points[0], points[1])
    if (count === 2) { g.lineTo(points[2], points[3]); return }
    for (let i = 1; i < count - 1; i++) g.quadraticCurveTo(points[i * 2], points[i * 2 + 1], (points[i * 2] + points[i * 2 + 2]) / 2, (points[i * 2 + 1] + points[i * 2 + 3]) / 2)
    g.lineTo(points[count * 2 - 2], points[count * 2 - 1])
  }
}

/**
 * The bare branches of winter, one for each place a bare branch is engraved, so that no two are the same. Each is
 * a stem that kinks where it forks, a side branch to one side low down and one to the other side higher up, of
 * different lengths, each with a knee, and on some a twig from a knee. All in shares of the branch's length:
 * across from the foot (right is positive) and up from it. `a` and `b` are where the two side branches leave the
 * stem; `armA` and `armB` are each branch's knee and end, from where it leaves; `subA` and `subB` the end of the
 * twig from that knee, if there is one.
 */
export type Branch = { a: readonly [number, number]; b: readonly [number, number]; tip: number; armA: readonly [number, number, number, number]; armB: readonly [number, number, number, number]; subA?: readonly [number, number]; subB?: readonly [number, number] }
export const BRANCHES: readonly Branch[] = [
  // The wheel's winter quarter.
  { a: [0.06, 0.36], b: [-0.02, 0.64], tip: 0.08, armA: [0.2, 0.14, 0.36, 0.38], armB: [-0.14, 0.1, -0.2, 0.28] },
  // The crown of the jay's tree.
  { a: [-0.05, 0.3], b: [0.04, 0.55], tip: -0.04, armA: [-0.2, 0.16, -0.3, 0.42], armB: [0.14, 0.1, 0.26, 0.22], subA: [-0.14, 0.1], subB: [0.02, 0.2] },
  // The bush.
  { a: [0.07, 0.42], b: [0, 0.7], tip: 0.1, armA: [0.24, 0.1, 0.4, 0.3], armB: [-0.18, 0.12, -0.22, 0.3], subA: [0.04, 0.22] },
  // The two patches at the front.
  { a: [-0.04, 0.25], b: [0.05, 0.6], tip: 0, armA: [-0.22, 0.2, -0.3, 0.5], armB: [0.2, 0.08, 0.38, 0.2] },
  { a: [0.03, 0.5], b: [-0.05, 0.74], tip: -0.12, armA: [0.16, 0.18, 0.3, 0.44], armB: [-0.2, 0.06, -0.36, 0.18] },
  // The tree in the window of the room, and the tree in its doorway.
  { a: [0, 0.33], b: [0.06, 0.52], tip: 0.02, armA: [-0.26, 0.12, -0.4, 0.34], armB: [0.18, 0.16, 0.24, 0.36], subA: [-0.02, 0.2], subB: [0.14, 0.02] },
  { a: [-0.06, 0.44], b: [-0.02, 0.66], tip: 0.06, armA: [0.16, 0.16, 0.2, 0.36], armB: [-0.24, 0.1, -0.42, 0.26], subB: [-0.04, 0.18] },
]

/** Which of the branches each place that shows a bare branch engraves: each its own. */
export const BRANCH_OF = { wheel: 0, crown: 1, bush: 2, patchC: 3, patchD: 4, window: 5, doorway: 6 } as const

/**
 * A bare branch, for engraving: `BRANCHES[which]`, from its foot at `x`, `y`, `long` from foot to tip and leaning
 * by `turn`. It forks as a branch does: never two side branches from one point, and never two on one side of the stem.
 */
export function twig(x: number, y: number, long: number, turn: number, which: number): (g: G) => void {
  const cos = Math.cos(turn), sin = Math.sin(turn), branch = BRANCHES[which % BRANCHES.length]
  const at = (u: number, v: number): [number, number] => [x + (u * cos + v * sin) * long, y + (u * sin - v * cos) * long]
  return (g) => {
    const line = (points: readonly (readonly [number, number])[]): void => points.forEach(([u, v], index) => (index === 0 ? g.moveTo(...at(u, v)) : g.lineTo(...at(u, v))))
    line([[0, 0], branch.a, branch.b, [branch.tip, 1]])
    for (const [from, arm, sub] of [[branch.a, branch.armA, branch.subA], [branch.b, branch.armB, branch.subB]] as const) {
      const knee = [from[0] + arm[0], from[1] + arm[1]] as const
      line([from, knee, [from[0] + arm[2], from[1] + arm[3]]])
      if (sub) line([knee, [knee[0] + sub[0], knee[1] + sub[1]]])
    }
  }
}

/** A short open curve for engraving, `wide` from end to end and `deep` at its middle, turned by `turn` about its middle. */
export function tick(x: number, y: number, wide: number, deep: number, turn: number): (g: G) => void {
  const cos = Math.cos(turn), sin = Math.sin(turn)
  const at = (u: number, v: number): [number, number] => [x + u * cos - v * sin, y + u * sin + v * cos]
  return stroke([...at(-wide / 2, 0), ...at(0, deep), ...at(wide / 2, 0)])
}

/** The bounds of a flat list of points, with a margin. */
export function boundsOf(points: readonly number[], margin = 0): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < points.length; i += 2) {
    x0 = Math.min(x0, points[i]); x1 = Math.max(x1, points[i])
    y0 = Math.min(y0, points[i + 1]); y1 = Math.max(y1, points[i + 1])
  }
  return [x0 - margin, y0 - margin, x1 + margin, y1 + margin]
}

/** A ring of teeth or spines: points that step out and in round a centre, from one angle to another. */
export function spiked(cx: number, cy: number, inner: number, outer: number, count: number, from = 0, to = Math.PI * 2, squash = 1): number[] {
  const points: number[] = []
  for (let i = 0; i <= count * 2; i++) {
    const angle = from + ((to - from) * i) / (count * 2), r = i % 2 === 0 ? inner : outer
    points.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * squash)
  }
  return points
}
