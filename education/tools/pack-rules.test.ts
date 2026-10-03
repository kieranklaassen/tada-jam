// education/ is the Compound Pack `education` (plan U10, KTD16): the markdown
// files at its top level, other than README.md, are what the brainstorm, plan
// and review skills read and quote. Two kinds: rules that say what a game
// with a learning goal must honour, and one map per jurisdiction and age
// range (`map-<jurisdiction>-<range>.md`). Subfolders are storage and are not
// read as rules.
//
// This file holds what a page must be for the pack to resolve whole and for a
// quoted page to be safe: frontmatter the resolver accepts, at most 25 pages,
// only record ids that exist, a map that stays inside its jurisdiction, no
// link, and the declaration in the Compound Engineering config. Each check is
// a function of a folder, run on the real folder and on an invented one that
// breaks it.
//
// That the pages hold no official wording that may not be committed is the
// overlap check's job (overlap.ts reads the top-level markdown as text), so it
// is not tested again here.

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { JURISDICTIONS, parseId, pathForId } from './schema.ts'
import type { Jurisdiction } from './schema.ts'

const EDUCATION = resolve(import.meta.dirname, '..')
const ROOT = resolve(EDUCATION, '..')

// The pack stays small enough for every page to be read in full.
const MOST_PAGES = 25

// The maps the plan names: one per jurisdiction and age range.
const EXPECTED_MAPS = [
  'map-nl-ages-2-to-5.md',
  'map-nl-ages-9-to-12.md',
  'map-nl-first-school-years.md',
  'map-us-ca-ages-2-to-5.md',
  'map-us-ca-ages-9-to-12.md',
  'map-us-ca-first-school-years.md',
]

// How a page's frontmatter or first heading names its jurisdiction.
const NAMED_AS: Record<Jurisdiction, RegExp> = {
  'us-ca': /\bCalifornia\b|(?<![a-z-])us-ca(?![a-z-])/,
  nl: /\bNetherlands\b|\bDutch\b|(?<![a-z-])nl(?![a-z-])/,
}

// ---------------------------------------------------------------------------
// Reading the pages.
// ---------------------------------------------------------------------------

interface Page {
  name: string
  text: string
}

// The rules and maps of a pack folder: its top-level markdown, README.md left out.
function pages(dir: string): Page[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .map((entry) => ({ name: entry.name, text: readFileSync(join(dir, entry.name), 'utf8') }))
    .sort((a, b) => (a.name < b.name ? -1 : 1))
}

function unquote(text: string): string {
  const value = text.trim()
  return value.length >= 2 && value[0] === value.at(-1) && (value[0] === '"' || value[0] === "'") ? value.slice(1, -1).trim() : value
}

interface Head {
  // The frontmatter block as written, fences left out.
  block: string
  title: string
  appliesWhen: string[]
}

// The frontmatter a pack page needs, or null when the file does not open with
// a closed block. `applies_when` is a block list or a flow list on one line.
function head(text: string): Head | null {
  const found = /^﻿?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (!found) return null
  const lines = found[1]!.split(/\r?\n/)
  const at = (key: string): number => lines.findIndex((line) => line.startsWith(`${key}:`))
  const rest = (index: number, key: string): string => (index === -1 ? '' : lines[index]!.slice(key.length + 1).trim())

  const whenAt = at('applies_when')
  const inline = rest(whenAt, 'applies_when')
  let appliesWhen: string[] = []
  if (inline.startsWith('[') && inline.endsWith(']')) appliesWhen = inline.slice(1, -1).split(',').map(unquote)
  else if (whenAt !== -1 && inline === '') {
    for (const line of lines.slice(whenAt + 1)) {
      const item = /^\s*-\s+(.*)$/.exec(line)
      if (!item) break
      appliesWhen.push(unquote(item[1]!))
    }
  }
  return { block: found[1]!, title: unquote(rest(at('title'), 'title')), appliesWhen: appliesWhen.filter((each) => each !== '') }
}

// The first heading of a page's body.
function firstHeading(text: string): string {
  const body = text.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
  return /^#{1,6}\s+(.+)$/m.exec(body)?.[1] ?? ''
}

