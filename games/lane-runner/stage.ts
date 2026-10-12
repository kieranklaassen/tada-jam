import { at as beadAt } from './beads'
import { onPlane, type Box, type Shot } from './camera'
import { CHARACTERS, FIXTURES, NEST, type Figure } from './figures'
import type { Hint } from './guide'
import { gotOf, type Actor } from './handover'
import { WANTS, type Lap, type LapEvent, type Receiver, type Watcher } from './lap'
import { LOADS } from './lapState'
import { CARRIED_IN_FRONT, LADDER_FLAT, LoadMotion, type Kept, type LoadName } from './loads'
import { FoxMotion, GooseMotion, type GooseAt, type Sight } from './motion'
import { place, type Bounds, type Quad } from './placing'
import { Pose, Spell } from './pose'
import { GATE_SECONDS, LOAD_FIGURES, NEIGHBOURS, NEIGHBOUR_NAMES, OBSTACLE_AT, OBSTACLE_FIGURES, SHELF, SHELF_BEFORE, SLOP, gateFlown, gateLift, type Fixed, type Neighbour } from './props'
import { GOOSE_BY_POST, makeWaiters, type Got, type Waiter } from './receivers'
import { CLEARING } from './scenery'
import { Spray } from './spray'
import { CLEAR, PLACES, laneX, offset, shownAt } from './trail'
import { STAND } from './view/heights'
import { makeNeighbours, makeObstacles, type Standing } from './wayside'

// Everyone and everything on the board for one frame, with no renderer in
// it: who stands where, in what pose, and which plaques that puts where. The
// view draws exactly this list and a finger is read against exactly this
// list. It decides nothing about the lap: the lap says what happened and
// this shows it.

/** Every figure the stage can put on the board. The view paints their plaques before the first frame, and a test reads every one of them. */
export function everyFigure(): Figure[] {
  return [...CHARACTERS, ...FIXTURES, NEST, SHELF, SLOP, LADDER_FLAT, ...Object.values(LOAD_FIGURES), ...Object.values(OBSTACLE_FIGURES), ...NEIGHBOUR_NAMES.map((name) => NEIGHBOURS[name].figure)]
}

/** What a finger can land on. */
export type Touch = { kind: 'load'; load: LoadName } | { kind: 'who'; who: Watcher }

export type Item = {
  /** The name of the thing, the same for all of its plaques. */
  key: string
  figure: Figure
  pose: Pose
  /** Where its origin is: pegs right of the trail's middle, pegs above the board, pegs along the trail, and pegs towards the child from that place. */
  x: number
  y: number
  s: number
  z: number
  touch: Touch | null
  /** Its plaques in `Stage.quads`, from one index up to another, and the box of them in its own pegs. */
  from: number
  to: number
  bounds: Bounds
  /** Whether it casts a soft dark on the board, and how wide. */
  shade: number
}

/** A pool of light the idle ladder lays on the board, or stands behind a load. */
export type Light = { x: number; y: number; s: number; z: number; wide: number; tall: number; flat: boolean; strength: number }

/** The ghost hand: where its fingertip is, how far it is pressed, and how much of it shows. */
export type Ghost = { x: number; y: number; s: number; z: number; press: number; opacity: number }

/** How far ahead of the fox a finger still finds things, in pegs: as far as the nearest haze of any quality tier, so that nothing is touched that is not drawn. */
export const TOUCH_REACH = 440

/** How high the fox hops and how far it ducks on the spot while the ghost hand shows a flick, and how far the hand travels up and down for it, in pegs. */
export const MIME_HOP = 5
export const MIME_DUCK = 0.3
export const FLICK_UP = 13
export const FLICK_DOWN = 14
/** Where the ghost hand's fingertip is when it shows a move on the trail: pegs to the right of the fox, above the board, and in front of the fox. */
export const HAND_BESIDE = 20
export const HAND_HIGH = 33
export const HAND_BEFORE = 6

/**
 * A hair of depth for each kind of thing, in pegs towards the child. The layers inside a figure are tenths of a
 * peg apart and things stand on whole pegs, so without it two things could come to stand in exactly one plane.
 * With it no layer of one kind is ever in the plane of a layer of another, wherever on whole pegs they stand.
 */
export const DEPTH = { shelf: 0.01, nest: 0.02, goose: 0.05, waiter: 0.07, obstacle: 0.04, neighbour: 0.06 }

