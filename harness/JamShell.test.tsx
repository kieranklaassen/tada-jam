// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOLD_MS } from './CornerControl'
import type { JamGame } from './contract'
import { JamShell } from './JamShell'

// The grown-up strip offers no age and every whole age a jam game can be made
// for, and whatever it holds is what the game reads as ctx.childAge. The strip
// is asked for with ?chrome=1 here; the suite at the foot covers how a game
// opens without it.

const PREFS_KEY = 'tada-jam:prefs'

// Mounts the shell around a probe game and reports the age the game was last given.
async function openShell(onExit: () => void = () => {}, permissions: readonly 'storage'[] = []) {
  const seen: { childAge: number | null | undefined } = { childAge: undefined }
  const probe: JamGame = {
    emoji: '🧪',
    cartridge: {
      manifest: { key: 'age-probe', name: 'Age probe', ageBand: [2, 6], permissions },
      Mount: ({ ctx }) => {
        seen.childAge = ctx.childAge
        return <div data-probe />
      },
    },
  }
  render(<JamShell game={probe} onExit={onExit} />)
  await act(async () => {})
  return seen
}

const ageControl = () => screen.getByLabelText('Age') as HTMLSelectElement

async function chooseAge(value: string) {
  await act(async () => {
    fireEvent.change(ageControl(), { target: { value } })
  })
}

describe('the child age in the shell', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '/?chrome=1')
  })
  afterEach(cleanup)

  it('lists no age and every whole age from 2 to 12, in order', async () => {
    await openShell()
    const values = Array.from(ageControl().options, (option) => option.value)
    expect(values).toEqual(['', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
  })

  it.each([2, 9, 12])('gives the game age %i when it is chosen', async (age) => {
    const seen = await openShell()
    await chooseAge(String(age))
    expect(seen.childAge).toBe(age)
  })

  it('gives the game no age when none is chosen', async () => {
    const seen = await openShell()
    await chooseAge('')
    expect(seen.childAge).toBeNull()
  })

  it.each([[2], [12], [null]])('reads a stored age of %s back and shows it', async (stored) => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ childAge: stored, language: 'en', theme: 'meadow' }))
    const seen = await openShell()
    expect(seen.childAge).toBe(stored)
    expect(ageControl().value).toBe(stored === null ? '' : String(stored))
  })

  it.each([
    ['an age outside the list', 15],
    ['a number between two ages of the list', 2.5],
    ['text', 'nine'],
  ])('falls back to the default age when the stored age is %s', async (_label, stored) => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ childAge: stored, language: 'en', theme: 'meadow' }))
    const seen = await openShell()
    expect(seen.childAge).toBe(4)
    expect(ageControl().value).toBe('4')
  })

  it('falls back to the default age when the stored preferences hold no age at all', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ language: 'en', theme: 'meadow' }))
    const seen = await openShell()
    expect(seen.childAge).toBe(4)
    expect(ageControl().value).toBe('4')
  })
})

describe('a game opened without the strip', () => {
  const strip = () => screen.queryByRole('toolbar')
  const corner = () => screen.getByRole('button', { name: 'Home' })
  const press = (target: Element) => fireEvent.pointerDown(target, { isPrimary: true })

  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('shows the corner control and no strip by default', async () => {
    await openShell()
    expect(strip()).toBeNull()
    expect(corner()).toBeTruthy()
  })

  it('draws nothing over the game with chrome=0', async () => {
    window.history.replaceState(null, '', '/?chrome=0')
    await openShell()
    expect(strip()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Home' })).toBeNull()
  })

  it('forgets a save only on the second tap of Reset slot, and disarms after three seconds', async () => {
    window.history.replaceState(null, '', '/?chrome=1')
    window.localStorage.setItem('tada-jam:slot:age-probe', JSON.stringify({ kept: true }))
    await openShell(() => {}, ['storage'])
    const reset = () => screen.getByRole('button', { name: /reset/i })
    fireEvent.click(reset())
    expect(window.localStorage.getItem('tada-jam:slot:age-probe')).not.toBeNull()
    act(() => void vi.advanceTimersByTime(3000))
    expect(reset().textContent).toBe('Reset slot')
    fireEvent.click(reset())
    fireEvent.click(reset())
    expect(window.localStorage.getItem('tada-jam:slot:age-probe')).toBeNull()
  })

  it('goes home on a tap of the corner control', async () => {
    const onExit = vi.fn()
    await openShell(onExit)
    press(corner())
    fireEvent.click(corner())
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(strip()).toBeNull()
  })

  it('shows the strip after a full hold and does not go home when the finger lifts', async () => {
    const onExit = vi.fn()
    await openShell(onExit)
    const control = corner()
    press(control)
    act(() => void vi.advanceTimersByTime(HOLD_MS))
    expect(strip()).not.toBeNull()
    fireEvent.click(control)
    expect(onExit).not.toHaveBeenCalled()
  })

  it('does not show the strip when the press is shorter than the hold', async () => {
    const onExit = vi.fn()
    await openShell(onExit)
    press(corner())
    act(() => void vi.advanceTimersByTime(HOLD_MS - 1))
    fireEvent.click(corner())
    act(() => void vi.advanceTimersByTime(HOLD_MS))
    expect(strip()).toBeNull()
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('does nothing when the finger slides off during the hold', async () => {
    const onExit = vi.fn()
    await openShell(onExit)
    press(corner())
    act(() => void vi.advanceTimersByTime(HOLD_MS / 2))
    fireEvent.pointerLeave(corner())
    act(() => void vi.advanceTimersByTime(HOLD_MS))
    expect(strip()).toBeNull()
    expect(onExit).not.toHaveBeenCalled()
  })
})
