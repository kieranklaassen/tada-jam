import { describe, expect, it } from 'vitest'
import { STREAM, draws, pick } from './chance'
import type { Guidance } from './guidance'
import { deserializeLab, freshLab, serializeLab, type LabState, type Plant } from './lab'
import { beadsOf, groupsOf } from './loupe'
import { kitAt, type Visit } from './order'
import { dab, plantAt } from './page'
import { PACKETS, pack, type Pairs } from './plant'
import { BALANCE_DROP, CREEP_SECONDS, RATTLE_BURST, SWELL_SECONDS, TUG_TWANG } from './game'
import { FRAME, rig, stubCast } from './rig'

/** When, with the tests' stand-in cast, a pod offered to the snail bursts and a seed offered to it drops. */
const RATTLE_SECONDS = stubCast().snail.answer.rattle.seconds * RATTLE_BURST, BALANCE_SECONDS = stubCast().snail.answer.balance.seconds * BALANCE_DROP
import { CELL_VOICES, GAME_VOICES, RANGE, TOY_VOICES, VISITOR_VOICES } from './voices'

const SEED = 20261003
const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
const visit = (over: Partial<Visit> = {}): Visit => ({ who: 'snail', at: 'colour', count: 1, big: false, given: [], pods: 0, ...over })
const plant = (id: number, pairs: Pairs, slot: number, row: 'tray' | 'shelf' = 'tray'): Plant => ({ id, pairs, dry: false, row, slot, from: { how: 'packet', packet: 'pink' } })
/** A page late in the order: every packet and tool has arrived and been shown, and a snail is on the page. */
function late(over: Partial<LabState> = {}): LabState {
  const base = freshLab(null, SEED)
  return { ...base, position: 'whole-plant', kit: kitAt('whole-plant'), shown: ['sort', 'hidden', 'runner', 'water'], visitor: visit(), nextId: 20, ...over }
}
const guidance = (glow: number, demo: number | null, demoIndex = 0): Guidance => ({ glow, demo, demoIndex })

