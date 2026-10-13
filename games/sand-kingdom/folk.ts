import { CRAB_HOME, CRAB_RING, CRAB_ROAM, EEL_HOLES, GULL_PERCHES, GULL_SIZES, LOG, STAR_HOME, type FolkSpots } from './layout'
import { type CrabPlan, EEL_BODY, EEL_PAST, type EelPlan, type GullPlan, type Plan, type StarPlan, eelUnder, wallPatches } from './plan'
import { type Rng, below } from './rng'
import { CLAW_DOWN, CRAB_TOP, GULL_HALF, type Pillar, STAR_REACH, SWING_ROOM, starGap, starPartFor, CRAB_AHEAD, CRAB_SHELL, RIDE_AT, apart, crabFloor, crabRounds, crabTilt, eyeLean, legReach, gullSpan, gullTall, highest, over, crabRoom, restOn, shellTop, starLies, starParts, starRounds, starSkin } from './solid'
import type { Patch } from './things'
import type { VoiceName } from './voices'
import type { Point } from './water'

// The sea folk: each at its place at the edge of the beach by day, and at
// what the beach holds for it at evening, moving like itself. Everything here
// is numbers: the view lays them on the meshes. No two of the folk share a
// move; each has its own tempo, its own funniest part and its own idle
// variants, picked without a repeat.
//
//   crab      sideways only, in quick runs and dead stops; its eyes on their
//             stalks move one at a time. By day it walks a ring with nothing
//             in it; at evening it patrols the bank of a ring of groove.
//   starfish  slowly, one arm at a time, then a sudden flop. By day it stands
//             on two arm tips on its rock; at evening it is on the highest
//             place there is.
//   eel       one long slide, then stock still with only the eyes moving. By
//             day it threads its rock; at evening it swims a groove.
//   gulls     hops and shuffles, heads turning together a beat apart. They
//             stand in a row: on their log, or on a wall.

/** Where the finger is working, or null when no finger is down. */
export type Finger = { x: number; z: number; digging: boolean } | null

/** A sound one of the folk makes, for the game to play. */
export type FolkSound = VoiceName

/** Who is asking what stands in its way or under it: it is left out of the answer. */
export type Who = { kind: 'starfish' } | { kind: 'gull'; index: number } | { kind: 'shell'; index: number } | { kind: 'wood'; index: number } | { kind: 'bucket' }

/** What the folk are told of the beach on every step. */
export type World = {
  finger: Finger
  /**
   * The sun while it is away from its place at the top: in the hand, on its way, or just gone down with the
   * folk still to come. Where it is across the sky and how far down, 0 to 1. Each of the folk that is still at
   * its day place, with no finger on the sand, turns to it as it travels. `gone` is how long ago it went down,
   * in seconds: their eyes go slowly to and fro along the sky where it was.
   */
  sun?: { x: number; low: number; gone: number } | null
  /** The height of the sand at a point. */
  ground(x: number, z: number): number
  /** What lies in the way of something of radius `r` at a point, or null. The crab asks without the shells: it picks a shell up. */
  blocked(x: number, z: number, r: number, shells?: boolean, wood?: boolean): Patch | null
  /** Sand built into a tower or a wall that comes within `r` of a point, or null. Without it, none. */
  built?(x: number, z: number, r: number): Patch | null
  /** Built sand where it is in the way of the one that asks: not there for a crab that stands on built sand or climbs it. */
  sand?: (x: number, z: number, r: number) => Patch | null
  /** The height of what a foot stands on at a point: the sand, or a bough that lies on it. Without it, the sand. */
  footing?(x: number, z: number): number
  /** Whether a shell lies on the sand, or is on its way to, within `r` of a point. */
  shellOver?(x: number, z: number, r: number): boolean
  /** Whether the bucket, standing, lying, carried or in the air, is over a round patch of the sand, with the room a finger's speed needs. */
  bucketOver?(x: number, z: number, r: number): boolean
  /** The height of whatever a body rests on at a point: the sand, or a rock that stands there. Without it, the sand. */
  support?(x: number, z: number): number
  /** Everything that stands on the beach but the one who asks, with the height of its top. Without it, nothing. */
  pillars?(who: Who): readonly Pillar[]
  /** The bucket where it is drawn now, standing, lying, carried or in the air, with the height of its top. Without it, none. */
  bucket?(): Pillar | null
}

/**
 * How the folk look at the sun on its way: how far their eyes go across to it for each unit it is off to one
 * side, how far toward it the crab's eyes are with the sun still high, how far the starfish's and the eel's eyes
 * come down as it sinks, the starfish's arm with the sun high and its sway, the gulls' heads with the sun high,
 * and how far to either side the eyes go along the sky once it is down.
 */
export const SUN_LOOK = { across: 0.25, high: 0.35, drop: 0.5, arm: 0.3, sway: 0.15, head: 0.45, seek: 0.3 } as const
/**
 * How far across the eyes of one that stands at `x` are turned to the sun: to its side, with room kept to go on
 * to either side, and once it is down slowly to and fro along the sky from where it was.
 */
export function sunAcross(sun: { x: number; gone: number }, x: number): number {
  return clamp((sun.x - x) * SUN_LOOK.across, SUN_LOOK.seek - 1, 1 - SUN_LOOK.seek) + SUN_LOOK.seek * Math.sin(sun.gone * 1.9)
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value
}
function smooth(t: number): number {
  const c = clamp(t, 0, 1)
  return c * c * (3 - 2 * c)
}
/** Eases `from` toward `to` so that the gap halves every `halfLife` seconds. */
function ease(from: number, to: number, halfLife: number, dt: number): number {
  // A frame of no time moves nothing, to the last bit.
  return dt <= 0 ? from : to + (from - to) * Math.pow(0.5, dt / halfLife)
}
/** A spring toward `to`: returns the new position and speed. */
function spring(at: number, speed: number, to: number, stiffness: number, damping: number, dt: number): [number, number] {
  const next = speed + ((to - at) * stiffness - speed * damping) * dt
  return [at + next * dt, next]
}

/** Picks one of `count` idle variants, never the one picked last. */
class Variants {
  private last = -1
  constructor(private readonly count: number, private readonly rng: Rng) {}
  next(): number {
    let pick = below(this.rng, this.count)
    if (pick === this.last) pick = (pick + 1) % this.count
    this.last = pick
    return pick
  }
}

/** What lies in the way of a body standing over `rounds`: one of the things or the rocks, or one of the folk in `also`. */
function inWay(rounds: readonly Patch[], world: World, shells: boolean, also: readonly Patch[]): { patch: Patch; round: Patch } | null {
  for (const round of rounds) {
    const patch = world.blocked(round.x, round.z, round.r, shells)
    if (patch) return { patch, round }
    for (const other of also) if (Math.hypot(other.x - round.x, other.z - round.z) < other.r + round.r + 0.06) return { patch: other, round }
  }
  return null
}

/**
 * One step across the sand toward a point, going round whatever lies in the
 * way: where the straight step is blocked, the step slides along the edge of
 * what blocks it, and where that is blocked too, no step is taken. `rounds`
 * gives the sand the body stands over at a place. Returns the step taken.
 */
function stepToward(x: number, z: number, toX: number, toZ: number, most: number, rounds: (x: number, z: number) => Patch[], world: World, shells = true, also: readonly Patch[] = [], never?: (x: number, z: number) => { patch: Patch; round: Patch } | null, firm = false): { dx: number; dz: number; arrived: boolean } {
  const gapX = toX - x, gapZ = toZ - z, gap = Math.hypot(gapX, gapZ)
  const whole = gap <= most
  let dx = whole ? gapX : (gapX / gap) * most, dz = whole ? gapZ : (gapZ / gap) * most
  // What it is going to is not in its way: the rock it lives on, the thing it means to climb.
  // What `never` finds is in its way even there: it does not go under it to get to a place.
  const meets = (px: number, pz: number): { patch: Patch; round: Patch } | null => {
    const barred = never?.(px, pz)
    if (barred) return barred
    const found = inWay(rounds(px, pz), world, shells, also)
    // To one that is `firm` nothing is let by: the crab's line may run through where a thing lies, and it steps round.
    return found && !firm && Math.hypot(found.patch.x - toX, found.patch.z - toZ) < found.patch.r ? null : found
  }
  // Under what it is never under, as when that came down over it: it steps out from under, the straight way, unless
  // something else stands there.
  const over = never?.(x, z)
  if (over) {
    const awayX = x - over.patch.x, awayZ = z - over.patch.z, away = Math.hypot(awayX, awayZ) || 1
    const step = Math.min(most, Math.max(gap, most)), outX = (awayX / away) * step, outZ = (awayZ / away) * step
    if (inWay(rounds(x + outX, z + outZ), world, shells, also) && !inWay(rounds(x, z), world, shells, also)) return { dx: 0, dz: 0, arrived: false }
    // Out from under an arm it does not step up onto built sand it is not on.
    if (world.sand && rounds(x + outX, z + outZ).some((round) => world.sand?.(round.x, round.z, round.r))) return { dx: 0, dz: 0, arrived: false }
    return { dx: outX, dz: outZ, arrived: false }
  }
  const found = meets(x + dx, z + dz)
  if (!found) return { dx, dz, arrived: whole }
  // Standing in it already, as when something was set down on it: any step is let go, so it can leave.
  const now = meets(x, z)
  if (now) {
    const awayX = now.round.x - now.patch.x, awayZ = now.round.z - now.patch.z, away = Math.hypot(awayX, awayZ) || 1
    // Let go, but never further into anything: not into what it is leaving, and not into something else beside it.
    const deep = (patch: Patch, px: number, pz: number): number => {
      let most = -Infinity
      for (const round of rounds(px, pz)) most = Math.max(most, patch.r + round.r - Math.hypot(patch.x - round.x, patch.z - round.z))
      return most
    }
    const free = (sx: number, sz: number): boolean => {
      const hit = meets(x + sx, z + sz)
      if (!hit) return true
      // Built sand is many small patches: leaving one thing, it does not step onto sand it is not on.
      if (world.sand && rounds(x + sx, z + sz).some((round) => world.sand?.(round.x, round.z, round.r))) return false
      return deep(hit.patch, x + sx, z + sz) <= deep(hit.patch, x, z) + 1e-6
    }
    if (dx * awayX + dz * awayZ >= 0) return free(dx, dz) ? { dx, dz, arrived: whole } : { dx: 0, dz: 0, arrived: false }
    const step = Math.min(most, gap), outX = (awayX / away) * step, outZ = (awayZ / away) * step
    return free(outX, outZ) ? { dx: outX, dz: outZ, arrived: false } : { dx: 0, dz: 0, arrived: false }
  }
  const outX = found.round.x - dx - found.patch.x, outZ = found.round.z - dz - found.patch.z, out = Math.hypot(outX, outZ) || 1
  const tx = -outZ / out, tz = outX / out
  const way = tx * gapX + tz * gapZ >= 0 ? 1 : -1
  // Along the edge, and a little outward so the turn does not creep in.
  const step = Math.min(most, gap)
  dx = tx * way * step + (outX / out) * step * 0.25
  dz = tz * way * step + (outZ / out) * step * 0.25
  if (meets(x + dx, z + dz)) return { dx: 0, dz: 0, arrived: false }
  return { dx, dz, arrived: false }
}

/** The sand a walker keeps to when it looks for a way round: the dry beach the child sees, and the wet edge of it. */
const WAY_ROOM = { x0: -8.6, x1: 8.6, z0: 0.4, z1: 8.4, step: 0.3, span: 46 } as const

/** How fast it turns, in radians a second, while the eel is up in the water its legs would sweep over. */
const CRAB_TURNS_SLOW = 1.2
/** A turn of more than this in a frame is a swing, and its claws sweep wide: the room for them is looked for at every such step of it. */
const SWING_STEP = 0.06
/** The turn a body that goes side first has as it goes that way. */
function sideways(dx: number, dz: number): number {
  let turn = Math.atan2(-dz, dx)
  if (turn > Math.PI / 2) turn -= Math.PI
  if (turn < -Math.PI / 2) turn += Math.PI
  return turn
}

/**
 * A way across the sand from one place to another, round everything that
 * `free` says is in the way of a body standing at a place. Returns the
 * corners to make for in turn, the last of them the place itself, or null
 * where there is no way.
 */
export function findWay(fromX: number, fromZ: number, toX: number, toZ: number, free: (x: number, z: number) => boolean): Point[] | null {
  return wayToAny(fromX, fromZ, [{ x: toX, z: toZ }], free)?.way ?? null
}
/** The same, to whichever of several places is the fewest steps away: the way, and which place it leads to. */
export function wayToAny(fromX: number, fromZ: number, to: readonly Point[], free: (x: number, z: number) => boolean): { way: Point[]; index: number } | null {
  if (to.length === 0) return null
  const { step, span } = WAY_ROOM, wide = span * 2 + 1
  const xs = to.map((point) => point.x), zs = to.map((point) => point.z)
  const x0 = Math.min(WAY_ROOM.x0, fromX, ...xs), x1 = Math.max(WAY_ROOM.x1, fromX, ...xs), z0 = Math.min(WAY_ROOM.z0, fromZ, ...zs), z1 = Math.max(WAY_ROOM.z1, fromZ, ...zs)
  let index = -1
  const from = new Int32Array(wide * wide).fill(-1)
  const start = span * wide + span
  const queue = [start]
  from[start] = start
  let end = -1
  for (let head = 0; head < queue.length && end < 0; head++) {
    const at = queue[head], i = Math.floor(at / wide) - span, j = (at % wide) - span
    for (let n = 0; n < 8; n++) {
      // Straight steps before slanted ones, so that the way found is no more crooked than it need be.
      const di = [1, -1, 0, 0, 1, 1, -1, -1][n], dj = [0, 0, 1, -1, 1, -1, 1, -1][n]
      const ni = i + di, nj = j + dj
      if (Math.abs(ni) > span || Math.abs(nj) > span) continue
      const next = (ni + span) * wide + nj + span
      if (from[next] >= 0) continue
      const x = fromX + ni * step, z = fromZ + nj * step
      if (x < x0 || x > x1 || z < z0 || z > z1 || !free(x, z)) continue
      from[next] = at
      index = to.findIndex((point) => Math.hypot(point.x - x, point.z - z) < step * 0.75)
      if (index >= 0) {
        end = next
        break
      }
      queue.push(next)
    }
  }
  if (end < 0) return null
  const corners: Point[] = [{ x: to[index].x, z: to[index].z }]
  for (let at = end; at !== start; at = from[at]) corners.push({ x: fromX + (Math.floor(at / wide) - span) * step, z: fromZ + ((at % wide) - span) * step })
  corners.push({ x: fromX, z: fromZ })
  corners.reverse()
  // Pulled straight: from each corner on to the furthest one it can go straight to.
  const straight = (a: Point, b: Point): boolean => {
    const far = Math.hypot(b.x - a.x, b.z - a.z)
    for (let t = 0.15; t < far; t += 0.15) if (!free(a.x + ((b.x - a.x) * t) / far, a.z + ((b.z - a.z) * t) / far)) return false
    return true
  }
  const way: Point[] = []
  for (let at = 0; at < corners.length - 1; ) {
    let next = at + 1
    for (let to = corners.length - 1; to > at + 1; to--) if (straight(corners[at], corners[to])) {
      next = to
      break
    }
    way.push(corners[next])
    at = next
  }
  return { way, index }
}

// --- The crab ----------------------------------------------------------------

/** How wide the tower the starfish lies on is to the crab: a bucket's foot and the soft sand round it. */
export const STAR_TOWER = 0.75
/** How far from its legs a shell lies where the crab is set down on its line: further than it reaches to lift one. */
export const SHELL_KEPT = 0.3

export const CRAB_TEMPO = { run: 0.62, stop: 1.1, speed: 2.3 } as const
/** How far off a place is before it looks for a way to it as it sets off, how long it is held up before it looks for a way round, how long it runs at something with no way round before it climbs over, how long it then climbs, and how fast it goes up and down. */
export const CRAB_CLIMB = { trip: 1, seeks: 0.5, held: 2, barred: 1.2, lasts: 8, speed: 2.4 } as const
/** The furthest it leans to either side: running and tipped by the sand under it, and all told, as when it looks into a hole. */
export const CRAB_LEAN = { run: 0.21, most: 0.34 } as const
/** Poked, it snaps both claws three times, this far apart. */
export const SNAP_EVERY = 0.22
/**
 * Cut off from its line: after so long with no point of its line reached and no more than `moved` gone, it
 * looks for any way to any point of its line, however far round. With none it digs itself in: it goes down
 * `deep` into the sand over `down` seconds, shuffling, and looks about from there with its eyes out, drawing
 * them in for a blink every `peek` seconds or so. After each blink it looks again for a way, and with one it
 * comes up, in `up` seconds, as it does when the beach is changed or a finger lands on it. With a way, it is not cut off,
 * and goes on as it was, busy with a shell or waiting for an arm to lift; after `long` it takes that way, once,
 * and if that takes it to no point of its line either, it digs in then.
 */
export const CRAB_DIGS = { after: 8, long: 16, moved: 0.8, deep: 0.42, down: 0.8, up: 0.22, peek: 2.6, blink: 0.4 } as const

