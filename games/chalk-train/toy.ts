import { Company, FEET_DROP } from './company'
import { CYCLE_WIRED } from './config'
import { Bits, GREY } from './effects'
import { Journey, WAGON_HALF, WAGON_UP, Wagons, type Fired, type Pose } from './gait'
import type { Scene, Thing } from './grid'
import { landsOn } from './grid'
import { EngineLife } from './life'
import { MAX_MARK_POINTS, readMark, tidy, type MarkKind, STEP, SLEEPERS_BEHIND, sleepersOn } from './marks'
import { makeMark, showFirst, type Told, type Aboard } from './play'
import { laps, cut } from './ride'
import { between, makeRng, type Rng } from './rng'
import type { Asked } from './sound'
import { CUES, isVoice, type VoiceKey } from './voices'
import type { RiderKind } from './tastes'
import { NONE, inFlower, moveTrain, wearsTuft, type World } from './world'
import { CHALK_AREA, DANDELION, PUDDLE, TAR, WRIST_STRIP, distance, inPuddle, onTar, type Pt, clearance, type PlaceId } from './yard'

// The toy as it runs: the finger makes chalk, the model answers, and the
// engine rides. No renderer and no DOM: the Mount feeds it touches and game
// time, and the view draws what it holds. The saved thing is `world`, which
// is always at rest.

/** The engine stays where it is while the finger is this near its body: it is being tickled, lassoed or dusted. */
export const HOLD = 150
/** And while the finger is this near a rider sitting in a wagon. */
const RIDER_HOLD = 100
/** An empty wagon's hop under a finger lasts this long, in seconds. */
const HOP = 0.32
/** How long each coupling is: the engine to the first wagon, and that wagon to the second. */
export const COUPLINGS = [168, 154] as const
/** A coupling never closes up to less than this when the wagons bunch. */
const CLOSEST = 118
/** The engine's body is this far above its spot on the rail, along its own up. */
const BODY_UP = 65
/** At rest the engine tilts no more than this, in radians. */
const REST_TILT = 0.2
/** On a bend the engine leans into the turn: this many seconds' worth of its turning, and no more than this angle. */
const LEAN = 0.05
const LEAN_MOST = 0.14
/** The top of the funnel, in the engine's own frame. */
const FUNNEL = { x: 37, y: -134 }
/** The first showing waits this long, in seconds of attended play, for a child who may touch first. */
export const FIRST_SHOWING_AFTER = 1.2

/** What the sound and the acting of a ride are keyed on: the grid cell of the mark being ridden. */
type Cue = { thing: Thing; kind: MarkKind; sound: VoiceKey | null; rider: RiderKind | null; ring: Pt[] | null; leapt?: boolean }

/** The cue of a plain way across the tar. */
const ACROSS: Cue = { thing: 'tar', kind: 'tap', sound: null, rider: null, ring: null }
/** The cue of the ride along the line of the first showing. */
const SHOWN: Cue = { thing: 'tar', kind: 'line', sound: null, rider: null, ring: null }
/** The cue of the two more times round a ring, ridden as a route when other lines wait behind it. */
const LAPS: Cue = { thing: 'tar', kind: 'tap', sound: null, rider: null, ring: null }
/** What the train is told on its way: who climbs aboard, who finds the wagons full, who greets it, who gets home, and what a rider makes of the ride. */
type Tell = Extract<Told, { what: 'boarded' | 'full' | 'greeted' | 'home' | 'reaction' }>
const TELLS: readonly Told['what'][] = ['boarded', 'full', 'greeted', 'home', 'reaction']
const tellsOf = (told: readonly Told[]): Tell[] => told.filter((t): t is Tell => TELLS.includes(t.what))

/** The dandelion: how far its stalk is bent, how much of its seed head has grown, and how far its flower has opened. */
export type Weed = { bend: number; swing: number; seeds: number; bloom: number; tuft: boolean }

