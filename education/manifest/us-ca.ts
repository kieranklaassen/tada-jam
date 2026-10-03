// The California half of the lane manifest: one lane for every cell of the 8
// levels and 4 subjects, the plan for reading each official file, and the
// official domains left out.
//
// Every count here was counted in the publisher's own files on 2026-10-01,
// never estimated. Codes, titles and domain names are as printed. No official
// wording is in this file, and none may be added: the repo is public and
// these publishers do not grant reproduction.
//
// Page numbers are PDF pages counted from 1, as pdftotext counts them, not
// the numbers printed on the pages.

import type { Batch, Domain, Lane, LanePart, LeftOut, Skipped, SourcePlan, StatementRef } from '../manifest.ts'
import { SAME_FILE, sourceId } from '../tools/schema.ts'

// A source record's id from its folder name under incoming/us-ca/. The record
// is education/sources/us-ca-<key>.md.
const source = (key: string): string => sourceId('us-ca', `us-ca-${key}`)

const MATH_EXPORT = source('cde-cacs-math-export')
const ELA_EXPORT = source('cde-cacs-ela-export')
const SCIENCE_EXPORT = source('cde-cacs-science-export')
const HEALTH_EXPORT = source('cde-cacs-health-export')
const MATH_PDF = source('cde-ccss-math-pdf')
const ELA_PDF = source('cde-ccss-ela-pdf')
const HEALTH_PDF = source('cde-health-standards-pdf')
const SCIENCE_K_PDF = source('cde-ngss-kindergarten-dci-pdf')
const SCIENCE_1_PDF = source('cde-ngss-grade1-dci-pdf')
const SCIENCE_4_PDF = source('cde-ngss-grade4-dci-pdf')
const SCIENCE_5_PDF = source('cde-ngss-grade5-dci-pdf')
const SCIENCE_6_PDF = source('cde-ngss-grade6-integrated-pdf')
const INFANT_TODDLER = source('itldf-2025')
const PRESCHOOL_MATH = source('ptklf-2024-math')
const PRESCHOOL_LANGUAGE = source('ptklf-2024-language-literacy')
const PRESCHOOL_SCIENCE = source('ptklf-2024-science')
const PRESCHOOL_SOCIAL = source('ptklf-2024-social-emotional')
const PRESCHOOL_APPROACHES = source('ptklf-2024-approaches-to-learning')
const PRESCHOOL_HEALTH = source('ptklf-2024-health')
const PRESCHOOL_GLANCE = source('ptklf-2024-at-a-glance')
const PRESCHOOL_INTRODUCTION = source('ptklf-2024-introduction')
const SEL = source('cde-tsel-competencies-docx')

// ---------------------------------------------------------------------------
// How each file is read.
// ---------------------------------------------------------------------------

const plan = (key: string, file: string, extraction: SourcePlan['extraction']): SourcePlan => ({ source: source(key), incomingKey: key, file, extraction })

const PLAIN = { kind: 'pdf', mode: 'plain' } as const
const LAYOUT = { kind: 'pdf', mode: 'layout' } as const
const WINDOWS_CSV = { kind: 'text', format: 'csv', encoding: 'windows-1252' } as const

export const US_CA_SOURCE_PLANS: readonly SourcePlan[] = [
  plan('cde-cacs-math-export', 'CA_Mathematics_Standards.csv', WINDOWS_CSV),
  plan('cde-cacs-ela-export', 'CA_English_Language_Arts_Standards.csv', { kind: 'text', format: 'csv', encoding: 'ascii' }),
  plan('cde-cacs-science-export', 'CA_Science_(CA_NGSS)_Standards.csv', WINDOWS_CSV),
  plan('cde-cacs-health-export', 'CA_Health_Education_Standards.csv', WINDOWS_CSV),
  plan('cde-ccss-math-pdf', 'ccssmathstandardaug2013.pdf', PLAIN),
  plan('cde-ccss-ela-pdf', 'finalelaccssstandards.pdf', {
    kind: 'pdf',
    mode: 'bbox',
    columns:
      'The grade standards are landscape tables of three grade columns. Find each header row (Kindergartners, Grade N Students, Grades 6–8 Students) and assign every word below it to a column by the x position of the standard numbers under that header. Some pages hold two tables, so find the header rows per table. The anchor standard pages are two text columns: split at the gutter and read the left column first.',
  }),
  plan('cde-health-standards-pdf', 'healthstandmar08.pdf', PLAIN),
  plan('cde-ngss-kindergarten-dci-pdf', 'cangsskinder-topicdci.pdf', LAYOUT),
  plan('cde-ngss-grade1-dci-pdf', 'cangssgr1-dci.pdf', LAYOUT),
  plan('cde-ngss-grade4-dci-pdf', 'cangssgr4-dci.pdf', LAYOUT),
  plan('cde-ngss-grade5-dci-pdf', 'cangss-disccoreideasgr5.pdf', LAYOUT),
  plan('cde-ngss-grade6-integrated-pdf', 'cangsspfintegrgr6.pdf', LAYOUT),
  plan('itldf-2025', 'itldf-ada-en.pdf', PLAIN),
  plan('ptklf-2024-math', 'ptklfmathdomain.pdf', PLAIN),
  plan('ptklf-2024-language-literacy', 'ptklflanguageliteracydev.pdf', PLAIN),
  plan('ptklf-2024-science', 'ptklfsciencedomain.pdf', PLAIN),
  plan('ptklf-2024-social-emotional', 'ptklfsocialemotionaldev.pdf', PLAIN),
  plan('ptklf-2024-approaches-to-learning', 'ptklfapproachestolearning.pdf', PLAIN),
  plan('ptklf-2024-health', 'ptklfhealthdomain.pdf', PLAIN),
  plan('ptklf-2024-at-a-glance', 'ptklfataglance.pdf', PLAIN),
  plan('ptklf-2024-introduction', 'ptklfintroduction.pdf', PLAIN),
  plan('cde-tsel-competencies-docx', 'tselcompcond.docx', { kind: 'docx', part: 'word/document.xml' }),
]

// ---------------------------------------------------------------------------
// Small builders, so a list of statements reads as a list.
// ---------------------------------------------------------------------------

type Row = readonly [code: string, title: string, page: number, note?: string]

// The foundations of one strand: number, title, and the page the heading first appears on.
const foundations = (group: string, rows: readonly Row[]): StatementRef[] =>
  rows.map(([code, title, page, note]) => ({ group, code, title, page, ...(note === undefined ? {} : { note }) }))

// The official domains of a statement list, counted.
const domainsOf = (statements: readonly StatementRef[]): Domain[] => {
  const counts = new Map<string, number>()
  for (const statement of statements) counts.set(statement.group, (counts.get(statement.group) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count }))
}

const total = (domains: readonly Domain[]): number => domains.reduce((sum, domain) => sum + domain.count, 0)

const domains = (...rows: readonly (readonly [name: string, count: number])[]): Domain[] => rows.map(([name, count]) => ({ name, count }))

// ---------------------------------------------------------------------------
// Infant-toddler: the Infant-Toddler Learning and Development Foundations,
// second edition. One PDF, so the second check is a second reading.
// ---------------------------------------------------------------------------

const INFANT_TODDLER_LOCATE =
  'Read with pdftotext in plain mode. Each foundation opens on its own page: the heading "Foundation N.N: Title", its general statement, a pointer to the first four months, the three column headers (4 through 11 months, 11 through 23 months, 23 through 36 months), then the three indicators in that order, each its own paragraph. The record takes the general statement and the third indicator. The examples below interleave across the three columns and are not part of it. Pages headed "(continued)" repeat the heading.'

const INFANT_TODDLER_GRANULARITY =
  'One record is one foundation: its general statement and its indicator for 23 through 36 months. The earlier indicators, the first-four-months descriptions and the examples are not recorded. Headings are printed "Foundation N.N: Title", and the numbering restarts at 1.1 in each of the five domains, so a code needs its domain as scope. No sub-parts.'

const INFANT_TODDLER_CHECK =
  "No second rendition was found. The introduction of the same file (PDF pages 31 to 35) restates each foundation's general statement, so the statement has a second printing to compare. The indicator for 23 through 36 months is printed once and is read again on the foundation's own page."

const infantToddlerCount = (thisLane: string): string =>
  `Counted in the document's own lists: each strand opens with a sentence naming its foundations and a bulleted list of them. Cross-checked against the "Foundation N.N:" headings on the foundation pages (34 distinct, each with all three age-period headers) and against the restatement in the introduction (PDF pages 31 to 35). ${thisLane}`

