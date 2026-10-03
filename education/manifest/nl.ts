// The Dutch half of the lane manifest: one lane for every cell of the 5 levels
// and 4 subjects, the plan for reading each official file, and the official
// areas left out.
//
// Every count here was counted in the publishers' own files on 2026-10-01,
// never estimated: the legal XML, the consultation draft, the curriculum
// institute's open data at the pinned commits, and the bullets and headings
// of its cards. Codes, headings and area names are as printed or as the data
// holds them. Dutch official text may be quoted with its source, but this
// file holds headings and positions only; the wording goes into the records.
//
// Page numbers are PDF pages counted from 1, as pdftotext counts them. An
// element path is the value of a `bwb-ng-variabel-deel` attribute.

import type { Batch, DataNodes, DataSelection, DataStep, Domain, Lane, LanePart, LeftOut, Skipped, SourcePlan, StatementRef } from '../manifest.ts'
import { SAME_FILE, sourceId } from '../tools/schema.ts'
import type { Subject } from '../tools/schema.ts'

// A source record's id from its key. The record is education/sources/nl-<key>.md.
const source = (key: string): string => sourceId('nl', `nl-${key}`)

const DECREE_2026 = source('wet-kerndoelen-po-2026')
const DECREE_2006 = source('wet-kerndoelen-po-2006')
const DECREE_2006_UNTIL_2026 = source('wet-kerndoelen-po-2006-v2012')
const REFERENCE_DECREE = source('wet-referentieniveaus-besluit')
const CHILDCARE_ACT = source('wet-kinderopvang')
const CHILDCARE_DECREE = source('wet-besluit-kwaliteit-kinderopvang')
const EARLY_YEARS_DECREE = source('wet-besluit-voorschoolse-educatie')
const DRAFT_DECREE = source('concept-besluit-kerndoelen-2027')
const BUNDLE = source('slo-kerndoelen-po-bundel')
const DATA_CORE_GOALS = source('slo-curriculum-fo')
const DATA_2006 = source('slo-curriculum-kerndoelen')
const DATA_REFERENCE = source('slo-curriculum-referentiekader')
const DATA_PER_BAND = source('slo-curriculum-inhoudslijnen')
const DATA_BASIS = source('slo-curriculum-basis')
const CARD_LANGUAGE_PEUTERS = source('slo-inhoudskaart-taal-prefase')
const CARD_LANGUAGE_FASE_1 = source('slo-inhoudskaart-taal-fase1')
const CARD_MATH_PEUTERS = source('slo-inhoudskaart-rekenen-prefase')
const CARD_MATH_FASE_1 = source('slo-inhoudskaart-rekenen-fase1')
const CARD_WORLD_PEUTERS = source('slo-inhoudskaart-ojw-prefase')
const CARD_WORLD_FASE_1 = source('slo-inhoudskaart-ojw-fase1')
const CARD_SOCIAL_PEUTERS = source('slo-inhoudskaart-seo-prefase')
const CARD_SOCIAL_FASE_1 = source('slo-inhoudskaart-seo-fase1')
const PDF_LANGUAGE_OVERVIEW = source('slo-inhoudslijn-ne-kerndoelen-overzicht')
const PDF_WORLD_BOOKLET = source('slo-inhoudslijn-ojw-boekje')
const PDF_WORLD_OVERVIEW = source('slo-inhoudslijn-ojw-kerndoelen-overzicht')

// ---------------------------------------------------------------------------
// How each file is read.
// ---------------------------------------------------------------------------

const plan = (key: string, incomingKey: string, file: string, extraction: SourcePlan['extraction']): SourcePlan => ({ source: source(key), incomingKey, file, extraction })

const LEGAL_XML = { kind: 'legal-xml' } as const
const CLONE = { kind: 'git', dataPath: 'data', format: 'json' } as const
const LAYOUT = { kind: 'pdf', mode: 'layout' } as const

// The per-band PDFs: one per inhoudslijn, A3 pages.
const FASE_COLUMNS = {
  kind: 'pdf',
  mode: 'bbox',
  columns:
    'A label column on the left names each cluster and sub-cluster; three columns headed fase 1, fase 2 and fase 3 hold the statements, and nearly touch. Find the three column starts by the x positions of the dashes (−) that open the statements, and give every word to the nearest start at or left of it. A statement runs from its dash to the next dash, heading or page end. A line in brackets that opens "(bijv." is the example of the statement above it. The page footer and the line "aanbodsdoelen:" are not statements.',
} as const

// The cards with a text layer: one A3 page.
const CARD_COLUMNS = {
  kind: 'pdf',
  mode: 'bbox',
  columns:
    'One A3 page of five columns under coloured heading bars. Find the column starts by the x positions of the bullets (•) and give every word to the nearest start at or left of it. A heading is a line that starts at or left of the bullet position and has no bullet. A statement runs from its bullet to the next bullet or heading; a line that opens with a dash (–) is a sub-point of the statement above it.',
} as const

// The cards whose statements are drawn as images.
const CARD_IMAGE = {
  kind: 'pdf',
  mode: 'ocr',
  language: 'nl',
  text: 'Only the headings and the bullets (•) are in the text layer: read their positions with pdftotext -bbox. Render the page at 220 dpi and run text recognition on the image (macOS Vision, accurate level, language correction on), which gives lines with their boxes. A recognised line belongs to the nearest bullet above it in the same column; a line that overlaps a heading of the text layer is that heading, not wording. Columns are found by the x positions of the bullets.',
} as const

const CARDS = 'slo-inhoudskaarten-jonge-kind'
const PER_BAND_PDFS = 'slo-inhoudslijnen-pdf'

export const NL_SOURCE_PLANS: readonly SourcePlan[] = [
  plan('wet-kerndoelen-po-2026', 'wet-kerndoelen-po-2026', 'BWBR0052864_2026-08-01_0.xml', LEGAL_XML),
  plan('wet-kerndoelen-po-2006', 'wet-kerndoelen-po-2006', 'BWBR0018844_2026-08-01_0.xml', LEGAL_XML),
  plan('wet-kerndoelen-po-2006-v2012', 'wet-kerndoelen-po-2006', 'BWBR0018844_2012-12-01_0.xml', LEGAL_XML),
  plan('wet-referentieniveaus-besluit', 'wet-referentieniveaus-besluit', 'BWBR0027879_2022-08-01_0.xml', LEGAL_XML),
  plan('wet-kinderopvang', 'wet-kinderopvang', 'BWBR0017017_2026-08-01_0.xml', LEGAL_XML),
  plan('wet-besluit-kwaliteit-kinderopvang', 'wet-besluit-kwaliteit-kinderopvang', 'BWBR0039936_2026-07-01_0.xml', LEGAL_XML),
  plan('wet-besluit-voorschoolse-educatie', 'wet-besluit-voorschoolse-educatie', 'BWBR0027961_2022-01-01_0.xml', LEGAL_XML),
  plan('concept-besluit-kerndoelen-2027', 'concept-besluit-kerndoelen-2027', 'concept-besluit-vernieuwde-kerndoelen-overige-leergebieden.pdf', {
    kind: 'pdf',
    mode: 'bbox',
    columns:
      'The goals stand in tables of two columns that nearly touch: the doelzin on the left, the items under "Het gaat hierbij om:" on the right. In layout mode the lines of the two interleave, so the file is read by word position and every page is split at one x position (`bounds`). Column 1 holds, from top to bottom, the headings ("Onderdeel", "Domein:", "Kerndoel N"), the goal sentence, "Doelzin:" and each doelzin after its capital letter. Column 2 holds "Het gaat hierbij om:", the items after their small letters, and the page footer ("B28540.K-1" and the page number). A heading or goal sentence set across the full width starts in column 1 and stays whole there. The items column starts at x 238.7 or further right on every page (at 244 to 246 on pages 11 to 13), and no line of column 1 starts right of x 138. A page of running text is one column, with only its footer in column 2. A doelzin that runs over a page break continues at the top of column 1 of the next page.',
    bounds: [238],
  }),
  plan('slo-kerndoelen-po-bundel', 'slo-kerndoelen-po-bundel', 'kerndoelen-primair-onderwijs-slo-juli-2026.pdf', {
    kind: 'pdf',
    mode: 'bbox',
    columns:
      'PDF pages 2 to 66 are spreads of two printed pages; the first and last are single pages. Split a spread at its middle and read the left printed page first. A printed page holds one or two columns of goals: split at the gutter. A goal is headed "Kerndoel N" with its sentence beside it, a doelzin is printed as the number and its letter ("19A"), and the items under "Het gaat hierbij om:" are bullets (•) without letters.',
  }),
  plan('slo-curriculum-fo', 'slo-curriculum-fo', 'repo', CLONE),
  plan('slo-curriculum-kerndoelen', 'slo-curriculum-kerndoelen', 'repo', CLONE),
  plan('slo-curriculum-referentiekader', 'slo-curriculum-referentiekader', 'repo', CLONE),
  plan('slo-curriculum-inhoudslijnen', 'slo-curriculum-inhoudslijnen', 'repo', CLONE),
  plan('slo-curriculum-basis', 'slo-curriculum-basis', 'repo', CLONE),
  plan('slo-inhoudskaart-taal-prefase', CARDS, 'inhoudskaart-po-taal-prefase10-2020.pdf', CARD_COLUMNS),
  plan('slo-inhoudskaart-taal-fase1', CARDS, 'inhoudskaart-po-taal-fase110-2020.pdf', CARD_IMAGE),
  plan('slo-inhoudskaart-rekenen-prefase', CARDS, 'inhoudskaart-po-rekenen-wiskunde-pre-fase12-2019.pdf', CARD_IMAGE),
  plan('slo-inhoudskaart-rekenen-fase1', CARDS, 'inhoudskaart-po-rekenen-wiskunde-fase112-2019.pdf', CARD_IMAGE),
  plan('slo-inhoudskaart-ojw-prefase', CARDS, 'inhoudskaart-po-orientatieopjezelfendewereld-pre-fase12-2019.pdf', CARD_IMAGE),
  plan('slo-inhoudskaart-ojw-fase1', CARDS, 'inhoudskaart-po-orientatieopjezelfendewereld-fase112-2019.pdf', CARD_IMAGE),
  plan('slo-inhoudskaart-seo-prefase', CARDS, 'inhoudskaart-po-sociaalemotioneel-pre-fase_07-2023_.pdf', CARD_COLUMNS),
  plan('slo-inhoudskaart-seo-fase1', CARDS, 'inhoudskaart-po-sociaalemotioneel-fase1_07-2023_.pdf', CARD_COLUMNS),
  plan('slo-inhoudslijn-ne-mondeling', PER_BAND_PDFS, 'inhoudslijnen_po_nederlands_mondelinge_taalvaardigheid.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ne-lezen', PER_BAND_PDFS, 'inhoudslijnen_po_nederlands_lezen_def.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ne-schrijven', PER_BAND_PDFS, 'inhoudslijnen_po_nederlands_schrijven.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ne-taalbeschouwing', PER_BAND_PDFS, 'inhoudslijn_po_nederlands_begrippenlijst_en_taalverzorging.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ne-kerndoelen-overzicht', PER_BAND_PDFS, 'nederlandsetaal-po-aanbodsdoelen-met-kerndoelen.pdf', LAYOUT),
  plan('slo-inhoudslijn-rw-getalbegrip', PER_BAND_PDFS, 'inhoudslijn-po-rekenenwiskunde_getalbegrip12-2019.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-rw-bewerkingen', PER_BAND_PDFS, 'inhoudslijn-po-rekenenwiskunde_bewerkingen12-2019.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-rw-verhoudingen', PER_BAND_PDFS, 'inhoudslijn-po-rekenenwiskunde_verhoudingen12-2019.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-rw-meten', PER_BAND_PDFS, 'inhoudslijn-po-rekenenwiskunde_meten12-2019.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-rw-meetkunde', PER_BAND_PDFS, 'inhoudslijn-po-rekenenwiskunde_meetkunde12-2019.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-rw-verbanden', PER_BAND_PDFS, 'inhoudslijn-po-rekenenwiskunde_verbanden12-2019.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ojw-jezelf', PER_BAND_PDFS, 'inhoudslijn-po-ojw-jezelfendeander12-2018.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ojw-samenleving', PER_BAND_PDFS, 'inhoudslijn-po-ojwdesamenleving04-2018.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ojw-ruimte', PER_BAND_PDFS, 'inhoudslijn-po-ojwderuimteomjeheen04-2018.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ojw-planten-dieren-mens', PER_BAND_PDFS, 'inhoudslijn-po-ojwplantendierenendemens04-2018.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ojw-natuurkunde-techniek', PER_BAND_PDFS, 'inhoudslijn-po-ojwverschijnselenuitnatuurkundeentechniek04-2018.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ojw-boekje', PER_BAND_PDFS, 'inhoudslijnen-po-orientatieopjezelfendewereld01-2021.pdf', FASE_COLUMNS),
  plan('slo-inhoudslijn-ojw-kerndoelen-overzicht', PER_BAND_PDFS, 'ojw-po-aanbodsdoelen-met-kerndoelen06-2020.pdf', LAYOUT),
]

// ---------------------------------------------------------------------------
// Small builders.
// ---------------------------------------------------------------------------

const total = (domains: readonly Domain[]): number => domains.reduce((sum, domain) => sum + domain.count, 0)

// The groups of a statement list, counted, in document order.
const domainsOf = (statements: readonly StatementRef[]): Domain[] => {
  const counts = new Map<string, number>()
  for (const statement of statements) counts.set(statement.group, (counts.get(statement.group) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count }))
}

// The groups of a part: of its statements, or of its open-data selection.
const groupsOf = (part: LanePart): readonly Domain[] => {
  const { selection } = part
  if (selection.kind === 'data') return selection.groups
  return selection.kind === 'rows' ? [] : domainsOf(selection.statements)
}

// A batch: the groups it takes, with its size counted from them.
const batch = (name: string, all: readonly Domain[], takes: (group: string) => boolean): Batch => {
  const mine = all.filter((domain) => takes(domain.name))
  return { name, values: mine.map((domain) => domain.name), size: total(mine) }
}

const startsWith =
  (...openings: readonly string[]) =>
  (group: string): boolean =>
    openings.some((opening) => group.startsWith(opening))

// Every source a part reads: its file, its check rendition, and the repositories of its nodes.
const sourcesOf = (part: LanePart): string[] => {
  const of = (selection: LanePart['selection']): (string | undefined)[] => (selection.kind === 'data' ? [selection.join?.source, selection.level?.source] : [])
  const found = [part.source, part.checkRendition === SAME_FILE ? undefined : part.checkRendition, ...of(part.selection), part.dataNodes?.source, ...(part.dataNodes ? of(part.dataNodes.selection) : [])]
  return found.filter((id): id is string => id !== undefined)
}

interface LaneFields {
  title: string
  countingMethod: string
  countIsFromImportFile: boolean
  granularity: string
  skipped?: readonly Skipped[]
  regimes?: readonly string[]
  // Files read only for the frame.
  also?: readonly string[]
  batches?: (domains: readonly Domain[]) => readonly Batch[]
  notes?: string
}

// A lane from its parts: the sources, the count and the official areas follow from them.
function lane(level: string, subject: Subject, parts: readonly LanePart[], fields: LaneFields): Lane {
  const { also = [], batches, skipped = [], ...rest } = fields
  const domains = parts.flatMap(groupsOf)
  return {
    jurisdiction: 'nl',
    level,
    subject,
    sources: [...new Set([...parts.flatMap(sourcesOf), ...also])],
    parts,
    expectedCount: parts.reduce((sum, part) => sum + part.expectedCount, 0),
    domains,
    skipped,
    ...(batches ? { batchKey: 'group', batches: batches(domains) } : {}),
    ...rest,
  }
}

// ---------------------------------------------------------------------------
// The young-child cards (inhoudskaarten): eight one-page cards, for peuters
// and for fase 1, in four areas. A card prints no codes. A statement is
// named by the heading bar of its column (the group) and, below it, its
// sub-heading and its position there; the sub-heading and the position are
// the code its record carries, which is the pack's and not the card's.
// ---------------------------------------------------------------------------

type Heading = readonly [heading: string, bullets: number]

// The bullets of one column. A column whose bullets stand directly under its bar has one row with an empty heading.
const bullets = (group: string, rows: readonly Heading[]): StatementRef[] =>
  rows.flatMap(([heading, count]) => Array.from({ length: count }, (_, index) => ({ group, code: heading === '' ? String(index + 1) : `${heading} / ${index + 1}` })))

const CARD_GRANULARITY =
  'One record is one bullet (•) of the card. A sub-point (–) stays inside its bullet, and wording the card breaks over several lines is one statement. The card prints no codes. The code of a record is the pack\'s own: the sub-heading the bullet stands under, a slash and the position of the bullet under that sub-heading ("<sub-heading> / <position>"), or the position alone where the bullets stand directly under their bar. The lookup finds a record by that code, and the code scope names the card and the heading bar. The locator names the card, the heading bar, the sub-heading and the position of the bullet under it.'

const CARD_COUNT = "Counted the bullet glyphs (•) in the PDF's text layer with pdftotext -bbox, by column and by the heading above each, and checked the result by eye against the rendered page."

const TEXT_CARD_LOCATE =
  'Read with pdftotext -bbox, by column. Page 1 is the whole card. A statement is one bullet (•): it runs to the next bullet or heading, and a line that opens with a dash (–) is a sub-point of it. Find a statement by its heading bar, its sub-heading and its position under that sub-heading.'

const IMAGE_CARD_LOCATE =
  'The statements of this card are drawn as images: a script cannot extract them. The wording is read by text recognition of the rendered page, a reader then compares every statement with the page image and writes each correction into the locator, and the frame says the wording was read by text recognition and checked by eye. Find a statement by its heading bar, its sub-heading and its position under that sub-heading; the bullets (•) and the headings are in the text layer, so the positions are exact.'

const CARD_CHECK = 'SLO publishes this card as one PDF only and nothing of it is in the open data, so the check is a second reading of the same page.'
const IMAGE_CARD_CHECK = `${CARD_CHECK} The statements are images, so the second reading looks at the rendered page again, not at the recognised text.`

// The fase 1 cards restate the fase 1 goals of the open data, in their own grouping and partly in their own words.
const overlapCheck = (same: number, close: number, none: number, of: number, whole = ''): string =>
  `A second reading of the rendered page. Where a card statement has the same wording as a fase 1 goal of the open data, that goal is its second rendition and the verdict names it. Measured on the recognised text${whole}: of ${of} statements ${same} have the same text as a fase 1 goal, ${close} a close one and ${none} none.`

