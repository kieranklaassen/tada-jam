import { LADDER } from './config'
import { KINDS, MAX_PARTS, layProblem, pinsOf, type Part, type Point } from './kit'
import { JUDGE, crossedOutcome, givenUpOn, layOut, type Showing } from './order'
import { VARIANTS, canPin, isYard, site, type Site, type VehicleId } from './sites'
import { beginCycle, deserialize as readBase, finishCycle, freshState, serialize as writeBase, type GameState } from './state'
import { TROLLEY_WEIGHTS, VEHICLES } from './vehicles'

// The whole saved state: the template's fields (state.ts, kept as copied) and
// the game's own, each read defensively and repaired by itself (ART.md, "Every
// field of the saved state"). Pure. A run is a view and is never in here; a
// part in the hand is saved where it came from, since only whole edits arrive.
//
// `finished`, `tries` and `waiting` belong to the newest sheet, the last of
// the rack. Every older sheet was judged before the next was unrolled, so runs
// on a sheet taken back from the rack never count, never move the position and
// never lay out a roll.

/** How many sheets the rack keeps, and how many tracings a sheet. */
export const RACK = 6
export const TRACINGS = 2

/** A part as it is stored: kind by its place in KINDS, the two grid points, 1 for a plank on edge, and 1 or 2 for a loose first or second end. */
type Stored = readonly [kind: number, ax: number, ay: number, bx: number, by: number, turned: 0 | 1, loose: 0 | 1 | 2]

/** Where the test trolley is: standing on the road at an x, riding under the plank there, or hanging from a pin. Null in the tray. */
export type TrolleyPlace = { x: number; under: boolean } | { pin: Point } | null

export type Sheet = {
  /** The position this sheet was laid out from, and which of its forms. */
  site: string
  variant: number
  bridge: Part[]
  tracings: Part[][]
  trolley: { weights: number; at: TrolleyPlace }
  /** The vehicles that have crossed the bridge as it stands now. */
  crossed: VehicleId[]
  /** The job vehicle has been sent home since it crossed: it stands at the near bank again. */
  home: boolean
  /** The part that gave first in the last give and the spot where it gave. One ring at most. */
  ring: { part: number; spot: readonly [number, number] } | null
  /** The parts a hat hangs on, since the bus that needs headroom passed under them. */
  hats: number[]
}

export type Save = GameState & {
  /** The rack, oldest first. The last one is the newest sheet, whose cycle `finished` and `tries` speak of. */
  sheets: Sheet[]
  /** Which sheet is on the board. */
  on: number
  /** The sheet laid out at the last judging and waiting as a roll. */
  next: { site: string; variant: number } | null
  /** The vehicles standing at the near bank of the newest sheet. */
  waiting: VehicleId[]
  /** The vehicles parked on the far bank of the newest sheet: each from its crossing until it is sent home. */
  across: VehicleId[]
  /** Failed runs of the job vehicle in the newest sheet's cycle. Never shown. */
  tries: number
  /** How many times each position has been laid out. Never shown. */
  laid: Record<string, number>
  /** The ideas whose one showing has been given. */
  shown: Showing[]
  /** The kept tracing that lies on the board, over the bridge of the sheet on the board: its place among that sheet's kept ones. Null when none is laid. */
  over: number | null
  /** The hats the chief wears: each one plucked off a part, and worn until the next sheet is unrolled. */
  worn: number
}

