import { BROOD, type BroodId, type Id } from './layout'

// Who belongs to whom, worked out from one field: each chick's mother. A
// mother is an identity, kept when an egg becomes a chick, and that is how a
// ring can close.

/** Each chick's mother. An egg has none. */
export type Mothers = ReadonlyMap<BroodId, Id | null>

export type Line =
  /** Follows the chain up to something that follows nothing: a thing, the hen, or an egg that is not opened. */
  | { kind: 'root'; root: Id; depth: number }
  /** The chain runs into a ring. `depth` is 0 for a member. */
  | { kind: 'ring'; ring: BroodId[]; depth: number }

export type Gait = 'boot' | 'teapot' | 'pig' | 'farmer' | 'ball' | 'bell' | 'hen' | 'egg' | 'self' | 'lost'
export const GAITS: readonly Gait[] = ['boot', 'teapot', 'pig', 'farmer', 'ball', 'bell', 'hen', 'egg', 'self', 'lost']

export function isBrood(id: Id | null): id is BroodId {
  return id !== null && (BROOD as readonly string[]).includes(id)
}

export function lineOf(id: BroodId, mothers: Mothers): Line {
  const path: BroodId[] = [id]
  let at: Id = id
  for (;;) {
    const up: Id | null = isBrood(at) ? mothers.get(at) ?? null : null
    if (up === null) return { kind: 'root', root: at, depth: path.length - (isBrood(at) ? 1 : 0) }
    if (!isBrood(up)) return { kind: 'root', root: up, depth: path.length }
    const seen = path.indexOf(up)
    if (seen >= 0) return { kind: 'ring', ring: path.slice(seen), depth: seen }
    path.push(up)
    at = up
  }
}

/** The ring a chick is itself in, or null. */
export function ringOf(id: BroodId, mothers: Mothers): BroodId[] | null {
  const line = lineOf(id, mothers)
  return line.kind === 'ring' && line.depth === 0 ? line.ring : null
}

/** How a chick walks and what it tries to sound like. */
export function gaitOf(id: BroodId, mothers: Mothers): Gait {
  const line = lineOf(id, mothers)
  if (line.kind === 'ring') return line.ring.length === 1 ? 'self' : 'lost'
  if (isBrood(line.root) || line.root === 'puddle') return 'egg'
  return line.root
}

/** The steps down the chain from what it copies: 1 for a chick whose mother is a thing. */
export function stepsOf(id: BroodId, mothers: Mothers): number {
  const line = lineOf(id, mothers)
  return line.kind === 'ring' ? line.depth + 1 : Math.max(1, line.depth)
}

/** The chicks whose mother this is. */
export function childrenOf(id: Id, mothers: Mothers): BroodId[] {
  return BROOD.filter((c) => mothers.get(c) === id && c !== id)
}
