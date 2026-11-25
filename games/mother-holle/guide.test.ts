import { describe, expect, it } from 'vitest'
import { moveToShow } from './guide'
import { QUILT } from './layout'
import { Hand } from './testing'

describe('the hand', () => {
  it('points at the quilt, over the bare grass in front of whoever asks', () => {
    const h = new Hand()
    h.run(7)
    const m = moveToShow(h.v)
    expect(m.on).toBe('quilt')
    const end = h.v.snowEnds(h.v.asker!.x)
    expect(Math.abs(m.to.x - end)).toBeLessThan(2.6)
  })
  it('shows a tap where that is all it takes: an empty quilt, a whole white hill, the night', () => {
    const h = new Hand()
    for (let k = 0; k < 14 && !h.v.quilt.empty; k++) { h.drag(-9, 4, 10, 4, 1.4); h.run(0.4) }
    h.rest()
    expect(moveToShow(h.v)).toMatchObject({ drag: false, on: 'quilt' })
    const n = new Hand({ ...h.v.toState(), night: true })
    expect(moveToShow(n.v).drag).toBe(false)
  })
  it('is always a move that does something', () => {
    const h = new Hand()
    for (let k = 0; k < 20; k++) {
      h.rest(); h.run(0.5)
      const m = moveToShow(h.v)
      expect(m.to.x).toBeGreaterThanOrEqual(QUILT.left - 3)
      h.v.events.length = 0
      if (m.drag) h.drag(m.from.x, m.from.y, m.to.x, m.to.y, 0.8); else h.tap(m.from.x, m.from.y)
      expect(h.v.events.length).toBeGreaterThan(0)
    }
    expect(h.v.snow.total).toBeGreaterThan(0)
  })
})
