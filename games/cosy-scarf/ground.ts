import { BLANKET, groundY } from './layout'

// The ground as it is drawn: the snow's coarse mesh of hills (pressed down
// under the play blanket) and the blanket's own mesh with its ribbed hem.
// The view builds both meshes from these functions, and `standY` follows
// their very triangles, so whatever stands on it sits on what the child sees.

function smoothstep(x: number, min: number, max: number): number {
  if (x <= min) return 0
  if (x >= max) return 1
  const t = (x - min) / (max - min)
  return t * t * (3 - 2 * t)
}

/** Extra rise of the far hills beyond the slope the animals stand on. */
export function farRise(x: number, z: number): number {
  const far = smoothstep(-z, 110, 215)
  return far * (13 + 9 * Math.sin(x * 0.012 + 1.3) + 5 * Math.sin(x * 0.033 + 0.4))
}

export function landHeight(x: number, z: number): number {
  return groundY(x, z) + farRise(x, z)
}

export const underBlanket = (x: number, z: number) => Math.abs(x) <= BLANKET.halfWidth && z > BLANKET.back && z < BLANKET.front + 3

/** The snow mesh: a plane this wide and deep, cut into this many cells, centred this far back. */
export const SNOW = { width: 760, depth: 400, columns: 76, rows: 56, z: -105 }

export function snowVertexY(x: number, z: number): number {
  return landHeight(x, z) - (underBlanket(x, z) ? BLANKET.press : 0)
}

/** Fine steps across the hem, so its rib is round; broad ones across the middle. */
function hemSteps(from: number, to: number, broad: number): number[] {
  const out: number[] = []
  for (let at = from; at < from + BLANKET.rib; at += 0.5) out.push(at)
  for (let at = from + BLANKET.rib; at < to - BLANKET.rib; at += broad) out.push(at)
  for (let at = to - BLANKET.rib; at <= to + 1e-6; at += 0.5) out.push(at)
  return out
}

/** Where the blanket mesh's columns and rows of vertices lie. */
export const BLANKET_XS = hemSteps(-BLANKET.halfWidth, BLANKET.halfWidth, 5)
export const BLANKET_ZS = hemSteps(BLANKET.back, BLANKET.front, 3)

/** How far in from the blanket's nearest edge. */
export const blanketHem = (x: number, z: number) => Math.min(BLANKET.halfWidth - Math.abs(x), z - BLANKET.back, BLANKET.front - z)

export function blanketVertexY(x: number, z: number): number {
  const d = blanketHem(x, z)
  return groundY(x, z) + BLANKET.lift + (d < BLANKET.rib ? BLANKET.ridge * Math.sin((Math.PI * d) / BLANKET.rib) : 0)
}

let snowHeights: Float64Array | null = null
let blanketHeights: Float64Array | null = null

function snowTable(): Float64Array {
  if (snowHeights) return snowHeights
  const { width, depth, columns, rows, z } = SNOW
  const table = new Float64Array((columns + 1) * (rows + 1))
  for (let iz = 0; iz <= rows; iz++) {
    for (let ix = 0; ix <= columns; ix++) table[iz * (columns + 1) + ix] = snowVertexY((ix * width) / columns - width / 2, (iz * depth) / rows - depth / 2 + z)
  }
  return (snowHeights = table)
}

function blanketTable(): Float64Array {
  if (blanketHeights) return blanketHeights
  const n = BLANKET_XS.length
  const table = new Float64Array(n * BLANKET_ZS.length)
  BLANKET_ZS.forEach((z, j) => BLANKET_XS.forEach((x, i) => (table[j * n + i] = blanketVertexY(x, z))))
  return (blanketHeights = table)
}

/** Height on a cell split corner (1, 0) to corner (0, 1), as both meshes split theirs, `u`, `v` across it. */
function onCell(h00: number, h10: number, h01: number, h11: number, u: number, v: number): number {
  return u + v <= 1 ? h00 + u * (h10 - h00) + v * (h01 - h00) : h11 + (1 - u) * (h01 - h11) + (1 - v) * (h10 - h11)
}

