import type { Asleep } from './evening'
import { FOLK, type Who } from './folk'
import { FOUND, HOLLOW, type Kind } from './kinds'
import { build, laidOf, type Laid } from './rest'
import { deserialize as readBase, freshState, isReadable, serialize as writeBase, type GameState } from './state'

// What the game saves on top of the template's fields. `things` is what lies
// in the hollow, in the order it came to rest, each as its number and the
// place it was let go, or, where it came to rest somewhere else, a place that
// gives that same rest again: the house is rebuilt from that list by the resting
// rule (rest.ts), so how a thing lies needs no field. `snapped` and `soaked`
// name the twigs the fat one has snapped and the things a bath has soaked,
// and `asleep` says where each of the three lies while the evening stands.

export type Save = GameState & { things: Laid[]; snapped: number[]; soaked: number[]; asleep: Asleep[] }

const nth = (kind: Kind, index: number): number => FOUND.filter((thing) => thing.kind === kind)[index].id

/**
 * What lies in the hollow on a first visit, by age: a default and never a
 * gate, since every thing is on screen at every age. Both ends are open, and
 * no age starts as the youngest does.
 */
export function firstHouse(childAge: number | null): Laid[] {
  // 7 and older: the hollow is bare.
  if (childAge !== null && childAge >= 7) return []
  // 5 and 6: one moss cushion.
  if (childAge !== null && childAge >= 5) return [{ id: nth('moss', 1), x: 640 }]
  // 4 and younger, and no age: a bed and a pebble beside it.
  // The bed lies left of the middle, so that the pebble has room on both sides: a slab set on it can tip either way.
  return [{ id: nth('moss', 1), x: 580 }, { id: nth('leaf', 0), x: 580 }, { id: nth('pebble', 0), x: 750 }]
}

export function freshSave(childAge: number | null): Save {
  return { ...freshState(childAge), things: laidOf(build(firstHouse(childAge))), snapped: [], soaked: [], asleep: [] }
}

const isId = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < FOUND.length

/** A list of thing numbers, repaired: each a number of a found thing, none twice, in order. */
function ids(raw: unknown, keep: (id: number) => boolean): number[] {
  if (!Array.isArray(raw)) return []
  return [...new Set((raw as unknown[]).filter(isId).filter(keep))].sort((a, b) => a - b)
}

/**
 * Saved state is untrusted. The list is repaired entry by entry, and what can
 * no longer rest is left on the forest floor. Only a twig that is in the
 * hollow can be snapped and only a thing that is in it soaked. At evening
 * each of the three has one place: the thing it ended on if that is in the
 * hollow, and otherwise the floor.
 */
export function deserialize(raw: unknown, childAge: number | null = null): Save {
  if (!isReadable(raw)) return freshSave(childAge)
  const base = readBase(raw, childAge)
  const laid: Laid[] = []
  if (Array.isArray(raw.things)) {
    for (const entry of raw.things as unknown[]) {
      if (typeof entry !== 'object' || entry === null) continue
      const { id, x } = entry as { id?: unknown; x?: unknown }
      if (!isId(id)) continue
      if (typeof x !== 'number' || !Number.isFinite(x)) continue
      laid.push({ id, x })
    }
  }
  const named = new Set(laid.map((thing) => thing.id))
  const snapped = ids(raw.snapped, (id) => named.has(id) && FOUND[id].kind === 'twig')
  const house = build(laid, new Set(snapped))
  const inHouse = new Set(house.map((r) => r.id))
  const asleep: Asleep[] = []
  if (base.finished) {
    const entries: unknown[] = Array.isArray(raw.asleep) ? raw.asleep : []
    for (const who of FOLK) {
      const found = entries.find((entry) => typeof entry === 'object' && entry !== null && (entry as { who?: unknown }).who === who) as { on?: unknown; x?: unknown } | undefined
      const on = found && isId(found.on) && inHouse.has(found.on) ? found.on : null
      const x = found && typeof found.x === 'number' && Number.isFinite(found.x) ? Math.min(HOLLOW.right, Math.max(HOLLOW.left, found.x)) : (HOLLOW.stepRight + HOLLOW.right) / 2
      asleep.push({ who: who as Who, on, x })
    }
  }
  return {
    ...base, things: laidOf(house),
    snapped: snapped.filter((id) => inHouse.has(id)),
    soaked: ids(raw.soaked, (id) => inHouse.has(id)),
    asleep,
  }
}

export function serialize(save: Save): Save {
  return {
    ...writeBase(save),
    things: save.things.map(({ id, x }) => ({ id, x })),
    snapped: [...save.snapped],
    soaked: [...save.soaked],
    asleep: save.asleep.map(({ who, on, x }) => ({ who, on, x })),
  }
}
