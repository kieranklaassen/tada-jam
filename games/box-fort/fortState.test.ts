import { describe, expect, it } from 'vitest'
import { cut, poke } from './face'
import { loadFort } from './fort'
import { FIRED, ON_HEAP, ON_RUG, ON_SOFA, deserializeFort, firstBoxes, freshFort, serializeFort, type FortState } from './fortState'
import { BOX_COUNT, kindOf } from './layout'
import { holeAt } from './rest'
import { STATE_VERSION } from './state'
import { builtFort, stored } from './testing'

const standing = (state: FortState): number[] => state.boxes.filter((box) => box.on === ON_RUG).map((box) => box.id)

function cutFort(): FortState {
  const state = freshFort(null), face = state.boxes[0].face
  cut(face, [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 70, y: 70 }, { x: 30, y: 70 }])
  poke(state.boxes[3].face, { x: 40, y: 30 })
  state.cat = { at: 'look', box: 0, cell: 50 * face.cols + 50 }
  return state
}

describe('a first visit', () => {
  it('stands the big box and a small one for a child of 5 or younger and for no age, and the big box alone from 6', () => {
    for (const age of [null, 2, 4, 5]) expect(standing(freshFort(age))).toEqual([0, 3])
    for (const age of [6, 8, 12]) expect(standing(freshFort(age))).toEqual([0])
  })

  it('has every box in the room at every age, uncut, and everything else as furniture', () => {
    for (const age of [null, 4, 8]) {
      const boxes = firstBoxes(age)
      expect(boxes.map((box) => box.id)).toEqual([0, 1, 2, 3, 4])
      for (const box of boxes) {
        expect([ON_RUG, ON_HEAP]).toContain(box.on)
        expect(box.face.gone.every((cell) => cell === 0)).toBe(true)
      }
      const { boxes: _boxes, childAge: _age, ...rest } = freshFort(age) as FortState & { childAge?: unknown }
      const { boxes: _b, childAge: _a, ...young } = freshFort(null) as FortState & { childAge?: unknown }
      expect(rest).toEqual(young)
    }
  })

  it('uses the age for nothing but that: a saved fort wins over it, and no saved field holds it', () => {
    const left = stored(builtFort())
    for (const age of [null, 4, 6, 12]) expect(serializeFort(loadFort(left, age))).toEqual(left)
    // A child who has grown past 6 since the last visit finds the small box where it stood.
    expect(standing(loadFort(stored(freshFort(4)), 9))).toEqual([0, 3])
    expect(JSON.stringify(left)).not.toMatch(/age/i)
  })
})

