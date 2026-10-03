import { LADDER } from './config'
import { KINDS, MAX_PARTS, layProblem, type Part, type Point } from './kit'
import { JUDGE, crossedOutcome, givenUpOn, layOut, type Showing } from './order'
import { canPin, site, type Site, type VehicleId } from './sites'
import { beginCycle, deserialize as readBase, finishCycle, freshState, serialize as writeBase, type GameState } from './state'
import { TROLLEY_WEIGHTS, VEHICLES } from './vehicles'

// The whole saved state: the template's fields (state.ts, kept as copied) and
// the game's own, each read defensively and repaired by itself (ART.md, "Every
// field of the saved state"). Pure. A run is a view and is never in here; a
// part in the hand is saved where it came from, since only whole edits arrive.

/** How many sheets the rack keeps, and how many tracings a sheet. */
export const RACK = 6
export const TRACINGS = 2

/** A part as it is stored: kind by its place in KINDS, the two grid points, and 1 for a plank on edge. */
type Stored = readonly [kind: number, ax: number, ay: number, bx: number, by: number, turned: 0 | 1]

export type Sheet = {
  /** The position this sheet was laid out from, and which of its forms. */
  site: string
  variant: number
  bridge: Part[]
  tracings: Part[][]
  /** The test trolley: its weights, and the x on the road where it stands, or null in the tray. */
  trolley: { weights: number; x: number | null }
  /** The vehicles that have crossed the bridge as it stands now. */
  crossed: VehicleId[]
  /** The part that gave first in the last failed run and the spot where it gave, until that place is changed. */
  ring: { part: number; spot: readonly [number, number] } | null
}

export type Save = GameState & {
  /** The rack, oldest first. */
  sheets: Sheet[]
  /** Which sheet is on the board. */
  on: number
  /** The sheet laid out at the last judging and waiting as a roll. */
  next: { site: string; variant: number } | null
  /** The vehicle standing at the near bank. */
  waiting: VehicleId
  /** Failed runs of the job vehicle in this cycle. Never shown. */
  tries: number
  /** How many times each position has been laid out. Never shown. */
  laid: Record<string, number>
  /** The ideas whose one showing has been given. */
  shown: Showing[]
}

const SHOWINGS: readonly Showing[] = ['profile', 'prop', 'triangle', 'row', 'tube', 'thread', 'wide-base', 'arch', 'one-change']
const isVehicle = (value: unknown): value is VehicleId => typeof value === 'string' && value in VEHICLES
const whole = (value: unknown, low: number, high: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high

const emptySheet = (id: string, variant: number): Sheet => ({ site: id, variant, bridge: [], tracings: [], trolley: { weights: TROLLEY_WEIGHTS.fewest, x: null }, crossed: [], ring: null })

export function freshSave(childAge: number | null): Save {
  const base = freshState(childAge), first = layOut(base.position, {})
  return { ...base, sheets: [emptySheet(first.site, first.variant)], on: 0, next: null, waiting: site(first.site, first.variant).job, tries: 0, laid: { [first.site]: 1 }, shown: [] }
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
    if (canPin(at, a) && canPin(at, b) && layProblem(part, parts, at.kit) === null) parts.push(part)
    if (parts.length >= MAX_PARTS) break
  }
  return parts
}

const writeParts = (parts: readonly Part[]): Stored[] => parts.map((p) => [KINDS.indexOf(p.kind), p.a[0], p.a[1], p.b[0], p.b[1], p.turned ? 1 : 0])

function readSheet(raw: unknown): Sheet | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  if (typeof record.site !== 'string' || !LADDER.includes(record.site)) return null
  const at = site(record.site, whole(record.variant, 0, 99) ? record.variant : 0), sheet = emptySheet(at.id, at.variant)
  sheet.bridge = readParts(record.bridge, at)
  if (Array.isArray(record.tracings)) sheet.tracings = record.tracings.slice(0, TRACINGS).map((t) => readParts(t, at))
  const trolley = record.trolley as Record<string, unknown> | null | undefined
  if (typeof trolley === 'object' && trolley !== null) {
    if (whole(trolley.weights, TROLLEY_WEIGHTS.fewest, TROLLEY_WEIGHTS.most)) sheet.trolley.weights = trolley.weights
    const x = trolley.x
    if (typeof x === 'number' && Number.isInteger(2 * x) && x > at.left[0] && x < at.right[0]) sheet.trolley.x = x
  }
  if (Array.isArray(record.crossed)) sheet.crossed = [...new Set(record.crossed.filter(isVehicle))]
  const ring = record.ring as Record<string, unknown> | null | undefined
  if (typeof ring === 'object' && ring !== null && whole(ring.part, 0, sheet.bridge.length - 1) && Array.isArray(ring.spot) && ring.spot.length === 2 && ring.spot.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    sheet.ring = { part: ring.part, spot: [ring.spot[0] as number, ring.spot[1] as number] }
  }
  return sheet
}

