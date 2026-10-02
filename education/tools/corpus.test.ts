// The real corpus, validated at the default strictness, so that
// `npm run education:check` covers every record file, and counted against
// the manifest, so that a lane with a record too many or too few fails in CI.

import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MANIFEST } from '../manifest.ts'
import { gateOf, gatePasses, joinTree } from './review-join.ts'
import { laneKey } from './schema.ts'
import { filesUnder, formatFinding, validateTree } from './validate.ts'

const EDUCATION = resolve(import.meta.dirname, '..')

describe('the corpus', () => {
  it('every record under education/corpus and education/sources validates', () => {
    expect(validateTree(EDUCATION).map(formatFinding)).toEqual([])
  })

  it('every lane of the manifest holds as many record files as the manifest expects', () => {
    const off: string[] = []
    let expected = 0
    for (const lane of MANIFEST) {
      const folder = join(EDUCATION, 'corpus', laneKey(lane), 'objectives')
      const held = existsSync(folder) ? readdirSync(folder).filter((name) => name.endsWith('.md')).length : 0
      if (held !== lane.expectedCount) off.push(`${laneKey(lane)}: ${held} record file(s), ${lane.expectedCount} expected`)
      // A lane where nothing is published expects no record and has no folder for them.
      if (lane.nothingPublished !== undefined && (lane.expectedCount !== 0 || existsSync(folder))) off.push(`${laneKey(lane)}: nothing is published, and the lane expects ${lane.expectedCount} record(s) or has an objectives folder`)
      expected += lane.expectedCount
    }
    expect(off).toEqual([])
    // No record file sits outside the lanes of the manifest.
    expect(filesUnder(EDUCATION, 'corpus').filter((file) => /\/objectives\/[^/]+\.md$/.test(file))).toHaveLength(expected)
  })

  it('the join of the real tree has no lane-count finding, and its count of each lane is the manifest\'s', () => {
    const result = joinTree(EDUCATION)
    expect(result.findings.filter((finding) => finding.rule === 'lane-count').map(formatFinding)).toEqual([])
    for (const lane of MANIFEST) expect(result.lanes.get(laneKey(lane))!.records, laneKey(lane)).toBe(lane.expectedCount)
    expect(gatePasses(gateOf(result))).toBe(true)
  })
})
