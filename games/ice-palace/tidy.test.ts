import { describe, expect, it } from 'vitest'
import art from './ART.md?raw'
import refinement from './REFINEMENT.md?raw'

// Housekeeping that a reader of the folder would otherwise have to do by eye.

const tests = import.meta.glob('./*.test.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
// Spelled in pieces so that this file does not find itself.
const FORBIDDEN = ['node:' + 'fs', "from '" + "fs'", 'write' + 'File', 'process' + '.env', 'import.meta' + '.env', 'mkdir' + 'Sync', 'child_' + 'process']

describe('the tests of this folder', () => {
  it('are all read here', () => {
    expect(Object.keys(tests).length).toBeGreaterThan(20)
  })
  it.each(Object.keys(tests))('%s writes no file and reads nothing of the machine it runs on', (name) => {
    for (const word of FORBIDDEN) expect(tests[name].includes(word), `${name} has ${word}`).toBe(false)
  })
})

describe('the two documents', () => {
  it.each([['ART.md', art], ['REFINEMENT.md', refinement]])('%s names no folder of a machine: what was kept outside the repository is said to be kept there', (_name, text) => {
    for (const mark of ['/home/', '/tmp/', '/Users/', 'wave-' + 'scratch', 'work' + 'tree', 'scratch' + 'pad', 'local' + 'host']) expect(text.includes(mark), mark).toBe(false)
  })
  it('keep the design sheet above the look and the art guide below it', () => {
    expect(art.split('\n## The look\n').length).toBe(2)
  })
})
