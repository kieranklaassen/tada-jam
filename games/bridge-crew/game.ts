import { consequence } from './consequence'
import { BUILD, CrewDirector, type CrewId } from './crew'
import { layPart } from './grid'
import { length, pinsOf, samePoint, type Kind, type Part, type Point } from './kit'
import { PART_REACH, PIN_REACH, SLIDE_OFF, TROLLEY_REACH, farFromStretch, gridPointAt, onRoll, onVehicle, parkAt, rackSlot, toolAt, touched, tracingSpot, waitAt } from './layout'
import { givenUpOn, modelInMargin, nearestDifferences, neatWayDue, oneChangeDue, type Difference } from './order'
import { CALM, type Splash } from './drift'
import { desk } from './valley'
import { perchOn } from './motion'
import { DRAWN_DIP, WATER, atRest, rests, type Rest } from './pose'
import { answerOf, between, creaks, ended, frontAt, seat, stepAt, type Seat } from './ride'
import type { Frame, Strain } from './frame'
import { hang, lowPoint, park, roadOf, run, type Ending, type Run, type Train } from './run'
import { crossed, crossedHome, failedRun, leaveHats, markShown, onNewest, parked, pluckHat, ringed, sentAway, sentHome, setTrolley, standing, swapTracing, toFront, trace, turnTo, unringed, unroll, type Save, type Sheet } from './save'
import { Scene } from './scene'
import { groundAt } from './sheet'
import { isFooting, isYard, site, type Idea, type VehicleId } from './sites'
import { crossingBeats, giveBeats, givePlace, idleShow, type Cue, type Show } from './stage'
import { CHIEF, RING, Toy, type Hand } from './toy'
import { TAIL, TASTE, VEHICLES, bargeReaction, reaction, trainOf, type Reaction } from './vehicles'
import { fold as foldVoiceOf, bargeHorn, beaverChatter, beaverSigh, beaverSlap, chiefTaps, chord, creak, give, gurgle, honk, hornEcho, plop, lay as layVoice, load as loadVoice, moleDrop, moleRule, pendulumSqueak, scaleStart, pinTick, pluck as pluckVoice, reactVoice, restore, scaleNote, snapTick, splash, trolleyBells, trolleyFlip, trolleyOff, trolleySet, trolleyWeight, unrollVoice } from './voices'

// The game on the toy: the vehicles at the two banks, a run over the bridge,
// the two scenes a run ends in, and the sheets (the roll and the rack). Pure,
// like the toy it extends. Everything the designed order needs is in save.ts
// and order.ts; this only says when their transitions happen.

/** A run being watched. */
export type Drive = {
  vehicle: VehicleId
  run: Run
  train: Train
  homeward: boolean
  seconds: number
  /** Each part's strain when it was last listened to, for the creaks, and how it is strained now. */
  heard: number[]
  strain: Strain[]
  /** The same run over the tracing laid on the board, if one is: its second line dips under the same vehicle at the same place. */
  tracing: Run | null
}

/** The trolley on its hook swings like a pendulum and comes to rest: how fast, how far at first, and how soon it dies away. */
export const SWING = { rate: 2.6, far: 0.3, dies: 2.6, heard: 0.05 } as const
/** How far it has swung, in radians, this long after it was set swinging. It starts at one end. */
export const swingAt = (since: number): number => (Number.isFinite(since) ? SWING.far * Math.exp(-since / SWING.dies) * Math.cos(SWING.rate * since) : 0)

/** How far the trolley must go along the deck, in cells, to have been run over the bridge: by the hand, or by trundling to the lowest point. */
export const RUN_OVER = 1

/** At the free yard: how far back the waiting vehicle can be drawn, how far sends it away, and how long it takes to leave, the next to draw up, and one let go early to roll up again. Cells and seconds. */
export const PULL = { most: 2.6, sends: 1, leaves: 0.8, arrives: 1, back: 0.3 } as const

/** How long a vehicle that makes room takes to drive off the sheet, in seconds. */
export const LEAVE = 1.4

/** How long the next roll takes to slide in when it arrives outside a crossing, in seconds. */
export const ROLL_IN = 1.9

type Lying = { frame: Frame; moved: (node: number) => readonly [number, number] }
const STRAIGHT: { share: number; off: readonly [number, number] }[] = []

const longOf = (id: VehicleId): number => Math.max(...VEHICLES[id].axles)
/** How tall each vehicle stands with its load, in cells: what a touch on it can reach. */
const TALL: Readonly<Record<VehicleId, number>> = { 'post-van': 2.1, 'jelly-truck': 1.9, 'piano-mover': 2.2, 'giraffe-bus': 3.3, 'caterpillar-bus': 1.6 }

/** Where the small model stands in the margin, beside the chief, in cells: a touch in this box means the model. */
export const MODEL = { x0: CHIEF.x + 1.55, x1: CHIEF.x + 4.6, y0: CHIEF.y - 0.2, y1: CHIEF.y + 2.3 } as const

/**
 * A whole arch over a stretch of the river: three or more firm parts, none a
 * thread, pinned end to end in a curve from one footing to another, rising
 * from the first and falling to the last and bending the same way at every
 * joint, with every joint in the air, and with both feet outside the stretch.
 */
export function wholeArch(bridge: readonly Part[], firm: readonly boolean[], footing: (point: Point) => boolean, over: readonly [number, number]): boolean {
  type Piece = { to: Point; slope: number }
  const onward = (from: Point): Piece[] => bridge.flatMap((part, index) => {
    if (!firm[index] || part.kind === 'thread' || part.loose) return []
    const [a, b] = pinsOf(part), other = samePoint(a, from) ? b : samePoint(b, from) ? a : null
    return other && other[0] > from[0] ? [{ to: other, slope: (other[1] - from[1]) / (other[0] - from[0]) }] : []
  })
  const climb = (at: Point, slope: number, pieces: number): boolean => onward(at).some((piece) => {
    if (piece.slope >= slope) return false
    if (footing(piece.to)) return pieces >= 2 && piece.slope < 0 && piece.to[0] >= over[1]
    return climb(piece.to, piece.slope, pieces + 1)
  })
  const feet = bridge.flatMap((part) => pinsOf(part)).filter((point) => footing(point) && point[0] <= over[0])
  return feet.some((foot) => onward(foot).some((first) => first.slope > 0 && !footing(first.to) && climb(first.to, first.slope, 1)))
}

