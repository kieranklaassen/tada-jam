import { WATER, isPot, mixOf } from './colours'
import { bulge, makeFlow, pack, pull, readOff, spreadInto, stillFlow, swell, type Spread } from './marble'

// The water in the tray. A drop lands and goes on growing by itself; a pull
// carries colour along and the water coasts on when the hand lets go; a comb
// pulls five lines at once and adds nothing; a breath through the straw
// swells the water under it; soap is a drop of clear water. Where one pot
// colour is pulled through another, beads of what the two make come up a
// moment later. All of it runs on the seconds `step` is given and on nothing
// else, so what is seen and what is heard keep one clock, and the water at
// rest can be worked out ahead of time, cell for cell (`rested`).
// Places and lengths are in cells of the grid.

export const GRID = { w: 208, h: 144 } as const
export const CELLS = GRID.w * GRID.h
/** The one step the water is ever played in. `rested` plays ahead in the same steps, which is why it is exact. */
export const TICK = 1 / 60

/** A drop: the spot it lands as, the bloom it grows into, and how long it takes. */
export const BLOOM = { seed: 4, radius: 13.5, seconds: 0.66 } as const
/** A bead of mixed colour: how long after the pull it comes up, how large, how fast, and how far apart along a pull. */
export const BEAD = { wait: 0.3, radius: 3.6, seconds: 0.36, apart: 8 } as const
/** A pull: the longest piece of a pull made in one move, and how far ahead of a tooth, as a share of its reach, it meets another colour. */
export const PULL = { piece: 2.5, ahead: 0.55 } as const
/** The water after the hand lets go: how fast it loses its speed, below what speed it stops, and the most it starts with (cells a second). */
export const COAST = { slowing: 3.4, stop: 4, most: 120 } as const
/** A breath, on the one clock: how far round it the water swells, how much it swells in a second, the most seconds one breath deepens, the fewest a puff lasts, how many seconds of deepening a cell of travel gives back, and its spokes. */
export const BLOW = { reach: 26, rate: 0.72, most: 0.9, least: 14 / 60, back: 1 / 30, lobes: 7 } as const
/** Soap: a drop of clear water, wider and quicker than a drop of colour. */
export const SOAP = { seed: 3, radius: 15, seconds: 0.5 } as const
/** Blooms that grow at once. One more, and the oldest is full grown at once. */
export const MOST_BLOOMS = 6

/** What pulls: the colour it carries (or -1: whatever lies under each tooth), how many teeth, how far apart, how far round each the water is dragged, and how far round each it is carried whole. */
export type Puller = { carried: number; teeth: number; apart: number; reach: number; core: number }
export const stick = (colour: number): Puller => ({ carried: colour, teeth: 1, apart: 0, reach: 11, core: 1.3 })
export const COMB: Puller = { carried: -1, teeth: 5, apart: 6.5, reach: 4.4, core: 0.8 }

type Bloom = { x: number; y: number; colour: number; from: number; to: number; start: number; seconds: number; baked: number; steady?: boolean }
type Bead = { x: number; y: number; colour: number; at: number }
type Tooth = { x: number; y: number; sinceBead: number }
type Stroke = { x: number; y: number; dirX: number; dirY: number; puller: Puller; teeth: Tooth[]; placed: boolean; vx: number; vy: number }
/** `done` is the seconds the breath has deepened. */
type Blow = { x: number; y: number; held: boolean; done: number; phase: number }

export type TrayEvent = { kind: 'bead'; x: number; y: number; colour: number }

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t) * (1 - t)

export class Tray {
  /** Seconds this water has been played. */
  time = 0
  /** Goes up each time a cell may have changed. */
  version = 0
  /** What happened by itself since the last `takeEvents`. */
  private happened: TrayEvent[] = []
  /** The water with every growing bloom taken out of it, and the water as it shows. */
  private base = new Uint8Array(CELLS)
  private shown = new Uint8Array(CELLS)
  private scratch = new Uint8Array(CELLS)
  private blooms: Bloom[] = []
  private beads: Bead[] = []
  private stroke: Stroke | null = null
  /** Where the hand was at the last step, and how fast it moves, for the coasting. */
  private handWas: { x: number; y: number } | null = null
  private speed = { x: 0, y: 0 }
  private coast: Stroke | null = null
  private blow: Blow | null = null
  private breaths = 0
  private stale = false
  /** The flow that pulls and breaths are made on, the water as it was when the flow began, and whether the flow still holds for the water as it is. */
  private flow = makeFlow(CELLS)
  private origin = new Uint8Array(CELLS)
  private flowing = false

  constructor(cells?: Uint8Array) {
    if (cells && cells.length === CELLS) {
      this.base.set(cells)
      this.shown.set(cells)
    }
  }