const SHOWINGS: readonly Showing[] = ['profile', 'prop', 'triangle', 'row', 'tube', 'thread', 'wide-base', 'arch', 'one-change']
const isVehicle = (value: unknown): value is VehicleId => typeof value === 'string' && value in VEHICLES
const whole = (value: unknown, low: number, high: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const emptySheet = (id: string, variant: number): Sheet => ({ site: id, variant, bridge: [], tracings: [], trolley: { weights: TROLLEY_WEIGHTS.fewest, at: null }, crossed: [], home: false, ring: null, hats: [] })

/**
 * A first visit. `startOn` puts another sheet on the board than the one the
 * position lays out: the toy opens on the free yard, where the whole kit is
 * (config.ts, `TOY_SHEET`). The position is left as the age set it.
 */
/** The order the vehicles come up in at the free yard. */
const FLEET = Object.keys(VEHICLES) as VehicleId[]

/** The vehicle that steps in behind another at the free yard: the next of the fleet that is on neither bank. */
function successor(after: VehicleId, taken: readonly VehicleId[]): VehicleId | null {
  const from = FLEET.indexOf(after)
  for (let i = 1; i < FLEET.length; i++) { const id = FLEET[(from + i) % FLEET.length]; if (!taken.includes(id)) return id }
  return null
}

/** The vehicle that draws up at the free yard after a crossing: the next of the fleet with more crates showing than the one that crossed, on neither bank. After the one with the most, none. */
function heavier(after: VehicleId, taken: readonly VehicleId[]): VehicleId | null {
  const from = FLEET.indexOf(after)
  for (let i = 1; i < FLEET.length; i++) { const id = FLEET[(from + i) % FLEET.length]; if (!taken.includes(id) && VEHICLES[id].crates > VEHICLES[after].crates) return id }
  return null
}

/** A free-yard sheet's own vehicle: whichever the child last sent across the bridge as it stands, and the first of the fleet until one has crossed. */
const ownOf = (sheet: Sheet, at: Site): VehicleId => (isYard(at) ? sheet.crossed[sheet.crossed.length - 1] ?? at.job : at.job)

/** Who waits at a sheet's near bank while the child builds: the sheet's own vehicle, and no other. At the free yard it is the first of the fleet, until the child sends it away for another. */
const lineFor = (at: Site): VehicleId[] => [at.job]

export function freshSave(childAge: number | null, startOn: string | null = null): Save {
  const base = freshState(childAge), first = layOut(startOn ?? base.position, {})
  return { ...base, sheets: [emptySheet(first.site, first.variant)], on: 0, next: null, waiting: lineFor(site(first.site, first.variant)), across: [], tries: 0, laid: { [first.site]: 1 }, shown: [], over: null, worn: 0 }
}

/** A list of stored parts read back as a design the sheet allows: anything that could not have been laid is left out. */
function readParts(raw: unknown, at: Site): Part[] {
  const parts: Part[] = []
  if (!Array.isArray(raw)) return parts
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 5 || !item.slice(0, 5).every((n) => typeof n === 'number' && Number.isInteger(n))) continue
    const [k, ax, ay, bx, by] = item as number[]
    if (k < 0 || k >= KINDS.length) continue
    const a: Point = [ax, ay], b: Point = [bx, by]
    const part: Part = { kind: KINDS[k], a, b, turned: KINDS[k] === 'plank' && item[5] === 1 }
    if (item[6] === 1) part.loose = 'a'
    if (item[6] === 2) part.loose = 'b'
    if (canPin(at, a) && canPin(at, b) && layProblem(part, parts, at.kit) === null) parts.push(part)
    if (parts.length >= MAX_PARTS) break
  }
  return parts
}

const writeParts = (parts: readonly Part[]): Stored[] => parts.map((p) => [KINDS.indexOf(p.kind), p.a[0], p.a[1], p.b[0], p.b[1], p.turned ? 1 : 0, p.loose === 'a' ? 1 : p.loose === 'b' ? 2 : 0])

function readTrolleyPlace(raw: unknown, at: Site): TrolleyPlace {
  if (!isRecord(raw)) return null
  const x = raw.x
  if (typeof x === 'number' && Number.isInteger(2 * x) && x > at.left[0] && x < at.right[0]) return { x, under: raw.under === true }
  const pin = raw.pin
  if (Array.isArray(pin) && pin.length === 2 && whole(pin[0], 0, 999) && whole(pin[1], 0, 999) && canPin(at, [pin[0], pin[1]])) return { pin: [pin[0], pin[1]] }
  return null
}

function readSheet(raw: unknown): Sheet | null {
  if (!isRecord(raw) || typeof raw.site !== 'string' || !LADDER.includes(raw.site)) return null
  const at = site(raw.site, whole(raw.variant, 0, 99) ? raw.variant : 0), sheet = emptySheet(at.id, at.variant)
  sheet.bridge = readParts(raw.bridge, at)
  if (Array.isArray(raw.tracings)) sheet.tracings = raw.tracings.slice(0, TRACINGS).map((t) => readParts(t, at))
  if (isRecord(raw.trolley)) {
    if (whole(raw.trolley.weights, TROLLEY_WEIGHTS.fewest, TROLLEY_WEIGHTS.most)) sheet.trolley.weights = raw.trolley.weights
    sheet.trolley.at = readTrolleyPlace(raw.trolley.at, at)
  }
  if (Array.isArray(raw.crossed)) sheet.crossed = [...new Set(raw.crossed.filter(isVehicle))]
  // Sent home means something only after a crossing.
  sheet.home = raw.home === true && sheet.crossed.includes(ownOf(sheet, at))
  const ring = raw.ring
  if (isRecord(ring) && whole(ring.part, 0, sheet.bridge.length - 1) && Array.isArray(ring.spot) && ring.spot.length === 2 && ring.spot.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    sheet.ring = { part: ring.part, spot: [ring.spot[0] as number, ring.spot[1] as number] }
  }
  if (Array.isArray(raw.hats)) sheet.hats = [...new Set(raw.hats.filter((n): n is number => whole(n, 0, sheet.bridge.length - 1)))].sort((a, b) => a - b)
  return sheet
}

