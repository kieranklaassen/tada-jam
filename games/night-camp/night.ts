import { compare, fraction, lastsHours, least, neededFor, usedIn, value, whole, type Amount, type Fraction } from './ratio'
import { CUPS_IN_A_CAN, PLACES, ROD_LENGTH, SUPPLIES, nightHours, type CamperId, type Ring, type Site, type Supply } from './world'

// The night as the plan gives it. A night is a pure function of the site, the
// plan and how far the ruler is unfolded: the same plan always gives the same
// night, so a running night is a view of the saved plan and is never saved.
//
// The model is true to its own claim (ART.md, "The representation"): every
// supply is used at a steady amount for each span of time, a user goes out at
// the exact moment its stock is gone, and nothing is rounded but the pieces a
// night needs, where a part piece means one more.

export type LanternPlan = { readonly pin: number; readonly wick: 0 | 1 }

/** What the child sets: the pieces laid in on each rod, the fire's dial, and where each lantern stands and how high it burns. */
export type Plan = {
  readonly logs: number
  readonly oil: number
  readonly water: number
  readonly fire: number
  readonly lanterns: readonly LanternPlan[]
}

/** The plan a site opens with: empty rods (or the stock strapped on the sled), the lowest fire, each lantern on its own pin with a low wick. */
export function openingPlan(site: Site): Plan {
  return normalise(site, { logs: 0, oil: 0, water: 0, fire: 0, lanterns: [] })
}

const int = (raw: unknown, low: number, high: number, fallback: number): number =>
  typeof raw === 'number' && Number.isInteger(raw) && raw >= low && raw <= high ? raw : fallback

/**
 * A plan made legal for a site, each part repaired by itself: a stock outside
 * its rod is cut to it, a strapped stock is as given, a rod with no user is
 * empty, a setting the dial does not have is the lowest, and every lantern
 * stands on a pin of its own. A lantern is never put away: it always stands
 * somewhere and always burns in the night.
 */
export function normalise(site: Site, raw: Partial<Plan> | null | undefined): Plan {
  const plan = raw ?? {}
  const stock = (supply: Supply, used: boolean): number => {
    if (site.given) return site.given[supply] ?? 0
    const laid = plan[supply]
    if (!used || typeof laid !== 'number' || !Number.isInteger(laid)) return 0
    return Math.max(0, Math.min(ROD_LENGTH[supply], laid))
  }
  const taken = new Set<number>()
  const lanterns: LanternPlan[] = []
  const given = Array.isArray(plan.lanterns) ? plan.lanterns : []
  for (let i = 0; i < site.lanterns; i++) {
    const want = given[i] as Partial<LanternPlan> | undefined
    let at = int(want?.pin, 0, site.pins.length - 1, i % Math.max(1, site.pins.length))
    // Two lanterns never share a pin: the later one takes the next free pin.
    for (let tries = 0; taken.has(at) && tries < site.pins.length; tries++) at = (at + 1) % site.pins.length
    taken.add(at)
    lanterns.push({ pin: at, wick: want?.wick === 1 ? 1 : 0 })
  }
  return {
    logs: stock('logs', true),
    oil: stock('oil', site.lanterns > 0),
    water: stock('water', site.kettle !== null),
    fire: int(plan.fire, 0, site.fire.length - 1, 0),
    lanterns,
  }
}

/** The places a plan takes on the sled's bed. */
export function load(plan: Plan): number {
  return SUPPLIES.reduce((sum, supply) => sum + plan[supply] * PLACES[supply], 0)
}

/** Whether the plan fits the sled. A site with no sled, or with its stock strapped on, always fits. */
export function fits(site: Site, plan: Plan): boolean {
  return site.sled === null || site.given !== null || load(plan) <= site.sled
}

/** What all the lanterns burn together, as one amount: a third and a half of a flask for one hour are five flasks for six hours. */
export function lanternAmount(site: Site, plan: Plan): Amount | null {
  if (plan.lanterns.length === 0) return null
  let sum = fraction(0, 1)
  for (const lantern of plan.lanterns) {
    const amount = site.wicks[lantern.wick].amount
    sum = fraction(sum.num * amount.hours + amount.pieces * sum.den, sum.den * amount.hours)
  }
  return { pieces: sum.num, hours: sum.den }
}

