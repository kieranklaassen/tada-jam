import { CELLS, RIGHT, SOAKED, cellOf, neededFor, type AnswerId, type BitKind, type Brought, type Burst } from './cells'
import { AT_TROUGH, BODY, BYSTANDER_REACH, CLOUDS, FEET, HENHOUSE, HELD_REACH, HENS, HOME, HORN, MIDDLE, MOUTH, NEAR, RACK, ROOFTOP, ROOST, SCATTER, SUN, TEETH, THINGS, THING_REACH, TROUGH, USE_AT, USE_PLACE, VISIT, WALLOW_TARGET, DOOR_TRACK, doorTarget, henCircle, inBox, inCircle, sunY, type Point, type ThingId } from './layout'
import { SCRATCHES } from './motion'
import { makeRng, type Rng } from './rng'
import { Scene, type Beat } from './scene'
import { ANIMALS, STATE_VERSION, type AnimalId, type Door, type GameState } from './state'
import { BACK_S, COMING_OUT, CROW, DOOR_SLIDE_S, DRUM, FILLS_FROM, FULL_MORNING, GLUGS, HAYSTACK, HEN_SNORE, IDLE_BUBBLE_S, LEAP_S, NIGHT, PECKS, PING_S, SPRAY, STRUT, USES, VISIT_AFTER, CROONS, brushAt } from './timeline'
import type { Channel, SoundId } from './voices'

// The yard as a model: what stands where, what is lifted, which answer each
// animal is in the middle of, and what is loose in the air. It has no
// renderer and reads no clock: the Mount hands it touches in stage units and
// steps it by attended time, and the view draws from its fields.
//
// What is saved and what is shown are kept apart. `door` and `content` are the
// saved state, and a scene writes its outcome into them when it starts. What
// the page shows (`shown`, `dark`, `light`, who is asleep) arrives there beat
// by beat, and any touch lands it at once.

export type Answer = {
  id: AnswerId
  brought: Brought
  /** Seconds since the answer started. */
  t: number
  lasts: number
  /** Which hen was touched, or leads: 0 to 2. */
  lead: number
  /** How many of the cell's bursts have been thrown. */
  thrown: number
  /** The ordinary detail that differs from one time to the next: which ear leads. */
  mirror: boolean
}

export type HenMode = 'stand' | 'go' | 'peck'

export type Hen = {
  x: number
  y: number
  tx: number
  ty: number
  /** Stage units a second on the way to where she is going. */
  speed: number
  mode: HenMode
  /** Seconds she still pecks for once she has arrived. */
  peckFor: number
  /** Behind the door: drawn inside the henhouse, and no target. */
  inside: boolean
  /** Which way she faces: 1 to the right, -1 to the left. */
  facing: 1 | -1
  /** How far she has walked, for her steps. */
  walked: number
  /** Seconds before she sets off, so the three never move as one. */
  wait: number
  /** Where she goes when the pecking is done, or null to stay. */
  then: Point | null
  /** Where she goes on to once she is where she is going: a hen leaves and enters the henhouse over the sill. */
  next: Point | null
  /** Seconds since she tripped over the sill, or shook herself, or -1. */
  trip: number
  shook: number
  /** Seconds since the haystack walked into her, or -1: she jumps. */
  bumped: number
  /** The rest of a way with turns in it, walked one stop after another. */
  route: Stop[]
  /** The hen she walks into when she gets where she is going now, by her place in the flock, or -1. */
  bump: number
  /** A stiff strut, with a crest the brush gave her: short quick steps. */
  strut: boolean
  /** Her pecks sound when she is there to peck: at the trough, or at what fell by another animal. */
  tok: 'trough' | 'visit' | null
  /** Seconds she has been pecking for: her head is down half way through each beat of her own. */
  pecked: number
}

/** One stop on a hen's way: where, how fast she walks there, and the hen she walks into when she gets there, or -1. */
export type Stop = Point & { speed: number; bump: number }

export type HandMode = 'held' | 'carried' | 'waiting' | 'leap' | 'tip' | 'back'

export type Hand = {
  thing: ThingId
  mode: HandMode
  x: number
  y: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  /** Seconds in the current mode. */
  t: number
  /** The use it is in the middle of, and seconds since that use began: the answer's own clock. */
  cell: `${ThingId}-${AnimalId}` | null
  clock: number
  /** Seconds since it was lifted: a second tap that lands at once does not lay it down. */
  since: number
  /** Heaped, full or forked: it empties as it tips and is full again when it is back over its place. */
  loaded: boolean
  /** How far it is tipped over, 0 to 1. */
  tilt: number
  /** The goat has the scoop: it is held in the goat's teeth until they clonk on the tin, and then it pings out. */
  bitten: boolean
}

/** `lies` is how long it lies where it lands, a moment when left out. */
export type Bit = { kind: BitKind; x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; floor: number; lies?: number }

export type Target =
  | { kind: 'hand' }
  | { kind: 'thing'; thing: ThingId }
  | { kind: 'animal'; animal: AnimalId; lead: number }
  | { kind: 'door' }
  | { kind: 'hatch' }
  | { kind: 'cat' }
  | { kind: 'sun' }
  | { kind: 'cloud'; index: number }
  | { kind: 'page' }

/** What the idle ladder would show next: the one thing a child would want now. */
export type Want = { kind: 'door' } | { kind: 'thing'; thing: ThingId } | { kind: 'animal'; animal: AnimalId } | { kind: 'carry'; thing: ThingId; animal: AnimalId }

/** Which short scene is playing. */
export type SceneKind = 'coming-out' | 'full-morning' | 'night'

/** A second tap inside this long after a thing is lifted leaves it up. */
export const STAYS_UP_S = 0.6
/** A door that has just been slid takes no other slide for this long. */
export const DOOR_GUARD_S = 1.2
/** The hens hurry in ahead of a door that is shutting. */
const DOOR_WAITS_S = 0.32
/** The longest a shutting door waits for the hens. */
const DOOR_HOLDS_S = 1.6
/** How long a yawn, and a hen's snore behind the door, are kept. */
const YAWN_S = 0.8
/** How fast each want fills once its animal has its right thing, in fillings a second. */
const FILLS: Record<AnimalId, number> = { hens: 1.6, pony: 0.42, goat: 2.6, pig: 1.1 }
/** The full morning begins this long before the end of the answer it follows, as that answer's pose fades. */
const MORNING_LEADS = 0.6
const RUN = 380
/**
 * The haystack's zigzag: a turn every so many units along, swinging out towards the child and back; where she
 * stops in front of a hen she walks into, and how close, by the two hens' sizes.
 */
const ZIGZAG = { every: 36, out: 34, back: 4, front: 22, touch: 30 }
/** How long a hen the haystack walked into is in the air and settling. */
const BUMPED_S = 0.7
/** A hen with at least this far to go to spilled grain clucks as she sets off: the two clucks are over before she is there. */
const RUN_CLUCK_FROM = 70
const WALK = 150
/** When the pony rubs on the post and the pig tries to roll: the middle of each fidget in motion.ts, by the same clock. */
const PONY_ITCHES = { every: 9.4, offset: 3 - 0.65 }
const PIG_ROLLS = { every: 10.3, offset: 4.1 - 0.75 }
/** Where each hen crosses the sill of the doorway, on her way out or in. */
const SILL: readonly Point[] = [{ x: 104, y: 562 }, { x: 156, y: 558 }, { x: 206, y: 562 }]
/** How long the eyes stay on a touch. */
const LOOK_S = 2.6

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const toward = (from: number, to: number, by: number): number => from + Math.max(-by, Math.min(by, to - from))
const ease = (t: number): number => t * t * (3 - 2 * t)

