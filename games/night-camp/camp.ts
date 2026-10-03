import type { Refusal } from './consequences'
import { fits, load, normalise, openingPlan, ranShort, runNight, tight, type LanternPlan, type Plan } from './night'
import { STATE_VERSION, beginCycle, deserialize, finishCycle, freshState, serialize, type CycleOutcome, type GameState } from './state'
import { IDEAS, MAX_UNFOLDED, PLACES, ROD_LENGTH, SUPPLY_OF, USERS, nightHours, siteFor, usersAt, type Site, type Supply, type User } from './world'

// The camp as it is saved, and everything the child can do to it. This module
// wraps the template's state.ts, which keeps the position in the designed
// order: `deserializeCamp` calls its `deserialize` for those fields and then
// reads the same raw record again for the camp's own, each repaired by itself.
//
// Found as left (ART.md, "What is stored"): a running night is a view of the
// saved plan and is not saved; the morning is saved as its scene starts and is
// worked out again from the plan on load, so nothing replays; and no clock is
// read anywhere.

/** The marshmallow trail is kept as cells of a coarse grid over the map. */
export const TRAIL_COLS = 16
export const TRAIL_ROWS = 11
export const TRAIL_MAX = 24
/** A tight night counts as going well when it is reached by this many nights at a site. */
export const NIGHTS_FOR_WELL = 3
/** Nights beyond this are not counted further. */
export const NIGHTS_CAP = 9

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
  /** For each user, how many spans of its card are stamped along the ruler in pencil. */
  strips: Record<User, number>
  /** The marshmallow trail, as cells of the coarse grid, oldest first. */
  trail: number[]
  /** Dusk, with the cursor at its stop and the plan open, or the morning after a night slid to dawn. */
  phase: 'dusk' | 'morning'
  /** The nights slid to dawn at this site with a changed plan. Never shown. */
  nights: number
  /** The plan changed since the last night slid to dawn. */
  changed: boolean
  /** The first showings already given. */
  shown: string[]
}

export const siteOf = (state: CampState): Site => siteFor(state.position, state.variant)
export const planOf = (state: CampState): Plan => ({ logs: state.logs, oil: state.oil, water: state.water, fire: state.fire, lanterns: state.lanterns })
export const hoursOf = (state: CampState): number => nightHours(siteOf(state), state.unfolded)

const NO_STRIPS = (): Record<User, number> => ({ fire: 0, lantern: 0, kettle: 0 })
const KNOWN_IDEAS = Object.values(IDEAS).filter((idea): idea is string => idea !== null)

function layOut(base: GameState, variant: number, shown: string[]): CampState {
  const plan = openingPlan(siteFor(base.position, variant))
  return { ...base, variant, unfolded: 0, ...plan, lanterns: [...plan.lanterns], strips: NO_STRIPS(), trail: [], phase: 'dusk', nights: 0, changed: false, shown }
}

/** A first visit: the first site of the position the child's age starts at, at dusk, with empty rods. */
export function freshCamp(childAge: number | null): CampState {
  return layOut(freshState(childAge), 0, [])
}

