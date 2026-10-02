// Official text that belongs to a whole lane, or to a column, a cluster or a
// card of it, and to no single statement: read by script and kept for the
// frames to quote.
//
//   node education/tools/frame-texts.ts            read every such text and write locators/nl/frame-texts.json
//   node education/tools/frame-texts.ts --check    write nothing; fail when the committed file differs
//
// A record is one statement. The Dutch sources also print text that no
// record carries and a designer needs beside the records: the kinds, the
// length and the structure of the texts a fase column is about, the terms
// and the spelling categories per pair of groepen, the sentence over the
// columns of a card that every bullet continues, the note that says which
// groepen a fase is. manifest/nl-additions.ts says where each is
// (NL_FRAME_TEXTS); this tool reads it there, in the pinned file in the
// store, and writes what it read to locators/nl/frame-texts.json. The frame
// generator (frames.ts) quotes from that file and needs no store. Nothing of
// it is typed: the file is this tool's output, and `--check` says whether it
// still is.
//
// Four ways of saying where a text is:
//
//   span    a stretch of one page of a source by its bounding words, as a
//           lane's locator says where a statement is (extract.ts)
//   block   in a content-line PDF (content-lines.ts): what one column prints
//           under a heading bar and under a line that heads no goals: the
//           loose text and the items there, each row after its label
//   note    in a content-line PDF: the loose text that opens with the given
//           characters, such as the asterisk of a footnote. Where the
//           manifest says other PDFs print the same note, each is read and
//           has to print it in the same words
//   legal   in a regulation: the running text of a division, its headings,
//           paragraphs and lists, with each table by its caption alone
//           (runningText in import-netherlands.ts)
//
// What a declared text says the page sets in bold is checked against the text
// read: the text layer does not tell bold, so the manifest lists those items,
// and one that is not in the text stops the run.
//
// Beside those, for every per-band lane and every content-line PDF it is
// checked against, the tool lists the heading bars the PDF prints otherwise
// than the open data titles the cluster, and what the PDF prints under a bar
// across the columns: the records carry the data's titles only. And for
// every such lane and PDF that underlines terms, it lists the goals of the
// lane that hold an underlined term, by the code the data gives each, with
// the term: the goals of the lane are read in the open data as the importer
// reads them, joined by their text to the statements the PDF prints, and the
// underlines are read in the PDF's drawing instructions (content-lines.ts).
//
// The core is exported so frame-texts.test.ts can run it on invented pages.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { planFor } from '../manifest.ts'
import type { Lane, LanePart } from '../manifest.ts'
import { NL_ADDITIONS, NL_FRAME_TEXTS } from '../manifest/nl-additions.ts'
import type { FrameText } from '../manifest/nl-additions.ts'
import { NL_LANES } from '../manifest/nl.ts'
import { NOTE, bareHeading, columnOfLevel, joinGoals, letters, printedLines, readContentLine, readUnderlined, statementsOf, textOf } from './content-lines.ts'
import type { ContentLine, PrintedItem } from './content-lines.ts'
import { spanText } from './extract.ts'
import { goalsOfPart, once, openData, parseXml, runningText } from './import-netherlands.ts'
import type { PartGoal } from './import-netherlands.ts'
import { FRAME_TEXTS_FILE } from './frames.ts'
import type { FrameTextRead, FrameTextsFile } from './frames.ts'
import { readSource } from './rendition.ts'
import type { SourcePages } from './rendition.ts'
import { parseId, sourceId } from './schema.ts'
import { requireStore, storeRoot } from './store.ts'

const GENERATED =
  'Written by `node education/tools/frame-texts.ts` from the pinned sources in the store, as manifest/nl-additions.ts (NL_FRAME_TEXTS) and the lane manifest say where each text is. Official text, read by script; not edited by hand. `--check` says whether it is still what the tool reads.'

// A statement of a lane that a locator places in a source: its name in the manifest and where its first span starts.
export interface Located {
  group: string
  code: string
  source: string
  page: number
  column?: number
  first: string
}

// How the sources are read: a content-line PDF with its type styles, any
// source as pages. For the underlined terms: the terms of each item of a PDF,
// the goals of a part as the open data has them, and the located statements
// of a lane. Without those three, no underlined terms are listed.
export interface Readers {
  contentLine: (source: string) => ContentLine
  pages: (source: string) => SourcePages
  underlined?: (source: string) => Map<PrintedItem, string[]>
  goals?: (lane: Lane, part: LanePart) => PartGoal[]
  located?: (lane: Lane) => Located[]
}

const nl = (slug: string): string => sourceId('nl', slug)

// What stands in italics in a block read as printed.
const italics = (text: string): string => `_${text}_`

// A loose text that is a note of the file and no part of a block.
const isNote = (item: PrintedItem): boolean => item.kind === 'text' && NOTE.test(textOf(item.runs))

