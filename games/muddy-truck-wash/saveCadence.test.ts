// template: cartridge/saveCadence.test.ts v1
import { describe, expect, it } from 'vitest'
import { SAVE_THROTTLE_MS } from './config'
import { SaveCadence } from './saveCadence'

describe('SaveCadence', () => {
  it('saves a discrete change at once', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++)
    cadence.change(0, true)
    cadence.change(1, true)
    expect(saves).toBe(2)
  })

  it('throttles a change that keeps coming, and writes the newest when it ends', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++)
    const step = SAVE_THROTTLE_MS / 8
    for (let t = 0; t < SAVE_THROTTLE_MS * 2.5; t += step) cadence.change(t)
    expect(saves).toBe(3)
    cadence.settle(SAVE_THROTTLE_MS * 2.5)
    expect(saves).toBe(4)
    cadence.settle(SAVE_THROTTLE_MS * 3)
    expect(saves).toBe(4)
  })

  it('remembers a change that is still moving and writes it when it comes to rest', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++)
    cadence.settle(0)
    expect(saves).toBe(0)
    cadence.mark()
    cadence.mark()
    expect(saves).toBe(0)
    cadence.settle(10)
    expect(saves).toBe(1)
  })
})