/**
 * Saved state is untrusted. The template's fields are read by the template's
 * own `deserialize`; then the same record is read again for the game's fields,
 * each repaired by itself, so one damaged field never costs a bridge.
 */
export function deserialize(raw: unknown, childAge: number | null = null): Save {
  const base = readBase(raw, childAge), fresh = freshSave(childAge)
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw) || (raw as Record<string, unknown>).v !== base.v) return fresh
  const record = raw as Record<string, unknown>
  const sheets = (Array.isArray(record.sheets) ? record.sheets : []).map(readSheet).filter((s): s is Sheet => s !== null).slice(-RACK)
  if (sheets.length === 0) return { ...fresh, position: base.position }
  const on = whole(record.on, 0, sheets.length - 1) ? record.on : sheets.length - 1
  const board = site(sheets[on].site, sheets[on].variant)
  const laid: Record<string, number> = {}
  if (typeof record.laid === 'object' && record.laid !== null) for (const id of LADDER) { const n = (record.laid as Record<string, unknown>)[id]; if (whole(n, 1, 1e6)) laid[id] = n }
  for (const sheet of sheets) laid[sheet.site] = Math.max(laid[sheet.site] ?? 0, 1)
  const nextRaw = record.next as Record<string, unknown> | null | undefined
  const next = typeof nextRaw === 'object' && nextRaw !== null && typeof nextRaw.site === 'string' && LADDER.includes(nextRaw.site)
    ? { site: nextRaw.site, variant: site(nextRaw.site, whole(nextRaw.variant, 0, 99) ? nextRaw.variant : 0).variant } : null
  // A judged cycle always has its next sheet waiting; a damaged one is laid out again from the position.
  const finished = base.finished
  return {
    ...base, sheets, on,
    next: finished ? next ?? layOut(base.position, laid) : null,
    waiting: isVehicle(record.waiting) && (record.waiting === board.job || record.waiting === board.extra) ? record.waiting : board.job,
    tries: whole(record.tries, 0, JUDGE.badly) ? record.tries : 0,
    laid,
    shown: Array.isArray(record.shown) ? SHOWINGS.filter((idea) => (record.shown as unknown[]).includes(idea)) : [],
  }
}

export function serialize(state: Save): unknown {
  return {
    ...writeBase(state),
    sheets: state.sheets.map((sheet) => ({
      site: sheet.site, variant: sheet.variant, bridge: writeParts(sheet.bridge), tracings: sheet.tracings.map(writeParts),
      trolley: { weights: sheet.trolley.weights, x: sheet.trolley.x }, crossed: sheet.crossed, ring: sheet.ring,
    })),
    on: state.on, next: state.next, waiting: state.waiting, tries: state.tries, laid: state.laid, shown: state.shown,
  }
}

const withSheet = (state: Save, change: (sheet: Sheet) => Sheet): Save => ({ ...state, sheets: state.sheets.map((sheet, i) => (i === state.on ? change(sheet) : sheet)) })

/** Whether two parts share a pin: the ringed part's neighbours are the parts whose change clears the ring. */
const touches = (p: Part, q: Part) => [p.a, p.b].some((e) => [q.a, q.b].some((f) => e[0] === f[0] && e[1] === f[1]))
const samePart = (p: Part, q: Part) => p.kind === q.kind && p.turned === q.turned && p.a[0] === q.a[0] && p.a[1] === q.a[1] && p.b[0] === q.b[0] && p.b[1] === q.b[1]

/**
 * The child changed the bridge on the board. Nobody has crossed the new one
 * yet. The pencil ring stays while its part and that part's neighbours are as
 * they were, and goes when one of them is changed.
 */
