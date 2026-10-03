// template: cartridge/attention.test.ts v2
import { describe, expect, it } from 'vitest'
import { AttendedClock, Attention, type VisibilitySource } from './attention'
import { LONGEST_FRAME_S } from './config'

/** A stand-in for `document`: `hide(true)` hides the page and tells the listener. */
function page() {
  const listeners = new Set<() => void>()
  const source = {
    hidden: false,
    addEventListener: (_type: 'visibilitychange', listener: () => void) => void listeners.add(listener),
    removeEventListener: (_type: 'visibilitychange', listener: () => void) => void listeners.delete(listener),
  }
  const hide = (hidden: boolean): void => {
    source.hidden = hidden
    for (const listener of listeners) listener()
  }
  return { source: source as VisibilitySource, hide, listeners }
}

describe('attention', () => {
  it('is awake only while attended and not hidden, and says so once per change', () => {
    const { source, hide } = page()
    const changes: boolean[] = []
    const attention = new Attention(source, (awake) => changes.push(awake))
    expect(attention.awake).toBe(false)
    attention.set(true)
    attention.set(true)
    hide(true)
    attention.set(false)
    hide(false)
    attention.set(true)
    expect(changes).toEqual([true, false, true])
    expect(attention.awake).toBe(true)
  })

  it('stays at rest when mounted parked or hidden', () => {
    const { source, hide } = page()
    const changes: boolean[] = []
    const attention = new Attention(source, (awake) => changes.push(awake))
    attention.set(false)
    hide(true)
    attention.set(true)
    expect(changes).toEqual([])
  })

  it('stops listening on dispose', () => {
    const { source, hide, listeners } = page()
    const changes: boolean[] = []
    const attention = new Attention(source, (awake) => changes.push(awake))
    attention.set(true)
    attention.dispose()
    hide(true)
    expect(listeners.size).toBe(0)
    expect(changes).toEqual([true])
  })
})

describe('the attended clock', () => {
  it('counts the time between frames, and gives the governor the raw interval', () => {
    const clock = new AttendedClock()
    expect(clock.advance(1000)).toBe(0)
    expect(clock.advance(1016)).toBeCloseTo(0.016)
    expect(clock.intervalMs).toBe(16)
    expect(clock.advance(1032)).toBeCloseTo(0.016)
    expect(clock.seconds).toBeCloseTo(0.032)
  })

  it('stands still across a rest: the first frame back plays no time', () => {
    const clock = new AttendedClock()
    clock.advance(0)
    clock.advance(500 * LONGEST_FRAME_S)
    const before = clock.seconds
    clock.rest()
    expect(clock.advance(600_000)).toBe(0)
    expect(clock.intervalMs).toBe(0)
    expect(clock.seconds).toBe(before)
  })

  it('never plays more than the longest frame at once, while the interval stays uncapped', () => {
    const clock = new AttendedClock()
    clock.advance(0)
    expect(clock.advance(900)).toBe(LONGEST_FRAME_S)
    expect(clock.intervalMs).toBe(900)
  })
})
