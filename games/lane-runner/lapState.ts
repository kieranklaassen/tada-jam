import { beginCycle, deserialize, isReadable, isRecord, serialize, type GameState } from './state'
import { LENGTH, OBSTACLES, PLACES, START, type Lane, type Obstacle, type Spot } from './trail'

// What the game saves on top of the template's fields: where the fox stands,
// what it took from the shelf and what has become of it, what shows on the
// load and on the fox, and what this lap has left on the trail. Every field
// of the sheet's table is here and nothing else. Each is read by itself, so
// a damaged one takes its default and the rest is kept.

export type Load = 'none' | 'cake' | 'ladder' | 'balloons' | 'owl' | 'bucket'
export const LOADS: readonly Exclude<Load, 'none'>[] = ['cake', 'ladder', 'balloons', 'owl', 'bucket']

/** How much of a load there is when it is taken from the shelf, and the most there can be. The bucket is taken with one level in it and holds three. */
export const TAKEN_WITH: Record<Load, number> = { none: 0, cake: 3, ladder: 1, balloons: 4, owl: 1, bucket: 1 }
export const AT_MOST: Record<Load, number> = { none: 0, cake: 3, ladder: 1, balloons: 4, owl: 1, bucket: 3 }

export type Marks = { wet: boolean; muddy: boolean; berries: boolean; ruffles: number }
export type FoxMarks = { wet: boolean; muddy: boolean; burrs: boolean; leaves: boolean }
export type Leftover = { obstacle: Obstacle; lane: Lane }
export type TrailMarks = {
  flowers: boolean
  gooseLooks: 'left' | 'right'
  gooseRides: boolean
  mushrooms: boolean
  puddle: boolean
  leftovers: Leftover[]
}

/** The most things a lap leaves lying about. */
export const MOST_LEFTOVERS = 12
export const MOST_RUFFLES = 3

export type LapState = GameState & {
  /** Where the fox stands, in whole pegs along the trail. */
  at: number
  lane: Lane
  load: Load
  /** Whether the load is in the fox's hands. When it is not, `lies` says where it is. */
  held: boolean
  /** Where a thrown load lies, or the branch for the owl that took hold of it. */
  lies: Spot | 'branch' | null
  left: number
  marks: Marks
  fox: FoxMarks
  trail: TrailMarks
}

export const noMarks = (): Marks => ({ wet: false, muddy: false, berries: false, ruffles: 0 })
export const noFoxMarks = (): FoxMarks => ({ wet: false, muddy: false, burrs: false, leaves: false })
export const noTrailMarks = (): TrailMarks => ({ flowers: false, gooseLooks: 'left', gooseRides: false, mushrooms: false, puddle: false, leftovers: [] })

/** A lap that has not begun: the fox at the shelf with empty hands, nothing marked. */
function emptyLap(): Omit<LapState, keyof GameState> {
  return { at: START.at, lane: START.lane, load: 'none', held: false, lies: null, left: 0, marks: noMarks(), fox: noFoxMarks(), trail: noTrailMarks() }
}

const isLane = (value: unknown): value is Lane => value === 0 || value === 1 || value === 2
const isPlace = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < LENGTH
const flag = (record: unknown, key: string): boolean => isRecord(record) && record[key] === true

function spotOf(raw: unknown): Spot | 'branch' | null {
  if (raw === 'branch') return 'branch'
  return isRecord(raw) && isPlace(raw.at) && isLane(raw.lane) ? { at: raw.at, lane: raw.lane } : null
}

function leftoversOf(raw: unknown): Leftover[] {
  if (!Array.isArray(raw)) return []
  const out: Leftover[] = []
  for (const one of raw) {
    if (out.length >= MOST_LEFTOVERS) break
    if (isRecord(one) && typeof one.obstacle === 'string' && (OBSTACLES as readonly string[]).includes(one.obstacle) && isLane(one.lane)) out.push({ obstacle: one.obstacle as Obstacle, lane: one.lane })
  }
  return out
}

/** Reads a save defensively: the template's fields by its own rules, then each of these by itself. */
export function deserializeLap(raw: unknown, childAge: number | null = null): LapState {
  const base = deserialize(raw, childAge)
  const lap = emptyLap()
  if (!isReadable(raw)) return { ...base, ...lap }
  if (isPlace(raw.at)) lap.at = raw.at
  if (isLane(raw.lane)) lap.lane = raw.lane
  if (typeof raw.load === 'string' && (raw.load === 'none' || (LOADS as readonly string[]).includes(raw.load))) lap.load = raw.load as Load
  if (lap.load !== 'none') {
    lap.lies = spotOf(raw.lies)
    // The branch holds only the owl.
    if (lap.lies === 'branch' && lap.load !== 'owl') lap.lies = null
    // A load is in the hands or lies somewhere: one that is neither is in the hands.
    lap.held = lap.lies === null
    const left = raw.left
    lap.left = typeof left === 'number' && Number.isInteger(left) && left >= 0 && left <= AT_MOST[lap.load] ? left : TAKEN_WITH[lap.load]
    if ((lap.load === 'ladder' || lap.load === 'owl') && lap.left !== 1) lap.left = 1
    const ruffles = isRecord(raw.marks) ? raw.marks.ruffles : 0
    lap.marks = {
      wet: flag(raw.marks, 'wet'),
      muddy: flag(raw.marks, 'muddy'),
      berries: flag(raw.marks, 'berries'),
      ruffles: typeof ruffles === 'number' && Number.isInteger(ruffles) && ruffles >= 0 && ruffles <= MOST_RUFFLES ? ruffles : 0,
    }
  }
  lap.fox = { wet: flag(raw.fox, 'wet'), muddy: flag(raw.fox, 'muddy'), burrs: flag(raw.fox, 'burrs'), leaves: flag(raw.fox, 'leaves') }
  const trail = isRecord(raw.trail) ? raw.trail : {}
  lap.trail = {
    flowers: trail.flowers === true,
    gooseLooks: trail.gooseLooks === 'right' ? 'right' : 'left',
    gooseRides: trail.gooseRides === true && lap.load === 'ladder',
    mushrooms: trail.mushrooms === true,
    puddle: trail.puddle === true,
    leftovers: leftoversOf(trail.leftovers),
  }
  // A finished lap is found at the hand-over spot, whatever the place field says.
  if (base.finished) lap.at = PLACES.handOver
  return { ...base, ...lap }
}

export function serializeLap(state: LapState): LapState {
  return {
    ...serialize(state),
    at: state.at,
    lane: state.lane,
    load: state.load,
    held: state.held,
    lies: state.lies === null || state.lies === 'branch' ? state.lies : { at: state.lies.at, lane: state.lies.lane },
    left: state.left,
    marks: { ...state.marks },
    fox: { ...state.fox },
    trail: { ...state.trail, leftovers: state.trail.leftovers.map((one) => ({ obstacle: one.obstacle, lane: one.lane })) },
  }
}

/** The whole new lap, as the press that begins it saves it: everything of the last lap gone but the lane. */
export function newLap(state: LapState): LapState {
  return beginCycle({ ...state, ...emptyLap(), lane: state.lane })
}
