import { held, place, turned, sameCells, size, swapped, type Cell, type Way } from './cells'
import { CELLS, KINDS, type Kind } from './loads'
import { makeRng, pick, type Rng } from './rng'

// Lays out a house: its openings and its three loads, by the position in the
// designed order (ART.md). Openings are never used up, so a load can always
// go through any opening it fits, and each load laid out fits at least one.

export type Opening = { x: number; cells: Cell[] }
export type Laid = { kind: Kind; way: Way }
export type House = { openings: Opening[]; loads: Laid[] }

export const PLACES: Record<number, readonly number[]> = { 1: [0], 2: [-3, 3], 3: [-4, 0, 4] }
const RECT: Cell[] = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]

/** The eight ways, or the four with the front kept. */
export const ways = (back: boolean | null): Way[] => [false, true].filter((b) => back === null || b === back).flatMap((b) => [0, 1, 2, 3].map((turn) => ({ turn, back: b })))
export const cellsOf = (laid: Laid): Cell[] => held(CELLS[laid.kind], laid.way)
export const goesIn = (kind: Kind, way: Way, openings: readonly Opening[]): boolean => openings.some((o) => place(held(CELLS[kind], way), o.cells).fits)

/** The middle of an opening: one that is two cells wide stands half a cell to the left of its place. */
export const middleOf = (opening: Opening): number => opening.x + (size(opening.cells).w % 2 === 0 ? -0.5 : 0)
/** The column of the wall that an opening's lowest left cell is in: a column's number is the x of its middle. */
export const leftOf = (opening: Opening): number => middleOf(opening) - (size(opening.cells).w - 1) / 2

/** Whether a load's outline changes when it is seen from behind, whatever way it is turned. */
export function sided(kind: Kind): boolean {
  const back = held(CELLS[kind], { turn: 0, back: true })
  return ![0, 1, 2, 3].some((turn) => sameCells(held(CELLS[kind], { turn, back: false }), back))
}

function some<T>(rng: Rng, from: readonly T[], count: number): T[] {
  const rest = [...from], out: T[] = []
  while (out.length < count && rest.length) out.push(...rest.splice(Math.floor(rng.next() * rest.length), 1))
  return out
}

/** A way to hold a load at the start: one that goes in nowhere if there is one, on the side it has to be solved from. */
function start(rng: Rng, kind: Kind, openings: readonly Opening[], backs: boolean | null): Laid {
  const all = ways(backs), out = all.filter((way) => !goesIn(kind, way, openings))
  return { kind, way: pick(rng, out.length ? out : all) }
}

/** The first house of a first visit at the first position: the bath, the sofa, and the grandmother on her side. */
export const FIRST: House = { openings: [{ x: 0, cells: RECT }], loads: [{ kind: 'sofa', way: { turn: 1, back: false } }, { kind: 'bath', way: { turn: 1, back: false } }, { kind: 'granny', way: { turn: 0, back: false } }] }

/** Draws houses until one has every load start in a way that goes in nowhere, and gives where the stream then stands. */
export function layHouse(position: string, seed: number): House & { seed: number } {
  const rng = makeRng(seed)
  for (let tries = 0; ; tries++) {
    const house = draw(position, rng)
    if (tries > 60 || house.loads.every((laid) => !goesIn(laid.kind, laid.way, house.openings))) return { ...house, seed: rng.state }
  }
}

function draw(position: string, rng: Rng): House {
  const cut = (kind: Kind, way: Way, x: number): Opening => ({ x, cells: held(CELLS[kind], way) })
  if (position === 'wide-opening') {
    const openings = [{ x: 0, cells: RECT }]
    return { openings, loads: some<Kind>(rng, ['bath', 'sofa', 'granny', 'lamp', 'piano'], 3).map((kind) => start(rng, kind, openings, false)) }
  }
  const three = position === 'three-openings' || position === 'full-house', full = position === 'full-house'
  const pool: readonly Kind[] = position === 'own-opening' ? ['sofa', 'lamp'] : position === 'other-side' ? ['sofa', 'lamp', 'giraffe'] : KINDS
  const makers: Kind[] = some(rng, three ? KINDS : pool.filter((kind) => kind !== 'bath'), three ? 3 : 2)
  if (position === 'other-side') {
    makers[0] = pick(rng, ['piano', 'granny'] as const)
    // The sofa's and the giraffe's openings would take the piano either way round.
    if (makers[0] === 'piano') makers[1] = 'lamp'
  }
  const places = PLACES[makers.length]
  // In the second position both openings lie the same way, so the bath goes in lying or standing and never both.
  const upright = Math.floor(rng.next() * 2)
  const openings = makers.map((kind, i) => cut(kind, { turn: position === 'own-opening' ? upright + 2 * Math.floor(rng.next() * 2) : Math.floor(rng.next() * 4), back: full ? rng.next() < 0.5 : position === 'other-side' && i === 0 }, places[i]))
  // One of three openings is loose: a plain block of six, lying or standing. The load it stands in for still goes in by it.
  if (three) {
    const loose = makers.findIndex((kind) => kind !== 'giraffe' && makers.filter((other) => other !== 'giraffe').length >= 2)
    openings[loose] = { x: places[loose], cells: rng.next() < 0.5 ? RECT : turned(RECT) }
  }
  // The third load of a house with two openings is one that goes in by turning alone.
  const loads = makers.map((kind) => start(rng, kind, openings, full ? null : false))
  if (loads.length < 3) {
    const fitting = KINDS.filter((kind) => !makers.includes(kind) && ways(false).some((way) => goesIn(kind, way, openings)) && ways(false).some((way) => !goesIn(kind, way, openings)))
    loads.push(start(rng, position === 'own-opening' || fitting.length === 0 ? 'bath' : pick(rng, fitting), openings, false))
  }
  return { openings, loads: some(rng, loads, 3) }
}

/** Whether this load can be brought to go in at all, by turning alone or with a change of ends. */
export function solvable(laid: Laid, openings: readonly Opening[]): { byTurning: boolean; bySwap: boolean } {
  const turns = (way: Way): boolean => [0, 1, 2, 3].some((by) => goesIn(laid.kind, { ...way, turn: (way.turn + by) % 4 }, openings))
  return { byTurning: turns(laid.way), bySwap: turns(swapped(laid.way)) }
}
