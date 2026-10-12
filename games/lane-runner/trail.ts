// The trail: a ring of three lanes that leaves the clearing, goes round the
// pond and comes back to it. It never changes. Lengths are in pegs (one
// bead's width); a step is one tile of board, twenty pegs.

export const STEP = 20
export const STEPS = 72
export const LENGTH = STEP * STEPS

export type Lane = 0 | 1 | 2
export const LANES: readonly Lane[] = [0, 1, 2]
export const LANE_WIDTH = STEP
/** Half the width of the laid trail, with its two edging rows. */
export const TRAIL_HALF = (LANE_WIDTH * 3) / 2 + 3

/** How far to the right of the trail's middle a lane's middle lies. */
export function laneX(lane: number): number {
  return (lane - 1) * LANE_WIDTH
}

/** A place along the ring, brought back into 0 up to but not including its length. */
export function wrap(s: number): number {
  return ((s % LENGTH) + LENGTH) % LENGTH
}

/** How far `to` lies from `from` by the shorter way round: positive ahead, negative behind. */
export function offset(from: number, to: number): number {
  const d = wrap(to - from)
  return d > LENGTH / 2 ? d - LENGTH : d
}

/**
 * Where a thing at `to` is drawn for a fox at `from`: ahead as far as `reach`, and otherwise behind. The view
 * looks a long way down the trail and only a little way back, so this is not the shorter way round.
 */
export function shownAt(from: number, to: number, reach: number): number {
  const d = wrap(to - from)
  return d > reach ? d - LENGTH : d
}

/** Where things stand, in pegs from the shelf. The six obstacles keep these places for ever. */
export const PLACES = {
  shelf: 0,
  stream: 9 * STEP,
  branch: 19 * STEP,
  mud: 29 * STEP,
  brambles: 39 * STEP,
  goose: 49 * STEP,
  log: 59 * STEP,
  handOver: 71 * STEP,
} as const

/** Where a first visit finds the fox: at the shelf, in the middle lane. */
export const START = { at: PLACES.shelf, lane: 1 as Lane }

/** A load on the shelf can be taken, or swapped for another, until the fox is this far from the shelf: three steps. */
export const SHELF_REACH = 3 * STEP

export type Obstacle = 'stream' | 'branch' | 'mud' | 'brambles' | 'goose' | 'log'
export const OBSTACLES: readonly Obstacle[] = ['stream', 'branch', 'mud', 'brambles', 'goose', 'log']

export type Spot = { at: number; lane: Lane }

export type Zone = {
  /** The stretch of trail the obstacle takes up, in pegs from the shelf. */
  from: number
  to: number
  /** Where a thing tossed from a jump comes down on it. */
  mid: number
  /** Which lanes it fills, left to right. The others are the way through that needs no jump. */
  blocked: readonly [boolean, boolean, boolean]
  /** Which lanes a thing tossed from a jump lands on it in. */
  catches: readonly [boolean, boolean, boolean]
  /** Its worst spot: where a load thrown by a tumble lies. The goose's is on the side she looks to, which the rules work out. */
  worst: Spot
}

const zone = (at: number, half: number, blocked: Zone['blocked'], catches: Zone['catches'], lane: Lane): Zone => ({ from: at - half, to: at + half, mid: at, blocked, catches, worst: { at, lane } })

/** The six obstacles as stretches of trail. Each fills some lanes and leaves one way through that needs no jump. */
export const ZONES: Record<Obstacle, Zone> = {
  stream: zone(PLACES.stream, 14, [false, true, true], [true, true, true], 1),
  branch: zone(PLACES.branch, 8, [true, true, false], [true, true, false], 0),
  // The mud starts at its step and is four steps long.
  mud: { from: PLACES.mud, to: PLACES.mud + 4 * STEP, mid: PLACES.mud + 10, blocked: [true, false, true], catches: [true, false, true], worst: { at: PLACES.mud + 3 * STEP, lane: 2 } },
  brambles: zone(PLACES.brambles, 8, [true, true, false], [true, true, false], 0),
  goose: zone(PLACES.goose, 12, [false, true, false], [true, true, false], 0),
  log: zone(PLACES.log, 8, [true, true, true], [true, true, true], 2),
}

/** The obstacle whose stretch holds this place, or null on plain trail. */
export function zoneAt(s: number): Obstacle | null {
  for (const name of OBSTACLES) if (s >= ZONES[name].from && s < ZONES[name].to) return name
  return null
}

/** The obstacle a fox at `s` has most lately passed or stands in, or null before the first. */
export function zoneBehind(s: number): Obstacle | null {
  let behind: Obstacle | null = null
  for (const name of OBSTACLES) if (ZONES[name].from <= s) behind = name
  return behind
}

/**
 * Heights, in pegs above the board, that the rules and the figures share: what the fox must be under or over
 * to pass an upright thing without touching it. The figures are drawn to these and a test holds both to them.
 */
export const CLEAR = {
  /** The fox rolled into a ball, and the fox ducked: how tall each is. */
  ball: 15,
  /** The underside of the low branch, and of the thorn arches: a ball passes under, a standing fox does not. */
  branchUnder: 17,
  tunnel: 17,
  /** The top of the thorn arches and of the log. */
  archTop: 22,
  logTop: 11,
  /** The hollow end of the log is lower than a ball: the fox goes through squashed to this. */
  hollow: 9,
  /** How tall the fox stands. */
  fox: 27,
} as const