describe('the Wet column', () => {
  it('the blotter dries a pot’s soil with a squeak and the can darkens it with a glug', () => {
    const t = rig(late())
    t.drag(t.where.blotter(), t.where.pot('tray', 2))
    expect(t.made.state.dry[8]).toBe(true)
    expect(t.has(GAME_VOICES.blot)).toBe(true)
    t.drag(t.where.can(), t.where.pot('tray', 2))
    expect(t.made.state.dry[8]).toBe(false)
    expect(t.has(CELL_VOICES['soil-wet'])).toBe(true)
    expect(t.has(GAME_VOICES.spill)).toBe(false)
  })

  it('a pot filled twice runs over, and the beetle paddles past', () => {
    const t = rig(late())
    const start = t.made.state
    // The soil is wet as the page opens: one filling goes in with a glug, the second runs over.
    t.drag(t.where.can(), t.where.pot('tray', 2))
    t.play(0.2)
    expect(t.has(CELL_VOICES['soil-wet'])).toBe(true)
    expect(t.has(GAME_VOICES.spill)).toBe(false)
    t.drag(t.where.can(), t.where.pot('tray', 2))
    t.play(0.2)
    expect(t.made.state).toBe(start)
    expect(t.has(GAME_VOICES.spill)).toBe(true)
    let rocked = 0
    t.play(2, () => { rocked = Math.max(rocked, Math.abs(t.made.motion.beetle.pose.lean)) })
    expect(rocked).toBeGreaterThan(0.08)
  })

  it('a plant in bloom sags and shakes itself dry, and keeps its height', () => {
    const t = rig(late())
    const start = t.made.state
    t.drag(t.where.can(), t.where.flower(1))
    expect(t.has(CELL_VOICES['plant-wet'])).toBe(true)
    let drops = 0, swung = 0
    t.play(1.2, () => { drops = Math.max(drops, t.made.motion.motes.filter((mote) => mote.wet).length); swung = Math.max(swung, Math.abs(t.made.motion.plants.get(1)?.bend ?? 0)) })
    expect(drops).toBeGreaterThan(4)
    expect(swung).toBeGreaterThan(0.05)
    expect(t.made.state).toBe(start)
  })

  it('a pod squirts its six, a packet seed walks to a pot, and a runner bud creeps to one by itself', () => {
    const pod = rig(late({ ...dab(late(), 1, 2).state }))
    pod.drag(pod.where.can(), pod.where.pod(2))
    // It swells fat first, well past the breath a pod holds, and then squirts: all six are in the air at once.
    expect(pod.made.state.pods).toHaveLength(1)
    let fattest = 0
    pod.play(SWELL_SECONDS - 0.05, () => { fattest = Math.max(fattest, pod.made.motion.pods[0]?.swell ?? 0) })
    expect(fattest).toBeGreaterThan(1.6)
    expect(pod.has(CELL_VOICES['pod-wet'])).toBe(true)
    pod.play(0.1)
    expect(pod.made.motion.seeds).toHaveLength(6)
    expect(pod.made.state.plants.filter((one) => one.row === 'tray')).toHaveLength(6)

    const seed = rig(late())
    seed.drag(seed.where.can(), seed.where.packet(1))
    expect(seed.has(CELL_VOICES['seed-wet'])).toBe(true)
    expect(plantAt(seed.made.state, 'tray', 0)).toMatchObject({ pairs: PACKETS.short })

    const bud = rig(late())
    bud.drag(bud.where.can(), bud.where.bud('shelf', 0))
    expect(bud.has(CELL_VOICES['bud-wet'])).toBe(true)
    // The nearest free pot to that bud is the third of the shelf: the copy is there at once, and the runner creeps to it before it comes up.
    const copy = plantAt(bud.made.state, 'shelf', 2)!
    expect(copy).toMatchObject({ from: { how: 'runner', of: 1 } })
    let reach = 0
    bud.play(CREEP_SECONDS, () => {
      const tow = bud.made.motion.tow
      expect(tow).not.toBe(null)
      const now = Math.hypot(tow!.to.x - tow!.from.x, tow!.to.y - tow!.from.y)
      expect(now).toBeGreaterThanOrEqual(reach - 1e-6)
      reach = now
      expect(bud.made.fx.inBloom(copy.id)).toBe(false)
    })
    expect(reach).toBeGreaterThan(bud.layout.shelf[0].cell.w)
    bud.play(2)
    expect(bud.made.fx.inBloom(copy.id)).toBe(true)
    expect(bud.made.motion.tow).toBe(null)
  })

  it('the beetle opens its wing cases as an umbrella', () => {
    const t = rig(late())
    t.drag(t.where.can(), t.where.beetle())
    expect(t.has(CELL_VOICES['beetle-wet'])).toBe(true)
    let cases = 0
    t.play(1.5, () => { cases = Math.max(cases, t.made.motion.beetle.cases) })
    expect(cases).toBeGreaterThan(0.9)
  })

  it('shows the tool in the hand, tipped over what it is held above, and lays it back when it is let go', () => {
    const t = rig(late())
    t.drag(t.where.can(), t.where.pot('tray', 2), () => {
      expect(t.made.motion.can).not.toBe(null)
      expect(t.made.motion.can!.tip).toBeGreaterThan(0.5)
    })
    t.made.step(FRAME)
    expect(t.made.motion.can).toBe(null)
    t.drag(t.where.can(), t.where.paper)
    expect(t.has(GAME_VOICES.drip)).toBe(true)
  })

  it('is not there before the can has arrived', () => {
    const t = rig(freshLab(null, SEED))
    const start = t.made.state
    t.drag(t.where.can(), t.where.pot('tray', 2))
    expect(t.made.state).toBe(start)
    expect(t.has(CELL_VOICES['soil-wet'])).toBe(false)
  })
})

