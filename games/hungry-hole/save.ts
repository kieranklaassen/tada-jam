import { isKind, mouthOf, widthOf, type Kind } from './kinds'
import type { World } from './play'
import { deserialize as readBase, isReadable, isRecord, serialize as writeBase, type GameState } from './state'
import { HOLE_START, STREET, freeSpot, layStreet, stockOf, type Standing } from './street'

// The saved record: the template's fields (state.ts) and the street as the
// child left it. Plain JSON, read defensively: each field is repaired by
// itself. While the street is not finished a record in which a thing is
// missing or doubled is repaired to the street's own set, so nothing is ever
// lost or made twice. A finished street is bare: a record that holds anything
// in its three lists is emptied, and the street is never laid out again.

export type Saved = GameState & World & {
  /** The whole number the street on screen was laid out from. */
  seed: number
}

/** A first visit, or a slot that could not be read: a new street laid out from `seed`. */
export function freshSaved(childAge: number | null, seed: number): Saved {
  const base = readBase(undefined, childAge)
  return { ...base, seed, hole: { ...HOLE_START }, belly: [], breath: [], street: layStreet(base.position, seed) }
}

function kindsOf(raw: unknown): Kind[] {
  return Array.isArray(raw) ? raw.filter(isKind) : []
}

function finite(raw: unknown): raw is number {
  return typeof raw === 'number' && Number.isFinite(raw)
}

/** Takes from `parts` only what the street's set still has room for, and counts it off. */
function keep(parts: readonly Kind[], left: Map<Kind, number>): Kind[] {
  const kept: Kind[] = []
  for (const kind of parts) {
    const room = left.get(kind) ?? 0
    if (room > 0) { kept.push(kind); left.set(kind, room - 1) }
  }
  return kept
}

/**
 * Saved state is untrusted. `seed` is the seed of this visit, used only where the record has none of its own.
 * A saved street wins over it, and a saved position over the child's age.
 */
export function deserialize(raw: unknown, childAge: number | null, seed: number): Saved {
  const base = readBase(raw, childAge)
  if (!isReadable(raw)) return freshSaved(childAge, seed)
  const laidFrom = finite(raw.seed) && raw.seed >= 0 ? Math.floor(raw.seed) >>> 0 : seed
  const hole = isRecord(raw.hole) && finite(raw.hole.x) && finite(raw.hole.z)
    ? { x: Math.max(STREET.x0, Math.min(STREET.x1, raw.hole.x)), z: Math.max(STREET.z0, Math.min(STREET.z1, raw.hole.z)) }
    : { ...HOLE_START }
  // After a float the street is bare and its things are gone through the gate; otherwise every thing of the set is somewhere.
  const left = new Map<Kind, number>()
  if (!base.finished) for (const kind of stockOf(base.position)) left.set(kind, (left.get(kind) ?? 0) + 1)
  const belly = keep(kindsOf(raw.belly), left)
  const breath = keep(kindsOf(raw.breath), left)
  const street: Standing[] = []
  if (Array.isArray(raw.street)) {
    for (const item of raw.street) {
      if (!isRecord(item) || !finite(item.x) || !finite(item.z)) continue
      const parts = keep(kindsOf(item.parts), left)
      if (parts.length === 0) continue
      street.push({ parts, x: Math.max(STREET.x0, Math.min(STREET.x1, item.x)), z: Math.max(STREET.z0, Math.min(STREET.z1, item.z)) })
    }
  }
  // Whatever the record lost stands on the street again, where the street's own layout had it or beside that.
  const mouth = { ...hole, mouth: mouthOf(belly) }
  let laid: Standing[] | null = null
  for (const [kind, missing] of left) {
    for (let count = 0; count < missing; count++) {
      laid ??= layStreet(base.position, laidFrom)
      const home = laid.find((standing) => standing.parts[0] === kind && !street.some((other) => other.x === standing.x && other.z === standing.z)) ?? { x: 0, z: 0 }
      street.push({ parts: [kind], ...freeSpot(home.x, home.z, widthOf([kind]), street, mouth) })
    }
  }
  return { ...base, seed: laidFrom, hole, belly, breath, street }
}

/** The record as it is written: the template's fields, the seed, and the street with everything at rest. */
export function serialize(saved: Saved): Saved {
  return {
    ...writeBase(saved),
    seed: saved.seed,
    hole: { x: saved.hole.x, z: saved.hole.z },
    belly: [...saved.belly],
    breath: [...saved.breath],
    street: saved.street.map((standing) => ({ parts: [...standing.parts], x: standing.x, z: standing.z })),
  }
}
