import { Detector } from './gesture'
import { Echo } from './echo'
import { GUEST, HOME, MEETING, onAunt, onCat, place, placeSide, reach, rings, sideOf, targetAt, toPoint, toSpot, zoneAt, type Spot, type Target } from './layout'
import { BEAT_SECONDS, THINGS, effectOf, hairAfter, lipsAfter, moodOf, nextBeat, other, outcomeOf, type Act, type Antic, type Coat, type Effect, type Guest, type Mood, type Side, type Thing } from './rules'
import type { Point } from './stage'
import type { GameState } from './state'

// The tea party in play: fingers move hands, a hand is copied, what hands do
// reaches guests. Time is the attended clock's step and nothing else. The view
// and the voices read it and never change it.

/** A finger that travels less than this is tapping. */
export const TAP_SLOP = 14
/** How long a hand waits where it was let go before it goes home. A finger landing in that time carries on. */
const LINGER = 0.42
/** A finger that has not moved for this long is resting, and gives way to the next one. */
const RESTING = 1
const WAGGLE = 0.95
/** Two acts of one hand are at least this far apart. */
const COOL = 0.3

export type HandMode = 'free' | 'held' | 'linger' | 'waggle'

export type Hand = {
  u: number
  y: number
  vu: number
  vy: number
  mode: HandMode
  target: Spot
  /** Seconds left to linger once arrived, or to waggle. */
  left: number
  /** The hand is moving for a reason: led, or copying. */
  busy: boolean
  /** On its way home: it does nothing on the way. */
  quiet: boolean
  copying: boolean
  cool: number
}

export type SeatShow = {
  antic: Antic | null
  mood: Mood | null
  /** Seconds since the antic began; below 0 it is still on its way. */
  t: number
  /** The coat before it, flooded over as the antic begins. */
  from: Coat
}

export type AuntShow = { act: Act | null; thing: Thing; t: number; face: 'calm' | 'proud' | 'innocent' | 'puzzled' | 'keen'; faceLeft: number }

export type SceneKind = 'trade' | 'birds' | 'statues' | 'bubbles' | 'tidy'
export const SCENE_SECONDS: Record<SceneKind, number> = { trade: 4, birds: 6, statues: 6.5, bubbles: 6, tidy: 5 }

export type PartyEvent =
  | { type: 'press'; side: Side; thing: Thing; at: Point }
  | { type: 'extra'; side: Side; at: Point }
  | { type: 'act'; side: Side; act: Act; thing: Thing; copy: boolean; at: Point }
  | { type: 'answer'; side: Side; guest: Guest; effect: Effect; antic: Antic; mood: Mood }
  | { type: 'pick'; thing: Thing; at: Point }
  | { type: 'take'; side: Side; thing: Thing }
  | { type: 'back'; thing: Thing }
  | { type: 'pane'; side: Side; guest: Guest }
  | { type: 'arrive'; side: Side; guest: Guest }
  | { type: 'pendulum'; tapped: boolean }
  | { type: 'bell'; rung: boolean }
  | { type: 'miss'; side: Side }
  | { type: 'cat' }
  | { type: 'notice'; side: Side }
  | { type: 'scene'; kind: SceneKind }
  | { type: 'cue'; kind: SceneKind; cue: number }

type Finger = { id: number; target: Target; side: Side; from: Point; at: Point; still: number; moved: boolean }

/** The moments of a scene at which something sounds. */
const CUES: Record<SceneKind, readonly number[]> = {
  trade: [1.2, 2.4],
  birds: [0.8, 1.8, 2.6, 3.4, 4.2, 5],
  statues: [1.1, 2.6, 4.2, 5.2],
  bubbles: [0.6, 2.4, 4.6],
  tidy: [0.7, 1.3, 1.9, 2.5, 3.4],
}

function newHand(): Hand {
  return { u: HOME.u, y: HOME.y, vu: 0, vy: 0, mode: 'free', target: { ...HOME }, left: 0, busy: false, quiet: true, copying: false, cool: 0 }
}

