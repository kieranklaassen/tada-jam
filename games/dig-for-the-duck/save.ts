import { GROUNDS, decode, encode, type GroundKind } from './cells'
import { LADDER } from './config'
import { VARIANTS, layHill } from './hills'
import { deserialize as readBase, isReadable, serialize as writeBase, type GameState } from './state'

// What the game saves beyond the template's three fields (state.ts): the hill
// on screen, cell by cell, the three residents' states and which grounds have
// been shown. Each field is repaired by itself.

export type Save = GameState & {
  /** The id of the hill on screen. It differs from `position` only while `finished` is true. */
  hill: string
  /** Which layout of that hill: 0, 1 or 2. */
  variant: number
  /** The hill as one string, a character for each cell (cells.ts). */
  cells: string
  mole: 'home' | 'afloat'
  worm: 'dry' | 'squelching'
  badger: 'dry' | 'rained'
  /** The grounds whose first showing has started. */
  shown: GroundKind[]
}

/** A hill of an id and a layout as first laid, with everyone at home and dry. */
export function freshHill(hill: string, variant: number): Pick<Save, 'hill' | 'variant' | 'cells' | 'mole' | 'worm' | 'badger'> {
  return { hill, variant, cells: encode(layHill(hill, variant).cells), mole: 'home', worm: 'dry', badger: 'dry' }
}

export function freshSave(childAge: number | null): Save {
  const base = readBase(null, childAge)
  return { ...base, ...freshHill(base.position, 0), shown: [] }
}

/** The grounds of a saved list that this game knows, each once. */
function readShown(raw: unknown): GroundKind[] {
  if (!Array.isArray(raw)) return []
  return GROUNDS.filter((kind) => kind !== 'sand' && raw.includes(kind))
}

/**
 * Saved state is untrusted. A hill that cannot be read is laid out afresh at the position, unfinished, with
 * everyone at home, and what has been shown is kept.
 */
export function deserialize(raw: unknown, childAge: number | null = null): Save {
  const base = readBase(raw, childAge)
  if (!isReadable(raw)) return freshSave(childAge)
  const shown = readShown(raw.shown)
  const hill = typeof raw.hill === 'string' && LADDER.includes(raw.hill) ? raw.hill : null
  const variant = typeof raw.variant === 'number' && Number.isInteger(raw.variant) && raw.variant >= 0 && raw.variant < VARIANTS ? raw.variant : null
  // A hill that cannot be restored starts fresh and unfinished, or the game would open on a floated duck in a dry bath.
  if (hill === null || variant === null || !decode(raw.cells)) return { ...base, finished: false, ...freshHill(base.position, variant ?? 0), shown }
  // While a hill is unfinished it is the hill of the position; a finished one is the hill before it, or the last hill of all.
  const at = LADDER.indexOf(base.position), before = LADDER[Math.max(0, at - 1)]
  const fits = base.finished ? hill === before || hill === base.position : hill === base.position
  if (!fits) return { ...base, finished: false, ...freshHill(base.position, variant), shown }
  return {
    ...base, hill, variant, cells: raw.cells as string,
    mole: raw.mole === 'afloat' ? 'afloat' : 'home',
    worm: raw.worm === 'squelching' ? 'squelching' : 'dry',
    badger: raw.badger === 'rained' ? 'rained' : 'dry',
    shown,
  }
}

export function serialize(save: Save): Save {
  return { ...writeBase(save), hill: save.hill, variant: save.variant, cells: save.cells, mole: save.mole, worm: save.worm, badger: save.badger, shown: [...save.shown] }
}
