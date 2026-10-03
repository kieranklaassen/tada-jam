// What the Dutch sources do not say, or say wrongly, in the rendition a
// script reads: small lists the Dutch importer reads, as
// manifest/us-ca-additions.ts holds them for California. Each entry was seen
// on the official page or image it names, and says why it is there. The
// importer applies them, fails on an entry that no longer fits its source,
// and reports each; the lane's frame lists them.
//
//   NL_IMAGE_TRANSCRIPTIONS   what an image in the legal text prints
//   NL_GOAL_CORRECTIONS       goals the open data files under another cluster or fase, or lists twice
//   NL_RESTORED_STATEMENTS    statements the open data cuts short
//   NL_EXAMPLES               examples the open data leaves out, kept as accompanying text
//   NL_FRAME_TEXTS            where the official text is that holds for a whole lane (read by tools/frame-texts.ts)
//   NL_REMOVED_RECORDS        records that were imported once and are records no longer
//
// The goals a content-line PDF prints and the open data lacks are parts of
// their lanes in manifest/nl.ts, read by locator like any located statement.
//
// Dutch official text may be quoted with its source, so nothing here is
// capped in length. An entry still holds as little typed text as will do:
// the transcription of an image, an id, a heading, the bounding words of a
// span. Wording is read by script.

import { sourceId } from '../tools/schema.ts'

const source = (key: string): string => sourceId('nl', `nl-${key}`)

// ---------------------------------------------------------------------------
// Images in the legal text.
//
// The XML of the legislation repository holds a fraction that the decree
// prints stacked as an image (`plaatje`, with the file named in the `naam`
// of its `illustratie`). The image files are not part of the pinned XML:
// they were fetched by hand from the repository, beside the XML, into the
// store's incoming/nl/<folder>/, and are named by the publisher. Each was
// viewed, enlarged, on 2026-10-02; `sha256` is the hash of the file viewed.
//
// In a record's wording an image is written as imageMarker(text): the word
// "afbeelding", a colon and the transcription, in square brackets:
//
//   [afbeelding: (1/3)]
//
// The brackets and the word say that the decree prints an image there and
// that what follows the colon is the pack's transcription of it, not text of
// the decree. A stacked fraction is written numerator, slash, denominator, a
// mixed number with a space between the whole and the fraction, and brackets
// the image itself prints are kept: the form the curriculum institute's open
// data uses for the same four fractions. An image with no entry here stays
// IMAGE_PLACEHOLDER, "[afbeelding]", and the importer reports it.
// ---------------------------------------------------------------------------

export function imageMarker(text: string): string {
  return `[afbeelding: ${text}]`
}

export interface ImageTranscription {
  // What the image prints, in the form described above.
  text: string
  // The sha256 of the image file that was viewed. The importer compares it
  // with the file in the store's incoming folder when that file is there.
  sha256: string
  // The lane the statement is in, as <level>/<subject>, and the statement:
  // its group and code in the manifest. A frame is generated without the
  // XML, so it reads here which statements hold a transcribed image; the
  // importer fails when the image stands in another statement.
  lane: string
  group: string
  code: string
}

// By the id of the regulation's source record, then by the name of the image file.
export type ImageTranscriptions = Readonly<Record<string, Readonly<Record<string, ImageTranscription>>>>

const ITEM_10_B_A = { lane: 'einde-po/mathematics', group: 'Kerndoelen 2026 / Onderdeel B Rekenen en wiskunde / Domein: wiskundige concepten / Kerndoel 10', code: '10 B a' } as const
const NUMBERS_1F = { lane: 'einde-po/mathematics', group: 'Referentieniveau 1F rekenen / 1 Getallen' } as const

export const NL_IMAGE_TRANSCRIPTIONS: ImageTranscriptions = {
  // Item 10 B a names four kinds of fraction, each with an example in brackets.
  [source('wet-kerndoelen-po-2026')]: {
    '274440.png': { text: '(1/3)', sha256: 'fbeeecdcc89bba17005f74da2d833ba4aa2d3354d906cf7ec9d907c9595ec8f5', ...ITEM_10_B_A },
    '274441.png': { text: '(2/5)', sha256: '170f285da93b06759335ad1790a15b38145107b8c8414984e7c57b791a43ecaf', ...ITEM_10_B_A },
    '274442.png': { text: '(1 1/2)', sha256: '96d847e976737e2b0036cdb49052947f85b64b3ae3ff18ca7ec44e8f83790655', ...ITEM_10_B_A },
    '274443.png': { text: '(12/4)', sha256: '0cc58b73de4c65d3dcae86673f208f1a04a854181969bfc270ffff59befc7e2d', ...ITEM_10_B_A },
  },
  // Two cells of the table for domain 1 at 1F: a fraction with a horizontal bar, without brackets.
  [source('wet-referentieniveaus-besluit')]: {
    '246976.png': { text: '1/100', sha256: '39c733fb8c2fede434fe155b466fb4fbaf546be95dca79d446990e77143bf447', ...NUMBERS_1F, code: 'C Gebruiken / Paraat hebben / 11' },
    '246977.png': { text: '3/4', sha256: 'e0d8601c1fd1656fa222a0f1610e74359d6c90a69083175b98c499955f03de02', ...NUMBERS_1F, code: 'A Notatie, taal en betekenis / Paraat hebben / 4' },
  },
}

