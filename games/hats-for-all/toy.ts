import { type CreatureKind } from './kinds'
import { PERSONALITY, hash, stepSpring, type Spring } from './motion'
import { creatureAt, placeOf, tapCreature, tapHat, type Happened, type Place, type World } from './rules'
import { BODY, HAT_HEIGHT, SLAB } from './sizes'
import { ARCH_X, ARCH_Z, ROW_Z, TILE_Z, holeX, spotX } from './stage'
import { moodFor, tasteFor } from './tastes'
import { babble, bap, creak, fwump, hoot, pip, plop, pok, scuttle, squeak, type Mood, type Partial } from './voices'

// The toy: pressing a foam hat out of its mat, with its motion and its sound
// (ART.md, "The toy"). It holds the world of the rules and plays what happens
// to it as numbers: where each hat and creature is this frame, and which
// voices to sound. No renderer and no DOM, so a test can press and step it.
// It has no goal: no change comes, nothing is judged and nothing ends.

export type Target = { type: 'hat'; hat: number } | { type: 'creature'; spot: number } | { type: 'arch' } | { type: 'floor'; x: number; z: number }

export type HatPose = {
  x: number; y: number; z: number
  /** 0 lying flat in its hole, 1 standing upright. */
  up: number
  /** How far it has turned over in the air, in radians. */
  flip: number
  /** Its lean to one side, in radians. */
  tilt: number
  /** 1 at rest; under 1 pressed flat, over 1 stretched. */
  squash: number
}

export type CreaturePose = {
  x: number; y: number; z: number
  squash: number
  lean: number
  /** Where its pupils look, each from -1 to 1. */
  gazeX: number; gazeY: number
  /** 0 with its hands at its sides, 1 with both patting the top of its head. */
  pat: number
  /** 0 shut, 1 wide: open while it babbles. */
  mouth: number
  /** 1 with its eyes open, 0 shut in a blink. */
  eyes: number
}

/** A voice to sound, `delay` seconds from now. */
export type Cue = { voice: Partial[]; delay: number }

/** A place the foam floor was pressed, spreading and fading. */
export type Dimple = { x: number; z: number; age: number }
export const DIMPLE_SECONDS = 0.6

type Flight = { fromX: number; fromY: number; fromZ: number; fromUp: number; t: number; lasts: number; arc: number; to: Place['at'] }
type HatAnim = { pose: HatPose; press: Spring; pressed: boolean; flight: Flight | null }
type CreatureAnim = { kind: CreatureKind; spot: number; squash: Spring; lean: Spring; hop: Spring; pressed: boolean; gazeX: number; gazeY: number; lookX: number; lookY: number; lookFor: number; pat: number; mouth: number; phase: number }

const LOOSE_Z = ROW_Z + 1.9
/** A loose hat's circle beside its round spot: how wide, and how fast it goes round, in radians a second. */
export const LOOSE_CIRCLE = 0.45
export const LOOSE_TURN = 1.1
const ease = (t: number): number => t * t * (3 - 2 * t)

export class Toy {
  world: World
  /** Seconds of attended game time since the toy began. */
  time = 0
  readonly cues: Cue[] = []
  readonly dimples: Dimple[] = []
  readonly arch: Spring = { x: 1, v: 0 }
  private readonly hats: HatAnim[]
  private creatures: CreatureAnim[]
  private archPressed = false
  private sounded = 0

  constructor(world: World) {
    this.world = world
    this.creatures = world.crew.map((creature, i) => ({ kind: creature.kind, spot: creature.spot, squash: { x: 1, v: 0 }, lean: { x: 0, v: 0 }, hop: { x: 0, v: 0 }, pressed: false, gazeX: 0, gazeY: 0, lookX: 0, lookY: 0, lookFor: 0, pat: 0, mouth: 0, phase: hash(i + 1) * 6.28 }))
    this.hats = world.tile.map(() => ({ pose: { x: 0, y: 0, z: 0, up: 0, flip: 0, tilt: 0, squash: 1 }, press: { x: 1, v: 0 }, pressed: false, flight: null }))
    this.hats.forEach((_, hat) => this.rest(hat, this.hats[hat].pose))
  }

