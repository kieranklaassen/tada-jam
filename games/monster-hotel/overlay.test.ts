// template: cartridge/overlay.test.ts v2
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { CORNER, EVERY_MS, HOLD_MS, Overlay, WITHIN_MS } from './overlay'

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
    /** Quick taps at `at`, one at each of `times`: down, and up 60 ms later. */
    taps(at: readonly [number, number], times: number[]): void {
      for (const time of times) { overlay.press(at[0], at[1], WIDTH, time); overlay.release(at[0], at[1], WIDTH, time + 60) }
    },
    /** A finger down at `at` at `from` and lifted at `liftAt` (or where it went down) at `until`. */
    hold(at: readonly [number, number], from: number, until: number, liftAt: readonly [number, number] = at): void {
      overlay.press(at[0], at[1], WIDTH, from)
      overlay.release(liftAt[0], liftAt[1], WIDTH, until)
    },
    /** The whole gesture, begun at `start`: a hold of a second, lifted in the corner, then three taps. */
    open(start: number): void {
      overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, start)
      overlay.release(CORNER_AT[0], CORNER_AT[1], WIDTH, start + HOLD_MS)
      for (const time of [300, 600, 900]) { overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, start + HOLD_MS + time); overlay.release(CORNER_AT[0], CORNER_AT[1], WIDTH, start + HOLD_MS + time + 60) }
    },
  }
}

describe('the grown-up performance overlay', () => {
  it('is hidden until a finger is held a second in the top right corner, lifted there, and three taps follow within three seconds; and hides again the same way', () => {
    const { box, hold, taps, open } = mount()
    expect(box.style.display).toBe('none')
    hold(CORNER_AT, 0, HOLD_MS)
    taps(CORNER_AT, [HOLD_MS + 500, HOLD_MS + 1500])
    expect(box.style.display).toBe('none')
    taps(CORNER_AT, [HOLD_MS + WITHIN_MS])
    expect(box.style.display).toBe('block')
    open(20_000)
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a drumming child: any number of quick taps in the corner, fast or slow, opens nothing', () => {
    const { box, taps } = mount()
    taps(CORNER_AT, Array.from({ length: 60 }, (_, i) => i * 120))
    taps(CORNER_AT, Array.from({ length: 30 }, (_, i) => 20_000 + i * 700))
    // A palm laid on the corner and three fingers landing together are three touch-downs at once and one lift: no hold lifted there is followed by three taps.
    taps(CORNER_AT, [60_000, 60_000, 60_000])
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a hold that is too short, lifted outside the corner or taken away, by taps that come too late, by taps anywhere else, or with a touch elsewhere in between', () => {
    const { overlay, box, hold, taps } = mount()
    hold(CORNER_AT, 0, HOLD_MS - 1)
    taps(CORNER_AT, [1200, 1400, 1600])
    // Held long enough, but the finger slid out of the corner before it lifted; or the browser took the touch away.
    hold(CORNER_AT, 10_000, 10_000 + HOLD_MS + 200, MIDDLE)
    taps(CORNER_AT, [11_500, 11_700, 11_900])
    hold(CORNER_AT, 20_000, 20_000 + HOLD_MS + 200, [-1, -1])
    taps(CORNER_AT, [21_500, 21_700, 21_900])
    // A good hold, and the third tap a moment too late.
    hold(CORNER_AT, 30_000, 30_000 + HOLD_MS)
    taps(CORNER_AT, [31_500, 32_500, 31_000 + WITHIN_MS + 1])
    // A good hold, and a touch elsewhere among the taps.
    hold(CORNER_AT, 40_000, 40_000 + HOLD_MS)
    taps(CORNER_AT, [41_300, 41_600])
    taps(MIDDLE, [41_800])
    taps(CORNER_AT, [42_000])
    // The whole gesture just outside the corner on either side, and in the middle.
    for (const [index, at] of ([[WIDTH - CORNER - 1, CORNER / 2], [WIDTH - CORNER / 2, CORNER + 1], MIDDLE] as const).entries()) {
      hold(at, 50_000 + index * 10_000, 50_000 + index * 10_000 + HOLD_MS)
      taps(at, [51_300 + index * 10_000, 51_600 + index * 10_000, 51_900 + index * 10_000])
    }
    // A surface that has not been measured has no corner.
    overlay.press(0, 0, 0, 90_000); overlay.release(0, 0, 0, 91_500)
    for (const time of [92_000, 92_300, 92_600]) { overlay.press(0, 0, 0, time); overlay.release(0, 0, 0, time + 60) }
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
    const { overlay, box, open } = mount()
    for (let i = 1; i <= 100; i++) overlay.frame(i * 100, 100, 50, 3, 1, 1)
    expect(box.textContent).toBe('')
    open(0)
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
