import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { IMPORTERS, routeImport } from './import.ts'
import { JURISDICTIONS } from './schema.ts'

// Only the routing of the arguments is tested: no importer is run here.

describe('the routing of education:import', () => {
  it('with no argument, runs the California importer and then the Dutch one, each without arguments', () => {
    expect(routeImport([])).toEqual({
      runs: [
        { jurisdiction: 'us-ca', script: 'import-california.ts', args: [] },
        { jurisdiction: 'nl', script: 'import-netherlands.ts', args: [] },
      ],
    })
  })

  it('a California lane goes to the California importer alone, as <level>/<subject>', () => {
    expect(routeImport(['--lane', 'us-ca/kindergarten/mathematics'])).toEqual({
      runs: [{ jurisdiction: 'us-ca', script: 'import-california.ts', args: ['--lane', 'kindergarten/mathematics'] }],
    })
  })

  it('a Dutch lane goes to the Dutch importer alone, as <level>/<subject>', () => {
    expect(routeImport(['--lane', 'nl/einde-po/mathematics'])).toEqual({
      runs: [{ jurisdiction: 'nl', script: 'import-netherlands.ts', args: ['--lane', 'einde-po/mathematics'] }],
    })
  })

  it('a lane without its jurisdiction goes to the importer its level belongs to', () => {
    expect(routeImport(['--lane', 'grade-4/science'])).toEqual({ runs: [{ jurisdiction: 'us-ca', script: 'import-california.ts', args: ['--lane', 'grade-4/science'] }] })
    expect(routeImport(['--lane', 'fase-2/reading-language'])).toEqual({ runs: [{ jurisdiction: 'nl', script: 'import-netherlands.ts', args: ['--lane', 'fase-2/reading-language'] }] })
  })

  it('a lane that names a level of the other jurisdiction, an unknown level or an unknown subject is refused, and nothing runs', () => {
    expect(routeImport(['--lane', 'us-ca/fase-1/mathematics'])).toEqual({ error: expect.stringContaining('a level of nl, not of us-ca') })
    expect(routeImport(['--lane', 'nl/kindergarten/mathematics'])).toEqual({ error: expect.stringContaining('a level of us-ca, not of nl') })
    expect(routeImport(['--lane', 'grade-3/mathematics'])).toEqual({ error: expect.stringContaining('grade-3') })
    expect(routeImport(['--lane', 'ca/kindergarten/mathematics'])).toEqual({ error: expect.stringContaining('jurisdiction') })
    expect(routeImport(['--lane', 'kindergarten/maths'])).toEqual({ error: expect.stringContaining('subject') })
    expect(routeImport(['--lane', 'kindergarten'])).toEqual({ error: expect.stringContaining('--lane') })
  })

  it('anything else on the command line is refused', () => {
    expect(routeImport(['--lane'])).toEqual({ error: '--lane needs a value' })
    expect(routeImport(['--only', 'x'])).toEqual({ error: '--only is not an option' })
    expect(routeImport(['--lane', 'grade-4/science', '--lane', 'fase-1/science'])).toEqual({ error: expect.stringContaining('too many') })
  })

  it('every jurisdiction has an importer file, and the npm script runs this entry and nothing else', () => {
    for (const jurisdiction of JURISDICTIONS) expect(existsSync(join(import.meta.dirname, IMPORTERS[jurisdiction]))).toBe(true)
    const scripts = (JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts
    expect(scripts['education:import']).toBe('node education/tools/import.ts')
  })
})