  /** The finger lands: the foam gives at once, in this call, before any lift. */
  press(target: Target): void {
    this.cues.push({ voice: target.type === 'floor' ? squeak(this.sounded++) : creak(this.sounded++), delay: 0 })
    if (target.type === 'hat' && this.hats[target.hat]) {
      const anim = this.hats[target.hat]
      anim.pressed = true
      anim.press.x = Math.min(anim.press.x, 0.72)
      const place = placeOf(this.world, target.hat)
      if (place.at === 'head') this.creature(place.spot)!.squash.v -= 2.5
    } else if (target.type === 'creature') {
      const creature = this.creature(target.spot)
      if (creature) { creature.pressed = true; creature.squash.x = Math.min(creature.squash.x, 0.9) }
    } else if (target.type === 'arch') {
      this.archPressed = true
      this.arch.x = Math.min(this.arch.x, 0.94)
    } else if (target.type === 'floor') {
      this.dimples.push({ x: target.x, z: target.z, age: 0 })
      // Whatever stands near a poke in the floor hops.
      for (const creature of this.creatures) {
        const near = 1 - Math.hypot(spotX(creature.spot) - target.x, ROW_Z - target.z) / 4.5
        if (near > 0) creature.hop.v += 7 * near * PERSONALITY[creature.kind].hop
      }
    }
  }

  /** The finger lifts. A tap plays the move; a press that was not a tap only lets the foam spring back. */
  release(target: Target, tapped: boolean): void {
    for (const hat of this.hats) hat.pressed = false
    for (const creature of this.creatures) creature.pressed = false
    this.archPressed = false
    if (!tapped) return
    if (target.type === 'hat') this.play(tapHat(this.world, target.hat))
    else if (target.type === 'creature') this.play(tapCreature(this.world, target.spot))
    else if (target.type === 'arch') {
      this.arch.v += 2.2
      this.cues.push({ voice: hoot(this.sounded++), delay: 0 })
    }
  }

  private play(outcome: { world: World; happened: Happened[] }): void {
    this.world = outcome.world
    for (const event of outcome.happened) {
      if (event.type === 'hatMoved') this.fly(event.hat, event.from.at, event.to.at)
      else if (event.type === 'bared') this.wonder(event.spot, 'plain', 1.3)
      else if (event.type === 'noHat') this.wonder(event.spot, 'ask', 1.6)
      else if (event.type === 'trick') {
        const creature = this.creature(event.spot)!
        creature.hop.v += 5 * PERSONALITY[creature.kind].hop + 2
        creature.lean.v += 2.4
        this.say(creature, moodFor(tasteFor(creature.kind, this.world.tile[event.hat])), 0)
      } else if (event.type === 'towerFell') for (const hat of event.hats) this.fly(hat, 'head', 'tile')
    }
  }

  /** A hat leaves where it was, from the pose it has this instant, so a hat tapped in the air turns round from there. */
  private fly(hat: number, from: Place['at'], to: Place['at']): void {
    const anim = this.hats[hat], pose = anim.pose
    const far = Math.hypot(pose.x - this.restX(hat), pose.z - (to === 'tile' ? TILE_Z : ROW_Z))
    anim.flight = { fromX: pose.x, fromY: pose.y, fromZ: pose.z, fromUp: pose.up, t: 0, lasts: 0.4 + 0.02 * far, arc: 2.1 + 0.16 * far, to }
    anim.press.v += 9
    const kind = this.world.tile[hat]
    this.cues.push({ voice: from === 'head' ? pip(kind, this.sounded++) : pok(kind, this.sounded++), delay: 0 })
  }

  private restX(hat: number): number {
    const place = placeOf(this.world, hat)
    return place.at === 'tile' ? holeX(hat, this.world.tile.length) : spotX(place.spot)
  }

  /** A bare creature pats its head and looks at the hats. */
  private wonder(spot: number, mood: Mood, seconds: number): void {
    const creature = this.creature(spot)
    if (!creature) return
    creature.pat = seconds
    this.look(creature, 0, TILE_Z, seconds)
    this.say(creature, mood, 0.12)
  }