export class Farm {
  door: Door
  content: Set<AnimalId>
  /** 0 shut to 1 open, as the door stands now. */
  slide: number
  /** Seconds since the door was last slid. */
  doorSince = DOOR_GUARD_S
  /** A shake of the door, 1 fading to 0: a rattle, or hens drumming on it. */
  doorShake = 0
  /** Who is shown with their right thing. It is `content`, except in the night, where each wakes short of it in turn. */
  readonly shown: Set<AnimalId>
  /** How far each animal's want is filled, 0 to 1, easing to what `shown` says. */
  readonly filled: Record<AnimalId, number>
  /** How far each animal is asleep, 0 to 1, easing to `asleep`. */
  readonly sleep: Record<AnimalId, number> = { hens: 0, pony: 0, goat: 0, pig: 0 }
  readonly asleep = new Set<AnimalId>()
  /** Seconds since each animal gave its settled sound in the ending, or -1. */
  readonly settled: Record<AnimalId, number> = { hens: -1, pony: -1, goat: -1, pig: -1 }
  /** The night over the page, 0 to 1; how far the sun has slid down behind the hill, 0 to 1; the moon's way across, 0 to 1, or -1. */
  dark = 0
  sunDip = 0
  moon = -1
  /** The full light of a morning in which all four have their thing, 0 to 1. */
  light: number
  /** The cat: 0 in the loft, 1 out on the roof, easing to `catOut`; and seconds since it last stretched, or -1. */
  cat = 0
  catOut = false
  catStretch = -1
  /** The hens' faces at the holes of the shut door, 0 to 1, easing to `peeking`. */
  peek: number
  peeking: boolean
  /** The scene that is playing, if one is. */
  playing: SceneKind | null = null
  private scene: Scene | null = null
  /** The scene's own clock, in seconds since it began. */
  private sceneTime = 0
  /** The order the animals were made content in this visit, for the ending. */
  private readonly made: AnimalId[] = []
  readonly answers: Record<AnimalId, Answer | null> = { hens: null, pony: null, goat: null, pig: null }
  readonly hens: Hen[]
  hand: Hand | null = null
  /** Seconds since each thing was last pressed, for its squash. */
  readonly pressed: Record<ThingId, number> = { scoop: 9, bucket: 9, brush: 9, fork: 9 }
  /** The animal under a carried thing, which leans to it. */
  eager: AnimalId | null = null
  /** Seconds since a thing was last lifted: every ear in the yard comes up for a moment. */
  lifted = 9
  /** The animal nearest a knock on the bare page, which looks round: who, which hen, and for how long now. */
  turned: { animal: AnimalId; lead: number; since: number; left?: boolean } | null = null
  /** Hens whose thing was taken away stand and look after it for this long, and then walk home. Below 0, nobody is waiting. */
  private strayed = -1
  /**
   * Seconds until the full morning begins, or null. The fourth right thing sets it to the end of its own answer. Until
   * then no scene is playing, so a touch is an ordinary touch and ends nothing; an answer that touch starts is
   * followed by the full morning in its turn.
   */
  private morningDue: number | null = null
  /** Animals whose right thing was taken away mid-use: what it gave is given, and the want fills as the thing leaves. */
  private readonly quick = new Set<AnimalId>()
  /** How many animals' worth of the way up its slot the sun stands, eased; and, from the night until all are awake, held at its low morning place. */
  private sunLevel: number
  private dawn = false
  /** Where the last touch landed, and how long ago. */
  readonly look = { x: 590, y: 410, age: LOOK_S }
  /** A gloss that sweeps out from the last touch, by its age in seconds. */
  readonly gloss = { x: 0, y: 0, age: 9 }
  readonly bits: Bit[] = []
  maxBits = 120
  /** The bystanders: a spin of the sun, a bob of each cloud, and how long the loft hatch has been up (or -1). */
  sunSpin = 0
  readonly cloudBob = [0, 0]
  hatch = -1
  /** Seconds of play. */
  time = 0
  private readonly rng: Rng
  private sounds: SoundId[] = []
  private change: 'now' | 'soon' | null = null
  private stops: Channel[] = []
  private spray = -1
  private doorWait = -1
  /** Seconds before each want starts to fill: its thing has to land first. */
  private readonly fillWait: Record<AnimalId, number> = { hens: 0, pony: 0, goat: 0, pig: 0 }
  /** Grain that is about to spill from the scoop to where the hens will come and peck. */
  private spill: { at: number; places: readonly Point[] } | null = null
  /** Seconds since the shut-in hens began to drum on the door, since the white hen began to crow, and since the hens began to snore behind the door; or -1. */
  drum = -1
  crow = -1
  henSnore = -1
  /** Seconds since each large animal woke with a yawn, or -1. */
  readonly yawned: Record<AnimalId, number> = { hens: -1, pony: -1, goat: -1, pig: -1 }
  private downOn: Target | null = null

  constructor(state: GameState, seed: number) {
    this.rng = makeRng(seed)
    this.door = state.door
    this.content = new Set(state.content)
    this.slide = state.door === 'open' ? 1 : 0
    this.filled = { hens: 0, pony: 0, goat: 0, pig: 0 }
    this.shown = new Set(state.content)
    for (const animal of ANIMALS) this.filled[animal] = this.content.has(animal) ? 1 : 0
    // Found as left: the full light stands if all four have their thing, the cat is back in the loft, and no scene plays.
    this.light = this.content.size === ANIMALS.length ? 1 : 0
    this.peeking = state.door === 'shut'
    this.peek = this.peeking ? 1 : 0
    this.sunLevel = this.content.size
    this.hens = HENS.map((_, i) => {
      const at = this.restOf(i)
      return { x: at.x, y: at.y, tx: at.x, ty: at.y, speed: WALK, mode: 'stand' as HenMode, peckFor: 0, inside: this.door === 'shut', facing: this.door === 'shut' ? 1 : this.faces(at), walked: i * 37, wait: 0, then: null, next: null, trip: -1, shook: -1, bumped: -1, route: [], bump: -1, strut: false, tok: null, pecked: 0 }
    })
  }

  toState(): GameState {
    return { v: STATE_VERSION, door: this.door, content: ANIMALS.filter((animal) => this.content.has(animal)) }
  }

  /** The sounds queued since the last call: everything one touch, or one step, set off. */
  takeSounds(): SoundId[] {
    const sounds = this.sounds
    this.sounds = []
    return sounds
  }

  /** The channels whose notes still to come must not sound: an answer was replaced, or a scene was ended. Taken before the sounds. */
  takeStops(): Channel[] {
    const stops = this.stops
    this.stops = []
    return stops
  }

  /** Whether the saved state changed since the last call, and how soon it must be written. */
  takeChange(): 'now' | 'soon' | null {
    const change = this.change
    this.change = null
    return change
  }

  /** Where the sun stands, eased with the animals' wants. */
  get sun(): number {
    return sunY(this.sunLevel)
  }

  /** Where hen `i` rests: inside when the door is shut, by the trough once it is full, and in her own patch otherwise. */
  restOf(i: number): Point {
    if (this.door === 'shut') return ROOST[i]
    return this.content.has('hens') ? AT_TROUGH[i] : HENS[i].home
  }

  /** Which way a hen faces where she stands: towards the trough. */
  private faces(at: Point): 1 | -1 {
    return at.x > TROUGH.x + TROUGH.w / 2 ? -1 : 1
  }

  /** Where a lifted thing stands: over its own place, nearer the child. */
  hoverOf(thing: ThingId): Point {
    return { x: HOME[thing].x, y: HOME[thing].y + NEAR.down }
  }

  // --- Touch ------------------------------------------------------------------

  /** What a touch at this point lands on, front to back. */
  targetAt(at: Point, under = false): Target {
    const hand = this.hand
    // `under` looks past the thing in hand, at what the finger carrying it is over.
    if (!under && hand && (hand.mode === 'held' || hand.mode === 'waiting' || hand.mode === 'carried') && inCircle(at, { x: hand.x, y: hand.y, r: HELD_REACH })) return { kind: 'hand' }
    // The nearest hen wins, so a touch between two reaches the one it is closer to.
    let lead = -1, nearest = Infinity
    this.hens.forEach((hen, i) => {
      if (hen.inside) return
      const reach = henCircle(hen, HENS[i].size)
      const d = Math.hypot(at.x - reach.x, at.y - reach.y)
      if (d <= reach.r && d < nearest) { nearest = d; lead = i }
    })
    if (lead >= 0) return { kind: 'animal', animal: 'hens', lead }
    // A hen's own patch while she is away across the yard still reaches her: she answers from where she is.
    if (this.door === 'open') for (let i = 0; i < this.hens.length; i++) if (!this.hens[i].inside && inCircle(at, henCircle(this.restOf(i), HENS[i].size))) return { kind: 'animal', animal: 'hens', lead: i }
    for (const thing of THINGS) if (hand?.thing !== thing && inCircle(at, { ...HOME[thing], r: THING_REACH })) return { kind: 'thing', thing }
    for (const animal of ['pig', 'pony', 'goat'] as const) if (inBox(at, BODY[animal])) return { kind: 'animal', animal, lead: 0 }
    // A door that has just been slid is still reached where it was: the second tap of two finds it and rattles it.
    if (inBox(at, doorTarget(this.slide)) || (this.doorSince < DOOR_GUARD_S && inBox(at, DOOR_TRACK))) return { kind: 'door' }
    if (inBox(at, RACK)) return { kind: 'animal', animal: 'goat', lead: 0 }
    // While the door is shut, the door and the trough in front of it are one target.
    if (inBox(at, TROUGH)) return this.door === 'shut' ? { kind: 'door' } : { kind: 'animal', animal: 'hens', lead: this.nearestHen(at) }
    if (inBox(at, WALLOW_TARGET)) return { kind: 'animal', animal: 'pig', lead: 0 }
    if (this.cat > 0.6 && inCircle(at, { ...ROOFTOP, r: BYSTANDER_REACH })) return { kind: 'cat' }
    if (inBox(at, HENHOUSE.hatch)) return { kind: 'hatch' }
    if (inCircle(at, { x: SUN.x, y: this.sun, r: BYSTANDER_REACH })) return { kind: 'sun' }
    for (let index = 0; index < CLOUDS.length; index++) if (inCircle(at, { ...CLOUDS[index], r: BYSTANDER_REACH })) return { kind: 'cloud', index }
    return { kind: 'page' }
  }

