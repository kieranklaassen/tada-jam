import { playAct, rest, type Mods } from './acts'
import type { CreatureKind, HatKind } from './kinds'
import { PERSONALITY, hash, stepSpring, type Spring } from './motion'
import { BODY, HAND, HAT_HEIGHT, SLAB } from './sizes'
import { LOOSE_Z, TILE_Z, alongWay, holeX, spotX, wayLength, type Point } from './stage'
import type { Partial } from './voices'

// The puppet theatre: where every creature and hat is this frame, as plain
// numbers, and which voices to sound. No renderer and no DOM, and no rule:
// the game tells it what happened (a hat goes there, a creature walks this
// way, does that act) and it plays it with weight. The view draws its
// numbers and nothing else. What it shows can run behind the rules for a
// moment (a hat still in the air, a creature still walking in); `settle`
// brings everything to where it was going, at once.

export type HatPose = {
  x: number; y: number; z: number
  /** 0 lying flat in its hole, 1 standing upright. */
  up: number
  /** Turned over in the air, leaning to a side, and spun about its own upright, in radians. */
  flip: number; tilt: number; turn: number
  /** 1 at rest; under 1 pressed flat, over 1 stretched. */
  squash: number
}

export type ActorPose = {
  x: number; y: number; z: number
  squash: number; lean: number; turn: number
  /** Where its pupils look, each from -1 to 1, and how crossed its eyes are. */
  gazeX: number; gazeY: number; cross: number
  /** 0 hands at its sides, 1 both on top of its head. */
  pat: number
  /** 0 shut, 1 wide: open while it babbles. */
  mouth: number
  /** 1 eyes open, 0 shut in a blink. */
  eyes: number
  /** Flop's ears, from -1 drooped to 1 flung out. */
  ears: number
}

/** Where a hat is seen to be: in its hole, loose beside a round spot, on a creature's head, or in the child's hand. */
export type Seen = { at: 'tile' } | { at: 'loose'; spot: number } | { at: 'head'; who: string; level: number } | { at: 'hand' }

/** How a hat travels: turned over in a high arc, in low hops, skidding and spinning like a coin, or carried level. */
export type Travel = 'pop' | 'hop' | 'skid' | 'carry'

/** A voice to sound, `delay` seconds from now, by its name in voices.ts. */
export type Cue = { name: string; voice: Partial[]; delay: number }

type Flight = { fromX: number; fromY: number; fromZ: number; fromUp: number; t: number; lasts: number; arc: number; travel: Travel; land: (() => void) | null }
type Hat = { kind: HatKind; seen: Seen; pose: HatPose; press: Spring; pressed: boolean; flight: Flight | null; hand: { x: number; y: number; z: number } }
type Walk = { way: Point[]; gone: number; speed: number; wait: number; then: (() => void) | null }
type Actor = {
  kind: CreatureKind; x: number; z: number; heading: number
  squash: Spring; lean: Spring; hop: Spring; pressed: boolean
  /** Pulled by a finger: how far and which way, from -1 to 1 each. */
  pullX: number; pullY: number
  gazeX: number; gazeY: number; lookX: number; lookY: number; lookFor: number
  pat: number; mouth: number; phase: number
  walk: Walk | null
  act: { name: string; t: number } | null
  /** How many hats are seen on its head, and whether it cannot stand the one it wears. */
  hats: number; grumpy: boolean
  /** How far a tower has slipped over its eyes, from 0 to 1: it eases there, forward of the face first and then down. */
  slip: number
  mods: Mods
}

const ease = (t: number): number => t * t * (3 - 2 * t)
/** A loose hat's circle beside its round spot: how wide, and how fast it goes round, in radians a second. */
export const LOOSE_CIRCLE = 0.3
export const LOOSE_TURN = 1.1
/** How far in front of a face a hat stands when it comes down over it. */
export const HAT_FWD = HAND.front + SLAB / 2 + 0.04
const blank = (): Mods => rest({} as Mods)

export class Play {
  /** Seconds of attended game time. */
  time = 0
  readonly cues: Cue[] = []
  /** Where the tile's middle lies from front to back: it slides in from the child's side and away again. */
  tileZ = TILE_Z
  readonly arch: Spring = { x: 1, v: 0 }
  archPressed = false
  /** Places the foam floor was pressed, each spreading and fading. */
  readonly dimples: { x: number; z: number; age: number }[] = []
  private hats: Hat[] = []
  /** The creatures on the mat, each by a name of its own: a kind can be on the mat twice for a moment, once walking off with the old crew and once walking in with the new. */
  private readonly actors = new Map<string, Actor>()
  private tileSlide: { from: number; to: number; t: number; lasts: number } | null = null
  private timers: { left: number; run: () => void }[] = []

