import { readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { KEY_PATTERN, validateManifest, type JamGame } from '../harness/contract'

const gamesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../games')
const folders = readdirSync(gamesDir).filter((name) => statSync(join(gamesDir, name)).isDirectory())
const modules = import.meta.glob<{ game: JamGame }>('../games/*/index.ts', { eager: true })

describe('jam games', () => {
  it('every game folder has an index.ts exporting a game', () => {
    for (const folder of folders) {
      expect(modules[`../games/${folder}/index.ts`]?.game, folder).toBeDefined()
    }
  })

  for (const [path, { game }] of Object.entries(modules)) {
    const folder = path.split('/')[2]
    describe(folder, () => {
      it('has a valid manifest', () => {
        expect(validateManifest(game.cartridge.manifest)).toEqual([])
      })

      it('uses its folder name as its key', () => {
        expect(KEY_PATTERN.test(folder)).toBe(true)
        expect(game.cartridge.manifest.key).toBe(folder)
      })

      it('declares a specific target age band (whole years, 2–12, at most five years wide)', () => {
        const [min, max] = game.cartridge.manifest.ageBand
        expect(Number.isInteger(min) && Number.isInteger(max), 'ageBand uses whole years').toBe(true)
        expect(min, 'youngest age is at least 2').toBeGreaterThanOrEqual(2)
        expect(max, 'oldest age is at most 12').toBeLessThanOrEqual(12)
        expect(max - min, 'a game is designed for one audience; split wider ranges into faces or a second game').toBeLessThanOrEqual(5)
      })

      it('has a launcher emoji', () => {
        expect(game.emoji.trim()).not.toBe('')
      })
    })
  }

  it('keys are unique', () => {
    const keys = Object.values(modules).map(({ game }) => game.cartridge.manifest.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
