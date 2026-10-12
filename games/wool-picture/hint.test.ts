import { describe, expect, it } from 'vitest'
import { BOWLS, FELT, onFelt } from './layout'
import { along, hintFor } from './hint'
import { lay, makeSheet, shapeFor, type Join, type Laid, type Sheet } from './wool'

const play = (sheet: Sheet, hand: number) => ({ sheet, hand, finished: false, folk: [{ at: null }, { at: null }, { at: null }, { at: null }], wall: [] })

describe('what the idle ladder shows', () => {
  it('glows on the tuft of the chosen bowl, and moves the hand from that bowl onto the felt and a short way along it', () => {
    for (let hand = 0; hand < BOWLS.length; hand++) {
      const hint = hintFor(play(makeSheet(), hand))
      expect(Math.abs(hint.glow.x - BOWLS[hand].x)).toBe(0)
      expect(onFelt(hint.path[0])).toBe(false)
      expect(onFelt(hint.path[1])).toBe(true)
      expect(onFelt(hint.path[2])).toBe(true)
      expect(Math.hypot(hint.path[2].x - hint.path[1].x, hint.path[2].y - hint.path[1].y)).toBeLessThan(160)
      expect(along(hint.path, 0)).toEqual(hint.path[0])
      expect(along(hint.path, 0.5)).toEqual(hint.path[1])
      expect(along(hint.path, 1)).toEqual(hint.path[2])
    }
  })

  it('shows a move on bare felt, not over what the child has laid', () => {
    const sheet = makeSheet(), laid: Laid[] = [], joins: Join[] = []
    const first = hintFor(play(sheet, 0)).path[1]
    const col = Math.round((first.x - FELT.x) / 10), row = Math.round((first.y - FELT.y) / 10)
    const shape = shapeFor(sheet, 0, col, row, 1.5, joins)
    // A scrap: wool too slight to live, so the next act is still to lay wool.
    for (let x = col; x <= col + 6; x++) lay(sheet, shape, x, row, 0, 2, laid, joins)
    const next = hintFor(play(sheet, 0)).path[1]
    expect(next).not.toEqual(first)
  })
})
