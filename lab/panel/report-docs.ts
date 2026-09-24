// SHORTLIST.md, HOOKS.md, and INSTRUMENT.md: pure functions from reports to
// markdown. Part of the report generator (report.ts).

import { AGE_BUCKETS } from '../ideas/validate.ts'
import { TICK_MS } from '../kit/sim.ts'
import * as constant from './fixtures/constant.ts'
import * as emergent from './fixtures/emergent.ts'
import * as ladder from './fixtures/ladder.ts'
import * as noise from './fixtures/noise.ts'
import * as scoreOnly from './fixtures/scoreOnly.ts'
import { gate, rankScore, subSignals, targetPanel, VERDICT_INCONCLUSIVE, VERDICT_NEEDED, VERDICT_NOT_NEEDED } from './metrics.ts'
import { PERSONAS } from './personas.ts'
import {
  BLOCKED,
  GUESS_NOTE,
  NEAR_GATE_COUNT,
  SHORTLIST_MIN_PASSING,
  bandText,
  cell,
  cmp,
  dominantText,
  fixed,
  hooksText,
  pct,
  plural,
  points,
  rankByBucket,
  summarize,
  table,
  withFinalNewline,
} from './report-shape.ts'
import type { Prototype, Summary } from './report-shape.ts'
import { masterRunSeed, playRun } from './session.ts'
import * as T from './thresholds.ts'
import type { PanelProto, RunResult } from './types.ts'

// ----------------------------------------------------------------- SHORTLIST
function nearTheGate(summaries: readonly Summary[]): Summary[] {
  return summaries
    .filter((s) => !s.pass)
    .sort((a, b) => b.shares.s3 - a.shares.s3 || cmp(a.key, b.key))
    .slice(0, NEAR_GATE_COUNT)
}

// Whole runs still needed to reach the gate line.
function runsShort(s: Summary): number {
  return Math.max(0, Math.ceil(T.GATE_SHARE * s.runs - 1e-9) - s.started)
}

