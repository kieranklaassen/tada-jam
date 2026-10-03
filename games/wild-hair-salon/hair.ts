import { HEAD, STEP } from './layout'
import { clippingBox, tuftPose, type Point } from './poses'
import { TICK, ease, type Spring } from './puppet'
import type { Rng } from './rng'
import type { Clipping, Salon } from './world'

// How the hair and the loose things move: each of the three strips (the
// lock, its model and the ribbon) swings and bounces from its root, each tuft
// of the mane leans and springs on its own, a cut piece falls to where it
// will lie, fluff floats up, and the scissors open and close in the hand. The
// model (world.ts) says how long everything is and where it lies; this says
// only how it gets there. Pure numbers, in fixed steps, from a seeded stream.

const G = 2600
/** The most puffs of fluff in the air at once. */
export const MOST_PUFFS = 8

export const STRANDS = ['lock', 'model', 'ribbon'] as const
export type StrandId = (typeof STRANDS)[number]

/** A strip that hangs: its swing in radians from straight down, its length as a share of what the model says, how far it is fanned out by a ruffle, and how far its end is kicked aside. */
export type Strand = { swing: Spring; stretch: Spring; flutter: number; kick: Spring }
/** A tuft: `rest` is the length it is held at, as a share of its own, while a showing has it (1 otherwise). */
export type Tuft = { lean: Spring; stretch: Spring; frizz: number; rest: number }
/** A piece in the air, on its way to where the model already has it. */
export type Flight = { x: number; y: number; vx: number; vy: number; turn: number; spin: number; toX: number; toY: number; bounced: boolean }
/** A puff of fluff, or the fluff ball a rubbed piece rolls up into. */
export type Puff = { x: number; y: number; vx: number; vy: number; r: number; age: number; life: number; hue: string; rolls: boolean }
type Later = { at: number; run: () => void }

const strand = (): Strand => ({ swing: { x: 0, v: 0 }, stretch: { x: 1, v: 0 }, flutter: 0, kick: { x: 0, v: 0 } })

export class Hair {
  private readonly rng: Rng
  private time = 0
  private later: Later[] = []

  readonly strands: Record<StrandId, Strand> = { lock: strand(), model: strand(), ribbon: strand() }
  readonly tufts: Tuft[]
  /** What the fingers hold by its hair, where the finger is, and where that hair is rooted. */
  private held: { what: StrandId | number; to: Point; root: Point } | null = null
  /** The piece or the ribbon carried in the fingers, and where. */
  carried: { what: Clipping | 'ribbon'; at: Point } | null = null
  readonly flights = new Map<Clipping, Flight>()
  readonly puffs: Puff[] = []
  /** The scissors: where the finger is, how far the blades are open (0 shut, 1 open), and how much of them shows. */
  readonly scissors = { at: { x: 0, y: 0 }, open: { x: 0, v: 0 } as Spring, shown: 0, inHand: false }

  constructor(tufts: number, rng: Rng) {
    this.rng = rng
    this.tufts = Array.from({ length: tufts }, () => ({ lean: { x: 0, v: 0 }, stretch: { x: 1, v: 0 }, frizz: 0, rest: 1 }))
  }

  // --- What the finger does -------------------------------------------------

  /** Hair is caught: a strip or a tuft squashes under the finger. `root` is where it is rooted. */
  catch(what: StrandId | number, to: Point, root: Point): void {
    this.held = { what, to, root }
    const spring = typeof what === 'number' ? this.tufts[what]?.stretch : this.strands[what].stretch
    if (spring) spring.x = typeof what === 'number' ? 0.9 : 0.93
  }

  /** The finger moved with something in it. */
  follow(to: Point): void {
    if (this.held) this.held.to = to
    if (this.carried) this.carried.at = to
  }

  /**
   * The hair was let go: it drops with a bounce and swings. `drawnOut` is how
   * much longer than itself it was held, as a share of its length: hair that
   * springs back starts from there.
   */
  letGo(drawnOut = 0): void {
    const held = this.held
    this.held = null
    if (!held) return
    const spring = typeof held.what === 'number' ? this.tufts[held.what]?.stretch : this.strands[held.what].stretch
    if (!spring) return
    if (drawnOut > 0) { spring.x = 1 + drawnOut; spring.v = -3 } else spring.v += typeof held.what === 'number' ? 2.6 : 2.2
  }

  /** Which hair is in the fingers, or nothing. */
  get holds(): StrandId | number | null {
    return this.held ? this.held.what : null
  }

