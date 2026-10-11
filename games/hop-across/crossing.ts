import { LOOP, ROWS, mod, type Lane, type Mover } from './board'
import { LADDER } from './config'
import { below, makeRng, pick, type Rng } from './rng'

// How a crossing is laid: seven lanes between a home bank and a picnic cloth, from a position of the designed
// order (config.ts). Each position has a fixed set of layouts, and a seeded stream picks one of them; chance
// decides nothing else. Every layout has a way across with no mishap from every state play begins it in (the three
// begins tests, over begins.ts) and from every square of the bank at every phase of the lanes,
// and a lane for the duck to show each of its things in: crossing.test.ts plays a solver over all of them.

/** The lanes of one crossing, the position it was laid from, and what its home bank is: the first one with the burrow, or the cloth of the crossing before. */
export type Crossing = { from: string; home: 'burrow' | 'cloth'; lanes: Lane[] }

export const CROSSING_LANES = 7
/** How many layouts each position has. */
export const LAYOUTS = 24

/** The five new things, by the id of the position that brings each: what the duck shows, and what `shown` holds. */
export const THINGS = ['cars', 'lorry', 'logs', 'turtle', 'bell'] as const
export type Thing = (typeof THINGS)[number]

/** Whether a lane holds a thing. */
export function holds(lane: Lane, thing: Thing): boolean {
  if (thing === 'bell') return lane.train !== undefined
  const kind = thing === 'cars' ? 'car' : thing === 'logs' ? 'log' : thing
  return lane.movers.some((mover) => mover.kind === kind)
}

// One letter a lane: G grass, C a road of cars, L a road with a lorry, S a road they share, V a river of logs,
// T a river of turtles, W a river they share, X rails, Z a road with rails in it. The first lane is the one that
// shows beyond the cloth of the crossing before, so it is grass or a road of cars, and rails have grass before
// them for their bell plate, except in the last position, where the plate lies between the rails.
const PATTERNS: Record<string, readonly string[]> = {
  cars: ['CGCGCGG', 'GCGCCGG', 'CGGCGCG', 'CCGGCGC'],
  lorry: ['CGLGCGG', 'GLGCGCG', 'CGCGLGC', 'GCLGGCG'],
  logs: ['CGVGCGG', 'CGLGVGC', 'CGVVGCG', 'GCGVGLG', 'CGVGGVC'],
  turtle: ['CGVGTGC', 'CGTCLGV', 'GCGTGVG', 'GLGVGTG'],
  bell: ['CGVGGXC', 'CGXGVGC', 'GCGXGVG', 'GLGGXGV'],
  'shared-road': ['CSGVGXG', 'CGSGVGT', 'GSGCGVG', 'GSCTGXG'],
  'shared-river': ['CGWGGXC', 'GSGWGCG', 'CGWCLGT', 'GCGWGVG'],
  'rail-road': ['CGZGVGC', 'CGGZCWG', 'GSGZGTC', 'CGVGGZC'],
  all: ['CVVGZGC', 'GSWVGXC', 'CGZTVGC', 'GLXGWVC', 'CVVGSZG'],
}

