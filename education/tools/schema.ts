// The shape of a record, defined once: the three kinds and their fields, the
// id scheme, the closed vocabularies per jurisdiction, and the owned regions
// of an objective's body. The parser, the validator and every later tool read
// it from here. The format follows the Tada education pack plan; each
// departure is listed in education/docs/TADA-DELTAS.md.

// ---------------------------------------------------------------------------
// Selectors and vocabularies. All of it is data: change a list here and the
// validator follows.
// ---------------------------------------------------------------------------

export const JURISDICTIONS = ['us-ca', 'nl'] as const
export type Jurisdiction = (typeof JURISDICTIONS)[number]

export const SUBJECTS = ['mathematics', 'reading-language', 'science', 'practical-life-feelings'] as const
export type Subject = (typeof SUBJECTS)[number]

export const LEVELS: Record<Jurisdiction, readonly string[]> = {
  'us-ca': ['infant-toddler', 'preschool-tk', 'kindergarten', 'grade-1', 'grade-4', 'grade-5', 'grade-6', 'cross-grade'],
  nl: ['peuters', 'fase-1', 'fase-2', 'fase-3', 'einde-po'],
}

// The level of a lane from the title the open data gives it: "fase 2" is fase-2.
export const levelSlug = (title: string): string => title.trim().replace(/\s+/g, '-')

export const KINDS = ['source', 'frame', 'objective'] as const
export type Kind = (typeof KINDS)[number]

// What the publisher says a statement is. A standing from the other
// jurisdiction's list is an error.
export const STANDINGS: Record<Jurisdiction, readonly string[]> = {
  'us-ca': ['state-board-adopted-standard', 'department-published-foundation', 'voluntary-guidance'],
  nl: ['legal-core-goal', 'legal-reference-level', 'legal-aim-for-childcare', 'curriculum-institute-guidance', 'draft-not-yet-in-force'],
}

// Which set of Dutch core goals a record belongs to. California has none.
export const REGIMES: Record<Jurisdiction, readonly string[]> = {
  'us-ca': [],
  nl: ['2006', '2026', '2027-draft'],
}

export const REUSE_POLICIES = ['verbatim', 'description-only'] as const
export type ReusePolicy = (typeof REUSE_POLICIES)[number]

// The policies a jurisdiction's sources may carry. No California publisher
// grants this repo the right to reproduce its wording, so a California record
// is never verbatim; change this list only with a publisher's terms in hand.
export const REUSE_POLICIES_BY_JURISDICTION: Record<Jurisdiction, readonly ReusePolicy[]> = {
  'us-ca': ['description-only'],
  nl: ['verbatim', 'description-only'],
}

export const CONTENT_LANGUAGES = ['en', 'nl'] as const
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number]

export const PIN_KINDS = ['bytes', 'extracted-text', 'git-commit'] as const
export type PinKind = (typeof PIN_KINDS)[number]

// How one part of a lane is checked: against a different official file, or by
// reading the same file again.
export const CHECK_STRENGTHS = ['second-rendition', 'second-reading'] as const
export type CheckStrength = (typeof CHECK_STRENGTHS)[number]

// How a lane is checked, on its frame: as its parts are, or `mixed` when some
// parts have a second rendition and some only a second reading.
export const FRAME_CHECK_STRENGTHS = [...CHECK_STRENGTHS, 'mixed'] as const
export type FrameCheckStrength = (typeof FRAME_CHECK_STRENGTHS)[number]

// The check rendition of a lane part, in the manifest, when the second check
// reads the same file again. A frame does not list it.
export const SAME_FILE = 'same-file'

// ---------------------------------------------------------------------------
// Ids and paths.
//
//   objective  edu.<jurisdiction>.<level>.<subject>.objective.<slug>
//              corpus/<jurisdiction>/<level>/<subject>/objectives/<slug>.md
//   frame      edu.<jurisdiction>.<level>.<subject>.frame.lane
//              corpus/<jurisdiction>/<level>/<subject>/frame.md
//   source     edu.<jurisdiction>.source.<slug>
//              sources/<slug>.md
//
// Paths are relative to education/ and use forward slashes.
// ---------------------------------------------------------------------------

