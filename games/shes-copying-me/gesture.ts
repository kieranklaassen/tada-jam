import { zoneAt, type Spot, type Zone } from './layout'
import type { Act } from './rules'

// Reads what a hand is doing from where it goes. One detector for each hand,
// and the same rule for the hand that leads and the hand that copies.

/** How long a hand must stay in a place before it means it, so passing over a guest is not doing something to it. */
export const DWELL = 0.12
/** How far a hand swings before turning back counts as a stroke of a wave. */
const STROKE = 36
/** Strokes that make a wave, and how close together they must be. */
const STROKES = 3
const STROKE_WITHIN = 0.45
/** After a wave the place under it says nothing for a moment. */
const AFTER_WAVE = 0.4

export class Detector {
  private zone: Zone = null
  private stayed = 0
  private fired = false
  private turn: number | null = null
  private direction: -1 | 0 | 1 = 0
  private strokes = 0
  private sinceStroke = 0
  private hush = 0

  reset(): void {
    this.zone = null
    this.stayed = 0
    this.fired = false
    this.turn = null
    this.direction = 0
    this.strokes = 0
    this.hush = 0
  }

  /** Call every step with where the hand is. `quiet` is a hand on its way home: it does nothing on the way. */
  step(spot: Spot, dt: number, quiet: boolean): Act | null {
    if (quiet) {
      this.reset()
      return null
    }
    this.hush = Math.max(0, this.hush - dt)
    if (this.stroke(spot.u, dt)) {
      this.hush = AFTER_WAVE
      this.stayed = 0
      this.fired = true
      return 'wave'
    }
    const zone = zoneAt(spot)
    if (zone !== this.zone) {
      this.zone = zone
      this.stayed = 0
      this.fired = false
      return null
    }
    if (zone === null || zone === 'meet' || this.hush > 0) return null
    this.stayed += dt
    if (!this.fired && this.stayed >= DWELL) {
      this.fired = true
      return zone
    }
    return null
  }

  /** Follows the swing from side to side; true when a wave is complete. */
  private stroke(u: number, dt: number): boolean {
    this.sinceStroke += dt
    if (this.sinceStroke > STROKE_WITHIN) this.strokes = 0
    if (this.turn === null) {
      this.turn = u
      return false
    }
    const moved = u - this.turn
    if (this.direction === 0) {
      if (Math.abs(moved) >= STROKE) {
        this.direction = moved > 0 ? 1 : -1
        this.turn = u
        this.sinceStroke = 0
      }
      return false
    }
    if (moved * this.direction > 0) {
      // Still going the same way: the turning point moves along with it.
      this.turn = u
      return false
    }
    if (Math.abs(moved) < STROKE) return false
    this.direction = this.direction === 1 ? -1 : 1
    this.turn = u
    this.sinceStroke = 0
    this.strokes += 1
    if (this.strokes < STROKES) return false
    this.strokes = 0
    return true
  }
}
