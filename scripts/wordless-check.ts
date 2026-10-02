// Wordless check: kid-side game code must not put words, letters, numerals or
// mathematics signs on screen, except the numerals and signs a game for six
// and over keeps in its symbols module.
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
//   kid-text-attribute  an HTML attribute that shows    <input placeholder="Name" />, <img alt={label} />
//                       its value on screen, given words or formatted text
// Text is a letter, a digit, or a mathematics sign (plus, minus, times,
// divide, equals, less than, greater than, the fraction bar, the decimal
// mark, the percent sign) in its keyboard or Unicode form.
// A bare `{count}` child cannot be told apart from an element without types,
// so review still has to catch raw numbers rendered that way.
// Other attributes are not text on screen, so aria-label, className and
// friends stay allowed however their value is written (a template literal
// class name is not a word on screen). JSX passed through any attribute is
// still scanned as JSX.
//
// Two exceptions exist, each a comment on the same or the previous line, and
// each accepted in one class of file only:
//   wordless-ok: <reason>          in a grown-up overlay file: one named
//                                  `overlay` or `perf`, or one listed by path
//                                  in LISTED_OVERLAY_FILES
//   wordless-ok: numeral <reason>  in `games/<key>/symbols.ts`, when the
//                                  game's manifest `ageBand` starts at 6 or
//                                  above, and the text is not a literal that
//                                  holds a letter
// Anywhere else the comment is itself a finding:
//   plain-exception-misplaced    the plain exception outside a grown-up overlay file
//   numeral-exception-misplaced  the numeral exception outside symbols.ts
//   numeral-exception-band       the numeral exception in a band that starts below 6
//   numeral-exception-letter     the numeral exception on a literal that holds a letter
// The band is read by importing `games/<key>/manifest.ts`. A manifest that
// cannot be imported, or exports no usable `ageBand`, is one finding for the
// game (manifest-age-band).
// The check cannot see a numeral drawn as path data, geometry, a sprite or a
// committed image, CSS `content`, an emoji that pictures a numeral, a letter
// held in a constant or built at run time inside symbols.ts, or kid-side text
// placed behind the plain exception in a file named `overlay` or `perf`.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseAst } from 'vite'

export type WordlessFinding = { file: string; line: number; rule: string; match: string }
export type FileClass = 'overlay' | 'symbols' | 'other'
export type AgeBand = readonly [number, number]

type Node = { type: string; start: number; end: number; [key: string]: unknown }

// Letters, digits, and the mathematics signs: + - * / : = < > . , % and their Unicode forms
// (− × ÷ ⁄ ∕ ∶ ⋅, the heavy ➕ ➖ ✕ ✖ ➗, the full-width ＋ － ＝ ＜ ＞ ％).
const HAS_TEXT = /[\p{L}\p{N}+\-*/:=<>.,%\u2212\u00D7\u00F7\u2044\u2215\u2236\u22C5\u2795\u2796\u2715\u2716\u2797\uFF0B\uFF0D\uFF1D\uFF1C\uFF1E\uFF05]/u
const HAS_LETTER = /\p{L}/u
const TEXT_PROPERTIES = new Set(['textContent', 'innerText', 'innerHTML', 'outerHTML'])
const TEXT_CALLS = new Set(['fillText', 'strokeText', 'createTextNode', 'insertAdjacentText', 'insertAdjacentHTML', 'alert', 'prompt'])
// Text calls whose first argument is a position, not text.
const POSITION_FIRST_CALLS = new Set(['insertAdjacentText', 'insertAdjacentHTML'])
const TEXT_COMPONENTS = new Set(['Text', 'Text3D', 'Html'])
// Attributes of intrinsic (lower-case) elements that the browser draws as text.
const TEXT_ATTRIBUTES = new Set(['placeholder', 'title', 'alt', 'value', 'defaultValue', 'label'])
const FORMAT_FUNCTIONS = new Set(['String', 'Number'])
const FORMAT_METHODS = new Set(['toString', 'toFixed', 'toPrecision', 'toLocaleString', 'format', 'join'])
const NUMERALS_FROM_AGE = 6
// Grown-up overlay files that are not named `overlay` or `perf`, each with its reason.
const LISTED_OVERLAY_FILES = new Map([
  ['games/felt-meadow/view/view.ts', 'its frame-rate readout, shown only behind ?fps=1, is drawn inside the view module'],
])

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

