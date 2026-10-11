import { BASKET_BOX, hitBox, type Box, type Ray } from './aim'
import { SHAPE, type Kind, type Placed } from './blocks'
import { BELL_BOX, BOARDS, PULL_OUT, ROOF, ROOF_OUT, backOf, bodyOf, clearOver, eveningTops, nearestTo, restsFor, tapBoxes, things, type Rest, type Rests, type Thing, type What } from './castle'
import { SIZE } from './layout'
import { Folk, GATE_GAPE, WHO, dragonHead } from './folk'
import { BODY, FOLK, RUG, screenAt, type Who } from './layout'
import { Spring, clamp01, smooth } from './motion'
import { Scene, type Beat } from './scene'
import { Actor, RouteMaker, fromFirst, straight, type Leg, type RouteEvent, type Stance, type Vec3 } from './troupe'

// The evening: the bell, the two scenes it starts, the castle the pile has
// become, and what the folk do in it. Pure and on game time. What it shows is
// worked out from the rug each time evening falls (`castle.ts`), so the only
// thing of it that is saved is whether it is evening.
//
// Saved and seen are kept apart: `on` is the outcome, set when a scene starts;
// `dusk`, `dress` and where the folk are arrive beat by beat.

export type EveningEvent =
  | { type: 'bell' }
  | { type: 'dusk' }
  | { type: 'dawn' }
  /** A block becomes its thing, with the sound of its cell in the grid's fourth column. */
  | { type: 'become'; what: What; capped: boolean; tier: number }
  /** A thing turns back into its block, with a knock. */
  | { type: 'unbecome'; kind: Kind; tier: number }
  /** A thing answers a tap, with the sound of its cell in the fifth column. `clang` is the cook's spoon on his pot. */
  | { type: 'act'; what: What; clang: boolean }
  | { type: 'shake'; who: Who }
  | RouteEvent

/** How long each scene takes, in seconds. */
export const FALL_SECONDS = 8
export const RETURN_SECONDS = 4
/** A springboard: how long its end takes to dip under one who lands on it, how far it dips, and how long until it is at rest again. */
const BEND_DIP = 0.12
const BEND_DEEP = 0.1
const BEND_SECONDS = 1.4
/** A roof lifted for a visitor waits this far over the top of his head, and rests this far over it while he stands in the tower. */
const LID_GAP = 0.12
/** How far a lifted roof bobs up when it is tapped where it waits, and for how long. */
const LID_BOB = 0.14
const LID_BOB_SECONDS = 0.45
/** How high the boards of a tapped bridge jump as they rattle, and how far over them one of the folk begins to press them still. */
const RATTLE = 0.05
/** A flag this near the king's seat, in places, is near him. */
const FLAG_NEAR = 2.5
const RATTLE_ROOM = 0.5
/**
 * The top of what each wears, as the view draws him, in his own units over
 * the point he stands on: the tips of the spikes of the king's crown, the
 * stalk of the cook's cap; and half its width, which comes up as it tilts.
 * The view holds the same numbers (`view/folkView.ts`), and a test measures
 * the drawn figures against them.
 */
const WORN: Record<'king' | 'cook', { top: number; wide: number }> = { king: { top: 1.56, wide: 0.56 }, cook: { top: 1.44, wide: 0.56 } }
/** Seated on his cushion the king is this much higher, in his own units. */
const KING_SEAT = 0.3
/** The cook's pot turned over on his cap stands this much over it, in his own units. */
const POT_ON_CAP = 0.5
/** One who is lifted stretches by this share at the top of his way. */
const AIR_STRETCH = 0.12
/** How long one of them stands in a tower and looks out. */
const PEEK_SECONDS = 0.7
/** How long a thing's answer to a tap runs, in seconds. */
export const ACT_SECONDS: Record<What, number> = { bridge: 1.2, gate: 1.3, tower: 1.1, pole: 1.1, room: 0.7, slide: 0.8 }

function stanceOf(rest: Rest): Stance {
  return { at: [...rest.at], lie: rest.lie, path: rest.who === 'dragon' ? fromFirst(rest.path) : [] }
}

/** The stance of each of the folk at his place by day. */
export function dayStance(who: Who): Stance {
  const place = FOLK[who]
  return { at: [place.x, place.y, place.z], lie: 0, path: who === 'dragon' ? straight(1) : [] }
}

/** The order they go home in: the dragon first, since he may lie where the king sits by day; then the king, so the cook has no crown to be lifted over. */
const HOME_ORDER: readonly Who[] = ['dragon', 'king', 'cook']

/** Where the others are while one of them is on his way. */
type Others = Partial<Record<Who, Stance>>

/**
 * The surface the frame is worked out for, and what of it is kept clear of
 * anyone who is carried: its top edge, and the place of the round home control
 * at its top centre (48 pixels across, 10 from the top), with room round it.
 */
export const FRAME = { width: 1180, height: 820, edge: 8, control: { half: 42, below: 72 } }
/** How far the camera can step back at most. */
const FAR_MOST = 1.8

/** Whether a point of the room is in the frame and not behind the home control, on a surface of this size with the camera this far back. */
export function clearInFrame(point: readonly [number, number, number], back: number, width = FRAME.width, height = FRAME.height): boolean {
  const [sx, sy] = screenAt(point, width, height, back)
  if (sy < FRAME.edge) return false
  return !(Math.abs(sx - width / 2) < FRAME.control.half && sy < FRAME.control.below)
}

/**
 * The top of one of the folk's boxes as the camera sees it: points along its
 * upper far edge. The king's box is square and his crown is round, so his
 * far edge is the back of his crown.
 */
export function topEdge(who: Who, box: Box): Vec3[] {
  const points: Vec3[] = []
  const steps = Math.max(1, Math.ceil((box.max[0] - box.min[0]) / 0.5))
  const z = who === 'king' ? box.min[2] + 0.1 * FOLK.king.size : box.min[2]
  for (let i = 0; i <= steps; i++) points.push([box.min[0] + ((box.max[0] - box.min[0]) * i) / steps, box.max[1], z])
  return points
}


/** Whether two boxes stand over the same floor. */
function overSameFloor(a: Box, b: Box): boolean {
  return a.min[0] < b.max[0] - 0.03 && b.min[0] < a.max[0] - 0.03 && a.min[2] < b.max[2] - 0.03 && b.min[2] < a.max[2] - 0.03
}

/** The space one of the folk takes up at a stance, as boxes in the room. */
/** How much higher than his body the king reaches: seated on his cushion, to the tips of his crown. */
const KING_HEAD = 0.4 * FOLK.king.size

function boxesAt(who: Who, stance: Stance): Box[] {
  const [x, y, z] = stance.at
  const lie = stance.lie > 0.5 ? 1 : stance.lie < -0.5 ? -1 : 0
  const boxes = bodyOf({ who, at: stance.at, how: 'day', thing: -1, lie, high: false, path: stance.path.map((p): Vec3 => [p[0] + x, p[1] + y, p[2] + z]) })
  // What passes over the king passes over his crown too.
  if (who === 'king') for (const box of boxes) box.max[1] += KING_HEAD
  return boxes
}

