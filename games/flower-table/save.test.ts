import { describe, expect, it } from 'vitest'
import { VISITORS } from './cast'
import { LADDER } from './config'
import { BOOT, PATH, PATH_HOLDS } from './layout'
import { BED, MIN_STALK, fullOf } from './plants'
import { STATE_VERSION, deserialize, freshBed, serialize, type InVase, type OnPath, type Saved } from './save'

/** What ctx.storage hands back on the next visit. */
const stored = (state: Saved): unknown => JSON.parse(JSON.stringify(serialize(state)))

const top = (stem: number, len: number) => ({ stem, base: fullOf(stem) - len, len, head: true, spent: false })

const left: Saved = {
  v: STATE_VERSION,
  position: LADDER[4],
  finished: false,
  bed: freshBed().map((full, index) => (index === 0 ? full - 150 : index === 2 ? MIN_STALK : full)),
  vase: [{ ...top(0, 150), at: -4 }, { stem: 2, base: 16, len: 60, head: false, spent: false, at: 7 }],
  path: [{ ...top(2, 100), spent: true, x: 300, y: 760, rot: 1.62 }],
  street: [{ who: 'aunt', pieces: [{ ...top(6, 90), at: 3 }] }, { who: 'bride', pieces: [{ ...top(10, 60), spent: true, at: -2 }, { ...top(3, 80), at: 0 }] }],
  shown: ['hand-over'],
}

