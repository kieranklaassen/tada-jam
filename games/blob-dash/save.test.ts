import { describe, expect, it } from 'vitest'
import { PLACES } from './beat'
import { FIRST_TEMPO, TEMPO } from './config'
import { SLOTS } from './layout'
import { deserialize, firstTempo, serialize, type Save } from './save'
import { STATE_VERSION } from './state'
import { Toy } from './toy'

/** What ctx.storage hands back on the next visit. */
const stored = (save: Save): unknown => JSON.parse(JSON.stringify(serialize(save)))

describe('what Blob Dash saves', () => {
  it('round-trips the loop as built: the tempo, the springs and the pieces', () => {
    const save: Save = { v: STATE_VERSION, position: 'loop', finished: false, tempo: 132, springs: [0, 5, 31, 40], pieces: [{ kind: 'drum', beat: 0, ceiling: false }, { kind: 'wall', beat: 15, ceiling: false }, { kind: 'flip', beat: 4, ceiling: true }] }
    expect(deserialize(stored(save), 9)).toEqual(save)
  })

  it('saves what the loop holds, and gives it back to the next visit', () => {
    const toy = new Toy({ tempo: 96, springs: [], pieces: [{ kind: 'chime', beat: 8, ceiling: true }] }, 1)
    for (const at of [60, 150, 260]) {
      for (let frame = 0; frame < at; frame++) toy.step(1 / 60)
      toy.wallTap({ x: 330, y: 70 })
    }
    const save = deserialize(stored({ ...deserialize(null, null), ...toy.toSave() }), 12)
    expect(save.tempo).toBe(96)
    expect(save.springs).toEqual([...toy.springs].sort((a, b) => a - b))
    expect(save.springs).toHaveLength(3)
    expect(save.pieces).toEqual([{ kind: 'chime', beat: 8, ceiling: true }])
    // And a loop made from the save holds the same again.
    expect(new Toy(save, 2).toSave()).toEqual(toy.toSave())
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'loop'],
    ['a list', [1, 2, 3]],
    ['a version above the current one', { v: STATE_VERSION + 1, position: 'loop', tempo: 150, springs: [1] }],
    ['no version', { position: 'loop', tempo: 150, springs: [1] }],
  ])('opens a first visit for %s: an empty ring at the starting tempo', (_, raw) => {
    expect(deserialize(raw, null)).toEqual({ v: STATE_VERSION, position: 'loop', finished: false, tempo: FIRST_TEMPO[0].tempo, springs: [], pieces: [] })
  })

  it('repairs each field by itself and keeps the rest', () => {
    expect(deserialize({ v: STATE_VERSION, position: 'loop', tempo: 'fast', springs: [3, 4] }, 9)).toMatchObject({ tempo: firstTempo(9), springs: [3, 4] })
    expect(deserialize({ v: STATE_VERSION, position: 'loop', tempo: 140, springs: 'all' }, null)).toMatchObject({ tempo: 140, springs: [] })
    expect(deserialize({ v: STATE_VERSION, position: 7, tempo: 140, springs: [3] }, null)).toMatchObject({ position: 'loop', tempo: 140, springs: [3] })
  })

  it('keeps the tempo a whole number between the ends of the dial', () => {
    const read = (tempo: unknown): number => deserialize({ v: STATE_VERSION, tempo }, null).tempo
    expect(read(20)).toBe(TEMPO.slowest)
    expect(read(999)).toBe(TEMPO.fastest)
    expect(read(101.6)).toBe(102)
    expect(read(Number.NaN)).toBe(FIRST_TEMPO[0].tempo)
    expect(read(Number.POSITIVE_INFINITY)).toBe(FIRST_TEMPO[0].tempo)
  })

  it('keeps only springs on places there are, each once, in order', () => {
    const read = (springs: unknown): number[] => deserialize({ v: STATE_VERSION, springs }, null).springs
    expect(read([9, 3, 3, -1, 64, 63, 2.5, '4', null, 0])).toEqual([0, 3, 9, 63])
  })

  it('keeps only pieces there are, on places a piece can stand, one to a place', () => {
    const read = (pieces: unknown) => deserialize({ v: STATE_VERSION, pieces }, null).pieces
    expect(read('all')).toEqual([])
    expect(read([{ kind: 'wall', beat: 3, ceiling: false }, { kind: 'gong', beat: 4, ceiling: false }, { kind: 'drum', beat: 16, ceiling: false }, { kind: 'drum', beat: 2.5, ceiling: false }, { kind: 'drum', beat: 5 }, null, 7, 'drum', { kind: 'flip', beat: 3, ceiling: true }, { kind: 'flip', beat: 4, ceiling: true }, { kind: 'chime', beat: 3, ceiling: false }])).toEqual([{ kind: 'chime', beat: 3, ceiling: false }, { kind: 'flip', beat: 4, ceiling: true }])
    // A damaged list of pieces costs the pieces and nothing else.
    expect(deserialize({ v: STATE_VERSION, position: 'loop', tempo: 140, springs: [3], pieces: { kind: 'wall' } }, null)).toMatchObject({ tempo: 140, springs: [3], pieces: [] })
  })

  it('never opens on a finished cycle, since open play has none', () => {
    expect(deserialize({ v: STATE_VERSION, position: 'loop', finished: true, tempo: 90, springs: [], pieces: [] }, null).finished).toBe(false)
    expect(serialize({ v: STATE_VERSION, position: 'loop', finished: true, tempo: 90, springs: [], pieces: [] }).finished).toBe(false)
  })

  it('keeps a largest legal state far under half of the 64 KB cap', () => {
    const springs = Array.from({ length: PLACES * 2 }, (_, place) => place)
    const pieces = SLOTS.map((slot) => ({ kind: 'splitter' as const, beat: slot % 16, ceiling: slot >= 16 }))
    const largest = serialize({ v: STATE_VERSION, position: 'loop', finished: false, tempo: TEMPO.fastest, springs, pieces })
    expect(largest.springs).toHaveLength(64)
    expect(largest.pieces).toHaveLength(24)
    expect(JSON.stringify(largest).length).toBeLessThan(4 * 1024)
    expect(4 * 1024).toBeLessThan((64 * 1024) / 2)
  })

  it('sets the age aside once there is a save: the same record reads the same for every age', () => {
    const raw = { v: STATE_VERSION, position: 'loop', tempo: 77, springs: [2], pieces: [{ kind: 'wall', beat: 3, ceiling: false }] }
    const read = [null, 2, 8, 10, 12, 40].map((age) => JSON.stringify(deserialize(raw, age)))
    expect(new Set(read).size).toBe(1)
  })
})

