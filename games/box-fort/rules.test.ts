import { describe, expect, it } from 'vitest'

// Rules that are held by reading the game's own files: what a test may do, what no file may name, and what must
// not happen when a module is loaded. The files come as text through the bundler, so this test reads no disk.

const sources = import.meta.glob(['./**/*.ts', './**/*.tsx', './**/*.md'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const files = Object.entries(sources).filter(([path]) => path !== './rules.test.ts')
const tests = files.filter(([path]) => path.endsWith('.test.ts') || path === './testing.ts' || path === './cases.ts')
const game = files.filter(([path]) => /\.tsx?$/.test(path) && !tests.some(([test]) => test === path))
/** The four frozen files are the template's, byte for byte, and are judged there. */
const FROZEN = ['./perf.ts', './quality.ts', './attention.ts', './saveCadence.ts']

describe('the rules a file can be read for', () => {
  it('reads every file of the game', () => {
    expect(files.length).toBeGreaterThan(45)
    expect(tests.length).toBeGreaterThan(20)
    for (const name of ['./toy.ts', './view/diorama.ts', './box-fort.tsx', './ART.md', './REFINEMENT.md']) expect(Object.keys(sources)).toContain(name)
  })

  it('lets no test write a file, read the environment or wait a minute', () => {
    for (const [path, text] of tests) {
      for (const banned of [/from 'node:/, /from 'fs'/, /require\(/, /writeFile|appendFile|mkdtemp|mkdir|createWriteStream/, /process\.env|import\.meta\.env/, /child_process|execSync|spawn\(/, /\bfetch\(/]) expect(text, `${path} and ${banned}`).not.toMatch(banned)
      for (const wait of text.matchAll(/(?:timeout|testTimeout)\D{0,4}(\d[\d_]*)/g)) expect(Number(wait[1].replace(/_/g, '')), path).toBeLessThanOrEqual(60_000)
    }
  })

  it('names no path on a machine and no web address anywhere, and the documents no folder outside the repository', () => {
    for (const [path, text] of files) {
      expect(text, path).not.toMatch(/(^|[\s'"`(])\/(home|tmp|Users|root|var|mnt|opt)\//m)
      expect(text, path).not.toMatch(/[A-Za-z]:\\\\/)
      expect(text, path).not.toMatch(/\bhttps?:\/\/|\bwww\.[a-z]/i)
      expect(text, path).not.toMatch(/localhost|127\.0\.0\.1/)
    }
  })

  it('makes nothing three-dimensional, and draws no chance, when a module is loaded', () => {
    for (const [path, text] of game) {
      if (FROZEN.includes(path)) continue
      // Whatever stands at the left margin runs at load: a `new THREE.` or a draw from chance there would happen before any game exists.
      for (const line of text.split('\n')) {
        if (/^\s/.test(line) || line.startsWith('//') || line.startsWith('*')) continue
        if (/^(export )?(function|class|type|interface|import|async function)\b/.test(line)) continue
        expect(line, `${path}: at module load`).not.toMatch(/new THREE\.|Math\.random|makeRng\(|Date\.now|performance\.now|document\.|window\./)
      }
      // Chance comes from the seeded stream; the template's rng.ts takes one new seed for it when the address pins none.
      if (path !== './rng.ts') expect(text, `${path}: chance comes from the seeded stream`).not.toMatch(/Math\.random/)
    }
  })

  it('shows the child no word, counts nothing at the child and keeps no clock of its own', () => {
    for (const [path, text] of game) {
      if (FROZEN.includes(path) || path === './overlay.ts') continue
      expect(text, `${path}: a second clock`).not.toMatch(/Date\.now|setTimeout|setInterval/)
      expect(text, `${path}: text on the kid side`).not.toMatch(/fillText|strokeText|innerText|textContent\s*=|TextGeometry/)
      expect(text, `${path}: a tally`).not.toMatch(/\b(score|streak|reward|praise|xp|combo)\b\s*[:=+(]/i)
    }
  })
})
