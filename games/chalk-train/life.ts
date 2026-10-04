import { below, between, type Rng } from './rng'

// The engine as a character: steady, heavy, and funniest in its funnel and
// cheeks. This module turns what happens to it into how it holds itself, as
// plain numbers on game time: where its eyes look, how it squashes, tilts,
// hops and spins, and what its funnel cap is doing. The view maps them onto
// the chalk figure. Nothing here is shared with any other character.

/** How the engine holds itself this frame. */
export type Bearing = {
  /** Where the eyes look, each -1 to 1 in the engine's own frame (x ahead, y down). */
  eyeX: number
  eyeY: number
  /** 0 to 1: eyes crossed, eyes spinning, lids shut, mouth open. */
  cross: number
  dizzy: number
  blink: number
  toot: number
  /** Above 0 it is squashed low and wide, below 0 stretched tall. */
  squash: number
  /** Extra tilt in radians, nose down when positive. */
  lean: number
  /** A hop off the rail, in tar units. */
  hop: number
  /** A whole turn on the spot, in radians, and a sideways shiver in tar units. */
  spin: number
  shake: number
  /** The front wheels lifting, in radians, and extra turning of the wheels. */
  rear: number
  wheelspin: number
  /** The funnel cap: how far it has come off, and how much it has turned. */
  capOff: number
  capTurn: number
  /** 0 to 1: white with chalk dust. */
  dusted: number
  /** The cheeks wobbling, -1 to 1. */
  cheek: number
}

/** Something the engine does that the toy answers with bits or a sound. */
export type Does = 'breath' | 'chuff' | 'smoke-ring' | 'burp' | 'dust-off'

/** What can happen to the engine. Each sets off its own short piece of acting. */
export type Happens =
  | 'land' | 'poke' | 'leap' | 'tickle' | 'lasso' | 'dusting' | 'corner' | 'over' | 'tangle' | 'bump'
  | 'sneeze' | 'brake' | 'peer' | 'hoot' | 'giddy' | 'splash' | 'twang' | 'flip'

/** How long each piece of acting lasts, in seconds. */
export const LASTS: Record<Happens, number> = {
  land: 0.35, poke: 0.9, leap: 0.45, tickle: 0.95, lasso: 0.9, dusting: 1.3, corner: 0.22, over: 1.0, tangle: 0.8, bump: 0.25,
  sneeze: 0.7, brake: 0.3, peer: 1.4, hoot: 0.4, giddy: 2.2, splash: 0.5, twang: 0.3, flip: 0.6,
}

/** What the engine does when left alone. It never does the same thing twice running. */
export const IDLES = ['look-about', 'yawn', 'shuffle', 'cap-pop', 'hiccup', 'doze'] as const
export type Idle = (typeof IDLES)[number]
const IDLE_LASTS: Record<Idle, number> = { 'look-about': 1.8, yawn: 1.3, shuffle: 1.0, 'cap-pop': 0.7, hiccup: 0.4, doze: 2.4 }

/** A spring that overshoots and settles: weight and follow-through. */
class Spring {
  value = 0
  private speed = 0
  constructor(private stiff: number, private damp: number) {}
  kick(by: number): void { this.speed += by }
  step(dt: number): void {
    this.speed += (-this.stiff * this.value - this.damp * this.speed) * dt
    this.value += this.speed * dt
  }
}

const bell = (t: number): number => Math.sin(Math.min(1, Math.max(0, t)) * Math.PI)

export class EngineLife {
  private acts = new Map<Happens, number>()
  private squash = new Spring(260, 14)
  private hop = new Spring(420, 18)
  private clock = 0
  private blinkIn: number
  private blinkFor = 0
  private idle: Idle | null = null
  private idleFor = 0
  private idleIn: number
  private lastIdles: Idle[] = []
  private breathIn = 0.6
  private chuffed = 0
  private eyeTo = { x: 0.35, y: 0 }
  private eye = { x: 0.35, y: 0 }
  private dust = 0
  private sends: Does[] = []
  /** Which way the nearest chalk lies, in its own frame: 1 ahead, -1 behind, 0 for none. Set by the toy. */
  leanTo = 0
  private leaning = 0
  private rng: Rng

