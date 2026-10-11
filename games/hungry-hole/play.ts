import { KIND, footOf, heightOf, mouthOf, seatOf, widthOf, type Kind } from './kinds'
import { FALL_SECONDS, STEP_SECONDS, STRIDE, TEETER_HZ, airborne, bobSeconds, hurry, stepLift, strode } from './motion'
import { burped, swallowed, takes } from './rules'
import { FLOAT } from './seen'
import { CLOSE, GAP, HOLE_START, STREET, aside, clampHole, setDown, stepOut, type Standing } from './street'

// The toy, with no browser in it: a hole that follows the finger, things that
// wobble on its rim and drop in, and a burp that gives them back as a stack.
// The Mount passes touches in; the view reads what is here and draws it.
//
// What is saved (`world`) changes at once when the child causes it: a thing
// that starts to tip is in the belly from that moment, and a stack that is let
// down is on the street at the spot where it will stand. Everything else here
// (leans, wobbles, falls, bobs, the few steps a stack walks) is a view of that
// and is gone on load.

/** What the save holds of the street: see save.ts for the record around it. */
export type World = {
  hole: { x: number; z: number }
  /** In the order the things went in; the last is the next out. */
  belly: Kind[]
  /** The stack riding on the hole's breath, from the bottom up. */
  breath: Kind[]
  street: Standing[]
}

/** What a finger landed on. The view works it out; `x` and `z` are the point of the street under the finger. */
export type Target =
  | { on: 'hole'; x: number; z: number }
  /** `part` is which thing of a stack the finger is on, counted from the bottom; the bottom one when it is left out. */
  | { on: 'thing'; thing: Thing; part?: number; x: number; z: number }
  /** A thing that rides on the breath: `part` counts from the bottom of what hangs there. */
  | { on: 'rider'; part: number; x: number; z: number }
  | { on: 'mayor' | 'keeper' | 'gate' | 'street'; x: number; z: number }
  /** `head` is which head of the crowd (places.ts). */
  | { on: 'crowd'; head: number; x: number; z: number }

/** What a note that waits belongs to. When that is over before the note's time has come, the note is not heard (later.ts). */
export type Cause = 'breath' | 'fall' | 'wail'

/** Something to hear or to see fly: the Mount turns each into a voice, the view into scraps and reactions. */
export type Cue =
  | { type: 'slide' | 'pucker' | 'hiccup' }
  | { type: 'teeter' | 'drop'; kind: Kind }
  /** A thing answers a finger. `deep` when it sits in the tuba, and so sounds through it. */
  | { type: 'poke'; kind: Kind; deep?: boolean }
  /** The mouth takes hold of the foot of a thing too wide for it, and tugs. */
  | { type: 'strain'; kind: Kind }
  /** The lip lets go of that foot: the tug has died away, or the hole has gone from it. */
  | { type: 'loose'; kind: Kind }
  /**
   * A thing comes up out of the mouth. `onto` is the thing that rode at the bottom until now and sits on this one from
   * now; `rest` is how many ride above this one. `late` when it waited down in the mouth: the hole's growl was heard at the tap.
   */
  | { type: 'burp'; kind: Kind; onto: Kind | null; rest: number; late?: boolean }
  /** The hole's growl at a tap whose thing waits down in the mouth until the street has made room. */
  | { type: 'growl'; kind: Kind }
  /** One bob of the stack on the breath. */
  | { type: 'bob'; parts: readonly Kind[] }
  /** A stack let down from the breath lands on the street, at (x, z). */
  | { type: 'setdown'; parts: readonly Kind[]; x: number; z: number }
  /** One step of a stack's walk; `x` and `z` are where it is. */
  | { type: 'step'; parts: readonly Kind[]; step: number; x: number; z: number }
  | { type: 'secret'; which: 'march' | 'bounce' | 'peek' }
  | { type: 'muffled'; tuba: boolean }
  /** A bystander was touched; `head` is which head of the crowd, or -1. */
  | { type: 'bystander'; who: 'mayor' | 'keeper' | 'crowd' | 'gate'; head: number }
  /** The hole has gone out from under a stack that holds the whole street: the scene of the float starts. */
  | { type: 'float'; parts: readonly Kind[]; x: number; z: number }
  /** That tower touches down on the street, at (x, z). */
  | { type: 'thud'; parts: readonly Kind[]; x: number; z: number }
  /** The two leaves of the gate meet. */
  | { type: 'clunk' }
  /** Something that notes were waiting on is over: the stack has dropped from the breath, a thing on its way down is given back, the hat is out again. */
  | { type: 'over'; cause: Cause }
  /** From the two scenes: a thing clacks down into the float, sounds as it passes the gate post, or stops on its spot. */
  | { type: 'clack' | 'pass' | 'arrive'; kind: Kind }
  /** The float rolls out in its bottom thing's walk: one sound for every second step of it. */
  | { type: 'roll'; kind: Kind; step: number }
  | { type: 'gate'; open: boolean }

/** The few steps a stack walks from where it dropped to where it stands. */
/**
 * `aside` marks the one quick step a thing takes out from under a stack that is coming up: it does not stop for the hole.
 * `over` is how high it goes on that step, over what stands in its way; 0 on a clear way, which it takes on the ground.
 */
export type Walk = { fromX: number; fromZ: number; steps: number; seconds: number; phase: number; heard: number; lift: number; aside: boolean; over: number }

/** A thing or stack standing on the street, with what the view needs to move it. `x` and `z` are where it stands, which is what the save holds. */
export type Thing = {
  parts: Kind[]
  x: number
  z: number
  /** Where it is seen: on its way to (x, z) while it hops down or walks, and there otherwise. */
  sx: number
  sz: number
  /** 0..1, how far the hole is under it. */
  lean: number
  /** The way to the hole, as a unit vector; kept from the last time it was known. */
  dirX: number
  dirZ: number
  /** 0..1, how lively its wobble is. */
  amp: number
  phase: number
  onRim: boolean
  /** Seconds it has been on the rim without a break. */
  rim: number
  /** Seconds since a finger landed on it, or a large number, and which of its parts the finger was on. */
  poked: number
  pokedPart: number
  /** While it is let down from the breath: where it comes from, how high it still is, and 0..1 of the way. */
  air: number
  fromX: number
  fromZ: number
  hop: number
  /** 1 at the thump of a landing, easing to 0. */
  squash: number
  /** Seconds since its wobble was last heard. */
  rattled: number
  /** Seconds since it came to stand as what it is. */
  since: number
  /** How high it goes on its hop down, over what stands in its way; 0 on a clear way, which is one short hop. */
  over: number
  /** Its walk, while it walks. */
  walk: Walk | null
  /** Steps taken of a walk, running on: what its gait is drawn from. */
  gait: number
  /** It has not come onto the street yet: the next street is still coming in. */
  away: boolean
  /** It is on its way in from the gate, where the scene puts it; `leap` is how high it is over the others on a street with no way round. */
  coming: boolean
  leap: number
  /** 0..1, how much of it has come out of the dark behind the gate. 1 is whole. */
  size: number
}

