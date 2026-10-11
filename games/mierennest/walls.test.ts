import { describe, expect, it } from 'vitest'
import { fromPicture, settle, toPicture } from './ground'
import { DUNG_BALL, HABITS, PUSHERS_IN_A_LINE } from './habits'
import { HOLD, holdOfCell, lean, runFrom } from './walls'

// A pusher stands at the left of each picture, in the bottom row of the tunnel, and pushes to the right.
const BEETLE = HABITS.beetle.push
const hold = (row: string) => runFrom(fromPicture(['#'.repeat(row.length), row, 'X'.repeat(row.length)]), 1, 1, 1).hold

describe('what a wall holds', () => {
  const holds: { name: string; row: string; hold: number }[] = [
    { name: 'one sand', row: '.s...', hold: 1 },
    { name: 'two sand', row: '.ss..', hold: 2 },
    { name: 'one stone', row: '.o...', hold: 2 },
    { name: 'one mud', row: '.m...', hold: 3 },
    { name: 'two stones', row: '.oo..', hold: 4 },
    { name: 'sand packed by mud', row: '.sm..', hold: 5 },
    { name: 'two mud', row: '.mm..', hold: 6 },
    { name: 'mud and a stone it beds', row: '.mo..', hold: 8 },
    { name: 'sand, mud and a stone', row: '.smo.', hold: 10 },
  ]
  for (const row of holds) it(`${row.name} holds ${row.hold}`, () => expect(hold(row.row)).toBe(row.hold))

  it('a combination is stronger than its parts', () => {
    expect(hold('.sm..')).toBeGreaterThan(hold('.s...') + hold('.m...'))
    expect(hold('.mo..')).toBeGreaterThan(hold('.m...') + hold('.o...'))
  })

  it('packs sand and beds a stone by mud on any of its four sides', () => {
    const ground = fromPicture(['..m..', '.s.o.', '.m...', 'XXXXX'])
    expect(holdOfCell(ground, 1, 1)).toBe(HOLD.packedSand)
    expect(holdOfCell(ground, 3, 1)).toBe(HOLD.stone)
    expect(holdOfCell(fromPicture(['.o.', '.m.', 'XXX']), 1, 0)).toBe(HOLD.beddedStone)
  })
})

describe('leaning on a wall', () => {
  it('a thin sand wall goes at its foot under one beetle, and what stood on it sifts into a pile', () => {
    const ground = fromPicture(['#######', '..s....', '..s....', 'XXXXXXX'])
    expect(lean(ground, 2, 2, 1, BEETLE).did).toBe('shoved')
    settle(ground)
    expect(toPicture(ground)).toEqual(['#######', '.......', '..ss...', 'XXXXXXX'])
  })

  it('the same wall with mud packed against it holds one beetle and gives to two', () => {
    const one = fromPicture(['#######', '..sm...', '..sm...', 'XXXXXXX'])
    expect(lean(one, 2, 2, 1, BEETLE)).toEqual({ did: 'held', hold: 5 })
    expect(lean(one, 2, 2, 1, BEETLE * 2).did).toBe('shoved')
  })

  it('with a stone rolled against the mud it holds two beetles, and three, and a dung ball', () => {
    const picture = ['########', '..sm....', '..smo...', 'XXXXXXXX']
    expect(lean(fromPicture(picture), 2, 2, 1, BEETLE * 2)).toEqual({ did: 'held', hold: 10 })
    expect(lean(fromPicture(picture), 2, 2, 1, BEETLE * PUSHERS_IN_A_LINE).did).toBe('held')
    expect(lean(fromPicture(picture), 2, 2, 1, DUNG_BALL.push).did).toBe('held')
  })

  it('a dung ball breaks a wall one cell thick of any one material and is held by two cells bound with mud', () => {
    for (const lump of ['s', 'm', 'o']) expect(lean(fromPicture(['#####', `.${lump}...`, 'XXXXX']), 1, 1, 1, DUNG_BALL.push).did).toBe('shoved')
    for (const wall of ['mm', 'mo', 'om']) expect(lean(fromPicture(['#####', `.${wall}..`, 'XXXXX']), 1, 1, 1, DUNG_BALL.push).did).toBe('held')
    for (const wall of ['ss', 'oo', 'so']) expect(lean(fromPicture(['#####', `.${wall}..`, 'XXXXX']), 1, 1, 1, DUNG_BALL.push).did).toBe('shoved')
  })

  it('a lone stone on a flat floor rolls ahead of the push until something stops it', () => {
    const ground = fromPicture(['######', '.o...#', 'XXXXXX'])
    let x = 1
    while (lean(ground, x, 1, 1, BEETLE).did === 'shoved') x++
    expect(toPicture(ground)).toEqual(['######', '....o#', 'XXXXXX'])
    expect(lean(ground, 4, 1, 1, BEETLE * 3)).toEqual({ did: 'held', hold: Infinity })
  })

  it('loose sand with earth behind it is ploughed through, and packed sand there is not', () => {
    const loose = fromPicture(['####', '.ss#', 'XXXX'])
    expect(lean(loose, 1, 1, 1, BEETLE).did).toBe('ploughed')
    expect(toPicture(loose)).toEqual(['####', 's.s#', 'XXXX'])
    const packed = fromPicture(['####', '.sm#', 'XXXX'])
    expect(lean(packed, 1, 1, 1, BEETLE).did).toBe('held')
  })

  it('pushes to the left as it does to the right, moves nothing that holds, and answers open ground and earth', () => {
    const ground = fromPicture(['#####', '..s..', 'XXXXX'])
    expect(lean(ground, 2, 1, -1, BEETLE).did).toBe('shoved')
    expect(toPicture(ground)).toEqual(['#####', '.s...', 'XXXXX'])
    const firm = fromPicture(['#####', '.mm.#', 'XXXXX'])
    lean(firm, 1, 1, 1, BEETLE)
    expect(toPicture(firm)).toEqual(['#####', '.mm.#', 'XXXXX'])
    expect(lean(firm, 0, 1, 1, BEETLE)).toEqual({ did: 'nothing' })
    expect(lean(firm, 4, 1, 1, BEETLE)).toEqual({ did: 'held', hold: Infinity })
  })
})
