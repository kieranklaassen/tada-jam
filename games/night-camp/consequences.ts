import { compare, fraction, whole, type Fraction } from './ratio'
import { leftover, normalise, slack, type Night, type Plan } from './night'
import { PLACES, SUPPLIES, SUPPLY_OF, type CamperId, type Site, type Supply, type User } from './world'

// An error shows as a consequence in the world that says where and why, and
// nothing gives a verdict (ART.md, "The error as a consequence"). This module
// turns a night into the list of things the world does about it. Each entry
// carries its place (a moment on the ruler, an hour, a rod) and its cause (the
// rod that is empty, the bed that is full), and none of them is a judgement:
// there is no entry for "wrong", and success is a consequence of the same kind.
//
// Pure, and the plan is never changed by it: the state stays, and the child
// changes one thing and slides the night again.

export type Consequence =
  /** A user lasted the whole night: its ash reaches dawn. */
  | { readonly kind: 'reached-dawn'; readonly user: User }
  /** A user went out. Where: a pin on the ruler at `at`, and the ruler bare from there to dawn. Why: `emptyRod`. */
  | { readonly kind: 'went-out'; readonly user: 'fire' | 'lantern'; readonly at: Fraction; readonly bare: Fraction; readonly emptyRod: Supply; readonly inTheDark: readonly CamperId[] }
  /** The kettle ran dry down the line. Where: that hour, at the end of the line. Why: the water rod is empty. */
  | { readonly kind: 'dry-round'; readonly hour: number; readonly emptyMugs: readonly CamperId[]; readonly emptyRod: 'water' }
  /** A round was poured after the fire went out. */
  | { readonly kind: 'cold-round'; readonly hour: number }
  /** More was laid in than the night used. Where: still lying on its rod at dawn, as a length. */
  | { readonly kind: 'left-over'; readonly supply: Supply; readonly pieces: number; readonly places: number }
  /** The fire's circle leaves tents outside it. */
  | { readonly kind: 'outside-the-circle'; readonly campers: readonly CamperId[] }
  /** A lantern shines on someone who wanted the dark. */
  | { readonly kind: 'glare'; readonly camper: CamperId }
  /** The whole camp is dark at the middle of the night: the secret picnic. */
  | { readonly kind: 'picnic'; readonly at: Fraction }

/** Everything this night does, in the order it happens: dusk first, the morning last. */
export function consequences(site: Site, rawPlan: Plan, night: Night): Consequence[] {
  const plan = normalise(site, rawPlan), dawn = whole(night.hours), dusk: Consequence[] = [], dark: (Consequence & { at: Fraction })[] = [], hours: Consequence[] = [], morning: Consequence[] = []

  const outside = night.campers.filter((camper) => !camper.inCircle).map((camper) => camper.camper)
  if (outside.length > 0) dusk.push({ kind: 'outside-the-circle', campers: outside })
  const sleeper = night.campers.find((camper) => camper.camper === 'sleeper')
  if (sleeper?.lantern && compare(whole(0), sleeper.lanternUntil) < 0) dusk.push({ kind: 'glare', camper: 'sleeper' })

  const burners: ['fire' | 'lantern', typeof night.fire | typeof night.lantern][] = [['fire', night.fire], ['lantern', night.lantern]]
  for (const [user, run] of burners) {
    if (!run) continue
    if (!run.short) { morning.push({ kind: 'reached-dawn', user }); continue }
    // Whoever had light until this moment and has none after it is in the dark because of it.
    const inTheDark = night.campers.filter((camper) => compare(camper.lightUntil, run.until) === 0 && compare(run.until, dawn) < 0).map((camper) => camper.camper)
    dark.push({ kind: 'went-out', user, at: run.until, bare: fraction(dawn.num * run.until.den - run.until.num, run.until.den), emptyRod: SUPPLY_OF[user], inTheDark })
  }
  if (night.darkAtMiddle) dark.push({ kind: 'picnic', at: fraction(night.hours, 2) })
  dark.sort((a, b) => compare(a.at, b.at))

  if (night.kettle) {
    const firstCold = night.kettle.rounds.find((round) => round.cold && round.served.length > 0)
    if (firstCold) hours.push({ kind: 'cold-round', hour: firstCold.hour })
    if (night.kettle.firstShort === null) morning.push({ kind: 'reached-dawn', user: 'kettle' })
    else hours.push({ kind: 'dry-round', hour: night.kettle.firstShort, emptyMugs: night.kettle.rounds.find((round) => round.hour === night.kettle!.firstShort)!.missed, emptyRod: 'water' })
  }

  const left = leftover(site, plan, night)
  for (const supply of SUPPLIES) if (left[supply] > 0) morning.push({ kind: 'left-over', supply, pieces: left[supply], places: left[supply] * PLACES[supply] })

  // The night's own events in the order of their moments, with a burner going out ahead of a round at the same hour.
  const when = (one: Consequence): Fraction => ('at' in one ? one.at : 'hour' in one ? whole(one.hour) : dawn)
  const inNight = [...dark, ...hours].sort((a, b) => compare(when(a), when(b)))
  return [...dusk, ...inNight, ...morning]
}

/** What is left over beyond the slack of a tight night, in places on the sled: how tall the scout's tower is. */
export function towerPlaces(site: Site, plan: Plan, night: Night): number {
  const left = leftover(site, plan, night), most = slack(night)
  return SUPPLIES.reduce((sum, supply) => sum + Math.max(0, left[supply] - most[supply]) * PLACES[supply], 0)
}

/** Why a pull along a rod was not followed all the way, shown where it happens: the piece slides off and hops back. */
export type Refusal = { readonly kind: 'rod-full' | 'sled-full' | 'strapped'; readonly supply: Supply; readonly asked: number; readonly laid: number }