function infantToddlerLane(
  subject: Lane['subject'],
  title: string,
  partName: string,
  pages: readonly (readonly [number, number])[],
  statements: readonly StatementRef[],
  thisLane: string,
  notes: string,
): Lane {
  return {
    jurisdiction: 'us-ca',
    level: 'infant-toddler',
    subject,
    title,
    sources: [INFANT_TODDLER],
    parts: [
      {
        name: partName,
        source: INFANT_TODDLER,
        checkRendition: SAME_FILE,
        checkStrength: 'second-reading',
        checkGranularity: INFANT_TODDLER_CHECK,
        expectedCount: statements.length,
        selection: { kind: 'statements', pages, locate: INFANT_TODDLER_LOCATE, statements },
      },
    ],
    expectedCount: statements.length,
    countingMethod: infantToddlerCount(thisLane),
    countIsFromImportFile: false,
    domains: domainsOf(statements),
    granularity: INFANT_TODDLER_GRANULARITY,
    skipped: [],
    notes,
  }
}

const INFANT_TODDLER_LANES: readonly Lane[] = [
  infantToddlerLane(
    'mathematics',
    'Infant-toddler mathematics',
    'Cognitive Development, Strand 2.0',
    [[145, 149]],
    foundations('Cognitive Development / Strand 2.0: Emergent Mathematical Thinking', [
      ['2.1', 'Number Sense', 145],
      ['2.2', 'Spatial Thinking', 146],
      ['2.3', 'Classification', 148],
    ]),
    'This lane: the three foundations listed under Cognitive Development, Strand 2.0 (PDF page 144).',
    'The document has no mathematics domain. Its Emergent Mathematical Thinking strand, inside Cognitive Development, is mapped here.',
  ),
  infantToddlerLane(
    'reading-language',
    'Infant-toddler reading and language',
    'Language Development',
    [[115, 128]],
    [
      ...foundations('Language Development / Strand 1.0: Attending and Understanding', [
        ['1.1', 'Being Attentive to Communication', 115],
        ['1.2', 'Understanding Language', 117],
      ]),
      ...foundations('Language Development / Strand 2.0: Communicating', [
        ['2.1', 'Communicating and Speaking', 120],
        ['2.2', 'Emerging Conversation Skills', 122],
      ]),
      ...foundations('Language Development / Strand 3.0: Early Literacy', [
        ['3.1', 'Engagement With Books, Stories, Songs, and Rhymes', 125],
        ['3.2', 'Understanding Meaning From Books and Stories', 127],
      ]),
    ],
    'This lane: all six foundations of the Language Development domain (strand lists on PDF pages 114, 119 and 124).',
    'The whole Language Development domain is mapped here.',
  ),
  infantToddlerLane(
    'science',
    'Infant-toddler science',
    'Cognitive Development, Strand 1.0',
    [[142, 143]],
    foundations('Cognitive Development / Strand 1.0: Exploration', [['1.1', 'Cause and Effect', 142]]),
    'This lane: the single foundation listed under Cognitive Development, Strand 1.0 (PDF page 141).',
    'The document has no science domain. Cause and Effect, the one foundation of the Exploration strand of Cognitive Development, is mapped here because it is the nearest: it is about finding out what happens when a child acts on things.',
  ),
  infantToddlerLane(
    'practical-life-feelings',
    'Infant-toddler practical life and feelings',
    'Social and Emotional Development, Approaches to Learning, and Cognitive Development Strands 3.0 and 4.0',
    [
      [53, 71],
      [85, 101],
      [151, 155],
    ],
    [
      ...foundations('Social and Emotional Development / Strand 1.0: Self', [
        ['1.1', 'Sense of Identity and Belonging', 53],
        ['1.2', 'Recognition of Agency', 55],
        ['1.3', 'Expression of Emotion', 56],
        ['1.4', 'Regulating Emotions and Behavior', 58],
      ]),
      ...foundations('Social and Emotional Development / Strand 2.0: Social Interactions', [
        ['2.1', 'Social Understanding', 62],
        ['2.2', 'Empathy', 64],
        ['2.3', 'Interactions With Caregivers and Other People', 65],
        ['2.4', 'Interactions With Peers', 66],
      ]),
      ...foundations('Social and Emotional Development / Strand 3.0: Relationships', [
        ['3.1', 'Relationships With Caregivers', 68],
        ['3.2', 'Relationships With Peers', 71],
      ]),
      ...foundations('Approaches to Learning / Strand 1.0: Motivation to Learn', [
        ['1.1', 'Curiosity and Initiative', 85],
        ['1.2', 'Engagement and Perseverance', 87],
      ]),
      ...foundations('Approaches to Learning / Strand 2.0: Executive Functioning', [
        ['2.1', 'Attention', 90],
        ['2.2', 'Inhibitory Control', 92],
        ['2.3', 'Working Memory', 94],
        ['2.4', 'Cognitive Flexibility', 96],
      ]),
      ...foundations('Approaches to Learning / Strand 3.0: Goal-Directed Learning', [
        ['3.1', 'Problem Solving', 99],
        ['3.2', 'Collaborative Effort', 100],
      ]),
      ...foundations('Cognitive Development / Strand 3.0: Imitation and Symbolic Thinking', [
        ['3.1', 'Imitation', 151],
        ['3.2', 'Symbolic Thinking', 152],
      ]),
      ...foundations('Cognitive Development / Strand 4.0: Memory', [['4.1', 'Memory', 154]]),
    ],
    'This lane: Social and Emotional Development 10 (4, 4 and 2 per strand; lists on PDF pages 52, 61 and 67), Approaches to Learning 8 (2, 4 and 2; pages 84, 89 and 98), and three of Cognitive Development (Strand 3.0 on page 150, Strand 4.0 on page 153).',
    'Imitation, Symbolic Thinking and Memory are the Cognitive Development foundations that are neither mathematics nor science; they are mapped here. The same printed number occurs up to three times in this lane (3.1 and 3.2 exist in all three domains), so the domain is part of every code scope. The contents page names the second Approaches to Learning strand "Executive Functions"; the body, followed here, says "Executive Functioning".',
  ),
]

// ---------------------------------------------------------------------------
// Preschool and transitional kindergarten: the Preschool/Transitional
// Kindergarten Learning Foundations (2024). One PDF per domain is canonical;
// the At-a-Glance PDF is a second rendition of every foundation.
// ---------------------------------------------------------------------------

const PRESCHOOL_LOCATE =
  'Read with pdftotext in plain mode. A foundation first appears as the heading "Foundation N.N Title", then the labels Early, 3 to 4 ½ Years, Later, 4 to 5 ½ Years, then the Early statement, then the Later statement. The record takes both statements, each labelled with its age band. Two columns of examples follow and interleave; they are not part of it. The heading block repeats on continuation pages (marked "(continued)"), so take its first occurrence, the page given for each statement.'

const PRESCHOOL_GRANULARITY =
  'One record is one foundation and holds both of its age statements, Early (3 to 4 ½ Years) and Later (4 to 5 ½ Years), each labelled with its band. The hierarchy is domain, strand, sub-strand, foundation. Headings are printed "Foundation N.N Title"; the numbering restarts at 1.1 in every domain and no domain prefix is printed, so a code needs its domain as scope. No sub-parts.'

const preschoolCheck = (domain: string, first: number, last: number): string =>
  `The At-a-Glance PDF prints every foundation of ${domain} with its Early and Later statement and no examples, on its PDF pages ${first} to ${last}. Same granularity, in a separate file with its own layout. Some titles there end in an asterisk that points to a footnote.`

const preschoolCount = (count: number, domain: string, first: number, last: number): string =>
  `Counted ${count} "Foundation N.N" headings under ${domain} in the At-a-Glance PDF (its PDF pages ${first} to ${last}), each with one Early and one Later label. Cross-checked in the domain PDF: its contents list and the first appearance of each heading in its body give ${count} too.`

function preschoolPart(name: string, from: string, pages: readonly [number, number], glance: readonly [number, number], statements: readonly StatementRef[]): LanePart {
  return {
    name,
    source: from,
    checkRendition: PRESCHOOL_GLANCE,
    checkStrength: 'second-rendition',
    checkGranularity: preschoolCheck(name, glance[0], glance[1]),
    expectedCount: statements.length,
    selection: { kind: 'statements', pages: [pages], locate: PRESCHOOL_LOCATE, statements },
  }
}

function preschoolLane(subject: Lane['subject'], title: string, parts: readonly LanePart[], countingMethod: string, extra: Partial<Lane> = {}): Lane {
  const statements = parts.flatMap((part) => (part.selection.kind === 'statements' ? part.selection.statements : []))
  return {
    jurisdiction: 'us-ca',
    level: 'preschool-tk',
    subject,
    title,
    sources: [...parts.map((part) => part.source), PRESCHOOL_GLANCE, PRESCHOOL_INTRODUCTION],
    parts,
    expectedCount: statements.length,
    countingMethod,
    countIsFromImportFile: false,
    domains: domainsOf(statements),
    granularity: PRESCHOOL_GRANULARITY,
    skipped: [],
    ...extra,
  }
}

