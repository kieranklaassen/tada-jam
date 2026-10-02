// Locate, then extract (plan KTD3). For a lane whose statements exist
// only as a PDF or a document file, an agent writes a locator file that says
// where each statement is: its page and the first and last words that bound
// it. This script reads the text between those words out of the source and
// writes the record. Official wording is never typed by an agent.
//
//   node education/tools/extract.ts                                      every lane with located statements
//   node education/tools/extract.ts --lane <jurisdiction>/<level>/<subject>   one lane
//
// The locator file of a lane is education/locators/<jurisdiction>/<level>/<subject>.json:
//
//   { "lane": "<jurisdiction>/<level>/<subject>",
//     "records": [ { "group", "code", "title"?, "printed_code"?, "california_addition"?, "spans": [ <span>... ] } ] }
//
// One entry per statement of the lane's manifest entry (`StatementRef`), named
// by its `group` and `code`. `title` is a printed name, such as a foundation's
// heading; it is never a sentence of the wording. `printed_code` is false on a
// statement the source prints no code for, where `code` is only the path of
// labels and the position that name it in its group: the record's code is
// then empty, and what names it goes to its title and its locator.
// `california_addition` is
// true on a statement the page marks as California's addition, or as holding
// one; it is allowed only where the source is one whose document marks them
// (`additionSources`). Every record read from such a source then says whether
// it is an addition, true or false, as an imported record does, and a record
// read from any other source has no such field. A span is one stretch of
// text, and a record's wording is its spans in order, a blank line between
// them, each after its `label` and a colon when it has one:
//
//   label            what the span is, where a record holds several: an age band, for one
//   source           the slug of the source record it is read from (the part's own source)
//   page             the page the span starts on, counted from 1 as pdftotext counts
//   lastPage         the page it ends on, when that is a later one
//   column           the column of the page it is in, counted from 1, for a source read by word position.
//                    With `lastPage` the span stays in that column: from `first` to the foot of the
//                    column, that column whole on each page in between, and from the top of that
//                    column on the last page to `last`. Without `column` it takes the pages whole.
//   first, last      the words it starts with and ends with: the bounding words
//   firstOccurrence, lastOccurrence
//                    which occurrence of that anchor on its page (in its column) is meant, counted from 1
//   corrections      [{ from, to, reason }]: exact repairs of what the text layer gets wrong
//
// A content-line PDF of the Dutch curriculum institute is read by its fase
// columns (content-lines.ts), not as its plan in the manifest says: on every
// page column 1 is the column of labels and columns 2 to 4 are fase 1 to 3,
// each item of a column a paragraph of its own.
//
// Words are compared as the overlap check compares them: without case or
// punctuation, a hyphen ending a word. The text taken runs from the first
// word of `first` through the last word of `last`, with the punctuation that
// opens the one and closes the other, and is normalised (normalise.ts). Each
// correction then replaces the first place its `from` occurs, in the order
// given.
//
// The rules, each a finding that names the lane, group and code. A lane with
// a finding writes nothing.
//
//   locator-file-missing   the lane has located statements and no locator file
//   locator-invalid        the file is not of the shape above
//   locator-unknown        an entry names no statement of the lane
//   locator-duplicate      a statement has two entries
//   locator-missing        a statement has no entry
//   part-count             a part's entries are not as many as its expected count
//   slug-collision         two statements would be written to one file
//   span-source            a span names another source than its part is read from
//   addition-not-marked    an entry says whether it is a California addition, and its lane is not
//                          California's or its source is not one whose document marks them
//   anchor-too-long        description-only lanes: an anchor of more than four words
//   anchors-over-half      description-only lanes: the two anchors of a span together hold more than
//                          half of the words of the text they locate, where that text is of four
//                          words or more
//   correction-too-long    description-only lanes: a correction's `from` or `to` of more than four words
//   anchor-not-found       the bounding words are not on the stated page
//   anchor-ambiguous       an anchor occurs more than once on its page and no occurrence is given
//   anchors-reversed       the last anchor ends before the first one starts
//   spans-overlap          two spans of the lane share text
//   correction-not-found   a correction's `from` is not in the located text
//
// The four-word caps exist because locator files are committed and the repo
// is public: the wording of a description-only source must not leak through
// them. The cap on an anchor alone is not enough for a short statement, whose
// two anchors could hold nearly all of it between them, so the two together
// may hold no more than half of the words they locate: with anchors of one or
// two words and `firstOccurrence` or `lastOccurrence` to say which place is
// meant, every text of four words or more can be located. A located text of
// three words or fewer cannot: one word at each end is already more than half
// of it. Such a span is exempt from the rule, its anchors hold it whole or
// nearly whole, and every run names it (`exempt` in the result, a line in what
// the command prints), so that it is seen and not passed in silence. A
// verbatim lane has neither limit.
//
// The core is exported for extract.test.ts and for the steps that follow.

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANIFEST, planFor } from '../manifest.ts'
import type { Lane, LanePart, StatementRef, StatementSelection } from '../manifest.ts'
import { US_CA_ADDITION_SOURCES } from '../manifest/us-ca-additions.ts'
import { contentLinePages, isContentLineSource, readContentLine } from './content-lines.ts'
import { normalise, normaliseCode } from './normalise.ts'
import { WORD, words } from './overlap.ts'
import { statusCounts, writeObjective } from './record-writer.ts'
import type { ObjectiveFields, WriteResult } from './record-writer.ts'
import { readSource, readSourceRecord } from './rendition.ts'
import type { SourcePages } from './rendition.ts'
import { laneKey, objectiveId, parseId, slugify } from './schema.ts'
import type { SourceFrontmatter } from './schema.ts'
import { requireStore } from './store.ts'
import { formatFinding } from './validate.ts'
import type { Finding } from './validate.ts'

