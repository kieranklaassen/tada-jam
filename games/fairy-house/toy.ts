import { AIR, BUSH, HILL, ROOT, WOOD } from './voices'
import { ACTS as EVENING_ACTS, AT_REST, FULLEST, GAIT, STRETCH, sleeping, type Direction, type Effect, type Told } from './acts'
import type { Cell, Form } from './cells'
import { PAIR_AT, TIDY_ASLEEP, heapPlace, pairPlace, planEvening, widestFree, type Asleep, type Part, type Plan } from './evening'
import { FOLK, Folk, HELD, PERSONALITY, TOWARD, type Act, type Pose, type Who } from './folk'
import type { Guidance } from './guidance'
import { BODY, BUSHES, FLOOR_FROM, FOUND, HILL_AIR, HOLLOW, HOME_CONTROL, ROOTS, TREE, ceilingY, groundY, hillTop, overHollow, rootUnder, type Home, type Kind } from './kinds'
import { FLAG_HANG, SEESAW_SHIFT, flagPress, touchBox, type Lying } from './lie'
import { build, carriedWith, isRested, joined, laidOf, sameRest, settle, topOf, without, type Laid, type Rested, type Shed } from './rest'
import { makeRng, type Rng } from './rng'
import type { Save } from './save'
import { Scene, type Beat } from './scene'
import { BYSTANDER, EVENING, FOLK_VOICE, LAND, LIFT, SHED, STEP, STOP, SUN, SUNRISE, SUNSET, knock, pat, softer, touchOnly, tumble, turnKnock, type Voice } from './voices'

// The game: carrying a found thing into the hollow and setting it down, and
// the evening the child calls by pulling the sun below the hill. This module
// holds everything that happens, with no drawing in it. The Mount hands it
// touches in stage units and steps it on game time; the view draws what
// `show` returns; `toSave` is what goes to storage.
//
// What is saved is decided at the moment of a touch: a thing let go is in the
// house, at rest, before it has finished falling, and an evening is saved
// whole when the sun is let go. Falling, tumbling, rocking, every face and
// both scenes are views of that state, played on a fixed step. What is shown
// is kept apart from what is saved until the beat that shows it.
//
// Sight and sound run on one clock. A sound is queued in the step in which
// the thing it belongs to is seen to happen (a touch-down, a knock of a
// rocking cell, a bounce on the way home, the start of an answer, a step of
// one of the folk, a moment of an act), and `counts` counts those moments so
// a test can hold the two together.

/** The fixed step of play, in seconds. */
export const TICK = 1 / 120
/** How far a thing hops up under the finger, and is carried above where it was taken hold of. */
export const CARRY = 34

/** A sound and what made it. `scene` marks a sound of a scene that is being watched: a touch that ends the scene cuts it. */
export type Sound = { voice: Voice; from: string; scene: boolean }

type Spring = { at: number; speed: number }

/** One leap of a thing on its way home: where from and to, how high, how long, how far it turns over it, and whether it comes down on the earth or on the acorn cap it bounced on. */
type Arc = { fromX: number; fromY: number; toX: number; toY: number; lift: number; lasts: number; turn: number; on: 'earth' | 'cap' }

type Body = {
  id: number
  kind: Kind
  home: Home
  /** Where it is drawn: its middle along the stage, its underside, and its turn in radians. */
  x: number
  y: number
  angle: number
  speed: number
  mode: 'still' | 'held' | 'fall' | 'tumble' | 'sail' | 'slide'
  /** How it is drawn: as it lies in its cell, or loose. */
  form: Form | 'loose'
  cell: Cell | null
  /** Where it is shown to rest in the hollow, or null on the forest floor. During a scene this runs behind the saved house. */
  rest: Rested | null
  side: -1 | 1
  /** Shown as a twig the fat one has snapped, and as soaked by a bath. */
  snapped: boolean
  wet: boolean
  /** Positive is squashed flat, negative stretched tall. */
  squash: Spring
  squashStiffness: number
  squashDamping: number
  /** The swing of a cell that rocks, rolls or swings: seconds since it touched down, where in its swing it is, and its value now. */
  rock: { t: number; phase: number; knocks: number; /** A see-saw turning over starts from its other end: twice as far as one tipping from level. */ deep?: number } | null
  swing: number
  bouncesLeft: number
  /** How many times it has come down since it was let go. */
  hops: number
  /** Where a moving thing is going, and whether it is shed from there. */
  to: { x: number; y: number; angle: number } | null
  /** Where a thing that slides aside first touches down: it falls straight to here, and slides from here to where it lies. */
  via: { x: number; y: number } | null
  /** The turn a falling twig keeps in the air, so that it lands as it will lie. */
  airTurn: number
  shed: Shed['shedBy'] | 'out' | null
  /** A landing is softer when nothing changed: a thing tapped, dropping back where it lay. */
  soft: boolean
  arcs: Arc[]
  arcAt: number
  /** How it was turned when its leap began. */
  spinFrom: number
  /** How many times it has visibly knocked on something. */
  hits: number
  /** Seconds it has been falling, for a feather's drift. */
  air: number
  /** How far the dew has welled up in an acorn cap that came to rest cup up on the ground: 0 as it lands, 1 when it is full. */
  well: number
}

type Hand = {
  /** The thing under the finger, and what goes up with it. */
  id: number
  bundle: number[]
  /** Where the finger is, in stage units. */
  x: number
  y: number
  carrying: boolean
  /** Where the thing's underside was, from the finger, when it was taken hold of. */
  grabX: number
  grabY: number
  /** Where each thing that goes up with it lies, from it. */
  offsets: Map<number, { dx: number; dy: number }>
  /** What the carried things were, each where it lay, to set them down again together. */
  origin: Laid[]
  /** The whole house as it was before the lift, to put everything back if the drag is taken away. */
  before: Laid[]
  /** The base's resting place when it was lifted, for what it carries. */
  baseX: number
  /** How the thing was turned when it was taken hold of: it is carried as it lay. */
  keep: number
  /** Something lies on it that also lies on another: under the finger it does not rise through that, and stays down until it is carried off. */
  pinned: boolean
}

/** Where the finger wants the carried thing's underside. */
function wanted(hand: Hand): { x: number; y: number } {
  return { x: hand.x + hand.grabX, y: hand.y + hand.grabY - (hand.pinned && !hand.carrying ? 0 : CARRY) }
}

/** How near the ground a landing has to be to raise its dust: on the ground, or on a rug that lies on it. */
const DUST_NEAR = 24
/** How long a puff and a spill are seen, in seconds, and how fast a slab sails. */
export const PUFF_SECONDS = 0.55
export const SPILL_SECONDS = 2.2
/** How long the dew takes to well up in a bath: as long as its gurgle. */
export const WELL_SECONDS = 0.34
/** How each of the three that carry nothing sends a thing off: a leaf flips it, an acorn cap bounces it, a feather lets it slide. */
export const SHED_MOTION = { leaf: { rise: 124, lasts: 0.52 }, cap: { lift: 56, lasts: 0.26, aside: 8 }, feather: { aside: 76, lasts: 0.3 } } as const
/** How fast a thing leaves the ground when it hops sideways to a new place. */
const HOP_OVER = 420
/** How fast a thing slides aside to its free place, in units a second. */
const SLIDE_PACE = 340
/** How a rocking thing's swing narrows over its turns: 1 would be an even narrowing. */
const ROCK_SHAPE = 0.8
/** What makes the moss under it bulge, and by how much: wider, and a little lower. */
const BULGES: ReadonlySet<string> = new Set(['bed', 'pillow'])
const BULGE = { wide: 1.09, low: 0.9 } as const
/** How far a twig bows under a pebble balanced on its tip, in degrees. */
const BOW = 6

const SPRING: Record<Kind, { stiffness: number; damping: number }> = {
  leaf: { stiffness: 260, damping: 14 },
  cap: { stiffness: 500, damping: 30 },
  pebble: { stiffness: 620, damping: 42 },
  bark: { stiffness: 380, damping: 22 },
  twig: { stiffness: 520, damping: 30 },
  moss: { stiffness: 120, damping: 9 },
  feather: { stiffness: 160, damping: 12 },
}

/**
 * The sun stands over the hill at the right of the stage and moves on one upright track: `y` by day, `setY` at
 * evening, where it lies on the hill line (`hill`), half behind it. `r` is the round shape a finger takes it by.
 * Let go below the hill by day (`sink` or lower: three quarters of its disc are behind the hill), the evening
 * starts; let go above the hill at evening (`rise` or higher), the morning does. The track runs from `y` down to
 * `under`, where the sun is wholly behind the hill, and never above `y`: its touch shape stays clear of the
 * grown-up's corner.
 */
export const SUN_AT = { x: 1106, y: 260, setY: 420, r: 73, hill: 420, sink: 440, rise: 392, under: 462, drift: 34 } as const

/** Where the sun is drawn along the stage at a height on its track: as it goes down it leans out to the right, clear of the tidy one's hat, and its disc never leaves the round a finger takes it by. */
export function sunX(y: number): number {
  const t = clamp((y - SUN_AT.y) / 84, 0, 1)
  return SUN_AT.x + SUN_AT.drift * t * t * (3 - 2 * t)
}
export const OWL_AT = { x: 742, y: 168, r: 40 } as const
/** The snail creeps back and forth along the top of the left root. */
export const SNAIL_PATH = { fromX: 280, fromY: 580, toX: 314, toY: 568, r: 38 } as const
/** The moth flies a slow loop over the left of the wood. `r` is the round shape a finger finds it by: like the snail's and the owl's, 48 px across or more on the smallest tablet surface. */
export const MOTH_LOOP = { x: 250, y: 236, rx: 150, ry: 78, r: 38 } as const
/** In the hollow the three are drawn this much smaller than at their places round the tree: they are further off there. */
export const INSIDE = 0.62
/** Half the width of each of the three, for lying down on the ground and not in it. */
const HALF: Record<Who, number> = { fat: 104, tidy: 44, tiny: 42 }
/** How each drops off a thing that leaves from under it: how it starts, how it takes the landing, and whether it bounces. */
const DROP_PULL = 2400
const DROP_OFF: Record<Who, { start: number; kick: number; part: number; dust: boolean; hops: number; hop: number }> = {
  fat: { start: 0, kick: 2.2, part: 2.6, dust: true, hops: 0, hop: 0 },
  tidy: { start: -120, kick: 0.6, part: 1, dust: false, hops: 0, hop: 0 },
  tiny: { start: -260, kick: -1.4, part: 2, dust: false, hops: 1, hop: 220 },
}
/** Where each lies in the heap, from the heap's middle. */
const HEAP: Record<Who, number> = { fat: -34, tidy: 44, tiny: 0 }
/** Where the other two sit when the fat one is in a bed, from the middle of the free floor. */
const PAIR: Record<Who, number> = { fat: 0, ...PAIR_AT }

export type ShownThing = Lying & {
  id: number
  /** It lies in the hollow: what of it reaches past the opening is behind the trunk. */
  housed: boolean
  extra: Cell['extra']
  /** How far the dew has welled up in a bath, 0 to 1. */
  well: number
  glows: boolean
  wet: boolean
}

/** Where one of the three stands: its feet, its whole body's turn about them, and how large it is drawn. */
export type Stand = { x: number; y: number; turn: number; scale: number }

/**
 * Something small and short-lived in the air: pencil dust, drops of water, fluff; leaves shaken out of a bush, a
 * beetle's legs and feelers stirring under a root, far birds going up off the hill.
 */
export type Puff = { x: number; y: number; age: number; seed: number; kind: 'dust' | 'water' | 'fluff' | 'leaves' | 'stir' | 'far' }

export type Show = {
  /** In drawing order: what lies in the hollow as it came to rest, what lies on the forest floor, what is in the air, what is in the hand. */
  things: ShownThing[]
  /** What is drawn in front of the folk in the hollow: a thing one of them is in, wears or holds. */
  front: ShownThing[]
  /** Where the carried thing would come to rest. */
  shadow: { x: number; y: number; w: number } | null
  folk: Record<Who, Pose>
  stand: Record<Who, Stand>
  /** Whether each is in the hollow, drawn in front of what lies there. */
  inside: Record<Who, boolean>
  /** Whether each is on its way from one place to another: it goes behind what stands in the hollow, and is drawn before it. */
  behind: Record<Who, boolean>
  snail: { x: number; y: number; hidden: number; facing: -1 | 1 }
  moth: { x: number; y: number; flap: number; facing: -1 | 1 }
  owl: { duck: number; shut: boolean; gazeX: number; gazeY: number }
  sun: { x: number; y: number; bob: number; turn: number; glows: boolean }
  /** How far the light has turned to dusk, 0 to 1. It follows the sun's height. */
  dusk: number
  puffs: Puff[]
  /** Water a bath has spilt along the ground, sinking away. */
  spill: { from: number; to: number; y: number; fade: number } | null
  glow: number
  hand: { x: number; y: number; press: number; opacity: number } | null
  seconds: number
}

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const smooth = (t: number): number => t * t * (3 - 2 * t)

function pull(spring: Spring, stiffness: number, damping: number, step: number): void {
  spring.speed += (-stiffness * spring.at - damping * spring.speed) * step
  spring.at += spring.speed * step
}

/** A twig or a slab of bark that lies across the tip of one standing twig alone, and so balances on it. */
function onOneTip(rest: Rested): boolean {
  return rest.on === 'twig' && rest.under.length === 1 && ((rest.kind === 'twig' && rest.lies === 'across') || rest.kind === 'bark')
}

/** How a thing is turned where it rests. A leaf on a pebble with no room to lean lies level. */
function restAngle(rest: Rested): number {
  // A see-saw's lean is drawn from its stone (`lying`): the slab itself is held level and tipped from there.
  if (rest.lies !== rest.cell.form || rest.lies === 'tipped') return 0
  // A twig or a slab laid on one twig alone tips to the side it was set down on: a crosspiece, a tippy table.
  if (onOneTip(rest)) return (rest.kind === 'twig' ? 0.2 : 0.09) * rest.side
  const tilt = (rest.cell.tilt * Math.PI) / 180
  return rest.cell.sided ? tilt * rest.side : tilt
}

