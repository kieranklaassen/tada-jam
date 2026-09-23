import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { LoadedCatalog } from './catalog.ts'
import { ENGINE_IDS } from './engines.ts'
import type { Engine } from './engines.ts'
import { renderCatalog, runCatalogCli } from './render.ts'
import type { Decision, IdeaDraft, IdeaRecord } from './types.ts'
import type { Problem } from './validate.ts'

function idea(id: string, draft: Partial<IdeaDraft> = {}, decision: Partial<Decision> | null = {}): IdeaRecord {
  const engine = id.replace(/-\d+$/, '') as Engine
  return {
    id,
    name: `Name of ${id}`,
    loop: `The child does a thing in ${id} and the world answers.`,
    verb: `verb-of-${id}`,
    ageBand: [5, 6],
    engine,
    secondaryEngines: [],
    lens: 'other',
    toy: null,
    play5: `What is different on play 5 of ${id}.`,
    ...draft,
    critique: { id, verdict: 'keep', reason: 'Fine.' },
    decision:
      decision === null
        ? null
        : { id, status: 'reserve', cutReason: null, protoKey: null, batch: null, reserveOrder: null, replaces: null, ...decision },
  }
}

// Ten ideas: 4 built (one promoted), 2 reserve, 3 cut, 1 with no decision.
function sample(): IdeaRecord[] {
  return [
    idea(
      'emergence-01',
      { verb: 'topple', ageBand: [4, 7], lens: 'physical-toy', toy: 'dominoes', loop: 'Knock the first tile.', play5: 'The chain turns a corner.' },
      { status: 'built', protoKey: 'domino-run', batch: 1 },
    ),
    idea('emergence-02', {}, { status: 'cut', cutReason: 'Escalation only.' }),
    idea('mastery-01', { verb: 'jump', ageBand: [5, 6], lens: 'physical-toy', toy: 'jump-rope' }, { status: 'built', protoKey: 'rope-beat', batch: 2 }),
    idea('mastery-02', { ageBand: [7, 9] }, { status: 'reserve', reserveOrder: 2 }),
    idea('mystery-01', { ageBand: [10, 12] }, { status: 'built', protoKey: 'hidden-door', batch: 3 }),
    idea('mystery-02', { lens: 'physical-toy', toy: 'magnets' }, { status: 'reserve', reserveOrder: 1 }),
    idea('expression-01', { ageBand: [7, 9] }, { status: 'built', protoKey: 'sand-song', batch: 1, replaces: 'expression-02' }),
    idea('expression-02', {}, { status: 'cut', cutReason: 'The prototype could not be made to work.' }),
    idea('rule-play-01', { play5: null }, null),
    idea('variation-01', { engine: null, play5: null }, { status: 'cut', cutReason: 'Names no depth engine.' }),
  ]
}

function section(text: string, heading: string): string {
  const start = text.indexOf(`### ${heading}`)
  expect(start).toBeGreaterThanOrEqual(0)
  const next = text.indexOf('\n### ', start + 1)
  const nextEngine = text.indexOf('\n## ', start + 1)
  const ends = [next, nextEngine].filter((i) => i >= 0)
  return text.slice(start, ends.length > 0 ? Math.min(...ends) : undefined)
}