  private say(creature: CreatureAnim, mood: Mood, delay: number): void {
    const voice = babble(creature.kind, mood, this.sounded++)
    creature.mouth = delay + voice.reduce((end, partial) => Math.max(end, partial.at + partial.decay), 0)
    this.cues.push({ voice, delay })
  }

  private look(creature: CreatureAnim, x: number, z: number, seconds: number, up = 0): void {
    creature.lookX = Math.max(-1, Math.min(1, (x - spotX(creature.spot)) / 4))
    creature.lookY = up || Math.max(-1, Math.min(1, -(z - ROW_Z) / 4))
    creature.lookFor = seconds
  }

  private creature(spot: number): CreatureAnim | undefined {
    return this.creatures.find((creature) => creature.spot === spot)
  }

  /** A hat comes down: the thing it lands on gives, sounds and reacts, and the others look. */
  private land(hat: number, to: Place['at']): void {
    const anim = this.hats[hat], kind = this.world.tile[hat], place = placeOf(this.world, hat)
    anim.press.x = 0.7
    if (to === 'tile') {
      this.cues.push({ voice: fwump(kind, this.sounded++), delay: 0 })
      this.dimples.push({ x: anim.pose.x, z: TILE_Z, age: 0 })
      return
    }
    if (to === 'loose' || place.at !== 'head') {
      this.cues.push({ voice: plop(kind, this.sounded++), delay: 0 })
      for (const creature of this.creatures) this.look(creature, anim.pose.x, LOOSE_Z, 1.6)
      return
    }
    const wearer = this.creature(place.spot)!
    this.cues.push({ voice: bap(kind, this.sounded++), delay: 0 })
    wearer.squash.x = 1 - PERSONALITY[wearer.kind].bounce
    wearer.pat = 0
    this.look(wearer, spotX(wearer.spot), ROW_Z, 1.1, 1)
    this.say(wearer, moodFor(tasteFor(wearer.kind, kind)), 0.1)
    for (const other of this.creatures) if (other !== wearer) this.look(other, spotX(wearer.spot), ROW_Z, 1.2, 0.35)
  }

  /** Plays `dt` seconds of game time. */
  step(dt: number): void {
    const before = this.time
    this.time += dt
    for (let i = this.dimples.length - 1; i >= 0; i--) if ((this.dimples[i].age += dt) > DIMPLE_SECONDS) this.dimples.splice(i, 1)
    stepSpring(this.arch, this.archPressed ? 0.94 : 1, 120, 7, dt)
    for (const creature of this.creatures) {
      const p = PERSONALITY[creature.kind], beat = this.time * p.tempo * 6.28 + creature.phase
      const bare = creatureAt(this.world, creature.spot)?.hats.length === 0
      stepSpring(creature.squash, creature.pressed ? 0.86 : 1 + 0.022 * Math.sin(beat), p.stiffness, p.damping, dt)
      stepSpring(creature.lean, p.sway * Math.sin(beat * 0.5), p.stiffness * 0.5, p.damping, dt)
      stepSpring(creature.hop, 0, 90, 9, dt)
      if (creature.hop.x < 0) { creature.hop.x = 0; creature.hop.v = Math.abs(creature.hop.v) * 0.35; creature.squash.v -= 1.5 }
      creature.pat = Math.max(0, creature.pat - dt)
      // Its one want, shown while nothing else happens: a bare creature pats its bare head now and then, at a moment of its own.
      if (bare && creature.lookFor === 0 && (this.time * 0.22 + creature.phase) % 1 < 0.12) creature.pat = Math.max(creature.pat, 0.25)
      creature.mouth = Math.max(0, creature.mouth - dt)
      creature.lookFor = Math.max(0, creature.lookFor - dt)
      // With nothing to look at, a bare creature looks at the hats and a hatted one up at its own.
      const wantX = creature.lookFor > 0 ? creature.lookX : 0.25 * Math.sin(beat * 0.21)
      const wantY = creature.lookFor > 0 ? creature.lookY : bare ? -0.7 : 0.15 + 0.5 * Math.max(0, Math.sin(beat * 0.13))
      const follow = 1 - Math.exp(-dt * 9)
      creature.gazeX += (wantX - creature.gazeX) * follow
      creature.gazeY += (wantY - creature.gazeY) * follow
    }
    this.hats.forEach((anim, hat) => {
      stepSpring(anim.press, anim.pressed ? 0.6 : 1, 300, 13, dt)
      const flight = anim.flight
      if (!flight) {
        this.rest(hat, anim.pose)
        // A loose hat scuttles: one small step sounds each time it comes down.
        if (placeOf(this.world, hat).at === 'loose' && Math.floor(this.time * 3.4 + hat) > Math.floor(before * 3.4 + hat)) this.cues.push({ voice: scuttle(this.sounded++), delay: 0 })
        return
      }
      flight.t += dt
      const u = Math.min(1, flight.t / flight.lasts), e = ease(u), pose = anim.pose
      this.rest(hat, pose)
      pose.x = flight.fromX + (pose.x - flight.fromX) * e
      pose.z = flight.fromZ + (pose.z - flight.fromZ) * e
      pose.y = flight.fromY + (pose.y - flight.fromY) * e + Math.sin(u * Math.PI) * flight.arc
      pose.up = flight.fromUp + (pose.up - flight.fromUp) * e
      pose.flip = e * Math.PI * 2
      if (u < 1) return
      pose.flip = 0
      anim.flight = null
      this.land(hat, flight.to)
    })
  }

