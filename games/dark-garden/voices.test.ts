import { describe, expect, it } from 'vitest'
import { KINDS } from './cast'
import { CRY, HOMES, JOKES, MURMUR, notesOf, ring, SETS, SNEEZE, STEP } from './voices'

describe('the voices', () => {
  const lists = [...Object.values(CRY), ...Object.values(HOMES), ...Object.values(JOKES), ...Object.values(MURMUR), ...Object.values(SETS), ...Object.values(SNEEZE), ...Object.values(STEP), ...KINDS.map((k) => ring(k, 440, 1)), notesOf([{ cue: 'open', place: 2 }]), notesOf([{ cue: 'flutter' }, { cue: 'stand' }, { cue: 'knock' }])]
  it('stay where a small speaker and a small ear can have them', () => {
    for (const list of lists) for (const n of list) {
      expect(n.frequency).toBeGreaterThanOrEqual(55)
      expect(n.frequency).toBeLessThan(6000)
      expect(n.peak).toBeGreaterThan(0)
      expect(n.peak).toBeLessThanOrEqual(0.3)
      expect((n.delay ?? 0) + n.attack + n.decay).toBeLessThan(2.4)
    }
  })
  it('are all different: each carrier, each joke, each kind of place', () => {
    for (const set of [CRY, HOMES, SETS, SNEEZE, STEP, JOKES, MURMUR]) expect(new Set(Object.values(set).map((l) => JSON.stringify(l))).size).toBe(Object.keys(set).length)
    expect(new Set(KINDS.map((k) => JSON.stringify(ring(k, 440, 1)))).size).toBe(KINDS.length)
  })
})
