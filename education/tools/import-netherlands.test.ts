import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IMAGE_PLACEHOLDER } from '../manifest.ts'
import type { DataNodes, DataSelection, Lane, LanePart, Skipped, StatementRef } from '../manifest.ts'
import { NO_ADDITIONS, imageMarker } from '../manifest/nl-additions.ts'
import type { NlAdditions } from '../manifest/nl-additions.ts'
import type { ContentLine, PrintedItem } from './content-lines.ts'
import { nlSource } from './fixtures.ts'
import { goalsOfPart, importNetherlands, openData, report, reportOrphans, sweepOrphans } from './import-netherlands.ts'
import type { PartImport } from './import-netherlands.ts'
import { wordingHash } from './normalise.ts'
import { composeRecord, officialWording, parseRecord, replaceRegion, withMarker } from './record.ts'
import { DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS, ENGLISH_GLOSS, OFFICIAL_WORDING, SAME_FILE, accompanyingLine, parseId, pathForId, sourceId } from './schema.ts'
import type { SourceFrontmatter, Subject } from './schema.ts'
import { clonePath, getWording, putBlob, sha256 } from './store.ts'
import { validateRecords } from './validate.ts'

// Every decree, table and data file here is invented: the wording, the
// headings, the ids. No official wording belongs in a test. The ids of the
// source records are real, because the id is what says how a file is read.

const DECREE_2026 = sourceId('nl', 'nl-wet-kerndoelen-po-2026')
const DECREE_2006 = sourceId('nl', 'nl-wet-kerndoelen-po-2006')
const REFERENCE = sourceId('nl', 'nl-wet-referentieniveaus-besluit')
const CHILDCARE_ACT = sourceId('nl', 'nl-wet-kinderopvang')
const CHILDCARE_DECREE = sourceId('nl', 'nl-wet-besluit-kwaliteit-kinderopvang')
const EARLY_YEARS = sourceId('nl', 'nl-wet-besluit-voorschoolse-educatie')
const DATA_GOALS = sourceId('nl', 'nl-slo-curriculum-fo')
const DATA_2006 = sourceId('nl', 'nl-slo-curriculum-kerndoelen')
const DATA_LINES = sourceId('nl', 'nl-slo-curriculum-inhoudslijnen')
const DATA_BASIS = sourceId('nl', 'nl-slo-curriculum-basis')

const PATH = 'bwb-ng-variabel-deel'
const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

let education: string
let store: string

beforeEach(() => {
  education = mkdtempSync(join(tmpdir(), 'education-import-nl-'))
  store = mkdtempSync(join(tmpdir(), 'education-import-nl-store-'))
})

