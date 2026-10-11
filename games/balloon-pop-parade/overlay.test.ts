// template: cartridge/overlay.test.ts v2 (changed here with the overlay's gesture: a hold and three taps)
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { CORNER, EVERY_MS, HOLD_MS, Overlay, TAPS_WITHIN_MS } from './overlay'

const WIDTH = 1180
/** A point inside the corner that takes the taps, and one in the middle of the surface. */
const CORNER_AT = [WIDTH - CORNER / 2, CORNER / 2] as const
const MIDDLE = [WIDTH / 2, 400] as const

function mount(search = '') {
  const root = document.createElement('div')
  const overlay = new Overlay(root, search)
  const box = root.querySelector('[data-perf-overlay]') as HTMLElement
  return {
    root,
    overlay,
    box,
    /** Quick taps at `at`, one at each of `times`: down, and up a tenth of a second later. */
    taps(at: readonly [number, number], times: number[]): void {
      for (const time of times) {
        overlay.press(at[0], at[1], WIDTH, time)
        overlay.lift(at[0], at[1], WIDTH, time + 100)
      }
    },
    /** A finger down at `at` from `from`, lifted at `lifted` after `ms`. */
    hold(at: readonly [number, number], from: number, ms: number, lifted: readonly [number, number] = at): void {
      overlay.press(at[0], at[1], WIDTH, from)
      overlay.lift(lifted[0], lifted[1], WIDTH, from + ms)
    },
  }
}

describe('the grown-up performance overlay', () => {
  it('is hidden until a finger is held a second in the top right corner, lifted there, and taps there three times within three seconds; and hides again the same way', () => {
    const { box, taps, hold } = mount()
    expect(box.style.display).toBe('none')
    hold(CORNER_AT, 0, HOLD_MS)
    expect(box.style.display).toBe('none')
    taps(CORNER_AT, [HOLD_MS + 500, HOLD_MS + 1500])
    expect(box.style.display).toBe('none')
    // The third tap lands on the last moment of the three seconds.
    taps(CORNER_AT, [HOLD_MS + TAPS_WITHIN_MS])
    expect(box.style.display).toBe('block')
    // Three taps alone do not hide it: the hold comes first again.
    taps(CORNER_AT, [10_000, 10_200, 10_400])
    expect(box.style.display).toBe('block')
    hold(CORNER_AT, 20_000, HOLD_MS + 300)
    taps(CORNER_AT, [22_000, 22_300, 22_600])
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a child who drums on the corner, however fast or long', () => {
    const { box, taps } = mount()
    // Three quick taps, which opened the template's overlay; then five a second for half a minute.
    taps(CORNER_AT, [0, 200, 400])
    taps(CORNER_AT, Array.from({ length: 150 }, (_, i) => 1000 + i * 200))
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a hold that is too short, that lifts outside the corner or starts outside it, by taps that come too late, by a touch elsewhere in between, or by a hold alone', () => {
    const { overlay, box, taps, hold } = mount()
    hold(CORNER_AT, 0, HOLD_MS - 1)
    taps(CORNER_AT, [1100, 1300, 1500])
    // Held long enough, and slid out of the corner before the lift.
    hold(CORNER_AT, 10_000, HOLD_MS + 200, MIDDLE)
    taps(CORNER_AT, [11_400, 11_600, 11_800])
    // Just outside the corner on either side.
    hold([WIDTH - CORNER - 1, CORNER / 2], 20_000, HOLD_MS + 200)
    taps(CORNER_AT, [21_400, 21_600, 21_800])
    hold([WIDTH - CORNER / 2, CORNER + 1], 30_000, HOLD_MS + 200)
    taps(CORNER_AT, [31_400, 31_600, 31_800])
    // The third tap a moment after the three seconds are over.
    hold(CORNER_AT, 40_000, HOLD_MS)
    taps(CORNER_AT, [41_500, 42_500, 40_000 + HOLD_MS + TAPS_WITHIN_MS + 1])
    // A touch in the middle of the surface between the taps.
    hold(CORNER_AT, 50_000, HOLD_MS)
    taps(CORNER_AT, [51_200, 51_400])
    taps(MIDDLE, [51_600])
    taps(CORNER_AT, [51_800, 52_000])
    // A hold, and nothing after it; and hold after hold.
    hold(CORNER_AT, 60_000, 5 * HOLD_MS)
    hold(CORNER_AT, 70_000, HOLD_MS)
    hold(CORNER_AT, 80_000, HOLD_MS)
    // A finger the browser took away did not lift in the corner.
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, 90_000)
    overlay.lift(-1, -1, WIDTH, 92_000)
    taps(CORNER_AT, [92_200, 92_400, 92_600])
    // A surface that has not been measured has no corner.
    overlay.press(0, 0, 0, 100_000)
    overlay.lift(0, 0, 0, 102_000)
    for (const time of [102_200, 102_400, 102_600]) overlay.press(0, 0, 0, time)
    expect(box.style.display).toBe('none')
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
    const { overlay, box, taps, hold } = mount()
    for (let i = 1; i <= 100; i++) overlay.frame(i * 100, 100, 50, 3, 1, 1)
    expect(box.textContent).toBe('')
    hold(CORNER_AT, 0, HOLD_MS)
    taps(CORNER_AT, [1200, 1400, 1600])
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
