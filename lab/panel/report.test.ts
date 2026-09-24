// U8: the report generator. Logic is tested on small synthetic reports built
// from the real shape; structure is tested on real reports generated into a
// temp folder (never committed).

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadCatalog } from '../ideas/catalog.ts'
import type { IdeaRecord } from '../ideas/types.ts'
import * as emergent from './fixtures/emergent.ts'
import * as ladder from './fixtures/ladder.ts'
import * as scoreOnly from './fixtures/scoreOnly.ts'
import { gate, targetPanel, VERDICT_INCONCLUSIVE, VERDICT_NEEDED, VERDICT_NOT_NEEDED } from './metrics.ts'
import type { ClarityMeasure, SubSignals } from './metrics.ts'
import { PERSONAS } from './personas.ts'
import {
  BLOCKED,
  CLEAR,
  FINDINGS_END,
  FINDINGS_START,
  GUESS_NOTE,
  NOT_ASSESSED,
  SPEC_MAX_LINES,
  buildHooks,
  buildInstrument,
  buildShortlist,
  checkSpec,
  collectPrototypes,
  defaultLocations,
  fillSpec,
  findingsLines,
  generate,
  generateDocuments,
  main,
  parseArgs,
  parseReport,
  protoKeys,
  rankByBucket,
  summarize,
  validateInstrument,
  weaknessLines,
} from './report.ts'
import type { InstrumentValidation, PanelReport, Prototype } from './report.ts'
import { buildReport, runKeys, stableStringify } from './run.ts'
import { masterRunSeed, playRun } from './session.ts'
import * as T from './thresholds.ts'
import type { CrashRecord, PanelProto } from './types.ts'

const scratch = mkdtempSync(join(tmpdir(), 'lab-report-'))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))

// ------------------------------------------------------------------ builders
interface ReportOptions {
  key: string
  name?: string
  band?: [number, number]
  engine?: string
  verb?: string
  lens?: string
  toy?: string | null
  runs?: number
  // Runs that start session 3, 4, and 5.
  started?: [number, number, number]
  play5?: number
  aims?: [number, number]
  clarity?: { flag: 'ok' | 'low'; changedShare?: number; ticks?: number | null }
  dominant?: boolean
  signals?: Partial<SubSignals>
  // Hooks that ran: session-3 share without the hook, whether removal changed
  // anything, and the verdict.
  hooks?: Record<string, { share: number; changed: boolean; verdict: string }>
  baseline?: number
  allOff?: number
  // Hooks declared but not ablatable: the reason.
  unsupported?: { hooks: string[]; reason: string }
  crashes?: CrashRecord[]
  // Mean sessions started by the panel personas kaia and tess.
  sessions?: [number, number]
}

function makeReport(o: ReportOptions): PanelReport {
  const runs = o.runs ?? 12
  const [n3, n4, n5] = o.started ?? [0, 0, 0]
  const share = (n: number): number => (runs === 0 ? 0 : n / runs)
  const declared = o.hooks ? Object.keys(o.hooks) : (o.unsupported?.hooks ?? [])
  const clarity = o.clarity ?? { flag: 'ok' as const }
  const measure: ClarityMeasure = {
    touches: 40,
    changedShare: clarity.changedShare ?? (clarity.flag === 'ok' ? 0.9 : 0.1),
    ticksToFirstChange: clarity.ticks === undefined ? (clarity.flag === 'ok' ? 12 : 200) : clarity.ticks,
    runsWithChange: 12,
    runs: 12,
    distinctKinds: 3,
    aimedHitShare: 1,
    flag: clarity.flag,
  }
  const [adopted, progress] = o.aims ?? [10, 4]
  const sessions = o.sessions ?? [n3 > 0 ? 3 : 1, n3 > 0 ? 4 : 1.5]
  const hooks: PanelReport['hooks'] =
    o.hooks !== undefined
      ? {
          status: 'ran',
          declared,
          baseline: { session3Share: o.baseline ?? 0.4 },
          allOff: { session3Share: o.allOff ?? 0.3, diffFromBaseline: (o.allOff ?? 0.3) - (o.baseline ?? 0.4), changedAffordancesOrSignatures: true },
          perHook: Object.fromEntries(
            Object.entries(o.hooks).map(([name, arm]) => [
              name,
              { session3Share: arm.share, diffFromBaseline: arm.share - (o.baseline ?? 0.4), changedAffordancesOrSignatures: arm.changed, verdict: arm.verdict },
            ]),
          ),
        }
      : o.unsupported !== undefined
        ? { status: `n/a: ${o.unsupported.reason}`, declared }
        : { status: 'none declared', declared: [] }
  return {
    key: o.key,
    thresholdsVersion: T.THRESHOLDS_VERSION,
    seed: T.DEFAULT_MASTER_SEED,
    meta: {
      key: o.key,
      name: o.name ?? o.key,
      verb: o.verb ?? 'poke',
      engine: o.engine ?? 'mastery',
      lens: o.lens ?? 'other',
      toy: o.toy ?? null,
      ageBand: o.band ?? [5, 8],
      hooks: declared,
      hookAblation: o.unsupported ? `n/a: ${o.unsupported.reason}` : 'supported',
    },
    targetPanel: ['kaia', 'tess'],
    gate: { pass: runs > 0 && share(n3) >= T.GATE_SHARE, share: share(n3), started: n3, runs },
    measures: {
      targetPanel: {
        runs,
        returnShare: { session3: share(n3), session4: share(n4), session5: share(n5) },
        play5: { newSignaturesPer100Actions: o.play5 ?? 1, kindGrowth: 0, change: o.play5 ?? 1 },
        aims: { adopted, madeProgress: progress, features: ['size up', 'count up'] },
        clarity: measure,
        subSignals: {
          returnScore: (share(n3) + share(n4) + share(n5)) / 3,
          changeScore: o.play5 ?? 1,
          aimScore: progress,
          ...o.signals,
        },
      },
      perPersona: {
        kaia: { age: 4, inTargetPanel: true, runs: 6, sessionsStartedMean: sessions[0] },
        tess: { age: 5, inTargetPanel: true, runs: 6, sessionsStartedMean: sessions[1] },
        'arch-11': { age: 11, inTargetPanel: false, runs: 3, sessionsStartedMean: 1 },
      },
    },
    selfPlay: {
      objective: { name: 'size', dir: 'up' },
      policies: {
        random: { meanObjective: 2, variety: 2.5, episodes: 3 },
        'repeat-one': { meanObjective: o.dominant ? 6 : 2, variety: o.dominant ? 0.5 : 2.4, episodes: 3 },
        greedy: { meanObjective: 2, variety: 2.4, episodes: 3 },
      },
      overallVariety: 2.4,
      dominant: o.dominant
        ? { flagged: true, by: 'repeat-one', note: 'repeat-one beats random on the objective while its variety collapses' }
        : { flagged: false, by: null, note: 'no policy dominates' },
    },
    hooks,
    crashes: o.crashes ?? [],
  }
}

