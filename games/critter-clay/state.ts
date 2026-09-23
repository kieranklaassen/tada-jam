import { clampWalk, WAKE_LANDING } from './layout'
import { canTake, CAPACITY, FAMILY, isHue, isPartKind, nextHue, PART_KINDS, type Family, type Hue, type Part, type PartKind } from './parts'

// The workshop's saved shape. One sleepy lump waits on the turntable (or the
// turntable is empty while four critters are awake), every awake critter
// keeps its parts, colour, place, and temperament seed, and the tray
// remembers which colour each part will come out in next. Saved state is
// untrusted: `deserialize` repairs what it can and defaults the rest.

export const STATE_VERSION = 1
export const MAX_AWAKE = 4

export type CritterSave = {
  id: number
  hue: Hue
  parts: Part[]
  x: number
  z: number
  heading: number
  seed: number
}

export type WorkshopState = {
  v: typeof STATE_VERSION
  sleeper: CritterSave | null
  awake: CritterSave[]
  tray: Record<PartKind, Hue>
  nextHue: Hue
  nextId: number
}

/** The tray starts with every colour on show, contrasting with the first (pink) lump. */
const TRAY_START: Record<PartKind, Hue> = {
  legStub: 0,
  legLong: 1,
  eye: 1,
  earRound: 0,
  earPoint: 1,
  earFlop: 0,
  tailCurl: 1,
  tailLong: 0,
  head: 1,
  horn: 0,
}

export function noseHue(body: Hue): Hue {
  return body === 2 ? 1 : body === 1 ? 2 : 1
}

function seedFor(id: number): number {
  let h = (id * 0x9e3779b1) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
  return (h ^ (h >>> 13)) >>> 0
}

export function newLump(state: WorkshopState): CritterSave {
  const lump: CritterSave = { id: state.nextId, hue: state.nextHue, parts: [], x: 0, z: 0, heading: 0, seed: seedFor(state.nextId) }
  state.nextId += 1
  state.nextHue = nextHue(state.nextHue)
  return lump
}

export function defaultWorkshop(): WorkshopState {
  const state: WorkshopState = { v: STATE_VERSION, sleeper: null, awake: [], tray: { ...TRAY_START }, nextHue: 2, nextId: 1 }
  state.sleeper = newLump(state)
  return state
}

/** Take one part out of the tray: it comes out in the slot's colour, and the slot regrows in the next one. */
export function takeFromTray(state: WorkshopState, kind: PartKind): Hue {
  const hue = state.tray[kind]
  state.tray[kind] = nextHue(hue)
  return hue
}

export function attach(critter: CritterSave, part: Part): boolean {
  if (!canTake(critter.parts, part.kind)) return false
  critter.parts.push({ kind: part.kind, hue: part.hue })
  return true
}

export function detach(critter: CritterSave, index: number): Part | null {
  if (index < 0 || index >= critter.parts.length) return null
  return critter.parts.splice(index, 1)[0]
}

/** The sleeper wakes and hops off; a new blank lump takes its place while fewer than four critters are awake. */
export function wake(state: WorkshopState): CritterSave | null {
  const woken = state.sleeper
  if (!woken) return null
  woken.x = WAKE_LANDING.x
  woken.z = WAKE_LANDING.z
  woken.heading = 0.4
  state.awake.push(woken)
  state.sleeper = state.awake.length < MAX_AWAKE ? newLump(state) : null
  return woken
}

/** Whether a carried critter may lie down on the turntable: it is empty, or holds a lump with nothing on it yet. */
export function turntableFree(state: WorkshopState): boolean {
  return state.sleeper === null || state.sleeper.parts.length === 0
}

