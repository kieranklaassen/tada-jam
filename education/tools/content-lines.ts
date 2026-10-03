// The content-line PDFs of the Dutch curriculum institute, read with their
// type styles: what each of the three fase columns prints, item by item, and
// which of that text is set in italics.
//
// The open data is the canonical rendition of the per-band goals, and these
// PDFs are its check rendition. The check reads them by word position
// (match.ts). This reader exists beside it because three things the pack
// records are only told apart by type style or by the mark that opens an
// item, and a word position holds neither:
//
//   - under a mathematics goal the PDFs print an example in italics, which
//     the open data leaves out. The goal is upright, the example italic.
//   - a statement opens with a dash (−). A text feature of a column (the
//     kinds, the length and the structure of the texts of a fase) opens with
//     a square bullet (▪) and is no goal.
//   - a heading bar of a cluster is set in white, the labels under it in black.
//
// The file is read with `pdftohtml -xml -i -stdout`, which gives every line
// of text with its place on the page, its font and its italic runs.
//
// A line of print comes in pieces where its type changes: an exponent in a
// smaller font, a sign of a symbol font. A piece that starts where the piece
// before it ends, on the same line of print, stands in that piece's row
// whatever its own height, so a taller sign is read where the page prints it
// and not ahead of its line. Such a piece in a smaller font whose foot stands
// above the foot of the text it follows is raised (the 2 of a square metre):
// textOf() writes it as a plain digit, or as the raised character where it
// is asked to. A character of the Symbol font, which the text layer gives as
// a private-use code, is written as the character it prints
// (SYMBOL_CHARACTERS); one that is not listed there stays as it is, and the
// importer fails on it.
//
//   node education/tools/content-lines.ts <source slug>     print what the PDF of a source record holds
//
// How a page is read. The three columns start where the labels "fase 1" to
// "fase 3" stand on the first page, and everything left of the first is the
// column of labels. In a column an item opens with its mark at the column
// start; the lines under it that start further in are its text, also at the
// top of the next page. A line that starts at the column start without a
// mark is a label inside the column ("groep 3:") or loose text (a note, the
// sentence over a list of text features, a cell of a table), which runs on
// line by line. A heading bar closes every item above it, and so does the
// first line of a label in the column of labels: each such label opens a row
// of the table. Text under a bar that runs on across the columns is what the
// cluster is about. Text in italics in the column of labels is the closing
// note of the file. A line in italics that ends in a colon, in the first
// column ("aanbodsdoelen:", "tekstkenmerken:"), heads what follows it in all
// columns. An item keeps the line breaks of the page; textOf() reads it as
// one line and printedLines() as printed.
//
// The list of terms and spelling (Taalbeschouwing) is a table of four columns
// headed by pairs of groepen. It is read the same way, with its own column
// labels: a cell is the loose text of one row in one column.
//
// The core is exported so content-lines.test.ts can run it on invented pages.

import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collapse } from './normalise.ts'
import { COLUMN_BREAK, decodeEntities, storedFile, system } from './rendition.ts'
import type { Run as Tool, SourcePages } from './rendition.ts'
import { sourceId } from './schema.ts'
import { requireStore, storeRoot } from './store.ts'

// A stretch of text in one type style.
export interface Run {
  text: string
  italic: boolean
  // Set where the page prints the text raised above the line it stands in, as an exponent is.
  raised?: true
  // The page the text stands on, where that is not the page its item opens on.
  page?: number
}

// How text is written out. `raised`: a raised digit as its raised character (m²), not as a plain digit (m2).
export interface Written {
  raised?: boolean
}

// What one item of a fase column is: a goal (opened by a dash), a text
// feature (opened by a square bullet), a goal the PDF prints without its
// dash, a label inside the column, or loose text such as a note.
export type ItemKind = 'goal' | 'feature' | 'unmarked' | 'label' | 'text'

export interface PrintedItem {
  kind: ItemKind
  // The page it opens on, counted from 1.
  page: number
  // Its column: 1 for the first fase, and so on.
  column: number
  // The heading bar above it, as printed, and the label of its row in the column of labels. Empty when there is none.
  cluster: string
  label: string
  // The line that heads this stretch of the columns, in small letters and without its colon: "aanbodsdoelen", "tekstkenmerken". Empty before the first.
  section: string
  // The label inside its column that holds for it: "groep 1/2:". Empty when there is none.
  group: string
  runs: Run[]
  // Where each line of print of the item stands, in the units of the XML. Left out of an item made by hand.
  boxes?: Box[]
}

// The place of a line of print: its page, counted from 1, and its box there.
export interface Box {
  page: number
  top: number
  left: number
  width: number
  height: number
}

export interface PrintedCluster {
  // The heading bar as printed.
  title: string
  page: number
  // The text printed under the bar across the columns, where there is any.
  description: string
}

export interface ContentLine {
  // The labels over the columns, from left to right: "fase 1*".
  columns: string[]
  // Every item of the columns in reading order: page by page, and on a page row by row.
  items: PrintedItem[]
  clusters: PrintedCluster[]
  // The closing note of the file: the italic text in the column of labels.
  note: string
  // The size of each page in the units of the XML, in order. Left out of a file made by hand.
  sizes?: { width: number; height: number }[]
}

// ---------------------------------------------------------------------------
// Text.
// ---------------------------------------------------------------------------

// The text of runs as the lines the page prints it in, each run of whitespace
// in a line one space. `italics` is what an italic stretch is written as.
export function printedLines(runs: readonly Run[], italics: (text: string) => string = (text) => text): string[] {
  const lines: Run[][] = [[]]
  for (const run of runs) {
    const pieces = run.text.split('\n')
    pieces.forEach((piece, index) => {
      if (index > 0) lines.push([])
      if (piece !== '') lines.at(-1)!.push({ text: piece, italic: run.italic })
    })
  }
  return lines
    .map((line) => {
      // Neighbouring runs in one style are one stretch.
      const stretches: Run[] = []
      for (const run of line) {
        const last = stretches.at(-1)
        if (last && (last.italic === run.italic || run.text.trim() === '')) last.text += run.text
        else stretches.push({ ...run })
      }
      const written = stretches.map((run) => (run.italic && run.text.trim() !== '' ? run.text.replace(/^(\s*)([\s\S]*?)(\s*)$/, (_, before: string, text: string, after: string) => `${before}${italics(text)}${after}`) : run.text))
      return collapse(written.join(''))
    })
    .filter((line) => line !== '')
}