const PRESCHOOL_MATH_STATEMENTS: readonly StatementRef[] = [
  ...foundations('Mathematics / Strand 1.0 — Counting and Cardinality', [
    ['1.1', 'Reciting Numbers', 17],
    ['1.2', 'One-to-One Correspondence', 19],
    ['1.3', 'Cardinality', 21],
    ['1.4', 'Subitize', 24],
    ['1.5', 'Numeral Recognition', 25],
    ['1.6', 'Number Comparison', 26],
  ]),
  ...foundations('Mathematics / Strand 2.0 — Operations and Algebraic Thinking', [
    ['2.1', 'Principles of Addition and Subtraction', 27],
    ['2.2', 'Number Composition and Decomposition', 30],
    ['2.3', 'Solving Addition and Subtraction Problems', 33],
    ['2.4', 'Sharing Objects (Division)', 35],
    ['2.5', 'Sorting and Classifying', 37],
    ['2.6', 'Recognizing, Duplicating, and Extending Patterns', 39],
    ['2.7', 'Creating Patterns', 41],
  ]),
  ...foundations('Mathematics / Strand 3.0 — Measurement and Data', [
    ['3.1', 'Comparing Measurable Attributes of Objects', 44],
    ['3.2', 'Ordering Objects', 46],
    ['3.3', 'Measuring Length', 48],
    ['3.4', 'Representing Data', 51],
    ['3.5', 'Interpreting Data', 53],
  ]),
  ...foundations('Mathematics / Strand 4.0 — Geometry and Spatial Thinking', [
    ['4.1', 'Identifying Two-Dimensional Shapes', 55],
    ['4.2', 'Identifying Three-Dimensional Shapes', 57],
    ['4.3', 'Comparing Two-Dimensional Shapes', 58],
    ['4.4', 'Composing Shapes', 59],
    ['4.5', 'Positions and Directions in Space', 62],
    ['4.6', 'Mental Rotation', 64],
  ]),
]

const LANGUAGE = 'Language and Literacy Development / Foundational Language Development'

const PRESCHOOL_LANGUAGE_STATEMENTS: readonly StatementRef[] = [
  ...foundations(`${LANGUAGE} / Strand 1.0 — Listening and Speaking`, [
    ['1.1', 'Understanding and Using Vocabulary', 21],
    ['1.2', 'Understanding and Using Words for Categories', 23],
    ['1.3', 'Understanding and Using Size and Location Words', 25],
    ['1.4', 'Using Grammatical Features and Sentence Structure', 28],
    ['1.5', 'Asking Questions', 31],
    ['1.6', 'Constructing Narratives', 33],
    ['1.7', 'Sharing Explanations and Opinions', 35],
    ['1.8', 'Participating in Conversations', 37, 'The repeated heading on PDF page 39 misspells the title.'],
  ]),
  ...foundations(`${LANGUAGE} / Strand 2.0 — Foundational Literacy Skills`, [
    ['2.1', 'Isolating Initial Sounds', 42],
    ['2.2', 'Recognizing and Blending Sounds', 44],
    ['2.3', 'Participating in Rhyming and Wordplay', 46],
    ['2.4', 'Identifying Letters', 50],
    ['2.5', 'Learning Letter–Sound Correspondence', 52],
    ['2.6', 'Understanding the Concept of Print', 56],
    ['2.7', 'Understanding Print Conventions', 58],
  ]),
  ...foundations(`${LANGUAGE} / Strand 3.0 — Reading`, [
    ['3.1', 'Demonstrating Interest in Literacy Activities', 60],
    ['3.2', 'Understanding Stories', 62],
    ['3.3', 'Understanding Informational Text', 65],
  ]),
  ...foundations(`${LANGUAGE} / Strand 4.0 — Writing`, [
    ['4.1', 'Developing Fine Motor Skills in Writing', 68],
    ['4.2', 'Writing to Represent Sounds', 70],
    ['4.3', 'Dictating Thoughts and Ideas to Be Conveyed in Writing', 72],
    ['4.4', 'Writing to Represent Words or Ideas', 74],
    ['4.5', 'Writing Own Name', 76, 'PDF page 77 repeats the number 4.5 over the title of 4.4; take page 76.'],
  ]),
]

const PRESCHOOL_SCIENCE_STATEMENTS: readonly StatementRef[] = [
  ...foundations('Science / Strand 1.0 — Science and Engineering Practices', [
    ['1.1', 'Making Observations', 18],
    ['1.2', 'Comparing and Contrasting', 21],
    ['1.3', 'Asking Questions', 23],
    ['1.4', 'Defining Problems', 25],
    ['1.5', 'Making Predictions', 27],
    ['1.6', 'Planning and Carrying Out Investigations', 30],
    ['1.7', 'Using Tools', 32],
    ['1.8', 'Documenting Observations and Using Models', 34],
    ['1.9', 'Mathematical Thinking and Analyzing Data', 36],
    ['1.10', 'Formulating and Communicating Explanations and Solutions', 37],
  ]),
  ...foundations('Science / Strand 2.0 — Physical Science', [
    ['2.1', 'Characteristics of Objects and Materials', 40],
    ['2.2', 'Light and Sound Waves', 42],
    ['2.3', 'Exploring Changes in Objects and Materials', 44],
    ['2.4', 'Force and Motion', 46],
    ['2.5', 'Energy', 48],
  ]),
  ...foundations('Science / Strand 3.0 — Life Science', [
    ['3.1', 'Characteristics of Living Things', 51],
    ['3.2', 'Bodily Processes', 53],
    ['3.3', 'Living and Nonliving Things', 55],
    ['3.4', 'Heredity and Traits', 57],
    ['3.5', 'Habitats', 59],
    ['3.6', 'Growth, Change, and the Life Cycle of Living Things', 61],
    ['3.7', 'Needs of Living Things', 63],
  ]),
  ...foundations('Science / Strand 4.0 — Earth and Space Science', [
    ['4.1', 'Characteristics of Earth Materials', 66],
    ['4.2', 'Natural Objects in the Sky', 68],
    ['4.3', 'Weather', 70],
    ['4.4', 'Earth and Human Activity', 72],
  ]),
  ...foundations('Science / Strand 5.0 — Engineering, Technology, and Applications of Science', [
    ['5.1', 'Engineering Design Process', 75],
    ['5.2', 'Design Solutions and Society', 77],
    ['5.3', 'Using Digital Devices', 80],
  ]),
]

const PRESCHOOL_SOCIAL_STATEMENTS: readonly StatementRef[] = [
  ...foundations('Social and Emotional Development / Strand 1.0 — Self', [
    ['1.1', 'Self-Identity', 16],
    ['1.2', 'Confidence in Abilities', 19],
    ['1.3', 'Understanding Emotions in Self and Others', 21],
    ['1.4', 'Regulating Emotions, Behaviors, and Stress', 22],
    ['1.5', 'Managing Routines and Transitions', 25],
    ['1.6', 'Awareness of Similarities and Differences Across People', 28],
    ['1.7', 'Understanding Other People’s Thoughts, Behaviors, and Experiences', 31],
    ['1.8', 'Empathy and Caring', 32],
  ]),
  ...foundations('Social and Emotional Development / Strand 2.0 — Interactions and Relationships with Adults', [
    ['2.1', 'Reciprocal Interactions with Adults', 35],
    ['2.2', 'Seeking Security and Support', 38],
    ['2.3', 'Coping with Departures', 40],
    ['2.4', 'Relationships with Adults', 44],
  ]),
  ...foundations('Social and Emotional Development / Strand 3.0 — Interactions and Relationships with Peers', [
    ['3.1', 'Interacting and Cooperating with Peers', 47],
    ['3.2', 'Conflict Resolution with Peers', 50],
    ['3.3', 'Fairness and Respect', 52],
    ['3.4', 'Developing Friendships', 55],
  ]),
]

const PRESCHOOL_APPROACHES_STATEMENTS: readonly StatementRef[] = [
  ...foundations('Approaches to Learning / Strand 1.0 — Motivation to Learn', [
    ['1.1', 'Curiosity and Interest', 18],
    ['1.2', 'Initiative', 22],
    ['1.3', 'Engagement', 25],
    ['1.4', 'Persisting Despite Difficulties', 28],
  ]),
  ...foundations('Approaches to Learning / Strand 2.0 — Executive Functioning', [
    ['2.1', 'Working Memory', 32],
    ['2.2', 'Managing Impulsive Behaviors', 34],
    ['2.3', 'Managing Attention and Distractions', 36],
    ['2.4', 'Flexibility', 38],
  ]),
  ...foundations('Approaches to Learning / Strand 3.0 — Goal-Directed Learning', [
    ['3.1', 'Planning', 42],
    ['3.2', 'Reflecting and Analyzing', 44],
    ['3.3', 'Problem-Solving Together', 46],
    ['3.4', 'Understanding Others', 48],
  ]),
]