// --- the locator file ------------------------------------------------------------

// Why the text between the bounding words is not what the page prints.
export const CORRECTION_REASONS = [
  // A word broken over two lines lost or kept its hyphen: "oneto-one", "health- related".
  'line-break hyphen',
  // Words of the column beside it stand inside the span.
  'columns interleaved',
  // A letter pair, bullet, fraction or other glyph came out as another character or as none.
  'ligature or glyph',
  // A page header, footer or page number stands inside a span that runs over a page break.
  'running header or footer',
  // Text recognition read a letter, accent, digit or space wrongly.
  'text recognition misread',
  // A footnote mark stands against a word of the statement.
  'footnote marker',
] as const
export type CorrectionReason = (typeof CORRECTION_REASONS)[number]

export interface Correction {
  // The text as extracted, exactly.
  from: string
  // The text as the page prints it. Empty to take `from` out.
  to: string
  reason: CorrectionReason
}

export interface LocatorSpan {
  label?: string
  source: string
  page: number
  lastPage?: number
  column?: number
  first: string
  last: string
  firstOccurrence?: number
  lastOccurrence?: number
  corrections?: Correction[]
}

export interface LocatorEntry {
  group: string
  code: string
  title?: string
  // False when the source prints no code for the statement: the record's code is then empty.
  printed_code?: boolean
  // True when the page marks the statement as California's addition, or as holding one.
  california_addition?: boolean
  spans: LocatorSpan[]
}

export interface LocatorFile {
  // <jurisdiction>/<level>/<subject>
  lane: string
  records: LocatorEntry[]
}

// The longest anchor, and the longest side of a correction, in a description-only lane.
export const WORD_CAP = 4

// In a description-only lane the two anchors of a span together hold at most
// one in this many of the words of the text they locate.
export const ANCHOR_SHARE_ONE_IN = 2

// The fewest words of a located text that rule applies to. With fewer, no
// anchors can meet it: one word at each end of three is two of three.
export const ANCHOR_SHARE_FROM = 4

