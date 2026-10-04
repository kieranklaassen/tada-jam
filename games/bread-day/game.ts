// The game on the toy: everything the finger can do in the bakery, as acts of
// the rules (bakery.ts), with the soft body, the characters and the scenes
// that answer them. No DOM, no canvas and no clock: positions arrive in the
// look's reference units and time as attended seconds, so the whole game runs
// in a test, and a different look can be put in front of it.
//
// What is kept here and never saved: the thing in the hand, the walk of a
// customer between the lane and the hatch, a reaction or a scene in play, and
// flour in the air. The bakery alone is the saved state, and every one of
// these is rebuilt from it or simply gone on load.

import { callIn, carry, feedBadger, fromRack, handOver, markShown, sendBack, thingAt, tick, tipOnto, toRack, work, type Bakery, type From, type Happening, type Step } from './bakery'
import { Cast } from './cast'
import { occasionOf } from './consequence'
import { DoughBody, formOf, type Form } from './doughBody'
import { GRID, whatIs } from './grid'
import { BENCH, SPOTS } from './lookLayout'
import { Motion, type Pose, type Who } from './motion'
import { Scene, type Beat } from './scene'
import { showing, showingLength, shownAt, type Where } from './showing'
import { FIGURE, FIGURES_OF, LANE_END, LANE_SCALE, LEAST_TOUCH, LUMP_AT, PEEL_SCALE, RACK, animalBox, figureBox, inside, middle, placeAt, standings, type Figure, type Point, type Rect, type Stand } from './stage'
import { kindOf, type Effect, type Ingredient, type Load, type Place } from './stuff'
import { ideasOf, type Animal, type Group, type Idea } from './tastes'
import { Wisps, type Extra, type WispKind } from './wisps'

export type { Point } from './stage'

/** A voice to play, by name, with its pitch and loudness for this one time. */
export type Heard = { name: string; pitch: number; gain: number }
/** A speck of flour in the air or a drop of water: the view draws each as one hard-edged dot. */
export type Speck = { x: number; y: number; vx: number; vy: number; life: number; size: number; wet: boolean }

/** What a finger landed on. */
export type Target =
  | { on: 'stuff' } | { on: 'peel' } | { on: 'rack'; place: number } | { on: 'tool'; what: Ingredient }
  | { on: 'animal'; animal: Animal; where: 'hatch' | 'lane'; place: number }
  | { on: 'poke'; who: Who } | { on: 'room'; what: 'window' | 'bench' | 'wall' }

/** A drag across the stuff is one push of the rules for every this many reference units. */
export const STROKE = 115
/** A lobe pulled this far past the edge is a pull of the rules: it stretches and stays long, or rips. */
export const PULL_AT = 46
const MOST_SPECKS = 70, GRAVITY = 900
/** A finger that went down on the peel and has gone this far without meeting the stuff is carrying the peel. */
const CARRY_AT = 36
/** The peel's handle, as it lies on the board. */
const HANDLE: Rect = [SPOTS.peel[0] + SPOTS.peel[2] * 0.62, SPOTS.peel[1] + SPOTS.peel[3] * 0.6, SPOTS.peel[2] * 0.38, SPOTS.peel[3] * 0.4]
/** How fast a customer walks between the lane and the hatch, in reference units a second. */
const WALK = 300
/** How fast the peel and the drawn sizes settle where they belong. */
const EASE = 14
/** Where the badger shows a new idea on a lump of its own, and how large that lump is drawn. */
/** Up at the warm nook and at the oven it is held beside them, on the oven's face: the child's own peel may be standing in either. */
const SHOW_AT: Record<Where, Point> = { bench: { x: SPOTS.badger[0] + SPOTS.badger[2] / 2, y: BENCH - 4 }, nook: { x: SPOTS.nook[0] - 44, y: SPOTS.nook[1] + SPOTS.nook[3] - 30 }, oven: { x: SPOTS.mouth[0] - 44, y: SPOTS.mouth[1] + SPOTS.mouth[3] - 70 } }
const SHOW_SCALE = 0.5
/** The badger's mouth, where a small black cloud comes from. */
/** How far into a reaction the strings of raw dough snap back. */
const SNAP_AT = 0.78
/** The mole's sneeze at a black crust comes this long into its reaction (castClips.ts): the soot leaves its nose then. */
const MOLE_SNEEZE = 1.3
/** A carried peel feeds the badger only below this line: a peel moved a little way off the sill goes back to the sill. */
const FEED_TOP = SPOTS.badger[1] + 100
const MOUTH: Point = { x: SPOTS.badger[0] + SPOTS.badger[2] / 2 + 34, y: SPOTS.badger[1] + 190 }
/** How large a bread is on the rack at most. */
const RACK_SCALE = 0.3
/** How large a bread is in a customer's hold and in the hand, against its size on the peel. */
const HELD_SCALE = 0.62

/** The voice of an act on the stuff that the grid does not name. */
const EFFECT_VOICE: Partial<Record<Effect, string>> = { rip: 'tear', stretch: 'stretch-rise', gather: 'gather-pat', 'flour-over': 'flour-whump', 'water-over': 'water-drips', burp: 'burp', 'slides-off': 'seed-ticks' }
const TIP_VOICE: Record<Ingredient, string> = { flour: 'flour-hiss', water: 'gurgle', bubbly: 'burp', seeds: 'seed-ticks' }
const TOOL_SPOT: Record<Ingredient, 'sack' | 'jug' | 'jar' | 'dish'> = { flour: 'sack', water: 'jug', bubbly: 'jar', seeds: 'dish' }

function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A customer as it is drawn: where its foot is now and where it is going. */
type Actor = { x: number; y: number; scale: number; tx: number; ty: number; ts: number; where: 'hatch' | 'lane' | 'gone'; place: number; walking: boolean }

/** What is in the hand. A thing in the hand is still where it came from in the bakery until the finger lets go. */
type Finger =
  | { kind: 'rub'; at: Point; moved: boolean; began: boolean; onStuff: boolean; travelled: number; pulled: boolean; strokeAt: number }
  | { kind: 'peel'; at: Point; moved: boolean; from: Point; carrying: boolean }
  | { kind: 'bread'; at: Point; moved: boolean; from: From }
  | { kind: 'none'; at: Point; moved: boolean }

/** A piece the look lays whole: a figure of the cast in its box, posed. */
export type Laid = { figure: Figure; box: Rect; pose: Readonly<Pose>; front: boolean; floured: boolean }
/** A thing drawn at rest by its form: on the rack, in the hand, in a customer's hold, or the badger's own small lump. */
export type Still = { form: Form; x: number; y: number; scale: number; turn: number; kind: 'rack' | 'held' | 'hand' | 'shown' }

export class Game {
  bakery: Bakery
  readonly body = new DoughBody()
  readonly motion: Motion
  readonly cast: Cast
  readonly specks: Speck[] = []
  /** Steam, shimmer, clouds, smoke and a rolling seed: drawn for a moment, never saved. */
  readonly wisps = new Wisps()
  /** The badger is white with flour, for as long as that secret lasts. */
  floured = false
  /** The form the body rests in now, for the painter. Null when the peel is empty or its load is in the hand. */
  form: Form | null = null
  /** Something to hand to storage: 'soon' at the throttle, 'now' at once (a scene's outcome, the end of a cycle). */
  dirty: '' | 'soon' | 'now' = ''

  private readonly rnd: () => number
  private readonly heard: Heard[] = []
  private readonly actors = new Map<Animal, Actor>()
  private seconds = 0
  private said = 0
  private finger: Finger | null = null
  /** Where the peel is drawn: it eases to its place, and follows the finger while carried. */
  private readonly peelAt = { x: LUMP_AT.board.x, y: LUMP_AT.board.y, scale: 1 }
  /** A thing a customer is handing back: drawn in its hold until the reaction ends, and all the while still where it came from. */
  private reaction: { thing: NonNullable<Load>; from: From; by: Animal; from0: number; until: number; mark: 'strings' | 'seed' | 'soot' | 'pucker' | null } | null = null
  /** A customer white with flour after it sneezed at dust, until its reaction ends. */
  private dusted: { animal: Animal; until: number } | null = null
  /** The thing a customer is leaving with, and who carries it. */
  private taken: { thing: NonNullable<Load>; by: Animal } | null = null
  private scene: Scene | null = null
  /** The badger's own lump while it shows an idea. */
  private demo: { load: Load; where: Where } | null = null
  /** A scene is being ended by a touch: its remaining cues land in silence. */
  private skipping = false
  /** A bread came out of the oven and has not been set down yet: what it has become shows as the peel lands. */
  private fresh = false
  /** In a secret the peel is drawn where the scene takes it, with what the scene shows on it; the bakery's own peel is already home and empty. */
  private stagePeel: { x: number; y: number; scale: number } | null = null
  private stageLoad: Load | undefined = undefined
  /** How far a figure is from its own place while it rides the peel. */
  private readonly shifts = new Map<Figure, Point>()
  private warmAt = 0
  private doorUntil = 0
  private riseHeard = 0

