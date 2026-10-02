// The lane manifest and the source records, checked against each other: every
// cell planned once, every count stated and adding up, every batch small
// enough, every source on disk and pinned.

import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BATCH_LIMIT, FETCH_COMPUTES_PIN, IMAGE_PLACEHOLDER, LEFT_OUT, MANIFEST, SOURCE_PLANS, batchesOf, checkManifest, laneOf, lanesFor } from '../manifest.ts'
import type { DataSelection, Lane, Selection, SourceFacts, StatementRef } from '../manifest.ts'
import { NL_IMAGE_TRANSCRIPTIONS, imageMarker } from '../manifest/nl-additions.ts'
import { parseRecord } from './record.ts'
import { CHECK_STRENGTHS, JURISDICTIONS, LEVELS, REGIMES, SAME_FILE, SUBJECTS, sourceId } from './schema.ts'
import type { PinKind } from './schema.ts'

const SOURCES_DIR = resolve(import.meta.dirname, '..', 'sources')

const sourceFiles = readdirSync(SOURCES_DIR)
  .filter((name) => name.endsWith('.md'))
  .map((name) => ({ name, text: readFileSync(resolve(SOURCES_DIR, name), 'utf8') }))

// What the manifest check needs to know of each source record on disk.
const sourceRecords: SourceFacts[] = sourceFiles.map(({ name, text }) => {
  const { frontmatter, preface } = parseRecord(text, name)
  return { id: String(frontmatter.id), required: frontmatter.required === true, pin: String(frontmatter.pin), pinKind: frontmatter.pin_kind as PinKind, notes: preface }
})

const published = MANIFEST.filter((lane) => lane.nothingPublished === undefined)
const name = (lane: Lane): string => `${lane.jurisdiction}/${lane.level}/${lane.subject}`
const sum = (numbers: readonly number[]): number => numbers.reduce((total, n) => total + n, 0)

// The statements a selection lists one by one, or null when it selects by rule.
const listed = (selection: Selection): readonly StatementRef[] | null => (selection.kind === 'statements' || selection.kind === 'legal' ? selection.statements : null)

// Every open-data selection in the manifest: a part's own, or the nodes beside a part read from elsewhere.
const dataSelections: { where: string; from: string; selection: DataSelection; lane: Lane }[] = published.flatMap((lane) =>
  lane.parts.flatMap((part) => [
    ...(part.selection.kind === 'data' ? [{ where: `${name(lane)} ${part.name}`, from: part.source, selection: part.selection, lane }] : []),
    ...(part.dataNodes ? [{ where: `${name(lane)} ${part.name} (data nodes)`, from: part.dataNodes.source, selection: part.dataNodes.selection, lane }] : []),
  ]),
)

// A small lane for the pin rule: one part read from one source.
function fixtureLane(source: string, extra: Partial<Lane> = {}): Lane {
  return {
    jurisdiction: 'us-ca',
    level: 'kindergarten',
    subject: 'mathematics',
    title: 'Example lane',
    sources: [source],
    parts: [
      {
        name: 'Example part',
        source,
        checkRendition: SAME_FILE,
        checkStrength: 'second-reading',
        checkGranularity: 'The same file, read again.',
        expectedCount: 1,
        selection: { kind: 'rows', codeColumn: 'Code', domainColumn: 'Domain', where: { Grade: ['K'] } },
      },
    ],
    expectedCount: 1,
    countingMethod: 'Rows of the example file.',
    countIsFromImportFile: true,
    domains: [{ name: 'Example domain', count: 1 }],
    granularity: 'One record per row.',
    skipped: [],
    ...extra,
  }
}

