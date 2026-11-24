import { ANIMALS, LOVERS, SNACKS, TASTES, THINGS, WISHES, coatAfter, firstWish, hates, nextWish, wishAt, type Animal, type Coat, type Snack, type Thing } from './things'

// The rules. A town is its saved state and nothing more; every act changes it
// at once and says what happened, and the view catches up in its own time.

export const COLUMNS = 3

export type Town = {
  position: string
  /** The graph on the wall is a vote that has been read. The animals stand on the ground in what came of it. */
  finished: boolean
  /** The mole's next picture is up, and its ballot comes in on the child's next touch. */
  fresh: boolean
  /** How many of the animals are in town, in their own order. */
  count: number
  ballot: [Thing, Thing, Thing | null]
  /** Who stands where, bottom first. */
  columns: Animal[][]
  hidden: Animal | null
  /** The column each snack lies at, or null at home on its sill. */
  snacks: Record<Snack, number | null>
  coats: Record<Animal, Coat>
}

export type Event =
  | { type: 'up'; who: Animal; col: number; row: number; baited: boolean }
  | { type: 'down'; who: Animal }
  | { type: 'bounce'; who: Animal; from: number }
  | { type: 'hide'; who: Animal }
  | { type: 'out'; who: Animal }
  | { type: 'fall'; who: Animal; col: number; row: number }
  | { type: 'bait'; snack: Snack; col: number }
  | { type: 'home'; snack: Snack }
  | { type: 'eat'; snack: Snack; who: Animal }
  | { type: 'spit'; snack: Snack; who: Animal }
  | { type: 'turn'; slot: number }
  | { type: 'return' }
  | { type: 'sweep'; was: { thing: Thing; who: Animal; col: number; row: number }[] }
  | { type: 'arrive'; who: Animal }

export type Result = {
  won: Thing[]
  met: boolean
  /** Who ran to a column when the bell rang. */
  ran: Animal[]
  before: { coats: Record<Animal, Coat>; position: string }
}

export function freshTown(childAge: number | null): Town {
  const wish = wishAt(firstWish(childAge))
  return {
    position: wish.id,
    finished: false,
    fresh: false,
    count: wish.count,
    ballot: [...wish.ballot],
    columns: [[], [], []],
    hidden: null,
    snacks: { carrot: null, cheese: null, bun: null },
    coats: { pig: 'clean', elephant: 'clean', cat: 'clean', mouse: 'clean', goat: 'clean', giraffe: 'clean' },
  }
}

export const here = (town: Town): readonly Animal[] => ANIMALS.slice(0, town.count)
export const columnOf = (town: Town, who: Animal): number => town.columns.findIndex((c) => c.includes(who))
/** Who can still go to a column. */
export const onGround = (town: Town): Animal[] => here(town).filter((who) => town.hidden !== who && columnOf(town, who) < 0)
export const isBaited = (town: Town, who: Animal, col: number): boolean => SNACKS.some((s) => town.snacks[s] === col && LOVERS[s].includes(who))

/** Where an animal goes when it is left to itself. */
export function choice(town: Town, who: Animal): number {
  for (let col = 0; col < COLUMNS; col++) if (town.ballot[col] && isBaited(town, who, col)) return col
  const best = TASTES[who].find((thing) => town.ballot.includes(thing))!
  return town.ballot.indexOf(best)
}

export const stays = (town: Town, who: Animal, col: number): boolean => {
  const thing = town.ballot[col]
  return thing !== null && (!hates(who, thing) || isBaited(town, who, col))
}

export function heights(town: Town): number[] {
  return town.columns.map((c) => c.length)
}

/** What the columns say: every picture whose column is as tall as the tallest. */
export function tallest(town: Town): Thing[] {
  const top = Math.max(...heights(town))
  return top === 0 ? [] : town.ballot.filter((thing, col): thing is Thing => thing !== null && town.columns[col].length === top)
}

function leave(town: Town, who: Animal, out: Event[]): void {
  const col = columnOf(town, who)
  if (town.hidden === who) town.hidden = null
  if (col < 0) return
  const row = town.columns[col].indexOf(who)
  town.columns[col].splice(row, 1)
  for (let r = row; r < town.columns[col].length; r++) out.push({ type: 'fall', who: town.columns[col][r], col, row: r })
}

function climb(town: Town, who: Animal, col: number, out: Event[]): void {
  if (columnOf(town, who) === col) return
  leave(town, who, out)
  town.columns[col].push(who)
  out.push({ type: 'up', who, col, row: town.columns[col].length - 1, baited: isBaited(town, who, col) })
}

/** Nobody stays on what it cannot stand once the snack that held it there is gone. */
function tidy(town: Town, out: Event[]): void {
  for (const who of here(town)) {
    const col = columnOf(town, who)
    if (col < 0 || stays(town, who, col)) continue
    out.push({ type: 'bounce', who, from: col })
    climb(town, who, choice(town, who), out)
  }
}

function bringHome(town: Town, snack: Snack, out: Event[]): void {
  if (town.snacks[snack] === null) return
  town.snacks[snack] = null
  out.push({ type: 'home', snack })
}

/** The basket, the snacks and the third picture come in with the sixth animal, after two votes of nothing but animals, pictures and the bell. */
export const hasTools = (town: Town): boolean => town.count > WISHES[1].count