// The raised form of each digit. A raised character without one stays as it is.
const RAISED_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const raise = (text: string): string => text.replace(/\d/g, (digit) => RAISED_DIGITS[Number(digit)]!)

// The text of runs as one line: each run of whitespace one space.
export function textOf(runs: readonly Run[], written: Written = {}): string {
  return collapse(runs.map((run) => (run.raised && written.raised ? raise(run.text) : run.text)).join(''))
}

// The upright text of an item.
export const uprightOf = (runs: readonly Run[]): string => textOf(runs.filter((run) => !run.italic))

// Each stretch of italic text of an item that holds a letter or a digit, in order.
export function italicStretches(runs: readonly Run[]): string[] {
  const stretches: Run[][] = []
  let open: Run[] | null = null
  for (const run of runs) {
    if (run.italic) {
      if (!open) stretches.push((open = []))
      open.push(run)
    } else if (run.text.trim() !== '') open = null
  }
  return stretches.map((stretch) => textOf(stretch)).filter((text) => /[\p{L}\p{N}]/u.test(text))
}

// True when no upright text with a letter or a digit follows the first italic text: the italics close the item.
export function italicsClose(runs: readonly Run[]): boolean {
  const first = runs.findIndex((run) => run.italic && /[\p{L}\p{N}]/u.test(run.text))
  return first !== -1 && !runs.slice(first).some((run) => !run.italic && /[\p{L}\p{N}]/u.test(run.text))
}