const sameLie = sameRest

/** Whether a thing lies level and still on what carries it: flat, not leaning, not tipped on one twig, and in a cell that neither rocks nor bounces. */
export function isLevel(rest: Rested): boolean {
  return rest.cell.tilt === 0 && rest.cell.rock === null && rest.cell.bounces === 0 && restAngle(rest) === 0 && rest.lies !== 'ramp' && rest.lies !== 'slung' && rest.tilt === undefined
}

/** Where a thing's picture is put when it rests: its middle along the stage and its underside. A see-saw is held at the top of its stone, level, and tipped from there. */
function restPoint(rest: Rested): { x: number; y: number } {
  if (rest.lies !== 'tipped') return { x: rest.x, y: rest.y }
  const lean = rest.lean ?? 0
  return { x: rest.x - rest.side * SEESAW_SHIFT * Math.cos(lean) + rest.side * SEESAW_SHIFT, y: rest.y - (rest.cell.w / 2 + SEESAW_SHIFT) * Math.sin(lean) }
}

/** Where one of the three is for now: on a thing (it goes where the thing goes) or at a place, how large, and which way its act goes. */
type Base = { x: number; y: number; on: number | null; scale: number; dir: -1 | 1; inside: boolean; /** How far from the middle of the thing it stands on. */ off?: number }

/** How a thing is worn or held: a lamp as a hat, a flag held high, a broom held low, a cloth wrapped round. */
type Worn = 'hat' | 'high' | 'low' | 'wrap'
const HOW_WORN: Partial<Record<Part['act'], Worn>> = { lamp: 'hat', flag: 'high', broom: 'low', tablecloth: 'wrap' }
/** How long a thing takes from where it lies onto a head or into a hand, and back: it is seen to go, and never jumps there. */
const TAKE_SECONDS = 0.16
/** The acts in which the one who acts is in its thing, which is then drawn in front of it. */
const IN_IT: ReadonlySet<Part['act']> = new Set<Part['act']>(['bed', 'bath', 'cradle', 'bowl'])
/** Seconds the walk to the heap takes: the three go together. */
const HEAP_WALK = 0.9
/** How far from the sail the tidy one stands on the slab. */
const SAIL_BESIDE = 46
/** How long a slab takes to sail to where it stops: as long as its whoosh is heard. */
const SAIL_SECONDS = 0.55

const homeOf = (who: Who): Base => ({ x: PERSONALITY[who].feet.x, y: PERSONALITY[who].feet.y, on: null, scale: 1, dir: 1, inside: false })

export class Toy {
  readonly sounds: Sound[] = []
  /** What the last touch or step changed that storage has not been handed yet. */
  dirty: 'no' | 'soon' | 'now' = 'no'
  /** A touch has just ended a scene: its sounds are cut. The Mount reads this and sets it back. */
  sceneCut = false
  readonly folk: Record<Who, Folk>
  /** The saved house, and what else is saved. */
  private house: Rested[]
  private snapped: Set<number>
  private soaked: Set<number>
  private asleep: Asleep[]
  private finished: boolean
  private readonly bodies: Body[]
  private hand: Hand | null = null
  /** A finger on the sun: where the sun is from the finger, and whether it has been moved. */
  private sunHand: { grab: number; dragging: boolean } | null = null
  private scene: Scene | null = null
  private readonly base: Pick<Save, 'v' | 'position'>
  private readonly rng: Rng
  private puffs: Puff[] = []
  private spill: { from: number; to: number; y: number; age: number } | null = null
  private readonly sun = { y: SUN_AT.y as number, speed: 0, bob: { at: 0, speed: 0 }, turn: 0 }
  private snail = { along: 0.2, dir: 1 as -1 | 1, hidden: 0 }
  private moth = { phase: 0, dart: 0 }
  private owl = { duck: 0, blinkIn: 3, blink: -1 }
  /** Where each of the three is, what it is told to be, and how it sleeps. */
  private where: Record<Who, Base> = { fat: homeOf('fat'), tidy: homeOf('tidy'), tiny: homeOf('tiny') }
  /** Those dropping to the ground from a thing that has left from under them: how fast, and whether it has bounced. */
  private drops: Partial<Record<Who, { speed: number; hops: number }>> = {}
  /** Those on their way from place to place: they walk behind what stands between. */
  private going: Record<Who, boolean> = { fat: false, tidy: false, tiny: false }
  private told: Record<Who, Direction | null> = { fat: null, tidy: null, tiny: null }
  private abed: Record<Who, 'bed' | 'heap' | null> = { fat: null, tidy: null, tiny: null }
  /** Things drawn in front of the folk, and things one of them wears or holds. */
  private readonly front = new Set<number>()
  private readonly worn = new Map<number, { who: Who; how: Worn; /** How far it has come from where it lay, 0 to 1. */ taken: number; back: boolean }>()
  /** Steps of the folk and moments of their acts that have been seen, for the sync test. */
  private readonly seen = { steps: 0, cues: 0 }
  private sleepClock = 0
  private left = 0
  seconds = 0

  constructor(save: Save, seed: number) {
    this.base = { v: save.v, position: save.position }
    this.rng = makeRng(seed)
    this.snapped = new Set(save.snapped)
    this.soaked = new Set(save.soaked)
    this.house = build(save.things, this.snapped)
    this.finished = save.finished
    this.asleep = save.finished ? save.asleep.map((entry) => ({ ...entry })) : []
    this.bodies = FOUND.map((found) => {
      const spring = SPRING[found.kind]
      const body: Body = {
        id: found.id, kind: found.kind, home: found.home, x: found.home.x, y: found.home.y, angle: found.home.angle, speed: 0, mode: 'still',
        form: 'loose', cell: null, rest: null, side: 1, snapped: false, wet: false, squash: { at: 0, speed: 0 }, squashStiffness: spring.stiffness, squashDamping: spring.damping,
        rock: null, swing: 0, bouncesLeft: 0, hops: 0, to: null, via: null, airTurn: 0, shed: null, soft: false, arcs: [], arcAt: 0, spinFrom: 0, hits: 0, air: 0, well: 1,
      }
      return body
    })
    const folkSeed = makeRng(seed ^ 0x5f3759df)
    this.folk = { fat: new Folk('fat', makeRng(folkSeed.next() * 2 ** 32)), tidy: new Folk('tidy', makeRng(folkSeed.next() * 2 ** 32)), tiny: new Folk('tiny', makeRng(folkSeed.next() * 2 ** 32)) }
    // As it was left: every thing lies where it rests, each of the three is where the state has it, and nothing eases in.
    this.asLoaded()
  }

  /** Something is in the hand or in the air, or a scene is playing. The idle ladder waits while it is. What the folk do by themselves is not counted. */
  get busy(): boolean {
    return this.hand !== null || this.sunHand !== null || this.playing || this.bodies.some((body) => body.mode !== 'still')
  }

  /** A scene is being watched. */
  get playing(): boolean {
    return this.scene !== null && this.scene.running
  }

  /** The evening stands. */
  get evening(): boolean {
    return this.finished
  }

  /** The things in the hollow, as they rest. */
  get rested(): readonly Rested[] {
    return this.house
  }

  /** How often each thing has visibly knocked, how many answers each of the folk has started, and how many steps and moments of their acts have been seen. */
  counts(): { hits: number[]; answers: Record<Who, number>; steps: number; cues: number } {
    return { hits: this.bodies.map((body) => body.hits), answers: { fat: this.folk.fat.answers, tidy: this.folk.tidy.answers, tiny: this.folk.tiny.answers }, steps: this.seen.steps, cues: this.seen.cues }
  }

  /** What goes to storage. A thing in the hand is saved where it came from: nothing is saved in the air. */
  toSave(): Save {
    const hand = this.hand
    const things = hand && hand.origin.length > 0 ? hand.before.map(({ id, x }) => ({ id, x })) : laidOf(this.house)
    const inHouse = new Set(things.map((thing) => thing.id))
    const kept = (ids: Set<number>): number[] => [...ids].filter((id) => inHouse.has(id)).sort((a, b) => a - b)
    return { ...this.base, finished: this.finished, things, snapped: kept(this.snapped), soaked: kept(this.soaked), asleep: this.asleep.map((entry) => ({ ...entry })) }
  }

  // --- Touch ---------------------------------------------------------------

  /** A finger lands at a point of the stage. Whatever is there answers in this call. `corner` is the grown-up's corner, which answers nothing. */
  press(x: number, y: number, corner = false): void {
    if (corner) return
    // A touch ends a scene: every beat lands where it was going, without its sounds, and the touch is then an ordinary touch.
    this.endScene()
    if (this.hand || this.sunHand) return
    // At evening the three lie in front of what is in the hollow, so a finger finds them first.
    const sleeper = this.finished ? this.folkAt(x, y) : null
    const body = sleeper ? null : this.thingAt(x, y)
    if (body && this.finished) {
      // While the evening stands nothing in the hollow is carried: the thing hops with its own sound.
      body.squash.speed -= 5
      this.say(LIFT[body.kind], `lift ${body.id}`)
      return
    }
    if (body) {
      const bundle = body.rest ? carriedWith(this.house, body.id).map((r) => r.id) : [body.id]
      const offsets = new Map(bundle.map((id) => [id, { dx: this.bodies[id].x - body.x, dy: this.bodies[id].y - body.y }]))
      // A thing that carries its load alone goes up with it. One that shares a load with another support (a twig under
      // a roof that lies across two) does not rise under the finger: nothing goes through the thing on it.
      const pinned = this.house.some((r) => !bundle.includes(r.id) && r.under.some((under) => bundle.includes(under)))
      this.hand = { id: body.id, bundle, x, y, carrying: false, grabX: body.x - x, grabY: body.y - y, offsets, origin: [], before: [], baseX: body.rest?.x ?? body.x, keep: body.angle, pinned }
      for (const id of bundle) {
        const b = this.bodies[id]
        b.mode = 'held'
        b.rock = null
        b.swing = 0
        b.to = null
      }
      // It hops up under the finger and stretches.
      body.squash.speed -= 5
      this.say(LIFT[body.kind], `lift ${body.id}`)
      for (const who of FOLK) {
        this.folk[who].watch(body.x, body.y - 40, 3)
        this.folk[who].notice('see')
      }
      return
    }
    // The snail creeps close beside the fat one: a finger on it finds it, and not the air round the fat one's elbow.
    const snail = this.snailAt()
    if (!sleeper && Math.hypot(x - snail.x, y - (snail.y - 16)) <= SNAIL_PATH.r) {
      this.snail.hidden = 2.4
      this.say(BYSTANDER.snail, 'snail')
      return
    }
    const who = sleeper ?? this.folkAt(x, y)
    if (who) {
      const says = this.folk[who].poke()
      if (says) this.say(FOLK_VOICE[who][says], `folk ${who}`)
      const at = this.standOf(who)
      for (const other of FOLK) if (other !== who) this.folk[other].watch(at.x, at.y - 120 * at.scale, 1.5)
      return
    }
    if (Math.hypot(x - SUN_AT.x, y - this.sun.y) <= SUN_AT.r) {
      // The sun bobs and rings, and is in the hand: it is the one thing that is dragged at any hour.
      this.sunHand = { grab: this.sun.y - y, dragging: false }
      this.sun.bob.speed += 5
      this.sun.turn += 0.5
      this.say(SUN, 'sun')
      return
    }
    if (Math.hypot(x - OWL_AT.x, y - OWL_AT.y) <= OWL_AT.r) {
      this.owl.duck = 1
      this.say(BYSTANDER.owl, 'owl')
      return
    }
    const moth = this.mothAt()
    if (Math.hypot(x - moth.x, y - moth.y) <= MOTH_LOOP.r) {
      this.moth.dart = 1
      this.say(BYSTANDER.moth, 'moth')
      return
    }
    for (const one of FOLK) if (!this.abed[one]) this.folk[one].watch(x, y, 1.2)
    const where = placeOf(x, y)
    if (where === 'ground') {
      // Bare ground: a puff of pencil dust and a pat.
      this.puff(x, y, 'dust')
      this.say(pat(1 - y / 820), 'pat')
      if (!this.finished) this.folk.tidy.notice('dust')
    } else if (where === 'wood') {
      // The tree's bark: a dry knock, and the owl in its knot hole shuts its eyes at it. No dust.
      this.owl.blink = 0
      this.owl.blinkIn = 2.5 + 3 * this.rng.next()
      this.say(WOOD, 'wood')
    } else if (where === 'root') {
      // A root: it knocks low, as thick wood does, and something under it stirs, where the earth begins. No dust.
      this.puff(clamp(x, 20, 1160), rootUnder(x), 'stir')
      this.say(ROOT, 'root')
    } else if (where === 'bush') {
      // A bush: it rustles, and a few leaves are shaken out of it.
      this.puff(x, y, 'leaves')
      this.say(BUSH, 'bush')
    } else if (where === 'hill') {
      // The hill is far off: it answers small, and a few far birds go up off its top.
      this.puff(x, hillTop(x, STAGE_SEEN), 'far')
      this.say(HILL, 'hill')
    } else {
      // The open sky: a breath of air, and the moth flutters off faster. No dust.
      this.moth.dart = Math.max(this.moth.dart, 0.6)
      this.say(AIR, 'air')
    }
  }