const PRESCHOOL_HEALTH_STATEMENTS: readonly StatementRef[] = [
  ...foundations('Health / Strand 1.0 — Understanding Health and Wellness', [
    ['1.1', 'Identifying and Naming Body Parts', 13],
    ['1.2', 'Communicating About Health Needs', 15],
    ['1.3', 'Understanding the Role of Health Care Providers', 16],
    ['1.4', 'Recognizing and Communicating About Body Boundaries', 17],
    ['1.5', 'Identifying Foods', 19],
    ['1.6', 'Communicating Fullness and Hunger', 20],
    ['1.7', 'Understanding a Variety of Foods', 21],
    ['1.8', 'Recognizing the Body’s Response to Physical Activity', 23],
    ['1.9', 'Recognizing and Indicating When Tired', 24],
  ]),
  ...foundations('Health / Strand 2.0 — Health and Safety Habits', [
    ['2.1', 'Handwashing', 25],
    ['2.2', 'Preventing Infectious Diseases', 26],
    ['2.3', 'Toothbrushing', 27],
    ['2.4', 'Practicing Sun Safety', 28],
    ['2.5', 'Following Safety Rules', 29],
    ['2.6', 'Following Emergency Routines', 30],
    ['2.7', 'Following Transportation and Pedestrian Safety Rules', 31],
  ]),
]

const PRESCHOOL_LANES: readonly Lane[] = [
  preschoolLane(
    'mathematics',
    'Preschool and transitional kindergarten mathematics',
    [preschoolPart('Mathematics', PRESCHOOL_MATH, [17, 65], [28, 34], PRESCHOOL_MATH_STATEMENTS)],
    `${preschoolCount(24, 'Mathematics', 28, 34)} Per strand: 6, 7, 5, 6.`,
  ),
  preschoolLane(
    'reading-language',
    'Preschool and transitional kindergarten reading and language',
    [preschoolPart('Foundational Language Development', PRESCHOOL_LANGUAGE, [21, 77], [13, 19], PRESCHOOL_LANGUAGE_STATEMENTS)],
    `${preschoolCount(23, 'Foundational Language Development', 13, 19)} Per strand: 8, 7, 3, 5. The domain PDF's contents list holds 46 foundations: these 23 and the 23 of English Language Development, which is left out.`,
    {
      notes:
        'The domain PDF holds two sub-domains whose numbering both start at 1.1 and which share several titles: Foundational Language Development (PDF pages 21 to 77), recorded here, and English Language Development (from PDF page 82), left out. A locator must stay inside the first.',
    },
  ),
  preschoolLane(
    'science',
    'Preschool and transitional kindergarten science',
    [preschoolPart('Science', PRESCHOOL_SCIENCE, [18, 81], [35, 43], PRESCHOOL_SCIENCE_STATEMENTS)],
    `${preschoolCount(29, 'Science', 35, 43)} Per strand: 10, 5, 7, 4, 3.`,
  ),
  preschoolLane(
    'practical-life-feelings',
    'Preschool and transitional kindergarten practical life and feelings',
    [
      preschoolPart('Social and Emotional Development', PRESCHOOL_SOCIAL, [16, 56], [8, 12], PRESCHOOL_SOCIAL_STATEMENTS),
      preschoolPart('Approaches to Learning', PRESCHOOL_APPROACHES, [18, 49], [4, 7], PRESCHOOL_APPROACHES_STATEMENTS),
      preschoolPart('Health', PRESCHOOL_HEALTH, [13, 31], [49, 53], PRESCHOOL_HEALTH_STATEMENTS),
    ],
    `Three domains, one PDF each. ${preschoolCount(16, 'Social and Emotional Development', 8, 12)} ${preschoolCount(12, 'Approaches to Learning', 4, 7)} ${preschoolCount(16, 'Health', 49, 53)} Together 44.`,
    {
      notes:
        'Social and Emotional Development, Approaches to Learning and Health are the three domains mapped to this subject. Every printed number from 1.1 to 2.4 occurs three times in this lane, so the domain is part of every code scope.',
    },
  ),
]

// ---------------------------------------------------------------------------
// Kindergarten and grades 1, 4, 5 and 6: the department's standards search
// exports are canonical, and the adopted PDFs are the second rendition.
// ---------------------------------------------------------------------------

interface Grade {
  level: string
  // As lane titles and sentences name the grade.
  name: string
  // The Grade Range value in the mathematics, English language arts and science exports.
  range: string
  // The Grade Range value in the health export.
  healthRange: string
  // Min Grade and Max Grade.
  number: number
}

const K: Grade = { level: 'kindergarten', name: 'Kindergarten', range: 'K', healthRange: 'Kindergarten', number: 0 }
const G1: Grade = { level: 'grade-1', name: 'Grade 1', range: '1', healthRange: 'Grade 1', number: 1 }
const G4: Grade = { level: 'grade-4', name: 'Grade 4', range: '4', healthRange: 'Grade 4', number: 4 }
const G5: Grade = { level: 'grade-5', name: 'Grade 5', range: '5', healthRange: 'Grade 5', number: 5 }
const G6: Grade = { level: 'grade-6', name: 'Grade 6', range: '6', healthRange: 'Grade 6', number: 6 }

// --- mathematics ------------------------------------------------------------

const MATH_GRANULARITY =
  'One record is one export row. A lettered sub-part is its own row (K.CC.4.a). A parent that has lettered parts has no row, and so no record, and each sub-part row repeats the parent\'s stem before its own text. The Description column is a labelled block: the cluster heading, then the standard, and in some rows a footnote; only the standard is the wording. A California addition ends in " CA" inside the text; the PDF prints it in boldface.'

function mathLane(grade: Grade, counted: readonly Domain[], numbered: number, lettered: number, parents: readonly string[]): Lane {
  const count = total(counted)
  return {
    jurisdiction: 'us-ca',
    level: grade.level,
    subject: 'mathematics',
    title: `${grade.name} mathematics`,
    sources: [MATH_EXPORT, MATH_PDF],
    parts: [
      {
        name: `Mathematics export, ${grade.name.toLowerCase()} rows`,
        source: MATH_EXPORT,
        checkRendition: MATH_PDF,
        checkStrength: 'second-rendition',
        checkGranularity: `The adopted PDF prints ${numbered} numbered standards and ${lettered} lettered sub-parts for this grade. Granularity differs: the PDF prints a parent's stem once, with its sub-parts beneath it as a., b., and never prints a full dotted code; the export has no row for the parent and repeats the stem in every sub-part row. The PDF's leaves (numbered standards without sub-parts, plus sub-parts) number ${count}, the same as the export's rows. Parent codes in the PDF with no row in the export: ${parents.join(', ')}. No code of the export is absent from the PDF.`,
        expectedCount: count,
        selection: { kind: 'rows', codeColumn: 'Standard Identifier', domainColumn: 'Domain', where: { 'Grade Range': [grade.range] } },
      },
    ],
    expectedCount: count,
    countingMethod: `Rows of the mathematics export whose Grade Range is ${grade.range} (Min Grade and Max Grade ${grade.number}): ${count}. Reached a second way in the adopted PDF, by counting the leaves under the grade's domain headings: the same number.`,
    countIsFromImportFile: true,
    domains: counted,
    granularity: MATH_GRANULARITY,
    skipped: [],
  }
}

const MATH_LANES: readonly Lane[] = [
  mathLane(
    K,
    domains(['Counting and Cardinality', 9], ['Operations and Algebraic Thinking', 5], ['Number and Operations in Base Ten', 1], ['Measurement and Data', 3], ['Geometry', 6]),
    22,
    3,
    ['K.CC.4'],
  ),
  mathLane(G1, domains(['Operations and Algebraic Thinking', 8], ['Number and Operations in Base Ten', 8], ['Measurement and Data', 4], ['Geometry', 3]), 21, 3, ['1.NBT.2']),
  mathLane(
    G4,
    domains(['Operations and Algebraic Thinking', 5], ['Number and Operations in Base Ten', 6], ['Number and Operations-Fractions', 12], ['Measurement and Data', 8], ['Geometry', 3]),
    28,
    9,
    ['4.NF.3', '4.NF.4', '4.MD.5'],
  ),
  mathLane(
    G5,
    domains(['Operations and Algebraic Thinking', 4], ['Number and Operations in Base Ten', 8], ['Number and Operations-Fractions', 11], ['Measurement and Data', 8], ['Geometry', 4]),
    27,
    14,
    ['5.NBT.3', '5.NF.4', '5.NF.5', '5.NF.7', '5.MD.3', '5.MD.5'],
  ),
  mathLane(
    G6,
    domains(['Ratios and Proportional Relationships', 6], ['The Number System', 13], ['Expressions and Equations', 11], ['Geometry', 4], ['Statistics and Probability', 8]),
    29,
    18,
    ['6.RP.3', '6.NS.6', '6.NS.7', '6.EE.2', '6.SP.5'],
  ),
]

// --- reading and language ---------------------------------------------------

