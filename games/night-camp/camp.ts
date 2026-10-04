import type { Refusal } from './consequences'
import { fits, load, normalise, openingPlan, ranShort, runNight, tight, type LanternPlan, type Plan } from './night'
import { HALVES, compare, fraction, whole, type Amount, type Fraction } from './ratio'
import { STATE_VERSION, beginCycle, deserialize, finishCycle, freshState, serialize, type CycleOutcome, type GameState } from './state'
import { FETCHED, IDEAS, PLACES, ROD_LENGTH, SUPPLY_OF, USERS, nightHours, sectionsAt, sidesAt, siteFor, usersAt, type Side, type Site, type Supply, type User } from './world'

// The camp as it is saved, and everything the child can do to it. This module
// wraps the template's state.ts, which keeps the position in the designed
// order: `deserializeCamp` calls its `deserialize` for those fields and then
// reads the same raw record again for the camp's own, each repaired by itself.
//
// Found as left (ART.md, "What is stored"): a running night is a view of the
// saved plan and is not saved. The morning is saved as its scene starts, with
// how the night ended (`last`) and where each user ran out (`pins`) written
// at that moment, because the plan may be changed afterwards and the night
// that was run can then no longer be worked out. What stays on screen is
// stored, and no clock is read anywhere.

/** The marshmallow trail is kept as cells of a coarse grid over the map. */
export const TRAIL_COLS = 16
export const TRAIL_ROWS = 11
export const TRAIL_MAX = 24
/** A tight night counts as close when it is reached by this many nights at a site. */
export const NIGHTS_FOR_WELL = 3
/** Nights beyond this are not counted further. */
export const NIGHTS_CAP = 9
/** The most stamps one user's strips hold. */
export const STAMPS_MAX = 64

/** One stamp of an amount card along the ruler: which card of the user made it (the dial setting it belongs to), and the side it lay on. */
export type Stamp = { card: number; side: Side }
/** How the night the judging reads ended. */
export type Last = 'none' | 'short' | 'over' | 'close' | 'late'
const LASTS: readonly Last[] = ['none', 'short', 'over', 'close', 'late']
/** The mark of a "lights out" scene already played for a user at this site. */
export const outMark = (user: User): string => `out-${user}`

export type CampState = GameState & {
  /** Which variant of the position is laid out at this site. */
  variant: number
  /** The extra sections of the ruler the child has unfolded. */
  unfolded: number
  /** The pieces laid in on each rod. */
  logs: number
  oil: number
  water: number
  /** The fire dial's setting. */
  fire: number
  /** For each lantern, the pin it stands on and its wick. */
  lanterns: LanternPlan[]
  /** For each user, the stamps laid along the ruler in pencil, in order. */
  strips: Record<User, Stamp[]>
  /** For each user, the side its amount card lies on. */
  cards: Record<User, Side>
  /** The marshmallow trail, as cells of the coarse grid, oldest first. */
  trail: number[]
  /** Dusk, with the cursor at its stop and the plan open, or the morning after a night slid to dawn. */
  phase: 'dusk' | 'morning'
  /** The nights slid to dawn at this site with a changed plan. Never shown. */
  nights: number
  /** The plan changed since the last night slid to dawn. */
  changed: boolean
  /** How the night that the judging reads ended. Once it is close or late it is not overwritten at this site. Never shown. */
  last: Last
  /** For each user, the moment it ran out in the last night slid to dawn at this site, in hours from dusk, or none. */
  pins: Record<User, Fraction | null>
  /** The first showings already given: a neat way for each idea, kept across sites, and lights out for each user at this site. */
  shown: string[]
}

export const siteOf = (state: CampState): Site => siteFor(state.position, state.variant)
export const planOf = (state: CampState): Plan => ({ logs: state.logs, oil: state.oil, water: state.water, fire: state.fire, lanterns: state.lanterns })
export const hoursOf = (state: CampState): number => nightHours(siteOf(state), state.unfolded)

const each = <T>(make: (user: User) => T): Record<User, T> => ({ fire: make('fire'), lantern: make('lantern'), kettle: make('kettle') })
const KNOWN_IDEAS = Object.values(IDEAS).filter((idea): idea is string => idea !== null)
const KNOWN_MARKS = [...KNOWN_IDEAS, ...USERS.map(outMark)]

function layOut(base: GameState, variant: number, shown: string[]): CampState {
  const plan = openingPlan(siteFor(base.position, variant))
  return {
    ...base, variant, unfolded: 0, ...plan, lanterns: [...plan.lanterns],
    strips: each<Stamp[]>(() => []), cards: each<Side>(() => 'single'), trail: [], phase: 'dusk', nights: 0, changed: false, last: 'none', pins: each<Fraction | null>(() => null), shown,
  }
}