// ---------------------------------------------------------------------------
// Goals the open data misfiles.
//
// The per-band goals are read from the curriculum institute's open data: a
// cluster lists goal-at-level objects, and each of those links to one fase.
// For the mathematics line Bewerkingen the lists are wrong, and have been for
// years: the ten goals of the cluster on multiplying and dividing with
// decimal numbers (rw/bew/4) are listed under the cluster before it
// (rw/bew/3) and all linked to fase 3, although the first of them is a fase 2
// goal; and rw/bew/4 itself is filled with copies of the six goals of the
// cluster after it (rw/bew/5). Two things the institute published itself say
// so, and agree with each other: its content-line PDF for the line
// (nl-slo-inhoudslijn-rw-bewerkingen, pages 4 and 5) and the goal numbers in
// the data (`aanbodid` on each goal: RW.2.042 and RW.3-055 to RW.3-063 for
// the ten, and for each copy the number of its twin). Read on 2026-10-02.
//
// The importer follows the data and applies these corrections on top, by the
// id of the goal-at-level object:
//
//   regroup   the record takes the group (title, code scope, batch) of the
//             cluster the PDF prints it under
//   relevel   the record is filed in the lane of the fase the PDF prints it in
//   skip      the goal is a copy of another and is no record
//
// A record keeps the code the data gives it, and its locator says where the
// data lists it. The importer fails on an id that is not in the data, on a
// code, a lane or a level other than the one listed here, on a copy that no
// longer has the text of its twin, and on a correction the data no longer
// needs.
// ---------------------------------------------------------------------------

export type GoalCorrection =
  // The prefix of the cluster whose group the record takes.
  | { kind: 'regroup'; cluster: string; reason: string }
  // The title of the level the goal belongs to, as niveaus.json has it, and of the level the data links it to.
  | { kind: 'relevel'; level: string; from: string; reason: string }
  // The id of the goal-at-level object this one is a copy of.
  | { kind: 'skip'; copyOf: string; reason: string }

export interface CorrectedGoal {
  // The code the data gives the goal. It is what a frame names the goal by.
  code: string
  // The lane the record is in once corrected, as <level>/<subject>; for a
  // skipped goal, the lane it would have been in. A frame is generated
  // without the data, so it reads here which goals of its lane are corrected.
  lane: string
  corrections: readonly GoalCorrection[]
}

// By the id of the source record of the repository a part walks, then by the id of the goal-at-level object.
export type GoalCorrections = Readonly<Record<string, Readonly<Record<string, CorrectedGoal>>>>

const DECIMALS = 'rw/bew/4'
const REGROUPED =
  'The open data lists this goal under the cluster of whole numbers (rw/bew/3). The content-line PDF prints it under "Vermenigvuldigen en delen met decimale getallen" (rw/bew/4), and its goal number in the data runs on after the last goal of the whole-number cluster.'
const RELEVELED = 'The open data links this goal to fase 3. The content-line PDF prints it in the fase 2 column (page 4), and its goal number in the data, RW.2.042, is a fase 2 number.'
const COPY =
  'The open data fills the cluster "Vermenigvuldigen en delen met decimale getallen" (rw/bew/4) with copies of the goals of the cluster after it, "Combinaties van en relaties tussen bewerkingen" (rw/bew/5): the same text and the same goal number. The content-line PDF prints each once, under that cluster. The copy is no record; its twin is.'

const regrouped = (code: string): CorrectedGoal => ({ code, lane: 'fase-3/mathematics', corrections: [{ kind: 'regroup', cluster: DECIMALS, reason: REGROUPED }] })
const copy = (code: string, fase: 2 | 3, copyOf: string): CorrectedGoal => ({ code, lane: `fase-${fase}/mathematics`, corrections: [{ kind: 'skip', copyOf, reason: COPY }] })

