import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Lane, LanePart, LeftOut } from '../manifest.ts'
import { NO_ADDITIONS } from '../manifest/nl-additions.ts'
import type { NlAdditions } from '../manifest/nl-additions.ts'
import { caSource } from './fixtures.ts'
import { FRAME_TEXTS_FILE, committedFrameTexts, dutchSections, exportFixesOf, frameOf, generateFrames, manifestOf, readCorrections, staleFrames, writeFrames } from './frames.ts'
import type { ExportFixes } from './frames.ts'
import { composeRecord, parseRecord } from './record.ts'
import { SAME_FILE, pathForId, sourceId } from './schema.ts'
import { validateRecords } from './validate.ts'

// Every name, note and count here is invented. No official text belongs in a test.

const EXPORT = caSource.id
const BOOK = sourceId('us-ca', 'example-counting-book')
const POSTER = sourceId('us-ca', 'example-counting-poster')
const CARDS = sourceId('us-ca', 'example-sorting-cards')

function part(name: string, source: string, checkRendition: string, expectedCount: number): LanePart {
  return {
    name,
    source,
    checkRendition,
    checkStrength: checkRendition === SAME_FILE ? 'second-reading' : 'second-rendition',
    checkGranularity: `The check of ${name} prints one statement per line.`,
    expectedCount,
    selection: { kind: 'statements', locate: 'By its number.', statements: [] },
  }
}

function lane(parts: readonly LanePart[], more: Partial<Lane> = {}): Lane {
  const sources = [...new Set(parts.flatMap((each) => [each.source, each.checkRendition]).filter((id) => id !== SAME_FILE))]
  return {
    jurisdiction: 'us-ca',
    level: 'kindergarten',
    subject: 'mathematics',
    title: 'Kindergarten mathematics',
    sources,
    parts,
    expectedCount: parts.reduce((sum, each) => sum + each.expectedCount, 0),
    countingMethod: 'Rows of the example file, counted twice.',
    countIsFromImportFile: false,
    domains: [
      { name: 'Counting Pears', count: 5 },
      { name: 'Sorting, Stacking, and Pouring', count: 3 },
    ],
    granularity: 'One record is one row of the example file.',
    skipped: [],
    ...more,
  }
}

const TWO_RENDITIONS = lane([part('Counting rows', EXPORT, BOOK, 5), part('Sorting cards', CARDS, POSTER, 3)])
const MIXED = lane([part('Counting rows', EXPORT, BOOK, 5), part('Sorting cards', CARDS, SAME_FILE, 3)])
const NOTHING = lane([], { subject: 'science', title: 'Kindergarten science', nothingPublished: 'The example department publishes no science statements for this level.', domains: [], granularity: '', countingMethod: 'Nothing to count.' })

// A lane read from the rows of an export, and what its import puts right. The fragments are invented.
const ROWS: LanePart = { ...part('Counting rows', EXPORT, BOOK, 8), selection: { kind: 'rows', codeColumn: 'Code', domainColumn: 'Domain', where: { Grade: ['K'] } } }
const IMPORTED = lane([ROWS])
const FIXES: ExportFixes = {
  corrections: {
    [EXPORT]: {
      'K.CC.1': [
        { from: 'a plate ?', to: 'a plate □', reason: 'symbol lost in the export' },
        { from: 'a bowl ?', to: 'a bowl □', reason: 'symbol lost in the export' },
        { from: 'pearz', to: 'pears', reason: 'export typo' },
      ],
      '1.OA.1': [{ from: 'plumz', to: 'plums', reason: 'export typo' }],
    },
    // Another export has a row with the same code.
    [CARDS]: { 'K.CC.1': [{ from: 'cupz', to: 'cups', reason: 'export typo' }] },
  },
  lanes: { [EXPORT]: { 'kindergarten/mathematics': ['K.CC.1'], 'grade-1/mathematics': ['1.OA.1'] }, [CARDS]: { 'kindergarten/mathematics': ['K.CC.1'] } },
  domains: {
    [EXPORT]: {
      'Sorting, Stacking, and': { to: 'Sorting, Stacking, and Pouring', reason: 'domain name truncated in the export' },
      'Juggling and': { to: 'Juggling and Unicycling', reason: 'domain name truncated in the export' },
    },
  },
}

