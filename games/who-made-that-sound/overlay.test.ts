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
    /** Quick taps at `at`, one at each of `times`: a touch-down, and the lift a moment later. */
    taps(at: readonly [number, number], times: number[]): void {
      for (const time of times) { overlay.press(at[0], at[1], WIDTH, time); overlay.release(at[0], at[1], WIDTH, time + 60) }
    },
    /** A finger down at `at` from `from` and lifted at `to`, at `at` or at `lift`. */
    hold(at: readonly [number, number], from: number, to: number, lift: readonly [number, number] = at): void {
      overlay.press(at[0], at[1], WIDTH, from)
      overlay.release(lift[0], lift[1], WIDTH, to)
    },
  }
}

describe('the grown-up performance overlay', () => {
  it('is hidden until a finger has rested a second in the top right corner and lifted there, and three quick taps have followed; the same hides it', () => {
    const { box, taps, hold } = mount()
    expect(box.style.display).toBe('none')
    hold(CORNER_AT, 0, HOLD_MS)
    taps(CORNER_AT, [HOLD_MS + 300, HOLD_MS + 600])
    expect(box.style.display).toBe('none')
    taps(CORNER_AT, [HOLD_MS + 900])
    expect(box.style.display).toBe('block')
    // Three more taps alone do not hide it: the hold comes first again.
    taps(CORNER_AT, [5000, 5200, 5400])
    expect(box.style.display).toBe('block')
    hold(CORNER_AT, 6000, 6000 + HOLD_MS + 200)
    taps(CORNER_AT, [7500, 7800, 8100])
    expect(box.style.display).toBe('none')
  })

  it('is not opened by drumming in the corner, however fast and however long: a child may drum on bare page', () => {
    const { box, taps } = mount()
    taps(CORNER_AT, Array.from({ length: 60 }, (_, i) => i * 150))
    taps(CORNER_AT, [20000, 20100, 20200])
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a short hold, a hold lifted elsewhere, slow taps after the hold, taps anywhere else, or a tap elsewhere in between', () => {
    const { overlay, box, taps, hold } = mount()
    // Too short a hold.
    hold(CORNER_AT, 0, HOLD_MS - 1)
    taps(CORNER_AT, [HOLD_MS + 200, HOLD_MS + 400, HOLD_MS + 600])
    // Held long enough, and slid out of the corner before the lift.
    hold(CORNER_AT, 5000, 5000 + HOLD_MS + 100, MIDDLE)
    taps(CORNER_AT, [6300, 6500, 6700])
    // The first tap comes too late after the lift, or one tap too late after another.
    hold(CORNER_AT, 10000, 10000 + HOLD_MS)
    taps(CORNER_AT, [10000 + HOLD_MS + WITHIN_MS + 1, 12000, 12200])
    hold(CORNER_AT, 15000, 15000 + HOLD_MS)
    taps(CORNER_AT, [16200, 16200 + WITHIN_MS + 1, 17100])
    // The taps land outside the corner, or one of them does.
    hold(CORNER_AT, 20000, 20000 + HOLD_MS)
    taps(MIDDLE, [21200, 21400, 21600])
    hold(CORNER_AT, 25000, 25000 + HOLD_MS)
    taps([WIDTH - CORNER - 1, CORNER / 2], [26200, 26400, 26600])
    hold(CORNER_AT, 30000, 30000 + HOLD_MS)
    taps([WIDTH - CORNER / 2, CORNER + 1], [31200, 31400, 31600])
    hold(CORNER_AT, 35000, 35000 + HOLD_MS)
    taps(CORNER_AT, [36200, 36400])
    taps(MIDDLE, [36500])
    taps(CORNER_AT, [36600])
    // A hold that was cut off, as when a second finger or a palm comes down: the Mount passes no place for it.
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, 40000)
    overlay.release(-1, 0, WIDTH, 40000 + HOLD_MS + 100)
    taps(CORNER_AT, [41300, 41500, 41700])
    // A surface that has not been measured has no corner.
    overlay.press(0, 0, 0, 50000)
    overlay.release(0, 0, 0, 50000 + HOLD_MS)
    for (const time of [51100, 51200, 51300]) overlay.press(0, 0, 0, time)
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
    taps(CORNER_AT, [HOLD_MS + 200, HOLD_MS + 400, HOLD_MS + 600])
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