export class Party {
  readonly state: GameState
  readonly hands: [Hand, Hand] = [newHand(), newHand()]
  readonly seats: [SeatShow, SeatShow]
  readonly aunts: [AuntShow, AuntShow]
  /** Where each thing is drawn, sprung to the hand or the place that has it. */
  readonly at: Record<Thing, { x: number; y: number; vx: number; vy: number; tilt: number }>
  scene: { kind: SceneKind; t: number; cue: number; from: [Guest, Guest] } | null = null
  /** Which hand is being copied. */
  leader: Side = 0
  carried: { slot: number; at: Point; side: Side } | null = null
  /** The bell in a finger, or null on its place. */
  bell: Point | null = null
  private meeting = false
  /** A lifted carry waits a moment for the finger to come back. */
  private carryLift = 0
  time = 0
  swing = 0
  pendulumPush = 0
  bellRing = 9
  /** Seconds since a finger was on the sofa's cat. */
  catPoke = 9
  /** Seconds since each guest came in at the door side. */
  arrived: [number, number] = [9, 9]
  paneTap: [number, number] = [9, 9]
  /** Set when a change should be saved. Every change is a whole one, so each is saved at once. */
  dirty = false
  private readonly echo = new Echo()
  private readonly detectors: [Detector, Detector] = [new Detector(), new Detector()]
  private readonly fingers: (Finger | null)[] = [null, null]
  private queue: PartyEvent[] = []
  private met = false
  private noticed = false

  constructor(state: GameState) {
    this.state = state
    this.seats = [this.restSeat(0), this.restSeat(1)]
    this.aunts = [0, 1].map((side) => ({ act: null, thing: state.held[side as Side], t: 9, face: 'calm', faceLeft: 0 })) as unknown as [AuntShow, AuntShow]
    this.at = {} as Party['at']
    for (const thing of THINGS) {
      const home = this.homeOf(thing)
      this.at[thing] = { x: home.x, y: home.y, vx: 0, vy: 0, tilt: 0 }
    }
  }

  private restSeat(side: Side): SeatShow {
    return { antic: null, mood: null, t: 9, from: this.state.coats[this.state.seated[side]] }
  }

  /** What happened since the last call, for the voices and the particles. */
  take(): PartyEvent[] {
    const events = this.queue
    this.queue = []
    return events
  }

  get touching(): boolean {
    return this.fingers[0] !== null || this.fingers[1] !== null || this.bell !== null || this.carried !== null
  }

  /** Whether there is anything to tidy. The bell stands on the table only then. */
  get untidy(): boolean {
    const { coats, hair, lips } = this.state
    return Object.values(coats).some((coat) => coat !== 'clean') || hair.some((each) => each !== 'plain') || lips[0] || lips[1]
  }

  holds(id: number): boolean {
    return this.fingers.some((finger) => finger?.id === id)
  }

  /** Who is copying now, or null. */
  get copier(): Side | null {
    const side = other(this.leader)
    return this.hands[side].copying ? side : null
  }

  handPoint(side: Side): Point {
    return toPoint(side, this.hands[side])
  }

  // --- Fingers -------------------------------------------------------------

  down(id: number, at: Point): void {
    this.scene = null
    let side = sideOf(at)
    // A carry that is waiting out a lift: the finger came back near it.
    if (this.carried && this.carryLift > 0 && Math.hypot(at.x - this.carried.at.x, at.y - this.carried.at.y) < 140) {
      side = this.carried.side
      const finger = this.fingers[side]
      if (finger) {
        finger.id = id
        finger.at = at
        this.carryLift = 0
        this.carried.at = at
        this.queue.push({ type: 'pick', thing: this.state.table[this.carried.slot], at })
        return
      }
    }
    const working = this.fingers[side]
    if (working) {
      // A lifted carry takes no more: it is let go where it was.
      if (this.carried && this.carried.side === side && this.carryLift > 0) this.dropCarry()
      else if (working.still < RESTING || (working.target.kind === 'thing' && working.moved)) {
        this.queue.push({ type: 'extra', side, at })
        return
      } else this.release(working, true)
    }
    const target = targetAt(at, this.untidy)
    this.fingers[side] = { id, target, side, from: at, at, still: 0, moved: false }
    switch (target.kind) {
      case 'hand': {
        const hand = this.hands[side]
        const onHand = this.near(side, at)
        if (onCat(at)) {
          this.catPoke = 0
          this.queue.push({ type: 'cat' })
        }
        hand.mode = 'held'
        hand.busy = true
        hand.quiet = false
        hand.copying = false
        hand.target = onHand ? { u: hand.u, y: hand.y } : reach(toSpot(side, at))
        this.lead(side)
        this.queue.push({ type: 'press', side, thing: this.state.held[side], at: this.handPoint(side) })
        break
      }
      case 'thing':
        this.queue.push({ type: 'pick', thing: this.state.table[target.slot], at })
        break
      case 'bell':
        this.bellRing = 0
        this.queue.push({ type: 'bell', rung: false })
        break
      case 'pendulum':
        this.pendulumPush = 1
        this.queue.push({ type: 'pendulum', tapped: false })
        break
      case 'pane':
        this.paneTap[target.side] = 0
        this.queue.push({ type: 'pane', side: target.side, guest: this.state.waiting[target.side] })
        break
    }
  }

