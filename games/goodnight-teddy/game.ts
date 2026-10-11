import { ACTS, span, type Act, type ActId } from './acts'
import { MUZZLE, topAt } from './bear'
import { CELLS, CELL_PART, LIVE, SEEN, TOWEL_SWEEP, bareMud, cellX, cellY, fluffAt, freshFur, has, isDry, most, pour, ruffle, shake as shakeFur, soap, towel, wants, wettest, type Fur, type Open } from './fur'
import type { Point } from './input'
import { below, makeRng, type Rng } from './rng'
import { AT_DOOR, AT_GLASS, CAT, CAT_NIGHT_X, DUCK, HOMES, IN_GARDEN, LAMP, CLOTH_IDS, LYING, SITTING, TEDDY, THING_IDS, TUB, WASH_IDS, clothSpot, coveredBy, duckSpot, isCloth, landingOf, onTeddy, reachable, targetAt, toBear, whatAt, type ClothId, type Stance, type ThingId, type WashId, type World } from './room'
import { nextMud, type BlanketAt, type CatCoat, type DuckCoat, type Lamp, type PyjamasAt, type Save, type Shade, type Wearer } from './save'
import { MOST_SUDS } from './save'
import { Scene, type Beat } from './scene'
import { beginCycle, finishCycle } from './state'
import type { Sound } from './voices'

// The game: one room, one bear, five carried things and a bare hand. It has no goal but sleep and judges nothing.
// Everything here runs on the seconds it is stepped by and on one seeded stream, draws nothing and makes no
// sound: it queues sounds for the Mount, each with the name of what is drawn making it, and holds numbers for
// the view. What is saved (`rec`) and what is shown are kept apart only where a scene or a tapped thing's flight
// shows something a moment after it is true.

/** A value that overshoots and settles. */
export type Spring = { v: number; d: number }
const rest = (v = 0): Spring => ({ v, d: 0 })
function settle(s: Spring, target: number, stiffness: number, damping: number, dt: number): void {
  s.d += ((target - s.v) * stiffness - s.d * damping) * dt
  s.v += s.d * dt
}
const ease = (from: number, to: number, rate: number, dt: number): number => from + (to - from) * Math.min(1, rate * dt)
const smooth = (t: number): number => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const between = (a: Stance, b: Stance, t: number): Stance => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), scale: lerp(a.scale, b.scale, t), turn: lerp(a.turn, b.turn, t) })

/** home: resting at its place. held: under the finger. waiting: let go mid-drag. flying, working: sent by a tap. returning: on its way back to rest. */
export type ThingMode = 'home' | 'held' | 'waiting' | 'flying' | 'working' | 'returning'
export type Thing = {
  id: ThingId; x: number; y: number; mode: ThingMode; t: number; from: Point; to: Point; tilt: number
  /** Which way its spout looks: 1 to the right, -1 to the left. Only the jug turns. */
  side: 1 | -1
  squash: Spring
  pouring: boolean
  /** A wash thing that was tapped while a tapped cloth was in the air to Teddy, and goes when the cloth has landed. */
  queued: boolean
  /** Where it rests: `home` for a wash thing, and for a cloth its place or whoever wears it. */
  place: string
  /** Where its flight ends. */
  goal: string
  /** How many dabs of a tap's work are done. */
  dabs: number
  /** The towel only: soaked from the bath until it is home, and a brown print from mud that fades. */
  soaked: number
  print: number
}

export type BitKind = 'bubble' | 'drop' | 'puff' | 'dust' | 'smear' | 'wipe' | 'damp' | 'steam' | 'gleam'
export type Bit = { kind: BitKind; x: number; y: number; vx: number; vy: number; age: number; life: number; size: number }
export const MOST_BITS = 48

/** Falling water as the view draws it: from the spout down to where it lands. */
export type Stream = { x: number; top: number; bottom: number; on: Wearer | 'floor' }

/** What is drawn making a sound. Every sound is queued with one, and shown.ts says what each means. */
export type Channel =
  | 'held' | 'landed' | 'stroke' | 'water' | 'tickle' | 'cross' | 'sneeze' | 'squirm' | 'shake' | 'bliss' | 'bounce' | 'thump' | 'bits'
  | 'duckSquash' | 'duckSpin' | 'duckGleam' | 'catArch' | 'catSwat' | 'catJump' | 'catRub' | 'catStiff' | 'lampSwing' | 'lampRub'
  | 'tubPour' | 'towelDrip' | 'shiver' | 'flutter' | 'curtain' | 'night' | 'door' | 'walk' | 'stretch' | 'puddle'
  | 'act:teddy' | 'act:duck' | 'act:cat' | 'act:lamp' | 'act:tub'
export type Heard = { sound: Sound; by: Channel; act?: ActId }

export type SceneId = 'asleep' | 'garden' | 'comingIn' | 'catWalk'
export type Want = ThingId | 'lamp' | 'curtain' | 'door' | null
type Actor = 'teddy' | 'duck' | 'cat' | 'lamp' | 'tub'
type Running = Act & { next: number }

const FLY = 0.34, WORK: Record<WashId, number> = { soap: 0.9, jug: 1.3, towel: 0.95 }, BACK = 0.4
/** A tapped thing's work on his coat is done in dabs, this many a second, so it comes out the same however long the frames are. */
const DAB = 1 / 30
/** How far a tapped jug travels over him while it pours: from beyond one arm to beyond the other. */
const JUG_CROSS = 520
export const DABS: Record<WashId, number> = { soap: Math.round(WORK.soap / DAB), jug: Math.round(WORK.jug / DAB), towel: Math.round(WORK.towel / DAB) }
/** How far above the finger a held thing rides, so a small hand does not hide it. */
const RIDE = 34
const FLOOR_SPLASH = 756
/** The longest step the springs are played in, in seconds. */
export const STEP = 1 / 90
/** Beside the bed, wrapped and about to flop in. */
const BEDSIDE: Stance = { x: 820, y: 716, scale: 0.8, turn: 0 }
/** In the open doorway, on his way out or in. */
const THROUGH: Stance = { x: 446, y: 566, scale: 0.45, turn: 0 }

/** The cells of his coat a thing can reach, for each way he can be dressed. */
const OPEN: Record<string, Open> = {}
function openFor(blanket: boolean, pyjamas: boolean): Open {
  if (!blanket && !pyjamas) return null
  const key = `${blanket}${pyjamas}`
  OPEN[key] ??= Array.from({ length: CELLS }, (_, i) => CELL_PART[i] !== null && !(blanket && coveredBy('blanket', cellX(i), cellY(i))) && !(pyjamas && coveredBy('pyjamas', cellX(i), cellY(i))))
  return OPEN[key]
}

/** One dab of a tapped thing's work on a coat. Returns where it was done, in stage units, and what it did. */
export function dab(fur: Fur, id: WashId, k: number, to: Point, open: Open): { at: Point; onHim: boolean; fluff: number; mud: number; changed: boolean } {
  const none = { fluff: 0, mud: 0 }
  // A tap is a whole job, since the youngest child only taps: the soap covers a muddy place, the towel dries a
  // part of him, and the jug's one sheet of water runs over all of him.
  if (id === 'soap') {
    const at = { x: to.x + Math.cos(k * 0.47) * 50, y: to.y + Math.sin(k * 0.47) * 44 }, p = toBear(at)
    return { at, onHim: true, ...none, changed: soap(fur, p.x, p.y, DAB * 5, open) > 0 }
  }
  if (id === 'towel') {
    const at = { x: to.x + Math.sin(k * 0.42) * TOWEL_SWEEP.x, y: to.y + Math.sin(k * 0.19) * TOWEL_SWEEP.y }, p = toBear(at)
    const out = towel(fur, p.x, p.y, DAB * 14, open)
    return { at, onHim: true, fluff: out.fluff, mud: out.mud, changed: out.fluff > 0 || out.dried > 0 }
  }
  // The jug crosses over him from one side to the other with its spout ahead of it, and pours for the middle of the way.
  const at = { x: to.x + smooth(k / DABS.jug) * JUG_CROSS, y: to.y }
  if (k < 3 || k >= DABS.jug - 3) return { at, onHim: false, ...none, changed: false }
  const p = toBear({ x: at.x + 62, y: at.y + 26 }), land = topAt(p.x)
  if (land === null || p.y >= land + 40) return { at, onHim: false, ...none, changed: false }
  // The sheet runs down all of him that is under it, so an ear beside where its middle lands is rinsed too.
  return { at, onHim: true, ...none, changed: pour(fur, p.x, -Infinity, DAB * 6, open).cells > 0 }
}

export class Game {
  /** The record: what a save holds, but for the coat, which is `fur` with whatever a tap has still to do. */
  rec: Save
  readonly fur: Fur
  /** The coat the record holds while a scene still shows the one before it. */
  private furAhead: Fur | null = null
  /** Counts up whenever the coat changes, so the view repaints it only then. */
  furVersion = 0
  /** What the Mount hands to storage after a touch or a step: nothing, a small change, or a change to save at once. */
  changed: 0 | 1 | 2 = 0
  time = 0
  readonly things: Record<ThingId, Thing>
  held: ThingId | null = null
  /** The finger while it is down, for every pair of eyes in the room. */
  finger: Point | null = null
  private rubbing = false
  stream: Stream | null = null
  bits: Bit[] = []
  private heard: Heard[] = []
  private readonly rng: Rng
  private v = 0

  /** What is shown of the record's small fields. They differ from it only inside a scene, until the beat that shows them. */
  readonly show: { duck: DuckCoat; cat: CatCoat; shade: Shade; suds: number; lamp: Lamp }
  /** The room's own slow things, each eased toward where it is going. */
  readonly env = { curtainAt: 0, curtainGoal: 0, sway: rest(), night: 0, nightGoal: 0, morning: 0, morningGoal: 0, doorAt: 0, doorGoal: 0 }