const SPEC = [
  '# Sample',
  '',
  '- **Verb:** poke',
  '- **Depth engine:** mastery',
  '- **Age band:** 5 to 8',
  '- **Lens:** other',
  '- **Hooks declared:** score',
  '',
  '## Loop',
  'A thing happens.',
  '',
  '## What should vary on repeat play',
  'Given play 5: it differs.',
  '',
  '## Findings',
  FINDINGS_START,
  '_The persona panel fills this in._',
  FINDINGS_END,
  '',
  '## Known weaknesses',
  '_Filled after the panel run._',
  '',
].join('\n')

function idea(key: string, play5: string): IdeaRecord {
  return {
    id: `mastery-${key}`,
    name: key,
    loop: 'loop',
    verb: 'poke',
    ageBand: [5, 8],
    engine: 'mastery',
    secondaryEngines: [],
    lens: 'other',
    toy: null,
    play5,
    critique: null,
    decision: { id: `mastery-${key}`, status: 'built', cutReason: null, protoKey: key, batch: 1, reserveOrder: null, replaces: null },
  }
}

function proto(options: ReportOptions, spec: string = SPEC): Prototype {
  return { key: options.key, report: makeReport(options), spec, idea: idea(options.key, `on play 5, ${options.key} differs`) }
}

function section(text: string, heading: string): string {
  const lines = text.split('\n')
  const at = lines.findIndex((l) => l.startsWith(heading))
  if (at < 0) return ''
  let end = lines.length
  for (let i = at + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i]!)) {
      end = i
      break
    }
  }
  return lines.slice(at, end).join('\n')
}

// Every data row of every table under a heading, keyed by the header names.
function tableRows(text: string): Record<string, string>[] {
  const lines = text.split('\n')
  const out: Record<string, string>[] = []
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]!.startsWith('| ') || !lines[i + 1]?.startsWith('| ---')) continue
    const split = (line: string): string[] => line.slice(2, -2).split(' | ')
    const head = split(lines[i]!)
    for (let j = i + 2; j < lines.length && lines[j]!.startsWith('| '); j++) {
      const cells = split(lines[j]!)
      out.push(Object.fromEntries(head.map((h, k) => [h, cells[k] ?? ''])))
    }
  }
  return out
}

const FAKE_VALIDATION: InstrumentValidation = {
  seed: 1,
  fixtures: [
    { key: 'pos', expected: 'pass', pass: true, share: 0.8, started: 14, runs: 18, meanRank: 4 },
    { key: 'neg', expected: 'fail', pass: false, share: 0, started: 0, runs: 18, meanRank: 2 },
  ],
  rankOrder: ['pos', 'neg'],
  holds: true,
}

// A shortlist scenario: four passing (two buckets) and a spread of failures.
function scenario(): Prototype[] {
  return [
    proto({ key: 'alpha', band: [5, 8], started: [8, 7, 6], signals: { returnScore: 0.7, changeScore: 2, aimScore: 2 } }),
    proto({ key: 'bravo', band: [6, 8], started: [9, 9, 9], signals: { returnScore: 0.9, changeScore: 4, aimScore: 3 } }),
    proto({ key: 'charlie', band: [10, 12], started: [12, 12, 12], signals: { returnScore: 1, changeScore: 9, aimScore: 9 } }),
    proto({ key: 'delta', band: [2, 5], started: [1, 0, 0], clarity: { flag: 'ok', changedShare: 1, ticks: 1 } }),
    proto({ key: 'echo', band: [7, 9], started: [4, 2, 1] }),
  ]
}

// ------------------------------------------------------------------ AE3
describe('AE3: depth first, and clarity only after it', () => {
  const quitter = { key: 'quitter', started: [0, 0, 0], clarity: { flag: 'ok', changedShare: 1, ticks: 1 } } satisfies ReportOptions
  const keeper = { key: 'keeper', started: [10, 9, 8] } satisfies ReportOptions

  it('leaves a prototype whose runs quit after session 1 out of the entries, however clear it was', () => {
    const text = buildShortlist([proto(quitter), proto(keeper)])
    const entries = section(text, '## Shortlist entries')
    expect(entries).toContain('`keeper`')
    expect(entries).not.toContain('quitter')
    const all = tableRows(section(text, '## All prototypes'))
    const row = all.find((r) => r['Key'] === '`quitter`')!
    expect(row['Gate']).toBe('fail')
    expect(row['Clarity']).toBe('not assessed')
  })

  it('never states clarity for a prototype that failed the gate, in any document', () => {
    const p = proto(quitter)
    const s = summarize(p)
    expect(s.clarity).toBe('not assessed')
    expect(s.clarityReason).toBeNull()
    const filled = fillSpec(SPEC, p.report)
    expect(filled).toContain(`**First 10 seconds:** ${NOT_ASSESSED}`)
    expect(filled).not.toMatch(/First 10 seconds:\*\* (clear|blocked)/)
    expect(filled).not.toContain('cue-blind touches changed')
    expect(checkSpec(filled, 'quitter', { generated: true, report: p.report })).toEqual([])
  })

  it('checks clarity for a prototype that passes, and gives the reason when it is low', () => {
    const clear = proto({ key: 'clear-one', started: [10, 8, 6] })
    expect(fillSpec(SPEC, clear.report)).toMatch(/First 10 seconds:\*\* clear\. 90% of 40 cue-blind touches/)
    const blocked = proto({ key: 'blocked-one', started: [10, 8, 6], clarity: { flag: 'low', changedShare: 0.1, ticks: 200 } })
    const s = summarize(blocked)
    expect(s.clarity).toBe(BLOCKED)
    expect(s.clarityReason).toContain('only 10% of cue-blind touches changed anything')
    expect(s.clarityReason).toContain(`the line is tick ${T.CLARITY_MAX_FIRST_TICK}`)
    const filled = fillSpec(SPEC, blocked.report)
    expect(filled).toContain(`**First 10 seconds:** ${BLOCKED}.`)
    expect(filled).toContain('Blocked for polish on clarity')
  })

  it('explains a first ten seconds in which nothing changed', () => {
    const p = proto({ key: 'still', started: [10, 8, 6], clarity: { flag: 'low', changedShare: 0, ticks: null } })
    expect(summarize(p).clarityReason).toContain('no cue-blind run changed the sim')
  })
})