const ELA_GRANULARITY =
  'One record is one export row. Lettered sub-parts are not rows: they are lines inside the parent row\'s Description (a., b.), so they stay inside the parent\'s record. This is the opposite of the mathematics export. Description is the standard and, in some rows, a footnote. The strand is the Domain column and the cluster heading is the Cluster column. A California addition ends in " CA" inside the text. The PDF prints a sub-part code without a dot before the letter (W.5.1a).'

const BEGINS_LATER = 'Placeholder row, not a standard: it says only that the standard begins in a later grade.'
const NOT_LITERATURE = 'Placeholder row, not a standard: it says only that the standard does not apply to literature.'

const ELA_CHECK =
  'The adopted PDF, read by column from word positions: its pages are tables of three grade columns that neither text mode reads. Same granularity in substance: numbered standards with lettered sub-parts beneath them. The PDF prints the placeholder rows too.'

function elaLane(grade: Grade, counted: readonly Domain[], rows: number, skipped: readonly Skipped[], compared: string): Lane {
  const count = total(counted)
  return {
    jurisdiction: 'us-ca',
    level: grade.level,
    subject: 'reading-language',
    title: `${grade.name} reading and language`,
    sources: [ELA_EXPORT, ELA_PDF],
    parts: [
      {
        name: `English language arts export, ${grade.name.toLowerCase()} rows`,
        source: ELA_EXPORT,
        checkRendition: ELA_PDF,
        checkStrength: 'second-rendition',
        checkGranularity: `${ELA_CHECK} ${compared}`,
        expectedCount: count,
        selection: { kind: 'rows', codeColumn: 'Standard Identifier', domainColumn: 'Domain', where: { 'Grade Range': [grade.range] } },
      },
    ],
    expectedCount: count,
    countingMethod: `Rows of the English language arts export whose Grade Range is ${grade.range}: ${rows}. Less the ${skipped.length} placeholder ${skipped.length === 1 ? 'row' : 'rows'} listed as skipped: ${count}. Cross-checked code by code against the adopted PDF.`,
    countIsFromImportFile: true,
    domains: counted,
    granularity: ELA_GRANULARITY,
    skipped,
  }
}

const ELA_K_TO_5_LANES: readonly Lane[] = [
  elaLane(
    K,
    domains(['Reading: Literature', 9], ['Reading: Informational Text', 10], ['Reading: Foundational Skills', 4], ['Writing', 7], ['Speaking and Listening', 6], ['Language', 5]),
    46,
    [
      { code: 'RL.K.8', reason: NOT_LITERATURE },
      { code: 'W.K.4', reason: BEGINS_LATER },
      { code: 'W.K.9', reason: BEGINS_LATER },
      { code: 'W.K.10', reason: BEGINS_LATER },
      { code: 'L.K.3', reason: BEGINS_LATER },
    ],
    'For this grade both hold 46 numbered codes and 37 lettered sub-parts, and no code is in one and absent from the other.',
  ),
  elaLane(
    G1,
    domains(['Reading: Literature', 9], ['Reading: Informational Text', 10], ['Reading: Foundational Skills', 4], ['Writing', 7], ['Speaking and Listening', 6], ['Language', 5]),
    46,
    [
      { code: 'RL.1.8', reason: NOT_LITERATURE },
      { code: 'W.1.4', reason: BEGINS_LATER },
      { code: 'W.1.9', reason: BEGINS_LATER },
      { code: 'W.1.10', reason: BEGINS_LATER },
      { code: 'L.1.3', reason: BEGINS_LATER },
    ],
    'For this grade both hold 46 numbered codes and 46 lettered sub-parts, and no code is in one and absent from the other.',
  ),
  elaLane(
    G4,
    domains(['Reading: Literature', 9], ['Reading: Informational Text', 10], ['Reading: Foundational Skills', 2], ['Writing', 10], ['Speaking and Listening', 6], ['Language', 6]),
    44,
    [{ code: 'RL.4.8', reason: NOT_LITERATURE }],
    'For this grade both hold 44 numbered codes and 46 lettered sub-parts, and no code is in one and absent from the other. One sub-part line of the export has no space after its letter.',
  ),
  elaLane(
    G5,
    domains(['Reading: Literature', 9], ['Reading: Informational Text', 10], ['Reading: Foundational Skills', 2], ['Writing', 10], ['Speaking and Listening', 6], ['Language', 6]),
    44,
    [{ code: 'RL.5.8', reason: NOT_LITERATURE }],
    'For this grade both hold 44 numbered codes and 44 lettered sub-parts, and no code is in one and absent from the other. The PDF prints W.5.6 without the period after its number, which a parser that expects one misses.',
  ),
]

const ELA_6_DOMAINS = domains(
  ['Reading: Literature', 9],
  ['Reading: Informational Text', 10],
  ['Writing', 10],
  ['Speaking and Listening', 6],
  ['Language', 6],
  ['Reading: Literacy in History/Social Studies', 10],
  // The export's domain column cuts this name short, before its last word. The records carry it as the adopted document
  // prints it (US_CA_EXPORT_DOMAIN_CORRECTIONS), so it is counted and batched by that name here.
  ['Reading: Literacy in Science and Technical Subjects', 10],
  ['Writing: Literacy in History/Social Studies, Science, and Technical Subjects', 9],
)

const ELA_6_LANE: Lane = {
  jurisdiction: 'us-ca',
  level: 'grade-6',
  subject: 'reading-language',
  title: 'Grade 6 reading and language',
  sources: [ELA_EXPORT, ELA_PDF],
  parts: [
    {
      name: 'English language arts export, grade 6 rows and the literacy rows for grades 6 to 8',
      source: ELA_EXPORT,
      checkRendition: ELA_PDF,
      checkStrength: 'second-rendition',
      checkGranularity: `${ELA_CHECK} For the 42 grade 6 rows both hold 42 numbered codes and 40 lettered sub-parts, with no code missing on either side; W.6.1 sits on PDF page 62, whose header row is drawn twice. The 30 literacy rows for grades 6 to 8 (PDF pages 87 to 90 and 92 to 95, the column headed Grades 6–8 Students) match too: 30 numbered codes and 11 lettered sub-parts in both. The PDF writes the band with an en dash and the export with a hyphen (RH.6-8.1).`,
      expectedCount: 70,
      // Grade Range is 6 for the grade's own rows and 6-8 (with a stray tab) for the band rows; Min Grade is 6 for both.
      selection: { kind: 'rows', codeColumn: 'Standard Identifier', domainColumn: 'Domain', where: { 'Min Grade': ['6'] } },
    },
  ],
  expectedCount: 70,
  countingMethod:
    'Rows of the English language arts export whose Min Grade is 6: 42 with Grade Range 6, and 30 with Grade Range 6-8, the literacy standards for history/social studies, science and technical subjects (codes RH, RST and WHST, ten each). Less the 2 placeholder rows listed as skipped: 70. Cross-checked code by code against the adopted PDF.',
  countIsFromImportFile: true,
  domains: ELA_6_DOMAINS,
  granularity: `${ELA_GRANULARITY} Grade 6 has no Reading: Foundational Skills strand. The Subject Area column separates the grade's own rows from the band rows.`,
  skipped: [
    { code: 'RL.6.8', reason: NOT_LITERATURE },
    {
      code: 'WHST.6-8.3',
      reason:
        'Placeholder row, not a standard: it says only that the standard is not a separate requirement and points to a note. Found after the decision on the other 13 placeholder rows and treated the same way.',
    },
  ],
  batchKey: 'Domain',
  batches: [
    { name: 'english-language-arts', values: ['Reading: Literature', 'Reading: Informational Text', 'Writing', 'Speaking and Listening', 'Language'], size: 41 },
    {
      name: 'literacy-grades-6-to-8',
      values: ['Reading: Literacy in History/Social Studies', 'Reading: Literacy in Science and Technical Subjects', 'Writing: Literacy in History/Social Studies, Science, and Technical Subjects'],
      size: 29,
    },
  ],
  notes:
    'The literacy standards for grades 6 to 8 are one band in the adopted document and apply to grade 6, so they are recorded here; their code scope names the 6-8 band.',
}

// --- science ----------------------------------------------------------------

const SCIENCE_GRANULARITY =
  'One record is one performance expectation. The Description column packs a whole page into one field under labels; only the paragraph labelled Performance Expectation is the standard, with its bracketed clarification statement and assessment boundary inline. The discipline is the second Content Area column. The export drops the double asterisk the PDF puts on California clarification statements, so that flag is set from the PDF; a single asterisk (engineering integration) is kept.'

const BAND_ENGINEERING = 'Band-level engineering design expectation, which the export repeats under every grade of its band: recorded once, in the cross-grade science lane.'