  /** The water as it shows now. */
  get cells(): Uint8Array {
    this.show()
    return this.shown
  }

  /** Anything still moving by itself: a bloom, a bead on its way, the coasting, a breath. */
  get moving(): boolean {
    return this.blooms.length > 0 || this.beads.length > 0 || this.coast !== null || this.blow !== null
  }

  /** How far the breath has deepened, 0 to 1, or 0 with no breath. */
  get breath(): number {
    if (!this.blow) return 0
    return this.blow.done >= BLOW.most - 1e-9 ? 1 : this.blow.done / BLOW.most
  }

  at(x: number, y: number): number {
    const cx = Math.floor(x), cy = Math.floor(y)
    return cx >= 0 && cy >= 0 && cx < GRID.w && cy < GRID.h ? this.cells[cy * GRID.w + cx] : WATER
  }

  takeEvents(): TrayEvent[] {
    const events = this.happened
    this.happened = []
    return events
  }

  /** A drop lands: a spot at once, and a bloom by itself after. A drop of `WATER` is soap. */
  drop(x: number, y: number, colour: number, radius: number = BLOOM.radius, seconds: number = BLOOM.seconds, seed: number = BLOOM.seed): void {
    const cx = Math.min(GRID.w - 0.5, Math.max(0.5, x)), cy = Math.min(GRID.h - 0.5, Math.max(0.5, y))
    this.blooms.push({ x: cx, y: cy, colour, from: Math.min(seed, radius) ** 2, to: radius * radius, start: this.time, seconds, baked: 0 })
    if (this.blooms.length > MOST_BLOOMS) this.bake(1, true)
    this.touch()
  }

  /** A finger rests where it dropped colour: the bloom there goes on growing at one even pace, to `radius` more, until `swellEnd`. */
  swellStart(x: number, y: number, colour: number, radius: number, seconds: number): void {
    this.swellEnd()
    this.blooms.push({ x, y, colour, from: 0, to: radius * radius, start: this.time, seconds, baked: 0, steady: true })
    this.touch()
  }

  /** The finger no longer rests: what the swell has given stays, and it gives no more. */
  swellEnd(): void {
    const index = this.blooms.findIndex((bloom) => bloom.steady)
    if (index < 0) return
    const [bloom] = this.blooms.splice(index, 1)
    this.lay(bloom, this.grown(bloom))
    this.touch()
  }

  /** A pull begins where the hand is. */
  strokeStart(x: number, y: number, puller: Puller): void {
    this.coast = null
    const teeth: Tooth[] = []
    for (let i = 0; i < puller.teeth; i++) teeth.push({ x, y, sinceBead: BEAD.apart })
    this.stroke = { x, y, dirX: 1, dirY: 0, puller, teeth, placed: puller.teeth === 1, vx: 0, vy: 0 }
    this.handWas = { x, y }
    this.speed = { x: 0, y: 0 }
  }

  /** The hand has moved to here. */
  strokeTo(x: number, y: number): void {
    if (this.stroke) this.carry(this.stroke, x, y)
  }

  /** The hand let go, and the water coasts on. A pull that was taken away (`coasting` false) stops where it is. */
  strokeEnd(coasting = true): void {
    const stroke = this.stroke
    this.stroke = null
    this.handWas = null
    if (!stroke || !coasting) return
    const fast = Math.hypot(this.speed.x, this.speed.y)
    if (fast < COAST.stop) return
    const cap = Math.min(1, COAST.most / fast)
    stroke.vx = this.speed.x * cap
    stroke.vy = this.speed.y * cap
    this.coast = stroke
  }

  /** A breath begins here and deepens for as long as it is held. */
  blowStart(x: number, y: number): void {
    this.breaths += 1
    this.blow = { x, y, held: true, done: 0, phase: this.breaths * 1.7 }
  }

  /** The straw has moved: the breath follows, and has that much deepening to do again. */
  blowTo(x: number, y: number): void {
    const blow = this.blow
    if (!blow || !blow.held) return
    blow.done = Math.max(0, blow.done - Math.hypot(x - blow.x, y - blow.y) * BLOW.back)
    blow.x = x
    blow.y = y
  }

  /** The breath is let go. A puff that was shorter than the shortest breath plays out by itself. */
  blowEnd(): void {
    if (this.blow) this.blow.held = false
  }

