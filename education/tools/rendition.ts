// One way to read any source as pages of text (plan KTD3). The locator
// extraction, and every check that reads a rendition, see a source through
// here, so the text an agent located a statement in is the text the script
// then extracts.
//
// A source is read as its plan in the manifest says (`SourcePlan.extraction`):
//
//   text, legal-xml   the file decoded, as one page
//   pdf plain|layout|raw
//                     pdftotext with that flag, split into its pages
//   pdf bbox          pdftotext -bbox, then the words of each page assigned to
//                     columns by their x position and each column read from
//                     top to bottom. The columns are found by their gutters,
//                     or start where the plan's `bounds` say, the same on
//                     every page
//   pdf ocr           each page rendered and read by on-device text
//                     recognition (ocr.ts), the recognised lines assigned to
//                     columns in the same way
//   docx              the named part of the zip, its paragraphs one per line,
//                     as one page
//   git               each data file of the clone, in name order, as one page
//
// The file is found in the store by the pin in the source record
// (education/sources/<slug>.md). pdftotext and unzip are the system's, found
// on PATH. Nothing is written into the repo; the only thing kept is what text
// recognition read, in the store (ocr.ts).
//
// Pages are counted from 1, as pdftotext counts them: `pages[n]` is page n,
// and `pages[0]` is always the empty string.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { SourcePlan } from '../manifest.ts'
import { ocrPage } from './ocr.ts'
import type { Recogniser } from './ocr.ts'
import { parseRecord } from './record.ts'
import { parseId, pathForId } from './schema.ts'
import type { SourceFrontmatter } from './schema.ts'
import { FETCH_COMMAND, blobPath, clonePath, decodeText, getText, rawBlobFor } from './store.ts'

export interface SourcePages {
  // pages[n] is the text of page n; pages[0] is ''.
  pages: string[]
  // Only for a source read by word position (pdf bbox, pdf ocr): columns[n]
  // holds the columns of page n from left to right, each read from top to
  // bottom. pages[n] is those joined by COLUMN_BREAK.
  columns?: string[][]
  // Only for a clone: files[n] is the name of the data file that is page n.
  files?: string[]
}

// What stands between two columns in the text of a page. It is whitespace to
// anything that compares words, so a statement that runs from the foot of one
// column to the head of the next reads straight through.
export const COLUMN_BREAK = '\n\f\n'

// A system tool: its standard output for these arguments.
export type Run = (command: string, args: readonly string[]) => Buffer

export interface ReadOptions {
  // The education folder the source records are in. Default: this one.
  education?: string
  // In place of the system's pdftotext and unzip.
  run?: Run
  // In place of on-device text recognition.
  recognise?: Recogniser
}

export const system: Run = (command, args) => execFileSync(command, [...args], { maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] })

// --- words with positions --------------------------------------------------------

// A word, or a recognised line, with where it is on its page: in points from
// the top left corner, as pdftotext -bbox gives them.
export interface Box {
  text: string
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

// Text with its character references decoded: the five named ones of XML, and those by number.
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (whole, name: string) => {
    if (name.startsWith('#x')) return String.fromCodePoint(Number.parseInt(name.slice(2), 16))
    if (name.startsWith('#')) return String.fromCodePoint(Number.parseInt(name.slice(1), 10))
    return ENTITIES[name] ?? whole
  })
}

const BBOX_WORD = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g

// The words of each page of what pdftotext -bbox prints. The result is
// indexed by page number: its entry 0 is empty.
export function parseBbox(html: string): Box[][] {
  const pages = html
    .split('<page ')
    .slice(1)
    .map((page) => [...page.matchAll(BBOX_WORD)].map((match) => ({ text: decodeEntities(match[5]!), xMin: Number(match[1]), yMin: Number(match[2]), xMax: Number(match[3]), yMax: Number(match[4]) })))
  return [[], ...pages]
}

// --- columns ---------------------------------------------------------------------
//
// Words are first gathered into rows (words at one height) and each row into
// segments (words with no more than a word space between them), so a line of
// one column is one segment and a line set beside it in the next column is
// another. A gutter is a strip that at most a few segments cross and after
// which several segments start at about the same x; the few it tolerates are
// headings set across columns. A segment belongs to the column it starts in.

interface Segment {
  xMin: number
  xMax: number
  // The row it is in, counted from the top.
  row: number
  boxes: Box[]
}

// Two boxes are in one row when their centres are closer than this share of a box's height.
const ROW = 0.4
// Two words of a row are in one segment when the space between them is narrower than this share of a word's height.
const WORD_SPACE = 0.5
// A gutter is at least this share of the median height wide.
const GUTTER = 0.75
// The share of a page's rows that may cross a gutter (headings set across columns), and never fewer than one.
const CROSSING = 0.05
// A column starts where at least this many segments start within one median height of each other.
const STARTS = 3
// A segment that starts less than this share of the median height before a
// column's start is still in that column. A recognised line takes in its
// bullet, and its box starts a point or so left of where the text layer puts
// that bullet.
const EDGE = 0.5

const height = (box: Box): number => box.yMax - box.yMin