export function edit(state: Save, bridge: readonly Part[]): Save {
  return withSheet(state, (sheet) => {
    let ring: Sheet['ring'] = null
    const ringed = sheet.ring ? sheet.bridge[sheet.ring.part] : undefined
    if (sheet.ring && ringed) {
      const at = bridge.findIndex((p) => samePart(p, ringed))
      const neighbours = (parts: readonly Part[]) => parts.filter((p) => !samePart(p, ringed) && touches(p, ringed)).map((p) => JSON.stringify(p)).sort().join()
      if (at >= 0 && neighbours(bridge) === neighbours(sheet.bridge)) ring = { part: at, spot: sheet.ring.spot }
    }
    return { ...sheet, bridge: [...bridge], crossed: [], ring }
  })
}

/** A run failed. The spot is ringed, and a failed run of the job vehicle counts towards the judging; the eighth judges the cycle and lays out a way back in. */
export function failedRun(state: Save, vehicle: VehicleId, ring: Sheet['ring']): Save {
  const board = state.sheets[state.on], job = site(board.site, board.variant).job
  let next = withSheet(state, (sheet) => ({ ...sheet, ring }))
  if (vehicle !== job || state.finished) return next
  next = { ...next, tries: Math.min(state.tries + 1, JUDGE.badly) }
  return givenUpOn(next.tries) ? judge(next, 'badly') : next
}

/** A vehicle reached the far bank. The job vehicle's first crossing judges the cycle; then the other vehicle draws up. */
export function crossed(state: Save, vehicle: VehicleId): Save {
  const board = state.sheets[state.on], at = site(board.site, board.variant)
  let next = withSheet(state, (sheet) => ({ ...sheet, crossed: sheet.crossed.includes(vehicle) ? sheet.crossed : [...sheet.crossed, vehicle], ring: null }))
  if (vehicle === at.job && !state.finished) next = judge(next, crossedOutcome(state.tries))
  return { ...next, waiting: vehicle === at.job ? at.extra : next.waiting }
}

/** The cycle is judged: the position moves by the template's rule, and the next sheet is laid out from it at once. */
function judge(state: Save, outcome: Parameters<typeof finishCycle>[1]): Save {
  if (state.finished) return state
  const moved = finishCycle(state, outcome)
  return { ...state, ...moved, next: layOut(moved.position, state.laid) }
}

/** The child unrolled the waiting sheet: the next cycle begins, and the oldest sheet leaves a full rack. */
export function unroll(state: Save): Save {
  if (!state.next) return state
  const { site: id, variant } = state.next
  const sheets = [...state.sheets, emptySheet(id, variant)].slice(-RACK)
  return { ...state, ...beginCycle(state), sheets, on: sheets.length - 1, next: null, waiting: site(id, variant).job, tries: 0, laid: { ...state.laid, [id]: (state.laid[id] ?? 0) + 1 } }
}

/** The child turned to another sheet of the rack. Its own job vehicle waits there if it has not crossed, and the other one if it has. */
export function turnTo(state: Save, on: number): Save {
  if (!Number.isInteger(on) || on < 0 || on >= state.sheets.length) return state
  const sheet = state.sheets[on], at = site(sheet.site, sheet.variant)
  return { ...state, on, waiting: sheet.crossed.includes(at.job) ? at.extra : at.job }
}

/** The bridge as it stands is copied onto tracing paper. A third tracing takes the place of the oldest. */
export const trace = (state: Save): Save => withSheet(state, (sheet) => ({ ...sheet, tracings: [...sheet.tracings, sheet.bridge.map((p) => ({ ...p }))].slice(-TRACINGS) }))

/** A tracing and the bridge change places. */
export function swapTracing(state: Save, which: number): Save {
  const sheet = state.sheets[state.on]
  if (!sheet.tracings[which]) return state
  const tracings = sheet.tracings.map((t, i) => (i === which ? sheet.bridge : t))
  return withSheet(edit(state, sheet.tracings[which]), (changed) => ({ ...changed, tracings }))
}

export const markShown = (state: Save, idea: Showing): Save => (state.shown.includes(idea) ? state : { ...state, shown: [...state.shown, idea] })

export const setTrolley = (state: Save, weights: number, x: number | null): Save =>
  withSheet(state, (sheet) => ({ ...sheet, trolley: { weights: Math.max(TROLLEY_WEIGHTS.fewest, Math.min(TROLLEY_WEIGHTS.most, Math.round(weights))), x } }))