  // --- What the game tells it ---------------------------------------------

  /** A new tile of hats, every one in its hole. */
  layTile(kinds: readonly HatKind[]): void {
    this.hats = kinds.map((kind) => ({ kind, seen: { at: 'tile' }, pose: { x: 0, y: 0, z: 0, up: 0, flip: 0, tilt: 0, turn: 0, squash: 1 }, press: { x: 1, v: 0 }, pressed: false, flight: null, hand: { x: 0, y: 0, z: 0 } }))
    this.hats.forEach((_, hat) => this.restHat(hat, this.hats[hat].pose))
  }

  get hatCount(): number { return this.hats.length }
  hatKind(hat: number): HatKind { return this.hats[hat].kind }
  seen(hat: number): Seen { return this.hats[hat].seen }
  get cast(): string[] { return [...this.actors.keys()] }
  has(who: string): boolean { return this.actors.has(who) }
  kindOf(who: string): CreatureKind { return this.actors.get(who)!.kind }

  /** Gives a creature another name, and the hats on its head with it. */
  rename(who: string, to: string): void {
    const actor = this.actors.get(who)
    if (!actor) return
    this.actors.delete(who)
    this.actors.set(to, actor)
    for (const hat of this.hats) if (hat.seen.at === 'head' && hat.seen.who === who) hat.seen = { ...hat.seen, who: to }
  }

  /** Puts a creature on the mat at a point, standing still. */
  enter(who: string, kind: CreatureKind, at: Point): void {
    const n = this.actors.size + 1
    this.actors.set(who, { kind, x: at.x, z: at.z, heading: 0, squash: { x: 1, v: 0 }, lean: { x: 0, v: 0 }, hop: { x: 0, v: 0 }, pressed: false, pullX: 0, pullY: 0, gazeX: 0, gazeY: 0, lookX: 0, lookY: 0, lookFor: 0, pat: 0, mouth: 0, phase: hash(n + kind.length * 7) * 6.28, walk: null, act: null, hats: 0, grumpy: false, slip: 0, mods: blank() })
  }

  leave(who: string): void { this.actors.delete(who) }

  /** Sends a creature along a way; `then` runs when it arrives. */
  walk(who: string, way: Point[], speed: number, wait = 0, then: (() => void) | null = null): void {
    const actor = this.actors.get(who)
    if (actor) actor.walk = { way, gone: 0, speed, wait, then }
  }

  act(who: string, name: string): void {
    const actor = this.actors.get(who)
    if (actor) actor.act = { name, t: 0 }
  }

  /** Whether a creature cannot stand the one hat it wears: it wears it askew. The game says so from the tastes. */
  sulks(who: string, grumpy: boolean): void {
    const actor = this.actors.get(who)
    if (actor) actor.grumpy = grumpy
  }

  /** Runs something a little later, on the theatre's own time: the next beat of a chain. */
  after(seconds: number, run: () => void): void {
    this.timers.push({ left: seconds, run })
  }

  /** How many hats are seen on a creature's head this instant. */
  worn(who: string): number {
    let worn = 0
    for (const hat of this.hats) if (hat.seen.at === 'head' && hat.seen.who === who) worn++
    return worn
  }

  look(who: string, x: number, z: number, seconds: number, up = 0): void {
    const actor = this.actors.get(who)
    if (!actor) return
    actor.lookX = Math.max(-1, Math.min(1, (x - actor.x) / 4))
    actor.lookY = up || Math.max(-1, Math.min(1, -(z - actor.z) / 4))
    actor.lookFor = seconds
  }

  everyoneLooks(x: number, z: number, seconds: number, but?: string): void {
    for (const who of this.actors.keys()) if (who !== but) this.look(who, x, z, seconds)
  }

  /** A creature's mouth opens for as long as its babble sounds. */
  speaks(who: string, seconds: number): void {
    const actor = this.actors.get(who)
    if (actor) actor.mouth = seconds
  }

  bounce(who: string, squashTo: number, hop = 0): void {
    const actor = this.actors.get(who)
    if (!actor) return
    actor.squash.x = Math.min(actor.squash.x, squashTo)
    actor.hop.v += hop
  }