function scienceLane(grade: Grade, counted: readonly Domain[], rows: number, band: string, check: string, checkNote: string): Lane {
  const count = total(counted)
  return {
    jurisdiction: 'us-ca',
    level: grade.level,
    subject: 'science',
    title: `${grade.name} science`,
    sources: [SCIENCE_EXPORT, check],
    parts: [
      {
        name: `Science export, ${grade.name.toLowerCase()} rows`,
        source: SCIENCE_EXPORT,
        checkRendition: check,
        checkStrength: 'second-rendition',
        checkGranularity: `The department's document for the grade, arranged by disciplinary core idea, read with pdftotext -layout. Same granularity: one performance expectation per code. All ${rows} codes of the export's rows for the grade are in it, none missing on either side. It prints the engineering codes with an en dash (${band === 'K-2' ? 'K–2' : '3–5'}-ETS1-1) and marks California clarification statements with a double asterisk. ${checkNote}`,
        expectedCount: count,
        selection: { kind: 'rows', codeColumn: 'Standard Identifier', domainColumn: 'Content Area#2', where: { 'Grade Range': [grade.range] } },
      },
    ],
    expectedCount: count,
    countingMethod: `Rows of the science export whose Grade Range is ${grade.range}: ${rows}. Less the three engineering design expectations of the ${band} band, listed as skipped: ${count}. Cross-checked against the codes printed in the grade's document.`,
    countIsFromImportFile: true,
    domains: counted,
    granularity: SCIENCE_GRANULARITY,
    skipped: [1, 2, 3].map((n) => ({ code: `${band}-ETS1-${n}`, reason: BAND_ENGINEERING })),
  }
}

const SCIENCE_K_TO_5_LANES: readonly Lane[] = [
  scienceLane(
    K,
    domains(['Physical Science', 4], ['Life Science', 1], ['Earth and Space Science', 5]),
    13,
    'K-2',
    SCIENCE_K_PDF,
    'Its text layer has stray spaces inside words, which a wording comparison must tolerate. No double asterisk in this grade.',
  ),
  scienceLane(G1, domains(['Physical Science', 4], ['Life Science', 3], ['Earth and Space Science', 2]), 12, 'K-2', SCIENCE_1_PDF, 'Plain mode finds only 10 of the 12 codes at the start of a row.'),
  scienceLane(G4, domains(['Physical Science', 7], ['Life Science', 2], ['Earth and Space Science', 5]), 17, '3-5', SCIENCE_4_PDF, '18 double asterisks in the file.'),
  scienceLane(
    G5,
    domains(['Physical Science', 6], ['Life Science', 2], ['Earth and Space Science', 5]),
    16,
    '3-5',
    SCIENCE_5_PDF,
    'One code, 5-PS2-1, sits alone on its line in both text modes, detached from its statement. 22 double asterisks in the file.',
  ),
]

const SCIENCE_6_STATEMENTS: readonly StatementRef[] = [
  ...[1, 2, 3].map((n) => ({ group: 'MS-LS1 From Molecules to Organisms: Structures and Processes', code: `MS-LS1-${n}`, page: 1 })),
  ...[4, 5, 8].map((n) => ({ group: 'MS-LS1 From Molecules to Organisms: Structures and Processes', code: `MS-LS1-${n}`, page: 2 })),
  { group: 'MS-LS3 Heredity: Inheritance and Variation of Traits', code: 'MS-LS3-2', page: 6 },
  ...[4, 5, 6].map((n) => ({ group: 'MS-ESS2 Earth’s Systems', code: `MS-ESS2-${n}`, page: 8 })),
  { group: 'MS-ESS3 Earth and Human Activity', code: 'MS-ESS3-3', page: 11 },
  { group: 'MS-ESS3 Earth and Human Activity', code: 'MS-ESS3-5', page: 11, note: 'Printed in places with an en dash before the last number.' },
  { group: 'MS-PS3 Energy', code: 'MS-PS3-3', page: 14 },
  { group: 'MS-PS3 Energy', code: 'MS-PS3-4', page: 14 },
  { group: 'MS-PS3 Energy', code: 'MS-PS3-5', page: 14, note: 'Printed in places with an en dash before the last number.' },
  ...[1, 2, 3, 4].map((n) => ({ group: 'MS-ETS1 Engineering Design', code: `MS-ETS1-${n}`, page: 17 })),
]

const SCIENCE_6_LANE: Lane = {
  jurisdiction: 'us-ca',
  level: 'grade-6',
  subject: 'science',
  title: 'Grade 6 science',
  sources: [SCIENCE_6_PDF, SCIENCE_EXPORT],
  parts: [
    {
      name: 'Preferred Integrated Course Model, grade 6',
      source: SCIENCE_6_PDF,
      checkRendition: SCIENCE_EXPORT,
      checkStrength: 'second-rendition',
      checkGranularity:
        'The science export, whose 59 rows with Grade Range 6-8 (Min Grade 6, Max Grade 8) hold every middle school expectation, not split by grade. All 19 grade 6 codes are among them; the other 40 belong to grades 7 and 8 in the integrated model and are ignored. Same granularity. The export lacks the double asterisks, and eight of its middle school identifiers carry a trailing space or period.',
      expectedCount: SCIENCE_6_STATEMENTS.length,
      selection: {
        kind: 'statements',
        pages: [[1, 19]],
        locate:
          'Read with pdftotext -layout, which keeps each code on the line its statement starts on; plain mode lists the codes of a page first and the statements after. A record is one performance expectation: the code that starts a row under the line that introduces the expectations, and the statement that follows it, with its bracketed clarification statement and assessment boundary. The three boxes below (practices, core ideas, crosscutting concepts) run side by side and are not part of it. A single asterisk after an expectation marks engineering integration; a double asterisk marks a California clarification statement.',
        statements: SCIENCE_6_STATEMENTS,
      },
    },
  ],
  expectedCount: SCIENCE_6_STATEMENTS.length,
  countingMethod:
    'Distinct performance expectation codes that start a row in the grade 6 document of the Preferred Integrated Course Model (pdftotext -layout): 19. Counted in the PDF, not in the export, which does not say which middle school expectations belong to grade 6.',
  countIsFromImportFile: false,
  domains: domainsOf(SCIENCE_6_STATEMENTS),
  granularity:
    'One record is one performance expectation. The codes are middle school codes with no grade in them; the grade placement exists only in this document. The four MS-ETS1 expectations belong to the whole 6-8 band and are recorded here, as this document prints them.',
  skipped: [],
  notes:
    'Grade 6 science follows the Preferred Integrated Course Model, one of two course models for grades 6 to 8. The other, the discipline-specific model, is not recorded. The export the lane is checked against differs from this document in three records, in small ways beyond the double asterisks it lacks: in MS-ESS2-5 one word of the export is a letter shorter, in MS-LS1-2 the export has an article more, and in MS-LS1-1 it lacks the parenthesis California added to the clarification statement. The records follow this document.',
}

// --- practical life and feelings: health education ---------------------------

const HEALTH_GRANULARITY =
  'One record is one export row: one statement per code, no sub-parts. A code is grade, overarching standard, number and content-area letter (K.1.1.A). The content area is the second Content Area column, and the overarching standard has its own column. Description is the standard and, in some rows, a footnote. Not every content area is assigned to every grade.'

const HEALTH_NOTES =
  'Health education is the only State Board-adopted material for this subject in kindergarten to grade 6. There is no adopted standard for self-care, social-emotional learning or approaches to learning; the voluntary social-emotional competencies are in the cross-grade lane.'

function healthLane(grade: Grade, counted: readonly Domain[], checkNote: string, batches?: readonly Batch[]): Lane {
  const count = total(counted)
  return {
    jurisdiction: 'us-ca',
    level: grade.level,
    subject: 'practical-life-feelings',
    title: `${grade.name} practical life and feelings`,
    sources: [HEALTH_EXPORT, HEALTH_PDF],
    parts: [
      {
        name: `Health education export, ${grade.name.toLowerCase()} rows`,
        source: HEALTH_EXPORT,
        checkRendition: HEALTH_PDF,
        checkStrength: 'second-rendition',
        checkGranularity: `The adopted PDF, read in plain mode. Same granularity, one statement per code: ${count} codes under the grade's page header and ${count} rows in the export, none missing on either side${checkNote}. The PDF prints a code without its grade (1.1.N under the grade's header), so the same printed code recurs in several grades; the export adds the grade.`,
        expectedCount: count,
        selection: { kind: 'rows', codeColumn: 'Standard Identifier', domainColumn: 'Content Area#2', where: { 'Grade Range': [grade.healthRange] } },
      },
    ],
    expectedCount: count,
    countingMethod: `Rows of the health education export whose Grade Range is ${grade.healthRange} (Min Grade and Max Grade ${grade.number}): ${count}. Cross-checked code by code against the adopted PDF.`,
    countIsFromImportFile: true,
    domains: counted,
    granularity: HEALTH_GRANULARITY,
    skipped: [],
    ...(batches === undefined ? {} : { batchKey: 'Content Area#2', batches }),
    notes: HEALTH_NOTES,
  }
}

