import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { deserialize, fresh, nextMorning, putOut, serialize, worldOf, type Save } from './save'
import { run, type Event } from './tale'

const day: Event[] = [{ who: 'pig', what: 'jam' }, { who: 'pig', what: 'pillow' }, { who: 'goose', what: 'mud' }]
const lie: Event[] = [day[0], { who: 'granny', what: 'pillow' }, day[2]]
const told = (over: Partial<Save> = {}): Save => ({ ...fresh(null), phase: 'told', day, told: lie, first: lie, ...over })

describe('the save', () => {
  it('starts by age, as a hint, and lets a saved position win', () => {
    expect([null, 4, 5, 6, 9].map((age) => fresh(age).position)).toEqual(['who', 'who', 'who', 'order', 'order'])
    expect(deserialize(serialize(told({ position: 'moon' })), 4).position).toBe('moon')
    expect(deserialize({ ...told(), position: 'nonsense' }, 4).position).toBe('who')
  })
  it('comes back as it was left, at every phase', () => {
    for (const save of [fresh(null), { ...fresh(7), day: day.slice(0, 2) }, told({ phase: 'dusk' }), told(), putOut(told()), nextMorning(putOut(told()))]) {
      expect(deserialize(serialize(save), null)).toEqual(save)
      expect(JSON.stringify(serialize(save)).length).toBeLessThan(4000)
    }
  })
  it('reads whatever it is handed without falling over', () => {
    for (const raw of [null, 1, 'x', [], {}, { v: 99 }, { v: 1, day: 'no', told: [{ who: 'cat', what: 'mud' }], base: 4 }, { v: 1, base: { pig: { coat: 'tar', up: 1 } } }]) {
      const save = deserialize(raw, 4)
      expect(save.phase).toBe('day')
      expect(() => worldOf(save)).not.toThrow()
    }
    // A telling with a hole in it is a day with room in it.
    const broken = deserialize({ ...told(), told: lie.slice(1) }, 4)
    expect([broken.phase, broken.day.length, broken.finished]).toEqual(['day', 0, false])
    expect(deserialize({ ...told(), phase: 'dusk', finished: true }, 4).finished).toBe(false)
  })
})

describe('the lamp', () => {
  it('makes what was told what happened, and the morning begins from it', () => {
    const save = putOut(told())
    expect(worldOf(save)).toEqual(run(save.base, lie))
    const after = nextMorning(save)
    expect(after.base).toEqual(run(save.base, lie))
    expect(after.base.granny.coat).toBe('bare')
    expect(after.base.pig.coat).toBe('jam')
    expect([after.phase, after.day, after.told, after.first, after.finished]).toEqual(['day', [], [], [], false])
  })
  it('moves his next telling one step on for a story she touched, true or not, and never down', () => {
    expect(putOut(told()).position).toBe('who')
    expect(putOut(told({ told: day })).position).toBe('what')
    expect(putOut(told({ told: [{ who: 'moon', what: 'pants' }, ...lie.slice(1)] })).position).toBe('what')
    for (const position of LADDER) {
      const at = LADDER.indexOf(position)
      expect(LADDER.indexOf(putOut(told({ position, told: day })).position)).toBe(Math.min(at + 1, LADDER.length - 1))
      expect(putOut(told({ position })).position).toBe(position)
    }
  })
})