// --------------------------------------------------------- ranking, per bucket
describe('the ranking', () => {
  it('ranks passing prototypes within their own age bucket and never across buckets', () => {
    const rankings = rankByBucket(scenario().map(summarize))
    const byBucket = Object.fromEntries(rankings.map((r) => [r.bucket, r.rows.map((row) => row.summary.key)]))
    // bravo beats alpha in 5-6; charlie is alone in 10-12; delta failed; echo failed.
    expect(byBucket).toEqual({ '2-4': [], '5-6': ['bravo', 'alpha'], '7-9': [], '10-12': ['charlie'] })
    const charlie = rankings.find((r) => r.bucket === '10-12')!.rows[0]!
    // Charlie beats everyone on every signal, but is ranked only among its own bucket.
    expect(charlie.ranked.meanRank).toBe(1)
    const bravo = rankings.find((r) => r.bucket === '5-6')!.rows[0]!
    expect(bravo.ranked.meanRank).toBe(2)
  })

  it('uses the bucket of the lowest age in the band', () => {
    expect(summarize(proto({ key: 'a', band: [4, 7] })).bucket).toBe('2-4')
    expect(summarize(proto({ key: 'b', band: [5, 8] })).bucket).toBe('5-6')
    expect(summarize(proto({ key: 'c', band: [7, 10] })).bucket).toBe('7-9')
    expect(summarize(proto({ key: 'd', band: [9, 12] })).bucket).toBe('7-9')
    expect(summarize(proto({ key: 'e', band: [10, 12] })).bucket).toBe('10-12')
  })

  it('orders a bucket by the mean of the three sub-signal ranks, not by any one signal', () => {
    const pass: [number, number, number] = [8, 7, 6]
    const list = [
      proto({ key: 'p', started: pass, signals: { returnScore: 0.9, changeScore: 1, aimScore: 1 } }),
      proto({ key: 'q', started: pass, signals: { returnScore: 0.6, changeScore: 5, aimScore: 2 } }),
      proto({ key: 'r', started: pass, signals: { returnScore: 0.7, changeScore: 3, aimScore: 3 } }),
    ]
    const rows = rankByBucket(list.map(summarize)).find((r) => r.bucket === '5-6')!.rows
    expect(rows.map((r) => r.summary.key)).toEqual(['r', 'q', 'p'])
    expect(rows.map((r) => r.ranked.meanRank.toFixed(2))).toEqual(['2.33', '2.00', '1.67'])
    // The table carries the same order.
    const text = buildShortlist(list)
    expect(tableRows(section(text, '## Shortlist entries')).map((r) => r['Prototype']!.split(' ')[0])).toEqual(['`r`', '`q`', '`p`'])
  })

  it('places a dominant-strategy entry below an unflagged one of equal rank', () => {
    const same = { started: [8, 7, 6] as [number, number, number], signals: { returnScore: 0.7, changeScore: 2, aimScore: 2 } }
    // "aaa" sorts first by key, so only the flag can put it second.
    const list = [proto({ key: 'aaa-dominant', ...same, dominant: true }), proto({ key: 'zzz-plain', ...same })]
    const rows = rankByBucket(list.map(summarize)).find((r) => r.bucket === '5-6')!.rows
    expect(rows.map((r) => r.summary.key)).toEqual(['zzz-plain', 'aaa-dominant'])
    expect(rows[0]!.ranked.meanRank).toBe(rows[1]!.ranked.meanRank)
    const entries = tableRows(section(buildShortlist(list), '## Shortlist entries'))
    expect(entries.map((r) => r['Dominant strategy'])).toEqual(['no', 'yes (repeat-one)'])
  })

  it('does not change when the order of personas or prototypes in the reports is shuffled', () => {
    const original = scenario()
    const shuffled = [...original].reverse().map((p) => {
      const report = structuredClone(p.report)
      report.targetPanel.reverse()
      report.measures.perPersona = Object.fromEntries(Object.entries(report.measures.perPersona).reverse())
      return { ...p, report }
    })
    expect(buildShortlist(shuffled)).toBe(buildShortlist(original))
    expect(fillSpec(SPEC, shuffled[0]!.report)).toBe(fillSpec(SPEC, original[4]!.report))
  })

  describe('on real reports played with the personas in the opposite order', () => {
    const order = (personas: readonly (typeof PERSONAS)[number][]): Record<string, PanelReport> => {
      const out: Record<string, PanelReport> = {}
      for (const fixture of [ladder, emergent]) {
        const raw = buildReport({ meta: fixture.meta, createSim: fixture.createSim }, { seed: T.DEFAULT_MASTER_SEED, personas })
        out[fixture.meta.key] = parseReport(JSON.parse(stableStringify(raw)) as unknown, fixture.meta.key)
      }
      return out
    }
    it('ranks the same', () => {
      const forward = order(PERSONAS)
      const backward = order([...PERSONAS].reverse())
      const rank = (reports: Record<string, PanelReport>) =>
        rankByBucket(Object.entries(reports).map(([key, report]) => summarize({ key, report, spec: SPEC, idea: null }))).flatMap((b) =>
          b.rows.map((r) => `${b.bucket} ${r.summary.key} ${r.ranked.meanRank.toFixed(4)}`),
        )
      expect(rank(backward)).toEqual(rank(forward))
      expect(rank(forward).length).toBe(2)
    }, 120_000)
  })
})

// -------------------------------------------------------- near the gate list
describe('when fewer than three prototypes pass', () => {
  // Two pass (in different buckets), eleven fail with distinct session-3 shares.
  function fixtureSet(): Prototype[] {
    const list: Prototype[] = [
      proto({ key: 'pass-one', band: [5, 8], started: [10, 9, 8] }),
      proto({ key: 'pass-two', band: [10, 12], started: [9, 9, 9] }),
    ]
    for (let i = 0; i < 11; i++) {
      // 5 of 12 down to 0 of 12, keys in the opposite order to the shares.
      const n = Math.max(0, 5 - Math.floor(i / 2))
      list.push(proto({ key: `fail-${String(10 - i).padStart(2, '0')}`, band: [2 + (i % 8), 12], started: [n, 0, 0] }))
    }
    return list
  }

  it('states the pass count and lists the ten non-passing prototypes nearest the gate, labelled as not entries', () => {
    const text = buildShortlist(fixtureSet())
    expect(section(text, '## Gate result')).toContain('**2 of 13**')
    expect(section(text, '## Gate result')).toContain('Fewer than 3 prototypes passed')
    const near = section(text, '## Near the gate')
    expect(near.split('\n')[0]).toBe('## Near the gate (not shortlist entries)')
    const rows = tableRows(near)
    expect(rows).toHaveLength(10)
    const shares = rows.map((r) => Number(r['Share']!.replace('%', '')))
    expect(shares).toEqual([...shares].sort((a, b) => b - a))
    // 11 fail, so the lowest of them is left out.
    expect(rows.map((r) => r['Prototype']!.split(' ')[0])).not.toContain('`fail-00`')
    expect(near).not.toContain('pass-one')
    expect(near).not.toContain('pass-two')
    // The near-the-gate prototypes are not in the entries section, and the section never calls them entries.
    const entries = section(text, '## Shortlist entries')
    expect(entries).toContain('`pass-one`')
    expect(entries).toContain('`pass-two`')
    expect(entries).not.toContain('fail-')
    expect(near).toMatch(/none of them is a shortlist entry/)
    expect(near.split('\n').slice(1).join('\n')).not.toMatch(/\bare (the )?(shortlist )?entries\b/)
  })

  it('changes no threshold and says the gate was left alone', () => {
    expect(section(buildShortlist(fixtureSet()), '## Gate result')).toContain('Nothing has been retuned')
  })

  it('leaves the near-the-gate list out when three or more pass', () => {
    const list = [...fixtureSet(), proto({ key: 'pass-three', band: [7, 9], started: [8, 8, 8] })]
    const text = buildShortlist(list)
    expect(section(text, '## Gate result')).toContain('**3 of 14**')
    expect(text).not.toContain('## Near the gate')
    expect(text).not.toContain('Fewer than')
  })

  it('says so plainly when nothing passes', () => {
    const text = buildShortlist([proto({ key: 'nobody', started: [1, 0, 0] })])
    expect(section(text, '## Gate result')).toContain('**0 of 1**')
    expect(section(text, '## Shortlist entries')).toContain('there are no shortlist entries')
    expect(section(text, '## Near the gate')).toContain('`nobody`')
  })

  it('reports how many whole runs short of the line each near-the-gate prototype is', () => {
    const text = buildShortlist([proto({ key: 'close', runs: 18, started: [8, 0, 0] })])
    expect(tableRows(section(text, '## Near the gate'))[0]!['Short of the gate']).toBe('5.6 points (1 run)')
  })
})

