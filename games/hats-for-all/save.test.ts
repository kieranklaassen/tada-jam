import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { MOST } from './kinds'
import { FIRST_SEED } from './layout'
import { MOST_SLIPS, bareSpots, hatsInTile, placeOf, type World } from './rules'
import { deserialize, freshSave, serialize, worldOf, type Saved } from './save'
import { STATE_VERSION } from './state'

/** The largest legal state: five creatures, five hats in towers and loose, two changes held, the longest id. */
function largest(): Saved {
  const position = [...LADDER].sort((a, b) => b.length - a.length)[0]
  return {
    v: STATE_VERSION, position, finished: false, seed: 2 ** 32 - 1, shown: true,
    crew: [{ kind: 'bop', spot: 0, hats: [0, 1] }, { kind: 'lanky', spot: 1, hats: [2, 3] }, { kind: 'flop', spot: 2, hats: [] }, { kind: 'wig', spot: 3, hats: [] }],
    tile: ['cone', 'dome', 'brim', 'cone', 'dome'], loose: [{ hat: 4, spot: 4 }],
    changes: ['leave', 'come'], guest: 'pip', leaver: 3, slips: MOST_SLIPS,
  }
}

/** Every hat in one place, every creature on its own spot, the sets at five or fewer. */
function expectSound(world: World): void {
  const out = [...world.crew.flatMap((creature) => creature.hats), ...world.loose.map((entry) => entry.hat)]
  expect(new Set(out).size).toBe(out.length)
  expect(out.length + hatsInTile(world).length).toBe(world.tile.length)
  expect(world.crew.length).toBeGreaterThanOrEqual(1)
  expect(world.crew.length).toBeLessThanOrEqual(MOST)
  expect(world.tile.length).toBeLessThanOrEqual(MOST)
  expect(new Set(world.crew.map((creature) => creature.spot)).size).toBe(world.crew.length)
  for (let hat = 0; hat < world.tile.length; hat++) expect(['tile', 'head', 'loose']).toContain(placeOf(world, hat).at)
}

describe('a first visit', () => {
  it('starts where the age says, and with no age at the youngest place', () => {
    expect(freshSave(null).position).toBe(LADDER[0])
    expect(freshSave(1).position).toBe(LADDER[0])
    for (const row of FIRST_VISIT) expect(freshSave(row.fromAge).position).toBe(row.position)
    expect(freshSave(11).position).toBe(FIRST_VISIT[FIRST_VISIT.length - 1].position)
  })

  it('holds the first crew ever, its leader already hatted and the showing still to play', () => {
    const fresh = freshSave(null)
    expect(fresh.shown).toBe(false)
    expect(fresh.finished).toBe(false)
    expect(fresh.crew.length).toBe(3)
    expect(fresh.crew[0].hats.length).toBe(1)
    expect(bareSpots(worldOf(fresh)).length).toBe(2)
    expect(hatsInTile(worldOf(fresh)).length).toBe(2)
    expect(freshSave(null)).toEqual(fresh)
  })
})