/**
 * A slop of the bucket's water is seen as water: one body of it leaves the pail, comes down on what is under it
 * and spreads flat there, with the drops flying from it. It falls where the fox was when it left the pail, this
 * far in front of that place: nearer the child than anything the fox has on it or carries, which are all going
 * away behind it.
 */
export const SLOP_IN_FRONT = 7.6
export const SLOP_FALLS = 0.24
export const SLOP_SPREADS = 0.14
/** Thrown at the mud, which lies flat, the water goes this far on along the trail as it falls, so it comes down on the mud and not before it. It is slower than the fox, which stays ahead of it. On whatever stands (the thorns, the goose, the log) it comes down on the near side, in front of the thing. */
export const SLOP_REACHES = 14
/** How high each thing a slop comes down on is: the board, the goose on her nest, the thorns, the log. */
const SLOP_ON: Partial<Record<string, number>> = { sulk: 10, flowers: CLEAR.archTop, mushrooms: CLEAR.logTop }

const newBounds = (): Bounds => ({ minX: 0, maxX: 0, minY: 0, maxY: 0, front: 0 })

export class Stage {
  readonly items: Item[] = []
  readonly quads: Quad[] = []
  readonly lights: Light[] = []
  readonly ghost: Ghost = { x: 0, y: 0, s: 0, z: 0, press: 0, opacity: 0 }
  readonly spray: Spray
  readonly fox: FoxMotion
  readonly goose = new GooseMotion()
  readonly waiters: Record<Receiver, Waiter> = makeWaiters()
  private readonly loads: Record<LoadName, LoadMotion>
  private readonly obstacles: Record<Fixed, Standing> = makeObstacles()
  private readonly neighbours: Record<Neighbour, Standing> = makeNeighbours()
  private readonly nest = new Pose(NEST)
  private readonly shelf = new Pose(SHELF)
  /** How far up the gate is flown, 0 to 1. */
  private gateUp: number
  private readonly slop = new Pose(SLOP)
  private readonly slopping = new Spell()
  private readonly slopFrom = { x: 0, y: 0, s: 0 }
  private readonly slopTo = { x: 0, y: 0, ahead: 0 }
  private slopS = 0
  private readonly sight: Sight = { right: 0, ahead: 0, up: 0 }
  /** Who has taken the load in the hand-over, or null. */
  private taker: Waiter | null = null
  private got: Got | null = null
  /** The goose has come down off the ladder at the clearing. */
  private gooseDown = false
  private count = 0
  private used = 0

  constructor(lap: Lap, seed: number, loose: number) {
    this.fox = new FoxMotion(lap)
    this.spray = new Spray(seed, loose)
    this.loads = { cake: new LoadMotion('cake'), ladder: new LoadMotion('ladder'), balloons: new LoadMotion('balloons'), owl: new LoadMotion('owl'), bucket: new LoadMotion('bucket') }
    // Found as left: the gate is where the fox's place puts it, with nothing on its way.
    this.gateUp = gateFlown(offset(PLACES.shelf, lap.s)) ? 1 : 0
    // A lap found finished is found with the hand-over over: everyone in the pose it ends in.
    if (lap.finished) this.settle(lap)
  }

  /** Everyone into the pose the hand-over ends in, at once and with no motion left over. */
  settle(lap: Lap): void {
    const got = gotOf({ load: lap.load, held: lap.carrying, lies: lap.lies, left: lap.left, marks: lap.marks, trail: lap.trail })
    this.got = got
    const wanted = got ? WANTS[got.load] : null
    for (const who of Object.keys(this.waiters) as Receiver[]) this.waiters[who].settle(who === wanted ? got : null)
    this.taker = wanted ? this.waiters[wanted] : null
    this.gooseDown = got !== null && got.rode
    this.fox.still()
  }

  /** A new lap: everyone waits again with their wants showing. */
  private reset(): void {
    this.got = null
    this.taker = null
    this.gooseDown = false
    for (const who of Object.keys(this.waiters) as Receiver[]) this.waiters[who].settle(null)
  }

