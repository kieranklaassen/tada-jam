import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { KEY_PATTERN, ageBandProblems, validateManifest, type JamGame } from '../harness/contract'
import { frozenFiles, madeFromTemplate, newGame } from '../scripts/new-game.ts'

const gamesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../games')
const folders = readdirSync(gamesDir).filter((name) => statSync(join(gamesDir, name)).isDirectory())
const modules = import.meta.glob<{ game: JamGame }>('../games/*/index.ts', { eager: true })

const templateDir = resolve(gamesDir, '../templates/cartridge')
/** How a frozen file starts: `// template: cartridge/<file> v<n> (frozen: ...)`. */
const FROZEN_HEADER = /^\/\/ template: cartridge\/(\S+) v(\d+) \(frozen\b/
const FROZEN_REMEDY =
  "a frozen file in a game made from the template is not the template's: copy templates/cartridge/<file> over it, or run `npm run new:game -- --refresh <key>`. A fault in a frozen file is a request to the lead, never an edit in the game"

/**
 * The frozen files of the games under `dir` that are not the template's. A game is held when its folder was
 * made from the template, which is read from the folder and never from the file under test, so a frozen file
 * cannot leave the rule by losing its own header. In such a folder every frozen file of the template sits at
 * the root, starts with the frozen header that names it, and is byte-equal to the template's. The one way out
 * is a version below the template's: that copy is waiting to be refreshed, and is listed as `earlier`.
 */
function frozenCopies(dir: string): { problems: string[]; earlier: string[] } {
  const frozen = frozenFiles()
  const problems: string[] = []
  const earlier: string[] = []
  for (const key of readdirSync(dir).sort()) {
    const gameDir = join(dir, key)
    if (!statSync(gameDir).isDirectory() || !madeFromTemplate(gameDir)) continue
    for (const file of frozen) {
      const name = `games/${key}/${file}`
      if (!existsSync(join(gameDir, file))) {
        problems.push(`${name} is missing`)
        continue
      }
      const template = readFileSync(join(templateDir, file), 'utf8')
      const copy = readFileSync(join(gameDir, file), 'utf8')
      const current = Number(FROZEN_HEADER.exec(template)![2])
      const header = FROZEN_HEADER.exec(copy)
      const version = Number(header?.[2])
      if (header?.[1] !== file) problems.push(`${name} does not start with the template's frozen header for it`)
      else if (version > current) problems.push(`${name} names version ${version}, which is later than the template's ${current}`)
      else if (version < current) earlier.push(`${name} (version ${version}, the template is at ${current})`)
      else if (copy !== template) problems.push(`${name} differs from templates/cartridge/${file}`)
    }
  }
  return { problems, earlier }
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
        expect(ageBandProblems(game.cartridge.manifest.ageBand)).toEqual([])
      })

      it('has a launcher emoji', () => {
        expect(game.emoji.trim()).not.toBe('')
      })
    })
  }

  it("every game made from the template holds the template's frozen files, byte-equal", () => {
    const { problems, earlier } = frozenCopies(gamesDir)
    // A copy made from an earlier version of the template is not held, and is named so it is not forgotten.
    // Written straight to stderr: the reporter hides what a passing test logs through console.
    if (earlier.length > 0) process.stderr.write(`note: frozen files copied from an earlier version of the template, waiting for "npm run new:game -- --refresh <key>":\n  ${earlier.join('\n  ')}\n`)
    expect(problems, FROZEN_REMEDY).toEqual([])
  })

  it('a frozen file is named when it is changed, missing, of a later version or without its header, and noted when it is of an earlier version', () => {
    const temp = mkdtempSync(join(tmpdir(), 'frozen-copies-'))
    const made = (key: string): string => newGame([key, 'Frozen', '4-8', '🧊'], temp)
    const rewrite = (path: string, change: (text: string) => string): void => writeFileSync(path, change(readFileSync(path, 'utf8')))
    /** One character changed in the body, below the header. */
    const edited = (text: string): string => {
      const second = text.indexOf('\n') + 1
      return text.slice(0, second) + (text[second] === 'x' ? 'y' : 'x') + text.slice(second + 1)
    }
    const version = Number(FROZEN_HEADER.exec(readFileSync(join(templateDir, 'saveCadence.ts'), 'utf8'))![2])
    try {
      made('kept')
      rewrite(join(made('changed'), 'saveCadence.ts'), edited)
      rewrite(join(made('earlier'), 'saveCadence.ts'), (text) => edited(text).replace(/ v\d+ /, ` v${version - 1} `))
      rewrite(join(made('later'), 'saveCadence.ts'), (text) => edited(text).replace(/ v\d+ /, ` v${version + 1} `))
      rewrite(join(made('stripped'), 'saveCadence.ts'), (text) => edited(text.slice(text.indexOf('\n') + 1)))
      rewrite(join(made('reworded'), 'saveCadence.ts'), (text) => edited(text).replace('(frozen:', '(was frozen:'))
      rewrite(join(made('pushed-down'), 'saveCadence.ts'), (text) => `\n${edited(text)}`)
      rewrite(join(made('renamed'), 'saveCadence.ts'), (text) => edited(text).replace('cartridge/saveCadence.ts', 'cartridge/quality.ts'))
      rmSync(join(made('missing'), 'saveCadence.ts'))
      const moved = made('moved')
      mkdirSync(join(moved, 'view'))
      writeFileSync(join(moved, 'view', 'saveCadence.ts'), readFileSync(join(moved, 'saveCadence.ts'), 'utf8'))
      rmSync(join(moved, 'saveCadence.ts'))
      // A game that was not made from the template may name its files as it likes.
      mkdirSync(join(temp, 'games', 'hand-made'))
      writeFileSync(join(temp, 'games', 'hand-made', 'saveCadence.ts'), '// written by hand\nexport const cadence = 1\n')

      const { problems, earlier } = frozenCopies(join(temp, 'games'))
      expect(problems).toEqual([
        'games/changed/saveCadence.ts differs from templates/cartridge/saveCadence.ts',
        `games/later/saveCadence.ts names version ${version + 1}, which is later than the template's ${version}`,
        'games/missing/saveCadence.ts is missing',
        'games/moved/saveCadence.ts is missing',
        "games/pushed-down/saveCadence.ts does not start with the template's frozen header for it",
        "games/renamed/saveCadence.ts does not start with the template's frozen header for it",
        "games/reworded/saveCadence.ts does not start with the template's frozen header for it",
        "games/stripped/saveCadence.ts does not start with the template's frozen header for it",
      ])
      expect(earlier).toEqual([`games/earlier/saveCadence.ts (version ${version - 1}, the template is at ${version})`])
    } finally {
      rmSync(temp, { recursive: true, force: true })
    }
  })

  it('keys are unique', () => {
    const keys = Object.values(modules).map(({ game }) => game.cartridge.manifest.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