  /** The finger has moved far enough to be carrying. The thing leaves where it lay, with what rests on it alone. */
  dragStart(): void {
    if (this.sunHand) {
      this.sunHand.dragging = true
      return
    }
    const hand = this.hand
    if (!hand || hand.carrying) return
    hand.carrying = true
    const lifted = this.house.filter((r) => hand.bundle.includes(r.id))
    hand.origin = laidOf(lifted)
    hand.before = laidOf(this.house)
    if (lifted.length === 0) return
    const { house, moved, shed } = without(this.house, hand.bundle, this.snapped)
    this.house = house
    for (const id of hand.bundle) this.bodies[id].rest = null
    // What lay across two supports and lost one settles on the one that is left, and what reaches a top that is
    // now free settles across it: each is seen to move and heard to land. Nothing else lies otherwise than it did.
    for (const rest of house) if (!moved.includes(rest)) this.bodies[rest.id].rest = rest
    for (const rest of moved) this.layAgain(this.bodies[rest.id], rest, false)
    for (const { id, from } of shed) {
      this.shedHome(this.bodies[id], from.shedBy)
      // The three answer a thing that is shed, whatever shed it.
      this.noticeAll('tumble', this.bodies[id].x, this.bodies[id].y)
    }
    this.dirty = 'soon'
  }

  dragMove(x: number, y: number): void {
    if (this.sunHand?.dragging) {
      // The sun goes up and down its track with the finger, and the light with it.
      this.sun.y = clamp(y + this.sunHand.grab, SUN_AT.y, SUN_AT.under)
      this.sun.speed = 0
      return
    }
    if (!this.hand) return
    this.hand.x = x
    this.hand.y = y
  }

  /** The finger let go while carrying: the drop is the child's. */
  drop(): void {
    if (this.sunHand) {
      const moved = this.sunHand.dragging
      this.sunHand = null
      if (!moved) return
      // Where the sun is let go decides: below the hill by day the evening starts, above it at evening the morning does.
      if (!this.finished && this.sun.y >= SUN_AT.sink) this.startEvening()
      else if (this.finished && this.sun.y <= SUN_AT.rise) this.startMorning()
      return
    }
    const hand = this.hand
    if (!hand) return
    if (!hand.carrying) return this.release()
    this.hand = null
    const base = this.bodies[hand.id]
    const { x: tx, y: ty } = wanted(hand)
    const members = hand.bundle.filter((id) => id !== hand.id)
    if (!overHollow(hand.x, hand.y) && !overHollow(tx, ty - 10)) {
      // Let go outside the hollow: everything in the hand tumbles back to its own place.
      this.say(SHED.out, `out ${base.id}`)
      for (const id of hand.bundle) this.tumbleHome(this.bodies[id])
      this.noticeAll('tumble', base.x, base.y)
      this.prune()
      this.dirty = 'soon'
      return
    }
    const result = settle(this.house, base.id, base.kind, tx, this.snapped, ty)
    if (!isRested(result)) {
      // It cannot rest there: it drops onto what sheds it (or, with no free place anywhere, onto what is in its way) and goes home from there. What it carried goes home too.
      this.fallToward(base, result.x, result.y, 0)
      base.shed = result.shedBy
      base.rest = null
      for (const id of members) this.tumbleHome(this.bodies[id])
      this.prune()
      this.dirty = 'soon'
      return
    }
    const lain = this.join(result)
    // Where it has to slide aside it comes straight down, touches what is in its way and slides to its free place.
    this.fallTo(base, lain, false, result.aside ?? null)
    // What it carried is set down again on it, each where it lay.
    for (const laid of hand.origin) {
      if (laid.id === hand.id) continue
      const member = this.bodies[laid.id]
      const again = settle(this.house, member.id, member.kind, laid.x + (result.x - hand.baseX), this.snapped)
      if (isRested(again)) this.fallTo(member, this.join(again), true)
      else this.shedHome(member, again.shedBy)
    }
    this.prune()
    this.dirty = 'soon'
  }

  /** The press ended without a drag: a tap, or a press that was taken away. The thing drops back where it was and nothing has changed. */
  release(): void {
    if (this.sunHand) {
      // The sun goes back to where the hour has it.
      this.sunHand = null
      return
    }
    const hand = this.hand
    if (!hand) return
    if (hand.carrying) return this.cancel()
    this.hand = null
    for (const id of hand.bundle) this.backToPlace(this.bodies[id])
  }

  /** The drag was taken away with the finger still down: the child made no drop, so what is in the hand goes back where it came from, and the sun to where the hour has it. */
  cancel(): void {
    this.sunHand = null
    const hand = this.hand
    if (!hand) return
    this.hand = null
    if (hand.origin.length > 0) {
      // The house is as it was before the lift: what was in the hand, and whatever settled again or was shed when it went up.
      this.house = build(hand.before, this.snapped)
      for (const rest of this.house) {
        const body = this.bodies[rest.id]
        if (body.mode === 'still' && body.rest && sameLie(body.rest, rest)) body.rest = rest
        else this.fallTo(body, rest, true)
      }
      this.dirty = 'soon'
    }
    for (const id of hand.bundle) if (this.bodies[id].mode === 'held') this.backToPlace(this.bodies[id])
  }

  /**
   * The game is put away. A finger that was down has not let go, so what it held goes back; a scene lands where
   * it was going; and everything is laid at rest exactly as opening the game again would find it. No sound is
   * left queued.
   */
  putAway(): void {
    this.cancel()
    this.endScene()
    this.prune()
    this.asLoaded()
    this.sounds.length = 0
  }

  /** A snapped twig and a soaked thing are whole and dry again once they are back on the forest floor. */
  private prune(): void {
    const kept = new Set(this.house.map((r) => r.id))
    for (const id of [...this.snapped]) if (!kept.has(id)) this.snapped.delete(id)
    for (const id of [...this.soaked]) if (!kept.has(id)) this.soaked.delete(id)
  }

  /** A thing drops back to where the state has it: its place in the hollow, or its place on the forest floor. */
  private backToPlace(body: Body): void {
    if (body.mode === 'tumble') return
    const rest = this.house.find((r) => r.id === body.id)
    if (rest) this.fallTo(body, rest, true)
    else {
      body.cell = null
      body.rest = null
      body.form = 'loose'
      this.fallToward(body, body.home.x, body.home.y, body.home.angle)
      body.soft = true
    }
  }

  // --- Play ----------------------------------------------------------------

  /** Advances play by `seconds` of game time, in fixed steps. The first frame of a visit plays no time. */
  step(seconds: number): void {
    this.left += seconds
    while (this.left >= TICK) {
      this.left -= TICK
      this.tick()
    }
  }

  private tick(): void {
    const step = TICK
    this.seconds += step
    // A scene plays on this clock, so what it shows and what it sounds fall in one step.
    if (this.scene) {
      this.scene.update(this.seconds)
      if (!this.scene.running) this.scene = null
    }
    // Those who sleep breathe, each at its own pace.
    this.sleepClock += step
    for (const who of FOLK) if (this.abed[who]) this.tell(who, this.asleepAs(who))
    const hand = this.hand
    if (hand) {
      // The thing is carried just above the finger and swings a little behind it.
      const base = this.bodies[hand.id]
      const { x: tx, y: ty } = wanted(hand)
      const before = base.x
      base.x += (tx - base.x) * Math.min(1, step * 24)
      base.y += (ty - base.y) * Math.min(1, step * 24)
      if (hand.carrying) {
        const drift = (base.x - before) / step
        // It is carried as it lay, and swings a little behind the finger.
        base.angle += (hand.keep + clamp(-drift * 0.0007, -0.5, 0.5) - base.angle) * Math.min(1, step * 10)
      }
      // What rests on it keeps its place on it.
      for (const [id, { dx, dy }] of hand.offsets) {
        if (id === hand.id) continue
        this.bodies[id].x = base.x + dx
        this.bodies[id].y = base.y + dy
      }
      for (const who of FOLK) this.folk[who].watch(base.x, base.y - 30, 0.6)
    }
    for (const body of this.bodies) this.move(body, step)
    this.dropOn(step)
    // What one of the three takes up goes from where it lay onto its head or into its hand, and back again.
    for (const [id, held] of this.worn) {
      held.taken = clamp(held.taken + (held.back ? -step : step) / TAKE_SECONDS, 0, 1)
      if (!held.back || held.taken > 0) continue
      this.worn.delete(id)
      const rest = this.bodies[id].rest
      if (rest) this.lay(this.bodies[id], rest)
    }
    // A see-saw that waits to turn over turns when what tips it has landed on it.
    for (const body of this.bodies) {
      if (body.mode !== 'still' || body.rest?.lies !== 'tipped' || body.rock || body.swing !== -2) continue
      const id = body.id
      if (!this.bodies.some((other) => other.rest?.under[0] === id && other.mode !== 'still')) body.rock = { t: 0, phase: 0, knocks: 0, deep: 2 }
    }
    // A crosspiece or a tippy table levels under what comes to rest on it, and tips again when that is taken off.
    for (const body of this.bodies) {
      if (body.mode !== 'still' || !body.rest || !onOneTip(body.rest)) continue
      const want = this.angleOf(body.rest)
      body.angle = Math.abs(want - body.angle) < 0.002 ? want : body.angle + (want - body.angle) * Math.min(1, step * 14)
      if (body.to) body.to.angle = body.angle
    }
    for (const who of FOLK) {
      const says = this.folk[who].step(step)
      if (says) this.say(FOLK_VOICE[who][says], `folk ${who}`)
    }
    // The sun bobs when touched, and with no finger on it goes to where the hour has it: over the hill by day, on it at evening.
    pull(this.sun.bob, 90, 6, step)
    this.sun.turn *= 1 - Math.min(1, step * 1.5)
    if (!this.sunHand?.dragging) {
      const to = this.finished ? SUN_AT.setY : SUN_AT.y
      this.sun.speed += (-60 * (this.sun.y - to) - 13 * this.sun.speed) * step
      this.sun.y += this.sun.speed * step
    }
    if (this.spill && (this.spill.age += step) >= SPILL_SECONDS) this.spill = null
    // The snail creeps, the moth loops, the owl blinks: none of them has to do with the house.
    if (this.snail.hidden > 0) this.snail.hidden = Math.max(0, this.snail.hidden - step)
    else {
      this.snail.along += this.snail.dir * step * 0.035
      if (this.snail.along >= 1 || this.snail.along <= 0) {
        this.snail.along = clamp(this.snail.along, 0, 1)
        this.snail.dir = this.snail.dir === 1 ? -1 : 1
      }
    }
    this.moth.phase += step * (0.5 + 3 * this.moth.dart)
    this.moth.dart = Math.max(0, this.moth.dart - step * 1.2)
    this.owl.duck = Math.max(0, this.owl.duck - step * 0.7)
    if ((this.owl.blinkIn -= step) <= 0) {
      this.owl.blink = 0
      this.owl.blinkIn = 2.5 + 3 * this.rng.next()
    }
    if (this.owl.blink >= 0 && (this.owl.blink += step) > 0.18) this.owl.blink = -1
    for (const puff of this.puffs) puff.age += step
    this.puffs = this.puffs.filter((puff) => puff.age < PUFF_SECONDS)
  }

  private move(body: Body, step: number): void {
    pull(body.squash, body.squashStiffness, body.squashDamping, step)
    if (body.well < 1) body.well = Math.min(1, body.well + step / WELL_SECONDS)
    body.squash.at = clamp(body.squash.at, -0.5, 0.5)
    if (body.mode === 'fall' && body.to) {
      const weight = BODY[body.kind].weight
      body.air += step
      body.speed += 2600 * (0.3 + 0.7 * weight) * step
      // A feather and a leaf do not drop: they drift down, the feather from side to side.
      const terminal = body.kind === 'feather' ? 190 : body.kind === 'leaf' ? 620 : 2400
      if (body.speed > terminal) body.speed = terminal
      const sway = body.kind === 'feather' && body.speed > 0 ? Math.sin(body.air * 7) * 26 * clamp((body.to.y - body.y) / 80, 0, 1) : 0
      // A thing that will slide aside falls straight down first, to where it touches.
      const aim = body.via ?? body.to
      body.x += (aim.x + sway - body.x) * Math.min(1, step * 16)
      body.angle += (body.to.angle + body.airTurn - body.angle) * Math.min(1, step * 14)
      body.y += body.speed * step
      // On the end of a see-saw that has yet to turn, it lands where that end is now.
      const lands = body.via ? aim.y : aim.y + this.ride(body).dy
      if (body.y >= lands && body.speed > 0) {
        if (body.via) this.touchAside(body)
        else this.touchDown(body)
      }
    } else if (body.mode === 'slide' && body.to) {
      // It slides the shortest way to its free place, and lands there as what it is.
      const dx = body.to.x - body.x, dy = body.to.y - body.y, left = Math.hypot(dx, dy), by = SLIDE_PACE * step
      body.angle += (body.to.angle - body.angle) * Math.min(1, step * 14)
      if (left > by) {
        body.x += (dx / left) * by
        body.y += (dy / left) * by
      } else {
        body.x = body.to.x
        body.speed = 260
        body.mode = 'fall'
        this.touchDown(body)
      }
    } else if (body.mode === 'tumble') this.tumbleOn(body, step)
    else if (body.mode === 'sail' && body.to) {
      // A slab that sails goes along its ground at one pace and knocks on the wall it reaches.
      const left = body.to.x - body.x, by = body.speed * step
      if (Math.abs(left) > by) body.x += Math.sign(left) * by
      else {
        body.x = body.to.x
        body.mode = 'still'
        body.speed = 0
        if (body.rest?.on === 'ground') {
          body.hits += 1
          body.squash.speed += 2
          this.say(knock(body.kind, 'ground', 1), `knock ${body.id}`)
        }
      }
    } else if (body.mode === 'still' && !this.worn.has(body.id)) {
      // At rest a thing is exactly where the state has it.
      if (body.to) {
        body.x = body.to.x
        body.y = body.to.y
        body.angle = body.to.angle
      }
    }
    const rock = body.rock, cell = body.cell, lain = body.rest
    if (rock && cell?.rock && lain) {
      // The motion is made of turns, dies away over them and stops with the last: what is heard at a turn is heard for as long as the thing is seen to move.
      const r = cell.rock
      const total = Math.PI * (r.axis === 'tip' ? 0.5 : r.turns)
      rock.t += step
      const before = rock.phase
      rock.phase = Math.min(total, before + Math.PI * 2 * r.hz * (1 + (r.quicken * before) / total) * step)
      const left = 1 - rock.phase / total
      const wide = left ** ROCK_SHAPE
      // A see-saw starts level and comes down faster and faster; a flag starts level and falls to hang; the rest swing about where they lie.
      if (r.axis === 'tip') body.swing = -(rock.deep ?? 1) * (1 - (1 - left) ** 2)
      else if (r.axis === 'stream') body.swing = -(left ** 2.2) * Math.cos(rock.phase)
      else body.swing = r.amp * wide * Math.sin(rock.phase)
      // Each end of a swing is a turn, and a cell that knocks is heard at every one of them.
      const turnsBefore = Math.floor((before + Math.PI / 2) / Math.PI), turns = Math.floor((rock.phase + Math.PI / 2) / Math.PI)
      if (turns > turnsBefore && r.axis !== 'tip') {
        rock.knocks += 1
        if (r.heard) {
          body.hits += 1
          this.say(turnKnock(body.kind, lain.on, wide), `knock ${body.id}`)
          body.squash.speed += 0.8
        }
      }
      if (rock.phase >= total) {
        body.rock = null
        body.swing = 0
        if (r.axis === 'tip') {
          // The far end of the see-saw touches the ground: the donk, in this step.
          body.hits += 1
          this.say(turnKnock(body.kind, lain.on, 1), `knock ${body.id}`)
          body.squash.speed += 2.2
          this.puff(lain.x + lain.side * (lain.w / 2 - 6), lain.y, 'dust')
          // The tidy one sniffs at every puff of dust, and this is one.
          if (!this.finished) this.folk.tidy.notice('dust')
        } else if (r.stop) {
          // It drops flat, or stops rolling, with a sound of its own.
          const voice = STOP[body.kind]?.[lain.on]
          if (voice) {
            body.hits += 1
            this.say(voice, `knock ${body.id}`)
            body.squash.speed += 1.6
          }
        }
      }
    }
  }