export class Toy {
  world: World
  readonly journey: Journey
  readonly wagons: Wagons
  readonly life: EngineLife
  readonly bits: Bits
  /** Sounds asked for since the Mount last played them. */
  asked: Asked[] = []
  /** Counts up when the chalk on the tar changes, and when the engine or the water changes colour. */
  marksVersion = 0
  looksVersion = 0
  /** The world has changed since it was last handed to storage, and whether it must be handed over at once. */
  unsaved = false
  saveNow = false
  /** Whether the riders and the designed order are in play. */
  readonly cycle: boolean
  /** The riders as they are seen, and the scenes. */
  readonly company: Company
  /** The world as it will be if the finger lifts now, while a line is being drawn. */
  ahead: World | null = null
  /** Game time, in seconds of attended play. */
  clock = 0
  /** The line under the finger, tidied, in the chalk it will be. */
  live: { p: Pt[]; colour: number } | null = null
  weed: Weed
  /** How far the wagons are squeezed up to the engine, and how hard they chatter. */
  bunch = 0
  chatter = 0
  /** Each wagon's small hop when a finger lands on it empty: 1 just touched, 0 at rest. */
  hops = [0, 0]
  /** The engine is riding round the puddle, and it wears a beard of seeds. */
  reflect = false
  beard = false
  /** The stripes and the tint the engine is seen in. They follow the world's, as the ride reaches the water. */
  stripes: number
  tint: number
  private bunchSpeed = 0
  /** How far the engine has eased from the slope of the line to how it sits at rest: 0 riding, 1 settled. */
  private settled = 1
  /** The finger while it is down: where it has been, and where the engine's body and the wagons stood when it landed. */
  private pen: { raw: Pt[]; seen: Pt; moved: number; wagons: Pt[]; aboard: Aboard[] } | null = null
  private liveKey = ''
  /** The finger has moved since the line under it was last played out. */
  private stale = false
  private liveCue: Cue | null = null
  private cues: Cue[] = []
  private scrapeIn = 0
  private sleepersAt = 0
  private printsLeft = 0
  private printedAt = 0
  private trailedAt = 0
  /** The fastest the engine has gone since it last arrived. */
  private lastSpeed = 0
  /** Which side of the engine the nearest chalk lies on, where it will rest: -1 left, 1 right, 0 none. */
  private chalkSide = 0
  /** The first showing has begun and the engine has not yet reached the end of its line. */
  private firstRide = false
  /** The ring being ridden, or ridden round again, goes round the water. */
  private ringOnWater = false
  /** How far it had travelled when it last pushed a wave through the water. */
  private wavedAt = 0
  /** The engine has leapt onto the line still under the finger. */
  private liveLeapt = false
  /** The line on bare tar being ridden has had its whistle. */
  private rideWhistled = false
  /** When a ride last ended at a rider's home, on the toy's clock. */
  private homedAt = -1
  /** The ride now ending brought a rider home. */
  private homing = false
  /** When it last whistled as it set off or ran away, on the toy's clock. */
  private whistledAt = -10
  /** It was running downhill a frame ago. */
  private fell = false
  /** How far it leans into a bend now, and how it stood a frame ago. */
  private lean = 0
  private lastAngle = 0
  private lastFacing: 1 | -1 = 1
  private flip = 1
  /** Whether a ring of chalk goes round the dandelion. */
  private flower: boolean
  private rng: Rng

  constructor(world: World, seed: number, cycle: boolean = CYCLE_WIRED) {
    this.world = world
    this.cycle = cycle
    this.rng = makeRng(seed)
    this.journey = new Journey(world.train, world.train.face)
    this.wagons = new Wagons(this.journey.pose, COUPLINGS)
    this.life = new EngineLife(makeRng(seed + 1))
    this.bits = new Bits(makeRng(seed + 2))
    this.stripes = world.train.stripes
    this.tint = world.train.tint
    this.flower = inFlower(world.marks)
    this.weed = { bend: 0, swing: 0, seeds: 1, bloom: this.flower ? 1 : 0, tuft: wearsTuft(world.marks) }
    this.chalkSide = this.sideOfChalk()
    this.company = new Company(this, makeRng(seed + 3))
  }

  /**
   * The engine as it is seen. Riding, it stands as the line slopes and leans
   * into a bend. At rest it
   * settles to no more than a gentle tilt, however steep the end of the line,
   * so that a train at rest always reads as a train.
   */
  get engine(): Pose {
    const pose = this.journey.pose
    if (this.settled <= 0) return this.lean === 0 ? pose : { ...pose, angle: pose.angle + this.lean }
    const level = Math.max(-REST_TILT, Math.min(REST_TILT, pose.angle))
    return { ...pose, angle: pose.angle + this.lean + (level - pose.angle) * this.settled }
  }

  /** The middle of the engine's body, where the child sees it. */
  get body(): Pt {
    const { x, y, angle } = this.engine
    return { x: x + Math.sin(angle) * BODY_UP, y: y - Math.cos(angle) * BODY_UP }
  }

  /** A point of the engine's figure, given in its own frame, on the tar. */
  onEngine(local: Pt): Pt {
    const { x, y, angle, facing } = this.engine
    const lx = local.x * facing
    return { x: x + Math.cos(angle) * lx - Math.sin(angle) * local.y, y: y + Math.sin(angle) * lx + Math.cos(angle) * local.y }
  }

  /** Where a point on the tar lies in the engine's own frame, scaled so that a point far off is 1 away. */
  private watching(at: Pt): Pt {
    const body = this.body, { angle, facing } = this.engine
    const dx = at.x - body.x, dy = at.y - body.y, far = Math.max(1, Math.hypot(dx, dy) / 180)
    return { x: (facing * (Math.cos(angle) * dx + Math.sin(angle) * dy)) / 180 / far, y: (-Math.sin(angle) * dx + Math.cos(angle) * dy) / 180 / far }
  }

  /**
   * The one thing a child would want next: a bare spot to put chalk on, on
   * the way to where the train is wanted (the home of whoever is aboard, the
   * stop of whoever waits), or just ahead of the engine when nobody is about.
   */
  get want(): Pt {
    const pose = this.engine, to = this.company.wantedAt()
    if (to) {
      const far = distance(pose, to)
      if (far > 120) {
        const reach = Math.min(240, Math.max(110, far - 150))
        const at = { x: pose.x + ((to.x - pose.x) / far) * reach, y: pose.y + ((to.y - pose.y) / far) * reach }
        return { x: Math.max(CHALK_AREA.x0 + 20, Math.min(CHALK_AREA.x1 - 20, at.x)), y: Math.max(CHALK_AREA.y0 + 20, Math.min(TAR.h - WRIST_STRIP - 20, at.y)) }
      }
    }
    for (const ahead of [250, -250, 180, -180]) {
      const at = { x: pose.x + pose.facing * ahead, y: Math.max(CHALK_AREA.y0 + 30, Math.min(pose.y - 20, TAR.h - WRIST_STRIP - 40)) }
      if (at.x > 90 && at.x < TAR.w - 90 && !inPuddle(at, 40) && distance(at, DANDELION) > 110) return at
    }
    return { x: TAR.w / 2, y: TAR.h / 2 - 60 }
  }