  /** `opened` is what save.ts made of the slot: the bakery, and for a first visit the first customer stepping up. */
  constructor(opened: Step, seed: number) {
    this.bakery = opened.bakery
    this.rnd = mulberry(seed)
    this.motion = new Motion(seed)
    this.cast = new Cast(seed)
    this.reform()
    this.sync(true)
    this.settle()
    this.after(opened.happened)
    // A first visit is saved at once: its first showing is marked as shown, and must not play again after a put-away.
    this.dirty = opened.happened.length > 0 ? 'now' : ''
    // Put away before a showing had its turn, the customer at the hatch still needs it: it takes its turn now.
    const hatch = this.bakery.hatch
    if (opened.happened.length === 0 && hatch) this.queued.push(...ideasOf(hatch.group).filter((idea) => !this.bakery.shown.includes(idea)))
  }

  // --- What is where ----------------------------------------------------------

  /** The middle of what lies on the peel and how large it is drawn, where the peel is now. */
  private lump(): { x: number; y: number; scale: number } {
    return this.stagePeel ?? this.peelAt
  }

  /** The finger's place on the stuff, in the body's own units. */
  private onLump(at: Point): Point {
    const lump = this.lump()
    return { x: (at.x - lump.x) / lump.scale, y: (at.y - lump.y) / lump.scale }
  }

  private peelRect(): Rect {
    const place = this.bakery.peel.at
    if (place === 'board') return SPOTS.peel
    if (place === 'oven') return SPOTS.mouth
    const at = LUMP_AT[place], w = SPOTS.peel[2] * PEEL_SCALE[place], h = SPOTS.peel[3] * PEEL_SCALE[place]
    return [at.x - w * 0.36, at.y - h / 2, w, h]
  }

  /** Raw stuff is baking behind the shut door: nothing on the peel can be reached until the oven is done. */
  private get baking(): boolean {
    const { at, load } = this.bakery.peel
    return at === 'oven' && load !== null && load.raw && kindOf(load) !== 'nothing'
  }

  /** The door is shut while raw stuff bakes, and for a moment after a bread went back in. */
  get doorShut(): boolean {
    return this.baking || (this.bakery.peel.at === 'oven' && this.seconds < this.doorUntil)
  }

  /** What a finger at this point lands on, front to back. The stuff comes first: it is what the game is for. */
  hit(at: Point): Target {
    const { peel, rack, tools } = this.bakery
    if (this.form && peel.at !== 'oven') { const on = this.onLump(at); if (this.body.contains(on.x, on.y)) return { on: 'stuff' } }
    for (let place = 0; place < RACK.length; place++) if (rack[place] && inside(at, RACK[place], 10)) return { on: 'rack', place }
    if (inside(at, SPOTS.sack)) return { on: 'tool', what: 'flour' }
    if (inside(at, SPOTS.jug)) return { on: 'tool', what: 'water' }
    if (tools.jar && inside(at, SPOTS.jar, 6)) return { on: 'tool', what: 'bubbly' }
    if (tools.seeds && inside(at, SPOTS.dish, 6)) return { on: 'tool', what: 'seeds' }
    // An animal answers anywhere in its own box, grown to a size a finger can hit; where two boxes meet, the nearer animal answers.
    let found: Target | null = null, near = Infinity
    for (const [animal, actor] of this.actors) {
      if (actor.where === 'gone') continue
      const box = animalBox(animal, actor, LEAST_TOUCH)
      if (!inside(at, box)) continue
      const centre = middle(box), far = Math.hypot(at.x - centre.x, at.y - centre.y)
      if (far < near) { near = far; found = { on: 'animal', animal, where: actor.where, place: actor.place } }
    }
    if (found) return found
    // While the oven bakes, the mouth is the shut door and not the peel: the finger rattles it and takes nothing out.
    if (!this.baking && inside(at, this.peelRect(), peel.at === 'board' ? 0 : 10)) return { on: 'peel' }
    if (inside(at, SPOTS.badger) && at.y < BENCH) return { on: 'poke', who: 'badger' }
    if (inside(at, SPOTS.mouth)) return { on: 'poke', who: this.doorShut ? 'door' : 'fire' }
    if (inside(at, SPOTS.sill, 16)) return { on: 'room', what: 'window' }
    return { on: 'room', what: at.y >= BENCH ? 'bench' : 'wall' }
  }

  // --- The finger -------------------------------------------------------------

  /** The finger landed. A scene in play ends first; then whatever the finger landed on answers now, with motion and a voice. */
  press(at: Point): void {
    this.endScene()
    const target = this.hit(at), load = this.bakery.peel.load
    this.finger = { kind: 'none', at, moved: false }
    if (target.on === 'stuff') {
      if (load && !load.raw) {
        // A bread under the finger answers as what it is, and can be picked up.
        this.finger = { kind: 'bread', at, moved: false, from: 'peel' }
        this.pressBread(at)
      } else {
        this.finger = { kind: 'rub', at, moved: false, began: true, onStuff: true, travelled: 0, pulled: false, strokeAt: this.seconds }
        this.pat(at)
      }
    } else if (target.on === 'rack') {
      this.finger = { kind: 'bread', at, moved: false, from: target.place }
      this.say('rack-set')
    } else if (target.on === 'peel') {
      this.finger = { kind: 'peel', at, moved: false, from: at, carrying: false }
      if (this.bakery.peel.at === 'oven') { this.motion.poke(this.doorShut ? 'door' : 'fire'); this.hear(this.doorShut ? 'door-rattle' : 'fire-crackle', 0.6) }
      else { this.motion.poke('peel'); this.hear('peel-knock', 0.6) }
    } else if (target.on === 'tool') {
      this.tip(target.what)
    } else if (target.on === 'animal') {
      // A touch moves a customer: the one at the hatch steps back to the lane, one in the lane steps up.
      this.hear(`${target.animal}-step`, 1)
      this.apply(target.where === 'hatch' ? sendBack(this.bakery) : callIn(this.bakery, target.place))
    } else if (target.on === 'poke') {
      this.motion.poke(target.who)
      this.hear(target.who === 'badger' ? 'badger-hm' : target.who === 'door' ? 'door-rattle' : 'fire-crackle', 0.5)
    } else {
      this.say(target.what === 'bench' ? 'bench-knock' : target.what === 'window' ? 'frost-tinkle' : 'wall-tick')
      if (target.what === 'bench') this.puff(at, 4, 120)
      // A drag that starts on the bench beside the stuff can run into it and gather it.
      if (target.what === 'bench') this.finger = { kind: 'rub', at, moved: false, began: false, onStuff: false, travelled: 0, pulled: false, strokeAt: this.seconds }
    }    // The touch has been answered: a showing that waited its turn behind the one this touch ended begins now.
    this.nextShowing()
  }

  /**
   * The game is put away, or the browser takes the finger away: whatever is in the hand goes back where it came
   * from, and no move is made that the child did not make. The lift that follows finds no finger.
   */
  cancel(): void {
    const finger = this.finger
    this.finger = null
    if (!finger) return
    if (finger.kind === 'rub' && finger.onStuff) this.body.lift()
    this.reform()
  }

