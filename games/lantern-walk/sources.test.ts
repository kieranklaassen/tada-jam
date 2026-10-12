import { describe, expect, it } from 'vitest'
import art from './ART.md?raw'
import refinement from './REFINEMENT.md?raw'

// What the files of the game may not hold, read from the files themselves.

const sources = import.meta.glob(['./*.ts', './*.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const names = Object.keys(sources)
/** A word put together here so that this file does not hold it. */
const word = (...parts: string[]) => parts.join('')

describe('age is a hint', () => {
  it('the child\'s age is read in one place, where a first visit\'s sheet is chosen, and no model, view or scene knows it', () => {
    const reads = names.filter((name) => !name.endsWith('.test.ts') && sources[name].includes(word('child', 'Age')))
    expect(reads.sort()).toEqual(['./config.ts', './lantern-walk.tsx', './save.ts', './state.ts'])
    // The Mount hands it to the one reader and uses it nowhere else.
    expect(sources['./lantern-walk.tsx'].split(word('child', 'Age')).length - 1).toBe(2)
  })
})

describe('the tests', () => {
  const tests = names.filter((name) => name.endsWith('.test.ts') && name !== './sources.test.ts')

  it('there is a test file for every part of the game that has rules of its own', () => {
    for (const name of ['cells', 'rules', 'promises', 'table', 'play', 'layout', 'view', 'save', 'sheet', 'voices', 'speaker']) expect(tests).toContain(`./${name}.test.ts`)
  })

  it('no test writes a file, reads the environment or waits on a clock of its own', () => {
    const banned = [word('write', 'File'), word('mkdir'), word('append', 'File'), word('process', '.env'), word('node:', 'fs'), word('set', 'Timeout'), word('Date', '.now'), word('test', 'Timeout')]
    const found: string[] = []
    for (const name of tests) for (const what of banned) if (sources[name].includes(what)) found.push(`${name}: ${what}`)
    expect(found).toEqual([])
  })
})

describe('no file names a machine, a place on one, or where a thing is fetched from', () => {
  it('neither the code nor the two documents', () => {
    const banned = [word('/ho', 'me/'), word('/tm', 'p/'), word('/Us', 'ers/'), word('wave', '-scratch'), word('work', 'tree'), word('http', '://'), word('https', '://'), word('local', 'host')]
    const found: string[] = []
    const files: Record<string, string> = { ...sources, 'ART.md': art, 'REFINEMENT.md': refinement }
    for (const [name, text] of Object.entries(files)) {
      if (name === './sources.test.ts') continue
      for (const what of banned) if (text.includes(what)) found.push(`${name}: ${what}`)
    }
    expect(found).toEqual([])
  })
})
