import { describe, expect, it } from 'vitest'
import { STREAM, draws, pick } from './chance'
import { LADDER } from './config'
import { BORDER_PLACES, KEPT, ROW_SIZE, deserializeLab, freshLab, serializeLab, type LabState, type Plant } from './lab'
import { STEPS, kitAt, type KitId, type Visit } from './order'
import { burst, dab, move, plantById, runner, setSoil, sow, swapPots } from './page'
import { PACKETS, TRAITS, isPacketId, lookCode, lookOf, pack, pairOf, type Pairs } from './plant'
import { ideaInBrood, ideaInKit, letIn, markShown, offer, tellingYoung, turnSketch } from './visit'
import { LIKES } from './visitors'

const SEED = 20261003
const RED_SHORT = pack({ colour: [1, 1], height: [0, 0], leaf: [1, 1], petals: [1, 1] })
const WHITE_TALL = pack({ colour: [0, 0], height: [1, 1], leaf: [1, 1], petals: [1, 1] })

const visit = (over: Partial<Visit> = {}): Visit => ({ who: 'snail', at: 'colour-short', count: 1, big: false, given: [], pods: 0, ...over })
/** A page with a visitor on it and one extra plant, id 9, in the tray. */
function served(pairs: Pairs, over: Partial<Visit> = {}, state: Partial<LabState> = {}): LabState {
  const base = freshLab(null, SEED)
  const plant: Plant = { id: 9, pairs, dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }
  return { ...base, position: 'colour-short', kit: kitAt('colour-short'), nextId: 10, plants: [...base.plants, plant], visitor: visit(over), ...state }
}

describe('a plant offered', () => {
  it('that meets the wish goes with the visitor, and the cycle is judged and saved as the ending starts', () => {
    const { state, events } = offer(served(RED_SHORT), 9)
    const look = lookCode(lookOf(RED_SHORT, false))
    expect(events.map((event) => event.type)).toEqual(['answered', 'ending'])
    expect(events[0]).toMatchObject({ who: 'snail', plant: 9, meets: true, secret: null })
    expect(events[1]).toEqual({ type: 'ending', who: 'snail', look, fuller: true })
    expect(plantById(state, 9)).toBeUndefined()
    expect(state.visitor!.given).toEqual([look])
    expect(state.finished).toBe(true)
    expect(state.position).toBe('runner')
  })

  it('that misses is answered trait by trait, likes first, and stays in the pot it came from', () => {
    const start = served(pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] }))
    const { state, events } = offer(start, 9)
    expect(state).toBe(start)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'answered', meets: false })
    expect((events[0] as { answers: { trait: string; fits: boolean }[] }).answers.map((one) => [one.trait, one.fits])).toEqual([['colour', true], ['height', false]])
  })

  it('can be offered again and again: a miss costs nothing and moves nothing', () => {
    let state = served(WHITE_TALL)
    for (let n = 0; n < 5; n++) state = offer(state, 9).state
    expect(state).toEqual(served(WHITE_TALL))
  })

  it('by a visitor that wants two alike is kept, and the cycle goes on until it has both', () => {
    const start = served(RED_SHORT, { at: 'runner', count: 2 }, { position: 'runner', kit: kitAt('runner') })
    const first = offer(start, 9)
    expect(first.events.map((event) => event.type)).toEqual(['answered', 'kept'])
    expect(first.events[1]).toMatchObject({ more: 1 })
    expect(first.state.finished).toBe(false)
    expect(first.state.position).toBe('runner')
    const copy = runner({ ...first.state, plants: [...first.state.plants, { id: 20, pairs: RED_SHORT, dry: false, row: 'shelf', slot: 5, from: { how: 'packet', packet: 'pink' } }] }, 20, 'tray', 1).state
    const second = offer(copy, 20)
    expect(second.events.map((event) => event.type)).toEqual(['answered', 'ending'])
    expect(second.state.finished).toBe(true)
    expect(second.state.position).toBe('jagged')
  })

  it('meets either sketch by meeting the small one, and the answer covers the sketch that is open', () => {
    const jaggedKit = kitAt('jagged')
    const roundLeaved = served(RED_SHORT, { big: true }, { kit: jaggedKit })
    const { state, events } = offer(roundLeaved, 9)
    expect(events[0]).toMatchObject({ meets: true })
    expect((events[0] as { answers: unknown[] }).answers).toHaveLength(3)
    expect(events[1]).toMatchObject({ type: 'ending', fuller: true })
    expect(state.finished).toBe(true)
    // The ladybird likes jagged leaves: round ones meet its small sketch and not its larger one.
    const ladybird = offer(served(RED_SHORT, { who: 'ladybird', big: true }, { kit: jaggedKit }), 9)
    expect(ladybird.events[1]).toMatchObject({ type: 'ending', fuller: false })
  })

  it('went well within the position’s pods, mixed with more, and a plant bred earlier counts in full', () => {
    expect(offer(served(RED_SHORT, { pods: 0 }), 9).state.position).toBe('runner')
    expect(offer(served(RED_SHORT, { pods: STEPS['colour-short'].podsForWell }), 9).state.position).toBe('runner')
    expect(offer(served(RED_SHORT, { pods: STEPS['colour-short'].podsForWell + 1 }), 9).state.position).toBe('colour-short')
  })

  it('that is kept does not take its pod along: the pod bursts as the plant goes, and the brood lands in the tray', () => {
    const start = dab(served(RED_SHORT), 1, 9).state
    const seeds = start.pods[0].seeds
    const { state, events } = offer(start, 9)
    expect(events.map((event) => event.type)).toEqual(['answered', 'burst', 'ending'])
    expect(plantById(state, 9)).toBeUndefined()
    expect(state.pods).toEqual([])
    expect(state.plants.filter((plant) => plant.row === 'tray').map((plant) => plant.pairs)).toEqual(seeds)
  })

  it('that misses keeps its pod, unburst', () => {
    const start = dab(served(WHITE_TALL), 1, 9).state
    const { state, events } = offer(start, 9)
    expect(state).toBe(start)
    expect(events.map((event) => event.type)).toEqual(['answered'])
  })

  it('plays the same secret every time for the same visitor and plant', () => {
    const tiny = { ...served(RED_SHORT), plants: [{ id: 9, pairs: RED_SHORT, dry: true, row: 'tray' as const, slot: 0, from: { how: 'packet' as const, packet: 'pink' as const } }] }
    for (let n = 0; n < 3; n++) expect(offer(tiny, 9).events[0]).toMatchObject({ secret: 'hat', meets: false })
  })

  it('does nothing with nobody on the page, or once the visitor has what it asked for', () => {
    const nobody = { ...served(RED_SHORT), visitor: null }
    expect(offer(nobody, 9)).toEqual({ state: nobody, events: [] })
    const done = offer(served(RED_SHORT), 9).state
    expect(offer(done, 1)).toEqual({ state: done, events: [] })
  })
})