/** The drawn snow's height at (x, z). */
export function snowTop(x: number, z: number): number {
  const { width, depth, columns, rows } = SNOW
  const table = snowTable()
  const fx = ((x + width / 2) / width) * columns
  const fz = ((z - SNOW.z + depth / 2) / depth) * rows
  const ix = Math.max(0, Math.min(columns - 1, Math.floor(fx)))
  const iz = Math.max(0, Math.min(rows - 1, Math.floor(fz)))
  const at = iz * (columns + 1) + ix
  return onCell(table[at], table[at + 1], table[at + columns + 1], table[at + columns + 2], fx - ix, fz - iz)
}

/** Every blanket vertex lies on this grid, so a cell is found by lookup, not search. */
const HALF_STEP = 0.5

/** For each half step along `values`, the cell (index of its lower vertex) it falls in. */
function cellLookup(values: readonly number[]): Int16Array {
  const steps = Math.round((values[values.length - 1] - values[0]) / HALF_STEP)
  const cells = new Int16Array(steps + 1)
  let cell = 0
  for (let k = 0; k <= steps; k++) {
    while (cell < values.length - 2 && values[cell + 1] <= values[0] + k * HALF_STEP) cell++
    cells[k] = cell
  }
  return cells
}

const BLANKET_X_CELLS = cellLookup(BLANKET_XS)
const BLANKET_Z_CELLS = cellLookup(BLANKET_ZS)

/** The drawn blanket's height at (x, z), or -Infinity off it. */
export function blanketTop(x: number, z: number): number {
  const xs = BLANKET_XS
  const zs = BLANKET_ZS
  if (x < xs[0] || x > xs[xs.length - 1] || z < zs[0] || z > zs[zs.length - 1]) return -Infinity
  const table = blanketTable()
  const i = BLANKET_X_CELLS[Math.floor((x - xs[0]) / HALF_STEP)] ?? xs.length - 2
  const j = BLANKET_Z_CELLS[Math.floor((z - zs[0]) / HALF_STEP)] ?? zs.length - 2
  const n = xs.length
  const at = j * n + i
  return onCell(table[at], table[at + 1], table[at + n], table[at + n + 1], (x - xs[i]) / (xs[i + 1] - xs[i]), (z - zs[j]) / (zs[j + 1] - zs[j]))
}

/** The top of whatever is drawn at (x, z): the blanket where it lies, else the snow. */
export function standY(x: number, z: number): number {
  return Math.max(snowTop(x, z), blanketTop(x, z))
}

// A coarse grid over the land the animals walk holds, for each of its cells,
// the highest the drawn ground reaches anywhere in it. A place whose ceiling
// is already too low to lift a thing any higher needs no closer look.

/** The ceiling grid: its cells' size, its corner nearest (-x, -z), and how many cells it runs. */
export const CEILING = { step: 2, x: -180, z: -160, columns: 180, rows: 125 }

/** The snow's lines of vertices across (x) and along (z). */
const SNOW_XS = Array.from({ length: SNOW.columns + 1 }, (_, i) => (i * SNOW.width) / SNOW.columns - SNOW.width / 2)
const SNOW_ZS = Array.from({ length: SNOW.rows + 1 }, (_, i) => (i * SNOW.depth) / SNOW.rows - SNOW.depth / 2 + SNOW.z)

/** The two of `lines` either side of `at`, or null outside them all. */
function between(lines: readonly number[], at: number): readonly [number, number] | null {
  if (at < lines[0] || at > lines[lines.length - 1]) return null
  let i = 0
  while (i < lines.length - 2 && lines[i + 1] <= at) i++
  return [lines[i], lines[i + 1]]
}

/** A side of a ceiling cell cut at every line of both meshes, and for each piece between two cuts, the snow's and the blanket's lines either side of it. */
type Side = { cuts: number[]; snow: (readonly [number, number] | null)[]; blanket: (readonly [number, number] | null)[] }

function cutSide(from: number, to: number, snow: readonly number[], blanket: readonly number[]): Side {
  const inside = (at: number) => at > from && at < to
  const cuts = [...new Set([from, to, ...snow.filter(inside), ...blanket.filter(inside)])].sort((a, b) => a - b)
  const middles = cuts.slice(1).map((end, k) => (cuts[k] + end) / 2)
  return { cuts, snow: middles.map((at) => between(snow, at)), blanket: middles.map((at) => between(blanket, at)) }
}

