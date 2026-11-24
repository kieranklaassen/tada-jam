import type { Cell, Way } from './cells'
import { FIRST, layHouse, type House, type Laid, type Opening } from './houses'
import { isKind, type Kind } from './loads'
import { STATE_VERSION, deserialize as readPosition, freshState, isRecord, type GameState } from './state'

// Everything The Removal Bears saves (ART.md, "stored"), around the template's
// own fields. Saved state is untrusted: a house that does not hold together is
// replaced as one thing by one freshly laid out for the saved position.

export type Load = Laid & { at: 'cart' | 'hands' | 'in'; /** Which of the loft's three places it stands in. */ slot: number }
export type Saved = GameState & {
  seed: number
  openings: Opening[]
  loads: Load[]
  /** The house to come, laid out when the last load of this one went in: its first load waits on the cart. */
  next: House | null
  /** Where the bears stand along the house. */
  x: number
  /** The wide bear is at the left end. */
  wideLeft: boolean
  bumps: number
  /** The first showing has been played. */
  shown: boolean
  /** The showing of changing ends has been played. */
  shownEnds: boolean
}

export const MOST_BUMPS = 99

export function move(house: House): Load[] {
  return house.loads.map((laid, i) => ({ ...laid, at: i === 0 ? 'hands' : 'cart', slot: 0 }))
}

export function freshSave(childAge: number | null, seed: number): Saved {
  const base = freshState(childAge)
  const house = base.position === 'wide-opening' ? { ...FIRST, seed } : layHouse(base.position, seed)
  return { ...base, seed: house.seed, openings: house.openings, loads: move(house), next: null, x: 0, wideLeft: true, bumps: 0, shown: false, shownEnds: false }
}

const whole = (value: unknown, low: number, high: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high

function readCells(raw: unknown): Cell[] | null {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > 9) return null
  if (!raw.every((c) => Array.isArray(c) && c.length === 2 && whole(c[0], 0, 2) && whole(c[1], 0, 2))) return null
  const cells = raw.map((c) => [c[0], c[1]] as Cell)
  if (new Set(cells.map(String)).size !== cells.length || !cells.some((c) => c[0] === 0) || !cells.some((c) => c[1] === 0)) return null
  return cells
}

function readOpenings(raw: unknown): Opening[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 3) return null
  const places = raw.length === 1 ? [0] : raw.length === 2 ? [-3, 3] : [-4, 0, 4], out: Opening[] = []
  for (const [i, one] of raw.entries()) {
    const cells = isRecord(one) ? readCells(one.cells) : null
    if (!cells || (one as Record<string, unknown>).x !== places[i]) return null
    out.push({ x: places[i], cells })
  }
  return out
}

function readLaid(raw: unknown): Laid | null {
  if (!isRecord(raw) || !isKind(raw.kind) || !isRecord(raw.way) || !whole(raw.way.turn, 0, 3)) return null
  const way: Way = { turn: raw.way.turn, back: raw.way.back === true }
  return { kind: raw.kind as Kind, way }
}

function readHouse(raw: unknown): House | null {
  if (!isRecord(raw) || !Array.isArray(raw.loads) || raw.loads.length !== 3) return null
  const openings = readOpenings(raw.openings), loads = raw.loads.map(readLaid)
  if (!openings || loads.some((laid) => !laid) || new Set(loads.map((laid) => laid!.kind)).size !== 3) return null
  return { openings, loads: loads as Laid[] }
}

function readLoads(raw: unknown[], laid: Laid[]): Load[] | null {
  const loads = laid.map((one, i): Load => {
    const { at, slot } = raw[i] as Record<string, unknown>
    return { ...one, at: at === 'in' || at === 'hands' ? at : 'cart', slot: whole(slot, 0, 2) ? slot : 0 }
  })
  if (loads.filter((load) => load.at === 'hands').length > 1) return null
  const slots = loads.filter((load) => load.at === 'in').map((load) => load.slot)
  return new Set(slots).size === slots.length ? loads : null
}

export function deserialize(raw: unknown, childAge: number | null, firstSeed: number): Saved {
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return freshSave(childAge, firstSeed)
  const base = readPosition(raw, childAge), seed = whole(raw.seed, 0, 2 ** 32 - 1) ? raw.seed : firstSeed
  const shown = raw.shown !== false, shownEnds = raw.shownEnds !== false, wideLeft = raw.wideLeft !== false
  const house = readHouse(raw), loads = house ? readLoads(raw.loads as unknown[], house.loads) : null
  if (!house || !loads) {
    const laid = layHouse(base.position, seed)
    return { ...base, finished: false, seed: laid.seed, openings: laid.openings, loads: move(laid), next: null, x: 0, wideLeft, bumps: 0, shown: true, shownEnds }
  }
  // A house is over exactly when everything is in it, and an ended house has a next one waiting.
  const finished = loads.every((load) => load.at === 'in')
  let next = finished ? readHouse(raw.next) : null, seedNow = seed
  if (finished && !next) { const laid = layHouse(base.position, seed); next = { openings: laid.openings, loads: laid.loads }; seedNow = laid.seed }
  return {
    ...base, finished, seed: seedNow, openings: house.openings, loads, next,
    x: typeof raw.x === 'number' && Number.isFinite(raw.x) ? Math.max(-4.5, Math.min(4.5, raw.x)) : 0,
    wideLeft, bumps: whole(raw.bumps, 0, MOST_BUMPS) ? raw.bumps : 0, shown, shownEnds,
  }
}

const plainLaid = (laid: Laid): Laid => ({ kind: laid.kind, way: { turn: laid.way.turn, back: laid.way.back } })
const plainOpening = (o: Opening): Opening => ({ x: o.x, cells: o.cells.map((c) => [c[0], c[1]] as Cell) })

export function serialize(s: Saved): Saved {
  return {
    v: STATE_VERSION, position: s.position, finished: s.finished, seed: s.seed,
    openings: s.openings.map(plainOpening),
    loads: s.loads.map((load) => ({ ...plainLaid(load), at: load.at, slot: load.slot })),
    next: s.next ? { openings: s.next.openings.map(plainOpening), loads: s.next.loads.map(plainLaid) } : null,
    x: s.x, wideLeft: s.wideLeft, bumps: s.bumps, shown: s.shown, shownEnds: s.shownEnds,
  }
}
