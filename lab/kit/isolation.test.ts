// The lab is its own island. It changes no existing check (the root configs
// name no lab path), imports nothing from the jam, is imported by nothing in
// the jam, and builds into lab/ only.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import labViteConfig from '../vite.config.ts'

const LAB = resolve(import.meta.dirname, '..')
const ROOT = resolve(LAB, '..')

function underDir(path: string, dir: string): boolean {
  return path === dir || path.startsWith(dir + sep)
}

function walk(dir: string, extensions: readonly string[]): string[] {
  if (!existsSync(dir)) return []
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...walk(full, extensions))
    else if (extensions.some((ext) => entry.name.endsWith(ext))) found.push(full)
  }
  return found
}

// Every module specifier a source file imports: static and dynamic imports,
// re-exports, and import.meta.glob patterns.
function specifiers(source: string): string[] {
  const found: string[] = []
  const direct = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"\n]+)['"]/g
  for (const match of source.matchAll(direct)) found.push(match[1]!)
  const globs = /import\.meta\.glob\s*(?:<[^>]*>)?\s*\(\s*(\[[^\]]*\]|['"][^'"\n]+['"])/g
  for (const match of source.matchAll(globs)) {
    for (const quoted of match[1]!.matchAll(/['"]([^'"\n]+)['"]/g)) found.push(quoted[1]!)
  }
  return found
}

// Where a specifier points, if it is a path: relative to the file, or
// root-absolute in Vite style (/games/x), or a bare top-level folder name.
function resolveSpecifier(file: string, spec: string): string | null {
  if (spec.startsWith('.')) return resolve(dirname(file), spec)
  if (spec.startsWith('/')) return resolve(ROOT, spec.slice(1))
  return resolve(ROOT, spec)
}

function offenders(files: readonly string[], forbidden: readonly string[]): string[] {
  const bad: string[] = []
  for (const file of files) {
    for (const spec of specifiers(readFileSync(file, 'utf8'))) {
      const target = resolveSpecifier(file, spec)
      if (target && forbidden.some((dir) => underDir(target, dir))) bad.push(`${relative(ROOT, file)} imports ${spec}`)
    }
  }
  return bad
}

const mentionsLab = /(?:^|[^A-Za-z0-9])lab(?:[^A-Za-z0-9]|$)/

describe('the root checks do not know about the lab', () => {
  it('root tsconfig.json includes no lab path', () => {
    const text = readFileSync(join(ROOT, 'tsconfig.json'), 'utf8')
    const config = JSON.parse(text) as { include?: string[]; exclude?: string[]; references?: unknown[] }
    for (const entry of [...(config.include ?? []), ...(config.exclude ?? [])]) expect(entry).not.toMatch(mentionsLab)
    expect(text).not.toMatch(mentionsLab)
  })

  it('root vite.config.ts (and its vitest include list) names no lab path', () => {
    expect(readFileSync(join(ROOT, 'vite.config.ts'), 'utf8')).not.toMatch(mentionsLab)
  })
})

describe('imports never cross the boundary', () => {
  it('no file under lab/ imports from games/ or harness/', () => {
    const files = walk(LAB, ['.ts', '.tsx', '.mjs', '.js'])
    expect(files.length).toBeGreaterThan(5)
    expect(offenders(files, [join(ROOT, 'games'), join(ROOT, 'harness')])).toEqual([])
  })

  it('nothing under games/, harness/, scripts/, or test/ imports from lab/', () => {
    const files = ['games', 'harness', 'scripts', 'test'].flatMap((dir) => walk(join(ROOT, dir), ['.ts', '.tsx', '.mjs', '.js']))
    expect(files.length).toBeGreaterThan(5)
    expect(offenders(files, [LAB])).toEqual([])
  })

  it('the detector finds an import that crosses over', () => {
    // Built from pieces so this file does not contain a crossing import itself.
    const source = [
      ['import a from', "'../../games/pebble-table/x.ts'"],
      ['export * from', '"../harness/y.ts"'],
      ['const m = await import(', "'../../harness/z.ts')"],
      ['const g = import.meta.glob(', "['../games/*/index.ts'])"],
    ]
      .map((parts) => parts.join(' '))
      .join('\n')
    expect(specifiers(source)).toEqual([
      '../../games/pebble-table/x.ts',
      '../harness/y.ts',
      '../../harness/z.ts',
      '../games/*/index.ts',
    ])
    const inLab = join(LAB, 'kit', 'x.ts')
    expect(resolveSpecifier(inLab, '../../games/a.ts')).toBe(join(ROOT, 'games', 'a.ts'))
    expect(underDir(resolveSpecifier(inLab, '../../harness/z.ts')!, join(ROOT, 'harness'))).toBe(true)
    expect(underDir(resolveSpecifier(inLab, './rng.ts')!, join(ROOT, 'harness'))).toBe(false)
  })
})

describe('the lab builds into lab/', () => {
  it('its Vite output directory resolves under lab/', () => {
    const root = resolve(labViteConfig.root ?? ROOT)
    const outDir = resolve(root, labViteConfig.build?.outDir ?? 'dist')
    expect(underDir(outDir, LAB)).toBe(true)
    expect(outDir).not.toBe(join(ROOT, 'dist'))
  })

  it('the lab scripts point at lab/ configs', () => {
    const scripts = (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts
    expect(scripts['lab:build']).toContain('lab/vite.config.ts')
    expect(scripts['lab:test']).toContain('lab/vitest.config.ts')
    expect(scripts['lab:typecheck']).toContain('lab/tsconfig.json')
  })
})