export class Crab {
  x: number = CRAB_HOME.x + CRAB_RING
  z: number = CRAB_HOME.z
  /** How far its body is turned about the upright, so that it always goes sideways. */
  turn = 0
  /** How far its legs have gone, for the view to step them. */
  stride = 0
  /** Body height above the sand it stands on, and its speed. */
  lift = 0
  /** How high its feet stand: on the sand under them, or on a bough it climbs over. */
  floor = 0
  /** How far the legs of its left side and of its right stretch down to the sand under them. */
  reach: [number, number] = [0, 0]
  /** How long it has run at what is in its way and come no nearer, and how near it has come. */
  private stuck = 0
  private nearest = Infinity
  private aimed = NaN
  /** How much longer sand built in its way, and a bough, are not in its way: it walks up and over. */
  private climbs = 0
  private climbed = false
  private boughs = false
  /** Held up by the starfish over its way: it makes for the next point of its line. And how many it has passed by so. */
  private pass = false
  private passed = 0
  /** It is on a bough it climbed: only then is a bough's top its floor. A bough beside it is in its way, not under it. */
  private onBough = false
  /** The way it has found round what held it up: the corners still to make for. And whether it has looked for one since it last made for somewhere new. */
  private route: Point[] = []
  private sought = false
  /** How it is turned all along that way: it is found for a body turned so, and it does not turn on it. */
  private routeTurn = 0
  /** It has not yet set off for the place it now makes for. */
  private fresh = true
  /** How high each claw may be held and how far out each eye may stand, under an arm of the starfish. */
  private clawMost: [number, number] = [9, 9]
  private eyeMost: [number, number] = [9, 9]
  /** The most its claws and eyes may stand for the swing it was kept from a frame ago: they come down for it first. */
  private swingMost: { claws: [number, number]; eyes: [number, number] } | null = null
  private liftSpeed = 0
  /** How far its body leans, positive to its left as it faces the child: into a run, and as the sand under its feet tips it. */
  lean = 0
  /** The part of its lean that is the sand under its feet: its legs stand so, whatever its body does over them. */
  tilt = 0
  /** The part that is its own: into a run, and over to look into a hole. */
  private tip = 0
  /** Each claw: how high it is held, and how far shut (1 is snapped shut). */
  readonly claws = [{ raise: 0.2, shut: 0 }, { raise: 0.2, shut: 0 }]
  /** Each eye: how far out its stalk is, and where it leans, across and toward the child. */
  readonly eyes = [{ out: 1, across: 0, toward: 0, speed: 0 }, { out: 1, across: 0, toward: 0, speed: 0 }]
  /** 0 a level line, 1 a round o. */
  mouth = 0
  /** How many dead stops it has made, so the game knows when the next one comes. */
  stops = 0
  /** It wears a shell on its eye stalks: it holds them still and upright under it. */
  hatted = false
  /** It stands where it is: a shell it put back is still in the air, or one lies at its feet that it cannot lift yet. */
  waits = false
  /** Held up under an arm of the starfish by the shell it wears: the game has it put the shell down beside it. */
  sheds = false
  /** It means to swing right round and waits: the eel is up in the water its legs would sweep over, and goes under first. */
  swings = false
  /** How far it has dug itself into the sand where it stands, 0 to 1: its legs are under, its eyes are out. */
  dug = 0
  /** It means to be dug in: nothing it has tried took it to its line. And how long it has tried from where it began. */
  private digs = false
  private tried = 0
  private triedFrom: Point = { x: 0, z: 0 }
  /** It has taken the long way round to its line once, and reached no point of it since. And it has looked whether there is one. */
  private longed = false
  private probed = false
  /** Cut off with a shell on its eyes, it has put the shell down once to try without it. */
  private shed = false
  /** Dug in, how long until it next draws its eyes in, and how far into that blink it is. */
  private peek = 0
  private blink = 9
  /** Sand it kicked up on a dry patrol, for the game to throw. */
  readonly kicks: Point[] = []
  readonly sounds: FolkSound[] = []
  private plan: CrabPlan = { kind: 'home' }
  /** Which point of its evening line it is making for, and which way along the line it goes. */
  private at = 0
  private way = 1
  private angle = 0
  private mode: 'run' | 'stop' | 'flinch' = 'stop'
  private timer = 0.8
  /** Which eye moves next: they never move together. */
  private eyeTurn = 0
  private eyeTimer = 0
  /** Its small acts: 0 snaps one claw, 1 taps the sand, 2 looks out to sea, 3 stamps at a gap. */
  private act = -1
  private actTime = 0
  private sinceCircle = 0
  private flinch = 0
  /** How many of its snaps have clicked. */
  private snaps = 0
  private offset = 0
  private awayFor = 0
  private gaze = { across: 0, toward: 0.3 }
  private readonly variants: Variants

  constructor(private readonly rng: Rng) {
    this.variants = new Variants(3, rng)
  }

  /** Where it is by its plan: walking its empty ring, or on an evening line. */
  get out(): boolean {
    return this.plan.kind !== 'home'
  }

  /** What the evening holds for it now. A changed line is taken up from its nearest point. */
  setPlan(plan: CrabPlan): void {
    if (plan === this.plan) return
    this.plan = plan
    this.route = []
    this.sought = false
    // Something on the beach was changed. Dug in, it looks about at once, and comes up if there is a way now; sent
    // home, it comes up to go.
    if (plan.kind === 'home') this.digs = false
    else if (this.digs) this.peek = 0
    this.tried = 0
    this.longed = false
    this.shed = false
    if (plan.kind === 'home') return
    let nearest = 0
    plan.path.forEach((point, index) => {
      if (Math.hypot(point.x - this.x, point.z - this.z) < Math.hypot(plan.path[nearest].x - this.x, plan.path[nearest].z - this.z)) nearest = index
    })
    this.at = nearest
    if (this.way !== 1 && this.way !== -1) this.way = 1
  }

  /**
   * At its place at once, as a load or the end of a scene leaves it. On its line it is set down at the nearest
   * point where no shell lies under it or at its feet: untouched, it lifts nothing.
   */
  settle(world: World): void {
    const plan = this.plan
    if (plan.kind === 'home') {
      this.x = CRAB_HOME.x + Math.cos(this.angle) * CRAB_RING
      this.z = CRAB_HOME.z + Math.sin(this.angle) * CRAB_RING * 0.6
      this.turn = 0
    } else {
      const count = plan.path.length
      this.at = Math.min(this.at, count - 1)
      // It stands along its line there, side on to the way it walks, as it would have come to that point.
      const closed = plan.kind === 'ring' && !plan.open
      const turnAt = (index: number): number => {
        const before = plan.path[index > 0 ? index - 1 : closed ? count - 1 : 0], after = plan.path[index < count - 1 ? index + 1 : closed ? 0 : count - 1]
        return sideways(after.x - before.x, after.z - before.z)
      }
      const shellAt = (index: number): boolean => {
        const point = plan.path[index]
        return crabRounds({ x: point.x, z: point.z, turn: turnAt(index) }).some((round) => world.blocked(round.x, round.z, round.r + SHELL_KEPT, true) !== null && world.blocked(round.x, round.z, round.r + SHELL_KEPT, false) === null)
      }
      for (let off = 0; off < count; off++) {
        const index = [this.at + off, this.at - off].find((at) => at >= 0 && at < count && !shellAt(at))
        if (index === undefined) continue
        this.at = index
        break
      }
      this.x = plan.path[this.at].x
      this.z = plan.path[this.at].z
      this.turn = turnAt(this.at)
    }
    this.offset = 0
    this.mode = 'stop'
    this.timer = 0.6
    this.act = -1
    this.dug = 0
    this.digs = false
    this.tried = 0
    this.longed = false
    this.shed = false
    this.triedFrom = { x: this.x, z: this.z }
    this.stuck = 0
    this.nearest = Infinity
    this.climbs = 0
    this.pass = false
    this.passed = 0
    this.onBough = false
    this.route = []
    this.sought = false
    this.tilt = clamp(crabTilt(this, this.footing(world)), -CRAB_LEAN.run, CRAB_LEAN.run)
    this.lean = this.leaning()
    this.stand(world)
  }

  /** Its own lean and the sand's together: the sand tips it no further than it leans into a run by itself. */
  private leaning(): number {
    const most = Math.max(CRAB_LEAN.run, Math.min(CRAB_LEAN.most, Math.abs(this.tip)))
    return clamp(this.tip + this.tilt, -most, most)
  }

  /** Its feet on what is under them, where it is now, tipped as the sand tips it. */
  stand(world: World): void {
    const footing = this.footing(world), as = { x: this.x, z: this.z, turn: this.turn, lean: this.tilt }
    // Dug in, all of it is lower by as much as it has dug, and its legs are in the sand.
    this.floor = crabFloor(as, footing) - this.dug * CRAB_DIGS.deep
    this.reach = legReach(as, this.floor, footing)
  }

  /** A finger on the crab: it pulls its eyes in and snaps both claws. */
  poke(): void {
    // Dug in, it comes up at the touch.
    this.digs = false
    this.tried = 0
    this.longed = false
    this.shed = false
    this.mode = 'flinch'
    this.flinch = 0
    this.liftSpeed = -2.2
    // The first snap is in the frame the finger lands; each of the three clicks as its claws shut.
    for (const claw of this.claws) claw.shut = 1
    this.snaps = 1
    this.sounds.push('clack')
  }

  /** A grain landed on it: one claw snaps at it. */
  pinch(): void {
    if (this.mode === 'flinch' || this.act === 0 || this.act === 3) return
    this.act = 0
    this.actTime = 0
    this.snaps = 0
  }