/** The highest `standY` reaches where a cell's split (its corner (1, 0) to its corner (0, 1)) crosses the edge of the box [x0, x1] × [z0, z1] inside that cell. */
function highestOnSplit(cellX: readonly [number, number], cellZ: readonly [number, number], x0: number, x1: number, z0: number, z1: number): number {
  const ax = cellX[0]
  const dx = cellX[1] - ax
  const az = cellZ[0]
  const dz = cellZ[1] - az
  let highest = -Infinity
  for (let side = 0; side < 2; side++) {
    const x = side ? x1 : x0
    const z = az + (1 - (x - ax) / dx) * dz
    if (z > z0 && z < z1) highest = Math.max(highest, standY(x, z))
  }
  for (let side = 0; side < 2; side++) {
    const z = side ? z1 : z0
    const x = ax + (1 - (z - az) / dz) * dx
    if (x > x0 && x < x1) highest = Math.max(highest, standY(x, z))
  }
  return highest
}

/**
 * The highest `standY` reaches over a ceiling cell. Cut along every line of
 * both meshes, each piece lies in one cell of each, where the ground is two
 * flat triangles: so it is highest at a piece's corner or where a cell's
 * split crosses a piece's edge.
 */
function highestIn(across: Side, along: Side): number {
  const xs = across.cuts
  const zs = along.cuts
  let highest = -Infinity
  for (const x of xs) for (const z of zs) highest = Math.max(highest, standY(x, z))
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const snowX = across.snow[i]
      const snowZ = along.snow[j]
      const blanketX = across.blanket[i]
      const blanketZ = along.blanket[j]
      if (snowX && snowZ) highest = Math.max(highest, highestOnSplit(snowX, snowZ, xs[i], xs[i + 1], zs[j], zs[j + 1]))
      if (blanketX && blanketZ) highest = Math.max(highest, highestOnSplit(blanketX, blanketZ, xs[i], xs[i + 1], zs[j], zs[j + 1]))
    }
  }
  return highest
}

/** Rounding the highest point into a 32-bit float can bring it down this much at most; the ceiling adds it back. */
const CEILING_SLACK = 1e-4

/** Each cell's ceiling (not a number until first asked for), and how each column and row of cells is cut. */
type Ceilings = { cells: Float32Array; across: Side[]; along: Side[] }

let ceilings: Ceilings | null = null

function ceilingGrid(): Ceilings {
  if (ceilings) return ceilings
  const { step, x, z, columns, rows } = CEILING
  return (ceilings = {
    cells: new Float32Array(columns * rows).fill(Number.NaN),
    across: Array.from({ length: columns }, (_, i) => cutSide(x + i * step, x + (i + 1) * step, SNOW_XS, BLANKET_XS)),
    along: Array.from({ length: rows }, (_, j) => cutSide(z + j * step, z + (j + 1) * step, SNOW_ZS, BLANKET_ZS)),
  })
}

/** No lower than the drawn ground anywhere in the ceiling cell holding (x, z), worked out the first time it is asked for; unbounded off the grid. */
export function groundCeiling(x: number, z: number): number {
  const { step, columns, rows } = CEILING
  const i = Math.floor((x - CEILING.x) / step)
  const j = Math.floor((z - CEILING.z) / step)
  if (i < 0 || i >= columns || j < 0 || j >= rows) return Infinity
  const grid = ceilingGrid()
  const at = j * columns + i
  const known = grid.cells[at]
  if (!Number.isNaN(known)) return known
  const top = highestIn(grid.across[i], grid.along[j]) + CEILING_SLACK
  grid.cells[at] = top
  return top
}

/**
 * How low something can stand with none of the first `count` of its `points`
 * sunk into what is drawn under them: each point is three numbers, where it
 * lies across and along the ground and how high above the thing's own base.
 * The lowest points are best given first: they rule out the most.
 */
export function restHeight(points: Float64Array, count: number): number {
  let rest = -Infinity
  for (let i = 0; i < 3 * count; i += 3) {
    const x = points[i]
    const lift = points[i + 1]
    const z = points[i + 2]
    if (groundCeiling(x, z) - lift <= rest) continue
    rest = Math.max(rest, standY(x, z) - lift)
  }
  return rest
}
