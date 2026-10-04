import { aimedAtPlank, drop, inCompany, placeOf, tap, weightOn, type Arrangement } from './arrangement'
import { PERSONALITY } from './personality'
import { nudge, stepPlank, type PlankState } from './plank'
import type { Frame, FriendPose, Poses } from './pose'
import { restPose } from './pose'
import { NESTLE, restingAt, restTilt } from './rest'
import { ENDS, FRIEND_IDS, FRIENDS, MAX_TILT, PLANK, TRAY, lowTilt, otherEnd, plankTopAt, type End, type FriendId } from './world'

// The playground in motion: the plank, and each friend hopping, riding, being
// tossed, carried and set down. Pure, on game time alone, stepped at a fixed
// rate, with one seeded stream nothing else draws from. What happened in a
// step comes out as events, which the Mount turns into sound and sand.

export const STEP = 1 / 120
export const GRAVITY = 26
/** How high above the sand a carried friend hangs. */
export const HOLD_HEIGHT = 2.6
/** How much of the plank's speed at a knock goes into whoever sits on the end that came up. */
export const TOSS = 1.25
/** A throw slower than this is a bob, not a toss: the friend stays seated. */
export const TOSS_FLOOR = 6
/** An end that comes down at least this fast throws whoever rides the other one, Bo included; slower, they only bob. Radians a second. */
export const KNOCK_TOSS = 1.2
/** How long a tap on the plank has its riders off the board, in seconds; they rise a finger's width. */
export const RIDER_BOB = 0.32
/** How long a friend let go over the middle takes to drop, slide down the board and climb onto the low end. */
const SLIDE_SECONDS = 1.0
/** The spring a squashed friend pops back with when Bo leaves its head. */
const POP = 4.5
/** A chuckle's shake of the plank: how many pushes, and the seconds between them. */
const SHAKES = 4
const SHAKE_EVERY = 0.18
/** How far a friend turns toward what it looks at, at the furthest look, and how far it tips back to look up: radians. */
export const LOOK_TURN = 0.45
export const LOOK_NOD = 0.12
/** How far Dot stands turned away when it is apart, in radians: half away, the face still in sight. */
export const HALF_AWAY = 0.85
/** A finger's width, in tray units. */
export const FINGER = 0.14
/** How flat a head is pressed by a friend sitting on it. */
export const PRESSED = 0.93
/** How flat Mog goes in the air when the plank throws him: flat and long. */
export const MOG_FLAT = 0.72
/** How flat anyone is squashed for as long as Bo sits on top of them. */
export const FLAT = 0.7
/** How hard a landing turns the plank, per unit of weight. */
export const LANDING_PUSH = 0.5

export type PlayEvent =
  | { type: 'touch'; id: FriendId }
  | { type: 'leap'; id: FriendId }
  | { type: 'land'; id: FriendId; on: 'plank' | 'sand' | 'friend'; x: number; z: number; speed: number; thrown: boolean }
  | { type: 'knock'; end: End; speed: number; x: number }
  | { type: 'toss'; id: FriendId; speed: number }
  | { type: 'creak'; strength: number }
  /** An end that lay in the sand has lifted out of it. */
  | { type: 'rise'; end: End; x: number }
  | { type: 'level' }
  | { type: 'lift'; id: FriendId }
  | { type: 'slide'; id: FriendId }
  | { type: 'poke'; x: number; z: number }
  | { type: 'groove'; x0: number; z0: number; x1: number; z1: number }

type Mode = 'rest' | 'hop' | 'air' | 'held'

/** A small thing a friend does with its body where it sits or stands. Each lasts a moment and changes no place. */
export type Act = 'spin' | 'stamp' | 'kick' | 'tall' | 'knead' | 'sway' | 'sink' | 'duck' | 'lean' | 'chuckle' | 'bounce' | 'look' | 'slip' | 'shake' | 'puff' | 'toss' | 'greet' | 'dig'

export type Mood = 'glad' | 'put-out' | 'plain'

type Body = {
  x: number; y: number; z: number
  mode: Mode
  /** Its weight is on the plank. */
  landed: boolean
  fromX: number; fromY: number; fromZ: number
  hopT: number; hopFor: number; hopHigh: number; gather: number
  slid: boolean
  leapt: boolean
  vy: number
  squash: number; squashV: number; squashTo: number
  lean: number; leanV: number; leanTo: number
  follow: number; followV: number
  holdX: number; holdZ: number
  blinkIn: number; blinkT: number
  mouth: number
  bright: number
  doze: number
  phase: number
  turn: number
  /** Dot only: how far it stands turned half away, 0 to 1. */
  aside: number
  /** How flat it is held by whoever sits on it: 1 with nobody there, `PRESSED` under a friend, `FLAT` under Bo. */
  press: number
  /** A place it has gone to for a showing, away from where the arrangement has it; null when it is where it belongs. */
  away: { x: number; y: number; z: number } | null
  act: Act | null
  actT: number
  actFor: number
  actWay: number
  mood: Mood
  /** Where it looks, -1 left to 1 right; eased. */
  gaze: number
  gazeTo: number
  /** How far its eyes are raised, -1 to 1; eased. */
  gazeUp: number
  gazeUpTo: number
  /** Seconds left of looking at the finger that touched it. */
  glance: number
  /** It was thrown by the plank and has not landed yet. */
  thrown: boolean
}