  constructor(rng: Rng) {
    this.rng = rng
    this.blinkIn = between(rng, 1.5, 3.5)
    this.idleIn = between(rng, 2.5, 4)
  }

  /** The idle piece it is in the middle of, if any. */
  get idling(): Idle | null { return this.idle }

  /** Something happens to the engine. `toward` is where to look, in its own frame. */
  happen(what: Happens, toward?: { x: number; y: number }): void {
    this.acts.set(what, LASTS[what])
    this.idle = null
    this.idleIn = between(this.rng, 3, 5)
    if (toward) this.eyeTo = toward
    // What leaves the engine at the start of a piece leaves it once, however long the frames are.
    if (what === 'poke') this.sends.push('smoke-ring')
    if (what === 'sneeze') this.sends.push('dust-off')
    if (what === 'land') this.squash.kick(-1.4)
    if (what === 'poke') this.squash.kick(3.2)
    if (what === 'corner') this.squash.kick(2.2)
    if (what === 'bump') this.hop.kick(420)
    if (what === 'brake') this.squash.kick(6.5)
    if (what === 'sneeze') { this.squash.kick(-5); this.hop.kick(620) }
    if (what === 'splash') this.hop.kick(360)
    if (what === 'dusting' || what === 'tangle') this.dust = 1
    if (what === 'sneeze' || what === 'splash') this.dust = 0
  }

  private part(what: Happens): number {
    const left = this.acts.get(what)
    return left === undefined ? -1 : 1 - left / LASTS[what]
  }

  /**
   * Plays `dt` seconds. `speed` is its pace and `travelled` how far it has
   * gone in all; `rough` is true on bare tar. `watch` is where the finger is,
   * in the engine's own frame, while a line is being drawn.
   */
  step(dt: number, speed: number, travelled: number, rough: boolean, watch: { x: number; y: number } | null): Does[] {
    const does: Does[] = []
    this.clock += dt
    for (const [what, left] of this.acts) {
      if (left - dt <= 0) this.acts.delete(what)
      else this.acts.set(what, left - dt)
    }
    this.squash.step(dt)
    this.hop.step(dt)
    this.dust = Math.max(0, this.dust - dt / 2.6)
    const moving = speed > 1
    // At rest it leans toward the nearest chalk, or toward the chalk coming out under the finger; riding, it stands as it rides.
    this.leaning += ((moving ? 0 : this.leanTo) - this.leaning) * Math.min(1, dt * 5)

    // Blinking never stops.
    this.blinkIn -= dt
    if (this.blinkIn <= 0) { this.blinkFor = 0.13; this.blinkIn = between(this.rng, 1.8, 4.2) }
    this.blinkFor = Math.max(0, this.blinkFor - dt)

    // Left alone and at rest, it finds something of its own to do.
    const busy = moving || this.acts.size > 0 || watch !== null
    if (busy) { this.idle = null; this.idleIn = Math.max(this.idleIn, 2.5) }
    else if (this.idle) {
      this.idleFor -= dt
      if (this.idleFor <= 0) this.idle = null
    } else if ((this.idleIn -= dt) <= 0) {
      const fresh = IDLES.filter((i) => !this.lastIdles.includes(i))
      this.idle = fresh[below(this.rng, fresh.length)]
      this.idleFor = IDLE_LASTS[this.idle]
      this.lastIdles = [this.idle, ...this.lastIdles].slice(0, 2)
      this.idleIn = between(this.rng, 2.6, 5)
      if (this.idle === 'yawn') does.push('smoke-ring')
      if (this.idle === 'cap-pop') does.push('burp')
      if (this.idle === 'hiccup') this.hop.kick(460)
    }

    // Smoke: a breath at rest, a chuff for every stretch of rail.
    if (moving) {
      const every = rough ? 46 : 64
      if (travelled - this.chuffed >= every) { this.chuffed = travelled; does.push('chuff') }
    } else {
      this.chuffed = travelled
      this.breathIn -= dt * (this.idle === 'doze' ? 0.45 : 1)
      if (this.breathIn <= 0) { this.breathIn = 1.5; does.push('breath') }
    }
    // A piece of acting that begins with something leaving the engine sends it out once, on its first step.
    for (const out of this.sends) does.push(out)
    this.sends.length = 0

    // The eyes go to what matters most: the finger, then the way ahead, then its own business.
    if (watch) this.eyeTo = watch
    else if (moving) this.eyeTo = { x: 0.8, y: 0.05 }
    else if (this.idle === 'look-about') this.eyeTo = { x: Math.sin(((IDLE_LASTS['look-about'] - this.idleFor) / IDLE_LASTS['look-about']) * Math.PI * 2) * 0.9, y: -0.15 }
    else if (this.idle === 'doze') this.eyeTo = { x: 0.1, y: 0.7 }
    else if (this.acts.size === 0) this.eyeTo = { x: 0.35, y: 0 }
    const snap = Math.min(1, dt * (this.acts.has('land') ? 30 : 9))
    this.eye.x += (this.eyeTo.x - this.eye.x) * snap
    this.eye.y += (this.eyeTo.y - this.eye.y) * snap
    return does
  }

