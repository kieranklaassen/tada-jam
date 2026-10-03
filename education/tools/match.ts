// The scripted first pass of the second check (plan KTD8, KTD9): it finds
// each record's official wording in the check rendition of its lane part, so
// that a checker agent judges only what a script cannot.
//
//   node education/tools/match.ts --lane us-ca/grade-4/mathematics
//   node education/tools/match.ts --lane us-ca/grade-4/practical-life-feelings --batch safety
//   node education/tools/match.ts --lane us-ca/grade-4/mathematics --json
//
// Forward, for every objective record of the lane or batch: its wording (from
// the file when verbatim, from the store when description-only) is looked for
// in the check rendition of its part, the part's own source read again when
// the manifest says `same-file`. Text is compared word by word after
// normalise.ts, without case or punctuation, and the words must stand in a
// row. A hit is the rendition, the page (or the data file, as `node`) and the
// offset: how many words of that page stand before the first word. On a page
// read by word position every column is searched, and then the columns joined.
//
// A part that the manifest checks against the open-data nodes of its
// statements (`dataNodes`) is looked for in those nodes only, each node one
// page named by its id: not in the clone's other files, levels or deprecated
// objects. There a wording that is one node whole is a plain match. One that
// is only a piece of a node, or several whole nodes in a row, is a match with
// `granularity_differs`: the data cuts the text into other pieces.
//
// A record belongs to the part that reads its source. Where several parts
// read one source, to the one whose selection picks it: by code prefix, or
// by the group its code scope ends in.
//
// A wording is also looked for as parts, for where it does not stand in a row:
//
//   labelled spans   blocks set apart by a blank line, each a label, a colon
//                    and text. Every span's text has to be found, anywhere.
//   lines            a stem and the lines under it. Every line has to be
//                    found, in order, on the same or the following page.
//   stem and part    a record with a `parent_code` repeats its parent's stem
//                    before its own text, on one line. The two have to be
//                    found in order, split where a sentence of the wording ends.
//   over a page      a statement that runs to the foot of a page or column,
//                    with no more than a footer after it, and goes on at the
//                    very top of the next page or of a column of it.
//
// Lines, and stem and part, are matches with `granularity_differs`: the two
// renditions split the statement differently (KTD9). Something else may then
// stand between the parts. The places of all parts are given whenever a
// wording was found as more than one.
//
// Exactly four artefacts of a text layer are tolerated, and a match that
// needed any of them says `tolerant`:
//
//   a hyphen dropped     a rendition word that is two wording words joined
//                        (plain mode drops a line-break hyphen: "oneto-one")
//   a hyphen kept        a wording word printed as two with a hyphen and a
//                        space between ("care- fully")
//   a ligature           a wording word printed as two, the first ending in
//                        f, ff, fi or fl ("stoff en", "fi etsers")
//   a raised digit       a word whose raised or lowered digits one rendition
//                        prints plain (m³ and m3); the digits must be the same
//
// A rendition may print one statement more than once: for several grades, in
// two strands or columns, or quoted inside another statement. Every printing
// is found, whichever way it was found (in a row, tolerantly, as parts), and
// a record with more than one says `ambiguous` and lists them all in reading
// order as `places`, each with how it was found: the checker chooses the
// record's own cell. `place` is the one the pass prefers: a printing in a
// row before one found only as parts, one that needed no tolerance before
// one that did, and then the first; and for a record whose preferred
// printing is away from the pages most records of its part stand on, the
// preferred one on those pages. Two records of the lane whose places are the
// same, part for part, name each other (`shared_place_with`): one printed
// statement carried by two records.
//
// Where a page is read by word position the match says which column it
// stands in (`column`): the column's label where the reading knows one (the
// fase over a column of the Dutch content lines, the grade over a column of
// a headed table), otherwise its number from the left as read.
//
// A printed block is a statement, a heading or a paragraph. In the Dutch
// content lines the reading knows them: a statement runs from its mark to the
// next mark, label, heading or gap. There a match never runs from one block
// into the next, unless the record itself breaks its line at that point, so
// the end of one statement and the start of the next (or of a heading that
// reaches into the column) are not taken for one statement. A statement that
// runs over its own lines, or from the foot of a column to the top of that
// column overleaf, is one block or two whole ones and is matched.
// Elsewhere only blank lines, the values of a data file and the columns of a
// page say where a block may end, and a statement can run over those: such a
// match stands, and says `crosses_break` so that the checker looks.
//
// Words are compared, not the marks between them. What differs in form at a
// matched place is listed (`form_differences`): a hyphen, a comma or other
// punctuation that the two do not both have between the same two words, two
// words the rendition prints as one, a word it splits at a line end, a
// raised digit (a break after a ligature is the text layer's and is not
// listed). Each says its kind and where (the word of the wording, the place
// in the rendition), and for a record whose wording is in its file the two
// forms as well. It never changes whether a record is matched.
//
// In reverse, for a part whose check rendition is another file and whose
// records carry printed codes: the shape of the part's codes is taken from
// its records (which runs of a code are the same in every record, which
// vary), every token of that shape in the rendition is read, and those no
// record carries and the manifest does not skip are listed with their page.
// Two kinds explain themselves: the parent code of sub-part records, and a
// lettered sub-part whose line stands inside its parent's record. The result
// says how many of the part's own codes the rendition prints: a statement
// printed without its code is not seen this way. Where the rendition prints
// the codes without the run they all start with (a grade, named in the page
// header instead), they are read on the pages most of the part's records
// stand on, with that run put back. The pass does not apply, and says why,
// to a part checked in the same file, to records without printed codes or
// with codes that are bare numbers or labels, and to a rendition that prints
// none of the codes.
//
// Nothing is written: the result is printed, as text or JSON, for the checker
// who writes the review file. For a description-only lane it holds ids, codes
// and places, never wording. The network is not used; the store is required.
//
// `verifyPlace` is what review-join.ts asks about every confirming verdict a
// script matched: whether the wording is at the place the verdict states, as
// any of its printings.

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANIFEST, SOURCE_PLANS, laneOf, planFor } from '../manifest.ts'
import type { DataNodes, Lane, LanePart, SourcePlan } from '../manifest.ts'
import { BAND, batchNamed, batchOf, parseLaneArgs, readLane } from './lane-text.ts'
import type { LaneRecord } from './lane-text.ts'
import { normalise, normaliseCode } from './normalise.ts'
import { WORD, words } from './overlap.ts'
import { officialWording } from './record.ts'
import type { RecordFile } from './record.ts'
import { COLUMN_BREAK, inColumns, parseBbox, readSource, rowsOf, storedFile, system } from './rendition.ts'
import type { Box, SourcePages } from './rendition.ts'
import { formatPlace } from './review.ts'
import type { Place, Verdict } from './review.ts'
import { OFFICIAL_WORDING, SAME_FILE, laneKey, parseId, sourceId } from './schema.ts'
import type { Jurisdiction, ObjectiveFrontmatter } from './schema.ts'
import { FETCH_COMMAND, getWording, requireStore, storeRoot } from './store.ts'

export interface MatchOptions {
  // The education folder the records and source records are in. Default: this one.
  education?: string
  // The root of the store. Default: storeRoot().
  store?: string
  // In place of reading each source from the store as its plan says.
  pages?: (source: string) => ReadPages
  // How each source is read. Default: the manifest's plans.
  plans?: readonly SourcePlan[]
  // The lanes a record may belong to, for verifying a place. Default: the manifest's lanes.
  lanes?: readonly Lane[]
}

// A source as it is read here: its pages, and what a reading by word position
// knows about the columns of each page beyond their text.
export interface ReadPages extends SourcePages {
  // columnNames[n][c] is what column c of page n is called: its label (the
  // fase or grade printed over it), or its number where columns that hold no
  // text were left out. Null or missing: its number from the left as read.
  columnNames?: (string | number | null)[][]
  // firm[n] is true when the blank lines in the columns of page n are the
  // borders of the printed statements and headings, each known from the page.
  firm?: boolean[]
}

// A difference of form between the wording and the rendition at a matched place.
export interface FormDifference {
  // The marks between two words differ: a hyphen or a comma that one of the
  // two lacks, or other punctuation. joined: two words of the wording printed
  // as one. split: one word of the wording printed as two, with a hyphen at a
  // line end. raised-digit: a digit raised or lowered in one and plain in the
  // other.
  kind: 'hyphen' | 'comma' | 'punctuation' | 'joined' | 'split' | 'raised-digit'
  // Which of the two has the mark, or the joined or split form.
  only_in?: 'wording' | 'rendition'
  // For punctuation that one of the two lacks: the marks.
  mark?: string
  // For punctuation where each has marks the other lacks (the bullets of a list, say): those of each.
  marks?: { wording: string; rendition: string }
  // The word of the wording it follows (a mark) or starts at, counted from 1.
  word: number
  // The word of the rendition it follows or starts at.
  place: Place
  // The two forms. Only for a record whose wording is in its file.
  wording?: string
  rendition?: string
}

// One printing of a wording, and how it was found.
export interface Occurrence {
  // Where the wording, or its first part, starts.
  place: Place
  // Where each part starts, when the wording was found as more than one.
  parts?: Place[]
  // The match needed one of the tolerated artefacts of a text layer.
  tolerant?: true
  // The wording was found as parts that the rendition does not print in a row.
  granularity_differs?: true
  // The match runs over a blank line, from one value of a data file into the
  // next, or from one column into the next, where the record has no line
  // break: it may join the end of one statement to the start of another.
  crosses_break?: true
  // The column it starts in, on a page read by word position: its label, or its number from the left.
  column?: string | number
  // What differs in form between the wording and the rendition here.
  form_differences?: FormDifference[]
}

export interface RecordMatch extends Partial<Occurrence> {
  id: string
  // The printed code, empty when the source prints none.
  code: string
  // The name of the lane part the record belongs to.
  part: string
  matched: boolean
  // The slug of the source record that was read, or `same-file`.
  rendition: string
  // Where the wording, or its first part, starts. Empty when it was not found.
  place: Place
  // The rendition prints the wording more than once: `places` holds every
  // printing in reading order, `place` among them.
  ambiguous?: true
  places?: Occurrence[]
  // The other records of the lane found at the same place.
  shared_place_with?: string[]
  why_not?: 'not-found' | 'rendition-unreadable'
}

export interface ReverseEntry {
  // The code as the rendition prints it, with the run put back that it leaves out.
  code: string
  place: Place
}