  readonly teddy = {
    stance: { ...SITTING } as Stance,
    look: { x: TEDDY.x, y: TEDDY.y - 300 } as Point,
    lean: rest(), bounce: rest(), nod: rest(), armL: rest(), armR: rest(),
    /** 0 to 1 each: squirming under water, leaning into the towel, eyes crossed at the soap, tickled. */
    squirm: 0, bliss: 0, cross: 0, tickle: 0, thump: 0, stamp: 0,
    /** The bubble on his nose, 0 to 1, and how long before another may grow. */
    bubble: 0, bubbleRest: 0,
    /** Seconds left of a sneeze and a shake. */
    sneeze: 0, shake: 0,
    /** Seconds the water has run over him in this pour, and seconds since it stopped. */
    soaked: 0, sinceWater: 9,
    blink: 2.4, lookAt: 0,
    act: null as Running | null,
    /** The act that follows the one that is running. */
    then: null as ActId | null,
    /** The blanket is on the lamp and he has still to throw the ear shadows it asks for. */
    shadowDue: false,
    /** 0 to 1 each, eased: wet under the blanket, hiding from the lamp, hugging himself in the dark, plucking at damp pyjamas, one eye shut at the jug. */
    shiver: 0, peep: 0, hug: 0, pluck: 0, wink: 0,
    /** Set by scenes: walking, stretching in bed, jumping in the puddle, in the doorway, behind the glass, lying down, nose flat on the glass. */
    walk: 0, stretch: 0, puddle: 0, through: 0, outside: 0, lying: 0, pressed: 0,
    /** How high a hop of his walk lifts him. */
    hop: 0,
  }
  readonly duck = { squash: rest(), rock: rest(), hop: rest(), ripple: 9, act: null as Running | null, wig: 0, spin: 0, gleam: 0, polish: 0, soaked: 0, sinceWater: 9, snoreIn: 2 }
  readonly cat = { x: CAT.x as number, arch: 0, jump: rest(), puff: 0, swat: 0, act: null as Running | null, rubs: 0, rubbed: 0, stiff: 0, sunk: 0, paw: 0, sinceWater: 9 }
  readonly lampFx = { swing: rest(), act: null as Running | null, rubbed: 0, sinceRub: 9 }
  readonly tub = { act: null as Running | null, pour: 0, sincePour: 9, step: 0, sudsAt: 0 }

  private scene: Scene | null = null
  sceneId: SceneId | null = null

  private strokeDist = 0
  /** How fast the jug is moving, 0 to 1. */
  private jugPace = 0
  private sinceStroke = 9
  private sinceVoice = 9
  private humStep = 0
  private sinceHum = 9
  private fluffUp = 0
  private popped = 0
  private sleepy: number
  private sinceYawn = 0
  private sinceDrip = 0
  private sinceDamp = 9
  private sinceDrip2 = 0
  private wasDry: boolean

  constructor(save: Save, seed: number) {
    this.rec = { ...save, mudPlaces: [...save.mudPlaces] }
    this.fur = { mud: [...save.fur.mud], foam: [...save.fur.foam], wet: [...save.fur.wet], fluff: [...save.fur.fluff] }
    // Found already dry, tucked in and in the dark: he is asleep, and no ending plays.
    if (this.rec.phase === 'evening' && this.rec.blanket === 'teddy' && this.rec.lamp === 'down' && isDry(this.fur)) this.rec = { ...finishCycle(this.rec, 'mixed'), phase: 'night', curtain: 'closed' }
    const rec = this.rec
    this.show = { duck: rec.duck, cat: rec.cat, shade: rec.shade, suds: rec.suds, lamp: rec.lamp }
    this.rng = makeRng(seed)
    const thing = (id: ThingId, place: string): Thing => ({ id, x: 0, y: 0, mode: 'home', t: 0, from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, tilt: 0, side: 1, squash: rest(), pouring: false, place, goal: place, dabs: 0, soaked: 0, print: 0, queued: false })
    this.things = { soap: thing('soap', 'home'), jug: thing('jug', 'home'), towel: thing('towel', 'home'), pyjamas: thing('pyjamas', rec.pyjamas), blanket: thing('blanket', rec.blanket) }
    // As it was left: everyone where the phase puts them, nothing easing in.
    const night = rec.phase === 'night', morning = rec.phase === 'morning'
    this.cat.x = night ? CAT_NIGHT_X : CAT.x
    this.teddy.stance = { ...(night ? LYING : morning ? AT_GLASS : SITTING) }
    this.teddy.lying = night ? 1 : 0
    this.teddy.outside = morning ? 1 : 0
    this.teddy.pressed = morning ? 1 : 0
    const env = this.env
    env.curtainAt = env.curtainGoal = rec.curtain === 'open' ? 1 : 0
    env.night = env.nightGoal = night ? 1 : 0
    env.morning = env.morningGoal = morning ? 1 : 0
    this.duck.wig = rec.duck === 'foam' ? 1 : 0
    this.tub.sudsAt = rec.suds
    for (const id of THING_IDS) this.park(this.things[id])
    this.sleepy = this.sleepiness()
    this.wasDry = isDry(this.fur)
  }

  /** The record as it is to be saved: everything at rest, and a tapped thing's work on his coat already done. */
  toSave(): Save {
    return { ...this.rec, mudPlaces: [...this.rec.mudPlaces], fur: this.furAhead ? copyFur(this.furAhead) : this.furAfterTaps() }
  }

  /** The sounds queued since the last call, for the Mount. */
  takeSounds(): Sound[] {
    return this.takeHeard().map((heard) => heard.sound)
  }

  /** The same, each with what is drawn making it, for the test that holds the two together. */
  takeHeard(): Heard[] {
    const out = this.heard
    this.heard = []
    return out
  }

  /**
   * A thing is out of its place, a scene or an answer is playing: not a moment for the idle hand. What the room does
   * by itself when left alone (his idle yawn, the duck's snore) is not an answer, so the hand still comes and backs off.
   */
  get busy(): boolean {
    const answering = (act: Running | null, own: ActId): boolean => act !== null && act.id !== own
    return this.sceneId !== null || THING_IDS.some((id) => this.things[id].mode !== 'home') || this.teddy.shake > 0 || this.teddy.sneeze > 0
      || answering(this.teddy.act, 'yawnIdle') || answering(this.duck.act, 'snore') || this.cat.act !== null || this.lampFx.act !== null || this.tub.act !== null
  }

  /**
   * The one thing the room asks for now, which Teddy looks at and the idle hand shows: the wash thing his coat
   * asks for, then the blanket, then the lamp; the curtain while he sleeps, and the door while he waits outside.
   */
  get want(): Want {
    if (this.sceneId !== null) return null
    if (this.rec.phase === 'night') return 'curtain'
    if (this.rec.phase === 'morning') return 'door'
    return wants(this.fur) ?? (this.rec.blanket !== 'teddy' ? 'blanket' : this.rec.lamp === 'up' ? 'lamp' : null)
  }

  /** How far the blanket is swollen into a dome on the bath, from 0 to a little over 1: it rises fast, stands, and sinks. The view and a touch both read it. */
  domeSwell(): number {
    const act = this.duck.act
    if (!act || act.id !== 'dome') return 0
    const up = span(act, 'dome', 0, 0.5), down = span(act, 'dome', 1.5, 2.5)
    return (1 - Math.pow(1 - up, 3)) * (1 + Math.sin(up * Math.PI) * 0.12) * (1 - smooth(down))
  }

  /** The middle of the water under a cloth he wears, in his units, where its wet patch shows. Null when no water is under it: foam is not water. */
  dampUnder(id: ClothId): Point | null {
    let x = 0, y = 0, sum = 0
    for (const i of LIVE) {
      const wet = this.fur.wet[i]
      if (wet < SEEN || !coveredBy(id, cellX(i), cellY(i))) continue
      x += cellX(i) * wet; y += cellY(i) * wet; sum += wet
    }
    return sum > 0 ? { x: x / sum, y: y / sum } : null
  }

  /** Whether a cloth is resting on someone now, as against in the hand or in the air. */
  worn(id: ClothId, by: Wearer): boolean {
    return this.things[id].mode === 'home' && this.things[id].place === by
  }

  /** The room as a touch finds it. */
  world(): World {
    return {
      phase: this.rec.phase,
      blanket: this.things.blanket.place as BlanketAt,
      pyjamas: this.things.pyjamas.place as PyjamasAt,
      away: THING_IDS.filter((id) => this.things[id].mode !== 'home'),
      sitting: this.rec.phase === 'evening' && this.sceneId !== 'asleep',
      catX: this.cat.x,
      dome: this.domeSwell(),
    }
  }

  /** Where each carried thing rests now, for the idle hand. */
  rests(): Record<ThingId, Point> {
    const out = {} as Record<ThingId, Point>
    for (const id of THING_IDS) out[id] = this.restOf(this.things[id])
    return out
  }

  /** The cells of his coat that show, given what he wears now. */
  private open(): Open {
    return openFor(this.worn('blanket', 'teddy'), this.worn('pyjamas', 'teddy'))
  }

  private furAfterTaps(): Fur {
    const fur = copyFur(this.fur)
    for (const id of WASH_IDS) {
      const thing = this.things[id]
      if (thing.goal !== 'teddy' || (thing.mode !== 'flying' && thing.mode !== 'working')) continue
      for (let k = thing.dabs; k < DABS[id]; k++) dab(fur, id, k, thing.to, this.open())
    }
    return fur
  }

  /** How many of the three that sleep needs are true: dry, under the blanket, the lamp down. */
  private sleepiness(): number {
    return (isDry(this.fur) ? 1 : 0) + (this.rec.blanket === 'teddy' ? 1 : 0) + (this.rec.lamp === 'down' ? 1 : 0)
  }

  // --- The finger -------------------------------------------------------------

