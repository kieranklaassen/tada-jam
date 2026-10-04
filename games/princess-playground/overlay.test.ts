// template: cartridge/overlay.test.ts v2
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { APART_MS, CORNER, EVERY_MS, HOLD_MS, Overlay, WITHIN_MS } from './overlay'

const WIDTH = 1180
/** A point inside the corner that takes the taps, and one in the middle of the surface. */
const CORNER_AT = [WIDTH - CORNER / 2, CORNER / 2] as const
const MIDDLE = [WIDTH / 2, 400] as const

function mount(search = '') {
  const root = document.createElement('div')
  const overlay = new Overlay(root, search)
  const box = root.querySelector('[data-perf-overlay]') as HTMLElement
  /** One finger down at `at` and up again there `ms` later. */
  const touch = (at: readonly [number, number], time: number, ms = 40, liftAt = at): void => {
    overlay.press(at[0], at[1], WIDTH, time)
    overlay.lift(liftAt[0], liftAt[1], WIDTH, time + ms)
  }
  return {
    root,
    overlay,
    box,
    touch,
    /** Short taps at `at`, one at each of `times`. */
    taps(at: readonly [number, number], times: number[]): void {
      for (const time of times) touch(at, time)
    },
    /** The whole gesture, begun at `time`: a hold in the corner, then three taps there. */
    gesture(time: number): void {
      touch(CORNER_AT, time, HOLD_MS)
      for (const after of [300, 600, 900]) touch(CORNER_AT, time + HOLD_MS + after)
    },
  }
}