export interface Reverse {
  part: string
  rendition: string
  applies: boolean
  // Why the reverse pass does not apply to this part.
  why_not?: string
  // How many of the part's record codes the rendition prints, and how many
  // there are. A statement the rendition prints without its code is not seen.
  printed?: number
  of?: number
  explained: (ReverseEntry & { explained: string })[]
  unexplained: ReverseEntry[]
}

export interface LaneMatch {
  // <jurisdiction>/<level>/<subject>
  lane: string
  batch?: string
  // The records of the lane, or of the batch, in the lane's order.
  records: RecordMatch[]
  // One per lane part, always over the whole lane.
  reverse: Reverse[]
  // The check renditions that could not be read, and why. Left out when all were read.
  unreadable?: { rendition: string; why: string }[]
}

// --- words -------------------------------------------------------------------------

// A run of text that is searched as one: a page, or one column of it.
interface Stretch {
  words: string[]
  // The words that are followed by a hyphen and a space: a word broken at the
  // end of a line, where the rendition kept the hyphen.
  breaks: Set<number>
  // How many words of the page stand before it.
  offset: number
  // The text as it is compared, for the marks between its words.
  row: string
  // The words that open a printed block after the first: what follows a blank
  // line or a column break.
  blocks: number[]
  // True when the blocks are the statements and headings of the page, each
  // known from the page. Otherwise a statement may run over one.
  firm: boolean
  // What its column is called. Not for a page of one column.
  column?: string | number
  // Only for the columns of a page joined: those columns.
  columns?: Stretch[]
  // Where each word starts and ends in `row`. Built when first asked.
  spans?: number[]
  // Where each word occurs. Built when first searched.
  index?: Map<string, number[]>
  // Where each word with a raised or lowered digit occurs, by the word with its digits plain.
  folded?: Map<string, number[]>
  // The words that end where a ligature may have ended them.
  ligatures?: number[]
}

// A word may be broken where a ligature (ff, fi, fl) is set as one glyph:
// the text layer then prints "stoff en" and "fi etsers".
const LIGATURE = /f[il]?$/

const RAISED = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const LOWERED = '₀₁₂₃₄₅₆₇₈₉'

// A word with its raised and lowered digits written as plain ones.
function fold(word: string): string {
  return word.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹₀-₉]/g, (digit) => String(RAISED.includes(digit) ? RAISED.indexOf(digit) : LOWERED.indexOf(digit)))
}

// What sets two printed blocks apart in text: a blank line, or the break between two columns.
const BLOCK_BREAK = /\n[ \t]*\n|\f/
// What a reading that knows the blocks of a column puts between them.
const BLOCK_GAP = '\n\n'

function stretchOf(text: string, offset: number, known: { firm?: boolean; column?: string | number } = {}): Stretch {
  const row = normalise(text)
  const plain = words(text)
  const found = [...row.matchAll(WORD)]
  if (found.length !== plain.length) throw new Error('match.ts and overlap.ts no longer split text into the same words')
  const breaks = new Set<number>()
  found.forEach((match, index) => {
    const end = match.index + match[0].length
    if (row[end] === '-' && row[end + 1] === ' ') breaks.add(index)
  })
  const blocks: number[] = []
  let before = 0
  for (const block of text.split(BLOCK_BREAK)) {
    const held = words(block).length
    if (held > 0 && before > 0) blocks.push(before)
    before += held
  }
  // A mark that joins letters over a break would make the blocks hold other words than the text: then none are known.
  if (before !== plain.length) blocks.length = 0
  return { words: plain, breaks, offset, row, blocks, firm: known.firm === true, ...(known.column === undefined ? {} : { column: known.column }) }
}

// Where each word of a text as it is compared starts and ends: [start, end, start, end, ...].
function spansOf(row: string): number[] {
  const spans: number[] = []
  for (const match of row.matchAll(WORD)) spans.push(match.index, match.index + match[0].length)
  return spans
}

// --- a rendition as it is searched -------------------------------------------------

interface Rendition {
  // pages[n] holds the stretches of page n: the page, or each of its columns and then the columns joined.
  pages: Stretch[][]
  // The normalised text of each page, for reading codes.
  text: string[]
  // Only for a clone: the data file that is page n. For the open-data nodes
  // of a part: the id of the node that is page n.
  files?: string[]
  // True when every page is one statement of the data. A wording may then be
  // several of them in a row.
  whole?: true
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

// Text with its tags taken out and its entities decoded: what a reader of the page or the law sees.
function markupText(text: string): string {
  return text
    .replace(/<[?!/A-Za-z][^<>]*>/g, ' ')
    .replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (whole, name: string) => {
      if (name.startsWith('#x')) return String.fromCodePoint(Number.parseInt(name.slice(2), 16))
      if (name.startsWith('#')) return String.fromCodePoint(Number.parseInt(name.slice(1), 10))
      return ENTITIES[name] ?? whole
    })
}

// The string values of a JSON file, in document order, a blank line between
// them: each is a block of its own. A goal's text is such a value; keys,
// numbers and the escapes of the file are not text.
function jsonText(text: string): string {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return text
  }
  const values: string[] = []
  const visit = (held: unknown): void => {
    if (typeof held === 'string') values.push(markupText(held))
    else if (Array.isArray(held)) held.forEach(visit)
    else if (typeof held === 'object' && held !== null) Object.values(held).forEach(visit)
  }
  visit(value)
  return values.join(BLOCK_GAP)
}

function readable(plan: SourcePlan | undefined): (text: string) => string {
  const extraction = plan?.extraction
  if (extraction?.kind === 'git' || (extraction?.kind === 'text' && extraction.format === 'json')) return jsonText
  if (extraction?.kind === 'legal-xml' || (extraction?.kind === 'text' && extraction.format === 'html')) return markupText
  return (text) => text
}

function renditionOf(source: ReadPages, plan: SourcePlan | undefined): Rendition {
  const read = readable(plan)
  const pages = source.pages.map((text, page) => {
    const columns = source.columns?.[page]
    const names = source.columnNames?.[page]
    const firm = source.firm?.[page] === true
    // A page of one column has a column to name only when the reading gave it a label.
    const only = typeof names?.[0] === 'string' ? names[0] : undefined
    if (!columns || columns.length < 2) return [stretchOf(read(text), 0, { firm, ...(columns?.length === 1 && only !== undefined ? { column: only } : {}) })]
    const stretches: Stretch[] = []
    let offset = 0
    for (const [index, column] of columns.entries()) {
      const stretch = stretchOf(read(column), offset, { firm, column: names?.[index] ?? index + 1 })
      stretches.push(stretch)
      offset += stretch.words.length
    }
    return [...stretches, { ...stretchOf(read(columns.join(COLUMN_BREAK)), 0, { firm }), columns: stretches }]
  })
  return { pages, text: source.pages.map((text) => normalise(read(text))), ...(source.files ? { files: source.files } : {}) }
}

// --- columns under a header row ----------------------------------------------------
//
// The grade tables of California's English language arts PDF are three grade
// columns a few points apart, under a row of column labels. The column finder
// of rendition.ts needs a wider gutter, and reads such a page as one column
// with the three grades interleaved. Here the header rows are found by their
// labels, and each column starts where the standard numbers under its label
// stand. A page may hold two tables; each is read by its own header.

// The source read this way, and what a column label of its tables looks like.
const HEADED_TABLES: Readonly<Record<string, RegExp>> = {
  [sourceId('us-ca', 'us-ca-cde-ccss-ela-pdf')]: /^(?:Kindergartners|Grades? \d+(?:-\d+)? Students)$/,
}

// Two words of a row belong to one label when the space between them is narrower than this many heights.
const LABEL_SPACE = 2
// Two words of a row follow each other in one line when the space between them is narrower than this share of a word's height.
const WORD_SPACE = 0.5
// The number that opens a standard, as it stands at the start of its column.
const STANDARD_NUMBER = /^\d{1,2}\.$/

const centre = (box: Box): number => (box.yMin + box.yMax) / 2

function textOf(boxes: readonly Box[]): string {
  return rowsOf(boxes)
    .map((row) => row.map((box) => box.text).join(' '))
    .join('\n')
}

interface Header {
  top: number
  bottom: number
  // The column labels, from left to right.
  labels: { xMin: number; xMax: number; text: string }[]
}

// The column labels of a row, when it holds two or more. A header drawn twice,
// a point or so apart, reads as each word twice: a word that lies over one
// already read, and a word that repeats the one before it, are dropped.
function headerOf(row: readonly Box[], label: RegExp): Header | null {
  const groups: Box[][] = []
  for (const box of row) {
    const group = groups.at(-1)
    if (group && box.xMin - Math.max(...group.map((each) => each.xMax)) < (box.yMax - box.yMin) * LABEL_SPACE) group.push(box)
    else groups.push([box])
  }
  const labels = groups.flatMap((group) => {
    const once: Box[] = []
    for (const box of group) {
      const over = once.some((kept) => Math.min(kept.xMax, box.xMax) - Math.max(kept.xMin, box.xMin) > (box.xMax - box.xMin) / 2)
      if (!over && once.at(-1)?.text !== box.text) once.push(box)
    }
    const text = normalise(once.map((box) => box.text).join(' '))
    return label.test(text) ? [{ group, text }] : []
  })
  if (labels.length < 2) return null
  const held = labels.flatMap((each) => each.group)
  return {
    top: Math.min(...held.map((box) => box.yMin)),
    bottom: Math.max(...held.map((box) => box.yMax)),
    labels: labels.map(({ group, text }) => ({ xMin: Math.min(...group.map((box) => box.xMin)), xMax: Math.max(...group.map((box) => box.xMax)), text })),
  }
}

// Where a column starts: where most standard numbers stand between the end of
// the label before and the start of its own label. Only a number that opens a
// line counts: one with a word close before it ends a sentence inside the
// column before. Of two places with as many numbers, the left one: a number
// further right opens a line that ran on, inside the column itself. Null
// when no number stands there.
function columnStart(region: readonly Box[], after: number, upTo: number): number | null {
  const numbers = rowsOf(region)
    .flatMap((row) => row.filter((box, at) => STANDARD_NUMBER.test(box.text) && (at === 0 || box.xMin - row[at - 1]!.xMax >= (box.yMax - box.yMin) * WORD_SPACE)))
    .filter((box) => box.xMin > after && box.xMin <= upTo)
    .sort((a, b) => a.xMin - b.xMin)
  const clusters: Box[][] = []
  for (const box of numbers) {
    const cluster = clusters.at(-1)
    if (cluster && box.xMin - cluster[0]!.xMin < 1.5) cluster.push(box)
    else clusters.push([box])
  }
  let best: Box[] | null = null
  for (const cluster of clusters) if (!best || cluster.length > best.length) best = cluster
  return best ? best[0]!.xMin : null
}