describe('what the garden saves', () => {
  it('comes back as it was left', () => {
    expect(deserialize(stored(left))).toEqual(left)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a list', [1, 2]],
    ['a word', 'garden'],
    ['a version above this one', { ...left, v: STATE_VERSION + 1 }],
  ])('gives a whole fresh garden for %s', (_, raw) => {
    const fresh = deserialize(raw, null)
    expect(fresh.bed).toEqual(freshBed())
    expect(fresh.vase).toEqual([])
    expect(fresh.path).toEqual([])
    expect(fresh.street).toEqual([])
    expect(fresh.shown).toEqual([])
    expect(fresh.position).toBe(LADDER[0])
  })

  it('opens a first visit on the turn for the age, and a saved turn wins over the age', () => {
    expect(deserialize(null, null).position).toBe('goat-boot')
    expect(deserialize(null, 3).position).toBe('goat-boot')
    expect(deserialize(null, 5).position).toBe('beekeeper-jar')
    expect(deserialize(null, 9).position).toBe('bride-vase')
    expect(deserialize(stored(left), 9).position).toBe(LADDER[4])
  })

  it('repairs each field by itself and keeps the rest', () => {
    const damaged = { ...(stored(left) as Record<string, unknown>), bed: 'gone', position: 7 }
    const read = deserialize(damaged, null)
    expect(read.bed).toEqual(freshBed())
    expect(read.position).toBe(LADDER[0])
    expect(read.vase).toEqual(left.vase)
    expect(read.path).toEqual(left.path)
  })

  it('holds every stem between the shortest stalk and its full height', () => {
    const read = deserialize({ ...(stored(left) as object), bed: [-5, 9999, 'tall', null, 3.14159, Number.NaN] }, null)
    expect(read.bed[0]).toBe(MIN_STALK)
    expect(read.bed[1]).toBe(fullOf(1))
    expect(read.bed[2]).toBe(fullOf(2))
    expect(read.bed[3]).toBe(fullOf(3))
    expect(read.bed[4]).toBe(MIN_STALK)
    expect(read.bed).toHaveLength(BED.length)
    expect(read.bed.every((height, index) => height >= MIN_STALK && height <= fullOf(index))).toBe(true)
  })

  it('leaves out a damaged piece and keeps its neighbours', () => {
    const good: InVase = { ...top(4, 80), at: 2 }
    const vase = [good, null, 'ivy', { ...good, stem: 99 }, { ...good, stem: 1.5 }, { ...good, len: 4 }, { ...good, base: -3 }, { ...good, base: 400 }, { ...good, len: Number.POSITIVE_INFINITY }, { ...good, at: 2 }]
    const read = deserialize({ ...(stored(left) as object), vase }, null)
    expect(read.vase).toEqual([good, good])
  })

  it('gives a flower only to the top of a stem, and lets only a flower be spent', () => {
    const lower = { stem: 2, base: 20, len: 60, head: true, spent: true, at: 0 }
    const read = deserialize({ ...(stored(left) as object), vase: [lower] }, null)
    expect(read.vase).toEqual([{ ...lower, head: false, spent: false }])
  })

  it('holds a piece in the vase to the mouth and a piece on the path to the path', () => {
    const read = deserialize({ ...(stored(left) as object), vase: [{ ...top(0, 90), at: 55 }, { ...top(1, 90), at: 0.5 }], path: [{ ...top(3, 90), x: -400, y: 9000, rot: 44 }, { ...top(3, 90), x: 'left', y: 760, rot: 0 }] }, null)
    expect(read.vase.map((piece) => piece.at)).toEqual([10, 0])
    expect(read.path).toHaveLength(1)
    expect(read.path[0].x).toBe(PATH.left)
    expect(read.path[0].y).toBe(PATH.bottom)
    expect(Math.abs(read.path[0].rot)).toBeLessThanOrEqual(3.15)
  })

  it('keeps the newest pieces when a save holds more than the vase or the path does', () => {
    const many = Array.from({ length: 30 }, (_, index) => ({ ...top(index % BED.length, 40 + index), at: 0, x: 200 + index, y: 760, rot: 1.5 }))
    const read = deserialize({ ...(stored(left) as object), vase: many, path: many }, null)
    expect(read.vase).toHaveLength(BOOT.holds)
    expect(read.path).toHaveLength(PATH_HOLDS)
    expect(read.vase[BOOT.holds - 1].len).toBe(69)
    expect(read.path[PATH_HOLDS - 1].x).toBe(229)
  })

  it('stays far under the size a slot may hold, with the vase, the path and the street full', () => {
    const piece = (index: number): OnPath => ({ stem: index % BED.length, base: 123.4, len: 111.1, head: false, spent: false, x: 1146, y: 786, rot: -1.69 })
    const bunch = Array.from({ length: BOOT.holds }, (_, index) => ({ stem: index, base: 123.4, len: 111.1, head: false, spent: false, at: -10 }))
    const full: Saved = { ...left, vase: bunch, path: Array.from({ length: PATH_HOLDS }, (_, index) => piece(index)), street: VISITORS.map((who) => ({ who, pieces: bunch })) }
    expect(JSON.stringify(serialize(full)).length).toBeLessThan(8192)
  })

  it('writes nothing but its own fields', () => {
    const noisy = { ...left, extra: 'x', vase: [{ ...left.vase[0], px: 4, move: 'fall' }] } as unknown as Saved
    const written = serialize(noisy)
    expect(Object.keys(written).sort()).toEqual(['bed', 'finished', 'path', 'position', 'shown', 'street', 'v', 'vase'])
    expect(Object.keys(written.vase[0]).sort()).toEqual(['at', 'base', 'head', 'len', 'spent', 'stem'])
  })

  it('keeps at most one bouquet in the street for each visitor, and none for the one at the table', () => {
    const one = { ...top(6, 90), at: 3 }
    const street = [{ who: 'aunt', pieces: [one] }, { who: 'aunt', pieces: [one, one] }, { who: 'nobody', pieces: [one] }, { who: 'bride', pieces: [] }, { who: 'bride', pieces: 'roses' }, null, { who: 'goat', pieces: [one] }, { who: 'beekeeper', pieces: [one, { ...one, stem: 99 }] }]
    // `left` is at `goat-jar`, so the goat is at the table and has given its old bouquet up.
    const read = deserialize({ ...(stored(left) as object), street }, null)
    expect(read.street).toEqual([{ who: 'aunt', pieces: [one] }, { who: 'beekeeper', pieces: [one] }])
    // Once it has left with a new one, that bouquet is out there.
    const after = deserialize({ ...(stored(left) as object), street, finished: true }, null)
    expect(after.street.map((bouquet) => bouquet.who)).toEqual(['aunt', 'goat', 'beekeeper'])
  })

  it('reads a finished turn with nothing in the vase, and the showings it knows', () => {
    const read = deserialize({ ...(stored(left) as object), finished: true, shown: ['hand-over', 'hand-over', 'a showing from another build', 7] }, null)
    expect(read.vase).toEqual([])
    expect(read.shown).toEqual(['hand-over'])
    expect(deserialize({ ...(stored(left) as object), shown: 'all' }, null).shown).toEqual([])
  })
})
