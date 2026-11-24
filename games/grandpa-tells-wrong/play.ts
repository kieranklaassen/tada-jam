import { COCK, CROWN, LAMP, LIFT, NEARER, SPOT, BAND, THING_AT, isNeighbour, nearest, pictureAt, targetAt, thingHome, type Target } from './layout'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { PROTESTED } from './config'
import { ACT } from './moves'
import { makeRng, pick, type Rng } from './rng'
import { dayLength, nextAsk, nextMorning, putOut, worldOf, type Save } from './save'
import { CAST, DAY, THINGS, after, next, run, same, tellWrong, type Event, type Thing, type Who, type World } from './tale'

// The evening and the day, through fingers in stage units and seconds. The
// save is always the outcome; everything else here is a view of getting there.

export type PlayEvent =
  | { kind: 'lift' | 'throw'; thing: Thing }
  | { kind: 'land'; thing: Thing; who: Who; small: boolean }
  | { kind: 'splat'; thing: Thing; at: Point }
  | { kind: 'poke' | 'snore' | 'protest'; who: Who }
  | { kind: 'mutter'; wide: boolean }
  | { kind: 'change'; thing: Thing | null; who: Who | null }
  | { kind: 'ponder' | 'knock' | 'dusk' | 'cloth' | 'out' | 'unravel' | 'night' | 'crow' | 'duck' | 'astonished' | 'remembers' | 'swap' | 'lamp' }

/** A happening under way in the yard. */
export type Act = { what: Thing; t: number; from: World[Who]; truth: 'plain' | 'lie' | 'mended' }
export type Flight = { thing: Thing; from: Point; to: Point; t: number; lasts: number; who: Who | null; after: 'land' | 'miss' | 'home' }
export type Scene = { kind: 'dusk' | 'telling' | 'lamp' | 'morning'; t: number }

/** When each picture of a telling comes up, and how long the scene is. */
export const TELL = [0.5, 2.8, 5.1] as const
/** How long the last picture of a telling is up before it is hers. */
export const TELL_REST = 2.4
/** The lamp: dark, back to the morning, then the three, then night. */
export const UNRAVEL = [0.7, 2.1] as const
export const HAPPENS = [2.9, 5.4, 7.9] as const
/** How long a picture is in the air before it happens. */
export const CARRY = 0.75
/** His fingers reach the wick. */
export const WICK = 0.35
export const LAMP_REST = 2.6
export const DUSK_LASTS = 2
export const MORNING_LASTS = 2.4
/** A scene this young does not move on for a second tap of the same excitement. */
const YOUNG = 0.6
const LONG_AGO = 99

type Held = { thing: Thing; at: Point; dragging: boolean }

export class Play {
  save: Save
  dirty = false
  time = 0
  readonly acts: Partial<Record<Who, Act>> = {}
  flights: Flight[] = []
  scene: Scene | null = null
  held: Held | null = null
  /** How the yard looked before the lamp, for the unravelling. */
  before: World
  /** What each of the yard shows now. */
  shown: World
  readonly poked: Record<Who, number> = { goose: LONG_AGO, pig: LONG_AGO, granny: LONG_AGO, grandpa: LONG_AGO, moon: LONG_AGO }
  stare = LONG_AGO
  /** Since Grandpa remembered, or his moustache curled. */
  remembered = LONG_AGO
  curled = LONG_AGO
  pondered = LONG_AGO
  lampPoked = LONG_AGO
  cockPoked = LONG_AGO
  clothPoked = { t: LONG_AGO, x: 0 }
  readonly thingPoked: Record<Thing, number> = { mud: LONG_AGO, water: LONG_AGO, jam: LONG_AGO, pillow: LONG_AGO, pants: LONG_AGO, balloon: LONG_AGO }
  /** Seconds into each picture's own little happening. */
  readonly pictureT: number[] = [LONG_AGO, LONG_AGO, LONG_AGO]
  readonly flipped: { who: number; what: number }[] = [0, 1, 2].map(() => ({ who: LONG_AGO, what: LONG_AGO }))
  /** A picture under the finger: which, and how far it has been slid. */
  sliding: { at: number; dx: number } | null = null
  /** Any picture has been touched this evening. */
  meddled = false
  /** Until dusk falls, once the third thing has happened. */
  private wait = 0
  /** Seconds into the round of protests. */
  protestT = LONG_AGO
  private readonly touch = new ForgivingTouch()
  private pressed: Target = { kind: 'yard' }
  private moved = false
  private spent = false
  private events: PlayEvent[] = []
  private readonly rng: Rng

