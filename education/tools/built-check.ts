// Built-output check for the education pack: nothing from the pack may be in
// the published build.
//
//   node education/tools/built-check.ts   scan dist/ (run `npm run build` first)
//
// The isolation test stops imports, but a build can also write files by reading
// disk, so the built output is scanned as well. A finding is a built file whose
// text holds a pack record id, or a built path with an `education` segment. The
// scanner core is exported so built-check.test.ts can prove it flags what it
// claims to flag.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export type Finding = { file: string; rule: string; match: string }

// Pack record ids start with `edu.us-ca.` or `edu.nl.`. The lookbehind keeps a
// host name such as `www.edu.nl` from counting as one.
const RECORD_ID = /(?<![A-Za-z0-9.-])edu\.(?:us-ca|nl)\.[a-z0-9][a-z0-9.-]*/

export function scanBuilt(dist: string): Finding[] {
  if (!existsSync(dist)) return [{ file: 'dist', rule: 'missing-build', match: 'run npm run build first' }]
  const findings: Finding[] = []
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const path = join(dir, entry.name)
      const file = relative(dist, path)
      if (entry.name.toLowerCase() === 'education') findings.push({ file, rule: 'pack-path', match: entry.name })
      if (entry.isDirectory()) visit(path)
      else {
        // latin1 maps every byte to one character, so a binary file is searched as it is.
        const id = RECORD_ID.exec(readFileSync(path, 'latin1'))
        if (id) findings.push({ file, rule: 'pack-record-id', match: id[0] })
      }
    }
  }
  visit(dist)
  return findings
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const root = resolve(import.meta.dirname, '..', '..')
  const findings = scanBuilt(join(root, 'dist'))
  if (findings.length > 0) {
    for (const f of findings) console.error(`${f.file}  ${f.rule}  ${f.match}`)
    console.error(`\neducation built-output check failed: ${findings.length} finding(s)`)
    process.exit(1)
  }
  console.log('education built-output check passed')
}