/** A thing on its way in. It is in the belly already. `round` and `ahead` are the room it had when it tipped (see `room`). */
export type Falling = { parts: Kind[]; x: number; z: number; t: number; seconds: number; dirX: number; dirZ: number; round: number; ahead: number }

/** A thing riding on the breath, from the bottom up: `y` is how far its foot is above the mouth. `wait` is above 0 while it stays down in the mouth until what stands in its way has stepped out. */
export type Rider = { kind: Kind; y: number; v: number; since: number; wait: number; /** Seconds since a finger landed on it, or a large number. */ poked: number; /** What is heard and seen when it comes up, kept while it waits. */ held: Cue[] }

const HOMING = 7
const TOP_SPEED = 13
/** How far the hole may slip from under a riding stack before the stack is let down. */
export const LET_DOWN = 0.4
/** How high the bottom of a riding stack hangs above the street. */
export const HOVER = 0.7
/** The share of a thing's width that must be over the mouth, past its middle, before it goes in. */
const OVER = 0.25
/** A wobbling thing is heard at most this often, in seconds, however fast it wobbles. */
const RATTLE_EVERY = 0.32
/** Street the hole must cross for one muffled beat from inside. */
const BEAT_STRETCH = 1.3
/** Seconds a stack takes to hop from the breath down to the street. */
export const HOP_SECONDS = 0.32
/** The march the dog, the tuba and the drummer play is eight steps long, however short the way. */
export const MARCH_STEPS = 8
/** Two balloons take the whole way in one bounce, which lasts this long. */
export const BOUNCE_SECONDS = 1.3
const FAR = 99
/** The hole is where it was sent when it is within this of the place: a millimetre, which is the grid a save holds it on. */
const NEAR = 1e-3
/** Seconds a thing takes to step out from under a stack that is coming up. */
export const ASIDE_SECONDS = 0.25
/** Seconds a thing takes to go over what stands in its way, and how far above the tallest of it. */
export const OVER_SECONDS = 0.7
const CLEAR = 0.3
/** Room kept between two things that lean toward each other. */
const ELBOW = 0.06
/** How far under the foot of a thing too wide for it the mouth may rest: its lip is under the edge, and the rest of it is in view. */
export const BITE = 0.35
/** The mouth stops at such a thing on a side the child can see: at least this much of the way toward the near kerb, as a share of the whole way. */
const SEEN_SIDE = 0.25
/** Seconds the mouth tugs at a thing too wide for it before it lets go. */
export const STRAIN_SECONDS = 1.4
/** The most frames a put-away plays on unseen, at thirty a second: a minute of play, far more than any hop, walk or glide takes. */
const REST_FRAMES = 1800
/** What stands round the street begins here: the mayor's reach and the gate along the far kerb, the heads along the near one, the tubs at the ends. */
const ROUND = { x0: STREET.x0 - 0.4, x1: STREET.x1 + 0.4, z0: STREET.z0 + 0.1, z1: STREET.z1 + 1.2 } as const

function thingOf(standing: Standing): Thing {
  return {
    parts: [...standing.parts], x: standing.x, z: standing.z, sx: standing.x, sz: standing.z, lean: 0, dirX: 1, dirZ: 0, amp: 0, phase: 0, onRim: false, rim: 0,
    poked: FAR, pokedPart: 0, air: 0, fromX: standing.x, fromZ: standing.z, hop: 1, squash: 0, rattled: FAR, since: FAR, over: 0, walk: null, gait: 0, away: false, coming: false, leap: 0, size: 1,
  }
}

/** How high a stack stands as it is drawn: a balloon on top of one floats higher than it sits. */
function tallOf(parts: readonly Kind[]): number {
  return heightOf(parts) + (parts.length > 1 && parts[parts.length - 1] === 'balloon' ? FLOAT : 0)
}

/**
 * How far above the street a thing is while it hangs, hops down, leaps over another or bounces: the view draws it
 * there, and a finger finds it there.
 */
export function liftOf(thing: Thing): number {
  if (thing.hop < 1) return thing.air + 0.5 * Math.sin(thing.hop * Math.PI)
  let lift = thing.leap
  if (thing.walk && thing.walk.lift > 0) lift += thing.walk.lift * Math.sin(Math.min(1, thing.walk.phase) * Math.PI)
  // Its walk's own bounce: the hat's hop, a balloon's bounce under its load.
  if (thing.coming || thing.walk) lift += stepLift(thing.parts[0], thing.gait, loadOf(thing.parts))
  return lift
}

/** The summed width of a stack: what its bottom thing carries. */
export function loadOf(parts: readonly Kind[]): number {
  let load = 0
  for (const kind of parts) load += KIND[kind].width
  return load
}

/** Going over something: up where it is, across, and down where it lands. `gone` is the share of the way, `high` of the height. */
function vault(t: number): { gone: number; high: number } {
  const smooth = (value: number): number => { const v = Math.max(0, Math.min(1, value)); return v * v * (3 - 2 * v) }
  return { gone: smooth((t - 0.3) / 0.4), high: t < 0.5 ? smooth(t / 0.3) : smooth((1 - t) / 0.3) }
}

/** The drummer on top of the tuba on top of the dog: it plays a whole march as it rolls. */
export function isMarch(parts: readonly Kind[]): boolean {
  return parts[0] === 'dog' && parts[1] === 'tuba' && parts[2] === 'drummer'
}

/** A balloon at the bottom and a balloon on top: one long bounce clear of the street. */
export function isBounce(parts: readonly Kind[]): boolean {
  return parts.length >= 2 && parts[0] === 'balloon' && parts[parts.length - 1] === 'balloon'
}

/** The pie on top of the hat on top of everything: the mayor covers his eyes and peeks. */
export function isPeek(parts: readonly Kind[]): boolean {
  return parts.length >= 3 && parts[parts.length - 1] === 'pie' && parts[parts.length - 2] === 'hat'
}

export class Play {
  readonly things: Thing[]
  readonly belly: Kind[]
  readonly riders: Rider[]
  readonly falling: Falling[] = []
  /** The things that have a step or a hop to make and have not set off: one thing moves on the street at a time, in this order. */
  readonly turns: Thing[] = []
  /** Cues since the Mount last took them. */
  readonly cues: Cue[] = []
  /** Something the save holds has changed. `urgent` when it was a thing going in, coming out or being let down. */
  dirty = false
  urgent = false

