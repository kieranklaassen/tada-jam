// The pond is a musical staff seen in perspective: left to right is time
// (six columns, one beat each) and near to far is pitch (five rows on a C
// major pentatonic, low near the child and high by the far shore). Every
// column holds two lily pads in different rows, so each beat offers a low
// and a high choice, or both at once for a chord.
//
// World units: x to the right, y up, z toward the camera (near is +z).

export const COLUMNS = 6
export const ROWS = 5
export const COLUMN_SPACING = 2.05
export const ROW_SPACING = 1.52
export const NEAR_Z = 3.05

/** C4 D4 E4 G4 A4: any set of these sounds consonant together. */
export const ROW_PITCH_HZ: readonly number[] = [261.63, 293.66, 329.63, 392.0, 440.0]

/** Which two rows each column's pads sit in. Every row appears in at least two columns. */
export const COLUMN_ROWS: readonly (readonly [number, number])[] = [
  [0, 2],
  [1, 3],
  [2, 4],
  [0, 3],
  [1, 4],
  [1, 3],
]

export type Pad = {
  index: number
  column: number
  row: number
  x: number
  z: number
  radius: number
  /** Rotation of the pad's notch, radians. */
  notch: number
  pitch: number
}

export function columnX(column: number): number {
  return (column - (COLUMNS - 1) / 2) * COLUMN_SPACING
}

export function rowZ(row: number): number {
  return NEAR_Z - row * ROW_SPACING
}

// Small fixed offsets so the pads read as a pond, not a grid. The column's
// x is kept almost exact because the firefly's crossing is the beat.
const JITTER: readonly (readonly [number, number, number, number])[] = [
  [0.06, 0.1, 0.86, 2.3],
  [-0.1, -0.08, 0.78, -0.6],
  [-0.05, 0.12, 0.8, 1.1],
  [0.12, -0.1, 0.76, -2.2],
  [0.08, 0.06, 0.82, 0.4],
  [-0.06, -0.12, 0.74, 2.9],
  [-0.12, 0.04, 0.84, -1.4],
  [0.1, 0.1, 0.77, 1.9],
  [0.04, -0.06, 0.8, -2.8],
  [-0.08, 0.1, 0.74, 0.9],
  [0.1, 0.08, 0.8, -0.2],
  [-0.04, -0.1, 0.76, 2.5],
]

function buildPads(): Pad[] {
  const pads: Pad[] = []
  COLUMN_ROWS.forEach((rows, column) => {
    for (const row of rows) {
      const index = pads.length
      const [dx, dz, radius, notch] = JITTER[index]
      pads.push({ index, column, row, x: columnX(column) + dx, z: rowZ(row) + dz, radius, notch, pitch: ROW_PITCH_HZ[row] })
    }
  })
  return pads
}

export const PADS: readonly Pad[] = buildPads()
export const PAD_COUNT = PADS.length

export function padAt(column: number, row: number): Pad | undefined {
  return PADS.find((pad) => pad.column === column && pad.row === row)
}

/** The other pad in the same column: the drag demonstration's target. */
export function partnerPad(index: number): Pad {
  const pad = PADS[index]
  return PADS.find((other) => other.column === pad.column && other.index !== index)!
}

/** The pad whose disc contains a point on the water, with a little slop, or null. */
export function padUnder(x: number, z: number, slop = 0.25): Pad | null {
  let best: Pad | null = null
  let bestDistance = Infinity
  for (const pad of PADS) {
    const distance = Math.hypot(pad.x - x, pad.z - z)
    if (distance <= pad.radius + slop && distance < bestDistance) {
      best = pad
      bestDistance = distance
    }
  }
  return best
}

/** Everything the firefly flies over, plus a margin: the play area the camera frames. */
export const POND = {
  minX: columnX(0) - 1.6,
  maxX: columnX(COLUMNS - 1) + 1.6,
  nearZ: NEAR_Z + 1.2,
  farZ: rowZ(ROWS - 1) - 1.3,
}

export const FROG_COUNT = 5
