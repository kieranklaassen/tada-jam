import { describe, expect, it } from 'vitest'
import type { Lane, LanePart } from '../manifest.ts'
import { NL_FRAME_TEXTS } from '../manifest/nl-additions.ts'
import type { FrameText } from '../manifest/nl-additions.ts'
import { NL_LANES } from '../manifest/nl.ts'
import type { ContentLine, PrintedItem, Run } from './content-lines.ts'
import { readFrameText, readFrameTexts, readHeadings, readUnderlinedGoals, serialiseFrameTexts } from './frame-texts.ts'
import type { Readers } from './frame-texts.ts'
import type { SourcePages } from './rendition.ts'
import { SAME_FILE, sourceId } from './schema.ts'

// Every heading, label and sentence here is invented. No official text belongs in a test.

const LINE = 'voorbeeldlijn-peren'
const CARD = 'voorbeeldkaart-peren'

const upright = (text: string): Run => ({ text, italic: false })
const slanted = (text: string): Run => ({ text, italic: true })
const item = (fields: Partial<PrintedItem> & { runs: Run[] }): PrintedItem => ({ kind: 'feature', page: 2, column: 1, cluster: 'Peren beluisteren', label: '', section: 'tekstkenmerken', group: '', ...fields })

const CONTENT: ContentLine = {
  columns: ['fase 1*', 'fase 2*', 'fase 3*'],
  clusters: [
    { title: 'Peren beluisteren (vanaf mand 2)', page: 2, description: 'Luisteren naar verhalen over peren in en om de boomgaard.' },
    { title: 'Peren en pruimen ruilen', page: 3, description: '' },
    { title: 'Peren wegen', page: 3, description: '' },
  ],
  note: 'Een slotwoord dat nergens wordt aangehaald.',
  items: [
    // A sentence over the list, loose in the column, under a label of the row.
    item({ kind: 'text', label: 'perenteksten', runs: [upright('perenteksten hebben in deze mand\n'), upright('deze kenmerken:')] }),
    item({ label: 'tekstlengte:', runs: [upright('perenverhalen: tot vijf '), upright('\nminuten')] }),
    item({ label: 'tekstlengte:', runs: [upright('perenliedjes: twee coupletten '), slanted('(bijv. een wiegelied)')] }),
    item({ label: 'tekstbouw:', runs: [upright('korte zinnen')] }),
    // The same row in another column, a goal under the same heading, and a note: none belongs to the block.
    item({ column: 2, label: 'tekstlengte:', runs: [upright('perenverhalen: tot tien minuten')] }),
    item({ kind: 'goal', section: 'aanbodsdoelen', runs: [upright('luisteren naar een perenverhaal')] }),
    item({ kind: 'text', page: 4, label: 'tekstbouw:', runs: [slanted('*  Mand 1 is de eerste twee rijen bomen.')] }),
    item({ kind: 'text', page: 4, label: 'tekstbouw:', runs: [slanted('NB  Zie ook het pruimenboekje.')] }),
  ],
}

const PAGES: SourcePages = { pages: ['', 'Peren - eerste mand\nKinderen doen ervaring op met:\nPlukken\n• een peer plukken'] }

// A second line, which closes with the same note as the first, and a third, whose note differs.
const OTHER_LINE = 'voorbeeldlijn-pruimen'
const THIRD_LINE = 'voorbeeldlijn-kersen'
const noteOnly = (note: string): ContentLine => ({ columns: ['fase 1*'], clusters: [], note: '', items: [item({ kind: 'text', page: 3, runs: [slanted(note)] })] })

// An invented regulation, as the legal XML is built: a division with a heading, paragraphs, a list, a table and a footnote.
const RULES = 'voorbeeldbesluit-peren'
const PATH = 'bwb-ng-variabel-deel'
const REGULATION = `<bijlage ${PATH}="/Bijlage1"><divisie ${PATH}="/Bijlage1/Divisie4">
<kop><nr>4</nr><titel>Perenwoorden</titel></kop>
<divisie ${PATH}="/Bijlage1/Divisie4/Divisie4.1">
<kop><nr>4.1</nr><titel>Woordenlijst</titel></kop>
<al>Om over peren te praten zijn woorden nodig.<noot id="n1" type="voet"><noot.nr>1</noot.nr><noot.al>Zie het perenboek.</noot.al></noot> De meeste kent een kind al.</al>
<table><title>Tabel 1: Perenwoorden per mand</title><tgroup cols="2"><tbody><row><entry><al>Steel</al></entry><entry><al>kort, lang</al></entry></row></tbody></tgroup></table>
<tussenkop><nadruk>Woorden voor het schillen</nadruk></tussenkop>
<lijst><li ${PATH}="/Bijlage1/Divisie4/Divisie4.1/Onderdeel1"><li.nr>1.</li.nr><al>Schil;</al></li>
<li ${PATH}="/Bijlage1/Divisie4/Divisie4.1/Onderdeel2"><li.nr>2.</li.nr><al>Klokhuis</al><al>(het hart van de peer).</al><lijst><li><li.nr>2.1.</li.nr><al>pit</al></li></lijst></li></lijst>
</divisie></divisie></bijlage>`

