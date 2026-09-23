import { describe, expect, it, vi } from 'vitest'
import { SaveCadence } from './saveCadence'

describe('SaveCadence', () => {
  it('saves when a drag ends', () => {
    const save = vi.fn()
    const cadence = new SaveCadence(save, 400)
    cadence.change(1000, true)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('throttles saves during a drag but still saves the first move', () => {
    const save = vi.fn()
    const cadence = new SaveCadence(save, 400)
    for (let t = 0; t < 1000; t += 16) cadence.change(t)
    expect(save).toHaveBeenCalledTimes(3)
  })

  it('saves a pending change when the table settles or attention drops', () => {
    const save = vi.fn()
    const cadence = new SaveCadence(save, 400)
    cadence.change(0)
    cadence.change(100)
    expect(save).toHaveBeenCalledTimes(1)
    cadence.settle(150)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('never saves when nothing changed', () => {
    const save = vi.fn()
    const cadence = new SaveCadence(save, 400)
    cadence.settle(0)
    cadence.settle(5000)
    expect(save).not.toHaveBeenCalled()
    cadence.markDirty()
    cadence.settle(6000)
    cadence.settle(7000)
    expect(save).toHaveBeenCalledTimes(1)
  })
})
