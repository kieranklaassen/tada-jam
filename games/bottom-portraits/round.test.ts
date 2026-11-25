import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { glowAt, nextDemo } from './guide'
import { MAESTRO } from './layout'
import { fingerOn, openingBeats } from './opening'
import { Play } from './play'
import { OpeningRound } from './round'
import { freshTable } from './table'

const FRAME = 1 / 60
const open = (age: number | null): Play => { const play = new Play(new Game(freshTable(age))); play.size(1180, 820); return play }

describe('the opening round', () => {
  for (const age of [null, 6]) it(`has a back painted, then the same one from in front (${String(age)})`, () => {
    const play = open(age), { game } = play, round = new OpeningRound(openingBeats(play), fingerOn(play))
    for (let t = 0; t < 45; t += FRAME) { round.advance(FRAME, t * 1000); play.step(FRAME) }
    expect(round.active).toBe(false)
    expect(game.table.last).toBe(1)
    const [first, second] = game.table.wall, n = first!.findIndex((e, i) => e && e[1] !== second![i]![1])
    expect(first![n]![1]).toBe(0)
    expect(second![n]![1]).toBe(2)
  })
  it('leaves nothing held when a touch ends it', () => {
    for (let at = 0; at < 25; at += 0.37) {
      const play = open(null), round = new OpeningRound(openingBeats(play), fingerOn(play))
      for (let t = 0; t < at; t += FRAME) { round.advance(FRAME, t * 1000); play.step(FRAME) }
      round.stop()
      expect(play.game.hand).toBe(null)
    }
  })
})

describe('the loop', () => {
  it('is paint, change, paint, and the glow lies on the next step', () => {
    const play = open(null), { game } = play
    const settle = (): void => { for (let t = 0; t < 12; t += FRAME) game.step(FRAME) }
    for (let i = 0; i < 5; i++) {
      expect(nextDemo(game, 0)).toBe('paint')
      expect(glowAt(game).z).toBeCloseTo(MAESTRO.z - 1.1)
      game.paint(); settle()
      const then = nextDemo(game, 0)
      expect(then).not.toBe('paint')
      game.tapped('elephant'); settle()
    }
  })
  it('offers calling one over and the key once turning is known', () => {
    const { game } = open(6)
    game.paint()
    game.done.add('turn')
    expect(nextDemo(game, 0)).toBe('bring')
    game.done.add('bring')
    game.keyUp = 1
    expect(nextDemo(game, 0)).toBe('key')
    game.done.add('key')
    expect(nextDemo(game, 0)).toBe('turn')
  })
})
