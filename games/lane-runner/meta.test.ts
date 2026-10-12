import { describe, expect, it } from 'vitest'

// Rules about the files themselves, held by reading them as text.

const tests = import.meta.glob('./**/*.test.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const code = import.meta.glob(['./**/*.ts', './**/*.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const pages = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

// The words are put together here so that this file does not hold them itself.
const join = (...parts: string[]): string => parts.join('')

describe('the tests', () => {
  it('write no file and read nothing from the machine they run on', () => {
    const banned = [join('write', 'File'), join('append', 'File'), join('mkdir', 'Sync'), join('node:', 'fs'), join("'f", "s'"), join('process', '.env'), join('import.meta', '.env'), join('toMatch', 'Snapshot'), join('toMatch', 'InlineSnapshot'), join('toMatchFile', 'Snapshot'), join('os.', 'homedir'), join('process', '.cwd')]
    expect(Object.keys(tests).length).toBeGreaterThan(25)
    for (const [name, source] of Object.entries(tests)) for (const word of banned) expect(source.includes(word), `${name}: ${word}`).toBe(false)
  })
})

describe('the time a test may take', () => {
  it('is a minute at the most: a test that needs longer does less', () => {
    const limit = /\},\s*([0-9_]+)\s*\)\s*$/gm
    let limits = 0
    for (const [name, source] of Object.entries(tests)) {
      for (const found of source.matchAll(limit)) {
        limits += 1
        expect(Number(found[1].replaceAll('_', '')), `${name}: ${found[0]}`).toBeLessThanOrEqual(60_000)
      }
    }
    expect(limits).toBeGreaterThan(5)
  })
})

describe('the pages of the game', () => {
  it('are the design sheet with the art guide, and the pass log', () => {
    expect(Object.keys(pages).sort()).toEqual(['./ART.md', './REFINEMENT.md'])
  })

  it('name no folder outside the repository: no machine path, no working copy, no scratch folder', () => {
    const banned = [join('/ho', 'me/'), join('/tm', 'p/'), join('/ro', 'ot/'), join('scr', 'atch'), join('work', 'tree'), join('wave', '/'), join('~', '/'), join('C:', '\\')]
    for (const [name, text] of Object.entries(pages)) for (const word of banned) expect(text.toLowerCase().includes(word.toLowerCase()), `${name}: ${word}`).toBe(false)
  })
})

describe('every file of the game', () => {
  it('holds no web address', () => {
    const address = new RegExp(join('https?', ':', '//'))
    for (const [name, text] of Object.entries({ ...code, ...pages })) expect(address.test(text), name).toBe(false)
  })
})