export class Evening {
  /** The outcome: it is evening. This is what is saved. */
  on = false
  /** What is seen of it: 0 afternoon, 1 evening. */
  dusk = 0
  /** How far the camera has stepped back for a tall castle. */
  back = 0
  /** The castle things, one for each block of the rug, while there is a castle to see. */
  things: Thing[] = []
  /** How far each thing has become itself, 0 to 1. */
  dress: number[] = []
  /** Seconds since each thing was last tapped; large when it is at rest. */
  acted: number[] = []
  /** Which of three colours each flag shows. */
  flagColour: number[] = []
  rests: Rests = restsFor([])
  readonly actors: Record<Who, Actor>
  readonly bell = new Spring(0, 60, 2.2)
  /** Seconds since the dragon tucked his nose in; large otherwise. */
  tuck = 99
  /** How far the dragon's nose is under his gate, 0 to 1: the grille rests on it. */
  nose = 0
  /** Seconds since each of the folk began to shake himself dry; large otherwise. */
  readonly shook: Record<Who, number> = { king: 99, cook: 99, dragon: 99 }
  /** The king is on a seat, and the cook has come to a room up high: each eases in for the view. */
  kingSits = 0
  /**
   * How far the camera stands back this evening, 0 to `FAR_MOST`: far enough
   * for the king on his seat, and for each of the folk at the top of every
   * carry of the two bell scenes to be in the frame and clear of the home
   * control. Worked out once when the castle is set.
   */
  far = 0
  /** During a scene: the king has his cushion under him, from the start of his way in to the start of his way home. */
  private kingSeated = false
  /** During a scene: the grille is held up for the dragon, from the start of his way in until he is out from under it. */
  private gateHeld = false
  /** The cook is on his way in to a room up high: his eyes are shut and his pot is on his head until he lies there. */
  private cookClimbs = false
  cookHigh = 0
  /** A board that is bending now: which bridge, which of its ends dips, who stands on it, and for how long it has. */
  private board: { index: number; end: -1 | 1; who: Who; t: number } | null = null
  /**
   * A tower whose roof is lifted off for one of them to stand in it: which
   * tower, who, and how high over the tower's top the roof waits.
   */
  private visit: { index: number; who: Who; hover: number } | null = null
  /** The tower whose roof was last lifted for a visitor, and how high it is on its way up or down. */
  private lidOf = -1
  private lidUp = 0
  /** Seconds since the lifted roof was tapped where it waits. */
  private lidTapped = 99
  /** A scene's outcome is to be saved at once. The Mount reads and clears it. */
  saveNow = false
  private scene: Scene | null = null
  private began: boolean[] = []
  private rung = -99

  constructor(private readonly folk: Folk, private readonly emit: (event: EveningEvent) => void) {
    this.actors = { king: new Actor('king', dayStance('king')), cook: new Actor('cook', dayStance('cook')), dragon: new Actor('dragon', dayStance('dragon')) }
  }

  /** A scene is playing. */
  get running(): boolean {
    return this.scene !== null && this.scene.running
  }

  /** Something of the evening is still moving by itself. */
  get busy(): boolean {
    return this.running || WHO.some((who) => this.actors[who].busy) || this.acted.some((since, i) => since < ACT_SECONDS[this.things[i].what])
  }

  /** The world as it was left: afternoon, or the evening castle standing in its first state with the folk in their places. */
  load(placed: readonly Placed[], on: boolean): void {
    this.on = on
    this.scene = null
    this.dusk = on ? 1 : 0
    this.setCastle(on ? placed : null)
    if (on) this.dress.fill(1)
    for (const who of WHO) this.actors[who].set(on ? stanceOf(this.rests[who]) : dayStance(who))
    this.back = on ? this.far : 0
    this.nose = on && this.rests.dragon.how === 'gate' ? 1 : 0
    this.kingSits = on && this.rests.king.how !== 'day' ? 1 : 0
    this.kingSeated = on
    this.gateHeld = on
    this.cookClimbs = false
    this.cookHigh = 0
    this.look()
  }

  private setCastle(placed: readonly Placed[] | null): void {
    this.things = placed ? things(placed) : []
    this.rests = restsFor(placed ?? [])
    this.dress = this.things.map(() => 0)
    this.acted = this.things.map(() => 99)
    this.flagColour = this.things.map((thing) => thing.index % 3)
    this.began = this.things.map(() => false)
    this.board = null
    this.visit = null
    this.lidOf = -1
    this.lidUp = 0
    this.lidTapped = 99
    this.far = placed ? this.rehearse() : 0
  }

  /** The points the top of one of them passes through on a route: his boxes' upper edges, leg by leg. */
  private topsOf(who: Who, from: Stance, legs: readonly Leg[]): Vec3[] {
    const points: Vec3[] = []
    if (legs.length === 0) return points
    const scratch = new Actor(who, from)
    scratch.send([...legs])
    for (const leg of legs) for (let k = 1; k < 8; k++) {
      scratch.seek(leg.start + ((leg.end - leg.start) * k) / 8)
      for (const box of boxesAt(who, scratch.stance())) points.push(...topEdge(who, box))
    }
    return points
  }

  /**
   * Both bell scenes worked out without playing them: how far back the camera
   * must stand for every carry of the way in and of the way home to stay in
   * the frame and clear of the home control. Never nearer than the king on
   * his seat asks for.
   */
  private rehearse(): number {
    const points: Vec3[] = []
    const others: Record<Who, Stance> = { king: dayStance('king'), cook: dayStance('cook'), dragon: dayStance('dragon') }
    const elsewhere = (who: Who): Others => { const rest: Others = { ...others }; delete rest[who]; return rest }
    for (const who of WHO) {
      const legs = this.wayIn(who, others[who], elsewhere(who)).legs
      points.push(...this.topsOf(who, others[who], legs))
      if (legs.length > 0) others[who] = stanceOf(this.rests[who])
    }
    for (const who of HOME_ORDER) {
      const legs = this.wayHome(who, others[who], elsewhere(who)).legs
      points.push(...this.topsOf(who, others[who], legs))
      if (legs.length > 0) others[who] = dayStance(who)
    }
    let far = backOf(this.rests)
    while (far < FAR_MOST && points.some((point) => !clearInFrame(point, far))) far = Math.min(FAR_MOST, far + 0.05)
    return far
  }

  /** The way in at evening: by the gate if there is one, through a window if not, the dragon straight to his place. Empty for one who stays where he is. */
  private wayIn(who: Who, from: Stance, elsewhere: Others): RouteMaker {
    const maker = new RouteMaker()
    const door = this.things.find((thing) => thing.what === 'gate') ?? null
    const window = door ? null : this.things.find((thing) => thing.what === 'room') ?? null
    const goes = this.rests[who].how !== 'day' && this.rests[who].how !== 'open'
    const way = door ?? window
    if (goes && who === 'dragon') {
      // He is too long to stand at a door: he is laid straight in his place, and his own gate answers.
      const mine = this.rests.dragon.how === 'gate' ? this.rests.dragon.thing : -1
      this.toRest(maker, who, from, 0.8, elsewhere, mine >= 0 ? [{ type: 'door', who, thing: mine }, { type: 'home', who }] : [{ type: 'home', who }], [{ type: 'hup', who }])
    } else if (goes && way) {
      const stop = this.perch(who, way.x, way.z)
      const straightIn = new RouteMaker()
      this.toRest(straightIn, who, from, 0.7, elsewhere, [{ type: 'home', who }], [{ type: 'hup', who }])
      if (!this.free(who, stop, elsewhere)) return straightIn
      this.carry(maker, who, from, stop, 0.55, elsewhere, [door ? { type: 'door', who, thing: way.index } : { type: 'window', who, thing: way.index }], [{ type: 'hup', who }])
      maker.wait(0.15)
      this.toRest(maker, who, stop, 0.55, elsewhere, [{ type: 'home', who }])
      // By the door only where that does not lift him much higher than the straight way would.
      const highest = (legs: readonly Leg[]): number => Math.max(0, ...this.topsOf(who, from, legs).map((point) => point[1]))
      if (highest(maker.legs) > highest(straightIn.legs) + 0.5) return straightIn
    } else if (goes) {
      this.toRest(maker, who, from, 0.7, elsewhere, [{ type: 'home', who }], [{ type: 'hup', who }])
    }
    return maker
  }

