import { describe, expect, it } from 'vitest'
import { bellyLayout } from './belly'
import { FIRST_VISIT, LADDER, type PositionId } from './config'
import { crewGoesBy, shapeOf, snackOf, takes } from './gobblers'
import { MOST_GROUPS, MOST_IN_A_GROUP, isPosition, layCycle, nextUp } from './order'
import { PLACES } from './places'
import { rng, shuffled } from './rng'
import { ATTRIBUTES, type Attribute, type Toy } from './toys'

const SEEDS = Array.from({ length: 120 }, (_, i) => i * 7919 + 1)
const varies = (toys: Toy[], by: Attribute) => new Set(toys.map((toy) => toy[by])).size

/** The table of the sheet: how many sorts, how many toys, and which attributes the load varies in. */
const TABLE: { [P in PositionId]: { sorts: Attribute[] | 'three in any order'; toys: number; varies: Partial<Record<Attribute, number>> } } = {
  'two-colours': { sorts: ['colour'], toys: 4, varies: { colour: 2, kind: 1, size: 1 } },
  'three-colours': { sorts: ['colour'], toys: 6, varies: { colour: 3, kind: 1, size: 1 } },
  'colours-among-kinds': { sorts: ['colour'], toys: 6, varies: { colour: 3, kind: 2, size: 1 } },
  'two-kinds': { sorts: ['kind'], toys: 6, varies: { colour: 1, kind: 2, size: 1 } },
  'colours-then-kinds': { sorts: ['colour', 'kind'], toys: 6, varies: { colour: 3, kind: 2, size: 1 } },
  'two-sizes': { sorts: ['size'], toys: 6, varies: { colour: 1, kind: 1, size: 2 } },
  'kinds-then-sizes': { sorts: ['kind', 'size'], toys: 8, varies: { kind: 2, size: 2 } },
  'three-ways': { sorts: 'three in any order', toys: 8, varies: { colour: 2, kind: 2, size: 2 } },
  'three-ways-wide': { sorts: 'three in any order', toys: 9, varies: { colour: 3, kind: 3, size: 2 } },
}

describe('the designed order', () => {
  it('lays out each position as the sheet says', () => {
    for (const position of LADDER) for (const seed of SEEDS) {
      const { toys, crews } = layCycle(position, seed), row = TABLE[position]
      expect(toys.length, position).toBe(row.toys)
      const by = crews.map(crewGoesBy)
      if (row.sorts === 'three in any order') expect([...by].sort(), position).toEqual([...ATTRIBUTES].sort())
      else expect(by, position).toEqual(row.sorts)
      for (const attribute of ATTRIBUTES) if (row.varies[attribute]) expect(varies(toys, attribute), `${position} ${attribute}`).toBe(row.varies[attribute])
    }
  })

  it('lays out the same cycle for the same seed, and others for other seeds', () => {
    for (const position of LADDER) {
      expect(layCycle(position, 42)).toEqual(layCycle(position, 42))
      const forms = new Set(SEEDS.map((seed) => JSON.stringify(layCycle(position, seed))))
      expect(forms.size, position).toBeGreaterThan(3)
    }
  })

  it('changes the order of the three sorts from load to load at the positions that say so', () => {
    for (const position of ['three-ways', 'three-ways-wide'] as const) {
      const orders = new Set(SEEDS.map((seed) => layCycle(position, seed).crews.map(crewGoesBy).join()))
      expect(orders.size).toBeGreaterThanOrEqual(4)
    }
  })

  it('gives every toy exactly one home in every crew, and every gobbler of a crew at least one toy', () => {
    for (const position of LADDER) for (const seed of SEEDS) {
      const { toys, crews } = layCycle(position, seed)
      for (const crew of crews) {
        expect(crew.length).toBeGreaterThanOrEqual(2)
        for (const toy of toys) expect(crew.filter((id) => takes(id, toy)).length).toBe(1)
        for (const id of crew) expect(toys.some((toy) => takes(id, toy))).toBe(true)
      }
    }
  })

  it('stays inside the bounds the records give: three groups at most, ten in a group at most', () => {
    for (const seed of SEEDS) {
      // The widest load splits five and four by size, so the fullest belly holds six, its snack included.
      const sizes = layCycle('three-ways-wide', seed).toys.filter((toy) => toy.size === 'big').length
      expect([4, 5]).toContain(sizes)
    }
    let fullest = 0
    for (const position of LADDER) for (const seed of SEEDS) {
      const { toys, crews } = layCycle(position, seed)
      for (const crew of crews) for (const id of crew) fullest = Math.max(fullest, 1 + toys.filter((toy) => takes(id, toy)).length)
      for (const crew of crews) {
        expect(crew.length).toBeLessThanOrEqual(MOST_GROUPS)
        for (const id of crew) expect(1 + toys.filter((toy) => takes(id, toy)).length).toBeLessThanOrEqual(MOST_IN_A_GROUP)
      }
    }
    expect(fullest).toBe(6)
  })

  it('fits every group behind its belly window, snack first, in whatever order the toys are fed', () => {
    for (const position of LADDER) for (const seed of SEEDS) {
      const { toys, crews } = layCycle(position, seed)
      const random = rng(seed)
      for (const crew of crews) for (const id of crew) {
        const group = toys.filter((toy) => takes(id, toy))
        for (const order of [group, [...group].reverse(), shuffled(random, group), shuffled(random, group)]) {
          expect(bellyLayout(shapeOf(id), [snackOf(id, toys[0]), ...order]), `${position} ${id}`).not.toBeNull()
        }
      }
    }
  })

  it('leaves a free place on the tray for a toy that comes back', () => {
    for (const position of LADDER) expect(layCycle(position, 1).toys.length).toBeLessThan(PLACES)
  })

  it('names its positions for places in its own order and never for a school year', () => {
    for (const position of LADDER) expect(position).not.toMatch(/grade|groep|level|fase|year|class|stage|\d/i)
    expect(new Set(LADDER).size).toBe(LADDER.length)
  })

  it('starts a first visit on a step of the order, lower for a younger child', () => {
    const steps = FIRST_VISIT.map((row) => LADDER.indexOf(row.position))
    expect(steps[0]).toBe(0)
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1])
  })

  it('knows the step above each position, and none above the last', () => {
    expect(nextUp('two-colours')).toBe('three-colours')
    expect(nextUp('three-ways-wide')).toBeNull()
    expect(isPosition('two-kinds')).toBe(true)
    expect(isPosition('first')).toBe(false)
  })
})
