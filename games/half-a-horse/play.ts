import type { Note } from './audio'
import { Cloth, type Pt } from './cloth'
import { Crowd, type Beast, type React, type Watcher } from './crowd'
import { ACTS, BEAR, GOOSE, actPose, partOf, restPose, tempo, type End, type Pose, type Who } from './ends'
import { Hands, LIFT_GRACE_S, REGRAB, REST_S, type Contact } from './hands'
import { BODY, DRAG_FROM, FARMER, FOOD_LEFT, FOOD_R, FOOD_REACH, FOOD_RIGHT, GROUND, HANG, HANG_REACH, LEFT, LINE, LINE_FLOOR, LOFT, MAX_FOOD, MEET, PEGS, PIG, POST, PUDDLE, RIGHT, ROOM, SEAM, SLACK, STABLE, STABLE_ROOM, TREE, pegAt } from './layout'
import { Routines, type Routine } from './routines'
import { FOODS, type FoodKind, type Saved } from './save'
import { notes, type Sound } from './sound'
import { LINE_POST } from './scenery'

// The Mount's path with no browser in it: fingers land, move, lift and are
// taken away here by their ids and stage points, and the yard plays its time
// here. The Mount and every test call the same methods.
// - Each half has one finger at a time, and the two never take from each other.
// - A half is let go the moment its finger lifts, since letting go is the act;
//   a finger that lands near takes it up again. A costume in the hand waits out
//   a short lift.
// - A finger taken away is not a let-go: a half is set down softly and sets off
//   nothing, a costume or a piece of food goes back where it came from.

export type Target =
  | { kind: 'half'; who: Who }
  | { kind: 'costume'; peg: number }
  | { kind: 'food'; food: Food }
  | { kind: 'cloth' }
  | { kind: 'watcher'; who: Watcher }
  | { kind: 'tree' | 'puddle' | 'lace' | 'fence' | 'farmpost' | 'henpost' | 'stable' | 'ground' | 'page' }

export type Half = {
  x: number
  /** Height of the feet above the ground. */
  y: number
  vx: number
  vy: number
  wear: End
  sit: boolean
  held: number | null
  /** Where a tap called it, or where its own nose takes it. */
  call: number | null
  idle: number
  act: number
  acted: boolean
  squash: number
  squashV: number
  tilt: number
  tiltV: number
  /** Ground covered, for the legs, and the part of a step since the last footfall. */
  walked: number
  foot: number
  /** 0 to 1: asleep on its feet, admiring itself, straining after what it cannot reach, eating. */
  doze: number
  preen: number
  strain: number
  eat: number
  /** Let go by the browser and not the child: it floats down. */
  soft: boolean
  /** How far it has sat down, eased. */
  sat: number
  /** Seconds into a change of costume, or -1, and the end that came off. */
  change: number
  old: End
  meet: boolean
}

export type Food = { kind: FoodKind; x: number; y: number; vx: number; vy: number; turn: number; wait: number; held: boolean; home: number }
/** A costume in the air, up to a peg or down to a half. */
export type Flight = { end: End; from: Pt; peg: number; who: Who | null; t: number; seconds: number; wait: number }
/** A costume in a hand: whose peg it left, where it is, and how long since the finger lifted. */
export type Carried = { end: End; peg: number; at: Pt; vx: number; id: number | null; lifted: number }
export type Puff = { kind: 'dust' | 'drop' | 'crumb' | 'leaf' | 'feather' | 'note' | 'air'; x: number; y: number; vx: number; vy: number; t: number; seconds: number; size: number; turn: number }

/** How much lower a half's middle is when it sits. */
export const SIT_DROP = 46
const WALK = [128, 84] as const
const CALLED = [330, 250] as const
const NIGHT_S = 5

export class Play {
  readonly halves: [Half, Half]
  readonly cloth: Cloth
  /** What an act does to each half now. */
  readonly poses: [Pose, Pose] = [restPose(), restPose()]
  readonly crowd: Crowd
  readonly hands = new Hands<Target>()
  readonly pegs: (End | null)[]
  food: Food[]
  eaten: FoodKind[]
  tied: boolean
  /** How far the bow is drawn together, 0 to 1 and over, on a spring. */
  knot = 0
  private knotV = 0
  ended: boolean
  /** Seconds into the ending, or past its end. */
  night: number
  /** How far the stable's half-door is shut. */
  door: number
  flights: Flight[] = []
  carried: Carried[] = []
  puffs: Puff[] = []
  /** The farmer's hand: seconds until the carrot is back in it, and what he is doing. */
  carrotIn = 0
  meeting: { end: End; who: Who; t: number; seconds: number } | null = null
  /** The line's swing and each peg's flutter, the tree's shake, the puddle's ring, the post's, the fence's and the loft's rattle. */
  swing = 0
  private swingV = 0
  readonly flutter = new Float64Array(PEGS)
  shake = 0
  ring = 0
  rattle = { farmpost: 0, henpost: 0, fence: 0 }
  ripples: { x: number; y: number; t: number }[] = []
  hop = 0
  private hopV = 0
  now = 0
  heard: Note[] = []
  changed = false
  urgent = false
  /** Every routine as it happens, for the view and the tests. */
  readonly done: Routine[] = []
  private readonly routines: Routines
  private snapFor = 0
  private lastSnap = 9
  private creak = 0
  private variant = 0
  private plucked = false
  private readonly fired: Routine[] = []
  private readonly chance: () => number

  constructor(saved: Saved, chance: () => number) {
    this.chance = chance
    this.halves = [newHalf(saved.halves[0]), newHalf(saved.halves[1])]
    this.pegs = [...saved.pegs]
    this.food = saved.food.map((one) => newFood(one.kind, one.x))
    this.eaten = [...saved.eaten]
    this.tied = saved.tied
    this.knot = saved.tied ? 1 : 0
    this.ended = saved.ended
    this.night = saved.ended ? NIGHT_S : 0
    this.door = saved.ended ? 1 : 0
    if (saved.ended) this.lieDown()
    this.halves.forEach((half) => { half.meet = half.x > MEET })
    this.cloth = new Cloth(this.seam(GOOSE), this.seam(BEAR))
    this.crowd = new Crowd(chance)
    this.routines = new Routines(saved.tied)
  }

  // --- What is saved ---------------------------------------------------------

  saved(): Saved {
    const place = (who: Who): number => {
      const half = this.halves[who]
      const x = half.call ?? half.x
      // In the hand inside the stable: just outside its door.
      return !this.ended && half.held !== null && x <= STABLE.mouth ? STABLE.mouth + 24 : Math.round(x * 10) / 10
    }
    const [front, rear] = [place(GOOSE), place(BEAR)]
    return {
      v: 1,
      halves: [
        { x: front, sit: this.halves[0].sit && this.halves[0].call === null, wear: this.halves[0].wear },
        { x: rear, sit: this.halves[1].sit && this.halves[1].call === null, wear: this.halves[1].wear },
      ],
      pegs: [...this.pegs],
      food: this.food.map((one) => ({ kind: one.kind, x: Math.round(one.held ? one.home : Math.max(FOOD_LEFT, Math.min(FOOD_RIGHT, one.x))) })),
      eaten: [...this.eaten],
      tied: this.tied && front < rear,
      ended: this.ended || (front <= STABLE.mouth && rear <= STABLE.mouth),
    }
  }

