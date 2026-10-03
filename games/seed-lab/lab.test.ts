import { describe, expect, it } from 'vitest'
import { POD_SEEDS } from './breed'
import { FIRST_VISIT, LADDER } from './config'
import { BORDER_PLACES, IDEAS, KEPT, SHELF_POTS, SKETCHED, TRAY_POTS, deserializeLab, freshLab, potIndex, serializeLab, type LabState, type Plant } from './lab'
import { KIT_IDS, STEPS, kitAt } from './order'
import { LOOKS, PACKETS, lookOf } from './plant'
import { STATE_VERSION } from './state'

const SEED = 20261003
const roundTrip = (state: LabState) => deserializeLab(JSON.parse(JSON.stringify(serializeLab(state))), null, 1)

/** The largest page the rules allow: every pot and border place taken by a plant with a long id, a pod on every pot plant, every list full. */
function largest(): LabState {
  const id = (n: number) => 9_000_000_000_000 + n
  const plants: Plant[] = []
  for (let slot = 0; slot < SHELF_POTS; slot++) plants.push({ id: id(plants.length), pairs: 255, dry: true, row: 'shelf', slot, from: { how: 'seed', onto: id(98), dust: id(99) } })
  for (let slot = 0; slot < TRAY_POTS; slot++) plants.push({ id: id(plants.length), pairs: 255, dry: true, row: 'tray', slot, from: { how: 'seed', onto: id(98), dust: id(99) } })
  for (let slot = 0; slot < BORDER_PLACES; slot++) plants.push({ id: id(plants.length), pairs: 255, dry: true, row: 'border', slot, from: { how: 'seed', onto: id(98), dust: id(99) } })
  return {
    ...freshLab(12, 0xffffffff),
    position: 'colour-short',
    finished: true,
    podsSet: id(1),
    visitsLaid: id(2),
    nextId: id(100),
    kit: [...KIT_IDS],
    plants,
    dry: new Array(SHELF_POTS + TRAY_POTS).fill(true),
    pods: plants.filter((plant) => plant.row !== 'border').map((plant) => ({ on: plant.id, dust: id(99), seeds: new Array(POD_SEEDS).fill(255) })),
    visitor: { who: 'ladybird', at: 'whole-plant', count: 3, big: true, given: [LOOKS - 1, LOOKS - 1, LOOKS - 1], pods: id(3) },
    waiting: { who: 'ladybird', at: 'whole-plant', count: 3, big: true, given: [LOOKS - 1, LOOKS - 1, LOOKS - 1], pods: id(3) },
    kept: new Array(KEPT).fill({ who: 'ladybird', look: LOOKS - 1 }),
    sketched: new Array(SKETCHED).fill(LOOKS - 1),
    shown: [...IDEAS],
  }
}

describe('a new page', () => {
  it('opens with two packet plants in bloom on the shelf, wet soil, nobody on the page and a visitor waiting', () => {
    const page = freshLab(null, SEED)
    expect(page.plants.map((plant) => [plant.row, plant.slot, lookOf(plant.pairs, plant.dry)])).toEqual([
      ['shelf', 0, lookOf(PACKETS.pink, false)],
      ['shelf', 1, lookOf(PACKETS.pink, false)],
    ])
    expect(page.dry).toEqual(new Array(12).fill(false))
    expect(page.visitor).toBe(null)
    expect(page.finished).toBe(false)
    expect(STEPS.colour.visitors).toContain(page.waiting.who)
    expect(page.waiting.at).toBe('colour')
    expect(page.pods).toEqual([])
  })

  it('starts where the age says and with the packets of every position up to there', () => {
    expect(freshLab(null, SEED).position).toBe('colour')
    expect(freshLab(9, SEED).position).toBe('colour')
    expect(freshLab(10, SEED).position).toBe('colour')
    expect(freshLab(11, SEED).position).toBe('short')
    expect(freshLab(40, SEED).position).toBe('short')
    expect(freshLab(2, SEED).position).toBe('colour')
    for (const row of FIRST_VISIT) expect(freshLab(row.fromAge, SEED).kit).toEqual(kitAt(row.position))
  })

  it('is the same page for the same seed and another for another', () => {
    expect(freshLab(null, SEED)).toEqual(freshLab(null, SEED))
    const who = new Set(Array.from({ length: 40 }, (_, seed) => freshLab(null, seed).waiting.who))
    expect(who.size).toBeGreaterThan(1)
  })

  it('numbers its pots: the shelf first, then the tray, and none in the border', () => {
    expect(potIndex('shelf', 0)).toBe(0)
    expect(potIndex('tray', 0)).toBe(SHELF_POTS)
    expect(potIndex('tray', 5)).toBe(11)
    expect(potIndex('border', 3)).toBe(null)
  })
})