// Every pack record id a text names, once each, in order. An id is
// `edu.<jurisdiction>.` and what follows of lowercase letters, digits, dots
// and hyphens, so the full stop that ends a sentence is not part of it. The id
// scheme written with placeholders (`edu.nl.source.<slug>`) names no record.
const ID = /(?<![A-Za-z0-9.-])edu\.(?:us-ca|nl)\.[a-z0-9]+(?:[.-][a-z0-9]+)*/g

function idsIn(text: string): string[] {
  const found = new Set<string>()
  for (const match of text.matchAll(ID)) {
    if (text.slice(match.index + match[0].length).startsWith('.<')) continue
    found.add(match[0])
  }
  return [...found]
}

function jurisdictionOf(id: string): Jurisdiction {
  return JURISDICTIONS.find((each) => id.startsWith(`edu.${each}.`))!
}

// The jurisdiction a map is for, by its file name, or null for any other page.
function mapJurisdiction(name: string): Jurisdiction | null {
  if (!name.startsWith('map-')) return null
  return JURISDICTIONS.find((each) => name.startsWith(`map-${each}-`)) ?? null
}

// ---------------------------------------------------------------------------
// The checks. Each returns one line per finding, and none when all is well.
// ---------------------------------------------------------------------------

// A page the resolver would skip, or one that no request could match.
function badFrontmatter(dir: string): string[] {
  return pages(dir).flatMap(({ name, text }) => {
    const found = head(text)
    if (!found) return [`${name}: no frontmatter block`]
    return [...(found.title === '' ? [`${name}: no title`] : []), ...(found.appliesWhen.length === 0 ? [`${name}: applies_when is missing or empty`] : [])]
  })
}

// An id a page names that is not a record of the pack. A record's id always
// matches its path (the validator holds that), so the file is looked for at
// the one path the id belongs at and must carry the id.
function unknownIds(dir: string): string[] {
  return pages(dir).flatMap(({ name, text }) =>
    idsIn(text).flatMap((id) => {
      const path = parseId(id) ? pathForId(id) : null
      if (path === null) return [`${name}: ${id} is not a whole record id`]
      const file = join(dir, path)
      const held = existsSync(file) && readFileSync(file, 'utf8').split(/\r?\n/).includes(`id: ${id}`)
      return held ? [] : [`${name}: ${id} is not in the corpus`]
    }),
  )
}

// A map that names a record of the other jurisdiction, or that does not say
// in its frontmatter or its first heading which jurisdiction it is for.
function mapsOutsideTheirJurisdiction(dir: string): string[] {
  return pages(dir).flatMap(({ name, text }) => {
    const own = mapJurisdiction(name)
    if (own === null) return []
    const foreign = idsIn(text).filter((id) => jurisdictionOf(id) !== own)
    const named = NAMED_AS[own].test(head(text)?.block ?? '') || NAMED_AS[own].test(firstHeading(text))
    return [...foreign.map((id) => `${name}: names ${id}, a record of the other jurisdiction`), ...(named ? [] : [`${name}: neither its frontmatter nor its first heading names ${own}`])]
  })
}

// A page with a link. A rule may be quoted whole inside games/, where the
// egress scan fails on an external URL.
const LINK = /https?:\/\/|(?<![A-Za-z0-9.-])www\./i

function pagesWithLinks(dir: string): string[] {
  return pages(dir).flatMap(({ name, text }) => text.split(/\r?\n/).flatMap((line, index) => (LINK.test(line) ? [`${name}:${index + 1}: holds a link`] : [])))
}

// A page named as a map that is not one of the six.
function unexpectedMaps(dir: string): string[] {
  return pages(dir)
    .map(({ name }) => name)
    .filter((name) => name.startsWith('map-') && !EXPECTED_MAPS.includes(name))
}

// The `source` of every entry under the top-level `packs:` key of a Compound
// Engineering config.
function packSources(config: string): string[] {
  const sources: string[] = []
  let inPacks = false
  for (const raw of config.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').trimEnd()
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    if (!/^\s/.test(line) && !(inPacks && line.startsWith('-'))) {
      inPacks = /^packs:\s*$/.test(line)
      continue
    }
    const source = inPacks ? /^\s*(?:-\s+)?source:\s*(.+)$/.exec(line) : null
    if (source) sources.push(unquote(source[1]!))
  }
  return sources
}

// ---------------------------------------------------------------------------
// An invented pack folder.
// ---------------------------------------------------------------------------

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'education-pack-rules-'))
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  return root
}

