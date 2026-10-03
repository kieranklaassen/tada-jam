import { type Clutch, FIRST_SEED, type Slot, isOver, isSound, layClutch } from './layout'
import { FORMS, type Form } from './places'
import { STATE_VERSION, deserialize } from './state'
import { isKind } from './voices'
import { HILL_MAX, type Resident, type World, freshWorld } from './world'

// What goes into ctx.storage, and how it is read back. The template's
// state.ts reads its own three fields (the version, the place, whether the
// cycle is finished) and is left as it was copied; this module reads the same
// raw record again for the game's own fields, each repaired by itself, and
// then makes the whole agree with itself, so that an old or damaged slot
// always opens as a world that can be played.

const SLOTS: readonly Slot[] = ['fresh', 'heard', 'done']
const AS: readonly Resident['as'][] = ['family', 'twins', 'single']

const isRecord = (raw: unknown): raw is Record<string, unknown> => typeof raw === 'object' && raw !== null && !Array.isArray(raw)

/** A saved clutch, or null for anything this build could not have laid out and played. */
function readClutch(raw: unknown): Clutch | null {
  if (!isRecord(raw)) return null
  const { form, place, kinds, slots, queue, asker, wrong } = raw
  if (!FORMS.includes(form as Form) || typeof place !== 'string') return null
  if (!Array.isArray(kinds) || !kinds.every(isKind)) return null
  if (!Array.isArray(slots) || !slots.every((slot) => SLOTS.includes(slot as Slot))) return null
  if (!Array.isArray(queue) || !queue.every(isKind)) return null
  if (asker !== null && !isKind(asker)) return null
  if (typeof wrong !== 'number') return null
  const clutch: Clutch = { form: form as Form, place, kinds: [...kinds], slots: [...slots] as Slot[], queue: [...queue], asker, wrong }
  return isSound(clutch) ? clutch : null
}

/** One that waits at the edge has not been touched yet. */
const isUntouched = (clutch: Clutch) => clutch.asker === null && clutch.wrong === 0 && clutch.slots.every((slot) => slot === 'fresh')

function readHill(raw: unknown): Resident[] {
  if (!Array.isArray(raw)) return []
  const hill: Resident[] = []
  for (const one of raw) {
    if (!isRecord(one) || !isKind(one.kind) || !AS.includes(one.as as Resident['as'])) continue
    // Never two of one kind: the later one stands.
    const at = hill.findIndex((other) => other.kind === one.kind)
    if (at >= 0) hill.splice(at, 1)
    hill.push({ kind: one.kind, as: one.as as Resident['as'] })
  }
  return hill.slice(-HILL_MAX)
}

/**
 * Saved state is untrusted. Anything that is not this game's record, and a record of a version above this one,
 * gives a fresh world. Inside a record each field is repaired by itself, and then the whole is made to agree.
 */
export function deserializeWorld(raw: unknown, childAge: number | null = null): World {
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return freshWorld(childAge)
  const base = deserialize(raw, childAge)
  let rng = typeof raw.rng === 'number' && Number.isInteger(raw.rng) && raw.rng >= 0 && raw.rng < 2 ** 32 ? raw.rng : FIRST_SEED
  const shown = FORMS.filter((form) => Array.isArray(raw.shown) && raw.shown.includes(form))
  const hill = readHill(raw.hill)
  const cycle = readClutch(raw.cycle)
  let extra = isKind(raw.extra) ? raw.extra : null
  // The clutch on screen says whether its cycle is over, whatever the flag beside it says.
  const playing = cycle !== null && !isOver(cycle)
  // The egg in the basket is never of a kind that is in the row.
  if (extra !== null && playing && cycle.kinds.includes(extra)) extra = null
  let next = playing ? null : readClutch(raw.next)
  if (next && (!isUntouched(next) || next.place !== base.position || (extra !== null && next.kinds.includes(extra)))) next = null
  if (!playing && !next) {
    const laid = layClutch(base.position, rng, extra)
    next = laid.clutch
    rng = laid.rng
  }

  // One alone on the hill is still waited for by the clutch on screen, or it has found its own.
  const awaited = (resident: Resident) => playing && (cycle.form === 'alike' ? cycle.kinds.some((kind, i) => kind === resident.kind && cycle.slots[i] !== 'done') : cycle.form === 'seek' && cycle.queue.includes(resident.kind))
  for (const resident of hill) if (resident.as === 'single' && !awaited(resident)) resident.as = cycle?.form === 'alike' ? 'twins' : 'family'

  return { v: STATE_VERSION, position: base.position, finished: !playing, rng, shown, hill, extra, next, cycle }
}

/** The plain record that is saved: these fields and no others. */
export function serializeWorld(world: World): World {
  const clutch = (one: Clutch | null): Clutch | null => one && { form: one.form, place: one.place, kinds: [...one.kinds], slots: [...one.slots], queue: [...one.queue], asker: one.asker, wrong: one.wrong }
  return {
    v: STATE_VERSION,
    position: world.position,
    finished: world.finished,
    rng: world.rng,
    shown: [...world.shown],
    hill: world.hill.map((resident) => ({ kind: resident.kind, as: resident.as })),
    extra: world.extra,
    next: clutch(world.next),
    cycle: clutch(world.cycle),
  }
}