const readers: Readers = {
  contentLine: (source) => {
    if (source === sourceId('nl', OTHER_LINE)) return noteOnly('NB  Zie ook het pruimenboekje.')
    if (source === sourceId('nl', THIRD_LINE)) return noteOnly('NB  Zie ook het kersenboekje.')
    if (source !== sourceId('nl', LINE)) throw new Error(`no content line ${source}`)
    return CONTENT
  },
  pages: (source) => {
    if (source === sourceId('nl', RULES)) return { pages: ['', REGULATION] }
    if (source !== sourceId('nl', CARD)) throw new Error(`no pages of ${source}`)
    return PAGES
  },
}

const text = (where: FrameText['where'], lanes: readonly string[] = ['fase-1/reading-language']): FrameText => ({ lanes, title: 'What pear texts are like', about: 'Printed over the goals.', where })

describe('one text that holds for a whole lane', () => {
  it('is, for a block of a content-line PDF, what one column prints under a heading and a line that heads no goals: each row after its label, each marked item after its mark', () => {
    const read = readFrameText(text({ kind: 'block', source: LINE, cluster: 'Peren beluisteren', section: 'tekstkenmerken', column: 1 }), readers)

    expect(read).toEqual({
      lanes: ['fase-1/reading-language'],
      title: 'What pear texts are like',
      about: 'Printed over the goals.',
      source: LINE,
      place: 'page 2, column fase 1',
      text: [
        'perenteksten',
        '  perenteksten hebben in deze mand deze kenmerken:',
        'tekstlengte:',
        '  ▪ perenverhalen: tot vijf minuten',
        '  ▪ perenliedjes: twee coupletten (bijv. een wiegelied)',
        'tekstbouw:',
        '  ▪ korte zinnen',
      ].join('\n'),
    })
  })

  it('keeps the lines of the page and marks what is set in italics, for a block read as printed', () => {
    const read = readFrameText(text({ kind: 'block', source: LINE, cluster: 'Peren beluisteren', section: 'tekstkenmerken', column: 1, asPrinted: true }), readers)

    expect(read.text.split('\n').slice(0, 7)).toEqual([
      'perenteksten',
      '  perenteksten hebben in deze mand',
      '  deze kenmerken:',
      'tekstlengte:',
      '  ▪ perenverhalen: tot vijf',
      '    minuten',
      '  ▪ perenliedjes: twee coupletten _(bijv. een wiegelied)_',
    ])
  })

  it('is, for a note, the one loose text that opens with the given characters, and for a span the text between its bounding words', () => {
    expect(readFrameText(text({ kind: 'note', source: LINE, opens: '*' }), readers)).toMatchObject({ place: 'page 4', text: '* Mand 1 is de eerste twee rijen bomen.' })
    expect(readFrameText(text({ kind: 'span', source: CARD, page: 1, first: 'Kinderen doen', last: 'op met' }), readers)).toMatchObject({ source: CARD, place: 'page 1', text: 'Kinderen doen ervaring op met:' })
  })

  it('checks, for a note the manifest says other PDFs print too, that each prints it in the same words', () => {
    expect(readFrameText(text({ kind: 'note', source: LINE, opens: 'NB', alsoIn: [OTHER_LINE] }), readers)).toMatchObject({ source: LINE, text: 'NB Zie ook het pruimenboekje.' })
    expect(() => readFrameText(text({ kind: 'note', source: LINE, opens: 'NB', alsoIn: [OTHER_LINE, THIRD_LINE] }), readers)).toThrow(/voorbeeldlijn-kersen does not print the same note/)
  })

  it('is, for a division of a regulation, its running text: headings at the margin, paragraphs and numbered items set in, a table by its caption alone, a footnote under its paragraph', () => {
    const read = readFrameText(text({ kind: 'legal', source: RULES, path: '/Bijlage1/Divisie4/Divisie4.1', place: 'bijlage 1, section 4.1' }, ['einde-po/reading-language']), readers)

    expect(read).toMatchObject({ source: RULES, place: 'bijlage 1, section 4.1' })
    expect(read.text.split('\n')).toEqual([
      '4.1 Woordenlijst',
      '  Om over peren te praten zijn woorden nodig.[1] De meeste kent een kind al.',
      '  [1] Zie het perenboek.',
      // The cells of the table are statements, not running text.
      '  Tabel 1: Perenwoorden per mand',
      'Woorden voor het schillen',
      '  1. Schil;',
      '  2. Klokhuis',
      '    (het hart van de peer).',
      '    2.1. pit',
    ])
    expect(() => readFrameText(text({ kind: 'legal', source: RULES, path: '/Bijlage1/Divisie9', place: 'nowhere' }), readers)).toThrow(/What pear texts are like.*no element with the path \/Bijlage1\/Divisie9/)
  })

  it('fails when the manifest lists as bold an item the block does not print', () => {
    const block: FrameText['where'] = { kind: 'block', source: LINE, cluster: 'Peren beluisteren', section: 'tekstkenmerken', column: 1, asPrinted: true }
    expect(readFrameText({ ...text(block), bold: ['perenliedjes: twee coupletten', 'korte zinnen'] }, readers).text).toContain('korte zinnen')
    expect(() => readFrameText({ ...text(block), bold: ['lange zinnen'] }, readers)).toThrow(/lists as bold what column fase 1\* does not print: "lange zinnen"/)
  })

  it('fails, and names the text, when the source does not hold it where the list says', () => {
    expect(() => readFrameText(text({ kind: 'block', source: LINE, cluster: 'Peren beluisteren', section: 'tekstkenmerken', column: 3 }), readers)).toThrow(/What pear texts are like.*column fase 3\* prints nothing/)
    expect(() => readFrameText(text({ kind: 'block', source: LINE, cluster: 'Peren beluisteren', section: 'tekstkenmerken', column: 4 }), readers)).toThrow(/no column 4/)
    expect(() => readFrameText(text({ kind: 'note', source: LINE, opens: 'Zie' }), readers)).toThrow(/0 loose texts of the file open with "Zie"/)
    expect(() => readFrameText(text({ kind: 'span', source: CARD, page: 1, first: 'Kinderen leren', last: 'op met' }), readers)).toThrow(/What pear texts are like.*the first anchor is not on page 1/)
  })
})