  /**
   * The thing one of the three stands on leaves from under it: it drops off, straight down to the ground, and lands
   * there in its own way. No one is left standing on air, and no one rides a thing that slides away or goes home.
   */
  private dropOff(body: Body): void {
    for (const who of FOLK) {
      const at = this.where[who]
      if (at.on !== body.id) continue
      this.front.delete(body.id)
      const x = clamp(body.x + (at.off ?? 0), HOLLOW.left + 30, HOLLOW.right - 30), ground = groundY(x)
      const y = Math.min(ground, body.rest ? body.y - body.rest.h : at.y)
      this.where[who] = { x, y, on: null, scale: at.scale, dir: at.dir, inside: at.inside }
      // One that has already rolled or slid down to the ground has nothing left to drop.
      if ((this.told[who]?.fall ?? 0) >= 0.999 || y >= ground - 1) this.where[who].y = ground
      else this.drops[who] = { speed: DROP_OFF[who].start, hops: 0 }
    }
  }

  /** Those dropping off come down, each in its own way: the fat one with a thump and dust, the tidy one with a tick, the tiny one with a bounce and a pip. */
  private dropOn(step: number): void {
    for (const who of FOLK) {
      const drop = this.drops[who]
      if (!drop) continue
      const at = this.where[who], ground = groundY(clamp(at.x, HOLLOW.left + 1, HOLLOW.right - 1)), how = DROP_OFF[who]
      drop.speed += DROP_PULL * step
      at.y += drop.speed * step
      if (at.y < ground) continue
      at.y = ground
      this.seen.steps += 1
      this.say(STEP[who], `step ${who}`)
      this.folk[who].jolt(how.kick, how.part)
      if (how.dust) this.puff(at.x, ground, 'dust')
      if (drop.hops < how.hops) {
        drop.hops += 1
        drop.speed = -how.hop
      } else delete this.drops[who]
    }
  }

  /** A thing that cannot lie where it came down touches what is in its way there, with a small knock, and slides off it. */
  private touchAside(body: Body): void {
    this.dropOff(body)
    const via = body.via!
    body.via = null
    body.x = via.x
    body.y = via.y
    body.mode = 'slide'
    body.hits += 1
    body.squash.speed += 1.4
    this.say(softer(knock(body.kind, 'ground', 1), 0.6), `knock ${body.id}`)
  }

  /** A falling thing reaches what it was falling to. */
  private touchDown(body: Body): void {
    const to = body.to!
    const speed = body.speed
    body.y = to.y
    body.hits += 1
    body.squash.speed += clamp(speed / 260, 0.6, 4.2)
    const rest = body.rest
    if (body.shed) {
      // What it landed on carries nothing: it is shed in that thing's own way and goes home.
      const by = body.shed
      body.shed = null
      const under = by === 'arch' || by === 'out' ? null : this.house.find((r) => Math.abs(r.x - to.x) < 2 && Math.abs(topOf(r) - to.y) < 2)
      // Out of a bath it comes with a splash, and drops fly.
      const bath = under !== null && under !== undefined && under.cell.extra === 'water'
      this.say(bath ? EVENING.splash : SHED[by], `knock ${body.id}`)
      if (bath) this.puff(to.x, to.y, 'water')
      if (under) this.bodies[under.id].squash.speed += 3
      this.tumbleHome(body, by)
      this.noticeAll('tumble', body.x, body.y)
      // The fat one dislikes wet: at a splash it pulls back.
      if (bath && !this.finished) this.folk.fat.notice('wet')
      return
    }
    if (!rest) {
      // Back on the forest floor after a tap.
      this.say(softer(tumble(body.kind, 1), 0.8), `knock ${body.id}`)
      body.mode = 'still'
      body.speed = 0
      body.x = to.x
      body.angle = to.angle
      return
    }
    const first = body.hops === 0 && body.form !== rest.lies
    body.form = rest.lies
    body.cell = rest.cell
    body.angle = to.angle
    const hops = body.hops
    body.hops += 1
    // A leaf that found no room to lean lies flat on its stone, and sounds as a leaf laid flat: it makes no zip.
    // And a cell that rolls, spins or rocks lies still on a slope: it sounds its touch, and nothing of the motion.
    const landing = rest.kind === 'leaf' && rest.on === 'pebble' && rest.lies === 'flat' ? LAND.leaf.ground
      : rest.cell.rock && rest.tilt !== undefined ? touchOnly(body.kind, rest.on) : LAND[body.kind][rest.on]
    this.say(hops === 0 ? softer(landing, body.soft ? 0.6 : clamp(speed / 700, 0.6, 1)) : knock(body.kind, rest.on, hops), `knock ${body.id}`)
    if (body.bouncesLeft > 0) {
      // It hops: each time it comes down again is another knock.
      body.bouncesLeft -= 1
      body.speed = -clamp(speed * 0.45, 150, 420)
      return
    }
    body.mode = 'still'
    body.speed = 0
    body.x = to.x
    body.angle = to.angle
    // A cell rocks where the thing lies as the cell has it: a slab that found no room to tip lies level and still.
    // And where it lies level: on the slope of a see-saw's end nothing rocks or rolls.
    body.rock = rest.cell.rock && !body.soft && rest.lies === rest.cell.form && rest.tilt === undefined ? { t: 0, phase: 0, knocks: 0 } : null
    // In an acorn cap set down cup up on the ground the dew wells up, for as long as its gurgle is heard.
    if (rest.cell.extra === 'water' && (!body.soft || first)) body.well = 0
    if (rest.on === 'ground') this.puff(body.x, body.y, 'dust')
    // The chain: what it landed on gives, what lies near it hops, and the three answer in their own ways.
    for (const id of rest.under) this.bodies[id].squash.speed += 3.2
    for (const other of this.bodies) {
      if (other.id === body.id || !other.rest || rest.under.includes(other.id)) continue
      const near = 1 - Math.abs(other.x - body.x) / 190
      if (near > 0) other.squash.speed -= 2.4 * near * BODY[body.kind].weight
    }
    // By day the three answer what the child set down. At evening they are busy with the house themselves.
    if (this.finished) return
    if (!body.soft || first) this.answer(rest, body.x, body.y)
    else {
      this.noticeAll('land', body.x, body.y)
      // A thing dropping back where it was raises its dust too, and the tidy one sniffs at every puff.
      if (rest.on === 'ground') this.folk.tidy.notice('dust')
    }
  }

  /**
   * How each of the three takes a thing set down: by its own taste. The fat one likes a leaf, flinches at a hard
   * landing and pulls back from water. The tidy one likes a feather, anywhere alike, and a thing set down level,
   * and sniffs at every puff of dust: on the ground it sniffs, and at its own feather there it is pleased first
   * and sniffs after. The tiny one likes an acorn cap.
   */
  private answer(rest: Rested, x: number, y: number): void {
    const kind = rest.kind, on = rest.on
    const wet = rest.cell.extra === 'water'
    const dusty = on === 'ground'
    const level = !dusty && isLevel(rest)
    const act: Record<Who, Act> = {
      fat: kind === 'leaf' ? (on === 'moss' ? 'love' : 'like') : wet ? 'wet' : kind === 'pebble' || kind === 'bark' ? 'thud' : 'land',
      tidy: kind === 'feather' ? 'like' : dusty ? 'dust' : level ? 'level' : 'land',
      tiny: kind === 'cap' ? (on === 'ground' ? 'love' : 'like') : kind === 'pebble' || kind === 'bark' ? 'thud' : 'land',
    }
    for (const who of FOLK) {
      this.folk[who].watch(x, y - 20, 2.5)
      this.folk[who].notice(act[who], who === 'tidy' && kind === 'feather' && dusty ? 'dust' : null)
    }
  }

  private noticeAll(act: Act, x: number, y: number): void {
    for (const who of FOLK) {
      this.folk[who].watch(x, y, 2)
      this.folk[who].notice(act)
    }
  }

  /** Adds a thing that has come to rest to the house. A see-saw it tips is turned over, and waits for it to land. */
  private join(result: Rested): Rested {
    const before = this.house
    this.house = joined(before, result)
    for (const rest of this.house) {
      const was = before.find((r) => r.id === rest.id)
      if (was && !sameRest(was, rest)) this.layAgain(this.bodies[rest.id], rest, false, true)
    }
    return this.house.find((rest) => rest.id === result.id)!
  }

  /**
   * A thing of the house that lies otherwise than it did. A see-saw that tips to its other end turns over about its
   * stone, at once or when what tips it lands; what lies on one keeps its place on it; anything else goes there in sight.
   */
  private layAgain(body: Body, rest: Rested, soft: boolean, waits = false): void {
    const was = body.rest
    if (was?.lies === 'tipped' && rest.lies === 'tipped' && was.under[0] === rest.under[0] && body.mode === 'still') {
      body.rest = rest
      body.side = rest.side
      body.to = { ...restPoint(rest), angle: restAngle(rest) }
      body.x = body.to.x
      body.y = body.to.y
      // It is shown as it lay, on its other end, until it turns.
      body.swing = -2
      body.rock = waits ? null : { t: 0, phase: 0, knocks: 0, deep: 2 }
      return
    }
    if (was && was.along !== undefined && rest.along === was.along && was.under[0] === rest.under[0] && body.mode === 'still') {
      // It lies on the same end of the same see-saw, which goes up or down under it.
      body.rest = rest
      body.to = { ...restPoint(rest), angle: restAngle(rest) }
      body.x = body.to.x
      body.y = body.to.y
      return
    }
    this.fallTo(body, rest, soft)
  }

  /** The slope of a see-saw as it is shown now, in radians: positive runs down to the right. */
  private slopeNow(slab: Body): number {
    const rest = slab.rest
    return rest?.lies === 'tipped' ? rest.side * (rest.lean ?? 0) * (1 + slab.swing) : 0
  }

  /**
   * How far from where it will lie a thing on a see-saw is carried now, while the slab is still turning under it:
   * it turns with the slab about the top of the stone. What lies on such a thing, or hangs from it, goes with it.
   */
  private ride(body: Body): { dx: number; dy: number; turn: number } {
    const own = body.rest
    let rest = own, tilt: number | null = null
    for (let depth = 0; own && rest && depth < 8; depth++) {
      const under = rest.under.length > 0 ? this.bodies[rest.under[0]] : null
      if (!under?.rest) break
      // The slope it lies on, or, for what hangs plumb from a thing on the slab, that thing's.
      if (tilt === null && rest.tilt !== undefined) tilt = rest.tilt
      if (under.rest.lies === 'tipped') {
        if (tilt === null) break
        const slab = under.rest, lean = slab.lean ?? 0, turn = this.slopeNow(under) - tilt
        const px = slab.x - slab.side * SEESAW_SHIFT * Math.cos(lean), py = slab.y - (slab.cell.w / 2 + SEESAW_SHIFT) * Math.sin(lean)
        const x = own.x - px, y = own.y - py
        return { dx: x * Math.cos(turn) - y * Math.sin(turn) - x, dy: x * Math.sin(turn) + y * Math.cos(turn) - y, turn }
      }
      rest = under.rest
    }
    return { dx: 0, dy: 0, turn: 0 }
  }

  /** Sets a thing falling to where it rests. `soft` is a thing dropping back where nothing changed. `via` is where it first touches when it has to slide aside. */
  private fallTo(body: Body, rest: Rested, soft: boolean, via: { x: number; y: number } | null = null): void {
    const same = body.cell === rest.cell && body.form === rest.lies
    const at = restPoint(rest)
    this.fallToward(body, at.x, at.y, restAngle(rest), via)
    body.rest = rest
    body.side = rest.side
    body.bouncesLeft = soft ? 0 : rest.cell.bounces
    body.hops = 0
    body.soft = soft
    // While it falls it is still loose, unless it is dropping back as it lay.
    if (!soft || !same) {
      body.form = 'loose'
      body.cell = null
      // A twig that will lie comes down lying, so that it does not turn as it lands.
      body.airTurn = body.kind === 'twig' && rest.lies !== 'upright' ? Math.PI / 2 : 0
    }
  }

