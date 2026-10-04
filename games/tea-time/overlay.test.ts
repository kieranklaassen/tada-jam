// template: cartridge/overlay.test.ts v2
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { APART_MS, ARMED_MS, CORNER, EVERY_MS, HOLD_MS, Overlay, WITHIN_MS } from './overlay'

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
  /** A finger held in the corner from `from` for `ms` and lifted there. */
  const held = (overlay: Overlay, from: number, ms: number, at: readonly [number, number] = CORNER_AT, leaves: readonly [number, number] = at) => {
    overlay.press(at[0], at[1], WIDTH, from)
    overlay.lift(leaves[0], leaves[1], WIDTH, from + ms)
  }
  /** Three taps, each down and up again, starting at `from`. */
  const three = (overlay: Overlay, from: number, apart = 200, at: readonly [number, number] = CORNER_AT) => {
    for (let i = 0; i < 3; i++) {
      overlay.press(at[0], at[1], WIDTH, from + i * apart)
      overlay.lift(at[0], at[1], WIDTH, from + i * apart + 60)
    }
  }

  it('is hidden until a finger is held a second in the top right corner, lifted there, and then taps three times; the same again hides it', () => {
    const { overlay, box } = mount()
    expect(box.style.display).toBe('none')
    held(overlay, 0, HOLD_MS)
    expect(box.style.display).toBe('none')
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, HOLD_MS + 500)
    overlay.lift(CORNER_AT[0], CORNER_AT[1], WIDTH, HOLD_MS + 560)
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, HOLD_MS + 500 + WITHIN_MS / 2)
    expect(box.style.display).toBe('none')
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, HOLD_MS + 500 + WITHIN_MS)
    expect(box.style.display).toBe('block')
    held(overlay, 10_000, HOLD_MS + 400)
    three(overlay, 12_000)
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a child who drums on the corner, however fast or long, with no held finger first', () => {
    const { overlay, box, taps } = mount()
    taps(CORNER_AT, [0, 200, 400, 600, 800, 1000, 1200])
    for (let i = 0; i < 40; i++) three(overlay, 2000 + i * 700)
    // A hold that is too short, and one that slides out of the corner before it lifts.
    held(overlay, 40_000, HOLD_MS - 1)
    three(overlay, 42_000)
    held(overlay, 50_000, HOLD_MS + 200, CORNER_AT, MIDDLE)
    three(overlay, 52_000)
    expect(box.style.display).toBe('none')
  })

  it('is not opened by taps that come too late or too slowly after the held finger, by taps anywhere else, or by a touch elsewhere in between', () => {
    const { overlay, box, taps } = mount()
    held(overlay, 0, HOLD_MS)
    three(overlay, HOLD_MS + ARMED_MS + 1)
    held(overlay, 10_000, HOLD_MS)
    three(overlay, 11_500, WITHIN_MS / 2 + 1)
    held(overlay, 20_000, HOLD_MS)
    three(overlay, 21_500, 200, MIDDLE)
    // Just outside the corner on either side.
    held(overlay, 30_000, HOLD_MS)
    three(overlay, 31_500, 200, [WIDTH - CORNER - 1, CORNER / 2])
    held(overlay, 40_000, HOLD_MS)
    three(overlay, 41_500, 200, [WIDTH - CORNER / 2, CORNER + 1])
    held(overlay, 50_000, HOLD_MS)
    taps(CORNER_AT, [51_500, 51_600])
    taps(MIDDLE, [51_700])
    taps(CORNER_AT, [51_800])
    // A surface that has not been measured has no corner to hold or tap.
    overlay.press(0, 0, 0, 60_000)
    overlay.lift(0, 0, 0, 61_500)
    for (const time of [62_000, 62_100, 62_200]) overlay.press(0, 0, 0, time)
    expect(box.style.display).toBe('none')
  })

  it('is not opened by three fingers or a palm that land in the corner together after the held finger', () => {
    const { overlay, box, taps } = mount()
    held(overlay, 0, HOLD_MS)
    taps(CORNER_AT, [2000, 2004, 2011])
    taps(CORNER_AT, [3000, 3000 + APART_MS - 1, 3000 + 2 * APART_MS - 2])
    expect(box.style.display).toBe('none')
    // Three taps one after another open it.
    held(overlay, 5000, HOLD_MS)
    taps(CORNER_AT, [7000, 7000 + APART_MS, 7000 + 2 * APART_MS])
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
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, 0)
    overlay.lift(CORNER_AT[0], CORNER_AT[1], WIDTH, HOLD_MS)
    taps(CORNER_AT, [HOLD_MS + 300, HOLD_MS + 400, HOLD_MS + 500])
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