  step(dt: number, world: World, also: readonly Patch[] = [], ridden = false, overhead: readonly (readonly [number, number, number])[] = [], tower: Patch | null = null, lying = true, eelUp = false): void {
    const finger = world.finger
    this.swings = false
    const plan = this.plan
    const held = this.claws.map((claw) => claw.raise)
    const footing = this.footing(world)
    // Sand built into a tower or a wall is in its way like a rock, and it goes round. Held up with no way round, it
    // climbs: then neither built sand nor a bough is in its way, and it walks up and over on top of them.
    // A bough it climbs over only to get out of a pocket on its way home: on its bank it steps round one.
    const climbing = this.climbs > 0, boughs = climbing && this.boughs
    // Standing on built sand already, as where a tower was turned out beside it, it is on it: it walks on and off.
    const onSand = climbing || crabRounds(this).some((round) => (world.built?.(round.x, round.z, round.r) ?? null) !== null)
    const land: World = { ...world, blocked: (x, z, r, shells) => world.blocked(x, z, r, shells, !boughs) ?? (onSand ? null : world.built?.(x, z, r) ?? null), sand: onSand ? undefined : world.built }
    // The starfish where it lies over the sand, with its arms out over the edge of a tower: the crab lowers a claw
    // and pulls in an eye to go by under an arm, and where that is not room enough it is never under it, whatever
    // it is making for. `seen` is the starfish's skin as the crab would have it over itself at a place, turned so.
    const leans = this.eyes.map((eye, i) => eyeLean(eye.across, eye.toward, i === 0 ? -1 : 1, 1, this.claws[i].raise))
    const seen = (x: number, z: number, turn: number): [number, number, number][] => {
      const floor = crabFloor({ x, z, turn, lean: this.tilt }, footing), cos = Math.cos(turn), sin = Math.sin(turn), leanCos = Math.cos(this.lean), leanSin = Math.sin(this.lean)
      const out: [number, number, number][] = []
      for (const [px, py, pz] of overhead) {
        const dx = px - x, dz = pz - z
        if (dx * dx + dz * dz > 6) continue
        const flat = dx * cos - dz * sin, high = py - floor - this.lift * 0.35
        out.push([flat * leanCos + high * leanSin, -flat * leanSin + high * leanCos, dx * sin + dz * cos])
      }
      return out
    }
    const under = (x: number, z: number, turn = this.turn): { patch: Patch; round: Patch } | null => {
      if (overhead.length === 0) return null
      // Its shell reaches 0.92 from its middle: that far from the tower's foot it stops.
      const atTower = tower !== null && Math.hypot(tower.x - x, tower.z - z) < tower.r + CRAB_SHELL.rx
      if (!atTower && !crabRoom(seen(x, z, turn), this.lift, leans, this.hatted).barred) return null
      // Out from under it is away from its middle.
      let mx = 0, mz = 0
      for (const [px, , pz] of overhead) {
        mx += px
        mz += pz
      }
      return { patch: { x: mx / overhead.length, z: mz / overhead.length, r: 0 }, round: { x, z, r: 0 } }
    }
    const room = overhead.length > 0 ? crabRoom(seen(this.x, this.z, this.turn), this.lift, leans, this.hatted, CRAB_AHEAD) : null
    this.clawMost = room ? [room.claws[0], room.claws[1]] : [9, 9]
    this.eyeMost = room ? [room.eyes[0], room.eyes[1]] : [9, 9]
    if (this.swingMost) for (let i = 0; i < 2; i++) {
      this.clawMost[i] = Math.min(this.clawMost[i], this.swingMost.claws[i])
      this.eyeMost[i] = Math.min(this.eyeMost[i], this.swingMost.eyes[i])
    }
    this.swingMost = null
    // An arm that comes down over it where it stands, lower than it can make itself: it steps out from under.
    const out = under(this.x, this.z) !== null
    this.actTime += dt
    // By day, the finger digging close by: it runs off sideways and comes back when the sand is quiet.
    const reach = finger !== null ? Math.hypot(finger.x - this.x, finger.z - this.z) : Infinity
    // Digging right beside it, or a thing carried right up to it: it runs off sideways. Digging a little further off: it stops and leans over to look in.
    const near = reach < (finger?.digging ? 1.0 : 1.5)
    const looking = !near && reach < 2.8 && plan.kind === 'home' && finger !== null && finger.digging
    if (plan.kind === 'home' && near && finger) {
      this.awayFor = 1.2
      const side = finger.x > this.x ? -1 : 1
      this.offset = clamp(this.offset + side * CRAB_TEMPO.speed * 1.4 * dt, -CRAB_ROAM, CRAB_ROAM)
    } else if (this.awayFor > 0) this.awayFor -= dt
    else this.offset = ease(this.offset, 0, 0.35, dt)

    // Where it is making for: the next point of its empty ring, or of its evening line.
    const closed = plan.kind === 'ring' && !plan.open
    if (plan.kind !== 'home') {
      this.at = clamp(this.at, 0, plan.path.length - 1)
      // A point of its line that the starfish lies over is passed by: it makes for the next one, round the starfish.
      if (this.mode === 'run' && (this.pass || under(plan.path[this.at].x, plan.path[this.at].z))) {
        this.pass = false
        const next = this.at + this.way, count = plan.path.length
        if (closed) this.at = (next + count) % count
        else if (next >= 0 && next < count) this.at = next
        else {
          this.way = -this.way
          this.at = clamp(this.at + this.way, 0, count - 1)
        }
      }
    }
    const goalX = plan.kind === 'home' ? CRAB_HOME.x + Math.cos(this.angle) * CRAB_RING + this.offset : plan.path[this.at].x
    const goalZ = plan.kind === 'home' ? CRAB_HOME.z + Math.sin(this.angle) * CRAB_RING * 0.6 : plan.path[this.at].z
    // Making for somewhere new, it starts afresh: the way it had found round something was a way to the old place.
    const aim = plan.kind === 'home' ? this.angle : this.at * 4 + this.way
    if (aim !== this.aimed) {
      this.aimed = aim
      this.nearest = Infinity
      this.stuck = 0
      this.route = []
      this.sought = false
      this.fresh = true
    }
    if (plan.kind === 'home' && (near || this.awayFor > 0)) this.route = []
    // Held up, it has looked for a way round: then it makes for the corners of that way in turn.
    // As it is turned if there is a way so; or else turned another way, where it has room to turn so where it
    // stands. By day it stands square to the child whichever way it goes.
    // With no way round, `over` looks for the way it can climb: over built sand, and on its way home over a bough.
    const seek = (over = false): boolean => {
      this.sought = true
      const from = this.turn
      const direct = Math.hypot(goalX - this.x, goalZ - this.z)
      const spins = (to: number): boolean => {
        for (let t = 0.1; t < Math.abs(to - from); t += 0.1) if (!clear(this.x, this.z, from + Math.sign(to - from) * t, over)) return false
        return true
      }
      for (const turn of firm ? [from, sideways(goalX - this.x, goalZ - this.z), 0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2] : [0]) {
        if (firm && !spins(turn)) continue
        const way = findWay(this.x, this.z, goalX, goalZ, (x, z) => clear(x, z, turn, over))
        if (!way) continue
        // A way round is a step round: a way that goes right round its ring to come at the place from the other
        // side is no way round what is in front of it. An arm of the starfish out over its bank for a moment is
        // waited for, or gone by under; a tower with no way by is climbed.
        if (firm && wayLength(this.x, this.z, way) > Math.max(CRAB_ROUND.times * direct, direct + CRAB_ROUND.more)) continue
        this.route = way
        this.routeTurn = turn
        this.stuck = 0
        this.nearest = Infinity
        return true
      }
      return false
    }
    const aimX = this.route.length > 0 ? this.route[0].x : goalX, aimZ = this.route.length > 0 ? this.route[0].z : goalZ
    const firm = plan.kind !== 'home'
    // Whether it could stand at a place, turned so, for what lies there: the folk who walk, and the starfish on its
    // way somewhere, are not counted, they move on.
    const climbed: World = { ...world, blocked: (x, z, r, shells) => world.blocked(x, z, r, shells, firm), sand: undefined }
    const clear = (x: number, z: number, turn: number, over = false): boolean => {
      if (lying && under(x, z, turn)) return false
      const found = inWay(crabRounds({ x, z, turn }), over ? climbed : land, !firm, [])
      return !found || (!firm && Math.hypot(found.patch.x - goalX, found.patch.z - goalZ) < found.patch.r)
    }
    // Cut off from its line, as by two boughs laid across its bank with the starfish's tower between: when it has
    // tried for a while and reached no point of it, it does not stand there. First it looks for any way to any
    // point of its line, however far round, and takes it. With no such way, or with that way no good either, it
    // digs itself into the sand where it is, with a scrabble and a spray of sand, and looks about with its eyes
    // out. It comes up with a snap of its claws when something on the beach is changed, or at a touch, and takes
    // up its line again.
    const longWay = (take: boolean): boolean => {
      if (plan.kind === 'home') return false
      // To whichever point of its line is the fewest steps away, but for the ones it stands at: as it is turned
      // now, round everything, and failing that up and over built sand.
      const points = plan.path.map((point, index) => ({ ...point, index })).filter((point) => Math.hypot(point.x - this.x, point.z - this.z) > 0.5)
      for (const over of [false, true]) {
        const found = wayToAny(this.x, this.z, points, (x, z) => clear(x, z, this.turn, over))
        if (!found) continue
        if (!take) return true
        this.at = points[found.index].index
        this.aimed = this.at * 4 + this.way
        this.route = found.way
        this.routeTurn = this.turn
        this.sought = true
        this.fresh = false
        this.stuck = 0
        this.nearest = Infinity
        if (over) {
          this.climbs = CRAB_CLIMB.lasts
          this.climbed = false
          this.boughs = false
        }
        return true
      }
      return false
    }
    if (!firm || this.mode === 'flinch') this.digs = false
    else if (!this.digs && !this.waits) {
      if (!(Math.hypot(this.x - this.triedFrom.x, this.z - this.triedFrom.z) <= CRAB_DIGS.moved)) {
        this.triedFrom = { x: this.x, z: this.z }
        this.tried = 0
      }
      if (this.tried === 0) this.probed = false
      this.tried += dt
      let cut = false
      if (this.tried > CRAB_DIGS.after && !this.probed) {
        this.probed = true
        cut = !longWay(false)
      }
      if (this.tried > CRAB_DIGS.long) {
        this.tried = 0
        if (!this.longed && longWay(true)) this.longed = true
        else cut = true
      }
      // With a shell on its eyes it is too tall for a way under an arm: it puts the shell down first, and tries again.
      if (cut && this.hatted && !this.shed) {
        cut = false
        this.shed = true
        this.sheds = true
        this.tried = 0
      }
      if (cut) {
        this.tried = 0
        this.digs = true
        this.peek = CRAB_DIGS.peek
        this.kicks.push({ x: this.x, z: this.z })
        this.sounds.push('burrow')
      }
    }
    // Dug in, each time it has looked about it knows whether there is a way now: an arm of the starfish has
    // lifted, or the child has moved what shut it in.
    if (this.digs && this.dug >= 1 && this.blink >= CRAB_DIGS.blink + 0.6 && this.blink - dt < CRAB_DIGS.blink + 0.6 && longWay(false)) this.digs = false
    if (this.digs) {
      if (this.dug < 1) this.stride += dt * 2.6
      this.dug = Math.min(1, this.dug + dt / CRAB_DIGS.down)
    } else if (this.dug > 0) {
      if (this.dug >= 1 && this.mode !== 'flinch') {
        // Up it comes: a hop, both claws snapped shut, sand thrown.
        this.liftSpeed = 2.6
        for (const claw of this.claws) claw.shut = 1
        this.kicks.push({ x: this.x, z: this.z })
        this.sounds.push('clack')
      }
      this.dug = Math.max(0, this.dug - dt / CRAB_DIGS.up)
      this.tried = 0
    }
    let movedX = 0, movedZ = 0
    if (this.mode === 'flinch') {
      this.flinch += dt
      const eyesIn = this.flinch < 0.5
      // The stalks come back out one after the other, each with a bounce.
      this.eyeTarget(0, eyesIn ? 0 : 1, dt)
      this.eyeTarget(1, this.flinch < 0.72 ? 0 : 1, dt)
      for (const claw of this.claws) {
        claw.raise = ease(claw.raise, 1, 0.05, dt)
        claw.shut = this.flinch % SNAP_EVERY < 0.09 && this.flinch < 0.5 ? 1 : ease(claw.shut, 0, 0.04, dt)
      }
      // Three snaps, and a click with each as the claws shut.
      const snap = Math.floor(this.flinch / SNAP_EVERY)
      if (this.flinch < 0.5 && snap >= this.snaps) {
        this.snaps = snap + 1
        this.sounds.push('clack')
      }
      this.mouth = ease(this.mouth, 1, 0.05, dt)
      if (this.flinch > 1.25) {
        this.mode = 'stop'
        this.timer = 0.5
      }
    } else {
      // Told to wait, it stops dead where it is and stays stopped. So it does while it is in the sand.
      if (this.waits || this.dug > 0) {
        this.mode = 'stop'
        this.timer = Math.max(this.timer, 0.15)
      }
      this.timer -= dt
      // Fleeing a digging finger is not a run of its own: the offset carries it at once.
      const fleeing = plan.kind === 'home' && (near || this.awayFor > 0)
      if (this.mode === 'run' || fleeing || (out && this.dug === 0)) {
        // Its legs and its claws go round whatever lies on the sand. By day a shell is in its way like anything else; at evening it picks a shell up.
        const step = stepToward(this.x, this.z, aimX, aimZ, CRAB_TEMPO.speed * (fleeing ? 1.4 : 1) * dt, (x, z) => crabRounds({ x, z, turn: this.turn }), land, !firm, also, under, firm)
        // It turns to a way round before it sets off along it.
        const turning = firm && this.route.length > 0 && Math.abs(this.routeTurn - this.turn) > 0.03
        movedX = turning ? 0 : step.dx
        movedZ = turning ? 0 : step.dz
        // It goes up and down no faster than it can climb: where the sand under its feet rises steeply, its steps are short.
        for (let pass = 0; pass < 3 && dt > 0; pass++) {
          const next = crabFloor({ x: this.x + movedX, z: this.z + movedZ, turn: this.turn, lean: this.tilt }, footing)
          if (Math.abs(next - this.floor) <= CRAB_CLIMB.speed * dt + 0.004) break
          movedX /= 2
          movedZ /= 2
        }
        if (this.mode === 'run' && !fleeing) {
          // Running at what is in its way and coming no nearer. Held up by the starfish over its way, it makes for
          // the next point of its line, and after three of them turns back. Held up by anything else, first it
          // climbs over what can be climbed, and held up still, by a rock or the bucket, it turns back along its line.
          const far = Math.hypot(aimX - this.x, aimZ - this.z) || 1
          const star = overhead.length > 0 && (out || under(this.x + ((aimX - this.x) / far) * 0.15, this.z + ((aimZ - this.z) / far) * 0.15) !== null)
          const gap = Math.hypot(aimX - this.x - movedX, aimZ - this.z - movedZ)
          if (gap < this.nearest - 0.03) {
            this.nearest = gap
            this.stuck = 0
          } else this.stuck += dt
          // Setting off for a place it cannot go straight to, it looks for the way round before it runs at what is
          // in the way. And held up for a moment, it looks for one, once: round a tower, a bough, the bucket, the starfish.
          if (this.fresh) {
            this.fresh = false
            const as = firm ? sideways(goalX - this.x, goalZ - this.z) : 0
            let straight = far < CRAB_CLIMB.trip
            for (let t = 0.3; t < far && !straight; t += 0.3) if (!clear(this.x + ((aimX - this.x) / far) * t, this.z + ((aimZ - this.z) / far) * t, as)) break
            else if (t + 0.3 >= far) straight = true
            if (!straight) seek()
          } else if (this.route.length === 0 && this.stuck > CRAB_CLIMB.seeks && !star) {
            if (!this.sought) seek()
            // No way round built sand, or none when it looked as it set off: it does not go on running at the
            // sand, it climbs now. At anything else it runs on a while: it may yet slide by.
            if (this.route.length === 0 && crabRounds({ x: this.x + ((aimX - this.x) / far) * 0.2, z: this.z + ((aimZ - this.z) / far) * 0.2, turn: this.turn }).some((round) => (world.built?.(round.x, round.z, round.r) ?? null) !== null)) this.stuck = CRAB_CLIMB.held + 1
          }
          if (this.stuck > (star ? CRAB_CLIMB.barred : CRAB_CLIMB.held)) {
            this.stuck = 0
            this.nearest = Infinity
            this.route = []
            const back = (): void => {
              if (plan.kind === 'home') this.angle += 0.55
              else {
                this.way = -this.way
                const count = plan.path.length
                this.at = closed ? (this.at + this.way + count) % count : clamp(this.at + this.way, 0, count - 1)
              }
            }
            if (star) {
              // With a shell on its eyes it is too tall to go by under the arm: it will put the shell down.
              if (this.hatted) this.sheds = true
              this.passed += 1
              if (this.passed > 2) {
                this.passed = 0
                back()
              } else this.pass = true
            } else {
              // What holds it: sand built in its way it climbs wherever it is; a bough only on its way home, where
              // boughs and the bucket set down round it would pocket it. At evening it steps round a bough.
              const ahead = crabRounds({ x: this.x + ((aimX - this.x) / far) * 0.2, z: this.z + ((aimZ - this.z) / far) * 0.2, turn: this.turn })
              const sand = ahead.some((round) => (world.built?.(round.x, round.z, round.r) ?? null) !== null)
              const bough = plan.kind === 'home' && ahead.some((round) => world.blocked(round.x, round.z, round.r, false, true) !== null && world.blocked(round.x, round.z, round.r, false, false) === null)
              if (!climbing && (sand || bough)) {
                this.climbs = CRAB_CLIMB.lasts
                this.climbed = false
                this.boughs = bough
              } else if (!climbing && seek(true)) {
                // No way round, and what it can climb is not right in front of it: it makes for the way over.
                this.climbs = CRAB_CLIMB.lasts
                this.climbed = false
                this.boughs = !firm
              } else {
                this.climbs = 0
                back()
              }
            }
          }
        }
        if (step.arrived && !turning && this.mode === 'run') {
          // At a corner of the way round, on to the next one; at the place itself, it has arrived.
          if (this.route.length > 0) {
            this.route.shift()
            this.nearest = Infinity
            this.stuck = 0
          } else this.arrived(plan, closed)
        }
      }
      if (looking && this.mode === 'stop') this.timer = Math.max(this.timer, 0.25)
      if (this.mode === 'run' && (this.timer <= 0 || looking)) this.stop(plan)
      else if (this.mode === 'stop' && this.timer <= 0) {
        this.mode = 'run'
        this.timer = CRAB_TEMPO.run * (0.7 + this.rng.next() * 0.6)
        // On a dry patrol every run kicks up sand.
        if (plan.kind !== 'home' && !plan.wet) this.kicks.push({ x: this.x, z: this.z })
      }
      // The eyes: one at a time. With a finger down both follow it, still one after the other.
      this.eyeTimer -= dt
      // The sun on its way: both eyes go to it, one after the other, and follow it down.
      const sun = !finger && plan.kind === 'home' ? world.sun ?? null : null
      if (this.eyeTimer <= 0) {
        this.eyeTimer = finger ? 0.16 : sun ? 0.3 : 0.5 + this.rng.next() * 0.9
        if (!finger) this.gaze = { across: this.rng.next() * 1.6 - 0.8, toward: this.rng.next() * 0.9 - 0.2 }
        this.eyeTurn = 1 - this.eyeTurn
      }
      const eye = this.eyes[this.eyeTurn]
      // Looking out to sea: by day as one of its acts, and on a dry patrol at every stop.
      const toSea = this.act === 2 || (plan.kind !== 'home' && !plan.wet && this.mode === 'stop')
      const across = finger ? clamp((finger.x - this.x) * 0.3, -1, 1) : sun ? sunAcross(sun, this.x) : toSea || this.act === 3 ? 0 : this.gaze.across
      const toward = finger ? clamp((finger.z - this.z) * 0.3, -1, 1) : sun ? -(SUN_LOOK.high + (1 - SUN_LOOK.high) * sun.low) : toSea ? -1 : this.act === 3 ? 1 : this.gaze.toward
      eye.across = ease(eye.across, this.hatted ? 0 : across, 0.05, dt)
      // With the starfish on its back its stalks do not lean back into it: it looks out to sea with them upright.
      eye.toward = ease(eye.toward, this.hatted ? 0 : ridden ? Math.max(0, toward) : toward, 0.05, dt)
      if (ridden) for (const other of this.eyes) other.toward = Math.max(0, other.toward)
      if (this.hatted) for (const other of this.eyes) {
        other.across = ease(other.across, 0, 0.05, dt)
        other.toward = ease(other.toward, 0, 0.05, dt)
      }
      // Dug in, it draws its eyes in for a blink now and then, one after the other, and they spring out again.
      this.blink += dt
      if (this.digs && this.dug >= 1) {
        this.peek -= dt
        if (this.peek <= 0) {
          this.peek = CRAB_DIGS.peek * (0.7 + this.rng.next() * 0.6)
          this.blink = 0
        }
      }
      this.eyeTarget(0, this.blink < CRAB_DIGS.blink ? 0 : 1, dt)
      this.eyeTarget(1, this.blink > 0.15 && this.blink < CRAB_DIGS.blink + 0.15 ? 0 : 1, dt)
      const tapping = (this.act === 1 || this.act === 3) && this.actTime < 1.1
      // One claw snaps at a grain that landed on it, and at the gap in its moat, with its click as it shuts.
      const snapping = (this.act === 0 || this.act === 3) && this.actTime < 0.35
      if (snapping && this.actTime > 0.12 && this.snaps === 0) {
        this.snaps = 1
        this.sounds.push('clack')
      }
      // On the bank of a ring with water in it, it patrols with both claws high.
      const proud = plan.kind === 'ring' && plan.wet && !this.digs ? 0.85 : 0.2
      this.claws[0].raise = ease(this.claws[0].raise, tapping ? (this.actTime % 0.36 < 0.18 ? -0.5 : 0.5) : proud, 0.04, dt)
      this.claws[1].raise = ease(this.claws[1].raise, snapping ? 0.9 : near ? 0.8 : proud, 0.05, dt)
      this.claws[0].shut = ease(this.claws[0].shut, 0, 0.05, dt)
      this.claws[1].shut = snapping && this.actTime > 0.12 ? 1 : ease(this.claws[1].shut, 0, 0.05, dt)
      if (this.act >= 0 && this.actTime > 1.6) this.act = -1
      this.mouth = ease(this.mouth, near || this.act === 3 ? 0.8 : 0, 0.08, dt)
    }
    // A claw comes down quickly, and no further than the arm over it needs: from where it was held, not from
    // where this frame would have raised it to.
    this.claws.forEach((claw, i) => {
      if (claw.raise > this.clawMost[i]) claw.raise = Math.max(this.clawMost[i], Math.min(claw.raise, held[i] - 12 * dt), -0.5)
    })
    this.x += movedX
    this.z += movedZ
    const moved = Math.hypot(movedX, movedZ)
    this.stride += moved * 5
    // It goes sideways whichever way it goes: the body turns so that its side leads.
    // It does not turn a leg or a claw into what lies beside it, or under an arm of the starfish: where the turn
    // would, it goes on as it is turned. Against that very thing already it may turn there, but no further into it;
    // and under an arm already it may turn, to get out.
    const turns = (turned: number, shells: boolean): boolean => {
      const as = crabRounds({ x: this.x, z: this.z, turn: turned })
      if (land.sand && as.some((round) => land.sand?.(round.x, round.z, round.r))) return false
      const into = inWay(as, land, shells, also)
      if (into) {
        const deep = (rounds: readonly Patch[]): number => Math.max(...rounds.map((round) => into.patch.r + round.r - Math.hypot(into.patch.x - round.x, into.patch.z - round.z)))
        const now = deep(crabRounds(this))
        if (now < -0.06 || deep(as) > now + 1e-6) return false
      }
      return !under(this.x, this.z, turned) || under(this.x, this.z) !== null
    }
    // Swinging right round to show its face again, its claws sweep a wide half circle in a few frames. Under an
    // arm of the starfish in the way of the swing it first brings its claws down and its eyes in as far as that
    // part of the swing needs, and swings on when they are down.
    const swing = (to: number, shells: boolean): void => {
      let turned = to
      // The eel up in the water its legs would sweep over: it turns no faster than the eel can see coming, until
      // the eel has gone under.
      if (eelUp && Math.abs(turned - this.turn) > CRAB_TURNS_SLOW * dt) {
        this.swings = true
        turned = this.turn + Math.sign(turned - this.turn) * CRAB_TURNS_SLOW * dt
      }
      if (!turns(turned, shells)) return
      if (overhead.length > 0 && Math.abs(turned - this.turn) > SWING_STEP && under(this.x, this.z) === null) {
        const from = this.turn, count = Math.ceil(Math.abs(turned - from) / SWING_STEP)
        const claws: [number, number] = [9, 9], eyes: [number, number] = [9, 9]
        for (let step = 1; step <= count; step++) {
          const at = crabRoom(seen(this.x, this.z, from + ((turned - from) * step) / count), this.lift, leans, this.hatted, 0, SWING_ROOM)
          for (let i = 0; i < 2; i++) {
            // No lower than a claw goes, and no further in than an eye goes.
            claws[i] = Math.max(CLAW_DOWN, Math.min(claws[i], at.claws[i]))
            eyes[i] = Math.max(0, Math.min(eyes[i], at.eyes[i]))
          }
        }
        if (this.claws.some((claw, i) => claw.raise > claws[i] + 1e-6) || (!this.hatted && this.eyes.some((eye, i) => eye.out > eyes[i] + 1e-6))) {
          this.swingMost = { claws, eyes }
          return
        }
      }
      this.turn = turned
    }
    // On a way round something it is turned as the way was found, all along it.
    const routed = this.route.length > 0 && this.mode === 'run'
    if ((moved > 1e-4 || routed) && plan.kind !== 'home') {
      const want = routed ? this.routeTurn : sideways(movedX, movedZ)
      const turned = Math.abs(want - this.turn) < 0.03 ? want : ease(this.turn, want, routed ? 0.05 : 0.08, dt)
      swing(turned, false)
    } else if (plan.kind === 'home') {
      const turned = ease(this.turn, 0, 0.15, dt)
      swing(turned, true)
    }
    if (this.climbs > 0) {
      // Over the top and down the other side, with nothing built and no bough under it any more, it has climbed.
      const on = crabRounds(this).some((round) => (world.built?.(round.x, round.z, round.r) ?? null) !== null || (world.blocked(round.x, round.z, round.r, false, true) !== null && world.blocked(round.x, round.z, round.r, false, false) === null))
      if (on) this.climbed = true
      else if (this.climbed) this.climbs = 0
      if (this.mode === 'run') this.climbs = Math.max(0, this.climbs - dt)
    }
    // On a bough it climbs, the bough is its floor, and stays so until it is down off it.
    if (this.climbs > 0 && this.boughs) this.onBough = true
    else if (this.onBough) {
      const here = { x: this.x, z: this.z, turn: this.turn, lean: this.tilt }
      this.onBough = crabFloor(here, (x, z) => world.footing?.(x, z) ?? world.ground(x, z)) > crabFloor(here, (x, z) => world.ground(x, z)) + 0.01
    }
    const along = movedX * Math.cos(this.turn) - movedZ * Math.sin(this.turn)
    const over = looking && finger ? (finger.x > this.x ? -0.34 : 0.34) : 0
    // It leans into a run, and the sand under its feet tips it: on the side of a heap it stands as the heap slopes.
    // All told it leans no further than it does to look into a hole: its claws stay over its own legs.
    this.tip = ease(this.tip, clamp(along / Math.max(dt, 1e-3), -3, 3) * 0.09 + over, 0.06, dt)
    this.tilt = ease(this.tilt, clamp(crabTilt(this, footing), -CRAB_LEAN.run, CRAB_LEAN.run), 0.06, dt)
    this.lean = this.leaning()
    ;[this.lift, this.liftSpeed] = spring(this.lift, this.liftSpeed, 0, 220, 14, dt)
    this.stand(world)
  }