  move(id: number, at: Point): void {
    const finger = this.fingers.find((each) => each?.id === id)
    if (!finger) return
    if (Math.hypot(at.x - finger.at.x, at.y - finger.at.y) > 2) finger.still = 0
    finger.at = at
    if (!finger.moved && Math.hypot(at.x - finger.from.x, at.y - finger.from.y) > TAP_SLOP) {
      finger.moved = true
      if (finger.target.kind === 'thing') this.carried = { slot: finger.target.slot, at, side: finger.side }
    }
    if (finger.target.kind === 'bell' && finger.moved) this.bell = at
    if (finger.target.kind === 'hand' && finger.moved) this.hands[finger.side].target = reach(toSpot(finger.side, at))
    if (finger.target.kind === 'thing' && this.carried && this.carried.side === finger.side) this.carried.at = at
  }

  up(id: number, at: Point): void {
    this.move(id, at)
    const finger = this.fingers.find((each) => each?.id === id)
    if (!finger) return
    if (finger.target.kind === 'thing' && finger.moved) {
      // The carry survives a lifted finger for a moment.
      this.carryLift = 0.3
      finger.id = -1
      return
    }
    this.release(finger, false)
  }

  /** The browser took the finger away: the child let nothing go. */
  cancel(id: number): void {
    const finger = this.fingers.find((each) => each?.id === id)
    if (finger) this.release(finger, true)
  }

  /** Put away, or hidden: every finger is gone, and nothing it did not do is done. */
  clear(): void {
    if (this.carried && this.carryLift > 0) this.dropCarry()
    for (const finger of this.fingers) if (finger) this.release(finger, true)
    this.echo.clear()
    for (const hand of this.hands) Object.assign(hand, newHand())
    for (const detector of this.detectors) detector.reset()
    this.scene = null
    this.met = false
  }

  private near(side: Side, at: Point): boolean {
    const hand = this.handPoint(side)
    return Math.hypot(at.x - hand.x, at.y - hand.y) < 66
  }

  private release(finger: Finger, taken: boolean): void {
    this.fingers[finger.side] = null
    const side = finger.side
    const tapped = !finger.moved && !taken
    switch (finger.target.kind) {
      case 'hand': {
        const hand = this.hands[side]
        if (taken) {
          hand.mode = 'free'
          hand.busy = false
          hand.quiet = true
          if (this.leader === side) this.echo.clear()
        } else if (tapped && this.near(side, finger.from) && finger.still < 0.4 && zoneAt(hand) === null) {
          hand.mode = 'waggle'
          hand.left = WAGGLE
          hand.target = { u: hand.u, y: hand.y }
        } else {
          hand.mode = 'linger'
          // At the middle the hand waits for the other to come: a tap there can meet.
          hand.left = zoneAt(hand.target) === 'meet' ? BEAT_SECONDS[this.state.beat] + 0.7 : LINGER
        }
        // The other child still leads: from now on this aunt copies.
        if (this.fingers[other(side)]?.target.kind === 'hand' && hand.mode === 'free') this.lead(other(side))
        break
      }
      case 'thing':
        if (this.carried && this.carried.side === side) {
          const thing = this.state.table[this.carried.slot]
          this.carried = null
          this.carryLift = 0
          this.queue.push({ type: 'back', thing })
        } else if (tapped) this.giveTo(placeSide(finger.target.slot), finger.target.slot)
        break
      case 'bell':
        if (this.bell) {
          const ring = !taken && rings(this.bell)
          this.bell = null
          this.bellRing = 0
          this.queue.push({ type: 'bell', rung: ring })
          if (ring) this.tidy()
        }
        break
      case 'pendulum':
        if (tapped) {
          this.state.beat = nextBeat(this.state.beat)
          this.dirty = true
          this.queue.push({ type: 'pendulum', tapped: true })
        }
        break
      case 'pane':
        if (tapped) this.callIn(finger.target.side)
        break
    }
  }