export const NL_GOAL_CORRECTIONS: GoalCorrections = {
  [source('slo-curriculum-inhoudslijnen')]: {
    // The ten goals of rw/bew/4, as the data codes them: rw/bew/3/12 to rw/bew/3/21.
    '541b0414-2bb9-4945-983e-0d5dbad319c5': {
      code: 'rw/bew/3/12/fase3',
      lane: 'fase-2/mathematics',
      corrections: [
        { kind: 'regroup', cluster: DECIMALS, reason: REGROUPED },
        { kind: 'relevel', level: 'fase 2', from: 'fase 3', reason: RELEVELED },
      ],
    },
    'c991917c-5bae-4294-b9e3-517405da3761': regrouped('rw/bew/3/13/fase3'),
    '20fba8fe-4268-41be-952e-be6ac9b8f8b0': regrouped('rw/bew/3/14/fase3'),
    'a581da08-4a04-4f9d-9fb0-559a70e4133f': regrouped('rw/bew/3/15/fase3'),
    '0ba6dda0-36a7-4f04-9668-71cf649da679': regrouped('rw/bew/3/16/fase3'),
    '3240a1af-5e18-49f9-bcdd-ece88d200a57': regrouped('rw/bew/3/17/fase3'),
    'ea60d3ca-5f63-4b32-bcc3-a206cf444953': regrouped('rw/bew/3/18/fase3'),
    'd77369be-3ea6-4ef2-b0ed-5fd41f52b729': regrouped('rw/bew/3/19/fase3'),
    '240bba6f-3572-4f5c-b32d-caaaa2e17f27': regrouped('rw/bew/3/20/fase3'),
    'd1ae62e5-a48b-4c10-adb6-b2c3378f6a48': regrouped('rw/bew/3/21/fase3'),
    // The six copies in rw/bew/4, each with its twin in rw/bew/5.
    'f5f61cf1-86bb-477a-9851-71071c725473': copy('rw/bew/4/01/fase2', 2, 'b3ac52c2-fc7b-4ff8-8974-3f3ed13c1bae'),
    '3b6aa669-025c-451b-be5d-4ecd273846c5': copy('rw/bew/4/02/fase2', 2, '5b71873d-7559-4629-a6dc-a6677194367f'),
    '1d7d8086-015b-48c3-9418-da4f9b7045c1': copy('rw/bew/4/01/fase3', 3, '447017ba-ef75-4f32-a133-3038b5f704d0'),
    'f854f0f2-92d8-407a-9e18-1fa78d744d9b': copy('rw/bew/4/02/fase3', 3, '73969ed1-cf6e-4866-a090-b48790b8eba9'),
    'dc2123d2-f368-4430-ada3-3154c2bba185': copy('rw/bew/4/03/fase3', 3, '6a70101b-9c46-43fc-a973-795337ac4bb4'),
    'a50f6403-794a-4bba-8c6d-275f43b281c4': copy('rw/bew/4/04/fase3', 3, '92db282e-6e7f-462d-baca-591e094abe37'),
  },
}

// ---------------------------------------------------------------------------
// Statements the open data cuts short, and examples it leaves out.
//
// For mathematics the content-line PDFs print an example under about a third
// of the goals, in italics and in brackets ("(bijv. ...)"), and the open data
// leaves every one of them out. Mostly the example closes the goal and
// nothing of the goal is lost. Where it stands inside the sentence, or the
// sentence goes on after it, the data in eight goals also drops what follows
// the example, or a bracketed part of the statement itself that is set
// upright: the statement in the data is then not the statement the institute
// printed. Read on 2026-10-02 with the type styles of the PDFs
// (tools/content-lines.ts), goal by goal.
//
// Restored statements. For the goals listed here the importer takes the
// wording from the PDF: the statement as the column of the goal's fase
// prints it from the page named, found as the one statement there that opens
// with the wording of the data. The wording ends where the upright text of
// the statement ends. An example in italics inside the sentence stays in
// it, since the sentence cannot be cut there (rw/mk/2/02 and rw/mk/2/05 of
// fase 1, rw/bew/3/06 and rw/m/7/03 of fase 2, rw/verh/2/05 of fase 3); an
// example in italics that closes the statement is no part of the wording and
// becomes accompanying text, as for any other goal (rw/bew/7/05 of fase 3).
// Nothing of the statement is typed here. The record's source line cites
// the PDF, with both pages for a statement that runs on overleaf (`through`).
// The importer fails when the data's wording no longer opens exactly one
// statement on that page, when the statement holds no more than the data,
// or when it ends on another page than listed here.
//
// Examples. For every goal of a part whose check rendition is listed under
// `italic`, the importer joins the goal to the statement the PDF prints for
// it, by its text, and attaches what the PDF sets in italics with it as the
// record's accompanying text: the example alone where it closes the goal,
// the goal as printed where an example stands inside its sentence. The
// wording, and its hash, stay the data's. A goal that cannot be joined stops
// the import. `plain` lists the goals of other areas whose example the PDF
// prints upright, in brackets after the statement, and the data leaves out:
// there what the PDF prints after the wording of the data is attached, and
// has to be one bracketed group.
// ---------------------------------------------------------------------------

