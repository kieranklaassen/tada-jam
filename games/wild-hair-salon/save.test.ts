import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { MAX_CLIPPINGS, MAX_LEN, MEET, MIN_LEN, PLAIN, TAIL_LEN, TUFTS } from './rules'
import { deserializeGame, freshGame, serializeGame, type Game } from './save'
import { STATE_VERSION } from './state'
import { CUSTOMERS } from './tastes'
import { CLIPPING_PLACES, RIBBON_PLACES, type Clipping } from './world'

const round = (game: Game): Game => deserializeGame(JSON.parse(JSON.stringify(serializeGame(game))))

/** The largest state the game can reach: every list full and every string the longest it can be. */
function largest(): Game {
  const longest = <T extends string>(items: readonly T[]): T => [...items].sort((a, b) => b.length - a.length)[0]
  const clipping: Clipping = { len: MAX_LEN, hue: longest([...CUSTOMERS, 'ribbon'] as const), on: longest(CLIPPING_PLACES), x: 100 }
  return {
    ...freshGame(6), position: longest(LADDER), finished: true, cape: 'off', seed: 0xffffffff,
    chair: 'poodle', friend: 'rabbit', waiting: ['rabbit', 'poodle'], lock: MAX_LEN, model: MAX_LEN,
    mane: Array(TUFTS).fill(MAX_LEN), ribbon: { len: MAX_LEN, at: longest(RIBBON_PLACES) },
    clippings: Array(MAX_CLIPPINGS).fill(clipping), shown: { snip: true, pull: true, ribbon: true },
  }
}

