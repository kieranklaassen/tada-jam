// template: cartridge/overlay.test.ts v2
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { ARMED_MS, EVERY_MS, HOLD_MS, Overlay, WITHIN_MS } from './overlay'

function mount(search = '') {
  const root = document.createElement('div')
  const overlay = new Overlay(root, search)
  const box = root.querySelector('[data-perf-overlay]') as HTMLElement
  return {
    root,
    overlay,
    box,
    /** A finger down in the corner at `from` and lifted at `to`, in the corner unless said otherwise. */
    hold(from: number, to: number, liftedInCorner = true): void {
      overlay.press(true, from)
      overlay.lift(liftedInCorner, to)
    },
    /** Quick taps, a touch-down at each of `times` and a lift a moment after, in the corner or out of it. */
    taps(times: number[], inCorner = true): void {
      for (const time of times) {
        overlay.press(inCorner, time)
        overlay.lift(inCorner, time + 40)
      }
    },
  }
}

describe('the grown-up performance overlay', () => {
  it('is hidden until a finger is held a second in the corner, lifted there, and three quick taps follow; and hides again the same way', () => {
    const { box, hold, taps } = mount()
    expect(box.style.display).toBe('none')
    hold(0, HOLD_MS)
    expect(box.style.display).toBe('none')
    taps([HOLD_MS + 300, HOLD_MS + 500])
    expect(box.style.display).toBe('none')
    taps([HOLD_MS + 700])
    expect(box.style.display).toBe('block')
    hold(10_000, 10_000 + HOLD_MS + 200)
    taps([11_500, 11_700, 11_900])
    expect(box.style.display).toBe('none')
  })

  it('is not opened by three quick taps alone, however often a child drums in the corner', () => {
    const { box, taps } = mount()
    taps([0, 150, 300])
    taps([1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900])
    expect(box.style.display).toBe('none')
    // Nor by three fingers landing there together and lifting together.
    const { overlay, box: other } = mount()
    for (const time of [0, 5, 10]) overlay.press(true, time)
    for (const time of [60, 65, 70]) overlay.lift(true, time)
    expect(other.style.display).toBe('none')
  })

  it('is not opened by a hold that is too short, or lifted outside the corner, or by taps that are slow, late or elsewhere', () => {
    const { box, hold, taps } = mount()
    // Lifted too soon.
    hold(0, HOLD_MS - 1)
    taps([HOLD_MS + 200, HOLD_MS + 400, HOLD_MS + 600])
    // Held long enough, and slid out of the corner before lifting.
    hold(5000, 5000 + HOLD_MS + 100, false)
    taps([6500, 6700, 6900])
    // Held and lifted there, but the taps come too far apart.
    hold(10_000, 10_000 + HOLD_MS)
    taps([11_200, 11_200 + WITHIN_MS, 11_200 + 2 * WITHIN_MS + 1])
    // Held and lifted there, but the taps start too late.
    hold(20_000, 20_000 + HOLD_MS)
    taps([20_000 + HOLD_MS + ARMED_MS + 1, 20_000 + HOLD_MS + ARMED_MS + 200, 20_000 + HOLD_MS + ARMED_MS + 400])
    // Held and lifted there, and a touch anywhere else comes before the taps are done.
    hold(30_000, 30_000 + HOLD_MS)
    taps([31_200, 31_400])
    taps([31_500], false)
    taps([31_600])
    // Held and lifted there, and the taps are somewhere else.
    hold(40_000, 40_000 + HOLD_MS)
    taps([41_200, 41_400, 41_600], false)
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
    const { overlay, box, hold, taps } = mount()
    for (let i = 1; i <= 100; i++) overlay.frame(i * 100, 100, 50, 3, 1, 1)
    expect(box.textContent).toBe('')
    hold(0, HOLD_MS)
    taps([HOLD_MS + 100, HOLD_MS + 200, HOLD_MS + 300])
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