// ------------------------------------------------------------ every entry's flag
describe('every shortlist entry carries a clarity flag', () => {
  it('shows clear or blocked-for-polish on each entry, and the reason when blocked', () => {
    const list = [
      proto({ key: 'sharp', started: [10, 9, 8] }),
      proto({ key: 'foggy', started: [9, 8, 7], clarity: { flag: 'low', changedShare: 0.05, ticks: 220 } }),
      proto({ key: 'another', band: [10, 12], started: [12, 12, 12] }),
      proto({ key: 'lost', started: [2, 1, 0] }),
    ]
    const rows = tableRows(section(buildShortlist(list), '## Shortlist entries'))
    expect(rows.map((r) => r['Prototype']!.split(' ')[0]).sort()).toEqual(['`another`', '`foggy`', '`sharp`'])
    for (const row of rows) expect([CLEAR, BLOCKED]).toContain(row['Clarity'])
    const foggy = rows.find((r) => r['Prototype']!.startsWith('`foggy`'))!
    expect(foggy['Clarity']).toBe(BLOCKED)
    expect(foggy['Why blocked']).toContain('only 5% of cue-blind touches changed anything')
    for (const row of rows.filter((r) => r['Clarity'] === CLEAR)) expect(row['Why blocked']).toBe('')
  })

  it('keeps a blocked entry on the list', () => {
    const text = buildShortlist([proto({ key: 'foggy', started: [9, 8, 7], clarity: { flag: 'low' } })])
    expect(section(text, '## Shortlist entries')).toContain('`foggy`')
  })

  it('carries the catalog play-5 line for each entry', () => {
    const text = buildShortlist([proto({ key: 'sharp', started: [10, 9, 8] })])
    expect(section(text, '## Shortlist entries')).toContain('- `sharp`: on play 5, sharp differs')
  })
})

// ------------------------------------------------------------- full table
describe('the full table', () => {
  it('has a row per prototype with every column the brief names', () => {
    const rows = tableRows(section(buildShortlist(scenario()), '## All prototypes'))
    expect(rows.map((r) => r['Key'])).toEqual(['`alpha`', '`bravo`', '`charlie`', '`delta`', '`echo`'])
    expect(Object.keys(rows[0]!)).toEqual([
      'Key',
      'Name',
      'Engine',
      'Age bucket',
      'Lens',
      'Gate',
      'Session 3',
      'Session 4',
      'Session 5',
      'Play 5 change',
      'Aims that made progress',
      'Dominant strategy',
      'Clarity',
      'Hooks',
    ])
    expect(rows[0]).toMatchObject({ Gate: 'pass', 'Session 3': '8/12 (67%)', 'Session 4': '7/12 (58%)', 'Session 5': '6/12 (50%)', 'Aims that made progress': '4 of 10', Hooks: 'none' })
    expect(rows[3]).toMatchObject({ Gate: 'fail', 'Age bucket': '2-4', Clarity: 'not assessed' })
  })
})

// ------------------------------------------------------------------ HOOKS.md
describe('AE4: the hook table', () => {
  const hooked = (): Prototype[] => [
    proto({
      key: 'scored',
      started: [6, 5, 4],
      baseline: 0.5,
      allOff: 0.25,
      hooks: { score: { share: 0.5, changed: false, verdict: VERDICT_INCONCLUSIVE }, level: { share: 0.25, changed: true, verdict: VERDICT_NEEDED } },
    }),
    proto({ key: 'plain', started: [6, 5, 4] }),
    proto({ key: 'looped', started: [6, 5, 4], unsupported: { hooks: ['stars'], reason: 'the stars are the loop itself' } }),
    proto({ key: 'quiet', started: [6, 5, 4], baseline: 0.4, allOff: 0.4, hooks: { chime: { share: 0.4, changed: true, verdict: VERDICT_NOT_NEEDED } } }),
  ]

  it('prints the KTD7 rule at the top, built from the frozen threshold', () => {
    const text = buildHooks(hooked())
    const rule = section(text, '## The verdict rule')
    expect(text.indexOf(rule)).toBeLessThan(text.indexOf('## Ablation results'))
    expect(rule).toContain(`more than ${T.HOOK_NEEDED_DROP * 100} percentage points`)
    expect(rule).toContain(VERDICT_NEEDED)
    expect(rule).toContain(VERDICT_NOT_NEEDED)
    expect(rule).toContain(VERDICT_INCONCLUSIVE)
    expect(rule).toContain('n/a')
  })

  it('gives a declared score hook a row with its own arm, the all-off arm, and a verdict', () => {
    const rows = tableRows(section(buildHooks(hooked()), '## Ablation results'))
    const score = rows.find((r) => r['Prototype'] === '`scored`' && r['Hook'] === '`score`')!
    expect(score).toMatchObject({
      'Session 3, all hooks on': '50.0%',
      'Session 3, without this hook': '50.0%',
      'Session 3, all hooks off': '25.0%',
      'Removal changed affordances or signatures': 'no',
      Verdict: VERDICT_INCONCLUSIVE,
    })
    const level = rows.find((r) => r['Hook'] === '`level`')!
    expect(level).toMatchObject({ 'Session 3, without this hook': '25.0%', Verdict: VERDICT_NEEDED })
  })

  it('reads inconclusive for a hook whose removal changes nothing, and not needed when it changes something without a drop', () => {
    const rows = tableRows(section(buildHooks(hooked()), '## Ablation results'))
    expect(rows.find((r) => r['Hook'] === '`score`')!['Verdict']).toContain('inconclusive')
    expect(rows.find((r) => r['Hook'] === '`chime`')!['Verdict']).toBe(VERDICT_NOT_NEEDED)
  })

  it('gives a prototype whose hook cannot be removed its n/a row with the reason', () => {
    const rows = tableRows(section(buildHooks(hooked()), '## Ablation results'))
    const stars = rows.find((r) => r['Hook'] === '`stars`')!
    expect(stars['Prototype']).toBe('`looped`')
    expect(stars['Verdict']).toBe('n/a: the stars are the loop itself')
    expect(stars['Session 3, without this hook']).toBe('n/a')
  })

  it('lists prototypes with no hooks in one line and ends with the counts', () => {
    const text = buildHooks(hooked())
    expect(text).toContain('Prototypes with no hooks (1): `plain`.')
    const summary = section(text, '## Summary')
    expect(summary).toContain('4 hook rows across 3 prototypes: 1 needed, 1 not needed, 1 inconclusive, 1 n/a.')
    expect(text.trimEnd().endsWith('1 n/a.')).toBe(true)
    // Ordered by prototype, then the order hooks were declared.
    const rows = tableRows(section(text, '## Ablation results'))
    expect(rows.map((r) => `${r['Prototype']} ${r['Hook']}`)).toEqual(['`looped` `stars`', '`quiet` `chime`', '`scored` `score`', '`scored` `level`'])
  })

  it('draws no conclusion about the guidelines', () => {
    expect(buildHooks(hooked())).toContain('draws no conclusion about the guidelines')
  })

  describe('on a real report for the score-only fixture', () => {
    it('shows its score hook as inconclusive, in HOOKS.md and in its SPEC findings', () => {
      const raw = buildReport({ meta: scoreOnly.meta, createSim: scoreOnly.createSim }, { seed: T.DEFAULT_MASTER_SEED })
      const report = parseReport(JSON.parse(stableStringify(raw)) as unknown, 'score-only')
      const p: Prototype = { key: 'score-only', report, spec: SPEC, idea: null }
      const row = tableRows(section(buildHooks([p]), '## Ablation results'))[0]!
      expect(row['Hook']).toBe('`score`')
      expect(row['Verdict']).toBe(VERDICT_INCONCLUSIVE)
      expect(row['Removal changed affordances or signatures']).toBe('no')
      expect(row['Session 3, all hooks off']).toMatch(/%$/)
      const filled = fillSpec(SPEC, report)
      expect(filled).toContain('`score`: inconclusive (the persona model has no reward response); without it')
      expect(filled).toContain('Hook ablation says little for `score`')
    }, 120_000)
  })
})