  press(at: Point): void {
    // A touch ends a scene, and is then an ordinary touch.
    this.endScene()
    this.finger = { ...at }
    this.rubbing = false
    const hit = whatAt(at, this.world())
    if (hit.kind === 'thing') {
      const thing = this.things[hit.id]
      // A cloth lifted off someone: whatever they were doing with it stops with it.
      if (isCloth(hit.id)) this.lifted(hit.id, thing.place)
      this.held = hit.id
      thing.mode = 'held'
      thing.queued = false
      thing.t = 0
      thing.squash.d = 7
      this.strokeDist = 0
      this.say({ id: 'grab', thing: hit.id }, 'held')
      this.teddy.lookAt = 1.5
      return
    }
    if (hit.kind === 'room' || hit.kind === 'door' && this.rec.phase !== 'morning') {
      for (let n = 0; n < 5; n++) this.bit('dust', at.x, at.y, (this.rng.next() - 0.5) * 150, -40 - this.rng.next() * 110, 0.7, 16 + this.rng.next() * 16)
      this.say({ id: 'thud', v: this.next() }, 'bits')
      return
    }
    if (hit.kind === 'door') { this.comeIn(); return }
    if (hit.kind === 'curtain') {
      if (this.rec.phase === 'night') { this.goOut(); return }
      if (this.rec.phase === 'morning') {
        // The day has come: the curtain sways and stays open.
        this.env.sway.d = 4
        this.say({ id: 'flutter' }, 'curtain')
        return
      }
      this.rec.curtain = this.rec.curtain === 'open' ? 'closed' : 'open'
      this.env.curtainGoal = this.rec.curtain === 'open' ? 1 : 0
      this.env.sway.d = 2
      this.say({ id: this.rec.curtain === 'open' ? 'swishOpen' : 'swishShut' }, 'curtain')
      this.changed = 2
      return
    }
    if (hit.kind === 'tub') {
      this.start('tub', 'splash')
      for (let n = 0; n < 7; n++) this.bit('drop', at.x + (this.rng.next() - 0.5) * 40, Math.min(at.y, TUB.water), (this.rng.next() - 0.5) * 300, -220 - this.rng.next() * 240, 0.7, 9 + this.rng.next() * 6)
      this.duck.rock.d = 5
      this.duck.ripple = 0
      return
    }
    if (hit.id === 'teddy') {
      if (this.rec.phase === 'night') { this.start('teddy', 'stir'); return }
      this.rubbing = true
      this.teddy.tickle = 1
      this.teddy.bounce.d = -5
      this.say({ id: 'giggle', v: this.next() }, 'tickle')
    } else if (hit.id === 'duck') {
      this.duck.squash.d = -9
      this.duck.rock.d = (this.rng.next() - 0.5) * 6
      this.duck.ripple = 0
      this.say({ id: 'squeak', v: this.next() }, 'duckSquash')
    } else if (hit.id === 'cat') {
      const tail = at.x > this.cat.x + 30 && at.y > CAT.y + 20
      if (tail) { this.cat.swat = 0.5; this.say({ id: 'chirp', v: this.next() }, 'catSwat') } else { this.cat.arch = 1; this.say({ id: 'purr', v: this.next() }, 'catArch') }
    } else if (this.rec.phase === 'night') {
      // While he sleeps the lamp stays down: it swings on its stem and answers, and is not turned up.
      this.lampFx.swing.d = 3
      this.say({ id: 'lampDown' }, 'lampSwing')
    } else {
      this.turnLamp(this.rec.lamp === 'up' ? 'down' : 'up')
      this.rec.lamp = this.show.lamp
      this.changed = 2
      this.afterChange()
    }
  }

  private turnLamp(to: Lamp): void {
    this.show.lamp = to
    this.lampFx.swing.d = 3
    this.say({ id: to === 'down' ? 'lampDown' : 'lampUp' }, 'lampSwing')
    this.teddy.lookAt = 1.4
    this.duck.snoreIn = 1.6
  }

  /**
   * The finger came up where it went down. In the evening a held thing goes to Teddy, works on him once by itself
   * and, if it is a wash thing, goes home; a cloth he already wears goes back to its own place. While he sleeps or
   * is outside there is nobody to send it to, and it goes back where it was.
   */
  tap(): void {
    const thing = this.held ? this.things[this.held] : null
    this.finger = null
    this.held = null
    this.rubbing = false
    if (!thing) return
    if (this.rec.phase !== 'evening') { this.sendBack(thing); return }
    // A wash thing tapped while a tapped cloth is still in the air to him waits where it is until the cloth has landed.
    if (!isCloth(thing.id) && this.arriving()) { thing.mode = 'waiting'; thing.queued = true; return }
    this.send(thing)
  }

  /** Whether a cloth is in the air on its way to Teddy. */
  private arriving(): boolean {
    return CLOTH_IDS.some((cloth) => this.things[cloth].mode === 'flying' && this.things[cloth].goal === 'teddy')
  }

  /** Sends a tapped thing on its way: a cloth to Teddy or back to its place, a wash thing to where its work is. */
  private send(thing: Thing): void {
    thing.queued = false
    // A wash thing whose work is under what he wears sends the cloth back to its place first, in the same tap.
    if (!isCloth(thing.id)) this.undress(thing.id)
    const open = this.open()
    const onHim = (p: Point | null, or: Point): Point => { const q = p ?? or; return { x: TEDDY.x + q.x, y: TEDDY.y + q.y } }
    const id = thing.id
    if (isCloth(id)) {
      const home = id === 'blanket' ? 'bed' : 'peg'
      const goal = thing.place === 'teddy' ? home : 'teddy'
      // The record has it at the lift, before the arc is drawn.
      this.setCloth(id, goal)
      this.fly(thing, goal)
      this.changed = 2
      this.afterChange()
      return
    }
    // With no mud to go to, the soap goes where its foam will show: his belly, or his head when a cloth is over the belly.
    if (id === 'soap') thing.to = onHim(bareMud(this.fur, open) ?? most(this.fur, 'mud', open), open || most(this.fur, 'mud') ? { x: 0, y: -400 } : { x: 0, y: -170 })
    else if (id === 'towel') thing.to = onHim(wettest(this.fur, open), { x: 0, y: -400 })
    // The jug starts beyond one arm and crosses over all of him.
    else thing.to = { x: TEDDY.x - JUG_CROSS / 2 - 62, y: TEDDY.y - 560 }
    thing.from = { x: thing.x, y: thing.y }
    thing.mode = 'flying'
    thing.goal = 'teddy'
    thing.dabs = 0
    thing.t = 0
    this.changed = 2
    this.afterChange()
  }

  dragMove(from: Point, at: Point): void {
    const last = this.finger ?? from
    const d = Math.hypot(at.x - last.x, at.y - last.y)
    this.finger = { ...at }
    const thing = this.held ? this.things[this.held] : null
    if (thing) {
      // The finger came back to a thing that was waiting in the air.
      thing.mode = 'held'
      thing.queued = false
      if (thing.id === 'jug') thing.pouring = true
      else if (thing.id === 'soap' || thing.id === 'towel') this.rub(thing.id, at, d / (thing.id === 'soap' ? 190 : 105), Math.min(1, d / 40))
      return
    }
    if (this.rubbing && onTeddy(at, 6)) {
      const p = toBear(at)
      this.teddy.tickle = 1
      this.popped += ruffle(this.fur, p.x, p.y, d / 80, this.open())
      if (this.popped > 0.45) {
        this.popped = 0
        this.touchFur()
        this.bit('bubble', at.x, at.y, (this.rng.next() - 0.5) * 120, -90 - this.rng.next() * 60, 0.5, 12)
        this.say({ id: 'pop', v: this.next() }, 'bits')
      }
      // Fluffy fur is ruffled and springs back: a tuft flies up from under the finger.
      this.fluffUp += fluffAt(this.fur, p.x, p.y) > 0.6 ? d / 90 : 0
      if (this.fluffUp > 1) { this.fluffUp = 0; this.bit('puff', at.x, at.y - 10, (this.rng.next() - 0.5) * 90, -70, 0.6, 26) }
    }
  }

  /** The finger lifted mid-drag: the thing waits in the air where it was let go. */
  dragLift(): void {
    const thing = this.held ? this.things[this.held] : null
    this.finger = null
    if (thing) { thing.mode = 'waiting'; thing.pouring = false }
  }

  /** The drag is over where the finger let go. A wash thing goes home; a cloth stays on whoever it was let go over, or flutters back. */
  drop(): void {
    const thing = this.held ? this.things[this.held] : null
    this.finger = null
    this.held = null
    this.rubbing = false
    if (!thing) return
    if (!isCloth(thing.id)) { this.sendBack(thing); return }
    const target = targetAt({ x: thing.x, y: thing.y + RIDE }, this.world())
    if (target === null) {
      this.say({ id: 'flutter' }, 'flutter')
      this.sendBack(thing)
      return
    }
    this.setCloth(thing.id, target)
    this.land(thing, target)
    this.changed = 2
    this.afterChange()
  }

  /** The press or the drag was taken away, which is not the child letting go: the thing goes back where it was, and no move is made. */
  back(): void {
    const thing = this.held ? this.things[this.held] : null
    this.finger = null
    this.held = null
    this.rubbing = false
    if (thing) this.sendBack(thing)
  }

  // --- The carried things -------------------------------------------------------

  /** Where a thing rests, given its place. */
  private restOf(thing: Thing): Point {
    if (!isCloth(thing.id) || thing.place === 'bed' || thing.place === 'peg') return HOMES[thing.id]
    const world = this.world()
    if (thing.place === 'duck') return duckSpot(world)
    return clothSpot(thing.id, world)
  }

  private park(thing: Thing): void {
    const at = this.restOf(thing)
    thing.x = at.x; thing.y = at.y
    thing.mode = 'home'
    thing.goal = thing.place
    thing.pouring = false
    thing.queued = false
  }

  /** Writes where a cloth is into the record. Only Teddy wears both: on anyone else the one that was there goes back to its own place. */
  private setCloth(id: ClothId, place: string): void {
    const other: ClothId = id === 'blanket' ? 'pyjamas' : 'blanket'
    if (place !== 'teddy' && place !== 'bed' && place !== 'peg' && this.rec[other] === place) {
      const home = other === 'blanket' ? 'bed' : 'peg'
      this.lifted(other, place)
      if (other === 'blanket') this.rec.blanket = 'bed'; else this.rec.pyjamas = 'peg'
      this.fly(this.things[other], home)
      this.say({ id: 'flutter' }, 'flutter')
    }
    if (id === 'blanket') this.rec.blanket = place as BlanketAt; else this.rec.pyjamas = place as PyjamasAt
  }