  /** The finger landed. Whatever it landed on answers now, in this call. A touch in the grown-up's corner of the surface never gets here (corner.ts). */
  press(x: number, y: number): void {
    const at = { x, y }
    // A touch ends a scene that is playing, with everything where the scene was taking it, and is then an ordinary
    // touch. One touch does not: the second tap of two on the door that started the scene, which only rattles it.
    const again = this.doorSince < DOOR_GUARD_S && this.targetAt(at).kind === 'door'
    if (!again) this.endScene()
    this.seen(x, y)
    this.gloss.x = x; this.gloss.y = y; this.gloss.age = 0
    const target = this.targetAt(at)
    this.downOn = target
    switch (target.kind) {
      case 'hand':
        this.pressed[this.hand!.thing] = 0
        break
      case 'thing':
        this.lift(target.thing)
        break
      case 'animal':
        if (this.hand && this.hand.mode !== 'carried') this.use(this.hand.thing, target.animal, target.lead)
        else this.poke(target.animal, target.lead)
        break
      case 'door':
        this.slideDoor()
        break
      case 'hatch':
        // The hatch lifts and the cat looks out and mews. With the cat out on the roof, the cat stretches there.
        if (this.cat > 0.5) { if (this.catStretch < 0) { this.catStretch = 0; this.sounds.push('cat-stretch') } }
        else if (this.hatch < 0) { this.hatch = 0; this.sounds.push('mew') }
        this.sounds.push('knock')
        break
      case 'cat':
        if (this.catStretch < 0) { this.catStretch = 0; this.sounds.push('cat-stretch') }
        else this.sounds.push('knock')
        break
      case 'sun':
        this.sunSpin = 1
        this.sounds.push('sun')
        break
      case 'cloud':
        this.cloudBob[target.index] = 1
        this.sounds.push('cloud')
        break
      case 'page':
        this.sounds.push('knock')
        this.turned = { ...this.nearestTo(at), since: 0 }
        break
    }
  }

  /** The finger lifted where it landed. */
  tap(): void {
    const hand = this.hand
    if (this.downOn?.kind === 'hand' && hand && hand.mode !== 'carried') {
      // A second tap that lands at once is a child's double tap: the thing stays up.
      if (hand.since >= STAYS_UP_S) this.lay()
      else this.sounds.push('clink')
    }
    this.downOn = null
  }

  /** The press is over and was no tap: nothing more happens. */
  pressEnd(): void {
    this.downOn = null
  }

  /** The finger has moved off where it landed. On a thing, it now carries the thing. */
  dragStart(): void {
    const hand = this.hand
    if (!hand || !this.downOn) return
    if (this.downOn.kind === 'hand' || (this.downOn.kind === 'thing' && this.downOn.thing === hand.thing)) {
      hand.mode = 'carried'
      hand.t = 0
      hand.tilt = 0
    }
  }

  /**
   * The thing leaves an animal that still needs it: for another animal, for another thing, or for the night. The answer
   * stops there with it. What was still to sound of it does not, nothing more falls from it, and the animal is left
   * looking after the thing. `next` is the animal the thing goes to, which starts a new answer if it is the same one.
   */
  private takeAway(next: AnimalId | null): void {
    const hand = this.hand
    if (!hand || !hand.cell || (hand.mode !== 'leap' && hand.mode !== 'tip')) return
    const cell = hand.cell
    const animal = cell.slice(cell.indexOf('-') + 1) as AnimalId
    const answer = this.answers[animal]
    if (animal === next || !answer || answer.id !== cell || hand.clock >= neededFor(cell)) return
    this.answers[animal] = null
    this.stops.push(animal)
    if (animal === 'hens') this.stops.push('flock', 'hen-white', 'hen-russet', 'hen-bantam')
    this.turned = { animal, lead: answer.lead, since: 0, left: true }
    // A right thing wrote its animal into `content` when the answer started: the want is filled as the thing leaves.
    if (this.fillWait[animal] > 0 || (this.shown.has(animal) && this.filled[animal] < 1)) { this.fillWait[animal] = 0; this.quick.add(animal) }
    if (animal === 'hens') {
      // They stop where they are, look after it, and then walk home.
      for (const hen of this.hens) if (!hen.inside) { hen.mode = 'stand'; hen.wait = 0; hen.peckFor = 0; hen.pecked = 0; hen.then = null; hen.next = null; hen.route = []; hen.bump = -1; hen.strut = false; hen.tok = null }
      this.strayed = 1.1
    }
    // Grain that has not left the scoop is not spilled, and the hens who had not yet set off for it stay.
    if (this.spill) {
      this.spill = null
      this.stops.push('flock')
      for (const hen of this.hens) if (hen.tok === 'visit' && hen.wait > 0) { hen.mode = 'stand'; hen.wait = 0; hen.peckFor = 0; hen.then = null; hen.tok = null }
    }
    // Shut in, they have not begun to drum.
    if (this.drum >= 0 && this.drum < DRUM.from) { this.drum = -1; this.stops.push('flock') }
    // Water that never left the bucket reaches nobody.
    if (cell === 'bucket-pony') this.spray = -1
  }

  dragMove(x: number, y: number): void {
    this.seen(x, y)
    const hand = this.hand
    if (!hand || (hand.mode !== 'carried' && hand.mode !== 'waiting')) return
    hand.mode = 'carried'
    // The thing rides just above the finger, where the child can see it.
    hand.x = x
    hand.y = y - 30
    this.eager = this.animalUnder({ x, y })
  }

  /** The finger let go mid-drag. The thing waits where it is. */
  dragLift(): void {
    if (this.hand?.mode === 'carried') this.hand.mode = 'waiting'
  }

  /** The drag is over where the finger let go: over an animal, or more than half way to the nearest, the thing is used there. */
  dragEnd(): void {
    const hand = this.hand
    this.downOn = null
    this.eager = null
    if (!hand || (hand.mode !== 'carried' && hand.mode !== 'waiting')) return
    const at = { x: hand.x, y: hand.y + 30 }
    const under = this.animalUnder(at)
    const animal = under ?? this.halfWayTo(hand.thing, at)
    if (animal) {
      // Let go over the animal, or short of it but more than half way: it travels the rest by itself and is used there.
      this.use(hand.thing, animal, animal === 'hens' ? this.nearestHen(at) : 0)
      return
    }
    hand.mode = 'held'
    hand.t = 0
    this.sounds.push('drift')
  }

  /** The drag was taken away with the finger still down: no drop was made, and the thing is back in its place. */
  dragCancel(): void {
    this.downOn = null
    this.eager = null
    if (this.hand && (this.hand.mode === 'carried' || this.hand.mode === 'waiting')) this.hand = null
  }

  // --- What a touch does ----------------------------------------------------------

  private lift(thing: ThingId): void {
    this.takeAway(null)
    const from = HOME[thing]
    this.hand = { thing, mode: 'held', x: from.x, y: from.y, fromX: from.x, fromY: from.y, toX: from.x, toY: from.y, t: 0, cell: null, clock: 0, since: 0, loaded: true, tilt: 0, bitten: false }
    this.pressed[thing] = 0
    this.lifted = 0
    this.sounds.push(`lift-${thing}`)
  }

  private lay(): void {
    this.hand = null
    this.sounds.push('lay')
  }

  /** A thing is used on an animal: the answer starts now, and the thing leaps across to where it is used. */
  private use(thing: ThingId, animal: AnimalId, lead: number): void {
    this.takeAway(animal)
    const hand = this.hand!
    const at = this.useAt(thing, animal, lead)
    hand.fromX = hand.x; hand.fromY = hand.y
    hand.toX = at.x; hand.toY = at.y
    hand.loaded = true
    hand.t = 0
    hand.cell = `${thing}-${animal}`
    hand.clock = 0
    hand.bitten = false
    hand.mode = 'leap'
    hand.tilt = 0
    this.answer(animal, thing, lead)
    if (RIGHT[animal] === thing && !this.content.has(animal)) {
      this.content.add(animal)
      this.shown.add(animal)
      this.made.push(animal)
      // The want fills when the thing lands, not when the finger does.
      this.fillWait[animal] = FILLS_FROM[animal]
      this.dawn = false
      this.change = 'now'
      // The fourth right thing: the full morning follows this answer, on the same touch.
      if (this.content.size === ANIMALS.length) this.morningDue = Math.max(0, CELLS[cellOf(thing, animal)].lasts - MORNING_LEADS)
    }
    this.spill = null
    this.drum = -1
    if (thing === 'scoop' && animal !== 'hens') {
      this.stops.push('flock', 'hen-white', 'hen-russet', 'hen-bantam')
      if (this.door === 'open') {
        // They leave off crooning, and whatever answer of their own they were in the middle of, to go to it.
        this.stops.push('hens')
        this.answers.hens = null
        // Some grain spills to the bare ground beside the animal, and the hens come to it from where they stand to
        // peck it up. Each clucks as she sets off, if she has any way to go (stepHens).
        this.spill = { at: LEAP_S + 0.06, places: VISIT[animal] }
        this.sendHens(VISIT[animal], RUN, PECKS.visit, true, VISIT_AFTER, 0, 'visit')
      } else {
        // Shut in, they drum on the door from inside.
        this.drum = 0
        this.sounds.push('hens-drum')
      }
    }
    if (thing === 'bucket' && animal === 'pony') this.spray = SPRAY.reaches
    if (animal === 'hens') this.stageHens(thing, lead)
  }

