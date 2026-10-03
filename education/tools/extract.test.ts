import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Lane, StatementRef } from '../manifest.ts'
import { US_CA_ADDITION_SOURCES } from '../manifest/us-ca-additions.ts'
import { US_CA_LANES } from '../manifest/us-ca.ts'
import { ANCHOR_SHARE_FROM, CORRECTION_REASONS, WORD_CAP, extractLane, extractLanes, formatExempt, listCorrections, locatorPath, spanText, validateLocator } from './extract.ts'
import type { ExtractFinding, LocatorEntry, LocatorSpan, PageProvider } from './extract.ts'
import { caSource, nlSource } from './fixtures.ts'
import { wordingHash } from './normalise.ts'
import { words } from './overlap.ts'
import { composeRecord, officialWording, parseRecord } from './record.ts'
import type { SourcePages } from './rendition.ts'
import { OFFICIAL_WORDING, SAME_FILE, pathForId } from './schema.ts'
import type { ObjectiveFrontmatter, SourceFrontmatter } from './schema.ts'
import { getWording } from './store.ts'

// Every wording, title and source here is invented. No official text belongs
// in a test: California's may not be committed at all.

const CA = 'example-counting-standards'
const NL = 'voorbeeld-rekendoelen'
const SORTING = 'Sorting / Strand 1.0: Buttons'
const FEELINGS = 'Feelings / Strand 1.0: Self'

// A lane of located statements read from one source.
// `pages` is null for a source without pages.
function lane(source: SourceFrontmatter, statements: readonly StatementRef[], pages: readonly (readonly [number, number])[] | null = [[1, 9]]): Lane {
  const california = source.jurisdiction === 'us-ca'
  return {
    jurisdiction: source.jurisdiction,
    level: california ? 'preschool-tk' : 'peuters',
    subject: 'mathematics',
    title: 'An invented lane',
    sources: [source.id],
    parts: [
      {
        name: 'Invented foundations',
        source: source.id,
        checkRendition: SAME_FILE,
        checkStrength: 'second-reading',
        checkGranularity: 'A second reading of the same file.',
        expectedCount: statements.length,
        selection: { kind: 'statements', ...(pages === null ? {} : { pages }), locate: 'The heading, then the statement.', statements },
      },
    ],
    expectedCount: statements.length,
    countingMethod: 'Headings in the invented file.',
    countIsFromImportFile: false,
    domains: [],
    granularity: 'One record is one foundation.',
    skipped: [],
  }
}

const ref = (code: string, group = SORTING, title?: string): StatementRef => ({ group, code, ...(title === undefined ? {} : { title }) })
const span = (page: number, first: string, last: string, more: Partial<LocatorSpan> = {}): LocatorSpan => ({ source: CA, page, first, last, ...more })
const entry = (code: string, spans: LocatorSpan[], more: Partial<LocatorEntry> = {}): LocatorEntry => ({ group: SORTING, code, spans, ...more })

let education: string
let store: string

beforeEach(() => {
  education = mkdtempSync(join(tmpdir(), 'education-extract-'))
  store = mkdtempSync(join(tmpdir(), 'education-extract-store-'))
  mkdirSync(join(education, 'sources'))
  for (const source of [caSource, nlSource]) writeFileSync(join(education, pathForId(source.id)!), composeRecord(source, 'An invented file.'))
})

afterEach(() => {
  rmSync(education, { recursive: true, force: true })
  rmSync(store, { recursive: true, force: true })
})

// The pages of the one source a test reads: `texts[0]` is page 1.
const pagesOf =
  (...texts: string[]): PageProvider =>
  () => ({ pages: ['', ...texts] })

