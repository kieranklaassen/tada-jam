import { describe, expect, it } from 'vitest'
import { centreOf } from './board'
import { GuideTurn, guideFor } from './guide'
import { IdleLadder, type Guidance } from './guidance'
import { HANDLE, knobAt } from './layout'
import { freshSave } from './save'
import { Toy } from './toy'

describe('what the idle ladder shows', () => {
  const state = (toy: Toy) => ({ nextHoles: toy.nextHoles(), leverDown: toy.leverDown, anyPeg: toy.shown.some((cell) => cell !== 0) })

  it('first shows the toy\'s own move, a drag along the next empty holes, and on the next turn the lever', () => {
    const toy = new Toy(freshSave(null), 1)
    const pegs = guideFor(state(toy), 0)!
    expect(pegs.kind).toBe('pegs')
    const holes = toy.nextHoles()
    expect({ from: pegs.from, to: pegs.to }).toEqual({ from: centreOf(holes[0]), to: centreOf(holes[holes.length - 1]) })
    const lever = guideFor(state(toy), 1)!
    expect(lever).toEqual({ kind: 'lever', from: knobAt(0), to: knobAt(1) })
    expect(guideFor(state(toy), 2)!.kind).toBe('pegs')
    expect(guideFor(state(toy), 3)!.kind).toBe('lever')
  })

  it('does not show the lever while it is down, or while the board has nothing for a beam to play', () => {
    const toy = new Toy(freshSave(null), 1)
    toy.press(knobAt(0).x, knobAt(0).y)
    toy.release()
    expect(guideFor(state(toy), 1)!.kind).toBe('pegs')
    const bare = new Toy({ ...freshSave(null), board: new Array<number>(77).fill(0), moth: null }, 1)
    expect(guideFor(state(bare), 1)!.kind).toBe('pegs')
  })

  it('shows the lever alone on a full board, and never the tray handle', () => {
    const full = new Toy({ ...freshSave(null), board: new Array<number>(77).fill(2), moth: 5 }, 1)
    for (const turn of [0, 1, 2, 3]) {
      const guide = guideFor(state(full), turn)!
      expect(guide.kind).toBe('lever')
      expect(guide.to.x).not.toBe(HANDLE.x)
    }
    // A full board with the lever down has nothing to show.
    full.press(knobAt(0).x, knobAt(0).y)
    full.release()
    expect(guideFor(state(full), 0)).toBeNull()
  })
})

describe('whose turn it is', () => {
  it('is the demonstration that is playing, and after it the next one, and the first again after a touch', () => {
    const turn = new GuideTurn(), ladder = new IdleLadder(0)
    const seen: number[] = []
    let last: Guidance | null = null
    for (let t = 0; t < 40; t += 0.1) {
      last = ladder.update(t)
      const now = turn.of(last)
      if (last.glow > 0 && seen[seen.length - 1] !== now) seen.push(now)
    }
    // The glow comes before any hand, on what the first demonstration will show; then each turn in order.
    expect(seen.slice(0, 3)).toEqual([0, 1, 2])
    ladder.touch(40)
    expect(turn.of(ladder.update(40.1))).toBe(0)
    expect(turn.of(ladder.update(44))).toBe(0)
  })
})
