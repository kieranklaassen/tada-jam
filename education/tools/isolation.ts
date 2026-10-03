// The boundary of the education pack, as functions over a repo root so
// isolation.test.ts can run them on the real tree and on fixtures.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

// The top-level folders the pack shares no code with, in either direction.
export const OUTSIDE = ['games', 'harness', 'showcases', 'lab', 'scripts', 'test'] as const

const SOURCE = /\.(?:ts|tsx|mjs|js)$/

export function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(full))
    else if (SOURCE.test(entry.name)) found.push(full)
  }
  return found
}

// Every module specifier a source file imports: static and dynamic imports,
// re-exports, and import.meta.glob patterns.
export function specifiers(source: string): string[] {
  const found: string[] = []
  const direct = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"\n]+)['"]/g
  for (const match of source.matchAll(direct)) found.push(match[1]!)
  const globs = /import\.meta\.glob[^(]*\(\s*(\[[^\]]*\]|['"][^'"\n]+['"])/g
  for (const match of source.matchAll(globs)) {
    for (const quoted of match[1]!.matchAll(/['"]([^'"\n]+)['"]/g)) found.push(quoted[1]!)
  }
  return found
}

// Where a specifier points, if it is a path: relative to the file, or
// root-absolute in Vite style (/games/x), or a bare top-level folder name.
function target(root: string, file: string, spec: string): string {
  if (spec.startsWith('.')) return resolve(dirname(file), spec)
  return resolve(root, spec.replace(/^\//, ''))
}

function offenders(root: string, files: readonly string[], forbidden: readonly string[]): string[] {
  const bad: string[] = []
  for (const file of files) {
    for (const spec of specifiers(readFileSync(file, 'utf8'))) {
      const to = target(root, file, spec)
      if (forbidden.some((dir) => to === dir || to.startsWith(dir + sep))) bad.push(`${relative(root, file)} imports ${spec}`)
    }
  }
  return bad
}

// Every import that crosses the boundary, in either direction, as
// "<file> imports <specifier>" with the file relative to the root.
export function crossings(root: string): string[] {
  const education = join(root, 'education')
  const outside = OUTSIDE.map((dir) => join(root, dir))
  return [
    ...offenders(root, outside.flatMap(sourceFiles), [education]),
    ...offenders(root, sourceFiles(education), outside),
  ]
}

function frontmatterKeys(text: string): string[] {
  const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (!block) return []
  return [...block[1]!.matchAll(/^([A-Za-z_][\w-]*):/gm)].map((match) => match[1]!)
}

// The markdown files at the top level of a Compound Pack folder that are
// neither its description (README.md) nor a rule (frontmatter with `title`
// and `applies_when`).
export function strayTopLevelMarkdown(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .filter((entry) => {
      const keys = frontmatterKeys(readFileSync(join(dir, entry.name), 'utf8'))
      return !(keys.includes('title') && keys.includes('applies_when'))
    })
    .map((entry) => entry.name)
    .sort()
}
