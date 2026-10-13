import { describe, expect, it } from 'vitest'
import { dent, groove, makeField } from './field'
import { SHOWN_STROKES, emptyHint, hintFor } from './guide'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, GLOW_RAMP, DEMO_SECONDS, IdleLadder } from './guidance'

describe('what the idle ladder shows on the beach', () => {
  it('shows nothing before there is any guidance, or while the child is busy', () => {
    const field = makeField()
    expect(hintFor(null, field, emptyHint())).toEqual(emptyHint())
    const ladder = new IdleLadder(0)
    const hint = hintFor(ladder.update(1), field, emptyHint())
    expect(hint.glow).toBe(0)
    expect(hint.hand).toBe(false)
  })

  it('glows first on a stretch of open sand, then draws one stroke over it with the ghost hand', () => {
    const field = makeField()
    const ladder = new IdleLadder(0)
    const glow = hintFor(ladder.update(IDLE_BEFORE_GLOW + GLOW_RAMP), field, emptyHint())
    expect(glow.glow).toBe(1)
    expect(glow.hand).toBe(false)
    const stroke = SHOWN_STROKES[0]
    expect(glow.glowX).toBeCloseTo((stroke.fromX + stroke.toX) / 2)
    expect(glow.glowZ).toBeCloseTo((stroke.fromZ + stroke.toZ) / 2)
    const early = { ...hintFor(ladder.update(IDLE_BEFORE_DEMO + DEMO_SECONDS * 0.2), field, emptyHint()) }
    const late = { ...hintFor(ladder.update(IDLE_BEFORE_DEMO + DEMO_SECONDS * 0.74), field, emptyHint()) }
    expect(early.hand).toBe(true)
    expect(early.press).toBeGreaterThan(0.5)
    expect(Math.hypot(early.handX - stroke.fromX, early.handZ - stroke.fromZ)).toBeLessThan(0.05)
    expect(Math.hypot(late.handX - stroke.toX, late.handZ - stroke.toZ)).toBeLessThan(0.3)
  })

  it('shows the move and digs nothing', () => {
    const field = makeField()
    const ladder = new IdleLadder(0)
    for (let t = 0; t < 12; t += 0.1) hintFor(ladder.update(t), field, emptyHint())
    expect(field.version).toBe(0)
    expect(Math.max(...field.d.map(Math.abs))).toBe(0)
  })

  it('never draws over what the child made: it shows the next stroke whose sand is still smooth', () => {
    const field = makeField()
    const first = SHOWN_STROKES[0], second = SHOWN_STROKES[1]
    dent(field, first.fromX, first.fromZ)
    groove(field, first.fromX, first.fromZ, first.toX, first.toZ)
    const ladder = new IdleLadder(0)
    const hint = hintFor(ladder.update(IDLE_BEFORE_GLOW + GLOW_RAMP), field, emptyHint())
    expect(hint.glowX).toBeCloseTo((second.fromX + second.toX) / 2)
  })

  it('keeps every stroke it may show on the open sand, clear of the folk and their rocks', () => {
    for (const stroke of SHOWN_STROKES) {
      for (const [x, z] of [[stroke.fromX, stroke.fromZ], [stroke.toX, stroke.toZ]]) {
        expect(Math.abs(x)).toBeLessThan(3)
        expect(z).toBeGreaterThan(0)
        expect(z).toBeLessThan(5)
      }
    }
  })
})