// A column of a page of headed tables: its text, and the label over it.
export interface TableColumn {
  // The label of its header. Not for what stands above the first header or left of a table's first column.
  name?: string
  text: string
}

// A page of tables whose columns stand under header rows of labels: what
// stands above the first header, then for each table what stands left of its
// first column (labels set in the margin) and each column from top to bottom,
// under the label of its header. Parts that hold no text are left out. Null
// for a page without such a header row.
export function tableLayout(boxes: readonly Box[], label: RegExp): TableColumn[] | null {
  const headers = rowsOf(boxes)
    .map((row) => headerOf(row, label))
    .filter((header) => header !== null)
  if (headers.length === 0) return null
  const parts: TableColumn[] = [{ text: textOf(boxes.filter((box) => centre(box) < headers[0]!.top)) }]
  headers.forEach((header, index) => {
    const until = headers[index + 1]?.top ?? Infinity
    const region = boxes.filter((box) => centre(box) > header.bottom && centre(box) < until)
    const starts = header.labels.map((each, column) => {
      const after = column === 0 ? -Infinity : header.labels[column - 1]!.xMax
      // Without a number to go by: halfway between the two labels, and for the first column the left edge.
      return columnStart(region, after, each.xMin) ?? (column === 0 ? -Infinity : (after + each.xMin) / 2)
    })
    const columns: Box[][] = [[], ...starts.map(() => [])]
    for (const box of region) columns[starts.filter((start) => box.xMin >= start - 0.5).length]!.push(box)
    columns.forEach((column, at) => parts.push({ ...(at === 0 ? {} : { name: header.labels[at - 1]!.text }), text: textOf(column) }))
  })
  return parts.filter((part) => part.text !== '')
}

// The same as text only.
export function tableColumns(boxes: readonly Box[], label: RegExp): string[] | null {
  return tableLayout(boxes, label)?.map((part) => part.text) ?? null
}

// --- columns of statements that open with a mark -----------------------------------
//
// The per-band goals of the Dutch curriculum institute are printed in three
// columns, fase 1 to 3, beside a column of labels, and the columns nearly
// touch: a line of one ends a point before the next begins. Every statement
// opens with a mark at the start of its column, at the same x on every page
// of a file. So the column starts are where marks stand under each other
// anywhere in the file, and every word goes to the nearest start at or left
// of it.

//
// The marks also say where every statement starts and ends. A column is read
// as printed blocks: a statement from its mark, with the lines under it at
// the distance of a line that start where the text of a statement starts or
// where the text of a sub-point of it starts; and everything else as a block
// of its own: a label set at the place of a mark, the end of a heading that
// reaches in from the column of labels, a line after a gap, the footer. What
// runs on at the top of a column from the page before is a block without a
// mark, read by the same rule.

// The sources read this way, the mark that opens a statement in them, and what the label printed over a column looks like.
// A label may carry the mark of a footnote: what `label` matches is the name.
const MARKED_COLUMNS: readonly { sources: RegExp; mark: RegExp; label: RegExp }[] = [{ sources: /\.nl-slo-inhoudslijn-/, mark: /^−$/, label: /^fase \d(?=[^\p{L}\p{N}]*$)/u }]

// Two places across the page are the same when they are closer than this many points.
const SAME_X = 1.5
// A line follows the one above it in the same block when the space between them is no more than this share of its height.
const LINE_SPACE = 0.5

// A column of a page whose statements open with a mark.
export interface MarkedColumn {
  // The label printed over it (fase 2), or its number: 0 for what stands left
  // of the first column of statements, 1 for that column, and so on.
  column: string | number
  // Its printed blocks from top to bottom, the lines of each one per line.
  blocks: string[]
}

// The printed blocks of one column. `start` is where its marks stand and
// `text` where the text after a mark starts; both null for the column of labels.
function blocksOf(boxes: readonly Box[], start: number | null, text: number | null, mark: RegExp): string[] {
  const blocks: { lines: string[]; indents: number[]; bottom: number }[] = []
  for (const row of rowsOf(boxes)) {
    const [first, second] = row as [Box, Box | undefined]
    const opens = start !== null && mark.test(first.text) && Math.abs(first.xMin - start) < SAME_X
    const block = blocks.at(-1)
    const top = Math.min(...row.map((box) => box.yMin))
    const near = block !== undefined && !opens && top - block.bottom <= (first.yMax - first.yMin) * LINE_SPACE
    const follows = near && [...block.indents, ...(text === null ? [] : [text])].some((indent) => Math.abs(first.xMin - indent) < SAME_X)
    if (follows) block.lines.push(row.map((box) => box.text).join(' '))
    else blocks.push({ lines: [row.map((box) => box.text).join(' ')], indents: [opens && second ? second.xMin : first.xMin], bottom: 0 })
    const held = blocks.at(-1)!
    // A sub-point: its own mark, and its text further in.
    if (!opens && second && !/[\p{L}\p{N}]/u.test(first.text)) held.indents.push(second.xMin)
    held.bottom = Math.max(...row.map((box) => box.yMax))
  }
  return blocks.map((block) => block.lines.join('\n'))
}

// The columns of each page of a file whose statements open with a mark: what
// stands left of the first column (labels), then each column from top to
// bottom, each as its printed blocks, those without text left out. A column
// goes by the label printed over it anywhere in the file (a line of its own
// that `label` matches: what it matches is the name), otherwise by its number. Null for a page that
// holds no mark at a column start, and for every page when no two marks of
// the file stand under each other.
export function markedLayout(pages: readonly (readonly Box[])[], mark: RegExp, label?: RegExp): (MarkedColumn[] | null)[] {
  const marks = pages.flatMap((boxes) => boxes.filter((box) => mark.test(box.text))).sort((a, b) => a.xMin - b.xMin)
  const clusters: Box[][] = []
  for (const box of marks) {
    const cluster = clusters.at(-1)
    if (cluster && box.xMin - cluster[0]!.xMin < SAME_X) cluster.push(box)
    else clusters.push([box])
  }
  const starts = clusters.filter((cluster) => cluster.length > 1).map((cluster) => cluster[0]!.xMin)
  // Where the text after a mark starts, in each column: where it does most often in the file.
  const texts = starts.map((start) => {
    const seen = new Map<number, number>()
    for (const boxes of pages) {
      for (const row of rowsOf(boxes.filter((box) => box.xMin >= start - 0.5))) {
        const [first, second] = row
        if (!second || !mark.test(first!.text) || Math.abs(first!.xMin - start) >= SAME_X) continue
        const x = Math.round(second.xMin)
        seen.set(x, (seen.get(x) ?? 0) + 1)
      }
    }
    return [...seen].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  })
  const inColumn = (boxes: readonly Box[]): Box[][] => {
    const columns: Box[][] = [[], ...starts.map(() => [])]
    for (const box of boxes) columns[starts.filter((start) => box.xMin >= start - 0.5).length]!.push(box)
    return columns
  }
  const names: (string | number)[] = [0, ...starts.map((_, index) => index + 1)]
  if (label) {
    for (const boxes of pages) {
      inColumn(boxes).forEach((column, at) => {
        if (at === 0 || typeof names[at] === 'string') return
        const line = rowsOf(column)
          .map((row) => label.exec(normalise(row.map((box) => box.text).join(' '))))
          .find((found) => found !== null)
        if (line) names[at] = line[0]
      })
    }
  }
  return pages.map((boxes) => {
    if (!boxes.some((box) => mark.test(box.text) && starts.some((start) => Math.abs(box.xMin - start) < SAME_X))) return null
    return inColumn(boxes)
      .map((column, at) => ({ column: names[at]!, blocks: blocksOf(column, at === 0 ? null : starts[at - 1]!, at === 0 ? null : texts[at - 1]!, mark) }))
      .filter((column) => column.blocks.length > 0)
  })
}

// The same as text only: each column from top to bottom, its lines one per line.
export function markedColumns(pages: readonly (readonly Box[])[], mark: RegExp): (string[] | null)[] {
  return markedLayout(pages, mark).map((page) => page?.map((column) => column.blocks.join('\n')) ?? null)
}

// A page read in a way of the source's own: its columns, what each is called, and whether its blocks are known.
export interface OwnPage {
  columns: string[]
  names: (string | number | null)[]
  firm: boolean
}

// The pages of a file read by its marks, as they are searched. The blocks of
// a page are taken for its statements, a blank line between them, only where
// every column of statements stands under its label: a file that sets its
// marks otherwise (a list of terms, a table) is read as lines.
export function pagesByMarks(layer: readonly (readonly Box[])[], mark: RegExp, label: RegExp): (OwnPage | null)[] {
  return markedLayout(layer, mark, label).map((page) => {
    if (!page) return null
    const firm = page.every((column) => column.column === 0 || typeof column.column === 'string')
    return { columns: page.map((column) => column.blocks.join(firm ? BLOCK_GAP : '\n')), names: page.map((column) => column.column), firm }
  })
}

// A source read by word position: its headed tables by their headers, its
// columns of marked statements by their marks, and every other page as
// rendition.ts reads it.
function byWordPosition(plan: SourcePlan, special: (layer: readonly (readonly Box[])[]) => (OwnPage | null)[], store: string, education: string): ReadPages {
  const bounds = plan.extraction.kind === 'pdf' && plan.extraction.mode === 'bbox' ? plan.extraction.bounds : undefined
  const file = storedFile(education, store, plan.source)
  const layer = parseBbox(system('pdftotext', ['-bbox', file, '-']).toString('utf8'))
  const read = special(layer)
  const columns = layer.map((boxes, page) => read[page]?.columns ?? inColumns(boxes, bounds))
  return { pages: columns.map((page) => page.join(COLUMN_BREAK)), columns, columnNames: layer.map((_, page) => read[page]?.names ?? []), firm: layer.map((_, page) => read[page]?.firm === true) }
}

// How the pages of a source are read when it has a way of its own, or undefined.
function ownColumns(source: string): ((layer: readonly (readonly Box[])[]) => (OwnPage | null)[]) | undefined {
  const label = HEADED_TABLES[source]
  if (label) {
    return (layer) =>
      layer.map((boxes) => {
        const parts = tableLayout(boxes, label)
        return parts && { columns: parts.map((part) => part.text), names: parts.map((part) => part.name ?? null), firm: false }
      })
  }
  const marked = MARKED_COLUMNS.find((each) => each.sources.test(source))
  return marked ? (layer) => pagesByMarks(layer, marked.mark, marked.label) : undefined
}