// Text as two renditions of one statement are compared: lower case, without
// accents, and only its letters and digits. Spacing, punctuation and the
// place of a line break do not count.
export function letters(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

// The text of an item without each bracketed example: a group that opens "(bijv" and runs to its closing bracket.
export function withoutBracketedExamples(text: string): string {
  let out = ''
  for (let at = 0; at < text.length; ) {
    if (/^\(\s*bijv/.test(text.slice(at, at + 8))) {
      let depth = 0
      let end = at
      for (; end < text.length; end += 1) {
        if (text[end] === '(') depth += 1
        else if (text[end] === ')' && --depth === 0) break
      }
      at = end + 1
    } else out += text[at++]
  }
  return out
}

// ---------------------------------------------------------------------------
// Reading the XML of pdftohtml.
// ---------------------------------------------------------------------------

interface Line {
  top: number
  left: number
  width: number
  height: number
  white: boolean
  runs: Run[]
  text: string
}

const plain = (markup: string): string => decodeEntities(markup.replace(/<[^>]+>/g, ''))

const TEXT = /<text top="(-?\d+)" left="(-?\d+)" width="(\d+)" height="(\d+)" font="(\d+)">([\s\S]*?)<\/text>/g
const FONT = /<fontspec ([^>]*)>/g
const attribute = (attributes: string, name: string): string => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes)?.[1] ?? ''

// A font of the file: its size, whether it is the Symbol font, and whether it is set in white.
interface Font {
  size: number
  symbol: boolean
  white: boolean
}
const NO_FONT: Font = { size: 0, symbol: false, white: false }

function fontsOf(xml: string): Map<string, Font> {
  return new Map(
    [...xml.matchAll(FONT)].map(([, attributes]) => [
      attribute(attributes!, 'id'),
      { size: Number(attribute(attributes!, 'size')), symbol: /^(?:[A-Z]{6}\+)?Symbol/.test(attribute(attributes!, 'family')), white: attribute(attributes!, 'color').toLowerCase() === '#ffffff' },
    ]),
  )
}

// The characters of the Symbol font that the content-line PDFs print, by the
// private-use code the text layer gives each (U+F000 and its place in the
// font). Each was seen on the page image: the sign for "is about" stands
// twice in an example of the line Bewerkingen, page 5, column fase 3.
const SYMBOL_CHARACTERS: Readonly<Record<string, string>> = { '\uF0BB': '≈' }
const PRIVATE_USE = /[\uE000-\uF8FF]/g
// True when a text holds a character of a font that has no Unicode character here.
export const holdsPrivateUse = (text: string): boolean => /[\uE000-\uF8FF]/.test(text)
// A stretch inside <i> … </i>, or a stretch outside.
const STYLED = /<i>([\s\S]*?)<\/i>|((?:(?!<i>)[\s\S])+)/g

// The marks that open an item, and what each makes of it: the minus sign
// (U+2212) a goal, the square bullet a text feature. A hyphen or an en dash
// at a column start is text: the table of spelling prints one before an
// ending ("–s").
const GOAL_MARKS = new Set(['−'])
const FEATURE_MARKS = new Set(['▪', '', '■'])
// The line that heads the goals of the columns. What stands under another such line is no goal.
const GOALS = 'aanbodsdoelen'
// The label over a column.
const COLUMN_LABEL = /^fase [123]\*?$/
// How a note opens: with the asterisk that a heading refers to it by, or with "NB".
export const NOTE = /^(?:\*|NB\b)/

// A line stands at a column start when it is closer to it than this.
const AT_START = 8
// A line is left of the first column, in the column of labels, when it starts this far before it.
const BEFORE = 12
// The foot of a page: the running footer stands in its last strip.
const FOOT = 90
// Two lines are one row when their tops are closer than this.
const ROW = 6
// A label line goes on from the one above it when it is closer than this.
const NEXT_LINE = 30
// A gap inside a line stands at a column start when the two are closer than this.
const NEAR = 40
// A piece goes on where the piece before it ends when it starts this close to that end.
const JOINED = 2
// A piece in a smaller font is raised when its foot stands this far above the foot of the text it follows.
const RAISED = 4

// A piece of text as the file gives it: where it stands, the row it stands in, and the text its row is set in.
interface Piece {
  top: number
  foot: number
  right: number
  row: number
  body: { size: number; foot: number }
}

// The lines of a page. `top` is the top of the row a line stands in: its own,
// or that of the piece it goes on from.
function linesOf(page: string, fonts: ReadonlyMap<string, Font>): Line[] {
  const lines: Line[] = []
  // The piece before, with text or without.
  let before: Piece | null = null
  for (const [, at, from, wide, high, id, content] of page.matchAll(TEXT)) {
    const [top, left, width, height] = [Number(at), Number(from), Number(wide), Number(high)]
    const font = fonts.get(id!) ?? NO_FONT
    const foot = top + height
    // On the same line of print: the two overlap by more than half the height of the lower one.
    const last = before as Piece | null
    const goesOn: boolean = last !== null && Math.abs(last.right - left) <= JOINED && Math.min(foot, last.foot) - Math.max(top, last.top) > Math.min(height, last.foot - last.top) / 2
    const raised: boolean = goesOn && font.size < last!.body.size && foot <= last!.body.foot - RAISED
    before = { top, foot, right: left + width, row: goesOn ? last!.row : top, body: raised ? last!.body : { size: font.size, foot } }
    const read = (markup: string): string => (font.symbol ? plain(markup).replace(PRIVATE_USE, (character) => SYMBOL_CHARACTERS[character] ?? character) : plain(markup))
    const runs = [...content!.matchAll(STYLED)].map((match): Run => ({ text: read(match[1] ?? match[2]!), italic: match[1] !== undefined, ...(raised ? { raised: true as const } : {}) })).filter((run) => run.text !== '')
    const text = runs.map((run) => run.text).join('')
    if (text.trim() === '') continue
    lines.push({ top: before.row, left, width, height, white: font.white, runs, text })
  }
  return lines
}

// How the columns of a file are found, when they are not the three fase columns.
export interface ParseOptions {
  // What the label over a column looks like. Default: "fase 1" to "fase 3", with or without an asterisk.
  columnLabel?: RegExp
}

// What a file prints, from the XML that `pdftohtml -xml -i` gives for it.
export function parseContentLine(xml: string, options: ParseOptions = {}): ContentLine {
  const columnLabel = options.columnLabel ?? COLUMN_LABEL
  const fonts = fontsOf(xml)
  const pages = xml.split('<page ').slice(1)
  const isHead = (line: Line): boolean => columnLabel.test(line.text.trim())

  // The column starts: where the column labels stand on the first page that has them.
  let starts: number[] = []
  let labels: string[] = []
  let headed = { page: 0, top: 0 }
  for (const [index, page] of pages.entries()) {
    const lines = linesOf(page, fonts)
    const heads = lines.filter(isHead).sort((a, b) => a.left - b.left)
    if (heads.length < 2) continue
    const first = Math.min(...heads.map((line) => line.top))
    const row = heads.filter((line) => line.top - first < ROW)
    starts = row.map((line) => line.left)
    labels = row.map((line) => line.text.trim())
    // The page is read from its first heading bar on, or from under the
    // column labels where those come first: above stand the titles of the file.
    const bars = lines.filter((line) => line.white && line.left < starts[0]! - BEFORE && line.top > 0).map((line) => line.top)
    const titles = lines.filter((line) => line.white && line.left >= starts[0]! - BEFORE).map((line) => line.top)
    const under = Math.max(-1, ...titles)
    headed = { page: index + 1, top: Math.min(first + 3, ...bars.filter((top) => top > under)) }
    break
  }
  if (starts.length === 0) throw new Error('the file prints no row of column labels (fase 1, fase 2, fase 3), so its columns cannot be told apart')

  const items: (PrintedItem & { held: { label: string } })[] = []
  const clusters: PrintedCluster[] = []
  const notes: Run[] = []
  // What is open: the item of each column, and where the page stands in its headings.
  const open = new Map<number, PrintedItem>()
  const groups = new Map<number, string>()
  let cluster = ''
  // The label of the row: one value shared by the items of the row, since a label may run on under its first line.
  let label = { label: '' }
  let section = ''
  let labelTop = { page: 0, top: -Infinity, bar: false }
  // The row a line across the columns stands on: what stands right of it on that row belongs to it.
  let across = { page: 0, top: -Infinity }

  const closeAll = (): void => {
    open.clear()
    groups.clear()
  }
  const start = (kind: ItemKind, page: number, column: number): PrintedItem => {
    const item = { kind, page, column, cluster, label: '', section, group: groups.get(column) ?? '', runs: [], held: label }
    items.push(item)
    return item
  }
  // A line added to the text of an item, after a line break where it starts
  // a new row. A line that ends in a hyphen right after a letter breaks a
  // compound there, and what follows joins it. Two pieces of one row are
  // joined as they are.
  const rowOf = new WeakMap<PrintedItem, { page: number; top: number }>()
  const append = (item: PrintedItem, line: Line, page: number): void => {
    const before = item.runs.map((run) => run.text).join('')
    const last = rowOf.get(item)
    const sameRow = last !== undefined && last.page === page && Math.abs(last.top - line.top) < ROW
    // What stands on a later page than the item opens on says so.
    const overleaf = page === item.page ? {} : { page }
    if (before !== '' && !sameRow && !/\p{L}-$/u.test(before)) item.runs.push({ text: '\n', italic: line.runs[0]!.italic, ...overleaf })
    item.runs.push(...line.runs.map((run) => ({ ...run, ...overleaf })))
    item.boxes = [...(item.boxes ?? []), { page, top: line.top, left: line.left, width: line.width, height: line.height }]
    rowOf.set(item, { page, top: line.top })
  }
  // Two cells of one row that the text layer gives as one line: a line that
  // reaches into the next column and holds a gap of two or more spaces about
  // where that column starts is cut at the gap, and its second part starts
  // the next column.
  const cells = (line: Line): Line[] => {
    const next = starts.find((each) => each > line.left + BEFORE)
    const gap = /\S( {2,})\S/.exec(line.text)
    if (next === undefined || line.left < starts[0]! - BEFORE || line.left + line.width <= next + BEFORE || !gap || line.runs.length !== 1) return [line]
    const cut = gap.index + 1
    // Where the gap stands across the page, as far as the length of the text tells.
    const about = line.left + (line.width * (cut + gap[1]!.length)) / line.text.trimEnd().length
    if (Math.abs(about - next) > NEAR) return [line]
    const italic = line.runs[0]!.italic
    return [
      { ...line, width: next - line.left - 1, text: line.text.slice(0, cut), runs: [{ text: line.text.slice(0, cut), italic }] },
      { ...line, left: next, width: line.left + line.width - next, text: line.text.slice(cut + gap[1]!.length), runs: [{ text: line.text.slice(cut + gap[1]!.length), italic }] },
    ]
  }

  pages.forEach((page, index) => {
    const number = index + 1
    if (number < headed.page) return
    const height = Number(/height="(\d+)"/.exec(page)?.[1] ?? 0)
    // Row by row, and in a row from left to right: the column of labels first.
    const lines = linesOf(page, fonts)
      .filter((line) => !(number === headed.page && line.top < headed.top) && line.top < height - FOOT && !(isHead(line) && starts.some((each) => Math.abs(line.left - each) <= AT_START)))
      .flatMap(cells)
    const rows: Line[][] = []
    for (const line of lines.sort((a, b) => a.top - b.top)) {
      const row = rows.at(-1)
      if (row && line.top - row[0]!.top < ROW) row.push(line)
      else rows.push([line])
    }

    for (const row of rows) {
      for (const line of row.sort((a, b) => a.left - b.left)) {
        const text = line.text.trim()
        if (line.left < starts[0]! - BEFORE) {
          // The column of labels.
          const follows = labelTop.page === number && line.top - labelTop.top < NEXT_LINE && line.top - labelTop.top >= ROW
          if (line.runs.every((run) => run.italic)) {
            notes.push(...line.runs, { text: ' ', italic: true })
            continue
          }
          if (line.white) {
            // A heading bar, which may run over two lines.
            if (follows && labelTop.bar) clusters.at(-1)!.title += ` ${text}`
            else clusters.push({ title: text, page: number, description: '' })
            cluster = clusters.at(-1)!.title
            label = { label: '' }
            closeAll()
            labelTop = { page: number, top: line.top, bar: true }
            continue
          }
          if (line.left + line.width > starts[0]! + BEFORE) {
            // Text under a bar that runs on across the columns: what the cluster is about.
            const held = clusters.at(-1)
            if (held) held.description = `${held.description} ${text}`.trim()
            closeAll()
            labelTop = { page: number, top: line.top, bar: false }
            across = { page: number, top: line.top }
            continue
          }
          if (follows && !labelTop.bar) label.label = `${label.label} ${text}`
          else {
            label = { label: text }
            closeAll()
          }
          labelTop = { page: number, top: line.top, bar: false }
          continue
        }
        if (across.page === number && Math.abs(line.top - across.top) < ROW) {
          // The rest of a line that runs across the columns.
          const held = clusters.at(-1)
          if (held) held.description = `${held.description} ${text}`.trim()
          continue
        }

        const column = starts.filter((each) => line.left >= each - BEFORE).length
        const at = starts[column - 1]!
        const atStart = Math.abs(line.left - at) <= AT_START
        if (atStart && (GOAL_MARKS.has(text) || FEATURE_MARKS.has(text))) {
          open.set(column, start(GOAL_MARKS.has(text) ? 'goal' : 'feature', number, column))
          continue
        }
        if (atStart) {
          // A line in italics that ends in a colon, in the first column, heads what follows it in all columns.
          if (column === 1 && text.endsWith(':') && line.runs.every((run) => run.italic)) {
            section = text.slice(0, -1).trim().toLowerCase()
            closeAll()
            continue
          }
          // Loose text runs on line by line at the column start, up to the next note: a line that opens with an asterisk or "NB".
          const held = open.get(column)
          if (held?.kind === 'text' && !NOTE.test(text)) {
            append(held, line, number)
            continue
          }
          // A label inside the column holds for the items under it; anything else at the column start is loose text.
          const isLabel = text.endsWith(':') && text.length <= 40
          if (isLabel) groups.set(column, text)
          const opened = start(isLabel ? 'label' : 'text', number, column)
          append(opened, line, number)
          if (isLabel) open.delete(column)
          else open.set(column, opened)
          continue
        }
        if (!open.has(column)) open.set(column, start('unmarked', number, column))
        append(open.get(column)!, line, number)
      }
    }
  })

  return {
    columns: labels,
    items: items.filter((item) => textOf(item.runs) !== '').map(({ held, ...item }) => ({ ...item, label: held.label })),
    clusters: clusters.map((each) => ({ ...each, description: each.description.replace(/\s+/gu, ' ').trim() })),
    note: textOf(notes),
    sizes: pages.map((page) => ({ width: Number(/ width="(\d+)"/.exec(page)?.[1] ?? 0), height: Number(/ height="(\d+)"/.exec(page)?.[1] ?? 0) })),
  }
}

// ---------------------------------------------------------------------------
// Joining the goals of the open data to what a column prints.
// ---------------------------------------------------------------------------

// A goal as a record holds it.
export interface Goal {
  id: string
  wording: string
  // The title of its cluster, as the data has it.
  cluster: string
}

// How a goal was found among the printed statements.
//
//   exact        its wording is the statement: all of it, its upright text, or
//                its text without the examples in brackets
//   prefix       its wording opens the statement, and more upright text follows
//   last         it is the one goal of its cluster left, and one statement of
//                that cluster is left: they differ in a word or in the order
//                the text layer gives the characters
export type JoinedHow = 'exact' | 'prefix' | 'last'

export interface Joined {
  goal: Goal
  item: PrintedItem
  how: JoinedHow
  // More printings of the same statement in the column, with other italic text under them.
  again: PrintedItem[]
}

// A heading as two renditions of it are compared: without a note in brackets or an asterisk after it.
export const bareHeading = (text: string): string => text.replace(/\((?:zie|vanaf)[^)]*\)/g, '').replace(/\*/g, '')
const heading = (text: string): string => letters(bareHeading(text))