describe('the runner bud', () => {
  it('boings a tone higher with each poke', () => {
    const t = rig(late())
    for (let poke = 0; poke < 3; poke++) { t.tap(t.where.bud('shelf', 0)); t.play(0.3) }
    const boings = t.heard.filter((parts) => parts.length === CELL_VOICES['bud-poke'].length && parts[0].wave === CELL_VOICES['bud-poke'][0].wave)
    expect(boings).toHaveLength(3)
    expect(boings[1][0].pitch).toBeGreaterThan(boings[0][0].pitch)
    expect(boings[2][0].pitch).toBeGreaterThan(boings[1][0].pitch)
    expect(t.made.state).toEqual(late())
  })

  it('carried to a pot roots a copy of the one parent, joined to it', () => {
    const t = rig(late())
    // In the hand the runner is a stem drawn out of its bud to the fingertip.
    let drawn = false
    t.drag(t.where.bud('shelf', 0), t.where.pot('tray', 3), () => { drawn = t.made.motion.tow !== null && t.made.motion.seeds.length === 0 })
    expect(drawn).toBe(true)
    expect(plantAt(t.made.state, 'tray', 3)).toMatchObject({ pairs: PACKETS.pink, from: { how: 'runner', of: 1 } })
    expect(t.has(CELL_VOICES['bud-carry'])).toBe(true)
    expect(t.made.changed).toBe(2)
    // The stem stays from the bud to the copy until the copy has grown.
    t.made.step(FRAME)
    expect(t.made.motion.tow).not.toBe(null)
    t.play(3)
    expect(t.made.motion.tow).toBe(null)
  })

  it('dusted curls shut and flicks the dust off: a runner needs none', () => {
    const t = rig(late())
    const start = t.made.state
    t.drag(t.where.flower(2), t.where.bud('shelf', 0))
    expect(t.has(CELL_VOICES['bud-dust'])).toBe(true)
    t.made.step(FRAME)
    expect(t.made.motion.buds.get(1)!.curl).toBeGreaterThan(0.5)
    expect(t.made.state).toBe(start)
    t.play(2)
    expect(t.made.motion.buds.size).toBe(0)
  })

  it('offered to the visitor is tugged like a lead, and the parent plant hops along', () => {
    const t = rig(late())
    const start = t.made.state
    t.drag(t.where.bud('shelf', 0), t.where.visitor())
    // The runner is taut as a lead from its bud to the visitor from the moment it is let go there.
    t.made.step(FRAME)
    const lead = t.made.motion.tow!
    expect(lead.from.x).toBeLessThan(t.layout.shelf[1].x)
    expect(lead.to.x).toBeGreaterThan(t.layout.visitor.x)
    // It twangs part of the way through the visitor's own tug, and the parent plant hops then.
    const twang = stubCast().snail.answer.tug.seconds * TUG_TWANG
    t.play(twang - 0.2)
    let hopped = false
    t.play(0.5, () => { if (t.made.motion.plants.get(1)?.at) hopped = true })
    expect(t.has(CELL_VOICES['bud-offer'])).toBe(true)
    expect(hopped).toBe(true)
    t.play(1)
    expect(t.made.motion.tow).toBe(null)
    expect(t.made.state).toBe(start)
  })

  it('is not there before the runner bud has arrived', () => {
    const t = rig(freshLab(null, SEED))
    t.drag(t.where.bud('shelf', 0), t.where.pot('tray', 3))
    expect(plantAt(t.made.state, 'tray', 3)).toBeUndefined()
  })
})

describe('the loupe', () => {
  it('held over a plant shows the two beads of each of its four traits', () => {
    const carrier = pack({ colour: [1, 0], height: [1, 0], leaf: [0, 0], petals: [1, 1] })
    const t = rig(late({ plants: [...late().plants, plant(9, carrier, 2)] }))
    t.drag(t.where.loupe(), { x: t.where.flower(9).x, y: t.where.flower(9).y + 46 * t.layout.k }, () => {
      expect(t.made.motion.loupe).not.toBe(null)
      expect(t.made.motion.beads!.pairs).toEqual(beadsOf(carrier))
      expect(t.made.motion.beads!.pairs.filter((pair) => pair.hidden).map((pair) => pair.trait)).toEqual(['height'])
    })
    t.made.step(FRAME)
    expect(t.made.motion.loupe).toBe(null)
    expect(t.made.motion.beads).toBe(null)
  })

  it('let go over the tray sorts the plants standing there into groups of a kind, as often as the child likes', () => {
    const state = late({ plants: [...late().plants, plant(9, RED, 0), plant(10, PACKETS.pink, 1), plant(11, RED, 2), plant(12, PACKETS.pink, 3)] })
    const t = rig(state)
    const tray = t.layout.tray[2].cell
    t.drag(t.where.loupe(), { x: tray.x + tray.w / 2, y: tray.y + tray.h / 2 })
    const order = t.made.state.plants.filter((one) => one.row === 'tray').sort((a, b) => a.slot - b.slot).map((one) => one.id)
    expect(order).toEqual(groupsOf(state.plants.filter((one) => one.row === 'tray')).flatMap((group) => group.ids))
    expect(t.has(GAME_VOICES.shuffle)).toBe(true)
    expect(t.made.state.shown).toEqual(state.shown)
    const sorted = t.made.state
    t.drag(t.where.loupe(), { x: tray.x + tray.w / 2, y: tray.y + tray.h / 2 })
    expect(t.made.state).toBe(sorted)
  })

  it('never reads the wish: it shows the same note whoever is on the page', () => {
    const notes = (['snail', 'bee'] as const).map((who) => {
      const t = rig(late({ visitor: visit({ who }) }))
      let note: unknown = null
      t.drag(t.where.loupe(), { x: t.where.flower(1).x, y: t.where.flower(1).y + 46 * t.layout.k }, () => { note = t.made.motion.beads })
      return JSON.stringify(note)
    })
    expect(notes[0]).toBe(notes[1])
  })
})