/**
 * Saved state is untrusted. The template's fields are read by the template's
 * own `deserialize`; then the same record is read again for the game's fields,
 * each repaired by itself, so one damaged field never costs a bridge.
 */
export function deserialize(raw: unknown, childAge: number | null = null, startOn: string | null = null): Save {
  const base = readBase(raw, childAge), fresh = freshSave(childAge, startOn)
  if (!isRecord(raw) || raw.v !== base.v) return fresh
  const sheets = (Array.isArray(raw.sheets) ? raw.sheets : []).map(readSheet).filter((s): s is Sheet => s !== null).slice(-RACK)
  if (sheets.length === 0) return { ...fresh, position: base.position }
  const on = whole(raw.on, 0, sheets.length - 1) ? raw.on : sheets.length - 1
  const newest = sheets[sheets.length - 1], board = site(newest.site, newest.variant)
  const laid: Record<string, number> = {}
  if (isRecord(raw.laid)) for (const id of LADDER) { const n = raw.laid[id]; if (whole(n, 1, 1e6)) laid[id] = n }
  for (const sheet of sheets) laid[sheet.site] = Math.max(laid[sheet.site] ?? 0, 1)
  const next = isRecord(raw.next) && typeof raw.next.site === 'string' && LADDER.includes(raw.next.site)
    ? { site: raw.next.site, variant: site(raw.next.site, whole(raw.next.variant, 0, 99) ? raw.next.variant : 0).variant } : null
  // A roll that waits has been laid out and is counted: a state saved before that was so, or a damaged count, is put right.
  const waits = base.finished ? next ?? layOut(base.position, laid) : null
  if (waits && (laid[waits.site] ?? 0) % VARIANTS !== (waits.variant + 1) % VARIANTS) laid[waits.site] = Math.floor((laid[waits.site] ?? 0) / VARIANTS) * VARIANTS + waits.variant + 1
  // Only the newest sheet's own two vehicles can stand at its near bank, and before the judging its job vehicle does.
  // At the free yard any two of the fleet can.
  const own = (id: VehicleId) => isYard(board) || id === board.job || id === board.extra
  const waiting = Array.isArray(raw.waiting) ? [...new Set(raw.waiting.filter(isVehicle))].filter(own).slice(0, 2) : []
  return {
    ...base, sheets, on,
    // A judged cycle always has its next sheet waiting; a damaged one is laid out again from the position.
    next: waits,
    waiting: waiting.length || (base.finished && !isYard(board)) ? waiting : lineFor(board),
    // A vehicle is on one bank or the other, and two at most are parked.
    across: Array.isArray(raw.across) ? [...new Set(raw.across.filter(isVehicle))].filter((id) => own(id) && !waiting.includes(id)).slice(-2) : [],
    tries: whole(raw.tries, 0, JUDGE.badly) ? raw.tries : 0,
    laid,
    shown: Array.isArray(raw.shown) ? SHOWINGS.filter((idea) => (raw.shown as unknown[]).includes(idea)) : [],
    // Only a tracing the sheet on the board keeps can lie on it. A slot saved before these two were kept has neither.
    over: whole(raw.over, 0, sheets[on].tracings.length - 1) ? raw.over : null,
    worn: whole(raw.worn, 0, 1e6) ? raw.worn : 0,
  }
}

export function serialize(state: Save): unknown {
  return {
    ...writeBase(state),
    sheets: state.sheets.map((sheet) => ({
      site: sheet.site, variant: sheet.variant, bridge: writeParts(sheet.bridge), tracings: sheet.tracings.map(writeParts),
      trolley: sheet.trolley, crossed: sheet.crossed, home: sheet.home, ring: sheet.ring, hats: sheet.hats,
    })),
    on: state.on, next: state.next, waiting: state.waiting, across: state.across, tries: state.tries, laid: state.laid, shown: state.shown, over: state.over, worn: state.worn,
  }
}