export const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*'
const JURISDICTION = JURISDICTIONS.join('|')
const SOURCE_ID = new RegExp(`^edu\\.(${JURISDICTION})\\.source\\.(${SLUG})$`)
const LANE_ID = new RegExp(`^edu\\.(${JURISDICTION})\\.(${SLUG})\\.(${SLUG})\\.(frame|objective)\\.(${SLUG})$`)

// A lane has one frame, so a frame's slug is always this.
export const FRAME_SLUG = 'lane'

export type RecordId =
  | { kind: 'source'; jurisdiction: Jurisdiction; slug: string }
  | { kind: 'frame' | 'objective'; jurisdiction: Jurisdiction; level: string; subject: string; slug: string }

export function sourceId(jurisdiction: Jurisdiction, slug: string): string {
  return `edu.${jurisdiction}.source.${slug}`
}

export function frameId(jurisdiction: Jurisdiction, level: string, subject: string): string {
  return `edu.${jurisdiction}.${level}.${subject}.frame.${FRAME_SLUG}`
}

export function objectiveId(jurisdiction: Jurisdiction, level: string, subject: string, slug: string): string {
  return `edu.${jurisdiction}.${level}.${subject}.objective.${slug}`
}

// The parts of an id, or null when it is not in the scheme. The level and
// subject are not checked against the vocabularies here; the validator does.
export function parseId(id: string): RecordId | null {
  const source = SOURCE_ID.exec(id)
  if (source) return { kind: 'source', jurisdiction: source[1] as Jurisdiction, slug: source[2]! }
  const lane = LANE_ID.exec(id)
  if (!lane) return null
  const kind = lane[4] as 'frame' | 'objective'
  if (kind === 'frame' && lane[5] !== FRAME_SLUG) return null
  return { kind, jurisdiction: lane[1] as Jurisdiction, level: lane[2]!, subject: lane[3]!, slug: lane[5]! }
}

// A lane as it is named everywhere in the pack: <jurisdiction>/<level>/<subject>.
export function laneKey(lane: { jurisdiction: string; level: string; subject: string }): string {
  return `${lane.jurisdiction}/${lane.level}/${lane.subject}`
}

// The one path a record with this id belongs at, or null for an id outside the scheme.
export function pathForId(id: string): string | null {
  const parts = parseId(id)
  if (!parts) return null
  if (parts.kind === 'source') return `sources/${parts.slug}.md`
  const lane = `corpus/${laneKey(parts)}`
  return parts.kind === 'frame' ? `${lane}/frame.md` : `${lane}/objectives/${parts.slug}.md`
}

// A slug made of text, such as a statement's group and code: lower case,
// accents dropped, each run of anything else one hyphen.
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ---------------------------------------------------------------------------
// Frontmatter per kind. The order of each list is the order the keys are
// written in.
// ---------------------------------------------------------------------------

export type SourceFrontmatter = {
  id: string
  kind: 'source'
  title: string
  publisher: string
  jurisdiction: Jurisdiction
  url: string
  landing_url?: string
  // The document's version as the publisher states it.
  version: string
  retrieved_on: string
  revalidate_after?: string
  media_type: string
  reuse_policy: ReusePolicy
  // The publisher's own words on reuse, and where they are published.
  terms_quote: string
  terms_url: string
  // A required source that cannot be fetched stops the build.
  required: boolean
  pin_kind: PinKind
  // A sha256, or a commit for `git-commit`. Empty before the first fetch.
  pin: string
  standing: string
  regime?: string
}

export type FrameFrontmatter = {
  id: string
  kind: 'frame'
  title: string
  jurisdiction: Jurisdiction
  level: string
  subject: Subject
  sources: string[]
  expected_count: number
  counting_method: string
  // The id of every source record the second check reads that is not a part's
  // own canonical file. Empty when every part is read again in the same file.
  check_renditions: string[]
  check_strength: FrameCheckStrength
  nothing_published: boolean
  status: 'draft'
}

