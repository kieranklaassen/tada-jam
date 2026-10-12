import { makeRng, type Rng } from './rng'

// The woodblock print, as a handful of primitives every painter uses: flat
// colours that fade by a hand-wiped gradation, wood grain showing in the
// flats, and one thin indigo key line over everything. A thing that stands
// still is printed once into a sheet and stamped; only what moves is drawn
// with the pen each frame. The tally counts both, and that count is the
// game's draw count (frameBudget.test.ts).

export type G = CanvasRenderingContext2D

/** A canvas, or in a test something that records what is drawn into it. */
export type Sheet = { width: number; height: number; getContext(kind: '2d'): unknown }

let makeSheet = (width: number, height: number): Sheet => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/** A test hands in its own canvases, which record instead of drawing. */
export function useCanvases(make: (width: number, height: number) => Sheet): void {
  makeSheet = make
}

/** What a frame cost: sheets stamped, and strokes and fills of the pen. */
export const tally = { stamps: 0, pen: 0 }

export const INK = {
  paper: '#eadfc6',
  line: '#22345c',
  indigo: '#2b4f86',
  water: '#3f74a8',
  waterPale: '#c3d9d4',
  sky: '#dfe3d2',
  blush: '#e9a98d',
  red: '#d2492f',
  redDeep: '#a8321f',
  moss: '#6f9463',
  mossDeep: '#3f6b52',
  pine: '#2f5a4c',
  ochre: '#d8a544',
  sand: '#ecd6a4',
  bark: '#9a6a43',
  barkDeep: '#6c452b',
  stone: '#a7aaa2',
  stoneDeep: '#74797a',
  white: '#f6f0de',
  skin: '#f0c9a0',
  teal: '#2f8f9a',
  orange: '#e0863a',
  frog: '#86ad52',
  frogDeep: '#4f7f45',
  sprite: '#9fd0cf',
  spriteDeep: '#4c93ad',
} as const

/** A printed thing: its sheet, its size in stage units, and the point of it that is placed. */
export type Stamp = { sheet: Sheet; w: number; h: number; ax: number; ay: number }

/**
 * Prints a thing once. `paint` draws in stage units with the anchor at 0, 0, inside a box that reaches `left`
 * and `up` from the anchor and is `w` by `h`. The sheet holds `density` pixels a unit.
 */
export function printOnce(w: number, h: number, left: number, up: number, density: number, paint: (g: G) => void): Stamp {
  const sheet = makeSheet(Math.ceil(w * density), Math.ceil(h * density))
  const g = sheet.getContext('2d') as G
  g.setTransform(density, 0, 0, density, left * density, up * density)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  paint(g)
  return { sheet, w, h, ax: left, ay: up }
}

/** Stamps a printed thing with its anchor at x, y, turned and stretched about that point. */
export function stamp(g: G, s: Stamp, x: number, y: number, turn = 0, sx = 1, sy = 1): void {
  tally.stamps += 1
  if (turn === 0 && sx === 1 && sy === 1) {
    g.drawImage(s.sheet as CanvasImageSource, x - s.ax, y - s.ay, s.w, s.h)
    return
  }
  g.save()
  g.translate(x, y)
  if (turn) g.rotate(turn)
  if (sx !== 1 || sy !== 1) g.scale(sx, sy)
  g.drawImage(s.sheet as CanvasImageSource, -s.ax, -s.ay, s.w, s.h)
  g.restore()
}

/** A smooth line through points given as x, y pairs; closed when asked. */
export function trace(g: G, points: readonly number[], closed = false): void {
  const n = points.length / 2
  g.beginPath()
  if (n < 2) return
  const px = (i: number): number => points[((i + n) % n) * 2], py = (i: number): number => points[((i + n) % n) * 2 + 1]
  if (closed) {
    g.moveTo((px(n - 1) + px(0)) / 2, (py(n - 1) + py(0)) / 2)
    for (let i = 0; i < n; i++) g.quadraticCurveTo(px(i), py(i), (px(i) + px(i + 1)) / 2, (py(i) + py(i + 1)) / 2)
    g.closePath()
    return
  }
  g.moveTo(px(0), py(0))
  for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(px(i), py(i), (px(i) + px(i + 1)) / 2, (py(i) + py(i + 1)) / 2)
  g.lineTo(px(n - 1), py(n - 1))
}

