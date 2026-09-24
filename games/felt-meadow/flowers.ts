import { RED, type Hue } from './colors'
import { PLOTS, plotTop, STEM_HEIGHT } from './layout'
import { smoothstep, stiffSpring, type Spring } from './math'

// One molehill's flower, as springs. Planting runs a short timeline: the
// soil takes the seed, the stem shoots up past its height and settles, the
// leaves unfurl, the bud swells after a small squeeze (anticipation), and the
// petals open one after another with overshoot. A bloomed flower sways in a
// breeze, droops under the bee and springs back past rest when it leaves,
// and wobbles on a tap. Picking it pulls it up: the stem slips out of the
// soil, the petals close around the seed, and the closed bud shrinks into it.

export const PETALS = 6
export const BLOOM_AT = 1.45
export const GROWN_AT = 2.8
/** How long a new flower stays new once it has finished opening. */
export const NEW_SECONDS = 1
export const PLUCK_SECONDS = 0.55
/** How far a bloomed face leans toward the child (radians), so she sees into it. It turns up level for the bee. */
export const FACE_TILT = 0.55
/** From the head's centre to a petal's tip, and how high an open tip stands over a level face's centre. */
export const PETAL_REACH = 7.25
const TIP_RISE = 2.2

/** How high a face leaning so (radians about x and z) reaches over the head's centre: its highest petal tip. */
export function faceRise(leanX: number, leanZ: number): number {
  const lean = Math.hypot(leanX, leanZ)
  return PETAL_REACH * Math.sin(lean) + TIP_RISE * Math.cos(lean)
}

export type FlowerPhase = 'empty' | 'growing' | 'bloom' | 'plucked'

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
  /** True while the bee is on its way to this flower or sitting on it: the face turns up level to take it. */
  beeComing = false
  /** 0 leaning toward the child .. 1 turned up level for the bee; past 0 as it springs back. */
  readonly visit: Spring = { x: 0, v: 0 }
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

  /** While picked: 0..1 how far the petals have closed around the seed. */
  pluckClose(): number {
    return this.phase === 'plucked' ? smoothstep(0, 0.3, this.pluckT) : 0
  }

  /** While picked: 1..0 how much of the closed bud is left as it shrinks into the seed. */
  pluckKeep(): number {
    return this.phase === 'plucked' ? 1 - smoothstep(0.22, PLUCK_SECONDS, this.pluckT) : 1
  }

  /** While picked: 1..0 how much of the stem still trails from the soil. */
  pluckStem(): number {
    return this.phase === 'plucked' ? 1 - smoothstep(0, 0.25, this.pluckT) : 1
  }

  bloomed(): boolean {
    return this.phase === 'bloom' || (this.phase === 'growing' && this.age > BLOOM_AT + 0.3)
  }

  /** Still opening, or only just open: the moment the child planted it for. */
  isNew(): boolean {
    return this.phase === 'growing' || (this.phase === 'bloom' && this.age < GROWN_AT + NEW_SECONDS)
  }

  /** True during the frame the petals start to open (for the bloom note). */
  step(dt: number, t: number): boolean {
    const before = this.age
    this.age += dt
    stiffSpring(this.soil, 0, dt, 160, 9)
    if (this.phase === 'empty') return false
    if (this.phase === 'plucked') {
      this.pluckT += dt
      if (this.pluckT >= PLUCK_SECONDS) this.clear()
      return false
    }
    const age = this.age
    stiffSpring(this.stem, age > 0.3 ? 1 : 0, dt, 95, 8.5)
    stiffSpring(this.leaves, age > 0.68 ? 1 : 0, dt, 130, 8)
    stiffSpring(this.bud, age > 1.0 ? 1 : 0, dt, 110, 10)
    this.budSqueeze = age > 1.25 && age < BLOOM_AT ? Math.sin(((age - 1.25) / (BLOOM_AT - 1.25)) * Math.PI) : 0
    for (let i = 0; i < PETALS; i++) stiffSpring(this.petals[i], age > BLOOM_AT + i * 0.05 ? 1 : 0, dt, 170, 7.5)
    if (this.phase === 'growing' && age >= GROWN_AT) this.phase = 'bloom'

    const breeze = Math.sin(t * 0.9 + this.phaseOffset) * 0.5 + Math.sin(t * 2.3 + this.phaseOffset * 1.7) * 0.18
    stiffSpring(this.bendX, breeze + (this.beeOn ? 0.6 : 0), dt, 42, 3.4)
    stiffSpring(this.bendZ, Math.sin(t * 0.7 + this.phaseOffset * 0.6) * 0.3, dt, 42, 3.4)
    stiffSpring(this.droop, this.beeOn ? 1.9 : 0, dt, 60, 4.2)
    stiffSpring(this.visit, this.beeComing ? 1 : 0, dt, 90, 12)
    return before < BLOOM_AT && age >= BLOOM_AT
  }

  /** The head's lean over a stem based at (bx, bz), radians about x (toward the child) and z, written into `out`. */
  lean(head: { x: number; z: number }, bx: number, bz: number, out: { x: number; z: number }): { x: number; z: number } {
    const toward = 1 - this.visit.x
    out.x = FACE_TILT * toward + (head.z - bz) * 0.03 + this.droop.x * 0.06 * toward
    out.z = -(head.x - bx) * 0.035
    return out
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
