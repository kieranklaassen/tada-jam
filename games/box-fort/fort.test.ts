import { describe, expect, it } from 'vitest'
import { isGone } from './face'
import { TAB_OUT, dropBox, dropGroup, free, group, highest, loadFort, loaded, lowest, lumpAt, pull, rectOf, rects, seams, tapeEnd, tipOut, toHeap, topOf, wear, wornBox } from './fort'
import { FIRED, HELD, ON_HEAP, ON_RUG, ON_SOFA, freshFort } from './fortState'
import { MAX_TOP, RUG, kindOf } from './layout'
import { builtFort, hole, stored } from './testing'

describe('a box that is let go', () => {
  it('stands on the rug where it was let go, and flush against a box it was let go close beside', () => {
    const state = freshFort(8)
    expect(dropBox(state, 3, 1.31)).toEqual({ how: 'stand', on: ON_RUG })
    // The big box's right edge is at 0.75: let go a hand's width off, the small box stands against it, which is a seam.
    expect(state.boxes[3].x).toBe(130)
    expect(seams(state).map((seam) => [seam.a, seam.b, seam.flat])).toEqual([[0, 3, false]])
  })

  it('stands squarely on the box below, and never past its edges', () => {
    const state = freshFort(8)
    expect(dropBox(state, 1, 0.6)).toEqual({ how: 'stand', on: 0 })
    const rect = rectOf(state, 1)!, below = rectOf(state, 0)!
    expect(rect.foot).toBe(below.h)
    expect(rect.x + rect.w / 2).toBeLessThanOrEqual(below.x + below.w / 2 + 1e-9)
    expect(loaded(state, 0)).toBe(true)
    expect(highest(state)!.id).toBe(1)
  })

  it('tips over the edge and lies on its side as a tunnel when it is let go half off, on a box too small, or too high', () => {
    // Half off the big box.
    const half = freshFort(8)
    expect(dropBox(half, 3, 0.95).how).toBe('tip')
    expect(half.boxes[3]).toMatchObject({ on: ON_RUG, side: true })
    const lying = rectOf(half, 3)!
    expect([lying.w, lying.h]).toEqual([kindOf(3).h, kindOf(3).d])
    expect(lying.x - lying.w / 2).toBeCloseTo(0.75, 6)
    // A middling box on a small one.
    const small = freshFort(null)
    small.boxes[0].on = ON_HEAP
    expect(dropBox(small, 1, 1.34).how).toBe('tip')
    expect(small.boxes[1].side).toBe(true)
    // A third storey would stand above the frame.
    const high = builtFort()
    expect(topOf(highest(high)!)).toBeLessThanOrEqual(MAX_TOP)
    expect(dropBox(high, 2, -0.35).how).not.toBe('stand')
    for (const rect of rects(high)) expect(topOf(rect)).toBeLessThanOrEqual(MAX_TOP + 1e-9)
  })

  it('goes back where it was, with nothing changed, when there is no room anywhere', () => {
    const state = builtFort(), before = JSON.stringify(state.boxes.map((box) => [box.x, box.on, box.side]))
    // The rug is full from end to end, and the second middling box fits on nothing that stands.
    expect(dropBox(state, 2, 1.3).how).toBe('back')
    expect(JSON.stringify(state.boxes.map((box) => [box.x, box.on, box.side]))).toBe(before)
  })

  it('keeps every box on the rug between its ends, whatever is let go where', () => {
    const state = freshFort(null)
    for (const [id, x] of [[1, -9], [2, 9], [4, 0.2], [3, -3], [1, 1.2], [4, -0.4], [2, 0.1]] as const) {
      dropBox(state, id, x)
      for (const rect of rects(state)) {
        expect(rect.x - rect.w / 2).toBeGreaterThanOrEqual(RUG.left - 1e-9)
        expect(rect.x + rect.w / 2).toBeLessThanOrEqual(RUG.right + 1e-9)
      }
      const feet = rects(state).filter((rect) => rect.on === ON_RUG)
      for (const a of feet) for (const b of feet) if (a.id < b.id) expect(Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)).toBeLessThanOrEqual(1e-6)
    }
  })
})

describe('tape', () => {
  it('makes two boxes move as one, with everything that rests on either', () => {
    const state = builtFort()
    expect(group(state, 0).sort()).toEqual([0, 1, 3, 4])
    state.tapes = []
    expect(group(state, 0).sort()).toEqual([0, 1])
    expect(group(state, 4)).toEqual([4])
    state.tapes = [[0, 3]]
    state.boxes[1].on = ON_HEAP; state.boxes[4].on = ON_HEAP
    state.boxes[0].x = -30; state.boxes[3].x = 135
    expect(dropGroup(state, [0, 3], -0.2)).toEqual({ how: 'stand', on: ON_RUG })
    expect(state.boxes[3].x - state.boxes[0].x).toBe(165)
    expect(dropGroup(state, [0, 3], 5).how).toBe('stand')
    expect(rectOf(state, 3)!.x + 0.55).toBeLessThanOrEqual(RUG.right + 1e-9)
  })

  it('hangs its loose end out past the right side of the fort, clear of every face, and only while something is taped', () => {
    const state = builtFort(), end = tapeEnd(state)!
    // Reading 1, ruling 5: its spot (0.15 to either side) lies over no face, so a touch on a face is never a pull of the tape.
    const right = Math.max(...rects(state).map((rect) => rect.x + rect.w / 2))
    expect(end.x - 0.15).toBeGreaterThan(right)
    expect(end.x).toBeCloseTo(right + TAB_OUT, 5)
    expect(end.y).toBeLessThan(0.8)
    state.tapes = []
    expect(tapeEnd(state)).toBeNull()
  })
})