  /** One step of the hand-over, on the frame it falls on. */
  step(who: Actor, step: string, lap: Lap): void {
    // The fox has no step of its own: it stands where it skidded in, and what it does there is the lap's.
    if (who === 'fox') return
    if (who === 'goose') {
      if (step === 'perch') {
        this.gooseDown = true
        this.goose.flutter(0.7)
      }
      return
    }
    const waiter = this.waiters[who]
    if (step === 'come') {
      // It stops clear of the fox as both are drawn on this frame.
      const fox = this.items.find((item) => item.key === 'fox'), own = this.items.find((item) => item.key === who)
      waiter.come(
        lap.x,
        fox ? { left: fox.x + fox.bounds.minX, right: fox.x + fox.bounds.maxX } : { left: lap.x - 10, right: lap.x + 12 },
        own ? { left: -own.bounds.minX, right: own.bounds.maxX } : { left: 16, right: 16 },
      )
    }
    else if (step === 'home') waiter.goHome()
    else if (step === 'look') waiter.look()
    else if (step === 'greet') waiter.greet()
    else {
      if (step === 'take' || step === 'fetch') {
        this.got = gotOf({ load: lap.load, held: lap.carrying, lies: lap.lies, left: lap.left, marks: lap.marks, trail: lap.trail })
        this.taker = waiter
      }
      // The crumbs are licked off the fox's hands, where the cake was eaten: the fox holds them out to the bear's side.
      if (step === 'crumbs') this.fox.offers(CLEARING[who].x + waiter.pose.x < lap.x ? -1 : 1)
      waiter.react(step, this.got)
    }
  }

  /** What the lap just did, on the frame it did it: every motion it sets off, and the loose beads it kicks up. */
  on(event: LapEvent, lap: Lap): void {
    this.fox.on(event)
    this.goose.on(event)
    if (event.type === 'poke' && event.who !== 'goose') this.waiters[event.who].poke()
    if (event.type === 'begin') this.reset()
    if (lap.load !== 'none') this.loads[lap.load].on(event, lap, lap.y)
    for (const name of Object.keys(this.obstacles) as Fixed[]) this.obstacles[name].on(event)
    this.pour(event, lap)
    this.scatter(event, lap)
  }

  /** The bucket's water leaving the pail: a slop that a jump tossed coming down on what is under it, or all of it coming down over the fox. */
  private pour(event: LapEvent, lap: Lap): void {
    const douse = event.type === 'douse'
    if (!douse && !(event.type === 'gag' && lap.load === 'bucket' && ['spill', 'puddle', 'sulk', 'flowers', 'mushrooms'].includes(event.gag))) return
    this.slopFrom.x = lap.x
    this.slopFrom.y = lap.y + (douse ? CLEAR.fox - 6 : CLEAR.fox + 10)
    this.slopFrom.s = lap.s
    // It comes down in the fox's own lane, and on the goose where she sits.
    this.slopTo.x = event.type === 'gag' && event.gag === 'sulk' ? laneX(1) : lap.x
    this.slopTo.y = event.type === 'gag' ? SLOP_ON[event.gag] ?? 0 : 0
    this.slopTo.ahead = event.type === 'gag' && event.gag === 'puddle' ? SLOP_REACHES : 0
    this.slopS = lap.s
    this.slopping.start(SLOP_FALLS + SLOP_SPREADS)
  }

  /** The beads that fly: off the board from the fox's heels, and out of whatever it lands in. */
  private scatter(event: LapEvent, lap: Lap): void {
    const spray = this.spray
    switch (event.type) {
      case 'start':
        spray.burst(lap.s - 2, lap.x, 7, -50, 40, 60)
        break
      case 'stop':
      case 'arrive':
        spray.burst(lap.s + 3, lap.x, 12, 45, 60, 80)
        break
      case 'land':
        spray.burst(lap.s, lap.x, event.hard ? 10 : 6, 0, 80, 60)
        break
      case 'bump':
        spray.burst(lap.s + 4, lap.x, 14, -40, 110, 110)
        break
      case 'squawk':
        spray.burst(lap.s, lap.x, 8, 0, 90, 90)
        break
      case 'step':
        // Brown prints behind a fox that wades.
        if (event.surface === 'mud') spray.drop(lap.s - 3, lap.x + (event.foot === 0 ? -3 : 3), 'B')
        break
      case 'gag': {
        const water = ['splash', 'scoop', 'spill', 'puddle', 'sail', 'sulk', 'flowers', 'mushrooms'] as const
        const mud = ['flop', 'mudpie', 'mudball', 'mudTier', 'wade'] as const
        if ((water as readonly string[]).includes(event.gag)) spray.burst(lap.s + 2, lap.x, 14, 10, 90, 100, ['U', 'u', 'W'])
        else if ((mud as readonly string[]).includes(event.gag)) spray.burst(lap.s + 2, lap.x, 12, 10, 80, 80, ['B', 'D', 'T'])
        else if (event.gag === 'pops' || event.gag === 'bang') spray.burst(lap.s + 4, lap.x, 10, 0, 120, 120, ['R', 'Y', 'U', 'V'])
        else if (event.gag === 'leafhat' || event.gag === 'burrs' || event.gag === 'burrball') spray.burst(lap.s + 2, lap.x, 9, 0, 80, 90, ['G', 'g', 'l'])
        break
      }
      case 'cue':
        // Shaking dry.
        if (event.act === 'splash') spray.burst(lap.s, lap.x, 6, 0, 110, 70, ['U', 'u'])
        break
      case 'pop':
        spray.burst(lap.s + 4, lap.x, 6, 0, 120, 120, ['R', 'Y', 'U', 'V'])
        break
      case 'chime':
        // Petals, off the arches.
        spray.burst(lap.s + 4, lap.x, 4, 0, 60, 110, ['P', 'W', 'Y'])
        break
      case 'douse':
        spray.burst(lap.s, lap.x, 12, 0, 80, 60, ['U', 'u', 'W'])
        break
      default:
        break
    }
  }

