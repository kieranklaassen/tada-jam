// The checks of the whole tree that the corpus has to pass before it is
// pushed as checked, run one after another (`npm run education:gate`):
//
//   1. the final gate of the second check    node education/tools/review-join.ts --gate
//   2. every frame is as the manifest gives  node education/tools/frames.ts --check
//   3. the texts the Dutch frames quote are  node education/tools/frame-texts.ts --check
//      as the pinned sources print them
//   4. the coverage report is up to date     node education/tools/coverage.ts --check
//
// Every check runs, also after one has failed, so one run shows all that is
// wrong; the command fails when any of them did.
//
// Only the third check cannot run without the wording store: it reads the
// pinned sources. With `--no-store` the gate runs the other three, which read
// the repo alone (`npm run education:tree`). CI has no store and runs that
// form after `npm run education:check`, so a stale or unchecked record, a
// frame edited by hand or a coverage report out of date fails there. The full
// gate is run by hand before a push: on a machine with the store its first
// check also looks up the place of each script-matched verdict, and fails
// when one cannot be looked up.
//
// The list and the runner are exported for gate.test.ts.

import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface GateStep {
  name: string
  // The tool under tools/, and its arguments.
  script: string
  args: readonly string[]
  // True for a check that cannot run without the wording store.
  needsStore?: boolean
}

export const GATE_STEPS: readonly GateStep[] = [
  { name: 'second check', script: 'review-join.ts', args: ['--gate'] },
  { name: 'frames', script: 'frames.ts', args: ['--check'] },
  { name: 'frame texts', script: 'frame-texts.ts', args: ['--check'], needsStore: true },
  { name: 'coverage report', script: 'coverage.ts', args: ['--check'] },
]

// The flag that leaves out the checks that need the store.
export const NO_STORE_FLAG = '--no-store'

// The steps of a run: all of them, or without the store those that read the
// repo alone.
export function gateSteps(noStore: boolean): readonly GateStep[] {
  return noStore ? GATE_STEPS.filter((step) => !step.needsStore) : GATE_STEPS
}

// The last line of the gate: which checks passed and which failed.
export function gateSummary(results: readonly { name: string; passed: boolean }[]): string {
  const failed = results.filter((result) => !result.passed).map((result) => result.name)
  const passed = results.filter((result) => result.passed).map((result) => result.name)
  if (failed.length === 0) return `education gate passed: ${passed.join(', ')}`
  return `education gate failed: ${failed.join(', ')}${passed.length === 0 ? '' : ` (passed: ${passed.join(', ')})`}`
}

export interface GateOutput {
  log: (line: string) => void
  error: (line: string) => void
}

// Runs every step in order, also after one has failed, prints the summary,
// and gives the exit status: 1 when any step failed. `run` says whether one
// step passed.
export function runGate(steps: readonly GateStep[], run: (step: GateStep) => boolean, out: GateOutput = console): number {
  const results = steps.map((step) => {
    out.log(`\n== ${step.name}: node education/tools/${[step.script, ...step.args].join(' ')}`)
    return { name: step.name, passed: run(step) }
  })
  const summary = gateSummary(results)
  if (results.every((result) => result.passed)) {
    out.log(`\n${summary}`)
    return 0
  }
  out.error(`\n${summary}`)
  return 1
}

// One step as its own process, its output passed through.
function spawnStep(step: GateStep): boolean {
  const done = spawnSync(process.execPath, [join(import.meta.dirname, step.script), ...step.args], { stdio: 'inherit' })
  if (done.error) throw done.error
  return done.status === 0
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== NO_STORE_FLAG) || args.length > 1) {
    console.error(`usage: node education/tools/gate.ts [${NO_STORE_FLAG}]`)
    process.exit(2)
  }
  process.exit(runGate(gateSteps(args.includes(NO_STORE_FLAG)), spawnStep))
}