function pagesOf(items: readonly PrintedItem[]): string {
  const pages = [...new Set(items.map((item) => item.page))].sort((a, b) => a - b)
  return pages.length === 1 ? `page ${pages[0]}` : `pages ${pages.join(', ')}`
}

// One declared text, read.
export function readFrameText(declared: FrameText, readers: Readers): FrameTextRead {
  const { where } = declared
  const base = { lanes: [...declared.lanes], title: declared.title, about: declared.about, source: where.source }
  const fail = (problem: string): never => {
    throw new Error(`frame text "${declared.title}" (${where.source}): ${problem}`)
  }
  if (where.kind === 'span') {
    const { kind: _kind, ...span } = where
    let text: string
    try {
      text = spanText(span, readers.pages(nl(where.source)))
    } catch (error) {
      return fail((error as Error).message)
    }
    return { ...base, place: `page ${where.page}${where.column === undefined ? '' : `, column ${where.column}`}`, text }
  }
  if (where.kind === 'legal') {
    let text: string
    try {
      text = runningText(parseXml(readers.pages(nl(where.source)).pages[1]!), where.path)
    } catch (error) {
      return fail((error as Error).message)
    }
    if (text === '') return fail(`the element ${where.path} holds no running text`)
    return { ...base, place: where.place, text }
  }
  if (where.kind === 'note') {
    const noteOf = (source: string): PrintedItem => {
      const found = readers.contentLine(nl(source)).items.filter((item) => item.kind === 'text' && textOf(item.runs).startsWith(where.opens))
      if (found.length !== 1) return fail(`${found.length} loose texts of ${source === where.source ? 'the file' : source} open with "${where.opens}"`)
      return found[0]!
    }
    const note = noteOf(where.source)
    for (const other of where.alsoIn ?? []) if (textOf(noteOf(other).runs) !== textOf(note.runs)) fail(`${other} does not print the same note`)
    return { ...base, place: pagesOf([note]), text: textOf(note.runs) }
  }
  const content = readers.contentLine(nl(where.source))
  const label = content.columns[where.column - 1]
  if (label === undefined) return fail(`the file has no column ${where.column}`)
  const items = content.items.filter((item) => item.cluster === where.cluster && item.section === where.section && item.column === where.column && item.kind !== 'goal' && item.kind !== 'unmarked' && !isNote(item))
  if (items.length === 0) return fail(`column ${label} prints nothing under "${where.cluster}" and "${where.section}"`)
  // Each row after its label; an item with a mark after that mark; a block read as printed line by line.
  const lines: string[] = []
  let row: string | null = null
  for (const item of items) {
    if (item.label !== row && item.label !== '') lines.push(item.label)
    row = item.label
    const mark = item.kind === 'feature' ? '▪ ' : ''
    const held = where.asPrinted ? printedLines(item.runs, italics) : [textOf(item.runs)]
    held.forEach((line, index) => lines.push(`  ${index === 0 ? mark : mark === '' ? '' : '  '}${line}`))
  }
  // What the manifest says is set in bold is in the text read.
  const missing = (declared.bold ?? []).filter((item) => !letters(lines.join(' ')).includes(letters(item)))
  if (missing.length > 0) return fail(`the manifest lists as bold what column ${label} does not print: ${missing.map((item) => `"${item}"`).join(', ')}`)
  return { ...base, place: `${pagesOf(items)}, column ${label.replace(/\*$/, '')}`, text: lines.join('\n') }
}

const wordsOf = (text: string): Set<string> => new Set((bareHeading(text).toLowerCase().normalize('NFKD').match(/[a-z0-9]+/g) ?? []).filter((word) => word.length > 2))

