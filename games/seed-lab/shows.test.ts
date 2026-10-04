import { describe, expect, it } from 'vitest'
import { deserializeLab, freshLab, serializeLab, type LabState } from './lab'
import { groupsOf } from './loupe'
import { kitAt, type Visit } from './order'
import { burst, dab, isDry, leave, plantAt, plantById, sow } from './page'
import { PACKETS, lookOf, pack } from './plant'
import { showCompare, showTool } from './shows'

const SEED = 20261003
const RED_SHORT = pack({ colour: [1, 1], height: [0, 0], leaf: [1, 1], petals: [1, 1] })
const page = (position: Parameters<typeof kitAt>[0]): LabState => ({ ...freshLab(null, SEED), kit: kitAt(position) })
const saved = (state: LabState) => deserializeLab(JSON.parse(JSON.stringify(serializeLab(state))), null, 1)
const snail: Visit = { who: 'snail', at: 'runner', count: 2, big: false, given: [], pods: 0 }
/** The fields of the page other than the ones named. */
const rest = (state: LabState, ...changed: (keyof LabState)[]) => Object.fromEntries(Object.entries(state).filter(([field]) => !changed.includes(field as keyof LabState)))

describe('the showing of a new tool', () => {
  it('for the runner leaves a copy of one plant rooted in a pot, tied to its parent, and the tool marked as shown', () => {
    const start = page('runner')
    const { state, events } = showTool(start, 'runner')
    const copy = plantAt(state, 'tray', 0)!
    expect(copy).toMatchObject({ id: 3, pairs: PACKETS.pink, from: { how: 'runner', of: 1 } })
    expect(state.shown).toEqual(['runner'])
    expect(events).toEqual([{ type: 'grew', id: 3, how: 'runner' }])
  })

  it('for the blotter leaves one pot dry and a copy in it that came up half as high as its parent', () => {
    const start = page('dry')
    const { state } = showTool(start, 'water')
    expect(isDry(state, 'tray', 0)).toBe(true)
    const copy = plantAt(state, 'tray', 0)!, parent = plantById(state, 1)!
    expect(copy.pairs).toBe(parent.pairs)
    expect(lookOf(copy.pairs, copy.dry).joints).toBe(lookOf(parent.pairs, parent.dry).joints / 2)
    expect(state.shown).toEqual(['water'])
  })

  it('changes `plants`, `nextId`, `dry` and `shown` and no other field', () => {
    const runnerStart = page('runner'), waterStart = page('dry')
    expect(rest(showTool(runnerStart, 'runner').state, 'plants', 'nextId', 'shown')).toEqual(rest(runnerStart, 'plants', 'nextId', 'shown'))
    expect(rest(showTool(waterStart, 'water').state, 'plants', 'nextId', 'dry', 'shown')).toEqual(rest(waterStart, 'plants', 'nextId', 'dry', 'shown'))
    expect(showTool(runnerStart, 'runner').state.dry).toEqual(runnerStart.dry)
  })

  it('is saved when the scene starts as it stands at the scene’s end: put away midway, it is found finished', () => {
    for (const [tool, position] of [['runner', 'runner'], ['water', 'dry']] as const) {
      const ended = showTool(page(position), tool).state
      expect(saved(ended)).toEqual(ended)
      expect(saved(ended).shown).toContain(tool)
    }
  })

  it('for the blotter never makes the plant the visitor wants: a copy that would come up at the height asked for is not made', () => {
    const ant: Visit = { who: 'ant', at: 'dry', count: 1, big: false, given: [], pods: 0 }
    const base = page('dry')
    // A short pink plant: its copy in dried soil would have one joint, which is the ant's wish.
    const PINK_SHORT = pack({ colour: [1, 0], height: [0, 0], leaf: [1, 1], petals: [1, 1] })
    const short = { id: 9, pairs: PINK_SHORT, dry: false, row: 'shelf' as const, slot: 0, from: { how: 'packet' as const, packet: 'pink' as const } }
    const some = { ...base, visitor: ant, nextId: 10, plants: [short, { ...base.plants[1] }] }
    const { state } = showTool(some, 'water')
    const copy = state.plants.find((plant) => plant.from.how === 'runner')!
    // It works on the tall packet plant instead: the copy has two joints.
    expect(copy.from).toEqual({ how: 'runner', of: 2 })
    expect(lookOf(copy.pairs, copy.dry).joints).toBe(2)
    // With nothing but short plants in the pots it sows a packet plant and works on that.
    const only = showTool({ ...some, plants: [short] }, 'water').state
    const made = only.plants.find((plant) => plant.from.how === 'runner')!
    expect(lookOf(made.pairs, made.dry).joints).toBe(2)
    expect(only.plants.some((plant) => plant.from.how === 'runner' && lookOf(plant.pairs, plant.dry).joints === 1)).toBe(false)
  })

  it('never plays again: a second showing of the same tool changes nothing', () => {
    const once = showTool(page('runner'), 'runner').state
    expect(showTool(once, 'runner')).toEqual({ state: once, events: [] })
    expect(showTool(saved(once), 'runner').events).toEqual([])
  })

  it('never works on a plant the visitor on the page wants: a copy of one would be the answer', () => {
    const base = page('runner')
    const wanted = { id: 9, pairs: RED_SHORT, dry: false, row: 'shelf' as const, slot: 0, from: { how: 'packet' as const, packet: 'pink' as const } }
    // The wanted plant has the lowest pot and would be first; the beetle takes the packet plant instead.
    const some = { ...base, visitor: snail, nextId: 10, plants: [wanted, { ...base.plants[1] }] }
    expect(plantAt(showTool(some, 'runner').state, 'tray', 0)!.from).toEqual({ how: 'runner', of: 2 })
    // With nothing but wanted plants in the pots, it sows a packet seed and works on that.
    const only = { ...base, visitor: snail, nextId: 10, plants: [wanted] }
    const { state, events } = showTool(only, 'runner')
    expect(events.map((event) => event.type)).toEqual(['grew', 'grew'])
    const sown = state.plants.find((plant) => plant.from.how === 'packet' && plant.id !== 9)!
    const copy = state.plants.find((plant) => plant.from.how === 'runner')!
    expect(copy.from).toEqual({ how: 'runner', of: sown.id })
    expect(copy.pairs).toBe(PACKETS.pink)
    expect(state.plants.filter((plant) => plant.pairs === RED_SHORT)).toHaveLength(1)
  })

  it('goes only into pots that stand free: with all twelve pots taken it waits, changing nothing, and plays once a pot is free', () => {
    let full = page('runner')
    for (const row of ['shelf', 'tray'] as const) for (let slot = 0; slot < 6; slot++) if (!plantAt(full, row, slot)) full = sow(full, 'pink', row, slot).state
    expect(full.plants.filter((plant) => plant.row !== 'border')).toHaveLength(12)
    const waiting = showTool(full, 'runner')
    expect(waiting).toEqual({ state: full, events: [] })
    expect(waiting.state.shown).toEqual([])
    // The child frees a pot: the showing plays, into that pot, and shoulders no plant out.
    const freed = leave(full, plantAt(full, 'tray', 3)!.id).state
    const played = showTool(freed, 'runner')
    expect(plantAt(played.state, 'tray', 3)!.from.how).toBe('runner')
    expect(played.state.plants.filter((plant) => plant.row === 'border')).toHaveLength(0)
    expect(played.events.map((event) => event.type)).toEqual(['grew'])
    expect(played.state.sketched).toEqual(full.sketched)
    expect(played.state.pods).toEqual(full.pods)
  })

  it('waits for two free pots where it has to sow a packet plant first', () => {
    const base = page('runner')
    const wanted = (id: number, row: 'shelf' | 'tray', slot: number) => ({ id, pairs: RED_SHORT, dry: false, row, slot, from: { how: 'packet' as const, packet: 'pink' as const } })
    const plants = [0, 1, 2, 3, 4, 5].map((slot) => wanted(10 + slot, 'shelf', slot)).concat([0, 1, 2, 3, 4].map((slot) => wanted(20 + slot, 'tray', slot)))
    const one = { ...base, visitor: snail, nextId: 30, plants }
    expect(showTool(one, 'runner')).toEqual({ state: one, events: [] })
    const two = { ...one, plants: plants.slice(0, 10) }
    expect(showTool(two, 'runner').events.map((event) => event.type)).toEqual(['grew', 'grew'])
  })

  it('does nothing for a tool that has not arrived', () => {
    const start = page('colour-short')
    expect(showTool(start, 'runner')).toEqual({ state: start, events: [] })
    expect(showTool(page('runner'), 'water').events).toEqual([])
  })
})

