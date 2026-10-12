// The beach as a height field: one grid of how far the sand stands above or
// below the smooth beach. A finger digs into it, a pat flattens it, and the
// view lights it. Nothing here knows about a renderer.
//
// World units: x runs left to right, z from the sea (low z) up the beach to
// the child (high z), and height is up. The smooth beach rises gently away
// from the sea, so low sand is wet and the sea stands in whatever is dug
// below its level.

export const COLS = 96
export const ROWS = 72
/** The side of one cell, in world units. */
export const CELL = 0.25
/** The world x of the grid's left edge and the world z of its sea edge. */
export const X0 = -12
export const Z0 = -4
export const X1 = X0 + COLS * CELL
export const Z1 = Z0 + ROWS * CELL
/** The lowest and highest a cell may stand from the smooth beach. */
export const LOW = -0.6
export const HIGH = 1.4
/** The level the sea stands at when the tide is out. */
export const SEA = 0

/** How wide a finger digs, how deep one stroke goes, and the rim it heaps up. */
export const DIG_RADIUS = 0.36
export const DIG_DEPTH = 0.26
export const RIM_WIDTH = 0.34
export const RIM_HEIGHT = 0.085
/** Sand standing this far above the smooth beach is raised: a finger landing on it pats it. */
export const RAISED = 0.06
/** The lowest a flat top is patted down to. */
export const PATTED_LOW = 0.12
/** How wide a pat is. */
export const PAT_RADIUS = 0.62

export type Field = {
  /** Row by row from the sea edge, each row left to right. */
  d: Float32Array
  /** Goes up with every change, so a view knows when to read the grid again. */
  version: number
  /** How near the stroke in progress has come to each cell; a stroke's profile is laid by that distance. */
  near: Float32Array
}

export function makeField(): Field {
  return { d: new Float32Array(COLS * ROWS), version: 0, near: new Float32Array(COLS * ROWS).fill(Infinity) }
}

/** The smooth beach: at the sea's level a little way in from the sea edge, and rising up the beach. */
export function base(z: number): number {
  return 0.1 * (z + 3)
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value
}

/** The edge cells never change, so the beach beyond the grid joins it without a step. */
function edge(col: number, row: number): number {
  const margin = Math.min(col, row, COLS - 1 - col, ROWS - 1 - row)
  return clamp(margin / 3, 0, 1)
}

/** How far the sand at a world point stands from the smooth beach, between the cell centres. */
export function deltaAt(field: Field, x: number, z: number): number {
  const u = clamp((x - X0) / CELL - 0.5, 0, COLS - 1)
  const v = clamp((z - Z0) / CELL - 0.5, 0, ROWS - 1)
  const c0 = Math.floor(u), r0 = Math.floor(v)
  const c1 = Math.min(COLS - 1, c0 + 1), r1 = Math.min(ROWS - 1, r0 + 1)
  const fu = u - c0, fv = v - r0
  const d = field.d
  const top = d[r0 * COLS + c0] * (1 - fu) + d[r0 * COLS + c1] * fu
  const bottom = d[r1 * COLS + c0] * (1 - fu) + d[r1 * COLS + c1] * fu
  return top * (1 - fv) + bottom * fv
}

/** The height of the sand at a world point. */
export function heightAt(field: Field, x: number, z: number): number {
  return base(z) + deltaAt(field, x, z)
}

export function inField(x: number, z: number): boolean {
  return x >= X0 && x <= X1 && z >= Z0 && z <= Z1
}

/**
 * What one stroke adds at a distance from its path: a rounded ditch out to
 * the dig radius, and beyond it a rim of pushed-up sand. Nothing further out.
 */
export function profile(distance: number): number {
  if (distance < DIG_RADIUS) {
    const t = distance / DIG_RADIUS
    return -DIG_DEPTH * (1 - t * t)
  }
  const t = (distance - DIG_RADIUS) / RIM_WIDTH
  if (t >= 1) return 0
  return RIM_HEIGHT * Math.sin(t * Math.PI)
}

/**
 * A stroke through raised sand cuts a gate: narrower than the groove a finger digs, so a tower as wide as the
 * bucket keeps a post standing on either side of it.
 */
