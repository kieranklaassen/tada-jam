import { describe, expect, it } from 'vitest'
import { FrontmatterError, parseFrontmatter, serialiseFrontmatter } from './frontmatter.ts'

function block(...lines: string[]): string {
  return ['---', ...lines, '---', ''].join('\n')
}

// The error a block is rejected with.
function rejection(text: string, file = 'corpus/x.md'): FrontmatterError {
  try {
    parseFrontmatter(text, file)
  } catch (error) {
    if (error instanceof FrontmatterError) return error
    throw error
  }
  throw new Error('the block was accepted')
}

describe('parseFrontmatter', () => {
  it('reads bare words, quoted strings, booleans and whole numbers', () => {
    const { data } = parseFrontmatter(
      block('kind: objective', 'title: "Count: the \\"apples\\" \\\\ pears"', 'required: true', 'expected_count: 12', 'regime: "2026"', 'pin: ""'),
    )
    expect(data).toEqual({
      kind: 'objective',
      title: 'Count: the "apples" \\ pears',
      required: true,
      expected_count: 12,
      regime: '2026',
      pin: '',
    })
  })

  it('reads a list of scalars, an empty list and one level of map', () => {
    const { data } = parseFrontmatter(
      block('sources:', '  - edu.nl.source.a', '  - "b c"', 'none: []', 'counts:', '  goals: 3', '  label: "a b"', 'empty: {}'),
    )
    expect(data).toEqual({ sources: ['edu.nl.source.a', 'b c'], none: [], counts: { goals: 3, label: 'a b' }, empty: {} })
  })

  it('says which line each key is on and where the block ends', () => {
    const text = block('id: a', 'sources:', '  - b', 'kind: source') + '\nBody\n'
    const parsed = parseFrontmatter(text)
    expect(parsed.lines).toEqual({ id: 2, sources: 3, kind: 5 })
    expect(text.slice(parsed.length)).toBe('\nBody\n')
    expect(parsed.lineCount).toBe(6)
  })

  it('rejects a nested list with file and line', () => {
    const inline = rejection(block('id: a', 'sources:', '  - - b'))
    expect(inline).toMatchObject({ file: 'corpus/x.md', line: 4 })
    expect(inline.message).toContain('corpus/x.md:4')
    expect(rejection(block('sources:', '  -', '    - b'))).toMatchObject({ line: 3 })
    expect(rejection(block('sources:', '  - name: b'))).toMatchObject({ line: 3 })
    expect(rejection(block('sources: [a, b]'))).toMatchObject({ line: 2 })
  })

  it('rejects a map nested deeper than one level', () => {
    expect(rejection(block('counts:', '  goals:', '    core: 3'))).toMatchObject({ line: 3 })
  })

  it('rejects an anchor and an alias', () => {
    expect(rejection(block('id: a', 'title: &t "Count"'))).toMatchObject({ line: 3 })
    expect(rejection(block('id: a', 'title: "Count"', 'code: *t'))).toMatchObject({ line: 4 })
  })

  it('rejects a multi-line scalar', () => {
    expect(rejection(block('title: |', '  Count', '  apples'))).toMatchObject({ line: 2 })
    expect(rejection(block('title: >-', '  Count'))).toMatchObject({ line: 2 })
    expect(rejection(block('title: "Count', '  apples"'))).toMatchObject({ line: 2 })
    expect(rejection(block('title: Count', '  apples'))).toMatchObject({ line: 3 })
  })

  it('rejects a tab', () => {
    expect(rejection(block('id: a', 'title:\t"Count"'))).toMatchObject({ line: 3 })
    expect(rejection(block('sources:', '\t- a'))).toMatchObject({ line: 3 })
  })

  it('rejects a duplicate key', () => {
    expect(rejection(block('id: a', 'kind: source', 'id: b'))).toMatchObject({ line: 4 })
    expect(rejection(block('counts:', '  goals: 1', '  goals: 2'))).toMatchObject({ line: 4 })
  })

  it('rejects a string that is not a bare word and not quoted, so a date or a yes is never guessed at', () => {
    expect(rejection(block('retrieved_on: 2026-10-01'))).toMatchObject({ line: 2 })
    expect(rejection(block('title: Count the apples'))).toMatchObject({ line: 2 })
    expect(rejection(block('required: yes'))).toMatchObject({ line: 2 })
    expect(rejection(block("title: 'Count'"))).toMatchObject({ line: 2 })
    expect(rejection(block('title:'))).toMatchObject({ line: 2 })
  })

  it('rejects text with no opening or no closing fence', () => {
    expect(rejection('id: a\n')).toMatchObject({ line: 1 })
    expect(rejection('---\nid: a\n')).toMatchObject({ line: 1 })
  })
})

describe('serialiseFrontmatter', () => {
  const order = ['id', 'kind', 'title', 'sources', 'counts', 'required', 'expected_count', 'regime', 'pin'] as const

  it('writes keys in the given order, whatever order the data is in', () => {
    const text = serialiseFrontmatter({ kind: 'source', title: 'Counting', id: 'edu.nl.source.a' }, order)
    expect(text).toBe(block('id: edu.nl.source.a', 'kind: source', 'title: Counting'))
  })

  it('quotes every string that is not a bare word', () => {
    const text = serialiseFrontmatter({ id: '4.NF.3.a', kind: 'true', title: 'Count "ten": a\\b', regime: '2026', pin: '' }, order)
    expect(text).toBe(block('id: "4.NF.3.a"', 'kind: "true"', 'title: "Count \\"ten\\": a\\\\b"', 'regime: "2026"', 'pin: ""'))
  })

  it('round-trips a canonical block byte for byte', () => {
    const canonical = block(
      'id: edu.nl.source.a',
      'kind: source',
      'title: "Count: the \\"apples\\""',
      'sources:',
      '  - edu.nl.source.b',
      '  - "c d"',
      'counts:',
      '  goals: 3',
      'required: false',
      'expected_count: 0',
      'regime: "2027-draft"',
      'pin: ""',
    )
    expect(serialiseFrontmatter(parseFrontmatter(canonical).data, order)).toBe(canonical)
    const empty = block('id: a', 'sources: []', 'counts: {}')
    expect(serialiseFrontmatter(parseFrontmatter(empty).data, order)).toBe(empty)
  })

  it('refuses a key the order has no place for, and a value the subset cannot hold', () => {
    expect(() => serialiseFrontmatter({ id: 'a', extra: 'b' }, order)).toThrow(/extra/)
    expect(() => serialiseFrontmatter({ title: 'two\nlines' }, order)).toThrow(/title/)
    expect(() => serialiseFrontmatter({ expected_count: 1.5 }, order)).toThrow(/expected_count/)
  })
})
