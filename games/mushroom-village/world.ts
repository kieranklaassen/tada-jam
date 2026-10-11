import { hup, land as lands, mossStep, splashDown, stone, wade, type Answer, type Face, type Kick, type PebbleMove, type Speck } from './answers'
import type { Note } from './audio'
import { crossing, hopLift, type Crossing } from './crossing'
import { CART, GNOMES, SEATS, SNAIL, atLog, groundAt, kindAt, onBody, onCart, onHat, onSnail, onSun, onSunAsleep, stepOff, type GnomeId, type Kind, type Under } from './ground'
import type { Point } from './input'
import { along, leadsTo, lengthOf, pebbleAt, reachable, route, type Path } from './paths'
import { makeRng, type Rng } from './rng'
import type { Homes, MushroomSave, Showing, VillageSave } from './save'
import type { Scene } from './scene'
import { FINGER, bodyBox, chimneyOf, doorBox, hatHit, inBox, shapeOf, stepAt, topOf } from './shapes'
import { settle, spring, stepSpring, type Spring } from './spring'
import { hatStaysOut, whoMovesIn, type HouseFacts } from './tastes'

// The glade as it stands and as it is seen. What is kept (mushrooms and their
// doors, pebbles, who lives where, the hat on the step, night, the showings
// that have started) and what is only seen (springs, specks, a gnome on his
// way, a door in the air) are two things here: a scene saves its end when it
// starts and the screen arrives there beat by beat. This file holds the state
// and the one engine that plays an answer's beats on game time, pushing what
// is seen and queueing what is heard in the same call. No renderer and no
// sound device.

export type Mushroom = MushroomSave & {
  kind: Kind
  /** Painted the other way round, so two of a kind and a size are not twins. */
  flip: boolean
  /** The size as it is seen: it chases `size` on a spring, so a step is a swell and not a jump. */
  seen: Spring
  /** Below 0 squashed, above 0 stretched. */
  squash: Spring
  /** Radians, about the foot. */
  swing: Spring
  /** A puffball's breath: 1 full of air, below 0 sagging. */
  puff: Spring
  /** Units a pulling finger has stretched it. */
  pull: number
  /** Whether its door is seen in it: not while the door is in a hand or still on its way from the cart. */
  doorSeen: boolean
  /** How far its chimney or its rope ladder is out, 0 to 1. */
  built: Spring
  /** How brightly its window is lit, 0 to 1. */
  glow: Spring
  /** A push on whoever shows in its window. */
  jerk: Spring
}

/** A gnome as he is seen: on the log, on his way, or behind his window. */
export type GnomeLive = {
  hop: Spring
  hatBend: Spring
  hatUp: Spring
  press: Spring
  rise: Spring
  lean: Spring
  nod: Spring
  face: Face | null
  faceLeft: number
  riseLeft: number
  /** Both hands on his bare head. */
  hands: boolean
  where: 'log' | 'out' | 'home'
  /** Where his feet are while he is out, and how big he is painted there (1 on the log). */
  at: Point
  scale: number
  facing: 1 | -1
  /** Units walked, which his steps are counted from. */
  walked: number
  /** 0 upright, 1 down on hands and knees. */
  low: number
  sat: boolean
  /** 1 seen, 0 gone in through a door. */
  fade: number
  /** Walking in his sleep. */
  asleep: boolean
  /** A bucket with water in it. */
  carries: boolean
  /** Units a finger has pulled his hat up. */
  hatPull: number
  /** Out on the moss without his hat: it lies on his doorstep. */
  bare: boolean
}

/** How big a gnome is painted on the moss, against 1 on the log. */
export const WALKER = 0.36

/** Units a second each gnome walks: his own pace. */
export const PACE: Readonly<Record<GnomeId, number>> = { tall: 90, baker: 150, sleepy: 60, sneezy: 120 }

/** Seconds a gnome takes from the moss up onto his seat. */
export const JUMP_S = 0.6

/**
 * A gnome on his way back to the log over the moss, seen and kept nowhere: his house went, his door was taken, or
 * the child sent another in his place. In the kept village he waits on the log from the act that sent him back.
 */
export type Walker = { who: GnomeId; way: Point[]; length: number; gone: number; up: number; held: boolean; plan: Crossing; next: number }

/** A gnome on his way back takes pebbles that begin this near his feet. */
const PEBBLES_NEAR = 44

/** What marks an answer as a villager's own doing and no answer to the child: it never counts as the child's touch. */
export const OWN = 'own'
/** What every answer a scene starts is marked with, so a touch can stop them all. */
export const SCENE = 'scene'

/** A mushroom that has come out and is diving back into the earth: seen for a moment, kept nowhere. */
export type Leaving = { kind: Kind; size: number; x: number; y: number; flip: boolean; pull: number; age: number }
export type SpeckInAir = { what: Speck; x: number; y: number; vx: number; vy: number; age: number; life: number; size: number }
export type Ring = { x: number; y: number; age: number }
export type Frog = { x: number; y: number; along: number; up: Spring; squash: Spring; leaving: boolean }
export type PebbleStir = { x: number; y: number; move: PebbleMove; age: number }