export interface RestoredStatement {
  // The code the data gives the goal, and the lane its record is in, as for a corrected goal.
  code: string
  lane: string
  // The page of the part's content-line PDF, its check rendition, that prints the statement: where it opens.
  page: number
  // The page its last words stand on, for a statement that runs on overleaf.
  through?: number
  reason: string
}

// By the id of the source record of the repository a part walks, then by the id of the goal-at-level object.
export type RestoredStatements = Readonly<Record<string, Readonly<Record<string, RestoredStatement>>>>

const CUT_AFTER_EXAMPLE = 'The open data stops where the first example of the PDF stands, and lacks the statement text printed after it.'
const CUT_BRACKETS = 'The open data lacks the bracketed part that closes the statement in the PDF. It is set upright there, as the statement is, and not in italics, as the examples of this line are.'

const restored = (code: string, fase: 1 | 2 | 3, page: number, reason: string, through?: number): RestoredStatement => ({ code, lane: `fase-${fase}/mathematics`, page, ...(through === undefined ? {} : { through }), reason })

export const NL_RESTORED_STATEMENTS: RestoredStatements = {
  [source('slo-curriculum-inhoudslijnen')]: {
    '2788a108-6286-4668-9586-0c4aeacf49d7': restored('rw/mk/2/02/fase1', 1, 1, CUT_AFTER_EXAMPLE),
    '1c301e36-a177-481f-8203-99a8b7e2bfec': restored('rw/mk/2/05/fase1', 1, 1, CUT_AFTER_EXAMPLE),
    '466e5cde-a0f4-4fde-8d44-4b669dc01ff6': restored('rw/gb/2/01/fase2', 2, 1, CUT_BRACKETS),
    'fa6d085d-5b18-44e6-a7f3-ae085c51e140': restored('rw/bew/3/06/fase2', 2, 3, CUT_AFTER_EXAMPLE),
    'bfc77bc3-d6b3-478e-85cb-e0cfbfd0201e': restored('rw/m/7/03/fase2', 2, 5, CUT_AFTER_EXAMPLE),
    '24698558-91f0-4984-8b17-a9192b468088': restored('rw/bew/3/06/fase3', 3, 3, CUT_BRACKETS),
    '12252d19-3eb7-421c-9fe5-dcca1e1cead9': restored('rw/bew/7/05/fase3', 3, 7, 'The open data stops before the clause that follows the first comma of the statement in the PDF, and lacks that clause and the example after it.'),
    // Opens at the foot of page 1 and ends at the top of page 2.
    'deda9242-1cca-4c50-ae9c-cb25a3324b24': restored('rw/verh/2/05/fase3', 3, 1, CUT_AFTER_EXAMPLE, 2),
  },
}

export interface PlainExample {
  code: string
  lane: string
  page: number
  reason: string
}

export interface Examples {
  // The ids of the source records of the content-line PDFs whose italic text under a goal is the goal's example.
  italic: readonly string[]
  // By the id of the source record of the repository a part walks, then by the id of the goal-at-level object.
  plain: Readonly<Record<string, Readonly<Record<string, PlainExample>>>>
}

const PLAIN = 'The PDF prints an example in brackets after the statement, upright as all of this area is set, and the open data leaves it out here, although it keeps the examples of the other goals of the area.'

export const NL_EXAMPLES: Examples = {
  italic: ['getalbegrip', 'bewerkingen', 'verhoudingen', 'meten', 'meetkunde', 'verbanden'].map((line) => source(`slo-inhoudslijn-rw-${line}`)),
  plain: {
    [source('slo-curriculum-inhoudslijnen')]: {
      '3bf3b862-5cae-4669-9295-18aa1ad8c771': { code: 'ojw/ds/1/02/fase1', lane: 'fase-1/practical-life-feelings', page: 1, reason: PLAIN },
      'e603fbd1-df4b-4ef6-a2bc-4811ab860b08': { code: 'ojw/pdm/2/04/fase3', lane: 'fase-3/practical-life-feelings', page: 3, reason: PLAIN },
    },
  },
}