  /** The way home in the afternoon, from where he rests. Empty for one who is at home. */
  private wayHome(who: Who, at: Stance, elsewhere: Others): RouteMaker {
    const maker = new RouteMaker()
    const home = dayStance(who)
    const from = this.fromRest(maker, who, at)
    if (Math.hypot(from.at[0] - home.at[0], from.at[1] - home.at[1], from.at[2] - home.at[2]) > 0.01) {
      this.carry(maker, who, from, home, who === 'dragon' ? 0.8 : 0.65, elsewhere, [{ type: 'home', who }], [{ type: 'hup', who }])
    }
    return maker
  }

  /** Where each of the folk is, for his eyes. */
  private look(): void {
    for (const who of WHO) {
      const [x, y, z] = this.actors[who].placing.at
      this.folk.stand(who, x, y, z)
    }
  }

  private tops(without = -1): number[] {
    return eveningTops(without < 0 ? this.things : this.things.filter((thing) => thing.index !== without))
  }

  /** Where one of them comes down on top of whatever is at a spot: upright, clear of everything under him. */
  private perch(who: Who, x: number, z: number, headTo: 1 | -1 = 1, without = -1, least = 0): Stance {
    const tops = this.tops(without)
    if (who === 'dragon') {
      const { behind, before, half } = BODY.dragon
      const x0 = Math.min(x - behind * headTo, x + before * headTo), x1 = Math.max(x - behind * headTo, x + before * headTo)
      return { at: [x, Math.max(least, clearOver(tops, x0, x1, z - half, z + half)), z], lie: 0, path: straight(headTo) }
    }
    const { half } = BODY[who]
    return { at: [x, Math.max(least, clearOver(tops, x - half, x + half, z - half, z + half)), z], lie: 0, path: [] }
  }

  /** The blocks as they stand in the evening, each up to the top of what it has become. */
  private blocks(without = -1): Box[] {
    const boxes: Box[] = []
    for (const thing of this.things) {
      if (thing.index === without) continue
      const [w, , d] = SIZE[thing.kind]
      boxes.push({ min: [thing.x - w / 2, thing.base, thing.z - d / 2], max: [thing.x + w / 2, thing.crown, thing.z + d / 2] })
    }
    return boxes
  }

  /** Where everyone but him is right now. */
  private othersNow(who: Who): Others {
    const others: Others = {}
    for (const other of WHO) if (other !== who) others[other] = this.actors[other].stance()
    return others
  }

  /** Whether he can be set down at a stance from straight above: none of the others is in his place there, or anywhere over it. One of them wholly under his feet is no matter. */
  private free(who: Who, stance: Stance, others: Others): boolean {
    const mine = boxesAt(who, stance)
    for (const other of WHO) {
      const theirs = others[other]
      if (!theirs) continue
      for (const box of boxesAt(other, theirs)) if (mine.some((own) => overSameFloor(own, box) && box.max[1] > own.min[1] + 0.02)) return false
    }
    return true
  }

  /**
   * How high the point he stands on must be for him to pass from one stance
   * to another over everything on the way: the blocks with what they have
   * become, and the others where they are. His own shape is the one he
   * starts in for the first half of the way and the one he ends in for the
   * second, since he turns from one to the other in the middle.
   */
  private over(who: Who, a: Stance, b: Stance, others: Others, without = -1, via?: Vec3): number {
    const obstacles = this.blocks(without)
    obstacles.push(BELL_BOX, BASKET_BOX)
    for (const other of WHO) {
      const theirs = others[other]
      if (theirs) obstacles.push(...boxesAt(other, theirs))
    }
    const corners: Vec3[] = via ? [a.at, via, b.at] : [a.at, b.at]
    const whole = corners.reduce((sum, corner, c) => (c === 0 ? 0 : sum + Math.hypot(corner[0] - corners[c - 1][0], corner[2] - corners[c - 1][2])), 0)
    let top = 0, drop = 0, gone = 0
    for (let c = 0; c + 1 < corners.length; c++) {
      const from = corners[c], to = corners[c + 1]
      const long = Math.hypot(to[0] - from[0], to[2] - from[2])
      const steps = Math.max(1, Math.ceil(long / 0.15))
      for (let i = 0; i <= steps; i++) {
        const s = i / steps
        const at: Vec3 = [from[0] + (to[0] - from[0]) * s, 0, from[2] + (to[2] - from[2]) * s]
        // He turns from the one shape to the other half way across: each is taken a little past the middle.
        const share = whole > 0 ? (gone + long * s) / whole : 0.5
        for (const shape of [a, b]) {
          if (shape === a ? share > 0.6 : share < 0.4) continue
          for (const box of boxesAt(who, { at, lie: shape.lie, path: shape.path })) {
            drop = Math.max(drop, -box.min[1])
            for (const obstacle of obstacles) if (overSameFloor(box, obstacle)) top = Math.max(top, obstacle.max[1])
          }
        }
      }
      gone += long
    }
    return top + drop
  }

  /**
   * A point to go round by, where the straight way would lift him over one
   * of the others: the one that keeps him lowest, and of those the shortest
   * way. None where no way round is lower by a third of a block.
   */
  private round(who: Who, a: Stance, b: Stance, others: Others): Vec3 | undefined {
    const straightWay = this.over(who, a, b, others)
    if (straightWay <= this.over(who, a, b, {}) + 0.01) return undefined
    let best: Vec3 | undefined
    let lowest = straightWay - 0.3, shortest = Infinity
    for (let x = -5.5; x <= 2.6; x += 0.5) for (let z = -2.5; z <= 3.5; z += 0.5) {
      const via: Vec3 = [x, 0, z]
      const long = Math.hypot(x - a.at[0], z - a.at[2]) + Math.hypot(b.at[0] - x, b.at[2] - z)
      const high = this.over(who, a, b, others, -1, via)
      if (high < lowest - 0.05 || (high <= lowest + 0.05 && long < shortest)) { lowest = Math.min(lowest, high); shortest = long; best = via }
    }
    return best
  }

  /** Carries him from one stance to another: straight up, over everything on the way, and straight down. */
  private carry(maker: RouteMaker, who: Who, a: Stance, b: Stance, seconds: number, others: Others, done: RouteEvent[] = [], begin: RouteEvent[] = []): void {
    const level = Math.max(a.at[1], b.at[1])
    const via = this.round(who, a, b, others)
    const far = Math.hypot(b.at[0] - a.at[0], b.at[2] - a.at[2])
    const longer = via && far > 0.1 ? Math.min(1.7, (Math.hypot(via[0] - a.at[0], via[2] - a.at[2]) + Math.hypot(b.at[0] - via[0], b.at[2] - via[2])) / far) : 1
    // Between two low places as high as each other he is lifted half a block. One who is lifted far already, or is
    // high up on the castle, clears what is under him by a little: the frame has no room over a high seat.
    const least = Math.abs(a.at[1] - b.at[1]) < 0.5 && level < 1.2 ? 0.5 : 0.15
    maker.carry(b, seconds * longer, Math.max(least, this.over(who, a, b, others, -1, via) + 0.12 - level), done, begin, via)
  }

