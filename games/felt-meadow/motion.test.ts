import { describe, expect, it } from 'vitest'
import { Director, PERSONALITIES, type Character } from './motion'

const FRAME = 1 / 60
const CHARACTERS = Object.keys(PERSONALITIES) as Character[]

describe('motion personalities', () => {
  it('gives every character several pokes and delights of its own, sharing only the glance', () => {
    const owner = new Map<string, Character>()
    for (const character of CHARACTERS) {
      const { poke, delight } = PERSONALITIES[character]
      expect(poke.length).toBeGreaterThanOrEqual(3)
      expect(delight.length).toBeGreaterThanOrEqual(3)
      for (const { name } of [...poke, ...delight]) {
        if (name === 'glance') continue
        expect(owner.get(name), `${name} is used by ${owner.get(name)} and ${character}`).toBeUndefined()
        owner.set(name, character)
      }
    }
  })

  it('keeps the tempo of each nature: the snail slowest, the mouse quickest', () => {
    const mean = (character: Character) => {
      const { poke, delight, delightEvery } = PERSONALITIES[character]
      const actions = [...poke, ...delight]
      return { length: actions.reduce((sum, a) => sum + a.seconds, 0) / actions.length, gap: (delightEvery[0] + delightEvery[1]) / 2 }
    }
    expect(mean('snail').length).toBeGreaterThan(mean('bee').length)
    expect(mean('bee').length).toBeGreaterThan(mean('mouse').length)
    expect(mean('snail').gap).toBeGreaterThan(mean('bee').gap)
    expect(mean('bee').gap).toBeGreaterThan(mean('mouse').gap)
  })
})

describe('Director', () => {
  it('never plays the same variant twice running, and uses every variant over time', () => {
    for (const character of CHARACTERS) {
      const director = new Director(character, 9)
      const played: string[] = []
      for (let i = 0; i < 40; i++) played.push(director.trigger('poke'))
      for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1])
      expect(new Set(played).size).toBe(PERSONALITIES[character].poke.length)
    }
  })

  it('varies each play a little in size and length', () => {
    const director = new Director('bee', 4)
    const amps = new Set<number>()
    const lengths = new Set<number>()
    for (let i = 0; i < 12; i++) {
      director.trigger('poke')
      expect(director.amp).toBeGreaterThanOrEqual(0.85)
      expect(director.amp).toBeLessThanOrEqual(1.15)
      amps.add(Math.round(director.amp * 100))
      lengths.add(Math.round(director.seconds * 100))
    }
    expect(amps.size).toBeGreaterThan(6)
    expect(lengths.size).toBeGreaterThan(6)
  })

  it('plays a few delights in two calm minutes, none while busy, and lets a real action cut one short', () => {
    for (const character of CHARACTERS) {
      const director = new Director(character, 3)
      let delights = 0
      for (let i = 0; i < 60 * 120; i++) {
        const before = director.kind
        director.step(FRAME, true)
        if (before === null && director.kind === 'delight') delights++
      }
      const [low, high] = PERSONALITIES[character].delightEvery
      expect(delights).toBeGreaterThanOrEqual(Math.floor(120 / (high + 3)))
      expect(delights).toBeLessThanOrEqual(Math.ceil(120 / low))

      const busy = new Director(character, 3)
      for (let i = 0; i < 60 * 120; i++) {
        busy.step(FRAME, false)
        expect(busy.kind).toBeNull()
      }

      for (let i = 0; i < 60 * 60 && director.kind !== 'delight'; i++) director.step(FRAME, true)
      expect(director.delight).not.toBeNull()
      director.interrupt()
      expect(director.delight).toBeNull()
      director.trigger('poke')
      director.interrupt()
      expect(director.poke).not.toBeNull()
    }
  })

  it('drifts apart for two of a kind with different seeds', () => {
    const a = new Director('mouse', 1)
    const b = new Director('mouse', 2)
    const sequence = (d: Director<'mouse'>) => Array.from({ length: 10 }, () => d.trigger('delight')).join()
    expect(sequence(a)).not.toBe(sequence(b))
  })
})