// --------------------------------------------------------------------- SPEC
describe('SPEC.md', () => {
  const failing = proto({
    key: 'failing',
    started: [3, 2, 1],
    crashes: [{ where: 'session 2', persona: 'kaia', seedIndex: 1, tick: 88, message: 'boom' }],
    hooks: { score: { share: 0.1, changed: false, verdict: VERDICT_INCONCLUSIVE }, level: { share: 0.1, changed: true, verdict: VERDICT_NEEDED } },
    baseline: 0.3,
    allOff: 0.1,
    dominant: true,
    aims: [8, 0],
    play5: 0,
    sessions: [1, 1.5],
  })

  it('replaces only the text between the markers and the body of the weaknesses section', () => {
    const spec = `${SPEC}\n## Notes\nKeep me.\n`
    const filled = fillSpec(spec, failing.report)
    const lines = filled.split('\n')
    const start = lines.indexOf(FINDINGS_START)
    const end = lines.indexOf(FINDINGS_END)
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start + 1)
    // Everything before the start marker, the markers themselves, and the section headings are untouched.
    expect(filled.startsWith(SPEC.slice(0, SPEC.indexOf(FINDINGS_START)))).toBe(true)
    expect(filled).toContain(`${FINDINGS_END}\n\n## Known weaknesses\n`)
    expect(filled).not.toContain('_The persona panel fills this in._')
    expect(filled).not.toContain('_Filled after the panel run._')
    // A later section is kept intact, after a blank line.
    expect(filled.endsWith('\n\n## Notes\nKeep me.\n')).toBe(true)
  })

  it('is idempotent', () => {
    const once = fillSpec(SPEC, failing.report)
    expect(fillSpec(once, failing.report)).toBe(once)
    const withTail = fillSpec(`${SPEC}\n## Notes\nKeep me.\n`, failing.report)
    expect(fillSpec(withTail, failing.report)).toBe(withTail)
  })

  it('carries every R8 field once generated', () => {
    const filled = fillSpec(SPEC, failing.report)
    expect(checkSpec(filled, 'failing', { generated: true, report: failing.report })).toEqual([])
    for (const text of ['**Verb:**', '**Depth engine:**', '## What should vary on repeat play', '**Depth gate:**', '**Play 5 against play 1:**', '**Self-set aims:**', '**First 10 seconds:**', '**Self-play:**', '**Hook flags', '**Crashes:**', '## Known weaknesses', GUESS_NOTE]) {
      expect(filled, text).toContain(text)
    }
    expect(filled.split('\n').length - 1).toBeLessThanOrEqual(SPEC_MAX_LINES)
  })

  it('says how many runs started sessions 3, 4, and 5, and the play 5 change', () => {
    const lines = findingsLines(failing.report).join('\n')
    expect(lines).toContain('3 of 12 runs (25%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 3, 2, 1 of 12.')
    expect(lines).toContain('**Play 5 against play 1:** change 0.00')
    expect(lines).toContain('**Self-set aims:** 8 adopted, 0 made progress.')
  })

  it('calls out each hook flag with its verdict, the raw material for the guidelines', () => {
    const lines = findingsLines(failing.report).join('\n')
    expect(lines).toContain('**Hook flags** (raw material for the guidelines; session 3 return 30.0% with every hook on, 10.0% with all off)')
    expect(lines).toContain('`score`: inconclusive (the persona model has no reward response); without it 10.0%')
    expect(lines).toContain('`level`: needed; without it 10.0%')
    expect(findingsLines(makeReport({ key: 'x' })).join('\n')).toContain('**Hook flags:** none declared.')
    const unsupported = makeReport({ key: 'x', unsupported: { hooks: ['stars', 'levels'], reason: 'they are the loop' } })
    expect(findingsLines(unsupported).join('\n')).toContain('**Hook flags:** `stars`, `levels`: n/a: they are the loop.')
  })

  it('reports self-play variety and the dominant flag, or variety only without an objective', () => {
    expect(findingsLines(failing.report).join('\n')).toContain('Dominant strategy: yes, repeat-one beats random on the objective while its variety collapses.')
    const none = makeReport({ key: 'x' })
    none.selfPlay.objective = null
    none.selfPlay.dominant = { flagged: false, by: null, note: 'no objective declared: variety only' }
    expect(findingsLines(none).join('\n')).toContain('no objective declared, variety only')
  })

  it('derives the weaknesses from the data and invents none', () => {
    const text = weaknessLines(failing.report).join('\n')
    expect(text).toContain('Fails the depth gate: 3 of 12 target-panel runs (25%) start session 3, 25.0 points short of the 50% line (3 more runs needed).')
    expect(text).toContain('Dominant strategy in self-play')
    expect(text).toContain('Hook ablation says little for `score`')
    expect(text).toContain('Leans on hook `level`: removing it drops session-3 return from 30.0% to 10.0%.')
    expect(text).toContain('Crashed 1 time during the panel; first: session 2, persona kaia, seed 1, tick 88: boom')
    expect(text).toContain('No self-set aim made progress (0 of 8 adopted).')
    expect(text).toContain('Play 5 shows no measured change from play 1')
    expect(text).toMatch(/Left first: `kaia`, starting 1\.0 of 5 sessions on average \(the best in the target panel starts 1\.5\)\./)
  })

  it('has no weakness to report for a clean pass beyond who left first', () => {
    const clean = makeReport({ key: 'clean', started: [10, 9, 8], sessions: [3, 3] })
    expect(weaknessLines(clean)).toEqual(['- The panel measures found none. Real children have not played it.'])
    const uneven = makeReport({ key: 'uneven', started: [10, 9, 8], sessions: [2, 4] })
    expect(weaknessLines(uneven)).toEqual(['- Left first: `kaia`, starting 2.0 of 5 sessions on average (the best in the target panel starts 4.0).'])
  })

  it('names no persona as leaving first when they all left together', () => {
    const report = makeReport({ key: 'tied', sessions: [1, 1] })
    expect(weaknessLines(report).join('\n')).not.toContain('Left first')
  })

  it('notes low clarity as a weakness only for a prototype that passed', () => {
    const passed = makeReport({ key: 'p', started: [10, 9, 8], clarity: { flag: 'low' } })
    const failed = makeReport({ key: 'f', started: [1, 0, 0], clarity: { flag: 'low' } })
    expect(weaknessLines(passed).join('\n')).toContain('Blocked for polish on clarity')
    expect(weaknessLines(failed).join('\n')).not.toContain('clarity')
  })

  it('stays within 70 lines even for a long skeleton, by using the compact form', () => {
    const report = makeReport({ key: 'busy', hooks: { a: { share: 0.1, changed: true, verdict: VERDICT_NEEDED }, b: { share: 0.1, changed: true, verdict: VERDICT_NEEDED }, c: { share: 0.1, changed: true, verdict: VERDICT_NEEDED } }, crashes: [{ where: 'clarity', persona: 'kaia', seedIndex: 0, tick: 1, message: 'x'.repeat(300) }], dominant: true, aims: [4, 0] })
    const normal = fillSpec(SPEC, report, 'full').split('\n').length - 1
    const compact = fillSpec(SPEC, report, 'compact').split('\n').length - 1
    expect(compact).toBeLessThan(normal)
    // Pad the loop section until the normal form no longer fits but the compact one does.
    const extra = SPEC_MAX_LINES - compact
    const long = SPEC.replace('A thing happens.', Array.from({ length: extra + 1 }, (_, i) => `Line ${i}.`).join('\n'))
    expect(fillSpec(long, report, 'full').split('\n').length - 1).toBeGreaterThan(SPEC_MAX_LINES)
    const automatic = fillSpec(long, report)
    expect(automatic).toBe(fillSpec(long, report, 'compact'))
    expect(automatic.split('\n').length - 1).toBeLessThanOrEqual(SPEC_MAX_LINES)
  })

  it('throws, naming the prototype, when a marker or the weaknesses section is missing', () => {
    expect(() => fillSpec(SPEC.replace(FINDINGS_START, ''), makeReport({ key: 'nomark' }))).toThrow(/nomark.*markers/)
    expect(() => fillSpec(SPEC.replace('## Known weaknesses', '## Something else'), makeReport({ key: 'noweak' }))).toThrow(/noweak.*Known weaknesses/)
  })

  it('reports each missing R8 field', () => {
    const report = makeReport({ key: 'thin' })
    const filled = fillSpec(SPEC, report)
    expect(checkSpec(filled, 'thin', { generated: true, report })).toEqual([])
    const without = (text: string): string => filled.replace(text, '')
    expect(checkSpec(without('- **Verb:** poke'), 'thin')).toEqual(['thin: SPEC.md has no "Verb" field'])
    expect(checkSpec(without('- **Depth engine:** mastery'), 'thin')).toEqual(['thin: SPEC.md has no "Depth engine" field'])
    expect(checkSpec(without('Given play 5: it differs.'), 'thin')).toEqual(['thin: SPEC.md has no "## What should vary on repeat play" section'])
    expect(checkSpec(without(FINDINGS_END), 'thin')[0]).toContain('missing the findings markers')
    expect(checkSpec(SPEC, 'thin', { generated: true })).toEqual(expect.arrayContaining(['thin: SPEC.md findings lack the depth gate result', 'thin: SPEC.md known weaknesses are still the placeholder']))
    expect(checkSpec(filled.replace('- **Self-play:**', '- **Other:**'), 'thin', { generated: true })).toEqual(['thin: SPEC.md findings lack the self-play findings'])
    expect(checkSpec(filled, 'thin', { generated: true, report: { ...report, meta: { ...report.meta, verb: 'launch' } } })[0]).toContain('does not match')
    expect(checkSpec(`${filled}${'more\n'.repeat(SPEC_MAX_LINES)}`, 'thin')[0]).toContain(`the limit is ${SPEC_MAX_LINES}`)
  })
})