  /** A step from one spot to the next: a hop where nothing is in the way and both are as high, a carry where not. */
  private hop(maker: RouteMaker, who: Who, a: Stance, b: Stance, seconds: number, arc: number, others: Others, done: RouteEvent[] = [], begin: RouteEvent[] = []): void {
    const level = Math.max(a.at[1], b.at[1])
    if (Math.abs(a.at[1] - b.at[1]) < 0.02 && this.over(who, a, b, others) <= level + 1e-6) maker.go(b, seconds, arc, done, begin)
    else this.carry(maker, who, a, b, seconds * 1.8, others, done, begin)
  }

  /** Off the toe of a slide onto what is beyond it: a hop where that is as high, and where it is lower out over the edge and straight down. */
  private off(maker: RouteMaker, a: Stance, b: Stance, done: RouteEvent[]): void {
    if (b.at[1] < a.at[1] - 0.02) maker.carry(b, 0.4, 0.25, done)
    else maker.go(b, 0.3, 0.25, done)
  }

  /** The cook at his window stands back from it before he is lifted, and is set down there before he puts his head in. */
  private stoodBack(who: Who, rest: Stance): Stance {
    if (who !== 'cook' || this.rests.cook.how !== 'window') return rest
    return { at: [rest.at[0] - this.rests.cook.lie * PULL_OUT, rest.at[1], rest.at[2]], lie: rest.lie, path: [] }
  }

  /** The way from where he is to his rest. */
  private toRest(maker: RouteMaker, who: Who, from: Stance, seconds: number, others: Others, done: RouteEvent[], begin: RouteEvent[] = []): void {
    const rest = stanceOf(this.rests[who]), back = this.stoodBack(who, rest)
    if (back === rest) { this.carry(maker, who, from, rest, seconds, others, done, begin); return }
    this.carry(maker, who, from, back, seconds, others, [], begin)
    maker.go(rest, 0.12, 0, done)
  }

  /** The way out of his rest, if he is in it: the stance he can be lifted from. */
  private fromRest(maker: RouteMaker, who: Who, from: Stance): Stance {
    const rest = stanceOf(this.rests[who])
    const there = Math.hypot(from.at[0] - rest.at[0], from.at[1] - rest.at[1], from.at[2] - rest.at[2]) < 0.01
    const back = this.stoodBack(who, rest)
    if (!there || back === rest) return from
    maker.go(back, 0.12, 0)
    return back
  }

  // --- The bell -----------------------------------------------------------------

  /**
   * The bell is rung. In the afternoon evening falls; in the evening the
   * afternoon returns. The outcome is saved now, and the screen gets there
   * beat by beat. `now` is game time in seconds.
   */
  ring(placed: readonly Placed[], now: number): void {
    this.bell.velocity += 7
    this.rung = now
    this.saveNow = true
    if (!this.on) this.fall(placed, now)
    else this.comeBack(now)
  }

  /** A touch on the bell that only ends the scene its own ring started: the ring is still in the air. */
  justRung(now: number): boolean {
    return now - this.rung < 0.6
  }

  private fall(placed: readonly Placed[], now: number): void {
    this.on = true
    this.kingSeated = false
    this.gateHeld = false
    this.cookClimbs = false
    this.setCastle(placed)
    const beats: Beat[] = []
    beats.push({ at: 0, lasts: 0, play: (_, finishing) => { if (!finishing) this.emit({ type: 'bell' }) } })
    beats.push({ at: 0.3, lasts: 0, play: (_, finishing) => { if (!finishing) this.emit({ type: 'dusk' }) } })
    beats.push({ at: 0.3, lasts: 2.4, play: (p) => { this.dusk = smooth(p) } })
    // The blocks become what they were pretending to be, in the order they were set down.
    const gap = Math.min(0.3, 2.4 / Math.max(1, this.things.length))
    this.things.forEach((thing, i) => {
      beats.push({
        at: 1 + i * gap, lasts: 0.45,
        play: (p, finishing) => {
          if (!this.began[i]) { this.began[i] = true; if (!finishing) this.emit({ type: 'become', what: thing.what, capped: thing.covered, tier: thing.tier }) }
          this.dress[i] = p
        },
      })
    })
    // The folk go in one after the other, the king first, once the camera has stepped back for them.
    let starts = Math.max(1 + this.things.length * gap + 0.3, 2)
    const others: Record<Who, Stance> = { king: this.actors.king.stance(), cook: this.actors.cook.stance(), dragon: this.actors.dragon.stance() }
    for (const who of WHO) {
      const actor = this.actors[who]
      const elsewhere: Others = { ...others }
      delete elsewhere[who]
      const maker = this.wayIn(who, actor.stance(), elsewhere)
      actor.send(maker.legs)
      const length = actor.length
      if (length > 0) {
        beats.push({
          at: starts, lasts: length,
          play: (p, finishing) => {
            // The king takes his cushion under him as he is lifted, and the grille goes up as the dragon sets out.
            if (who === 'king') this.kingSeated = true
            if (who === 'dragon') this.gateHeld = true
            // The cook has his eyes shut and his pot on his head for the climb, and no longer once he is there.
            if (who === 'cook') this.cookClimbs = p < 1
            this.route(who, actor.seek(p * length + (p >= 1 ? 1 : 0)), finishing)
          },
        })
        starts += length + 0.05
        others[who] = stanceOf(this.rests[who])
      }
    }
    // The lit castle holds.
    beats.push({ at: FALL_SECONDS - 0.1, lasts: 0.1, play: () => {} })
    this.scene = new Scene(beats)
    this.scene.start(now, () => {})
  }