/** A first visit: the first site of the position the child's age starts at, at dusk, with empty rods. */
export function freshCamp(childAge: number | null): CampState {
  return layOut(freshState(childAge), 0, [])
}

/** How many cards a user has at a site: one for each setting of its dial. */
export function cardsOf(site: Site, user: User): number {
  if (!usersAt(site).includes(user)) return 0
  return user === 'fire' ? site.fire.length : user === 'lantern' ? site.wicks.length : 1
}

/** The card a user's dial stands on now. The lanterns' card is the first lantern's wick. */
export function cardNow(plan: Plan, user: User): number {
  return user === 'fire' ? plan.fire : user === 'lantern' ? (plan.lanterns[0]?.wick ?? 0) : 0
}

/** What a card shows: so many pieces under so many hours of ruler. The kettle's card is a round for the whole line. */
export function cardAmount(site: Site, user: User, card: number): Amount {
  if (user === 'fire') return site.fire[card].amount
  if (user === 'lantern') return site.wicks[card as 0 | 1].amount
  return { pieces: site.kettle!.cups * site.tents.length, hours: site.kettle!.everyHours }
}

/** The stamps that can stand along a ruler of this length: for each card in turn, only those that start inside the night. */
function standing(site: Site, user: User, stamps: readonly Stamp[], hours: number): Stamp[] {
  const reach = new Map<number, number>(), kept: Stamp[] = []
  for (const stamp of stamps) {
    if (kept.length >= STAMPS_MAX) break
    const span = cardAmount(site, user, stamp.card).hours, halves = reach.get(stamp.card) ?? 0
    if (halves * span >= 2 * hours) continue
    reach.set(stamp.card, halves + HALVES[stamp.side])
    kept.push(stamp)
  }
  return kept
}

/** A plan that is over the sled's bed is cut back until it fits: logs first, then water, then oil. */
function cutToSled(site: Site, plan: Plan): Plan {
  let cut = plan
  for (const supply of ['logs', 'water', 'oil'] as const) {
    if (fits(site, cut)) break
    const over = load(cut) - site.sled!
    cut = { ...cut, [supply]: Math.max(0, cut[supply] - Math.ceil(over / PLACES[supply])) }
  }
  return cut
}

const int = (raw: unknown, low: number, high: number, fallback: number): number =>
  typeof raw === 'number' && Number.isInteger(raw) && raw >= low && raw <= high ? raw : fallback
const record = (raw: unknown): Record<string, unknown> => (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {})

/**
 * Saved state is untrusted. Anything that is not this game's record, or a
 * version this build cannot read, gives a fresh camp. Inside a record each
 * field is repaired by itself, and then the plan is made legal for the site it
 * belongs to: a damaged field takes its default and the rest is kept.
 */
export function deserializeCamp(raw: unknown, childAge: number | null = null): CampState {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return freshCamp(childAge)
  const saved = raw as Record<string, unknown>
  if (saved.v !== STATE_VERSION) return freshCamp(childAge)
  // The cycle on screen is never a finished one in a save: the touch that ends a cycle begins the next.
  const base = beginCycle(deserialize(raw, childAge))
  const variant = int(saved.variant, 0, 9999, 0), site = siteFor(base.position, variant)
  const unfolded = int(saved.unfolded, 0, sectionsAt(site), 0), hours = nightHours(site, unfolded)
  const plan = cutToSled(site, normalise(site, saved as Partial<Plan>))
  const sides = sidesAt(site), rawStrips = record(saved.strips), rawCards = record(saved.cards), rawPins = record(saved.pins)
  const strips = each<Stamp[]>((user) => {
    const list = Array.isArray(rawStrips[user]) ? (rawStrips[user] as unknown[]) : [], cards = cardsOf(site, user), good: Stamp[] = []
    for (const one of list) {
      const stamp = record(one)
      if (Number.isInteger(stamp.card) && (stamp.card as number) >= 0 && (stamp.card as number) < cards && sides.includes(stamp.side as Side)) good.push({ card: stamp.card as number, side: stamp.side as Side })
    }
    return standing(site, user, good, hours)
  })
  const cards = each<Side>((user) => (cardsOf(site, user) > 0 && sides.includes(rawCards[user] as Side) ? (rawCards[user] as Side) : 'single'))
  const trail: number[] = []
  if (Array.isArray(saved.trail))
    for (const cell of saved.trail)
      if (trail.length < TRAIL_MAX && typeof cell === 'number' && Number.isInteger(cell) && cell >= 0 && cell < TRAIL_COLS * TRAIL_ROWS && !trail.includes(cell)) trail.push(cell)
  const nights = int(saved.nights, 0, NIGHTS_CAP, 0), changed = saved.changed === true
  // Nothing is known of a night at a site where none was slid to dawn.
  const last: Last = nights > 0 && LASTS.includes(saved.last as Last) ? (saved.last as Last) : 'none'
  const pins = each<Fraction | null>((user) => {
    const pin = record(rawPins[user])
    if (nights === 0 || cardsOf(site, user) === 0 || !Number.isInteger(pin.num) || !Number.isInteger(pin.den) || (pin.den as number) <= 0 || (pin.num as number) < 0) return null
    const at = fraction(pin.num as number, pin.den as number)
    return compare(at, whole(hours)) < 0 ? at : null
  })
  const shown = Array.isArray(saved.shown) ? KNOWN_MARKS.filter((mark) => (saved.shown as unknown[]).includes(mark)) : []
  // A morning stands only over a night that was slid to dawn with the plan as it is.
  const phase = saved.phase === 'morning' && nights > 0 && !changed ? 'morning' : 'dusk'
  return { ...base, variant, unfolded, ...plan, lanterns: [...plan.lanterns], strips, cards, trail, phase, nights, changed, last, pins, shown }
}

