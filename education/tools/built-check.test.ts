import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanBuilt } from './built-check.ts'

// A throwaway repo root holding the given files.
function fixture(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'education-built-')))
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  return root
}

const CLEAN = { 'dist/index.html': '<!doctype html><title>Tada Jam</title>\n', 'dist/lab/arcade/catalog.json': '{"groups":[]}\n' }

describe('the built-output check', () => {
  it('passes a build with no pack content', () => {
    expect(scanBuilt(join(fixture(CLEAN), 'dist'))).toEqual([])
  })

  it('fails on a built file that holds a pack record id, and names the file', () => {
    const root = fixture({
      ...CLEAN,
      'dist/assets/index-abc.js': 'const goal="edu.us-ca.grade-1.mathematics.1-oa-1";\n',
      'dist/lab/assets/demo.json': '{"cites":["edu.nl.po.rekenen.kerndoel-23"]}\n',
    })
    expect(scanBuilt(join(root, 'dist'))).toEqual([
      { file: 'assets/index-abc.js', rule: 'pack-record-id', match: 'edu.us-ca.grade-1.mathematics.1-oa-1' },
      { file: 'lab/assets/demo.json', rule: 'pack-record-id', match: 'edu.nl.po.rekenen.kerndoel-23' },
    ])
  })

  it('does not take a host name ending in edu.nl for a record id', () => {
    const root = fixture({ ...CLEAN, 'dist/assets/vendor.js': '// see docs.example-edu.nl.example and www.edu.nl/path\n' })
    expect(scanBuilt(join(root, 'dist'))).toEqual([])
  })

  it('fails on any built path with an education segment', () => {
    const root = fixture({ ...CLEAN, 'dist/lab/education/README.md': '# Pack\n' })
    expect(scanBuilt(join(root, 'dist'))).toEqual([{ file: 'lab/education', rule: 'pack-path', match: 'education' }])
  })

  it('fails with no dist/ at all and says to build first', () => {
    const root = fixture({ 'README.md': '# Jam\n' })
    expect(scanBuilt(join(root, 'dist'))).toEqual([{ file: 'dist', rule: 'missing-build', match: 'run npm run build first' }])
  })

  it('exits non-zero from the command line until a clean dist/ exists', () => {
    const root = fixture({ 'package.json': '{"type":"module"}\n' })
    const script = join(root, 'education', 'tools', 'built-check.ts')
    mkdirSync(dirname(script), { recursive: true })
    copyFileSync(join(import.meta.dirname, 'built-check.ts'), script)

    const missing = spawnSync(process.execPath, [script], { encoding: 'utf8' })
    expect(missing.status).toBe(1)
    expect(missing.stderr).toContain('run npm run build first')

    mkdirSync(join(root, 'dist'))
    writeFileSync(join(root, 'dist', 'index.html'), CLEAN['dist/index.html'])
    const clean = spawnSync(process.execPath, [script], { encoding: 'utf8' })
    expect(clean.stderr).toBe('')
    expect(clean.status).toBe(0)
  })
})