function writeLocator(of: Lane, records: readonly LocatorEntry[]): void {
  const file = join(education, locatorPath(of))
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify({ lane: `${of.jurisdiction}/${of.level}/${of.subject}`, records }, null, 2)}\n`)
}

function run(of: Lane, records: readonly LocatorEntry[], pages: PageProvider) {
  writeLocator(of, records)
  return extractLane(of, { education, store, pages })
}

// The frontmatter and text of the one record a run wrote, and its wording from the store.
function written(file: string): { frontmatter: ObjectiveFrontmatter; text: string; wording: string | null } {
  const text = readFileSync(join(education, file), 'utf8')
  const frontmatter = parseRecord(text).frontmatter as unknown as ObjectiveFrontmatter
  return { frontmatter, text, wording: getWording(store, frontmatter.wording_sha256) }
}

const rules = (findings: readonly ExtractFinding[]): string[] => findings.map((finding) => finding.rule)

const BUTTONS = [
  'Sorting',
  '',
  'Foundation 1.1 Sorting Buttons',
  '',
  'Put the red buttons in one jar and the blue',
  'buttons in another jar.',
  '',
  'Examples',
  'A child drops buttons into two jars.',
].join('\n')

// Three pages of a table read by word position: a goal in column 1, its steps
// in column 2 with a footer under them. The first goal starts at the foot of
// column 1 of page 1 and ends at the top of column 1 of page 3; "on the table"
// stands once in each column of page 3.
const SPOON_COLUMNS: string[][] = [
  [],
  ['Goal:\nA. Sort the shells.\nB. Line up the spoons\nfrom the shortest,', 'The steps:\na. Wash the cups in\nthe warm water.\nb. Dry the cups.\nInvented Table 1'],
  ['then the middle one,', 'c. Hang the cloths on the line.\nInvented Table 2'],
  ['to the longest on the table.\nC. Stack the bowls.', 'd. Fold the cloths on the table.\nInvented Table 3'],
]
const SPOONS: PageProvider = (): SourcePages => ({ pages: SPOON_COLUMNS.map((columns) => columns.join('\n\f\n')), columns: SPOON_COLUMNS })

describe('one located statement', () => {
  it('is extracted as exactly the text between its bounding words', () => {
    const of = lane(caSource, [ref('1.1', SORTING, 'Sorting Buttons')])
    const result = run(of, [entry('1.1', [span(1, 'Put the red buttons', 'in another jar')])], pagesOf(BUTTONS))
    expect(result.findings).toEqual([])
    expect(result.written.map((record) => record.status)).toEqual(['created'])
    const record = written(result.written[0]!.file)
    expect(record.wording).toBe('Put the red buttons in one jar and the blue buttons in another jar.')
  })

  it('takes the punctuation that closes its last word and opens its first', () => {
    const of = lane(caSource, [ref('1.1')])
    const page = 'Say: "Match each cup (and each saucer)." Then stop.'
    const result = run(of, [entry('1.1', [span(1, 'match each', 'saucer')])], pagesOf(page))
    expect(written(result.written[0]!.file).wording).toBe('"Match each cup (and each saucer)."')
  })

  it('is given the frontmatter of its lane, its source and its statement', () => {
    const of = lane(caSource, [ref('1.1', SORTING, 'Sorting Buttons')])
    const result = run(of, [entry('1.1', [span(3, 'Put the red buttons', 'in another jar')])], pagesOf('', '', BUTTONS))
    expect(result.written[0]!.file).toBe('corpus/us-ca/preschool-tk/mathematics/objectives/sorting-strand-1-0-buttons-1-1.md')
    const { frontmatter } = written(result.written[0]!.file)
    expect(frontmatter).toEqual({
      id: 'edu.us-ca.preschool-tk.mathematics.objective.sorting-strand-1-0-buttons-1-1',
      kind: 'objective',
      title: '1.1, Sorting Buttons',
      jurisdiction: 'us-ca',
      level: 'preschool-tk',
      subject: 'mathematics',
      content_language: 'en',
      curriculum_version: caSource.version,
      status: 'draft',
      authority: 'official',
      code: '1.1',
      code_key: '1.1',
      code_scope: `${caSource.title}, ${SORTING}`,
      standing: caSource.standing,
      reuse_policy: 'description-only',
      source: caSource.id,
      locator: `page 3; ${SORTING}, 1.1`,
      wording_sha256: wordingHash('Put the red buttons in one jar and the blue buttons in another jar.'),
    })
  })

  it('has no code when its locator entry says the source prints none: what names it stands in its title and its locator', () => {
    const { written: results, findings } = run(lane(caSource, [ref('Jars / 2')]), [entry('Jars / 2', [span(1, 'Put the red', 'another jar')], { printed_code: false })], pagesOf(BUTTONS))

    expect(findings).toEqual([])
    expect(results[0]!.file).toBe('corpus/us-ca/preschool-tk/mathematics/objectives/sorting-strand-1-0-buttons-jars-2.md')
    expect(written(results[0]!.file).frontmatter).toMatchObject({ code: '', code_key: '', title: `${SORTING}, Jars / 2`, code_scope: `${caSource.title}, ${SORTING}`, locator: `page 1; ${SORTING}, Jars / 2` })
  })

  it("takes the locator's printed title before the manifest's, and the group when neither has one", () => {
    const of = lane(caSource, [ref('1.1', SORTING, 'Sorting Buttons'), ref('1.2')])
    const result = run(
      of,
      [entry('1.1', [span(1, 'Put the red buttons', 'in another jar')], { title: 'Sorting Buttons by Colour' }), entry('1.2', [span(1, 'A child', 'jars')])],
      pagesOf(BUTTONS),
    )
    expect(result.written.map((record) => written(record.file).frontmatter.title)).toEqual(['1.1, Sorting Buttons by Colour', `1.2, ${SORTING}`])
  })

  it('writes no wording into the record of a description-only lane: the wording is in the store', () => {
    const of = lane(caSource, [ref('1.1')])
    const result = run(of, [entry('1.1', [span(1, 'Put the red buttons', 'in another jar')])], pagesOf(BUTTONS))
    const record = written(result.written[0]!.file)
    expect(record.text).not.toContain(OFFICIAL_WORDING)
    for (const phrase of ['red buttons', 'one jar', 'another jar']) {
      expect(record.text).not.toContain(phrase)
      expect(record.wording).toContain(phrase)
    }
  })

  it('is written with its wording and a source line in a verbatim lane', () => {
    const of = lane(nlSource, [ref('1', 'Getallen / Telrij')])
    const page = 'Telrij\n• noemen van de namen van\ntelwoorden in een liedje\n• opzeggen van de telrij'
    const result = run(of, [{ group: 'Getallen / Telrij', code: '1', spans: [{ source: NL, page: 2, first: 'noemen van de namen van telwoorden', last: 'in een liedje' }] }], pagesOf('', page))
    expect(result.findings).toEqual([])
    const record = written(result.written[0]!.file)
    expect(record.frontmatter.content_language).toBe('nl')
    expect(record.frontmatter.regime).toBe(nlSource.regime)
    const section = parseRecord(record.text).sections.find((candidate) => candidate.heading === OFFICIAL_WORDING)!
    expect(officialWording(section.text)).toMatchObject({
      wording: 'noemen van de namen van telwoorden in een liedje',
      source: `Source: ${nlSource.publisher}, ${nlSource.title}, page 2.`,
    })
  })

  it('may run on to a later page', () => {
    const of = lane(caSource, [ref('1.1')])
    const pages = pagesOf('Line up the spoons from the shortest', 'Invented Foundations | 12\nto the longest on the table.\nExamples')
    const result = run(
      of,
      [entry('1.1', [span(1, 'Line up the spoons', 'on the table', { lastPage: 2, corrections: [{ from: 'Invented Foundations | 12', to: '', reason: 'running header or footer' }] })])],
      pages,
    )
    expect(result.findings).toEqual([])
    const record = written(result.written[0]!.file)
    expect(record.wording).toBe('Line up the spoons from the shortest to the longest on the table.')
    expect(record.frontmatter.locator).toBe(`pages 1-2; ${SORTING}, 1.1`)
  })

  it('may run on to a later page inside one column of a source read by word position', () => {
    const of = lane(caSource, [ref('1.1'), ref('1.2'), ref('1.3')])
    const result = run(
      of,
      [
        entry('1.1', [span(1, 'Line up the spoons', 'on the table', { column: 1, lastPage: 3 })]),
        entry('1.2', [span(1, 'Wash the', 'water', { column: 2 })]),
        entry('1.3', [span(3, 'Fold', 'the table', { column: 2 })]),
      ],
      SPOONS,
    )
    expect(result.findings).toEqual([])
    const [spoons, cups, cloths] = result.written.map((record) => written(record.file))
    expect(spoons!.wording).toBe('Line up the spoons from the shortest, then the middle one, to the longest on the table.')
    expect(spoons!.frontmatter.locator).toBe(`pages 1-3; ${SORTING}, 1.1`)
    expect(cups!.wording).toBe('Wash the cups in the warm water.')
    expect(cloths!.wording).toBe('Fold the cloths on the table.')
  })

  it('names no page when its source has none', () => {
    const of = lane(caSource, [ref('1.A.1', 'Early Elementary')], null)
    const result = run(of, [{ group: 'Early Elementary', code: '1.A.1', spans: [span(1, 'Takes turns', 'a friend')] }], pagesOf('1.A.1.Takes turns with a toy and a friend.\n1.A.2. Waits.'))
    const record = written(result.written[0]!.file)
    expect(record.wording).toBe('Takes turns with a toy and a friend.')
    expect(record.frontmatter.locator).toBe('Early Elementary, 1.A.1')
  })
})

describe('one span read on its own', () => {
  const page: SourcePages = { pages: ['', BUTTONS], columns: [[], ['Sorting', 'Put the red buttons in one jar and the blue\nbuttons in an-\nother jar. Put the green ones away.']] }

  it('is the text between its bounding words, with its closing punctuation, read on a page or in a column, and corrected', () => {
    expect(spanText(span(1, 'Put the red', 'another jar'), page)).toBe('Put the red buttons in one jar and the blue buttons in another jar.')
    expect(spanText(span(1, 'Put the red', 'other jar', { column: 2, corrections: [{ from: 'an- other', to: 'another', reason: 'line-break hyphen' }] }), page)).toBe('Put the red buttons in one jar and the blue buttons in another jar.')
  })

  it('throws where the extraction of a lane would report a finding', () => {
    expect(() => spanText(span(1, 'Put the yellow', 'another jar'), page)).toThrow(/the first anchor is not on page 1/)
    expect(() => spanText(span(1, 'Put the', 'jar', { column: 2 }), page)).toThrow(/occurs 2 times on page 1, column 2/)
    expect(() => spanText(span(1, 'another jar', 'Put the red'), page)).toThrow(/ends before/)
    expect(() => spanText(span(3, 'Put the red', 'another jar'), page)).toThrow(/has no page 3/)
    expect(() => spanText(span(1, 'Put the red', 'another jar', { corrections: [{ from: 'plums', to: 'pears', reason: 'ligature or glyph' }] }), page)).toThrow(/correction 1 is not in the located text/)
    expect(() => spanText(span(1, 'Put the red', 'another jar', { lastPage: 2 }), page)).toThrow(/stays on one page/)
  })
})

describe('bounding words', () => {
  it('that are not on the stated page fail, and the finding names the locator', () => {
    const of = lane(caSource, [ref('1.1')])
    const result = run(of, [entry('1.1', [span(2, 'Put the red buttons', 'in another jar')])], pagesOf(BUTTONS, 'Another page.'))
    expect(result.written).toEqual([])
    // One finding for each anchor.
    expect(result.findings).toHaveLength(2)
    for (const finding of result.findings) {
      expect(finding).toMatchObject({ rule: 'anchor-not-found', lane: 'us-ca/preschool-tk/mathematics', group: SORTING, code: '1.1', file: 'locators/us-ca/preschool-tk/mathematics.json' })
      expect(finding.message).toContain('page 2')
    }
    expect(existsSync(join(education, 'corpus'))).toBe(false)
  })

  it('that occur twice on the page fail without an occurrence number', () => {
    const of = lane(caSource, [ref('1.1')])
    const page = 'Count three cups and set them on the low shelf.\nCount ten cups and set them on the low shelf.'
    const result = run(of, [entry('1.1', [span(1, 'Count three cups', 'the low shelf')])], pagesOf(page))
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ rule: 'anchor-ambiguous', group: SORTING, code: '1.1' })
    expect(result.findings[0]!.message).toContain('2 times')
  })

  it('that occur twice extract the right one with the occurrence number', () => {
    const of = lane(caSource, [ref('1.1'), ref('1.2')])
    const page = 'Count three cups and set them on the low shelf.\nCount ten cups and set them on the low shelf.'
    const result = run(
      of,
      [entry('1.1', [span(1, 'Count three', 'the low shelf', { lastOccurrence: 1 })]), entry('1.2', [span(1, 'Count ten', 'the low shelf', { lastOccurrence: 2 })])],
      pagesOf(page),
    )
    expect(result.findings).toEqual([])
    expect(result.written.map((record) => written(record.file).wording)).toEqual(['Count three cups and set them on the low shelf.', 'Count ten cups and set them on the low shelf.'])
  })

  it('whose last comes before the first fail', () => {
    const of = lane(caSource, [ref('1.1')])
    const result = run(of, [entry('1.1', [span(1, 'in another jar', 'Put the red buttons')])], pagesOf(BUTTONS))
    expect(rules(result.findings)).toEqual(['anchors-reversed'])
  })

  it('of five words fail in a description-only lane', () => {
    const of = lane(caSource, [ref('1.1')])
    const result = run(of, [entry('1.1', [span(1, 'Put the red buttons in', 'in another jar')])], pagesOf(BUTTONS))
    expect(result.written).toEqual([])
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ rule: 'anchor-too-long', group: SORTING, code: '1.1' })
  })

  it('of any length pass in a verbatim lane', () => {
    const of = lane(nlSource, [ref('1')])
    const result = run(of, [{ group: SORTING, code: '1', spans: [{ source: NL, page: 1, first: 'Leg de rode knopen in de pot', last: 'in de andere pot' }] }], pagesOf('Leg de rode knopen in de pot en de blauwe in de andere pot.'))
    expect(result.findings).toEqual([])
  })

  it('that together hold more than half of the words they locate fail in a description-only lane', () => {
    const of = lane(caSource, [ref('1.1')])
    // Fourteen words. Each anchor is within the cap of four, and the two hold eight of them.
    const result = run(of, [entry('1.1', [span(1, 'Put the red buttons', 'buttons in another jar')])], pagesOf(BUTTONS))
    expect(result.written).toEqual([])
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ rule: 'anchors-over-half', lane: 'us-ca/preschool-tk/mathematics', group: SORTING, code: '1.1', file: 'locators/us-ca/preschool-tk/mathematics.json' })
    expect(result.findings[0]!.message).toContain('the two anchors of span 1 together hold 8 of the 14 words they locate, more than half')
    expect(existsSync(join(education, 'corpus'))).toBe(false)
  })

  it('that together hold exactly half pass, and so do shorter ones that find the same place', () => {
    const of = lane(caSource, [ref('1.1')])
    for (const [first, last] of [
      ['Put the red buttons', 'in another jar'],
      ['Put the', 'another jar'],
      ['Put', 'jar'],
    ] as const) {
      const result = run(of, [entry('1.1', [span(1, first, last, last === 'jar' ? { lastOccurrence: 2 } : {})])], pagesOf(BUTTONS))
      expect(result.findings, `${first} ... ${last}`).toEqual([])
      expect(written(result.written[0]!.file).wording).toBe('Put the red buttons in one jar and the blue buttons in another jar.')
    }
  })

  it('are counted once where the two share words', () => {
    const of = lane(caSource, [ref('1.1')])
    const page = 'Stack six red cups. Then rest.'
    const result = run(of, [entry('1.1', [span(1, 'Stack six red', 'six red cups')])], pagesOf(page))
    expect(rules(result.findings)).toEqual(['anchors-over-half'])
    expect(result.findings[0]!.message).toContain('hold 4 of the 4 words')
  })

  it('are held to that rule from a located text of four words: one word at each end passes, and three of the four fail', () => {
    expect(ANCHOR_SHARE_FROM).toBe(4)
    const of = lane(caSource, [ref('1.1')])
    const page = 'Stack six red cups. Then rest. Count the cups.'
    const result = run(of, [entry('1.1', [span(1, 'Stack', 'cups', { lastOccurrence: 1 })])], pagesOf(page))
    expect(result.findings).toEqual([])
    expect(result.exempt).toEqual([])
    expect(written(result.written[0]!.file).wording).toBe('Stack six red cups.')
    const over = run(of, [entry('1.1', [span(1, 'Stack six', 'cups', { lastOccurrence: 1 })])], pagesOf(page))
    expect(rules(over.findings)).toEqual(['anchors-over-half'])
    expect(over.findings[0]!.message).toContain('hold 3 of the 4 words')
    expect(over.exempt).toEqual([])
  })

  it('are exempt from it on a located text of three words or fewer, which no anchors can bound with half: the span is named in the result', () => {
    const of = lane(caSource, [ref('1.1')])
    const page = 'Stack six red cups. Then rest. Count the cups.'
    // Three words: one word at each end is two of three.
    const three = run(of, [entry('1.1', [span(1, 'Count', 'cups', { lastOccurrence: 2 })])], pagesOf(page))
    expect(three.findings).toEqual([])
    expect(three.exempt).toEqual([{ group: SORTING, code: '1.1', span: 'span 1', words: 3, held: 2 }])
    expect(written(three.written[0]!.file).wording).toBe('Count the cups.')
    // Two words that are both anchors, as a table cell of two words is located, and one word that is both.
    const two = run(of, [entry('1.1', [span(1, 'Then rest', 'Then rest', { label: 'Earlier, 3 to 4 Years' })])], pagesOf(page))
    expect(two.findings).toEqual([])
    expect(two.exempt).toEqual([{ group: SORTING, code: '1.1', span: 'span 1 (Earlier, 3 to 4 Years)', words: 2, held: 2 }])
    expect(run(of, [entry('1.1', [span(1, 'rest', 'rest')])], pagesOf(page)).exempt).toEqual([{ group: SORTING, code: '1.1', span: 'span 1', words: 1, held: 1 }])
    // What the command prints for one: the lane, the entry, the span and the two numbers, and no word of the text.
    const line = formatExempt(two.lane, two.exempt[0]!)
    expect(line).toBe(`us-ca/preschool-tk/mathematics: ${SORTING}, 1.1, span 1 (Earlier, 3 to 4 Years): locates 2 word(s), fewer than 4, so its anchors hold 2 of them and the rule on the share of the anchors does not apply`)
    expect(line).not.toMatch(/then|rest/i)
    // The cap of four words an anchor holds for it all the same.
    expect(rules(run(of, [entry('1.1', [span(1, 'Then rest Count the cups', 'rest')])], pagesOf(page)).findings)).toEqual(['anchor-too-long'])
  })

  it('name no span as exempt in a verbatim lane, however short the text', () => {
    const of = lane(nlSource, [ref('1')])
    const result = run(of, [{ group: SORTING, code: '1', spans: [{ source: NL, page: 1, first: 'Tel', last: 'peren' }] }], pagesOf('Tel de peren. En dan?'))
    expect(result.findings).toEqual([])
    expect(result.exempt).toEqual([])
  })

  it('are measured against each span by itself, and the finding names the span', () => {
    const of = lane(caSource, [ref('1.1')])
    const page = 'Put the red buttons in one jar.\nPut buttons of many colours into jars and say how each jar was chosen.'
    const long = span(1, 'Put buttons', 'was chosen', { label: 'Later, 4 to 5 Years' })
    const result = run(of, [entry('1.1', [span(1, 'Put the red', 'in one jar', { label: 'Earlier, 3 to 4 Years' }), long])], pagesOf(page))
    expect(rules(result.findings)).toEqual(['anchors-over-half'])
    expect(result.findings[0]!.message).toContain('the two anchors of span 1 (Earlier, 3 to 4 Years) together hold 6 of the 7 words')
  })

  it('are measured against the whole of a span that runs over pages', () => {
    const of = lane(caSource, [ref('1.1')])
    const pages = pagesOf('Line up the spoons', 'on the table.\nExamples')
    const result = run(of, [entry('1.1', [span(1, 'Line up the spoons', 'on the table', { lastPage: 2 })])], pages)
    expect(rules(result.findings)).toEqual(['anchors-over-half'])
    expect(result.findings[0]!.message).toContain('hold 7 of the 7 words')
    expect(run(of, [entry('1.1', [span(1, 'Line up', 'table', { lastPage: 2 })])], pages).findings).toEqual([])
  })

  it('that hold the whole of a statement pass in a verbatim lane', () => {
    const of = lane(nlSource, [ref('1')])
    const result = run(of, [{ group: SORTING, code: '1', spans: [{ source: NL, page: 1, first: 'Leg de rode knopen', last: 'in de pot' }] }], pagesOf('Leg de rode knopen in de pot. En dan?'))
    expect(result.findings).toEqual([])
  })

  it('are read in one column of a page that is read by word position', () => {
    const of = lane(caSource, [ref('1.1'), ref('1.2')])
    const columns = ['1. Stack the small cups on the tray.', '1. Stack the big bowls on the tray.']
    const pages: PageProvider = (): SourcePages => ({ pages: ['', columns.join('\n\f\n')], columns: [[], columns] })
    const result = run(of, [entry('1.1', [span(1, 'Stack', 'the tray', { column: 1 })]), entry('1.2', [span(1, 'Stack', 'the tray', { column: 2 })])], pages)
    expect(result.findings).toEqual([])
    expect(result.written.map((record) => written(record.file).wording)).toEqual(['Stack the small cups on the tray.', 'Stack the big bowls on the tray.'])
  })
})

describe('two spans that overlap', () => {
  it('fail, and the finding names both locators', () => {
    const of = lane(caSource, [ref('1.1'), ref('1.2')])
    const result = run(of, [entry('1.1', [span(1, 'Put the red buttons', 'in another jar')]), entry('1.2', [span(1, 'the blue buttons', 'two jars')])], pagesOf(BUTTONS))
    expect(result.written).toEqual([])
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ rule: 'spans-overlap', group: SORTING, code: '1.2' })
    expect(result.findings[0]!.message).toContain('1.1')
  })

  it('fail when one is in a column and the other is read across the same page', () => {
    const of = lane(caSource, [ref('1.1'), ref('1.2')])
    const columns = ['Stack the small cups.', 'Wash the big bowls.']
    const pages: PageProvider = () => ({ pages: ['', columns.join('\n\f\n')], columns: [[], columns] })
    const result = run(of, [entry('1.1', [span(1, 'small', 'big')]), entry('1.2', [span(1, 'Wash', 'bowls', { column: 2 })])], pages)
    expect(rules(result.findings)).toEqual(['spans-overlap'])
  })

  it('do not when each runs over the same pages in a column of its own', () => {
    const of = lane(caSource, [ref('1.1'), ref('1.2')])
    const result = run(
      of,
      [entry('1.1', [span(1, 'Line up the spoons', 'on the table', { column: 1, lastPage: 3 })]), entry('1.2', [span(1, 'Dry the cups', 'on the table', { column: 2, lastPage: 3 })])],
      SPOONS,
    )
    expect(result.findings).toEqual([])
    expect(written(result.written[0]!.file).wording).toBe('Line up the spoons from the shortest, then the middle one, to the longest on the table.')
    expect(written(result.written[1]!.file).wording).toBe('Dry the cups. Invented Table 1 c. Hang the cloths on the line. Invented Table 2 d. Fold the cloths on the table.')
  })

  it('fail when one runs over pages in a column and the other lies in that column of a page it crosses', () => {
    const of = lane(caSource, [ref('1.1'), ref('1.2')])
    const crossing = entry('1.1', [span(1, 'Line up the spoons', 'on the table', { column: 1, lastPage: 3 })])
    for (const [page, first, last] of [
      [1, 'spoons', 'shortest'],
      [2, 'then', 'one'],
      [3, 'to', 'table'],
    ] as const) {
      const result = run(of, [crossing, entry('1.2', [span(page, first, last, { column: 1 })])], SPOONS)
      expect(rules(result.findings)).toEqual(['spans-overlap'])
    }
    // What stands in that column before its first word, or after its last, is free.
    for (const [page, first, last] of [
      [1, 'Goal', 'shells'],
      [3, 'C', 'bowls'],
    ] as const) {
      expect(run(of, [crossing, entry('1.2', [span(page, first, last, { column: 1 })])], SPOONS).findings).toEqual([])
    }
  })

  it('fail when one runs over pages in a column and the other is read across a page it crosses', () => {
    const of = lane(caSource, [ref('1.1'), ref('1.2')])
    const result = run(of, [entry('1.1', [span(1, 'Line up the spoons', 'on the table', { column: 1, lastPage: 3 })]), entry('1.2', [span(2, 'middle', 'cloths')])], SPOONS)
    expect(rules(result.findings)).toEqual(['spans-overlap'])
  })
})

describe('a correction', () => {
  const PAGE = 'Match the cups oneto-one with the saucers on the shelf.'

  it('turns the broken form a line-break hyphen leaves into the printed one', () => {
    const of = lane(caSource, [ref('1.1')])
    const result = run(of, [entry('1.1', [span(1, 'Match the', 'on the shelf', { corrections: [{ from: 'oneto-one', to: 'one-to-one', reason: 'line-break hyphen' }] })])], pagesOf(PAGE))
    expect(result.findings).toEqual([])
    expect(written(result.written[0]!.file).wording).toBe('Match the cups one-to-one with the saucers on the shelf.')
  })

  it('left out leaves the broken form', () => {
    const of = lane(caSource, [ref('1.1')])
    const result = run(of, [entry('1.1', [span(1, 'Match the', 'on the shelf')])], pagesOf(PAGE))
    expect(written(result.written[0]!.file).wording).toBe('Match the cups oneto-one with the saucers on the shelf.')
  })

  it('whose text is not in the located span fails, and the finding names the locator', () => {
    const of = lane(caSource, [ref('1.1')])
    const result = run(of, [entry('1.1', [span(1, 'Match the', 'on the shelf', { corrections: [{ from: 'twoto-two', to: 'two-to-two', reason: 'line-break hyphen' }] })])], pagesOf(PAGE))
    expect(result.written).toEqual([])
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ rule: 'correction-not-found', lane: 'us-ca/preschool-tk/mathematics', group: SORTING, code: '1.1' })
  })

  it('changes one place, so a form that is broken twice is corrected twice', () => {
    const of = lane(caSource, [ref('1.1')])
    const page = 'Match cups oneto-one and spoons oneto-one on the shelf.'
    const fix = { from: 'oneto-one', to: 'one-to-one', reason: 'line-break hyphen' } as const
    const once = run(of, [entry('1.1', [span(1, 'Match cups', 'on the shelf', { corrections: [fix] })])], pagesOf(page))
    expect(written(once.written[0]!.file).wording).toBe('Match cups one-to-one and spoons oneto-one on the shelf.')
    const twice = run(of, [entry('1.1', [span(1, 'Match cups', 'on the shelf', { corrections: [fix, fix] })])], pagesOf(page))
    expect(written(twice.written[0]!.file).wording).toBe('Match cups one-to-one and spoons one-to-one on the shelf.')
  })

  it('longer than four words fails in a description-only lane', () => {
    const of = lane(caSource, [ref('1.1')])
    const long = { from: 'cups oneto-one with the saucers', to: 'cups one-to-one with saucers', reason: 'line-break hyphen' } as const
    const result = run(of, [entry('1.1', [span(1, 'Match the', 'on the shelf', { corrections: [long] })])], pagesOf(PAGE))
    expect(rules(result.findings)).toEqual(['correction-too-long'])
  })

  it('is listed for its lane', () => {
    const of = lane(caSource, [ref('1.1'), ref('1.2')])
    const fix = { from: 'oneto-one', to: 'one-to-one', reason: 'line-break hyphen' } as const
    writeLocator(of, [entry('1.1', [span(4, 'Match the cups', 'on the shelf', { label: 'Earlier, 3 to 4 years', corrections: [fix] })]), entry('1.2', [span(5, 'Count', 'cups')])])
    expect(listCorrections(education, [of, lane(nlSource, [ref('1')])])).toEqual([
      { lane: 'us-ca/preschool-tk/mathematics', corrections: [{ group: SORTING, code: '1.1', label: 'Earlier, 3 to 4 years', source: CA, page: 4, ...fix }] },
      { lane: 'nl/peuters/mathematics', corrections: [] },
    ])
  })
})

describe('a record of several spans', () => {
  it('holds an earlier and a later age statement, each labelled with its age band', () => {
    const of = lane(caSource, [ref('1.1', SORTING, 'Sorting Buttons')])
    const page = [
      'Foundation 1.1 Sorting Buttons',
      'Earlier',
      '3 to 4 Years',
      'Later',
      '4 to 5 Years',
      'Put the red buttons in one jar.',
      'Put buttons of many colours into jars and say how each jar was chosen.',
      'Earlier Examples',
    ].join('\n')
    const result = run(
      of,
      [entry('1.1', [span(1, 'Put the', 'jar', { label: 'Earlier, 3 to 4 Years', lastOccurrence: 1 }), span(1, 'Put buttons', 'was chosen', { label: 'Later, 4 to 5 Years' })])],
      pagesOf(page),
    )
    expect(result.findings).toEqual([])
    expect(result.written).toHaveLength(1)
    const record = written(result.written[0]!.file)
    expect(record.wording).toBe('Earlier, 3 to 4 Years: Put the red buttons in one jar.\n\nLater, 4 to 5 Years: Put buttons of many colours into jars and say how each jar was chosen.')
    expect(record.frontmatter.age_band).toBe('Earlier, 3 to 4 Years; Later, 4 to 5 Years')
  })

  it('holds a foundation statement and its labelled indicator', () => {
    const of = lane(caSource, [ref('1.1', FEELINGS, 'Knowing Your Own Name')])
    const page = [
      'Foundation 1.1: Knowing Your Own Name',
      'Children come to know who they are.',
      'In the first months, a baby turns to a voice.',
      '4 through 11 months',
      '11 through 23 months',
      '23 through 36 months',
      'Children look up at their name.',
      'Children say their name.',
      'Children tell a friend their name and their age.',
      'Examples',
    ].join('\n')
    const result = run(
      of,
      [{ group: FEELINGS, code: '1.1', spans: [span(7, 'Children come', 'are'), span(7, 'Children tell', 'their age', { label: '23 through 36 months' })] }],
      pagesOf('', '', '', '', '', '', page),
    )
    expect(result.findings).toEqual([])
    const record = written(result.written[0]!.file)
    expect(record.wording).toBe('Children come to know who they are.\n\n23 through 36 months: Children tell a friend their name and their age.')
    expect(record.frontmatter.age_band).toBe('23 through 36 months')
    expect(record.frontmatter.locator).toBe(`page 7; ${FEELINGS}, 1.1`)
  })

  it('has no age band when no label names an age', () => {
    const of = lane(caSource, [ref('1.1')])
    const result = run(of, [entry('1.1', [span(1, 'Put the red buttons', 'in another jar', { label: 'Statement' })])], pagesOf(BUTTONS))
    const record = written(result.written[0]!.file)
    expect(record.wording).toBe('Statement: Put the red buttons in one jar and the blue buttons in another jar.')
    expect(record.frontmatter.age_band).toBeUndefined()
  })
})

describe('the statements of a lane and its locator entries', () => {
  const PAGE = 'Children say their name.\nChildren hold a picture of a cup in mind.'

  it('give distinct ids where the numbering restarts in a new domain', () => {
    const memory = 'Thinking / Strand 1.0: Memory'
    const of = lane(caSource, [ref('1.1', FEELINGS), ref('1.1', memory)])
    const result = run(
      of,
      [
        { group: FEELINGS, code: '1.1', spans: [span(1, 'Children', 'name', { firstOccurrence: 1 })] },
        { group: memory, code: '1.1', spans: [span(1, 'Children hold', 'in mind')] },
      ],
      pagesOf(PAGE),
    )
    expect(result.findings).toEqual([])
    const records = result.written.map((record) => written(record.file).frontmatter)
    expect(records.map((record) => record.id)).toEqual([
      'edu.us-ca.preschool-tk.mathematics.objective.feelings-strand-1-0-self-1-1',
      'edu.us-ca.preschool-tk.mathematics.objective.thinking-strand-1-0-memory-1-1',
    ])
    expect(records.map((record) => record.code)).toEqual(['1.1', '1.1'])
    expect(records.map((record) => record.code_scope)).toEqual([`${caSource.title}, ${FEELINGS}`, `${caSource.title}, ${memory}`])
  })

  it('fail the count check when a statement has no locator entry', () => {
    const of = lane(caSource, [ref('1.1', FEELINGS), ref('1.2', FEELINGS)])
    const result = run(of, [{ group: FEELINGS, code: '1.1', spans: [span(1, 'Children', 'name', { firstOccurrence: 1 })] }], pagesOf(PAGE))
    expect(result.written).toEqual([])
    expect(rules(result.findings)).toEqual(['locator-missing', 'part-count'])
    expect(result.findings[0]).toMatchObject({ group: FEELINGS, code: '1.2' })
    expect(result.findings[1]!.message).toContain('holds 1')
    expect(result.findings[1]!.message).toContain('expects 2')
  })

  it('fail when an entry is for no statement of the lane, or a statement has two', () => {
    const of = lane(caSource, [ref('1.1', FEELINGS)])
    const one = { group: FEELINGS, code: '1.1', spans: [span(1, 'Children', 'name', { firstOccurrence: 1 })] }
    const result = run(of, [one, { ...one, spans: [span(1, 'Children hold', 'in mind')] }, { ...one, code: '9.9' }], pagesOf(PAGE))
    expect(rules(result.findings).sort()).toEqual(['locator-duplicate', 'locator-unknown', 'part-count'])
  })

  it('fail when a span names another source than the one its part is read from', () => {
    const of = lane(caSource, [ref('1.1', FEELINGS)])
    const result = run(of, [{ group: FEELINGS, code: '1.1', spans: [{ ...span(1, 'Children', 'name', { firstOccurrence: 1 }), source: NL }] }], pagesOf(PAGE))
    expect(rules(result.findings)).toEqual(['span-source'])
  })

  it('fail when the lane has no locator file', () => {
    const result = extractLane(lane(caSource, [ref('1.1')]), { education, store, pages: pagesOf(PAGE) })
    expect(rules(result.findings)).toEqual(['locator-file-missing'])
  })

  it('write nothing on a second run that changes nothing', () => {
    const of = lane(caSource, [ref('1.1', FEELINGS)])
    const records = [{ group: FEELINGS, code: '1.1', spans: [span(1, 'Children', 'name', { firstOccurrence: 1 })] }]
    run(of, records, pagesOf(PAGE))
    expect(run(of, records, pagesOf(PAGE)).written.map((record) => record.status)).toEqual(['unchanged'])
  })
})

describe('a California addition', () => {
  const of = (): Lane => lane(caSource, [ref('1.1'), ref('1.2')])
  const records = (first: Partial<LocatorEntry> = {}): LocatorEntry[] => [entry('1.1', [span(1, 'Put the red buttons', 'in another jar')], first), entry('1.2', [span(1, 'A child', 'jars')])]
  const additions = (result: ReturnType<typeof extractLane>): unknown[] => result.written.map((record) => written(record.file).frontmatter.california_addition)

  it('is marked on the record of the entry that says so, and every other record read from a source that marks additions says it is none', () => {
    writeLocator(of(), records({ california_addition: true }))
    const result = extractLane(of(), { education, store, pages: pagesOf(BUTTONS), additionSources: [caSource.id] })
    expect(result.findings).toEqual([])
    expect(additions(result)).toEqual([true, false])
    // The field is the importer's: it sits where an imported record has it, and the wording is as it was.
    const { frontmatter, wording } = written(result.written[0]!.file)
    expect(Object.keys(frontmatter).slice(-7)).toEqual(['code_scope', 'california_addition', 'standing', 'reuse_policy', 'source', 'locator', 'wording_sha256'])
    expect(wording).toBe('Put the red buttons in one jar and the blue buttons in another jar.')
  })

  it('is no field of a record read from a source that marks none', () => {
    const result = run(of(), records(), pagesOf(BUTTONS))
    expect(result.findings).toEqual([])
    expect(additions(result)).toEqual([undefined, undefined])
  })

  it('is added to records that exist, and their wording hash and file stay as they were', () => {
    const before = run(of(), records(), pagesOf(BUTTONS)).written.map((record) => written(record.file).frontmatter)
    writeLocator(of(), records({ california_addition: true }))
    const result = extractLane(of(), { education, store, pages: pagesOf(BUTTONS), additionSources: [caSource.id] })
    expect(result.written.map((record) => record.status)).toEqual(['updated', 'updated'])
    expect(result.written.map((record) => written(record.file).frontmatter)).toEqual([
      { ...before[0], california_addition: true },
      { ...before[1], california_addition: false },
    ])
  })

  it('cannot be marked on an entry whose source marks none, and nothing is written', () => {
    const result = run(of(), records({ california_addition: true }), pagesOf(BUTTONS))
    expect(rules(result.findings)).toEqual(['addition-not-marked'])
    expect(result.findings[0]).toMatchObject({ group: SORTING, code: '1.1' })
    expect(result.written).toEqual([])
  })

  it('cannot be marked outside California, whatever the source', () => {
    const dutch = lane(nlSource, [ref('1.1')])
    writeLocator(dutch, [{ ...entry('1.1', [{ ...span(1, 'Put the red buttons', 'in another jar'), source: NL }]), california_addition: false }])
    const result = extractLane(dutch, { education, store, pages: pagesOf(BUTTONS), additionSources: [nlSource.id] })
    expect(rules(result.findings)).toEqual(['addition-not-marked'])
  })

  it('is true or false in a locator file, and nothing else', () => {
    const file = (value: unknown): unknown => ({ lane: 'us-ca/preschool-tk/mathematics', records: [{ ...entry('1.1', [span(1, 'Put', 'jar')]), california_addition: value }] })
    expect(validateLocator(file(true))).toEqual([])
    expect(validateLocator(file(false))).toEqual([])
    expect(validateLocator(file('yes'))).toEqual(['records[0] (1.1): california_addition must be true or false'])
  })
})

describe('the sources that mark California additions, as committed', () => {
  const located = US_CA_LANES.flatMap((each) => each.parts.filter((part) => part.selection.kind === 'statements').map((part) => ({ lane: each, source: part.source })))

  it('are each read by locator in a California lane', () => {
    expect(US_CA_ADDITION_SOURCES.length).toBeGreaterThan(0)
    for (const source of US_CA_ADDITION_SOURCES) expect(located.map((part) => part.source), source).toContain(source)
  })

  it('have MS-LS1-1 marked in the grade 6 science locator, and no other of its entries', () => {
    const science = located.find((part) => part.lane.level === 'grade-6' && part.lane.subject === 'science')!
    expect(US_CA_ADDITION_SOURCES).toContain(science.source)
    const locator = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', locatorPath(science.lane)), 'utf8')) as { records: LocatorEntry[] }
    expect(locator.records).toHaveLength(19)
    expect(locator.records.filter((each) => each.california_addition !== undefined).map((each) => [each.code, each.california_addition])).toEqual([['MS-LS1-1', true]])
  })
})

describe('the California locators, as committed', () => {
  const lanes = US_CA_LANES.filter((each) => each.parts.some((part) => part.selection.kind === 'statements'))

  it('hold no anchor and no side of a correction longer than four words', () => {
    expect(WORD_CAP).toBe(4)
    const long: string[] = []
    let spans = 0
    for (const each of lanes) {
      const locator = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', locatorPath(each)), 'utf8')) as { records: LocatorEntry[] }
      expect(validateLocator(locator)).toEqual([])
      for (const record of locator.records) {
        for (const [index, one] of record.spans.entries()) {
          spans += 1
          const sides = [one.first, one.last, ...(one.corrections ?? []).flatMap((correction) => [correction.from, correction.to])]
          if (sides.some((side) => words(side).length > WORD_CAP)) long.push(`${locatorPath(each)}: ${record.group}, ${record.code}, span ${index + 1}`)
        }
      }
    }
    expect(long).toEqual([])
    expect(lanes).toHaveLength(12)
    expect(spans).toBe(492)
  })
})

describe('the lanes of a manifest', () => {
  it('are extracted one by one, and only those with located statements', () => {
    const located = lane(caSource, [ref('1.1')])
    const rows: Lane = { ...lane(nlSource, []), parts: [], expectedCount: 0, nothingPublished: 'Nothing is published for this level.' }
    writeLocator(located, [entry('1.1', [span(1, 'Put the red buttons', 'in another jar')])])
    const results = extractLanes([located, rows], { education, store, pages: pagesOf(BUTTONS) })
    expect(results.map((result) => [result.lane, result.written.length, result.findings.length])).toEqual([['us-ca/preschool-tk/mathematics', 1, 0]])
    expect(extractLanes([located, rows], { education, store, pages: pagesOf(BUTTONS) }, 'us-ca/preschool-tk/mathematics')).toHaveLength(1)
    expect(() => extractLanes([located, rows], { education, store, pages: pagesOf(BUTTONS) }, 'nl/peuters/mathematics')).toThrow('no lane')
  })
})

describe('a locator file', () => {
  const good = { lane: 'us-ca/preschool-tk/mathematics', records: [entry('1.1', [span(1, 'Put the red', 'another jar', { firstOccurrence: 1, corrections: [{ from: 'a', to: 'b', reason: 'ligature or glyph' }] })])] }

  it('of the right shape has no findings', () => {
    expect(validateLocator(good)).toEqual([])
  })

  it('starts its list of correction reasons with the line-break hyphen', () => {
    expect(CORRECTION_REASONS[0]).toBe('line-break hyphen')
  })

  it('is refused with what is wrong and where', () => {
    const bad = {
      lane: 'us-ca/preschool-tk/mathematics',
      records: [
        { group: SORTING, code: '1.1', spans: [] },
        { group: SORTING, code: '1.2', spans: [{ source: CA, page: 0, first: 'Put', last: '', occurence: 2 }] },
        { group: SORTING, code: '1.3', spans: [span(1, 'Put', 'jar', { corrections: [{ from: 'a', to: 'b', reason: 'typo' as never }] })] },
        { group: SORTING, code: '1.4', spans: [span(2, 'Put', 'jar', { column: 2, lastPage: 1 })] },
      ],
    }
    const problems = validateLocator(bad)
    expect(problems).toEqual([
      'records[0] (1.1): spans must hold at least one span',
      'records[1] (1.2).spans[0]: occurence is not a field of a span',
      'records[1] (1.2).spans[0]: page must be a whole number from 1',
      'records[1] (1.2).spans[0]: last must hold at least one word',
      `records[2] (1.3).spans[0].corrections[0]: reason must be one of ${CORRECTION_REASONS.join(', ')}`,
      'records[3] (1.4).spans[0]: lastPage must not come before page',
    ])
  })

  it('may give a span a column and a later last page: the span stays in that column', () => {
    expect(validateLocator({ lane: 'us-ca/preschool-tk/mathematics', records: [entry('1.1', [span(1, 'Put', 'jar', { column: 2, lastPage: 2 })])] })).toEqual([])
  })

  it('that is not a list of records is refused', () => {
    expect(validateLocator([])).toEqual(['the file must hold an object with `lane` and `records`'])
  })

  it('for another lane than its path fails', () => {
    const of = lane(caSource, [ref('1.1')])
    const file = join(education, locatorPath(of))
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify({ lane: 'us-ca/kindergarten/mathematics', records: [entry('1.1', [span(1, 'Put the red buttons', 'in another jar')])] }))
    const result = extractLane(of, { education, store, pages: pagesOf(BUTTONS) })
    expect(rules(result.findings)).toEqual(['locator-invalid'])
    writeFileSync(file, '{ not json')
    expect(rules(extractLane(of, { education, store, pages: pagesOf(BUTTONS) }).findings)).toEqual(['locator-invalid'])
  })
})