  private poke(animal: AnimalId, lead: number): void {
    this.answer(animal, 'finger', lead)
  }

  private answer(animal: AnimalId, brought: Brought, lead: number): void {
    const id = cellOf(brought, animal)
    this.answers[animal] = { id, brought, t: 0, lasts: CELLS[id].lasts, lead, thrown: 0, mirror: this.rng.next() < 0.5 }
    // Touched, an animal is awake.
    this.asleep.delete(animal)
    // A full morning that is on its way follows this answer too.
    if (this.morningDue !== null) this.morningDue = Math.max(this.morningDue, CELLS[id].lasts - MORNING_LEADS)
    // The new answer's voice takes the animal's channel, so what was still to sound of the answer it replaces does not.
    if (animal === 'hens') {
      // Grain and water move all three hens, so all three leave off what they were at. The brush, the fork and the
      // finger are one hen's: she leaves off her pecking, and the other two peck on where they are, each with her toks.
      const all = brought === 'scoop' || brought === 'bucket'
      this.stops.push('flock', ...(all ? (['hen-white', 'hen-russet', 'hen-bantam'] as const) : ([`hen-${HENS[lead].id}`] as const)))
      const hen = this.hens[lead]
      if (!all && (hen.mode === 'peck' || (hen.mode === 'go' && hen.peckFor > 0))) {
        hen.mode = 'stand'; hen.wait = 0; hen.peckFor = 0; hen.pecked = 0; hen.then = null; hen.next = null; hen.route = []; hen.bump = -1; hen.tok = null
      }
    }
    this.sounds.push(id)
  }

  /** Where the hens go for each thing used on them. */
  private stageHens(thing: ThingId, lead: number): void {
    if (thing === 'scoop') this.sendHens(AT_TROUGH, RUN, PECKS.trough, false, 0.2, 0, 'trough')
    else if (thing === 'bucket') this.sendHens(SCATTER, RUN * 1.2, 0, true, 0.22, 2.6, null)
    else if (thing === 'brush') {
      // With her new crest she struts a few stiff steps out towards the child and back, a cluck to each step.
      const hen = this.hens[lead]
      const from = { x: hen.x, y: hen.y }
      const out = { x: hen.x + (lead === 1 ? -28 : 28), y: hen.y + 14 }
      this.go(hen, out, (2 * Math.hypot(out.x - from.x, out.y - from.y)) / (STRUT.every * STRUT.steps), STRUT.off, null)
      hen.next = from
      hen.strut = true
    } else if (thing === 'fork') {
      // The haystack walks off in a zigzag, out in front of the trough, and walks into each of the other two in
      // turn, the nearer first. The other two stand and stare.
      const hen = this.hens[lead]
      const stops: Stop[] = []
      let from: Point = { x: hen.x, y: hen.y }, since = HAYSTACK.off
      ;(lead === 1 ? [0, 2] : [1, 2 - lead]).forEach((j, n) => {
        const other = this.hens[j]
        if (other.mode === 'go') { other.mode = 'stand'; other.wait = 0; other.then = null; other.next = null; other.route = []; other.bump = -1 }
        const side = from.x < other.x ? -1 : 1
        const to = { x: other.x + side * ZIGZAG.touch * (HENS[lead].size + HENS[j].size), y: other.y + ZIGZAG.front }
        // An even number of stops, four or more: out, back, out, and in to the hen.
        const turns = 2 * Math.max(2, Math.round(Math.abs(to.x - from.x) / (2 * ZIGZAG.every)))
        const leg: Point[] = []
        for (let k = 1; k <= turns; k++) leg.push(k === turns ? to : { x: from.x + ((to.x - from.x) * k) / turns, y: to.y + (k % 2 === 1 ? ZIGZAG.out : ZIGZAG.back) })
        let length = 0, at = from
        for (const point of leg) { length += Math.hypot(point.x - at.x, point.y - at.y); at = point }
        const speed = length / (HAYSTACK.bumps[n] - since)
        leg.forEach((point, k) => stops.push({ ...point, speed, bump: k === leg.length - 1 ? j : -1 }))
        from = to
        since = HAYSTACK.bumps[n]
      })
      const first = stops.shift()!
      this.go(hen, first, first.speed, HAYSTACK.off, null)
      hen.bump = first.bump
      hen.route = stops
    }
  }

  private slideDoor(): void {
    if (this.doorSince < DOOR_GUARD_S) {
      this.doorShake = 1
      this.sounds.push('rattle')
      return
    }
    this.doorSince = 0
    if (this.door === 'shut') this.startComingOut()
    else this.startNight()
  }

  // --- The three short scenes ---------------------------------------------------------

  private begin(kind: SceneKind, beats: Beat[], saveOutcome: () => void): void {
    this.scene = new Scene(beats)
    this.playing = kind
    this.sceneTime = 0
    this.scene.start(0, saveOutcome)
  }

  /** A touch ends the scene that is playing: every beat lands where it was going, and nothing more sounds. */
  endScene(): void {
    if (!this.scene) return
    this.scene.finish()
    this.scene = null
    this.playing = null
    this.crow = -1
    this.henSnore = -1
    this.stops.push('scene')
  }

  /** A hen stands at a place, at once. */
  private stand(hen: Hen, at: Point, inside: boolean): void {
    hen.x = hen.tx = at.x
    hen.y = hen.ty = at.y
    hen.mode = 'stand'
    hen.wait = 0
    hen.peckFor = 0
    hen.pecked = 0
    hen.tok = null
    hen.strut = false
    hen.then = null
    hen.next = null
    hen.route = []
    hen.bump = -1
    hen.inside = inside
    hen.facing = inside ? 1 : this.faces(at)
  }

  /**
   * The coming out: the door slides along its rail, the bantam shoots out first, the russet hen trips over the
   * sill, and the white hen walks out last and shakes herself. `door` is saved as open when it starts.
   */
  private startComingOut(): void {
    const out = (i: number, speed: number) => (_progress: number, finishing: boolean): void => {
      if (finishing) return
      const hen = this.hens[i]
      hen.inside = false
      this.go(hen, SILL[i], speed, 0, null)
      hen.next = this.restOf(i)
    }
    this.begin('coming-out', [
      { at: 0, lasts: DOOR_SLIDE_S, play: (_progress, finishing) => { if (finishing) this.slide = 1 } },
      { at: COMING_OUT.bantam, lasts: 0, play: out(2, RUN * 1.1) },
      { at: COMING_OUT.russet, lasts: 0, play: out(1, RUN * 0.8) },
      { at: COMING_OUT.trips, lasts: 0, play: (_progress, finishing) => { if (!finishing) { this.hens[1].trip = 0; this.sounds.push('trip') } } },
      { at: COMING_OUT.white, lasts: 0, play: out(0, WALK * 1.3) },
      { at: COMING_OUT.shakes, lasts: 0, play: (_progress, finishing) => { if (!finishing) { this.hens[0].shook = 0; this.sounds.push('shake') } } },
      // Where the scene was taking them: each hen in her place by the trough.
      { at: COMING_OUT.ends, lasts: 0, play: (_progress, finishing) => { if (finishing) this.hens.forEach((hen, i) => this.stand(hen, this.restOf(i), false)) } },
    ], () => {
      this.door = 'open'
      this.change = 'now'
    })
    this.doorWait = -1
    this.peeking = false
    this.drum = -1
    this.stops.push('flock')
    this.sounds.push('door-open')
  }

  /**
   * The full morning, the ending: it follows the fourth animal's own answer, on the same touch, and is not a scene
   * until that answer is over (`morningDue`), so it cannot be ended before it begins. The sun is at the
   * top of its slot and the page brightens, the cat comes out onto the roof and stretches, and each animal in turn
   * gives its settled sound, in the order they were made content. It saves nothing of its own: the answer that
   * causes it has already written `content`.
   */
  private startFullMorning(): void {
    const from = 0
    const order = [...this.made, ...ANIMALS.filter((animal) => !this.made.includes(animal))]
    const M = FULL_MORNING
    this.begin('full-morning', [
      { at: from, lasts: M.brightens, play: (progress) => { this.light = Math.max(this.light, progress) } },
      // The cat comes out onto the roof, and stretches once it is there.
      { at: from + M.catOut, lasts: 0, play: (_progress, finishing) => { this.catOut = true; if (finishing) this.cat = 1 } },
      { at: from + M.catStretches, lasts: 0, play: (_progress, finishing) => { if (!finishing) { this.cat = 1; this.catStretch = 0; this.sounds.push('cat-stretch') } } },
      ...order.map((animal, i): Beat => ({ at: from + M.settles + i * M.every, lasts: 0, play: (_progress, finishing) => { if (!finishing) { this.settled[animal] = 0; this.sounds.push(`settled-${animal}`) } } })),
      // The yard goes quiet.
      { at: from + M.ends, lasts: 0, play: () => {} },
    ], () => {})
  }