describe('the heading bars a content-line PDF prints otherwise than the data titles its clusters', () => {
  const PDF = sourceId('nl', LINE)
  const dataPart = (groups: readonly string[], checkRendition = PDF): LanePart => ({
    name: 'Inhoudslijn Peren, fase 1',
    source: sourceId('nl', 'voorbeelddata-peren'),
    checkRendition,
    checkStrength: 'second-rendition',
    checkGranularity: 'The PDF of the line.',
    expectedCount: groups.length,
    selection: { kind: 'data', walk: [], recordEntities: ['doelniveau'], codeField: 'prefix', groupBy: { entity: 'inh_cluster', field: 'prefix' }, groups: groups.map((name) => ({ name, count: 1 })), notes: 'Invented.' },
  })
  const lane = (parts: readonly LanePart[]): Lane => ({
    jurisdiction: 'nl',
    level: 'fase-1',
    subject: 'reading-language',
    title: 'Fase 1 reading and language',
    sources: [],
    parts,
    expectedCount: parts.reduce((sum, part) => sum + part.expectedCount, 0),
    countingMethod: 'Counted in the fixture.',
    countIsFromImportFile: true,
    domains: [],
    granularity: 'One record is one goal.',
    skipped: [],
  })

  it('are listed per lane and PDF: a bar that says more than the title, a bar worded otherwise, and what the PDF prints under a bar; a bar that is the title is left out', () => {
    const groups = ['Fruit / Peren / Peren beluisteren (pe/1)', 'Fruit / Peren / Ruilen van peren, pruimen (pe/2)', 'Fruit / Peren / Peren wegen (pe/3)']

    const found = readHeadings([lane([dataPart(groups)])], readers, () => true)

    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ lanes: ['fase-1/reading-language'], title: 'Cluster headings as the PDF prints them', source: LINE, place: 'pages 2, 3' })
    expect(found[0]!.text.split('\n')).toEqual([
      'Peren beluisteren (vanaf mand 2)  [the open data titles this cluster "Peren beluisteren", pe/1]',
      '  Luisteren naar verhalen over peren in en om de boomgaard.',
      'Peren en pruimen ruilen  [the open data titles this cluster "Ruilen van peren, pruimen", pe/2]',
    ])
  })

  it('say so when a title has no bar a script can pair it with, and say nothing for a lane whose PDF agrees with the data or is not such a PDF', () => {
    const unpaired = readHeadings([lane([dataPart(['Fruit / Peren / Kersen ontpitten (pe/9)'])])], readers, () => true)
    expect(unpaired[0]!.text).toBe('(no heading bar of the PDF could be paired by script with "Kersen ontpitten", pe/9)')

    expect(readHeadings([lane([dataPart(['Fruit / Peren / Peren wegen (pe/3)'])])], readers, () => true)).toEqual([])
    expect(readHeadings([lane([dataPart(['Fruit / Peren / Peren beluisteren (pe/1)'], SAME_FILE)])], readers, (source) => source !== SAME_FILE)).toEqual([])
  })
})

