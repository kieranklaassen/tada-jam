// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { JamGame } from './contract'
import { JamShell } from './JamShell'

// The grown-up strip offers no age and every whole age a jam game can be made
// for, and whatever it holds is what the game reads as ctx.childAge.

const PREFS_KEY = 'tada-jam:prefs'

// Mounts the shell around a probe game and reports the age the game was last given.
async function openShell() {
  const seen: { childAge: number | null | undefined } = { childAge: undefined }
  const probe: JamGame = {
    emoji: '🧪',
    cartridge: {
      manifest: { key: 'age-probe', name: 'Age probe', ageBand: [2, 6], permissions: [] },
      Mount: ({ ctx }) => {
        seen.childAge = ctx.childAge
        return <div data-probe />
      },
    },
  }
  render(<JamShell game={probe} onExit={() => {}} />)
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
    window.location.hash = ''
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