  private add(key: string, figure: Figure, pose: Pose, x: number, y: number, s: number, z: number, touch: Touch | null, shade: number): Item {
    let item = this.items[this.count]
    if (!item) {
      item = { key, figure, pose, x, y, s, z, touch, from: 0, to: 0, bounds: newBounds(), shade }
      this.items[this.count] = item
    }
    this.count += 1
    item.key = key
    item.figure = figure
    item.pose = pose
    item.x = x
    item.y = y
    item.s = s + pose.s
    item.z = z
    item.touch = touch
    item.shade = shade
    item.from = this.used
    this.used = place(figure, pose, this.quads, this.used, item.bounds)
    item.to = this.used
    return item
  }

  private see(lap: Lap, x: number, s: number): Sight {
    this.sight.right = lap.x - x
    this.sight.ahead = offset(s, lap.s)
    this.sight.up = lap.y
    return this.sight
  }

  /**
   * Lays the frame out. `seconds` is the frame's step of play and `t` the attended clock. Afterwards `items`
   * holds `length` things (the rest of the list is left over from fuller frames) and `quads` their plaques.
   */
  update(seconds: number, t: number, lap: Lap, hint: Hint): void {
    this.count = 0
    this.used = 0
    this.lights.length = 0
    this.spray.step(seconds)

    const foxPose = this.fox.update(seconds, t, lap, hint.wants === 'run' ? hint.mime : 0)
    // With the ghost hand's flick the fox shows what a flick does, on the spot: a hop for up, a duck for down.
    if (hint.wants === 'run' && hint.flick !== 0 && lap.roll <= 0) {
      const swing = Math.sin(Math.PI * hint.answer)
      if (hint.flick > 0) foxPose.y += MIME_HOP * swing
      else foxPose.sy *= 1 - MIME_DUCK * swing
    }
    const fox = this.add('fox', this.fox.figure, foxPose, 0, 0, lap.s, 0, null, 14)

    // A slop of water on its way down, and spreading where it came down. It is gone at once should the fox be
    // carried back past where it fell.
    if (this.slopping.on && offset(this.slopS, lap.s) < 0) this.slopping.stop()
    const slop = this.slopping.step(seconds)
    if (slop >= 0) {
      const whole = SLOP_FALLS + SLOP_SPREADS
      const fall = Math.min(1, (slop * whole) / SLOP_FALLS), spread = Math.max(0, (slop * whole - SLOP_FALLS) / SLOP_SPREADS)
      const pose = this.slop
      pose.clear()
      pose.sy = 1 - 0.8 * spread
      pose.sx = 1 + 0.5 * spread
      const from = this.slopFrom, to = this.slopTo
      this.slopS = from.s + to.ahead * fall
      this.add('slop', SLOP, pose, from.x + (to.x - from.x) * fall, from.y + (to.y - from.y) * fall * fall, this.slopS, SLOP_IN_FRONT, null, 0)
    }

    // The shelf and what is on it; the load that was taken is wherever the lap has it. The gate stands while a
    // load can be taken and is flown when none can: only the flight between the two takes time.
    this.shelf.clear()
    const rate = seconds / GATE_SECONDS
    this.gateUp = gateFlown(offset(PLACES.shelf, lap.s)) ? Math.min(1, this.gateUp + rate) : Math.max(0, this.gateUp - rate)
    const flown = gateLift(this.gateUp)
    this.add('shelf', SHELF, this.shelf, 0, flown, PLACES.shelf - SHELF_BEFORE, DEPTH.shelf, null, 0)
    const beckons = hint.wants === 'load' ? hint.glow : 0
    let ladderTop: { x: number; y: number; s: number } | null = null
    for (const load of LOADS) {
      const taker = this.taker
      let kept: Kept = null
      if (lap.load === load && taker) {
        // In the hand-over the load is with whoever took it, for as long as they hold it.
        const home = CLEARING[taker.who]
        kept = taker.holding === null ? 'gone' : { x: home.x + taker.pose.x + taker.hand.x, y: taker.pose.y + taker.hand.y, s: home.s + taker.pose.s, left: taker.holding }
      }
      const where = this.loads[load].update(seconds, t, lap, foxPose, kept, beckons)
      if (!where.shown) continue
      const onShelf = lap.load !== load
      const item = this.add(`load-${load}`, where.figure, where.pose, where.x, where.y + (onShelf ? flown : 0), where.s, where.z, onShelf ? { kind: 'load', load } : null, onShelf || where.y > 1 ? 0 : 8)
      if (onShelf && beckons > 0.01) this.lights.push({ x: item.x + (item.bounds.minX + item.bounds.maxX) / 2, y: item.y + (item.bounds.minY + item.bounds.maxY) / 2, s: item.s, z: item.z - 0.6, wide: 22, tall: 26, flat: false, strength: beckons })
      if (load === 'ladder' && !onShelf) ladderTop = { x: where.x, y: where.y, s: where.s }
    }

    // The goose: on her nest, on the ladder, or by the gatepost where the ladder took her.
    const rides = lap.trail.gooseRides
    const gooseAt: GooseAt = !rides ? 'nest' : this.gooseDown ? 'clearing' : 'riding'
    this.nest.clear()
    this.nest.parts.egg.show = rides
    this.add('nest', NEST, this.nest, 0, 0, PLACES.goose, DEPTH.nest, null, 0)
    const cat = CLEARING.cat
    const gooseX = gooseAt === 'nest' ? 0 : gooseAt === 'clearing' ? cat.x + GOOSE_BY_POST.x : lap.x
    const gooseS = gooseAt === 'nest' ? PLACES.goose : gooseAt === 'clearing' ? cat.s : lap.s
    // Riding, she sits on the ladder when it is over the fox's head, and on the fox's head when it is not.
    const overhead = ladderTop !== null && ladderTop.y > CLEAR.ball
    const gooseY = gooseAt === 'riding' ? (overhead ? ladderTop!.y + 4 : foxPose.y + (lap.roll > 0 ? CLEAR.ball : CLEAR.fox) * foxPose.sy + 1) : 0
    const goosePose = this.goose.update(seconds, t, this.see(lap, gooseX, gooseS), lap.trail.gooseLooks, gooseAt)
    this.add('goose', this.goose.figure, goosePose, gooseX, gooseY, gooseS, gooseAt === 'riding' ? CARRIED_IN_FRONT + 4 : gooseAt === 'clearing' ? 5 + DEPTH.goose : DEPTH.goose, gooseAt === 'riding' ? null : { kind: 'who', who: 'goose' }, gooseAt === 'riding' ? 0 : 12)

    // The five who wait, and what three of them keep beside them.
    for (const who of Object.keys(this.waiters) as Receiver[]) {
      const waiter = this.waiters[who], home = CLEARING[who]
      const pose = waiter.update(seconds, t, this.see(lap, home.x, home.s))
      if (waiter.fixture) this.add(`${who}-fixture`, waiter.fixture.figure, waiter.fixture.pose, home.x, 0, home.s, DEPTH.waiter, { kind: 'who', who }, 10)
      this.add(who, waiter.figure, pose, home.x, 0, home.s, DEPTH.waiter, { kind: 'who', who }, waiter.fixture ? 0 : 12)
    }

    for (const name of Object.keys(this.obstacles) as Fixed[]) {
      const one = this.obstacles[name]
      this.add(name, one.figure, one.update(seconds, t, lap, this.see(lap, 0, OBSTACLE_AT[name])), 0, 0, OBSTACLE_AT[name], DEPTH.obstacle, null, 0)
    }
    for (const name of NEIGHBOUR_NAMES) {
      const one = this.neighbours[name], home = NEIGHBOURS[name]
      this.add(name, one.figure, one.update(seconds, t, lap, this.see(lap, home.x, home.s)), home.x, 0, home.s, DEPTH.neighbour, null, 8)
    }
    this.items.length = this.count

    // What an idle child is shown.
    const ghost = this.ghost
    ghost.opacity = 0
    if (hint.wants !== 'load' && hint.glow > 0.01) this.lights.push({ x: lap.x, y: 0, s: lap.s, z: 0, wide: 54, tall: 54, flat: true, strength: hint.glow * (0.7 + 0.3 * Math.sin(t * 3.4)) })
    if (hint.hand && hint.hand.opacity > 0.01) {
      ghost.opacity = hint.hand.opacity
      ghost.press = hint.hand.press
      if (hint.wants === 'load') {
        // The fingertip comes down on the load itself.
        const load = this.items.find((item) => item.key === `load-${hint.load}`)
        if (load) {
          ghost.x = load.x + (load.bounds.minX + load.bounds.maxX) / 2
          ghost.y = load.y + load.bounds.minY + (load.bounds.maxY - load.bounds.minY) * 0.45
          ghost.s = load.s
          ghost.z = load.z + 6 + (1 - hint.hand.press) * 5
        } else ghost.opacity = 0
      } else {
        // Beside the fox and a little in front of it, coming down towards the board. It keeps close to the fox
        // and high: out on the trail the camera looks down steeply, and anything further towards the child is
        // off the bottom of the frame.
        ghost.x = fox.x + foxPose.x + HAND_BESIDE + hint.slide
        ghost.y = HAND_HIGH - hint.hand.press * 5 + hint.flick * (hint.flick > 0 ? FLICK_UP : FLICK_DOWN)
        ghost.s = lap.s
        ghost.z = HAND_BEFORE - hint.hand.press * 1.5
      }
    }
  }