describe('renderCatalog', () => {
  it('is deterministic and does not depend on input order', () => {
    const records = sample()
    const once = renderCatalog(records)
    expect(renderCatalog(records)).toBe(once)
    expect(renderCatalog([...records].reverse())).toBe(once)
    expect(renderCatalog([records[3]!, records[8]!, records[0]!, ...records.filter((_, i) => ![0, 3, 8].includes(i))])).toBe(once)
  })

  it('does not change its input', () => {
    const records = sample()
    const before = JSON.stringify(records)
    renderCatalog(records, [{ rule: 'x', message: 'y' }])
    expect(JSON.stringify(records)).toBe(before)
  })

  it('lists every idea id, including ones with no decision or no engine', () => {
    const records = sample()
    const text = renderCatalog(records)
    for (const r of records) expect(text).toContain(`### ${r.id}: ${r.name}`)
    const headings = text.match(/^### [a-z-]+-\d+: /gm) ?? []
    expect(headings).toHaveLength(records.length)
  })

  it('puts the counts summary first, before any engine section or idea', () => {
    const text = renderCatalog(sample())
    const summary = text.indexOf('## Summary')
    expect(summary).toBeGreaterThanOrEqual(0)
    expect(text.slice(0, summary)).not.toContain('emergence')
    expect(summary).toBeLessThan(text.indexOf('## emergence'))
    expect(summary).toBeLessThan(text.indexOf('### emergence-01'))
    // and the first section heading in the file is the summary
    expect(text.match(/^## .*$/m)![0]).toBe('## Summary')
  })

  it('states the counts', () => {
    const text = renderCatalog(sample())
    const summary = text.slice(text.indexOf('## Summary'), text.indexOf('## emergence'))
    expect(summary).toContain('- Written: 10')
    expect(summary).toContain('- Built: 4')
    expect(summary).toContain('- Reserve: 2')
    expect(summary).toContain('- Cut: 3')
    expect(summary).toContain('- No decision: 1')
    expect(summary).toContain('- Promoted reserves (built, replacing a cut idea): 1')
    expect(summary).toContain('- Physical-toy share of written ideas: 3 of 10 (30.0%)')
    expect(summary).toContain('- Physical-toy share of built ideas: 2 of 4 (50.0%)')
  })

  it('states built, reserve, and cut counts per engine', () => {
    const text = renderCatalog(sample())
    expect(text).toContain('| Engine | Written | Built | Reserve | Cut |')
    expect(text).toContain('| emergence | 2 | 1 | 0 | 1 |')
    expect(text).toContain('| mastery | 2 | 1 | 1 | 0 |')
    expect(text).toContain('| mystery | 2 | 1 | 1 | 0 |')
    expect(text).toContain('| expression | 2 | 1 | 0 | 1 |')
    expect(text).toContain('| rule-play | 1 | 0 | 0 | 0 |')
    expect(text).toContain('| combination | 0 | 0 | 0 | 0 |')
    // variation-01 has no engine, so it counts under "no engine", not under variation.
    expect(text).toContain('| variation | 0 | 0 | 0 | 0 |')
    expect(text).toContain('| (no engine) | 1 | 0 | 0 | 1 |')
  })

  it('counts built ideas per age bucket, a straddling band once in its lowest bucket', () => {
    const text = renderCatalog(sample())
    // emergence-01 is 4 to 7: bucket 2-4 only.
    expect(text).toContain('| Age bucket | Built |')
    expect(text).toContain('| 2-4 | 1 |')
    expect(text).toContain('| 5-6 | 1 |')
    expect(text).toContain('| 7-9 | 1 |')
    expect(text).toContain('| 10-12 | 1 |')
  })

  it('leaves out the (no engine) row when every idea has an engine', () => {
    const text = renderCatalog([idea('emergence-01')])
    expect(text).not.toContain('(no engine)')
    expect(text).not.toContain('## No engine')
  })

  it('has a section for every engine in the engine order, and lists ideas in id order inside it', () => {
    const text = renderCatalog(sample())
    let last = -1
    for (const engine of ENGINE_IDS) {
      const at = text.indexOf(`\n## ${engine}\n`)
      expect(at).toBeGreaterThan(last)
      last = at
    }
    expect(text.indexOf('### mastery-01')).toBeLessThan(text.indexOf('### mastery-02'))
    expect(text).toContain('## variation\n\n_No ideas._')
  })

  it('puts ideas with no engine in a final section', () => {
    const text = renderCatalog(sample())
    const at = text.indexOf('\n## No engine\n')
    expect(at).toBeGreaterThan(text.indexOf('\n## rule-play\n'))
    expect(text.indexOf('### variation-01')).toBeGreaterThan(at)
  })

  it('shows name, verb, age band, lens and toy, status, batch, proto key, loop, and play 5', () => {
    const entry = section(renderCatalog(sample()), 'emergence-01')
    expect(entry).toContain('### emergence-01: Name of emergence-01')
    expect(entry).toContain('- Verb: topple')
    expect(entry).toContain('- Age band: 4 to 7 (bucket 2-4)')
    expect(entry).toContain('- Lens: physical-toy (toy: dominoes)')
    expect(entry).toContain('- Status: built')
    expect(entry).toContain('- Batch: 1')
    expect(entry).toContain('- Proto key: `domino-run`')
    expect(entry).toContain('- Loop: Knock the first tile.')
    expect(entry).toContain('- Play 5: The chain turns a corner.')
    expect(entry).not.toContain('Cut reason')
    expect(entry).not.toContain('Replaces')
  })

  it('shows the cut reason, reserve order, and the idea a promoted reserve replaces', () => {
    const text = renderCatalog(sample())
    expect(section(text, 'emergence-02')).toContain('- Status: cut')
    expect(section(text, 'emergence-02')).toContain('- Cut reason: Escalation only.')
    expect(section(text, 'mastery-02')).toContain('- Status: reserve')
    expect(section(text, 'mastery-02')).toContain('- Reserve order: 2')
    expect(section(text, 'expression-01')).toContain('- Replaces: expression-02')
  })

  it('shows a plain lens for a non-physical idea and a placeholder for missing values', () => {
    const text = renderCatalog(sample())
    expect(section(text, 'mastery-02')).toContain('- Lens: other')
    expect(section(text, 'mastery-02')).not.toContain('toy:')
    expect(section(text, 'rule-play-01')).toContain('- Status: none')
    expect(section(text, 'rule-play-01')).toContain('- Play 5: none')
    expect(section(text, 'variation-01')).toContain('- Age band: 5 to 6 (bucket 5-6)')
  })

  it('keeps each field on one line', () => {
    const text = renderCatalog([idea('emergence-01', { loop: 'First line.\n\nSecond   line.', name: 'A\nB' })])
    expect(text).toContain('### emergence-01: A B')
    expect(text).toContain('- Loop: First line. Second line.')
  })

  it('renders an empty catalog: zeroed summary, every engine section empty, no idea entries', () => {
    const text = renderCatalog([])
    expect(text).toContain('- Written: 0')
    expect(text).toContain('- Built: 0')
    expect(text).toContain('- Physical-toy share of written ideas: 0 of 0 (0.0%)')
    expect(text.match(/^### [a-z-]+-\d+: /gm)).toBeNull()
    expect(text.match(/_No ideas\._/g)).toHaveLength(ENGINE_IDS.length)
  })

  it('ends with one newline and has no trailing spaces', () => {
    const text = renderCatalog(sample(), [])
    expect(text.endsWith('\n')).toBe(true)
    expect(text.endsWith('\n\n')).toBe(false)
    expect(text).not.toMatch(/ +$/m)
  })

  describe('problems', () => {
    const problems: Problem[] = [
      { rule: 'reserve-floor', message: 'Only 5 reserves.' },
      { rule: 'verb-distinct', id: 'mastery-01', message: 'Verb jump is also used by emergence-01.' },
    ]

    it('lists problems after the summary and before the engine sections', () => {
      const text = renderCatalog(sample(), problems)
      expect(text).toContain('- Validation: 2 problems (listed below)')
      const at = text.indexOf('\n## Problems\n')
      expect(at).toBeGreaterThan(text.indexOf('## Summary'))
      expect(at).toBeLessThan(text.indexOf('\n## emergence\n'))
      expect(text).toContain('- reserve-floor: Only 5 reserves.')
      expect(text).toContain('- verb-distinct (mastery-01): Verb jump is also used by emergence-01.')
    })

    it('says a single problem in the singular', () => {
      expect(renderCatalog(sample(), problems.slice(0, 1))).toContain('- Validation: 1 problem (listed below)')
    })

    it('says the catalog passed when the problem list is empty, with no Problems section', () => {
      const text = renderCatalog(sample(), [])
      expect(text).toContain('- Validation: passed')
      expect(text).not.toContain('## Problems')
    })

    it('says nothing about validation when no problem list is given', () => {
      const text = renderCatalog(sample())
      expect(text).not.toContain('Validation')
      expect(text).not.toContain('## Problems')
    })
  })
})

describe('runCatalogCli', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  function setup(catalog: LoadedCatalog = { records: sample(), problems: [] }) {
    const dir = mkdtempSync(join(tmpdir(), 'lab-catalog-'))
    dirs.push(dir)
    const target = join(dir, 'CATALOG.md')
    return { target, load: () => catalog, expected: renderCatalog(catalog.records, catalog.problems) }
  }

  it('writes CATALOG.md with the rendered catalog, then reports it unchanged on a second run', () => {
    const { target, load, expected } = setup()
    const first = runCatalogCli([], { target, load })
    expect(first.exitCode).toBe(0)
    expect(first.out.join('\n')).toContain('wrote')
    expect(readFileSync(target, 'utf8')).toBe(expected)

    const second = runCatalogCli([], { target, load })
    expect(second.exitCode).toBe(0)
    expect(second.out.join('\n')).toContain('unchanged')
    expect(readFileSync(target, 'utf8')).toBe(expected)
  })

  it('--check passes when the file matches, and writes nothing', () => {
    const { target, load, expected } = setup()
    writeFileSync(target, expected)
    const result = runCatalogCli(['--check'], { target, load })
    expect(result.exitCode).toBe(0)
    expect(result.err).toEqual([])
    expect(readFileSync(target, 'utf8')).toBe(expected)
  })

  it('--check fails when the file differs, names the file, and leaves it as it was', () => {
    const { target, load } = setup()
    writeFileSync(target, '# hand edited\n')
    const result = runCatalogCli(['--check'], { target, load })
    expect(result.exitCode).toBe(1)
    expect(result.err.join('\n')).toContain('CATALOG.md')
    expect(result.err.join('\n')).toContain('lab:catalog')
    expect(readFileSync(target, 'utf8')).toBe('# hand edited\n')
  })

  it('--check fails when the file is missing, and does not create it', () => {
    const { target, load } = setup()
    const result = runCatalogCli(['--check'], { target, load })
    expect(result.exitCode).toBe(1)
    expect(result.err.join('\n')).toContain('does not exist')
    expect(existsSync(target)).toBe(false)
  })

  it('--check fails once the data changes after the file was written', () => {
    const { target, load } = setup()
    runCatalogCli([], { target, load })
    const changed = sample().slice(1)
    expect(runCatalogCli(['--check'], { target, load: () => ({ records: changed, problems: [] }) }).exitCode).toBe(1)
  })

  it('rejects an unknown argument without writing', () => {
    const { target, load } = setup()
    const result = runCatalogCli(['--fix'], { target, load })
    expect(result.exitCode).toBe(2)
    expect(result.err.join('\n')).toContain('--fix')
    expect(existsSync(target)).toBe(false)
  })

  it('writes the problems into the file and still exits 0, but says so on stderr', () => {
    const catalog: LoadedCatalog = { records: sample(), problems: [{ rule: 'reserve-floor', message: 'Only 2 reserves.' }] }
    const { target, load } = setup(catalog)
    const written = runCatalogCli([], { target, load })
    expect(written.exitCode).toBe(0)
    expect(written.err.join('\n')).toContain('1 problem')
    expect(readFileSync(target, 'utf8')).toContain('- reserve-floor: Only 2 reserves.')
    // The check is about drift only: a file that shows the same problems is up to date.
    expect(runCatalogCli(['--check'], { target, load }).exitCode).toBe(0)
  })
})
