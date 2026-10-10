// template: cartridge/overlay.test.ts v3
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { CORNER, EVERY_MS, HOLD_MS, Overlay, WITHIN_MS, inCorner } from './overlay'

const WIDTH = 1180
/** A point inside the corner that takes the gesture, and one in the middle of the surface. */
const CORNER_AT = [WIDTH - CORNER / 2, CORNER / 2] as const
const MIDDLE = [WIDTH / 2, 400] as const

function mount(search = '') {
  const root = document.createElement('div')
  const overlay = new Overlay(root, search)
  const box = root.querySelector('[data-perf-overlay]') as HTMLElement
  /** A finger down at `at` at `from`, and lifted at `liftAt` (or where it went down) at `until`. */
  const hold = (at: readonly [number, number], from: number, until: number, liftAt: readonly [number, number] = at): void => {
    overlay.press(at[0], at[1], WIDTH, from)
    overlay.lift(liftAt[0], liftAt[1], WIDTH, until)
  }
  /** Quick taps at `at`, one at each of `times`: down, and up 60 ms later. */
  const taps = (at: readonly [number, number], times: number[]): void => {
    for (const time of times) hold(at, time, time + 60)
  }
  /** The whole gesture, begun at `start`: a hold of a second, lifted in the corner, then three taps. */
  const open = (start: number): void => {
    hold(CORNER_AT, start, start + HOLD_MS)
    taps(CORNER_AT, [start + HOLD_MS + 300, start + HOLD_MS + 600, start + HOLD_MS + 900])
  }
  /**
   * The same touches for a test of what must not open it. The box is looked at after every one, since the gesture
   * that shows it also hides it: looked at only at the end, a box opened twice would pass for one never opened.
   */
  const hidden = (): void => expect(box.style.display).toBe('none')
  const never = {
    hold(at: readonly [number, number], from: number, until: number, liftAt: readonly [number, number] = at): void {
      hold(at, from, until, liftAt)
      hidden()
    },
    taps(at: readonly [number, number], times: number[]): void {
      for (const time of times) never.hold(at, time, time + 60)
    },
  }
  return { root, overlay, box, hold, taps, open, hidden, never }
}

