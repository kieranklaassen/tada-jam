import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CA_FILE, NL_FILE, NL_SOURCE, NL_WORDING, asRecords, caObjective, caSource, nlObjective, nlSource, sampleTree } from './fixtures.ts'
import type { Frontmatter } from './frontmatter.ts'
import { wordingHash } from './normalise.ts'
import { draftObjective, parseRecord, replaceFrontmatter, replaceRegion, withMarker } from './record.ts'
import {
  ACCOMPANYING_PREFIX,
  DESIGN_NOTES,
  DESIGN_NOTES_SUBHEADINGS,
  ENGLISH_GLOSS,
  MARKERS,
  NO_SUMMARY,
  OFFICIAL_WORDING,
  PENDING,
  SUMMARY,
  pathForId,
} from './schema.ts'
import { formatFinding, readRecords, under, validateRecords, validateTree } from './validate.ts'
import type { Finding, ValidateOptions } from './validate.ts'

const CA_SOURCE_FILE = pathForId(caSource.id)!
const NL_SOURCE_FILE = pathForId(nlSource.id)!
const NL_FRAME_FILE = 'corpus/nl/fase-1/mathematics/frame.md'

function check(tree: Record<string, string>, options?: ValidateOptions): Finding[] {
  return validateRecords(asRecords(tree), options)
}

function rules(findings: readonly Finding[]): string[] {
  return findings.map((finding) => `${finding.file} ${finding.rule}`)
}

// The sample tree with one file's text changed.
function seeded(file: string, change: (text: string) => string): Record<string, string> {
  const tree = sampleTree()
  return { ...tree, [file]: change(tree[file]!) }
}

// The sample tree with frontmatter fields of one file set, or removed with undefined.
function withFields(file: string, fields: Frontmatter): Record<string, string> {
  return seeded(file, (text) => replaceFrontmatter(text, { ...parseRecord(text).frontmatter, ...fields }))
}

function lineOf(text: string, needle: string): number {
  return text.slice(0, text.indexOf(needle)).split('\n').length
}

const NOTES = withMarker(
  DESIGN_NOTES,
  [
    DESIGN_NOTES_SUBHEADINGS[0],
    'A child moves apples one at a time and says a number for each.',
    DESIGN_NOTES_SUBHEADINGS[1],
    'Numbers to ten only.',
    DESIGN_NOTES_SUBHEADINGS[2],
    'Saying two numbers for one apple.',
  ].join('\n\n'),
)

// The sample tree with every agent region written.
function writtenTree(): Record<string, string> {
  const tree = sampleTree()
  const ca = replaceRegion(tree[CA_FILE]!, SUMMARY, withMarker(SUMMARY, 'Says how many apples there are, as far as ten.'))
  const nl = replaceRegion(tree[NL_FILE]!, ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'Count the apples, up to and including ten.'))
  return { ...tree, [CA_FILE]: replaceRegion(ca, DESIGN_NOTES, NOTES), [NL_FILE]: replaceRegion(nl, DESIGN_NOTES, NOTES) }
}

describe('a well-formed tree', () => {
  it('validates: a source, a frame and an objective of each jurisdiction, agent regions still pending', () => {
    expect(check(sampleTree())).toEqual([])
  })

  it('validates as complete once every agent region is written', () => {
    expect(check(writtenTree(), { complete: true })).toEqual([])
  })

  it('validates when the summary is the fixed no-summary sentence', () => {
    const tree = writtenTree()
    tree[CA_FILE] = replaceRegion(tree[CA_FILE]!, SUMMARY, withMarker(SUMMARY, NO_SUMMARY))
    expect(check(tree, { complete: true })).toEqual([])
  })
})

