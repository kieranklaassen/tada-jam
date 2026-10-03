import { describe, expect, it } from 'vitest'
import { fits, lanternAmount, leftover, load, moment, normalise, openingPlan, ranShort, runNight, slack, tight, type Plan } from './night'
import { ROD_LENGTH, SITES } from './world'

const meadow = SITES.meadow[0] // six hours, three logs for one hour
const ford = SITES.ford[0] // seven hours, four campers, a cup each every hour
const quarry = SITES.quarry[0] // eight hours, one lantern: a flask for three hours low, for two hours high
const ridge = SITES.ridge[0] // a sled of 42 places
const summit = SITES.summit[0] // two lanterns
const plan = (site: typeof meadow, part: Partial<Plan>): Plan => normalise(site, part)

describe('a legal plan', () => {
  it('opens with empty rods, the lowest fire and each lantern on its own pin', () => {
    expect(openingPlan(summit)).toEqual({ logs: 0, oil: 0, water: 0, fire: 0, lanterns: [{ pin: 0, wick: 0 }, { pin: 1, wick: 0 }] })
    expect(openingPlan(SITES.saddle[0])).toMatchObject({ logs: 30, oil: 5, water: 0 })
  })

  it('repairs each part by itself', () => {
    expect(plan(meadow, { logs: 999 }).logs).toBe(ROD_LENGTH.logs)
    expect(plan(meadow, { logs: -3 }).logs).toBe(0)
    expect(plan(meadow, { logs: 2.5 }).logs).toBe(0)
    expect(plan(meadow, { logs: 7, oil: 4, water: 2 })).toMatchObject({ logs: 7, oil: 0, water: 0 })
    expect(plan(meadow, { fire: 5 }).fire).toBe(0)
    expect(plan(quarry, { fire: 2, lanterns: [{ pin: 9, wick: 1 }] })).toMatchObject({ fire: 2, lanterns: [{ pin: 0, wick: 1 }] })
    expect(normalise(quarry, null)).toEqual(openingPlan(quarry))
    expect(plan(SITES.saddle[0], { logs: 1, oil: 12 })).toMatchObject({ logs: 30, oil: 5 })
  })

  it('never stands two lanterns on one pin', () => {
    expect(plan(summit, { lanterns: [{ pin: 2, wick: 0 }, { pin: 2, wick: 1 }] }).lanterns).toEqual([{ pin: 2, wick: 0 }, { pin: 0, wick: 1 }])
  })

  it('counts the places it takes on the sled', () => {
    const laid = plan(ridge, { logs: 24, oil: 3, water: 3 })
    expect(load(laid)).toBe(24 + 6 + 9)
    expect(fits(ridge, laid)).toBe(true)
    expect(fits(ridge, plan(ridge, { logs: 40, oil: 3, water: 3 }))).toBe(false)
    expect(fits(meadow, plan(meadow, { logs: 60 }))).toBe(true)
  })
})

describe('the fire', () => {
  it('lasts to dawn on exactly what the night needs', () => {
    const night = runNight(meadow, plan(meadow, { logs: 18 }))
    expect(night.hours).toBe(6)
    expect(night.fire).toMatchObject({ until: { num: 6, den: 1 }, short: false, used: { num: 18, den: 1 }, left: { num: 0, den: 1 }, needed: 18 })
    expect(ranShort(night)).toBe(false)
  })

  it('goes out at the true moment when the stock is too small', () => {
    expect(runNight(meadow, plan(meadow, { logs: 15 })).fire).toMatchObject({ until: { num: 5, den: 1 }, short: true })
    expect(runNight(meadow, plan(meadow, { logs: 8 })).fire.until).toEqual({ num: 8, den: 3 })
    expect(runNight(meadow, plan(meadow, { logs: 0 })).fire).toMatchObject({ until: { num: 0, den: 1 }, short: true })
  })

  it('leaves what it did not use lying on the rod', () => {
    const laid = plan(meadow, { logs: 25 }), night = runNight(meadow, laid)
    expect(night.fire.left).toEqual({ num: 7, den: 1 })
    expect(leftover(meadow, laid, night).logs).toBe(7)
  })

  it('needs more for a longer ruler', () => {
    expect(runNight(meadow, plan(meadow, { logs: 18 }), 1).fire).toMatchObject({ short: true, until: { num: 6, den: 1 }, needed: 24 })
    expect(runNight(meadow, plan(meadow, { logs: 24 }), 1).hours).toBe(8)
  })
})