function buildLane(letter: string, rng: Rng, plateInLane: boolean): Lane {
  const dir: 1 | -1 = rng.next() < 0.5 ? 1 : -1
  const at = below(rng, LOOP)
  const car = (a: number): Mover => ({ kind: 'car', at: mod(a, LOOP), dir })
  const train = () => ({ train: { arch: rng.next() < 0.5 ? ('far' as const) : ('near' as const), awake: false }, bell: { dc: plateInLane ? (0 as const) : (-1 as const), r: 1 + below(rng, ROWS - 2) } })
  const turtles = (count: number, taken: readonly number[]): Mover[] => {
    const rows = [0, 1, 2, 3, 4, 5].filter((r) => !taken.includes(r))
    const movers: Mover[] = []
    while (movers.length < count && rows.length > 0) movers.push({ kind: 'turtle', at: rows.splice(below(rng, rows.length), 1)[0], dir: 1, count: below(rng, 3) })
    return movers
  }
  switch (letter) {
    case 'C':
      return { kind: 'road', movers: rng.next() < 0.5 ? [car(at)] : [car(at), car(at + 3 + below(rng, 3))] }
    case 'L':
      return { kind: 'road', movers: [{ kind: 'lorry', at, dir }] }
    case 'S':
      return { kind: 'road', movers: [{ kind: 'lorry', at, dir }, car(at + dir * (3 + below(rng, 3)))] }
    case 'V':
      return { kind: 'river', movers: [{ kind: 'log', at, dir }, { kind: 'log', at: mod(at + 3 + below(rng, 2), LOOP), dir }] }
    case 'T':
      return { kind: 'river', movers: turtles(3 + below(rng, 2), []) }
    case 'W':
      return { kind: 'river', movers: [{ kind: 'log', at, dir }, ...turtles(2 + below(rng, 2), [])] }
    case 'X':
      return { kind: 'rails', movers: [], ...train() }
    case 'Z':
      return { kind: 'railroad', movers: rng.next() < 0.4 ? [{ kind: 'lorry', at, dir }] : rng.next() < 0.5 ? [car(at)] : [car(at), car(at + 4)], ...train() }
    default:
      return { kind: 'grass', movers: [] }
  }
}

/** The lanes one seed gives for a position: a pattern of that position, and each lane's directions and starting places. */
export function build(position: string, seed: number): Lane[] {
  const rng = makeRng(seed)
  const pattern = pick(rng, PATTERNS[position] ?? PATTERNS[LADDER[0]])
  return [...pattern].map((letter) => buildLane(letter, rng, position === 'all'))
}

/**
 * The seed of every layout, found once by trying seeds in turn and keeping those whose lanes pass the solver and
 * give the duck a lane for each thing (crossing.test.ts holds both for every seed here).
 */
export const SEEDS: Record<string, readonly number[]> = {
  cars: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  lorry: [1, 4, 6, 13, 14, 16, 17, 19, 20, 26, 29, 30, 31, 32, 34, 35, 36, 38, 39, 40, 41, 43, 44, 50],
  logs: [1, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 17, 21, 23, 25, 26, 27, 28, 30, 33, 35, 36, 37, 39],
  turtle: [2, 5, 14, 15, 24, 26, 29, 38, 40, 43, 51, 52, 58, 66, 79, 85, 91, 94, 101, 121, 122, 124, 129, 133],
  bell: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 27, 28, 29],
  'shared-road': [10, 12, 16, 27, 34, 38, 39, 41, 43, 47, 51, 57, 64, 65, 67, 72, 83, 87, 90, 91, 98, 106, 111, 112],
  'shared-river': [7, 30, 33, 43, 70, 71, 87, 88, 94, 97, 100, 101, 109, 123, 127, 128, 129, 130, 137, 144, 157, 158, 162, 165],
  'rail-road': [4, 7, 12, 17, 19, 23, 24, 26, 29, 30, 31, 34, 35, 36, 38, 39, 41, 44, 45, 46, 47, 48, 49, 53],
  all: [9, 15, 17, 22, 30, 34, 41, 45, 46, 47, 48, 53, 54, 59, 62, 65, 66, 73, 78, 81, 83, 85, 92, 96],
}

/** Layout `which` of a position, 0 up to `LAYOUTS`. */
export function layout(position: string, which: number): Lane[] {
  const id = SEEDS[position] ? position : LADDER[0]
  return build(id, SEEDS[id][mod(which, SEEDS[id].length)])
}

/** The next crossing from the seeded stream: one of the position's layouts, and where the stream then stands. */
export function lay(position: string, seed: number, home: 'burrow' | 'cloth' = 'cloth'): { crossing: Crossing; seed: number } {
  const rng = makeRng(seed)
  const id = SEEDS[position] ? position : LADDER[0]
  return { crossing: { from: id, home, lanes: layout(id, below(rng, LAYOUTS)) }, seed: rng.state }
}