describe('the beetle in the hand', () => {
  it('set down on a pot digs itself in like a seed, climbs out when nothing grows, and walks home', () => {
    const t = rig(late())
    const start = t.made.state
    t.drag(t.where.beetle(), t.where.pot('tray', 4))
    expect(t.has(CELL_VOICES['beetle-carry'])).toBe(true)
    let sunk = 0
    t.play(3.7, () => { sunk = Math.max(sunk, t.made.motion.beetle.sink) })
    expect(sunk).toBeGreaterThan(0.9)
    t.play(2)
    expect(t.made.motion.beetle.at).toBe(null)
    expect(t.made.state).toBe(start)
  })

  it('brought to the visitor bows stiffly, and the visitor bows back', () => {
    const t = rig(late())
    t.drag(t.where.beetle(), t.where.visitor())
    expect(t.has(CELL_VOICES['beetle-offer'])).toBe(true)
    let bowed = 0
    t.play(1.2, () => { bowed = Math.min(bowed, t.made.motion.beetle.pose.lean) })
    expect(bowed).toBeLessThan(-0.3)
  })

  it('follows the finger with its legs going, and walks home from wherever it is let go', () => {
    const t = rig(late())
    t.drag(t.where.beetle(), t.where.paper, () => expect(t.made.motion.beetle.at).toMatchObject(t.where.paper))
    expect(t.has(TOY_VOICES.back)).toBe(true)
    t.play(2)
    expect(t.made.motion.beetle.at).toBe(null)
  })
})

describe('the rest of the Offer column', () => {
  it('a pod bursts in the visitor’s grip and the brood lands as usual', () => {
    const t = rig(late({ ...dab(late(), 1, 2).state }))
    t.drag(t.where.pod(2), t.where.visitor())
    // It is in the visitor's grip, off its plant, and shaken there before it bursts.
    let shaken = 0
    t.play(RATTLE_SECONDS - 0.05, () => {
      const pod = t.made.motion.pods[0]
      expect(pod.at!.x).toBeGreaterThan(t.layout.visitor.x)
      shaken = Math.max(shaken, Math.abs(pod.shake))
    })
    expect(shaken).toBeGreaterThan(0.05)
    expect(t.made.state.pods).toHaveLength(1)
    expect(t.has(GAME_VOICES.rattle)).toBe(true)
    t.play(0.1)
    expect(t.has(CELL_VOICES['pod-offer'])).toBe(true)
    expect(t.made.state.pods).toHaveLength(0)
    expect(t.made.state.plants.filter((one) => one.row === 'tray')).toHaveLength(6)
  })

  it('a packet seed is balanced and dropped, and sprouts in a pot', () => {
    const t = rig(late())
    t.drag(t.where.packet(0), t.where.visitor())
    // The seed sits on the visitor while it is balanced, and nothing is sown yet.
    t.play(BALANCE_SECONDS - 0.1, () => {
      expect(t.made.motion.seeds).toHaveLength(1)
      expect(t.made.motion.seeds[0].x).toBeGreaterThan(t.layout.visitor.x)
    })
    expect(plantAt(t.made.state, 'tray', 0)).toBe(undefined)
    t.play(0.2)
    expect(t.has(CELL_VOICES['seed-offer'])).toBe(true)
    expect(plantAt(t.made.state, 'tray', 0)).toMatchObject({ pairs: PACKETS.pink })
  })

  it('a pot of bare soil is peered into, the worm waves, and the pot is handed back', () => {
    const t = rig(late())
    const start = t.made.state
    t.drag(t.where.pot('tray', 3), t.where.visitor())
    expect(t.has(CELL_VOICES['soil-offer'])).toBe(true)
    t.play(0.4)
    expect(t.made.motion.worm).toMatchObject({ pot: 9 })
    expect(t.made.state).toBe(start)
  })

  it('the visitor itself, poked, answers in its own voice', () => {
    const t = rig(late())
    t.tap(t.where.visitor())
    expect(t.has(VISITOR_VOICES.snail.poked)).toBe(true)
    expect(t.made.state).toEqual(late())
  })
})