// ---------------------------------------------------------------------------
// Official text that belongs to a whole lane and to no single statement.
//
// A record is one statement. The sources also print text that holds for a
// whole column, cluster or card: what the texts of a fase are like, the terms
// and the spelling categories per pair of groepen, the sentence over the
// columns of a card that every bullet continues, the note that says which
// groepen a fase is. No record carries it and a designer needs it, so each
// lane's frame quotes it. This list says where each such text is; the text is
// read there by script (tools/frame-texts.ts) and none of it is typed here
// beyond a heading, a label or the bounding words of a span.
//
// Looked for on 2026-10-02 in the eight cards and in every content-line PDF
// of the three areas, on the page images and in the text read by script:
//
//   - text features ("tekstkenmerken") stand in two files only: Mondelinge
//     taalvaardigheid, over the goals of Luisteren (page 2), and Lezen, over
//     the goals of zakelijke teksten (page 1) and of fictie (page 3). The
//     PDF of Schrijven prints none, and no PDF of rekenen-wiskunde or of
//     oriëntatie op jezelf en de wereld does.
//   - a sentence over the columns that every bullet continues stands on two
//     cards only, both for peuters: rekenen-wiskunde and oriëntatie op jezelf
//     en de wereld. The two other peuter cards and the four fase 1 cards
//     print a title and their heading bars, and no such sentence.
//   - the note that says which groepen a fase is stands on the last page of
//     the PDFs of Mondelinge taalvaardigheid, Lezen and Schrijven, in the same
//     words. The PDFs of rekenen-wiskunde and of oriëntatie op jezelf en de
//     wereld print no such note.
//   - the PDF of Taalbeschouwing is a table by pairs of groepen, not by fase:
//     a list of terms and a list of spelling categories and rules, with a
//     note on why. Fase 1 is groep 1 to 3, fase 2 groep 4 to 6 and fase 3
//     groep 7 and 8, so the column groep 3-4 is quoted in the frames of fase
//     1 and of fase 2. Its column groep 1-2 is empty in the table of spelling.
//
//   - the five PDFs of oriëntatie op jezelf en de wereld underline terms in
//     their goals and close with a note that says what the underlining
//     refers to: another document of the institute, which is not a source of
//     the pack. Four print the note in the same words; the PDF of Jezelf en
//     de ander prints it with another date. The frames of the science and
//     the practical-life lanes of fase 1 to 3 quote the note, and list the
//     goals that hold an underlined term (tools/frame-texts.ts reads the
//     underlines in the drawing instructions of the PDF).
//   - in the table of spelling of Taalbeschouwing the note under the heading
//     classes items in italics at 2F and items in bold at 3F. The bold is
//     drawn by stroking the letters, which the text layer does not show, so
//     the bold items are listed here (BOLD_SPELLING), as seen on the page
//     images of pages 2 and 3 and in the drawing instructions of the PDF.
//     They are not all in the column groep 7-8: two stand in groep 5-6.
//
// For the reference levels for Dutch, section 4 of annex 1 of the decree
// prints running text beside its two tables: what the list of terms is for,
// a list of grammatical terms and a rule, what language care is, the
// categories of spelling and punctuation without a level, the five classes
// of difficulty, and the captions of the tables, the second of which says
// what mastery means. The cells of the tables are records; the frame quotes
// the rest, read from the legal XML.
//
// Not quoted: the closing note that every content-line PDF prints in the
// column of labels (what content lines are for).
// ---------------------------------------------------------------------------

export type FrameTextWhere =
  // A stretch of one page of a source by its bounding words: a span as a lane's locator holds one.
  | { kind: 'span'; source: string; page: number; column?: number; first: string; last: string; firstOccurrence?: number; lastOccurrence?: number }
  // In a content-line PDF: what the column prints under this heading bar and
  // this line over the columns, that is no goal. `asPrinted` keeps the lines
  // of the page and marks what is set in italics.
  | { kind: 'block'; source: string; cluster: string; section: string; column: number; asPrinted?: true }
  // In a content-line PDF: the one loose text that opens with these
  // characters. `alsoIn` names the other PDFs that print the same note, word
  // for word: the reader checks that each does.
  | { kind: 'note'; source: string; opens: string; alsoIn?: readonly string[] }
  // In a regulation: the running text of the element with this path (its
  // headings, paragraphs and lists; each table by its caption alone). `place`
  // says where that is, as a frame cites it.
  | { kind: 'legal'; source: string; path: string; place: string }

export interface FrameText {
  // The lanes whose frames quote it, as <level>/<subject>.
  lanes: readonly string[]
  // What it is, in the pack's words: a heading and a sentence or two.
  title: string
  about: string
  // Where it is. `source` is the slug of a source record, as in a locator.
  where: FrameTextWhere
  // Items of the text that the page sets in bold. The text layer does not
  // tell bold from light, so they are listed here, as seen on the page; the
  // reader fails on one that is not in the text it reads.
  bold?: readonly string[]
}

const FASES = [1, 2, 3] as const
const reading = (fase: number): string => `fase-${fase}/reading-language`