  /** Where the hole is, and where it is going. */
  x = 0
  z = 0
  private toX = 0
  private toZ = 0
  /** How fast it is moving, in street units a second, and which way. */
  speed = 0
  headingX = 1
  headingZ = 0
  /** 1 when the finger has just called it, easing to 0: the rim stretches toward the finger before the hole has moved. */
  lurch = 0
  /** The mouth's width as drawn: it springs toward the width the belly gives. */
  mouth = 0
  private mouthV = 0
  /** A swallow or a burp: springs from a kick back to 0. Positive bulges the rim. */
  gulp = 0
  private gulpV = 0
  /** 1 while a finger rests on the hole, easing to 0. */
  pucker = 0
  private held = false
  private grabX = 0
  private grabZ = 0
  private leading = false
  /** It is gliding to its place on a new street, which is where the save has it already. */
  private parking = false
  /** Where the riding stack hangs. */
  private anchorX = 0
  private anchorZ = 0
  private crossed = 0
  /** How far the riding stack is through its bob, 0..1: the one clock it rises and falls on and its notes and sticks keep. */
  private beat = 0
  /** Seconds of play, for the slow sway of a riding stack. */
  time = 0
  /** How often a thing that had to step aside found no place to step to. A test reads it. */
  crowded = 0
  /** 1 while the mouth tugs at a thing too wide for it, easing to 0 as it lets go; and the way from the hole to that thing. */
  strain = 0
  strainX = 1
  strainZ = 0
  private tugging = false
  /** The thing whose foot the lip has hold of, by its bottom part, or null. */
  private tugged: Kind | null = null
  /** A finger has called the hole and no step has been played since: the rim's reach stays whole until that step is drawn. */
  private called = false

  constructor(world: World) {
    this.belly = []
    this.riders = []
    this.things = []
    this.found(world)
  }

  /**
   * The street as a save has it, with everything at rest: nothing eases into place and nothing is heard. A load
   * finds it so, and so does a put-away (`rest`).
   */
  private found(world: World): void {
    this.belly.splice(0, this.belly.length, ...world.belly)
    this.riders.splice(0, this.riders.length, ...world.breath.map((kind) => ({ kind, y: 0, v: 0, since: FAR, wait: 0, poked: FAR, held: [] })))
    this.things.splice(0, this.things.length, ...world.street.map(thingOf))
    this.falling.length = 0
    this.turns.length = 0
    this.speed = 0
    this.headingX = 1
    this.headingZ = 0
    this.lurch = this.mouthV = this.gulp = this.gulpV = this.pucker = 0
    this.held = this.leading = this.parking = this.tugging = this.called = false
    this.grabX = this.grabZ = this.crossed = this.time = this.strain = 0
    // A stack that rides is found at the top of its beat: its first frame is the frame of its note, and it bobs on from there.
    this.beat = 1
    this.strainX = 1
    this.strainZ = 0
    this.tugged = null
    this.mouth = mouthOf(this.belly)
    this.x = world.hole.x
    this.z = world.hole.z
    // A hole put away under a thing too wide for it is found at that thing's foot, where it would have come to rest.
    // It lies on the save's own grid, so what is found is saved again as the same place.
    const at = this.berth(world.hole.x, world.hole.z)
    this.x = this.toX = this.anchorX = round(at.x)
    this.z = this.toZ = this.anchorZ = round(at.z)
    // Found as left: a riding stack hangs where it hung, with nothing springing into place.
    this.settleRiders()
    // A stack rides only where it has room. In a save with a thing standing in the stack itself the thing is found beside it;
    // with no place for the thing, the stack is found in the belly, the next thing out last. A thing that stood close
    // against the stack, as a crowded street leaves it, is found where it stood: the same save is the same street on every load.
    const room = this.riders.length > 0 ? this.roomFor({ parts: [...world.breath], x: this.anchorX, z: this.anchorZ }, this.belly, CLOSE) : []
    for (const step of room ?? []) {
      step.thing.x = step.thing.sx = step.spot.x
      step.thing.z = step.thing.sz = step.spot.z
    }
    if (!room) {
      for (let index = this.riders.length - 1; index >= 0; index--) this.belly.push(this.riders[index].kind)
      this.riders.length = 0
      this.mouth = mouthOf(this.belly)
    }
    // A thing the rim is under leans over it as it leant, and the lip has its hold already: nothing starts to wobble, and the mouth does not tug again.
    for (const thing of this.things) {
      const dx = this.x - thing.x, dz = this.z - thing.z, far = Math.hypot(dx, dz), foot = footOf(thing.parts)
      if (far > 0.05) { thing.dirX = dx / far; thing.dirZ = dz / far }
      const reach = this.mouth / 2 + foot / 2 - far
      if (reach <= 0) continue
      thing.onRim = true
      thing.lean = Math.min(1, reach / foot)
      if (!takes(this.belly, thing.parts)) { this.strainX = -thing.dirX; this.strainZ = -thing.dirZ }
    }
  }

  /**
   * Put away. Whatever was on its way arrives, unseen and unheard: the hole at the end of its glide, a thing going
   * in, a stack coming down or walking, a stack left hanging. Then everything stands as a load of this moment's
   * save finds it. It returns the float's cue when the last stack came down on an empty street, for the Mount to
   * save that ending as it does when the cue is heard.
   */
  rest(): Extract<Cue, { type: 'float' }> | null {
    this.letGo()
    const heard = this.cues.length
    for (let frame = 0; frame < REST_FRAMES && !this.arrived(); frame++) this.step(1 / 30)
    let float: Extract<Cue, { type: 'float' }> | null = null
    for (const cue of this.cues.slice(heard)) if (cue.type === 'float') float = cue
    this.cues.length = heard
    this.found(this.world())
    this.changed(true)
    return float
  }

  /** Nothing is on its way: the hole lies where it was sent, nothing hops, walks, falls or waits, and no stack hangs where the hole has left it. */
  private arrived(): boolean {
    const to = this.berth(this.toX, this.toZ)
    if (Math.hypot(to.x - this.x, to.z - this.z) > NEAR || !this.quiet() || this.falling.length > 0) return false
    return !this.riders.some((rider) => rider.wait > 0) && !(this.riders.length > 0 && Math.hypot(this.x - this.anchorX, this.z - this.anchorZ) > LET_DOWN)
  }

  /**
   * A touch has ended the scene of the next street coming in: the hole is at its place on that street, as every
   * thing is on its spot. The touch then finds the street whole, and the hole sets off from there.
   */
  arrive(): void {
    if (!this.parking) return
    const to = this.berth(this.toX, this.toZ)
    this.x = to.x
    this.z = to.z
    this.speed = 0
    this.parking = false
  }

  /** The mouth's width that the belly gives; `mouth` is on its way there. */
  get wants(): number {
    return mouthOf(this.belly)
  }

  /** What the save holds, with everything at rest: a stack on its way down or walking is where it will stand. */
  world(): World {
    return {
      // A stack on the breath is found where it hangs, with the hole under it: also one the hole has just slipped from, or has left to hang until the street stands still.
      hole: this.parking ? { x: round(this.toX), z: round(this.toZ) } : this.riders.length > 0 ? { x: round(this.anchorX), z: round(this.anchorZ) } : { x: round(this.x), z: round(this.z) },
      belly: [...this.belly],
      breath: this.riders.map((rider) => rider.kind),
      street: this.things.map((thing) => ({ parts: [...thing.parts], x: thing.x, z: thing.z })),
    }
  }

