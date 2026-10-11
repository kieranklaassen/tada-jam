import { describe, expect, it } from 'vitest'
import { CLOTH_COL, HOME_COL, type Board, type Lane, type Pawn } from './board'
import { bystanderAt } from './bystanders'
import { visitAt } from './careful'
import { CAT, DUCK_POST, LANES, centreX, centreY, onCat } from './layout'
import { boardOf } from './save'
import { sceneryOf, type Scenery } from './scenery'

const saved = visitAt('cars', 2)
const board = boardOf(saved)
const scenery = sceneryOf(saved)
const rim = LANES.y - 30
const pawn = (c: number, r: number): Pawn => ({ c, r, flat: false, on: null, dry: { c, r } })
const withRabbit = (at: Pawn): Board => ({ lanes: board.lanes, family: [at, ...board.family.slice(1)] })

describe('who a touch lands on', () => {
  it('finds the duck at its post, the hamper behind the cloth and each onlooker at the end of its own lane', () => {
    expect(bystanderAt(DUCK_POST.x, DUCK_POST.y - 20, scenery, board)).toEqual({ who: 'duck' })
    // The hamper shows to both sides of the old rabbit's head, which stands up in front of it.
    for (const side of [-50, 52]) expect(bystanderAt(centreX(CLOTH_COL) + side, rim, scenery, board)).toEqual({ who: 'hamper', c: CLOTH_COL })
    expect(bystanderAt(centreX(CLOTH_COL) + 8, rim, scenery, board)).toEqual({ who: 'old' })
    const found = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const other = sceneryOf(visitAt('cars', seed))
      other.columns.forEach((column, c) => {
        const by = bystanderAt(centreX(c), rim, other, board)
        if (['teddy', 'robot', 'giraffe', 'doll'].includes(column.far)) {
          expect(by).toEqual({ who: 'onlooker', c, what: column.far })
          found.add(column.far)
        } else if (column.far !== 'hamper') expect(by).toBeNull()
      })
    }
    expect([...found].sort()).toEqual(['doll', 'giraffe', 'robot', 'teddy'])
  })

  it('leaves every square of the board, the cards and the bare table to the hop', () => {
    for (let c = 0; c < 10; c++) for (let r = 1; r < 6; r++) expect(bystanderAt(centreX(c), centreY(r), scenery, board)).toBeNull()
    // Far above the heads, and along the near edge away from the duck.
    expect(bystanderAt(centreX(4), 8, scenery, board)).toBeNull()
    expect(bystanderAt(centreX(5), LANES.y + LANES.h + 30, scenery, board)).toBeNull()
    // The burrow on the first home bank is no character.
    expect(bystanderAt(centreX(0), centreY(0), scenery, board)).toBeNull()
  })

  it('finds the old rabbit on its seat, unless she stands next to it: then the touch sends her at its tummy', () => {
    const seat = [centreX(CLOTH_COL), centreY(0)] as const
    expect(bystanderAt(...seat, scenery, board)).toEqual({ who: 'old' })
    for (const beside of [pawn(CLOTH_COL, 1), pawn(CLOTH_COL - 1, 0), pawn(CLOTH_COL + 1, 0)]) expect(bystanderAt(...seat, scenery, withRabbit(beside))).toBeNull()
    expect(bystanderAt(...seat, scenery, withRabbit(pawn(CLOTH_COL, 2)))).toEqual({ who: 'old' })
  })

  it('finds the one asleep on the home seat only where the home bank is a cloth', () => {
    const cloth: Lane = { kind: 'cloth', movers: [] }
    const after: Board = { lanes: [cloth, ...board.lanes.slice(1)], family: [pawn(1, 3), ...board.family.slice(1)] }
    const there: Scenery = scenery
    expect(bystanderAt(centreX(0), centreY(0), there, after)).toEqual({ who: 'sleeper' })
    expect(bystanderAt(centreX(0), centreY(0), there, { ...after, family: [pawn(0, 1), ...board.family.slice(1)] })).toBeNull()
  })

  it('answers a touch above the rim of the home cloth with the hamper and the sleeper that stand there, not with the far ones', () => {
    // After the first crossing the home bank is the cloth of the crossing before, with its hamper and its old
    // rabbit asleep. Wherever the rabbit stands, a touch on one of them is answered by that one, in its column.
    const after = { ...saved, crossing: { ...saved.crossing, home: 'cloth' as const } }
    const there = sceneryOf(after)
    expect(there.columns[HOME_COL].far).toBe('hamper')
    for (const rabbit of [pawn(1, 3), pawn(HOME_COL, 1), pawn(5, 0)]) {
      const now: Board = { lanes: boardOf(after).lanes, family: [rabbit, ...board.family.slice(1)] }
      for (const side of [-50, 52]) expect(bystanderAt(centreX(HOME_COL) + side, rim, there, now)).toEqual({ who: 'hamper', c: HOME_COL })
      expect(bystanderAt(centreX(HOME_COL) + 8, rim, there, now)).toEqual({ who: 'sleeper' })
      // The far ones still answer for themselves.
      for (const side of [-50, 52]) expect(bystanderAt(centreX(CLOTH_COL) + side, rim, there, now)).toEqual({ who: 'hamper', c: CLOTH_COL })
      expect(bystanderAt(centreX(CLOTH_COL) + 8, rim, there, now)).toEqual({ who: 'old' })
    }
    // On the first home bank the burrow stands there, and it is no character.
    for (const side of [-50, 8, 52]) expect(bystanderAt(centreX(HOME_COL) + side, rim, scenery, board)).toBeNull()
  })

  it('keeps the cat to itself: no bystander lies where the cat is touched', () => {
    expect(onCat(CAT.x, CAT.y - 20)).toBe(true)
    for (let x = CAT.x - CAT.rx; x <= CAT.x + CAT.rx; x += 20) expect(bystanderAt(x, 20, scenery, board)).toBeNull()
  })
})
