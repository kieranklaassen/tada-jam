import { BODIES, type KindName } from './bodies'
import { clip, PERSONALITIES, rest, type ClipId } from './clips'
import { BALLOON, bunchOffsets, bunchReach, FRIEND_SCALE, friendX, GROUND, groundAt, HELD_HEIGHT, skySlots, WAITING_SCALE, waitingSpot, type View } from './layout'
import { KIND_COLOURS, PALETTE, shade } from './palette'
import { restPose, type Pose } from './pose'
import type { VoiceId } from './voices'
import { give, pop, type Bunch, type Given, type Troop } from './world'

// The theatre plays what the rules decide. A touch is answered here the
// moment it lands (a squash and a squeak), the rules say at the lift what the
// bunch does (taken, refused or got away), and the theatre then shows it: the
// swoop, the friend's own catch or refusal or lift-off, the pop. It holds no
// rule of its own and draws nothing itself: each frame it tells a painter
// where every friend, balloon, string and shadow is, and hands back the
// sounds to play. No three.js, no DOM and no clock: time is passed in, and its
// small variations come from its own seeded stream.

/** What the theatre draws on: the stage, or a recorder in a test. */
export type Painter = {
  place(name: string, kind: KindName, pose: Pose): void
  drop(name: string): void
  balloon(x: number, y: number, z: number, wide: number, tall: number, lean: number, colour: string): void
  string(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, colour: string, thick?: number): void
  shadow(x: number, y: number, z: number, wide: number, deep: number, colour: string): void
}

export type Sound = { voice: VoiceId; pitch: number; gain: number }

/** What a point of the surface is on. */
export type Hit = { on: 'held'; friend: number } | { on: 'bunch'; slot: number } | { on: 'friend'; friend: number } | { on: 'waiting' } | { on: 'air' }

type Place = { squash: number; squashSpeed: number; pressed: boolean; push: number; pushSpeed: number; away: number; grow: number }
type Flight = { bunch: Bunch; slot: number; given: Given; t: number; fromX: number; fromY: number; landed: boolean; after: number; friend: number }
type Held = { x: number; y: number; vx: number; vy: number; shown: boolean }
type Loose = { x: number; y: number; vx: number; vy: number; colour: string; flat: boolean; t: number; popAt: number }
type Scrap = { x: number; y: number; vx: number; vy: number; colour: string; life: number }
type Actor = { clip: ClipId | null; t: number; next: ClipId | null; tug: Bunch | null }

/** Seconds a bunch takes from the sky to the friend, and before a new one drifts into its place. */
export const FLIGHT = 0.5
export const REGROW_AFTER = 0.45
const GROW = 0.5
/** How long a pop's scraps and a flat balloon last. */
const SCRAP_LIFE = 0.5
/** What a frame may hold of each passing thing, so the most a child can set off at once still fits the stage's batches. */
const MAX_FLIGHTS = 4
const MAX_LOOSE = 9
const MAX_SCRAPS = 21

export class Theatre {
  troop: Troop
  readonly sky: Bunch[]
  readonly waiting: { kind: KindName; size: number }
  /** Sounds since the last time they were taken. */
  readonly sounds: Sound[] = []
  private time = 0
  private rng: number
  private readonly places: Place[]
  private readonly flights: Flight[] = []
  private readonly held: Held[]
  private readonly loose: Loose[] = []
  private readonly scraps: Scrap[] = []
  private readonly actors: Actor[]
  private readonly waitingActor: Actor = { clip: null, t: 0, next: null, tug: null }
  private pressedSlot = -1
  private readonly pose: Pose = restPose()
  private readonly hand = { x: 0, y: 0, z: 0 }

  constructor(troop: Troop, sky: readonly Bunch[], waiting: { kind: KindName; size: number }, seed = 0x9e3779b9) {
    this.troop = troop
    this.sky = [...sky]
    this.waiting = waiting
    this.rng = seed >>> 0 || 1
    this.places = this.sky.map(() => ({ squash: 0, squashSpeed: 0, pressed: false, push: 0, pushSpeed: 0, away: 0, grow: 1 }))
    this.held = troop.held.map((holds, i) => ({ x: friendX(i, troop.size) + 0.7, y: GROUND + HELD_HEIGHT, vx: 0, vy: 0, shown: holds }))
    this.actors = troop.held.map(() => ({ clip: null, t: 0, next: null, tug: null }))
  }