/** How one user's night went. */
export type Run = {
  /** The amount it burned at. */
  readonly amount: Amount
  /** The moment it went out, or dawn if it lasted. */
  readonly until: Fraction
  /** It went out before dawn. */
  readonly short: boolean
  /** What it used, exactly, and what was left on the rod. */
  readonly used: Fraction
  readonly left: Fraction
  /** The whole pieces the night needs at this amount. */
  readonly needed: number
}

export type Round = {
  /** The hour at which the round is poured, counted from dusk. */
  readonly hour: number
  readonly served: readonly CamperId[]
  /** The campers at the end of the line who held an empty mug. */
  readonly missed: readonly CamperId[]
  /** The fire was out, so the round was poured cold. */
  readonly cold: boolean
}

export type KettleRun = {
  readonly rounds: readonly Round[]
  readonly short: boolean
  /** The hour of the first round that did not go all the way down the line. */
  readonly firstShort: number | null
  readonly usedCups: number
  readonly leftCups: number
  /** The whole cans the night needs. */
  readonly needed: number
}

export type CamperNight = {
  readonly camper: CamperId
  readonly ring: Ring
  /** The fire's circle takes in this tent at the chosen setting. */
  readonly inCircle: boolean
  /** Until when the tent is warm: the fire's last moment if the tent is in its circle, dusk if not. */
  readonly warmUntil: Fraction
  /** A lantern shines on this tent, and until when. */
  readonly lantern: boolean
  readonly lanternUntil: Fraction
  /** Until when the tent has any light at all. */
  readonly lightUntil: Fraction
  readonly cups: number
  readonly emptyMugs: number
  readonly coldCups: number
}

export type Night = {
  readonly hours: number
  readonly fire: Run & { readonly setting: number; readonly reach: Ring }
  readonly lantern: Run | null
  readonly kettle: KettleRun | null
  readonly campers: readonly CamperNight[]
  /** No fire and no lantern is lit at the middle of the night. */
  readonly darkAtMiddle: boolean
}

function run(stock: number, amount: Amount, hours: number): Run {
  const dawn = whole(hours), lasts = lastsHours(stock, amount)
  const until = least(lasts, dawn), used = usedIn(until, amount)
  return { amount, until, short: compare(lasts, dawn) < 0, used, left: fraction(stock * used.den - used.num, used.den), needed: neededFor(hours, amount) }
}

/** The whole night, from a plan. The plan is made legal for the site first. */
export function runNight(site: Site, rawPlan: Plan, unfolded = 0): Night {
  const plan = normalise(site, rawPlan), hours = nightHours(site, unfolded)
  const setting = site.fire[plan.fire]
  const fire = { ...run(plan.logs, setting.amount, hours), setting: plan.fire, reach: setting.reach }
  const burning = lanternAmount(site, plan)
  const lantern = burning ? run(plan.oil, burning, hours) : null

  let kettle: KettleRun | null = null
  if (site.kettle) {
    const line = site.tents.map((tent) => tent.camper), each = site.kettle.cups
    let cups = plan.water * CUPS_IN_A_CAN, firstShort: number | null = null
    const rounds: Round[] = []
    for (let hour = 0; hour < hours; hour += site.kettle.everyHours) {
      const able = Math.min(line.length, Math.floor(cups / each))
      cups -= able * each
      if (able < line.length && firstShort === null) firstShort = hour
      rounds.push({ hour, served: line.slice(0, able), missed: line.slice(able), cold: compare(fire.until, whole(hour)) <= 0 })
    }
    const total = rounds.length * line.length * each
    kettle = { rounds, short: firstShort !== null, firstShort, usedCups: plan.water * CUPS_IN_A_CAN - cups, leftCups: cups, needed: Math.ceil(total / CUPS_IN_A_CAN) }
  }

  const dusk = whole(0)
  const campers = site.tents.map((tent): CamperNight => {
    const inCircle = tent.ring <= fire.reach
    const shone = plan.lanterns.some((at) => site.pins[at.pin].near.includes(tent.camper) || (site.wicks[at.wick].far && site.pins[at.pin].far.includes(tent.camper)))
    const warmUntil = inCircle ? fire.until : dusk
    const lanternUntil = shone && lantern ? lantern.until : dusk
    const mine = kettle ? kettle.rounds.filter((round) => round.served.includes(tent.camper)) : []
    return {
      camper: tent.camper,
      ring: tent.ring,
      inCircle,
      warmUntil,
      lantern: shone,
      lanternUntil,
      lightUntil: compare(warmUntil, lanternUntil) >= 0 ? warmUntil : lanternUntil,
      cups: mine.length * (site.kettle?.cups ?? 0),
      emptyMugs: kettle ? kettle.rounds.length - mine.length : 0,
      coldCups: mine.filter((round) => round.cold).length,
    }
  })

  const middle = fraction(hours, 2)
  const darkAtMiddle = compare(fire.until, middle) <= 0 && (lantern === null || compare(lantern.until, middle) <= 0)
  return { hours, fire, lantern, kettle, campers, darkAtMiddle }
}

