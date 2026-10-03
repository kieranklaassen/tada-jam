// The frames: one frame.md per lane, generated from the lane manifest. A
// frame says what its lane covers, what one record is, how each part is read
// and checked, what is skipped and left out, and which corrections the import
// and the extraction made.
//
//   node education/tools/frames.ts                       every lane of both jurisdictions
//   node education/tools/frames.ts --jurisdiction us-ca  the lanes of one
//   node education/tools/frames.ts --check               write nothing; fail when a committed frame differs
//
// A California frame holds no official wording. It is built from names, codes
// and counts, from the manifest's own notes, from the group, code and reason
// of each correction in the lane's locator, and from the code and reason of
// each export correction of the lane (manifest/us-ca-additions.ts); never
// from a record, the store, or the text a correction or a locator quotes. The
// frames under corpus/us-ca/ are read by the overlap check like every other
// committed page.
//
// A Dutch frame also says what the Dutch importer transcribes, corrects and
// adds in its lane, from the lists of manifest/nl-additions.ts (dutchSections),
// and quotes the official text that holds for the lane as a whole and that no
// record carries. That text is read in the pinned sources by another tool
// (frame-texts.ts), which needs the store and writes what it read to
// locators/nl/frame-texts.json; a frame is built from that committed file, so
// generating frames still needs no store. Dutch official text may be quoted.
//
// A frame has one writer, this script: running it again rewrites a frame that
// was edited by hand, and changes nothing otherwise.
//
// With `--jurisdiction`, only that jurisdiction's half of the manifest is
// loaded, so one half can be generated while the other is being written.
//
// The core is exported so frames.test.ts can run it on invented lanes.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Lane, LanePart, LeftOut } from '../manifest.ts'
import type { NlAdditions } from '../manifest/nl-additions.ts'
import type { ExportFixes } from '../manifest/us-ca-additions.ts'
import { composeRecord } from './record.ts'
import { statusCounts } from './record-writer.ts'
import type { WriteStatus } from './record-writer.ts'
import { JURISDICTIONS, SAME_FILE, frameId, levelSlug, pathForId } from './schema.ts'
import type { FrameCheckStrength, FrameFrontmatter, Jurisdiction } from './schema.ts'
import type { RecordText } from './validate.ts'

// One correction of a lane's locator, as a frame lists it. The corrected text
// itself stays in the locator.
export interface Correction {
  group: string
  code: string
  reason: string
}

// What an importer puts right in the exports it reads: the corrections of
// the wording, the lane each corrected code is in, and the names of domains.
export type { ExportFixes }

// One thing the import of a lane puts right, as a frame lists it: the code of
// a row whose wording is corrected, or the name a domain is given. The
// corrected text itself stays where the importer reads it.
export interface ExportFix {
  kind: 'wording' | 'domain'
  // The code, or the domain as the records name it.
  name: string
  reason: string
  // How many places of the row are corrected for this reason.
  places: number
}

// A generated section of a frame: its heading, then its paragraphs.
export type FrameSection = readonly string[]

// Official text that holds for a whole lane, as frame-texts.ts read it in a source.
export interface FrameTextRead {
  // The lanes whose frames quote it, as <level>/<subject>.
  lanes: string[]
  // What it is, in the pack's words.
  title: string
  about: string
  // The slug of the source record it was read from, and where in the file.
  source: string
  place: string
  // The text, line by line as it is quoted.
  text: string
}

export interface FrameTextsFile {
  generated: string
  texts: FrameTextRead[]
}

// The file frame-texts.ts writes and the Dutch frames quote from, relative to education/.
export const FRAME_TEXTS_FILE = 'locators/nl/frame-texts.json'

// The texts of the committed file. None when there is no such file.
export function committedFrameTexts(education: string): FrameTextRead[] {
  const path = join(education, FRAME_TEXTS_FILE)
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as FrameTextsFile).texts : []
}