  /** A hat sets off for a new place, from wherever it is this instant; `land` runs when it comes down. */
  moveHat(hat: number, to: Seen, travel: Travel, land: (() => void) | null = null): void {
    const h = this.hats[hat], pose = h.pose
    h.seen = to
    const target = this.restHat(hat, { ...pose }), far = Math.hypot(target.x - pose.x, target.z - pose.z)
    h.flight = { fromX: pose.x, fromY: pose.y, fromZ: pose.z, fromUp: pose.up, t: 0, lasts: travel === 'carry' ? 0.22 : 0.38 + 0.022 * far, arc: travel === 'pop' ? 2.1 + 0.16 * far : travel === 'hop' ? 0.9 : travel === 'skid' ? 0.25 : 0.4, travel, land }
    h.press.v += 9
  }

  /** The child holds a hat: it follows the finger. */
  holdHat(hat: number, x: number, y: number, z: number): void {
    const h = this.hats[hat]
    h.seen = { at: 'hand' }
    h.flight = null
    h.hand.x = x; h.hand.y = y; h.hand.z = z
  }

  pressHat(hat: number, down: boolean): void {
    const h = this.hats[hat]
    if (!h) return
    h.pressed = down
    if (down) h.press.x = Math.min(h.press.x, 0.72)
  }

  pressActor(who: string, down: boolean): void {
    const actor = this.actors.get(who)
    if (!actor) return
    actor.pressed = down
    if (down) actor.squash.x = Math.min(actor.squash.x, 0.9)
    else { actor.pullX = 0; actor.pullY = 0 }
  }

  /** A finger pulls a creature: it stretches after the finger and stays on its spot. */
  pull(who: string, x: number, y: number): void {
    const actor = this.actors.get(who)
    if (actor) { actor.pullX = Math.max(-1, Math.min(1, x)); actor.pullY = Math.max(-1, Math.min(1, y)) }
  }

  /** The floor is pressed: a dimple spreads and whatever stands near hops. */
  dimple(x: number, z: number): void {
    this.dimples.push({ x, z, age: 0 })
    for (const actor of this.actors.values()) {
      const near = 1 - Math.hypot(actor.x - x, actor.z - z) / 4.5
      if (near > 0 && !actor.walk) actor.hop.v += 7 * near * PERSONALITY[actor.kind].hop
    }
  }

  slideTile(from: number, to: number, seconds: number): void {
    this.tileSlide = { from, to, t: 0, lasts: seconds }
    this.tileZ = from
  }

  cue(name: string, voice: Partial[], delay = 0): void {
    this.cues.push({ name, voice, delay })
  }

  /** Everything is at once where it was going: flights land, walkers arrive, acts end. Their `then` and `land` run. */
  settle(): void {
    for (let guard = 0; guard < 12; guard++) {
      let busy = this.timers.length > 0
      for (const timer of this.timers.splice(0)) timer.run()
      for (const [who, actor] of [...this.actors]) {
        actor.act = null
        actor.slip = this.worn(who) > 1 ? 1 : 0
        const walk = actor.walk
        if (!walk) continue
        busy = true
        actor.walk = null
        const end = walk.way[walk.way.length - 1]
        actor.x = end.x; actor.z = end.z; actor.heading = 0
        walk.then?.()
      }
      for (const hat of this.hats) {
        const flight = hat.flight
        if (!flight) continue
        busy = true
        hat.flight = null
        flight.land?.()
      }
      if (!busy) break
    }
    if (this.tileSlide) { this.tileZ = this.tileSlide.to; this.tileSlide = null }
    this.hats.forEach((hat, i) => { hat.pressed = false; hat.press.x = 1; hat.press.v = 0; this.restHat(i, hat.pose) })
  }

  get busy(): boolean {
    return this.tileSlide !== null || this.timers.length > 0 || this.hats.some((hat) => hat.flight !== null) || [...this.actors.values()].some((actor) => actor.walk !== null)
  }

  // --- Time ---------------------------------------------------------------