describe('the goals of a lane that hold an underlined term', () => {
  const PDF = sourceId('nl', LINE)
  const goalItem = (page: number, column: number, wording: string): PrintedItem => item({ kind: 'goal', page, column, cluster: 'Peren wegen', section: 'aanbodsdoelen', runs: [upright(wording)] })
  const [WEIGH, COMPARE, GUESS, LOCATED, OTHER_FASE] = [
    goalItem(3, 1, 'peren wegen op een weegschaal'),
    goalItem(3, 1, 'peren vergelijken naar gewicht'),
    goalItem(3, 1, 'het gewicht van een peer schatten'),
    goalItem(3, 1, 'een peer wegen die de data niet kent'),
    goalItem(3, 2, 'peren wegen in grammen'),
  ] as const
  const content: ContentLine = { ...CONTENT, items: [WEIGH, COMPARE, GUESS, LOCATED, OTHER_FASE] }
  const part = (kind: 'data' | 'statements'): LanePart => ({
    name: kind === 'data' ? 'Inhoudslijn Peren, fase 1' : 'Inhoudslijn Peren, fase 1: what the data lacks',
    source: kind === 'data' ? sourceId('nl', 'voorbeelddata-peren') : PDF,
    checkRendition: kind === 'data' ? PDF : SAME_FILE,
    checkStrength: kind === 'data' ? 'second-rendition' : 'second-reading',
    checkGranularity: 'The PDF of the line.',
    expectedCount: kind === 'data' ? 3 : 1,
    selection:
      kind === 'data'
        ? { kind: 'data', walk: [], recordEntities: ['doelniveau'], codeField: 'prefix', groupBy: { entity: 'inh_cluster', field: 'prefix' }, groups: [{ name: 'Fruit / Peren / Peren wegen (pe/3)', count: 3 }], level: { source: sourceId('nl', 'voorbeelddata-basis'), entity: 'doelniveau', field: 'niveau_id', titles: ['fase 1'], rule: 'The level the goal links to.' }, notes: 'Invented.' }
        : { kind: 'statements', locate: 'By column.', statements: [{ group: 'Voorbeeldlijn Peren, PDF / Peren wegen', code: '4' }] },
  })
  const lane: Lane = {
    jurisdiction: 'nl',
    level: 'fase-1',
    subject: 'science',
    title: 'Fase 1 science',
    sources: [],
    parts: [part('data'), part('statements')],
    expectedCount: 4,
    countingMethod: 'Counted in the fixture.',
    countIsFromImportFile: true,
    domains: [],
    granularity: 'One record is one goal.',
    skipped: [],
  }
  const reading = (terms: Map<PrintedItem, string[]>, wordings: readonly string[] = ['peren wegen op een weegschaal', 'peren vergelijken naar gewicht', 'het gewicht van een peer schatten']): Readers => ({
    ...readers,
    contentLine: () => content,
    underlined: () => terms,
    goals: (_, each) => (each.selection.kind === 'data' ? wordings.map((wording, index) => ({ id: `g${index + 1}`, code: `pe/3/0${index + 1}/fase1`, wording, cluster: 'Peren wegen' })) : []),
    located: () => [{ group: 'Voorbeeldlijn Peren, PDF / Peren wegen', code: '4', source: LINE, page: 3, column: 2, first: 'een peer wegen' }],
  })

  it('are listed per lane and PDF by the code of the data, a located statement by its name in the manifest, each with its terms; a goal of another column is not this lane\'s', () => {
    const terms = new Map([
      [WEIGH, ['weegschaal']],
      [GUESS, ['gewicht', 'peer (in part)']],
      [LOCATED, ['peer']],
      [OTHER_FASE, ['grammen']],
    ])

    const found = readUnderlinedGoals([lane], reading(terms), () => true)

    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ lanes: ['fase-1/science'], title: 'Goals that hold an underlined term', source: LINE, place: 'column fase 1' })
    expect(found[0]!.text.split('\n')).toEqual(['pe/3/01/fase1: weegschaal', 'pe/3/03/fase1: gewicht; peer (in part)', 'Voorbeeldlijn Peren, PDF / Peren wegen, 4: peer'])
    expect(found[0]!.about).toContain('Goals of this lane that this PDF prints: 4. With an underlined term: 3')
    expect(found[0]!.about).not.toContain('Not looked at')
  })

  it('say which goal could not be joined to a statement of the PDF, and say nothing for a PDF that underlines nothing or without the readers', () => {
    const terms = new Map([[WEIGH, ['weegschaal']]])
    const unjoined = readUnderlinedGoals([lane], reading(terms, ['peren wegen op een weegschaal', 'peren vergelijken naar gewicht', 'peren tellen', 'peren ruilen']), () => true)
    expect(unjoined[0]!.about).toMatch(/Not looked at, because the script could not join it to a statement of the PDF by its text: `pe\/3\/03\/fase1`, `pe\/3\/04\/fase1`\./)

    expect(readUnderlinedGoals([lane], reading(new Map()), () => true)).toEqual([])
    expect(readUnderlinedGoals([lane], readers, () => true)).toEqual([])
  })
})

