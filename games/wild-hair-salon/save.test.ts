import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { letIn } from './cycle'
import { MAX_CLIPPINGS, MAX_LEN, MIN_LEN, PLAIN, TAIL_LEN, TUFTS } from './rules'
import { FIRST_PAIR, deserializeGame, freshGame, serializeGame, type Game } from './save'
import { STATE_VERSION } from './state'
import { CUSTOMERS } from './tastes'
import type { Clipping } from './world'

const round = (game: Game): Game => deserializeGame(JSON.parse(JSON.stringify(serializeGame(game))))
/** A salon with the first pair in place, as it is once they have come in. */
const seated = (childAge: number | null = null): Game => letIn(freshGame(childAge)).game

/** The largest state the game can reach: every list full and every string the longest it can be. */
function largest(): Game {
  const longest = <T extends string>(items: readonly T[]): T => [...items].sort((a, b) => b.length - a.length)[0]
  const clipping: Clipping = { len: MAX_LEN, hue: longest([...CUSTOMERS, 'ribbon'] as const), on: 'face', who: 'friend', spot: 'brow' }
  return {
    ...seated(6), position: longest(LADDER), finished: true, cape: 'off', seed: 0xffffffff,
    chair: 'poodle', friend: 'rabbit', waiting: ['rabbit', 'poodle'], lock: MAX_LEN, model: MAX_LEN,
    mane: Array(TUFTS).fill(MAX_LEN), ribbon: { len: MAX_LEN, at: 'face', who: 'friend' },
    clippings: Array(MAX_CLIPPINGS).fill(clipping), shown: { snip: true, pull: true, ribbon: true },
  }
}