/**
 * A short-lived thing an answer sets going and its beats move on by naming the next phase: a cap that peeks out,
 * a door on its way, a gate, a raft, a pebble that hops up where no more can be laid, pebbles rolling away.
 */
export type Prop = {
  what: 'peek' | 'slip' | 'flight' | 'gate' | 'raft' | 'knocked' | 'loose' | 'rolling' | 'hatOut' | 'hatRock' | 'spot' | 'toss'
  x: number
  y: number
  age: number
  life: number
  phase: string
  /** Seconds since the phase began. */
  since: number
  kind?: Kind
  who?: GnomeId
  to?: Point
  points?: readonly Point[]
  id?: number
}

/** What a beat belongs to. More than one may be named: a gnome who is handed a door and the door. */
export type Target = { mushroom?: number; gnome?: GnomeId; everyGnome?: true; at?: Point; sun?: true; snail?: true; frog?: true; cart?: true; hat?: true; prop?: Prop; pebble?: Point }

type Playing = { answer: Answer; t: number; next: number; on: Target; tag: string }
type Later = { at: number; run: () => void; tag: string }

export type Change = 'none' | 'small' | 'now'

/** What a finger is doing. Every kind ends with the finger: none outlives its touch. */
export type Hold =
  | { on: 'mushroom'; id: number; fresh: boolean; t: number; age: number; grew: boolean; steps: number; from: Point; pulling: boolean; loose: boolean; notch: number; viaDoor: boolean }
  | { on: 'gnome'; who: GnomeId; hat: boolean; t: number; count: number; from: Point; notch: number; swap: boolean }
  | { on: 'walker'; who: GnomeId; t: number; count: number }
  | { on: 'water'; at: Point; along: number; t: number; croaks: number; notch: number; drawn: boolean }
  | { on: 'sun'; t: number; hums: number; from: Point; pulling: boolean; notch: number }
  | { on: 'pebble'; path: number; index: number; t: number; held: boolean; from: Point; lifting: boolean; notch: number; loose: boolean; looseFor: number }
  | { on: 'cart'; from: Point }
  | { on: 'door'; from: 'cart' | number; at: Point }
  | { on: 'stroke'; path: number; last: Point; laid: Point; blocked: boolean; gnome: GnomeId | null; arrived: number[]; met: string[]; walk: GnomeId | null }
  | { on: 'ground'; from: Point }
  | { on: 'nothing' }

/** One beat as it fired: what the sync test reads. */
export type Fired = { sound: boolean; moved: boolean; what: string }

const live = (): GnomeLive => ({
  hop: spring(0, 240, 13), hatBend: spring(0, 120, 7), hatUp: spring(0, 150, 9), press: spring(0, 160, 16), rise: spring(0, 60, 9), lean: spring(0, 50, 9), nod: spring(0, 90, 8),
  face: null, faceLeft: 0, riseLeft: 0, hands: false, where: 'log', at: { x: 0, y: 0 }, scale: 1, facing: 1, walked: 0, low: 0, sat: false, fade: 1, asleep: false, carries: false, hatPull: 0, bare: false,
})

export const keyOf = (p: Point): string => p.x + ',' + p.y

/** A puffball this near a house is near it. */
export const PUFF_NEAR = 170

export class World {
  t = 0
  mushrooms: Mushroom[] = []
  paths: Path[]
  homes: Homes
  hatOff: boolean
  /** Whether the hat is seen lying on the step: from the moment he crawls in, and for as long as it is kept there. */
  hatSeen = false
  night: boolean
  shown: Showing[]
  readonly base: Pick<VillageSave, 'v' | 'position' | 'finished'>

  readonly gnomes: Record<GnomeId, GnomeLive> = { tall: live(), baker: live(), sleepy: live(), sneezy: live() }
  readonly sun = { spin: spring(0, 0, 1.6), squash: spring(0, 220, 12), cheeks: spring(0, 120, 12), drop: 0, pull: 0 }
  readonly snail = { eyes: [spring(0, 90, 11), spring(0, 90, 11)] as const, squash: spring(0, 200, 12), x: SNAIL.x as number, y: SNAIL.y as number, facing: 1 as 1 | -1, lamp: false, crawled: 0 }
  readonly cart = { x: CART.x as number, there: false, hop: spring(0, 220, 11) }
  /** How far the night has been painted over the sky, 0 to 1, and whether it is being painted on or off. */
  dark = 0
  /** Pebbles that are kept and not yet seen: a scene lays them one by one. */
  unlaid = new Set<string>()
  leaving: Leaving[] = []
  props: Prop[] = []
  specks: SpeckInAir[] = []
  rings: Ring[] = []
  stirs: PebbleStir[] = []
  frog: Frog | null = null
  /** The water a finger has drawn up: where, and how high. */
  column: { x: number; y: number; up: number } | null = null
  /** The pebble a finger rests on or lifts its path by. */
  seesaw: { path: number; index: number; sink: number; lift: number; loose: boolean } | null = null
  doorInHand: Point | null = null
  hatRock = spring(0, 160, 6)

