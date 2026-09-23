import { describe, expect, it } from 'vitest'
import { SaveCadence } from './saveCadence'

describe('SaveCadence', () => {
  it('saves at once when the child changes the bench', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 1500)
    cadence.now(0)
    cadence.now(10)
    expect(saves).toBe(2)
  })

  it('throttles wandering to one save per window', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 1500)
    for (let t = 0; t < 3000; t += 16) cadence.drift(t)
    expect(saves).toBe(2)
  })

  it('settles a pending drift when attention drops, and only then', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 1500)
    cadence.drift(0)
    cadence.drift(100)
    expect(saves).toBe(1)
    cadence.settle(200)
    expect(saves).toBe(2)
    cadence.settle(300)
    expect(saves).toBe(2)
  })
})