function literalMatches(node: Node, pattern: RegExp): boolean {
  if (node.type === 'Literal' && typeof node.value === 'string') return pattern.test(node.value)
  if (node.type === 'TemplateLiteral') {
    const quasis = node.quasis as { value: { raw: string } }[]
    return quasis.some((quasi) => pattern.test(quasi.value.raw))
  }
  return false
}

/** Whether the text an expression yields is, on any branch, a string or template literal that holds a letter. */
function textHoldsLetter(node: unknown): boolean {
  if (!isNode(node)) return false
  if (literalMatches(node, HAS_LETTER)) return true
  switch (node.type) {
    case 'TemplateLiteral':
      return (node.expressions as unknown[]).some(textHoldsLetter)
    case 'ConditionalExpression':
      return textHoldsLetter(node.consequent) || textHoldsLetter(node.alternate)
    case 'LogicalExpression':
    case 'BinaryExpression':
      return textHoldsLetter(node.left) || textHoldsLetter(node.right)
    case 'ParenthesizedExpression':
    case 'TSAsExpression':
    case 'TSNonNullExpression':
      return textHoldsLetter(node.expression)
  }
  return false
}

/** The text a `kid-text-api` finding shows: the assigned value, or the arguments of the text call. */
function shownByApi(node: Node): unknown[] {
  if (node.type === 'AssignmentExpression') return [node.right]
  const args = (node.arguments as unknown[]) ?? []
  const name = propertyName(node.callee)
  return name !== null && POSITION_FIRST_CALLS.has(name) ? args.slice(1) : args
}

/**
 * The class of a kid-side file, which decides the exception it may carry: a grown-up overlay file (named
 * `overlay` or `perf`, or listed by path), the game's symbols module (`games/<key>/symbols.ts`), or other.
 */
function fileClassOf(relativePath: string): FileClass {
  const parts = relativePath.split('/')
  if (/^(?:overlay|perf)\.[jt]sx?$/.test(parts[parts.length - 1]) || LISTED_OVERLAY_FILES.has(relativePath)) return 'overlay'
  if (parts.length === 3 && parts[0] === 'games' && parts[2] === 'symbols.ts') return 'symbols'
  return 'other'
}

/**
 * Scans one source string. The file class decides which exception comment is accepted and defaults to the
 * class of `file` as a path from the repository root; the band is the game's manifest `ageBand`, and without
 * one no numeral exception is accepted.
 */
