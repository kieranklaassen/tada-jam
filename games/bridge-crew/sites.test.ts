import { describe, expect, it } from 'vitest'
import { CROSSINGS } from './bridges.fixture'
import { FIRST_VISIT, LADDER } from './config'
import { KINDS, MAX_PARTS, countKinds, layProblem, type Part } from './kit'
import { run } from './run'
import { COLS, ROWS, VARIANTS, canPin, isFooting, isYard, site } from './sites'
import { VEHICLES, trainOf } from './vehicles'

describe('the sheets', () => {
  it('no position id names a grade, a groep, a level or a number', () => {
    for (const id of LADDER) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
      expect(id).not.toMatch(/grade|groep|level|fase|year|class|stage|easy|hard/)
    }
    expect(new Set(LADDER).size).toBe(LADDER.length)
    for (const row of FIRST_VISIT) expect(LADDER).toContain(row.position)
  })

  it('every position lays out a sheet in three variants that fit the grid', () => {
    for (const id of LADDER) {
      const shapes = new Set<string>()
      for (let v = 0; v < VARIANTS; v++) {
        const at = site(id, v)
        expect(at.id).toBe(id)
        expect(at.ground).toHaveLength(COLS + 1)
        expect(at.left[0]).toBeGreaterThanOrEqual(4)
        expect(at.right[0]).toBeLessThanOrEqual(COLS - 4)
        expect(at.right[0]).toBeGreaterThan(at.left[0])
        expect(at.left[1]).toBe(at.right[1])
        for (const anchor of at.anchors) { expect(anchor[1]).toBeLessThanOrEqual(ROWS); expect(isFooting(at)(anchor)).toBe(true) }
        expect(isFooting(at)(at.left) && isFooting(at)(at.right)).toBe(true)
        // The gap is open water: no footing at deck height between the lips.
        for (let x = at.left[0] + 1; x < at.right[0]; x++) expect(isFooting(at)([x, at.left[1]])).toBe(false)
        const total = KINDS.reduce((sum, kind) => sum + at.kit[kind], 0)
        expect(total).toBeGreaterThan(0)
        expect(total).toBeLessThanOrEqual(MAX_PARTS)
        shapes.add(JSON.stringify([at.ground, at.anchors]))
      }
      // A position comes back in another form, except the free yard, which only moves its rock.
      expect(shapes.size).toBeGreaterThanOrEqual(2)
    }
  })

  it('a variant wraps round and an unknown id gives the first sheet', () => {
    expect(site('rock-prop', 4)).toEqual(site('rock-prop', 1))
    expect(site('rock-prop', -1)).toEqual(site('rock-prop', 2))
    expect(site('no-such-sheet', 0).id).toBe(LADDER[0])
  })

  it('a pin goes on the sheet and on a surface, never buried in a bank', () => {
    const at = site('rock-prop', 0)
    expect(canPin(at, [at.left[0], 3])).toBe(true)
    expect(canPin(at, [at.left[0] - 2, 3])).toBe(false)
    expect(canPin(at, [at.left[0] - 2, at.left[1]])).toBe(true)
    expect(canPin(at, [-1, 6])).toBe(false)
    expect(canPin(at, [5, ROWS + 1])).toBe(false)
    expect(canPin(at, [5.5, 6])).toBe(false)
    expect(isFooting(at)([at.left[0] + 2, 0])).toBe(true)
    expect(isFooting(at)([at.left[0] + 2, 1])).toBe(false)
  })

  it('each new thing arrives alone: a sheet that brings a new part keeps a vehicle already met', () => {
    const met = new Set<string>(), kinds = new Set<string>()
    LADDER.forEach((id, index) => {
      const at = site(id, 0)
      const newKinds = KINDS.filter((kind) => at.kit[kind] > 0 && !kinds.has(kind))
      const newVehicle = !met.has(at.job)
      if (index > 0 && id !== 'open-yard') expect(newKinds.length + (newVehicle ? 1 : 0), id).toBeLessThanOrEqual(1)
      newKinds.forEach((kind) => kinds.add(kind)); met.add(at.job)
    })
  })

  it('every sheet can be crossed by its job vehicle with a bridge from its own kit', () => {
    for (const id of LADDER) {
      const at = site(id, 0), bridge = CROSSINGS[id]
      expect(bridge, id).toBeDefined()
      const used = countKinds(bridge)
      for (const kind of KINDS) expect(used[kind], `${id} ${kind}`).toBeLessThanOrEqual(at.kit[kind])
      const laid: Part[] = []
      for (const piece of bridge) { expect(layProblem(piece, laid, at.kit), id).toBeNull(); expect(canPin(at, piece.a) && canPin(at, piece.b), id).toBe(true); laid.push(piece) }
      const result = run(at, bridge, trainOf(VEHICLES[at.job]))
      expect(result.ending, id).toEqual({ kind: 'crossed' })
      expect(result.frame.firm.every(Boolean), id).toBe(true)
    }
  })

  it('the three variants of every position differ, in the gap or in where the rock stands', () => {
    for (const id of LADDER) {
      const forms = [0, 1, 2].map((v) => { const at = site(id, v); return JSON.stringify([at.left, at.right, at.ground, at.anchors]) })
      expect(new Set(forms).size, id).toBe(3)
      // The gap is the first one, or a cell or two wider or narrower.
      const gaps = [0, 1, 2].map((v) => site(id, v).right[0] - site(id, v).left[0])
      for (const gap of gaps) expect(Math.abs(gap - gaps[0])).toBeLessThanOrEqual(2)
    }
  })

  it('the other vehicle of every position carries more crates than its own, and at the free yard any vehicle is its own', () => {
    for (const id of LADDER) {
      const at = site(id, 0)
      if (isYard(at)) continue
      expect(VEHICLES[at.extra].crates, id).toBeGreaterThan(VEHICLES[at.job].crates)
    }
    expect(LADDER.filter((id) => isYard(site(id, 0)))).toEqual([LADDER[LADDER.length - 1]])
  })
})