describe('the reuse rule', () => {
  it('fails a description-only record that holds an official wording section', () => {
    const tree = seeded(CA_FILE, (text) =>
      text.replace(SUMMARY, `${OFFICIAL_WORDING}\n\nCount the apples in a basket up to ten.\n\nSource: Example Department.\n\n${SUMMARY}`),
    )
    const findings = check(tree)
    expect(rules(findings)).toEqual([`${CA_FILE} official-wording-forbidden`])
    expect(findings[0]!.line).toBe(lineOf(tree[CA_FILE]!, OFFICIAL_WORDING))
  })

  it('fails it even when the record also lacks nothing else, in complete mode', () => {
    const tree = writtenTree()
    tree[CA_FILE] = tree[CA_FILE]!.replace(SUMMARY, `${OFFICIAL_WORDING}\n\nCount the apples.\n\nSource: Example.\n\n${SUMMARY}`)
    expect(rules(check(tree, { complete: true }))).toEqual([`${CA_FILE} official-wording-forbidden`])
  })

  it('fails an objective whose reuse policy is not its source record’s', () => {
    const tree = { ...sampleTree(), [NL_FILE]: draftObjective({ ...nlObjective, reuse_policy: 'description-only' }) }
    const findings = check(tree)
    expect(rules(findings)).toEqual([`${NL_FILE} reuse-policy-mismatch`])
    expect(findings[0]!.message).toContain('verbatim')
    expect(findings[0]!.line).toBe(lineOf(tree[NL_FILE]!, 'reuse_policy:'))
  })

  it('fails a California record marked verbatim, source or objective, and names the field', () => {
    const source = check(withFields(CA_SOURCE_FILE, { reuse_policy: 'verbatim' }))
    expect(rules(source)).toEqual([`${CA_FILE} reuse-policy-mismatch`, `${CA_SOURCE_FILE} vocabulary`])
    expect(source[1]!.message).toMatch(/^reuse_policy /)
    const verbatim = draftObjective(
      { ...caObjective, reuse_policy: 'verbatim' },
      { wording: 'Count the apples in a basket up to ten.', source: 'Example Department.' },
    )
    expect(rules(check({ ...sampleTree(), [CA_FILE]: verbatim }))).toEqual([`${CA_FILE} vocabulary`, `${CA_FILE} reuse-policy-mismatch`])
  })

  it('fails a verbatim record with no source line', () => {
    const tree = seeded(NL_FILE, (text) => text.replace(`Source: ${NL_SOURCE}\n\n`, ''))
    const findings = check(tree)
    expect(rules(findings)).toEqual([`${NL_FILE} source-line`])
    expect(findings[0]!.line).toBe(lineOf(tree[NL_FILE]!, OFFICIAL_WORDING))
  })

  it('fails a verbatim record with no official wording section, and one with a summary', () => {
    const missing = seeded(NL_FILE, (text) => text.replace(`${OFFICIAL_WORDING}\n\n${NL_WORDING}\n\nSource: ${NL_SOURCE}\n\n`, ''))
    expect(rules(check(missing))).toEqual([`${NL_FILE} missing-section`])
    const extra = seeded(NL_FILE, (text) => text.replace(ENGLISH_GLOSS, `${SUMMARY}\n\n${MARKERS[SUMMARY]}\n\n${PENDING}\n\n${ENGLISH_GLOSS}`))
    expect(rules(check(extra))).toEqual([`${NL_FILE} forbidden-section`])
  })

  it('fails official wording whose hash is not the recorded one', () => {
    const tree = seeded(NL_FILE, (text) => text.replace('tot en met tien', 'tot en met twintig'))
    const findings = check(tree)
    expect(rules(findings)).toEqual([`${NL_FILE} wording-hash`])
    expect(findings[0]!.line).toBe(lineOf(tree[NL_FILE]!, 'wording_sha256'))
    expect(findings[0]!.message).toContain(wordingHash('Tel de appels in een mand, tot en met twintig.'))
  })

  it('accepts official wording that differs from the hashed text only in spacing, quotes and dashes', () => {
    expect(check(seeded(NL_FILE, (text) => text.replace('een mand, tot', 'een  mand,\ntot')))).toEqual([])
  })
})

