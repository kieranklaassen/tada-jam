import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { KINDS, type Kind } from './kinds'
import { deserializeSave, freshSave, type Save, type Shown } from './save'
import { markShown, showingAtStart, showingAtStepIn, type Idea } from './showings'
import { STATE_VERSION } from './state'
import type { Bunch, Count } from './world'

const NOTHING: Shown = { give: false, each: false, bunch: false }
const SINGLES: Bunch[] = [{ colour: 'frog', count: 1 }, { colour: 'duck', count: 1 }, { colour: 'frog', count: 1 }, { colour: 'duck', count: 1 }]
const BUNCHES: Bunch[] = [{ colour: 'frog', count: 1 }, { colour: 'frog', count: 2 }, { colour: 'frog', count: 3 }]

/** A save with a troop of frogs of this size under this sky, a hippo waiting, and these marks. */
function world(size: Count, sky: Bunch[], shown: Partial<Shown> = {}, next: Kind = 'hippo'): Save {
  return { ...freshSave(null), troop: { kind: 'frog', size, held: Array(size).fill(false) }, sky, next: { kind: next, size: 1 }, shown: { ...NOTHING, ...shown } }
}

/** Every way the three marks can stand. */
const EVERY_SHOWN: Shown[] = [false, true].flatMap((give) => [false, true].flatMap((each) => [false, true].map((bunch) => ({ give, each, bunch }))))

describe('the first showing of an idea', () => {
  it('shows giving in a new game: one friend of another kind', () => {
    const save = freshSave(null)
    expect(save.troop.size).toBe(1)
    const showing = showingAtStart(save)
    expect(showing).toMatchObject({ idea: 'give', size: 1, marks: ['give'] })
    expect(showing!.kind).not.toBe(save.troop.kind)
    expect(showing!.kind).not.toBe(save.next.kind)
  })

  it('shows one for each with the first troop of two or more: a pair, and giving is marked with it', () => {
    for (const size of [2, 3] as const) {
      expect(showingAtStepIn(world(size, SINGLES, { give: true }))).toEqual({ idea: 'each', kind: 'duck', size: 2, marks: ['each', 'give'] })
      // A child who starts here has not been shown giving: the pair shows both.
      expect(showingAtStart(world(size, SINGLES))).toEqual({ idea: 'each', kind: 'duck', size: 2, marks: ['each', 'give'] })
    }
  })

  it('shows the bunch with the first sky that holds two or more in one knot: a troop as large as the one on screen and never one alone, and both earlier ideas are marked', () => {
    for (const size of [1, 2, 3] as const) {
      // One balloon is no bunch, so beside a friend alone the troop that passes is a pair.
      const passing = size === 1 ? 2 : size
      expect(showingAtStepIn(world(size, BUNCHES, { give: true, each: true }))).toEqual({ idea: 'bunch', kind: 'duck', size: passing, marks: ['bunch', 'each', 'give'] })
      expect(showingAtStepIn(world(size, BUNCHES, { give: true }))).toEqual({ idea: 'bunch', kind: 'duck', size: passing, marks: ['bunch', 'each', 'give'] })
      expect(showingAtStart(world(size, BUNCHES))).toEqual({ idea: 'bunch', kind: 'duck', size: passing, marks: ['bunch', 'each', 'give'] })
    }
    // One bunch of two among singles is enough.
    expect(showingAtStepIn(world(1, [...SINGLES, { colour: 'crab', count: 2 }], { give: true }))?.idea).toBe('bunch')
  })

  it('shows nothing when the idea on screen has been shown', () => {
    expect(showingAtStepIn(world(1, SINGLES, { give: true }))).toBeNull()
    expect(showingAtStart(world(1, SINGLES, { give: true }))).toBeNull()
    expect(showingAtStepIn(world(3, SINGLES, { give: true, each: true }))).toBeNull()
    expect(showingAtStepIn(world(3, BUNCHES, { give: true, each: true, bunch: true }))).toBeNull()
    // One friend alone under singles brings no new idea, whatever is still to come.
    expect(showingAtStepIn(world(1, SINGLES, { give: true, each: false, bunch: false }))).toBeNull()
  })

  it('shows the idea that is on screen, not one whose troop or sky has not come yet', () => {
    expect(showingAtStepIn(world(1, SINGLES))?.idea).toBe('give')
    expect(showingAtStepIn(world(2, SINGLES, { give: true, bunch: true }))?.idea).toBe('each')
    expect(showingAtStepIn(world(1, BUNCHES, { bunch: true }))?.idea).toBe('give')
  })

  it('sends a kind that is neither on screen nor waiting: the first such kind', () => {
    for (const onScreen of KINDS) {
      for (const waiting of KINDS.filter((kind) => kind !== onScreen)) {
        for (const sky of [SINGLES, BUNCHES]) {
          for (const size of [1, 2, 3] as const) {
            const save: Save = { ...world(size, sky.map((bunch) => ({ ...bunch, colour: onScreen })), {}, waiting), troop: { kind: onScreen, size, held: Array(size).fill(false) } }
            const showing = showingAtStepIn(save)
            expect(showing!.kind).toBe(KINDS.find((kind) => kind !== onScreen && kind !== waiting))
          }
        }
      }
    }
  })

  it('never sends the kind on screen, even where the waiting troop is of that kind too', () => {
    for (const onScreen of KINDS) {
      const save: Save = { ...world(1, SINGLES, {}, onScreen), troop: { kind: onScreen, size: 1, held: [false] } }
      expect(showingAtStart(save)!.kind).not.toBe(onScreen)
    }
  })

  it('is never due twice: once its marks are set, the same world shows nothing', () => {
    for (const shown of EVERY_SHOWN) {
      for (const size of [1, 2, 3] as const) {
        for (const sky of [SINGLES, BUNCHES]) {
          const save = world(size, sky, shown)
          for (const ask of [showingAtStart, showingAtStepIn]) {
            const showing = ask(save)
            if (showing === null) continue
            expect(showing.marks).toContain(showing.idea)
            const after: Save = { ...save, shown: markShown(save.shown, showing.marks) }
            expect(showingAtStart(after)).toBeNull()
            expect(showingAtStepIn(after)).toBeNull()
          }
        }
      }
    }
  })

  it('has one idea to show when a game opens at any position, and none on the next visit', () => {
    for (const position of LADDER) {
      const save = deserializeSave({ v: STATE_VERSION, position, finished: false })
      const showing = showingAtStart(save)
      expect(showing, position).not.toBeNull()
      expect(showing!.kind).not.toBe(save.troop.kind)
      expect(showingAtStart({ ...save, shown: markShown(save.shown, showing!.marks) })).toBeNull()
    }
  })
})

describe('the marks', () => {
  it('are set and never taken back', () => {
    expect(markShown(NOTHING, ['give'])).toEqual({ give: true, each: false, bunch: false })
    expect(markShown(NOTHING, ['each', 'give'])).toEqual({ give: true, each: true, bunch: false })
    expect(markShown(NOTHING, ['bunch', 'each', 'give'])).toEqual({ give: true, each: true, bunch: true })
    expect(markShown(NOTHING, [])).toEqual(NOTHING)
    const marks: Idea[] = ['each']
    for (const shown of EVERY_SHOWN) {
      const after = markShown(shown, marks)
      expect(after).toEqual({ ...shown, each: true })
      expect(after).not.toBe(shown)
    }
  })
})
