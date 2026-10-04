// template: cartridge/overlay.test.ts v2
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { APART_MS, CORNER, EVERY_MS, Overlay, WITHIN_MS } from './overlay'

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
    /** Touch-downs at `at`, one at each of `times`. */
    taps(at: readonly [number, number], times: number[]): void {
      for (const time of times) overlay.press(at[0], at[1], WIDTH, time)
    },
  }
}

describe('the grown-up performance overlay', () => {
  it('is hidden until three quick taps in the top right corner, and hides again the same way', () => {
    const { box, taps } = mount()
    expect(box.style.display).toBe('none')
    taps(CORNER_AT, [0, WITHIN_MS / 2])
    expect(box.style.display).toBe('none')
    taps(CORNER_AT, [WITHIN_MS])
    expect(box.style.display).toBe('block')
    taps(CORNER_AT, [5000, 5200, 5400])
    expect(box.style.display).toBe('none')
  })

  it('is not opened by slow taps, by taps anywhere else, or by a tap elsewhere in between', () => {
    const { overlay, box, taps } = mount()
    taps(CORNER_AT, [0, WITHIN_MS, 2 * WITHIN_MS + 1, 3 * WITHIN_MS + 2])
    taps(MIDDLE, [5000, 5100, 5200])
    // Just outside the corner on either side.
    taps([WIDTH - CORNER - 1, CORNER / 2], [6000, 6100, 6200])
    taps([WIDTH - CORNER / 2, CORNER + 1], [7000, 7100, 7200])
    taps(CORNER_AT, [8000, 8100])
    taps(MIDDLE, [8200])
    taps(CORNER_AT, [8300])
    // A surface that has not been measured has no corner to tap.
    for (const time of [9000, 9100, 9200]) overlay.press(0, 0, 0, time)
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a hand slapped or laid on the corner: fingers down together, or one straight after another', () => {
    const { overlay, box, taps } = mount()
    // Four fingers of one slap, each counted as it lands while the others are still down.
    for (const [index, time] of [0, 15, 30, 45].entries()) overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, time, index + 1)
    expect(box.style.display).toBe('none')
    // Fingers drummed down one straight after another, each lifted before the next.
    taps(CORNER_AT, [1000, 1000 + APART_MS / 2, 1000 + APART_MS, 1000 + 1.5 * APART_MS, 1000 + 2 * APART_MS])
    expect(box.style.display).toBe('none')
    // A second finger resting elsewhere on the surface while the corner is tapped.
    for (const time of [3000, 3250, 3500]) overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, time, 2)
    expect(box.style.display).toBe('none')
    // Three deliberate taps of one finger still open it.
    taps(CORNER_AT, [5000, 5200, 5400])
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
    const { overlay, box, taps } = mount()
    for (let i = 1; i <= 100; i++) overlay.frame(i * 100, 100, 50, 3, 1, 1)
    expect(box.textContent).toBe('')
    taps(CORNER_AT, [0, 100, 200])
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