describe('the official text that accompanies a statement, in a verbatim record', () => {
  const EXAMPLE = '(bijv. drie appels en nog twee)'
  const accompanied = (text = EXAMPLE): string => draftObjective({ ...nlObjective, supplement_sha256: wordingHash(EXAMPLE) }, { wording: NL_WORDING, source: NL_SOURCE, accompanying: { note: 'the example printed under this goal', text } })

  it('is accepted when the file holds it under its line and the frontmatter has its hash, and the wording hash is still that of the statement alone', () => {
    const tree = { ...sampleTree(), [NL_FILE]: accompanied() }

    expect(check(tree)).toEqual([])
    expect(parseRecord(tree[NL_FILE]!).frontmatter.wording_sha256).toBe(wordingHash(NL_WORDING))
  })

  it('fails when the text in the file is not the text of the hash', () => {
    const findings = check({ ...sampleTree(), [NL_FILE]: accompanied('(bijv. vier appels en nog twee)') })

    expect(rules(findings)).toEqual([`${NL_FILE} supplement-hash`])
    expect(findings[0]!.message).toContain(wordingHash('(bijv. vier appels en nog twee)'))
  })

  it('fails when the frontmatter has the hash and the file holds no such text, and the other way round', () => {
    const missing = withFields(NL_FILE, { supplement_sha256: wordingHash(EXAMPLE) })
    expect(rules(check(missing))).toEqual([`${NL_FILE} accompanying-text`])

    const unhashed = { ...sampleTree(), [NL_FILE]: replaceFrontmatter(accompanied(), nlObjective) }
    const findings = check(unhashed)
    expect(rules(findings)).toEqual([`${NL_FILE} accompanying-text`])
    expect(findings[0]!.line).toBe(lineOf(unhashed[NL_FILE]!, ACCOMPANYING_PREFIX))
  })

  it('fails a line that opens accompanying text with nothing under it', () => {
    const empty = { ...sampleTree(), [NL_FILE]: accompanied().replace(`${EXAMPLE}\n\n`, '\n') }

    expect(rules(check(empty))).toEqual([`${NL_FILE} accompanying-text`])
  })
})

describe('ids', () => {
  it('fails two records with the same id and names both files', () => {
    const copy = 'corpus/us-ca/kindergarten/mathematics/objectives/k-cc-1-copy.md'
    const tree = { ...sampleTree(), [copy]: sampleTree()[CA_FILE]! }
    const duplicates = check(tree).filter((finding) => finding.rule === 'duplicate-id')
    expect(duplicates.map((finding) => finding.file).sort()).toEqual([CA_FILE, copy].sort())
    for (const finding of duplicates) {
      expect(finding.message).toContain(CA_FILE)
      expect(finding.message).toContain(copy)
    }
  })

  it('fails a record whose id does not match its path', () => {
    const moved = 'corpus/us-ca/grade-1/mathematics/objectives/k-cc-1.md'
    const tree = sampleTree()
    const text = tree[CA_FILE]!
    delete tree[CA_FILE]
    const findings = check({ ...tree, [moved]: text })
    expect(rules(findings)).toEqual([`${moved} id-path`])
    expect(findings[0]!.message).toContain(CA_FILE)
    expect(findings[0]!.line).toBe(2)
  })

  it('fails a record at a path no id names', () => {
    const stray = 'corpus/us-ca/notes.md'
    expect(rules(check({ ...sampleTree(), [stray]: sampleTree()[CA_SOURCE_FILE]! }))).toContain(`${stray} id-path`)
  })

  it('fails an id that is not in the scheme', () => {
    expect(rules(check(withFields(CA_FILE, { id: 'edu.us.kindergarten.mathematics.objective.k-cc-1' })))).toEqual([`${CA_FILE} id`])
  })

  it('fails a record whose fields disagree with its id', () => {
    const findings = check(withFields(CA_FILE, { level: 'grade-1' }))
    expect(rules(findings)).toEqual([`${CA_FILE} id-fields`])
    expect(findings[0]!.message).toContain('level')
  })
})