describe('the neat way to compare', () => {
  const brooded = () => {
    const state = burst(dab({ ...freshLab(null, SEED), kit: kitAt('short') }, 1, 2).state, 2).state
    return { state, brood: state.plants.filter((plant) => plant.row === 'tray').map((plant) => plant.id) }
  }

  it('leaves the young of the brood standing in the tray in groups of a kind, the largest first', () => {
    const { state, brood } = brooded()
    const after = showCompare(state, 'sort', brood).state
    const inTray = after.plants.filter((plant) => plant.row === 'tray').sort((a, b) => a.slot - b.slot)
    const groups = groupsOf(state.plants.filter((plant) => brood.includes(plant.id)))
    expect(groups.length).toBeGreaterThan(1)
    expect(inTray.map((plant) => plant.id)).toEqual(groups.flatMap((group) => group.ids))
    // Like stands beside like: the looks along the tray never return to one already left.
    const looks = inTray.map((plant) => JSON.stringify(lookOf(plant.pairs, plant.dry)))
    expect(looks.filter((look, at) => at === 0 || look !== looks[at - 1])).toHaveLength(groups.length)
  })

  it('moves no plant out of the tray and changes no plant: the same young, the same pots, another order', () => {
    const { state, brood } = brooded()
    const after = showCompare(state, 'sort', brood).state
    const strip = (plants: LabState['plants']) => plants.map(({ slot: _slot, ...plant }) => plant).sort((a, b) => a.id - b.id)
    expect(strip(after.plants)).toEqual(strip(state.plants))
    expect(after.plants.filter((plant) => plant.row === 'tray').map((plant) => plant.slot).sort()).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('changes `plants` and `shown` and no other field', () => {
    const { state, brood } = brooded()
    const after = showCompare(state, 'hidden', brood).state
    expect(rest(after, 'plants', 'shown')).toEqual(rest(state, 'plants', 'shown'))
    expect(after.shown).toEqual(['hidden'])
  })

  it('is saved when the scene starts as it stands at the scene’s end, and never plays again', () => {
    const { state, brood } = brooded()
    const ended = showCompare(state, 'sort', brood).state
    expect(saved(ended)).toEqual(ended)
    expect(showCompare(saved(ended), 'sort', brood)).toEqual({ state: saved(ended), events: [] })
  })

  it('leaves young of the brood that are no longer in the tray where they are', () => {
    const { state, brood } = brooded()
    const moved = { ...state, plants: state.plants.map((plant) => (plant.id === brood[0] ? { ...plant, row: 'shelf' as const, slot: 5 } : plant)) }
    const after = showCompare(moved, 'sort', brood).state
    expect(plantById(after, brood[0])).toMatchObject({ row: 'shelf', slot: 5 })
    expect(after.plants.filter((plant) => plant.row === 'tray').map((plant) => plant.slot).sort()).toEqual([1, 2, 3, 4, 5])
  })
})