  constructor(save: Save, seed: number) {
    this.save = save
    this.rng = makeRng(seed)
    this.shown = worldOf(save)
    this.before = this.shown
    this.meddled = save.phase === 'told' && !save.told.every((event, i) => same(event, save.first[i]))
  }

  take(): PlayEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  private say(event: PlayEvent): void {
    this.events.push(event)
  }

  /** The band holds the pictures, not the things. */
  get evening(): boolean {
    return this.save.phase !== 'day' && this.wait <= 0
  }
  get night(): boolean {
    return this.save.finished && this.scene?.kind !== 'lamp'
  }
  get touching(): boolean {
    return this.touch.active
  }
  get busy(): boolean {
    return this.scene !== null || this.wait > 0 || this.flights.length > 0 || CAST.some((who) => this.acts[who])
  }
  /** How many pictures the story has. */
  get count(): number {
    return this.save.told.length
  }
  private get tellLasts(): number {
    return TELL[this.count - 1] + TELL_REST
  }
  private get lampLasts(): number {
    return HAPPENS[this.count - 1] + LAMP_REST
  }
  /** Whoever a picture that is up has it wrong about, where he still lets them say so. */
  get wronged(): readonly Who[] {
    const { save } = this
    if (save.phase !== 'told' || save.finished || !PROTESTED.includes(save.position)) return []
    return save.day.filter((event, i) => i < this.up && !same(event, save.told[i])).map((event) => event.who)
  }
  /** Whoever a picture that is up has it wrong of: not they either. */
  get accused(): readonly Who[] {
    if (!this.wronged.length) return []
    return this.save.told.filter((event, i) => i < this.up && event.who !== this.save.day[i].who).map((event) => event.who)
  }
  /** How many pictures are up. */
  get up(): number {
    if (this.save.phase !== 'told') return 0
    if (this.scene?.kind !== 'telling') return this.count
    return TELL.filter((at, i) => i < this.count && this.scene!.t >= at).length
  }
  /** Which picture he is telling, or -1. */
  get telling(): number {
    return this.scene?.kind === 'telling' ? this.up - 1 : -1
  }

  holds(id: number): boolean {
    return this.touch.holds(id)
  }

  /** Where a thing in the hand hangs, and over whom. */
  get over(): Who | null {
    if (!this.held?.dragging || this.save.phase !== 'day') return null
    return nearest({ x: this.held.at.x, y: this.held.at.y + 20 }, (who) => this.shown[who].up, CAST.filter((who) => who !== 'moon'), 26)
  }

  down(id: number, at: Point): void {
    this.run(this.touch.down(id, at, this.time * 1000))
  }
  move(id: number, at: Point): void {
    this.run(this.touch.move(id, at))
  }
  lift(id: number, at: Point): void {
    this.run(this.touch.up(id, at, this.time * 1000))
    this.run(this.touch.letGo())
  }
  cancel(id: number): void {
    this.run(this.touch.cancel(id))
  }
  /** Parked: the touch is over, scenes are where they were going. */
  clear(): void {
    this.run(this.touch.clear())
    // What the child had already let go lands.
    for (const flight of this.flights.filter((one) => one.after === 'land')) this.landed(flight)
    this.flights = []
  }

  private run(gestures: readonly Gesture[]): void {
    for (const gesture of gestures) this.act(gesture)
  }