  /** The floor under a point of it: the sand, and the top of a bough only while it climbs one or is on one. */
  private footing(world: World): (x: number, z: number) => number {
    const boughs = (this.climbs > 0 && this.boughs) || this.onBough
    return (x, z) => (boughs ? world.footing?.(x, z) ?? world.ground(x, z) : world.ground(x, z))
  }

  /** It has reached the point it was making for: on to the next, or the end of the line. */
  private arrived(plan: CrabPlan, closed: boolean): void {
    this.passed = 0
    // A point of its line reached: it is not cut off.
    this.tried = 0
    this.longed = false
    this.shed = false
    if (plan.kind === 'home') {
      this.angle += 0.55
      this.sinceCircle += 0.55
      return
    }
    const next = this.at + this.way
    if (next >= 0 && next < plan.path.length) this.at = next
    else if (closed) this.at = (next + plan.path.length) % plan.path.length
    else {
      // The end of the line is the gap: it stops there, looks at it, stamps with one claw and clacks, and walks back.
      this.way = -this.way
      this.stop(plan)
      // Where a rock stopped its line short of the groove's end, or keeps it from part of a ring's bank, there is no
      // gap to stamp at: it only turns back.
      if (plan.kind === 'ring' || (plan.kind === 'groove' && !plan.ends[next < 0 ? 0 : 1])) return
      this.act = 3
      this.actTime = 0
      this.timer += 1.2
      this.snaps = 0
      this.sounds.push('stamp')
    }
  }

  private stop(plan: CrabPlan): void {
    this.mode = 'stop'
    this.stops += 1
    this.timer = CRAB_TEMPO.stop * (0.6 + this.rng.next() * 0.9)
    // By day, after a full round of its empty ring, one of its small acts.
    if (plan.kind === 'home' && this.sinceCircle > Math.PI * 2) {
      this.sinceCircle = 0
      this.act = 1 + this.variants.next() % 2
      this.actTime = 0
      this.timer += 1.2
    }
  }

  /** A stalk springs out with a bounce and is pulled in at once. */
  private eyeTarget(index: number, out: number, dt: number): void {
    const eye = this.eyes[index]
    // Under a shell it wears, its stalks stay out and hold the shell up: they are not pulled in from under it, and
    // they do not bounce up into it.
    if (this.hatted) out = 1
    const stiffness = out > 0.5 ? 260 : 900, damping = out > 0.5 ? 11 : 40
    // Two half steps: the pull-in is stiff, and one long step would overshoot it.
    for (let i = 0; i < 2; i++) [eye.out, eye.speed] = spring(eye.out, eye.speed, out, stiffness, damping, dt / 2)
    eye.out = clamp(eye.out, 0, this.hatted ? 1 : 1.4)
    // Under an arm of the starfish it stands no higher than there is room for.
    if (!this.hatted && eye.out > this.eyeMost[index]) {
      eye.out = Math.max(0, this.eyeMost[index])
      eye.speed = Math.min(0, eye.speed)
    }
    if (this.hatted && eye.out >= 1) eye.speed = Math.min(0, eye.speed)
  }
}

// --- The starfish --------------------------------------------------------------

export const STAR_TEMPO = { reach: 2.4, wobble: 0.9, rest: 3.1, roll: 1.5, climb: 0.9, drop: 0.5 } as const
/** How far it leans back where it stands up on its rock, and on the crab's back, in radians. */
export const STAR_BACK = { rock: 0.3, crab: 0.05 } as const
/** How far its seat is pressed into what it rests on: it lies on its rock, not over it. */
export const STAR_SEAT = 0.02
/** How far above the top of whatever stands in its way it leaps. */
const STAR_OVER = 0.3

export class Starfish {
  /** Where the foot of it is, in the world. */
  x: number = STAR_HOME.x
  y: number = STAR_HOME.y
  z: number = STAR_HOME.z
  /** 0 standing up on its rock, 1 spread out flat on top of something. */
  spread = 0
  /** How far it has stretched up on its two lower arm tips, 0 to 1. */
  stretch = 0
  /** Its sway as it wobbles at the top, in radians. */
  sway = 0
  /** Squash after a flop, 0 to 1, and its speed. */
  squash = 0
  private squashSpeed = 0
  /** A slow turn about its middle, in radians: its wheel across the sand, too. */
  turn = 0
  /** How far it leans back, in radians. */
  back: number = STAR_BACK.rock
  /** How far it is turned about the upright and rolled to one side: on the crab's back it turns and leans with the crab. */
  yaw = 0
  roll = 0
  /** Each arm from the top one round: how far it is curled in, 0 to 1. */
  readonly arms = [0, 0, 0, 0, 0]
  /** One arm waves: which, and how far it is swung. */
  waving = 1
  wave = 0
  /**
   * The bucket standing by the tower it lies on is a thing like any other: it lies with the gap between arm `gap`
   * and the next turned to the bucket, and those two arms parted round it, `part` of the way.
   */
  gap = -1
  part = 0
  /** How it should be turned to lie so, or null with no bucket by. */
  private lie: number | null = null
  /** Where its eyes look, each -1 to 1. */
  lookAcross = 0
  lookUp = 0.4
  blink = 0
  /** 0 a small smile, 1 a round o. */
  mouth = 0
  /** What it is on now, and what it is doing about where it should be. */
  on: 'rock' | 'tower' | 'crab' = 'rock'
  move: 'perched' | 'drop' | 'roll' | 'climb' = 'perched'
  /** The nearest it has rolled to where it is going, and how long it has come no nearer. */
  private nearest = Infinity
  private heldUp = 0
  readonly sounds: FolkSound[] = []
  private plan: StarPlan = { on: 'rock' }
  private moveTime = 0
  private from = { x: 0, y: 0, z: 0 }
  /** Where a drop comes down, and how high a leap has had to go so far. */
  private land = { x: 0, z: 0 }
  private high = 0
  private mode: 'rest' | 'reach' | 'wobble' | 'turn' | 'feel' | 'fist' = 'rest'
  private timer: number = STAR_TEMPO.rest * 0.4
  private clock = 0
  private fist = 0
  /** How much longer its start at a poke on its way lasts. */
  private start = 0
  private blinkIn = 2
  private strokeFor = 0
  private readonly variants: Variants

  constructor(private readonly rng: Rng) {
    this.variants = new Variants(3, rng)
  }

  setPlan(plan: StarPlan): void {
    if (plan !== this.plan) {
      this.nearest = Infinity
      this.heldUp = 0
    }
    this.plan = plan
  }

  /** What it means to be on. */
  get planned(): 'rock' | 'tower' | 'crab' {
    return this.plan.on
  }

  /** It is on the crab's back, or on its way down onto it: the crab keeps its eye stalks out of its way. */
  get riding(): boolean {
    return (this.on === 'crab' && this.move === 'perched') || (this.move === 'climb' && this.plan.on === 'crab')
  }

  /** Points over its skin as it now holds itself, in the world. */
  skin(): [number, number, number][] {
    return starSkin(this).map(([x, y, z]) => [this.x + x, this.y + y, this.z + z])
  }

  /** The sand it stands over. On its rock it stands over none: the rock is its own. */
  rounds(): Patch[] {
    // The rounds that hold it however it wheels, and the sand each arm is over as it is now: leaning with the crab
    // it rides, or spread out flat.
    return [...starRounds(this), ...starLies(this)]
  }

  /**
   * The bucket where it is within reach of the arms of a starfish on the tower this one lies on or leaps onto, or
   * null: no further off than an arm's length and the bow of its handle, so a bucket out on the crab's bank is left be.
   */
  private bucketBy(world: World): Pillar | null {
    const plan = this.plan
    if (plan.on !== 'tower' || !(this.move === 'climb' || (this.move === 'perched' && this.on === 'tower'))) return null
    const bucket = world.bucket?.() ?? null
    if (!bucket || Math.hypot(bucket.x - plan.x, bucket.z - plan.z) > STAR_REACH + bucket.r - 0.01 || bucket.top < world.ground(plan.x, plan.z)) return null
    return bucket
  }

  /** How high its foot rests where it is, as it is: on the sand, or on a rock that stands there. */
  private rest(world: World): number {
    const under = world.support ?? world.ground
    return restOn(starParts(this), (x, z) => under(this.x + x, this.z + z)) - STAR_SEAT
  }

  /** Where it stands on the crab's back: on its two lower arm tips, behind the eye stalks, turned and leaning with the crab. */
  private onCrab(crab: Crab): { x: number; y: number; z: number } {
    // In the crab's own frame it stands upright and square to it.
    const parts = starParts({ ...this, arms: this.arms, yaw: 0, roll: 0 })
    const up = restOn(parts, (x, z) => shellTop(RIDE_AT.x + x, RIDE_AT.z + z, crab.lift)) - STAR_SEAT
    // The crab leans about the way it faces, and then turns about the upright.
    const lx = RIDE_AT.x * Math.cos(crab.lean) - up * Math.sin(crab.lean), ly = RIDE_AT.x * Math.sin(crab.lean) + up * Math.cos(crab.lean), lz = RIDE_AT.z
    return {
      x: crab.x + lx * Math.cos(crab.turn) + lz * Math.sin(crab.turn),
      y: crab.floor + crab.lift * 0.35 + ly,
      z: crab.z - lx * Math.sin(crab.turn) + lz * Math.cos(crab.turn),
    }
  }

  /** Where its plan puts it: the top of its rock, of the tower, or of the crab. */
  private goal(crab: Crab, world: World): { x: number; y: number; z: number } {
    const plan = this.plan
    if (plan.on === 'tower') return { x: plan.x, y: world.ground(plan.x, plan.z), z: plan.z }
    if (plan.on === 'crab') return this.onCrab(crab)
    return { x: STAR_HOME.x, y: STAR_HOME.y, z: STAR_HOME.z }
  }

  /** How it holds itself on what it is on, or is going onto. */
  private poseFor(on: 'rock' | 'tower' | 'crab', crab: Crab): { spread: number; back: number; yaw: number; roll: number } {
    if (on === 'tower') return { spread: 1, back: STAR_BACK.rock, yaw: 0, roll: 0 }
    if (on === 'crab') return { spread: 0, back: STAR_BACK.crab, yaw: crab.turn, roll: crab.lean }
    return { spread: 0, back: STAR_BACK.rock, yaw: 0, roll: 0 }
  }

  /** At its place at once, as a load or the end of a scene leaves it. */
  settle(crab: Crab, world: World): void {
    this.on = this.plan.on
    this.move = 'perched'
    const pose = this.poseFor(this.on, crab)
    this.spread = pose.spread
    this.back = pose.back
    this.yaw = pose.yaw
    this.roll = pose.roll
    this.stretch = this.on === 'crab' ? 1 : 0
    this.turn = 0
    this.sway = 0
    this.squash = 0
    this.squashSpeed = 0
    this.start = 0
    this.arms.fill(0)
    this.mode = 'rest'
    this.timer = STAR_TEMPO.rest * 0.5
    // Beside the bucket it is found as it would have come to lie: the gap turned to it, the two arms parted.
    this.gap = -1
    this.part = 0
    this.lie = null
    const by = this.bucketBy(world)
    if (by && this.plan.on === 'tower') {
      const lie = starGap(this.plan, 0, -1, by)
      this.gap = lie.gap
      this.turn = lie.turn
      this.lie = lie.turn
      this.part = starPartFor(Math.hypot(by.x - this.plan.x, by.z - this.plan.z))
    }
    const goal = this.goal(crab, world)
    this.x = goal.x
    this.z = goal.z
    this.y = this.on === 'crab' ? goal.y : this.rest(world)
  }

  /** It rests on what is under it where it is, as a visit finds it. */
  seat(world: World): void {
    if (this.move === 'perched' && this.on !== 'crab') this.y = this.rest(world)
  }

  /**
   * A finger on the starfish: it shuts its eyes, curls into a fist and opens one arm at a time. Poked while it
   * drops, wheels or leaps it cannot curl: it starts instead, flattened and sprung back with its eyes shut and
   * its mouth round, and goes on its way.
   */
  poke(): void {
    this.sounds.push('squeak')
    if (this.move !== 'perched') {
      this.start = STAR_START.lasts
      this.squashSpeed = STAR_START.kick
      return
    }
    this.mode = 'fist'
    this.fist = 0
  }