describe('every cell of the grid', () => {
  it('is reached by a touch and answers with its own voice: thirty cells, thirty voices heard', () => {
    const heard = new Set<readonly unknown[]>()
    const run = (state: LabState, touch: (t: ReturnType<typeof rig>) => void) => {
      const t = rig(state)
      touch(t)
      t.play(1.5)
      for (const parts of t.heard) heard.add(parts)
    }
    const podded = late({ ...dab(late(), 1, 2).state })
    const withRed = late({ plants: [...late().plants, plant(9, RED, 0)] })
    // A plant in bloom.
    run(late(), (t) => t.tap(t.where.flower(1)))
    run(late(), (t) => t.drag(t.where.flower(1), t.where.flower(2)))
    run(late(), (t) => t.drag(t.where.can(), t.where.flower(1)))
    run(late(), (t) => t.drag(t.where.pot('shelf', 0), t.where.pot('tray', 2)))
    run(withRed, (t) => t.drag(t.where.pot('tray', 0), t.where.visitor()))
    // A pod.
    run(podded, (t) => t.tap(t.where.pod(2)))
    run(podded, (t) => t.drag(t.where.flower(1), t.where.pod(2)))
    run(podded, (t) => t.drag(t.where.can(), t.where.pod(2)))
    run(podded, (t) => t.drag(t.where.pod(2), t.where.pot('tray', 3)))
    run(podded, (t) => t.drag(t.where.pod(2), t.where.visitor()))
    // A packet seed.
    run(late(), (t) => t.tap(t.where.packet(0)))
    run(late(), (t) => t.drag(t.where.flower(1), t.where.packet(0)))
    run(late(), (t) => t.drag(t.where.can(), t.where.packet(0)))
    run(late(), (t) => t.drag(t.where.packet(0), t.where.pot('tray', 3)))
    run(late(), (t) => t.drag(t.where.packet(0), t.where.visitor()))
    // A runner bud.
    run(late(), (t) => t.tap(t.where.bud('shelf', 0)))
    run(late(), (t) => t.drag(t.where.flower(2), t.where.bud('shelf', 0)))
    run(late(), (t) => t.drag(t.where.can(), t.where.bud('shelf', 0)))
    run(late(), (t) => t.drag(t.where.bud('shelf', 0), t.where.pot('tray', 3)))
    run(late(), (t) => t.drag(t.where.bud('shelf', 0), t.where.visitor()))
    // A pot of bare soil.
    run(late(), (t) => t.tap(t.where.pot('tray', 3)))
    run(late(), (t) => t.drag(t.where.flower(1), t.where.pot('tray', 3)))
    run(late({ dry: late().dry.map((_, pot) => pot === 9) }), (t) => t.drag(t.where.can(), t.where.pot('tray', 3)))
    run(late(), (t) => t.drag(t.where.pot('tray', 3), t.where.pot('tray', 5)))
    run(late(), (t) => t.drag(t.where.pot('tray', 3), t.where.visitor()))
    // The beetle.
    run(late(), (t) => t.tap(t.where.beetle()))
    run(late(), (t) => t.drag(t.where.flower(1), t.where.beetle()))
    run(late(), (t) => t.drag(t.where.can(), t.where.beetle()))
    run(late(), (t) => t.drag(t.where.beetle(), t.where.pot('tray', 3)))
    run(late(), (t) => t.drag(t.where.beetle(), t.where.visitor()))
    const missing = (Object.keys(CELL_VOICES) as (keyof typeof CELL_VOICES)[]).filter((key) => !heard.has(CELL_VOICES[key]))
    expect(missing).toEqual([])
  })
})