  private lead(side: Side): void {
    if (this.leader === side && !this.hands[other(side)].busy && this.echo.at(this.time) !== null) return
    if (this.leader !== side || this.hands[other(side)].mode === 'held') this.echo.clear()
    this.leader = side
    this.noticed = false
  }

  private dropCarry(): void {
    const carried = this.carried
    if (!carried) return
    this.fingers[carried.side] = null
    this.carried = null
    this.carryLift = 0
    if (onAunt(carried.at)) this.giveTo(sideOf(carried.at), carried.slot)
    else this.queue.push({ type: 'back', thing: this.state.table[carried.slot] })
  }

  // --- What fingers cause --------------------------------------------------

  private giveTo(side: Side, slot: number): void {
    const given = this.state.table[slot]
    this.state.table[slot] = this.state.held[side]
    this.state.held[side] = given
    this.dirty = true
    this.setFace(side, 'keen', 1.4)
    this.queue.push({ type: 'take', side, thing: given })
  }

  private callIn(side: Side): void {
    const guest = this.state.waiting[side]
    this.state.waiting[side] = this.state.seated[side]
    this.state.seated[side] = guest
    this.seats[side] = this.restSeat(side)
    this.arrived[side] = 0
    this.dirty = true
    this.queue.push({ type: 'arrive', side, guest })
  }

  private tidy(): void {
    for (const side of [0, 1] as const) {
      const guest = this.state.seated[side]
      this.seats[side] = { antic: null, mood: null, t: 9, from: this.state.coats[guest] }
      this.state.hair[side] = 'plain'
      this.state.lips[side] = false
    }
    for (const guest of Object.keys(this.state.coats) as Guest[]) this.state.coats[guest] = 'clean'
    this.begin('tidy', [...this.state.seated])
  }

  private begin(kind: SceneKind, from: [Guest, Guest]): void {
    this.scene = { kind, t: 0, cue: 0, from }
    this.dirty = true
    this.queue.push({ type: 'scene', kind })
  }

  private setFace(side: Side, face: AuntShow['face'], seconds: number): void {
    this.aunts[side].face = face
    this.aunts[side].faceLeft = seconds
  }

  private act(side: Side, act: Act): void {
    const hand = this.hands[side]
    if (hand.cool > 0) return
    hand.cool = COOL
    const { state } = this
    const thing = state.held[side]
    const copy = hand.copying
    this.aunts[side] = { ...this.aunts[side], act, thing, t: 0 }
    this.queue.push({ type: 'act', side, act, thing, copy, at: this.handPoint(side) })
    if (!copy) this.setFace(side, 'proud', 1.2)
    if (act === 'show') {
      const hair = hairAfter(state.hair[side], thing)
      if (hair !== state.hair[side]) {
        state.hair[side] = hair
        this.dirty = true
      }
    }
    if (act === 'self') {
      const stuck = lipsAfter(state.lips[side], thing)
      if (stuck !== state.lips[side]) {
        state.lips[side] = stuck
        this.dirty = true
      }
    }
    const effect = effectOf(thing, act)
    // Two guests taken up with each other are out of reach until they have done.
    if (!effect || (this.scene && this.scene.kind !== 'trade' && this.scene.kind !== 'tidy')) return
    const guest = state.seated[side]
    const was = state.coats[guest]
    const { coat, antic } = outcomeOf(was, effect)
    const mood = moodOf(guest, effect)
    state.coats[guest] = coat
    this.dirty = true
    this.seats[side] = { antic, mood, t: act === 'tip' ? -0.22 : act === 'wave' ? -0.1 : -0.02, from: was }
    this.queue.push({ type: 'answer', side, guest, effect, antic, mood })
    if (mood === 'outrage') {
      if (copy) {
        this.setFace(side, 'puzzled', 1.8)
        this.setFace(other(side), 'innocent', 1.8)
      } else this.setFace(side, 'innocent', 1.8)
    }
    if (coat !== was) this.twins(coat)
  }