  private act(gesture: Gesture): void {
    switch (gesture.type) {
      case 'press': return this.press(gesture.at)
      case 'tap': return this.tap(gesture.at)
      case 'dragStart':
        this.moved = true
        if (this.held) this.held.dragging = true
        return
      case 'dragMove': return this.drag(gesture.from, gesture.at)
      case 'dragLift': return
      case 'dragEnd': return this.drop(gesture.at)
      case 'dragCancel':
        if (this.held) this.fly(this.held.thing, this.held.at, null, 'home')
        this.held = null
        this.sliding = null
        return
      case 'pressEnd':
        this.held = null
        this.sliding = null
    }
  }

  private press(at: Point): void {
    this.moved = false
    this.spent = this.moveOn()
    this.pressed = targetAt(at, this.evening, (who) => this.shown[who].up, this.evening, this.count)
    const target = this.pressed
    switch (target.kind) {
      case 'thing':
        this.thingPoked[target.thing] = 0
        this.say({ kind: 'lift', thing: target.thing })
        if (!this.spent && this.save.phase === 'day' && !this.flights.some((one) => one.thing === target.thing && one.after === 'land')) this.held = { thing: target.thing, at, dragging: false }
        return
      case 'who':
        this.poked[target.who] = 0
        this.say({ kind: this.night || (target.who === 'grandpa' && this.save.phase === 'day') ? 'snore' : 'poke', who: target.who })
        return
      case 'puppet':
      case 'prop':
        if (this.up <= target.at) {
          this.clothPoked = { t: 0, x: at.x }
          this.say({ kind: 'cloth' })
        } else if (target.kind === 'puppet') {
          this.flipped[target.at].who = 0.001
          this.say({ kind: 'change', who: this.save.told[target.at].who, thing: null })
        } else {
          this.flipped[target.at].what = 0.001
          this.say({ kind: 'change', who: null, thing: this.save.told[target.at].what })
        }
        return
      case 'lamp':
        this.lampPoked = 0
        this.say({ kind: 'lamp' })
        return
      case 'cock':
        this.cockPoked = 0
        this.say({ kind: 'duck' })
        return
      case 'yard':
        this.knock = { t: 0, at }
        this.say({ kind: 'knock' })
    }
  }
  knock = { t: LONG_AGO, at: { x: 0, y: 0 } }

  private tap(at: Point): void {
    const held = this.held
    this.held = null
    this.sliding = null
    if (this.spent) return
    const target = this.pressed
    switch (target.kind) {
      case 'thing':
        if (held && this.save.phase === 'day') this.fly(held.thing, thingHome(held.thing), this.save.asks, 'land')
        return
      case 'who':
        if (target.who === 'grandpa' && this.evening && !this.save.finished) this.tell()
        return
      case 'puppet':
      case 'prop':
        if (this.save.finished) return
        if (this.save.phase === 'dusk') this.tell()
        else if (this.up > target.at) this.change(target.at, target.kind)
        return
      case 'lamp':
        if (this.save.phase === 'told' && !this.save.finished) this.lamp()
        return
      case 'cock':
        if (this.night) this.newDay()
        return
      case 'yard':
        if (this.save.phase === 'dusk' && this.evening && at.y > BAND.top) this.tell()
        // At night the whole sky wakes the cock.
        if (this.night && at.y < 340) this.newDay()
    }
  }

  private drag(from: Point, at: Point): void {
    if (this.held) {
      this.held.at = at
      return
    }
    const target = this.pressed
    if ((target.kind === 'puppet' || target.kind === 'prop') && !this.spent && !this.save.finished && this.up > target.at && this.save.phase === 'told') {
      this.sliding = { at: target.at, dx: at.x - from.x }
    }
  }