  /** The friend's feet. */
  private spot(friend: number): { x: number; y: number } {
    const x = friendX(friend, this.troop.size)
    return { x, y: groundAt(x, 0) }
  }

  private random(): number {
    let s = this.rng
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    this.rng = s >>> 0
    return this.rng / 2 ** 32
  }

  private sound(voice: VoiceId, pitch = 1, gain = 1): void {
    // Never quite the same twice: a few per cent either way.
    this.sounds.push({ voice, pitch: pitch * (0.95 + this.random() * 0.1), gain })
  }

  /** What is under a point of the friends' plane. Whatever looks touchable is, and is read a little larger than it is drawn. */
  hit(x: number, y: number, view: View): Hit {
    for (let i = 0; i < this.held.length; i++) {
      const balloon = this.held[i]
      if (balloon.shown && Math.hypot(x - balloon.x, (y - balloon.y) / 1.12) < BALLOON * 1.2) return { on: 'held', friend: i }
    }
    const slots = skySlots(this.sky.length, view)
    for (let slot = 0; slot < slots.length; slot++) {
      if (this.places[slot].away > 0) continue
      const reach = bunchReach(this.sky[slot].count)
      if (Math.abs(x - slots[slot].x) < reach.x + 0.3 && Math.abs(y - slots[slot].y) < reach.y + 0.3) return { on: 'bunch', slot }
    }
    const kind = this.troop.kind, plan = BODIES[kind]
    for (let i = 0; i < this.troop.size; i++) {
      const spot = this.spot(i), tall = plan.height * FRIEND_SCALE
      if (Math.abs(x - spot.x) < plan.halfWidth * FRIEND_SCALE && y > spot.y - 0.2 && y < spot.y + tall + 0.25) return { on: 'friend', friend: i }
    }
    const first = waitingSpot(0, view), far = view.distance / (view.distance - first.z)
    const waitingPlan = BODIES[this.waiting.kind], wide = waitingPlan.halfWidth * FRIEND_SCALE * WAITING_SCALE * far
    const footY = groundAt(first.x, first.z) * far
    if (x < first.x * far + wide + 0.35 && y > footY - 0.3 && y < footY + waitingPlan.height * FRIEND_SCALE * WAITING_SCALE * far + 0.35) return { on: 'waiting' }
    // A near miss still counts: a small finger aimed at a bunch and landed beside it.
    let nearest = -1, nearestGap = 0.9
    for (let slot = 0; slot < slots.length; slot++) {
      if (this.places[slot].away > 0) continue
      const reach = bunchReach(this.sky[slot].count)
      const gap = Math.hypot(Math.max(0, Math.abs(x - slots[slot].x) - reach.x), Math.max(0, Math.abs(y - slots[slot].y) - reach.y))
      if (gap < nearestGap) { nearest = slot; nearestGap = gap }
    }
    return nearest >= 0 ? { on: 'bunch', slot: nearest } : { on: 'air' }
  }