// One jurisdiction's lanes, the official domains it leaves out, what its
// importer puts right in an export (California), and the lists its importer
// reads beside the manifest (the Netherlands).
export async function manifestOf(jurisdiction: Jurisdiction): Promise<{ lanes: readonly Lane[]; leftOut: readonly LeftOut[]; fixes?: ExportFixes; additions?: NlAdditions }> {
  if (jurisdiction === 'us-ca') {
    const half = await import('../manifest/us-ca.ts')
    const additions = await import('../manifest/us-ca-additions.ts')
    return {
      lanes: half.US_CA_LANES,
      leftOut: half.US_CA_LEFT_OUT,
      fixes: additions.US_CA_EXPORT_FIXES,
    }
  }
  const half = await import('../manifest/nl.ts')
  const additions = await import('../manifest/nl-additions.ts')
  return { lanes: half.NL_LANES, leftOut: half.NL_LEFT_OUT, additions: additions.NL_ADDITIONS }
}

// ---------------------------------------------------------------------------
// One frame.
// ---------------------------------------------------------------------------

// How a lane is checked: as all of its parts are, or mixed. A lane without
// parts has nothing with a second rendition.
function strengthOf(parts: readonly LanePart[]): FrameCheckStrength {
  if (parts.every((part) => part.checkStrength === 'second-reading')) return 'second-reading'
  return parts.every((part) => part.checkStrength === 'second-rendition') ? 'second-rendition' : 'mixed'
}

function frontmatterOf(lane: Lane): FrameFrontmatter {
  return {
    id: frameId(lane.jurisdiction, lane.level, lane.subject),
    kind: 'frame',
    title: lane.title,
    jurisdiction: lane.jurisdiction,
    level: lane.level,
    subject: lane.subject,
    sources: [...lane.sources],
    expected_count: lane.expectedCount,
    counting_method: lane.countingMethod,
    check_renditions: [...new Set(lane.parts.map((part) => part.checkRendition).filter((id) => id !== SAME_FILE))],
    check_strength: strengthOf(lane.parts),
    nothing_published: lane.nothingPublished !== undefined,
    status: 'draft',
  }
}

function count(number: number, one: string, many = `${one}s`): string {
  return `${number} ${number === 1 ? one : many}`
}

// A list, or the one word that says it is empty.
function listOr(empty: string, items: readonly string[]): string {
  return items.length === 0 ? empty : items.map((item) => `- ${item}`).join('\n')
}

function partLine(part: LanePart): string {
  const check = part.checkRendition === SAME_FILE ? 'Checked by a second reading of the same file.' : `Checked against \`${part.checkRendition}\`, a second rendition.`
  return `**${part.name}**: ${count(part.expectedCount, 'record')}, read from \`${part.source}\`. ${check} ${part.checkGranularity}`
}

const COUNT_FROM_IMPORT_FILE =
  'The expected count was counted in the file the records are read from, which is the only index. Such a count cannot show a statement that file lacks; the second check, which lists what the check rendition holds and no record carries, is what can.'
const COUNT_FROM_OWN_INDEX = 'The expected count was counted in an index of its own, not in the import: `counting_method` above says where.'

// What the lane's level leaves out. The entries are the level's, not the
// lane's: every frame of a level lists the same ones.
function leftOutSection(entries: readonly LeftOut[]): string[] {
  const heading = '## Left out at this level'
  if (entries.length === 0) return [heading, 'Nothing.']
  return [heading, 'Official material for this level that the pack records in none of its four subjects:', listOr('', entries.map((entry) => `**${entry.domain}**: ${entry.reason}`))]
}

// What the importer puts right for a lane: the corrections of the codes
// listed under the lane, for each export a part of it reads from rows, and
// the domains the lane counts under the name a correction gives them.
export function exportFixesOf(lane: Lane, fixes: ExportFixes): ExportFix[] {
  const found: ExportFix[] = []
  const exports = new Set(lane.parts.filter((part) => part.selection.kind === 'rows').map((part) => part.source))
  for (const source of exports) {
    for (const code of fixes.lanes[source]?.[`${lane.level}/${lane.subject}`] ?? []) {
      const reasons = (fixes.corrections[source]?.[code] ?? []).map((entry) => entry.reason)
      for (const reason of new Set(reasons)) found.push({ kind: 'wording', name: code, reason, places: reasons.filter((each) => each === reason).length })
    }
  }
  for (const source of exports) {
    for (const entry of Object.values(fixes.domains[source] ?? {})) {
      if (lane.domains.some((domain) => domain.name === entry.to)) found.push({ kind: 'domain', name: entry.to, reason: entry.reason, places: 1 })
    }
  }
  return found
}