  /** The finger landed. The answer starts here. */
  press(target: Target): void {
    let lid = false
    if (target.on === 'rider') {
      // A thing that rides answers as itself, where it hangs: its own small move and sound, in this frame.
      const up = this.riding, part = Math.max(0, Math.min(up.length - 1, target.part))
      if (up.length > 0) {
        up[part].poked = 0
        // What sits in the tuba sounds through it.
        const deep = part === 1 && up[0].kind === 'tuba'
        this.cues.push(deep ? { type: 'poke', kind: up[part].kind, deep } : { type: 'poke', kind: up[part].kind })
      }
      // The stack rides on the hole's breath, over its mouth, and hides it from the eye: a finger on a thing of it is
      // on the hole as well, which takes the touch as its own. A stack the hole has left calls the hole back under it.
      lid = Math.hypot(this.x - this.anchorX, this.z - this.anchorZ) <= LET_DOWN
    }
    if (target.on === 'hole' || lid) {
      this.held = true
      this.leading = false
      this.grabX = this.x - target.x
      this.grabZ = this.z - target.z
      // A finger on a hole that is gliding holds it where it is.
      this.parking = false
      this.toX = this.x
      this.toZ = this.z
      this.cues.push({ type: 'pucker' })
      return
    }
    this.held = false
    this.leading = true
    this.lurch = 1
    this.called = true
    // The hole sets off with a low whoosh, whatever called it.
    this.cues.push({ type: 'slide' })
    if (target.on === 'rider') {
      this.call(this.anchorX, this.anchorZ)
      return
    }
    if (target.on === 'thing') {
      // A thing is touched where it is drawn: in a stack, the one under the finger answers, as itself.
      const thing = target.thing, part = Math.max(0, Math.min(thing.parts.length - 1, target.part ?? 0))
      thing.poked = 0
      thing.pokedPart = part
      // What sits in the tuba sounds through it.
      const deep = part === 1 && thing.parts[0] === 'tuba'
      this.cues.push(deep ? { type: 'poke', kind: thing.parts[part], deep } : { type: 'poke', kind: thing.parts[part] })
      // A touched thing calls the hole to itself, wherever on it the finger landed.
      this.call(thing.x, thing.z)
      // The mouth is at its foot already and too narrow for it: it tugs again.
      if (thing.onRim && !takes(this.belly, thing.parts)) this.tug(thing)
      return
    }
    if (target.on !== 'street') this.touched(target)
    this.call(target.x, target.z)
  }

  /** A bystander answers a finger as himself. */
  touched(target: Target): void {
    if (target.on === 'crowd') this.cues.push({ type: 'bystander', who: 'crowd', head: target.head })
    else if (target.on === 'mayor' || target.on === 'keeper' || target.on === 'gate') this.cues.push({ type: 'bystander', who: target.on, head: -1 })
  }

  /**
   * The next street is about to come in: the hole glides to where it lies on a new street, out of the way of
   * the things. The save holds that place from this moment, as it holds the spot of a stack on its way down.
   */
  makeWay(): { x: number; z: number } {
    this.letGo()
    const to = clampHole(HOLE_START.x, HOLE_START.z, this.wants)
    this.toX = to.x
    this.toZ = to.z
    this.parking = true
    this.changed(true)
    return to
  }

  /** The finger moved, past the slop of a tap. */
  drag(x: number, z: number): void {
    if (this.held) this.call(x + this.grabX, z + this.grabZ)
    else if (this.leading) this.call(x, z)
  }

  /** The finger lifted where it landed. On the hole that is the burp; anywhere else the call stands. */
  tap(): void {
    const onHole = this.held
    this.letGo()
    if (onHole) this.burp()
  }

  /** The finger lifted after a drag, or a press was taken away: the hole finishes its glide. */
  letGo(): void {
    this.held = false
    this.leading = false
  }

  /** The drag was taken away, which is not the child's doing: the hole stops where it is. */
  halt(): void {
    this.letGo()
    if (this.parking) return
    this.toX = this.x
    this.toZ = this.z
  }

  private call(x: number, z: number): void {
    this.parking = false
    this.toX = x
    this.toZ = z
    const to = this.berth(x, z)
    // The rim reaches for the finger in this same frame, before the hole has moved.
    const dx = to.x - this.x, dz = to.z - this.z, far = Math.hypot(dx, dz)
    if (far > 0.05) {
      this.headingX = dx / far
      this.headingZ = dz / far
    }
  }

  /**
   * The last thing eaten comes up under whatever rides already. An empty hole hiccups, and so does one whose stack
   * would have no room where it hangs or is not over it any more: the thing stays down, and comes up at the next tap that has room.
   */
  private burp(): void {
    const up = burped(this.belly, this.riders.map((rider) => rider.kind))
    this.gulpV += 7
    const first = this.riders.length === 0
    // A stack the hole has left behind is no longer over the mouth: nothing comes up under it.
    const left = !first && Math.hypot(this.x - this.anchorX, this.z - this.anchorZ) > LET_DOWN
    const room = up && !left ? this.roomFor({ parts: up.breath, x: first ? this.x : this.anchorX, z: first ? this.z : this.anchorZ }, up.belly) : null
    if (!up || !room) {
      this.cues.push({ type: 'hiccup' })
      return
    }
    const kind = up.breath[0]
    this.belly.length = 0
    this.belly.push(...up.belly)
    if (first) {
      this.anchorX = this.x
      this.anchorZ = this.z
      this.beat = 0
    }
    // What was still on its way down is in the belly already: the burp does not wait for it to be out of sight.
    if (this.falling.length > 0) this.cues.push({ type: 'over', cause: 'fall' })
    this.falling.length = 0
    const onto = this.riders.length > 0 ? this.riders[0].kind : null
    // It starts down in the mouth and shoots up into the bottom place, pushing the others up. Whatever stands
    // where the stack will hang steps out of its way first, and the burp waits for that, deep enough to be under it;
    // it waits as well behind one that came up before it and is still waiting.
    const behind = this.riders.some((rider) => rider.wait > 0)
    const waits = room.length > 0 || behind
    const rider: Rider = { kind, y: -1.4, v: 9, since: 0, wait: 0, poked: FAR, held: [{ type: 'burp', kind, onto, rest: this.riders.length, ...(waits ? { late: true } : {}) }] }
    if (isPeek(up.breath) && !isPeek(up.breath.slice(1))) rider.held.push({ type: 'secret', which: 'peek' })
    this.riders.unshift(rider)
    for (const step of room) this.sendAside(step.thing, step.spot)
    if (waits) {
      // The tap is answered in its frame by the rim and the hole's growl. The pop, the thing's own sound, the sound of
      // what comes to sit on it, the scraps and the bystanders come with the thing, in the frame it comes up.
      rider.wait = 1
      rider.y = -(KIND[kind].height + 0.3)
      this.cues.push({ type: 'growl', kind })
    } else this.cameUp(0)
    this.changed(true)
  }

  /** The rider at `index` is up out of the mouth: it is heard, and it and the thing that now sits on it sit as they sit from this frame. */
  private cameUp(index: number): void {
    const rider = this.riders[index]
    rider.wait = 0
    rider.since = 0
    // What rode at the bottom is on top of something from now on.
    if (index + 1 < this.riders.length) this.riders[index + 1].since = 0
    if (rider.kind === 'hat') this.cues.push({ type: 'over', cause: 'wail' })
    this.cues.push(...rider.held.splice(0))
    // What plays on a stack plays soon after it has grown: the next bob is heard half a second on.
    if (this.riders.length - index > 1) this.beat = Math.max(this.beat, 1 - 0.5 / bobSeconds(this.load))
  }