// The heading bars a content-line PDF prints otherwise than the open data
// titles the clusters of a lane, and what it prints under a bar across the
// columns. One text per lane and PDF; none where the PDF and the data agree
// and the PDF prints nothing under its bars.
export function readHeadings(lanes: readonly Lane[], readers: Readers, reads: (source: string) => boolean): FrameTextRead[] {
  const found: FrameTextRead[] = []
  for (const lane of lanes) {
    const byPdf = new Map<string, { title: string; prefix: string }[]>()
    for (const part of lane.parts) {
      if (part.selection.kind !== 'data' || !reads(part.checkRendition)) continue
      for (const group of part.selection.groups) {
        const named = /^(.*) \(([^()]*)\)$/.exec(group.name.split(' / ').at(-1)!)
        if (named) byPdf.set(part.checkRendition, [...(byPdf.get(part.checkRendition) ?? []), { title: named[1]!, prefix: named[2]! }])
      }
    }
    for (const [pdf, clusters] of byPdf) {
      const content = readers.contentLine(pdf)
      const free = new Set(content.clusters)
      const pairs = new Map<(typeof clusters)[number], (typeof content.clusters)[number]>()
      for (const cluster of clusters) {
        const bar = [...free].find((each) => letters(bareHeading(each.title)) === letters(bareHeading(cluster.title)))
        if (!bar) continue
        pairs.set(cluster, bar)
        free.delete(bar)
      }
      // A bar worded otherwise: the one that shares most of its words with the title.
      for (const cluster of clusters) {
        if (pairs.has(cluster)) continue
        const mine = wordsOf(cluster.title)
        const scored = [...free]
          .map((bar) => {
            const theirs = wordsOf(bar.title)
            const shared = [...mine].filter((word) => theirs.has(word)).length
            return { bar, score: shared / Math.max(1, new Set([...mine, ...theirs]).size) }
          })
          .sort((a, b) => b.score - a.score)
        if (scored[0] && scored[0].score >= 0.5 && (scored[1]?.score ?? 0) < scored[0].score) {
          pairs.set(cluster, scored[0].bar)
          free.delete(scored[0].bar)
        }
      }
      const lines = clusters.flatMap((cluster) => {
        const bar = pairs.get(cluster)
        if (!bar) return [`(no heading bar of the PDF could be paired by script with "${cluster.title}", ${cluster.prefix})`]
        const differs = bar.title.trim() !== cluster.title.trim()
        if (!differs && bar.description === '') return []
        return [`${bar.title}${differs ? `  [the open data titles this cluster "${cluster.title}", ${cluster.prefix}]` : `  [${cluster.prefix}]`}`, ...(bar.description === '' ? [] : [`  ${bar.description}`])]
      })
      if (lines.length === 0) continue
      found.push({
        lanes: [`${lane.level}/${lane.subject}`],
        title: 'Cluster headings as the PDF prints them',
        about:
          'Listed where the PDF heads a cluster of this lane otherwise than the open data titles it, or prints a sentence under the heading across the three columns. The records carry the title of the data, in their code scope; what the PDF adds, such as "(vanaf groep 3)", holds for every goal of the cluster.',
        source: parseId(pdf)!.slug,
        place: pagesOf([...pairs.values()].map((bar) => ({ page: bar.page }) as PrintedItem)),
        text: lines.join('\n'),
      })
    }
  }
  return found
}

// The goals of a lane that hold an underlined term, PDF by PDF: one text per
// lane and content-line PDF that underlines a term in a goal of the lane.
// A goal read from the open data is named by its code, a statement read by
// locator by its group and code in the manifest. None when a reader for the
// underlines, the goals or the located statements is missing.
export function readUnderlinedGoals(lanes: readonly Lane[], readers: Readers, reads: (source: string) => boolean): FrameTextRead[] {
  const { underlined, goals, located } = readers
  if (!underlined || !goals || !located) return []
  const found: FrameTextRead[] = []
  for (const lane of lanes) {
    // Each PDF once, with the lines of every part of the lane that is read against it or from it.
    const byPdf = new Map<string, { lines: string[]; held: number; without: number; unjoined: string[] }>()
    const at = (pdf: string) => byPdf.get(pdf) ?? byPdf.set(pdf, { lines: [], held: 0, without: 0, unjoined: [] }).get(pdf)!
    for (const part of lane.parts) {
      if (part.selection.kind === 'data' && reads(part.checkRendition)) {
        const pdf = part.checkRendition
        const terms = underlined(pdf)
        if (terms.size === 0) continue
        const content = readers.contentLine(pdf)
        const { column } = columnOfLevel(content, part.selection, part.name, pdf)
        const mine = goals(lane, part)
        const { joined } = joinGoals(mine, statementsOf(content, column))
        const entry = at(pdf)
        for (const goal of mine) {
          const item = joined.find((each) => each.goal.id === goal.id)?.item
          if (!item) entry.unjoined.push(`\`${goal.code}\``)
          else if (terms.has(item)) {
            entry.lines.push(`${goal.code}: ${terms.get(item)!.join('; ')}`)
            entry.held += 1
          } else entry.without += 1
        }
      }
      if (part.selection.kind === 'statements' && reads(part.source)) {
        const terms = underlined(part.source)
        if (terms.size === 0) continue
        const content = readers.contentLine(part.source)
        const slug = parseId(part.source)!.slug
        const names = new Set(part.selection.statements.map((ref) => `${ref.group}\n${ref.code}`))
        for (const statement of located(lane).filter((each) => each.source === slug && names.has(`${each.group}\n${each.code}`))) {
          // A locator counts the column of labels as the first column.
          const item = content.items.find((each) => each.page === statement.page && each.column === (statement.column ?? 0) - 1 && letters(textOf(each.runs)).startsWith(letters(statement.first)))
          const entry = at(part.source)
          if (!item) entry.unjoined.push(`${statement.group}, ${statement.code}`)
          else if (terms.has(item)) {
            entry.lines.push(`${statement.group}, ${statement.code}: ${terms.get(item)!.join('; ')}`)
            entry.held += 1
          } else entry.without += 1
        }
      }
    }
    for (const [pdf, entry] of byPdf) {
      if (entry.lines.length === 0 && entry.unjoined.length === 0) continue
      found.push({
        lanes: [`${lane.level}/${lane.subject}`],
        title: 'Goals that hold an underlined term',
        about: [
          'The PDF underlines terms in its goals; its note, quoted in this section, says what the underlining refers to. Neither the open data nor a record marks an underlined term.',
          `Goals of this lane that this PDF prints: ${entry.held + entry.without + entry.unjoined.length}. With an underlined term: ${entry.held}, listed here, each by the code the data gives it (a statement the data lacks by its name in the manifest), then the term or terms as underlined, in the order of the page.`,
          'Read by script from the rules the PDF draws under its words. "(in part)" after a word says the rule runs under part of that word only; the word is given whole, since the box of a word does not tell which letters the rule covers.',
          ...(entry.unjoined.length === 0 ? [] : [`Not looked at, because the script could not join it to a statement of the PDF by its text: ${entry.unjoined.join(', ')}.`]),
        ].join(' '),
        source: parseId(pdf)!.slug,
        place: `column fase ${lane.level.replace(/^fase-/, '')}`,
        text: entry.lines.length === 0 ? '(none)' : entry.lines.join('\n'),
      })
    }
  }
  return found
}