export class Game extends Toy {
  drive: Drive | null = null
  show: Show = idleShow()
  /** During a give: the part that gave and where. The view draws it parted there. */
  gave: { part: number; spot: readonly [number, number] } | null = null
  /** During a give that began with wheels on a thread: the thread that let them down. The view draws it as a V down to the wheel. */
  dipped: { part: number } | null = null
  /** The last thing that went into the water, until the water is calm again. Short-lived: not saved. */
  splash: Splash | null = null
  /** Seconds since each vehicle was last touched: its answer to a poke is drawn from it. */
  poked = new Map<VehicleId, number>()
  /** The roadway reaches from lip to lip: a vehicle sent now has a road to try. */
  ready = false
  /** The tracing laid on the board for a comparison, by its place among the kept ones. Not saved: it is lifted again. */
  laidTracing: number | null = null
  /** Where the laid tracing's parts would lie under the same load at the same place: the second line. */
  tracingRest: Rest[] = []
  /** Seconds since the trolley was rung, since it was set down (it trundles from there), and since a part gave under it (it falls from there). */
  trolleyRung = Infinity
  trolleyRolled: { from: number; since: number } | null = null
  trolleyFell: { from: readonly [number, number]; since: number; rolled: boolean } | null = null
  /** Whether the part that gave under the vehicle gave by being squeezed: a tube squeezed past its limit buckles in the middle, and one pulled apart pops out of its pin. */
  private gaveSqueezed = false
  /** The showing the chief is giving: the neat way of an idea, filled in from the kind of failure it follows (or none, after a crossing), or the one change with the two differences that fill its models. */
  showing: { idea: Idea; failure: Ending['kind'] | null } | { differences: Difference[] } | null = null
  /** The part of the laid tracing that would give under the load the bridge is carrying: its line is drawn broken. */
  tracingGave: number | null = null
  /** What the bridge and the laid tracing lie by now: the frame and how far each of its points has moved. A plank's curve is read from it. */
  private lying: Lying | null = null
  private tracingLying: Lying | null = null
  /** The traced design has no way under the trolley where it stands: in that design the load would not be held at all. */
  tracingMisses = false
  /** Each part's share in use when the trolley was last heard on it, for the sounds as it is run along the deck. */
  private trolleyHeard: number[] = []
  /** Where the trolley last stood or hung: where it drops from when what held it is taken away. */
  private trolleyWas: readonly [number, number] | null = null
  /** The pencil ring as it was when the job vehicle crossed: it fades through the crossing's scene. What is saved has it gone already. */
  fading: Sheet['ring'] = null
  /** Seconds since the next roll began to slide in after a cycle judged badly; -1 while it waits for the give's scene to end; Infinity once it is there. */
  rollIn = Infinity
  /** Seconds since the trolley was set swinging on its hook. */
  swing = Infinity
  /** How the barge took the last crossing, on a sheet where one passes underneath: what it does during that crossing's scene. */
  bargeTook: Reaction | null = null
  /** Seconds since the oldest sheet slid off the end of the rack, and since the model in the margin was plucked. Short-lived: not saved. */
  slidOff = Infinity
  modelRung = Infinity
  /** Vehicles that made room on a bank of the free yard and are driving off the sheet. Short-lived: what is saved has them gone already. */
  leaving: { id: VehicleId; bank: 'near' | 'far'; place: number; since: number }[] = []
  /** Where the finger has the trolley while it is carried: on the deck, or null in the air. Undefined when it is not in the hand. Never saved. */
  private carriedAt: Sheet['trolley']['at'] | undefined = undefined
  /** A vehicle has the road: the trolley stands aside. Short-lived: not saved. */
  aside = false
  /** A part gave under the trolley: for a moment it is drawn broken where it gave. Short-lived: not saved. */
  trolleyBroke: { part: number; spot: readonly [number, number]; squeezed: boolean; since: number } | null = null
  /** Seconds since the trolley was flipped to ride under the plank, or back. */
  trolleyFlipped = Infinity
  /**
   * At the free yard: the vehicle the child drew back from the gap and let go
   * of. `away`, it is leaving for the next of the fleet, which draws up after
   * it; or it rolls up to the gap again. Short-lived: the line it leaves
   * behind is saved the moment it is let go.
   */
  swap: { id: VehicleId; pulled: number; since: number; away: boolean } | null = null
  /** A hat the chief has plucked off a part and wears until the next sheet is unrolled. Short-lived: not saved. */
  chiefHat = false
  /** The two who watch from the foot of the sheet. Their moves are short-lived: not saved. */
  readonly crew: Readonly<Record<CrewId, CrewDirector>>
  private moleUp = false
  private tailUp = false
  private owed: Idea | null = null
  private owedAfter: Ending['kind'] | null = null
  /** The threads plucked one after another, for the secret: every thread of the bridge from longest to shortest is a scale. */
  private tune: Part[] = []
  private tuneOn = ''
  private scene: Scene | null = null
  private urgent = false
  private sceneClock = 0
  /** A touch is ending the scene: its beats land where they were going, and none of their sounds is played late. */
  private skipping = false

  constructor(save: Save, random: () => number) {
    super(save, random)
    // The fields above are set after the toy has built itself, so the model is run again here, with the trolley on it.
    this.model()
    this.moving = this.rest.map(atRest)
    this.crew = { beaver: new CrewDirector('beaver', this.crewEyes('beaver'), random), mole: new CrewDirector('mole', this.crewEyes('mole'), random) }
    // Found as left: setting itself up makes no sound.
    this.voices = []
  }

  /** Where one of the crew stands on this sheet: its feet, in cells. */
  crewAt(who: CrewId): readonly [number, number] {
    const { crew, floor } = desk(this.at)
    return [crew[who === 'beaver' ? 0 : 1], floor]
  }

  private crewEyes(who: CrewId): readonly [number, number] {
    const [x, y] = this.crewAt(who)
    return [x, y + BUILD[who].eyes]
  }

  /** Where the work is now, for the crew's eyes: the finger's part, the vehicle on the road, the vehicle in the water. */
  private work(): readonly [number, number] | null {
    const hand = this.hand
    if (hand && 'finger' in hand) return hand.finger
    if (hand?.what === 'pin') return hand.at
    const seat = this.seatNow()
    if (seat) return [seat.x - 0.5, seat.y + 0.6]
    if (this.show.vehicle && this.show.kind === 'give') { const place = givePlace(this.show, this.at, longOf(this.show.vehicle), TAIL[this.show.vehicle]); return [place.x - 0.5, place.y + 0.5] }
    if (this.show.vehicle && this.show.kind === 'crossing') return [this.show.from[0], this.show.from[1] + 0.6]
    return null
  }

  /** The vehicles at the near bank, the front of the line first, and those parked on the far bank. */
  get waiting(): VehicleId[] { return standing(this.save) }
  get across(): VehicleId[] { return parked(this.save) }

  /** A scene is playing: the idle ladder waits. */
  get playing(): boolean { return (this.scene?.running ?? false) || this.drive !== null || (this.showing !== null && (this.chief.act === 'shows' || this.chief.act === 'compares')) }

  /** The test trolley of the sheet on the board. */
  /**
   * The trolley: its weights, and where it is now. What is saved is where the
   * child last let go of it. In the hand it is where the finger has it, and
   * that is not saved until it is let go; and while a vehicle has the road
   * (its run, and the scene after it) it stands aside in the tray, and is
   * back where it stood when the road is free again.
   */
  get trolley(): Sheet['trolley'] {
    const saved = this.save.sheets[this.save.on].trolley
    if (this.carriedAt !== undefined) return { ...saved, at: this.carriedAt }
    return this.aside && saved.at ? { ...saved, at: null } : saved
  }

  /** The small model that stands in the margin: the idea of this sheet's position, once it has been shown. */
  get marginModel(): Idea | null { return modelInMargin(this.save.sheets[this.save.on].site, this.save.shown) }

  /** Where the trolley is on the bridge now, in cells: on the deck, or at the pin it hangs from. Null in the tray. */
  trolleyPlace(): readonly [number, number] | null {
    const place = this.trolley.at
    if (!place) return null
    const drawn = (node: number): readonly [number, number] => { const [dx, dy] = this.answer.moved(node); return [this.frame.nodes[node].x + dx * DRAWN_DIP, this.frame.nodes[node].y + dy * DRAWN_DIP] }
    if ('pin' in place) { const node = this.frame.at.get(`${place.pin[0]},${place.pin[1]}`); return node === undefined ? null : drawn(node) }
    // On the way: at one of its points, or between two of them (on a tube, which has a point only at each pin).
    const road = roadOf(this.at, this.frame)
    for (let r = 0; r < road.nodes.length; r++) {
      const x0 = this.frame.nodes[road.nodes[r]].x
      if (x0 === place.x) return drawn(road.nodes[r])
      if (r + 1 < road.nodes.length && place.x > x0 && place.x < this.frame.nodes[road.nodes[r + 1]].x) {
        const from = drawn(road.nodes[r]), to = drawn(road.nodes[r + 1]), t = (place.x - x0) / (this.frame.nodes[road.nodes[r + 1]].x - x0)
        return [place.x, from[1] + (to[1] - from[1]) * t]
      }
    }
    return null
  }

  /** The part of the way the trolley stands on, where it stands on the deck: its index in the bridge. Null in the tray, on a hook, or exactly on a pin between two parts. */
  private trolleyOn(): number | null {
    const place = this.trolley.at
    if (!place || !('x' in place)) return null
    const road = roadOf(this.at, this.frame)
    for (let r = 0; r + 1 < road.nodes.length; r++) if (place.x > this.frame.nodes[road.nodes[r]].x && place.x < this.frame.nodes[road.nodes[r + 1]].x) return road.parts[r]
    return null
  }

  /**
   * How a plank lies between its two ends now: for each point along it, how
   * far along it is and how far off the straight line between the ends, in
   * cells. A plank bends in a smooth curve, deepest under the load; everything
   * else is straight. `traced` asks it of the tracing laid on the board.
   */
  bend(index: number, traced = false): { share: number; off: readonly [number, number] }[] {
    const lying = traced ? this.tracingLying : this.lying, line = lying?.frame.along.get(index)
    if (!lying || !line || line.length < 3) return STRAIGHT
    const at = (node: number): readonly [number, number] => { const point = lying.frame.nodes[node], [dx, dy] = lying.moved(node); return [point.x + dx * DRAWN_DIP, point.y + dy * DRAWN_DIP] }
    const first = at(line[0]), last = at(line[line.length - 1])
    return line.slice(1, -1).map((node, i) => {
      const share = (i + 1) / (line.length - 1), here = at(node)
      return { share, off: [here[0] - (first[0] + (last[0] - first[0]) * share), here[1] - (first[1] + (last[1] - first[1]) * share)] as const }
    })
  }

  /** True once after an outcome that must be saved at once: a scene's, a cycle's. */
  takeUrgent(): boolean {
    const urgent = this.urgent
    this.urgent = false
    return urgent
  }