  /** The finger moved while down. */
  moveTo(at: Point): void {
    const finger = this.finger
    if (!finger) return
    const moved = Math.hypot(at.x - finger.at.x, at.y - finger.at.y)
    finger.at = at
    if (!finger.moved) {
      finger.moved = true
      // The thing leaves its place for the hand: the peel shows empty while its bread is carried.
      if (finger.kind === 'bread') { this.body.lift(); this.reform() }
    }
    let rub = finger.kind === 'rub' ? finger : null
    if (finger.kind === 'peel' && !finger.carrying) {
      // A finger that went down on the peel beside the stuff either runs into the stuff, and gathers it, or
      // carries the peel off: which it is shows within a few steps.
      const reach = this.onLump(at), lump = this.lump(), handle = this.bakery.peel.at === 'board' && inside(finger.from, HANDLE)
      const nearer = Math.hypot(at.x - lump.x, at.y - lump.y) < Math.hypot(finger.from.x - lump.x, finger.from.y - lump.y) - 8
      if (!handle && this.form && this.bakery.peel.at !== 'oven' && this.body.contains(reach.x, reach.y)) {
        rub = { kind: 'rub', at, moved: true, began: false, onStuff: false, travelled: 0, pulled: false, strokeAt: this.seconds }
        this.finger = rub
      } else if (Math.hypot(at.x - finger.from.x, at.y - finger.from.y) > CARRY_AT && (handle || !this.form || !nearer)) {
        // By its handle the peel is always carried; by its blade only when the finger is not heading for the stuff.
        finger.carrying = true
        this.say('peel-slide')
      }
    }
    if (!rub) return
    const finger_ = rub, on = this.onLump(at)
    if (!finger_.onStuff) {
      if (finger_.began || !this.form || !this.body.contains(on.x, on.y)) return
      finger_.onStuff = true
      this.body.press(on.x, on.y)
      this.act('gather')
      return
    }
    this.body.moveTo(on.x, on.y)
    if (finger_.pulled) return
    if (this.body.reach >= Math.min(PULL_AT, (this.form?.reachMost ?? PULL_AT) * 0.9) && this.body.reach > 0) {
      finger_.pulled = true
      // Rough dough rips short and plops back; smooth dough stays on the finger and is long from now on.
      if (this.act('pull') !== 'stretch') { this.body.lift(); this.body.kick(0.5); finger_.onStuff = false }
      return
    }
    finger_.travelled += moved / this.lump().scale
    while (finger_.travelled >= STROKE) {
      finger_.travelled -= STROKE
      const speed = STROKE / Math.max(0.03, this.seconds - finger_.strokeAt)
      finger_.strokeAt = this.seconds
      if (whatIs(this.bakery.peel.load) === 'froth') this.puff(at, 3, 110)
      this.act('push', Math.max(0.88, Math.min(1.22, 0.86 + speed / 2600)))
      if (speed > 620) this.puff(at, 3, speed * 0.25)
    }
  }

  /** The finger is gone, however it went. Whatever was in the hand is put down: where it was let go if it can lie there, and otherwise back where it came from. */
  lift(): void {
    const finger = this.finger
    this.finger = null
    if (!finger) return
    const at = finger.at, overHatch = inside(at, SPOTS.hatch, 24) && this.bakery.hatch !== null, overBadger = inside(at, SPOTS.badger, 10) && at.y < BENCH + 20
    if (finger.kind === 'rub') {
      if (finger.onStuff) this.body.lift()
      if (!finger.began) return
      // Dragged all the way to a customer, raw stuff is handed over, and comes back unharmed. The badger is never fed
      // by the end of a rub or a pull: let go in front of it, the stuff springs back, jiggles and settles.
      if (finger.moved && overHatch) return this.hand('peel')
      // A tap is a pat: the lump is slapped, the peel jumps and flour hops.
      if (!finger.moved && this.form && this.form.kind === 'dough') {
        this.body.kick(1)
        this.motion.cue('slap')
        this.puff({ x: this.lump().x, y: this.lump().y + this.form.ry * this.lump().scale }, 6, 200)
      }
      return
    }
    if (finger.kind === 'bread') {
      if (!finger.moved) { this.body.lift(); return }
      const from = finger.from, place = RACK.findIndex((slot) => inside(at, slot, 26))
      if (overHatch) this.hand(from)
      else if (overBadger) this.feed(from)
      else if (place >= 0 && from === 'peel') { this.apply(toRack(this.bakery, place)); this.say('rack-set') }
      else if (from !== 'peel' && inside(at, SPOTS.peel, 10)) this.apply(fromRack(this.bakery, from))
      // Anywhere else it goes back where it came from, and lands as what it is.
      this.reform()
      if (thingAt(this.bakery, 'peel') && from === 'peel') this.land()
      return
    }
    if (finger.kind === 'peel' && finger.carrying) {
      const to = placeAt(at, BENCH), full = thingAt(this.bakery, 'peel') !== null
      if (overHatch && full) this.hand('peel')
      else if (to && to !== this.bakery.peel.at) this.move(to)
      // Carried up in front of the badger, well clear of the sill above it and of the bench: it eats what the peel holds.
      else if (!to && overBadger && full && at.y > FEED_TOP) this.feed('peel')
    }
  }

  // --- Time -------------------------------------------------------------------

  /** Attended seconds passing: dough rises and the oven bakes by the rules, a scene plays on, everyone moves. */
  step(seconds: number): void {
    if (!(seconds > 0)) return
    this.seconds += seconds
    // What is in the air ages first, so that what this frame sets off is seen whole.
    this.wisps.step(seconds)
    const before = this.bakery.peel.load, ticked = tick(this.bakery, seconds)
    if (ticked.bakery !== this.bakery) {
      this.bakery = ticked.bakery
      this.dirty ||= 'soon'
      const load = this.bakery.peel.load
      if (ticked.happened.some((happening) => happening.type === 'baked')) {
        // The oven is done: the door opens on what it made, and it waits there, as it is, for as long as the child likes.
        this.fresh = load !== null
        this.motion.cue('door-open')
        // The door opens on a warm whoosh, and on the sound of what this stuff became: a hiss of steam, a sizzle, a rustle.
        this.say('oven-whoosh')
        const made = this.cue('bake', before)
        if (made !== 'oven-whoosh') this.hear(made, 0.9)
        // And what the cell of the grid says is seen: a cloud of steam for water, a wisp of smoke for flour, seeds that hop.
        const was = whatIs(before), door = { x: SPOTS.mouth[0] + SPOTS.mouth[2] / 2, y: SPOTS.mouth[1] + 70 }
        if (was === 'puddle') for (let i = 0; i < 3; i++) this.wisp('cloud', door.x + (i - 1) * 46, door.y + i * 14, 1.1 - i * 0.15)
        else if (was === 'dust') this.wisp('smoke', door.x, door.y, 0.8)
        else if (was === 'loose-seeds') for (let i = 0; i < 4; i++) this.wisp('seed', LUMP_AT.oven.x + (i - 1.5) * 16, LUMP_AT.oven.y - 2, PEEL_SCALE.oven * 2)
        this.reform()
      } else if (load && load.raw) {
        const heard = Math.floor(load.rise / 20), sized = Math.floor(load.rise / 5)
        if (heard > this.riseHeard) this.hear('bubble-ticks', 0.8)
        if (sized !== Math.floor(this.riseSized)) this.reform()
        this.riseHeard = heard; this.riseSized = sized
      }
    }
    if (this.doorUntil > 0 && this.seconds >= this.doorUntil) { this.doorUntil = 0; this.motion.cue('door-open') }
    for (let i = this.pending.length - 1; i >= 0; i--) if (this.seconds >= this.pending[i].at) this.pending.splice(i, 1)[0].run()
    if (this.scene) { this.scene.update(this.seconds); if (!this.scene.running) this.scene = null }
    this.nextShowing()
    if (this.reaction && this.seconds >= this.reaction.until) {
      // The thing is handed back: it is where it always was, and lands there.
      const { by, from } = this.reaction
      this.reaction = null
      this.cast.rest(by)
      this.reform()
      if (from === 'peel') this.land(); else this.say('rack-set')
    }
    for (const [animal, actor] of this.actors) {
      const dx = actor.tx - actor.x, dy = actor.ty - actor.y, far = Math.hypot(dx, dy), go = WALK * seconds
      actor.scale += (actor.ts - actor.scale) * Math.min(1, EASE * seconds * 0.5)
      if (far <= go) {
        actor.x = actor.tx; actor.y = actor.ty
        if (actor.walking) { actor.walking = false; actor.scale = actor.ts; if (actor.where !== 'gone') this.cast.rest(animal) }
      } else { actor.x += (dx / far) * go; actor.y += (dy / far) * go }
    }
    const carried = this.finger?.kind === 'peel' && this.finger.carrying ? this.finger.at : null
    const place = this.bakery.peel.at, to = carried ?? LUMP_AT[place], size = carried ? 0.7 : PEEL_SCALE[place], ease = Math.min(1, EASE * seconds)
    this.peelAt.x += (to.x - this.peelAt.x) * ease; this.peelAt.y += (to.y - this.peelAt.y) * ease; this.peelAt.scale += (size - this.peelAt.scale) * ease
    this.warm(seconds)
    this.body.step(seconds)
    this.motion.step(seconds)
    this.cast.step(seconds)
    for (const name of this.motion.sounds()) this.hear(name, 1)
    for (const name of this.cast.sounds()) this.hear(name, 1)
    for (let i = this.specks.length - 1; i >= 0; i--) {
      const speck = this.specks[i]
      speck.life -= seconds
      if (speck.life <= 0) { this.specks.splice(i, 1); continue }
      speck.vy += GRAVITY * seconds; speck.x += speck.vx * seconds; speck.y += speck.vy * seconds
    }
  }

