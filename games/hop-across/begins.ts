import { CLOTH_COL, HOME_COL, LOOP, ROWS, type Hop, type Lane, type Pawn } from './board'
import { RIGHT, STAY } from './careful'
import { THINGS, holds } from './crossing'
import { hop, startShowing } from './play'
import { boardOf, type Saved } from './save'
import { STATE_VERSION } from './state'
import { HORIZON, PHASES, timeline, wayFrom, ways, type Timeline } from './solver'

// For the tests only: every state in which play can begin a crossing, made by the game's own code (`hop` and
// `startShowing` of play.ts over the lanes as save.ts lays them on the board), so that the solver is run on what
// a child meets and not on a tidier board. Nothing in the game imports this.
//
// Play begins a crossing in two ways:
//   on the bank  a first visit, or a load of one: the family on the home bank, every lane as it was laid, and
//                then the duck's lane stepped alone by its showing, if one is owed.
//   by a slide   she hopped off the cloth onto the crossing's first lane. That lane stood beyond the cloth and
//                took a step at every hop of the crossing before, while the other six stood still; she starts
//                on it, on whatever her hop left her on or under; and then the duck's showing, if one is owed.
// A load changes nothing in either, since nothing moves without a hop.

const grass = (): Lane => ({ kind: 'grass', movers: [] })
const pawn = (c: number, r: number): Pawn => ({ c, r, flat: false, on: null, dry: { c, r } })
const mishaps = (events: readonly { type: string; who?: number }[]): number => events.filter((event) => (event.type === 'flatten' || event.type === 'spit') && event.who === 0).length

/** Every `shown` a crossing can be met with: all shown, and each of its things still owed. */
function shownSets(lanes: readonly Lane[]): string[][] {
  return [[...THINGS], ...THINGS.filter((thing) => lanes.some((lane) => holds(lane, thing))).map((thing) => THINGS.filter((other) => other !== thing))]
}

/**
 * The state once the showing that is owed, if any, has been settled; null for a second copy of the state with
 * nothing owed. `startShowing` reads the lanes, what is shown and the columns the family stands in, and changes
 * the lanes and what is shown; so its answer is kept for the next state that is the same in those.
 */
const settled = new Map<string, { lanes: Lane[]; shown: string[] } | null>()
function shownTo(saved: Saved, shown: string[], first: boolean): Saved | null {
  const key = JSON.stringify([saved.crossing, saved.next.lanes[0], shown, saved.family.map((one) => one.c)])
  let found = settled.get(key)
  if (found === undefined) {
    const started = startShowing({ ...saved, shown })
    found = started ? { lanes: started.saved.crossing.lanes, shown: started.saved.shown } : null
    if (settled.size > 400) settled.clear()
    settled.set(key, found)
  }
  if (!found) return first ? { ...saved, shown } : null
  return { ...saved, crossing: { ...saved.crossing, lanes: found.lanes }, shown: found.shown }
}

export type Begin = { label: string; saved: Saved }

/** A first visit to a crossing of these lanes: on the bank, with each showing that can be owed. */
export function onTheBank(position: string, lanes: readonly Lane[]): Begin[] {
  const saved: Saved = {
    v: STATE_VERSION, position, finished: false,
    crossing: { from: position, home: 'burrow', lanes: lanes.map((lane) => ({ ...lane, movers: lane.movers.map((mover) => ({ ...mover })) })) },
    next: { from: position, home: 'cloth', lanes: Array.from({ length: lanes.length }, grass) },
    family: [2, 3, 4, 5].map((r) => pawn(HOME_COL, r)),
    mishaps: 0, shown: [], seed: 1,
  }
  const out: Begin[] = []
  shownSets(lanes).forEach((shown, i) => {
    const state = shownTo(saved, shown, i === 0)
    if (state) out.push({ label: `on the bank, ${i === 0 ? 'nothing owed' : `the duck shows ${THINGS.find((thing) => !shown.includes(thing))}`}`, saved: state })
  })
  return out
}

/**
 * Every slide onto a crossing of these lanes: its first lane stepped `steps` times beyond the cloth (a lane of
 * cars or of grass comes round in eight), the hop onto it from each free row of the cloth, and each showing
 * that can be owed. A hop that does not slide the board is reported by `problem`.
 */
export function bySlide(position: string, lanes: readonly Lane[]): { begins: Begin[]; problem: string | null } {
  let before: Saved = {
    v: STATE_VERSION, position, finished: true,
    crossing: { from: position, home: 'burrow', lanes: Array.from({ length: lanes.length }, grass) },
    next: { from: position, home: 'cloth', lanes: lanes.map((lane) => ({ ...lane, movers: lane.movers.map((mover) => ({ ...mover })) })) },
    family: [1, 2, 3, 4].map((r) => pawn(CLOTH_COL, r)),
    mishaps: 0, shown: [...THINGS], seed: 1,
  }
  const begins: Begin[] = []
  for (let steps = 0; steps < LOOP; steps++) {
    for (let row = 1; row < ROWS; row++) {
      const others = [1, 2, 3, 4, 5].filter((r) => r !== row)
      const turn = hop({ ...before, family: [pawn(CLOTH_COL, row), ...others.slice(0, 3).map((r) => pawn(CLOTH_COL, r))] }, RIGHT)
      if (!turn.slide) return { begins, problem: `the hop off the cloth from row ${row} after ${steps} steps slid nothing` }
      shownSets(lanes).forEach((shown, i) => {
        const state = shownTo(turn.saved, shown, i === 0)
        if (state) begins.push({ label: `by a slide after ${steps + 1} steps of the first lane, from row ${row}, ${i === 0 ? 'nothing owed' : `the duck shows ${THINGS.find((thing) => !shown.includes(thing))}`}`, saved: state })
      })
    }
    before = hop(before, STAY).saved
  }
  // The first lane has come round: eight steps cover every state it can be met in.
  if (JSON.stringify(before.next.lanes[0]) !== JSON.stringify(lanes[0])) return { begins, problem: 'the first lane does not come round in eight steps' }
  return { begins, problem: null }
}