export function serializeCamp(state: CampState): CampState {
  return {
    ...serialize(state),
    variant: state.variant,
    unfolded: state.unfolded,
    logs: state.logs,
    oil: state.oil,
    water: state.water,
    fire: state.fire,
    lanterns: state.lanterns.map((lantern) => ({ pin: lantern.pin, wick: lantern.wick })),
    strips: each((user) => state.strips[user].map((stamp) => ({ card: stamp.card, side: stamp.side }))),
    cards: each((user) => state.cards[user]),
    trail: [...state.trail],
    phase: state.phase,
    nights: state.nights,
    changed: state.changed,
    last: state.last,
    pins: each((user) => (state.pins[user] ? { num: state.pins[user]!.num, den: state.pins[user]!.den } : null)),
    // Always in the one order, so a camp reads back exactly as it was written.
    shown: KNOWN_MARKS.filter((mark) => state.shown.includes(mark)),
  }
}

/**
 * The plan was changed: the morning, if there was one, is over, and the
 * cursor is back at dusk. The pins stay where they fell, from `pins`, until
 * the next night is slid to dawn. Stamps past the ruler's end are rubbed out.
 */
function replan(state: CampState, plan: Plan, unfolded = state.unfolded): CampState {
  const site = siteOf(state), hours = nightHours(site, unfolded)
  return { ...state, ...plan, lanterns: [...plan.lanterns], unfolded, strips: each((user) => standing(site, user, state.strips[user], hours)), phase: 'dusk', changed: true }
}

const samePlan = (a: Plan, b: Plan) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Lay a supply in to a count of pieces, by pulling its row out or pushing it
 * back. The pull is followed as far as the rod and the sled allow. Where it is
 * not followed all the way, the refusal says why, so the world can show it:
 * the piece slides off the tail of the sled, or off the end of the rod.
 */
export function layIn(state: CampState, supply: Supply, pieces: number): { state: CampState; refusal: Refusal | null } {
  const site = siteOf(state), asked = Math.max(0, Math.round(Number.isFinite(pieces) ? pieces : 0)), now = state[supply]
  const user = USERS.find((one) => SUPPLY_OF[one] === supply)!
  if (!usersAt(site).includes(user)) return { state, refusal: null }
  if (site.given) return { state, refusal: asked === now ? null : { kind: 'strapped', supply, asked, laid: now } }
  const others = load(planOf(state)) - now * PLACES[supply]
  const onSled = site.sled === null ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor((site.sled - others) / PLACES[supply]))
  const laid = Math.min(asked, ROD_LENGTH[supply], onSled)
  const refusal: Refusal | null = laid === asked ? null : { kind: onSled < ROD_LENGTH[supply] && laid === onSled ? 'sled-full' : 'rod-full', supply, asked, laid }
  return { state: laid === now ? state : replan(state, { ...planOf(state), [supply]: laid }), refusal }
}

function withPlan(state: CampState, part: Partial<Plan>): CampState {
  const plan = normalise(siteOf(state), { ...planOf(state), ...part })
  return samePlan(plan, planOf(state)) ? state : replan(state, plan)
}

/** Turn the fire's dial. A setting the dial does not have leaves it where it was. */
export function turnDial(state: CampState, setting: number): CampState {
  return Number.isInteger(setting) && setting >= 0 && setting < siteOf(state).fire.length ? withPlan(state, { fire: setting }) : state
}

