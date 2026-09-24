// The findings block and the known weaknesses of each SPEC.md, and the check
// that a spec has every R8 field. Part of the report generator (report.ts).

import {
  BLOCKED,
  CLEAR,
  FINDINGS_END,
  FINDINGS_START,
  GUESS_NOTE,
  NOT_ASSESSED,
  SPEC_MAX_LINES,
  WEAKNESSES_HEADING,
  clarityReason,
  clip,
  cmp,
  fixed,
  pct,
  plural,
  points,
  ticksText,
  withFinalNewline,
} from './report-shape.ts'
import type { PanelReport } from './report-shape.ts'
import { VERDICT_NEEDED } from './metrics.ts'
import type { ClarityMeasure } from './metrics.ts'
import { PERSONAS } from './personas.ts'
import * as T from './thresholds.ts'
import type { CrashRecord } from './types.ts'

// -------------------------------------------------------------------- SPEC
function lineCount(text: string): number {
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
}

function personaLeftFirst(report: PanelReport): string | null {
  const inPanel = Object.entries(report.measures.perPersona)
    .filter(([, m]) => m.inTargetPanel)
    .map(([id, m]) => ({ id, mean: m.sessionsStartedMean }))
  if (inPanel.length < 2) return null
  const lowest = Math.min(...inPanel.map((p) => p.mean))
  const highest = Math.max(...inPanel.map((p) => p.mean))
  if (lowest === highest) return null
  const first = inPanel.filter((p) => p.mean === lowest).map((p) => p.id).sort(cmp)
  const shown = first.slice(0, 3).map((id) => `\`${id}\``)
  const who = first.length > 3 ? `${shown.join(', ')} and ${first.length - 3} more` : shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}` : shown[0]!
  return `${who}, starting ${fixed(lowest, 1)} of ${T.SESSIONS} sessions on average (the best in the target panel starts ${fixed(highest, 1)}).`
}

function crashText(crash: CrashRecord): string {
  return `${crash.where}, persona ${crash.persona}, seed ${crash.seedIndex}, tick ${crash.tick}: ${clip(crash.message, 90)}`
}

// Panel personas in roster order, so the text does not depend on the order a
// report happens to list them in.
function panelText(ids: readonly string[]): string {
  const roster = PERSONAS.map((p) => p.id)
  const at = (id: string): number => (roster.includes(id) ? roster.indexOf(id) : roster.length)
  return [...ids].sort((a, b) => at(a) - at(b) || cmp(a, b)).join(', ')
}

function measureText(clarity: ClarityMeasure): string {
  const first = clarity.ticksToFirstChange === null ? 'no run changed anything' : `first change at ${ticksText(clarity.ticksToFirstChange)} on average`
  return `${pct(clarity.changedShare)} of ${clarity.touches} cue-blind touches changed the sim, ${first}, ${plural(clarity.distinctKinds, 'action kind')} tried`
}

export function findingsLines(report: PanelReport, compact = false): string[] {
  const measures = report.measures.targetPanel
  const runs = report.gate.runs
  const counts = {
    s3: Math.round(measures.returnShare.session3 * runs),
    s4: Math.round(measures.returnShare.session4 * runs),
    s5: Math.round(measures.returnShare.session5 * runs),
  }
  const lines: string[] = []
  lines.push(`_${GUESS_NOTE} Target panel: ${panelText(report.targetPanel)} (${plural(runs, 'run')}). Thresholds ${report.thresholdsVersion}, master seed ${report.seed}._`, '')
  lines.push(
    `- **Depth gate:** ${report.gate.pass ? 'pass' : 'fail'}. ${report.gate.started} of ${runs} runs (${pct(report.gate.share)}) start session ${T.GATE_SESSION}; the line is ${pct(T.GATE_SHARE)}. Runs starting session 3, 4, 5: ${counts.s3}, ${counts.s4}, ${counts.s5} of ${runs}.`,
  )
  const play = measures.play5
  lines.push(
    `- **Play 5 against play 1:** change ${fixed(play.change, 2)}${compact ? '' : ` (${fixed(play.newSignaturesPer100Actions, 2)} new signatures per 100 actions plus ${fixed(play.kindGrowth, 2)} new action kinds)`}.`,
  )
  const features = measures.aims.features.length > 0 && !compact ? ` Tried: ${measures.aims.features.join(', ')}.` : ''
  lines.push(`- **Self-set aims:** ${measures.aims.adopted} adopted, ${measures.aims.madeProgress} made progress.${features}`)
  if (!report.gate.pass) {
    lines.push(`- **First 10 seconds:** ${NOT_ASSESSED}.`)
  } else if (measures.clarity.flag === 'low') {
    lines.push(`- **First 10 seconds:** ${BLOCKED}. ${clarityReason(measures.clarity)}.${compact ? '' : ` (${measureText(measures.clarity)}.)`}`)
  } else {
    lines.push(`- **First 10 seconds:** ${CLEAR}. ${measureText(measures.clarity)}.`)
  }
  const selfPlay = report.selfPlay
  const objective = selfPlay.objective ? `objective ${selfPlay.objective.name} ${selfPlay.objective.dir}` : 'no objective declared, variety only'
  const policies = Object.keys(selfPlay.policies)
    .sort(cmp)
    .map((name) => `${name} ${fixed(selfPlay.policies[name]!.variety, 2)}`)
    .join(', ')
  lines.push(
    `- **Self-play:** ${objective}; outcome variety ${fixed(selfPlay.overallVariety, 2)} bits${compact || policies === '' ? '' : ` (by policy: ${policies})`}. Dominant strategy: ${selfPlay.dominant.flagged ? `yes, ${selfPlay.dominant.note}` : `no (${selfPlay.dominant.note})`}.`,
  )
  const { hooks } = report
  if (hooks.status === 'none declared') {
    lines.push('- **Hook flags:** none declared.')
  } else if (hooks.status !== 'ran') {
    lines.push(`- **Hook flags:** ${hooks.declared.map((h) => `\`${h}\``).join(', ')}: ${hooks.status}.`)
  } else {
    lines.push(
      `- **Hook flags** (raw material for the guidelines; session ${T.GATE_SESSION} return ${pct(hooks.baseline?.session3Share ?? 0, 1)} with every hook on, ${pct(hooks.allOff?.session3Share ?? 0, 1)} with all off):`,
    )
    const perHook = hooks.declared.map((name) => {
      const arm = hooks.perHook?.[name]
      return `\`${name}\`: ${arm ? `${arm.verdict}; without it ${pct(arm.session3Share, 1)}` : 'no result'}`
    })
    if (compact) lines[lines.length - 1] += ` ${perHook.join(' / ')}`
    else lines.push(...perHook.map((h) => `  - ${h}`))
  }
  if (report.crashes.length === 0) {
    lines.push('- **Crashes:** none.')
  } else {
    lines.push(`- **Crashes:** ${report.crashes.length}. First: ${crashText(report.crashes[0]!)}`)
  }
  return lines
}