  private comeBack(now: number): void {
    this.on = false
    this.kingSeated = true
    this.gateHeld = true
    this.cookClimbs = false
    const beats: Beat[] = []
    beats.push({ at: 0, lasts: 0, play: (_, finishing) => { if (!finishing) this.emit({ type: 'bell' }) } })
    // The folk are carried back to their places round the rug, one after the other: the dragon first, since
    // he may lie where the king sits by day; then the king, so the cook has no crown to be lifted over.
    // One of them who is on a trip finishes it first, and the others wait for him.
    let starts = 0.15
    const others = {} as Record<Who, Stance>
    for (const who of WHO) {
      const actor = this.actors[who]
      others[who] = actor.goal()
      if (!actor.busy) continue
      const from = actor.elapsed, left = actor.length - from
      beats.push({ at: starts, lasts: left, play: (p, finishing) => { this.route(who, actor.seek(from + p * left + (p >= 1 ? 1 : 0)), finishing) } })
      starts += left + 0.1
    }
    const waited = starts - 0.15
    // When the last of them who rests in the castle has been lifted out of it.
    let out = 0
    for (const who of HOME_ORDER) {
      const actor = this.actors[who]
      const elsewhere: Others = { ...others }
      delete elsewhere[who]
      const legs = this.wayHome(who, others[who], elsewhere).legs
      const length = legs.length ? legs[legs.length - 1].end : 0
      if (length > 0) {
        let sent = false
        // He is out of the castle once he is at the top of his first carry.
        const lift = legs.find((leg) => leg.carry) ?? legs[0]
        if (this.rests[who].how !== 'day' && this.rests[who].how !== 'open') out = Math.max(out, starts + lift.start + 0.45 * (lift.end - lift.start))
        beats.push({
          at: starts, lasts: length,
          play: (p, finishing) => {
            // He sets out only now: one who was on a trip has only just come to rest.
            if (!sent) { sent = true; actor.send(legs) }
            // The king lifts his cushion over his head again once he is home; the grille stays up until the dragon is out.
            if (who === 'king' && p >= 1) this.kingSeated = false
            if (who === 'dragon' && p >= 1) this.gateHeld = false
            this.route(who, actor.seek(p * length + (p >= 1 ? 1 : 0)), finishing)
          },
        })
        starts += length + 0.03
        others[who] = dayStance(who)
      }
    }
    // The castle turns back into blocks from the top down, each with a knock: not while anyone still rests in it.
    const turns = Math.max(waited + 0.9, out)
    const order = this.things.map((_, i) => i).sort((a, b) => this.things[b].top - this.things[a].top || b - a)
    const gap = Math.min(0.2, 1.6 / Math.max(1, order.length))
    const undone = this.things.map(() => false)
    order.forEach((i, n) => {
      beats.push({
        at: turns + n * gap, lasts: 0.3,
        play: (p, finishing) => {
          if (!undone[i]) { undone[i] = true; if (!finishing) this.emit({ type: 'unbecome', kind: this.things[i].kind, tier: this.things[i].tier }) }
          this.dress[i] = Math.min(this.dress[i], 1 - p)
        },
      })
    })
    // The sun comes back once they are on their way, and the camera comes in again once all are home.
    const dawn = Math.max(waited + 1.9, starts - 0.6, turns + (order.length - 1) * gap + 0.3 - (RETURN_SECONDS - 1.9))
    beats.push({ at: dawn, lasts: 0, play: (_, finishing) => { if (!finishing) this.emit({ type: 'dawn' }) } })
    beats.push({ at: dawn, lasts: RETURN_SECONDS - 1.9, play: (p) => { this.dusk = 1 - smooth(p); if (p >= 1) this.setCastle(null) } })
    this.scene = new Scene(beats)
    this.scene.start(now, () => {})
  }

  /** A touch: the scene ends now, with everything where it was going. */
  finish(): void {
    if (!this.scene) return
    this.scene.finish()
    // The dragon is under his gate at once, so the grille is up at once.
    if (this.on && this.rests.dragon.how === 'gate') this.nose = 1
  }

  // --- What a route sets off ------------------------------------------------------

  private route(who: Who, events: readonly RouteEvent[], quiet = false): void {
    for (const event of events) {
      if (event.type === 'door' && !quiet) this.acted[event.thing] = 0
      if ((event.type === 'window' || event.type === 'home' || event.type === 'bump') && !quiet) this.folk.stir(who, 'knock', 0.7)
      if (event.type === 'splash' && !quiet) { this.folk.stir(who, 'poke'); this.shook[who] = 0; this.emit({ type: 'shake', who }) }
      if (event.type === 'boing' && !quiet) this.folk.stir(who, 'poke')
      if (event.type === 'peek' && !quiet) this.folk.stir(who, 'taste')
      if (event.type === 'bend' && !quiet) this.board = { index: event.thing, end: event.end, who, t: 0 }
      // Feet overhead: the dragon under the bridge puffs his smoke ring as they land on it.
      if (event.type === 'puff' && !quiet) this.folk.stir('dragon', 'knock', 1)
      if (!quiet) this.emit(event)
    }
  }

  // --- A touch in the evening -----------------------------------------------------

  /** The box each of the folk is in right now. */
  bodies(who: Who): Box[] {
    const placing = this.actors[who].placing
    const path = (placing.mix >= 0.5 ? placing.pathTo : placing.pathFrom).map((p): Vec3 => [p[0] + placing.at[0], p[1] + placing.at[1], p[2] + placing.at[2]])
    const lie = placing.lie > 0.5 ? 1 : placing.lie < -0.5 ? -1 : 0
    const boxes = bodyOf({ who, at: placing.at, how: 'day', thing: -1, lie, high: false, path })
    // The dragon's head is the first of his boxes: pulled in, it takes up no room of its own.
    if (who === 'dragon' && placing.tuck > 0.5) boxes.shift()
    return boxes
  }

  /**
   * What a finger landing along this ray touches of the evening: one of the folk, the bell, a castle thing, or
   * none of them. Nothing farther along the ray than `within` counts: the basket may stand in front of it.
   */
  pick(ray: Ray, within = Infinity): { on: 'folk'; who: Who } | { on: 'bell' } | { on: 'thing'; index: number } | null {
    let best: { on: 'folk'; who: Who } | { on: 'bell' } | { on: 'thing'; index: number } | null = null
    let nearest = within
    for (const who of WHO) for (const box of this.bodies(who)) {
      const t = hitBox(ray, box)
      if (t !== null && t < nearest) { nearest = t; best = { on: 'folk', who } }
    }
    const bell = hitBox(ray, BELL_BOX)
    if (bell !== null && bell < nearest) { nearest = bell; best = { on: 'bell' } }
    this.things.forEach((thing, index) => {
      if (this.dress[index] < 1) return
      // It is touched where it is drawn: its block and everything it has become.
      let boxes = tapBoxes(thing)
      // A roof lifted off for a visitor is touched up where it waits, and not where it was.
      const lid = this.lid(index)
      if (lid > 0) {
        boxes = boxes.filter((box) => box.min[1] < thing.top).map((box) => ({ min: box.min, max: [box.max[0], Math.min(box.max[1], thing.top), box.max[2]] as [number, number, number] }))
        boxes.push({ min: [thing.x - ROOF_OUT, thing.top + lid, thing.z - ROOF_OUT], max: [thing.x + ROOF_OUT, thing.crown + lid, thing.z + ROOF_OUT] })
      }
      for (const box of boxes) {
        const t = hitBox(ray, box)
        // One of the folk in front of a thing is tapped himself, never the thing behind him.
        if (t !== null && t < nearest) { nearest = t; best = { on: 'thing', index } }
      }
    })
    return best
  }

  /** A castle thing is tapped, or dragged at: the answer of its cell in the grid's fifth column. */
  act(index: number): void {
    const thing = this.things[index]
    if (!thing || this.dress[index] < 1) return
    this.acted[index] = 0
    let clang = false
    switch (thing.what) {
      case 'bridge': {
        this.send(thing, (who) => this.cross(who, thing))
        break
      }
      case 'gate':
        if (this.rests.dragon.how === 'gate' && this.rests.dragon.thing === index && !this.actors.dragon.busy) this.tuck = 0
        break
      case 'tower':
        // Battlements only duck. A roof with the king on it sags under him, and he makes his noise where he sits.
        // Any other roof is lifted off, and the nearest who has room in the tower is set in it and looks out.
        if (thing.covered) break
        if (this.kingOn(index)) this.route('king', [{ type: 'peek', who: 'king' }])
        // Its roof is up over a visitor: it bobs where it waits.
        else if (this.lidOf === index && this.lidUp > 0.05) this.lidTapped = 0
        else if (!this.visit) {
          let hover = 0
          const who = this.send(thing, (one) => { const plan = this.peek(one, thing); hover = plan ? plan.hover : 0; return plan ? plan.maker : null })
          if (who) { this.visit = { index, who, hover }; if (this.lidOf !== index) this.lidUp = 0; this.lidOf = index }
        }
        break
      case 'pole':
        this.flagColour[index] = (this.flagColour[index] + 1) % 3
        // A flag near the king is to his taste: as it runs down and up he stretches up tall to it, beaming, with
        // his own noise.
        if (this.flagNear(index) && !this.actors.king.busy) this.route('king', [{ type: 'peek', who: 'king' }])
        break
      case 'room':
        if (this.rests.cook.how === 'window' && this.rests.cook.thing === index && !this.actors.cook.busy) {
          clang = true
          // Something built over his room is to his taste: he grins and stirs as fast as he can. In a plain
          // room the clang only startles him.
          this.folk.stir('cook', thing.covered ? 'taste' : 'knock', 1)
        }
        break
      case 'slide':
        this.send(thing, (who) => this.slide(who, thing))
        break
    }
    this.emit({ type: 'act', what: thing.what, clang })
  }

