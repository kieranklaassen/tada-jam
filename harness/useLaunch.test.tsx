// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLaunch, type Open } from './useLaunch'

function Card({ open }: { open: Open }) {
  const launch = useLaunch(open)
  return (
    <button type="button" onClick={(event) => launch('a-game', event.currentTarget)}>
      card
    </button>
  )
}

// The history entry of a game has to be made inside the tap, or Safari may pass over it on the way back.
describe('opening a game from its picture', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    cleanup()
  })

  it('opens inside the tap and shows the game once, when the picture has grown', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const grown: { onfinish: (() => void) | null }[] = []
    HTMLElement.prototype.animate = (() => {
      const animation = { onfinish: null }
      grown.push(animation)
      return animation
    }) as never
    const show = vi.fn()
    const open = vi.fn(() => show)
    render(<Card open={open} />)
    fireEvent.click(screen.getByRole('button'))
    expect(open).toHaveBeenCalledTimes(1)
    expect(show).not.toHaveBeenCalled()
    act(() => grown[0].onfinish?.())
    act(() => void vi.advanceTimersByTime(2000))
    expect(open).toHaveBeenCalledTimes(1)
    expect(show).toHaveBeenCalledTimes(1)
    delete (HTMLElement.prototype as { animate?: unknown }).animate
  })

  it('opens and shows at once when motion is reduced', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const show = vi.fn()
    render(<Card open={() => show} />)
    fireEvent.click(screen.getByRole('button'))
    expect(show).toHaveBeenCalledTimes(1)
  })
})