  /** The finger landed. Everything is answered here, in this frame: a squash and a squeak, a pop, a poke. */
  press(x: number, y: number, view: View): void {
    const hit = this.hit(x, y, view)
    this.pressedSlot = -1
    if (hit.on === 'bunch') {
      const place = this.places[hit.slot]
      place.pressed = true
      place.squashSpeed += 4
      this.pressedSlot = hit.slot
      // Its neighbours bob away from it.
      for (let slot = 0; slot < this.places.length; slot++) if (slot !== hit.slot) this.places[slot].pushSpeed += Math.sign(slot - hit.slot) * 2.2 / Math.abs(slot - hit.slot)
      // More balloons under the finger squeak lower.
      this.sound('squeak', 1.12 - this.sky[hit.slot].count * 0.1)
    } else if (hit.on === 'held') {
      this.popHeld(hit.friend)
    } else if (hit.on === 'friend') {
      this.act(hit.friend, 'poke')
      this.sound(`${this.troop.kind}Poke`)
    } else if (hit.on === 'waiting') {
      this.waitingActor.clip = 'wave'
      this.waitingActor.t = 0
      this.sound(`${this.waiting.kind}Poke`, 1.1, 0.7)
    } else {
      this.sound('boop')
      const slots = skySlots(this.sky.length, view)
      for (let slot = 0; slot < slots.length; slot++) this.places[slot].pushSpeed += Math.sign(slots[slot].x - x || 1) * 1.6 / (1 + Math.abs(slots[slot].x - x))
    }
  }

  /** The finger lifted or slid off: the bunch under it leaves the sky. A smeared tap counts as a tap. */
  release(view: View): void {
    const slot = this.pressedSlot
    this.pressedSlot = -1
    if (slot < 0) return
    const place = this.places[slot]
    place.pressed = false
    if (place.away > 0 || this.flights.length >= MAX_FLIGHTS) return
    const bunch = this.sky[slot]
    const { troop, given } = give(this.troop, bunch)
    this.troop = troop
    const at = skySlots(this.sky.length, view)[slot]
    // A bunch of another colour goes to a friend who is still without one, if there is one: it is the one looking for a balloon.
    const friend = given.result === 'taken' ? given.takers[0] : given.result === 'gotAway' ? given.grabber : this.refuser(at.x)
    this.flights.push({ bunch, slot, given, t: 0, fromX: at.x, fromY: at.y, landed: false, after: 0, friend })
    // The same bunch drifts back into the same place: the sky stays as it was.
    place.away = REGROW_AFTER
    place.grow = 0
    place.squash = 0
    place.squashSpeed = 0
    this.sound('letGo', 1.1 - bunch.count * 0.08)
    this.sound('whistle', 1, 0.8)
  }

  /** The press ended without a tap: the surface was parked or the browser took the finger. The bunch springs back and stays. */
  cancel(): void {
    if (this.pressedSlot >= 0) this.places[this.pressedSlot].pressed = false
    this.pressedSlot = -1
  }

  /** Who refuses a bunch that comes down from `x`: the nearest friend without a balloon, or the nearest of all when everyone has one. */
  private refuser(x: number): number {
    let best = -1
    for (const wanting of [true, false]) {
      for (let i = 0; i < this.troop.size; i++) {
        if (wanting && this.troop.held[i]) continue
        if (best < 0 || Math.abs(this.spot(i).x - x) < Math.abs(this.spot(best).x - x)) best = i
      }
      if (best >= 0) break
    }
    return best
  }

  private popHeld(friend: number): void {
    const { troop, popped } = pop(this.troop, friend)
    if (!popped) return
    this.troop = troop
    const balloon = this.held[friend]
    balloon.shown = false
    this.burst(balloon.x, balloon.y, KIND_COLOURS[troop.kind])
    this.act(friend, 'popped')
    this.sound(`${troop.kind}Startle`)
  }

