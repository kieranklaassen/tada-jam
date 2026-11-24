import { freshNight, type NightRecord } from './night'
import { deserialize as readBase, isReadable, isRecord, serialize as writeBase, type GameState } from './state'
import { GARMENTS, SLEEPERS, type Garment, type Sleeper } from './things'

// The saved record: the template's fields, then the night. Each field is repaired by itself.

export type Save = GameState & { night: NightRecord }

/** At five and older the wardrobe stands open from the first night. Age only chooses this start. */
export const OPEN_FROM_AGE = 5

export function freshSave(childAge: number | null): Save {
  return { ...readBase(null, childAge), night: freshNight(childAge !== null && childAge >= OPEN_FROM_AGE) }
}

export function serialize(save: Save): Save {
  return { ...writeBase(save), night: save.night }
}

function isSleeper(value: unknown): value is Sleeper {
  return (SLEEPERS as readonly unknown[]).includes(value)
}

function isGarment(value: unknown): value is Garment {
  return (GARMENTS as readonly unknown[]).includes(value)
}

export function deserialize(raw: unknown, childAge: number | null = null): Save {
  const fresh = freshSave(childAge)
  if (!isReadable(raw) || !isRecord(raw.night)) return { ...readBase(raw, childAge), night: fresh.night }
  const from = raw.night
  // Five beds, each sleeper once: anything else is the beds as they first stood.
  const beds = Array.isArray(from.beds) && from.beds.length === SLEEPERS.length && from.beds.every(isSleeper) && new Set(from.beds).size === SLEEPERS.length
    ? [...from.beds] : fresh.night.beds
  // A garment is on one sleeper at most: the first that claims it has it, and the rest is on the line.
  const worn: Record<Sleeper, Garment[]> = { goat: [], hippo: [], hen: [], croc: [], pig: [] }
  const taken = new Set<Garment>()
  const claims = isRecord(from.worn) ? from.worn : {}
  for (const sleeper of SLEEPERS) {
    const list = claims[sleeper]
    if (!Array.isArray(list)) continue
    for (const garment of list) if (isGarment(garment) && !taken.has(garment)) {
      taken.add(garment)
      worn[sleeper].push(garment)
    }
  }
  return {
    ...readBase(raw, childAge),
    night: { beds, worn, lit: typeof from.lit === 'boolean' ? from.lit : true, open: typeof from.open === 'boolean' ? from.open : fresh.night.open },
  }
}