afterEach(() => {
  rmSync(education, { recursive: true, force: true })
  rmSync(store, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// Seeding the store and the source records.
// ---------------------------------------------------------------------------

function writeSource(fields: Partial<SourceFrontmatter> & { id: string }): void {
  const file = join(education, pathForId(fields.id)!)
  mkdirSync(dirname(file), { recursive: true })
  const { regime: _regime, ...base } = nlSource
  writeFileSync(file, composeRecord({ ...base, ...fields }, 'An invented source.'))
}

// Puts a decree in the store and writes the source record that pins its bytes.
function seedDecree(id: string, xml: string, fields: Partial<SourceFrontmatter> = {}): void {
  const pin = putBlob(store, Buffer.from(xml, 'utf8'))
  writeSource({
    id,
    pin,
    pin_kind: 'bytes',
    media_type: 'application/xml',
    title: 'Voorbeeldbesluit perendoelen',
    publisher: 'Voorbeelduitgever',
    version: 'In force from 2026-08-01 (invented)',
    standing: 'legal-core-goal',
    ...fields,
  })
}

const COMMIT = '0123456789abcdef0123456789abcdef01234567'

// Puts the data files of a clone in the store and writes the source record that pins its commit.
function seedClone(id: string, files: Readonly<Record<string, readonly object[]>>, fields: Partial<SourceFrontmatter> = {}): void {
  const folder = join(clonePath(store, parseId(id)!.slug), 'data')
  mkdirSync(folder, { recursive: true })
  for (const [name, objects] of Object.entries(files)) writeFileSync(join(folder, name), JSON.stringify(objects, null, 2))
  writeSource({
    id,
    pin: COMMIT,
    pin_kind: 'git-commit',
    media_type: 'application/json',
    title: 'Voorbeelddata perendoelen',
    publisher: 'Voorbeeldinstituut',
    version: 'Commit 0123456 (invented)',
    standing: 'curriculum-institute-guidance',
    ...fields,
  })
}

// ---------------------------------------------------------------------------
// Invented decrees.
// ---------------------------------------------------------------------------

// The publication data the repository puts beside the text of an element.
const META = '<meta-data><brondata><oorspronkelijk><publicatie soort="Stb"><publicatiejaar>1999</publicatiejaar><publicatienr>123</publicatienr></publicatie></oorspronkelijk></brondata><jcis><jci versie="1.3" verwijzing="jci1.3:c:BWBR0000000&amp;o=1"/></jcis></meta-data>'

const decree = (title: string, body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<toestand bwb-id="BWBR0000000"><wetgeving><intitule ${PATH}="/Intitule">Besluit van de fruitteler</intitule><citeertitel ${PATH}="/Citeertitel" status="officieel">${title}${META}</citeertitel><wet-besluit>${body}</wet-besluit></wetgeving></toestand>\n`

const al = (...paragraphs: string[]): string => paragraphs.map((paragraph) => `<al>${paragraph}</al>`).join('\n')

const image = (name: string): string => `<plaatje>\n  <illustratie id="${name.split('.')[0]}" formaat="png" naam="${name}"/>\n</plaatje>`
const IMAGE = image('1.png')

type Doelzin = readonly [letter: string, sentence: string, items: string]

// One core goal of the 2026 kind: a table whose rows are the number, the goal sentence, the column heads, and one row per doelzin.
const goalTable = (number: number, sentence: string, doelzinnen: readonly Doelzin[]): string => `
<table><tgroup cols="3"><colspec colname="col1"/><colspec colname="col2"/><colspec colname="col3"/><tbody>
  <row><entry namest="col1" nameend="col3"><al>\n<nadruk type="halfvet">Kerndoel ${number}</nadruk>\n</al></entry></row>
  <row><entry namest="col1" nameend="col3"><al>${sentence}</al></entry></row>
  <row><entry namest="col1" nameend="col2"><al><nadruk type="halfvet">Doelzin:</nadruk></al></entry><entry colname="col3"><al><nadruk type="halfvet">Het gaat hierbij om:</nadruk></al></entry></row>
  ${doelzinnen.map(([letter, text, items]) => `<row><entry colname="col1"><al>${letter}.</al></entry><entry colname="col2"><al>${text}</al></entry><entry colname="col3">\n${items}\n</entry></row>`).join('\n  ')}
</tbody></tgroup></table>`

const annexOfGoals = (tables: string): string => `
<bijlage ${PATH}="/Bijlage1"><kop><label>Bijlage</label><nr status="officieel">1</nr><titel>bij <intref ${PATH}="/Artikel1">artikel 1</intref></titel></kop>
  <divisie ${PATH}="/Bijlage1/DivisieB"><kop><label>Onderdeel</label><nr>B</nr><titel>Fruitkunde</titel></kop>
    <divisie ${PATH}="/Bijlage1/DivisieB/Divisie_1"><kop><titel>Domein: peren</titel></kop>${tables}
    ${META}</divisie>
  </divisie>
</bijlage>`

const SENTENCE_10 = 'De leerling telt peren.'
const GOAL_10 = goalTable(10, SENTENCE_10, [
  ['A', 'De leerling telt de peren in een mand.', al('a. tellen tot tien;', 'b. tellen in groepjes van twee.')],
  ['B', 'De leerling vergelijkt twee manden.', al('a. aanwijzen waar meer peren liggen.')],
])

type Item = readonly [number: number, paragraphs: string]

// The goals of the 2006 kind: numbered items in lists, each list under a heading.
const numberedGoals = (lists: readonly (readonly [heading: string, items: readonly Item[]])[]): string => `
<bijlage ${PATH}="/Bijlage"><kop><label>Bijlage</label><titel>Perendoelen</titel></kop>
  <divisie ${PATH}="/Bijlage/Divisie_5"><kop><titel>Fruitkunde</titel></kop>
    <divisie ${PATH}="/Bijlage/Divisie_5/Divisie_1"><kop><titel>Karakteristiek</titel></kop><al>Peren zijn er in soorten en maten.</al></divisie>
    <divisie ${PATH}="/Bijlage/Divisie_5/Divisie_2"><kop><titel><nadruk type="cur">Kerndoelen</nadruk></titel></kop>
      ${lists
        .map(
          ([heading, items], list) => `<tussenkop kopopmaak="cur">${heading}</tussenkop>
      <lijst ${PATH}="/Bijlage/Divisie_5/Divisie_2/Opsomming_${list + 1}" type="expliciet">
        ${items.map(([number, paragraphs]) => `<li ${PATH}="/Bijlage/Divisie_5/Divisie_2/Opsomming_${list + 1}/Onderdeel${number}">\n<li.nr>${number}.</li.nr>\n${paragraphs}\n${META}</li>`).join('\n        ')}
      </lijst>`,
        )
        .join('\n      ')}
    </divisie>
  </divisie>
</bijlage>`

// ---------------------------------------------------------------------------
// Invented open data.
// ---------------------------------------------------------------------------

const PO = uuid(901)
const SO = uuid(902)
const VO = uuid(903)
const FASE_1 = uuid(911)
const FASE_2 = uuid(912)
const LEVELS = [
  { id: PO, title: 'po' },
  { id: SO, title: 'so' },
  { id: VO, title: 'ob vo' },
  { id: FASE_1, title: 'fase 1' },
  { id: FASE_2, title: 'fase 2' },
]

// The nodes of core goal 10: a kernzin, doelzin A with two uitwerkingen stored out of order, doelzin B with one.
// The domain also lists a secondary-school kernzin with the same number.
function goalData(itemBa = 'aanwijzen waar meer peren liggen.'): Readonly<Record<string, readonly object[]>> {
  const primary = [PO, SO]
  return {
    'sets.json': [
      { id: uuid(1), title: 'Kerndoelen fruitkunde', status: 'definitief concept', fo_domein_id: [uuid(2)] },
      { id: uuid(90), title: 'Kerndoelen groentekunde', status: 'definitief concept', fo_domein_id: [] },
    ],
    'domeinen.json': [{ id: uuid(2), title: 'Peren', fo_kernzin_id: [uuid(10), uuid(80)] }],
    'kernzinnen.json': [
      { id: uuid(10), prefix: '10', title: 'Kerndoel 10', description: SENTENCE_10, fo_doelzin_id: [uuid(11), uuid(12)] },
      { id: uuid(80), prefix: '10', title: 'Kerndoel 10', description: 'De leerling weegt peren.', fo_doelzin_id: [uuid(81)] },
    ],
    'doelzinnen.json': [
      { id: uuid(11), prefix: 'A', title: 'Doelzin 10A', description: 'De leerling telt de peren in een mand.', status: 'definitief concept', fo_uitwerking_id: [uuid(22), uuid(21)] },
      { id: uuid(12), prefix: 'B', title: 'Doelzin 10B', description: 'De leerling vergelijkt twee manden.', status: 'definitief concept', fo_uitwerking_id: [uuid(23)] },
      { id: uuid(81), prefix: 'A', title: 'Doelzin 10A', description: 'De leerling weegt een mand.', status: 'concept', fo_uitwerking_id: [uuid(82)] },
    ],
    'uitwerkingen.json': [
      { id: uuid(21), prefix: 'u1', title: 'Het gaat hierbij om', description: 'tellen tot tien;', niveau_id: primary, status: 'definitief concept' },
      { id: uuid(22), prefix: 'u2', title: 'Het gaat hierbij om', description: 'tellen in groepjes van twee.', niveau_id: primary, status: 'definitief concept' },
      { id: uuid(23), prefix: 'u1', title: 'Het gaat hierbij om', description: itemBa, niveau_id: primary, status: 'definitief concept' },
      { id: uuid(82), prefix: 'u1', title: 'Het gaat hierbij om', description: 'wegen met een weegschaal.', niveau_id: [VO], status: 'concept' },
    ],
  }
}

const goalNodes: DataNodes = {
  source: DATA_GOALS,
  selection: {
    kind: 'data',
    walk: [
      { file: 'sets.json', entity: 'fo_set', where: { title: ['Kerndoelen fruitkunde'] } },
      { file: 'domeinen.json', entity: 'fo_domein', via: 'fo_domein_id' },
      { file: 'kernzinnen.json', entity: 'fo_kernzin', via: 'fo_kernzin_id', where: { prefix: ['10'] } },
      { file: 'doelzinnen.json', entity: 'fo_doelzin', via: 'fo_doelzin_id' },
      { file: 'uitwerkingen.json', entity: 'fo_uitwerking', via: 'fo_uitwerking_id' },
    ],
    recordEntities: ['fo_kernzin', 'fo_doelzin', 'fo_uitwerking'],
    wordingField: 'description',
    codeField: 'prefix',
    level: { entity: 'fo_uitwerking', field: 'niveau_id', source: DATA_BASIS, titles: ['po', 'so'], rule: 'A kernzin is a primary-school kernzin when every uitwerking under it lists exactly these two levels.' },
    groupBy: { entity: 'fo_kernzin', field: 'prefix' },
    groups: [{ name: '10', count: 6 }],
    notes: 'Invented.',
  },
  idsPairOneToOne: true,
  pairing: 'By number, letter and position.',
}

// ---------------------------------------------------------------------------
// Invented lanes.
// ---------------------------------------------------------------------------

function lane(level: string, subject: Subject, parts: readonly LanePart[], skipped: readonly Skipped[] = []): Lane {
  return {
    jurisdiction: 'nl',
    level,
    subject,
    title: `${level} ${subject}`,
    sources: [...new Set(parts.map((part) => part.source))],
    parts,
    expectedCount: parts.reduce((sum, part) => sum + part.expectedCount, 0),
    countingMethod: 'Counted in the fixture.',
    countIsFromImportFile: true,
    domains: [],
    granularity: 'One record is one statement of the fixture.',
    skipped,
  }
}

function legalPart(name: string, source: string, elements: readonly string[], statements: readonly StatementRef[], fields: Partial<LanePart> = {}): LanePart {
  return {
    name,
    source,
    checkRendition: SAME_FILE,
    checkStrength: 'second-reading',
    checkGranularity: 'A second reading of the fixture.',
    expectedCount: statements.length,
    selection: { kind: 'legal', elements, locate: 'As the fixture is built.', statements },
    ...fields,
  }
}

const GROUP_10 = 'Kerndoelen 2026 / Onderdeel B Fruitkunde / Domein: peren / Kerndoel 10'
const CODES_10 = ['10', '10 A', '10 A a', '10 A b', '10 B', '10 B a']
const goals2026 = (fields: Partial<LanePart> = {}): LanePart =>
  legalPart(
    'Voorbeeldbesluit, bijlage 1, Onderdeel B Fruitkunde',
    DECREE_2026,
    ['/Bijlage1/DivisieB'],
    CODES_10.map((code) => ({ group: GROUP_10, code })),
    { dataNodes: goalNodes, ...fields },
  )

function seedGoals(xml = decree('Voorbeeldbesluit perendoelen', annexOfGoals(GOAL_10)), data = goalData()): void {
  seedDecree(DECREE_2026, xml, { regime: '2026' })
  seedClone(DATA_GOALS, data, { standing: 'draft-not-yet-in-force', regime: '2027-draft' })
  seedClone(DATA_BASIS, { 'niveaus.json': LEVELS })
}

// ---------------------------------------------------------------------------
// Reading what was written.
// ---------------------------------------------------------------------------

function read(file: string): string {
  return readFileSync(join(education, file), 'utf8')
}

function frontmatterOf(file: string): Record<string, unknown> {
  return parseRecord(read(file)).frontmatter
}

function files(imports: readonly PartImport[]): string[] {
  return imports.flatMap((part) => part.results.map((result) => result.file))
}

// The official wording a record file holds, and its source line.
function official(file: string): ReturnType<typeof officialWording> {
  const section = parseRecord(read(file)).sections.find((each) => each.heading === OFFICIAL_WORDING)!
  return officialWording(section.text)
}

const wordings = (imports: readonly PartImport[]): string[] => files(imports).map((file) => official(file).wording)

// Every record written and every source record: what the validator is given.
function tree(imports: readonly PartImport[]): { file: string; text: string }[] {
  const sources = readdirSync(join(education, 'sources')).map((name) => `sources/${name}`)
  return [...sources, ...files(imports)].map((file) => ({ file, text: read(file) }))
}

const END_MATH = 'corpus/nl/einde-po/mathematics/objectives'

describe('importing the Dutch core goals from the legal text', () => {
  it('writes the goal, each doelzin and each item of a core goal as records under the ids of their open-data nodes, with regime 2026', () => {
    seedGoals()

    const imports = importNetherlands(education, store, [lane('einde-po', 'mathematics', [goals2026()])])

    // The uitwerkingen of doelzin A are stored out of order: item a is the node with prefix u1.
    expect(files(imports)).toEqual([10, 11, 21, 22, 12, 23].map((n) => `${END_MATH}/${uuid(n)}.md`))
    expect(imports.map((part) => [part.lane, part.kind, part.expected, part.finding])).toEqual([['corpus/nl/einde-po/mathematics', 'legal', 6, null]])
    expect(files(imports).map((file) => frontmatterOf(file).code)).toEqual(CODES_10)
    expect(wordings(imports)).toEqual([
      SENTENCE_10,
      'De leerling telt de peren in een mand.',
      'tellen tot tien;',
      'tellen in groepjes van twee.',
      'De leerling vergelijkt twee manden.',
      'aanwijzen waar meer peren liggen.',
    ])
    expect(frontmatterOf(`${END_MATH}/${uuid(21)}.md`)).toMatchObject({
      id: `edu.nl.einde-po.mathematics.objective.${uuid(21)}`,
      title: `10 A a, ${GROUP_10}`,
      level: 'einde-po',
      subject: 'mathematics',
      content_language: 'nl',
      curriculum_version: 'In force from 2026-08-01 (invented)',
      code: '10 A a',
      code_key: '10.A.a',
      code_scope: `Voorbeeldbesluit perendoelen, ${GROUP_10}`,
      standing: 'legal-core-goal',
      regime: '2026',
      reuse_policy: 'verbatim',
      source: DECREE_2026,
      locator: `/Bijlage1/DivisieB/Divisie_1; ${GROUP_10}, 10 A a`,
      wording_sha256: wordingHash('tellen tot tien;'),
    })
    expect(official(`${END_MATH}/${uuid(21)}.md`).source).toBe('Source: Voorbeelduitgever, Voorbeeldbesluit perendoelen, bijlage 1, onderdeel B, kerndoel 10 A a.')
    expect(imports[0]!.differences).toEqual([])
    expect(validateRecords(tree(imports))).toEqual([])
  })

  it('takes standing and regime from the decree, whatever the status the open data gives its nodes', () => {
    seedGoals()

    const imports = importNetherlands(education, store, [lane('einde-po', 'mathematics', [goals2026()])])

    // Every node of the fixture data says "definitief concept", and the record of the data itself says draft.
    for (const file of files(imports)) expect(frontmatterOf(file)).toMatchObject({ standing: 'legal-core-goal', regime: '2026', source: DECREE_2026 })
  })

  it('lists, for a part whose nodes pair one to one, the statements whose wording differs from the open data', () => {
    seedGoals(undefined, goalData('aanwyzen waar meer peren liggen'))

    const imports = importNetherlands(education, store, [lane('einde-po', 'mathematics', [goals2026()])])

    // The record follows the law.
    expect(official(`${END_MATH}/${uuid(23)}.md`).wording).toBe('aanwijzen waar meer peren liggen.')
    expect(imports[0]!.differences).toHaveLength(1)
    expect(imports[0]!.differences![0]!.code).toBe('10 B a')
    expect(imports[0]!.differences![0]!.note).toContain('aanwij')
    expect(imports[0]!.differences![0]!.note).toContain('aanwy')
    const { lines, failed } = report(imports)
    expect(failed).toBe(false)
    expect(lines.join('\n')).toContain('10 B a')
  })

  it('fails a part whose statements do not pair one to one with its data nodes, naming the part', () => {
    const data = goalData()
    seedGoals(undefined, { ...data, 'doelzinnen.json': data['doelzinnen.json']!.map((node) => ('id' in node && node.id === uuid(12) ? { ...node, fo_uitwerking_id: [] } : node)) })

    const imports = importNetherlands(education, store, [lane('einde-po', 'mathematics', [goals2026()])])

    expect(imports[0]!.finding!.message).toContain('Voorbeeldbesluit, bijlage 1, Onderdeel B Fruitkunde')
    expect(imports[0]!.finding!.message).toContain('6 statement(s)')
    expect(imports[0]!.finding!.message).toContain('5 node(s)')
    expect(imports[0]!.finding!.message).toContain('10 B a')
    expect(imports[0]!.results).toEqual([])
    expect(existsSync(join(education, 'corpus'))).toBe(false)
    expect(report(imports).failed).toBe(true)
  })

  const GROUP_11 = 'Kerndoelen 2026 / Onderdeel B Fruitkunde / Domein: peren / Kerndoel 11'
  const ITEMS_11 = `<al>a. hele peren </al>\n${image('7.png')}\n<al>, halve peren </al>\n${image('8.png')}\n<al> en schillen;</al>\n<al>b. klokhuizen.</al>`
  const goal11 = (): LanePart => {
    seedDecree(DECREE_2026, decree('Voorbeeldbesluit perendoelen', annexOfGoals(goalTable(11, 'De leerling snijdt peren.', [['A', 'De leerling verdeelt een peer.', ITEMS_11]]))), { regime: '2026' })
    return legalPart(
      'Fruitkunde',
      DECREE_2026,
      ['/Bijlage1/DivisieB'],
      ['11', '11 A', '11 A a', '11 A b'].map((code) => ({ group: GROUP_11, code })),
    )
  }
  const transcribed = (name: string, text: string, fields: Partial<NlAdditions['images'][string][string]> = {}): NlAdditions => ({
    ...NO_ADDITIONS,
    images: { [DECREE_2026]: { [name]: { text, sha256: sha256(`the bytes of ${name}`), lane: 'einde-po/mathematics', group: GROUP_11, code: '11 A a', ...fields } } },
  })

  it('keeps the placeholder where an item holds an image that has no transcription, and reports the image', () => {
    const imports = importNetherlands(education, store, [lane('einde-po', 'mathematics', [goal11()])])

    expect(IMAGE_PLACEHOLDER).toBe('[afbeelding]')
    // An image splits one item over several paragraphs: the item stays one line.
    expect(wordings(imports)).toEqual(['De leerling snijdt peren.', 'De leerling verdeelt een peer.', 'hele peren [afbeelding], halve peren [afbeelding] en schillen;', 'klokhuizen.'])
    // No nodes pair with these statements, so the file is named by the group and the code.
    expect(files(imports)[2]).toBe(`${END_MATH}/kerndoelen-2026-onderdeel-b-fruitkunde-domein-peren-kerndoel-11-11-a-a.md`)
    expect(imports[0]!.differences).toBeNull()
    expect(imports[0]!.images).toEqual([
      { code: '11 A a', image: '7.png', transcribed: false },
      { code: '11 A a', image: '8.png', transcribed: false },
    ])
    expect(report(imports).lines.join('\n')).toContain('image    11 A a: 7.png has no transcription and stays [afbeelding]')
  })

  it('writes the transcription of an image the manifest lists, marked as standing for an image', () => {
    const part = goal11()

    const imports = importNetherlands(education, store, [lane('einde-po', 'mathematics', [part])], undefined, transcribed('8.png', '(1/2)'))

    expect(imageMarker('(1/2)')).toBe('[afbeelding: (1/2)]')
    expect(wordings(imports)[2]).toBe('hele peren [afbeelding], halve peren [afbeelding: (1/2)] en schillen;')
    expect(frontmatterOf(files(imports)[2]!).wording_sha256).toBe(wordingHash('hele peren [afbeelding], halve peren [afbeelding: (1/2)] en schillen;'))
    expect(imports[0]!.images).toEqual([
      { code: '11 A a', image: '7.png', transcribed: false },
      { code: '11 A a', image: '8.png', transcribed: true },
    ])
    expect(report(imports).lines[0]).toContain('1 image(s) transcribed')
  })

  it('fails on a transcription whose image is not in the text, or stands in another statement than the manifest says', () => {
    const part = goal11()
    const run = (additions: NlAdditions) => () => importNetherlands(education, store, [lane('einde-po', 'mathematics', [part])], undefined, additions)

    expect(run(transcribed('9.png', '(1/2)'))).toThrow(/9\.png.*is not in the text/)
    expect(run(transcribed('8.png', '(1/2)', { code: '11 A b' }))).toThrow(/8\.png.*11 A a.*11 A b/)
    expect(run(transcribed('8.png', '(1/2)', { lane: 'einde-po/science' }))).toThrow(/8\.png.*einde-po\/science/)
    expect(existsSync(join(education, 'corpus'))).toBe(false)
  })

  it('compares an image file fetched beside the text with the hash of the image that was transcribed', () => {
    const part = goal11()
    const folder = join(store, 'incoming', 'nl', 'wet-kerndoelen-po-2026')
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, '8.png'), 'the bytes of 8.png')
    const lanes = [lane('einde-po', 'mathematics', [part])]

    expect(importNetherlands(education, store, lanes, undefined, transcribed('8.png', '(1/2)'))[0]!.finding).toBeNull()

    writeFileSync(join(folder, '8.png'), 'another image under the same name')
    expect(() => importNetherlands(education, store, lanes, undefined, transcribed('8.png', '(1/2)'))).toThrow(/8\.png.*is not the image that was transcribed/)
  })

  it('writes one record per listed numbered goal, with the printed number as its code and the wording and its source line in the file', () => {
    const xml = decree(
      'Voorbeeldbesluit perendoelen',
      numberedGoals([
        ['Plukken en tellen', [[23, al('De leerlingen leren peren te plukken.')]]],
        [
          'Bewaren, waaronder drogen',
          [
            [
              24,
              `${al('De leerlingen leren peren te bewaren. Zij kennen het woord «kelder».', 'De leerlingen kennen')}
              <lijst type="expliciet"><li ${PATH}="/Bijlage/Divisie_5/Divisie_2/Opsomming_2/Onderdeel24/Onderdeel._1"><li.nr>–</li.nr><al>regels voor het drogen;</al></li><li><li.nr>–</li.nr><al>regels voor het inmaken.</al></li></lijst>`,
            ],
          ],
        ],
        ['Schillen', [[25, al('De leerlingen leren peren te schillen.')]]],
      ]),
    )
    seedDecree(DECREE_2006, xml, { regime: '2006', title: 'Voorbeeldbesluit perendoelen (oud)' })
    seedClone(DATA_2006, {
      'kerndoelen.json': [
        { id: uuid(323), prefix: 'PO Kerndoel 23', title: 'De leerlingen leren peren te plukken.', description: 'Plukken' },
        { id: uuid(324), prefix: 'PO Kerndoel 24', title: 'De leerlingen leren peren te bewaren. Zij kennen het woord "kelder". De leerlingen kennen: regels voor het drogen;', description: 'Bewaren' },
        { id: uuid(423), prefix: 'VO Kerndoel 23', title: 'De leerling leert peren te enten.', description: 'Enten' },
      ],
    })
    const prefixes = ['PO Kerndoel 23', 'PO Kerndoel 24']
    const part = legalPart(
      'Voorbeeldbesluit, Fruitkunde (kerndoelen 23 and 24)',
      DECREE_2006,
      ['/Bijlage/Divisie_5/Divisie_2'],
      [
        { group: 'Kerndoelen 2006 / Fruitkunde / Plukken en tellen', code: '23' },
        { group: 'Kerndoelen 2006 / Fruitkunde / Bewaren, waaronder drogen', code: '24' },
      ],
      {
        dataNodes: {
          source: DATA_2006,
          selection: {
            kind: 'data',
            walk: [{ file: 'kerndoelen.json', entity: 'kerndoel', where: { prefix: prefixes } }],
            recordEntities: ['kerndoel'],
            wordingField: 'title',
            codeField: 'prefix',
            groupBy: { entity: 'kerndoel', field: 'prefix' },
            groups: prefixes.map((name) => ({ name, count: 1 })),
            notes: 'Invented.',
          },
          idsPairOneToOne: true,
          pairing: 'Goal N pairs with the node "PO Kerndoel NN".',
        },
      },
    )

    const imports = importNetherlands(education, store, [lane('einde-po', 'mathematics', [part])])

    expect(files(imports)).toEqual([`${END_MATH}/${uuid(323)}.md`, `${END_MATH}/${uuid(324)}.md`])
    expect(files(imports).map((file) => frontmatterOf(file).code)).toEqual(['23', '24'])
    // The number and the publication data are left out, and so is goal 25, under a heading the part does not list; a goal is one record with all its paragraphs.
    // Each paragraph and each item of a list inside the goal is a line of the wording, the dash of an item on the line of its text.
    const second = 'De leerlingen leren peren te bewaren. Zij kennen het woord «kelder».\nDe leerlingen kennen\n– regels voor het drogen;\n– regels voor het inmaken.'
    expect(wordings(imports)).toEqual(['De leerlingen leren peren te plukken.', second])
    // Line breaks are whitespace to the hash, so a record that only gained them keeps its hash.
    expect(frontmatterOf(`${END_MATH}/${uuid(324)}.md`).wording_sha256).toBe(wordingHash(second.replaceAll('\n', ' ')))
    expect(read(`${END_MATH}/${uuid(324)}.md`)).toContain(
      `${OFFICIAL_WORDING}\n\n${second}\n\nSource: Voorbeelduitgever, Voorbeeldbesluit perendoelen (oud), bijlage, kerndoel 24.\n\n${ENGLISH_GLOSS}\n`,
    )
    expect(frontmatterOf(`${END_MATH}/${uuid(324)}.md`)).toMatchObject({
      title: '24, Kerndoelen 2006 / Fruitkunde / Bewaren, waaronder drogen',
      code_scope: 'Voorbeeldbesluit perendoelen (oud), Kerndoelen 2006 / Fruitkunde / Bewaren, waaronder drogen',
      standing: 'legal-core-goal',
      regime: '2006',
      locator: '/Bijlage/Divisie_5/Divisie_2/Opsomming_2/Onderdeel24; Kerndoelen 2006 / Fruitkunde / Bewaren, waaronder drogen, 24',
    })
    // A goal the data cuts short is a difference.
    expect(imports[0]!.differences!.map((difference) => difference.code)).toEqual(['24'])
    expect(validateRecords(tree(imports))).toEqual([])
  })

  it('gives two statements with the same printed code in two sets different ids and different code scopes', () => {
    seedDecree(DECREE_2026, decree('Voorbeeldbesluit perendoelen', annexOfGoals(goalTable(1, 'De leerling eet een peer.', []))), { regime: '2026', title: 'Voorbeeldbesluit perendoelen 2026' })
    seedDecree(DECREE_2006, decree('Voorbeeldbesluit perendoelen', numberedGoals([['Eten', [[1, al('De leerlingen leren een peer te eten.')]]]])), { regime: '2006', title: 'Voorbeeldbesluit perendoelen 2006' })
    const parts = [
      legalPart('The goals of 2026', DECREE_2026, ['/Bijlage1/DivisieB'], [{ group: 'Kerndoelen 2026 / Onderdeel B Fruitkunde / Domein: peren / Kerndoel 1', code: '1' }]),
      legalPart('The goals of 2006', DECREE_2006, ['/Bijlage/Divisie_5/Divisie_2'], [{ group: 'Kerndoelen 2006 / Fruitkunde / Eten', code: '1' }]),
    ]

    const imports = importNetherlands(education, store, [lane('einde-po', 'reading-language', parts)])

    const [first, second] = files(imports).map(frontmatterOf)
    expect([first!.code, second!.code]).toEqual(['1', '1'])
    expect(first!.id).not.toBe(second!.id)
    expect(first!.code_scope).toBe('Voorbeeldbesluit perendoelen 2026, Kerndoelen 2026 / Onderdeel B Fruitkunde / Domein: peren / Kerndoel 1')
    expect(second!.code_scope).toBe('Voorbeeldbesluit perendoelen 2006, Kerndoelen 2006 / Fruitkunde / Eten')
    expect([first!.regime, second!.regime]).toEqual(['2026', '2006'])
  })

  const THREE_GOALS = numberedGoals([
    [
      'Mens en fruit',
      [
        [34, al('De leerlingen leren een peer te wassen.')],
        [35, al('De leerlingen leren een peer te delen.')],
        [36, al('De leerlingen leren hoe een boomgaard wordt bestuurd.')],
      ],
    ],
  ])
  const threeGoals = (codes: readonly string[], expectedCount = codes.length): LanePart =>
    legalPart(
      'Voorbeeldbesluit, Mens en fruit',
      DECREE_2006,
      ['/Bijlage/Divisie_5/Divisie_2'],
      codes.map((code) => ({ group: 'Kerndoelen 2006 / Fruitkunde / Mens en fruit', code })),
      { expectedCount },
    )

  it('writes no record for a statement the lane lists as skipped', () => {
    seedDecree(DECREE_2006, decree('Voorbeeldbesluit perendoelen', THREE_GOALS), { regime: '2006' })
    const skipped = [{ code: '36', reason: 'Outside the four subjects.' }]

    const imports = importNetherlands(education, store, [lane('einde-po', 'practical-life-feelings', [threeGoals(['34', '35', '36'], 2)], skipped)])

    expect(files(imports).map((file) => frontmatterOf(file).code)).toEqual(['34', '35'])
    expect(imports[0]!.finding).toBeNull()
    expect(read(files(imports)[0]!)).not.toContain('boomgaard')
  })

  it('fails a part whose imported count differs from its expected count, with both numbers, and writes nothing of it', () => {
    seedDecree(DECREE_2006, decree('Voorbeeldbesluit perendoelen', THREE_GOALS), { regime: '2006' })

    // The heading holds a third goal that the part does not list: the manifest has miscounted.
    const more = importNetherlands(education, store, [lane('einde-po', 'practical-life-feelings', [threeGoals(['34', '35'])])])
    // The part lists a goal the text does not hold.
    const fewer = importNetherlands(education, store, [lane('einde-po', 'practical-life-feelings', [threeGoals(['34', '35', '36', '37'])])])

    expect(more[0]!.finding!.message).toContain('3 statement(s)')
    expect(more[0]!.finding!.message).toContain('expects 2')
    expect(more[0]!.finding!.message).toContain('36')
    expect(fewer[0]!.finding!.message).toContain('3 statement(s)')
    expect(fewer[0]!.finding!.message).toContain('expects 4')
    expect(fewer[0]!.finding!.message).toContain('37')
    expect(existsSync(join(education, 'corpus'))).toBe(false)
    const outcome = report(more)
    expect(outcome.failed).toBe(true)
    expect(outcome.lines[0]).toMatch(/^FAIL .*Voorbeeldbesluit, Mens en fruit.*3 statement\(s\).*expects 2/)
  })

  it('leaves every file byte-identical on a second run and reports each unchanged', () => {
    seedGoals()
    const lanes = [lane('einde-po', 'mathematics', [goals2026()])]
    const first = files(importNetherlands(education, store, lanes))
    const before = first.map(read)
    // A file that cannot be written to: a second write would throw.
    for (const file of first) chmodSync(join(education, file), 0o444)

    const second = importNetherlands(education, store, lanes)

    expect(second.flatMap((part) => part.results.map((result) => result.status))).toEqual(Array(6).fill('unchanged'))
    expect(files(second).map(read)).toEqual(before)
  })

  it('leaves the regions a lane agent has filled byte-identical when the official wording is imported again', () => {
    seedGoals()
    const lanes = [lane('einde-po', 'mathematics', [goals2026()])]
    importNetherlands(education, store, lanes)
    const file = `${END_MATH}/${uuid(21)}.md`
    const notes = withMarker(DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS.map((heading) => `${heading}\n\nA note about apples on a table.`).join('\n\n'))
    const filled = replaceRegion(replaceRegion(read(file), ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'counting apples up to ten;')), DESIGN_NOTES, notes)
    writeFileSync(join(education, file), filled)

    expect(importNetherlands(education, store, lanes)[0]!.results.map((result) => result.status)).toEqual(Array(6).fill('unchanged'))
    expect(read(file)).toBe(filled)

    // The decree is published again with one item reworded: only the importer's own region changes.
    seedGoals(decree('Voorbeeldbesluit perendoelen', annexOfGoals(GOAL_10.replace('a. tellen tot tien;', 'a. tellen tot twaalf;'))))
    const again = importNetherlands(education, store, lanes)

    expect(again[0]!.results.map((result) => result.status)).toEqual(['unchanged', 'unchanged', 'updated', 'unchanged', 'unchanged', 'unchanged'])
    expect(official(file).wording).toBe('tellen tot twaalf;')
    const after = parseRecord(read(file)).sections
    const kept = parseRecord(filled).sections
    for (const heading of [ENGLISH_GLOSS, DESIGN_NOTES]) expect(after.find((each) => each.heading === heading)).toEqual(kept.find((each) => each.heading === heading))
  })

  it('imports only the lane asked for', () => {
    seedGoals()
    seedDecree(DECREE_2006, decree('Voorbeeldbesluit perendoelen', THREE_GOALS), { regime: '2006' })
    const lanes = [lane('einde-po', 'mathematics', [goals2026()]), lane('einde-po', 'practical-life-feelings', [threeGoals(['34', '35', '36'])])]

    const imports = importNetherlands(education, store, lanes, 'einde-po/practical-life-feelings')

    expect(imports.map((part) => part.lane)).toEqual(['corpus/nl/einde-po/practical-life-feelings'])
    expect(readdirSync(join(education, 'corpus/nl/einde-po'))).toEqual(['practical-life-feelings'])
    expect(() => importNetherlands(education, store, lanes, 'fase-9/mathematics')).toThrow('fase-9/mathematics')
  })

  it('leaves a part of located statements to the extraction, and a lane of nothing else out', () => {
    seedGoals()
    const card: LanePart = {
      name: 'An invented card',
      source: sourceId('nl', 'nl-slo-inhoudskaart-rekenen-fase1'),
      checkRendition: SAME_FILE,
      checkStrength: 'second-reading',
      checkGranularity: 'A second reading.',
      expectedCount: 1,
      selection: { kind: 'statements', pages: [[1, 1]], locate: 'By its bullet.', statements: [{ group: 'Kaart / Peren', code: '1' }] },
    }

    const imports = importNetherlands(education, store, [lane('einde-po', 'mathematics', [goals2026(), card]), lane('peuters', 'mathematics', [card])])

    expect(imports.map((part) => part.part)).toEqual(['Voorbeeldbesluit, bijlage 1, Onderdeel B Fruitkunde'])
    expect(imports[0]!.finding).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Files no part gives any more.
// ---------------------------------------------------------------------------

describe('sweeping a lane for record files that no part gives any more', () => {
  const THREE = numberedGoals([
    [
      'Mens en fruit',
      [
        [34, al('De leerlingen leren een peer te wassen.')],
        [35, al('De leerlingen leren een peer te delen.')],
      ],
    ],
  ])
  const GROUP = 'Kerndoelen 2006 / Fruitkunde / Mens en fruit'
  const goals = (codes: readonly string[]): LanePart => legalPart('Voorbeeldbesluit, Mens en fruit', DECREE_2006, ['/Bijlage/Divisie_5/Divisie_2'], codes.map((code) => ({ group: GROUP, code })))
  const FOLDER = 'corpus/nl/einde-po/practical-life-feelings/objectives'
  const STRAY = `${FOLDER}/kerndoelen-2006-fruitkunde-mens-en-fruit-35.md`
  const removed = (slug: string): NlAdditions => ({ ...NO_ADDITIONS, removed: [{ lane: 'einde-po/practical-life-feelings', slug, reason: 'The data lists this goal twice.' }] })

  // The lane held goals 34 and 35; its manifest entry now skips 35, whose file is still there.
  function seedStray(): { lanes: Lane[]; imports: PartImport[] } {
    seedDecree(DECREE_2006, decree('Voorbeeldbesluit perendoelen', THREE), { regime: '2006' })
    importNetherlands(education, store, [lane('einde-po', 'practical-life-feelings', [goals(['34', '35'])])])
    const lanes = [lane('einde-po', 'practical-life-feelings', [goals(['34'])], [{ code: '35', reason: 'Recorded elsewhere.' }])]
    return { lanes, imports: importNetherlands(education, store, lanes) }
  }

  it('reports a file that no part gives and leaves it there when the manifest does not list it as removed', () => {
    const { lanes, imports } = seedStray()

    const orphans = sweepOrphans(education, lanes, imports)

    expect(orphans).toEqual([{ lane: 'corpus/nl/einde-po/practical-life-feelings', file: STRAY, removed: false }])
    expect(existsSync(join(education, STRAY))).toBe(true)
    const outcome = reportOrphans(orphans)
    expect(outcome.failed).toBe(true)
    expect(outcome.lines[0]).toMatch(/^ORPHAN .*mens-en-fruit-35\.md.*no part of the lane gives/)
  })

  it('removes the file when the manifest lists the record as removed, and says why', () => {
    const { lanes, imports } = seedStray()

    const orphans = sweepOrphans(education, lanes, imports, removed('kerndoelen-2006-fruitkunde-mens-en-fruit-35'))

    expect(orphans).toEqual([{ lane: 'corpus/nl/einde-po/practical-life-feelings', file: STRAY, removed: true, reason: 'The data lists this goal twice.' }])
    expect(existsSync(join(education, STRAY))).toBe(false)
    expect(readdirSync(join(education, FOLDER))).toEqual(['kerndoelen-2006-fruitkunde-mens-en-fruit-34.md'])
    expect(reportOrphans(orphans)).toEqual({ lines: [`removed  education/${STRAY}: The data lists this goal twice.`], failed: false })
    // A second sweep finds nothing: a record that is already gone is no finding.
    expect(sweepOrphans(education, lanes, imports, removed('kerndoelen-2006-fruitkunde-mens-en-fruit-35'))).toEqual([])
  })

  it('fails on a record the manifest lists as removed while a part still gives it', () => {
    const { lanes, imports } = seedStray()

    expect(() => sweepOrphans(education, lanes, imports, removed('kerndoelen-2006-fruitkunde-mens-en-fruit-34'))).toThrow(/mens-en-fruit-34.*a part of the lane still gives it/)
    expect(existsSync(join(education, STRAY))).toBe(true)
  })

  it('leaves the files of located statements alone, and a lane with a failed part unswept', () => {
    seedDecree(DECREE_2006, decree('Voorbeeldbesluit perendoelen', THREE), { regime: '2006' })
    const card: LanePart = {
      name: 'Een kaart',
      source: sourceId('nl', 'nl-slo-inhoudskaart-seo-prefase'),
      checkRendition: SAME_FILE,
      checkStrength: 'second-reading',
      checkGranularity: 'A second reading of the fixture.',
      expectedCount: 1,
      selection: { kind: 'statements', pages: [[1, 1]], locate: 'As the fixture is built.', statements: [{ group: 'Fruitkaart / Peren', code: 'Plukken / 1' }] },
    }
    const lanes = [lane('einde-po', 'practical-life-feelings', [goals(['34', '35']), card])]
    const imports = importNetherlands(education, store, lanes)
    // The extraction names the file of a located statement by its group and code; anything else is a stray.
    const located = `${FOLDER}/fruitkaart-peren-plukken-1.md`
    const stray = `${FOLDER}/een-vergeten-bestand.md`
    for (const file of [located, stray]) writeFileSync(join(education, file), 'x')

    expect(sweepOrphans(education, lanes, imports).map((orphan) => orphan.file)).toEqual([stray])

    // The part expects a third goal and fails: what the lane should hold is not known, so nothing is swept.
    const failing = [lane('einde-po', 'practical-life-feelings', [goals(['34', '35', '36']), card])]
    expect(sweepOrphans(education, failing, importNetherlands(education, store, failing))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The per-band goals: read from the open data.
// ---------------------------------------------------------------------------

const AREA = uuid(500)
const LINE = uuid(501)
const CLUSTER = uuid(502)
const OTHER_CLUSTER = uuid(503)
const SUBCLUSTER = uuid(504)

function seedBands(): void {
  seedClone(
    DATA_LINES,
    {
      'inh.vakleergebieden.json': [
        { id: AREA, prefix: 'RW', title: 'Fruitrekenen', inh_inhoudslijn_id: [LINE] },
        { id: uuid(590), prefix: 'KO', title: 'Fruit tekenen', inh_inhoudslijn_id: [] },
      ],
      'inh.inhoudslijnen.json': [{ id: LINE, prefix: 'RW/gb', title: 'Inhoudslijn Peren tellen', inh_cluster_id: [CLUSTER, OTHER_CLUSTER] }],
      'inh.clusters.json': [
        { id: CLUSTER, prefix: 'rw/gb/1', title: 'Peren op een rij', doelniveau_id: [uuid(601), uuid(602)], inh_subcluster_id: [SUBCLUSTER] },
        { id: OTHER_CLUSTER, prefix: 'rw/gb/9', title: 'Appels', doelniveau_id: [uuid(609)] },
      ],
      'inh.subclusters.json': [{ id: SUBCLUSTER, prefix: 'rw/gb/1/01', title: 'Verder tellen', doelniveau_id: [uuid(603)] }],
    },
    { title: 'Voorbeelddata: inhoudslijnen', pin: 'abcdef0123456789abcdef0123456789abcdef01' },
  )
  seedClone(
    DATA_BASIS,
    {
      'niveaus.json': LEVELS,
      'doelniveaus.json': [
        { id: uuid(601), doel_id: [uuid(701)], niveau_id: [FASE_1], prefix: 'rw/gb/1/01/fase1', title: '' },
        // The code ends in fase 1 and the goal links to fase 2.
        { id: uuid(602), doel_id: [uuid(702)], niveau_id: [FASE_2], prefix: 'rw/gb/1/02/fase1', title: '' },
        { id: uuid(603), doel_id: [uuid(703)], niveau_id: [FASE_2], prefix: 'rw/gb/1/01/01/fase2', title: '' },
        { id: uuid(609), doel_id: [uuid(709)], niveau_id: [FASE_2], prefix: 'rw/gb/9/01/fase2', title: '' },
      ],
      'doelen.json': [
        { id: uuid(701), title: 'peren tellen tot  tien\n(in een mand)', bron: 'Aanbodsdoel' },
        { id: uuid(702), title: 'peren tellen tot honderd', bron: 'Aanbodsdoel' },
        { id: uuid(703), title: 'verder tel\u00ADlen vanaf een peer/\u00ADpruim', bron: 'Aanbodsdoel' },
        { id: uuid(709), title: 'appels tellen', bron: 'Aanbodsdoel' },
      ],
    },
    { title: 'Voorbeelddata: basis', pin: '9876543210fedcba9876543210fedcba98765432' },
  )
}

const BAND_GROUP = 'Fruitrekenen / Peren tellen / Peren op een rij (rw/gb/1)'

function bandPart(fase: 1 | 2, expectedCount: number): LanePart {
  const selection: DataSelection = {
    kind: 'data',
    walk: [
      { file: 'inh.vakleergebieden.json', entity: 'inh_vakleergebied', where: { prefix: ['RW'] } },
      { file: 'inh.inhoudslijnen.json', entity: 'inh_inhoudslijn', via: 'inh_inhoudslijn_id', where: { prefix: ['RW/gb'] } },
      { file: 'inh.clusters.json', entity: 'inh_cluster', via: 'inh_cluster_id', where: { prefix: ['rw/gb/1'] } },
      { file: 'inh.subclusters.json', entity: 'inh_subcluster', via: 'inh_subcluster_id', optional: true },
    ],
    join: { via: 'doelniveau_id', source: DATA_BASIS, file: 'doelniveaus.json', entity: 'doelniveau', wording: { via: 'doel_id', file: 'doelen.json', field: 'title' } },
    recordEntities: ['doelniveau'],
    codeField: 'prefix',
    level: { entity: 'doelniveau', field: 'niveau_id', source: DATA_BASIS, titles: [`fase ${fase}`], rule: 'It is in when its level has this title.' },
    groupBy: { entity: 'inh_cluster', field: 'prefix' },
    groups: [{ name: BAND_GROUP, count: expectedCount }],
    notes: 'Invented.',
  }
  return {
    name: `Inhoudslijn Peren tellen, fase ${fase}`,
    source: DATA_LINES,
    checkRendition: SAME_FILE,
    checkStrength: 'second-reading',
    checkGranularity: 'A second reading of the fixture.',
    expectedCount,
    selection,
  }
}

describe('importing the Dutch per-band goals from the open data', () => {
  it('files a goal under the level it links to, not the one its code names, and keeps the code as the data has it', () => {
    seedBands()
    const lanes = [lane('fase-1', 'mathematics', [bandPart(1, 1)]), lane('fase-2', 'mathematics', [bandPart(2, 2)])]

    const imports = importNetherlands(education, store, lanes)

    expect(files(imports)).toEqual([
      `corpus/nl/fase-1/mathematics/objectives/${uuid(601)}.md`,
      `corpus/nl/fase-2/mathematics/objectives/${uuid(602)}.md`,
      `corpus/nl/fase-2/mathematics/objectives/${uuid(603)}.md`,
    ])
    expect(imports.map((part) => [part.kind, part.expected, part.finding, part.differences])).toEqual([
      ['data', 1, null, null],
      ['data', 2, null, null],
    ])
    const misfiled = `corpus/nl/fase-2/mathematics/objectives/${uuid(602)}.md`
    expect(frontmatterOf(misfiled)).toMatchObject({
      id: `edu.nl.fase-2.mathematics.objective.${uuid(602)}`,
      title: `rw/gb/1/02/fase1, ${BAND_GROUP}`,
      level: 'fase-2',
      code: 'rw/gb/1/02/fase1',
      code_key: 'rw.gb.1.02.fase.1',
      code_scope: `Voorbeelddata: inhoudslijnen, ${BAND_GROUP}`,
      standing: 'curriculum-institute-guidance',
      source: DATA_LINES,
      locator: `doelniveaus.json, doelniveau ${uuid(602)}, and doelen.json, doel ${uuid(702)}, of nl-slo-curriculum-basis; listed by inh.clusters.json, inh_cluster ${CLUSTER} (rw/gb/1)`,
    })
    expect(frontmatterOf(misfiled).regime).toBeUndefined()
    expect(official(misfiled)).toMatchObject({
      wording: 'peren tellen tot honderd',
      source: `Source: Voorbeeldinstituut, Voorbeelddata: inhoudslijnen (commit abcdef0), inh_cluster rw/gb/1; Voorbeelddata: basis (commit 9876543), doelniveau ${uuid(602)}.`,
    })
    // A goal that hangs off a sub-cluster is a record of its cluster's group; whitespace in a goal text is collapsed.
    expect(frontmatterOf(files(imports)[2]!)).toMatchObject({ code: 'rw/gb/1/01/01/fase2', code_scope: `Voorbeelddata: inhoudslijnen, ${BAND_GROUP}` })
    expect(frontmatterOf(files(imports)[2]!).locator).toContain(`listed by inh.subclusters.json, inh_subcluster ${SUBCLUSTER} (rw/gb/1/01)`)
    // A soft hyphen in a goal text is left out: an invisible character in a committed text defeats search.
    expect(wordings(imports)).toEqual(['peren tellen tot tien (in een mand)', 'peren tellen tot honderd', 'verder tellen vanaf een peer/pruim'])
    expect(frontmatterOf(files(imports)[2]!).wording_sha256).toBe(wordingHash('verder tellen vanaf een peer/pruim'))
    expect(validateRecords(tree(imports))).toEqual([])
  })

  it('fails a part of goals whose count differs from its expected count, with both numbers', () => {
    seedBands()

    const imports = importNetherlands(education, store, [lane('fase-2', 'mathematics', [bandPart(2, 3)])])

    expect(imports[0]!.finding!.message).toContain('2 statement(s)')
    expect(imports[0]!.finding!.message).toContain('expects 3')
    expect(existsSync(join(education, 'corpus'))).toBe(false)
  })

  it('leaves every file byte-identical on a second run', () => {
    seedBands()
    const lanes = [lane('fase-1', 'mathematics', [bandPart(1, 1)]), lane('fase-2', 'mathematics', [bandPart(2, 2)])]
    const first = files(importNetherlands(education, store, lanes))
    const before = first.map(read)
    for (const file of first) chmodSync(join(education, file), 0o444)

    const second = importNetherlands(education, store, lanes)

    expect(second.flatMap((part) => part.results.map((result) => result.status))).toEqual(['unchanged', 'unchanged', 'unchanged'])
    expect(files(second).map(read)).toEqual(before)
  })
})

// ---------------------------------------------------------------------------
// Goals the open data misfiles: regrouped, releveled, skipped.
// ---------------------------------------------------------------------------

describe('correcting what the open data misfiles', () => {
  const A = uuid(520)
  const B = uuid(521)
  const C = uuid(522)
  const [A1, A2, M1, M2, D1, D2, C1, C2] = [631, 632, 633, 634, 635, 636, 637, 638].map(uuid) as [string, string, string, string, string, string, string, string]
  const goal = (id: string): string => uuid(Number(id.slice(-3)) + 100)

  // Cluster A lists two goals of its own and two of cluster B, one of them a fase 1 goal linked to fase 2.
  // Cluster B is filled with copies of the goals of cluster C.
  function seedMisfiled(copyText = 'pruimen eerlijk verdelen'): void {
    seedClone(
      DATA_LINES,
      {
        'inh.vakleergebieden.json': [{ id: AREA, prefix: 'RW', title: 'Fruitrekenen', inh_inhoudslijn_id: [LINE] }],
        'inh.inhoudslijnen.json': [{ id: LINE, prefix: 'RW/gb', title: 'Inhoudslijn Fruit tellen', inh_cluster_id: [A, B, C] }],
        'inh.clusters.json': [
          { id: A, prefix: 'rw/gb/1', title: 'Peren', doelniveau_id: [A1, A2, M1, M2] },
          { id: B, prefix: 'rw/gb/2', title: 'Pruimen', doelniveau_id: [D1, D2] },
          { id: C, prefix: 'rw/gb/3', title: 'Kersen', doelniveau_id: [C1, C2] },
        ],
      },
      { title: 'Voorbeelddata: inhoudslijnen', pin: 'abcdef0123456789abcdef0123456789abcdef01' },
    )
    const at = (id: string, level: string, prefix: string) => ({ id, doel_id: [goal(id)], niveau_id: [level], prefix, title: '' })
    seedClone(
      DATA_BASIS,
      {
        'niveaus.json': LEVELS,
        'doelniveaus.json': [
          at(A1, FASE_1, 'rw/gb/1/01/fase1'),
          at(A2, FASE_2, 'rw/gb/1/01/fase2'),
          at(M1, FASE_2, 'rw/gb/1/02/fase2'),
          at(M2, FASE_2, 'rw/gb/1/03/fase2'),
          at(D1, FASE_1, 'rw/gb/2/01/fase1'),
          at(D2, FASE_2, 'rw/gb/2/01/fase2'),
          at(C1, FASE_1, 'rw/gb/3/01/fase1'),
          at(C2, FASE_2, 'rw/gb/3/01/fase2'),
        ],
        'doelen.json': [
          { id: goal(A1), title: 'peren tellen tot tien' },
          { id: goal(A2), title: 'peren tellen tot honderd' },
          { id: goal(M1), title: 'pruimen tellen tot tien' },
          { id: goal(M2), title: 'pruimen tellen tot honderd' },
          { id: goal(D1), title: 'kersen eerlijk verdelen' },
          { id: goal(D2), title: copyText },
          { id: goal(C1), title: 'kersen  eerlijk verdelen' },
          { id: goal(C2), title: 'pruimen eerlijk verdelen' },
        ],
      },
      { title: 'Voorbeelddata: basis', pin: '9876543210fedcba9876543210fedcba98765432' },
    )
  }

  const group = (title: string, prefix: string): string => `Fruitrekenen / Fruit tellen / ${title} (${prefix})`
  const CLUSTERS: readonly (readonly [prefix: string, title: string])[] = [
    ['rw/gb/1', 'Peren'],
    ['rw/gb/2', 'Pruimen'],
    ['rw/gb/3', 'Kersen'],
  ]
  // The goals of the line at one fase, with the number of records the manifest expects under each cluster.
  function fasePart(fase: 1 | 2, counts: readonly [number, number, number]): LanePart {
    const base = bandPart(fase, counts[0] + counts[1] + counts[2])
    const selection = base.selection as DataSelection
    const rows = CLUSTERS.map(([prefix, title], index) => ({ prefix, name: group(title, prefix), count: counts[index]! })).filter((row) => row.count > 0)
    return {
      ...base,
      name: `Inhoudslijn Fruit tellen, fase ${fase}`,
      selection: {
        ...selection,
        walk: selection.walk.slice(0, 3).map((step) => (step.entity === 'inh_cluster' ? { ...step, where: { prefix: rows.map((row) => row.prefix) } } : step)),
        groups: rows.map(({ name, count }) => ({ name, count })),
      },
    }
  }
  const UNCORRECTED = [lane('fase-1', 'mathematics', [fasePart(1, [1, 1, 1])]), lane('fase-2', 'mathematics', [fasePart(2, [3, 1, 1])])]
  const CORRECTED = [lane('fase-1', 'mathematics', [fasePart(1, [1, 1, 1])]), lane('fase-2', 'mathematics', [fasePart(2, [1, 1, 1])])]

  const WHY = { regroup: 'The data lists it under the cluster before its own.', relevel: 'The data links it to the fase after its own.', skip: 'The data lists a copy of the goal of the next cluster.' }
  const GOALS: NlAdditions['goals'][string] = {
    [M1]: {
      code: 'rw/gb/1/02/fase2',
      lane: 'fase-1/mathematics',
      corrections: [
        { kind: 'regroup', cluster: 'rw/gb/2', reason: WHY.regroup },
        { kind: 'relevel', level: 'fase 1', from: 'fase 2', reason: WHY.relevel },
      ],
    },
    [M2]: { code: 'rw/gb/1/03/fase2', lane: 'fase-2/mathematics', corrections: [{ kind: 'regroup', cluster: 'rw/gb/2', reason: WHY.regroup }] },
    [D1]: { code: 'rw/gb/2/01/fase1', lane: 'fase-1/mathematics', corrections: [{ kind: 'skip', copyOf: C1, reason: WHY.skip }] },
    [D2]: { code: 'rw/gb/2/01/fase2', lane: 'fase-2/mathematics', corrections: [{ kind: 'skip', copyOf: C2, reason: WHY.skip }] },
  }
  const corrected = (goals: NlAdditions['goals'][string] = GOALS): NlAdditions => ({ ...NO_ADDITIONS, goals: { [DATA_LINES]: goals } })
  const file = (level: string, id: string): string => `corpus/nl/${level}/mathematics/objectives/${id}.md`

  it('gives a regrouped goal the group of the cluster the manifest names, files a releveled goal at its level, writes no record for a copy, and keeps every code', () => {
    seedMisfiled()

    const imports = importNetherlands(education, store, CORRECTED, undefined, corrected())

    expect(imports.map((part) => part.finding)).toEqual([null, null])
    expect(files(imports)).toEqual([file('fase-1', A1), file('fase-1', M1), file('fase-1', C1), file('fase-2', A2), file('fase-2', M2), file('fase-2', C2)])
    expect(frontmatterOf(file('fase-1', M1))).toMatchObject({
      id: `edu.nl.fase-1.mathematics.objective.${M1}`,
      level: 'fase-1',
      // The code is the data's, also where it names the cluster and the fase the data files the goal under.
      code: 'rw/gb/1/02/fase2',
      title: `rw/gb/1/02/fase2, ${group('Pruimen', 'rw/gb/2')}`,
      code_scope: `Voorbeelddata: inhoudslijnen, ${group('Pruimen', 'rw/gb/2')}`,
      // The locator says where the data lists the goal, and what the manifest corrects.
      locator: `doelniveaus.json, doelniveau ${M1}, and doelen.json, doel ${goal(M1)}, of nl-slo-curriculum-basis; listed by inh.clusters.json, inh_cluster ${A} (rw/gb/1). Corrected by manifest/nl-additions.ts: grouped under rw/gb/2, filed at fase 1`,
    })
    expect(frontmatterOf(file('fase-2', M2))).toMatchObject({ code: 'rw/gb/1/03/fase2', code_scope: `Voorbeelddata: inhoudslijnen, ${group('Pruimen', 'rw/gb/2')}` })
    expect(frontmatterOf(file('fase-2', M2)).locator).toMatch(/Corrected by manifest\/nl-additions\.ts: grouped under rw\/gb\/2$/)
    expect(frontmatterOf(file('fase-1', A1)).locator).not.toContain('Corrected')
    expect(wordings(imports)).toEqual(['peren tellen tot tien', 'pruimen tellen tot tien', 'kersen eerlijk verdelen', 'peren tellen tot honderd', 'pruimen tellen tot honderd', 'pruimen eerlijk verdelen'])
    expect(imports.map((part) => part.corrected)).toEqual([
      [
        { id: M1, code: 'rw/gb/1/02/fase2', kinds: ['regroup', 'relevel'] },
        { id: D1, code: 'rw/gb/2/01/fase1', kinds: ['skip'] },
      ],
      [
        { id: M2, code: 'rw/gb/1/03/fase2', kinds: ['regroup'] },
        { id: D2, code: 'rw/gb/2/01/fase2', kinds: ['skip'] },
      ],
    ])
    const lines = report(imports).lines
    expect(lines[0]).toContain('3 of 3')
    expect(lines).toContain(`      corrected  rw/gb/1/02/fase2 (${M1}): regroup, relevel`)
    expect(lines).toContain(`      corrected  rw/gb/2/01/fase1 (${D1}): skip`)
    expect(validateRecords(tree(imports))).toEqual([])
  })

  it('moves the file of a releveled goal to its new lane with what a lane agent wrote in it, and sweeps the copies', () => {
    seedMisfiled()
    importNetherlands(education, store, UNCORRECTED)
    // A lane agent wrote the gloss of the goal while it was filed at fase 2.
    writeFileSync(join(education, file('fase-2', M1)), replaceRegion(read(file('fase-2', M1)), ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'counting plums up to ten')))

    const imports = importNetherlands(education, store, CORRECTED, undefined, corrected())

    expect(existsSync(join(education, file('fase-2', M1)))).toBe(false)
    expect(read(file('fase-1', M1))).toContain('counting plums up to ten')
    expect(frontmatterOf(file('fase-1', M1)).id).toBe(`edu.nl.fase-1.mathematics.objective.${M1}`)
    expect(imports[0]!.moved).toEqual([{ from: file('fase-2', M1), to: file('fase-1', M1) }])
    expect(imports[1]!.moved).toEqual([])
    expect(report(imports).lines).toContain(`      moved    education/${file('fase-2', M1)} to education/${file('fase-1', M1)}`)

    // The files of the two copies are still there: the sweep removes them, with the manifest's reason.
    const orphans = sweepOrphans(education, CORRECTED, imports, corrected())
    expect(orphans).toEqual([
      { lane: 'corpus/nl/fase-1/mathematics', file: file('fase-1', D1), removed: true, reason: WHY.skip },
      { lane: 'corpus/nl/fase-2/mathematics', file: file('fase-2', D2), removed: true, reason: WHY.skip },
    ])
    expect(readdirSync(join(education, 'corpus/nl/fase-2/mathematics/objectives')).sort()).toEqual([A2, M2, C2].map((id) => `${id}.md`).sort())

    // A second run moves nothing and changes nothing.
    const again = importNetherlands(education, store, CORRECTED, undefined, corrected())
    expect(again.flatMap((part) => part.results.map((result) => result.status))).toEqual(Array(6).fill('unchanged'))
    expect(again.flatMap((part) => part.moved)).toEqual([])
    expect(sweepOrphans(education, CORRECTED, again, corrected())).toEqual([])
  })

  it('leaves the old file of a releveled goal where it is, and says so, while its new lane does not hold the record', () => {
    seedMisfiled()
    importNetherlands(education, store, UNCORRECTED)

    // Only the lane the goal leaves is imported: its new lane has not been written yet.
    const imports = importNetherlands(education, store, CORRECTED, 'fase-2/mathematics', corrected())
    const orphans = sweepOrphans(education, CORRECTED, imports, corrected())

    expect(existsSync(join(education, file('fase-2', M1)))).toBe(true)
    expect(orphans).toEqual([
      { lane: 'corpus/nl/fase-2/mathematics', file: file('fase-2', M1), removed: false },
      { lane: 'corpus/nl/fase-2/mathematics', file: file('fase-2', D2), removed: true, reason: WHY.skip },
    ])
    expect(reportOrphans(orphans).failed).toBe(true)
  })

  it('fails on a correction that does not fit the data: an unknown id, another code or lane, a copy with another text, a correction that is not needed, a goal no part reaches', () => {
    seedMisfiled()
    const run = (goals: NlAdditions['goals'][string], lanes: readonly Lane[] = CORRECTED) => () => importNetherlands(education, store, lanes, undefined, corrected(goals))
    const only = (id: string, fields: Partial<NlAdditions['goals'][string][string]>): NlAdditions['goals'][string] => ({ ...GOALS, [id]: { ...GOALS[id]!, ...fields } })

    expect(run({ ...GOALS, [uuid(699)]: GOALS[M2]! })).toThrow(new RegExp(`${uuid(699)}.*is not in doelniveaus\\.json`))
    expect(run(only(M2, { code: 'rw/gb/1/04/fase2' }))).toThrow(/rw\/gb\/1\/03\/fase2.*rw\/gb\/1\/04\/fase2/)
    expect(run(only(M2, { lane: 'fase-2/science' }))).toThrow(/fase-2\/mathematics.*fase-2\/science/)
    expect(run(only(D2, { corrections: [{ kind: 'skip', copyOf: C1, reason: WHY.skip }] }))).toThrow(/is no copy of/)
    expect(run(only(M2, { corrections: [{ kind: 'regroup', cluster: 'rw/gb/1', reason: WHY.regroup }] }))).toThrow(/already lists it under rw\/gb\/1/)
    expect(run(only(M2, { corrections: [{ kind: 'relevel', level: 'fase 2', from: 'fase 1', reason: WHY.relevel }] }))).toThrow(/already links it to fase 2/)
    expect(run(only(M2, { lane: 'fase-1/mathematics', corrections: [{ kind: 'relevel', level: 'fase 1', from: 'fase 3', reason: WHY.relevel }] }))).toThrow(/links the goal .* to fase 3, and the data links it to fase 2/)
    expect(run(only(M2, { corrections: [{ kind: 'regroup', cluster: 'rw/gb/8', reason: WHY.regroup }] }))).toThrow(/rw\/gb\/8.*is not a group/)
    // Every lane was imported and none of them reaches the goal: the walk of fase 1 alone does not hold a fase 2 goal.
    expect(run(GOALS, [CORRECTED[0]!])).toThrow(/no part reaches/)
    expect(existsSync(join(education, 'corpus'))).toBe(false)
  })

  it('fails when a copy no longer has the text of its twin', () => {
    seedMisfiled('pruimen oneerlijk verdelen')

    expect(() => importNetherlands(education, store, CORRECTED, undefined, corrected())).toThrow(/is no copy of/)
  })
})

// ---------------------------------------------------------------------------
// What the content-line PDF of a part adds: a statement the data cuts short,
// and the example printed with a goal.
// ---------------------------------------------------------------------------

describe('reading the content-line PDF of a part beside the open data', () => {
  const PDF = sourceId('nl', 'nl-slo-inhoudslijn-rw-getalbegrip')
  const CLUSTER_ID = uuid(540)
  const [G1, G2, G3, G4, G5, G6] = [641, 642, 643, 644, 645, 646].map(uuid) as [string, string, string, string, string, string]
  const goal = (id: string): string => uuid(Number(id.slice(-3)) + 100)
  const GROUP = 'Fruitrekenen / Peren tellen / Peren op een rij (rw/gb/1)'

  function seedPrinted(texts: readonly string[] = ['peren tellen tot tien', 'peren verdelen en uitleggen hoe', 'peren wegen', 'peren ruilen', 'peren op een rij leggen', 'peren sorteren op kleur']): void {
    seedClone(
      DATA_LINES,
      {
        'inh.vakleergebieden.json': [{ id: AREA, prefix: 'RW', title: 'Fruitrekenen', inh_inhoudslijn_id: [LINE] }],
        'inh.inhoudslijnen.json': [{ id: LINE, prefix: 'RW/gb', title: 'Inhoudslijn Peren tellen', inh_cluster_id: [CLUSTER_ID] }],
        'inh.clusters.json': [{ id: CLUSTER_ID, prefix: 'rw/gb/1', title: 'Peren op een rij', doelniveau_id: [G1, G2, G3, G4, G5, G6] }],
        'inh.subclusters.json': [],
      },
      { title: 'Voorbeelddata: inhoudslijnen', pin: 'abcdef0123456789abcdef0123456789abcdef01' },
    )
    seedClone(
      DATA_BASIS,
      {
        'niveaus.json': LEVELS,
        'doelniveaus.json': [G1, G2, G3, G4, G5, G6].map((id, index) => ({ id, doel_id: [goal(id)], niveau_id: [FASE_1], prefix: `rw/gb/1/0${index + 1}/fase1`, title: '' })),
        'doelen.json': [G1, G2, G3, G4, G5, G6].map((id, index) => ({ id: goal(id), title: texts[index]! })),
      },
      { title: 'Voorbeelddata: basis', pin: '9876543210fedcba9876543210fedcba98765432' },
    )
    writeSource({ id: PDF, title: 'Voorbeeldlijn Peren tellen (PDF)', publisher: 'Voorbeeldinstituut', pin: 'b'.repeat(64), pin_kind: 'bytes', media_type: 'application/pdf', standing: 'curriculum-institute-guidance' })
  }

  // What the PDF prints in its first column, under the heading of the cluster.
  type Piece = string | readonly [italic: string]
  const printed = (page: number, ...pieces: Piece[]): PrintedItem => ({
    kind: 'goal',
    page,
    column: 1,
    cluster: 'Peren op een rij (zie ook Pruimen)',
    label: '',
    section: 'aanbodsdoelen',
    group: '',
    runs: pieces.map((piece) => (typeof piece === 'string' ? { text: piece, italic: false } : { text: piece[0], italic: true })),
  })
  const PRINTED: readonly PrintedItem[] = [
    // An example under the goal.
    printed(1, 'peren tellen tot tien ', ['(bijv. drie peren en nog twee)']),
    // An example inside the sentence.
    printed(1, 'peren verdelen ', ['(bijv. in tweeën)'], ' en uitleggen hoe'),
    // No example.
    printed(1, 'peren wegen'),
    // The statement goes on after its example: the data cuts it short.
    printed(2, 'peren ruilen ', ['(bijv. een peer voor een pruim)'], ' en zeggen wat eerlijk is'),
    // Printed twice, each time with another example.
    printed(2, 'peren op een rij leggen ', ['(bijv. van klein naar groot)']),
    printed(2, 'peren op een rij leggen ', ['(bijv. van groen naar geel)']),
    // An example in brackets that is not in italics.
    printed(2, 'peren sorteren op kleur (bijv. groen bij groen)'),
  ]
  const content = (items: readonly PrintedItem[] = PRINTED): ContentLine => ({ columns: ['fase 1*', 'fase 2*', 'fase 3*'], items: [...items], clusters: [], note: '' })
  const part = (): LanePart => ({ ...bandPart(1, 6), name: 'Inhoudslijn Peren tellen, fase 1', checkRendition: PDF, checkStrength: 'second-rendition', selection: { ...(bandPart(1, 6).selection as DataSelection), groups: [{ name: GROUP, count: 6 }] } })
  const lanes = (): Lane[] => [lane('fase-1', 'mathematics', [part()])]
  const WHY = 'The data stops where the first example stands.'
  const ADDITIONS: NlAdditions = {
    ...NO_ADDITIONS,
    restored: { [DATA_LINES]: { [G4]: { code: 'rw/gb/1/04/fase1', lane: 'fase-1/mathematics', page: 2, reason: WHY } } },
    examples: { italic: [PDF], plain: { [DATA_LINES]: { [G6]: { code: 'rw/gb/1/06/fase1', lane: 'fase-1/mathematics', page: 2, reason: 'Printed upright.' } } } },
  }
  const run = (additions: NlAdditions = ADDITIONS, items?: readonly PrintedItem[]): PartImport[] => importNetherlands(education, store, lanes(), undefined, additions, { contentLine: () => content(items) })
  const file = (id: string): string => `corpus/nl/fase-1/mathematics/objectives/${id}.md`
  const region = (id: string): string => {
    const section = parseRecord(read(file(id))).sections.find((each) => each.heading === OFFICIAL_WORDING)!
    return section.text.trim()
  }
  const FROM = `Voorbeeldinstituut, Voorbeelddata: inhoudslijnen (commit abcdef0), inh_cluster rw/gb/1; Voorbeelddata: basis (commit 9876543), doelniveau`

  it('attaches the example the PDF prints with a goal as accompanying text, in the file and in the store, and leaves the wording and its hash the data\'s', () => {
    seedPrinted()

    const imports = run()

    expect(imports[0]!.finding).toBeNull()
    // Under the goal: the example alone.
    expect(region(G1)).toBe(
      `peren tellen tot tien\n\n${accompanyingLine('the example printed under this goal in the content-line PDF, in italics')}\n(bijv. drie peren en nog twee)\n\nSource: ${FROM} ${G1}. Accompanying text: Voorbeeldinstituut, Voorbeeldlijn Peren tellen (PDF), page 1, column fase 1.`,
    )
    expect(frontmatterOf(file(G1))).toMatchObject({ wording_sha256: wordingHash('peren tellen tot tien'), supplement_sha256: wordingHash('(bijv. drie peren en nog twee)') })
    expect(getWording(store, wordingHash('(bijv. drie peren en nog twee)'))).toBe('(bijv. drie peren en nog twee)')
    // Inside the sentence: the goal as printed, so that the example keeps its place.
    expect(official(file(G2))).toMatchObject({
      wording: 'peren verdelen en uitleggen hoe',
      accompanying: { line: accompanyingLine('this goal as the content-line PDF prints it, with its examples, in italics there, inside the sentence'), text: 'peren verdelen (bijv. in tweeën) en uitleggen hoe' },
    })
    // Printed twice: both examples, each on its line.
    expect(official(file(G5)).accompanying!.text).toBe('(bijv. van klein naar groot)\n(bijv. van groen naar geel)')
    // Not in italics, and listed in the manifest: what the PDF prints after the data's wording.
    expect(official(file(G6))).toMatchObject({ wording: 'peren sorteren op kleur', accompanying: { line: accompanyingLine('the example printed in brackets after this goal in the content-line PDF'), text: '(bijv. groen bij groen)' } })
    // No example: no accompanying text, and the source line is the data's alone.
    expect(official(file(G3))).toMatchObject({ wording: 'peren wegen', accompanying: null, source: `Source: ${FROM} ${G3}.` })
    expect(frontmatterOf(file(G3)).supplement_sha256).toBeUndefined()
    expect(imports[0]!.examples).toEqual([
      { id: G1, code: 'rw/gb/1/01/fase1', kind: 'under' },
      { id: G2, code: 'rw/gb/1/02/fase1', kind: 'inside' },
      { id: G5, code: 'rw/gb/1/05/fase1', kind: 'printings' },
      { id: G6, code: 'rw/gb/1/06/fase1', kind: 'plain' },
    ])
    expect(report(imports).lines[0]).toContain('1 statement(s) restored from the content-line PDF; 4 with an example of the content-line PDF as accompanying text')
    expect(validateRecords(tree(imports))).toEqual([])
  })

  it('takes the whole statement from the PDF for a goal the data cuts short, cites the PDF, and attaches nothing to it', () => {
    seedPrinted()

    const imports = run()

    const whole = 'peren ruilen (bijv. een peer voor een pruim) en zeggen wat eerlijk is'
    expect(official(file(G4))).toEqual({
      wording: whole,
      accompanying: null,
      source: `Source: Voorbeeldinstituut, Voorbeeldlijn Peren tellen (PDF), page 2, column fase 1: the statement as printed there, which the open data cuts short. The record is the goal of ${FROM} ${G4}.`,
      sourceOffset: 4,
    })
    expect(frontmatterOf(file(G4))).toMatchObject({ code: 'rw/gb/1/04/fase1', source: DATA_LINES, wording_sha256: wordingHash(whole) })
    expect(frontmatterOf(file(G4)).locator).toMatch(/\(rw\/gb\/1\)\. Wording read from nl-slo-inhoudslijn-rw-getalbegrip, page 2, column fase 1$/)
    expect(frontmatterOf(file(G4)).supplement_sha256).toBeUndefined()
    expect(imports[0]!.restored).toEqual([{ id: G4, code: 'rw/gb/1/04/fase1', pages: [2] }])
    expect(report(imports).lines).toContain(`      restored   rw/gb/1/04/fase1 (${G4}): page 2`)
  })

  it('ends a restored statement where its upright text ends, and attaches the example in italics that closes it', () => {
    seedPrinted()
    // The data stops at the comma; the PDF prints the clause after it upright and an example under it in italics.
    const items = [...PRINTED.slice(0, 3), printed(2, "peren ruilen, ook met een 'pruim' ", '\n', ['(bijv. een peer voor een pruim)']), ...PRINTED.slice(4)]

    const imports = run(ADDITIONS, items)

    const pdf = 'Voorbeeldinstituut, Voorbeeldlijn Peren tellen (PDF), page 2, column fase 1'
    expect(official(file(G4))).toMatchObject({
      wording: "peren ruilen, ook met een 'pruim'",
      accompanying: { line: accompanyingLine('the example printed under this goal in the content-line PDF, in italics'), text: '(bijv. een peer voor een pruim)' },
      source: `Source: ${pdf}: the statement as printed there, which the open data cuts short. The record is the goal of ${FROM} ${G4}. Accompanying text: ${pdf}.`,
    })
    expect(frontmatterOf(file(G4))).toMatchObject({ wording_sha256: wordingHash("peren ruilen, ook met een 'pruim'"), supplement_sha256: wordingHash('(bijv. een peer voor een pruim)') })
    expect(imports[0]!.restored).toEqual([{ id: G4, code: 'rw/gb/1/04/fase1', pages: [2] }])
    expect(imports[0]!.examples.map((each) => each.code)).toContain('rw/gb/1/04/fase1')
    expect(validateRecords(tree(imports))).toEqual([])
    // Nothing but an example follows what the data holds: the goal is not cut short, and need not be listed.
    const onlyAnExample = [...PRINTED.slice(0, 3), printed(2, 'peren ruilen ', ['(bijv. een peer voor een pruim)']), ...PRINTED.slice(4)]
    expect(() => run(ADDITIONS, onlyAnExample)).toThrow(/prints no more statement text for rw\/gb\/1\/04\/fase1.*need not list it as restored/)
  })

  it('cuts an example where the italics open: a mark that closes the statement stays with it, and a raised digit and a sign are written as printed', () => {
    seedPrinted(["peren tellen (groen, geel)", 'peren verdelen en uitleggen hoe', "peren 'wegen'", 'peren ruilen', 'peren op een rij leggen', 'peren sorteren op kleur'])
    const styled = (page: number, runs: PrintedItem['runs']): PrintedItem => ({ ...printed(page), runs })
    const items = [
      // The bracket that closes the statement is set upright, before the example.
      printed(1, 'peren tellen (groen, geel) ', '\n', ['(bijv. drie peren)']),
      PRINTED[1]!,
      // A quotation mark closes the statement; the example holds a raised digit and a sign that is not in italics.
      styled(1, [
        { text: "peren 'wegen' ", italic: false },
        { text: '(bijv. 4,9 kilo ', italic: true },
        { text: '≈', italic: false },
        { text: ' 5 kilo per m', italic: true },
        { text: '2', italic: true, raised: true },
        { text: ')', italic: true },
      ]),
      ...PRINTED.slice(3),
    ]

    const imports = run(ADDITIONS, items)

    expect(official(file(G1))).toMatchObject({ wording: 'peren tellen (groen, geel)', accompanying: { text: '(bijv. drie peren)' } })
    expect(official(file(G3))).toMatchObject({ wording: "peren 'wegen'", accompanying: { text: '(bijv. 4,9 kilo ≈ 5 kilo per m²)' } })
    expect(imports[0]!.notes).toEqual([])
    // A sign the reader has no character for stops the run.
    const unread = [...items.slice(0, 2), styled(1, [{ text: "peren 'wegen' ", italic: false }, { text: '(bijv. 4,9 kilo \uF0B7 5 kilo)', italic: true }]), ...items.slice(3)]
    expect(() => run(ADDITIONS, unread)).toThrow(/rw\/gb\/1\/03\/fase1.*symbol font/)
  })

  it('names the page an example stands on, and both pages of a statement or an example that runs on overleaf', () => {
    seedPrinted()
    const overleaf = (page: number, ...pieces: (Piece | { next: Piece })[]): PrintedItem => ({
      ...printed(page),
      runs: pieces.map((piece) => {
        const text = typeof piece === 'object' && 'next' in piece ? piece.next : piece
        return { ...(typeof text === 'string' ? { text, italic: false } : { text: text[0], italic: true }), ...(typeof piece === 'object' && 'next' in piece ? { page: page + 1 } : {}) }
      }),
    })
    const items = [
      // The goal stands at the foot of page 1 and its example at the top of page 2.
      overleaf(1, 'peren tellen tot tien ', { next: ['(bijv. drie peren en nog twee)'] }),
      // An example inside the sentence: the goal as printed is the accompanying text, and it runs on overleaf.
      overleaf(1, 'peren verdelen ', ['(bijv. in tweeën)'], { next: ' en uitleggen hoe' }),
      PRINTED[2]!,
      // A restored statement that runs on overleaf.
      overleaf(2, 'peren ruilen ', ['(bijv. een peer voor een pruim)'], { next: ' en zeggen wat eerlijk is' }),
      // Printed twice: the second example runs on overleaf.
      PRINTED[4]!,
      overleaf(2, 'peren op een rij leggen ', ['(bijv. van groen '], { next: ['naar geel)'] }),
      PRINTED[6]!,
    ]
    const through = (page: number | undefined): NlAdditions => ({ ...ADDITIONS, restored: { [DATA_LINES]: { [G4]: { ...ADDITIONS.restored[DATA_LINES]![G4]!, ...(page === undefined ? {} : { through: page }) } } } })

    const imports = run(through(3), items)

    const cites = (id: string): string => official(file(id)).source ?? ''
    expect(cites(G1)).toMatch(/Accompanying text: Voorbeeldinstituut, Voorbeeldlijn Peren tellen \(PDF\), page 2, column fase 1\.$/)
    expect(cites(G2)).toMatch(/Accompanying text: .*, pages 1 and 2, column fase 1\.$/)
    expect(cites(G5)).toMatch(/Accompanying text: .*, pages 2 and 3, column fase 1\.$/)
    expect(official(file(G5)).accompanying!.text).toBe('(bijv. van klein naar groot)\n(bijv. van groen naar geel)')
    expect(cites(G4)).toMatch(/^Source: Voorbeeldinstituut, Voorbeeldlijn Peren tellen \(PDF\), pages 2 and 3, column fase 1: the statement as printed there/)
    expect(frontmatterOf(file(G4)).locator).toMatch(/Wording read from nl-slo-inhoudslijn-rw-getalbegrip, pages 2 and 3, column fase 1$/)
    expect(imports[0]!.restored).toEqual([{ id: G4, code: 'rw/gb/1/04/fase1', pages: [2, 3] }])
    expect(report(imports).lines).toContain(`      restored   rw/gb/1/04/fase1 (${G4}): pages 2 and 3`)
    // The manifest says where a restored statement ends, for the frame; the importer holds it to that.
    expect(() => run(through(undefined), items)).toThrow(/rw\/gb\/1\/04\/fase1.*ends on page 3.*manifest says it ends on page 2/)
  })

  it('gives the goals of a part as the importer makes records of them, for another tool to join to the PDF', () => {
    seedPrinted()
    const [only] = lanes()

    const goals = goalsOfPart(only!, only!.parts[0]!, openData(education, store), ADDITIONS)

    expect(goals).toHaveLength(6)
    expect(goals[0]).toEqual({ id: G1, code: 'rw/gb/1/01/fase1', wording: 'peren tellen tot tien', cluster: 'Peren op een rij' })
    // A part that is not read from the open data has none.
    expect(goalsOfPart(only!, { ...only!.parts[0]!, selection: { kind: 'statements', locate: 'By page.', statements: [] } }, openData(education, store))).toEqual([])
  })

  it('reads no PDF for a part that lists none, and changes nothing on a second run', () => {
    seedPrinted()
    const untouched = importNetherlands(education, store, lanes(), undefined, NO_ADDITIONS, {
      contentLine: () => {
        throw new Error('no PDF is read')
      },
    })
    expect(untouched[0]!.examples).toEqual([])
    expect(official(file(G1)).accompanying).toBeNull()

    const first = run()
    expect(first[0]!.results.map((result) => result.status)).toEqual(['updated', 'updated', 'unchanged', 'updated', 'updated', 'updated'])
    expect(run()[0]!.results.map((result) => result.status)).toEqual(Array(6).fill('unchanged'))
  })

  it('fails when a goal cannot be joined to a statement of its column, and when the PDF prints more statement text than the data and the manifest does not say so', () => {
    seedPrinted(['peren tellen tot tien', 'peren verdelen en uitleggen hoe', 'peren wegen', 'peren ruilen', 'peren op een rij leggen', 'peren sorteren op kleur'])

    // Two goals of the cluster have no statement, and two statements are left: neither can be told.
    const others = [...PRINTED.slice(0, 2), printed(1, 'peren schillen'), printed(1, 'peren eten'), ...PRINTED.slice(3)]
    expect(() => run(ADDITIONS, others)).toThrow(/rw\/gb\/1\/03\/fase1.*cannot be joined/)
    // The goal the data cuts short is not listed as restored.
    expect(() => run({ ...ADDITIONS, restored: {} })).toThrow(/prints more statement text for rw\/gb\/1\/04\/fase1/)
    // The bracketed example that is not in italics is not listed as plain.
    expect(() => run({ ...ADDITIONS, examples: { italic: [PDF], plain: {} } })).toThrow(/rw\/gb\/1\/06\/fase1.*not in italics/)
    expect(existsSync(join(education, 'corpus'))).toBe(false)
  })

  it('fails on a listed goal that does not fit the PDF: another page, another code or lane, nothing more printed than the data holds', () => {
    seedPrinted()
    const restoredAs = (fields: Partial<NlAdditions['restored'][string][string]>): NlAdditions => ({ ...ADDITIONS, restored: { [DATA_LINES]: { [G4]: { ...ADDITIONS.restored[DATA_LINES]![G4]!, ...fields } } } })

    expect(() => run(restoredAs({ page: 1 }))).toThrow(/0 statements of page 1, column fase 1, open with the wording/)
    expect(() => run(restoredAs({ code: 'rw/gb/1/09/fase1' }))).toThrow(/rw\/gb\/1\/04\/fase1.*rw\/gb\/1\/09\/fase1/)
    expect(() => run(restoredAs({ lane: 'fase-2/mathematics' }))).toThrow(/fase-1\/mathematics.*fase-2\/mathematics/)
    expect(() => run({ ...ADDITIONS, restored: { [DATA_LINES]: { ...ADDITIONS.restored[DATA_LINES], [G3]: { code: 'rw/gb/1/03/fase1', lane: 'fase-1/mathematics', page: 1, reason: WHY } } } })).toThrow(/prints no more for rw\/gb\/1\/03\/fase1/)
  })

  it('joins the one goal left under its cluster to the one statement left, and says so', () => {
    seedPrinted(['peren tellen tot tien', 'peren verdelen en uitleggen hoe', 'kan peren wegen', 'peren ruilen', 'peren op een rij leggen', 'peren sorteren op kleur'])

    const imports = run()

    expect(imports[0]!.notes).toEqual([`rw/gb/1/03/fase1 (${G3}) was joined to the one statement left under its cluster on page 1: the PDF words it differently`])
    expect(report(imports).lines.join('\n')).toContain('note     rw/gb/1/03/fase1')
  })
})

// ---------------------------------------------------------------------------
// The reference levels and the aims for childcare: legal text without codes
// of its own, or with the article as its code.
// ---------------------------------------------------------------------------

type Cell = readonly [column: string, content: string]

const cells = (row: readonly Cell[]): string =>
  `<row>${row.map(([column, content]) => (column.includes('-') ? `<entry namest="${column.split('-')[0]}" nameend="${column.split('-')[1]}">${content}</entry>` : `<entry colname="${column}">${content}</entry>`)).join('')}</row>`

const table = (columns: number, head: readonly Cell[], body: readonly (readonly Cell[])[]): string =>
  `<table><tgroup cols="${columns}">${Array.from({ length: columns }, (_, index) => `<colspec colname="col${index + 1}"/>`).join('')}<thead>${cells(head)}</thead><tbody>${body.map(cells).join('\n')}</tbody></tgroup></table>`

const division = (path: string, heading: string, content: string): string => `<divisie ${PATH}="${path}"><kop><nr>${heading.split(' ')[0]}</nr><titel>${heading.split(' ').slice(1).join(' ')}</titel></kop>${content}</divisie>`

const LEVEL_HEAD: readonly Cell[] = [
  ['col1', ''],
  ['col2', al('Niveau 1F')],
  ['col3', al('Niveau 2F')],
  ['col4', al('Niveau 3F')],
]
const blank: readonly Cell[] = [
  ['col1', ''],
  ['col2', ''],
  ['col3', ''],
  ['col4', ''],
]
const label = (text: string): readonly Cell[] => [['col1', al(text)], ...blank.slice(1)]

const LANGUAGE_ANNEX = `<bijlage ${PATH}="/Bijlage1"><kop><label>Bijlage</label><nr>1</nr></kop>
${division(
  '/Bijlage1/Divisie1_1/Divisie1.1',
  '1.1 Fruitgesprekken',
  table(4, LEVEL_HEAD, [
    [
      ['col1', al('Algemene omschrijving Fruitgesprekken')],
      ['col2', al('Kan over peren praten.')],
      ['col3', al('Kan over peren en pruimen praten.')],
      ['col4', al('Kan over elk fruit praten.')],
    ],
    blank,
    label('Taken'),
    [
      ['col1', al('1. Overleggen')],
      ['col2', al('Kan zeggen welke peer rijp is.', 'Kan vragen wie een peer wil.')],
      ['col3', al('Kan uitleggen waarom een peer rijp is.')],
      ['col4', ''],
    ],
  ]),
)}
${division(
  '/Bijlage1/Divisie1_2/Divisie1.1',
  '1.1 vervolg Fruitgesprekken',
  table(4, LEVEL_HEAD, [
    [
      ['col1', al('2. Vertellen')],
      ['col2', ''],
      ['col3', al('Kan vertellen hoe een peer smaakt.')],
      ['col4', al('Kan een perenverhaal vertellen.')],
    ],
  ]),
)}
${division(
  '/Bijlage1/Divisie1_3/Divisie1.2',
  '1.2 Fruit beluisteren',
  table(4, LEVEL_HEAD, [
    [
      ['col1', al('1. Overleggen')],
      ['col2', al('Kan horen of een peer valt.')],
      ['col3', ''],
      ['col4', ''],
    ],
  ]),
)}
</bijlage>`

const reference = (level: string, section: string): string => `Referentieniveau ${level} Fruittaal / ${section}`

describe('importing the Dutch reference levels and aims for childcare from the legal text', () => {
  it('writes one record per paragraph of a level column, with an empty code and the level, section, labels and position in its id and locator', () => {
    seedDecree(REFERENCE, decree('Voorbeeldbesluit fruitniveaus', LANGUAGE_ANNEX), { standing: 'legal-reference-level', title: 'Voorbeeldbesluit fruitniveaus' })
    const elements = ['/Bijlage1/Divisie1_1/Divisie1.1', '/Bijlage1/Divisie1_2/Divisie1.1', '/Bijlage1/Divisie1_3/Divisie1.2']
    const at = (level: string, statements: readonly (readonly [section: string, code: string])[]): LanePart =>
      legalPart(
        `Voorbeeldbesluit, niveau ${level}`,
        REFERENCE,
        elements,
        statements.map(([section, code]) => ({ group: reference(level, section), code })),
      )
    const parts = [
      at('1F', [
        ['1.1 Fruitgesprekken', 'Algemene omschrijving Fruitgesprekken / 1'],
        ['1.1 Fruitgesprekken', 'Taken / 1. Overleggen / 1'],
        ['1.1 Fruitgesprekken', 'Taken / 1. Overleggen / 2'],
        // The group label of a section does not hold in the next one.
        ['1.2 Fruit beluisteren', '1. Overleggen / 1'],
      ]),
      at('2F', [
        ['1.1 Fruitgesprekken', 'Algemene omschrijving Fruitgesprekken / 1'],
        ['1.1 Fruitgesprekken', 'Taken / 1. Overleggen / 1'],
        // The group label holds in the division that continues the table.
        ['1.1 Fruitgesprekken', 'Taken / 2. Vertellen / 1'],
      ]),
    ]

    const imports = importNetherlands(education, store, [lane('einde-po', 'reading-language', parts)])

    expect(imports.map((part) => part.finding)).toEqual([null, null])
    expect(wordings(imports)).toEqual([
      'Kan over peren praten.',
      'Kan zeggen welke peer rijp is.',
      'Kan vragen wie een peer wil.',
      'Kan horen of een peer valt.',
      'Kan over peren en pruimen praten.',
      'Kan uitleggen waarom een peer rijp is.',
      'Kan vertellen hoe een peer smaakt.',
    ])
    const third = files(imports)[2]!
    expect(third).toBe('corpus/nl/einde-po/reading-language/objectives/referentieniveau-1f-fruittaal-1-1-fruitgesprekken-taken-1-overleggen-2.md')
    expect(frontmatterOf(third)).toMatchObject({
      title: `${reference('1F', '1.1 Fruitgesprekken')}, Taken / 1. Overleggen / 2`,
      code: '',
      code_key: '',
      code_scope: `Voorbeeldbesluit fruitniveaus, ${reference('1F', '1.1 Fruitgesprekken')}`,
      standing: 'legal-reference-level',
      locator: `/Bijlage1/Divisie1_1/Divisie1.1; ${reference('1F', '1.1 Fruitgesprekken')}, Taken / 1. Overleggen / 2`,
    })
    expect(frontmatterOf(third).regime).toBeUndefined()
    expect(official(third).source).toBe('Source: Voorbeelduitgever, Voorbeeldbesluit fruitniveaus, bijlage 1, 1.1 Fruitgesprekken, niveau 1F, Taken / 1. Overleggen / 2.')
    expect(frontmatterOf(files(imports)[6]!).locator).toBe(`/Bijlage1/Divisie1_2/Divisie1.1; ${reference('2F', '1.1 Fruitgesprekken')}, Taken / 2. Vertellen / 1`)
    expect(validateRecords(tree(imports))).toEqual([])
  })

  it('joins a paragraph that holds only a joining sign to the paragraph before it, and leaves the positions of the others as the cell has them', () => {
    const annex = `<bijlage ${PATH}="/Bijlage1"><kop><label>Bijlage</label><nr>1</nr></kop>${division(
      '/Bijlage1/Divisie1_6/Divisie1.3',
      '1.3 Fruit bespreken',
      table(4, LEVEL_HEAD, [
        [
          ['col1', al('Vlot praten')],
          ['col2', al('Zie Fruitgesprekken', '+', 'Praat zonder haperen over peren.')],
          ['col3', al('Zie Fruitgesprekken')],
          ['col4', ''],
        ],
      ]),
    )}</bijlage>`
    seedDecree(REFERENCE, decree('Voorbeeldbesluit fruitniveaus', annex), { standing: 'legal-reference-level', title: 'Voorbeeldbesluit fruitniveaus' })
    const at = (level: string, codes: readonly string[]): LanePart => legalPart(`Voorbeeldbesluit, niveau ${level}`, REFERENCE, ['/Bijlage1/Divisie1_6/Divisie1.3'], codes.map((code) => ({ group: reference(level, '1.3 Fruit bespreken'), code })))

    // The sign is the second paragraph of its cell and no record: the statement after it is still the third.
    const imports = importNetherlands(education, store, [lane('einde-po', 'reading-language', [at('1F', ['Vlot praten / 1', 'Vlot praten / 3']), at('2F', ['Vlot praten / 1'])])])

    expect(imports.map((part) => part.finding)).toEqual([null, null])
    expect(wordings(imports)).toEqual(['Zie Fruitgesprekken +', 'Praat zonder haperen over peren.', 'Zie Fruitgesprekken'])
    expect(files(imports)[1]).toBe('corpus/nl/einde-po/reading-language/objectives/referentieniveau-1f-fruittaal-1-3-fruit-bespreken-vlot-praten-3.md')

    // A manifest that still lists the sign as a statement of its own no longer fits the text.
    const stale = importNetherlands(education, store, [lane('einde-po', 'reading-language', [at('1F', ['Vlot praten / 1', 'Vlot praten / 2', 'Vlot praten / 3'])])])
    expect(stale[0]!.finding!.message).toContain('Vlot praten / 2')
  })

  it('reads a table of terms by cell and a table of marks by row, pairing the marked rows with the listed statements in order', () => {
    const terms = table(
      3,
      [
        ['col1', ''],
        ['col2', al('1F')],
        ['col3', al('2F')],
      ],
      [
        [
          ['col1', al('Fruitsoorten')],
          ['col2', al('Peer, pruim, kers.')],
          ['col3', al('Kweepeer.', 'Mispel: een vrucht die laat rijpt.')],
        ],
        [
          ['col1', al('Gereedschap')],
          ['col2', al('Mand, ladder.')],
          ['col3', ''],
        ],
      ],
    )
    const marks = table(
      3,
      [
        ['col1', al('Plukken')],
        ['col2', al('1F')],
        ['col3', al('2F')],
      ],
      [
        [
          ['col1', al('1. Plukken met de hand', 'Hieronder vallen ook de laaghangende peren.')],
          ['col2', al('+')],
          ['col3', ''],
        ],
        [
          ['col1', al('Moeilijke gevallen:')],
          ['col2', ''],
          ['col3', ''],
        ],
        [
          ['col1', al('a) peren boven in de boom (ladder)')],
          ['col2', ''],
          ['col3', al('+')],
        ],
        [
          ['col1', al('2. Plukken met een stok')],
          ['col2', al('+')],
          ['col3', ''],
        ],
      ],
    )
    const annex = `<bijlage ${PATH}="/Bijlage1"><kop><label>Bijlage</label><nr>1</nr></kop><divisie ${PATH}="/Bijlage1/Divisie4">${division('/Bijlage1/Divisie4/Divisie4.1', '4.1 Fruitwoorden', `<al>Een inleiding die geen niveau heeft.</al>${terms}`)}${division('/Bijlage1/Divisie4/Divisie4.4', '4.4 Moeilijkheid', marks)}</divisie></bijlage>`
    seedDecree(REFERENCE, decree('Voorbeeldbesluit fruitniveaus', annex), { standing: 'legal-reference-level' })
    const elements = ['/Bijlage1/Divisie4/Divisie4.1', '/Bijlage1/Divisie4/Divisie4.4']
    const parts = [
      legalPart('Section 4, niveau 1F', REFERENCE, elements, [
        { group: reference('1F', '4.1 Fruitwoorden'), code: 'Fruitsoorten' },
        { group: reference('1F', '4.1 Fruitwoorden'), code: 'Gereedschap' },
        { group: reference('1F', '4.4 Moeilijkheid'), code: 'Plukken / 1. Plukken met de hand' },
        { group: reference('1F', '4.4 Moeilijkheid'), code: 'Plukken / 2. Plukken met een stok' },
      ]),
      legalPart('Section 4, niveau 2F', REFERENCE, elements, [
        { group: reference('2F', '4.1 Fruitwoorden'), code: 'Fruitsoorten' },
        { group: reference('2F', '4.4 Moeilijkheid'), code: 'Plukken / 1. Plukken met de hand / Moeilijke gevallen / a)' },
      ]),
    ]

    const imports = importNetherlands(education, store, [lane('einde-po', 'reading-language', parts)])

    expect(imports.map((part) => part.finding)).toEqual([null, null])
    expect(wordings(imports)).toEqual([
      'Peer, pruim, kers.',
      'Mand, ladder.',
      '1. Plukken met de hand\nHieronder vallen ook de laaghangende peren.',
      '2. Plukken met een stok',
      'Kweepeer.\nMispel: een vrucht die laat rijpt.',
      'a) peren boven in de boom (ladder)',
    ])
    expect(frontmatterOf(files(imports)[5]!)).toMatchObject({
      code: '',
      locator: `/Bijlage1/Divisie4/Divisie4.4; ${reference('2F', '4.4 Moeilijkheid')}, Plukken / 1. Plukken met de hand / Moeilijke gevallen / a)`,
    })
  })

  it('reads an arithmetic table by dash statement: its examples in later rows and half-width cells, the kind of knowledge, and the sub-area', () => {
    const wide: readonly Cell[] = [
      ['col1', ''],
      ['col2-col3', al('Niveau 1F', 'Paraat hebben')],
      ['col4-col5', al('Niveau 1S', 'Paraat hebben')],
    ]
    const first = table(5, wide, [
      [
        ['col1', `<al><nadruk type="halfvet">A Fruit benoemen</nadruk></al>${al('– Namen van fruit')}`],
        ['col2-col3', `${al('– een peer herkennen', '– een halve peer herkennen')}\n${IMAGE}\n${al('– pruimen in een rij leggen:')}`],
        ['col4-col5', al('– een kweepeer herkennen')],
      ],
      [
        ['col1', al('toegestaan)')],
        ['col2', al('3 pruimen')],
        ['col3', al('5 pruimen')],
        ['col4-col5', al('• ook als de kweepeer nog groen is')],
      ],
      [
        ['col1', ''],
        ['col2-col3', al('Weten waarom')],
        ['col4-col5', al('Weten waarom')],
      ],
      [
        ['col1', ''],
        ['col2-col3', al('– uitleggen waarom een peer valt')],
        ['col4-col5', ''],
      ],
      [
        ['col1', `<al><nadruk type="halfvet">B Fruit tellen</nadruk></al>`],
        ['col2-col3', al('Niveau 1F', 'Paraat hebben')],
        ['col4-col5', al('Niveau 1S', 'Paraat hebben')],
      ],
      [
        ['col1', ''],
        ['col2-col3', al('– peren tellen tot tien')],
        ['col4-col5', al('– peren tellen tot duizend')],
      ],
    ])
    const narrow: readonly Cell[] = [
      ['col1', ''],
      ['col2', al('Niveau 1F', 'Functioneel gebruiken')],
      ['col3', al('Niveau 1S', 'Functioneel gebruiken')],
    ]
    const second = table(3, narrow, [
      [
        ['col1', `<al><nadruk type="halfvet">B Fruit tellen</nadruk></al>`],
        ['col2', al('– een mand peren verdelen:', '<sup>1</sup>/<inf>2</inf> mand voor elk', '<sup>25</sup>/<inf>4</inf> = 6<sup>1</sup>/<inf>4</inf> peer op 1 m<sup>2</sup>', 'p<sup>n</sup> of p<inf>n</inf>, maar p<sup>q</sup> en p<inf>b</inf>')],
        ['col3', al('– een boomgaard verdelen')],
      ],
    ])
    const annex = `<bijlage ${PATH}="/Bijlage2"><kop><label>Bijlage</label><nr>2</nr></kop>
<divisie ${PATH}="/Bijlage2/Divisie1_1">${division('/Bijlage2/Divisie1_1/Divisie1.1', '1.1 Fruit niveau 1F en 1S', first)}</divisie>
<divisie ${PATH}="/Bijlage2/Divisie1_2">${division('/Bijlage2/Divisie1_2/Divisie1.1', '1.1 vervolg Fruit niveau 1F en 1S', `${second}<al>Een opmerking onder de tabel.</al>`)}</divisie></bijlage>`
    seedDecree(REFERENCE, decree('Voorbeeldbesluit fruitniveaus', annex), { standing: 'legal-reference-level', title: 'Voorbeeldbesluit fruitniveaus' })
    const group = 'Referentieniveau 1F fruitrekenen / 1 Fruit'
    const part = legalPart(
      'Bijlage 2, fruitrekenen niveau 1F',
      REFERENCE,
      ['/Bijlage2/Divisie1_1/Divisie1.1', '/Bijlage2/Divisie1_2/Divisie1.1'],
      ['A Fruit benoemen / Paraat hebben / 1', 'A Fruit benoemen / Paraat hebben / 2', 'A Fruit benoemen / Paraat hebben / 3', 'A Fruit benoemen / Weten waarom / 1', 'B Fruit tellen / Paraat hebben / 1', 'B Fruit tellen / Functioneel gebruiken / 1'].map(
        (code) => ({ group, code }),
      ),
    )

    const imports = importNetherlands(education, store, [lane('einde-po', 'mathematics', [part])])

    expect(imports[0]!.finding).toBeNull()
    // The dash that opens a statement is its list marker, as a letter or a number is, and is left out.
    expect(wordings(imports)).toEqual([
      'een peer herkennen',
      'een halve peer herkennen [afbeelding]',
      // The examples of a statement stand in two half-width cells of the next row: each is a line.
      'pruimen in een rij leggen:\n3 pruimen\n5 pruimen',
      'uitleggen waarom een peer valt',
      'peren tellen tot tien',
      // What the text sets raised or lowered is written with the raised and lowered characters, so a mixed number
      // stays one: 6¹/₄, not 61/4. A character that has no such form (a raised q, a lowered b) stays as it is.
      'een mand peren verdelen:\n¹/₂ mand voor elk\n²⁵/₄ = 6¹/₄ peer op 1 m²\npⁿ of pₙ, maar pq en pb',
    ])
    expect(frontmatterOf(files(imports)[5]!)).toMatchObject({
      code: '',
      title: `${group}, B Fruit tellen / Functioneel gebruiken / 1`,
      locator: `/Bijlage2/Divisie1_2/Divisie1.1; ${group}, B Fruit tellen / Functioneel gebruiken / 1`,
    })
    expect(official(files(imports)[5]!).source).toBe('Source: Voorbeelduitgever, Voorbeeldbesluit fruitniveaus, bijlage 2, 1 Fruit, niveau 1F, B Fruit tellen / Functioneel gebruiken / 1.')
    expect(files(imports)[1]).toBe(`${END_MATH}/referentieniveau-1f-fruitrekenen-1-fruit-a-fruit-benoemen-paraat-hebben-2.md`)
  })

  it('reads an aim for childcare as one paragraph of an article, one lettered part with the lead-in in its locator, or the first paragraph of an article', () => {
    const act = `<wettekst><hoofdstuk ${PATH}="/Hoofdstuk1"><artikel ${PATH}="/Hoofdstuk1/Artikel1.49"><kop><label>Artikel</label><nr>1.49</nr></kop>
<lid ${PATH}="/Hoofdstuk1/Artikel1.49/Lid1"><lidnr>1</lidnr><al>Een houder biedt opvang waarin peren worden gedeeld, bedoeld in <intref ${PATH}="/Hoofdstuk1/Artikel1.49/Lid1">het eerste lid</intref>.</al>${META}</lid>
<lid ${PATH}="/Hoofdstuk1/Artikel1.49/Lid2"><lidnr>2</lidnr><al>Bij regeling worden regels over manden gesteld.</al></lid></artikel></hoofdstuk></wettekst>`
    const decreeOfParts = `<wettekst><artikel ${PATH}="/Hoofdstuk1/Artikel2"><kop><label>Artikel</label><nr>2</nr><titel>Verantwoord fruit</titel></kop>
<al>De houder draagt er zorg voor dat:</al>
<lijst type="expliciet"><li ${PATH}="/Hoofdstuk1/Artikel2/Onderdeela"><li.nr>a.</li.nr><al>kinderen een peer krijgen;</al></li><li ${PATH}="/Hoofdstuk1/Artikel2/Onderdeelb"><li.nr>b.</li.nr><al>kinderen leren een peer te delen.</al></li></lijst></artikel></wettekst>`
    const programme = `<wettekst><artikel ${PATH}="/Artikel5"><kop><label>Artikel</label><nr>5</nr></kop><al>Er wordt een programma gebruikt over peren, pruimen en kersen.</al><al>Dit artikel treedt later in werking.</al></artikel></wettekst>`
    seedDecree(CHILDCARE_ACT, decree('Wet fruitopvang', act), { standing: 'legal-aim-for-childcare', title: 'Wet fruitopvang' })
    seedDecree(CHILDCARE_DECREE, decree('Besluit kwaliteit fruitopvang', decreeOfParts), { standing: 'legal-aim-for-childcare', title: 'Besluit kwaliteit fruitopvang' })
    seedDecree(EARLY_YEARS, decree('Besluit fruitprogramma', programme), { standing: 'legal-aim-for-childcare', title: 'Besluit fruitprogramma' })
    const parts = [
      legalPart('Wet fruitopvang, artikel 1.49, eerste lid', CHILDCARE_ACT, ['/Hoofdstuk1/Artikel1.49/Lid1'], [{ group: 'Wet fruitopvang', code: 'artikel 1.49, eerste lid' }]),
      legalPart('Besluit kwaliteit fruitopvang, artikel 2', CHILDCARE_DECREE, ['/Hoofdstuk1/Artikel2'], [
        { group: 'Besluit kwaliteit fruitopvang', code: 'artikel 2, onderdeel a' },
        { group: 'Besluit kwaliteit fruitopvang', code: 'artikel 2, onderdeel b' },
      ]),
      legalPart('Besluit fruitprogramma, artikel 5', EARLY_YEARS, ['/Artikel5'], [{ group: 'Besluit fruitprogramma', code: 'artikel 5' }]),
    ]

    const imports = importNetherlands(education, store, [lane('peuters', 'practical-life-feelings', parts)])

    const folder = 'corpus/nl/peuters/practical-life-feelings/objectives'
    expect(imports.map((part) => part.finding)).toEqual([null, null, null])
    expect(files(imports)).toEqual([
      `${folder}/wet-fruitopvang-artikel-1-49-eerste-lid.md`,
      `${folder}/besluit-kwaliteit-fruitopvang-artikel-2-onderdeel-a.md`,
      `${folder}/besluit-kwaliteit-fruitopvang-artikel-2-onderdeel-b.md`,
      `${folder}/besluit-fruitprogramma-artikel-5.md`,
    ])
    expect(wordings(imports)).toEqual([
      'Een houder biedt opvang waarin peren worden gedeeld, bedoeld in het eerste lid.',
      'kinderen een peer krijgen;',
      'kinderen leren een peer te delen.',
      'Er wordt een programma gebruikt over peren, pruimen en kersen.',
    ])
    expect(frontmatterOf(files(imports)[2]!)).toMatchObject({
      title: 'artikel 2, onderdeel b, Besluit kwaliteit fruitopvang',
      code: 'artikel 2, onderdeel b',
      code_scope: 'Besluit kwaliteit fruitopvang, Besluit kwaliteit fruitopvang',
      standing: 'legal-aim-for-childcare',
      locator: '/Hoofdstuk1/Artikel2/Onderdeelb; Besluit kwaliteit fruitopvang, artikel 2, onderdeel b. The article opens, before its lettered parts: "De houder draagt er zorg voor dat:"',
    })
    expect(official(files(imports)[2]!).source).toBe('Source: Voorbeelduitgever, Besluit kwaliteit fruitopvang, artikel 2, onderdeel b.')
    expect(frontmatterOf(files(imports)[0]!).locator).toBe('/Hoofdstuk1/Artikel1.49/Lid1; Wet fruitopvang, artikel 1.49, eerste lid')
    expect(validateRecords(tree(imports))).toEqual([])
  })
})
