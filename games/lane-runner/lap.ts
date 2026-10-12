import { AT_MOST, MOST_LEFTOVERS, MOST_RUFFLES, TAKEN_WITH, noFoxMarks, noMarks, noTrailMarks, type FoxMarks, type LapState, type Load, type Marks, type TrailMarks } from './lapState'
import { CLEAR, LANE_WIDTH, LENGTH, OBSTACLES, PLACES, SHELF_REACH, STEP, ZONES, laneX, offset, wrap, zoneAt, type Lane, type Obstacle, type Spot } from './trail'

// One lap with no browser in it: the fox, what it carries, the six
// obstacles and what each does to each load. It is told what the finger does
// (down, up, a slide to one side, a flick up or down, a press on a load) and
// is stepped by seconds of play. Everything that makes a sound or sets a
// character off is an event raised on the very tick it happens, so sight and
// sound are one clock: nothing here hides a wait inside a sound. What comes
// a moment later (the second balloon to pop, the next chime of the thorns
// coming into flower) is an event of its own on the tick it happens.
//
// Time runs in fixed ticks, and nothing draws from chance: the same touches
// at the same moments give the same lap on every machine.
//
// The fox never moves unasked. It travels only while a finger is down; what
// carries it without one is a consequence of where the child ran it (a
// tumble, a pole vault, the owl flying it back), short and never chosen by
// the game.

/** Seconds in one tick. */
export const TICK = 1 / 120
/** Pegs a second. The fox is at this speed on the tick the finger lands and at none on the tick it lifts. It never rises. */
export const RUN_SPEED = 70
/** Pegs a second upward at take-off, and the pull back down in pegs a second squared. */
export const JUMP_SPEED = 105
export const GRAVITY = 290
/** Near the top of a jump the pull is weaker, which is what makes it hang. */
export const HANG_BELOW = 30
export const HANG_PULL = 0.7
/** Each balloon takes this share off the pull, so a fox with four floats. */
export const BALLOON_LIFT = 0.11
/** A flick down in the air sends the fox down at this speed, into a roll. */
export const DIVE_SPEED = 160
export const ROLL_SECONDS = 0.6
/** Pegs of travel between two footfalls on the trail, on the rungs of a ladder laid over the stream, and on one laid over the mud. */
export const STRIDE = 14
export const RUNG_STREAM = 6
export const RUNG_MUD = 10
/** How hard the fox is pulled to the middle of its lane and how soon it settles there. */
export const LANE_SPRING = 1500
export const LANE_DAMPING = 58
/** Seconds the fox teeters when it is sent past an outside lane. */
export const TEETER_SECONDS = 0.5
/** Seconds after stopping before the fox turns round to the child. */
export const REST_BEFORE_TURN = 0.9
/** How fast the fox wades through mud, and tiptoes over it under balloons, as a share of its run. */
export const WADE = 0.45
export const TIPTOE = 0.85
/** Half the room the goose takes along the trail, with half a fox added. */
export const GOOSE_REACH = 12
/** How far before her the goose sees a fox that passes on the side she looks to. */
export const GOOSE_SEES = 6
/** How high the fox must be to pass over her. */
export const GOOSE_HEIGHT = 9
/** How near a thrown load the fox must run, in its lane, to pick it up. */
export const PICK_UP = 6
/** How far before an obstacle it makes itself known: three steps. */
export const ANNOUNCE = 3 * STEP
/** How far the owl flies the fox back: three steps. */
export const FLIGHT_BACK = 3 * STEP
/** How high the tail hangs the fox over the thorns, and how high balloons hold its toes over the stream. */
export const HANG_HEIGHT = CLEAR.archTop
export const DANGLE = 3
/** The moments of a hang by the tail (0 to 1): when it is swung on, when it is over the thicket, and when it drops. */
export const HANG = { swings: 0.45, over: 0.75, drops: 0.78 }
/** Thorns that come into flower ring a run of chimes: this many, this far apart in seconds. The first is the slop landing. */
export const CHIMES = 4
export const CHIME_EVERY = 0.11
/** Mushrooms come up along a log that water was slopped on one at a time, each with a bloop: this many, this far apart in seconds. The first is the slop landing. */
export const BLOOPS = 3
export const BLOOP_EVERY = 0.18

export type Who = 'fox' | 'goose' | 'owl' | 'bear' | 'hedgehog' | 'frog' | 'cat'
/** Everyone but the fox: they stand and watch, and each answers a finger as itself. */
export type Watcher = Exclude<Who, 'fox'>
export type Receiver = Exclude<Watcher, 'goose'>

/** Who wants which load. */
export const WANTS: Record<Exclude<Load, 'none'>, Receiver> = { cake: 'bear', ladder: 'cat', balloons: 'hedgehog', owl: 'owl', bucket: 'frog' }

/** What carries the fox without a finger: each a consequence of one cell of the grid. */
export type ActKind = 'thrown' | 'splash' | 'bonk' | 'flop' | 'burrs' | 'tailhang' | 'trip' | 'snag' | 'climb' | 'vault' | 'catch' | 'blind' | 'flight' | 'trot'

/** How long each lasts, and the moments in it (0 to 1) that have a sound and a motion of their own. */
export const ACTS: Record<ActKind, { seconds: number; cues: readonly number[] }> = {
  thrown: { seconds: 0.7, cues: [] },
  splash: { seconds: 0.9, cues: [0.45, 0.6, 0.75] },
  bonk: { seconds: 0.9, cues: [0.75] },
  flop: { seconds: 0.8, cues: [] },
  burrs: { seconds: 0.7, cues: [0.2, 0.4] },
  tailhang: { seconds: 1, cues: [0.35, 0.7] },
  trip: { seconds: 0.8, cues: [0.6] },
  snag: { seconds: 1.1, cues: [0.25, 0.5, 0.8] },
  climb: { seconds: 1.2, cues: [0.1, 0.22, 0.34, 0.55] },
  vault: { seconds: 1.2, cues: [0.15, 0.92] },
  catch: { seconds: 1, cues: [0.2, 0.4, 0.7] },
  blind: { seconds: 1, cues: [0.3, 0.6] },
  flight: { seconds: 2, cues: [0.12, 0.28, 0.44, 0.6, 0.76, 0.96] },
  trot: { seconds: 0.45, cues: [0.33, 0.66] },
}

const ease = (t: number): number => t * t * (3 - 2 * t)
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))

