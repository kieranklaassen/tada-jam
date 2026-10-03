// The frontmatter of a record file, as a small subset of YAML read and written
// here with no YAML library.
//
// The subset: a block between two `---` lines holding `key: value` lines. A
// value is a bare word, a double-quoted string, `true` or `false`, or a whole
// number; or, on the lines below the key and indented by two spaces, a list
// of such scalars (`- item`) or one level of map (`sub: value`). `[]` is the
// empty list and `{}` the empty map.
//
// Anything else is an error with file and line: a nested list or map, an
// anchor or alias, a multi-line scalar, a tab, a duplicate key, a comment, a
// blank line. A string that is not a bare word must be quoted, so a date, a
// number-like code or a `yes` is never guessed at. Every block the subset
// accepts means the same to a full YAML parser.

export type Scalar = string | number | boolean
export type Value = Scalar | Scalar[] | { [key: string]: Scalar }
// A key holding undefined is the same as a key that is absent.
export type Frontmatter = { [key: string]: Value | undefined }

export class FrontmatterError extends Error {
  readonly file: string
  readonly line: number
  readonly reason: string

  constructor(file: string, line: number, reason: string) {
    super(`${file}:${line}: ${reason}`)
    this.name = 'FrontmatterError'
    this.file = file
    this.line = line
    this.reason = reason
  }
}

export interface ParsedFrontmatter {
  data: Frontmatter
  // The 1-based line each top-level key is on.
  lines: Record<string, number>
  // Characters in the block, from the first `---` through the line break
  // after the closing one. The body starts here.
  length: number
  // Lines in the block, both fences included.
  lineCount: number
}

const FENCE = '---'
const KEY = '[A-Za-z_][A-Za-z0-9_]*'
const TOP = new RegExp(`^(${KEY}):(.*)$`)
const ENTRY = new RegExp(`^  (${KEY}):(.*)$`)
const BARE = /^[A-Za-z][A-Za-z0-9._-]*$/
const WHOLE_NUMBER = /^(?:0|[1-9][0-9]*)$/
// Bare words a YAML parser reads as something other than a string.
const RESERVED = new Set(['true', 'false', 'null', 'yes', 'no', 'on', 'off', 'y', 'n'])

function isBareString(text: string): boolean {
  return BARE.test(text) && !RESERVED.has(text.toLowerCase())
}

