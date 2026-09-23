import { describe, expect, it } from 'vitest'
import { DRAG_SAVE_THROTTLE_MS, SaveCadence } from './saveCadence'

describe('save cadence', () => {
  it('a drag saves at most once per throttle window, and the last position is saved when it settles', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++)
    for (let t = 0; t < 1000; t += 16) cadence.change(t)
    expect(saves).toBe(Math.ceil(1000 / DRAG_SAVE_THROTTLE_MS))
    cadence.settle(1000)
    expect(saves).toBe(Math.ceil(1000 / DRAG_SAVE_THROTTLE_MS) + 1)
  })

  it('a drop or a wake saves at once', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++)
    cadence.change(0)
    cadence.change(10, true)
    expect(saves).toBe(2)
  })

  it('settling with nothing new does not save', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++)
    cadence.settle(0)
    cadence.change(0)
    cadence.settle(5)
    cadence.settle(10)
    expect(saves).toBe(1)
  })
})