  hold: Hold | null = null
  finger: Point | null = null
  interest: { at: Point; left: number } | null = null
  readonly dimple = { x: 0, y: 0, depth: spring(0, 260, 22), on: false }
  scene: Scene | null = null
  /** The scene that is playing is a villager's own doing (the baker going for water), and no answer to the child. */
  sceneOwn = false
  /** Game time up to which what the child's touch set off is still going. */
  childUntil = 0
  /** A scene was ended by a touch or a put-away since the Mount last asked: what was ringing of it is to be silenced. */
  cut = false
  walkers: Walker[] = []
  /** The move-in the scene is showing, when it is one: a tap on a gnome who waits can send that gnome instead. */
  movingIn: { who: GnomeId; house: number } | null = null
  /** Seconds of quiet play since the baker last fetched water, the sneezy one last sneezed indoors, the sleepy one last snored, a chimney last smoked. */
  readonly since = { fetch: 0, sneeze: 0, snore: 0, smoke: 0, full: 0 }

  private playing: Playing[] = []
  private later: Later[] = []
  notes: Note[] = []
  /** The notes of a scene, kept apart: they go through a gain of their own, which the touch that ends the scene closes. */
  sceneNotes: Note[] = []
  change: Change = 'none'
  fired: Fired[] = []
  readonly rng: Rng
  /** The most specks in the air at once: a quality tier sets it, and it changes nothing but what is drawn. */
  maxSpecks = 60

  constructor(save: VillageSave, seed: number) {
    this.base = { v: save.v, position: save.position, finished: save.finished }
    this.rng = makeRng(seed)
    for (const kept of save.mushrooms) this.mushrooms.push(this.grown(kept))
    this.paths = save.paths.map((path) => path.map(({ x, y }) => ({ x, y })))
    this.homes = { ...save.homes }
    this.hatOff = save.hatOff
    this.night = save.night
    this.shown = [...save.shown]
    // As it was left: every mushroom stands at its size, everyone is where he lives, and nothing eases in.
    this.land(true)
  }

  grown(kept: MushroomSave): Mushroom {
    return {
      ...kept, kind: kindAt(kept.x, kept.y), flip: kept.id % 2 === 0, seen: spring(kept.size, 150, 15), squash: spring(0, 230, 11), swing: spring(0, 130, 6.5), puff: spring(0, 90, 12), pull: 0,
      doorSeen: kept.door, built: spring(kept.door ? 1 : 0, 170, 13), glow: spring(0, 60, 11), jerk: spring(0, 180, 9),
    }
  }

  toSave(): VillageSave {
    return {
      ...this.base,
      mushrooms: this.mushrooms.map(({ id, x, y, size, door }) => ({ id, x, y, size, door })),
      paths: this.paths.filter((path) => path.length > 0).map((path) => path.map(({ x, y }) => ({ x, y }))),
      homes: { ...this.homes },
      hatOff: this.hatOff,
      night: this.night,
      shown: [...this.shown],
    }
  }

  touched(change: 'small' | 'now'): void {
    if (change === 'now' || this.change === 'none') this.change = change
  }

  // -------------------------------------------------------------- who and what

  find(id: number | null): Mushroom | undefined {
    return id === null ? undefined : this.mushrooms.find((m) => m.id === id)
  }

  occupant(m: Mushroom): GnomeId | null {
    return GNOMES.find((who) => this.homes[who] === m.id) ?? null
  }

  houseOf(who: GnomeId): Mushroom | undefined {
    return this.find(this.homes[who])
  }

  waiting(): GnomeId[] {
    return GNOMES.filter((who) => this.homes[who] === null)
  }

  facts(m: Mushroom): HouseFacts {
    return {
      kind: m.kind, size: m.size, pathLeads: leadsTo(this.paths, stepAt(m)),
      puffNear: m.kind === 'puff' || this.mushrooms.some((other) => other !== m && other.kind === 'puff' && Math.hypot(other.x - m.x, other.y - m.y) <= PUFF_NEAR),
    }
  }

  /** The pebbles from the log to a mushroom's doorstep, or null when none lead there. */
  routeTo(m: Mushroom): Point[] | null {
    const step = stepAt(m)
    return route(this.paths, (p) => atLog(p.x, p.y), (p) => Math.hypot(p.x - step.x, p.y - step.y) <= 34)
  }

  /**
   * Every house with a door and nobody in it that a gnome who waits can reach gets its gnome, in the order the
   * houses were built. This is the kept village only: who is seen where is the scene's affair.
   */
  assign(): { who: GnomeId; house: Mushroom; way: Point[] | null }[] {
    const moved: { who: GnomeId; house: Mushroom; way: Point[] | null }[] = []
    for (const house of [...this.mushrooms].sort((a, b) => a.id - b.id)) {
      if (!house.door || this.occupant(house)) continue
      const way = this.routeTo(house)
      const who = whoMovesIn(this.waiting(), this.facts(house), way ? way[0].x : null)
      if (!who) continue
      this.homes[who] = house.id
      if (who === 'tall') this.hatOff = hatStaysOut(house.size)
      moved.push({ who, house, way })
      this.change = 'now'
    }
    return moved
  }

