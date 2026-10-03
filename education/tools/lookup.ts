// The lookup: how a game designer finds records (plan R16, KTD12, KTD15).
//
//   node education/tools/lookup.ts --jurisdiction us-ca --age 10 --subject mathematics
//   node education/tools/lookup.ts --jurisdiction nl --level fase-1
//   node education/tools/lookup.ts --code K.CC.4 [--jurisdiction us-ca]
//   node education/tools/lookup.ts --id edu.us-ca.kindergarten.mathematics.objective.k-cc-1
//
//   node education/tools/lookup.ts --help
//
// `--subject` may be left out for all four. With `--outline`, an answer by
// age or level lists each lane with its title and its number of records and
// no record: a by-age answer with its records is hundreds of kilobytes, and
// the outline says which lane to list next. `--json` prints the answer as
// JSON; a parser runs the tool with node, as above, or through
// `npm run --silent`, because npm prints the script name and the command
// first. `--wording` adds the official wording where the record file or the
// store has it, and after it the official text that accompanies the statement
// (a footnote, a clarification, a boundary, an example) where the record has
// such text and its file or the store holds it, and the source line of a
// record that holds its wording; the lookup never needs the store. Without
// `--wording`, an answer that lists a record whose wording is not in its file
// ends with one line that says how to get the wording, when the store is not
// on this machine.
//
// By age, the levels come out of the age table, then the lanes the table
// returns beside them (California's cross-grade lane, the Dutch end-of-primary
// goals), labelled as such. By id, the one record with that pack id, which is
// how the maps and the rules cite a record. By code, every record with that code is returned,
// each with its scope, because official codes are not unique; so are the
// sub-part records of a code that has no record of its own, and the record
// of the code a lettered sub-part without a record would stand under. A code
// is found whatever its punctuation and its capitals, and a sub-heading of a
// card whatever it holds in brackets; each result says how it was found, and
// the results that are the code as typed come first.
//
// The two jurisdictions are never in one list, and nothing here relates a
// record of one to a record of the other.
//
// The core is exported so lookup.test.ts can run it on invented records with
// the check states handed in.

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { levelsForAge } from '../ages.ts'
import type { AgeRow } from '../ages.ts'
import { MANIFEST } from '../manifest.ts'
import type { Lane } from '../manifest.ts'
import { FrontmatterError } from './frontmatter.ts'
import { normaliseCode } from './normalise.ts'
import { afterMarker, officialWording } from './record.ts'
import { joinTree } from './review-join.ts'
import type { CheckState, RecordState } from './review-join.ts'
import { ENGLISH_GLOSS, JURISDICTIONS, LEVELS, OFFICIAL_WORDING, PENDING, SUBJECTS, SUMMARY } from './schema.ts'
import type { Jurisdiction, ObjectiveFrontmatter, Subject } from './schema.ts'
import { FETCH_COMMAND, getWording, storeRoot } from './store.ts'
import { parsedRecord, readRecords } from './validate.ts'
import type { RecordText } from './validate.ts'

// The commands that read the fetched files and put each record's official
// wording in the store: the importers for the records read from an export,
// the legal text or the open data, the extraction for those located in a PDF
// or a document file.
const IMPORT_COMMAND = 'npm run education:import'
const EXTRACT_COMMAND = 'npm run education:extract'

const FILL_THE_STORE = `Run \`${FETCH_COMMAND}\`, then \`${IMPORT_COMMAND}\` and \`${EXTRACT_COMMAND}\`, to put it in the store.`
const NO_WORDING = `not on this machine. ${FILL_THE_STORE}`
// What an answer ends with when it lists a record whose wording is not in its
// file, the store is not on this machine, and the wording was not asked for.
export const NO_STORE = `The official wording of a record listed with a summary is not in its file, and the wording store is not on this machine. ${FILL_THE_STORE} \`--wording\` then prints it.`

// How much of a summary or gloss a record is listed with.
const START_LENGTH = 120

// ---------------------------------------------------------------------------
// What is asked, what it is asked of, and what comes back.
// ---------------------------------------------------------------------------

interface Wanted {
  // Also give the official wording of each record, where it can be had.
  wording?: boolean
}

interface Outlined {
  // List each lane with its number of records, and no record.
  outline?: boolean
}

export interface AgeQuery extends Wanted, Outlined {
  by: 'age'
  jurisdiction: Jurisdiction
  // Whole years, 2 to 12.
  age: number
  subject?: Subject
}

export interface LevelQuery extends Wanted, Outlined {
  by: 'level'
  jurisdiction: Jurisdiction
  level: string
  subject?: Subject
}

export interface IdQuery extends Wanted {
  by: 'id'
  // A pack id: edu.<jurisdiction>.<level>.<subject>.objective.<slug>.
  id: string
}