describe('the whole idle ladder', () => {
  it('rings the visitor waiting at the edge while nobody is being served, and not while somebody is', () => {
    const free = rig(freshLab(null, SEED))
    free.made.step(FRAME, guidance(1, null, -1))
    // Two flowers, the one who waits, and the loupe at home.
    expect(free.made.motion.glow.rings).toHaveLength(4)
    const busy = rig(late())
    busy.made.step(FRAME, guidance(1, null, -1))
    expect(busy.made.motion.glow.rings).toHaveLength(3)
  })

  it('rings the loupe where it lies, and not while a finger has it', () => {
    const t = rig(late())
    t.made.step(FRAME, guidance(1, null, -1))
    const home = t.where.loupe()
    expect(t.made.motion.glow.rings.filter((ring) => ring.x === home.x && ring.y === home.y)).toHaveLength(1)
    t.drag(home, t.where.flower(1), () => {
      t.made.step(FRAME, guidance(1, null, -1))
      expect(t.made.motion.glow.rings.filter((ring) => ring.x === home.x && ring.y === home.y)).toHaveLength(0)
    })
  })

  it('shows the loupe carried to a flower every second of its other moves, which is within the four showings the ladder gives: the loupe goes with the hand, its note shows over the flower, and the page is as it was', () => {
    for (const [state, index] of [[freshLab(null, SEED), 3], [late(), 2]] as const) {
      const t = rig(state)
      const home = t.where.loupe(), flower = t.where.flower(1)
      t.made.step(FRAME, guidance(1, 0.12, index))
      expect(t.made.motion.hand).toMatchObject({ x: home.x, y: home.y })
      expect(t.made.motion.loupe).toBe(null)
      t.made.step(FRAME, guidance(1, 0.5, index))
      expect(t.made.motion.loupe).not.toBe(null)
      // No ring is left round the place it was lifted from.
      expect(t.made.motion.glow.rings.some((ring) => ring.x === home.x && ring.y === home.y)).toBe(false)
      expect(t.made.motion.beads).toBe(null)
      t.made.step(FRAME, guidance(1, 0.74, index))
      expect(t.made.motion.hand!.x).toBeCloseTo(flower.x)
      expect(t.made.motion.loupe!.y).toBeCloseTo(flower.y)
      expect(t.made.motion.beads).toMatchObject({ x: flower.x, y: flower.y })
      // Let go, the loupe is at home again and its note is gone.
      t.made.step(FRAME, guidance(1, 0.9, index))
      expect(t.made.motion.loupe).toBe(null)
      expect(t.made.motion.beads).toBe(null)
      expect(t.made.state).toEqual(state)
      expect(t.heard).toHaveLength(0)
    }
  })

  it('shows a dab, then a touch on the one who waits, while nobody is being served', () => {
    const t = rig(freshLab(null, SEED))
    t.made.step(FRAME, guidance(1, 0.2, 0))
    expect(t.made.motion.hand).toMatchObject({ x: t.where.flower(1).x })
    t.made.step(FRAME, guidance(1, 0.4, 1))
    const edge = t.where.waitingSpot(t.made.state.waiting.who)
    expect(t.made.motion.hand!.x).toBe(edge.x)
    t.made.step(FRAME, guidance(1, 0.2, 2))
    expect(t.made.motion.hand).toMatchObject({ x: t.where.flower(2).x })
    expect(t.made.state).toEqual(freshLab(null, SEED))
  })

  it('shows a plant carried to the visitor first while one is being served, then a dab: picked by turn, never because it fits', () => {
    const t = rig(late({ plants: [...late().plants, plant(9, RED, 0)] }))
    t.made.step(FRAME, guidance(1, 0.2, 0))
    // The first plant by turn is the first packet plant, which is not what the snail wants.
    expect(t.made.motion.hand!.x).toBe(t.layout.shelf[0].x)
    // The plant goes with the hand, out of its pot and over everything, as it would with a finger.
    t.made.step(FRAME, guidance(1, 0.5, 0))
    const carried = t.made.motion.plants.get(1)!
    expect(carried).toMatchObject({ held: true, at: { x: t.made.motion.hand!.x } })
    expect(carried.at!.x).toBeGreaterThan(t.layout.shelf[0].x + 40)
    expect(carried.at!.y).toBeLessThan(t.made.motion.hand!.y)
    // No ring is left round the place its flower was lifted from.
    const flower = t.where.flower(1)
    expect(t.made.motion.glow.rings.some((ring) => ring.x === flower.x && ring.y === flower.y)).toBe(false)
    t.made.step(FRAME, guidance(1, 0.8, 0))
    expect(t.made.motion.hand!.x).toBeGreaterThan(t.layout.visitor.x)
    // Let go, the plant is in its pot again: it was shown, not moved.
    t.made.step(FRAME, guidance(1, 0.9, 0))
    expect(t.made.motion.plants.has(1)).toBe(false)
    t.made.step(FRAME, guidance(1, 0.2, 1))
    expect(t.made.motion.hand).toMatchObject({ x: t.where.flower(1).x, y: t.where.flower(1).y })
    // The next of its own moves is the loupe's; the one after that is the next plant by turn.
    t.made.step(FRAME, guidance(1, 0.2, 2))
    expect(t.made.motion.hand!.x).toBe(t.where.loupe().x)
    t.made.step(FRAME, guidance(1, 0.2, 4))
    expect(t.made.motion.hand!.x).toBe(t.layout.shelf[1].x)
    expect(t.made.state.plants).toHaveLength(3)
  })
})