describe('the saved salon', () => {
  it('opens a first visit with the chair empty, the first pair at the door and nothing shown', () => {
    const game = freshGame(null)
    expect(game).toMatchObject({ v: STATE_VERSION, position: 'beside-long', finished: false, chair: null, friend: null, waiting: FIRST_PAIR, cape: 'off', ribbon: null, clippings: [] })
    expect(game.shown).toEqual({ snip: false, pull: false, ribbon: false })
    expect(game.mane).toHaveLength(TUFTS)
  })

  it('lays the first pair out as they come in, with something plainly to do', () => {
    const game = seated()
    expect(game).toMatchObject({ chair: 'lion', friend: 'poodle', seat: 'beside', cape: 'on', finished: false, position: 'beside-long' })
    expect(game.lock - game.model).toBeGreaterThanOrEqual(PLAIN.min)
  })

  it('starts a first visit by age, and at the youngest place for no age', () => {
    expect(freshGame(null).position).toBe('beside-long')
    expect(freshGame(2).position).toBe('beside-long')
    expect(freshGame(4).position).toBe('beside-long')
    expect(freshGame(5).position).toBe('beside-close')
    expect(freshGame(6).position).toBe('across')
    expect(seated(6).seat).toBe('across')
    expect(freshGame(11).position).toBe('across')
  })

  it('is the same first visit every time', () => {
    expect(freshGame(5)).toEqual(freshGame(5))
    expect(seated(5)).toEqual(seated(5))
  })

  it('comes back exactly as it was left', () => {
    const games: Game[] = [
      freshGame(null), seated(), seated(6), largest(),
      { ...seated(4), lock: 37, mane: [4, 100, 9, 50, 50, 50, 50, 50, 77], ribbon: { len: 31, at: 'mane', tuft: 6 }, shown: { snip: true, pull: false, ribbon: true }, clippings: [{ len: 12, hue: 'ribbon', on: 'face', who: 'friend', spot: 'chin' }, { len: 7, hue: 'lion', on: 'floor', x: 3 }] },
      { ...seated(4), ribbon: { len: 18, at: 'floor', x: 71 }, shown: { snip: true, pull: true, ribbon: true } },
      { ...freshGame(4), ribbon: { len: 18, at: 'floor', x: 9 }, shown: { snip: true, pull: true, ribbon: true }, clippings: [{ len: 7, hue: 'yak', on: 'floor', x: 30 }] },
    ]
    for (const game of games) expect(round(game)).toEqual(serializeGame(game))
  })

  it('lets a saved position win over the age', () => {
    const saved = serializeGame({ ...seated(4), position: 'across-close' })
    expect(deserializeGame(saved, 4).position).toBe('across-close')
    expect(deserializeGame(saved, null).position).toBe('across-close')
  })

  it.each([
    ['nothing', null], ['a string', 'salon'], ['a number', 7], ['a list', [1, 2]], ['an empty record', {}],
    ['no version', { position: 'across', lock: 50 }], ['a newer version', { ...serializeGame(seated(4)), v: STATE_VERSION + 1 }],
  ])('opens a first visit from %s', (_name, raw) => {
    expect(deserializeGame(raw, 5)).toEqual(freshGame(5))
  })

  it('repairs each damaged field by itself and keeps the rest', () => {
    const good = serializeGame({ ...seated(4), lock: 61, model: 40, seat: 'across', mane: [12, 47, 31, 68, 25, 90, 53, 74, 19], ribbon: { len: 33, at: 'floor', x: 20 }, shown: { snip: true, pull: true, ribbon: true }, clippings: [{ len: 8, hue: 'lion', on: 'floor', x: 44 }] })
    const damaged: [string, unknown][] = [
      ['waiting', ['yak']], ['seed', 'x'], ['lock', null], ['model', 'long'], ['seat', 'ceiling'],
      ['cape', 'half'], ['mane', 'wild'], ['ribbon', 'yes'], ['clippings', { len: 3 }], ['shown', 5], ['position', 'somewhere'], ['finished', 'yes'],
    ]
    for (const [field, bad] of damaged) {
      const back = deserializeGame({ ...good, [field]: bad })
      for (const key of Object.keys(good) as (keyof Game)[]) {
        if (key === field) continue
        // The ribbon and its mark are repaired together.
        if ((field === 'ribbon' || field === 'shown') && (key === 'ribbon' || key === 'shown')) continue
        expect(back[key], `${field} damaged, ${key} kept`).toEqual(good[key])
      }
      expect(LADDER).toContain(back.position)
    }
  })

  it('opens with the chair empty when the pair cannot be read, and keeps the floor, the place in the order and the next pair', () => {
    const good = serializeGame({ ...seated(5), position: 'beside-close', ribbon: { len: 33, at: 'model' }, shown: { snip: true, pull: true, ribbon: true }, clippings: [{ len: 8, hue: 'lion', on: 'floor', x: 44 }, { len: 5, hue: 'lion', on: 'face', who: 'chair', spot: 'lip' }] })
    for (const broken of [{ chair: 'cat' }, { friend: 12 }, { chair: 'yak', friend: 'yak' }, { chair: null }]) {
      const back = deserializeGame({ ...good, ...broken })
      expect(back).toMatchObject({ chair: null, friend: null, cape: 'off', position: 'beside-close', waiting: good.waiting })
      // Nobody is there for the ribbon to hang beside or for a piece to be worn by.
      expect(back.ribbon).toEqual({ len: 33, at: 'peg' })
      expect(back.clippings).toEqual([{ len: 8, hue: 'lion', on: 'floor', x: 44 }])
    }
    expect(deserializeGame({ ...good, waiting: ['rabbit', 'rabbit'] }).waiting).toEqual(FIRST_PAIR)
  })

  it('brings every length back inside what a strip can be', () => {
    const back = deserializeGame({ ...serializeGame(seated(4)), lock: 9999, model: -5, mane: [1e9, -1, 3.7, Number.NaN, 'x', 50], ribbon: { len: 0.2, at: 'peg' } })
    expect(back.lock).toBe(MAX_LEN)
    expect(back.model).toBe(MIN_LEN)
    expect(back.mane).toHaveLength(TUFTS)
    for (const steps of back.mane) expect(Number.isInteger(steps) && steps >= MIN_LEN && steps <= MAX_LEN).toBe(true)
    expect(back.mane.slice(0, 3)).toEqual([MAX_LEN, MIN_LEN, MIN_LEN])
    expect(back.ribbon).toEqual({ len: MIN_LEN, at: 'peg' })
  })

  it('finds the ribbon exactly where it was left, and on its peg when its place cannot be read', () => {
    const base = serializeGame(seated(4))
    const at = (ribbon: unknown) => deserializeGame({ ...base, ribbon }).ribbon
    expect(at({ len: 30, at: 'mane', tuft: 5 })).toEqual({ len: 30, at: 'mane', tuft: 5 })
    expect(at({ len: 30, at: 'face', who: 'friend' })).toEqual({ len: 30, at: 'face', who: 'friend' })
    expect(at({ len: 30, at: 'floor', x: 12 })).toEqual({ len: 30, at: 'floor', x: 12 })
    for (const lost of [{ len: 30, at: 'mane' }, { len: 30, at: 'mane', tuft: 40 }, { len: 30, at: 'mane', tuft: 1.5 }, { len: 30, at: 'face', who: 'cat' }, { len: 30, at: 'moon' }]) expect(at(lost)).toEqual({ len: 30, at: 'peg' })
    expect(at({ len: 30, at: 'floor', x: 'left' })).toEqual({ len: 30, at: 'floor', x: 50 })
    expect(at({ at: 'peg' })).toBeNull()
  })

  it('keeps the ribbon and its mark together', () => {
    const base = serializeGame(seated(4))
    expect(deserializeGame({ ...base, ribbon: { len: 30, at: 'lock' }, shown: { snip: false, pull: false, ribbon: false } }).shown.ribbon).toBe(true)
    expect(deserializeGame({ ...base, ribbon: null, shown: { snip: false, pull: false, ribbon: true } }).ribbon).toEqual({ len: TAIL_LEN, at: 'peg' })
  })

  it('opens with the cape on over a customer unless the cycle was judged', () => {
    const base = serializeGame(seated(4))
    expect(deserializeGame({ ...base, cape: 'off', finished: false }).cape).toBe('on')
    expect(deserializeGame({ ...base, cape: 'off', finished: true })).toMatchObject({ cape: 'off', finished: true })
    expect(deserializeGame({ ...serializeGame(freshGame(4)), cape: 'on' }).cape).toBe('off')
  })

  it('finds a worn piece on the face and the spot it was stuck on, drops what it cannot read and keeps the newest twelve', () => {
    const base = serializeGame(seated(4))
    const read = (clippings: unknown) => deserializeGame({ ...base, clippings }).clippings
    expect(read([{ len: 7, hue: 'ribbon', on: 'face', who: 'friend', spot: 'brow' }])).toEqual([{ len: 7, hue: 'ribbon', on: 'face', who: 'friend', spot: 'brow' }])
    expect(read([{ len: 7, hue: 'ribbon', on: 'face', who: 'chair', spot: 'elbow' }])).toEqual([{ len: 7, hue: 'ribbon', on: 'face', who: 'chair', spot: 'lip' }])
    expect(read([{ len: 7, hue: 'lion', on: 'floor', x: 'left' }])).toEqual([{ len: 7, hue: 'lion', on: 'floor', x: 50 }])
    const piece = (len: number): Clipping => ({ len, hue: 'lion', on: 'floor', x: 10 })
    const many = read([piece(5), 'fluff', { len: -3, hue: 'lion', on: 'floor', x: 1 }, { len: 4, hue: 'cat', on: 'floor', x: 1 }, { len: 4, hue: 'yak', on: 'ceiling', x: 1 }, { len: 4, hue: 'yak', on: 'face', who: 'cat', spot: 'lip' }, ...Array.from({ length: 20 }, (_, i) => piece(20 + i))])
    expect(many).toHaveLength(MAX_CLIPPINGS)
    expect(many[MAX_CLIPPINGS - 1].len).toBe(39)
  })

  it('saves these fields and no others, as plain JSON', () => {
    const saved = serializeGame({ ...largest(), extra: 'x' } as Game)
    expect(Object.keys(saved).sort()).toEqual(['cape', 'chair', 'clippings', 'finished', 'friend', 'lock', 'mane', 'model', 'position', 'ribbon', 'seat', 'seed', 'shown', 'v', 'waiting'])
    expect(JSON.parse(JSON.stringify(saved))).toEqual(saved)
  })

  it('holds the largest state under two kilobytes, far under half the 64 KB cap', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(serializeGame(largest()))).length
    expect(bytes).toBeLessThan(2048)
    expect(bytes).toBeLessThan((64 * 1024) / 2)
    // And it is a state the game reads back whole.
    expect(round(largest())).toEqual(serializeGame(largest()))
  })
})
