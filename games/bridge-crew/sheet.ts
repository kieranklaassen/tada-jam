import { INK, hatch, pin, rule, stream, type Pen } from './look'
import { COLS, ROWS, type Site } from './sites'

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

export function paintSheet(pen: Pen, width: number, height: number, plot: Plot, at: Site, seed: number) {
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

  // The water: its surface as a long broken line, and shorter dashes under it.
  const lip = at.left[0], far = at.right[0], level = 2.05
  /** No water is drawn through a rock or a ledge. */
  const wet = (x: number) => at.ground[Math.round(x)] < level - 0.9
  for (const [depth, dash, alpha] of [[0, 1.1, 0.9], [0.32, 0.5, 0.6], [0.62, 0.3, 0.42], [0.9, 0.18, 0.3]] as const) {
    for (let x = lip + 0.2 + depth; x < far - 0.2 - dash; x += dash * 1.6) {
      if (!wet(x + dash / 2)) continue
      rule(pen, ...px(plot, x, level - depth), ...px(plot, x + dash, level - depth), cell * 0.03, alpha, random)
    }
  }

  // The draughtsman's marks, with no figures on them: the gap's centre line and its dimension line.
  const mid = (lip + far) / 2, deck = at.left[1]
  for (let y = deck - 0.6; y < deck + 3.2; y += 0.55) rule(pen, ...px(plot, mid, y), ...px(plot, mid, y + (Math.round((y - deck) / 0.55) % 2 ? 0.08 : 0.34)), cell * 0.018, 0.45, random)
  const dim = deck + 2.6
  rule(pen, ...px(plot, lip, dim), ...px(plot, far, dim), cell * 0.018, 0.5, random)
  for (const x of [lip, far]) {
    rule(pen, ...px(plot, x, deck + 0.35), ...px(plot, x, dim + 0.25), cell * 0.018, 0.5, random)
    rule(pen, ...px(plot, x - 0.14, dim - 0.14), ...px(plot, x + 0.14, dim + 0.14), cell * 0.04, 0.7, random)
  }
  for (const [ax, ay] of at.anchors) pin(pen, ...px(plot, ax, ay), cell, true)
}