describe('the lanes', () => {
  it.each([
    ['us-ca', 32],
    ['nl', 20],
  ] as const)('holds exactly one lane for every level and subject of %s', (jurisdiction, count) => {
    const cells = lanesFor(jurisdiction).map((lane) => `${lane.level}/${lane.subject}`)
    const wanted = LEVELS[jurisdiction].flatMap((level) => SUBJECTS.map((subject) => `${level}/${subject}`))
    expect(wanted).toHaveLength(count)
    expect([...cells].sort()).toEqual([...wanted].sort())
    for (const level of LEVELS[jurisdiction]) {
      for (const subject of SUBJECTS) expect(laneOf(jurisdiction, level, subject)?.level).toBe(level)
    }
  })

  it('maps no lane to a subject outside the four, or to a level its jurisdiction does not have', () => {
    for (const lane of MANIFEST) {
      expect(JURISDICTIONS, name(lane)).toContain(lane.jurisdiction)
      expect(SUBJECTS, name(lane)).toContain(lane.subject)
      expect(LEVELS[lane.jurisdiction], name(lane)).toContain(lane.level)
      expect(lane.title.trim(), name(lane)).not.toBe('')
    }
  })

  it('names at least one source record that exists, or states that nothing is published', () => {
    const onDisk = new Set(sourceRecords.map((source) => source.id))
    for (const lane of MANIFEST) {
      if (lane.nothingPublished !== undefined) {
        expect(lane.nothingPublished.trim(), name(lane)).not.toBe('')
        expect(lane.sources, name(lane)).toEqual([])
        expect(lane.parts, name(lane)).toEqual([])
        continue
      }
      expect(lane.sources.length, name(lane)).toBeGreaterThan(0)
      for (const source of lane.sources) expect(onDisk.has(source), `${name(lane)} names ${source}`).toBe(true)
    }
  })

  it('reads each part from a source the lane names, and checks it against one too', () => {
    for (const lane of published) {
      expect(lane.parts.length, name(lane)).toBeGreaterThan(0)
      for (const part of lane.parts) {
        expect(lane.sources, name(lane)).toContain(part.source)
        expect(CHECK_STRENGTHS, name(lane)).toContain(part.checkStrength)
        expect(part.checkGranularity.trim(), name(lane)).not.toBe('')
        if (part.checkRendition === SAME_FILE) {
          expect(part.checkStrength, name(lane)).toBe('second-reading')
        } else {
          // A second rendition is a different official file.
          expect(part.checkRendition, name(lane)).not.toBe(part.source)
          expect(lane.sources, name(lane)).toContain(part.checkRendition)
          expect(part.checkStrength, name(lane)).toBe('second-rendition')
        }
      }
    }
  })

  it('states an expected count and how it was counted, or that nothing is published', () => {
    for (const lane of MANIFEST) {
      if (lane.nothingPublished !== undefined) {
        expect(lane.expectedCount, name(lane)).toBe(0)
        continue
      }
      expect(lane.expectedCount, name(lane)).toBeGreaterThan(0)
      expect(lane.countingMethod.trim(), name(lane)).not.toBe('')
      expect(lane.granularity.trim(), name(lane)).not.toBe('')
    }
  })

  it('has counts per part, and per official domain, that sum to the lane total', () => {
    for (const lane of published) {
      expect(sum(lane.parts.map((part) => part.expectedCount)), `${name(lane)} parts`).toBe(lane.expectedCount)
      expect(sum(lane.domains.map((domain) => domain.count)), `${name(lane)} domains`).toBe(lane.expectedCount)
      for (const part of lane.parts) expect(part.expectedCount, `${name(lane)} ${part.name}`).toBeGreaterThan(0)
    }
  })

  it('lists every statement of a part that is located in a document or a regulation, once in its lane', () => {
    for (const lane of published) {
      const inLane: string[] = []
      for (const part of lane.parts) {
        const statements = listed(part.selection)
        if (!statements) continue
        const keys = statements.map((statement) => `${statement.group} ${statement.code}`)
        expect(keys.length, `${name(lane)} ${part.name}`).toBe(part.expectedCount)
        inLane.push(...keys)
        if (part.selection.kind === 'legal') expect(part.selection.elements.length, `${name(lane)} ${part.name}`).toBeGreaterThan(0)
      }
      expect(new Set(inLane).size, name(lane)).toBe(inLane.length)
    }
  })

  it('shows how an image is written wherever a legal part says its text holds one: a transcription marked as an image, in the form of the placeholder', () => {
    const withImages = published.flatMap((lane) => lane.parts).filter((part) => part.selection.kind === 'legal' && part.selection.locate.includes('plaatje'))
    expect(withImages.length).toBeGreaterThan(0)
    // "[afbeelding: 3/4]" is the placeholder "[afbeelding]" with the transcription inside it.
    const marked = new RegExp(`${IMAGE_PLACEHOLDER.slice(0, -1).replace('[', '\\[')}: [^\\]]+\\]`)
    expect(imageMarker('3/4')).toMatch(marked)
    for (const part of withImages) if (part.selection.kind === 'legal') expect(part.selection.locate, part.name).toMatch(marked)
  })

  it('lists every transcribed image under a statement of a legal part of the lane it names', () => {
    for (const [source, images] of Object.entries(NL_IMAGE_TRANSCRIPTIONS)) {
      for (const [image, entry] of Object.entries(images)) {
        const lane = lanesFor('nl').find((each) => `${each.level}/${each.subject}` === entry.lane)
        const parts = (lane?.parts ?? []).filter((part) => part.source === source && part.selection.kind === 'legal')
        const statements = parts.flatMap((part) => listed(part.selection) ?? [])
        expect(statements.some((statement) => statement.group === entry.group && statement.code === entry.code), `${image}: ${entry.lane}, ${entry.group}, ${entry.code}`).toBe(true)
        expect(entry.sha256, image).toMatch(/^[0-9a-f]{64}$/)
      }
    }
  })

  it('counts the groups of an open-data part to its expected count', () => {
    for (const lane of published) {
      for (const part of lane.parts) {
        if (part.selection.kind !== 'data') continue
        expect(sum(part.selection.groups.map((group) => group.count)), `${name(lane)} ${part.name}`).toBe(part.expectedCount)
      }
    }
  })

  it('gives a reason for every statement it skips, and skips none twice', () => {
    for (const lane of MANIFEST) {
      const codes = lane.skipped.map((skipped) => skipped.code)
      expect(new Set(codes).size, name(lane)).toBe(codes.length)
      for (const skipped of lane.skipped) expect(skipped.reason.trim(), `${name(lane)} ${skipped.code}`).not.toBe('')
    }
  })

  it('counts 1,127 records for California', () => {
    expect(sum(lanesFor('us-ca').map((lane) => lane.expectedCount))).toBe(1127)
  })

  it('counts 2,307 records for the Netherlands', () => {
    expect(sum(lanesFor('nl').map((lane) => lane.expectedCount))).toBe(2307)
    const byLevel = LEVELS.nl.map((level) => sum(lanesFor('nl').filter((lane) => lane.level === level).map((lane) => lane.expectedCount)))
    expect(byLevel).toEqual([201, 620, 342, 431, 713])
  })

  it('names the sets of core goals of every Dutch lane that holds core goals, and of no other', () => {
    for (const lane of lanesFor('nl')) {
      for (const regime of lane.regimes ?? []) expect(REGIMES.nl, name(lane)).toContain(regime)
      expect((lane.regimes ?? []).length > 0, name(lane)).toBe(lane.level === 'einde-po')
    }
    for (const lane of lanesFor('us-ca')) expect(lane.regimes, name(lane)).toBeUndefined()
  })
})