  /**
   * Where a line to that spot would start, when the train is wanted somewhere:
   * at the engine. The ghost hand then shows a line drawn from here to the
   * spot. With nobody about there is no such line, and the hand shows a tap.
   */
  get wantFrom(): Pt | null {
    const pose = this.engine, to = this.company.wantedAt()
    return to && distance(pose, to) > 120 ? { x: pose.x, y: pose.y } : null
  }

  ask(key: VoiceKey, pitch = 1, level = 1): void {
    this.asked.push({ key, pitch, level })
  }

  private scene(seen: Pt): Scene {
    // The riders that stand on the tar, by the middle of each: its feet are below that.
    const riders = [...this.company.cast.riders.values()].filter((life) => life.seat.in !== 'wagon').map((life) => ({ x: life.x, y: life.y - FEET_DROP }))
    return { engine: seen, riders: [...riders, ...this.aboardSeen().map((a) => a.at)], marks: this.world.marks }
  }

  /** The riders seen somewhere the world no longer has them, each by the middle of it as it is seen. */
  private aboardSeen(): Aboard[] {
    const out: Aboard[] = []
    for (const life of this.company.cast.riders.values()) {
      // In its wagon, or still seen on its feet at its stop while the world has it aboard already.
      const ahead = life.seat.in !== 'wagon' && !life.moving && this.world.riders.some((r) => r.kind === life.kind && r.at === 'train')
      if (life.settledIn >= 0 || ahead) out.push({ kind: life.kind, at: { x: life.x, y: life.y - FEET_DROP } })
    }
    return out
  }

  /** The finger lands. The answer starts here, before anything is known about the mark it will make. */
  press(point: Pt): void {
    if (this.pen) this.lift()
    // A touch ends whatever scene is playing, and is then an ordinary touch. In the first showing the engine is
    // in the scene too: it is at once at the end of the shown line, where the scene would have left it.
    this.company.finish()
    if (this.firstRide) {
      this.firstRide = false
      for (const fired of this.journey.skip()) this.react(fired)
    }
    // The first showing is for a child who has not yet tried: once the child has, it is not played.
    if (this.cycle && !this.world.shown) {
      this.world = { ...this.world, shown: true }
      this.unsaved = true
    }
    const at = onTar(point), seen = this.body
    this.pen = { raw: [at], seen, moved: 0, wagons: this.wagonSpots(), aboard: this.aboardSeen() }
    const under = landsOn([at], readMark([at]), this.scene(seen)).thing
    const colour = this.world.chalk
    if (under === 'puddle') {
      this.bits.lay('ripple', at, 6, 0.7)
      this.ask('land-water')
    } else if (under === 'dandelion') {
      this.weed.swing += 3
      this.ask('land-weed')
    } else if (under === 'engine' || under === 'rider') {
      this.ask('land-engine', under === 'rider' ? 1.3 : 1)
    } else {
      this.bits.burst('dust', at, 10, 70, colour, 2, 0.6)
      // An empty wagon and a stop's lamp are no things of the grid: chalk on one lies on the tar under it, and each
      // answers the finger that lands on it with a small move and sound of its own.
      const wagon = this.emptyWagonAt(at)
      if (wagon >= 0) {
        this.hops[wagon] = 1
        this.ask('land-wagon', wagon === 0 ? 1 : 0.9)
      } else if (!this.company.lampAnswers(at)) this.ask(under === 'line' ? 'land-line' : 'land-tar')
    }
    this.life.happen('land', this.watching(at))
    this.ask('toot', between(this.rng, 0.94, 1.08), 0.7)
    this.sleepersAt = 0
    this.refresh()
  }

  /** The finger moves: chalk comes out under it. */
  move(point: Pt): void {
    const pen = this.pen
    if (!pen) return
    const at = onTar(point), last = pen.raw[pen.raw.length - 1], gone = distance(at, last)
    if (gone < 2) return
    pen.raw.push(at)
    pen.moved += gone
    const p = tidy(pen.raw)
    if (p.length >= MAX_MARK_POINTS) {
      // A finger that keeps going starts another mark where this one ended, in the same chalk: one stroke is one
      // colour, however long.
      const colour = this.world.chalk
      this.lift(true)
      if (this.world.chalk !== colour) { this.world = { ...this.world, chalk: colour }; this.unsaved = true }
      // Its sleepers are counted, and ticked, from its own start.
      this.sleepersAt = 0
      this.pen = { raw: [at], seen: this.body, moved: 0, wagons: this.wagonSpots(), aboard: this.aboardSeen() }
      return this.refresh()
    }
    // The chalk shows at once. What the line would do is played out once a frame, however many times the finger
    // moves in it: that is the heaviest work the game does.
    this.live = { p, colour: this.world.chalk }
    this.stale = true
  }