  private fallToward(body: Body, x: number, y: number, angle: number, via: { x: number; y: number } | null = null): void {
    body.mode = 'fall'
    body.to = { x, y, angle }
    body.via = via && Math.hypot(via.x - x, via.y - y) > 2 ? { x: via.x, y: Math.min(via.y, y) } : null
    body.speed = 0
    body.air = 0
    body.rock = null
    body.swing = 0
    body.shed = null
    body.soft = false
    body.airTurn = 0
    if (body.via) {
      // It comes straight down to where it touches, and slides from there.
      if (body.y > body.via.y) body.y = body.via.y
      return
    }
    // A thing that is already below where it is going is set there and lands at once.
    if (body.y > y) body.y = y
    // One that has to go sideways with no height to fall from hops over: it is seen to go, and never jumps there.
    if (Math.abs(body.x - x) > 2 && body.y > y - 24) body.speed = -HOP_OVER
  }

  /** A thing that can no longer rest where it lay goes home from where it is. */
  private shedHome(body: Body, by: Shed['shedBy']): void {
    this.say(SHED[by], `shed ${body.id}`)
    this.tumbleHome(body, by)
  }

  /**
   * Back to its own place on the forest floor. How it leaves says what shed it: a leaf flips it off, high and
   * turning right over; an acorn cap bounces it straight up, and it comes down on the cap once more with a clonk
   * before it goes; a feather lets it slide off sideways, low, down to the ground beside it, and from there it
   * is home in one more bounce. Off a leaf or a cap, from a pile that was too high and from a place outside the
   * hollow, it tumbles home in two bounces.
   */
  private tumbleHome(body: Body, by: Shed['shedBy'] | 'out' = 'out'): void {
    this.dropOff(body)
    // A thing one of the three wears or holds leaves from where it is drawn: round it, on its head or in its hand.
    const wornBy = this.worn.get(body.id)
    if (wornBy) {
      const lying = this.wornLying(body, wornBy)
      body.x = lying.x
      body.y = lying.y
      body.angle = lying.angle
    }
    const home = body.home
    const dir = home.x >= body.x ? 1 : -1
    body.mode = 'tumble'
    body.cell = null
    body.rest = null
    // Back on the forest floor it is whole and dry.
    body.snapped = false
    body.wet = false
    this.worn.delete(body.id)
    this.front.delete(body.id)
    body.form = 'loose'
    body.rock = null
    body.swing = 0
    body.to = { x: home.x, y: home.y, angle: home.angle }
    const arcs: Arc[] = []
    let x = body.x, y = body.y
    const leap = (toX: number, toY: number, lift: number, lasts: number, turn: number, on: Arc['on'] = 'earth'): void => {
      arcs.push({ fromX: x, fromY: y, toX, toY, lift, lasts, turn, on })
      x = toX
      y = toY
    }
    const midX = lerp(body.x, home.x, 0.6), midY = home.y - 6
    if (by === 'leaf') {
      // Flipped off: thrown up high, turning right over once and a half.
      // However far below its home lies, it rises by the same height above the leaf before it comes down.
      const drop = Math.max(0, midY - y), rise = SHED_MOTION.leaf.rise
      leap(midX, midY, (drop + 2 * rise + 2 * Math.sqrt(rise * rise + rise * drop)) / 4, SHED_MOTION.leaf.lasts, dir * Math.PI * 3)
      leap(home.x, home.y, 30, 0.24, 0)
    } else if (by === 'cap') {
      // Bounced off: straight up with no turn, down on the cap again, and then away.
      leap(x + dir * SHED_MOTION.cap.aside, y, SHED_MOTION.cap.lift, SHED_MOTION.cap.lasts, 0, 'cap')
      leap(midX, midY, 70, 0.4, dir * Math.PI)
      leap(home.x, home.y, 30, 0.24, dir * Math.PI)
    } else if (by === 'feather') {
      // Slid off: sideways and down to the ground beside the feather, with no leap at all, leaning as it goes.
      const besideX = clamp(x + dir * SHED_MOTION.feather.aside, HOLLOW.left + 20, HOLLOW.right - 20)
      leap(besideX, Math.max(y, groundY(besideX)), 0, SHED_MOTION.feather.lasts, dir * 0.5)
      // The ground beside the feather is its first bounce; the second is home.
      leap(home.x, home.y, 80, 0.46, dir * Math.PI)
    } else {
      leap(midX, midY, 70, 0.4, dir * Math.PI * 1.25)
      leap(home.x, home.y, 30, 0.24, dir * Math.PI * 0.75)
    }
    // Its last leap turns it by as much as brings it home lying as it lies there, so it does not snap round as it lands.
    const turned = body.angle + arcs.reduce((sum, arc) => sum + arc.turn, 0)
    const lies = home.angle + Math.PI * 2 * Math.round((turned - home.angle) / (Math.PI * 2))
    arcs[arcs.length - 1].turn += lies - turned
    body.arcs = arcs
    body.arcAt = 0
    body.spinFrom = body.angle
  }

  private tumbleOn(body: Body, step: number): void {
    const arc = body.arcs[0]
    if (!arc) return
    body.arcAt += step
    const p = Math.min(1, body.arcAt / arc.lasts)
    body.x = lerp(arc.fromX, arc.toX, p)
    body.y = lerp(arc.fromY, arc.toY, p) - arc.lift * 4 * p * (1 - p)
    body.angle = body.spinFrom + arc.turn * p
    if (p < 1) return
    // It comes down: on the cap that bounced it, or on the earth, and the last time is home.
    body.arcs.shift()
    body.arcAt = 0
    body.spinFrom = body.angle
    body.hits += 1
    body.squash.speed += 2.4
    if (arc.on === 'cap') {
      this.say(softer(SHED.cap, 0.7), `knock ${body.id}`)
      const cap = this.house.find((r) => r.kind === 'cap' && Math.abs(r.x - arc.fromX) < 4 && Math.abs(topOf(r) - arc.fromY) < 4)
      if (cap) this.bodies[cap.id].squash.speed += 2.4
    } else {
      this.say(tumble(body.kind, body.arcs.length === 0 ? 1 : 0), `knock ${body.id}`)
      this.puff(body.x, body.y, 'dust')
      // It has tutted at the tumble; at the dust of each bounce on the earth it sniffs.
      if (!this.finished) this.folk.tidy.notice('dust')
    }
    if (body.arcs.length === 0) {
      body.mode = 'still'
      body.x = body.home.x
      body.y = body.home.y
      body.angle = body.home.angle
    }
  }

  /** How a thing is turned where it rests, as the house is shown: a crosspiece or a tippy table that carries something lies level under it. */
  private angleOf(rest: Rested): number {
    const tipped = restAngle(rest)
    if (tipped === 0 || !onOneTip(rest)) return tipped
    return this.bodies.some((body) => body.rest !== null && body.rest.under.includes(rest.id)) ? 0 : tipped
  }

  /** Lays a thing where it rests, with no motion: how a saved house is found. */
  private lay(body: Body, rest: Rested): void {
    const at = restPoint(rest)
    body.mode = 'still'
    body.x = at.x
    body.y = at.y
    body.angle = restAngle(rest)
    body.to = { x: body.x, y: body.y, angle: body.angle }
    body.cell = rest.cell
    body.rest = rest
    body.form = rest.lies
    body.side = rest.side
    this.quiet(body)
  }

  /** Lays a thing at its own place on the forest floor, with no motion. */
  private layHome(body: Body): void {
    body.mode = 'still'
    body.x = body.home.x
    body.y = body.home.y
    body.angle = body.home.angle
    body.to = null
    body.cell = null
    body.rest = null
    body.form = 'loose'
    body.side = 1
    this.quiet(body)
  }

  /** Nothing of a thing is left swinging, falling or pending. */
  private quiet(body: Body): void {
    body.speed = 0
    body.squash.at = 0
    body.squash.speed = 0
    body.rock = null
    body.swing = 0
    body.bouncesLeft = 0
    body.hops = 0
    body.airTurn = 0
    body.via = null
    body.shed = null
    body.soft = false
    body.arcs = []
    body.arcAt = 0
    body.air = 0
    body.well = 1
  }

  private puff(x: number, y: number, kind: Puff['kind']): void {
    this.puffs.push({ x, y, age: 0, seed: Math.floor(this.rng.next() * 1000), kind })
    if (this.puffs.length > 6) this.puffs.shift()
  }

  private say(voice: Voice, from: string): void {
    this.sounds.push({ voice, from, scene: this.playing })
  }

  /** How far the twig under a balanced pebble bows now, in radians: toward the side the pebble was set down on, and nodding while it rocks. */
  private bowOf(twig: Body): number {
    if (twig.mode !== 'still' || twig.rest?.lies !== 'upright') return 0
    const knocker = this.bodies.find((body) => body.mode === 'still' && body.rest?.cell.is === 'knocker' && body.rest.under[0] === twig.id)
    return knocker ? (((BOW + knocker.swing) * Math.PI) / 180) * knocker.side : 0
  }

  /** How much free room there is under the tip a flag is tied to, on the side it hangs. */
  private roomUnder(flag: Rested): number {
    const from = flag.x + flag.side * 4, to = flag.x + flag.side * 34
    const low = Math.min(from, to), high = Math.max(from, to)
    let floor = groundY(clamp(flag.x + flag.side * 24, HOLLOW.left + 1, HOLLOW.right - 1))
    for (const body of this.bodies) {
      const r = body.rest
      if (!r || body.mode !== 'still' || r.id === flag.id || flag.under.includes(r.id)) continue
      if (r.x + r.w / 2 > low && r.x - r.w / 2 < high && topOf(r) >= flag.y - 4) floor = Math.min(floor, topOf(r))
    }
    return floor - flag.y
  }

  /** How a thing lies now, as the view draws it and a finger finds it. */
  private lying(body: Body): Lying {
    const s = body.squash.at
    const rest = body.form === 'loose' ? null : body.rest
    const axis = body.cell?.rock?.axis
    const swing = (body.swing * Math.PI) / 180
    let x = body.x, y = body.y, angle = body.angle, hang = 0, sx = 1 + s * 0.5, sy = 1 - s
    if (rest?.lies === 'tipped') {
      // A see-saw turns about the top of its stone: level as it lands, down to its far end as it tips. One that
      // turns over starts on its other end, comes up to level as it slips across the stone, and tips on down.
      const now = (rest.lean ?? 0) * (1 + (axis === 'tip' ? body.swing : 0))
      const out = SEESAW_SHIFT * (body.swing < -1 ? 1 + 2 * (body.swing + 1) : 1)
      const pivot = x - rest.side * SEESAW_SHIFT
      x = pivot + rest.side * out * Math.cos(now)
      y += out * Math.sin(now)
      angle += rest.side * now
    } else if (rest?.lies === 'flag') {
      // A flag hangs from the tip, bunched up where there is little room under it, and flies out level at its full length while it streams.
      const down = 1 + (axis === 'stream' ? body.swing : 0)
      hang = FLAG_HANG * down
      sx *= 1 - (1 - flagPress(this.roomUnder(rest))) * clamp(down, 0, 1)
    } else if (rest?.cell.is === 'knocker' && this.bodies[rest.under[0]].rest?.lies === 'upright') {
      // A pebble balanced on the tip of a twig goes where the tip goes as the twig bows and nods.
      const twig = this.bodies[rest.under[0]], bow = this.bowOf(twig), tall = twig.rest?.h ?? 0
      x += tall * Math.sin(bow)
      y += tall * (1 - Math.cos(bow))
      angle += bow
    } else if (axis === 'roll') {
      x += body.swing * body.side
      angle += (body.swing / 20) * body.side
    } else if (axis === 'tilt') angle += swing * body.side
    else if (axis === 'swing') hang = swing
    else if (axis === 'spin' && body.rock) {
      // A bowl spinning down like a coin stands on one edge of its rim after the other, and its marks go round.
      const half = (rest?.w ?? 0) / 2
      angle += swing
      y -= half * Math.abs(Math.sin(swing))
      x += Math.sign(swing) * half * (1 - Math.cos(swing))
      if (Math.floor(body.rock.phase / Math.PI) % 2 === 1) sx = -sx
    }
    if (body.kind === 'twig') angle += this.bowOf(body)
    // What lies on the end of a see-saw lies on its slope, and goes with it while it turns.
    if (rest && body.mode === 'still') {
      const ride = this.ride(body)
      x += ride.dx
      y += ride.dy
      // What hangs from a tip goes with the tip and hangs plumb.
      if (rest.tilt !== undefined) angle += ride.turn + rest.tilt
    }
    // Moss bulges out to both sides under a bed or a hard pillow that has sunk into it.
    if (body.kind === 'moss' && rest && this.bodies.some((other) => other.mode === 'still' && other.rest !== null && other.rest.under.includes(body.id) && BULGES.has(other.rest.cell.is))) {
      sx *= BULGE.wide
      sy *= BULGE.low
    }
    return { kind: body.kind, form: body.form, x, y, angle, side: body.side, swing: hang, sx, sy, snapped: body.snapped }
  }

  /** The thing a finger at this point takes: one that lies still, the nearest, and of two that overlap the one that came to rest later. A thing is touched where it is drawn. */
  private thingAt(x: number, y: number): Body | null {
    let best: Body | null = null, bestScore = Infinity
    const order = new Map(this.house.map((r, index) => [r.id, index]))
    for (const body of this.bodies) {
      if (body.mode !== 'still' || this.worn.has(body.id)) continue
      // What lies in the hollow is seen through its opening: the part of it behind the trunk is not there to touch, and the bark answers.
      if (body.rest && !inOpening(x, y)) continue
      const box = touchBox({ ...this.lying(body), sx: 1, sy: 1 })
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2
      if (Math.abs(x - cx) > box.w / 2 || Math.abs(y - cy) > box.h / 2) continue
      const score = Math.hypot(x - cx, y - cy) - (order.get(body.id) ?? 0) * 0.01
      if (score < bestScore) {
        best = body
        bestScore = score
      }
    }
    return best
  }

  /** Which of the three a point of the stage lies on, where each stands now. */
  /** Where the carried thing would lie, kept while the finger and the house stand still. */
  private shadowAt: { house: readonly Rested[]; id: number; x: number; y: number; result: ReturnType<typeof settle> } | null = null