describe('the lanterns', () => {
  it('burn one flask over a span of hours, and a part flask that was started is used', () => {
    const laid = plan(quarry, { logs: 16, oil: 3 }), night = runNight(quarry, laid)
    expect(night.lantern).toMatchObject({ amount: { pieces: 1, hours: 3 }, short: false, used: { num: 8, den: 3 }, left: { num: 1, den: 3 }, needed: 3 })
    expect(leftover(quarry, laid, night).oil).toBe(0)
  })

  it('go out together when the oil is gone', () => {
    const night = runNight(quarry, plan(quarry, { logs: 16, oil: 3, lanterns: [{ pin: 0, wick: 1 }] }))
    expect(night.lantern).toMatchObject({ amount: { pieces: 1, hours: 2 }, until: { num: 6, den: 1 }, short: true, needed: 4 })
  })

  it('add their amounts when two share the oil', () => {
    const both = plan(summit, { lanterns: [{ pin: 0, wick: 0 }, { pin: 1, wick: 1 }] })
    expect(lanternAmount(summit, both)).toEqual({ pieces: 5, hours: 6 })
    expect(runNight(summit, { ...both, oil: 10 }).lantern).toMatchObject({ short: false, needed: 10 })
    expect(runNight(summit, { ...both, oil: 9 }).lantern!.short).toBe(true)
    expect(lanternAmount(meadow, openingPlan(meadow))).toBeNull()
    expect(runNight(meadow, openingPlan(meadow)).lantern).toBeNull()
  })
})