const ORAL = 'nl-slo-inhoudslijn-ne-mondeling'
const READING = 'nl-slo-inhoudslijn-ne-lezen'
const TERMS = 'nl-slo-inhoudslijn-ne-taalbeschouwing'

const featureTexts = (source: string, cluster: string, section: string, title: string, about: string): FrameText[] =>
  FASES.map((fase) => ({ lanes: [reading(fase)], title: `${title}, fase ${fase}`, about, where: { kind: 'block', source, cluster, section, column: fase } }))

// The pairs of groepen of the table of terms and spelling, with the lanes each is quoted in.
const PAIRS: readonly (readonly [column: number, pair: string, fases: readonly number[]])[] = [
  [1, 'groep 1-2', [1]],
  [2, 'groep 3-4', [1, 2]],
  [3, 'groep 5-6', [2]],
  [4, 'groep 7-8', [3]],
]
const SPANS_TWO = 'Groep 3-4 is the last year of fase 1 and the first of fase 2, so this column is quoted in the frames of both.'
const pairNote = (pair: string): string => (pair === 'groep 3-4' ? ` ${SPANS_TWO}` : '')

// The items of the table of spelling that the page sets in bold, by pair of groepen.
const BOLD_SPELLING: Readonly<Record<string, readonly string[]>> = {
  'groep 3-4': [],
  'groep 5-6': ['komma', 'dubbele punt'],
  'groep 7-8': [
    'trema (ruïne, skiën, poriën, knieën, zeeën), koppelteken (zonne-energie)',
    'tussenklank -s of -e(n) (stadsdeel)',
    'aaneenschrijven of los schrijven (kleinkind/klein kind, tenslotte/ ten slotte)',
    'persoonsvorm: tegenwoordige tijd 2e/3e persoon achter persoonsvorm (word je, wordt je broer);',
    'met prefix homofoon met voltooid deelwoord (beoordeelt/beoordeeld)',
    'voltooid deelwoord, homofone gevallen (verhuist, verhuisd)',
  ],
}
const boldNote = (pair: string): string => {
  const items = BOLD_SPELLING[pair] ?? []
  if (items.length === 0) return 'On the page no item of this column is bold.'
  return `On the page ${items.length === 1 ? 'one item' : `${items.length} items`} of this column ${items.length === 1 ? 'is' : 'are'} bold: ${items.map((item) => `"${item}"`).join('; ')}.`
}

// The note on underlined terms that the PDFs of oriëntatie op jezelf en de wereld close with.
const UNDERLINED = 'The note on underlined terms'
const UNDERLINED_ABOUT =
  'The PDFs of this area underline terms in their goals and close with this note, which says what the underlining refers to. The document it names, the "Uitwerking kennisonderwerpen" of the institute, is not a source of the pack: no record and no frame holds what it says about a term. The goals that hold an underlined term are listed in this section, PDF by PDF.'
const WORLD_LINES = { space: 'nl-slo-inhoudslijn-ojw-ruimte', nature: 'nl-slo-inhoudslijn-ojw-planten-dieren-mens', physics: 'nl-slo-inhoudslijn-ojw-natuurkunde-techniek', society: 'nl-slo-inhoudslijn-ojw-samenleving', self: 'nl-slo-inhoudslijn-ojw-jezelf' } as const

// Section 4 of annex 1 of the decree on the reference levels: what it prints beside the cells of its two tables.
const DECREE = 'nl-wet-referentieniveaus-besluit'
const SECTION_4_ROWS = 'The cells of the table are records of this lane, at 1F and at 2F, and are not quoted: the table stands here by its caption. A heading stands at the margin, and a list item after its number.'
const section4 = (number: string, title: string, about: string): FrameText => ({
  lanes: ['einde-po/reading-language'],
  title,
  about,
  where: { kind: 'legal', source: DECREE, path: `/Bijlage1/Divisie4/Divisie${number}`, place: `bijlage 1, section ${number}` },
})

const LEAD_IN = 'The card prints this sentence under its title, over all five columns. Every bullet of the card continues it: a record of the card holds the bullet alone.'