  /** The top of a mushroom as it stands, pulled or not: where its spores and its smoke come from. */
  topOf(m: Mushroom, smoke = false): Point {
    const side = m.flip ? -1 : 1
    if (smoke && m.kind === 'red') {
      const chimney = chimneyOf(m.size)
      return { x: m.x + side * chimney.x, y: m.y + chimney.top }
    }
    const top = topOf(m.kind, m.size), shape = shapeOf(m.kind, m.size)
    return m.kind === 'bell' ? { x: m.x + side * shape.lean, y: m.y - shape.height * 0.45 - m.pull } : { x: m.x + side * top.x, y: m.y + top.y * 0.85 - m.pull }
  }

  /** Where a gnome is, for what his beats throw: over his seat, or where he walks. */
  placeOf(who: GnomeId): Point {
    const g = this.gnomes[who]
    if (g.where === 'out') return { x: g.at.x, y: g.at.y - 60 * g.scale * 2.4 }
    const house = g.where === 'home' ? this.houseOf(who) : undefined
    return house ? this.topOf(house) : { x: SEATS[who].x, y: SEATS[who].y - 150 }
  }

  // -------------------------------------------------------------- what lies under a finger

  /** What a finger meets at a point, the thing in front first: each is touched where the frame draws it. */
  hit(x: number, y: number): Hit {
    if (this.night && onSunAsleep(x, y)) return { what: 'sun' }
    // A hat is in front of whoever sits beside it: every hat is asked before any body.
    for (const who of GNOMES) if (this.gnomes[who].where === 'log' && onHat(who, x, y)) return { what: 'gnome', who, hat: true }
    for (const who of GNOMES) if (this.gnomes[who].where === 'log' && onBody(who, x, y)) return { what: 'gnome', who, hat: false }
    if (onSnail(x, y)) return { what: 'snail' }
    if (this.cart.there && onCart(x, y)) return { what: 'cart' }
    // A gnome on his way back to the log is touched as himself, where he walks.
    for (const walker of this.walkers) if (inBox(this.walkerBox(walker.who), x, y)) return { what: 'walker', who: walker.who }
    const hatHouse = this.hatSeen ? this.houseOf('tall') : undefined
    if (hatHouse && inBox(hatHit(hatHouse), x, y)) return { what: 'hat', house: hatHouse }
    for (const m of [...this.mushrooms].sort((a, b) => b.y - a.y || b.id - a.id)) {
      if (m.door && inBox(doorBox(m), x, y)) return { what: 'door', mushroom: m }
      if (inBox(bodyBox(m), x, y)) return { what: 'mushroom', mushroom: m }
    }
    const pebble = pebbleAt(this.paths, x, y)
    if (pebble) return { what: 'pebble', ...pebble }
    if (!this.night && onSun(x, y)) return { what: 'sun' }
    return groundAt(x, y)
  }

  /** The shape a gnome who is out on the moss is touched in: himself as he is painted there, and never less than a finger each way. */
  walkerBox(who: GnomeId): { x0: number; y0: number; x1: number; y1: number } {
    const g = this.gnomes[who], seat = SEATS[who]
    const half = Math.max(FINGER / 2, seat.half * g.scale), up = Math.max(FINGER, (seat.y - seat.top) * g.scale)
    return { x0: g.at.x - half, y0: g.at.y - up, x1: g.at.x + half, y1: g.at.y + 8 }
  }

  // -------------------------------------------------------------- the one clock

  /** The id a mushroom grown now gets: one more than the highest in the village. */
  nextId(): number {
    return this.mushrooms.reduce((most, m) => Math.max(most, m.id), 0) + 1
  }

  /** Starts an answer. Its beats at the start are played here and now, so the first of them falls inside the touch. */
  play(answer: Answer, on: Target, delay = 0, tag = ''): void {
    const playing: Playing = { answer, t: -delay, next: 0, on, tag }
    // What a villager does by himself is no touch of the child's: it leaves the idle ladder where it is.
    if (tag !== OWN && !(tag === SCENE && this.sceneOwn) && answer.length > 0) this.childUntil = Math.max(this.childUntil, this.t + delay + answer[answer.length - 1].at + 0.4)
    this.fire(playing)
    if (playing.next < answer.length) this.playing.push(playing)
  }

  /** Something seen that follows by itself after a moment of game time. It changes only what is seen and heard, never what is kept. */
  after(delay: number, run: () => void, tag = ''): void {
    this.childUntil = Math.max(this.childUntil, this.t + delay)
    this.later.push({ at: this.t + delay, run, tag })
  }

  /** Whatever is still playing for a thing stops: a mushroom that is pulled, a path that is lifted, a scene a touch ended. */
  hush(match: (on: Target, tag: string) => boolean): void {
    this.playing = this.playing.filter((p) => !match(p.on, p.tag))
  }

  hushTag(tag: string): void {
    this.playing = this.playing.filter((p) => p.tag !== tag)
    this.later = this.later.filter((l) => l.tag !== tag)
  }