  /**
   * Makes the line under the finger again, and plays out in full what it
   * would do if the finger lifted now: the world it would leave, the ride it
   * would give, and what the train would be told on the way.
   */
  private refresh(): void {
    const pen = this.pen
    this.stale = false
    if (!pen) return
    this.live = { p: tidy(pen.raw), colour: this.world.chalk }
    const dry = makeMark(this.world, pen.raw, this.cycle, pen.seen, pen.wagons, pen.aboard, false)
    let cue: Cue | null = null, route: Extract<Told, { what: 'route' }> | null = null
    for (const told of dry.told) {
      if (told.what === 'answer') cue = { thing: told.thing, kind: told.kind, sound: isVoice(told.sound) ? told.sound : null, rider: told.rider, ring: null }
      if (told.what === 'route') route = told
    }
    const key = !route ? '' : cue?.kind === 'tap' && cue.thing === 'line' ? 'called' : 'along'
    // A ride begun on one plan cannot go on as another: the engine starts again from where it has got to.
    if (this.journey.intoLive > 0 && key !== this.liveKey) {
      this.rebase()
      this.liveKey = key
      return this.refresh()
    }
    this.liveKey = key
    this.liveCue = cue
    this.ahead = dry.world
    if (!route) return this.journey.setLive(null)
    // A line to ride ends a roundabout, which would otherwise carry the engine away from it.
    if (this.company.carrying) this.company.finish()
    this.journey.setLive(cut(route.route, route.ridden), tellsOf(dry.told))
  }

  /**
   * What landed turns out to be no finger: a palm that rests while a finger
   * draws. Nothing is laid for it, and an engine that has set off for it
   * stands where it has got to.
   */
  drop(): void {
    if (!this.pen) return
    this.pen = null
    this.live = null
    this.ahead = null
    this.stale = false
    if (this.journey.intoLive > 0) this.rebase()
    this.journey.setLive(null)
    this.liveKey = ''
    this.liveCue = null
    this.liveLeapt = false
  }

  /** The engine has ridden part of a line that is no longer the plan: it stands where it has got to. */
  private rebase(): void {
    const pose = this.journey.pose
    // It does not come to stand in a rider or a home: where it has got to is in one, it rolls on along the line it
    // was riding to the first spot clear of them all, and stands there.
    const figures: PlaceId[] = this.world.riders.flatMap((r) => [r.home, ...(r.at === 'stop' || r.at === 'next' ? [r.stop] : [])])
    const to = clearance(figures, pose) < 0 ? this.journey.spotAhead((spot) => clearance(figures, spot) >= 0) : -1
    if (to >= 0) {
      const end = this.journey.rollOn(to)
      this.world = moveTrain(this.world, end, pose.facing)
      this.cues.push(ACROSS)
    } else {
      this.world = moveTrain(this.world, pose, pose.facing)
      this.journey.rebase()
    }
    this.unsaved = true
  }

  /** The finger lifts, or is taken away: the mark is made, and the world answers. */
  lift(goesOn = false): void {
    const pen = this.pen
    if (!pen) return
    this.pen = null
    this.live = null
    this.ahead = null
    this.stale = false
    // A line drawn toward the train is ridden from its near end. An engine that is already on the line rides on
    // the way it was drawn. One that has set off for where the finger landed and is still crossing the tar starts
    // again from where it has got to, and rides from whichever end is nearer it then. Told from the two ends of
    // the stroke alone, so that the mark is read once.
    const first = onTar(pen.raw[0]), last = onTar(pen.raw[pen.raw.length - 1])
    // A stroke that goes on into another mark is ridden on the way it comes.
    const onLine = goesOn || this.journey.intoLive > distance(this.world.train, first) + 1
    if (!onLine && this.journey.intoLive > 0 && distance(this.world.train, last) + 40 < distance(this.world.train, first)) this.rebase()
    const before = this.world
    const made = makeMark(before, pen.raw, this.cycle, pen.seen, pen.wagons, pen.aboard, !onLine)
    let cue: Cue | null = null, route: Extract<Told, { what: 'route' }> | null = null
    for (const told of made.told) {
      if (told.what === 'answer') cue = { thing: told.thing, kind: told.kind, sound: isVoice(told.sound) ? told.sound : null, rider: told.rider, ring: null }
      if (told.what === 'route') route = told
      // A rider home and a cycle judged are handed to storage at once: a put-away in the next moment must find them.
      if (told.what === 'home' || told.what === 'cycle') this.saveNow = true
    }
    this.world = made.world
    if (route) {
      if (this.company.carrying) this.company.finish()
      const ridden = cut(route.route, route.ridden)
      // A line whose ends meet, ridden all the way round, is a roundabout.
      const last = ridden.legs[ridden.legs.length - 1]
      if (cue && last && ridden.happenings.some((h) => h.what === 'roundabout')) cue.ring = last.pts
      const added = this.journey.add(ridden, tellsOf(made.told))
      if (added.planned) this.cues.push(cue ?? ACROSS)
      // Routes the engine leaves out take their cues with them; the way across in their place has none of its own.
      if (added.dropped > 0) this.cues.splice(1, added.dropped, ACROSS)
    } else {
      // No ride: an engine that had already set off along the line stands where it got to.
      if (this.journey.intoLive > 0) this.rebase()
      this.journey.setLive(null)
      for (const told of tellsOf(made.told)) this.company.hear(told)
    }
    this.liveKey = ''
    this.liveCue = null
    if (cue) cue.leapt = this.liveLeapt
    this.liveLeapt = false
    if (cue) this.made(cue, pen.raw)
    for (const told of made.told) if (told.what === 'home-answered' && isVoice(told.sound)) this.company.homeAnswers(told.home, told.sound)
    if (made.world.marks !== before.marks) this.marksVersion++
    if (made.world.train.stripes !== before.train.stripes && made.world.train.stripes !== NONE) this.looksVersion++
    if (made.world.water !== before.water) this.looksVersion++
    // Read from the marks here, when they change, and not in every frame.
    this.weed.tuft = wearsTuft(this.world.marks)
    this.flower = inFlower(this.world.marks)
    this.chalkSide = this.sideOfChalk()
    this.unsaved = true
  }

