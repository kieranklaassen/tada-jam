// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JamGame } from './contract'
import { GameList, orderForAge } from './GameList'
import { PREFS_KEY } from './prefs'

// The home page: one age for the child, set here by a grown-up, puts the games
// made for that age first; demos are tiles of the same kind below the games.

const game = (key: string, name: string, ageBand: [number, number]): JamGame => ({
  emoji: '🧪',
  cartridge: { manifest: { key, name, ageBand, permissions: [] }, Mount: () => null },
})
const GAMES = [game('ant-hill', 'Ant Hill', [9, 12]), game('bubble-bath', 'Bubble Bath', [2, 4]), game('cloud-kitchen', 'Cloud Kitchen', [4, 7])]
const names = (list: readonly JamGame[]) => list.map((g) => g.cartridge.manifest.name)

const demo = (key: string, name: string, extra: object = {}) => ({ key, name, emoji: '🎲', ages: [3, 7], pitch: 'A pitch.', question: 'A question?', ...extra })
function serveCatalog(demos: object[] | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => (demos ? { ok: true, json: async () => ({ groups: [{ id: 'g', title: 'Building', testing: 'T.', demos }] }) } : { ok: false })),
  )
}

async function openHome(onPickDemo: (key: string) => void = () => {}) {
  render(<GameList games={GAMES} onPick={() => {}} onPickDemo={onPickDemo} />)
  await act(async () => {})
}
const gameTiles = () => within(screen.getByRole('list', { name: 'Games' })).getAllByRole('button').map((button) => button.textContent)

describe('orderForAge', () => {
  it('leaves the games as given when no age is set', () => {
    expect(names(orderForAge(GAMES, null))).toEqual(['Ant Hill', 'Bubble Bath', 'Cloud Kitchen'])
  })

  it('puts the games whose band holds the age first, at both ends of a band', () => {
    expect(names(orderForAge(GAMES, 4))).toEqual(['Bubble Bath', 'Cloud Kitchen', 'Ant Hill'])
    expect(names(orderForAge(GAMES, 12))).toEqual(['Ant Hill', 'Bubble Bath', 'Cloud Kitchen'])
  })

  it('hides no game at an age none is made for', () => {
    expect(names(orderForAge(GAMES, 8))).toEqual(['Ant Hill', 'Bubble Bath', 'Cloud Kitchen'])
  })
})

describe('the home page', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    serveCatalog(null)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('stores the age a grown-up chooses, keeps the other preferences, and reorders the games', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ childAge: 4, language: 'nl', theme: 'boring' }))
    await openHome()
    expect(gameTiles()[0]).toContain('Bubble Bath')
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '10' } })
    expect(gameTiles()[0]).toContain('Ant Hill')
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY)!)).toEqual({ childAge: 10, language: 'nl', theme: 'boring' })
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '' } })
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY)!).childAge).toBeNull()
  })

  it('shows games only when there is no demo catalog', async () => {
    await openHome()
    expect(screen.queryByRole('region', { name: 'Demos' })).toBeNull()
  })

  it('shows a demo as a tile marked as a demo, and opens it by its key', async () => {
    serveCatalog([demo('tiny-island', 'Tiny Island'), demo('ant-hill', 'Ant Hill demo'), demo('peg-blaster', 'Peg Blaster', { verdict: 'no' })])
    const onPickDemo = vi.fn()
    await openHome(onPickDemo)
    const tiles = within(screen.getByRole('list', { name: 'Building' })).getAllByRole('button')
    expect(tiles.map((tile) => tile.textContent)).toEqual(['🎲Tiny Islanddemo · ages 3–7'])
    fireEvent.click(tiles[0])
    expect(onPickDemo).toHaveBeenCalledWith('tiny-island')
  })
})