// Every field here is written by an importer. The pack's own text is in body regions only.
export type ObjectiveFrontmatter = {
  id: string
  kind: 'objective'
  title: string
  jurisdiction: Jurisdiction
  level: string
  subject: Subject
  content_language: ContentLanguage
  curriculum_version: string
  effective_from?: string
  status: 'draft'
  authority: 'official'
  // The official code as printed. Empty when the source prints none, except
  // for a bullet of a Dutch young-child card: the cards print no codes, and
  // such a record carries the pack's own, "<sub-heading> / <position>".
  code: string
  // normaliseCode(code): the lookup key.
  code_key: string
  // The document and domain the code is unique in.
  code_scope: string
  parent_code?: string
  california_addition?: boolean
  age_band?: string
  standing: string
  regime?: string
  reuse_policy: ReusePolicy
  // The id of the source record the wording was read from.
  source: string
  locator: string
  // wordingHash of the official wording, whether or not the wording is committed.
  wording_sha256: string
  // wordingHash of the official text that accompanies the statement without
  // being part of it: a footnote, a clarification, a boundary, an example. The
  // text is in the store. A verbatim record also holds it in its file, in the
  // official wording region under the line accompanyingLine() makes; a
  // description-only record never does. Absent when the source prints none.
  supplement_sha256?: string
}

export interface Field {
  name: string
  type: 'string' | 'boolean' | 'integer' | 'strings'
  optional?: true
  // For a string, or each string of a list: the closed set it is one of, or
  // the pattern it matches (`expects` says what that is). A string with
  // neither must not be empty, unless `blank` allows it.
  values?: readonly string[]
  pattern?: RegExp
  expects?: string
  blank?: true
}

const ISO_DATE = { pattern: /^\d{4}-\d{2}-\d{2}$/, expects: 'a date as YYYY-MM-DD' } as const
export const SHA256 = { pattern: /^[0-9a-f]{64}$/, expects: 'a sha256 in lowercase hex' } as const
const A_SOURCE_ID = { pattern: SOURCE_ID, expects: 'a source id (edu.<jurisdiction>.source.<slug>)' } as const
const URL = { pattern: /^https?:\/\/\S+$/, expects: 'an http or https link' } as const

// `id`, `level`, `standing` and `regime` are plain strings here: the validator
// checks them against the id scheme and the jurisdiction's vocabulary.
export const FIELDS: Record<Kind, readonly Field[]> = {
  source: [
    { name: 'id', type: 'string' },
    { name: 'kind', type: 'string', values: ['source'] },
    { name: 'title', type: 'string' },
    { name: 'publisher', type: 'string' },
    { name: 'jurisdiction', type: 'string', values: JURISDICTIONS },
    { name: 'url', type: 'string', ...URL },
    { name: 'landing_url', type: 'string', optional: true, ...URL },
    { name: 'version', type: 'string' },
    { name: 'retrieved_on', type: 'string', ...ISO_DATE },
    { name: 'revalidate_after', type: 'string', optional: true, ...ISO_DATE },
    { name: 'media_type', type: 'string' },
    { name: 'reuse_policy', type: 'string', values: REUSE_POLICIES },
    { name: 'terms_quote', type: 'string' },
    { name: 'terms_url', type: 'string', ...URL },
    { name: 'required', type: 'boolean' },
    { name: 'pin_kind', type: 'string', values: PIN_KINDS },
    { name: 'pin', type: 'string', blank: true, pattern: /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/, expects: 'a sha256 or a commit in lowercase hex, or empty before the first fetch' },
    { name: 'standing', type: 'string' },
    { name: 'regime', type: 'string', optional: true },
  ],
  frame: [
    { name: 'id', type: 'string' },
    { name: 'kind', type: 'string', values: ['frame'] },
    { name: 'title', type: 'string' },
    { name: 'jurisdiction', type: 'string', values: JURISDICTIONS },
    { name: 'level', type: 'string' },
    { name: 'subject', type: 'string', values: SUBJECTS },
    { name: 'sources', type: 'strings', ...A_SOURCE_ID },
    { name: 'expected_count', type: 'integer' },
    { name: 'counting_method', type: 'string' },
    { name: 'check_renditions', type: 'strings', ...A_SOURCE_ID },
    { name: 'check_strength', type: 'string', values: FRAME_CHECK_STRENGTHS },
    { name: 'nothing_published', type: 'boolean' },
    { name: 'status', type: 'string', values: ['draft'] },
  ],
  objective: [
    { name: 'id', type: 'string' },
    { name: 'kind', type: 'string', values: ['objective'] },
    { name: 'title', type: 'string' },
    { name: 'jurisdiction', type: 'string', values: JURISDICTIONS },
    { name: 'level', type: 'string' },
    { name: 'subject', type: 'string', values: SUBJECTS },
    { name: 'content_language', type: 'string', values: CONTENT_LANGUAGES },
    { name: 'curriculum_version', type: 'string' },
    { name: 'effective_from', type: 'string', optional: true, ...ISO_DATE },
    { name: 'status', type: 'string', values: ['draft'] },
    { name: 'authority', type: 'string', values: ['official'] },
    { name: 'code', type: 'string', blank: true },
    { name: 'code_key', type: 'string', blank: true },
    { name: 'code_scope', type: 'string' },
    { name: 'parent_code', type: 'string', optional: true },
    { name: 'california_addition', type: 'boolean', optional: true },
    { name: 'age_band', type: 'string', optional: true },
    { name: 'standing', type: 'string' },
    { name: 'regime', type: 'string', optional: true },
    { name: 'reuse_policy', type: 'string', values: REUSE_POLICIES },
    { name: 'source', type: 'string', ...A_SOURCE_ID },
    { name: 'locator', type: 'string' },
    { name: 'wording_sha256', type: 'string', ...SHA256 },
    { name: 'supplement_sha256', type: 'string', optional: true, ...SHA256 },
  ],
}

