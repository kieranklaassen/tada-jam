import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { fits, load, normalise, openingPlan, runNight, tight, type Plan } from './night'
import { neededFor } from './ratio'
import { CAMPERS, CUPS_IN_A_CAN, IDEAS, MAX_UNFOLDED, PLACES, ROD_LENGTH, SECTION_HOURS, SITES, amountsAt, nightHours, siteFor, usersAt, type Site } from './world'

const every = (): Site[] => LADDER.flatMap((position) => [...SITES[position]])
const name = (site: Site) => `${site.position} ${SITES[site.position].indexOf(site)}`

/** Every plan a child could settle on that lays in exactly what each dial setting needs. */
function exactPlans(site: Site): Plan[] {
  const plans: Plan[] = []
  const wickings = site.lanterns === 0 ? [[]] : site.lanterns === 1 ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]]
  for (let fire = 0; fire < site.fire.length; fire++)
    for (const wicking of wickings) {
      const dials = normalise(site, { fire, lanterns: wicking.map((wick, i) => ({ pin: i, wick: wick as 0 | 1 })) })
      const night = runNight(site, dials)
      plans.push(normalise(site, { ...dials, logs: night.fire.needed, oil: night.lantern?.needed ?? 0, water: night.kettle?.needed ?? 0 }))
    }
  return plans
}

describe('the designed order', () => {
  it('has sites for every position of the ladder and for nothing else', () => {
    expect(Object.keys(SITES).sort()).toEqual([...LADDER].sort())
    expect(Object.keys(IDEAS).sort()).toEqual([...LADDER].sort())
    for (const position of LADDER) {
      expect(SITES[position].length, position).toBeGreaterThanOrEqual(3)
      for (const site of SITES[position]) expect(site.position).toBe(position)
    }
  })

  it('names positions after places, never after a grade, a groep or a level', () => {
    for (const id of LADDER) expect(id).toMatch(/^[a-z]+$/)
    for (const id of LADDER) expect(id).not.toMatch(/grade|groep|fase|level|niveau|stage|year|class/)
  })

  it('adds one user at a time', () => {
    const users = (position: string) => usersAt(SITES[position][0]).join(' ')
    expect(users('meadow')).toBe('fire')
    expect(users('birchwood')).toBe('fire')
    expect(users('ford')).toBe('fire kettle')
    expect(users('quarry')).toBe('fire lantern')
    expect(users('ridge')).toBe('fire lantern kettle')
    for (const site of SITES.meadow) expect(site.fire.length).toBe(1)
    for (const site of SITES.birchwood) expect(site.fire.length).toBe(3)
    for (const position of LADDER) for (const site of SITES[position]) expect(site.sled !== null, name(site)).toBe(['ridge', 'tarn', 'summit'].includes(position))
    for (const position of LADDER) for (const site of SITES[position]) expect(site.given !== null, name(site)).toBe(position === 'saddle')
    for (const site of SITES.summit) expect(site.lanterns).toBe(2)
  })

  it('gives every new site the next variant in turn, and a known site for a damaged count', () => {
    expect(siteFor('ford', 0)).toBe(SITES.ford[0])
    expect(siteFor('ford', 4)).toBe(SITES.ford[1])
    expect(siteFor('ford', -1)).toBe(SITES.ford[0])
    expect(siteFor('ford', 1.5)).toBe(SITES.ford[0])
    expect(siteFor('nowhere', 2)).toBe(SITES.meadow[2])
  })
})

describe('the number ranges of the design sheet', () => {
  it('keeps nights, campers and cards inside them', () => {
    for (const site of every()) {
      expect(site.hours, name(site)).toBeGreaterThanOrEqual(4)
      expect(site.hours, name(site)).toBeLessThanOrEqual(12)
      expect(site.tents.length, name(site)).toBeGreaterThanOrEqual(2)
      expect(site.tents.length, name(site)).toBeLessThanOrEqual(5)
      expect(new Set(site.tents.map((tent) => tent.camper)).size, 'no camper twice').toBe(site.tents.length)
      for (const tent of site.tents) expect(CAMPERS).toContain(tent.camper)
      for (const amount of amountsAt(site)) {
        expect(amount.pieces, name(site)).toBeLessThanOrEqual(6)
        expect(amount.hours, name(site)).toBeLessThanOrEqual(3)
      }
      if (site.kettle) expect(site.kettle.cups * site.tents.length * Math.ceil(site.hours / site.kettle.everyHours), name(site)).toBeLessThan(100)
    }
    expect(nightHours(SITES.saddle[2], MAX_UNFOLDED)).toBe(12 + MAX_UNFOLDED * SECTION_HOURS)
    expect(nightHours(SITES.meadow[0], 9)).toBe(6 + MAX_UNFOLDED * SECTION_HOURS)
    expect(nightHours(SITES.meadow[0], Number.NaN)).toBe(6)
  })

  it('keeps whole numbers for one hour, or one piece for whole hours, until the position that brings several for several', () => {
    const simple = (site: Site) => amountsAt(site).every((amount) => amount.hours === 1 || amount.pieces === 1)
    for (const position of ['meadow', 'birchwood', 'ford', 'quarry', 'ridge']) for (const site of SITES[position]) expect(simple(site), name(site)).toBe(true)
    for (const site of SITES.tarn) expect(simple(site), name(site)).toBe(false)
  })

  it('makes the fire dial rise: each setting burns more and reaches at least as far', () => {
    for (const site of every())
      for (let i = 1; i < site.fire.length; i++) {
        const low = site.fire[i - 1], high = site.fire[i]
        expect(high.amount.pieces * low.amount.hours, name(site)).toBeGreaterThan(low.amount.pieces * high.amount.hours)
        expect(high.reach).toBeGreaterThanOrEqual(low.reach)
      }
    for (const site of every()) if (site.lanterns > 0) expect(site.wicks[1].amount.pieces * site.wicks[0].amount.hours, name(site)).toBeGreaterThan(site.wicks[0].amount.pieces * site.wicks[1].amount.hours)
  })

  it('gives each lantern a pin of its own and a free one to move to, lighting only campers who are there', () => {
    for (const site of every()) {
      if (site.lanterns === 0) continue
      expect(site.pins.length, name(site)).toBeGreaterThan(site.lanterns)
      const here = site.tents.map((tent) => tent.camper)
      for (const pin of site.pins) for (const camper of [...pin.near, ...pin.far]) expect(here, name(site)).toContain(camper)
    }
  })
})