describe('vocabulary per jurisdiction', () => {
  it('fails a standing from the other jurisdiction’s list and names the field', () => {
    const tree = withFields(CA_FILE, { standing: 'legal-core-goal' })
    const findings = check(tree)
    expect(rules(findings)).toEqual([`${CA_FILE} vocabulary`])
    expect(findings[0]!.message).toMatch(/^standing /)
    expect(findings[0]!.line).toBe(lineOf(tree[CA_FILE]!, 'standing:'))
    expect(rules(check(withFields(NL_FILE, { standing: 'voluntary-guidance' })))).toEqual([`${NL_FILE} vocabulary`])
    expect(rules(check(withFields(NL_SOURCE_FILE, { standing: 'state-board-adopted-standard' })))).toEqual([`${NL_SOURCE_FILE} vocabulary`])
  })

  it('fails an unknown standing', () => {
    expect(rules(check(withFields(NL_FILE, { standing: 'core-goal' })))).toEqual([`${NL_FILE} vocabulary`])
  })

  it('fails a regime on a California record and an unknown regime on a Dutch one', () => {
    const california = check(withFields(CA_FILE, { regime: '2026' }))
    expect(rules(california)).toEqual([`${CA_FILE} vocabulary`])
    expect(california[0]!.message).toMatch(/^regime /)
    expect(rules(check(withFields(NL_FILE, { regime: '2031' })))).toEqual([`${NL_FILE} vocabulary`])
  })

  it('fails a level of the other jurisdiction', () => {
    const file = 'corpus/nl/kindergarten/mathematics/objectives/getallen-1.md'
    const tree = sampleTree()
    const text = replaceFrontmatter(tree[NL_FILE]!, {
      ...nlObjective,
      id: 'edu.nl.kindergarten.mathematics.objective.getallen-1',
      level: 'kindergarten',
    })
    delete tree[NL_FILE]
    const findings = check({ ...tree, [file]: text })
    expect(rules(findings)).toEqual([`${file} vocabulary`])
    expect(findings[0]!.message).toMatch(/^level /)
  })
})