  /**
   * Sends the nearest of the folk who can make a trip, one at a time: while
   * one of them is out, a tap gets the thing's own answer only. The dragon
   * never goes: at his length he would lie through half the castle.
   */
  private send(thing: Thing, plan: (who: Who) => RouteMaker | null): Who | null {
    if (WHO.some((who) => this.actors[who].busy)) return null
    const among: Who[] = ['king', 'cook']
    while (among.length > 0) {
      const who = nearestTo(thing, this.rests, among)
      if (!who) return null
      const maker = plan(who)
      // He goes only where the whole way is in the frame and clear of the home control.
      if (maker && this.topsOf(who, this.actors[who].stance(), maker.legs).every((point) => clearInFrame(point, this.far))) { this.actors[who].send(maker.legs); return who }
      among.splice(among.indexOf(who), 1)
    }
    return null
  }

  /** The way one of the folk crosses a bridge, trip-trap. Where its far end hangs in the air he is bounced, and steps back. Null where one of the others is in his way. */
  private cross(who: Who, bridge: Thing): RouteMaker | null {
    const others = this.othersNow(who)
    const from = this.actors[who].stance()
    const fromLeft = from.at[0] <= bridge.x
    const cols = [0, 1, 2].map((i) => bridge.col + (fromLeft ? i : SHAPE.long.wide - 1 - i))
    const headTo = fromLeft ? 1 : -1
    const spots = cols.map((col) => this.perch(who, bridge.x + (col - bridge.col - 1), bridge.z, headTo, -1, bridge.top))
    if (spots.some((spot) => !this.free(who, spot, others))) return null
    const maker = new RouteMaker()
    const left = this.fromRest(maker, who, from)
    const landed: RouteEvent[] = [{ type: 'step', who, n: 0 }]
    if (this.rests.dragon.how === 'bridge' && this.rests.dragon.thing === bridge.index && !this.actors.dragon.busy) {
      const [x, y, z] = this.rests.dragon.at
      landed.push({ type: 'puff', at: [x, y + 0.5, z + 0.4] })
    }
    // An end in the air is a springboard, whichever end he is on: it dips under him and throws him up. With
    // something standing on the board it cannot bend, and he only walks it.
    const springy = !bridge.covered
    const nearAir = springy && (fromLeft ? bridge.airLeft : bridge.airRight)
    const farAir = springy && (fromLeft ? bridge.airRight : bridge.airLeft)
    if (nearAir) landed.push({ type: 'bend', who, thing: bridge.index, end: fromLeft ? -1 : 1 })
    this.carry(maker, who, left, spots[0], 0.55, others, landed, [{ type: 'hup', who }])
    if (nearAir) maker.wait(BEND_DIP).go(spots[0], 0.4, 0.7, [{ type: 'step', who, n: 0 }], [{ type: 'boing', who }])
    this.hop(maker, who, spots[0], spots[1], 0.26, 0.3, others, [{ type: 'step', who, n: 1 }])
    this.hop(maker, who, spots[1], spots[2], 0.26, 0.3, others, farAir ? [{ type: 'step', who, n: 2 }, { type: 'bend', who, thing: bridge.index, end: fromLeft ? 1 : -1 }] : [{ type: 'step', who, n: 2 }])
    if (farAir) {
      maker.wait(BEND_DIP).go(spots[2], 0.4, 0.7, [{ type: 'step', who, n: 2 }], [{ type: 'boing', who }])
      this.hop(maker, who, spots[2], spots[1], 0.26, 0.3, others, [{ type: 'step', who, n: 1 }])
      this.hop(maker, who, spots[1], spots[0], 0.26, 0.3, others, [{ type: 'step', who, n: 0 }])
      maker.wait(0.15)
      this.toRest(maker, who, spots[0], 0.6, others, [{ type: 'home', who }])
    } else {
      maker.wait(0.2)
      this.toRest(maker, who, spots[2], 0.6, others, [{ type: 'home', who }])
    }
    return maker
  }

  /**
   * The way one of the folk is set in a tower whose roof has been lifted
   * off, looks out, and goes back; and how high the roof must wait over the
   * tower's top to be over his head all the way. Null where he has no room
   * in it: where what stands beside the tower would hold him higher than
   * its top, where one of the others is in his place there or over the
   * roof's way up, where he rests over the roof himself, or where the roof
   * would leave the frame.
   */
  private peek(who: Who, tower: Thing): { maker: RouteMaker; hover: number } | null {
    const others = this.othersNow(who)
    const from = this.actors[who].stance()
    const stand = this.perch(who, tower.x, tower.z, 1, tower.index, tower.top)
    if (stand.at[1] > tower.top + 1e-6 || !this.free(who, stand, others)) return null
    if (this.overTower(who, from.at, tower)) return null
    const maker = new RouteMaker()
    const left = this.fromRest(maker, who, from)
    this.carry(maker, who, left, stand, 0.55, others, [{ type: 'peek', who }], [{ type: 'hup', who }])
    maker.wait(PEEK_SECONDS)
    this.toRest(maker, who, stand, 0.6, others, [{ type: 'home', who }])
    // The roof waits over the highest his head comes while he is over the tower.
    const reach = this.reach(who)
    let high = tower.top
    for (const point of this.topsOf(who, from, maker.legs)) if (Math.abs(point[0] - tower.x) < reach + 0.6 && Math.abs(point[2] - tower.z) < reach + 0.6) high = Math.max(high, point[1])
    // His box ends below the tip of what he wears: the roof goes that much higher, with room for a hop.
    const over = FOLK[who].size * (1 + AIR_STRETCH) * (WORN[who as 'king' | 'cook'].top + (who === 'king' ? KING_SEAT : 0) + 0.25) - BODY[who as 'king' | 'cook'].tall
    const hover = high + Math.max(0, over) + LID_GAP - tower.top
    // Nobody is in the roof's way up, and at the top of its way it is in the frame.
    const way: Box = { min: [tower.x - 0.5, tower.top, tower.z - 0.5], max: [tower.x + 0.5, tower.top + hover + ROOF, tower.z + 0.5] }
    for (const other of WHO) {
      const theirs = others[other]
      if (theirs && boxesAt(other, theirs).some((box) => overSameFloor(box, way) && box.max[1] > way.min[1])) return null
    }
    if (!clearInFrame([tower.x, way.max[1], tower.z], this.far)) return null
    return { maker, hover }
  }

