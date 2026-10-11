import { describe, expect, it } from 'vitest'
import { PLACES } from './bear'
import { FIRST_MUD } from './config'
import { CELLS, share, soap } from './fur'
import { WEARERS, deserialize, firstMud, freshSave, nextMud, nextStream, serialize } from './save'
import { STATE_VERSION } from './state'

/** What ctx.storage hands back on the next visit. */
const stored = (save: ReturnType<typeof freshSave>): unknown => JSON.parse(JSON.stringify(serialize(save)))

describe('what the game saves', () => {
  it('starts a first evening by age: two muddy places at 3 and younger or with no age, four at 4 and older', () => {
    expect(firstMud(null)).toEqual(['belly', 'footR'])
    for (const age of [1, 2, 3]) expect(firstMud(age)).toEqual(firstMud(null))
    for (const age of [4, 5, 9, 12]) expect(firstMud(age)).toEqual(['belly', 'footR', 'earL', 'armL'])
    for (const row of FIRST_MUD) for (const id of row.places) expect(PLACES.map((place) => place.id)).toContain(id)
    expect(share(freshSave(5).fur, 'mud')).toBeGreaterThan(share(freshSave(2).fur, 'mud'))
    const fresh = freshSave(null)
    expect(fresh).toMatchObject({ v: STATE_VERSION, position: 'evening', finished: false, lamp: 'up' })
  })

  it('brings the coat and the lamp back as they were left, whatever the age says', () => {
    const save = freshSave(2)
    soap(save.fur, 0, -170, 0.8)
    save.lamp = 'down'
    const back = deserialize(stored(save), 5)
    expect(back.lamp).toBe('down')
    expect(share(back.fur, 'foam')).toBeCloseTo(share(save.fur, 'foam'), 1)
    expect(share(back.fur, 'mud')).toBeCloseTo(share(save.fur, 'mud'), 1)
    // And again: what was read is saved as the same digits.
    expect(stored(back)).toEqual(stored(save))
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'fur'],
    ['an array', [1, 2]],
    ['a later version', { v: STATE_VERSION + 1, lamp: 'down' }],
  ])('gives a first evening for %s', (_, raw) => {
    expect(deserialize(raw, null)).toEqual(freshSave(null))
  })

  it('repairs each field by itself', () => {
    const good = stored(freshSave(null)) as Record<string, unknown>
    expect(deserialize({ ...good, lamp: 7 }).lamp).toBe('up')
    expect(deserialize({ ...good, lamp: 'down', fur: 'mud' })).toEqual({ ...freshSave(null), lamp: 'down' })
    const fur = good.fur as Record<string, string>
    // One damaged layer: the coat is only true as a whole, so it is the first evening's, and the lamp is kept.
    expect(deserialize({ ...good, lamp: 'down', fur: { ...fur, wet: fur.wet.slice(1) } })).toEqual({ ...freshSave(null), lamp: 'down' })
    expect(deserialize({ ...good, position: 'retired' }).position).toBe('evening')
  })

  it('keeps a largest record far under half of the 64 KB cap', () => {
    const save = freshSave(5)
    for (const layer of [save.fur.mud, save.fur.foam, save.fur.wet, save.fur.fluff]) layer.fill(1)
    const text = JSON.stringify(serialize({ ...save, finished: true, lamp: 'down' }))
    expect(text.length).toBeLessThan(2048)
    expect(serialize(save).fur.mud).toHaveLength(CELLS)
  })

  it('brings every field of the room back as it was left', () => {
    const save = { ...freshSave(null, 7), curtain: 'open' as const, blanket: 'duck' as const, pyjamas: 'lamp' as const, duck: 'shine' as const, cat: 'fluff' as const, shade: 'foam' as const, suds: 2, mudPlaces: ['earL', 'armR', 'brow'], stream: 4242 }
    const back = deserialize(stored(save), 5, 99)
    expect({ ...back, fur: null }).toEqual({ ...save, fur: null })
    expect(stored(back)).toEqual(stored(save))
    for (const who of WEARERS) {
      expect(deserialize(stored({ ...save, blanket: who, pyjamas: 'peg' })).blanket).toBe(who)
      expect(deserialize(stored({ ...save, pyjamas: who, blanket: 'bed' })).pyjamas).toBe(who)
    }
  })

  it('repairs each field of the room by itself, and keeps the rest', () => {
    const good = stored({ ...freshSave(null), blanket: 'cat', duck: 'foam', suds: 3, lamp: 'down' }) as Record<string, unknown>
    const kept = { blanket: 'cat', duck: 'foam', suds: 3, lamp: 'down' }
    for (const [field, bad, repaired] of [
      ['phase', 'noon', 'evening'], ['curtain', 3, 'closed'], ['pyjamas', 'moon', 'peg'], ['cat', null, 'plain'], ['shade', 'gold', 'plain'],
    ] as const) expect(deserialize({ ...good, [field]: bad }), field).toMatchObject({ ...kept, [field]: repaired })
    expect(deserialize({ ...good, blanket: 'sky' })).toMatchObject({ blanket: 'bed', duck: 'foam' })
    for (const suds of [-4, 2.5, '2', 99, null]) expect([0, 3]).toContain(deserialize({ ...good, suds }).suds)
    expect(deserialize({ ...good, suds: 99 }).suds).toBe(3)
    expect(deserialize({ ...good, stream: -1 }, null, 5).stream).toBe(5)
    // Mud places it does not know are dropped; with too few left, the first evening's stand in.
    expect(deserialize({ ...good, mudPlaces: ['earL', 'tail', 'earL', 'brow'] }).mudPlaces).toEqual(['earL', 'brow'])
    expect(deserialize({ ...good, mudPlaces: 'belly' }).mudPlaces).toEqual(firstMud(null))
  })

  it('lets the phase win: asleep he is under the blanket in the dark behind a closed curtain, outside he wears nothing', () => {
    const base = stored(freshSave(null)) as Record<string, unknown>
    expect(deserialize({ ...base, phase: 'night', blanket: 'duck', curtain: 'open', lamp: 'up', finished: false })).toMatchObject({ phase: 'night', blanket: 'teddy', curtain: 'closed', lamp: 'down', finished: true })
    expect(deserialize({ ...base, phase: 'morning', blanket: 'teddy', pyjamas: 'teddy', curtain: 'closed' })).toMatchObject({ phase: 'morning', blanket: 'bed', pyjamas: 'peg', curtain: 'open', finished: true })
    expect(deserialize({ ...base, phase: 'evening', finished: true }).finished).toBe(false)
    // Only Teddy wears both: anyone else keeps the blanket.
    expect(deserialize({ ...base, blanket: 'cat', pyjamas: 'cat' })).toMatchObject({ blanket: 'cat', pyjamas: 'peg' })
    expect(deserialize({ ...base, blanket: 'teddy', pyjamas: 'teddy' })).toMatchObject({ blanket: 'teddy', pyjamas: 'teddy' })
  })

  it('draws each morning two to four muddy places from its stream, never the same set as the morning before, for a child of any age', () => {
    let stream = 12345, before: string[] = firstMud(null)
    const ids = PLACES.map((place) => place.id), seen = new Set<number>()
    for (let n = 0; n < 300; n++) {
      const next = nextMud(stream, before)
      expect(next.places.length).toBeGreaterThanOrEqual(2)
      expect(next.places.length).toBeLessThanOrEqual(4)
      expect(new Set(next.places).size).toBe(next.places.length)
      for (const id of next.places) expect(ids).toContain(id)
      expect([...next.places].sort()).not.toEqual([...before].sort())
      // The same stream gives the same morning.
      expect(nextMud(stream, before)).toEqual(next)
      seen.add(next.places.length)
      stream = next.stream; before = next.places
    }
    expect([...seen].sort()).toEqual([2, 3, 4])
    expect(nextStream(0)).toBe(nextStream(0))
    expect(Number.isInteger(nextStream(4294967295))).toBe(true)
  })
})
