import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { KEY_PATTERN, validateManifest, type JamGame, type JamShowcase } from '../harness/contract'
import { scanTree } from '../scripts/egress-check'
import { scanGames } from '../scripts/wordless-check'

// Showcases are finished games shown in the jam that are not Tada cartridges.
// They must stay out of games/ (cartridge discovery) and say what they need.
// The cartridge checks (age band, wordless) skip them by design; the egress
// rule still applies to them.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const showcases = import.meta.glob<{ showcase: JamShowcase }>('../showcases/*/index.ts', { eager: true })
const games = import.meta.glob<{ game: JamGame }>('../games/*/index.ts', { eager: true })

describe('jam showcases', () => {
  for (const [path, { showcase }] of Object.entries(showcases)) {
    const folder = path.split('/')[2]
    describe(folder, () => {
      it('has a valid manifest', () => {
        expect(validateManifest(showcase.cartridge.manifest)).toEqual([])
      })

      it('uses its folder name as its key', () => {
        expect(KEY_PATTERN.test(folder)).toBe(true)
        expect(showcase.cartridge.manifest.key).toBe(folder)
      })

      it('says what a grown-up needs to know before opening it', () => {
        expect(showcase.requires.trim()).not.toBe('')
      })

      it('is not also registered as a cartridge', () => {
        expect(existsSync(resolve(root, 'games', folder))).toBe(false)
      })
    })
  }

  it('the wordless check never scans a showcase', () => {
    expect(scanGames(root).some((finding) => finding.file.startsWith('showcases/'))).toBe(false)
  })

  it('stays under the egress rule: a foreign URL in a showcase wrapper is flagged', () => {
    const temp = mkdtempSync(join(tmpdir(), 'showcase-egress-'))
    mkdirSync(join(temp, 'showcases', 'demo'), { recursive: true })
    writeFileSync(join(temp, 'showcases', 'demo', 'index.ts'), "export const font = 'https://fonts.googleapis.com/css2?family=Rye'\n")
    expect(scanTree(temp, { built: false }).map((finding) => finding.file)).toContain(join('showcases', 'demo', 'index.ts'))
  })

  it('keys are unique across games and showcases', () => {
    const keys = [...Object.values(games).map(({ game }) => game.cartridge.manifest.key), ...Object.values(showcases).map(({ showcase }) => showcase.cartridge.manifest.key)]
    expect(new Set(keys).size).toBe(keys.length)
  })
})
