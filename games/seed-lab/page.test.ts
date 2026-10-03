import { describe, expect, it } from 'vitest'
import { POD_SEEDS, seedsOfPod } from './breed'
import { BORDER_PLACES, SKETCHED, freshLab, type LabState, type Plant } from './lab'
import { kitAt } from './order'
import { burst, dab, isDry, move, plantAt, plantById, podOn, runner, setSoil, sow, swapPots, take } from './page'
import { PACKETS, lookCode, lookOf } from './plant'

const SEED = 20261003
const page = (position: Parameters<typeof kitAt>[0] = 'colour'): LabState => ({ ...freshLab(null, SEED), kit: kitAt(position) })
const ids = (state: LabState, row: Plant['row']) => state.plants.filter((plant) => plant.row === row).sort((a, b) => a.slot - b.slot).map((plant) => plant.id)

describe('the dab', () => {
  it('sets a pod on the flower the dust reaches, with its six seeds already drawn', () => {
    const start = page()
    const { state, events } = dab(start, 1, 2)
    expect(events).toEqual([{ type: 'pod-set', on: 2, dust: 1 }])
    expect(state.pods).toEqual([{ on: 2, dust: 1, seeds: seedsOfPod(SEED, 0, PACKETS.pink, PACKETS.pink) }])
    expect(state.podsSet).toBe(1)
    expect(state.plants).toEqual(start.plants)
  })

  it('works with a plant’s own dust', () => {
    expect(dab(page(), 1, 1).state.pods).toHaveLength(1)
  })

  it('draws the next pod from the next place in the stream', () => {
    const second = dab(dab(page(), 1, 2).state, 2, 1).state
    expect(second.pods[1].seeds).toEqual(seedsOfPod(SEED, 1, PACKETS.pink, PACKETS.pink))
    expect(second.pods[1].seeds).not.toEqual(second.pods[0].seeds)
  })

  it('on a flower that already holds a pod changes nothing and says so', () => {
    const once = dab(page(), 1, 2).state
    const again = dab(once, 1, 2)
    expect(again.state).toBe(once)
    expect(again.events).toEqual([{ type: 'pod-full', on: 2 }])
  })

  it('counts towards a visit only while a visitor is being served', () => {
    const visitor = { who: 'snail', at: 'colour', count: 1, big: false, given: [], pods: 0 } as const
    expect(dab(page(), 1, 2).state.visitor).toBe(null)
    expect(dab({ ...page(), visitor: { ...visitor, given: [] } }, 1, 2).state.visitor!.pods).toBe(1)
    expect(dab({ ...page(), visitor: { ...visitor, given: [] }, finished: true }, 1, 2).state.visitor!.pods).toBe(0)
  })
})

