import { describe, expect, it } from 'vitest'
import { CA_FILE, NL_FILE, NL_SOURCE, NL_WORDING, caObjective, caSource, nlFrame, nlObjective, sampleTree } from './fixtures.ts'
import { wordingHash } from './normalise.ts'
import { composeRecord, draftObjective, officialBody, officialWording, parseRecord, replaceFrontmatter, replaceRegion, serialiseRecord, withMarker } from './record.ts'
import { ACCOMPANYING_PREFIX, DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS, ENGLISH_GLOSS, MARKERS, OFFICIAL_WORDING, PENDING, SUMMARY, accompanyingLine } from './schema.ts'

const NL_TEXT = `---
id: edu.nl.fase-1.mathematics.objective.getallen-1
kind: objective
title: "Appels tellen"
jurisdiction: nl
level: fase-1
subject: mathematics
content_language: nl
curriculum_version: "2026"
effective_from: "2026-08-01"
status: draft
authority: official
code: "1"
code_key: "1"
code_scope: "Voorbeelddoelen rekenen, Getallen"
standing: legal-core-goal
regime: "2026"
reuse_policy: verbatim
source: edu.nl.source.voorbeeld-rekendoelen
locator: "doel 1"
wording_sha256: "${wordingHash(NL_WORDING)}"
---

## Official wording

Tel de appels in een mand, tot en met tien.

Source: Voorbeeldinstituut, Voorbeelddoelen rekenen (2026), doel 1.

## English gloss

_The pack's gloss, not an official translation._

_pending_

## Design notes

_The pack's inference, not the official text._

_pending_
`

const CA_TEXT = `---
id: edu.us-ca.kindergarten.mathematics.objective.k-cc-1
kind: objective
title: "Counting things in a basket"
jurisdiction: us-ca
level: kindergarten
subject: mathematics
content_language: en
curriculum_version: "2013"
status: draft
authority: official
code: K.CC.1
code_key: K.CC.1
code_scope: "Example Counting Standards, Counting and Cardinality"
california_addition: false
standing: state-board-adopted-standard
reuse_policy: description-only
source: edu.us-ca.source.example-counting-standards
locator: "row K.CC.1"
wording_sha256: "${wordingHash('Count the apples in a basket up to ten.')}"
---

## Summary

_The pack's summary, not the official text._

_pending_

## Design notes

_The pack's inference, not the official text._

_pending_
`