describe('the saved salon', () => {
  it('opens a first visit with the first pair in place and something plainly to do', () => {
    const game = freshGame(null)
    expect(game).toMatchObject({ v: STATE_VERSION, position: 'beside-long', finished: false, chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seat: 'beside', cape: 'on', ribbon: null, clippings: [] })
    expect(game.lock - game.model).toBeGreaterThanOrEqual(PLAIN.min)
    expect(game.mane).toHaveLength(TUFTS)
    expect(game.shown).toEqual({ snip: false, pull: false, ribbon: false })
  })

  it('starts a first visit by age, and at the youngest place for no age', () => {
    expect(freshGame(null).position).toBe('beside-long')
    expect(freshGame(2).position).toBe('beside-long')
    expect(freshGame(4).position).toBe('beside-long')
    expect(freshGame(5).position).toBe('beside-close')
    expect(freshGame(6)).toMatchObject({ position: 'across', seat: 'across' })
    expect(freshGame(11).position).toBe('across')
  })

  it('is the same first visit every time', () => {
    expect(freshGame(5)).toEqual(freshGame(5))
  })

  it('comes back exactly as it was left', () => {
    const games: Game[] = [freshGame(null), freshGame(6), largest(), { ...freshGame(4), lock: 37, mane: [4, 100, 9, 50, 50, 50, 50, 50, 77], ribbon: { len: 31, at: 'lock' }, shown: { snip: true, pull: false, ribbon: true }, clippings: [{ len: 12, hue: 'ribbon', on: 'friend', x: 3 }] }]
    for (const game of games) expect(round(game)).toEqual(serializeGame(game))
  })

  it('lets a saved position win over the age', () => {
    const saved = serializeGame({ ...freshGame(4), position: 'across-close' })
    expect(deserializeGame(saved, 4).position).toBe('across-close')
    expect(deserializeGame(saved, null).position).toBe('across-close')
  })

  it.each([
    ['nothing', null], ['a string', 'salon'], ['a number', 7], ['a list', [1, 2]], ['an empty record', {}],
    ['no version', { position: 'across', lock: 50 }], ['a newer version', { ...serializeGame(freshGame(4)), v: STATE_VERSION + 1 }],
  ])('opens a first visit from %s', (_name, raw) => {
    expect(deserializeGame(raw, 5)).toEqual(freshGame(5))
  })

  it('repairs each damaged field by itself and keeps the rest', () => {
    const good = serializeGame({ ...freshGame(4), lock: 61, model: 40, seat: 'across', mane: [10, 20, 30, 40, 50, 60, 70, 80, 90], ribbon: { len: 33, at: 'model' }, shown: { snip: true, pull: true, ribbon: true } })
    const damaged: [string, unknown][] = [
      ['chair', 'cat'], ['friend', 12], ['waiting', ['yak']], ['seed', 'x'], ['lock', null], ['model', 'long'], ['seat', 'ceiling'],
      ['cape', 'half'], ['mane', 'wild'], ['ribbon', 'yes'], ['clippings', { len: 3 }], ['shown', 5], ['position', 'grade-1'], ['finished', 'yes'],
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
      expect(CUSTOMERS).toContain(back.chair)
      expect(back.friend).not.toBe(back.chair)
    }
  })

  it('brings every length back inside what a strip can be', () => {
    const back = deserializeGame({ ...serializeGame(freshGame(4)), lock: 9999, model: -5, mane: [1e9, -1, 3.7, Number.NaN, 'x', 50], ribbon: { len: 0.2, at: 'peg' } })
    expect(back.lock).toBe(MAX_LEN)
    expect(back.model).toBe(MIN_LEN)
    expect(back.mane).toHaveLength(TUFTS)
    for (const steps of back.mane) expect(Number.isInteger(steps) && steps >= MIN_LEN && steps <= MAX_LEN).toBe(true)
    expect(back.mane.slice(0, 3)).toEqual([MAX_LEN, MIN_LEN, MIN_LEN])
    expect(back.ribbon).toEqual({ len: MIN_LEN, at: 'peg' })
  })

  it('never has two of the same animal as a pair', () => {
    const base = serializeGame(freshGame(4))
    expect(deserializeGame({ ...base, chair: 'yak', friend: 'yak' }).friend).not.toBe('yak')
    expect(deserializeGame({ ...base, waiting: ['rabbit', 'rabbit'] }).waiting).toEqual(base.waiting)
  })

  it('keeps the ribbon and its mark together', () => {
    const base = serializeGame(freshGame(4))
    expect(deserializeGame({ ...base, ribbon: { len: 30, at: 'mane' }, shown: { snip: false, pull: false, ribbon: false } }).shown.ribbon).toBe(true)
    expect(deserializeGame({ ...base, ribbon: null, shown: { snip: false, pull: false, ribbon: true } }).ribbon).toEqual({ len: TAIL_LEN, at: 'peg' })
    expect(deserializeGame({ ...base, ribbon: { len: 30, at: 'moon' } }).ribbon).toBeNull()
  })

  it('opens with the cape on unless the cycle was judged', () => {
    const base = serializeGame(freshGame(4))
    expect(deserializeGame({ ...base, cape: 'off', finished: false }).cape).toBe('on')
    expect(deserializeGame({ ...base, cape: 'off', finished: true })).toMatchObject({ cape: 'off', finished: true })
  })

  it('drops clippings it cannot read and keeps the newest twelve', () => {
    const piece = (len: number): Clipping => ({ len, hue: 'lion', on: 'floor', x: 10 })
    const back = deserializeGame({ ...serializeGame(freshGame(4)), clippings: [piece(5), 'fluff', { len: -3, hue: 'lion', on: 'floor', x: 1 }, { len: 4, hue: 'cat', on: 'floor', x: 1 }, { len: 4, hue: 'yak', on: 'ceiling', x: 1 }, { len: 7, hue: 'ribbon', on: 'chair', x: 'left' }, ...Array.from({ length: 20 }, (_, i) => piece(20 + i))] })
    expect(back.clippings).toHaveLength(MAX_CLIPPINGS)
    expect(back.clippings[MAX_CLIPPINGS - 1].len).toBe(39)
    expect(deserializeGame({ ...serializeGame(freshGame(4)), clippings: [{ len: 7, hue: 'ribbon', on: 'chair', x: 'left' }] }).clippings).toEqual([{ len: 7, hue: 'ribbon', on: 'chair', x: 50 }])
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

  it('keeps a model the child can never have moved', () => {
    const game = freshGame(4)
    expect(Math.abs(game.lock - game.model)).toBeGreaterThan(MEET)
  })
})