describe('a pod that bursts', () => {
  it('gives six young in the tray, each from the two parents, and the parents stay', () => {
    const set = dab(page(), 1, 2).state
    const { state, events } = burst(set, 2)
    expect(events[0]).toEqual({ type: 'burst', on: 2, young: [3, 4, 5, 6, 7, 8] })
    expect(ids(state, 'tray')).toEqual([3, 4, 5, 6, 7, 8])
    expect(ids(state, 'shelf')).toEqual([1, 2])
    expect(state.pods).toEqual([])
    expect(state.plants.filter((plant) => plant.row === 'tray').map((plant) => plant.pairs)).toEqual(set.pods[0].seeds)
    for (const id of [3, 4, 5, 6, 7, 8]) expect(plantById(state, id)!.from).toEqual({ how: 'seed', onto: 2, dust: 1 })
  })

  it('moves the brood before it to the border, in order, and loses none of it', () => {
    let state = burst(dab(page(), 1, 2).state, 2).state
    state = burst(dab(state, 1, 2).state, 2).state
    expect(ids(state, 'border')).toEqual([3, 4, 5, 6, 7, 8])
    expect(ids(state, 'tray')).toEqual([9, 10, 11, 12, 13, 14])
  })

  it('leaves a tray plant that holds a pod where it is, and sends the young that find no pot to the border', () => {
    let state = burst(dab(page(), 1, 2).state, 2).state
    state = dab(state, 1, 5).state
    state = burst(dab(state, 1, 2).state, 2).state
    expect(plantById(state, 5)).toMatchObject({ row: 'tray', slot: 2 })
    expect(state.plants.filter((plant) => plant.row === 'tray')).toHaveLength(6)
    expect(state.plants.filter((plant) => plant.id > 8 && plant.row === 'border')).toHaveLength(1)
    expect(podOn(state, 5)).toBeDefined()
  })

  it('brings each young up in the soil of its own pot', () => {
    let state = setSoil(page('dry'), 'tray', 3, true).state
    state = burst(dab(state, 1, 2).state, 2).state
    expect(state.plants.filter((plant) => plant.row === 'tray').map((plant) => plant.dry)).toEqual([false, false, false, true, false, false])
  })

  it('sends the oldest border plant off the page when the border is full, and keeps a sketch of it', () => {
    let state = page()
    for (let pod = 0; pod < 4; pod++) state = burst(dab(state, 1, 2).state, 2).state
    expect(state.plants.filter((plant) => plant.row === 'border')).toHaveLength(BORDER_PLACES)
    const oldest = plantAt(state, 'border', 0)!
    const next = burst(dab(state, 1, 2).state, 2)
    expect(next.events.filter((event) => event.type === 'carried-off')).toHaveLength(POD_SEEDS)
    expect(next.events[1]).toEqual({ type: 'carried-off', id: oldest.id, look: lookCode(lookOf(oldest.pairs, oldest.dry)) })
    expect(next.state.plants.filter((plant) => plant.row === 'border')).toHaveLength(BORDER_PLACES)
    expect(next.state.sketched).toHaveLength(POD_SEEDS)
    expect(ids(next.state, 'shelf')).toEqual([1, 2])
    let many = next.state
    for (let pod = 0; pod < 3; pod++) many = burst(dab(many, 1, 2).state, 2).state
    expect(many.sketched).toHaveLength(SKETCHED)
  })

  it('does nothing where there is no pod', () => {
    const start = page()
    expect(burst(start, 1)).toEqual({ state: start, events: [] })
  })
})

describe('a packet seed', () => {
  it('grows in the pot it is set on, in that pot’s soil', () => {
    const dryPot = setSoil(page('dry'), 'shelf', 4, true).state
    const { state, events } = sow(dryPot, 'short', 'shelf', 4)
    expect(events).toEqual([{ type: 'grew', id: 3, how: 'packet' }])
    expect(plantAt(state, 'shelf', 4)).toEqual({ id: 3, pairs: PACKETS.short, dry: true, row: 'shelf', slot: 4, from: { how: 'packet', packet: 'short' } })
  })

  it('shoulders out the plant already in that pot, which hops to the border', () => {
    const { state, events } = sow(page(), 'pink', 'shelf', 0)
    expect(events).toEqual([{ type: 'shouldered', id: 1 }, { type: 'grew', id: 3, how: 'packet' }])
    expect(plantById(state, 1)).toMatchObject({ row: 'border', slot: 0 })
    expect(plantAt(state, 'shelf', 0)!.id).toBe(3)
  })

  it('lands on the nearest free pot when the plant there holds a pod', () => {
    const state = sow(dab(page(), 2, 1).state, 'pink', 'shelf', 0).state
    expect(plantById(state, 1)).toMatchObject({ row: 'shelf', slot: 0 })
    expect(plantById(state, 3)).toMatchObject({ row: 'shelf', slot: 2 })
  })

  it('can always be sown again: a packet never runs out', () => {
    let state = page()
    for (let n = 0; n < 60; n++) state = sow(state, 'pink', 'tray', n % 6).state
    expect(state.plants.filter((plant) => plant.pairs === PACKETS.pink).length).toBeGreaterThan(20)
  })

  it('of a packet that has not arrived does nothing', () => {
    const start = page()
    expect(sow(start, 'spots', 'tray', 0)).toEqual({ state: start, events: [] })
  })
})

describe('a runner', () => {
  it('roots a copy of the one parent, tied to it', () => {
    const { state, events } = runner(page('runner'), 1, 'tray', 2)
    expect(events).toEqual([{ type: 'grew', id: 3, how: 'runner' }])
    expect(plantAt(state, 'tray', 2)).toEqual({ id: 3, pairs: plantById(state, 1)!.pairs, dry: false, row: 'tray', slot: 2, from: { how: 'runner', of: 1 } })
  })

  it('in dry soil comes up half as high and passes on what its parent passes on', () => {
    const state = runner(setSoil(page('dry'), 'tray', 0, true).state, 1, 'tray', 0).state
    const parent = plantById(state, 1)!, copy = plantAt(state, 'tray', 0)!
    expect(lookOf(copy.pairs, copy.dry).joints).toBe(lookOf(parent.pairs, parent.dry).joints / 2)
    expect(copy.pairs).toBe(parent.pairs)
  })

  it('set down on its own parent’s pot roots in the next one, and the parent stays', () => {
    const state = runner(page('runner'), 1, 'shelf', 0).state
    expect(plantById(state, 1)).toMatchObject({ row: 'shelf', slot: 0 })
    expect(plantById(state, 3)).toMatchObject({ row: 'shelf', slot: 2 })
  })

  it('does nothing before the runner bud has arrived', () => {
    const start = page('colour-short')
    expect(runner(start, 1, 'tray', 0)).toEqual({ state: start, events: [] })
  })
})

