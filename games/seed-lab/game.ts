import { stepSpring, type Spring } from './fx'
import { somePot } from './grid'
import { handPose, type Guidance } from './guidance'
import { beetleHome, packetPlaces, standingOf, type Point } from './hit'
import { House, type Cast } from './house'
import type { Gesture } from './input'
import { potIndex, type LabState } from './lab'
import { HANDLE, PLANT, type Layout } from './layout'
import { beadsOf } from './loupe'
import { plantAt, plantById, podOn, runner, setSoil, type PotRow } from './page'
import { dropAt, gameTargetAt, loupeHome, overTray, toolHome, underLoupe, visitorPoint, type GameTarget } from './reach'
import { thingAt, type ThingId } from './things'
import { FINGER_SEEN, beetleMood, ease, lookAt, visitorMood } from './faces'
import type { Pose } from './creatures'
import { sortTray } from './shows'
import type { Changed } from './toy'
import type { VisitorId } from './visitors'
import { CELL_VOICES, GAME_VOICES, TOY_VOICES, VISITOR_VOICES, higher } from './voices'
import { BODY, visitorSpot, waitingSpot } from './walker'

// The game on the toy: everything a finger can do, in every cell of the grid.
//
// The toy (toy.ts) answers the plants, the pods, the packets, the soil and
// the beetle; the house (house.ts) holds the visitors and the scenes. This
// adds the rest of the grid's cells: the can and the blotter, the runner bud,
// the loupe, the beetle carried, and everything that can be offered to a
// visitor; and the whole of the idle ladder.

/** What the finger holds that the toy does not know of. */
type Grip =
  | { kind: 'can' | 'blotter'; at: Point }
  | { kind: 'loupe'; at: Point; over: number | null }
  | { kind: 'bud'; plant: number; at: Point }
  | { kind: 'beetle'; at: Point }

const POKE_WINDOW = 2.5
/** Where on each visitor a seed sits while it is balanced, in the visitor's own measure from its feet: across (towards the plants is less) and up (less is higher). */
const PERCH: Record<VisitorId, readonly [number, number]> = { snail: [-55, -88], bee: [26, -46], moth: [2, -52], ladybird: [2, -46], ant: [-10, -58] }

/** Seconds the beetle's loupe takes to roll from where it lies to the plant it is held over, and back. */
export const LOUPE_ROLLS = 0.5
/** How long a tapped can or blotter rocks in its place. */
export const RING_SECONDS = 0.45
/** A touch on a pressed leaf, a frond or a kept drawing: the push it gives the thing's spring, how far a full swing turns it, in radians, and how long the pencil takes to go over a margin sketch again. */
export const SWING_KICK = 7, SWING_TURN = 0.2, RESKETCH_SECONDS = 0.6
/** How long dust let go on a visitor lies on it, and how long water stands on it, in seconds. */
export const DUST_LIES = 6, WATER_STANDS = 2.6
/** A pot held out to a visitor that peers into it: when in the visitor's own peering the worm waves, and when the pot is handed back. */
export const PEER_WAVE = 0.4
export const PEER_BACK = 0.85
/** The beetle's dig, in seconds (motion.ts): its huff comes as it climbs out. */
const DIG_SECONDS = 3.6
/** When, after it is set down by a visitor, the beetle's reach gets to the sketch: its bow, and a little of what follows. */
export const STRAIGHTEN_AT = 1.8
/** How long a wetted pod swells before it squirts, and a wetted runner takes to creep to its pot. */
export const SWELL_SECONDS = 0.3
/** Where in a visitor's own rattle the pod bursts, in its balancing the seed drops, and in its tug the runner twangs. */
export const RATTLE_BURST = 0.7
export const BALANCE_DROP = 0.72
export const TUG_TWANG = 0.55
export const CREEP_SECONDS = 0.7

export class Game extends House {
  private touched: GameTarget | null = null
  private grip: Grip | null = null
  private readonly buds = new Map<number, { boing: Spring; curl: number }>()
  private pokes = { plant: -1, count: 0, at: -10 }
  /** Things to do a little later, on game time: a shake after the water, a step after a bow. */
  private later: { in: number; run: () => void; undo?: () => void }[] = []
  /** The loupe the beetle holds over a plant in its showing. */
  private shownLoupe: number | null = null
  /** The visitor that is balancing a seed, while it does. */
  private balanced: VisitorId | null = null
  /** The pots the can has filled once since they last ran over or were blotted: a second filling runs over. Not saved. */
  private readonly filled = new Set<number>()
  /** The plant the beetle's loupe is on its way to, over, or on its way back from, and how far along it is, 0 by the beetle to 1 over the plant. */
  private rolledTo: number | null = null
  private rolled = 0
  /** The can or the blotter, tapped and still rocking. */
  private rung: { kind: 'can' | 'blotter'; t: number } | null = null
  /** The paper things a touch has set swinging about their tape, each a spring, and the margin sketch the pencil is going over again. Not saved. */
  private readonly swings = new Map<ThingId, Spring>()
  private resketch: { index: number; drawn: number } | null = null
  /** Where the finger is, or last was, and when; the eyes of the animals follow it (faces.ts). */
  private finger: Point | null = null
  private fingerAt = -Infinity
  private fingerDown = false
  /** Each face as it is now: how far its eyes are on the finger, 0 to 1, and its brow. Eased, so that neither snaps. */
  private readonly faces = { visitor: { on: 0, mood: 0 }, waiting: { on: 0, mood: 0 }, beetle: { on: 0, mood: 0 } }
  /** Dust and water that were let go on the visitor and lie on it: each 1 as it lands and gone in a few seconds. */
  private dusted = 0
  private wetted = 0

  constructor(state: LabState, layout: Layout, motionSeed: number, cast: Cast) {
    super(state, layout, motionSeed, cast)
  }

  private bloom = (id: number): boolean => this.fx.inBloom(id)

