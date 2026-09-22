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
