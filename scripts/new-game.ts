// Starts a new jam game from the cartridge template.
//
//   npm run new:game -- <key> "<Name>" <youngest>-<oldest> <emoji>
//   npm run new:game -- hedgehog-post "Hedgehog Post" 4-8 🦔
//
// The key is the folder name, the manifest key and the storage namespace:
// kebab-case, and not yet used by a game or a showcase. The band is the
// manifest `ageBand` in whole years, 2 to 12 and at most five years wide. The
// emoji is the launcher's.
//
// It copies templates/cartridge/ into games/<key>/, renames the Mount file to
// <key>.tsx, and fills manifest.ts, index.ts and config.ts from the arguments.
// It writes nothing outside games/<key>/, and when it refuses it writes
// nothing at all. The untouched copy passes `npm run check`.
// test/new-game.test.ts is the gate for the template and for this script.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KEY_PATTERN } from '../harness/contract.ts'

const USAGE = 'usage: npm run new:game -- <key> "<Name>" <youngest>-<oldest> <emoji>'
const REPOSITORY = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TEMPLATE = join(REPOSITORY, 'templates', 'cartridge')
/** The template's Mount file, which becomes <key>.tsx. */
const MOUNT_FILE = 'game.tsx'

/** A single-quoted TypeScript string literal. */
function quote(text: string): string {
  return `'${JSON.stringify(text).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'")}'`
}

/** hedgehog-post becomes hedgehogPost, the stem of the game's exported names. */
function camelCase(key: string): string {
  return key.replace(/-([a-z0-9])/g, (_, first: string) => first.toUpperCase())
}

/** The same band rule test/games.test.ts holds every game to. */
function parseBand(text: string): readonly [number, number] {
  const parts = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(text)
  if (!parts) throw new Error(`the age band "${text}" is not <youngest>-<oldest>, for example 4-8\n${USAGE}`)
  const youngest = Number(parts[1]), oldest = Number(parts[2])
  if (!Number.isInteger(youngest) || !Number.isInteger(oldest)) throw new Error(`the age band "${text}" must be in whole years`)
  if (youngest < 2 || oldest > 12 || oldest < youngest) throw new Error(`the age band "${text}" must lie within 2 to 12, youngest first`)
  if (oldest - youngest > 5) throw new Error(`the age band "${text}" is wider than five years; a game is designed for one audience`)
  return [youngest, oldest]
}

function templateFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? templateFiles(path).map((inner) => join(name, inner)) : [name]
  })
}

/** Replaces the one placeholder `pattern` finds; a template that no longer holds it is an error, not a silent miss. */
function fill(text: string, pattern: RegExp, value: string, file: string): string {
  if (!pattern.test(text)) throw new Error(`the template's ${file} no longer holds ${pattern}; fix scripts/new-game.ts with it`)
  return text.replace(pattern, () => value)
}

/**
 * Makes games/<key>/ under `root` (the repository by default) from the
 * arguments of the command line: key, name, band, emoji. Returns the new
 * folder. Throws with the reason, having written nothing, when it refuses.
 */
export function newGame(args: readonly string[], root: string = REPOSITORY): string {
  if (args.length !== 4) throw new Error(USAGE)
  const [key, name, bandText, emoji] = args
  if (!KEY_PATTERN.test(key)) throw new Error(`the key "${key}" is not a kebab-case slug (lower-case letters and digits, joined by single hyphens)`)
  if (name.trim() === '') throw new Error('the name is blank')
  if (emoji.trim() === '') throw new Error('the emoji is blank')
  const [youngest, oldest] = parseBand(bandText)
  for (const shelf of ['games', 'showcases']) {
    if (existsSync(join(root, shelf, key))) throw new Error(`${shelf}/${key} already exists; pick a key no game or showcase uses`)
  }

  const stem = camelCase(key)
  const written = new Map<string, string>()
  for (const file of templateFiles(TEMPLATE)) {
    let text = readFileSync(join(TEMPLATE, file), 'utf8')
    // Each game exports its manifest and its cartridge under its own names, as Tada's registry expects.
    text = text.replaceAll('templateManifest', `${stem}Manifest`).replaceAll('templateCartridge', `${stem}Cartridge`)
    if (file === 'manifest.ts') {
      text = fill(text, /key: '[^']*'/, `key: ${quote(key)}`, file)
      text = fill(text, /name: '[^']*'/, `name: ${quote(name.trim())}`, file)
      text = fill(text, /ageBand: \[[^\]]*\]/, `ageBand: [${youngest}, ${oldest}]`, file)
    }
    if (file === 'index.ts') {
      text = fill(text, /from '\.\/game'/, `from './${key}'`, file)
      text = fill(text, /emoji: '[^']*'/, `emoji: ${quote(emoji.trim())}`, file)
    }
    written.set(file === MOUNT_FILE ? `${key}.tsx` : file, text)
  }

  const gameDir = join(root, 'games', key)
  for (const [file, text] of written) {
    mkdirSync(dirname(join(gameDir, file)), { recursive: true })
    writeFileSync(join(gameDir, file), text)
  }
  return gameDir
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  try {
    const gameDir = newGame(process.argv.slice(2))
    console.log(`made ${gameDir}\nnext: write the design sheet in ART.md, then run npm run check`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
