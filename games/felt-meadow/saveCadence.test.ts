import { describe, expect, it, vi } from 'vitest'
import { DRAG_SAVE_MS, SaveCadence } from './saveCadence'

describe('SaveCadence', () => {
  it('saves a meaningful change at once', () => {
    const save = vi.fn()
    const cadence = new SaveCadence(save)
    cadence.now(0)
    cadence.now(1)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('saves a drag at most every DRAG_SAVE_MS, then catches the tail when attention drops', () => {
    const save = vi.fn()
    const cadence = new SaveCadence(save)
    for (let at = 0; at < DRAG_SAVE_MS * 2; at += 16) cadence.moving(at)
    expect(save).toHaveBeenCalledTimes(2)
    cadence.settle(DRAG_SAVE_MS * 2)
    expect(save).toHaveBeenCalledTimes(3)
    cadence.settle(DRAG_SAVE_MS * 3)
    expect(save).toHaveBeenCalledTimes(3)
  })
})
