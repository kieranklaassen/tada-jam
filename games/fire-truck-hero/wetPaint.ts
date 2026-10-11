// The fine picture of the wet sand, which the ground's shader reads as a
// texture. Bytes only, no renderer: the view uploads `data` when `dirty`.
//
// The coarse grid in ground.ts is the truth and is what is saved. This is how
// that truth is drawn while the child plays: a blot has the shape of the
// splash that made it and a sweep leaves a line. On load the picture is made
// again from the grid, so lines come back as soft patches.
//
// Each cell of the picture has three shares from 0 to 255:
//   damp      dark wet sand, which dries
//   puddle    standing water, which stays
//   mud       mud, which stays

import { COLS, DRYING_GULPS_PER_S, ROWS, levelOf, type Ground } from './ground'

/** Picture cells for each yard unit. */
export const CELLS_PER_UNIT = 8
export const WIDTH = COLS * CELLS_PER_UNIT
export const HEIGHT = ROWS * CELLS_PER_UNIT

/** One gulp darkens the middle of its blot by this much; two on one place reach full dark. */
export const DAMP_PER_GULP = 128
/** How wide the blot of one gulp is, in yard units. */
export const BLOT_RADIUS = 0.85

const DAMP = 0, PUDDLE = 1, MUD = 2

export class WetPaint {
  /** Four bytes a cell (the fourth unused), row by row from the far edge, as a texture wants them. */
  readonly data = new Uint8Array(WIDTH * HEIGHT * 4)
  /** The picture changed since the view last took it. */
  dirty = true
  /** What drying has not yet taken off, since a frame dries less than one byte. */
  private owed = 0
  private anyDamp = false

  /** Water lands at a point: a soft round blot, darkest in the middle. `gulps` is how much water, `radius` how wide. */
  splash(x: number, z: number, gulps: number, radius = BLOT_RADIUS): void {
    this.stamp(DAMP, x, z, radius, gulps * DAMP_PER_GULP)
    this.anyDamp = true
  }

  /** A place has had its fill: the water stands there. */
  puddle(x: number, z: number, radius = 0.95): void {
    this.stamp(PUDDLE, x, z, radius, 255)
  }

  /** A puddle that got more water is mud. */
  mud(x: number, z: number, radius = 1.05): void {
    this.stamp(MUD, x, z, radius, 255)
  }

  /** Damp sand dries on game time, edge first, at the rate the grid dries. Puddles and mud stay. */
  dry(seconds: number): void {
    if (!this.anyDamp || !(seconds > 0)) return
    this.owed += seconds * DRYING_GULPS_PER_S * DAMP_PER_GULP
    const step = Math.floor(this.owed)
    if (step < 1) return
    this.owed -= step
    let left = false
    const data = this.data
    for (let i = 0; i < data.length; i += 4) {
      const damp = data[i + DAMP]
      if (damp === 0) continue
      // Sand under standing water or mud stays dark.
      if (data[i + PUDDLE] > 96 || data[i + MUD] > 96) continue
      data[i + DAMP] = damp > step ? damp - step : 0
      if (damp > step) left = true
    }
    this.anyDamp = left
    this.dirty = true
  }

  /** The picture as it is found on load: made from the saved grid, and nothing else. */
  fromGround(ground: Ground): void {
    this.data.fill(0)
    this.owed = 0
    this.anyDamp = false
    for (let cell = 0; cell < COLS * ROWS; cell++) {
      const gulps = ground[cell] ?? 0
      const level = levelOf(gulps)
      if (level === 'dry') continue
      const x = (cell % COLS) + 0.5, z = Math.floor(cell / COLS) + 0.5
      this.splash(x, z, Math.min(2, Math.max(1, gulps)), 0.8)
      if (level === 'puddle' || level === 'mud') this.puddle(x, z)
      if (level === 'mud') this.mud(x, z)
    }
    this.dirty = true
  }

  /** The share at a point of the yard, for tests and for the view's sounds. */
  at(x: number, z: number): { damp: number; puddle: number; mud: number } {
    const col = Math.min(WIDTH - 1, Math.max(0, Math.floor(x * CELLS_PER_UNIT)))
    const row = Math.min(HEIGHT - 1, Math.max(0, Math.floor(z * CELLS_PER_UNIT)))
    const i = (row * WIDTH + col) * 4
    return { damp: this.data[i + DAMP], puddle: this.data[i + PUDDLE], mud: this.data[i + MUD] }
  }

  private stamp(channel: number, x: number, z: number, radius: number, amount: number): void {
    if (!(amount > 0) || !(radius > 0)) return
    const reach = radius * CELLS_PER_UNIT
    const cx = x * CELLS_PER_UNIT, cz = z * CELLS_PER_UNIT
    const fromCol = Math.max(0, Math.floor(cx - reach)), toCol = Math.min(WIDTH - 1, Math.ceil(cx + reach))
    const fromRow = Math.max(0, Math.floor(cz - reach)), toRow = Math.min(HEIGHT - 1, Math.ceil(cz + reach))
    for (let row = fromRow; row <= toRow; row++) {
      for (let col = fromCol; col <= toCol; col++) {
        const gap = Math.hypot(col + 0.5 - cx, row + 0.5 - cz) / reach
        if (gap >= 1) continue
        // Full in the middle, soft at the edge.
        const share = 1 - gap * gap * (3 - 2 * gap)
        const i = (row * WIDTH + col) * 4 + channel
        this.data[i] = Math.min(255, this.data[i] + Math.round(amount * share))
      }
    }
    this.dirty = true
  }
}