/** A small seeded stream (mulberry32): the only randomness in the game, and it only picks ordinary detail. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Playground {
  arrangement: Arrangement
  readonly plank: PlankState
  readonly bodies: Record<FriendId, Body>
  /** What happened since the Mount last took them. */
  events: PlayEvent[] = []
  held: FriendId | null = null
  /** The friend who wants to go somewhere, and which way: it stretches and turns its face there for as long as it wants it. */
  asking: { id: FriendId; side: number; up: number } | null = null
  /** A chuckle shaking the plank: pushes still to come, seconds to the next, and how hard. */
  private shakes = 0
  private shakeIn = 0
  private shakeBy = 0
  time = 0
  private carry = 0
  private wasLevel = false
  /** The plank is rocking under a finger's tap, which throws nobody: until it lies still again, or a friend comes or goes. */
  private tapRock = false
  /** The end that lies in the sand, to tell when it lifts. */
  private downEnd: End | null = null
  private readonly random: () => number
  private readonly poses: Poses
  private readonly out: Frame

  constructor(arrangement: Arrangement, seed = 1) {
    this.arrangement = arrangement
    this.random = seeded(seed)
    this.plank = { tilt: restTilt(arrangement), spin: 0 }
    this.bodies = {} as Record<FriendId, Body>
    this.poses = {} as Poses
    FRIEND_IDS.forEach((id, index) => {
      const at = restingAt(arrangement, id, this.plank.tilt)
      this.bodies[id] = {
        ...at, mode: 'rest', landed: placeOf(arrangement, id).at === 'end',
        fromX: at.x, fromY: at.y, fromZ: at.z, hopT: 0, hopFor: 0, hopHigh: 0, gather: 0, slid: false, leapt: false, vy: 0,
        squash: 1, squashV: 0, squashTo: 1, lean: 0, leanV: 0, leanTo: 0, follow: 0, followV: 0,
        holdX: at.x, holdZ: at.z, blinkIn: 0.6 + index * 0.9 + this.random() * 2, blinkT: 0, mouth: 0,
        bright: 1, doze: 0, phase: index * 1.7, turn: 0, aside: 0, press: 1,
        away: null, act: null, actT: 0, actFor: 0, actWay: 0, mood: 'plain', gaze: 0, gazeTo: 0, gazeUp: 0, gazeUpTo: 0, glance: 0, thrown: false,
      }
      this.poses[id] = restPose()
    })
    this.out = { tilt: this.plank.tilt, poses: this.poses, glow: 0, glowOn: null }
    this.bodies.dot.bright = inCompany(arrangement) ? 1 : 0
    this.wasLevel = this.isLevel()
  }

  /** Advances game time by `dt` seconds in fixed steps. The first call of a load passes 0 and plays no time. */
  advance(dt: number): void {
    this.carry += dt
    while (this.carry >= STEP) {
      this.carry -= STEP
      this.step(STEP)
    }
  }

  /** The finger landed on a friend: it answers at once, whatever it is doing. */
  touch(id: FriendId): void {
    const body = this.bodies[id]
    body.squashV -= 5.5
    body.mouth = 1
    // It looks at the finger: out of the tray and up, at whoever touched it.
    body.glance = 0.5
    this.events.push({ type: 'touch', id })
  }

  /** A tap: onto the end on its side, or off it again. A tap in mid-hop turns it round. */
  tapFriend(id: FriendId): void {
    if (placeOf(this.arrangement, id).at === 'waiting') return
    this.arrangement = tap(this.arrangement, id)
    this.hop(id, false)
  }

  grab(id: FriendId): void {
    if (this.held && this.held !== id) this.release()
    const body = this.bodies[id]
    this.held = id
    body.mode = 'held'
    body.landed = false
    body.holdX = body.x
    body.holdZ = body.z
    body.squashV += 4
    this.events.push({ type: 'lift', id })
  }

  /** The finger moves with a friend in hand: (x, z) over the tray. */
  carryTo(x: number, z: number): void {
    if (!this.held) return
    const body = this.bodies[this.held]
    body.holdX = Math.max(-TRAY.halfWidth + 0.4, Math.min(TRAY.halfWidth - 0.4, x))
    body.holdZ = Math.max(-TRAY.halfDepth + 0.3, Math.min(TRAY.halfDepth - 0.5, z))
  }

  /**
   * The finger lets go: the friend comes down where it hangs. `aim` is where the finger is over the tray at the height
   * of a friend sitting on the plank: when the child holds the friend on the plank's picture, it lands on the plank
   * there, although it hangs over the sand in front of it.
   */
  release(aim: { x: number; z: number } | null = null): void {
    const id = this.held
    if (!id) return
    this.held = null
    const body = this.bodies[id]
    const result = aimedAtPlank(aim) ? drop(this.arrangement, id, aim!.x, PLANK.z) : drop(this.arrangement, id, body.x, body.z)
    this.arrangement = result.arrangement
    this.hop(id, true, result.slid)
  }

  /** The game is put away with a friend in the hand: it goes back to where it was picked up from. Nobody is moved. */
  putBack(): void {
    const id = this.held
    if (!id) return
    this.held = null
    this.hop(id, true)
  }

  /** A tap on the plank, `along` it from the stone: it rocks, and whoever is on it bobs. */
  tapPlank(along: number): void {
    const side = along >= 0 ? 1 : -1
    nudge(this.plank, side * 1.7)
    this.tapRock = true
    this.events.push({ type: 'creak', strength: 0.6 })
    // Its riders are tossed a finger's width and come down again.
    for (const id of FRIEND_IDS) {
      const body = this.bodies[id]
      if (!body.landed || body.mode !== 'rest') continue
      body.squashV += 2.2
      if (placeOf(this.arrangement, id).at === 'end') this.act(id, 'toss', RIDER_BOB)
    }
  }

  pokeSand(x: number, z: number): void {
    this.events.push({ type: 'poke', x, z })
  }

  dragSand(x0: number, z0: number, x1: number, z1: number): void {
    this.events.push({ type: 'groove', x0, z0, x1, z1 })
  }

  /** A friend does a small thing with its body, for `seconds`. `way` is -1 or 1 where the act has a side. */
  act(id: FriendId, act: Act, seconds: number, way = 0): void {
    const body = this.bodies[id]
    body.act = act
    body.actT = 0
    body.actFor = seconds
    body.actWay = way
  }

  /** A slow blink: the eyes shut for `seconds`. */
  blink(id: FriendId, seconds: number): void {
    this.bodies[id].blinkT = seconds
  }

  setMood(id: FriendId, mood: Mood): void {
    this.bodies[id].mood = mood
  }

  /** Where a friend looks: `side` -1 left to 1 right, `up` -1 down to 1 up. It eases there. */
  look(id: FriendId, side: number, up: number): void {
    this.bodies[id].gazeTo = side
    this.bodies[id].gazeUpTo = up
  }

  /** For a showing: a friend hops to a place of the showing's own, and stays there until it is sent home. */
  visit(id: FriendId, point: { x: number; y: number; z: number }): void {
    this.bodies[id].away = point
    this.hop(id, false)
  }

  /** For a showing: a friend stands at a place of the showing's own from the start, with no hop. */
  standAt(id: FriendId, point: { x: number; y: number; z: number }): void {
    const body = this.bodies[id]
    body.away = point
    body.mode = 'rest'
    body.landed = false
    body.x = point.x; body.y = point.y; body.z = point.z
  }

  /** Back to where the arrangement has it, by a hop. */
  goHome(id: FriendId): void {
    if (!this.bodies[id].away) return
    this.bodies[id].away = null
    this.hop(id, false)
  }

  /** The arrangement changed under everyone at once (a new ride is laid out): whoever is not where it now belongs hops there. */
  relayout(arrangement: Arrangement): void {
    if (this.held) this.release()
    const before = this.arrangement
    this.arrangement = arrangement
    for (const id of FRIEND_IDS) {
      const was = placeOf(before, id), now = placeOf(arrangement, id), body = this.bodies[id]
      // A friend who stays on its end and only comes down a place, because the one below left, does not hop: it drops.
      const same = !body.away && body.mode === 'rest' && was.at === now.at && (was.at !== 'end' || (now.at === 'end' && was.end === now.end)) && (was.at !== 'sand' || (now.at === 'sand' && was.spot.x === now.spot.x && was.spot.z === now.spot.z))
      body.away = null
      if (!same) this.hop(id, false)
    }
  }

  /** Everything at rest, at once, as an arrangement has it: how a load finds the world, and how a touch ends a showing. */
  settleTo(arrangement: Arrangement): void {
    this.held = null
    this.arrangement = arrangement
    this.plank.tilt = restTilt(arrangement)
    this.plank.spin = 0
    for (const id of FRIEND_IDS) {
      const body = this.bodies[id], at = restingAt(arrangement, id, this.plank.tilt)
      body.away = null
      body.mode = 'rest'
      body.landed = placeOf(arrangement, id).at === 'end'
      body.x = at.x; body.y = at.y; body.z = at.z
      body.vy = 0
      body.squash = 1; body.squashV = 0; body.squashTo = 1
      body.lean = 0; body.leanV = 0; body.leanTo = 0
      body.turn = 0
      body.act = null
    }
    this.wasLevel = this.isLevel()
  }

  /** A second playground in exactly this one's state, to be played ahead of it: what a scene will do to the sand is read from the twin before the scene starts. */
  fork(): Playground {
    const twin = new Playground(this.arrangement, 1)
    twin.plank.tilt = this.plank.tilt
    twin.plank.spin = this.plank.spin
    for (const id of FRIEND_IDS) {
      const from = this.bodies[id]
      Object.assign(twin.bodies[id], from, { away: from.away ? { ...from.away } : null })
    }
    twin.held = null
    twin.time = this.time
    twin.carry = this.carry
    twin.wasLevel = this.wasLevel
    twin.tapRock = this.tapRock
    twin.downEnd = this.downEnd
    twin.shakes = this.shakes
    twin.shakeIn = this.shakeIn
    twin.shakeBy = this.shakeBy
    return twin
  }

  /** The plank has come to lie where the weights on it leave it, or nearly, and is no longer swinging hard. */
  get plankArrived(): boolean {
    // Everyone the arrangement has on the plank must have landed on it, or the plank has not yet been asked.
    for (const end of ENDS) for (const id of this.arrangement[end]) if (!this.bodies[id].landed) return false
    const target = this.restingTilt()
    return Math.abs(this.plank.tilt - target) < 0.06 && Math.abs(this.plank.spin) < 1.2
  }

  /** A push on the plank from the game: a rock in the ending scene. Positive turns the right end down. */
  rock(spin: number): void {
    nudge(this.plank, spin)
  }

  /** A chuckle is shaking the plank. */
  get shaking(): boolean {
    return this.shakes > 0
  }

  /** Shakes the plank as a chuckle does: four short pushes, one way and the other. */
  shake(strength: number): void {
    this.shakes = SHAKES
    this.shakeIn = 0
    this.shakeBy = strength
  }

  takeEvents(): PlayEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  /** True when nothing is in the air or in the hand and the plank lies still. */
  get settled(): boolean {
    if (this.held) return false
    for (const id of FRIEND_IDS) if (this.bodies[id].mode !== 'rest') return false
    return Math.abs(this.plank.spin) < 0.02 && Math.abs(this.plank.tilt - this.restingTilt()) < 0.01
  }

  private restingTilt(): number {
    const left = this.landedOn('left'), right = this.landedOn('right')
    return Math.sign(right - left) * lowTilt(Math.max(left, right))
  }

  private landedOn(end: End): number {
    let sum = 0
    for (const id of this.arrangement[end]) if (this.bodies[id].landed) sum += FRIENDS[id].weight
    return sum
  }

  private isLevel(): boolean {
    const left = weightOn(this.arrangement, 'left')
    return left > 0 && left === weightOn(this.arrangement, 'right')
  }

  /** Sends a friend from where it is to where the arrangement now has it. */
  private hop(id: FriendId, fall: boolean, slid = false): void {
    const body = this.bodies[id], spec = FRIENDS[id], own = PERSONALITY[id]
    const inAir = body.mode !== 'rest'
    // A friend leaving the plank leaves at once: the plank swings the moment its weight is gone, and must not swing through it.
    const offPlank = body.landed
    body.fromX = body.x; body.fromY = body.y; body.fromZ = body.z
    // A friend coming or going is no finger's tap: what the plank knocks down after it throws.
    this.tapRock = false
    body.mode = 'hop'
    body.landed = false
    body.hopT = 0
    body.leapt = false
    body.slid = slid
    // A friend already in the air, or let go by the finger, does not gather itself first.
    body.gather = inAir || fall || offPlank ? 0 : own.gather
    // Let go from the hand it comes down to its place: straight down where it hangs over it, and in a small arc over
    // whatever stands between when its place is a step to the side.
    const target = restingAt(this.arrangement, id, this.plank.tilt)
    const aside = Math.hypot(target.x - body.x, target.z - body.z)
    body.hopFor = fall ? (slid ? SLIDE_SECONDS : 0.24 + Math.min(0.3, aside * 0.1)) : spec.hopSeconds
    body.hopHigh = fall ? (slid ? 0.05 : Math.max(0.1, aside > 0.6 ? this.clearance(id) : 0)) : Math.max(spec.hopHeight, this.clearance(id))
    if (slid) this.events.push({ type: 'slide', id })
  }

  /** The top of whatever a friend's body would be over at (x, z): the plank, a friend standing or sitting there, or the sand at 0. */
  private heightUnder(id: FriendId, x: number, z: number): number {
    const radius = FRIENDS[id].radius
    let top = 0
    if (Math.abs(z - PLANK.z) < PLANK.halfWidth + radius * 0.9 && Math.abs(x) < PLANK.halfLength + radius * 0.9) {
      // The highest the board's top gets anywhere under the body.
      const clamp = (along: number) => Math.max(-PLANK.halfLength, Math.min(PLANK.halfLength, along))
      top = Math.max(plankTopAt(clamp(x - radius), this.plank.tilt), plankTopAt(clamp(x + radius), this.plank.tilt))
    }
    for (const other of FRIEND_IDS) {
      if (other === id) continue
      const there = this.bodies[other]
      // With a little over, for a head that is riding a squash a hair above where its body is; and a friend sitting on
      // the tilted board leans with it, so its head reaches further to the side the steeper the board lies.
      const tip = there.landed ? Math.abs(Math.sin(this.plank.tilt)) * FRIENDS[other].halfHeight * 2 : 0
      if (Math.hypot(there.x - x, there.z - z) < (radius + FRIENDS[other].radius) * 1.08 + tip) top = Math.max(top, there.y + FRIENDS[other].halfHeight * 2 * Math.max(1, there.squash) + 0.25)
    }
    return top
  }

  /**
   * How high a hop must arc so that the friend flies over whoever stands or
   * sits in its way, and over the plank: nobody hops through anybody. Friends
   * right beside where it starts or lands are not in the way.
   */
  private clearance(id: FriendId): number {
    const body = this.bodies[id], spec = FRIENDS[id]
    const target = body.away ?? restingAt(this.arrangement, id, this.plank.tilt)
    const dx = target.x - body.x, dz = target.z - body.z, length2 = dx * dx + dz * dz
    if (length2 < 0.01) return 0
    let need = 0
    const over = (x: number, z: number, top: number, reach: number) => {
      const s = ((x - body.x) * dx + (z - body.z) * dz) / length2
      if (s < 0.14 || s > 0.86) return
      const off = Math.hypot(body.x + dx * s - x, body.z + dz * s - z)
      if (off > reach) return
      const line = body.y + (target.y - body.y) * s
      need = Math.max(need, (top + 0.25 - line) / (4 * s * (1 - s)))
    }
    for (const other of FRIEND_IDS) {
      if (other === id) continue
      const there = this.bodies[other]
      over(there.x, there.z, there.y + FRIENDS[other].halfHeight * 2, (spec.radius + FRIENDS[other].radius) * 1.1)
    }
    // The plank, as three places along it, and the stone under its middle.
    for (const along of [-PLANK.seat, 0, PLANK.seat]) over(along, PLANK.z, plankTopAt(along, this.plank.tilt), spec.radius + PLANK.halfWidth)
    // Up onto a high seat, or down off one: the arc goes up and over the edge of the board, never through it.
    need = Math.max(need, (0.3 * Math.abs(target.y - body.y) + 0.35) / 0.84)
    return Math.min(4.5, need)
  }

  private step(dt: number): void {
    this.time += dt
    if (this.shakes > 0) {
      this.shakeIn -= dt
      if (this.shakeIn <= 0) {
        nudge(this.plank, (this.shakes % 2 ? -1 : 1) * this.shakeBy)
        this.shakes -= 1
        this.shakeIn = SHAKE_EVERY
      }
    }
    const knock = stepPlank(this.plank, this.landedOn('left'), this.landedOn('right'), dt)
    if (knock) this.knocked(knock.end, knock.speed)
    if (this.tapRock && Math.abs(this.plank.spin) < 0.02 && Math.abs(this.plank.tilt - this.restingTilt()) < 0.01) this.tapRock = false
    // An end that lay in the sand has lifted well out of it: grains slide back into the bite it leaves.
    const tilt = this.plank.tilt
    const down: End | null = Math.abs(tilt) >= MAX_TILT * 0.92 ? (tilt > 0 ? 'right' : 'left') : null
    if (this.downEnd && down !== this.downEnd && (down !== null || Math.abs(tilt) < MAX_TILT * 0.7)) {
      this.events.push({ type: 'rise', end: this.downEnd, x: (this.downEnd === 'left' ? -1 : 1) * PLANK.halfLength * Math.cos(MAX_TILT) })
      this.downEnd = null
    }
    if (down) this.downEnd = down
    const level = this.isLevel() && Math.abs(this.plank.tilt) < 0.05 && Math.abs(this.plank.spin) < 0.6
    if (level && !this.wasLevel) this.events.push({ type: 'level' })
    if (!this.isLevel()) this.wasLevel = false
    else if (level) this.wasLevel = true
    for (const id of FRIEND_IDS) this.move(id, dt)
    for (const end of ENDS) this.keepStack(end)
    for (const id of FRIEND_IDS) this.live(id, dt)
  }

  /** An end came down: sand flies there, and whoever sits on the other end is thrown. */
  private knocked(end: End, speed: number): void {
    this.events.push({ type: 'knock', end, speed, x: (end === 'left' ? -1 : 1) * PLANK.halfLength * Math.cos(MAX_TILT) })
    const up = otherEnd(end)
    for (const id of this.arrangement[up]) {
      const body = this.bodies[id]
      if (!body.landed || body.mode !== 'rest') continue
      const throwSpeed = speed * PLANK.seat * PERSONALITY[id].tossGain * TOSS
      // A knock from a finger's tap on the plank, or a soft one, only bobs them.
      if (speed < KNOCK_TOSS || this.tapRock) {
        body.squashV += Math.min(TOSS_FLOOR, throwSpeed) * 1.2
        continue
      }
      body.mode = 'air'
      body.thrown = true
      body.vy = throwSpeed
      body.squashV += 5
      body.mouth = 1
      this.events.push({ type: 'toss', id, speed: throwSpeed })
    }
    for (const id of this.arrangement[end]) if (this.bodies[id].mode === 'rest') this.bodies[id].squashV -= speed * 1.4
  }

  private move(id: FriendId, dt: number): void {
    const body = this.bodies[id], own = PERSONALITY[id]
    const target = body.away ?? restingAt(this.arrangement, id, this.plank.tilt)
    if (body.mode === 'held') {
      const pull = 1 - Math.exp(-dt * 16)
      let dx = (body.holdX - body.x) * pull, dz = (body.holdZ - body.z) * pull
      // It is carried over whatever is in the way, never through it: it rises first, and only then goes across.
      const ahead = this.heightUnder(id, body.x + dx, body.z + dz)
      if (body.y < ahead) {
        dx = 0
        dz = 0
      }
      body.x += dx
      body.z += dz
      const wanted = Math.max(HOLD_HEIGHT, ahead + 0.3, this.heightUnder(id, body.holdX, body.holdZ) + 0.3)
      body.y = Math.max(this.heightUnder(id, body.x, body.z), body.y + (wanted - body.y) * (1 - Math.exp(-dt * 16)))
      // It dangles: the body swings back against the way it is carried.
      body.leanTo = Math.max(-0.6, Math.min(0.6, (dx / dt) * 0.07))
      body.squashTo = own.heldStretch
      return
    }
    body.leanTo = 0
    if (body.mode === 'rest') {
      // Riding: it sits where its seat is. A seat that dropped away under it leaves it in the air.
      body.x = target.x
      body.z = target.z
      if (body.y > target.y + 0.03) {
        body.mode = 'air'
        body.vy = 0
      } else body.y = target.y
      body.squashTo = 1
      return
    }
    if (body.mode === 'air') {
      body.vy -= GRAVITY * dt
      body.y += body.vy * dt
      body.x = target.x
      body.z = target.z
      // In the air everyone stretches with their speed, but Mog thrown: he goes flat and long, and comes down the right way up.
      body.squashTo = id === 'mog' && body.thrown ? MOG_FLAT : 1 + Math.min(0.22, Math.abs(body.vy) * 0.012)
      if (body.y <= target.y && body.vy <= 0) this.land(id, target, -body.vy)
      return
    }
    // A hop: gather, leap, arc, land.
    body.hopT += dt
    if (body.hopT < body.gather) {
      body.squashTo = own.crouch
      // The wind-up is the body's own doing, not a spring's: Bo rocks right over to one side and the other, twice.
      body.lean = body.leanTo = own.windUp * Math.sin((body.hopT / body.gather) * Math.PI * 4)
      body.leanV = 0
      return
    }
    if (!body.leapt) {
      body.leapt = true
      body.squashV += 6
      if (body.hopHigh > 0.5) this.events.push({ type: 'leap', id })
    }
    // Landing on a friend who is in the air: it lands where that friend is, not where the seat would be.
    const place = body.away ? null : placeOf(this.arrangement, id)
    let underway = false
    if (place && place.at === 'end' && place.level > 0) {
      const underId = this.arrangement[place.end][place.level - 1], under = this.bodies[underId]
      if (under.mode !== 'held') target.y = Math.max(target.y, under.y + Math.cos(this.plank.tilt) * FRIENDS[underId].halfHeight * 2 * NESTLE * Math.max(1, under.squash))
      // The friend it will sit on is still on its own way there: it hangs over it and lands when that one has.
      underway = under.mode === 'hop'
    }
    const s = Math.min(underway ? 0.9 : 1, (body.hopT - body.gather) / body.hopFor)
    // It goes up before it goes across, and comes down from above: most of the way across is covered in the middle of the hop.
    const across = body.slid ? s : s * s * (3 - 2 * s)
    if (body.slid) this.slide(id, target, s)
    else {
      body.x = body.fromX + (target.x - body.fromX) * across
      body.z = body.fromZ + (target.z - body.fromZ) * across
      body.y = body.fromY + (target.y - body.fromY) * s + 4 * body.hopHigh * s * (1 - s)
    }
    // Coming down onto a friend, it is never below that friend's head once it is over it, wherever that head has got to.
    if (place && place.at === 'end' && place.level > 0) {
      const underId = this.arrangement[place.end][place.level - 1], under = this.bodies[underId]
      if (under.mode !== 'held' && Math.hypot(under.x - body.x, under.z - body.z) < (FRIENDS[id].radius + FRIENDS[underId].radius) * 1.1) {
        body.y = Math.max(body.y, under.y + FRIENDS[underId].halfHeight * 2 * Math.max(1, under.squash))
      }
    }
    // Over the board it is never below the board's top: a plank that swings up under a hopping friend carries it.
    if (Math.abs(body.z - PLANK.z) < PLANK.halfWidth && Math.abs(body.x) < PLANK.halfLength) body.y = Math.max(body.y, plankTopAt(body.x, this.plank.tilt))
    body.squashTo = 1.12
    body.turn = Math.max(-0.5, Math.min(0.5, (target.x - body.fromX) * 0.12)) * (1 - s)
    if (s >= 1) {
      // The speed it comes down with: the arc's own, plus the drop. A slide ends in a small hop.
      const down = body.slid ? 2.5 : (4 * body.hopHigh + Math.max(0, body.fromY - target.y)) / body.hopFor
      this.land(id, target, down)
    }
  }

  /**
   * Let go over the middle of the plank: it drops onto the board where it hangs, slides down the slope on the board
   * itself, and at the low end hops up the side of whoever sits there and onto the top. `s` runs from 0 to 1.
   */
  private slide(id: FriendId, target: { x: number; y: number; z: number }, s: number): void {
    const body = this.bodies[id], tilt = this.plank.tilt
    const board = (x: number) => plankTopAt(Math.max(-PLANK.halfLength, Math.min(PLANK.halfLength, x)), tilt)
    const place = placeOf(this.arrangement, id)
    // It stops beside the stack it will climb: clear of the widest friend in it, however that one is squashed.
    let reach = 0
    if (place.at === 'end') for (const other of this.arrangement[place.end].slice(0, place.level)) reach = Math.max(reach, FRIENDS[other].radius * 1.3 + FRIENDS[id].radius * 1.15)
    const way = Math.sign(target.x - body.fromX) || 1
    let stopX = target.x - way * reach
    if ((stopX - body.fromX) * way < 0) stopX = body.fromX
    const smooth = (u: number) => u * u * (3 - 2 * u)
    const DROP = 0.2, CLIMB = reach > 0 ? 0.7 : 1
    if (s < DROP) {
      const u = s / DROP
      body.x = body.fromX
      body.z = body.fromZ + (PLANK.z - body.fromZ) * smooth(u)
      body.y = Math.max(board(body.x), body.fromY + (board(body.x) - body.fromY) * u * u)
    } else if (s < CLIMB) {
      // Down the slope, gathering speed, sitting on the board all the way.
      const u = (s - DROP) / (CLIMB - DROP)
      body.x = body.fromX + (stopX - body.fromX) * u * u
      body.z = PLANK.z
      body.y = board(body.x)
    } else {
      // Up the side of the stack first, then across onto the top of it.
      const u = (s - CLIMB) / (1 - CLIMB), over = target.y + 0.3
      body.x = stopX + (target.x - stopX) * smooth(Math.max(0, (u - 0.5) / 0.5))
      body.z = PLANK.z + (target.z - PLANK.z) * u
      body.y = u < 0.55 ? board(stopX) + (over - board(stopX)) * smooth(u / 0.55) : over + (target.y - over) * smooth((u - 0.55) / 0.45)
    }
  }

  private land(id: FriendId, target: { x: number; y: number; z: number }, speed: number): void {
    const body = this.bodies[id], own = PERSONALITY[id], spec = FRIENDS[id]
    const place = placeOf(this.arrangement, id)
    const firstTouch = !body.landed
    // A friend landing on the plank is no finger's tap: what it knocks down throws.
    if (place.at === 'end' && firstTouch) this.tapRock = false
    if (body.away) {
      body.mode = 'rest'
      body.x = target.x; body.y = target.y; body.z = target.z
      body.vy = 0
      body.turn = 0
      body.squash = 1 - (1 - own.landSquash) * 0.6
      body.squashV = 0
      this.events.push({ type: 'land', id, on: target.y > 0.05 ? 'friend' : 'sand', x: target.x, z: target.z, speed, thrown: false })
      return
    }
    body.mode = 'rest'
    body.y = target.y
    body.x = target.x
    body.z = target.z
    body.vy = 0
    body.turn = 0
    const hard = Math.min(1, speed / 9)
    body.squash = 1 - (1 - own.landSquash) * (0.45 + 0.55 * hard)
    body.squashV = 0
    body.mouth = Math.max(body.mouth, hard)
    if (place.at !== 'end') {
      this.events.push({ type: 'land', id, on: 'sand', x: target.x, z: target.z, speed, thrown: false })
      return
    }
    body.landed = true
    // It landed on a friend who is in the air: it flies on with it.
    if (place.level > 0) {
      const under = this.bodies[this.arrangement[place.end][place.level - 1]]
      if (under.mode === 'air') {
        body.mode = 'air'
        body.vy = under.vy
      }
    }
    const side = place.end === 'right' ? 1 : -1
    const before = Math.sign(this.plank.tilt)
    nudge(this.plank, side * spec.weight * LANDING_PUSH * (firstTouch ? 1 : 0.35) * (0.5 + 0.5 * hard))
    this.events.push({ type: 'land', id, on: place.level > 0 ? 'friend' : 'plank', x: target.x, z: target.z, speed, thrown: body.thrown })
    body.thrown = false
    if (place.level > 0) {
      const below = this.bodies[this.arrangement[place.end][place.level - 1]]
      below.squash = Math.min(below.squash, 1 - 0.1 * spec.weight * (0.5 + 0.5 * hard))
      below.mouth = 1
    }
    // It landed on the high end and the plank will not tip: the plank only creaks.
    if (firstTouch && before === -side && Math.sign(this.restingTilt()) === before) this.events.push({ type: 'creak', strength: 1 })
  }

  /** Nobody sinks through the one below: a stack keeps its order while it flies. */
  private keepStack(end: End): void {
    const stack = this.arrangement[end]
    for (let level = 1; level < stack.length; level++) {
      const below = this.bodies[stack[level - 1]], body = this.bodies[stack[level]]
      if (body.mode === 'hop' || body.mode === 'held' || below.mode === 'hop' || below.mode === 'held') continue
      // Two at rest are kept together where they are drawn (`frame`): the one above rides the squash of the one below.
      if (body.mode === 'rest' && below.mode === 'rest') continue
      // The stack leans with the board, so a head is a little lower than its height above the seat below it.
      // A little over the head as it springs: a body's small acts (a chuckle, a breath) stretch it a hair past its spring.
      const floor = below.y + Math.cos(this.plank.tilt) * FRIENDS[stack[level - 1]].halfHeight * 2 * Math.max(NESTLE, below.squash * 1.1)
      if (body.y < floor) {
        body.y = floor
        if (below.mode === 'air' && body.vy < below.vy) {
          body.vy = below.vy
          body.mode = 'air'
        }
      }
    }
  }

  /** The small life of a body: its springs, its blink, its colour. */
  private live(id: FriendId, dt: number): void {
    const body = this.bodies[id], own = PERSONALITY[id]
    body.squashV += (own.springStiff * (body.squashTo - body.squash) - own.springDamp * body.squashV) * dt
    body.squash = Math.max(0.35, Math.min(1.3, body.squash + body.squashV * dt))
    const leanPull = 140 * (body.leanTo - body.lean) - 12 * body.leanV
    body.leanV += leanPull * dt
    body.lean += body.leanV * dt
    // The lagging part is dragged by the body's own lean and squash, and swings on after they stop.
    const drive = body.lean * 1.5 + (body.squash - 1) * 0.8 + body.turn
    body.followV += (own.followStiff * (drive * own.followReach - body.follow) - own.followDamp * body.followV) * dt
    body.follow += body.followV * dt
    body.mouth = Math.max(0, body.mouth - dt * 2.2)
    // Held down by whoever sits on it. Under Bo, once he has landed, it is squashed flat for as long as he stays,
    // and pops back the moment he leaves.
    const place = body.away ? null : placeOf(this.arrangement, id)
    let hold = 1
    if (place && place.at === 'end') {
      const above = this.arrangement[place.end].slice(place.level + 1)
      if (above.length) hold = above.includes('bo') && this.bodies.bo.mode === 'rest' && this.bodies.bo.landed ? FLAT : PRESSED
    }
    if (hold > body.press + 0.1) body.squashV += POP
    body.press = hold < body.press ? Math.max(hold, body.press - dt * 3) : hold
    if (body.act) {
      body.actT += dt
      if (body.actT >= body.actFor) body.act = null
    }
    body.glance = Math.max(0, body.glance - dt)
    body.gaze += ((body.glance > 0 ? 0 : body.gazeTo) - body.gaze) * (1 - Math.exp(-dt * (body.glance > 0 ? 24 : 7)))
    body.gazeUp += ((body.glance > 0 ? 1 : body.gazeUpTo) - body.gazeUp) * (1 - Math.exp(-dt * (body.glance > 0 ? 24 : 7)))
    body.phase += dt * own.breatheRate * Math.PI * 2
    body.blinkIn -= dt
    if (body.blinkIn <= 0) {
      body.blinkT = own.blinkLasts
      body.blinkIn = own.blinkEvery * (0.6 + 0.8 * this.random())
    }
    body.blinkT = Math.max(0, body.blinkT - dt)
    if (id === 'dot') {
      // Touched, it warms to full colour and stays warm as it goes; alone where it lands, it pales again.
      const warm = body.mode === 'held' || body.mode === 'hop' || body.glance > 0 || inCompany(this.arrangement) ? 1 : 0
      body.bright += Math.max(-dt * 0.9, Math.min(dt * 3, warm - body.bright))
      // Apart in the sand it stands turned half away; touched, carried or in company it turns back at once.
      const apart = !inCompany(this.arrangement) && body.mode === 'rest' && body.glance <= 0 && !body.away && placeOf(this.arrangement, 'dot').at === 'sand' ? 1 : 0
      body.aside += Math.max(-dt * 5, Math.min(dt * 1.2, apart - body.aside))
    }
    if (id === 'bo') {
      // Alone on the plank he dozes, unless he is the one who asks: then he is wide awake, looking up along the plank.
      const alone = body.landed && body.mode === 'rest' && this.arrangement.left.length + this.arrangement.right.length === 1 && this.asking?.id !== 'bo'
      body.doze += Math.max(-dt * 6, Math.min(dt * 0.8, (alone ? 1 : 0) - body.doze))
    }
  }

  /** Lays the act a body is in the middle of onto its pose. Every act begins and ends at nothing, so none leaves a mark. */
  private perform(body: Body, pose: FriendPose): void {
    const t = Math.min(1, body.actT / body.actFor), bell = Math.sin(t * Math.PI), fade = 1 - t
    switch (body.act) {
      case 'spin': pose.turn += Math.PI * 2 * (t * t * (3 - 2 * t)); break
      case 'stamp': pose.squash *= 1 - 0.2 * Math.abs(Math.sin(t * Math.PI * 3)); break
      case 'kick': pose.lean += 0.24 * Math.sin(t * Math.PI * 9) * fade; pose.y += 0.06 * Math.abs(Math.sin(t * Math.PI * 9)) * fade; break
      case 'tall': pose.squash *= 1 + 0.16 * bell; break
      case 'knead': pose.squash *= 1 - 0.14 * Math.abs(Math.sin(t * Math.PI * 2)); pose.lean += 0.07 * Math.sin(t * Math.PI * 4); break
      case 'sway': pose.lean += (body.actWay || 1) * 0.17 * Math.sin(t * Math.PI * 3) * (0.4 + 0.6 * fade); break
      case 'sink': pose.squash *= 1 - 0.12 * bell; pose.y -= 0.05 * bell; break
      case 'duck': pose.squash *= 1 - 0.32 * bell; break
      // Bo bearing down on the low end: he presses himself flat for a moment, and never goes lower than he sits.
      case 'dig': pose.squash *= 1 - 0.14 * bell; break
      case 'lean': pose.lean += body.actWay * 0.3 * bell; break
      case 'chuckle': pose.squash *= 1 + 0.06 * Math.sin(t * Math.PI * 14) * fade; break
      case 'bounce': pose.y += 0.4 * Math.abs(Math.sin(t * Math.PI * 2)) * (0.5 + 0.5 * fade); pose.squash *= 1 + 0.08 * Math.sin(t * Math.PI * 4); break
      case 'look': pose.nod += 0.2 * bell; break
      // The crown slips over one eye, stays a moment, and is shaken straight.
      case 'slip': pose.slip = t < 0.55 ? Math.min(1, t * 6) : Math.max(0, 1 - (t - 0.55) * 7); pose.follow = t < 0.55 ? 0.3 * Math.min(1, t * 6) : 0.3 * Math.cos((t - 0.55) * 28) * (1 - t) * 2.2; pose.lean += t < 0.55 ? 0 : 0.1 * Math.sin((t - 0.55) * 28) * (1 - t) * 2.2; break
      // Cheeks out: the body bulges sideways for a moment.
      case 'puff': pose.squash *= 1 - 0.14 * bell; break
      // Tossed a finger's width by a tap on the plank, and down again.
      case 'toss': pose.y += FINGER * bell; break
      // A greeting: it turns to the one who came, as far as `way` says, with a bounce, and turns back.
      case 'greet': pose.turn += body.actWay * Math.min(1, bell * 1.6); pose.y += 0.3 * Math.abs(Math.sin(t * Math.PI * 2)) * (0.5 + 0.5 * fade); pose.squash *= 1 + 0.08 * Math.sin(t * Math.PI * 4); break
      // Grains shaken off a head: a quick shiver.
      case 'shake': pose.lean += 0.12 * Math.sin(t * Math.PI * 10) * fade; break
    }
  }

  /** What the view draws now. The same object every frame. */
  frame(glow = 0, glowOn: FriendId | null = null): Frame {
    for (const id of FRIEND_IDS) {
      const body = this.bodies[id], own = PERSONALITY[id], pose: FriendPose = this.poses[id]
      const breathe = body.mode === 'rest' ? Math.sin(body.phase) * own.breatheDepth : 0
      pose.x = body.x
      pose.y = body.y
      pose.z = body.z
      pose.squash = body.squash * (1 + breathe)
      pose.lean = body.lean + (body.landed && body.mode === 'rest' ? this.plank.tilt : 0)
      pose.nod = body.mode === 'air' ? 0.25 : 0
      // Half away is away from the middle of the tray, so the face still shows from the child's side.
      // A look is with the whole body, not only the pupils: it turns toward what it looks at, and tips back to look up.
      pose.turn = body.turn + body.aside * HALF_AWAY * (body.x >= 0 ? 1 : -1) + body.gaze * LOOK_TURN * (1 - body.aside)
      const heavyLids = id === 'bo' ? 0.28 + 0.72 * body.doze : 0
      pose.lids = Math.max(body.blinkT > 0 ? 1 : 0, heavyLids, body.mood === 'put-out' && (id === 'pim' || id === 'mog') ? 0.32 : 0)
      pose.gazeX = body.gaze
      pose.gazeY = body.mode === 'air' || body.mode === 'held' ? 0.6 : body.gazeUp
      pose.bright = id === 'dot' ? body.bright : 1
      pose.mouth = Math.max(body.mouth, body.mood === 'glad' ? 0.25 : 0)
      // Only Pim and Mog pull a face: Dot goes pale and quiet, and Bo dozes.
      pose.frown = body.mood === 'put-out' && (id === 'pim' || id === 'mog') && body.mouth < 0.3 ? 1 : 0
      pose.follow = body.follow + (id === 'mog' && body.mood === 'put-out' ? -0.5 : 0)
      pose.slip = 0
      // Dot's speckles shimmer while it is glad, and lie still otherwise.
      pose.shimmer = id === 'dot' && body.mood === 'glad' ? Math.sin(body.phase * 6) : 0
      // A head with a friend on it, or one on its way there, is pressed: it gives a little under the weight, and Pim's
      // crown and Mog's ears are out of the way before the friend lands.
      const place = body.away ? null : placeOf(this.arrangement, id)
      pose.pressed = place && place.at === 'end' && place.level < this.arrangement[place.end].length - 1 ? 1 : 0
      if (!pose.pressed && body.mode === 'rest') pose.nod += Math.max(0, body.gazeUp) * LOOK_NOD
      // Touched, its eyes go wide at the finger for as long as the glance lasts.
      pose.wide = body.glance > 0 ? 1 : 0
      pose.squash *= body.press
      // The one who asks shows it with its whole body, not only its eyes: it stretches toward where it wants to be.
      if (this.asking && this.asking.id === id && body.mode === 'rest') {
        pose.nod += 0.34 * this.asking.up
        pose.lean += 0.09 * this.asking.side
        pose.squash *= 1 + 0.06 * this.asking.up
      }
      if (body.act) this.perform(body, pose)
    }
    // Whoever sits on a friend rides that friend's squash: pressed flat, it lets them down; popping back, it lifts them.
    for (const end of ENDS) {
      const stack = this.arrangement[end]
      for (let level = 1; level < stack.length; level++) {
        const body = this.bodies[stack[level]], below = this.bodies[stack[level - 1]]
        const under = this.poses[stack[level - 1]], pose = this.poses[stack[level]]
        if (body.mode === 'hop' || body.mode === 'held' || below.mode === 'hop' || below.mode === 'held') continue
        const rise = FRIENDS[stack[level - 1]].halfHeight * 2 * NESTLE * under.squash
        if (body.mode !== 'rest' || !body.landed || below.mode !== 'rest' || !below.landed) {
          // In the air together: never lower than the head below, however that head stretches or bobs.
          pose.y = Math.max(pose.y, under.y + Math.cos(under.lean) * rise)
          continue
        }
        // At rest it stands on the head below, wherever that head is: down when it is squashed, to the side when it leans.
        pose.x = under.x + Math.sin(under.lean) * rise
        pose.y = under.y + Math.cos(under.lean) * rise
      }
    }
    this.out.tilt = this.plank.tilt
    this.out.glow = glow
    this.out.glowOn = glowOn
    return this.out
  }
}