  // --- Where things are --------------------------------------------------------

  seam(who: Who): Pt {
    const half = this.halves[who], pose = this.poses[who], out = this.out(who)
    const turn = half.tilt - out * pose.tilt, c = Math.cos(turn), s = Math.sin(turn)
    const squash = half.squash * 0.8 + pose.squash + half.doze * 0.1 + half.sat * 0.1
    const x = -SEAM.x * out * (1 + squash * 0.5), y = SEAM.y * (1 - squash)
    return { x: half.x + x * c - y * s, y: GROUND - half.y - pose.lift + half.sat * SIT_DROP + x * s + y * c }
  }

  /** Where the bear's food is, for his toes. */
  get foodX(): number | null {
    return this.nearestFood(this.halves[BEAR].x)?.x ?? null
  }

  /** The performers' outward side: the goose faces right and the bear, behind, faces left. */
  out(who: Who): number {
    return who === GOOSE ? 1 : -1
  }

  get gap(): number {
    return this.halves[0].x - this.halves[1].x
  }

  held(who: Who): boolean {
    return this.halves[who].held !== null
  }

  beast(): Beast {
    const [f, r] = this.halves
    return { front: f.wear, rear: r.wear, gap: this.gap, lift: f.y - r.y, sit: f.sit !== r.sit, tied: this.tied, asleep: this.ended }
  }

  private hit(at: Pt): Target {
    if (!this.ended) {
      const food = this.foodAt(at, 34)
      if (food) return { kind: 'food', food }
      const who = this.halfAt(at)
      if (who !== null) return { kind: 'half', who }
    }
    for (let peg = 0; peg < PEGS; peg++) {
      const hook = pegAt(peg)
      if (this.pegs[peg] !== null && !this.carried.some((one) => one.peg === peg) && Math.hypot(at.x - hook.x, at.y - hook.y - HANG) < HANG_REACH + 8) return { kind: 'costume', peg }
    }
    const food = this.foodAt(at, FOOD_REACH)
    if (food) return { kind: 'food', food }
    if (at.x < STABLE.right && at.y > 372 && at.y < GROUND + 26) return { kind: 'stable' }
    if (!this.ended && this.cloth.nearest(at).distance < 78) return { kind: 'cloth' }
    if (Math.abs(at.x - FARMER.x) < FARMER.w / 2 && at.y > 250 && at.y < GROUND + 20) return { kind: 'watcher', who: 'farmer' }
    if (Math.hypot(at.x - LOFT.x, at.y - LOFT.y) < 88) return { kind: 'watcher', who: 'cow' }
    if (Math.abs(at.x - POST.x) < 62 && at.y > POST.y - 125 && at.y < POST.y + 6) return { kind: 'watcher', who: 'hen' }
    if (Math.hypot((at.x - PIG.x) / 1.15, at.y - PIG.y + 14) < 88) return { kind: 'watcher', who: 'pig' }
    if (Math.abs(at.x - LINE_POST.farm) < 34 && at.y > 470 && at.y < GROUND + 20) return { kind: 'farmpost' }
    if (Math.abs(at.x - POST.x) < 30 && at.y >= POST.y && at.y < GROUND - 60) return { kind: 'henpost' }
    if (Math.abs(at.x - TREE.x) < TREE.w / 2 && at.y > TREE.y - TREE.h / 2 && at.y < 560) return { kind: 'tree' }
    if (Math.hypot((at.x - PUDDLE.x) / PUDDLE.rx, (at.y - PUDDLE.y) / 34) < 1) return { kind: 'puddle' }
    if (at.x > LINE.left - 20 && at.x < LINE.right + 20 && Math.abs(at.y - LINE.y - LINE.sag * 0.6) < 40) return { kind: 'lace' }
    if (at.x > 250 && at.x < 985 && at.y > 500 && at.y < 585) return { kind: 'fence' }
    if (at.y > 570 && at.x > STABLE.right - 40 && at.x < FARMER.x - 60) return { kind: 'ground' }
    return { kind: 'page' }
  }

  private foodAt(at: Pt, reach: number): Food | null {
    let best: Food | null = null, near = reach
    for (const one of this.food) {
      if (one.wait > 0) continue
      const d = Math.hypot(at.x - one.x, at.y - (GROUND - FOOD_R - one.y))
      if (d < near) { near = d; best = one }
    }
    return best
  }

  /** The half under a finger: its body, its legs and what sticks out of it, with room to spare. The nearer of two. */
  halfAt(at: Pt): Who | null {
    let best: Who | null = null, near = 1
    for (const who of [GOOSE, BEAR] as const) {
      const half = this.halves[who]
      const feet = GROUND - half.y
      const body = Math.hypot((at.x - half.x) / 132, (at.y - (feet + BODY.y)) / 128)
      const legs = Math.hypot((at.x - half.x) / 104, (at.y - (feet - 56)) / 92)
      const head = partOf(half.wear) === 'head' ? Math.hypot((at.x - half.x - this.out(who) * 92) / 112, (at.y - (feet - 300)) / 104) : Math.hypot((at.x - half.x - this.out(who) * 120) / 84, (at.y - (feet - 200)) / 92)
      const d = Math.min(body, legs, head)
      if (d < near) { near = d; best = who }
    }
    return best
  }

  // --- Fingers -----------------------------------------------------------------

  down(id: number, at: Pt): void {
    // A touch lands whatever answer was running, and the ending.
    const wasNight = this.ended && this.night < NIGHT_S
    if (wasNight) { this.night = NIGHT_S; this.door = 1 }
    this.meeting = null
    for (const half of this.halves) if (half.change >= 0) this.landChange(half)

    // A costume whose finger lifted a moment ago is taken up again.
    for (const one of this.carried) {
      if (one.id === null && Math.hypot(at.x - one.at.x, at.y - one.at.y) < REGRAB && this.hands.working() < 3) {
        one.id = id
        one.lifted = 0
        this.hands.land(id, at, { kind: 'costume', peg: one.peg }, { x: one.at.x - at.x, y: one.at.y - at.y }, false).moved = true
        return
      }
    }

    const target = this.hit(at)
    let extra = false
    let off = { x: 0, y: 0 }
    const others = [...this.hands.contacts.values()]
    if (target.kind === 'half') {
      const half = this.halves[target.who]
      off = { x: half.x - at.x, y: GROUND - half.y - at.y }
      if (half.held !== null) {
        const holder = this.hands.contacts.get(half.held)
        // A holder that rests hands over; one that works is never interrupted.
        if (holder && holder.still < REST_S) extra = true
        else if (holder) holder.extra = true
      }
    } else if (target.kind !== 'page' && target.kind !== 'ground') {
      extra = others.some((one) => !one.extra && one.target.kind === target.kind && same(one.target, target))
    }
    const contact = this.hands.land(id, at, target, off, extra)
    if (contact.extra && !(target.kind === 'watcher' && target.who === 'farmer')) {
      this.say('extra', null, this.next())
      this.ripple(at)
      if (target.kind === 'half') this.halves[target.who].squashV += 2.2
      return
    }
    this.press(contact, at, wasNight)
  }

