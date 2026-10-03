// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DemoShelf } from './DemoShelf'
import { loadDemoCatalog, type DemoGroup } from './demos'

vi.mock('./demos', async (original) => ({ ...await original<typeof import('./demos')>(), loadDemoCatalog: vi.fn() }))
const load = vi.mocked(loadDemoCatalog)
const groups: DemoGroup[] = [
  {
    id: 'calm-work', title: 'Real work, calmly', testing: 'Real tasks, at your own pace.',
    demos: Array.from({ length: 13 }, (_, i) => ({
      key: `making-${i}`, name: `Making ${i}`, emoji: '🍞', ages: [3, 7] as [number, number],
      pitch: i === 12 ? 'Make an apple pie.' : 'Knead some bread.', question: 'Does making feel good?',
    })),
  },
  {
    id: 'arcade-loops', title: 'Arcade loops for older children', testing: 'One more try.',
    demos: [{ key: 'snack-merge', name: 'Snack Merge', emoji: '🍎', ages: [6, 10], pitch: 'Merge an apple.', question: 'Is merging fun?' }],
  },
]

beforeEach(() => load.mockResolvedValue(groups))
afterEach(() => { cleanup(); vi.resetAllMocks() })

async function library() {
  return within(await screen.findByRole('list', { name: 'Demo library' }))
}

describe('the homepage demo library', () => {
  it('lets a visitor reveal demos beyond the first page and opens the lab player', async () => {
    render(<DemoShelf />)
    const cards = await library()
    expect(cards.getAllByRole('link')).toHaveLength(12)
    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more demos' }))
    expect(cards.getAllByRole('link')).toHaveLength(14)
    expect(cards.getByRole('link', { name: /Snack Merge/ }).getAttribute('href')).toBe('lab/arcade/index.html#/play/snack-merge')
  })

  it('searches the entire catalog, including cards not yet revealed, and combines with category selection', async () => {
    render(<DemoShelf />)
    const cards = await library()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search demos' }), { target: { value: 'APPLE' } })
    expect(cards.getAllByRole('link')).toHaveLength(2)
    expect(cards.getByRole('link', { name: /Making 12/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Arcade 1' }))
    expect(cards.getAllByRole('link')).toHaveLength(1)
    expect(cards.getByRole('link', { name: /Snack Merge/ })).toBeTruthy()
  })

  it('recovers from an empty search by clearing both category and query', async () => {
    render(<DemoShelf />)
    await library()
    fireEvent.click(screen.getByRole('button', { name: 'Arcade 1' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no match' } })
    expect(screen.queryByRole('list', { name: 'Demo library' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show all demos' }))
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'All demos 14' }).getAttribute('aria-pressed')).toBe('true')
    expect((await library()).getAllByRole('link')).toHaveLength(12)
  })

  it('offers a retry and a direct player link when the catalog is unavailable', async () => {
    load.mockResolvedValueOnce([])
    render(<DemoShelf />)
    const retry = await screen.findByRole('button', { name: 'Try again' })
    expect(screen.getByRole('link', { name: 'Open the demo player' }).getAttribute('href')).toBe('lab/arcade/index.html')
    fireEvent.click(retry)
    expect((await library()).getAllByRole('link')).toHaveLength(12)
    expect(load).toHaveBeenCalledTimes(2)
  })
})