/** How far along its way an act has carried the fox at `p` (0 to 1): 0 is where it began, 1 where it ends. It may go a little the other way first. */
export function actAlong(kind: ActKind, p: number): number {
  switch (kind) {
    case 'thrown':
      return 1 - (1 - clamp01(p * 2)) ** 2
    case 'splash':
      return ease(clamp01(p / 0.3))
    case 'bonk':
    case 'snag':
      return ease(clamp01((p - 0.8) / 0.2))
    case 'flop':
      return 1
    case 'burrs':
      // Held on the thorns where it met them, on the near side of the thicket, and then out backwards.
      return ease(clamp01((p - 0.2) / 0.5))
    case 'tailhang':
      // It hangs, is swung on over the thicket at the height it hangs at, and only then comes down.
      return ease(clamp01((p - HANG.swings) / (HANG.over - HANG.swings)))
    case 'catch':
      return ease(clamp01((p - 0.7) / 0.3))
    case 'climb':
      // Up the rungs where the ladder stands, over the top while it is higher than the thicket, and down the far side.
      return 0.5 * ease(clamp01((p - 0.15) / 0.36)) + 0.5 * ease(clamp01((p - 0.51) / 0.49))
    case 'vault':
      // Up on the pole before the log, and over it only while higher than it.
      return ease(clamp01((p - 0.125) / 0.6))
    case 'trip':
      return ease(clamp01(p / 0.6))
    case 'trot':
      return p
    default:
      return ease(p)
  }
}

/** How high above the board an act holds the fox at `p`. */
export function actRise(kind: ActKind, p: number): number {
  switch (kind) {
    case 'thrown':
      return Math.sin(Math.PI * clamp01(p * 2)) * 10
    case 'splash':
      return Math.sin(Math.PI * clamp01(p / 0.3)) * 6
    case 'bonk':
      return Math.sin(Math.PI * clamp01(p / 0.75)) * 6
    case 'snag':
      return p < 0.8 ? 5 : 5 * (1 - (p - 0.8) / 0.2)
    case 'burrs':
      return Math.sin(Math.PI * clamp01((p - 0.2) / 0.5)) * 9
    case 'tailhang':
      return p < HANG.drops ? HANG_HEIGHT : HANG_HEIGHT * (1 - ease((p - HANG.drops) / (1 - HANG.drops)))
    case 'trip':
      return Math.sin(Math.PI * clamp01(p / 0.6)) * 18
    case 'climb':
      return 26 * Math.sin(Math.PI * p ** 0.6)
    case 'vault':
      return 30 * Math.sin(Math.PI * p)
    case 'flight':
      return 30 * Math.sin(Math.PI * p)
    default:
      return 0
  }
}

export type Act = { kind: ActKind; t: number; from: number; to: number }

/** What the foot came down on. */
export type Surface = 'trail' | 'stone' | 'plank' | 'mud' | 'rung' | 'board' | 'plink' | 'tiptoe'

/** One cell of the grid happening: each name has a motion and a voice of its own. */
export type Gag =
  // Empty hands, and whatever a load does not change.
  | 'splash' | 'stones' | 'bonk' | 'leafhat' | 'wade' | 'flop' | 'mudball' | 'burrs' | 'tailhang' | 'burrball' | 'trip' | 'hollow' | 'shove'
  // The cake.
  | 'sail' | 'sway' | 'birdTier' | 'flat' | 'mudTier' | 'berries' | 'kebab' | 'snatch' | 'splat' | 'hum'
  // The ladder.
  | 'bridge' | 'snag' | 'drag' | 'duckboard' | 'climb' | 'ride' | 'vault'
  // The balloons.
  | 'dangle' | 'squeak' | 'sigh' | 'tiptoe' | 'pops' | 'bang' | 'creak'
  // The baby owl.
  | 'snore' | 'cling' | 'cradle' | 'prrrt' | 'thorn' | 'shriek' | 'turnover'
  // The bucket.
  | 'scoop' | 'clang' | 'puddle' | 'mudpie' | 'flowers' | 'floomp' | 'sulk' | 'mushrooms' | 'spill'

export type LapEvent =
  /** The finger landed and the fox is running. */
  | { type: 'start' }
  /** The fox stopped dead. */
  | { type: 'stop' }
  /** A foot came down. `foot` alternates; `n` counts the footfalls on this obstacle, for a run of knocks that rises; `load` is what the fox carries, since a sleeping owl snores in time with the feet; `rides` is whether the goose is on the ladder, where she honks in time with them. */
  | { type: 'step'; foot: 0 | 1; lane: Lane; surface: Surface; n: number; load: Load; rides: boolean }
  /** The fox was sent one lane over: `dir` is -1 for left, 1 for right. */
  | { type: 'lane'; dir: -1 | 1; lane: Lane }
  /** The fox was sent past an outside lane and teeters over the edge. */
  | { type: 'teeter'; dir: -1 | 1 }
  | { type: 'jump' }
  | { type: 'dive' }
  /** The fox came down. `hard` after a dive. */
  | { type: 'land'; hard: boolean }
  | { type: 'roll' }
  | { type: 'unroll' }
  /** The fox, at rest, turned round to the child. */
  | { type: 'turn' }
  /** The goose honked: at a fox passing on the side she looks to, or after one that jumped over her. */
  | { type: 'honk'; after: boolean }
  /** The fox leapt at the honk. */
  | { type: 'fright' }
  /** The goose ducked under a fox in the air. */
  | { type: 'duck' }
  /** The fox ran into the goose: she hisses and flaps and it is thrown back. */
  | { type: 'bump' }
  /** The fox came down on the goose and bounced off her. */
  | { type: 'squawk' }
  /** The fox got up after being carried. */
  | { type: 'up' }
  /** A finger landed on a character. */
  | { type: 'poke'; who: Watcher }
  /** A load was taken from the shelf; `back` is the one put back for it, or `none`. */
  | { type: 'take'; load: Load; back: Load }
  /** A cell of the grid happened at an obstacle. */
  | { type: 'gag'; gag: Gag; obstacle: Obstacle; lane: Lane }
  /** A moment inside what carries the fox. */
  | { type: 'cue'; act: ActKind; index: number }
  /** One more balloon went on a thorn: it is gone on this tick and its skin hangs there. */
  | { type: 'pop'; lane: Lane }
  /** The next chime of the thorns coming into flower: `index` is 1 for the second of the run. */
  | { type: 'chime'; index: number }
  /** The next mushroom coming up on the log: `index` is 1 for the second of the three. */
  | { type: 'bloop'; index: number }
  /** The water that was in the bucket came down over the fox. */
  | { type: 'douse' }
  /** An obstacle makes itself known to a fox three steps off. */
  | { type: 'near'; obstacle: Obstacle }
  /** A jump tossed the top of a loose load. */
  | { type: 'toss'; load: Load }
  /** The tossed tier came down on the cake again. */
  | { type: 'catch' }
  /** A tumble threw the load to the obstacle's worst spot. */
  | { type: 'throw'; obstacle: Obstacle; load: Load }
  /** The fox ran through the lane its load lay in and has it again. */
  | { type: 'pickup'; load: Load }
  /** The fox reached the hand-over spot: the lap is over. */
  | { type: 'arrive' }
  /** The press after the hand-over: the next lap. */
  | { type: 'begin' }