  private targetAt(at: Point): GameTarget {
    const below = gameTargetAt(this.state, this.layout, at, this.bloom, this.fx.beetleAt(), this.grip?.kind === 'loupe')
    if (below.kind !== 'paper') return below
    // What looks like a thing on the paper is one: the worm's head where it stands up above its pot, and the paper things of the page.
    const head = this.fx.wormHead()
    if (head && Math.hypot(at.x - head.x, at.y - head.y) <= Math.max(24, 22 * this.layout.k)) return { kind: 'worm', pot: head.pot }
    const shown = this.view(), thing = thingAt(this.layout, at, shown.kept.length, shown.sketched?.length ?? 0)
    return thing ? { kind: 'thing', id: thing } : below
  }

  private mine(target: GameTarget): boolean {
    return ['visitor', 'sketch', 'waiting', 'can', 'blotter', 'loupe', 'bud', 'worm', 'thing'].includes(target.kind)
  }

  protected override get quiet(): boolean {
    return super.quiet && this.touched === null && this.grip === null && this.later.length === 0
  }

  // --- One finger -------------------------------------------------------------------

  override gesture(gesture: Gesture): void {
    // Where the finger is, for the eyes that follow it: they stay on the spot a moment after it has lifted.
    this.finger = gesture.type === 'dragStart' ? gesture.from : gesture.at
    this.fingerAt = this.clock
    this.fingerDown = gesture.type === 'press' || gesture.type === 'dragStart' || gesture.type === 'dragMove'
    // A touch ends the scene that is playing and is then an ordinary touch.
    if (gesture.type === 'press') {
      this.touched = null
      this.grip = null
      // The grown-up's corner answers nothing: a press there is not part of the play, and ends no scene.
      if (this.targetAt(gesture.at).kind === 'none') {
        this.pressed = null
        this.hand = null
        return
      }
      this.endScene()
      // A visitor on its way off the page is still there to be touched, wherever it has got to.
      const target: GameTarget = this.onLeaving(gesture.at) ? { kind: 'visitor' } : this.targetAt(gesture.at)
      if (this.mine(target)) {
        this.touched = target
        this.pressed = null
        this.hand = null
        return this.pressMine(target)
      }
    }
    if (this.touched || this.grip) {
      switch (gesture.type) {
        case 'tap': return this.tapMine(gesture.at)
        case 'pressEnd': this.touched = null; return
        case 'dragStart': return this.dragMine(gesture.from)
        case 'dragMove': return this.moveMine(gesture.at)
        case 'dragLift': return
        case 'dragEnd': return this.dropMine(gesture.at)
        default:
      }
    }
    // The beetle can be carried, and things the toy carries can be let go on the visitor or in the beetle's corner.
    if (gesture.type === 'dragStart' && this.pressed?.kind === 'beetle') {
      this.grip = { kind: 'beetle', at: gesture.from }
      this.fx.beetleDoes('notice')
      this.fx.beetleSet(gesture.from, true)
      return this.fx.play(TOY_VOICES.lift)
    }
    if (gesture.type === 'dragEnd' && this.hand && this.letGoOnSomeone(gesture.at)) return
    super.gesture(gesture)
  }

  /** Whether a point is on the visitor that is walking off the page. */
  private onLeaving(at: Point): boolean {
    const walker = this.leaving, shown = this.live.visitor
    if (!walker?.away || !shown) return false
    const body = BODY[walker.kind], s = shown.s ?? visitorSpot(this.layout, walker.kind).s
    const half = Math.max(HANDLE, body.w * s) / 2, high = Math.max(HANDLE, body.h * s)
    return Math.abs(at.x - shown.x) <= half && at.y <= shown.y - shown.lift + 4 && at.y >= shown.y - shown.lift - high
  }

  /** Put away with a finger on it: a tool, the loupe, a runner bud or the beetle in the hand is back in its place, and nothing was done with it. */
  override putAway(): void {
    // What was still to come is settled now: a move of the page is not made, anything else is done at once.
    const later = this.later
    this.later = []
    // In silence: what is settled now is not something that is happening.
    this.fx.muted = true
    for (const item of later) (item.undo ?? item.run)()
    this.fx.muted = false
    const grip = this.grip
    this.grip = null
    this.touched = null
    this.finger = null
    this.fingerDown = false
    if (grip?.kind === 'bud') this.runnerInHand({ x: 0, y: 0 }, null)
    else if (grip?.kind === 'beetle') this.fx.beetleSet(null)
    super.putAway()
  }

  /** The runner buds a visitor brought are on every plant in a pot: each springs once as they arrive. */
  protected override budsArrive(): void {
    for (const plant of this.state.plants) if (plant.row !== 'border') this.bud(plant.id).boing.v += 7
  }

  private pressMine(target: GameTarget): void {
    if (target.kind === 'bud') this.bud(target.plant).boing.v += 5
    else if (target.kind === 'sketch') this.wishShake = 0.6
  }

  private bud(plant: number) {
    let fx = this.buds.get(plant)
    if (!fx) this.buds.set(plant, (fx = { boing: { x: 0, v: 0 }, curl: 0 }))
    return fx
  }