export function buildShortlist(protos: readonly Prototype[]): string {
  const summaries = protos.map(summarize).sort((a, b) => cmp(a.key, b.key))
  const passing = summaries.filter((s) => s.pass)
  const rankings = rankByBucket(summaries)
  const lines: string[] = []

  lines.push('# Shortlist', '')
  lines.push('## How to read this', '')
  lines.push(`- ${GUESS_NOTE}`)
  lines.push('- Ranks compare prototypes with each other. Absolute values mean little.')
  lines.push('- The thresholds were frozen from five fixtures of known depth before any real prototype was scored, and none was tuned for a prototype. INSTRUMENT.md lists them.')
  lines.push(
    `- Depth comes first. A prototype passes the depth gate when at least ${pct(T.GATE_SHARE)} of its target-panel runs start session ${T.GATE_SESSION} (its target panel is the personas within ${plural(T.PANEL_MARGIN_YEARS, 'year')} of its age band). Only a prototype that passes is a shortlist entry, and only those are checked for clarity.`,
  )
  lines.push(
    '- Entries are ranked within their own age bucket, the bucket holding the lowest age in the band, and never across buckets: each prototype is judged by a different set of personas, so a cross-bucket ranking would compare persona settings, not loops.',
  )
  lines.push(
    '- The rank is the mean of three ranks among the passing prototypes in the bucket: return through session 5, change from play 1 to play 5, and self-set aims that made progress. Higher is better, and a lone entry in a bucket ranks 1 by default. A dominant-strategy flag places an entry below an unflagged entry of equal rank.',
  )
  lines.push(`- Clarity is a flag on an entry, not a filter. \`${BLOCKED}\` means the cue-blind first ten seconds looked unclear, so fix that before polishing; the entry stays on the list.`)
  lines.push('')

  lines.push('## Gate result', '')
  lines.push(
    `**${passing.length} of ${summaries.length}** ${summaries.length === 1 ? 'prototype' : 'prototypes'} passed the frozen depth gate${passing.length > 0 ? `: ${passing.map((s) => s.key).join(', ')}` : ''}.`,
  )
  lines.push('')
  lines.push(
    `By age bucket (passed of built): ${AGE_BUCKETS.map((b) => `${b}: ${summaries.filter((s) => s.pass && s.bucket === b).length} of ${summaries.filter((s) => s.bucket === b).length}`).join('; ')}.`,
  )
  if (passing.length < SHORTLIST_MIN_PASSING) {
    lines.push('')
    lines.push(
      `Fewer than ${SHORTLIST_MIN_PASSING} prototypes passed. Nothing has been retuned: the near-the-gate list below is there so the gate can be judged and, if wanted, reset by a person. It is not a list of entries.`,
    )
  }
  lines.push('')

  lines.push('## Shortlist entries', '')
  if (passing.length === 0) lines.push('No prototype passed the frozen depth gate, so there are no shortlist entries.', '')
  for (const { bucket, rows } of passing.length > 0 ? rankings : []) {
    lines.push(`### Age bucket ${bucket} (${plural(rows.length, 'entry', 'entries')})`, '')
    if (rows.length === 0) {
      lines.push('No prototype in this bucket passed the gate.', '')
      continue
    }
    lines.push(
      ...table(
        ['#', 'Prototype', 'Ages', 'Engine', 'Mean rank', 'Ranks: return / change / aims', 'Dominant strategy', 'Clarity', 'Why blocked'],
        rows.map(({ summary: s, ranked: r }, i) => [
          String(i + 1),
          `\`${s.key}\` ${s.name}`,
          bandText(s.band),
          s.engine,
          fixed(r.meanRank, 2),
          `${fixed(r.ranks.returnRank, 1)} / ${fixed(r.ranks.changeRank, 1)} / ${fixed(r.ranks.aimRank, 1)}`,
          dominantText(s),
          s.clarity,
          s.clarityReason ?? '',
        ]),
        [0, 4],
      ),
    )
    lines.push('', 'What each entry is meant to do differently on play 5 (from the idea catalog):', '')
    for (const { summary: s } of rows) lines.push(`- \`${s.key}\`: ${s.play5Line === null ? '(no catalog record)' : cell(s.play5Line)}`)
    lines.push('')
  }

  if (passing.length < SHORTLIST_MIN_PASSING) {
    const near = nearTheGate(summaries)
    lines.push('## Near the gate (not shortlist entries)', '')
    lines.push(
      `These prototypes did not pass, so none of them is a shortlist entry and none has been checked for clarity. They are the ${near.length === 1 ? 'one' : plural(near.length, 'prototype')} with the highest session-${T.GATE_SESSION} return share, so a person can decide whether to reset the gate.`,
      '',
    )
    lines.push(
      ...table(
        ['#', 'Prototype', 'Ages', 'Engine', `Runs starting session ${T.GATE_SESSION}`, 'Share', 'Short of the gate'],
        near.map((s, i) => [
          String(i + 1),
          `\`${s.key}\` ${s.name}`,
          bandText(s.band),
          s.engine,
          `${s.started} of ${s.runs}`,
          pct(s.shares.s3, 1),
          s.runs === 0 ? 'no runs' : `${points(T.GATE_SHARE - s.shares.s3)} (${plural(runsShort(s), 'run')})`,
        ]),
        [0, 4, 5],
      ),
    )
    lines.push('')
  }

  lines.push('## All prototypes', '')
  lines.push(
    ...table(
      [
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
      ],
      summaries.map((s) => [
        `\`${s.key}\``,
        s.name,
        s.engine,
        s.bucket,
        s.toy ? `${s.lens} (${s.toy})` : s.lens,
        s.pass ? 'pass' : 'fail',
        `${s.counts.s3}/${s.runs} (${pct(s.shares.s3)})`,
        `${s.counts.s4}/${s.runs} (${pct(s.shares.s4)})`,
        `${s.counts.s5}/${s.runs} (${pct(s.shares.s5)})`,
        fixed(s.play5, 2),
        `${s.aimsProgress} of ${s.aimsAdopted}`,
        dominantText(s),
        s.clarity,
        hooksText(s),
      ]),
      [6, 7, 8, 9],
    ),
  )
  lines.push('')
  lines.push(
    `Session columns are the runs that start that session, of the target-panel runs. Play 5 change is the mean, over target-panel runs, of new signatures per 100 actions plus new action kinds, last session against first. Clarity is read only for prototypes that pass the gate.`,
  )
  return withFinalNewline(lines)
}