function exportSection(fixes: readonly ExportFix[]): string[] {
  const wording = fixes.filter((fix) => fix.kind === 'wording')
  const domains = fixes.filter((fix) => fix.kind === 'domain')
  const places = fixes.reduce((sum, fix) => sum + fix.places, 0)
  return [
    '## Export corrections',
    [
      `The export this lane is read from is damaged, mistyped or cut short in ${count(places, 'place')}, and the importer puts each right from the adopted document.`,
      ...(wording.length === 0 ? [] : ["The stored wording of a record listed here by its code is therefore the export's as corrected from the adopted document, not the export's as the department serves it."]),
      ...(domains.length === 0 ? [] : ["The title and the code scope of the records of a domain listed here carry its name in the export's own form, completed from the adopted document."]),
      'The second check verifies each against the page.',
    ].join(' '),
    listOr('None.', [...wording.map((fix) => `\`${fix.name}\`: ${fix.reason}${fix.places === 1 ? '' : ` (${fix.places} places)`}`), ...domains.map((fix) => `The domain **${fix.name}**: ${fix.reason}.`)]),
  ]
}

// ---------------------------------------------------------------------------
// The Netherlands: what the importer transcribes, corrects and adds.
// ---------------------------------------------------------------------------

// The images of the legal text that stand in statements of the lane, by statement.
function imageSection(lane: Lane, additions: NlAdditions): FrameSection[] {
  const key = `${lane.level}/${lane.subject}`
  const statements = new Map<string, string[]>()
  // A regulation that several parts of the lane read is looked up once.
  for (const source of new Set(lane.parts.filter((part) => part.selection.kind === 'legal').map((part) => part.source))) {
    for (const [name, image] of Object.entries(additions.images[source] ?? {})) {
      if (image.lane !== key) continue
      const statement = `${image.group}, ${image.code}`
      statements.set(statement, [...(statements.get(statement) ?? []), name])
    }
  }
  if (statements.size === 0) return []
  const images = [...statements.values()].reduce((sum, names) => sum + names.length, 0)
  return [
    [
      '## Images transcribed',
      `The legal text prints ${count(images, 'image')} inside ${count(statements.size, 'statement')} of this lane: a fraction set as a picture. The wording of each statement listed here holds, in place of each image, the pack's transcription of it in square brackets after the word "afbeelding", as in \`[afbeelding: 3/4]\`. The brackets and that word are not the decree's. The transcriptions are listed in \`manifest/nl-additions.ts\`, each with the hash of the image file that was viewed; the image files stand beside the XML in the legislation repository and are not part of the pinned file. The second check verifies each against the image.`,
      listOr('None.', [...statements].map(([statement, names]) => `**${statement}**: ${names.map((name) => `\`${name}\``).join(', ')}`)),
    ],
  ]
}

// The goals of the open data that the importer corrects in the lane: those
// that are records of it under another cluster or from another fase, those
// that are copies and no records, and those the data links to this lane's
// fase that are records of another. Goals with the same correction and the
// same reason are listed together, the reason once.
function goalSection(lane: Lane, additions: NlAdditions): FrameSection[] {
  const key = `${lane.level}/${lane.subject}`
  const sources = new Set(lane.parts.filter((part) => part.selection.kind === 'data').map((part) => part.source))
  const groups = new Map<string, { lead: string; reason: string; goals: string[] }>()
  const add = (lead: string, reason: string, goal: string): void => {
    const name = `${lead}\n${reason}`
    if (!groups.has(name)) groups.set(name, { lead, reason, goals: [] })
    groups.get(name)!.goals.push(goal)
  }
  for (const source of sources) {
    for (const [id, goal] of Object.entries(additions.goals[source] ?? {})) {
      const named = `\`${goal.code}\` (${id})`
      for (const correction of goal.corrections) {
        if (correction.kind === 'relevel' && goal.lane !== key && `${levelSlug(correction.from)}/${lane.subject}` === key) add(`Not a record of this lane: filed at ${correction.level}`, correction.reason, `${named}, a record of ${goal.lane}`)
        if (goal.lane !== key) continue
        if (correction.kind === 'regroup') add(`Grouped under ${correction.cluster}`, correction.reason, named)
        else if (correction.kind === 'relevel') add(`Filed here, at ${correction.level}`, correction.reason, named)
        else add('Not a record: a copy', correction.reason, `${named}, a copy of ${correction.copyOf}`)
      }
    }
  }
  if (groups.size === 0) return []
  const goals = new Set([...groups.values()].flatMap((group) => group.goals.map((goal) => goal.split(',')[0]))).size
  return [
    [
      '## Corrections to the open data',
      `The open data misfiles ${count(goals, 'goal')} that ${goals === 1 ? 'concerns' : 'concern'} this lane, and the importer corrects each by the id of its goal-at-level object, as \`manifest/nl-additions.ts\` lists them. A corrected record keeps the code the data gives it, also where that code names another cluster or fase, and its locator says where the data lists it. The second check verifies each correction against the content-line PDF.`,
      ...[...groups.values()].flatMap((group) => [`**${group.lead}** (${count(group.goals.length, 'goal')}). ${group.reason}`, listOr('None.', group.goals)]),
    ],
  ]
}