describe('open-data selections', () => {
  it('walks from a first file down, and names what a record is', () => {
    expect(dataSelections.length).toBeGreaterThan(0)
    for (const { where, selection } of dataSelections) {
      expect(selection.walk.length, where).toBeGreaterThan(0)
      expect(selection.walk[0]!.via, where).toBeUndefined()
      for (const step of selection.walk.slice(1)) expect(step.via, `${where} ${step.file}`).toBeDefined()
      const entities = [...selection.walk.map((step) => step.entity), ...(selection.join ? [selection.join.entity] : [])]
      expect(selection.recordEntities.length, where).toBeGreaterThan(0)
      for (const entity of selection.recordEntities) expect(entities, where).toContain(entity)
      expect(entities, where).toContain(selection.groupBy.entity)
      expect(selection.groups.length, where).toBeGreaterThan(0)
    }
  })

  it('reads the wording from the record itself or through the join, never both', () => {
    for (const { where, selection } of dataSelections) {
      expect(selection.wordingField === undefined, where).toBe(selection.join !== undefined)
      if (selection.join) expect(selection.recordEntities, where).toEqual([selection.join.entity])
    }
  })

  it('names every repository it reads among the sources of its lane', () => {
    const kind = new Map(SOURCE_PLANS.map((plan) => [plan.source, plan.extraction.kind]))
    for (const { where, from, selection, lane } of dataSelections) {
      for (const source of [from, selection.join?.source, selection.level?.source]) {
        if (source === undefined) continue
        expect(lane.sources, where).toContain(source)
        expect(kind.get(source), `${where} ${source}`).toBe('git')
      }
    }
  })
})

