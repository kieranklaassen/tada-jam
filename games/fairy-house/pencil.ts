import type { Rng } from './rng'

// Coloured pencil. A shape is filled with layered hatching in three pressures
// of one hue: a light layer over all of it but the lit part, which stays
// white paper; a second layer across the first where the form turns from the
// light; and short strokes pressed hard in the deepest shade. A soft contour
// in the hue's own dark holds the edge; there is no ink line and no wash.
//
// Everything here is drawn once, into a sprite or into the scenery, when the
// surface is sized. No frame hatches anything.

export type Pen = CanvasRenderingContext2D

/** One pencil at three pressures. */
export type Hue = { light: string; mid: string; dark: string }

export type Box = { x: number; y: number; w: number; h: number }

/** Traces a closed path on the pen. */
export type Shape = (g: Pen) => void

export type Shading = {
  /** The way the first layer of strokes leans, in radians. */
  angle?: number
  /** Stage units between two strokes of a layer. */
  gap?: number
  /** The share of the shape, from the lit side, that is left as white paper. */
  bare?: number
  /** How strongly the shade grows across the shape: 0 is flat colour, 1 runs from paper to the darkest. */
  depth?: number
  /** Where the light comes from, as the share of shade a step right and a step down adds. */
  across?: number
  down?: number
  /** How hard the whole shape is pressed, 0 to 1. Scenery is pressed lightly and stays behind the things. */
  press?: number
  /** Whether the contour is drawn, and how strongly. */
  edge?: number
  /** The width of a stroke, in stage units. */
  width?: number
}

const clamp = (v: number): number => Math.min(1, Math.max(0, v))

/** One layer of hatching over `box`, drawn where `strength` says and as strongly: strokes are sorted into a few pressures and each pressure is one path. */
function layer(g: Pen, rng: Rng, box: Box, angle: number, gap: number, colour: string, width: number, strength: (x: number, y: number) => number, piece: number): void {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2
  const reach = Math.hypot(box.w, box.h) / 2 + gap
  const levels = [0.3, 0.55, 0.85]
  const paths: number[][] = [[], [], []]
  for (let across = -reach; across <= reach; across += gap * (0.8 + 0.4 * rng.next())) {
    // A stroke is a run of short pieces, each as strong as the shade where it lies; the hand lifts now and then.
    for (let along = -reach + rng.next() * piece; along < reach; ) {
      const length = piece * (0.7 + 0.6 * rng.next())
      const ax = cx + cos * along - sin * across, ay = cy + sin * along + cos * across
      const bx = ax + cos * length, by = ay + sin * length
      along += length
      if (ax < box.x - piece && bx < box.x - piece) continue
      if (ay < box.y - piece && by < box.y - piece) continue
      if (ax > box.x + box.w + piece && bx > box.x + box.w + piece) continue
      if (ay > box.y + box.h + piece && by > box.y + box.h + piece) continue
      const s = strength((ax + bx) / 2, (ay + by) / 2) * (0.75 + 0.5 * rng.next())
      if (s < 0.12 || rng.next() < 0.06) continue
      const wobble = (rng.next() - 0.5) * gap * 0.5
      paths[s < 0.42 ? 0 : s < 0.72 ? 1 : 2].push(ax - sin * wobble, ay + cos * wobble, bx - sin * wobble, by + cos * wobble)
    }
  }
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    const path = paths[i]
    if (path.length === 0) continue
    g.globalAlpha = levels[i]
    g.beginPath()
    for (let k = 0; k < path.length; k += 4) {
      g.moveTo(path[k], path[k + 1])
      g.lineTo(path[k + 2], path[k + 3])
    }
    g.stroke()
  }
  g.globalAlpha = 1
}