describe('letting the next visitor in', () => {
  it('on a new page brings in the one that waited and lays out the next, a different animal', () => {
    const start = freshLab(null, SEED)
    const { state, events } = letIn(start)
    expect(events).toEqual([{ type: 'came-in', who: start.waiting.who, brought: [] }])
    expect(state.visitor).toEqual(start.waiting)
    expect(state.waiting.who).not.toBe(state.visitor!.who)
    expect(state.visitsLaid).toBe(2)
    expect(state.finished).toBe(false)
    expect(state.position).toBe('colour')
  })

  it('after an ending retires the visitor to the top margin with its plant, and the position has already moved', () => {
    const ended = offer(served(RED_SHORT), 9).state
    const { state, events } = letIn(ended)
    expect(events[0]).toEqual({ type: 'left', who: 'snail', withPlants: 1 })
    expect(state.kept).toEqual([{ who: 'snail', look: lookCode(lookOf(RED_SHORT, false)) }])
    expect(state.position).toBe('runner')
    expect(state.finished).toBe(false)
  })

  it('judges a visitor that leaves with nothing as a cycle that went badly: one step down, and nothing is taken away', () => {
    const start = served(WHITE_TALL)
    const { state } = letIn(start)
    expect(state.position).toBe('short')
    expect(state.kit).toEqual(start.kit)
    expect(state.plants).toEqual(start.plants)
    expect(state.kept).toEqual([])
  })

  it('judges a visitor that leaves with some of what it asked for as mixed: the position stays', () => {
    const some = offer(served(RED_SHORT, { at: 'runner', count: 2 }, { position: 'runner', kit: kitAt('runner') }), 9).state
    expect(letIn(some).state.position).toBe('runner')
  })

  it('shows a new position first on the visitor after next, and the first visitor laid out there carries in what it brings', () => {
    let state = offer(served(RED_SHORT), 9).state
    expect(state.position).toBe('runner')
    expect(state.waiting.at).toBe('colour')
    state = letIn(state).state
    expect(state.visitor!.at).toBe('colour')
    expect(state.kit).not.toContain('runner')
    expect(state.waiting.at).toBe('runner')
    const next = letIn(state)
    expect(next.state.visitor!.at).toBe('runner')
    expect(next.events[next.events.length - 1]).toMatchObject({ type: 'came-in', brought: ['runner'] })
    expect(next.state.kit).toContain('runner')
  })

  it('keeps only the last few that left with a plant', () => {
    let state = served(RED_SHORT)
    for (let n = 0; n < KEPT + 3; n++) state = letIn({ ...state, visitor: visit({ given: [n] }), finished: true }).state
    expect(state.kept.map((one) => one.look)).toEqual([3, 4, 5, 6])
  })

  it('never starts by itself: nothing but this step changes who is on the page', () => {
    let state = offer(served(RED_SHORT), 9).state
    const who = state.visitor!.who, waiting = state.waiting
    state = burst(dab(state, 1, 2).state, 2).state
    state = sow(state, 'pink', 'shelf', 3).state
    expect(state.visitor!.who).toBe(who)
    expect(state.waiting).toEqual(waiting)
    expect(state.finished).toBe(true)
  })
})