  step(dt: number, world: World, crab: Crab, also: readonly Patch[] = []): void {
    const finger = world.finger
    this.clock += dt
    this.timer -= dt
    this.strokeFor = finger && finger.digging ? this.strokeFor + dt : 0
    const onCrab = this.on === 'crab' && this.move === 'perched'
    let stretch = 0, turnTo = this.turn, feel = 0
    this.start = Math.max(0, this.start - dt)
    if (this.mode === 'fist') {
      this.fist += dt
      for (let i = 0; i < 5; i++) {
        const opensAt = 0.6 + i * 0.17
        // On the crab's back it stands on its two lower arms, and those it keeps under it.
        const curls = !(onCrab && (i === 2 || i === 3)) && this.move === 'perched'
        // Its face shuts first: the arms begin to curl a moment after the lids are down and the mouth is shut.
        this.arms[i] = curls && this.fist >= FIST_AFTER && this.fist < opensAt ? ease(this.arms[i], 1, 0.03, dt) : ease(this.arms[i], 0, 0.06, dt)
      }
      // Shut while its arms are over it; open in a gasp once the last arm is off its face.
      this.mouth = this.fist > FIST_AFTER && Math.max(...this.arms) < FACE_CLEAR ? ease(this.mouth, 1, 0.05, dt) : 0
      if (this.fist > 1.8) {
        this.mode = 'rest'
        this.timer = 1.5
      }
    } else {
      // At rest its arms breathe one after another, never together.
      for (let i = 0; i < 5; i++) this.arms[i] = ease(this.arms[i], 0.08 * Math.max(0, Math.sin(this.clock * 0.9 - i * 1.26)), 0.1, dt)
      this.mouth = this.start > 0 ? 1 : ease(this.mouth, this.mode === 'wobble' || this.move === 'drop' ? 1 : 0, 0.08, dt)
      // Its day want, the reach and the flop, is shown on its rock only; elsewhere it feels about with one arm.
      const onRock = this.on === 'rock' && this.move === 'perched'
      if (this.mode === 'rest' && this.timer <= 0 && this.move === 'perched') {
        const pick = onRock ? this.variants.next() : 2
        this.mode = pick === 0 ? 'reach' : pick === 1 ? 'turn' : 'feel'
        this.timer = pick === 0 ? STAR_TEMPO.reach : pick === 1 ? 2.0 : 1.4
      } else if (this.mode === 'reach') {
        stretch = smooth(1 - this.timer / STAR_TEMPO.reach)
        if (this.timer <= 0) {
          this.mode = 'wobble'
          this.timer = STAR_TEMPO.wobble
        }
      } else if (this.mode === 'wobble') {
        stretch = 1
        this.sway = Math.sin(this.clock * 13) * 0.16 * (1 - this.timer / STAR_TEMPO.wobble)
        if (this.timer <= 0) {
          // The flop: all at once, with a slap.
          this.mode = 'rest'
          this.timer = STAR_TEMPO.rest * (0.7 + this.rng.next() * 0.7)
          this.squashSpeed = 9
          this.sounds.push('plop')
        }
      } else if (this.mode === 'turn') {
        stretch = 0.45 * Math.sin(clamp(1 - this.timer / 2.0, 0, 1) * Math.PI)
        turnTo = this.turn + dt * 0.63
        if (this.timer <= 0) {
          this.mode = 'rest'
          this.timer = STAR_TEMPO.rest * (0.6 + this.rng.next() * 0.6)
        }
      } else if (this.mode === 'feel') {
        // One upper arm swings out and back, twice, feeling for what it is on. It swings in its own flat: never in over its face.
        feel = Math.abs(Math.sin((1.4 - this.timer) * 4.5))
        if (this.timer <= 0) {
          this.mode = 'rest'
          this.timer = STAR_TEMPO.rest * (0.6 + this.rng.next() * 0.6)
        }
      }
    }
    // The bucket by its tower: it turns the nearest gap between its arms to the bucket and parts the two arms
    // beside the gap, and it feels about and waves with an arm on its other side.
    const by = this.bucketBy(world), plan = this.plan
    this.lie = null
    if (by && plan.on === 'tower') {
      const lie = starGap(plan, this.turn, this.gap, by)
      this.gap = lie.gap
      this.lie = lie.turn
      turnTo = ease(this.turn, lie.turn, 0.08, dt)
    }
    this.part = ease(this.part, by && plan.on === 'tower' ? starPartFor(Math.hypot(by.x - plan.x, by.z - plan.z)) : 0, 0.08, dt)
    if (!by && this.part < 0.01) this.gap = -1
    const parted = this.gap >= 0
    if (this.mode !== 'wobble') this.sway = ease(this.sway, 0, 0.08, dt)
    // On the crab's back it stands stretched up on its two lower arm tips, like legs.
    if (this.riding) this.stretch = ease(this.stretch, 1, 0.06, dt)
    else this.stretch = this.mode === 'rest' || this.mode === 'fist' || this.move !== 'perched' ? ease(this.stretch, 0, 0.035, dt) : stretch
    if (this.move === 'perched') this.turn = turnTo
    ;[this.squash, this.squashSpeed] = spring(this.squash, this.squashSpeed, 0, 160, 9, dt)
    // A long stroke on the sand: one arm waves in time with it.
    const waving = this.strokeFor > 0.6 && this.mode !== 'fist'
    // The sun on its way: its eyes go up to it and come down with it, and from its rock one arm goes up after it,
    // higher the lower the sun is, and sways there.
    const sun = !finger && this.plan.on === 'rock' ? world.sun ?? null : null
    const toSun = sun && this.on === 'rock' && this.move === 'perched' && (this.mode === 'rest' || this.mode === 'turn') ? SUN_LOOK.arm + (1 - SUN_LOOK.arm - SUN_LOOK.sway) * sun.low + SUN_LOOK.sway * Math.sin(this.clock * 2.4) : 0
    const waves = parted ? (this.gap + 3) % 5 : 1
    if (this.mode === 'feel') this.waving = parted ? waves : 4
    else if (Math.abs(this.wave) < 0.02) this.waving = waves
    this.wave = ease(this.wave, this.mode === 'feel' ? feel * 1.1 : waving && this.waving === waves ? Math.sin(this.strokeFor * 9) : this.waving === waves ? toSun : 0, toSun ? 0.12 : 0.05, dt)
    this.lookAcross = ease(this.lookAcross, finger ? clamp((finger.x - this.x) * 0.22, -1, 1) : sun ? sunAcross(sun, this.x) : Math.sin(this.clock * 0.31) * 0.5, 0.08, dt)
    this.lookUp = ease(this.lookUp, finger ? clamp((this.z - finger.z) * 0.2, -1, 1) : sun ? 1 - SUN_LOOK.drop * sun.low : this.mode === 'reach' || this.mode === 'wobble' ? 1 : 0.2, 0.08, dt)
    this.blinkIn -= dt
    if (this.blinkIn <= 0) this.blinkIn = 2.2 + this.rng.next() * 2.6
    // In a fist its eyes are shut from the first frame until the last arm has opened again: the arms curl in over shut lids.
    this.blink = this.blinkIn < 0.13 || (this.mode === 'fist' && this.fist < FIST_SHUT) || this.start > 0 ? 1 : 0
    // Where it is comes last: it rests on what is under it as it now holds itself.
    this.travel(dt, world, crab, also)
  }

  /**
   * Getting to where it should be: it lets go and drops with a slap, wheels
   * across the sand one arm at a time, leaps up and flops out on top. A leap
   * goes straight up, across over the top of whatever stands between, and
   * straight down.
   */
  private travel(dt: number, world: World, crab: Crab, also: readonly Patch[]): void {
    const goal = this.goal(crab, world)
    if (this.move === 'perched') {
      const there = this.on === this.plan.on && (this.on === 'crab' || Math.hypot(goal.x - this.x, goal.z - this.z) < (this.on === 'tower' ? 0.3 : 3))
      if (there) {
        const pose = this.poseFor(this.on, crab)
        this.spread = ease(this.spread, pose.spread, 0.12, dt)
        this.back = ease(this.back, pose.back, 0.12, dt)
        if (this.on === 'crab') {
          // It rides the crab as it walks, turning and leaning with it.
          this.yaw = pose.yaw
          this.roll = pose.roll
          this.x = goal.x
          this.y = goal.y
          this.z = goal.z
          return
        }
        this.yaw = 0
        this.roll = 0
        // On its rock it stays where it is; on a tower it keeps to the top as the tower is patted lower.
        if (this.on === 'tower') {
          this.x = goal.x
          this.z = goal.z
        }
        this.y = this.rest(world)
        return
      }
      // Something higher than where it is, or what it was on is gone: it lets go.
      this.move = 'drop'
      this.nearest = Infinity
      this.heldUp = 0
      this.moveTime = 0
      this.mode = 'rest'
      this.from = { x: this.x, y: this.y, z: this.z }
      this.high = this.y
      this.land = this.landing(goal, world, also)
      return
    }
    this.moveTime += dt
    const pillars = world.pillars?.({ kind: 'starfish' }) ?? []
    if (this.move === 'drop') {
      // Off toward where it is going, clear of what it was on, and down onto the sand.
      const t = clamp(this.moveTime / STAR_TEMPO.drop, 0, 1)
      this.spread = ease(this.spread, 0.2, 0.05, dt)
      this.back = ease(this.back, STAR_BACK.rock, 0.05, dt)
      this.yaw = ease(this.yaw, 0, 0.05, dt)
      this.roll = ease(this.roll, 0, 0.05, dt)
      this.leap(t, this.land.x, this.land.z, null, 0.25, world, pillars)
      if (t >= 1) {
        this.yaw = 0
        this.roll = 0
        this.squashSpeed = 10
        this.sounds.push('drop')
        this.move = 'roll'
        this.moveTime = 0
      }
      return
    }
    if (this.move === 'roll') {
      // One arm at a time: each arm that comes down carries it a little further, and between arms it barely moves.
      const pace = STAR_TEMPO.roll * (0.35 + 0.65 * Math.abs(Math.sin(this.moveTime * 4.2)))
      const foot = this.plan.on === 'rock' ? 1.9 : 0.95
      const gap = Math.hypot(goal.x - this.x, goal.z - this.z)
      // The crab it comes right up to, a hand's width from its legs; the others it leaps onto from a body's length off.
      const near = this.plan.on === 'crab' ? apart(this.rounds(), crabRounds(crab)) < 0.3 : gap <= foot
      // Held up for a while by something it cannot get round, it leaps from where it is.
      if (gap < this.nearest - 0.05) {
        this.nearest = gap
        this.heldUp = 0
      } else this.heldUp += dt
      if (near || this.heldUp > 1.6) {
        this.nearest = Infinity
        this.heldUp = 0
        this.move = 'climb'
        this.moveTime = 0
        this.from = { x: this.x, y: this.y, z: this.z }
        this.high = this.y
        return
      }
      const step = stepToward(this.x, this.z, goal.x, goal.z, pace * dt, (x, z) => starRounds({ x, z, yaw: 0 }), world, true, also)
      this.x += step.dx
      this.z += step.dz
      this.turn -= (Math.hypot(step.dx, step.dz) / 0.62) * Math.sign(step.dx || 1)
      this.spread = ease(this.spread, 0.1, 0.1, dt)
      this.back = ease(this.back, STAR_BACK.rock, 0.1, dt)
      this.yaw = 0
      this.roll = 0
      // It wheels on its arm tips: its foot is as high as the arm that is down needs it.
      this.y = this.rest(world)
      return
    }
    // The leap, and the flop out on top. On its way across it comes to hold itself as it will where it lands.
    const t = clamp(this.moveTime / STAR_TEMPO.climb, 0, 1)
    const pose = this.poseFor(this.plan.on, crab), across = smooth(clamp((t - LEAP_UP) / (LEAP_DOWN - LEAP_UP), 0, 1))
    // It goes up as it stood, and opens out flat only once it is up: beside a bucket no arm swings down into it.
    if (t >= LEAP_UP) {
      this.spread = ease(this.spread, pose.spread, 0.08, dt)
      this.back = ease(this.back, pose.back, 0.08, dt)
    }
    this.yaw = pose.yaw * across
    this.roll = pose.roll * across
    // Its wheel comes round to upright, the nearest way: or, with the bucket by the tower, to how it will lie beside it.
    this.turn = ease(this.turn, this.lie ?? Math.round(this.turn / (Math.PI * 2)) * Math.PI * 2, 0.07, dt)
    // The further it has to go, the higher the leap.
    const far = Math.hypot(goal.x - this.from.x, goal.z - this.from.z)
    this.leap(t, goal.x, goal.z, this.plan.on === 'crab' ? goal.y : null, 0.25 + 0.5 * Math.max(0, far - 1.3), world, pillars)
    if (t >= 1) {
      this.on = this.plan.on
      this.move = 'perched'
      this.turn = this.lie ?? 0
      this.yaw = pose.yaw
      this.roll = pose.roll
      this.squashSpeed = 9
      this.sounds.push('plop')
      this.timer = STAR_TEMPO.rest * 0.6
    }
  }

  /**
   * One leap, `t` of the way through: straight up from where it was, across to a place over the top of whatever
   * stands between, and straight down onto it. `toY` is how high its foot comes down, where that is not the
   * sand or the rock under it.
   */
  private leap(t: number, toX: number, toZ: number, toY: number | null, rise: number, world: World, pillars: readonly Pillar[]): void {
    const across = smooth(clamp((t - LEAP_UP) / (LEAP_DOWN - LEAP_UP), 0, 1))
    this.x = this.from.x + (toX - this.from.x) * across
    this.z = this.from.z + (toZ - this.from.z) * across
    const rest = toY ?? this.rest(world)
    if (t < LEAP_DOWN) {
      // As high as the leap is, and over whatever its arms have come up to.
      const floor = Math.max(this.from.y, rest) + rise
      const clear = over(this.rounds(), floor, STAR_OVER, pillars)
      const up = t < LEAP_UP ? this.from.y + (clear - this.from.y) * smooth(t / LEAP_UP) : clear
      // It never comes down while it is on its way across.
      this.high = t < LEAP_UP ? up : Math.max(this.high, up)
      this.y = Math.max(this.high, toY === null ? rest : -Infinity)
      return
    }
    const down = smooth((t - LEAP_DOWN) / (1 - LEAP_DOWN))
    this.y = Math.max(rest, this.high + (rest - this.high) * down)
  }

  /** Where a drop comes down: toward where it is going, a body's width clear of what it was on, on sand that nothing stands on. */
  private landing(goal: { x: number; z: number }, world: World, also: readonly Patch[]): { x: number; z: number } {
    const gap = Math.hypot(goal.x - this.x, goal.z - this.z) || 1
    const toward = Math.atan2(goal.z - this.z, goal.x - this.x)
    const first = this.on === 'rock' ? 2.6 : this.on === 'crab' ? 2.6 : 1.6
    for (const out of [first, first + 0.5, first + 1.0, first + 1.6]) {
      for (const swing of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
        const far = swing === 0 && out === first ? Math.min(out, gap) : out
        const x = this.x + Math.cos(toward + swing) * far, z = this.z + Math.sin(toward + swing) * far
        if (!inWay(starRounds({ x, z, yaw: 0 }), world, true, also)) return { x, z }
      }
    }
    return { x: this.x + Math.cos(toward) * first, z: this.z + Math.sin(toward) * first }
  }
}

/** How far curled in an arm may be while its mouth is open: less than the picture's own measure of an arm over its face. */
const FACE_CLEAR = 0.06
/** Its start at a poke while it is on its way: how long its eyes are shut, and how hard it is flattened. */
export const STAR_START = { lasts: 0.4, kick: 8 }
/** How long after its eyes shut the arms begin to curl in. */
export const FIST_AFTER = 0.08
/** How long its eyes stay shut in a fist: until the last arm is open. */
export const FIST_SHUT = 1.55
/** The shares of a leap at which it has gone straight up, and at which it starts straight down. */
const LEAP_UP = 0.22
const LEAP_DOWN = 0.74

// --- The eel -------------------------------------------------------------------

/** How much longer than the straight way a way round may be before it is no step round: so many times it, or so much more. */
export const CRAB_ROUND = { times: 3, more: 3 } as const
/** How long a way is, from where it starts through each of its corners. */
function wayLength(x: number, z: number, way: readonly { x: number; z: number }[]): number {
  let length = 0, px = x, pz = z
  for (const corner of way) {
    length += Math.hypot(corner.x - px, corner.z - pz)
    px = corner.x
    pz = corner.z
  }
  return length
}

export const EEL_TEMPO = { slide: 0.34, still: 2.3, away: 0.95, swim: 9, under: 1.1 } as const

/** The eel's head and neck as rounds along the way it faces: how far along from its middle, and how wide. */
/** How far the eel's head is pushed forward when it pokes its nose at something. */
export const EEL_NOSE = 0.28
export { EEL_BODY }
/**
 * How far it ducks to go under driftwood laid across its groove: right under the water. The bough rests on the
 * banks with its underside level with them, and the eel's fin stands 0.57 over the middle of its head, which is
 * more than the water of a groove 0.26 deep has room for: it cannot pass with its eyes out.
 */
export const EEL_UNDER = 1
/** How much room it keeps in hand to get under in time. */
const EEL_ROOM = 0.4

/** How far the crab's legs and claws reach from its middle as it swings round: the far corner of its reach. */
const CRAB_SWEEP = 1.8
/** How fast it turns, in radians a second, when it swings. */
const CRAB_SWINGS_FAST = 1.5
/** How far a point on the sand is from the crab: its legs reach out to either side, its claws to the front. */
export function crabReach(crab: { x: number; z: number; turn: number }, x: number, z: number): number {
  const dx = x - crab.x, dz = z - crab.z
  const across = dx * Math.cos(crab.turn) - dz * Math.sin(crab.turn), front = dx * Math.sin(crab.turn) + dz * Math.cos(crab.turn)
  return Math.hypot(Math.max(0, Math.abs(across) - 1.55), Math.max(0, front - 0.9, -0.7 - front))
}

/**
 * Whether anything of the eel is drawn: all the way inside its rock, right under the water, or under the driftwood
 * that lies across its groove, nothing is. The view draws it by this, a touch finds it by this, and it makes no
 * sound of its own while this is false.
 */
export function eelShown(eel: { where: 'rock' | 'groove'; out: number; dip: number; under: boolean }): boolean {
  return eel.where === 'rock' ? eel.out > 0.02 : eel.dip < 0.97 && !eel.under
}

