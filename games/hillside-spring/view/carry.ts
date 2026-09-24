import { COLS, ROWS } from '../layout'
import { BANK_Y, backZ, cellX, CREEK_Z1, floorY, frontZ, RACK_Z, rackX, ROW_DEPTH, rowZ, sideRise, STEP, WALL_OUT } from './world'

/**
 * How far a carried piece reaches from its middle (its arms' ends, the wheel's hut and millstone), and how steeply
 * the height it must clear falls away past that. Beyond its reach nothing is under it; the falloff turns a step in
 * what it passes over into a slope it rides up, so it never jumps.
 */
export const CARRY_REACH = 0.58
const FALLOFF = 1.6

function falloff(top: number, distance: number): number {
  return top - FALLOFF * Math.max(0, distance - CARRY_REACH)
}

function spanDistance(v: number, lo: number, hi: number): number {
  return v < lo ? lo - v : v > hi ? v - hi : 0
}

/** What a carried piece rides over: the terraces, the bank, and whatever stands on each cell and rack slot. */
export class CarryGround {
  /** The top (world y) of the tallest thing on each cell, a piece or a crop at full reach; -Infinity for nothing. */
  readonly cells = new Float32Array(COLS * ROWS).fill(-Infinity)
  /** The top of the piece on each rack slot. */
  readonly rack: Float32Array

  constructor(slots: number) {
    this.rack = new Float32Array(slots).fill(-Infinity)
  }

  /** The lowest a carried piece's feet may be with its middle at (x, z) to clear everything under it. */
  under(x: number, z: number): number {
    const rise = sideRise(Math.abs(x) + CARRY_REACH)
    // Each terrace's floor runs from its back to its wall's face, which stands out over the terrace in front.
    let top = falloff(floorY(0) + STEP + rise, Math.max(0, z - backZ(0) - WALL_OUT))
    for (let r = 0; r < ROWS; r++) top = Math.max(top, falloff(floorY(r) + rise, spanDistance(z, backZ(r), frontZ(r) + WALL_OUT)))
    top = Math.max(top, falloff(BANK_Y, Math.max(0, CREEK_Z1 - z)))
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i]
      if (cell === -Infinity) continue
      const c = i % COLS
      const r = (i - c) / COLS
      const dx = spanDistance(x, cellX(c) - 0.5, cellX(c) + 0.5)
      const dz = spanDistance(z, rowZ(r) - ROW_DEPTH / 2, rowZ(r) + ROW_DEPTH / 2)
      top = Math.max(top, falloff(cell, Math.hypot(dx, dz)))
    }
    for (let s = 0; s < this.rack.length; s++) {
      const slot = this.rack[s]
      if (slot === -Infinity) continue
      const dx = spanDistance(x, rackX(s, this.rack.length) - 0.5, rackX(s, this.rack.length) + 0.5)
      const dz = spanDistance(z, RACK_Z - 0.5, RACK_Z + 0.5)
      top = Math.max(top, falloff(slot, Math.hypot(dx, dz)))
    }
    return top
  }
}
