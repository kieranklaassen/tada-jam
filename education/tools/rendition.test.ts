import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SourcePlan } from '../manifest.ts'
import { caSource, nlSource } from './fixtures.ts'
import type { OcrPage } from './ocr.ts'
import { composeRecord } from './record.ts'
import { COLUMN_BREAK, columnBounds, columnsOf, docxText, inColumns, pagesOf, parseBbox, readSource } from './rendition.ts'
import type { Box, Run } from './rendition.ts'
import { blobPath, clonePath, putBlob, putText } from './store.ts'

// Every text here is invented. No official wording belongs in a test.

// A word as pdftotext -bbox gives it: five points per letter, ten points tall.
const word = (text: string, x: number, y: number): Box => ({ text, xMin: x, yMin: y, xMax: x + text.length * 5, yMax: y + 10 })

// The words of one line of text, set from `x` with a space of three points.
function line(text: string, x: number, y: number): Box[] {
  const boxes: Box[] = []
  let at = x
  for (const piece of text.split(' ')) {
    boxes.push(word(piece, at, y))
    at += piece.length * 5 + 3
  }
  return boxes
}

// Lines of text set under each other from `y`, fourteen points apart.
const block = (lines: readonly string[], x: number, y: number): Box[] => lines.flatMap((text, index) => line(text, x, y + index * 14))

const LEFT = ['red apples sit', 'in the low bowl', 'by the door', 'every morning']
const MIDDLE = ['green pears hang', 'on the old tree', 'over the wall', 'every summer']
const RIGHT = ['blue plums fall', 'on the soft grass', 'near the gate', 'every autumn']

// A table of two columns under two lines set across its full width, as a
// decree prints its goals: a letter and a sentence on the left, lettered
// items on the right. The gutter finder allows one line to cross a gutter on
// a page this short, so it reads this page as one column.
const ACROSS = ['a first line that is set right across both columns of the table', 'and a second line that runs across the whole width as well']
const SENTENCE = ['the child sorts', 'red and green', 'fruit by colour', 'into bowls']
const ITEMS = ['a. naming each colour;', 'b. putting like with', 'like in one bowl;', 'c. telling what is left.']
// The table set with its right column starting at `x`: the letter of the sentence stands apart from it, as its own piece of the line.
const table = (x: number): Box[] => [...block(ACROSS, 40, 60), word('A.', 40, 100), ...block(SENTENCE, 60, 100), ...block(ITEMS, x, 100)]
const TABLE_LEFT = [...ACROSS, `A. ${SENTENCE[0]}`, ...SENTENCE.slice(1)].join('\n')

// The words of a page in the order a text layer may hold them: row by row
// across the columns, not column by column.
const acrossRows = (boxes: readonly Box[]): Box[] => boxes.slice().sort((a, b) => a.yMin - b.yMin || b.xMin - a.xMin)

describe('columns by word position', () => {
  it('reads a three-column page as three columns, each from top to bottom', () => {
    const page = acrossRows([...block(LEFT, 40, 100), ...block(MIDDLE, 240, 100), ...block(RIGHT, 440, 100)])
    expect(inColumns(page)).toEqual([LEFT.join('\n'), MIDDLE.join('\n'), RIGHT.join('\n')])
  })

  it('reads a page without a gutter as one column', () => {
    expect(inColumns(acrossRows(block(LEFT, 40, 100)))).toEqual([LEFT.join('\n')])
  })

  it('keeps two columns apart under a heading that runs across both', () => {
    const heading = line('a heading that is set right across the two columns below', 40, 60)
    const page = acrossRows([...heading, ...block(LEFT, 40, 100), ...block(MIDDLE, 240, 100)])
    expect(inColumns(page)).toEqual([`a heading that is set right across the two columns below\n${LEFT.join('\n')}`, MIDDLE.join('\n')])
  })

  it('assigns words to columns that start at given positions', () => {
    const page = [...block(LEFT, 40, 100), ...block(MIDDLE, 240, 100)]
    expect(columnBounds(page)).toHaveLength(1)
    expect(inColumns(page, [])).toHaveLength(1)
    expect(inColumns(page, [200])).toEqual([LEFT.join('\n'), MIDDLE.join('\n')])
  })

  it('splits a table that it reads as one column where it is told the second column starts', () => {
    const page = acrossRows(table(240))
    expect(columnBounds(page)).toEqual([])
    expect(inColumns(page)).toEqual([[...ACROSS, ...SENTENCE.map((text, index) => `${index === 0 ? 'A. ' : ''}${text} ${ITEMS[index]}`)].join('\n')])
    // A line set across the full width starts in the first column and stays whole there.
    expect(inColumns(page, [238])).toEqual([TABLE_LEFT, ITEMS.join('\n')])
  })
})