  /** Plays one step. `dt` is always `TICK`: the toy plays in whole ticks. */
  step(dt: number): void {
    if (dt <= 0) return
    this.time += dt
    if (this.stroke && this.handWas) {
      // The hand's speed, eased, so one late move does not throw the water.
      const vx = (this.stroke.x - this.handWas.x) / dt, vy = (this.stroke.y - this.handWas.y) / dt
      this.speed.x += (vx - this.speed.x) * 0.35
      this.speed.y += (vy - this.speed.y) * 0.35
      this.handWas.x = this.stroke.x
      this.handWas.y = this.stroke.y
    }
    const coast = this.coast
    if (coast) {
      this.carry(coast, coast.x + coast.vx * dt, coast.y + coast.vy * dt)
      const keep = Math.exp(-COAST.slowing * dt)
      coast.vx *= keep
      coast.vy *= keep
      const far = 20
      const outside = coast.x < -far || coast.y < -far || coast.x > GRID.w + far || coast.y > GRID.h + far
      if (outside || Math.hypot(coast.vx, coast.vy) < COAST.stop) this.coast = null
    }
    const blow = this.blow
    if (blow) {
      // A breath is counted in the seconds it has deepened, so it lasts as long whatever the step.
      if (blow.done < BLOW.most - 1e-9 && (blow.held || blow.done < BLOW.least - 1e-9)) {
        this.settleBlooms()
        this.flows()
        readOff(this.flow, this.origin, this.base, GRID.w, GRID.h, bulge(this.flow, GRID.w, GRID.h, blow.x, blow.y, BLOW.reach, BLOW.rate * dt, BLOW.lobes, blow.phase))
        blow.done += dt
        this.touch()
      } else if (!blow.held) this.blow = null
    }
    while (this.beads.length > 0 && this.beads[0].at <= this.time) {
      const bead = this.beads.shift()!
      this.drop(bead.x, bead.y, bead.colour, BEAD.radius, BEAD.seconds, 1)
      this.happened.push({ kind: 'bead', x: bead.x, y: bead.y, colour: bead.colour })
    }
    if (this.blooms.length > 0) {
      let done = 0
      while (done < this.blooms.length && this.time >= this.blooms[done].start + this.blooms[done].seconds) done += 1
      if (done > 0) this.bake(done, true)
      this.touch()
    }
  }

  /** The hand is taken away and everything that moves by itself is played to its end, in the same steps as ever. Nothing is heard of it. */
  settle(): void {
    this.swellEnd()
    this.strokeEnd(false)
    this.blowEnd()
    for (let guard = 0; this.moving && guard < 1200; guard++) this.step(TICK)
    this.happened = []
    this.show()
  }

  /** A second water that will play exactly as this one does from here, with no hand on it. */
  clone(): Tray {
    const twin = new Tray()
    twin.time = this.time
    twin.base.set(this.base)
    twin.blooms = this.blooms.map((bloom) => ({ ...bloom }))
    twin.beads = this.beads.map((bead) => ({ ...bead }))
    twin.coast = this.coast ? { ...this.coast, teeth: this.coast.teeth.map((tooth) => ({ ...tooth })) } : null
    twin.blow = this.blow ? { ...this.blow, held: false } : null
    twin.breaths = this.breaths
    twin.flowing = this.flowing
    if (this.flowing) {
      twin.flow.x.set(this.flow.x)
      twin.flow.y.set(this.flow.y)
      twin.origin.set(this.origin)
    }
    twin.stale = true
    return twin
  }

  /** The water as it will lie at rest if no hand touches it again, as text for a save. The water that is playing is not touched. */
  rested(): string {
    if (!this.moving) return pack(this.cells)
    const twin = this.clone()
    twin.settle()
    return pack(twin.cells)
  }

  /** How much a bloom has taken by now. */
  private grown(bloom: Bloom): number {
    const t = Math.min(1, Math.max(0, (this.time - bloom.start) / bloom.seconds))
    return bloom.from + (bloom.to - bloom.from) * (bloom.steady ? t : easeOut(t))
  }

  /**
   * The first `count` blooms go into the water for good: full grown when `whole`, as far as they have got
   * otherwise. A bloom that goes in for the first time is laid into the grid itself. One that is already in and
   * has grown since pushes the water outward on the flow, so a bloom that grows while it is pulled is not
   * rounded to whole cells at every step.
   */
  private bake(count: number, whole: boolean): void {
    for (let i = 0; i < count; i++) this.lay(this.blooms[i], whole ? this.blooms[i].to : this.grown(this.blooms[i]))
    if (whole) this.blooms.splice(0, count)
  }

  /** One bloom goes into the water as far as `now`. */
  private lay(bloom: Bloom, now: number): void {
    const added = now - bloom.baked
    if (added <= 1e-9) return
    if (bloom.baked > 0) {
      this.flows()
      swell(this.flow, GRID.w, GRID.h, bloom.x, bloom.y, added)
      readOff(this.flow, this.origin, this.base, GRID.w, GRID.h, null)
    } else {
      spreadInto(this.base, this.scratch, GRID.w, GRID.h, [{ x: bloom.x, y: bloom.y, colour: bloom.colour, added }])
      const spare = this.base
      this.base = this.scratch
      this.scratch = spare
      this.flowing = false
    }
    bloom.baked = now
  }