  /**
   * The night and the new morning. `door` is saved as shut and `content` as empty when it starts; the page gets
   * there beat by beat: the hens hurry in, the sun slides down, everyone sleeps, the moon crosses, the sun comes up,
   * the white hen crows, and each animal wakes short of its thing again.
   */
  private startNight(): void {
    const sleepers: AnimalId[] = ['pony', 'goat', 'pig', 'hens']
    const N = NIGHT
    const dusk = (progress: number): void => { this.dark = progress; this.sunDip = progress; this.light = Math.min(this.light, 1 - progress) }
    this.begin('night', [
      // The door is shut and the hens are in, however far they had to come.
      { at: 0, lasts: N.shut, play: (progress, finishing) => {
        if (!finishing && progress < 1) return
        this.slide = 0
        this.doorWait = -1
        this.hens.forEach((hen, i) => this.stand(hen, ROOST[i], true))
      } },
      { at: N.dusk, lasts: 0, play: (_progress, finishing) => { if (!finishing) this.sounds.push('nightfall') } },
      { at: N.dusk, lasts: N.duskLasts, play: (progress) => dusk(progress) },
      // Each shuts its eyes with its own snore. The hens are behind the door, which stirs at each of their peeps.
      ...sleepers.map((animal, i): Beat => ({ at: N.sleeps + i * N.every, lasts: 0, play: (_progress, finishing) => {
        this.asleep.add(animal)
        if (finishing) return
        if (animal === 'hens') this.henSnore = 0
        this.sounds.push(`snore-${animal}`)
      } })),
      // Down behind the hill, the sun goes to its low morning place, which is where it comes up.
      { at: N.moon, lasts: 0, play: () => { this.dawn = true; this.sunLevel = 0 } },
      { at: N.moon, lasts: N.moonLasts, play: (progress) => { this.moon = progress } },
      { at: N.dawn, lasts: 0, play: () => { this.moon = -1 } },
      { at: N.dawn, lasts: N.dawnLasts, play: (progress) => dusk(1 - progress) },
      // The white hen crows from her hole in the door.
      { at: N.crow, lasts: 0, play: (_progress, finishing) => { if (!finishing) { this.crow = 0; this.sounds.push('crow') } } },
      // They wake one by one, each with a yawn and each short of its thing again. The hens wake last: their beaks come to the holes in the door.
      ...sleepers.map((animal, i): Beat => ({ at: N.wakes + i * N.every, lasts: 0, play: (_progress, finishing) => {
        this.asleep.delete(animal)
        this.shown.delete(animal)
        if (animal === 'hens') this.peeking = true
        if (finishing) { if (animal === 'hens') this.peek = 1; return }
        if (animal === 'hens') this.sounds.push('beaks')
        else { this.yawned[animal] = 0; this.sounds.push(`yawn-${animal}`) }
      } })),
      { at: N.ends, lasts: 0, play: () => {} },
    ], () => {
      this.door = 'shut'
      this.content.clear()
      this.change = 'now'
    })
    this.made.length = 0
    this.catOut = false
    this.peeking = false
    this.peek = 0
    this.takeAway(null)
    this.morningDue = null
    // What a wrong use left on anyone falls off as they fall asleep, and what was still to sound of it does not.
    for (const animal of ANIMALS) { const answer = this.answers[animal]; if (answer) answer.lasts = Math.min(answer.lasts, answer.t + 0.3) }
    this.stops.push('hens', 'pony', 'goat', 'pig', 'flock', 'hen-white', 'hen-russet', 'hen-bantam')
    this.spray = -1
    this.spill = null
    this.drum = -1
    // A thing that was at an animal goes back over its place, still lifted.
    const hand = this.hand
    if (hand && (hand.mode === 'leap' || hand.mode === 'tip')) { hand.mode = 'back'; hand.t = 0; hand.fromX = hand.x; hand.fromY = hand.y; hand.bitten = false }
    this.doorWait = DOOR_WAITS_S
    this.sounds.push('hens-in')
    this.hens.forEach((hen, i) => {
      this.go(hen, hen.y > SILL[i].y ? SILL[i] : ROOST[i], RUN * 1.5, i * 0.04, null)
      hen.next = hen.y > SILL[i].y ? ROOST[i] : null
    })
  }

  // --- Time -------------------------------------------------------------------------

  step(dt: number): void {
    if (dt <= 0) return
    const before = this.time
    this.time += dt
    if (this.scene) {
      // The night waits for its door: the scene's clock stands still until the door has shut.
      if (!(this.playing === 'night' && this.slide > 0 && this.sceneTime >= NIGHT.doorBy)) this.sceneTime += dt
      this.scene.update(this.sceneTime)
      if (!this.scene.running) { this.scene = null; this.playing = null }
    }
    if (this.morningDue !== null && !this.scene) {
      this.morningDue -= dt
      if (this.morningDue <= 0) { this.morningDue = null; this.startFullMorning() }
    }
    this.look.age += dt
    this.gloss.age += dt
    this.doorSince += dt
    this.doorShake = Math.max(0, this.doorShake - dt * 2.2)
    this.sunSpin = Math.max(0, this.sunSpin - dt * 0.9)
    for (let i = 0; i < this.cloudBob.length; i++) this.cloudBob[i] = Math.max(0, this.cloudBob[i] - dt * 1.4)
    if (this.hatch >= 0) { this.hatch += dt; if (this.hatch > 2.4) this.hatch = -1 }
    for (const thing of THINGS) this.pressed[thing] += dt
    for (const animal of ANIMALS) {
      // A want fills at the pace of the answer that fills it: the trough as the grain lands, the coat stroke by stroke.
      const to = this.shown.has(animal) ? 1 : 0
      const by = dt * (to === 1 ? (this.quick.has(animal) ? 6 : FILLS[animal]) : 1.1)
      if (this.filled[animal] >= 1 || to === 0) this.quick.delete(animal)
      if (to === 1 && this.fillWait[animal] > 0) this.fillWait[animal] -= dt
      else this.filled[animal] += Math.max(-by, Math.min(by, to - this.filled[animal]))
      if (this.yawned[animal] >= 0) { this.yawned[animal] += dt; if (this.yawned[animal] > YAWN_S) this.yawned[animal] = -1 }
      this.sleep[animal] = toward(this.sleep[animal], this.asleep.has(animal) ? 1 : 0, dt * 1.6)
      if (this.settled[animal] >= 0) { this.settled[animal] += dt; if (this.settled[animal] > 1.2) this.settled[animal] = -1 }
    }
    this.lifted += dt
    // Shut in, the hens drum on the door: it shakes for as long as they drum.
    if (this.drum >= 0) {
      this.drum += dt
      if (this.drum >= DRUM.from) this.doorShake = Math.max(this.doorShake, 0.85)
      if (this.drum > DRUM.from + DRUM.knocks * DRUM.every) this.drum = -1
    }
    if (this.crow >= 0) { this.crow += dt; if (this.crow > CROW.lasts) this.crow = -1 }
    // The door stirs at each peep of the hens asleep behind it.
    if (this.henSnore >= 0) {
      for (const peep of HEN_SNORE.peeps) if (this.henSnore <= peep && this.henSnore + dt > peep) this.doorShake = Math.max(this.doorShake, 0.4)
      this.henSnore += dt
      if (this.henSnore > 1.4) this.henSnore = -1
    }
    // Grain spills from the scoop as it tips, to where the hens will peck it up.
    if (this.spill) {
      this.spill.at -= dt
      if (this.spill.at <= 0) { this.spillGrain(this.spill.places); this.spill = null }
    }
    if (this.turned) { this.turned.since += dt; if (this.turned.since > 1.3) this.turned = null }
    if (this.strayed >= 0) {
      this.strayed -= dt
      if (this.strayed < 0 && this.door === 'open' && this.playing !== 'night' && !this.answers.hens) this.hens.forEach((hen, i) => { if (!hen.inside && hen.mode === 'stand') this.go(hen, this.restOf(i), WALK, i * 0.15, null) })
    }
    // The sun follows the wants as they fill. After a night it stays low until everyone has woken short again.
    const filled = ANIMALS.reduce((sum, animal) => sum + this.filled[animal], 0)
    if (this.dawn && !this.playing && filled < 0.02) this.dawn = false
    this.sunLevel = toward(this.sunLevel, this.dawn ? 0 : filled, dt * 6)
    this.cat = toward(this.cat, this.catOut ? 1 : 0, dt * 1.1)
    if (this.catStretch >= 0) { this.catStretch += dt; if (this.catStretch > 1.6) this.catStretch = -1 }
    this.peek = toward(this.peek, this.peeking && this.slide === 0 ? 1 : 0, dt * 2.6)
    for (const hen of this.hens) {
      if (hen.trip >= 0) { hen.trip += dt; if (hen.trip > 0.7) hen.trip = -1 }
      if (hen.shook >= 0) { hen.shook += dt; if (hen.shook > 0.9) hen.shook = -1 }
      if (hen.bumped >= 0) { hen.bumped += dt; if (hen.bumped > BUMPED_S) hen.bumped = -1 }
    }
    this.ambient(before)
    this.stepDoor(dt)
    this.stepAnswers(dt)
    this.stepHens(dt)
    this.stepHand(dt)
    this.stepBits(dt)
  }

