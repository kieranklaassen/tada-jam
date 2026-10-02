// The education pack is its own island, like the lab. The root checks do not
// know about it, it imports nothing from the jam or the lab, and nothing there
// imports from it. Its files never reach dist/: the built-output check
// (built-check.ts) holds that line after a build, where this test cannot.

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { crossings, OUTSIDE, sourceFiles, specifiers, strayTopLevelMarkdown } from './isolation.ts'

const EDUCATION = resolve(import.meta.dirname, '..')
const ROOT = resolve(EDUCATION, '..')

// A throwaway repo root holding the given files.
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'education-isolation-'))
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  return root
}

// Import lines are built from pieces so this file holds no crossing import itself.
function line(...parts: string[]): string {
  return parts.join(' ') + '\n'
}

describe('the root checks do not know about the pack', () => {
  const names = /education/i

  it('root tsconfig, vite and vitest configs do not name it', () => {
    const configs = readdirSync(ROOT).filter((name) => /^(?:tsconfig.*\.json|vite(?:st)?\.config\..+)$/.test(name))
    expect(configs).toContain('tsconfig.json')
    expect(configs).toContain('vite.config.ts')
    for (const name of configs) expect(readFileSync(join(ROOT, name), 'utf8'), name).not.toMatch(names)
  })

  it('no script under scripts/ names it (the egress and wordless allowlists)', () => {
    const scripts = sourceFiles(join(ROOT, 'scripts'))
    expect(existsSync(join(ROOT, 'scripts', 'egress-check.ts'))).toBe(true)
    expect(existsSync(join(ROOT, 'scripts', 'wordless-check.ts'))).toBe(true)
    for (const file of scripts) expect(readFileSync(file, 'utf8'), file).not.toMatch(names)
  })
})

describe('imports never cross the boundary', () => {
  it('nothing outside imports from education/, and education/ imports from nothing outside', () => {
    for (const dir of OUTSIDE) expect(sourceFiles(join(ROOT, dir)).length, dir).toBeGreaterThan(0)
    expect(sourceFiles(EDUCATION).length).toBeGreaterThan(0)
    expect(crossings(ROOT)).toEqual([])
  })

  it('a file under harness/ that imports from education/ is named', () => {
    const root = fixture({
      'harness/shell.ts': line('import { lookup } from', "'../education/tools/lookup.ts'"),
      'education/tools/lookup.ts': 'export const lookup = 1\n',
    })
    expect(crossings(root)).toEqual(['harness/shell.ts imports ../education/tools/lookup.ts'])
  })

  it('a file under education/ that imports from games/ is named', () => {
    const root = fixture({
      'education/tools/reader.ts': line('import { manifest } from', "'../../games/pebble-table/manifest.ts'"),
      'games/pebble-table/manifest.ts': 'export const manifest = 1\n',
    })
    expect(crossings(root)).toEqual(['education/tools/reader.ts imports ../../games/pebble-table/manifest.ts'])
  })

  it('the detector finds a crossing written as a static import, a dynamic import, or a glob', () => {
    const source =
      line('import a from', "'../education/a.ts'") +
      line('export * from', '"../education/b.ts"') +
      line('const c = await import(', "'../education/c.ts')") +
      line('const d = import.meta.glob<{ id: string }>(', "'../education/corpus/**/*.md')") +
      line('const e = import.meta.glob(', "['/education/e/*.ts', '../education/f/*.ts'])")
    expect(specifiers(source)).toEqual([
      '../education/a.ts',
      '../education/b.ts',
      '../education/c.ts',
      '../education/corpus/**/*.md',
      '/education/e/*.ts',
      '../education/f/*.ts',
    ])
    const root = fixture({ 'lab/probe.ts': source, 'lab/rng.ts': line('export * from', "'./seed.ts'") })
    expect(crossings(root)).toEqual(specifiers(source).map((spec) => `lab/probe.ts imports ${spec}`))
  })
})

// education/ is also declared as a Compound Pack, whose top level holds its
// description (README.md) and its rules. Any other markdown file there would
// be reported as a skipped pack file.
describe('the top level of education/ holds only pack markdown', () => {
  it('has no .md besides README.md and rules with title and applies_when', () => {
    expect(strayTopLevelMarkdown(EDUCATION)).toEqual([])
  })

  it('names a top-level .md that is neither', () => {
    const root = fixture({
      'README.md': '# Pack\n',
      'NOTES.md': '# Notes\n',
      'half-rule.md': '---\ntitle: Half\n---\nBody\n',
      'rule.md': '---\ntitle: Cite the record id\napplies_when:\n  - a game has a learning goal\n---\nBody\n',
      'docs/GUIDE.md': '# Guide\n',
      'tsconfig.json': '{}\n',
    })
    expect(strayTopLevelMarkdown(root)).toEqual(['NOTES.md', 'half-rule.md'])
  })
})