const withSheet = (state: Save, change: (sheet: Sheet) => Sheet): Save => ({ ...state, sheets: state.sheets.map((sheet, i) => (i === state.on ? change(sheet) : sheet)) })

/** The newest sheet is on the board: the one sheet whose runs are judged. */
export const onNewest = (state: Save): boolean => state.on === state.sheets.length - 1

/** Whether two parts share a pin: the ringed part's neighbours are the parts whose change clears the ring. */
const touches = (p: Part, q: Part) => pinsOf(p).some((e) => pinsOf(q).some((f) => e[0] === f[0] && e[1] === f[1]))
const samePart = (p: Part, q: Part) => p.kind === q.kind && p.turned === q.turned && p.loose === q.loose && p.a[0] === q.a[0] && p.a[1] === q.a[1] && p.b[0] === q.b[0] && p.b[1] === q.b[1]

/**
 * The child changed the bridge on the board. Nobody has crossed the new one
 * yet. The pencil ring stays while its part and that part's neighbours are as
 * they were, and goes when one of them is changed. A hat stays on its part
 * for as long as that part is on the bridge.
 */
export function edit(state: Save, bridge: readonly Part[]): Save {
  // A change that changes nothing (a stick turned: a square is the same both ways) leaves the bridge as it stands, and
  // whoever has crossed it has still crossed it.
  const was = state.sheets[state.on].bridge
  if (was.length === bridge.length && was.every((part, index) => samePart(part, bridge[index]))) return state
  return withSheet(state, (sheet) => {
    let ring: Sheet['ring'] = null
    const ringed = sheet.ring ? sheet.bridge[sheet.ring.part] : undefined
    if (sheet.ring && ringed) {
      const at = bridge.findIndex((p) => samePart(p, ringed))
      const neighbours = (parts: readonly Part[]) => parts.filter((p) => !samePart(p, ringed) && touches(p, ringed)).map((p) => JSON.stringify(p)).sort().join()
      if (at >= 0 && neighbours(bridge) === neighbours(sheet.bridge)) ring = { part: at, spot: sheet.ring.spot }
    }
    // A hat is on the part, however it is turned or pinned: it leaves only when the part does.
    const still = (worn: Part) => bridge.findIndex((p) => p.kind === worn.kind && p.a[0] === worn.a[0] && p.a[1] === worn.a[1] && p.b[0] === worn.b[0] && p.b[1] === worn.b[1])
    const hats = [...new Set(sheet.hats.filter((index) => sheet.bridge[index]).map((index) => still(sheet.bridge[index])).filter((index) => index >= 0))].sort((a, b) => a - b)
    return { ...sheet, bridge: [...bridge], crossed: [], home: false, ring, hats }
  })
}

/**
 * A run failed. A give moves the one ring to its spot; a run that failed with
 * no part giving leaves the ring where it was. On the newest sheet a failed
 * run of the job vehicle counts towards the judging, and the eighth judges
 * the cycle and lays out a way back in.
 */
export function failedRun(state: Save, vehicle: VehicleId, ring: Sheet['ring']): Save {
  const board = state.sheets[state.on], job = site(board.site, board.variant).job
  let next = ring ? withSheet(state, (sheet) => ({ ...sheet, ring })) : state
  if (!onNewest(state) || (vehicle !== job && !isYard({ id: board.site })) || state.finished) return next
  next = { ...next, tries: Math.min(state.tries + 1, JUDGE.badly) }
  return givenUpOn(next.tries) ? judge(next, 'badly') : next
}

/**
 * A vehicle reached the far bank and parks there. The job vehicle's crossing
 * fades the ring. On the newest sheet its first crossing judges the cycle and
 * the one other vehicle draws up at the near bank. `hats` are the parts the
 * bus that needs headroom left a hat on.
 */