  private folkAt(x: number, y: number): Who | null {
    // The point as the one standing there has it: its own feet at the origin, upright, at its own size.
    const seenBy = (who: Who): { lx: number; ly: number; grace: number } => {
      const at = this.standOf(who), px = x - at.x, py = y - at.y
      return { lx: (px * Math.cos(at.turn) + py * Math.sin(at.turn)) / at.scale, ly: (-px * Math.sin(at.turn) + py * Math.cos(at.turn)) / at.scale, grace: 8 / at.scale }
    }
    // What one of them holds or wears is drawn over the bodies, and is touched first: the dustpan, the hat, the brush.
    for (const who of ['tidy', 'tiny', 'fat'] as const) {
      const { lx, ly } = seenBy(who)
      for (const { at, ink } of Object.values(HELD[who]) as { at: { x: number; y: number }; ink: { x: number; y: number; w: number; h: number } }[]) {
        if (lx >= at.x + ink.x && lx <= at.x + ink.x + ink.w && ly >= at.y + ink.y && ly <= at.y + ink.y + ink.h) return who
      }
    }
    for (const who of ['tiny', 'tidy', 'fat'] as const) {
      const { reach } = PERSONALITY[who], { lx, ly, grace } = seenBy(who)
      // A head and a hat are narrower than the coat under them: beside them the wood behind answers.
      const head = reach.head && ly < -reach.head.above ? reach.head : null
      if (lx >= -(head?.left ?? reach.halfWidth) - grace && lx <= (head?.right ?? reach.halfWidth) + grace && ly <= grace && ly >= -reach.height - grace) return who
    }
    return null
  }

  private snailAt(): { x: number; y: number } {
    return { x: lerp(SNAIL_PATH.fromX, SNAIL_PATH.toX, this.snail.along), y: lerp(SNAIL_PATH.fromY, SNAIL_PATH.toY, this.snail.along) }
  }

  private mothAt(): { x: number; y: number } {
    const p = this.moth.phase
    return { x: MOTH_LOOP.x + Math.sin(p) * MOTH_LOOP.rx, y: MOTH_LOOP.y + Math.sin(p * 2 + 0.6) * MOTH_LOOP.ry }
  }

  // --- Where the three are ---------------------------------------------------

  private tell(who: Who, to: Direction | null): void {
    this.told[who] = to
    this.folk[who].direct(to)
  }

  /** How a sleeper lies now. The tiny one sleeps on top of the fat one when both are in the heap. */
  private asleepAs(who: Who): Direction {
    const inBed = this.abed[who] === 'bed'
    const lies = sleeping(who, inBed, this.sleepClock)
    // With the fat one in a bed there is no belly to lie on or lean against: the other two sit down side by side and nod.
    // The fat one dislikes wet: in a bed a bath has soaked it sleeps with its brows drawn down and a pout.
    const bed = this.where[who].on
    if (who === 'fat' && inBed && bed !== null && this.bodies[bed].wet) return { ...lies, mouth: 'pout', open: 0.1, brow: -0.8, part: 0.3 }
    if (inBed || who === 'fat' || this.fatInHeap) return lies
    // The tidy one nods toward the tiny one beside it, over the two of them, and never out over what stands at its other side.
    return who === 'tiny' ? { ...lies, dy: 0, dx: 0, lean: 8 } : { ...lies, dx: 0, lean: TIDY_ASLEEP.lean * this.nod() }
  }

  /** How far the tidy one nods where it sits: as far as the floor it sits on is free. Worked out once for a house. */
  private nodOf: { house: readonly Rested[]; share: number } | null = null
  private nod(): number {
    if (this.nodOf?.house !== this.house) this.nodOf = { house: this.house, share: pairPlace(this.house).nod }
    return this.nodOf.share
  }

  /**
   * Whether the fat one sleeps on the floor this evening, so that the heap is built on it. It is read from the saved
   * state when an evening is found or begins, and holds through the morning, while the three are still waking where they lay.
   */
  private fatInHeap = false
  private readHeap(): void {
    if (this.asleep.length > 0) this.fatInHeap = this.asleep.some((entry) => entry.who === 'fat' && entry.on === null)
  }

  /** Where one of the three stands now: where it is, moved and turned as it is told. Lying down, it lies on the ground and not in it. */
  private standOf(who: Who): Stand {
    const at = this.where[who], to = this.told[who]
    let x = at.x, y = at.y
    const under = at.on === null ? null : this.bodies[at.on]
    if (under?.rest) {
      x = under.x + (at.off ?? 0)
      y = under.rest.lies === 'tipped' ? under.rest.y - under.rest.h : under.y - under.rest.h
    }
    if (!to) return { x, y, turn: 0, scale: at.scale }
    const nx = x + to.dx * at.scale * at.dir
    const ground = groundY(clamp(nx, HOLLOW.left + 1, HOLLOW.right - 1))
    const turn = to.turn * at.dir
    return { x: nx, y: y + to.dy * at.scale + to.fall * (ground - y) - Math.abs(Math.sin(turn)) * HALF[who] * at.scale, turn, scale: at.scale }
  }

  /** The things in the hollow as they are shown to rest. */
  private shownHouse(): Rested[] {
    return this.bodies.flatMap((body) => (body.rest ? [body.rest] : []))
  }

  /** Puts a sleeper where the state has it: on the thing it ended on, or in the heap on the floor. */
  private bedDown(who: Who, entry: Asleep | undefined): void {
    const on = entry && entry.on !== null ? this.house.find((r) => r.id === entry.on) : undefined
    if (on) {
      this.where[who] = { x: on.x, y: topOf(on), on: on.id, scale: INSIDE, dir: 1, inside: true }
      this.abed[who] = 'bed'
      this.front.add(on.id)
    } else {
      this.where[who] = this.heapSpot(who, entry?.x ?? heapPlace(this.house, this.fatInHeap))
      this.abed[who] = 'heap'
    }
    this.tell(who, this.asleepAs(who))
  }

  /**
   * What lies over a bed or a cradle where one of the three sleeps in it: a roof that came down on its stumps beside
   * the bed and reaches over it, a table whose edge hangs over it, and whatever lies on those. It is drawn in front
   * of the sleeper, who lies under it, as the bed is.
   */
  private overSleepers(): Set<number> {
    const over = new Set<number>()
    for (const who of FOLK) {
      const on = this.abed[who] === 'bed' ? this.where[who].on : null
      const bed = on === null ? undefined : this.house.find((r) => r.id === on)
      if (!bed) continue
      const half = PERSONALITY[who].reach.halfWidth * INSIDE
      for (const r of this.house) {
        if (r.id === bed.id || bed.under.includes(r.id)) continue
        const above = r.y <= topOf(bed) + 2 && r.x + r.w / 2 > bed.x - half && r.x - r.w / 2 < bed.x + half
        if (above || r.under.some((id) => over.has(id))) over.add(r.id)
      }
    }
    return over
  }

  private heapSpot(who: Who, middle: number): Base {
    const x = clamp(middle + (this.fatInHeap ? HEAP[who] : PAIR[who]), HOLLOW.stepRight + 24, HOLLOW.right - (this.fatInHeap ? 44 : TIDY_ASLEEP.half))
    return { x, y: groundY(x), on: null, scale: INSIDE, dir: 1, inside: true }
  }

  /**
   * Everything at rest, exactly as the saved state has it: how the game is found when it is opened, how it is
   * left when it is put away, and where a scene lands when a touch ends it. Nothing is in a hand, in the air,
   * swinging, pending or half shown.
   */
  private asLoaded(): void {
    this.hand = null
    this.sunHand = null
    this.scene = null
    this.worn.clear()
    this.front.clear()
    this.drops = {}
    this.going = { fat: false, tidy: false, tiny: false }
    this.spill = null
    this.puffs = []
    this.left = 0
    this.sleepClock = 0
    this.readHeap()
    for (const body of this.bodies) {
      const rest = this.house.find((r) => r.id === body.id)
      body.snapped = rest !== undefined && this.snapped.has(body.id)
      body.wet = rest !== undefined && this.soaked.has(body.id)
      if (rest) this.lay(body, rest)
      else this.layHome(body)
    }
    for (const body of this.bodies) {
      if (!body.rest) continue
      body.angle = this.angleOf(body.rest)
      if (body.to) body.to.angle = body.angle
    }
    this.sun.y = this.finished ? SUN_AT.setY : SUN_AT.y
    this.sun.speed = 0
    this.sun.bob.at = 0
    this.sun.bob.speed = 0
    this.sun.turn = 0
    this.snail.hidden = 0
    this.moth.dart = 0
    this.owl.duck = 0
    this.owl.blink = -1
    for (const who of FOLK) {
      if (this.finished) this.bedDown(who, this.asleep.find((entry) => entry.who === who))
      else {
        this.where[who] = homeOf(who)
        this.abed[who] = null
        this.tell(who, null)
      }
      this.folk[who].settle()
    }
  }

  // --- The evening and the morning ----------------------------------------------

  /** A touch ends the scene that is playing: every beat lands where it was going, and the scene's sounds stop. */
  private endScene(): void {
    if (!this.scene || !this.scene.running) return
    this.scene.finish()
    this.scene = null
    for (let i = this.sounds.length - 1; i >= 0; i--) if (this.sounds[i].scene) this.sounds.splice(i, 1)
    this.sceneCut = true
  }

  /** The sun was let go below the hill. The whole evening is worked out from the house and saved now; the scene then shows it. */
  private startEvening(): void {
    const plan = planEvening(laidOf(this.house), [...this.snapped], [...this.soaked])
    const scene = new Scene(this.eveningBeats(plan))
    scene.start(this.seconds, () => {
      this.finished = true
      this.snapped = new Set(plan.snapped)
      this.soaked = new Set(plan.soaked)
      this.house = build(plan.things, this.snapped)
      this.asleep = plan.asleep
      this.readHeap()
      this.dirty = 'now'
    })
    this.scene = scene
    // The chime is the first sound of the scene: it goes where the scene's sounds go, and a touch that ends the scene cuts it.
    this.say(SUNSET, 'sun')
    for (const who of FOLK) this.folk[who].watch(sunX(SUN_AT.setY), SUN_AT.setY, 1.2)
  }

  /** The sun was let go above the hill. The day is saved now; the scene shows the three waking and going back. */
  private startMorning(): void {
    const was = this.asleep
    const scene = new Scene(this.morningBeats(was))
    scene.start(this.seconds, () => {
      this.finished = false
      this.asleep = []
      this.dirty = 'now'
    })
    this.scene = scene
    this.say(SUNRISE, 'sun')
  }

  /** The last beat of a scene. Watched to its end the scene has arrived by itself; ended by a touch, everything is laid as the state has it. */
  private landing(at: number): Beat {
    return { at, lasts: 0.3, play: (_, finishing) => { if (finishing) this.asLoaded() } }
  }

  private eveningBeats(plan: Plan): Beat[] {
    // The light turns to dusk first: the sun sinks onto the hill by itself and the fireflies come out with it.
    const beats: Beat[] = []
    let t = 1
    for (const part of plan.parts) {
      const gait = GAIT[part.who]
      beats.push(this.travel(part.who, t, () => this.placeFor(part)))
      t += gait.lasts
      beats.push(this.act(part, t))
      t += EVENING_ACTS[part.act].lasts
    }
    // Those with no bed go to the floor together and lie down in a heap.
    const loose = plan.asleep.filter((entry) => entry.on === null)
    if (loose.length > 0) {
      for (const entry of loose) beats.push(this.travel(entry.who, t, () => this.heapSpot(entry.who, entry.x), HEAP_WALK))
      t += HEAP_WALK
      let from: Partial<Record<Who, Direction>> | null = null
      beats.push({
        at: t, lasts: 0.7, play: (p, finishing) => {
          if (finishing) return
          if (!from) {
            from = {}
            for (const entry of loose) from[entry.who] = this.told[entry.who] ?? AT_REST
            this.say(EVENING.heap, 'act heap')
            this.seen.cues += 1
            this.puff(loose[0].x, groundY(loose[0].x), 'dust')
          }
          for (const entry of loose) {
            // Lying down: from how it stood to how it sleeps.
            this.abed[entry.who] = 'heap'
            const lies = this.asleepAs(entry.who)
            this.abed[entry.who] = p >= 1 ? 'heap' : null
            this.tell(entry.who, mix(from[entry.who]!, lies, smooth(p)))
          }
        },
      })
      t += 0.7
    }
    beats.push(this.landing(t))
    return beats
  }

  private morningBeats(was: readonly Asleep[]): Beat[] {
    // The light comes up first; then the three wake one after the other, stretch each in its own way, and go back.
    const beats: Beat[] = []
    const wakes: Record<Who, number> = { fat: 0.8, tiny: 1.2, tidy: 1.5 }
    let t = 0.8 + STRETCH.fat.lasts
    for (const who of ['fat', 'tiny', 'tidy'] as const) {
      const stretch = STRETCH[who]
      let from: Direction | null = null
      beats.push({
        at: wakes[who], lasts: stretch.lasts, play: (p, finishing) => {
          if (finishing) return
          if (!from) {
            from = this.told[who] ?? AT_REST
            this.abed[who] = null
            this.say(stretch.voice, `act wake ${who}`)
            this.seen.cues += 1
            // What it wakes on gives under it, and rocks again if it is a thing that rocks.
            const on = was.find((entry) => entry.who === who)?.on ?? null
            const bed = on === null ? null : this.bodies[on]
            if (bed) {
              bed.squash.speed += 3
              if (bed.cell?.rock && bed.mode === 'still') bed.rock = { t: 0, phase: 0, knocks: 0 }
            }
          }
          const awake: Direction = { ...AT_REST, ...stretch.pose(p) }
          this.tell(who, mix(from, awake, smooth(clamp(p / 0.35, 0, 1))))
        },
      })
      beats.push(this.travel(who, t, () => homeOf(who)))
      t += GAIT[who].lasts
    }
    beats.push(this.landing(t))
    return beats
  }