const UPRIGHT: readonly Obstacle[] = ['branch', 'brambles', 'log']

export class Lap {
  /** Pegs along the trail, 0 up to its length. */
  s: number
  lane: Lane
  /** Pegs to the right of the trail's middle, and how fast that changes. */
  x: number
  vx = 0
  /** Pegs above the board, and how fast that changes. */
  y = 0
  vy = 0
  /** A finger is down. */
  down = false
  air = false
  diving = false
  /** Seconds of roll left, 0 when not rolling. */
  roll = 0
  /** Seconds of teeter left and the side it leans to. */
  teeter = 0
  teeterDir: -1 | 1 = 1
  /** What is carrying the fox, or null. */
  act: Act | null = null
  /** Seconds the fox has stood still. */
  rest = REST_BEFORE_TURN
  faces: 'child' | 'trail' = 'child'
  /** Pegs run since the lap was made. */
  run = 0
  /** The legs: half a turn for every footfall, so the motion puts a foot down on the tick the sound says so. */
  phase = 0
  /** How fast the fox travels along the trail now, in pegs a second. */
  speed = 0
  /** How the fox is crossing what it is on, when a load changes that. */
  mode: 'bridge' | 'duckboard' | 'dangle' | 'tiptoe' | 'wade' | null = null
  /** A tier or a slop is in the air above the fox. */
  tossed = false
  /** The fox is ducked under the branch. */
  duck = false
  /** Balloons still to pop on the thorns the fox is held on. They are out of `left` already, so the save holds the outcome; until each pops it is still shown. */
  popping = 0

  load: Load
  /** The load is in the fox's hands. */
  carrying: boolean
  lies: Spot | 'branch' | null
  left: number
  marks: Marks
  fox: FoxMarks
  trail: TrailMarks
  finished: boolean

  /** Everything that happened since the list was last emptied, in order. The Mount plays it and empties it. */
  readonly events: LapEvent[] = []
  /** Something worth saving changed. */
  dirty = false
  /** The change is saved at once, not at the throttle. */
  urgent = false

  private remainder = 0
  private footfalls = 0
  private zoneSteps = 0
  private tookOffAt = 0
  private owesHonk = false
  private frightened = false
  private groundKey: string | null = null
  private landed = false
  private arriving = false
  /** Chimes of the run still to ring, and seconds to the next. */
  private chimes = 0
  private chimeIn = 0
  /** Mushrooms still to come up, and seconds to the next. */
  private bloops = 0
  private bloopIn = 0
  private readonly told = new Set<Obstacle>()

  constructor(state: LapState) {
    this.s = wrap(state.at)
    this.lane = state.lane
    this.x = laneX(state.lane)
    this.load = state.load
    this.carrying = state.held
    this.lies = state.lies
    this.left = state.left
    this.marks = { ...state.marks }
    this.fox = { ...state.fox }
    this.trail = { ...state.trail, leftovers: state.trail.leftovers.map((one) => ({ ...one })) }
    this.finished = state.finished
    this.found()
  }

  /** The fox as a save finds it: standing, turned to the child, with whatever lay within its reach in its hands. */
  private found(): void {
    const lies = this.lies
    if (!this.carrying && lies !== null && lies !== 'branch' && !this.finished && this.lane === lies.lane && Math.abs(offset(lies.at, this.s)) <= PICK_UP) {
      this.carrying = true
      this.lies = null
    }
    // A save that puts the fox where the goose sits is read as a fox standing a step before her.
    if (this.gooseHome() && this.lane === 1 && Math.abs(offset(PLACES.goose, this.s)) < GOOSE_REACH) this.s = PLACES.goose - GOOSE_REACH - 2
    // Found standing inside an obstacle, the fox is not run into it again.
    const name = zoneAt(this.s)
    this.groundKey = name ? `${name}:${this.lane}` : null
    // Under the branch, the thorns and the log there is no room to stand up: it is found there rolled up, as it went in.
    if (this.underSomething()) this.roll = TICK
    this.mode = this.modeNow()
  }

  /**
   * Put away: the lap settles into what a load of its save would find, at once and with no sound. A jump is
   * taken back to where it began, what was carrying the fox has carried it, and no finger is down.
   */
  settle(): void {
    if (this.act) {
      this.s = wrap(this.act.to)
      this.act = null
    } else if (this.arriving) {
      this.arriving = false
      this.finished = true
    } else if (this.air) this.s = this.tookOffAt
    this.s = Math.round(this.s) % LENGTH
    this.x = laneX(this.lane)
    this.vx = this.y = this.vy = this.speed = this.roll = this.teeter = 0
    this.air = this.diving = this.down = this.tossed = this.duck = this.owesHonk = this.frightened = this.landed = false
    this.popping = this.chimes = this.chimeIn = this.bloops = this.bloopIn = 0
    this.rest = REST_BEFORE_TURN
    this.faces = 'child'
    this.zoneSteps = 0
    this.told.clear()
    this.found()
  }