  /** The voices queued since the last call, in order. The Mount plays them inside the touch that caused them. */
  voices(): Heard[] {
    return this.heard.splice(0, this.heard.length)
  }

  /** Those still leaving with a bread: gone from the bakery, on stage until their ending is over. The lane may already have laid one of them out again. */
  get leavingNow(): Group | null {
    return this.leaving
  }

  /** A scene is playing: the idle ladder waits, and the next press ends it. */
  get playing(): boolean {
    return this.scene !== null
  }

  // --- Acts on the stuff ------------------------------------------------------

  private riseSized = 0
  private handed: From = 'peel'

  /** Whether a thing is out of its place for now: in the hand, or in a customer's hold while it is handed back. */
  private away(from: From): boolean {
    const finger = this.finger
    return (finger?.kind === 'bread' && finger.moved && finger.from === from) || this.reaction?.from === from
  }

  /** The body takes the form of what lies on the peel now. */
  private reform(): void {
    this.form = formOf(this.stageLoad !== undefined ? this.stageLoad : this.away('peel') ? null : this.bakery.peel.load)
    this.body.reshape(this.form)
  }

  /** A step of the rules is taken in: the bakery, then everything that follows from what happened. */
  private apply(step: Step): void {
    if (step.bakery !== this.bakery) { this.bakery = step.bakery; this.dirty ||= 'soon' }
    // Those who leave with a bread are no longer in the bakery, and stay on stage for their ending.
    for (const happening of step.happened) if (happening.type === 'ending') {
      this.leaving = happening.visitor.group
      for (const animal of happening.visitor.group) { const actor = this.actors.get(animal); if (actor) actor.where = 'gone' }
    }
    this.reform()
    this.sync(false)
    this.after(step.happened)
  }

  private cue(act: 'put' | 'push' | 'warm' | 'bake' | 'hand', load: Load = this.bakery.peel.load): string {
    const what = whatIs(load)
    return what ? GRID[what][act].voice : 'peel-knock'
  }

  /** The finger lands on raw stuff: a dent at once, one push of the rules, and the sound of this stuff being patted. */
  private pat(at: Point): void {
    const load = this.bakery.peel.load, risen = load !== null && load.raw && load.rise > 0
    // A tap on dough is a pat, with a slap. On anything else the finger's first touch is already a push: a plip in
    // water, a scrape in dust, a rattle of seeds, a sigh out of risen dough.
    const pats = load !== null && load.raw && kindOf(load) === 'dough' && !risen
    const voice = this.cue(pats ? 'put' : 'push'), on = this.onLump(at)
    // The bubbly's bubbles pop under the finger: flecks fly up from the blob.
    if (whatIs(load) === 'froth') this.puff(at, 4, 110)
    this.body.press(on.x, on.y)
    this.apply(work(this.bakery, 'push'))
    this.say(voice)
    this.motion.cue('push')
  }

  /** The finger lands on a bread: it answers as what it is. A brick does not give, and the badger knocks on it. */
  private pressBread(at: Point): void {
    const load = this.bakery.peel.load, on = this.onLump(at)
    this.body.press(on.x, on.y)
    this.say(this.cue('push'))
    if (load && !load.raw && load.crumb === 'dense') this.motion.cue('knock')
    // An airy loaf squashes with a wheeze and springs back, crackling.
    if (load && !load.raw && load.crumb === 'airy') this.hear('toast-crackle', 0.6)
    if (load && !load.raw && load.crumb === 'crumbly') this.puff(at, 5, 90)
  }

  /** One act of the finger on raw stuff, with its voice. Returns what the rules say it did. */
  private act(how: 'push' | 'pull' | 'gather', pitch = 1): Effect | null {
    const voice = this.cue('push')
    const step = work(this.bakery, how), happened = step.happened[0], effect = happened?.type === 'effect' ? happened.effect : null
    this.apply(step)
    this.say((effect && EFFECT_VOICE[effect]) ?? voice, pitch)
    this.motion.cue('push')
    return effect
  }