  private press(contact: Contact<Target>, at: Pt, wasNight: boolean): void {
    const target = contact.target
    switch (target.kind) {
      case 'half': {
        const half = this.halves[target.who]
        half.held = contact.id
        half.call = null
        half.idle = 0
        half.soft = false
        half.squashV += 3.4
        this.wake(half)
        this.say('pat', target.who)
        break
      }
      case 'costume':
        this.flutter[target.peg] = 1
        this.say('rustle', null, this.next())
        break
      case 'food':
        target.food.held = true
        target.food.home = target.food.x
        target.food.vx = 0
        this.say('squeak', null, this.next())
        break
      case 'cloth': {
        const { node } = this.cloth.nearest(at)
        this.cloth.flick(node, 620)
        this.cloth.grab(node, at)
        this.say('wobble', null, node)
        break
      }
      case 'watcher':
        this.pokeWatcher(target.who, contact)
        break
      case 'tree':
        this.shake = 1
        this.puff('leaf', TREE.x, TREE.y, 6)
        this.say('leaves')
        break
      case 'puddle':
        this.splash(at.x)
        break
      case 'lace':
        this.swingV += 3.4
        this.say('lace')
        break
      case 'fence':
        this.rattle.fence = 1
        this.ripple(at)
        this.say('fence', null, Math.floor(at.x / 90))
        break
      case 'henpost':
        this.rattle.henpost = 1
        this.crowd.react('hen', 'hop')
        this.say('post')
        break
      case 'farmpost':
        this.rattle.farmpost = 1
        this.say('post')
        break
      case 'stable':
        // A touch that landed the ending does not also open the door on it.
        // The lift of a touch that woke or opened it walks nobody in.
        if (this.ended) contact.extra = true
        if (this.ended && !wasNight) this.openStable()
        else if (!this.ended) { this.rattle.fence = 0.4; this.say('door') } else this.say('snoreLow')
        break
      case 'ground':
      case 'page':
        this.ripple(at)
        this.say('pit', null, this.next())
        break
    }
  }

  private pokeWatcher(who: Watcher, contact: Contact<Target>): void {
    switch (who) {
      case 'cow':
        this.crowd.react('cow', 'poke')
        this.say('moo')
        break
      case 'hen':
        this.crowd.react('hen', 'jump')
        this.puff('feather', POST.x, POST.y - 50, 3)
        this.say('squawk')
        break
      case 'pig':
        this.crowd.react('pig', 'roll')
        this.puff('dust', PIG.x, PIG.y + 20, 5)
        this.say('splat')
        break
      case 'farmer':
        if (contact.extra) {
          this.crowd.react('farmer', 'wave')
          this.say('halloo')
        } else {
          this.crowd.react('farmer', 'lean')
          this.say('braces', null, this.next())
        }
    }
  }

  move(id: number, at: Pt): void {
    const before = this.hands.contacts.get(id)
    const was = before?.at
    const contact = this.hands.move(id, at)
    if (!contact || contact.extra || !was) return
    const target = contact.target
    if (target.kind === 'costume' && contact.moved) {
      let one = this.carried.find((each) => each.id === id)
      if (!one && this.pegs[target.peg] !== null && !this.carried.some((each) => each.peg === target.peg)) {
        const hook = pegAt(target.peg)
        one = { end: this.pegs[target.peg]!, peg: target.peg, at: { x: hook.x, y: hook.y + HANG }, vx: 0, id, lifted: 0 }
        contact.off = { x: 0, y: 20 }
        this.carried.push(one)
      }
      if (one) {
        const x = at.x + contact.off.x
        if (Math.floor(x / 46) !== Math.floor(one.at.x / 46)) this.say('rustle', null, this.next())
        one.vx += (x - one.at.x) * 0.4
        one.at = { x, y: at.y + contact.off.y }
      }
    } else if (target.kind === 'food' && contact.moved) {
      const food = target.food
      const x = Math.max(FOOD_LEFT - 40, Math.min(FOOD_RIGHT + 180, at.x))
      food.turn += (x - food.x) / FOOD_R
      if (Math.floor(x / 60) !== Math.floor(food.x / 60)) this.say('rumble', null, this.next())
      food.vx = (x - food.x) * 22
      food.x = x
      food.y = Math.max(0, Math.min(440, GROUND - FOOD_R - at.y))
    } else if (target.kind === 'cloth') {
      this.cloth.pull(at)
      if (Math.floor(at.y / 70) !== Math.floor(was.y / 70)) this.say('bend')
    } else if (target.kind === 'watcher' && target.who === 'farmer' && contact.moved && Math.floor(at.x / 50) !== Math.floor(was.x / 50)) {
      this.crowd.react('farmer', 'lean')
      this.say('braces', null, this.next())
    }
  }

  up(id: number): void {
    const contact = this.hands.contacts.get(id)
    if (!contact) return
    const tap = this.hands.isTap(contact)
    this.hands.lift(id)
    const target = contact.target
    if (target.kind === 'half' && this.halves[target.who].held === id) this.letGo(target.who, tap)
    if (contact.extra) return
    switch (target.kind) {
      case 'half':
        break
      case 'costume': {
        const one = this.carried.find((each) => each.id === id)
        if (one) { one.id = null; one.lifted = 0 } else if (tap) this.tapCostume(target.peg)
        break
      }
      case 'food':
        this.dropFood(target.food, tap, contact.at)
        break
      case 'cloth':
        this.cloth.release()
        if (contact.moved) this.say('boing')
        break
      case 'watcher':
        if (target.who !== 'farmer') break
        if (tap) this.toss()
        else if (contact.moved) { this.crowd.react('farmer', 'shake'); this.say('bracesPing') } else { this.crowd.react('farmer', 'mumble'); this.say('mumble') }
        break
      case 'farmpost':
        if (tap) this.call(MEET + 30)
        break
      case 'stable':
        if (tap && !this.ended) this.callHome()
        break
      case 'ground': {
        // A quick tap with no other finger on the page: a resting hand calls nobody.
        const resting = [...this.hands.contacts.values()].some((one) => one.target.kind === 'ground' || one.target.kind === 'page')
        if (tap && !resting) this.call(Math.max(STABLE.right + 40, Math.min(RIGHT, contact.at.x)))
        break
      }
      case 'tree':
        if (tap) this.dropApple()
        break
      default:
        break
    }
  }

  /** The browser took the finger. The child let nothing go. */
  cancel(id: number): void {
    const contact = this.hands.lift(id)
    if (!contact) return
    const target = contact.target
    if (target.kind === 'half' && this.halves[target.who].held === id) {
      const half = this.halves[target.who]
      half.held = null
      half.soft = true
      half.idle = 0
      half.vx = half.vy = 0
      if (half.x <= STABLE.mouth) half.x = STABLE.mouth + 24
      this.mark()
    }
    if (contact.extra) return
    if (target.kind === 'food') {
      target.food.held = false
      target.food.x = target.food.home
      target.food.y = target.food.vx = target.food.vy = 0
    }
    if (target.kind === 'cloth') this.cloth.release()
    const one = this.carried.find((each) => each.id === id)
    if (one) this.toPeg(one)
  }

