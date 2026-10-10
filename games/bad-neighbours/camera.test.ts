import { describe, expect, it } from 'vitest'
import { CELL, FLOOR, Game, STEP, type SavedPiece } from './model'
import { HOME_CONTROL_BOTTOM, cameraTarget, streetLayout } from './camera'

// The tallest thing that can wait at the top: the red row stood on end, above towers of every height.
function waitingTops() {
  const tops: { height: number; top: number }[] = []
  for (let floors = 0; floors <= 40; floors++) {
    const restore: SavedPiece[] = Array.from({ length: floors }, (_, i) => ({ shape: 'O', x: 0, y: FLOOR - CELL - i * 2 * CELL, angle: 0, secured: true }))
    const game = new Game(1, undefined, { restore, next: ['I', 'O', 'O'] })
    game.advance(STEP)
    expect(game.waiting).toBe(true)
    const flat = game.active!.body.bounds.min.y
    expect(game.rotate()).toBe(true)
    game.waiting = true
    game.advance(STEP)
    tops.push({ height: game.maxHeight * CELL, top: Math.min(flat, game.active!.body.bounds.min.y) })
    game.dispose()
  }
  return tops
}

describe('the view of the street', () => {
  it('a waiting delivery never hangs under the home control, at any tower height or surface size', () => {
    const tops = waitingTops()
    expect(tops[40].height).toBe(80 * CELL)
    for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180], [390, 700], [800, 360], [320, 480]]) {
      const layout = streetLayout(width, height)
      for (const { height: tower, top } of tops) {
        const y = layout.base + (top - FLOOR + cameraTarget(tower, layout)) * layout.scale
        expect(y, `${width}x${height}, tower ${tower}`).toBeGreaterThanOrEqual(HOME_CONTROL_BOTTOM)
      }
    }
  })

  it('a short tower is seen whole, slab and all', () => {
    for (const [width, height] of [[1180, 820], [390, 700], [800, 360]]) expect(cameraTarget(3 * CELL, streetLayout(width, height))).toBe(0)
  })
})
