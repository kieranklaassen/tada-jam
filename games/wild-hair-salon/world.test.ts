import { describe, expect, it } from 'vitest'
import { ACTIONS, GRID, OBJECTS, type ActionId, type ObjectId } from './grid'
import { MAX_CLIPPINGS, MAX_LEN, MIN_LEN, TAIL_LEN, TUFTS } from './rules'
import { act, seatFriend, withClipping, withRibbon, type Deed, type Salon, type Target } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1,
  lock: 70, model: 44, seat: 'beside', cape: 'on',
  mane: Array(TUFTS).fill(50), ribbon: { len: 60, at: 'peg' },
  clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 40 }], shown: { snip: true, pull: true, ribbon: true },
  ...over,
})

const target = (object: ObjectId): Target =>
  object === 'tuft' ? { object, index: 3 } : object === 'clipping' ? { object, index: 0 } : object === 'face' ? { object, who: 'chair' } : { object }
const deed = (action: ActionId): Deed =>
  action === 'pull' ? { action, to: 90, drop: { on: 'chair' } } : action === 'snip' ? { action, at: 12 } : { action }

describe('a touch on the salon', () => {
  it('answers every cell of the grid with that cell, and leaves the salon it was given as it was', () => {
    for (const object of OBJECTS) for (const action of ACTIONS) {
      const before = salon(), copy = JSON.stringify(before)
      const done = act(before, target(object), deed(action))
      expect(done.cell, `${object}/${action}`).toBe(GRID[object][action])
      expect(JSON.stringify(before)).toBe(copy)
    }
  })

  it('changes what the cell says it changes, and nothing else', () => {
    const lengths = (s: Salon) => JSON.stringify([s.lock, s.model, s.mane, s.ribbon?.len])
    for (const object of OBJECTS) for (const action of ACTIONS) {
      const before = salon(), done = act(before, target(object), deed(action)), changes = GRID[object][action].changes
      const same = lengths(done.salon) === lengths(before)
      expect(same, `${object}/${action}`).toBe(changes !== 'longer' && changes !== 'shorter')
      if (changes === 'nothing') expect(done.salon).toEqual(before)
      if (changes === 'ribbon-hung') expect(done.salon.ribbon?.at).not.toBe(undefined)
      expect(done.salon.model).toBe(before.model)
    }
  })

  it('pulls a lock longer and never shorter, up to the floor', () => {
    expect(act(salon(), { object: 'lock' }, { action: 'pull', to: 88 }).salon.lock).toBe(88)
    expect(act(salon(), { object: 'lock' }, { action: 'pull', to: 30 }).salon.lock).toBe(70)
    expect(act(salon(), { object: 'lock' }, { action: 'pull', to: 5000 }).salon.lock).toBe(MAX_LEN)
    expect(act(salon(), { object: 'lock' }, { action: 'pull', to: Number.NaN }).salon.lock).toBe(70)
  })

  it('snips a lock where it was crossed, drops the piece and keeps a stub at the least', () => {
    const done = act(salon({ clippings: [] }), { object: 'lock' }, { action: 'snip', at: 44 })
    expect(done.salon.lock).toBe(44)
    expect(done.salon.clippings).toEqual([{ len: 26, hue: 'lion', on: 'floor', x: expect.any(Number) }])
    expect(act(salon(), { object: 'lock' }, { action: 'snip', at: -20 }).salon.lock).toBe(MIN_LEN)
  })

  it('cuts nothing when the scissors pass below the free end', () => {
    for (const at of [70, 71, 500, Number.NaN]) {
      const before = salon(), done = act(before, { object: 'lock' }, { action: 'snip', at })
      expect(done.cell).toBeNull()
      expect(done.salon).toBe(before)
    }
  })

  it('lets a pull undo a snip and a snip undo a pull, so no length is ever lost', () => {
    let s = salon()
    s = act(s, { object: 'lock' }, { action: 'snip', at: 10 }).salon
    s = act(s, { object: 'lock' }, { action: 'pull', to: 70 }).salon
    expect(s.lock).toBe(70)
    s = act(s, { object: 'lock' }, { action: 'pull', to: 95 }).salon
    s = act(s, { object: 'lock' }, { action: 'snip', at: 70 }).salon
    expect(s.lock).toBe(70)
  })

  it('never moves the model: pulled it springs back, snipped it grows back and only a piece is left', () => {
    const pulled = act(salon(), { object: 'model' }, { action: 'pull', to: 99 })
    expect(pulled.salon.model).toBe(44)
    expect(pulled.sprangBack).toBe(true)
    const snipped = act(salon({ clippings: [] }), { object: 'model' }, { action: 'snip', at: 10 })
    expect(snipped.salon.model).toBe(44)
    expect(snipped.sprangBack).toBe(true)
    expect(snipped.salon.clippings).toEqual([{ len: 34, hue: 'poodle', on: 'floor', x: expect.any(Number) }])
  })

  it('keeps hair that is not under the cape as it is: with the cape off the lock and the mane spring back', () => {
    const off = salon({ cape: 'off' })
    for (const [t, d] of [[{ object: 'lock' }, { action: 'pull', to: 99 }], [{ object: 'lock' }, { action: 'snip', at: 10 }], [{ object: 'tuft', index: 2 }, { action: 'pull', to: 99 }], [{ object: 'tuft', index: 2 }, { action: 'snip', at: 10 }]] as [Target, Deed][]) {
      const done = act(off, t, d)
      expect(done.sprangBack).toBe(true)
      expect(done.cell).not.toBeNull()
      expect([done.salon.lock, done.salon.mane]).toEqual([off.lock, off.mane])
    }
  })

  it('pulls and snips one tuft of the mane and leaves the others', () => {
    const pulled = act(salon(), { object: 'tuft', index: 4 }, { action: 'pull', to: 91 }).salon
    expect(pulled.mane).toEqual([50, 50, 50, 50, 91, 50, 50, 50, 50])
    const snipped = act(salon({ clippings: [] }), { object: 'tuft', index: 0 }, { action: 'snip', at: 9 }).salon
    expect(snipped.mane[0]).toBe(9)
    expect(snipped.clippings).toEqual([])
    expect(act(salon(), { object: 'tuft', index: 40 }, { action: 'poke' }).cell).toBeNull()
  })

  it('makes the ribbon any length, and an offcut for the floor', () => {
    expect(act(salon(), { object: 'ribbon' }, { action: 'pull', to: 85 }).salon.ribbon).toEqual({ len: 85, at: 'peg' })
    const cut = act(salon({ clippings: [] }), { object: 'ribbon' }, { action: 'snip', at: 44 }).salon
    expect(cut.ribbon).toEqual({ len: 44, at: 'peg' })
    expect(cut.clippings).toEqual([{ len: 16, hue: 'ribbon', on: 'floor', x: expect.any(Number) }])
  })

  it('hangs the ribbon beside whatever it is brought to, and keeps its length as it goes', () => {
    const places: [Target, string][] = [[{ object: 'lock' }, 'lock'], [{ object: 'model' }, 'model'], [{ object: 'tuft', index: 1 }, 'mane'], [{ object: 'clipping', index: 0 }, 'floor'], [{ object: 'face', who: 'chair' }, 'face-chair'], [{ object: 'face', who: 'friend' }, 'face-friend'], [{ object: 'ribbon' }, 'peg']]
    for (const [t, at] of places) expect(act(salon({ ribbon: { len: 37, at: 'lock' } }), t, { action: 'ribbon' }).salon.ribbon).toEqual({ len: 37, at })
  })

  it('carries a length from the model to the lock on the ribbon', () => {
    let s = salon({ seat: 'across', lock: 70, model: 44, ribbon: { len: 80, at: 'peg' } })
    s = act(s, { object: 'model' }, { action: 'ribbon' }).salon
    s = act(s, { object: 'ribbon' }, { action: 'snip', at: s.model }).salon
    s = act(s, { object: 'lock' }, { action: 'ribbon' }).salon
    s = act(s, { object: 'lock' }, { action: 'snip', at: s.ribbon!.len }).salon
    expect(s.lock).toBe(s.model)
  })

  it('answers nothing about a ribbon that has not been shown yet', () => {
    const bare = salon({ ribbon: null })
    for (const action of ACTIONS) expect(act(bare, { object: 'ribbon' }, deed(action)).cell).toBeNull()
    for (const object of ['lock', 'model', 'tuft', 'clipping', 'face'] as const) {
      const done = act(bare, target(object), { action: 'ribbon' })
      expect(done.cell).toBeNull()
      expect(done.salon).toBe(bare)
    }
  })

  it('moves, splits, hops and tidies a clipping', () => {
    const face = act(salon(), { object: 'clipping', index: 0 }, { action: 'pull', drop: { on: 'friend' } }).salon
    expect(face.clippings[0].on).toBe('friend')
    const floor = act(face, { object: 'clipping', index: 0 }, { action: 'pull', drop: { on: 'floor', x: 250 } }).salon
    expect(floor.clippings[0]).toMatchObject({ on: 'floor', x: 100 })
    const halves = act(salon(), { object: 'clipping', index: 0 }, { action: 'snip', at: 0 }).salon.clippings
    expect(halves.map((c) => c.len)).toEqual([10, 10])
    expect(halves[0].x).toBeLessThan(halves[1].x)
    const tiny = salon({ clippings: [{ len: 5, hue: 'lion', on: 'floor', x: 40 }] })
    expect(act(tiny, { object: 'clipping', index: 0 }, { action: 'snip', at: 0 }).salon.clippings).toEqual([])
    expect(act(face, { object: 'clipping', index: 0 }, { action: 'poke' }).salon.clippings[0]).toMatchObject({ on: 'floor', x: 46 })
    expect(act(salon(), { object: 'clipping', index: 0 }, { action: 'ruffle' }).salon.clippings).toEqual([])
    expect(act(salon(), { object: 'clipping', index: 9 }, { action: 'poke' }).cell).toBeNull()
  })

  it('keeps at most twelve clippings, lets the oldest on the floor go first and never takes one off a face', () => {
    let s = salon({ clippings: [{ len: 9, hue: 'lion', on: 'chair', x: 0 }] })
    for (let i = 0; i < 30; i++) s = withClipping(s, { len: 10 + i, hue: 'poodle', on: 'floor', x: 50 })
    expect(s.clippings).toHaveLength(MAX_CLIPPINGS)
    expect(s.clippings[0]).toMatchObject({ on: 'chair', len: 9 })
    expect(s.clippings[MAX_CLIPPINGS - 1].len).toBe(39)
    let faces = salon({ clippings: [] })
    for (let i = 0; i < 20; i++) faces = withClipping(faces, { len: 5 + i, hue: 'lion', on: 'chair', x: 0 })
    expect(faces.clippings).toHaveLength(MAX_CLIPPINGS)
  })

  it('tells which length rings, for the voices that follow a length', () => {
    expect(act(salon(), { object: 'lock' }, { action: 'poke' }).rings).toBe(70)
    expect(act(salon(), { object: 'lock' }, { action: 'pull', to: 90 }).rings).toBe(90)
    expect(act(salon(), { object: 'model' }, { action: 'poke' }).rings).toBe(44)
    expect(act(salon(), { object: 'face', who: 'friend' }, { action: 'poke' }).rings).toBeNull()
  })

  it('seats the friend where the child sends it and brings the ribbon in once', () => {
    const across = seatFriend(salon(), 'across')
    expect(across.seat).toBe('across')
    expect(seatFriend(across, 'across')).toBe(across)
    expect(seatFriend(across, 'beside').seat).toBe('beside')
    const first = withRibbon(salon({ ribbon: null }))
    expect(first.ribbon).toEqual({ len: TAIL_LEN, at: 'peg' })
    const kept = salon({ ribbon: { len: 12, at: 'mane' } })
    expect(withRibbon(kept)).toBe(kept)
  })
})