// The column of a file that is headed with the level of a part read from
// the open data, counted from 1, and that level's title. `selection` is the
// part's, `part` its name and `pdf` the file, as the error names them when no
// column is headed with the level.
export function columnOfLevel(content: ContentLine, selection: { level?: { titles: readonly string[] } }, part: string, pdf: string): { title: string; column: number } {
  const title = selection.level?.titles.length === 1 ? selection.level.titles[0]! : ''
  const column = content.columns.findIndex((label) => label.replace(/\*$/, '') === title) + 1
  if (column === 0) throw new Error(`${pdf}: no column of the PDF is headed "${title}", the level of "${part}"`)
  return { title, column }
}

// The statements of one column: goals, and goals printed without their dash, under "aanbodsdoelen" or before any such line.
export function statementsOf(content: ContentLine, column: number): PrintedItem[] {
  return content.items.filter((item) => item.column === column && (item.kind === 'goal' || item.kind === 'unmarked') && (item.section === GOALS || item.section === ''))
}

// Each goal with the statement that prints it, and the statements of the
// goals' clusters that no goal was joined to. A goal is looked for under the
// heading of its own cluster first, then anywhere in the column.
export function joinGoals(goals: readonly Goal[], statements: readonly PrintedItem[]): { joined: Joined[]; unjoined: Goal[]; unprinted: PrintedItem[] } {
  const used = new Set<PrintedItem>()
  const found = new Map<Goal, Joined>()
  const forms = new Map(statements.map((item) => [item, { all: letters(textOf(item.runs)), upright: letters(uprightOf(item.runs)), bare: letters(withoutBracketedExamples(textOf(item.runs))) }]))
  const same = (goal: Goal, item: PrintedItem): boolean => heading(goal.cluster) === heading(item.cluster)
  const exact = (goal: Goal, item: PrintedItem): boolean => {
    const wording = letters(goal.wording)
    const form = forms.get(item)!
    return wording === form.all || wording === form.upright || wording === form.bare
  }
  const prefix = (goal: Goal, item: PrintedItem): boolean => {
    const wording = letters(goal.wording)
    return wording.length >= 12 && (forms.get(item)!.all.startsWith(wording) || forms.get(item)!.upright.startsWith(wording))
  }
  const passes: [JoinedHow, (goal: Goal, item: PrintedItem) => boolean][] = [
    ['exact', (goal, item) => same(goal, item) && exact(goal, item)],
    ['exact', exact],
    ['prefix', (goal, item) => same(goal, item) && prefix(goal, item)],
    ['prefix', prefix],
  ]
  for (const [how, fits] of passes) {
    for (const goal of goals) {
      if (found.has(goal)) continue
      const item = statements.find((each) => !used.has(each) && fits(goal, each))
      if (!item) continue
      used.add(item)
      found.set(goal, { goal, item, how, again: [] })
    }
  }
  // A statement printed once more, under the same heading, with the same upright text.
  for (const item of statements) {
    if (used.has(item)) continue
    const first = [...found.values()].find((each) => each.item.cluster === item.cluster && forms.get(each.item)!.upright === forms.get(item)!.upright)
    if (!first) continue
    used.add(item)
    first.again.push(item)
  }
  // One goal and one statement left under a heading are each other's.
  for (const goal of goals) {
    if (found.has(goal)) continue
    const left = goals.filter((each) => !found.has(each) && heading(each.cluster) === heading(goal.cluster))
    const free = statements.filter((each) => !used.has(each) && same(goal, each))
    if (left.length !== 1 || free.length !== 1) continue
    used.add(free[0]!)
    found.set(goal, { goal, item: free[0]!, how: 'last', again: [] })
  }
  const headings = new Set(goals.map((goal) => heading(goal.cluster)))
  return {
    joined: goals.filter((goal) => found.has(goal)).map((goal) => found.get(goal)!),
    unjoined: goals.filter((goal) => !found.has(goal)),
    unprinted: statements.filter((item) => !used.has(item) && headings.has(heading(item.cluster))),
  }
}