// Every text: the declared ones in their order, then the headings and the goals with an underlined term, lane by lane.
export function readFrameTexts(declared: readonly FrameText[], lanes: readonly Lane[], readers: Readers, reads: (source: string) => boolean): FrameTextsFile {
  return { generated: GENERATED, texts: [...declared.map((each) => readFrameText(each, readers)), ...readHeadings(lanes, readers, reads), ...readUnderlinedGoals(lanes, readers, reads)] }
}

export function serialiseFrameTexts(file: FrameTextsFile): string {
  return `${JSON.stringify(file, null, 2)}\n`
}

// The content-line PDFs whose heading bars are compared with the data: those of a per-band line, the list of terms and spelling among them.
const isLinePdf = (source: string): boolean => /^edu\.nl\.source\.nl-slo-inhoudslijn-(?:rw|ojw|ne)-/.test(source) && !/overzicht|boekje/.test(source)

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== '--check')) {
    console.error('usage: node education/tools/frame-texts.ts [--check]')
    process.exit(2)
  }
  const education = resolve(import.meta.dirname, '..')
  const store = requireStore(storeRoot())
  const readers: Readers = {
    contentLine: once((id) => readContentLine(education, store, id)),
    pages: once((id) => readSource(planFor(id), store, { education })),
  }
  const repositoryOf = openData(education, store)
  readers.underlined = once((id) => readUnderlined(education, store, id, readers.contentLine(id)).terms)
  readers.goals = (lane, part) => goalsOfPart(lane, part, repositoryOf, NL_ADDITIONS)
  readers.located = (lane) => {
    const file = join(education, 'locators', lane.jurisdiction, lane.level, `${lane.subject}.json`)
    if (!existsSync(file)) return []
    const locator = JSON.parse(readFileSync(file, 'utf8')) as { records?: { group: string; code: string; spans?: { source: string; page: number; column?: number; first: string }[] }[] }
    return (locator.records ?? []).flatMap((record) => (record.spans ?? []).slice(0, 1).map((span) => ({ group: record.group, code: record.code, source: span.source, page: span.page, ...(span.column === undefined ? {} : { column: span.column }), first: span.first })))
  }
  let fresh: string
  try {
    fresh = serialiseFrameTexts(readFrameTexts(NL_FRAME_TEXTS, NL_LANES, readers, isLinePdf))
  } catch (error) {
    console.error(`education frame-texts failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
  const path = join(education, FRAME_TEXTS_FILE)
  const committed = existsSync(path) ? readFileSync(path, 'utf8') : null
  const count = (JSON.parse(fresh) as FrameTextsFile).texts.length
  if (args.includes('--check')) {
    if (committed !== fresh) {
      console.error(`education frame-texts failed: education/${FRAME_TEXTS_FILE} is missing or differs from what the tool reads in the sources. Run \`node education/tools/frame-texts.ts\`, then \`npm run education:frames\`, and commit the result.`)
      process.exit(1)
    }
    console.log(`education frame-texts passed: ${count} text(s) are as the sources print them`)
  } else {
    mkdirSync(dirname(path), { recursive: true })
    if (committed !== fresh) writeFileSync(path, fresh)
    console.log(`education frame-texts: ${count} text(s), ${committed === fresh ? 'unchanged' : committed === null ? 'file created' : 'file updated'}`)
  }
}