// --- the open-data nodes of a part --------------------------------------------------
//
// A Dutch part read from the law may be checked against the curriculum
// institute's open data. Its check rendition is then not the clone's files as
// they lie (those also hold other levels, other school types and a file of
// deprecated objects) but the nodes the manifest names for the part
// (`LanePart.dataNodes`): the record objects its walk reaches at its level,
// or, where the structure is in one repository and the text in another, the
// goals those objects list. Each node is one page, named by its id, in the
// order of the walk. This follows `nodesOf` of import-netherlands.ts.

type Json = Record<string, unknown>

const idsIn = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : [])

// A part whose check rendition is the open data of its nodes.
type DataPart = LanePart & { dataNodes: DataNodes }
const isData = (part: LanePart): part is DataPart => part.dataNodes !== undefined && part.checkRendition === part.dataNodes.source
// The source that holds the text of a part's nodes: another repository when they are joined from one.
const textSource = (nodes: DataNodes): string => nodes.selection.join?.source ?? nodes.source

// One object of the walk, with the objects above it and those it lists one step down.
interface Visit {
  entity: string
  object: Json
  above: Visit[]
  below: Visit[]
}

function dataRendition(nodes: DataNodes, raw: (source: string) => SourcePages, read = new Map<string, Json[]>(), indexed = new Map<string, Map<string, Json>>()): Rendition {
  const { walk, join, level, groupBy, recordEntities, wordingField } = nodes.selection
  const objects = (source: string, file: string): Json[] => {
    const key = `${source} ${file}`
    if (!read.has(key)) {
      const pages = raw(source)
      const page = pages.files?.indexOf(file) ?? -1
      if (page < 1) throw new Error(`${file} is not among the data files of ${source}`)
      read.set(key, JSON.parse(pages.pages[page]!) as Json[])
    }
    return read.get(key)!
  }
  const byId = (source: string, file: string): Map<string, Json> => {
    const key = `${source} ${file}`
    let held = indexed.get(key)
    if (!held) {
      held = new Map(objects(source, file).map((object) => [String(object.id), object]))
      indexed.set(key, held)
    }
    return held
  }
  const titles = level ? new Map(objects(level.source, 'niveaus.json').map((each) => [String(each.id), String(each.title)])) : new Map<string, string>()
  const levelsOf = (object: Json): string[] => idsIn(object[level!.field]).map((id) => titles.get(id) ?? id)

  const visits: Visit[] = []
  const keeps = (step: (typeof walk)[number], object: Json): boolean => Object.entries(step.where ?? {}).every(([name, values]) => values.includes(String(object[name] ?? '')))
  const descend = (object: Json, index: number, above: Visit[]): Visit => {
    const visit: Visit = { entity: walk[index]!.entity, object, above, below: [] }
    visits.push(visit)
    const next = walk[index + 1]
    if (next?.via !== undefined) {
      const below = byId(nodes.source, next.file)
      for (const id of idsIn(object[next.via])) {
        const child = below.get(id)
        if (child && keeps(next, child)) visit.below.push(descend(child, index + 1, [...above, visit]))
      }
    }
    return visit
  }
  for (const object of objects(nodes.source, walk[0]!.file)) if (keeps(walk[0]!, object)) descend(object, 0, [])

  const texts = new Map<string, string>()
  const take = (id: string, text: unknown): void => {
    if (typeof text === 'string' && !texts.has(id)) texts.set(id, markupText(text))
  }
  for (const visit of visits) {
    if (join) {
      // The records are goal-at-level objects of another repository, listed by any object of the walk.
      for (const id of idsIn(visit.object[join.via])) {
        const listed = byId(join.source, join.file).get(id)
        if (!listed || (level && !(levelsOf(listed).length > 0 && levelsOf(listed).every((title) => level.titles.includes(title))))) continue
        const goal = idsIn(listed[join.wording.via])[0]
        if (goal !== undefined) take(goal, byId(join.source, join.wording.file).get(goal)?.[join.wording.field])
      }
    } else if (recordEntities.includes(visit.entity)) {
      if (level) {
        // The objects under the record's group carry the level: the group is in when each lists exactly these levels.
        const group = [...visit.above, visit].find((each) => each.entity === groupBy.entity)
        const carriers = (each: Visit): Visit[] => [...(each.entity === level.entity ? [each] : []), ...each.below.flatMap(carriers)]
        const under = group ? carriers(group) : []
        const wanted = [...level.titles].sort().join('\n')
        if (under.length === 0 || !under.every((each) => levelsOf(each.object).sort().join('\n') === wanted)) continue
      }
      take(String(visit.object.id), visit.object[wordingField!])
    }
  }
  return { pages: [[], ...[...texts.values()].map((text) => [stretchOf(text, 0)])], text: ['', ...[...texts.values()].map(normalise)], files: ['', ...texts.keys()], whole: true }
}

// Reads a source as it is searched. Each source is read once; one that cannot
// be read is null, and `failed` keeps why. `nodes` is the check rendition of
// a part that is checked against its open-data nodes.
interface Reader {
  read: (source: string) => Rendition | null
  nodes: (part: DataPart) => Rendition | null
  failed: Map<string, string>
}

function reader(options: MatchOptions): Reader {
  const education = options.education ?? resolve(import.meta.dirname, '..')
  const plans = options.plans ?? SOURCE_PLANS
  const raws = new Map<string, ReadPages>()
  const held = new Map<string, Rendition | null>()
  const parts = new Map<LanePart, Rendition | null>()
  const failed = new Map<string, string>()
  const parsedFiles = new Map<string, Json[]>()
  const indexedFiles = new Map<string, Map<string, Json>>()
  const raw = (source: string): ReadPages => {
    if (!raws.has(source)) {
      let pages: ReadPages
      if (options.pages) pages = options.pages(source)
      else {
        const plan = planFor(source, plans)
        const store = requireStore(options.store)
        const own = plan.extraction.kind === 'pdf' && plan.extraction.mode === 'bbox' ? ownColumns(source) : undefined
        pages = own ? byWordPosition(plan, own, store, education) : readSource(plan, store, { education })
      }
      raws.set(source, pages)
    }
    return raws.get(source)!
  }
  const reading = <Key>(cache: Map<Key, Rendition | null>, key: Key, source: string, build: () => Rendition): Rendition | null => {
    if (!cache.has(key)) {
      try {
        cache.set(key, build())
      } catch (error) {
        cache.set(key, null)
        failed.set(source, error instanceof Error ? error.message : String(error))
      }
    }
    return cache.get(key)!
  }
  return {
    read: (source) => reading(held, source, source, () => renditionOf(raw(source), plans.find((each) => each.source === source))),
    nodes: (part) => reading(parts, part, textSource(part.dataNodes), () => dataRendition(part.dataNodes, raw, parsedFiles, indexedFiles)),
    failed,
  }
}

// --- finding words in a rendition --------------------------------------------------

// A run of a record's wording that is looked for as one: the whole of it, a
// span, a line, a stem.
interface Unit {
  // The record's wording, and where in it the run stands.
  whole: string
  from: number
  to: number
  words: string[]
  // How many words of the wording stand before it.
  base: number
  // Its words that open a line of it after the first. Built when first asked.
  lines?: Set<number>
  // Its text as it is compared, and where each word stands in that. Built when first asked.
  row?: string
  spans?: number[]
}

function unitOf(whole: string, from: number, to: number): Unit {
  return { whole, from, to, words: words(whole.slice(from, to)), base: words(whole.slice(0, from)).length }
}

const textOfUnit = (unit: Unit): string => unit.whole.slice(unit.from, unit.to)

function linesOf(unit: Unit): Set<number> {
  if (!unit.lines) {
    unit.lines = new Set()
    let before = 0
    for (const line of textOfUnit(unit).split('\n')) {
      const held = words(line).length
      if (held > 0 && before > 0) unit.lines.add(before)
      before += held
    }
  }
  return unit.lines
}

interface Found {
  page: number
  // Offsets into the words of the page: the first word, and the one after the last.
  start: number
  end: number
  tolerant: boolean
  // It runs over the border of a printed block at a place where the wording has no line break.
  crosses: boolean
  // What was read here, how many of its words were read before this part, and the stretch it stands in.
  unit: Unit
  skip: number
  stretch: Stretch
}

// One word, or two, of the wording read as one word, or two, of a stretch.
interface Step {
  // The first word of the needle and of the stretch that it reads.
  needle: number
  hay: number
  how: 'same' | 'raised' | 'joined' | 'split' | 'ligature'
}

// As much of the needle as stands at `start` of a stretch, the tolerated
// artefacts let through: how many of its words were read, the word of the
// stretch after them, and whether an artefact was needed. `steps` is given
// every word as it is read.
function alignSome(stretch: Stretch, start: number, needle: readonly string[], steps?: Step[]): { read: number; end: number; tolerant: boolean } {
  const hay = stretch.words
  let at = start
  let read = 0
  let used = false
  while (read < needle.length) {
    const word = hay[at]
    if (word === undefined) break
    let how: Step['how']
    if (word === needle[read]) how = 'same'
    // The same word, its digits raised or lowered in one rendition and plain in the other.
    else if (fold(word) === fold(needle[read]!)) how = 'raised'
    // Two words of the wording joined: the line broke at their hyphen and the rendition dropped it.
    else if (read + 1 < needle.length && word === needle[read]! + needle[read + 1]!) how = 'joined'
    // One word of the wording split: the line broke inside it and the rendition kept the hyphen.
    else if (stretch.breaks.has(at) && hay[at + 1] !== undefined && word + hay[at + 1]! === needle[read]) how = 'split'
    // One word of the wording split after a ligature.
    else if (LIGATURE.test(word) && hay[at + 1] !== undefined && word + hay[at + 1]! === needle[read]) how = 'ligature'
    else break
    steps?.push({ needle: read, hay: at, how })
    at += how === 'split' || how === 'ligature' ? 2 : 1
    read += how === 'joined' ? 2 : 1
    if (how !== 'same') used = true
  }
  return { read, end: at, tolerant: used }
}

// The needle read from `start` of a stretch, or null when it does not stand there whole.
function align(stretch: Stretch, start: number, needle: readonly string[]): { end: number; tolerant: boolean } | null {
  const some = alignSome(stretch, start, needle)
  return some.read === needle.length ? some : null
}