describe('batches', () => {
  // How many of a lane's records fall under each value of its batch key.
  function sizesByKey(lane: Lane): Map<string, number> {
    const sizes = new Map<string, number>()
    const add = (key: string, n: number): void => void sizes.set(key, (sizes.get(key) ?? 0) + n)
    if (lane.batchKey === 'group') {
      for (const part of lane.parts) {
        const statements = listed(part.selection)
        if (statements) for (const statement of statements) add(statement.group, 1)
        else if (part.selection.kind === 'data') for (const group of part.selection.groups) add(group.name, group.count)
        else throw new Error(`${name(lane)} batches by group but ${part.name} has no groups`)
      }
    } else {
      // A lane of export rows is batched by its domain column.
      for (const part of lane.parts) {
        if (part.selection.kind !== 'rows' || part.selection.domainColumn !== lane.batchKey) {
          throw new Error(`${name(lane)} batches by ${lane.batchKey}, which is not the domain column of ${part.name}`)
        }
      }
      for (const domain of lane.domains) add(domain.name, domain.count)
    }
    return sizes
  }

  it('splits every lane of more than 60 records into batches of at most 60', () => {
    expect(BATCH_LIMIT).toBe(60)
    const large = published.filter((lane) => lane.expectedCount > BATCH_LIMIT)
    for (const jurisdiction of JURISDICTIONS) expect(large.filter((lane) => lane.jurisdiction === jurisdiction).length, jurisdiction).toBeGreaterThan(0)
    for (const lane of large) {
      expect(lane.batchKey, name(lane)).toBeDefined()
      expect(lane.batches?.length ?? 0, name(lane)).toBeGreaterThan(1)
    }
    for (const lane of published) {
      for (const batch of batchesOf(lane)) expect(batch.size, `${name(lane)} ${batch.name}`).toBeLessThanOrEqual(BATCH_LIMIT)
    }
  })

  it('has batch sizes that sum to the expected count', () => {
    for (const lane of MANIFEST) expect(sum(batchesOf(lane).map((batch) => batch.size)), name(lane)).toBe(lane.expectedCount)
  })

  it('gives every record to exactly one batch, by the stated key', () => {
    for (const lane of published.filter((each) => each.batches !== undefined)) {
      const sizes = sizesByKey(lane)
      const values = lane.batches!.flatMap((batch) => batch.values)
      expect(new Set(values).size, `${name(lane)}: a key value sits in two batches`).toBe(values.length)
      expect([...values].sort(), name(lane)).toEqual([...sizes.keys()].sort())
      for (const batch of lane.batches!) {
        expect(sum(batch.values.map((value) => sizes.get(value) ?? 0)), `${name(lane)} ${batch.name}`).toBe(batch.size)
      }
      const names = lane.batches!.map((batch) => batch.name)
      expect(new Set(names).size, name(lane)).toBe(names.length)
    }
  })

  it('treats a lane without batches as one batch, and a lane with nothing published as none', () => {
    const small = published.find((lane) => lane.batches === undefined)!
    expect(batchesOf(small)).toEqual([{ name: 'all', values: [], size: small.expectedCount }])
    const empty = fixtureLane('unused', { nothingPublished: 'The publisher has no statement for this cell.', sources: [], parts: [], expectedCount: 0, domains: [] })
    expect(batchesOf(empty)).toEqual([])
  })
})