  /** Both guests have just come to wear the same coat, and it is one that makes a scene. */
  private twins(coat: Coat): void {
    const { state } = this
    if (state.coats[state.seated[0]] !== coat || state.coats[state.seated[1]] !== coat) return
    const from: [Guest, Guest] = [...state.seated]
    if (coat === 'feathered') this.begin('birds', from)
    else if (coat === 'stiff') this.begin('statues', from)
    else if (coat === 'bubble') {
      state.seated = [from[1], from[0]]
      this.seats.reverse()
      this.begin('bubbles', from)
    }
  }

  // --- Time ----------------------------------------------------------------

  step(dt: number): void {
    if (dt <= 0) return
    // Short steps, so a slow frame moves hands the same way a fast one does.
    let left = dt
    while (left > 0) {
      const h = Math.min(left, 1 / 60)
      this.tick(h)
      left -= h
    }
  }

  private tick(dt: number): void {
    this.time += dt
    const wait = BEAT_SECONDS[this.state.beat]
    this.swing += (dt * Math.PI) / Math.max(0.3, wait)
    this.pendulumPush = Math.max(0, this.pendulumPush - dt * 1.4)
    this.bellRing += dt
    this.catPoke += dt
    for (const side of [0, 1] as const) {
      this.arrived[side] += dt
      this.paneTap[side] += dt
      this.seats[side].t += dt
      const aunt = this.aunts[side]
      aunt.t += dt
      aunt.faceLeft -= dt
      if (aunt.faceLeft <= 0) aunt.face = 'calm'
      const finger = this.fingers[side]
      if (finger) finger.still += dt
    }
    if (this.carryLift > 0) {
      this.carryLift -= dt
      if (this.carryLift <= 0) this.dropCarry()
    }
    this.led(this.leader, dt)
    const follower = other(this.leader)
    if (this.hands[follower].mode === 'free') this.copied(follower, wait, dt)
    else this.led(follower, dt)
    this.meet()
    for (const side of [0, 1] as const) {
      const hand = this.hands[side]
      hand.cool = Math.max(0, hand.cool - dt)
      const act = this.detectors[side].step(hand, dt, hand.quiet)
      if (act) this.act(side, act)
    }
    this.things(dt)
    if (this.scene) this.play(this.scene, dt)
  }

  /** A hand with a finger on it, or just let go, or on its way home. */
  private led(side: Side, dt: number): void {
    const hand = this.hands[side]
    hand.copying = false
    let target: Spot = hand.target
    if (hand.mode === 'linger') {
      const arrived = Math.hypot(hand.u - hand.target.u, hand.y - hand.target.y) < 18
      if (arrived) hand.left -= dt
      if (hand.left <= 0) this.goHome(side)
    } else if (hand.mode === 'waggle') {
      hand.left -= dt
      const age = WAGGLE - hand.left
      target = { u: hand.target.u + Math.sin(age * Math.PI * 2 * 3.2) * 62, y: hand.target.y - 14 }
      if (hand.left <= 0) this.goHome(side)
    }
    if (hand.mode === 'free') target = HOME
    spring(hand, target, hand.mode === 'free' ? 11 : 26, dt)
    if (hand.mode === 'free' && Math.hypot(hand.u - HOME.u, hand.y - HOME.y) < 3) hand.busy = false
    if (side === this.leader && this.fingers[other(side)]?.target.kind !== 'hand') this.echo.push(this.time, hand, hand.quiet)
  }

  private goHome(side: Side): void {
    const hand = this.hands[side]
    hand.mode = 'free'
    hand.quiet = true
    // The other aunt still has a finger on her: this one copies her from now on.
    if (this.fingers[other(side)]?.target.kind === 'hand') this.lead(other(side))
  }