  /** Where a thing stands in the fox's own world, as the box a finger is read against: the fox at the origin, the trail running away towards minus z. */
  boxOf(item: Item, foxS: number, out: Box): Box {
    out.minX = item.x + item.bounds.minX
    out.maxX = item.x + item.bounds.maxX
    out.minY = item.y + item.bounds.minY
    out.maxY = item.y + item.bounds.maxY
    out.z = -shownAt(foxS, item.s, TOUCH_REACH) + item.z
    return out
  }

  /**
   * What is drawn under a finger: of the things a finger can land on, the one nearest the child that has a bead
   * at this place on the glass, or null when none has. A tap where the hedgehog is drawn is the hedgehog's,
   * though the frog's tub stands in front of part of it and the two overlap as boxes.
   */
  drawnAt(shot: Shot, width: number, height: number, x: number, y: number, foxS: number): Touch | null {
    let found: Touch | null = null, nearest = -Infinity
    const spot = this.spot
    for (let n = 0; n < this.count; n++) {
      const item = this.items[n]
      if (!item.touch) continue
      const along = -shownAt(foxS, item.s, TOUCH_REACH) + item.z
      for (let i = item.from; i < item.to; i++) {
        const quad = this.quads[i]
        if (quad.flat || along + quad.z <= nearest) continue
        if (!onPlane(shot, width, height, x, y, along + quad.z, spot)) continue
        const cross = quad.ax * quad.by - quad.ay * quad.bx
        if (Math.abs(cross) < 1e-9) continue
        const dx = spot.x - (item.x + quad.x), dy = spot.y - (STAND + item.y + quad.y)
        const u = (dx * quad.by - dy * quad.bx) / cross, v = (quad.ax * dy - quad.ay * dx) / cross
        if (beadAt(quad.tile, Math.floor((u + 0.5) * quad.tile.w), Math.floor((0.5 - v) * quad.tile.h)) === 0) continue
        nearest = along + quad.z
        found = item.touch
      }
    }
    return found
  }
  private readonly spot = { x: 0, y: 0 }

  /** What shows of each thing, and where: the same for a game that was put away and one that was loaded from its save. */
  signature(): string[] {
    return this.items.map((item) => {
      const shown = item.figure.parts.filter((part) => item.pose.parts[part.name].show).map((part) => part.name)
      return `${item.key}@${Math.round(item.x)},${Math.round(item.y)},${Math.round(item.s)}:${item.figure.name}:${shown.join('+')}${item.pose.flip ? ':flipped' : ''}`
    })
  }
}
