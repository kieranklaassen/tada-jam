import { COLS, PER_KIND, ROWS, SHAPE, isKind, type Placed } from './blocks'
import { FIRST_RUG } from './config'
import { deserialize as readBase, isReadable, isRecord, serialize as writeBase, type GameState } from './state'

// The whole saved state of Block Castle: the template's fields and the blocks
// on the rug (ART.md, "The designed order, and what is stored").
//
// `finished` is true while it is evening and the castle stands. `blocks` is
// the rug, in the order the blocks were set down. A block that is not in the
// list is in the basket, in its kind's place there. A block's level is not
// stored: it is worked out again from the list, so a damaged record cannot
// put a block in the air or inside another.

export type CastleState = GameState & {
  blocks: Placed[]
}

/** What lies on the rug at a first visit for this age. Younger than the first row, or no age, takes the first row; older than the last takes the last. */
export function firstRug(childAge: number | null): Placed[] {
  let row = FIRST_RUG[0]
  if (childAge !== null) for (const candidate of FIRST_RUG) if (childAge >= candidate.fromAge) row = candidate
  return row.blocks.map((block) => ({ kind: block.kind, col: block.col, row: block.row }))
}

/** The blocks of a saved list that this build can stand on the rug: a known kind, a place on the rug, and no more of a kind than the basket holds. The rest are dropped. */
function readBlocks(raw: unknown): Placed[] | null {
  if (!Array.isArray(raw)) return null
  const blocks: Placed[] = []
  const used = new Map<string, number>()
  for (const item of raw) {
    if (!isRecord(item) || !isKind(item.kind)) continue
    const { col, row } = item
    if (typeof col !== 'number' || typeof row !== 'number' || !Number.isInteger(col) || !Number.isInteger(row)) continue
    if (row < 0 || row >= ROWS || col < 0 || col > COLS - SHAPE[item.kind].wide) continue
    const count = used.get(item.kind) ?? 0
    if (count >= PER_KIND) continue
    used.set(item.kind, count + 1)
    blocks.push({ kind: item.kind, col, row })
  }
  return blocks
}

/**
 * Saved state is untrusted. A record that is not this game's gives a fresh
 * state for the child's age. Inside a record each field is repaired by
 * itself: a rug that cannot be read is a bare rug, since the child has
 * played and a first-visit rug would be a rug they never made.
 */
export function deserialize(raw: unknown, childAge: number | null = null): CastleState {
  const base = readBase(raw, childAge)
  if (!isReadable(raw)) return { ...base, blocks: firstRug(childAge) }
  return { ...base, blocks: readBlocks(raw.blocks) ?? [] }
}

export function serialize(state: CastleState): CastleState {
  return { ...writeBase(state), blocks: state.blocks.map((block) => ({ kind: block.kind, col: block.col, row: block.row })) }
}