describe('the grown-up performance overlay', () => {
  it('is hidden until a finger is held a second in the top right corner, lifted there, and three taps follow within three seconds; and hides again the same way', () => {
    const { box, hold, taps, open, never } = mount()
    expect(box.style.display).toBe('none')
    never.hold(CORNER_AT, 0, HOLD_MS)
    never.taps(CORNER_AT, [HOLD_MS + 500, HOLD_MS + 1500])
    taps(CORNER_AT, [HOLD_MS + WITHIN_MS])
    expect(box.style.display).toBe('block')
    // The same again hides it, and not before its third tap.
    hold(CORNER_AT, 20_000, 20_000 + HOLD_MS)
    taps(CORNER_AT, [20_000 + HOLD_MS + 300, 20_000 + HOLD_MS + 600])
    expect(box.style.display).toBe('block')
    taps(CORNER_AT, [20_000 + HOLD_MS + 900])
    expect(box.style.display).toBe('none')
    open(40_000)
    expect(box.style.display).toBe('block')
  })

  it('is not opened by a drumming child: any number of quick taps in the corner, fast or slow, opens nothing', () => {
    const { never } = mount()
    never.taps(CORNER_AT, Array.from({ length: 60 }, (_, i) => i * 120))
    never.taps(CORNER_AT, Array.from({ length: 30 }, (_, i) => 20_000 + i * 700))
    // Taps so slow that each rests most of a second, and still none is a hold.
    for (let i = 0; i < 12; i++) never.hold(CORNER_AT, 60_000 + i * 1200, 60_000 + i * 1200 + HOLD_MS - 1)
  })

  it('is not opened by a hold that is too short, that slid out of the corner or that was taken away', () => {
    const { overlay, hidden, never } = mount()
    never.hold(CORNER_AT, 0, HOLD_MS - 1)
    never.taps(CORNER_AT, [1200, 1400, 1600])
    // Held long enough, but the finger slid out of the corner before it lifted.
    never.hold(CORNER_AT, 10_000, 10_000 + HOLD_MS + 200, MIDDLE)
    never.taps(CORNER_AT, [11_500, 11_700, 11_900])
    // Held long enough, and then the surface was parked or the browser took the finger: its lift never came.
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, 20_000)
    overlay.forget()
    overlay.lift(CORNER_AT[0], CORNER_AT[1], WIDTH, 20_000 + HOLD_MS + 200)
    hidden()
    never.taps(CORNER_AT, [21_500, 21_700, 21_900])
  })

  it('is not opened by a finger that lands in the corner, plays over the game for a second and comes back to lift there', () => {
    const { overlay, hidden, never } = mount()
    overlay.press(CORNER_AT[0], CORNER_AT[1], WIDTH, 0)
    overlay.move(MIDDLE[0], MIDDLE[1], WIDTH)
    overlay.move(CORNER_AT[0], CORNER_AT[1], WIDTH)
    overlay.lift(CORNER_AT[0], CORNER_AT[1], WIDTH, HOLD_MS + 200)
    hidden()
    never.taps(CORNER_AT, [HOLD_MS + 500, HOLD_MS + 800, HOLD_MS + 1100])
    // A finger that only shifts inside the corner while it rests is still holding.
    const { overlay: still, box, taps } = mount()
    still.press(CORNER_AT[0], CORNER_AT[1], WIDTH, 0)
    still.move(WIDTH - 2, 2, WIDTH)
    still.move(WIDTH - CORNER + 2, CORNER - 2, WIDTH)
    still.lift(CORNER_AT[0], CORNER_AT[1], WIDTH, HOLD_MS)
    taps(CORNER_AT, [HOLD_MS + 300, HOLD_MS + 600, HOLD_MS + 900])
    expect(box.style.display).toBe('block')
  })

  it('is not opened by taps that come too late, by a touch elsewhere among them, or by the gesture made anywhere else', () => {
    const { overlay, hidden, never } = mount()
    // A good hold, and the third tap a moment too late. That tap is no fourth of a later run either.
    never.hold(CORNER_AT, 0, HOLD_MS)
    never.taps(CORNER_AT, [HOLD_MS + 500, HOLD_MS + 1500, HOLD_MS + WITHIN_MS + 1, HOLD_MS + WITHIN_MS + 300, HOLD_MS + WITHIN_MS + 600])
    // A good hold, and a touch elsewhere among the taps.
    never.hold(CORNER_AT, 10_000, 10_000 + HOLD_MS)
    never.taps(CORNER_AT, [11_300, 11_600])
    never.taps(MIDDLE, [11_800])
    never.taps(CORNER_AT, [12_000])
    // The whole gesture just outside the corner on either side, and in the middle.
    for (const [index, at] of ([[WIDTH - CORNER - 1, CORNER / 2], [WIDTH - CORNER / 2, CORNER + 1], MIDDLE] as const).entries()) {
      const start = 20_000 + index * 10_000
      never.hold(at, start, start + HOLD_MS)
      never.taps(at, [start + 1300, start + 1600, start + 1900])
    }
    // A surface that has not been measured has no corner.
    overlay.press(0, 0, 0, 60_000)
    overlay.lift(0, 0, 0, 61_500)
    for (const time of [62_000, 62_300, 62_600]) {
      overlay.press(0, 0, 0, time)
      overlay.lift(0, 0, 0, time + 60)
      hidden()
    }
  })

  it('starts again from a touch that comes after the three seconds: it may be a new hold, and is no tap', () => {
    const { box, taps, never } = mount()
    never.hold(CORNER_AT, 0, HOLD_MS)
    never.taps(CORNER_AT, [HOLD_MS + 500])
    // Past the three seconds, the whole gesture again. Its hold is not the second tap of the first run, so the
    // box stays hidden through the first two taps that follow it and opens on the third.
    const again = HOLD_MS + WITHIN_MS + 1
    never.hold(CORNER_AT, again, again + HOLD_MS)
    never.taps(CORNER_AT, [again + HOLD_MS + 300, again + HOLD_MS + 600])
    taps(CORNER_AT, [again + HOLD_MS + 900])
    expect(box.style.display).toBe('block')
    // The same holds when the late touch is only a tap: nothing is armed after it.
    const late = mount()
    late.never.hold(CORNER_AT, 0, HOLD_MS)
    late.never.taps(CORNER_AT, [HOLD_MS + 500, HOLD_MS + WITHIN_MS + 1, HOLD_MS + WITHIN_MS + 300, HOLD_MS + WITHIN_MS + 600, HOLD_MS + WITHIN_MS + 900])
  })

  it('counts the three seconds from the lift of the held finger: a tap that rests a second does not move them on', () => {
    const { box, taps, never } = mount()
    never.hold(CORNER_AT, 0, HOLD_MS)
    // The first tap rests longer than a hold. Were its lift a new hold, the third tap below would be in time.
    never.hold(CORNER_AT, HOLD_MS + 200, HOLD_MS + 200 + HOLD_MS + 100)
    never.taps(CORNER_AT, [HOLD_MS + 1500, HOLD_MS + WITHIN_MS + 1])
    // With the third tap inside the three seconds, the same touches open it.
    const { box: opened, hold, taps: quick } = mount()
    hold(CORNER_AT, 0, HOLD_MS)
    hold(CORNER_AT, HOLD_MS + 200, HOLD_MS + 200 + HOLD_MS + 100)
    quick(CORNER_AT, [HOLD_MS + 1500, HOLD_MS + WITHIN_MS])
    expect(opened.style.display).toBe('block')
    // And the first box is still hidden after more taps: the late tap armed nothing.
    taps(CORNER_AT, [HOLD_MS + WITHIN_MS + 300])
    expect(box.style.display).toBe('none')
  })

  it('is not opened when one of the three taps slides out of the corner and lifts in the middle', () => {
    const { never } = mount()
    never.hold(CORNER_AT, 0, HOLD_MS)
    never.hold(CORNER_AT, HOLD_MS + 300, HOLD_MS + 360, MIDDLE)
    never.taps(CORNER_AT, [HOLD_MS + 600, HOLD_MS + 900])
  })

  it('counts a slow tap among the three as a tap, and a second hold among them as a tap too', () => {
    const { box, hold } = mount()
    hold(CORNER_AT, 0, HOLD_MS)
    hold(CORNER_AT, HOLD_MS + 200, HOLD_MS + 900)
    hold(CORNER_AT, HOLD_MS + 1000, HOLD_MS + 2100)
    expect(box.style.display).toBe('none')
    hold(CORNER_AT, HOLD_MS + 2200, HOLD_MS + 2260)
    expect(box.style.display).toBe('block')
  })

  it('says which points are in its corner, so the Mount can keep the game from answering there', () => {
    expect(inCorner(CORNER_AT[0], CORNER_AT[1], WIDTH)).toBe(true)
    expect(inCorner(WIDTH - CORNER, CORNER, WIDTH)).toBe(true)
    expect(inCorner(WIDTH - CORNER - 1, CORNER / 2, WIDTH)).toBe(false)
    expect(inCorner(WIDTH - CORNER / 2, CORNER + 1, WIDTH)).toBe(false)
    expect(inCorner(0, 0, 0)).toBe(false)
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