function medianHeight(boxes: readonly Box[]): number {
  const heights = boxes.map(height).sort((a, b) => a - b)
  return heights[Math.floor(heights.length / 2)] ?? 0
}

// The boxes in rows from top to bottom, each row from left to right.
export function rowsOf(boxes: readonly Box[]): Box[][] {
  const byHeight = boxes.slice().sort((a, b) => a.yMin + a.yMax - (b.yMin + b.yMax))
  const rows: { centre: number; boxes: Box[] }[] = []
  for (const box of byHeight) {
    const centre = (box.yMin + box.yMax) / 2
    const row = rows.at(-1)
    if (row && Math.abs(row.centre - centre) < height(box) * ROW) row.boxes.push(box)
    else rows.push({ centre, boxes: [box] })
  }
  return rows.map((row) => row.boxes.sort((a, b) => a.xMin - b.xMin))
}

function segmentsOf(boxes: readonly Box[]): { segments: Segment[]; rows: number } {
  const rows = rowsOf(boxes)
  const segments: Segment[] = []
  rows.forEach((row, index) => {
    let segment: Segment | null = null
    for (const box of row) {
      if (segment && box.xMin - segment.xMax < height(box) * WORD_SPACE) {
        segment.xMax = Math.max(segment.xMax, box.xMax)
        segment.boxes.push(box)
      } else {
        segment = { xMin: box.xMin, xMax: box.xMax, row: index, boxes: [box] }
        segments.push(segment)
      }
    }
  })
  return { segments, rows: rows.length }
}

// Where the second and each later column of a page starts: x positions, from
// left to right. Empty for a page of one column.
export function columnBounds(boxes: readonly Box[]): number[] {
  if (boxes.length === 0) return []
  const { segments, rows } = segmentsOf(boxes)
  const median = medianHeight(boxes)
  const crossing = Math.max(1, Math.floor(rows * CROSSING))
  const left = Math.floor(Math.min(...boxes.map((box) => box.xMin)))
  const right = Math.ceil(Math.max(...boxes.map((box) => box.xMax)))

  // How many segments cover each point of the page's width.
  const cover = new Array<number>(right - left + 2).fill(0)
  for (const segment of segments) for (let x = Math.floor(segment.xMin); x <= Math.ceil(segment.xMax); x += 1) cover[x - left]! += 1
  const starts = segments.map((segment) => segment.xMin).sort((a, b) => a - b)

  const bounds: number[] = []
  let from: number | null = null
  for (let x = left; x <= right + 1; x += 1) {
    const quiet = x <= right && cover[x - left]! <= crossing
    if (quiet && from === null) from = x
    if (quiet || from === null) continue
    // A quiet strip from `from` up to x. A column starts in it, or at its end,
    // where enough segments start together, a gutter's width in.
    const strip = from
    from = null
    if (strip === left) continue
    const start = starts.find((at) => at >= strip + median * GUTTER && at <= x + 1.5 && starts.filter((other) => other >= at && other <= at + median).length >= STARTS)
    if (start !== undefined) bounds.push(start - 1)
  }
  return bounds
}

// The text of each column of a page, from left to right: its rows from top to
// bottom, one per line. `bounds` is where each column after the first starts;
// left out, the page's own gutters are found. A column that holds no text is
// left out.
export function inColumns(boxes: readonly Box[], bounds: readonly number[] = columnBounds(boxes)): string[] {
  const columns: Segment[][] = [...bounds, 0].map(() => [])
  const edge = medianHeight(boxes) * EDGE
  for (const segment of segmentsOf(boxes).segments) columns[bounds.filter((bound) => segment.xMin + edge >= bound).length]!.push(segment)
  return columns
    .filter((column) => column.length > 0)
    .map((column) => {
      const lines: { row: number; text: string }[] = []
      for (const segment of column.sort((a, b) => a.row - b.row || a.xMin - b.xMin)) {
        const text = segment.boxes.map((box) => box.text).join(' ')
        const last = lines.at(-1)
        if (last && last.row === segment.row) last.text += ` ${text}`
        else lines.push({ row: segment.row, text })
      }
      return lines.map((line) => line.text).join('\n')
    })
}

// --- a word-processor file -------------------------------------------------------

// The text of a word-processor part (word/document.xml): each paragraph on
// its own line, a table cell's paragraphs like any other, a tab as a tab and
// a line break inside a paragraph as a space. Empty paragraphs are left out.
export function docxText(xml: string): string {
  const paragraphs: string[] = []
  for (const paragraph of xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []) {
    let text = ''
    for (const piece of paragraph.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:(?:br|cr)(?: [^>]*)?\/>/g)) {
      if (piece[1] !== undefined) text += decodeEntities(piece[1])
      else text += piece[0].startsWith('<w:tab') ? '\t' : ' '
    }
    if (text.trim() !== '') paragraphs.push(text)
  }
  return paragraphs.map((paragraph) => `${paragraph}\n`).join('')
}

// --- reading a source ------------------------------------------------------------