export const GATE_RADIUS = 0.2
/** How high raised sand is left at a distance from the middle of a stroke cut through it: level in the middle, slumped sides. */
export function gateFloor(distance: number): number {
  const t = clamp(distance / GATE_RADIUS, 0, 1)
  return 0.02 + 0.3 * t * t * t
}

/** The wall between two grooves crumbles where a new stroke comes up to an old groove: what stood up there falls in. */
export function crumbleWall(field: Field, x: number, z: number): void {
  each(x, z, 0.5, (at, distance) => {
    if (field.d[at] > 0) field.d[at] *= 0.25 + 0.75 * (distance / 0.5) ** 2
  })
  field.version += 1
}

/** A new stroke begins: nothing of it has been laid yet. */
export function beginStroke(field: Field): void {
  field.near.fill(Infinity)
}

/**
 * Lays the stroke's profile around one point of its path. Each cell takes the
 * profile at the nearest the stroke has come to it, so a finger that dawdles
 * or doubles back digs no deeper, and a new stroke over an old one does.
 */
function stamp(field: Field, x: number, z: number): void {
  const reach = DIG_RADIUS + RIM_WIDTH
  const c0 = Math.max(0, Math.floor((x - reach - X0) / CELL)), c1 = Math.min(COLS - 1, Math.ceil((x + reach - X0) / CELL))
  const r0 = Math.max(0, Math.floor((z - reach - Z0) / CELL)), r1 = Math.min(ROWS - 1, Math.ceil((z + reach - Z0) / CELL))
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const distance = Math.hypot(X0 + (col + 0.5) * CELL - x, Z0 + (row + 0.5) * CELL - z)
      const at = row * COLS + col
      const before = field.near[at]
      if (distance >= before || distance >= reach) continue
      const change = (profile(distance) - (before === Infinity ? 0 : profile(before))) * edge(col, row)
      field.near[at] = distance
      // Through raised sand the stroke cuts a gate: down to the level of the beach under the finger, with sides
      // that slump toward it, however high the sand stood.
      const cut = field.d[at] > RAISED && distance < GATE_RADIUS ? gateFloor(distance) : Infinity
      field.d[at] = clamp(Math.min(field.d[at] + change, cut), LOW, HIGH)
    }
  }
}

/** The finger lands: a dent with a rim, the first of a stroke. */
export function dent(field: Field, x: number, z: number): void {
  beginStroke(field)
  stamp(field, x, z)
  field.version += 1
}

/** The finger moves on: the groove follows it from the last point to this one. */
export function groove(field: Field, fromX: number, fromZ: number, toX: number, toZ: number): void {
  const length = Math.hypot(toX - fromX, toZ - fromZ)
  const steps = Math.max(1, Math.ceil(length / (CELL * 0.5)))
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    stamp(field, fromX + (toX - fromX) * t, fromZ + (toZ - fromZ) * t)
  }
  field.version += 1
}

/**
 * A pat on raised sand: the top under the finger goes flat, a little lower
 * than its middle stood, and what was low beside it comes up to meet it, so
 * the heap is shorter and wider.
 */
export function pat(field: Field, x: number, z: number): void {
  const c0 = Math.max(0, Math.floor((x - PAT_RADIUS - X0) / CELL)), c1 = Math.min(COLS - 1, Math.ceil((x + PAT_RADIUS - X0) / CELL))
  const r0 = Math.max(0, Math.floor((z - PAT_RADIUS - Z0) / CELL)), r1 = Math.min(ROWS - 1, Math.ceil((z + PAT_RADIUS - Z0) / CELL))
  // Under the hand: how high the sand stands, and how much of it already stands level with its top.
  let high = 0, cells = 0, atTop = 0
  for (let pass = 0; pass < 2; pass++) {
    each(x, z, PAT_RADIUS * 0.6, (at) => {
      const here = field.d[at]
      if (here <= 0.02) return
      if (pass === 0) {
        high = Math.max(high, here)
        cells += 1
      } else if (high - here < 0.005) atTop += 1
    })
  }
  if (cells === 0) return
  // The top comes down to a little over half the height of the heap it belongs to, on one of a few steps.
  // The heap is read wider than the hand, so pats laid side by side along it come out level with each
  // other.
  let heap = high
  each(x, z, PAT_RADIUS + 0.6, (at) => { if (field.d[at] > heap) heap = field.d[at] })
  const step = (height: number) => Math.round(height * 50) / 50
  // A top that is flat already goes down a little with each pat, as far as a low flat wall and no further.
  // A lumpy top comes down the same way and stops at the same low wall: no number of pats flattens a wall away.
  const flat = atTop * 4 >= cells * 3 ? Math.min(high, Math.max(PATTED_LOW, Math.min(high - 0.02, step(high * 0.9)))) : Math.min(high, Math.max(heap >= PATTED_LOW ? PATTED_LOW : RAISED * 0.5, step(heap * 0.6)))
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const distance = Math.hypot(X0 + (col + 0.5) * CELL - x, Z0 + (row + 0.5) * CELL - z)
      if (distance >= PAT_RADIUS) continue
      const at = row * COLS + col
      // Only what stands up is pressed: a ditch beside the heap is not filled by a pat.
      if (field.d[at] <= 0) continue
      const t = clamp((PAT_RADIUS - distance) / (PAT_RADIUS * 0.4), 0, 1)
      const press = t * t * (3 - 2 * t) * edge(col, row)
      field.d[at] += (flat - field.d[at]) * press
    }
  }
  field.version += 1
}