  /**
   * The side of the nearest chalk that the engine is not standing on, from
   * where it rests. Read when the marks change, not in every frame.
   */
  private sideOfChalk(): number {
    const { x, y } = this.world.train
    let best = 600, side = 0
    for (const mark of this.world.marks) for (const p of mark.p) {
      const far = Math.hypot(p.x - x, p.y - y)
      if (far > 110 && far < best) { best = far; side = Math.sign(p.x - x) }
    }
    return side
  }

  /** What a mark does the moment it is made, apart from any ride. */
  private made(cue: Cue, raw: readonly Pt[]): void {
    const at = raw[0], colour = (this.world.chalk + 4) % 5
    if (cue.sound && CUES[cue.sound] === 'made') this.ask(cue.sound)
    const cell = `${cue.thing}/${cue.kind}`
    if (cue.thing === 'rider' && cue.rider && cue.kind !== 'line') this.company.chalked(cue.rider, cue.kind)
    if (cell === 'engine/tap') this.life.happen('poke')
    if (cell === 'engine/zigzag') {
      this.life.happen('tickle')
      this.stripes = this.world.train.stripes
      // It giggles in wheezy puffs of steam.
      for (let i = 0; i < 3; i++) this.bits.puff('smoke', this.onEngine(FUNNEL), between(this.rng, -50, 50), 5, 0.9)
    }
    if (cell === 'engine/loop') this.life.happen('lasso')
    if (cell === 'engine/scribble') {
      this.life.happen('dusting')
      this.bits.burst('dust', this.body, 40, 170, colour, 3, 1.1)
      // And coughs one grey puff.
      this.bits.puff('smoke', this.onEngine(FUNNEL), 0, 12, 1.6, GREY)
    }
    if (cell === 'puddle/tap') {
      this.bits.lay('ripple', at, 4, 0.9)
      this.bits.lay('ripple', at, 1, 1.3)
      this.bits.burst('drop', at, 1, 20, -1, 4, 0.7, 12)
    }
    if (cell === 'puddle/scribble') for (let i = 0; i < 4; i++) this.bits.lay('ripple', { x: PUDDLE.x + between(this.rng, -70, 70), y: PUDDLE.y + between(this.rng, -18, 18) }, 4 + i * 5, 1.2 + i * 0.2, colour)
    if (cell === 'dandelion/tap') {
      this.bits.burst('seed', { x: DANDELION.x + 4, y: DANDELION.y - 56 }, 22, 60, -1, 2.4, 2.4, 0.4)
      this.weed.seeds = 0
      this.weed.swing += 2
    }
  }