function page(title: string, body: string, when = ['designing a game that teaches counting']): string {
  return `---\ntitle: ${title}\napplies_when:\n${when.map((each) => `  - ${each}`).join('\n')}\n---\n\n${body}\n`
}

const CA_ID = 'edu.us-ca.kindergarten.mathematics.objective.k-cc-1'
const NL_ID = 'edu.nl.fase-1.mathematics.objective.telrij-1'
const RECORDS = {
  'corpus/us-ca/kindergarten/mathematics/objectives/k-cc-1.md': `---\nid: ${CA_ID}\nkind: objective\n---\n`,
  'corpus/nl/fase-1/mathematics/objectives/telrij-1.md': `---\nid: ${NL_ID}\nkind: objective\n---\n`,
  'sources/nl-wet.md': '---\nid: edu.nl.source.nl-wet\nkind: source\n---\n',
}

// ---------------------------------------------------------------------------

describe('the pages of the pack', () => {
  it('there is at least one rule, and README.md is not a page', () => {
    const names = pages(EDUCATION).map(({ name }) => name)
    expect(names.length).toBeGreaterThan(0)
    expect(names).not.toContain('README.md')
    expect(existsSync(join(EDUCATION, 'README.md'))).toBe(true)
  })

  it('every top-level markdown file other than README.md has a title and a non-empty applies_when', () => {
    expect(badFrontmatter(EDUCATION)).toEqual([])
  })

  it('a page without a block, without a title, or with an empty applies_when is named', () => {
    const dir = fixture({
      'README.md': '# Pack\n',
      'good.md': page('Cite the record', 'Body.'),
      'quoted.md': '---\ntitle: "Quoted: with a colon"\napplies_when: ["planning a game", \'reviewing a game\']\n---\nBody.\n',
      'no-block.md': '# Notes\n',
      'no-title.md': '---\napplies_when:\n  - planning a game\n---\nBody.\n',
      'blank-title.md': '---\ntitle: ""\napplies_when:\n  - planning a game\n---\nBody.\n',
      'no-when.md': '---\ntitle: Half a rule\n---\nBody.\n',
      'empty-when.md': '---\ntitle: Half a rule\napplies_when:\ntags: [a]\n---\nBody.\n',
      'empty-list.md': '---\ntitle: Half a rule\napplies_when: []\n---\nBody.\n',
      'docs/GUIDE.md': '# A subfolder is storage\n',
    })
    expect(badFrontmatter(dir)).toEqual([
      'blank-title.md: no title',
      'empty-list.md: applies_when is missing or empty',
      'empty-when.md: applies_when is missing or empty',
      'no-block.md: no frontmatter block',
      'no-title.md: no title',
      'no-when.md: applies_when is missing or empty',
    ])
  })

  it(`there are at most ${MOST_PAGES} of them, with room for the six maps`, () => {
    const names = pages(EDUCATION).map(({ name }) => name)
    expect(names.length).toBeLessThanOrEqual(MOST_PAGES)
    const rules = names.filter((name) => !name.startsWith('map-'))
    expect(rules.length + EXPECTED_MAPS.length).toBeLessThanOrEqual(MOST_PAGES)
  })
})

describe('record ids in a page', () => {
  it('every record id a rule or map names exists in the corpus', () => {
    expect(unknownIds(EDUCATION)).toEqual([])
  })

  it('an id is read without the full stop after it, once, and the scheme with placeholders is not one', () => {
    const text = `See ${CA_ID}. Again ${CA_ID}, then \`edu.nl.source.nl-wet\` and edu.nl.source.<slug> and edu.<jurisdiction>.<level>; not www.edu.nl.x.`
    expect(idsIn(text)).toEqual([CA_ID, 'edu.nl.source.nl-wet'])
  })

  it('an id with no record, a part of an id, and an id whose file carries another id are named', () => {
    const dir = fixture({
      ...RECORDS,
      'corpus/nl/fase-1/mathematics/objectives/moved.md': '---\nid: edu.nl.fase-1.mathematics.objective.other\n---\n',
      'corpus/nl/fase-1/mathematics/frame.md': '---\nid: edu.nl.fase-1.mathematics.frame.lane\n---\n',
      'good.md': page('Names what exists', `${CA_ID}, ${NL_ID}, edu.nl.source.nl-wet and edu.nl.fase-1.mathematics.frame.lane.`),
      'bad.md': page(
        'Names what does not',
        'edu.us-ca.kindergarten.mathematics.objective.k-cc-99, edu.us-ca.kindergarten.mathematics.objective.k-cc-* and edu.nl.fase-1.mathematics, then edu.nl.fase-1.mathematics.objective.moved.',
      ),
    })
    expect(unknownIds(dir)).toEqual([
      'bad.md: edu.us-ca.kindergarten.mathematics.objective.k-cc-99 is not in the corpus',
      'bad.md: edu.us-ca.kindergarten.mathematics.objective.k-cc is not in the corpus',
      'bad.md: edu.nl.fase-1.mathematics is not a whole record id',
      'bad.md: edu.nl.fase-1.mathematics.objective.moved is not in the corpus',
    ])
  })
})

