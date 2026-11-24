// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JamGame } from './contract'
import { GameList } from './GameList'
import { PREFS_KEY } from './prefs'

// The home page: every game can be found by its picture, its shelf or a word;
// the child's age puts the games made for it first and hides none.

const game = (key: string, name: string, ageBand: [number, number]): JamGame => ({
  emoji: '🧪',
  cartridge: { manifest: { key, name, ageBand, permissions: [] }, Mount: () => null },
})
const GAMES = [game('ant-hill', 'Ant Hill', [9, 12]), game('bubble-bath', 'Bubble Bath', [2, 4]), game('cloud-kitchen', 'Cloud Kitchen', [4, 7])]

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
const cards = (list: string) => within(screen.getByRole('list', { name: list })).getAllByRole('button').map((button) => button.querySelector('.home-card-name')!.textContent)

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

  it('stores the age a grown-up chooses, keeps the other preferences, and puts the games for it first', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ childAge: 4, language: 'nl', theme: 'boring' }))
    await openHome()
    expect(cards('Just arrived')).toEqual(['Bubble Bath', 'Cloud Kitchen'])
    expect(cards('Made for other ages')).toEqual(['Ant Hill'])
    fireEvent.click(screen.getByLabelText('age 10'))
    expect(cards('Just arrived')).toEqual(['Ant Hill'])
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY)!)).toEqual({ childAge: 10, language: 'nl', theme: 'boring' })
    fireEvent.click(screen.getByLabelText('any age'))
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY)!).childAge).toBeNull()
    expect(cards('Just arrived')).toEqual(['Ant Hill', 'Bubble Bath', 'Cloud Kitchen'])
    expect(screen.queryByRole('list', { name: 'Made for other ages' })).toBeNull()
  })

  it('hides no game at an age none is made for', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ childAge: 8 }))
    await openHome()
    expect(cards('Made for other ages')).toEqual(['Ant Hill', 'Bubble Bath', 'Cloud Kitchen'])
  })

  it('finds a game by a word at any age, and offers the way back when nothing is found', async () => {
    await openHome()
    const search = screen.getByRole('searchbox')
    fireEvent.change(search, { target: { value: 'ant' } })
    expect(cards('Just arrived')).toEqual(['Ant Hill'])
    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(screen.queryByRole('list', { name: 'Just arrived' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show all games' }))
    expect(cards('Just arrived')).toEqual(['Bubble Bath', 'Cloud Kitchen'])
  })

  it('opens the game whose picture is touched', async () => {
    const onPick = vi.fn()
    render(<GameList games={GAMES} onPick={onPick} onPickDemo={() => {}} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /^Bubble Bath/ }))
    expect(onPick).toHaveBeenCalledWith('bubble-bath')
  })

  it('shows games only when there is no demo catalog', async () => {
    await openHome()
    expect(screen.getAllByRole('button', { name: /^All/ })[0].textContent).toBe('All 3')
  })

  it('shelves every demo, also one a game grew from or one turned down, says which are first versions, and opens it by its key', async () => {
    serveCatalog([demo('sock-race', 'Sock Race'), demo('ant-hill', 'Ant Hill', { ages: [9, 12] }), demo('peg-blaster', 'Peg Blaster', { verdict: 'no' }), demo('pond', 'Pond', { game: 'bubble-bath' })])
    const onPickDemo = vi.fn()
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ childAge: null }))
    await openHome(onPickDemo)
    expect(screen.getByRole('button', { name: /^All/ }).textContent).toBe('All 7')
    expect(cards('Just arrived')).toEqual(['Ant Hill', 'Bubble Bath', 'Cloud Kitchen', 'Sock Race', 'Ant Hill', 'Pond'])
    expect(cards('Dash, drop and splash')).toEqual(['Peg Blaster'])
    const captions = within(screen.getByRole('list', { name: 'Just arrived' })).getAllByRole('button').map((button) => button.querySelector('.home-card-caption')!.textContent)
    expect(captions.slice(3)).toEqual(['ages 3–7', 'first version · ages 9–12', 'first version · ages 3–7'])
    fireEvent.click(screen.getByRole('button', { name: /first version · ages 9/ }))
    expect(onPickDemo).toHaveBeenCalledWith('ant-hill')
  })

  it('puts the demos for the chosen age first too, and finds them by a word', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ childAge: 10 }))
    serveCatalog([demo('sock-race', 'Sock Race')])
    await openHome()
    expect(cards('Just arrived')).toEqual(['Ant Hill'])
    expect(cards('Made for other ages')).toEqual(['Bubble Bath', 'Cloud Kitchen', 'Sock Race'])
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sock' } })
    expect(cards('Just arrived')).toEqual(['Sock Race'])
  })
})
