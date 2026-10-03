import { describe, expect, it } from 'vitest'
import { POD_SEEDS, seedsOfPod } from './breed'
import { GROUP_NUMERAL_DRAWN, beadsOf, cameFrom, groupNumeral, groupsOf, wishNumeral } from './loupe'
import type { Visit } from './order'
import { PACKETS, lookOf, pack } from './plant'

const SEED = 20261003

describe('the beads of a plant', () => {
  it('are two a trait, in the order of the parents, and mark what does not show', () => {
    const plant = pack({ colour: [1, 0], height: [1, 0], leaf: [0, 0], petals: [1, 1] })
    expect(beadsOf(plant)).toEqual([
      { trait: 'colour', fromOnto: 1, fromDust: 0, hidden: false },
      { trait: 'height', fromOnto: 1, fromDust: 0, hidden: true },
      { trait: 'leaf', fromOnto: 0, fromDust: 0, hidden: false },
      { trait: 'petals', fromOnto: 1, fromDust: 1, hidden: false },
    ])
  })

  it('of every young are beads its parents carry: one came down each line', () => {
    for (let pod = 0; pod < 100; pod++) {
      for (const young of seedsOfPod(SEED, pod, PACKETS.short, PACKETS.spots)) {
        for (const line of cameFrom(young, PACKETS.short, PACKETS.spots)) expect(line).toMatchObject({ onto: true, dust: true })
      }
    }
  })
})

describe('a brood sorted', () => {
  const brood = (pod: number) => seedsOfPod(SEED, pod, PACKETS.short, PACKETS.short).map((pairs, at) => ({ id: at + 1, pairs, dry: false }))

  it('puts every plant in one group of plants that look alike', () => {
    for (let pod = 0; pod < 60; pod++) {
      const plants = brood(pod), groups = groupsOf(plants)
      expect(groups.flatMap((group) => group.ids).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
      for (const group of groups) for (const id of group.ids) expect(lookOf(plants[id - 1].pairs, false)).toEqual(group.look)
      expect(new Set(groups.map((group) => JSON.stringify(group.look))).size).toBe(groups.length)
    }
  })

  it('lays beside each group the numeral of its own count, from one to six, and the counts add up to the brood', () => {
    for (let pod = 0; pod < 60; pod++) {
      const groups = groupsOf(brood(pod))
      for (const group of groups) {
        expect(group.numeral).toBe(group.ids.length)
        expect(group.numeral).toBeGreaterThanOrEqual(1)
        expect(group.numeral).toBeLessThanOrEqual(POD_SEEDS)
      }
      expect(groups.reduce((sum, group) => sum + group.numeral, 0)).toBe(POD_SEEDS)
    }
  })

  it('draws no count beside a group while that is held for the owner, and still sorts the brood', () => {
    expect(GROUP_NUMERAL_DRAWN).toBe(false)
    const groups = groupsOf(brood(0))
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) expect(groupNumeral(group)).toBe(null)
  })

  it('sorts the same brood the same way, largest group first', () => {
    for (let pod = 0; pod < 20; pod++) {
      const groups = groupsOf(brood(pod))
      expect(groupsOf([...brood(pod)].reverse()).map((group) => group.look)).toEqual(groups.map((group) => group.look))
      for (let at = 1; at < groups.length; at++) expect(groups[at].numeral).toBeLessThanOrEqual(groups[at - 1].numeral)
    }
  })

  it('tells a plant that came up in dry soil from its sisters', () => {
    const groups = groupsOf([{ id: 1, pairs: PACKETS.pink, dry: false }, { id: 2, pairs: PACKETS.pink, dry: true }])
    expect(groups.map((group) => group.look.joints).sort()).toEqual([2, 4])
  })

  it('of nothing is no groups', () => {
    expect(groupsOf([])).toEqual([])
  })
})

describe('the numeral of a wish', () => {
  const visit = (count: 1 | 2 | 3): Visit => ({ who: 'snail', at: 'whole-plant', count, big: false, given: [], pods: 0 })

  it('is how many alike it asks for, and none for a single plant', () => {
    expect(wishNumeral(visit(1))).toBe(null)
    expect(wishNumeral(visit(2))).toBe(2)
    expect(wishNumeral(visit(3))).toBe(3)
  })
})