const WRITTEN_NOTES = withMarker(
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

describe('draftObjective', () => {
  it('writes a verbatim Dutch record: official wording with its source line, then pending gloss and notes', () => {
    expect(draftObjective(nlObjective, { wording: NL_WORDING, source: NL_SOURCE })).toBe(NL_TEXT)
  })

  it('writes a description-only record with no official wording: a pending summary and notes', () => {
    expect(draftObjective(caObjective)).toBe(CA_TEXT)
  })

  it('refuses official wording for a description-only record, and a verbatim record without it', () => {
    expect(() => draftObjective(caObjective, { wording: 'Count the apples.', source: 'Example' })).toThrow(/description-only/)
    expect(() => draftObjective(nlObjective)).toThrow(/verbatim/)
  })
})

describe('composeRecord', () => {
  it('writes a source record: frontmatter in schema order, then the notes', () => {
    expect(composeRecord(caSource, 'An invented file.\n')).toBe(`---
id: edu.us-ca.source.example-counting-standards
kind: source
title: "Example Counting Standards"
publisher: "Example Department"
jurisdiction: us-ca
url: "https://example.org/standards/counting.csv"
landing_url: "https://example.org/standards"
version: "2013 edition"
retrieved_on: "2026-10-01"
revalidate_after: "2027-10-01"
media_type: "text/csv"
reuse_policy: description-only
terms_quote: "Example terms: this text may not be reproduced."
terms_url: "https://example.org/terms"
required: true
pin_kind: bytes
pin: ""
standing: state-board-adopted-standard
---

An invented file.
`)
  })

  it('writes a frame record', () => {
    expect(composeRecord(nlFrame, 'Covers the number goals.')).toBe(`---
id: edu.nl.fase-1.mathematics.frame.lane
kind: frame
title: "Fase 1 rekenen"
jurisdiction: nl
level: fase-1
subject: mathematics
sources:
  - edu.nl.source.voorbeeld-rekendoelen
expected_count: 1
counting_method: "Goals listed under this band in the example file."
check_renditions:
  - edu.nl.source.voorbeeld-rekendoelen
check_strength: second-rendition
nothing_published: false
status: draft
---

Covers the number goals.
`)
  })
})

describe('parseRecord and serialiseRecord', () => {
  it('returns the frontmatter and each section with its exact bytes', () => {
    const record = parseRecord(NL_TEXT)
    expect(record.frontmatter).toEqual(nlObjective)
    expect(record.frontmatterText).toBe(NL_TEXT.slice(0, NL_TEXT.indexOf('\n## Official wording')))
    expect(record.preface).toBe('\n')
    expect(record.sections.map((section) => section.heading)).toEqual([OFFICIAL_WORDING, ENGLISH_GLOSS, DESIGN_NOTES])
    expect(record.sections[0]!.text).toBe(`\n\n${NL_WORDING}\n\nSource: ${NL_SOURCE}\n\n`)
    expect(record.sections[2]!.text).toBe(`\n\n${MARKERS[DESIGN_NOTES]}\n\n${PENDING}\n`)
    expect(record.sections.map((section) => section.line)).toEqual([24, 30, 36])
  })

  it('round-trips every sample record byte for byte', () => {
    for (const [file, text] of Object.entries(sampleTree())) expect(serialiseRecord(parseRecord(text, file)), file).toBe(text)
    expect(serialiseRecord(parseRecord(NL_TEXT))).toBe(NL_TEXT)
  })

  it('round-trips an untidy file byte for byte', () => {
    const untidy = '---\nkind: objective\nid: a\n---\nloose text\n\n\n## Summary  \nx\n## Odd heading\n\n\n### sub\n## Design notes'
    const record = parseRecord(untidy)
    expect(record.preface).toBe('loose text\n\n\n')
    expect(record.sections.map((section) => section.heading)).toEqual(['## Summary  ', '## Odd heading', '## Design notes'])
    expect(serialiseRecord(record)).toBe(untidy)
  })
})

describe('replaceRegion', () => {
  it('replaces the design notes and leaves the frontmatter and the official wording byte-identical', () => {
    const before = parseRecord(NL_TEXT)
    const text = replaceRegion(NL_TEXT, DESIGN_NOTES, WRITTEN_NOTES)
    const after = parseRecord(text)
    expect(after.frontmatterText).toBe(before.frontmatterText)
    expect(after.sections[0]).toEqual(before.sections[0])
    expect(after.sections[1]).toEqual(before.sections[1])
    const start = NL_TEXT.indexOf(DESIGN_NOTES)
    expect(text.slice(0, start)).toBe(NL_TEXT.slice(0, start))
    expect(text.slice(start)).toBe(`${DESIGN_NOTES}\n\n${WRITTEN_NOTES}\n`)
  })

  it('replaces a region in the middle and leaves the regions around it byte-identical', () => {
    const gloss = withMarker(ENGLISH_GLOSS, 'Count the apples in a basket, up to and including ten.')
    const text = replaceRegion(NL_TEXT, ENGLISH_GLOSS, gloss)
    expect(text).toBe(NL_TEXT.replace(`${MARKERS[ENGLISH_GLOSS]}\n\n${PENDING}`, gloss))
  })

  it('replaces the official wording, as a re-import does, and leaves the agent regions byte-identical', () => {
    const written = replaceRegion(NL_TEXT, DESIGN_NOTES, WRITTEN_NOTES)
    const text = replaceRegion(written, OFFICIAL_WORDING, 'Tel de peren.\n\nSource: Voorbeeldinstituut.')
    const before = parseRecord(written)
    const after = parseRecord(text)
    expect(after.sections[0]!.text).toBe('\n\nTel de peren.\n\nSource: Voorbeeldinstituut.\n\n')
    expect(after.sections.slice(1)).toEqual(before.sections.slice(1))
    expect(after.frontmatterText).toBe(before.frontmatterText)
  })

  it('refuses a region the record does not hold', () => {
    expect(() => replaceRegion(NL_TEXT, SUMMARY, 'x')).toThrow(/## Summary/)
  })
})

describe('replaceFrontmatter', () => {
  it('rewrites the frontmatter in schema order and leaves the body byte-identical', () => {
    const written = replaceRegion(NL_TEXT, DESIGN_NOTES, WRITTEN_NOTES)
    const text = replaceFrontmatter(written, { ...nlObjective, locator: 'doel 1, tweede druk' })
    const body = written.slice(parseRecord(written).frontmatterText.length)
    expect(text.endsWith(body)).toBe(true)
    expect(parseRecord(text).frontmatter).toEqual({ ...nlObjective, locator: 'doel 1, tweede druk' })
    expect(replaceFrontmatter(written, nlObjective)).toBe(written)
  })
})

describe('officialWording', () => {
  it('splits the wording from its source line', () => {
    const section = parseRecord(NL_TEXT).sections[0]!
    expect(officialWording(section.text)).toEqual({ wording: NL_WORDING, accompanying: null, source: `Source: ${NL_SOURCE}`, sourceOffset: 4 })
  })

  it('finds no source line when the last line is not one', () => {
    expect(officialWording('\n\nTel de appels.\n\n')).toEqual({ wording: 'Tel de appels.', accompanying: null, source: null, sourceOffset: null })
    expect(officialWording('\n\nTel de appels.\n\nSource: \n')).toMatchObject({ source: null })
  })

  it('splits off the official text that accompanies the statement: what stands under the line that opens it, up to the source line', () => {
    const text = draftObjective(nlObjective, { wording: 'Tel de appels in een mand.\nTel ze nog eens.', source: NL_SOURCE, accompanying: { note: 'the example printed under this goal on the card', text: '(bijv. drie appels)\n(bijv. vier peren)' } })
    const section = parseRecord(text).sections[0]!

    expect(section.text).toBe(
      `\n\nTel de appels in een mand.\nTel ze nog eens.\n\n${ACCOMPANYING_PREFIX} (the example printed under this goal on the card):\n(bijv. drie appels)\n(bijv. vier peren)\n\nSource: ${NL_SOURCE}\n\n`,
    )
    expect(accompanyingLine(' in a footnote ')).toBe(`${ACCOMPANYING_PREFIX} (in a footnote):`)
    expect(officialWording(section.text)).toEqual({
      // The wording is the statement alone: what its hash is made of.
      wording: 'Tel de appels in een mand.\nTel ze nog eens.',
      accompanying: { line: `${ACCOMPANYING_PREFIX} (the example printed under this goal on the card):`, text: '(bijv. drie appels)\n(bijv. vier peren)', offset: 5 },
      source: `Source: ${NL_SOURCE}`,
      sourceOffset: 9,
    })
  })

  it('refuses wording that holds a line which would open a section or the accompanying text', () => {
    expect(() => officialBody({ wording: 'Tel de appels.\n## Summary', source: NL_SOURCE })).toThrow(/must not hold a line/)
    expect(() => officialBody({ wording: `Tel de appels.\n${accompanyingLine('a note')}`, source: NL_SOURCE })).toThrow(/must not hold a line/)
  })
})

describe('the sample files', () => {
  it('sit at the paths their ids name', () => {
    expect(CA_FILE).toBe('corpus/us-ca/kindergarten/mathematics/objectives/k-cc-1.md')
    expect(NL_FILE).toBe('corpus/nl/fase-1/mathematics/objectives/getallen-1.md')
  })
})
