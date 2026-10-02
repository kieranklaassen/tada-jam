// A record file as frontmatter plus sections, each kept with its exact bytes
// (plan KTD6). Parsing then serialising any file gives back the same bytes,
// and replacing one region leaves every other byte as it was. That is what
// lets an importer rewrite its own region of 3,500 files without touching what
// the lane's writer wrote, and the reverse.

import { FrontmatterError, parseFrontmatter, serialiseFrontmatter } from './frontmatter.ts'
import type { Frontmatter } from './frontmatter.ts'
import { KINDS, MARKERS, OFFICIAL_WORDING, PENDING, SOURCE_LINE_PREFIX, accompanyingLine, fieldOrder, isAccompanyingLine, regionsFor } from './schema.ts'
import type { FrameFrontmatter, Kind, ObjectiveFrontmatter, OwnRegionHeading, SourceFrontmatter } from './schema.ts'

export interface Section {
  // The heading line exactly as written, without its line break. Any line
  // that starts with `## ` opens a section.
  heading: string
  // The 1-based line the heading is on.
  line: number
  // Every byte after the heading, from its line break up to the next
  // section's heading or the end of the file.
  text: string
}

export interface RecordFile {
  frontmatter: Frontmatter
  // The 1-based line of each frontmatter key.
  lines: Record<string, number>
  // The frontmatter block exactly as written, through the line break after
  // the closing `---`.
  frontmatterText: string
  // Every byte between the frontmatter and the first section. The whole body
  // of a source or frame record with no `## ` heading is here.
  preface: string
  // The 1-based line the preface starts on.
  prefaceLine: number
  sections: Section[]
}

// Throws FrontmatterError when the frontmatter is outside the subset.
export function parseRecord(text: string, file = '<text>'): RecordFile {
  const parsed = parseFrontmatter(text, file)
  const rows = text.slice(parsed.length).split('\n')
  const sections: Section[] = []
  let preface = ''
  rows.forEach((row, index) => {
    const piece = index === 0 ? row : `\n${row}`
    if (row.startsWith('## ')) {
      // The line break before a heading belongs to what came before it.
      if (index > 0) {
        if (sections.length > 0) sections.at(-1)!.text += '\n'
        else preface += '\n'
      }
      sections.push({ heading: row, line: parsed.lineCount + index + 1, text: '' })
    } else if (sections.length > 0) sections.at(-1)!.text += piece
    else preface += piece
  })
  return {
    frontmatter: parsed.data,
    lines: parsed.lines,
    frontmatterText: text.slice(0, parsed.length),
    preface,
    prefaceLine: parsed.lineCount + 1,
    sections,
  }
}

// The same, with a FrontmatterError given back in place of thrown: for a
// caller that says of a file that it cannot be read, and goes on.
export function tryParseRecord(text: string, file: string): RecordFile | FrontmatterError {
  try {
    return parseRecord(text, file)
  } catch (error) {
    if (error instanceof FrontmatterError) return error
    throw error
  }
}

export function serialiseRecord(record: Pick<RecordFile, 'frontmatterText' | 'preface' | 'sections'>): string {
  return record.frontmatterText + record.preface + record.sections.map((section) => section.heading + section.text).join('')
}

// The frontmatter block of a record, keys in the schema's order for its kind.
export function frontmatterBlock(frontmatter: Frontmatter): string {
  const kind = frontmatter.kind
  if (!KINDS.includes(kind as Kind)) throw new Error(`cannot write frontmatter of kind ${String(kind)}`)
  return serialiseFrontmatter(frontmatter, fieldOrder(kind as Kind))
}

// The file with its frontmatter rewritten and every byte of the body as it was.
export function replaceFrontmatter(text: string, frontmatter: Frontmatter): string {
  return serialiseRecord({ ...parseRecord(text), frontmatterText: frontmatterBlock(frontmatter) })
}

// The file with one region's body replaced and every other byte as it was.
// `heading` is one of the region constants in schema.ts; `body` is what goes
// under it (for an own region, the marker and then the text: see
// withMarker). The record must already hold the region, once.
export function replaceRegion(text: string, heading: string, body: string): string {
  const record = parseRecord(text)
  const matches = record.sections.filter((section) => section.heading === heading)
  if (matches.length !== 1) throw new Error(`the record holds ${matches.length} sections headed ${heading}, so it cannot be replaced`)
  const last = record.sections.at(-1)
  const sections = record.sections.map((section) =>
    section === matches[0] ? { ...section, text: `\n\n${body.trim()}\n${section === last ? '' : '\n'}` } : section,
  )
  return serialiseRecord({ ...record, sections })
}