  /** Parked under fingers: each is taken away, and what the child had already let go lands where it hung. */
  clear(): void {
    for (const id of [...this.hands.contacts.keys()]) this.cancel(id)
    for (const one of [...this.carried]) this.dropCostume(one)
  }

  get busy(): boolean {
    return this.hands.contacts.size > 0 || (this.ended && this.night < NIGHT_S) || this.meeting !== null
  }

  // --- What a finger does --------------------------------------------------------

  private letGo(who: Who, tap: boolean): void {
    const half = this.halves[who]
    half.held = null
    half.idle = 0
    half.vx = Math.max(-900, Math.min(900, half.vx))
    half.vy = Math.max(-200, Math.min(700, half.vy))
    if (tap) { if (half.act < 0) this.act(who) } else if (Math.abs(this.gap) > 560) this.snapFor = 0.9
    this.mark()
    this.tryEnd()
  }

  private act(who: Who): void {
    const half = this.halves[who]
    half.act = 0
    half.acted = false
    half.sit = false
    this.say(`act${half.wear}` as Sound, who)
  }

  /** The moment in an act when the yard feels it. */
  private actLands(who: Who): void {
    const half = this.halves[who], out = this.out(who)
    const reach = (food: Food): boolean => food.y < 60 && (food.x - half.x) * out > -70 && (food.x - half.x) * out < 210
    switch (half.wear) {
      case 0:
        this.crowd.react('hen', 'hop')
        break
      case 1:
        this.puff('crumb', half.x + out * 150, GROUND - 8, 4)
        for (const food of this.food) if (reach(food) && !food.held) { food.vx = out * 160; food.vy = 170 }
        break
      case 2:
        this.crowd.react('farmer', 'blown')
        this.crowd.react('hen', 'blown')
        this.crowd.react('cow', 'blown')
        this.swingV += out * 5
        this.shake = 1
        this.puff('leaf', TREE.x, TREE.y, 7)
        this.puff('air', half.x + out * 140, GROUND - half.y - 380, 5, out * 260)
        break
      case 3:
        this.crowd.react('hen', 'jump')
        if (half.x * out > 640 * out) this.crowd.react(who === GOOSE ? 'farmer' : 'cow', 'jump')
        this.crowd.react('pig', 'hop')
        break
      case 4:
        for (const food of this.food) if (reach(food) && !food.held) { food.vx = out * (420 + this.chance() * 160); food.vy = 620; this.say('pip') }
        this.puff('dust', half.x + out * 90, GROUND - 10, 5, out * 120)
        this.crowd.react('pig', 'hop')
        break
      case 5:
        this.lay(half.x + out * 96, 120)
        this.crowd.react('pig', 'laugh')
        break
      case 6:
        this.boom()
        this.crowd.react('cow', 'blown')
        break
      default:
        for (const food of this.food) if (reach(food) && !food.held) food.vx = out * 620
        this.puff('dust', half.x + out * 130, GROUND - 8, 6, out * 200)
        this.cloth.flick(7, 500)
        this.crowd.react('hen', 'hop')
    }
  }

  private boom(): void {
    this.hopV = 320
    for (const food of this.food) if (!food.held) food.vy = 420
    this.crowd.react('farmer', 'jump')
    this.crowd.react('hen', 'jump')
    this.crowd.react('pig', 'roll')
    this.swingV += 4
    this.shake = 1
    for (const half of this.halves) this.puff('dust', half.x, GROUND - 6, 3)
  }

  /** A new egg, if there is room for it: else it rolls to the farmer, who pockets it. */
  private lay(x: number, y: number): void {
    const egg = newFood('egg', Math.max(FOOD_LEFT, Math.min(FOOD_RIGHT, x)))
    egg.y = y
    if (this.food.length + this.eaten.length >= MAX_FOOD) {
      this.pocketed.push(egg)
      egg.vx = 520
      return
    }
    egg.vx = (x < 590 ? 1 : -1) * 60
    this.food.push(egg)
    this.mark(true)
  }
  /** Eggs on their way to the farmer's pocket: drawn, and nothing else. */
  readonly pocketed: Food[] = []

  private toss(): void {
    this.crowd.react('farmer', 'throw')
    this.say('whoop')
    const kind = this.eaten[0] ?? 'carrot'
    const full = this.food.length >= MAX_FOOD || (this.eaten.length === 0 && this.food.length + this.eaten.length >= MAX_FOOD)
    if (full) {
      // Up and back into his hand.
      const one = newFood(kind, 985)
      one.y = 170
      one.vy = 620
      one.vx = 60
      this.pocketed.push(one)
      return
    }
    if (this.eaten.length > 0) this.eaten.shift()
    const one = newFood(kind, FOOD_RIGHT)
    one.y = 190
    one.vy = 420
    one.vx = -260 - this.chance() * 260
    this.food.push(one)
    this.carrotIn = 0.9
    this.mark(true)
  }

  private dropApple(): void {
    if (this.food.length + this.eaten.length >= MAX_FOOD) return
    const apple = newFood('apple', TREE.x - 50 + this.chance() * 100)
    apple.y = GROUND - TREE.y - 40
    apple.vx = (this.chance() - 0.5) * 160
    this.food.push(apple)
    this.mark(true)
  }

  private dropFood(food: Food, tap: boolean, at: Pt): void {
    food.held = false
    if (tap) { food.vx += (this.chance() < 0.5 ? -1 : 1) * 130; food.vy = 150; this.mark(); return }
    if (at.x > FOOD_RIGHT + 20 && Math.abs(at.x - FARMER.x) < 140 && at.y < GROUND + 10) {
      // Caught in his hat, and tipped out where he stands.
      this.crowd.react('farmer', 'catch')
      this.say('plop')
      food.x = FOOD_RIGHT - 12
      food.y = 130
      food.vx = -60
      food.vy = 60
      food.wait = 0.8
    } else {
      food.vx = Math.max(-700, Math.min(700, food.vx))
      food.vy = 0
    }
    this.mark()
  }

  private call(x: number): void {
    if (this.ended) return
    const free = ([GOOSE, BEAR] as const).filter((who) => !this.held(who))
    if (free.length === 0) return
    const who = free.reduce((a, b) => (Math.abs(this.halves[a].x - x) <= Math.abs(this.halves[b].x - x) ? a : b))
    this.callTo(who, x)
  }

  private callTo(who: Who, x: number): void {
    const half = this.halves[who]
    half.call = Math.max(LEFT, Math.min(RIGHT, x))
    half.sit = false
    half.idle = 0
    this.wake(half)
    this.say('patter', who)
    this.mark(true)
  }

  private callHome(): void {
    if (!this.held(BEAR)) this.callTo(BEAR, 96)
    if (!this.held(GOOSE)) this.callTo(GOOSE, this.held(BEAR) ? 110 : 96 + STABLE_ROOM)
  }