export class Eel {
  /** Where it is: threading its rock, or in a groove with water in it. */
  where: 'rock' | 'groove' = 'rock'
  /** At its rock: which way out it is at, and how far its head is out, 0 to 1. */
  hole = 0
  out = 0
  /** Its head in the world, where it is turned about the upright, and how far its nose is tipped up. */
  x: number = EEL_HOLES[0].x
  y: number = EEL_HOLES[0].y
  z: number = EEL_HOLES[0].z - 1
  yaw = 0
  pitch = 0
  /** In a groove: how far it is ducked under, 0 up to 1 right under the water. */
  dip = 0
  /** In a groove: it is under the driftwood that lies across. */
  under = false
  /** In a groove: how far it has gone down under what stands or floats over it. */
  private ducked = 0
  /** In a groove: how fast it goes, and whether it has to turn about, which it does under the water. */
  private vx = 0
  /** How the crab was turned a frame ago, and how long ago it was last seen swinging round. */
  private crabTurned = 0
  private crabSwung = 0
  private vz = 0
  private turning = false
  /** Its nose pushed forward at something, 0 to 1. */
  nose = 0
  /** Where its eyes look, each -1 to 1. They are all that moves while it is still. */
  lookAcross = 0
  lookUp = 0
  /** Each eye shut, 0 or 1. */
  readonly shut = [0, 0]
  /** 0 shut, 1 a wide yawn. */
  mouth = 0
  readonly sounds: FolkSound[] = []
  private plan: EelPlan = { kind: 'rock' }
  private mode: 'in' | 'slideOut' | 'still' | 'slideIn' | 'hiding' | 'peek' = 'in'
  private swim: 'rise' | 'still' | 'slide' | 'under' | 'sniff' | 'duck' | 'peek' | 'sink' = 'still'
  private timer = 0.6
  private reach = 1
  private eyeIn = 0
  private yawning = false
  /** In a groove: where along its line it is, where the slide began and where it ends. */
  private at = 0
  private from = 0
  private to = 0
  private slideFor = 1
  /** A sound it has yet to make: it makes it when something of it is drawn, and not at all if nothing is in time. */
  private owed: 'swish' | 'bloop' | 'sniff' | null = null
  private readonly variants: Variants

  constructor(private readonly rng: Rng) {
    this.variants = new Variants(3, rng)
  }

  setPlan(plan: EelPlan): void {
    const before = this.plan
    if (plan === before) return
    this.plan = plan
    if (this.where !== 'groove') return
    if (plan.kind === 'groove') {
      // The same water, reshaped: it carries on from the nearest point of the new line, if that is near.
      let nearest = 0
      plan.path.forEach((point, index) => {
        if (Math.hypot(point.x - this.x, point.z - this.z) < Math.hypot(plan.path[nearest].x - this.x, plan.path[nearest].z - this.z)) nearest = index
      })
      if (Math.hypot(plan.path[nearest].x - this.x, plan.path[nearest].z - this.z) < 1.2) {
        this.at = nearest
        if (this.swim === 'slide' || this.swim === 'under' || this.swim === 'sniff') {
          this.swim = 'still'
          this.timer = 0.6
          this.under = false
        }
        return
      }
    }
    // Its water is gone from under it: down it goes, and it comes up where its plan now puts it.
    if (before !== plan && this.swim !== 'sink') {
      this.swim = 'sink'
      this.timer = 0.3
      this.under = false
    }
  }

  /** At its place at once, as a load or the end of a scene leaves it. */
  settle(world: World, crab?: { x: number; z: number; turn: number }): void {
    const plan = this.plan
    this.under = false
    this.nose = 0
    this.turning = false
    this.vx = 0
    this.vz = 0
    this.ducked = 0
    if (plan.kind === 'groove') {
      this.where = 'groove'
      // Where the scene leaves it: at the far end of its water, or just through the dark way, on the side where
      // the water is long enough for it to be up, the whole of its neck out from under the wood, facing away from it.
      const last = plan.path.length - 1, bridge = plan.bridge
      if (bridge === null) this.at = last
      else {
        this.at = plan.rests[1] ?? plan.rests[0] ?? last
        this.from = bridge
        this.to = this.at
      }
      this.owed = null
      this.swim = 'still'
      this.timer = EEL_TEMPO.still * 0.6
      this.dip = 0
    } else {
      this.where = 'rock'
      this.mode = 'in'
      this.timer = 0.6
      this.out = 0
    }
    this.pose(world, 0)
    // Found under the water where the crab stands over it, a shell lies in it, or the bucket or a bough lies over it.
    if (this.where === 'groove' && (this.meets(world, crab) || this.lain(world))) {
      this.dip = 1
      this.ducked = 1
      this.pose(world, 0)
    }
  }

  /** A finger on the eel: it shoots back into its hole, or under its water, and looks out with one eye. */
  poke(): void {
    // A finger finds it only where it is drawn. Inside its rock or under its water there is nothing to poke,
    // and it makes no sound.
    if (!eelShown(this)) return
    if (this.where === 'rock') this.mode = 'hiding'
    else {
      this.swim = 'duck'
      this.under = false
    }
    this.timer = 0.9
    this.sounds.push('bloop')
  }

  /** Whether any of it, from its nose to the end of its neck, is about to be under the crab or a shell. */
  private meets(world: World, crab?: { x: number; z: number; turn: number; swings?: boolean }): boolean {
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw)
    // Where the crab's way turns back on itself it swings right round, its legs sweeping a full circle: while it
    // means to swing, and while it swings, the whole of that circle is over the eel's water. It does not begin to
    // swing while the eel is up in that circle.
    const swings = crab !== undefined && (crab.swings === true || this.crabSwung > 0)
    // Where it is, and where it will be by the time it could be under: it slides fast.
    for (const ahead of [0, 0.06, 0.12]) {
      for (const [along, r] of EEL_BODY) {
        const x = this.x + this.vx * ahead + fx * along, z = this.z + this.vz * ahead + fz * along
        if (world.shellOver?.(x, z, r + EEL_ROOM) === true) return true
        if (world.bucketOver?.(x, z, r + EEL_ROOM) === true) return true
        if (crab && (swings ? Math.hypot(x - crab.x, z - crab.z) - CRAB_SWEEP : crabReach(crab, x, z)) < r + EEL_ROOM) return true
      }
    }
    return false
  }

  /** Whether the bucket, a bough or a rock lies over any of it, from its nose to the end of its neck. */
  private lain(world: World): boolean {
    // Sniffing, its head is pushed forward as far as its nose goes.
    const push = this.swim === 'sniff' ? EEL_NOSE : 0
    // The bough that lies across its groove is its own: it lies still, and where the eel has stopped beside it,
    // it comes up as soon as the whole of it, as far back as its neck is drawn, is out from under the bough
    // itself. Sliding up to it or away from it, and for anything else that lies by its water, another bough
    // too, it keeps clear by the whole patch (`eelUnder` in plan.ts).
    const plan = this.plan, bridge = plan.kind === 'groove' && plan.bridge !== null && this.swim !== 'slide' ? plan.path[plan.bridge] : null
    // Where it is, and where it will be by the time it could be under: it slides fast.
    return [0, 0.06, 0.12].some((ahead) => eelUnder(this.x + this.vx * ahead, this.z + this.vz * ahead, this.yaw, (x, z, r) => world.blocked(x, z, r, false), bridge, push))
  }

  /** Up in the water within the sweep of the crab's legs: the crab does not swing right round until it is under. */
  upUnder(crab: { x: number; z: number }): boolean {
    if (this.where !== 'groove' || this.dip >= 0.97) return false
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw)
    return EEL_BODY.some(([along, r]) => Math.hypot(this.x + fx * along - crab.x, this.z + fz * along - crab.z) - CRAB_SWEEP < r + EEL_ROOM)
  }

  step(dt: number, world: World, crab?: { x: number; z: number; turn: number; swings?: boolean }): void {
    if (crab) {
      this.crabSwung = dt > 0 && Math.abs(crab.turn - this.crabTurned) > CRAB_SWINGS_FAST * dt ? 0.3 : Math.max(0, this.crabSwung - dt)
      this.crabTurned = crab.turn
    }
    // It waits where it is until it is under, and only then turns about and goes.
    if (!(this.where === 'groove' && this.turning && this.dip < 0.97)) this.timer -= dt
    const was = this.where === 'groove' ? this.dip : 0
    if (this.where === 'rock') this.thread(dt)
    else this.swimming(dt)
    // Swimming where the crab stands over the groove, where a shell lies in it or on its edge, or where the bucket
    // or wood afloat lies in it, it goes right under the water before any of it is under them, and comes up beyond.
    // Wood it means to go under is its own business. Wood it sniffs at it does not touch: where the wood lies
    // within reach of its nose it stays under, and pokes its nose at it there unseen and unheard.
    if (this.where === 'groove' && dt > 0) {
      const own = this.swim === 'under'
      const over = this.turning || this.meets(world, crab) || (!own && this.lain(world))
      // As far under as it already is, it does not come up into them.
      this.ducked = over ? ease(Math.max(this.ducked, was), 1, 0.015, dt) : ease(this.ducked, 0, 0.015, dt)
      if (over) this.dip = Math.max(this.dip, this.ducked)
    } else this.ducked = 0
    const fromX = this.x, fromZ = this.z, inGroove = this.where === 'groove'
    this.pose(world, dt)
    // No sound without sight: the swish of a slide, the sniff at driftwood and the bloop of its coming up sound in
    // the first frame in which something of it is drawn, and are never made if the slide, the sniffing or the rise
    // is over before that.
    if (this.owed !== null) {
      if (this.where !== 'groove' || this.swim !== (this.owed === 'swish' ? 'slide' : this.owed === 'sniff' ? 'sniff' : 'rise')) this.owed = null
      else if (eelShown(this)) {
        this.sounds.push(this.owed)
        this.owed = null
      }
    }
    this.vx = inGroove && this.where === 'groove' && dt > 0 ? (this.x - fromX) / dt : 0
    this.vz = inGroove && this.where === 'groove' && dt > 0 ? (this.z - fromZ) / dt : 0
    // Stock still: the eyes jump from place to place and nothing else moves. A finger on the glass holds them.
    this.eyeIn -= dt
    const finger = world.finger, sun = this.plan.kind === 'rock' ? world.sun ?? null : null
    if (finger) {
      this.lookAcross = clamp((finger.x - this.x) * 0.25, -1, 1)
      this.lookUp = clamp((this.z - finger.z) * 0.25, -1, 1)
    } else if (sun) {
      // The sun on its way holds them too: up at it, and down with it.
      this.lookAcross = sunAcross(sun, this.x)
      this.lookUp = 1 - SUN_LOOK.drop * sun.low
    } else if (this.eyeIn <= 0) {
      this.eyeIn = 0.45 + this.rng.next() * 0.5
      this.lookAcross = this.rng.next() * 2 - 1
      this.lookUp = this.rng.next() * 1.2 - 0.6
    }
  }

  /** Its day want: in one side of its rock and out the other, again and again. */
  private thread(dt: number): void {
    if (this.mode === 'in') {
      this.out = 0
      if (this.timer <= 0) {
        const plan = this.plan
        if (plan.kind === 'groove') {
          // Water with a way in: it leaves its rock and comes up at the sea end of the groove, or where it comes
          // up beside the bough that lies across it.
          this.where = 'groove'
          this.rises(plan)
          this.swim = 'rise'
          this.dip = 1
          this.timer = 0.45
          // Its bloop comes as it comes up.
          this.owed = 'bloop'
          return
        }
        this.hole = 1 - this.hole
        const pick = this.variants.next()
        this.reach = pick === 1 ? 0.42 : 1
        this.yawning = pick === 2
        this.mode = 'slideOut'
        this.timer = EEL_TEMPO.slide
      }
    } else if (this.mode === 'slideOut') {
      // One long slide with a little overshoot at its end.
      const t = clamp(1 - this.timer / EEL_TEMPO.slide, 0, 1)
      this.out = this.reach * (1 - Math.pow(1 - t, 3)) * (1 + 0.12 * Math.sin(t * Math.PI))
      if (this.timer <= 0) {
        this.mode = 'still'
        this.timer = EEL_TEMPO.still * (0.7 + this.rng.next() * 0.6)
      }
    } else if (this.mode === 'still') {
      this.out = this.reach
      this.mouth = ease(this.mouth, this.yawning && this.timer > 0.5 && this.timer < 1.4 ? 1 : 0, 0.07, dt)
      if (this.timer <= 0 || this.plan.kind === 'groove') {
        this.mode = 'slideIn'
        this.timer = EEL_TEMPO.slide * 0.9
      }
    } else if (this.mode === 'slideIn') {
      const t = clamp(1 - this.timer / (EEL_TEMPO.slide * 0.9), 0, 1)
      this.out = this.reach * (1 - t * t)
      this.mouth = 0
      if (this.timer <= 0) {
        this.mode = 'in'
        this.timer = EEL_TEMPO.away * (0.7 + this.rng.next() * 0.5)
      }
    } else if (this.mode === 'hiding') {
      this.out = ease(this.out, 0, 0.025, dt)
      this.mouth = 0
      if (this.timer <= 0) {
        this.mode = 'peek'
        this.timer = 1.5
      }
    } else {
      this.out = ease(this.out, 0.3, 0.07, dt)
      if (this.timer <= 0) {
        this.mode = 'slideIn'
        this.reach = this.out
        this.timer = EEL_TEMPO.slide * 0.9
      }
    }
    this.shut[0] = this.mode === 'peek' ? 1 : 0
    this.shut[1] = 0
    this.dip = 0
    this.nose = 0
  }

  /** Its evening: a groove with water in it, and under the driftwood if any lies across. */
  private swimming(dt: number): void {
    const plan = this.plan
    const last = plan.kind === 'groove' ? plan.path.length - 1 : 0
    const dark = plan.kind === 'groove' && plan.bridge !== null
    let shut = 0, oneEye = 0
    if (this.swim === 'rise') {
      this.dip = ease(this.dip, 0, 0.08, dt)
      if (this.timer <= 0) {
        this.swim = 'still'
        this.timer = 0.7
      }
    } else if (this.swim === 'sink') {
      this.dip = ease(this.dip, 1, 0.06, dt)
      if (this.timer <= 0) {
        if (plan.kind === 'groove') {
          this.rises(plan)
          this.swim = 'rise'
          this.timer = 0.45
        } else {
          this.where = 'rock'
          this.mode = 'in'
          this.timer = EEL_TEMPO.away
          this.out = 0
        }
      }
    } else if (this.swim === 'duck') {
      this.dip = ease(this.dip, 1, 0.025, dt)
      if (this.timer <= 0) {
        this.swim = 'peek'
        this.timer = 1.5
      }
    } else if (this.swim === 'peek') {
      this.dip = ease(this.dip, 0.55, 0.07, dt)
      oneEye = 1
      if (this.timer <= 0) {
        this.swim = 'still'
        this.timer = 0.8
      }
    } else if (plan.kind !== 'groove') {
      this.swim = 'sink'
      this.timer = 0.3
    } else if (this.swim === 'still') {
      this.dip = ease(this.dip, 0, 0.08, dt)
      this.nose = ease(this.nose, 0, 0.05, dt)
      if (this.timer <= 0) {
        // The next slide: under the wood if it lies across, to the wood if it lies near, else the whole groove.
        const bridge = plan.bridge
        let to = this.at < last / 2 ? last : 0
        if (bridge !== null && Math.abs(this.at - bridge) > 0.5) to = bridge
        else if (bridge === null && plan.wood && this.variants.next() !== 0) to = this.nearest(plan.path, plan.wood)
        if (Math.abs(to - this.at) < 0.5) to = this.at < last / 2 ? last : 0
        this.slideTo(to, plan.path)
      }
    } else if (this.swim === 'slide') {
      const t = clamp(1 - this.timer / this.slideFor, 0, 1)
      this.at = this.from + (this.to - this.from) * (1 - Math.pow(1 - t, 2.2))
      // It slides at the top of the water, seen: where it went under to turn about, it comes up as it goes, and
      // goes down again only for what lies over its water.
      const was = this.dip
      this.dip = ease(this.dip, 0, 0.08, dt)
      // Open water: flat out with its eyes shut. A dark way to go under: eyes wide.
      shut = dark ? 0 : 1
      if (this.timer <= 0) {
        this.at = this.to
        if (dark && this.to === plan.bridge) {
          // Under its bridge it is as far down as it came there.
          this.dip = was
          this.swim = 'under'
          this.under = true
          this.timer = EEL_TEMPO.under
        } else if (!dark && plan.wood && this.to === this.nearest(plan.path, plan.wood) && this.to !== 0 && this.to !== last) {
          this.swim = 'sniff'
          this.timer = 1.2
          // A sniff that is seen: where the wood lies so near that it stays under, its nose pokes unseen and unheard.
          this.owed = 'sniff'
        } else {
          this.swim = 'still'
          this.timer = EEL_TEMPO.still * (0.7 + this.rng.next() * 0.6)
        }
      }
    } else if (this.swim === 'under') {
      // Under the wood: right under the water, out of sight, and then it comes up on the other side.
      this.dip = ease(this.dip, EEL_UNDER, 0.05, dt)
      if (this.timer <= 0) {
        this.under = false
        // Out the other side, where there is a place beyond for it to come up with the whole of its neck out
        // from under. Where there is none, it comes back out the way it went in, and is seen again there. One
        // side at least has such a place: a ditch with none on either side of the wood is not given to it
        // (plan.ts). It never stays where it is.
        const on = this.from < this.at ? 1 : -1
        const beyond = plan.rests[on > 0 ? 1 : 0], back = plan.rests[on > 0 ? 0 : 1]
        this.slideTo(beyond ?? back ?? clamp(this.at + on * EEL_PAST, 0, last), plan.path)
      }
    } else {
      // Its nose pokes at the wood lying near, twice.
      this.nose = Math.abs(Math.sin((1.2 - this.timer) * 5.2))
      if (this.timer <= 0) {
        this.swim = 'still'
        this.timer = EEL_TEMPO.still * 0.6
      }
    }
    this.shut[0] = shut || oneEye
    this.shut[1] = shut
    this.mouth = ease(this.mouth, this.swim === 'under' ? 0.5 : 0, 0.08, dt)
    this.out = 0
  }

  /** Where it comes up in a water that is new to it: at the sea end, or with a bough across, beside the bough, facing away from it. */
  private rises(plan: Extract<EelPlan, { kind: 'groove' }>): void {
    this.at = 0
    this.from = 0
    this.to = 0
    if (plan.bridge === null) return
    this.at = plan.rests[0] ?? plan.rests[1] ?? 0
    this.from = plan.bridge
    this.to = this.at
  }

  private nearest(path: readonly Point[], to: Point): number {
    let nearest = 0
    path.forEach((point, index) => {
      if (Math.hypot(point.x - to.x, point.z - to.z) < Math.hypot(path[nearest].x - to.x, path[nearest].z - to.z)) nearest = index
    })
    return nearest
  }

  private slideTo(to: number, path: readonly Point[]): void {
    this.from = this.at
    this.to = to
    let length = 0
    for (let i = Math.min(this.from, to); i < Math.max(this.from, to) - 0.5; i++) {
      const a = path[Math.floor(i)], b = path[Math.min(path.length - 1, Math.floor(i) + 1)]
      length += Math.hypot(b.x - a.x, b.z - a.z)
    }
    this.slideFor = clamp(length / EEL_TEMPO.swim, EEL_TEMPO.slide, 1.3)
    this.timer = this.slideFor
    this.swim = 'slide'
    // Its swish comes with what is seen of the slide: at once in open water, and as it comes up where it sets off
    // from under its bridge or from under the water.
    this.owed = 'swish'
  }

  /** Lays its head in the world from where it is. */
  private pose(world: World, dt: number): void {
    const plan = this.plan
    if (this.where === 'groove' && plan.kind === 'groove') {
      const last = plan.path.length - 1
      const at = clamp(this.at, 0, last), low = Math.floor(at), high = Math.min(last, low + 1), part = at - low
      const a = plan.path[low], b = plan.path[high]
      this.x = a.x + (b.x - a.x) * part
      this.z = a.z + (b.z - a.z) * part
      this.y = world.ground(this.x, this.z) + 0.34 - this.dip * 0.55
      // It faces the way it goes; still, it keeps the way it came.
      const before = plan.path[Math.max(0, low - 1)], after = plan.path[Math.min(last, high + 1)]
      const way = this.swim === 'slide' ? Math.sign(this.to - this.from) || 1 : this.to >= this.from ? 1 : -1
      const want = Math.atan2((after.x - before.x) * way, (after.z - before.z) * way)
      let gap = want - this.yaw
      while (gap > Math.PI) gap -= Math.PI * 2
      while (gap < -Math.PI) gap += Math.PI * 2
      // A bend it follows as it goes. To turn about it goes under first: its neck never swings round over the sand.
      this.turning = dt > 0 && Math.abs(gap) > 0.6
      if (dt <= 0 || this.dip >= 0.97) this.yaw = want
      else if (!this.turning) this.yaw += gap * (1 - Math.pow(0.5, dt / 0.05))
      this.pitch = -0.25 * (1 - this.dip)
      return
    }
    if (this.where === 'groove') return
    const hole = EEL_HOLES[this.hole]
    // All the way in, the head is inside the rock; out, it stands clear of the rock and tips up a little.
    const reach = -1.0 + this.out * 1.3
    if (this.hole === 0) {
      this.x = hole.x - 0.12 * this.out
      this.z = hole.z + reach
      this.yaw = 0.16 * this.out
    } else {
      // Round the side: it slides out from behind the rock and turns its face to the child.
      this.x = hole.x + reach
      this.z = hole.z + 0.1 * this.out
      this.yaw = Math.PI / 2 - 0.75 * this.out
    }
    this.y = hole.y + this.out * 0.1
    this.pitch = -0.3 * this.out
  }
}