const cardPart = (name: string, from: string, check: string, statements: readonly StatementRef[], image: boolean): LanePart => ({
  name,
  source: from,
  checkRendition: SAME_FILE,
  checkStrength: 'second-reading',
  checkGranularity: check,
  expectedCount: statements.length,
  selection: { kind: 'statements', pages: [[1, 1]], locate: image ? IMAGE_CARD_LOCATE : TEXT_CARD_LOCATE, statements },
})

// --- rekenen-wiskunde ---------------------------------------------------------

const MATH_CARD_PEUTERS = 'Inhoudskaart Rekenen-wiskunde, peuters'
const MATH_CARD_FASE_1 = 'Inhoudskaart Rekenen-wiskunde, fase 1'

const MATH_PEUTERS_STATEMENTS: readonly StatementRef[] = [
  ...bullets(`${MATH_CARD_PEUTERS} / GETALLEN: Getalbegrip`, [
    ['Telrij', 2],
    ['Hoeveelheden', 8],
    ['Getallen', 2],
    ['Relaties tussen telrij, hoeveelheden en getallen', 1],
  ]),
  ...bullets(`${MATH_CARD_PEUTERS} / GETALLEN: Bewerkingen`, [['Bewerkingen', 3]]),
  ...bullets(`${MATH_CARD_PEUTERS} / Verhoudingen`, [['', 2]]),
  ...bullets(`${MATH_CARD_PEUTERS} / METEN & MEETKUNDE: Meten`, [
    ['Lengte, omtrek en oppervlakte', 5],
    ['Inhoud', 4],
    ['Gewicht', 3],
    ['Tijd', 4],
    ['Geld', 3],
  ]),
  ...bullets(`${MATH_CARD_PEUTERS} / METEN & MEETKUNDE: Meetkunde`, [
    ['Oriënteren in de ruimte', 3],
    ['Construeren', 4],
    ['Opereren met vormen en figuren', 4],
  ]),
  ...bullets(`${MATH_CARD_PEUTERS} / Verbanden`, [['', 2]]),
]

const MATH_FASE_1_STATEMENTS: readonly StatementRef[] = [
  ...bullets(`${MATH_CARD_FASE_1} / GETALLEN: Getalbegrip`, [
    ['Telrij (tot tenminste 20)', 7],
    ['Hoeveelheden (tot tenminste 20)', 10],
    ['Getallen (tot tenminste 20)', 7],
    ['Relaties tussen telrij, hoeveelheden en getallen (tot tenminste 20)', 3],
  ]),
  ...bullets(`${MATH_CARD_FASE_1} / GETALLEN: Bewerkingen`, [
    ['Optellen en aftrekken met hele getallen (tot tenminste 20)', 4],
    ['Vermenigvuldigen en delen met hele getallen (tot tenminste 20)', 3],
  ]),
  ...bullets(`${MATH_CARD_FASE_1} / Verhoudingen`, [['', 3]]),
  ...bullets(`${MATH_CARD_FASE_1} / Verbanden`, [['', 4]]),
  ...bullets(`${MATH_CARD_FASE_1} / METEN & MEETKUNDE: Meten`, [
    ['Lengte en omtrek', 7],
    ['Oppervlakte', 4],
    ['Inhoud', 6],
    ['Temperatuur', 1],
    ['Gewicht', 6],
    ['Tijd', 9],
    ['Geld', 5],
  ]),
  ...bullets(`${MATH_CARD_FASE_1} / METEN & MEETKUNDE: Meetkunde`, [
    ['Oriënteren in de ruimte', 6],
    ['Construeren', 6],
    ['Opereren met vormen en figuren', 6],
  ]),
]

// --- Nederlandse taal -----------------------------------------------------------

const LANGUAGE_CARD_PEUTERS = 'Inhoudskaart Nederlandse taal, peuters'
const LANGUAGE_CARD_FASE_1 = 'Inhoudskaart Nederlandse taal, fase 1'

const LANGUAGE_PEUTERS_STATEMENTS: readonly StatementRef[] = [
  ...bullets(`${LANGUAGE_CARD_PEUTERS} / Mondelinge taalvaardigheid`, [
    ['Woordenschat en woordgebruik', 5],
    ['Spreken / vloeiendheid, verstaanbaarheid en grammaticale beheersing', 6],
    ['Spreken / non-verbale communicatie en visuele ondersteuning', 2],
    ['Luisteren', 9],
    ['Gesprekken voeren', 7],
  ]),
  ...bullets(`${LANGUAGE_CARD_PEUTERS} / Aanvankelijk lezen`, [
    ['Leesplezier', 3],
    ['Oriëntatie op verhaal en tekst', 6],
    ['Fonemisch bewustzijn en alfabetisch principe', 6],
  ]),
  ...bullets(`${LANGUAGE_CARD_PEUTERS} / Aanvankelijk schrijven`, [['Oriëntatie op geschreven taal', 7]]),
  ...bullets(`${LANGUAGE_CARD_PEUTERS} / Taalbeschouwing`, [['', 3]]),
]

const LANGUAGE_FASE_1_STATEMENTS: readonly StatementRef[] = [
  ...bullets(`${LANGUAGE_CARD_FASE_1} / Mondelinge taalvaardigheid`, [
    ['Woordenschat en woordgebruik', 5],
    ['Luisteren', 11],
    ['Spreken', 11],
    ['Gesprekken voeren', 10],
  ]),
  ...bullets(`${LANGUAGE_CARD_FASE_1} / Lezen`, [
    ['Leesplezier', 7],
    ['Fonemisch bewustzijn en alfabetisch principe', 6],
    ['Oriëntatie op verhaal en tekst', 10],
    ['Aanvankelijk lezen (vanaf GROEP 3)', 13],
  ]),
  ...bullets(`${LANGUAGE_CARD_FASE_1} / Schrijven`, [
    ['Oriëntatie op geschreven taal', 4],
    ['Voorbereidend schrijven', 6],
    ['Aanvankelijk schrijven (vanaf GROEP 3)', 12],
  ]),
  ...bullets(`${LANGUAGE_CARD_FASE_1} / Taalbeschouwing`, [['', 3]]),
]

// --- oriëntatie op jezelf en de wereld ------------------------------------------
//
// One card serves two lanes and holds headings that are outside the four
// subjects. Each heading goes to one subject, or to none.

const SCIENCE = 'science'
const PRACTICAL = 'practical-life-feelings'
const OUTSIDE_THE_FOUR = 'Outside the four subjects'

const WORLD_CARD_PEUTERS = 'Inhoudskaart Oriëntatie op jezelf en de wereld, peuters'
const WORLD_CARD_FASE_1 = 'Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1'

type WorldRow = readonly [bar: string, heading: string, peuters: number, fase1: number, subject: Subject | null, why?: string]

const WORLD_CARD_ROWS: readonly WorldRow[] = [
  ['Jezelf en de ander', 'Gevoelens, wensen en opvattingen', 3, 4, PRACTICAL],
  ['Jezelf en de ander', 'Samen leven en samenwerken', 6, 9, PRACTICAL],
  ['Jezelf en de ander', 'Relaties en seksualiteit', 2, 4, PRACTICAL],
  ['De samenleving', '(Veilige) leefomgeving', 2, 5, PRACTICAL],
  ['De samenleving', 'Organisatie van de samenleving', 3, 3, null, 'society and civics'],
  ['De samenleving', 'Wonen, werken en recreëren', 3, 4, null, 'society and civics'],
  ['De samenleving', 'Deelnemen aan het verkeer', 1, 2, PRACTICAL],
  ['De samenleving', 'Consument zijn', 1, 2, PRACTICAL],
  ['De samenleving', 'Culturen, leefgewoonten en levensbeschouwingen', 2, 3, null, 'society and civics'],
  ['De ruimte om je heen', 'Bouw en processen van de aarde', 2, 3, null, 'geography'],
  ['De ruimte om je heen', 'Weer, klimaat en hemellichamen', 3, 4, SCIENCE],
  ['De ruimte om je heen', 'Inrichting en indeling van de ruimte', 2, 4, null, 'geography'],
  ['De ruimte om je heen', 'Landbouw, industrie en logistiek', 1, 6, null, 'geography'],
  ['De ruimte om je heen', 'Kaart en kaartbeeld', 0, 2, null, 'geography'],
  ['Planten, dieren en de mens', 'Omgaan met de natuur', 5, 5, SCIENCE],
  ['Planten, dieren en de mens', 'Planten en dieren', 2, 4, SCIENCE],
  ['Planten, dieren en de mens', 'De mens', 2, 5, SCIENCE],
  ['Planten, dieren en de mens', 'Groeien, bloeien en voortplanten', 4, 6, SCIENCE],
  ['Planten, dieren en de mens', 'Gezondheid en hygiëne', 1, 4, PRACTICAL],
  ['Tijd', 'Besef van tijd', 3, 4, null, 'history'],
  ['Tijd', 'Historisch tijdsbesef', 1, 5, null, 'history'],
  ['Verschijnselen uit natuurkunde en techniek', 'Natuurkundige verschijnselen', 2, 3, SCIENCE],
  ['Verschijnselen uit natuurkunde en techniek', 'Materialen, stoffen en voorwerpen', 1, 3, SCIENCE],
  ['Verschijnselen uit natuurkunde en techniek', 'Technische principes en systemen', 1, 4, SCIENCE],
]

const worldCount = (row: WorldRow, fase1: boolean): number => (fase1 ? row[3] : row[2])

// Bullets that belong to another subject than the rest of their heading. On
// the fase 1 card the heading "Inrichting en indeling van de ruimte" is
// geography, and its last two bullets are not: they are the card's form of
// the two fase 1 goals of the data's cluster "Omgaan met het milieu"
// (ojw/rojh/6), which has no heading of its own on the card and which
// practical life and feelings records from the open data. The peuter card
// prints two bullets under the same heading: the first is geography, and the
// second is about care for the environment (milieuzorg), as bullet 4 of the
// fase 1 card is. Both cards seen as rendered on 2026-10-02.
interface WorldBullets {
  fase1: boolean
  bar: string
  heading: string
  positions: readonly number[]
  subject: Subject
  // What the bullets are about: a clause that goes on after "Bullets 3 and 4 " (or "Bullet 2 ") and ends without a full stop.
  about: string
}

const WORLD_CARD_BULLETS: readonly WorldBullets[] = [
  {
    fase1: true,
    bar: 'De ruimte om je heen',
    heading: 'Inrichting en indeling van de ruimte',
    positions: [3, 4],
    subject: PRACTICAL,
    about: 'are about the influence of people on their natural surroundings and the care for the environment, not about geography; they are the card\'s form of the two fase 1 goals of the cluster "Omgaan met het milieu" (ojw/rojh/6)',
  },
  {
    fase1: false,
    bar: 'De ruimte om je heen',
    heading: 'Inrichting en indeling van de ruimte',
    positions: [2],
    subject: PRACTICAL,
    about: 'is about the care for the environment (milieuzorg), not about geography; it is the peuter counterpart of bullet 4 under the same heading of the fase 1 card, which is a record of practical life and feelings at fase 1',
  },
]

// A number of things, in the singular when there is one: "1 bullet", "2 bullets".
const counted = (number: number, one: string): string => `${number} ${one}${number === 1 ? '' : 's'}`

const subjectName = (subject: Subject): string => (subject === SCIENCE ? 'science' : 'practical life and feelings')
const positionsText = (positions: readonly number[]): string => `${positions.length === 1 ? 'Bullet' : 'Bullets'} ${positions.length === 1 ? positions[0] : `${positions.slice(0, -1).join(', ')} and ${positions.at(-1)}`}`

// The bullets of a heading that go to another subject than the heading does, and the positions of those that stay.
const movedOf = (row: WorldRow, fase1: boolean): WorldBullets[] => WORLD_CARD_BULLETS.filter((each) => each.fase1 === fase1 && each.bar === row[0] && each.heading === row[1])
const staying = (row: WorldRow, fase1: boolean): number[] => {
  const moved = new Set(movedOf(row, fase1).flatMap((each) => each.positions))
  return Array.from({ length: worldCount(row, fase1) }, (_, index) => index + 1).filter((position) => !moved.has(position))
}

// The bullets of the card that belong to a subject, in the order of the card.
const worldStatements = (card: string, fase1: boolean, subject: Subject): StatementRef[] =>
  WORLD_CARD_ROWS.flatMap((row) => {
    const positions = [...(row[4] === subject ? staying(row, fase1) : []), ...movedOf(row, fase1).filter((each) => each.subject === subject).flatMap((each) => each.positions)].sort((a, b) => a - b)
    return positions.map((position): StatementRef => ({ group: `${card} / ${row[0]}`, code: `${row[1]} / ${position}` }))
  })

// The headings of the card that a lane does not record, or not whole, and where their bullets are instead.
const worldSkipped = (fase1: boolean, subject: Subject): Skipped[] =>
  WORLD_CARD_ROWS.filter((row) => row[4] !== subject && worldCount(row, fase1) > 0).map((row) => {
    const moved = movedOf(row, fase1)
    const kept = staying(row, fase1)
    const elsewhere = moved.map((each) => {
      const one = each.positions.length === 1
      const where = each.subject === subject ? (one ? 'It is a record of this lane.' : 'They are records of this lane.') : `${one ? 'It is' : 'They are'} recorded in ${subjectName(each.subject)} at this level.`
      return `${positionsText(each.positions)} ${each.about}. ${where}`
    })
    const rest =
      row[4] === null
        ? `${OUTSIDE_THE_FOUR} (${row[5]}): ${moved.length === 0 ? counted(kept.length, 'bullet') : positionsText(kept).toLowerCase()} of the card ${kept.length !== 1 ? 'are' : 'is'} not recorded.`
        : `Recorded in ${subjectName(row[4])} at this level: ${moved.length === 0 ? counted(kept.length, 'bullet') : positionsText(kept).toLowerCase()} of the same card.`
    return { code: `${row[0]} / ${row[1]}`, reason: [rest, ...elsewhere].join(' ') }
  })

const worldShare = (fase1: boolean): string => {
  const count = (subject: Subject | null): number =>
    WORLD_CARD_ROWS.reduce((sum, row) => sum + (row[4] === subject ? staying(row, fase1).length : 0) + movedOf(row, fase1).filter((each) => each.subject === subject).reduce((moved, each) => moved + each.positions.length, 0), 0)
  return `The card has ${count(SCIENCE) + count(PRACTICAL) + count(null)} bullets: ${count(SCIENCE)} are in science, ${count(PRACTICAL)} in practical life and feelings, and ${count(null)} are left out.`
}

// --- sociaal-emotionele ontwikkeling ----------------------------------------------

const SOCIAL_CARD_PEUTERS = 'Inhoudskaart Sociaal-emotionele ontwikkeling, peuters'
const SOCIAL_CARD_FASE_1 = 'Inhoudskaart Sociaal-emotionele ontwikkeling, fase 1'

const EMOTIONAL = 'Emotionele competenties'
const SELF_IMAGE = `${EMOTIONAL} / Zelfbeeld (zelf beeld)`
const RELATIONS = `${EMOTIONAL} / Relaties (sociale vaardigheden)`
const SELF_STEERING = `${EMOTIONAL} / Zelfsturing (zelfmanagement)`
const THE_OTHER = 'Sociale competenties / De ander (besef van de ander)'
const CHOOSING = 'Morele competenties / Kiezen (keuzes maken)'

const SOCIAL_PEUTERS_STATEMENTS: readonly StatementRef[] = [
  ...bullets(`${SOCIAL_CARD_PEUTERS} / ${SELF_IMAGE}`, [
    ['Ontdekken van behoeften, gevoelens en emoties van zichzelf', 3],
    ['Ontdekken van de eigen kwaliteiten en krachten', 3],
    ['Ontdekken van verschillen tussen zelf en de ander', 2],
  ]),
  ...bullets(`${SOCIAL_CARD_PEUTERS} / ${RELATIONS}`, [
    ['Plezier beleven in het omgaan met een ander', 5],
    ['Kansen bieden om ervaringen op te doen', 5],
    ['Ervaren wat het vraagt om in een groep deel te nemen', 6],
    ['Open staan voor oplossingen bij conflicten', 2],
  ]),
  ...bullets(`${SOCIAL_CARD_PEUTERS} / ${SELF_STEERING}`, [
    ['Grip krijgen op eigen gevoelens', 5],
    ['Bijsturen/stoppen van ongewenst gedrag', 2],
    ['Uitvoeren van eenvoudige opdrachten en/of doelen', 5],
  ]),
  ...bullets(`${SOCIAL_CARD_PEUTERS} / ${THE_OTHER}`, [
    ['Open staan voor de emoties van een ander', 4],
    ['Deel uitmaken van een groep', 2],
    ['Inschatten van het gedrag van een ander', 2],
  ]),
  ...bullets(`${SOCIAL_CARD_PEUTERS} / ${CHOOSING}`, [
    ['Maken van een keuze', 4],
    ['Zelf willen doen', 4],
  ]),
]

const SOCIAL_FASE_1_STATEMENTS: readonly StatementRef[] = [
  ...bullets(`${SOCIAL_CARD_FASE_1} / ${SELF_IMAGE}`, [
    ['Omgaan met behoeften, gevoelens en emoties van zichzelf', 6],
    ['Herkennen en omgaan met eigen kwaliteiten en krachten', 5],
    ['Herkennen van en omgaan met verschillen tussen zichzelf en de ander', 3],
  ]),
  ...bullets(`${SOCIAL_CARD_FASE_1} / ${RELATIONS}`, [
    ['Leren omgaan met een ander', 10],
    ['Samenwerken met andere kinderen', 9],
    ['Zichzelf staande houden of aanpassen in een groep', 6],
    ['Herkennen, praten over en oplossen van conflicten', 3],
  ]),
  ...bullets(`${SOCIAL_CARD_FASE_1} / ${SELF_STEERING}`, [
    ['Beheersen van eigen gevoelens', 10],
    ['Realiseren van gestelde (eigen) doelen', 8],
  ]),
  ...bullets(`${SOCIAL_CARD_FASE_1} / ${THE_OTHER}`, [
    ['Herkennen, begrijpen van en aanpassen aan emoties van anderen', 5],
    ['Rekening houden met zichzelf binnen een groep', 7],
    ['Herkennen en perspectief nemen op het gedrag van een ander', 6],
  ]),
  ...bullets(`${SOCIAL_CARD_FASE_1} / ${CHOOSING}`, [
    ['Nadenken over keuzes/keuzemogelijkheden', 5],
    ['Nadenken over gevolgen van eigen handelen', 4],
  ]),
]

const SOCIAL_CARD_NOTE =
  'The headings of the card nest three deep: the bar (Emotionele, Sociale or Morele competenties), the column under it (Zelfbeeld, Relaties, Zelfsturing, De ander, Kiezen) and the sub-heading. The three bars and the title are drawn as images and are not in the text layer; the column headings and sub-headings are. Several sub-headings end in the same words, so find one by its whole text.'