  /** The saved state as it now stands, on top of the template's fields. In the air or carried, the place is where the fox will stand. */
  snapshot(base: LapState): LapState {
    const at = Math.round(wrap(this.act ? this.act.to : this.air && !this.arriving ? this.tookOffAt : this.s)) % LENGTH
    // A load that lies where the fox will stand is in its hands: the save holds what a load of it finds.
    const lies = this.lies
    const reached = !this.carrying && lies !== null && lies !== 'branch' && !this.finished && this.lane === lies.lane && Math.abs(offset(lies.at, at)) <= PICK_UP
    return {
      ...base,
      // A fox coming down on the hand-over spot has finished: it is found there with the lap over.
      finished: this.finished || this.arriving,
      at,
      lane: this.lane,
      load: this.load,
      held: this.carrying || reached,
      lies: reached ? null : lies,
      left: this.left,
      marks: { ...this.marks },
      fox: { ...this.fox },
      trail: { ...this.trail, leftovers: this.trail.leftovers.map((one) => ({ ...one })) },
    }
  }

  /** What the fox has in its hands, as the rules see it: nothing while its load lies somewhere. */
  get inHand(): Load {
    return this.carrying ? this.load : 'none'
  }

  /** Whether a load on the shelf can be taken now. */
  get canTake(): boolean {
    return !this.finished && this.act === null && offset(PLACES.shelf, this.s) >= 0 && offset(PLACES.shelf, this.s) < SHELF_REACH && (this.carrying || this.lies === null)
  }

  /** The fox is doing something of its own: in the air, carried, rolling or with a finger on it. */
  get busy(): boolean {
    return this.down || this.air || this.act !== null
  }

  /** The finger landed, or lifted. */
  hold(on: boolean): void {
    if (this.finished) {
      this.down = false
      return
    }
    if (on === this.down) return
    this.down = on
    if (on) {
      // A touch lets the fox down where the owl's flight ends, at once and in silence.
      if (this.act?.kind === 'flight') this.endAct(true)
      this.faces = 'trail'
      this.rest = 0
      if (!this.act) this.events.push({ type: 'start' })
      return
    }
    // In the air the jump finishes first, and the stop comes with the landing.
    if (!this.air && !this.act) this.halt()
  }

  /** The finger slid one lane's worth to a side. */
  shift(dir: -1 | 1): void {
    if (this.act || this.finished) return
    const next = this.lane + dir
    if (next < 0 || next > 2) {
      this.teeter = TEETER_SECONDS
      this.teeterDir = dir
      this.events.push({ type: 'teeter', dir })
      return
    }
    // Beside something that stands upright there is no stepping into it: it shoves the fox back.
    const name = zoneAt(this.s)
    if (name && !this.air && this.stands(name) && ZONES[name].blocked[next] && !this.passes(name, next as Lane)) {
      this.teeter = TEETER_SECONDS
      this.teeterDir = dir
      this.events.push(name === 'goose' ? { type: 'gag', gag: 'shove', obstacle: 'goose', lane: this.lane } : { type: 'teeter', dir })
      return
    }
    this.lane = next as Lane
    this.teeter = 0
    this.events.push({ type: 'lane', dir, lane: this.lane })
    this.dirty = true
  }

  /** The finger flicked up. */
  jump(): void {
    if (this.act || this.air || this.finished || this.inTunnel()) return
    if (this.roll > 0) this.roll = 0
    this.takeOff(JUMP_SPEED)
    this.events.push({ type: 'jump' })
    // A jump from anywhere tosses the top of a loose load.
    if (this.left > 0 && (this.inHand === 'cake' || this.inHand === 'bucket')) {
      this.tossed = true
      this.events.push({ type: 'toss', load: this.load })
    }
  }

  /** The finger flicked down: a roll on the ground, a dive in the air. */
  tuck(): void {
    if (this.act || this.finished) return
    if (this.air) {
      const name = zoneAt(this.s)
      if (this.diving || this.frightened || (name !== null && UPRIGHT.includes(name))) return
      this.diving = true
      this.vy = -DIVE_SPEED
      this.events.push({ type: 'dive' })
      return
    }
    if (this.roll > 0) return
    this.roll = ROLL_SECONDS
    this.events.push({ type: 'roll' })
  }

  poke(who: Watcher): void {
    this.events.push({ type: 'poke', who })
  }

  /** A press on a load on the shelf: it is in the fox's hands, and the one it had is back on the shelf. */
  take(load: Exclude<Load, 'none'>): void {
    if (!this.canTake || (this.carrying && this.load === load)) return
    const back = this.load
    this.load = load
    this.carrying = true
    this.lies = null
    this.left = TAKEN_WITH[load]
    this.marks = noMarks()
    this.events.push({ type: 'take', load, back })
    this.save(true)
  }

  /** The press after the hand-over: the whole new lap, at once, and then the one step to the shelf. */
  begin(): void {
    if (!this.finished || this.act) return
    this.finished = false
    this.load = 'none'
    this.carrying = false
    this.lies = null
    this.left = 0
    this.marks = noMarks()
    this.fox = noFoxMarks()
    this.trail = noTrailMarks()
    this.told.clear()
    this.groundKey = null
    this.s = PLACES.handOver
    this.faces = 'trail'
    this.rest = 0
    this.act = { kind: 'trot', t: 0, from: PLACES.handOver, to: LENGTH }
    this.events.push({ type: 'begin' })
    this.save(true)
  }

  /** Plays `seconds` of the lap, in whole ticks; what is left over waits for the next call. */
  step(seconds: number): void {
    this.remainder += seconds
    while (this.remainder >= TICK) {
      this.remainder -= TICK
      this.tick()
    }
  }

  // --- One tick ------------------------------------------------------------