  // --- Costumes --------------------------------------------------------------------

  private tapCostume(peg: number): void {
    const end = this.pegs[peg]
    if (end === null) return
    if (this.ended) { this.flutter[peg] = 1.6; this.say('flap'); return }
    this.say('ping')
    this.wear(peg, partOf(end) === 'head' ? GOOSE : BEAR, { x: pegAt(peg).x, y: pegAt(peg).y + HANG })
  }

  private dropCostume(one: Carried): void {
    this.carried.splice(this.carried.indexOf(one), 1)
    const who = this.over(one.at)
    if (this.ended || who === null) { this.fly(one); return }
    const second = this.halves[1 - who].change >= 0 && this.halves[1 - who].change < 0.5
    this.say(second ? 'snapHigh' : 'snap')
    this.wear(one.peg, who, one.at)
  }

  private over(at: Pt): Who | null {
    if (at.y < LINE_FLOOR) return null
    const direct = this.halfAt(at)
    if (direct !== null) return direct
    let best: Who | null = null, near = 210
    for (const who of [GOOSE, BEAR] as const) {
      const d = Math.hypot(at.x - this.halves[who].x, at.y - (GROUND - this.halves[who].y + BODY.y))
      if (d < near) { near = d; best = who }
    }
    if (best === null && at.x > FARMER.x - 110 && at.y > 250) { this.crowd.react('farmer', 'hum'); this.say('hum') }
    return best
  }

  private toPeg(one: Carried): void {
    this.carried.splice(this.carried.indexOf(one), 1)
    this.fly(one)
  }

  private fly(one: Carried): void {
    this.flights.push({ end: one.end, from: { ...one.at }, peg: one.peg, who: null, t: 0, seconds: 0.5, wait: 0 })
    this.say('flap')
  }

  private wear(peg: number, who: Who, from: Pt): void {
    const half = this.halves[who], end = this.pegs[peg]!
    if (half.change >= 0) this.landChange(half)
    half.old = half.wear
    half.wear = end
    this.pegs[peg] = half.old
    half.change = 0
    half.act = -1
    half.sit = false
    this.flights.push({ end: half.old, from: { x: half.x, y: GROUND - half.y + BODY.y }, peg, who: null, t: 0, seconds: 0.55, wait: 0.06 })
    this.flights.push({ end, from, peg: -1, who, t: 0, seconds: 0.44, wait: 0.22 })
    this.say('pants', who)
    this.crowd.react('hen', 'shake')
    this.mark(true)
  }

  private landChange(half: Half): void {
    const who: Who = half === this.halves[0] ? GOOSE : BEAR
    half.change = -1
    half.squashV += 4
    this.flights = this.flights.filter((flight) => flight.who !== who)
    half.meet = true
  }

  // --- The stable ---------------------------------------------------------------------

  private inside(who: Who): boolean {
    return this.halves[who].x <= STABLE.mouth
  }

  /** Only a lift or an arrival ends the show, when both stand in the stable and no finger has either. */
  private tryEnd(): void {
    if (this.ended || this.held(GOOSE) || this.held(BEAR) || !this.inside(GOOSE) || !this.inside(BEAR)) return
    this.ended = true
    this.night = 0
    this.lieDown()
    this.say('yawn', GOOSE)
    this.crowd.react('cow', 'shake')
    this.mark(true)
  }

  private lieDown(): void {
    for (const half of this.halves) { half.call = null; half.sit = false; half.act = -1; half.vx = half.vy = 0; half.y = 0 }
  }

  private openStable(): void {
    this.ended = false
    this.night = 0
    const [front, rear] = this.halves
    front.x = STABLE.mouth + 4
    rear.x = Math.min(rear.x, STABLE.mouth - 70)
    this.say('door')
    this.callTo(BEAR, 330)
    this.callTo(GOOSE, 600)
    if (this.tied) this.tied = false
    this.mark(true)
  }

  // --- Time -----------------------------------------------------------------------------

  step(dt: number): void {
    if (dt <= 0) return
    this.now += dt
    this.hands.step(dt)
    // Small fixed slices, so a slow frame plays the same game.
    const slices = Math.max(1, Math.ceil(dt / (1 / 60)))
    for (let i = 0; i < slices; i++) this.slice(dt / slices)
    this.cloth.step(dt, this.seam(GOOSE), this.seam(BEAR))
    this.routine(dt)
    this.crowd.step(dt, this.beast())
    this.props(dt)
  }

  private slice(dt: number): void {
    if (this.ended) {
      this.halves.forEach((half, who) => { half.x += ((who === GOOSE ? 150 : 88) - half.x) * Math.min(1, dt * 3) })
      return
    }
    for (const who of [GOOSE, BEAR] as const) this.will(who, dt)
    for (const who of [GOOSE, BEAR] as const) this.body(who, dt)
    this.pull(dt)
    this.apart()
    const tied = this.tied ? this.gap < 40 : this.gap < -70
    if (tied !== this.tied) {
      this.tied = tied
      this.mark()
      if (!tied) this.say('unbow')
    }
    for (const who of [GOOSE, BEAR] as const) this.greet(who)
  }

  /** A half nobody holds has its own nose: it goes where it was called, or where it wants to be. */
  private will(who: Who, dt: number): void {
    const half = this.halves[who], other = this.halves[1 - who]
    if (half.held !== null || half.y > 4 || half.act >= 0 || half.change >= 0 || half.soft) { half.strain *= 1 - dt * 6; return }
    half.idle += dt
    let want: number | null = null, speed: number = WALK[who], strain = 0
    if (half.call !== null) {
      want = half.call
      speed = CALLED[who]
    } else if (half.idle > 1.3) {
      if (who === BEAR) {
        const food = this.nearestFood(half.x)
        if (food && Math.abs(food.x - half.x) > 58) want = Math.max(STABLE.right + 70, food.x)
      } else if (Math.abs(PUDDLE.x - 40 - half.x) > 26) want = PUDDLE.x - 40
      if (want !== null && Math.abs(want - half.x) < 12) want = null
      if (want !== null && !half.sit) {
        const to = Math.sign(want - half.x)
        const pulls = Math.abs(half.x + to * 8 - other.x) > 345 && Math.sign(half.x - other.x) === to
        // Whoever stands in the way is not pushed for it.
        const blocked = other.y < 120 && Math.sign(other.x - half.x) === to && Math.abs(other.x - half.x) < ROOM + 10
        if (pulls || blocked) { strain = 1; want = null }
      } else if (half.sit) {
        want = null
      }
    }
    half.strain += (strain - half.strain) * Math.min(1, dt * 3)
    if (want !== null) {
      const d = want - half.x
      const v = Math.sign(d) * Math.min(speed, Math.abs(d) * 5)
      half.vx += (v - half.vx) * Math.min(1, dt * 9)
      if (half.call !== null && Math.abs(d) < 6) {
        half.call = null
        half.vx = 0
        half.idle = 0
        this.mark()
        this.tryEnd()
      }
    }
    const still = want === null && strain < 0.5 && Math.abs(half.vx) < 30
    const admiring = who === GOOSE && still && Math.abs(PUDDLE.x - 40 - half.x) < 40 && half.idle > 1.6
    half.preen += ((admiring ? 1 : 0) - half.preen) * Math.min(1, dt * 2.2)
    const dozing = who === BEAR && still && half.idle > 3.5 && half.eat < 0
    half.doze += ((dozing ? 1 : 0) - half.doze) * Math.min(1, dt * (dozing ? 0.6 : 5))
  }