// ---------------------------------------------------------------------------
// The legal aims for childcare and early-years programmes: three texts, six
// statements, all in peuters, practical life and feelings.
// ---------------------------------------------------------------------------

const LEGAL_SECOND_READING =
  'A second reading of the same XML. The wetten.overheid.nl page of the same version is made of the same record, so it is not a second rendition, and the Staatsblad publication was not fetched.'

const legalAim = (name: string, from: string, group: string, element: string, codes: readonly string[], locate: string): LanePart => ({
  name,
  source: from,
  checkRendition: SAME_FILE,
  checkStrength: 'second-reading',
  checkGranularity: LEGAL_SECOND_READING,
  expectedCount: codes.length,
  selection: { kind: 'legal', elements: [element], locate, statements: codes.map((code) => ({ group, code })) },
})

const CHILDCARE_PARTS: readonly LanePart[] = [
  legalAim(
    'Wet kinderopvang, artikel 1.49, eerste lid',
    CHILDCARE_ACT,
    'Wet kinderopvang',
    '/Hoofdstuk1/Afdeling3/Paragraaf2/Artikel1.49/Lid1',
    ['artikel 1.49, eerste lid'],
    'The first paragraph (lid 1) of artikel 1.49: one sentence that defines responsible childcare (verantwoorde kinderopvang) by four aims. The record is that sentence, without the paragraph number. Paragraphs 2 and 3 are about rules and childminder agencies and are not aims.',
  ),
  legalAim(
    'Besluit kwaliteit kinderopvang, artikel 2, onderdelen a tot en met d',
    CHILDCARE_DECREE,
    'Besluit kwaliteit kinderopvang',
    '/Hoofdstuk1/Artikel2',
    ['artikel 2, onderdeel a', 'artikel 2, onderdeel b', 'artikel 2, onderdeel c', 'artikel 2, onderdeel d'],
    'Artikel 2 is a lead-in sentence and a list of four lettered parts (li, with the letter in li.nr). A record is one lettered part. The lead-in is context for all four: the importer writes it in the locator note, not in the wording.',
  ),
  legalAim(
    'Besluit basisvoorwaarden kwaliteit voorschoolse educatie, artikel 5',
    EARLY_YEARS_DECREE,
    'Besluit basisvoorwaarden kwaliteit voorschoolse educatie',
    '/Artikel5',
    ['artikel 5'],
    'The first paragraph (al) of artikel 5: one sentence that names the four areas an early-years programme must cover. The second paragraph is a note on entry into force and is not part of it.',
  ),
]

// ---------------------------------------------------------------------------
// Peuters: the cards for children in childcare, and the legal aims.
// ---------------------------------------------------------------------------

const PEUTER_NOTE = 'SLO calls these aims a free view of what a childcare worker might attend to; nothing of them is in the open data, where no object is linked to the level "vve".'

const PEUTER_LANES: readonly Lane[] = [
  lane('peuters', 'mathematics', [cardPart(MATH_CARD_PEUTERS, CARD_MATH_PEUTERS, IMAGE_CARD_CHECK, MATH_PEUTERS_STATEMENTS, true)], {
    title: 'Peuters mathematics',
    countingMethod: `${CARD_COUNT} The card has 50 bullets and all are in this lane.`,
    countIsFromImportFile: true,
    granularity: CARD_GRANULARITY,
    notes: `${PEUTER_NOTE} The only legal text that names this area for the age is artikel 5 of the Besluit basisvoorwaarden kwaliteit voorschoolse educatie ("rekenen"). That sentence names four areas at once and is recorded once, in peuters practical life and feelings.`,
  }),
  lane('peuters', 'reading-language', [cardPart(LANGUAGE_CARD_PEUTERS, CARD_LANGUAGE_PEUTERS, CARD_CHECK, LANGUAGE_PEUTERS_STATEMENTS, false)], {
    title: 'Peuters reading and language',
    countingMethod: `${CARD_COUNT} The card has 54 bullets and one sub-point, which stays inside its bullet; all are in this lane.`,
    countIsFromImportFile: true,
    granularity: `${CARD_GRANULARITY} Under "Spreken" the card prints two small headings in black, which are part of the path to a bullet. The three bullets of Taalbeschouwing stand directly under their bar.`,
    notes: `${PEUTER_NOTE} Artikel 5 of the Besluit basisvoorwaarden kwaliteit voorschoolse educatie names "taal"; that sentence is recorded once, in peuters practical life and feelings.`,
  }),
  lane('peuters', 'science', [cardPart(`${WORLD_CARD_PEUTERS}: nature, physics and technology, weather`, CARD_WORLD_PEUTERS, IMAGE_CARD_CHECK, worldStatements(WORLD_CARD_PEUTERS, false, SCIENCE), true)], {
    title: 'Peuters science',
    countingMethod: `${CARD_COUNT} ${worldShare(false)}`,
    countIsFromImportFile: true,
    granularity: `${CARD_GRANULARITY} The card is shared with practical life and feelings: each lane takes its own sub-headings.`,
    skipped: worldSkipped(false, SCIENCE),
    notes: `${PEUTER_NOTE} From "Planten, dieren en de mens" everything but health is science; "Weer, klimaat en hemellichamen" is the one heading of "De ruimte om je heen" that is science.`,
  }),
  lane(
    'peuters',
    'practical-life-feelings',
    [
      ...CHILDCARE_PARTS,
      cardPart(SOCIAL_CARD_PEUTERS, CARD_SOCIAL_PEUTERS, CARD_CHECK, SOCIAL_PEUTERS_STATEMENTS, false),
      cardPart(`${WORLD_CARD_PEUTERS}: self and others, safety, traffic, money, health`, CARD_WORLD_PEUTERS, IMAGE_CARD_CHECK, worldStatements(WORLD_CARD_PEUTERS, false, PRACTICAL), true),
    ],
    {
      title: 'Peuters practical life and feelings',
      countingMethod: `Six legal statements, counted in the structure of the three articles: one sentence, four lettered parts, one sentence. The cards: ${CARD_COUNT} The social-emotional card has 54 bullets, all here. ${worldShare(false)}`,
      countIsFromImportFile: true,
      granularity: `Two standings in one lane, so each record takes its standing from its source: the six legal statements are legal aims for childcare, and the card bullets are guidance of the curriculum institute. A legal record is one sentence or one lettered part; its code is the article and part as printed. ${CARD_GRANULARITY} ${SOCIAL_CARD_NOTE}`,
      skipped: worldSkipped(false, PRACTICAL),
      batches: (domains) => [batch('legal-aims-and-world-card', domains, (group) => !group.startsWith(SOCIAL_CARD_PEUTERS)), batch('social-emotional-card', domains, startsWith(SOCIAL_CARD_PEUTERS))],
      notes:
        'All six legal statements are in this lane. Two of them name several areas in one sentence and cannot be split: artikel 2, onderdeel b of the Besluit kwaliteit kinderopvang (motor, cognitive, language and creative skills) and artikel 5 of the Besluit basisvoorwaarden kwaliteit voorschoolse educatie (taal, rekenen, motoriek, sociaal-emotionele ontwikkeling). The frames of peuters mathematics and peuters reading and language point here.',
    },
  ),
]

// ---------------------------------------------------------------------------
// The per-band goals (inhoudslijnen): the open data is canonical, the slo.nl
// PDF of each inhoudslijn is the check rendition. A part is one inhoudslijn,
// because each has its own PDF.
// ---------------------------------------------------------------------------

type Fase = 1 | 2 | 3

type ClusterRow = readonly [prefix: string, title: string, fase1: number, fase2: number, fase3: number, subject?: Subject | null, why?: string]

interface Line {
  // The prefix and title of the area (inh_vakleergebied) and of the line (inh_inhoudslijn, without the word "Inhoudslijn").
  area: string
  areaTitle: string
  prefix: string
  title: string
  // The subject of every cluster of the line. Left out where the clusters say it themselves.
  subject?: Subject
  // True where goals hang off sub-clusters as well as clusters.
  subclusters: boolean
  // The source record of the line's own PDF, and its page count.
  pdf: string
  pages: number
  clusters: readonly ClusterRow[]
}

const MATH: Pick<Line, 'area' | 'areaTitle' | 'subject' | 'subclusters'> = { area: 'RW', areaTitle: 'Rekenen en wiskunde', subject: 'mathematics', subclusters: false }
const DUTCH: Pick<Line, 'area' | 'areaTitle' | 'subject' | 'subclusters'> = { area: 'NE', areaTitle: 'Nederlands', subject: 'reading-language', subclusters: true }
// The data spells this title without the diaeresis.
const WORLD: Pick<Line, 'area' | 'areaTitle' | 'subclusters'> = { area: 'OJW', areaTitle: 'Orientatie op jezelf en de wereld', subclusters: false }

// Every cluster of the three areas with its goals per fase, counted in the
// data on 2026-10-01. A cluster with a null subject is left out.
//
// The counts of rw/bew/3 and rw/bew/4 are the records after the corrections
// of manifest/nl-additions.ts (NL_GOAL_CORRECTIONS), counted on 2026-10-02:
// the data lists 21 goals at fase 3 under rw/bew/3, ten of which belong to
// rw/bew/4 (one of those at fase 2), and fills rw/bew/4 with six copies of
// the goals of rw/bew/5 (two at fase 2, four at fase 3), which are no
// records. The content-line PDF prints 3, 12 and 11 goals under rw/bew/3 and
// 0, 1 and 9 under rw/bew/4.
const LINES: readonly Line[] = [
  {
    ...MATH,
    prefix: 'RW/gb',
    title: 'Getalbegrip',
    pdf: source('slo-inhoudslijn-rw-getalbegrip'),
    pages: 3,
    clusters: [
      ['rw/gb/1', 'Hele getallen: de telrij', 7, 3, 3],
      ['rw/gb/2', 'Hele getallen: hoeveelheden', 10, 3, 3],
      ['rw/gb/3', 'Hele getallen: getallen', 10, 8, 8],
      ['rw/gb/4', 'Decimale getallen', 0, 2, 6],
      ['rw/gb/5', 'Breuken', 0, 2, 8],
    ],
  },
  {
    ...MATH,
    prefix: 'RW/bew',
    title: 'Bewerkingen',
    pdf: source('slo-inhoudslijn-rw-bewerkingen'),
    pages: 7,
    clusters: [
      ['rw/bew/1', 'Optellen en aftrekken met hele getallen', 4, 10, 9],
      ['rw/bew/2', 'Optellen en aftrekken met decimale getallen', 0, 1, 6],
      ['rw/bew/3', 'Vermenigvuldigen en delen met hele getallen', 3, 12, 11],
      ['rw/bew/4', 'Vermenigvuldigen en delen met decimale getallen', 0, 1, 9],
      ['rw/bew/5', 'Combinaties van en relaties tussen bewerkingen', 0, 2, 4],
      ['rw/bew/6', 'Bewerkingen met breuken', 0, 1, 5],
      ['rw/bew/7', 'Rekenen met de rekenmachine', 0, 0, 8],
    ],
  },
  {
    ...MATH,
    prefix: 'RW/verh',
    title: 'Verhoudingen',
    pdf: source('slo-inhoudslijn-rw-verhoudingen'),
    pages: 3,
    clusters: [
      ['rw/verh/1', 'Wiskundetaal bij verhoudingen, breuken en procenten', 0, 2, 4],
      ['rw/verh/2', 'Rekenen en redeneren met verhoudingen', 3, 4, 9],
      ['rw/verh/3', 'Rekenen en redeneren met percentages', 0, 0, 8],
      ['rw/verh/4', 'Relaties tussen verhoudingen, breuken, procenten en decimale getallen', 0, 0, 3],
    ],
  },
  {
    ...MATH,
    prefix: 'RW/m',
    title: 'Meten',
    pdf: source('slo-inhoudslijn-rw-meten'),
    pages: 6,
    clusters: [
      ['rw/m/1', 'Lengte en omtrek', 7, 6, 12],
      ['rw/m/2', 'Oppervlakte', 4, 7, 10],
      ['rw/m/3', 'Inhoud', 6, 8, 10],
      ['rw/m/4', 'Gewicht', 6, 8, 7],
      ['rw/m/5', 'Temperatuur', 1, 0, 2],
      ['rw/m/6', 'Tijd', 10, 8, 11],
      ['rw/m/7', 'Geld', 5, 6, 4],
      ['rw/m/8', 'Samengestelde grootheden', 0, 1, 5],
    ],
  },
  {
    ...MATH,
    prefix: 'RW/mk',
    title: 'Meetkunde',
    pdf: source('slo-inhoudslijn-rw-meetkunde'),
    pages: 2,
    clusters: [
      ['rw/mk/1', 'Oriënteren in de ruimte', 6, 5, 4],
      ['rw/mk/2', 'Construeren', 6, 4, 4],
      ['rw/mk/3', 'Opereren met vormen en figuren', 6, 6, 4],
    ],
  },
  {
    ...MATH,
    prefix: 'RW/verb',
    title: 'Verbanden',
    pdf: source('slo-inhoudslijn-rw-verbanden'),
    pages: 2,
    clusters: [
      ['rw/verb/1', 'Verbanden in tabellen, diagrammen en grafieken', 4, 6, 8],
      ['rw/verb/2', 'Verbanden in patronen', 0, 2, 2],
    ],
  },
  {
    ...DUTCH,
    prefix: 'NE/MT',
    title: 'Mondelinge taalvaardigheid',
    pdf: source('slo-inhoudslijn-ne-mondeling'),
    pages: 4,
    clusters: [
      ['NE/MT/01', 'Gesprekken voeren', 13, 21, 16],
      ['NE/MT/02', 'Luisteren', 16, 18, 18],
      ['NE/MT/03', 'Spreken', 14, 17, 18],
    ],
  },
  {
    ...DUTCH,
    prefix: 'NE/LE',
    title: 'Lezen',
    pdf: source('slo-inhoudslijn-ne-lezen'),
    pages: 4,
    clusters: [
      ['NE/LE/01', 'Leesplezier/leesmotivatie', 5, 4, 5],
      ['NE/LE/02', 'Oriëntatie op en lezen van zakelijke teksten', 1, 1, 1],
      ['NE/LE/03', 'Zakelijke teksten: kenmerken van de taakuitvoering', 5, 6, 8],
      ['NE/LE/04', 'Zakelijke teksten: studievaardigheden', 3, 2, 2],
      ['NE/LE/05', 'Zakelijke teksten: aanpak', 5, 4, 3],
      ['NE/LE/06', 'Oriëntatie op en lezen van fictie', 1, 1, 1],
      ['NE/LE/07', 'Fictie: kenmerken van de taakuitvoering', 9, 7, 8],
      ['NE/LE/08', 'Fonemisch bewustzijn en alfabetisch principe', 6, 0, 0],
      ['NE/LE/09', 'Technisch lezen', 4, 7, 1],
    ],
  },
  {
    ...DUTCH,
    prefix: 'NE/SCH',
    title: 'Schrijven',
    pdf: source('slo-inhoudslijn-ne-schrijven'),
    pages: 3,
    clusters: [
      ['NE/SCH/01', 'Oriëntatie op geschreven taal', 4, 0, 0],
      ['NE/SCH/02', 'Kenmerken van de taakuitvoering schrijven', 14, 13, 13],
    ],
  },
  {
    ...DUTCH,
    prefix: 'NE/TB',
    title: 'Taalbeschouwing',
    pdf: source('slo-inhoudslijn-ne-taalbeschouwing'),
    pages: 3,
    clusters: [
      ['NE/TB/01', 'Taalbeschouwing', 1, 1, 1],
      ['NE/TB/02', 'Begrippenlijst', 1, 1, 1],
      ['NE/TB/03', 'Taalverzorging', 1, 1, 1],
    ],
  },
  {
    ...WORLD,
    prefix: 'OJW/ja',
    title: 'Jezelf en de ander',
    pdf: source('slo-inhoudslijn-ojw-jezelf'),
    pages: 2,
    clusters: [
      ['ojw/ja/1', 'Gevoelens, wensen en opvattingen', 4, 8, 10, PRACTICAL],
      ['ojw/ja/2', 'Relaties en seksualiteit', 4, 6, 9, PRACTICAL],
      ['ojw/ja/3', 'Samen leven en samenwerken', 9, 15, 12, PRACTICAL],
    ],
  },
  {
    ...WORLD,
    prefix: 'OJW/ds',
    title: 'De samenleving',
    pdf: source('slo-inhoudslijn-ojw-samenleving'),
    pages: 3,
    clusters: [
      ['ojw/ds/1', '(Veilige) leefomgeving', 5, 7, 8, PRACTICAL],
      ['ojw/ds/2', 'Consument zijn', 2, 3, 5, PRACTICAL],
      ['ojw/ds/3', 'Culturen, leefgewoonten en levensbeschouwingen', 3, 4, 5, null, 'society and civics'],
      ['ojw/ds/4', 'Deelnemen aan het verkeer', 2, 3, 5, PRACTICAL],
      ['ojw/ds/5', 'Organisatie van de samenleving', 3, 9, 9, null, 'society and civics'],
      ['ojw/ds/6', 'Wonen, werken, recreëren', 4, 5, 6, null, 'society and civics'],
    ],
  },
  {
    ...WORLD,
    prefix: 'OJW/rojh',
    title: 'De ruimte om je heen',
    pdf: source('slo-inhoudslijn-ojw-ruimte'),
    pages: 3,
    clusters: [
      ['ojw/rojh/1', 'Bouw en processen van de aarde', 3, 3, 6, null, 'geography'],
      ['ojw/rojh/2', 'Heelal en hemellichamen', 2, 3, 3, SCIENCE],
      ['ojw/rojh/3', 'Inrichting en indeling van de ruimte (landschap)', 4, 7, 7, null, 'geography'],
      ['ojw/rojh/4', 'Kaart en kaartbeeld', 2, 8, 7, null, 'geography'],
      ['ojw/rojh/5', 'Landbouw, industrie en logistiek', 6, 8, 7, null, 'geography'],
      ['ojw/rojh/6', 'Omgaan met het milieu', 2, 6, 5, PRACTICAL],
      ['ojw/rojh/7', 'Weer en klimaat', 2, 5, 6, SCIENCE],
    ],
  },
  {
    ...WORLD,
    prefix: 'OJW/pdm',
    title: 'Planten, dieren en de mens',
    pdf: source('slo-inhoudslijn-ojw-planten-dieren-mens'),
    pages: 4,
    clusters: [
      ['ojw/pdm/1', 'De mens', 5, 3, 6, SCIENCE],
      ['ojw/pdm/2', 'Gezondheid en hygiëne', 4, 9, 11, PRACTICAL],
      ['ojw/pdm/3', 'Groei, ontwikkeling (bloei), gedrag en voortplanting (instandhouding)', 6, 11, 16, SCIENCE],
      ['ojw/pdm/4', 'Omgaan met de natuur', 5, 3, 3, SCIENCE],
      ['ojw/pdm/5', 'Planten en dieren', 4, 6, 14, SCIENCE],
    ],
  },
  {
    ...WORLD,
    prefix: 'OJW/tijd',
    title: 'Tijd',
    // The line has a PDF on slo.nl, which was not fetched: no cluster of it is recorded.
    pdf: '',
    pages: 0,
    clusters: [
      ['ojw/tijd/1', 'Besef van tijd (cyclisch element)', 4, 2, 1, null, 'history'],
      ['ojw/tijd/2', 'Historisch tijdsbesef (lineair element)', 5, 11, 15, null, 'history'],
      ['ojw/tijd/3', 'Verschijnselen, ontwikkelingen en personen', 0, 27, 27, null, 'history'],
    ],
  },
  {
    ...WORLD,
    prefix: 'OJW/nattech',
    title: 'Verschijnselen uit natuurkunde en techniek',
    pdf: source('slo-inhoudslijn-ojw-natuurkunde-techniek'),
    pages: 3,
    clusters: [
      ['ojw/nattech/1', 'Materialen, stoffen en voorwerpen', 3, 8, 7, SCIENCE],
      ['ojw/nattech/2', 'Natuurkundige verschijnselen', 3, 8, 9, SCIENCE],
      ['ojw/nattech/3', 'Technische principes en systemen', 4, 9, 8, SCIENCE],
    ],
  },
]

