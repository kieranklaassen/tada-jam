import { describe, expect, it } from 'vitest'

// What is kept by hand everywhere else and by this test here: no test of the
// game writes a file or reads the machine it runs on, and nothing in the
// folder names a web address or a place on a disk.

const code = import.meta.glob('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const pages = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

// The words are put together here so that this file does not hold them itself.
const j = (...parts: string[]): string => parts.join('')
const WRITES = [j('write', 'File'), j('append', 'File'), j('mk', 'dir'), j('node:', 'fs'), j("'f", "s'"), j('toMatch', 'Inline', 'Snapshot'), j('toMatch', 'Snapshot'), j('toMatch', 'File', 'Snapshot')]
const MACHINE = [j('process', '.env'), j('import.meta', '.env'), j('os.', 'tmpdir'), j('TMP', 'DIR'), j('child', '_process')]
const ADDRESS = [j('http', '://'), j('https', '://'), j('ww', 'w.'), j('local', 'host')]
const DISK = [j('/ho', 'me/'), j('/t', 'mp/'), j('/Us', 'ers/'), j('wave', '-scratch'), j('scratch', 'pad'), j('work', 'tree')]

describe('the folder', () => {
  it('has no test that writes a file or reads the machine it runs on', () => {
    const tests = Object.keys(code).filter((file) => file.includes('.test.'))
    expect(tests.length).toBeGreaterThan(20)
    for (const file of tests) for (const word of [...WRITES, ...MACHINE]) expect(code[file].includes(word), `${file}: ${word}`).toBe(false)
  })

  it('names no web address and no place on a disk, in its code or in its two documents', () => {
    expect(Object.keys(pages).sort()).toEqual(['./ART.md', './REFINEMENT.md'])
    for (const [file, text] of [...Object.entries(code), ...Object.entries(pages)]) {
      for (const word of [...ADDRESS, ...DISK]) expect(text.includes(word), `${file}: ${word}`).toBe(false)
    }
  })

  it('reads the saved fair and the child through the contract alone: no storage of its own and no request', () => {
    for (const [file, text] of Object.entries(code)) {
      if (file.includes('.test.')) continue
      for (const word of [j('local', 'Storage'), j('session', 'Storage'), j('indexed', 'DB'), j('fet', 'ch('), j('XML', 'Http'), j('Web', 'Socket'), j('send', 'Beacon')]) expect(text.includes(word), `${file}: ${word}`).toBe(false)
    }
  })
})
