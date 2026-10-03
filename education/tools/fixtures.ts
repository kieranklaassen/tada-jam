// Sample records for the pack's tests: one source, one frame and one objective
// per jurisdiction, as a small valid tree.
//
// Every wording, publisher, title and link here is invented. No official text
// belongs in a fixture: California's may not be committed at all, and a test
// must not look like a record. Real printed codes are fine.

import { normaliseCode, wordingHash } from './normalise.ts'
import { composeRecord, draftObjective } from './record.ts'
import { frameId, objectiveId, pathForId, sourceId } from './schema.ts'
import type { FrameFrontmatter, ObjectiveFrontmatter, SourceFrontmatter } from './schema.ts'

export const CA_WORDING = 'Count the apples in a basket up to ten.'
export const NL_WORDING = 'Tel de appels in een mand, tot en met tien.'
export const NL_SOURCE = 'Voorbeeldinstituut, Voorbeelddoelen rekenen (2026), doel 1.'

export const caSource: SourceFrontmatter = {
  id: sourceId('us-ca', 'example-counting-standards'),
  kind: 'source',
  title: 'Example Counting Standards',
  publisher: 'Example Department',
  jurisdiction: 'us-ca',
  url: 'https://example.org/standards/counting.csv',
  landing_url: 'https://example.org/standards',
  version: '2013 edition',
  retrieved_on: '2026-10-01',
  revalidate_after: '2027-10-01',
  media_type: 'text/csv',
  reuse_policy: 'description-only',
  terms_quote: 'Example terms: this text may not be reproduced.',
  terms_url: 'https://example.org/terms',
  required: true,
  pin_kind: 'bytes',
  pin: '',
  standing: 'state-board-adopted-standard',
}

export const nlSource: SourceFrontmatter = {
  id: sourceId('nl', 'voorbeeld-rekendoelen'),
  kind: 'source',
  title: 'Voorbeelddoelen rekenen',
  publisher: 'Voorbeeldinstituut',
  jurisdiction: 'nl',
  url: 'https://example.org/doelen/rekenen.json',
  version: '2026',
  retrieved_on: '2026-10-01',
  media_type: 'application/json',
  reuse_policy: 'verbatim',
  terms_quote: 'Voorbeeldvoorwaarden: hergebruik met bronvermelding is toegestaan.',
  terms_url: 'https://example.org/voorwaarden',
  required: true,
  pin_kind: 'extracted-text',
  pin: wordingHash('the pinned text of the example file'),
  standing: 'legal-core-goal',
  regime: '2026',
}

export const caFrame: FrameFrontmatter = {
  id: frameId('us-ca', 'kindergarten', 'mathematics'),
  kind: 'frame',
  title: 'Kindergarten mathematics',
  jurisdiction: 'us-ca',
  level: 'kindergarten',
  subject: 'mathematics',
  sources: [caSource.id],
  expected_count: 1,
  counting_method: 'Rows of the example file for this grade and subject.',
  check_renditions: [],
  check_strength: 'second-reading',
  nothing_published: false,
  status: 'draft',
}

export const nlFrame: FrameFrontmatter = {
  id: frameId('nl', 'fase-1', 'mathematics'),
  kind: 'frame',
  title: 'Fase 1 rekenen',
  jurisdiction: 'nl',
  level: 'fase-1',
  subject: 'mathematics',
  sources: [nlSource.id],
  expected_count: 1,
  counting_method: 'Goals listed under this band in the example file.',
  check_renditions: [nlSource.id],
  check_strength: 'second-rendition',
  nothing_published: false,
  status: 'draft',
}

export const caObjective: ObjectiveFrontmatter = {
  id: objectiveId('us-ca', 'kindergarten', 'mathematics', 'k-cc-1'),
  kind: 'objective',
  title: 'Counting things in a basket',
  jurisdiction: 'us-ca',
  level: 'kindergarten',
  subject: 'mathematics',
  content_language: 'en',
  curriculum_version: '2013',
  status: 'draft',
  authority: 'official',
  code: 'K.CC.1',
  code_key: normaliseCode('K.CC.1'),
  code_scope: 'Example Counting Standards, Counting and Cardinality',
  california_addition: false,
  standing: 'state-board-adopted-standard',
  reuse_policy: 'description-only',
  source: caSource.id,
  locator: 'row K.CC.1',
  wording_sha256: wordingHash(CA_WORDING),
}

export const nlObjective: ObjectiveFrontmatter = {
  id: objectiveId('nl', 'fase-1', 'mathematics', 'getallen-1'),
  kind: 'objective',
  title: 'Appels tellen',
  jurisdiction: 'nl',
  level: 'fase-1',
  subject: 'mathematics',
  content_language: 'nl',
  curriculum_version: '2026',
  effective_from: '2026-08-01',
  status: 'draft',
  authority: 'official',
  code: '1',
  code_key: normaliseCode('1'),
  code_scope: 'Voorbeelddoelen rekenen, Getallen',
  standing: 'legal-core-goal',
  regime: '2026',
  reuse_policy: 'verbatim',
  source: nlSource.id,
  locator: 'doel 1',
  wording_sha256: wordingHash(NL_WORDING),
}

export const CA_FILE = pathForId(caObjective.id)!
export const NL_FILE = pathForId(nlObjective.id)!

// A valid tree as path (relative to education/) to file text. A test changes
// one entry to seed one defect.
export function sampleTree(): Record<string, string> {
  return {
    [pathForId(caSource.id)!]: composeRecord(caSource, 'An invented file of counting statements, one row per statement.'),
    [pathForId(nlSource.id)!]: composeRecord(nlSource, 'Een verzonnen bestand met rekendoelen.'),
    [pathForId(caFrame.id)!]: composeRecord(caFrame, 'Covers counting. Leaves out nothing. Checked by a second reading of the same file.'),
    [pathForId(nlFrame.id)!]: composeRecord(nlFrame, 'Covers the number goals of the band. Checked against the second rendition.'),
    [CA_FILE]: draftObjective(caObjective),
    [NL_FILE]: draftObjective(nlObjective, { wording: NL_WORDING, source: NL_SOURCE }),
  }
}

export function asRecords(tree: Record<string, string>): { file: string; text: string }[] {
  return Object.entries(tree).map(([file, text]) => ({ file, text }))
}