const LEFT_OUT: readonly LeftOut[] = [
  { jurisdiction: 'us-ca', level: 'kindergarten', domain: 'Juggling (12 statements)', reason: 'Outside the four subjects.' },
  { jurisdiction: 'us-ca', level: 'grade-1', domain: 'Unicycling', reason: 'Outside the four subjects.' },
  { jurisdiction: 'nl', level: 'kindergarten', domain: 'Stilt walking', reason: 'Another jurisdiction.' },
]

function frontmatterOf(text: string): Record<string, unknown> {
  return parseRecord(text).frontmatter
}

function bodyOf(text: string): string {
  return text.slice(parseRecord(text).frontmatterText.length)
}

describe('the frame of a lane', () => {
  it('carries the lane in its frontmatter: id, title, sources, expected count, counting method, and draft', () => {
    const { file, text } = frameOf(TWO_RENDITIONS)

    expect(file).toBe('corpus/us-ca/kindergarten/mathematics/frame.md')
    expect(frontmatterOf(text)).toEqual({
      id: 'edu.us-ca.kindergarten.mathematics.frame.lane',
      kind: 'frame',
      title: 'Kindergarten mathematics',
      jurisdiction: 'us-ca',
      level: 'kindergarten',
      subject: 'mathematics',
      sources: [EXPORT, BOOK, CARDS, POSTER],
      expected_count: 8,
      counting_method: 'Rows of the example file, counted twice.',
      check_renditions: [BOOK, POSTER],
      check_strength: 'second-rendition',
      nothing_published: false,
      status: 'draft',
    })
  })

  it('lists both parts of a lane with two parts and two check renditions, each with what it is read from and checked against', () => {
    const body = bodyOf(frameOf(TWO_RENDITIONS).text)

    expect(body).toContain(`- **Counting rows**: 5 records, read from \`${EXPORT}\`. Checked against \`${BOOK}\`, a second rendition. The check of Counting rows prints one statement per line.`)
    expect(body).toContain(`- **Sorting cards**: 3 records, read from \`${CARDS}\`. Checked against \`${POSTER}\`, a second rendition. The check of Sorting cards prints one statement per line.`)
  })

  it('is mixed when one part is read again in the same file and one has a second rendition', () => {
    const { text } = frameOf(MIXED)

    expect(frontmatterOf(text)).toMatchObject({ check_renditions: [BOOK], check_strength: 'mixed', sources: [EXPORT, BOOK, CARDS] })
    expect(bodyOf(text)).toContain(`- **Sorting cards**: 3 records, read from \`${CARDS}\`. Checked by a second reading of the same file. The check of Sorting cards`)
  })

  it('is a second reading, with no check rendition, when every part is read again in the same file', () => {
    const { text } = frameOf(lane([part('Counting rows', EXPORT, SAME_FILE, 5)]))

    expect(frontmatterOf(text)).toMatchObject({ check_renditions: [], check_strength: 'second-reading' })
  })

  it('says what the lane covers, what one record is, and whether the count comes from the import file', () => {
    const body = bodyOf(frameOf(lane([part('Counting rows', EXPORT, BOOK, 8)], { notes: 'Pouring is mapped here because the example file files it under counting.' })).text)

    expect(body).toContain('8 records, under 2 official domains:\n\n- **Counting Pears**: 5\n- **Sorting, Stacking, and Pouring**: 3\n')
    expect(body).toContain('Pouring is mapped here because the example file files it under counting.')
    expect(body).toContain('## What one record is\n\nOne record is one row of the example file.\n')
    expect(body).toContain('counted in an index of its own')
    expect(bodyOf(frameOf(lane([part('Counting rows', EXPORT, BOOK, 8)], { countIsFromImportFile: true })).text)).toContain('counted in the file the records are read from')
  })

  it('lists each skipped statement with its reason, each gap, and what the level leaves out, and says so when there is none', () => {
    const full = lane([part('Counting rows', EXPORT, BOOK, 8)], {
      skipped: [{ code: 'K.CC.9', reason: 'Placeholder row in the example file.' }],
      gaps: [{ source: BOOK, gap: 'Without the book the rows are checked by a second reading.' }],
    })
    const body = bodyOf(frameOf(full, LEFT_OUT).text)

    expect(body).toContain('## Statements skipped\n\n- `K.CC.9`: Placeholder row in the example file.\n')
    expect(body).toContain(`## Gaps if an optional source is missing\n\n- \`${BOOK}\`: Without the book the rows are checked by a second reading.\n`)
    expect(body).toContain('## Left out at this level\n\nOfficial material for this level that the pack records in none of its four subjects:\n\n- **Juggling (12 statements)**: Outside the four subjects.\n')
    expect(body).not.toContain('Unicycling')
    expect(body).not.toContain('Stilt walking')

    const bare = bodyOf(frameOf(TWO_RENDITIONS).text)
    expect(bare).toContain('## Statements skipped\n\nNone.\n')
    expect(bare).toContain('## Gaps if an optional source is missing\n\nNone.\n')
    expect(bare).toContain('## Left out at this level\n\nNothing.\n')
    expect(bare).not.toContain('correction')
  })

  it('of a lane with nothing published holds that statement and nothing else, and expects no records', () => {
    const { file, text } = frameOf(NOTHING, LEFT_OUT)

    expect(file).toBe('corpus/us-ca/kindergarten/science/frame.md')
    expect(frontmatterOf(text)).toMatchObject({ expected_count: 0, nothing_published: true, sources: [], check_renditions: [], check_strength: 'second-reading' })
    expect(bodyOf(text)).toBe('\nNothing is published for this level and subject. The example department publishes no science statements for this level.\n')
  })

  it('lists the corrections of the lane with group, code and reason, and never the corrected text', () => {
    const corrections = [{ group: 'Counting Pears', code: '1.1', reason: 'line-break hyphen' }]
    const body = bodyOf(frameOf(TWO_RENDITIONS, [], corrections).text)

    expect(body).toContain('## Extraction corrections\n')
    expect(body).toContain('- **Counting Pears, 1.1**: line-break hyphen\n')
  })
})