/** Fills `shape` in coloured pencil. `box` is the room the shape takes, in the pen's units. */
export function pencil(g: Pen, rng: Rng, shape: Shape, box: Box, hue: Hue, shading: Shading = {}): void {
  const { angle = -0.9, gap = 2.6, bare = 0.16, depth = 1, across = 0.45, down = 0.8, press = 1, edge = 0.5, width = 1.7 } = shading
  // 0 on the lit side, 1 in the deepest shade.
  const shade = (x: number, y: number): number => clamp(0.5 + (((x - box.x) / box.w - 0.5) * across + ((y - box.y) / box.h - 0.5) * down) * depth * 1.5)
  g.save()
  shape(g)
  g.clip()
  layer(g, rng, box, angle, gap, hue.light, width, (x, y) => (shade(x, y) < bare ? 0 : press * (0.5 + 0.5 * shade(x, y))), 13)
  layer(g, rng, box, angle + 0.55, gap * 1.15, hue.mid, width, (x, y) => press * clamp((shade(x, y) - 0.34) * 1.7), 11)
  layer(g, rng, box, angle - 0.35, gap * 1.3, hue.dark, width * 1.15, (x, y) => press * clamp((shade(x, y) - 0.7) * 2.6), 7)
  g.restore()
  if (edge > 0) contour(g, rng, shape, hue.dark, edge * press, width)
}

/** The soft contour of a shape: the hue's own dark, twice and a little apart, as a pencil goes round an edge. */
export function contour(g: Pen, rng: Rng, shape: Shape, colour: string, strength: number, width = 1.7): void {
  g.save()
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let pass = 0; pass < 2; pass++) {
    g.globalAlpha = strength * (pass === 0 ? 0.9 : 0.45)
    g.translate((rng.next() - 0.5) * 1.2, (rng.next() - 0.5) * 1.2)
    shape(g)
    g.stroke()
  }
  g.restore()
}

/** A single pencil line through points, pressed as given: a rib of a leaf, a crack in bark, a blade of grass. */
export function line(g: Pen, points: readonly number[], colour: string, strength: number, width = 1.7): void {
  g.save()
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.globalAlpha = strength
  g.beginPath()
  g.moveTo(points[0], points[1])
  if (points.length === 6) g.quadraticCurveTo(points[2], points[3], points[4], points[5])
  else for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1])
  g.stroke()
  g.restore()
}

/** An ellipse as a shape. */
export function oval(cx: number, cy: number, rx: number, ry: number, turn = 0): Shape {
  return (g) => {
    g.beginPath()
    g.ellipse(cx, cy, rx, ry, turn, 0, Math.PI * 2)
    g.closePath()
  }
}

/** A closed shape through points, with its corners rounded: every second pair is a point the outline bends round. */
export function blob(points: readonly number[]): Shape {
  return (g) => {
    const count = points.length / 2
    g.beginPath()
    for (let i = 0; i < count; i++) {
      const ax = points[i * 2], ay = points[i * 2 + 1]
      const bx = points[((i + 1) % count) * 2], by = points[((i + 1) % count) * 2 + 1]
      const mx = (ax + bx) / 2, my = (ay + by) / 2
      if (i === 0) g.moveTo(mx, my)
      else g.quadraticCurveTo(ax, ay, mx, my)
    }
    g.quadraticCurveTo(points[0], points[1], (points[0] + points[2]) / 2, (points[1] + points[3]) / 2)
    g.closePath()
  }
}

/** A closed shape with straight sides. */
export function polygon(points: readonly number[]): Shape {
  return (g) => {
    g.beginPath()
    g.moveTo(points[0], points[1])
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1])
    g.closePath()
  }
}

/** The room a list of points takes, with a margin. */
export function boxOf(points: readonly number[], margin = 0): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < points.length; i += 2) {
    x0 = Math.min(x0, points[i]); x1 = Math.max(x1, points[i])
    y0 = Math.min(y0, points[i + 1]); y1 = Math.max(y1, points[i + 1])
  }
  return { x: x0 - margin, y: y0 - margin, w: x1 - x0 + 2 * margin, h: y1 - y0 + 2 * margin }
}