export const NL_FRAME_TEXTS: readonly FrameText[] = [
  ...featureTexts(
    ORAL,
    'Luisteren',
    'tekstkenmerken',
    'What the texts are like that a child listens to',
    'The PDF of the line Mondelinge taalvaardigheid prints this under the heading "tekstkenmerken", over the goals of the cluster Luisteren: the kinds of text, how long they are, and how they are built. It is no goal and the open data has none of it. Each item stands after the label of its row.',
  ),
  ...featureTexts(
    READING,
    'Oriëntatie op en lezen van zakelijke teksten',
    'teksten en tekstkenmerken',
    'What the informative texts are like that a child reads',
    'The PDF of the line Lezen prints this under the heading "teksten en tekstkenmerken", after the goals of the cluster "Oriëntatie op en lezen van zakelijke teksten": the subjects, the density, the structure and the style of the texts of this fase. It is no goal and the open data has none of it. Each item stands after the label of its row.',
  ),
  ...featureTexts(
    READING,
    'Oriëntatie op en lezen van fictie',
    'teksten en tekstkenmerken',
    'What the fiction is like that a child reads',
    'The PDF of the line Lezen prints this under the heading "teksten en tekstkenmerken", after the goals of the cluster "Oriëntatie op en lezen van fictie": the subjects and the structure of the stories and poems of this fase. It is no goal and the open data has none of it. Each item stands after the label of its row.',
  ),
  ...PAIRS.map(
    ([column, pair, fases]): FrameText => ({
      lanes: fases.map(reading),
      title: `Terms about language offered from ${pair}`,
      about: `The PDF of the line Taalbeschouwing prints a table of terms by pair of groepen, not by fase, and says a term is offered from the pair it stands under. This is the column ${pair}, row by row after the label of each row, with the lines of the page as printed. A row the column leaves empty is left out.${pairNote(pair)}`,
      where: { kind: 'block', source: TERMS, cluster: 'Begrippenlijst*', section: 'begrippen', column, asPrinted: true },
    }),
  ),
  ...PAIRS.filter(([, pair]) => pair !== 'groep 1-2').map(
    ([column, pair, fases]): FrameText => ({
      lanes: fases.map(reading),
      title: `Spelling categories and rules offered from ${pair}`,
      about: `The PDF of the line Taalbeschouwing prints a table of spelling categories and rules by pair of groepen, and says each is offered from the pair it stands under and mastered almost without thought two pairs later. This is the column ${pair}, row by row after the label of each row, with the lines of the page as printed; the column groep 1-2 of this table is empty. An item between underscores is set in italics in the PDF, which the note under the heading of the table classes at reference level 2F ("items cursief zijn ingedeeld op 2F; items vet zijn ingedeeld op 3F"). The same note classes items in bold at 3F: the text layer does not tell bold from light, so the quote cannot mark them. ${boldNote(pair)}${pairNote(pair)}`,
      where: { kind: 'block', source: TERMS, cluster: 'Taalverzorging*', section: 'spellingcategorieën en -regels', column, asPrinted: true },
      ...((BOLD_SPELLING[pair] ?? []).length === 0 ? {} : { bold: BOLD_SPELLING[pair]! }),
    }),
  ),
  {
    lanes: FASES.map(reading),
    title: 'Why the terms and the spelling are listed by pair of groepen',
    about: 'The note the PDF of the line Taalbeschouwing prints under its two tables.',
    where: { kind: 'note', source: TERMS, opens: '*' },
  },
  {
    lanes: FASES.map(reading),
    title: 'Which groepen a fase is',
    about: 'The note on the last page of the PDF of the line Mondelinge taalvaardigheid; the PDFs of Lezen and Schrijven print the same note. The PDFs of the other two areas print none.',
    where: { kind: 'note', source: ORAL, opens: '*' },
  },
  {
    lanes: FASES.map((fase) => `fase-${fase}/practical-life-feelings`),
    title: 'The note on the cluster "Relaties en seksualiteit"',
    about: 'The PDF of the line Jezelf en de ander marks the heading of this cluster with an asterisk and prints this note under its last page. It holds for every goal of the cluster (ojw/ja/2).',
    where: { kind: 'note', source: 'nl-slo-inhoudslijn-ojw-jezelf', opens: '*' },
  },
  {
    lanes: FASES.map((fase) => `fase-${fase}/science`),
    title: UNDERLINED,
    about: `${UNDERLINED_ABOUT} Quoted from the PDF of the line Verschijnselen uit natuurkunde en techniek; the PDFs of De ruimte om je heen and of Planten, dieren en de mens, the other two this lane is checked against, print the same note.`,
    where: { kind: 'note', source: WORLD_LINES.physics, opens: 'NB', alsoIn: [WORLD_LINES.space, WORLD_LINES.nature] },
  },
  {
    lanes: FASES.map((fase) => `fase-${fase}/practical-life-feelings`),
    title: UNDERLINED,
    about: `${UNDERLINED_ABOUT} Quoted from the PDF of the line De samenleving; the PDFs of De ruimte om je heen and of Planten, dieren en de mens print the same note.`,
    where: { kind: 'note', source: WORLD_LINES.society, opens: 'NB', alsoIn: [WORLD_LINES.space, WORLD_LINES.nature] },
  },
  {
    lanes: FASES.map((fase) => `fase-${fase}/practical-life-feelings`),
    title: `${UNDERLINED}, as the line Jezelf en de ander prints it`,
    about: 'The PDF of the line Jezelf en de ander prints the same note with another date.',
    where: { kind: 'note', source: WORLD_LINES.self, opens: 'NB' },
  },
  section4(
    '4.1',
    'What the decree prints with its list of terms (section 4.1)',
    `Section 4.1 Begrippenlijst of annex 1: the two paragraphs that introduce the list of terms, the caption of table 1, and under the table a list of grammatical terms for the spelling of verbs and a rule, which carry no level. ${SECTION_4_ROWS}`,
  ),
  section4('4.2', 'What the decree says language care is (section 4.2)', 'Section 4.2 Taalverzorging of annex 1: two paragraphs, which say that the levels of section 4 mean full mastery and are an end point. They hold for every record of table 2.'),
  section4(
    '4.3',
    'The categories of spelling and punctuation, without a level (section 4.3)',
    'Section 4.3 Niveaubeschrijvingen of annex 1: the running lists of the categories of spelling (4.3.1) and of punctuation (4.3.2). They carry no level and are no records; table 2 of section 4.4 says at which level each kind is mastered. A heading stands at the margin, and a list item after its number.',
  ),
  section4(
    '4.4',
    'What the decree says about difficulty, and what mastery means (section 4.4)',
    `Section 4.4 Moeilijkheid of annex 1: the paragraph and the five classes of spelling problems that come before table 2, and the caption of table 2, which says what mastery means for every row of it. The footnote of the first paragraph follows it on a line of its own, after its number in square brackets; the brackets are not the decree's. ${SECTION_4_ROWS}`,
  ),
  {
    lanes: ['peuters/mathematics'],
    title: 'The sentence every bullet of the card continues',
    about: LEAD_IN,
    where: { kind: 'span', source: 'nl-slo-inhoudskaart-rekenen-prefase', page: 1, first: 'Kinderen doen in', last: 'ervaringen op over' },
  },
  {
    lanes: ['peuters/science', 'peuters/practical-life-feelings'],
    title: 'The sentence every bullet of the card continues',
    about: `${LEAD_IN} The card serves both lanes.`,
    where: { kind: 'span', source: 'nl-slo-inhoudskaart-ojw-prefase', page: 1, first: 'Kinderen doen in', last: 'ervaringen op over' },
  },
]