  /**
   * A wash thing whose work lies under what he wears sends the cloth back to its own place first, so no tap or
   * stroke is spent on a cloth and the room never asks for what cannot work: the soap for mud that is bare, the
   * jug for foam, the towel for water. Where its work shows (his head above the blanket), nothing is taken off.
   * Returns whether anything went.
   */
  private undress(id: WashId): boolean {
    const open = this.open()
    if (!open) return false
    const fur = this.fur
    const work = (i: number): boolean => (id === 'soap' ? fur.mud[i] >= SEEN && fur.foam[i] < 0.3 : id === 'jug' ? fur.foam[i] >= SEEN : fur.wet[i] >= SEEN)
    // Only the cloth the work lies under goes: pyjamas over a clean trunk stay on when the water is on his legs.
    const over = CLOTH_IDS.filter((cloth) => this.worn(cloth, 'teddy') && LIVE.some((i) => work(i) && coveredBy(cloth, cellX(i), cellY(i))))
    if (over.length === 0) return false
    for (const cloth of over) {
      const home = cloth === 'blanket' ? 'bed' : 'peg'
      this.lifted(cloth, 'teddy')
      this.setCloth(cloth, home)
      this.fly(this.things[cloth], home)
    }
    this.say({ id: 'flutter' }, 'flutter')
    this.changed = 2
    this.afterChange()
    return true
  }

  /** Sends a cloth through the air to rest at a place. It is drawn in the air until it is there. */
  private fly(thing: Thing, goal: string): void {
    thing.from = { x: thing.x, y: thing.y }
    thing.goal = goal
    const was = thing.place
    thing.place = goal
    thing.to = { ...this.restOf(thing) }
    thing.place = was
    thing.mode = goal === 'teddy' ? 'flying' : 'returning'
    thing.pouring = false
    thing.t = 0
  }

  /** A thing goes back to where it rests, making no move: a wash thing home, a cloth to where it was picked up. */
  private sendBack(thing: Thing): void {
    thing.pouring = false
    thing.from = { x: thing.x, y: thing.y }
    thing.goal = thing.place
    thing.to = { ...this.restOf(thing) }
    thing.mode = 'returning'
    thing.t = 0
  }

  /** A cloth was lifted off someone: the answer they were giving to it stops, so nothing plays on without its cause. */
  private lifted(id: ClothId, place: string): void {
    const stop = (actor: Actor, ...ids: ActId[]): void => { const holder = this.holder(actor); if (holder.act && ids.includes(holder.act.id)) holder.act = null }
    if (place === 'teddy') { stop('teddy', 'dress', 'wrap', 'wrapWet'); this.teddy.then = null }
    if (place === 'duck') stop('duck', 'tent', 'tuck', 'snore')
    if (place === 'tub') stop('duck', 'raft', 'dome')
    if (place === 'cat') stop('cat', 'lump')
    if (place === 'lamp') { stop('lamp', 'wear', 'glowTent'); stop('teddy', 'shadow'); this.teddy.shadowDue = false }
    void id
  }

  /** A cloth comes to rest on someone, and they answer it in their own way. */
  private land(thing: Thing, target: Wearer): void {
    const id = thing.id as ClothId
    thing.place = target
    this.park(thing)
    thing.squash.d = -6
    if (target === 'teddy') {
      if (id === 'pyjamas') this.start('teddy', 'dress')
      // Only water makes the blanket wet: foam alone under it is wrapped as dry fur is.
      else this.start('teddy', has(this.fur, 'wet') ? 'wrapWet' : 'wrap')
      this.teddy.bounce.d = 3
    } else if (target === 'duck') {
      this.start('duck', id === 'pyjamas' ? 'tent' : 'tuck')
      this.duck.snoreIn = 1.8
    } else if (target === 'cat') {
      if (id === 'pyjamas') this.catWalks(); else this.start('cat', 'lump')
    } else if (target === 'lamp') {
      this.start('lamp', id === 'pyjamas' ? 'wear' : 'glowTent')
      // He throws the ear shadows every time: at once, or as soon as he has finished what he is doing.
      if (id === 'blanket' && this.rec.phase === 'evening') this.teddy.shadowDue = true
    } else {
      this.start('duck', id === 'pyjamas' ? 'raft' : 'dome')
      this.duck.hop.d = -7
      this.duck.ripple = 0
    }
  }

  // --- Acts ---------------------------------------------------------------------

  private holder(actor: Actor): { act: Running | null } {
    return actor === 'teddy' ? this.teddy : actor === 'duck' ? this.duck : actor === 'cat' ? this.cat : actor === 'lamp' ? this.lampFx : this.tub
  }

  /** Starts an act. Its first sound is heard at once, inside the touch that caused it. */
  private start(actor: Actor, id: ActId): void {
    const holder = this.holder(actor)
    holder.act = { id, t: 0, next: 0 }
    this.cues(actor, holder.act)
  }

  private cues(actor: Actor, act: Running): void {
    const list = ACTS[act.id].cues
    while (act.next < list.length && list[act.next].at <= act.t) {
      this.say(list[act.next].sound, `act:${actor}`, act.id)
      this.cued(act.id, act.next)
      act.next += 1
    }
  }

  /** What a cue sets off besides its sound. */
  private cued(id: ActId, n: number): void {
    if (id === 'wig' && n === 1) this.bit('bubble', DUCK.x + 96, duckSpot(this.world()).y - 24, 90 + this.rng.next() * 60, -70, 0.9, 16)
    if (id === 'wrapWet' && n === 1) this.dripFromHem()
    if (id === 'dome' && n === 1) this.bit('bubble', DUCK.x + 20, TUB.water - 10, 10, -150, 1.1, 44)
    if (id === 'lump' && n === 2) this.cat.jump.d = -3
    if (id === 'shoot' && n === 0) { this.duck.ripple = 0; for (let k = 0; k < 6; k++) this.bit('drop', DUCK.x + (this.rng.next() - 0.5) * 60, TUB.water, (this.rng.next() - 0.5) * 260, -200 - this.rng.next() * 200, 0.7, 10) }
    if (id === 'drench' && n === 0) this.cat.jump.d = -6
    if (id === 'squirt' && n === 0) for (let k = 0; k < 6; k++) this.bit('drop', DUCK.x + 96, duckSpot(this.world()).y - 22, 20 + this.rng.next() * 70, -420 - this.rng.next() * 160, 0.8, 9)
  }

  private stepAct(actor: Actor, dt: number): void {
    const holder = this.holder(actor), act = holder.act
    if (!act) return
    act.t += dt
    this.cues(actor, act)
    if (act.t < ACTS[act.id].length) return
    holder.act = null
    // The towel's last stroke leaves it shining, back in the water.
    if (act.id === 'shoot') { this.duck.polish = 0; this.duck.rock.d = 4 }
    if (actor === 'teddy' && this.teddy.then) { const next = this.teddy.then; this.teddy.then = null; this.start('teddy', next) }
  }

  /** After anything that may have changed how sleepy he is: a wider yawn for each of the three that is newly true, and sleep when all are. */
  private afterChange(): void {
    if (this.rec.phase !== 'evening' || this.sceneId === 'asleep') return
    if (this.rec.blanket === 'teddy' && this.rec.lamp === 'down' && isDry(this.furAfterTaps())) { this.fallAsleep(); return }
    const now = this.sleepiness()
    if (now > this.sleepy && !(this.rec.blanket === 'teddy' && !isDry(this.fur))) {
      const id: ActId = now >= 2 ? 'yawn2' : 'yawn1'
      // A cloth still in the air to him lands first, and he yawns when it has: the yawn is seen for as long as it sounds.
      if (this.teddy.act === null && !this.arriving()) this.start('teddy', id); else this.teddy.then = id
      this.sinceYawn = 0
    }
    this.sleepy = now
  }

  // --- Time -------------------------------------------------------------------

  /** Plays `dt` seconds. A long frame is played in short steps, so a spring never overshoots itself on a slow device. */
  step(dt: number): void {
    if (!(dt > 0)) return
    const steps = Math.ceil(dt / STEP)
    for (let n = 0; n < steps; n++) this.advance(dt / steps)
  }