  private tapMine(at: Point): void {
    const target = this.touched
    this.touched = null
    if (!target) return
    switch (target.kind) {
      case 'waiting': {
        if (this.comeIn()) return
        // It cannot come in just now (one is leaving, or the one let in is not at its place yet): it answers the touch where it stands.
        this.atEdge.play('poked')
        return this.fx.play(VISITOR_VOICES[this.atEdge.kind].poked)
      }
      case 'sketch': return this.turnWish()
      case 'visitor': {
        // The visitor itself poked: a small answer of its own. One that is walking off answers on its way and keeps going.
        const going = this.leaving?.away ? this.leaving : null, walker = going ?? this.onPage
        if (!walker || (this.leaving && !going)) return this.fx.play(TOY_VOICES.paper)
        if (going || !walker.busy) walker.play('poked')
        return this.fx.play(VISITOR_VOICES[walker.kind].poked)
      }
      case 'can':
      case 'blotter':
        // Tapped, it rings and rocks where it stands.
        this.rung = { kind: target.kind, t: 0 }
        return this.fx.play(GAME_VOICES.clink)
      case 'loupe':
        this.fx.beetleDoes('roll-loupe')
        return this.fx.play(GAME_VOICES.glass)
      case 'worm':
        // Touched on the head, the worm answers as itself: gone in a blink, then up again for a look each way.
        this.fx.wormDoes(target.pot, 'poked')
        return this.fx.play(GAME_VOICES.squeak)
      case 'thing': return this.touchThing(target.id)
      case 'bud': {
        // A runner bud poked: it boings like a door-stop spring, a little higher with each poke that follows the last within a moment, up to an octave.
        const again = this.pokes.plant === target.plant && this.clock - this.pokes.at < POKE_WINDOW
        this.pokes = { plant: target.plant, count: again ? Math.min(12, this.pokes.count + 1) : 0, at: this.clock }
        this.bud(target.plant).boing.v += 9
        return this.fx.play(this.pokes.count === 0 ? CELL_VOICES['bud-poke'] : higher(CELL_VOICES['bud-poke'], this.pokes.count))
      }
      default: void at
    }
  }

  /**
   * The faces: every animal's eyes go to the finger while one is on the page and for a moment after, unless the animal
   * is in the middle of something of its own, and its brow sits as what it is doing has it (faces.ts). What lies on
   * the visitor, dust or water, wears off.
   */
  private stepFaces(dt: number): void {
    const live = this.live, seen = this.finger && (this.fingerDown || this.clock - this.fingerAt < FINGER_SEEN) ? this.finger : null
    const face = (who: keyof Game['faces'], pose: Pose, eye: Point, away: boolean, free: boolean, mood: number) => {
      const state = this.faces[who]
      state.on = ease(state.on, seen && free ? 1 : 0, 9, dt)
      state.mood = ease(state.mood, mood, 10, dt)
      if (seen && state.on > 0.01) pose.look += (lookAt(eye, seen, away) - pose.look) * state.on
      pose.mood = Math.abs(state.mood) < 0.02 ? 0 : state.mood
    }
    const near = (at: Point, reach: number) => seen !== null && Math.hypot(seen.x - at.x, seen.y - at.y) < reach
    const k = this.layout.k
    this.dusted = Math.max(0, this.dusted - dt / DUST_LIES)
    this.wetted = Math.max(0, this.wetted - dt / WATER_STANDS)
    if (live.visitor) {
      const m = live.visitor, body = BODY[m.kind], s = m.s ?? visitorSpot(this.layout, m.kind).s, shown = this.leaving ?? this.onPage
      const eye = { x: m.x + (m.away ? 0.3 : -0.3) * body.w * s, y: m.y - m.lift - 0.62 * body.h * s }
      // A finger close by is a thing to be wide-eyed about; so is anything let go on it.
      face('visitor', m.pose, eye, m.away, !(shown?.busy ?? false), visitorMood(shown?.doing ?? null) || (near(eye, 110 * k) ? 0.5 : 0))
      m.gold = shown === this.onPage ? this.dusted : 0
      m.wet = shown === this.onPage ? this.wetted : 0
    } else { this.dusted = 0; this.wetted = 0 }
    if (live.waiting) {
      const m = live.waiting, body = BODY[m.kind], s = m.s ?? waitingSpot(this.layout, m.kind, this.firstWaits).s
      const eye = { x: m.x - 0.3 * body.w * s, y: m.y - m.lift - 0.62 * body.h * s }
      face('waiting', m.pose, eye, false, !this.atEdge.busy, visitorMood(this.atEdge.doing) || (near(eye, 90 * k) ? 0.6 : 0))
    }
    const b = live.beetle, feet = this.fx.beetleAt(), bs = beetleHome(this.layout).s
    const beetleEye = { x: feet.x + (b.turned ? 40 : -40) * bs, y: feet.y - 29 * bs }
    const doing = this.fx.beetleDoing, upset = b.flip > 0.2 || b.sneeze > 0.2
    // Its page is untidy for as long as a brood it has not sorted is still coming up.
    face('beetle', b.pose, beetleEye, b.turned, doing === null && !upset && b.at === null, beetleMood(doing, upset, this.brood !== null))
  }

  /**
   * A paper thing touched. Each answers in its own way, and none is part of a move: the page is as it was.
   * The strip of tape lies flat for a moment and the beetle, whose tape it is, looks round; a pressed leaf or frond
   * rustles about its tape; a kept drawing swings on its card and is heard in the voice of the animal drawn on it;
   * a margin sketch has the pencil go over it again from the foot up.
   */
  private touchThing(id: ThingId): void {
    if (id === 'tape') {
      this.fx.tapePressed()
      if (!this.fx.beetleOut) this.fx.beetleDoes('notice')
      return this.fx.play(GAME_VOICES.tape)
    }
    if (id.startsWith('sketch')) {
      this.resketch = { index: Number(id.slice(6)), drawn: 0 }
      return this.fx.play(GAME_VOICES.pencil)
    }
    let swing = this.swings.get(id)
    if (!swing) this.swings.set(id, (swing = { x: 0, v: 0 }))
    // It is flicked the other way each time, so that two touches do not cancel.
    swing.v += (swing.x > 0 ? -1 : 1) * SWING_KICK
    if (id.startsWith('kept')) {
      const drawn = this.view().kept[Number(id.slice(4))]
      return this.fx.play(drawn ? VISITOR_VOICES[drawn.kind as VisitorId].poked : GAME_VOICES.unroll)
    }
    this.fx.play(GAME_VOICES.rustle)
  }

