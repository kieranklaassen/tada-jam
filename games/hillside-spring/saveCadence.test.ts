import { describe, expect, it } from 'vitest'
import { SaveCadence } from './saveCadence'

describe('SaveCadence', () => {
  it('saves building at once and growth at most once per window, then once more when it settles', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 2)
    cadence.now(0)
    expect(saves).toBe(1)
    cadence.soon(0.5)
    cadence.soon(1)
    expect(saves).toBe(1)
    cadence.soon(2.1)
    expect(saves).toBe(2)
    cadence.soon(2.5)
    cadence.settle(3)
    expect(saves).toBe(3)
    cadence.settle(4)
    expect(saves).toBe(3)
  })
})
