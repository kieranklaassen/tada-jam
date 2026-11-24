import { ANIMALS, COATS, SNACKS, THINGS, WISHES, type Animal, type Thing } from './things'
import { COLUMNS, freshTown, hasTools, onGround, stays, type Town } from './town'

// What goes into ctx.storage: small plain JSON, versioned, each field read by
// itself and repaired by itself. A repaired town is one that play could reach.

export const SAVE_VERSION = 1

export type Saved = Town & { v: typeof SAVE_VERSION }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isThing = (value: unknown): value is Thing => THINGS.includes(value as Thing)

export function serialize(town: Town): Saved {
  return { v: SAVE_VERSION, position: town.position, finished: town.finished, fresh: town.fresh, count: town.count, ballot: town.ballot, columns: town.columns, hidden: town.hidden, snacks: town.snacks, coats: town.coats }
}

export function deserialize(raw: unknown, childAge: number | null): Town {
  const town = freshTown(childAge)
  if (!isRecord(raw) || raw.v !== SAVE_VERSION) return town
  const wish = WISHES.find((w) => w.id === raw.position)
  if (wish) Object.assign(town, { position: wish.id, count: wish.count, ballot: [...wish.ballot] })
  if (typeof raw.count === 'number' && Number.isInteger(raw.count) && raw.count >= WISHES[0].count && raw.count <= ANIMALS.length) town.count = raw.count
  const b = raw.ballot
  if (Array.isArray(b) && b.length === COLUMNS && isThing(b[0]) && isThing(b[1]) && (b[2] === null || isThing(b[2])) && new Set(b).size === COLUMNS) town.ballot = [b[0], b[1], b[2]]
  if (!hasTools(town)) town.ballot[2] = null
  const inTown = ANIMALS.slice(0, town.count)
  const used = new Set<Animal>()
  if (hasTools(town) && inTown.includes(raw.hidden as Animal)) {
    town.hidden = raw.hidden as Animal
    used.add(town.hidden)
  }
  if (hasTools(town) && isRecord(raw.snacks)) for (const snack of SNACKS) {
    const col = raw.snacks[snack]
    if (col === 0 || col === 1 || col === 2) if (town.ballot[col] !== null) town.snacks[snack] = col
  }
  if (Array.isArray(raw.columns)) for (let col = 0; col < COLUMNS; col++) {
    const list: unknown = raw.columns[col]
    if (!Array.isArray(list)) continue
    for (const who of list as Animal[]) if (inTown.includes(who) && !used.has(who) && stays(town, who, col)) {
      used.add(who)
      town.columns[col].push(who)
    }
  }
  if (isRecord(raw.coats)) for (const who of ANIMALS) {
    const coat = COATS.find((c) => c === (raw.coats as Record<string, unknown>)[who])
    if (coat) town.coats[who] = coat
  }
  // A vote that was read has everyone in it but the one who was hidden.
  town.finished = raw.finished === true && onGround(town).length === 0
  town.fresh = town.finished && raw.fresh === true
  return town
}