describe('the saved page', () => {
  it('is found as it was left', () => {
    const page = freshLab(11, SEED)
    expect(roundTrip(page)).toEqual(page)
    expect(roundTrip(largest())).toEqual(largest())
  })

  it('holds its largest legal state in under half of the 64 KB a slot allows', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(serializeLab(largest()))).length
    expect(bytes).toBeLessThan(32 * 1024)
  })

  it('hands storage a copy and plain data only', () => {
    const page = largest(), saved = serializeLab(page)
    expect(saved).toEqual(page)
    expect(saved.plants).not.toBe(page.plants)
    expect(saved.plants[0]).not.toBe(page.plants[0])
    expect(saved.pods[0].seeds).not.toBe(page.pods[0].seeds)
    expect(JSON.parse(JSON.stringify(saved))).toEqual(saved)
  })

  it('gives a fresh page for anything that is not its record, or a version above its own', () => {
    for (const bad of [null, undefined, 3, 'page', [], {}, { v: STATE_VERSION + 1, plants: [] }, { v: '1' }]) expect(deserializeLab(bad, 11, SEED)).toEqual(freshLab(11, SEED))
  })

  it('lets a saved position and a saved seed win over the age and the seed it is handed', () => {
    const page = { ...freshLab(null, SEED), position: 'jagged' }
    const back = deserializeLab(JSON.parse(JSON.stringify(serializeLab(page))), 12, 999)
    expect(back.position).toBe('jagged')
    expect(back.seed).toBe(SEED)
  })

  it('repairs each damaged field by itself and keeps the rest', () => {
    const good = serializeLab(largest())
    const damaged: Record<string, unknown> = { ...good, seed: -5, podsSet: 'many', nextId: null, kit: ['pink', 'spade', 7], dry: 'yes', pods: {}, visitor: 'snail', kept: [{ who: 'cat', look: 1 }, { who: 'bee', look: 2 }], sketched: [1, 99, 'x'], shown: ['sort', 'magic'], position: 'nowhere' }
    const back = deserializeLab(damaged, 11, SEED)
    expect(back.seed).toBe(SEED)
    expect(back.podsSet).toBe(0)
    expect(back.nextId).toBe(1 + Math.max(...good.plants.map((plant) => plant.id)))
    expect(back.kit).toEqual(['pink'])
    expect(back.dry).toEqual(new Array(12).fill(false))
    expect(back.pods).toEqual([])
    expect(back.visitor).toBe(null)
    expect(back.finished).toBe(false)
    expect(back.kept).toEqual([{ who: 'bee', look: 2 }])
    expect(back.sketched).toEqual([1])
    expect(back.shown).toEqual(['sort'])
    expect(back.position).toBe('short')
    expect(back.plants).toEqual(good.plants)
    expect(back.waiting).toEqual(good.waiting)
  })

  it('leaves out a damaged plant, keeps the first of two in one place, and closes up the border', () => {
    const plant = (id: unknown, row: unknown, slot: unknown, pairs: unknown = 3) => ({ id, pairs, dry: false, row, slot, from: { how: 'packet', packet: 'pink' } })
    const raw = { ...serializeLab(freshLab(null, SEED)), plants: [plant(1, 'shelf', 0), plant(2, 'shelf', 0), plant(1, 'shelf', 1), plant(3, 'attic', 0), plant(4, 'tray', 6), plant(5, 'tray', 2, 256), plant(6, 'border', 9), plant(7, 'border', 4), plant(0, 'tray', 1), 'weed', null] }
    const back = deserializeLab(raw, null, SEED)
    expect(back.plants.map((one) => [one.id, one.row, one.slot])).toEqual([[1, 'shelf', 0], [6, 'border', 1], [7, 'border', 0]])
    expect(back.nextId).toBeGreaterThan(7)
  })

  it('keeps a pod only on a plant that stands in a pot, one a plant, with six seeds', () => {
    const page = freshLab(null, SEED)
    const seeds = new Array(POD_SEEDS).fill(PACKETS.pink)
    const raw = { ...serializeLab(page), pods: [{ on: 1, dust: 2, seeds }, { on: 1, dust: 1, seeds }, { on: 9, dust: 2, seeds }, { on: 2, dust: 1, seeds: [1, 2] }, { on: 2, dust: 1, seeds: [...seeds.slice(1), 999] }] }
    expect(deserializeLab(raw, null, SEED).pods).toEqual([{ on: 1, dust: 2, seeds }])
  })

  it('gives a plant with a damaged origin the first packet as its origin, and keeps the plant', () => {
    const raw = { ...serializeLab(freshLab(null, SEED)), plants: [{ id: 4, pairs: 0, dry: true, row: 'tray', slot: 3, from: { how: 'cloud' } }] }
    expect(deserializeLab(raw, null, SEED).plants).toEqual([{ id: 4, pairs: 0, dry: true, row: 'tray', slot: 3, from: { how: 'packet', packet: 'pink' } }])
  })

  it('lays out a waiting visitor again when the saved one is damaged, and always has the first packet and the visitor’s kit', () => {
    const raw = { ...serializeLab(freshLab(null, SEED)), waiting: { who: 'cat' }, kit: [], visitor: { who: 'ant', at: 'dry', count: 1, big: false, given: [], pods: 0 } }
    const back = deserializeLab(raw, null, SEED)
    expect(STEPS.colour.visitors).toContain(back.waiting.who)
    expect(back.visitsLaid).toBe(2)
    expect(back.kit.sort()).toEqual([...kitAt('dry')].sort())
  })

  it('stores a position that is on the ladder', () => {
    for (const id of LADDER) expect(roundTrip({ ...freshLab(null, SEED), position: id }).position).toBe(id)
  })
})