  /**
   * A stack on the breath hangs over more street than the mouth is wide. Every thing that stands in the room of
   * `column`, the stack as it is about to be, takes one quick step out of it, in its own walk, to the nearest
   * clear place. This is the list of those steps, empty when nothing has to move. It is null when the stack
   * cannot have its room: a thing has no place to step to, or a thing that is hopping down or walking has its way
   * there. `belly` is what the hole will hold, and `gap` how near the stack a thing may stand and stay.
   */
  private roomFor(column: Standing, belly: readonly Kind[], gap = GAP): { thing: Thing; spot: { x: number; z: number } }[] | null {
    // What rides already stays where it hangs while the things step.
    const rode: Standing | null = this.riders.length > 0 ? { parts: this.riders.map((rider) => rider.kind), x: this.anchorX, z: this.anchorZ } : null
    const hole = { x: this.x, z: this.z, mouth: Math.max(this.mouth, this.wants) }
    const now = new Map<Thing, Standing>(this.things.map((thing) => [thing, { parts: thing.parts, x: thing.x, z: thing.z }]))
    const steps: { thing: Thing; spot: { x: number; z: number } }[] = []
    for (const thing of this.things) {
      if (thing.away || thing.coming) continue
      const room = (widthOf(thing.parts) + widthOf(column.parts)) / 2 + gap - 1e-9
      const waits = this.turns.includes(thing)
      if (thing.hop < 1 || (thing.walk !== null && !waits)) {
        // It is on its way: the stack has its room only where the rest of that way is clear of it.
        const way = wayOf(thing)
        for (let at = 1; at < way.length; at++) if (nearestOnWay(way[at - 1].x, way[at - 1].z, way[at].x, way[at].z, column.x, column.z) < room) return null
        continue
      }
      // One that stands where the stack will hang steps out; one that was about to step there steps elsewhere.
      if (Math.hypot(thing.x - column.x, thing.z - column.z) >= room) continue
      // A thing the mouth cannot take may keep its edge over the lip, as it does when the hole stops at its foot.
      const bite = takes(belly, thing.parts) ? 0 : BITE
      const spot = aside({ parts: thing.parts, x: thing.sx, z: thing.sz }, column, [...now.values()].filter((other) => other !== now.get(thing)), hole, rode, bite)
      if (!spot) return null
      now.set(thing, { parts: thing.parts, ...spot })
      steps.push({ thing, spot })
    }
    return steps
  }

  /** One quick step, in its own walk, to `spot`, when its turn comes; the save holds it there from this moment. */
  private sendAside(thing: Thing, spot: { x: number; z: number }): void {
    thing.walk = { fromX: thing.sx, fromZ: thing.sz, steps: 1, seconds: ASIDE_SECONDS, phase: 0, heard: 0, lift: 0, aside: true, over: 0 }
    // Its turn comes after every thing whose step was settled before its own; one that waits already keeps its turn.
    if (!this.turns.includes(thing)) this.turns.push(thing)
    thing.x = spot.x
    thing.z = spot.z
    thing.onRim = false
    thing.rim = 0
    this.changed(true)
  }

  /**
   * Where the hole comes to rest when it is sent to (x, z): there, inside the street, unless that is under a
   * thing too wide for its mouth. It cannot rest under such a thing: it stops at the thing's foot with only its
   * lip under the edge (`BITE`), on the side it came from, and never on the far side, where the thing would hide it.
   */
  private berth(x: number, z: number): { x: number; z: number } {
    const mouth = this.wants, reach = Math.max(0, mouth / 2 - 0.25)
    const at = clampHole(x, z, mouth)
    const need = (thing: Thing): number => (footOf(thing.parts) + mouth) / 2 - BITE
    /** The thing too wide for the mouth that a hole resting at (px, pz) would be under by more than its lip, other than `but`. */
    const over = (px: number, pz: number, but: Thing | null): Thing | null => {
      for (const thing of this.things) {
        if (thing === but || thing.away || thing.coming || thing.hop < 1 || thing.walk || takes(this.belly, thing.parts)) continue
        if (Math.hypot(px - thing.x, pz - thing.z) < need(thing) - NEAR) return thing
      }
      return null
    }
    const thing = over(at.x, at.z, null)
    if (!thing) return at
    // The side it stops on: the one it was sent to, or, sent to the thing's very middle as a tap on it sends it, the one it comes from.
    let dx = at.x - thing.x, dz = at.z - thing.z
    if (Math.hypot(dx, dz) < 0.05) { dx = this.x - thing.x; dz = this.z - thing.z }
    if (Math.hypot(dx, dz) < 0.05) { dx = 0; dz = 1 }
    const far = need(thing), toward = Math.atan2(dz, dx)
    // A side the child can see, as far as the near kerb leaves room for one.
    const low = Math.min(SEEN_SIDE, (STREET.z1 - reach - thing.z) / far)
    // Round the thing from that side, the nearest place where the hole lies inside the street and under nothing else it cannot take.
    for (const seen of [true, false]) {
      for (let turn = 0; turn <= 48; turn++) {
        const angle = toward + (turn % 2 === 0 ? 1 : -1) * Math.ceil(turn / 2) * (Math.PI / 24)
        if (seen && Math.sin(angle) < low - 1e-6) continue
        const px = thing.x + Math.cos(angle) * far, pz = thing.z + Math.sin(angle) * far, kept = clampHole(px, pz, mouth)
        if (Math.hypot(kept.x - px, kept.z - pz) > 1e-6 || over(px, pz, thing)) continue
        return { x: px, z: pz }
      }
    }
    return at
  }

  /** The mouth takes hold of the foot of a thing too wide for it. */
  private tug(thing: Thing): void {
    this.strain = 1
    this.tugging = true
    this.tugged = thing.parts[0]
    this.cues.push({ type: 'strain', kind: thing.parts[0] })
  }

  /**
   * How far a thing may come out past its own foot without touching anything: half the gap to the nearest other
   * thing or to the stack on the breath, less a little. With `ahead`, only what stands the way of the hole counts.
   */
  room(thing: Thing, ahead = false): number {
    return this.roomAt(thing.sx, thing.sz, widthOf(thing.parts), thing, ahead ? thing.dirX : 0, ahead ? thing.dirZ : 0)
  }

