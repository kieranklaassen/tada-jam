import { describe, expect, it } from 'vitest'
import { SaveCadence } from './saveCadence'

describe('SaveCadence', () => {
  it('saves at once when asked, and throttles carry changes', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 500)
    cadence.change(0, true)
    expect(saves).toBe(1)
    cadence.change(100)
    cadence.change(200)
    expect(saves).toBe(1)
    cadence.change(600)
    expect(saves).toBe(2)
  })

  it('settle flushes a pending change once', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 500)
    cadence.change(0, true)
    cadence.change(100)
    cadence.settle(150)
    cadence.settle(160)
    expect(saves).toBe(2)
  })
})
