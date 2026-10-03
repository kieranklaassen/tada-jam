import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { validateManifest, type CartridgeManifest } from '../harness/contract'
import { scanTree } from '../scripts/egress-check.ts'
import { frozenFiles, madeFromTemplate, newGame, refreshGame } from '../scripts/new-game.ts'
import { scanGames } from '../scripts/wordless-check'

// The template's gate. A fresh copy must pass what `npm run check` asks of a
// game before any game code is written: a valid manifest, imports that stay in
// the folder, the egress scan and the wordless scan. Its typecheck and its unit
// tests are those of templates/cartridge/ in place, which the root typecheck
// and test run include; what the band changes in a copy (its first-visit
// defaults, and how the ghost hand shows a tap) is read back from copies at
// several bands.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const templateDir = join(root, 'templates', 'cartridge')
const FROZEN = ['attention.ts', 'perf.ts', 'quality.ts', 'saveCadence.ts']
/** Copied only into a game whose band starts at 6 or above. */
const SYMBOLS = ['symbols.test.ts', 'symbols.ts']
const FIRST_LINE = /^(?:\/\/|<!--) template: cartridge\/(\S+) v(\d+)( \(frozen: [^)]+\))?(?: -->)?$/

const firstLine = (path: string): string => readFileSync(path, 'utf8').split('\n', 1)[0]

/** Every file under `dir`, as paths relative to it. */
function tree(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .flatMap((name) => {
      const path = join(dir, name)
      return statSync(path).isDirectory() ? tree(path).map((inner) => `${name}/${inner}`) : [name]
    })
    .sort()
}

const temps: string[] = []
function tempRoot(): string {
  const temp = mkdtempSync(join(tmpdir(), 'new-game-'))
  temps.push(temp)
  return temp
}
afterEach(() => {
  for (const temp of temps.splice(0)) rmSync(temp, { recursive: true, force: true })
})

const requireManifest = createRequire(import.meta.url)
function manifestOf(gameDir: string): CartridgeManifest {
  const exported = Object.values(requireManifest(join(gameDir, 'manifest.ts')) as Record<string, unknown>)
  return exported.find((value) => typeof value === 'object' && value !== null && 'ageBand' in value) as CartridgeManifest
}

/** A copy's own config.ts and state.ts, loaded from where the generator wrote them. */
async function rulesOf(gameDir: string): Promise<{ config: typeof import('../templates/cartridge/config'); state: typeof import('../templates/cartridge/state') }> {
  return { config: await import(/* @vite-ignore */ join(gameDir, 'config.ts')), state: await import(/* @vite-ignore */ join(gameDir, 'state.ts')) }
}

describe('the cartridge template', () => {
  const files = tree(templateDir)

  it('names the template file and one version on the first line of every file', () => {
    expect(files.length).toBeGreaterThan(10)
    const versions = new Set<string>()
    for (const file of files) {
      const named = FIRST_LINE.exec(firstLine(join(templateDir, file)))
      expect(named?.[1], file).toBe(file)
      versions.add(named![2])
    }
    expect([...versions]).toHaveLength(1)
  })

  it('marks as frozen the performance handle, the governor, attention and save cadence, and nothing else', () => {
    const frozen = files.filter((file) => FIRST_LINE.exec(firstLine(join(templateDir, file)))?.[3])
    expect(frozen).toEqual(FROZEN)
    expect(frozenFiles()).toEqual(FROZEN)
  })

  it('declares window.__jamPerf exactly as games/bad-neighbours/perf.ts does', () => {
    const declaration = (path: string): string => /^type JamPerf = [\s\S]*?^declare global \{[\s\S]*?^\}$/m.exec(readFileSync(path, 'utf8'))?.[0] ?? `no declaration in ${path}`
    expect(declaration(join(templateDir, 'perf.ts'))).toBe(declaration(join(root, 'games', 'bad-neighbours', 'perf.ts')))
  })

  it('holds no web address in its documents', () => {
    for (const file of files.filter((name) => name.endsWith('.md'))) expect(readFileSync(join(templateDir, file), 'utf8'), file).not.toMatch(/https?:|www\./)
  })
})

