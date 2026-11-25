import { CAST, DISHES, GUESTS, HOME, arrivals, ownerOf, type DishId, type GuestId } from './cast'

// What goes into ctx.storage. Who waits, how long the table is and what the
// camera shows all follow from these.

export const STATE_VERSION = 1

export type DishState = { at: GuestId; on: 'table' | 'head'; full: boolean }

export type GameState = {
  v: typeof STATE_VERSION
  /** The first round was shown. */
  shown: boolean
  /** Feasts that ended in going home, only to know who comes next. Nothing shows it. */
  rounds: number
  order: GuestId[]
  dishes: Record<DishId, DishState>
  /** What each last ate, which can be seen on them. */
  ate: Partial<Record<GuestId, DishId>>
  fed: boolean
}

export function freshDishes(): Record<DishId, DishState> {
  return Object.fromEntries(DISHES.map((d) => [d, { at: ownerOf(d), on: 'table', full: true }])) as Record<DishId, DishState>
}

export function freshState(): GameState {
  return { v: STATE_VERSION, shown: false, rounds: 0, order: [...HOME], dishes: freshDishes(), ate: {}, fed: false }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isGuest = (v: unknown): v is GuestId => GUESTS.some((g) => g === v)
const isDish = (v: unknown): v is DishId => DISHES.some((d) => d === v)

/** Whether the dishes could stand so: one to a place, and whoever is not here has their own. */
function dishesStand(dishes: Record<DishId, DishState>, order: readonly GuestId[]): boolean {
  const places = new Set<string>()
  for (const d of DISHES) {
    const { at, on } = dishes[d]
    const owner = ownerOf(d)
    if (order.includes(owner) ? !order.includes(at) : at !== owner || on !== 'table') return false
    if (places.has(`${at} ${on}`)) return false
    places.add(`${at} ${on}`)
  }
  return true
}

/** Saved state is untrusted: each part is repaired by itself, and what could not have been reached by play is put right. */
export function deserialize(raw: unknown): GameState {
  const fresh = freshState()
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return fresh
  const rounds = typeof raw.rounds === 'number' && Number.isInteger(raw.rounds) && raw.rounds >= 0 ? raw.rounds % 8 : 0
  const order: GuestId[] = []
  if (Array.isArray(raw.order)) for (const g of raw.order) if (isGuest(g) && !order.includes(g)) order.push(g)
  for (const g of [...HOME].reverse()) if (!order.includes(g)) order.unshift(g)
  // They come in their order: nobody sits here before the one who comes earlier.
  const coming = arrivals(rounds)
  let here = 0
  while (here < coming.length && order.includes(coming[here])) here++
  const seated = order.filter((g) => HOME.includes(g) || coming.indexOf(g) < here)
  let dishes = freshDishes()
  if (isRecord(raw.dishes)) {
    for (const d of DISHES) {
      const it = raw.dishes[d]
      if (!isRecord(it)) continue
      if (isGuest(it.at)) dishes[d].at = it.at
      if (it.on === 'head') dishes[d].on = 'head'
      if (it.full === false && seated.includes(ownerOf(d))) dishes[d].full = false
    }
    if (!dishesStand(dishes, seated)) {
      const full = dishes
      dishes = freshDishes()
      for (const d of DISHES) dishes[d].full = full[d].full
    }
  }
  const ate: Partial<Record<GuestId, DishId>> = {}
  if (isRecord(raw.ate)) for (const g of seated) if (isDish(raw.ate[g])) ate[g] = raw.ate[g] as DishId
  return { v: STATE_VERSION, shown: raw.shown === true || seated.length > HOME.length, rounds, order: seated, dishes, ate, fed: raw.fed === true && Object.keys(ate).length > 0 }
}

export function serialize(s: GameState): GameState {
  return { v: STATE_VERSION, shown: s.shown, rounds: s.rounds, order: [...s.order], dishes: Object.fromEntries(DISHES.map((d) => [d, { ...s.dishes[d] }])) as Record<DishId, DishState>, ate: { ...s.ate }, fed: s.fed }
}

/** The dish in front of someone, or on their head. */
export function dishAt(s: Pick<GameState, 'dishes'>, who: GuestId, on: 'table' | 'head' = 'table'): DishId | null {
  for (const d of DISHES) if (s.dishes[d].at === who && s.dishes[d].on === on) return d
  return null
}

export function taste(who: GuestId, dish: DishId): 'likes' | 'hates' | 'eats' {
  return CAST[who].likes.includes(dish) ? 'likes' : CAST[who].hates === dish ? 'hates' : 'eats'
}
