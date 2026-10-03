import { LADDER } from './config'
import { MOST, isCreatureKind, isHatKind, type CreatureKind, type HatKind } from './kinds'
import { FIRST_SEED, layCrew, layFirstCrew } from './layout'
import { MOST_SLIPS, ready, type Change, type Creature, type Loose, type World } from './rules'
import { STATE_VERSION, deserialize as readPosition, freshState, type GameState } from './state'

// Everything Hats for All saves (ART.md, "What is stored"): the template's
// fields (the position in the designed order and whether the cycle on screen
// is finished) and, around them, the world as it was left. The template's
// state.ts is kept as it came; this module reads the same raw record a second
// time for the game's own fields, as that file asks.
//
// Saved state is untrusted. Each field is repaired by itself. The fields that
// describe the world hang together (a hat on a head must be a hat of the
// tile), so a world that does not hold together is replaced as one thing, by
// a crew freshly laid out for the saved position. Nothing here can throw.

export type Saved = GameState & World & {
  /** The state of the seeded stream that lays out crews: the crew that waits is laid out from this and the position. */
  seed: number
  /** The first showing of giving a hat has been played, or is past showing. It plays once ever. */
  shown: boolean
}

/** A first visit: the position the age gives, and the first crew ever, with the showing still to play. */
export function freshSave(childAge: number | null): Saved {
  const base = freshState(childAge), first = layFirstCrew(base.position, FIRST_SEED)
  // Where the first crew has no room for a leader there is nothing to show.
  return { ...base, ...first.world, seed: first.seed, shown: first.leader < 0 }
}

const isIndex = (value: unknown, below: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < below

function readTile(raw: unknown): HatKind[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MOST || !raw.every(isHatKind)) return null
  return [...raw]
}

/** The creatures, the loose hats and the tile as one thing: they are kept only if every hat is in one place and every creature on a spot of its own. */
function readWorld(record: Record<string, unknown>): Pick<World, 'crew' | 'tile' | 'loose'> | null {
  const tile = readTile(record.tile)
  if (!tile || !Array.isArray(record.crew) || record.crew.length < 1 || record.crew.length > MOST || !Array.isArray(record.loose)) return null
  const crew: Creature[] = [], loose: Loose[] = [], out: number[] = []
  for (const entry of record.crew as unknown[]) {
    if (typeof entry !== 'object' || entry === null) return null
    const { kind, spot, hats } = entry as Record<string, unknown>
    if (!isCreatureKind(kind) || !isIndex(spot, MOST) || !Array.isArray(hats) || !hats.every((hat) => isIndex(hat, tile.length))) return null
    crew.push({ kind, spot, hats: [...(hats as number[])] })
    out.push(...(hats as number[]))
  }
  for (const entry of record.loose as unknown[]) {
    if (typeof entry !== 'object' || entry === null) return null
    const { hat, spot } = entry as Record<string, unknown>
    if (!isIndex(hat, tile.length) || !isIndex(spot, MOST)) return null
    loose.push({ hat, spot })
    out.push(hat)
  }
  if (new Set(out).size !== out.length) return null
  if (new Set(crew.map((creature) => creature.spot)).size !== crew.length || new Set(crew.map((creature) => creature.kind)).size !== crew.length) return null
  crew.sort((a, b) => a.spot - b.spot)
  return { crew, tile, loose }
}

/**
 * Reads a saved record. Anything that is not this game's record, or was
 * written by a newer build, gives a first visit. Inside a record the position
 * and the finished mark are the template's to repair, and each field of the
 * game's own is repaired here.
 */
export function deserialize(raw: unknown, childAge: number | null = null, ladder: readonly string[] = LADDER): Saved {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw) || (raw as Record<string, unknown>).v !== STATE_VERSION) return freshSave(childAge)
  const record = raw as Record<string, unknown>, base = readPosition(raw, childAge, ladder)
  const seed = isIndex(record.seed, 2 ** 32) ? record.seed : FIRST_SEED
  // A record of this game has been played: a damaged mark never brings the first showing back.
  const shown = record.shown !== false
  const kept = readWorld(record)
  if (!kept) {
    const laid = layCrew(base.position, seed)
    return { ...base, finished: false, ...laid.world, seed: laid.seed, shown: true }
  }
  // The changes: at most two, each one a coming or a going, and each needs someone to come or to go.
  let changes: Change[] = Array.isArray(record.changes) ? (record.changes as unknown[]).filter((change): change is Change => change === 'come' || change === 'leave').slice(0, 2) : []
  const present = kept.crew.map((creature) => creature.kind)
  const guest: CreatureKind | null = isCreatureKind(record.guest) && !present.includes(record.guest) ? record.guest : null
  if (!guest || kept.crew.length >= MOST) changes = changes.filter((change) => change !== 'come')
  if (kept.crew.length <= 1) changes = changes.filter((change) => change !== 'leave')
  const leaves = changes.includes('leave')
  const leaver = !leaves ? null : isIndex(record.leaver, MOST) && kept.crew.some((creature) => creature.spot === record.leaver) ? record.leaver : kept.crew[kept.crew.length - 1].spot
  const world: World = { ...kept, changes, guest: changes.includes('come') ? guest : null, leaver, slips: isIndex(record.slips, MOST_SLIPS + 1) ? record.slips : 0 }
  // A finished cycle is one whose crew is ready. A record that says finished over a crew that is not carries the cycle on.
  return { ...base, finished: base.finished && ready(world), ...world, seed, shown }
}

/** Exactly the saved fields, as plain JSON, and nothing else that may ride on the object. */
export function serialize(saved: Saved): Saved {
  return {
    v: STATE_VERSION, position: saved.position, finished: saved.finished, seed: saved.seed, shown: saved.shown,
    crew: saved.crew.map((creature) => ({ kind: creature.kind, spot: creature.spot, hats: [...creature.hats] })),
    tile: [...saved.tile],
    loose: saved.loose.map((entry) => ({ hat: entry.hat, spot: entry.spot })),
    changes: [...saved.changes], guest: saved.guest, leaver: saved.leaver, slips: saved.slips,
  }
}

/** The world inside a save, for the rules. */
export function worldOf(saved: Saved): World {
  return { crew: saved.crew, tile: saved.tile, loose: saved.loose, changes: saved.changes, guest: saved.guest, leaver: saved.leaver, slips: saved.slips }
}