const goalsIn = (row: ClusterRow, fase: Fase): number => row[1 + fase] as number
const subjectOf = (line: Line, row: ClusterRow): Subject | null => line.subject ?? row[5] ?? null
// The group of a cluster, as domains and batches name it.
const clusterGroup = (line: Line, row: ClusterRow): string => `${line.areaTitle} / ${line.title} / ${row[1]} (${row[0]})`

const PER_BAND_NOTES =
  'Read the level of a goal from the level it links to (niveau_id), never from the end of its code: eight codes of these three areas end in another fase than the one their goal links to, or are malformed (rw/bew/2/01/fase1 and rw/bew/5/02/fase3 link to fase 2; NE/LE/07/02/01/fase2 and NE/LE/07/03/01/fase3 link to fase 1; ojw/pdm/3/01/fase1 links to fase 3; rw/verb/1/01/fsae1, ojw/nattech/02/fase1 and "PO Kerndoel 06: Informatie ordenen" under NE/LE/05/01 link to fase 1). Each of the first five therefore occurs twice, so a code does not identify a record: the id of the goal-at-level object does, and a record keeps the code as the data has it. Every goal-at-level object lists exactly one goal and one level, and none is reached twice. Join against the separate clone of curriculum-basis at its own pinned commit: the submodule inside this repository is pinned at a 2023 commit and was not used. Ignore deprecated.json. The same goal sentence can recur in another fase as a separate goal with its own id.'

// The goals of one inhoudslijn in one fase that belong to a subject.
function perBandSelection(line: Line, fase: Fase, rows: readonly ClusterRow[]): DataSelection {
  const subclusters: DataStep[] = line.subclusters ? [{ file: 'inh.subclusters.json', entity: 'inh_subcluster', via: 'inh_subcluster_id', optional: true }] : []
  return {
    kind: 'data',
    walk: [
      { file: 'inh.vakleergebieden.json', entity: 'inh_vakleergebied', where: { prefix: [line.area] } },
      { file: 'inh.inhoudslijnen.json', entity: 'inh_inhoudslijn', via: 'inh_inhoudslijn_id', where: { prefix: [line.prefix] } },
      { file: 'inh.clusters.json', entity: 'inh_cluster', via: 'inh_cluster_id', where: { prefix: rows.map((row) => row[0]) } },
      ...subclusters,
    ],
    join: { via: 'doelniveau_id', source: DATA_BASIS, file: 'doelniveaus.json', entity: 'doelniveau', wording: { via: 'doel_id', file: 'doelen.json', field: 'title' } },
    recordEntities: ['doelniveau'],
    codeField: 'prefix',
    level: {
      entity: 'doelniveau',
      field: 'niveau_id',
      source: DATA_BASIS,
      titles: [`fase ${fase}`],
      rule: 'A goal-at-level object lists exactly one level. It is in when that level has this title.',
    },
    groupBy: { entity: 'inh_cluster', field: 'prefix' },
    groups: rows.map((row) => ({ name: clusterGroup(line, row), count: goalsIn(row, fase) })),
    notes: PER_BAND_NOTES,
  }
}

const PER_BAND_MATCH =
  'A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader.'

const perBandCheck = (line: Line, fase: Fase): string =>
  `The slo.nl PDF of this inhoudslijn (${line.pages} pages), read by column: the column headed fase ${fase}, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. ${
    line.area === 'RW'
      ? 'Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording.'
      : 'Granularity can differ in places.'
  } The PDF prints sub-points with ">" where the data has "-". ${PER_BAND_MATCH} A statement found in another fase column than the one its goal links to is a finding to write down.`

function perBandParts(fase: Fase, subject: Subject): LanePart[] {
  return LINES.flatMap((line): LanePart[] => {
    const rows = line.clusters.filter((row) => subjectOf(line, row) === subject && goalsIn(row, fase) > 0)
    if (rows.length === 0) return []
    return [
      {
        name: `Inhoudslijn ${line.title}, fase ${fase}`,
        source: DATA_PER_BAND,
        checkRendition: line.pdf,
        checkStrength: 'second-rendition',
        checkGranularity: perBandCheck(line, fase),
        expectedCount: rows.reduce((sum, row) => sum + goalsIn(row, fase), 0),
        selection: perBandSelection(line, fase, rows),
      },
    ]
  })
}

// The clusters of the lines a lane reads that it does not record.
function perBandSkipped(fase: Fase, subject: Subject): Skipped[] {
  return LINES.filter((line) => line.clusters.some((row) => subjectOf(line, row) === subject && goalsIn(row, fase) > 0)).flatMap((line) =>
    line.clusters
      .filter((row) => subjectOf(line, row) !== subject && goalsIn(row, fase) > 0)
      .map((row) => ({
        code: row[0],
        reason:
          subjectOf(line, row) === null
            ? `${OUTSIDE_THE_FOUR} (${row[6]}): the ${counted(goalsIn(row, fase), 'goal')} of "${row[1]}" ${goalsIn(row, fase) === 1 ? 'is' : 'are'} not recorded.`
            : `Recorded in ${subjectOf(line, row) === SCIENCE ? 'science' : 'practical life and feelings'} at this level: the ${counted(goalsIn(row, fase), 'goal')} of "${row[1]}".`,
      })),
  )
}

const perBandCount = (fase: Fase, parts: readonly LanePart[]): string =>
  `Walked the open data from inh.vakleergebieden.json through inh.inhoudslijnen.json and inh.clusters.json (and inh.subclusters.json for Nederlands), collected every goal-at-level id on those objects, resolved each in doelniveaus.json of curriculum-basis, and kept those linked to the level titled "fase ${fase}". Per inhoudslijn: ${parts
    .filter((part) => part.selection.kind === 'data')
    .map((part) => `${part.name.replace(`, fase ${fase}`, '').replace('Inhoudslijn ', '')} ${part.expectedCount}`)
    .join(', ')}.${parts.some((part) => part.name.startsWith('Inhoudslijn Bewerkingen,')) && fase !== 1 ? ` ${BEWERKINGEN_COUNT[fase]}` : ''}`

// What the corrections of the line Bewerkingen do to the count of a fase.
const BEWERKINGEN_COUNT: Record<2 | 3, string> = {
  2: 'For Bewerkingen the data links 28 goals to fase 2: two are copies and no records, and one goal that the data links to fase 3 is filed here, which gives 27.',
  3: 'For Bewerkingen the data links 57 goals to fase 3: four are copies and no records, and one is filed at fase 2, which gives 52.',
}

const PER_BAND_GRANULARITY =
  'One record is one goal at one fase (a goal-at-level object, doelniveau). Its wording is the title of the goal it lists, and its code is its own prefix, for example rw/gb/1/01/fase1: line, cluster, number, fase, with one more segment for a sub-cluster in Nederlands. These are codes of the data: the PDFs print none. A code does not identify a record, so the record id is built on the id of the goal-at-level object, and a lookup by code returns every match.'

const PER_BAND_STANDING =
  'Guidance of the curriculum institute: the goals say what a school can offer in a band, not what a child must know. They were written for the 2006 core goals.'

const WORLD_ALSO = [PDF_WORLD_BOOKLET, PDF_WORLD_OVERVIEW]
const WORLD_ALSO_NOTE =
  'Two more PDFs print the same goals and are read for the frame only: the booklet of all the lines of this area, and the overview that names the 2006 core goals each goal serves.'

// --- goals a content-line PDF prints and the open data lacks ----------------------
//
// Seen on the page on 2026-10-02. The PDF of the line Schrijven prints, under
// the bar "Schrijven: kenmerken van de taakuitvoering", seven rows of goals;
// the open data has six sub-clusters under NE/SCH/02 and nothing of the fifth
// row, "inhoud/vorm" (page 2): 5 goals in the fase 1 column (three under the
// label "groep 1/2:", two under "groep 3:"), 6 in the fase 2 column and 10 in
// the fase 3 column, none of whose texts is anywhere in doelen.json. The PDF
// of the line De samenleving prints four goals under "Consument zijn" in the
// fase 2 column (page 2); the data has three, and its goal numbers skip one
// there (OJW.2.057).
//
// These goals are records read from the PDF by locator. The PDFs print no
// codes, and a code in the form the data gives the goals beside them is not
// made up: the code is empty, and the locator names the heading, the label
// and the position of the goal in its column.

const PRINTED_ONLY_LOCATE =
  'Read with the type styles of the content-line PDF (tools/content-lines.ts), not by word position: on every page column 1 is the column of labels and columns 2, 3 and 4 are fase 1, fase 2 and fase 3, so a span of this part names the column of its fase by that number. A statement opens with a dash (−) and runs to the next dash, label or heading; a line that opens with ">" is a sub-point of it, and an example in brackets is part of it, as in the goals of this line that the open data holds. Find a statement by the heading bar, the label of its row in the column of labels, the label inside its column where there is one ("groep 3:"), and its position under them.'
const PRINTED_ONLY_CHECK =
  'The open data, which is the canonical rendition of the other per-band goals, lacks these goals, so this PDF is their only rendition.'

const printedOnlyPart = (name: string, pdf: string, page: number, group: string, codes: readonly string[]): LanePart => ({
  name,
  source: pdf,
  checkRendition: SAME_FILE,
  checkStrength: 'second-reading',
  checkGranularity: PRINTED_ONLY_CHECK,
  expectedCount: codes.length,
  selection: { kind: 'statements', pages: [[page, page]], locate: PRINTED_ONLY_LOCATE, statements: codes.map((code) => ({ group, code, page })) },
})

const numbered = (count: number): string[] => Array.from({ length: count }, (_, index) => String(index + 1))

const WRITING_FORM = 'Inhoudslijn Schrijven, PDF / Schrijven: kenmerken van de taakuitvoering / inhoud/vorm'
const WRITING_FORM_CODES: Record<Fase, readonly string[]> = {
  1: ['groep 1/2 / 1', 'groep 1/2 / 2', 'groep 1/2 / 3', 'groep 3 / 1', 'groep 3 / 2'],
  2: numbered(6),
  3: numbered(10),
}
const writingFormPart = (fase: Fase): LanePart =>
  printedOnlyPart(`Inhoudslijn Schrijven, fase ${fase}: the row "inhoud/vorm" of the PDF, which the open data lacks`, source('slo-inhoudslijn-ne-schrijven'), 2, WRITING_FORM, WRITING_FORM_CODES[fase])
const writingFormCounted = (fase: Fase): string =>
  `The PDF of the line Schrijven prints ${WRITING_FORM_CODES[fase].length} goals in its fase ${fase} column in the row "inhoud/vorm" (page 2), counted by their dashes on the page and in the text read by script; the open data has none of them, and they are records read from the PDF.`
const WRITING_FORM_NOTE =
  'The open data lacks one row of the line Schrijven: under "Schrijven: kenmerken van de taakuitvoering" the PDF prints seven rows of goals and the data has six sub-clusters, with nothing of the row "inhoud/vorm" (what a text holds and how it is built: its length, its sentences, its structure, its words). The goals of that row are records of this lane, read from the PDF by locator. The PDF prints no code for them and none is made up: their code is empty, and each is named by its place in the row.'

const CONSUMER = 'Inhoudslijn De samenleving, PDF / Consument zijn'
const CONSUMER_PART = printedOnlyPart('Inhoudslijn De samenleving, fase 2: the fourth goal of "Consument zijn" in the PDF, which the open data lacks', source('slo-inhoudslijn-ojw-samenleving'), 2, CONSUMER, ['4'])
const CONSUMER_COUNTED =
  'The PDF of the line De samenleving prints four goals under "Consument zijn" in its fase 2 column (page 2), counted by their dashes; the open data has three, and its goal numbers skip one at that place. The fourth is a record read from the PDF.'
const CONSUMER_NOTE =
  'The open data lacks one goal of the cluster "Consument zijn" (ojw/ds/2) at fase 2: the PDF of the line De samenleving prints four goals there and the data has three, with a gap in its own goal numbers (OJW.2.056 is followed by OJW.2.058). The fourth goal is a record of this lane, read from the PDF by locator. The PDF prints no code for it and none is made up: its code is empty.'

const FASE_NAMES: Record<Fase, string> = { 1: 'Fase 1', 2: 'Fase 2', 3: 'Fase 3' }
const level = (fase: Fase): string => `fase-${fase}`

// --- fase 1: the open data and the cards --------------------------------------------

const FASE_1_OVERLAP = 'The fase 1 card restates the fase 1 goals of the open data for the youngest children, in its own grouping and partly in its own words. Both are recorded, as separate records: the card says which goals are for the youngest children, which the band alone does not.'

// Codes the open data gives to two goals of two fases, and the fase each goal
// links to; and codes that end in another fase than their one goal links to.
// Counted in the corpus on 2026-10-02: each double code is the code of one
// record in each of the two lanes.
const DOUBLE_CODES: readonly (readonly [code: string, subject: Subject, fases: readonly [Fase, Fase]])[] = [
  ['rw/bew/5/02/fase3', 'mathematics', [2, 3]],
  ['NE/LE/07/02/01/fase2', 'reading-language', [1, 2]],
  ['NE/LE/07/03/01/fase3', 'reading-language', [1, 3]],
  ['ojw/pdm/3/01/fase1', 'science', [1, 3]],
]
const MISNAMED_CODES: readonly (readonly [code: string, subject: Subject, fase: Fase])[] = [['rw/bew/2/01/fase1', 'mathematics', 2]]

// What the frame of a per-band lane says about the codes of its records that name another fase or occur twice. Empty when it has none.
const codeNote = (fase: Fase, subject: Subject): string =>
  [
    ...DOUBLE_CODES.filter(([, of, fases]) => of === subject && fases.includes(fase)).map(([code, , fases]) => {
      const other = fases.find((each) => each !== fase)!
      return ` The data gives the code ${code} to two goals: one links to fase ${fase} and is a record of this lane, the other links to fase ${other} and is a record of fase ${other}. A lookup by that code returns both.`
    }),
    ...MISNAMED_CODES.filter(([, of, at]) => of === subject && at === fase).map(([code]) => ` The code ${code} names another fase than its goal links to, which is fase ${fase}: the record is in this lane.`),
  ].join('')

function fase1Lane(subject: Subject, title: string, cards: readonly LanePart[], fields: Pick<LaneFields, 'batches' | 'also'> & { counted: string; granularity: string; skipped?: readonly Skipped[]; notes: string }): Lane {
  const data = perBandParts(1, subject)
  return lane(level(1), subject, [...data, ...cards], {
    title,
    countingMethod: `${perBandCount(1, data)} The cards: ${CARD_COUNT} ${fields.counted}`,
    countIsFromImportFile: true,
    granularity: `${PER_BAND_GRANULARITY} ${fields.granularity}`,
    skipped: [...perBandSkipped(1, subject), ...(fields.skipped ?? [])],
    also: fields.also ?? [],
    ...(fields.batches ? { batches: fields.batches } : {}),
    notes: `${PER_BAND_STANDING} ${fields.notes}${codeNote(1, subject)}`,
  })
}

const NUMBERS = ['Getalbegrip', 'Bewerkingen', 'Verhoudingen', 'Verbanden'] as const
const MEASURES = ['Meten', 'Meetkunde'] as const
const inLines =
  (...lines: readonly string[]) =>
  (group: string): boolean =>
    lines.some((line) => group.startsWith(`Rekenen en wiskunde / ${line} / `) || group.startsWith(`Nederlands / ${line} / `) || group.startsWith(`Orientatie op jezelf en de wereld / ${line} / `))
const inBars =
  (card: string, ...bars: readonly string[]) =>
  (group: string): boolean =>
    bars.some((bar) => group === `${card} / ${bar}` || group.startsWith(`${card} / ${bar} / `))

const MATH_EXAMPLES_NOTE =
  'For rekenen-wiskunde the PDFs print examples in italics and brackets that the data leaves out. A record holds the example of its goal as accompanying text, which is official text and no part of the goal; in a few goals the data also drops statement text around an example, and there the wording of the record is the statement as the PDF prints it, with an example that stands inside its sentence. The sections below say which.'