/** The most spans of a user's card that can be stamped along the ruler: up to the stamp that covers dawn. */
export function mostSpans(site: Site, plan: Plan, hours: number, user: User): number {
  if (!usersAt(site).includes(user)) return 0
  const span = user === 'fire' ? site.fire[plan.fire].amount.hours : user === 'lantern' ? site.wicks[plan.lanterns[0]?.wick ?? 0].amount.hours : site.kettle!.everyHours
  return Math.ceil(hours / span)
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

const whole = (raw: unknown, low: number, high: number, fallback: number): number =>
  typeof raw === 'number' && Number.isInteger(raw) && raw >= low && raw <= high ? raw : fallback

/**
 * Saved state is untrusted. Anything that is not this game's record, or a
 * version this build cannot read, gives a fresh camp. Inside a record each
 * field is repaired by itself, and then the plan is made legal for the site it
 * belongs to: a damaged field takes its default and the rest is kept.
 */
export function deserializeCamp(raw: unknown, childAge: number | null = null): CampState {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return freshCamp(childAge)
  const record = raw as Record<string, unknown>
  if (record.v !== STATE_VERSION) return freshCamp(childAge)
  // The cycle on screen is never a finished one in a save: the touch that ends a cycle begins the next.
  const base = beginCycle(deserialize(raw, childAge))
  const variant = whole(record.variant, 0, 9999, 0), site = siteFor(base.position, variant)
  const unfolded = whole(record.unfolded, 0, MAX_UNFOLDED, 0), hours = nightHours(site, unfolded)
  const plan = cutToSled(site, normalise(site, record as Partial<Plan>))
  const rawStrips = (typeof record.strips === 'object' && record.strips !== null ? record.strips : {}) as Record<string, unknown>
  const strips = NO_STRIPS()
  for (const user of USERS) strips[user] = whole(rawStrips[user], 0, mostSpans(site, plan, hours, user), 0)
  const trail: number[] = []
  if (Array.isArray(record.trail))
    for (const cell of record.trail)
      if (trail.length < TRAIL_MAX && typeof cell === 'number' && Number.isInteger(cell) && cell >= 0 && cell < TRAIL_COLS * TRAIL_ROWS && !trail.includes(cell)) trail.push(cell)
  const nights = whole(record.nights, 0, NIGHTS_CAP, 0), changed = record.changed === true
  const shown = Array.isArray(record.shown) ? KNOWN_IDEAS.filter((idea) => (record.shown as unknown[]).includes(idea)) : []
  // A morning stands only over a night that was slid to dawn with the plan as it is.
  const phase = record.phase === 'morning' && nights > 0 && !changed ? 'morning' : 'dusk'
  return { ...base, variant, unfolded, ...plan, lanterns: [...plan.lanterns], strips, trail, phase, nights, changed, shown }
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
    strips: { fire: state.strips.fire, lantern: state.strips.lantern, kettle: state.strips.kettle },
    trail: [...state.trail],
    phase: state.phase,
    nights: state.nights,
    changed: state.changed,
    shown: [...state.shown],
  }
}

