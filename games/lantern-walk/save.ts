import { FOX_LANE, HEDGEHOG_LANE, HEDGEHOG_MAT, HOOK_GRIP, PLACES, REACH, WORMS } from './layout'
import { copySheet, readSheet, sheetOf, type SheetWindow } from './sheet'
import { deserialize as readState, isReadable, isRecord, serialize as writeState, type GameState } from './state'
import type { Made } from './table'
import { CREATURES, freshWood, type Creature, type WoodSave } from './wood'

// What the game keeps in ctx.storage: the template's fields (state.ts), where
// the game is found, how far the lantern is made, the sheet, and the wood as
// it was left. Each field is repaired by itself, so one damaged number never
// costs the child the rest. Nothing in the air is saved: the lantern is saved
// where the finger last held it, and a moth on its way as where it is going.

export type Save = GameState & WoodSave & {
  place: 'table' | 'wood'
  made: Made
  sheet: SheetWindow[]
}

/** A first visit: at the table, with the sheet the position names lying flat. */
export function freshSave(childAge: number | null): Save {
  const state = readState(null, childAge)
  return { ...state, ...freshWood(), lit: false, place: 'table', made: 'flat', sheet: sheetOf(state.position) }
}

const between = (value: unknown, low: number, high: number, otherwise: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(high, Math.max(low, Math.round(value))) : otherwise

const MADE: readonly Made[] = ['flat', 'rolled', 'candle', 'lit']

export function deserialize(raw: unknown, childAge: number | null = null): Save {
  const first = freshSave(childAge)
  if (!isReadable(raw)) return first
  const state = readState(raw, childAge)
  const fresh = freshWood()
  const lantern = isRecord(raw.lantern) ? raw.lantern : {}
  const fox = isRecord(raw.fox) ? raw.fox : {}
  const hedgehog = isRecord(raw.hedgehog) ? raw.hedgehog : {}
  const place = raw.place === 'wood' ? 'wood' : 'table'
  // In the wood the lantern is lit, or was; at the table it is never further than the candle set in.
  let made: Made = MADE.includes(raw.made as Made) ? (raw.made as Made) : place === 'wood' ? 'lit' : 'flat'
  if (place === 'wood') made = 'lit'
  else if (made === 'lit') made = 'candle'
  // The lantern hangs on its hook only in the wood: a finished walk found at the table is a walk not begun.
  const finished = state.finished && place === 'wood'
  const lit = place === 'wood' && (typeof raw.lit === 'boolean' ? raw.lit : true)
  const sheet = readSheet(raw.sheet) ?? sheetOf(state.position)
  const met: Creature[] = Array.isArray(raw.met) ? CREATURES.filter((name) => (raw.met as unknown[]).includes(name)) : []
  return {
    ...state,
    finished,
    place,
    made,
    sheet,
    lit,
    lantern: finished
      ? { ...HOOK_GRIP }
      : { x: between(lantern.x, REACH.left, REACH.right, fresh.lantern.x), y: between(lantern.y, REACH.top, REACH.bottom, fresh.lantern.y) },
    fox: { x: between(fox.x, FOX_LANE.left, FOX_LANE.right, fresh.fox.x), y: PLACES.fox.y },
    // Only a finished walk leaves the hedgehog on the mat, past the end of its lane.
    hedgehog: { x: between(hedgehog.x, HEDGEHOG_LANE.left, finished ? HEDGEHOG_MAT : HEDGEHOG_LANE.right, fresh.hedgehog.x), y: PLACES.hedgehog.y },
    worms: between(raw.worms, 0, (1 << WORMS) - 1, 0),
    // Moths ride with a light, so they are on the bark of a wood that was left dark.
    moths: raw.moths === 'lantern' && lit ? 'lantern' : 'bark',
    met,
  }
}

export function serialize(save: Save): Save {
  return {
    ...writeState(save),
    place: save.place,
    made: save.made,
    sheet: copySheet(save.sheet),
    lit: save.lit,
    lantern: { x: save.lantern.x, y: save.lantern.y },
    fox: { x: save.fox.x, y: save.fox.y },
    hedgehog: { x: save.hedgehog.x, y: save.hedgehog.y },
    worms: save.worms,
    moths: save.moths,
    met: [...save.met],
  }
}
