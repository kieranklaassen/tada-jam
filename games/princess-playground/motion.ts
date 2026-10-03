import { drop, inCompany, placeOf, tap, weightOn, type Arrangement } from './arrangement'
import { PERSONALITY } from './personality'
import { nudge, stepPlank, type PlankState } from './plank'
import type { Frame, FriendPose, Poses } from './pose'
import { restPose } from './pose'
import { restingAt, restTilt } from './rest'
import { ENDS, FRIEND_IDS, FRIENDS, MAX_TILT, PLANK, TRAY, otherEnd, type End, type FriendId } from './world'

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
/** How hard a landing turns the plank, per unit of weight. */
export const LANDING_PUSH = 0.5

export type PlayEvent =
  | { type: 'touch'; id: FriendId }
  | { type: 'leap'; id: FriendId }
  | { type: 'land'; id: FriendId; on: 'plank' | 'sand' | 'friend'; x: number; z: number; speed: number }
  | { type: 'knock'; end: End; speed: number; x: number }
  | { type: 'toss'; id: FriendId; speed: number }
  | { type: 'creak'; strength: number }
  | { type: 'level' }
  | { type: 'lift'; id: FriendId }
  | { type: 'slide'; id: FriendId }
  | { type: 'poke'; x: number; z: number }
  | { type: 'groove'; x0: number; z0: number; x1: number; z1: number }