/** The plan was changed: the morning, if there was one, is over, and the cursor is back at dusk. Pencil strips past the ruler's end are cut. */
function replan(state: CampState, plan: Plan, unfolded = state.unfolded): CampState {
  const site = siteOf(state), hours = nightHours(site, unfolded), strips = NO_STRIPS()
  for (const user of USERS) strips[user] = Math.min(state.strips[user], mostSpans(site, plan, hours, user))
  return { ...state, ...plan, lanterns: [...plan.lanterns], unfolded, strips, phase: 'dusk', changed: true }
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

/** Stand a lantern on a pin. On a pin that is taken it slides off to the next free one. */
export function moveLantern(state: CampState, index: number, pin: number): CampState {
  if (!state.lanterns[index] || !Number.isInteger(pin) || pin < 0 || pin >= siteOf(state).pins.length) return state
  // The moved lantern takes its pin first, so the one that was there is the one that slides off.
  const moved = state.lanterns.map((lantern, i) => (i === index ? { ...lantern, pin } : lantern))
  const order = [index, ...moved.map((_, i) => i).filter((i) => i !== index)]
  const settled = normalise(siteOf(state), { ...planOf(state), lanterns: order.map((i) => moved[i]) }).lanterns
  const lanterns = moved.map((_, i) => settled[order.indexOf(i)])
  return samePlan({ ...planOf(state), lanterns }, planOf(state)) ? state : replan(state, { ...planOf(state), lanterns })
}

/** Click a lantern's wick between low and high. */
export function clickWick(state: CampState, index: number): CampState {
  if (!state.lanterns[index]) return state
  return withPlan(state, { lanterns: state.lanterns.map((lantern, i) => (i === index ? { ...lantern, wick: lantern.wick === 0 ? 1 : 0 } : lantern)) })
}

/** Unfold or fold back sections of the ruler: the harder option, chosen by the child. */
export function unfold(state: CampState, sections: number): CampState {
  const unfolded = Math.max(0, Math.min(MAX_UNFOLDED, Math.round(Number.isFinite(sections) ? sections : 0)))
  return unfolded === state.unfolded ? state : replan(state, planOf(state), unfolded)
}

/** Stamp a user's card along the ruler up to a count of spans. The strip is the child's own pencil: it changes no night. */
export function stamp(state: CampState, user: User, spans: number): CampState {
  const most = mostSpans(siteOf(state), planOf(state), hoursOf(state), user)
  const laid = Math.max(0, Math.min(most, Math.round(Number.isFinite(spans) ? spans : 0)))
  return laid === state.strips[user] ? state : { ...state, strips: { ...state.strips, [user]: laid } }
}

/** Lay one more marshmallow of the trail. A cell already on the trail stays once, and the trail keeps its newest cells. */
export function layTrail(state: CampState, cell: number): CampState {
  if (!Number.isInteger(cell) || cell < 0 || cell >= TRAIL_COLS * TRAIL_ROWS || state.trail.includes(cell)) return state
  return { ...state, trail: [...state.trail, cell].slice(-TRAIL_MAX) }
}

/** The calm way to tidy up: the trail is gathered back into the tin. */
export function gatherTrail(state: CampState): CampState {
  return state.trail.length === 0 ? state : { ...state, trail: [] }
}

/**
 * The cursor reached dawn. Call this as the morning scene starts and save at
 * once, so a put-away during the scene loses nothing and nothing replays. A
 * night counts once for each plan: sliding the same plan to dawn again counts
 * nothing. `showing` is the idea to be shown now, once, after the child's own
 * try, or null.
 */
export function reachDawn(state: CampState): { state: CampState; showing: string | null } {
  if (state.phase === 'morning') return { state, showing: null }
  const nights = state.changed || state.nights === 0 ? Math.min(NIGHTS_CAP, state.nights + 1) : state.nights
  const idea = IDEAS[state.position] ?? null, showing = idea !== null && !state.shown.includes(idea) ? idea : null
  return { state: { ...state, phase: 'morning', nights, changed: false, shown: showing ? [...state.shown, showing] : state.shown }, showing }
}

/** The child slid the cursor back from dawn: the same site, the same plan, open again. */
export function backToDusk(state: CampState): CampState {
  return state.phase === 'dusk' ? state : { ...state, phase: 'dusk' }
}

/**
 * How the cycle went, judged when the child moves on, from the plan as it
 * stands if it has been slid to dawn. Well: nothing ran short, nothing much
 * is left over, and it was reached by the third night. Badly: something ran
 * short. Mixed: anything else, a plan that has not been slid to dawn included.
 */
export function judge(state: CampState): CycleOutcome {
  if (state.nights === 0 || state.changed) return 'mixed'
  const site = siteOf(state), plan = planOf(state), night = runNight(site, plan, state.unfolded)
  if (ranShort(night)) return 'badly'
  return tight(site, plan, night) && state.nights <= NIGHTS_FOR_WELL ? 'well' : 'mixed'
}

/**
 * The child touched the fold of the map. The cycle ends and is judged, the
 * position moves at most one step, and the next site is laid out at once from
 * the new position, in its next variant, at dusk with empty rods. Save at once.
 */
export function moveOn(state: CampState): { state: CampState; outcome: CycleOutcome } {
  const outcome = judge(state)
  const base = beginCycle(finishCycle({ v: state.v, position: state.position, finished: false }, outcome))
  return { state: layOut(base, (state.variant + 1) % 10000, [...state.shown]), outcome }
}