describe('the family lines of one plant', () => {
  it('stand out once the child has touched it, until another is touched or it leaves the page', () => {
    const t = rig(late({ plants: [...late().plants, plant(9, RED, 0)] }))
    expect(t.made.view().focus).toBe(null)
    t.tap(t.where.flower(2))
    expect(t.made.view().focus).toBe(2)
    t.tap(t.where.pot('tray', 0))
    expect(t.made.view().focus).toBe(9)
    // Given to the visitor, it is gone, and no plant is in focus.
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    t.play(0.1)
    expect(t.made.view().focus).toBe(null)
    // It is not saved: a page opened again has none.
    expect('focus' in t.made.state).toBe(false)
  })
})

describe('random tapping and dragging, late in the game', () => {
  it('is always answered, never breaks the page, and leaves it found as left at every instant', () => {
    const next = draws(SEED, STREAM.visit, 777)
    const t = rig(late())
    const anywhere = () => ({ x: next() * t.layout.w, y: next() * t.layout.h })
    const spots = [() => t.where.can(), () => t.where.blotter(), () => t.where.loupe(), () => t.where.beetle(), () => t.where.visitor(), () => t.where.wish(), () => t.where.waiting(), () => t.where.packet(pick(next, 4)), () => t.where.corner(), anywhere]
    const onSomething = () => {
      const plants = t.made.state.plants.filter((one) => one.row !== 'border')
      const some = plants[pick(next, Math.max(1, plants.length))]
      const choice = pick(next, 8)
      if (some && choice === 0) return t.where.flower(some.id)
      if (some && choice === 1) return t.where.pod(some.id)
      if (some && choice === 2) return t.where.bud(some.row as 'shelf' | 'tray', some.slot)
      if (choice === 3) return t.where.pot(pick(next, 2) ? 'shelf' : 'tray', pick(next, 6))
      return spots[pick(next, spots.length)]()
    }
    let answered = 0, touches = 0
    for (let round = 0; round < 500; round++) {
      const from = onSomething(), before = t.heard.length + t.made.fx.sounds.length
      if (pick(next, 2)) t.tap(from)
      else t.drag(from, onSomething())
      const inCorner = from.x > t.layout.w - 72 && from.y < 72
      if (!inCorner) { touches++; if (t.heard.length + t.made.fx.sounds.length > before) answered++ }
      t.play(next() * 0.8)
      expect(deserializeLab(JSON.parse(JSON.stringify(serializeLab(t.made.state))), null, 1)).toEqual(t.made.state)
      const live = t.made.motion
      expect(live.motes.length).toBeLessThanOrEqual(150)
      if (live.visitor) expect(Number.isFinite(live.visitor.x) && Number.isFinite(live.visitor.y) && Number.isFinite(live.visitor.turn)).toBe(true)
      if (live.beetle.at) expect(Number.isFinite(live.beetle.at.x) && Number.isFinite(live.beetle.at.y)).toBe(true)
      for (const [, one] of live.plants) expect(Number.isFinite(one.bend) && one.grow >= 0 && one.grow <= 1).toBe(true)
    }
    // A touch on the page while the leaving visitor walks off may be silent; nearly every touch is not.
    expect(answered / touches).toBeGreaterThan(0.97)
    expect(t.made.state.visitsLaid).toBeGreaterThan(5)
    t.play(10)
    for (const parts of t.heard) for (const part of parts) expect(part.peak >= RANGE.peak[0] && part.peak <= RANGE.peak[1] && part.pitch <= RANGE.pitch[1]).toBe(true)
  }, 60_000)
})
