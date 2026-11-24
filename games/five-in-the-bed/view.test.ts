import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BED, FIVE, type Side } from './bed'
import { deal, leap, makeGame, pull, wake } from './game'
import { fakePen, fakeSurfaces } from './fakePen'
import { surface } from './paint'
import { Play } from './play'
import { makeRng } from './rng'
import { dyeAt } from './rug'
import { firstSaved, type Saved } from './save'
import { FACING, righted, rolled, turned } from './sheep'
import { STAMP_LIMIT, View, seenHeight } from './view'

let undo: () => void
beforeAll(() => { undo = fakeSurfaces() })
afterAll(() => undo())
const ready = () => { const v = new View(); v.sized(surface.make, 0.1, 0, 0, 1180, 820); return v }
const make = (over: Partial<Saved> = {}) => new Play(makeGame({ ...firstSaved(4, 9), ...over }))
let most = 0
function run(p: Play, v: View, s: number): void {
  for (let i = 0; i < s * 30; i++) {
    p.advance(1 / 30, i * 33)
    v.advance(p, 1 / 30)
    for (const k of p.pokes.splice(0)) v.poke(k, p.game)
    for (const e of p.game.events.splice(0)) v.notice(e, p.game)
    const pen = fakePen()
    v.draw(pen.ctx, p, p.game, { glow: 1, demo: (i % 90) / 90, demoIndex: 0 })
    expect((pen.ctx as unknown as { depth: number }).depth).toBe(0)
    most = Math.max(most, v.stamps.stamped)
  }
}

describe('a frame', () => {
  it('draws every parting, act, deal and drink, quilt and dog, in its budget', () => {
    const rng = makeRng(8)
    for (const position of ['next-door', 'whose-milk', 'under-the-quilt']) {
      const p = make({ position }), v = ready()
      run(p, v, 8)
      const painted = v.stamps.painted
      for (let i = 0; i < 26; i++) {
        wake(p.game)
        if (!p.game.save.milk && i % 3 === 0) deal(p.game)
        else if (i % 5 === 4) pull(p.game, i % 2 ? 'left' : 'right', rng.next() < 0.7)
        else leap(p.game, Math.floor(rng.next() * FIVE))
        p.down(1, { x: rng.next() * 1180, y: rng.next() * 820 }, i)
        p.clear()
        run(p, v, 5)
      }
      expect(v.stamps.painted).toBe(painted)
    }
    const all = make({ milk: null, finished: true, sides: ['left', 'left', 'left', 'left', 'right'] as Side[], shown: ['ridge'] }), v = ready()
    leap(all.game, 4)
    run(all, v, 12)
    expect(all.game.dogIn).toBe('right')
    wake(all.game)
    run(all, v, 2)
    expect(most).toBeLessThanOrEqual(STAMP_LIMIT)
  }, 60000)
  it('is the same bed on a surface of any size', () => {
    const v = new View(), p = make()
    v.sized(surface.make, 0.05, -400, -900, 2000, 2600)
    expect(() => v.draw(fakePen().ctx, null, p.game, null)).not.toThrow()
  })
})

describe('a ball', () => {
  it('shows its back half a turn on, and rights itself', () => {
    let q = FACING
    const half = Math.PI * 66
    for (let i = 0; i < 100; i++) q = rolled(q, half / 100, 0)
    expect(turned(q, [0, 0, 1])[2]).toBeLessThan(-0.99)
    for (let i = 0; i < 100; i++) q = righted(q, 0.1)
    expect(turned(q, [0, 0, 1])[2]).toBeGreaterThan(0.99)
  })
  it('goes over the bare ridge high and in under the quilt low', () => {
    for (const quilt of [null, 'left', 'right'] as const) {
      const p = make({ quilt, milk: null, finished: true, shown: ['ridge'] })
      leap(p.game, 0)
      let high = 0
      for (let i = 0; i < 80; i++) {
        p.advance(1 / 120, i * 8)
        const s = p.game.bed.sheep[0]
        if (Math.abs(s.x - BED.crest) < 60) high = Math.max(high, seenHeight(p.game, 0))
        if (quilt === 'left' ? s.x < BED.crest : quilt === 'right' && s.x > BED.crest) expect(seenHeight(p.game, 0)).toBe(0)
      }
      if (!quilt) expect(high).toBeGreaterThan(60)
    }
  })
})

describe('the rug', () => {
  it('is dyed everywhere, the bed plainly', () => {
    for (let x = -300; x < 1500; x += 60) for (let y = -300; y < 1200; y += 60) expect(dyeAt(x, y)).toMatch(/^#[0-9a-f]{6}$/)
    const mattress = new Set<string>()
    for (let x = BED.left + 20; x < BED.crest - 40; x += 20) for (let y = BED.top + 20; y < BED.bottom - 20; y += 20) mattress.add(dyeAt(x, y))
    expect(mattress.size).toBe(1)
  })
})