  private stepDoor(dt: number): void {
    if (this.doorWait >= 0) {
      this.doorWait -= dt
      if (this.doorWait > 0) return
      this.doorWait = -1
    }
    // A shutting door waits for a hen that is still on her way in from across the yard, so none walks through it.
    if (this.door === 'shut' && this.slide > 0 && this.doorSince < DOOR_HOLDS_S && this.hens.some((hen) => hen.mode === 'go')) return
    const to = this.door === 'open' ? 1 : 0
    const by = dt / DOOR_SLIDE_S
    const before = this.slide
    this.slide += Math.max(-by, Math.min(by, to - this.slide))
    // The shutting door rumbles from the moment it moves and clunks the moment it is shut, however long it waited.
    if (this.playing === 'night' && before === 1 && this.slide < 1) this.sounds.push('door-slide')
    if (this.playing === 'night' && before > 0 && this.slide === 0) this.sounds.push('door-clunk')
    if (this.slide === 0) for (const hen of this.hens) if (hen.mode !== 'go') { hen.inside = true; hen.facing = 1 }
  }

  private stepAnswers(dt: number): void {
    if (this.spray >= 0) {
      this.spray -= dt
      if (this.spray < 0) {
        this.answers.goat = { id: SOAKED, brought: 'bucket', t: 0, lasts: CELLS[SOAKED].lasts, lead: 0, thrown: 0, mirror: this.rng.next() < 0.5 }
        this.sounds.push(SOAKED)
        // Soaked in the middle of a use of its own, the goat leaves off: the thing goes back over its place.
        const hand = this.hand
        if (hand && hand.cell?.endsWith('-goat') && (hand.mode === 'leap' || hand.mode === 'tip')) { hand.mode = 'back'; hand.t = 0; hand.fromX = hand.x; hand.fromY = hand.y; hand.bitten = false }
      }
    }
    for (const animal of ANIMALS) {
      const answer = this.answers[animal]
      if (!answer) continue
      answer.t += dt
      const bursts = CELLS[answer.id].bursts
      while (answer.thrown < bursts.length && bursts[answer.thrown].at <= answer.t) {
        this.throwBits(animal, answer, bursts[answer.thrown])
        answer.thrown += 1
      }
      if (answer.t >= answer.lasts) {
        this.answers[animal] = null
        // The answer over, the hens walk home; one who is still pecking, or on her way to peck, goes when she has done.
        if (animal === 'hens' && this.door === 'open') this.hens.forEach((hen, i) => {
          if (hen.peckFor > 0) hen.then = this.restOf(i)
          else this.go(hen, this.restOf(i), WALK, i * 0.15, null)
        })
      }
    }
  }

  private stepHens(dt: number): void {
    this.hens.forEach((hen, i) => {
      if (hen.wait > 0) {
        hen.wait -= dt
        // Off for spilled grain, she clucks as she sets off, if she has far enough to go to be seen running.
        if (hen.wait <= 0 && hen.mode === 'go' && hen.tok === 'visit' && Math.hypot(hen.tx - hen.x, hen.ty - hen.y) >= RUN_CLUCK_FROM) this.sounds.push(`run-${HENS[i].id}`)
        return
      }
      if (hen.mode === 'go') {
        const dx = hen.tx - hen.x, dy = hen.ty - hen.y
        const left = Math.hypot(dx, dy)
        const stride = hen.speed * dt
        if (Math.abs(dx) > 2) hen.facing = dx > 0 ? 1 : -1
        if (left <= stride) {
          hen.x = hen.tx; hen.y = hen.ty
          // The haystack has walked into a hen, who jumps with a bonk in this step.
          if (hen.bump >= 0) {
            this.hens[hen.bump].bumped = 0
            this.sounds.push(`bonk-${HENS[hen.bump].id}`)
            hen.bump = -1
          }
          const stop = hen.route.shift()
          if (stop) {
            // A turn in her way, and on.
            hen.tx = stop.x; hen.ty = stop.y
            hen.speed = stop.speed
            hen.bump = stop.bump
            return
          }
          if (hen.next) {
            // Over the sill, and on to where she was going.
            hen.tx = hen.next.x; hen.ty = hen.next.y
            hen.next = null
            return
          }
          hen.strut = false
          hen.mode = hen.peckFor > 0 ? 'peck' : 'stand'
          hen.pecked = 0
          // Her pecks sound when she is there to peck, each as her head comes down.
          if (hen.tok && hen.mode === 'peck') this.sounds.push(`${hen.tok === 'trough' ? 'peck' : 'tok'}-${HENS[i].id}`)
          hen.tok = null
          if (this.door === 'shut' && this.slide === 0) hen.inside = true
          // Standing, she turns to the trough; pecking, she stays turned the way she came.
          if (hen.mode === 'stand') hen.facing = this.door === 'shut' ? 1 : this.faces(hen)
        } else {
          hen.x += (dx / left) * stride
          hen.y += (dy / left) * stride
          hen.walked += stride * (hen.strut ? 2.3 : 1)
        }
        return
      }
      if (hen.mode === 'peck') {
        hen.peckFor -= dt
        hen.pecked += dt
        if (hen.peckFor > 0) return
        hen.peckFor = 0
        hen.pecked = 0
        hen.mode = 'stand'
        // What she came for is pecked up.
        this.eatGrain(hen)
        // Pecking done: back to where she rests, unless an answer of the hens' own is still placing her.
        if (hen.then && this.door === 'open') this.go(hen, this.restOf(i), WALK, 0, null)
        hen.then = null
      }
    })
  }

  private stepHand(dt: number): void {
    const hand = this.hand
    if (!hand) return
    hand.t += dt
    hand.since += dt
    if (hand.mode === 'held') {
      const hover = this.hoverOf(hand.thing)
      const k = 1 - Math.exp(-dt * 14)
      hand.x += (hover.x - hand.x) * k
      hand.y += (hover.y - hand.y) * k
      hand.tilt += (0 - hand.tilt) * k
      return
    }
    if (hand.mode === 'leap' || hand.mode === 'tip') {
      // At the animal the thing follows the answer's own clock: it leaps across, does what the answer says for as long as it says, and leaves.
      const use = USES[hand.cell!]
      hand.clock += dt
      if (hand.clock < LEAP_S) {
        const p = clamp01(hand.clock / LEAP_S)
        const e = ease(p)
        hand.x = hand.fromX + (hand.toX - hand.fromX) * e
        hand.y = hand.fromY + (hand.toY - hand.fromY) * e - Math.sin(p * Math.PI) * 46
        hand.tilt = e * 0.5
        return
      }
      if (hand.mode === 'leap') { hand.mode = 'tip'; hand.t = 0; hand.x = hand.toX; hand.y = hand.toY }
      const reach = use.strokes?.reach ?? use.scrub?.reach ?? 0
      let x = hand.toX + brushAt(use, hand.clock) * reach, y = hand.toY
      let tilt = 1
      if (hand.cell === 'bucket-goat') {
        // The bucket tips further with every glug the goat swallows.
        // It stands on the far side of the goat's nose and pours back towards it, so the goat's face is in view.
        tilt = -(0.5 + 0.5 * clamp01((hand.clock - GLUGS.from) / (GLUGS.every * (GLUGS.count - 1))))
      } else if (hand.cell === 'scoop-goat' && hand.clock > use.empties) {
        // The goat takes the emptied scoop in its teeth.
        hand.bitten = true
        x = TEETH.x; y = TEETH.y
      }
      const k = 1 - Math.exp(-dt * (use.strokes || use.scrub ? 40 : 12))
      hand.x += (x - hand.x) * k
      hand.y += (y - hand.y) * k
      hand.tilt += (tilt - hand.tilt) * (1 - Math.exp(-dt * 22))
      if (hand.clock >= use.empties) hand.loaded = false
      if (hand.clock >= use.leaves) {
        hand.mode = 'back'
        hand.t = 0
        hand.fromX = hand.x; hand.fromY = hand.y
      }
      return
    }
    if (hand.mode === 'back') {
      const hover = this.hoverOf(hand.thing)
      const p = clamp01(hand.t / (hand.bitten ? PING_S : BACK_S))
      const e = ease(p)
      hand.x = hand.fromX + (hover.x - hand.fromX) * e
      // It dips into its place on the way back up, and comes up full.
      hand.y = hand.fromY + (hover.y - hand.fromY) * e + Math.sin(p * Math.PI) * 18
      // A scoop the goat has bitten pings out of its mouth: it goes up and over, turning.
      if (hand.bitten) hand.y -= Math.sin(p * Math.PI) * 120
      hand.tilt = hand.bitten ? (1 - e) * 5 : Math.sign(hand.tilt || 1) * Math.min(Math.abs(hand.tilt), 1 - e)
      if (p >= 1) { hand.mode = 'held'; hand.t = 0; hand.loaded = true; hand.bitten = false; hand.cell = null }
    }
  }