  private drop(at: Point): void {
    const held = this.held, sliding = this.sliding
    const over = this.over
    this.held = null
    this.sliding = null
    if (held) {
      // The one who asks is easy to hit; a thing let go near its shelf just goes back.
      if (over && isNeighbour(over) && this.save.phase === 'day') this.fly(held.thing, at, over, 'land')
      else if (over === 'grandpa') this.fly(held.thing, at, 'grandpa', 'miss')
      else if (Math.hypot(at.x - COCK.x, at.y - COCK.y) < 90) {
        this.cockPoked = 0
        this.say({ kind: 'duck' })
        this.fly(held.thing, at, null, 'home')
      } else if (at.y > 620) this.fly(held.thing, at, null, 'home')
      else this.fly(held.thing, at, null, 'miss')
      return
    }
    if (sliding) {
      const box = pictureAt(sliding.at, this.count)
      const x = box.x + box.width / 2 + sliding.dx
      let to = sliding.at, least = Infinity
      for (let i = 0; i < this.count; i++) {
        const other = pictureAt(i, this.count), d = Math.abs(other.x + other.width / 2 - x)
        if (d < least) { least = d; to = i }
      }
      // Partly done counts: more than a third of the way over to the next.
      if (to === sliding.at && Math.abs(sliding.dx) > 130) to = Math.max(0, Math.min(this.count - 1, to + Math.sign(sliding.dx)))
      if (to !== sliding.at) this.swap(sliding.at, to)
      return
    }
    // A finger that slid off what it pressed is a tap all the same, where the hand is small.
    if (this.moved && (this.pressed.kind === 'lamp' || this.pressed.kind === 'cock' || (this.pressed.kind === 'who' && this.pressed.who === 'grandpa'))) this.tap(at)
  }

  // --- The day -------------------------------------------------------------

  private fly(thing: Thing, from: Point, who: Who | null, then: Flight['after']): void {
    const to = then === 'home' ? thingHome(thing) : who && then === 'land' ? this.crown(who) : who ? this.crown(who) : { x: from.x, y: Math.min(608, from.y + 190) }
    const far = Math.hypot(to.x - from.x, to.y - from.y)
    if (then === 'land') this.say({ kind: 'throw', thing })
    this.flights = this.flights.filter((flight) => flight.thing !== thing)
    this.flights.push({ thing, from: { ...from }, to, t: 0, lasts: then === 'miss' && !who ? 0.3 : Math.min(0.5, 0.16 + far / 1600), who, after: then })
  }

  crown(who: Who): Point {
    const at = SPOT[who], c = CROWN[who], lift = this.shown[who].up ? LIFT[who] : 0
    const k = who === this.save.asks && this.save.phase === 'day' ? NEARER : 1
    return { x: at.x + c.x * k, y: at.y + c.y * k - lift }
  }

  private landed(flight: Flight): void {
    const { thing, who } = flight
    if (flight.after === 'miss') {
      if (who === 'grandpa') {
        this.poked.grandpa = 0
        this.say({ kind: 'snore', who: 'grandpa' })
      } else this.say({ kind: 'splat', thing, at: flight.to })
      this.fly(thing, flight.to, null, 'home')
      return
    }
    if (flight.after === 'land' && who && this.save.phase === 'day' && this.save.day.length < dayLength(this.save)) this.happen({ who, what: thing })
  }

  private happen(event: Event): void {
    const save = this.save
    save.day = [...save.day, event]
    save.asks = nextAsk(save.asks)
    this.start(event, 'plain')
    if (save.day.length === dayLength(save)) {
      save.first = tellWrong(save.day, save.position, (from) => pick(this.rng, from))
      save.told = save.first.map((one) => ({ ...one }))
      save.phase = 'dusk'
      this.wait = ACT + 0.5
      this.meddled = false
    }
    this.dirty = true
  }

  private start(event: Event, truth: Act['truth']): void {
    this.acts[event.who] = { what: event.what, t: 0, from: this.shown[event.who], truth }
    this.shown = { ...this.shown, [event.who]: after(this.shown[event.who], event.what) }
    this.say({ kind: 'land', thing: event.what, who: event.who, small: false })
  }

  // --- The evening ---------------------------------------------------------

  private tell(): void {
    this.save.phase = 'told'
    this.dirty = true
    this.pictureT.fill(LONG_AGO)
    this.scene = { kind: 'telling', t: 0 }
  }