export interface CodeQuery extends Wanted {
  by: 'code'
  // The official code as someone would type it.
  code: string
  jurisdiction?: Jurisdiction
}

export type Query = AgeQuery | LevelQuery | CodeQuery | IdQuery

export interface Pack {
  // Every record file: readRecords(education).
  records: readonly RecordText[]
  // The check state of each record, by record id: joinTree(education).states.
  // A record it does not hold is unchecked.
  states: ReadonlyMap<string, RecordState>
  lanes: readonly Lane[]
  // The root of the wording store. It does not have to exist.
  store: string
}

export interface Entry {
  id: string
  // The record file, relative to education/.
  file: string
  jurisdiction: Jurisdiction
  level: string
  subject: string
  // As printed. Empty when the source prints none.
  code: string
  // What to know of the code where it does not say what it seems to: the
  // source gives it to more than one record, or its last part names another
  // fase than the one the record is at.
  codeNote?: string
  codeScope: string
  standing: string
  regime?: string
  state: CheckState
  reason?: string
  // Which of the pack's own texts `start` is the start of.
  region: 'summary' | 'gloss'
  // Null while that text is still pending.
  start: string | null
  // With `wording` asked for: the official wording, or `noWording`, the line
  // that says how to get it.
  wording?: string
  noWording?: string
  // With `wording` asked for: the official text that accompanies the
  // statement, for a record that has such text when the store holds it.
  supplement?: string
  // With `wording` asked for: the source line of a record that holds its
  // wording, whole. Wording is quoted only with this line.
  source?: string
}

export interface LaneAnswer {
  subject: Subject
  title?: string
  // The manifest's statement that the publisher publishes nothing here.
  nothingPublished?: string
  entries: Entry[]
}

export interface LevelAnswer {
  level: string
  // The part of the level that applies at the age asked about.
  subBand?: string
  // Set on a level the age table returns beside the age's own levels: the
  // label its records are listed under, and why it is returned.
  label?: string
  note?: string
  lanes: LaneAnswer[]
}

// What an answer by age or level says before its levels.
interface LanesHead {
  by: 'age' | 'level'
  jurisdiction: Jurisdiction
  age?: number
  subject?: Subject
  // By age: where the mapping of age to level comes from.
  basis?: AgeRow['basis']
  basisNote?: string
  // By age: what the pack does not hold for a child of this age. With no
  // levels, it is the statement that the age is not covered.
  gap?: string
}

export interface LanesAnswer extends LanesHead {
  levels: LevelAnswer[]
  // NO_STORE, when it applies.
  wordingHint?: string
}

// A lane of an outline: what a LaneAnswer says of it, with the number of its
// records in place of the records.
export interface LaneOutline extends Omit<LaneAnswer, 'entries'> {
  count: number
}

// An answer by age or level without its records.
export interface OutlineAnswer extends LanesHead {
  outline: true
  levels: (Omit<LevelAnswer, 'lanes'> & { lanes: LaneOutline[] })[]
}

// What of a typed code was set aside to find a record: how it is punctuated
// and spaced, its capitals, or what a card's sub-heading holds in brackets.
export type Ignored = 'punctuation' | 'capitals' | 'brackets'

export interface CodeMatch {
  // `exact`: the record has the code. `sub-part`: the code has no record of
  // its own and this is one of its parts. `contains`: the code ends in a
  // lettered part and has no record of its own in this scope, and this is the
  // record of the code without that part. Whether the source prints such a
  // part inside the record is not known here.
  relation: 'exact' | 'sub-part' | 'contains'
  // Absent when the record was found by the code as typed. With `exact` and
  // nothing ignored, the typed code is the printed one.
  ignored?: Ignored[]
  entry: Entry
}

export interface CodeAnswer {
  by: 'code'
  code: string
  // normaliseCode(code): what was compared.
  key: string
  jurisdiction?: Jurisdiction
  // One list per jurisdiction that has a match. Empty when nothing matches.
  // In a list, the records that have the code as typed come first, then
  // those found by a normalised form of it, then sub-parts, then containing records.
  jurisdictions: { jurisdiction: Jurisdiction; matches: CodeMatch[] }[]
  // NO_STORE, when it applies.
  wordingHint?: string
}

export interface IdAnswer {
  by: 'id'
  id: string
  // The record with that id. Absent when no record has it.
  entry?: Entry
  // NO_STORE, when it applies.
  wordingHint?: string
}

export type Answer = LanesAnswer | OutlineAnswer | CodeAnswer | IdAnswer

// ---------------------------------------------------------------------------
// Reading the records.
// ---------------------------------------------------------------------------