// The real skeletons written by the prototype builders.
describe('the SPEC.md files in lab/protos', () => {
  const { protosDir } = defaultLocations()
  const keys = protoKeys(protosDir)

  it('all have the skeleton fields, both markers, and a weaknesses section', () => {
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      const spec = readFileSync(join(protosDir, key, 'SPEC.md'), 'utf8')
      expect(checkSpec(spec, key), key).toEqual([])
    }
  })

  it('stay within 70 lines once filled with the busiest possible report', () => {
    const busy = (key: string): PanelReport =>
      makeReport({
        key,
        started: [1, 0, 0],
        hooks: {
          one: { share: 0, changed: true, verdict: VERDICT_NEEDED },
          two: { share: 0, changed: false, verdict: VERDICT_INCONCLUSIVE },
          three: { share: 0, changed: true, verdict: VERDICT_NEEDED },
          four: { share: 0, changed: true, verdict: VERDICT_NEEDED },
        },
        crashes: [{ where: 'hook arm without one: session 1', persona: 'arch-11', seedIndex: 2, tick: 4000, message: 'y'.repeat(400) }],
        dominant: true,
        aims: [12, 0],
        play5: 0,
        clarity: { flag: 'low' },
      })
    for (const key of keys) {
      const spec = readFileSync(join(protosDir, key, 'SPEC.md'), 'utf8')
      const filled = fillSpec(spec, busy(key))
      expect(filled.split('\n').length - 1, `${key} is ${filled.split('\n').length - 1} lines`).toBeLessThanOrEqual(SPEC_MAX_LINES)
      expect(checkSpec(filled, key, { generated: true }), key).toEqual([])
    }
  })
})

