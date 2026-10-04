import { TRAY, bays } from './layout'
import { INK, hatch, pin, rule, stream, type Pen } from './look'
import { waterDrift } from './motion'
import { WATER } from './pose'
import { COLS, ROWS, type Site } from './sites'
import { paintDesk, paintUnderground, paintValley } from './valley'

// The drawing sheet under the parts: the blue, the faint grid, the ground in
// section, the water, the cliffs, and the draughtsman's marks, without any
// lettering. It is painted once for each size, never per frame.

/** How the grid lies on the surface: the pixel size of a cell and the pixel place of grid point (0, 0). */
export type Plot = { cell: number; ox: number; oy: number }

/** Cells kept free round the grid: a margin each side, the tray below. */
export const MARGIN = { side: 1.2, top: 0.7, below: 3.9 } as const

export function plotFor(width: number, height: number): Plot {
  const cell = Math.min(width / (COLS + 2 * MARGIN.side), height / (ROWS + MARGIN.top + MARGIN.below))
  return { cell, ox: (width - COLS * cell) / 2, oy: (height - (ROWS + MARGIN.top + MARGIN.below) * cell) / 2 + (ROWS + MARGIN.top) * cell }
}

export const px = (plot: Plot, x: number, y: number): [number, number] => [plot.ox + x * plot.cell, plot.oy - y * plot.cell]

/** The ground in section as one outline, in grid cells: banks, any ledges, the river bed and any rock. */
export function groundOutline(at: Site): [number, number][] {
  const deck = at.left[1], lip = at.left[0], far = at.right[0], floor = -0.7
  const points: [number, number][] = [[-MARGIN.side, floor], [-MARGIN.side, deck], [lip, deck]]
  let height = deck
  // Down the left wall: each lower column is a ledge whose outer corner is its grid point.
  for (let x = lip + 1; x < far && at.ground[x] > 0 && at.ground[x] < height && at.ground[x - 1] > at.ground[x] && x - lip <= 3; x++) {
    points.push([x - 1, at.ground[x]], [x, at.ground[x]]); height = at.ground[x]
  }
  const leftFoot = points[points.length - 1][0]
  points.push([leftFoot, 0])
  // Up the right wall, found the same way from the far lip.
  const right: [number, number][] = []
  height = deck
  for (let x = far - 1; x > lip && at.ground[x] > 0 && at.ground[x] < height && at.ground[x + 1] > at.ground[x] && far - x <= 3; x--) {
    right.push([x + 1, at.ground[x]], [x, at.ground[x]]); height = at.ground[x]
  }
  const rightFoot = right.length ? right[right.length - 1][0] : far
  // A rock stands alone on the bed.
  for (let x = leftFoot + 1; x < rightFoot; x++) {
    if (at.ground[x] > 0) points.push([x - 0.5, 0], [x - 0.32, at.ground[x] - 0.25], [x - 0.12, at.ground[x]], [x + 0.14, at.ground[x]], [x + 0.36, at.ground[x] - 0.3], [x + 0.5, 0])
  }
  points.push([rightFoot, 0], ...right.reverse(), [far, deck], [COLS + MARGIN.side, deck], [COLS + MARGIN.side, floor])
  return points
}

/**
 * Paints the whole still sheet. For the toy (`live`), the water is left out,
 * since it drifts and is drawn each frame, and the tray's box is drawn in.
 */
