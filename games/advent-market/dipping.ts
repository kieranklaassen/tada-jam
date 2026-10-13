import { FATTEST, PARTS, coatPart, girth, isBare, meltPart, type Candle, type Colour } from './candle'
import { COUNTER, FREE, LENGTH, POT, REST, STEP, STICK } from './hall'
import type { Rng } from './rng'

// The toy: a wick on a stick, a pot of warm wax, and what the hand does with
// them. Everything here runs on the seconds it is stepped by and nothing
// else, so sight and sound share one clock: a drop lands, and the plip is
// made, in the same step. No renderer, no sound, no timer of the browser.

/** A part left under the wax this long is warned: the wax bubbles at the candle, seen and heard, and nothing melts yet. */
export const WARN_AFTER = 1.6
/** A part left under the wax this long starts to melt instead of taking a coat. A dip of two seconds leaves no less than it found. */
export const MELT_AFTER = 3
/** Steps of thickness a part loses each second once it melts: a coat, which one dip makes, takes two seconds to go. */
export const MELT_RATE = 2
/** Seconds a fresh coat stays glossy, and seconds it stays warm enough to take only a thin coat. */
export const WET_SECONDS = 1.6
export const WARM_SECONDS = 3
/**
 * The two ways the pot bubbles, so a warning can be told from melting. A warning is slow and few: two bubbles at
 * the candle, each a long time growing, and a sound now and then. Melting is hard: five across the pot, quick, one
 * sound after another. `count` is how many are drawn, `pace` how many times a second each grows and bursts,
 * `gap` the least seconds between two sounds, and `spread` how far from the candle they rise.
 */
export const BUBBLES = {
  warn: { count: 2, pace: 0.55, gap: 0.9, spread: 26 },
  melt: { count: 5, pace: 1.6, gap: 0.2, spread: 70 },
} as const
const GRAVITY = 1500
const MAX_DROPS = 10, MAX_SPOTS = 8
export const MAX_RINGS = 4
export const SPOT_SECONDS = 6
export const RING_SECONDS = 1.2

export type DipEvent =
  | { type: 'knock' }
  | { type: 'gloop'; fat: number }
  | { type: 'lift'; fat: number; coated: number }
  | { type: 'plip'; size: number; variant: number }
  | { type: 'tick' }
  | { type: 'blob' }
  | { type: 'bubble'; variant: number }
  | { type: 'bare' }
  | { type: 'hang' }
  | { type: 'stand' }

export type Drop = { x: number; y: number; vy: number; size: number; colour: number }
export type Ring = { x: number; age: number; size: number }
export type WaxSpot = { x: number; y: number; age: number; size: number; colour: number }

/** How much candle under the wax raises it by one stage unit, and the most a candle raises it by standing in it. */
const DISPLACES = 1400
export const LEVEL = { dipped: 8, melted: 5 } as const
/** What one step of thickness melted off one part adds to the pot, over the room that part gives back. */
const MOLTEN_STEP = 0.05

/**
 * How high the wax stands over the rim at rest: by the candle that is in it, and by the wax that has melted off
 * the candle into it. It never falls while a candle melts, and it never climbs out of the pot: past what a dipped
 * candle raises it, each further bit of melted wax raises it by a little less.
 */