  private stepBits(dt: number): void {
    const bits = this.bits
    let kept = 0
    for (let i = 0; i < bits.length; i++) {
      const bit = bits[i]
      bit.age += dt
      if (bit.kind === 'dust' || bit.kind === 'bubble') {
        bit.vx *= 1 - dt * 2.5
        bit.vy *= 1 - dt * 1.5
      } else if (bit.kind === 'feather') {
        bit.vy = Math.min(70, bit.vy + 220 * dt)
        bit.vx = Math.sin(bit.age * 6 + bit.size) * 60
      } else if (bit.kind !== 'spark') {
        bit.vy += 1500 * dt
      }
      bit.x += bit.vx * dt
      bit.y += bit.vy * dt
      // A bit that has fallen to where it lands lies there for a moment and is gone.
      if (bit.y >= bit.floor && bit.vy > 0 && bit.kind !== 'feather') {
        bit.y = bit.floor
        bit.vx = 0; bit.vy = 0
        bit.life = Math.min(bit.life, bit.age + (bit.lies ?? 0.22))
      }
      if (bit.age < bit.life) bits[kept++] = bit
    }
    bits.length = kept
  }

  // --- Helpers ------------------------------------------------------------------------

  private seen(x: number, y: number): void {
    this.look.x = x; this.look.y = y; this.look.age = 0
  }

  /** How long ago the last touch was, as 1 (now) fading to 0: how much the eyes are still on it. */
  get watching(): number {
    return 1 - clamp01((this.look.age - LOOK_S * 0.7) / (LOOK_S * 0.3))
  }

  private nearestHen(at: Point): number {
    let best = 0, d = Infinity
    this.hens.forEach((hen, i) => {
      const here = Math.hypot(hen.x - at.x, hen.y - 50 - at.y)
      if (!hen.inside && here < d) { d = here; best = i }
    })
    return best
  }

  /** The animal nearest a point, and for the hens which one. */
  private nearestTo(at: Point): { animal: AnimalId; lead: number } {
    let best: { animal: AnimalId; lead: number } = { animal: 'pony', lead: 0 }, nearest = Infinity
    for (const animal of ['pony', 'goat', 'pig'] as const) {
      const d = Math.hypot(MIDDLE[animal].x - at.x, MIDDLE[animal].y - at.y)
      if (d < nearest) { nearest = d; best = { animal, lead: 0 } }
    }
    this.hens.forEach((hen, i) => {
      const d = Math.hypot(hen.x - at.x, hen.y - 56 * HENS[i].size - at.y)
      if (!hen.inside && d < nearest) { nearest = d; best = { animal: 'hens', lead: i } }
    })
    return best
  }

  private animalUnder(at: Point): AnimalId | null {
    const target = this.targetAt(at, true)
    return target.kind === 'animal' ? target.animal : null
  }

  /** A drag let go short of an animal still counts once it has come more than half way from the thing's place to the nearest one. */
  private halfWayTo(thing: ThingId, at: Point): AnimalId | null {
    const from = HOME[thing]
    let best: AnimalId | null = null, nearest = Infinity
    for (const animal of ANIMALS) {
      if (animal === 'hens' && this.hens.every((hen) => hen.inside)) continue
      const to = animal === 'hens' ? this.flock() : MIDDLE[animal]
      const d = Math.hypot(to.x - at.x, to.y - at.y)
      if (d < nearest) { nearest = d; best = animal }
    }
    if (!best) return null
    const to = best === 'hens' ? this.flock() : MIDDLE[best]
    // More than half way: less than half of the way from its place to the animal is left. A drop off to one side, or
    // further from the animal than the thing began, is no use.
    return nearest <= 0.5 * Math.hypot(to.x - from.x, to.y - from.y) ? best : null
  }

  /** The middle of the hens that are out. */
  flock(): Point {
    const out = this.hens.filter((hen) => !hen.inside)
    if (out.length === 0) return MIDDLE.hens
    return { x: out.reduce((sum, hen) => sum + hen.x, 0) / out.length, y: out.reduce((sum, hen) => sum + hen.y, 0) / out.length - 50 }
  }

  /** Where a thing is used: tipped out over the animal, or where the answer needs it (layout.ts). Over a hen it is at her head, or above her. */
  private useAt(thing: ThingId, animal: AnimalId, lead: number): Point {
    if (animal !== 'hens') return USE_PLACE[`${thing}-${animal}`] ?? USE_AT[animal]
    if (thing === 'scoop') return USE_AT.hens
    const hen = this.hens[lead], size = HENS[lead].size
    return thing === 'brush' ? { x: hen.x + hen.facing * 10 * size, y: hen.y - 178 * size } : { x: hen.x, y: hen.y - 168 * size }
  }

  private go(hen: Hen, to: Point, speed: number, wait: number, then: Point | null, peckFor = 0): void {
    hen.tx = to.x; hen.ty = to.y
    hen.speed = speed
    hen.mode = 'go'
    hen.wait = wait
    hen.peckFor = peckFor
    hen.pecked = 0
    hen.then = then
    hen.next = null
    hen.route = []
    hen.bump = -1
    hen.strut = false
    hen.tok = null
  }

  /** A few grains fly from the scoop to each place a hen will peck, and lie there until she has pecked them up. */
  private spillGrain(places: readonly Point[]): void {
    const hand = this.hand
    if (!hand) return
    const flight = 0.5
    this.hens.forEach((hen, i) => {
      if (hen.inside) return
      for (let n = 0; n < 3 && this.bits.length < this.maxBits; n++) {
        // Just in front of where she will stand, where her beak comes down.
        const to = { x: places[i].x + (places[i].x < hen.x ? -1 : 1) * (40 + n * 9) * HENS[i].size, y: places[i].y - 2 + n * 3 }
        this.bits.push({ kind: 'grain', x: hand.x, y: hand.y, vx: (to.x - hand.x) / flight, vy: (to.y - hand.y - 750 * flight * flight) / flight, age: 0, life: 8, size: 0.8 + 0.15 * n, floor: to.y, lies: 6 })
      }
    })
  }

  /** The grain that lay by a hen is gone once she has pecked there. */
  private eatGrain(hen: Hen): void {
    for (const bit of this.bits) if (bit.kind === 'grain' && bit.lies !== undefined && Math.hypot(bit.x - hen.x, bit.y - hen.y) < 90) bit.life = 0
  }

  /**
   * What the yard does by itself while nobody touches it, on its own clock: the wants show, and the content are
   * heard. Short of the brush, the pony's coat puffs dust when it rubs on the post; short of water, the pig raises
   * dust trying to roll; by a full trough the hens croon; sunk in wet mud, the pig blows a bubble. None of it is
   * saved, and none of it happens during a scene or while the animal is answering.
   */
  private ambient(before: number): void {
    if (this.playing) return
    const due = (period: number, offset: number): boolean => Math.floor((before + offset) / period) !== Math.floor((this.time + offset) / period)
    if (!this.answers.pony && this.filled.pony === 0 && due(PONY_ITCHES.every, PONY_ITCHES.offset)) this.puff('pony', 4)
    if (!this.answers.pig && this.filled.pig === 0 && due(PIG_ROLLS.every, PIG_ROLLS.offset)) this.puff('pig', 4)
    // Short of grain, each hen scratches beside the empty trough, and her foot kicks up a little dust behind her.
    if (!this.answers.hens && this.filled.hens === 0) this.hens.forEach((hen, i) => {
      if (hen.inside || hen.mode !== 'stand' || !due(SCRATCHES.every[i], SCRATCHES.offset[i] - SCRATCHES.lasts[i] / 2)) return
      for (let n = 0; n < 2 && this.bits.length < this.maxBits; n++) this.bits.push({ kind: 'dust', x: hen.x - hen.facing * (26 + n * 12) * HENS[i].size, y: hen.y - 6, vx: -hen.facing * (40 + n * 30), vy: -26, age: 0, life: 0.55, size: 0.38 + 0.1 * n, floor: Infinity })
    })
    if (!this.answers.hens && this.filled.hens === 1 && this.door === 'open' && this.hens.every((hen) => hen.mode === 'stand' && hen.wait <= 0) && due(CROONS.every, CROONS.offset)) this.sounds.push('croon')
    if (!this.answers.pig && this.filled.pig === 1 && due(8.3, 5)) {
      // The bubble swells and bursts with a glop: the sound is placed at its burst.
      this.sounds.push('bubble')
      if (this.bits.length < this.maxBits) this.bits.push({ kind: 'bubble', x: FEET.pig.x - 150 + this.rng.next() * 60, y: FEET.pig.y - 20, vx: 0, vy: -36, age: 0, life: IDLE_BUBBLE_S, size: 1, floor: Infinity })
    }
  }

