import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { JamGame } from './contract'
import { fillShelves, lineFor, matches, SHELVES } from './shelves'

const game = (key: string, name: string): JamGame => ({ emoji: '🧪', cartridge: { manifest: { key, name, ageBand: [4, 7], permissions: [] }, Mount: () => null } })
const listed = SHELVES.flatMap((shelf) => Object.keys(shelf.games))

describe('the shelves', () => {
  it('name only games that exist, each on one shelf', () => {
    expect(listed.filter((key) => !existsSync(join(import.meta.dirname, '../games', key, 'manifest.ts')))).toEqual([])
    expect(new Set(listed).size).toBe(listed.length)
  })

  it('show a game nobody has shelved yet, first', () => {
    const shelves = fillShelves([game('monster-pizza', 'Monster Pizza'), game('brand-new', 'Brand New')])
    expect(shelves.map((shelf) => [shelf.id, shelf.games.length])).toEqual([['new', 1], ['jobs', 1]])
  })

  it('have a place for every demo of the lab', () => {
    const catalog = readFileSync(join(import.meta.dirname, '../lab/arcade/catalog.ts'), 'utf8')
    const demos = [...catalog.matchAll(/\{ key: '([^']+)'([^\n]*)/g)].map(([, key, rest]) => ({ key, game: /game: '([^']+)'/.exec(rest)?.[1], name: key, emoji: '🎲', ages: [3, 7] as [number, number], pitch: '', question: '?' }))
    const shelves = fillShelves([], demos)
    expect(demos.length).toBeGreaterThan(50)
    expect(shelves.flatMap((shelf) => shelf.demos)).toHaveLength(demos.length)
    expect(shelves.map((shelf) => shelf.id)).not.toContain('new')
  })

  it('find a game by its name or its line, in any case', () => {
    const pizza = game('monster-pizza', 'Monster Pizza')
    expect(lineFor('monster-pizza')).toContain('hungry')
    expect(matches(pizza, ' PIZZA ')).toBe(true)
    expect(matches(pizza, 'hungry')).toBe(true)
    expect(matches(pizza, 'submarine')).toBe(false)
  })
})