/** The timelines and their open squares already worked out, by the lanes they start from: many beginnings of one layout share them. */
export type Worked = Map<string, { line: Timeline; open: Uint8Array[] }>

function worked(lanes: readonly Lane[], cache: Worked): { line: Timeline; open: Uint8Array[] } {
  const key = JSON.stringify(lanes)
  let found = cache.get(key)
  if (!found) {
    const line = timeline(lanes, PHASES + HORIZON)
    found = { line, open: ways(line) }
    cache.set(key, found)
  }
  return found
}

/**
 * What is wrong with a beginning, or null. If she begins flat under a car she first waits, by hops on the spot
 * through the game's own `hop`, until she has peeled up; a second flattening while she waits is a fault. Then
 * there must be a way to the cloth with no mishap from where she is, within the timeline (`PHASES + HORIZON`
 * steps), and the game's own `hop`, with the whole family following her, must agree: she is never flattened or
 * spat out on the way, and she arrives. On the bank she may hop about before she sets off, so there every row at
 * every phase of the lanes must have a way as well.
 */
export function unsolvedBegin(begin: Saved, cache: Worked = new Map()): string | null {
  let saved = begin
  for (let n = 0; saved.family[0].flat; n++) {
    const turn = hop(saved, STAY)
    if (n > 8 || mishaps(turn.events) > 0) return 'she is flattened again before she can get up'
    saved = turn.saved
  }
  const rabbit = saved.family[0]
  const first = worked(boardOf(saved).lanes, cache)
  if (rabbit.c === HOME_COL) {
    for (let t0 = 0; t0 < PHASES; t0++) for (let row = 1; row < ROWS; row++) if (!first.open[t0][HOME_COL * ROWS + row]) return `no way across from row ${row} of the bank at step ${t0}`
  }
  const way = wayFrom(first.line, first.open, rabbit.c, rabbit.r, 0)
  if (!way) return `no way across from lane ${rabbit.c}, row ${rabbit.r}`
  if (replayed(saved, way) === null) return null
  // The solver knows the rabbit alone. A small one that falls behind her can step on a bell plate she kept off,
  // and the train then catches her. Where that spoils the way found, the game itself is searched, family and
  // all, for a way on which it does not.
  STATS.spoiled++
  return played(saved) ? null : `every way from lane ${rabbit.c}, row ${rabbit.r} has a mishap once the family follows her`
}

/** How often the family spoiled the way the solver found, for the test's report. */
export const STATS = { spoiled: 0 }

const WAYS: readonly Hop[] = [{ dc: -1, dr: 0 }, { dc: 0, dr: 1 }, { dc: 0, dr: -1 }, STAY, RIGHT]

/**
 * Whether the game's own `hop`, with the whole family, has a way to the cloth with no mishap for the rabbit. A
 * search over whole states of the board, the one furthest across first, each state tried once; it gives up
 * after `most` hops.
 */
export function played(saved: Saved, most = 40000): boolean {
  const seen = new Set<string>()
  const open: Saved[][] = Array.from({ length: CLOTH_COL }, () => [])
  open[saved.family[0].c].push(saved)
  for (let hops = 0; hops < most; ) {
    let c = CLOTH_COL - 1
    while (c >= 0 && open[c].length === 0) c--
    if (c < 0) return false
    const now = open[c].pop()!
    // The last pushed is tried first, so a hop to the right is pushed last.
    for (const asked of WAYS) {
      const turn = hop(now, asked)
      hops++
      if (mishaps(turn.events) > 0 || turn.slide) continue
      if (turn.saved.family[0].c === CLOTH_COL) return true
      const key = JSON.stringify([turn.saved.crossing.lanes, turn.saved.family])
      if (seen.has(key)) continue
      seen.add(key)
      open[turn.saved.family[0].c].push(turn.saved)
    }
  }
  return false
}

/** The hops played through the game's own `hop`, with the whole family: what goes wrong for the rabbit, or null. */
export function replayed(saved: Saved, hops: readonly Hop[]): string | null {
  let now = saved
  for (let n = 0; n < hops.length; n++) {
    const turn = hop(now, hops[n])
    if (mishaps(turn.events) > 0) return `the way the solver found has a mishap at hop ${n + 1} once the family follows her`
    now = turn.saved
    if (turn.slide) return 'the way the solver found leaves the crossing'
  }
  return now.family[0].c === CLOTH_COL ? null : 'the way the solver found does not reach the cloth'
}