  /** A pop: the snap, and scraps of the balloon's colour thrown out. */
  private burst(x: number, y: number, colour: string): void {
    this.sound('pop', 0.9 + this.random() * 0.25)
    // The oldest scraps make room: they were nearly gone.
    if (this.scraps.length > MAX_SCRAPS - 7) this.scraps.splice(0, this.scraps.length - (MAX_SCRAPS - 7))
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + this.random() * 0.6, speed = 3.2 + this.random() * 2.6
      this.scraps.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed + 1, colour, life: SCRAP_LIFE })
    }
  }

  /** Starts a friend's motion. One that is being carried off finishes that first. */
  private act(friend: number, id: ClipId): void {
    const actor = this.actors[friend]
    if (actor.clip === 'liftOff') {
      if (id !== 'poke') actor.next = id
      return
    }
    actor.clip = id
    actor.t = 0
  }

  /** Plays `dt` seconds. */
  step(dt: number): void {
    this.time += dt
    const kind = this.troop.kind, personality = PERSONALITIES[kind]

    for (const place of this.places) {
      // A pressed bunch is held flat; let go, it springs back past round and settles.
      const target = place.pressed ? 1 : 0
      place.squashSpeed += ((target - place.squash) * 420 - place.squashSpeed * 17) * dt
      place.squash += place.squashSpeed * dt
      place.pushSpeed += (-place.push * 30 - place.pushSpeed * 4.5) * dt
      place.push += place.pushSpeed * dt
      if (place.away > 0) {
        place.away -= dt
        if (place.away <= 0) { place.away = 0; this.sound('bloop', 0.9 + this.random() * 0.3, 0.6) }
      } else if (place.grow < 1) place.grow = Math.min(1, place.grow + dt / GROW)
    }

    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]
      flight.t += dt
      if (!flight.landed && flight.t >= FLIGHT) this.land(flight)
      if (flight.landed) {
        flight.after += dt
        if (this.settle(flight, personality.cue)) this.flights.splice(i, 1)
      } else if (flight.given.result === 'taken' && flight.t >= FLIGHT - personality.cue.grab) {
        // The friends who will take one start to meet it before it is there.
        for (const taker of flight.given.takers) if (this.actors[taker].clip !== 'catch') this.act(taker, 'catch')
      }
    }

    for (let i = 0; i < this.actors.length; i++) {
      const actor = this.actors[i]
      if (!actor.clip) continue
      const before = actor.t
      actor.t += dt
      if (actor.clip === 'liftOff') {
        const { letGo, land } = personality.cue
        if (before < letGo && actor.t >= letGo && actor.tug) {
          // It lets go: the whole bunch gets away, rising fast, and pops on its way.
          const spot = this.spot(i), top = spot.y + this.lift(kind, letGo) + HELD_HEIGHT + 0.5
          bunchOffsets(actor.tug.count).forEach((offset, k) => {
            this.loose.push({ x: spot.x + offset.x, y: top + offset.y, vx: (this.random() - 0.5) * 3, vy: 6 + this.random() * 2, colour: KIND_COLOURS[actor.tug!.colour], flat: false, t: 0, popAt: 0.32 + k * 0.09 })
          })
          actor.tug = null
        }
        if (before < land && actor.t >= land) this.sound('thud', kind === 'hippo' ? 0.8 : 1.25, kind === 'hippo' ? 1 : 0.7)
      }
      if (actor.t >= personality.lasts[actor.clip]) {
        actor.clip = actor.next
        actor.next = null
        actor.t = 0
      }
    }
    const waiting = this.waitingActor
    if (waiting.clip && (waiting.t += dt) >= PERSONALITIES[this.waiting.kind].lasts[waiting.clip]) waiting.clip = null

    // A held balloon is on a string: it follows the hand that holds it, late and bobbing.
    for (let i = 0; i < this.held.length; i++) {
      const balloon = this.held[i], spot = this.spot(i), actor = this.actors[i]
      const lifted = actor.clip === 'liftOff' ? this.lift(kind, actor.t) : 0
      const targetX = spot.x + 0.7 + Math.sin(this.time * 1.2 + i) * 0.1, targetY = spot.y + lifted + HELD_HEIGHT + Math.sin(this.time * 1.5 + i * 2) * 0.06
      balloon.vx += ((targetX - balloon.x) * 60 - balloon.vx * 6) * dt
      balloon.vy += ((targetY - balloon.y) * 60 - balloon.vy * 6) * dt
      balloon.x += balloon.vx * dt
      balloon.y += balloon.vy * dt
    }

    // More got away than the sky can show: the earliest pop now.
    for (let i = 0; i < this.loose.length - MAX_LOOSE; i++) this.loose[i].popAt = 0
    for (let i = this.loose.length - 1; i >= 0; i--) {
      const balloon = this.loose[i]
      balloon.t += dt
      if (balloon.flat) {
        // Going flat: it darts about wherever its neck points, slower and smaller.
        const turn = Math.sin(balloon.t * 23 + i) * 26 * dt
        const vx = balloon.vx * Math.cos(turn) - balloon.vy * Math.sin(turn), vy = balloon.vx * Math.sin(turn) + balloon.vy * Math.cos(turn)
        balloon.vx = vx * (1 - 0.9 * dt)
        balloon.vy = vy * (1 - 0.9 * dt) + 2.4 * dt
      } else balloon.vy += 7 * dt
      balloon.x += balloon.vx * dt
      balloon.y += balloon.vy * dt
      if (balloon.t >= balloon.popAt) {
        if (!balloon.flat) this.burst(balloon.x, balloon.y, balloon.colour)
        this.loose.splice(i, 1)
      }
    }
    for (let i = this.scraps.length - 1; i >= 0; i--) {
      const scrap = this.scraps[i]
      scrap.life -= dt
      scrap.vy -= 9 * dt
      scrap.x += scrap.vx * dt
      scrap.y += scrap.vy * dt
      if (scrap.life <= 0) this.scraps.splice(i, 1)
    }
  }

  /** How high a friend of this kind is off the ground this far into being carried off. */
  private lift(kind: KindName, t: number): number {
    const pose = this.pose
    Object.assign(pose, restPose())
    clip(kind, 'liftOff', t, BODIES[kind].height * FRIEND_SCALE, BODIES[kind].reach, pose)
    return pose.y
  }

  /** The bunch has reached the friend. */
  private land(flight: Flight): void {
    flight.landed = true
    const kind = this.troop.kind, given = flight.given
    if (given.result === 'taken') {
      given.takers.forEach((taker, k) => {
        const balloon = this.held[taker], spot = this.spot(taker)
        // It arrives above the hand that takes it and swings up onto its string.
        balloon.x = spot.x + 0.25
        balloon.y = spot.y + BODIES[kind].height * FRIEND_SCALE + 0.55
        balloon.vx = 2.2
        balloon.vy = 3.4
        balloon.shown = true
        this.sound(`${kind}Catch`, 1 + k * 0.06, k === 0 ? 1 : 0.7)
      })
    } else if (given.result === 'refused') {
      this.act(flight.friend, 'refuse')
      this.sound(`${kind}Refuse`)
    } else {
      const actor = this.actors[flight.friend]
      if (actor.clip !== 'liftOff') {
        actor.clip = 'liftOff'
        actor.t = 0
        actor.next = null
        actor.tug = flight.bunch
        this.sound('liftOff', kind === 'hippo' ? 0.6 : kind === 'frog' ? 0.85 : 1.1)
      } else {
        // Already in the air with one bunch: this one just gets away.
        bunchOffsets(flight.bunch.count).forEach((offset, k) => {
          const spot = this.spot(flight.friend)
          this.loose.push({ x: spot.x + offset.x, y: spot.y + HELD_HEIGHT + offset.y, vx: (this.random() - 0.5) * 4, vy: 5, colour: KIND_COLOURS[flight.bunch.colour], flat: false, t: 0, popAt: 0.3 + k * 0.09 })
        })
      }
    }
  }

  /** What a landed bunch does after it lands. True when there is nothing left of it to play. */
  private settle(flight: Flight, cue: { hit: number }): boolean {
    if (flight.given.result !== 'refused') return true
    if (flight.after < cue.hit) return false
    // The refusal lands on it: it pops, or with the hippo it is blown away going flat.
    const kind = this.troop.kind, colour = KIND_COLOURS[flight.bunch.colour]
    const beside = this.beside(flight.friend, flight.bunch.count)
    bunchOffsets(flight.bunch.count).forEach((offset, k) => {
      const x = beside.x + offset.x, y = beside.y + offset.y
      if (kind === 'hippo') this.loose.push({ x, y, vx: beside.side * (7 + k), vy: 3 + k, colour, flat: true, t: 0, popAt: 0.85 })
      else this.burst(x, y, colour)
    })
    if (kind === 'hippo') this.sound('raspberry')
    return true
  }

  /** Where a refused bunch hangs for a beat: beside the friend's body, on the side with more room, the two colours side by side. */
  private beside(friend: number, count: number): { x: number; y: number; side: number } {
    const spot = this.spot(friend), plan = BODIES[this.troop.kind]
    const side = friend < (this.troop.size - 1) / 2 ? -1 : 1
    // Near enough to touch the friend, never over its face: a bunch is wider than one balloon and hangs further out.
    return { x: spot.x + side * (plan.halfWidth * FRIEND_SCALE * 0.72 + bunchReach(count).x), y: spot.y + plan.height * FRIEND_SCALE * 0.62, side }
  }

  /** Where a flight is going. */
  private target(flight: Flight): { x: number; y: number } {
    if (flight.given.result === 'refused') return this.beside(flight.friend, flight.bunch.count)
    const spot = this.spot(flight.friend), tall = BODIES[this.troop.kind].height * FRIEND_SCALE
    if (flight.given.result === 'taken' && flight.given.takers.length > 1) {
      // One for each: the bunch comes down over the middle of those who take from it.
      const takers = flight.given.takers
      return { x: (this.spot(takers[0]).x + this.spot(takers[takers.length - 1]).x) / 2, y: spot.y + tall + 0.75 }
    }
    return { x: spot.x + 0.25, y: spot.y + tall + 0.55 }
  }

  /** Tells the painter where everything is now. */
  paint(painter: Painter, view: View): void {
    const kind = this.troop.kind, plan = BODIES[kind], colour = KIND_COLOURS[kind], cord = shade(colour, -0.3)
    const pose = this.pose, time = this.time

    // The bunches in their places.
    const slots = skySlots(this.sky.length, view)
    for (let slot = 0; slot < slots.length; slot++) {
      const place = this.places[slot], bunch = this.sky[slot]
      if (place.away > 0) continue
      const hue = KIND_COLOURS[bunch.colour], line = shade(hue, -0.3)
      // A new bunch drifts down into its place, small at first and a little past its size before it settles.
      const grown = place.grow, size = grown < 1 ? grown * (1 + Math.sin(grown * Math.PI) * 0.18) : 1
      const bob = Math.sin(time * 1.1 + slot * 1.7) * 0.07 + (1 - grown) * (1 - grown) * 1.4
      const cx = slots[slot].x + place.push, cy = slots[slot].y + bob
      // Flat under the finger, and past round for a moment when it is let go; never flatter than a pillow can be.
      const flat = Math.max(-0.35, Math.min(1.15, place.squash))
      const wide = (1 + flat * 0.3) * size, tall = (1 - flat * 0.36) * size
      const knotX = cx, knotY = cy - BALLOON * 2.5 * size
      const offsets = bunchOffsets(bunch.count)
      for (let k = 0; k < offsets.length; k++) {
        const sway = Math.sin(time * 0.9 + slot * 2.3 + k * 1.3) * 0.05
        const x = cx + offsets[k].x * size * (1 + flat * 0.12) + sway * 0.4, y = cy + offsets[k].y * size
        const lean = (bunch.count > 1 ? -offsets[k].x * 0.42 : 0) + sway - place.pushSpeed * 0.04
        painter.balloon(x, y, -k * 0.02, wide, tall, lean, hue)
        const tailX = x + Math.sin(lean) * BALLOON * 1.32 * tall, tailY = y - Math.cos(lean) * BALLOON * 1.32 * tall
        if (bunch.count > 1) painter.string(tailX, tailY, 0, knotX, knotY, 0, line)
        else painter.string(tailX, tailY, 0, tailX + Math.sin(time * 1.3 + slot) * 0.06 - place.pushSpeed * 0.05, tailY - 0.6 * size, 0, line)
      }
      if (bunch.count > 1) painter.string(knotX, knotY, 0, knotX + Math.sin(time * 1.3 + slot) * 0.06, knotY - 0.5 * size, 0, line)
    }

    // The troop.
    for (let i = 0; i < this.troop.size; i++) {
      const actor = this.actors[i], spot = this.spot(i), name = `friend-${i}`
      Object.assign(pose, restPose())
      pose.x = spot.x
      pose.y = spot.y
      pose.scale = FRIEND_SCALE
      // It stands as one that holds a balloon only once the balloon is in its hand.
      rest(kind, this.held[i].shown, plan.reach, time, i, pose)
      if (actor.clip) clip(kind, actor.clip, actor.t, plan.height * FRIEND_SCALE, plan.reach, pose)
      this.watch(i, pose)
      painter.place(name, kind, pose)
      const lifted = pose.y - spot.y
      // The shadow stays on the hill and shrinks as the friend leaves it.
      const spread = 1 / (1 + lifted * 0.5)
      painter.shadow(pose.x, spot.y + 0.02, 0.1, plan.halfWidth * FRIEND_SCALE * 1.05 * spread, 0.55 * spread, shade(colour, -0.35))
      handOf(plan, pose, this.hand)
      const balloon = this.held[i]
      if (balloon.shown) {
        const lean = (this.hand.x - balloon.x) * -0.2 + balloon.vx * 0.03
        painter.balloon(balloon.x, balloon.y, 0.3, 1, 1, lean, colour)
        painter.string(balloon.x + Math.sin(lean) * BALLOON * 1.32, balloon.y - Math.cos(lean) * BALLOON * 1.32, 0.3, this.hand.x, this.hand.y, this.hand.z, cord)
      }
      if (actor.clip === 'liftOff' && actor.tug) {
        // The bunch that is carrying it off, straining upwards on strings from its hand.
        const hue = KIND_COLOURS[actor.tug.colour], line = shade(hue, -0.3)
        const topX = pose.x - 0.2 + Math.sin(time * 9) * 0.05, topY = pose.y + HELD_HEIGHT + 0.5
        for (const offset of bunchOffsets(actor.tug.count)) {
          painter.balloon(topX + offset.x, topY + offset.y, 0.25, 0.96, 1.08, -offset.x * 0.3, hue)
          painter.string(topX + offset.x, topY + offset.y - BALLOON * 1.4, 0.25, this.hand.x, this.hand.y, this.hand.z, line)
        }
      }
    }
    for (let i = this.troop.size; i < 3; i++) painter.drop(`friend-${i}`)

    // Bunches on their way down, and those that hang beside a friend for the beat before it refuses them.
    for (const flight of this.flights) {
      const hue = KIND_COLOURS[flight.bunch.colour], to = this.target(flight)
      const u = Math.min(1, flight.t / FLIGHT), eased = u * u * (3 - 2 * u)
      // Up a little as it lets go of the sky, then down in a swoop.
      const x = flight.fromX + (to.x - flight.fromX) * eased
      const y = flight.fromY + (to.y - flight.fromY) * eased + Math.sin(u * Math.PI) * 0.5 * (1 - u)
      const speed = Math.sin(u * Math.PI)
      const lean = Math.atan2(to.x - flight.fromX, flight.fromY - to.y) * 0.5 * speed
      const settle = flight.landed ? Math.sin(flight.after * 30) * Math.exp(-flight.after * 9) * 0.12 : 0
      const offsets = bunchOffsets(flight.bunch.count)
      for (let k = 0; k < offsets.length; k++) {
        painter.balloon(x + offsets[k].x, y + offsets[k].y, 0.35 - k * 0.02, 1 - speed * 0.1 + settle, 1 + speed * 0.16 - settle, lean, hue)
        painter.string(x + offsets[k].x + Math.sin(lean) * BALLOON * 1.32, y + offsets[k].y - BALLOON * 1.32, 0.35, x - Math.sin(lean) * 0.5, y - BALLOON * 2.6 + speed * 0.3, 0.35, shade(hue, -0.3))
      }
    }

    for (const balloon of this.loose) {
      const left = 1 - balloon.t / balloon.popAt
      const size = balloon.flat ? 0.35 + left * 0.65 : 1
      painter.balloon(balloon.x, balloon.y, 0.4, size * (balloon.flat ? 0.8 : 1), size * (balloon.flat ? 1.15 : 1.06), Math.atan2(-balloon.vx, balloon.vy) * (balloon.flat ? 1 : 0.3), balloon.colour)
    }
    for (const scrap of this.scraps) {
      const size = 0.22 * (scrap.life / SCRAP_LIFE)
      painter.balloon(scrap.x, scrap.y, 0.45, size, size * 0.7, scrap.x * 7 + scrap.life * 20, scrap.colour)
    }

    // The troop that waits at the edge: smaller, further back, looking at the balloons.
    const waitingPlan = BODIES[this.waiting.kind]
    for (let i = 0; i < 3; i++) {
      if (i >= this.waiting.size) {
        painter.drop(`waiting-${i}`)
        continue
      }
      const spot = waitingSpot(i, view)
      Object.assign(pose, restPose())
      pose.x = spot.x
      pose.z = spot.z
      pose.y = groundAt(spot.x, spot.z)
      pose.scale = WAITING_SCALE * FRIEND_SCALE
      rest(this.waiting.kind, false, waitingPlan.reach, time, i + 5, pose)
      // They wait with their arms down: reaching is for the troop whose turn it is.
      pose.armL = pose.armR = 0.2
      pose.turn = 0.45
      pose.nod = -0.25
      if (this.waitingActor.clip) clip(this.waiting.kind, this.waitingActor.clip, Math.max(0, this.waitingActor.t - i * 0.08), waitingPlan.height, waitingPlan.reach, pose)
      painter.place(`waiting-${i}`, this.waiting.kind, pose)
      painter.shadow(spot.x, groundAt(spot.x, spot.z) + 0.02, spot.z + 0.1, waitingPlan.halfWidth * 0.75, 0.36, PALETTE.shadow)
    }
  }

  /** A friend at rest follows with its head whatever is coming down to it. */
  private watch(friend: number, pose: Pose): void {
    if (this.actors[friend].clip) return
    for (const flight of this.flights) {
      if (flight.landed || flight.friend !== friend) continue
      const u = Math.min(1, flight.t / FLIGHT)
      pose.headTurn += Math.max(-0.5, Math.min(0.5, (flight.fromX - pose.x) * 0.12)) * (1 - u)
      pose.nod -= 0.15 * (1 - u)
      pose.squash -= 0.05 * u
    }
  }
}

