// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Overlay } from './overlay'

function mount(search = ''): { root: HTMLElement; overlay: Overlay; box: HTMLElement } {
  const root = document.createElement('div')
  const overlay = new Overlay(root, search)
  return { root, overlay, box: root.querySelector('[data-perf-overlay]') as HTMLElement }
}

describe('the grown-up frame-rate overlay', () => {
  /** Two quick taps in the corner and a third press held for `hold` ms, starting at `t`. */
  const gesture = (overlay: Overlay, t: number, hold: number, x = 30, y = 20): void => {
    for (const at of [t, t + 200]) { overlay.press(x, y, at); overlay.lift(at + 60) }
    overlay.press(x, y, t + 400)
    overlay.lift(t + 400 + hold)
  }

  it('is hidden until two quick taps in the top left corner and a third press held for a second, and hides again the same way', () => {
    const { overlay, box } = mount()
    expect(box.style.display).toBe('none')
    gesture(overlay, 0, 1100)
    expect(box.style.display).toBe('block')
    gesture(overlay, 5000, 1100)
    expect(box.style.display).toBe('none')
    // And it still opens after a hand has been on the glass and gone.
    for (const at of [9000, 9100, 9200]) overlay.press(30, 20, at)
    for (const at of [9900, 9950, 10000]) overlay.lift(at)
    gesture(overlay, 12000, 1100)
    expect(box.style.display).toBe('block')
  })

  it('is not shown by what a child does: quick taps with no hold, a long hold alone, slow taps, taps elsewhere, or a touch that is taken away', () => {
    const { overlay, box } = mount()
    // Three, four, eight quick taps in the corner.
    for (let i = 0; i < 8; i++) { overlay.press(30, 20, i * 150); overlay.lift(i * 150 + 70) }
    // A hand resting in the corner.
    overlay.press(30, 20, 5000)
    overlay.lift(9000)
    // Slow taps and then a hold.
    for (const t of [10000, 11000, 12000]) { overlay.press(30, 20, t); overlay.lift(t + 60) }
    overlay.press(30, 20, 13000)
    overlay.lift(15000)
    // The gesture anywhere else, and in the top right corner.
    gesture(overlay, 20000, 1100, 600, 400)
    gesture(overlay, 25000, 1100, 1150, 20)
    // The gesture with a tap elsewhere in the middle of it.
    overlay.press(30, 20, 30000); overlay.lift(30060)
    overlay.press(600, 400, 30150); overlay.lift(30200)
    overlay.press(30, 20, 30300); overlay.lift(30360)
    overlay.press(30, 20, 30500); overlay.lift(31700)
    // The gesture whose hold is taken away by the system.
    for (const at of [40000, 40200]) { overlay.press(30, 20, at); overlay.lift(at + 60) }
    overlay.press(30, 20, 40400)
    overlay.lift(41600, true)
    // The gesture with too short a hold.
    gesture(overlay, 50000, 600)
    // A palm: three contacts land in the corner one after another and rest there.
    for (const at of [60000, 60150, 60300]) overlay.press(30, 20, at)
    for (const at of [61800, 61850, 61900]) overlay.lift(at)
    // The gesture with a second finger resting elsewhere on the glass.
    overlay.press(600, 400, 70000)
    gesture(overlay, 70100, 1100)
    overlay.lift(72000)
    // Tap, tap, and a rub that starts in the corner: the finger does not stay put.
    for (const at of [75000, 75200]) { overlay.press(30, 20, at); overlay.lift(at + 60) }
    overlay.press(30, 20, 75400)
    overlay.move(60, 40)
    overlay.move(300, 200)
    overlay.lift(76800)
    for (const at of [77000, 77200]) { overlay.press(30, 20, at); overlay.lift(at + 60) }
    overlay.press(30, 20, 77400)
    overlay.move(30, 45)
    overlay.lift(78800)
    // Drumming in the corner and then resting a finger there, whatever the number of taps.
    for (const count of [2, 3, 4, 5, 6, 8, 11]) {
      const start = 90000 + count * 10000
      for (let i = 0; i < count; i++) { overlay.press(30, 20, start + i * 150); overlay.lift(start + i * 150 + 60) }
      overlay.press(30, 20, start + count * 150)
      overlay.lift(start + count * 150 + 1500)
      if (count !== 2) expect(box.style.display, `${count} taps and a rest`).toBe('none')
      else {
        // Exactly two taps and a hold is the gesture itself: it opens, and is closed again for the rest of this test.
        expect(box.style.display).toBe('block')
        gesture(overlay, start + 5000, 1100)
      }
    }
    // Two slow presses and a hold: the first two were not taps.
    for (const at of [80000, 80250]) { overlay.press(30, 20, at); overlay.lift(at + 400) }
    overlay.press(30, 20, 80700)
    overlay.lift(81900)
    expect(box.style.display).toBe('none')
  })

  it('opens with fps=1 in the address and shows the frame rate from the intervals it is given', () => {
    const { overlay, box } = mount('?fps=1')
    expect(box.style.display).toBe('block')
    for (let i = 1; i <= 40; i++) overlay.frame(i * 20, 20, 3, 1, 28, 35000)
    expect(box.textContent).toContain('50 fps')
    expect(box.textContent).toContain('tier 1')
    expect(box.textContent).toContain('28 calls')
  })

  it('never takes a touch from the game, and leaves nothing behind', () => {
    const { root, overlay, box } = mount()
    expect(box.style.pointerEvents).toBe('none')
    overlay.dispose()
    expect(root.children).toHaveLength(0)
  })
})