// Where in a stretch the needle may start.
function starts(stretch: Stretch, needle: readonly string[]): number[] {
  if (!stretch.index || !stretch.folded || !stretch.ligatures) {
    stretch.index = new Map()
    stretch.folded = new Map()
    stretch.ligatures = []
    stretch.words.forEach((word, at) => {
      const held = stretch.index!.get(word)
      if (held) held.push(at)
      else stretch.index!.set(word, [at])
      if (LIGATURE.test(word)) stretch.ligatures!.push(at)
      const plain = fold(word)
      if (plain !== word) stretch.folded!.set(plain, [...(stretch.folded!.get(plain) ?? []), at])
    })
  }
  const first = needle[0]
  if (first === undefined) return []
  const exact = stretch.index.get(first) ?? []
  const joined = needle[1] === undefined ? [] : (stretch.index.get(first + needle[1]) ?? [])
  const broken = [...stretch.breaks, ...stretch.ligatures].filter((at) => first.startsWith(stretch.words[at]!))
  const plain = fold(first) === first ? (stretch.folded.get(first) ?? []) : [...(stretch.index.get(fold(first)) ?? []), ...(stretch.folded.get(fold(first)) ?? [])]
  if (joined.length === 0 && broken.length === 0 && plain.length === 0) return exact
  return [...new Set([...exact, ...joined, ...broken, ...plain])].sort((a, b) => a - b)
}

// The first printed block of a stretch that starts after `at`, as its place in `blocks`.
function blockAfter(stretch: Stretch, at: number): number {
  let low = 0
  let high = stretch.blocks.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (stretch.blocks[middle]! > at) high = middle
    else low = middle + 1
  }
  return low
}

// True when what was read of a unit from `start` of a stretch up to `end`
// runs over the border of a printed block at a place where the unit has no
// line break of its own: it starts in one block and ends in another.
function crossesBlock(stretch: Stretch, start: number, end: number, unit: Unit, skip: number): boolean {
  const first = blockAfter(stretch, start)
  if (first === stretch.blocks.length || stretch.blocks[first]! >= end) return false
  const steps: Step[] = []
  alignSome(stretch, start, skip === 0 ? unit.words : unit.words.slice(skip), steps)
  const read = new Map(steps.map((step) => [step.hay, skip + step.needle]))
  const opens = linesOf(unit)
  for (let block = first; block < stretch.blocks.length && stretch.blocks[block]! < end; block += 1) {
    const word = read.get(stretch.blocks[block]!)
    if (word === undefined || !opens.has(word)) return true
  }
  return false
}

// True when a printed block, or the stretch, ends before the word at `end`.
function endsBlock(stretch: Stretch, end: number): boolean {
  return end === stretch.words.length || stretch.blocks[blockAfter(stretch, end - 1)] === end
}

// Every place the unit stands on these pages, in reading order, each once: a
// place in a column is not given again for the columns joined. Where the
// blocks of a page are known, a place that runs from one into the next is none.
function* occurrences(rendition: Rendition, unit: Unit, pages: readonly number[]): Generator<Found> {
  for (const page of pages) {
    const seen = new Set<number>()
    for (const stretch of rendition.pages[page] ?? []) {
      for (const start of starts(stretch, unit.words)) {
        if (seen.has(stretch.offset + start)) continue
        const aligned = align(stretch, start, unit.words)
        if (!aligned) continue
        const crosses = crossesBlock(stretch, start, aligned.end, unit, 0)
        if (crosses && stretch.firm) continue
        seen.add(stretch.offset + start)
        yield { page, start: stretch.offset + start, end: stretch.offset + aligned.end, tolerant: aligned.tolerant, crosses, unit, skip: 0, stretch }
      }
    }
  }
}

// The first place the unit stands after what was found before it: further on the same page, or on the following one.
function following(rendition: Rendition, unit: Unit, before: Found): Found | null {
  let best: Found | null = null
  for (const found of occurrences(rendition, unit, [before.page])) if (found.start >= before.end && (!best || found.start < best.start)) best = found
  if (best) return best
  for (const found of occurrences(rendition, unit, [before.page + 1])) if (!best || found.start < best.start) best = found
  return best
}

// Units found one after the other, for every place on these pages the first of them stands.
function* chains(rendition: Rendition, units: readonly Unit[], pages: readonly number[]): Generator<Found[]> {
  for (const first of occurrences(rendition, units[0]!, pages)) {
    const found = [first]
    for (const unit of units.slice(1)) {
      const next = following(rendition, unit, found.at(-1)!)
      if (!next) break
      found.push(next)
    }
    if (found.length === units.length) yield found
  }
}

// The most words a page may hold after a statement that runs on overleaf: its footer.
const FOOT = 12

// A statement that runs to the foot of a page, or of a column of it, and goes
// on at the top of the following page or of a column of that: its two parts.
// Where the blocks of a page are known, the first part is the end of a block
// and neither part runs from one block into the next.
function* overleaf(rendition: Rendition, unit: Unit, pages: readonly number[]): Generator<Found[]> {
  // The pages of open data are statements, not paper: see `tiled`.
  if (rendition.whole) return
  for (const page of pages) {
    const seen = new Set<number>()
    for (const stretch of rendition.pages[page] ?? []) {
      for (const start of starts(stretch, unit.words)) {
        if (seen.has(stretch.offset + start)) continue
        const first = alignSome(stretch, start, unit.words)
        if (first.read < FEWEST || first.read === unit.words.length || stretch.words.length - first.end > FOOT) continue
        const crosses = crossesBlock(stretch, start, first.end, unit, 0)
        if (stretch.firm && (crosses || !endsBlock(stretch, first.end))) continue
        for (const next of rendition.pages[page + 1] ?? []) {
          const rest = align(next, 0, unit.words.slice(first.read))
          if (!rest) continue
          const further = crossesBlock(next, 0, rest.end, unit, first.read)
          if (further && next.firm) continue
          seen.add(stretch.offset + start)
          yield [
            { page, start: stretch.offset + start, end: stretch.offset + first.end, tolerant: first.tolerant, crosses, unit, skip: 0, stretch },
            { page: page + 1, start: next.offset, end: next.offset + rest.end, tolerant: rest.tolerant, crosses: further, unit, skip: first.read, stretch: next },
          ]
          break
        }
      }
    }
  }
}

// --- one wording -------------------------------------------------------------------

// A label, a colon and then text: how a record sets a span of its wording.
const LABELLED = /^[^\n:]{1,80}:\s+(?=\S)/
// The fewest words a stem, or the text after it, may have.
const FEWEST = 3

// The ways a wording is found, the better first: as one statement of the
// data, in a row, as labelled spans each in a row, as lines, as a stem and
// its part, over a page, as several statements of the data.
const WAYS = ['node', 'row', 'spans', 'lines', 'stem', 'overleaf', 'tiled'] as const
type Way = (typeof WAYS)[number]

interface WordingMatch {
  // Where each part was found: one for a wording that stands in a row.
  found: Found[]
  granularity: boolean
  way: Way
  // How many of the parts were found one after the other, from the first: all
  // of them, but for labelled spans, where the other spans stand anywhere.
  chain?: number
}

// Every way and place a span stands with its first part on these pages. Without `rows`, only as parts.
function* spanMatches(rendition: Rendition, span: Unit, subPart: boolean, pages: readonly number[], rows = true): Generator<WordingMatch> {
  if (rows) for (const found of occurrences(rendition, span, pages)) yield { found: [found], granularity: false, way: 'row' }
  const lines: Unit[] = []
  let from = span.from
  for (const line of textOfUnit(span).split('\n')) {
    const unit = unitOf(span.whole, from, from + line.length)
    if (unit.words.length > 0) lines.push(unit)
    from += line.length + 1
  }
  if (lines.length > 1) for (const found of chains(rendition, lines, pages)) yield { found, granularity: true, way: 'lines' }
  // A sub-part row repeats its parent's stem; the rendition prints the stem once, above its sub-parts.
  for (const split of subPart ? textOfUnit(span).matchAll(/[.:]\s+/g) : []) {
    const stem = unitOf(span.whole, span.from, span.from + split.index + 1)
    const rest = unitOf(span.whole, span.from + split.index + split[0].length, span.to)
    if (stem.words.length < FEWEST || rest.words.length < FEWEST) continue
    for (const found of chains(rendition, [stem, rest], pages)) yield { found, granularity: true, way: 'stem' }
  }
  for (const found of overleaf(rendition, span, pages)) yield { found, granularity: false, way: 'overleaf' }
}

const tolerated = (match: WordingMatch): number => (match.found.some((each) => each.tolerant) ? 1 : 0)
const inOrder = (a: WordingMatch, b: WordingMatch): number => a.found[0]!.page - b.found[0]!.page || a.found[0]!.start - b.found[0]!.start
// Which of two printings is preferred: the one found the better way, then the
// one that needed no tolerance (an artefact let through may be another text:
// a heading that reads as the statement's first words joined), then the first.
const better = (a: WordingMatch, b: WordingMatch): number => WAYS.indexOf(a.way) - WAYS.indexOf(b.way) || tolerated(a) - tolerated(b) || inOrder(a, b)

// The spans of a wording that sets them apart by blank lines, each a label, a colon and text: the text of each. Otherwise the wording.
function spansOfWording(wording: string): Unit[] {
  const blocks: Unit[] = []
  let labelled = true
  let from = 0
  for (const block of wording.split(/(\n[ \t]*\n)/)) {
    const text = block.trim()
    if (text !== '') {
      const label = LABELLED.exec(text)
      if (!label) labelled = false
      const start = from + block.indexOf(text)
      blocks.push(unitOf(wording, start + (label?.[0].length ?? 0), start + text.length))
    }
    from += block.length
  }
  return blocks.length > 1 && labelled ? blocks : [unitOf(wording, 0, wording.length)]
}

// Every way and place a wording stands in a rendition with its first part on
// these pages. `subPart` is true for a record that carries a `parent_code`.
// The same place may be given more than once, found in more than one way.
function* wordingMatches(rendition: Rendition, wording: string, subPart: boolean, pages: readonly number[]): Generator<WordingMatch> {
  const whole = unitOf(wording, 0, wording.length)
  for (const found of occurrences(rendition, whole, pages)) {
    // A statement of the data that is the wording, no more and no less. Inside a longer one: the data cuts the text into other pieces.
    const all = rendition.whole === true && found.start === 0 && found.end === found.stretch.words.length
    yield { found: [found], granularity: rendition.whole === true && !all, way: all ? 'node' : 'row' }
  }
  const spans = spansOfWording(wording)
  if (spans.length === 1) yield* spanMatches(rendition, whole, subPart, pages, false)
  else {
    // Every span's text has to be found: the first here, the others anywhere, each where it is found best.
    const everywhere = rendition.pages.map((_, page) => page)
    const others = spans.slice(1).map((span) => [...spanMatches(rendition, span, subPart, everywhere)].sort(better)[0])
    if (others.every((match) => match !== undefined)) {
      for (const first of spanMatches(rendition, spans[0]!, subPart, pages)) {
        yield { found: [...first.found, ...others.flatMap((match) => match.found)], granularity: first.granularity || others.some((match) => match.granularity), way: first.way === 'row' ? 'spans' : first.way, chain: first.found.length }
      }
    }
  }
  if (rendition.whole) {
    const pieces = tiled(rendition, whole, pages.length === 1 ? pages[0] : undefined)
    if (pieces && pages.includes(pieces[0]!.page)) yield { found: pieces, granularity: true, way: 'tiled' }
  }
}

