import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { MOST_SNACKS } from './jar'
import { BREAD, CHEESE, CHILLI, EGG, JELLY, radiusOf } from './kinds'
import { JAR, JAR_MID, PLACES } from './layout'
import { MOUTHFULS, deserialize, freshSave, serialize, type Save } from './save'
import { STATE_VERSION } from './state'

const stored = (save: Save): unknown => JSON.parse(JSON.stringify(serialize(save)))

const full: Save = {
  v: STATE_VERSION,
  position: LADDER[1],
  finished: true,
  jar: [{ k: BREAD | CHEESE, x: 500.3, y: 610.5 }, { k: JELLY, x: 640, y: JAR.floor - radiusOf(JELLY) }],
  claw: EGG | CHILLI,
  pick: 3,
  counter: [0, BREAD, 0, CHEESE | EGG | JELLY],
  seat: 2,
  ate: [BREAD, BREAD | CHEESE],
}

describe('the saved game', () => {
  it('round-trips every field', () => {
    expect(deserialize(stored(full))).toEqual(full)
  })

  it('opens a first visit by age: a bread in the jar for the youngest, an empty jar from seven', () => {
    for (const age of [null, 2, 5, 6]) {
      const save = freshSave(age)
      expect(save.position).toBe('bread-in-jar')
      expect(save.jar).toEqual([{ k: BREAD, x: JAR_MID, y: JAR.floor - radiusOf(BREAD) }])
      expect(save.claw).toBe(CHEESE)
      expect(save.pick).toBe(1)
    }
    for (const age of [7, 9, 12]) {
      const save = freshSave(age)
      expect(save.position).toBe('empty-jar')
      expect(save.jar).toEqual([])
      expect(save.claw).toBe(BREAD)
      expect(save.pick).toBe(0)
    }
    expect(freshSave(null).counter).toEqual(PLACES.map(() => 0))
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'jar'],
    ['an array', [1, 2]],
    ['a later version', { ...full, v: STATE_VERSION + 1 }],
  ])('starts fresh from %s', (_, raw) => {
    expect(deserialize(raw, 8)).toEqual(freshSave(8))
  })

  it('lets a saved position win over the age', () => {
    expect(deserialize(stored({ ...freshSave(8), jar: [] }), 3).position).toBe('empty-jar')
  })

  it('repairs each damaged field by itself and keeps the rest', () => {
    const raw = stored(full) as Record<string, unknown>
    expect(deserialize({ ...raw, jar: 'full' })).toEqual({ ...full, jar: [] })
    expect(deserialize({ ...raw, jar: [{ k: 0, x: 1, y: 1 }, null, 7, { k: BREAD, x: 'a', y: 2 }, full.jar[1]] }).jar).toEqual([full.jar[1]])
    expect(deserialize({ ...raw, claw: 63 }).claw).toBe(1 << full.pick)
    expect(deserialize({ ...raw, pick: 9 }).pick).toBe(0)
    expect(deserialize({ ...raw, pick: 1.5 }).pick).toBe(0)
    expect(deserialize({ ...raw, counter: [BREAD, 'x', 99] }).counter).toEqual([BREAD, 0, 0, 0])
    expect(deserialize({ ...raw, counter: null }).counter).toEqual([0, 0, 0, 0])
    expect(deserialize({ ...raw, seat: 3 }).seat).toBe(0)
    expect(deserialize({ ...raw, ate: [BREAD, 0, 'x', CHEESE] }).ate).toEqual([BREAD, CHEESE])
    expect(deserialize({ ...raw, ate: Array.from({ length: 9 }, () => BREAD) }).ate).toHaveLength(MOUTHFULS)
  })

  it('puts a snack that was saved outside the glass back inside it', () => {
    const save = deserialize({ ...(stored(full) as object), jar: [{ k: BREAD, x: -4000, y: 99999 }, { k: BREAD, x: 1e9, y: -1e9 }] })
    for (const s of save.jar) {
      expect(s.x - radiusOf(s.k)).toBeGreaterThanOrEqual(JAR.left)
      expect(s.x + radiusOf(s.k)).toBeLessThanOrEqual(JAR.right)
      expect(s.y + radiusOf(s.k)).toBeLessThanOrEqual(JAR.floor)
    }
  })

  it('says the cycle is over exactly when the monster has eaten', () => {
    const raw = stored(full) as Record<string, unknown>
    expect(deserialize({ ...raw, finished: false }).finished).toBe(true)
    expect(deserialize({ ...raw, finished: true, ate: [] }).finished).toBe(false)
  })

  it('keeps the largest game there is far under the 64 KB cap', () => {
    const largest: Save = {
      ...full,
      jar: Array.from({ length: MOST_SNACKS + 10 }, (_, i) => ({ k: BREAD | CHEESE | CHILLI, x: 444.4 + i, y: 555.5 })),
      ate: Array.from({ length: MOUTHFULS }, () => BREAD | CHEESE | CHILLI),
    }
    const text = JSON.stringify(serialize(largest))
    expect(serialize(largest).jar).toHaveLength(MOST_SNACKS)
    expect(text.length).toBeLessThan(4096)
  })

  it('saves places to one decimal', () => {
    const save = serialize({ ...full, jar: [{ k: BREAD, x: 500.123456, y: 600.987654 }] })
    expect(save.jar[0]).toEqual({ k: BREAD, x: 500.1, y: 601 })
  })
})