describe('the tempo of a first visit', () => {
  it('is set by age as a default: the first row for a younger child or no age, the last row from its age up', () => {
    const first = FIRST_TEMPO[0], last = FIRST_TEMPO[FIRST_TEMPO.length - 1]
    expect(firstTempo(null)).toBe(first.tempo)
    expect(firstTempo(2)).toBe(first.tempo)
    expect(firstTempo(first.fromAge)).toBe(first.tempo)
    expect(firstTempo(last.fromAge)).toBe(last.tempo)
    expect(firstTempo(40)).toBe(last.tempo)
    expect([7, 8, 9, 10, 11, 12].map(firstTempo)).toEqual([90, 90, 100, 100, 110, 110])
  })

  it('has rows that ascend by age, each within the ends of the dial', () => {
    const ages = FIRST_TEMPO.map((row) => row.fromAge)
    expect(ages).toEqual([...new Set(ages)].sort((a, b) => a - b))
    for (const row of FIRST_TEMPO) {
      expect(row.tempo).toBeGreaterThanOrEqual(TEMPO.slowest)
      expect(row.tempo).toBeLessThanOrEqual(TEMPO.fastest)
    }
  })

  it('gives way to a saved tempo, whatever the age', () => {
    expect(deserialize({ v: STATE_VERSION, position: 'loop', tempo: 64, springs: [] }, 12).tempo).toBe(64)
    expect(deserialize({ v: STATE_VERSION, position: 'loop', tempo: 158, springs: [] }, 8).tempo).toBe(158)
  })
})