  private dragMine(from: Point): void {
    const target = this.touched
    this.touched = null
    if (!target) return
    if (target.kind === 'can' || target.kind === 'blotter') {
      this.grip = { kind: target.kind, at: from }
      this.fx.play(GAME_VOICES.clink)
    } else if (target.kind === 'loupe') {
      this.grip = { kind: 'loupe', at: from, over: null }
      this.fx.play(GAME_VOICES.glass)
    } else if (target.kind === 'bud') {
      // The runner comes out of its bud with the finger: a stem from the bud to the fingertip.
      this.grip = { kind: 'bud', plant: target.plant, at: from }
      this.runnerInHand(this.budOf(target.plant, from), from)
      this.fx.play(TOY_VOICES.lift)
    } else {
      // A visitor or a sketch is not carried: a drag that began on one is a tap on it.
      this.touched = target
    }
  }

  private moveMine(at: Point): void {
    const grip = this.grip
    if (!grip) return
    grip.at = at
    if (grip.kind === 'bud') this.runnerInHand(this.budOf(grip.plant, at), at)
    else if (grip.kind === 'beetle') this.fx.beetleSet(at, true)
    else if (grip.kind === 'loupe') {
      const under = underLoupe(this.state, this.layout, this.glass(at))
      if ((under?.plant ?? null) !== grip.over) {
        grip.over = under?.plant ?? null
        if (under) this.fx.play(GAME_VOICES.glass)
      }
    }
  }

  /** The middle of the loupe's glass, a little above the finger that carries it. */
  private glass(at: Point): Point {
    return { x: at.x, y: at.y - 46 * this.layout.k }
  }

  private dropMine(at: Point): void {
    const grip = this.grip
    this.grip = null
    this.release()
    if (!grip) return this.tapMine(at)
    if (grip.kind === 'can') return this.pour(at)
    if (grip.kind === 'blotter') return this.blot(at)
    if (grip.kind === 'bud') return this.letBudGo(grip.plant, at)
    if (grip.kind === 'beetle') return this.setBeetleDown(at)
    // The loupe let go over the tray sorts the plants standing there into groups of a kind; then it is back by the beetle.
    if (!overTray(this.layout, this.glass(at))) return this.fx.play(TOY_VOICES.back)
    const step = sortTray(this.state)
    if (step.events.length === 0) return this.fx.play(TOY_VOICES.back)
    this.take(step, 1)
    this.fx.play(GAME_VOICES.shuffle)
  }

  // --- The Wet column: the can, and the blotter that does the opposite ------------------------

  /** Does something a little later. With `undo` it is a move of the page still to come: if the game is put away first, the move is not made and `undo` puts things back. */
  private soon(seconds: number, run: () => void, undo?: () => void): void {
    this.later.push({ in: seconds, run, undo })
  }

  private pour(at: Point): void {
    const k = this.layout.k, target = this.targetAt(at)
    const pot = dropAt(this.state, this.layout, at)
    if (target.kind === 'pod') {
      // A pod wetted swells fat and squirts all six in one jet.
      const on = target.plant
      this.fx.drops(at, 6, 120 * k)
      this.fx.fattenPod(on)
      // The voice rises as it swells and squirts a third of a second in, as the pod does.
      this.fx.play(CELL_VOICES['pod-wet'])
      return this.soon(SWELL_SECONDS, () => this.burstPod(on, null, undefined, true), () => {})
    }
    if (target.kind === 'bud') {
      // A runner bud wetted stretches and creeps to the nearest free pot by itself, and roots there.
      const parent = plantById(this.state, target.plant), bud = parent && parent.row !== 'border' ? this.layout[parent.row][parent.slot].bud : at
      const to = this.nearestFree(bud)
      this.fx.drops(at, 6, 100 * k)
      this.fx.play(CELL_VOICES['bud-wet'])
      const step = runner(this.state, target.plant, to.row, to.slot)
      this.take(step, 2)
      for (const event of step.events) {
        const copy = event.type === 'grew' ? plantById(this.state, event.id) : undefined
        if (!copy) continue
        // The copy comes up when the runner has got there.
        this.fx.sprout(copy.id, CREEP_SECONDS, 1.2, this.fx.noteFor(copy.pairs, copy.dry, 0))
        this.creep({ x: bud.x, y: bud.y }, copy.id, CREEP_SECONDS)
      }
      return
    }
    if (target.kind === 'visitor' && this.onPage && !this.leaving) {
      // Water on the visitor: it starts as when it is poked, in its own way and its own voice, and stands in drops until they have run off. Nothing of the page changes.
      const spot = visitorSpot(this.layout, this.onPage.kind)
      this.fx.drops({ x: spot.x, y: spot.y - BODY[this.onPage.kind].h * spot.s - 30 * k }, 9, 70 * k, spot.y)
      this.wetted = 1
      if (!this.onPage.busy) this.onPage.play('poked')
      return this.fx.play(VISITOR_VOICES[this.onPage.kind].poked)
    }
    if (target.kind === 'packet') {
      // A packet seed wetted: its packet shakes in a spray of drops before the seed is planted, and the seed hops out to a free pot and comes up there.
      this.fx.drops(at, 6, 100 * k)
      this.fx.play(CELL_VOICES['seed-wet'])
      return this.sowSeed(target.packet, somePot(this.state), null)
    }
    if (target.kind === 'beetle') {
      // The beetle opens its wing cases as an umbrella, and the drops drum on them.
      this.fx.drops({ x: at.x, y: at.y - 40 * k }, 10, 60 * k, this.fx.beetleAt().y - 50 * beetleHome(this.layout).s)
      this.fx.beetleDoes('umbrella')
      return this.fx.play(CELL_VOICES['beetle-wet'])
    }
    if (target.kind === 'flower' || target.kind === 'border' || (target.kind === 'pot' && target.plant !== null && this.bloom(target.plant) && !this.onPotItself(target.row, target.slot, at))) {
      // A plant in bloom wetted, in a pot or in the border: it sags, then it shakes itself dry like a dog. Its grown height stays.
      const id = target.plant as number, plant = plantById(this.state, id)!
      const flower = standingOf(this.layout, plant).flower
      this.fx.drops({ x: flower.x, y: flower.y - 30 * k }, 8, 50 * k, flower.y)
      this.fx.kick(id, 0, -3.4)
      // It shakes itself dry as the voice's drops rattle, from a sixth of a second in.
      for (let shake = 0; shake < 5; shake++) this.soon(0.16 + shake * 0.06, () => { this.fx.kick(id, shake % 2 ? 4 : -4); this.fx.drops(flower, 3, 150 * k) })
      return this.fx.play(CELL_VOICES['plant-wet'])
    }
    if (pot.kind === 'pot') {
      const step = setSoil(this.state, pot.row, pot.slot, false)
      const soil = this.soilOf(pot.row, pot.slot), index = potIndex(pot.row, pot.slot)!
      this.fx.drops({ x: soil.x, y: soil.y - 46 * k }, 8, 40 * k, soil.y)
      this.fx.puff(soil, 'splash', 14, 0.4)
      this.fx.squashPot(index, -1.6)
      if (step.events.length > 0 && step.events[0].type === 'soil' && step.events[0].changed) {
        this.state = step.state
        this.changed = Math.max(this.changed, 1) as Changed
        this.filled.add(index)
        return this.fx.play(CELL_VOICES['soil-wet'])
      }
      // Soil that is wet already takes one filling with a glug. Filled twice it runs over, and the beetle paddles a little way past and back.
      if (!this.filled.has(index)) {
        this.filled.add(index)
        return this.fx.play(CELL_VOICES['soil-wet'])
      }
      this.filled.delete(index)
      this.fx.drops({ x: soil.x, y: soil.y }, 14, 160 * k)
      this.fx.puff(soil, 'splash', 26, 0.6)
      this.fx.beetleDoes('paddle')
      this.fx.play(CELL_VOICES['soil-wet'])
      return this.fx.play(GAME_VOICES.spill, 0.12)
    }
    this.fx.drops(at, 8, 60 * k)
    this.fx.play(GAME_VOICES.drip)
  }