  private nearestFood(x: number): Food | null {
    let best: Food | null = null
    for (const one of this.food) if (!one.held && one.wait <= 0 && (!best || Math.abs(one.x - x) < Math.abs(best.x - x))) best = one
    return best
  }

  private wake(half: Half): void {
    half.doze = half.preen = half.strain = 0
  }

  private body(who: Who, dt: number): void {
    const half = this.halves[who]
    const contact = half.held === null ? null : this.hands.contacts.get(half.held) ?? null
    if (half.act >= 0) {
      const act = ACTS[half.wear]
      half.act += (dt / act.seconds) * tempo(who)
      if (!half.acted && half.act >= act.at) { half.acted = true; this.actLands(who) }
      if (half.act >= 1) half.act = -1
    }
    if (contact && half.act < 0 && !contact.moved && contact.seconds > 0.5 && contact.seconds - dt <= 0.5) this.act(who)
    const pose = this.poses[who]
    half.sat += ((half.sit ? 1 : 0) - half.sat) * Math.min(1, dt * 12)
    if (half.act >= 0) actPose(half.wear, half.act, pose)
    else for (const key of POSE_KEYS) pose[key] *= Math.max(0, 1 - dt * 14)
    const wasY = half.y
    if (contact) {
      half.idle = 0
      if (contact.moved) {
        half.call = null
        const tx = Math.max(LEFT, Math.min(RIGHT, contact.at.x + contact.off.x))
        const lift = GROUND - (contact.at.y + contact.off.y)
        const ty = Math.max(0, Math.min(390, lift))
        const vx = Math.max(-2600, Math.min(2600, (tx - half.x) * 22)), vy = Math.max(-2200, Math.min(2200, (ty - half.y) * 20))
        half.vx += (vx - half.vx) * Math.min(1, dt * 40)
        half.vy += (vy - half.vy) * Math.min(1, dt * 40)
        const sit = lift < -42 || (half.sit && lift < -20)
        if (sit !== half.sit) { half.sit = sit; half.squashV += sit ? 4 : -2; this.say('plump', who, this.next()); this.mark() }
        if (wasY < 20 && half.y + half.vy * dt >= 20 && vy > 120) this.say(who === BEAR ? 'grumble' : 'flutter', who)
      } else {
        half.vx *= 1 - Math.min(1, dt * 20)
        half.vy *= 1 - Math.min(1, dt * 20)
      }
    } else {
      if (half.y > 0 || half.vy > 0) half.vy -= (half.soft ? 500 : 2300) * dt
      if (half.soft) half.vy = Math.max(half.vy, -260)
      const walking = half.call !== null || (half.idle > 1.3 && Math.abs(half.vx) < 200)
      if (half.y <= 0 && !walking) half.vx -= Math.sign(half.vx) * Math.min(Math.abs(half.vx), (half.sit ? 2600 : 1500) * dt)
      else if (half.y > 0) half.vx *= 1 - dt * 0.6
      if (half.y <= 0 && walking && half.call === null && half.strain > 0.4) half.vx *= 1 - dt * 8
    }
    half.x += half.vx * dt
    half.y += half.vy * dt
    if (half.x < LEFT) { half.x = LEFT; half.vx = Math.max(0, half.vx) }
    if (half.x > RIGHT) { half.x = RIGHT; half.vx = Math.min(0, half.vx) }
    if (half.y <= 0) {
      if (wasY > 0 && half.vy < -160) this.lands(who, -half.vy)
      half.y = 0
      if (half.vy < 0) half.vy = 0
      half.soft = false
    }
    // The legs.
    if (half.y < 14 && !half.sit) {
      const went = Math.abs(half.vx) * dt
      half.walked += half.vx * dt
      half.foot += went
      if (half.foot > 58) { half.foot %= 58; this.say(partOf(half.wear) === 'head' ? 'clop' : 'shuffle', who, this.next()) }
      if (Math.abs(half.x - PUDDLE.x) < 70 && went > 1.2 && half.foot < 3) this.splash(half.x)
    }
    // Squash and lean, each on a spring.
    half.squashV += (-half.squash * 190 - half.squashV * 13) * dt
    half.squash = Math.max(-0.3, Math.min(0.5, half.squash + half.squashV * dt))
    const lean = Math.max(-0.3, Math.min(0.3, half.vx * 0.00022)) * (half.y > 20 ? 1.6 : 1)
    half.tiltV += ((lean - half.tilt) * 150 - half.tiltV * 15) * dt
    half.tilt += half.tiltV * dt
    if (half.change >= 0) {
      half.change += dt
      if (half.change > 0.72) { this.landChange(half); this.say('plump', who, 1) }
    }
    if (half.eat >= 0) { half.eat += dt / 1.2; if (half.eat >= 1) half.eat = -1 } else if (who === BEAR && half.y < 6 && Math.abs(half.vx) < 70) this.tryEat(half)
  }

  private tryEat(half: Half): void {
    const food = this.food.find((one) => !one.held && one.wait <= 0 && one.y < 24 && Math.abs(one.x - half.x) < 76)
    if (!food) return
    this.food.splice(this.food.indexOf(food), 1)
    this.eaten.push(food.kind)
    half.eat = 0
    half.idle = 0.6
    this.eating = { kind: food.kind, x: food.x }
    this.wake(half)
    this.puff('crumb', food.x, GROUND - 24, 4)
    this.say('munch', BEAR)
    this.mark(true)
  }
  /** What is in the bear's paw. */
  eating: { kind: FoodKind; x: number } | null = null

  private lands(who: Who, speed: number): void {
    const half = this.halves[who]
    half.squashV += Math.min(9, speed * 0.008)
    const n = Math.floor(speed / 300)
    this.puff('dust', half.x, GROUND - 6, 2 + n)
    if (Math.abs(half.x - PUDDLE.x) < 100) this.splash(half.x)
    this.say(partOf(half.wear) === 'head' ? 'thump' : 'plump', who, n)
    if (n > 2) this.hopV = Math.max(this.hopV, 90)
    this.mark()
  }