// The locator file of a lane, relative to education/.
export function locatorPath(lane: Pick<Lane, 'jurisdiction' | 'level' | 'subject'>): string {
  return `locators/${laneKey(lane)}.json`
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isCount = (value: unknown): boolean => Number.isInteger(value) && (value as number) >= 1

const ENTRY_FIELDS = ['group', 'code', 'title', 'printed_code', 'california_addition', 'spans']
const SPAN_FIELDS = ['label', 'source', 'page', 'lastPage', 'column', 'first', 'last', 'firstOccurrence', 'lastOccurrence', 'corrections']
const CORRECTION_FIELDS = ['from', 'to', 'reason']

// Everything wrong with the shape of a parsed locator file, as sentences;
// empty when it is a LocatorFile. Whether its entries are the lane's
// statements, and whether its anchors are on their pages, is for the
// extraction to find.
export function validateLocator(value: unknown): string[] {
  if (!isObject(value) || typeof value.lane !== 'string' || !Array.isArray(value.records)) return ['the file must hold an object with `lane` and `records`']
  const problems: string[] = []
  const unknown = (where: string, item: Record<string, unknown>, fields: readonly string[], what: string): void => {
    for (const key of Object.keys(item)) if (!fields.includes(key)) problems.push(`${where}: ${key} is not a field of ${what}`)
  }
  const text = (where: string, item: Record<string, unknown>, key: string, optional = false): void => {
    if (optional && item[key] === undefined) return
    if (typeof item[key] !== 'string' || (item[key] as string).trim() === '') problems.push(`${where}: ${key} must be text`)
  }
  const count = (where: string, item: Record<string, unknown>, key: string, optional = true): void => {
    if (optional && item[key] === undefined) return
    if (!isCount(item[key])) problems.push(`${where}: ${key} must be a whole number from 1`)
  }
  const anchor = (where: string, item: Record<string, unknown>, key: string): void => {
    if (typeof item[key] !== 'string' || words(item[key]).length === 0) problems.push(`${where}: ${key} must hold at least one word`)
  }

  for (const key of Object.keys(value)) if (key !== 'lane' && key !== 'records') problems.push(`${key} is not a field of a locator file`)
  value.records.forEach((entry: unknown, index: number) => {
    if (!isObject(entry)) return void problems.push(`records[${index}]: must be an object`)
    const at = `records[${index}] (${typeof entry.code === 'string' ? entry.code : '?'})`
    unknown(at, entry, ENTRY_FIELDS, 'a record')
    text(at, entry, 'group')
    if (typeof entry.code !== 'string') problems.push(`${at}: code must be text`)
    text(at, entry, 'title', true)
    if (entry.printed_code !== undefined && typeof entry.printed_code !== 'boolean') problems.push(`${at}: printed_code must be true or false`)
    if (entry.california_addition !== undefined && typeof entry.california_addition !== 'boolean') problems.push(`${at}: california_addition must be true or false`)
    if (!Array.isArray(entry.spans) || entry.spans.length === 0) return void problems.push(`${at}: spans must hold at least one span`)
    entry.spans.forEach((span: unknown, spanIndex: number) => {
      const where = `${at}.spans[${spanIndex}]`
      if (!isObject(span)) return void problems.push(`${where}: must be an object`)
      unknown(where, span, SPAN_FIELDS, 'a span')
      text(where, span, 'label', true)
      text(where, span, 'source')
      count(where, span, 'page', false)
      count(where, span, 'lastPage')
      count(where, span, 'column')
      anchor(where, span, 'first')
      anchor(where, span, 'last')
      count(where, span, 'firstOccurrence')
      count(where, span, 'lastOccurrence')
      if (isCount(span.page) && isCount(span.lastPage) && (span.lastPage as number) < (span.page as number)) problems.push(`${where}: lastPage must not come before page`)
      if (span.corrections === undefined) return
      if (!Array.isArray(span.corrections)) return void problems.push(`${where}: corrections must be a list`)
      span.corrections.forEach((correction: unknown, correctionIndex: number) => {
        const here = `${where}.corrections[${correctionIndex}]`
        if (!isObject(correction)) return void problems.push(`${here}: must be an object`)
        unknown(here, correction, CORRECTION_FIELDS, 'a correction')
        if (typeof correction.from !== 'string' || normalise(correction.from) === '') problems.push(`${here}: from must be text`)
        if (typeof correction.to !== 'string') problems.push(`${here}: to must be text, or empty to take the text out`)
        if (!CORRECTION_REASONS.includes(correction.reason as CorrectionReason)) problems.push(`${here}: reason must be one of ${CORRECTION_REASONS.join(', ')}`)
      })
    })
  })
  return problems
}

// --- findings ----------------------------------------------------------------------

// A finding about a locator file. `file` is that file, relative to education/.
export interface ExtractFinding extends Finding {
  // <jurisdiction>/<level>/<subject>
  lane: string
  // The entry it is about, when it is about one.
  group?: string
  code?: string
}

// --- pages -------------------------------------------------------------------------

// The pages of a source, by the id of its source record (rendition.ts).
export type PageProvider = (source: string) => SourcePages

interface Token {
  // The word as it is compared.
  word: string
  // Where it is in the text it was found in.
  start: number
  end: number
}

function tokensOf(text: string): Token[] {
  const plain = words(text)
  const found = [...text.matchAll(WORD)]
  if (found.length !== plain.length) throw new Error('extract.ts and overlap.ts no longer split text into the same words')
  return found.map((match, index) => ({ word: plain[index]!, start: match.index, end: match.index + match[0].length }))
}

// A stretch of normalised text and its words.
interface Stretch {
  text: string
  tokens: Token[]
  // How many words of the page stand before it: those of the columns to its left.
  offset: number
}

// Every place the words of an anchor stand in a row, as the index of the first.
function occurrences(tokens: readonly Token[], anchor: readonly string[]): number[] {
  const found: number[] = []
  for (let start = 0; start + anchor.length <= tokens.length; start += 1) {
    if (anchor.every((word, index) => tokens[start + index]!.word === word)) found.push(start)
  }
  return found
}

// Punctuation that opens a statement and belongs to its first word.
const OPENS = /["'([{«¿¡]/
// What belongs to no word and is not a space: the punctuation that closes the last word.
const CLOSES = /[^\s\p{L}\p{N}]/u

// --- one span, for text that is no record --------------------------------------------

// The text of one span on one page of a source, read as a lane's extraction
// reads it: from the first word of `first` through the last word of `last`,
// with the punctuation that opens the one and closes the other, normalised,
// and then corrected. For official text that is quoted and is no record: a
// sentence over the columns of a card. Throws, with what is wrong, where the
// extraction of a lane would report a finding.
export function spanText(span: LocatorSpan, source: SourcePages): string {
  if (span.lastPage !== undefined && span.lastPage !== span.page) throw new Error('a span read on its own stays on one page')
  const where = `page ${span.page}${span.column === undefined ? '' : `, column ${span.column}`}`
  const raw = span.column === undefined ? (span.page >= 1 && span.page < source.pages.length ? source.pages[span.page] : undefined) : source.columns?.[span.page]?.[span.column - 1]
  if (raw === undefined) throw new Error(`the source has no ${where}`)
  const text = normalise(raw)
  const tokens = tokensOf(text)
  const locate = (side: 'first' | 'last'): { at: number; length: number } => {
    const anchor = words(span[side])
    const found = occurrences(tokens, anchor)
    const occurrence = side === 'first' ? span.firstOccurrence : span.lastOccurrence
    if (found.length === 0) throw new Error(`the ${side} anchor is not on ${where}`)
    if (occurrence === undefined && found.length > 1) throw new Error(`the ${side} anchor occurs ${found.length} times on ${where}: say which with ${side}Occurrence`)
    if (occurrence !== undefined && occurrence > found.length) throw new Error(`the ${side} anchor occurs ${found.length} time(s) on ${where}, so there is no occurrence ${occurrence}`)
    return { at: found[(occurrence ?? 1) - 1]!, length: anchor.length }
  }
  const first = locate('first')
  const last = locate('last')
  const end = last.at + last.length - 1
  if (end < first.at) throw new Error('the last anchor ends before the first anchor starts')
  let from = tokens[first.at]!.start
  while (from > 0 && OPENS.test(text[from - 1]!)) from -= 1
  let to = tokens[end]!.end
  while (to < text.length && CLOSES.test(text[to]!)) to += 1
  let taken = text.slice(from, to)
  for (const [index, correction] of (span.corrections ?? []).entries()) {
    const wrong = normalise(correction.from)
    const at = taken.indexOf(wrong)
    if (at === -1) throw new Error(`the \`from\` of correction ${index + 1} is not in the located text`)
    taken = taken.slice(0, at) + normalise(correction.to) + taken.slice(at + wrong.length)
  }
  return normalise(taken)
}

// --- one lane ----------------------------------------------------------------------

export interface AppliedCorrection extends Correction {
  group: string
  code: string
  label?: string
  // The slug of the source, and the page the span starts on.
  source: string
  page: number
}

export interface LaneCorrections {
  lane: string
  corrections: AppliedCorrection[]
}

// A span of a description-only lane that locates fewer words than the rule on
// the share of the anchors applies to, so that its anchors hold it whole or
// nearly whole.
export interface ExemptSpan {
  group: string
  code: string
  // The span as a finding names it: its number in the entry, and its label.
  span: string
  // How many words it locates, and how many of them its anchors hold.
  words: number
  held: number
}

export interface LaneExtract {
  // <jurisdiction>/<level>/<subject>
  lane: string
  findings: ExtractFinding[]
  // One per record, in the manifest's order. Empty when there is a finding.
  written: WriteResult[]
  // Every correction the lane's locator applies.
  corrections: AppliedCorrection[]
  // The spans too short for the rule on the share of the anchors.
  exempt: ExemptSpan[]
}

export interface ExtractOptions {
  // The education folder: locators/ and sources/ are read there, corpus/ is written there.
  education: string
  // The root of the store: the sources are read from it, the wording is written to it.
  store: string
  // In place of reading each source from the store as its plan in the manifest says.
  pages?: PageProvider
  // The ids of the sources whose documents mark California's additions. A
  // record read from one says whether it is an addition; a record read from
  // any other has no such field, and neither has a record outside California.
  additionSources?: readonly string[]
}

type StatementPart = LanePart & { selection: StatementSelection }
const isLocated = (part: LanePart): part is StatementPart => part.selection.kind === 'statements'

// True for a lane that has statements located by page and anchor.
export function hasLocatedStatements(lane: Lane): boolean {
  return lane.parts.some(isLocated)
}

const refKey = (group: string, code: string): string => `${group}\u0000${code}`

// A file name made of a statement's group and code (slugify). The group is in
// it because numbering restarts in every domain.
function slugOf(ref: StatementRef): string {
  return slugify(`${ref.group} ${ref.code}`)
}

// A label that names an age: a number of months or years.
const AGE = /\d.*\b(?:months?|years?|maand(?:en)?|jaar)\b/i

// The pages the spans of an entry lie on, as a locator names them: "page 19",
// "pages 19-20", "pages 19, 23".
function pageList(spans: readonly LocatorSpan[]): string {
  const pages = new Set<number>()
  for (const span of spans) for (let page = span.page; page <= (span.lastPage ?? span.page); page += 1) pages.add(page)
  const sorted = [...pages].sort((a, b) => a - b)
  if (sorted.length === 1) return `page ${sorted[0]}`
  const run = sorted.every((page, index) => index === 0 || page === sorted[index - 1]! + 1)
  return `pages ${run ? `${sorted[0]}-${sorted.at(-1)}` : sorted.join(', ')}`
}

function readLocator(education: string, lane: Lane): { locator: LocatorFile | null; problems: string[]; missing: boolean } {
  const path = join(education, locatorPath(lane))
  if (!existsSync(path)) return { locator: null, problems: [], missing: true }
  let value: unknown
  try {
    value = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return { locator: null, problems: [`the file is not JSON: ${(error as Error).message}`], missing: false }
  }
  const problems = validateLocator(value)
  if (problems.length === 0 && (value as LocatorFile).lane !== laneKey(lane)) problems.push(`lane is "${(value as LocatorFile).lane}" in a file at the path of ${laneKey(lane)}`)
  return { locator: problems.length === 0 ? (value as LocatorFile) : null, problems, missing: false }
}

function correctionsOf(locator: LocatorFile): AppliedCorrection[] {
  return locator.records.flatMap((entry) =>
    entry.spans.flatMap((span) =>
      (span.corrections ?? []).map((correction) => ({ group: entry.group, code: entry.code, ...(span.label === undefined ? {} : { label: span.label }), source: span.source, page: span.page, ...correction })),
    ),
  )
}

// A span as it lies on one page: the words of the page it covers, first and last included.
interface Reach {
  source: string
  page: number
  from: number
  to: number
  // Whose it is, for the finding: the entry's place in the file, and the span's name.
  entry: number
  span: string
}

// Extracts one lane: reads its locator file, checks it against the lane's
// manifest entry and the pages of its sources, and when nothing is wrong
// writes each record under `options.education` and its wording into the store.
export function extractLane(lane: Lane, options: ExtractOptions): LaneExtract {
  const key = laneKey(lane)
  const file = locatorPath(lane)
  const findings: ExtractFinding[] = []
  const find = (rule: string, message: string, entry?: { group: string; code: string }): void => {
    findings.push({ file, line: 1, rule, message: entry ? `${entry.group}, ${entry.code}: ${message}` : message, lane: key, ...(entry ? { group: entry.group, code: entry.code } : {}) })
  }
  const exempt: ExemptSpan[] = []
  const failed = (corrections: AppliedCorrection[] = []): LaneExtract => ({ lane: key, findings, written: [], corrections, exempt })

  const { locator, problems, missing } = readLocator(options.education, lane)
  if (missing) find('locator-file-missing', `the lane has located statements and there is no education/${file}`)
  for (const problem of problems) find('locator-invalid', problem)
  if (!locator) return failed()
  const corrections = correctionsOf(locator)

  // Each entry is one statement of the lane, and each statement has one entry.
  const parts = lane.parts.filter(isLocated)
  const statements = new Map<string, { ref: StatementRef; part: StatementPart }>()
  for (const part of parts) for (const ref of part.selection.statements) statements.set(refKey(ref.group, ref.code), { ref, part })
  const entries = new Map<string, LocatorEntry>()
  const held = new Map<StatementPart, number>(parts.map((part) => [part, 0]))
  for (const entry of locator.records) {
    const statement = statements.get(refKey(entry.group, entry.code))
    if (!statement) {
      find('locator-unknown', 'the lane has no statement with this group and code in the manifest', entry)
      continue
    }
    held.set(statement.part, held.get(statement.part)! + 1)
    if (entries.has(refKey(entry.group, entry.code))) find('locator-duplicate', 'the statement has more than one entry', entry)
    else entries.set(refKey(entry.group, entry.code), entry)
  }
  for (const [name, { ref }] of statements) if (!entries.has(name)) find('locator-missing', 'the statement has no entry in the locator file', ref)
  for (const part of parts) {
    const count = held.get(part)!
    if (count !== part.expectedCount) find('part-count', `the locator holds ${count} ${count === 1 ? 'entry' : 'entries'} for "${part.name}" and the manifest expects ${part.expectedCount}`)
  }
  const slugs = new Map<string, StatementRef>()
  for (const { ref } of statements.values()) {
    const other = slugs.get(slugOf(ref))
    if (other) find('slug-collision', `it would be written to the same file as ${other.group}, ${other.code} (${slugOf(ref)}.md)`, ref)
    else slugs.set(slugOf(ref), ref)
  }

  // The pages of each source, and each page or column as normalised text with its words.
  const pagesOf = readingOnce(options)
  const stretches = new Map<string, Stretch | null>()
  const stretch = (id: string, page: number, column?: number): Stretch | null => {
    const name = `${id}\u0000${page}\u0000${column ?? ''}`
    if (!stretches.has(name)) {
      const source = pagesOf(id)
      const raw = column === undefined ? (page < source.pages.length && page >= 1 ? source.pages[page] : undefined) : source.columns?.[page]?.[column - 1]
      let found: Stretch | null = null
      if (raw !== undefined) {
        const text = normalise(raw)
        const before = column === undefined ? 0 : source.columns![page]!.slice(0, column - 1).reduce((sum, earlier) => sum + words(earlier).length, 0)
        found = { text, tokens: tokensOf(text), offset: before }
      }
      stretches.set(name, found)
    }
    return stretches.get(name)!
  }

  const sources = new Map<string, SourceFrontmatter>()
  const sourceOf = (id: string): SourceFrontmatter => {
    if (!sources.has(id)) sources.set(id, readSourceRecord(options.education, id))
    return sources.get(id)!
  }

  // Whether the records of a part say if they are California additions.
  const marksAdditions = (part: StatementPart): boolean => lane.jurisdiction === 'us-ca' && (options.additionSources ?? []).includes(part.source)

  const reaches: Reach[] = []
  const wordings = new Map<string, string>()

  locator.records.forEach((entry, entryIndex) => {
    const statement = statements.get(refKey(entry.group, entry.code))
    if (!statement || entries.get(refKey(entry.group, entry.code)) !== entry) return
    if (entry.california_addition !== undefined && !marksAdditions(statement.part)) {
      const why = lane.jurisdiction === 'us-ca' ? `its source, ${statement.part.source}, is not one whose document marks them` : 'its lane is not California\'s'
      find('addition-not-marked', `the entry says whether it is a California addition, and ${why}`, entry)
    }
    const source = sourceOf(statement.part.source)
    const slug = parseId(source.id)!.slug
    const capped = source.reuse_policy === 'description-only'
    const texts: string[] = []

    entry.spans.forEach((span, spanIndex) => {
      const name = `span ${spanIndex + 1}${span.label === undefined ? '' : ` (${span.label})`}`
      const before = findings.length
      if (span.source !== slug) find('span-source', `${name} names the source ${span.source}, and its part is read from ${slug}`, entry)
      if (capped) {
        for (const side of ['first', 'last'] as const) {
          if (words(span[side]).length > WORD_CAP) find('anchor-too-long', `the ${side} anchor of ${name} is longer than ${WORD_CAP} words, and the source is description-only`, entry)
        }
        for (const [index, correction] of (span.corrections ?? []).entries()) {
          if (words(correction.from).length > WORD_CAP || words(correction.to).length > WORD_CAP) {
            find('correction-too-long', `correction ${index + 1} of ${name} is longer than ${WORD_CAP} words on one side, and the source is description-only`, entry)
          }
        }
      }
      if (findings.length > before) return

      // Each anchor on its own page: `first` on the page the span starts on, `last` on the one it ends on.
      const lastPage = span.lastPage ?? span.page
      const locate = (side: 'first' | 'last'): { stretch: Stretch; at: number; length: number } | null => {
        const page = side === 'first' ? span.page : lastPage
        const where = `page ${page}${span.column === undefined ? '' : `, column ${span.column}`}`
        const on = stretch(source.id, page, span.column)
        if (!on) {
          find('anchor-not-found', `${name}: the source has no ${where}`, entry)
          return null
        }
        const anchor = words(span[side])
        const found = occurrences(on.tokens, anchor)
        const occurrence = side === 'first' ? span.firstOccurrence : span.lastOccurrence
        if (found.length === 0) find('anchor-not-found', `the ${side} anchor of ${name} is not on ${where}`, entry)
        else if (occurrence === undefined && found.length > 1) find('anchor-ambiguous', `the ${side} anchor of ${name} occurs ${found.length} times on ${where}: say which with ${side}Occurrence`, entry)
        else if (occurrence !== undefined && occurrence > found.length) find('anchor-not-found', `the ${side} anchor of ${name} occurs ${found.length} time(s) on ${where}, so there is no occurrence ${occurrence}`, entry)
        else return { stretch: on, at: found[(occurrence ?? 1) - 1]!, length: anchor.length }
        return null
      }
      const first = locate('first')
      const last = locate('last')
      if (!first || !last) return
      const end = last.at + last.length - 1
      if (lastPage === span.page && end < first.at) return void find('anchors-reversed', `the last anchor of ${name} ends before its first anchor starts`, entry)

      // The text: from the first word, with the punctuation that opens it,
      // through the last word, with the punctuation that closes it.
      let from = first.stretch.tokens[first.at]!.start
      while (from > 0 && OPENS.test(first.stretch.text[from - 1]!)) from -= 1
      let to = last.stretch.tokens[end]!.end
      while (to < last.stretch.text.length && CLOSES.test(last.stretch.text[to]!)) to += 1
      // A span that runs over pages is read whole on the pages in between: the
      // page, or with a column that column of it and nothing of the others.
      const between: { page: number; whole: Stretch | null }[] = []
      for (let page = span.page + 1; page < lastPage; page += 1) between.push({ page, whole: stretch(source.id, page, span.column) })
      let text: string
      if (lastPage === span.page) text = first.stretch.text.slice(from, to)
      else text = [first.stretch.text.slice(from), ...between.map(({ whole }) => whole?.text ?? ''), last.stretch.text.slice(0, to)].join(' ')

      // The two anchors are committed, so together they may not give the
      // statement away: of the words they locate they hold at most half. Words
      // the two share on a page are counted once. A text too short for any
      // anchors to meet that is exempt, and named in the result.
      if (capped) {
        const located = words(text).length
        const shared = lastPage === span.page ? Math.max(0, Math.min(first.at + first.length - 1, end) - Math.max(first.at, last.at) + 1) : 0
        const held = first.length + last.length - shared
        if (located < ANCHOR_SHARE_FROM) exempt.push({ group: entry.group, code: entry.code, span: name, words: located, held })
        else if (held * ANCHOR_SHARE_ONE_IN > located) {
          return void find(
            'anchors-over-half',
            `the two anchors of ${name} together hold ${held} of the ${located} words they locate, more than half, and the source is description-only: shorten them to one or two words and say which place is meant with firstOccurrence or lastOccurrence`,
            entry,
          )
        }
      }

      // Where it lies, page by page, for the overlap rule. In a column it
      // reaches to the last word of that column and starts again at its first
      // word on the next page; without one it takes whole pages.
      const owner = { source: source.id, entry: entryIndex, span: name }
      const inColumn = span.column !== undefined
      const head = (on: Stretch): number => (inColumn ? on.offset : 0)
      const foot = (on: Stretch): number => (inColumn ? on.offset + on.tokens.length - 1 : Infinity)
      if (lastPage === span.page) reaches.push({ ...owner, page: span.page, from: first.stretch.offset + first.at, to: first.stretch.offset + end })
      else {
        reaches.push({ ...owner, page: span.page, from: first.stretch.offset + first.at, to: foot(first.stretch) })
        for (const { page, whole } of between) {
          if (!inColumn) reaches.push({ ...owner, page, from: 0, to: Infinity })
          // A page without that column, or a column without a word, holds nothing another span could share.
          else if (whole && whole.tokens.length > 0) reaches.push({ ...owner, page, from: head(whole), to: foot(whole) })
        }
        reaches.push({ ...owner, page: lastPage, from: head(last.stretch), to: last.stretch.offset + end })
      }

      text = normalise(text)
      for (const [index, correction] of (span.corrections ?? []).entries()) {
        const wrong = normalise(correction.from)
        const at = text.indexOf(wrong)
        if (at === -1) return void find('correction-not-found', `the \`from\` of correction ${index + 1} of ${name} is not in the located text`, entry)
        text = text.slice(0, at) + normalise(correction.to) + text.slice(at + wrong.length)
      }
      texts[spanIndex] = `${span.label === undefined ? '' : `${span.label}: `}${normalise(text)}`
    })

    if (texts.filter((text) => text !== undefined).length === entry.spans.length) wordings.set(refKey(entry.group, entry.code), texts.join('\n\n'))
  })

  reaches.forEach((reach, index) => {
    const other = reaches
      .slice(0, index)
      .find((earlier) => earlier.source === reach.source && earlier.page === reach.page && !(earlier.entry === reach.entry && earlier.span === reach.span) && earlier.from <= reach.to && reach.from <= earlier.to)
    if (!other) return
    const theirs = locator.records[other.entry]!
    find('spans-overlap', `${reach.span} shares text on page ${reach.page} with ${other.span} of ${theirs.group}, ${theirs.code}`, locator.records[reach.entry])
  })

  if (findings.length > 0) return failed(corrections)

  // Nothing is wrong: write the records, in the manifest's order.
  const written: WriteResult[] = []
  for (const [name, { ref, part }] of statements) {
    const entry = entries.get(name)!
    const source = sourceOf(part.source)
    const pages = part.selection.pages === undefined ? null : pageList(entry.spans)
    const ages = entry.spans.map((span) => span.label).filter((label): label is string => label !== undefined && AGE.test(label))
    // A statement the source prints no code for has none: what names it stands in its title and its locator.
    const code = entry.printed_code === false ? '' : ref.code
    const frontmatter: ObjectiveFields = {
      id: objectiveId(lane.jurisdiction, lane.level, lane.subject, slugOf(ref)),
      kind: 'objective',
      title: code === '' ? `${ref.group}, ${ref.code}` : `${ref.code}, ${entry.title ?? ref.title ?? ref.group}`,
      jurisdiction: lane.jurisdiction,
      level: lane.level,
      subject: lane.subject,
      content_language: lane.jurisdiction === 'nl' ? 'nl' : 'en',
      curriculum_version: source.version,
      status: 'draft',
      authority: 'official',
      code,
      code_key: normaliseCode(code),
      code_scope: `${source.title}, ${ref.group}`,
      ...(marksAdditions(part) ? { california_addition: entry.california_addition === true } : {}),
      ...(ages.length === 0 ? {} : { age_band: [...new Set(ages)].join('; ') }),
      standing: source.standing,
      ...(source.regime === undefined ? {} : { regime: source.regime }),
      reuse_policy: source.reuse_policy,
      source: source.id,
      locator: `${pages === null ? '' : `${pages}; `}${ref.group}, ${ref.code}`,
    }
    written.push(
      writeObjective(options.education, options.store, {
        frontmatter,
        wording: wordings.get(name)!,
        source: `${source.publisher}, ${source.title}${pages === null ? '' : `, ${pages}`}.`,
      }),
    )
  }
  return { lane: key, findings, written, corrections, exempt }
}

// What the command prints for a span that is exempt from the rule on the share of the anchors.
export function formatExempt(lane: string, span: ExemptSpan): string {
  return `${lane}: ${span.group}, ${span.code}, ${span.span}: locates ${span.words} word(s), fewer than ${ANCHOR_SHARE_FROM}, so its anchors hold ${span.held} of them and the rule on the share of the anchors does not apply`
}

// The page provider of a run: the one given, or the store read as each
// source's plan in the manifest says. Either way a source is read once.
function readingOnce(options: ExtractOptions): PageProvider {
  const provide =
    options.pages ??
    ((id: string): SourcePages => {
      const plan = planFor(id)
      if (isContentLineSource(id)) return contentLinePages(readContentLine(options.education, options.store, id))
      return readSource(plan, options.store, { education: options.education })
    })
  const read = new Map<string, SourcePages>()
  return (id) => {
    if (!read.has(id)) read.set(id, provide(id))
    return read.get(id)!
  }
}

// Extracts every lane of `lanes` that has located statements, or only the one
// named by `only` (<jurisdiction>/<level>/<subject>). A source is read once
// for all of them.
export function extractLanes(lanes: readonly Lane[], options: ExtractOptions, only?: string): LaneExtract[] {
  const chosen = lanes.filter((lane) => hasLocatedStatements(lane) && (only === undefined || laneKey(lane) === only))
  if (only !== undefined && chosen.length === 0) throw new Error(`no lane ${only} has located statements`)
  const pages = readingOnce(options)
  return chosen.map((lane) => extractLane(lane, { ...options, pages }))
}

// The corrections each lane's locator file applies, for the lane's frame to
// list. One entry per lane with located statements; a lane with no locator
// file yet has none.
export function listCorrections(education: string, lanes: readonly Lane[] = MANIFEST): LaneCorrections[] {
  return lanes.filter(hasLocatedStatements).map((lane) => {
    const { locator, problems } = readLocator(education, lane)
    if (problems.length > 0) throw new Error(`education/${locatorPath(lane)}: ${problems.join('; ')}`)
    return { lane: laneKey(lane), corrections: locator ? correctionsOf(locator) : [] }
  })
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  if (args.length !== 0 && !(args.length === 2 && args[0] === '--lane')) {
    console.error('usage: node education/tools/extract.ts [--lane <jurisdiction>/<level>/<subject>]')
    process.exit(2)
  }
  let results: LaneExtract[]
  try {
    results = extractLanes(MANIFEST, { education: resolve(import.meta.dirname, '..'), store: requireStore(), additionSources: US_CA_ADDITION_SOURCES }, args[1])
  } catch (error) {
    console.error(`education extract failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
  let findings = 0
  for (const result of results) {
    for (const finding of result.findings) console.error(formatFinding(finding))
    findings += result.findings.length
    if (result.findings.length === 0) {
      console.log(`${result.lane}: ${result.written.length} record(s): ${statusCounts(result.written)}; ${result.corrections.length} correction(s)`)
    }
    for (const span of result.exempt) console.log(`  exempt: ${formatExempt(result.lane, span)}`)
  }
  if (findings > 0) {
    console.error(`\neducation extract failed: ${findings} finding(s); a lane with a finding wrote nothing`)
    process.exit(1)
  }
}
