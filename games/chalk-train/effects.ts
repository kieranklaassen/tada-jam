import { between, type Rng } from './rng'
import type { Pt } from './yard'

// The loose things a touch or a ride throws up: dust, drops, seeds, ripples,
// smoke and the prints wheels leave. Plain numbers on game time, drawn by the
// view as dots and rings. None of it is saved: it shows while the child is
// looking and is gone.

/** A puff of smoke in this colour is grey: white chalk dust thin enough for the tar to show through. There is no grey chalk. */
export const GREY = -2

export type BitKind = 'dust' | 'drop' | 'seed' | 'ripple' | 'smoke' | 'ring' | 'print' | 'trail' | 'feather' | 'stub'

export type Bit = {
  kind: BitKind
  x: number
  y: number
  vx: number
  vy: number
  /** Seconds lived and seconds to live. */
  age: number
  life: number
  size: number
  /** A chalk colour index, or -1 for the thing's own colour. */
  colour: number
}

/** How each kind moves: its pull downward, how fast it slows, and how it grows. */
const WAYS: Record<BitKind, { pull: number; drag: number; grow: number }> = {
  dust: { pull: 120, drag: 2.5, grow: 0 },
  drop: { pull: 900, drag: 0.2, grow: 0 },
  seed: { pull: -14, drag: 0.9, grow: 0 },
  ripple: { pull: 0, drag: 0, grow: 70 },
  smoke: { pull: -46, drag: 0.8, grow: 16 },
  ring: { pull: -30, drag: 0.6, grow: 34 },
  print: { pull: 0, drag: 0, grow: 0 },
  trail: { pull: 0, drag: 0, grow: 0 },
  // A feather floats down slowly; a dropped stub of chalk falls.
  feather: { pull: 70, drag: 2.2, grow: 0 },
  stub: { pull: 700, drag: 0.4, grow: 0 },
}

export class Bits {
  list: Bit[] = []
  private rng: Rng
  private cap: number

  constructor(rng: Rng, cap = 220) {
    this.rng = rng
    this.cap = cap
  }

  /** How many bits the tar may hold at once; a cheaper tier holds fewer, and the oldest go at once. */
  setCap(cap: number): void {
    this.cap = cap
    if (this.list.length > cap) this.list.splice(0, this.list.length - cap)
  }

  private add(bit: Bit): void {
    // Past the cap the oldest go first, so a new touch is always answered.
    while (this.list.length >= this.cap) this.list.shift()
    this.list.push(bit)
  }

  /** A burst of one kind from a point. */
  burst(kind: BitKind, at: Pt, count: number, speed: number, colour = -1, size = 2.2, life = 0.7, up = 0.5): void {
    for (let i = 0; i < count; i++) {
      const a = between(this.rng, 0, Math.PI * 2), v = speed * between(this.rng, 0.35, 1)
      this.add({ kind, x: at.x + between(this.rng, -4, 4), y: at.y + between(this.rng, -4, 4), vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * up, age: 0, life: life * between(this.rng, 0.6, 1.2), size: size * between(this.rng, 0.6, 1.4), colour })
    }
  }

  /** One bit that stays where it is put and fades: a ripple, a print, a dusty trail. */
  lay(kind: BitKind, at: Pt, size: number, life: number, colour = -1): void {
    this.add({ kind, x: at.x, y: at.y, vx: 0, vy: 0, age: 0, life, size, colour })
  }

  /** One puff of smoke leaving a point, drifting. `colour` is white, or `GREY` for a thin one. */
  puff(kind: 'smoke' | 'ring', at: Pt, drift: number, size = 9, life = 1.6, colour = 0): void {
    this.add({ kind, x: at.x, y: at.y, vx: drift + between(this.rng, -8, 8), vy: -30 + between(this.rng, -8, 8), age: 0, life, size, colour })
  }

  step(dt: number): void {
    let kept = 0
    for (const bit of this.list) {
      bit.age += dt
      if (bit.age >= bit.life) continue
      const way = WAYS[bit.kind]
      bit.vy += way.pull * dt
      const slow = Math.max(0, 1 - way.drag * dt)
      bit.vx *= slow
      bit.vy *= slow
      bit.x += bit.vx * dt
      bit.y += bit.vy * dt
      bit.size += way.grow * dt
      this.list[kept++] = bit
    }
    this.list.length = kept
  }
}

/** How strongly a bit shows, 1 fresh to 0 gone. */
export const fade = (bit: Bit): number => Math.max(0, 1 - bit.age / bit.life)
