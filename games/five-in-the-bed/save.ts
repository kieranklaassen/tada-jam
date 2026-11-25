import { FIVE, SIDES, makeBed, type Side } from './bed'
import { bottles, fits, straws, type Milk } from './milk'
import { finishCycle, deserialize as readState, freshState, isReadable, isRecord, serialize as writeState, type GameState } from './state'

// What is kept, around the template's record (state.ts): which half each sheep
// lies in, the milk that is out, and the quilt. A sheep's place within a half
// is where five balls roll to, so the halves say it all.

export type Shown = 'ridge' | 'worn'
export type Saved = GameState & {
  sides: Side[]
  quilt: Side | null
  milk: Milk | null
  misfits: number
  needed: number
  shown: Shown[]
  stream: number
}

/** One tap from fitting: three and two, with two bottles and three. */
export function firstSaved(childAge: number | null, seed: number): Saved {
  return { ...freshState(childAge), sides: ['left', 'left', 'right', 'left', 'right'], quilt: null, milk: bottles(2), misfits: 0, needed: 1, shown: [], stream: seed >>> 0 }
}

export function outcomeOf(misfits: number, needed: number): 'well' | 'mixed' | 'badly' {
  return misfits <= needed + 1 ? 'well' : misfits >= needed + 6 ? 'badly' : 'mixed'
}

export function drunk(s: Saved): Saved {
  return { ...finishCycle({ ...s, finished: false }, outcomeOf(s.misfits, s.needed)), milk: null }
}

/** A parting that fits is saved as drunk, so that nothing plays on load. */
export function settledSave(s: Saved): Saved {
  return s.milk && fits(straws(makeBed(s.sides), s.milk)) ? drunk(s) : s
}

export function serialize(s: Saved): Saved {
  return { ...writeState(s), sides: [...s.sides], quilt: s.quilt, milk: s.milk && s.milk.map((b) => ({ ...b })), misfits: s.misfits, needed: s.needed, shown: [...s.shown], stream: s.stream }
}

const isSide = (v: unknown): v is Side => v === 'left' || v === 'right'
const whole = (v: unknown, most: number, otherwise: number): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= most ? v : otherwise)

function readMilk(v: unknown): Milk | null {
  if (!Array.isArray(v) || v.length !== FIVE) return null
  const seen: Record<Side, number> = { left: 0, right: 0 }
  const owners: Milk = []
  for (const b of v) {
    if (!isRecord(b) || !isSide(b.side)) return null
    const o = b.owner
    const owner = typeof o === 'number' && Number.isInteger(o) && o >= 0 && o < FIVE && !owners.some((x) => x.owner === o) ? o : null
    owners.push({ side: b.side, slot: seen[b.side]++, owner })
  }
  // Colours are worn on one shelf only.
  const worn = SIDES.filter((s) => owners.some((b) => b.side === s && b.owner !== null))
  return worn.length > 1 ? owners.map((b) => ({ ...b, owner: null })) : owners
}

export function deserialize(raw: unknown, childAge: number | null, seed: number): Saved {
  const fresh = firstSaved(childAge, seed)
  if (!isReadable(raw)) return fresh
  const state = readState(raw, childAge)
  const sides = Array.isArray(raw.sides) && raw.sides.length === FIVE && raw.sides.every(isSide) ? (raw.sides as Side[]) : fresh.sides
  const milk = raw.milk === null ? null : readMilk(raw.milk)
  const shown = Array.isArray(raw.shown) ? (['ridge', 'worn'] as const).filter((s) => (raw.shown as unknown[]).includes(s)) : []
  return settledSave({
    ...state, sides, milk, finished: milk === null,
    quilt: isSide(raw.quilt) ? raw.quilt : null,
    misfits: whole(raw.misfits, 10000, 0), needed: whole(raw.needed, FIVE, 1), shown,
    stream: whole(raw.stream, 4294967295, seed >>> 0),
  })
}