describe('the schema per kind', () => {
  it('fails a missing field, an unknown field and a field of the wrong type', () => {
    expect(rules(check(withFields(CA_FILE, { locator: undefined })))).toEqual([`${CA_FILE} missing-field`])
    const unknown = seeded(CA_FILE, (text) => text.replace('kind: objective\n', 'kind: objective\nreviewed_by: someone\n'))
    const findings = check(unknown)
    expect(rules(findings)).toEqual([`${CA_FILE} unknown-field`])
    expect(findings[0]!.line).toBe(4)
    expect(rules(check(seeded(NL_FILE, (text) => text.replace('regime: "2026"', 'regime: 2026'))))).toEqual([`${NL_FILE} field`])
    expect(rules(check(seeded(CA_FILE, (text) => text.replace('california_addition: false', 'california_addition: "no"'))))).toEqual([
      `${CA_FILE} field`,
    ])
  })

  it('keeps status at draft and authority at official on an objective', () => {
    expect(rules(check(withFields(CA_FILE, { status: 'reviewed' })))).toEqual([`${CA_FILE} field`])
    expect(rules(check(withFields(NL_FILE, { authority: 'inferred' })))).toEqual([`${NL_FILE} field`])
  })

  it('fails a wording hash, a date or a language that is not one', () => {
    expect(rules(check(withFields(CA_FILE, { wording_sha256: 'abc' })))).toEqual([`${CA_FILE} field`])
    expect(rules(check(withFields(NL_FILE, { effective_from: '1 August 2026' })))).toEqual([`${NL_FILE} field`])
    expect(rules(check(withFields(CA_FILE, { content_language: 'es' })))).toEqual([`${CA_FILE} field`])
  })

  it('fails a code key that is not the key of the printed code', () => {
    const findings = check(withFields(CA_FILE, { code: 'K.CC.1a' }))
    expect(rules(findings)).toEqual([`${CA_FILE} code-key`])
    expect(findings[0]!.message).toContain('K.CC.1.a')
  })

  it('fails an unknown kind', () => {
    const tree = seeded(CA_SOURCE_FILE, (text) => text.replace('kind: source', 'kind: constraint'))
    expect(rules(check(tree))).toContain(`${CA_SOURCE_FILE} kind`)
  })

  it('checks a source record: a pin kind outside the list, a pin that is no hash, a missing terms quote', () => {
    expect(rules(check(withFields(NL_SOURCE_FILE, { pin_kind: 'url' })))).toEqual([`${NL_SOURCE_FILE} field`])
    expect(rules(check(withFields(NL_SOURCE_FILE, { pin: 'latest' })))).toEqual([`${NL_SOURCE_FILE} field`])
    expect(rules(check(withFields(CA_SOURCE_FILE, { terms_quote: undefined })))).toEqual([`${CA_SOURCE_FILE} missing-field`])
  })

  it('checks a frame record: a count that is no number, a check rendition that is no source id', () => {
    expect(rules(check(seeded(NL_FRAME_FILE, (text) => text.replace('expected_count: 1', 'expected_count: "one"'))))).toEqual([
      `${NL_FRAME_FILE} field`,
    ])
    expect(rules(check(withFields(NL_FRAME_FILE, { check_renditions: ['the-pdf'] })))).toEqual([`${NL_FRAME_FILE} field`])
    expect(rules(check(withFields(NL_FRAME_FILE, { sources: ['voorbeeld-rekendoelen'] })))).toEqual([`${NL_FRAME_FILE} field`])
  })

  it('takes a frame whose parts are all read again in the same file, and one whose parts are checked in both ways', () => {
    expect(check(withFields(NL_FRAME_FILE, { check_renditions: [], check_strength: 'second-reading' }))).toEqual([])
    expect(check(withFields(NL_FRAME_FILE, { check_strength: 'mixed' }))).toEqual([])
    expect(rules(check(withFields(NL_FRAME_FILE, { check_strength: 'thorough' })))).toEqual([`${NL_FRAME_FILE} field`])
  })

  it('checks the hash of the text that accompanies a statement only for its form', () => {
    expect(check(withFields(CA_FILE, { supplement_sha256: wordingHash('An invented footnote about apples.') }))).toEqual([])
    expect(rules(check(withFields(CA_FILE, { supplement_sha256: 'abc' })))).toEqual([`${CA_FILE} field`])
  })
})

describe('sources', () => {
  it('fails an objective whose source names no source record', () => {
    const tree = sampleTree()
    delete tree[NL_SOURCE_FILE]
    // The lane's frame names the same source, which is its own finding.
    const findings = under(check(tree), NL_FILE)
    expect(rules(findings)).toEqual([`${NL_FILE} source-missing`])
    expect(findings[0]!.message).toContain(nlSource.id)
    expect(findings[0]!.line).toBe(lineOf(tree[NL_FILE]!, 'source:'))
  })
})

describe('the sources a frame names', () => {
  const absent = 'edu.nl.source.geen-zulk-bestand'

  it('fails a frame that draws from a source record that does not exist', () => {
    const tree = withFields(NL_FRAME_FILE, { sources: [nlSource.id, absent] })
    const findings = check(tree)
    expect(rules(findings)).toEqual([`${NL_FRAME_FILE} source-missing`])
    expect(findings[0]!.message).toContain(absent)
    expect(findings[0]!.line).toBe(lineOf(tree[NL_FRAME_FILE]!, 'sources:'))
  })

  it('fails a frame whose check rendition is a source record that does not exist', () => {
    const tree = withFields(NL_FRAME_FILE, { check_renditions: [absent] })
    const findings = check(tree)
    expect(rules(findings)).toEqual([`${NL_FRAME_FILE} source-missing`])
    expect(findings[0]!.message).toContain(absent)
    expect(findings[0]!.line).toBe(lineOf(tree[NL_FRAME_FILE]!, 'check_renditions:'))
  })
})