/** The pencils of the game. Each hue is one pencil at three pressures. */
export const HUES = {
  paper: '#fdfaf2',
  sky: { light: '#bcd9ee', mid: '#8fbadf', dark: '#5f93c4' },
  farWood: { light: '#c9d6c4', mid: '#a3bba6', dark: '#7d9a8b' },
  farTrunk: { light: '#d3cbd6', mid: '#b3a7bd', dark: '#8d809c' },
  bush: { light: '#b5d48a', mid: '#86b45c', dark: '#4f7f3c' },
  fern: { light: '#9fcf7a', mid: '#5fa24a', dark: '#2f6a37' },
  hill: { light: '#d6e6a4', mid: '#b3cf79', dark: '#86a955' },
  trunk: { light: '#dcb48c', mid: '#b98558', dark: '#7c4f33' },
  root: { light: '#d4a87e', mid: '#ad7a4f', dark: '#6f452d' },
  hollow: { light: '#f3e3c2', mid: '#e3c99a', dark: '#b89366' },
  hollowRim: { light: '#c79c6f', mid: '#9a6b45', dark: '#5d3a26' },
  earth: { light: '#ecdcae', mid: '#d9c183', dark: '#b3975c' },
  grass: { light: '#b9d67f', mid: '#8fb954', dark: '#5f8a36' },
  toadstool: { light: '#f29a85', mid: '#e0563f', dark: '#a8301f' },
  stalk: { light: '#f6ecd6', mid: '#e3d2ad', dark: '#b79f74' },
  sun: { light: '#ffe58a', mid: '#fdc540', dark: '#e99a1c' },
  // The found things: the plainest and strongest pencils on the page.
  leaf: { light: '#f8c45a', mid: '#ee9a2e', dark: '#b8611a' },
  cap: { light: '#c99a66', mid: '#9b6a3c', dark: '#5f3c20' },
  capInside: { light: '#ecd2a8', mid: '#cfa878', dark: '#9b7448' },
  pebble: { light: '#c3ccd8', mid: '#93a1b5', dark: '#5d6b82' },
  bark: { light: '#c08462', mid: '#8f5238', dark: '#57301f' },
  twig: { light: '#b89878', mid: '#86684a', dark: '#4e3a28' },
  moss: { light: '#a9d65c', mid: '#6fb234', dark: '#3d7a1e' },
  feather: { light: '#a9d2f2', mid: '#5b9fe0', dark: '#2a5fa8' },
  water: { light: '#b5e1f5', mid: '#6cc0ea', dark: '#2f8fc4' },
  glow: { light: '#fff0a8', mid: '#ffd95c', dark: '#f5b62a' },
  // The three folk.
  skin: { light: '#fbdcc4', mid: '#f2b999', dark: '#c9825f' },
  fatCoat: { light: '#f3a878', mid: '#dc6f43', dark: '#9c4124' },
  fatCap: { light: '#8fd6cf', mid: '#3fa9a5', dark: '#1f6f72' },
  pillow: { light: '#f7efe0', mid: '#e6d6ba', dark: '#b9a27a' },
  tidyCoat: { light: '#c5a2d8', mid: '#93609f', dark: '#5d3570' },
  tidyHat: { light: '#8fb58a', mid: '#4f8257', dark: '#2a5236' },
  tin: { light: '#d7dde2', mid: '#a9b4bd', dark: '#6e7b86' },
  tinyCoat: { light: '#9ccdf3', mid: '#4f9be0', dark: '#2a62a6' },
  tinyHat: { light: '#f49a8a', mid: '#e2493d', dark: '#a52a22' },
  towel: { light: '#fff3c2', mid: '#f7d874', dark: '#d1a83c' },
  boot: { light: '#9c8468', mid: '#6b543c', dark: '#3f3022' },
  // Bystanders.
  owl: { light: '#d9c3a0', mid: '#b3946a', dark: '#6f573a' },
  snail: { light: '#f1cf9a', mid: '#d99f5c', dark: '#9c6a30' },
  moth: { light: '#f7e9f4', mid: '#e3b8d9', dark: '#b07aa6' },
  ink: '#4a3a33',
  shadow: { light: '#b9b3c9', mid: '#9089a8', dark: '#6c6488' },
  // The dusk, laid over the whole wood.
  dusk: { light: '#9a9bd0', mid: '#6f70b4', dark: '#4a4a8c' },
} as const