type Mode = 'rest' | 'hop' | 'air' | 'held'

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
  time = 0
  private carry = 0
  private wasLevel = false
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
        bright: 1, doze: 0, phase: index * 1.7, turn: 0,
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

  /** The finger lets go: the friend comes down where it hangs. */
  release(): void {
    const id = this.held
    if (!id) return
    this.held = null
    const body = this.bodies[id]
    const result = drop(this.arrangement, id, body.x, body.z)
    this.arrangement = result.arrangement
    this.hop(id, true, result.slid)
  }

  /** A tap on the plank, `along` it from the stone: it rocks, and whoever is on it bobs. */
  tapPlank(along: number): void {
    const side = along >= 0 ? 1 : -1
    nudge(this.plank, side * 1.7)
    this.events.push({ type: 'creak', strength: 0.6 })
    for (const id of FRIEND_IDS) if (this.bodies[id].landed && this.bodies[id].mode === 'rest') this.bodies[id].squashV += 2.2
  }

  pokeSand(x: number, z: number): void {
    this.events.push({ type: 'poke', x, z })
  }

  dragSand(x0: number, z0: number, x1: number, z1: number): void {
    this.events.push({ type: 'groove', x0, z0, x1, z1 })
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
    return Math.sign(this.landedOn('right') - this.landedOn('left')) * MAX_TILT
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
    body.fromX = body.x; body.fromY = body.y; body.fromZ = body.z
    body.mode = 'hop'
    body.landed = false
    body.hopT = 0
    body.leapt = false
    body.slid = slid
    // A friend already in the air, or let go by the finger, does not gather itself first.
    body.gather = inAir || fall ? 0 : own.gather
    body.hopFor = fall ? (slid ? 0.5 : 0.24) : spec.hopSeconds
    body.hopHigh = fall ? (slid ? 0.05 : 0.1) : spec.hopHeight
    if (slid) this.events.push({ type: 'slide', id })
  }

  private step(dt: number): void {
    this.time += dt
    const knock = stepPlank(this.plank, this.landedOn('left'), this.landedOn('right'), dt)
    if (knock) this.knocked(knock.end, knock.speed)
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
      if (throwSpeed < TOSS_FLOOR) {
        body.squashV += throwSpeed * 1.2
        continue
      }
      body.mode = 'air'
      body.vy = throwSpeed
      body.squashV += 5
      body.mouth = 1
      this.events.push({ type: 'toss', id, speed: throwSpeed })
    }
    for (const id of this.arrangement[end]) if (this.bodies[id].mode === 'rest') this.bodies[id].squashV -= speed * 1.4
  }

  private move(id: FriendId, dt: number): void {
    const body = this.bodies[id], own = PERSONALITY[id]
    const target = restingAt(this.arrangement, id, this.plank.tilt)
    if (body.mode === 'held') {
      const pull = 1 - Math.exp(-dt * 16)
      const dx = (body.holdX - body.x) * pull
      body.x += dx
      body.z += (body.holdZ - body.z) * pull
      body.y += (HOLD_HEIGHT - body.y) * (1 - Math.exp(-dt * 11))
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
      body.squashTo = 1 + Math.min(0.22, Math.abs(body.vy) * 0.012)
      if (body.y <= target.y && body.vy <= 0) this.land(id, target, -body.vy)
      return
    }
    // A hop: gather, leap, arc, land.
    body.hopT += dt
    if (body.hopT < body.gather) {
      body.squashTo = own.crouch
      body.leanTo = own.windUp * Math.sin((body.hopT / body.gather) * Math.PI * 4)
      return
    }
    if (!body.leapt) {
      body.leapt = true
      body.squashV += 6
      if (body.hopHigh > 0.5) this.events.push({ type: 'leap', id })
    }
    const s = Math.min(1, (body.hopT - body.gather) / body.hopFor)
    body.x = body.fromX + (target.x - body.fromX) * s
    body.z = body.fromZ + (target.z - body.fromZ) * s
    body.y = body.fromY + (target.y - body.fromY) * s + 4 * body.hopHigh * s * (1 - s)
    body.squashTo = 1.12
    body.turn = Math.max(-0.5, Math.min(0.5, (target.x - body.fromX) * 0.12)) * (1 - s)
    if (s >= 1) {
      // The speed it comes down with: the arc's own, plus the drop.
      const down = (4 * body.hopHigh + Math.max(0, body.fromY - target.y)) / body.hopFor
      this.land(id, target, down)
    }
  }

  private land(id: FriendId, target: { x: number; y: number; z: number }, speed: number): void {
    const body = this.bodies[id], own = PERSONALITY[id], spec = FRIENDS[id]
    const place = placeOf(this.arrangement, id)
    const firstTouch = !body.landed
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
      this.events.push({ type: 'land', id, on: 'sand', x: target.x, z: target.z, speed })
      return
    }
    body.landed = true
    const side = place.end === 'right' ? 1 : -1
    const before = Math.sign(this.plank.tilt)
    nudge(this.plank, side * spec.weight * LANDING_PUSH * (firstTouch ? 1 : 0.35) * (0.5 + 0.5 * hard))
    this.events.push({ type: 'land', id, on: place.level > 0 ? 'friend' : 'plank', x: target.x, z: target.z, speed })
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
      const floor = below.y + FRIENDS[stack[level - 1]].halfHeight * 2 * 0.9 * below.squash
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
    body.squash = Math.max(0.35, Math.min(1.6, body.squash + body.squashV * dt))
    const leanPull = 140 * (body.leanTo - body.lean) - 12 * body.leanV
    body.leanV += leanPull * dt
    body.lean += body.leanV * dt
    // The lagging part is dragged by the body's own lean and squash, and swings on after they stop.
    const drive = body.lean * 1.5 + (body.squash - 1) * 0.8 + body.turn
    body.followV += (own.followStiff * (drive * own.followReach - body.follow) - own.followDamp * body.followV) * dt
    body.follow += body.followV * dt
    body.mouth = Math.max(0, body.mouth - dt * 2.2)
    body.phase += dt * own.breatheRate * Math.PI * 2
    body.blinkIn -= dt
    if (body.blinkIn <= 0) {
      body.blinkT = own.blinkLasts
      body.blinkIn = own.blinkEvery * (0.6 + 0.8 * this.random())
    }
    body.blinkT = Math.max(0, body.blinkT - dt)
    if (id === 'dot') {
      const warm = body.mode === 'held' || inCompany(this.arrangement) ? 1 : 0
      body.bright += Math.max(-dt * 0.9, Math.min(dt * 3, warm - body.bright))
    }
    if (id === 'bo') {
      const alone = body.landed && body.mode === 'rest' && this.arrangement.left.length + this.arrangement.right.length === 1
      body.doze += Math.max(-dt * 6, Math.min(dt * 0.8, (alone ? 1 : 0) - body.doze))
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
      pose.turn = body.turn
      const heavyLids = id === 'bo' ? 0.28 + 0.72 * body.doze : 0
      pose.lids = Math.max(body.blinkT > 0 ? 1 : 0, heavyLids)
      pose.gazeX = 0
      pose.gazeY = body.mode === 'air' || body.mode === 'held' ? 0.6 : 0
      pose.bright = id === 'dot' ? body.bright : 1
      pose.mouth = body.mouth
      pose.follow = body.follow
    }
    this.out.tilt = this.plank.tilt
    this.out.glow = glow
    this.out.glowOn = glowOn
    return this.out
  }
}
