// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Overlay } from './overlay'

function mount(search = ''): { root: HTMLElement; overlay: Overlay; box: HTMLElement } {
  const root = document.createElement('div')
  const overlay = new Overlay(root, search)
  return { root, overlay, box: root.querySelector('[data-perf-overlay]') as HTMLElement }
}

describe('the grown-up frame-rate overlay', () => {
  it('is hidden until three quick taps in the top right corner, and hides again the same way', () => {
    const { overlay, box } = mount()
    expect(box.style.display).toBe('none')
    overlay.press(1150, 20, 1180, 0)
    overlay.press(1150, 20, 1180, 300)
    expect(box.style.display).toBe('none')
    overlay.press(1150, 20, 1180, 600)
    expect(box.style.display).toBe('block')
    for (const t of [2000, 2200, 2400]) overlay.press(1150, 20, 1180, t)
    expect(box.style.display).toBe('none')
  })

  it('is not shown by slow taps, by taps elsewhere, or by a tap elsewhere in between', () => {
    const { overlay, box } = mount()
    for (const t of [0, 1000, 2000, 3000]) overlay.press(1150, 20, 1180, t)
    for (const t of [5000, 5100, 5200]) overlay.press(600, 400, 1180, t)
    overlay.press(1150, 20, 1180, 6000)
    overlay.press(1150, 20, 1180, 6100)
    overlay.press(600, 400, 1180, 6200)
    overlay.press(1150, 20, 1180, 6300)
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
