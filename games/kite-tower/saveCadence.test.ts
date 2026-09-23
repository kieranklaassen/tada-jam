import { describe, expect, it } from 'vitest'
import { SaveCadence } from './saveCadence'

describe('SaveCadence', () => {
  it('saves at once when asked', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++)
    cadence.change(0, true)
    cadence.change(10, true)
    expect(saves).toBe(2)
  })

  it('throttles a drag to one save per gap', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 400)
    cadence.change(0)
    cadence.change(100)
    cadence.change(300)
    expect(saves).toBe(1)
    cadence.change(450)
    expect(saves).toBe(2)
  })

  it('writes a pending change when things settle, and nothing otherwise', () => {
    let saves = 0
    const cadence = new SaveCadence(() => saves++, 400)
    cadence.settle(0)
    expect(saves).toBe(0)
    cadence.change(0)
    cadence.change(50)
    cadence.mark()
    cadence.settle(60)
    expect(saves).toBe(2)
    cadence.settle(70)
    expect(saves).toBe(2)
  })
})