// The source record with this id, from the education folder.
export function readSourceRecord(education: string, id: string): SourceFrontmatter {
  const file = parseId(id)?.kind === 'source' ? pathForId(id) : null
  if (!file || !existsSync(join(education, file))) throw new Error(`there is no source record ${id}`)
  return parseRecord(readFileSync(join(education, file), 'utf8'), file).frontmatter as SourceFrontmatter
}

// The file of a source record that is pinned by its bytes, in the store.
export function storedFile(education: string, store: string, source: string): string {
  const record = readSourceRecord(education, source)
  const file = blobPath(store, record.pin)
  if (record.pin_kind !== 'bytes' || !existsSync(file)) throw new Error(`the file of ${source} is not in the store at ${store}: run \`${FETCH_COMMAND}\` first`)
  return file
}

// Where the fetched file of a source is in the store.
function fileOf(source: SourceFrontmatter, store: string): string {
  const hash = source.pin_kind === 'extracted-text' ? rawBlobFor(store, source.pin) : source.pin
  const path = hash ? blobPath(store, hash) : null
  if (!path || !existsSync(path)) throw new Error(`the file of ${source.id} is not in the store at ${store}: run \`${FETCH_COMMAND}\` first`)
  return path
}

// The languages text recognition is asked for: Dutch and English, the plan's own first.
function languagesFor(language: string): string[] {
  return language.toLowerCase().startsWith('en') ? ['en-US', 'nl-NL'] : ['nl-NL', 'en-US']
}

const numbered = (pages: readonly string[]): string[] => ['', ...pages]

function pdfText(file: string, flags: readonly string[], run: Run): string[] {
  const pages = run('pdftotext', [...flags, file, '-']).toString('utf8').split('\f')
  // pdftotext closes every page with a form feed, so nothing follows the last one.
  if (pages.at(-1) === '') pages.pop()
  return pages
}

function inPages(columns: readonly (readonly string[])[]): SourcePages {
  return { pages: columns.map((page) => page.join(COLUMN_BREAK)), columns: columns.map((page) => [...page]) }
}

// A source as pages of text, read as its plan says. `store` is the root of the store.
export function readSource(plan: SourcePlan, store: string, options: ReadOptions = {}): SourcePages {
  const education = options.education ?? resolve(import.meta.dirname, '..')
  const run = options.run ?? system
  const source = readSourceRecord(education, plan.source)
  const { extraction } = plan

  if (extraction.kind === 'git') {
    const folder = join(clonePath(store, parseId(source.id)!.slug), extraction.dataPath)
    if (!existsSync(folder)) throw new Error(`the clone of ${source.id} is not in the store at ${store}: run \`${FETCH_COMMAND}\` first`)
    const files = readdirSync(folder)
      .filter((name) => name.endsWith(`.${extraction.format}`))
      .sort()
    return { pages: numbered(files.map((name) => decodeText(readFileSync(join(folder, name))))), files: numbered(files) }
  }

  if (extraction.kind === 'text' || extraction.kind === 'legal-xml') {
    // A page pinned by its text is read as that text: it is what the pin holds still.
    const pinned = source.pin_kind === 'extracted-text' ? getText(store, source.pin) : null
    return { pages: numbered([pinned ?? decodeText(readFileSync(fileOf(source, store)))]) }
  }

  const file = fileOf(source, store)
  if (extraction.kind === 'docx') return { pages: numbered([docxText(run('unzip', ['-p', file, extraction.part]).toString('utf8'))]) }

  if (extraction.mode !== 'bbox' && extraction.mode !== 'ocr') return { pages: numbered(pdfText(file, extraction.mode === 'plain' ? [] : [`-${extraction.mode}`], run)) }

  const layer = parseBbox(run('pdftotext', ['-bbox', file, '-']).toString('utf8'))
  // A plan with `bounds` names where the columns start: every page is split
  // there, and its own gutters are not looked for.
  if (extraction.mode === 'bbox') return inPages(layer.map((words) => inColumns(words, extraction.bounds)))

  // An image-based PDF. The recognised lines are the text. The columns are
  // taken from the page's text layer where it shows them (it holds the
  // headings and the bullet before each statement, at exact positions), and
  // from the recognised lines otherwise: those also hold the labels inside
  // drawings, which can lie across a gutter.
  const languages = languagesFor(extraction.language)
  return inPages(
    layer.map((words, page) => {
      if (page === 0) return []
      const { lines } = ocrPage(store, source.pin, file, page, languages, options.recognise)
      const bounds = columnBounds(words)
      return inColumns(lines, bounds.length > 0 ? bounds : columnBounds(lines))
    }),
  )
}

// The pages of a source: `pagesOf(plan, store)[n]` is the text of page n,
// counted from 1 as pdftotext counts, and entry 0 is ''.
export function pagesOf(plan: SourcePlan, store: string, options: ReadOptions = {}): string[] {
  return readSource(plan, store, options).pages
}

// The columns of each page of a source read by word position:
// `columnsOf(plan, store)[n][c - 1]` is column c of page n.
export function columnsOf(plan: SourcePlan, store: string, options: ReadOptions = {}): string[][] {
  const { columns } = readSource(plan, store, options)
  if (!columns) throw new Error(`${plan.source} is not read by word position, so its pages have no columns`)
  return columns
}