export function paintSheet(pen: Pen, width: number, height: number, plot: Plot, at: Site, seed: number, live = false) {
  const random = stream(seed), { cell } = plot
  pen.fillStyle = INK.sheet
  pen.fillRect(0, 0, width, height)
  // A cyanotype is never even: the blue pools darker and washes paler in broad patches.
  for (let i = 0; i < 26; i++) {
    const x = random() * width, y = random() * height, r = (0.15 + 0.3 * random()) * Math.max(width, height)
    const wash = pen.createRadialGradient(x, y, 0, x, y, r)
    const colour = random() < 0.5 ? INK.sheetDeep : INK.sheetPale
    wash.addColorStop(0, colour); wash.addColorStop(1, colour + '00')
    pen.globalAlpha = 0.16
    pen.fillStyle = wash
    pen.fillRect(x - r, y - r, 2 * r, 2 * r)
  }
  pen.globalAlpha = 1

  // The faint grid, every fourth line a little firmer.
  for (let x = 0; x <= COLS; x++) rule(pen, ...px(plot, x, -0.7), ...px(plot, x, ROWS), cell * 0.014, x % 4 === 0 ? 0.26 : 0.13, random)
  for (let y = 0; y <= ROWS; y++) rule(pen, ...px(plot, 0, y), ...px(plot, COLS, y), cell * 0.014, y % 4 === 2 ? 0.26 : 0.13, random)
  // The sheet's border, ruled twice, as on any drawing.
  const inset = cell * 0.3
  for (const [gap, weight] of [[0, 0.05], [cell * 0.14, 0.02]] as const) {
    const i = inset + gap
    rule(pen, i, i, width - i, i, cell * weight, 0.8, random); rule(pen, width - i, i, width - i, height - i, cell * weight, 0.8, random)
    rule(pen, width - i, height - i, i, height - i, cell * weight, 0.8, random); rule(pen, i, height - i, i, i, cell * weight, 0.8, random)
  }

  // The valley the gap is in: far hills, trees and a fence, behind everything and fainter than everything.
  if (live) paintValley(pen, plot, at)

  // Cliffs stand behind the road: drawn first and fainter, each with its footing.
  for (const [ax, ay] of at.anchors) {
    const deck = at.left[1], lean = ax < COLS / 2 ? -1 : 1
    const spire = [[ax - 1.3 * lean, deck], [ax - 0.9 * lean, deck + (ay - deck) * 0.55], [ax - 0.25 * lean, ay + 0.15], [ax + 0.2 * lean, ay + 0.6], [ax + 0.9 * lean, ay + 0.2], [ax + 1.5 * lean, deck + (ay - deck) * 0.4], [ax + 1.9 * lean, deck]].map(([x, y]) => px(plot, x, y))
    hatch(pen, spire, cell * 0.3, cell * 0.014, 0.3)
    spire.forEach((point, i) => { if (i) rule(pen, ...spire[i - 1], ...point, cell * 0.035, 0.6, random) })
  }

  // The ground, cut through: a firm outline and section hatching.
  const ground = groundOutline(at).map(([x, y]) => px(plot, x, y))
  hatch(pen, ground, cell * 0.2, cell * 0.016, 0.42)
  for (let i = 2; i < ground.length - 1; i++) rule(pen, ...ground[i - 1], ...ground[i], cell * 0.055, 1, random)

  if (live) { paintUnderground(pen, plot, at); paintDesk(pen, plot, at); trayBox(pen, plot, at, random) }
  else water(pen, plot, at, 0)

  // The draughtsman's mark, with no figure on it: the gap's centre line. There is no dimension line over the gap: with
  // witness lines it read as letters, and whole it made a cross with the grid's rule through the gap's middle.
  const lip = at.left[0], far = at.right[0]
  const mid = (lip + far) / 2, deck = at.left[1]
  // Even dashes: a long dash over a dot, one above another, would read as a column of letters.
  // Each dash lies inside one cell of the grid, clear of the rules above and below it: none crosses a rule or ends on one.
  for (let row = deck - 1; row < deck + 3; row++) rule(pen, ...px(plot, mid, row + 0.35), ...px(plot, mid, row + 0.65), cell * 0.018, 0.45, random)
  for (const [ax, ay] of at.anchors) pin(pen, ...px(plot, ax, ay), cell, true)
}

/** The rows of the water: how far under the surface, how long a dash, how strong. */
const WAVES = [[0, 1.1, 0.9], [0.32, 0.5, 0.6], [0.62, 0.3, 0.42], [0.9, 0.18, 0.3]] as const

/** The water between the banks: its surface as a long broken line and shorter dashes under it, each row drifting at its own pace. */
export function water(pen: Pen, plot: Plot, at: Site, seconds: number) {
  const lip = at.left[0], far = at.right[0], { cell } = plot
  /** No water is drawn through a rock or a ledge. */
  const wet = (x: number) => x > lip + 0.15 && x < far - 0.15 && at.ground[Math.round(x)] < WATER - 0.9
  pen.strokeStyle = INK.line
  pen.lineCap = 'round'
  pen.lineWidth = cell * 0.03
  WAVES.forEach(([depth, dash, alpha], row) => {
    pen.globalAlpha = alpha
    pen.beginPath()
    const period = dash * 1.6, shift = ((waterDrift(seconds, row) % period) + period) % period
    for (let x = lip - period + shift + depth; x < far; x += period) {
      if (!wet(x) || !wet(x + dash)) continue
      const [x0, y0] = px(plot, x, WATER - depth), [x1] = px(plot, x + dash, WATER - depth)
      pen.moveTo(x0, y0); pen.lineTo(x1, y0)
    }
    pen.stroke()
  })
  pen.globalAlpha = 1
}

/** The tray under the gap: a ruled box, a shade darker inside, with a line between the piles. */
export function trayBox(pen: Pen, plot: Plot, at: Site, random: () => number) {
  const { cell } = plot, piles = bays(at)
  if (piles.length === 0) return
  const [x0, y0] = px(plot, piles[0].x0, TRAY.top), [x1, y1] = px(plot, piles[piles.length - 1].x1, TRAY.top - TRAY.tall)
  pen.fillStyle = INK.sheetDeep
  pen.globalAlpha = 0.55
  pen.beginPath(); pen.roundRect(x0, y0, x1 - x0, y1 - y0, cell * 0.12); pen.fill()
  pen.globalAlpha = 1
  const corners: [number, number][] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
  corners.forEach((from, i) => rule(pen, ...from, ...corners[(i + 1) % 4], cell * 0.04, 0.9, random))
  for (const pile of piles.slice(1)) { const [x] = px(plot, pile.x0, 0); rule(pen, x, y0 + cell * 0.2, x, y1 - cell * 0.2, cell * 0.02, 0.5, random) }
}

/**
 * The height of the ground at an x between grid columns, as it is drawn: the
 * top of the outline above. At a wall, where the outline stands upright, the
 * lower side is given, so a part may lie along the wall and not inside it.
 */
export function groundAt(at: Site, x: number): number {
  const outline = groundOutline(at)
  let height = -Infinity, wall = Infinity
  for (let i = 1; i < outline.length; i++) {
    const [x0, y0] = outline[i - 1], [x1, y1] = outline[i]
    if (x0 === x1) { if (x === x0) wall = Math.min(wall, y0, y1); continue }
    if (x >= Math.min(x0, x1) && x <= Math.max(x0, x1)) height = Math.max(height, y0 + ((y1 - y0) * (x - x0)) / (x1 - x0))
  }
  return wall < Infinity ? wall : height > -Infinity ? height : at.left[1]
}