// ---------------------------------------------------------------------------
// Records that were imported once and are records no longer.
//
// An importer writes files and never deletes one, so a record that a later
// reading of its source no longer gives stays behind as a file no part of
// its lane gives. The sweep that follows the import (sweepOrphans in
// tools/import-netherlands.ts) reports every such file, and removes it only
// when it is listed here, by lane and slug, with the reason. A listed record
// that a part still gives stops the sweep. A skipped goal of the open data
// (NL_GOAL_CORRECTIONS above) is removed the same way without being listed
// twice, and so is the file a releveled goal left in the lane of its old
// level, once its new lane holds the record.
// ---------------------------------------------------------------------------

export interface RemovedRecord {
  // <level>/<subject>
  lane: string
  // The slug of the record: the name of its file without ".md".
  slug: string
  reason: string
}

const JOINING_SIGN =
  'The paragraph holds only the joining sign "+" between a reference to 1.1 Gesprekken and the statements that come on top of it. It is no statement: the importer joins it to the reference before it, which now reads "Zie Gesprekken +".'

export const NL_REMOVED_RECORDS: readonly RemovedRecord[] = ['1f', '2f'].map((level) => ({
  lane: 'einde-po/reading-language',
  slug: `referentieniveau-${level}-nederlandse-taal-1-3-spreken-kenmerken-van-de-taakuitvoering-vloeiendheid-verstaanbaarheid-en-grammaticale-beheersing-2`,
  reason: JOINING_SIGN,
}))

// ---------------------------------------------------------------------------
// Everything the Dutch importer reads from here, as one value: the command
// line hands it the lists above, and a test hands it invented ones.
// ---------------------------------------------------------------------------

export interface NlAdditions {
  images: ImageTranscriptions
  goals: GoalCorrections
  restored: RestoredStatements
  examples: Examples
  removed: readonly RemovedRecord[]
}

export const NO_ADDITIONS: NlAdditions = { images: {}, goals: {}, restored: {}, examples: { italic: [], plain: {} }, removed: [] }

export const NL_ADDITIONS: NlAdditions = { images: NL_IMAGE_TRANSCRIPTIONS, goals: NL_GOAL_CORRECTIONS, restored: NL_RESTORED_STATEMENTS, examples: NL_EXAMPLES, removed: NL_REMOVED_RECORDS }
