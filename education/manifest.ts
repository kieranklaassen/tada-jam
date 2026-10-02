// The lane manifest: the single plan of the corpus (plan KTD2), written before
// any record exists. A lane is one jurisdiction, level and subject. For each
// lane it says which official files the records are read from, what the second
// check reads, how many records to expect and how that number was counted,
// which official domains are in and which statements are skipped, and how a
// large lane is split into batches. Fetch, the importers, the PDF extraction,
// the lane writers, the second check, the lookup and the coverage report all
// read it from here.
//
// This file holds the types, the aggregate and a few pure helpers. The data
// is in manifest/us-ca.ts and manifest/nl.ts. Nothing here reads a file or
// the network.
//
// A lane stands alone (plan R14): there is no field that relates a lane to
// one in the other jurisdiction, and none may be added.

import { NL_LANES, NL_LEFT_OUT, NL_SOURCE_PLANS } from './manifest/nl.ts'
import { US_CA_LANES, US_CA_LEFT_OUT, US_CA_SOURCE_PLANS } from './manifest/us-ca.ts'
import { laneKey } from './tools/schema.ts'
import type { CheckStrength, Jurisdiction, PinKind, Subject } from './tools/schema.ts'

// ---------------------------------------------------------------------------
// Selections: what an importer or extractor needs to pick a part's statements
// out of its source.
// ---------------------------------------------------------------------------

// Rows of a text export. A row belongs to the part when every column in
// `where` holds one of the listed values and, when `codePrefixes` is given,
// its code starts with one of them. Values and codes are compared after
// trimming, because the exports carry stray spaces and tabs. A header that
// occurs twice in a file is named by its occurrence: `Content Area#2`.
// Rows whose code is in the lane's `skipped` list are then left out.
export interface RowSelection {
  kind: 'rows'
  // The column that holds the official code.
  codeColumn: string
  // The column that holds the official domain; `Lane.domains` counts its values.
  domainColumn: string
  where: Readonly<Record<string, readonly string[]>>
  codePrefixes?: readonly string[]
}

// One statement of a document that has no rows. `group` and `code` together
// are unique in a lane.
export interface StatementRef {
  // The official domain or strand the statement sits under: one of the names
  // in `Lane.domains`, or for a lane batched by `group`, the batch key value.
  group: string
  // The number or code that identifies the statement in its group, as printed
  // but without a label word (Foundation, Standard), a title or closing
  // punctuation. Where the document gives its own citation form, that form.
  // Where it prints no code at all, the printed headings or labels below the
  // group that lead to the statement, joined by " / ", and then, unless the
  // last of them holds one statement only, its position there, counted from 1.
  code: string
  // The printed title, where the document prints one.
  title?: string
  // The page its heading first appears on, counted as `pages` is.
  page?: number
  // A misprint or other trap at this statement.
  note?: string
}

// Pages of a PDF, first and last, both included, counted from 1 as pdftotext
// counts them (not the page numbers printed on the page).
export type PageRange = readonly [first: number, last: number]

// Statements of a PDF or a document file, located by page and anchor text and
// extracted by script.
export interface StatementSelection {
  kind: 'statements'
  // Where the statements are. Left out for a file without pages.
  pages?: readonly PageRange[]
  // How one statement is found, where it ends, and what around it is not part of it.
  locate: string
  // Every statement of the part, in document order.
  statements: readonly StatementRef[]
}

// Statements of a regulation in the XML of the Dutch legislation repository
// (extraction `legal-xml`), located by element path.
export interface LegalSelection {
  kind: 'legal'
  // The articles, annexes or divisions that hold the statements: the value of
  // each one's `bwb-ng-variabel-deel` attribute, the path the publisher gives
  // every structural element. A table that runs on in a later division is
  // listed with it.
  elements: readonly string[]
  // How one statement is found in those elements, where it ends, and what around it is not part of it.
  locate: string
  // Every statement of the part, in document order.
  statements: readonly StatementRef[]
}