  /**
   * Where a seed sits on a visitor that balances it, now: the snail on its near eye-stalk, the bee on its rump, the
   * ant on its raised hands, the moth and the ladybird on their backs. It moves with the visitor's feet and its lean.
   */
  private perch(who: VisitorId): Point {
    const spot = visitorSpot(this.layout, who), now = this.live.visitor?.kind === who ? this.live.visitor : null
    const [px, py] = PERCH[who], lean = now?.pose.lean ?? 0, cos = Math.cos(lean), sin = Math.sin(lean)
    const x = now?.x ?? spot.x, y = now ? now.y - now.lift : spot.y
    return { x: x + (px * cos - py * sin) * spot.s, y: y + (px * sin + py * cos) * spot.s - 7 * this.layout.k }
  }

  /** The free pot nearest a point, or where there is none the pot a thing is set down in all the same. */
  private nearestFree(from: Point): { row: PotRow; slot: number } {
    let best: { row: PotRow; slot: number } | null = null, least = Infinity
    for (const row of ['shelf', 'tray'] as const) {
      for (let slot = 0; slot < this.layout[row].length; slot++) {
        if (plantAt(this.state, row, slot)) continue
        const place = this.layout[row][slot], far = Math.hypot(place.x - from.x, place.soil - from.y)
        if (far < least) { least = far; best = { row, slot } }
      }
    }
    return best ?? somePot(this.state)
  }

  /** Whether a point is on the pot and not on the plant standing in it: water there is for the soil. */
  private onPotItself(row: PotRow, slot: number, at: Point): boolean {
    const pot = this.layout[row][slot].pot
    return at.y >= pot.y
  }

  private blot(at: Point): void {
    const pot = dropAt(this.state, this.layout, at)
    if (pot.kind === 'visitor' && this.onPage && !this.leaving) {
      // The blotter on the visitor: whatever water stands on it is taken up at once, and it shrugs.
      this.wetted = 0
      if (!this.onPage.busy) this.onPage.play('shrug')
      return this.fx.play(GAME_VOICES.blot)
    }
    if (pot.kind !== 'pot') return this.fx.play(TOY_VOICES.back)
    const step = setSoil(this.state, pot.row, pot.slot, true)
    this.fx.squashPot(potIndex(pot.row, pot.slot)!, -2)
    this.filled.delete(potIndex(pot.row, pot.slot)!)
    if (step.events.length > 0 && step.events[0].type === 'soil' && step.events[0].changed) {
      this.state = step.state
      this.changed = Math.max(this.changed, 1) as Changed
    }
    this.fx.play(GAME_VOICES.blot)
  }

  // --- The runner bud, and the beetle in the hand ------------------------------------------------

  /** The bud of a plant in a pot: where its runner comes out. */
  private budOf(plant: number, or: Point): Point {
    const one = plantById(this.state, plant)
    if (!one || one.row === 'border') return or
    const bud = this.layout[one.row][one.slot].bud
    return { x: bud.x, y: bud.y }
  }

  private letBudGo(plant: number, at: Point): void {
    const bud = this.budOf(plant, at)
    this.runnerInHand(bud, null)
    const drop = dropAt(this.state, this.layout, at)
    if (drop.kind === 'pot') {
      // A runner bud set on a pot roots there: a copy of the one parent, still joined by its runner.
      this.fx.play(CELL_VOICES['bud-carry'])
      const step = runner(this.state, plant, drop.row, drop.slot)
      this.take(step, 2)
      for (const event of step.events) if (event.type === 'grew') this.runnerRoots(bud, event.id)
      return
    }
    if (drop.kind === 'visitor' && this.onPage && !this.leaving) {
      // The visitor tugs it like a lead: the runner is taut between its bud and the visitor, it twangs, and the parent plant hops along behind.
      const walker = this.onPage, twang = this.seconds(walker.kind, 'tug') * TUG_TWANG
      walker.play('tug')
      this.runnerLead(bud, twang + 0.3)
      const spot = this.fx.spotOf(this.state, plant)
      const hopAlong = () => { if (spot && plantById(this.state, plant) && !this.fx.heldAt(plant)) this.fx.hopTo(plant, spot, spot, 0, 0.26, 16, true) }
      this.fx.kick(plant, 3, -1)
      this.soon(twang, () => { this.fx.kick(plant, 5, -2); hopAlong() })
      this.soon(twang + 0.35, () => { this.fx.kick(plant, 4, -1.5); hopAlong() })
      // The voice's twang is a sixth of a second into it.
      return this.fx.play(CELL_VOICES['bud-offer'], Math.max(0, twang - 0.16))
    }
    this.fx.play(TOY_VOICES.back)
  }