  /** The offset of the finger from where the held hair is rooted, or nothing: how a head knows which way it is pulled. */
  get pull(): Point | null {
    return this.held ? { x: this.held.to.x - this.held.root.x, y: this.held.to.y - this.held.root.y } : null
  }

  // --- What happens to the hair ---------------------------------------------

  /** A strip was cut: the stump twangs up. */
  snipped(what: StrandId): void {
    const s = this.strands[what]
    s.stretch.x = 0.72
    s.stretch.v = 3
    s.swing.v += this.rng.pick([-1, 1]) * 2.4
  }

  /** A strip was plucked: one slow swing. */
  plucked(what: StrandId, side: number): void {
    this.strands[what].swing.v += (side >= 0 ? 1 : -1) * 3.4
  }

  ruffled(what: StrandId): void {
    this.strands[what].flutter = 1
  }

  /** The end of a strip is kicked sideways, the way a lock that is too long is trodden on or a longer one tickles a chin. */
  kicked(what: StrandId, by: number): void {
    this.strands[what].kick.v += by
  }

  tuftSnipped(index: number, where: Point, hue: string): void {
    const tuft = this.tufts[index]
    if (tuft) { tuft.stretch.x = 0.7; tuft.stretch.v = 4 }
    this.fluff(where, hue, 5)
  }

  /** A tuft boings, and the tufts next to it ripple outwards, each a little later and a little less. */
  tuftPoked(index: number): void {
    const tuft = this.tufts[index]
    if (tuft) tuft.stretch.v += 5
    for (let step = 1; step < this.tufts.length; step++) for (const side of [-1, 1]) {
      const other = this.tufts[index + side * step]
      if (!other) continue
      this.later.push({ at: this.time + step * 0.07, run: () => { other.lean.v += (side * 3.2) / step; other.stretch.v += 2 / step } })
    }
  }

  /** The whole mane frizzes into a ball, and sinks back. */
  maneFrizzed(): void {
    for (const tuft of this.tufts) { tuft.frizz = 1; tuft.lean.v += this.rng.range(-4, 4) }
  }

  /** The whole head of hair springs out, from tucked away to its own length: a hat has come off. */
  sprungOut(): void {
    this.tufts.forEach((tuft, index) => { tuft.stretch.x = 0.15; tuft.stretch.v = 3 + (index % 3); tuft.lean.v += this.rng.range(-3, 3) })
    for (const id of ['lock', 'model'] as const) { this.strands[id].stretch.x = 0.2; this.strands[id].stretch.v = 2 }
  }

  /** A few puffs of fluff float up from a point. */
  fluff(from: Point, hue: string, count: number): void {
    for (let i = 0; i < count && this.puffs.length < MOST_PUFFS; i++) {
      this.puffs.push({ x: from.x + this.rng.range(-10, 10), y: from.y + this.rng.range(-8, 8), vx: this.rng.range(-40, 40), vy: this.rng.range(-110, -50), r: this.rng.range(5, 11), age: 0, life: this.rng.range(0.7, 1.2), hue, rolls: false })
    }
  }

  /** A rubbed piece rolls up into a fluff ball that rolls away under the chair. */
  rollAway(from: Point, hue: string): void {
    this.puffs.push({ x: from.x, y: from.y, vx: (HEAD.x - from.x) * 1.1, vy: 0, r: 13, age: 0, life: 0.9, hue, rolls: true })
  }

  /** A piece is on its way from a point to where the model has it: it falls, bounces once and lies still. */
  fly(salon: Salon, piece: Clipping, from: Point, toss = 0): void {
    const box = clippingBox(salon, piece)
    if (!box) return
    const seconds = Math.max(0.16, Math.sqrt((2 * Math.max(20, box.y - from.y)) / G))
    this.flights.set(piece, { x: from.x, y: from.y, vx: (box.x - from.x) / seconds, vy: -toss, turn: this.rng.range(-0.6, 0.6), spin: this.rng.range(-9, 9), toX: box.x, toY: box.y, bounced: false })
  }

  scissorsIn(at: Point): void {
    this.scissors.at = at
    this.scissors.inHand = true
    // They arrive open.
    this.scissors.open.x = 0.2
    this.scissors.open.v = 9
  }

  scissorsMove(at: Point): void {
    this.scissors.at = at
  }

  /** The blades close, and spring open again while they are in the hand. */
  scissorsClose(): void {
    this.scissors.open.x = 0
    this.scissors.open.v = 0
  }

  scissorsOut(): void {
    this.scissors.inHand = false
  }