  /** What riding past something does, by the grid cell of the mark being ridden. */
  private react(fired: Fired): void {
    const cue = fired.live ? this.liveCue : (this.cues[0] ?? null)
    const cell = cue ? `${cue.thing}/${cue.kind}` : ''
    const { pose, what } = fired
    if (what === 'told') {
      if ((fired.told as Told).what === 'home') this.homing = true
      return this.company.hear(fired.told as Told)
    }
    const vary = between(this.rng, 0.92, 1.1)
    // The long whistle of a straight run is not sounded on top of the whistle a line on bare tar has just had.
    const justWhistled = cue?.sound === 'long-whistle' && this.clock - this.whistledAt < 1.5
    // The screech of a line begun on the engine comes with its leap, as it starts on that line (`step`).
    if (cue?.sound && cue.sound !== 'screech' && CUES[cue.sound] === (what === 'done' ? 'arrived' : what) && what !== 'arrived' && !justWhistled) {
      this.flip = -this.flip
      this.ask(cue.sound, cue.sound === 'tick-tock-twangs' ? (this.flip > 0 ? 1 : 0.75) : cue.sound === 'bell' || cue.sound === 'long-whistle' ? 1 : vary)
    }
    if (what === 'bump') {
      this.life.happen('bump')
      this.ask('bump', vary)
      // The engine grumbles at it, and the wagons rattle.
      this.ask('grumble', vary, 0.8)
      this.chatter = 0.3
      this.ask('rattle', vary, 0.8)
      this.bits.burst('dust', pose, 5, 50, 0, 2, 0.5)
    }
    if (what === 'corner') {
      this.life.happen('corner')
      this.ask('clack', vary)
      this.bunchSpeed += 520
    }
    if (what === 'loop') {
      this.life.happen('over')
      // A loop drawn slowly is a loop only once it closes, behind the engine: it goes right over there and then.
      if (fired.late) this.life.happen('flip')
      if (cell === 'line/loop') this.bunchSpeed -= 700
      // Round the water the whistle echoes, whether or not the two ends of the loop meet.
      if (cell === 'puddle/loop') this.ask('echo-whistle', vary)
    }
    if (what === 'scribble' && cell === 'line/scribble') {
      // A knot in a line: the train squeezes through, its wagons pressed up against it.
      this.bunchSpeed += 700
    } else if (what === 'scribble') {
      this.life.happen('tangle')
      this.bits.burst('dust', pose, 18, 110, 0, 2.6, 0.9)
      if (cell === 'dandelion/scribble') this.beard = true
    }
    if (what === 'splash') {
      this.life.happen('splash')
      this.bits.burst('drop', pose, cell === 'puddle/zigzag' ? 8 : 18, 240, this.world.water, 3, 0.8, 0.9)
      this.bits.lay('ripple', pose, 8, 0.9, this.world.water)
      this.printsLeft = 9
      // The water washes the stripes off and, where it has chalk in it, tints the engine: shown as it happens.
      const tint = this.world.water !== NONE ? this.world.water : this.tint
      if (this.stripes !== NONE || tint !== this.tint) this.looksVersion++
      this.stripes = NONE
      this.tint = tint
      // Water hisses whatever the mark was: a line begun on the engine, a tap across the puddle.
      if (!cue?.sound || CUES[cue.sound] !== 'splash') this.ask('hiss', vary)
    }
    if (what === 'twang') {
      this.weed.swing += pose.facing * 9
      this.life.happen('twang')
      // The stalk twangs whatever the mark was.
      if (!cue?.sound || CUES[cue.sound] !== 'twang') this.ask('twang', vary)
      // Through the tuft of stuck seeds it comes out with a beard of them, on any ride.
      if (this.weed.tuft) this.beard = true
    }
    if (what === 'clack') {
      this.life.happen('bump')
      if (cell === 'line/zigzag') this.chatter = 0.35
      else if (cell !== 'line/line') this.ask('clack', vary, 0.7)
    }
    if (what === 'fast') for (let i = 0; i < 3; i++) this.bits.puff('smoke', this.onEngine(FUNNEL), -pose.facing * (60 + i * 30), 8, 1.2)
    if (what === 'roundabout') {
      this.ringOnWater = cell === 'puddle/loop'
      // The scene carries the engine on round the ring, so it plays only when no other line is waiting to be ridden.
      // The ring's own route is over by now: it ends where the roundabout begins.
      // With other lines waiting it goes round twice more as a ride of its own, ahead of them: three times every time.
      if (cue?.ring && this.journey.queued === 0) this.company.roundabout(cue.ring, pose.facing)
      else if (cue?.ring) {
        this.journey.first(laps(cue.ring, 2))
        this.cues.splice(1, 0, LAPS)
      } else this.life.happen('giddy')
    }
    if (what === 'done') {
      if (cell === 'tar/tap' || cell === 'line/tap') this.life.happen('hoot')
      if (cell === 'tar/scribble') this.life.happen('sneeze')
      // Out of a knot it pops, like a cork: a hop, and the wagons spring apart.
      if (cell === 'line/scribble') {
        this.life.happen('bump')
        this.bunchSpeed -= 700
      }
      if (cell === 'line/scribble') this.ask('cork', vary)
      if (this.beard) {
        this.beard = false
        this.life.happen('hoot')
        // It blows the beard off with a toot, whichever mark brought it through.
        if (cue?.sound !== 'muffled-toot') this.ask('muffled-toot', vary)
        this.bits.burst('seed', this.onEngine({ x: 70, y: -50 }), 16, 90, -1, 2.4, 2, 0.3)
      }
      if (this.cues[0] === SHOWN) this.firstRide = false
      // The next line has its own whistle.
      this.rideWhistled = false
      // The ride that brought a rider home ends with a squeal and a squash, whether or not another line waits.
      if (this.homing) {
        this.homing = false
        this.homedAt = this.clock
        this.ask('brake')
        this.life.happen('brake')
      }
      if (this.cues[0] === LAPS) {
        this.life.happen('giddy')
        this.ask('kettle-whistle', 0.8, 0.6)
      }
      this.cues.shift()
    }
    // A roundabout carries the engine on from where its route ends: it has not arrived yet.
    if (what === 'arrived' && !this.company.carrying && this.homedAt !== this.clock) {
      // An open end: a fast ride ends with a squeal and a trundle just stops; it squashes, peers over the end and
      // puffs, while whoever is still aboard leans out toward home.
      if (this.lastSpeed > 260) this.ask('brake')
      this.life.happen('brake')
      this.life.happen('peer')
      this.company.reachOut()
      this.bits.puff('smoke', this.onEngine(FUNNEL), 0, 10, 1.5)
      this.ask('puff')
    }
    if (what === 'arrived') {
      this.lastSpeed = 0
      // At rest the engine looks as the world has it: a splash on a ride that was left out shows now.
      const { stripes, tint } = this.world.train
      if (stripes !== this.stripes || tint !== this.tint) this.looksVersion++
      this.stripes = stripes
      this.tint = tint
    }
  }