  /** How a vehicle on a run sits on the road now. */
  seatNow(): Seat | null {
    const drive = this.drive
    if (!drive) return null
    const x = frontAt(this.at, drive.seconds, drive.homeward)
    return seat(this.at, drive.run, between(drive.run, stepAt(this.at, drive.run, x, drive.homeward)), drive.train, x, DRAWN_DIP, drive.homeward, this.bridge)
  }

  /**
   * The point of the V a thread makes under a wheel: the wheel itself while
   * the vehicle goes down to the water and sits there, and back up to the
   * thread's own line as the vehicle paddles away. Null when no thread is dipped.
   */
  dipPoint(): { part: number; at: readonly [number, number] } | null {
    const dipped = this.dipped, show = this.show
    if (!dipped || show.kind !== 'give' || !show.vehicle) return null
    const thread = this.drawn()[dipped.part]
    if (!thread) return null
    const [a, b] = thread.a[0] <= thread.b[0] ? [thread.a, thread.b] : [thread.b, thread.a]
    const wheel = givePlace(show, this.at, longOf(show.vehicle), TAIL[show.vehicle])
    const x = Math.max(a[0] + 0.1, Math.min(b[0] - 0.1, show.from[0])), level = a[1] + ((b[1] - a[1]) * (x - a[0])) / Math.max(b[0] - a[0], 0.2)
    // It goes down with the wheel as far as the water's surface. It lets go of the wheel in the first third of the
    // paddle and is straight again.
    const held = 1 - Math.min(1, show.paddle * 3)
    return held <= 0 ? null : { part: dipped.part, at: [x + (wheel.x - x) * held * show.fall, level + (Math.min(level, Math.max(WATER, wheel.y)) - level) * held] }
  }