describe('the kettle', () => {
  it('pours a round for every camper each hour, and needs one more can for a part can', () => {
    const night = runNight(ford, plan(ford, { logs: 21, fire: 1, water: 5 }))
    expect(night.kettle!.rounds.map((round) => round.hour)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(night.kettle).toMatchObject({ short: false, firstShort: null, usedCups: 28, leftCups: 2, needed: 5 })
  })

  it('runs dry down the line: the campers at its end hold empty mugs at that hour', () => {
    const night = runNight(ford, plan(ford, { logs: 21, fire: 1, water: 4 }))
    expect(night.kettle).toMatchObject({ short: true, firstShort: 6, usedCups: 24, leftCups: 0 })
    expect(night.kettle!.rounds[6]).toMatchObject({ served: [], missed: ['cook', 'reader', 'scout', 'sleeper'] })
    const part = runNight(ford, plan(ford, { logs: 21, fire: 1, water: 1 }))
    expect(part.kettle!.rounds[1]).toMatchObject({ served: ['cook', 'reader'], missed: ['scout', 'sleeper'] })
    expect(part.campers.find((night) => night.camper === 'sleeper')).toMatchObject({ cups: 1, emptyMugs: 6 })
  })

  it('pours cold once the fire is out', () => {
    const night = runNight(ford, plan(ford, { logs: 6, fire: 1, water: 5 }))
    expect(night.fire.until).toEqual({ num: 2, den: 1 })
    expect(night.kettle!.rounds.map((round) => round.cold)).toEqual([false, false, true, true, true, true, true])
    expect(night.campers[0].coldCups).toBe(5)
  })
})

describe('what each camper gets', () => {
  it('is warm only inside the fire circle, and only while the fire burns', () => {
    const low = runNight(quarry, plan(quarry, { logs: 16, fire: 0 }))
    expect(low.campers.map((night) => [night.camper, night.inCircle])).toEqual([['cook', true], ['reader', false], ['scout', false], ['sleeper', false]])
    const high = runNight(quarry, plan(quarry, { logs: 20, fire: 2 }))
    expect(high.campers.every((night) => night.inCircle)).toBe(true)
    expect(high.campers[1].warmUntil).toEqual({ num: 4, den: 1 })
  })

  it('is lit by a lantern near its pin, and on the high wick by one further off', () => {
    const lowWick = runNight(quarry, plan(quarry, { logs: 16, oil: 3 }))
    const reader = (night: typeof lowWick) => night.campers.find((one) => one.camper === 'reader')!
    const sleeper = (night: typeof lowWick) => night.campers.find((one) => one.camper === 'sleeper')!
    expect(reader(lowWick)).toMatchObject({ lantern: true, lightUntil: { num: 8, den: 1 } })
    expect(sleeper(lowWick).lantern).toBe(false)
    const highWick = runNight(quarry, plan(quarry, { logs: 16, oil: 4, lanterns: [{ pin: 0, wick: 1 }] }))
    expect(sleeper(highWick).lantern).toBe(true)
    const moved = runNight(quarry, plan(quarry, { logs: 16, oil: 3, lanterns: [{ pin: 1, wick: 0 }] }))
    expect(reader(moved)).toMatchObject({ lantern: false, lightUntil: { num: 0, den: 1 } })
  })

  it('knows when the whole camp is dark at the middle of the night', () => {
    expect(runNight(meadow, plan(meadow, { logs: 9 })).darkAtMiddle).toBe(true)
    expect(runNight(meadow, plan(meadow, { logs: 10 })).darkAtMiddle).toBe(false)
    expect(runNight(quarry, plan(quarry, { logs: 0, oil: 3 })).darkAtMiddle).toBe(false)
    expect(runNight(quarry, plan(quarry, { logs: 0, oil: 0 })).darkAtMiddle).toBe(true)
  })
})

describe('a tight night', () => {
  it('has nothing short and no more left than one more hour would take', () => {
    const judge = (logs: number) => { const laid = plan(meadow, { logs }); return tight(meadow, laid, runNight(meadow, laid)) }
    expect(slack(runNight(meadow, plan(meadow, { logs: 18 })))).toEqual({ logs: 3, oil: 0, water: 0 })
    expect(judge(17)).toBe(false)
    expect(judge(18)).toBe(true)
    expect(judge(21)).toBe(true)
    expect(judge(22)).toBe(false)
    expect(judge(60)).toBe(false)
  })

  it('allows one flask and one can over', () => {
    const judge = (part: Partial<Plan>) => { const laid = plan(ridge, { logs: 24, fire: 1, oil: 3, water: 3, ...part }); return tight(ridge, laid, runNight(ridge, laid)) }
    expect(judge({})).toBe(true)
    expect(judge({ oil: 4 })).toBe(true)
    expect(judge({ oil: 5 })).toBe(false)
    expect(judge({ water: 4 })).toBe(true)
    expect(judge({ water: 5 })).toBe(false)
    expect(judge({ water: 2 })).toBe(false)
  })
})

describe('the camp at one moment', () => {
  const laid = plan(ford, { logs: 6, fire: 1, water: 5 }), night = runNight(ford, laid)

  it('stands untouched at dusk', () => {
    expect(moment(ford, laid, night, 0)).toEqual({ logs: 6, oil: 0, water: 5, fireLit: true, lanternLit: false, roundsPoured: 0 })
  })

  it('uses the stock steadily and stops when it is gone', () => {
    expect(moment(ford, laid, night, 1)).toMatchObject({ logs: 3, fireLit: true, roundsPoured: 1 })
    expect(moment(ford, laid, night, 1.5).logs).toBeCloseTo(1.5)
    expect(moment(ford, laid, night, 2)).toMatchObject({ logs: 0, fireLit: false })
    expect(moment(ford, laid, night, 99)).toMatchObject({ logs: 0, roundsPoured: 7 })
    expect(moment(ford, laid, night, 7).water).toBeCloseTo(5 - 28 / 6)
  })

  it('plays backwards as it plays forwards: a moment depends only on where the cursor stands', () => {
    const forwards = [0, 1, 2.5, 4, 7].map((hour) => moment(ford, laid, night, hour))
    const backwards = [7, 4, 2.5, 1, 0].map((hour) => moment(ford, laid, night, hour)).reverse()
    expect(backwards).toEqual(forwards)
  })
})