describe('frontmatter outside the subset', () => {
  it('rejects a nested list, an anchor and a multi-line scalar with file and line', () => {
    const nested = seeded(NL_FRAME_FILE, (text) => text.replace('  - edu.nl.source', '  - - edu.nl.source'))
    expect(check(nested)).toMatchObject([{ file: NL_FRAME_FILE, line: 9, rule: 'frontmatter' }])
    const anchor = seeded(CA_FILE, (text) => text.replace('title: "', 'title: &title "'))
    expect(check(anchor)).toMatchObject([{ file: CA_FILE, line: 4, rule: 'frontmatter' }])
    const multiline = seeded(CA_FILE, (text) => text.replace('title: "Counting things in a basket"', 'title: |\n  Counting things\n  in a basket'))
    expect(check(multiline)).toMatchObject([{ file: CA_FILE, line: 4, rule: 'frontmatter' }])
    expect(formatFinding(check(multiline)[0]!)).toMatch(/^education\/corpus\/us-ca\/kindergarten\/mathematics\/objectives\/k-cc-1\.md:4 {2}frontmatter {2}/)
  })
})

describe('regions', () => {
  it('fails an agent region without its marker', () => {
    const tree = seeded(CA_FILE, (text) => text.replace(`${MARKERS[DESIGN_NOTES]}\n\n`, ''))
    const findings = check(tree)
    expect(rules(findings)).toEqual([`${CA_FILE} marker`])
    expect(findings[0]!.line).toBe(lineOf(tree[CA_FILE]!, DESIGN_NOTES))
    expect(rules(check(seeded(NL_FILE, (text) => text.replace(MARKERS[ENGLISH_GLOSS], MARKERS[SUMMARY]))))).toEqual([`${NL_FILE} marker`])
  })

  it('allows pending agent regions by default and fails each of them as complete', () => {
    expect(rules(check(sampleTree(), { complete: true }))).toEqual([
      `${NL_FILE} pending`,
      `${NL_FILE} pending`,
      `${CA_FILE} pending`,
      `${CA_FILE} pending`,
    ])
    const half = writtenTree()
    half[CA_FILE] = half[CA_FILE]!.replace('Numbers to ten only.', PENDING)
    expect(check(half)).toEqual([])
    const findings = check(half, { complete: true })
    expect(rules(findings)).toEqual([`${CA_FILE} pending`])
    expect(findings[0]!.line).toBe(lineOf(half[CA_FILE]!, `${DESIGN_NOTES_SUBHEADINGS[1]}\n\n${PENDING}`) + 2)
  })

  it('fails a marker with nothing after it', () => {
    expect(rules(check(seeded(CA_FILE, (text) => text.replace(`${MARKERS[SUMMARY]}\n\n${PENDING}`, MARKERS[SUMMARY]))))).toEqual([
      `${CA_FILE} empty-region`,
    ])
  })

  it('fails written design notes without the three sub-headings in order, each with text', () => {
    const [hands, limits, mistakes] = DESIGN_NOTES_SUBHEADINGS
    const bodies = [
      `A child moves apples.`,
      `${hands}\n\nA child moves apples.\n\n${limits}\n\nTo ten.`,
      `${limits}\n\nTo ten.\n\n${hands}\n\nA child moves apples.\n\n${mistakes}\n\nCounting twice.`,
      `${hands}\n\n${limits}\n\nTo ten.\n\n${mistakes}\n\nCounting twice.`,
      `Loose text.\n\n${hands}\n\nA child moves apples.\n\n${limits}\n\nTo ten.\n\n${mistakes}\n\nCounting twice.`,
    ]
    for (const body of bodies) {
      const tree = seeded(CA_FILE, (text) => replaceRegion(text, DESIGN_NOTES, withMarker(DESIGN_NOTES, body)))
      expect(rules(check(tree)), body).toEqual([`${CA_FILE} design-notes`])
    }
  })

  it('fails a Dutch record with no English gloss and an English record with one', () => {
    const missing = seeded(NL_FILE, (text) => text.replace(`${ENGLISH_GLOSS}\n\n${MARKERS[ENGLISH_GLOSS]}\n\n${PENDING}\n\n`, ''))
    expect(rules(check(missing))).toEqual([`${NL_FILE} missing-section`])
    const extra = seeded(CA_FILE, (text) => text.replace(DESIGN_NOTES, `${ENGLISH_GLOSS}\n\n${MARKERS[ENGLISH_GLOSS]}\n\n${PENDING}\n\n${DESIGN_NOTES}`))
    expect(rules(check(extra))).toEqual([`${CA_FILE} forbidden-section`])
  })

  it('fails a description-only record with no summary', () => {
    const missing = seeded(CA_FILE, (text) => text.replace(`${SUMMARY}\n\n${MARKERS[SUMMARY]}\n\n${PENDING}\n\n`, ''))
    expect(rules(check(missing))).toEqual([`${CA_FILE} missing-section`])
  })

  it('fails regions out of order, a region twice, an unknown section and text outside every region', () => {
    const swapped = seeded(CA_FILE, (text) => {
      const record = parseRecord(text)
      const [summary, notes] = record.sections
      return `${record.frontmatterText}${record.preface}${notes!.heading}${notes!.text}\n${summary!.heading}${summary!.text.trimEnd()}\n`
    })
    expect(rules(check(swapped))).toEqual([`${CA_FILE} section-order`])
    const twice = seeded(CA_FILE, (text) => `${text}\n${DESIGN_NOTES}\n\n${MARKERS[DESIGN_NOTES]}\n\n${PENDING}\n`)
    expect(rules(check(twice))).toEqual([`${CA_FILE} duplicate-section`])
    const unknown = seeded(CA_FILE, (text) => `${text}\n## Teaching tips\n\nCount slowly.\n`)
    expect(rules(check(unknown))).toEqual([`${CA_FILE} unknown-section`])
    const loose = seeded(CA_FILE, (text) => text.replace(`\n${SUMMARY}`, `\nCount the apples.\n\n${SUMMARY}`))
    expect(rules(check(loose))).toEqual([`${CA_FILE} unowned-text`])
  })
})