// --- The gulls -----------------------------------------------------------------

export const GULL_TEMPO = { hop: 0.72, shuffle: 0.3, beat: 0.18, idle: 2.6, fly: 1.25, slip: 0.6 } as const

export type Gull = {
  /** Which place of the row it has, 0 to 2 from the left. */
  slot: number
  /** What it stands on: the log, or the wall. */
  place: 'log' | 'wall'
  /** Where its feet are in the world, and how high it is above them. */
  x: number
  y: number
  z: number
  hop: number
  /** A sideways lean, in radians, and a tip forward onto its face, toward the child. */
  lean: number
  pitch: number
  /** Where its head is turned, in radians, and how far it is ducked, 0 to 1. */
  head: number
  duck: number
  /** Each wing, 0 folded to 1 spread. */
  wings: [number, number]
  /** 0 shut, 1 wide. */
  beak: number
  /** Squash on landing, and its speed. */
  squash: number
  squashSpeed: number
}

type Flight = { fx: number; fy: number; fz: number; time: number; span: number; high: number; then: 'stay' | 'slip' }

function logPerch(slot: number): { x: number; y: number; z: number } {
  return { x: LOG.x0 + (LOG.x1 - LOG.x0) * GULL_PERCHES[slot], y: LOG.top, z: LOG.z }
}

export class Gulls {
  readonly birds: Gull[] = GULL_PERCHES.map((_, slot) => ({ slot, place: 'log', ...logPerch(slot), hop: 0, lean: 0, pitch: 0, head: 0, duck: 0, wings: [0, 0], beak: 0, squash: 0, squashSpeed: 0 }))
  readonly sounds: FolkSound[] = []
  private plan: GullPlan = { kind: 'log' }
  /** Each bird: its flight if it is in the air, how long it has been sliding off, and whether it tried this wall. */
  private readonly flights: (Flight | null)[] = [null, null, null]
  private readonly slips = [-1, -1, -1]
  private readonly tried = [false, false, false]
  /** Each bird: how much longer it squawks at a finger that found it in the air or sliding. */
  private readonly yelps = [0, 0, 0]
  private sincePlan = 0
  private bounced = -1
  private idle: number = GULL_TEMPO.idle * 0.7
  private act: { kind: 'shuffle' | 'preen' | 'stretch'; who: number; time: number } | null = null
  private ducking = -1
  private heading = 0
  private readonly variants: Variants

  constructor(private readonly rng: Rng) {
    this.variants = new Variants(3, rng)
  }

  setPlan(plan: GullPlan): void {
    const same = JSON.stringify(plan) === JSON.stringify(this.plan)
    this.plan = plan
    if (same) return
    this.sincePlan = 0
    this.tried.fill(false)
  }

  /** Where a bird's plan puts it: the first always goes to a wall; the others only where the top is flat, or to try it once. */
  private wants(index: number): 'log' | 'wall' {
    const plan = this.plan
    if (plan.kind === 'log') return 'log'
    return plan.flat || index === 0 || !this.tried[index] ? 'wall' : 'log'
  }

  private perch(bird: Gull, place: 'log' | 'wall', world: World): { x: number; y: number; z: number } {
    const plan = this.plan
    if (place === 'wall' && plan.kind === 'wall') {
      const at = plan.perches[bird.slot]
      return { x: at.x, y: world.ground(at.x, at.z), z: at.z }
    }
    return logPerch(bird.slot)
  }

  /** At their places at once, as a load or the end of a scene leaves them. */
  settle(world: World): void {
    const plan = this.plan
    this.birds.forEach((bird, index) => {
      if (plan.kind === 'wall' && !plan.flat && index > 0) this.tried[index] = true
      bird.place = this.wants(index)
      Object.assign(bird, this.perch(bird, bird.place, world))
      bird.hop = 0
      bird.pitch = 0
      this.flights[index] = null
      this.slips[index] = -1
    })
    this.act = null
  }

  /** The sand each bird stands over, or is in the air over, and how high its top is. One that is sliding off takes the sand in front of it too. */
  pillars(skip = -1, bodies = false): Pillar[] {
    const out: Pillar[] = []
    this.birds.forEach((bird, index) => {
      if (index === skip) return
      // To another bird coming down beside it, it is as wide as its body: its wings, its head and its lean give way (fit).
      const size = GULL_SIZES[index], r = bodies ? GULL_HALF * size : Math.max(gullSpan(bird, index, -1), gullSpan(bird, index, 1), 0.75 * size)
      const top = bird.y + bird.hop + gullTall(index)
      out.push({ x: bird.x, z: bird.z, r, top })
      if (bird.pitch > 0.05) out.push({ x: bird.x, z: bird.z + 0.7 * size, r: 0.6 * size, top })
    })
    return out
  }

  /** A finger on a gull: it squawks, hops up, and lands at the other end of its row; the others shuffle along. */
  poke(index: number): void {
    const bird = this.birds[index]
    if (this.flights[index] || this.slips[index] >= 0) {
      // In the air or sliding off: it squawks and flaps harder, and goes on where it was going.
      this.yelps[index] = 0.45
      bird.squashSpeed = 5
      this.sounds.push('squawk')
      return
    }
    // Its row is whoever stands on the same thing.
    const row = this.birds.filter((other, at) => other.place === bird.place && !this.flights[at]).sort((a, b) => a.slot - b.slot)
    const slots = row.map((other) => other.slot)
    const toEnd = bird.slot === slots[slots.length - 1] ? 0 : slots.length - 1
    const rest = row.filter((other) => other !== bird)
    if (toEnd === 0) rest.unshift(bird)
    else rest.push(bird)
    rest.forEach((other, at) => (other.slot = slots[at]))
    this.flights[index] = { fx: bird.x, fy: bird.y, fz: bird.z, time: 0, span: GULL_TEMPO.hop, high: 1.9, then: 'stay' }
    this.act = null
    this.sounds.push('squawk')
  }

  /** Grains are flying their way: they duck one after another. */
  duckAll(): void {
    if (this.ducking < 0) this.ducking = 0
  }

  /** A knock on their log: those standing on it bounce once. */
  bounce(): void {
    this.bounced = 0
  }

  step(dt: number, world: World, crab?: { x: number; z: number; turn: number; floor: number }): void {
    const finger = world.finger
    // Heads turn toward the finger, each a beat after the one before.
    let middle = 0
    for (const bird of this.birds) middle += bird.x / this.birds.length
    // With no finger, on their log, they turn to the sun on its way, further round the lower it is.
    const sun = !finger && this.plan.kind === 'log' ? world.sun ?? null : null
    const want = finger ? clamp(Math.atan2(finger.x - middle, finger.z - this.birds[0].z + 6), -1.2, 1.2) : sun ? (sun.x < middle ? -1 : 1) * (SUN_LOOK.head + (1.1 - SUN_LOOK.head) * sun.low) + Math.sin(this.heading * 9) * 0.08 : Math.sin(this.heading) * 0.5
    this.heading += dt * 0.23
    this.sincePlan += dt
    if (this.ducking >= 0) {
      this.ducking += dt
      if (this.ducking > 0.3 + GULL_TEMPO.beat * 3) this.ducking = -1
    }
    if (this.bounced >= 0) {
      this.bounced += dt
      if (this.bounced > 0.36) {
        this.bounced = -1
        for (const bird of this.birds) if (bird.place === 'log') bird.squashSpeed = 6
      }
    }
    const busy = this.flights.some((flight) => flight !== null) || this.slips.some((slip) => slip >= 0)
    this.idle -= dt
    if (this.idle <= 0 && !this.act && !busy) {
      const kinds = ['shuffle', 'preen', 'stretch'] as const
      this.act = { kind: kinds[this.variants.next()], who: below(this.rng, this.birds.length), time: 0 }
      this.idle = GULL_TEMPO.idle * (0.7 + this.rng.next() * 0.8)
    }
    if (this.act) {
      this.act.time += dt
      if (this.act.time > 1.3 || busy) this.act = null
    }
    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i]
      let headTo = want, duckTo = 0, wingL = 0, wingR = 0, beakTo = 0, leanTo = 0, pitchTo = 0
      this.yelps[i] = Math.max(0, this.yelps[i] - dt)
      const flight = this.flights[i]
      const wanted = this.wants(i)
      if (flight) {
        flight.time += dt
        const t = clamp(flight.time / flight.span, 0, 1)
        const to = this.perch(bird, bird.place, world)
        bird.x = flight.fx + (to.x - flight.fx) * smooth(t)
        bird.z = flight.fz + (to.z - flight.fz) * smooth(t)
        bird.y = flight.fy + (to.y - flight.fy) * smooth(t)
        // Up quickly and down late: it is over the heads of the others for the whole of the way across, and over
        // the top of whatever else stands under its way.
        const size = GULL_SIZES[i]
        const clear = Math.max(
          over([{ x: bird.x, z: bird.z, r: 0.75 * size }], bird.y, 0.12, world.pillars?.({ kind: 'gull', index: i }) ?? []),
          over([{ x: bird.x, z: bird.z, r: 0.45 * size }], bird.y, 0.12, this.pillars(i, true), 0.05, 0.15),
        ) - bird.y
        bird.hop = Math.max(Math.pow(Math.sin(t * Math.PI), 0.55) * flight.high, clear)
        wingL = wingR = 0.55 + 0.45 * Math.sin(flight.time * 26)
        beakTo = t < 0.5 && flight.span <= GULL_TEMPO.hop ? 1 : 0
        leanTo = clamp(to.x - flight.fx, -1, 1) * -0.4 * Math.sin(t * Math.PI)
        // It comes down only onto a perch that is clear under it: until then it hangs in the air, flapping.
        if (t >= 1 && clear < 0.02) {
          bird.hop = 0
          bird.squashSpeed = 7
          this.flights[i] = null
          this.sounds.push('flap')
          if (flight.then === 'slip') {
            // A lumpy top: its feet find no flat, and off it slides.
            this.slips[i] = 0
            this.sounds.push('slip')
          }
        }
      } else if (this.slips[i] >= 0) {
        this.slips[i] += dt
        // Its feet go from under it and it tips forward off the wall, toward the child: never into the bird beside it.
        const t = clamp(this.slips[i] / GULL_TEMPO.slip, 0, 1)
        pitchTo = 0.45 * t
        bird.z += 0.5 * t * dt
        bird.y -= 0.2 * t * dt
        wingL = wingR = t > 0.35 ? 0.5 + 0.5 * Math.sin(this.slips[i] * 30) : 0
        beakTo = 1
        if (t >= 1) {
          this.slips[i] = -1
          this.tried[i] = true
          bird.place = 'log'
          this.flights[i] = { fx: bird.x, fy: bird.y, fz: bird.z, time: 0, span: GULL_TEMPO.fly, high: 1.5, then: 'stay' }
        }
      } else if (wanted !== bird.place) {
        // Off to the other perch, one after another, a beat apart.
        if (this.sincePlan > 0.3 + i * 0.5) {
          const lumpy = wanted === 'wall' && this.plan.kind === 'wall' && !this.plan.flat && i > 0
          bird.place = wanted
          this.flights[i] = { fx: bird.x, fy: bird.y, fz: bird.z, time: 0, span: GULL_TEMPO.fly, high: 1.5, then: lumpy ? 'slip' : 'stay' }
        }
      } else {
        // On its perch it shuffles along to its place in small steps.
        const to = this.perch(bird, bird.place, world)
        const gapX = to.x - bird.x, gapZ = to.z - bird.z, gap = Math.hypot(gapX, gapZ)
        bird.y = to.y
        if (gap > 0.008) {
          const step = Math.min(gap, (dt / GULL_TEMPO.shuffle) * 1.2)
          bird.x += (gapX / gap) * step
          bird.z += (gapZ / gap) * step
          bird.hop = Math.abs(Math.sin(gap * 17)) * 0.07
          leanTo = Math.sign(gapX) * -0.22
        } else bird.hop = ease(bird.hop, 0, 0.03, dt)
        if (this.bounced >= 0 && bird.place === 'log') bird.hop = Math.sin(clamp(this.bounced / 0.36, 0, 1) * Math.PI) * 0.34
        const act = this.act
        if (act && act.who === i) {
          if (act.kind === 'preen') {
            headTo = 1.5
            duckTo = 0.75
            wingR = 0.25
          } else if (act.kind === 'stretch') {
            // One wing, out to the side where it has the more room.
            const reach = Math.sin(clamp(act.time / 1.1, 0, 1) * Math.PI)
            if (this.roomBeside(i, -1) >= this.roomBeside(i, 1)) wingL = reach
            else wingR = reach
          }
          else leanTo = Math.sin(act.time * 9) * 0.3
        } else if (act && act.kind === 'shuffle' && this.birds[act.who].place === bird.place && Math.abs(this.birds[act.who].slot - bird.slot) === 1 && act.time > 0.25) {
          // Its neighbour's elbow: it is shuffled off its feet, flaps, and comes back on.
          const push = Math.sin(clamp((act.time - 0.25) / 0.8, 0, 1) * Math.PI)
          leanTo = Math.sign(bird.slot - this.birds[act.who].slot) * 0.3 * push
          bird.hop = Math.max(bird.hop, push * 0.16)
          wingL = wingR = push * (0.5 + 0.4 * Math.sin(act.time * 28))
          beakTo = act.time < 0.6 ? 0.6 : 0
        }
        if (this.ducking >= 0) {
          const local = this.ducking - bird.slot * GULL_TEMPO.beat
          if (local > 0 && local < 0.3) duckTo = 1
        }
      }
      // A beat apart: the further along the row, the later its head comes round.
      bird.head = ease(bird.head, headTo, 0.05 + bird.slot * GULL_TEMPO.beat * 0.6, dt)
      bird.duck = ease(bird.duck, duckTo, 0.035, dt)
      bird.wings[0] = ease(bird.wings[0], wingL, 0.04, dt)
      bird.wings[1] = ease(bird.wings[1], wingR, 0.04, dt)
      if (this.yelps[i] > 0) {
        beakTo = 1
        if (flight || this.slips[i] >= 0) wingL = wingR = 0.6 + 0.4 * Math.sin(this.yelps[i] * 40)
      }
      bird.beak = ease(bird.beak, beakTo, 0.04, dt)
      bird.lean = ease(bird.lean, leanTo, 0.06, dt)
      bird.pitch = ease(bird.pitch, pitchTo, 0.05, dt)
      ;[bird.squash, bird.squashSpeed] = spring(bird.squash, bird.squashSpeed, 0, 190, 10, dt)
    }
    this.fit(crab ? { rounds: crabRounds(crab), top: crab.floor + CRAB_TOP } : null)
  }

  /** How far off the nearest bird stands on one side of a bird: -1 its left, 1 its right. */
  private roomBeside(index: number, side: number): number {
    const bird = this.birds[index]
    let room = Infinity
    for (const other of this.birds) if (other !== bird && Math.abs(other.z - bird.z) < 1.5 && (other.x - bird.x) * side > 0) room = Math.min(room, Math.abs(other.x - bird.x))
    return room
  }

  /**
   * No bird reaches into the bird beside it. Where two that stand side by side would touch, the wings between
   * them fold as far as they must, then the heads turn back, then the leans straighten: a stretch is as wide as
   * the room there is, and no wider.
   */
  private fit(crab: { rounds: Patch[]; top: number } | null): void {
    const birds = this.birds
    for (let a = 0; a < birds.length; a++) for (let b = 0; b < birds.length; b++) {
      const left = birds[a], right = birds[b]
      if (a === b || left.x > right.x || (left.x === right.x && a > b)) continue
      if (Math.abs(left.z - right.z) > 1.5) continue
      // One over the other's head is no neighbour.
      const feetA = left.y + left.hop, feetB = right.y + right.hop
      if (feetA >= feetB + gullTall(b) + 0.04 || feetB >= feetA + gullTall(a) + 0.04) continue
      const room = right.x - left.x - GULL_ROOM
      const fits = (): boolean => gullSpan(left, a, 1) + gullSpan(right, b, -1) <= room
      if (fits()) continue
      const squeeze = (set: (k: number) => void): boolean => {
        set(0)
        if (!fits()) return false
        let low = 0, high = 1
        for (let i = 0; i < 12; i++) {
          const mid = (low + high) / 2
          set(mid)
          if (fits()) low = mid
          else high = mid
        }
        set(low)
        return true
      }
      const wingA = left.wings[1], wingB = right.wings[0]
      if (squeeze((k) => { left.wings[1] = wingA * k; right.wings[0] = wingB * k })) continue
      const headA = left.head, headB = right.head
      if (squeeze((k) => { left.head = headA > 0 ? headA * k : headA; right.head = headB < 0 ? headB * k : headB })) continue
      const leanA = left.lean, leanB = right.lean
      squeeze((k) => { left.lean = leanA < 0 ? leanA * k : leanA; right.lean = leanB > 0 ? leanB * k : leanB })
    }
    // Nor into the crab where it stands or goes by beside a bird, as tall as its raised claws: the wing on that
    // side folds, then the head turns back, then the lean straightens.
    if (!crab) return
    birds.forEach((bird, index) => {
      if (bird.y + bird.hop >= crab.top + 0.04) return
      for (const side of [-1, 1]) {
        let room = Infinity
        for (const round of crab.rounds) {
          // How far the round reaches toward the bird along the line the bird stands on, a wing's depth either way.
          const off = Math.max(0, Math.abs(round.z - bird.z) - GULL_DEEP)
          if (off >= round.r) continue
          const edge = (round.x - bird.x) * side - Math.sqrt(round.r * round.r - off * off)
          if ((round.x - bird.x) * side + round.r > 0) room = Math.min(room, edge)
        }
        room -= GULL_ROOM
        const fits = (): boolean => gullSpan(bird, index, side) <= room
        if (room === Infinity || fits()) continue
        const squeeze = (set: (k: number) => void): boolean => {
          set(0)
          if (!fits()) return false
          let low = 0, high = 1
          for (let i = 0; i < 12; i++) {
            const mid = (low + high) / 2
            set(mid)
            if (fits()) low = mid
            else high = mid
          }
          set(low)
          return true
        }
        const at = side < 0 ? 0 : 1, wing = bird.wings[at]
        if (squeeze((k) => { bird.wings[at] = wing * k })) continue
        const head = bird.head
        if (squeeze((k) => { bird.head = head * side > 0 ? head * k : head })) continue
        const lean = bird.lean
        squeeze((k) => { bird.lean = lean * side < 0 ? lean * k : lean })
      }
    })
  }
}