  /** Where a hat rests in the place the rules give it. A hat on a head rides its creature. */
  private rest(hat: number, out: HatPose): void {
    const place = placeOf(this.world, hat), kind = this.world.tile[hat], anim = this.hats[hat]
    out.flip = 0
    out.squash = anim ? anim.press.x : 1
    if (place.at === 'tile') {
      out.x = holeX(hat, this.world.tile.length); out.y = SLAB / 2; out.z = TILE_Z + HAT_HEIGHT[kind] / 2; out.up = 0; out.tilt = 0
      return
    }
    if (place.at === 'loose') {
      // It scuttles in a small circle beside its round spot, slowly enough for a small finger to land on it.
      const step = this.time * 3.4 + hat, round = this.time * LOOSE_TURN + hat * 2.1
      out.x = spotX(place.spot) + LOOSE_CIRCLE * Math.cos(round); out.y = 0.16 * Math.abs(Math.sin(step * Math.PI)); out.z = LOOSE_Z + LOOSE_CIRCLE * 0.6 * Math.sin(round); out.up = 1; out.tilt = 0.14 * Math.sin(step * Math.PI)
      return
    }
    const creature = this.creature(place.spot)!, wearer = creatureAt(this.world, place.spot)!
    let under = 0
    for (let level = 0; level < place.level; level++) under += HAT_HEIGHT[this.world.tile[wearer.hats[level]]] * 0.72
    const top = BODY[creature.kind].top * creature.squash.x + under
    out.x = spotX(place.spot) - Math.sin(creature.lean.x) * top; out.y = creature.hop.x + Math.cos(creature.lean.x) * top - 0.06; out.z = ROW_Z + 0.02 * (place.level + 1); out.up = 1; out.tilt = creature.lean.x
  }

  hatPose(hat: number): HatPose {
    return this.hats[hat].pose
  }

  get spots(): number[] {
    return this.creatures.map((creature) => creature.spot)
  }

  creaturePose(spot: number, out: CreaturePose): CreaturePose {
    const creature = this.creature(spot)!
    out.x = spotX(spot); out.y = creature.hop.x; out.z = ROW_Z
    out.squash = creature.squash.x; out.lean = creature.lean.x
    out.gazeX = creature.gazeX; out.gazeY = creature.gazeY
    out.pat = Math.min(1, creature.pat * 4) * (0.8 + 0.2 * Math.sin(this.time * 16))
    out.mouth = creature.mouth > 0 ? 0.55 + 0.45 * Math.sin(this.time * 30 + creature.phase) : 0
    // A blink every few seconds, at a moment of its own.
    const since = (this.time + creature.phase) % (2.6 + hash(creature.spot + 9) * 2.4)
    out.eyes = since < 0.11 ? 0.1 : 1
    return out
  }
}

/** Where the arch stands, for the view and for a touch. */
export const ARCH_AT = { x: ARCH_X, z: ARCH_Z } as const