describe('what the import of a lane puts right in its export', () => {
  it('is the corrections of the codes listed for the lane, under the export it reads, and the domains it counts under a corrected name', () => {
    expect(exportFixesOf(IMPORTED, FIXES)).toEqual([
      { kind: 'wording', name: 'K.CC.1', reason: 'symbol lost in the export', places: 2 },
      { kind: 'wording', name: 'K.CC.1', reason: 'export typo', places: 1 },
      { kind: 'domain', name: 'Sorting, Stacking, and Pouring', reason: 'domain name truncated in the export', places: 1 },
    ])
  })

  it('is nothing for a lane of another level, a lane that reads no export, and a lane with nothing published', () => {
    expect(exportFixesOf({ ...IMPORTED, level: 'grade-4' }, { ...FIXES, domains: {} })).toEqual([])
    expect(exportFixesOf(TWO_RENDITIONS, FIXES)).toEqual([])
    expect(exportFixesOf(NOTHING, FIXES)).toEqual([])
  })

  it('is said in the frame, by code and reason and never with the text: the stored wording is the export as corrected', () => {
    const body = bodyOf(frameOf(IMPORTED, [], [], exportFixesOf(IMPORTED, FIXES)).text)

    expect(body).toContain('## Export corrections\n')
    expect(body).toContain('the export\'s as corrected from the adopted document')
    expect(body).toContain('- `K.CC.1`: symbol lost in the export (2 places)\n- `K.CC.1`: export typo\n')
    expect(body).toContain('- The domain **Sorting, Stacking, and Pouring**: domain name truncated in the export.')
    for (const text of ['plate', 'bowl', 'pearz', 'pears', '□', 'plumz', '1.OA.1', 'Juggling']) expect(body).not.toContain(text)
    // A frame without fixes says nothing of them.
    expect(bodyOf(frameOf(IMPORTED).text)).not.toContain('Export corrections')
  })

  it('says only what there is: a lane with a renamed domain and no corrected wording does not speak of stored wording', () => {
    const body = bodyOf(frameOf(IMPORTED, [], [], exportFixesOf(IMPORTED, { ...FIXES, corrections: {}, lanes: {} })).text)

    expect(body).toContain('## Export corrections\n')
    expect(body).toContain('- The domain **Sorting, Stacking, and Pouring**')
    expect(body).not.toContain('as corrected')
  })
})

