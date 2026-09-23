// The real catalog: eight shards, their critiques, and the selector's decisions.
// The validator owns the counting rules; these tests pin the shape of what the
// parallel writers produced and that the selection stayed inside those rules.

import { describe, expect, it } from 'vitest'
import { loadCatalog } from './catalog.ts'
import { critiques } from './critiques/index.ts'
import { decisions } from './decisions.ts'
import { ENGINE_IDS } from './engines.ts'
import { shards } from './shards/index.ts'
import { TOY_PARTITIONS } from './toys.ts'
import { validate, wordsAreEscalationOnly } from './validate.ts'

const drafts = shards.flat()
const { records, problems } = loadCatalog()

describe('the real catalog', () => {
  it('joins and validates with no problems', () => {
    expect(problems).toEqual([])
  })

  it('holds 112 written ideas in eight shards of 14', () => {
    expect(shards).toHaveLength(8)
    for (const shard of shards) expect(shard).toHaveLength(14)
    expect(drafts.length).toBeGreaterThanOrEqual(100)
    expect(new Set(drafts.map((d) => d.id)).size).toBe(drafts.length)
  })

  it('gives every shard one primary engine, prefixed ids, and exactly five toy ideas from its own toys', () => {
    for (const shard of shards) {
      const engine = shard[0]!.engine!
      expect(ENGINE_IDS).toContain(engine)
      for (const d of shard) {
        expect(d.engine).toBe(engine)
        expect(d.id.startsWith(`${engine}-`)).toBe(true)
      }
      const toys = shard.filter((d) => d.lens === 'physical-toy')
      expect(toys).toHaveLength(5)
      expect(toys.map((d) => d.toy).sort()).toEqual([...TOY_PARTITIONS[engine]].sort())
    }
  })

  it('has exactly one critique and one decision per draft, and no orphans', () => {
    const ids = new Set(drafts.map((d) => d.id))
    expect(critiques).toHaveLength(drafts.length)
    expect(decisions).toHaveLength(drafts.length)
    expect(new Set(critiques.map((c) => c.id))).toEqual(ids)
    expect(new Set(decisions.map((d) => d.id))).toEqual(ids)
  })

  it('builds exactly 30 (ten per batch) and keeps at least six reserves', () => {
    const built = records.filter((r) => r.decision?.status === 'built')
    expect(built).toHaveLength(30)
    for (const batch of [1, 2, 3]) expect(built.filter((r) => r.decision?.batch === batch)).toHaveLength(10)
    expect(records.filter((r) => r.decision?.status === 'reserve').length).toBeGreaterThanOrEqual(6)
  })

  it('cut something at the funnel, and every cut carries its reason', () => {
    const cut = records.filter((r) => r.decision?.status === 'cut')
    expect(cut.length).toBeGreaterThanOrEqual(10)
    for (const r of cut) expect((r.decision?.cutReason ?? '').length).toBeGreaterThan(10)
  })

  it('never builds an idea whose play-5 line is only escalation', () => {
    for (const r of records.filter((x) => x.decision?.status === 'built')) {
      expect(wordsAreEscalationOnly(r.play5 ?? '')).toBe(false)
    }
  })

  it('keeps built ideas the critic kept, and every critic cut is not built', () => {
    for (const r of records) {
      if (r.critique?.verdict === 'cut') expect(r.decision?.status).toBe('cut')
      if (r.decision?.status === 'built') expect(r.critique?.verdict).toBe('keep')
    }
  })

  it('validates against the plan rules with the batch checks on', () => {
    expect(validate(records, { expectedBuilt: 30 })).toEqual([])
  })
})