describe('new:game', () => {
  const ARGS = ['hedgehog-post', "Hedgehog's Post", '4-8', '🦔']

  it('copies the template into games/<key>/, renames the Mount file, and writes nothing else', () => {
    const temp = tempRoot()
    newGame(ARGS, temp)
    // The band of this copy starts at 4, so the symbols module stays behind.
    const expected = tree(templateDir)
      .filter((file) => !SYMBOLS.includes(file))
      .map((file) => `games/hedgehog-post/${file === 'game.tsx' ? 'hedgehog-post.tsx' : file}`)
    expect(tree(temp)).toEqual(expected.sort())
  })

  it('fills the manifest and the jam registration from the arguments, and the config reads the manifest', () => {
    const temp = tempRoot()
    newGame(ARGS, temp)
    const gameDir = join(temp, 'games', 'hedgehog-post')
    const manifest = manifestOf(gameDir)
    expect(validateManifest(manifest)).toEqual([])
    expect(manifest.key).toBe('hedgehog-post')
    expect(manifest.name).toBe("Hedgehog's Post")
    expect(manifest.ageBand).toEqual([4, 8])
    const index = readFileSync(join(gameDir, 'index.ts'), 'utf8')
    expect(index).toContain("emoji: '🦔'")
    expect(index).toContain("from './hedgehog-post'")
    // The placeholder names are gone from every file, so two generated games never export the same name.
    for (const file of tree(gameDir)) expect(readFileSync(join(gameDir, file), 'utf8'), file).not.toMatch(/templateManifest|templateCartridge/)
    expect(readFileSync(join(gameDir, 'config.ts'), 'utf8')).toContain('hedgehogPostManifest')
  })

  it('leaves every relative import pointing at a file in the copy or at ../types', () => {
    const temp = tempRoot()
    newGame(ARGS, temp)
    const gameDir = join(temp, 'games', 'hedgehog-post')
    const unresolved: string[] = []
    let imports = 0
    for (const file of tree(gameDir).filter((name) => /\.tsx?$/.test(name))) {
      const source = readFileSync(join(gameDir, file), 'utf8')
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"](\.[^'"\n]*)['"]/g)) {
        imports += 1
        if (match[1] === '../types') continue
        const target = resolve(dirname(join(gameDir, file)), match[1])
        const inCopy = !relative(gameDir, target).startsWith('..')
        if (!inCopy || ![target, `${target}.ts`, `${target}.tsx`].some((path) => existsSync(path) && statSync(path).isFile())) unresolved.push(`${file} imports ${match[1]}`)
      }
    }
    expect(imports).toBeGreaterThan(10)
    expect(unresolved).toEqual([])
  })

  it('makes a copy that passes the egress scan and the wordless scan untouched', () => {
    const temp = tempRoot()
    newGame(ARGS, temp)
    expect(scanTree(temp, { built: false })).toEqual([])
    expect(scanGames(temp)).toEqual([])
  })

  it('copies the grown-up overlay as a free file, under the one name that lets its readout past the wordless scan', () => {
    const temp = tempRoot()
    const gameDir = newGame(ARGS, temp)
    const overlay = readFileSync(join(gameDir, 'overlay.ts'), 'utf8')
    expect(overlay).toBe(readFileSync(join(templateDir, 'overlay.ts'), 'utf8'))
    expect(existsSync(join(gameDir, 'overlay.test.ts'))).toBe(true)
    expect(frozenFiles()).not.toContain('overlay.ts')
    // The Mount of the copy is wired to it.
    expect(readFileSync(join(gameDir, 'hedgehog-post.tsx'), 'utf8')).toContain("from './overlay'")
    // Its readout is text. It passes behind the plain exception because the file is named overlay: the same
    // file under another name is a finding, so the readout cannot wander into the kid side.
    expect(overlay).toMatch(/\/\/ wordless-ok: \S/)
    expect(scanGames(temp)).toEqual([])
    renameSync(join(gameDir, 'overlay.ts'), join(gameDir, 'readout.ts'))
    expect(scanGames(temp).map((finding) => finding.rule)).toEqual(['plain-exception-misplaced'])
  })

  it('gives the symbols module and its test only to a game whose band starts at 6 or above', () => {
    const temp = tempRoot()
    for (const [key, band, holds] of [['young-one', '2-4', false], ['just-under', '5-9', false], ['just-there', '6-10', true], ['old-one', '9-12', true]] as const) {
      const gameDir = newGame([key, 'A Game', band, '🎲'], temp)
      for (const file of SYMBOLS) {
        expect(existsSync(join(gameDir, file)), `${band} ${file}`).toBe(holds)
        if (holds) expect(readFileSync(join(gameDir, file), 'utf8'), `${band} ${file}`).toBe(readFileSync(join(templateDir, file), 'utf8'))
      }
    }
    // The copies that hold it pass both scans untouched: every text call in it is behind the numeral exception.
    expect(scanTree(temp, { built: false })).toEqual([])
    expect(scanGames(temp)).toEqual([])
    // The same module in a game whose band starts below 6 is a finding, so it cannot be carried down by hand.
    writeFileSync(join(temp, 'games', 'young-one', 'symbols.ts'), readFileSync(join(templateDir, 'symbols.ts'), 'utf8'))
    expect(new Set(scanGames(temp).map((finding) => finding.rule))).toEqual(new Set(['numeral-exception-band']))
  })

  it('copies the frozen files byte for byte', () => {
    const temp = tempRoot()
    newGame(ARGS, temp)
    for (const file of FROZEN) expect(readFileSync(join(temp, 'games', 'hedgehog-post', file), 'utf8'), file).toBe(readFileSync(join(templateDir, file), 'utf8'))
  })

  it('accepts the widest and the narrowest band the jam allows', () => {
    const temp = tempRoot()
    newGame(['wide', 'Wide', '7-12', '🪁'], temp)
    newGame(['narrow', 'Narrow', '2-2', '🫧'], temp)
    expect(manifestOf(join(temp, 'games', 'wide')).ageBand).toEqual([7, 12])
    expect(manifestOf(join(temp, 'games', 'narrow')).ageBand).toEqual([2, 2])
  })

  it.each([
    ['2-2', 2, 2],
    ['4-8', 4, 8],
    ['9-12', 9, 12],
  ])('makes a copy at band %s whose first visit starts every age of the band at a row it can reach', async (band, youngest, oldest) => {
    const temp = tempRoot()
    const { config, state } = await rulesOf(newGame([`band-${band}`, 'Band', band, '🫧'], temp))
    const rows = config.FIRST_VISIT
    // One row for each end of the band, and one row only when the band is a single age.
    expect(rows.map((row) => row.fromAge)).toEqual(youngest === oldest ? [youngest] : [youngest, oldest])
    for (const row of rows) expect(config.LADDER).toContain(row.position)
    expect(state.deserialize(null, null).position).toBe(rows[0].position)
    expect(state.deserialize(null, youngest - 1).position).toBe(rows[0].position)
    expect(state.deserialize(null, youngest).position).toBe(rows[0].position)
    expect(state.deserialize(null, oldest).position).toBe(rows[rows.length - 1].position)
    expect(state.deserialize(null, oldest + 1).position).toBe(rows[rows.length - 1].position)
  })

  it.each([
    ['2-2', 'once', 1],
    ['3-5', 'once', 1],
    ['4-8', 'twice', 2],
    ['9-12', 'twice', 2],
  ])('makes a copy at band %s whose ghost hand presses %s to show a tap', async (band, _, presses) => {
    const temp = tempRoot()
    const gameDir = newGame([`band-${band}`, 'Band', band, '🫧'], temp)
    const { config } = await rulesOf(gameDir)
    expect(config.TAP_PRESSES).toBe(presses)
    // The copy's own hand, left to its default: how many times it goes down over one demonstration of a tap.
    const { handPose }: typeof import('../templates/cartridge/guidance') = await import(/* @vite-ignore */ join(gameDir, 'guidance.ts'))
    const pose = { travel: 0, press: 0, opacity: 0 }
    let shown = 0
    let down = false
    for (let i = 0; i <= 200; i++) {
      const pressed = handPose(i / 200, false, pose).press > 0.5
      if (pressed && !down) shown += 1
      down = pressed
    }
    expect(shown).toBe(presses)
  })

  it.each([
    ['a key a game already uses', ['taken', 'Taken', '4-8', '🦔'], /already exists/],
    ['a key a showcase already uses', ['shown', 'Shown', '4-8', '🦔'], /already exists/],
    ['a key with an upper-case letter', ['Hedgehog', 'Hedgehog', '4-8', '🦔'], /kebab-case/],
    ["a key that is the name of one of the template's own modules", ['state', 'State', '4-8', '🦔'], /state\.ts/],
    ['the key index, which the jam registration would import itself under', ['index', 'Index', '4-8', '🦔'], /index\.ts/],
    ["the key overlay, the name of the template's grown-up overlay", ['overlay', 'Overlay', '4-8', '🦔'], /overlay\.ts/],
    ['a band wider than five years', ['hedgehog-post', 'Hedgehog', '4-10', '🦔'], /wider than 5 years/],
    ['a band that starts below 2', ['hedgehog-post', 'Hedgehog', '1-4', '🦔'], /within 2 to 12/],
    ['a band that ends above 12', ['hedgehog-post', 'Hedgehog', '9-13', '🦔'], /within 2 to 12/],
    ['a band with the oldest age first', ['hedgehog-post', 'Hedgehog', '8-4', '🦔'], /youngest age first/],
    ['a band that is not whole years', ['hedgehog-post', 'Hedgehog', '4.5-8', '🦔'], /whole years/],
    ['a band that is not <youngest>-<oldest>', ['hedgehog-post', 'Hedgehog', '4 to 8', '🦔'], /not <youngest>-<oldest>/],
    ['a blank name', ['hedgehog-post', ' ', '4-8', '🦔'], /the name is blank/],
    ['a blank emoji', ['hedgehog-post', 'Hedgehog', '4-8', ' '], /the emoji is blank/],
    ['a missing emoji', ['hedgehog-post', 'Hedgehog', '4-8'], /new:game/],
  ])('refuses %s and writes nothing', (_, args, reason) => {
    const temp = tempRoot()
    mkdirSync(join(temp, 'games', 'taken'), { recursive: true })
    mkdirSync(join(temp, 'showcases', 'shown'), { recursive: true })
    expect(() => newGame(args, temp)).toThrow(reason)
    expect(tree(temp)).toEqual([])
    expect(readdirSync(join(temp, 'games'))).toEqual(['taken'])
    expect(readdirSync(join(temp, 'showcases'))).toEqual(['shown'])
  })
})