// A Dutch lane read from an invented decree, and what its importer transcribes. Every name is invented.
const DECREE = sourceId('nl', 'voorbeeld-perenbesluit')
const LEGAL: LanePart = { ...part('Perenbesluit, bijlage 1', DECREE, SAME_FILE, 4), selection: { kind: 'legal', elements: ['/Bijlage1'], locate: 'By its number.', statements: [] } }
// Two parts of the lane read the same decree: its images are still listed once.
const DUTCH = lane([LEGAL, { ...LEGAL, name: 'Perenbesluit, bijlage 2' }], { jurisdiction: 'nl', level: 'einde-po', subject: 'mathematics', title: 'End of primary school mathematics' })
const image = (group: string, code: string, laneKey = 'einde-po/mathematics'): NlAdditions['images'][string][string] => ({ text: '(1/2)', sha256: 'a'.repeat(64), lane: laneKey, group, code })
const TRANSCRIBED: NlAdditions = {
  ...NO_ADDITIONS,
  images: {
    [DECREE]: { '7.png': image('Perendoelen / Kerndoel 11', '11 A a'), '8.png': image('Perendoelen / Kerndoel 11', '11 A a'), '9.png': image('Perenniveaus / 1 Tellen', 'A Tellen / 2'), '3.png': image('Perendoelen / Kerndoel 4', '4 A', 'einde-po/science') },
    [BOOK]: { '1.png': image('Another decree', '1') },
  },
}