  get bearing(): Bearing {
    const p = (what: Happens) => this.part(what)
    const on = (what: Happens) => (p(what) < 0 ? 0 : bell(p(what)))
    const idleT = this.idle ? 1 - this.idleFor / IDLE_LASTS[this.idle] : 0
    const over = p('over')
    return {
      eyeX: Math.max(-1, Math.min(1, this.eye.x)),
      eyeY: Math.max(-1, Math.min(1, this.eye.y)),
      cross: Math.max(on('poke'), on('twang') * 0.6),
      dizzy: Math.max(p('lasso') >= 0 ? 1 : 0, p('giddy') >= 0 ? 1 - Math.max(0, p('giddy') - 0.7) / 0.3 : 0),
      blink: Math.max(this.blinkFor > 0 ? 1 : 0, this.idle === 'doze' ? bell(idleT) : 0, p('sneeze') >= 0 && p('sneeze') < 0.3 ? 1 : 0, p('splash') >= 0 && p('splash') < 0.5 ? 1 : 0),
      toot: Math.max(on('land'), on('hoot'), on('corner') * 0.7, on('leap'), this.idle === 'yawn' ? bell(idleT) : 0, this.idle === 'hiccup' ? bell(idleT) : 0, on('sneeze')),
      // A brake squashes it by about a twentieth, a poke by half that: enough to see on a figure this size.
      squash: this.squash.value * 0.3 + (this.idle === 'shuffle' ? Math.sin(idleT * Math.PI * 4) * 0.04 : 0) + Math.sin(this.clock * 2.1) * 0.012,
      lean: this.leaning * 0.07 + on('peer') * 0.2 + (p('tickle') >= 0 ? Math.sin(p('tickle') * Math.PI * 9) * 0.12 * (1 - p('tickle')) : 0) + on('brake') * 0.1 - on('leap') * 0.05 + (p('giddy') >= 0 ? Math.sin(p('giddy') * Math.PI * 6) * 0.08 * (1 - p('giddy')) : 0),
      hop: Math.max(0, this.hop.value),
      // Lassoed it spins once; it goes right over once where a loop it has just ridden closes behind it; and in a
      // scribble it spins right about, once.
      spin: (p('lasso') >= 0 ? p('lasso') * Math.PI * 2 : 0) + (p('flip') >= 0 ? p('flip') * Math.PI * 2 : 0) + (p('tangle') >= 0 ? p('tangle') * Math.PI * 2 : 0),
      shake: p('dusting') >= 0 && p('dusting') > 0.25 && p('dusting') < 0.8 ? Math.sin(this.clock * 70) * 6 : 0,
      rear: on('leap') * 0.22,
      wheelspin: (p('leap') >= 0 ? p('leap') * 14 : 0) + (this.idle === 'shuffle' ? Math.sin(idleT * Math.PI * 4) * 0.9 : 0),
      capOff: Math.max(over >= 0 ? bell(over) * 46 : 0, this.idle === 'cap-pop' ? bell(idleT) * 16 : 0, on('sneeze') * 22),
      capTurn: over >= 0 ? over * Math.PI * 2 : this.idle === 'cap-pop' ? bell(idleT) * 0.5 : 0,
      dusted: this.dust,
      cheek: this.acts.has('bump') ? Math.sin(this.clock * 40) * (1 - p('bump')) : 0,
    }
  }
}