  /** Everything stops where it belongs: every spring at rest, nothing in the air, nothing in the hand. A scene that was cut short ends here. */
  settle(): void {
    for (const id of STRANDS) Object.assign(this.strands[id], strand())
    for (const tuft of this.tufts) Object.assign(tuft, { lean: { x: 0, v: 0 }, stretch: { x: 1, v: 0 }, frizz: 0, rest: 1 })
    this.flights.clear()
    this.puffs.length = 0
    this.later = []
    this.held = null
    this.carried = null
  }

  /** Nothing is moving any more: every spring is at rest and nothing is in the air. */
  get settled(): boolean {
    const still = (s: Spring, at: number): boolean => Math.abs(s.x - at) < 0.002 && Math.abs(s.v) < 0.01
    return this.held === null && this.carried === null && this.flights.size === 0 && this.puffs.length === 0 && this.later.length === 0
      && STRANDS.every((id) => still(this.strands[id].stretch, 1) && Math.abs(this.strands[id].swing.x) < 0.02 && Math.abs(this.strands[id].swing.v) < 0.05 && this.strands[id].flutter === 0)
      && this.tufts.every((t) => still(t.stretch, t.rest) && t.frizz === 0)
  }

  // --- Time -----------------------------------------------------------------

  step(dt: number, salon: Salon): void {
    let left = dt
    while (left > 1e-9) {
      const tick = Math.min(TICK, left)
      left -= tick
      this.tick(tick, salon)
    }
  }

  private tick(dt: number, salon: Salon): void {
    this.time += dt
    const due = this.later.filter((item) => item.at <= this.time)
    this.later = this.later.filter((item) => item.at > this.time)
    for (const item of due) item.run()

    const held = this.held
    const lengths: Record<StrandId, number> = { lock: salon.lock, model: salon.model, ribbon: salon.ribbon?.len ?? 20 }
    for (const id of STRANDS) {
      const s = this.strands[id]
      if (held && held.what === id) {
        // Towards the finger while it is held.
        const angle = Math.atan2(held.to.x - held.root.x, Math.max(30, held.to.y - held.root.y))
        ease(s.swing, Math.max(-1, Math.min(1, angle)), 320, 30, dt)
        ease(s.stretch, 1, 260, 24, dt)
      } else {
        // A slow pendulum when it is free: a longer strip swings more slowly.
        ease(s.swing, 0, G / Math.max(30, lengths[id] * STEP), 1.5, dt)
        ease(s.stretch, 1, 230, 9, dt)
      }
      ease(s.kick, 0, 60, 5, dt)
      s.flutter = Math.max(0, s.flutter - dt / 0.7)
    }

    const who = salon.chair ?? 'lion'
    this.tufts.forEach((tuft, index) => {
      const steps = salon.mane[index] ?? 0
      const pose = tuftPose(who, index, steps, this.tufts.length)
      // At rest it only sways a little; where it flops to is part of its pose.
      let lean = 0.03 * Math.sin(this.time * (0.7 + 0.11 * index) + index * 1.7)
      let stiffness = 70, damping = 4.2
      const mine = held !== null && held.what === index
      if (held && mine) {
        const towards = Math.atan2(held.to.x - held.root.x, -(held.to.y - held.root.y))
        lean = Math.max(-1.1, Math.min(1.1, wrap(towards - pose.angle)))
        stiffness = 300
        damping = 28
      }
      ease(tuft.lean, lean, stiffness, damping, dt)
      ease(tuft.stretch, tuft.rest, 210, mine ? 24 : 8.5, dt)
      tuft.frizz = Math.max(0, tuft.frizz - dt / 1.3)
    })

    for (const [piece, flight] of this.flights) {
      flight.vy += G * dt
      flight.x += flight.vx * dt
      flight.y += flight.vy * dt
      flight.turn += flight.spin * dt
      if (flight.y >= flight.toY) {
        if (flight.bounced || flight.vy < 260) { this.flights.delete(piece); continue }
        flight.bounced = true
        flight.y = flight.toY
        flight.vy *= -0.28
        flight.vx = 0
        flight.x = flight.toX
        flight.spin *= 0.3
      }
    }

    for (const puff of this.puffs) {
      puff.age += dt
      puff.x += puff.vx * dt
      puff.y += puff.vy * dt
      if (!puff.rolls) { puff.vy *= 1 - 1.6 * dt; puff.vx *= 1 - 1.2 * dt }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) if (this.puffs[i].age >= this.puffs[i].life) this.puffs.splice(i, 1)

    const s = this.scissors
    ease(s.open, 1, 520, 30, dt)
    s.shown = Math.max(0, Math.min(1, s.shown + (s.inHand ? dt : -dt) / 0.09))
  }
}

function wrap(angle: number): number {
  let a = angle
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}