describe('the saved fort', () => {
  it('is found as it was left: every cut cell and where the cat is', () => {
    const state = cutFort(), back = loadFort(stored(state), 8)
    expect(back.cat).toEqual(state.cat)
    for (let id = 0; id < BOX_COUNT; id++) expect([...back.boxes[id].face.gone]).toEqual([...state.boxes[id].face.gone])
    expect(back.finished).toBe(false)
    expect(back.position).toBe('room')
  })

  it('holds every field the sheet lists, and gives each back as it was saved', () => {
    const state = builtFort()
    Object.assign(state, { dark: true, baby: 0, toys: [3, -1, 3], gran: { at: 'in', box: 0 }, cat: { at: 'stuck', box: 1, cell: holeAt(state, 1, 30 * kindOf(1).cols + 50)!.cell } })
    const saved = stored(state) as Record<string, unknown>
    expect(Object.keys(saved).sort()).toEqual(['baby', 'blanket', 'boxes', 'cat', 'cushionAt', 'cushions', 'dark', 'finished', 'gran', 'lights', 'line', 'lump', 'position', 'tangled', 'tapes', 'toys', 'v'])
    expect(Object.keys((saved.boxes as Record<string, unknown>[])[0]).sort()).toEqual(['holes', 'id', 'on', 'side', 'x'])
    expect(saved.v).toBe(STATE_VERSION)
    expect(stored(loadFort(saved))).toEqual(saved)
    // And a second time round nothing drifts.
    expect(stored(loadFort(stored(loadFort(saved))))).toEqual(saved)
  })

  it.each([undefined, null, 'fort', 7, [1], { v: STATE_VERSION + 1 }])('gives a first visit for %j', (raw) => {
    expect(serializeFort(loadFort(raw, null))).toEqual(serializeFort(freshFort(null)))
    expect(serializeFort(deserializeFort(raw, 7))).toEqual(serializeFort(freshFort(7)))
  })

  it('repairs one damaged field and keeps the rest', () => {
    const good = stored(cutFort()) as { boxes: Record<string, unknown>[] } & Record<string, unknown>
    // A face that cannot be read is whole board, and the cat cannot look out of a hole that is not there: it sits on the rug.
    const noFace = loadFort({ ...good, boxes: good.boxes.map((box) => (box.id === 0 ? { ...box, holes: 'nonsense' } : box)) })
    expect(noFace.boxes[0].face.gone.some((cell) => cell === 1)).toBe(false)
    expect(noFace.boxes[3].face.gone.some((cell) => cell === 1)).toBe(true)
    expect(noFace.cat.at).toBe('rug')
    // A cat with no place is on top, and the cuts stay.
    const noCat = loadFort({ ...good, cat: { at: 'look', box: 9, cell: -1 } })
    expect(noCat.cat).toEqual({ at: 'top', box: 0, cell: 0 })
    expect(noCat.boxes[0].face.gone.some((cell) => cell === 1)).toBe(true)
    expect(loadFort({ ...good, boxes: 'gone' }).boxes).toHaveLength(BOX_COUNT)
    expect(loadFort({ ...good, finished: true }).finished).toBe(false)
    for (const [field, bad] of [['tapes', 3], ['blanket', 'x'], ['cushions', null], ['lights', {}], ['toys', 'yes'], ['gran', 4], ['baby', 'in'], ['dark', 'on'], ['tangled', 1]] as const) {
      const back = loadFort({ ...good, [field]: bad })
      expect(back.boxes[0].face.gone.some((cell) => cell === 1), field).toBe(true)
      expect(back.cat, field).toEqual({ at: 'look', box: 0, cell: back.cat.cell })
    }
  })

  it('settles the fields against each other, so that any record gives a fort that could have been built', () => {
    const good = stored(builtFort()) as { boxes: Record<string, unknown>[] } & Record<string, unknown>
    // The big box on the heap: what stood on it comes down to the rug, and what was taped to it and lay in it comes free.
    const fallen = loadFort({ ...good, boxes: good.boxes.map((box) => (box.id === 0 ? { ...box, on: ON_HEAP } : box)) })
    expect(fallen.boxes[1].on).toBe(ON_RUG)
    expect(fallen.tapes).toEqual([])
    expect(fallen.cushions).toEqual([ON_SOFA, ON_SOFA, ON_SOFA])
    const ring = loadFort({ ...good, boxes: good.boxes.map((box) => (box.id === 0 ? { ...box, on: 4 } : box)) })
    for (const box of ring.boxes) expect(box.on).not.toBe(box.id)
    expect(stored(loadFort(stored(ring)))).toEqual(stored(ring))
    expect(loadFort({ ...good, cushions: [1, 1, 1] }).cushions).toEqual([1, 1, FIRED])
    expect(loadFort({ ...good, gran: { at: 'skirt', box: 0 } }).gran.at).toBe('chair')
    expect(loadFort({ ...good, baby: 4 }).baby).toBe(ON_RUG)
    expect(loadFort({ ...good, lights: [9, 9, 8, 4], tangled: true })).toMatchObject({ lights: [9, 8], tangled: false })
    // Every box in one place: each finds its own, or goes to the heap.
    const crowd = loadFort({ ...good, boxes: good.boxes.map((box) => ({ ...box, on: ON_RUG, x: 0 })) })
    const up = crowd.boxes.filter((box) => box.on === ON_RUG).map((box) => ({ left: box.x / 100 - kindOf(box.id).w / 2, right: box.x / 100 + kindOf(box.id).w / 2 }))
    for (const a of up) for (const b of up) if (a !== b) expect(a.right <= b.left + 1e-6 || b.right <= a.left + 1e-6).toBe(true)
  })

  it('keeps a largest state, every face cut to nothing and every list full, under 16 KB', () => {
    const state = freshFort(null)
    for (const box of state.boxes) {
      box.on = ON_RUG
      const kind = kindOf(box.id)
      cut(box.face, [{ x: 0, y: 0 }, { x: kind.cols, y: 0 }, { x: kind.cols, y: kind.rows }, { x: 0, y: kind.rows }])
    }
    Object.assign(state, { tapes: Array.from({ length: 8 }, () => [3, 4]), blanket: [3, 4], cushions: [4, 4, 4], lights: Array.from({ length: 12 }, () => 9), toys: [4, 4, 4] })
    expect(JSON.stringify(serializeFort(state)).length).toBeLessThan(16 * 1024)
  })
})