describe('the larger sketch', () => {
  it('unrolls and rolls up at the child’s touch where the page holds more traits than the wish', () => {
    const start = served(RED_SHORT, {}, { kit: kitAt('jagged') })
    const open = turnSketch(start)
    expect(open.events).toEqual([{ type: 'sketch', big: true }])
    expect(open.state.visitor!.big).toBe(true)
    expect(turnSketch(open.state).state.visitor!.big).toBe(false)
  })

  it('is not there when the wish already asks about every trait on the page', () => {
    const start = served(RED_SHORT)
    expect(turnSketch(start)).toEqual({ state: start, events: [] })
  })

  it('does not change how the cycle is judged', () => {
    const kit = kitAt('jagged')
    expect(offer(served(RED_SHORT, { big: true }, { kit }), 9).state.position).toBe(offer(served(RED_SHORT, { big: false }, { kit }), 9).state.position)
  })
})

describe('what is shown once', () => {
  it('after the child’s own first brood of more than one colour: a neat way to sort it', () => {
    const state = freshLab(null, SEED)
    const young = dab(state, 1, 2).state.pods[0].seeds
    expect(ideaInBrood(state, PACKETS.pink, PACKETS.pink, young)).toBe('sort')
    expect(ideaInBrood(markShown(state, 'sort'), PACKETS.pink, PACKETS.pink, young)).toBe(null)
    expect(ideaInBrood(state, WHITE_TALL, WHITE_TALL, [WHITE_TALL, WHITE_TALL])).toBe(null)
  })

  it('after the first brood in which a young shows what neither parent shows: the loupe', () => {
    const state = markShown(freshLab(null, SEED), 'sort')
    const short = pack({ colour: [1, 0], height: [0, 0], leaf: [1, 1], petals: [1, 1] })
    expect(ideaInBrood(state, PACKETS.short, PACKETS.short, [PACKETS.short, short])).toBe('hidden')
    expect(ideaInBrood(state, PACKETS.short, PACKETS.short, [PACKETS.short, PACKETS.short])).toBe(null)
    expect(ideaInBrood(markShown(state, 'hidden'), PACKETS.short, PACKETS.short, [short])).toBe(null)
    // The young that tells it is the one the loupe is held over: the first that shows what neither parent shows.
    expect(tellingYoung(PACKETS.short, PACKETS.short, [PACKETS.short, PACKETS.short, short, short])).toBe(2)
    expect(tellingYoung(PACKETS.short, PACKETS.short, [PACKETS.short, PACKETS.short])).toBe(-1)
    // Colour is not hidden in a pink plant: a white young of two pinks tells nothing of a hidden factor.
    expect(tellingYoung(PACKETS.pink, PACKETS.pink, [WHITE_TALL])).toBe(-1)
  })

  it('when a tool is carried in: once for the runner, once for the can', () => {
    const state = freshLab(null, SEED)
    expect(ideaInKit(state, ['runner'])).toBe('runner')
    expect(ideaInKit(state, ['water'])).toBe('water')
    expect(ideaInKit(state, ['jagged'])).toBe(null)
    expect(ideaInKit(markShown(state, 'runner'), ['runner'])).toBe(null)
    expect(markShown(markShown(state, 'runner'), 'runner').shown).toEqual(['runner'])
  })
})