describe('the maps', () => {
  it('every map names its jurisdiction and no record of the other one', () => {
    expect(mapsOutsideTheirJurisdiction(EDUCATION)).toEqual([])
  })

  it('a map that names a record of the other jurisdiction, or does not name its own, is named', () => {
    const dir = fixture({
      ...RECORDS,
      'map-us-ca-ages-2-to-5.md': page('California, ages 2 to 5: what the pack holds', `Start from ${CA_ID}.`),
      'map-nl-ages-2-to-5.md': page('Ages 2 to 5: what the pack holds', `# The Netherlands, ages 2 to 5\n\nStart from ${NL_ID}.`),
      'map-nl-first-school-years.md': page('The first school years', `Start from ${NL_ID} and compare ${CA_ID}.`, ['designing a game for a Dutch six-year-old']),
      'map-us-ca-first-school-years.md': page('The first school years', `# Kindergarten and grade 1\n\nStart from ${CA_ID}.`),
      'a-rule.md': page('A rule may name both', `${CA_ID} and ${NL_ID}.`),
    })
    expect(mapsOutsideTheirJurisdiction(dir)).toEqual([
      `map-nl-first-school-years.md: names ${CA_ID}, a record of the other jurisdiction`,
      'map-us-ca-first-school-years.md: neither its frontmatter nor its first heading names us-ca',
    ])
  })

  it('a file named as a map is one of the six the plan names', () => {
    expect(unexpectedMaps(EDUCATION)).toEqual([])
    const dir = fixture({ 'map-us-ca-ages-2-to-5.md': '', 'map-us-ca-ages-6-to-8.md': '', 'map-de-ages-2-to-5.md': '', 'a-rule.md': '' })
    expect(unexpectedMaps(dir)).toEqual(['map-de-ages-2-to-5.md', 'map-us-ca-ages-6-to-8.md'])
    for (const name of EXPECTED_MAPS) expect(mapJurisdiction(name), name).not.toBeNull()
  })

  it('all six maps are present', () => {
    for (const name of EXPECTED_MAPS) expect(existsSync(join(EDUCATION, name)), name).toBe(true)
  })
})

describe('links', () => {
  it('no rule or map contains a link', () => {
    expect(pagesWithLinks(EDUCATION)).toEqual([])
  })

  it('a link is named with its line, however it is written', () => {
    const scheme = (name: string): string => `${name}://`
    const dir = fixture({
      'clean.md': page('No link', 'The record is cited by id. The file is `www-notes.md`, and awww.x is no host.'),
      'linked.md': page('Three links', `See ${scheme('https')}example.org/a\nand ${scheme('HTTP')}example.org\nand www.example.org.`),
    })
    // The page opens with five lines of frontmatter and a blank line.
    expect(pagesWithLinks(dir)).toEqual(['linked.md:7: holds a link', 'linked.md:8: holds a link', 'linked.md:9: holds a link'])
  })
})

describe('the declaration', () => {
  it('the Compound Engineering config declares a pack whose source is education', () => {
    const config = readFileSync(join(ROOT, '.compound-engineering', 'config.yaml'), 'utf8')
    expect(packSources(config)).toContain('education')
  })

  it('only an entry under the top-level packs key counts', () => {
    const config = [
      '# packs:',
      'compound:',
      '  packs:',
      '    - source: nested',
      'packs:',
      '  - source: compound-packs/game-design # the design rules',
      '  - source: "education"',
      '- source: at-the-margin',
      '    ref: v1',
      'other:',
      '  - source: elsewhere',
    ].join('\n')
    expect(packSources(config)).toEqual(['compound-packs/game-design', 'education', 'at-the-margin'])
  })
})
