import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_CATCH_UP_STEPS, createStepper, startFrameLoop, startLoop } from './loop.ts'
import { TICK_MS } from './sim.ts'

describe('createStepper', () => {
  it('runs whole steps only and keeps the remainder', () => {
    const stepper = createStepper(33)
    expect(stepper.advance(10)).toBe(0)
    expect(stepper.advance(10)).toBe(0)
    // 10 + 10 + 20 = 40 carried: one step, 7 left over.
    expect(stepper.advance(20)).toBe(1)
    // 7 + 26 = 33 exactly: one more step.
    expect(stepper.advance(26)).toBe(1)
    expect(stepper.advance(0)).toBe(0)
  })

  it('runs several steps for a long frame', () => {
    const stepper = createStepper(33)
    expect(stepper.advance(100)).toBe(3)
    // 1 ms left over from the 100.
    expect(stepper.advance(32)).toBe(1)
  })

  it('caps catch-up at 5 steps per call and drops the backlog', () => {
    expect(MAX_CATCH_UP_STEPS).toBe(5)
    const stepper = createStepper(33)
    expect(stepper.advance(33 * 50)).toBe(5)
    // The backlog is gone: nothing more runs without new time.
    expect(stepper.advance(0)).toBe(0)
    expect(stepper.advance(32)).toBe(0)
  })

  it('ignores negative and non-finite time', () => {
    const stepper = createStepper(33)
    expect(stepper.advance(-500)).toBe(0)
    expect(stepper.advance(Number.NaN)).toBe(0)
    expect(stepper.advance(Number.POSITIVE_INFINITY)).toBe(0)
    expect(stepper.advance(33)).toBe(1)
  })

  it('counts the same total steps however the time is sliced', () => {
    const stepper = createStepper(TICK_MS)
    let total = 0
    for (let i = 0; i < 100; i++) total += stepper.advance(16)
    expect(total).toBe(Math.floor(1600 / TICK_MS))
  })

  it('reset forgets the remainder', () => {
    const stepper = createStepper(33)
    stepper.advance(30)
    stepper.reset()
    expect(stepper.advance(10)).toBe(0)
  })
})

// A hand-driven requestAnimationFrame and document, so the loop runs in Node.
function stubBrowser() {
  const callbacks = new Map<number, (now: number) => void>()
  const listeners = new Map<string, Set<() => void>>()
  let nextId = 1
  const doc = {
    hidden: false,
    addEventListener(type: string, fn: () => void) {
      const set = listeners.get(type) ?? new Set()
      set.add(fn)
      listeners.set(type, set)
    },
    removeEventListener(type: string, fn: () => void) {
      listeners.get(type)?.delete(fn)
    },
  }
  vi.stubGlobal('document', doc)
  vi.stubGlobal('requestAnimationFrame', (fn: (now: number) => void) => {
    const id = nextId++
    callbacks.set(id, fn)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    callbacks.delete(id)
  })
  return {
    doc,
    // Run every pending frame callback once at the given timestamp.
    frame(now: number) {
      const pending = [...callbacks.values()]
      callbacks.clear()
      for (const fn of pending) fn(now)
    },
    pending: () => callbacks.size,
    fire(type: string) {
      for (const fn of listeners.get(type) ?? []) fn()
    },
    listenerCount: (type: string) => listeners.get(type)?.size ?? 0,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('startLoop', () => {
  it('runs one step per whole tick of real time and draws every frame', () => {
    const browser = stubBrowser()
    const step = vi.fn()
    const draw = vi.fn()
    startLoop({ step, draw })
    browser.frame(1000) // first frame: no elapsed time yet
    expect(step).toHaveBeenCalledTimes(0)
    expect(draw).toHaveBeenCalledTimes(1)
    browser.frame(1000 + TICK_MS * 2 + 5)
    expect(step).toHaveBeenCalledTimes(2)
    expect(draw).toHaveBeenCalledTimes(2)
  })

  it('does not burst to catch up after the tab was hidden', () => {
    const browser = stubBrowser()
    const step = vi.fn()
    const draw = vi.fn()
    startLoop({ step, draw })
    browser.frame(0)
    browser.frame(TICK_MS)
    expect(step).toHaveBeenCalledTimes(1)

    // Hidden for a minute: a frame that does arrive runs and draws nothing.
    browser.doc.hidden = true
    browser.fire('visibilitychange')
    browser.frame(60_000)
    expect(step).toHaveBeenCalledTimes(1)
    expect(draw).toHaveBeenCalledTimes(2)

    // Back again: the first visible frame drops the elapsed time.
    browser.doc.hidden = false
    browser.fire('visibilitychange')
    browser.frame(120_000)
    expect(step).toHaveBeenCalledTimes(1)
    browser.frame(120_000 + TICK_MS)
    expect(step).toHaveBeenCalledTimes(2)
  })

  it('caps a long frame at the catch-up limit', () => {
    const browser = stubBrowser()
    const step = vi.fn()
    startLoop({ step, draw: () => {} })
    browser.frame(0)
    browser.frame(TICK_MS * 100)
    expect(step).toHaveBeenCalledTimes(MAX_CATCH_UP_STEPS)
  })

  it('stops cleanly', () => {
    const browser = stubBrowser()
    const step = vi.fn()
    const loop = startLoop({ step, draw: () => {} })
    expect(browser.listenerCount('visibilitychange')).toBe(1)
    loop.stop()
    expect(browser.pending()).toBe(0)
    expect(browser.listenerCount('visibilitychange')).toBe(0)
    browser.frame(TICK_MS * 10)
    expect(step).toHaveBeenCalledTimes(0)
  })
})

describe('startFrameLoop', () => {
  it('reports real elapsed time, zero on the first frame and after a hidden gap', () => {
    const browser = stubBrowser()
    const seen: number[] = []
    startFrameLoop((dtMs) => seen.push(dtMs))
    browser.frame(100)
    browser.frame(116)
    browser.doc.hidden = true
    browser.fire('visibilitychange')
    browser.frame(5000)
    browser.doc.hidden = false
    browser.fire('visibilitychange')
    browser.frame(9000)
    browser.frame(9016)
    expect(seen).toEqual([0, 16, 0, 16])
  })
})