// ---------------------------------------------------------------- INSTRUMENT
describe('INSTRUMENT.md', () => {
  let validation: InstrumentValidation
  let text: string
  beforeAll(() => {
    validation = validateInstrument()
    text = buildInstrument(validation, [proto({ key: 'a', started: [3, 2, 1] }), proto({ key: 'b', started: [6, 6, 6] })].map(summarize))
  }, 120_000)

  it('reproduces every frozen constant from the code, not from a copy', () => {
    let checked = 0
    for (const [name, value] of Object.entries(T)) {
      if (typeof value !== 'number' && typeof value !== 'string') continue
      expect(text, name).toContain(`| \`${name}\` | \`${value}\` |`)
      checked++
    }
    expect(checked).toBeGreaterThan(50)
    expect(text).toContain(`Version \`${T.THRESHOLDS_VERSION}\``)
    expect(text).toContain(`at least ${T.GATE_SHARE * 100}% of its target-panel runs start session ${T.GATE_SESSION}`)
  })

  it('lists the personas with the research or default label of each parameter', () => {
    for (const persona of PERSONAS) expect(text).toContain(`\`${persona.id}\``)
    const labels = tableRows(section(text, '## Personas'))
    const focus = labels.find((r) => r['Parameter'] === '`focus`')!
    expect(focus['Label']).toBe('research for kaia (4), arch-3 (3); default for tess (5), arch-6 (6), arch-7 (7), arch-8 (8), arch-9 (9), arch-11 (11)')
    for (const name of ['age', 'touchJitter', 'attention', 'draw', 'aimInvention', 'returnPropensity', 'gestureMix', 'tempo']) {
      expect(labels.find((r) => r['Parameter'] === `\`${name}\``)!['Label'], name).toBe('default')
    }
  })

  it('says Kaia is the only documented child and that the age of Tess is an assumption', () => {
    const personas = section(text, '## Personas')
    expect(personas).toContain('Kaia is the only documented child')
    expect(personas).toMatch(/age of Tess is an assumption/)
  })

  it('records the fixture validation, computed live with the functions the instrument test uses', () => {
    expect(validation.holds).toBe(true)
    expect(validation.rankOrder.slice(0, 2).sort()).toEqual(['emergent', 'ladder'])
    const byKey = Object.fromEntries(validation.fixtures.map((f) => [f.key, f]))
    expect(Object.keys(byKey).sort()).toEqual(['constant', 'emergent', 'ladder', 'noise', 'score-only'])
    for (const key of ['ladder', 'emergent']) expect(byKey[key]!.pass, key).toBe(true)
    for (const key of ['constant', 'noise', 'score-only']) expect(byKey[key]!.pass, key).toBe(false)
    // The same numbers come from calling the panel functions directly.
    const proto: PanelProto = { meta: ladder.meta, createSim: ladder.createSim }
    const runs = targetPanel(ladder.meta).flatMap((persona) =>
      Array.from({ length: T.NOISE_SEEDS }, (_, k) => playRun({ persona, proto, runSeed: masterRunSeed(T.DEFAULT_MASTER_SEED, k), seedIndex: k })),
    )
    expect(gate(runs).share).toBe(byKey['ladder']!.share)
    const rows = tableRows(section(text, '## Instrument validation'))
    expect(rows.map((r) => r['Fixture'])).toEqual(validation.rankOrder.map((k) => `\`${k}\``))
    for (const row of rows) expect(row['Gate']).toBe(byKey[row['Fixture']!.replace(/`/g, '')]!.pass ? 'pass' : 'fail')
    expect(text).toContain('**The check holds.**')
  })

  it('says a failed instrument check plainly', () => {
    const broken = buildInstrument({ ...FAKE_VALIDATION, holds: false }, [])
    expect(broken).toContain('**The check does not hold.**')
    expect(broken).toContain('No prototype reports were included')
  })

  it('states the calibration in plain words, with the figures from this run', () => {
    const calibration = section(text, '## Calibration')
    expect(calibration).toContain('The 2 real prototypes in this run reach it in 25% to 50%')
    expect(calibration).toContain('Real prototypes sit well below the engineered fixtures')
    expect(calibration).toContain('absolute rates are not comparable to the fixtures')
    expect(calibration).toContain('The ranking among prototypes is the meaningful part')
    expect(calibration).toContain('What the gate is evidence of')
    expect(calibration).toContain('What it is not evidence of')
  })

  it('claims the real prototypes sit below the fixtures only when they do', () => {
    const high = buildInstrument(FAKE_VALIDATION, [proto({ key: 'hi', started: [12, 12, 12] })].map(summarize))
    expect(high).not.toContain('sit well below')
  })
})

// ------------------------------------------------------- loading and failing
describe('reading the reports', () => {
  function tree(name: string, keys: string[], withReports: string[]): { protosDir: string; reportsDir: string } {
    const root = join(scratch, name)
    const protosDir = join(root, 'protos')
    const reportsDir = join(root, 'reports')
    mkdirSync(reportsDir, { recursive: true })
    for (const key of keys) {
      mkdirSync(join(protosDir, key), { recursive: true })
      writeFileSync(join(protosDir, key, 'meta.ts'), '')
      writeFileSync(join(protosDir, key, 'SPEC.md'), SPEC)
    }
    for (const key of withReports) writeFileSync(join(reportsDir, `${key}.json`), stableStringify(makeReport({ key, started: [6, 5, 4] })))
    return { protosDir, reportsDir }
  }

  it('names a missing report and writes nothing', () => {
    const where = tree('missing', ['one', 'two'], ['one'])
    const result = generate({ ...where, catalog: [], validation: FAKE_VALIDATION })
    expect(result.written).toEqual([])
    expect(result.problems).toHaveLength(1)
    expect(result.problems[0]).toContain('no report for two')
    expect(result.problems[0]).toContain('node lab/panel/run.ts two')
    expect(existsSync(join(where.reportsDir, 'SHORTLIST.md'))).toBe(false)
    expect(readFileSync(join(where.protosDir, 'one', 'SPEC.md'), 'utf8')).toBe(SPEC)
  })

  it('names a report made with other thresholds, or with a field missing', () => {
    const where = tree('stale', ['one', 'two'], ['one', 'two'])
    const stale = makeReport({ key: 'one' })
    stale.thresholdsVersion = 'u2-panel-0'
    writeFileSync(join(where.reportsDir, 'one.json'), stableStringify(stale))
    const broken = JSON.parse(stableStringify(makeReport({ key: 'two' }))) as Record<string, any>
    delete broken['gate'].share
    writeFileSync(join(where.reportsDir, 'two.json'), stableStringify(broken))
    const { problems } = collectPrototypes(where, [])
    expect(problems).toHaveLength(2)
    expect(problems[0]).toMatch(/report for one is malformed: made with thresholds u2-panel-0/)
    expect(problems[1]).toMatch(/report for two is malformed: gate.share should be number/)
    expect(generate({ ...where, catalog: [], validation: FAKE_VALIDATION }).written).toEqual([])
  })

  it('rejects a report filed under the wrong key', () => {
    expect(() => parseReport(JSON.parse(stableStringify(makeReport({ key: 'other' }))), 'this')).toThrow(/report for this is malformed: key is other, expected this/)
  })

  it('writes nothing when a SPEC.md is missing a marker, and says which', () => {
    const where = tree('nomarker', ['one'], ['one'])
    writeFileSync(join(where.protosDir, 'one', 'SPEC.md'), SPEC.replace(FINDINGS_END, ''))
    const result = generate({ ...where, catalog: [], validation: FAKE_VALIDATION })
    expect(result.problems.join('\n')).toContain('one: SPEC.md is missing the findings markers')
    expect(result.written).toEqual([])
  })

  it('never reads the example prototype', () => {
    const where = tree('example', ['one'], ['one'])
    mkdirSync(join(where.protosDir, 'example'))
    writeFileSync(join(where.protosDir, 'example', 'meta.ts'), '')
    expect(protoKeys(where.protosDir)).toEqual(['one'])
    expect(generate({ ...where, catalog: [], validation: FAKE_VALIDATION }).problems).toEqual([])
  })

  it('takes folders on the command line and rejects anything else', () => {
    expect(parseArgs(['--reports', 'a', '--protos=b'])).toEqual({ reportsDir: 'a', protosDir: 'b' })
    expect(() => parseArgs(['--nope'])).toThrow(/unknown argument/)
    expect(() => parseArgs(['--reports'])).toThrow(/needs a folder/)
  })
})

// -------------------------------------------------------------- regeneration
describe('regeneration', () => {
  it('produces byte-identical documents from the same inputs, and does not depend on input order', () => {
    const list = scenario()
    const a = generateDocuments(list, FAKE_VALIDATION)
    const b = generateDocuments([...list].reverse(), FAKE_VALIDATION)
    expect(b).toEqual(a)
    for (const text of [a.shortlist, a.hooks, a.instrument, ...Object.values(a.specs)]) {
      expect(text.endsWith('\n')).toBe(true)
      expect(text.endsWith('\n\n')).toBe(false)
      expect(text).not.toMatch(/\b(20\d\d-\d\d-\d\d|generated at|timestamp)\b/i)
    }
  })

  it('writes the same files on a second run, feeding the first run\'s specs back in', () => {
    const root = join(scratch, 'twice')
    const protosDir = join(root, 'protos')
    const reportsDir = join(root, 'reports')
    mkdirSync(reportsDir, { recursive: true })
    const list = scenario()
    for (const p of list) {
      mkdirSync(join(protosDir, p.key), { recursive: true })
      writeFileSync(join(protosDir, p.key, 'meta.ts'), '')
      writeFileSync(join(protosDir, p.key, 'SPEC.md'), SPEC)
      writeFileSync(join(reportsDir, `${p.key}.json`), stableStringify(p.report))
    }
    const options = { protosDir, reportsDir, catalog: list.map((p) => p.idea!), validation: FAKE_VALIDATION }
    const first = generate(options)
    expect(first.problems).toEqual([])
    expect(first.written).toHaveLength(3 + list.length)
    const snapshot = first.written.map((path) => [path, readFileSync(path, 'utf8')] as const)
    const second = generate(options)
    expect(second.written).toEqual(first.written)
    for (const [path, before] of snapshot) expect(readFileSync(path, 'utf8'), path).toBe(before)
  })
})

// ------------------------------------------------------- real reports, real specs
describe('on real reports generated into a temp folder', () => {
  it('produces complete, stable documents and specs', () => {
    const { protosDir } = defaultLocations()
    const keys = protoKeys(protosDir).slice(0, 3)
    expect(keys).toHaveLength(3)
    const root = join(scratch, 'real')
    const reportsDir = join(root, 'reports')
    const tmpProtos = join(root, 'protos')
    for (const key of keys) {
      cpSync(join(protosDir, key), join(tmpProtos, key), { recursive: true })
    }
    return runKeys(keys, { outDir: reportsDir }).then(() => {
      const catalog = loadCatalog().records
      const options = { protosDir: tmpProtos, reportsDir, catalog }
      const first = generate(options)
      expect(first.problems).toEqual([])
      const snapshot = first.written.map((path) => [path, readFileSync(path, 'utf8')] as const)
      expect(snapshot).toHaveLength(3 + keys.length)

      const shortlist = readFileSync(join(reportsDir, 'SHORTLIST.md'), 'utf8')
      expect(shortlist).toContain(`of ${keys.length}** `)
      for (const key of keys) expect(shortlist).toContain(`\`${key}\``)
      expect(readFileSync(join(reportsDir, 'HOOKS.md'), 'utf8')).toContain('## The verdict rule (KTD7)')
      expect(readFileSync(join(reportsDir, 'INSTRUMENT.md'), 'utf8')).toContain('**The check holds.**')

      for (const key of keys) {
        const report = parseReport(JSON.parse(readFileSync(join(reportsDir, `${key}.json`), 'utf8')) as unknown, key)
        const spec = readFileSync(join(tmpProtos, key, 'SPEC.md'), 'utf8')
        expect(checkSpec(spec, key, { generated: true, report }), key).toEqual([])
        expect(spec.split('\n').length - 1, key).toBeLessThanOrEqual(SPEC_MAX_LINES)
        // The clarity flag is stated only for a prototype that passed.
        if (report.gate.pass) expect(spec).toMatch(/First 10 seconds:\*\* (clear|blocked-for-polish)/)
        else expect(spec).toContain(`First 10 seconds:** ${NOT_ASSESSED}`)
        const hookLines = spec.split('\n').filter((l) => l.includes('**Hook flags'))
        expect(hookLines).toHaveLength(1)
        for (const hook of report.meta.hooks) expect(spec, `${key} ${hook}`).toContain(`\`${hook}\``)
      }

      const second = generate(options)
      expect(second.problems).toEqual([])
      for (const [path, before] of snapshot) expect(readFileSync(path, 'utf8'), path).toBe(before)
    })
  }, 300_000)

  it('prints an error naming the key from the command, and writes nothing', () => {
    const root = join(scratch, 'cli')
    mkdirSync(join(root, 'protos', 'lonely'), { recursive: true })
    writeFileSync(join(root, 'protos', 'lonely', 'meta.ts'), '')
    writeFileSync(join(root, 'protos', 'lonely', 'SPEC.md'), SPEC)
    const errors: string[] = []
    const original = console.error
    console.error = (...args: unknown[]) => void errors.push(args.join(' '))
    const code = process.exitCode
    try {
      main(['--protos', join(root, 'protos'), '--reports', join(root, 'reports')])
    } finally {
      console.error = original
      const failed = process.exitCode === 1
      process.exitCode = code
      expect(failed).toBe(true)
    }
    expect(errors.join('\n')).toContain('no report for lonely')
    expect(errors.join('\n')).toContain('nothing written')
    expect(existsSync(join(root, 'reports', 'SHORTLIST.md'))).toBe(false)
  })
})
