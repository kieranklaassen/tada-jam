import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GATE_STEPS, NO_STORE_FLAG, gateSteps, gateSummary, runGate, type GateStep } from './gate.ts'

// The steps are not run here: one needs the wording store, and each of the
// others reads the whole tree, which CI does in a step of its own
// (`npm run education:tree`). What the gate is made of and how it runs its
// steps is tested, with a runner that stands in for the processes.

const command = (step: GateStep): string => [step.script, ...step.args].join(' ')

function collect(): { lines: string[]; errors: string[]; out: { log: (line: string) => void; error: (line: string) => void } } {
  const lines: string[] = []
  const errors: string[] = []
  return { lines, errors, out: { log: (line) => lines.push(line), error: (line) => errors.push(line) } }
}

describe('the gate of the whole tree', () => {
  it('runs the final gate of the second check, then the checks of the frames, the frame texts and the coverage report', () => {
    expect(GATE_STEPS.map(command)).toEqual(['review-join.ts --gate', 'frames.ts --check', 'frame-texts.ts --check', 'coverage.ts --check'])
    for (const step of GATE_STEPS) expect(existsSync(join(import.meta.dirname, step.script))).toBe(true)
    expect(gateSteps(false)).toEqual(GATE_STEPS)
  })

  it('without the store runs every step but the frame texts, in the same order', () => {
    expect(gateSteps(true).map(command)).toEqual(['review-join.ts --gate', 'frames.ts --check', 'coverage.ts --check'])
    expect(GATE_STEPS.filter((step) => step.needsStore).map((step) => step.script)).toEqual(['frame-texts.ts'])
  })

  it('says which checks failed and which passed', () => {
    expect(gateSummary([{ name: 'second check', passed: true }, { name: 'frames', passed: true }])).toBe('education gate passed: second check, frames')
    expect(gateSummary([{ name: 'second check', passed: false }, { name: 'frames', passed: true }, { name: 'coverage report', passed: false }])).toBe('education gate failed: second check, coverage report (passed: frames)')
    expect(gateSummary([{ name: 'second check', passed: false }])).toBe('education gate failed: second check')
  })

  it('runs every step in order and exits 0 when all pass', () => {
    const ran: string[] = []
    const { lines, errors, out } = collect()
    const status = runGate(GATE_STEPS, (step) => { ran.push(step.name); return true }, out)
    expect(status).toBe(0)
    expect(ran).toEqual(['second check', 'frames', 'frame texts', 'coverage report'])
    expect(lines.at(-1)).toBe('\neducation gate passed: second check, frames, frame texts, coverage report')
    expect(lines).toContain('\n== frames: node education/tools/frames.ts --check')
    expect(errors).toEqual([])
  })

  it.each(GATE_STEPS.map((step) => step.name))('still runs every step after "%s" has failed, and exits 1', (failing) => {
    const ran: string[] = []
    const { errors, out } = collect()
    const status = runGate(GATE_STEPS, (step) => { ran.push(step.name); return step.name !== failing }, out)
    expect(status).toBe(1)
    expect(ran).toEqual(GATE_STEPS.map((step) => step.name))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain(`education gate failed: ${failing}`)
  })

  it('exits 1 when every step failed, and names them all', () => {
    const { errors, out } = collect()
    expect(runGate(gateSteps(true), () => false, out)).toBe(1)
    expect(errors).toEqual(['\neducation gate failed: second check, frames, coverage report'])
  })

  it('has two scripts: the whole gate, and the three store-free steps that CI runs after the check', () => {
    const root = join(import.meta.dirname, '..', '..')
    const scripts = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts
    expect(scripts['education:gate']).toBe('node education/tools/gate.ts')
    expect(scripts['education:tree']).toBe(`node education/tools/gate.ts ${NO_STORE_FLAG}`)
    // The check is the typecheck and the tests only; the tree is a step of its own.
    for (const name of ['education:check', 'education:test', 'education:typecheck']) expect(scripts[name]).not.toMatch(/gate|education:tree/)

    // CI runs the check and then the store-free steps, and never the whole gate.
    const ci = readFileSync(join(root, '.github', 'workflows', 'ci.yml'), 'utf8')
    const runs = [...ci.matchAll(/^\s*run:\s*(.+)$/gm)].map((match) => match[1]!.trim())
    expect(runs).toContain('npm run education:tree')
    expect(runs.indexOf('npm run education:tree')).toBeGreaterThan(runs.indexOf('npm run education:check'))
    expect(runs.some((run) => /education:gate\b/.test(run))).toBe(false)
  })
})