  private pull(dt: number): void {
    const gap = Math.abs(this.gap), to = Math.sign(this.gap) || 1
    const [front, rear] = this.halves
    for (const who of [GOOSE, BEAR] as const) {
      const half = this.halves[who]
      if (half.held !== null) continue
      const toward = who === GOOSE ? -to : to
      const other = this.halves[1 - who]
      if (gap > SLACK) {
        const force = (gap - SLACK) * (half.sit ? 10 : 24)
        // The heels hold against a small pull.
        if (force > 1400 || half.y > 0 || Math.abs(half.vx) > 260) half.vx += toward * Math.max(0, force - (half.y > 0 ? 0 : 500)) * dt
        half.vx = Math.max(-1700, Math.min(1700, half.vx))
        if (half.call !== null && gap > DRAG_FROM && other.held !== null) half.call = null
      }
      if (other.held !== null && gap > DRAG_FROM) {
        half.x += toward * (gap - DRAG_FROM) * Math.min(1, dt * 12)
        half.sit = false
        half.idle = 0
      }
    }
    // Both walking after a call do not pull each other back.
    if (front.call !== null && rear.call !== null && gap > SLACK) { front.vx *= 0.98; rear.vx *= 0.98 }
    this.snapFor = Math.max(0, this.snapFor - dt)
    this.lastSnap += dt
    if (gap > SLACK + 40 && (this.held(GOOSE) || this.held(BEAR))) {
      this.creak += (Math.abs(front.vx - rear.vx) * dt) / 70
      if (this.creak > 1) { this.creak = 0; this.say('creak', null, Math.min(12, Math.floor((gap - SLACK) / 50))) }
    }
  }

  /** Two that stand unheld never share a place. In the order they stand, each gives way. */
  private apart(): void {
    const [front, rear] = this.halves
    if (front.held !== null && rear.held !== null) return
    if (Math.abs(front.y - rear.y) > 150) return
    const room = front.x < STABLE.right + 60 && rear.x < STABLE.right + 60 ? STABLE_ROOM : ROOM
    // A held half passes the other; it is moved out of the way only when the finger has gone.
    if (front.held !== null || rear.held !== null) return
    const coming = front.call !== null || rear.call !== null
    const gap = this.gap, to = gap === 0 ? 1 : Math.sign(gap)
    const over = room - Math.abs(gap)
    if (over <= 0) return
    const hit = (front.vx - rear.vx) * to
    const give = Math.min(over, 14) / 2
    front.x += to * give
    rear.x -= to * give
    if (front.x > RIGHT) { rear.x -= front.x - RIGHT; front.x = RIGHT }
    if (rear.x > RIGHT) { front.x -= rear.x - RIGHT; rear.x = RIGHT }
    if (front.x < LEFT) { rear.x += LEFT - front.x; front.x = LEFT }
    if (rear.x < LEFT) { front.x += LEFT - rear.x; rear.x = LEFT }
    if (hit < -40) {
      // They bounce off each other.
      const v = (front.vx + rear.vx) / 2
      front.vx = v - (front.vx - v) * 0.45
      rear.vx = v - (rear.vx - v) * 0.45
      if (hit < -320) {
        front.squashV += 4
        rear.squashV += 4
        front.vy = Math.max(front.vy, 130)
        rear.vy = Math.max(rear.vy, 110)
      }
    }
    if (front.call !== null && Math.abs(front.call - front.x) < room) front.call = this.arrive(front, room)
    if (rear.call !== null && Math.abs(rear.call - rear.x) < room) rear.call = this.arrive(rear, room)
    if (front.call === null && rear.call === null && coming) this.tryEnd()
  }

  /** Called to where the other stands: as near as there is room for is there. */
  private arrive(half: Half, room: number): number | null {
    const other = half === this.halves[0] ? this.halves[1] : this.halves[0]
    if (other.call !== null) return half.call
    const blocked = Math.sign(other.x - half.x) === Math.sign(half.call! - half.x) && Math.abs(other.x - half.x) < room + 4
    if (!blocked) return half.call
    half.idle = 0
    this.mark()
    return null
  }

  private greet(who: Who): void {
    const half = this.halves[who]
    if (half.x < MEET - 50) { half.meet = false; return }
    if (half.meet || half.x < MEET || half.y > 110 || half.change >= 0) return
    half.meet = true
    const end = half.wear
    const react: React[] = ['fed', 'buttons', 'hatless', 'snip', 'sneeze', 'egg', 'flat', 'rattle']
    const seconds = [2, 1.8, 2.4, 1.7, 1.5, 1.6, 1.9, 1.6][end]
    this.meeting = { end, who, t: 0, seconds }
    this.crowd.react('farmer', react[end])
    this.say(`meet${end}` as Sound)
    if (end === 0 || end === 3) this.carrotIn = seconds + 0.4
    if (end === 5) {
      if (this.food.length + this.eaten.length < MAX_FOOD) {
        const egg = newFood('egg', FOOD_RIGHT - 20)
        egg.y = 150
        egg.vx = -80
        egg.wait = 1.4
        this.food.push(egg)
        this.mark(true)
      }
    }
  }

  private routine(dt: number): void {
    const [front, rear] = this.halves
    const gap = Math.hypot(this.gap, front.y - rear.y)
    let snapped = false
    if (this.snapFor > 0 && Math.abs(this.gap) < 330) { snapped = true; this.snapFor = 0 }
    this.fired.length = 0
    this.routines.step(dt, { ...seen(front) }, { ...seen(rear) }, this.tied, gap, snapped, front.soft || rear.soft, this.fired)
    for (const routine of this.fired) this.routineHappens(routine)
    // The farmer plucks a cloth that comes past him.
    const mid = this.cloth.x[7]
    if (mid > 760 && !this.plucked) { this.plucked = true; this.crowd.react('farmer', 'pluck'); this.cloth.flick(7, 700); this.say('plunk') }
    if (mid < 700) this.plucked = false
  }

  private routineHappens(routine: Routine): void {
    this.done.push(routine)
    if (this.done.length > 24) this.done.shift()
    this.crowd.routine(routine)
    this.say(routine)
    const [front, rear] = this.halves, mid = { x: this.cloth.x[7], y: this.cloth.y[7] }
    switch (routine) {
      case 'trot': this.swingV += 2; for (const half of this.halves) this.puff('dust', half.x, GROUND - 6, 3); break
      case 'leap': this.hopV = 260; this.dropApple(); for (const food of this.food) if (!food.held && food.y < 5) food.vy = 300; break
      case 'twang': this.swingV += 7; this.cloth.flick(7, 1500); front.squashV += 3; rear.squashV += 3; this.puff('dust', mid.x, mid.y, 6); break
      case 'bow': this.knotV += 5; break
      case 'seesaw': this.swingV += 3; break
      case 'tower': this.dropApple(); this.shake = 1; break
      case 'squash': this.puff('air', mid.x, mid.y + 20, 7, 0); front.vy = Math.max(front.vy, 60); break
      case 'skip': break
    }
  }