  private change(at: number, piece: 'puppet' | 'prop'): void {
    const told = this.save.told.map((event) => ({ ...event }))
    if (piece === 'puppet') told[at].who = next(CAST, told[at].who)
    else told[at].what = next(THINGS, told[at].what)
    this.save.told = told
    this.dirty = true
    this.meddled = true
    this.pondered = 0
    this.pictureT[at] = 0
    this.say({ kind: 'land', thing: told[at].what, who: told[at].who, small: true })
    this.say({ kind: 'ponder' })
  }

  private swap(a: number, b: number): void {
    const told = this.save.told.map((event) => ({ ...event }))
    ;[told[a], told[b]] = [told[b], told[a]]
    this.save.told = told
    this.dirty = true
    this.meddled = true
    this.pondered = 0
    this.pictureT[a] = 0
    this.pictureT[b] = 0
    this.say({ kind: 'swap' })
    this.say({ kind: 'ponder' })
  }

  private lamp(): void {
    this.before = this.shown
    this.save = putOut(this.save)
    this.dirty = true
    this.scene = { kind: 'lamp', t: 0 }
    this.say({ kind: 'out' })
  }

  private newDay(): void {
    this.save = nextMorning(this.save)
    this.shown = worldOf(this.save)
    this.dirty = true
    this.meddled = false
    this.scene = { kind: 'morning', t: 0 }
    this.say({ kind: 'crow' })
  }

  /** A touch moves a scene on to its next beat. Returns whether the touch was spent on that. */
  private moveOn(): boolean {
    const scene = this.scene
    if (!scene) return false
    if (scene.t < YOUNG) return true
    if (scene.kind === 'telling') {
      const at = TELL.slice(0, this.count).find((t) => t > scene.t)
      this.to(scene, at ?? this.tellLasts)
    } else if (scene.kind === 'lamp') {
      const at = [UNRAVEL[0], ...HAPPENS.slice(0, this.count)].find((t) => t > scene.t + 0.01)
      this.to(scene, at ?? this.lampLasts)
    } else this.to(scene, 99)
    return true
  }

  private to(scene: Scene, t: number): void {
    const from = scene.t
    scene.t = t
    this.cues(scene, from)
  }

  /** Whatever falls due between `from` and the scene's time now. */
  private cues(scene: Scene, from: number): void {
    const due = (at: number): boolean => from < at && scene.t >= at
    if (scene.kind === 'dusk' && scene.t >= DUSK_LASTS) this.tell() // He cannot wait; opened again later, he waits to be asked.
    else if (scene.kind === 'morning' && scene.t >= MORNING_LASTS) this.scene = null
    else if (scene.kind === 'telling') {
      TELL.forEach((at, i) => {
        if (i >= this.count || !due(at)) return
        this.pictureT[i] = 0
        this.say({ kind: 'mutter', wide: i === 1 })
        this.say({ kind: 'land', thing: this.save.told[i].what, who: this.save.told[i].who, small: true })
      })
      if (scene.t >= this.tellLasts) this.scene = null
    } else if (scene.kind === 'lamp') {
      if (due(UNRAVEL[0])) this.say({ kind: 'unravel' })
      if (due(UNRAVEL[1])) this.shown = { ...this.save.base }
      HAPPENS.forEach((at, i) => {
        if (i >= this.count || !due(at)) return
        const { base, told, day, first } = this.save
        this.shown = run(base, told.slice(0, i))
        for (const who of CAST) delete this.acts[who]
        const truth = !same(told[i], day[i]) ? 'lie' : !same(first[i], day[i]) ? 'mended' : 'plain'
        this.start(told[i], truth)
        if (truth === 'lie') {
          this.stare = -0.5
          this.curled = -0.5
          this.say({ kind: 'astonished' })
        } else if (truth === 'mended') {
          this.remembered = -0.5
          this.say({ kind: 'remembers' })
        }
      })
      if (scene.t >= this.lampLasts) {
        this.scene = null
        this.shown = worldOf(this.save)
        for (const who of CAST) delete this.acts[who]
        this.say({ kind: 'night' })
      }
    }
  }