export function scanWordless(source: string, file: string, context: { fileClass?: FileClass; ageBand?: AgeBand | null } = {}): WordlessFinding[] {
  const fileClass = context.fileClass ?? fileClassOf(file)
  const ageBand = context.ageBand ?? null
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
  // The exception comment on the same or the previous line: 'numeral', 'plain', or none.
  const exceptionAt = (line: number): 'numeral' | 'plain' | null => {
    for (const text of [lines[line - 1] ?? '', lines[line - 2] ?? '']) {
      const comment = /wordless-ok:\s*(numeral\b)?/.exec(text)
      if (comment) return comment[1] ? 'numeral' : 'plain'
    }
    return null
  }
  // Why the exception on a finding is refused, as [rule, reason], or null when it is accepted.
  const refusal = (exception: 'numeral' | 'plain', node: Node, rule: string): [string, string] | null => {
    if (exception === 'plain') return fileClass === 'overlay' ? null : ['plain-exception-misplaced', 'the plain exception belongs in a grown-up overlay file']
    if (fileClass !== 'symbols') return ['numeral-exception-misplaced', 'the numeral exception belongs in symbols.ts']
    if (!ageBand) return ['numeral-exception-band', 'no age band is known for this game']
    if (ageBand[0] < NUMERALS_FROM_AGE) return ['numeral-exception-band', `band [${ageBand[0]}, ${ageBand[1]}] starts below ${NUMERALS_FROM_AGE}`]
    if (rule === 'kid-text-api' && shownByApi(node).some(textHoldsLetter)) return ['numeral-exception-letter', 'the numeral exception does not cover a literal that holds a letter']
    return null
  }

  const findings: WordlessFinding[] = []
  const report = (node: Node, rule: string): void => {
    const line = lineOf(node.start)
    const match = source.slice(node.start, Math.min(node.end, node.start + 60)).replace(/\s+/g, ' ').trim()
    const exception = exceptionAt(line)
    if (!exception) {
      findings.push({ file, line, rule, match })
      return
    }
    const refused = refusal(exception, node, rule)
    if (refused) findings.push({ file, line, rule: refused[0], match: `${match}  (${refused[1]})` })
  }
  // Expression containers that are an attribute's value, judged by the attribute rule instead of the child rule.
  const attributeValues = new Set<Node>()

  walk(ast, (node) => {
    switch (node.type) {
      case 'JSXText':
        if (HAS_TEXT.test(String(node.value))) report(node, 'kid-text-jsx')
        break
      case 'JSXExpressionContainer': {
        if (attributeValues.has(node)) break
        const expression = node.expression
        if (isNode(expression) && literalMatches(expression, HAS_TEXT)) report(node, 'kid-text-literal')
        else if (isNode(expression) && formatsText(expression)) report(node, 'kid-text-number')
        break
      }
      case 'JSXOpeningElement': {
        const name = node.name as Node
        const tag = name?.type === 'JSXIdentifier' ? (name.name as string) : name?.type === 'JSXMemberExpression' ? ((name.property as Node).name as string) : null
        if (tag && TEXT_COMPONENTS.has(tag)) report(node, 'kid-text-component')
        const intrinsic = name?.type === 'JSXIdentifier' && /^[a-z]/.test(tag ?? '')
        for (const attribute of (node.attributes as Node[]) ?? []) {
          if (attribute.type !== 'JSXAttribute' || !isNode(attribute.value)) continue
          const value = attribute.value
          if (value.type === 'JSXExpressionContainer') attributeValues.add(value)
          const key = attribute.name as Node
          if (!intrinsic || key?.type !== 'JSXIdentifier' || !TEXT_ATTRIBUTES.has(key.name as string)) continue
          const shown = value.type === 'JSXExpressionContainer' ? (value.expression as Node) : value
          if (isNode(shown) && (literalMatches(shown, HAS_TEXT) || formatsText(shown))) report(attribute, 'kid-text-attribute')
        }
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
 * Kid-side files are cartridge code under games/<key>/. Showcases (showcases/<key>/) are owner-approved
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

// Manifests are Node-importable by rule; a synchronous import keeps scanGames synchronous for its callers.
const importManifest = createRequire(import.meta.url)

/** A game's `ageBand`, read by importing its manifest, or the reason it cannot be read. */
function readAgeBand(manifestPath: string): AgeBand | string {
  let exported: unknown[]
  try {
    exported = Object.values(importManifest(manifestPath) as Record<string, unknown>)
  } catch (error) {
    return `the manifest cannot be imported: ${String(error).split('\n')[0]}`
  }
  for (const value of exported) {
    const band = (value as { ageBand?: unknown } | null)?.ageBand
    if (Array.isArray(band) && band.length === 2 && band.every((age) => Number.isFinite(age))) return band as unknown as AgeBand
  }
  return 'the manifest exports no usable ageBand'
}

export function scanGames(root: string): WordlessFinding[] {
  const gamesDir = join(root, 'games')
  if (!existsSync(gamesDir)) return []
  return readdirSync(gamesDir)
    .filter((key) => statSync(join(gamesDir, key)).isDirectory())
    .flatMap((key) => {
      const band = readAgeBand(join(gamesDir, key, 'manifest.ts'))
      const unreadable: WordlessFinding[] = typeof band === 'string' ? [{ file: `games/${key}/manifest.ts`, line: 0, rule: 'manifest-age-band', match: band }] : []
      const ageBand = typeof band === 'string' ? null : band
      return unreadable.concat(
        files(join(gamesDir, key))
          .map((path) => relative(root, path).split('\\').join('/'))
          .filter(isKidSideFile)
          .flatMap((file) => scanWordless(readFileSync(join(root, file), 'utf8'), file, { ageBand })),
      )
    })
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const findings = scanGames(root)
  if (findings.length > 0) {
    for (const f of findings) console.error(`${f.file}:${f.line}  ${f.rule}  ${f.match}`)
    console.error(
      `\nwordless check failed: ${findings.length} finding(s). Kid-side code shows no words, letters, numerals or mathematics signs; use cues (motion, glow, demonstration, sound). A game whose band starts at ${NUMERALS_FROM_AGE} or above may draw numerals and signs in games/<key>/symbols.ts behind a "wordless-ok: numeral <reason>" comment. Grown-up text belongs in a file named overlay or perf, behind a "wordless-ok: <reason>" comment.`,
    )
    process.exit(1)
  }
  console.log('wordless check passed')
}
