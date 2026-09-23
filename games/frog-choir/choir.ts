import { COLUMN_SPACING, COLUMNS, columnX, PADS, ROWS, rowZ } from './layout'

// The firefly's loop. It crosses the six columns one beat each, then spends
// two beats arcing back over the far shore: an eight-beat loop that never
// ends and counts nothing. Beat k happens at k × beatSeconds of attended time;
// beats 0–5 of each loop are columns, 6 and 7 are the flight home.
//
// Its flight is a pure function of the loop phase and one target depth per
// column, so the path it draws over the pond is the melody: it dips toward
// near (low) frogs and climbs toward far (high) ones.

export const STEPS = 8
export const CRUISE_Y = 1.7
export const HOME_Y = 3.6
export const HOME_Z = rowZ(ROWS - 1) - 3.2
const DIP = 0.32
const HOME_SPEED = 7.4

export type Vec3 = { x: number; y: number; z: number }

export function beatSeconds(bpm: number): number {
  return 60 / bpm
}

/** The column the firefly crosses on beat k, or -1 on the flight home. */
export function beatColumn(k: number): number {
  const step = ((k % STEPS) + STEPS) % STEPS
  return step < COLUMNS ? step : -1
}

export function phaseAt(time: number, beat: number): number {
  const phase = (time / beat) % STEPS
  return phase < 0 ? phase + STEPS : phase
}

/**
 * Where the firefly aims in each column: the mean depth of the frogs sitting
 * there (between them for a chord), or a line drawn between the nearest
 * occupied columns when a column is empty.
 */
const sum = new Float32Array(COLUMNS)

export function columnTargets(frogPads: readonly (number | null)[], out: Float32Array, occupied: Uint8Array): void {
  sum.fill(0)
  occupied.fill(0)
  for (const index of frogPads) {
    if (index === null) continue
    const pad = PADS[index]
    sum[pad.column] += pad.z
    occupied[pad.column] += 1
  }
  for (let c = 0; c < COLUMNS; c++) out[c] = occupied[c] > 0 ? sum[c] / occupied[c] : Number.NaN
  const middle = (rowZ(0) + rowZ(ROWS - 1)) / 2
  for (let c = 0; c < COLUMNS; c++) {
    if (!Number.isNaN(out[c])) continue
    let left = c - 1
    while (left >= 0 && occupied[left] === 0) left--
    let right = c + 1
    while (right < COLUMNS && occupied[right] === 0) right++
    const zl = left >= 0 ? sum[left] / occupied[left] : null
    const zr = right < COLUMNS ? sum[right] / occupied[right] : null
    if (zl !== null && zr !== null) out[c] = zl + ((zr - zl) * (c - left)) / (right - left)
    else out[c] = zl ?? zr ?? middle
  }
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

function hermite(p0: number, m0: number, p1: number, m1: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1
}

function target(targets: ArrayLike<number>, c: number): number {
  return targets[Math.max(0, Math.min(COLUMNS - 1, c))]
}

/** The firefly's position at a loop phase. Writes into `out`; allocates nothing. */
export function fireflyAt(phase: number, targets: ArrayLike<number>, occupied: ArrayLike<number>, out: Vec3): Vec3 {
  let s = phase % STEPS
  if (s < 0) s += STEPS
  if (s >= STEPS - 0.5) s -= STEPS
  const last = COLUMNS - 1
  if (s <= last + 0.5) {
    const k = Math.floor(s)
    const t = s - k
    out.x = columnX(0) + s * COLUMN_SPACING
    out.z = catmull(target(targets, k - 1), target(targets, k), target(targets, k + 1), target(targets, k + 2), t)
    const nearest = Math.round(s)
    const singer = nearest >= 0 && nearest <= last && occupied[nearest] > 0
    const off = s - nearest
    out.y = CRUISE_Y - (singer ? DIP * Math.exp(-(off * off) / 0.035) : 0)
    return out
  }
  // Home: exit to the right, climb and swing back over the far shore, drop in on the left.
  const u = (s - (last + 0.5)) / (STEPS - COLUMNS)
  const exitX = columnX(last) + COLUMN_SPACING / 2
  const entryX = columnX(0) - COLUMN_SPACING / 2
  const exitZ = target(targets, last)
  const entryZ = target(targets, 0)
  if (u < 0.5) {
    const t = u * 2
    out.x = hermite(exitX, COLUMN_SPACING, 0, -HOME_SPEED, t)
    out.y = hermite(CRUISE_Y, 0, HOME_Y, 0, t)
    out.z = hermite(exitZ, 0, HOME_Z, 0, t)
  } else {
    const t = (u - 0.5) * 2
    out.x = hermite(0, -HOME_SPEED, entryX, COLUMN_SPACING, t)
    out.y = hermite(HOME_Y, 0, CRUISE_Y, 0, t)
    out.z = hermite(HOME_Z, 0, entryZ, 0, t)
  }
  return out
}
