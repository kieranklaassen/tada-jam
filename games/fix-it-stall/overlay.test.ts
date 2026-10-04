// template: cartridge/overlay.test.ts v2
// Changed in this game with overlay.ts: the gesture that opens it.
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { CORNER, EVERY_MS, HOLD_MS, Overlay, THEN_MS } from './overlay'

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
      for (const time of times) { overlay.press(at[0], at[1], WIDTH, time); overlay.lift(at[0], at[1], WIDTH, time + 60) }
    },
    /** A finger down at `at` at `from` and lifted at `liftAt` (there, unless said) at `to`. */
    hold(at: readonly [number, number], from: number, to: number, liftAt: readonly [number, number] = at): void {
      overlay.press(at[0], at[1], WIDTH, from)
      overlay.lift(liftAt[0], liftAt[1], WIDTH, to)
    },
    /** The whole gesture, begun at `from`: a hold of a second, then three taps. Returns when it ended. */
    open(from: number): number {
      overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, from)
      overlay.lift(CORNER_AT[0], CORNER_AT[1], WIDTH, from + HOLD_MS)
      for (const after of [300, 600, 900]) { overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, from + HOLD_MS + after); overlay.lift(CORNER_AT[0], CORNER_AT[1], WIDTH, from + HOLD_MS + after + 60) }
      return from + HOLD_MS + 960
    },
  }
}

describe('the grown-up performance overlay', () => {
  it('is hidden until a finger is held a second in the top right corner and lifted there, and three taps follow; and hides again the same way', () => {
    const { box, hold, taps, open } = mount()
    expect(box.style.display).toBe('none')
    hold(CORNER_AT, 0, HOLD_MS)
    expect(box.style.display).toBe('none')
    taps(CORNER_AT, [HOLD_MS + 300, HOLD_MS + 600])
    expect(box.style.display).toBe('none')
    taps(CORNER_AT, [HOLD_MS + 900])
    expect(box.style.display).toBe('block')
    open(10_000)
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a child who drums in the corner, however fast or however long, with one finger or with three at once', () => {
    const { overlay, box, taps } = mount()
    taps(CORNER_AT, Array.from({ length: 40 }, (_, i) => i * 150))
    taps(CORNER_AT, Array.from({ length: 12 }, (_, i) => 20_000 + i * 700))
    // Three fingers landing together, and lifting together, over and over.
    for (let round = 0; round < 6; round++) {
      for (let finger = 0; finger < 3; finger++) overlay.press(CORNER_AT[0] + finger * 8, CORNER_AT[1], WIDTH, 40_000 + round * 400 + finger * 10)
      for (let finger = 0; finger < 3; finger++) overlay.lift(CORNER_AT[0] + finger * 8, CORNER_AT[1], WIDTH, 40_000 + round * 400 + 200 + finger * 10)
    }
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a hold that is too short, or lifted outside the corner, or followed by too few taps, taps too late, or a tap elsewhere', () => {
    const { overlay, box, hold, taps } = mount()
    // Too short.
    hold(CORNER_AT, 0, HOLD_MS - 1)
    taps(CORNER_AT, [HOLD_MS + 200, HOLD_MS + 400, HOLD_MS + 600])
    // Long enough, but the finger slid out of the corner before it lifted.
    hold(CORNER_AT, 10_000, 10_000 + HOLD_MS, [WIDTH - CORNER - 20, CORNER / 2])
    taps(CORNER_AT, [11_200, 11_400, 11_600])
    // Only two taps, and then nothing until it is too late.
    hold(CORNER_AT, 20_000, 20_000 + HOLD_MS)
    taps(CORNER_AT, [21_300, 21_600])
    taps(CORNER_AT, [20_000 + HOLD_MS + THEN_MS + 1])
    // A tap elsewhere in between.
    hold(CORNER_AT, 30_000, 30_000 + HOLD_MS)
    taps(CORNER_AT, [31_300, 31_600])
    taps(MIDDLE, [31_700])
    taps(CORNER_AT, [31_900])
    // The whole gesture just outside the corner, on either side.
    for (const [n, at] of ([[WIDTH - CORNER - 1, CORNER / 2], [WIDTH - CORNER / 2, CORNER + 1], MIDDLE] as const).entries()) {
      hold(at, 40_000 + n * 5000, 40_000 + n * 5000 + HOLD_MS)
      taps(at, [41_300 + n * 5000, 41_600 + n * 5000, 41_900 + n * 5000])
    }
    // A touch the browser took away in the middle of the hold.
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, 60_000)
    overlay.forget()
    overlay.lift(CORNER_AT[0], CORNER_AT[1], WIDTH, 60_000 + HOLD_MS)
    taps(CORNER_AT, [61_300, 61_600, 61_900])
    // A surface that has not been measured has no corner.
    overlay.press(0, 0, 0, 70_000)
    overlay.lift(0, 0, 0, 70_000 + HOLD_MS)
    for (const time of [71_300, 71_600, 71_900]) overlay.press(0, 0, 0, time)
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