  /** Plays `dt` seconds of game time. */
  step(dt: number): void {
    const pen = this.pen, journey = this.journey
    this.clock += dt
    if (this.stale) this.refresh()
    this.showFirst()
    const at = pen ? pen.raw[pen.raw.length - 1] : null
    // It holds still while the finger is at its body or at a rider in a wagon: something is being chalked.
    const held = at !== null && pen !== null && journey.intoLive === 0 && (distance(at, this.body) <= HOLD || pen.aboard.some((a) => distance(at, a.at) <= RIDER_HOLD))
    this.lastSpeed = Math.max(journey.pose.speed, this.lastSpeed)
    // The train waits for a rider that is walking over to it, so that the rider is aboard for the whole ride.
    for (const fired of journey.step(this.company.boarding ? 0 : dt, !held && !this.company.boarding)) this.react(fired)
    const pose = journey.pose
    // On a bend it leans into the turn, a little further round than the rail has it, eased in and out.
    let turned = pose.angle - this.lastAngle
    while (turned > Math.PI) turned -= Math.PI * 2
    while (turned < -Math.PI) turned += Math.PI * 2
    const leanTo = dt > 0 && pose.speed > 1 && pose.facing === this.lastFacing ? Math.max(-LEAN_MOST, Math.min(LEAN_MOST, (turned / dt) * LEAN)) : 0
    this.lean += (leanTo - this.lean) * Math.min(1, dt * 8)
    if (Math.abs(this.lean) < 0.001 && leanTo === 0) this.lean = 0
    this.lastAngle = pose.angle
    this.lastFacing = pose.facing
    // Downhill it runs away with a rising whistle, once for each fall.
    const falling = pose.speed > 300 && Math.sin(pose.angle) * pose.facing > 0.3
    if (falling && !this.fell) {
      this.ask('rising-whistle')
      this.whistledAt = this.clock
      // It stands in for the whistle a line on bare tar would have had just now.
      this.rideWhistled = true
    }
    this.fell = falling
    // Up a slope it chuffs harder: oftener, louder, and with a bigger puff.
    const climbing = pose.speed > 1 && Math.sin(pose.angle) * pose.facing < -0.3
    // Settling takes a moment; setting off again is quicker.
    const resting = !journey.busy && pose.speed <= 1
    this.settled = Math.max(0, Math.min(1, this.settled + (resting ? dt / 0.35 : -dt / 0.15)))
    const riding = journey.frontLive ? this.liveCue : journey.busy ? this.cues[0] : null
    // Round the water its reflection rides with it: on the ring as it is ridden, and on the two more times round.
    this.reflect = (riding?.thing === 'puddle' && riding.kind === 'loop' && pose.speed > 1) || (this.ringOnWater && (this.company.carrying || riding === LAPS))
    // A line on bare tar is whistled along once the engine is riding it and it is seen to be a line, wherever
    // the finger began; the long whistle of a straight run is not sounded on top of that.
    if (riding?.thing === 'tar' && riding.kind === 'line' && riding !== SHOWN && pose.speed > 1 && !this.rideWhistled) {
      this.rideWhistled = true
      this.ask('long-whistle', 1.12, 0.7)
      this.whistledAt = this.clock
    }
    if (!journey.busy) this.rideWhistled = false
    // Pulled away: on a line begun on the engine it leaps with spinning wheels and a screech as it starts along
    // it, from rest or straight off the line before.
    if (riding?.thing === 'engine' && riding.kind === 'line' && pose.speed > 1 && !(journey.frontLive ? this.liveLeapt : riding.leapt)) {
      if (journey.frontLive) this.liveLeapt = true
      else riding.leapt = true
      this.life.happen('leap')
      this.bits.burst('dust', pose, 12, 120, 0, 2.4, 0.5, 0.2)
      this.ask('screech')
    }

    // It leans toward the chalk under the finger, or else toward the nearest chalk on the tar.
    this.life.leanTo = at ? Math.sign(this.watching(at).x) : this.chalkSide * pose.facing
    for (const does of this.life.step(dt, pose.speed, journey.travelled, pose.on === 'tar' || climbing, at ? this.watching(at) : null)) {
      const funnel = this.onEngine(FUNNEL), back = -pose.facing * Math.min(140, 20 + pose.speed * 0.25)
      if (does === 'breath') this.bits.puff('smoke', funnel, back, 7, 1.5)
      if (does === 'chuff') {
        this.bits.puff('smoke', funnel, back, climbing ? 12 : 9, 1.3)
        this.ask('chuff', 0.8 + pose.speed / 900, climbing ? 1 : 0.8)
      }
      if (does === 'smoke-ring') this.bits.puff('ring', funnel, back, 10, 1.8)
      if (does === 'burp') {
        this.bits.puff('smoke', funnel, back, 11, 1.2)
        this.ask('puff')
      }
      if (does === 'dust-off') this.bits.burst('dust', this.body, 34, 240, 0, 3, 1)
    }

    // Chalk coming out: a scrape whose pitch follows the finger, and sleepers ticking in a moment behind.
    this.scrapeIn -= dt
    if (pen && pen.moved > 12 && this.scrapeIn <= 0) {
      this.ask('scrape', Math.max(0.7, Math.min(1.7, 0.7 + pen.moved / 70)), 1)
      pen.moved = 0
      this.scrapeIn = 0.07
    }
    if (this.live && this.live.p.length > 1) {
      // One tick for each sleeper as it is seen to tick into place, and none for a stroke too short to have any.
      const laid = sleepersOn((this.live.p.length - 1) * STEP - SLEEPERS_BEHIND)
      if (laid > this.sleepersAt) {
        this.sleepersAt = laid
        this.ask('sleeper', between(this.rng, 0.9, 1.15), 0.6)
      }
    }

    // Through the water it pushes a bow wave: ripples and a few drops thrown ahead of it, for as long as it is in.
    if (pose.speed > 1 && journey.travelled - this.wavedAt > 34 && inPuddle(pose)) {
      this.wavedAt = journey.travelled
      this.bits.lay('ripple', { x: pose.x + pose.facing * 50, y: pose.y }, 12, 0.7, this.world.water)
      this.bits.burst('drop', { x: pose.x + pose.facing * 70, y: pose.y - 8 }, 3, 130, this.world.water, 3, 0.5, 0.7)
    }
    // What the wheels leave: a dusty trail on bare tar, wet prints after water. Both fade.
    if (pose.on === 'tar' && pose.speed > 1 && journey.travelled - this.trailedAt > 26) {
      this.trailedAt = journey.travelled
      this.bits.lay('trail', pose, 5, 2.2, 0)
    }
    if (this.printsLeft > 0 && journey.travelled - this.printedAt > 30) {
      this.printedAt = journey.travelled
      this.printsLeft--
      this.bits.lay('print', pose, 6, 2.6, this.world.train.tint)
    }

    // The wagons squeeze up and spring apart; the dandelion swings and grows back; its flower opens or shuts.
    this.bunchSpeed += (-190 * this.bunch - 16 * this.bunchSpeed) * dt
    this.bunch += this.bunchSpeed * dt
    // The wagons are pulled by the engine as it is seen, and at rest they draw up into a line behind it.
    this.wagons.follow(this.engine, COUPLINGS.map((length) => Math.max(CLOSEST, length - this.bunch)), resting ? dt * 2.2 : 0, resting ? this.company.standing() : [])
    this.chatter = Math.max(0, this.chatter - dt)
    for (let i = 0; i < this.hops.length; i++) this.hops[i] = Math.max(0, this.hops[i] - dt / HOP)
    const weed = this.weed
    weed.swing += (-70 * weed.bend - 5 * weed.swing) * dt
    weed.bend += weed.swing * dt
    weed.seeds = Math.min(1, weed.seeds + dt / 2.5)
    const open = this.flower ? 1 : 0
    weed.bloom += Math.sign(open - weed.bloom) * Math.min(Math.abs(open - weed.bloom), dt / 0.8)
    this.company.step(dt)
    this.bits.step(dt)
  }