// A mark as two renditions of it are compared: a quotation mark is one mark, curled or straight.
const mark = (character: string): string => (/['‘’‚]/.test(character) ? "'" : /["“”„]/.test(character) ? '"' : character)

// What a statement prints after the wording of a goal that opens it, as
// runs. The wording is counted off by its letters and digits. The marks that
// close the wording after its last letter (the bracket of a bracketed part,
// a closing quotation mark, a full stop) are the wording's too: where the
// statement prints them there, what follows starts after them.
export function runsAfterWording(item: PrintedItem, wording: string): Run[] {
  let wanted = letters(wording).length
  const closing = wanted === 0 ? [] : [...(/[^\p{L}\p{N}]*$/u.exec(wording)?.[0] ?? '')].filter((character) => character.trim() !== '').map(mark)
  const blank = (character: string): boolean => character.trim() === '' || character === '\u00AD'
  const rest: Run[] = []
  // True once what follows the wording has begun.
  let open = false
  for (const run of item.runs) {
    let at = 0
    if (!open) {
      for (const character of run.text) {
        if (wanted > 0) wanted -= letters(character).length
        else if (closing.length > 0 && blank(character)) {
          // Whitespace between the wording and a mark that closes it.
        } else if (closing.length > 0 && mark(character) === closing[0]) closing.shift()
        else {
          open = true
          break
        }
        at += character.length
      }
    }
    if (open && at < run.text.length) rest.push(at === 0 ? run : { ...run, text: run.text.slice(at) })
  }
  return rest
}