  private advance(dt: number): void {
    this.time += dt
    this.sinceStroke += dt; this.sinceVoice += dt; this.sinceHum += dt; this.sinceDamp += dt
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) { this.scene = null; this.sceneId = null }
    }
    let onHim = false
    this.stream = null
    for (const id of THING_IDS) onHim = this.stepThing(this.things[id], dt) || onHim
    for (const actor of ['teddy', 'duck', 'cat', 'lamp', 'tub'] as const) this.stepAct(actor, dt)
    this.stepTeddy(dt, onHim)
    this.stepOthers(dt)
    const env = this.env
    env.curtainAt = ease(env.curtainAt, env.curtainGoal, 5, dt)
    env.night = ease(env.night, env.nightGoal, 1.4, dt)
    env.morning = ease(env.morning, env.morningGoal, 1.6, dt)
    env.doorAt = ease(env.doorAt, env.doorGoal, 7, dt)
    settle(env.sway, 0, 60, 4, dt)
    for (const b of this.bits) {
      b.age += dt
      if (b.kind === 'smear' || b.kind === 'wipe' || b.kind === 'damp' || b.kind === 'gleam') continue
      b.vy += (b.kind === 'drop' ? 900 : b.kind === 'bubble' ? -40 : b.kind === 'puff' ? -30 : b.kind === 'steam' ? -60 : 120) * dt
      b.vx *= 1 - Math.min(1, dt * (b.kind === 'drop' ? 0.4 : 2.2))
      b.x += b.vx * dt; b.y += b.vy * dt
    }
    this.bits = this.bits.filter((b) => b.age < b.life && b.y < FLOOR_SPLASH + 40)
    // Dry by the shake or by a popped bubble as much as by the towel, in a step or under the finger between two
    // steps: the same check after every change.
    const dry = isDry(this.fur)
    if (dry !== this.wasDry) { this.wasDry = dry; this.afterChange() }
  }

  private stepThing(thing: Thing, dt: number): boolean {
    let onHim = false
    thing.t += dt
    settle(thing.squash, 0, 300, 14, dt)
    thing.print = Math.max(0, thing.print - dt * 0.6)
    const before = thing.x, beforeY = thing.y
    if (thing.mode === 'held' && this.finger) {
      thing.x = ease(thing.x, this.finger.x, 24, dt)
      thing.y = ease(thing.y, this.finger.y - RIDE, 24, dt)
    } else if (thing.mode === 'flying' || thing.mode === 'returning') {
      // A soaked towel is heavy and goes home slowly, dripping all the way.
      const length = (thing.mode === 'flying' ? FLY : BACK) * (thing.soaked > 0 ? 3.4 : 1), t = smooth(thing.t / length)
      thing.x = thing.from.x + (thing.to.x - thing.from.x) * t
      thing.y = thing.from.y + (thing.to.y - thing.from.y) * t - Math.sin(t * Math.PI) * (thing.soaked > 0 ? 20 : 70)
      if (thing.soaked > 0 && this.sinceDrip > 0.3) {
        this.sinceDrip = 0
        this.bit('drop', thing.x, thing.y + 50, 0, 60, 0.7, 10)
        this.say({ id: 'plip', v: this.next() }, 'towelDrip')
      }
      if (thing.t >= length) {
        thing.t = 0
        if (thing.mode === 'flying' && !isCloth(thing.id)) thing.mode = 'working'
        else if (thing.mode === 'flying') this.land(thing, 'teddy')
        else {
          thing.place = thing.goal
          this.park(thing)
          thing.squash.d = -6
          thing.soaked = 0
          this.say({ id: 'home', thing: thing.id }, 'landed')
        }
      }
    } else if (thing.mode === 'working') {
      const id = thing.id as WashId
      // Its work is done in dabs at fixed moments, so the coat comes out the same on a slow device as on a fast one.
      while (thing.dabs < DABS[id] && thing.dabs * DAB <= thing.t) {
        const did = dab(this.fur, id, thing.dabs, thing.to, this.open())
        thing.dabs += 1
        thing.x = did.at.x; thing.y = did.at.y
        if (did.changed) this.touchFur()
        if (id === 'jug') { thing.pouring = thing.dabs > 3 && thing.dabs < DABS.jug - 3; onHim = onHim || did.onHim } else this.rubbed(id, did.at, DAB * 1.8, 0.65, did)
      }
      if (id === 'jug' && thing.pouring) onHim = true
      if (thing.dabs >= DABS[id]) { thing.pouring = false; this.sendBack(thing) }
    } else if (thing.mode === 'waiting') {
      thing.y += Math.sin(this.time * 9) * 6 * dt
      // The cloth it waited for has landed: now it goes, and sends that cloth back first if its work is under it.
      if (thing.queued && !this.arriving()) { this.changed = 2; this.send(thing) }
    }
    // How fast the jug is carried, from still to a quick sweep, for the voice of its water.
    if (thing.id === 'jug') this.jugPace = ease(this.jugPace, Math.min(1, Math.hypot(thing.x - before, thing.y - beforeY) / dt / 900), 10, dt)
    this.sinceDrip += thing.id === 'towel' ? dt : 0
    // It swings behind the way it is going, and a jug that pours tips toward what it is over.
    const swing = Math.max(-0.5, Math.min(0.5, ((thing.x - before) / dt) * -0.0009))
    if (thing.id === 'jug' && !thing.pouring) thing.side = thing.mode === 'home' || thing.mode === 'returning' || thing.x < TEDDY.x ? 1 : -1
    const side = thing.side
    thing.tilt = ease(thing.tilt, thing.pouring ? side * 1.05 : swing, 12, dt)
    if (thing.id === 'jug' && thing.pouring && Math.abs(thing.tilt) > 0.7) onHim = this.water(thing, side, dt, thing.mode === 'working') || onHim
    return onHim
  }

  // --- The grid: a thing used on someone ------------------------------------------

  /** Counts rubbing toward the next stroke, and says when one is due. */
  private strokeDue(amount: number): boolean {
    this.strokeDist += amount
    if (this.strokeDist <= 0.55 || this.sinceStroke <= 0.09) return false
    this.strokeDist = 0
    this.sinceStroke = 0
    return true
  }

  /** Soap or towel dragged at a stage point. `amount` is how much rubbing, `speed` how fast the hand goes. */
  private rub(id: 'soap' | 'towel', at: Point, amount: number, speed: number): void {
    let world = this.world()
    const p = toBear(at)
    let target = targetAt(at, world)
    // Rubbed on a cloth he wears, with its work under the cloth, it sends the cloth off first.
    if (target === 'teddy' && this.hidden(target, p) && this.undress(id)) world = this.world()
    const open = this.open()
    // Whoever wears a cloth is reached where they show: on the cloth the thing rubs the cloth, as it would the wall.
    if (target !== null && this.hidden(target, p)) target = null
    if (target === 'teddy') {
      if (id === 'soap') {
        const added = soap(this.fur, p.x, p.y, amount, open)
        if (added > 0) this.touchFur()
        this.rubbed('soap', at, amount, speed, { fluff: 0, mud: 0 })
      } else {
        const out = towel(this.fur, p.x, p.y, amount, open)
        if (out.fluff > 0 || out.dried > 0) this.touchFur()
        this.rubbed('towel', at, amount, speed, out)
      }
      return
    }
    if (!this.strokeDue(amount)) {
      if (id === 'towel' && target === 'lamp') { this.lampFx.rubbed = 1; this.lampFx.sinceRub = 0 }
      return
    }
    if (target === 'duck') this.onDuck(id)
    else if (target === 'cat') this.onCat(id)
    else if (target === 'lamp') this.onLamp(id)
    else if (target === 'tub') this.inBath(id)
    else {
      // Anywhere else it still works as itself and leaves nothing behind: a streak that fades.
      this.say({ id: 'stroke', thing: id, speed, v: this.next() }, 'stroke')
      this.bit(id === 'soap' ? 'smear' : 'wipe', at.x, at.y - RIDE * 0.4, 0, 0, 1.3, 46)
    }
  }

  /** What soap or towel does to Teddy himself, beyond his coat: his face, his voice, the bubble, the fluff. */
  private rubbed(id: 'soap' | 'towel', at: Point, amount: number, speed: number, did: { fluff: number; mud: number }): void {
    const p = toBear(at), teddy = this.teddy
    if (this.strokeDue(amount)) this.say({ id: 'stroke', thing: id, speed, v: this.next() }, 'stroke')
    if (id === 'soap') {
      if (teddy.cross < 0.2 && this.sinceVoice > 1.6) { this.sinceVoice = 0; this.say({ id: 'giggle', v: this.next() }, 'cross') }
      teddy.cross = 1
      // Near his nose the soap blows a bubble there, which swells until it bursts in a sneeze.
      if (teddy.bubbleRest <= 0 && Math.hypot(p.x - MUZZLE.x, p.y - MUZZLE.y) < 150) {
        teddy.bubble += amount * 0.55
        if (teddy.bubble >= 1) this.sneeze()
      }
      return
    }
    teddy.bliss = 1
    // On mud the towel leaves the mud and takes a brown print, which fades.
    if (did.mud > 0.02) this.things.towel.print = 1
    this.fluffUp += did.fluff
    if (this.fluffUp > 1.1) {
      this.fluffUp = 0
      this.bit('puff', at.x + (this.rng.next() - 0.5) * 70, at.y + (this.rng.next() - 0.5) * 50, (this.rng.next() - 0.5) * 70, -50, 0.75, 30 + this.rng.next() * 16)
      this.say({ id: 'puff', v: this.next() }, 'bits')
    }
  }

  private setDuck(coat: DuckCoat): void {
    if (this.rec.duck !== coat) this.changed = 2
    this.rec.duck = this.show.duck = coat
  }

  private setCat(coat: CatCoat): void {
    if (this.rec.cat !== coat) this.changed = 2
    this.rec.cat = this.show.cat = coat
    this.cat.rubs = 0
  }

  private setShade(shade: Shade): void {
    if (this.rec.shade !== shade) this.changed = 2
    this.rec.shade = this.show.shade = shade
  }

  private setSuds(suds: number): void {
    const to = Math.min(MOST_SUDS, Math.max(0, suds))
    if (this.rec.suds !== to) this.changed = 2
    this.rec.suds = this.show.suds = to
  }

  private running(actor: Actor, id: ActId, until = Infinity): boolean {
    const act = this.holder(actor).act
    return act !== null && act.id === id && act.t < until
  }

  /** One stroke of the soap or the towel on the duck. Under a cloth the duck is not reached. */
  private onDuck(id: 'soap' | 'towel'): void {
    const duck = this.duck
    if (this.running('duck', 'shoot')) return
    if (id === 'soap') {
      // A wig of foam piles up on its head, and it blows a bubble out of its beak at each rub.
      this.setDuck('foam')
      duck.polish = 0
      if (!this.running('duck', 'wig', 0.6)) this.start('duck', 'wig')
      return
    }
    // Each stroke polishes it, with squeaks that climb, until it shoots out from under the towel.
    this.setDuck('shine')
    duck.gleam = 1
    duck.polish += 1
    this.say({ id: 'polish', step: duck.polish }, 'duckGleam')
    this.bit('gleam', DUCK.x + 6 + (this.rng.next() - 0.5) * 60, duckSpot(this.world()).y - 6 + (this.rng.next() - 0.5) * 40, 0, 0, 0.5, 30)
    if (duck.polish >= 4) this.start('duck', 'shoot')
  }

  /** One stroke of the soap or the towel on the cat. */
  private onCat(id: 'soap' | 'towel'): void {
    const cat = this.cat
    if (id === 'soap') {
      this.setCat('foam')
      if (!this.running('cat', 'lick')) this.start('cat', 'lick')
      return
    }
    if (this.show.cat === 'wet') {
      // A wet cat is rubbed, stroke by stroke, into a ball of fluff.
      cat.rubs += 1
      cat.rubbed = 1
      this.say({ id: 'crackleFur', v: this.next() }, 'catRub')
      if (cat.rubs >= 3) { this.setCat('fluff'); this.start('cat', 'ball') }
      return
    }
    // A dry cat rolls over under it and pedals its hind legs. Foam is wiped off on the way.
    if (this.show.cat === 'foam') this.setCat('plain')
    if (!this.running('cat', 'roll', 1.2)) this.start('cat', 'roll')
  }

  /** One stroke of the soap or the towel on the lamp's shade. */
  private onLamp(id: 'soap' | 'towel'): void {
    if (id === 'soap') {
      this.setShade('foam')
      if (!this.running('lamp', 'lather', 0.4)) this.start('lamp', 'lather')
      return
    }
    // The room goes dim and towel-coloured while it rubs; the flare comes when it stops.
    this.setShade('plain')
    this.lampFx.rubbed = 1
    this.lampFx.sinceRub = 0
    this.say({ id: 'glassRub', v: this.next() }, 'lampRub')
  }

  /** One stroke of the soap or the towel in the bath. */
  private inBath(id: 'soap' | 'towel'): void {
    if (id === 'soap') {
      if (this.running('tub', 'suds', 0.6)) return
      this.setSuds(this.show.suds + 1)
      this.start('tub', 'suds')
      return
    }
    const towel = this.things.towel
    if (towel.soaked > 0) return
    // It comes out soaked and heavy, and drips all the way home.
    towel.soaked = 1
    this.start('tub', 'soak')
    this.duck.rock.d = 3
  }

  /** The jug's water: straight down from the spout onto whoever is under it. `tapped` is the jug doing a tap's work, whose pouring is in its dabs. */
  private water(jug: Thing, side: number, dt: number, tapped: boolean): boolean {
    // Where the tipped spout's lip is.
    const x = jug.x + side * 62, top = jug.y + 26
    const world = this.world(), landing = landingOf(x, top, world)
    // On a cloth the water runs off as it does off the floor.
    if (landing.on !== 'floor' && landing.on !== 'teddy' && this.hidden(landing.on, { x: 0, y: 0 })) landing.on = 'floor'
    this.stream = { x, top, bottom: landing.y, on: landing.on }
    if (this.rng.next() < dt * 26) this.bit('drop', x + (this.rng.next() - 0.5) * 30, landing.y, (this.rng.next() - 0.5) * 260, -120 - this.rng.next() * 200, 0.55, 9 + this.rng.next() * 6)
    const due = this.sinceStroke > 0.17
    if (landing.on === 'teddy') {
      this.undress('jug')
      if (!tapped) {
        const off = pour(this.fur, x - TEDDY.x, landing.y - TEDDY.y - 20, dt * 1.5, this.open())
        if (off.cells > 0) this.touchFur()
        if (off.foam > 0.04 && this.rng.next() < 0.5) this.bit('bubble', x + (this.rng.next() - 0.5) * 80, TEDDY.y - 40 - this.rng.next() * 200, (this.rng.next() - 0.5) * 60, 120, 0.6, 12)
      }
      if (due) { this.sinceStroke = 0; this.say({ id: 'stroke', thing: 'jug', speed: this.jugPace, v: this.next() }, 'water') }
      return true
    }
    if (landing.on === 'duck') {
      // The water drums on it and it spins under the stream. Its wig, or its shine, is rinsed off.
      const duck = this.duck
      if (this.show.duck !== 'plain') this.setDuck('plain')
      duck.polish = 0
      duck.soaked += dt
      duck.sinceWater = 0
      if (due) { this.sinceStroke = 0; this.say({ id: 'patter', v: this.next() }, 'duckSpin') }
    } else if (landing.on === 'cat') {
      // One pour and the cat is thin, spiky and dripping.
      if (this.show.cat !== 'wet') this.setCat('wet')
      this.cat.sinceWater = 0
      if (!this.running('cat', 'drench')) this.start('cat', 'drench')
    } else if (landing.on === 'lamp') {
      // The water hisses on the warm shade, and washes foam off it.
      this.setShade('plain')
      if (!this.running('lamp', 'steam')) this.start('lamp', 'steam')
    } else if (landing.on === 'tub') {
      // It pours back into the bath: the gurgle rises as it fills.
      const tub = this.tub
      tub.pour += dt
      tub.sincePour = 0
      this.duck.ripple = Math.min(this.duck.ripple, 0.5)
      if (due) { this.sinceStroke = 0; tub.step += 1; this.say({ id: 'fill', step: tub.step }, 'tubPour') }
    } else {
      // On the floor or the bed it runs down and dries.
      if (due) { this.sinceStroke = 0; this.say({ id: 'stroke', thing: 'jug', speed: 0.5, v: this.next() }, 'water') }
      if (this.sinceDamp > 0.2) { this.sinceDamp = 0; this.bit('damp', x + (this.rng.next() - 0.5) * 30, landing.y + 8, 0, 0, 1.6, 50) }
    }
    return false
  }

  private sneeze(): void {
    const teddy = this.teddy, x = TEDDY.x + MUZZLE.x, y = TEDDY.y + MUZZLE.y
    teddy.bubble = 0; teddy.bubbleRest = 2.4; teddy.sneeze = 0.7; teddy.nod.d = 5; teddy.bounce.d = 4
    for (let n = 0; n < 10; n++) {
      const a = -Math.PI * (0.1 + 0.8 * this.rng.next()), speed = 260 + this.rng.next() * 320
      this.bit('bubble', x, y, Math.cos(a) * speed, Math.sin(a) * speed * 0.8, 0.9 + this.rng.next() * 0.5, 10 + this.rng.next() * 12)
    }
    this.cat.jump.d = -3
    this.say({ id: 'pop', v: this.next() }, 'sneeze')
    this.say({ id: 'sneeze' }, 'sneeze')
  }

  private shakeOff(): void {
    const teddy = this.teddy
    teddy.soaked = 0; teddy.shake = 0.95
    shakeFur(this.fur)
    this.touchFur()
    for (let n = 0; n < 18; n++) {
      const a = this.rng.next() * Math.PI * 2, speed = 320 + this.rng.next() * 420
      this.bit('drop', TEDDY.x + Math.cos(a) * 130, TEDDY.y - 250 + Math.sin(a) * 170, Math.cos(a) * speed, Math.sin(a) * speed - 160, 0.9, 9 + this.rng.next() * 7)
    }
    // The drops fly as far as the bed and the bath: the cat jumps and puffs up, the duck rocks.
    this.cat.jump.d = -9; this.cat.puff = 1
    this.duck.rock.d = 5; this.duck.ripple = 0
    this.say({ id: 'shake' }, 'shake')
    this.say({ id: 'mew' }, 'catJump')
  }

  private dripFromHem(): void {
    this.bit('drop', TEDDY.x - 120 + this.rng.next() * 240, TEDDY.y - 24, 0, 30, 0.5, 10)
  }

  /** Whether someone is under a cloth where a thing would touch them. `p` is the point in Teddy's own units, used for him alone. */
  private hidden(target: Wearer, p: Point): boolean {
    if (target === 'teddy') return !reachable(p.x, p.y, { blanket: this.worn('blanket', 'teddy') ? 'teddy' : 'bed', pyjamas: this.worn('pyjamas', 'teddy') ? 'teddy' : 'peg' })
    if (target === 'duck') return this.worn('pyjamas', 'duck') || this.worn('blanket', 'duck')
    if (target === 'cat') return this.worn('blanket', 'cat')
    if (target === 'lamp') return this.worn('pyjamas', 'lamp') || this.worn('blanket', 'lamp')
    return false
  }

  // --- Everyone, as time passes ---------------------------------------------------

  private stepTeddy(dt: number, water: boolean): void {
    const teddy = this.teddy, awake = this.rec.phase === 'evening' && this.sceneId !== 'asleep'
    const dry = isDry(this.fur), tucked = this.worn('blanket', 'teddy'), dark = this.show.lamp === 'down'
    settle(teddy.lean, teddy.bliss * 0.07 - teddy.squirm * Math.sin(this.time * 21) * 0.09, 120, 9, dt)
    settle(teddy.bounce, 0, 240, 10, dt)
    settle(teddy.nod, teddy.bliss * 0.12 + teddy.squirm * 0.04, 150, 10, dt)
    const want = this.held ?? this.want
    const up = during(teddy.act, 'dress', 0, 1.1) || during(teddy.act, 'shadow', 0.3, 3) || teddy.stretch > 0.2
    // Under the jug he wriggles on the spot with his paws at his sides: he never shields himself. Left alone he
    // holds a paw out toward the thing his coat asks for.
    const reach = awake && this.held === null && teddy.shake <= 0 && (want === 'soap' || want === 'jug' || want === 'towel') ? 0.42 + Math.sin(this.time * 1.7) * 0.06 : 0
    // The paw he holds out is the one nearer the thing.
    const left = reach > 0 && this.restOf(this.things[want as WashId]).x < TEDDY.x
    settle(teddy.armL, up ? 1 : teddy.squirm > 0.3 ? 0.16 + Math.sin(this.time * 19) * 0.1 : left ? reach : 0, 110, 9, dt)
    settle(teddy.armR, up ? 1 : teddy.squirm > 0.3 ? 0.16 - Math.sin(this.time * 19) * 0.1 : Math.max(teddy.tickle * 0.3, left ? 0 : reach), 110, 9, dt)
    if (water && awake) {
      if (teddy.soaked === 0 || this.sinceVoice > 0.85) { this.sinceVoice = 0; this.say({ id: 'shudder', v: this.next() }, 'squirm') }
      teddy.squirm = 1; teddy.soaked += dt; teddy.sinceWater = 0
    } else {
      teddy.sinceWater += dt
      teddy.squirm = ease(teddy.squirm, 0, 5, dt)
      // The water stopped: once he is sure of it, he shakes himself and sprays the room.
      if (awake && teddy.soaked > 0.3 && teddy.sinceWater > 0.28) this.shakeOff()
    }
    if (teddy.shake > 0) teddy.shake = Math.max(0, teddy.shake - dt)
    teddy.sneeze = Math.max(0, teddy.sneeze - dt); teddy.bubbleRest = Math.max(0, teddy.bubbleRest - dt)
    teddy.cross = ease(teddy.cross, 0, 2.2, dt); teddy.tickle = ease(teddy.tickle, 0, 2.6, dt)
    // A bubble the soap has left shrinks away by itself, and water bursts it at once.
    if (teddy.cross < 0.3) teddy.bubble = Math.max(0, teddy.bubble - dt * (water ? 6 : 0.35))
    if (teddy.bliss > 0.5 && this.sinceHum > 0.36) {
      this.sinceHum = 0
      // The hum climbs for as long as the towel stays on him, and his foot thumps on every other beat.
      this.say({ id: 'hum', step: this.humStep }, 'bliss')
      // His foot goes up on one beat and comes down on the next, where the thump is heard.
      if (this.humStep % 2 === 1) { teddy.bounce.d = 1.6; teddy.thump = 0; teddy.stamp = 1; this.say({ id: 'thump' }, 'thump') } else teddy.thump = 1
      this.humStep += 1
    }
    if (teddy.bliss < 0.1) this.humStep = 0
    teddy.bliss = ease(teddy.bliss, 0, 2.4, dt)
    teddy.thump = Math.max(0, teddy.thump - dt / 0.36); teddy.stamp = Math.max(0, teddy.stamp - dt * 5)

    // What keeps him from sleep shows on him, in the place where the reason is.
    // The shiver is for water under the blanket. Foam alone is not wet: no shiver, no drops from the hem, no drip.
    teddy.shiver = ease(teddy.shiver, awake && tucked && has(this.fur, 'wet') ? 1 : 0, 4, dt)
    teddy.peep = ease(teddy.peep, awake && tucked && dry && !dark ? 1 : 0, 3, dt)
    teddy.hug = ease(teddy.hug, awake && dry && dark && this.rec.blanket !== 'teddy' && this.held === null ? 1 : 0, 3, dt)
    teddy.pluck = ease(teddy.pluck, awake && !tucked && !dry && this.worn('pyjamas', 'teddy') ? 1 : 0, 3, dt)
    teddy.wink = ease(teddy.wink, awake && !this.busy && this.want === 'jug' ? 1 : 0, 4, dt)
    this.sinceDrip2 += dt
    if (teddy.shiver > 0.6 && teddy.act === null && this.sinceDrip2 > 1.4) {
      this.sinceDrip2 = 0
      this.dripFromHem()
      this.say({ id: 'drip', v: this.next() }, 'shiver')
    }
    // The blanket landed on the lamp while he was doing something else: the ear shadows come when he has finished.
    if (teddy.shadowDue && !this.worn('blanket', 'lamp')) teddy.shadowDue = false
    if (teddy.shadowDue && awake && this.sceneId === null && teddy.act === null && teddy.then === null) { teddy.shadowDue = false; this.start('teddy', 'shadow') }
    // Clean, dry and left alone, he yawns toward the bed now and then, quietly.
    this.sinceYawn += dt
    if (awake && this.sceneId === null && dry && !has(this.fur, 'mud') && this.finger === null && teddy.act === null && this.sinceYawn > 11) { this.sinceYawn = 0; this.start('teddy', 'yawnIdle') }
    teddy.blink -= dt
    if (teddy.blink < -0.13) teddy.blink = 1.8 + this.rng.next() * 3.2
    teddy.lookAt = Math.max(0, teddy.lookAt - dt)
    // His eyes follow the finger or the thing in the air; left alone they go to what he wants.
    const moving = THING_IDS.map((id) => this.things[id]).find((thing) => thing.mode !== 'home')
    const wanted = want === null ? { x: TEDDY.x, y: TEDDY.y - 250 } : want === 'lamp' ? LAMP : want === 'curtain' || want === 'door' ? { x: TEDDY.x + Math.sin(this.time * 0.5) * 300, y: 420 } : this.restOf(this.things[want])
    const target = this.finger ?? (moving ? { x: moving.x, y: moving.y } : teddy.lookAt > 0 || teddy.peep > 0.5 ? LAMP : teddy.hug > 0.5 ? this.restOf(this.things.blanket) : wanted)
    teddy.look.x = ease(teddy.look.x, target.x, 7, dt); teddy.look.y = ease(teddy.look.y, target.y, 7, dt)
  }

  private stepOthers(dt: number): void {
    const duck = this.duck, cat = this.cat, lamp = this.lampFx, tub = this.tub, TAU = Math.PI * 2
    settle(duck.squash, 0, 260, 11, dt); settle(duck.rock, 0, 40, 3.2, dt); settle(duck.hop, 0, 120, 8, dt)
    duck.ripple += dt
    duck.gleam = ease(duck.gleam, 0, 3, dt)
    // The wig piles up by itself once the soap has been there, until it slides over its eyes.
    duck.wig = ease(duck.wig, this.show.duck === 'foam' ? 1 : 0, this.show.duck === 'foam' ? 1.3 : 6, dt)
    duck.sinceWater += dt
    if (duck.sinceWater < 0.2) duck.spin += dt * 10
    else duck.spin = ease(duck.spin, Math.round(duck.spin / TAU) * TAU, 7, dt)
    // The water stopped: it squirts a jet back up out of its beak.
    if (duck.soaked > 0.2 && duck.sinceWater > 0.28) { duck.soaked = 0; this.start('duck', 'squirt') } else if (duck.sinceWater > 0.28) duck.soaked = 0
    // Tucked in with the lamp down it is asleep, and snores in squeaks.
    if (this.worn('blanket', 'duck') && this.show.lamp === 'down' && duck.act === null) {
      duck.snoreIn -= dt
      if (duck.snoreIn <= 0) { duck.snoreIn = 3.6; this.start('duck', 'snore') }
    }

    settle(cat.jump, 0, 170, 12, dt)
    cat.arch = ease(cat.arch, 0, 1.4, dt); cat.puff = ease(cat.puff, 0, 0.9, dt); cat.swat = Math.max(0, cat.swat - dt); cat.rubbed = ease(cat.rubbed, 0, 3, dt)
    cat.sinceWater += dt
    // A wet cat drips for a while.
    if (this.show.cat === 'wet' && cat.sinceWater < 2.6 && this.rng.next() < dt * 5) this.bit('drop', cat.x + (this.rng.next() - 0.5) * 70, CAT.y + 20, 0, 40, 0.5, 8)

    settle(lamp.swing, 0, 90, 5, dt)
    lamp.sinceRub += dt
    // The towel has let go of the shade: it flares brighter for a moment.
    if (lamp.sinceRub > 0.25 && lamp.rubbed > 0) { lamp.rubbed = 0; this.start('lamp', 'flare') }
    if (during(lamp.act, 'steam') && this.rng.next() < dt * 16) this.bit('steam', LAMP.x + (this.rng.next() - 0.5) * 90, LAMP.y - 30, (this.rng.next() - 0.5) * 40, -90 - this.rng.next() * 60, 1.4, 34 + this.rng.next() * 20)

    tub.sincePour += dt
    if (tub.sincePour > 0.3 && tub.pour > 0) {
      // The pour is over: the water rocks, the duck rides the wave, and the suds go down a step.
      if (tub.pour > 0.25) { this.setSuds(this.show.suds - 1); this.start('tub', 'slosh'); duck.rock.d = 7; duck.hop.d = -5; duck.ripple = 0 }
      tub.pour = 0; tub.step = 0
    }
    tub.sudsAt = ease(tub.sudsAt, this.show.suds, 4, dt)
  }

  // --- The scenes -------------------------------------------------------------------

  private play(id: SceneId, beats: Beat[]): void {
    this.scene = new Scene(beats)
    this.sceneId = id
    // The outcome is in the record already, and the Mount saves it at once.
    this.scene.start(this.time, () => { this.changed = 2 })
  }

  /** A touch ends a scene: every beat lands where it was going, without its sounds, and everything in the air comes to rest. */
  private endScene(): void {
    if (!this.scene) return
    this.scene.finish()
    this.scene = null
    this.sceneId = null
    const env = this.env
    env.curtainAt = env.curtainGoal; env.night = env.nightGoal; env.morning = env.morningGoal; env.doorAt = env.doorGoal
    this.teddy.act = null; this.teddy.then = null; this.teddy.shadowDue = false
    for (const id of THING_IDS) {
      const thing = this.things[id]
      if (thing.mode === 'home') continue
      if (!isCloth(id) && thing.goal === 'teddy') {
        for (let k = thing.dabs; k < DABS[id]; k++) dab(this.fur, id, k, thing.to, this.open())
        this.furVersion += 1
      }
      thing.place = isCloth(id) ? thing.goal : 'home'
      thing.soaked = 0
      this.park(thing)
    }
    this.held = null
    this.sleepy = this.sleepiness()
  }

  /** The ending: dry, under the blanket and in the dark, he goes to bed. Its end is in the record from this moment. */
  private fallAsleep(): void {
    // The finger that did it lets go first.
    const inHand = this.held ? this.things[this.held] : null
    this.held = null
    this.rubbing = false
    if (inHand) this.sendBack(inHand)
    const wasOpen = this.rec.curtain === 'open', teddy = this.teddy, cat = this.cat, env = this.env, catFrom = cat.x
    this.rec = { ...finishCycle(this.rec, 'mixed'), phase: 'night', curtain: 'closed' }
    const say = (finishing: boolean, sound: Sound, by: Channel): void => { if (!finishing) this.say(sound, by) }
    const hop = (t: number): Beat => at(t, (finishing) => say(finishing, { id: 'shuffle', v: this.next() }, 'walk'))
    this.play('asleep', [
      // His widest yawn, as soon as the blanket is on him.
      at(0, (finishing) => { if (finishing) return; if (this.things.blanket.mode === 'home' && teddy.act === null) this.start('teddy', 'yawn3'); else teddy.then = 'yawn3' }),
      over(1.4, 4, (p) => { teddy.stance = between(SITTING, BEDSIDE, smooth(p)); teddy.walk = p < 1 ? 1 : 0; teddy.hop = p < 1 ? Math.abs(Math.sin(p * Math.PI * 4)) * 18 : 0 }),
      hop(1.5), hop(2.15), hop(2.8), hop(3.45),
      over(4, 4.9, (p) => {
        teddy.stance = between(BEDSIDE, LYING, smooth(p))
        teddy.stance.y -= Math.sin(p * Math.PI) * 70
        teddy.lying = p > 0.6 ? 1 : 0
        // The cat hops out of his way, to the foot of the bed.
        cat.x = lerp(catFrom, CAT_NIGHT_X, smooth(p))
        cat.jump.v = p < 1 ? -Math.sin(p * Math.PI) * 1.6 : 0
      }),
      at(4.9, (finishing) => { teddy.bounce.d = finishing ? 0 : 6; say(finishing, { id: 'flop' }, 'bounce') }),
      // The cat pulls the curtain to with one paw, if it is open.
      over(5.2, 6.2, (p) => { if (!wasOpen) return; cat.paw = p < 1 ? Math.sin(p * Math.PI) : 0; if (p > 0.4) env.curtainGoal = 0 }),
      at(5.6, (finishing) => { if (wasOpen) say(finishing, { id: 'swishShut' }, 'curtain') }),
      at(6.2, (finishing) => { env.nightGoal = 1; say(finishing, { id: 'nightlight' }, 'night') }),
      over(6.2, 8, () => {}),
    ])
  }

  /** The curtain is pulled open while he sleeps: morning, and out he goes. */
  private goOut(): void {
    const teddy = this.teddy, cat = this.cat, env = this.env, next = nextMud(this.rec.stream, this.rec.mudPlaces)
    this.furAhead = freshFur(next.places)
    this.rec = { ...this.rec, phase: 'morning', curtain: 'open', mudPlaces: next.places, stream: next.stream, blanket: 'bed', pyjamas: 'peg', duck: 'plain', cat: 'plain', shade: 'plain', suds: 0 }
    const say = (finishing: boolean, sound: Sound, by: Channel): void => { if (!finishing) this.say(sound, by) }
    const home = (id: ClothId, finishing: boolean): void => {
      const thing = this.things[id], to = id === 'blanket' ? 'bed' : 'peg'
      if (thing.place === to && thing.mode === 'home') return
      this.lifted(id, thing.place)
      this.fly(thing, to)
      say(finishing, { id: 'flutter' }, 'flutter')
    }
    this.play('garden', [
      at(0, (finishing) => { env.curtainGoal = 1; env.sway.d = 3; say(finishing, { id: 'swishOpen' }, 'curtain') }),
      over(0, 1, () => { env.morningGoal = 1; env.nightGoal = 0 }),
      // The morning finds everyone as they began: the wig, the suds and the fluff are gone, and the cloths that were lent out go home.
      at(1, (finishing) => {
        if (!finishing) {
          if (this.show.duck !== 'plain') this.puffs(DUCK.x, DUCK.y - 30)
          if (this.show.cat !== 'plain') this.puffs(cat.x, CAT.y)
          if (this.show.suds > 0) this.puffs(DUCK.x + 60, TUB.water - 20)
          if (this.show.shade !== 'plain') this.puffs(LAMP.x, LAMP.y)
        }
        this.show.duck = 'plain'; this.show.cat = 'plain'; this.show.shade = 'plain'; this.show.suds = 0
        for (const id of ['pyjamas', 'blanket'] as const) if (this.things[id].place !== 'teddy') home(id, finishing)
        say(finishing, { id: 'stretch' }, 'stretch')
      }),
      over(1, 1.8, (p) => { teddy.stretch = p < 1 ? Math.max(0.05, Math.sin(p * Math.PI)) : 0 }),
      // He slides out of bed and out of his pyjamas.
      at(1.8, (finishing) => { teddy.lying = 0; home('blanket', finishing); home('pyjamas', finishing) }),
      over(1.8, 2.6, (p) => {
        teddy.stance = between(LYING, BEDSIDE, smooth(p))
        cat.x = lerp(CAT_NIGHT_X, CAT.x, smooth(p))
        cat.jump.v = p < 1 ? -Math.sin(p * Math.PI) * 1.6 : 0
      }),
      over(2.6, 3.4, (p) => { teddy.stance = between(BEDSIDE, AT_DOOR, smooth(p)); teddy.walk = p < 1 ? 1 : 0; teddy.hop = p < 1 ? Math.abs(Math.sin(p * Math.PI * 2)) * 16 : 0 }),
      at(2.7, (finishing) => say(finishing, { id: 'shuffle', v: this.next() }, 'walk')),
      at(3.1, (finishing) => say(finishing, { id: 'shuffle', v: this.next() }, 'walk')),
      // The door swings and he is out.
      at(3.4, (finishing) => { env.doorGoal = 1; say(finishing, { id: 'door' }, 'door') }),
      over(3.9, 4.5, (p) => { teddy.stance = between(AT_DOOR, THROUGH, smooth(p)); teddy.through = 1 }),
      at(4.5, () => {
        // Out of sight, the new mud is on him.
        if (this.furAhead) { for (const layer of ['mud', 'foam', 'wet', 'fluff'] as const) this.fur[layer].splice(0, CELLS, ...this.furAhead[layer]); this.furAhead = null; this.furVersion += 1 }
        env.doorGoal = 0
        teddy.through = 0; teddy.outside = 1
        teddy.stance = { ...IN_GARDEN }
      }),
      // Through the glass he jumps in a puddle.
      over(4.9, 6, (p) => { teddy.puddle = p < 1 ? 1 : 0; teddy.stance = { ...IN_GARDEN, y: IN_GARDEN.y - (p < 1 ? Math.abs(Math.sin(p * Math.PI * 3)) * 26 : 0) } }),
      at(5.26, (finishing) => say(finishing, { id: 'puddle', v: 0 }, 'puddle')),
      at(5.62, (finishing) => say(finishing, { id: 'puddle', v: 1 }, 'puddle')),
      at(5.95, (finishing) => say(finishing, { id: 'puddle', v: 2 }, 'puddle')),
      // And comes back to the glass with his nose and his muddiest paw flat on it.
      over(6, 7, (p) => { teddy.stance = between(IN_GARDEN, AT_GLASS, smooth(p)); teddy.pressed = p }),
    ])
  }

  /** The door is touched in the morning: he comes in, sits down, and the day goes. */
  private comeIn(): void {
    const teddy = this.teddy, env = this.env
    this.rec = { ...beginCycle(this.rec), phase: 'evening', lamp: 'up' }
    const say = (finishing: boolean, sound: Sound, by: Channel): void => { if (!finishing) this.say(sound, by) }
    const hop = (t: number): Beat => at(t, (finishing) => say(finishing, { id: 'shuffle', v: this.next() }, 'walk'))
    this.play('comingIn', [
      at(0, (finishing) => { env.doorGoal = 1; teddy.pressed = 0; teddy.outside = 0; teddy.through = 1; say(finishing, { id: 'door' }, 'door') }),
      over(0, 0.6, (p) => { teddy.stance = between(AT_GLASS, THROUGH, smooth(p)) }),
      over(0.6, 2.6, (p) => { teddy.stance = between(THROUGH, SITTING, smooth(p)); teddy.through = p < 0.25 ? 1 : 0; teddy.walk = p < 1 ? 1 : 0; teddy.hop = p < 1 ? Math.abs(Math.sin(p * Math.PI * 3)) * 18 : 0 }),
      hop(1), hop(1.6), hop(2.2),
      at(1.8, () => { env.doorGoal = 0 }),
      // He sits down in the middle with a bump.
      at(2.6, (finishing) => { teddy.bounce.d = finishing ? 0 : 7; say(finishing, { id: 'sitBump' }, 'bounce') }),
      // Outside the sun slides behind the hill, and the lamp's halo grows.
      over(3.2, 5, () => { env.morningGoal = 0 }),
      at(4, (finishing) => { if (this.show.lamp === 'up') return; if (finishing) this.show.lamp = 'up'; else this.turnLamp('up') }),
    ])
    this.sleepy = this.sleepiness()
  }

  /** The secret: the cat in the pyjamas walks off stiff behind the bed, and comes back to sit in them. */
  private catWalks(): void {
    const cat = this.cat, night = this.rec.phase === 'night', home = night ? CAT_NIGHT_X : CAT.x
    const say = (finishing: boolean, sound: Sound): void => { if (!finishing) this.say(sound, 'catStiff') }
    const step = (t: number): Beat => at(t, (finishing) => say(finishing, { id: 'step', v: this.next() }))
    // In the evening it walks along the bed, goes behind it at the head end and comes back round the foot end.
    // While Teddy sleeps there the bed is taken, so it goes behind it where it sits and comes up there again.
    const route: Beat[] = night
      ? [over(0.8, 1.2, (p) => { cat.sunk = p }), over(1.2, 2.4, (p) => { cat.x = lerp(home, 1040, smooth(p)) }), over(2.4, 3.6, (p) => { cat.x = lerp(1040, home, smooth(p)) }), over(3.6, 4, (p) => { cat.sunk = 1 - p })]
      : [over(0.8, 1.6, (p) => { cat.x = lerp(home, 1040, smooth(p)) }), over(1.6, 1.9, (p) => { cat.sunk = p }), over(1.9, 3.3, (p) => { cat.x = lerp(1040, 822, smooth(p)) }), over(3.3, 3.7, (p) => { cat.sunk = 1 - p }), over(3.7, 4.5, (p) => { cat.x = lerp(822, home, smooth(p)) })]
    this.play('catWalk', [
      at(0, (finishing) => { cat.stiff = 0.02; say(finishing, { id: 'flump' }) }),
      over(0, 0.8, (p) => { cat.stiff = Math.max(0.02, p) }),
      at(0.3, (finishing) => say(finishing, { id: 'warble' })),
      ...route,
      step(0.95), step(1.2), step(1.45), step(2.1), step(2.4), step(2.7), step(3), step(3.8), step(4.05), step(4.3),
      over(4.5, 5, (p) => { cat.stiff = 1 - p }),
    ])
  }

  // --- Small things -------------------------------------------------------------------

  private puffs(x: number, y: number): void {
    for (let n = 0; n < 3; n++) this.bit('puff', x + (this.rng.next() - 0.5) * 60, y + (this.rng.next() - 0.5) * 40, (this.rng.next() - 0.5) * 80, -60, 0.8, 30)
  }

  private touchFur(): void {
    this.furVersion += 1
    if (this.changed === 0) this.changed = 1
  }

  private bit(kind: BitKind, x: number, y: number, vx: number, vy: number, life: number, size: number): void {
    if (this.bits.length >= MOST_BITS) this.bits.shift()
    this.bits.push({ kind, x, y, vx, vy, age: 0, life, size })
  }

  private say(sound: Sound, by: Channel, act?: ActId): void {
    this.heard.push(act ? { sound, by, act } : { sound, by })
  }

  /** The next variant of a sound: never the same number twice running. */
  private next(): number {
    this.v = (this.v + 1 + below(this.rng, 3)) % 5
    return this.v
  }
}

const at = (t: number, play: (finishing: boolean) => void): Beat => ({ at: t, lasts: 0, play: (_progress, finishing) => play(finishing) })
const over = (from: number, to: number, play: (progress: number, finishing: boolean) => void): Beat => ({ at: from, lasts: to - from, play })

function during(act: Act | null, id: ActId, from = 0, to = Infinity): boolean {
  return act !== null && act.id === id && act.t >= from && act.t < to
}

function copyFur(fur: Fur): Fur {
  return { mud: [...fur.mud], foam: [...fur.foam], wet: [...fur.wet], fluff: [...fur.fluff] }
}