  private tick(): void {
    if (this.chimes > 0) {
      this.chimeIn -= TICK
      if (this.chimeIn <= 0) {
        this.chimes -= 1
        this.chimeIn += CHIME_EVERY
        this.events.push({ type: 'chime', index: CHIMES - 1 - this.chimes })
      }
    }
    if (this.bloops > 0) {
      this.bloopIn -= TICK
      if (this.bloopIn <= 0) {
        this.bloops -= 1
        this.bloopIn += BLOOP_EVERY
        this.events.push({ type: 'bloop', index: BLOOPS - 1 - this.bloops })
      }
    }
    if (this.act) {
      this.acting()
      this.pickUp()
      return
    }
    if (this.finished) return
    // Sideways: a stiff spring to the middle of the lane, so the change is over in a tenth of a second.
    const pull = (laneX(this.lane) - this.x) * LANE_SPRING - this.vx * LANE_DAMPING
    this.vx += pull * TICK
    this.x += this.vx * TICK
    if (this.teeter > 0) this.teeter = Math.max(0, this.teeter - TICK)

    // A finger that is down is the fox travelling, on the ground or in the air; with none, a jump keeps the speed it left the ground with.
    if (this.arriving) this.speed = 0
    else if (this.down) this.speed = RUN_SPEED * (this.air || this.roll > 0 ? 1 : this.mode === 'wade' ? WADE : this.mode === 'tiptoe' ? TIPTOE : 1)
    else if (!this.air) this.speed = 0
    const before = this.s
    if (this.speed > 0) {
      const travel = this.speed * TICK
      this.s = wrap(this.s + travel)
      this.dirty = true
      if (!this.air) {
        this.run += travel
        if (this.roll <= 0) this.stride(travel)
      }
    }

    this.landed = false
    if (this.air) this.flying()
    else if (this.roll > 0 && this.speed > 0) {
      this.roll -= TICK
      if (this.roll <= 0) {
        // Under the branch, the thorns and the log there is no room to stand up: the roll goes on until it is out.
        if (this.underSomething()) this.roll = TICK
        else {
          this.roll = 0
          this.events.push({ type: 'unroll' })
        }
      }
    }

    this.pickUp()
    this.announce(before)
    if (!this.act) this.goose(before)
    if (!this.act) this.obstacles(before)
    if (!this.act) this.handOver(before)
    this.mode = this.modeNow()

    if (!this.down && !this.air && !this.act && !this.finished && this.roll <= 0) {
      const rested = this.rest
      this.rest += TICK
      if (rested < REST_BEFORE_TURN && this.rest >= REST_BEFORE_TURN && this.faces === 'trail') {
        this.faces = 'child'
        this.events.push({ type: 'turn' })
      }
    }
  }

  /** The legs. A foot comes down each time the phase passes half a turn, sooner on the rungs of a laid ladder. */
  private stride(travel: number): void {
    const length = this.mode === 'bridge' ? RUNG_STREAM : this.mode === 'duckboard' ? RUNG_MUD : STRIDE
    const was = Math.floor(this.phase / Math.PI)
    this.phase += (travel / length) * Math.PI
    if (Math.floor(this.phase / Math.PI) === was) return
    this.footfalls += 1
    this.zoneSteps += 1
    this.events.push({ type: 'step', foot: this.footfalls % 2 === 0 ? 0 : 1, lane: this.lane, surface: this.surface(), n: this.zoneSteps, load: this.inHand, rides: this.trail.gooseRides })
  }

  private surface(): Surface {
    const name = zoneAt(this.s)
    if (this.mode === 'bridge') return 'rung'
    if (this.mode === 'duckboard') return 'board'
    if (this.mode === 'dangle') return 'plink'
    if (this.mode === 'tiptoe') return 'tiptoe'
    if (this.mode === 'wade') return 'mud'
    if (name === 'stream' && this.lane === 0) return 'stone'
    if (name === 'mud' && this.lane === 1) return 'plank'
    return 'trail'
  }

  /** How a load changes the crossing of the stretch the fox is on. */
  private modeNow(): Lap['mode'] {
    const name = zoneAt(this.s)
    if (this.air || !name || !ZONES[name].blocked[this.lane]) return null
    if (name === 'stream') return this.inHand === 'ladder' ? 'bridge' : this.inHand === 'balloons' && this.left > 0 ? 'dangle' : null
    if (name === 'mud') return this.inHand === 'ladder' ? 'duckboard' : this.inHand === 'balloons' && this.left > 0 ? 'tiptoe' : this.roll > 0 ? null : 'wade'
    return null
  }

  private takeOff(speed: number): void {
    this.air = true
    this.diving = false
    this.frightened = false
    this.y = 0
    this.vy = speed
    this.tookOffAt = this.s
    this.mode = null
  }

  private flying(): void {
    const balloons = this.inHand === 'balloons' ? this.left : 0
    const pulled = (this.diving || Math.abs(this.vy) >= HANG_BELOW ? GRAVITY : GRAVITY * HANG_PULL) * (this.diving ? 1 : 1 - BALLOON_LIFT * balloons)
    this.vy -= pulled * TICK
    // Over the mud, balloons hold the fox up for all four steps.
    if (balloons > 0 && zoneAt(this.s) === 'mud' && ZONES.mud.blocked[this.lane] && this.y < 8 && this.vy < 0) this.vy = 0
    this.y += this.vy * TICK
    // Coming down on the goose, the fox never gets lower than she sits: she throws it up again from her back.
    if (this.vy < 0 && this.y < GOOSE_HEIGHT && this.overGoose() && offset(PLACES.goose, this.s) >= 0) this.y = 0
    if (this.y <= 0) this.landing()
  }

  private landing(): void {
    // Coming down on the goose is no landing: she throws the fox up again.
    if (this.overGoose()) {
      this.y = GOOSE_HEIGHT
      this.vy = JUMP_SPEED * 0.75
      this.diving = false
      this.owesHonk = false
      this.events.push({ type: 'squawk' })
      return
    }
    this.y = 0
    this.vy = 0
    this.air = false
    this.landed = true
    this.frightened = false
    this.events.push({ type: 'land', hard: this.diving })
    if (this.tossed) {
      // Nothing was under the jump: the tier comes down on the cake again, and the slop on the trail.
      this.tossed = false
      if (this.load === 'cake') this.events.push({ type: 'catch' })
      else {
        this.left -= 1
        this.events.push({ type: 'gag', gag: 'spill', obstacle: zoneAt(this.s) ?? 'stream', lane: this.lane })
      }
    }
    if (this.owesHonk) {
      this.owesHonk = false
      this.events.push({ type: 'honk', after: true })
      if (this.inHand === 'owl') this.wake('shriek', 'goose')
    }
    if (this.diving) {
      this.diving = false
      if (!this.act) {
        this.roll = ROLL_SECONDS
        this.events.push({ type: 'roll' })
      }
    }
    this.save(false)
    if (!this.down && !this.act) this.halt()
  }

  /** Whether the fox is over the goose on her nest. */
  private overGoose(): boolean {
    return this.gooseHome() && this.lane === 1 && Math.abs(offset(PLACES.goose, this.s)) < GOOSE_REACH
  }

  private halt(): void {
    this.speed = 0
    this.rest = 0
    // In a tunnel the fox stops as the ball it is.
    if (this.roll > 0 && !this.inTunnel()) {
      this.roll = 0
      this.events.push({ type: 'unroll' })
    }
    this.events.push({ type: 'stop' })
    this.save(true)
  }