  private roomAt(x: number, z: number, width: number, self: Thing | null, dirX: number, dirZ: number): number {
    let gap = Infinity
    const count = (ox: number, oz: number, wide: number): void => {
      const dx = ox - x, dz = oz - z
      // The way of the hole: whatever the thing would meet if it fell its whole length that way.
      if ((dirX !== 0 || dirZ !== 0) && (dx * dirX + dz * dirZ <= 0 || Math.abs(dx * dirZ - dz * dirX) >= (wide + width) / 2)) return
      gap = Math.min(gap, Math.hypot(dx, dz) - (wide + width) / 2)
    }
    for (const other of this.things) if (other !== self && !other.away) count(other.sx, other.sz, widthOf(other.parts))
    if (this.riders.length > 0) count(this.anchorX, this.anchorZ, widthOf(this.riders.map((rider) => rider.kind)))
    // The bystanders, the gate and the crowd stand round the street: a thing has all the room up to them, and none past it.
    const walls = [x - width / 2 - ROUND.x0, ROUND.x1 - x - width / 2, z - width / 2 - ROUND.z0, ROUND.z1 - z - width / 2]
    const faces = [dirX < 0, dirX > 0, dirZ < 0, dirZ > 0]
    walls.forEach((wall, side) => { if ((dirX === 0 && dirZ === 0) || faces[side]) gap = Math.min(gap, wall * 2) })
    return gap / 2 - ELBOW
  }

  /** Nothing on the street is hopping down, walking or waiting to: a stack is let down onto a street that stands still. */
  private quiet(): boolean {
    return this.turns.length === 0 && !this.things.some((thing) => !thing.away && !thing.coming && (thing.hop < 1 || thing.walk !== null))
  }

  /** The hole has slipped out from under the riding stack: it drops beside the hole, walks a few steps and stands as one thing. */
  private letDown(): void {
    const parts = this.riders.map((rider) => rider.kind)
    this.riders.length = 0
    this.changed(true)
    // What the stack played on the breath it plays no longer: its hum and its notes still to come are not heard.
    this.cues.push({ type: 'over', cause: 'breath' })
    if (this.things.length === 0 && this.belly.length === 0) {
      // The stack holds the whole street: the float goes out. The street stays bare.
      this.cues.push({ type: 'float', parts, x: this.anchorX, z: this.anchorZ })
      return
    }
    const hole = { x: this.x, z: this.z, mouth: Math.max(this.mouth, this.wants) }
    const down = setDown(parts, { x: this.anchorX, z: this.anchorZ }, this.x - this.anchorX, this.z - this.anchorZ, this.things, hole)
    const thing = thingOf({ parts, x: down.spot.x, z: down.spot.z })
    // On a street with no place where it covers nothing, what it hides steps out from behind it, one thing after the other.
    const hangs: Standing = { parts, x: this.anchorX, z: this.anchorZ }
    for (const hidden of down.hides) {
      const other = hidden as Thing
      const spot = stepOut(other, thing, this.things.filter((one) => one !== other), hole, hangs)
      if (spot) this.sendAside(other, spot)
      else this.crowded += 1
    }
    // The stack hangs where it rode while they step, and comes down when its turn comes.
    this.turns.push(thing)
    thing.air = HOVER
    thing.fromX = thing.sx = this.anchorX
    thing.fromZ = thing.sz = this.anchorZ
    thing.hop = 0
    thing.since = 0
    const bottom = parts[0], long = Math.hypot(down.spot.x - down.drop.x, down.spot.z - down.drop.z)
    if (long > 0.02 || isMarch(parts) || isBounce(parts)) {
      let steps = Math.max(1, Math.ceil(long / STRIDE[bottom])), seconds = steps * STEP_SECONDS[bottom], lift = 0
      // A whole march is eight steps, however short the way; and two balloons take it in one long bounce.
      if (isMarch(parts)) { steps = MARCH_STEPS; seconds = MARCH_STEPS * 0.3 }
      if (isBounce(parts)) { steps = 1; seconds = BOUNCE_SECONDS; lift = 2.2 }
      thing.walk = { fromX: down.drop.x, fromZ: down.drop.z, steps, seconds, phase: 0, heard: 0, lift, aside: false, over: 0 }
    }
    this.things.push(thing)
  }

  /** The next street: every thing is on its spot in the save from this moment, and comes in from the gate as the scene shows it. */
  comeIn(street: readonly Standing[]): void {
    this.things.length = 0
    this.turns.length = 0
    for (const standing of street) {
      const thing = thingOf(standing)
      thing.away = true
      thing.coming = true
      this.things.push(thing)
    }
    this.changed(true)
  }

  private changed(urgent: boolean): void {
    this.dirty = true
    if (urgent) this.urgent = true
  }

  private settleRiders(): void {
    const parts = this.riders.map((rider) => rider.kind)
    this.riders.forEach((rider, index) => { rider.y = HOVER + seatOf(parts, index); rider.v = 0 })
  }

  /** One step of play, in seconds. */
  step(dt: number): void {
    if (dt <= 0) return
    this.time += dt
    this.moveHole(dt)
    this.springs(dt)
    // The mouth tugs for as long as it moves at the foot of a thing too wide for it, and lets go a moment after it rests.
    if (!this.tugging) this.strain = 0
    else if (this.speed < 0.5) this.strain = Math.max(0, this.strain - dt / STRAIN_SECONDS)
    else this.strain = 1
    this.tugging = false
    // The lip lets go, and is heard to, in the frame it does.
    if (this.strain <= 0 && this.tugged) {
      this.cues.push({ type: 'loose', kind: this.tugged })
      this.tugged = null
    }
    if (this.riders.length > 0 && Math.hypot(this.x - this.anchorX, this.z - this.anchorZ) > LET_DOWN && this.quiet()) this.letDown()
    for (let index = this.things.length - 1; index >= 0; index--) this.stepThing(this.things[index], index, dt)
    for (let index = this.falling.length - 1; index >= 0; index--) {
      const fall = this.falling[index]
      fall.t += dt / fall.seconds
      if (fall.t >= 1) this.falling.splice(index, 1)
    }
    this.stepRiders(dt)
  }

  private moveHole(dt: number): void {
    // The mouth may have widened near a kerb, and it cannot rest under a thing too wide for it: where it is going is worked out afresh.
    const to = this.berth(this.toX, this.toZ)
    const dx = to.x - this.x, dz = to.z - this.z, far = Math.hypot(dx, dz)
    // With a thing down in its mouth that waits to come up, the hole stays where it is: it goes when the thing is up.
    const busy = this.riders.some((rider) => rider.wait > 0)
    const step = busy || far <= NEAR ? 0 : Math.min(far, Math.min(TOP_SPEED, far * HOMING) * dt)
    if (step > 0) {
      this.x += (dx / far) * step
      this.z += (dz / far) * step
      this.headingX = dx / far
      this.headingZ = dz / far
      this.changed(false)
    }
    if (far <= NEAR) {
      // Within a millimetre it is there, and lies exactly where it was sent.
      if (far > 0) { this.x = to.x; this.z = to.z; this.changed(false) }
      this.parking = false
    }
    this.speed = step / dt
    // The frame the finger landed in is drawn with the rim's whole reach: it eases back from the frame after.
    if (this.called) this.called = false
    else this.lurch = Math.max(0, this.lurch - dt * 5)
    if (this.belly.includes('drummer')) {
      this.crossed += step
      if (this.crossed >= BEAT_STRETCH) {
        this.crossed -= BEAT_STRETCH
        this.cues.push({ type: 'muffled', tuba: this.belly.includes('tuba') })
      }
    }
  }