  /**
   * How high the top of whatever he wears is right now, in the room: the tip
   * of the king's crown as he sits on his cushion, the stalk of the cook's
   * cap, with his hop, his stretch and the tilt of what he wears. Never
   * lower than the top of his box. A roof that waits over him waits over this.
   */
  headTop(who: Who): number {
    const actor = this.actors[who], placing = actor.placing
    const boxed = Math.max(...boxesAt(who, actor.stance()).map((box) => box.max[1]))
    if (who === 'dragon') return boxed
    const pose = this.folk.pose(who), size = FOLK[who].size
    // The cook's cap bobs up off his head; the king's crown only drops. Either comes up at its rim as it tilts.
    const tilt = Math.abs(pose.propTilt) + Math.abs(pose.nod) + Math.abs(pose.lean)
    const worn = WORN[who]
    const seat = who === 'king' ? KING_SEAT * this.kingSits : 0
    const pot = who === 'cook' ? POT_ON_CAP * this.cookHigh : 0
    // Squashed he is wider, and lying it is his width that stands up; a hop lifts him whichever way he lies.
    const wide = worn.wide / Math.sqrt(Math.max(0.4, pose.squash))
    const tall = seat + pose.squash * (worn.top + (who === 'cook' ? Math.max(0, pose.prop) : 0) + pot) + wide * Math.sin(Math.min(1, tilt))
    const lie = (Math.abs(placing.lie) * Math.PI) / 2
    const stretch = 1 + AIR_STRETCH * placing.air
    return Math.max(boxed, placing.at[1] + size * (Math.max(0, pose.y) * stretch + tall * stretch * Math.cos(lie) + wide * Math.sin(lie)))
  }

  /** How far from the middle of a tower one of them is still over its roof. */
  private reach(who: Who): number {
    return ROOF_OUT + BODY[who as 'king' | 'cook'].half + 0.05
  }

  private overTower(who: Who, at: Vec3, tower: Thing): boolean {
    const reach = this.reach(who)
    return Math.abs(at[0] - tower.x) < reach && Math.abs(at[2] - tower.z) < reach
  }

  /**
   * How high over its tower's top a roof is now. Lifted off for a visitor,
   * it goes up to where it waits; while he is over the tower it stays just
   * over his head, down with him as he is set in and up with him as he is
   * lifted out; when he is home it comes down again.
   */
  lid(index: number): number {
    if (this.lidOf !== index) return 0
    const visit = this.visit
    const thing = this.things[index]
    // Tapped while it is up, it bobs higher with its creak and comes back: never down on his head.
    const bob = LID_BOB * Math.sin(clamp01(this.lidTapped / LID_BOB_SECONDS) * Math.PI)
    if (visit && visit.index === index && thing) {
      const actor = this.actors[visit.who]
      if (this.overTower(visit.who, actor.placing.at, thing)) {
        return Math.max(0, this.headTop(visit.who) + LID_GAP - thing.top) + bob
      }
    }
    return this.lidUp + bob * clamp01(this.lidUp / 0.2)
  }

  /**
   * The way one of the folk climbs a slide and goes down it: a bump on the
   * rug, a splash in the moat, or on down the next slide. Null where one of
   * the others is in his way, or something beside the slide is.
   */
  private slide(who: Who, first: Thing): RouteMaker | null {
    const others = this.othersNow(who)
    const from = this.actors[who].stance()
    const { half } = BODY[who as 'king' | 'cook']
    let slide = first
    const side = slide.side as 1 | -1
    const top = this.perch(who, slide.x - side * 0.5, slide.z, side, -1, slide.top)
    if (!this.free(who, top, others)) return null
    const maker = new RouteMaker()
    const left = this.fromRest(maker, who, from)
    this.carry(maker, who, left, top, 0.55, others, [], [{ type: 'hup', who }])
    maker.wait(0.15)
    let last = top
    for (let run = 0; run < 3; run++) {
      // Down the face to its toe, on whatever is highest under him there: he goes only where the way down is clear.
      const foot = this.perch(who, slide.x + side * 0.93, slide.z, side, slide.index, slide.base + 0.05)
      const clear = foot.at[1] < last.at[1] - 0.2 && this.free(who, foot, others) && this.over(who, last, foot, others, slide.index) <= foot.at[1] + 1e-6
      if (!clear) { if (run === 0) return null; break }
      maker.go(foot, 0.45, 0, [], run === 0 ? [{ type: 'whee', who }] : [])
      last = foot
      const beyond = slide.x + side * 1.5
      const next = this.things.find((thing) => thing.what === 'slide' && thing.side === side && thing.row === slide.row && thing.index !== slide.index && Math.abs(thing.x - side * 0.5 - beyond) < 0.6 && thing.top <= foot.at[1] + 0.05)
      if (!next) break
      slide = next
    }
    const beyond = slide.x + side * (0.93 + 0.2 + half)
    // Off the left edge of the rug is the moat. There is no room past its right edge, where the basket stands.
    // Where the king has stayed at his place by the rug there is no water beside him.
    const kingInTheWay = this.rests.king.how === 'day' && (who !== 'king' || slide.z > 0.2)
    const pool: Stance = { at: [RUG.x0 - 0.2 - half, -0.04, slide.z], lie: 0, path: [] }
    const spot = this.perch(who, beyond, slide.z, side)
    if (side < 0 && beyond - half < RUG.x0 && !kingInTheWay && this.free(who, pool, others) && this.over(who, last, pool, others, slide.index) <= last.at[1] + 1e-6) {
      this.off(maker, last, pool, [{ type: 'splash', who, at: [pool.at[0], 0, pool.at[2]] }])
      last = pool
      maker.wait(0.9)
    } else if ((side < 0 ? beyond - half >= RUG.x0 : beyond + half <= RUG.x1) && this.free(who, spot, others) && spot.at[1] <= last.at[1] + 1e-6 && this.over(who, last, spot, others, slide.index) <= last.at[1] + 1e-6) {
      this.off(maker, last, spot, [{ type: 'bump', who }])
      last = spot
      maker.wait(0.4)
    } else {
      maker.wait(0.05).go(last, 0.25, 0.2, [{ type: 'bump', who }]).wait(0.4)
    }
    this.toRest(maker, who, last, 0.6, others, [{ type: 'home', who }])
    return maker
  }

  // --- Time -----------------------------------------------------------------------