  get sounding(): boolean {
    return this.playing.length > 0 || this.later.length > 0
  }

  stepPlaying(dt: number): void {
    for (const p of [...this.playing]) {
      p.t += dt
      this.fire(p)
    }
    this.playing = this.playing.filter((p) => p.next < p.answer.length)
    const due = this.later.filter((l) => l.at <= this.t)
    if (due.length > 0) {
      this.later = this.later.filter((l) => l.at > this.t)
      for (const l of due) l.run()
    }
  }

  private fire(p: Playing): void {
    while (p.next < p.answer.length && p.answer[p.next].at <= p.t) {
      const beat = p.answer[p.next++]
      const moved = beat.kick ? this.kick(beat.kick, p.on) : false
      if (beat.notes) for (const note of beat.notes) (p.tag === SCENE ? this.sceneNotes : this.notes).push(note)
      this.fired.push({ sound: (beat.notes?.length ?? 0) > 0, moved, what: Object.keys(p.on).join('+') })
      if (this.fired.length > 400) this.fired.splice(0, 200)
    }
  }

  // -------------------------------------------------------------- what a beat pushes

  /** Pushes what a beat names on the thing it belongs to, and says whether anything took the push. */
  kick(kick: Kick, on: Target): boolean {
    let moved = false
    if (on.prop && kick.phase !== undefined) {
      on.prop.phase = kick.phase
      on.prop.since = 0
      moved = true
    }
    const m = on.mushroom === undefined ? undefined : this.find(on.mushroom)
    if (m) {
      if (kick.squash !== undefined) { m.squash.velocity += kick.squash; moved = true }
      if (kick.hop !== undefined) { m.squash.velocity += kick.hop; moved = true }
      if (kick.swing !== undefined) { m.swing.velocity += kick.swing * (m.flip ? -1 : 1); moved = true }
      if (kick.puff !== undefined) { m.puff.target = kick.puff; moved = true }
      if (kick.build !== undefined) { m.built.target = kick.build; moved = true }
      if (kick.glow !== undefined) { m.glow.target = kick.glow; moved = true }
      if (kick.jerk !== undefined) { m.jerk.velocity += kick.jerk; m.squash.velocity += kick.jerk * 0.12; moved = true }
      if (kick.specks) { this.throwSpecks(kick.specks, this.topOf(m, kick.specks.what === 'smoke')); moved = true }
      if (kick.phase === 'hat') { this.props.push({ what: 'hatOut', x: m.x, y: m.y, age: 0, life: 0.9, phase: 'hat', since: 0, id: m.id }); moved = true }
      if (kick.phase === 'spot') { this.props.push({ what: 'spot', x: m.x, y: m.y, age: 0, life: 0.9, phase: 'spot', since: 0, id: m.id }); moved = true }
    }
    if (on.gnome) moved = this.kickGnome(on.gnome, kick) || moved
    if (on.everyGnome) for (const who of GNOMES) if (this.gnomes[who].where === 'log') moved = this.kickGnome(who, kick) || moved
    if (on.sun) {
      if (kick.spin !== undefined) { this.sun.spin.velocity += kick.spin; moved = true }
      if (kick.squash !== undefined) { this.sun.squash.velocity += kick.squash; moved = true }
      if (kick.cheeks !== undefined) { this.sun.cheeks.target = kick.cheeks; moved = true }
    }
    if (on.snail) {
      if (kick.eyes) { this.snail.eyes[0].target = kick.eyes[0]; this.snail.eyes[1].target = kick.eyes[1]; moved = true }
      if (kick.squash !== undefined) { this.snail.squash.velocity += kick.squash; moved = true }
      if (kick.phase === 'lamp' || kick.phase === 'dark') { this.snail.lamp = kick.phase === 'lamp'; moved = true }
    }
    if (on.frog && this.frog && kick.squash !== undefined) { this.frog.squash.velocity += kick.squash; moved = true }
    if (on.cart && kick.hop !== undefined) { this.cart.hop.velocity += kick.hop * 14; moved = true }
    if (on.hat && kick.phase === 'rock') { this.hatRock.velocity += 5; moved = true }
    if (on.pebble) {
      if (kick.pebble) { this.stirs.push({ x: on.pebble.x, y: on.pebble.y, move: kick.pebble, age: 0 }); moved = true }
      if (kick.ring) { this.rings.push({ x: on.pebble.x, y: on.pebble.y, age: 0 }); moved = true }
      if (kick.specks) { this.throwSpecks(kick.specks, on.pebble); moved = true }
      if (this.stirs.length > 90) this.stirs.splice(0, this.stirs.length - 90)
    }
    if (on.at) {
      if (kick.ring) { this.rings.push({ x: on.at.x, y: on.at.y, age: 0 }); moved = true }
      if (kick.specks) { this.throwSpecks(kick.specks, on.at); moved = true }
    }
    return moved
  }