export function crossed(state: Save, vehicle: VehicleId, hats: readonly number[] = []): Save {
  const board = state.sheets[state.on], at = site(board.site, board.variant)
  // At the free yard whichever vehicle the child sent is the sheet's own.
  const own = vehicle === at.job || isYard(at)
  let next = withSheet(state, (sheet) => ({
    ...sheet,
    crossed: sheet.crossed.includes(vehicle) ? sheet.crossed : [...sheet.crossed, vehicle],
    // Across again, the job vehicle is parked on the far bank once more.
    home: own ? false : sheet.home,
    ring: own ? null : sheet.ring,
    hats: [...new Set([...sheet.hats, ...hats.filter((index) => whole(index, 0, sheet.bridge.length - 1))])].sort((a, b) => a - b),
  }))
  if (!onNewest(state)) return next
  let waiting = state.waiting.filter((id) => id !== vehicle)
  let across = state.across.includes(vehicle) ? state.across : [...state.across, vehicle]
  if (own && !state.finished) next = judge(next, crossedOutcome(state.tries))
  if (isYard(at)) {
    // Two are parked at most: a third arriving, the first of them has gone on its way. And the line fills up behind.
    across = across.slice(-2)
    // The one that draws up shows more crates than the one that crossed; after the caterpillar bus nobody does.
    const front = waiting[0] ?? heavier(vehicle, across)
    waiting = front ? [front, ...waiting.slice(1)] : []
  } else if (vehicle === at.job && !waiting.includes(at.extra) && !across.includes(at.extra)) {
    // The other vehicle draws up when the job vehicle first reaches the far bank, however the cycle was judged.
    waiting = [...waiting, at.extra]
  }
  return { ...next, waiting, across }
}

/** A vehicle crossed the bridge on its way home: it has crossed the bridge as it stands, like one that crossed outward. */
export const crossedHome = (state: Save, vehicle: VehicleId): Save =>
  state.sheets[state.on].crossed.includes(vehicle) ? state : withSheet(state, (sheet) => ({ ...sheet, crossed: [...sheet.crossed, vehicle] }))

/** A hat left hanging on a part the bus passed under, whichever way it was going. */
export const leaveHats = (state: Save, parts: readonly number[]): Save =>
  parts.length === 0 ? state : withSheet(state, (sheet) => ({ ...sheet, hats: [...new Set([...sheet.hats, ...parts.filter((index) => whole(index, 0, sheet.bridge.length - 1))])].sort((a, b) => a - b) }))

/**
 * A parked vehicle was sent home across the bridge and stands at the near bank
 * again. On the newest sheet it stands beside whoever waits there, and
 * `waiting` holds that. On any sheet the entry itself remembers that the job
 * vehicle went home, so a sheet taken back from the rack shows it there too.
 */
export function sentHome(state: Save, vehicle: VehicleId): Save {
  const board = state.sheets[state.on], at = site(board.site, board.variant)
  if (vehicle !== at.job && vehicle !== at.extra && !isYard(at)) return state
  let next = state
  if (vehicle === ownOf(board, at) && board.crossed.includes(vehicle) && !board.home) next = withSheet(next, (sheet) => ({ ...sheet, home: true }))
  if (onNewest(state) && !state.waiting.includes(vehicle)) {
    // At the free yard the line is two long: it stands behind whoever is at the front.
    const waiting = isYard(at) ? [...state.waiting.slice(0, 1), vehicle] : [...state.waiting, vehicle]
    next = { ...next, waiting, across: state.across.filter((id) => id !== vehicle) }
  }
  return next
}

/**
 * The vehicles at the near bank of the sheet on the board. The newest sheet
 * keeps its own list. A sheet taken back from the rack is rebuilt from its
 * own entry: its job vehicle is parked on the far bank if it has crossed the
 * bridge as it stands and has not been sent home since, and waits at the near
 * bank otherwise.
 */
export function standing(state: Save): VehicleId[] {
  if (onNewest(state)) return state.waiting
  const sheet = state.sheets[state.on], job = ownOf(sheet, site(sheet.site, sheet.variant))
  return sheet.crossed.includes(job) && !sheet.home ? [] : [job]
}

/** The cycle is judged: the position moves by the template's rule, and the next sheet is laid out from it at once. */
function judge(state: Save, outcome: Parameters<typeof finishCycle>[1]): Save {
  if (state.finished) return state
  // At the free yard, the last position, it stays whatever the outcome: there is nothing to go back to that the child has not done.
  const moved = finishCycle(state, state.position === LADDER[LADDER.length - 1] ? 'mixed' : outcome)
  // Laid out now, and counted now: the next time this position comes round it is in its next form.
  const next = layOut(moved.position, state.laid)
  return { ...state, ...moved, next, laid: { ...state.laid, [next.site]: (state.laid[next.site] ?? 0) + 1 } }
}

/** The child unrolled the waiting sheet: the next cycle begins, and the oldest sheet leaves a full rack. */
export function unroll(state: Save): Save {
  if (!state.next) return state
  const { site: id, variant } = state.next
  const sheets = [...state.sheets, emptySheet(id, variant)].slice(-RACK)
  return { ...state, ...beginCycle(state), sheets, on: sheets.length - 1, next: null, waiting: lineFor(site(id, variant)), across: [], tries: 0, over: null, worn: 0 }
}