/**
 * Stand a lantern on a free pin. Dropped on a pin where another lantern stands, the two stack and sway and it hops
 * back to the pin it came from: that is a wrong use, and it changes nothing.
 */
export function moveLantern(state: CampState, index: number, pin: number): CampState {
  if (!state.lanterns[index] || !Number.isInteger(pin) || pin < 0 || pin >= siteOf(state).pins.length) return state
  if (state.lanterns.some((lantern, i) => i !== index && lantern.pin === pin)) return state
  return withPlan(state, { lanterns: state.lanterns.map((lantern, i) => (i === index ? { ...lantern, pin } : lantern)) })
}

/** Click a lantern's wick between low and high. */
export function clickWick(state: CampState, index: number): CampState {
  if (!state.lanterns[index]) return state
  return withPlan(state, { lanterns: state.lanterns.map((lantern, i) => (i === index ? { ...lantern, wick: lantern.wick === 0 ? 1 : 0 } : lantern)) })
}

/** Unfold or fold back sections of the ruler: the harder option, chosen by the child. Where the load is given, the ruler has none to unfold. */
export function unfold(state: CampState, sections: number): CampState {
  const unfolded = Math.max(0, Math.min(sectionsAt(siteOf(state)), Math.round(Number.isFinite(sections) ? sections : 0)))
  return unfolded === state.unfolded ? state : replan(state, planOf(state), unfolded)
}

/** Flip a user's amount card to its next side: single, doubled, and from the position that brings it, halved. */
export function flipCard(state: CampState, user: User): CampState {
  const site = siteOf(state)
  if (cardsOf(site, user) === 0) return state
  const sides = sidesAt(site)
  return { ...state, cards: { ...state.cards, [user]: sides[(sides.indexOf(state.cards[user]) + 1) % sides.length] } }
}

/**
 * Stamp a user's card once more along the ruler, on the side it lies on, under
 * the last stamp of the same card. A stamp that would start at dawn or after
 * is not laid. The strip is the child's own pencil: it changes no night.
 */
export function stamp(state: CampState, user: User): CampState {
  const site = siteOf(state)
  if (cardsOf(site, user) === 0) return state
  const more = [...state.strips[user], { card: cardNow(planOf(state), user), side: state.cards[user] }]
  const kept = standing(site, user, more, hoursOf(state))
  return kept.length === state.strips[user].length ? state : { ...state, strips: { ...state.strips, [user]: kept } }
}

/** Rub a user's strip out from its end, keeping its first stamps. */
export function rubOut(state: CampState, user: User, keep = 0): CampState {
  const kept = state.strips[user].slice(0, Math.max(0, Math.round(Number.isFinite(keep) ? keep : 0)))
  return kept.length === state.strips[user].length ? state : { ...state, strips: { ...state.strips, [user]: kept } }
}

/** Rub out the last stamp of one card's own row, and leave the rows of the user's other cards as they are. */
export function rubLast(state: CampState, user: User, card: number): CampState {
  const all = state.strips[user], at = all.map((one) => one.card).lastIndexOf(card)
  return at < 0 ? state : { ...state, strips: { ...state.strips, [user]: all.filter((_, i) => i !== at) } }
}

/** One card's row of a user's strip: the sides of its stamps in order, for `stampedStrip` in ratio.ts. */
export function rowOf(state: CampState, user: User, card: number): Side[] {
  return state.strips[user].filter((one) => one.card === card).map((one) => one.side)
}

/** Lay one more marshmallow of the trail. A cell already on the trail stays once, and the trail keeps its newest cells. */
export function layTrail(state: CampState, cell: number): CampState {
  if (!Number.isInteger(cell) || cell < 0 || cell >= TRAIL_COLS * TRAIL_ROWS || state.trail.includes(cell)) return state
  return { ...state, trail: [...state.trail, cell].slice(-TRAIL_MAX) }
}

/** One marshmallow of the trail is picked up again. */
export function pickTrail(state: CampState, cell: number): CampState {
  return state.trail.includes(cell) ? { ...state, trail: state.trail.filter((one) => one !== cell) } : state
}

/**
 * The scout's neat way with a card: its row is brought to at least so many stamps of a side, and the card is left on
 * that side. A row that already has them is left as the child made it, so the showing can be fetched again and again
 * and never rubs out a child's own strip.
 */
