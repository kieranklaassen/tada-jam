import { describe, expect, it } from 'vitest'
import { consequences, sparePlaces, towerPlaces, type Consequence } from './consequences'
import { normalise, runNight, type Plan } from './night'
import { SITES, type Site } from './world'

const meadow = SITES.meadow[0], ford = SITES.spring[0], quarry = SITES.quarry[0]
const night = (site: Site, part: Partial<Plan>): Consequence[] => { const plan = normalise(site, part); return consequences(site, plan, runNight(site, plan)) }
const kinds = (list: Consequence[]) => list.map((one) => one.kind)

describe('a consequence says where and why', () => {
  it('drops a pin where the fire went out, leaves the ruler bare from there, and names the empty rod', () => {
    expect(night(meadow, { logs: 15 })).toEqual([
      { kind: 'went-out', user: 'fire', at: { num: 5, den: 1 }, bare: { num: 1, den: 1 }, emptyRod: 'logs', inTheDark: ['scout', 'small'] },
    ])
    const part = night(meadow, { logs: 8 })[0]
    expect(part).toMatchObject({ at: { num: 8, den: 3 }, bare: { num: 10, den: 3 } })
  })

  it('shows a dry kettle at its hour, at the end of the line', () => {
    const list = night(ford, { logs: 21, fire: 1, water: 1 })
    expect(list.find((one) => one.kind === 'dry-round')).toEqual({ kind: 'dry-round', hour: 1, emptyMugs: ['scout', 'reader'], emptyRod: 'water' })
  })

  it('shows too much as a length still lying on its rod in the morning', () => {
    const plan = normalise(meadow, { logs: 30 }), run = runNight(meadow, plan)
    expect(consequences(meadow, plan, run)).toEqual([{ kind: 'reached-dawn', user: 'fire' }, { kind: 'left-over', supply: 'logs', pieces: 12, places: 12 }])
    // The tower is exactly what is left, and all but the slack of a tight night is more than the scout likes.
    expect(towerPlaces(meadow, plan, run)).toBe(12)
    expect(sparePlaces(meadow, plan, run)).toBe(9)
    const tight = normalise(meadow, { logs: 20 })
    expect(towerPlaces(meadow, tight, runNight(meadow, tight))).toBe(2)
    expect(sparePlaces(meadow, tight, runNight(meadow, tight))).toBe(0)
    const exact = normalise(meadow, { logs: 18 })
    expect(towerPlaces(meadow, exact, runNight(meadow, exact))).toBe(0)
  })

  it('shows a setting that does not suit: tents outside the circle, a lantern on someone who wanted the dark', () => {
    expect(night(quarry, { logs: 16, fire: 0, oil: 4, lanterns: [{ pin: 0, wick: 1 }] }).slice(0, 2)).toEqual([
      { kind: 'outside-the-circle', campers: ['reader', 'scout', 'sleeper'] },
      { kind: 'glare', camper: 'sleeper' },
    ])
  })

  it('says who is left in the dark by each light that goes out', () => {
    const list = night(quarry, { logs: 8, fire: 1, oil: 1 })
    expect(list.filter((one) => one.kind === 'went-out')).toEqual([
      { kind: 'went-out', user: 'lantern', at: { num: 3, den: 1 }, bare: { num: 5, den: 1 }, emptyRod: 'oil', inTheDark: ['reader'] },
      { kind: 'went-out', user: 'fire', at: { num: 8, den: 3 }, bare: { num: 16, den: 3 }, emptyRod: 'logs', inTheDark: ['cook', 'scout', 'sleeper'] },
    ].sort((a, b) => a.at.num / a.at.den - b.at.num / b.at.den))
  })
})

describe('the order of a night', () => {
  it('is dusk, then the night by its moments, then the morning', () => {
    const list = night(ford, { logs: 6, fire: 1, water: 4 })
    expect(kinds(list)).toEqual(['outside-the-circle', 'went-out', 'cold-round', 'picnic', 'dry-round'])
    expect(list[1]).toMatchObject({ at: { num: 2, den: 1 } })
    expect(list[3]).toMatchObject({ at: { num: 7, den: 2 } })
  })

  it('holds the secret: a camp dark at the middle of the night gets the picnic, every time, and a lit one never', () => {
    expect(kinds(night(meadow, { logs: 0 }))).toContain('picnic')
    expect(kinds(night(meadow, { logs: 9 }))).toContain('picnic')
    expect(kinds(night(meadow, { logs: 10 }))).not.toContain('picnic')
    expect(kinds(night(quarry, { logs: 0, oil: 3 }))).not.toContain('picnic')
  })
})

describe('nothing gives a verdict', () => {
  it('counts success as a consequence of the same kind', () => {
    expect(night(quarry, { logs: 40, fire: 2, oil: 3 })).toEqual([{ kind: 'reached-dawn', user: 'fire' }, { kind: 'reached-dawn', user: 'lantern' }])
  })

  it('has no kind that judges, and every kind that reports a shortage carries its place and its cause', () => {
    const seen = new Set<string>()
    for (const position of Object.keys(SITES))
      for (const site of SITES[position])
        for (const part of [{}, { logs: 5 }, { logs: 4, water: 9 }, { logs: 60, oil: 12, water: 10, fire: 9 }, { logs: 20, oil: 1, water: 1, fire: 1 }, { logs: 20, oil: 6, lanterns: [{ pin: 0, wick: 1 as const }] }])
          for (const one of night(site, part)) {
            seen.add(one.kind)
            expect(one.kind).not.toMatch(/wrong|fail|bad|error|lose|lost|miss|penalt|score/)
            if (one.kind === 'went-out') { expect(one.at.den).toBeGreaterThan(0); expect(['logs', 'oil']).toContain(one.emptyRod) }
            if (one.kind === 'dry-round') expect(one.emptyMugs.length).toBeGreaterThan(0)
          }
    expect([...seen].sort()).toEqual(['cold-round', 'dry-round', 'glare', 'left-over', 'outside-the-circle', 'picnic', 'reached-dawn', 'went-out'])
  })

  it('leaves the plan as the child set it', () => {
    const plan = normalise(quarry, { logs: 8, fire: 1, oil: 1 }), copy = JSON.parse(JSON.stringify(plan))
    consequences(quarry, plan, runNight(quarry, plan))
    expect(plan).toEqual(copy)
    expect(Object.isFrozen(plan) || JSON.stringify(plan) === JSON.stringify(copy)).toBe(true)
  })
})