  private kickGnome(who: GnomeId, kick: Kick): boolean {
    const g = this.gnomes[who]
    // Behind his window he is seen through the house: a beat that is his moves the house's window.
    if (g.where === 'home') {
      const house = this.houseOf(who)
      if (!house) return false
      const push = kick.jerk ?? kick.hop ?? kick.nod ?? kick.lean
      if (push !== undefined) house.jerk.velocity += push
      if (kick.specks) this.throwSpecks(kick.specks, this.topOf(house))
      return push !== undefined || kick.specks !== undefined
    }
    let moved = false
    if (kick.hop !== undefined) { g.hop.velocity += kick.hop * 30; moved = true }
    if (kick.hatBend !== undefined) { g.hatBend.velocity += kick.hatBend; moved = true }
    if (kick.hatFly !== undefined) { g.hatUp.velocity += kick.hatFly * 60; moved = true }
    if (kick.lean !== undefined) { g.lean.velocity += kick.lean * 0.5; moved = true }
    if (kick.nod !== undefined) { g.nod.velocity += kick.nod * 0.6; moved = true }
    if (kick.face) { g.face = kick.face; g.faceLeft = kick.faceFor ?? 0.5; moved = true }
    if (kick.hands !== undefined) { g.hands = kick.hands; moved = true }
    if (kick.ring) { this.rings.push({ x: g.at.x, y: g.at.y, age: 0 }); moved = true }
    // What his feet kick up comes from under them; anything else from where he is.
    if (kick.specks) { this.throwSpecks(kick.specks, g.where === 'out' && kick.specks.what === 'grit' ? g.at : this.placeOf(who)); moved = true }
    return moved
  }

  throwSpecks(specks: { what: Speck; count: number; power: number; ring?: boolean }, from: Point): void {
    const { what, count, power } = specks
    for (let i = 0; i < count; i++) {
      const a = specks.ring ? (i / count) * Math.PI * 2 : this.rng.next() * Math.PI * 2, r = this.rng.next()
      const speck: SpeckInAir = { what, x: from.x, y: from.y, vx: 0, vy: 0, age: 0, life: 1, size: 3 + 3 * r }
      if (specks.ring) { speck.vx = Math.cos(a) * 90 * power * (0.9 + 0.3 * r); speck.vy = Math.sin(a) * 50 * power * (0.9 + 0.3 * r) - 20; speck.life = 0.9 + 0.3 * r; speck.size = 4 + 3 * r }
      else if (what === 'spore') { speck.vx = Math.cos(a) * 130 * power * (0.4 + r); speck.vy = -Math.abs(Math.sin(a)) * 210 * power * (0.4 + r) - 30; speck.life = 1 + 0.6 * r }
      else if (what === 'flour') { speck.vx = Math.cos(a) * 150 * power * (0.3 + r); speck.vy = Math.sin(a) * 110 * power * (0.3 + r) - 30; speck.life = 0.8 + 0.5 * r; speck.size = 6 + 7 * r }
      else if (what === 'spot') { speck.vx = Math.cos(a) * 240 * power * (0.4 + r); speck.vy = -200 - 260 * r; speck.life = 0.9; speck.size = 5 + 4 * r }
      else if (what === 'drop') { speck.vx = (r - 0.5) * 160 * power; speck.vy = -120 * power; speck.life = 0.6 + 0.2 * r; speck.size = 4 + 2 * r }
      else if (what === 'splash') { speck.vx = (r - 0.5) * 220 * power; speck.vy = -180 - 160 * power * this.rng.next(); speck.life = 0.5; speck.size = 3 + 3 * r }
      else if (what === 'grit') { speck.vx = (r - 0.5) * 200 * power; speck.vy = -120 - 120 * power * this.rng.next(); speck.life = 0.5; speck.size = 3 + 2 * r }
      else if (what === 'smoke') { speck.x += (r - 0.5) * 8; speck.vx = 8 + 14 * r; speck.vy = -34 - 30 * power * r; speck.life = 1.5 + 0.6 * r; speck.size = 7 + 5 * r }
      else if (what === 'bubble') { speck.vx = 10; speck.vy = -26; speck.life = 1.6; speck.size = 8 }
      else { speck.x += (r - 0.5) * 70; speck.vy = 20; speck.life = 1.5 + 0.4 * r; speck.size = 5 + 4 * r }
      this.specks.push(speck)
    }
    // The oldest go first when there are more than the tier draws.
    if (this.specks.length > this.maxSpecks) this.specks.splice(0, this.specks.length - this.maxSpecks)
  }

  // -------------------------------------------------------------- as it was left