// --- The bucket's work, and the water's ------------------------------------------

/** The bucket: how wide it is at its rim, and how tall a tower it turns out. */
export const BUCKET_RADIUS = 0.6
export const TIER_HEIGHT = 0.7
/** Sand standing this high is a tower, or a wall: something built and not a rim. */
export const BUILT = 0.4
/** A cell dug this far down is part of a groove. */
export const GROOVE = -0.1

function each(x: number, z: number, reach: number, visit: (at: number, distance: number, col: number, row: number) => void): void {
  const c0 = Math.max(0, Math.floor((x - reach - X0) / CELL)), c1 = Math.min(COLS - 1, Math.ceil((x + reach - X0) / CELL))
  const r0 = Math.max(0, Math.floor((z - reach - Z0) / CELL)), r1 = Math.min(ROWS - 1, Math.ceil((z + reach - Z0) / CELL))
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const distance = Math.hypot(X0 + (col + 0.5) * CELL - x, Z0 + (row + 0.5) * CELL - z)
      if (distance < reach) visit(row * COLS + col, distance, col, row)
    }
  }
}

function bump(col: number, row: number): number {
  // A fixed roughness for each cell, so a furrow's banks are lumpy the same way every time, and no cell
  // stands level with any of the eight round it.
  return ((col * 2 + row * 3) % 4) / 3
}

/**
 * The nearest cell of built sand, a tower or a wall, that comes within `r` of a point: its middle, or null where
 * none does. A rim, a heap lower than a tower and a groove are not built: a foot goes over them.
 */
export function builtNear(field: Field, x: number, z: number, r: number): { x: number; z: number } | null {
  let best = Infinity, found: { x: number; z: number } | null = null
  each(x, z, r + CELL * 0.5, (at, distance, col, row) => {
    if (field.d[at] < BUILT || distance >= best) return
    best = distance
    found = { x: X0 + (col + 0.5) * CELL, z: Z0 + (row + 0.5) * CELL }
  })
  return found
}

/** The highest the sand stands within reach of a point, from the smooth beach. */
export function peakNear(field: Field, x: number, z: number, reach: number): number {
  let peak = -Infinity
  each(x, z, reach, (at) => { if (field.d[at] > peak) peak = field.d[at] })
  return peak === -Infinity ? deltaAt(field, x, z) : peak
}

/** The empty bucket dragged over level sand: a wide flat-bottomed furrow with lumpy banks. */
export function furrow(field: Field, fromX: number, fromZ: number, toX: number, toZ: number): void {
  const length = Math.hypot(toX - fromX, toZ - fromZ)
  const steps = Math.max(1, Math.ceil(length / (CELL * 0.5)))
  const reach = BUCKET_RADIUS + BANK
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    each(fromX + (toX - fromX) * t, fromZ + (toZ - fromZ) * t, reach, (at, distance, col, row) => {
      if (distance >= field.near[at]) return
      const was = field.near[at] === Infinity ? 0 : furrowProfile(field.near[at], col, row)
      field.near[at] = distance
      field.d[at] = clamp(field.d[at] + (furrowProfile(distance, col, row) - was) * edge(col, row), LOW, HIGH)
    })
  }
  field.version += 1
}
/** How wide the bank is that a furrow heaps up on either side. */
const BANK = 0.6
function furrowProfile(distance: number, col: number, row: number): number {
  if (distance < BUCKET_RADIUS - 0.1) return -0.17
  if (distance < BUCKET_RADIUS) return -0.17 * ((BUCKET_RADIUS - distance) / 0.1)
  const t = (distance - BUCKET_RADIUS) / BANK
  return (0.14 + 0.2 * bump(col, row)) * Math.sin(Math.min(1, t) * Math.PI)
}