describe('carrying', () => {
  it('moves a plant to a free pot at the height it grew to', () => {
    const { state, events } = move(page(), 1, 'tray', 4)
    expect(events).toEqual([{ type: 'moved', id: 1 }])
    expect(plantById(state, 1)).toMatchObject({ row: 'tray', slot: 4, dry: false })
  })

  it('shoulders the other plant out to the border', () => {
    const { state, events } = move(page(), 1, 'shelf', 1)
    expect(events).toEqual([{ type: 'moved', id: 1 }, { type: 'shouldered', id: 2 }])
    expect(plantById(state, 2)).toMatchObject({ row: 'border', slot: 0 })
  })

  it('trades places with a plant that holds a pod', () => {
    const state = move(dab(page(), 1, 2).state, 1, 'shelf', 1).state
    expect(plantById(state, 1)).toMatchObject({ row: 'shelf', slot: 1 })
    expect(plantById(state, 2)).toMatchObject({ row: 'shelf', slot: 0 })
  })

  it('takes a plant back from the border, and the border closes up', () => {
    let state = move(page(), 1, 'shelf', 1).state
    state = sow(sow(state, 'pink', 'tray', 0).state, 'pink', 'tray', 0).state
    expect(ids(state, 'border')).toEqual([2, 3])
    state = move(state, 2, 'shelf', 5).state
    expect(plantById(state, 2)).toMatchObject({ row: 'shelf', slot: 5 })
    expect(plantById(state, 3)).toMatchObject({ row: 'border', slot: 0 })
  })

  it('to the pot a plant already stands in does nothing', () => {
    const start = page()
    expect(move(start, 1, 'shelf', 0)).toEqual({ state: start, events: [] })
  })

  it('swaps two pots with their soil and their plants', () => {
    const start = setSoil(page('dry'), 'shelf', 0, true).state
    const { state, events } = swapPots(start, { row: 'shelf', slot: 0 }, { row: 'tray', slot: 3 })
    expect(events).toEqual([{ type: 'pots-swapped' }])
    expect(plantById(state, 1)).toMatchObject({ row: 'tray', slot: 3 })
    expect(isDry(state, 'tray', 3)).toBe(true)
    expect(isDry(state, 'shelf', 0)).toBe(false)
  })
})

describe('soil', () => {
  it('is wet or dry by the can and the blotter, and says whether it changed', () => {
    const dried = setSoil(page('dry'), 'tray', 1, true)
    expect(dried.events).toEqual([{ type: 'soil', pot: 7, dry: true, changed: true }])
    expect(isDry(dried.state, 'tray', 1)).toBe(true)
    const again = setSoil(dried.state, 'tray', 1, true)
    expect(again.events).toEqual([{ type: 'soil', pot: 7, dry: true, changed: false }])
    expect(again.state).toBe(dried.state)
    expect(isDry(setSoil(dried.state, 'tray', 1, false).state, 'tray', 1)).toBe(false)
  })

  it('never changes a plant that has grown', () => {
    const start = page('dry')
    const state = setSoil(setSoil(start, 'shelf', 0, true).state, 'shelf', 1, true).state
    expect(state.plants).toEqual(start.plants)
  })

  it('does nothing before the can has arrived', () => {
    const start = page()
    expect(setSoil(start, 'tray', 1, true)).toEqual({ state: start, events: [] })
  })

  it('is never dry in the border, which is open ground', () => {
    expect(isDry(page(), 'border', 3)).toBe(false)
  })
})

describe('a plant that goes with a visitor', () => {
  it('leaves the page with its pod, and nothing else moves', () => {
    const start = dab(page(), 1, 2).state
    const state = take(start, 2)
    expect(state.plants.map((plant) => plant.id)).toEqual([1])
    expect(state.pods).toEqual([])
  })
})
