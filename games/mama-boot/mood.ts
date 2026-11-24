import type { Stem } from './score'

// How much of the music is heard, from what the child does. It answers play and never asks for it: a child who stops
// hears it thin out to nearly nothing, and a touch brings it back where it was.

/** Seconds after the last touch that each stem is still there. */
export const HOLD: Record<Stem, number> = { ground: 24, song: 14, spark: 5 }
/** What is left of the ground while nobody touches anything. */
export const REST = 0.18

export class Mood {
  private since = Infinity
  /** Rises with each touch and drains away: a lively child hears the spark. */
  private stir = 0

  touch(): void {
    this.since = 0
    this.stir = Math.min(4, this.stir + 1)
  }

  step(seconds: number): void {
    this.since += seconds
    this.stir = Math.max(0, this.stir - seconds * 0.4)
  }

  /** The level each stem should be going towards. */
  levels(): Record<Stem, number> {
    if (this.since === Infinity) return { ground: 0, song: 0, spark: 0 }
    return {
      ground: this.since < HOLD.ground ? 1 : REST,
      song: this.since < HOLD.song ? 1 : 0,
      spark: this.since < HOLD.spark && this.stir > 1.5 ? 1 : 0,
    }
  }
}