  /**
   * Puts everything that is seen where the kept village says it is: everyone at home or on the log, every door
   * in its house, the cart at its place, the sky as dark as the hour. A scene ends on this, a load starts from
   * it, and going to rest is the same as a load. With `snap` nothing eases there.
   */
  land(snap: boolean): void {
    const tallHouse = this.houseOf('tall')
    this.hatOff = tallHouse !== undefined && hatStaysOut(tallHouse.size)
    this.hatSeen = this.hatOff
    // Whoever is walking back to the log walks on, unless he has a house again or everything is put where it is kept.
    this.walkers = snap ? [] : this.walkers.filter((walker) => this.homes[walker.who] === null)
    this.sceneOwn = false
    for (const who of GNOMES) {
      const g = this.gnomes[who]
      if (this.walkers.some((walker) => walker.who === who)) continue
      g.where = this.homes[who] !== null && this.houseOf(who) ? 'home' : 'log'
      g.scale = 1; g.fade = 1; g.low = 0; g.sat = false; g.asleep = false; g.carries = false; g.walked = 0; g.facing = 1; g.bare = false
      g.at = { x: SEATS[who].x, y: SEATS[who].y }
      if (snap) {
        g.hands = false; g.hatPull = 0; g.face = null; g.faceLeft = 0; g.riseLeft = 0
        for (const s of [g.hop, g.hatBend, g.hatUp, g.press, g.rise, g.lean, g.nod]) settle(s, 0)
      }
    }
    for (const m of this.mushrooms) {
      m.doorSeen = m.door
      m.built.target = m.door ? 1 : 0
      m.glow.target = this.night && m.door ? 1 : 0
      if (snap) {
        m.pull = 0
        settle(m.seen, m.size); settle(m.squash, 0); settle(m.swing, 0); settle(m.puff, 0); settle(m.built); settle(m.glow); settle(m.jerk, 0)
      }
    }
    this.dark = this.night ? 1 : 0
    this.sun.drop = this.night ? 1 : 0
    this.sun.pull = 0
    this.sun.cheeks.target = 0
    this.snail.x = SNAIL.x; this.snail.y = SNAIL.y; this.snail.facing = 1; this.snail.lamp = this.night
    if (snap) this.snail.crawled = 0
    this.snail.eyes[0].target = 0; this.snail.eyes[1].target = 0
    this.cart.x = CART.x
    this.cart.there = this.shown.includes('cart')
    this.unlaid.clear()
    this.movingIn = null
    if (snap) {
      settle(this.sun.spin, 0); settle(this.sun.squash, 0); settle(this.sun.cheeks, 0)
      settle(this.snail.eyes[0], 0); settle(this.snail.eyes[1], 0); settle(this.snail.squash, 0)
      settle(this.cart.hop, 0); settle(this.dimple.depth, 0); settle(this.hatRock, 0)
      this.dimple.on = false
      this.leaving = []; this.props = []; this.specks = []; this.rings = []; this.stirs = []
      this.frog = null; this.column = null; this.seesaw = null; this.doorInHand = null
      this.playing = []; this.later = []; this.childUntil = 0
      this.interest = null; this.finger = null
      this.since.fetch = 0; this.since.sneeze = 0; this.since.snore = 0; this.since.smoke = 0; this.since.full = 0
    }
  }

  // -------------------------------------------------------------- back to the log

  /**
   * A gnome walks back to the log from where he stands, at his own pace, and jumps up onto his seat. He takes the
   * pebbles where they lead his way, from his feet to the log, and crosses whatever is left in his own way, as he
   * does when he is sent: a sound at every step, wading or hopping the stream. Only what is seen: in the kept
   * village he waits on the log already.
   */
  walkBack(who: GnomeId, from: Point): void {
    const g = this.gnomes[who], home = stepOff(who)
    const far = (p: Point): number => Math.hypot(p.x - home.x, p.y - home.y)
    const starts = (p: Point): boolean => !this.unlaid.has(keyOf(p)) && Math.hypot(p.x - from.x, p.y - from.y) <= PEBBLES_NEAR
    // Of the pebbles that begin at his feet, he takes them as far as the one that lies nearest where he steps onto
    // the log; they are his way only if that is nearer than where he stands.
    const nearest = reachable(this.paths, starts).filter((p) => !this.unlaid.has(keyOf(p))).sort((a, b) => far(a) - far(b))[0]
    const pebbles = nearest && far(nearest) < far(from) - 40 ? route(this.paths, starts, (p) => p.x === nearest.x && p.y === nearest.y) ?? [] : []
    const led = pebbles.length > 1 ? pebbles : []
    const way = [{ ...from }, ...led, home]
    this.walkers = this.walkers.filter((walker) => walker.who !== who)
    g.where = 'out'; g.at = { ...from }; g.scale = WALKER; g.fade = 1; g.low = 0; g.sat = false; g.asleep = false; g.carries = false; g.bare = false
    this.walkers.push({ who, way, length: lengthOf(way), gone: 0, up: 0, held: false, plan: crossing(who, way, (i) => i >= 2 && i <= led.length), next: 0 })
  }