describe('the saved state', () => {
  it('comes back exactly as it was written', () => {
    for (const saved of [largest(), freshSave(null), freshSave(4)]) {
      const text = JSON.stringify(serialize(saved))
      expect(deserialize(JSON.parse(text))).toEqual(saved)
    }
  })

  it('is plain JSON far under half the storage cap, at its largest', () => {
    const text = JSON.stringify(serialize(largest()))
    expect(new TextEncoder().encode(text).length).toBeLessThan(32 * 1024)
    expect(text.length).toBeLessThan(600)
  })

  it('writes its own fields and nothing that rides along', () => {
    const written = serialize({ ...largest(), extra: 'x' } as Saved)
    expect(Object.keys(written).sort()).toEqual(['changes', 'crew', 'finished', 'guest', 'leaver', 'loose', 'position', 'seed', 'shown', 'slips', 'tile', 'v'])
  })

  it.each([
    ['nothing', undefined], ['null', null], ['a string', 'hats'], ['a number', 7], ['a list', [1, 2]], ['an empty record', {}],
    ['a version above this one', { ...largest(), v: STATE_VERSION + 1 }], ['no version', { ...largest(), v: undefined }],
  ])('gives a first visit for %s', (_, raw) => {
    expect(deserialize(raw, null)).toEqual(freshSave(null))
    expect(deserialize(raw, 4)).toEqual(freshSave(4))
  })

  it.each([
    ['a tile that is not a list', { tile: 'cone' }], ['an empty tile', { tile: [] }], ['six hats', { tile: ['cone', 'dome', 'brim', 'cone', 'dome', 'brim'] }],
    ['a hat of no kind', { tile: ['cone', 'dome', 'brim', 'cone', 'crown'] }], ['a crew that is not a list', { crew: {} }], ['no crew', { crew: [] }],
    ['a creature of no kind', { crew: [{ kind: 'dog', spot: 0, hats: [] }] }], ['a creature off the mat', { crew: [{ kind: 'bop', spot: 5, hats: [] }] }],
    ['two creatures on one spot', { crew: [{ kind: 'bop', spot: 1, hats: [] }, { kind: 'pip', spot: 1, hats: [] }] }],
    ['the same creature twice', { crew: [{ kind: 'bop', spot: 1, hats: [] }, { kind: 'bop', spot: 2, hats: [] }] }],
    ['a hat that is not in the tile', { crew: [{ kind: 'bop', spot: 1, hats: [7] }] }], ['a hat on two heads', { crew: [{ kind: 'bop', spot: 1, hats: [0] }, { kind: 'pip', spot: 2, hats: [0] }] }],
    ['a hat both worn and loose', { loose: [{ hat: 0, spot: 2 }] }], ['a loose hat off the mat', { loose: [{ hat: 4, spot: 9 }] }], ['loose hats that are not a list', { loose: 3 }],
    ['a creature that is null', { crew: [null] }], ['hats that are not a list', { crew: [{ kind: 'bop', spot: 1, hats: 2 }] }],
  ])('lays a fresh crew for the saved position when the world holds %s', (_, damage) => {
    const read = deserialize({ ...serialize(largest()), ...damage })
    expect(read.position).toBe(largest().position)
    expect(read.finished).toBe(false)
    expect(read.shown).toBe(true)
    expect(read.slips).toBe(0)
    expect(read.crew.every((creature) => creature.hats.length === 0)).toBe(true)
    expectSound(worldOf(read))
  })

  it.each([
    ['a position this build does not know', { position: 'somewhere-else' }, (read: Saved) => expect(read.position).toBe(LADDER[0])],
    ['a seed that is not a whole number', { seed: 1.5 }, (read: Saved) => expect(read.seed).toBe(FIRST_SEED)],
    ['a negative seed', { seed: -4 }, (read: Saved) => expect(read.seed).toBe(FIRST_SEED)],
    ['slips past the cap', { slips: 40 }, (read: Saved) => expect(read.slips).toBe(0)],
    ['slips that are not a number', { slips: 'many' }, (read: Saved) => expect(read.slips).toBe(0)],
    ['changes that are not a list', { changes: 'come' }, (read: Saved) => expect([read.changes, read.guest, read.leaver]).toEqual([[], null, null])],
    ['changes of no kind and too many', { changes: ['fly', 'leave', 'come', 'leave'] }, (read: Saved) => expect(read.changes).toEqual(['leave', 'come'])],
    ['a guest who is already on the mat', { guest: 'bop' }, (read: Saved) => expect([read.changes, read.guest]).toEqual([['leave'], null])],
    ['a guest of no kind', { guest: 5 }, (read: Saved) => expect([read.changes, read.guest]).toEqual([['leave'], null])],
    ['a leaver who is not on the mat', { leaver: 4 }, (read: Saved) => expect(read.leaver).toBe(3)],
    ['a leaver that is not a spot', { leaver: 'bop' }, (read: Saved) => expect(read.leaver).toBe(3)],
    ['a finished mark over changes still held', { finished: true }, (read: Saved) => expect([read.finished, read.changes, read.guest, read.leaver]).toEqual([true, [], null, null])],
    ['a damaged mark of the first showing', { shown: 'no' }, (read: Saved) => expect(read.shown).toBe(true)],
  ])('repairs %s and keeps the rest', (_, damage, check) => {
    const whole = largest(), read = deserialize({ ...serialize(whole), ...damage })
    check(read)
    expect(read.crew).toEqual(whole.crew)
    expect(read.tile).toEqual(whole.tile)
    expect(read.loose).toEqual(whole.loose)
    expectSound(worldOf(read))
  })

  it('never throws, whatever it is given', () => {
    const junk: unknown[] = [NaN, Infinity, -1, '', [], {}, null, undefined, true, { hat: {} }, [[]], 'cone', 2 ** 40]
    for (const field of ['position', 'finished', 'seed', 'shown', 'crew', 'tile', 'loose', 'changes', 'guest', 'leaver', 'slips']) for (const value of junk) {
      const read = deserialize({ ...serialize(largest()), [field]: value })
      expect(LADDER).toContain(read.position)
      expectSound(worldOf(read))
      expect(() => JSON.stringify(serialize(read))).not.toThrow()
    }
  })
})