  private puff(animal: 'pony' | 'pig', count: number): void {
    const at = animal === 'pony' ? { x: FEET.pony.x + 120, y: FEET.pony.y - 170 } : { x: FEET.pig.x, y: FEET.pig.y - 30 }
    for (let n = 0; n < count && this.bits.length < this.maxBits; n++) {
      this.bits.push({ kind: 'dust', x: at.x + (this.rng.next() - 0.5) * (animal === 'pony' ? 60 : 220), y: at.y + (this.rng.next() - 0.5) * 40, vx: (this.rng.next() - 0.5) * 60, vy: -50 - this.rng.next() * 40, age: 0, life: 0.8 + this.rng.next() * 0.3, size: 0.7 + this.rng.next() * 0.5, floor: Infinity })
    }
  }

  /** All three hens set off for `places`, a moment apart, peck there, and walk home if `home` says so. */
  private sendHens(places: readonly Point[], speed: number, peckFor: number, home: boolean, after: number, stayFor: number, tok: Hen['tok']): void {
    this.hens.forEach((hen, i) => {
      if (hen.inside) return
      // Never in step: the bantam is off first and the white hen last.
      const wait = after + [0.16, 0.07, 0][i] + this.rng.next() * 0.05
      if (tok === 'visit') {
        // Grain again in the same place: a hen already running for it runs on, and one pecking there pecks on from the start.
        const to = places[i]
        if (hen.mode === 'go' && hen.wait <= 0 && hen.tx === to.x && hen.ty === to.y && hen.peckFor > 0) return
        if (hen.mode === 'peck' && hen.x === to.x && hen.y === to.y) {
          hen.peckFor = peckFor; hen.pecked = 0; hen.then = this.restOf(i)
          this.sounds.push(`tok-${HENS[i].id}`)
          return
        }
      }
      this.go(hen, places[i], speed * [0.88, 1, 1.12][i], wait, home ? this.restOf(i) : null, peckFor + stayFor)
      hen.tok = tok
    })
  }

  private throwBits(animal: AnimalId, answer: Answer, burst: Burst): void {
    const rng = this.rng
    const lead = this.hens[answer.lead]
    const middle = animal === 'hens' ? { x: lead.x, y: lead.y - 56 } : MIDDLE[animal]
    const mouth = animal === 'hens' ? { x: lead.x + lead.facing * 34, y: lead.y - 96 } : MOUTH[animal]
    const feet = animal === 'hens' ? { x: lead.x, y: lead.y } : animal === 'pig' ? { x: FEET.pig.x - 20, y: FEET.pig.y - 40 } : FEET[animal]
    // The thing, while it is at this animal for this answer: its bits start where it is.
    const hand = this.hand && this.hand.cell === answer.id && (this.hand.mode === 'tip' || this.hand.mode === 'leap') ? this.hand : null
    const floor = animal === 'hens' ? (answer.brought === 'scoop' ? TROUGH.y + 26 : lead.y) : animal === 'pig' ? FEET.pig.y - 60 : middle.y - 20
    // Nothing falls from a thing that is not there.
    if (burst.from === 'thing' && !hand) return
    for (let n = 0; n < burst.count && this.bits.length < this.maxBits; n++) {
      const r = (): number => rng.next() * 2 - 1
      let x = middle.x, y = middle.y, vx = 0, vy = 0, life = 1.4, at = floor
      if (burst.from === 'thing') {
        const from = hand!
        x = from.x + r() * 30; y = from.y + 10 + r() * 10
        vx = r() * 70; vy = 40 + rng.next() * 160
        // The pony's lip and the goat's mouth take the grain straight off the scoop: it goes across into the mouth and is gone.
        if (answer.brought === 'scoop' && (animal === 'goat' || animal === 'pony')) { x = from.x + r() * 12; vx = ((mouth.x - x) / 0.2) * (0.8 + 0.4 * rng.next()); vy = -40 + r() * 30; at = mouth.y + r() * 6; life = 0.3 }
        // The hay goes into the rack: it drops between the bars and stays there.
        if (answer.id === 'fork-goat') { x = from.x + r() * 26; vx = r() * 20; at = RACK.y + RACK.h * (0.45 + 0.4 * rng.next()); life = 0.9 }
      } else if (burst.from === 'mouth') {
        x = mouth.x + r() * 8; y = mouth.y + r() * 8
      } else if (burst.from === 'horn') {
        x = HORN.x + r() * 3; y = HORN.y + r() * 3
      } else if (burst.from === 'body') {
        const w = animal === 'hens' ? 40 : BODY[animal].w * 0.36, h = animal === 'hens' ? 34 : BODY[animal].h * 0.3
        x = middle.x + r() * w; y = middle.y + r() * h
      } else {
        x = feet.x + r() * 110; y = feet.y + r() * 16
      }
      if (burst.way === 'blow') {
        // The pony sneezes out to its front, which is the left; its shake throws spray to the right, at the goat.
        if (burst.from === 'mouth') {
          vx = -(180 + rng.next() * 240); vy = -200 + r() * 120
          at = FEET.pony.y + 44 + r() * 14
        } else {
          vx = 520 + rng.next() * 380; vy = -380 + r() * 120
          at = MIDDLE.goat.y + 40 + r() * 60
        }
        life = 1.2
      } else if (burst.way === 'burst') {
        const a = rng.next() * Math.PI * 2, s = 170 + rng.next() * 300
        vx = Math.cos(a) * s; vy = Math.sin(a) * s - 180
        at = feet.y + 10 + r() * 20
        life = burst.kind === 'spark' ? 0.36 : 1.2
        // A spark off the tip of a horn flies up and out, away from the head.
        if (burst.from === 'horn') { const up = -Math.PI * (0.15 + 0.7 * rng.next()); vx = Math.cos(up) * s * 0.8; vy = Math.sin(up) * s * 0.8 }
      } else if (burst.way === 'rise') {
        vx = r() * 50; vy = burst.kind === 'bubble' ? -40 - rng.next() * 30 : burst.kind === 'feather' ? -150 : -70 - rng.next() * 60
        life = burst.life ?? (burst.kind === 'bubble' ? 0.55 + rng.next() * 0.25 : burst.kind === 'feather' ? 1.7 : 0.75 + rng.next() * 0.3)
        at = Infinity
        if (burst.kind === 'drop') { vy = -520 - rng.next() * 160; vx = 60 + r() * 60; at = feet.y; life = 1.3 }
      } else if (burst.from !== 'thing') {
        vx = r() * 40; vy = 30 + rng.next() * 60
        at = feet.y + r() * 8
      }
      // The goat's one spark is a long one.
      this.bits.push({ kind: burst.kind, x, y, vx, vy, age: 0, life, size: burst.kind === 'spark' ? 2 : 0.7 + rng.next() * 0.6, floor: at })
    }
  }

  // --- For the idle ladder ---------------------------------------------------------------

  /**
   * What the idle ladder shows next: one move a child could make now. `turn` moves on with each showing: how a thing
   * is picked up, that it can be carried, and which animal is short of it.
   */
  want(turn: number): Want {
    if (this.door === 'shut') return { kind: 'door' }
    if (this.hand) {
      // With a thing lifted the hand shows the animal that is short of it; once that animal has it, any animal in turn.
      const wants = ANIMALS.find((animal) => RIGHT[animal] === this.hand!.thing)!
      return { kind: 'animal', animal: this.content.has(wants) ? ANIMALS[(ANIMALS.indexOf(wants) + 1 + turn) % ANIMALS.length] : wants }
    }
    const short = ANIMALS.filter((animal) => !this.content.has(animal))
    // A full morning: play on with any thing, or slide the door for the night.
    if (short.length === 0) return turn % 2 === 1 ? { kind: 'door' } : { kind: 'thing', thing: THINGS[(turn >> 1) % THINGS.length] }
    const first = short[(turn >> 1) % short.length]
    if (turn % 2 === 0) return { kind: 'thing', thing: RIGHT[first] }
    // A carry: the thing one animal is short of, to that animal.
    return { kind: 'carry', thing: RIGHT[first], animal: first }
  }
}
