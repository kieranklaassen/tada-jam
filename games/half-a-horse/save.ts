import { ENDS } from './ends'
import { FOOD_LEFT, FOOD_RIGHT, LEFT, MAX_FOOD, PEGS, RIGHT, STABLE } from './layout'

// What goes into ctx.storage: small plain JSON, versioned, read defensively.
// An end is always in exactly one place: worn by one of the two, or on one of
// the eight pegs. Nothing in the air, in the hand or mid-scene is stored.

export const SAVE_VERSION = 1
export const FOODS = ['apple', 'carrot', 'egg'] as const
export type FoodKind = (typeof FOODS)[number]

export type Saved = {
  v: typeof SAVE_VERSION
  /** The goose's half, then the bear's. */
  halves: [{ x: number; sit: boolean; wear: number }, { x: number; sit: boolean; wear: number }]
  pegs: (number | null)[]
  food: { kind: FoodKind; x: number }[]
  /** What the bear ate and the farmer has not tossed back, oldest first. */
  eaten: FoodKind[]
  tied: boolean
  ended: boolean
}

export function freshSave(): Saved {
  return {
    v: SAVE_VERSION,
    halves: [{ x: 560, sit: false, wear: 0 }, { x: 290, sit: false, wear: 4 }],
    pegs: [1, 5, 2, null, null, 6, 3, 7],
    food: [{ kind: 'apple', x: 745 }],
    eaten: [],
    tied: false,
    ended: false,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const within = (value: unknown, from: number, to: number, otherwise: number): number => (typeof value === 'number' && Number.isFinite(value) ? Math.max(from, Math.min(to, value)) : otherwise)
const isEnd = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < ENDS
const isFood = (value: unknown): value is FoodKind => FOODS.includes(value as FoodKind)

export function deserialize(raw: unknown): Saved {
  const fresh = freshSave()
  if (!isRecord(raw) || raw.v !== SAVE_VERSION) return fresh
  const halves = Array.isArray(raw.halves) ? raw.halves : []
  const used = new Set<number>()
  const place = (value: unknown): number | null => {
    if (!isEnd(value) || used.has(value)) return null
    used.add(value)
    return value
  }
  const worn = [0, 1].map((who) => (isRecord(halves[who]) ? place((halves[who] as Record<string, unknown>).wear) : null))
  const hung = Array.from({ length: PEGS }, (_, peg) => place(Array.isArray(raw.pegs) ? raw.pegs[peg] : null))
  const spare = (): number[] => Array.from({ length: ENDS }, (_, end) => end).filter((end) => !used.has(end))
  const missing = (who: number): number => {
    // Its own first, then any end nobody has, then one off the line.
    const free = spare()
    let end = free.includes(fresh.halves[who].wear) ? fresh.halves[who].wear : free[0]
    if (end === undefined) {
      const peg = hung.findIndex((value) => value !== null)
      end = hung[peg]!
      hung[peg] = null
    }
    used.add(end)
    return end
  }
  const wear = [worn[0] ?? missing(0), worn[1] ?? missing(1)]
  for (const end of spare()) {
    hung[hung.indexOf(null)] = end
    used.add(end)
  }
  const ended = raw.ended === true
  const half = (who: 0 | 1) => {
    const saved = isRecord(halves[who]) ? (halves[who] as Record<string, unknown>) : {}
    return { x: within(saved.x, LEFT, RIGHT, fresh.halves[who].x), sit: saved.sit === true, wear: wear[who] }
  }
  const two: Saved['halves'] = [half(0), half(1)]
  // Both in the stable and the show not ended cannot be reached by play: the goose is put outside the door.
  if (!ended && two[0].x <= STABLE.mouth && two[1].x <= STABLE.mouth) two[0].x = STABLE.mouth + 60
  const food = (Array.isArray(raw.food) ? raw.food : [])
    .filter((one): one is { kind: FoodKind; x: number } => isRecord(one) && isFood(one.kind) && typeof one.x === 'number' && Number.isFinite(one.x))
    .slice(0, MAX_FOOD)
    .map((one) => ({ kind: one.kind, x: within(one.x, FOOD_LEFT, FOOD_RIGHT, 600) }))
  const eaten = (Array.isArray(raw.eaten) ? raw.eaten : []).filter(isFood).slice(0, MAX_FOOD - food.length)
  // A bow is tied only while the two stand crossed.
  const tied = raw.tied === true && two[0].x < two[1].x
  return { v: SAVE_VERSION, halves: two, pegs: hung, food, eaten, tied, ended }
}
