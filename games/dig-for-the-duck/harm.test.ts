import { describe, expect, it } from 'vitest'
import { COLS, HOT, HOT_WET, type Box } from './cells'
import type { Game } from './game'
import { STONE_OVER_BATH, find, gameOn, mend, play, spot, until } from './testing'

/** Rubs one straight tunnel from under the pond to the gap between the duck and the chain: the short way. */
function digTheWay(game: Game): void {
  const { pond, chamber, seat, chain } = game.on.ground.layout
  const from = spot(pond.col, pond.brim + pond.depth - 2)
  const gap = seat.col0 > chain.col1 ? (chain.col1 + seat.col0) / 2 : (seat.col1 + chain.col0) / 2
  const to = spot(gap, chamber.row0 + 4)
  game.press(from)
  for (let i = 1; i <= 40; i++) { game.rubTo({ x: from.x + ((to.x - from.x) * i) / 40, y: from.y + ((to.y - from.y) * i) / 40 }); game.step(1 / 60) }
  game.release()
}

const inBath = (bath: Box, index: number): boolean => index % COLS >= bath.col0 && index % COLS <= bath.col1 && ((index / COLS) | 0) >= bath.row0 && ((index / COLS) | 0) <= bath.row1

describe('no rub does harm', () => {
  it('a bath with a hot stone in it fills as any bath does: the stone only boils there, the duck floats, and sighs as it does', () => {
    for (const [id, variant] of STONE_OVER_BATH) {
      const game = gameOn(id, variant), ground = game.on.ground, { bath, chamber } = ground.layout, name = `${id} ${variant}`
      const stone = find(game, (code, col, row) => code === HOT && col >= bath.col0 && col <= bath.col1 && row > 60 && row < chamber.row0)!
      // The short way, straight from under the pond to the gap. Where that leaves the stone hanging, one rub down past it drops it.
      digTheWay(game)
      play(game, 2)
      const dropped = (): number => ground.count(bath, HOT) + ground.count(bath, HOT_WET)
      if (dropped() === 0) {
        game.press(spot(stone.col, stone.row - 7))
        for (let row = stone.row - 6; row <= chamber.row0 + 2; row++) { game.rubTo(spot(stone.col, row)); game.step(1 / 60) }
        game.release()
        play(game, 1)
      }
      expect(dropped(), `${name}: the stone lies in the bath`).toBeGreaterThan(0)
      // Where the short way holds another ground that stops the stream, the stream is led round it through sand.
      if (!until(game, 3, () => game.finished)) expect(mend(game), `${name}: a way through sand is still there`).toBe(true)
      expect(until(game, 40, () => game.finished), `${name}: the duck floats`).toBe(true)
      play(game, 0.2)
      expect(game.since.duckSigh, `${name}: the sigh`).toBeLessThan(Infinity)
      // The bath is a boiled one, and no water leaves it as steam.
      expect(game.on.boiled, `${name}: a boiled bath`).toBe(true)
      for (let tick = 0; tick < 120; tick++) {
        const moved = ground.step()
        if (moved.steamed > 0) expect(inBath(bath, moved.steamAt), `${name}: steam from the bath`).toBe(false)
      }
    }
  }, 120_000)
})