/** The empty bucket dragged over a groove: the groove is scooped into a round basin. */
export function basin(field: Field, x: number, z: number): void {
  const radius = BUCKET_RADIUS + 0.35
  each(x, z, radius + 0.3, (at, distance, col, row) => {
    const bowl = distance < radius ? -0.4 * (1 - (distance / radius) ** 2) : 0.07 * Math.sin(((distance - radius) / 0.3) * Math.PI)
    const to = distance < radius ? Math.min(field.d[at], bowl) : Math.max(field.d[at], bowl)
    field.d[at] = clamp(field.d[at] + (to - field.d[at]) * edge(col, row), LOW, HIGH)
  })
  field.version += 1
}

/** The empty bucket dragged over raised sand: the top is shaved off level. */
export function shave(field: Field, x: number, z: number): void {
  // The whole top goes, not only the edge the bucket met first: a tower is as wide as the bucket.
  const reach = BUCKET_RADIUS * 2 + 0.1
  const level = Math.max(RAISED * 0.5, peakNear(field, x, z, reach) * 0.45)
  each(x, z, reach, (at) => { if (field.d[at] > level) field.d[at] = level })
  field.version += 1
}

/**
 * The full bucket turned out: sand in the shape of the bucket, standing on
 * `floor` (the height of what it lands on, from the smooth beach). `spread`
 * widens the foot and lowers the top, for a tower that lands in a groove.
 */
export function tower(field: Field, x: number, z: number, floor: number, narrow: number, spread = 0): void {
  const foot = BUCKET_RADIUS * narrow * (1 + spread * 0.3), top = foot * 0.72, height = TIER_HEIGHT * (narrow < 1 ? 0.72 : 1) * (1 - spread * 0.2)
  each(x, z, foot, (at, distance, col, row) => {
    const side = distance <= top ? 1 : (foot - distance) / (foot - top)
    field.d[at] = clamp(Math.max(field.d[at], (floor + height * side) * edge(col, row)), LOW, HIGH)
  })
  field.version += 1
}

/** A stack comes down, or a tower lands in water: everything within reach becomes one soft heap. */
export function heap(field: Field, x: number, z: number, radius: number, height: number): void {
  each(x, z, radius, (at, distance, col, row) => {
    const t = distance / radius
    const round = height * (1 - t * t) * (1 - t * t)
    // What stood higher comes down to the heap; a ditch under it is filled.
    field.d[at] = clamp((field.d[at] > round || field.d[at] < 0 ? round : Math.max(field.d[at], round)) * edge(col, row), LOW, HIGH)
  })
  field.version += 1
}

/** A scoop taken where the bucket stands: a shallow dish. */
export function scoop(field: Field, x: number, z: number): void {
  each(x, z, 0.5, (at, distance, col, row) => {
    field.d[at] = clamp(field.d[at] - 0.09 * (1 - (distance / 0.5) ** 2) * edge(col, row), LOW, HIGH)
  })
  field.version += 1
}

/** A thin line ploughed by a shell that is pulled along. */
export function plough(field: Field, x: number, z: number): void {
  each(x, z, 0.3, (at, distance, col, row) => {
    if (edge(col, row) > 0) field.d[at] = clamp(Math.min(field.d[at], Math.max(field.d[at] - 0.02, -0.07 * (1 - distance / 0.3))), LOW, HIGH)
  })
  field.version += 1
}

/**
 * The evening water over raised sand: what stands in the sea's reach and
 * does not top the water sinks to a round mound. What tops it stays, an
 * island. Returns the places where sand sank, a few of them, for the plops.
 */
