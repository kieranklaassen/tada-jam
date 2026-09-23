// Wordless check: kid-side game code must not put words or numerals on screen.
//
// Jam games are for children who may not read yet, so every interaction has
// to be understandable from cues (motion, glow, demonstration, sound) at the
// game's declared age band. This scans game source (not tests, manifests,
// jam registration, or the harness) with a real TSX parser and flags:
//   kid-text-jsx        text between JSX tags            <p>Tap here</p>
//   kid-text-literal    a string or template child      <p>{'Tap'}</p>
//   kid-text-number     a value formatted as text child  <p>{String(count)}</p>, {n.toFixed(1)}
//   kid-text-api        DOM or canvas text APIs         el.textContent = 'x', ctx.fillText(...)
//   kid-text-component  3D/HTML text components         <Text>, <Text3D>, <Html>
// A bare `{count}` child cannot be told apart from an element without types,
// so review still has to catch raw numbers rendered that way.
// Attributes are not text on screen, so aria-label and friends stay allowed.
// A deliberate exception (for example a grown-up corner behind a hold
// gesture) carries a `wordless-ok: <reason>` comment on the same or the
// previous line.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseAst } from 'vite'

export type WordlessFinding = { file: string; line: number; rule: string; match: string }

type Node = { type: string; start: number; end: number; [key: string]: unknown }

const HAS_WORDS = /[\p{L}\p{N}]/u
const TEXT_PROPERTIES = new Set(['textContent', 'innerText', 'innerHTML', 'outerHTML'])
const TEXT_CALLS = new Set(['fillText', 'strokeText', 'createTextNode', 'insertAdjacentText', 'insertAdjacentHTML', 'alert', 'prompt'])
const TEXT_COMPONENTS = new Set(['Text', 'Text3D', 'Html'])
const FORMAT_FUNCTIONS = new Set(['String', 'Number'])
const FORMAT_METHODS = new Set(['toString', 'toFixed', 'toPrecision', 'toLocaleString', 'format', 'join'])

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string'
}

function walk(node: unknown, visit: (node: Node) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (!isNode(node)) return
  visit(node)
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const child = node[key]
    if (typeof child === 'object' && child !== null) walk(child, visit)
  }
}

function propertyName(node: unknown): string | null {
  if (!isNode(node)) return null
  if (node.type === 'Identifier') return node.name as string
  if (node.type === 'MemberExpression' || node.type === 'StaticMemberExpression') {
    const property = node.property as Node
    return property?.type === 'Identifier' ? (property.name as string) : null
  }
  return null
}

function formatsText(node: Node): boolean {
  if (node.type !== 'CallExpression') return false
  const callee = node.callee as Node
  if (callee?.type === 'Identifier') return FORMAT_FUNCTIONS.has(callee.name as string)
  const name = propertyName(callee)
  return name !== null && FORMAT_METHODS.has(name)
}

function literalHasWords(node: Node): boolean {
  if (node.type === 'Literal' && typeof node.value === 'string') return HAS_WORDS.test(node.value)
  if (node.type === 'TemplateLiteral') {
    const quasis = node.quasis as { value: { raw: string } }[]
    return quasis.some((quasi) => HAS_WORDS.test(quasi.value.raw))
  }
  return false
}

export function scanWordless(source: string, file: string): WordlessFinding[] {
  const lang = file.endsWith('.tsx') ? 'tsx' : file.endsWith('.jsx') ? 'jsx' : file.endsWith('.js') ? 'js' : 'ts'
  let ast: unknown
  try {
    ast = parseAst(source, { lang })
  } catch (error) {
    return [{ file, line: 0, rule: 'parse-error', match: String(error).split('\n')[0] }]
  }
  const lines = source.split('\n')
  const lineStarts: number[] = [0]
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') lineStarts.push(i + 1)
  const lineOf = (offset: number): number => {
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (lineStarts[mid] <= offset) low = mid
      else high = mid - 1
    }
    return low + 1
  }
  const allowed = (line: number): boolean => /wordless-ok:/.test(lines[line - 1] ?? '') || /wordless-ok:/.test(lines[line - 2] ?? '')

  const findings: WordlessFinding[] = []
  const report = (node: Node, rule: string): void => {
    const line = lineOf(node.start)
    if (allowed(line)) return
    const match = source.slice(node.start, Math.min(node.end, node.start + 60)).replace(/\s+/g, ' ').trim()
    findings.push({ file, line, rule, match })
  }

  walk(ast, (node) => {
    switch (node.type) {
      case 'JSXText':
        if (HAS_WORDS.test(String(node.value))) report(node, 'kid-text-jsx')
        break
      case 'JSXExpressionContainer': {
        const expression = node.expression
        if (isNode(expression) && literalHasWords(expression)) report(node, 'kid-text-literal')
        else if (isNode(expression) && formatsText(expression)) report(node, 'kid-text-number')
        break
      }
      case 'JSXOpeningElement': {
        const name = node.name as Node
        const tag = name?.type === 'JSXIdentifier' ? (name.name as string) : name?.type === 'JSXMemberExpression' ? ((name.property as Node).name as string) : null
        if (tag && TEXT_COMPONENTS.has(tag)) report(node, 'kid-text-component')
        break
      }
      case 'AssignmentExpression': {
        const name = propertyName(node.left)
        if (name && TEXT_PROPERTIES.has(name) && isNode(node.left) && node.left.type !== 'Identifier') report(node, 'kid-text-api')
        break
      }
      case 'CallExpression': {
        const name = propertyName(node.callee)
        if (name && TEXT_CALLS.has(name)) report(node, 'kid-text-api')
        break
      }
    }
  })
  return findings
}

/**
 * Kid-side files are cartridge code under games/<key>/. Showcases (showcase/<key>/) are owner-approved
 * non-cartridges with grown-up text by design, so this check deliberately never scans them.
 */
function isKidSideFile(relativePath: string): boolean {
  const parts = relativePath.split('/')
  if (parts[0] !== 'games' || parts.length < 3) return false
  const name = parts[parts.length - 1]
  if (!/\.(?:tsx?|jsx?)$/.test(name) || name.endsWith('.d.ts')) return false
  if (/\.test\.[jt]sx?$/.test(name)) return false
  if (parts.length === 3 && (name === 'manifest.ts' || name === 'index.ts')) return false
  return true
}

function files(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

export function scanGames(root: string): WordlessFinding[] {
  return files(join(root, 'games'))
    .map((path) => relative(root, path).split('\\').join('/'))
    .filter(isKidSideFile)
    .flatMap((file) => scanWordless(readFileSync(join(root, file), 'utf8'), file))
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const findings = scanGames(root)
  if (findings.length > 0) {
    for (const f of findings) console.error(`${f.file}:${f.line}  ${f.rule}  ${f.match}`)
    console.error(`\nwordless check failed: ${findings.length} finding(s). Kid-side code shows no words or numerals; use cues (motion, glow, demonstration, sound). A deliberate grown-up exception needs a "wordless-ok: <reason>" comment.`)
    process.exit(1)
  }
  console.log('wordless check passed')
}
