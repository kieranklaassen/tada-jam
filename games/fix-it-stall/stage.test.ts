import { describe, expect, it } from 'vitest'
import { clipLead, startLead } from './circuit'
import { asBuilt } from './gadgets'
import { bootAt, fit, hitTest, leadCurve, leadEnds, looseEnd, onCurve, padAt, REACH, restBend, STAGE, toStage, TOY } from './stage'

const toy = asBuilt('toy')
const bends = (circuit: typeof toy) => circuit.leads.map((_, i) => restBend(...leadEnds(circuit, i), i))

describe('fitting the stage', () => {
  it('fits the whole scene into any surface, centred, and reads a touch back into stage units', () => {
    for (const [w, h] of [[1180, 820], [820, 1180], [2360, 1640], [600, 300], [1024, 768]]) {
      const f = fit(w, h)
      expect(STAGE.w * f.scale).toBeLessThanOrEqual(w + 1e-9)
      expect(STAGE.h * f.scale).toBeLessThanOrEqual(h + 1e-9)
      const middle = toStage(f, { x: w / 2, y: h / 2 })
      expect(middle.x).toBeCloseTo(STAGE.w / 2, 9)
      expect(middle.y).toBeCloseTo(STAGE.h / 2, 9)
      const p = { x: 123, y: 456 }
      expect(toStage(f, { x: f.x + p.x * f.scale, y: f.y + p.y * f.scale }).x).toBeCloseTo(p.x, 9)
    }
  })
})

describe('where the toy lies', () => {
  it('keeps every pad on the mat, clear of the counter and of the grown-up corner', () => {
    for (let pad = 0; pad < 6; pad++) {
      const p = padAt(toy, pad)
      expect(p.x).toBeGreaterThan(REACH.pad)
      expect(p.x).toBeLessThan(STAGE.w - 72 - REACH.pad)
      expect(p.y).toBeGreaterThan(174 + REACH.pad)
      expect(p.y).toBeLessThan(STAGE.h - REACH.pad)
    }
  })

  it('gives every pad a target of its own: no two pads are within reach of one finger', () => {
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
      const p = padAt(toy, a), q = padAt(toy, b)
      expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(2 * REACH.pad)
    }
    expect(2 * REACH.pad).toBeGreaterThanOrEqual(60)
  })

  it('lays a loose clip on the mat near its pad, and two loose clips never on each other', () => {
    let circuit = toy
    for (const pad of [1, 1, 2, 4]) circuit = startLead(circuit, pad).circuit
    const ends = circuit.leads.map((_, i) => looseEnd(circuit, i))
    for (let a = 0; a < ends.length; a++) {
      expect(ends[a].y).toBeGreaterThan(174)
      for (let b = a + 1; b < ends.length; b++) expect(Math.hypot(ends[a].x - ends[b].x, ends[a].y - ends[b].y)).toBeGreaterThan(REACH.clip)
    }
  })
})

describe('what a finger is on', () => {
  it('a pad, the middle of the cell, the lamp\'s glass, the coil, or the bare mat', () => {
    expect(hitTest(toy, padAt(toy, 1), [])).toEqual({ on: 'pad', pad: 1 })
    expect(hitTest(toy, { x: padAt(toy, 4).x + 20, y: padAt(toy, 4).y - 10 }, [])).toEqual({ on: 'pad', pad: 4 })
    const cell = { x: padAt(toy, 0).x, y: (padAt(toy, 0).y + padAt(toy, 1).y) / 2 }
    expect(hitTest(toy, cell, [])).toEqual({ on: 'part', part: 0 })
    const lamp = { x: padAt(toy, 2).x, y: (padAt(toy, 2).y + padAt(toy, 3).y) / 2 }
    expect(hitTest(toy, lamp, [])).toEqual({ on: 'part', part: 1 })
    expect(hitTest(toy, TOY.coil, [])).toEqual({ on: 'coil' })
    expect(hitTest(toy, { x: 900, y: 700 }, [])).toEqual({ on: 'mat' })
  })

  it('the boot of a clip before the pad it bites, and the wire between the clips', () => {
    const wired = clipLead(toy, 1, 2)
    const b = bends(wired)
    expect(hitTest(wired, bootAt(wired, 0, 0, b[0]), b)).toEqual({ on: 'boot', lead: 0, end: 0 })
    expect(hitTest(wired, bootAt(wired, 0, 1, b[0]), b)).toEqual({ on: 'boot', lead: 0, end: 1 })
    // The pad itself is still a pad: a second lead can start there.
    expect(hitTest(wired, padAt(wired, 1), b)).toEqual({ on: 'pad', pad: 1 })
    expect(hitTest(wired, onCurve(leadCurve(...leadEnds(wired, 0), b[0]), 0.5), b)).toEqual({ on: 'wire', lead: 0 })
  })

  it('a boot is far enough from its pad that each has its own place', () => {
    const wired = clipLead(toy, 1, 2), b = bends(wired)
    const boot = bootAt(wired, 0, 0, b[0]), pad = padAt(wired, 1)
    expect(Math.hypot(boot.x - pad.x, boot.y - pad.y)).toBeGreaterThan(REACH.boot)
  })

  it('a loose clip where it lies, and the newest lead first where two lie together', () => {
    const one = startLead(toy, 1).circuit
    expect(hitTest(one, looseEnd(one, 0), bends(one))).toEqual({ on: 'clip', lead: 0 })
    const two = clipLead(clipLead(toy, 1, 2), 1, 2), b = bends(two)
    expect(hitTest(two, bootAt(two, 1, 0, b[1]), b)).toEqual({ on: 'boot', lead: 1, end: 0 })
    expect(hitTest(two, bootAt(two, 0, 0, b[0]), b)).toEqual({ on: 'boot', lead: 0, end: 0 })
  })
})