const FASE_1_LANES: readonly Lane[] = [
  fase1Lane('mathematics', 'Fase 1 mathematics', [cardPart(MATH_CARD_FASE_1, CARD_MATH_FASE_1, overlapCheck(52, 24, 21, 97), MATH_FASE_1_STATEMENTS, true)], {
    counted: 'The rekenen-wiskunde card has 97 bullets, all in this lane.',
    granularity: `${FASE_1_OVERLAP} ${CARD_GRANULARITY} On the card the bullets of Verhoudingen and of Verbanden stand directly under their bars.`,
    batches: (domains) => [
      batch('data-numbers', domains, inLines(...NUMBERS)),
      batch('data-measuring-geometry', domains, inLines(...MEASURES)),
      batch('card-numbers', domains, inBars(MATH_CARD_FASE_1, 'GETALLEN: Getalbegrip', 'GETALLEN: Bewerkingen', 'Verhoudingen', 'Verbanden')),
      batch('card-measuring-geometry', domains, inBars(MATH_CARD_FASE_1, 'METEN & MEETKUNDE: Meten', 'METEN & MEETKUNDE: Meetkunde')),
    ],
    notes: `Fase 1 is groep 1, 2 and 3. The card is titled for kleuters, but its number range ("tot tenminste 20") is that of the fase 1 goals. ${MATH_EXAMPLES_NOTE}`,
  }),
  fase1Lane('reading-language', 'Fase 1 reading and language', [writingFormPart(1), cardPart(LANGUAGE_CARD_FASE_1, CARD_LANGUAGE_FASE_1, overlapCheck(34, 18, 46, 98), LANGUAGE_FASE_1_STATEMENTS, true)], {
    counted: `The Dutch-language card has 98 bullets, all in this lane, and ten sub-points, which stay inside their bullets. ${writingFormCounted(1)}`,
    granularity: `${FASE_1_OVERLAP} ${CARD_GRANULARITY} On the card the three bullets of Taalbeschouwing stand directly under their bar, at the foot of the first column.`,
    also: [PDF_LANGUAGE_OVERVIEW],
    batches: (domains) => [
      batch('data-speaking-listening', domains, inLines('Mondelinge taalvaardigheid')),
      batch('data-reading-writing-language', domains, inLines('Lezen', 'Schrijven', 'Taalbeschouwing')),
      batch('pdf-writing-content-and-form', domains, startsWith(WRITING_FORM)),
      batch('card-speaking-listening-language', domains, inBars(LANGUAGE_CARD_FASE_1, 'Mondelinge taalvaardigheid', 'Taalbeschouwing')),
      batch('card-reading-writing', domains, inBars(LANGUAGE_CARD_FASE_1, 'Lezen', 'Schrijven')),
    ],
    notes:
      `Fase 1 is groep 1, 2 and 3: the card has two blocks headed "vanaf GROEP 3", for first reading and first writing. The PDF of the Taalbeschouwing line also prints lists of terms and of spelling categories per pair of groepen, which are not in the data and are no records: the frame quotes the columns groep 1-2 and groep 3-4 below. One more PDF prints the goals of all four lines with the 2006 core goals each serves; it is read for the frame only. ${WRITING_FORM_NOTE}`,
  }),
  fase1Lane(
    'science',
    'Fase 1 science',
    [cardPart(`${WORLD_CARD_FASE_1}: nature, physics and technology, weather`, CARD_WORLD_FASE_1, overlapCheck(77, 16, 5, 98, ' for the whole card'), worldStatements(WORLD_CARD_FASE_1, true, SCIENCE), true)],
    {
      counted: worldShare(true),
      granularity: `${FASE_1_OVERLAP} ${CARD_GRANULARITY} The card puts the data's clusters "Heelal en hemellichamen" and "Weer en klimaat" under one heading.`,
      skipped: worldSkipped(true, SCIENCE),
      also: WORLD_ALSO,
      batches: (domains) => [batch('data', domains, startsWith(WORLD.areaTitle)), batch('card', domains, startsWith(WORLD_CARD_FASE_1))],
      notes: `From the area "Oriëntatie op jezelf en de wereld": plants, animals, the human body, physics and technology, and from the geography line the two clusters on the sky and the weather. ${WORLD_ALSO_NOTE}`,
    },
  ),
  fase1Lane(
    'practical-life-feelings',
    'Fase 1 practical life and feelings',
    [
      cardPart(`${WORLD_CARD_FASE_1}: self and others, safety, traffic, money, health`, CARD_WORLD_FASE_1, overlapCheck(77, 16, 5, 98, ' for the whole card'), worldStatements(WORLD_CARD_FASE_1, true, PRACTICAL), true),
      cardPart(SOCIAL_CARD_FASE_1, CARD_SOCIAL_FASE_1, 'SLO publishes this card as one PDF only. It has no inhoudslijn and nothing of it is in the open data, so the check is a second reading of the same page.', SOCIAL_FASE_1_STATEMENTS, false),
    ],
    {
      counted: `${worldShare(true)} The social-emotional card has 87 bullets, all in this lane.`,
      granularity: `${FASE_1_OVERLAP} ${CARD_GRANULARITY} The data's cluster "Omgaan met het milieu" has no heading of its own on the card: its two bullets stand under the geography heading "Inrichting en indeling van de ruimte", as bullets 3 and 4, and are records of this lane. ${SOCIAL_CARD_NOTE}`,
      skipped: worldSkipped(true, PRACTICAL),
      also: WORLD_ALSO,
      batches: (domains) => [
        batch('data', domains, startsWith(WORLD.areaTitle)),
        batch('world-card', domains, startsWith(WORLD_CARD_FASE_1)),
        batch('social-emotional-card-emotional', domains, inBars(SOCIAL_CARD_FASE_1, EMOTIONAL)),
        batch('social-emotional-card-social-moral', domains, inBars(SOCIAL_CARD_FASE_1, 'Sociale competenties', 'Morele competenties')),
      ],
      notes: `From the area "Oriëntatie op jezelf en de wereld": feelings, relationships, living together, safety, traffic, money as a consumer, health, and care for the environment. The cluster "(Veilige) leefomgeving" also holds some goals on rights. ${WORLD_ALSO_NOTE}`,
    },
  ),
]

// --- fase 2 and fase 3: the open data only -------------------------------------------

function laterLane(fase: 2 | 3, subject: Subject, title: string, fields: Pick<LaneFields, 'batches' | 'also'> & { notes: string; more?: readonly LanePart[]; counted?: string }): Lane {
  const data = perBandParts(fase, subject)
  const parts = [...data, ...(fields.more ?? [])]
  return lane(level(fase), subject, parts, {
    title: `${FASE_NAMES[fase]} ${title}`,
    countingMethod: `${perBandCount(fase, data)}${fields.counted === undefined ? '' : ` ${fields.counted}`}`,
    countIsFromImportFile: true,
    granularity: PER_BAND_GRANULARITY,
    skipped: perBandSkipped(fase, subject),
    also: fields.also ?? [],
    ...(fields.batches ? { batches: fields.batches } : {}),
    notes: `${PER_BAND_STANDING} ${fields.notes}${codeNote(fase, subject)}`,
  })
}

const BAND_NOTES: Record<2 | 3, string> = {
  2: 'Fase 2 is groep 4, 5 and 6. The goals are for the whole band: nothing says which are for groep 6.',
  3: 'Fase 3 is groep 7 and 8.',
}
const BEWERKINGEN_NOTE =
  'The open data misfiles the line Bewerkingen: it lists the ten goals of the cluster "Vermenigvuldigen en delen met decimale getallen" (rw/bew/4) under the cluster before it (rw/bew/3), links all ten to fase 3 although the first is a fase 2 goal, and fills rw/bew/4 with copies of the six goals of rw/bew/5. The content-line PDF and the goal numbers in the data itself agree on where each goal belongs, and the records follow them; the section on corrections below lists every goal concerned. A corrected record keeps the code the data gives it, so the ten goals of rw/bew/4 carry codes that open with rw/bew/3.'
const NO_SOCIAL = 'SLO publishes no social-emotional card or inhoudslijn for this fase: the line "Jezelf en de ander" is the nearest official material, and it is recorded here.'
const DUTCH_ALSO_NOTE =
  'One more PDF prints the goals of all four lines with the 2006 core goals each serves; it is read for the frame only. The PDF of the Taalbeschouwing line also prints lists of terms and of spelling categories per pair of groepen, which are not in the data and are no records: the frame quotes the columns of the groepen of this fase below.'

const laterLanes = (fase: 2 | 3): Lane[] => [
  laterLane(fase, 'mathematics', 'mathematics', {
    batches:
      fase === 2
        ? (domains) => [batch('numbers', domains, inLines(...NUMBERS)), batch('measuring-geometry', domains, inLines(...MEASURES))]
        : (domains) => [
            batch('number-sense-ratios', domains, inLines('Getalbegrip', 'Verhoudingen')),
            batch('operations', domains, inLines('Bewerkingen')),
            batch('measuring-length-to-temperature', domains, (group) => /\(rw\/m\/[1-5]\)$/.test(group)),
            batch('measuring-time-to-compound-geometry-relations', domains, (group) => /\(rw\/(?:m\/[6-8]|mk\/\d|verb\/\d)\)$/.test(group)),
          ],
    notes: `${BAND_NOTES[fase]} ${MATH_EXAMPLES_NOTE} ${BEWERKINGEN_NOTE}`,
  }),
  laterLane(fase, 'reading-language', 'reading and language', {
    also: [PDF_LANGUAGE_OVERVIEW],
    more: [writingFormPart(fase)],
    counted: writingFormCounted(fase),
    batches: (domains) => [
      batch('speaking-listening', domains, inLines('Mondelinge taalvaardigheid')),
      batch('reading-writing-language', domains, inLines('Lezen', 'Schrijven', 'Taalbeschouwing')),
      batch('pdf-writing-content-and-form', domains, startsWith(WRITING_FORM)),
    ],
    notes: `${BAND_NOTES[fase]} ${DUTCH_ALSO_NOTE} ${WRITING_FORM_NOTE}`,
  }),
  laterLane(fase, 'science', 'science', {
    also: WORLD_ALSO,
    ...(fase === 3 ? { batches: (domains: readonly Domain[]) => [batch('plants-animals-people', domains, inLines('Planten, dieren en de mens')), batch('sky-weather-physics-technology', domains, inLines('De ruimte om je heen', 'Verschijnselen uit natuurkunde en techniek'))] } : {}),
    notes: `${BAND_NOTES[fase]} ${WORLD_ALSO_NOTE}`,
  }),
  laterLane(fase, 'practical-life-feelings', 'practical life and feelings', {
    also: WORLD_ALSO,
    ...(fase === 2 ? { more: [CONSUMER_PART], counted: CONSUMER_COUNTED } : {}),
    ...(fase === 3 ? { batches: (domains: readonly Domain[]) => [batch('self-and-others', domains, inLines('Jezelf en de ander')), batch('society-environment-health', domains, inLines('De samenleving', 'De ruimte om je heen', 'Planten, dieren en de mens'))] } : {}),
    notes: `${BAND_NOTES[fase]} ${NO_SOCIAL} ${WORLD_ALSO_NOTE}${fase === 2 ? ` ${CONSUMER_NOTE}` : ''}`,
  }),
]

// ---------------------------------------------------------------------------
// The end of primary school: the legal core goals of 2026 and of 2006, the
// draft core goals expected on 1 August 2027, and the legal reference
// levels. The legal text is canonical; the open data is the check rendition
// and gives the ids of the nodes that pair with the statements.
// ---------------------------------------------------------------------------

type Doelzin = readonly [letter: string, items: number, page?: number]

// The nodes of one core goal of the 2026 kind: the goal sentence (unless it
// is recorded in another lane), each doelzin by its capital letter, and each
// item under it by its small letter.
const coreGoal = (group: string, number: number, doelzinnen: readonly Doelzin[], sentence: { page?: number } | null = {}): StatementRef[] => [
  ...(sentence ? [{ group, code: String(number), ...sentence }] : []),
  ...doelzinnen.flatMap(([letter, items, page]) => [
    { group, code: `${number} ${letter}`, ...(page === undefined ? {} : { page }) },
    ...Array.from({ length: items }, (_, index) => ({ group, code: `${number} ${letter} ${'abcdef'[index]}`, ...(page === undefined ? {} : { page }) })),
  ]),
]

const letters = (...items: readonly number[]): Doelzin[] => items.map((count, index) => ['ABCDEF'[index]!, count])

// --- the open data of the 2026 kind ------------------------------------------------

const CORE_GOAL_PAIRING =
  'A goal sentence pairs with the kernzin of the same number, a doelzin with the doelzin of the same letter under it, and an item with the uitwerking at the same position: the node with prefix u1 is item a. Sort the uitwerkingen by the number in their prefix, not by the order of the array.'

// The primary-school nodes of sets of core goals. `counts` is the nodes per goal that pair with a statement of the part.
const coreGoalNodes = (sets: readonly string[], counts: readonly (readonly [number: number, nodes: number])[], notes: string): DataSelection => ({
  kind: 'data',
  walk: [
    { file: 'sets.json', entity: 'fo_set', where: { title: sets } },
    { file: 'domeinen.json', entity: 'fo_domein', via: 'fo_domein_id' },
    { file: 'kernzinnen.json', entity: 'fo_kernzin', via: 'fo_kernzin_id', where: { prefix: counts.map(([number]) => String(number)) } },
    { file: 'doelzinnen.json', entity: 'fo_doelzin', via: 'fo_doelzin_id' },
    { file: 'uitwerkingen.json', entity: 'fo_uitwerking', via: 'fo_uitwerking_id' },
  ],
  recordEntities: ['fo_kernzin', 'fo_doelzin', 'fo_uitwerking'],
  wordingField: 'description',
  codeField: 'prefix',
  level: {
    entity: 'fo_uitwerking',
    field: 'niveau_id',
    source: DATA_BASIS,
    titles: ['po', 'so'],
    rule: 'A kernzin has no level of its own. It is a primary-school kernzin when every uitwerking under it lists exactly these two levels. A domain of the set also lists a secondary-school kernzin, sometimes with the same number, whose uitwerkingen list other levels.',
  },
  groupBy: { entity: 'fo_kernzin', field: 'prefix' },
  groups: counts.map(([number, nodes]) => ({ name: String(number), count: nodes })),
  notes: `${notes} The goal text is in "description"; "title" holds a label such as "Kerndoel 10", "Doelzin 10A" or "Het gaat hierbij om". Every set has the status "definitief concept", also the two that are law, so standing is never read here. The illustrations (illustraties.json, "Te denken valt aan") are in neither the law nor the bundle and are not records. Ignore deprecated.json.`,
})

// --- the core goals of 2026 ----------------------------------------------------------

const GOALS_2026 = 'Kerndoelen 2026'

const LOCATE_2026 =
  'Each core goal is one table in the division of its domain. Row 1 holds "Kerndoel N", row 2 the goal sentence (the kernzin), row 3 the column heads "Doelzin:" and "Het gaat hierbij om:". Each row after that is one doelzin: its capital letter ("A."), its sentence, and in the third cell one paragraph per item, opening with its small letter ("a."). A record is the goal sentence, a doelzin sentence, or one item, without its number or letter.'

const GRANULARITY_2026 =
  'Core goals of 2026: three kinds of node, each a record. The goal (printed "Kerndoel N", with its sentence under it), the doelzin (printed with a capital letter, "A.") and the item under "Het gaat hierbij om:" (printed with a small letter, "a."). The numbers start again elsewhere: annexes 2 to 4 of the same decree start again at 1, the 2006 goals have their own 1 to 58, and every goal starts again at A and a. So the code scope names the decree, the annex and the part, and the record id is built on the id of the paired node of the open data. Several goals are addressed to the school ("De school ..."), not to the pupil.'

type Goal2026 = readonly [domain: string, number: number, items: readonly number[]]

const goals2026 = (part: string, goals: readonly Goal2026[]): StatementRef[] => goals.flatMap(([domain, number, items]) => coreGoal(`${GOALS_2026} / ${part} / ${domain} / Kerndoel ${number}`, number, letters(...items)))

const nodesOf = (goals: readonly Goal2026[]): (readonly [number, number])[] => goals.map(([, number, items]) => [number, 1 + items.length + items.reduce((sum, count) => sum + count, 0)])

const DUTCH_2026: readonly Goal2026[] = [
  ['Domein: overkoepelend', 1, [5, 5]],
  ['Domein: communicatie', 2, [6, 5, 3]],
  ['Domein: communicatie', 3, [5, 4, 5]],
  ['Domein: communicatie', 4, [5, 5]],
  ['Domein: communicatie', 5, [4]],
  ['Domein: taal', 6, [5, 5]],
  ['Domein: taal', 7, [4, 5]],
  ['Domein: literatuur', 8, [4, 4]],
  ['Domein: literatuur', 9, [4, 3]],
]

const MATH_2026: readonly Goal2026[] = [
  ['Domein: wiskundige concepten', 10, [5, 5, 5]],
  ['Domein: wiskundige concepten', 11, [5]],
  ['Domein: wiskundige concepten', 12, [5]],
  ['Domein: wiskundige concepten', 13, [3]],
  ['Domein: wiskundige concepten', 14, [5]],
  ['Domein: wiskundige denk-werkwijzen', 15, [4, 4, 4]],
  ['Domein: wiskundige denk-werkwijzen', 16, [5, 4]],
  ['Domein: wiskunde en de wereld', 17, [3]],
  ['Domein: wiskunde en de wereld', 18, [5, 4]],
]

function part2026(part: string, element: string, goals: readonly Goal2026[], set: string, locate: string, differences: string, order: string): LanePart {
  const statements = goals2026(part, goals)
  const nodes: DataNodes = {
    source: DATA_CORE_GOALS,
    selection: coreGoalNodes([set], nodesOf(goals), order),
    idsPairOneToOne: true,
    pairing: CORE_GOAL_PAIRING,
  }
  return {
    name: `Besluit kerndoelen primair en speciaal onderwijs 2026, bijlage 1, ${part}`,
    source: DECREE_2026,
    checkRendition: DATA_CORE_GOALS,
    checkStrength: 'second-rendition',
    checkGranularity: `The open data: the primary-school nodes of the set "${set}", SLO's own transcription of the same goals. Same granularity, node for node. ${differences} A difference is written down as "wording differs"; the record follows the law. SLO's bundle of July 2026 is a third rendition and is read for the frame only.`,
    expectedCount: statements.length,
    selection: { kind: 'legal', elements: [element], locate, statements },
    dataNodes: nodes,
  }
}

const DUTCH_2026_PART = part2026(
  'Onderdeel A Nederlands',
  '/Bijlage1/DivisieA',
  DUTCH_2026,
  'Kerndoelen Nederlands',
  LOCATE_2026,
  'Of the 114 wordings 8 differ after normalisation: 4 B c, the goal sentence of 5 (where the law prints "zicht" and the data "zich"), 6 B, 6 B d, 8 B a, 9 A, 9 B and 9 B c. The others are typos or dropped letters in the data. The source record of the open data counts 18 differing wordings for the 2026 goals: these 8 and the 10 of Onderdeel B Rekenen en wiskunde, which are records of end-of-primary mathematics.',
  'In doelzin 4 B the uitwerkingen are stored out of order.',
)

const MATH_2026_PART = part2026(
  'Onderdeel B Rekenen en wiskunde',
  '/Bijlage1/DivisieB',
  MATH_2026,
  'Kerndoelen rekenen en wiskunde',
  `${LOCATE_2026} Item 10 B a is split over five paragraphs around four images of fractions (plaatje): it is one item on one line, and each image is written as its transcription from manifest/nl-additions.ts, marked as an image: [afbeelding: (1/3)].`,
  'Of the 90 wordings 10 differ after normalisation: 10 A a, 10 A c, 10 B a (where the law prints four images of fractions and the data writes them as text), 13 A a, 15 A, 15 C, 17 A c, 18 A d, 18 B a and 18 B d. The source record of the open data counts 18 differing wordings for the 2026 goals: these 10 and the 8 of Onderdeel A Nederlands, which are records of end-of-primary reading and language.',
  'In doelzinnen 10 B and 12 A the uitwerkingen are stored out of order.',
)

