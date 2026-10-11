import { describe, expect, it } from 'vitest'
import { makeRng } from './rng'
import { STONE_OVER_BATH, gameOn, mend, play, spot, until } from './testing'

describe('no rub does harm that one more rub does not mend', () => {
  it('whatever a child has rubbed before, one more rub through the sand floats the duck', () => {
    for (const [id, variant] of STONE_OVER_BATH) {
      const game = gameOn(id, variant), chance = makeRng(7 + variant), name = `${id} ${variant}`
      // Seven rubs anywhere in the hill, each as long as a hand's sweep, with the water left to run between them.
      for (let n = 0; n < 7 && !game.finished; n++) {
        const col = 10 + chance.next() * 163, row = 30 + chance.next() * 80, dc = (chance.next() - 0.5) * 60, dr = (chance.next() - 0.3) * 50
        game.press(spot(col, row))
        for (let i = 1; i <= 10; i++) { game.rubTo(spot(Math.min(178, Math.max(5, col + (dc * i) / 10)), Math.min(118, Math.max(28, row + (dr * i) / 10)))); game.step(1 / 60) }
        game.release()
        play(game, 0.3)
      }
      if (!game.finished) expect(mend(game), `${name}: a way through sand is still there`).toBe(true)
      expect(until(game, 45, () => game.finished), `${name}: the duck floats`).toBe(true)
    }
  }, 120_000)
})