/** The room two gulls keep between them, shoulder to shoulder. */
export const GULL_ROOM = 0.06
/** How far a gull's stretched wing and its beak reach to its front and back. */
export const GULL_DEEP = 0.45

// --- The small crabs -----------------------------------------------------------

/** A beach with nothing built for anyone: a few bored small crabs walk sideways along the water's edge. */
export type Small = {
  x: number
  z: number
  /** How big it is beside the others: no two are alike. */
  size: number
  stride: number
  /** 0 still in the sea, 1 out on its line. */
  shown: number
  hop: number
}

const SMALL = [
  { x: -1.9, z: 1.0, size: 0.5, tempo: 0.9, roam: 0.9 },
  { x: 0.1, z: 1.5, size: 0.4, tempo: 0.65, roam: 1.6 },
  { x: 1.9, z: 0.85, size: 0.58, tempo: 1.2, roam: 0.8 },
] as const

/** How far a small crab reaches to either side of its middle, and how tall it stands, for one of size 1. */
export const SMALL_HALF = 1.15
export const SMALL_TALL = 1.3

export class SmallCrabs {
  readonly crabs: Small[] = SMALL.map((crab) => ({ x: crab.x, z: crab.z - 2.2, size: crab.size, stride: 0, shown: 0, hop: 0 }))
  readonly sounds: FolkSound[] = []
  private want = false
  private readonly timers = [0.4, 1.1, 0.8]
  private readonly ways = [1, -1, 1]
  private readonly running = [false, false, false]
  private readonly hops = [0, 0, 0]
  private readonly setOff = [false, false, false]

  constructor(private readonly rng: Rng) {}

  setBored(bored: boolean): void {
    this.want = bored
  }

  settle(world?: World): void {
    this.crabs.forEach((crab, index) => {
      const column = world ? this.column(index, SMALL[index].x, world) : SMALL[index].x
      crab.shown = this.want && column !== null ? 1 : 0
      crab.x = column ?? SMALL[index].x
      crab.z = SMALL[index].z - (1 - crab.shown) * 2.2
    })
  }

  /** The sand each one that is out stands over, and how high its top is. */
  pillars(ground: (x: number, z: number) => number): Pillar[] {
    return this.crabs.filter((crab) => crab.shown > 0.02).map((crab) => ({ x: crab.x, z: crab.z, r: SMALL_HALF * crab.size, top: ground(crab.x, crab.z) + crab.hop + SMALL_TALL * crab.size }))
  }

  /** Whether one of them can stand at a place: nothing lies there, and the log's end is not over it. */
  private free(index: number, x: number, z: number, world: World): boolean {
    // The places that never move are told with a little slack, for the folk who brush past them; it has none to give.
    return world.blocked(x, z, SMALL_HALF * SMALL[index].size + 0.3) === null
  }

  /** The nearest place to `x` along its line from which its way up out of the sea, and back, is clear; null where there is none. */
  private column(index: number, x: number, world: World): number | null {
    const home = SMALL[index]
    for (const off of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.2, -1.2, 1.5, -1.5]) {
      const at = x + off
      if (Math.abs(at - home.x) > home.roam + 0.6) continue
      let clear = true
      for (let back = 0; back <= 2.2 + 1e-6 && clear; back += 0.2) clear = this.free(index, at, home.z - back, world)
      if (clear) return at
    }
    return null
  }

  step(dt: number, world: World): void {
    const finger = world.finger
    this.crabs.forEach((crab, index) => {
      const home = SMALL[index]
      const before = crab.shown
      // It comes up out of the sea, and goes back into it, only by a way that nothing lies on: sideways first, to where one is.
      const coming = this.want ? crab.shown < 1 : crab.shown > 0
      let moved = 0
      if (coming) {
        const column = this.column(index, crab.x, world)
        if ((column === null || Math.abs(column - crab.x) > 0.02) && crab.shown > 0 && crab.shown < 1) {
          // Part of the way out with something set down on its way: it does not stand there. It goes on the way it
          // was going if that part of its way is clear, and otherwise back the way it came; from the sea, or from
          // its line, it then goes sideways to a way that is clear. Only shut in on both sides does it stay.
          const back = (1 - smooth(crab.shown)) * 2.2
          const clear = (from: number, to: number): boolean => {
            for (let at = from; at <= to + 1e-6; at += 0.2) if (!this.free(index, crab.x, home.z - at, world)) return false
            return true
          }
          const ahead = clear(0, back), behind = clear(back, 2.2)
          const out = this.want ? ahead || !behind : !behind && ahead
          if (ahead || behind) crab.shown = clamp(crab.shown + (out ? dt / 1.6 : -dt / 1.2), 0, 1)
        } else if (column !== null && Math.abs(column - crab.x) > 0.02) {
          const step = Math.sign(column - crab.x) * Math.min(Math.abs(column - crab.x), 1.7 * dt)
          if (crab.shown <= 0 || this.free(index, crab.x + step, crab.z, world)) {
            crab.x += step
            moved += Math.abs(step)
          }
        } else if (column !== null) crab.shown = clamp(crab.shown + (this.want ? dt / 1.6 : -dt / 1.2), 0, 1)
      }
      const line = home.z - (1 - smooth(crab.shown)) * 2.2
      moved += Math.abs(crab.shown - before) * 2.2
      // A finger landing beside one: it jumps and runs the other way.
      if (finger && crab.shown > 0.9 && Math.hypot(finger.x - crab.x, finger.z - crab.z) < 0.9 && this.hops[index] <= 0) {
        this.hops[index] = 0.3
        this.ways[index] = finger.x > crab.x ? -1 : 1
        this.running[index] = true
        this.timers[index] = home.tempo * 0.5
        this.sounds.push('scuttle')
      }
      this.hops[index] = Math.max(0, this.hops[index] - dt)
      crab.hop = Math.sin((this.hops[index] / 0.3) * Math.PI) * 0.3
      this.timers[index] -= dt
      if (this.timers[index] <= 0) {
        this.running[index] = !this.running[index]
        this.timers[index] = home.tempo * (this.running[index] ? 0.5 + this.rng.next() * 0.4 : 0.8 + this.rng.next() * 1.2)
        if (this.running[index] && crab.shown >= 1) {
          if (this.rng.next() < 0.35) this.ways[index] = -this.ways[index]
          this.setOff[index] = true
        }
      }
      if (this.running[index] && crab.shown >= 1 && this.want) {
        if (crab.x > home.x + home.roam) this.ways[index] = -1
        if (crab.x < home.x - home.roam) this.ways[index] = 1
        const step = this.ways[index] * 1.7 * dt
        // Whatever lies on its line turns it round, and so does another of them.
        const meets = this.crabs.some((other, at) => at !== index && other.shown > 0.02 && Math.abs(other.z - line) < 0.9 && Math.abs(other.x - (crab.x + step)) < SMALL_HALF * (other.size + crab.size) + 0.08 && (other.x - crab.x) * step > 0)
        if (meets || !this.free(index, crab.x + step + this.ways[index] * 0.1, line, world)) this.ways[index] = -this.ways[index]
        else {
          crab.x += step
          moved += Math.abs(step)
          // The scuttle sounds with the first step of a run that is really taken, whichever of them takes it.
          if (this.setOff[index]) this.sounds.push('scuttle')
          this.setOff[index] = false
        }
      }
      crab.z = line
      crab.stride += moved * 9
    })
  }
}

// --- All of them -----------------------------------------------------------------

export class Folk {
  readonly crab: Crab
  readonly starfish: Starfish
  readonly eel: Eel
  readonly gulls: Gulls
  readonly small: SmallCrabs

  constructor(rng: Rng) {
    this.crab = new Crab(rng)
    this.starfish = new Starfish(rng)
    this.eel = new Eel(rng)
    this.gulls = new Gulls(rng)
    this.small = new SmallCrabs(rng)
  }

  /** What the beach holds for every one of them now. */
  setPlan(plan: Plan): void {
    this.crab.setPlan(plan.crab)
    this.starfish.setPlan(plan.star)
    this.eel.setPlan(plan.eel)
    this.gulls.setPlan(plan.gulls)
    this.small.setBored(plan.bored)
  }

  /** Every one at its place at once, as a load or the end of a scene leaves them. */
  settle(world: World): void {
    this.crab.settle(world)
    this.starfish.settle(this.crab, world)
    this.eel.settle(world, this.crab)
    this.gulls.settle(world)
    this.small.settle(world)
  }

  /** The gulls that stand on a wall, as the sand each takes up, with the sand in front that one may slide off onto. */
  private onWall(): Patch[] {
    return wallPatches(this.gulls.birds.filter((bird) => bird.place === 'wall'))
  }

  step(dt: number, world: World): void {
    const star = this.starfish
    // Each goes round the others as it goes round a rock: the crab round the starfish where it wheels over the
    // sand, the starfish round the crab unless it means to climb it, and both round gulls on a wall. And the crab
    // is never under the starfish where it lies with its arms out over the edge of a tower or comes down onto
    // one: only on the crab's own back are the two together.
    const wall = this.onWall()
    const over = !star.riding && Math.hypot(star.x - this.crab.x, star.z - this.crab.z) < 3.6 ? star.skin() : []
    // The tower it lies on is in the way of the crab's shell like a rock: crouched under the arms, the crab does not
    // go in to the tower itself, where a shell may stand in its side.
    const tower = star.on === 'tower' && star.move === 'perched' ? { x: star.x, z: star.z, r: STAR_TOWER } : null
    this.crab.step(dt, world, star.move === 'roll' ? [...star.rounds(), ...wall] : wall, star.riding, over, tower, star.move === 'perched', this.eel.upUnder(this.crab))
    const small = this.small.pillars(world.ground)
    star.step(dt, world, this.crab, star.planned === 'crab' ? [...wall, ...small] : [...crabRounds(this.crab), ...wall, ...small])
    this.eel.step(dt, world, this.crab)
    this.gulls.step(dt, world, this.crab)
    this.small.step(dt, world)
  }

  /** The sand each of the folk stands over and how high its top is, but for the one who asks. */
  pillars(world: World, who?: Who): Pillar[] {
    const crab = this.crab, star = this.starfish, out: Pillar[] = []
    const top = crab.floor + CRAB_TOP
    for (const round of crabRounds(crab)) out.push({ ...round, top })
    // On its rock the starfish is over no sand a thing can come onto.
    if (who?.kind !== 'starfish' && !(star.on === 'rock' && star.move === 'perched')) {
      const high = star.y + highest(starParts(star))
      for (const round of star.rounds()) out.push({ ...round, top: high })
    }
    // A gull in the air asks the other gulls itself: it comes down close beside them.
    if (who?.kind !== 'gull') out.push(...this.gulls.pillars())
    out.push(...this.small.pillars(world.ground))
    return out
  }

  /** Every sound the folk made since the last call, oldest first. */
  drainSounds(out: FolkSound[]): void {
    for (const who of [this.crab, this.starfish, this.eel, this.gulls, this.small]) {
      for (const sound of who.sounds) out.push(sound)
      who.sounds.length = 0
    }
  }

  /** Where each of them is now, for a touch to find. `groundAt` gives the height of the sand. */
  spots(groundAt: (x: number, z: number) => number): FolkSpots {
    const star = this.starfish
    return {
      // The crab is found where it is drawn: on what its feet stand on, which is never lower than the sand.
      crab: { x: this.crab.x, y: Math.max(this.crab.floor, groundAt(this.crab.x, this.crab.z)) + 0.45, z: this.crab.z },
      starfish: { x: star.x, y: star.y + (0.7 + star.stretch * 0.4) * (1 - star.spread * 0.7), z: star.z, flat: star.spread },
      eel: { x: this.eel.x, y: this.eel.y, z: this.eel.z + (this.eel.where === 'rock' && this.eel.hole === 0 ? 0.35 * this.eel.out : 0), out: eelShown(this.eel) && (this.eel.where === 'rock' ? this.eel.out > 0.15 : this.eel.dip < 0.8) },
      gulls: this.gulls.birds.map((bird) => ({ x: bird.x, y: bird.y + 0.75 + bird.hop, z: bird.z })),
    }
  }
}
