import { LADDER } from './config'
import { LANE, PLACES, WALL } from './layout'
import { below, makeRng, type Rng } from './rng'
import type { Brick, BrickKind } from './save'

// The walls of the designed order: which bricks a wall holds and where each
// stands. Three rules of the table shape every layout, and a test holds them:
// - A jelly stands in the top row, where nothing is above it: the ball it
//   lets round or flings has the roof over it, and a swollen jelly has room.
// - A wall has at most one seed. It stands in the second column, and the
//   first column, where its vine grows, holds nothing.
// - Not every place holds a brick.

/** The items in an order drawn from `rng`. */
function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = below(rng, i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const fresh: Record<BrickKind, () => Brick> = {
  glass: () => ({ kind: 'glass', state: 'whole' }),
  jelly: () => ({ kind: 'jelly', state: 'fresh', swollen: false }),
  ice: () => ({ kind: 'ice', state: 'whole', dimpled: false, icicle: false }),
  seed: () => ({ kind: 'seed', state: 'whole', browned: false, gone: false }),
  sleepy: () => ({ kind: 'sleepy', state: 'asleep' }),
}

const LETTER: Record<string, BrickKind> = { g: 'glass', j: 'jelly', i: 'ice', s: 'seed', z: 'sleepy' }

/** The first five walls, row by row from the top: a dot is an empty place. */
const PLANS: Record<string, readonly string[]> = {
  glass: [
    'gggggg',
    'gggggg',
    'gggggg',
  ],
  jelly: [
    '.jggj.',
    'g.gg.g',
    'g.gg.g',
  ],
  ice: [
    'gj..jg',
    'ig..gi',
    '.giig.',
  ],
  sleepy: [
    'gz..zg',
    'i.gg.i',
    'g.z..g',
  ],
  seed: [
    '..jgj.',
    '.ggg.g',
    '.sg.gg',
  ],
}

function fromPlan(rows: readonly string[]): (Brick | null)[] {
  return rows.flatMap((row) => [...row].map((letter) => (letter === '.' ? null : fresh[LETTER[letter]]())))
}

/** The last wall holds all five kinds and is laid out afresh each time, inside the three rules. */
function allKinds(seed: number): (Brick | null)[] {
  const rng = makeRng(seed)
  const wall = new Array<Brick | null>(PLACES).fill(null)
  const at = (row: number, col: number) => row * WALL.cols + col
  // The seed, in its column, in any row.
  wall[at(Math.floor(rng.next() * WALL.rows), LANE.seedCol)] = fresh.seed()
  // Two jellies in the top row, outside the vine's lane.
  const top = shuffled(rng, [1, 2, 3, 4, 5]).filter((col) => wall[at(0, col)] === null)
  for (const col of top.slice(0, 2)) wall[at(0, col)] = fresh.jelly()
  // Two ice bricks, two sleepy ones and five of glass in the places that are left, and the rest stay empty.
  const free = shuffled(rng, [...wall.keys()].filter((place) => wall[place] === null && place % WALL.cols !== LANE.col))
  const kinds: BrickKind[] = ['ice', 'ice', 'sleepy', 'sleepy', 'glass', 'glass', 'glass', 'glass', 'glass']
  kinds.forEach((kind, index) => { wall[free[index]] = fresh[kind]() })
  return wall
}

/** The wall a position lays out. `seed` only matters at the last position. */
export function layWall(position: string, seed: number): (Brick | null)[] {
  const plan = PLANS[position]
  if (plan) return fromPlan(plan)
  return position === LADDER[LADDER.length - 1] ? allKinds(seed) : fromPlan(PLANS.glass)
}