describe('taking apart', () => {
  it('takes one strip and the highest box with each pull, and tips out what is in and on that box', () => {
    const state = builtFort()
    Object.assign(state, { cat: { at: 'top', box: 0, cell: 0 }, cushions: [1, 0, ON_SOFA], toys: [1, HELD, HELD] })
    expect(pull(state)).toBe(1)
    expect(state.boxes[1]).toMatchObject({ on: ON_HEAP, side: false })
    // Fresh board: the hole that was cut in it is gone.
    expect(isGone(state.boxes[1].face, 50, 40)).toBe(false)
    expect(state.tapes).toEqual([[0, 3]])
    expect(state.cushions).toEqual([ON_SOFA, 0, ON_SOFA])
    expect(state.toys).toEqual([HELD, HELD, HELD])
    // The roof has lost a wall: it slides off the box that is left, and with the rug full it is back on the sofa.
    expect(state.blanket).toEqual([])
    expect(state.lights).toEqual([8, 9])
    // The cat was on it: it is on the rug.
    expect(state.cat.at).toBe('rug')
    // The next pull takes the last strip and the next highest box; after that the tape end is gone and nothing is pulled.
    const next = highest(state)!.id
    expect(pull(state)).toBe(next)
    expect(state.tapes).toEqual([])
    expect(pull(state)).toBeNull()
  })

  it('folds one box flat when it is dragged back to the heap, and puts out whoever was in it', () => {
    const state = builtFort()
    state.boxes[1].on = ON_HEAP; state.boxes[4].on = ON_HEAP
    Object.assign(state, { tapes: [[0, 3]], blanket: [], lights: [], baby: 3, gran: { at: 'in', box: 0 }, cat: { at: 'in', box: 3, cell: 0 } })
    expect(tipOut({ ...state, cat: { ...state.cat }, gran: { ...state.gran } }, [3])).toEqual({ cat: true, baby: true, gran: false })
    toHeap(state, 3)
    expect(state).toMatchObject({ baby: ON_RUG, cat: { at: 'rug' }, gran: { at: 'in', box: 0 }, tapes: [] })
    toHeap(state, 0)
    expect(state).toMatchObject({ gran: { at: 'chair' }, cushions: [ON_SOFA, ON_SOFA, ON_SOFA] })
    expect(rects(state)).toEqual([])
    expect(highest(state)).toBeNull()
    expect(lowest(state, 0)).toBeNull()
  })
})

describe('the blanket and the cushions', () => {
  it('heaps the blanket on the rug beside the one box it slid off, and takes it back to the sofa when it has no room', () => {
    const state = freshFort(8)
    state.blanket = [0]
    const lump = lumpAt(state)!
    expect(lump).toBeGreaterThan(0.75)
    // Nothing stands where the blanket lies heaped.
    expect(free(state, [], 1.1, lump)).not.toBeCloseTo(lump, 2)
    expect(lumpAt(builtFort())).toBeNull()
  })

  it('names where each cushion can be: in a box, on the sofa, or on the rug in front of it', () => {
    expect([ON_SOFA, FIRED]).toEqual([-1, -2])
    const state = builtFort()
    hole(state, 4, 30, 20, 60, 50)
    expect(state.cushions.filter((where) => where === 0)).toHaveLength(2)
  })
})

describe('the box the grandmother wears', () => {
  const worn = () => {
    const state = freshFort(null)
    state.boxes[3].x = 130
    state.tapes = [[0, 3]]
    state.blanket = [0, 3]
    state.cushions = [3, 3, ON_SOFA]
    state.toys = [3, HELD, HELD]
    state.baby = 3
    state.cat = { at: 'in', box: 3, cell: 0 }
    return state
  }

  it('is hers alone from when she comes up in it: its roof, its cushions, its toys and its tape come free, and whoever was in it is out', () => {
    const state = worn()
    expect(wear(state, 3)).toMatchObject({ cat: true, baby: true })
    expect(wornBox(state)).toBe(3)
    expect([state.tapes, state.cushions, state.toys, state.baby, state.cat.at]).toEqual([[], [ON_SOFA, ON_SOFA, ON_SOFA], [HELD, HELD, HELD], ON_RUG, 'rug'])
    expect(state.blanket).not.toContain(3)
    // It hangs round her middle, off the rug, and what the save holds is what a load finds.
    expect(rectOf(state, 3)!.foot).toBeGreaterThan(0.5)
    expect(stored(loadFort(stored(state)))).toEqual(stored(state))
  })

  it('is no seat for the cat, no box for the baby, no seam for the tape and nothing a box can stand on', () => {
    const state = freshFort(null)
    state.boxes[3].x = 130
    wear(state, 3)
    expect(highest(state)!.id).toBe(0)
    expect(lowest(state, 1.3)!.id).toBe(0)
    expect(seams(state)).toEqual([])
    state.tapes = [[0, 3]]
    expect(tapeEnd(state)!.x).toBeLessThan(1)
    // Another small box let go on it never rests on her: with no room on the rug beside her, it goes onto the big box.
    state.tapes = []
    expect(dropBox(state, 4, 1.3)).toEqual({ how: 'stand', on: 0 })
    expect(state.boxes[4].on).toBe(0)
  })

  it('is cleared by a load too, whatever the record holds', () => {
    const state = worn()
    state.gran = { at: 'skirt', box: 3 }
    const loaded = loadFort(stored(state))
    expect(loaded.gran).toEqual({ at: 'skirt', box: 3 })
    expect([loaded.tapes, loaded.cushions, loaded.toys, loaded.baby, loaded.cat.at, loaded.blanket.includes(3)]).toEqual([[], [ON_SOFA, ON_SOFA, ON_SOFA], [HELD, HELD, HELD], ON_RUG, 'rug', false])
  })
})
