import { THINGS, type ThingId } from './layout'
import { BUBBLES, GRAIN, POP, SPRAY, USES } from './timeline'
import { ANIMALS, type AnimalId } from './state'

// The grid of the design sheet: four animals by the five things a finger can
// bring, the four things and the bare finger. Every cell is an answer with
// its own length, its own motion (motion.ts), its own sound (voices.ts) and
// its own loose bits. The rules never change: the same pair always gives the
// same answer.

export type Brought = ThingId | 'finger'
export const BROUGHT: readonly Brought[] = [...THINGS, 'finger']

export type CellId = `${Brought}-${AnimalId}`
export const cellOf = (brought: Brought, animal: AnimalId): CellId => `${brought}-${animal}`

/** The goat's part of water on the pony: the spray reaches it. Not a cell of its own, since no finger brings it. */
export const SOAKED = 'soaked-goat'
export type AnswerId = CellId | typeof SOAKED

/** The one thing each animal is short of. */
export const RIGHT: Record<AnimalId, ThingId> = { hens: 'scoop', pony: 'brush', goat: 'fork', pig: 'bucket' }

/** The kinds of loose bit an answer throws into the air. */
export type BitKind = 'grain' | 'drop' | 'dust' | 'straw' | 'feather' | 'bubble' | 'mud' | 'spark'

/** Where a burst of bits starts: at the thing as it tips, at the animal's mouth, at the tip of the goat's horn, all over its body, or at its feet. */
export type BitFrom = 'thing' | 'mouth' | 'horn' | 'body' | 'feet'

/** How a burst flies: it falls, it blows out sideways towards the next animal, it sprays out all round, or it rises. */
export type BitWay = 'fall' | 'blow' | 'burst' | 'rise'

/** `life` is how long a bit of the burst lasts, where the answer needs it exact: a bubble that bursts with a glop. */
export type Burst = { at: number; kind: BitKind; count: number; from: BitFrom; way: BitWay; life?: number }

export type Cell = {
  /** Seconds the answer lasts. A new use on the same animal starts the new answer at once. */
  lasts: number
  bursts: readonly Burst[]
}

const fall = (kind: BitKind, count: number, at = 0.2): Burst => ({ at, kind, count, from: 'thing', way: 'fall' })
/** A thing that runs out for a while: the same few bits again and again until `until`. */
const pour = (kind: BitKind, count: number, until: number): Burst[] => { const out: Burst[] = []; for (let at = 0.2; at < until; at += 0.16) out.push(fall(kind, count, at)); return out }
const bubble = (at: number, life: number): Burst => ({ at, kind: 'bubble', count: 1, from: 'feet', way: 'rise', life })

export const CELLS: Record<AnswerId, Cell> = {
  'scoop-hens': { lasts: 3.6, bursts: pour('grain', 6, USES['scoop-hens'].leaves - GRAIN.lands) },
  'scoop-pony': { lasts: 3.2, bursts: [...pour('grain', 3, 0.4), { at: 1.9, kind: 'grain', count: 20, from: 'mouth', way: 'blow' }] },
  'scoop-goat': { lasts: 2.8, bursts: pour('grain', 5, 0.4) },
  'scoop-pig': { lasts: 3.4, bursts: [...pour('grain', 6, 0.4), ...BUBBLES.blown.map((at) => bubble(at, BUBBLES.lasts))] },

  'bucket-hens': { lasts: 3.6, bursts: [fall('drop', 24), { at: 1.5, kind: 'drop', count: 18, from: 'body', way: 'burst' }] },
  'bucket-pony': { lasts: 3.4, bursts: [fall('drop', 24), ...SPRAY.thrown.map((at): Burst => ({ at, kind: 'drop', count: 16, from: 'body', way: 'blow' }))] },
  'bucket-goat': { lasts: 3.8, bursts: [{ at: 2.95, kind: 'drop', count: 14, from: 'mouth', way: 'rise' }] },
  'bucket-pig': { lasts: 3.6, bursts: [...pour('drop', 8, USES['bucket-pig'].leaves - 0.2), { at: 1.0, kind: 'mud', count: 16, from: 'feet', way: 'burst' }, { at: 2.6, kind: 'bubble', count: 2, from: 'feet', way: 'rise' }] },

  'brush-hens': { lasts: 3.8, bursts: [{ at: 0.35, kind: 'feather', count: 3, from: 'body', way: 'rise' }] },
  'brush-pony': { lasts: 3.6, bursts: USES['brush-pony'].strokes!.at.map((at) => ({ at, kind: 'dust', count: 7, from: 'thing', way: 'rise' }) as Burst) },
  'brush-goat': { lasts: 3.0, bursts: [{ at: 1.95, kind: 'spark', count: 1, from: 'horn', way: 'burst' }] },
  'brush-pig': { lasts: 3.8, bursts: [{ at: 1.5, kind: 'mud', count: 10, from: 'feet', way: 'burst' }] },

  'fork-hens': { lasts: 4.4, bursts: [fall('straw', 12), { at: 3.4, kind: 'straw', count: 8, from: 'body', way: 'burst' }] },
  'fork-pony': { lasts: 4.0, bursts: [fall('straw', 10), { at: 2.3, kind: 'straw', count: 4, from: 'mouth', way: 'fall' }, { at: 2.9, kind: 'straw', count: 4, from: 'mouth', way: 'fall' }] },
  'fork-goat': { lasts: 3.4, bursts: [fall('straw', 10), { at: 1.5, kind: 'straw', count: 5, from: 'mouth', way: 'fall' }] },
  'fork-pig': { lasts: 4.0, bursts: [fall('straw', 10), { at: 3.0, kind: 'straw', count: 30, from: 'body', way: 'burst' }] },

  'finger-hens': { lasts: 1.3, bursts: [{ at: 0.05, kind: 'feather', count: 1, from: 'body', way: 'rise' }] },
  'finger-pony': { lasts: 1.4, bursts: [] },
  'finger-goat': { lasts: 1.2, bursts: [] },
  'finger-pig': { lasts: 1.5, bursts: [bubble(POP.blown, POP.lasts)] },

  [SOAKED]: { lasts: 2.6, bursts: [{ at: 0.9, kind: 'drop', count: 8, from: 'body', way: 'fall' }, { at: 1.6, kind: 'drop', count: 5, from: 'body', way: 'fall' }] },
}

/**
 * How long an answer needs its thing at the animal, in seconds from the finger landing. A thing that tips its load
 * out over the animal is needed until the last of the load has left it; any other until it leaves. A thing taken
 * away before then ends the answer (farm.ts).
 */
export function neededFor(id: `${ThingId}-${AnimalId}`): number {
  const use = USES[id]
  if (use.at !== 'over') return use.leaves
  return Math.max(use.empties, ...CELLS[id].bursts.filter((burst) => burst.from === 'thing').map((burst) => burst.at + 0.02))
}

/** Every cell of the grid, row by row. */
export const GRID: readonly CellId[] = BROUGHT.flatMap((brought) => ANIMALS.map((animal) => cellOf(brought, animal)))

/** Water on the pony reaches the goat this long after it lands. */
export const SPRAY_REACHES = SPRAY.reaches
