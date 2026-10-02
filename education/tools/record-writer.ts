// How an importer writes an objective record (plan KTD5, KTD6). Every importer
// writes through here, so the two rules hold in one place:
//
//   - The official wording of a record goes into the store, whatever its
//     reuse policy, and into the file only when the policy is `verbatim`. A
//     description-only record commits the hash of its wording and nothing of
//     the wording itself.
//   - Official text that accompanies a statement without being part of it (a
//     footnote, a clarification, a boundary, an example) goes into the store
//     the same way, and into the file only when the policy is `verbatim`:
//     there it stands in the official wording region, after the wording and
//     before the source line, under a line that says it is accompanying text,
//     what it is and where it is printed. The record commits its hash,
//     `supplement_sha256`, and has no such field when there is no text. The
//     wording hash is the hash of the statement alone, with or without it.
//   - An importer owns the frontmatter and the official wording section. On a
//     record that already exists it rewrites those and leaves every byte a
//     lane agent wrote as it was. A run that changes nothing writes nothing.
//
// A source or a frame record has one writer and no regions: it is
// composeRecord() and a write, and needs nothing from here.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { draftObjective, officialBody, replaceFrontmatter, replaceRegion } from './record.ts'
import type { Official } from './record.ts'
import { OFFICIAL_WORDING, parseId, pathForId } from './schema.ts'
import type { ObjectiveFrontmatter } from './schema.ts'
import { putWording } from './store.ts'
import type { Finding } from './validate.ts'

// Everything an importer knows about an objective but the two hashes, which
// are made here from the wording and the supplement.
export type ObjectiveFields = Omit<ObjectiveFrontmatter, 'wording_sha256' | 'supplement_sha256'>

export interface ObjectiveInput {
  frontmatter: ObjectiveFields
  // The official wording as the source gives it.
  wording: string
  // The official text that accompanies the statement, when the source has any.
  supplement?: string
  // What that text is and where it is printed, in a few words. Needed for a
  // verbatim record that has a supplement: it is written into the file on the
  // line that opens the text.
  supplementNote?: string
  // The text after "Source: ". Written only into a verbatim record.
  source: string
}

export type WriteStatus = 'created' | 'updated' | 'unchanged'

export interface WriteResult {
  // The record file, relative to education/, with forward slashes.
  file: string
  status: WriteStatus
}

// How many of the files a run wrote were created, updated and left unchanged, as its report says it.
export function statusCounts(results: readonly { status: WriteStatus }[]): string {
  const count = (status: WriteStatus): number => results.filter((result) => result.status === status).length
  return `${count('created')} created, ${count('updated')} updated, ${count('unchanged')} unchanged`
}

// Writes one objective record under `education` (the education folder), and
// its official wording and supplement into the store at `store`.
export function writeObjective(education: string, store: string, input: ObjectiveInput): WriteResult {
  const id = input.frontmatter.id
  const file = parseId(id)?.kind === 'objective' ? pathForId(id) : null
  if (!file) throw new Error(`${id} is not the id of an objective record, so there is no file to write it to`)

  const supplement = input.supplement?.trim() ? input.supplement : undefined
  const frontmatter: ObjectiveFrontmatter = {
    ...input.frontmatter,
    wording_sha256: putWording(store, input.wording),
    ...(supplement === undefined ? {} : { supplement_sha256: putWording(store, supplement) }),
  }
  const verbatim = frontmatter.reuse_policy === 'verbatim'
  const path = join(education, file)
  if (verbatim && supplement !== undefined && !input.supplementNote?.trim()) throw new Error(`${id} is verbatim and has accompanying text, so it needs a note of what that text is and where it is printed`)
  const official: Official | undefined = verbatim
    ? { wording: input.wording, source: input.source, ...(supplement === undefined ? {} : { accompanying: { note: input.supplementNote!, text: supplement } }) }
    : undefined

  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, draftObjective(frontmatter, official))
    return { file, status: 'created' }
  }

  const before = readFileSync(path, 'utf8')
  let after = replaceFrontmatter(before, frontmatter)
  if (official) after = replaceRegion(after, OFFICIAL_WORDING, officialBody(official))
  if (after === before) return { file, status: 'unchanged' }
  writeFileSync(path, after)
  return { file, status: 'updated' }
}

// A finding when a lane holds another number of objective files than its
// manifest entry expects, null when the numbers are equal. `lane` is the
// lane's folder relative to education/ (corpus/<jurisdiction>/<level>/<subject>),
// `laneFiles` the objective files an import wrote there. A path listed twice
// is one file: two rows that land on the same slug have overwritten each other.
export function checkCount(lane: string, laneFiles: readonly string[], expected: number): Finding | null {
  const actual = new Set(laneFiles).size
  if (actual === expected) return null
  return {
    file: `${lane}/frame.md`,
    line: 1,
    rule: 'lane-count',
    message: `the lane holds ${actual} objective file(s) and its manifest entry expected ${expected}`,
  }
}
