import { describe, expect, it } from 'vitest'
import { SaveCadence } from './saveCadence'

describe('SaveCadence', () => {
  it('saves discrete changes at once', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++)
    cadence.change(0, true)
    cadence.change(10, true)
    expect(saves).toBe(2)
  })

  it('throttles a painting stroke and flushes it when the stroke ends', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 400)
    for (let t = 0; t < 1000; t += 50) cadence.change(t)
    expect(saves).toBe(3)
    cadence.settle(1000)
    expect(saves).toBe(4)
    cadence.settle(1100)
    expect(saves).toBe(4)
  })
})