  /** One of the three goes from where it stands to a place, in its own steps. Each foot that comes down is heard. */
  private travel(who: Who, at: number, to: () => Base, lasts = GAIT[who].lasts): Beat {
    const gait = GAIT[who]
    let from: Stand | null = null, target: Base | null = null, goal: Stand | null = null, stepped = 0
    return {
      at, lasts, play: (p, finishing) => {
        if (finishing) return
        if (!from || !target || !goal) {
          from = this.standOf(who)
          delete this.drops[who]
          this.going[who] = true
          const was = this.where[who].on
          if (was !== null) this.front.delete(was)
          target = to()
          // Where it will stand on arriving, taken with nothing told.
          this.where[who] = target
          this.tell(who, AT_REST)
          goal = this.standOf(who)
        }
        const e = smooth(p)
        const scale = lerp(from.scale, goal.scale, e)
        this.where[who] = {
          x: lerp(from.x, goal.x, e), y: lerp(from.y, goal.y, e) - gait.lift * scale * Math.abs(Math.sin(Math.PI * gait.steps * p)),
          on: null, scale, dir: target.dir, inside: true,
        }
        const downs = Math.min(gait.steps, Math.floor(p * gait.steps + 1e-9))
        while (stepped < downs) {
          stepped += 1
          this.seen.steps += 1
          this.say(STEP[who], `step ${who}`)
          this.folk[who].jolt(-0.4, 0.5)
        }
        if (p >= 1) {
          this.where[who] = target
          this.going[who] = false
          if (!target.inside) this.tell(who, null)
        }
      },
    }
  }

  /** Where one of the three stands for a part of its evening: on its thing, on the ground beside it, under it, or with no thing on the free floor. */
  private placeFor(part: Part): Base {
    const who = part.who, act = EVENING_ACTS[part.act]
    const rest = part.thing === null ? null : this.bodies[part.thing].rest
    if (part.act === 'noFeather') {
      // With no feather it sweeps the widest free stretch of the floor with its hat: it steps to one end of it and sweeps toward the other.
      const stretch = widestFree(this.shownHouse()), half = HALF[who] * INSIDE
      const x = clamp(stretch.to - half - 12, Math.min(stretch.from + half + 12, HOLLOW.right - 44), HOLLOW.right - 44)
      return { x, y: groundY(x), on: null, scale: INSIDE, dir: -1, inside: true }
    }
    if (!rest) return this.heapSpot(who, heapPlace(this.shownHouse(), false))
    const roomRight = rest.x < (HOLLOW.left + HOLLOW.right) / 2
    if (part.act === 'sail') {
      // It stands on the slab the sail stands on, beside the sail, on the side of the slab with more room, and faces the sail.
      const slab = this.bodies[rest.under[0]].rest
      if (slab) {
        const off = rest.x - slab.x > 0 ? rest.x - slab.x - SAIL_BESIDE : rest.x - slab.x + SAIL_BESIDE
        return { x: slab.x + off, y: topOf(slab), on: slab.id, scale: INSIDE, dir: off < rest.x - slab.x ? 1 : -1, inside: true, off }
      }
    }
    if (act.stands === 'on') {
      // An act that goes to a side goes the way the thing leans, or to the side with more room.
      const dir: -1 | 1 = rest.lies === 'ramp' ? rest.side : roomRight ? 1 : -1
      return { x: rest.x, y: topOf(rest), on: rest.id, scale: INSIDE, dir, inside: true }
    }
    let side: -1 | 1 = roomRight ? 1 : -1
    if (act.stands === 'under') {
      const x = clamp(rest.x + side * 30, HOLLOW.left + 30, HOLLOW.right - 30)
      return { x, y: Math.min(groundY(x), rest.y + 112), on: null, scale: INSIDE, dir: side, inside: true }
    }
    // It steps to the thing on a side where the ground beside it is free: it stands in front of no neighbour.
    const beside = (to: -1 | 1): number => clamp(rest.x + to * (rest.w / 2 + 40), HOLLOW.left + 30, HOLLOW.right - 30)
    const free = (to: -1 | 1): boolean => {
      const x = beside(to), ground = groundY(x), half = HALF[who] * INSIDE
      // The ground it stands on is the ground the thing stands on, and nothing else stands where it would.
      if (Math.abs(x - rest.x) < rest.w / 2 + half - 2) return false
      return !this.shownHouse().some((r) => r.id !== rest.id && !rest.under.includes(r.id) && r.y >= ground - 6 && topOf(r) < ground - 4 && Math.abs(r.x - x) < r.w / 2 + half)
    }
    if (!free(side) && free(side === 1 ? -1 : 1)) side = side === 1 ? -1 : 1
    const x = beside(side)
    return { x, y: groundY(x), on: null, scale: INSIDE, dir: side, inside: true }
  }

  /** How much floor is free beside one of the three, from its feet to the nearest thing that stands on its ground or to the wall, in stage units. Past the open end of the root step there is only air. */
  private roomBeside(who: Who, dir: -1 | 1): number {
    const from = this.standOf(who), onStep = from.x < HOLLOW.stepRight
    const ground = groundY(clamp(from.x, HOLLOW.left + 1, HOLLOW.right - 1))
    let room = dir === 1 ? (onStep ? 400 : HOLLOW.right - from.x) : (onStep ? from.x - HOLLOW.left : from.x - HOLLOW.stepRight)
    for (const body of this.bodies) {
      const r = body.rest
      if (!r || this.worn.has(body.id) || r.y < ground - 6 || topOf(r) > ground - 4) continue
      const gap = (r.x - dir * r.w / 2 - from.x) * dir
      if ((r.x - from.x) * dir > 0 && gap < room) room = gap
    }
    return Math.max(0, room)
  }

  /** How far the one who walks blind can go from where it stands before something is in its way, in its own units, and what that is: a thing that stands on its ground, or the wall. */
  private wayFor(who: Who): { reach: number; into: Body | null } {
    const from = this.standOf(who), half = HALF[who] * INSIDE
    const onStep = from.x < HOLLOW.stepRight
    const walls = { left: onStep ? HOLLOW.left : HOLLOW.stepRight, right: onStep ? HOLLOW.stepRight : HOLLOW.right }
    const ground = groundY(clamp(from.x, HOLLOW.left + 1, HOLLOW.right - 1))
    const ahead = (dir: -1 | 1): { gap: number; into: Body | null; open: boolean } => {
      // The right end of the root step is an edge, not a wall: there is nothing there to walk into.
      const open = onStep && dir === 1
      let gap = (dir === 1 ? walls.right : walls.left) * dir - from.x * dir - half, into: Body | null = null
      for (const body of this.bodies) {
        const r = body.rest
        if (!r || body.mode !== 'still' || this.worn.has(body.id) || r.y < ground - 6 || topOf(r) > ground - 10) continue
        const near = (r.x - dir * r.w / 2 - from.x) * dir - half
        if (near >= -half && near < gap) {
          gap = near
          into = body
        }
      }
      return { gap: Math.max(6, gap), into, open: open && into === null }
    }
    const dir = this.where[who].dir
    let way = ahead(dir)
    if (way.open) {
      // It turns round and walks the other way.
      const turned: -1 | 1 = dir === 1 ? -1 : 1
      this.where[who] = { ...this.where[who], dir: turned }
      way = ahead(turned)
    }
    return { reach: way.gap / INSIDE, into: way.into }
  }

  /** One part of the evening: what one of the three does with one thing, shown over the act's length. Each moment of it is heard in the step it is seen. */
  private act(part: Part, at: number): Beat {
    const act = EVENING_ACTS[part.act], who = part.who
    let fired = 0, begun = false
    const told: Told = { snaps: part.twigs.length, sails: part.sails !== null, reach: FULLEST.reach, sleeps: part.sleeps, sweep: FULLEST.sweep }
    let into: Body | null = null
    return {
      at, lasts: act.lasts, play: (p, finishing) => {
        if (finishing) return
        if (!begun) {
          begun = true
          if (part.act === 'lamp') {
            // It walks until something is in its way: the next thing on its ground, or the wall.
            const way = this.wayFor(who)
            told.reach = way.reach
            into = way.into
          }
          if (part.act === 'noFeather') {
            // It sweeps the free floor beside it with the tip of its hat, to the side with more room, and leans no
            // further than that floor is free: never across a thing that stands beside it.
            const left = this.roomBeside(who, -1), right = this.roomBeside(who, 1)
            const to: -1 | 1 = left >= right ? -1 : 1, room = Math.max(left, right)
            this.where[who] = { ...this.where[who], dir: to }
            // Its feet step a little to and fro as it sweeps, the further the further it leans: that is taken off the room too.
            const tall = PERSONALITY[who].reach.height * INSIDE
            let far = 0
            for (let i = 0; i < 4; i++) far = Math.min(FULLEST.sweep, (Math.asin(clamp((room - 16 - 19 * (far / FULLEST.sweep)) / tall, 0, 1)) * 180) / Math.PI)
            told.sweep = (to === TOWARD[who] ? 1 : -1) * far
          }
          if (part.thing !== null && IN_IT.has(part.act)) this.front.add(part.thing)
          const here = this.standOf(who)
          for (const other of FOLK) if (other !== who && !this.abed[other]) this.folk[other].watch(here.x, here.y - 60, act.lasts)
        }
        this.tell(who, act.pose(p, told))
        while (fired < act.cues.length && p >= act.cues[fired].at) {
          const cue = act.cues[fired++]
          // A moment whose cause is not there this evening is neither seen nor heard.
          if (cue.when && !cue.when(part)) continue
          if (cue.voice) {
            this.seen.cues += 1
            this.say(cue.voice, `act ${part.act}`)
          }
          for (const does of cue.does) this.effect(does, part, into)
        }
        if (p < 1) return
        if (part.sleeps) {
          this.abed[who] = 'bed'
          this.tell(who, this.asleepAs(who))
        } else if (part.thing !== null) this.front.delete(part.thing)
      },
    }
  }

  /** What is seen to happen at a moment of an act. */
  private effect(does: Effect, part: Part, into: Body | null = null): void {
    const who = part.who, body = part.thing === null ? null : this.bodies[part.thing]
    const feet = this.standOf(who)
    switch (does) {
      case 'kick':
        if (body) body.squash.speed += 3.4
        break
      case 'snap': {
        // The next twig under the roof snaps, from the left. With the last of them the roof comes down.
        const twig = part.twigs.find((id) => !this.bodies[id].snapped)
        if (twig === undefined) break
        const stick = this.bodies[twig]
        stick.snapped = true
        stick.squash.speed += 3
        if (part.twigs.every((id) => this.bodies[id].snapped)) this.showHouse(part)
        else if (body?.to) {
          // With one twig gone and one still standing, the roof hangs down on the side that broke.
          body.to.angle = Math.sign(stick.x - body.x) * 0.22
          body.angle = body.to.angle
        }
        break
      }
      case 'bonk': {
        // What it walked into gives; a wall sheds a little dust where its hat hit.
        this.folk[who].jolt(-1.6, 2.4)
        if (into) into.squash.speed += 3.4
        else this.puff(feet.x + 30 * feet.scale * this.where[who].dir, feet.y - 80 * feet.scale, 'dust')
        break
      }
      case 'rock':
        if (body?.cell?.rock && body.mode === 'still' && body.rest?.lies === body.cell.form) body.rock = { t: 0, phase: 0, knocks: 0 }
        break
      case 'change':
        this.showHouse(part)
        break
      case 'take':
        if (body) this.worn.set(body.id, { who, how: HOW_WORN[part.act] ?? 'low', taken: 0, back: false })
        break
      case 'back': {
        // It goes back to where it lay, in sight.
        const held = body ? this.worn.get(body.id) : undefined
        if (held) held.back = true
        break
      }
      case 'dust': {
        // Dust rises from the ground, where a landing is. One that slides or rolls off its thing lands on the ground
        // beside it. One that comes down on a thing up off the ground (on a roof that lies on its stumps, on a leaf
        // that lies flat on a stone) raises none: the thing is not dusty.
        // And where a broom sweeps: a flag taken down to sweep the ceiling raises it up there, at the broom.
        const broom = part.act === 'flag' && body ? this.worn.get(body.id) : undefined
        if (body && broom) {
          const held = this.wornLying(body, broom)
          this.puff(held.x, held.y, 'dust')
          break
        }
        const ground = groundY(clamp(feet.x, HOLLOW.left + 1, HOLLOW.right - 1))
        const lands = part.act === 'slide' || part.act === 'tablecloth' ? ground : feet.y
        if (lands >= ground - DUST_NEAR) this.puff(feet.x + 30 * feet.scale * this.where[who].dir, ground, 'dust')
        break
      }
      case 'splash':
        if (body) this.puff(body.x, body.y - 24, 'water')
        break
      case 'spill': {
        if (part.spill) this.spill = { ...part.spill, age: 0 }
        // The fat one dislikes wet: asleep in a bed the water reaches, it starts and grumbles, and sleeps on with a pout.
        const bed = this.where.fat.on
        if (this.abed.fat === 'bed' && bed !== null && part.flooded.includes(bed)) {
          this.folk.fat.jolt(1.4, 2.6)
          this.seen.cues += 1
          this.say(FOLK_VOICE.fat.other, 'act wet')
        }
        break
      }
      case 'fluff':
        this.puff(body ? body.x : feet.x, (body ? body.y : feet.y) - 20, 'fluff')
        break
      case 'sneeze':
        this.folk.fat.jolt(1.8, 2.2)
        break
      case 'wake':
        if (!part.wakes) break
        // The fat one snorts awake and has no bed any more: it ends in the heap.
        this.abed.fat = null
        if (this.where.fat.on !== null) this.front.delete(this.where.fat.on)
        this.tell('fat', { ...AT_REST, dy: 18, wide: 1.4, brow: 0.8, mouth: 'o', open: 0.5 })
        this.folk.fat.jolt(2.2, 2.6)
        this.seen.cues += 1
        this.say(EVENING.snort, 'act snort')
        break
    }
  }