  private save(urgent: boolean): void {
    this.dirty = true
    if (urgent) this.urgent = true
  }

  // --- What carries the fox --------------------------------------------------

  private begins(kind: ActKind, to: number): void {
    this.act = { kind, t: 0, from: this.s, to }
    this.air = false
    this.diving = false
    this.frightened = false
    this.owesHonk = false
    this.vy = 0
    this.speed = 0
    this.roll = 0
    this.vx = 0
    this.x = laneX(this.lane)
    this.teeter = 0
    this.mode = null
    this.save(true)
  }

  private acting(): void {
    const act = this.act!
    const seconds = ACTS[act.kind].seconds
    const was = act.t / seconds
    act.t = Math.min(seconds, act.t + TICK)
    const p = act.t / seconds
    ACTS[act.kind].cues.forEach((at, index) => {
      if (!(was < at && p >= at)) return
      // Held on the thorns with balloons, each moment is the next balloon going: one pop for each that pops.
      if (act.kind === 'burrs' && this.popping > 0) {
        this.popping -= 1
        this.events.push({ type: 'pop', lane: this.lane })
      } else this.events.push({ type: 'cue', act: act.kind, index })
    })
    // The way is measured the short way round, so the step from the hand-over spot to the shelf crosses the ring's seam.
    const way = act.to - act.from
    this.s = wrap(act.from + way * actAlong(act.kind, p))
    // A fox caught in the air comes to the act's own height within its first tenth.
    this.y = Math.max(actRise(act.kind, p), this.y * (1 - clamp01(p * 10)))
    if (p < 1 && act.kind !== 'trot') this.y = Math.max(this.y, 0)
    this.duck = (act.kind === 'catch' || act.kind === 'blind') && Math.abs(offset(ZONES.branch.mid, this.s)) < ZONES.branch.mid - ZONES.branch.from + 2 && actAlong(act.kind, p) > 0
    if (p >= 1) this.endAct(false)
  }

  /** The act is over: the fox stands where it was carried to. `silent` when a touch ends the owl's flight. */
  private endAct(silent: boolean): void {
    const act = this.act!
    this.act = null
    this.s = wrap(act.to)
    this.y = 0
    this.duck = false
    this.popping = 0
    this.rest = 0
    // Standing in an obstacle after being carried into it, the fox is not run into it again.
    const name = zoneAt(this.s)
    this.groundKey = name ? `${name}:${this.lane}` : null
    this.mode = this.modeNow()
    if (act.kind === 'trot') {
      this.faces = 'child'
      this.rest = REST_BEFORE_TURN
      this.down = false
      this.save(false)
      return
    }
    if (!silent) this.events.push({ type: 'up' })
    if (this.down) {
      this.speed = RUN_SPEED
      if (!silent) this.events.push({ type: 'start' })
    } else if (!silent) this.events.push({ type: 'stop' })
    this.save(true)
  }

  // --- The load --------------------------------------------------------------

  private pickUp(): void {
    const lies = this.lies
    if (this.carrying || lies === null || lies === 'branch' || this.finished) return
    if (this.lane !== lies.lane || Math.abs(offset(lies.at, this.s)) > PICK_UP) return
    this.carrying = true
    this.lies = null
    this.events.push({ type: 'pickup', load: this.load })
    this.save(true)
  }

  /** A tumble throws the whole load ahead to the obstacle's worst spot, and what the obstacle is shows on it. */
  private throwLoad(name: Obstacle): void {
    if (!this.carrying) return
    this.carrying = false
    this.tossed = false
    const worst = ZONES[name].worst
    this.lies = name === 'branch' && this.load === 'owl' ? 'branch' : name === 'goose' ? { at: worst.at, lane: this.seenLane() } : { ...worst }
    if (name === 'stream') this.marks.wet = true
    if (name === 'mud') this.marks.muddy = true
    if (name === 'brambles') this.marks.berries = true
    this.events.push({ type: 'throw', obstacle: name, load: this.load })
  }

  private gag(gag: Gag, obstacle: Obstacle): void {
    this.events.push({ type: 'gag', gag, obstacle, lane: this.lane })
    this.save(true)
  }

  private leave(obstacle: Obstacle): void {
    if (this.trail.leftovers.length < MOST_LEFTOVERS) this.trail.leftovers.push({ obstacle, lane: this.lane })
  }

  /** The owl wakes and flies the fox back three steps, never before the obstacle behind. */
  private wake(gag: Gag, name: Obstacle): void {
    let floor = 0
    for (const other of OBSTACLES) if (ZONES[other].to <= ZONES[name].from) floor = ZONES[other].to + 6
    this.marks.ruffles = Math.min(MOST_RUFFLES, this.marks.ruffles + 1)
    this.gag(gag, name)
    this.begins('flight', Math.max(floor, this.s - FLIGHT_BACK))
  }

  // --- The obstacles ---------------------------------------------------------

  /** Whether an obstacle stands upright in its lanes, so that there is no walking into it from the side or coming down into it. */
  private stands(name: Obstacle): boolean {
    return name === 'goose' ? this.gooseHome() : UPRIGHT.includes(name)
  }

  /** Whether the fox as it is now passes through an upright obstacle's lane: rolled up under the branch and the thorns and through the hollow end, and any way through thorns in flower. */
  private passes(name: Obstacle, lane: Lane): boolean {
    if (name === 'brambles' && this.trail.flowers) return true
    if (this.roll <= 0) return false
    return name === 'branch' || name === 'brambles' || (name === 'log' && lane === 0)
  }

  /** Whether the fox is on the ground somewhere it cannot stand up: under the branch, under the thorns, in the log. */
  private underSomething(): boolean {
    const name = zoneAt(this.s)
    if (!name || this.air || !UPRIGHT.includes(name) || !ZONES[name].blocked[this.lane]) return false
    return !(name === 'brambles' && this.trail.flowers)
  }

  /** Whether the fox is rolled up somewhere it cannot stand. */
  private inTunnel(): boolean {
    return this.roll > 0 && this.underSomething()
  }

  private announce(before: number): void {
    for (const name of OBSTACLES) {
      if (name === 'goose' && !this.gooseHome()) continue
      const edge = ZONES[name].from - ANNOUNCE
      if (offset(edge, before) < 0 && offset(edge, this.s) >= 0 && !this.told.has(name)) {
        this.told.add(name)
        this.events.push({ type: 'near', obstacle: name })
      }
    }
    // Once past it, it can make itself known again: the owl may fly the fox back.
    for (const name of this.told) if (offset(ZONES[name].to, this.s) > 0 || offset(ZONES[name].from - ANNOUNCE, this.s) < -STEP) this.told.delete(name)
  }