describe('what the Dutch importer transcribes, corrects and adds, in the frame of a lane', () => {
  it('lists the statements of the lane that hold a transcribed image, with the image files and never the transcription', () => {
    const sections = dutchSections(DUTCH, TRANSCRIBED)

    expect(sections.map((section) => section[0])).toEqual(['## Images transcribed'])
    expect(sections[0]![1]).toContain('3 images inside 2 statements')
    expect(sections[0]![1]).toContain('[afbeelding: 3/4]')
    expect(sections[0]![2]).toBe('- **Perendoelen / Kerndoel 11, 11 A a**: `7.png`, `8.png`\n- **Perenniveaus / 1 Tellen, A Tellen / 2**: `9.png`')
    const body = bodyOf(frameOf(DUTCH, [], [], [], sections).text)
    expect(body).toContain('## Images transcribed\n\nThe legal text prints 3 images')
    expect(body).not.toContain('(1/2)')
  })

  // A Dutch lane read from invented open data, and the goals its importer corrects.
  const DATA = sourceId('nl', 'voorbeeld-perendata')
  const FROM_DATA: LanePart = {
    ...part('Inhoudslijn Peren, fase 2', DATA, BOOK, 6),
    selection: { kind: 'data', walk: [], recordEntities: ['doelniveau'], codeField: 'prefix', groupBy: { entity: 'inh_cluster', field: 'prefix' }, groups: [], notes: 'Invented.' },
  }
  const BAND = lane([FROM_DATA], { jurisdiction: 'nl', level: 'fase-2', subject: 'mathematics', title: 'Fase 2 mathematics' })
  const WHY = { regroup: 'The data lists it under the cluster before its own.', relevel: 'The data links it to fase 3.', skip: 'The data lists a copy of the goal of the next cluster.' }
  const CORRECTED: NlAdditions = {
    ...NO_ADDITIONS,
    goals: {
      [DATA]: {
        'id-1': {
          code: 'rw/gb/1/12/fase3',
          lane: 'fase-2/mathematics',
          corrections: [
            { kind: 'regroup', cluster: 'rw/gb/2', reason: WHY.regroup },
            { kind: 'relevel', level: 'fase 2', from: 'fase 3', reason: WHY.relevel },
          ],
        },
        'id-2': { code: 'rw/gb/1/13/fase2', lane: 'fase-2/mathematics', corrections: [{ kind: 'regroup', cluster: 'rw/gb/2', reason: WHY.regroup }] },
        'id-3': { code: 'rw/gb/2/01/fase2', lane: 'fase-2/mathematics', corrections: [{ kind: 'skip', copyOf: 'id-9', reason: WHY.skip }] },
        'id-4': { code: 'rw/gb/2/01/fase3', lane: 'fase-3/mathematics', corrections: [{ kind: 'skip', copyOf: 'id-8', reason: WHY.skip }] },
      },
      // Another repository, which no part of the lane reads.
      [BOOK]: { 'id-5': { code: 'x/1', lane: 'fase-2/mathematics', corrections: [{ kind: 'skip', copyOf: 'id-6', reason: WHY.skip }] } },
    },
  }

  it('lists the goals of the open data that the importer regroups, files at the lane\'s fase or skips as copies, each kind with its reason once', () => {
    const [section] = dutchSections(BAND, CORRECTED)

    expect(section![0]).toBe('## Corrections to the open data')
    expect(section![1]).toContain('misfiles 3 goals that concern this lane')
    expect(section!.slice(2)).toEqual([
      `**Grouped under rw/gb/2** (2 goals). ${WHY.regroup}`,
      '- `rw/gb/1/12/fase3` (id-1)\n- `rw/gb/1/13/fase2` (id-2)',
      `**Filed here, at fase 2** (1 goal). ${WHY.relevel}`,
      '- `rw/gb/1/12/fase3` (id-1)',
      `**Not a record: a copy** (1 goal). ${WHY.skip}`,
      '- `rw/gb/2/01/fase2` (id-3), a copy of id-9',
    ])
  })

  it('says in the frame of the lane a goal was filed away from that the goal is a record of another lane', () => {
    const [section] = dutchSections({ ...BAND, level: 'fase-3' }, CORRECTED)

    expect(section![1]).toContain('misfiles 2 goals that concern this lane')
    expect(section!.slice(2)).toEqual([
      `**Not a record of this lane: filed at fase 2** (1 goal). ${WHY.relevel}`,
      '- `rw/gb/1/12/fase3` (id-1), a record of fase-2/mathematics',
      `**Not a record: a copy** (1 goal). ${WHY.skip}`,
      '- `rw/gb/2/01/fase3` (id-4), a copy of id-8',
    ])
    expect(dutchSections({ ...BAND, level: 'fase-1' }, CORRECTED)).toEqual([])
  })

  it('lists the statements the importer restores from the content-line PDF, each with its page and reason', () => {
    const restoring: NlAdditions = { ...NO_ADDITIONS, restored: { [DATA]: { 'id-1': { code: 'rw/gb/1/02/fase2', lane: 'fase-2/mathematics', page: 3, reason: 'The data stops at the first example.' }, 'id-2': { code: 'rw/gb/1/02/fase3', lane: 'fase-3/mathematics', page: 4, reason: 'Another lane.' } } } }

    const [section] = dutchSections(BAND, restoring)

    expect(section![0]).toBe('## Statements restored from the content-line PDF')
    expect(section![1]).toContain('cuts 1 statement of this lane short')
    expect(section![1]).toContain('an example in italics that closes the statement on a line of its own is no part of it')
    expect(section![2]).toBe('- `rw/gb/1/02/fase2` (id-1), page 3: The data stops at the first example.')
    // A statement that runs on overleaf names both pages.
    const overleaf: NlAdditions = { ...NO_ADDITIONS, restored: { [DATA]: { 'id-1': { ...restoring.restored[DATA]!['id-1']!, through: 4 } } } }
    expect(dutchSections(BAND, overleaf)[0]![2]).toBe('- `rw/gb/1/02/fase2` (id-1), pages 3 and 4: The data stops at the first example.')
  })

  it('says how the examples of a content-line PDF are kept, names the parts whose examples are attached by script, and lists the goals whose example is listed by hand', () => {
    const examples: NlAdditions = { ...NO_ADDITIONS, examples: { italic: [BOOK], plain: { [DATA]: { 'id-7': { code: 'ojw/x/1/02/fase2', lane: 'fase-2/mathematics', page: 1, reason: 'Printed upright.' } } } } }

    const [section] = dutchSections(BAND, examples)

    expect(section![0]).toBe('## Examples kept as accompanying text')
    expect(section![1]).toContain('Accompanying official text, not part of the statement')
    expect(section![1]).toContain('the page or pages the accompanying text itself stands on')
    expect(section![2]).toMatch(/^In 1 part of this lane the PDF sets the examples in italics, and the importer attaches them by script: it joins every goal of the part to the statement the PDF prints for it, by its text, and fails when a goal cannot be joined\. An example that closes its goal is cut where the italics open.*raised character \(m²\)/)
    expect(section!.slice(3)).toEqual([
      `- **Inhoudslijn Peren, fase 2**, from \`${BOOK}\``,
      'For 1 goal the example is listed in `manifest/nl-additions.ts`: what the PDF prints after the wording of the data, on the page named, is attached.',
      '- `ojw/x/1/02/fase2` (id-7), page 1: Printed upright.',
    ])
    // A lane none of whose parts is checked against such a PDF, and that has no listed goal, says nothing.
    expect(dutchSections({ ...BAND, level: 'fase-3' }, { ...examples, examples: { ...examples.examples, italic: [] } })).toEqual([])
  })

  it('quotes the official text that holds for the lane as a whole, each text with its source and place, as the committed file of frame texts has it', () => {
    const texts = [
      { lanes: ['fase-2/mathematics', 'fase-3/mathematics'], title: 'What pear texts are like', about: 'Printed over the goals.', source: 'voorbeeldlijn-peren', place: 'page 2, column fase 2', text: 'tekstlengte:\n  ▪ perenverhalen: tot tien minuten\n  -eer (peer)' },
      { lanes: ['fase-1/mathematics'], title: 'Another lane', about: 'Not this one.', source: 'voorbeeldlijn-peren', place: 'page 1', text: 'niets' },
    ]

    const [section] = dutchSections(BAND, NO_ADDITIONS, texts)

    expect(section![0]).toBe('## Official text for the lane as a whole')
    expect(section![1]).toContain('1 such text is quoted here')
    expect(section!.slice(2)).toEqual(['**What pear texts are like** (`voorbeeldlijn-peren`, page 2, column fase 2). Printed over the goals.', '```text\ntekstlengte:\n  ▪ perenverhalen: tot tien minuten\n  -eer (peer)\n```'])
    expect(dutchSections({ ...BAND, subject: 'science' }, NO_ADDITIONS, texts)).toEqual([])
  })

  it('reads those texts from the file under the education folder when it generates the frames of a Dutch lane, and none when there is no such file', () => {
    const education = mkdtempSync(join(tmpdir(), 'education-frame-texts-'))
    try {
      expect(committedFrameTexts(education)).toEqual([])
      expect(generateFrames(education, [BAND], [], undefined, NO_ADDITIONS)[0]!.text).not.toContain('## Official text for the lane as a whole')

      mkdirSync(dirname(join(education, FRAME_TEXTS_FILE)), { recursive: true })
      const file = { generated: 'By a test.', texts: [{ lanes: ['fase-2/mathematics'], title: 'What pear texts are like', about: 'Printed over the goals.', source: 'voorbeeldlijn-peren', place: 'page 2', text: 'korte zinnen' }] }
      writeFileSync(join(education, FRAME_TEXTS_FILE), JSON.stringify(file))

      expect(generateFrames(education, [BAND], [], undefined, NO_ADDITIONS)[0]!.text).toContain('```text\nkorte zinnen\n```')
      // A frame of California quotes nothing, with or without the file.
      expect(generateFrames(education, [TWO_RENDITIONS], [])[0]!.text).not.toContain('Official text for the lane')
    } finally {
      rmSync(education, { recursive: true, force: true })
    }
  })

  it('is nothing for a lane without such statements, for a lane of California, and with no lists', () => {
    expect(dutchSections({ ...DUTCH, subject: 'reading-language' }, TRANSCRIBED)).toEqual([])
    expect(dutchSections(TWO_RENDITIONS, TRANSCRIBED)).toEqual([])
    expect(dutchSections(DUTCH, NO_ADDITIONS)).toEqual([])
    expect(bodyOf(frameOf(DUTCH).text)).not.toContain('## Images transcribed')
  })
})