describe('the file the frames quote from', () => {
  it('holds the declared texts in their order, then the headings, and says that it is generated', () => {
    const declared = [text({ kind: 'note', source: LINE, opens: '*' }), text({ kind: 'span', source: CARD, page: 1, first: 'Kinderen doen', last: 'op met' }, ['peuters/mathematics'])]

    const file = readFrameTexts(declared, [], readers, () => true)

    expect(file.texts.map((each) => each.text)).toEqual(['* Mand 1 is de eerste twee rijen bomen.', 'Kinderen doen ervaring op met:'])
    expect(file.generated).toContain('node education/tools/frame-texts.ts')
    expect(serialiseFrameTexts(file)).toBe(`${JSON.stringify(file, null, 2)}\n`)
  })
})

describe('the texts the manifest declares', () => {
  it('each name lanes of the manifest, and a source by its slug', () => {
    const lanes = new Set(NL_LANES.map((lane) => `${lane.level}/${lane.subject}`))
    expect(NL_FRAME_TEXTS.length).toBeGreaterThan(0)
    for (const each of NL_FRAME_TEXTS) {
      expect(each.lanes.length, each.title).toBeGreaterThan(0)
      for (const lane of each.lanes) expect(lanes, `${each.title}: ${lane}`).toContain(lane)
      expect(each.where.source, each.title).toMatch(/^nl-[a-z0-9-]+$/)
      expect(each.about.trim(), each.title).not.toBe('')
    }
  })

  it('quote the column groep 3-4 of the table of terms and spelling in the frames of fase 1 and of fase 2, and no table column in a lane its groepen are not in', () => {
    const tables = NL_FRAME_TEXTS.filter((each) => each.where.kind === 'block' && each.where.source === 'nl-slo-inhoudslijn-ne-taalbeschouwing')
    const lanesOf = (pair: string): string[][] => tables.filter((each) => each.title.endsWith(pair)).map((each) => [...each.lanes])
    expect(lanesOf('groep 1-2')).toEqual([['fase-1/reading-language']])
    expect(lanesOf('groep 3-4')).toEqual([
      ['fase-1/reading-language', 'fase-2/reading-language'],
      ['fase-1/reading-language', 'fase-2/reading-language'],
    ])
    expect(lanesOf('groep 5-6')).toEqual([['fase-2/reading-language'], ['fase-2/reading-language']])
    expect(lanesOf('groep 7-8')).toEqual([['fase-3/reading-language'], ['fase-3/reading-language']])
  })
})