// The same as text, as printed.
export function afterWording(item: PrintedItem, wording: string, written: Written = {}): string {
  return textOf(runsAfterWording(item, wording), written)
}

// An item whose italics close it, cut where they open: the statement, set
// upright, and the example that closes it, from its first italic character
// on. A bracket that opens the example and is set upright, right before the
// italics, is the example's. Null for an item without italics, or with
// upright text after them.
export function closingExample(runs: readonly Run[]): { statement: Run[]; example: Run[] } | null {
  if (!italicsClose(runs)) return null
  let first = runs.findIndex((run) => run.italic && /[\p{L}\p{N}]/u.test(run.text))
  // Italic marks before the first italic letter, such as the bracket that opens the example, are the example's.
  while (first > 0 && (runs[first - 1]!.italic || runs[first - 1]!.text.trim() === '')) first -= 1
  const statement = runs.slice(0, first)
  const example = runs.slice(first)
  const last = statement.at(-1)
  const opening = last ? /\(\s*$/.exec(last.text) : null
  if (last && opening) {
    statement[statement.length - 1] = { ...last, text: last.text.slice(0, opening.index) }
    example.unshift({ ...last, text: last.text.slice(opening.index) })
  }
  return { statement, example }
}

// The pages the text of an item stands on, or of some of its runs: where it opens, and each page it runs on to.
export function pagesOf(item: PrintedItem, runs: readonly Run[] = item.runs): number[] {
  return [...new Set(runs.filter((run) => run.text.trim() !== '').map((run) => run.page ?? item.page))].sort((a, b) => a - b)
}

// ---------------------------------------------------------------------------
// Underlined terms.
//
// The PDFs of oriëntatie op jezelf en de wereld underline terms in their
// goals, and say in a note that an underlined term refers to another
// document. Neither rendition of the text holds an underline: the XML of
// pdftohtml gives type styles, not rules. An underline is a thin filled
// rectangle among the drawing instructions of the page, so it is read
// there, and laid over the words of the page as `pdftotext -bbox` gives
// them with their boxes.
//
// How it is read. The pages are found from the catalog of the file, and the
// content of each is inflated. A rectangle counts when it is filled, drawn
// in page coordinates (not inside a transformation, as an image is), under
// 1.5 points high, and fits words: its top stands in the foot of a row of
// words, and it reaches no further left or right than the words it touches.
// A rule of a table fits no words that way. A word is underlined whole when
// the rule covers it but for the marks around it (a bracket, a colon), and
// in part otherwise: which letters of it the rule covers cannot be told from
// the box of a word, so such a word is given whole, as underlined in part.
//
// The files are pinned by their bytes, so what is read is the same on every
// run. A file whose pages cannot be found this way stops the reading.
// ---------------------------------------------------------------------------

// A filled rule of a page: in points, from the top left of the page.
export interface Rule {
  left: number
  right: number
  top: number
}

export interface PdfPage {
  width: number
  height: number
  rules: Rule[]
}

const RULE_HEIGHT = 1.5
const RULE_WIDTH = 2

const OPERAND = /\((?:\\[\s\S]|[^\\()])*\)|<<|>>|<[0-9A-Fa-f\s]*>|\/[^\s/[\]()<>]*|[-+]?(?:\d+\.?\d*|\.\d+)|[A-Za-z'"*]+|\[|\]/g

// The thin filled rectangles a content stream draws in page coordinates.
function rulesOf(content: string, box: readonly [number, number, number, number]): Rule[] {
  const rules: Rule[] = []
  const numbers: number[] = []
  // Whether a transformation is in force, here and in each saved state.
  let transformed = false
  const saved: boolean[] = []
  let pending: [number, number, number, number][] = []
  for (const [token] of content.matchAll(OPERAND)) {
    if (/^[-+.\d]/.test(token)) {
      numbers.push(Number(token))
      continue
    }
    if (!/^[A-Za-z'"*]+$/.test(token)) continue
    if (token === 'q') saved.push(transformed)
    else if (token === 'Q') transformed = saved.pop() ?? false
    else if (token === 'cm') transformed = true
    else if (token === 're' && numbers.length >= 4 && !transformed) pending.push(numbers.slice(-4) as [number, number, number, number])
    else if (['f', 'f*', 'F', 'B', 'B*', 'b', 'b*'].includes(token)) {
      for (const [x, y, w, h] of pending) {
        if (Math.abs(h) === 0 || Math.abs(h) >= RULE_HEIGHT || Math.abs(w) <= RULE_WIDTH) continue
        const left = Math.min(x, x + w) - box[0]
        rules.push({ left, right: left + Math.abs(w), top: box[3] - Math.max(y, y + h) })
      }
      pending = []
    } else if (['n', 'S', 's'].includes(token)) pending = []
    numbers.length = 0
  }
  return rules
}

// The pages of a PDF, in order, each with its size and its rules.
export function pdfPages(pdf: Uint8Array): PdfPage[] {
  // One character per byte, so a place in the text is a place in the file.
  const text = Buffer.from(pdf).toString('latin1')
  const objects = new Map<number, string>()
  for (const [, number, body] of text.matchAll(/(\d+) 0 obj\b([\s\S]*?)endobj/g)) objects.set(Number(number), body!)
  const fail = (what: string): never => {
    throw new Error(`the PDF cannot be read for its rules: ${what}`)
  }
  const object = (number: number): string => objects.get(number) ?? fail(`object ${number} is not a plain object of the file`)
  const boxOf = (body: string): [number, number, number, number] | undefined => {
    const box = /\/MediaBox\s*\[\s*([-\d.\s]+)\]/.exec(body)?.[1]?.trim().split(/\s+/).map(Number)
    return box?.length === 4 ? (box as [number, number, number, number]) : undefined
  }
  const stream = (number: number): string => {
    const body = object(number)
    const at = /stream\r?\n/.exec(body)
    if (!at) return fail(`object ${number} holds no stream`)
    const end = body.lastIndexOf('endstream')
    const bytes = Buffer.from(body.slice(at.index + at[0].length, end), 'latin1')
    const head = body.slice(0, at.index)
    if (!/\/Filter/.test(head)) return bytes.toString('latin1')
    if (!/\/Filter\s*\/?\[?\s*\/FlateDecode\s*\]?/.test(head)) return fail(`the content of object ${number} is packed otherwise than with FlateDecode`)
    return inflateSync(bytes).toString('latin1')
  }
  const catalog = [...objects.values()].find((body) => /\/Type\s*\/Catalog\b/.test(body)) ?? fail('it has no catalog among its plain objects')
  const root = Number(/\/Pages\s+(\d+) 0 R/.exec(catalog)?.[1] ?? fail('its catalog names no pages'))
  const pages: PdfPage[] = []
  const walk = (number: number, inherited: [number, number, number, number] | undefined): void => {
    const body = object(number)
    const head = body.split(/stream\r?\n/)[0]!
    const box = boxOf(head) ?? inherited
    if (/\/Type\s*\/Pages\b/.test(head)) {
      const kids = /\/Kids\s*\[([^\]]*)\]/.exec(head)?.[1] ?? fail(`the page tree at object ${number} lists no kids`)
      for (const [, kid] of kids.matchAll(/(\d+) 0 R/g)) walk(Number(kid), box)
      return
    }
    if (!box) return fail(`the page at object ${number} has no size`)
    const contents = /\/Contents\s*\[([^\]]*)\]/.exec(head)?.[1] ?? /\/Contents\s*(\d+ 0 R)/.exec(head)?.[1] ?? ''
    const content = [...contents.matchAll(/(\d+) 0 R/g)].map(([, each]) => stream(Number(each))).join('\n')
    pages.push({ width: box[2] - box[0], height: box[3] - box[1], rules: rulesOf(content, box) })
  }
  walk(root, undefined)
  return pages
}

// A word of a page with its box, in points from the top left, as `pdftotext -bbox` gives it.
interface Word {
  left: number
  top: number
  right: number
  foot: number
  text: string
}

const WORD = /<word xMin="([-\d.]+)" yMin="([-\d.]+)" xMax="([-\d.]+)" yMax="([-\d.]+)">([\s\S]*?)<\/word>/g

function wordsOf(bbox: string): Word[][] {
  return bbox
    .split('<page ')
    .slice(1)
    .map((page) => [...page.matchAll(WORD)].map(([, left, top, right, foot, text]) => ({ left: Number(left), top: Number(top), right: Number(right), foot: Number(foot), text: decodeEntities(text!) })))
}

// An underlined stretch of a page: the words under one rule, and where the rule stands.
export interface Underlined {
  // The page, counted from 1.
  page: number
  // The rule, in points from the top left of the page.
  left: number
  right: number
  top: number
  // The words it underlines, without the marks before the first and after the last. A word the rule covers only in part is followed by " (in part)".
  term: string
  // True when the rule runs to the very end of its last word: a term that goes on in the next line ends its line so.
  toEnd: boolean
}

// A rule stands in the foot of a row of words when its top is this far above or below the foot of their box.
const ABOVE_FOOT = 3
const BELOW_FOOT = 2
// A rule fits its words when it reaches no further than this beyond them.
const BEYOND = 1.5
// A mark around a word (a bracket, a colon) is at most this wide.
const MARK_WIDTH = 4.5

// The underlined stretches of a file: its rules laid over its words.
export function underlinedOf(pages: readonly PdfPage[], bbox: string): Underlined[] {
  const words = wordsOf(bbox)
  const found: Underlined[] = []
  pages.forEach((page, index) => {
    for (const rule of page.rules) {
      const under = (words[index] ?? []).filter((word) => word.left < rule.right - 1 && word.right > rule.left + 1 && rule.top - word.foot >= -ABOVE_FOOT && rule.top - word.foot <= BELOW_FOOT).sort((a, b) => a.left - b.left)
      if (under.length === 0 || rule.left < under[0]!.left - BEYOND || rule.right > under.at(-1)!.right + BEYOND) continue
      const term = under
        .map((word, at) => {
          const [, before, core, after] = /^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u.exec(word.text)!
          const whole = rule.left <= word.left + before!.length * MARK_WIDTH + BEYOND && rule.right >= word.right - after!.length * MARK_WIDTH - BEYOND
          // The marks inside a stretch are part of it; those before its first word and after its last are not.
          const text = `${at === 0 ? '' : before}${core}${at === under.length - 1 ? '' : after}`
          return core === '' ? '' : whole ? text : `${text} (in part)`
        })
        .filter((each) => each !== '')
        .join(' ')
      if (term !== '') found.push({ page: index + 1, left: rule.left, right: rule.right, top: rule.top, term, toEnd: rule.right >= under.at(-1)!.right - BEYOND })
    }
  })
  return found
}

// The underlined terms of each item of a file, in the order the page prints
// them, and the underlined stretches that stand in no item. An item holds a
// stretch when the rule starts inside one of its lines of print and stands
// in the foot of that line. A term that is broken over two lines is one
// term: a stretch that runs to the end of the last word of its line and the
// next, which opens the line under it, are joined.
export function underlinedItems(content: ContentLine, pages: readonly PdfPage[], underlined: readonly Underlined[]): { terms: Map<PrintedItem, string[]>; elsewhere: Underlined[] } {
  const terms = new Map<PrintedItem, string[]>()
  const elsewhere: Underlined[] = []
  // The stretch before, when it ran to the end of its line: its item and the line.
  let open: { item: PrintedItem; box: Box } | null = null
  const ordered = [...underlined].sort((a, b) => a.page - b.page || a.top - b.top || a.left - b.left)
  // In reading order inside an item: the items of a page stand side by side, so the stretches are taken item by item.
  const placed: { item: PrintedItem; box: Box; left: number; right: number; term: string; toEnd: boolean }[] = []
  for (const each of ordered) {
    const size = content.sizes?.[each.page - 1]
    const page = pages[each.page - 1]
    if (!size || !page) throw new Error(`the file has no page ${each.page} to lay an underlined stretch on`)
    // From points to the units of the XML.
    const scale = size.width / page.width
    const [left, right, top] = [each.left * scale, each.right * scale, each.top * scale]
    const holds = (box: Box): boolean => box.page === each.page && left >= box.left - 3 && left <= box.left + box.width + 3 && top >= box.top + box.height / 2 && top <= box.top + box.height + 4
    const item = content.items.find((candidate) => (candidate.boxes ?? []).some(holds))
    if (item) placed.push({ item, box: item.boxes!.find(holds)!, left, right, term: each.term, toEnd: each.toEnd })
    else elsewhere.push(each)
  }
  for (const item of content.items) {
    for (const each of placed.filter((stretch) => stretch.item === item)) {
      const list = terms.get(item) ?? []
      const goesOn = open !== null && open.item === item && each.box.page === open.box.page && each.box.top > open.box.top && each.box.top - open.box.top < 2 * open.box.height && each.left <= each.box.left + 3
      if (goesOn) list[list.length - 1] = `${list.at(-1)} ${each.term}`
      else list.push(each.term)
      terms.set(item, list)
      open = each.toEnd && each.right >= each.box.left + each.box.width - 9 ? { item, box: each.box } : null
    }
    open = null
  }
  return { terms, elsewhere }
}

// ---------------------------------------------------------------------------
// A file as pages and columns, for the extraction of located statements.
// ---------------------------------------------------------------------------

// The content-line PDFs this reader reads: one line of mathematics, of
// Dutch or of oriëntatie op jezelf en de wereld, printed in fase columns.
// Not the overviews with the core goals, the booklet of all lines, or the
// list of terms and spelling, which are laid out differently.
export function isContentLineSource(source: string): boolean {
  return /^edu\.nl\.source\.nl-slo-inhoudslijn-(?:rw|ojw|ne)-/.test(source) && !/overzicht|boekje|taalbeschouwing/.test(source)
}

// A file as the extraction reads a source by word position (extract.ts): on
// every page column 1 is the column of labels, which here holds the heading
// bars of the page, and columns 2 and on are the fase columns. Each item of
// a column is a paragraph of its own, on the page it opens on, also when it
// runs on overleaf.
export function contentLinePages(content: ContentLine): SourcePages {
  const last = Math.max(0, ...content.items.map((item) => item.page), ...content.clusters.map((cluster) => cluster.page))
  const columns: string[][] = [[]]
  for (let page = 1; page <= last; page += 1) {
    const bars = content.clusters.filter((cluster) => cluster.page === page).map((cluster) => cluster.title)
    columns.push([bars.join('\n\n'), ...content.columns.map((_, index) => content.items.filter((item) => item.page === page && item.column === index + 1).map((item) => textOf(item.runs)).join('\n\n'))])
  }
  return { pages: columns.map((page) => page.join(COLUMN_BREAK)), columns }
}

// ---------------------------------------------------------------------------
// Reading a file out of the store.
// ---------------------------------------------------------------------------

// A system tool: its standard output for these arguments. In place of the system's pdftohtml in a test.
export type { Tool }

// The files whose columns are not the three fase columns: the list of terms
// and spelling, a table by pairs of groepen.
const OWN_COLUMNS: readonly { sources: RegExp; columnLabel: RegExp }[] = [{ sources: /\.nl-slo-inhoudslijn-ne-taalbeschouwing$/, columnLabel: /^groep \d-\d\*?$/ }]

// The underlined terms of the PDF of a source record, item by item of what it prints.
export function readUnderlined(education: string, store: string, source: string, content: ContentLine, run: Tool = system): { terms: Map<PrintedItem, string[]>; elsewhere: Underlined[] } {
  const file = storedFile(education, store, source)
  const pages = pdfPages(readFileSync(file))
  return underlinedItems(content, pages, underlinedOf(pages, run('pdftotext', ['-bbox', file, '-']).toString('utf8')))
}

// What the PDF of a source record prints. The file is found in the store by the pin in its source record.
export function readContentLine(education: string, store: string, source: string, run: Tool = system): ContentLine {
  const file = storedFile(education, store, source)
  const own = OWN_COLUMNS.find((each) => each.sources.test(source))
  return parseContentLine(run('pdftohtml', ['-xml', '-i', '-stdout', file]).toString('utf8'), own ? { columnLabel: own.columnLabel } : {})
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const [slug] = process.argv.slice(2)
  if (!slug || process.argv.length !== 3) {
    console.error('usage: node education/tools/content-lines.ts <source slug>')
    process.exit(2)
  }
  const content = readContentLine(resolve(import.meta.dirname, '..'), requireStore(storeRoot()), sourceId('nl', slug))
  console.log(`columns: ${content.columns.join(' | ')}`)
  for (const each of content.clusters) console.log(`cluster (page ${each.page}): ${each.title}${each.description === '' ? '' : `\n  ${each.description}`}`)
  for (const item of content.items) {
    const where = [item.cluster, item.label, item.section, item.group].filter((part) => part !== '').join(' / ')
    console.log(`p${item.page} c${item.column} ${item.kind.padEnd(8)} [${where}] ${printedLines(item.runs, (text) => `_${text}_`).join(' / ')}`)
  }
  if (content.note !== '') console.log(`note: ${content.note}`)
}