// A wording that is two or more whole statements of the data, one after the
// other: the data cuts it into those pieces. At each point the longest
// statement that stands there is taken; the first is the one of `first`
// when that is given.
function tiled(rendition: Rendition, unit: Unit, first?: number): Found[] | null {
  const needle = unit.words
  const found: Found[] = []
  let read = 0
  while (read < needle.length) {
    let best: Found | undefined
    for (const [page, [stretch]] of rendition.pages.entries()) {
      const length = stretch?.words.length ?? 0
      if (length === 0 || length <= (best?.end ?? 0) || (found.length === 0 && first !== undefined && page !== first)) continue
      if (stretch!.words.every((word, index) => word === needle[read + index])) best = { page, start: 0, end: length, tolerant: false, crosses: false, unit, skip: read, stretch: stretch! }
    }
    if (!best) return null
    found.push(best)
    read += best.end
  }
  return found.length > 1 ? found : null
}

const samePlace = (a: Found, b: Found): boolean => a.page === b.page && a.start === b.start

// The printings of a wording in a rendition, the preferred first: each place
// once, found the best way it can be found there. One found as parts one
// after the other is left out when a part after its first lies inside a
// printing found a better way (it borrows that one's text), or when it ends
// where a preferred one ends (another start for the same end).
function printings(rendition: Rendition, wording: string, subPart: boolean): WordingMatch[] {
  const everywhere = rendition.pages.map((_, page) => page)
  const kept: WordingMatch[] = []
  const chainOf = (match: WordingMatch): Found[] => match.found.slice(0, match.chain ?? match.found.length)
  for (const match of [...wordingMatches(rendition, wording, subPart, everywhere)].sort(better)) {
    const [first, ...rest] = chainOf(match) as [Found, ...Found[]]
    if (kept.some((held) => samePlace(held.found[0]!, first))) continue
    const borrows = rest.some((part) => kept.some((held) => held.way !== match.way && chainOf(held).some((each) => each.page === part.page && each.start <= part.start && part.start < each.end)))
    const endsAlike = rest.length > 0 && kept.some((held) => chainOf(held).length > 1 && samePlace(chainOf(held).at(-1)!, rest.at(-1)!))
    if (!borrows && !endsAlike) kept.push(match)
  }
  return kept
}

// True when a wording stands in a rendition with its first part on this page, at this offset when one is stated.
function standsAt(rendition: Rendition, wording: string, subPart: boolean, page: number, offset?: number): boolean {
  for (const match of wordingMatches(rendition, wording, subPart, [page])) if (offset === undefined || match.found[0]!.start === offset) return true
  return false
}

function placeOf(rendition: Rendition, found: Pick<Found, 'page'> & Partial<Pick<Found, 'start'>>): Place {
  return { ...(rendition.files ? { node: rendition.files[found.page]! } : { page: found.page }), ...(found.start === undefined ? {} : { offset: found.start }) }
}

// The column a part starts in: its own stretch's, or for the columns of a page joined, the one that holds its first word.
function columnOf(found: Found): string | number | undefined {
  if (!found.stretch.columns) return found.stretch.column
  let column: string | number | undefined
  for (const each of found.stretch.columns) if (each.words.length > 0 && each.offset <= found.start) column = each.column
  return column
}

// --- differences of form -----------------------------------------------------------

// The marks between the word at `word` and the one after it, without the spaces.
const marksAfter = (row: string, spans: readonly number[], word: number): string => row.slice(spans[2 * word + 1], spans[2 * word + 2]).replace(/\s+/g, '')

const kindOf = (marks: string): FormDifference['kind'] => (marks === '-' ? 'hyphen' : marks === ',' ? 'comma' : 'punctuation')

// What differs in form where a part of a wording was found: the marks
// between the same two words, and what the tolerance let through (a break
// after a ligature aside: that is the text layer's, not the page's). With
// `forms`, each holds the two forms as well.
function differencesAt(rendition: Rendition, found: Found, forms: boolean): FormDifference[] {
  const { stretch, unit, skip, page } = found
  const steps: Step[] = []
  alignSome(stretch, found.start - stretch.offset, skip === 0 ? unit.words : unit.words.slice(skip), steps)
  unit.row ??= normalise(textOfUnit(unit))
  unit.spans ??= spansOf(unit.row)
  stretch.spans ??= spansOf(stretch.row)
  const [row, spans] = [unit.row, unit.spans]
  const [printed, places] = [stretch.row, stretch.spans]
  // What stands from one word up to and with another, in the wording and in the rendition.
  const both = (word: number, upTo: number, hay: number, hayUpTo: number): Pick<FormDifference, 'wording' | 'rendition'> =>
    forms ? { wording: row.slice(spans[2 * word], spans[2 * upTo + 1]), rendition: printed.slice(places[2 * hay], places[2 * hayUpTo + 1]) } : {}
  const at = (word: number, hay: number): Pick<FormDifference, 'word' | 'place'> => ({ word: unit.base + word + 1, place: placeOf(rendition, { page, start: stretch.offset + hay }) })
  const differences: FormDifference[] = []
  steps.forEach((step, index) => {
    const word = skip + step.needle
    if (step.how === 'joined') differences.push({ kind: 'joined', only_in: 'rendition', ...at(word, step.hay), ...both(word, word + 1, step.hay, step.hay) })
    if (step.how === 'split') differences.push({ kind: 'split', only_in: 'rendition', ...at(word, step.hay), ...both(word, word, step.hay, step.hay + 1) })
    if (step.how === 'raised') differences.push({ kind: 'raised-digit', ...at(word, step.hay), ...both(word, word, step.hay, step.hay) })
    const next = steps[index + 1]
    if (!next) return
    // The last word this step read, and the marks after it on either side.
    const [last, lastHay] = [skip + next.needle - 1, next.hay - 1]
    const theirs = [...marksAfter(printed, places, lastHay)]
    let mine = ''
    for (const mark of marksAfter(row, spans, last)) {
      const held = theirs.indexOf(mark)
      if (held === -1) mine += mark
      else theirs.splice(held, 1)
    }
    if (mine === '' && theirs.length === 0) return
    // Marks only one of the two has; or each has marks the other lacks.
    const marks = mine === '' ? theirs.join('') : mine
    const kind = mine !== '' && theirs.length > 0 ? 'punctuation' : kindOf(marks)
    const what: Pick<FormDifference, 'only_in' | 'mark' | 'marks'> =
      mine !== '' && theirs.length > 0 ? { marks: { wording: mine, rendition: theirs.join('') } } : { only_in: mine === '' ? 'rendition' : 'wording', ...(kind === 'punctuation' ? { mark: marks } : {}) }
    differences.push({ kind, ...what, ...at(last, lastHay), ...both(last, last + 1, lastHay, lastHay + 1) })
  })
  return differences
}

// A printing as it is reported: its place, and how it was found.
function occurrenceOf(rendition: Rendition, match: WordingMatch, forms: boolean): Occurrence {
  const places = match.found.map((each) => placeOf(rendition, each))
  const column = columnOf(match.found[0]!)
  const differences = match.found.flatMap((each) => differencesAt(rendition, each, forms))
  return {
    place: places[0]!,
    ...(column === undefined ? {} : { column }),
    ...(places.length > 1 ? { parts: places } : {}),
    ...(match.found.some((each) => each.tolerant) ? { tolerant: true as const } : {}),
    ...(match.granularity ? { granularity_differs: true as const } : {}),
    ...(match.found.some((each) => each.crosses) ? { crosses_break: true as const } : {}),
    ...(differences.length > 0 ? { form_differences: differences } : {}),
  }
}

// --- the reverse pass ----------------------------------------------------------------

// A run of a code: capitals, small letters, digits, or what stands between them.
const RUN = /\p{Lu}+|\p{Ll}+|\p{N}+|\p{L}+|[^\p{L}\p{N}]+/gu
const NOT_INSIDE = { before: '(?<![\\p{L}\\p{N}])(?<![\\p{L}\\p{N}][-.])', after: '(?![\\p{L}\\p{N}])(?![-.][\\p{L}\\p{N}])' }

function classOf(run: string): string | null {
  if (/^\p{Lu}+$/u.test(run)) return '\\p{Lu}+'
  if (/^\p{Ll}+$/u.test(run)) return '\\p{Ll}+'
  if (/^\p{N}+$/u.test(run)) return '\\d+'
  return /^\p{L}+$/u.test(run) ? '\\p{L}+' : null
}

