import { ROWS, copyLane, isHard, logOn, moverOn, partAt, stepLane, type BoardEvent, type Flattener, type Lane, type Landing, type Pawn, type Ride } from './board'
import { THINGS, holds, type Thing } from './crossing'

// The duck goes first: what it does in the lane of a new thing, worked out beforehand from where that lane's
// movers stand. It takes three or four steps of its own, and at each of them that lane alone takes its step, as
// it does for a hop of the rabbit's; on the last one the new thing does to the duck what it does. Pure: the
// lane's own rules (`stepLane`) are played on a copy, so the end is known before the scene starts and can be
// saved then.

/** What the new thing did to the duck: a car flattened it, the lorry carried it into the arch, the log carried it off the edge to the fish, the turtle went down under it, the bell brought the train. */
export type DuckEnd = 'flat' | 'arch' | 'edge' | 'sunk' | 'train'
const WANTED: Record<Thing, DuckEnd> = { cars: 'flat', lorry: 'arch', logs: 'edge', turtle: 'sunk', bell: 'train' }

/** One step of the duck's: where it steps to and onto what, where it stands once the lane has stepped (`null` when the lane took it out of sight), what the lane's step did, and the lane after it. */
export type DuckStep = { c: number; r: number; landing: Landing; rests: number | null; rang: boolean; events: BoardEvent[]; lane: Lane }
export type DuckShow = { thing: Thing; col: number; steps: DuckStep[]; end: DuckEnd; by: Flattener | null }

type Duck = { c: number; r: number; ride: Ride | null }

/** One step: the duck steps to (c, r), then lane `col` steps. Returns the step and what befell the duck, or null if it stepped into open water. */
function waddle(lane: Lane, col: number, duck: Duck, c: number, r: number): { step: DuckStep; end: DuckEnd | null; by: Flattener | null } | null {
  let landing: Landing = 'grass'
  duck.c = c; duck.r = r; duck.ride = null
  let rang = false
  if (c === col) {
    let ride = moverOn(lane, r)
    if (lane.kind === 'river' && !ride) return null
    landing = lane.kind === 'river' ? 'log' : lane.kind === 'railroad' || lane.kind === 'rails' ? 'rails' : 'road'
    if (ride) {
      const mover = lane.movers[ride.index]
      landing = mover.kind === 'car' ? 'roof' : mover.kind === 'lorry' ? 'bed' : mover.kind === 'turtle' ? 'shell' : 'log'
      if (mover.kind === 'lorry' && ride.part === 0 && partAt(mover, 1) < ROWS) {
        ride = { index: ride.index, part: 1 }
        duck.r = partAt(mover, 1)
      }
    }
    duck.ride = ride
  }
  if (!duck.ride && lane.bell && col + lane.bell.dc === c && lane.bell.r === r) rang = true
  const events: BoardEvent[] = []
  const did = stepLane(lane, col, rang ? 1 : 0, events)
  let end: DuckEnd | null = null, by: Flattener | null = null
  let rests: number | null = duck.r
  if (duck.c === col) {
    if (did.ran) { end = 'train'; by = 'train'; duck.ride = null }
    else if (duck.ride) {
      const mover = lane.movers[duck.ride.index]
      if (mover.kind === 'car') duck.ride = null
      else if (mover.kind === 'turtle') {
        const log = logOn(lane, duck.r)
        if (log) duck.ride = log
        else if (mover.count === 2) { end = 'sunk'; rests = null }
      } else {
        const to = partAt(mover, duck.ride.part)
        if (to < ROWS) { duck.r = to; rests = to }
        else { end = mover.kind === 'lorry' ? 'arch' : 'edge'; rests = null }
      }
    }
    if (!end && !duck.ride && isHard(lane.kind)) {
      const hit = did.swept.find((one) => one.r === duck.r)
      if (hit) { end = 'flat'; by = hit.kind }
    }
  }
  return { step: { c, r, landing, rests, rang, events, lane: copyLane(lane) }, end, by }
}