describe('the California frames, as the manifest generates them', () => {
  const frames = async (): Promise<Map<string, string>> => {
    const { lanes, leftOut, fixes } = await manifestOf('us-ca')
    return new Map(lanes.map((each) => [`${each.level}/${each.subject}`, bodyOf(frameOf(each, leftOut, [], fixes === undefined ? [] : exportFixesOf(each, fixes)).text)]))
  }

  it('say which codes of a lane the import corrects, and say nothing in a lane it corrects nothing in', async () => {
    const bodies = await frames()

    expect(bodies.get('grade-6/reading-language')).toContain('- `WHST.6-8.9`: comma missing in the export\n')
    expect(bodies.get('grade-6/reading-language')).toContain('- The domain **Reading: Literacy in Science and Technical Subjects**: domain name truncated in the export.')
    expect(bodies.get('grade-1/mathematics')).toContain('- `1.OA.8`: symbol lost in the export (2 places)\n')
    expect(bodies.get('grade-6/mathematics')).toContain('- `6.RP.2`: symbol lost in the export\n- `6.EE.2.c`: exponent flattened in the export (2 places)\n')
    expect(bodies.get('kindergarten/mathematics')).not.toContain('Export corrections')
    const corrected = [...bodies].filter(([, body]) => body.includes('## Export corrections')).map(([name]) => name)
    expect(corrected).toEqual(['grade-1/mathematics', 'grade-6/mathematics', 'kindergarten/reading-language', 'grade-1/reading-language', 'grade-4/reading-language', 'grade-5/reading-language', 'grade-6/reading-language'])
  })

  it('say in grade 6 science that the export it is checked against is not word for word the grade 6 document', async () => {
    const body = (await frames()).get('grade-6/science')!

    expect(body).toContain('differs from this document in three records')
    expect(body).toContain('MS-LS1-1')
  })

  it('load no fixes for the Netherlands', async () => {
    expect((await manifestOf('nl')).fixes).toBeUndefined()
  })
})