describe('the pin rule', () => {
  const required = sourceId('us-ca', 'example-required')
  const optional = sourceId('us-ca', 'example-optional')
  const pin = 'a'.repeat(64)

  it('passes when every source a lane names is pinned', () => {
    expect(checkManifest([fixtureLane(required)], [{ id: required, required: true, pin }])).toEqual([])
  })

  it('fails on a required source with an empty pin', () => {
    const findings = checkManifest([fixtureLane(required)], [{ id: required, required: true, pin: '' }])
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain(required)
    expect(findings[0]).toContain('no pin')
  })

  it('fails on an optional source with an empty pin when its lane does not state the gap', () => {
    const findings = checkManifest([fixtureLane(optional)], [{ id: optional, required: false, pin: '' }])
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain('gap')
  })

  it('passes an optional source with an empty pin when its lane states the gap', () => {
    const lane = fixtureLane(optional, { gaps: [{ source: optional, gap: 'Without this file the lane holds no record.' }] })
    expect(checkManifest([lane], [{ id: optional, required: false, pin: '' }])).toEqual([])
  })

  it('fails on a lane that names a source with no record', () => {
    const findings = checkManifest([fixtureLane(required)], [])
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain('no source record')
  })

  it('fails on a lane with neither a source nor a statement that nothing is published', () => {
    const findings = checkManifest([fixtureLane(required, { sources: [], parts: [] })], [])
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain('nothing is published')
  })

  it('passes a required source pinned by its extracted text with an empty pin, when its notes say the fetch computes it', () => {
    const waiting: SourceFacts = { id: required, required: true, pin: '', pinKind: 'extracted-text', notes: `The file differs on every download. ${FETCH_COMPUTES_PIN}` }
    expect(checkManifest([fixtureLane(required)], [waiting])).toEqual([])
  })

  it('fails on that source when its notes do not say so, or when it is pinned another way', () => {
    const silent: SourceFacts = { id: required, required: true, pin: '', pinKind: 'extracted-text', notes: 'The file differs on every download.' }
    const bytes: SourceFacts = { id: required, required: true, pin: '', pinKind: 'bytes', notes: FETCH_COMPUTES_PIN }
    for (const source of [silent, bytes]) {
      const findings = checkManifest([fixtureLane(required)], [source])
      expect(findings).toHaveLength(1)
      expect(findings[0]).toContain('no pin')
    }
  })

  it('passes on the real manifest and the source records on disk', () => {
    expect(checkManifest(MANIFEST, sourceRecords)).toEqual([])
  })

  it('finds every California source pinned, with one optional source whose lane states the gap', () => {
    const california = sourceRecords.filter((source) => source.id.startsWith(sourceId('us-ca', '')))
    expect(california).toHaveLength(22)
    for (const source of california) expect(source.pin, source.id).toMatch(/^[0-9a-f]{64}$/)
    const optionalOnes = california.filter((source) => !source.required)
    expect(optionalOnes).toHaveLength(1)
    const lanes = MANIFEST.filter((lane) => lane.sources.includes(optionalOnes[0]!.id))
    expect(lanes.length).toBeGreaterThan(0)
    for (const lane of lanes) expect(lane.gaps?.map((gap) => gap.source), name(lane)).toContain(optionalOnes[0]!.id)
  })

  it('finds every Dutch source required and pinned by its kind, but for the one draft whose pin the fetch computes', () => {
    const dutch = sourceFiles
      .map(({ name: file, text }) => ({ file, ...parseRecord(text, file) }))
      .filter(({ frontmatter }) => frontmatter.jurisdiction === 'nl')
    expect(dutch).toHaveLength(40)
    const unpinned: string[] = []
    for (const { file, frontmatter, preface } of dutch) {
      expect(frontmatter.id, file).toBe(sourceId('nl', file.slice(0, -'.md'.length)))
      expect(frontmatter.required, file).toBe(true)
      expect(frontmatter.reuse_policy, file).toBe('verbatim')
      const pin = String(frontmatter.pin)
      if (pin === '') {
        unpinned.push(file)
        expect(frontmatter.pin_kind, file).toBe('extracted-text')
        expect(preface, file).toContain(FETCH_COMPUTES_PIN)
      } else expect(pin, file).toMatch(frontmatter.pin_kind === 'git-commit' ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/)
    }
    // The one source pinned by its extracted text had an empty pin until its first fetch.
    expect(unpinned).toEqual([])
  })
})