  private springs(dt: number): void {
    // The mouth widens with a little overshoot, like something swallowing.
    this.mouthV += ((this.wants - this.mouth) * 120 - this.mouthV * 13) * dt
    this.mouth += this.mouthV * dt
    this.gulpV += (-this.gulp * 260 - this.gulpV * 12) * dt
    this.gulp += this.gulpV * dt
    this.pucker += ((this.held ? 1 : 0) - this.pucker) * Math.min(1, dt * 18)
  }

  private stepThing(thing: Thing, index: number, dt: number): void {
    thing.poked += dt
    thing.squash = Math.max(0, thing.squash - dt * 4)
    if (thing.away || thing.coming) return
    thing.rattled += dt
    thing.since += dt
    if (this.turns.includes(thing)) {
      // It waits where it is until every thing before it has set off and nothing that is still going crosses its way.
      if (this.turns[0] !== thing || this.things.some((other) => other !== thing && !other.away && !other.coming && !this.turns.includes(other) && (other.hop < 1 || other.walk !== null) && waysApart(wayOf(thing), wayOf(other)) < (widthOf(thing.parts) + widthOf(other.parts)) / 2)) return
      this.turns.shift()
      this.setOff(thing)
    }
    if (thing.air > 0 || thing.hop < 1) {
      // On its way down from the breath: it hops over to where it drops and thumps down.
      const toX = thing.walk ? thing.walk.fromX : thing.x, toZ = thing.walk ? thing.walk.fromZ : thing.z
      thing.hop = Math.min(1, thing.hop + dt / (thing.over > 0 ? OVER_SECONDS : HOP_SECONDS))
      const eased = thing.hop * thing.hop * (3 - 2 * thing.hop), across = vault(thing.hop)
      const gone = thing.over > 0 ? across.gone : eased
      thing.sx = thing.fromX + (toX - thing.fromX) * gone
      thing.sz = thing.fromZ + (toZ - thing.fromZ) * gone
      // Over what stands in its way: up from where it hangs, across, and down.
      if (thing.over > 0) thing.air = thing.hop < 0.5 ? HOVER + (thing.over - HOVER) * across.high : thing.over * across.high
      else thing.air = HOVER * (1 - thing.hop * thing.hop)
      if (thing.hop >= 1) {
        thing.air = 0
        thing.over = 0
        thing.squash = 1
        // The thump, the whistle and whatever the stack plays as it goes come with the landing, however long it hung.
        this.cues.push({ type: 'setdown', parts: thing.parts, x: thing.sx, z: thing.sz })
        if (isMarch(thing.parts)) this.cues.push({ type: 'secret', which: 'march' })
        if (isBounce(thing.parts)) this.cues.push({ type: 'secret', which: 'bounce' })
      }
      return
    }
    const foot = footOf(thing.parts), radius = this.mouth / 2
    if (thing.walk) {
      // A few steps in its bottom thing's walk, to where it stands: the save has held it there since it dropped, and it walks on whatever the hole does.
      const walk = thing.walk
      {
        walk.phase = Math.min(walk.steps, walk.phase + (dt / walk.seconds) * walk.steps)
        thing.gait = walk.phase
        const across = vault(walk.phase)
        const gone = walk.over > 0 ? across.gone : strode(thing.parts[0], walk.phase, walk.steps)
        if (walk.over > 0) thing.leap = walk.over * across.high
        thing.sx = walk.fromX + (thing.x - walk.fromX) * gone
        thing.sz = walk.fromZ + (thing.z - walk.fromZ) * gone
        const far = Math.hypot(thing.x - walk.fromX, thing.z - walk.fromZ)
        if (far > 0.05) { thing.dirX = (thing.x - walk.fromX) / far; thing.dirZ = (thing.z - walk.fromZ) / far }
        // Each step is heard as it begins; one that leaves the street (a hop, a bounce, a leap over another) as it lands.
        const lands = walk.over > 0 || walk.lift > 0 || airborne(thing.parts[0])
        while (walk.heard < walk.steps && walk.heard + (lands ? 1 : 0) <= walk.phase) {
          this.cues.push({ type: 'step', parts: thing.parts, step: walk.heard, x: thing.sx, z: thing.sz })
          walk.heard += 1
        }
        if (walk.phase >= walk.steps) {
          thing.sx = thing.x
          thing.sz = thing.z
          thing.walk = null
          if (walk.over > 0) thing.leap = 0
          thing.squash = Math.max(thing.squash, walk.over > 0 ? 1 : 0.5)
        }
        return
      }
    }
    thing.sx = thing.x
    thing.sz = thing.z
    const dx = this.x - thing.x, dz = this.z - thing.z, far = Math.hypot(dx, dz)
    if (far > 0.05) { thing.dirX = dx / far; thing.dirZ = dz / far }
    const reach = radius + foot / 2 - far
    if (reach <= 0) {
      // Clear of the hole: it stands up again.
      thing.onRim = false
      thing.rim = 0
      thing.lean += (0 - thing.lean) * Math.min(1, dt * 10)
      thing.amp = Math.max(0, thing.amp - dt * 3)
      return
    }
    // A stack goes in whole, bottom first, when the mouth is wider than its bottom thing; when it is not, it teeters like any thing too wide.
    const fits = takes(this.belly, thing.parts)
    if (fits && far <= radius - foot * OVER) {
      // Nothing tips in under a stack that rides: the stack is let down first, and the thing goes in when it is out of the way.
      if (this.riders.length > 0 && this.quiet()) this.letDown()
      if (this.riders.length === 0 && !this.things.some((other) => other.hop < 1 && Math.hypot(other.sx - this.x, other.sz - this.z) < (this.mouth + widthOf(other.parts)) / 2 + GAP)) {
        this.swallow(thing, index)
        return
      }
    }
    const bottom = thing.parts[0]
    if (!thing.onRim) {
      // The rim has just come under it: the wobble starts at once.
      thing.onRim = true
      thing.amp = Math.max(thing.amp, 0.8)
      thing.phase = 0
      thing.rattled = 0
      this.cues.push({ type: 'teeter', kind: bottom })
      if (!fits) this.tug(thing)
    }
    if (!fits) {
      this.tugging = true
      this.strainX = -thing.dirX
      this.strainZ = -thing.dirZ
    }
    thing.rim += dt
    thing.lean += (Math.min(1, reach / foot) - thing.lean) * Math.min(1, dt * 12)
    // The wobble lives on the hole's movement and on its tugging, and dies away when the hole rests: the scene settles when the child stops.
    const lively = Math.max(Math.min(1, this.speed * 0.3), fits ? 0 : 0.55 * this.strain)
    thing.amp += (lively - thing.amp) * Math.min(1, dt * (lively > thing.amp ? 8 : 1.6))
    const before = thing.phase
    thing.phase += dt * TEETER_HZ[bottom] * hurry(bottom, thing.rim) * Math.PI * 2
    if (thing.amp > 0.3 && thing.rattled >= RATTLE_EVERY / hurry(bottom, thing.rim) && Math.floor(thing.phase / (Math.PI * 2)) > Math.floor(before / (Math.PI * 2))) {
      thing.rattled = 0
      this.cues.push({ type: 'teeter', kind: bottom })
    }
  }

