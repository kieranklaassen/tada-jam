import { describe, expect, it } from 'vitest'
import { KiteController } from './controller'
import { PIECES, SHAPES } from './pieces'
import { defaultState } from './state'

// A frame budget CI can hold: the worst thing a child can do to the
// controller is topple everything at once. On a tablet the controller shares
// a 16 ms frame with rendering, so the collapse must stay far below that.
function leaningColumn() {
  const state = defaultState(5)
  let base = 0
  PIECES.forEach((piece, i) => {
    const outline = SHAPES[piece.kind].outline
    const bottom = Math.min(...outline.map((p) => p.y))
    const top = Math.max(...outline.map((p) => p.y))
    state.pieces[piece.id] = { id: piece.id, tray: false, x: -1 + i * 0.18, y: base - bottom, a: 0 }
    base += top - bottom + 0.02
  })
  return state
}

describe('frame budget', () => {
  it('all twelve pieces toppling from one leaning column cost the controller well under a millisecond a frame', () => {
    const frames = 360
    let best = Infinity
    for (let round = 0; round < 5; round++) {
      const game = new KiteController(leaningColumn(), { save: () => {} })
      const start = performance.now()
      for (let i = 0; i < frames; i++) game.step(1 / 60)
      best = Math.min(best, (performance.now() - start) / frames)
    }
    expect(best, 'best-of-five average controller ms per frame').toBeLessThan(0.75)
  })
})
