import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The lab's demo catalog names, for a demo whose game took another name, the
// jam game it became, and the home page hides the demo on that word alone. The
// lab imports nothing from the jam, so nothing there can check the name. This
// reads the catalog as text and checks every such name is a game's folder.

const ROOT = join(import.meta.dirname, '..')

describe('the demo catalog and the games', () => {
  const source = readFileSync(join(ROOT, 'lab/arcade/catalog.ts'), 'utf8')
  const named = [...source.matchAll(/\bgame: '([^']+)'/g)].map((match) => match[1])

  it('names at least one game a demo became', () => {
    expect(named.length).toBeGreaterThan(0)
  })

  it.each(named)('names a real jam game: %s', (key) => {
    expect(existsSync(join(ROOT, 'games', key, 'manifest.ts'))).toBe(true)
  })
})