  /** Shows the house as a part of the evening leaves it: twigs snap, what rested on them comes down, a cloth goes, what a bath soaked is wet, a slab sails. */
  private showHouse(part: Part): void {
    for (const body of this.bodies) {
      const next = part.house.find((r) => r.id === body.id)
      const was = body.rest
      if (!was) continue
      if (!next) {
        if (part.lands && body.id === part.thing) {
          // The roof has no free place: it falls where it stands, straight down, touches what is in its way and goes home from there.
          this.fallToward(body, part.lands.x, part.lands.y, 0)
          body.shed = 'out'
          continue
        }
        // It can no longer rest: back to the forest floor, whole and dry.
        this.tumbleHome(body)
        continue
      }
      body.snapped = part.snapped.includes(body.id)
      body.wet = part.soaked.includes(body.id)
      if (sameLie(was, next)) {
        body.rest = next
        continue
      }
      if (this.worn.has(body.id)) {
        body.rest = next
        continue
      }
      if (part.sails !== null && was.y === next.y && was.lies === next.lies) {
        // It rides the slab along the ground.
        body.rest = next
        body.mode = 'sail'
        body.rock = null
        body.swing = 0
        body.to = { ...restPoint(next), angle: restAngle(next) }
        body.speed = Math.abs(body.to.x - body.x) / SAIL_SECONDS
      } else if (part.lands && body.id === part.thing) {
        // The roof falls where it stands, straight down, and slides from where it touches the shortest way to where it can lie.
        this.fallTo(body, next, true, part.lands)
      } else this.layAgain(body, next, true)
    }
  }

  // --- What the view draws ---------------------------------------------------

  /** What the idle ladder's ghost hand would do now: one move, never a plan. By day it carries a thing into the hollow, and every third time pulls the sun down; at evening it raises the sun. */
  demoMove(index: number): { from: { x: number; y: number }; to: { x: number; y: number }; sun: boolean; /** The thing the hand takes, or null for the sun. */ id: number | null } | null {
    if (this.finished) return { from: { x: sunX(SUN_AT.setY), y: SUN_AT.setY - 10 }, to: { x: SUN_AT.x, y: SUN_AT.y }, sun: true, id: null }
    const sorted = this.nearFloor()
    if (index % 3 === 2 || sorted.length === 0) return { from: { x: SUN_AT.x, y: SUN_AT.y }, to: { x: sunX(SUN_AT.under), y: SUN_AT.under - 6 }, sun: true, id: null }
    const body = sorted[(index - Math.floor(index / 3)) % sorted.length]
    const box = touchBox({ ...this.lying(body), sx: 1, sy: 1 })
    const from = { x: box.x + box.w / 2, y: box.y + box.h / 2 }
    for (const x of [640, 560, 730, 790, 420, 600, 690]) {
      const result = settle(this.house, body.id, body.kind, x, this.snapped)
      if (isRested(result) && result.on === 'ground') return { from, to: { x: result.x, y: groundY(result.x) - 30 }, sun: false, id: body.id }
    }
    return { from, to: { x: 640, y: HOLLOW.floorY - 60 }, sun: false, id: body.id }
  }

  /** What lies still on the forest floor, the nearest to the hollow first. */
  private nearFloor(): Body[] {
    const onFloor = this.bodies.filter((body) => body.mode === 'still' && !body.rest)
    return onFloor.sort((a, b) => Math.abs(a.x - HOLLOW.archX) + a.y - (Math.abs(b.x - HOLLOW.archX) + b.y))
  }

  /** How a thing lies that one of the three wears or holds: on its head, in its hand, or wrapped round it. */
  private wornLying(body: Body, by: { who: Who; how: Worn; taken: number }): Lying {
    const at = this.standOf(by.who), pose = this.folk[by.who].pose, dir = this.where[by.who].dir
    const [ox, oy] = by.how === 'hat' ? [0, -186 + pose.part * 20] : by.how === 'high' ? [-58, -210] : by.how === 'low' ? [-64, -30] : [0, -120]
    const cos = Math.cos(at.turn), sin = Math.sin(at.turn)
    const x = at.x + (ox * dir * cos - oy * sin) * at.scale, y = at.y + (ox * dir * sin + oy * cos) * at.scale
    const angle = by.how === 'hat' ? at.turn : by.how === 'high' ? -1.2 * dir + pose.prop * 0.3 : by.how === 'low' ? 0.5 * dir + pose.prop * 0.4 : at.turn - 1.4 * dir
    const held: Lying = { kind: body.kind, form: by.how === 'hat' ? 'down' : by.how === 'wrap' ? 'drape' : 'loose', x, y, angle, side: body.side, swing: 0, sx: 1, sy: 1, snapped: false }
    if (by.taken >= 1) return held
    // On its way there or back it is between where it lay and where it is held.
    const lay = this.lying(body), e = smooth(by.taken)
    return { ...(e < 0.5 ? lay : held), x: lerp(lay.x, x, e), y: lerp(lay.y, y, e), angle: lerp(lay.angle, angle, e) }
  }

  show(guidance: Guidance | null): Show {
    const hand = this.hand
    const inHand = new Set(hand?.bundle ?? [])
    const glow = guidance?.glow ?? 0
    const free = !hand && !this.sunHand && !this.playing
    const move = guidance && guidance.demo !== null && free ? this.demoMove(guidance.demoIndex) : null
    // While the ghost hand shows a move the cue lies on the one thing it takes: that thing, or the sun, and nothing
    // else. Before and between its moves it lies on a few things, the ones the hand may take: the nearest on the
    // forest floor, or with nothing left there the last few set down. At evening it lies on the sun alone, the one
    // thing that is dragged.
    const cued = new Set<number>()
    if (glow > 0 && !this.finished && move) {
      if (move.id !== null) cued.add(move.id)
    } else if (glow > 0 && !this.finished) {
      const near = this.nearFloor()
      for (const body of near.slice(0, 4)) cued.add(body.id)
      if (near.length === 0) for (const rest of this.house.slice(-4)) cued.add(rest.id)
    }
    const shown = (body: Body): ShownThing => {
      const by = this.worn.get(body.id)
      return {
        ...(by ? this.wornLying(body, by) : this.lying(body)),
        id: body.id, housed: !by && body.rest !== null && body.mode === 'still' && !inHand.has(body.id),
        extra: body.mode === 'still' || body.mode === 'sail' ? body.cell?.extra ?? null : null, well: body.well,
        glows: body.mode === 'still' && cued.has(body.id), wet: body.wet,
      }
    }
    const things: ShownThing[] = [], front: ShownThing[] = []
    const over = this.overSleepers()
    const behind = (body: Body): boolean => !inHand.has(body.id) && !this.front.has(body.id) && !this.worn.has(body.id) && !over.has(body.id)
    for (const rest of this.house) if (behind(this.bodies[rest.id]) && this.bodies[rest.id].mode === 'still') things.push(shown(this.bodies[rest.id]))
    const inHouse = new Set(this.house.map((r) => r.id))
    for (const body of this.bodies) if (!inHouse.has(body.id) && behind(body) && body.mode === 'still') things.push(shown(body))
    for (const body of this.bodies) if (behind(body) && body.mode !== 'still') things.push(shown(body))
    if (hand) for (const id of hand.bundle) things.push(shown(this.bodies[id]))
    for (const body of this.bodies) if (!inHand.has(body.id) && (this.front.has(body.id) || this.worn.has(body.id) || over.has(body.id))) front.push(shown(body))

    let shadow: Show['shadow'] = null
    if (hand?.carrying) {
      const base = this.bodies[hand.id]
      const { x: tx, y: ty } = wanted(hand)
      if (overHollow(hand.x, hand.y) || overHollow(tx, ty - 10)) {
        // The shadow lies where the thing would lie if it were let go now: under a roof it is held under, on the ground there.
        const memo = this.shadowAt
        const result = memo && memo.house === this.house && memo.id === base.id && memo.x === tx && memo.y === ty ? memo.result : settle(this.house, base.id, base.kind, tx, this.snapped, ty)
        this.shadowAt = { house: this.house, id: base.id, x: tx, y: ty, result }
        if (isRested(result)) shadow = { x: result.x, y: result.y, w: result.w }
      }
    }
    let ghost: Show['hand'] = null
    if (guidance && guidance.demo !== null && move) {
      const p = guidance.demo
      const opacity = Math.min(clamp(p / 0.1, 0, 1), 1 - clamp((p - 0.88) / 0.12, 0, 1))
      const travel = smooth(clamp((p - 0.26) / 0.46, 0, 1))
      const press = Math.min(clamp((p - 0.14) / 0.08, 0, 1), 1 - clamp((p - 0.76) / 0.08, 0, 1))
      // A carried thing goes over in an arc; the sun goes straight along its track.
      ghost = { x: lerp(move.from.x, move.to.x, travel), y: lerp(move.from.y, move.to.y, travel) - (move.sun ? 0 : Math.sin(travel * Math.PI) * 60), press, opacity }
    }
    const snail = this.snailAt(), moth = this.mothAt()
    const owlLook = hand ? this.bodies[hand.id] : null
    return {
      things, front, shadow,
      folk: { fat: this.folk.fat.pose, tidy: this.folk.tidy.pose, tiny: this.folk.tiny.pose },
      stand: { fat: this.standOf('fat'), tidy: this.standOf('tidy'), tiny: this.standOf('tiny') },
      inside: { fat: this.where.fat.inside, tidy: this.where.tidy.inside, tiny: this.where.tiny.inside },
      behind: { fat: this.going.fat && this.where.fat.inside, tidy: this.going.tidy && this.where.tidy.inside, tiny: this.going.tiny && this.where.tiny.inside },
      snail: { ...snail, hidden: clamp(this.snail.hidden / 0.3, 0, 1), facing: this.snail.dir },
      moth: { ...moth, flap: Math.sin(this.seconds * 34), facing: Math.cos(this.moth.phase) >= 0 ? 1 : -1 },
      owl: {
        duck: clamp(this.owl.duck * 1.6, 0, 1), shut: this.owl.blink >= 0,
        gazeX: owlLook ? clamp((owlLook.x - OWL_AT.x) / 400, -1, 1) : Math.sin(this.seconds * 0.4) * 0.5,
        gazeY: owlLook ? clamp((owlLook.y - OWL_AT.y) / 400, -1, 1) : 0.6,
      },
      sun: { x: sunX(this.sun.y), y: this.sun.y, bob: this.sun.bob.at, turn: this.sun.turn + this.seconds * 0.05, glows: glow > 0 && free && (this.finished || (move?.sun ?? false)) },
      dusk: clamp((this.sun.y - SUN_AT.y) / (SUN_AT.setY - SUN_AT.y), 0, 1),
      puffs: this.puffs,
      spill: this.spill ? { from: this.spill.from, to: this.spill.to, y: this.spill.y, fade: clamp(this.spill.age / SPILL_SECONDS, 0, 1) } : null,
      glow, hand: ghost, seconds: this.seconds,
    }
  }
}

/** Halfway from one direction to another: lying down, getting up. */
function mix(a: Direction, b: Direction, t: number): Direction {
  return {
    dx: lerp(a.dx, b.dx, t), dy: lerp(a.dy, b.dy, t), fall: lerp(a.fall, b.fall, t), turn: lerp(a.turn, b.turn, t),
    lean: lerp(a.lean, b.lean, t), bob: lerp(a.bob, b.bob, t), part: lerp(a.part, b.part, t), prop: lerp(a.prop, b.prop, t),
    lid: lerp(a.lid, b.lid, t), open: lerp(a.open, b.open, t), mouth: t < 0.5 ? a.mouth : b.mouth, brow: lerp(a.brow, b.brow, t), wide: lerp(a.wide, b.wide, t),
  }
}

/** Whether a point of the stage is seen through the hollow's opening: under the arch and between its two feet. */
export function inOpening(x: number, y: number): boolean {
  return Math.abs(x - HOLLOW.archX) < HOLLOW.archRx && y >= ceilingY(x) && y <= HOLLOW.floorY + 40
}

/** The stage itself, as the part of the wood a surface of its own shape shows. */
const STAGE_SEEN = { x: 0, w: 1180 } as const

/** Whether a point lies inside the tree's outline: its trunk or one of its two roots. */
function inTree(x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = TREE.length - 2; i < TREE.length; j = i, i += 2) {
    const ax = TREE[i], ay = TREE[i + 1], bx = TREE[j], by = TREE[j + 1]
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside
  }
  return inside
}

/** What a point of the stage with nothing on it is, each of which answers a touch as what it is. */
export type Place = 'ground' | 'wood' | 'root' | 'bush' | 'hill' | 'sky'

/**
 * What a point of the stage with nothing on it is: the ground (the forest floor, the floor of the hollow and its
 * root step), the tree's wood, one of its two big roots, a bush, the far hill, or the open sky and the far wood.
 */
export function placeOf(x: number, y: number): Place {
  if (x > HOLLOW.left && x < HOLLOW.right && y >= groundY(x) - 10) return 'ground'
  if (inTree(x, y)) {
    if (x < ROOTS.left || x > ROOTS.right) return 'root'
    // Under the hollow's floor the trunk stands in the earth.
    return y >= 632 ? 'ground' : 'wood'
  }
  // The forest floor lies in front of everything that stands behind it.
  if (y >= FLOOR_FROM) return 'ground'
  for (const [cx, cy, r] of BUSHES) if (((x - cx) / (r * 1.15)) ** 2 + ((y - cy) / (r * 0.8)) ** 2 <= 1) return 'bush'
  if (y >= hillTop(x, STAGE_SEEN) || (x >= HILL_AIR.fromX && y >= HILL_AIR.fromY)) return 'hill'
  return 'sky'
}

/** Whether a round touch target lies clear of the jam's home control, with room to spare. */
export function clearOfHomeControl(x: number, y: number, r: number): boolean {
  return Math.hypot(x - HOME_CONTROL.x, y - HOME_CONTROL.y) > r + HOME_CONTROL.r + 10
}