// A record as the lookup holds it: what it prints, and what it is found by.
interface Held {
  entry: Entry
  key: string
  parentKey: string | null
  // The key of the code without what it holds in brackets: the sub-heading
  // "Hoeveelheden (tot tenminste 20)" of a card is also found as "Hoeveelheden".
  bareKey: string
  // Whether the wording is kept out of the file (a description-only record).
  describedOnly: boolean
  // The official wording when the file holds it, the official text that accompanies it when the file holds that, and its source line.
  official: string | null
  accompanying: string | null
  sourceLine: string | null
  hash: string
  // The hash of the text that accompanies the statement, for a record that has such text.
  supplementHash: string | null
}

function startOf(content: string): string | null {
  const text = content.replace(/\s+/g, ' ').trim()
  if (text === '' || text === PENDING) return null
  return text.length > START_LENGTH ? `${text.slice(0, START_LENGTH).trimEnd()}…` : text
}

function hold(pack: Pack): Held[] {
  const held: Held[] = []
  for (const each of pack.records) {
    const { file } = each
    if (!file.startsWith('corpus/')) continue
    const record = parsedRecord(each)
    if (record instanceof FrontmatterError) throw record
    if (record.frontmatter.kind !== 'objective') continue
    const fields = record.frontmatter as unknown as ObjectiveFrontmatter
    const section = (heading: string) => record.sections.find((each) => each.heading === heading)
    // A Dutch record is listed by its gloss, every other record by its summary.
    const heading = section(ENGLISH_GLOSS) ? ENGLISH_GLOSS : SUMMARY
    const region = section(OFFICIAL_WORDING)
    const official = region ? officialWording(region.text) : null
    const state = pack.states.get(fields.id)
    held.push({
      entry: {
        id: fields.id,
        file,
        jurisdiction: fields.jurisdiction,
        level: fields.level,
        subject: fields.subject,
        code: fields.code,
        codeScope: fields.code_scope,
        standing: fields.standing,
        ...(fields.regime === undefined ? {} : { regime: fields.regime }),
        state: state?.state ?? 'unchecked',
        ...(state?.reason === undefined ? {} : { reason: state.reason }),
        region: heading === ENGLISH_GLOSS ? 'gloss' : 'summary',
        start: startOf(afterMarker(heading, section(heading)?.text ?? '')?.content ?? ''),
      },
      key: fields.code_key,
      parentKey: fields.parent_code === undefined ? null : normaliseCode(fields.parent_code),
      bareKey: normaliseCode(withoutBrackets(fields.code)),
      describedOnly: fields.reuse_policy === 'description-only',
      official: official?.wording ?? null,
      accompanying: official?.accompanying?.text ?? null,
      sourceLine: official?.source ?? null,
      hash: fields.wording_sha256,
      supplementHash: fields.supplement_sha256 ?? null,
    })
  }
  noteCodes(held)
  // Numbers in a code sort as numbers, so K.CC.2 comes before K.CC.10.
  const order = new Intl.Collator('en', { numeric: true })
  return held.sort((a, b) => order.compare(a.entry.codeScope, b.entry.codeScope) || order.compare(a.key, b.key) || order.compare(a.entry.id, b.entry.id))
}

// A code without what it holds in brackets.
function withoutBrackets(code: string): string {
  return code.replace(/\([^()]*\)/g, ' ')
}

// A code of the Dutch open data: parts joined by slashes, the last of which
// names the fase of the goal, as in rw/gb/1/01/fase1.
const OPEN_DATA_CODE = /^[^\s/]+(\/[^\s/]+)+$/