const bboxWord = (box: Box): string =>
  `    <word xMin="${box.xMin.toFixed(6)}" yMin="${box.yMin.toFixed(6)}" xMax="${box.xMax.toFixed(6)}" yMax="${box.yMax.toFixed(6)}">${box.text.replaceAll('&', '&amp;')}</word>`

// What pdftotext -bbox prints for these pages.
const bboxHtml = (pages: readonly (readonly Box[])[]): string =>
  `<html>\n<body>\n<doc>\n${pages.map((boxes) => `  <page width="600.000000" height="800.000000">\n${boxes.map(bboxWord).join('\n')}\n  </page>`).join('\n')}\n</doc>\n</body>\n</html>\n`

describe('the output of pdftotext -bbox', () => {
  it('gives the words of each page with their positions', () => {
    const pages = parseBbox(bboxHtml([[word('salt', 40, 100), word('&', 70, 100)], [], [word('pepper', 40, 100)]]))
    expect(pages).toEqual([[], [word('salt', 40, 100), word('&', 70, 100)], [], [word('pepper', 40, 100)]])
  })
})

describe('a word-processor file', () => {
  it('is read as its paragraphs, one per line, with table cells as paragraphs', () => {
    const xml =
      '<?xml version="1.0"?><w:document><w:body>' +
      '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Sharing a sn</w:t></w:r><w:r><w:t xml:space="preserve">ack &amp; a toy</w:t></w:r></w:p>' +
      '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>1.A.1.</w:t><w:tab/><w:t>Takes turns</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Waits &#8217;til asked</w:t></w:r></w:p></w:tc></w:tr></w:tbl>' +
      '<w:p/></w:body></w:document>'
    expect(docxText(xml)).toBe('Sharing a snack & a toy\n1.A.1.\tTakes turns\nWaits ’til asked\n')
  })
})