export function levelOf(displaced: number, molten: number): number {
  const raw = Math.min(LEVEL.dipped, displaced / DISPLACES) + molten
  return raw <= LEVEL.dipped ? raw : LEVEL.dipped + LEVEL.melted * (1 - Math.exp(-(raw - LEVEL.dipped) / LEVEL.melted))
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export class Dipping {
  readonly stick = { x: REST.x as number, y: REST.y as number, vx: 0, vy: 0 }
  /** The candle's swing under the stick, in radians, and how fast it turns. */
  swing = 0
  private spin = 0
  held = false
  private target = { x: REST.x as number, y: REST.y as number }
  private grabDy = 0
  private hung = true
  private standing = false
  /** Whether the tip went below the rim inside the pot's mouth: it then stays in the pot until it is lifted out. */
  inPot = false
  readonly wet = new Array<number>(PARTS).fill(0)
  readonly warm = new Array<number>(PARTS).fill(0)
  private readonly under = new Array<number>(PARTS).fill(0)
  private readonly melt = new Array<number>(PARTS).fill(0)
  /** Whether a part melted during this dip: it comes out hot and takes no coat. */
  private readonly melted = new Array<boolean>(PARTS).fill(false)
  private dipping = false
  private coated = 0
  private shed = 0
  /** Drops still to run off the tip, and the seconds until the next one. */
  private runoff = 0
  private nextDrop = 0
  private dropGap = 0.3
  private blobs = 0
  private nextBubble = 0
  private bareTold = true
  /** 0 to 1: how hard the pot bubbles. */
  bubbling = 0
  /** Whether a part is melting now: the pot then bubbles hard. Before that it only warns. */
  melting = false
  /** How far the wax has risen round what is in it, in stage units. */
  level = 0
  /** How far the wax that has melted off the candle in this dip has raised the pot: it goes into the pot, and sinks away once the candle is out. */
  private molten = 0
  readonly drops: Drop[] = []
  readonly rings: Ring[] = []
  readonly spots: WaxSpot[] = []
  readonly events: DipEvent[] = []

  constructor(public candle: Candle, private readonly rng: Rng, public colour: Colour = 0) {}

  /** The tip of the wick, hanging straight. The swing is a view and moves nothing the rules read. */
  get tipY(): number {
    return this.stick.y + LENGTH
  }

  /** Where the tip is drawn, swing and all: where a drop lets go. */
  tipShown(): { x: number; y: number } {
    return { x: this.stick.x + Math.sin(this.swing) * LENGTH, y: this.stick.y + Math.cos(this.swing) * LENGTH }
  }

  /** The radius of the candle at its fattest. The tip is never thinner than what is above it, so this is what must fit the pot's mouth. */
  private fattestUnderRim(): number {
    let r = 0
    for (let i = 0; i < PARTS; i++) r = Math.max(r, this.candle.r[i])
    return 2 + r
  }

  partY(part: number): number {
    return this.stick.y + FREE + (part + 0.5) * STEP
  }

  /** Whether a finger at this point takes the stick: on the stick itself, or anywhere along the wick and the candle. */
  reaches(x: number, y: number): boolean {
    const s = this.stick
    if (Math.abs(x - s.x) <= STICK.half + 22 && Math.abs(y - s.y) <= 46) return true
    const tip = this.tipShown()
    const t = clamp((y - s.y) / Math.max(1, tip.y - s.y), 0, 1.1)
    const lineX = s.x + (tip.x - s.x) * Math.min(1, t)
    return y >= s.y && y <= tip.y + 34 && Math.abs(x - lineX) <= 44 + FATTEST * 0.5
  }

  /** The finger lands on the stick or the candle. The stick's middle goes to the finger; how far down the finger took hold is kept. */
  grab(x: number, y: number): void {
    this.held = true
    this.hung = false
    this.grabDy = clamp(y - this.stick.y, 0, LENGTH)
    this.events.push({ type: 'knock' })
    // A knock sets the candle swinging, so the answer shows even when the finger does not move.
    this.spin += x >= this.stick.x ? -1.6 : 1.6
    this.moveTo(x, y)
  }

  moveTo(x: number, y: number): void {
    this.target.x = clamp(x, STICK.minX, STICK.maxX)
    this.target.y = clamp(y - this.grabDy, STICK.minY, STICK.maxY)
  }

  /** The finger let go, or the touch was taken away: either way the stick goes back to its hooks. */
  release(): void {
    this.held = false
    this.target.x = REST.x
    this.target.y = REST.y
  }

  /** The candle is taken out of the wax where it is, as when it is given from the pot: every part that was under comes out with its coat. */
  takeOut(): void {
    if (!this.inPot) return
    this.inPot = false
    this.dip(0)
  }

  /** A candle was taken off the stick or put on it: the new one hangs dry and cool. */
  swap(candle: Candle): void {
    this.candle = candle
    this.wet.fill(0)
    this.warm.fill(0)
    this.under.fill(0)
    this.melt.fill(0)
    this.melted.fill(false)
    this.runoff = 0
    this.blobs = 0
    this.dipping = false
  }

  /** Puts everything at rest as a load finds it: the stick on its hooks, the candle still, matte and cool. */
  settle(): void {
    this.release()
    this.stick.x = REST.x; this.stick.y = REST.y; this.stick.vx = 0; this.stick.vy = 0
    this.swing = 0; this.spin = 0
    this.hung = true
    this.inPot = false
    this.swap(this.candle)
    this.drops.length = 0; this.rings.length = 0; this.spots.length = 0
    this.level = 0; this.molten = 0; this.bubbling = 0; this.melting = false
  }

  step(dt: number): void {
    if (dt <= 0) return
    this.moveStick(dt)
    this.swingCandle(dt)
    this.dip(dt)
    this.runOff(dt)
    this.fall(dt)
  }

  private moveStick(dt: number): void {
    const s = this.stick
    // In the hand the stick is quick and firm; let go, it is carried back on a soft spring and overshoots a little.
    const k = this.held ? 520 : 70, c = this.held ? 40 : 11
    const beforeVx = s.vx
    // The candle is never a captive of the pot: a hand that goes off sideways from the wax lifts it over the rim.
    const mouth = POT.rx - this.fattestUnderRim() - 6
    const out = this.held && this.inPot && Math.abs(this.target.x - POT.x) > mouth
    const ty = out ? Math.min(this.target.y, POT.y - LENGTH - 6) : this.target.y
    s.vx += ((this.target.x - s.x) * k - s.vx * c) * dt
    s.vy += ((ty - s.y) * k - s.vy * c) * dt
    let x = s.x + s.vx * dt, y = s.y + s.vy * dt
    // Nothing passes through anything: the tip goes below the rim only inside the pot's mouth, stays inside it
    // until it is lifted out, and elsewhere comes to stand on the counter.
    const wasBelow = this.tipY > POT.y
    const girthHere = this.fattestUnderRim()
    const inside = POT.rx - girthHere - 6
    if (y + LENGTH > POT.y) {
      if (!wasBelow) this.inPot = Math.abs(x - POT.x) <= inside
      if (this.inPot) {
        const cx = clamp(x, POT.x - inside, POT.x + inside)
        if (cx !== x) { x = cx; s.vx = 0 }
      } else {
        const outside = POT.rx + girthHere + 8
        if (Math.abs(x - POT.x) < outside) {
          // Coming down over the rim, or sideways into the pot's wall: stopped by whichever it met.
          if (!wasBelow) { y = POT.y - LENGTH; if (s.vy > 0) s.vy = 0 }
          else { x = POT.x + (s.x >= POT.x ? outside : -outside); s.vx = 0 }
        }
        const floor = COUNTER.top - LENGTH
        if (y > floor) {
          y = floor
          if (s.vy > 0) s.vy = 0
          if (!this.standing) this.events.push({ type: 'stand' })
          this.standing = true
        } else if (y < floor - 3) this.standing = false
      }
    } else {
      this.inPot = false
      this.standing = false
    }
    s.x = x; s.y = y
    // The pendulum is driven by how the stick's sideways speed changed.
    this.spin -= ((s.vx - beforeVx) / LENGTH) * 0.9
    if (!this.held && !this.hung && Math.hypot(s.x - REST.x, s.y - REST.y) < 3 && Math.hypot(s.vx, s.vy) < 30) {
      this.hung = true
      this.events.push({ type: 'hang' })
    }
  }

  private swingCandle(dt: number): void {
    let underCount = 0
    for (let i = 0; i < PARTS; i++) if (this.under[i] > 0) underCount += 1
    // Heavier candles swing more slowly; wax stills the swing.
    const weight = 1 + girth(this.candle) / FATTEST
    const damping = 1.1 + underCount * 1.6
    this.spin += (-(26 / weight) * Math.sin(this.swing) - damping * this.spin) * dt
    this.swing = clamp(this.swing + this.spin * dt, -0.8, 0.8)
    // Inside the pot the candle cannot lean further than the mouth allows.
    if (this.inPot) {
      const room = (POT.rx - this.fattestUnderRim() - 4 - Math.abs(this.stick.x - POT.x)) / LENGTH
      this.swing = clamp(this.swing, -Math.max(0, room), Math.max(0, room))
    }
  }

  private dip(dt: number): void {
    const surface = POT.y - this.level
    let anyUnder = false, melting = false, warned = false, displaced = 0
    for (let i = PARTS - 1; i >= 0; i--) {
      const under = this.inPot && this.partY(i) > surface
      if (under) {
        anyUnder = true
        if (!this.dipping) {
          this.dipping = true
          this.coated = 0
          this.shed = 0
          this.events.push({ type: 'gloop', fat: girth(this.candle) / FATTEST })
          this.ring(this.stick.x, 1)
        }
        this.under[i] += dt
        displaced += (2 + this.candle.r[i]) ** 2
        if (this.under[i] > WARN_AFTER && this.candle.r[i] > 0) warned = true
        if (this.under[i] > MELT_AFTER) {
          this.melt[i] += dt * MELT_RATE
          while (this.melt[i] >= 1) {
            this.melt[i] -= 1
            const was = this.candle.r[i]
            if (!meltPart(this.candle, i)) continue
            melting = true
            this.melted[i] = true
            // What melts off the candle is in the pot: it makes up for the room the thinner part gives back, and more.
            this.molten += ((2 + was) ** 2 - (1 + was) ** 2) / DISPLACES + MOLTEN_STEP
          }
          if (this.candle.r[i] > 0) melting = true
        }
      } else if (this.under[i] > 0) {
        // The part comes out of the wax.
        if (!this.melted[i]) {
          const added = coatPart(this.candle, i, this.colour, this.warm[i])
          if (added > 0) this.coated += 1
          else this.shed += 1
          this.wet[i] = 1
        }
        this.warm[i] = 1
        this.under[i] = 0
        this.melt[i] = 0
        this.melted[i] = false
      } else {
        this.wet[i] = Math.max(0, this.wet[i] - dt / WET_SECONDS)
        this.warm[i] = Math.max(0, this.warm[i] - dt / WARM_SECONDS)
      }
    }
    if (this.dipping && !anyUnder) {
      this.dipping = false
      this.events.push({ type: 'lift', fat: girth(this.candle) / FATTEST, coated: this.coated })
      this.ring(this.stick.x, 0.7)
      if (this.coated > 0) {
        this.runoff = 2 + (this.coated > 6 ? 1 : 0) + (this.rng.next() < 0.5 ? 1 : 0)
        this.nextDrop = 0.28
        this.dropGap = 0.3
      }
      if (this.shed > 0) { this.blobs = 3; this.nextDrop = Math.min(this.nextDrop || 0.15, 0.15) }
    }
    // The pot bubbles at the candle before anything melts, slowly and a bubble or two at a time, and hard while
    // something melts in it: each bubble on the game's clock.
    this.bubbling += ((melting ? 1 : warned ? 0.5 : 0) - this.bubbling) * Math.min(1, dt * 5)
    // Melting begins with a bubble of its own, however lately the warning sounded.
    if (melting && !this.melting) this.nextBubble = 0
    this.melting = melting
    if (melting || warned) {
      this.nextBubble -= dt
      if (this.nextBubble <= 0) {
        const how = melting ? BUBBLES.melt : BUBBLES.warn
        this.nextBubble = how.gap + this.rng.next() * (melting ? 0.12 : 0.3)
        this.events.push({ type: 'bubble', variant: Math.floor(this.rng.next() * 3) })
        this.ring(this.stick.x + (this.rng.next() - 0.5) * (melting ? 90 : 40), 0.5)
      }
    } else this.nextBubble = 0
    // Melted right down: said once, when the last of the wax has gone.
    const bare = isBare(this.candle)
    if (bare && !this.bareTold && this.melted.some(Boolean)) this.events.push({ type: 'bare' })
    this.bareTold = bare
    // The wax stands higher by what is in it and by what has melted into it. Out of the wax, the melted wax sinks away.
    if (!anyUnder) this.molten *= Math.exp(-dt * 1.5)
    this.level += (levelOf(displaced, this.molten) - this.level) * Math.min(1, dt * 6)
  }

  private runOff(dt: number): void {
    if (this.runoff <= 0 && this.blobs <= 0) return
    if (this.dipping) return
    this.nextDrop -= dt
    if (this.nextDrop > 0) return
    const tip = this.tipShown()
    const colour = this.candle.c[PARTS - 1]
    if (this.blobs > 0) {
      this.blobs -= 1
      this.nextDrop = 0.16
      this.spawn({ x: tip.x, y: tip.y, vy: 0, size: 9, colour })
      return
    }
    this.runoff -= 1
    this.dropGap *= 1.5
    this.nextDrop = this.dropGap
    this.spawn({ x: tip.x, y: tip.y, vy: 0, size: 3.5 + this.rng.next() * 2, colour })
  }

  private spawn(drop: Drop): void {
    if (this.drops.length < MAX_DROPS) this.drops.push(drop)
  }

  private ring(x: number, size: number): void {
    if (this.rings.length >= MAX_RINGS) this.rings.shift()
    this.rings.push({ x: clamp(x, POT.x - POT.rx + 30, POT.x + POT.rx - 30), age: 0, size })
  }

  private fall(dt: number): void {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]
      d.vy += GRAVITY * dt
      d.y += d.vy * dt
      const overPot = Math.abs(d.x - POT.x) < POT.rx - 8
      const lands = overPot ? POT.y - this.level : COUNTER.top
      if (d.y < lands) continue
      this.drops.splice(i, 1)
      if (overPot) {
        this.ring(d.x, d.size > 7 ? 1 : 0.45)
        this.events.push(d.size > 7 ? { type: 'blob' } : { type: 'plip', size: d.size, variant: Math.floor(this.rng.next() * 3) })
      } else {
        if (this.spots.length >= MAX_SPOTS) this.spots.shift()
        this.spots.push({ x: d.x, y: COUNTER.top + (this.rng.next() - 0.5) * 20, age: 0, size: d.size, colour: d.colour })
        this.events.push({ type: 'tick' })
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) if ((this.rings[i].age += dt) > RING_SECONDS) this.rings.splice(i, 1)
    for (let i = this.spots.length - 1; i >= 0; i--) if ((this.spots[i].age += dt) > SPOT_SECONDS) this.spots.splice(i, 1)
  }
}
