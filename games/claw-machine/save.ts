import type { PositionId } from './config'
import { GOBBLER, GOBBLERS, takes, type GobblerId } from './gobblers'
import { MOST_GROUPS, isPosition } from './order'
import { PLACES } from './places'
import { STATE_VERSION, deserialize, serialize } from './state'
import { readToy, type Toy } from './toys'
import { STACK_MOST, emptyTray, nearestFree } from './tray'
import { FIRST_SEED, cratesFor, newWorld, trayIsClear, waitingAt, type Crate, type Cycle, type Where, type World } from './world'

// What goes into ctx.storage for the game, and how it is read back (ART.md,
// "The designed order, and what is stored"). state.ts keeps the version, the
// position and whether the cycle has ended; this module wraps it and reads
// the same record again for the game's own fields, each repaired by itself.
// Saved state is untrusted: an old or damaged slot never stops the game from
// opening, and whatever can be kept is kept, the position first of all.

export type SavedToy = Toy & ({ place: number; level: number } | { slot: number; nth: number })

export type Saved = {
  v: typeof STATE_VERSION
  position: string
  finished: boolean
  cycle: { from: PositionId; harder: boolean; crews: GobblerId[][]; sort: number; toys: SavedToy[]; tried: boolean[]; misses: number }
  shown: { colour: boolean; kind: boolean; size: boolean }
  crates: Crate[]
}

/** The most toys a load holds. */
const MOST_TOYS = PLACES - 1

export function serializeWorld(world: World): Saved {
  const { cycle } = world
  return {
    ...serialize({ v: STATE_VERSION, position: world.position, finished: world.finished }),
    cycle: {
      from: cycle.from, harder: cycle.harder, crews: cycle.crews.map((crew) => crew.slice()), sort: cycle.sort,
      toys: cycle.toys.map((toy, i) => {
        const where = cycle.where[i]
        return where.at === 'tray' ? { ...toy, place: where.place, level: where.level } : { ...toy, slot: where.slot, nth: where.nth }
      }),
      tried: cycle.tried.slice(), misses: cycle.misses,
    },
    shown: { ...world.shown },
    crates: world.crates.map((crate) => ({ ...crate })),
  }
}

const isRecord = (raw: unknown): raw is Record<string, unknown> => typeof raw === 'object' && raw !== null && !Array.isArray(raw)
const isCount = (raw: unknown, most: number): raw is number => typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw <= most

/** The crews of a saved cycle, or null: one to three crews, each of two or three different gobblers that go by one attribute. */
function readCrews(raw: unknown): GobblerId[][] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 3) return null
  const crews: GobblerId[][] = []
  for (const crew of raw) {
    if (!Array.isArray(crew) || crew.length < 2 || crew.length > MOST_GROUPS) return null
    if (!crew.every((id) => (GOBBLERS as readonly unknown[]).includes(id))) return null
    const ids = crew as GobblerId[]
    if (new Set(ids).size !== ids.length || new Set(ids.map((id) => GOBBLER[id].by)).size !== 1) return null
    crews.push(ids.slice())
  }
  return crews
}

/**
 * A saved cycle, or null when its load or its crews cannot be read: then a
 * fresh cycle is laid out. Inside a cycle that can be read, where each toy is
 * is repaired toy by toy: a toy with no readable place, or one that would
 * stand in the air or in a belly that does not take it, is set on a free
 * place of the tray. No toy is ever dropped from a load.
 */
