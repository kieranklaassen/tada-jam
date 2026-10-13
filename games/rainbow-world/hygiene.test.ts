import { describe, expect, it } from 'vitest'

// The tests of this folder write no file and read nothing of the machine they run on, and no file of the
// game names a place on a machine. The sources are read through the bundler, as text.

const sources = import.meta.glob('./*.{ts,tsx,md}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('the folder keeps to itself', () => {
  it('has tests that write no file and read no environment', () => {
    const tests = Object.entries(sources).filter(([path]) => path.endsWith('.test.ts') && !path.endsWith('hygiene.test.ts'))
    expect(tests.length).toBeGreaterThan(20)
    for (const [path, source] of tests) {
      for (const word of ['node:fs', "from 'fs'", 'writeFile', 'appendFile', 'mkdir', 'process.env', 'process.argv', 'import.meta.env', 'child_process', 'node:os', 'node:path']) expect(source.includes(word), `${path} has ${word}`).toBe(false)
    }
  })

  it('names no path on a machine in any file', () => {
    for (const [path, source] of Object.entries(sources)) {
      if (path.endsWith('hygiene.test.ts')) continue
      for (const pattern of [/\/home\//, /\/tmp\//, /\/Users\//, /[A-Z]:\\/, /wave-scratch/, /worktree/i, /scratch folder/i]) expect(pattern.test(source), `${path} matches ${pattern}`).toBe(false)
    }
  })
})