  private props(dt: number): void {
    this.knotV += (((this.tied ? 1 : 0) - this.knot) * 160 - this.knotV * 14) * dt
    this.knot += this.knotV * dt
    this.swingV += (-this.swing * 36 - this.swingV * 2.2) * dt
    this.swing += this.swingV * dt
    this.hopV -= 1900 * dt
    this.hop = Math.max(0, this.hop + this.hopV * dt)
    if (this.hop === 0) this.hopV = Math.max(0, this.hopV)
    this.shake = Math.max(0, this.shake - dt * 1.1)
    this.ring = Math.max(0, this.ring - dt * 1.4)
    this.carrotIn = Math.max(0, this.carrotIn - dt)
    for (let i = 0; i < PEGS; i++) this.flutter[i] = Math.max(0, this.flutter[i] - dt * 1.5)
    for (const key of ['farmpost', 'henpost', 'fence'] as const) this.rattle[key] = Math.max(0, this.rattle[key] - dt * 2)
    this.ripples = this.ripples.filter((one) => (one.t += dt) < 0.5)
    if (this.meeting && (this.meeting.t += dt) > this.meeting.seconds) this.meeting = null
    if (this.halves[BEAR].eat < 0) this.eating = null
    for (const flight of this.flights) {
      if (flight.wait > 0) flight.wait -= dt
      else flight.t += dt / flight.seconds
    }
    if (this.flights.some((flight) => flight.t >= 1)) {
      for (const flight of this.flights) if (flight.t >= 1 && flight.peg >= 0) this.flutter[flight.peg] = 1
      this.flights = this.flights.filter((flight) => flight.t < 1)
    }
    for (const one of [...this.carried]) {
      one.vx *= 1 - Math.min(1, dt * 7)
      if (one.id === null && (one.lifted += dt) > LIFT_GRACE_S) this.dropCostume(one)
    }
    for (const food of this.food) this.roll(food, dt)
    for (const one of this.pocketed) {
      one.vy -= 1500 * dt
      one.x += one.vx * dt
      one.y = Math.max(0, one.y + one.vy * dt)
      one.turn += (one.vx * dt) / FOOD_R
    }
    for (let i = this.pocketed.length - 1; i >= 0; i--) if (this.pocketed[i].x > 1040 || (this.pocketed[i].y < 160 && this.pocketed[i].vy < 0 && this.pocketed[i].x > 980 && this.pocketed[i].vx < 100)) this.pocketed.splice(i, 1)
    for (const puff of this.puffs) {
      puff.t += dt / puff.seconds
      puff.x += puff.vx * dt
      puff.y += puff.vy * dt
      puff.vy += (puff.kind === 'drop' || puff.kind === 'crumb' ? 900 : puff.kind === 'leaf' || puff.kind === 'feather' ? 120 : -30) * dt
      puff.turn += dt * 3
    }
    if (this.puffs.some((puff) => puff.t >= 1)) this.puffs = this.puffs.filter((puff) => puff.t < 1)
    // The ending's beats.
    if (this.ended) {
      const was = this.night
      this.night = Math.min(NIGHT_S, this.night + dt)
      const beat = (at: number, sound: Sound, who: Who | null = null): void => { if (was < at && this.night >= at) this.say(sound, who) }
      if (was < NIGHT_S) { beat(0.9, 'yawn', BEAR); beat(2, 'door'); beat(3, 'snoreHigh'); beat(4, 'snoreLow') }
      this.door = Math.max(this.door, Math.min(1, (this.night - 1.8) / 0.6))
    } else {
      this.door = Math.max(0, this.door - dt * 2.4)
    }
  }

  private roll(food: Food, dt: number): void {
    if (food.wait > 0) { food.wait -= dt; return }
    if (food.held) return
    const wasAir = food.y > 2
    food.vy -= 1500 * dt
    food.y += food.vy * dt
    if (food.y <= 0) {
      if (wasAir && food.vy < -140) { this.say('tock', null, Math.floor(-food.vy / 140)); food.vy *= food.kind === 'egg' ? -0.3 : -0.45 } else food.vy = 0
      food.y = 0
      food.vx -= Math.sign(food.vx) * Math.min(Math.abs(food.vx), 190 * dt)
      for (const half of this.halves) {
        if (half.y < 20 && Math.abs(half.vx) > 170 && Math.abs(half.x - food.x) < 66 && Math.sign(food.x - half.x) === Math.sign(half.vx) && Math.abs(food.vx) < Math.abs(half.vx)) {
          food.vx = half.vx * 1.15
          food.vy = 160
          this.say('pip')
        }
      }
    }
    food.x += food.vx * dt
    food.turn += (food.vx * dt) / FOOD_R
    if (food.x < FOOD_LEFT) { food.x = FOOD_LEFT; food.vx = Math.abs(food.vx) * 0.7 }
    if (food.x > FOOD_RIGHT) { food.x = FOOD_RIGHT; food.vx = -Math.abs(food.vx) * 0.7 }
  }

  // --- Small things -----------------------------------------------------------------------

  private splash(x: number): void {
    this.ring = 1
    this.puff('drop', x, PUDDLE.y - 6, 6)
    this.say('splash', null, this.next())
  }

  private ripple(at: Pt): void {
    this.ripples.push({ x: at.x, y: at.y, t: 0 })
    if (this.ripples.length > 5) this.ripples.shift()
  }

  private puff(kind: Puff['kind'], x: number, y: number, n: number, push = 0): void {
    for (let i = 0; i < n; i++) {
      const up = kind === 'drop' || kind === 'crumb' ? 240 : kind === 'leaf' || kind === 'feather' ? -20 : 60
      this.puffs.push({ kind, x: x + (this.chance() - 0.5) * 70, y: y + (this.chance() - 0.5) * (kind === 'leaf' ? 110 : 16), vx: push + (this.chance() - 0.5) * 220, vy: -up * (0.5 + this.chance()), t: 0, seconds: 0.5 + this.chance() * (kind === 'leaf' || kind === 'feather' ? 0.9 : 0.4), size: 6 + this.chance() * 8, turn: this.chance() * 6 })
    }
    if (this.puffs.length > 26) this.puffs.splice(0, this.puffs.length - 26)
  }

  private next(): number {
    this.variant = (this.variant + 1) % 12
    return this.variant
  }

  private say(sound: Sound, who: Who | null = null, n = 0): void {
    // A frame that says very much says the first of it.
    if (this.heard.length < 40) this.heard.push(...notes(sound, who, n))
  }

  private mark(urgent = false): void {
    this.changed = true
    if (urgent) this.urgent = true
  }
}

function seen(half: Half): { x: number; y: number; vx: number; held: boolean } {
  return { x: half.x, y: half.y, vx: half.vx, held: half.held !== null }
}

function same(a: Target, b: Target): boolean {
  if (a.kind === 'costume' && b.kind === 'costume') return a.peg === b.peg
  if (a.kind === 'food' && b.kind === 'food') return a.food === b.food
  if (a.kind === 'watcher' && b.kind === 'watcher') return a.who === b.who
  return a.kind === b.kind
}

function newHalf(saved: Saved['halves'][number]): Half {
  return { x: saved.x, y: 0, vx: 0, vy: 0, wear: saved.wear, sit: saved.sit, held: null, call: null, idle: 0, act: -1, acted: false, squash: 0, squashV: 0, tilt: 0, tiltV: 0, walked: 0, foot: 0, doze: 0, preen: 0, strain: 0, eat: -1, soft: false, sat: saved.sit ? 1 : 0, change: -1, old: saved.wear, meet: false }
}

export function newFood(kind: FoodKind, x: number): Food {
  return { kind: FOODS.includes(kind) ? kind : 'apple', x, y: 0, vx: 0, vy: 0, turn: 0, wait: 0, held: false, home: x }
}

const POSE_KEYS = Object.keys(restPose()) as (keyof Pose)[]
