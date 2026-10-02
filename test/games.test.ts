import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { KEY_PATTERN, validateManifest, type JamGame } from '../harness/contract'

const gamesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../games')
const folders = readdirSync(gamesDir).filter((name) => statSync(join(gamesDir, name)).isDirectory())
const modules = import.meta.glob<{ game: JamGame }>('../games/*/index.ts', { eager: true })

const templateDir = resolve(gamesDir, '../templates/cartridge')
const FROZEN_COPY = /^\/\/ template: cartridge\/(\S+) v(\d+) \(frozen\b/

/** Files under `dir` whose first line names a frozen template file at the template's current version and that differ from it. */
function frozenDrift(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((file) => {
    if (!/\.tsx?$/.test(file) || !statSync(join(dir, file)).isFile()) return false
    const copy = readFileSync(join(dir, file), 'utf8')
    const named = FROZEN_COPY.exec(copy.split('\n', 1)[0])
    if (!named || !existsSync(join(templateDir, named[1]))) return false
    const template = readFileSync(join(templateDir, named[1]), 'utf8')
    // A copy made from an earlier version of the template is not held: it is waiting to be copied again.
    return FROZEN_COPY.exec(template.split('\n', 1)[0])?.[2] === named[2] && copy !== template
  })
}

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

  it('every copy of a frozen template file is byte-equal to the template', () => {
    expect(frozenDrift(gamesDir)).toEqual([])
  })

  it('a copy of a frozen file with one changed character is named, unless it is from an earlier version', () => {
    const temp = mkdtempSync(join(tmpdir(), 'frozen-copies-'))
    try {
      const frozen = readFileSync(join(templateDir, 'saveCadence.ts'), 'utf8')
      const second = frozen.indexOf('\n') + 1
      const changed = frozen.slice(0, second) + (frozen[second] === 'x' ? 'y' : 'x') + frozen.slice(second + 1)
      mkdirSync(join(temp, 'kept'))
      mkdirSync(join(temp, 'changed', 'view'), { recursive: true })
      mkdirSync(join(temp, 'earlier'))
      writeFileSync(join(temp, 'kept', 'saveCadence.ts'), frozen)
      writeFileSync(join(temp, 'changed', 'view', 'saveCadence.ts'), changed)
      writeFileSync(join(temp, 'earlier', 'saveCadence.ts'), changed.replace(/ v\d+ /, ' v0 '))
      expect(frozenDrift(temp)).toEqual(['changed/view/saveCadence.ts'])
    } finally {
      rmSync(temp, { recursive: true, force: true })
    }
  })

  it('keys are unique', () => {
    const keys = Object.values(modules).map(({ game }) => game.cartridge.manifest.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