export function sink(field: Field, level: number): { x: number; z: number }[] {
  const sunk: { x: number; z: number }[] = []
  for (let row = 0; row < ROWS; row++) {
    const z = Z0 + (row + 0.5) * CELL
    if (base(z) >= level) continue
    for (let col = 0; col < COLS; col++) {
      const at = row * COLS + col
      if (field.d[at] <= 0.02 || base(z) + field.d[at] > level + 0.12) continue
      field.d[at] *= 0.4
      if (sunk.length < 6 && (col + row) % 5 === 0) sunk.push({ x: X0 + (col + 0.5) * CELL, z })
    }
  }
  if (sunk.length > 0) field.version += 1
  return sunk
}

/** The long wave has passed everything on the sea side of `front`: the sand there is smooth, and slumping just ahead of it. */
export function smoothUpTo(field: Field, front: number): void {
  let changed = false
  for (let row = 0; row < ROWS; row++) {
    const z = Z0 + (row + 0.5) * CELL
    if (z > front) break
    const keep = clamp((z - (front - 1.2)) / 1.2, 0, 1)
    for (let col = 0; col < COLS; col++) {
      const at = row * COLS + col
      if (field.d[at] === 0) continue
      const to = keep < 0.05 ? 0 : field.d[at] * Math.min(1, keep + 0.2)
      if (to !== field.d[at]) {
        field.d[at] = to
        changed = true
      }
    }
  }
  if (changed) field.version += 1
}

/** The whole beach smooth. */
export function smoothAll(field: Field): void {
  field.d.fill(0)
  field.near.fill(Infinity)
  field.version += 1
}

/** Whether no cell of the beach has been shaped. */
export function isSmooth(field: Field): boolean {
  for (let i = 0; i < field.d.length; i++) if (field.d[i] !== 0) return false
  return true
}

/** Whether a finger landing here pats (raised sand) or digs. */
export function isRaised(field: Field, x: number, z: number): boolean {
  return deltaAt(field, x, z) > RAISED
}

/** Whether the sea stands at this point: the sand is below its level. */
export function isUnderSea(field: Field, x: number, z: number, sea: number = SEA): boolean {
  return heightAt(field, x, z) < sea - 0.015
}

// --- Saving ------------------------------------------------------------------

/** Sixty-four marks, so two of them hold one cell's height in 4096 steps. */
const MARKS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const STEPS = 4095

/** The grid as text, two marks a cell. A smooth beach is the empty text. */
export function encode(field: Field): string {
  let smooth = true
  for (let i = 0; i < field.d.length && smooth; i++) if (field.d[i] !== 0) smooth = false
  if (smooth) return ''
  const out: string[] = []
  for (let i = 0; i < field.d.length; i++) {
    const step = Math.round(((clamp(field.d[i], LOW, HIGH) - LOW) / (HIGH - LOW)) * STEPS)
    out.push(MARKS[step >> 6], MARKS[step & 63])
  }
  return out.join('')
}

/** Whether text is a saved beach: empty, or two marks for every cell and no mark this game does not write. */
export function isSandText(text: unknown): text is string {
  if (text === '') return true
  if (typeof text !== 'string' || text.length !== COLS * ROWS * 2) return false
  for (let i = 0; i < text.length; i++) if (MARKS.indexOf(text[i]) < 0) return false
  return true
}

/** The step a smooth cell is stored at, so smooth sand comes back exactly smooth. */
const SMOOTH_STEP = Math.round(((0 - LOW) / (HIGH - LOW)) * STEPS)

/**
 * Reads a saved grid into the field. Text of the wrong length, or holding a
 * mark this game does not write, is not a beach: the field is left smooth and
 * false comes back.
 */
export function decode(text: unknown, field: Field): boolean {
  field.d.fill(0)
  field.near.fill(Infinity)
  field.version += 1
  if (!isSandText(text)) return false
  if (text === '') return true
  for (let i = 0; i < field.d.length; i++) {
    const step = MARKS.indexOf(text[i * 2]) * 64 + MARKS.indexOf(text[i * 2 + 1])
    field.d[i] = step === SMOOTH_STEP ? 0 : LOW + (step / STEPS) * (HIGH - LOW)
  }
  return true
}

/** The cell a world point lies in, as one number, row by row from the sea edge. */
export function cellAt(x: number, z: number): number {
  const col = clamp(Math.floor((x - X0) / CELL), 0, COLS - 1), row = clamp(Math.floor((z - Z0) / CELL), 0, ROWS - 1)
  return row * COLS + col
}
