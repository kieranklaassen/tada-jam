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
  /** One touch at `at`: down at `from`, up `long` later. */
  const touch = (at: readonly [number, number], from: number, long = 60, liftAt: readonly [number, number] = at): void => {
    overlay.down(at[0], at[1], WIDTH, from)
    overlay.up(liftAt[0], liftAt[1], WIDTH, from + long)
  }
  return {
    root,
    overlay,
    box,
    touch,
    /** The whole gesture from `from`: a finger held in the corner and lifted there, then three taps there. */
    gesture(from: number, gap = 300): void {
      touch(CORNER_AT, from, HOLD_MS)
      for (let i = 1; i <= 3; i++) touch(CORNER_AT, from + HOLD_MS + i * gap)
    },
  }
}

describe('the grown-up performance overlay', () => {
  it('is hidden until a finger is held a second in the top right corner and lifted there, and three taps follow there within three seconds; the same hides it', () => {
    const { box, touch, gesture } = mount()
    expect(box.style.display).toBe('none')
    touch(CORNER_AT, 0, HOLD_MS)
    touch(CORNER_AT, 1500)
    touch(CORNER_AT, 2000)
    expect(box.style.display).toBe('none')
    touch(CORNER_AT, 2500)
    expect(box.style.display).toBe('block')
    gesture(10_000)
    expect(box.style.display).toBe('none')
  })

  it('is not opened by taps alone, however quick: what a child drumming on the bare corner makes', () => {
    const { box, touch } = mount()
    for (let i = 0; i < 40; i++) touch(CORNER_AT, i * 150)
    expect(box.style.display).toBe('none')
    // Nor by a long press alone, nor by many of them.
    for (let i = 0; i < 5; i++) touch(CORNER_AT, 10_000 + i * 2000, HOLD_MS + 200)
    expect(box.style.display).toBe('none')
  })

  it('is not opened by a hold that is too short, by one that slides out of the corner, by taps that come too late, or by a touch anywhere else in between', () => {
    const { overlay, box, touch } = mount()
    // Too short a hold.
    touch(CORNER_AT, 0, HOLD_MS - 1)
    for (let i = 1; i <= 3; i++) touch(CORNER_AT, 1000 + i * 200)
    // Held long enough, and lifted outside the corner.
    touch(CORNER_AT, 5000, HOLD_MS, MIDDLE)
    for (let i = 1; i <= 3; i++) touch(CORNER_AT, 6000 + i * 200)
    // The third tap falls later than three seconds after the lift.
    touch(CORNER_AT, 10_000, HOLD_MS)
    touch(CORNER_AT, 11_500)
    touch(CORNER_AT, 12_500)
    touch(CORNER_AT, 11_000 + WITHIN_MS + 1, 10)
    // A touch elsewhere in between starts it again.
    touch(CORNER_AT, 20_000, HOLD_MS)
    touch(CORNER_AT, 21_300)
    touch(MIDDLE, 21_600)
    touch(CORNER_AT, 21_900)
    touch(CORNER_AT, 22_200)
    // Just outside the corner on either side.
    for (const at of [[WIDTH - CORNER - 1, CORNER / 2], [WIDTH - CORNER / 2, CORNER + 1]] as const) {
      touch(at, 30_000, HOLD_MS)
      for (let i = 1; i <= 3; i++) touch(at, 31_000 + i * 200)
    }
    // A surface that has not been measured has no corner.
    overlay.down(0, 0, 0, 40_000); overlay.up(0, 0, 0, 41_100)
    for (const time of [41_300, 41_500, 41_700]) { overlay.down(0, 0, 0, time); overlay.up(0, 0, 0, time + 50) }
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