// One step down the tree of an open-data repository (extraction `git`). Each
// file is a JSON array of flat objects with a UUID `id`. A parent lists its
// children's ids in a field named after the child type; a child does not
// point back, so a tree is walked from the top.
export interface DataStep {
  // The file, under the repository's data folder.
  file: string
  // The entity type the file holds, as the repository's context.json names it.
  entity: string
  // The field of the objects one step up that lists the ids of these. Left out on the first step.
  via?: string
  // Keep only the objects whose field holds one of the listed values.
  where?: Readonly<Record<string, readonly string[]>>
  // Set when only some objects one step up have these. Records then hang off either step.
  optional?: true
}

// The level filter of a data selection.
export interface DataLevel {
  // The entity whose objects carry the level, and the field that lists the ids of its levels.
  entity: string
  field: string
  // The source record of the repository whose niveaus.json resolves those ids. Levels are matched on `title` there, never on an id.
  source: string
  titles: readonly string[]
  // How the titles decide which records are in.
  rule: string
}

// Set when the walked tree holds structure only. Its objects list
// goal-at-level objects, which live in another repository and are the
// records.
export interface DataJoin {
  // The field, on any object of the walk, that lists the ids of the goal-at-level objects.
  via: string
  // The source record of the repository that holds them, and their file and entity type there.
  source: string
  file: string
  entity: string
  // Where the wording is: the field of a goal-at-level object that lists the
  // id of its one goal, the file the goals are in, and the field of a goal
  // that holds the text.
  wording: { via: string; file: string; field: string }
}

// Nodes of the curriculum institute's open data. What an importer needs to
// pick them: the files and entity types to walk, the filter on area (the
// `where` of a step) and on level, and the fields that hold the wording, the
// code and the id.
export interface DataSelection {
  kind: 'data'
  // From the top of the tree to its leaves, one step per file.
  walk: readonly DataStep[]
  // Set when the records are goal-at-level objects joined from another
  // repository. Left out when they are objects of the walk itself.
  join?: DataJoin
  // The entity types whose objects are records: steps of the walk, or the join's entity.
  recordEntities: readonly string[]
  // The field of a record object that holds the wording. With a join, the wording is where `join.wording` says and this is left out.
  wordingField?: string
  // The field of a record object that holds its code.
  codeField: string
  // Left out when the `where` of the steps already picks the level.
  level?: DataLevel
  // The step whose objects group the records, and the field that tells the groups apart.
  groupBy: { entity: string; field: string }
  // The records under each group. `name` is the group as `Lane.domains` and
  // `Batch.values` name it; where that is not the bare value of the
  // `groupBy` field, the value closes the name in brackets.
  groups: readonly Domain[]
  // Order, traps, and what in the data is not a record.
  notes: string
}

export type Selection = RowSelection | StatementSelection | LegalSelection | DataSelection

// The open-data nodes that carry the same statements as a part whose wording
// is read from elsewhere: the law is canonical, and the data is its check
// rendition, or gives ids only.
export interface DataNodes {
  // The id of the source record of the repository the walk starts in.
  source: string
  selection: DataSelection
  // True when every statement of the part has exactly one node and every
  // node one statement. A record's slug then takes its node's `id`, so ids
  // stay unique where printed codes repeat.
  idsPairOneToOne: boolean
  // How a node is matched to its statement, or why none can be.
  pairing: string
}

// ---------------------------------------------------------------------------
// Lanes.
// ---------------------------------------------------------------------------

// The statements of a lane that are read from one canonical rendition and
// checked against one rendition. Most lanes have one part. A lane has several
// when its statements come from several files, or when one file's statements
// are checked against different files.
export interface LanePart {
  // What the part holds, in the source's own terms.
  name: string
  // The canonical rendition: the id of the source record the official wording is read from.
  source: string
  // What the second check reads: the id of a different source record, or SAME_FILE.
  checkRendition: string
  // `second-rendition` when the check reads a different official file, `second-reading` when it reads the same file again.
  checkStrength: CheckStrength
  // Where in the check rendition the statements are, and how it splits or prints them differently from the canonical one.
  checkGranularity: string
  expectedCount: number
  selection: Selection
  // Netherlands: the open-data nodes that carry the same statements, where
  // the wording is read from the legal text or a decree instead. The second
  // check reads them when `checkRendition` is their repository.
  dataNodes?: DataNodes
}