// The goals of the lane whose statement the open data cuts short: the importer reads the whole statement in the content-line PDF.
function restoredSection(lane: Lane, additions: NlAdditions): FrameSection[] {
  const key = `${lane.level}/${lane.subject}`
  const sources = new Set(lane.parts.filter((part) => part.selection.kind === 'data').map((part) => part.source))
  const goals = [...sources].flatMap((source) => Object.entries(additions.restored[source] ?? {})).filter(([, goal]) => goal.lane === key)
  if (goals.length === 0) return []
  return [
    [
      '## Statements restored from the content-line PDF',
      `The open data cuts ${count(goals.length, 'statement')} of this lane short. The wording of each record listed here is the statement as the content-line PDF of its line prints it, read by script in the column of the lane's fase on the page or pages named, with the examples the PDF prints inside its sentence. The wording ends where the upright text of the statement ends: an example in italics that closes the statement on a line of its own is no part of it, and the record holds that example as accompanying text, as the record of any other goal does. The record keeps the id and the code of its goal in the data, and its source line cites the PDF. For these records the PDF is the source of the wording, so the check against the PDF is a second reading of the same file.`,
      listOr('None.', goals.map(([id, goal]) => `\`${goal.code}\` (${id}), ${goal.through === undefined ? `page ${goal.page}` : `pages ${goal.page} and ${goal.through}`}: ${goal.reason}`)),
    ],
  ]
}

// The examples the content-line PDFs print with the goals of the lane, which the records carry as accompanying text.
function exampleSection(lane: Lane, additions: NlAdditions): FrameSection[] {
  const key = `${lane.level}/${lane.subject}`
  const parts = lane.parts.filter((part) => part.selection.kind === 'data')
  const italic = parts.filter((part) => additions.examples.italic.includes(part.checkRendition))
  const plain = [...new Set(parts.map((part) => part.source))].flatMap((source) => Object.entries(additions.examples.plain[source] ?? {})).filter(([, goal]) => goal.lane === key)
  if (italic.length === 0 && plain.length === 0) return []
  return [
    [
      '## Examples kept as accompanying text',
      'An example that a content-line PDF prints with a goal and the open data leaves out is official text, and no part of the goal. A record holds it as accompanying text: in its official wording region, after the wording, under a line that opens "Accompanying official text, not part of the statement" and says how the PDF prints it, and by its hash in `supplement_sha256`. The wording and `wording_sha256` are those of the goal alone, as the data has it. Where the example closes the goal, the accompanying text is the example; where it stands inside the sentence, it is the goal as the PDF prints it, so that each example keeps its place. The source line names the PDF, the column, and the page or pages the accompanying text itself stands on, which can be the page after the one its goal opens on.',
      ...(italic.length === 0
        ? []
        : [
            `In ${count(italic.length, 'part')} of this lane the PDF sets the examples in italics, and the importer attaches them by script: it joins every goal of the part to the statement the PDF prints for it, by its text, and fails when a goal cannot be joined. An example that closes its goal is cut where the italics open, so a bracket or a quotation mark that closes the statement stays with the statement. Where the page raises a digit, the accompanying text holds the raised character (m²), and it holds a sign of the Symbol font as the character the page prints (≈); the wording of a goal is the data's, which writes a raised digit as a plain one (m2).`,
            listOr('None.', italic.map((part) => `**${part.name}**, from \`${part.checkRendition}\``)),
          ]),
      ...(plain.length === 0
        ? []
        : [
            `For ${count(plain.length, 'goal')} the example is listed in \`manifest/nl-additions.ts\`: what the PDF prints after the wording of the data, on the page named, is attached.`,
            listOr('None.', plain.map(([id, goal]) => `\`${goal.code}\` (${id}), page ${goal.page}: ${goal.reason}`)),
          ]),
    ],
  ]
}