export function weaknessLines(report: PanelReport): string[] {
  const measures = report.measures.targetPanel
  const runs = report.gate.runs
  const lines: string[] = []
  if (!report.gate.pass) {
    const needed = Math.ceil(T.GATE_SHARE * runs - 1e-9)
    lines.push(
      `- Fails the depth gate: ${report.gate.started} of ${runs} target-panel runs (${pct(report.gate.share)}) start session ${T.GATE_SESSION}, ${points(T.GATE_SHARE - report.gate.share)} short of the ${pct(T.GATE_SHARE)} line (${plural(Math.max(0, needed - report.gate.started), 'more run')} needed).`,
    )
  }
  if (report.gate.pass && measures.clarity.flag === 'low') {
    lines.push(`- Blocked for polish on clarity: ${clarityReason(measures.clarity)}.`)
  }
  if (report.selfPlay.dominant.flagged) {
    lines.push(`- Dominant strategy in self-play: ${report.selfPlay.dominant.note}.`)
  }
  const { hooks } = report
  if (hooks.status === 'ran') {
    const inconclusive = hooks.declared.filter((h) => (hooks.perHook?.[h]?.verdict ?? '').startsWith('inconclusive'))
    if (inconclusive.length > 0) {
      lines.push(`- Hook ablation says little for ${inconclusive.map((h) => `\`${h}\``).join(', ')}: removing ${inconclusive.length === 1 ? 'it' : 'them'} changed nothing the personas can register.`)
    }
    for (const name of hooks.declared) {
      const arm = hooks.perHook?.[name]
      if (arm?.verdict === VERDICT_NEEDED) {
        lines.push(`- Leans on hook \`${name}\`: removing it drops session-${T.GATE_SESSION} return from ${pct(hooks.baseline?.session3Share ?? 0, 1)} to ${pct(arm.session3Share, 1)}.`)
      }
    }
  } else if (hooks.status !== 'none declared') {
    lines.push(`- Hooks could not be ablated (${hooks.declared.map((h) => `\`${h}\``).join(', ')}): ${hooks.status}.`)
  }
  if (report.crashes.length > 0) {
    lines.push(`- Crashed ${plural(report.crashes.length, 'time')} during the panel; first: ${crashText(report.crashes[0]!)}`)
  }
  if (measures.aims.adopted === 0) {
    lines.push('- No persona set itself an aim, so the self-set aims signal is empty.')
  } else if (measures.aims.madeProgress === 0) {
    lines.push(`- No self-set aim made progress (0 of ${measures.aims.adopted} adopted).`)
  }
  if (measures.play5.change === 0) {
    lines.push('- Play 5 shows no measured change from play 1: no new signatures and no new action kinds.')
  }
  const left = personaLeftFirst(report)
  if (left) lines.push(`- Left first: ${left}`)
  if (lines.length === 0) lines.push('- The panel measures found none. Real children have not played it.')
  return lines
}

function findLine(lines: readonly string[], text: string): number {
  return lines.findIndex((l) => l.trim() === text)
}

export type SpecForm = 'auto' | 'full' | 'compact'

// Replaces only the text between the findings markers and the body of the
// Known weaknesses section. Everything else, including later sections, is kept.
// `auto` uses the full findings and falls back to the compact form when the
// spec would otherwise run past the line limit.
export function fillSpec(spec: string, report: PanelReport, form: SpecForm = 'auto'): string {
  const compact = form === 'compact'
  const lines = spec.replace(/\s+$/, '').split('\n')
  const start = findLine(lines, FINDINGS_START)
  const end = findLine(lines, FINDINGS_END)
  if (start < 0 || end < 0 || end < start) throw new Error(`SPEC.md for ${report.key} needs ${FINDINGS_START} and ${FINDINGS_END} markers, in that order`)
  const withFindings = [...lines.slice(0, start + 1), ...findingsLines(report, compact), ...lines.slice(end)]
  const heading = withFindings.findIndex((l) => l.trimEnd() === WEAKNESSES_HEADING)
  if (heading < 0) throw new Error(`SPEC.md for ${report.key} needs a "${WEAKNESSES_HEADING}" section`)
  let next = withFindings.length
  for (let i = heading + 1; i < withFindings.length; i++) {
    if (/^## /.test(withFindings[i]!)) {
      next = i
      break
    }
  }
  const out = [
    ...withFindings.slice(0, heading + 1),
    '',
    ...weaknessLines(report),
    ...(next < withFindings.length ? [''] : []),
    ...withFindings.slice(next),
  ]
  const text = withFinalNewline(out)
  if (form === 'auto' && lineCount(text) > SPEC_MAX_LINES) return fillSpec(spec, report, 'compact')
  return text
}

function sectionBody(lines: readonly string[], heading: string): string[] {
  const at = lines.findIndex((l) => l.trimEnd() === heading)
  if (at < 0) return []
  const body: string[] = []
  for (let i = at + 1; i < lines.length && !/^## /.test(lines[i]!); i++) body.push(lines[i]!)
  return body
}

function hasText(lines: readonly string[]): boolean {
  return lines.some((l) => l.trim() !== '')
}

// The R8 fields every finished spec has: verb, depth engine, what should (and
// did) vary on repeat play, the persona and self-play findings, and the known
// weaknesses. `generated` also requires the findings and weaknesses to be
// filled in, not placeholders. Returns one message per defect.
export function checkSpec(spec: string, key: string, options: { generated: boolean; report?: PanelReport } = { generated: false }): string[] {
  const problems: string[] = []
  const lines = spec.split('\n')
  const field = (name: string): string | null => {
    const found = lines.find((l) => l.startsWith(`- **${name}:**`))
    return found ? found.slice(`- **${name}:**`.length).trim() : null
  }
  for (const name of ['Verb', 'Depth engine', 'Age band', 'Lens', 'Hooks declared']) {
    if (!field(name)) problems.push(`${key}: SPEC.md has no "${name}" field`)
  }
  const verb = field('Verb')
  const engine = field('Depth engine')
  if (options.report) {
    if (verb && !verb.includes(options.report.meta.verb)) problems.push(`${key}: SPEC.md verb "${verb}" does not match the prototype's "${options.report.meta.verb}"`)
    if (engine && !engine.includes(options.report.meta.engine)) problems.push(`${key}: SPEC.md engine "${engine}" does not match the prototype's "${options.report.meta.engine}"`)
  }
  if (!hasText(sectionBody(lines, '## Loop'))) problems.push(`${key}: SPEC.md has no "## Loop" section`)
  if (!hasText(sectionBody(lines, '## What should vary on repeat play'))) problems.push(`${key}: SPEC.md has no "## What should vary on repeat play" section`)
  const start = findLine(lines, FINDINGS_START)
  const end = findLine(lines, FINDINGS_END)
  if (findLine(lines, '## Findings') < 0) problems.push(`${key}: SPEC.md has no "## Findings" section`)
  if (start < 0 || end < 0 || end < start) {
    problems.push(`${key}: SPEC.md is missing the findings markers`)
  } else if (options.generated) {
    const findings = lines.slice(start + 1, end).join('\n')
    for (const [label, text] of [
      ['the depth gate result', '**Depth gate:**'],
      ['the play 5 change', '**Play 5 against play 1:**'],
      ['the self-set aims', '**Self-set aims:**'],
      ['the first-10-seconds clarity', '**First 10 seconds:**'],
      ['the self-play findings', '**Self-play:**'],
      ['the hook flags', '**Hook flags'],
      ['the crashes', '**Crashes:**'],
      ['the note that personas are model guesses', 'model guesses'],
    ] as const) {
      if (!findings.includes(text)) problems.push(`${key}: SPEC.md findings lack ${label}`)
    }
    if (/^- \*\*First 10 seconds:\*\* (clear|blocked-for-polish)/m.test(findings) && options.report && !options.report.gate.pass) {
      problems.push(`${key}: SPEC.md states clarity for a prototype that did not pass the depth gate`)
    }
  }
  const weaknesses = sectionBody(lines, WEAKNESSES_HEADING)
  if (!hasText(weaknesses)) {
    problems.push(`${key}: SPEC.md has no "${WEAKNESSES_HEADING}" section`)
  } else if (options.generated && weaknesses.some((l) => l.includes('_Filled after the panel run._'))) {
    problems.push(`${key}: SPEC.md known weaknesses are still the placeholder`)
  }
  if (lineCount(spec) > SPEC_MAX_LINES) problems.push(`${key}: SPEC.md runs to ${lineCount(spec)} lines; the limit is ${SPEC_MAX_LINES}`)
  return problems
}
