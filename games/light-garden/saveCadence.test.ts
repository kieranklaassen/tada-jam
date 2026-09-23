import { describe, expect, it } from 'vitest'
import { SaveCadence } from './saveCadence'

describe('save cadence', () => {
  it('saves immediately when asked, and at most once per window otherwise', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 400)
    cadence.change(0, true)
    expect(saves).toBe(1)
    cadence.change(100)
    cadence.change(200)
    expect(saves).toBe(1)
    cadence.change(450)
    expect(saves).toBe(2)
  })

  it('settle flushes a pending change, and only a pending one', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 400)
    cadence.settle(0)
    expect(saves).toBe(0)
    cadence.change(0)
    cadence.change(10)
    expect(saves).toBe(1)
    cadence.settle(20)
    expect(saves).toBe(2)
    cadence.settle(30)
    expect(saves).toBe(2)
  })
})