export interface Domain {
  // The official domain or strand as printed, or as the export's domain column holds it.
  name: string
  // The records of the lane that fall under it.
  count: number
}

// A statement the selection would pick that is deliberately not a record of
// this lane. The expected count excludes it, and the lane's frame lists it.
export interface Skipped {
  code: string
  reason: string
}

// A set of records one writer and one checker take together (plan KTD13).
// The batches of a lane are disjoint and together hold every record.
export interface Batch {
  name: string
  // The values of the lane's `batchKey` whose records are in this batch.
  values: readonly string[]
  size: number
}

// What a lane lacks when an optional source cannot be fetched (plan KTD2).
export interface Gap {
  // The id of the optional source record.
  source: string
  gap: string
}

export interface Lane {
  jurisdiction: Jurisdiction
  // One of LEVELS[jurisdiction].
  level: string
  subject: Subject
  title: string
  // Set when the publisher publishes nothing for this level and subject: the
  // reason. Such a lane has no sources, no parts and an expected count of 0.
  nothingPublished?: string
  // Netherlands only: the sets of core goals the lane's records belong to.
  regimes?: readonly string[]
  // The id of every source record the lane draws from: canonical renditions,
  // check renditions, and files read only for the frame.
  sources: readonly string[]
  parts: readonly LanePart[]
  // The records the lane should hold: the sum of its parts.
  expectedCount: number
  // Exactly how the number was counted from the source's own index.
  countingMethod: string
  // True when the only index is the file the importer reads. The count is then
  // circular, and the second check's reverse pass is what finds a standard
  // the file lacks.
  countIsFromImportFile: boolean
  // The official domains or strands included, with the records under each.
  domains: readonly Domain[]
  // What one record is, and how the source prints its codes.
  granularity: string
  skipped: readonly Skipped[]
  // For a lane of more than BATCH_LIMIT records: what its batches are split
  // by. For a lane of export rows, the name of the domain column. Otherwise
  // `group`: the `group` of each located statement, and for a part of
  // open-data nodes the `name` of each of its selection's `groups`.
  batchKey?: string
  batches?: readonly Batch[]
  gaps?: readonly Gap[]
  // Why a domain was mapped to this subject, where that is not obvious, and
  // anything else the lane's frame should say.
  notes?: string
}

// An official domain that is not recorded, and why.
export interface LeftOut {
  jurisdiction: Jurisdiction
  level: string
  // The domain as the publisher names it.
  domain: string
  reason: string
}

// ---------------------------------------------------------------------------
// Sources: what a tool needs to read each official file.
// ---------------------------------------------------------------------------

export type TextEncoding = 'utf-8' | 'ascii' | 'windows-1252'

export type Extraction =
  // A file read as text: a row export, a data file, a web page.
  | { kind: 'text'; format: 'csv' | 'json' | 'html'; encoding: TextEncoding }
  // A PDF read with pdftotext: plain (no flag), -layout or -raw.
  | { kind: 'pdf'; mode: 'plain' | 'layout' | 'raw' }
  // A PDF whose tables neither text mode reads: pdftotext -bbox, then words
  // assigned to columns as `columns` says. `bounds` gives the x positions, in
  // points from the left edge of the page, where the second and each later
  // column starts on every page of the file. With it the gutters are not
  // looked for: it is for a table whose columns stand too close for that.
  | { kind: 'pdf'; mode: 'bbox'; columns: string; bounds?: readonly number[] }
  // A word-processor file: the named part of the zip is read as XML.
  | { kind: 'docx'; part: string }
  // A PDF whose statements are drawn as images: only headings and bullet
  // glyphs are in its text layer. `text` says how the wording is read (by
  // on-device text recognition of the rendered page, in `language`) and how
  // a recognised line is given to its bullet. The wording is then checked by
  // eye against the page, and the lane's frame says so.
  | { kind: 'pdf'; mode: 'ocr'; language: string; text: string }
  // A regulation in the XML of the Dutch legislation repository (BWB
  // "toestand"). Elements are found by their `bwb-ng-variabel-deel` path.
  // The publication data (`meta-data`, `jcis`) is not text, and an inline
  // image (`plaatje`) is written as IMAGE_PLACEHOLDER.
  | { kind: 'legal-xml' }
  // A git clone. `file` is the clone's folder; the data files are under
  // `dataPath` in it.
  | { kind: 'git'; dataPath: string; format: 'json' }

