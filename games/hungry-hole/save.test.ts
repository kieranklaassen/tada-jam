import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import type { Kind } from './kinds'
import { makeRng } from './rng'
import { deserialize, freshSaved, serialize, type Saved } from './save'
import { HOLE_START, STOCK, STREET, layStreet } from './street'

const everything = (saved: Saved): Kind[] => [...saved.belly, ...saved.breath, ...saved.street.flatMap((standing) => standing.parts)].sort()
const stock = (id: string): Kind[] => [...STOCK[id]].sort()
const wire = (saved: Saved): unknown => JSON.parse(JSON.stringify(serialize(saved)))

function played(): Saved {
  const fresh = freshSaved(6, 9)
  const [first, second, ...rest] = fresh.street
  return { ...fresh, hole: { x: 2.5, z: -1 }, belly: [first.parts[0]], breath: [second.parts[0]], street: [...rest.slice(2), { parts: [rest[0].parts[0], rest[1].parts[0]], x: 1, z: 1 }] }
}

describe('a first visit', () => {
  it('starts on a street as full as the age suggests, with both ends open and no age the emptiest', () => {
    expect(freshSaved(null, 1).position).toBe('few')
    for (const age of [2, 4, 5]) expect(freshSaved(age, 1).position).toBe('few')
    for (const age of [6, 8, 12]) expect(freshSaved(age, 1).position).toBe('some')
  })

  it('lays the street from the seed, with the hole empty where it starts', () => {
    const fresh = freshSaved(null, 4)
    expect(fresh).toMatchObject({ v: 1, finished: false, seed: 4, hole: HOLE_START, belly: [], breath: [] })
    expect(fresh.street).toEqual(layStreet('few', 4))
    expect(freshSaved(null, 4)).toEqual(fresh)
  })
})

describe('a saved street', () => {
  it('comes back exactly as it was written, whatever the age and the seed of this visit', () => {
    const saved = played()
    expect(deserialize(wire(saved), 4, 777)).toEqual(saved)
    expect(deserialize(wire(saved), null, 1)).toEqual(saved)
  })

  it('is small', () => {
    const fullest: Saved = { ...freshSaved(null, 3), position: 'many', street: layStreet('many', 3) }
    expect(JSON.stringify(serialize(fullest)).length).toBeLessThan(2000)
  })

  it('keeps the position it holds over the child\'s age', () => {
    const saved: Saved = { ...freshSaved(4, 2), position: 'many', street: layStreet('many', 2) }
    expect(deserialize(wire(saved), 4, 2).position).toBe('many')
  })
})

describe('a slot that cannot be trusted', () => {
  it('gives a fresh street for anything that is not this game\'s record', () => {
    for (const raw of [undefined, null, 0, 'street', [], {}, { v: 2 }, { v: 0, position: 'few' }, { position: 'few' }]) {
      const saved = deserialize(raw, null, 5)
      expect(saved).toEqual(freshSaved(null, 5))
    }
  })

  it('repairs each field by itself and keeps the rest', () => {
    const saved = played()
    const broken = { ...(wire(saved) as Record<string, unknown>), hole: 'nowhere', seed: -3, position: 'elsewhere' }
    const read = deserialize(broken, 6, 12)
    expect(read.hole).toEqual(HOLE_START)
    expect(read.seed).toBe(12)
    expect(read.position).toBe('some')
    expect(read.belly).toEqual(saved.belly)
    expect(everything(read)).toEqual(stock('some'))
  })

  it('keeps the hole on the street', () => {
    const read = deserialize({ ...(wire(played()) as object), hole: { x: 1e9, z: -1e9 } }, null, 1)
    expect(read.hole).toEqual({ x: STREET.x1, z: STREET.z0 })
  })

  it('stands a thing that went missing on the street again, and drops one that was doubled', () => {
    const saved = played()
    const lost = { ...(wire(saved) as Record<string, unknown>), belly: [], breath: ['nothing', 7, null] }
    expect(everything(deserialize(lost, null, 1))).toEqual(stock('some'))
    const doubled = { ...(wire(saved) as Record<string, unknown>), belly: ['drummer', 'drummer', 'drummer', 'pie'], breath: ['drummer'] }
    const read = deserialize(doubled, null, 1)
    expect(everything(read)).toEqual(stock('some'))
    expect(read.belly).toEqual(['drummer', 'pie'])
    expect(read.breath).toEqual([])
  })

  it('drops what is not a thing standing somewhere', () => {
    const raw = { ...(wire(freshSaved(null, 1)) as Record<string, unknown>), street: [null, 4, { parts: 'pie', x: 0, z: 0 }, { parts: ['pie'], x: 'left', z: 0 }, { parts: [], x: 0, z: 0 }, { parts: ['pie'], x: 0.5, z: 0.5 }] }
    const read = deserialize(raw, null, 1)
    expect(read.street[0]).toEqual({ parts: ['pie'], x: 0.5, z: 0.5 })
    expect(everything(read)).toEqual(stock('few'))
  })

  it('holds the street\'s own set whatever is thrown at it, and never throws', () => {
    const rng = makeRng(3)
    const junk = (): unknown => {
      const dice = rng.next()
      const kinds = ['pie', 'hat', 'dog', 'balloon', 'tuba', 'drummer', 'cake', 5, null]
      const some = (): unknown[] => Array.from({ length: Math.floor(rng.next() * 9) }, () => kinds[Math.floor(rng.next() * kinds.length)])
      if (dice < 0.2) return some()
      if (dice < 0.3) return rng.next() * 100 - 50
      if (dice < 0.4) return 'x'
      return Array.from({ length: Math.floor(rng.next() * 9) }, () => ({ parts: some(), x: rng.next() * 40 - 20, z: rng.next() < 0.1 ? NaN : rng.next() * 20 - 10 }))
    }
    for (let i = 0; i < 300; i++) {
      const position = rng.next() < 0.8 ? LADDER[Math.floor(rng.next() * LADDER.length)] : 'nonsense'
      const raw = { v: 1, position, finished: false, seed: junk(), hole: junk(), belly: junk(), breath: junk(), street: junk() }
      const read = deserialize(raw, null, 8)
      expect(everything(read), `try ${i}`).toEqual(stock(read.position))
      expect(JSON.parse(JSON.stringify(read))).toEqual(read)
    }
  })

  it('after a float has gone out, holds a bare street and nothing more', () => {
    const raw = { ...(wire(played()) as Record<string, unknown>), finished: true }
    const read = deserialize(raw, null, 1)
    expect(read.finished).toBe(true)
    expect(everything(read)).toEqual([])
  })
})