// The official text that holds for the lane as a whole, quoted as a script read it.
function wholeLaneSection(lane: Lane, texts: readonly FrameTextRead[]): FrameSection[] {
  const key = `${lane.level}/${lane.subject}`
  const mine = texts.filter((text) => text.lanes.includes(key))
  if (mine.length === 0) return []
  // A fence longer than any run of backticks in the text it holds.
  const fence = (text: string): string => '`'.repeat(Math.max(3, ...(text.match(/`+/g) ?? []).map((run) => run.length + 1)))
  return [
    [
      '## Official text for the lane as a whole',
      `The sources print text that holds for a whole column, cluster or card of this lane and for no single statement. No record carries it. ${count(mine.length, 'such text is', 'such texts are')} quoted here, in Dutch, as a script read ${mine.length === 1 ? 'it' : 'them'} in the pinned source (\`node education/tools/frame-texts.ts\`; \`manifest/nl-additions.ts\` says where each is), each with its source record and its place there. In a quote, a line at the margin is a label or a heading of the source, and the lines set in under it are what the source prints in that row.`,
      ...mine.flatMap((text) => [`**${text.title}** (\`${text.source}\`, ${text.place}). ${text.about}`, `${fence(text.text)}text\n${text.text}\n${fence(text.text)}`]),
    ],
  ]
}

// The sections a Dutch frame holds beyond those every frame holds. `texts` are those frame-texts.ts read, for every lane.
export function dutchSections(lane: Lane, additions: NlAdditions, texts: readonly FrameTextRead[] = []): FrameSection[] {
  if (lane.jurisdiction !== 'nl' || lane.nothingPublished !== undefined) return []
  return [...wholeLaneSection(lane, texts), ...goalSection(lane, additions), ...restoredSection(lane, additions), ...exampleSection(lane, additions), ...imageSection(lane, additions)]
}

function bodyOf(lane: Lane, leftOut: readonly LeftOut[], corrections: readonly Correction[], exportFixes: readonly ExportFix[], more: readonly FrameSection[]): string {
  if (lane.nothingPublished !== undefined) return `Nothing is published for this level and subject. ${lane.nothingPublished}`

  const sections = [
    [
      '## What this lane covers',
      `${count(lane.expectedCount, 'record')}, under ${count(lane.domains.length, 'official domain')}:`,
      listOr('None.', lane.domains.map((domain) => `**${domain.name}**: ${domain.count}`)),
      ...(lane.notes === undefined ? [] : [lane.notes]),
    ],
    ['## What one record is', lane.granularity],
    ['## Parts and how each is checked', listOr('None.', lane.parts.map(partLine)), lane.countIsFromImportFile ? COUNT_FROM_IMPORT_FILE : COUNT_FROM_OWN_INDEX],
    ['## Statements skipped', listOr('None.', lane.skipped.map((skipped) => `\`${skipped.code}\`: ${skipped.reason}`))],
    ['## Gaps if an optional source is missing', listOr('None.', (lane.gaps ?? []).map((gap) => `\`${gap.source}\`: ${gap.gap}`))],
    leftOutSection(leftOut.filter((entry) => entry.jurisdiction === lane.jurisdiction && entry.level === lane.level)),
  ]
  for (const section of more) sections.push([...section])
  if (exportFixes.length > 0) sections.push(exportSection(exportFixes))
  if (corrections.length > 0) {
    sections.push([
      '## Extraction corrections',
      `The lane's locator corrects the extracted text in ${count(corrections.length, 'place')}. The second check verifies each against the page.`,
      listOr('None.', corrections.map((correction) => `**${correction.group}, ${correction.code}**: ${correction.reason}`)),
    ])
  }
  return sections.map((section) => section.join('\n\n')).join('\n\n')
}

// The frame of a lane: its file, relative to education/, and its text.
// `leftOut` may hold every level's entries; the lane's own are picked out.
// `corrections` are those of the lane's locator, `exportFixes` what its import
// puts right, and `more` the sections of a Dutch lane (dutchSections).
export function frameOf(lane: Lane, leftOut: readonly LeftOut[] = [], corrections: readonly Correction[] = [], exportFixes: readonly ExportFix[] = [], more: readonly FrameSection[] = []): RecordText {
  const frontmatter = frontmatterOf(lane)
  return { file: pathForId(frontmatter.id)!, text: composeRecord(frontmatter, bodyOf(lane, leftOut, corrections, exportFixes, more)) }
}

// ---------------------------------------------------------------------------
// The frames of a tree.
// ---------------------------------------------------------------------------

// The corrections in the locator of a lane, education/locators/<jurisdiction>/
// <level>/<subject>.json, in the file's order. None when the lane has no
// locator. Only the group, the code and the reason are read: the text a
// correction changes may be official wording.
export function readCorrections(education: string, lane: Lane): Correction[] {
  const file = join(education, 'locators', lane.jurisdiction, lane.level, `${lane.subject}.json`)
  if (!existsSync(file)) return []
  const locator = JSON.parse(readFileSync(file, 'utf8')) as { records?: { group: string; code: string; spans?: { corrections?: { reason: string }[] }[] }[] }
  return (locator.records ?? []).flatMap((record) =>
    (record.spans ?? []).flatMap((span) => (span.corrections ?? []).map((correction) => ({ group: record.group, code: record.code, reason: correction.reason }))),
  )
}

// The frame of every lane, with the corrections of its locator under
// `education`, when `fixes` are given what its import puts right, and when
// `additions` are given the sections of a Dutch lane.
export function generateFrames(education: string, lanes: readonly Lane[], leftOut: readonly LeftOut[], fixes?: ExportFixes, additions?: NlAdditions): RecordText[] {
  const texts = additions === undefined ? [] : committedFrameTexts(education)
  return lanes.map((lane) => frameOf(lane, leftOut, readCorrections(education, lane), fixes === undefined ? [] : exportFixesOf(lane, fixes), additions === undefined ? [] : dutchSections(lane, additions, texts)))
}

export interface FrameResult {
  file: string
  status: WriteStatus
}

function committed(education: string, file: string): string | null {
  const path = join(education, file)
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

// Writes each frame under `education`. A frame that is already as generated is left alone.
export function writeFrames(education: string, frames: readonly RecordText[]): FrameResult[] {
  return frames.map(({ file, text }) => {
    const before = committed(education, file)
    if (before === text) return { file, status: 'unchanged' }
    mkdirSync(dirname(join(education, file)), { recursive: true })
    writeFileSync(join(education, file), text)
    return { file, status: before === null ? 'created' : 'updated' }
  })
}

// The frames that are missing under `education` or differ from the generated ones.
export function staleFrames(education: string, frames: readonly RecordText[]): string[] {
  return frames.filter(({ file, text }) => committed(education, file) !== text).map(({ file }) => file)
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const rest = args.filter((arg) => arg !== '--check')
  const only = rest[0] === '--jurisdiction' ? rest[1] : undefined
  if (rest.length > 0 && (rest.length !== 2 || !JURISDICTIONS.includes(only as Jurisdiction))) {
    console.error(`usage: node education/tools/frames.ts [--jurisdiction <${JURISDICTIONS.join('|')}>] [--check]`)
    process.exit(2)
  }
  const education = resolve(import.meta.dirname, '..')
  const halves = await Promise.all((only === undefined ? JURISDICTIONS : [only as Jurisdiction]).map(manifestOf))
  const frames = halves.flatMap(({ lanes, leftOut, fixes, additions }) => generateFrames(education, lanes, leftOut, fixes, additions))
  if (check) {
    const stale = staleFrames(education, frames)
    for (const file of stale) console.error(`education/${file}  is missing or differs from the frame generated from the manifest`)
    if (stale.length > 0) {
      console.error(`\neducation frames failed: ${stale.length} of ${frames.length} frame(s) differ. Run \`npm run education:frames\` and commit the result.`)
      process.exit(1)
    }
    console.log(`education frames passed: ${frames.length} frame(s) are as the manifest generates them`)
  } else {
    const results = writeFrames(education, frames)
    console.log(`education frames: ${results.length} frame(s) (${statusCounts(results)})`)
  }
}
