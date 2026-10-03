// Starts a new jam game from the cartridge template.
//
//   npm run new:game -- <key> "<Name>" <youngest>-<oldest> <emoji>
//   npm run new:game -- hedgehog-post "Hedgehog Post" 4-8 🦔
//
// The key is the folder name, the manifest key and the storage namespace:
// kebab-case, not yet used by a game or a showcase, and not the name of one of
// the template's own modules. The band is the manifest `ageBand`, held to the
// jam's band rule in harness/contract.ts. The emoji is the launcher's.
//
// It copies templates/cartridge/ into games/<key>/, renames the Mount file to
// <key>.tsx, and fills manifest.ts and index.ts from the arguments; config.ts
// reads the band from the manifest. It writes nothing outside games/<key>/,
// and when it refuses it writes nothing at all. The untouched copy passes
// `npm run check`.
//
//   npm run new:game -- --refresh <key>
//
// Writes the template's frozen files (the ones whose first line says so) over
// those of a game that was made from the template, and writes nothing else.
// It is how a fix to a frozen file reaches a game, and how a frozen file that
// was changed by mistake is put back.
//
// test/new-game.test.ts is the gate for the template and for this script.

import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KEY_PATTERN, ageBandProblems } from '../harness/contract.ts'

const USAGE = 'usage: npm run new:game -- <key> "<Name>" <youngest>-<oldest> <emoji>\n       npm run new:game -- --refresh <key>'
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

/** Splits `<youngest>-<oldest>`. Whether the two ages make a band a jam game may declare is `ageBandProblems`' to say. */
function parseBand(text: string): readonly [number, number] {
  const parts = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(text)
  if (!parts) throw new Error(`the age band "${text}" is not <youngest>-<oldest>, for example 4-8\n${USAGE}`)
  return [Number(parts[1]), Number(parts[2])]
}

function templateFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? templateFiles(path).map((inner) => join(name, inner)) : [name]
  })
}

/** The first line of a file, read from its first bytes: every source file of every game is asked for it. */
function firstLine(path: string): string {
  const start = Buffer.alloc(256)
  const file = openSync(path, 'r')
  try {
    return start.toString('utf8', 0, readSync(file, start, 0, start.length, 0)).split('\n', 1)[0]
  } finally {
    closeSync(file)
  }
}

/** The template's frozen files: the ones whose first line says `(frozen`. A game keeps them byte-equal to the template. */
export function frozenFiles(): string[] {
  return templateFiles(TEMPLATE).filter((file) => firstLine(join(TEMPLATE, file)).includes('(frozen')).sort()
}

/** Whether a game folder was made from the template: some source file in it still starts with the template's header. */
export function madeFromTemplate(gameDir: string): boolean {
  return templateFiles(gameDir).some((file) => /\.tsx?$/.test(file) && firstLine(join(gameDir, file)).startsWith('// template: cartridge/'))
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
  // index.ts imports the Mount from './<key>', which one of the template's own modules would answer first.
  const clash = templateFiles(TEMPLATE).find((file) => file !== MOUNT_FILE && file.replace(/\.[^.]+$/, '') === key)
  if (clash) throw new Error(`the key "${key}" is the name of the template's ${clash}, which games/${key}/${key}.tsx would sit beside; pick another key`)
  const [youngest, oldest] = parseBand(bandText)
  const [problem] = ageBandProblems([youngest, oldest])
  if (problem) throw new Error(`the age band "${bandText}" cannot be used: ${problem}`)
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

/**
 * Writes the template's frozen files over those of games/<key>/ under `root`
 * (the repository by default) and nothing else. Returns the files it changed
 * or put back, which is none when the game already holds the template's.
 * Throws with the reason, having written nothing, when the key is not a game
 * folder made from the template.
 */
export function refreshGame(key: string, root: string = REPOSITORY): string[] {
  if (!KEY_PATTERN.test(key)) throw new Error(`the key "${key}" is not a kebab-case slug (lower-case letters and digits, joined by single hyphens)`)
  const gameDir = join(root, 'games', key)
  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) throw new Error(`games/${key} is no game folder`)
  if (!madeFromTemplate(gameDir)) throw new Error(`games/${key} was not made from the template: no file in it starts with "// template: cartridge/"`)
  const changed: string[] = []
  for (const file of frozenFiles()) {
    const text = readFileSync(join(TEMPLATE, file), 'utf8')
    const path = join(gameDir, file)
    if (existsSync(path) && readFileSync(path, 'utf8') === text) continue
    writeFileSync(path, text)
    changed.push(file)
  }
  return changed
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  try {
    const args = process.argv.slice(2)
    if (args[0] === '--refresh') {
      if (args.length !== 2) throw new Error(USAGE)
      const changed = refreshGame(args[1])
      console.log(changed.length > 0 ? `games/${args[1]}: wrote the template's ${changed.join(', ')}` : `games/${args[1]}: its frozen files are already the template's`)
    } else {
      const gameDir = newGame(args)
      console.log(`made ${gameDir}\nnext: write the design sheet in ART.md, then run npm run check`)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