function readCycle(raw: unknown): Cycle | null {
  if (!isRecord(raw) || !isPosition(raw.from) || !Array.isArray(raw.toys)) return null
  const crews = readCrews(raw.crews)
  if (!crews || raw.toys.length < 1 || raw.toys.length > MOST_TOYS) return null
  const toys: Toy[] = []
  for (const one of raw.toys) {
    const toy = readToy(one)
    // Every toy must have exactly one home in every crew, or the load cannot be sorted.
    if (!toy || !crews.every((crew) => crew.filter((id) => takes(id, toy)).length === 1)) return null
    toys.push(toy)
  }
  const sort = isCount(raw.sort, crews.length - 1) ? raw.sort : 0
  const crew = crews[sort]
  // Bellies first, in the order saved; then the tray, lowest first; then whatever is left, onto free places.
  const where: (Where | null)[] = toys.map(() => null)
  const saved = raw.toys as Record<string, unknown>[]
  const bellies = crew.map(() => [] as { toy: number; nth: number }[])
  saved.forEach((one, toy) => {
    if (isCount(one.slot, crew.length - 1) && isCount(one.nth, MOST_TOYS) && takes(crew[one.slot], toys[toy])) bellies[one.slot].push({ toy, nth: one.nth })
  })
  bellies.forEach((belly, slot) => belly.sort((a, b) => a.nth - b.nth || a.toy - b.toy).forEach(({ toy }, nth) => { where[toy] = { at: 'belly', slot, nth } }))
  const tray = emptyTray()
  const standing = saved.map((one, toy) => ({ one, toy })).filter(({ one, toy }) => where[toy] === null && isCount(one.place, PLACES - 1))
  standing.sort((a, b) => (isCount(a.one.level, STACK_MOST) ? a.one.level : 0) - (isCount(b.one.level, STACK_MOST) ? b.one.level : 0) || a.toy - b.toy)
  for (const { one, toy } of standing) {
    const place = one.place as number
    if (tray[place].length >= STACK_MOST) continue
    where[toy] = { at: 'tray', place, level: tray[place].length }
    tray[place].push(toy)
  }
  toys.forEach((_, toy) => {
    if (where[toy]) return
    const place = Math.max(0, nearestFree(tray, 0, 0))
    where[toy] = { at: 'tray', place, level: tray[place].length }
    tray[place].push(toy)
  })
  const tried = toys.map((_, toy) => Array.isArray(raw.tried) && raw.tried[toy] === true)
  return {
    from: raw.from, harder: raw.harder === true, crews, sort, toys, where: where as Where[], tried,
    misses: isCount(raw.misses, toys.length * crews.length) ? raw.misses : 0,
  }
}

/** The crates of an ended cycle as saved, or null when they are not the ones this position would have. */
function readCrates(raw: unknown, expected: Crate[]): Crate[] | null {
  if (!Array.isArray(raw) || raw.length !== expected.length) return null
  const crates: Crate[] = []
  for (let i = 0; i < raw.length; i++) {
    const crate = raw[i]
    if (!isRecord(crate) || crate.from !== expected[i].from || !isCount(crate.seed, 0xffffffff)) return null
    crates.push({ from: expected[i].from, seed: crate.seed })
  }
  return crates
}

export function deserializeWorld(raw: unknown, childAge: number | null): World {
  // state.ts decides whether this is the game's record at a version it can read, and repairs the position.
  const base = deserialize(raw, childAge)
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return newWorld(childAge)
  const position = base.position as PositionId
  const shownRaw = isRecord(raw.shown) ? raw.shown : {}
  const shown = { colour: shownRaw.colour === true, kind: shownRaw.kind === true, size: shownRaw.size === true }
  const cycle = readCycle(raw.cycle)
  // With no load that can be read, the world is as a first visit finds it, at the stored position: a bare tray
  // and one crate waiting. That is both a first visit saved before its crate was taken and a damaged cycle: the
  // child's place in the order is kept either way, and nothing starts until the crate is taken.
  if (!cycle) {
    const crate = Array.isArray(raw.crates) && isRecord(raw.crates[0]) && isCount(raw.crates[0].seed, 0xffffffff) ? raw.crates[0].seed : FIRST_SEED
    return waitingAt(position, shown, crate)
  }
  // An ending is an ending exactly when the last toy of the last sort is in a belly, whatever the flag says:
  // a tray still holding toys is never shown as ended, and a finished load is never left with no crate to take.
  const ended = trayIsClear(cycle) && cycle.sort === cycle.crews.length - 1
  if (!ended) return { position, finished: false, cycle, shown, crates: [] }
  const expected = cratesFor(position, cycle)
  return { position, finished: true, cycle, shown, crates: readCrates(raw.crates, expected) ?? expected }
}
