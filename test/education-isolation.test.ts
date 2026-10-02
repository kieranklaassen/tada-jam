import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The education pack (education/) is a development-time reference corpus with
// its own toolchain, like the lab. Nothing the jam checks or ships may import
// from it. This is the jam's half of that guarantee; the pack's own isolation
// test holds the rest, and this file imports nothing from the pack.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pack = join(root, 'education')

function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(?:ts|tsx|mjs|js)$/.test(entry.name) ? [full] : []
  })
}

// The specifiers in a source file that point into the pack: static imports,
// re-exports, dynamic import() and import.meta.glob patterns.
function packImports(file: string, source: string): string[] {
  const specs = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"\n]+)['"]/g)].map((match) => match[1])
  for (const glob of source.matchAll(/import\.meta\.glob[^(]*\(\s*(\[[^\]]*\]|['"][^'"\n]+['"])/g)) {
    specs.push(...[...glob[1].matchAll(/['"]([^'"\n]+)['"]/g)].map((match) => match[1]))
  }
  return specs.filter((spec) => {
    const target = spec.startsWith('.') ? resolve(dirname(file), spec) : resolve(root, spec.replace(/^\//, ''))
    return target === pack || target.startsWith(pack + sep)
  })
}

describe('the jam does not import from the education pack', () => {
  it('no file under games/, harness/, showcases/, scripts/ or test/ imports from education/', () => {
    const files = ['games', 'harness', 'showcases', 'scripts', 'test'].flatMap((dir) => sourceFiles(join(root, dir)))
    expect(files.length).toBeGreaterThan(5)
    const crossings = files.flatMap((file) => packImports(file, readFileSync(file, 'utf8')).map((spec) => `${relative(root, file)} imports ${spec}`))
    expect(crossings).toEqual([])
  })

  it('the detector finds a crossing written as a static import, a dynamic import, or a glob', () => {
    // Built from pieces so this file holds no crossing import itself.
    const source = [
      ['import a from', "'../education/a.ts'"],
      ['const b = await import(', "'../education/b.ts')"],
      ['const c = import.meta.glob<{ id: string }>(', "['/education/c/*.md', './own/*.ts'])"],
    ]
      .map((parts) => parts.join(' '))
      .join('\n')
    expect(packImports(join(root, 'harness', 'shell.ts'), source)).toEqual(['../education/a.ts', '../education/b.ts', '/education/c/*.md'])
  })
})