const literal = (text: string): string => (/^\s+$/.test(text) ? '\\s+' : text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

// True for a code that can be told from other text by its look alone: one
// word of three or more runs, with a letter and a digit among them (K.CC.4,
// 4-ESS1-1, 1.1.N). A bare number (1.1), a number with a letter set beside it
// (18 B) and a path of headings are not.
function tellsWhose(code: string): boolean {
  const runs = (normalise(code).match(RUN) ?? []).filter((run) => classOf(run) !== null)
  return !/\s/.test(code.trim()) && runs.length >= 3 && /\p{L}/u.test(code) && /\p{N}/u.test(code)
}

interface Shape {
  // What a code of this shape looks like in text.
  pattern: string
  // The same without the run every code starts with, and that run with what follows it.
  reduced?: { pattern: string; prefix: string }
}

// The shapes of a set of codes. Codes with the same kinds of runs in the same
// order are one shape; a run that is the same in all of them is kept as it
// is (the grade), and one that varies stands for any run of its kind. A code
// may be followed by the letter of a sub-part.
function shapesOf(codes: readonly string[]): Shape[] {
  const families = new Map<string, string[][]>()
  for (const code of codes) {
    const runs = normalise(code).match(RUN) ?? []
    const family = runs.map((run) => classOf(run) ?? run).join('')
    families.set(family, [...(families.get(family) ?? []), runs])
  }
  return [...families.values()].map((family) => {
    const pieces = family[0]!.map((run, at) => {
      const kind = classOf(run)
      return kind === null || family.every((runs) => runs[at] === run) ? literal(run) : kind
    })
    const subPart = classOf(family[0]!.at(-1)!) === '\\p{Ll}+' ? '' : '(?:\\.?\\p{Ll})?'
    const shape: Shape = { pattern: pieces.join('') + subPart }
    const [first, separator] = family[0]!
    const constant = first !== undefined && classOf(first) !== null && family.every((runs) => runs[0] === first)
    if (constant && separator !== undefined && classOf(separator) === null && pieces.length >= 5) shape.reduced = { pattern: pieces.slice(2).join('') + subPart, prefix: first + separator }
    return shape
  })
}

interface Seen {
  // The code as printed, with the part put back that the rendition leaves out.
  code: string
  key: string
  page: number
}

// Every code of these patterns in the pages, once each, in reading order.
function scan(rendition: Rendition, patterns: readonly { pattern: string; prefix: string }[], pages: readonly number[]): Seen[] {
  const seen = new Map<string, Seen>()
  const prefixes = [...new Set(patterns.map((each) => each.prefix))]
  for (const page of pages) {
    const found: { code: string; at: number }[] = []
    for (const prefix of prefixes) {
      const alternatives = patterns.filter((each) => each.prefix === prefix).map((each) => each.pattern)
      const pattern = new RegExp(`${NOT_INSIDE.before}(?:${alternatives.join('|')})${NOT_INSIDE.after}`, 'gu')
      for (const match of (rendition.text[page] ?? '').matchAll(pattern)) found.push({ code: prefix + match[0], at: match.index })
    }
    for (const { code } of found.sort((a, b) => a.at - b.at)) {
      const key = normaliseCode(code)
      if (!seen.has(key)) seen.set(key, { code, key, page })
    }
  }
  return [...seen.values()]
}

// A record as it is matched: its fields, its wording, its part and what was found.
interface Checked {
  record: LaneRecord
  wording: string
  part: LanePart
  // Every printing of the wording in the part's check rendition, the preferred first.
  printings: WordingMatch[]
  // Where each part of the wording was found at the printing that is its place, or null when it was not found.
  found: Found[] | null
  granularity: boolean
}

const PARENT = 'parent of sub-part records; the source has no row for it'
const INSIDE = "sub-part inside its parent's record"

function reverseOf(part: LanePart, lane: Lane, all: readonly Checked[], rendition: Rendition | null, slug: string): Reverse {
  const none = (why: string): Reverse => ({ part: part.name, rendition: slug, applies: false, why_not: why, explained: [], unexplained: [] })
  if (part.checkRendition === SAME_FILE) return none('the check rendition is the same file the records were read from, so it holds no statement they were not read past')
  const mine = all.filter((each) => each.part === part)
  const printed = mine.map((each) => each.record.frontmatter.code).filter((code) => code !== '')
  if (printed.length === 0) return none('the records of this part carry no printed code')
  if (!rendition) return none('the check rendition could not be read')
  const codes = printed.filter(tellsWhose)
  if (codes.length === 0) return none('the codes are bare numbers or labels, which the rendition prints for other things too: such a code alone does not say whose it is')

  const shapes = shapesOf([...codes, ...lane.skipped.map((skipped) => skipped.code).filter(tellsWhose)])
  const keys = new Set(codes.map((code) => normaliseCode(normalise(code))))
  const printedOf = (seen: readonly Seen[]): number => seen.filter((each) => keys.has(each.key)).length
  let seen = scan(
    rendition,
    shapes.map((shape) => ({ pattern: shape.pattern, prefix: '' })),
    rendition.pages.map((_, page) => page),
  )
  if (printedOf(seen) === 0) {
    // The rendition may print each code without the run they all start with
    // (the grade, under a page header that names it). Such a code is not the
    // part's alone, so only the pages most of its records were found on count.
    const reduced = scan(
      rendition,
      shapes.flatMap((shape) => (shape.reduced ? [shape.reduced] : [])),
      homePages(mine),
    )
    if (printedOf(reduced) * 2 >= codes.length) seen = reduced
  }
  if (seen.length === 0) return none(`the rendition prints none of the part's ${codes.length} codes in full, so a statement it holds that no record carries cannot be found by its code`)

  const carried = new Map(all.map((each) => [normaliseCode(normalise(each.record.frontmatter.code)), each]))
  const skipped = new Set(lane.skipped.map((each) => normaliseCode(normalise(each.code))))
  const parents = new Set(all.flatMap((each) => (each.record.frontmatter.parent_code === undefined ? [] : [normaliseCode(normalise(each.record.frontmatter.parent_code))])))
  const reverse: Reverse = { part: part.name, rendition: slug, applies: true, printed: printedOf(seen), of: codes.length, explained: [], unexplained: [] }
  for (const { code, key, page } of seen) {
    if (carried.has(key) || skipped.has(key)) continue
    const entry: ReverseEntry = { code, place: placeOf(rendition, { page }) }
    const lettered = /^(.+)\.(\p{Ll})$/u.exec(key)
    const holder = lettered ? carried.get(lettered[1]!) : undefined
    if (parents.has(key)) reverse.explained.push({ ...entry, explained: PARENT })
    else if (holder && new RegExp(`^\\s*${lettered![2]}[.)]\\s`, 'mu').test(holder.wording)) reverse.explained.push({ ...entry, explained: INSIDE })
    else reverse.unexplained.push(entry)
  }
  return reverse
}

// --- one lane ------------------------------------------------------------------------

// The parts of a lane a record may belong to: those that read its source, and
// among several of those, the ones whose selection picks it: by the prefix of
// its code for rows, and otherwise by the group its code scope ends in, and
// by its code as well where the group alone leaves several.
function partsFor(record: ObjectiveFrontmatter, lane: Lane): LanePart[] {
  const reading = lane.parts.filter((part) => part.source === record.source)
  if (reading.length < 2) return reading
  const scope = record.code_scope.replace(BAND, '')
  const under = (group: string): boolean => scope.endsWith(`, ${group}`)
  const grouped = reading.filter(({ selection }) => {
    if (selection.kind === 'rows') return selection.codePrefixes?.some((prefix) => record.code.startsWith(prefix)) ?? true
    if (selection.kind === 'data') return selection.groups.some((group) => under(group.name))
    return selection.statements.some((statement) => under(statement.group))
  })
  if (grouped.length < 2) return grouped.length === 1 ? grouped : reading
  const coded = grouped.filter(({ selection }) => (selection.kind !== 'statements' && selection.kind !== 'legal') || selection.statements.some((statement) => statement.code === record.code && under(statement.group)))
  return coded.length > 0 ? coded : grouped
}

// The pages most of a part's records were found on: the run of pages, each
// holding a record, around the middle one.
function homePages(mine: readonly Checked[]): number[] {
  const pages = mine.flatMap((each) => (each.found ? [each.found[0]!.page] : [])).sort((a, b) => a - b)
  const middle = pages[Math.floor(pages.length / 2)]
  if (middle === undefined) return []
  let first = middle
  let last = middle
  while (pages.includes(first - 1)) first -= 1
  while (pages.includes(last + 1)) last += 1
  return Array.from({ length: last - first + 1 }, (_, index) => first + index)
}

// The source a part is checked in: its own again, the repository that holds the text of its open-data nodes, or its check rendition.
const checkSource = (part: LanePart): string => (part.checkRendition === SAME_FILE ? part.source : isData(part) ? textSource(part.dataNodes) : part.checkRendition)
const slugOf = (part: LanePart): string => (part.checkRendition === SAME_FILE ? SAME_FILE : (parseId(checkSource(part))?.slug ?? checkSource(part)))
// The check rendition of a part as it is searched.
const checkOf = (part: LanePart, { read, nodes }: Reader): Rendition | null => (isData(part) ? nodes(part) : read(checkSource(part)))

// The first pass over a lane: every record of the lane, or of one batch,
// looked for in its check rendition, and the reverse pass of every part.
export function matchLane(lane: Lane, options: MatchOptions & { batch?: string } = {}): LaneMatch {
  const education = options.education ?? resolve(import.meta.dirname, '..')
  const store = options.store ?? storeRoot()
  const name = laneKey(lane)
  const batch = batchNamed(lane, options.batch)
  const reading = reader(options)
  const { failed } = reading
  const read = (part: LanePart): Rendition | null => checkOf(part, reading)

  const all = readLane(education, lane).map((record): Checked => {
    const { id, wording_sha256: hash, parent_code: parent } = record.frontmatter
    const wording = record.official ?? getWording(store, hash)
    if (wording === null) throw new Error(`the official wording of ${id} is not in the store at ${store}: run \`${FETCH_COMMAND}\`, then the import that wrote the record`)
    const parts = partsFor(record.frontmatter, lane)
    if (parts.length === 0) throw new Error(`${id} was read from ${record.frontmatter.source}, which no part of ${name} reads`)
    for (const part of parts) {
      const rendition = read(part)
      const held = rendition ? printings(rendition, wording, parent !== undefined) : []
      if (held.length > 0) return { record, wording, part, printings: held, found: held[0]!.found, granularity: held[0]!.granularity }
    }
    return { record, wording, part: parts[0]!, printings: [], found: null, granularity: false }
  })

  // A rendition may print one statement for several grades in the same words.
  // A record whose preferred printing is away from the pages its part's other
  // records stand on is placed on those pages, or the one after or before
  // them, when its wording stands there too.
  for (const part of lane.parts) {
    const mine = all.filter((each) => each.part === part)
    const home = homePages(mine)
    for (const each of mine) {
      if (!each.found || home.includes(each.found[0]!.page)) continue
      for (const page of [...home, home.at(-1)! + 1, home[0]! - 1]) {
        const there = each.printings.find((match) => match.found[0]!.page === page)
        if (!there) continue
        each.found = there.found
        each.granularity = there.granularity
        break
      }
    }
  }

  // Two records whose wording was found at the same place, part for part: one printed statement that two records carry.
  const at = new Map<string, string[]>()
  const placeKey = ({ part, found }: Checked): string | null => {
    const rendition = found && read(part)
    return rendition ? JSON.stringify([checkSource(part), ...found.map((each) => placeOf(rendition, each))]) : null
  }
  for (const each of all) {
    const key = placeKey(each)
    if (key !== null) at.set(key, [...(at.get(key) ?? []), each.record.frontmatter.id])
  }

  const records = all
    .filter(({ record }) => !batch || batchOf(record.frontmatter, lane).name === batch.name)
    .map((each): RecordMatch => {
      const { record, part, found } = each
      const base = { id: record.frontmatter.id, code: record.frontmatter.code, part: part.name }
      const rendition = read(part)
      if (!rendition || !found) return { ...base, matched: false, rendition: slugOf(part), place: {}, why_not: rendition ? 'not-found' : 'rendition-unreadable' }
      // The two forms of a difference are words of the wording: only for a record whose wording is in its file.
      const forms = record.official !== null
      const chosen = each.printings.find((match) => match.found === found)!
      const every = each.printings.slice().sort(inOrder)
      const others = at.get(placeKey(each)!)!.filter((id) => id !== record.frontmatter.id)
      return {
        ...base,
        matched: true,
        rendition: slugOf(part),
        ...occurrenceOf(rendition, chosen, forms),
        ...(every.length > 1 ? { ambiguous: true as const, places: every.map((match) => occurrenceOf(rendition, match, forms)) } : {}),
        ...(others.length > 0 ? { shared_place_with: others } : {}),
      }
    })

  const reverse = lane.parts.map((part) => reverseOf(part, lane, all, read(part), slugOf(part)))
  return {
    lane: name,
    ...(batch ? { batch: batch.name } : {}),
    records,
    reverse,
    ...(failed.size > 0 ? { unreadable: unreadableOf(failed) } : {}),
  }
}

// --- what is printed -----------------------------------------------------------------

// The numbers of a result: how many records were matched in which way, and how many ask the checker to look.
export function countsOf(result: LaneMatch): { records: number; exact: number; tolerant: number; granularity: number; notFound: number; ambiguous: number; shared: number; crossing: number; form: number } {
  const matched = result.records.filter((record) => record.matched)
  const granularity = matched.filter((record) => record.granularity_differs).length
  const tolerant = matched.filter((record) => record.tolerant && !record.granularity_differs).length
  return {
    records: result.records.length,
    exact: matched.length - granularity - tolerant,
    tolerant,
    granularity,
    notFound: result.records.length - matched.length,
    ambiguous: matched.filter((record) => record.ambiguous).length,
    shared: matched.filter((record) => record.shared_place_with).length,
    crossing: matched.filter((record) => record.crosses_break).length,
    form: matched.filter((record) => record.form_differences).length,
  }
}

// How a printing was found when not plainly, in words.
function flagsOf(found: Pick<Occurrence, 'tolerant' | 'granularity_differs' | 'crosses_break'>): string[] {
  return [found.tolerant ? 'tolerant' : null, found.granularity_differs ? 'granularity differs' : null, found.crosses_break ? 'crosses a break' : null].filter((each) => each !== null)
}

// A printing as text: its place and its column, and with `how`, how it was found when not plainly.
function formatOccurrence(occurrence: Occurrence, how: boolean): string {
  const found = flagsOf(occurrence)
  return `${formatPlace(occurrence.place)}${occurrence.column === undefined ? '' : ` (column ${occurrence.column})`}${how && found.length > 0 ? ` [${found.join(', ')}]` : ''}`
}

// A difference of form as text: its kind and the word of the wording it stands at. Never the words.
function formatDifference(difference: FormDifference): string {
  const mark = difference.kind === 'hyphen' || difference.kind === 'comma' || difference.kind === 'punctuation'
  const which = difference.marks ? ` (${difference.marks.wording} in wording, ${difference.marks.rendition} in rendition)` : difference.mark === undefined ? '' : ` ${difference.mark}`
  return `${difference.kind}${which}${difference.only_in === undefined ? '' : ` only in ${difference.only_in}`} ${mark ? 'after' : 'at'} word ${difference.word}`
}

// The result as text: a line per record, then the reverse pass of each part. Ids, codes and places only.
export function formatMatch(result: LaneMatch): string {
  const counts = countsOf(result)
  const lines = [
    `# ${result.lane}${result.batch ? `, batch ${result.batch}` : ''}: ${counts.records} records, ${counts.exact} matched exactly, ${counts.tolerant} tolerantly, ${counts.granularity} with differing granularity, ${counts.notFound} not found. Ids, codes and places only.`,
    `# For the checker to look at: ${counts.ambiguous} ambiguous (printed more than once: choose the record's own place), ${counts.shared} sharing a place with another record, ${counts.crossing} crossing a break, ${counts.form} with differences of form.`,
  ]
  // The labelled columns the places stand in, the most frequent first: a place in another column than the lane's own stands out.
  const columns = new Map<string, number>()
  for (const record of result.records) if (typeof record.column === 'string') columns.set(record.column, (columns.get(record.column) ?? 0) + 1)
  if (columns.size > 0) lines.push(`# Columns of the places: ${[...columns].sort((a, b) => b[1] - a[1]).map(([column, held]) => `${column} (${held})`).join(', ')}.`)
  for (const record of result.records) {
    const how = flagsOf(record)
    const state = record.matched ? `matched${how.length > 0 ? ` (${how.join(', ')})` : ''}` : `NOT FOUND (${record.why_not})`
    const where = record.matched
      ? [
          `${formatOccurrence(record, false)}${record.parts ? `; parts: ${record.parts.map((place) => formatPlace(place)).join(' | ')}` : ''}`,
          ...(record.places ? [`ambiguous, ${record.places.length} places: ${record.places.map((each) => formatOccurrence(each, true)).join(' | ')}`] : []),
          ...(record.shared_place_with ? [`shares its place with ${record.shared_place_with.join(', ')}`] : []),
          ...(record.form_differences ? [`form: ${record.form_differences.map(formatDifference).join('; ')}`] : []),
        ]
      : []
    lines.push([record.id, record.code === '' ? '(none printed)' : record.code, state, record.rendition, ...where].join('\t'))
  }
  for (const { rendition, why } of result.unreadable ?? []) lines.push(['unreadable', rendition, why].join('\t'))
  for (const reverse of result.reverse) {
    lines.push('', `## reverse pass, whole lane: ${reverse.part} (${reverse.rendition})`)
    if (!reverse.applies) {
      lines.push(`does not apply: ${reverse.why_not}`)
      continue
    }
    const unseen = reverse.printed! < reverse.of! ? ' (a statement it prints without its code is not seen here: count those by eye)' : ''
    lines.push(`the rendition prints ${reverse.printed} of the part's ${reverse.of} codes${unseen}; codes of that shape no record carries: ${reverse.explained.length} explained, ${reverse.unexplained.length} unexplained`)
    for (const entry of reverse.explained) lines.push(['explained', entry.code, formatPlace(entry.place), entry.explained].join('\t'))
    for (const entry of reverse.unexplained) lines.push(['unexplained', entry.code, formatPlace(entry.place)].join('\t'))
  }
  return lines.join('\n')
}

// --- the place a verdict states ------------------------------------------------------

// A rendition that could not be read, by the slug of its source record, and why.
export interface Unreadable {
  rendition: string
  why: string
}

function unreadableOf(failed: ReadonlyMap<string, string>): Unreadable[] {
  return [...failed].map(([source, why]) => ({ rendition: parseId(source)?.slug ?? source, why }))
}

export interface PlaceVerifier {
  (verdict: Verdict, record: RecordFile): boolean | null
  // The renditions asked for so far that could not be read, each with why:
  // a file that is not in the store, a source the plans do not hold, a tool
  // that is missing or failed. Every verdict that names one was answered null.
  unreadable: () => Unreadable[]
}

// Whether a record's wording is at the place a verdict states, for
// review-join.ts: true when the match, run again, finds the wording (or its
// first part) starting there, as any of its printings and in any of the ways
// a wording is found, false when it does not, and null when that
// cannot be told: no store, a rendition that is not in it, a wording that is
// not in it, a place without a page. Each rendition is read once, and
// `unreadable()` says which could not be read.
export function placeVerifier(options: MatchOptions = {}): PlaceVerifier {
  const reading = reader(options)
  const lanes = options.lanes ?? MANIFEST
  const verify = (verdict: Verdict, record: RecordFile): boolean | null => {
    const store = options.store ?? storeRoot()
    if (!existsSync(store)) return null
    const fields = record.frontmatter as unknown as ObjectiveFrontmatter
    const id = parseId(String(fields.id))
    if (!id || id.kind !== 'objective') return null
    // A part checked against its open-data nodes is verified against the same nodes it was matched in.
    const lane = lanes.find((each) => each.jurisdiction === id.jurisdiction && each.level === id.level && each.subject === id.subject)
    const data = lane ? partsFor(fields, lane).find((part) => isData(part) && slugOf(part) === verdict.rendition) : undefined
    const rendition = data ? checkOf(data, reading) : reading.read(verdict.rendition === SAME_FILE ? fields.source : sourceId(id.jurisdiction, verdict.rendition))
    if (!rendition) return null
    const section = record.sections.find((each) => each.heading === OFFICIAL_WORDING)
    const wording = section ? officialWording(section.text).wording : getWording(store, fields.wording_sha256)
    if (wording === null) return null
    const { page, node, offset } = verdict.place
    // The page stated; or the page that is the node stated; or, with neither, the one page of a rendition that has one.
    let at: number | undefined
    if (page !== undefined) at = page
    else if (node !== undefined) at = rendition.files?.indexOf(node) ?? -1
    else if (rendition.pages.length === 2) at = 1
    if (at === undefined) return null
    return standsAt(rendition, wording, fields.parent_code !== undefined, at, offset)
  }
  return Object.assign(verify, { unreadable: () => unreadableOf(reading.failed) })
}

// The same against the store and the manifest's plans. Null for every verdict when there is no store.
export const verifyPlace: PlaceVerifier = placeVerifier()

// --- the command line ----------------------------------------------------------------

const USAGE = 'usage: node education/tools/match.ts --lane <jurisdiction>/<level>/<subject> [--batch <name>] [--json]'

export interface Asked {
  jurisdiction: Jurisdiction
  level: string
  subject: string
  batch?: string
  json: boolean
}

export function parseArgs(args: readonly string[]): Asked | { error: string } {
  const parsed = parseLaneArgs(args, '--json')
  if ('error' in parsed) return parsed
  const { flagged, ...asked } = parsed
  return { ...asked, json: flagged }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const asked = parseArgs(process.argv.slice(2))
  if ('error' in asked) {
    console.error(`education match: ${asked.error}\n${USAGE}`)
    process.exit(2)
  }
  try {
    const lane = laneOf(asked.jurisdiction, asked.level, asked.subject)
    if (!lane) throw new Error(`the manifest has no lane ${laneKey(asked)}`)
    const result = matchLane(lane, { store: requireStore(), ...(asked.batch === undefined ? {} : { batch: asked.batch }) })
    console.log(asked.json ? JSON.stringify(result, null, 2) : formatMatch(result))
  } catch (error) {
    console.error(`education match failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