// --- the core goals of 2006 ------------------------------------------------------------

const GOALS_2006 = 'Kerndoelen 2006'

const LOCATE_2006 =
  'The goals are the numbered items (li) of the lists in the division "Kerndoelen" of an area. The number is in li.nr with a full stop ("23."), and the sub-area is the heading (tussenkop) above a list. A record is one numbered item with all its paragraphs, without the number.'

const GRANULARITY_2006 =
  'Core goals of 2006: one record is one numbered goal. The decree prints the number with a full stop in one list that runs from 1 to 58 across all areas. The numbers are unique in this decree, but the 2026 goals start again at 1, so the code scope names the decree and the area. The record id is built on the id of the paired node of the open data.'

const range = (first: number, last: number): number[] => Array.from({ length: last - first + 1 }, (_, index) => first + index)
const two = (number: number): string => String(number).padStart(2, '0')

type SubArea = readonly [name: string, numbers: readonly number[]]

function part2006(name: string, from: string, element: string, area: string, subAreas: readonly SubArea[], locate: string, differences: string): LanePart {
  const statements = subAreas.flatMap(([subArea, numbers]) => numbers.map((number) => ({ group: `${GOALS_2006} / ${area} / ${subArea}`, code: String(number) })))
  const numbers = subAreas.flatMap(([, each]) => each)
  return {
    name,
    source: from,
    checkRendition: DATA_2006,
    checkStrength: 'second-rendition',
    checkGranularity: `The open data: the nodes "PO Kerndoel ${two(numbers[0]!)}" to "PO Kerndoel ${two(numbers.at(-1)!)}" named here, one per goal. Same granularity. ${differences} A difference is written down as "wording differs"; the record follows the law.`,
    expectedCount: statements.length,
    selection: { kind: 'legal', elements: [element], locate, statements },
    dataNodes: {
      source: DATA_2006,
      selection: {
        kind: 'data',
        walk: [{ file: 'kerndoelen.json', entity: 'kerndoel', where: { prefix: numbers.map((number) => `PO Kerndoel ${two(number)}`) } }],
        recordEntities: ['kerndoel'],
        wordingField: 'title',
        codeField: 'prefix',
        groupBy: { entity: 'kerndoel', field: 'prefix' },
        groups: numbers.map((number) => ({ name: `PO Kerndoel ${two(number)}`, count: 1 })),
        notes:
          'Here the goal sentence is in "title" and "description" holds a short label: the reverse of the data of the 2026 goals. The file also holds the goals of secondary and special education with the same numbers ("VO Kerndoel 01"), so select by the whole prefix. It has no status field and still holds all 58 primary-school goals, also those struck on 1 August 2026. Ignore deprecated.json.',
      },
      idsPairOneToOne: true,
      pairing: 'Goal N pairs with the node whose prefix is "PO Kerndoel NN", the number written with two digits.',
    },
  }
}

const STRUCK =
  'These goals were struck from the decree on 1 August 2026, and a school may still use them until 1 August 2031 (artikel 6 of the Besluit kerndoelen primair en speciaal onderwijs 2026). They are read from the version of the decree that was in force until 31 July 2026, and every record says so.'

const DUTCH_2006_PART = part2006(
  'Besluit vernieuwde kerndoelen WPO as it read until 31 July 2026, Nederlands (kerndoelen 1 to 12)',
  DECREE_2006_UNTIL_2026,
  '/Bijlage/Divisie_2/Divisie_2',
  'Nederlands',
  [
    ['Mondeling taalonderwijs', range(1, 3)],
    ['Schriftelijk taalonderwijs', range(4, 9)],
    ['Taalbeschouwing, waaronder strategieën', range(10, 12)],
  ],
  `${LOCATE_2006} Kerndoel 11 has two paragraphs and a list of three dashes, and is one record.`,
  'Of the 12 wordings 3 differ: 10 and 12 in their quote marks only, and 11, where the data stops after the first of its three rules.',
)

const MATH_2006_PART = part2006(
  'Besluit vernieuwde kerndoelen WPO as it read until 31 July 2026, Rekenen/wiskunde (kerndoelen 23 to 33)',
  DECREE_2006_UNTIL_2026,
  '/Bijlage/Divisie_5/Divisie_2',
  'Rekenen/wiskunde',
  [
    ['Wiskundig inzicht en handelen', range(23, 25)],
    ['Getallen en bewerkingen', range(26, 31)],
    ['Meten en meetkunde', range(32, 33)],
  ],
  LOCATE_2006,
  'Of the 11 wordings 1 differs: 25, by a hyphen.',
)

const WORLD_2006 = 'Oriëntatie op jezelf en de wereld'
const WORLD_2006_ELEMENT = '/Bijlage/Divisie_3/Divisie_2'

const SCIENCE_2006_PART = part2006(
  'Besluit vernieuwde kerndoelen WPO, Oriëntatie op jezelf en de wereld: Natuur en techniek (kerndoelen 40 to 46)',
  DECREE_2006,
  WORLD_2006_ELEMENT,
  WORLD_2006,
  [['Natuur en techniek', range(40, 46)]],
  LOCATE_2006,
  'Of the 7 wordings 1 differs: 46, by a comma.',
)

const PRACTICAL_2006_PART = part2006(
  'Besluit vernieuwde kerndoelen WPO, Oriëntatie op jezelf en de wereld: Mens en samenleving (kerndoelen 34, 35, 37, 38 and 39)',
  DECREE_2006,
  WORLD_2006_ELEMENT,
  WORLD_2006,
  [['Mens en samenleving', [34, 35, 37, 38, 39]]],
  LOCATE_2006,
  'Of the 5 wordings 1 differs, in substance: in 38 the data adds a clause that the law does not have.',
)

// --- the draft core goals expected on 1 August 2027 -----------------------------------------

const DRAFT_GOALS = 'Conceptkerndoelen 2027'

const DRAFT_LOCATE =
  'Read by word position (pdftotext -bbox), every page split into two columns at one fixed x position: read the columns of a page and give `column` on each span. The primary-school goals are amendment F of ARTIKEL I, PDF pages 3 to 18, which opens "Aan bijlage 1 worden onderdelen toegevoegd". Stay inside those pages: later pages print goals with the same numbers for special and secondary education. Under "Onderdeel X. Name" and "Domein: name" a goal is headed "Kerndoel N", then its sentence, then a table of two columns headed "Doelzin:" and "Het gaat hierbij om:". Column 1 holds the headings, the goal sentence (set across the full width, and whole in column 1) and each doelzin after its capital letter; column 2 holds the items after their small letters and, at its foot, the footer "B28540.K-1" and the page number. A table runs on over a page break: its doelzin goes on at the top of column 1 of the next page, its items at the top of column 2. Every letter stands on one line with its text in this view: in layout mode the letters of 32 B a and 32 C a stood alone on their lines, which no longer applies. A record is the goal sentence, a doelzin sentence, or one item, without its number or letter. The page of a statement is the page its doelzin starts on.'

const DRAFT_GRANULARITY =
  'Draft core goals: the same three kinds of node as the core goals of 2026 (goal, doelzin with a capital letter, item with a small letter), each a record. The draft numbers run on after the 2026 decree, from 19 to 40. Every record is a draft that is not yet in force: the decree is unsigned, and its own last article sets 1 August 2027.'

const draftCheck = (pages: string): string =>
  `SLO's bundle of July 2026 prints the same goals on PDF ${pages}. A PDF page there is a spread of two printed pages, read by column. It prints a doelzin as its number and letter ("19A") and the items as bullets without letters. Same granularity; an item is found by its doelzin and its position.`

function draftPart(name: string, pages: readonly (readonly [number, number])[], statements: readonly StatementRef[], bundlePages: string, sets: readonly string[], groups: readonly (readonly [number, number])[], split: string): LanePart {
  return {
    name,
    source: DRAFT_DECREE,
    checkRendition: BUNDLE,
    checkStrength: 'second-rendition',
    checkGranularity: draftCheck(bundlePages),
    expectedCount: statements.length,
    selection: { kind: 'statements', pages, locate: DRAFT_LOCATE, statements },
    dataNodes: {
      source: DATA_CORE_GOALS,
      selection: coreGoalNodes(sets, groups, split),
      idsPairOneToOne: true,
      pairing: `${CORE_GOAL_PAIRING} The data gives the ids only: it is older than the draft decree and the bundle, and its wording is not compared.`,
    },
  }
}

const NATURE = `${DRAFT_GOALS} / Onderdeel F. Mens en natuur`
const NATURE_29 = `${NATURE} / Domein: natuurwetenschappen en technologie / Kerndoel 29`
const NATURE_30 = `${NATURE} / Domein: natuurkundige en scheikundige verschijnselen en technische systemen / Kerndoel 30`
const NATURE_31 = `${NATURE} / Domein: organismen en gezondheid / Kerndoel 31`
const NATURE_32 = `${NATURE} / Domein: systeem aarde / Kerndoel 32`
const CITIZENSHIP = `${DRAFT_GOALS} / Onderdeel C. Burgerschap`
const SOCIETY_28 = `${DRAFT_GOALS} / Onderdeel E. Mens en maatschappij / Domein: mens en samenleving / Kerndoel 28`

const SCIENCE_DRAFT_STATEMENTS: readonly StatementRef[] = [
  ...coreGoal(NATURE_29, 29, [['A', 5, 11], ['B', 5, 11], ['C', 5, 11], ['D', 5, 11]], { page: 11 }),
  ...coreGoal(NATURE_30, 30, [['A', 5, 12], ['B', 5, 12], ['C', 5, 12]], { page: 12 }),
  ...coreGoal(NATURE_31, 31, [['A', 5, 13]], { page: 12 }),
  ...coreGoal(NATURE_32, 32, [['A', 5, 13], ['B', 5, 14], ['C', 5, 14]], { page: 13 }),
]

const PRACTICAL_DRAFT_STATEMENTS: readonly StatementRef[] = [
  ...coreGoal(`${CITIZENSHIP} / Domein: democratische oefenplaats / Kerndoel 19`, 19, [['A', 4, 3]], { page: 3 }),
  ...coreGoal(`${CITIZENSHIP} / Domein: samenleven in een democratische rechtsstaat / Kerndoel 20`, 20, [['A', 5, 3], ['B', 5, 4]], { page: 3 }),
  ...coreGoal(SOCIETY_28, 28, [['A', 5, 10], ['D', 5, 10], ['E', 4, 10]], { page: 9 }),
  ...coreGoal(NATURE_31, 31, [['B', 5, 13]], null),
]

const SCIENCE_DRAFT_PART = draftPart(
  'Draft Besluit vernieuwde kerndoelen overige leergebieden, Onderdeel F. Mens en natuur (kerndoelen 29 to 32, without doelzin 31 B)',
  [[11, 14]],
  SCIENCE_DRAFT_STATEMENTS,
  'pages 39 and 40',
  ['Kerndoelen mens en natuur'],
  [
    [29, 25],
    [30, 19],
    [31, 7],
    [32, 19],
  ],
  'Of kerndoel 31 this part takes the kernzin and doelzin A with its uitwerkingen; doelzin B is in practical life and feelings.',
)

const PRACTICAL_DRAFT_PART = draftPart(
  'Draft Besluit vernieuwde kerndoelen overige leergebieden: Burgerschap 19 and 20, Mens en maatschappij 28 (goal sentence, A, D, E), Mens en natuur 31 B',
  [
    [3, 4],
    [9, 11],
    [13, 13],
  ],
  PRACTICAL_DRAFT_STATEMENTS,
  'page 24 (burgerschap), pages 34 and 35 (kerndoel 28) and page 40 (kerndoel 31)',
  ['Kerndoelen burgerschap', 'Kerndoelen mens en maatschappij', 'Kerndoelen mens en natuur'],
  [
    [19, 6],
    [20, 13],
    [28, 18],
    [31, 6],
  ],
  'Of kerndoel 28 this part takes the kernzin and doelzinnen A, D and E with their uitwerkingen; of kerndoel 31 only doelzin B with its uitwerkingen, without the kernzin.',
)

// --- the reference levels ---------------------------------------------------------------------

const REFERENCE_GRANULARITY =
  'Reference levels: the decree prints no codes for its statements, so the code is empty and the locator carries the level, the section, the row labels and the position. The code scope names the decree and the annex. The open data has codes of its own (RKT1.1.1-1F, RKR_1.A.1a-1F), which are not printed in the law and are not used.'

// The open data of the reference levels: structure in one repository, text and level in another.
const referenceNodes = (subject: 'RKT' | 'RKR', levelTitle: string, groups: readonly (readonly [string, number])[], notes: string): DataNodes => ({
  source: DATA_REFERENCE,
  selection: {
    kind: 'data',
    walk: [
      { file: 'ref.vakleergebieden.json', entity: 'ref_vakleergebied', where: { prefix: [subject] } },
      { file: 'ref.domeinen.json', entity: 'ref_domein', via: 'ref_domein_id' },
      { file: 'ref.subdomeinen.json', entity: 'ref_subdomein', via: 'ref_subdomein_id' },
      { file: 'ref.onderwerpen.json', entity: 'ref_onderwerp', via: 'ref_onderwerp_id', optional: true },
      { file: 'ref.deelonderwerpen.json', entity: 'ref_deelonderwerp', via: 'ref_deelonderwerp_id', optional: true },
    ],
    join: { via: 'doelniveau_id', source: DATA_BASIS, file: 'doelniveaus.json', entity: 'doelniveau', wording: { via: 'doel_id', file: 'doelen.json', field: 'title' } },
    recordEntities: ['doelniveau'],
    codeField: 'prefix',
    level: { entity: 'doelniveau', field: 'niveau_id', source: DATA_BASIS, titles: [levelTitle], rule: 'A goal-at-level object lists exactly one level. It is in when that level has this title.' },
    groupBy: { entity: 'ref_domein', field: 'prefix' },
    groups: groups.map(([name, count]) => ({ name, count })),
    notes: `${notes} Goals hang off any step of the walk, from the domain down. Join against the separate clone of curriculum-basis at its own pinned commit, not the submodule. Several codes occur twice. Ignore deprecated.json.`,
  },
  idsPairOneToOne: false,
  pairing: 'No pairing: the data cuts the text of the decree into other pieces, so a record takes no id here. Its slug is built on its locator, and these nodes are read by the second check only.',
})

// Dutch language: 1F and 2F.

const LANGUAGE_REFERENCE = (lvl: string): string => `Referentieniveau ${lvl} Nederlandse taal`

const TASKS = 'Taken'
const FEATURES = 'Kenmerken van de taakuitvoering'

// One row of a level table: the group label that holds for it (none before the first), its own label, and the paragraphs in its 1F and 2F cells.
type LanguageRow = readonly [group: string, label: string, in1F: number, in2F: number]

const LANGUAGE_SECTIONS: readonly (readonly [section: string, elements: readonly string[], rows: readonly LanguageRow[]])[] = [
  [
    '1.1 Gesprekken',
    ['/Bijlage1/Divisie1_1/Divisie1.1', '/Bijlage1/Divisie1_2/Divisie1.1'],
    [
      ['', 'Algemene omschrijving Gesprekken', 1, 1],
      [TASKS, '1. Deelnemen aan discussie en overleg', 2, 2],
      [TASKS, '2. Informatie uitwisselen', 2, 2],
      [FEATURES, 'Beurten nemen en bijdragen aan samenhang', 1, 2],
      [FEATURES, 'Afstemming op doel', 2, 2],
      [FEATURES, 'Afstemming op de gesprekspartner(s)', 2, 3],
      [FEATURES, 'Woordgebruik en woordenschat', 1, 1],
      [FEATURES, 'Vloeiendheid, verstaanbaarheid en grammaticale beheersing', 2, 3],
    ],
  ],
  [
    '1.2 Luisteren',
    ['/Bijlage1/Divisie1_3/Divisie1.2', '/Bijlage1/Divisie1_4/Divisie1.2', '/Bijlage1/Divisie1_5/Divisie1.2'],
    [
      ['', 'Algemene omschrijving Luisteren', 1, 1],
      ['Tekstkenmerken', 'Lengte', 1, 1],
      ['Tekstkenmerken', 'Opbouw', 3, 2],
      [TASKS, '1. Luisteren naar instructies', 1, 1],
      [TASKS, '2. Luisteren als lid van een live publiek', 2, 2],
      [TASKS, '3. Luisteren naar radio en televisie en naar gesproken tekst op internet', 1, 1],
      [FEATURES, 'Begrijpen', 1, 2],
      [FEATURES, 'Interpreteren', 2, 2],
      [FEATURES, 'Evalueren', 1, 1],
      [FEATURES, 'Samenvatten', 1, 1],
    ],
  ],
  [
    '1.3 Spreken',
    ['/Bijlage1/Divisie1_6/Divisie1.3', '/Bijlage1/Divisie1_7/Divisie1.3'],
    [
      ['', 'Algemene omschrijving Spreken', 1, 1],
      [TASKS, 'Een monoloog houden', 2, 1],
      [FEATURES, 'Samenhang', 1, 2],
      [FEATURES, 'Afstemming op doel', 1, 1],
      [FEATURES, 'Afstemming op publiek', 2, 2],
      [FEATURES, 'Woordgebruik en woordenschat', 1, 1],
      [FEATURES, 'Vloeiendheid, verstaanbaarheid en grammaticale beheersing', 4, 3],
    ],
  ],
  [
    '2.1 Zakelijke teksten',
    ['/Bijlage1/Divisie2_1/Divisie2.1', '/Bijlage1/Divisie2_2/Divisie2.1', '/Bijlage1/Divisie2_3/Divisie2.1'],
    [
      ['', 'Algemene omschrijving Lezen zakelijke teksten', 1, 1],
      ['Teksten', 'Tekstkenmerken', 1, 1],
      [TASKS, '1. Lezen van informatieve teksten', 1, 1],
      [TASKS, '2. Lezen van instructies', 1, 1],
      [TASKS, '3. Lezen van betogende teksten', 1, 1],
      [FEATURES, 'Techniek en woordenschat', 1, 1],
      [FEATURES, 'Begrijpen', 2, 2],
      [FEATURES, 'Interpreteren', 1, 2],
      [FEATURES, 'Evalueren', 1, 1],
      [FEATURES, 'Samenvatten', 0, 1],
      [FEATURES, 'Opzoeken', 2, 1],
    ],
  ],
  [
    '2.2 Fictionele, narratieve en literaire teksten',
    ['/Bijlage1/Divisie2_4/Divisie2.2', '/Bijlage1/Divisie2_5/Divisie2.2'],
    [
      ['', 'Algemene omschrijving Lezen fictionele, narratieve en literaire teksten', 1, 1],
      ['Teksten', 'Tekstkenmerken', 1, 3],
      [FEATURES, 'Begrijpen', 1, 5],
      [FEATURES, 'Interpreteren', 2, 1],
      [FEATURES, 'Evalueren', 2, 1],
    ],
  ],
  [
    '3 Schrijven',
    ['/Bijlage1/Divisie3_1', '/Bijlage1/Divisie3_2', '/Bijlage1/Divisie3_3'],
    [
      ['', 'Algemene omschrijving', 1, 1],
      [TASKS, '1. Correspondentie', 1, 2],
      [TASKS, '2. Formulieren invullen, berichten, advertenties en aantekeningen', 3, 2],
      [TASKS, '3. Verslagen, werkstukken, samenvattingen, artikelen', 1, 2],
      [TASKS, '4. Vrij schrijven', 1, 0],
      [FEATURES, 'Samenhang', 2, 3],
      [FEATURES, 'Afstemming op doel', 0, 1],
      [FEATURES, 'Afstemming op publiek', 2, 1],
      [FEATURES, 'Woordgebruik en woordenschat', 1, 1],
      [FEATURES, 'Spelling, interpunctie en grammatica', 2, 2],
      [FEATURES, 'Leesbaarheid', 3, 1],
    ],
  ],
]