// What stands in official wording where the legal text prints an image.
export const IMAGE_PLACEHOLDER = '[afbeelding]'

export interface SourcePlan {
  // The id of the source record.
  source: string
  // The folder that holds the copy already fetched by hand, under the store's
  // incoming/<jurisdiction>/, and the name of the file in it.
  incomingKey: string
  file: string
  extraction: Extraction
}

// ---------------------------------------------------------------------------
// The aggregate.
// ---------------------------------------------------------------------------

// A lane with more records than this is split into batches of at most this many.
export const BATCH_LIMIT = 60

export const MANIFEST: readonly Lane[] = [...US_CA_LANES, ...NL_LANES]

export const SOURCE_PLANS: readonly SourcePlan[] = [...US_CA_SOURCE_PLANS, ...NL_SOURCE_PLANS]

export const LEFT_OUT: readonly LeftOut[] = [...US_CA_LEFT_OUT, ...NL_LEFT_OUT]

// How a source is read: its plan among `plans`, by the id of its source
// record. Throws for a source that has none.
export function planFor(id: string, plans: readonly SourcePlan[] = SOURCE_PLANS): SourcePlan {
  const plan = plans.find((each) => each.source === id)
  if (!plan) throw new Error(`the manifest has no plan for reading ${id}`)
  return plan
}

export function lanesFor(jurisdiction: Jurisdiction): Lane[] {
  return MANIFEST.filter((lane) => lane.jurisdiction === jurisdiction)
}

export function laneOf(jurisdiction: Jurisdiction, level: string, subject: string): Lane | undefined {
  return MANIFEST.find((lane) => lane.jurisdiction === jurisdiction && lane.level === level && lane.subject === subject)
}

// The batches of a lane: its own, or the whole lane as one batch, or none for
// a lane with no records.
export function batchesOf(lane: Lane): readonly Batch[] {
  if (lane.batches) return lane.batches
  return lane.expectedCount === 0 ? [] : [{ name: 'all', values: [], size: lane.expectedCount }]
}

// ---------------------------------------------------------------------------
// The check of the manifest against the source records.
// ---------------------------------------------------------------------------

// What the check needs to know of a source record.
export interface SourceFacts {
  id: string
  required: boolean
  // Empty before the first fetch.
  pin: string
  // The record's `pin_kind`, and its notes: the body under the frontmatter.
  pinKind?: PinKind
  notes?: string
}

// The sentence a source record's notes hold when its pin is left empty on
// purpose: the file's bytes differ on every download, so no hash of a copy
// made by hand can be its pin.
export const FETCH_COMPUTES_PIN = 'The fetch computes this pin.'

// Every way the lanes and the source records disagree, as sentences. A lane
// names a source record that exists or says nothing is published; a required
// source is pinned; an optional source may be unpinned only when each lane
// that names it states what it then lacks. One more source may be unpinned:
// one pinned by its extracted text whose notes say that the fetch computes
// the pin.
export function checkManifest(lanes: readonly Lane[], sources: readonly SourceFacts[]): string[] {
  const byId = new Map(sources.map((source) => [source.id, source]))
  const findings: string[] = []
  for (const lane of lanes) {
    const where = laneKey(lane)
    if (lane.nothingPublished !== undefined) continue
    if (lane.sources.length === 0) {
      findings.push(`${where} names no source and does not state that nothing is published`)
      continue
    }
    for (const id of lane.sources) {
      const source = byId.get(id)
      if (!source) findings.push(`${where} names ${id}, and there is no source record with that id`)
      else if (source.pin !== '') continue
      else if (source.pinKind === 'extracted-text' && source.notes?.includes(FETCH_COMPUTES_PIN)) continue
      else if (source.required) findings.push(`${where} names the required source ${id}, which has no pin: fetch it first`)
      else if (!lane.gaps?.some((gap) => gap.source === id)) {
        findings.push(`${where} names the optional source ${id}, which has no pin, and does not state the gap that leaves`)
      }
    }
  }
  return findings
}