/** The child turned to another sheet of the rack. A tracing laid on the sheet that leaves the board is lifted. Nothing else changes: the newest sheet keeps its tries and its waiting vehicles while it lies there. */
export const turnTo = (state: Save, on: number): Save => (Number.isInteger(on) && on >= 0 && on < state.sheets.length ? { ...state, on, over: on === state.on ? state.over : null } : state)

/** The bridge as it stands is copied onto tracing paper. A third tracing takes the place of the oldest, so a tracing that lay on the board is lifted. */
export const trace = (state: Save): Save => ({ ...withSheet(state, (sheet) => ({ ...sheet, tracings: [...sheet.tracings, sheet.bridge.map((p) => ({ ...p }))].slice(-TRACINGS) })), over: null })

/** A kept tracing of the sheet on the board is laid on the board, or, with null, the one that lies there is lifted. */
export const layTracing = (state: Save, which: number | null): Save => ({ ...state, over: which })

/** A tracing and the bridge change places, and no tracing lies on the board. */
export function swapTracing(state: Save, which: number): Save {
  const sheet = state.sheets[state.on]
  if (!sheet.tracings[which]) return state
  const tracings = sheet.tracings.map((t, i) => (i === which ? sheet.bridge : t))
  return { ...withSheet(edit(state, sheet.tracings[which]), (changed) => ({ ...changed, tracings })), over: null }
}

export const markShown = (state: Save, idea: Showing): Save => (state.shown.includes(idea) ? state : { ...state, shown: [...state.shown, idea] })

export const setTrolley = (state: Save, weights: number, at: TrolleyPlace): Save =>
  withSheet(state, (sheet) => ({ ...sheet, trolley: { weights: Math.max(TROLLEY_WEIGHTS.fewest, Math.min(TROLLEY_WEIGHTS.most, Math.round(weights))), at } }))

/** A hat plucked off the part it hung on: the chief wears it, on top of any it has. */
export const pluckHat = (state: Save, part: number): Save => ({ ...withSheet(state, (sheet) => ({ ...sheet, hats: sheet.hats.filter((index) => index !== part) })), worn: state.worn + 1 })

/** The vehicles parked on the far bank of the sheet on the board: the newest sheet's own list, or, on a sheet taken back from the rack, its job vehicle if it has crossed the bridge as it stands and has not been sent home since. */
export function parked(state: Save): VehicleId[] {
  if (onNewest(state)) return state.across
  const sheet = state.sheets[state.on], job = ownOf(sheet, site(sheet.site, sheet.variant))
  return sheet.crossed.includes(job) && !sheet.home ? [job] : []
}

/** The child brought a waiting vehicle to the front of the line at the near bank. */
export function toFront(state: Save, vehicle: VehicleId): Save {
  if (!onNewest(state) || !state.waiting.includes(vehicle)) return state
  return { ...state, waiting: [vehicle, ...state.waiting.filter((id) => id !== vehicle)] }
}

/**
 * At the free yard the child sent the waiting vehicle away: it leaves, and the
 * next of the fleet draws up in its place. One waits at a time, and by sending
 * away the ones it does not want the child has whichever vehicle it picks.
 * Anywhere else, and when no other vehicle is free to come, nothing changes.
 */
export function sentAway(state: Save, vehicle: VehicleId): Save {
  if (!onNewest(state) || state.waiting[0] !== vehicle) return state
  const board = state.sheets[state.on]
  if (!isYard({ id: board.site })) return state
  const next = successor(vehicle, [...state.across, ...state.waiting])
  return next ? { ...state, waiting: [next, ...state.waiting.slice(1)] } : state
}

/** A part gave under the test trolley: the one ring moves to its spot. No run is counted. */
export const ringed = (state: Save, ring: NonNullable<Sheet['ring']>): Save => withSheet(state, (sheet) => ({ ...sheet, ring }))

/** The sheet's own vehicle crossed, outward or home: the pencil ring is rubbed out. Another vehicle's crossing leaves it. */
export function unringed(state: Save, vehicle: VehicleId): Save {
  const board = state.sheets[state.on], at = site(board.site, board.variant)
  return board.ring && (vehicle === at.job || isYard(at)) ? withSheet(state, (sheet) => ({ ...sheet, ring: null })) : state
}
