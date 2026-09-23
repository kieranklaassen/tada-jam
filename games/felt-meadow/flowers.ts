import { RED, type Hue } from './colors'
import { PLOTS, plotTop, STEM_HEIGHT } from './layout'

// One molehill's flower, as springs. Planting runs a short timeline: the
// soil takes the seed, the stem shoots up past its height and settles, the
// leaves unfurl, the bud swells after a small squeeze (anticipation), and the
// petals open one after another with overshoot. A bloomed flower sways in a
// breeze, droops under the bee and springs back past rest when it leaves,
// and wobbles on a tap. Picking it pulls it up and folds it into a seed.

export const PETALS = 6
export const BLOOM_AT = 1.45
export const GROWN_AT = 2.8
export const PLUCK_SECONDS = 0.3

export type FlowerPhase = 'empty' | 'growing' | 'bloom' | 'plucked'

type Spring = { x: number; v: number }

function spring(s: Spring, target: number, dt: number, stiffness: number, damping: number): number {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    s.v += (stiffness * (target - s.x) - damping * s.v) * h
    s.x += s.v * h
  }
  return s.x
}

export class Flower {
  readonly plot: number
  phase: FlowerPhase = 'empty'
  hue: Hue = RED
  age = 0
  readonly stem: Spring = { x: 0, v: 0 }
  readonly leaves: Spring = { x: 0, v: 0 }
  readonly bud: Spring = { x: 0, v: 0 }
  readonly petals: Spring[] = Array.from({ length: PETALS }, () => ({ x: 0, v: 0 }))
  /** Tip of the stem, pushed around by the breeze, taps, and the bee. */
  readonly bendX: Spring = { x: 0, v: 0 }
  readonly bendZ: Spring = { x: 0, v: 0 }
  readonly droop: Spring = { x: 0, v: 0 }
  /** Molehill soil: positive squashes it (a seed going in), negative stretches it (a flower pulled out). */
  readonly soil: Spring = { x: 0, v: 0 }
  budSqueeze = 0
  beeOn = false
  /** Where the plucked flower is being carried, while it folds. */
  carryX = 0
  carryY = 0
  carryZ = 0
  pluckT = 0
  private readonly phaseOffset: number

  constructor(plot: number) {
    this.plot = plot
    this.phaseOffset = plot * 2.1
  }

  /** Show an already-grown flower (a saved meadow). */
  grown(hue: Hue): void {
    this.phase = 'bloom'
    this.hue = hue
    this.age = GROWN_AT
    this.stem.x = this.leaves.x = this.bud.x = 1
    for (const petal of this.petals) petal.x = 1
  }

  plant(hue: Hue): void {
    this.phase = 'growing'
    this.hue = hue
    this.age = 0
    this.stem.x = this.stem.v = 0
    this.leaves.x = this.leaves.v = 0
    this.bud.x = this.bud.v = 0
    for (const petal of this.petals) petal.x = petal.v = 0
    this.soil.v += 9
  }

  pluck(x: number, y: number, z: number): void {
    this.phase = 'plucked'
    this.pluckT = 0
    this.beeOn = false
    this.carryX = x
    this.carryY = y
    this.carryZ = z
    this.soil.v -= 7
  }

  clear(): void {
    this.phase = 'empty'
    this.beeOn = false
  }

  boing(): void {
    this.bendX.v += (this.plot % 2 === 0 ? 1 : -1) * 38
    this.droop.v -= 12
  }

  bloomed(): boolean {
    return this.phase === 'bloom' || (this.phase === 'growing' && this.age > BLOOM_AT + 0.3)
  }

  /** True during the frame the petals start to open (for the bloom note). */
  step(dt: number, t: number): boolean {
    const before = this.age
    this.age += dt
    spring(this.soil, 0, dt, 160, 9)
    if (this.phase === 'empty') return false
    if (this.phase === 'plucked') {
      this.pluckT += dt
      if (this.pluckT >= PLUCK_SECONDS) this.clear()
      return false
    }
    const age = this.age
    spring(this.stem, age > 0.3 ? 1 : 0, dt, 95, 8.5)
    spring(this.leaves, age > 0.68 ? 1 : 0, dt, 130, 8)
    spring(this.bud, age > 1.0 ? 1 : 0, dt, 110, 10)
    this.budSqueeze = age > 1.25 && age < BLOOM_AT ? Math.sin(((age - 1.25) / (BLOOM_AT - 1.25)) * Math.PI) : 0
    for (let i = 0; i < PETALS; i++) spring(this.petals[i], age > BLOOM_AT + i * 0.05 ? 1 : 0, dt, 170, 7.5)
    if (this.phase === 'growing' && age >= GROWN_AT) this.phase = 'bloom'

    const breeze = Math.sin(t * 0.9 + this.phaseOffset) * 0.5 + Math.sin(t * 2.3 + this.phaseOffset * 1.7) * 0.18
    spring(this.bendX, breeze + (this.beeOn ? 0.6 : 0), dt, 42, 3.4)
    spring(this.bendZ, Math.sin(t * 0.7 + this.phaseOffset * 0.6) * 0.3, dt, 42, 3.4)
    spring(this.droop, this.beeOn ? 1.9 : 0, dt, 60, 4.2)
    return before < BLOOM_AT && age >= BLOOM_AT
  }

  /** Top of the stem (the flower head), written into `out`. */
  headAt(out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    if (this.phase === 'plucked') {
      out.x = this.carryX
      out.y = this.carryY
      out.z = this.carryZ
      return out
    }
    const p = PLOTS[this.plot]
    const height = STEM_HEIGHT * Math.max(0, this.stem.x)
    out.x = p.x + this.bendX.x
    out.y = plotTop(this.plot) + height - this.droop.x
    out.z = p.z + this.bendZ.x
    return out
  }
}