  /** A hand that follows the other one, a beat behind. */
  private copied(side: Side, wait: number, dt: number): void {
    const hand = this.hands[side]
    const moment = this.echo.at(this.time - wait)
    const was = hand.copying
    hand.copying = moment !== null && (!moment.quiet || Math.hypot(moment.u - HOME.u, moment.y - HOME.y) > 4)
    hand.busy = hand.copying
    hand.quiet = moment === null || moment.quiet
    if (hand.copying && !was) this.setFace(side, 'keen', 1)
    if (!this.noticed && this.hands[this.leader].mode !== 'free') {
      this.noticed = true
      this.setFace(side, 'keen', wait + 0.5)
      this.queue.push({ type: 'notice', side })
    }
    spring(hand, moment ?? HOME, moment ? 48 : 11, dt)
  }

  private meet(): void {
    const [a, b] = this.hands
    // A copier who comes to the middle and finds nobody claps on air.
    const follower = this.hands[other(this.leader)], there = follower.copying && !follower.quiet && zoneAt(follower) === 'meet'
    if (there && !this.meeting) {
      const lead = this.hands[this.leader]
      if (zoneAt(lead) !== 'meet' || lead.quiet) this.queue.push({ type: 'miss', side: other(this.leader) })
    }
    this.meeting = there
    const both = zoneAt(a) === 'meet' && zoneAt(b) === 'meet' && !a.quiet && !b.quiet && a.mode !== 'waggle' && b.mode !== 'waggle'
    if (!both) {
      if (zoneAt(a) !== 'meet' || zoneAt(b) !== 'meet') this.met = false
      return
    }
    if (this.met) return
    this.met = true
    this.state.held = [this.state.held[1], this.state.held[0]]
    this.setFace(0, 'proud', 2.4)
    this.setFace(1, 'proud', 2.4)
    this.begin('trade', [...this.state.seated])
  }

  /** Where a thing belongs now. */
  homeOf(thing: Thing): Point {
    const { held, table } = this.state
    if (held[0] === thing) return this.handPoint(0)
    if (held[1] === thing) return this.handPoint(1)
    const slot = table.indexOf(thing)
    if (this.carried?.slot === slot) return this.carried.at
    return place(slot)
  }

  private things(dt: number): void {
    for (const thing of THINGS) {
      const body = this.at[thing], home = this.homeOf(thing)
      const inHand = this.state.held.includes(thing)
      const k = inHand ? 900 : 260, c = inHand ? 52 : 22
      body.vx += ((home.x - body.x) * k - body.vx * c) * dt
      body.vy += ((home.y - body.y) * k - body.vy * c) * dt
      body.x += body.vx * dt
      body.y += body.vy * dt
      const lean = Math.max(-0.5, Math.min(0.5, body.vx / 1600))
      body.tilt += (lean - body.tilt) * Math.min(1, dt * 12)
    }
  }

  private play(scene: NonNullable<Party['scene']>, dt: number): void {
    scene.t += dt
    const cues = CUES[scene.kind]
    while (scene.cue < cues.length && scene.t >= cues[scene.cue]) {
      this.queue.push({ type: 'cue', kind: scene.kind, cue: scene.cue })
      scene.cue += 1
    }
    if (scene.t >= SCENE_SECONDS[scene.kind]) this.scene = null
  }
}

function spring(hand: Hand, to: Spot, rate: number, dt: number): void {
  // Critically damped and exact, so it is the same at any step.
  const decay = Math.exp(-rate * dt)
  for (const [p, v] of [['u', 'vu'], ['y', 'vy']] as const) {
    const x = hand[p] - to[p]
    const n = (hand[v] + rate * x) * dt
    hand[p] = to[p] + (x + n) * decay
    hand[v] = (hand[v] - rate * n) * decay
  }
}

/** The idle guide's moves, in turn: to the guest, up and over it, and a thing to a hand. From, and to. */
export function demoMove(party: Party, index: number): { from: Point; to: Point } {
  const side: Side = index % 2 === 0 ? 0 : 1
  if (index % 3 === 2) return { from: place(side === 0 ? 0 : 3), to: toPoint(side, { u: 250, y: 440 }) }
  const to = index % 3 === 0 ? { u: GUEST.u, y: 330 } : MEETING
  return { from: party.handPoint(side), to: toPoint(side, to) }
}