  step(dt: number): void {
    this.time += dt
    for (let i = this.dimples.length - 1; i >= 0; i--) if ((this.dimples[i].age += dt) > DIMPLE_SECONDS) this.dimples.splice(i, 1)
    stepSpring(this.arch, this.archPressed ? 0.94 : 1, 120, 7, dt)
    if (this.tileSlide) {
      const slide = this.tileSlide
      slide.t += dt
      this.tileZ = slide.from + (slide.to - slide.from) * ease(Math.min(1, slide.t / slide.lasts))
      if (slide.t >= slide.lasts) this.tileSlide = null
    }
    for (const timer of this.timers.splice(0)) {
      timer.left -= dt
      if (timer.left <= 0) timer.run()
      else this.timers.push(timer)
    }
    for (const [who, actor] of [...this.actors]) {
      actor.hats = this.worn(who)
      this.stepActor(actor, dt)
    }
    this.hats.forEach((h, hat) => {
      stepSpring(h.press, h.pressed ? 0.6 : 1, 300, 13, dt)
      const flight = h.flight, pose = h.pose
      this.restHat(hat, pose)
      if (!flight) return
      flight.t += dt
      const u = Math.min(1, flight.t / flight.lasts), e = ease(u)
      const bounce = flight.travel === 'hop' ? Math.abs(Math.sin(u * Math.PI * 2)) : Math.sin(u * Math.PI)
      pose.x = flight.fromX + (pose.x - flight.fromX) * e
      pose.z = flight.fromZ + (pose.z - flight.fromZ) * e
      pose.y = flight.fromY + (pose.y - flight.fromY) * e + bounce * flight.arc
      pose.up = flight.fromUp + (pose.up - flight.fromUp) * e
      pose.flip = flight.travel === 'pop' ? e * Math.PI * 2 : 0
      pose.turn = flight.travel === 'skid' ? e * Math.PI * 4 : 0
      if (u < 1) return
      pose.flip = 0; pose.turn = 0
      h.flight = null
      h.press.x = 0.7
      flight.land?.()
    })
  }

  private stepActor(actor: Actor, dt: number): void {
    const p = PERSONALITY[actor.kind], beat = this.time * p.tempo * 6.28 + actor.phase
    const walk = actor.walk
    if (walk) {
      if (walk.wait > 0) walk.wait -= dt
      else walk.gone += walk.speed * dt
      alongWay(walk.way, walk.gone, actor)
      if (walk.gone >= wayLength(walk.way)) { actor.walk = null; actor.heading = 0; walk.then?.() }
    }
    const walking = actor.walk !== null && actor.walk.wait <= 0
    // Each creature walks like itself: its own spring answers each step, at its own tempo.
    const stride = walking ? Math.abs(Math.sin(this.time * (5 + p.tempo * 3) + actor.phase)) : 0
    const stretch = Math.hypot(actor.pullX, actor.pullY)
    stepSpring(actor.squash, actor.pressed && stretch === 0 ? 0.86 : 1 + 0.022 * Math.sin(beat) + 0.14 * stretch * Math.abs(actor.pullY) - 0.1 * stride * p.bounce * 2, p.stiffness, p.damping, dt)
    stepSpring(actor.lean, -0.45 * actor.pullX + (walking ? -0.1 * actor.heading : p.sway * Math.sin(beat * 0.5)), p.stiffness * 0.5, p.damping, dt)
    stepSpring(actor.hop, walking ? 0.3 * stride * p.hop : 0, walking ? 400 : 90, walking ? 40 : 9, dt)
    if (actor.hop.x < 0) { actor.hop.x = 0; actor.hop.v = Math.abs(actor.hop.v) * 0.35; actor.squash.v -= 1.5 }
    actor.pat = Math.max(0, actor.pat - dt)
    actor.slip = Math.max(0, Math.min(1, actor.slip + (actor.hats > 1 ? 1 : -1) * dt * 4))
    actor.mouth = Math.max(0, actor.mouth - dt)
    actor.lookFor = Math.max(0, actor.lookFor - dt)
    const bare = actor.hats === 0
    // Its one want, shown while nothing else happens: a bare creature pats its bare head now and then, at a moment of its own.
    if (bare && !walking && actor.lookFor === 0 && (this.time * 0.22 + actor.phase) % 1 < 0.12) actor.pat = Math.max(actor.pat, 0.25)
    const mods = rest(actor.mods)
    if (actor.act) {
      actor.act.t += dt
      if (!playAct(actor.act.name, actor.act.t, mods, BODY[actor.kind].top)) actor.act = null
    }
    // With nothing to look at, a bare creature looks at the hats, a hatted one up at its own, and a walker where it is going.
    let wantX = actor.lookFor > 0 ? actor.lookX : walking ? 0.8 * actor.heading : 0.25 * Math.sin(beat * 0.21)
    let wantY = actor.lookFor > 0 ? actor.lookY : walking ? 0 : bare ? -0.7 : 0.15 + 0.5 * Math.max(0, Math.sin(beat * 0.13))
    wantX += (mods.gazeX - wantX) * mods.looks
    wantY += (mods.gazeY - wantY) * mods.looks
    const follow = 1 - Math.exp(-dt * 9)
    actor.gazeX += (wantX - actor.gazeX) * follow
    actor.gazeY += (wantY - actor.gazeY) * follow
  }

  // --- What the view draws ------------------------------------------------