  private stepWalkers(dt: number): void {
    for (const walker of [...this.walkers]) {
      const g = this.gnomes[walker.who], seat = SEATS[walker.who], foot = walker.way[walker.way.length - 1]
      // Under a finger he stands still.
      if (walker.held) continue
      if (walker.gone < walker.length) {
        const step = Math.min(PACE[walker.who] * dt, walker.length - walker.gone)
        walker.gone += step
        const at = along(walker.way, walker.gone / walker.length)
        if (Math.abs(at.x - g.at.x) > 0.5) g.facing = at.x > g.at.x ? 1 : -1
        g.walked += step
        g.at = { x: at.x, y: at.y - hopLift(walker.plan, walker.gone) }
        // Every step he has come to is heard and seen as he takes it.
        while (walker.next < walker.plan.cues.length && walker.plan.cues[walker.next].d <= walker.gone) {
          const cue = walker.plan.cues[walker.next++]
          if (cue.what === 'step') this.play(mossStep(walker.who), { gnome: walker.who })
          else if (cue.what === 'hup') this.play(hup(walker.who), { gnome: walker.who })
          else if (cue.what === 'stone') this.play(stone(), { pebble: cue.at })
          else this.play(cue.what === 'down' ? splashDown() : wade(), { at: cue.at })
        }
        continue
      }
      // Up onto his seat, and he lands there with his own thump.
      walker.up = Math.min(1, walker.up + dt / JUMP_S)
      const p = walker.up * walker.up * (3 - 2 * walker.up)
      g.at = { x: foot.x + (seat.x - foot.x) * p, y: foot.y + (seat.y - foot.y) * p - 70 * Math.sin(Math.PI * walker.up) }
      g.scale = WALKER + (1 - WALKER) * p
      if (walker.up < 1) continue
      this.walkers = this.walkers.filter((other) => other !== walker)
      g.where = 'log'; g.scale = 1; g.at = { x: seat.x, y: seat.y }; g.facing = 1; g.walked = 0
      this.play(lands(walker.who), { gnome: walker.who })
    }
  }

  // -------------------------------------------------------------- game time, for what only eases

  stepSeen(dt: number): void {
    this.stepWalkers(dt)
    for (const m of this.mushrooms) {
      m.seen.target = m.size
      stepSpring(m.seen, dt); stepSpring(m.squash, dt); stepSpring(m.swing, dt); stepSpring(m.puff, dt); stepSpring(m.built, dt); stepSpring(m.glow, dt); stepSpring(m.jerk, dt)
    }
    for (const who of GNOMES) {
      const g = this.gnomes[who]
      stepSpring(g.hop, dt); stepSpring(g.hatBend, dt); stepSpring(g.hatUp, dt); stepSpring(g.press, dt); stepSpring(g.rise, dt); stepSpring(g.lean, dt); stepSpring(g.nod, dt)
      if (g.faceLeft > 0 && (g.faceLeft -= dt) <= 0) g.face = null
      if (g.riseLeft > 0 && (g.riseLeft -= dt) <= 0) { g.rise.target = 0; g.lean.target = 0 }
    }
    stepSpring(this.sun.spin, dt); stepSpring(this.sun.squash, dt); stepSpring(this.sun.cheeks, dt)
    stepSpring(this.snail.eyes[0], dt); stepSpring(this.snail.eyes[1], dt); stepSpring(this.snail.squash, dt)
    stepSpring(this.cart.hop, dt); stepSpring(this.hatRock, dt)
    stepSpring(this.dimple.depth, dt)
    if (this.dimple.on && this.dimple.depth.target === 0 && this.dimple.depth.value < 0.02) this.dimple.on = false
    if (this.frog) {
      stepSpring(this.frog.up, dt); stepSpring(this.frog.squash, dt)
      if (this.frog.leaving && this.frog.up.value < 0.04) this.frog = null
    }
    if (this.interest && (this.interest.left -= dt) <= 0) this.interest = null
    for (const l of this.leaving) l.age += dt
    this.leaving = this.leaving.filter((l) => l.age < 0.8)
    for (const p of this.props) { p.age += dt; p.since += dt }
    this.props = this.props.filter((p) => p.age < p.life)
    for (const r of this.rings) r.age += dt
    this.rings = this.rings.filter((r) => r.age < 0.9)
    for (const s of this.stirs) s.age += dt
    this.stirs = this.stirs.filter((s) => s.age < 0.45)
    for (const s of this.specks) {
      s.age += dt
      if (s.what === 'spore' || s.what === 'flour') { s.vx *= 1 - 2.2 * dt; s.vy = s.vy * (1 - 2.2 * dt) - 14 * dt }
      else if (s.what === 'leaf') { s.vx = 40 * Math.sin(s.age * 5 + s.size); s.vy = Math.min(90, s.vy + 160 * dt) }
      else if (s.what === 'smoke' || s.what === 'bubble') { s.vx *= 1 - 0.6 * dt; s.vy *= 1 - 0.5 * dt }
      else s.vy += 900 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
    }
    this.specks = this.specks.filter((s) => s.age < s.life)
  }
}

export type Hit =
  | { what: 'gnome'; who: GnomeId; hat: boolean }
  | { what: 'walker'; who: GnomeId }
  | { what: 'sun' }
  | { what: 'snail' }
  | { what: 'cart' }
  | { what: 'hat'; house: Mushroom }
  | { what: 'door'; mushroom: Mushroom }
  | { what: 'mushroom'; mushroom: Mushroom }
  | { what: 'pebble'; path: number; index: number }
  | Exclude<Under, { what: 'gnome' } | { what: 'sun' } | { what: 'snail' } | { what: 'cart' }>