  private obstacles(before: number): void {
    const name = zoneAt(this.s)
    if (!name || name === 'goose') {
      if (!this.air) {
        this.groundKey = null
        this.zoneSteps = 0
      }
      return
    }
    const zone = ZONES[name]
    if (this.air) {
      const upright = UPRIGHT.includes(name)
      if (upright && zone.blocked[this.lane] && offset(zone.from, before) < 0 && offset(zone.from, this.s) >= 0 && !this.passes(name, this.lane)) {
        const hand = this.inHand
        // A ladder or balloons meet the branch whether the fox runs or jumps. Otherwise, coming down into something that stands, or too low over the log, is running into it.
        const caught = name === 'branch' && (hand === 'ladder' || (hand === 'balloons' && this.left > 0))
        if (caught || this.landsBefore(zone.to + 2) || (name === 'log' && this.heightAt(zone.mid) < CLEAR.logTop + 1)) {
          this.groundKey = `${name}:${this.lane}`
          this.enter(name, 'run')
          return
        }
      }
      // The thorns reach for a fox in the air as soon as it is over their near edge, while all of it is still on
      // the near side of them; everything else is met over its middle.
      const overAt = name === 'brambles' ? zone.from : zone.mid
      if (offset(overAt, before) < 0 && offset(overAt, this.s) >= 0) this.over(name)
      return
    }
    const key = `${name}:${this.lane}`
    // A jump begun in the mud and landed in it again is a belly flop like any other.
    const again = this.landed && name === 'mud' && zone.blocked[this.lane]
    if (key === this.groundKey && !again) return
    this.groundKey = key
    if (zone.blocked[this.lane] && !(name === 'brambles' && this.trail.flowers)) this.enter(name, this.roll > 0 ? 'roll' : this.landed ? 'land' : 'run')
    else this.through(name)
  }

  private pull(): number {
    return GRAVITY * (1 - BALLOON_LIFT * (this.inHand === 'balloons' ? this.left : 0))
  }

  /** Whether a fox in the air comes down before `place`, by its own fall. */
  private landsBefore(place: number): boolean {
    const g = this.pull()
    const t = (this.vy + Math.sqrt(Math.max(0, this.vy * this.vy + 2 * g * this.y))) / g
    return offset(place, this.s + this.speed * t) < 0
  }

  /** How high a fox in the air will be when it reaches `place`, by its own fall. */
  private heightAt(place: number): number {
    if (this.speed <= 0) return 0
    const t = Math.max(0, offset(this.s, place)) / this.speed
    return this.y + this.vy * t - 0.5 * this.pull() * t * t
  }

  /** The way through that needs no jump, and thorns in flower. */
  private through(name: Obstacle): void {
    const hand = this.inHand
    if (name === 'stream') this.gag(hand === 'cake' && this.left > 0 ? 'sway' : hand === 'owl' ? 'snore' : 'stones', name)
    else if (name === 'brambles' && ZONES.brambles.blocked[this.lane]) this.gag('floomp', name)
  }

  /** On the ground into a lane the obstacle fills: running, rolling, or coming down in it. */
  private enter(name: Obstacle, move: 'run' | 'roll' | 'land'): void {
    const zone = ZONES[name], hand = this.inHand, some = this.left > 0
    switch (name) {
      case 'stream': {
        if (hand === 'ladder') return this.gag('bridge', name)
        if (hand === 'balloons' && some) return this.gag('dangle', name)
        this.fox.wet = true
        if (hand === 'owl') {
          this.marks.wet = true
          return this.wake('prrrt', name)
        }
        if (hand === 'bucket') {
          this.left = AT_MOST.bucket
          this.gag('scoop', name)
        } else {
          this.gag('splash', name)
          this.throwLoad(name)
        }
        return this.begins('splash', Math.max(this.s, Math.min(zone.mid, this.s + 14)))
      }
      case 'branch': {
        if (move === 'roll') {
          if (hand === 'cake' && some) this.gag('flat', name)
          else if (hand === 'ladder') this.gag('drag', name)
          return
        }
        if (hand === 'ladder') {
          this.gag('snag', name)
          return this.begins('snag', this.s - 6)
        }
        if (hand === 'balloons' && some) {
          this.gag('squeak', name)
          return this.begins('catch', zone.to + 4)
        }
        if (hand === 'bucket') {
          // The bucket comes down over the fox's head, and what was in it over the fox.
          this.left = 0
          this.gag('clang', name)
          if (some) {
            this.fox.wet = true
            this.events.push({ type: 'douse' })
          }
          return this.begins('blind', zone.to + STEP)
        }
        this.gag('bonk', name)
        this.throwLoad(name)
        return this.begins('bonk', this.s - 6)
      }
      case 'mud': {
        if (move === 'land') {
          this.fox.muddy = true
          this.gag(this.trail.puddle ? 'mudpie' : 'flop', name)
          this.throwLoad(name)
          return this.begins('flop', this.s)
        }
        if (hand === 'ladder') {
          this.marks.muddy = true
          return this.gag('duckboard', name)
        }
        if (hand === 'balloons' && some) return this.gag('tiptoe', name)
        this.fox.muddy = true
        return this.gag(move === 'roll' ? 'mudball' : hand === 'owl' ? 'cradle' : 'wade', name)
      }
      case 'brambles': {
        if (hand === 'owl') return this.wake('thorn', name)
        if (move === 'roll') {
          this.fox.burrs = true
          if (hand === 'cake' && some) {
            this.marks.berries = true
            return this.gag('berries', name)
          }
          return this.gag('burrball', name)
        }
        if (hand === 'ladder') {
          this.gag('climb', name)
          return this.begins('climb', zone.to + 10)
        }
        this.fox.burrs = true
        if (hand === 'balloons' && some) {
          // One goes at each of three thorns: the first now, the others as the fox hangs there. All of them are
          // out of the count and their skins are left at once, so a game put away in between is found as it ends.
          const pops = Math.min(3, this.left)
          this.left -= pops
          for (let i = 0; i < pops; i++) this.leave(name)
          this.gag('pops', name)
          this.begins('burrs', this.s - 30)
          this.popping = pops - 1
          return
        } else {
          this.gag('burrs', name)
          this.throwLoad(name)
        }
        return this.begins('burrs', this.s - 30)
      }
      case 'log': {
        if (move === 'roll' && this.lane === 0) return this.gag(hand === 'cake' && some ? 'hum' : hand === 'ladder' ? 'drag' : 'hollow', name)
        if (hand === 'ladder') {
          this.gag('vault', name)
          return this.begins('vault', zone.to + 2 * STEP)
        }
        this.gag('trip', name)
        this.throwLoad(name)
        return this.begins('trip', zone.to + 14)
      }
      default:
        return
    }
  }