  private setBeetleDown(at: Point): void {
    const drop = dropAt(this.state, this.layout, at)
    if (drop.kind === 'pot') {
      // Set down on a pot it digs itself in like a seed, waits, and climbs out affronted when nothing grows.
      const soil = this.soilOf(drop.row, drop.slot)
      this.fx.beetleSet(soil)
      this.fx.beetleDoes('dig')
      this.fx.puff(soil, 'soil', 14)
      this.fx.play(CELL_VOICES['beetle-carry'])
      // The huff comes as it climbs out, three quarters of the way through.
      return this.fx.play(GAME_VOICES.huff, DIG_SECONDS * 0.76)
    }
    if (drop.kind === 'visitor' && this.onPage && !this.leaving) {
      // Beetle and visitor bow stiffly to each other, and where the visitor's sketch is still up the beetle then puts it straight: the label swings and hangs true.
      // It is set down facing the visitor, a step back from where a plant is offered: it is the longer of the two.
      this.fx.beetleSet({ x: this.layout.offer.x - 20 * beetleHome(this.layout).s, y: this.layout.offer.y }, false, this.layout.offer.x < visitorSpot(this.layout, this.onPage.kind).x)
      // A visitor that has what it asked for has taken its sketch down: there is none to straighten, and the two only bow.
      const label = !this.state.finished
      this.fx.beetleDoes('bow', ...(label ? ['straighten'] : []))
      this.onPage.play('bow')
      if (label) this.soon(STRAIGHTEN_AT, () => { this.wishShake = 0.9; this.wishTrue = true; this.fx.play(GAME_VOICES.unroll) })
      return this.fx.play(CELL_VOICES['beetle-offer'])
    }
    this.fx.beetleSet({ x: at.x, y: Math.min(at.y, beetleHome(this.layout).y) })
    this.fx.beetleGo(null, 1.2)
    this.fx.play(TOY_VOICES.back)
  }

  // --- The Offer column, for what the toy carries ---------------------------------------------------

  /** Something the toy holds was let go on the visitor, in the beetle's corner, or as dust on a runner bud. Says whether it was dealt with. */
  private letGoOnSomeone(at: Point): boolean {
    const hand = this.hand
    if (!hand) return false
    const drop = dropAt(this.state, this.layout, at)
    const done = () => { this.hand = null; this.release() }
    if (hand.kind === 'dust') {
      const target = this.targetAt(at)
      if (target.kind === 'visitor' && this.onPage && !this.leaving) {
        // Dust on the visitor: it lies gold on its back, and the visitor shrugs in its own way and its own voice. Nothing of the page changes.
        done()
        this.fx.dustInHand(null)
        this.fx.dust(at, 12, 120 * this.layout.k)
        this.dusted = 1
        if (!this.onPage.busy) this.onPage.play('shrug')
        this.fx.play(VISITOR_VOICES[this.onPage.kind].shrug)
        return true
      }
      if (target.kind !== 'bud') return false
      // Dust on a runner bud: it curls shut, flicks the dust off and uncurls. A runner needs none.
      done()
      this.fx.dustInHand(null)
      this.bud(target.plant).curl = 1
      this.fx.dust(at, 10, 140 * this.layout.k)
      this.fx.play(CELL_VOICES['bud-dust'])
      return true
    }
    if (hand.kind === 'plant') {
      if (drop.kind === 'visitor') { done(); this.offerPlant(hand.id); return true }
      if (drop.kind === 'corner') { done(); this.guardPlant(hand.id, { x: this.layout.beetle.x + this.layout.beetle.w * 0.2, y: at.y }); return true }
      return false
    }
    if (drop.kind !== 'visitor' || !this.onPage || this.leaving) return false
    const walker = this.onPage
    if (hand.kind === 'pod') {
      // The visitor shakes it like a rattle until it bursts in its grip, and the brood lands as usual.
      done()
      const on = hand.plant, grip = visitorPoint(this.state, this.layout) ?? at
      // The pod is in the visitor's grip, shaken again and again, and then it bursts there.
      // It bursts where the visitor's own rattle has it burst, seven tenths of the way through; the voice's pop is timed to that.
      const burstAt = this.seconds(walker.kind, 'rattle') * RATTLE_BURST
      this.fx.holdPod(on, true)
      this.fx.carryPod(on, grip)
      walker.play('rattle')
      for (let wait = 0.02; wait < burstAt - 0.05; wait += 0.16) this.soon(wait, () => { this.fx.shakePod(on, 16); if (wait < burstAt - 0.4) this.fx.play(GAME_VOICES.rattle) })
      this.fx.play(CELL_VOICES['pod-offer'], Math.max(0, burstAt - 0.27))
      this.soon(burstAt, () => { this.fx.holdPod(on, false); this.fx.carryPod(on, null); this.burstPod(on, null, grip) }, () => {})
      return true
    }
    if (hand.kind === 'seed') {
      // The visitor balances it, drops it, and it hops into a pot and sprouts.
      done()
      // The seed sits on the visitor while it balances it, and is then dropped from there.
      const packet = hand.packet
      // It is dropped where the visitor's own balancing loses it; the voice's tock is three tenths of a second into it.
      const loseAt = this.seconds(walker.kind, 'balance') * BALANCE_DROP
      walker.play('balance')
      // From now until it drops, the seed is on the visitor and moves with it (`step` puts it there every frame).
      this.balanced = walker.kind
      this.fx.seedInHand(this.perch(walker.kind))
      this.fx.play(CELL_VOICES['seed-offer'], Math.max(0, loseAt - 0.3))
      const off = () => { this.balanced = null; this.fx.seedInHand(null) }
      this.soon(loseAt, () => { const from = this.perch(walker.kind); off(); this.sowSeed(packet, somePot(this.state), from) }, off)
      return true
    }
    if (hand.kind === 'pot') {
      // The visitor peers into the pot held out to it, the worm waves from it, and the pot is handed back.
      done()
      const index = potIndex(hand.row, hand.slot)!
      // The worm waves when the visitor has leaned in, and the pot goes back, with its hollow knock, near the end of the visitor's own peering.
      const whole = this.seconds(walker.kind, 'peer')
      this.fx.holdPot(index, { x: this.layout.offer.x, y: this.layout.offer.y - PLANT.potH * this.layout.k })
      walker.play('peer')
      this.fx.play(CELL_VOICES['soil-offer'])
      this.soon(whole * PEER_WAVE, () => this.fx.wormDoes(index, 'poked'))
      this.soon(whole * PEER_BACK, () => { this.fx.holdPot(index, null); this.fx.squashPot(index); this.fx.play(GAME_VOICES.knock) })
      return true
    }
    return false
  }