  /**
   * The first showing, once, for a child who has not touched the tar yet: the
   * waiting rider scrapes a short line toward its home and climbs aboard, and
   * the engine rides to the end of it. Its outcome goes into the world, and
   * to storage at once, before any of it is seen.
   */
  private showFirst(): void {
    if (!this.cycle || this.world.shown || this.clock < FIRST_SHOWING_AFTER || this.pen || this.company.playing || this.journey.busy) return
    const before = this.world
    const waiting = before.riders.find((r) => r.at === 'stop')
    const shown = showFirst(before)
    this.world = shown.world
    this.unsaved = this.saveNow = true
    const mark = shown.world.marks[shown.world.marks.length - 1]
    const route = shown.told.find((t): t is Extract<Told, { what: 'route' }> => t.what === 'route')
    if (!waiting || !route || shown.world.marks.length === before.marks.length) return
    this.chalkSide = this.sideOfChalk()
    this.marksVersion++
    // What the train is told on that ride, but for the rider who showed the line: the scene has that rider aboard already.
    const tells = tellsOf(shown.told).filter((t) => t.rider !== waiting.kind)
    this.company.firstShowing(waiting.kind, mark, () => {
      if (this.journey.add(cut(route.route, route.ridden), tells).planned) this.cues.push(SHOWN)
    })
    this.firstRide = true
  }

  /** The empty wagon a finger lands on, by the box its picture takes up, or -1. */
  private emptyWagonAt(at: Pt): number {
    const taken = new Set([...this.company.cast.riders.values()].map((life) => life.settledIn))
    return this.wagons.poses.findIndex((pose, index) => {
      if (taken.has(index)) return false
      const x = pose.x + Math.sin(pose.angle) * WAGON_UP, y = pose.y - Math.cos(pose.angle) * WAGON_UP
      return Math.abs(at.x - x) <= WAGON_HALF.w && Math.abs(at.y - y) <= WAGON_HALF.h
    })
  }

  /** Where the wagons stand now, as the spots on their rails: nobody is laid out on them. */
  private wagonSpots(): Pt[] {
    const spots = this.wagons.poses.map((pose) => ({ x: pose.x, y: pose.y }))
    // And every place where a rider is seen on its feet: the world may have it aboard or home already.
    for (const life of this.company.cast.riders.values()) if (life.seat.in !== 'wagon') spots.push({ x: life.seat.at.x, y: life.seat.at.y - FEET_DROP })
    return spots
  }

  /** Where each wagon stands. */
  wagon(index: number): Pose {
    return this.wagons.poses[index]
  }

  /** Whether a finger is down. */
  get drawing(): boolean { return this.pen !== null }
}