  step(dt: number, now: number): void {
    if (this.scene) this.scene.update(now)
    this.bell.step(dt)
    this.tuck += dt
    if (this.board && (this.board.t += dt) > BEND_SECONDS) this.board = null
    // The roof lifted off for a visitor goes up at once, and down again when he is home.
    if (this.visit && !this.actors[this.visit.who].busy) this.visit = null
    this.lidUp += ((this.visit ? this.visit.hover : 0) - this.lidUp) * (1 - Math.exp(-14 * dt))
    this.lidTapped += dt
    if (!this.visit && this.lidUp < 0.002) { this.lidUp = 0; this.lidOf = -1 }
    for (const who of WHO) this.shook[who] += dt
    for (let i = 0; i < this.acted.length; i++) this.acted[i] += dt
    // A route that a tap started runs by itself; a scene seeks its own.
    if (!this.running) for (const who of WHO) this.route(who, this.actors[who].step(dt))
    const ease = 1 - Math.exp(-6 * dt)
    // The camera has stepped back before anyone is lifted in, and stays back until all are home.
    this.back += (this.far * (this.on ? smooth(clamp01(this.dusk / 0.4)) : this.running ? smooth(clamp01(this.dusk / 0.5)) : 0) - this.back) * (1 - Math.exp(-9 * dt))
    // Between scenes these follow the evening; during one, each follows its own moment in it.
    const nose = this.rests.dragon.how === 'gate' && (this.running ? this.gateHeld : this.on) ? 1 : 0
    this.nose += (nose - this.nose) * ease
    const sits = this.rests.king.how !== 'day' && (this.running ? this.kingSeated : this.on) ? 1 : 0
    this.kingSits += (sits - this.kingSits) * ease
    // In the open with no room to his taste, the cook frowns into his pot for as long as it is evening.
    this.folk.frown(this.on && this.rests.cook.how === 'open' && this.dusk > 0.5)
    // On the point of a roof or the tip of a pole the king wobbles, for as long as he sits there.
    const seat = this.things[this.rests.king.thing]
    const tip = this.rests.king.how === 'seat' && !!seat && (seat.what === 'pole' || (seat.what === 'tower' && !seat.covered))
    this.folk.perch(this.on && tip && this.kingSits > 0.5 && !this.actors.king.busy)
    // Only on his way in to a room up high: lying there his eyes are open, and on a later trip his pot is out in
    // front of him as anywhere.
    const high = this.on && this.rests.cook.high && this.cookClimbs ? 1 : 0
    this.cookHigh += (high - this.cookHigh) * ease
    this.look()
  }

  /**
   * The bridge that is bending now, if one is: which, the angle it is turned
   * by about the room's depth (a left end dips with a positive angle), and
   * the point of its foot it turns about. It dips under the one who landed
   * on its end, and from the boing swings up and comes to rest.
   */
  bent(): { index: number; angle: number; pivot: number; base: number } | null {
    const board = this.board
    const thing = board ? this.things[board.index] : undefined
    if (!board || !thing) return null
    const pivot = board.end < 0 ? thing.pivotLeft : thing.pivotRight
    const lever = Math.max(0.5, Math.abs(thing.x + (board.end * SIZE.long[0]) / 2 - pivot))
    const after = board.t - BEND_DIP
    const swing = after < 0 ? smooth(board.t / BEND_DIP) : Math.cos(after * Math.PI * 6) * Math.exp(-after * 6)
    return { index: board.index, angle: -board.end * swing * (BEND_DEEP / lever), pivot, base: thing.base }
  }

  /** How far the one who stands on a bending board goes down and up with it, in room units: nothing while he is in the air over it. */
  rides(who: Who): number {
    const bent = this.bent()
    if (!bent || this.board!.who !== who) return 0
    const thing = this.things[bent.index], placing = this.actors[who].placing
    const [x, y, z] = placing.at
    if (Math.abs(x - thing.x) > SIZE.long[0] / 2 + 0.1 || Math.abs(z - thing.z) > 0.3 || y < thing.top - 0.02) return 0
    return Math.sin(bent.angle) * (x - bent.pivot) * (1 - placing.air)
  }

  /** How far the one who stands on a bending board is tipped with it, as an angle about the room's depth: his seat lies on the board at every frame of the dip and the throw. */
  leans(who: Who): number {
    const bent = this.bent()
    if (!bent || this.rides(who) === 0) return 0
    return bent.angle * (1 - this.actors[who].placing.air)
  }

  /** The moat stops short of the king where he has stayed at his place by the rug: he does not like water. */
  get moatShort(): boolean {
    return this.rests.king.how === 'day'
  }

  /** How far the dragon has his head pulled back from under his gate, 0 to 1. */
  get tucked(): number {
    return this.tuck < 1.7 ? Math.min(clamp01(this.tuck / 0.3), 1 - clamp01((this.tuck - 1.3) / 0.4)) : 0
  }

  /**
   * How far down the grille of a gate is, 0 to 1. It lands in three drops
   * as it arrives; tapped, it goes up tooth by tooth and comes down at
   * once. Where the dragon has his nose under it, it rests on his nose and
   * goes up with his head when he lifts it. It comes down only when the tip
   * of his nose is back past it, in the last fifth of his tuck, and is up
   * again before his nose comes out.
   */
  grille(index: number): number {
    const act = this.acting(index)
    let down = Math.min(1, Math.ceil(this.dress[index] * 3 - 0.001) / 3)
    if (act < 1) {
      const s = act * ACT_SECONDS.gate
      down = s < 0.5 ? 1 - 0.85 * (Math.ceil((s / 0.5) * 6) / 6) : s < 0.8 ? 0.15 : 1
    }
    if (this.rests.dragon.how !== 'gate' || this.rests.dragon.thing !== index) return down
    const under = 1 - clamp01((this.tucked - 0.8) / 0.2)
    return Math.min(down, 1 - (0.8 + 0.12 * this.noseLift()) * this.nose * under)
  }

  /** How far the dragon's head is lifted where he lies with his nose under his gate, 0 to 1: the grille that rests on it goes up with it. */
  noseLift(): number {
    if (this.rests.dragon.how !== 'gate') return 0
    return dragonHead(this.folk.pose('dragon'), 0).head / GATE_GAPE
  }

  /** Whether the king sits on the point of this tower's roof now. */
  kingOn(index: number): boolean {
    const rest = this.rests.king, at = this.actors.king.placing.at
    return this.on && rest.how === 'seat' && rest.thing === index && !this.actors.king.busy && Math.hypot(at[0] - rest.at[0], at[1] - rest.at[1], at[2] - rest.at[2]) < 0.01
  }

  /**
   * With the king on its point a tapped roof cannot lift like a lid: it sags
   * under him and springs back. How far its point and the king go down, in
   * room units.
   */
  kingSags(): number {
    const index = this.rests.king.thing
    const thing = this.things[index]
    if (!thing || thing.what !== 'tower' || thing.covered || !this.kingOn(index)) return 0
    const act = this.acting(index)
    return act < 1 ? ROOF * 0.22 * Math.sin(act * Math.PI) : 0
  }

  /** Whether the flag of this pole is near the king where he sits this evening: on the pole he sits on, or within two and a half places of his seat. */
  flagNear(index: number): boolean {
    const pole = this.things[index], king = this.rests.king
    if (!pole || pole.what !== 'pole' || king.how !== 'seat') return false
    return king.thing === index || Math.hypot(pole.x - king.at[0], pole.z - king.at[2]) <= FLAG_NEAR
  }

  /**
   * How far a board of a tapped bridge jumps as the boards rattle, in room
   * units. One of the folk who is coming down on the bridge presses them
   * still: they jump less the nearer he is over them, and not at all under
   * one who stands on them.
   */
  boardLift(index: number, slat: number): number {
    const thing = this.things[index], act = this.acting(index)
    if (!thing || act >= 1) return 0
    let weight = 0
    for (const who of ['king', 'cook'] as const) {
      const [x, y, z] = this.actors[who].placing.at
      if (Math.abs(x - thing.x) > SIZE.long[0] / 2 + BODY[who].half || Math.abs(z - thing.z) > SIZE.long[2] / 2 + BODY[who].half) continue
      weight = Math.max(weight, clamp01(1 - (y - (thing.top + BOARDS)) / RATTLE_ROOM))
    }
    return RATTLE * (1 - weight) * Math.sin(act * Math.PI) * Math.max(0, Math.sin(act * 26 - slat * 1.1))
  }

  /** How far a thing is through its answer to a tap, 0 to 1; 1 at rest. */
  acting(index: number): number {
    return clamp01(this.acted[index] / ACT_SECONDS[this.things[index].what])
  }
}