export function showStamps(state: CampState, user: User, card: number, side: Side, count: number): CampState {
  const site = siteOf(state)
  if (cardsOf(site, user) === 0 || card < 0 || card >= cardsOf(site, user) || !sidesAt(site).includes(side)) return state
  let stamps = state.strips[user]
  for (let n = stamps.filter((one) => one.card === card && one.side === side).length; n < count; n++) stamps = standing(site, user, [...stamps, { card, side }], hoursOf(state))
  return { ...state, strips: { ...state.strips, [user]: stamps }, cards: { ...state.cards, [user]: side } }
}

/** The calm way to tidy up: the trail is gathered back into the tin. */
export function gatherTrail(state: CampState): CampState {
  return state.trail.length === 0 ? state : { ...state, trail: [] }
}

/** Where each user ran out in a night, or none for one that lasted. */
function pinsOf(site: Site, plan: Plan, unfolded: number): { pins: Record<User, Fraction | null>; short: boolean; tight: boolean } {
  const night = runNight(site, plan, unfolded)
  const pins = each<Fraction | null>((user) => {
    if (user === 'fire') return night.fire.short ? night.fire.until : null
    if (user === 'lantern') return night.lantern?.short ? night.lantern.until : null
    return night.kettle && night.kettle.firstShort !== null ? whole(night.kettle.firstShort) : null
  })
  return { pins, short: ranShort(night), tight: tight(site, plan, night) }
}

/**
 * The cursor reached dawn. Call this as the morning scene starts and save at
 * once, so a put-away during the scene loses nothing and nothing replays. It
 * writes how the night ended and where each user ran out, since the plan may
 * be changed afterwards. A night counts once for each plan: sliding the same
 * plan to dawn again counts nothing. Once a night at this site ended with
 * nothing short and little left over, by the third night or after it, a later
 * one is not judged: a night staged to go dark costs nothing.
 * `showing` is the idea to be shown now, once, after the child's own try.
 */
export function reachDawn(state: CampState): { state: CampState; showing: string | null } {
  if (state.phase === 'morning') return { state, showing: null }
  const nights = state.changed || state.nights === 0 ? Math.min(NIGHTS_CAP, state.nights + 1) : state.nights
  const ran = pinsOf(siteOf(state), planOf(state), state.unfolded)
  const ended: Last = ran.short ? 'short' : !ran.tight ? 'over' : nights <= NIGHTS_FOR_WELL ? 'close' : 'late'
  const idea = IDEAS[state.position] ?? null, showing = idea !== null && !state.shown.includes(idea) ? idea : null
  return {
    state: { ...state, phase: 'morning', nights, changed: false, last: state.last === 'close' || state.last === 'late' ? state.last : ended, pins: ran.pins, shown: showing ? [...state.shown, showing] : state.shown },
    showing,
  }
}

/** The child slid the cursor back from dawn: the same site, the same plan, open again. */
export function backToDusk(state: CampState): CampState {
  return state.phase === 'dusk' ? state : { ...state, phase: 'dusk' }
}

/**
 * A user went out as the cursor passed that moment. The first time at this
 * site the camp plays it out as a scene; after that only the pin, the dark and
 * the campers' own reactions show. Save at once when `first` is true.
 */
export function lightsOut(state: CampState, user: User): { state: CampState; first: boolean } {
  const mark = outMark(user)
  return state.shown.includes(mark) ? { state, first: false } : { state: { ...state, shown: [...state.shown, mark] }, first: true }
}

/**
 * The child tapped the scout at dusk: the move to play, if it has had its one showing. That is the position's own
 * move, or, where the position brings none, an earlier one played with this site's own card and ruler. With none
 * shown yet the scout only answers the tap in the scout's own way. Help is fetched, never offered again unasked.
 */
export function fetchNeatWay(state: CampState): string | null {
  const idea = IDEAS[state.position] ?? FETCHED[state.position] ?? null
  return state.phase === 'dusk' && idea !== null && state.shown.includes(idea) ? idea : null
}

/** How the cycle went, judged when the child moves on, from how the night that the judging reads ended. */
export function judge(state: CampState): CycleOutcome {
  return state.last === 'close' ? 'well' : state.last === 'short' ? 'badly' : 'mixed'
}

/**
 * The child touched the fold of the map. The cycle ends and is judged, the
 * position moves at most one step, and the next site is laid out at once from
 * the new position, in the next variant in turn, at dusk with empty rods.
 * Save at once.
 */
export function moveOn(state: CampState): { state: CampState; outcome: CycleOutcome } {
  const outcome = judge(state)
  const base = beginCycle(finishCycle({ v: state.v, position: state.position, finished: false }, outcome))
  // The marks of lights out belong to the site that is left; a neat way is shown once for good.
  return { state: layOut(base, (state.variant + 1) % 10000, state.shown.filter((mark) => KNOWN_IDEAS.includes(mark))), outcome }
}