// ------------------------------------------------------------------- HOOKS
export function buildHooks(protos: readonly Prototype[]): string {
  const sorted = [...protos].sort((a, b) => cmp(a.key, b.key))
  const lines: string[] = []
  lines.push('# Hooks', '')
  lines.push(
    `A hook is a mechanic a prototype leans on: a score, a level, a timer, a win state, an unlock. ${GUESS_NOTE} What follows says whether the simulated children needed each hook to keep coming back; it draws no conclusion about the guidelines, which is for a person to draw.`,
    '',
  )
  lines.push('## The verdict rule (KTD7)', '')
  lines.push(
    `Each prototype that declares hooks is played on its target panel in several arms, each over the first ${T.HOOK_ARM_SESSIONS} sessions with the same personas and seeds: every hook on, every hook off, and one arm per hook with only that hook removed. The number compared is the share of runs that start session ${T.GATE_SESSION}.`,
    '',
  )
  lines.push(`- **${VERDICT_NEEDED}**: removing the hook lowers the session-${T.GATE_SESSION} return share by more than ${fixed(T.HOOK_NEEDED_DROP * 100, 0)} percentage points.`)
  lines.push(`- **${VERDICT_NOT_NEEDED}**: removing the hook changes the affordances or the signatures, and return does not drop by more than that.`)
  lines.push(
    `- **${VERDICT_INCONCLUSIVE}**: removing the hook leaves the affordances and signatures unchanged. Persona engagement follows learning progress and novelty, so it cannot register a reward.`,
  )
  lines.push('- **n/a: reason**: the hook is the loop itself, so it cannot be removed.')
  lines.push('')

  const withHooks = sorted.filter((p) => p.report.meta.hooks.length > 0)
  const withoutHooks = sorted.filter((p) => p.report.meta.hooks.length === 0)
  const rows: string[][] = []
  const tally = { needed: 0, notNeeded: 0, inconclusive: 0, notApplicable: 0 }
  for (const proto of withHooks) {
    const { hooks } = proto.report
    for (const name of proto.report.meta.hooks) {
      if (hooks.status === 'ran') {
        const arm = hooks.perHook?.[name]
        const verdict = arm?.verdict ?? 'no result'
        if (verdict === VERDICT_NEEDED) tally.needed++
        else if (verdict === VERDICT_NOT_NEEDED) tally.notNeeded++
        else if (verdict.startsWith('inconclusive')) tally.inconclusive++
        rows.push([
          `\`${proto.key}\``,
          `\`${name}\``,
          pct(hooks.baseline?.session3Share ?? 0, 1),
          arm ? pct(arm.session3Share, 1) : 'n/a',
          pct(hooks.allOff?.session3Share ?? 0, 1),
          arm ? (arm.changedAffordancesOrSignatures ? 'yes' : 'no') : 'n/a',
          verdict,
        ])
      } else {
        tally.notApplicable++
        rows.push([`\`${proto.key}\``, `\`${name}\``, 'n/a', 'n/a', 'n/a', 'n/a', hooks.status])
      }
    }
  }

  lines.push('## Ablation results', '')
  if (rows.length === 0) {
    lines.push('No prototype declares a hook.', '')
  } else {
    lines.push(
      ...table(
        [
          'Prototype',
          'Hook',
          `Session ${T.GATE_SESSION}, all hooks on`,
          `Session ${T.GATE_SESSION}, without this hook`,
          `Session ${T.GATE_SESSION}, all hooks off`,
          'Removal changed affordances or signatures',
          'Verdict',
        ],
        rows,
        [2, 3, 4],
      ),
    )
    lines.push('')
  }
  lines.push(`Prototypes with no hooks (${withoutHooks.length}): ${withoutHooks.length === 0 ? 'none' : withoutHooks.map((p) => `\`${p.key}\``).join(', ')}.`, '')
  lines.push('## Summary', '')
  lines.push(
    `${plural(rows.length, 'hook row')} across ${plural(withHooks.length, 'prototype')}: ${tally.needed} needed, ${tally.notNeeded} not needed, ${tally.inconclusive} inconclusive, ${tally.notApplicable} n/a.`,
  )
  return withFinalNewline(lines)
}

// -------------------------------------------------------------- INSTRUMENT
interface Fixture {
  meta: PanelProto['meta']
  createSim: PanelProto['createSim']
}

// The five fixtures instrument.test.ts freezes the thresholds against.
const POSITIVE_FIXTURES: readonly Fixture[] = [ladder, emergent]
const NEGATIVE_FIXTURES: readonly Fixture[] = [constant, noise, scoreOnly]

export interface FixtureResult {
  key: string
  expected: 'pass' | 'fail'
  pass: boolean
  share: number
  started: number
  runs: number
  meanRank: number
}

export interface InstrumentValidation {
  seed: number
  fixtures: FixtureResult[]
  // Fixture keys, best first.
  rankOrder: string[]
  // Both positives pass, all three negatives fail, and both positives outrank
  // every negative.
  holds: boolean
}

function fixtureRuns(fixture: Fixture, masterSeed: number): RunResult[] {
  const proto: PanelProto = { meta: fixture.meta, createSim: fixture.createSim }
  const runs: RunResult[] = []
  for (const persona of targetPanel(fixture.meta)) {
    for (let k = 0; k < T.NOISE_SEEDS; k++) {
      runs.push(playRun({ persona, proto, runSeed: masterRunSeed(masterSeed, k), seedIndex: k }))
    }
  }
  return runs
}

// Plays the five fixtures with the same functions instrument.test.ts calls.
export function validateInstrument(seed: number = T.DEFAULT_MASTER_SEED): InstrumentValidation {
  const cases: { fixture: Fixture; expected: 'pass' | 'fail' }[] = [
    ...POSITIVE_FIXTURES.map((fixture) => ({ fixture, expected: 'pass' as const })),
    ...NEGATIVE_FIXTURES.map((fixture) => ({ fixture, expected: 'fail' as const })),
  ]
  const played = cases.map(({ fixture, expected }) => {
    const runs = fixtureRuns(fixture, seed)
    return { key: fixture.meta.key, expected, verdict: gate(runs), signals: subSignals(runs) }
  })
  const ranked = rankScore(played.map((p) => ({ key: p.key, signals: p.signals })))
  const meanRank = new Map(ranked.map((r) => [r.key, r.meanRank]))
  const fixtures: FixtureResult[] = played.map((p) => ({
    key: p.key,
    expected: p.expected,
    pass: p.verdict.pass,
    share: p.verdict.share,
    started: p.verdict.started,
    runs: p.verdict.runs,
    meanRank: meanRank.get(p.key)!,
  }))
  const positives = fixtures.filter((f) => f.expected === 'pass')
  const negatives = fixtures.filter((f) => f.expected === 'fail')
  const holds =
    positives.every((f) => f.pass) &&
    negatives.every((f) => !f.pass) &&
    positives.every((p) => negatives.every((n) => p.meanRank > n.meanRank))
  return { seed, fixtures, rankOrder: ranked.map((r) => r.key), holds }
}

const PARAMETER_NOTES: Record<string, string> = {
  age: 'Kaia (4) is a documented child; Tess (5) is assumed.',
  touchJitter: 'Larger for younger children is the direction; the numbers are defaults.',
  attention: 'No attention spans are cited; shorter for younger children.',
  draw: 'Interest follows learning progress plus novelty (Kidd and Poli); the split between the two per persona is a default.',
  aimInvention: 'How readily a bored persona sets itself an aim.',
  returnPropensity: 'How readily the persona comes back after a session.',
  gestureMix: 'More taps and holds when young, more drags when older.',
  tempo: 'The gap between touches.',
  focus: 'How many affordances are weighed at once: "one or two clear functions" for the 3 to 4 row (Marsh et al. 2018); the 5 and up counts are defaults.',
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

function constantsTable(): string[] {
  const entries: [string, number | string][] = []
  for (const [name, value] of Object.entries(T)) {
    if (typeof value === 'number' || typeof value === 'string') entries.push([name, value])
  }
  entries.sort((a, b) => cmp(a[0], b[0]))
  return table(['Constant', 'Value'], entries.map(([name, value]) => [`\`${name}\``, `\`${value}\``]))
}

