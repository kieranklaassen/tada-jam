import { mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { KEY_PATTERN, validateManifest, type JamGame } from '../harness/contract'
import { scanTree } from '../scripts/egress-check'
import { scanGames } from '../scripts/wordless-check'

// Showcases are owner-approved pieces that are not cartridges (Alien Frontier:
// keyboard and mouse, text, XP, its own saves). They live apart in showcase/,
// the cartridge checks (age band, wordless) skip them by design, and the
// egress rule still applies to them.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const showcaseDir = join(root, 'showcase')
const folders = readdirSync(showcaseDir).filter((name) => statSync(join(showcaseDir, name)).isDirectory())
const modules = import.meta.glob<{ showcase: JamGame }>('../showcase/*/index.ts', { eager: true })
const games = import.meta.glob<{ game: JamGame }>('../games/*/index.ts', { eager: true })

describe('showcases', () => {
  it('every showcase folder exports a showcase with a valid manifest keyed by its folder', () => {
    for (const folder of folders) {
      const showcase = modules[`../showcase/${folder}/index.ts`]?.showcase
      expect(showcase, folder).toBeDefined()
      expect(validateManifest(showcase!.cartridge.manifest), folder).toEqual([])
      expect(KEY_PATTERN.test(folder)).toBe(true)
      expect(showcase!.cartridge.manifest.key).toBe(folder)
    }
  })

  it('is never registered as a game, so the cartridge checks and the game list do not see it', () => {
    const gameKeys = Object.values(games).map(({ game }) => game.cartridge.manifest.key)
    for (const folder of folders) expect(gameKeys, folder).not.toContain(folder)
    expect(scanGames(root).some((finding) => finding.file.startsWith('showcase/'))).toBe(false)
  })

  it('stays under the egress rule: a foreign URL in a showcase wrapper is flagged', () => {
    const temp = mkdtempSync(join(tmpdir(), 'showcase-egress-'))
    mkdirSync(join(temp, 'showcase', 'demo'), { recursive: true })
    writeFileSync(join(temp, 'showcase', 'demo', 'index.ts'), "export const font = 'https://fonts.googleapis.com/css2?family=Rye'\n")
    const findings = scanTree(temp, { built: false })
    expect(findings.map((finding) => finding.file)).toContain(join('showcase', 'demo', 'index.ts'))
  })
})