const HEALTH_LANES: readonly Lane[] = [
  healthLane(
    K,
    domains(
      ['Alcohol, Tobacco, and Other Drugs', 5],
      ['Growth and Development', 6],
      ['Injury, Prevention, and Safety', 21],
      ['Mental, Emotional, and Social Health', 13],
      ['Nutrition and Physical Activity', 10],
      ['Personal and Community Health', 9],
    ),
    ', once the malformed identifier K7.3.N in the export is read as K.7.3.N',
    [
      { name: 'safety-drugs-growth', values: ['Injury, Prevention, and Safety', 'Alcohol, Tobacco, and Other Drugs', 'Growth and Development'], size: 32 },
      { name: 'mind-food-community', values: ['Mental, Emotional, and Social Health', 'Nutrition and Physical Activity', 'Personal and Community Health'], size: 32 },
    ],
  ),
  healthLane(G1, domains(['Growth and Development', 6], ['Injury, Prevention, and Safety', 25], ['Personal and Community Health', 22]), ''),
  healthLane(G4, domains(['Alcohol, Tobacco, and Other Drugs', 14], ['Injury, Prevention, and Safety', 48], ['Nutrition and Physical Activity', 23]), '', [
    { name: 'safety', values: ['Injury, Prevention, and Safety'], size: 48 },
    { name: 'drugs-food', values: ['Alcohol, Tobacco, and Other Drugs', 'Nutrition and Physical Activity'], size: 37 },
  ]),
  healthLane(G5, domains(['Growth, Development, and Sexual Health', 24], ['Nutrition and Physical Activity', 27], ['Personal and Community Health', 18]), '', [
    { name: 'growth-community', values: ['Growth, Development, and Sexual Health', 'Personal and Community Health'], size: 42 },
    { name: 'food', values: ['Nutrition and Physical Activity'], size: 27 },
  ]),
  healthLane(
    G6,
    domains(['Alcohol, Tobacco, and Other Drugs', 20], ['Injury, Prevention, and Safety', 28], ['Mental, Emotional, and Social Health', 28]),
    ', once the trailing space on the identifier 6.8.1.M in the export is trimmed',
    [
      { name: 'drugs-safety', values: ['Alcohol, Tobacco, and Other Drugs', 'Injury, Prevention, and Safety'], size: 48 },
      { name: 'mind', values: ['Mental, Emotional, and Social Health'], size: 28 },
    ],
  ),
]

// ---------------------------------------------------------------------------
// Cross-grade: statements that hold for every grade and that the row exports
// omit or repeat (plan KTD14).
// ---------------------------------------------------------------------------

const PRACTICES = 'Standards for Mathematical Practice'

const PRACTICE_STATEMENTS: readonly StatementRef[] = [13, 13, 13, 14, 14, 14, 14, 15].map((page, index) => ({ group: PRACTICES, code: String(index + 1), page }))

const CROSS_GRADE_MATH: Lane = {
  jurisdiction: 'us-ca',
  level: 'cross-grade',
  subject: 'mathematics',
  title: 'Cross-grade mathematics',
  sources: [MATH_PDF],
  parts: [
    {
      name: PRACTICES,
      source: MATH_PDF,
      checkRendition: SAME_FILE,
      checkStrength: 'second-reading',
      checkGranularity:
        'Only this PDF holds the full text; the export has no row for the practices. The check is a second reading of the same pages. The grade overviews of the same file repeat the eight titles, without the descriptions, in a box.',
      expectedCount: 8,
      selection: {
        kind: 'statements',
        pages: [[13, 15]],
        locate:
          "Read with pdftotext in plain mode. The section prints the practices numbered 1) to 8). A record is one practice: its title sentence and the paragraph under it. California's addition CA 3.1, printed after practice 3 and marked for higher mathematics only, is not part of practice 3 and is left out.",
        statements: PRACTICE_STATEMENTS,
      },
    },
  ],
  expectedCount: 8,
  countingMethod: 'Numbered practices in the Standards for Mathematical Practice section of the adopted PDF (PDF pages 13 to 15, printed pages 6 to 8): eight, 1) to 8).',
  countIsFromImportFile: false,
  domains: domainsOf(PRACTICE_STATEMENTS),
  granularity:
    'One record is one practice. The section prints a bare number with a bracket, 1) to 8); the boxes in the grade overviews print 1. to 8.; the citation style MP.1 does not appear in the section. A code needs the section as its scope.',
  skipped: [],
}

const ANCHORS = 'College and Career Readiness Anchor Standards for'

const anchors = (strand: string, letters: string, count: number, page: number): StatementRef[] =>
  Array.from({ length: count }, (_, index) => ({ group: `${ANCHORS} ${strand}`, code: `${letters}.CCR.${index + 1}`, page }))

const ANCHOR_STATEMENTS: readonly StatementRef[] = [...anchors('Reading', 'R', 10, 16), ...anchors('Writing', 'W', 10, 26), ...anchors('Speaking and Listening', 'SL', 6, 32), ...anchors('Language', 'L', 6, 37)]

const CROSS_GRADE_READING: Lane = {
  jurisdiction: 'us-ca',
  level: 'cross-grade',
  subject: 'reading-language',
  title: 'Cross-grade reading and language',
  sources: [ELA_PDF],
  parts: [
    {
      name: 'College and Career Readiness Anchor Standards',
      source: ELA_PDF,
      checkRendition: SAME_FILE,
      checkStrength: 'second-reading',
      checkGranularity:
        'Only this document prints the anchor standards; the export has no row for them. The same file prints the four sets again in its section for grades 6 to 12 (PDF pages 52, 61, 71 and 76), and Reading and Writing a third time in its literacy section (pages 86 and 91). The second reading compares the printing for kindergarten to grade 5 with those.',
      expectedCount: 32,
      selection: {
        kind: 'statements',
        pages: [
          [16, 16],
          [26, 26],
          [32, 32],
          [37, 37],
        ],
        locate:
          'Each strand has one page of numbered items under cluster headings. The pages are two columns and plain mode returns the items out of order, so read them by word position. A record is one numbered item. The asterisked footnotes on two of the pages are not part of it.',
        statements: ANCHOR_STATEMENTS,
      },
    },
  ],
  expectedCount: 32,
  countingMethod:
    'Numbered items on the four anchor standard pages of the section for kindergarten to grade 5 of the adopted PDF: Reading 10 (PDF page 16), Writing 10 (page 26), Speaking and Listening 6 (page 32), Language 6 (page 37).',
  countIsFromImportFile: false,
  domains: domainsOf(ANCHOR_STATEMENTS),
  granularity:
    'One record is one anchor standard. On the page each is a bare number, 1. to 10., so the number 1 occurs four times. The document says an anchor is cited by strand, CCR and number (R.CCR.6), and that form is the code here. No sub-parts.',
  skipped: [],
}

const ENGINEERING = 'Engineering, Technology, and Applications of Science'

const bandPart = (band: string, printed: string, grade: Grade, check: string): LanePart => ({
  name: `Engineering design, ${band} band`,
  source: SCIENCE_EXPORT,
  checkRendition: check,
  checkStrength: 'second-rendition',
  checkGranularity: `The department's ${grade.name.toLowerCase()} document arranged by disciplinary core idea, read with pdftotext -layout, prints the band's three expectations. Same granularity. It prints the codes with an en dash (${printed}-ETS1-1). The documents of the band's other grades print them too.`,
  expectedCount: 3,
  // Read once, under one grade of the band; the export repeats the rows under the others.
  selection: { kind: 'rows', codeColumn: 'Standard Identifier', domainColumn: 'Content Area#2', where: { 'Grade Range': [grade.range] }, codePrefixes: [`${band}-ETS1-`] },
})

const CROSS_GRADE_SCIENCE: Lane = {
  jurisdiction: 'us-ca',
  level: 'cross-grade',
  subject: 'science',
  title: 'Cross-grade science',
  sources: [SCIENCE_EXPORT, SCIENCE_K_PDF, SCIENCE_4_PDF],
  parts: [bandPart('K-2', 'K–2', K, SCIENCE_K_PDF), bandPart('3-5', '3–5', G4, SCIENCE_4_PDF)],
  expectedCount: 6,
  countingMethod:
    'Rows of the science export whose code starts with K-2-ETS1- (three, read under kindergarten) or 3-5-ETS1- (three, read under grade 4). The export repeats each under every grade of its band with the same wording, so each is recorded once here and skipped in the grade lanes. Cross-checked against the kindergarten and grade 4 documents, which print the same three codes each.',
  countIsFromImportFile: true,
  domains: domains([ENGINEERING, 6]),
  granularity:
    'One record is one band-level engineering design expectation, read once although the export repeats it under every grade of its band. Its code scope names the band, K-2 or 3-5. The middle school band, MS-ETS1, is not here: the grade 6 document prints it, so it is in grade 6 science.',
  skipped: [],
  notes:
    'The science standards publish no other cross-grade statement. The science and engineering practices and the crosscutting concepts are dimensions folded into each expectation, not standards of their own.',
}