/** The whole pieces still lying on each rod at dawn: a part piece that was started is used. */
export function leftover(site: Site, rawPlan: Plan, night: Night): Record<Supply, number> {
  const plan = normalise(site, rawPlan)
  return {
    logs: plan.logs - Math.ceil(value(night.fire.used)),
    oil: night.lantern ? plan.oil - Math.ceil(value(night.lantern.used)) : plan.oil,
    water: night.kettle ? Math.floor(night.kettle.leftCups / CUPS_IN_A_CAN) : plan.water,
  }
}

/** Whether any user ran short: went out before dawn, or poured a round that did not reach the end of the line. */
export function ranShort(night: Night): boolean {
  return night.fire.short || (night.lantern?.short ?? false) || (night.kettle?.short ?? false)
}

/** The most that may be left of a supply for a night to count as tight: what one more hour of its user would take, and at least one piece. */
export function slack(night: Night): Record<Supply, number> {
  const hour = (amount: Amount) => Math.max(1, Math.ceil(amount.pieces / amount.hours))
  return { logs: hour(night.fire.amount), oil: night.lantern ? hour(night.lantern.amount) : 0, water: night.kettle ? 1 : 0 }
}

/** Nothing ran short and nothing much is left over. */
export function tight(site: Site, plan: Plan, night: Night): boolean {
  if (ranShort(night)) return false
  const left = leftover(site, plan, night), most = slack(night)
  return SUPPLIES.every((supply) => left[supply] <= most[supply])
}

/** The camp at one moment of the night, for the view under the cursor. `hour` runs from 0 at dusk to the night's length at dawn. */
export function moment(site: Site, rawPlan: Plan, night: Night, hour: number): { logs: number; oil: number; water: number; fireLit: boolean; lanternLit: boolean; roundsPoured: number } {
  const plan = normalise(site, rawPlan), t = Math.max(0, Math.min(night.hours, hour))
  const burned = (stock: number, of: Run | null) => (of ? Math.max(0, stock - (Math.min(t, value(of.until)) * of.amount.pieces) / of.amount.hours) : stock)
  // A round is poured as the cursor passes its hour, so the round at dusk is poured as the night starts.
  const poured = night.kettle ? night.kettle.rounds.filter((round) => round.hour < t) : []
  const cups = poured.reduce((sum, round) => sum + round.served.length * (site.kettle?.cups ?? 0), 0)
  return {
    logs: burned(plan.logs, night.fire),
    oil: burned(plan.oil, night.lantern),
    water: plan.water - cups / CUPS_IN_A_CAN,
    fireLit: plan.logs > 0 && t < value(night.fire.until),
    lanternLit: night.lantern !== null && plan.oil > 0 && t < value(night.lantern.until),
    roundsPoured: poured.length,
  }
}