describe('the grown-up performance overlay', () => {
  it('is hidden until one finger is held a second in the top right corner, lifted there, and taps three times there; and hides again the same way', () => {
    const { box, touch, taps, gesture } = mount()
    expect(box.style.display).toBe('none')
    touch(CORNER_AT, 0, HOLD_MS)
    taps(CORNER_AT, [HOLD_MS + 300, HOLD_MS + 600])
    expect(box.style.display).toBe('none')
    taps(CORNER_AT, [HOLD_MS + 900])
    expect(box.style.display).toBe('block')
    // Three more taps alone do not hide it: the whole gesture does.
    taps(CORNER_AT, [5000, 5300, 5600])
    expect(box.style.display).toBe('block')
    gesture(10_000)
    expect(box.style.display).toBe('none')
  })

  it('is not opened by drumming on the corner, however long and however fast', () => {
    const { box, taps } = mount()
    taps(CORNER_AT, Array.from({ length: 200 }, (_, index) => index * 150))
    taps(CORNER_AT, Array.from({ length: 200 }, (_, index) => 40_000 + index * 420))
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a hold that is too short, lifted outside the corner or made anywhere else, by taps that come too late, or by a touch elsewhere in between', () => {
    const { overlay, box, touch, taps } = mount()
    // Too short a hold.
    touch(CORNER_AT, 0, HOLD_MS - 50)
    taps(CORNER_AT, [1300, 1600, 1900])
    // Held long enough, and slid out of the corner before the lift.
    touch(CORNER_AT, 10_000, HOLD_MS, MIDDLE)
    taps(CORNER_AT, [11_300, 11_600, 11_900])
    // Held in the middle of the surface, and just outside the corner on either side.
    for (const [index, at] of [MIDDLE, [WIDTH - CORNER - 1, CORNER / 2], [WIDTH - CORNER / 2, CORNER + 1]].entries()) {
      touch(at as [number, number], 20_000 + index * 10_000, HOLD_MS)
      taps(CORNER_AT, [21_300 + index * 10_000, 21_600 + index * 10_000, 21_900 + index * 10_000])
    }
    // The third tap lands after the three seconds.
    touch(CORNER_AT, 60_000, HOLD_MS)
    taps(CORNER_AT, [61_000 + 500, 61_000 + 1500, 61_000 + WITHIN_MS + 1])
    // A touch elsewhere between the taps.
    touch(CORNER_AT, 70_000, HOLD_MS)
    taps(CORNER_AT, [71_300, 71_600])
    taps(MIDDLE, [71_800])
    taps(CORNER_AT, [72_000])
    // A surface that has not been measured has no corner.
    overlay.press(0, 0, 0, 80_000)
    overlay.lift(0, 0, 0, 80_000 + HOLD_MS)
    for (const time of [81_300, 81_600, 81_900]) overlay.press(0, 0, 0, time)
    // A hold the browser took away.
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, 90_000)
    overlay.cancel()
    overlay.lift(CORNER_AT[0], CORNER_AT[1], WIDTH, 90_000 + HOLD_MS)
    taps(CORNER_AT, [91_300, 91_600, 91_900])
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a hand laid or slapped on the corner: fingers down together, or one straight after another', () => {
    const { overlay, box, touch, taps, gesture } = mount()
    // A palm resting on the corner: a second finger is on the surface while the first holds.
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, 0, 1)
    overlay.press(MIDDLE[0], MIDDLE[1], WIDTH, 200, 2)
    overlay.lift(CORNER_AT[0], CORNER_AT[1], WIDTH, HOLD_MS + 200)
    taps(CORNER_AT, [1500, 1800, 2100])
    expect(box.style.display).toBe('none')
    // A real hold, and then four fingers of one slap, each counted as it lands while the others are still down.
    touch(CORNER_AT, 10_000, HOLD_MS)
    for (const [index, time] of [0, 15, 30, 45].entries()) overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, 11_300 + time, index + 1)
    expect(box.style.display).toBe('none')
    // A real hold, and then fingers drummed down one straight after another, each lifted before the next.
    touch(CORNER_AT, 20_000, HOLD_MS)
    for (const after of [0, APART_MS / 2, APART_MS, 1.5 * APART_MS, 2 * APART_MS]) touch(CORNER_AT, 21_300 + after, 10)
    expect(box.style.display).toBe('none')
    // The deliberate gesture of one finger still opens it.
    gesture(30_000)
    expect(box.style.display).toBe('block')
  })

  it('opens with fps=1 in the address, and with nothing else there', () => {
    expect(mount('?fps=1').box.style.display).toBe('block')
    expect(mount('?tier=2&fps=1').box.style.display).toBe('block')
    expect(mount('?fps=0').box.style.display).toBe('none')
    expect(mount('?tier=1').box.style.display).toBe('none')
  })

  it('shows the frame rate, the worst frame and the average work of the frames since it last wrote, with the tier and what was drawn', () => {
    const { overlay, box } = mount('?fps=1')
    // The first frame it sees is written at once; the next readout covers the frames after it.
    let now = 10_000
    overlay.frame(now, 20, 9, 1, 28, 35000)
    // Eighteen frames in 400 ms: sixteen on time with 2 ms of work, two that took twice as long with 11 ms.
    const quick = Array.from({ length: 8 }, () => 20)
    for (const interval of [...quick, 40, ...quick, 40]) {
      now += interval
      overlay.frame(now, interval, interval === 40 ? 11 : 2, 1, 28, 35000)
    }
    expect(now - 10_000).toBe(EVERY_MS)
    expect(box.textContent).toContain('45 fps')
    expect(box.textContent).toContain('worst 40 ms')
    expect(box.textContent).toContain('work 3.0 ms')
    expect(box.textContent).toContain('tier 1')
    expect(box.textContent).toContain('28 calls')
    expect(box.textContent).toContain('35000 tris')
  })

  it('writes nothing while it is hidden, and starts its numbers again when it is opened', () => {
    const { overlay, box, gesture } = mount()
    for (let i = 1; i <= 100; i++) overlay.frame(i * 100, 100, 50, 3, 1, 1)
    expect(box.textContent).toBe('')
    gesture(0)
    for (let i = 1; i <= 2 * (EVERY_MS / 10); i++) overlay.frame(20_000 + i * 10, 10, 1, 0, 2, 0)
    expect(box.textContent).toContain('100 fps')
    expect(box.textContent).toContain('worst 10 ms')
    expect(box.textContent).toContain('tier 0')
  })

  it('skips the first frame after a rest, which has no interval', () => {
    const { overlay, box } = mount('?fps=1')
    overlay.frame(50_000, 0, 1, 0, 0, 0)
    expect(box.textContent).toBe('')
  })

  it('never takes a touch from the game, and leaves nothing behind', () => {
    const { root, overlay, box } = mount()
    expect(box.style.pointerEvents).toBe('none')
    overlay.dispose()
    expect(root.children).toHaveLength(0)
  })
})