// The order a kind's frontmatter keys are written in.
export function fieldOrder(kind: Kind): string[] {
  return FIELDS[kind].map((field) => field.name)
}

// ---------------------------------------------------------------------------
// The body of an objective record: owned regions with fixed headings, in a
// fixed order. The importer owns the official wording; the other regions hold
// the pack's own text, and each of them opens with a marker saying whose text
// it is.
// ---------------------------------------------------------------------------

export const OFFICIAL_WORDING = '## Official wording'
export const SUMMARY = '## Summary'
export const ENGLISH_GLOSS = '## English gloss'
export const DESIGN_NOTES = '## Design notes'

export const REGION_ORDER = [OFFICIAL_WORDING, SUMMARY, ENGLISH_GLOSS, DESIGN_NOTES] as const
export type RegionHeading = (typeof REGION_ORDER)[number]

// The regions that hold the pack's own text: every region but the official wording.
export const OWN_REGIONS = [SUMMARY, ENGLISH_GLOSS, DESIGN_NOTES] as const
export type OwnRegionHeading = (typeof OWN_REGIONS)[number]

// The first line of each own region.
export const MARKERS: Record<OwnRegionHeading, string> = {
  [SUMMARY]: "_The pack's summary, not the official text._",
  [ENGLISH_GLOSS]: "_The pack's gloss, not an official translation._",
  [DESIGN_NOTES]: "_The pack's inference, not the official text._",
}

// The one line an own region holds, after its marker, until it is written.
export const PENDING = '_pending_'

// The one line a summary holds, after its marker, when a faithful summary
// would have to be the official wording itself.
export const NO_SUMMARY = 'No summary: a faithful one could not differ from the official wording.'

// The official wording region ends with a line that starts with this.
export const SOURCE_LINE_PREFIX = 'Source: '

// In the official wording region of a verbatim record, the official text that
// accompanies the statement stands after the wording and before the source
// line, under one line: these words, then in brackets what the text is and
// where it is printed, then a colon. It is official text and no part of the
// statement: `wording_sha256` is the hash of what stands above that line, and
// `supplement_sha256` of what stands below it.
export const ACCOMPANYING_PREFIX = 'Accompanying official text, not part of the statement'

export function accompanyingLine(note: string): string {
  return `${ACCOMPANYING_PREFIX} (${note.trim()}):`
}

export function isAccompanyingLine(row: string): boolean {
  return row.startsWith(`${ACCOMPANYING_PREFIX} (`) && row.trimEnd().endsWith('):')
}

// Written design notes hold exactly these, in this order, each with text.
export const DESIGN_NOTES_SUBHEADINGS = ["### In a child's hands", '### Limits', '### Common mistakes'] as const

// The regions an objective record holds, in order. Every other region is
// forbidden: official wording only when the source may be quoted, a summary
// only when it may not, a gloss only for Dutch.
export function regionsFor(reusePolicy: ReusePolicy, contentLanguage: ContentLanguage): RegionHeading[] {
  const regions: RegionHeading[] = [reusePolicy === 'verbatim' ? OFFICIAL_WORDING : SUMMARY]
  if (contentLanguage === 'nl') regions.push(ENGLISH_GLOSS)
  regions.push(DESIGN_NOTES)
  return regions
}