function listOf(items: readonly string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

// Says of a code what a reader would otherwise get wrong. Where one scope
// gives one code to several records, each says where the others are. Where
// the last part of an open-data code is not the fase the record is at (the
// importer filed the goal at another fase than the data does, or the data
// misspells the part), the record says that the code is the data's and at
// which level it is itself.
function noteCodes(held: readonly Held[]): void {
  const sharing = new Map<string, Held[]>()
  for (const each of held) {
    if (each.entry.code === '') continue
    const name = `${each.entry.jurisdiction}\n${each.entry.codeScope}\n${each.key}`
    sharing.set(name, [...(sharing.get(name) ?? []), each])
  }
  for (const each of held) {
    const { entry } = each
    if (entry.code === '') continue
    const openData = entry.jurisdiction === 'nl' && OPEN_DATA_CODE.test(entry.code)
    const misnamed = openData && /^fase-\d+$/.test(entry.level) && entry.code.split('/').at(-1) !== entry.level.replace('-', '')
    const others = (sharing.get(`${entry.jurisdiction}\n${entry.codeScope}\n${each.key}`) ?? []).filter((other) => other !== each)
    const places = others.map((other) => (other.entry.subject === entry.subject ? other.entry.level : `${other.entry.level} ${other.entry.subject}`))
    const giver = openData ? 'the open data' : 'the source'
    const one = others.length === 1
    const notes: string[] = []
    if (misnamed) notes.push(`code as the open data has it; this record is at ${entry.level}`)
    if (misnamed && others.length > 0) notes.push(`the same code is on ${one ? 'a record' : 'records'} at ${listOf(places)}`)
    else if (others.length > 0) notes.push(`${giver} gives this code to ${one ? 'two' : others.length + 1} records; this one is at ${entry.level}, the other${one ? '' : 's'} at ${listOf(places)}`)
    if (notes.length > 0) entry.codeNote = notes.join(', and ')
  }
}

function entryOf(held: Held, query: Wanted, pack: Pack): Entry {
  if (!query.wording) return held.entry
  const wording = held.official ?? getWording(pack.store, held.hash)
  const supplement = held.accompanying ?? (held.supplementHash === null ? null : getWording(pack.store, held.supplementHash))
  return {
    ...held.entry,
    ...(wording === null ? { noWording: NO_WORDING } : { wording: wording.trim() }),
    ...(supplement === null ? {} : { supplement: supplement.trim() }),
    ...(held.official === null || held.sourceLine === null ? {} : { source: held.sourceLine.trim() }),
  }
}

// The line that says how to get the wording, for an answer that lists a
// record whose wording is not in its file, when the wording was not asked for
// and the store is not on this machine.
function hintFor(listed: readonly Held[], query: Wanted, pack: Pack): { wordingHint?: string } {
  return !query.wording && listed.some((each) => each.describedOnly) && !existsSync(pack.store) ? { wordingHint: NO_STORE } : {}
}

// ---------------------------------------------------------------------------
// By age or level.
// ---------------------------------------------------------------------------

function lanesAnswer(query: AgeQuery | LevelQuery, pack: Pack): LanesAnswer {
  const { jurisdiction, subject } = query
  const held = hold(pack)
  const listed: Held[] = []
  const level = (name: string, labels: Omit<LevelAnswer, 'level' | 'lanes'>): LevelAnswer => ({
    level: name,
    ...labels,
    lanes: (subject ? [subject] : SUBJECTS).map((each) => {
      const lane = pack.lanes.find((one) => one.jurisdiction === jurisdiction && one.level === name && one.subject === each)
      const mine = held.filter(({ entry }) => entry.jurisdiction === jurisdiction && entry.level === name && entry.subject === each)
      listed.push(...mine)
      return {
        subject: each,
        ...(lane ? { title: lane.title } : {}),
        ...(lane?.nothingPublished === undefined ? {} : { nothingPublished: lane.nothingPublished }),
        entries: mine.map((one) => entryOf(one, query, pack)),
      }
    }),
  })
  const asked = { jurisdiction, ...(subject ? { subject } : {}) }
  if (query.by === 'level') {
    const levels = [level(query.level, {})]
    return { by: 'level', ...asked, levels, ...hintFor(listed, query, pack) }
  }

  const row = levelsForAge(jurisdiction, query.age)
  const levels = [
    ...row.levels.map((each) => level(each.level, each.subBand === undefined ? {} : { subBand: each.subBand })),
    ...(row.also ? [level(row.also.level, { label: row.also.label, note: row.also.note })] : []),
  ]
  return {
    by: 'age',
    ...asked,
    age: query.age,
    basis: row.basis,
    basisNote: row.basisNote,
    ...(row.gap === undefined ? {} : { gap: row.gap }),
    levels,
    ...hintFor(listed, query, pack),
  }
}

// The same answer without its records: each lane with how many it holds.
function outlineOf(answer: LanesAnswer): OutlineAnswer {
  const { levels, wordingHint: _hint, ...head } = answer
  return {
    ...head,
    outline: true,
    levels: levels.map((level) => ({ ...level, lanes: level.lanes.map(({ entries, ...lane }) => ({ ...lane, count: entries.length })) })),
  }
}

// ---------------------------------------------------------------------------
// By id.
// ---------------------------------------------------------------------------

function idAnswer(query: IdQuery, pack: Pack): IdAnswer {
  const held = hold(pack).find(({ entry }) => entry.id === query.id)
  if (!held) return { by: 'id', id: query.id }
  return { by: 'id', id: query.id, entry: entryOf(held, query, pack), ...hintFor([held], query, pack) }
}

// ---------------------------------------------------------------------------
// By code.
// ---------------------------------------------------------------------------

// A code as it is compared with a printed one to say whether the two are the
// same text: composed, with each run of whitespace one space.
function shape(code: string): string {
  return code.normalize('NFC').replace(/\s+/gu, ' ').trim()
}

interface Found {
  relation: CodeMatch['relation']
  // Found only with what the code holds in brackets set aside.
  bare: boolean
}

// The records a code finds, with the keys compared as `fold` leaves them:
// as they are, or without their capitals.
function findCode(code: string, pool: readonly Held[], fold: (key: string) => string): Map<Held, Found> {
  const key = fold(normaliseCode(code))
  const bare = fold(normaliseCode(withoutBrackets(code)))
  const found = new Map<Held, Found>()
  if (key === '') return found
  const scope = ({ entry }: Held): string => `${entry.jurisdiction}\n${entry.codeScope}`
  // One more part than the code, as K.CC.4.a has one more than K.CC.4.
  const partOf = (longer: string, shorter: string): boolean => shorter !== '' && longer.startsWith(`${shorter}.`) && !longer.slice(shorter.length + 1).includes('.')

  for (const each of pool) {
    if (fold(each.key) === key) found.set(each, { relation: 'exact', bare: false })
    else if (bare !== '' && fold(each.bareKey) === bare) found.set(each, { relation: 'exact', bare: true })
  }
  // Numbering restarts per scope, so whether the code has a record of its own
  // is asked scope by scope.
  const own = new Set([...found.keys()].map(scope))
  for (const each of pool) {
    if (own.has(scope(each))) continue
    if ((each.parentKey !== null && fold(each.parentKey) === key) || partOf(fold(each.key), key)) found.set(each, { relation: 'sub-part', bare: false })
    else if (partOf(fold(each.bareKey), bare)) found.set(each, { relation: 'sub-part', bare: true })
  }
  const segments = key.split('.')
  const parent = segments.length > 1 && /^\p{L}+$/u.test(segments.at(-1)!) ? segments.slice(0, -1).join('.') : null
  for (const each of pool) if (parent !== null && fold(each.key) === parent && !own.has(scope(each))) found.set(each, { relation: 'contains', bare: false })
  return found
}

function codeAnswer(query: CodeQuery, pack: Pack): CodeAnswer {
  const key = normaliseCode(query.code)
  const pool = hold(pack).filter(({ entry }) => !query.jurisdiction || entry.jurisdiction === query.jurisdiction)
  const asTyped = findCode(query.code, pool, (each) => each)
  const folded = findCode(query.code, pool, (each) => each.toLowerCase())
  const typed = shape(query.code)

  const matches: { rank: number; held: Held; relation: CodeMatch['relation']; ignored: Ignored[] }[] = []
  for (const [held, { relation, bare }] of folded) {
    const strict = asTyped.get(held)
    const capitals = strict?.relation !== relation || strict.bare !== bare
    const printed = shape(held.entry.code)
    const punctuation = relation === 'exact' && !bare && (capitals ? printed.toLowerCase() !== typed.toLowerCase() : printed !== typed)
    const ignored: Ignored[] = [...(punctuation ? ['punctuation' as const] : []), ...(bare ? ['brackets' as const] : []), ...(capitals ? ['capitals' as const] : [])]
    // The code as typed, then its normalised forms, then sub-parts, then containing records.
    const rank = relation === 'contains' ? 5 : relation === 'sub-part' ? 4 : bare ? 3 : capitals ? 2 : punctuation ? 1 : 0
    matches.push({ rank, held, relation, ignored })
  }
  // The pool is in the order records are listed in; a sort keeps it within a rank.
  const place = new Map(pool.map((each, index) => [each, index]))
  matches.sort((a, b) => a.rank - b.rank || place.get(a.held)! - place.get(b.held)!)

  return {
    by: 'code',
    code: query.code,
    key,
    ...(query.jurisdiction ? { jurisdiction: query.jurisdiction } : {}),
    jurisdictions: JURISDICTIONS.map((jurisdiction) => ({
      jurisdiction,
      matches: matches
        .filter(({ held }) => held.entry.jurisdiction === jurisdiction)
        .map(({ held, relation, ignored }): CodeMatch => ({ relation, ...(ignored.length === 0 ? {} : { ignored }), entry: entryOf(held, query, pack) })),
    })).filter((group) => group.matches.length > 0),
    ...hintFor(
      matches.map(({ held }) => held),
      query,
      pack,
    ),
  }
}

export function lookup(query: CodeQuery, pack: Pack): CodeAnswer
export function lookup(query: IdQuery, pack: Pack): IdAnswer
export function lookup(query: (AgeQuery | LevelQuery) & { outline: true }, pack: Pack): OutlineAnswer
export function lookup(query: AgeQuery | LevelQuery, pack: Pack): LanesAnswer
export function lookup(query: Query, pack: Pack): Answer
export function lookup(query: Query, pack: Pack): Answer {
  if (query.by === 'code') return codeAnswer(query, pack)
  if (query.by === 'id') return idAnswer(query, pack)
  // An outline lists no record, so no wording is read for it.
  return query.outline ? outlineOf(lanesAnswer({ ...query, wording: false }, pack)) : lanesAnswer(query, pack)
}

// ---------------------------------------------------------------------------
// As text.
// ---------------------------------------------------------------------------

function count(records: number): string {
  return `${records} record${records === 1 ? '' : 's'}`
}

function entryLines(entry: Entry, label?: string): string[] {
  const facts = [`standing: ${entry.standing}`, ...(entry.regime ? [`regime: ${entry.regime}`] : []), `check: ${entry.state}${entry.reason ? ` (${entry.reason})` : ''}`]
  const wording = entry.wording ?? entry.noWording
  return [
    `${label ? `[${label}] ` : ''}${entry.id}`,
    `  ${entry.code === '' ? 'no printed code' : `code ${entry.code}`}${entry.codeNote ? ` (${entry.codeNote})` : ''} | scope: ${entry.codeScope}`,
    `  ${facts.join(' | ')}`,
    `  ${entry.region}: ${entry.start ?? 'still pending'}`,
    `  file: education/${entry.file}`,
    ...(wording === undefined ? [] : [`  official wording: ${wording.split('\n').join('\n    ')}`]),
    ...(entry.supplement === undefined ? [] : [`  accompanying text: ${entry.supplement.split('\n').join('\n    ')}`]),
    ...(entry.source === undefined ? [] : [`  ${entry.source}`]),
    '',
  ]
}

// The lines an answer by age or level opens with, and those a level opens with.
function headLines(answer: LanesHead & { levels: readonly Omit<LevelAnswer, 'lanes'>[] }): string[] {
  const subject = answer.subject ?? 'all four subjects'
  const asked = answer.by === 'age' ? `age ${answer.age}` : `level ${answer.levels[0]!.level}`
  return [`# ${answer.jurisdiction}, ${asked}, ${subject}`, ...(answer.basis ? [`Age mapping: ${answer.basis}. ${answer.basisNote}`] : []), ...(answer.gap ? [answer.gap] : [])]
}

function levelLines(level: Omit<LevelAnswer, 'lanes'>): string[] {
  return ['', `## ${level.level}${level.label ? ` (returned beside the levels of this age, labelled ${level.label})` : ''}`, ...(level.subBand ? [`Sub-band: ${level.subBand}`] : []), ...(level.note ? [level.note] : [])]
}

// An outline: the same opening lines, then one line per lane and no record.
function formatOutline(answer: OutlineAnswer): string {
  const lines = headLines(answer)
  for (const level of answer.levels) {
    lines.push(...levelLines(level))
    for (const lane of level.lanes) {
      const name = `- ${level.level} / ${lane.subject}${lane.title ? `: ${lane.title}` : ''}`
      if (lane.nothingPublished !== undefined) lines.push(`${name}. Nothing is published: ${lane.nothingPublished}`)
      else lines.push(`${name}, ${lane.count === 0 ? 'no records' : count(lane.count)}`)
    }
  }
  if (answer.levels.length > 0) lines.push('', `Outline only. The records of one lane: npm run education:find -- --jurisdiction ${answer.jurisdiction} --level <level> --subject <subject>`)
  return lines.join('\n')
}

function formatLanes(answer: LanesAnswer): string {
  const lines = headLines(answer)
  for (const level of answer.levels) {
    lines.push(...levelLines(level))
    for (const lane of level.lanes) {
      const name = `### ${level.level} / ${lane.subject}${lane.title ? `: ${lane.title}` : ''}`
      if (lane.nothingPublished !== undefined) lines.push('', name, `Nothing is published: ${lane.nothingPublished}`)
      else if (lane.entries.length === 0) lines.push('', name, 'No records in this lane.')
      else lines.push('', `${name}, ${count(lane.entries.length)}`, '', ...lane.entries.flatMap((entry) => entryLines(entry, level.label)).slice(0, -1))
    }
  }
  if (answer.wordingHint) lines.push('', answer.wordingHint)
  return lines.join('\n')
}

const IGNORED: Record<Ignored, string> = { punctuation: 'punctuation', brackets: 'the part in brackets', capitals: 'capitals' }

// How a record was found, as the label its lines open with.
function matchLabel(match: CodeMatch, code: string): string {
  const ignored = match.ignored ?? []
  const set = ignored.length === 0 ? '' : `${listOf(ignored.map((each) => IGNORED[each]))} ignored`
  if (match.relation === 'sub-part') return `sub-part of ${code}${set === '' ? '' : `, ${set}`}`
  if (match.relation === 'contains') return `contains match: no record has the code ${code} in this scope; this is the record of ${match.entry.code}`
  if (ignored.length === 0) return 'exact match'
  return ignored.includes('brackets') ? `match on the sub-heading, ${set}` : `normalised match: ${set}`
}

function formatCode(answer: CodeAnswer): string {
  const where = answer.jurisdiction ? ` in ${answer.jurisdiction}` : ''
  if (answer.jurisdictions.length === 0) {
    return `No record has the code "${answer.code}"${where}: not as its own record, not as the parent of sub-part records, and not as a part of a parent record.`
  }
  const lines = [`# code ${answer.code}${where}`]
  for (const group of answer.jurisdictions) {
    lines.push('', `## ${group.jurisdiction}: ${count(group.matches.length)}`, '', ...group.matches.flatMap((match) => entryLines(match.entry, matchLabel(match, answer.code))).slice(0, -1))
  }
  if (answer.wordingHint) lines.push('', answer.wordingHint)
  return lines.join('\n')
}

function formatId(answer: IdAnswer): string {
  if (!answer.entry) {
    return `No record has the id "${answer.id}": the lookup holds the objective records, whose ids are edu.<jurisdiction>.<level>.<subject>.objective.<slug>.`
  }
  return [`# id ${answer.id}`, '', ...entryLines(answer.entry).slice(0, -1), ...(answer.wordingHint ? ['', answer.wordingHint] : [])].join('\n')
}

export function formatAnswer(answer: Answer): string {
  if (answer.by === 'code') return formatCode(answer)
  if (answer.by === 'id') return formatId(answer)
  return 'outline' in answer ? formatOutline(answer) : formatLanes(answer)
}

// ---------------------------------------------------------------------------
// The command line.
// ---------------------------------------------------------------------------

// How to run the lookup so that a parser can read what `--json` prints.
const FOR_A_PARSER = 'npm run --silent education:find -- ... --json, or node education/tools/lookup.ts ... --json'

const FORMS = [
  'usage: npm run education:find -- --jurisdiction <us-ca|nl> --age <2..12> [--subject <slug>] [--outline]',
  '       npm run education:find -- --jurisdiction <us-ca|nl> --level <slug> [--subject <slug>] [--outline]',
  '       npm run education:find -- --code <code> [--jurisdiction <us-ca|nl>]',
  '       npm run education:find -- --id <pack id>',
  '       npm run education:find -- --help',
]

export const USAGE = [
  ...FORMS,
  '       add --json for JSON, and --wording for the official wording, and the official text that accompanies it, where the record or the store has it',
  `       for a parser: ${FOR_A_PARSER} (npm prints the script name and the command first)`,
].join('\n')

// What `--help` prints: the usage, every option, and four examples per jurisdiction.
export const HELP = [
  'The lookup of the education pack: finds records by jurisdiction with an age or a level, by code, or by pack id.',
  'It reads the record files and the review files. It needs no network and no wording store.',
  '',
  ...FORMS,
  '',
  'options:',
  ...[
    [`--jurisdiction <${JURISDICTIONS.join('|')}>`, 'California or the Netherlands. Needed with --age and --level. With --code it keeps the answer to that one.'],
    ['--age <2..12>', 'The age of a child in whole years. The answer holds the levels a child of that age can be in,'],
    ['', "and beside them California's cross-grade lane or the Dutch end-of-primary goals, labelled as such."],
    ['--level <slug>', 'One level, without an age mapping.'],
    ...JURISDICTIONS.map((jurisdiction) => ['', `${jurisdiction}: ${LEVELS[jurisdiction].join(', ')}`]),
    ['--subject <slug>', `One of ${SUBJECTS.join(', ')}. Left out: all four. Only with --age and --level.`],
    ['--outline', 'With --age or --level: the age mapping, the gaps, the levels, and each lane with its title and its number'],
    ['', 'of records, and no record. An answer by age with its records is long; list one lane next, with --level and --subject.'],
    ['--code <code>', 'An official code, or the code the pack gives a bullet of a Dutch card: its sub-heading, a slash and its position.'],
    ['', 'Found whatever its punctuation and capitals; every match is listed with its scope and with how it was found.'],
    ['--id <pack id>', 'The one record with that pack id, as a map or a rule cites it: edu.<jurisdiction>.<level>.<subject>.objective.<slug>.'],
    ['', 'It needs no other option. This is how a record that prints no code is found, and how a check state is read again.'],
    ['--wording', 'Adds the official wording of each record and the official text that accompanies it. A Dutch record holds'],
    ['', 'them in its file and prints them with its source line; a California record needs the wording store. Not with --outline.'],
    ['--json', 'Prints the answer as JSON. For a parser, run it as'],
    ['', `${FOR_A_PARSER}:`],
    ['', 'npm prints the script name and the command on standard output before the answer.'],
    ['--help', 'Prints this text.'],
  ].map(([option, says]) => `  ${option!.padEnd(28)}${says}`),
  '',
  'Every record is listed with its pack id, its code and scope, its standing and check state, the start of its summary or gloss, and its file.',
  '',
  'examples, California (us-ca):',
  '  npm run education:find -- --jurisdiction us-ca --age 5 --outline',
  '  npm run education:find -- --jurisdiction us-ca --age 10 --subject mathematics',
  '  npm run education:find -- --code K.CC.4 --jurisdiction us-ca',
  '  npm run education:find -- --id edu.us-ca.kindergarten.mathematics.objective.k-cc-1',
  '',
  'examples, the Netherlands (nl):',
  '  npm run education:find -- --jurisdiction nl --age 5 --subject mathematics --outline',
  '  npm run education:find -- --jurisdiction nl --level fase-1 --subject mathematics',
  '  npm run education:find -- --code "Hoeveelheden / 1" --jurisdiction nl --wording',
  '  npm run education:find -- --id edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-getallen-1',
].join('\n')

const VALUED = ['--jurisdiction', '--age', '--level', '--subject', '--code', '--id']
const FLAGS = ['--json', '--wording', '--outline']

// The query a command line asks, that it asks for the help text, or what is wrong with it.
export function parseArgs(args: readonly string[]): { query: Query; json: boolean } | { help: true } | { error: string } {
  if (args.includes('--help') || args.includes('-h')) return { help: true }
  const values: Record<string, string> = {}
  const flags = new Set<string>()
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!
    if (FLAGS.includes(arg)) flags.add(arg)
    else if (!VALUED.includes(arg)) return { error: `${arg} is not an option` }
    else if (args[index + 1] === undefined) return { error: `${arg} needs a value` }
    else values[arg] = args[++index]!
  }
  const { '--jurisdiction': jurisdiction, '--age': age, '--level': level, '--subject': subject, '--code': code, '--id': id } = values
  const wording = flags.has('--wording')
  const json = flags.has('--json')
  const outline = flags.has('--outline')

  if ([age, level, code, id].filter((each) => each !== undefined).length !== 1) return { error: 'give one of --age, --level, --code and --id' }
  if (jurisdiction !== undefined && !JURISDICTIONS.includes(jurisdiction as Jurisdiction)) {
    return { error: `--jurisdiction must be one of ${JURISDICTIONS.join(', ')} (it is "${jurisdiction}")` }
  }
  const where = jurisdiction as Jurisdiction | undefined
  if (code !== undefined || id !== undefined) {
    const key = code !== undefined ? '--code' : '--id'
    if (subject !== undefined) return { error: `--subject does not go with ${key}` }
    if (outline) return { error: `--outline does not go with ${key}: it goes with --age and --level` }
    if (code !== undefined) return { query: { by: 'code', code, ...(where ? { jurisdiction: where } : {}), wording }, json }
    if (where) return { error: '--jurisdiction does not go with --id: the id names its jurisdiction' }
    return { query: { by: 'id', id: id!, wording }, json }
  }
  if (!where) return { error: '--age and --level need --jurisdiction' }
  if (subject !== undefined && !SUBJECTS.includes(subject as Subject)) return { error: `--subject must be one of ${SUBJECTS.join(', ')} (it is "${subject}")` }
  if (outline && wording) return { error: '--wording does not go with --outline: an outline lists no record' }
  const which = { ...(subject === undefined ? {} : { subject: subject as Subject }), wording, ...(outline ? { outline } : {}) }
  if (level !== undefined) {
    if (!LEVELS[where].includes(level)) return { error: `--level must be one of ${LEVELS[where].join(', ')} for ${where} (it is "${level}")` }
    return { query: { by: 'level', jurisdiction: where, level, ...which }, json }
  }
  if (!/^\d+$/.test(age!) || Number(age) < 2 || Number(age) > 12) return { error: `--age must be a whole number of years from 2 to 12 (it is "${age}")` }
  return { query: { by: 'age', jurisdiction: where, age: Number(age), ...which }, json }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const parsed = parseArgs(process.argv.slice(2))
  if ('help' in parsed) {
    console.log(HELP)
    process.exit(0)
  }
  if ('error' in parsed) {
    console.error(`education find: ${parsed.error}\n${USAGE}`)
    process.exit(2)
  }
  const education = resolve(import.meta.dirname, '..')
  const records = readRecords(education)
  const answer = lookup(parsed.query, { records, states: joinTree(education, { records }).states, lanes: MANIFEST, store: storeRoot() })
  console.log(parsed.json ? JSON.stringify(answer, null, 2) : formatAnswer(answer))
}