  /** Where a hat rests in the place it is seen to be. A hat on a head rides its creature. Writes into `out`. */
  private restHat(hat: number, out: HatPose): HatPose {
    const h = this.hats[hat], seen = h.seen
    out.flip = 0; out.turn = 0; out.squash = h.press.x
    if (seen.at === 'tile') {
      out.x = holeX(hat, this.hats.length); out.y = SLAB / 2; out.z = this.tileZ + HAT_HEIGHT[h.kind] / 2; out.up = 0; out.tilt = 0
      return out
    }
    if (seen.at === 'hand') {
      out.x = h.hand.x; out.y = h.hand.y; out.z = h.hand.z; out.up = 1; out.tilt = 0; out.squash = 1.12
      return out
    }
    if (seen.at === 'loose') {
      // It scuttles in a small circle beside its round spot, slowly enough for a small finger to land on it.
      const step = this.time * 3.4 + hat, round = this.time * LOOSE_TURN + hat * 2.1
      out.x = spotX(seen.spot) + LOOSE_CIRCLE * Math.cos(round); out.y = 0.16 * Math.abs(Math.sin(step * Math.PI)); out.z = LOOSE_Z + LOOSE_CIRCLE * Math.sin(round); out.up = 1; out.tilt = 0.14 * Math.sin(step * Math.PI)
      return out
    }
    const actor = this.actors.get(seen.who)
    if (!actor) { out.x = holeX(hat, this.hats.length); out.y = SLAB / 2; out.z = this.tileZ; out.up = 0; out.tilt = 0; return out }
    const mods = actor.mods, body = BODY[actor.kind]
    // A second hat on one head pushes the first down over the eyes: a tower slips, and is worn in front of the face.
    const tower = actor.hats > 1, fwd = Math.max(mods.hatFwd, Math.min(1, actor.slip / 0.35))
    const slip = (-(body.top - body.faceY) + 0.15) * Math.max(0, (actor.slip - 0.35) / 0.65)
    let under = 0
    for (let level = 0; level < seen.level; level++) under += HAT_HEIGHT[this.hatKind(this.hatOn(seen.who, level) ?? hat)] * 0.72
    // However far an act and a slipping tower bring a hat down, it stays above the feet.
    const lean = actor.lean.x + mods.lean, top = Math.max(0.45, body.top * actor.squash.x * mods.squash + slip + mods.hatLift) + under
    out.x = actor.x + mods.dx - Math.sin(lean) * top
    out.y = actor.hop.x + mods.dy + Math.cos(lean) * top - 0.06
    out.z = actor.z + 0.02 * (seen.level + 1) + fwd * HAT_FWD
    out.up = 1
    out.tilt = lean + mods.hatTilt + (actor.grumpy && !tower ? 0.16 : 0)
    out.turn = mods.turn
    return out
  }

  /** The hat seen at this level on a creature's head, if any. */
  hatOn(who: string, level: number): number | null {
    const hat = this.hats.findIndex((h) => h.seen.at === 'head' && h.seen.who === who && h.seen.level === level)
    return hat < 0 ? null : hat
  }

  hatPose(hat: number): HatPose { return this.hats[hat].pose }
  flying(hat: number): boolean { return this.hats[hat].flight !== null }
  walking(who: string): boolean { return this.actors.get(who)?.walk != null }
  acting(who: string): string | null { return this.actors.get(who)?.act?.name ?? null }

  /** Puts a hat where it is seen to be at once, with no flight: for laying the stage out as it was left. */
  place(hat: number, seen: Seen): void {
    const h = this.hats[hat]
    h.seen = seen
    h.flight = null
    this.restHat(hat, h.pose)
  }

  actorPose(who: string, out: ActorPose): ActorPose {
    const actor = this.actors.get(who)!, mods = actor.mods
    out.x = actor.x + mods.dx; out.y = actor.hop.x + mods.dy; out.z = actor.z
    out.squash = actor.squash.x * mods.squash; out.lean = actor.lean.x + mods.lean; out.turn = mods.turn
    out.gazeX = actor.gazeX; out.gazeY = actor.gazeY; out.cross = mods.cross
    out.pat = Math.max(mods.pat, Math.min(1, actor.pat * 4) * (0.8 + 0.2 * Math.sin(this.time * 16)))
    out.mouth = actor.mouth > 0 ? 0.55 + 0.45 * Math.sin(this.time * 30 + actor.phase) : 0
    // A blink every few seconds, at a moment of its own.
    out.eyes = (this.time + actor.phase) % (2.6 + hash(actor.kind.length + actor.phase) * 2.4) < 0.11 ? 0.1 : 1
    out.ears = mods.ears
    return out
  }
}

export const DIMPLE_SECONDS = 0.6
