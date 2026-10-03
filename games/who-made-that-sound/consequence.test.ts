import { describe, expect, it } from 'vitest'
import { type Clutch } from './layout'
import { FORMS } from './places'
import { reactionOf } from './tastes'
import { KINDS, type Kind } from './voices'
import { type Happening, type World, act, freshWorld } from './world'

// The error as a consequence (ART.md, "The error as a consequence"), held for
// every pair of kinds: a wrong attempt lets the one inside out to meet the
// asker, both are heard, each reacts by its taste, the state stays, nothing
// is lost, and nothing that happens is a verdict.

const pairs = KINDS.flatMap((a) => KINDS.filter((b) => b !== a).map((b) => [a, b] as [Kind, Kind]))

/** A row of the asker's own, the other one and a third, with the asker at the stone and every hide heard. */
function asked(asker: Kind, other: Kind): World {
  const third = KINDS.find((kind) => kind !== asker && kind !== other)!
  const cycle: Clutch = { form: 'seek', place: 'three-eggs', kinds: [asker, other, third], slots: ['heard', 'heard', 'heard'], queue: [other, third], asker, wrong: 0 }
  return { ...freshWorld(null), position: 'three-eggs', finished: false, shown: [...FORMS], next: null, cycle }
}

describe('a wrong attempt', () => {
  it('lets the one inside out to meet the asker, and each reacts to the other by its taste', () => {
    for (const [asker, other] of pairs) {
      const { happened } = act(asked(asker, other), { type: 'slot', slot: 1 })
      expect(happened.map((one) => one.type)).toEqual(['meets', 'settles'])
      const meets = happened[0] as Extract<Happening, { type: 'meets' }>
      expect(meets.meeting).toEqual({ asker, other, askerDoes: reactionOf(asker, other), otherDoes: reactionOf(other, asker), match: false })
      expect(meets.slot).toBe(1)
    }
  })

  it('leaves the state as it was but for the one hide: the asker still asks and the other hides are untouched', () => {
    for (const [asker, other] of pairs) {
      const before = asked(asker, other)
      const { world } = act(before, { type: 'slot', slot: 1 })
      expect(world.cycle!.asker).toBe(asker)
      expect(world.cycle!.slots).toEqual(['heard', 'done', 'heard'])
      expect(world.cycle!.queue).toEqual(before.cycle!.queue)
      expect(world.position).toBe(before.position)
      expect(world.finished).toBe(false)
    }
  })

  it('loses nothing: the one let out stands on the hill, still calls, and its own finds it there', () => {
    for (const [asker, other] of pairs) {
      let { world } = act(asked(asker, other), { type: 'slot', slot: 1 })
      expect(world.hill).toEqual([{ kind: other, as: 'single' }])
      expect(act(world, { type: 'resident', resident: 0 }).happened).toEqual([{ type: 'calls', resident: 0, kind: other, as: 'single' }])
      // The child changes one thing, which hide to try, and the right one is still there to be found.
      ;({ world } = act(world, { type: 'slot', slot: 0 }))
      expect(world.hill.map((resident) => resident.as)).toEqual(['single', 'family'])
      const step = act(world, { type: 'edge' })
      expect(step.happened.map((one) => one.type)).toEqual(['asks', 'settles', 'finds'])
      expect(step.world.hill[0]).toEqual({ kind: other, as: 'family' })
    }
  })

  it('is counted where nobody sees it, and never more than three', () => {
    const { world } = act(asked('pip', 'hoom'), { type: 'slot', slot: 1 })
    expect(world.cycle!.wrong).toBe(1)
    expect(act(world, { type: 'slot', slot: 2 }).world.cycle!.wrong).toBe(2)
  })
})

describe('nothing gives a verdict', () => {
  it('has no happening that rates the child: a right attempt and a wrong one are the same kind of meeting', () => {
    const right = act(asked('pip', 'hoom'), { type: 'slot', slot: 0 }).happened
    const wrong = act(asked('pip', 'hoom'), { type: 'slot', slot: 1 }).happened
    expect(right.map((one) => one.type)).toEqual(wrong.map((one) => one.type))
    // What differs is inside the fiction: who met whom and how each took it.
    for (const one of [...right, ...wrong]) expect(Object.keys(one).join(' ')).not.toMatch(/score|correct|wrong|right|star|point|praise|verdict|outcome/)
  })

  it('tells the view nothing about the place or how the cycle went, even when the cycle ends', () => {
    let world = asked('pip', 'hoom')
    const happened: Happening[] = []
    for (const action of [{ type: 'slot', slot: 0 }, { type: 'slot', slot: 1 }, { type: 'slot', slot: 1 }, { type: 'slot', slot: 2 }, { type: 'slot', slot: 2 }] as const) {
      const step = act(world, action)
      world = step.world
      happened.push(...step.happened)
    }
    expect(world.finished).toBe(true)
    expect(happened[happened.length - 1].type).toBe('ends')
    expect(JSON.stringify(happened)).not.toMatch(/well|mixed|badly|position|three-eggs|two-eggs|near-voice/)
  })
})