// Paragraphs of a level cell that hold only a joining sign, "+": the cell
// prints a reference to another section ("Zie Gesprekken"), the sign, and
// then what comes on top of it at this level. The sign is no statement. The
// importer joins it to the paragraph before it, so that record reads "Zie
// Gesprekken +", and the paragraphs after it keep the positions the cell
// gives them: the cell at 1F has records 1, 3 and 4.
const JOINING_SIGNS: readonly (readonly [section: string, label: string, lvl: '1F' | '2F', position: number])[] = [
  ['1.3 Spreken', 'Vloeiendheid, verstaanbaarheid en grammaticale beheersing', '1F', 2],
  ['1.3 Spreken', 'Vloeiendheid, verstaanbaarheid en grammaticale beheersing', '2F', 2],
]

const languageStatements = (lvl: '1F' | '2F'): StatementRef[] =>
  LANGUAGE_SECTIONS.flatMap(([section, , rows]) =>
    rows.flatMap(([group, label, in1F, in2F]) =>
      Array.from({ length: lvl === '1F' ? in1F : in2F }, (_, index) => index + 1)
        .filter((position) => !JOINING_SIGNS.some((sign) => sign[0] === section && sign[1] === label && sign[2] === lvl && sign[3] === position))
        .map((position) => ({ group: `${LANGUAGE_REFERENCE(lvl)} / ${section}`, code: `${group === '' ? '' : `${group} / `}${label} / ${position}` })),
    ),
  )

const LANGUAGE_REFERENCE_LOCATE =
  'Each section (1.1 to 3) is one table that runs on through the divisions headed "vervolg". The head row names the levels: Niveau 1F, 2F, 3F and 4F. A body row is one descriptor: its label in the first cell, then one cell per level. A row with a label and empty cells is a group label (Taken, Tekstkenmerken, Teksten, Kenmerken van de taakuitvoering): it holds for the rows below it, also in the next division, until the next group label. A record is one paragraph (al) of the cell under this part\'s level, named by its position in the cell; an empty cell gives none. A paragraph that holds only a joining sign ("+") is no record: it is joined to the paragraph before it, and the paragraphs after it keep their positions. The same row labels recur in several sections, so the section is part of where a statement is.'

const languagePart = (lvl: '1F' | '2F', dataGroups: readonly (readonly [string, number])[], compared: string): LanePart => {
  const statements = languageStatements(lvl)
  const dataTotal = dataGroups.reduce((sum, [, count]) => sum + count, 0)
  return {
    name: `Besluit referentieniveaus Nederlandse taal en rekenen, bijlage 1, sections 1.1 to 3, niveau ${lvl}`,
    source: REFERENCE_DECREE,
    checkRendition: DATA_REFERENCE,
    checkStrength: 'second-rendition',
    checkGranularity: `The open data: the ${dataTotal} goals of "Referentiekader Taal" at level ${lvl}, with their text in curriculum-basis. Granularity differs: the data cuts the paragraphs of the decree into other pieces. ${compared} Compare the joined text of a cell, and write down "granularity differs" where the pieces differ. A paragraph the data lacks is read again in the decree.`,
    expectedCount: statements.length,
    selection: { kind: 'legal', elements: LANGUAGE_SECTIONS.flatMap(([, elements]) => elements), locate: LANGUAGE_REFERENCE_LOCATE, statements },
    dataNodes: referenceNodes('RKT', lvl, dataGroups, 'The data has nothing of section 4 (Begrippenlijst en Taalverzorging): ref.tekstkenmerken.json is empty.'),
  }
}

const TERMS = '4.1 Begrippenlijst'
// The label of the fourth row of table 1, as the decree prints it.
const TESTKENNIS_NOTE =
  'In table 1 of section 4.1 the decree labels a row "Testkennis". The row lists terms about texts (standpunt, argument, tekstsoort), so the label is read here as the decree\'s own misprint for "Tekstkennis"; the two records of that row, at 1F and at 2F, carry "Testkennis" in their title, locator and file name, as printed.'
const DIFFICULTY = '4.4 Moeilijkheid'
const SPELLING_3 = 'Spelling / 3. Morfologische spelling / Moeilijke gevallen'
const SPELLING_4 = 'Spelling / 4. Morfologische spelling op syntactische basis / Moeilijke gevallen / Persoonsvorm'

// Section 4: the cells of table 1 and the rows of table 2 marked "+", per level.
const SECTION_4: Record<'1F' | '2F', readonly (readonly [table: string, code: string, note?: string])[]> = {
  '1F': [
    [TERMS, 'Leestekens'],
    [TERMS, 'Woordsoorten'],
    [TERMS, 'Grammaticale kennis'],
    [TERMS, 'Testkennis', 'Printed "Testkennis"; the row is about knowledge of texts.'],
    [TERMS, 'Stilistiek en semantiek'],
    [TERMS, 'Morfologie'],
    [TERMS, 'Opmaak'],
    [TERMS, 'Klanken'],
    [DIFFICULTY, 'Spelling / 1. Alfabetische spelling'],
    [DIFFICULTY, 'Spelling / 2. Orthografische spelling'],
    [DIFFICULTY, 'Spelling / 3. Morfologische spelling', 'The row label has two paragraphs: the name of the rule and what falls under it.'],
    [DIFFICULTY, 'Spelling / 4. Morfologische spelling op syntactische basis', 'The row label has two paragraphs: the name of the rule and what falls under it.'],
    [DIFFICULTY, 'Spelling / 5. Logografisch'],
    [DIFFICULTY, 'Leestekens / 1. Hoofdletters en punten'],
    [DIFFICULTY, 'Leestekens / 2. Vraagtekens, uitroeptekens en aanhalingstekens'],
    [DIFFICULTY, 'Overige regels / Afbreekregels'],
    [DIFFICULTY, 'Grammaticale begrippen voor werkwoordsspelling', 'One row, whose label is a list of terms.'],
  ],
  '2F': [
    [TERMS, 'Leestekens'],
    [TERMS, 'Grammaticale kennis'],
    [TERMS, 'Testkennis', 'Printed "Testkennis". The cell has two paragraphs and is one record.'],
    [TERMS, 'Stilistiek en semantiek'],
    ...['a', 'b', 'c', 'd', 'e', 'f'].map((letter): readonly [string, string] => [DIFFICULTY, `${SPELLING_3} / ${letter})`]),
    ...['a', 'b', 'c'].map((letter): readonly [string, string] => [DIFFICULTY, `${SPELLING_4} / ${letter})`]),
    [DIFFICULTY, 'Spelling / 6. Overige regels / a)'],
    [DIFFICULTY, 'Leestekens / 3. Hoofdletters bij eigennaam en directe rede'],
  ],
}

const section4Part = (lvl: '1F' | '2F'): LanePart => {
  const statements = SECTION_4[lvl].map(([table, code, note]): StatementRef => ({ group: `${LANGUAGE_REFERENCE(lvl)} / ${table}`, code, ...(note === undefined ? {} : { note }) }))
  return {
    name: `Besluit referentieniveaus Nederlandse taal en rekenen, bijlage 1, section 4 Begrippenlijst en Taalverzorging, niveau ${lvl}`,
    source: REFERENCE_DECREE,
    checkRendition: SAME_FILE,
    checkStrength: 'second-reading',
    checkGranularity: 'A second reading of the decree: the open data has nothing of section 4, and the Staatsblad text of the decree was not fetched.',
    expectedCount: statements.length,
    selection: {
      kind: 'legal',
      elements: ['/Bijlage1/Divisie4/Divisie4.1', '/Bijlage1/Divisie4/Divisie4.4'],
      locate:
        'Two tables. Tabel 1, in 4.1 Begrippenlijst: a row is a kind of term, with one cell for 1F and one for 2F. A record is one non-empty cell under this part\'s level, whatever the number of paragraphs in it. Tabel 2, in 4.4 Moeilijkheid: a row is a rule of spelling or punctuation, and a "+" marks the level at which it is mastered. A record is one row marked "+" under this part\'s level; its wording is the label of the row, and its code gives the headings above it (Spelling, Leestekens, Overige regels, the numbered rule, "Moeilijke gevallen", "Persoonsvorm"). The running lists of 4.1, 4.2 and 4.3 carry no level and are not records.',
      statements,
    },
  }
}

// Arithmetic: 1F and 1S.

const MATH_REFERENCE = (lvl: string): string => `Referentieniveau ${lvl} rekenen`

const SUB_AREAS = ['A Notatie, taal en betekenis', 'B Met elkaar in verband brengen', 'C Gebruiken'] as const
const KINDS = ['Paraat hebben', 'Functioneel gebruiken', 'Weten waarom'] as const

// The dash statements of one domain: per sub-area (A, B, C) and per kind of knowledge, at 1F and at 1S.
type Counts = readonly [in1F: number, in1S: number]
type DomainRows = readonly [a: readonly [Counts, Counts, Counts], b: readonly [Counts, Counts, Counts], c: readonly [Counts, Counts, Counts]]

const MATH_DOMAINS: readonly (readonly [domain: string, elements: readonly string[], rows: DomainRows])[] = [
  [
    '1 Getallen',
    ['/Bijlage2/Divisie1_1/Divisie1.1', '/Bijlage2/Divisie1_2/Divisie1.1', '/Bijlage2/Divisie1_3/Divisie1.1'],
    [
      [[5, 1], [2, 2], [1, 2]],
      [[3, 1], [4, 3], [1, 2]],
      [[14, 14], [4, 1], [1, 3]],
    ],
  ],
  [
    '2 Verhoudingen',
    ['/Bijlage2/Divisie2_1/Divisie2.1', '/Bijlage2/Divisie2_2/Divisie2.1'],
    [
      [[4, 3], [3, 1], [0, 1]],
      [[1, 2], [3, 3], [0, 2]],
      [[1, 1], [2, 3], [1, 4]],
    ],
  ],
  [
    '3 Meten en Meetkunde',
    ['/Bijlage2/Divisie3_1/Divisie3.1', '/Bijlage2/Divisie3_2/Divisie3.1', '/Bijlage2/Divisie3_3/Divisie3.1'],
    [
      [[4, 5], [4, 4], [3, 5]],
      [[2, 2], [4, 3], [1, 3]],
      [[4, 1], [2, 1], [0, 3]],
    ],
  ],
  [
    '4 Verbanden',
    ['/Bijlage2/Divisie4_1/Divisie4.1', '/Bijlage2/Divisie4_2/Divisie4.1'],
    [
      [[1, 2], [2, 2], [1, 1]],
      [[1, 4], [1, 1], [1, 1]],
      [[1, 1], [1, 2], [0, 2]],
    ],
  ],
]

const mathReferenceStatements = (lvl: '1F' | '1S'): StatementRef[] =>
  MATH_DOMAINS.flatMap(([domain, , rows]) =>
    rows.flatMap((kinds, subArea) =>
      kinds.flatMap((counts, kind) => Array.from({ length: counts[lvl === '1F' ? 0 : 1] }, (_, index) => ({ group: `${MATH_REFERENCE(lvl)} / ${domain}`, code: `${SUB_AREAS[subArea]} / ${KINDS[kind]} / ${index + 1}` }))),
    ),
  )

const MATH_REFERENCE_LOCATE =
  'Each domain is one table for "niveau 1F en 1S" that runs on through the divisions headed "vervolg". The first column names the sub-area (A Notatie, taal en betekenis; B Met elkaar in verband brengen; C Gebruiken); the other columns hold the levels. A head row, or a row inside the table, names the level and the kind of knowledge of the cells below it: "Niveau 1F" with "Paraat hebben", then rows headed "Functioneel gebruiken" and "Weten waarom". A continuation table opens with the kind it continues, which is not always "Paraat hebben". A record is one paragraph that opens with a dash (–). The paragraphs after it without a dash are its examples or the rest of its line and belong to it, also where they stand in later rows or in two cells of half the width. A paragraph that opens with a bullet (•) is a sub-point of the dash statement above it. Each paragraph of a record is one line of its wording, so two examples under one statement stay apart. Two cells hold an image of a fraction (plaatje): it stays on the line of the paragraph before it and is written as its transcription from manifest/nl-additions.ts, marked as an image: [afbeelding: 3/4].'

const mathReferencePart = (lvl: '1F' | '1S', dataGroups: readonly (readonly [string, number])[], compared: string): LanePart => {
  const statements = mathReferenceStatements(lvl)
  const dataTotal = dataGroups.reduce((sum, [, count]) => sum + count, 0)
  return {
    name: `Besluit referentieniveaus Nederlandse taal en rekenen, bijlage 2, rekenen niveau ${lvl}`,
    source: REFERENCE_DECREE,
    checkRendition: DATA_REFERENCE,
    checkStrength: 'second-rendition',
    checkGranularity: `The open data: the ${dataTotal} goals of "Referentiekader Rekenen" at level ${lvl}, with their text in curriculum-basis. ${compared} Write down "wording differs", "granularity differs" or "not found in the rendition" as it is; the record follows the decree. A statement the data lacks is read again in the decree.`,
    expectedCount: statements.length,
    selection: { kind: 'legal', elements: MATH_DOMAINS.flatMap(([, elements]) => elements), locate: MATH_REFERENCE_LOCATE, statements },
    dataNodes: referenceNodes('RKR', lvl, dataGroups, 'The data also holds levels 2S and 3S, which the decree does not have.'),
  }
}

const REFERENCE_SKIPPED_LANGUAGE: readonly Skipped[] = [
  { code: 'Niveau 3F and Niveau 4F', reason: 'Not primary-school levels: artikel 2 of the decree sets 1F and 2F for primary school. The cells of these columns are not recorded.' },
  { code: '4.1 to 4.3, running lists', reason: 'The lists of terms and rules in sections 4.1, 4.2 and 4.3 carry no level. Only the two tables of section 4 do.' },
]

const REFERENCE_SKIPPED_MATH: readonly Skipped[] = [
  { code: 'Niveau 2F and Niveau 3F', reason: 'Not primary-school levels: artikel 3 of the decree sets 1F and 1S for primary school. Their tables ("niveau 2F en 3F") are not recorded.' },
  { code: 'Bijlage 3', reason: 'The arithmetic levels of vocational education (mbo), outside the levels of the pack.' },
]

// --- the four lanes ---------------------------------------------------------------------------------

const BUNDLE_NOTE = "SLO's bundle of July 2026 prints the core goals of 2026 too (Nederlands on PDF pages 12 to 14, rekenen en wiskunde on 18 to 20). It follows the law, not the open data, and is read for the frame only."
const SCHOOL_GOALS = 'These goals say what a school works towards by the end of groep 8. They are returned for every school age, labelled as end-of-primary goals.'
const COUNTED_2026 = (part: string, nodes: string): string =>
  `Core goals of 2026: parsed ${part} of annex 1 in the legal XML, one table per goal, and counted the goal sentences, the doelzin rows and the lettered items: ${nodes}. The primary-school nodes of the open data count the same.`
const COUNTED_REFERENCE = 'The decree is the only index of its own statements: the open data cuts them differently and lacks some, so for the reference levels the count is from the file the importer reads, and the reverse pass of the second check is what finds a statement the importer missed.'

