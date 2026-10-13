import { below, makeRng, type Rng } from './rng'
import { beadIndex, type BeadKey } from './palette'
import { wrap } from './trail'

// Loose beads: the ones the fox kicks off the board when it starts, stops,
// lands and is thrown back. They fly, bounce on the board, lie for a moment
// and are gone. They are short-lived by the sheet: nothing of them is saved.
// Chance comes from a stream of its own, so the rules never share it.

export type Loose = {
  /** Pegs along the trail, pegs to the right of its middle, and pegs above the board. */
  s: number
  x: number
  y: number
  vs: number
  vx: number
  vy: number
  /** Seconds left before it is gone, and how it tumbles. */
  life: number
  /** The bead's colour number (palette.ts). */
  colour: number
}

const PULL = 260
const BOUNCE = 0.45
/** How big a loose bead is drawn, in pegs: larger than a bead of a figure, so that it is seen from across a room. */
export const LOOSE_SIZE = 2.4
/** A bead lies half its width above the board. */
const REST = LOOSE_SIZE / 2
/** Seconds over which a bead shrinks away at the end of its life. */
export const FADE = 0.25

const COLOURS: readonly BeadKey[] = ['t', 'T', 'C', 'Y', 'R', 'U', 'l', 'P', 'W']

export class Spray {
  readonly beads: Loose[] = []
  private readonly rng: Rng
  /** The most beads that fly at once; a quality tier lowers it. */
  limit: number

  constructor(seed: number, limit: number) {
    this.rng = makeRng(seed)
    this.limit = limit
  }

  /**
   * Throws `count` beads from a place: `along` is how fast they go down the trail (minus is back towards the
   * child), `spread` how far their speeds differ, `up` how hard they are thrown upward.
   */
  burst(s: number, x: number, count: number, along: number, spread: number, up: number, colours: readonly BeadKey[] = COLOURS): void {
    for (let i = 0; i < count; i++) {
      if (this.beads.length >= this.limit) this.beads.shift()
      const rng = this.rng
      this.beads.push({
        // Each in a plane of its own, so that no two of a burst lie in one.
        s: wrap(s + (rng.next() - 0.5) * 3),
        x: x + (rng.next() - 0.5) * 6,
        y: REST,
        vs: along + (rng.next() - 0.5) * spread,
        vx: (rng.next() - 0.5) * spread,
        vy: up * (0.6 + rng.next() * 0.8),
        life: 1.1 + rng.next() * 0.9,
        colour: beadIndex(colours[below(rng, colours.length)]),
      })
    }
  }

  /** Lays one bead on the board where it is, to lie a while: a print. */
  drop(s: number, x: number, colour: BeadKey): void {
    if (this.beads.length >= this.limit) this.beads.shift()
    this.beads.push({ s: wrap(s), x, y: REST, vs: 0, vx: 0, vy: 0, life: 2.4, colour: beadIndex(colour) })
  }

  step(seconds: number): void {
    const beads = this.beads
    for (let i = beads.length - 1; i >= 0; i--) {
      const bead = beads[i]
      bead.life -= seconds
      if (bead.life <= 0) {
        beads.splice(i, 1)
        continue
      }
      bead.vy -= PULL * seconds
      bead.s = wrap(bead.s + bead.vs * seconds)
      bead.x += bead.vx * seconds
      bead.y += bead.vy * seconds
      if (bead.y < REST) {
        // It never goes into the board: it bounces, a little lower each time, and then lies.
        bead.y = REST
        bead.vy = Math.abs(bead.vy) > 30 ? -bead.vy * BOUNCE : 0
        bead.vs *= 0.6
        bead.vx *= 0.6
      }
    }
  }
}