describe('new:game --refresh', () => {
  /** A fresh game in a temporary root, with one character of its quality.ts changed. */
  function drifted(): { temp: string; gameDir: string } {
    const temp = tempRoot()
    const gameDir = newGame(['hedgehog-post', 'Hedgehog Post', '4-8', '🦔'], temp)
    const path = join(gameDir, 'quality.ts')
    writeFileSync(path, readFileSync(path, 'utf8').replace('Adaptive quality.', 'Adaptive quality!'))
    return { temp, gameDir }
  }
  const contents = (dir: string): Record<string, string> => Object.fromEntries(tree(dir).map((file) => [file, readFileSync(join(dir, file), 'utf8')]))

  it("writes the template's frozen files over the game's, and reports the ones it changed", () => {
    const { temp, gameDir } = drifted()
    expect(readFileSync(join(gameDir, 'quality.ts'), 'utf8')).not.toBe(readFileSync(join(templateDir, 'quality.ts'), 'utf8'))
    expect(refreshGame('hedgehog-post', temp)).toEqual(['quality.ts'])
    for (const file of FROZEN) expect(readFileSync(join(gameDir, file), 'utf8'), file).toBe(readFileSync(join(templateDir, file), 'utf8'))
    expect(refreshGame('hedgehog-post', temp)).toEqual([])
  })

  it('puts back a frozen file that was deleted', () => {
    const { temp, gameDir } = drifted()
    rmSync(join(gameDir, 'attention.ts'))
    expect(refreshGame('hedgehog-post', temp)).toEqual(['attention.ts', 'quality.ts'])
    expect(readFileSync(join(gameDir, 'attention.ts'), 'utf8')).toBe(readFileSync(join(templateDir, 'attention.ts'), 'utf8'))
  })

  it('writes nothing else: every other file of the game, edited or added, is left as it is', () => {
    const { temp, gameDir } = drifted()
    writeFileSync(join(gameDir, 'config.ts'), readFileSync(join(gameDir, 'config.ts'), 'utf8').replace("'#f4efe6'", "'#102030'"))
    mkdirSync(join(gameDir, 'view'))
    writeFileSync(join(gameDir, 'view', 'draw.ts'), 'export const drawn = true\n')
    const before = contents(temp)
    refreshGame('hedgehog-post', temp)
    const after = contents(temp)
    expect(Object.keys(after)).toEqual(Object.keys(before))
    for (const file of Object.keys(before)) {
      if (!FROZEN.some((frozen) => file === `games/hedgehog-post/${frozen}`)) expect(after[file], file).toBe(before[file])
    }
  })

  it.each([
    ['a key with no game folder', 'nobody-home', /no game folder/],
    ['a game that was not made from the template', 'hand-made', /not made from the template/],
    ['a key that is not a kebab-case slug', '../hedgehog-post', /kebab-case/],
  ])('refuses %s and writes nothing', (_, key, reason) => {
    const { temp } = drifted()
    mkdirSync(join(temp, 'games', 'hand-made'))
    writeFileSync(join(temp, 'games', 'hand-made', 'quality.ts'), '// a governor written by hand\nexport const tier = 0\n')
    const before = contents(temp)
    expect(() => refreshGame(key, temp)).toThrow(reason)
    expect(contents(temp)).toEqual(before)
  })

  it('tells a game made from the template from one that was not', () => {
    const { temp, gameDir } = drifted()
    mkdirSync(join(temp, 'games', 'hand-made'))
    writeFileSync(join(temp, 'games', 'hand-made', 'quality.ts'), '// a governor written by hand\nexport const tier = 0\n')
    expect(madeFromTemplate(gameDir)).toBe(true)
    expect(madeFromTemplate(join(temp, 'games', 'hand-made'))).toBe(false)
  })
})