describe('anything a child can do, in any order', () => {
  /** A long seeded walk of steps picked at random, as random tapping would. */
  function walk(steps: number, check: (state: LabState, step: number) => void): LabState {
    const next = draws(SEED, STREAM.visit, 999)
    let state = freshLab(null, SEED)
    const pots = ['shelf', 'tray'] as const
    for (let step = 0; step < steps; step++) {
      const potPlants = state.plants.filter((plant) => plant.row !== 'border')
      const any = () => (state.plants.length ? state.plants[pick(next, state.plants.length)].id : 0)
      const inPot = () => (potPlants.length ? potPlants[pick(next, potPlants.length)].id : 0)
      const row = () => pots[pick(next, 2)]
      const packets = state.kit.filter(isPacketId)
      switch (pick(next, 10)) {
        case 0: case 1: state = dab(state, inPot(), inPot()).state; break
        case 2: case 3: state = state.pods.length ? burst(state, state.pods[pick(next, state.pods.length)].on).state : state; break
        case 4: state = sow(state, packets[pick(next, packets.length)], row(), pick(next, 6)).state; break
        case 5: state = runner(state, inPot(), row(), pick(next, 6)).state; break
        case 6: state = move(state, any(), row(), pick(next, 6)).state; break
        case 7: state = pick(next, 2) ? swapPots(state, { row: row(), slot: pick(next, 6) }, { row: row(), slot: pick(next, 6) }).state : setSoil(state, row(), pick(next, 6), pick(next, 2) === 1).state; break
        case 8: state = pick(next, 3) ? offer(state, any()).state : turnSketch(state).state; break
        default: state = pick(next, 4) === 0 ? letIn(state).state : state
      }
      check(state, step)
    }
    return state
  }

  it('keeps the page whole, bounded and found as left after every step', () => {
    const everKit = new Set<KitId>()
    const end = walk(4000, (state, step) => {
      const where = `step ${step}`
      expect(new Set(state.plants.map((plant) => plant.id)).size, where).toBe(state.plants.length)
      expect(new Set(state.plants.map((plant) => `${plant.row}:${plant.slot}`)).size, where).toBe(state.plants.length)
      for (const plant of state.plants) expect(plant.slot, where).toBeLessThan(ROW_SIZE[plant.row])
      const border = state.plants.filter((plant) => plant.row === 'border').map((plant) => plant.slot).sort((a, b) => a - b)
      expect(border, where).toEqual(border.map((_, slot) => slot))
      expect(border.length, where).toBeLessThanOrEqual(BORDER_PLACES)
      expect(new Set(state.pods.map((pod) => pod.on)).size, where).toBe(state.pods.length)
      // A pod stays on its plant wherever it goes, and never outlives it on the page.
      for (const pod of state.pods) expect(plantById(state, pod.on), where).toBeDefined()
      for (const thing of everKit) expect(state.kit, where).toContain(thing)
      for (const thing of state.kit) everKit.add(thing)
      expect(LADDER, where).toContain(state.position)
      if (state.visitor) expect(state.kit, where).toEqual(expect.arrayContaining(kitAt(state.visitor.at)))
      if (state.finished) expect(state.visitor!.given.length, where).toBe(state.visitor!.count)
      // Found as left: put away at this instant and opened again, it is the same page.
      expect(deserializeLab(JSON.parse(JSON.stringify(serializeLab(state))), null, 1), where).toEqual(state)
    })
    expect(end.podsSet).toBeGreaterThan(300)
    expect(end.visitsLaid).toBeGreaterThan(50)
  }, 30_000)

  it('never puts a factor on the page that no packet there carries', () => {
    walk(1500, (state) => {
      const packets = state.kit.filter(isPacketId).map((id) => PACKETS[id])
      for (const plant of state.plants) for (const trait of TRAITS) for (const factor of pairOf(plant.pairs, trait)) expect(packets.some((packet) => pairOf(packet, trait).includes(factor))).toBe(true)
    })
  }, 30_000)

  it('never leaves the page at a dead end: the first packet is always there to sow', () => {
    walk(1500, (state) => {
      expect(state.kit).toContain('pink')
      expect(sow(state, 'pink', 'tray', 0).events.some((event) => event.type === 'grew')).toBe(true)
    })
  }, 30_000)

  it('lets a visitor like only what it always likes', () => {
    walk(1500, (state) => {
      if (!state.visitor) return
      for (const code of state.visitor.given) expect(code).toBeGreaterThanOrEqual(0)
      expect(Object.keys(LIKES)).toContain(state.visitor.who)
      expect(STEPS[state.visitor.at].visitors).toContain(state.visitor.who)
    })
  }, 30_000)
})