describe('every site can be camped at', () => {
  it('has a plan that is tight, fits the sled, and lies on the rods', () => {
    for (const site of every()) {
      const good = exactPlans(site).filter((plan) => fits(site, plan) && tight(site, plan, runNight(site, plan)))
      expect(good.length, name(site)).toBeGreaterThan(0)
    }
  })

  it('has a rod long enough for what every setting needs on the folded ruler', () => {
    for (const site of every()) {
      if (site.given) continue
      for (const setting of site.fire) expect(neededFor(site.hours, setting.amount), name(site)).toBeLessThanOrEqual(ROD_LENGTH.logs)
      for (const plan of exactPlans(site)) {
        expect(plan.oil).toBeLessThanOrEqual(ROD_LENGTH.oil)
        expect(plan.water).toBeLessThanOrEqual(ROD_LENGTH.water)
      }
    }
  })

  it('can still be supplied from the rods with both extra sections unfolded and every dial at its highest, below 100', () => {
    for (const site of every()) {
      const top = normalise(site, { fire: site.fire.length - 1, lanterns: Array.from({ length: site.lanterns }, (_, i) => ({ pin: i, wick: 1 as const })) })
      const night = runNight(site, top, MAX_UNFOLDED)
      expect(night.hours).toBeLessThanOrEqual(16)
      expect(night.fire.needed, `${name(site)} logs`).toBeLessThanOrEqual(ROD_LENGTH.logs)
      if (night.lantern) expect(night.lantern.needed, `${name(site)} oil`).toBeLessThanOrEqual(ROD_LENGTH.oil)
      if (night.kettle) {
        expect(night.kettle.needed, `${name(site)} water`).toBeLessThanOrEqual(ROD_LENGTH.water)
        expect(night.kettle.needed * CUPS_IN_A_CAN, `${name(site)} cups`).toBeLessThan(100)
      }
    }
  })

  it('brings the remainder at the kettle only from its second variant', () => {
    const cups = (site: Site) => site.tents.length * site.kettle!.cups * Math.ceil(site.hours / site.kettle!.everyHours)
    expect(cups(SITES.ford[0]) % CUPS_IN_A_CAN).toBe(0)
    for (const site of SITES.ford.slice(1)) expect(cups(site) % CUPS_IN_A_CAN, name(site)).not.toBe(0)
  })

  it('has a sled that does not hold everything at its highest', () => {
    for (const site of every()) {
      if (site.sled === null) continue
      const plans = exactPlans(site), biggest = plans[plans.length - 1]
      expect(load(biggest), name(site)).toBeGreaterThan(site.sled)
      expect(fits(site, biggest)).toBe(false)
      // And piling every rod full never fits.
      expect(ROD_LENGTH.logs * PLACES.logs + ROD_LENGTH.oil * PLACES.oil + ROD_LENGTH.water * PLACES.water).toBeGreaterThan(site.sled)
    }
  })

  it('at the position that turns the question round, some settings of the dials last tightly and some do not', () => {
    for (const site of SITES.saddle) {
      const nights = exactPlans(site).map((plan) => ({ plan, night: runNight(site, plan) }))
      const good = nights.filter(({ plan, night }) => tight(site, plan, night))
      expect(good.length, name(site)).toBeGreaterThan(0)
      expect(good.length, name(site)).toBeLessThan(nights.length)
      expect(openingPlan(site).logs).toBe(site.given!.logs)
      if (site.kettle) expect(runNight(site, openingPlan(site)).kettle!.needed * CUPS_IN_A_CAN).toBeLessThanOrEqual(site.given!.water! * CUPS_IN_A_CAN)
    }
  })
})