describe('the tree on disk', () => {
  function onDisk(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), 'education-validate-'))
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), text)
    }
    return root
  }

  it('reads every markdown file under corpus/ and sources/ and nothing else', () => {
    const root = onDisk({ ...sampleTree(), 'README.md': '# Pack\n', 'docs/NOTES.md': '# Notes\n', 'corpus/nl/fase-1/mathematics/notes.txt': 'x' })
    expect(readRecords(root).map((record) => record.file)).toEqual(Object.keys(sampleTree()).sort())
    expect(validateTree(root)).toEqual([])
  })

  it('passes on a folder with no corpus yet', () => {
    expect(validateTree(onDisk({ 'README.md': '# Pack\n' }))).toEqual([])
  })

  it('reports the seeded defect of a tree on disk, and only what is under a given path', () => {
    const tree = seeded(CA_FILE, (text) => text.replace(SUMMARY, `${OFFICIAL_WORDING}\n\nCount the apples.\n\nSource: Example.\n\n${SUMMARY}`))
    delete tree[NL_SOURCE_FILE]
    const findings = validateTree(onDisk(tree))
    expect(rules(findings)).toEqual([`${NL_FRAME_FILE} source-missing`, `${NL_FRAME_FILE} source-missing`, `${NL_FILE} source-missing`, `${CA_FILE} official-wording-forbidden`])
    expect(rules(under(findings, 'corpus/us-ca'))).toEqual([`${CA_FILE} official-wording-forbidden`])
    expect(rules(under(findings, NL_FILE))).toEqual([`${NL_FILE} source-missing`])
    expect(under(findings, 'corpus/us')).toEqual([])
  })
})