/**
 * Where a posed friend's string hand is, in world units: the same sum the meshes make (the arm's swing about the
 * shoulder, the squash, then the whole toy's turn, lean and bow about its feet), done in numbers so the theatre
 * needs no renderer. A test holds it against the meshes.
 */
export function handOf(plan: { hand: readonly [number, number, number]; shoulder: readonly [number, number, number] }, pose: Pose, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  // The right arm is the left one mirrored: it swings out to the right by `armR`, then forwards.
  let x = -plan.hand[0], y = plan.hand[1], z = plan.hand[2]
  let c = Math.cos(pose.armR), s = Math.sin(pose.armR)
  ;[x, y] = [x * c - y * s, x * s + y * c]
  c = Math.cos(-pose.armRForward); s = Math.sin(-pose.armRForward)
  ;[y, z] = [y * c - z * s, y * s + z * c]
  const wide = 1 / Math.sqrt(Math.max(0.2, pose.squash))
  x = (x - plan.shoulder[0]) * wide
  y = (y + plan.shoulder[1]) * pose.squash
  z = (z + plan.shoulder[2]) * wide
  c = Math.cos(pose.lean); s = Math.sin(pose.lean)
  ;[x, y] = [x * c - y * s, x * s + y * c]
  c = Math.cos(pose.turn); s = Math.sin(pose.turn)
  ;[x, z] = [x * c + z * s, -x * s + z * c]
  c = Math.cos(pose.bow); s = Math.sin(pose.bow)
  ;[y, z] = [y * c - z * s, y * s + z * c]
  out.x = pose.x + x * pose.scale
  out.y = pose.y + y * pose.scale
  out.z = pose.z + z * pose.scale
  return out
}
