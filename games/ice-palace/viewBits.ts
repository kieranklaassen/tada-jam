import { BLOCK_H, type Point } from './ground'
import { all, dot, type Print, type Shape } from './print'
import { makeRng } from './rng'
import type { Motion } from './toy'

// The short-lived things the rules only announce: chips, drops, puffs of
// snow, ripples and the scratch of a line that gave no block. The view owns
// them, a save holds none of them, and they are gone on load and at put-away.

type Bit = { x: number; y: number; vx: number; vy: number; pull: number; r: number; age: number; lasts: number }
type Ring = { x: number; y: number; age: number; lasts: number; r: number; turn: number }
type Scratch = { from: Point; to: Point; age: number; lasts: number }

/** No more bits than this are alive at once, whatever is asked for. */
export const MOST_BITS = 140

export class Bits {
  private bits: Bit[] = []
  private rings: Ring[] = []
  private scratches: Scratch[] = []
  private readonly chance = makeRng(77)

  get many(): number {
    return this.bits.length + this.rings.length + this.scratches.length
  }

  /** Everything goes at once: the game was put away, or a scene was ended by a touch. */
  clear(): void {
    this.bits = []
    this.rings = []
    this.scratches = []
  }

  /** Something short-lived the rules announced. */
  take(motion: Motion): void {
    const chance = this.chance
    const fling = (x: number, y: number, many: number, angle: number, spread: number, speed: number, pull: number, r: number, lasts: number): void => {
      for (let i = 0; i < many && this.bits.length < MOST_BITS; i++) {
        const a = angle + (chance.next() - 0.5) * spread, v = speed * (0.4 + chance.next() * 0.8)
        this.bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, pull, r: r * (0.6 + chance.next() * 0.8), age: 0, lasts: lasts * (0.7 + chance.next() * 0.6) })
      }
    }
    switch (motion.type) {
      case 'chips': fling(motion.x, motion.y, motion.many, motion.angle, 1.5, 190, 520, 3.4, 0.5); break
      case 'splash':
        fling(motion.x, motion.y, 34, -Math.PI / 2, 2.4, 560, 900, 8, 1.0)
        this.rings.push({ x: motion.x, y: motion.y, age: 0, lasts: 0.8, r: 110, turn: chance.next() * 6 }, { x: motion.x, y: motion.y, age: -0.12, lasts: 0.8, r: 70, turn: chance.next() * 6 })
        break
      case 'dust': for (let i = 0; i < 6; i++) fling(motion.x + (chance.next() - 0.5) * motion.len, motion.y - BLOCK_H / 2, 1, -Math.PI / 2, 1, 60, 40, 3, 0.7); break
      case 'puff': fling(motion.x, motion.y, 9, -Math.PI / 2, 3, 120, 160, 6, 0.6); break
      case 'flakes': fling(motion.x, motion.y, 10, Math.PI / 2, 2.4, 70, 60, 3.6, 1.6); break
      case 'ripple': this.rings.push({ x: motion.x, y: motion.y, age: 0, lasts: 0.7, r: 44, turn: chance.next() * 6 }); break
      case 'drips': for (let i = 0; i < motion.many; i++) fling(motion.x + (chance.next() - 0.5) * 30, motion.y, 1, Math.PI / 2, 0.3, 40, 700, 3.2, 0.5); break
      case 'scratch': this.scratches.push({ from: motion.from, to: motion.to, age: 0, lasts: 1.4 }); break
      case 'bubbles':
        for (let i = 0; i < 3; i++) fling(motion.x + (chance.next() - 0.5) * 50, motion.y + 6, 1, -Math.PI / 2, 0.5, 46, -30, 4.4, 0.6)
        this.rings.push({ x: motion.x, y: motion.y + 8, age: 0, lasts: 0.6, r: 38, turn: chance.next() * 6 })
        break
      case 'spray': {
        // Drops that fly from the splash to the one they wet, and are there in the step it answers.
        const pull = 900, T = motion.lasts
        for (let i = 0; i < 6 && this.bits.length < MOST_BITS; i++) {
          const ox = (chance.next() - 0.5) * 26, oy = (chance.next() - 0.5) * 26
          this.bits.push({ x: motion.from.x, y: motion.from.y, vx: (motion.to.x + ox - motion.from.x) / T, vy: (motion.to.y + oy - motion.from.y) / T - (pull * T) / 2, pull, r: 4 + chance.next() * 3, age: 0, lasts: T + 0.02 })
        }
        break
      }
      default: motion satisfies never
    }
  }

  /** Moves everything on by `step` seconds of play. */
  age(step: number): void {
    if (step <= 0) return
    for (const bit of this.bits) {
      bit.age += step
      bit.vy += bit.pull * step
      bit.x += bit.vx * step
      bit.y += bit.vy * step
    }
    this.bits = this.bits.filter((bit) => bit.age < bit.lasts)
    for (const ring of this.rings) ring.age += step
    this.rings = this.rings.filter((ring) => ring.age < ring.lasts)
    for (const scratch of this.scratches) scratch.age += step
    this.scratches = this.scratches.filter((scratch) => scratch.age < scratch.lasts)
  }

  /** The scratches a line left, as part of one stroke of paper: each shortens from its start as it fades. */
  scratchLines(): Shape | null {
    if (this.scratches.length === 0) return null
    return (g) => {
      for (const s of this.scratches) {
        const gone = s.age / s.lasts
        g.moveTo(s.from.x + (s.to.x - s.from.x) * gone, s.from.y + (s.to.y - s.from.y) * gone)
        g.lineTo(s.to.x, s.to.y)
      }
    }
  }

  /** Ripples on the water: one stroke for all of them. Each is three arcs of unequal length, never a closed ring. */
  drawRings(p: Print): void {
    const live = this.rings.filter((ring) => ring.age >= 0)
    if (live.length === 0) return
    p.line('paper', 3.4, (g) => {
      for (const ring of live) {
        const out = ring.age / ring.lasts, r = ring.r * (0.3 + out), open = 0.25 + out * 0.5
        for (const [from, long] of [[0, 1.5], [2.2, 0.9], [3.9, 1.7]] as const) {
          const a = ring.turn + from + open * 0.5
          g.moveTo(ring.x + Math.cos(a) * r, ring.y + Math.sin(a) * r * 0.45)
          g.ellipse(ring.x, ring.y, r, r * 0.45, 0, a, a + Math.max(0.2, long - open))
        }
      }
    })
  }

  /** Chips, drops and puffs: each a fleck of paper with a sliver of blue beside it, so it shows on ice and on snow alike. Two fills for all of them. */
  drawBits(p: Print): void {
    if (this.bits.length === 0) return
    const flecks = (shift: number): Shape => all(...this.bits.map((bit) => dot(bit.x + shift, bit.y + shift, bit.r * (1 - (bit.age / bit.lasts) * 0.6))))
    p.fill('blue', flecks(1.6))
    p.fill('paper', flecks(0))
  }
}