/** An awake critter goes back to sleep on the turntable for remaking. A blank lump there is simply pressed back into the clay. */
export function putToSleep(state: WorkshopState, id: number): boolean {
  if (!turntableFree(state)) return false
  const index = state.awake.findIndex((critter) => critter.id === id)
  if (index < 0) return false
  const [critter] = state.awake.splice(index, 1)
  critter.x = 0
  critter.z = 0
  critter.heading = 0
  state.sleeper = critter
  return true
}

// --- saving -------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readParts(raw: unknown): Part[] {
  if (!Array.isArray(raw)) return []
  const parts: Part[] = []
  const counts: Partial<Record<Family, number>> = {}
  for (const item of raw) {
    if (!isRecord(item) || !isPartKind(item.kind) || !isHue(item.hue)) continue
    const family = FAMILY[item.kind]
    const count = counts[family] ?? 0
    if (count >= CAPACITY[family]) continue
    counts[family] = count + 1
    parts.push({ kind: item.kind, hue: item.hue })
  }
  return parts
}

function readCritter(raw: unknown, seen: Set<number>, sleeping: boolean): CritterSave | null {
  if (!isRecord(raw)) return null
  const id = raw.id
  if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 || id > 1_000_000_000 || seen.has(id)) return null
  seen.add(id)
  const at = sleeping ? { x: 0, z: 0 } : clampWalk({ x: finite(raw.x, WAKE_LANDING.x), z: finite(raw.z, WAKE_LANDING.z) }, 4)
  const seed = finite(raw.seed, seedFor(id))
  return {
    id,
    hue: isHue(raw.hue) ? raw.hue : 2,
    parts: readParts(raw.parts),
    x: Math.round(at.x * 10) / 10,
    z: Math.round(at.z * 10) / 10,
    heading: Math.round((finite(raw.heading, 0) % (Math.PI * 2)) * 100) / 100,
    seed: Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff ? seed : seedFor(id),
  }
}

export function deserialize(raw: unknown): WorkshopState {
  const fallback = defaultWorkshop()
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return fallback
  const seen = new Set<number>()
  const sleeper = raw.sleeper === null ? null : readCritter(raw.sleeper, seen, true)
  const awake: CritterSave[] = []
  if (Array.isArray(raw.awake)) {
    for (const item of raw.awake) {
      if (awake.length >= MAX_AWAKE) break
      const critter = readCritter(item, seen, false)
      if (critter) awake.push(critter)
    }
  }
  const trayRaw = isRecord(raw.tray) ? raw.tray : {}
  const tray = { ...TRAY_START }
  for (const kind of PART_KINDS) if (isHue(trayRaw[kind])) tray[kind] = trayRaw[kind] as Hue
  const maxId = Math.max(0, sleeper?.id ?? 0, ...awake.map((critter) => critter.id))
  const savedNext = Math.floor(finite(raw.nextId, 1))
  const state: WorkshopState = {
    v: STATE_VERSION,
    sleeper,
    awake,
    tray,
    nextHue: isHue(raw.nextHue) ? raw.nextHue : fallback.nextHue,
    nextId: Math.max(savedNext > 0 && savedNext <= 1_000_000_000 ? savedNext : 1, maxId + 1),
  }
  if (!state.sleeper && state.awake.length < MAX_AWAKE) state.sleeper = newLump(state)
  return state
}

function copyCritter(critter: CritterSave): CritterSave {
  return {
    id: critter.id,
    hue: critter.hue,
    parts: critter.parts.map((part) => ({ kind: part.kind, hue: part.hue })),
    x: Math.round(critter.x * 10) / 10,
    z: Math.round(critter.z * 10) / 10,
    heading: Math.round(critter.heading * 100) / 100,
    seed: critter.seed,
  }
}

export function serialize(state: WorkshopState): WorkshopState {
  return {
    v: STATE_VERSION,
    sleeper: state.sleeper ? copyCritter(state.sleeper) : null,
    awake: state.awake.map(copyCritter),
    tray: { ...state.tray },
    nextHue: state.nextHue,
    nextId: state.nextId,
  }
}