  /** In the air over the middle of an obstacle. */
  private over(name: Obstacle): void {
    const zone = ZONES[name], hand = this.inHand
    const filled = zone.blocked[this.lane]
    if (name === 'branch' && filled) {
      if (!this.carrying && this.lies === 'branch') {
        // The fox jumps under the owl again and has it back.
        this.carrying = true
        this.lies = null
        this.events.push({ type: 'pickup', load: this.load })
        this.save(true)
      } else if (hand === 'owl') {
        this.carrying = false
        this.lies = 'branch'
        this.gag('cling', name)
      }
      this.fox.leaves = true
      this.gag('leafhat', name)
    }
    if (name === 'brambles' && filled) {
      // A slop that comes down here flowers the thorns first, and thorns in flower catch no one.
      this.land(name)
      if (!this.trail.flowers) {
        if (hand === 'owl') return this.wake('thorn', name)
        if (!(hand === 'balloons' && this.left === AT_MOST.balloons)) {
          this.gag('tailhang', name)
          return this.begins('tailhang', zone.to + 6)
        }
      }
    }
    if (name === 'log') {
      if (hand === 'owl') this.gag('turnover', name)
      else if (hand === 'balloons' && this.left > 0) this.gag('creak', name)
    }
    if (name === 'mud' && filled && hand === 'balloons' && this.left > 0) this.gag('sigh', name)
    this.land(name)
  }

  /** What was tossed comes down on the obstacle under the jump. */
  private land(name: Obstacle): void {
    if (!this.tossed || (name !== 'goose' && !ZONES[name].catches[this.lane])) return
    this.tossed = false
    if (this.load === 'cake') {
      if (name === 'mud') {
        // It sinks, comes up brown and is carried on as cake.
        this.marks.muddy = true
        return this.gag('mudTier', name)
      }
      this.left -= 1
      if (name === 'stream') return this.gag('sail', name)
      if (name === 'goose') return this.gag('snatch', name)
      this.leave(name)
      return this.gag(name === 'branch' ? 'birdTier' : name === 'brambles' ? 'kebab' : 'splat', name)
    }
    this.left -= 1
    if (name === 'mud') {
      this.trail.puddle = true
      return this.gag('puddle', name)
    }
    if (name === 'brambles') {
      this.trail.flowers = true
      this.chimes = CHIMES - 1
      this.chimeIn = CHIME_EVERY
      return this.gag('flowers', name)
    }
    if (name === 'goose') {
      this.trail.gooseLooks = this.trail.gooseLooks === 'left' ? 'right' : 'left'
      return this.gag('sulk', name)
    }
    if (name === 'log') {
      this.trail.mushrooms = true
      this.bloops = BLOOPS - 1
      this.bloopIn = BLOOP_EVERY
      return this.gag('mushrooms', name)
    }
    this.gag('spill', name)
  }

  // --- The goose -------------------------------------------------------------

  /** The goose is on her nest, and not riding the ladder. */
  private gooseHome(): boolean {
    return !this.trail.gooseRides
  }

  /** The lane on the side she looks to. */
  private seenLane(): Lane {
    return this.trail.gooseLooks === 'left' ? 0 : 2
  }

  private goose(before: number): void {
    if (!this.gooseHome()) return
    const was = offset(PLACES.goose, before), now = offset(PLACES.goose, this.s)
    const beside = Math.abs(now) < GOOSE_REACH
    const hand = this.inHand
    if (this.lane === 1) {
      // On the ground beside her, or too low in the air on the way in: she is in the way.
      if (beside && this.y < GOOSE_HEIGHT && (!this.air || now < 0)) {
        this.events.push({ type: 'bump' })
        this.throwLoad('goose')
        this.begins('thrown', PLACES.goose - GOOSE_REACH - 2 * STEP)
        return
      }
      if (this.air && was < 0 && now >= 0) {
        this.owesHonk = true
        this.events.push({ type: 'duck' })
        this.land('goose')
      }
      return
    }
    if (this.lane !== this.seenLane() || !(was < -GOOSE_SEES && now >= -GOOSE_SEES)) return
    if (this.air) {
      // A fox in the air on her side is seen too, and what it tossed comes down on her.
      this.events.push({ type: 'honk', after: false })
      this.land('goose')
      if (hand === 'owl') this.wake('shriek', 'goose')
      return
    }
    // Whatever rolls by under her eye she does not see.
    if (this.roll > 0) return
    if (hand === 'ladder') {
      this.trail.gooseRides = true
      return this.gag('ride', 'goose')
    }
    if (hand === 'balloons' && this.left > 0) {
      this.left -= 1
      this.gag('bang', 'goose')
    } else {
      this.events.push({ type: 'honk', after: false })
      if (hand === 'cake' && this.left > 0) {
        this.left -= 1
        this.gag('snatch', 'goose')
      }
      if (hand === 'owl') return this.wake('shriek', 'goose')
    }
    this.takeOff(JUMP_SPEED * 0.55)
    this.frightened = true
    this.events.push({ type: 'fright' })
  }

  // --- The end of the lap ------------------------------------------------------

  private handOver(before: number): void {
    if (!this.arriving) {
      if (!(offset(PLACES.handOver, before) < 0 && offset(PLACES.handOver, this.s) >= 0)) return
      // The fox skids to a stop on the spot, and a fox in the air comes straight down on it.
      this.arriving = true
      this.s = PLACES.handOver
      this.speed = 0
      this.roll = 0
    }
    if (this.air) return
    this.arriving = false
    this.finished = true
    this.down = false
    this.tossed = false
    this.rest = 0
    this.events.push({ type: 'arrive' })
    this.save(true)
  }
}

/** Half a lane: how far from a lane's middle the fox still counts as in it. */
export const IN_LANE = LANE_WIDTH / 2