/** A straight-edged shape through points given as x, y pairs. */
export function shape(g: G, points: readonly number[]): void {
  g.beginPath()
  g.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1])
  g.closePath()
}

export function oval(g: G, x: number, y: number, rx: number, ry: number, turn = 0): void {
  g.beginPath()
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), turn, 0, Math.PI * 2)
}

/** Fills the path in one flat colour. */
export function flat(g: G, colour: string): void {
  tally.pen += 1
  g.fillStyle = colour
  g.fill()
}

/** Fills the path with a hand-wiped gradation from `from` at `y0` to `to` at `y1`. */
export function wiped(g: G, from: string, to: string, y0: number, y1: number): void {
  tally.pen += 1
  const fade = g.createLinearGradient(0, y0, 0, y1)
  fade.addColorStop(0, from)
  fade.addColorStop(1, to)
  g.fillStyle = fade
  g.fill()
}

/** The key line: one thin indigo stroke along the path. */
export function line(g: G, width = 2.2, colour: string = INK.line): void {
  tally.pen += 1
  g.strokeStyle = colour
  g.lineWidth = width
  g.stroke()
}

let grainTile: Sheet | null = null

/** The grain of the block: long lines that run with the wood, cut once and laid over every flat. */
function grain(): Sheet {
  if (grainTile) return grainTile
  const size = 256
  const tile = makeSheet(size * 2, size)
  const g = tile.getContext('2d') as G
  const chance = makeRng(77)
  g.lineCap = 'round'
  for (let row = 0; row < 46; row++) {
    const y = (row + chance.next() * 0.8) * (size / 46)
    const sway = 1.5 + chance.next() * 4, knot = chance.next() * size * 2
    g.beginPath()
    for (let x = -8; x <= size * 2 + 8; x += 16) {
      // The line bows round a knot, and comes back to the same height at both edges, so the tile repeats.
      const lift = Math.sin((x / (size * 2)) * Math.PI * 2 + row) * sway + 9 * Math.exp(-((x - knot) ** 2) / 2600) * (row % 5 === 0 ? 1 : 0)
      if (x === -8) g.moveTo(x, y + lift)
      else g.lineTo(x, y + lift)
    }
    g.strokeStyle = row % 3 === 0 ? 'rgba(60,45,30,0.5)' : 'rgba(255,250,235,0.45)'
    g.lineWidth = 0.7 + chance.next() * 1.3
    g.stroke()
  }
  grainTile = tile
  return tile
}

/** Lays the grain over whatever is already printed on the sheet, and nowhere else. */
export function grained(g: G, left: number, top: number, w: number, h: number, strength = 0.16): void {
  const pattern = g.createPattern(grain() as CanvasImageSource, 'repeat')
  if (!pattern) return
  g.save()
  g.globalCompositeOperation = 'source-atop'
  g.globalAlpha = strength
  g.fillStyle = pattern
  g.fillRect(left, top, w, h)
  g.restore()
}

/** The chance the painters draw from: the same print on every machine and every visit. */
export function artChance(seed: number): Rng {
  return makeRng(seed)
}

/** Stamps a strip of a printed thing: `sw` units of it from `sx` across, at x, y. A row of water lines slides this way. */
export function stampStrip(g: G, s: Stamp, sx: number, sw: number, x: number, y: number): void {
  tally.stamps += 1
  const density = s.sheet.width / s.w
  g.drawImage(s.sheet as CanvasImageSource, sx * density, 0, sw * density, s.sheet.height, x, y, sw, s.h)
}

/** Stamps a printed thing leaning: every row is shifted by `lean` units for each unit it stands above `footY`. A reed bed bends this way. */
export function stampLeaning(g: G, s: Stamp, x: number, y: number, lean: number, footY: number): void {
  tally.stamps += 1
  g.save()
  g.transform(1, 0, -lean, 1, lean * footY, 0)
  g.drawImage(s.sheet as CanvasImageSource, x - s.ax, y - s.ay, s.w, s.h)
  g.restore()
}