  /**
   * A thing's turn has come: it looks at the way it is about to go, to where it steps or to where it drops. On a
   * clear way it goes as it always does. With something in the way, a thing that stands or the stack on the breath,
   * it goes over the tallest of it.
   */
  private setOff(thing: Thing): void {
    const hops = thing.hop < 1
    const toX = hops && thing.walk ? thing.walk.fromX : thing.x, toZ = hops && thing.walk ? thing.walk.fromZ : thing.z
    const width = widthOf(thing.parts)
    let high = 0
    const count = (x: number, z: number, wide: number, top: number): void => {
      if (nearestOnWay(thing.sx, thing.sz, toX, toZ, x, z) < (wide + width) / 2) high = Math.max(high, top)
    }
    for (const other of this.things) if (other !== thing && !other.away && !other.coming) count(other.sx, other.sz, widthOf(other.parts), other.air + other.leap + tallOf(other.parts))
    // Of the stack on the breath, what hangs there now: a thing waiting down in the mouth is under the street.
    const rides = this.riders.filter((rider) => rider.wait <= 0).map((rider) => rider.kind)
    if (rides.length > 0) count(this.anchorX, this.anchorZ, widthOf(rides), HOVER + tallOf(this.riders.map((rider) => rider.kind)))
    if (high <= 0) return
    // A hop it had begun before it was made to wait goes on as it began.
    if (hops) { if (thing.hop === 0) thing.over = high + CLEAR }
    else if (thing.walk) { thing.walk.over = high + CLEAR; thing.walk.seconds = OVER_SECONDS }
  }

  private swallow(thing: Thing, index: number): void {
    this.things.splice(index, 1)
    if (this.turns.includes(thing)) this.turns.splice(this.turns.indexOf(thing), 1)
    // In the order the parts stand, bottom first: the top of the stack is the next out.
    const belly = swallowed(this.belly, thing.parts)
    this.belly.length = 0
    this.belly.push(...belly)
    const bottom = thing.parts[0]
    this.falling.push({ parts: thing.parts, x: thing.x, z: thing.z, t: 0, seconds: FALL_SECONDS[bottom], dirX: thing.dirX, dirZ: thing.dirZ, round: this.roomAt(thing.x, thing.z, widthOf(thing.parts), null, 0, 0), ahead: this.roomAt(thing.x, thing.z, widthOf(thing.parts), null, thing.dirX, thing.dirZ) })
    this.gulpV += 5 + 2 * KIND[bottom].width
    for (const kind of thing.parts) this.cues.push({ type: 'drop', kind })
    this.changed(true)
  }

  private stepRiders(dt: number): void {
    if (this.riders.length === 0) return
    // What waits down in the mouth comes up when the last thing has stepped out of its way: the first that waited first.
    if (!this.things.some((thing) => thing.walk !== null && thing.walk.aside)) {
      for (let index = this.riders.length - 1; index >= 0; index--) if (this.riders[index].wait > 0) this.cameUp(index)
    }
    // What hangs there sits as the stack it is now: a thing still down in the mouth pushes nothing up yet.
    const down = this.riders.filter((rider) => rider.wait > 0).length, parts = this.riders.slice(down).map((rider) => rider.kind)
    this.riders.forEach((rider, index) => {
      rider.since += dt
      rider.poked += dt
      if (index < down) return
      const to = HOVER + seatOf(parts, index - down)
      rider.v += ((to - rider.y) * 180 - rider.v * 16) * dt
      rider.y += rider.v * dt
    })
    // Each bob of a stack is heard, by whatever on it plays.
    this.beat += dt / bobSeconds(this.load)
    if (this.beat >= 1) {
      this.beat -= 1
      if (parts.length > 1) this.cues.push({ type: 'bob', parts })
    }
  }

  /** What hangs on the breath, from the bottom up: the riders that are up out of the mouth. */
  get riding(): Rider[] {
    return this.riders.filter((rider) => rider.wait <= 0)
  }

  /** The summed width of what rides on the breath: a heavy stack bobs slowly. */
  get load(): number {
    let load = 0
    for (const rider of this.riders) load += KIND[rider.kind].width
    return load
  }

  /** How far through its bob the riding stack is, as an angle: it rises and falls on this, and its notes and sticks come with it. */
  get bob(): number {
    return this.beat * Math.PI * 2
  }

  /** Where the riding stack hangs. */
  get anchor(): { x: number; z: number } {
    return { x: this.anchorX, z: this.anchorZ }
  }

  /** The nearest standing thing the mouth would take now, or null. The idle hole laps toward it. */
  nearestThatFits(): Thing | null {
    let best: Thing | null = null, nearest = Infinity
    for (const thing of this.things) {
      if (thing.coming || thing.air > 0 || thing.walk || !takes(this.belly, thing.parts)) continue
      const far = Math.hypot(thing.x - this.x, thing.z - this.z)
      if (far < nearest) { nearest = far; best = thing }
    }
    return best
  }

  /** Nothing stands on the street, nothing is in the hole and nothing rides: the float has gone out. */
  get bare(): boolean {
    return this.things.length === 0 && this.belly.length === 0 && this.riders.length === 0
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** How near the straight way from (ax, az) to (bx, bz) comes to (px, pz). */
/** The way a thing still has to go, as the places it passes: from where it is, by where it drops, to where it will stand. */
function wayOf(thing: Thing): { x: number; z: number }[] {
  const way = [{ x: thing.sx, z: thing.sz }]
  if (thing.hop < 1 && thing.walk) way.push({ x: thing.walk.fromX, z: thing.walk.fromZ })
  way.push({ x: thing.x, z: thing.z })
  return way
}

/** How near two such ways come to each other. */
function waysApart(a: readonly { x: number; z: number }[], b: readonly { x: number; z: number }[]): number {
  let least = Infinity
  const side = (p: { x: number; z: number }, q: { x: number; z: number }, r: { x: number; z: number }): number => Math.sign((q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x))
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      const a0 = a[i - 1], a1 = a[i], b0 = b[j - 1], b1 = b[j]
      if (side(a0, a1, b0) * side(a0, a1, b1) < 0 && side(b0, b1, a0) * side(b0, b1, a1) < 0) return 0
      least = Math.min(least, nearestOnWay(a0.x, a0.z, a1.x, a1.z, b0.x, b0.z), nearestOnWay(a0.x, a0.z, a1.x, a1.z, b1.x, b1.z), nearestOnWay(b0.x, b0.z, b1.x, b1.z, a0.x, a0.z), nearestOnWay(b0.x, b0.z, b1.x, b1.z, a1.x, a1.z))
    }
  }
  return least
}

function nearestOnWay(ax: number, az: number, bx: number, bz: number, px: number, pz: number): number {
  const wx = bx - ax, wz = bz - az, long = wx * wx + wz * wz
  const t = long > 1e-9 ? Math.max(0, Math.min(1, ((px - ax) * wx + (pz - az) * wz) / long)) : 0
  return Math.hypot(ax + wx * t - px, az + wz * t - pz)
}