describe('the source plans', () => {
  it('has one plan for every source record on disk, and no other', () => {
    expect(SOURCE_PLANS.map((plan) => plan.source).sort()).toEqual(sourceRecords.map((source) => source.id).sort())
  })

  it('names the folder and file of the fetched copy, each once', () => {
    const places = SOURCE_PLANS.map((plan) => `${plan.incomingKey}/${plan.file}`)
    expect(new Set(places).size).toBe(places.length)
    for (const plan of SOURCE_PLANS) {
      expect(plan.incomingKey, plan.source).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(plan.file.trim(), plan.source).not.toBe('')
    }
  })

  it('reads every lane from sources that have a plan', () => {
    const planned = new Set(SOURCE_PLANS.map((plan) => plan.source))
    for (const lane of MANIFEST) {
      for (const source of lane.sources) expect(planned.has(source), `${name(lane)} names ${source}`).toBe(true)
    }
  })

  it('selects rows only from text exports, statements from documents, legal statements from legal XML and nodes from clones', () => {
    const kind = new Map(SOURCE_PLANS.map((plan) => [plan.source, plan.extraction.kind]))
    const reads = { rows: ['text'], statements: ['pdf', 'docx'], legal: ['legal-xml'], data: ['git'] }
    for (const lane of published) {
      for (const part of lane.parts) expect(reads[part.selection.kind], `${name(lane)} ${part.name}`).toContain(kind.get(part.source))
    }
  })

  it('reads a statement from a card without a text layer only where the part says so', () => {
    const plan = new Map(SOURCE_PLANS.map((each) => [each.source, each.extraction]))
    const recognised = published.flatMap((lane) => lane.parts.filter((part) => plan.get(part.source)?.kind === 'pdf' && (plan.get(part.source) as { mode: string }).mode === 'ocr'))
    expect(recognised.length).toBeGreaterThan(0)
    for (const part of recognised) {
      expect(part.selection.kind, part.name).toBe('statements')
      if (part.selection.kind === 'statements') expect(part.selection.locate, part.name).toMatch(/text recognition/i)
    }
  })
})

describe('what is left out', () => {
  it('gives a level of its jurisdiction and a reason for every domain left out', () => {
    for (const jurisdiction of JURISDICTIONS) expect(LEFT_OUT.filter((entry) => entry.jurisdiction === jurisdiction).length, jurisdiction).toBeGreaterThan(0)
    for (const entry of LEFT_OUT) {
      expect(LEVELS[entry.jurisdiction], entry.domain).toContain(entry.level)
      expect(entry.domain.trim()).not.toBe('')
      expect(entry.reason.trim(), entry.domain).not.toBe('')
    }
  })
})

describe('each lane stands alone', () => {
  // The manifest has no field that relates a lane to one in the other
  // jurisdiction (plan R14). These hold that line cheaply.
  const other = (jurisdiction: string): string[] => JURISDICTIONS.filter((each) => each !== jurisdiction).map((each) => `edu.${each}.`)

  it('has no field for an equivalent lane', () => {
    const keys = new Set<string>()
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) value.forEach(collect)
      else if (value !== null && typeof value === 'object') {
        for (const [key, inner] of Object.entries(value)) {
          keys.add(key)
          // The keys of a `where` are export column names or data field names, not fields of the manifest.
          if (key !== 'where') collect(inner)
        }
      }
    }
    collect(MANIFEST)
    expect([...keys].filter((key) => /equal|equiv|same|correspond|counterpart|crosswalk|align/i.test(key))).toEqual([])
  })

  it('names no record of the other jurisdiction in a lane', () => {
    for (const lane of MANIFEST) {
      const text = JSON.stringify(lane)
      for (const prefix of other(lane.jurisdiction)) expect(text.includes(prefix), `${name(lane)} mentions ${prefix}`).toBe(false)
    }
  })

  it('names no record of the other jurisdiction in a source record', () => {
    for (const { name: file, text } of sourceFiles) {
      const jurisdiction = String(parseRecord(text, file).frontmatter.jurisdiction)
      for (const prefix of other(jurisdiction)) expect(text.includes(prefix), `${file} mentions ${prefix}`).toBe(false)
    }
  })

  // The places of the other jurisdiction, as a lane or a source record would
  // have to name them to say that one of its lanes equals one there.
  const PLACES: Record<string, RegExp> = {
    'us-ca': /\b(?:Netherlands|Dutch|groep|fase|kerndoel|peuters?)\b/i,
    nl: /\b(?:California|kindergarten|preschool|grade \d|Common Core|State Board)\b/i,
  }

  it('says of no lane or source that it equals one of the other jurisdiction', () => {
    for (const lane of MANIFEST) expect(JSON.stringify(lane), name(lane)).not.toMatch(PLACES[lane.jurisdiction]!)
    for (const { name: file, text } of sourceFiles) {
      const jurisdiction = String(parseRecord(text, file).frontmatter.jurisdiction)
      expect(text, file).not.toMatch(PLACES[jurisdiction]!)
    }
  })
})