  protected override loupeOver(plant: number | null): void {
    this.shownLoupe = plant
    // It is rolled there from where it lies by the beetle, and rolled back: it is never in one place and then in another.
    if (plant !== null) { this.rolledTo = plant; this.fx.play(GAME_VOICES.glass) }
  }

  // --- Time, and what the view draws ---------------------------------------------------------------

  override step(dt: number, guidance: Guidance | null = null): void {
    for (let i = this.later.length - 1; i >= 0; i--) if ((this.later[i].in -= dt) <= 0) this.later.splice(i, 1)[0].run()
    super.step(dt, guidance)
    const live = this.live, layout = this.layout, k = layout.k, grip = this.grip
    // A seed that a visitor balances rides on it.
    if (this.balanced) {
      if (this.onPage?.kind === this.balanced && !this.leaving) this.fx.seedInHand(this.perch(this.balanced))
      else { this.balanced = null; this.fx.seedInHand(null) }
    }
    live.buds.clear()
    for (const [plant, bud] of this.buds) {
      stepSpring(bud.boing, 0, 220, 6, dt)
      bud.curl = Math.max(0, bud.curl - dt * 1.4)
      if (bud.curl === 0 && Math.abs(bud.boing.x) < 0.01 && Math.abs(bud.boing.v) < 0.05) this.buds.delete(plant)
      else live.buds.set(plant, { boing: Math.max(-1, Math.min(1, bud.boing.x)), curl: Math.min(1, bud.curl * 1.6) })
    }
    live.can = grip?.kind === 'can' ? { x: grip.at.x, y: grip.at.y - 30 * k, tip: this.overSomething(grip.at) ? 0.95 : 0.15 } : this.toolsAt ? { x: this.toolsAt.can.x, y: this.toolsAt.can.y, tip: 0 } : null
    live.blotter = grip?.kind === 'blotter' ? { x: grip.at.x, y: grip.at.y - 20 * k, tip: 0 } : this.blotting ? { x: this.blotting.x, y: this.blotting.y, tip: 0 } : this.toolsAt ? { x: this.toolsAt.blotter.x, y: this.toolsAt.blotter.y, tip: 0 } : null
    this.stepFaces(dt)
    // The paper things that were touched swing about their tape and come to rest; a sketch is gone over from its foot up.
    live.things.clear()
    for (const [id, swing] of this.swings) {
      stepSpring(swing, 0, 150, 5, dt)
      if (Math.abs(swing.x) < 0.004 && Math.abs(swing.v) < 0.03) this.swings.delete(id)
      else live.things.set(id, Math.max(-1, Math.min(1, swing.x)) * SWING_TURN)
    }
    if (this.resketch && (this.resketch.drawn += dt / RESKETCH_SECONDS) >= 1) this.resketch = null
    live.resketch = this.resketch
    // A tool that was tapped rocks in its place for a moment, unless it has been taken up since.
    if (this.rung) {
      const rung = this.rung
      rung.t += dt
      if (rung.t >= RING_SECONDS || live[rung.kind] !== null) this.rung = null
      else live[rung.kind] = { ...toolHome(layout, rung.kind), tip: Math.sin(rung.t * 34) * 0.14 * (1 - rung.t / RING_SECONDS), rest: true }
    }
    // The loupe: in the hand, or held over a plant by the beetle in its showing, or rolling home.
    live.loupe = null
    live.beads = null
    const noteFor = (id: number, pod: boolean) => {
      const plant = plantById(this.state, id)
      if (!plant) return
      const at = standingOf(layout, plant), seeds = pod ? podOn(this.state, id)?.seeds : undefined
      // A seed in a pod has a pod parent and a dust parent; a plant's note says how that plant came to be.
      live.beads = { x: pod ? at.pod.x : at.flower.x, y: pod ? at.pod.y : at.flower.y, k: at.k, pairs: beadsOf(seeds ? seeds[0] : plant.pairs), from: seeds ? 'seed' : plant.from.how }
    }
    if (grip?.kind === 'loupe') {
      const glass = this.glass(grip.at)
      live.loupe = glass
      const under = underLoupe(this.state, layout, glass)
      if (under) noteFor(under.plant, under.pod)
    } else if (this.fence) {
      // While it guards a plant in its corner the beetle carries its loupe on its back, out of the plant's way.
      const feet = this.fx.beetleAt(), home = beetleHome(layout)
      live.loupe = { x: feet.x + 26 * home.s, y: feet.y - 96 * home.s }
    } else if (this.rolledTo !== null) {
      this.rolled = Math.max(0, Math.min(1, this.rolled + (this.shownLoupe !== null ? dt : -dt) / LOUPE_ROLLS))
      const plant = plantById(this.state, this.rolledTo)
      if (!plant || (this.shownLoupe === null && this.rolled === 0)) this.rolledTo = null
      else {
        const at = standingOf(layout, plant), home = loupeHome(layout), u = this.rolled * this.rolled * (3 - 2 * this.rolled)
        const over = { x: at.flower.x + 30 * at.k, y: at.flower.y + 10 * at.k }
        live.loupe = { x: home.x + (over.x - home.x) * u, y: home.y + (over.y - home.y) * u }
        // Its note shows once it is over the plant.
        if (this.rolled >= 1) noteFor(plant.id, false)
      }
    }
    this.guideMore(guidance, noteFor)
  }