export function buildInstrument(validation: InstrumentValidation, summaries: readonly Summary[]): string {
  const lines: string[] = []
  lines.push('# Instrument', '')
  lines.push(`${GUESS_NOTE} This file records how the panel was built, what it was checked against, and what it can and cannot say. Version \`${T.THRESHOLDS_VERSION}\`, master seed ${T.DEFAULT_MASTER_SEED}.`, '')

  lines.push('## Frozen thresholds', '')
  lines.push(
    'The thresholds were chosen against the five fixtures below, then frozen before any real prototype was scored. Changing one means bumping the version, rerunning the fixture check, and recording the new values. In plain words:',
    '',
  )
  lines.push(`- **Depth gate:** a prototype passes when at least ${pct(T.GATE_SHARE)} of its target-panel runs start session ${T.GATE_SESSION}. The target panel is the personas within ${plural(T.PANEL_MARGIN_YEARS, 'year')} of the age band, widened to the nearest ${T.PANEL_MIN_PERSONAS} when fewer fall in.`)
  lines.push(
    `- **Panel shape:** ${plural(PERSONAS.length, 'persona')}, ${plural(T.NOISE_SEEDS, 'noise seed')} each, up to ${T.SESSIONS} sessions per run, each capped at ${T.SESSION_CAP_TICKS} ticks (${fixed((T.SESSION_CAP_TICKS * TICK_MS) / 60000, 1)} sim-minutes at ${TICK_MS} ms a tick). Every session builds a fresh sim, so an unlock or level hook restarts each session.`,
  )
  lines.push(
    `- **Clarity:** read only for prototypes that pass the gate. The first ten seconds (${T.FIRST_TEN_TICKS} ticks) are played cue-blind, ignoring the affordance list. It reads low when fewer than ${pct(T.CLARITY_MIN_SHARE)} of touches change the sim, or the first change comes later than tick ${T.CLARITY_MAX_FIRST_TICK}.`,
  )
  lines.push(
    `- **Dominant strategy:** repeat-one or greedy beats random on the objective by more than ${pct(T.DOMINANT_MARGIN)} of its spread while its outcome variety falls to ${pct(T.DOMINANT_COLLAPSE)} of random's or less.`,
  )
  lines.push(`- **Hook verdict:** a hook is \`${VERDICT_NEEDED}\` when removing it lowers the session-${T.GATE_SESSION} return share by more than ${fixed(T.HOOK_NEEDED_DROP * 100, 0)} percentage points (${T.HOOK_ARM_SESSIONS} sessions played per arm).`)
  lines.push('', '### Every constant', '', ...constantsTable(), '')

  lines.push('## Personas', '')
  lines.push(
    'Kaia is the only documented child. The age of Tess is an assumption: the Pebble Table plan describes the trial cohort as 4 to 6 year olds and records no age, so 5 is a guess to correct in `personas.ts`. The other six are archetypes whose traits vary independently of age.',
    '',
  )
  lines.push(
    ...table(
      ['Persona', 'Age', 'Touch jitter (px)', 'Attention (ticks)', 'Novelty', 'Mastery', 'Aim invention', 'Return propensity'],
      PERSONAS.map((p) => [
        `\`${p.id}\` ${p.name}`,
        String(p.age),
        String(p.touchJitter),
        String(p.attention),
        String(p.draw.novelty),
        String(p.draw.mastery),
        String(p.aimInvention),
        String(p.returnPropensity),
      ]),
      [1, 2, 3, 4, 5, 6, 7],
    ),
  )
  lines.push('', 'Every parameter is labelled `research` when the age-band cue table supports it, `default` when an agent or owner chose the number:', '')
  const parameters = [...new Set(PERSONAS.flatMap((p) => Object.keys(p.provenance)))]
  lines.push(
    ...table(
      ['Parameter', 'Label', 'Note'],
      parameters.map((name) => {
        const labels = (['research', 'default'] as const).filter((l) => PERSONAS.some((p) => (p.provenance[name] ?? 'default') === l))
        const label =
          labels.length === 1
            ? labels[0]!
            : labels
                .map((l) => `${l} for ${PERSONAS.filter((p) => (p.provenance[name] ?? 'default') === l).map((p) => `${p.id} (${p.age})`).join(', ')}`)
                .join('; ')
        return [`\`${name}\``, label, PARAMETER_NOTES[name] ?? '']
      }),
    ),
  )
  lines.push('')

  lines.push('## Instrument validation', '')
  lines.push(
    `The panel was played on five fixtures whose depth is known (master seed ${validation.seed}, computed when this file was written). Two must pass the gate, three must fail it, and both passing ones must outrank all three failing ones on the mean sub-signal rank. **${validation.holds ? 'The check holds.' : 'The check does not hold.'}**`,
    '',
  )
  lines.push(
    ...table(
      ['Fixture', 'Expected', 'Gate', `Runs starting session ${T.GATE_SESSION}`, 'Share', 'Mean rank'],
      [...validation.fixtures]
        .sort((a, b) => validation.rankOrder.indexOf(a.key) - validation.rankOrder.indexOf(b.key))
        .map((f) => [`\`${f.key}\``, f.expected, f.pass ? 'pass' : 'fail', `${f.started} of ${f.runs}`, pct(f.share, 1), fixed(f.meanRank, 2)]),
      [3, 4, 5],
    ),
  )
  lines.push('', `Rank order, best first: ${validation.rankOrder.map((k) => `\`${k}\``).join(', ')}.`, '')

  lines.push('## Calibration', '')
  const positiveShares = validation.fixtures.filter((f) => f.expected === 'pass').map((f) => f.share)
  const realShares = summaries.map((s) => s.shares.s3)
  if (realShares.length > 0 && positiveShares.length > 0) {
    const med = median(realShares)
    lines.push(
      `- The passing fixtures are engineered to hold a simulated child: they reach session ${T.GATE_SESSION} in ${pct(Math.min(...positiveShares))} to ${pct(Math.max(...positiveShares))} of target-panel runs. The ${plural(realShares.length, 'real prototype')} in this run reach it in ${pct(Math.min(...realShares))} to ${pct(Math.max(...realShares))} (median ${pct(med)}).${med < Math.min(...positiveShares) ? ' Real prototypes sit well below the engineered fixtures.' : ''}`,
    )
  } else {
    lines.push('- No prototype reports were included, so there is no real-prototype figure to set beside the fixtures.')
  }
  lines.push('- So absolute rates are not comparable to the fixtures, nor to any real child. The ranking among prototypes is the meaningful part.')
  lines.push(
    `- **What the gate is evidence of:** simulated children of the target ages, weighing new things against getting better at something, kept coming back to this loop for a third session at least half the time. A loop that keeps offering something new or learnable to that simple model passes.`,
  )
  lines.push(
    '- **What it is not evidence of:** that a real child comes back, enjoys the loop, or understands it. It does not measure fun, sessions restart the sim fresh so depth that builds up across visits is undercounted, and a fail may mean the personas did not find the depth rather than that none is there. Only real children can check any of it.',
  )
  return withFinalNewline(lines)
}
