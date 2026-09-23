import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { KEY_PATTERN, type JamGame, type JamShowcase } from '../harness/contract'

// Showcases are finished games shown in the jam that are not Tada cartridges.
// They must stay out of games/ (cartridge discovery) and say what they need.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const showcases = import.meta.glob<{ showcase: JamShowcase }>('../showcases/*/index.ts', { eager: true })
const games = import.meta.glob<{ game: JamGame }>('../games/*/index.ts', { eager: true })

describe('jam showcases', () => {
  for (const [path, { showcase }] of Object.entries(showcases)) {
    const folder = path.split('/')[2]
    describe(folder, () => {
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

  it('keys are unique across games and showcases', () => {
    const keys = [...Object.values(games).map(({ game }) => game.cartridge.manifest.key), ...Object.values(showcases).map(({ showcase }) => showcase.cartridge.manifest.key)]
    expect(new Set(keys).size).toBe(keys.length)
  })
})