  step(dt: number): void {
    this.time += dt
    for (const who of CAST) {
      this.poked[who] += dt
      const act = this.acts[who]
      if (act && (act.t += dt) > ACT) delete this.acts[who]
    }
    for (const thing of THINGS) this.thingPoked[thing] += dt
    for (let i = 0; i < DAY; i++) {
      this.pictureT[i] += dt
      this.flipped[i].who += dt
      this.flipped[i].what += dt
    }
    this.stare += dt
    this.remembered += dt
    this.curled += dt
    this.pondered += dt
    this.lampPoked += dt
    this.cockPoked += dt
    this.clothPoked.t += dt
    this.knock.t += dt
    const flying = this.flights
    this.flights = []
    for (const flight of flying) {
      flight.t += dt
      if (flight.t >= flight.lasts) this.landed(flight)
      else this.flights.push(flight)
    }
    if (this.wait > 0 && (this.wait -= dt) <= 0) {
      this.wait = 0
      this.scene = { kind: 'dusk', t: 0 }
      this.say({ kind: 'dusk' })
    }
    this.protests(dt)
    const scene = this.scene
    if (scene) {
      const from = scene.t
      scene.t += dt
      this.cues(scene, from)
    }
    this.run(this.touch.advance(this.time * 1000))
  }

  /** A protest comes a moment after the picture has shown its lie, and now and then while it stands. */
  private protests(dt: number): void {
    const wronged = this.wronged
    const shown = this.pictureT.every((t) => t > 1.3)
    if (!wronged.length || !shown || this.scene?.kind === 'lamp') {
      this.protestT = LONG_AGO
      this.sinceProtest = LONG_AGO
      return
    }
    this.protestT += dt
    this.sinceProtest += dt
    if (this.sinceProtest > 4.5) {
      const first = this.sinceProtest > LONG_AGO / 2
      this.protestT = 0
      this.sinceProtest = 0
      // Said aloud once for each change; after that it is only shown.
      if (first) for (const who of new Set(wronged)) this.say({ kind: 'protest', who })
    }
  }
  private sinceProtest = LONG_AGO

  /** Where a thing is now: on its shelf, in the hand, or on its way. Null when it has just been emptied over someone. */
  thingAt(thing: Thing): { at: Point; tip: number; held: boolean } {
    if (this.held?.thing === thing && this.held.dragging) return { at: { x: this.held.at.x, y: this.held.at.y - 62 }, tip: 0, held: true }
    const flight = this.flights.find((one) => one.thing === thing)
    if (!flight) return { at: THING_AT(THINGS.indexOf(thing)), tip: 0, held: false }
    const k = flight.t / flight.lasts
    const arc = flight.after === 'miss' ? 0 : Math.sin(k * Math.PI) * 90
    return { at: { x: flight.from.x + (flight.to.x - flight.from.x) * k, y: flight.from.y + (flight.to.y - flight.from.y) * k - arc }, tip: flight.after === 'land' ? k * 2.4 : 0, held: true }
  }
}

/** One move the idle guide shows: never an answer. */
export function demoMove(play: Play, index: number): { from: Point; to: Point | null; thing?: Thing } {
  if (play.save.finished) return { from: COCK, to: null }
  if (play.save.phase === 'dusk') return { from: { x: SPOT.grandpa.x, y: SPOT.grandpa.y - 190 }, to: null }
  if (play.save.phase === 'told') {
    const box = pictureAt(play.count > 1 ? 1 : 0, play.count)
    if (index === 1 || play.meddled) return { from: LAMP, to: null }
    if (index === 3 && play.count > 2) return { from: { x: box.x + box.width / 2, y: box.y + 80 }, to: { x: box.x + box.width * 1.5, y: box.y + 80 } }
    return { from: { x: box.x + box.width * 0.26, y: box.y + 80 }, to: null }
  }
  const thing = THINGS[(THINGS.indexOf('mud') + index + play.save.day.length) % THINGS.length]
  const who = play.save.asks
  return { from: thingHome(thing), to: { x: SPOT[who].x, y: SPOT[who].y - 150 }, thing }
}