describe('the frames on disk', () => {
  let education: string

  beforeEach(() => {
    education = mkdtempSync(join(tmpdir(), 'education-frames-'))
  })

  afterEach(() => {
    rmSync(education, { recursive: true, force: true })
  })

  function write(file: string, text: string): void {
    mkdirSync(dirname(join(education, file)), { recursive: true })
    writeFileSync(join(education, file), text)
  }

  function sources(...ids: string[]): { file: string; text: string }[] {
    return ids.map((id) => ({ file: pathForId(id)!, text: composeRecord({ ...caSource, id }, 'An invented file.') }))
  }

  it('reads the corrections out of the locator of a lane, and none when the lane has no locator', () => {
    const span = { source: CARDS, page: 4, first: 'Stack the cups', last: 'on the shelf', corrections: [{ from: 'oneto-one', to: 'one-to-one', reason: 'line-break hyphen' }] }
    const records = [
      { group: 'Counting Pears', code: '1.1', spans: [span, { source: CARDS, page: 5, first: 'Pour', last: 'cups' }] },
      { group: 'Counting Pears', code: '1.2', spans: [{ source: CARDS, page: 6, first: 'Count', last: 'cups' }] },
    ]
    write('locators/us-ca/kindergarten/mathematics.json', JSON.stringify({ lane: 'us-ca/kindergarten/mathematics', records }))

    expect(readCorrections(education, TWO_RENDITIONS)).toEqual([{ group: 'Counting Pears', code: '1.1', reason: 'line-break hyphen' }])
    expect(readCorrections(education, NOTHING)).toEqual([])

    const [frame] = generateFrames(education, [TWO_RENDITIONS], LEFT_OUT)
    expect(frame!.text).toContain('- **Counting Pears, 1.1**: line-break hyphen\n')
    expect(frame!.text).not.toContain('oneto-one')
    expect(frame!.text).not.toContain('one-to-one')
    expect(frame!.text).not.toContain('Stack the cups')
  })

  it('puts the export corrections of a lane in its frame', () => {
    const [frame, other] = generateFrames(education, [IMPORTED, NOTHING], LEFT_OUT, FIXES)

    expect(frame!.text).toContain('- `K.CC.1`: export typo\n')
    expect(other!.text).not.toContain('Export corrections')
    expect(generateFrames(education, [IMPORTED], LEFT_OUT)[0]!.text).not.toContain('Export corrections')
  })

  it('writes one frame per lane, and a second run changes nothing', () => {
    const frames = generateFrames(education, [TWO_RENDITIONS, NOTHING], LEFT_OUT)

    expect(writeFrames(education, frames)).toEqual([
      { file: 'corpus/us-ca/kindergarten/mathematics/frame.md', status: 'created' },
      { file: 'corpus/us-ca/kindergarten/science/frame.md', status: 'created' },
    ])
    const before = frames.map((frame) => readFileSync(join(education, frame.file), 'utf8'))
    expect(before).toEqual(frames.map((frame) => frame.text))

    const again = generateFrames(education, [TWO_RENDITIONS, NOTHING], LEFT_OUT)
    expect(writeFrames(education, again).map((result) => result.status)).toEqual(['unchanged', 'unchanged'])
    expect(again.map((frame) => readFileSync(join(education, frame.file), 'utf8'))).toEqual(before)
  })

  it('finds the committed frames that differ from a fresh generation: one edited by hand, one missing', () => {
    const frames = generateFrames(education, [TWO_RENDITIONS, NOTHING], LEFT_OUT)
    expect(staleFrames(education, frames)).toEqual(frames.map((frame) => frame.file))

    writeFrames(education, frames)
    expect(staleFrames(education, frames)).toEqual([])

    write(frames[0]!.file, frames[0]!.text.replace('8 records', '9 records'))
    rmSync(join(education, frames[1]!.file))
    expect(staleFrames(education, frames)).toEqual(frames.map((frame) => frame.file))
    expect(existsSync(join(education, frames[1]!.file))).toBe(false)
  })

  it('gives frames the validator accepts, and one it refuses when the lane names a source with no record', () => {
    const frames = generateFrames(education, [TWO_RENDITIONS, MIXED, NOTHING].map((each, index) => ({ ...each, level: ['kindergarten', 'grade-1', 'grade-4'][index]! })), LEFT_OUT)

    expect(validateRecords([...sources(EXPORT, BOOK, CARDS, POSTER), ...frames])).toEqual([])

    const findings = validateRecords([...sources(EXPORT, BOOK, CARDS), ...frames])
    expect(findings.map((finding) => `${finding.file} ${finding.rule}`)).toEqual(['corpus/us-ca/kindergarten/mathematics/frame.md source-missing', 'corpus/us-ca/kindergarten/mathematics/frame.md source-missing'])
    expect(findings.every((finding) => finding.message.includes(POSTER))).toBe(true)
  })
})