/** Plays one run of steps on a copy of the lane. It counts only if nothing befalls the duck before its last step, and the wanted thing does on that one. */
function run(source: Lane, col: number, thing: Thing, way: readonly { c: number; r: number }[]): DuckShow | null {
  const lane = copyLane(source), duck: Duck = { c: -1, r: -1, ride: null }
  const steps: DuckStep[] = []
  for (let i = 0; i < way.length; i++) {
    const did = waddle(lane, col, duck, way[i].c, way[i].r)
    if (!did) return null
    steps.push(did.step)
    const last = i === way.length - 1
    if (did.end && !last) return null
    if (last) return did.end === WANTED[thing] && (thing !== 'cars' || did.by === 'car') ? { thing, col, steps, end: did.end, by: did.by } : null
    // The duck walks on from where the lane has left it.
    if (did.step.rests !== null && i + 1 < way.length && way[i + 1].c === col && Math.abs(way[i + 1].r - did.step.rests) > 1) return null
  }
  return null
}

/** The duck's steps in lane `col` for a thing that lane holds, or null if no run of three or four steps ends as the thing asks. */
export function duckInLane(lane: Lane, col: number, thing: Thing): DuckShow | null {
  if (thing === 'bell') {
    const bell = lane.bell
    if (!bell || !lane.train) return null
    for (const side of [1, -1]) {
      const beside = bell.r + side
      if (beside < 0 || beside >= ROWS) continue
      const plate = { c: col + bell.dc, r: bell.r }
      const found = run(lane, col, thing, [{ c: plate.c, r: beside }, plate, { c: col, r: bell.dc === 0 ? bell.r - side : bell.r }].filter((at) => at.r >= 0 && at.r < ROWS))
      if (found && found.steps.length === 3) return found
    }
    return null
  }
  let best: DuckShow | null = null, bestScore = -Infinity
  const walk = (way: { c: number; r: number }[], length: number) => {
    if (way.length === length) {
      const found = run(lane, col, thing, way)
      if (!found) return
      // The liveliest run wins: the most steps that go somewhere, the fewest onto a car's roof, and three steps before four.
      const moves = found.steps.filter((one, i) => i === 0 || one.r !== found.steps[i - 1].rests).length
      const roofs = found.steps.filter((one) => one.landing === 'roof').length
      const score = moves * 2 - roofs * 3 - length * 0.5
      if (score > bestScore) { best = found; bestScore = score }
      return
    }
    const from = way[way.length - 1].r
    for (const dr of [-1, 1, 0]) {
      const r = from + dr
      if (r >= 0 && r < ROWS) walk([...way, { c: col, r }], length)
    }
  }
  for (const length of [3, 4]) for (let r = 0; r < ROWS; r++) walk([{ c: col, r }], length)
  return best
}

/**
 * The showing that is owed on this board, if it can start now: the newest thing a lane of the crossing holds
 * that is not in `shown`, in a lane where none of the family stands (the family does not move in a showing) and
 * where the duck's steps end as the thing asks. `lanes` are the board's ten; the crossing's own are 1 to 7.
 */
export function duckShow(lanes: readonly Lane[], shown: readonly string[], family: readonly Pawn[]): DuckShow | null {
  for (let i = THINGS.length - 1; i >= 0; i--) {
    const thing = THINGS[i]
    if (shown.includes(thing)) continue
    for (let col = 1; col <= 7; col++) {
      const lane = lanes[col]
      if (!holds(lane, thing)) continue
      const plate = lane.bell ? col + lane.bell.dc : col
      if (family.some((pawn) => pawn.c === col || (thing === 'bell' && pawn.c === plate))) continue
      const show = duckInLane(lane, col, thing)
      if (show) return show
    }
    // A thing the crossing holds is shown before an older one, so an older one waits its turn.
    if (lanes.slice(1, 8).some((lane) => holds(lane, thing))) return null
  }
  return null
}