  /** While a visitor is being served the ghost hand shows a plant carried to it first and a dab after; otherwise a dab first. */
  private get serving(): boolean {
    return this.state.visitor !== null && !this.state.finished && !this.leaving
  }

  /** Every other showing of the ghost hand is a dab; the ones between are the game's other moves. */
  protected override dabTurn(index: number): number | null {
    const dab = this.serving ? index % 2 === 1 : index % 2 === 0
    return dab ? Math.floor(index / 2) : null
  }

  private overSomething(at: Point): boolean {
    const target = this.targetAt(at)
    return target.kind !== 'paper' && target.kind !== 'none'
  }

  /**
   * The rest of the idle ladder. The ring also marks the visitor waiting at
   * the edge when letting it in is the next thing a child could do. Every
   * other showing of the ghost hand is one more possible move: a touch on
   * the waiting visitor while nobody is being served, or a plant carried to
   * the visitor, picked by turn and never because it fits; and every second
   * of those is the loupe carried to a flower, where its note shows (the
   * ladder gives four showings in all, so the loupe's is the third or the
   * fourth). The loupe at home has a ring too: it is the help a child can fetch.
   */
  private guideMore(guidance: Guidance | null, noteFor: (id: number, pod: boolean) => void): void {
    if (!guidance || (guidance.glow <= 0 && guidance.demo === null)) return
    const live = this.live, k = this.layout.k
    const free = !this.state.visitor || this.state.finished
    const edge = waitingSpot(this.layout, this.atEdge.kind, this.firstWaits)
    // The ring keeps inside the page: the one who waits stands close to its edge.
    if (free && !this.leaving) live.glow.rings.push({ x: edge.x, y: edge.y - 26 * edge.s, r: Math.min(44 * Math.max(0.6, edge.s), this.layout.w - edge.x - 5) })
    // The loupe lies at home unless a finger or the beetle has it.
    const home = live.loupe === null ? loupeHome(this.layout) : null
    if (home) live.glow.rings.push({ x: home.x, y: home.y, r: home.r + 9 * k })
    if (guidance.demo === null || this.dabTurn(guidance.demoIndex) !== null) return
    const turn = Math.floor(guidance.demoIndex / 2), own = Math.floor(turn / 2)
    if (turn % 2 === 1 && home) {
      // The hand carries the loupe to a flower, by turn, and its note shows there; let go, the loupe is at home again. Nothing of the page is touched.
      const stand = this.state.plants.filter((plant) => plant.row !== 'border' && this.bloom(plant.id)).sort((a, b) => a.id - b.id)
      if (stand.length === 0) return
      const one = stand[own % stand.length], flower = standingOf(this.layout, one).flower
      const to = { x: flower.x, y: flower.y + 46 * k }, pose = handPose(guidance.demo, true, this.pose)
      const hand = { x: home.x + (to.x - home.x) * pose.travel, y: home.y + (to.y - home.y) * pose.travel }
      live.hand = { ...hand, press: pose.press, opacity: pose.opacity }
      if (pose.press >= 1) {
        live.loupe = this.glass(hand)
        // Its ring goes with it: a ring round nothing would be a sign of its own.
        live.glow.rings.pop()
        if (pose.travel >= 1) noteFor(one.id, false)
      }
      return
    }
    if (free) {
      const pose = handPose(guidance.demo, false, this.pose)
      live.hand = { x: edge.x, y: edge.y - 26 * edge.s, press: pose.press, opacity: pose.opacity }
      return
    }
    const plants = this.state.plants.filter((plant) => plant.row !== 'border' && this.bloom(plant.id)).sort((a, b) => a.id - b.id)
    const to = visitorPoint(this.state, this.layout)
    if (plants.length === 0 || !to) return
    const plant = plants[own % plants.length]
    const place = this.layout[plant.row as PotRow][plant.slot]
    const from = { x: place.x, y: place.soil + PLANT.potH * 0.5 * k }
    const pose = handPose(guidance.demo, true, this.pose)
    const hand = { x: from.x + (to.x - from.x) * pose.travel, y: from.y + (to.y - from.y) * pose.travel - 40 * k * Math.sin(pose.travel * Math.PI) }
    live.hand = { ...hand, press: pose.press, opacity: pose.opacity }
    // The plant goes with the hand, as it would with a finger, and is in its pot again when the hand lets go: it is
    // shown carried, and nothing of the page is touched. One that is busy with something of its own is left to it.
    if (pose.press >= 1 && !live.plants.has(plant.id)) {
      // Its flower's ring goes with it: a ring round nothing would be a sign of its own.
      const flower = standingOf(this.layout, plant).flower, ring = live.glow.rings.findIndex((one) => one.x === flower.x && one.y === flower.y)
      if (ring >= 0) live.glow.rings.splice(ring, 1)
      live.plants.set(plant.id, { grow: 1, bend: -0.12 * Math.sin(pose.travel * Math.PI), squash: 1, at: { x: hand.x, y: hand.y - PLANT.potH * 0.5 * k - 6 * k * Math.min(1, pose.travel * 8), k }, held: true })
    }
  }

  /** For the Mount's stills and the tests: what is in the finger's grip. */
  get holding(): string | null {
    return this.grip?.kind ?? this.hand?.kind ?? null
  }

  /** Whether a pot is free: for the tests. */
  free(row: PotRow, slot: number): boolean {
    return plantAt(this.state, row, slot) === undefined
  }
}

export { packetPlaces, loupeHome }