export function parseFrontmatter(text: string, file = '<text>'): ParsedFrontmatter {
  const fail: (line: number, reason: string) => never = (line, reason) => {
    throw new FrontmatterError(file, line, reason)
  }
  const rows = text.split('\n')
  if (rows[0] !== FENCE) fail(1, 'a record starts with a --- line')
  const close = rows.indexOf(FENCE, 1)
  if (close === -1) fail(1, 'the frontmatter is not closed by a --- line')

  const quoted = (raw: string, line: number): string => {
    let out = ''
    for (let i = 1; i < raw.length; i++) {
      const char = raw[i]!
      if (char === '"') {
        if (i !== raw.length - 1) fail(line, 'text after the closing quote')
        return out
      }
      if (char === '\\') {
        const next = raw[++i]
        if (next !== '"' && next !== '\\') fail(line, 'the only escapes are \\" and \\\\')
        out += next
      } else out += char
    }
    return fail(line, 'a quoted string must close on its own line (no multi-line scalars)')
  }

  const scalar = (raw: string, line: number): Scalar => {
    if (raw === 'true') return true
    if (raw === 'false') return false
    if (WHOLE_NUMBER.test(raw)) return Number(raw)
    if (raw.startsWith('"')) return quoted(raw, line)
    if (isBareString(raw)) return raw
    if (raw === '') return fail(line, 'empty value: write "" for an empty string')
    if (raw.startsWith('&')) return fail(line, 'anchors are not in the subset')
    if (raw.startsWith('*')) return fail(line, 'aliases are not in the subset')
    if (raw.startsWith('|') || raw.startsWith('>')) return fail(line, 'multi-line scalars are not in the subset')
    if (raw.startsWith('[') || raw.startsWith('{')) return fail(line, 'inline lists and maps are not in the subset, and lists and maps nest one level only')
    if (raw.startsWith('- ') || raw === '-') return fail(line, 'nested lists are not in the subset')
    if (new RegExp(`^${KEY}:( |$)`).test(raw)) return fail(line, 'a list holds scalars only, not maps')
    return fail(line, `write ${raw} as a double-quoted string`)
  }

  const after = (rest: string, line: number): string => {
    if (!rest.startsWith(' ')) fail(line, 'a space must follow the colon')
    return rest.slice(1)
  }

  const data: Frontmatter = {}
  const lines: Record<string, number> = {}
  let i = 1
  while (i < close) {
    const row = rows[i]!
    const line = i + 1
    if (row.includes('\t')) fail(line, 'tab character')
    const top = TOP.exec(row)
    if (!top) {
      if (row.startsWith(' ')) fail(line, 'unexpected indentation: a scalar fits on one line, and lists and maps nest one level only')
      fail(line, 'expected `key: value`')
    }
    const key = top[1]!
    const rest = top[2]!
    if (Object.hasOwn(data, key)) fail(line, `duplicate key ${key}`)
    lines[key] = line
    i++
    if (rest !== '') {
      const raw = after(rest, line)
      data[key] = raw === '[]' ? [] : raw === '{}' ? {} : scalar(raw, line)
      continue
    }

    // A key with nothing after the colon: a list or a map on the lines below.
    const list: Scalar[] = []
    const map: { [key: string]: Scalar } = {}
    let shape: 'list' | 'map' | null = null
    while (i < close && /^[ \t]/.test(rows[i]!)) {
      const child = rows[i]!
      const childLine = i + 1
      if (child.includes('\t')) fail(childLine, 'tab character')
      if (/^ {3,}/.test(child)) fail(childLine, 'lists and maps nest one level only')
      const item = /^  - (.*)$/.exec(child)
      const entry = ENTRY.exec(child)
      if (item) {
        if (shape === 'map') fail(childLine, `${key} mixes a list and a map`)
        shape = 'list'
        list.push(scalar(item[1]!, childLine))
      } else if (entry) {
        if (shape === 'list') fail(childLine, `${key} mixes a list and a map`)
        shape = 'map'
        const sub = entry[1]!
        if (entry[2] === '') fail(childLine, 'lists and maps nest one level only')
        if (Object.hasOwn(map, sub)) fail(childLine, `duplicate key ${sub}`)
        map[sub] = scalar(after(entry[2]!, childLine), childLine)
      } else if (child === '  -') fail(childLine, 'empty list item, or a nested list, which is not in the subset')
      else fail(childLine, 'expected `  - item` or `  key: value`, indented by two spaces')
      i++
    }
    if (shape === null) fail(line, `${key} has no value: write "" for an empty string or [] for an empty list`)
    data[key] = shape === 'list' ? list : map
  }

  const lineCount = close + 1
  const length = rows.slice(0, lineCount).join('\n').length + (lineCount < rows.length ? 1 : 0)
  return { data, lines, length, lineCount }
}

// The block for `data`, keys in `order`. A key holding undefined is left out;
// a key `order` has no place for is an error, as is a value the subset cannot
// hold. A string is written bare when it is a bare word and quoted otherwise.
export function serialiseFrontmatter(data: Frontmatter, order: readonly string[]): string {
  const stray = Object.keys(data).filter((key) => data[key] !== undefined && !order.includes(key))
  if (stray.length > 0) throw new Error(`no place in the key order for: ${stray.join(', ')}`)

  const scalar = (key: string, value: Scalar): string => {
    if (typeof value === 'boolean') return String(value)
    if (typeof value === 'number') {
      if (!Number.isInteger(value) || value < 0) throw new Error(`${key}: ${value} is not a whole number`)
      return String(value)
    }
    if (/[\n\r\t]/.test(value)) throw new Error(`${key}: a string must fit on one line and hold no tab`)
    if (isBareString(value)) return value
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }

  const out: string[] = [FENCE]
  for (const key of order) {
    const value = data[key]
    if (value === undefined) continue
    if (Array.isArray(value)) {
      if (value.length === 0) out.push(`${key}: []`)
      else out.push(`${key}:`, ...value.map((item) => `  - ${scalar(key, item)}`))
    } else if (typeof value === 'object') {
      const entries = Object.entries(value)
      if (entries.length === 0) out.push(`${key}: {}`)
      else out.push(`${key}:`, ...entries.map(([sub, item]) => `  ${sub}: ${scalar(key, item)}`))
    } else out.push(`${key}: ${scalar(key, value)}`)
  }
  out.push(FENCE)
  return out.join('\n') + '\n'
}