// The body of an own region: its marker, then the text.
export function withMarker(heading: OwnRegionHeading, content: string): string {
  return `${MARKERS[heading]}\n\n${content.trim()}`
}

// The body of an own region that holds its marker: the text after it, and
// how many lines below the heading that text starts. Null when the first
// line of text under the heading is not the marker.
export function afterMarker(heading: OwnRegionHeading, sectionText: string): { content: string; offset: number } | null {
  const rows = sectionText.split('\n')
  const marker = rows.findIndex((row) => row.trim() !== '')
  if (marker === -1 || rows[marker] !== MARKERS[heading]) return null
  return { content: rows.slice(marker + 1).join('\n'), offset: marker + 1 }
}

// The official text that accompanies a statement, as a verbatim record holds
// it in its file: the line that opens it, and the text under that line (what
// supplement_sha256 is the hash of).
export interface Accompanying {
  line: string
  text: string
  // How many lines below the heading the opening line sits.
  offset: number
}

// The official wording region split into the wording (what wording_sha256 is
// the hash of), the official text that accompanies it when the record holds
// any, and its source line. `source` is the whole line, null when the last
// line of the region is not a source line; `sourceOffset` is how many lines
// below the heading it sits.
export function officialWording(sectionText: string): { wording: string; accompanying: Accompanying | null; source: string | null; sourceOffset: number | null } {
  const rows = sectionText.split('\n')
  const last = rows.findLastIndex((row) => row.trim() !== '')
  const row = last === -1 ? '' : rows[last]!
  const sourced = row.startsWith(SOURCE_LINE_PREFIX) && row.slice(SOURCE_LINE_PREFIX.length).trim() !== ''
  const body = sourced ? rows.slice(0, last) : rows
  const opens = body.findIndex(isAccompanyingLine)
  return {
    wording: (opens === -1 ? body : body.slice(0, opens)).join('\n').trim(),
    accompanying: opens === -1 ? null : { line: body[opens]!, text: body.slice(opens + 1).join('\n').trim(), offset: opens },
    source: sourced ? row : null,
    sourceOffset: sourced ? last : null,
  }
}

// What an importer knows of the official wording of a verbatim record:
// the wording, the text after "Source: ", and the official text that
// accompanies the statement with a note of what it is and where it is printed.
export interface Official {
  wording: string
  source: string
  accompanying?: { note: string; text: string }
}

// The body of the official wording region: the wording, then the accompanying text under its line, then the source line.
export function officialBody(official: Official): string {
  const { wording, source, accompanying } = official
  if (wording.split('\n').some((row) => row.startsWith('## ') || isAccompanyingLine(row))) throw new Error('official wording must not hold a line that opens a section or the accompanying text')
  const more = accompanying ? `\n\n${accompanyingLine(accompanying.note)}\n${accompanying.text.trim()}` : ''
  return `${wording.trim()}${more}\n\n${SOURCE_LINE_PREFIX}${source.trim()}`
}

// A source or frame record: frontmatter, then free text.
export function composeRecord(frontmatter: SourceFrontmatter | FrameFrontmatter, notes: string): string {
  const body = notes.trim()
  return frontmatterBlock(frontmatter) + (body === '' ? '' : `\n${body}\n`)
}

// A new objective record as an importer first writes it: frontmatter, the
// official wording with its source line when the source may be quoted, and
// every own region pending. `official.source` is the text after "Source: ".
//
// Official wording is taken only for a verbatim record, so that wording which
// may not be committed has no way into a file through here.
export function draftObjective(frontmatter: ObjectiveFrontmatter, official?: Official): string {
  const verbatim = frontmatter.reuse_policy === 'verbatim'
  if (verbatim && !official) throw new Error(`${frontmatter.id} is verbatim, so it needs its official wording and source line`)
  if (!verbatim && official) throw new Error(`${frontmatter.id} is description-only, so its official wording must not be written`)
  const regions = regionsFor(frontmatter.reuse_policy, frontmatter.content_language).map((heading) => {
    if (heading === OFFICIAL_WORDING) return `${heading}\n\n${officialBody(official!)}\n`
    return `${heading}\n\n${withMarker(heading, PENDING)}\n`
  })
  return `${frontmatterBlock(frontmatter)}\n${regions.join('\n')}`
}