describe('a source read as pages of text', () => {
  let education: string
  let store: string

  beforeEach(() => {
    education = mkdtempSync(join(tmpdir(), 'education-rendition-'))
    store = mkdtempSync(join(tmpdir(), 'education-rendition-store-'))
    mkdirSync(join(education, 'sources'))
  })

  afterEach(() => {
    rmSync(education, { recursive: true, force: true })
    rmSync(store, { recursive: true, force: true })
  })

  // A source record for `bytes`, pinned and in the store, and the plan that reads it.
  function source(slug: string, bytes: Uint8Array, extraction: SourcePlan['extraction']): { plan: SourcePlan; pin: string } {
    const pin = putBlob(store, bytes)
    const id = `edu.us-ca.source.${slug}`
    writeFileSync(join(education, 'sources', `${slug}.md`), composeRecord({ ...caSource, id, pin }, 'An invented file.'))
    return { plan: { source: id, incomingKey: slug, file: 'file', extraction }, pin }
  }

  // A stand-in for the system tools: records each call and answers with `output`.
  function tool(output: string): { run: Run; calls: { command: string; args: readonly string[] }[] } {
    const calls: { command: string; args: readonly string[] }[] = []
    return { calls, run: (command, args) => (calls.push({ command, args }), Buffer.from(output)) }
  }

  it('splits a PDF read as text into its pages, counted from 1', () => {
    const { plan, pin } = source('example-pdf', Buffer.from('%PDF-1.7 invented'), { kind: 'pdf', mode: 'plain' })
    const { run, calls } = tool('first page\nsecond line\n\fsecond page\n\f')
    expect(pagesOf(plan, store, { education, run })).toEqual(['', 'first page\nsecond line\n', 'second page\n'])
    expect(calls).toEqual([{ command: 'pdftotext', args: [blobPath(store, pin), '-'] }])
  })

  it('reads a PDF in layout or raw mode with that flag', () => {
    for (const mode of ['layout', 'raw'] as const) {
      const { plan, pin } = source(`example-${mode}`, Buffer.from(`%PDF-1.7 invented ${mode}`), { kind: 'pdf', mode })
      const { run, calls } = tool('only page\n\f')
      expect(pagesOf(plan, store, { education, run })).toEqual(['', 'only page\n'])
      expect(calls[0]!.args).toEqual([`-${mode}`, blobPath(store, pin), '-'])
    }
  })

  it('reads a PDF by word position as its columns in order, and gives each column on its own', () => {
    const { plan, pin } = source('example-bbox', Buffer.from('%PDF-1.7 invented columns'), { kind: 'pdf', mode: 'bbox', columns: 'Two text columns.' })
    const { run, calls } = tool(bboxHtml([acrossRows([...block(LEFT, 40, 100), ...block(MIDDLE, 240, 100)]), block(RIGHT, 40, 100)]))
    const read = readSource(plan, store, { education, run })
    expect(read.pages).toEqual(['', LEFT.join('\n') + COLUMN_BREAK + MIDDLE.join('\n'), RIGHT.join('\n')])
    expect(read.columns).toEqual([[], [LEFT.join('\n'), MIDDLE.join('\n')], [RIGHT.join('\n')]])
    expect(columnsOf(plan, store, { education, run })).toEqual(read.columns)
    expect(calls[0]).toEqual({ command: 'pdftotext', args: ['-bbox', blobPath(store, pin), '-'] })
  })

  it('splits every page of a PDF read by word position where its plan says the columns start', () => {
    const pages = [acrossRows(table(240)), acrossRows(table(246)), block(ACROSS, 40, 60)]
    const columns = 'A table of two columns that nearly touch.'
    const { plan } = source('example-bounds', Buffer.from('%PDF-1.7 invented table'), { kind: 'pdf', mode: 'bbox', columns, bounds: [238] })
    const read = readSource(plan, store, { education, run: tool(bboxHtml(pages)).run })
    // The right column starts further right on the second page, and the third has no table.
    expect(read.columns).toEqual([[], [TABLE_LEFT, ITEMS.join('\n')], [TABLE_LEFT, ITEMS.join('\n')], [ACROSS.join('\n')]])
    expect(read.pages[1]).toBe(TABLE_LEFT + COLUMN_BREAK + ITEMS.join('\n'))

    // Without the positions the same file is read by its gutters, as before: each table page as one column.
    const found = source('example-gutters', Buffer.from('%PDF-1.7 invented table, no bounds'), { kind: 'pdf', mode: 'bbox', columns })
    expect(readSource(found.plan, store, { education, run: tool(bboxHtml(pages)).run }).columns!.map((page) => page.length)).toEqual([0, 1, 1, 1])
  })

  it('has no columns to give for a source that is not read by word position', () => {
    const { plan } = source('example-plain', Buffer.from('%PDF-1.7 invented plain'), { kind: 'pdf', mode: 'plain' })
    const { run } = tool('only page\n\f')
    expect(readSource(plan, store, { education, run }).columns).toBeUndefined()
    expect(() => columnsOf(plan, store, { education, run })).toThrow('not read by word position')
  })

  it('reads the named part of a word-processor file as one page', () => {
    const { plan, pin } = source('example-docx', Buffer.from('PK invented'), { kind: 'docx', part: 'word/document.xml' })
    const { run, calls } = tool('<w:document><w:body><w:p><w:r><w:t>Takes turns</w:t></w:r></w:p><w:p><w:r><w:t>Waits</w:t></w:r></w:p></w:body></w:document>')
    expect(pagesOf(plan, store, { education, run })).toEqual(['', 'Takes turns\nWaits\n'])
    expect(calls).toEqual([{ command: 'unzip', args: ['-p', blobPath(store, pin), 'word/document.xml'] }])
  })

  it('reads a text file as one page, whatever its encoding', () => {
    // "café" in Windows-1252: the last byte is not valid UTF-8.
    const { plan } = source('example-csv', Buffer.from([0x63, 0x61, 0x66, 0xe9]), { kind: 'text', format: 'csv', encoding: 'windows-1252' })
    expect(pagesOf(plan, store, { education })).toEqual(['', 'café'])
  })

  it('reads a regulation in XML as one page', () => {
    const { plan } = source('example-law', Buffer.from('<artikel><al>Een verzonnen lid over tellen.</al></artikel>'), { kind: 'legal-xml' })
    expect(pagesOf(plan, store, { education })).toEqual(['', '<artikel><al>Een verzonnen lid over tellen.</al></artikel>'])
  })

  it('reads a page that is pinned by its text as that text', () => {
    const pin = putText(store, 'Een verzonnen lid over tellen.', putBlob(store, Buffer.from('<html>stamped today: Een verzonnen lid over tellen.</html>')))
    const id = 'edu.nl.source.example-page'
    writeFileSync(join(education, 'sources', 'example-page.md'), composeRecord({ ...nlSource, id, pin }, 'An invented page.'))
    const plan: SourcePlan = { source: id, incomingKey: 'example-page', file: 'page.html', extraction: { kind: 'text', format: 'html', encoding: 'utf-8' } }
    expect(pagesOf(plan, store, { education })).toEqual(['', 'Een verzonnen lid over tellen.'])
  })

  it('reads a clone as its data files in name order, one page each', () => {
    const id = 'edu.nl.source.example-data'
    writeFileSync(join(education, 'sources', 'example-data.md'), composeRecord({ ...nlSource, id, pin_kind: 'git-commit', pin: 'a'.repeat(40) }, 'An invented repository.'))
    const data = join(clonePath(store, 'example-data'), 'data')
    mkdirSync(data, { recursive: true })
    writeFileSync(join(data, 'niveaus.json'), '[{"id":"n1"}]')
    writeFileSync(join(data, 'doelen.json'), '[{"id":"d1"}]')
    writeFileSync(join(data, 'README.md'), 'not data')
    const plan: SourcePlan = { source: id, incomingKey: 'example-data', file: 'repo', extraction: { kind: 'git', dataPath: 'data', format: 'json' } }
    expect(readSource(plan, store, { education })).toEqual({ pages: ['', '[{"id":"d1"}]', '[{"id":"n1"}]'], files: ['', 'doelen.json', 'niveaus.json'] })
  })

  it('says how to get a file that is not in the store', () => {
    const plan: SourcePlan = { source: 'edu.us-ca.source.example-missing', incomingKey: 'example-missing', file: 'file', extraction: { kind: 'pdf', mode: 'plain' } }
    writeFileSync(join(education, 'sources', 'example-missing.md'), composeRecord({ ...caSource, id: plan.source, pin: '' }, 'An invented file.'))
    expect(() => pagesOf(plan, store, { education })).toThrow('npm run education:fetch')
  })

  describe('an image-based PDF', () => {
    const OCR = { kind: 'pdf', mode: 'ocr', language: 'nl', text: 'Statements are drawn as images.' } as const
    const recognised = (boxes: readonly Box[]): OcrPage => ({ recogniser: 'invented', languages: ['nl-NL', 'en-US'], width: 600, height: 800, lines: boxes.map((box) => ({ ...box, confidence: 1 })) })
    // A recognised line: one box for the whole line.
    const lines = (texts: readonly string[], x: number, y: number): Box[] => texts.map((text, index) => word(text, x, y + index * 14))

    it('is read through text recognition, page by page, as columns', () => {
      const { plan } = source('example-card', Buffer.from('%PDF-1.7 invented card'), OCR)
      // No text layer at all: the columns come from the recognised lines.
      const { run } = tool(bboxHtml([[], []]))
      const asked: { page: number; languages: readonly string[] }[] = []
      const read = readSource(plan, store, {
        education,
        run,
        recognise: (_pdf, page, languages) => (asked.push({ page, languages }), recognised(page === 1 ? [...lines(MIDDLE, 340, 100), ...lines(LEFT, 40, 100)] : lines(RIGHT, 40, 100))),
      })
      // Dutch first, because the plan says the source is Dutch.
      expect(asked).toEqual([
        { page: 1, languages: ['nl-NL', 'en-US'] },
        { page: 2, languages: ['nl-NL', 'en-US'] },
      ])
      expect(read.columns).toEqual([[], [LEFT.join('\n'), MIDDLE.join('\n')], [RIGHT.join('\n')]])
      expect(read.pages[1]).toBe(LEFT.join('\n') + COLUMN_BREAK + MIDDLE.join('\n'))
    })

    it('takes its columns from the text layer where the page has one', () => {
      const { plan } = source('example-card-layer', Buffer.from('%PDF-1.7 invented card with bullets'), OCR)
      // The text layer holds only a bullet before each line. The picture also
      // holds five labels of a drawing that straddle the gutter, which would
      // hide it from the recognised lines alone. A recognised line takes in
      // its bullet, and its box starts a hair to the left of where the text
      // layer puts that bullet.
      const bullets = [40, 340].flatMap((x) => LEFT.map((_, index) => word('•', x, 100 + index * 14)))
      const { run } = tool(bboxHtml([bullets]))
      const labels = [0, 1, 2, 3, 4].map((index) => word('label of drawing', 300, 300 + index * 14))
      const page = recognised([...lines(LEFT, 37, 100), ...lines(MIDDLE, 337, 100), ...labels])
      const read = readSource(plan, store, { education, run, recognise: () => page })
      expect(read.columns![1]).toEqual([`${LEFT.join('\n')}\n${labels.map((label) => label.text).join('\n')}`, MIDDLE.join('\n')])
    })
  })
})
