import { describe, expect, it } from 'vitest'
import { POD_SEEDS, seedsOfPod } from './breed'
import { BORDER_PLACES, POTS_PER_ROW } from './layout'
import { isPacketId, isPairs, lookOf } from './plant'
import { SPIKE_POD, SPIKE_SEED, spikePage } from './spikePage'

describe('the spike page', () => {
  const page = spikePage()
  const byId = new Map(page.plants.map((plant) => [plant.id, plant]))
  const brood = page.plants.filter((plant) => plant.row === 'tray')

  it('is the same every time', () => {
    expect(spikePage()).toEqual(page)
    expect(JSON.parse(JSON.stringify(page))).toEqual(page)
    expect(page.seed).toBe(SPIKE_SEED)
  })

  it('holds in the tray exactly the brood the model gives for its two parents', () => {
    expect(brood).toHaveLength(POD_SEEDS)
    const first = brood[0].origin
    if (first.kind !== 'seed') throw new Error('the brood came from a pod')
    const onto = byId.get(first.onto)!, dust = byId.get(first.dust)!
    expect(onto.row).toBe('shelf')
    expect(dust.row).toBe('shelf')
    const seeds = seedsOfPod(SPIKE_SEED, SPIKE_POD, onto.pairs, dust.pairs)
    brood.forEach((plant) => {
      expect(plant.origin).toEqual(first)
      expect(plant.pairs).toBe(seeds[plant.slot])
    })
  })

  it('shows a brood that differs in colour, height and leaf', () => {
    const looks = brood.map((plant) => lookOf(plant.pairs, plant.dry))
    for (const trait of ['colour', 'joints', 'leaf'] as const) expect(new Set(looks.map((look) => look[trait])).size, trait).toBeGreaterThan(1)
  })

  it('lets no two plants share a place, and keeps every plant in a place that exists', () => {
    const places = new Set(page.plants.map((plant) => `${plant.row} ${plant.slot}`))
    expect(places.size).toBe(page.plants.length)
    for (const plant of page.plants) {
      expect(isPairs(plant.pairs)).toBe(true)
      expect(Number.isInteger(plant.slot) && plant.slot >= 0).toBe(true)
      expect(plant.slot).toBeLessThan(plant.row === 'border' ? BORDER_PLACES : POTS_PER_ROW)
    }
    expect(new Set(page.plants.map((plant) => plant.id)).size).toBe(page.plants.length)
  })

  it('has one dry tray pot with a plant at half its height in it', () => {
    expect(page.dry).toHaveLength(POTS_PER_ROW * 2)
    const dryPots = page.dry.flatMap((dry, pot) => (dry ? [pot] : []))
    expect(dryPots).toHaveLength(1)
    const plant = brood.find((young) => young.slot === dryPots[0] - POTS_PER_ROW)!
    expect(plant.dry).toBe(true)
    expect(lookOf(plant.pairs, true).joints * 2).toBe(lookOf(plant.pairs, false).joints)
  })

  it('joins one copy to its parent by a runner, with the same pairs', () => {
    const copies = page.plants.filter((plant) => plant.origin.kind === 'runner')
    expect(copies).toHaveLength(1)
    const origin = copies[0].origin
    if (origin.kind !== 'runner') throw new Error('a copy came by a runner')
    const parent = byId.get(origin.from)!
    expect(copies[0].pairs).toBe(parent.pairs)
    expect(parent.row).toBe(copies[0].row)
    expect(Math.abs(parent.slot - copies[0].slot)).toBe(1)
  })

  it('leaves the pot the worm looks out of empty, and a pod on a plant of the page', () => {
    expect(page.worm).not.toBeNull()
    const row = page.worm! < POTS_PER_ROW ? 'shelf' : 'tray'
    expect(page.plants.some((plant) => plant.row === row && plant.slot === page.worm! % POTS_PER_ROW)).toBe(false)
    for (const on of page.pods) expect(byId.has(on)).toBe(true)
    expect(page.packets.every(isPacketId)).toBe(true)
    expect(new Set(page.packets).size).toBe(page.packets.length)
  })

  it('shows every colour, every height, both leaves and both kinds of petal somewhere on the page', () => {
    const looks = page.plants.map((plant) => lookOf(plant.pairs, plant.dry))
    expect(new Set(looks.map((look) => look.colour)).size).toBe(3)
    expect(new Set(looks.map((look) => look.joints)).size).toBe(3)
    expect(new Set(looks.map((look) => look.leaf)).size).toBe(2)
    expect(new Set(looks.map((look) => look.petals)).size).toBe(2)
  })
})