const OVERARCHING = 'Overarching health education content standards'
const SEL_BANDS = ['Early Elementary', 'Late Elementary', 'Middle School'] as const
// The row letters under each of the five competencies, in the document's order.
const SEL_ROWS: readonly (readonly [competency: string, letters: string])[] = [
  ['Self-Awareness', 'ABCDEFGH'],
  ['Self-Management', 'ABCDEFGH'],
  ['Social Awareness', 'ABCDEFG'],
  ['Relationship Skills', 'ABCDEFGH'],
  ['Responsible Decision-Making', 'ABCDEFG'],
]

const OVERARCHING_STATEMENTS: readonly StatementRef[] = Array.from({ length: 8 }, (_, index) => ({ group: OVERARCHING, code: String(index + 1), page: 66 }))

// One statement per cell of the three child bands, in table order. The group is the band, which is the batch key.
const SEL_STATEMENTS: readonly StatementRef[] = SEL_ROWS.flatMap(([, letters], competency) =>
  [...letters].flatMap((letter) =>
    SEL_BANDS.map((band, index): StatementRef => {
      const code = `${competency + 1}.${letter}.${index + 1}`
      return code === '5.D.2' ? { group: band, code, note: 'Printed 5.D.1., a duplicate of the Early Elementary code; it is the Late Elementary cell of row 5.D.' } : { group: band, code }
    }),
  ),
)

const CROSS_GRADE_PRACTICAL_LIFE: Lane = {
  jurisdiction: 'us-ca',
  level: 'cross-grade',
  subject: 'practical-life-feelings',
  title: 'Cross-grade practical life and feelings',
  sources: [HEALTH_PDF, SEL],
  parts: [
    {
      name: OVERARCHING,
      source: HEALTH_PDF,
      checkRendition: SAME_FILE,
      checkStrength: 'second-reading',
      checkGranularity:
        'The same PDF prints the eight standards twice: in its Appendix (PDF page 66) and, with a rationale under each, in its introduction (PDF pages 7 and 8, two columns, which plain mode returns out of order). The second reading compares the two printings. The health export repeats only their short names, in its Overarching Content Standard column.',
      expectedCount: OVERARCHING_STATEMENTS.length,
      selection: {
        kind: 'statements',
        pages: [[66, 66]],
        locate:
          'Read with pdftotext in plain mode. The Appendix prints the eight overarching standards in order, each as "Standard N:" with its title and one sentence. A record is the title and that sentence. The rationale printed under each standard in the introduction is not part of it.',
        statements: OVERARCHING_STATEMENTS,
      },
    },
    {
      name: 'Transformative SEL competencies: Early Elementary, Late Elementary and Middle School',
      source: SEL,
      checkRendition: SAME_FILE,
      checkStrength: 'second-reading',
      checkGranularity:
        'A second reading of the same file. The department also publishes the competencies as web pages, which would be a second rendition, but its site answered every page request with a robot check on 2026-10-01.',
      expectedCount: SEL_STATEMENTS.length,
      selection: {
        kind: 'statements',
        locate:
          'Read word/document.xml. The competencies are 15 tables (5 competencies, each under Identity, Belonging and Agency) with five columns: Early Elementary, Late Elementary, Middle School, High School, Adult. A record is one cell of the first three columns. Its printed code starts the cell (1.A.1.: competency, row letter, band number), and two cells have no space after the code. The second half of the file, Conditions for Thriving, is addressed to adults and is left out.',
        statements: SEL_STATEMENTS,
      },
    },
  ],
  expectedCount: OVERARCHING_STATEMENTS.length + SEL_STATEMENTS.length,
  countingMethod:
    "Health: the headings Standard 1 to Standard 8 in the Appendix of the adopted PDF (PDF page 66), printed again in its introduction: eight. Transformative SEL: the non-empty cells of the Early Elementary, Late Elementary and Middle School columns across the 15 competency tables of the department's document: 38 per band (8, 8, 7, 8 and 7 rows for the five competencies), 114 for the three bands.",
  countIsFromImportFile: false,
  domains: [{ name: OVERARCHING, count: OVERARCHING_STATEMENTS.length }, ...SEL_ROWS.map(([competency, letters]) => ({ name: `Transformative SEL / ${competency}`, count: letters.length * SEL_BANDS.length }))],
  granularity:
    'Two standings in one lane, so each record takes its standing from its source: the eight overarching health standards are State Board-adopted, and the Transformative SEL cells are voluntary guidance. A health record is one overarching standard: its title and its one sentence. A SEL record is one table cell, whose printed code starts the cell.',
  skipped: [],
  batchKey: 'group',
  batches: [
    { name: 'health-overarching', values: [OVERARCHING], size: 8 },
    { name: 'sel-early-elementary', values: ['Early Elementary'], size: 38 },
    { name: 'sel-late-elementary', values: ['Late Elementary'], size: 38 },
    { name: 'sel-middle-school', values: ['Middle School'], size: 38 },
  ],
  gaps: [
    {
      source: SEL,
      gap: 'Without the Transformative SEL document the lane holds only the eight overarching health standards. Its 114 voluntary competency records are missing, and the coverage report says so.',
    },
  ],
  notes:
    "The department's document does not say which grades a Transformative SEL band covers, so the three child bands are recorded here and in no grade lane. The High School and Adult bands are left out.",
}

// ---------------------------------------------------------------------------
// Every California lane: 8 levels by 4 subjects.
// ---------------------------------------------------------------------------

export const US_CA_LANES: readonly Lane[] = [
  ...INFANT_TODDLER_LANES,
  ...PRESCHOOL_LANES,
  ...MATH_LANES,
  ...ELA_K_TO_5_LANES,
  ELA_6_LANE,
  ...SCIENCE_K_TO_5_LANES,
  SCIENCE_6_LANE,
  ...HEALTH_LANES,
  CROSS_GRADE_MATH,
  CROSS_GRADE_READING,
  CROSS_GRADE_SCIENCE,
  CROSS_GRADE_PRACTICAL_LIFE,
]

// ---------------------------------------------------------------------------
// Official domains left out.
// ---------------------------------------------------------------------------

const OUTSIDE = 'Outside the four subjects.'

const leftOut = (level: string, domain: string, reason: string): LeftOut => ({ jurisdiction: 'us-ca', level, domain, reason })

// The other subject areas of kindergarten to grade 6, as the standards search
// tool's own menu lists them. Their documents were not fetched.
const OTHER_SUBJECT_AREAS: readonly (readonly [domain: string, reason: string])[] = [
  ['Arts', OUTSIDE],
  ['Career Technical Education', OUTSIDE],
  ['Computer Science', OUTSIDE],
  ['English Language Development', 'Outside the four subjects: English language development is deferred by the plan.'],
  ['History–Social Science', OUTSIDE],
  ['Physical Education', OUTSIDE],
  ['School Library', OUTSIDE],
  ['World Languages', OUTSIDE],
]

export const US_CA_LEFT_OUT: readonly LeftOut[] = [
  leftOut('infant-toddler', 'Perceptual and Motor Development (3 foundations: 1.1 Perceptual Development, 2.1 Gross Motor Development, 2.2 Fine Motor Development)', OUTSIDE),
  leftOut(
    'infant-toddler',
    'The indicators for 4 through 11 months and 11 through 23 months of every foundation, and the first-four-months description of every strand',
    'Age periods below age 2, where the pack starts. Each record holds the foundation statement and its indicator for 23 through 36 months only.',
  ),
  leftOut('preschool-tk', 'Physical Development (17 foundations)', OUTSIDE),
  leftOut('preschool-tk', 'History–Social Science (26 foundations)', OUTSIDE),
  leftOut('preschool-tk', 'Visual and Performing Arts (34 foundations)', OUTSIDE),
  leftOut(
    'preschool-tk',
    'English Language Development, a sub-domain of Language and Literacy Development (23 foundations at three levels)',
    'Outside the four subjects: English language development is deferred by the plan.',
  ),
  ...[K, G1, G4, G5, G6].flatMap((grade) => OTHER_SUBJECT_AREAS.map(([domain, reason]) => leftOut(grade.level, domain, reason))),
  leftOut(
    'grade-6',
    'Science, the discipline-specific course model for grades 6 to 8',
    'The alternative to the Preferred Integrated Course Model, which is the canonical rendition for grade 6 science. Not fetched.',
  ),
  leftOut('cross-grade', 'Transformative SEL: the High School and Adult bands (38 cells each)', 'Outside the age range of the pack.'),
  leftOut('cross-grade', 'Transformative SEL: Conditions for Thriving', 'Guidance addressed to adults in five roles, not statements about children.'),
  leftOut('cross-grade', 'Mathematics: the practice standard addition CA 3.1', 'Marked for higher mathematics only.'),
  leftOut(
    'cross-grade',
    'English language arts: the appendices and the pages on text range, quality and complexity (Standard 10)',
    'Supporting material of the adopted document, not standards statements.',
  ),
]