  /**
   * During a give, the two pieces of the part that broke: each hangs from its
   * own pin, as far down as the ground lets it, and they close up again as the
   * bridge goes back as built. Each piece is its hinge and its tip, in cells.
   * Null when nothing broke in two: no part gave, or a tube's end popped out.
   */
  pieces(): { part: number; kind: Kind; turned: boolean; near: readonly [Point, Point]; far: readonly [Point, Point] } | null {
    const show = this.show, broke = this.trolleyBroke
    const gave = this.gave && show.kind === 'give' ? this.gave : broke
    if (!gave) return null
    const part = this.bridge[gave.part]
    // A tube pulled apart does not break: its end pops out of its pin. Squeezed past its limit it buckles in the middle like any other.
    if (!part || (part.kind === 'tube' && !(gave === broke ? broke.squeezed : this.gaveSqueezed))) return null
    const whole = length(part), dx = part.b[0] - part.a[0], dy = part.b[1] - part.a[1]
    // Where along it the break is: its spot, kept off both ends.
    const along = Math.max(0.15, Math.min(0.85, ((gave.spot[0] - part.a[0]) * dx + (gave.spot[1] - part.a[1]) * dy) / (whole * whole)))
    const eased = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u) }
    const fallen = gave === broke ? eased(broke.since / 0.25) * (1 - eased((broke.since - 0.9) / 0.35)) : eased(show.snap * 0.4 + show.fall * 1.5) * (1 - eased(show.restore))
    const hang = (hinge: Point, long: number, from: number): Point => {
      // The short way round to straight down, and no further than the ground allows.
      let turn = -Math.PI / 2 - from
      while (turn > Math.PI) turn -= 2 * Math.PI
      while (turn < -Math.PI) turn += 2 * Math.PI
      let clear = 0
      for (let k = 1; k <= 24; k++) {
        const angle = from + (turn * k) / 24
        if ([0.5, 0.75, 1].some((share) => groundAt(this.at, hinge[0] + Math.cos(angle) * long * share) > hinge[1] + Math.sin(angle) * long * share + 0.03)) break
        clear = k / 24
      }
      const angle = from + turn * Math.min(fallen, clear)
      return [hinge[0] + Math.cos(angle) * long, hinge[1] + Math.sin(angle) * long]
    }
    const was = Math.atan2(dy, dx)
    return { part: gave.part, kind: part.kind, turned: part.turned, near: [part.a, hang(part.a, whole * along, was)], far: [part.b, hang(part.b, whole * (1 - along), was + Math.PI)] }
  }

  /**
   * The model, with the trolley where it stands or hangs: the bridge lies as
   * the frame answers under that one load. A part that gives under it gets the
   * ring, and the trolley drops back to the tray. A tracing laid on the board
   * is answered under the same load at the same place.
   */
  protected override model(): void {
    super.model()
    this.ready = roadOf(this.at, this.frame).complete
    const footing = isFooting(this.at), ground = (x: number) => groundAt(this.at, x)
    const trolley = this.trolley, place = trolley.at
    const under = (parts: readonly Part[]) => (!place ? null : 'x' in place ? park(this.at, parts, place.x, trolley.weights) : hang(this.at, parts, place.pin, trolley.weights))
    if (place) {
      const loaded = under(this.bridge)
      if (!loaded || loaded.ending) {
        // What held it gave, or nothing holds it there any more (the part it stood on was taken off): it drops into
        // the water, bobs, and is back in the tray, and the bridge lies with nothing on it.
        if (loaded?.ending) this.trolleyGave(loaded.ending)
        else this.trolleyDrops(false)
        // It is back in the tray, and out of the hand if it was in one: the carry is over.
        this.carriedAt = undefined
        if (this.hand?.what === 'trolley') this.hand = null
        this.save = setTrolley(this.save, trolley.weights, null)
        this.changed = true
      } else {
        this.frame = loaded.frame
        this.answer = answerOf(loaded.step)
        this.rest = rests(this.bridge, loaded.frame, this.answer, footing, ground)
      }
    }
    this.lying = { frame: this.frame, moved: this.answer.moved }
    this.trolleyWas = this.trolleyPlace() ?? this.trolleyWas
    const tracing = this.laidTracing === null || this.laidTracing === undefined ? null : this.save.sheets[this.save.on].tracings[this.laidTracing]
    this.tracingGave = null
    this.tracingMisses = false
    if (!tracing) { this.tracingRest = []; this.tracingLying = null; return }
    // The tracing under the same load at the same place. A design that would give under it is still drawn under it, and
    // the part that would give is drawn broken: the weaker design looks the weaker.
    const loaded = this.trolley.at ? under(tracing) : null
    if (loaded) {
      const answer = answerOf(loaded.step)
      this.tracingRest = rests(tracing, loaded.frame, answer, footing, ground)
      this.tracingLying = { frame: loaded.frame, moved: answer.moved }
      if (loaded.ending?.kind === 'gives') this.tracingGave = loaded.ending.part
    } else {
      // No way passes that place in the traced design: the same load there would go straight into the water.
      this.tracingMisses = this.trolley.at !== null
      const alone = this.modelOf(tracing)
      this.tracingRest = alone.rest
      this.tracingLying = { frame: alone.frame, moved: alone.answer.moved }
    }
  }

  /** The trolley lost what it stood on or hung from: it drops into the water where it was, with a splash, and bobs. `rolled` is true when a tube rolled it off, which has its own plop. */
  private trolleyDrops(rolled: boolean): void {
    const from = this.trolleyWas ?? [this.at.left[0] + 1, this.at.left[1]]
    this.trolleyFell = { from, since: 0, rolled }
    this.voices.push(rolled ? plop : splash(this.trolley.weights))
    this.splash = { x: Math.max(this.at.left[0] + 0.3, Math.min(this.at.right[0] - 0.3, from[0])), since: -0.45, big: 0.4 }
  }

  /** A part gave under the trolley, or the build folded: it is heard, the spot is ringed, and the trolley falls from where it was. */
  private trolleyGave(ending: Ending): void {
    this.trolleyFell = { from: this.trolleyPlace() ?? [this.at.left[0] + 1, this.at.left[1]], since: 0, rolled: false }
    if (ending.kind === 'gives') {
      const kind = this.bridge[ending.part].kind
      this.voices.push(give(ending.strain === 'pull' || ending.strain === 'bow' || ending.strain === 'squeeze' ? ending.strain : 'bend', kind))
      this.save = ringed(this.save, { part: ending.part, spot: ending.spot })
      // And it is seen: the part hangs in two pieces where it gave, for a moment, and closes up again.
      this.trolleyBroke = { part: ending.part, spot: ending.spot, squeezed: ending.strain === 'bow' || ending.strain === 'squeeze', since: 0 }
    } else if (ending.kind === 'folds') this.voices.push(foldVoiceOf(this.bridge.length))
    this.voices.push(splash(this.trolley.weights))
    this.splash = { x: this.trolleyFell.from[0], since: -0.45, big: 0.4 }
  }

  // --- Gestures ------------------------------------------------------------------

  override press(x: number, y: number): void {
    // A touch ends a scene, and is then an ordinary touch.
    let began = false
    // What the scene was still bringing in when this touch ended it: the touch that ends a scene does not also take the
    // roll or the vehicle that scene's last beat brings.
    const coming = this.scene?.running ? { roll: (this.show.rollArrives && this.show.arrive < 1) || this.rollIn === -1, vehicle: this.show.arrive < 1 ? this.show.arriving : null } : null
    if (this.scene?.running) {
      this.skipping = true; this.scene.finish(); began = this.afterScene(); this.skipping = false
      // The bridge is back exactly as built, at once: what had swung or fallen is where it was laid.
      this.moving = this.rest.map(atRest)
    }
    // While a vehicle is on the bridge the bridge is not changed under it. A part touched then is plucked, and is not
    // turned or taken off; any other touch is answered with a tick and no more.
    if (this.drive) {
      const own = touched(this.at, this.bridge, this.drawn(), x, y)
      if (own && 'part' in own) { this.voices.push(this.pluckOf(own.part)); this.shook[own.part] = 0 } else this.voices.push(pinTick)
      this.hand = null
      return
    }
    // A touch ends a showing too: the chief stops where it is, and the showing has been given.
    // A showing that this very touch let begin, by ending the scene before it, goes on: the next touch ends it.
    if (!began && this.showing && (this.chief.act === 'shows' || this.chief.act === 'compares')) { this.chief.rest(); if ('differences' in this.showing) this.showing = null }
    this.owed = null
    const tool = toolAt(this.at, x, y)
    if (tool?.tool === 'trolley') { this.hand = { what: 'trolley', placed: false, carried: false, finger: [x, y], ran: 0, home: this.trolley.at }; this.voices.push(pinTick); return }
    if (tool?.tool === 'tracing') { this.hand = { what: 'tracing', spot: tracingSpot(tool, x, y), carried: false, finger: [x, y] }; this.voices.push(unrollVoice(0)); return }
    const cart = this.trolleyPlace()
    // Where it is drawn: over the deck when it stands on it, under the pin or the plank when it hangs.
    const hangs = this.trolley.at !== null && ('pin' in this.trolley.at || this.trolley.at.under)
    if (cart && Math.hypot(x - cart[0], y - cart[1] - (hangs ? -0.6 : 0.3)) <= TROLLEY_REACH) { this.hand = { what: 'trolley', placed: true, carried: false, finger: [x, y], ran: 0, home: this.trolley.at }; this.voices.push(pinTick); return }
    // A hat hanging on a part comes off at a touch, and the chief wears it.
    const sheet = this.save.sheets[this.save.on], ends = this.drawn()
    const hat = sheet.hats.find((index) => ends[index] && Math.hypot(x - (ends[index].a[0] + ends[index].b[0]) / 2, y - (ends[index].a[1] + ends[index].b[1]) / 2 - 0.2) <= 0.45)
    if (hat !== undefined) { this.save = pluckHat(this.save, hat); this.chiefHat = true; this.changed = true; this.voices.push(unrollVoice(0)); this.chief.poke(); this.hand = null; return }
    // The roll, before a vehicle parked in front of it: a touch on the roll unrolls.
    if (this.save.next && onNewest(this.save) && onRoll(this.at, x, y)) {
      if (coming?.roll) { this.hand = null; return }
      this.hand = { what: 'roll' }; this.voices.push(unrollVoice(0)); return
    }
    // A touch at a lip's own pin, or at a pin a part ends on, means that pin, though a vehicle's nose is over it.
    const grid = gridPointAt(this.at, x, y)
    const pinFirst = grid !== null && grid.far <= PIN_REACH && (samePoint(grid.point, this.at.left) || samePoint(grid.point, this.at.right) || this.bridge.some((part) => pinsOf(part).some((point) => samePoint(point, grid.point))))
    const vehicle = pinFirst ? null : this.vehicleAt(x, y)
    if (vehicle && coming?.vehicle === vehicle.id) { this.hand = null; return }
    if (vehicle) {
      this.hand = { what: 'vehicle', id: vehicle.id, across: vehicle.across, from: x, pulled: 0 }
      this.poked.set(vehicle.id, 0)
      this.voices.push(honk(vehicle.id))
      // Its horn, seen: three arcs in front of its nose.
      const long = longOf(vehicle.id), front = vehicle.across ? parkAt(this.at, long, this.across.indexOf(vehicle.id)) : waitAt(this.at, this.waiting.indexOf(vehicle.id))
      this.mark('toot', [front + 0.85, (vehicle.across ? this.at.right[1] : this.at.left[1]) + 0.75])
      return
    }
    const slot = this.save.sheets.length > 1 ? rackSlot(this.save.sheets.length, x, y) : -1
    if (slot >= 0) { this.hand = { what: 'rack', index: slot }; this.voices.push(unrollVoice(0)); return }
    // One of the crew, poked: each has its own answer.
    for (const who of ['beaver', 'mole'] as const) {
      const [cx, cy] = this.crewAt(who)
      if (Math.abs(x - cx) <= BUILD[who].wide / 2 && y >= cy - 0.3 && y <= cy + BUILD[who].tall + 0.15) {
        this.hand = { what: 'crew', who }
        this.crew[who].react('poked')
        this.voices.push(who === 'beaver' ? beaverSlap : moleDrop)
        this.mark('dust', [cx - (who === 'beaver' ? 0.9 : -0.9), cy + 0.05])
        return
      }
    }
    // The model in the margin gives under a finger with a creak, like the bridge it is a model of.
    if (this.marginModel && x >= MODEL.x0 && x <= MODEL.x1 && y >= MODEL.y0 && y <= MODEL.y1) { this.hand = { what: 'model' }; this.voices.push(creak(0.35)); return }
    const traced = this.tracedAt(x, y)
    if (traced !== null) {
      const part = sheet.tracings[this.laidTracing!][traced]
      this.hand = { what: 'traced', index: traced }
      this.voices.push(snapTick(part.kind, length(part)))
      return
    }
    super.press(x, y)
  }

  /**
   * The part of the laid tracing under a touch that the bridge does not have:
   * a tap on it copies that one part onto the bridge. A touch on a pin or on a
   * part of the bridge itself means that pin or that part, as ever.
   */
  private tracedAt(x: number, y: number): number | null {
    const tracing = this.laidTracing === null ? null : this.save.sheets[this.save.on].tracings[this.laidTracing]
    if (!tracing) return null
    const grid = gridPointAt(this.at, x, y), own = touched(this.at, this.bridge, this.drawn(), x, y)
    if ((grid && grid.far <= PIN_REACH) || (own && 'part' in own)) return null
    const same = (a: Part, b: Part) => a.kind === b.kind && ((samePoint(a.a, b.a) && samePoint(a.b, b.b)) || (samePoint(a.a, b.b) && samePoint(a.b, b.a)))
    let found: number | null = null, far = PART_REACH
    tracing.forEach((part, index) => {
      const rest = this.tracingRest[index]
      if (!rest || this.bridge.some((built) => same(built, part))) return
      const d = farFromStretch(x, y, rest.a, rest.b)
      if (d <= far) { far = d; found = index }
    })
    return found
  }

  override tap(): void {
    const hand = this.hand
    if (hand?.what === 'vehicle') {
      this.hand = null
      const id = hand.id as VehicleId
      if (hand.across) { this.send(id, true); return }
      // One that is leaving the yard, or drawing up to it, is not sent.
      if (this.swap) return
      // Only the vehicle at the front of the line sets off; one behind it comes to the front first.
      if (this.waiting[0] === id) this.send(id, false)
      else { this.save = toFront(this.save, id); this.changed = true }
      return
    }
    if (hand?.what === 'trolley') { this.hand = null; this.tapTrolley(hand.placed); return }
    if (hand?.what === 'tracing') { this.hand = null; this.tapTracing(hand.spot); return }
    if (hand?.what === 'roll') {
      this.hand = null
      this.chiefHat = false
      const had = this.save.sheets
      this.turn(unroll(this.save))
      // The rack was full: the oldest sheet slides off its end, in view.
      if (this.save.sheets.length === had.length && this.save.sheets[0] !== had[0]) this.slidOff = 0
      return
    }
    if (hand?.what === 'model') { this.hand = null; this.modelRung = 0; this.voices.push(pluckVoice('stick', 0.5, 0.8, false)); return }
    if (hand?.what === 'traced') {
      this.hand = null
      const tracing = this.laidTracing === null ? null : this.save.sheets[this.save.on].tracings[this.laidTracing], part = tracing?.[hand.index]
      if (!part) return
      // One part of the tracing is copied onto the bridge, if the kit still has one of its kind.
      const copy = layPart(this.bridge, { kind: part.kind, a: part.a, b: part.b, turned: part.turned }, this.at.kit)
      this.voices.push(copy.result.voice)
      if (copy.bridge.length > this.bridge.length) this.commit(copy.bridge, this.bridge.length)
      return
    }
    if (hand?.what === 'rack') { this.hand = null; if (hand.index !== this.save.on) this.turn(turnTo(this.save, hand.index)); return }
    super.tap()
  }

  override dragStart(): void {
    const hand = this.hand
    if (hand?.what === 'trolley') { hand.carried = true; this.carriedAt = this.save.sheets[this.save.on].trolley.at; return }
    if (hand?.what === 'tracing') { hand.carried = true; return }
    if (hand?.what === 'vehicle') return
    super.dragStart()
  }

  /** At the free yard the one vehicle that waits can be drawn back from the gap and sent away for the next of the fleet. */
  private pulls(id: string): boolean {
    return isYard(this.at) && onNewest(this.save) && !this.swap && !this.drive && this.show.kind === null && this.waiting.length === 1 && this.waiting[0] === id
  }

  override dragMove(x: number, y: number): void {
    const hand = this.hand
    // The waiting vehicle rolls back with the finger, as far as its own length.
    if (hand?.what === 'vehicle') { if (!hand.across && this.pulls(hand.id)) hand.pulled = Math.max(0, Math.min(PULL.most, hand.from - x)); return }
    if (hand?.what === 'tracing') { hand.finger = [x, y]; return }
    if (hand?.what === 'trolley') { hand.finger = [x, y]; if (hand.carried) this.runTrolley(hand, x, y); return }
    super.dragMove(x, y)
  }

  override dragEnd(): void {
    const hand = this.hand
    if (hand?.what === 'vehicle') {
      this.hand = null
      const id = hand.id as VehicleId, next = hand.pulled >= PULL.sends ? sentAway(this.save, id) : this.save
      // Drawn back far enough, it goes; let go sooner, it rolls up to the gap again.
      this.swap = { id, pulled: hand.pulled, since: 0, away: next !== this.save }
      if (next !== this.save) { this.save = next; this.changed = true; this.voices.push(honk(id)) }
      return
    }
    if (hand?.what === 'trolley') { this.hand = null; if (hand.carried) this.dropTrolley(hand.finger[0], hand.finger[1], hand.ran); return }
    if (hand?.what === 'tracing') {
      this.hand = null
      // A kept tracing carried up onto the board changes places with the bridge.
      const board = !toolAt(this.at, hand.finger[0], hand.finger[1]) && hand.finger[1] > 0
      if (hand.carried && hand.spot !== 'pad' && board && this.save.sheets[this.save.on].tracings[hand.spot]) {
        this.laidTracing = null
        this.reseat(swapTracing(this.save, hand.spot))
      }
      return
    }
    super.dragEnd()
  }

  /**
   * The game is put away, or parked under the child's hand. A run is a view of
   * the saved bridge and is not saved: the vehicle stands at the near bank
   * again and the bridge is as built. A scene goes on where it was when the
   * child comes back: its outcome was saved when it started.
   */
  /** The touch ended with nothing done. The trolley in the hand, which may have been riding the deck under the finger, is back where it was taken from. */
  override pressEnd(): void {
    const carrying = this.carriedAt !== undefined
    super.pressEnd()
    if (!carrying) return
    this.carriedAt = undefined
    this.model()
  }

  putAway(): void {
    this.pressEnd()
    const drive = this.drive
    if (!drive) return
    // On its way home it is home: the vehicle stands at the near bank, as after any run that was put away.
    if (drive.homeward) { this.save = sentHome(this.save, drive.vehicle); this.changed = true; this.urgent = true }
    this.drive = null
    this.aside = false
    this.crew.beaver.brace(false)
    this.model()
    this.moving = this.rest.map(atRest)
  }

  /** A part laid is a thing to measure: the mole does, twice, unless it is in the middle of something. */
  protected override commit(bridge: readonly Part[], added = -1): void {
    // What was just turned, if this change is a turn (the toy starts its turn's clock before it commits).
    const spun = added >= 0 ? -1 : this.turned.findIndex((since) => since === 0), on = this.trolleyOn(), place = this.trolley?.at
    super.commit(bridge, added)
    if (added >= 0 && this.crew && !this.crew.mole.busy) this.crew.mole.react('laid')
    const part = spun >= 0 ? this.bridge[spun] : undefined
    if (!part || !place) return
    // A tube rolls as it is turned: the trolley parked on it log-rolls off into the water with a plop.
    if (part.kind === 'tube' && on === spun && this.trolley.at) {
      this.trolleyDrops(true)
      this.save = setTrolley(this.save, this.trolley.weights, null)
      this.model()
    }
    // A thread whirls as it is turned: the trolley hung on one of its pins swings.
    if (part.kind === 'thread' && 'pin' in place && pinsOf(part).some((point) => samePoint(point, place.pin))) { this.swing = 0; this.voices.push(pendulumSqueak(false)) }
  }

  /**
   * A secret, which works every time and is never hinted: the threads of a
   * bridge plucked one after another from the longest to the shortest play a
   * scale, and the chief taps along. It works with any two threads or more.
   */
  protected override plucked(index: number): void {
    const part = this.bridge[index]
    // A slack thread only flops: it sounds no note, and a run of notes ends at it.
    if (!part || part.kind !== 'thread' || this.rest[index]?.slack) { this.tune = []; return }
    // The run is of threads, not of places in a list: it is kept as the threads themselves, so a part laid or taken
    // off between two plucks cannot make it mean another thread. One of its threads gone from the bridge, or another
    // sheet on the board, and it starts again.
    const same = (a: Part, b: Part) => samePoint(a.a, b.a) && samePoint(a.b, b.b)
    const where = (thread: Part) => this.bridge.findIndex((other) => other.kind === 'thread' && same(other, thread))
    const board = this.save.sheets[this.save.on], sheet = `${board.site} ${board.variant} ${this.save.on} ${this.save.sheets.length}`
    if (this.tuneOn !== sheet || this.tune.some((thread) => where(thread) < 0)) this.tune = []
    this.tuneOn = sheet
    this.tune.push(part)
    // A thread plucked by itself is only its own voice: nothing hints at the secret. Plucked after a longer one (or
    // one as long) it sounds the scale so far, and each one after that the next note, starting again when the order
    // breaks: so the threads of a bridge, from longest to shortest, play a scale.
    let run = 1
    while (run < this.tune.length && run < 8) {
      const here = this.tune[this.tune.length - run], before = this.tune[this.tune.length - run - 1]
      if (this.tune.slice(-run).some((thread) => same(thread, before)) || length(before) < length(here) - 1e-9) break
      run++
    }
    if (run === 2) this.voices.push(scaleStart)
    else if (run > 2) this.voices.push(scaleNote(run - 1))
    // The threads that count are the ones that hold something: a slack one has no note to give.
    const threads = this.bridge.flatMap((other, i) => (other.kind === 'thread' && !this.rest[i]?.slack ? [i] : []))
    const last = this.tune.slice(-threads.length), longs = last.map((thread) => length(thread)), places = last.map(where)
    if (threads.length < 2 || last.length < threads.length || new Set(places).size < threads.length || !places.every((place) => threads.includes(place))) return
    // From longest to shortest: threads of one length may come in either order.
    if (!longs.every((long, i) => i === 0 || long <= longs[i - 1] + 1e-9)) return
    this.tune = []
    this.chief.react('taps-and-listens')
    this.voices.push(chiefTaps(longs.slice(0, 3).map((long) => 440 * Math.sqrt(4 / long))))
  }

  // --- The trolley and the tracing paper -------------------------------------------

  private tapTrolley(placed: boolean): void {
    const trolley = this.trolley
    if (placed) {
      // A tap rings one bell for each weight; a second tap while it rings flips it to ride under the plank, or back.
      if (this.trolleyRung < RING && trolley.at && 'x' in trolley.at) {
        // It flips with a clank to ride under the plank, or back on top, and rolls to the lowest point as the deck lies now.
        const low = lowPoint(this.at, this.bridge, trolley.at.x, trolley.weights) ?? trolley.at.x
        this.trolleyRolled = { from: trolley.at.x, since: 0 }
        this.save = setTrolley(this.save, trolley.weights, { x: low, under: !trolley.at.under })
        this.voices.push(trolleyFlip)
        this.trolleyFlipped = 0
        this.trolleyRung = Infinity
        this.changed = true
        this.model()
      } else {
        this.voices.push(trolleyBells(trolley.weights)); this.trolleyRung = 0
        // On its hook a tap sets it swinging again.
        if (trolley.at && 'pin' in trolley.at) { this.swing = 0; this.voices.push(pendulumSqueak(false)) }
      }
      return
    }
    // A tap on its compartment puts one more weight on, and after six it starts again at one.
    const weights = (trolley.weights % 6) + 1
    this.save = setTrolley(this.save, weights, trolley.at)
    // After six the stack starts again at one: five weights come off with a jingle, and none lands.
    this.voices.push(weights === 1 && trolley.weights > 1 ? trolleyOff(trolley.weights - 1) : trolleyWeight(weights))
    this.changed = true
    this.model()
    this.loadSound()
  }

  /** The trolley let go at a place: on the deck it trundles to the low point, at a pin it hangs, anywhere else it goes back to the tray. */
  private dropTrolley(x: number, y: number, hadRun = 0): void {
    // Let go: from here on it is where the child put it, and that is saved.
    const trolley = this.trolley, snapped = Math.round(x * 2) / 2, was = trolley.at, riding = was !== null && 'x' in was && this.carriedAt !== undefined
    this.carriedAt = undefined
    const onDeck = park(this.at, this.bridge, snapped, trolley.weights)
    // The height of the way at that place: at one of its points, or between two (a tube has a point only at each pin).
    const way = onDeck ? roadOf(this.at, onDeck.frame).nodes.map((n) => onDeck.frame.nodes[n]) : []
    const before = way.filter((n) => n.x <= snapped).pop(), after = way.find((n) => n.x >= snapped)
    const deckY = before && after ? (after.x === before.x ? before.y : before.y + ((after.y - before.y) * (snapped - before.x)) / (after.x - before.x)) : Infinity
    const pin = [Math.round(x), Math.round(y)] as const
    let ran = hadRun
    // Let go on a pin that is no point of the road, it hangs from that pin by its hook, however near the deck the pin is.
    const onRoad = way.some((n) => Math.abs(n.x - pin[0]) < 0.01 && Math.abs(n.y - pin[1]) < 0.6)
    const hooks = Math.hypot(x - pin[0], y - pin[1]) <= 0.45 && !onRoad && !isFooting(this.at)(pin) && hang(this.at, this.bridge, pin, trolley.weights) !== null
    if (!hooks && onDeck && Math.abs(y - deckY) <= 1 && snapped > this.at.left[0] && snapped < this.at.right[0]) {
      const rest = lowPoint(this.at, this.bridge, snapped, trolley.weights) ?? snapped
      this.save = setTrolley(this.save, trolley.weights, { x: rest, under: false })
      this.trolleyRolled = { from: snapped, since: 0 }
      // Its clink was heard when it came onto the deck under the finger: once is enough.
      if (!riding) this.voices.push(trolleySet)
      // Let go, it trundles on to the lowest point: that is a run too.
      ran += Math.abs(rest - snapped)
    } else if (hooks) {
      this.save = setTrolley(this.save, trolley.weights, { pin })
      // It swings from where it was let go, with a squeak at each end, until it hangs still.
      this.swing = 0
      this.voices.push(pendulumSqueak(false))
    } else {
      this.save = setTrolley(this.save, trolley.weights, null)
      // Back to the tray: with its jingle if it came off the bridge, and a tick if there was nowhere there for it to go.
      this.voices.push(was ? trolleyOff(trolley.weights) : pinTick)
    }
    this.changed = true
    this.model()
    this.loadSound()
    if (ran >= RUN_OVER) this.compare()
  }

  /**
   * The trolley in the hand, over the deck: it rides the deck under the finger,
   * half a cell at a time, and the bridge (and a tracing laid on it) lies under
   * it as the model answers at each place. Off the deck it is in the hand
   * again. Run a cell or more along a bridge with a tracing laid on it, the
   * two designs have been compared.
   */
  private runTrolley(hand: Extract<Hand, { what: 'trolley' }>, x: number, y: number): void {
    const trolley = this.trolley, snapped = Math.round(x * 2) / 2, was = trolley.at
    const onDeck = snapped > this.at.left[0] && snapped < this.at.right[0] ? park(this.at, this.bridge, snapped, trolley.weights) : null
    const way = onDeck ? roadOf(this.at, onDeck.frame).nodes.map((n) => onDeck.frame.nodes[n]) : []
    const before = way.filter((n) => n.x <= snapped).pop(), after = way.find((n) => n.x >= snapped)
    const deckY = before && after ? (after.x === before.x ? before.y : before.y + ((after.y - before.y) * (snapped - before.x)) / (after.x - before.x)) : Infinity
    if (onDeck && Math.abs(y - deckY) <= 1) {
      if (was && 'x' in was && was.x === snapped) return
      if (was && 'x' in was) hand.ran += Math.abs(snapped - was.x)
      else { this.voices.push(trolleySet); this.trolleyHeard = [] }
      // Where the finger has it: the model answers there, and nothing is saved until it is let go.
      this.carriedAt = { x: snapped, under: false }
      this.model()
      // Each part is heard as it takes the trolley, as under a vehicle.
      if (this.trolley.at) {
        const now = this.answer.parts.map((part) => part.use)
        for (const due of creaks(this.trolleyHeard, now)) if (this.bridge[due.part]) this.voices.push(loadVoice(this.bridge[due.part].kind, due.use))
        this.trolleyHeard = now
        if (hand.ran >= RUN_OVER) this.compare()
      }
    } else if (was && 'x' in was) {
      // Lifted off the deck: it is in the hand, the deck springs back and the weights jingle.
      this.voices.push(trolleyOff(trolley.weights))
      this.carriedAt = null
      this.model()
    }
  }

  /** Under the trolley the part that works hardest is heard, in its own kind's voice: a plank creaks lower the deeper it bends, a stick squeaks higher, a tube crackles, a thread hums. */
  private loadSound(): void {
    if (!this.trolley.at) return
    let most = -1
    this.answer.parts.forEach((state, index) => { if (state.use > 0.05 && (most < 0 || state.use > this.answer.parts[most].use)) most = index })
    if (most >= 0 && this.bridge[most]) this.voices.push(loadVoice(this.bridge[most].kind, this.answer.parts[most].use))
  }

  private tapTracing(spot: 'pad' | 0 | 1): void {
    const sheet = this.save.sheets[this.save.on]
    if (spot === 'pad') {
      if (this.bridge.length === 0) return
      // A white line copy of the bridge as it stands: a third takes the place of the oldest.
      this.laidTracing = null
      this.save = trace(this.save)
      this.changed = true
      this.voices.push(unrollVoice(1))
      this.model()
      return
    }
    if (!sheet.tracings[spot]) return
    // A kept tracing is laid on the board, or lifted again.
    this.laidTracing = this.laidTracing === spot ? null : spot
    this.voices.push(unrollVoice(1))
    this.model()
  }

  /** With a tracing laid and the trolley on the bridge, the two are compared. The first time they differ in more than one part, the chief shows one clean comparison. */
  private compare(): void {
    const sheet = this.save.sheets[this.save.on], place = this.trolley.at
    if (this.laidTracing === null || !place || !('x' in place)) return
    const tracing = sheet.tracings[this.laidTracing]
    if (!tracing || !oneChangeDue(this.bridge, tracing, this.save.shown)) return
    this.showing = { differences: nearestDifferences(this.bridge, tracing, place.x) }
    this.save = markShown(this.save, 'one-change')
    this.urgent = true
    this.changed = true
    this.chief.showing('compares')
  }

  /** The bridge on the board was changed for another whole: every part is found where it rests. */
  private reseat(save: Save): void {
    this.save = save
    this.model()
    this.moving = this.rest.map(atRest)
    this.rung = this.bridge.map(() => Infinity); this.turned = this.bridge.map(() => Infinity); this.laid = this.bridge.map(() => Infinity); this.shook = []
    this.flying = []
    this.voices.push(unrollVoice(1))
    this.changed = true
  }

  // --- Time ----------------------------------------------------------------------

  override step(dt: number): void {
    this.sceneClock += dt
    if (this.swap) {
      const before = this.swap.since
      this.swap.since += dt
      // The next of the fleet sounds its horn as it draws up.
      if (this.swap.away && before < PULL.leaves && this.swap.since >= PULL.leaves && this.waiting[0]) this.voices.push(honk(this.waiting[0]))
      if (this.swap.since >= (this.swap.away ? PULL.leaves + PULL.arrives : PULL.back)) this.swap = null
    }
    this.trolleyRung += dt
    this.modelRung += dt
    if (this.splash && (this.splash.since += dt) > CALM) this.splash = null
    this.stepCrew(dt)
    if (this.rollIn >= 0 && this.rollIn < Infinity && (this.rollIn += dt) >= ROLL_IN) this.rollIn = Infinity
    // The trolley on its hook: a squeak at each end of its swing, for as long as it swings far enough to be heard.
    if (this.swing < Infinity) {
      const hung = this.trolley.at !== null && 'pin' in this.trolley.at, before = Math.floor((SWING.rate * this.swing) / Math.PI)
      this.swing += dt
      const end = Math.floor((SWING.rate * this.swing) / Math.PI), far = SWING.far * Math.exp(-this.swing / SWING.dies)
      if (!hung || far < 0.01) this.swing = Infinity
      else if (end !== before && far > SWING.heard) this.voices.push(pendulumSqueak(end % 2 === 1))
    }
    this.slidOff = this.slidOff < SLIDE_OFF ? this.slidOff + dt : Infinity
    if (this.trolleyRolled && (this.trolleyRolled.since += dt) > 0.7) this.trolleyRolled = null
    if (this.trolleyFell && (this.trolleyFell.since += dt) > 1.1) this.trolleyFell = null
    if (this.trolleyBroke && (this.trolleyBroke.since += dt) > 1.3) this.trolleyBroke = null
    if (this.leaving.length) { for (const one of this.leaving) one.since += dt; this.leaving = this.leaving.filter((one) => one.since < LEAVE) }
    this.trolleyFlipped += dt
    if (this.showing && 'differences' in this.showing && this.chief.act !== 'compares') this.showing = null
    if (this.showing && 'idea' in this.showing && this.chief.act !== 'shows') this.showing = null
    for (const [id, since] of this.poked) { if (since > 2) this.poked.delete(id); else this.poked.set(id, since + dt) }
    const drive = this.drive
    if (drive) {
      drive.seconds += dt
      const x = frontAt(this.at, drive.seconds, drive.homeward), progress = stepAt(this.at, drive.run, x, drive.homeward)
      const answer = between(drive.run, progress)
      // The bridge lies as the model says it does under the load where it is now.
      this.rest = rests(this.bridge, drive.run.frame, answer, isFooting(this.at), (gx) => groundAt(this.at, gx))
      this.lying = { frame: drive.run.frame, moved: answer.moved }
      // Each part is heard as it takes the load, in its own kind's voice.
      for (const due of creaks(drive.heard, answer.use)) this.voices.push(this.bridge[due.part] ? loadVoice(this.bridge[due.part].kind, due.use) : creak(due.use))
      // A tracing laid on the board dips under the same vehicle at the same place: as far as its own run got.
      const traced = this.laidTracing === null ? null : this.save.sheets[this.save.on].tracings[this.laidTracing]
      if (drive.tracing && traced) {
        const last = drive.tracing.steps.length - 1, under = between(drive.tracing, Math.min(progress, last))
        this.tracingRest = rests(traced, drive.tracing.frame, under, isFooting(this.at), (gx) => groundAt(this.at, gx))
        this.tracingLying = { frame: drive.tracing.frame, moved: under.moved }
        // Where the traced design would have given under this vehicle, its part is drawn broken from then on.
        if (progress >= last && drive.tracing.ending.kind === 'gives') this.tracingGave = drive.tracing.ending.part
      }
      drive.heard = answer.use
      drive.strain = answer.strain
      if (ended(this.at, drive.run, x, drive.homeward)) this.finishDrive(drive)
    }
    if (this.scene) {
      const wasRunning = this.scene.running
      this.scene.update(this.sceneClock)
      if (wasRunning && !this.scene.running) this.afterScene()
    }
    // The neat way after a crossing is owed by the state itself, so putting the game away in the middle of that
    // crossing's scene does not lose it: the newest sheet's vehicle has crossed and its idea has not been shown.
    if (!this.scene && !this.drive && !this.showing && !this.hand && this.crossedUnshown()) {
      this.owed = this.at.idea; this.owedAfter = null
      this.beginShowing()
    }
    super.step(dt)
  }

  /** The crew's time: the beaver braces for as long as a vehicle is on the road, both watch the work, and what they do about the sheet is heard as it happens. */
  private stepCrew(dt: number): void {
    const { beaver, mole } = this.crew, work = this.work()
    beaver.brace(this.drive !== null)
    const b = beaver.step(dt, work), m = mole.step(dt, work)
    // The mole's rule is heard each time it is laid on something: lower the first time, higher the second.
    const up = mole.busy && m.raise > 0.8
    if (up && !this.moleUp) this.voices.push(moleRule(m.own > 0.5))
    this.moleUp = up
    // The beaver's tail is heard when it comes down.
    const tail = beaver.busy && b.own > 0.6
    if (!tail && this.tailUp && beaver.act !== 'poked') this.voices.push(beaverSlap)
    this.tailUp = tail
  }

  // --- Runs ----------------------------------------------------------------------

  private vehicleAt(x: number, y: number): { id: VehicleId; across: boolean } | null {
    const near = this.waiting.findIndex((id, place) => onVehicle(this.at, waitAt(this.at, place), longOf(id), TALL[id], x, y))
    if (near >= 0) return { id: this.waiting[near], across: false }
    const far = this.across.findIndex((id, place) => onVehicle(this.at, parkAt(this.at, longOf(id), place), longOf(id), TALL[id], x, y))
    return far >= 0 ? { id: this.across[far], across: true } : null
  }

  /** A vehicle sets off across the bridge as built: the whole run is computed now and then watched. */
  private send(id: VehicleId, homeward: boolean): void {
    // The trolley gives the road to the vehicle: it goes back to the tray first.
    // It stands aside in the tray for the run and the scene after it, and is back where it stood when the road is free: nothing the child set is lost, and nothing of this is saved.
    if (this.trolley.at) { this.voices.push(trolleyOff(this.trolley.weights)); this.aside = true; this.model() }
    const train = trainOf(VEHICLES[id])
    const result = run(this.at, this.bridge, train, homeward)
    const traced = this.laidTracing === null ? null : this.save.sheets[this.save.on].tracings[this.laidTracing]
    this.drive = { vehicle: id, run: result, train, homeward, seconds: 0, heard: Array.from(result.steps[0].use), strain: result.steps[0].strain, tracing: traced ? run(this.at, traced, train, homeward) : null }
    // The beaver cannot look, and its teeth say so.
    this.voices.push(honk(id), beaverChatter)
  }

  /** The run has reached its ending: its outcome is saved at once, and the scene that shows it starts. */
  private finishDrive(drive: Drive): void {
    const where = this.seatNow()!, was = this.save
    this.drive = null
    const show = (this.show = { ...idleShow(), vehicle: drive.vehicle, homeward: drive.homeward, from: [where.x, where.y], tilt: where.tilt })
    const cue = (what: Cue) => this.cue(what, drive)
    if (drive.run.ending.kind === 'crossed') {
      show.kind = 'crossing'
      show.reaction = reaction(drive.vehicle, drive.run.ride)
      this.bargeTook = this.at.channel ? bargeReaction(drive.run.ride) : null
      // Homeward, the vehicle is back at the near bank and nothing is judged; outward, it has crossed. Either way the
      // bus leaves a hat on any part lower than its heads.
      const hats = drive.vehicle === 'giraffe-bus' ? drive.run.ride.low[TASTE.bus.headroom - 1] : []
      const before = this.save, ring = before.sheets[before.on].ring
      this.save = drive.homeward ? leaveHats(unringed(sentHome(crossedHome(this.save, drive.vehicle), drive.vehicle), drive.vehicle), hats) : crossed(this.save, drive.vehicle, hats)
      // The ring fades through this scene if this crossing took it away. The roll slides in and a vehicle draws up
      // only if this crossing brought them: a later crossing on the same sheet brings neither again.
      this.fading = ring && !this.save.sheets[this.save.on].ring ? ring : null
      show.rollArrives = before.next === null && this.save.next !== null
      show.arriving = this.save.waiting.find((waiting) => waiting !== drive.vehicle && !before.waiting.includes(waiting) && !before.across.includes(waiting)) ?? null
      this.scene = new Scene(crossingBeats(show, cue))
      this.crew.beaver.brace(false); this.crew.beaver.react('relief'); this.crew.mole.react('crossed')
      this.voices.push(beaverSigh)
    } else {
      const what = consequence(drive.run, this.bridge, VEHICLES[drive.vehicle].crates)
      show.kind = 'give'
      // The chief looks up from its model, at the gap and never at the child; the beaver starts and hides its eyes.
      this.chief.react('looks-up')
      this.crew.beaver.brace(false); this.crew.beaver.react('flinch')
      this.gave = what.ring
      this.gaveSqueezed = drive.run.ending.kind === 'gives' && (drive.run.ending.strain === 'bow' || drive.run.ending.strain === 'squeeze')
      this.voices.push(what.voice.filter((sound) => (sound.after ?? 0) < 0.35))
      // The wrong road has its own sound: a tube rolls its load off with a plop, and wheels on a thread gurgle in the water.
      if (drive.run.ending.kind === 'rolls-off') this.voices.push(plop)
      if (drive.run.ending.kind === 'dunks') { this.voices.push(gurgle); this.dipped = { part: drive.run.ending.part } }
      // A vehicle that fails on its way home paddles to the near bank like any other, and is home.
      const hadNext = this.save.next !== null
      // Either way the give ends with the pencil ring on the spot.
      this.save = drive.homeward ? (what.ring ? ringed(sentHome(this.save, drive.vehicle), what.ring) : sentHome(this.save, drive.vehicle)) : failedRun(this.save, drive.vehicle, what.ring)
      // A cycle judged badly lays out a way back in: its roll waits for this scene to end, and then slides in.
      if (!hadNext && this.save.next !== null) this.rollIn = -1
      this.scene = new Scene(giveBeats(show, cue))
      // What is left of the bridge without the part that gave: it sags or folds from there. A tube's end pops out of
      // its pin and the tube hangs whole from the other; any other part breaks at its spot, and its two pieces are
      // drawn hanging from their own pins (`pieces`). With no part given (the road ended, the wheels rolled off), the
      // bridge lies as it does with nothing on it.
      const gone = what.ring?.part
      this.lying = null
      /** The bridge without some of its parts, settled, with a place kept for each part left out: what is left sags, swings or lies down. */
      const without = (out: (index: number) => boolean, place: (part: Part) => Rest): Rest[] => {
        const kept = this.bridge.flatMap((_, index) => (out(index) ? [] : [index]))
        const settled = this.modelOf(kept.map((index) => this.bridge[index])).rest
        const rest: Rest[] = this.bridge.map((part) => place(part))
        kept.forEach((index, k) => { const one = settled[k]; rest[index] = { ...one, ...(one.via ? { via: { ...one.via, part: kept[one.via.part] } } : {}), ...(one.tie ? { tie: { ...one.tie, part: kept[one.tie.part] } } : {}) } })
        return rest
      }
      const last = drive.run.steps[drive.run.steps.length - 1]
      if (drive.run.ending.kind === 'folds') {
        // A stay went slack under the load and the shape is no longer held: the build folds, slowly, like a deckchair,
        // into what it is without those stays, which hang slack where they are pinned.
        this.rest = without((index) => this.bridge[index].kind === 'thread' && last.strain[index] === 'slack', (part) => ({ a: part.a, b: part.b, how: 'firm', pivot: 0, slack: true }))
      } else if (gone === undefined) this.rest = this.modelOf(this.bridge).rest
      else if (this.bridge[gone].kind === 'tube' && !this.gaveSqueezed) this.rest = this.modelOf(this.bridge.map((part, index) => (index === gone ? { ...part, loose: 'a' as const } : part))).rest
      else this.rest = without((index) => index === gone, (part) => ({ a: part.a, b: part.b, how: 'firm', pivot: 0, slack: false }))
    }
    // The neat way of this sheet's idea is owed after this scene, if the rule says so: the child has tried first.
    const byJob = !drive.homeward && onNewest(this.save) && drive.vehicle === this.at.job
    const tries = drive.run.ending.kind === 'crossed' ? this.save.tries : Math.max(this.save.tries, 1)
    this.owed = neatWayDue(this.at.idea, tries, drive.run.ending, drive.run.frame.firm.some((firm) => !firm), this.save.shown, byJob) ? this.at.idea : null
    this.owedAfter = drive.run.ending.kind === 'crossed' ? null : drive.run.ending.kind
    // At the free yard two stand on a bank at most: one that has to make room is seen driving off, and is not just gone.
    for (const [bank, list] of [['near', was.waiting], ['far', was.across]] as const) list.forEach((id, place) => {
      if (id !== drive.vehicle && !this.save.waiting.includes(id) && !this.save.across.includes(id)) this.leaving.push({ id, bank, place, since: 0 })
    })
    this.urgent = true
    this.changed = true
    this.scene.start(this.sceneClock, () => {})
  }

  private cue(what: Cue, drive: Drive): void {
    // The bridge goes back as built: the model is whole again, and the two pieces of what broke close up through this beat.
    if (what === 'restore') { this.dipped = null; this.model() }
    if (this.skipping) return
    if (what === 'splash') {
      this.voices.push(splash(VEHICLES[drive.vehicle].crates))
      const long = longOf(drive.vehicle)
      this.splash = { x: givePlace(this.show, this.at, long, TAIL[drive.vehicle]).x - long / 2, since: 0, big: 1 }
      this.crew.mole.react('splashed')
    }
    if (what === 'ring') {
      // The bridge springs up and rings with the notes of its own parts.
      this.voices.push(chord(this.bridge.map((part) => layVoice(part.kind, length(part))[0].pitch)))
      this.bridge.forEach((_, index) => { this.rung[index] = 0.2 })
    }
    if (what === 'react' && this.show.reaction) this.voices.push(reactVoice(drive.vehicle, this.show.reaction.mood, this.show.reaction.act), ...(this.bargeTook ? [bargeHorn(this.bargeTook.mood === 'like')] : []))
    // A secret: under a whole arch the barge's toot comes back as a chord.
    if (what === 'react' && this.at.channel && this.bargeTook?.mood === 'like' && wholeArch(this.bridge, this.frame.firm, isFooting(this.at), this.at.channel)) this.voices.push(hornEcho)
    if (what === 'arrive' && (this.show.rollArrives || this.show.arriving)) this.voices.push(unrollVoice(1))
    if (what === 'restore') this.voices.push(restore)
  }

  /**
   * The scene is over, by itself or by a touch: everything is where it was
   * taking it. It is followed by the showing it owes, which is marked given the
   * moment it starts; a scene that a touch ended owes it just the same. True
   * when a showing began.
   */
  private afterScene(): boolean {
    this.gave = null
    this.dipped = null
    this.fading = null
    this.show = idleShow()
    this.scene = null
    // The road is free again: the trolley is back where it stood, with its clink.
    const back = this.aside && this.save.sheets[this.save.on].trolley.at !== null
    this.aside = false
    this.model()
    if (back && this.trolley.at && !this.skipping) this.voices.push(trolleySet)
    // The way back in after a cycle judged badly: the roll slides in now, exactly as it does after a crossing. A touch
    // that ended the scene finds it there already.
    if (this.rollIn === -1) {
      if (this.skipping) this.rollIn = Infinity
      else { this.rollIn = 0; this.voices.push(unrollVoice(1)) }
    }
    return this.beginShowing()
  }

  /** The showing that is owed begins, and is marked given at that moment. True when one began. */
  private beginShowing(): boolean {
    const idea = this.owed
    this.owed = null
    if (!idea) return false
    this.showing = { idea, failure: this.owedAfter }
    this.save = markShown(this.save, idea)
    this.urgent = true
    this.changed = true
    this.chief.showing('shows', perchOn(idea))
    return true
  }

  /** True when the newest sheet is on the board, its own vehicle has crossed it (its cycle was judged, and not badly), and its idea has not been shown yet. */
  private crossedUnshown(): boolean {
    const idea = this.at.idea
    return idea !== null && onNewest(this.save) && this.save.finished && !givenUpOn(this.save.tries) && !this.save.shown.includes(idea)
  }

  /** Another sheet comes onto the board: the roll unrolled, or a sheet taken back from the rack. */
  private turn(save: Save): void {
    if (save === this.save) return
    this.save = save
    const sheet = save.sheets[save.on]
    this.at = site(sheet.site, sheet.variant)
    this.selected = this.pileFor()
    this.laidTracing = null
    this.model()
    this.moving = this.rest.map(atRest)
    this.rung = this.bridge.map(() => Infinity); this.turned = this.bridge.map(() => Infinity); this.laid = this.bridge.map(() => Infinity); this.shook = []
    this.flying = []; this.clicked.clear()
    this.splash = null
    this.marks = []
    this.rollIn = Infinity; this.swing = Infinity; this.fading = null
    for (const who of ['beaver', 'mole'] as const) this.crew[who].head = this.crewEyes(who)
    this.voices.push(unrollVoice(1))
    this.urgent = true
    this.changed = true
  }
}