/** The vote on the wall is over. Does nothing while one is under way. */
export function sweep(town: Town): Event[] {
  const out: Event[] = []
  if (!town.finished) return out
  town.finished = false
  // The wish is still open: everyone climbs back, and one thing can be changed.
  if (!town.fresh) return [{ type: 'return' }]
  out.push({ type: 'sweep', was: town.columns.flatMap((c, col) => c.map((who, row) => ({ thing: town.ballot[col]!, who, col, row }))) })
  town.columns = [[], [], []]
  if (town.hidden) out.push({ type: 'out', who: town.hidden })
  town.hidden = null
  for (const snack of SNACKS) bringHome(town, snack, out)
  const wish = wishAt(town.position)
  wish.ballot.forEach((thing, slot) => { if (thing !== town.ballot[slot]) out.push({ type: 'turn', slot }) })
  town.ballot = [...wish.ballot]
  for (let i = town.count; i < wish.count; i++) out.push({ type: 'arrive', who: ANIMALS[i] })
  town.count = Math.max(town.count, wish.count)
  town.fresh = false
  return out
}

/** A tap: up to what it likes best, then across every other column it can stand, then down; or out of the basket. */
export function tapAnimal(town: Town, who: Animal): Event[] {
  const out = sweep(town)
  // Back in its own square is what that tap did.
  if (out.some((e) => e.type === 'return')) return out
  const first = choice(town, who), round = [first, ...[0, 1, 2].filter((col) => col !== first && stays(town, who, col))]
  const next = round[round.indexOf(columnOf(town, who)) + 1]
  if (town.hidden === who) {
    town.hidden = null
    out.push({ type: 'out', who })
  } else if (next === undefined) {
    leave(town, who, out)
    out.push({ type: 'down', who })
  } else climb(town, who, next, out)
  return out
}

/** A tap on a snack: to the first open picture, then the next along, then home. */
export function tapSnack(town: Town, snack: Snack): Event[] {
  const from = town.snacks[snack] ?? -1
  for (let col = from + 1; col < COLUMNS; col++) if (town.ballot[col]) return bait(town, snack, col)
  return snackHome(town, snack)
}

/** Let go over a column. */
export function putOn(town: Town, who: Animal, col: number): Event[] {
  const out = sweep(town)
  if (!town.ballot[col]) return [...out, ...toGround(town, who)]
  if (!stays(town, who, col)) {
    out.push({ type: 'bounce', who, from: col })
    climb(town, who, choice(town, who), out)
    return out
  }
  if (columnOf(town, who) === col) {
    // Let go over its own column: it lands on top of it.
    leave(town, who, out)
  }
  climb(town, who, col, out)
  return out
}

export function toGround(town: Town, who: Animal): Event[] {
  const out = sweep(town)
  leave(town, who, out)
  out.push({ type: 'down', who })
  return out
}

/** Into the basket. It holds one: whoever was in it hops out. */
export function hide(town: Town, who: Animal): Event[] {
  const out = sweep(town)
  if (town.hidden === who) return out
  const was = town.hidden
  leave(town, who, out)
  if (was) out.push({ type: 'out', who: was })
  town.hidden = who
  out.push({ type: 'hide', who })
  return out
}

export function bait(town: Town, snack: Snack, col: number): Event[] {
  const out = sweep(town)
  if (!town.ballot[col]) {
    out.push({ type: 'home', snack })
    town.snacks[snack] = null
  } else {
    town.snacks[snack] = col
    out.push({ type: 'bait', snack, col })
    for (const who of LOVERS[snack]) if (here(town).includes(who) && town.hidden !== who) climb(town, who, col, out)
  }
  tidy(town, out)
  return out
}

export function snackHome(town: Town, snack: Snack): Event[] {
  const out = sweep(town)
  town.snacks[snack] = null
  out.push({ type: 'home', snack })
  tidy(town, out)
  return out
}

/** A snack given to somebody: eaten with pleasure or spat back. Either way there is one on the sill again. */
export function feed(town: Town, snack: Snack, who: Animal): Event[] {
  const out = sweep(town)
  town.snacks[snack] = null
  out.push({ type: LOVERS[snack].includes(who) ? 'eat' : 'spit', snack, who })
  tidy(town, out)
  return out
}

/** A picture turns over to the next thing, and everyone in a column thinks again. The third can be shut. */
export function turn(town: Town, slot: number): Event[] {
  const fresh = town.finished && town.fresh
  const out = sweep(town)
  if (fresh) return out
  const now = town.ballot[slot]
  const others = town.ballot.filter((_, i) => i !== slot)
  const start = now === null ? -1 : THINGS.indexOf(now)
  let next: Thing | null = null
  for (let i = start + 1; i < start + 1 + THINGS.length; i++) {
    if (slot === 2 && i >= THINGS.length) break
    const thing = THINGS[i % THINGS.length]
    if (!others.includes(thing) && thing !== now) { next = thing; break }
  }
  town.ballot[slot] = next
  out.push({ type: 'turn', slot })
  if (next === null) for (const snack of SNACKS) if (town.snacks[snack] === slot) bringHome(town, snack, out)
  for (const who of here(town)) {
    if (columnOf(town, who) >= 0) climb(town, who, choice(town, who), out)
  }
  return out
}

/** The bell. A vote that has been read is swept away; otherwise everyone left runs to a column and the columns are read. */
export function ring(town: Town): { events: Event[]; result: Result | null } {
  if (town.finished) return { events: sweep(town), result: null }
  const events: Event[] = [], ran = onGround(town)
  for (const who of ran) climb(town, who, choice(town, who), events)
  const won = tallest(town)
  const wish = wishAt(town.position).wish
  const met = wish.length === won.length && wish.every((thing) => won.includes(thing))
  const result: Result = { won, met, ran, before: { coats: { ...town.coats }, position: town.position } }
  for (const who of here(town)) town.coats[who] = coatAfter(town.coats[who], won)
  town.finished = true
  town.fresh = met
  if (met) town.position = nextWish(town.position)
  return { events, result }
}