  /** Makes sure the flow holds for the water as it is: when something else has changed the grid, the flow begins again from here. */
  private flows(): void {
    if (this.flowing) return
    this.origin.set(this.base)
    stillFlow(this.flow, GRID.w, GRID.h)
    this.flowing = true
  }

  /** Every growing bloom is taken into the water as far as it has got, so a pull or a breath moves what is seen. */
  private settleBlooms(): void {
    if (this.blooms.length > 0) this.bake(this.blooms.length, false)
  }

  private touch(): void {
    this.stale = true
    this.version += 1
  }

  private show(): void {
    if (!this.stale) return
    this.stale = false
    if (this.blooms.length === 0) {
      this.shown.set(this.base)
      return
    }
    const spreads: Spread[] = this.blooms.map((bloom) => ({ x: bloom.x, y: bloom.y, colour: bloom.colour, added: this.grown(bloom) - bloom.baked }))
    spreadInto(this.base, this.shown, GRID.w, GRID.h, spreads)
  }

  private colourAt(x: number, y: number): number {
    const cx = Math.floor(x), cy = Math.floor(y)
    return cx >= 0 && cy >= 0 && cx < GRID.w && cy < GRID.h ? this.base[cy * GRID.w + cx] : WATER
  }

  /** Carries the water from where `hand` is to `(x, y)`, in short pieces, and leaves a bead on its way where colours meet. */
  private carry(hand: Stroke, x: number, y: number): void {
    const length = Math.hypot(x - hand.x, y - hand.y)
    if (length < 0.7) return
    this.settleBlooms()
    const puller = hand.puller, ux = (x - hand.x) / length, uy = (y - hand.y) / length
    if (!hand.placed) {
      // A comb is set down across the way it first moves.
      hand.dirX = ux
      hand.dirY = uy
      hand.placed = true
      hand.teeth.forEach((tooth, i) => {
        const off = (i - (puller.teeth - 1) / 2) * puller.apart
        tooth.x = hand.x - uy * off
        tooth.y = hand.y + ux * off
      })
    } else if (puller.teeth > 1) {
      // And turns with the hand, a little late.
      const dx = hand.dirX * 0.7 + ux * 0.3, dy = hand.dirY * 0.7 + uy * 0.3, long = Math.hypot(dx, dy) || 1
      hand.dirX = dx / long
      hand.dirY = dy / long
    }
    // Short pieces, shorter still for a narrow tooth: a piece longer than half a tooth's reach would fold the water.
    const pieces = Math.ceil(length / Math.min(PULL.piece, (puller.reach - puller.core) * 0.36))
    const fromX = hand.x, fromY = hand.y
    for (let i = 1; i <= pieces; i++) {
      const hx = fromX + ((x - fromX) * i) / pieces, hy = fromY + ((y - fromY) * i) / pieces
      for (let t = 0; t < hand.teeth.length; t++) {
        const tooth = hand.teeth[t], off = (t - (puller.teeth - 1) / 2) * puller.apart
        const bx = hx - hand.dirY * off, by = hy + hand.dirX * off
        const piece = Math.hypot(bx - tooth.x, by - tooth.y)
        if (piece < 1e-6) continue
        // What the tooth is about to meet. Under the tooth itself lies the colour it carries, always: a pull
        // takes what is under it along. So the meeting is looked for ahead of it, where the water is half moved.
        const ax = bx + ((bx - tooth.x) / piece) * puller.reach * PULL.ahead, ay = by + ((by - tooth.y) / piece) * puller.reach * PULL.ahead
        const there = this.colourAt(ax, ay)
        const carried = puller.carried >= 0 ? puller.carried : this.colourAt(tooth.x, tooth.y)
        this.flows()
        readOff(this.flow, this.origin, this.base, GRID.w, GRID.h, pull(this.flow, GRID.w, GRID.h, tooth.x, tooth.y, bx, by, puller.reach, puller.core))
        tooth.sinceBead += piece
        tooth.x = bx
        tooth.y = by
        // A comb carries no colour of its own: it brings up a bead only where two pot colours meet under it.
        const makes = puller.carried >= 0 || isPot(there) ? mixOf(carried, there) : WATER
        if (makes !== WATER && tooth.sinceBead >= BEAD.apart) {
          tooth.sinceBead = 0
          this.beads.push({ x: ax, y: ay, colour: makes, at: this.time + BEAD.wait })
        }
      }
      hand.x = hx
      hand.y = hy
    }
    this.touch()
  }
}