  /** A tap on a tool: it answers, the ingredient lands, and the stuff is what the rules make of it. */
  private tip(what: Ingredient): void {
    const step = tipOnto(this.bakery, what), happened = step.happened[0], effect = happened?.type === 'effect' ? happened.effect : null
    const taken = step.bakery.peel.load !== this.bakery.peel.load && effect !== 'flour-over' && effect !== 'water-over'
    this.apply(step)
    const from = SPOTS[TOOL_SPOT[what]], spout = { x: from[0] + from[2] * 0.7, y: from[1] + from[3] * 0.1 }
    if (effect === 'slides-off' && this.bakery.peel.at === 'board') {
      // Onto a baked crust: it lands on the loaf and does not stay. Seeds roll off, flour slides off in a puff, water runs off.
      this.say(TIP_VOICE[what])
      this.motion.cue(what)
      this.pour(spout, what === 'water' || what === 'bubbly', false)
      const lump = this.lump(), rx = (this.form?.rx ?? 60) * lump.scale, ry = (this.form?.ry ?? 40) * lump.scale
      this.soon(0.45, () => {
        if (what === 'seeds') { for (const side of [-1, 1, 1]) this.wisps.add('seed', lump.x + side * rx * (0.5 + 0.3 * this.rnd()), lump.y - ry * 0.3, 1.3, side); this.hear('seed-rattle', 0.8) }
        else if (what === 'flour') this.puff({ x: lump.x, y: lump.y - ry * 0.5 }, 7, 150)
        else for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1; this.speck(lump.x + side * rx * 0.9, lump.y, side * (40 + this.rnd() * 80), -40 - this.rnd() * 60, 0.45, true) }
      })
      return
    }
    const away = effect === 'flour-over' && this.bakery.peel.at !== 'board'
    this.say(taken || away ? TIP_VOICE[what] : (effect && EFFECT_VOICE[effect]) ?? TIP_VOICE[what])
    this.motion.cue(what)
    if (effect === 'water-over') this.motion.cue(effect)
    else if (effect === 'flour-over') {
      // The secret has one way in: a tip too many onto a full peel. With the peel away the flour only lands on the bare bench.
      if (this.bakery.peel.at === 'board') this.flouring()
      else this.soon(0.3, () => this.puff(LUMP_AT.board, 7, 150))
    }
    else if (taken) this.body.kick(0.35)
    this.pour(spout, what === 'water', !taken)
  }

  /** The peel is carried to a place and set down there. */
  private move(to: Place): void {
    const before = this.bakery.peel.load, step = carry(this.bakery, to)
    this.apply(step)
    if (to === 'oven') {
      this.motion.cue('door-shut')
      const darkened = step.happened.find((happening) => happening.type === 'darkened')
      if (darkened) {
        this.say(this.cue('bake', before)); this.doorUntil = this.seconds + 0.8
        // Dark goes black with a puff of smoke, which the badger fans away.
        if (darkened.type === 'darkened' && darkened.bread.crust === 'black') {
          this.hear('one-pop', 0.9)
          for (let i = 0; i < 2; i++) this.wisp('smoke', SPOTS.mouth[0] + SPOTS.mouth[2] * (0.4 + 0.25 * i), SPOTS.mouth[1] + 50 + i * 20, 1 - i * 0.2)
          this.motion.cue('fan')
        }
      } else this.say('door-clang')
    } else if (to === 'board') {
      this.land()
    } else {
      this.say('peel-set')
      if (to === 'sill') {
        // The cold sill says cold: a tinkle, and frost that grows on the peel beside the load.
        this.hear('frost-tinkle', 0.9)
        this.coldAt = 0
      }
      const what = whatIs(before)
      if (to === 'nook' && what) {
        this.hear(GRID[what].warm.voice, 0.8)
        // The warm nook answers each thing as its cell of the grid says, and at once.
        this.warmAt = 0
        if (what === 'dust' || what === 'toasted-dust') { this.motion.cue('shrug'); this.puff({ x: LUMP_AT.nook.x - 20, y: LUMP_AT.nook.y - 6 }, 3, 40) }
        else if (what === 'loose-seeds' || what === 'toasted-seeds') this.wisp('seed', LUMP_AT.nook.x + 8, LUMP_AT.nook.y - 2, PEEL_SCALE.nook * 2)
        else if (before && before.raw && !before.bubbly && (what === 'streaky' || what === 'shaggy' || what === 'smooth')) {
          // Dough with no bubbly in it only goes warm and shiny, and slumps a little with a squelch: a sheen slides across it.
          this.body.kick(0.3)
          if (what !== 'smooth') this.hear('soft-squelch', 0.6)
          this.soon(0.25, () => { if (this.bakery.peel.at === 'nook') this.wisp('sheen', LUMP_AT.nook.x, LUMP_AT.nook.y - 2, (this.form ? this.form.rx / 60 : 1.3) * PEEL_SCALE.nook * 2) })
        }
      }
    }
  }

  /** What lies on the peel lands on the board, as what it is: this is where a bread fresh from the oven shows what it became. */
  private land(): void {
    const load = this.bakery.peel.load
    if (!load) { this.say('peel-set'); return }
    this.say(this.cue('put'))
    this.body.kick(0.6)
    if (load.raw) return
    if (load.crumb === 'dense') { this.motion.cue('slap'); this.puff({ x: LUMP_AT.board.x, y: LUMP_AT.board.y + 40 }, 8, 220) }
    if (this.fresh) {
      // Fresh from the oven an airy loaf crackles as the peel sets down.
      if (load.crumb === 'airy') this.hear('toast-crackle', 0.8)
      if (load.crumb === 'dense') this.motion.cue('knock')
      else if (load.crumb === 'dust') this.motion.cue('shrug')
    }
    this.fresh = false
  }

  /** Something is handed over at the hatch: what is on the peel, or a bread from the rack. */
  private hand(from: From): void {
    this.handed = from
    this.apply(handOver(this.bakery, from))
  }

  /** The badger is handed something, and eats it or clears it away. */
  private feed(from: From): void {
    const thing = thingAt(this.bakery, from), step = feedBadger(this.bakery, from)
    if (step.happened.length === 0) return
    this.apply(step)
    // Raw dough it loves: it slurps it off a paw, wiggles and chuckles. Anything else it leans in and eats.
    if (thing && thing.raw && kindOf(thing) === 'dough') { this.motion.cue('fed'); this.soon(0.9, () => this.hear('badger-chuckle', 0.9)) }
    else { this.motion.cue('push'); this.say('badger-eat') }
    // At a burnt bread it coughs a small black cloud, and eats it anyway.
    if (thing && !thing.raw && thing.crust === 'black') { this.wisp('smoke', MOUTH.x, MOUTH.y, 0.9); this.hear('badger-cough', 0.9) }
  }

  // --- What follows from what happened ---------------------------------------

  private after(happened: readonly Happening[]): void {
    for (const happening of happened) {
      if (happening.type === 'handed-back') {
        if (happening.verdict.wanted) continue
        const from = this.handed, thing = thingAt(this.bakery, from)
        if (!thing) continue
        const by = happening.verdict.by
        const verdict0 = happening.verdict, sour = whatIs(thing) === 'froth'
        // The bubbly alone is sniffed, and the whole face puckers at the sour; anything else gets the customer's own reaction.
        const lasts = sour ? (this.cast.direct(by, 'sniff'), 1.7) : Math.min(1.95, this.cast.react(by, occasionOf(verdict0)))
        const mark = sour ? 'pucker' : verdict0.reason === 'raw' ? 'strings' : verdict0.reason === 'loose-seeds' ? 'seed' : by === 'mole' && verdict0.hated && !thing.raw && thing.crust === 'black' ? 'soot' : null
        this.reaction = { thing, from, by, from0: this.seconds, until: this.seconds + lasts, mark }
        // At dust five of them sneeze. The sparrows bathe in it, the crow turns grey and the mole digs in: a dry scrape, and no sneeze.
        const scrapes = verdict0.reason === 'dust' && (by === 'sparrows' || by === 'crow' || by === 'mole')
        const voice = scrapes ? 'dry-scrape' : this.cue('hand', thing)
        this.say(voice)
        // Strings of raw dough snap back with a twang, however far the dough was worked: smooth dough's own voice is that twang.
        if (mark === 'strings' && voice !== 'stretch-twang' && thing.raw && kindOf(thing) === 'dough') this.soon(lasts * SNAP_AT - 0.2, () => { if (this.reaction?.mark === 'strings') this.hear('stretch-twang', 0.7) })
        this.reform()
        // What the customer's reaction sends into the air, as the sheet has it: a white cloud at dust, a splash at
        // water, and soot at a black crust from the mole.
        const verdict = happening.verdict, actor = this.actors.get(by)
        if (actor) {
          const main = FIGURES_OF[by][0], [x, y, w, h] = figureBox(main, actor), mouth = { x: x + FIGURE[main].mouth[0] * w, y: y + FIGURE[main].mouth[1] * h }, size = actor.scale / 0.86
          if (verdict.reason === 'dust') this.soon(0.45, () => { this.wisp('cloud', mouth.x + 14 * size, mouth.y, 0.9 * size); if (this.reaction?.by === by) this.dusted = { animal: by, until: this.reaction.until } })
          else if (verdict.reason === 'wet') this.soon(0.2, () => { for (let i = 0; i < 8; i++) this.speck(mouth.x, mouth.y, (this.rnd() - 0.5) * 320, -120 - this.rnd() * 160, 0.5, true) })
          else if (by === 'mole' && verdict.hated) this.soon(MOLE_SNEEZE, () => this.wisp('smoke', mouth.x + 8 * size, mouth.y - 4, 0.55 * size))
        }
      } else if (happening.type === 'ending') {
        this.ending(happening.visitor.group, happening.taken, happening.secret)
      } else if (happening.type === 'stepped-up') {
        for (const tool of happening.cameOut) this.motion.poke(tool === 'jar' ? 'jar' : 'dish')
        this.queued.length = 0
        if (happening.showing.length > 0) this.show(happening.showing)
      }
    }
  }

  // --- Scenes -----------------------------------------------------------------

  /** A touch ends the scene that is playing: every beat lands where it was going, in silence, and the touch is then an ordinary touch. */
  private endScene(): void {
    if (!this.scene) return
    this.skipping = true
    this.scene.finish()
    this.skipping = false
    this.scene = null
  }

  private play(beats: Beat[]): void {
    this.endScene()
    this.scene = new Scene(beats)
    // The outcome is already in the bakery: it is saved now, at once, so that a put-away during the scene loses nothing.
    this.scene.start(this.seconds, () => { this.dirty = 'now' })
    // Its first beat is played now, in the touch that set it off, not a frame later.
    this.scene.update(this.seconds)
    if (!this.scene.running) this.scene = null
  }

  /**
   * The ending: a sniff, the bite on exactly this bread, the customer's own delight, and off down the lane.
   * A secret is the same with the customer's own happy business in place of the bite. The bakery already holds
   * the outcome: the hatch is empty and the position has moved.
   */
  private ending(group: Group, thing: NonNullable<Load>, secret: boolean): void {
    const first = group[0], beats: Beat[] = []
    const then = (at: number, run: () => void) => beats.push({ at, lasts: 0, play: run })
    let leave = 4
    if (secret) {
      this.riding(first, thing, beats)
    } else {
      this.taken = { thing, by: first }
      then(0, () => { this.cast.direct(first, 'sniff') })
      then(0.7, () => { this.cast.direct(first, 'bite'); this.say(thing.raw ? 'soft-chew' : thing.crumb === 'airy' ? 'chomp' : thing.crumb === 'pancake' ? 'soft-chew' : 'crunch') })
      then(1.6, () => { for (const animal of group) this.cast.react(animal, 'wanted') })
      leave = 4.8
    }
    then(leave, () => {
      for (const animal of group) {
        const actor = this.actors.get(animal)
        if (!actor) continue
        actor.tx = LANE_END.x; actor.ty = LANE_END.y; actor.ts = LANE_SCALE[0]; actor.walking = true
        this.cast.direct(animal, animal === first ? 'carry' : 'walk')
      }
    })
    beats.push({ at: leave, lasts: secret ? 1.9 : 2, play: (progress) => { if (progress >= 1) this.gone(group) } })
    this.play(beats)
  }

  /** The customers have left: the hatch stands empty, and nothing starts until the child touches someone in the lane. */
  private gone(group: Group): void {
    for (const animal of group) if (this.actors.get(animal)?.where === 'gone') this.actors.delete(animal)
    this.taken = null
    this.leaving = null
    this.home()
    // Now the hatch is empty for all to see, and those who wait come forward.
    this.sync(false)
  }

  /** Showings that wait their turn behind the one that is playing. */
  private readonly queued: Idea[] = []

  /**
   * The showing: the badger does each new act once on a lump of its own. Where a want needs two ideas not yet
   * shown, they play one after the other, each a scene of its own: a touch ends the one that is playing, and the
   * next begins when that touch has been answered. The first is marked as shown by the rules as the customer
   * steps up; each later one is marked here as it starts.
   */
  private show(ideas: readonly Idea[]): void {
    this.queued.length = 0
    this.queued.push(...ideas.slice(1))
    this.showOne(ideas[0])
  }

  private showOne(idea: Idea): void {
    const length = showingLength(idea), list = showing(idea)
    // The beat counts the moments it has voiced: a finish jumps to the end and voices nothing more.
    let voiced = -1
    this.play([
      { at: 0, lasts: 0, play: () => this.motion.cue('show') },
      { at: 0, lasts: length, play: (progress) => {
        const now = shownAt(idea, progress >= 1 ? length : progress * length), reached = list.indexOf(now)
        for (let i = voiced + 1; i <= reached; i++) {
          const moment = list[i]
          if (moment.voice) this.say(moment.voice)
          // Seeds tipped onto a baked crust are seen to roll off it.
          if (moment.voice === 'seed-ticks' && moment.load && !moment.load.raw && !this.skipping) for (const side of [-1, 1]) this.wisps.add('seed', SHOW_AT[moment.where].x + side * 24, SHOW_AT[moment.where].y - 10, 1, side)
        }
        voiced = Math.max(voiced, reached)
        this.demo = { load: now.load, where: now.where }
      } },
      { at: length, lasts: 0, play: () => { this.demo = null; this.motion.cue('rest') } },
    ])
  }

  /** The next showing in turn starts, if nothing else is playing and whoever is at the hatch still needs it. */
  private nextShowing(): void {
    if (this.scene || this.queued.length === 0) return
    const idea = this.queued.shift()!, hatch = this.bakery.hatch
    if (!hatch || !ideasOf(hatch.group).includes(idea) || this.bakery.shown.includes(idea)) { this.queued.length = 0; return }
    this.bakery = markShown(this.bakery, idea)
    this.showOne(idea)
  }

  /** The peel of a secret is home again, empty, and nobody rides it: the state the bakery has had since the secret began. */
  private home(): void {
    if (this.stagePeel === null && this.stageLoad === undefined && this.shifts.size === 0) return
    this.stagePeel = null
    this.stageLoad = undefined
    this.shifts.clear()
    this.reform()
  }

  /**
   * The two secrets that ride the peel (ART.md, "The scenes"). Loose seeds handed to the hen: her chicks ride the
   * peel back into the bakery, peck it clean, and hop out again after her. A puddle handed to the duck: it
   * climbs onto the peel and paddles. All of it is drawn only: the bakery's peel is home and empty from the start.
   */
  private riding(animal: Animal, thing: NonNullable<Load>, beats: Beat[]): void {
    const actor = this.actors.get(animal)
    if (!actor) return
    const riders: Figure[] = animal === 'hen' ? ['chick0', 'chick1', 'chick2'] : [FIGURES_OF[animal][0]]
    // The peel is held up at the hatch, well inside the opening, so that whoever gets onto it stays clear of the badger.
    const ledge = { x: Math.min(actor.x, SPOTS.hatch[0] + SPOTS.hatch[2] - 170), y: SPOTS.hatch[1] + SPOTS.hatch[3] + 30, scale: 0.5 }, board = { x: LUMP_AT.board.x, y: LUMP_AT.board.y, scale: 1 }
    const between = (t: number) => { const e = t * t * (3 - 2 * t); return { x: ledge.x + (board.x - ledge.x) * e, y: ledge.y + (board.y - ledge.y) * e, scale: ledge.scale + (board.scale - ledge.scale) * e } }
    // A rider's own place, and its place on the peel: `on` 0 is its own place, 1 is the peel, with a hop between.
    const seat = (on: number, peel: { x: number; y: number; scale: number }, bob = 0) => riders.forEach((figure, i) => {
      const [x, y, w, h] = figureBox(figure, actor), foot = { x: x + w / 2, y: y + h }
      const to = { x: peel.x + (riders.length > 1 ? (i - 1) * 44 * peel.scale : 0), y: peel.y + 6 * peel.scale }
      if (on <= 0) this.shifts.delete(figure)
      else this.shifts.set(figure, { x: (to.x - foot.x) * on, y: (to.y - foot.y) * on - Math.sin(Math.PI * on) * 30 - bob * Math.abs(Math.sin(i * 1.7 + bob * 9)) * 5 })
    })
    const then = (at: number, run: () => void) => beats.push({ at, lasts: 0, play: run })
    const over = (at: number, lasts: number, play: (progress: number) => void) => beats.push({ at, lasts, play })
    then(0, () => { this.stagePeel = { ...ledge }; this.stageLoad = thing; this.reform(); this.cast.react(animal, 'secret') })
    if (animal === 'hen') {
      over(0.2, 0.6, (p) => seat(p, ledge))
      over(0.9, 1.3, (p) => { this.stagePeel = between(p); seat(1, this.stagePeel) })
      // Pecked clean: the beat counts that it has cleared the peel, since a finish jumps to its end.
      let pecked = false
      let pecks = 0
      over(2.2, 1, (p) => {
        seat(1, board, p)
        // A patter of beaks: the beat counts its pecks.
        for (; pecks < Math.floor(p * 7); pecks++) this.say('seed-ticks', 1.15)
        if (p >= 0.6 && !pecked) { pecked = true; this.stageLoad = null; this.reform() }
      })
      over(3.2, 0.8, (p) => { seat(1 - p, board); if (p >= 1) this.home() })
    } else {
      over(0.3, 0.5, (p) => seat(p, ledge))
      let splashed = 0
      over(0.8, 2.4, (p) => {
        seat(1, ledge, p)
        // Water flies as it paddles; the beat counts its splashes.
        for (; splashed < Math.floor(p * 8); splashed++) { this.say('plip'); for (let i = 0; i < 3; i++) this.speck(ledge.x + (this.rnd() - 0.5) * 60, ledge.y - 10, (this.rnd() - 0.5) * 220, -180 - this.rnd() * 120, 0.5, true) }
      })
      let emptied = false
      over(3.2, 0.5, (p) => { seat(1 - p, ledge); if (p >= 1 && !emptied) { emptied = true; this.stageLoad = null; this.reform() } })
      over(3.6, 0.6, (p) => { this.stagePeel = between(p); if (p >= 1) this.home() })
    }
  }

  /**
   * The badger's secret: flour tipped once too often lands on the badger. It stands white all over, finds out,
   * and shakes like a wet dog. It leaves nothing behind and nothing of it is saved.
   */
  private flouring(): void {
    const burst = () => this.puff({ x: SPOTS.badger[0] + SPOTS.badger[2] / 2, y: SPOTS.badger[1] + 150 }, 9, 260)
    this.play([
      { at: 0, lasts: 0, play: () => { this.floured = true; this.motion.cue('shrug') } },
      { at: 1.5, lasts: 0, play: () => { this.motion.cue('flour-over'); burst() } },
      { at: 1.8, lasts: 0, play: burst },
      { at: 2.1, lasts: 0, play: burst },
      { at: 2.9, lasts: 0, play: () => { this.floured = false } },
      { at: 2.9, lasts: 1.1, play: () => {} },
    ])
  }

  /** Something a reaction does a moment after it starts. Never saved. */
  private readonly pending: { at: number; run: () => void }[] = []
  private soon(seconds: number, run: () => void): void {
    this.pending.push({ at: this.seconds + seconds, run })
  }

  /** The pucker at the sour: after the sniff the whole figure pinches in, twice, and lets go. */
  private puckered(animal: Animal, pose: Readonly<Pose>): Readonly<Pose> {
    const reaction = this.reaction
    if (!reaction || reaction.mark !== 'pucker' || reaction.by !== animal) return pose
    const t = (this.seconds - reaction.from0 - 0.6) / 0.95
    if (t <= 0 || t >= 1) return pose
    const pinch = Math.sin(Math.PI * t) * (0.75 + 0.25 * Math.cos(t * Math.PI * 4))
    return { ...pose, sx: pose.sx * (1 - 0.18 * pinch), sy: pose.sy * (1 + 0.07 * pinch), turn: pose.turn - 0.05 * pinch, frame: 0 }
  }

  private readonly marks: Extra[] = []

  /** What a reaction leaves on the customer for as long as it lasts: strings of raw dough, a seed in a tooth, soot on a nose. */
  extras(): readonly Extra[] {
    const out = this.marks, reaction = this.reaction
    out.length = 0
    const actor = reaction && this.actors.get(reaction.by)
    if (!reaction || !actor || reaction.mark === null || reaction.mark === 'pucker') return out
    const main = FIGURES_OF[reaction.by][0], [x, y, w, h] = figureBox(main, actor), mouth = { x: x + FIGURE[main].mouth[0] * w, y: y + FIGURE[main].mouth[1] * h }
    const t = (this.seconds - reaction.from0) / (reaction.until - reaction.from0), size = actor.scale / 0.86
    if (reaction.mark === 'strings') {
      // From the teeth to the thing on the ledge, thinning as they stretch, and snapped back before the reaction ends.
      if (t > 0.18 && t < SNAP_AT) out.push({ kind: 'strings', x0: mouth.x, y0: mouth.y, x1: x + 0.7 * w, y1: Math.min(y + 1.02 * h, SPOTS.hatch[1] + SPOTS.hatch[3] + 40), thick: 2.6 * size * (1 - (t - 0.18) / 0.75) })
    } else if (reaction.mark === 'seed') {
      // Stuck in a tooth, and worked at.
      if (t > 0.15) out.push({ kind: 'seed', x: mouth.x + Math.sin(this.seconds * 17) * 2.5 * size, y: mouth.y + 2, size, turn: Math.sin(this.seconds * 9) * 0.6 })
    } else if (t > 0.3) {
      out.push({ kind: 'soot', x: mouth.x + 4 * size, y: mouth.y - 6 * size, size })
    }
    return out
  }

  /** A wisp of a kind, where it starts, leaning as the seeded stream says. */
  private wisp(kind: WispKind, x: number, y: number, size: number): void {
    this.wisps.add(kind, x, y, size, this.rnd() * 2 - 1)
  }

  private coldAt = 0
  private frostSide = 1

  /** While the peel stands in the warm nook, water steams and a baked bread shimmers, now and then; on the cold sill frost comes and goes beside the load. */
  private warm(seconds: number): void {
    const { at, load } = this.bakery.peel
    if (this.stagePeel || (this.finger?.kind === 'peel' && this.finger.carrying)) return
    if (at === 'sill') {
      this.coldAt -= seconds
      if (this.coldAt <= 0) {
        // One fern at a time, now to one side of the load and now to the other, never a pair at one height.
        const reach = (this.form ? this.form.rx : 30) * PEEL_SCALE.sill + 16, side = this.frostSide = -this.frostSide
        this.wisps.add('frost', LUMP_AT.sill.x + side * reach, LUMP_AT.sill.y + 6 + this.rnd() * 12, 0.9, side * (0.4 + 0.6 * this.rnd()))
        this.coldAt = 1.5
      }
      return
    }
    if (at !== 'nook') return
    this.warmAt -= seconds
    if (this.warmAt > 0) return
    const what = whatIs(load), top = this.form ? this.form.ry * PEEL_SCALE.nook : 10
    if (what === 'puddle' || what === 'batter') {
      // A curl of steam, and a smaller one beside it: large enough to be seen over the peel from across a room.
      const x = LUMP_AT.nook.x + (this.rnd() - 0.5) * 24
      this.wisp('steam', x, LUMP_AT.nook.y - top, 1.8); this.wisp('steam', x + 26, LUMP_AT.nook.y - top + 4, 1.2)
      this.warmAt = 1.3
    }
    else if (load && !load.raw) { this.wisp('shimmer', LUMP_AT.nook.x, LUMP_AT.nook.y - top - 6, 1); this.warmAt = 2.4 }
    else this.warmAt = 0.5
  }

  // --- The customers ----------------------------------------------------------

  /** Everyone the bakery has at the hatch and in the lane gets a place to stand. `atOnce` on load: nobody walks in. */
  private sync(atOnce: boolean): void {
    const seen = new Set<Animal>()
    const stand = (group: Group, stood: readonly Stand[], where: 'hatch' | 'lane', place: number) => {
      group.forEach((animal, member) => {
        const to = stood[member]
        seen.add(animal)
        let actor = this.actors.get(animal)
        // One who is still leaving with its bread may already be laid out to wait again: it finishes leaving first,
        // and comes up the lane afresh when its ending is over.
        if (actor && actor.where === 'gone') return
        if (!actor) {
          // A new customer comes up the lane.
          actor = { x: LANE_END.x, y: LANE_END.y, scale: to.scale, tx: to.x, ty: to.y, ts: to.scale, where, place, walking: false }
          this.actors.set(animal, actor)
        }
        const moves = actor.tx !== to.x || actor.ty !== to.y || actor.where === 'gone' || actor.x !== to.x
        actor.tx = to.x; actor.ty = to.y; actor.ts = to.scale; actor.where = where; actor.place = place
        if (atOnce) { actor.x = to.x; actor.y = to.y; actor.scale = to.scale; actor.walking = false }
        else if (moves && !actor.walking) { actor.walking = true; this.pendingWalk.push(animal) }
      })
    }
    // Those at the hatch stand at the right of the opening; those who wait share the rest, each group in its own place.
    // While a customer is still leaving with its bread, those who wait keep their places behind it.
    const hatch = this.bakery.hatch, stood = standings(hatch ? hatch.group : this.leaving, this.bakery.lane.map((visitor) => visitor.group))
    if (hatch) stand(hatch.group, stood.hatch, 'hatch', 0)
    this.bakery.lane.forEach((visitor, place) => stand(visitor.group, stood.lane[place], 'lane', place))
    for (const [animal, actor] of this.actors) if (!seen.has(animal) && actor.where !== 'gone') this.actors.delete(animal)
    this.cast.setStage([...this.actors.keys()])
    for (const animal of this.pendingWalk.splice(0)) this.cast.direct(animal, 'walk')
  }

  private readonly pendingWalk: Animal[] = []
  /** The group that is leaving with a bread: gone from the bakery, still in the opening until its ending is over. */
  private leaving: Group | null = null

  /** On load everything is where it belongs, at once: nothing eases in. */
  private settle(): void {
    const place = this.bakery.peel.at
    this.peelAt.x = LUMP_AT[place].x; this.peelAt.y = LUMP_AT[place].y; this.peelAt.scale = PEEL_SCALE[place]
    const load = this.bakery.peel.load
    if (load && load.raw) { this.riseHeard = Math.floor(load.rise / 20); this.riseSized = Math.floor(load.rise / 5) }
  }

  // --- What the look is handed ------------------------------------------------

  private readonly laid: Laid[] = []
  private readonly stills: Still[] = []
  private readonly forms = new WeakMap<object, Form | null>()

  private formFor(thing: NonNullable<Load>): Form | null {
    let form = this.forms.get(thing)
    if (form === undefined) { form = formOf(thing); this.forms.set(thing, form) }
    return form
  }

  /** Where the peel and what lies on it are drawn. */
  get peel(): Readonly<{ x: number; y: number; scale: number }> {
    return this.stagePeel ?? this.peelAt
  }

  /** Every figure of the cast in its box, posed, back to front: the lane, those walking off, then the hatch. */
  figures(): readonly Laid[] {
    this.laid.length = 0
    for (const order of ['lane', 'gone', 'hatch'] as const) {
      // Within a row the taller stand behind the shorter, so a low long dog is not hidden by a tall bird.
      const row = [...this.actors].filter(([, actor]) => actor.where === order).sort(([a], [b]) => FIGURE[FIGURES_OF[b][0]].h - FIGURE[FIGURES_OF[a][0]].h)
      for (const [animal, actor] of row) for (const figure of FIGURES_OF[animal]) {
        const [x, y, w, h] = figureBox(figure, actor), shift = this.shifts.get(figure)
        const floured = this.dusted !== null && this.dusted.animal === animal && this.seconds < this.dusted.until
        this.laid.push({ figure, box: shift ? [x + shift.x, y + shift.y, w, h] : [x, y, w, h], pose: this.puckered(animal, this.cast.pose(figure)), front: shift !== undefined, floured })
      }
    }
    return this.laid
  }

  /** Every thing drawn at rest by its form: the rack, the hand, a customer's hold, and the badger's own lump. */
  things(): readonly Still[] {
    const out = this.stills
    out.length = 0
    const add = (kind: Still['kind'], thing: Load, x: number, y: number, scale: number, turn = 0) => { const form = thing && this.formFor(thing); if (form) out.push({ form, x, y, scale, turn, kind }) }
    this.bakery.rack.forEach((bread, place) => {
      const form = bread && !this.away(place) ? this.formFor(bread) : null
      if (!form) return
      // Every bread is drawn to fit its own place on the rack: a long loaf smaller than a round one.
      const [x, y, w, h] = RACK[place], scale = Math.min(RACK_SCALE, (w - 8) / (form.rx * 2), (h - 6) / (form.ry * 2))
      out.push({ form, x: x + w / 2, y: y + h - 3 - form.ry * scale, scale, turn: 0, kind: 'rack' })
    })
    const held = (thing: NonNullable<Load>, by: Animal) => {
      const actor = this.actors.get(by)
      if (!actor) return
      const main = FIGURES_OF[by][0], box = figureBox(main, actor), grip = this.cast.holds(by), basket = FIGURE[main].basket
      // In a reaction with no grip of its own the thing lies on the hatch ledge in front of the customer.
      const ledge = this.reaction?.by === by
      const u = grip ? grip.u : ledge ? 0.7 : basket[0], v = grip ? grip.v : ledge ? 1.02 : basket[1]
      // Whatever a customer does with the thing, all of it stays in the opening: never over the badger, never down on the bench.
      const form = this.formFor(thing), scale = HELD_SCALE * actor.scale * (grip ? grip.scale : ledge ? 1 : 0.8), r = form ? Math.max(form.rx, form.ry) * scale : 0
      const [left, top, wide, high] = SPOTS.hatch, within = (value: number, low: number, most: number) => (low > most ? (low + most) / 2 : Math.max(low, Math.min(most, value)))
      const x = within(box[0] + u * box[2], left + r - 10, left + wide - r + 36), y = within(box[1] + v * box[3], top + r - 50, top + high + 56 - r)
      add('held', thing, x, y, scale, grip ? grip.turn : 0)
    }
    if (this.reaction) held(this.reaction.thing, this.reaction.by)
    if (this.taken) held(this.taken.thing, this.taken.by)
    const finger = this.finger
    if (finger?.kind === 'bread' && finger.moved) add('hand', thingAt(this.bakery, finger.from), finger.at.x, finger.at.y - 20, HELD_SCALE)
    if (this.demo) add('shown', this.demo.load, SHOW_AT[this.demo.where].x, SHOW_AT[this.demo.where].y, SHOW_SCALE)
    return out
  }

  /**
   * The one thing the idle ladder marks, and the one move it shows: what can be touched now and where it could
   * go. A possible move, never a recipe: it knows nothing of what the customer wants.
   */
  wants(turn = 0): { box: Rect; to: Point | null } | null {
    if (this.scene || this.reaction) return null
    const { peel, hatch, lane } = this.bakery, load = peel.load
    // The whole animal, all its figures together: the marks go round the row of sparrows, not round one bird.
    const boxOf = (animal: Animal): Rect | null => { const actor = this.actors.get(animal); return actor ? animalBox(animal, actor) : null }
    // The hatch stands empty: someone waits in the lane for a touch.
    if (!hatch) { const box = lane[0] && boxOf(lane[0].group[0]); return box ? { box, to: null } : null }
    const lump = this.lump(), stuff: Rect | null = this.form ? [lump.x - this.form.rx * lump.scale, lump.y - this.form.ry * lump.scale, this.form.rx * 2 * lump.scale, this.form.ry * 2 * lump.scale] : null
    if (peel.at !== 'board') {
      // Something is in a place: the peel can be carried on. From the oven, when it is done, back to the board.
      if (peel.at === 'oven') return this.doorShut ? null : { box: SPOTS.mouth, to: LUMP_AT.board }
      return { box: this.peelRect(), to: turn % 2 === 0 ? middle(SPOTS.mouth) : LUMP_AT.board }
    }
    if (!load || !stuff) return { box: SPOTS.sack, to: null }
    if (!load.raw) return { box: stuff, to: middle(boxOf(hatch.group[0]) ?? SPOTS.hatch) }
    const kind = kindOf(load)
    if (kind === 'dust') return { box: SPOTS.jug, to: null }
    if (kind === 'puddle' || kind === 'seeds') return { box: SPOTS.sack, to: null }
    if (this.form?.texture !== 'smooth' && kind === 'dough') return { box: stuff, to: { x: stuff[0] + stuff[2] * 0.8, y: stuff[1] + stuff[3] * 0.55 } }
    // Worked dough or batter: the peel can be carried, to the oven or to the warm nook.
    return { box: HANDLE, to: turn % 2 === 0 ? middle(SPOTS.mouth) : middle(SPOTS.nook) }
  }

  /** The badger's lump and the hatch's emptiness aside, is a showing running: the view keeps the badger at its bench. */
  get showingNow(): boolean {
    return this.demo !== null
  }

  // --- Voices and specks -----------------------------------------------------

  /** A voice with the next of its variants, so a repeat never sounds stamped. */
  private say(name: string, pitch = 1): void {
    this.said++
    this.hear(name, 1, pitch * [1, 1.06, 0.94, 1.03, 0.97, 1.09, 0.91][this.said % 7])
  }

  private hear(name: string, gain: number, pitch = 1): void {
    if (!this.skipping) this.heard.push({ name, pitch, gain })
  }

  private speck(x: number, y: number, vx: number, vy: number, life: number, wet: boolean): void {
    if (this.specks.length >= MOST_SPECKS) this.specks.shift()
    this.specks.push({ x, y, vx, vy, life, size: 2 + this.rnd() * 3, wet })
  }

  /** Flour hopping off the peel where something hit it. */
  private puff(at: Point, count: number, force: number): void {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * (0.15 + 0.7 * this.rnd())
      this.speck(at.x + (this.rnd() - 0.5) * 30, at.y, Math.cos(angle) * force, Math.sin(angle) * force * 1.6, 0.35 + this.rnd() * 0.3, false)
    }
  }

  /** An arc of flour, water, bubbly or seeds from the tool to the peel; a pour that misses goes over towards the badger instead. */
  private pour(from: Point, wet: boolean, over: boolean): void {
    const to = over ? { x: SPOTS.badger[0] + SPOTS.badger[2] / 2, y: BENCH } : this.lump(), time = 0.42
    for (let i = 0; i < 12; i++) {
      const late = i * 0.012, spread = (this.rnd() - 0.5) * 60
      this.speck(from.x, from.y, (to.x + spread - from.x) / time, (to.y - from.y) / time - (GRAVITY * time) / 2, time + late, wet)
    }
  }
}
