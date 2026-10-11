import { BREAD, CHEESE, THINGS, isKind, radiusOf, type Kind } from './kinds'
import { MOST_SNACKS } from './jar'
import { JAR, JAR_MID, PLACES } from './layout'
import { deserialize as readBase, freshState, isReadable, serialize as writeBase, type GameState } from './state'

// The whole saved game: the template's fields (state.ts) and this game's own
// (ART.md, "Every field of the saved state"). Small plain JSON, and untrusted
// when it comes back: each field is repaired by itself, so a damaged one takes
// its default and the rest is kept.

export type Lying = { k: Kind; x: number; y: number }

export type Save = GameState & {
  /** The snacks lying in the jar, at rest. */
  jar: Lying[]
  /** The snack hanging under the claw. */
  claw: Kind
  /** Which thing on the shelf the claw takes after a let-go. */
  pick: number
  /** The four places on the counter, counted from the paper bag: a snack, or 0 for none. */
  counter: number[]
  /** Which of the three monsters sits at the jar. */
  seat: number
  /** What the monster at the jar was given in the last tip, as mouthfuls. */
  ate: Kind[]
}

export const MONSTERS = 3
export const MOUTHFULS = 5

/** How a first visit opens (ART.md, "What a first visit starts with, by age"). */
export function freshSave(childAge: number | null): Save {
  const base = freshState(childAge)
  const seeded = base.position === 'bread-in-jar'
  return {
    ...base,
    jar: seeded ? [{ k: BREAD, x: JAR_MID, y: JAR.floor - radiusOf(BREAD) }] : [],
    claw: seeded ? CHEESE : BREAD,
    pick: seeded ? 1 : 0,
    counter: PLACES.map(() => 0),
    seat: 0,
    ate: [],
  }
}

const tenth = (n: number): number => Math.round(n * 10) / 10

function lying(raw: unknown): Lying | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { k, x, y } = raw as Record<string, unknown>
  if (!isKind(k) || typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null
  const r = radiusOf(k)
  return { k, x: tenth(Math.max(JAR.left + r, Math.min(JAR.right - r, x))), y: tenth(Math.max(JAR.rim - 2 * r, Math.min(JAR.floor - r, y))) }
}

export function deserialize(raw: unknown, childAge: number | null = null): Save {
  if (!isReadable(raw)) return freshSave(childAge)
  const base = readBase(raw, childAge)
  const pick = typeof raw.pick === 'number' && Number.isInteger(raw.pick) && raw.pick >= 0 && raw.pick < THINGS.length ? raw.pick : 0
  const ate = Array.isArray(raw.ate) ? raw.ate.filter(isKind).slice(0, MOUTHFULS) : []
  return {
    ...base,
    // What the monster ate says whether the cycle on screen is over, so the two never disagree (state.ts).
    finished: ate.length > 0,
    jar: Array.isArray(raw.jar) ? raw.jar.map(lying).filter((s): s is Lying => s !== null).slice(0, MOST_SNACKS) : [],
    claw: isKind(raw.claw) ? raw.claw : 1 << pick,
    pick,
    counter: PLACES.map((_, i) => (Array.isArray(raw.counter) && isKind(raw.counter[i]) ? raw.counter[i] : 0)),
    seat: typeof raw.seat === 'number' && Number.isInteger(raw.seat) && raw.seat >= 0 && raw.seat < MONSTERS ? raw.seat : 0,
    ate,
  }
}

export function serialize(save: Save): Save {
  return {
    ...writeBase(save),
    jar: save.jar.slice(0, MOST_SNACKS).map((s) => ({ k: s.k, x: tenth(s.x), y: tenth(s.y) })),
    claw: save.claw,
    pick: save.pick,
    counter: [...save.counter],
    seat: save.seat,
    ate: [...save.ate],
  }
}