const END_LANES: readonly Lane[] = [
  lane(
    'einde-po',
    'mathematics',
    [
      MATH_2026_PART,
      MATH_2006_PART,
      mathReferencePart(
        '1F',
        [
          ['RKR_1', 34],
          ['RKR_2', 15],
          ['RKR_3', 24],
          ['RKR_4', 9],
        ],
        'Against 83 statements in the decree: the data lacks one of domain 1 ("teller, noemer, breukstreep"), and 68 of its 82 goals match a statement of the decree exactly apart from capitals and closing punctuation.',
      ),
      mathReferencePart(
        '1S',
        [
          ['RKR_1', 19],
          ['RKR_2', 20],
          ['RKR_3', 22],
          ['RKR_4', 16],
        ],
        'Against 92 statements in the decree: the data lacks about ten statements of "C Gebruiken, Paraat hebben" in domain 1, joins five statements on measures into one, and in one statement prints an equals sign where the decree prints "≠". 21 statements of the decree have no exact counterpart in the data.',
      ),
    ],
    {
      title: 'End of primary school mathematics',
      regimes: ['2006', '2026'],
      countingMethod: `${COUNTED_2026('Onderdeel B', '9 goals, 15 doelzinnen and 66 items, 90')} Core goals of 2006: the numbered items 23 to 33 under "Rekenen/wiskunde" in the version in force until 31 July 2026: 11, the same as the nodes "PO Kerndoel 23" to "PO Kerndoel 33" of the open data. Reference levels: parsed the tables of annex 2 headed "niveau 1F en 1S", gave each column its level by the head cell, and counted the paragraphs that open with a dash: 83 at 1F (35, 15, 24 and 9 in the four domains) and 92 at 1S (29, 20, 27 and 16). ${COUNTED_REFERENCE}`,
      countIsFromImportFile: true,
      granularity: `Two standings and two sets of core goals in one lane, so each record takes its standing and its set from its source. ${GRANULARITY_2026} ${GRANULARITY_2006} ${STRUCK} ${REFERENCE_GRANULARITY} A reference-level record is one statement that opens with a dash in a level column, with the examples printed under it, each paragraph of the decree on its own line. Where the decree prints a fraction as an image, the wording holds the pack's transcription of the image in square brackets after the word "afbeelding", as in [afbeelding: 3/4]: the brackets are not the decree's.`,
      skipped: REFERENCE_SKIPPED_MATH,
      also: [BUNDLE],
      batches: (domains) => [
        batch('goals-2026-concepts', domains, (group) => group.includes('Domein: wiskundige concepten')),
        batch('goals-2026-ways-of-working-and-world', domains, (group) => group.includes('Domein: wiskundige denk-werkwijzen') || group.includes('Domein: wiskunde en de wereld')),
        batch('goals-2006', domains, startsWith(GOALS_2006)),
        batch('reference-1f-numbers-ratios', domains, startsWith(`${MATH_REFERENCE('1F')} / 1 `, `${MATH_REFERENCE('1F')} / 2 `)),
        batch('reference-1f-measuring-relations', domains, startsWith(`${MATH_REFERENCE('1F')} / 3 `, `${MATH_REFERENCE('1F')} / 4 `)),
        batch('reference-1s-numbers-ratios', domains, startsWith(`${MATH_REFERENCE('1S')} / 1 `, `${MATH_REFERENCE('1S')} / 2 `)),
        batch('reference-1s-measuring-relations', domains, startsWith(`${MATH_REFERENCE('1S')} / 3 `, `${MATH_REFERENCE('1S')} / 4 `)),
      ],
      notes: `${SCHOOL_GOALS} For primary school the decree sets arithmetic levels 1F and 1S; 2F is not a primary-school level. ${BUNDLE_NOTE}`,
    },
  ),
  lane(
    'einde-po',
    'reading-language',
    [
      DUTCH_2026_PART,
      DUTCH_2006_PART,
      languagePart(
        '1F',
        [
          ['RKT1', 40],
          ['RKT2', 28],
          ['RKT3', 18],
        ],
        'Against 75 paragraphs in the decree, one of them a joining sign that is no record: 45 of the 86 goals equal a paragraph, 35 are part of one, and 6 are not found because of typos in the data.',
      ),
      section4Part('1F'),
      languagePart(
        '2F',
        [
          ['RKT1', 53],
          ['RKT2', 32],
          ['RKT3', 18],
        ],
        'Against 81 paragraphs in the decree, one of them a joining sign that is no record: 46 of the 103 goals equal a paragraph, 46 are part of one, and 11 are not found.',
      ),
      section4Part('2F'),
    ],
    {
      title: 'End of primary school reading and language',
      regimes: ['2006', '2026'],
      countingMethod: `${COUNTED_2026('Onderdeel A', '9 goals, 19 doelzinnen and 86 items, 114')} Core goals of 2006: the numbered items 1 to 12 under "Nederlands" in the version in force until 31 July 2026: 12, the same as the nodes "PO Kerndoel 01" to "PO Kerndoel 12" of the open data. Reference levels, sections 1.1 to 3: parsed the 15 level tables of annex 1 and counted the non-empty paragraphs in each level column, 75 at 1F and 81 at 2F, less the one paragraph of each column that holds only a joining sign ("+", in 1.3 Spreken): 74 records at 1F and 80 at 2F. Section 4: the non-empty cells of table 1 (8 at 1F, 4 at 2F) and the rows of table 2 marked "+" (9 at 1F, 11 at 2F). ${COUNTED_REFERENCE}`,
      countIsFromImportFile: true,
      granularity: `Two standings and two sets of core goals in one lane, so each record takes its standing and its set from its source. ${GRANULARITY_2026} ${GRANULARITY_2006} ${STRUCK} ${REFERENCE_GRANULARITY} A reference-level record is one paragraph of a level cell in sections 1.1 to 3, and in section 4 one cell of the table of terms or one row of the table of difficulty; where such a cell or row label holds several paragraphs, each is a line of the wording. Four records of 1.3 Spreken are a reference to another section and no statement of their own: at 1F and at 2F the cell of "Woordgebruik en woordenschat" holds only "Zie Gesprekken", and the first record of the cell of "Vloeiendheid, verstaanbaarheid en grammaticale beheersing" reads "Zie Gesprekken +". Each says that the descriptors of that row in 1.1 Gesprekken hold for speaking too, and the "+" that the statements after it in the cell come on top of them. A paragraph that holds only that sign is not a record.`,
      skipped: REFERENCE_SKIPPED_LANGUAGE,
      also: [BUNDLE],
      batches: (domains) => [
        batch('goals-2026-1-to-3', domains, (group) => /Kerndoel [1-3]$/.test(group)),
        batch('goals-2026-4-to-7', domains, (group) => /Kerndoel [4-7]$/.test(group)),
        batch('goals-2026-8-to-9', domains, (group) => /Kerndoel [89]$/.test(group)),
        batch('goals-2006', domains, startsWith(GOALS_2006)),
        batch('reference-1f-speaking-listening', domains, startsWith(`${LANGUAGE_REFERENCE('1F')} / 1.`)),
        batch('reference-1f-reading-writing-terms', domains, startsWith(`${LANGUAGE_REFERENCE('1F')} / 2.`, `${LANGUAGE_REFERENCE('1F')} / 3 `, `${LANGUAGE_REFERENCE('1F')} / 4.`)),
        batch('reference-2f-speaking-listening', domains, startsWith(`${LANGUAGE_REFERENCE('2F')} / 1.`)),
        batch('reference-2f-reading-writing-terms', domains, startsWith(`${LANGUAGE_REFERENCE('2F')} / 2.`, `${LANGUAGE_REFERENCE('2F')} / 3 `, `${LANGUAGE_REFERENCE('2F')} / 4.`)),
      ],
      notes: `${SCHOOL_GOALS} For primary school the decree sets language levels 1F and 2F; there is no 1S for language. ${TESTKENNIS_NOTE} ${BUNDLE_NOTE}`,
    },
  ),
  lane('einde-po', 'science', [SCIENCE_2006_PART, SCIENCE_DRAFT_PART], {
    title: 'End of primary school science',
    regimes: ['2006', '2027-draft'],
    countingMethod:
      'Core goals of 2006: the numbered items 40 to 46 under the heading "Natuur en techniek" in the legal XML: 7, the same as the nodes "PO Kerndoel 40" to "PO Kerndoel 46" of the open data. Draft core goals: parsed amendment F of the consultation draft and counted, for Onderdeel F. Mens en natuur, 4 goals, 12 doelzinnen and 60 items, 76 nodes; without doelzin 31 B and its 5 items, 70. The open data counts the same 4, 12 and 60, and the bundle prints the same goals. Twice the draft prints an item letter alone on its line (32 B a, 32 C a): a count that misses those two finds 58 items.',
    countIsFromImportFile: false,
    granularity: `Two standings in one lane, so each record takes its standing and its set from its source: the 2006 goals are law, the others are a draft. ${GRANULARITY_2006} ${DRAFT_GRANULARITY} Kerndoel 31 is split: its sentence and doelzin A are here, doelzin B (lifestyle, health and illness) is in practical life and feelings.`,
    skipped: [
      { code: '34 to 39', reason: 'Mens en samenleving, in the same division of the 2006 decree: 34, 35, 37, 38 and 39 are recorded in practical life and feelings, and 36 is outside the four subjects.' },
      { code: '47 to 53', reason: `${OUTSIDE_THE_FOUR}: Ruimte (47 to 50, geography) and Tijd (51 to 53, history), in the same division of the 2006 decree.` },
      { code: '31 B', reason: 'Doelzin B of draft kerndoel 31 and its five items are recorded in practical life and feelings.' },
    ],
    batches: (domains) => [
      batch('goals-2006', domains, startsWith(GOALS_2006)),
      batch('draft-29-30', domains, (group) => /Kerndoel (?:29|30)$/.test(group)),
      batch('draft-31-32', domains, (group) => /Kerndoel (?:31|32)$/.test(group)),
    ],
    notes: `${SCHOOL_GOALS} No reference levels exist for this subject. The draft withdraws the 2006 decree, so when it enters into force the 2006 goals of this lane end. Five wordings of the draft differ from the open data in the goals recorded here and in practical life and feelings (the sentence of 29, doelzinnen 28 E, 30 C and 32 B, item 32 C d); the record follows the draft decree.`,
  }),
  lane('einde-po', 'practical-life-feelings', [PRACTICAL_2006_PART, PRACTICAL_DRAFT_PART], {
    title: 'End of primary school practical life and feelings',
    regimes: ['2006', '2027-draft'],
    countingMethod:
      'Core goals of 2006: the heading "Mens en samenleving" holds the numbered items 34 to 39; five are recorded here and 36 is left out. Draft core goals: parsed amendment F of the consultation draft and counted the nodes of the groups kept: kerndoel 19 (1 goal, 1 doelzin, 4 items: 6), kerndoel 20 (1, 2, 10: 13), kerndoel 28 (the goal, doelzinnen A, D and E, and 5, 5 and 4 items: 18) and doelzin 31 B (1 and 5 items: 6), 43. The open data has the same number of nodes for each of these groups.',
    countIsFromImportFile: false,
    granularity: `Two standings in one lane, so each record takes its standing and its set from its source: the 2006 goals are law, the others are a draft. ${GRANULARITY_2006} ${DRAFT_GRANULARITY} Two draft goals are split between this lane and elsewhere: of 28 the sentence and doelzinnen A, D and E are here and B and C are left out; of 31 only doelzin B is here, and its sentence and doelzin A are in science. A lookup by "Kerndoel 28" or "Kerndoel 31" has to show the parts in the other lane or say they are not recorded. Several doelzinnen are duties of the school (19 A, 28 D).`,
    skipped: [
      { code: '36', reason: `${OUTSIDE_THE_FOUR}: kerndoel 36 of 2006 is about the organisation of the state (civics).` },
      { code: '40 to 46', reason: 'Natuur en techniek, in the same division of the 2006 decree, is recorded in science.' },
      { code: '47 to 53', reason: `${OUTSIDE_THE_FOUR}: Ruimte (47 to 50, geography) and Tijd (51 to 53, history), in the same division of the 2006 decree.` },
      { code: '21', reason: `${OUTSIDE_THE_FOUR}: draft kerndoel 21 is about taking part in democracy and society (civics); it stands on the same pages as 19 and 20.` },
      { code: '28 B and 28 C', reason: `${OUTSIDE_THE_FOUR}: doelzinnen B (influence and power) and C (diversity in society) of draft kerndoel 28.` },
      { code: '31 and 31 A', reason: 'The sentence of draft kerndoel 31 and its doelzin A (organisms) are recorded in science.' },
    ],
    notes: `${SCHOOL_GOALS} No reference levels exist for this subject. Mapping: of the 2006 goals 34 is health, 35 self-reliance (social, traffic, consumer), 37 values and norms, 38 beliefs together with respect in matters of sexuality and diversity (one sentence, kept whole here), and 39 care for the environment. Of the draft: burgerschap 19 and 20 (social skills, living together), 28 A (money and consumer choices), 28 D (social and emotional development), 28 E (traffic) and 31 B (lifestyle, health and illness). The duty to teach citizenship in artikel 8 of the Wet op het primair onderwijs is a duty of the school, not a core goal, and is not recorded.`,
  }),
]

// ---------------------------------------------------------------------------
// Every Dutch lane, in the order of the levels and the subjects.
// ---------------------------------------------------------------------------

export const NL_LANES: readonly Lane[] = [...PEUTER_LANES, ...FASE_1_LANES, ...laterLanes(2), ...laterLanes(3), ...END_LANES]

// ---------------------------------------------------------------------------
// Official areas that are not recorded, per level.
// ---------------------------------------------------------------------------

const OUTSIDE = `${OUTSIDE_THE_FOUR}.`

const leftOut = (lvl: string, domain: string, reason: string): LeftOut => ({ jurisdiction: 'nl', level: lvl, domain, reason })

// The other inhoudslijn sets of the open data, with their goals per fase.
const OTHER_SETS: readonly (readonly [name: string, fase1: number, fase2: number, fase3: number])[] = [
  ['Kunstzinnige oriëntatie', 89, 105, 113],
  ['Bewegingsonderwijs', 43, 64, 65],
  ['Digitale geletterdheid', 76, 105, 104],
]

const perBandLeftOut = (fase: Fase): LeftOut[] => [
  ...LINES.flatMap((line) =>
    line.clusters
      .filter((row) => subjectOf(line, row) === null && goalsIn(row, fase) > 0)
      .map((row) => leftOut(level(fase), `Inhoudslijnen po, fase ${fase}: ${line.title} / ${row[1]} (${row[0]}), ${counted(goalsIn(row, fase), 'goal')} in the open data`, `${OUTSIDE_THE_FOUR} (${row[6]}).`)),
  ),
  ...OTHER_SETS.map((set) => leftOut(level(fase), `Inhoudslijnen po, fase ${fase}: ${set[0]}, the whole set, ${counted(set[fase], 'goal')} in the open data`, OUTSIDE)),
  leftOut(level(fase), `Inhoudslijn Engels, fase ${fase}`, `${OUTSIDE} It is published on slo.nl as a PDF only and is not in the open data.`),
  leftOut(level(fase), 'TULE: inhouden en activiteiten per kerndoel van 2006, per twee groepen', 'Examples per pair of groepen for the 2006 core goals, which the plan leaves for later. Not fetched.'),
]

const cardLeftOut = (lvl: string, fase1: boolean): LeftOut[] =>
  WORLD_CARD_ROWS.filter((row) => row[4] === null && staying(row, fase1).length > 0).map((row) => {
    const moved = movedOf(row, fase1)
    const kept = staying(row, fase1)
    return leftOut(
      lvl,
      `${fase1 ? WORLD_CARD_FASE_1 : WORLD_CARD_PEUTERS}: ${row[0]} / ${row[1]}, ${moved.length === 0 ? counted(kept.length, 'bullet') : `${positionsText(kept).toLowerCase()} of ${worldCount(row, fase1)}`}`,
      [`${OUTSIDE_THE_FOUR} (${row[5]}).`, ...moved.map((each) => `${positionsText(each.positions)} under this heading ${each.positions.length === 1 ? 'is a record' : 'are records'} of ${subjectName(each.subject)}.`)].join(' '),
    )
  })

export const NL_LEFT_OUT: readonly LeftOut[] = [
  ...['Kunstzinnige oriëntatie', 'Digitale geletterdheid', 'Bewegen'].map((area) => leftOut('peuters', `Inhoudskaart ${area}, peuters`, `${OUTSIDE} The card was not fetched.`)),
  ...cardLeftOut('peuters', false),
  leftOut(
    'peuters',
    'Motoriek and creative skills, named in artikel 5 of the Besluit basisvoorwaarden kwaliteit voorschoolse educatie and in artikel 2, onderdeel b of the Besluit kwaliteit kinderopvang',
    `${OUTSIDE} The sentences that name them are recorded whole, in practical life and feelings.`,
  ),
  ...['Engels', 'Kunstzinnige oriëntatie', 'Digitale geletterdheid', 'Bewegingsonderwijs'].map((area) => leftOut('fase-1', `Inhoudskaart ${area}, fase 1`, `${OUTSIDE} The card was not fetched.`)),
  ...cardLeftOut('fase-1', true),
  ...perBandLeftOut(1),
  ...perBandLeftOut(2),
  ...perBandLeftOut(3),
  leftOut('einde-po', 'Besluit vernieuwde kerndoelen WPO: Engels (kerndoelen 13 to 16)', OUTSIDE),
  leftOut('einde-po', 'Besluit vernieuwde kerndoelen WPO: Friese taal (kerndoelen 17 to 22)', `${OUTSIDE} Struck on 1 August 2026.`),
  leftOut('einde-po', 'Besluit vernieuwde kerndoelen WPO: Mens en samenleving, kerndoel 36', `${OUTSIDE_THE_FOUR} (civics).`),
  leftOut('einde-po', 'Besluit vernieuwde kerndoelen WPO: Ruimte (kerndoelen 47 to 50)', `${OUTSIDE_THE_FOUR} (geography).`),
  leftOut('einde-po', 'Besluit vernieuwde kerndoelen WPO: Tijd (kerndoelen 51 to 53)', `${OUTSIDE_THE_FOUR} (history).`),
  leftOut('einde-po', 'Besluit vernieuwde kerndoelen WPO: Kunstzinnige oriëntatie (kerndoelen 54 to 56)', OUTSIDE),
  leftOut('einde-po', 'Besluit vernieuwde kerndoelen WPO: Bewegingsonderwijs (kerndoelen 57 and 58)', OUTSIDE),
  leftOut('einde-po', 'Besluit vernieuwde kerndoelen WPO: the Preambule and the Karakteristiek of each area', 'Introductory prose, not goals.'),
  leftOut('einde-po', 'Besluit kerndoelen primair en speciaal onderwijs 2026: bijlagen 2, 3 and 4 (functionele kerndoelen)', 'Core goals for special education, outside the levels of the pack.'),
  leftOut('einde-po', 'Draft core goals: Burgerschap, kerndoel 21 (12 nodes)', `${OUTSIDE_THE_FOUR} (civics).`),
  leftOut('einde-po', 'Draft core goals: Digitale geletterdheid, kerndoelen 22 to 24 (55 nodes)', OUTSIDE),
  leftOut('einde-po', 'Draft core goals: Mens en maatschappij, kerndoelen 25 to 27 and doelzinnen 28 B and 28 C (63 nodes)', `${OUTSIDE_THE_FOUR} (society, geography, history, civics).`),
  leftOut('einde-po', 'Draft core goals: Moderne vreemde talen: Engels, kerndoelen 33 and 34 (25 nodes)', OUTSIDE),
  leftOut('einde-po', 'Draft core goals: Kunst en cultuur, kerndoelen 35 to 37 (42 nodes)', OUTSIDE),
  leftOut('einde-po', 'Draft core goals: Bewegen en sport, kerndoelen 38 to 40 (38 nodes)', OUTSIDE),
  leftOut('einde-po', 'Friese taal en cultuur; Nederlandse Gebarentaal', OUTSIDE),
  leftOut(
    'einde-po',
    'Referentieniveaus: Nederlandse taal 3F and 4F, rekenen 2F and 3F, and bijlage 3 of the decree',
    'Not primary-school levels: artikelen 2 and 3 of the Besluit referentieniveaus Nederlandse taal en rekenen set 1F and 2F for language and 1F and 1S for arithmetic.',
  ),
  leftOut('einde-po', 'Wet op het primair onderwijs, artikel 8, derde lid (the duty to teach citizenship)', 'A duty of the school and its board, not a core goal or a reference level.'),
  leftOut('einde-po', 'The illustrations "Te denken valt aan" in the open data of the core goals', "Examples by SLO that are in neither the law nor SLO's bundle. Not goals."),
]
