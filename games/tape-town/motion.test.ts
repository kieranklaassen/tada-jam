import { describe, expect, it } from 'vitest'
import { TOY_IDS, type ToyId } from './layout'
import { TAPPED_MOVE, arc, blink, catBreath, catTail, idle, landed, tapped, type Move } from './motion'

const CHANNELS = ['lift', 'sx', 'sy', 'da', 'part'] as const
const flat = (move: Move): number[] => [move.lift, move.sx - 1, move.sy - 1, move.da, move.part]

/** A curve sampled every sixtieth of a second, with each channel brought to the same size so that shape is compared and not loudness. */
function sampled(curve: (t: number) => Move, seconds: number, from = 0): number[] {
  const rows = Array.from({ length: Math.round(seconds * 60) }, (_, i) => flat(curve(from + i / 60)))
  return CHANNELS.flatMap((_, c) => {
    const column = rows.map((row) => row[c]), most = Math.max(...column.map(Math.abs))
    return column.map((value) => (most > 1e-6 ? value / most : 0))
  })
}

/** How unlike two sampled curves are: 0 for a copy, about 1 for two that have nothing in common. */
function unlike(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0) / a.length)
}

const pairs: [ToyId, ToyId][] = TOY_IDS.flatMap((a, i) => TOY_IDS.slice(i + 1).map((b): [ToyId, ToyId] => [a, b]))

describe('every toy moves like itself', () => {
  it('gives no two toys the same idle, or the same idle a little later', () => {
    for (const [a, b] of pairs) {
      const least = Math.min(...[0, 0.1, 0.25, 0.5, 1, 1.7, 2.9].map((shift) => unlike(sampled((t) => idle(a, t), 12), sampled((t) => idle(b, t), 12, shift))))
      expect(least, `${a} and ${b} idle alike`).toBeGreaterThan(0.15)
    }
  })

  it('gives no two toys the same answer to a tap', () => {
    for (const [a, b] of pairs) expect(unlike(sampled((u) => tapped(a, u), 1), sampled((u) => tapped(b, u), 1)), `${a} and ${b} answer a tap alike`).toBeGreaterThan(0.12)
  })

  it('gives no two toys the same landing', () => {
    for (const [a, b] of pairs) expect(unlike(sampled((u) => landed(a, u), 1), sampled((u) => landed(b, u), 1)), `${a} and ${b} land alike`).toBeGreaterThan(0.05)
  })

  it('the dog lands in a skid and then shakes, and a peg rolls on its round foot: neither is the squash the others land with', () => {
    // The dog: stretched out along its way as it lands and not across, then a shake that the tail takes part in.
    const skid = landed('dog', 0.02)
    expect(skid.sx).toBeGreaterThan(1.1)
    expect(skid.sy).toBeLessThan(1)
    expect(skid.da).toBe(0)
    const shakes = [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7].map((u) => landed('dog', u))
    expect(Math.max(...shakes.map((move) => move.da))).toBeGreaterThan(0.1)
    expect(Math.min(...shakes.map((move) => move.da))).toBeLessThan(-0.1)
    expect(shakes.some((move) => Math.abs(move.part) > 0.5)).toBe(true)
    // A peg: it leans one way as it goes round and never swells all round, and comes to rest upright.
    for (const id of ['pegA', 'pegB', 'pegC'] as const) {
      const rolls = [0.02, 0.06, 0.1, 0.14, 0.18, 0.22].map((u) => landed(id, u))
      for (const move of rolls) expect((move.sx - 1) * (move.sy - 1), id).toBeLessThanOrEqual(0)
      expect(Math.max(...rolls.map((move) => Math.abs(move.da))), id).toBeGreaterThan(0.2)
      expect(landed(id, 0).da, id).toBeCloseTo(0, 6)
      expect(Math.abs(landed(id, 1.15).da), id).toBeLessThan(0.03)
    }
    expect(Math.sign(landed('pegA', 0.05).da)).not.toBe(Math.sign(landed('pegB', 0.05).da))
    // The car, the bus, the duck and the train take it on their springs: the same swell along and across.
    for (const id of ['car', 'bus', 'duck', 'train'] as const) for (const u of [0.02, 0.1, 0.3]) expect((landed(id, u).sx - 1) * (landed(id, u).sy - 1), id).toBeGreaterThanOrEqual(0)
  })

  it('moves every toy at idle, a little, and never far', () => {
    for (const id of TOY_IDS) {
      const rows = Array.from({ length: 600 }, (_, i) => idle(id, i / 60))
      const span = (pick: (move: Move) => number): number => Math.max(...rows.map(pick)) - Math.min(...rows.map(pick))
      expect(Math.max(span((m) => m.lift), span((m) => m.sx), span((m) => m.sy), span((m) => m.da), span((m) => m.part)), `${id} stands dead still`).toBeGreaterThan(0.01)
      for (const move of rows) {
        expect(move.lift).toBeGreaterThanOrEqual(0)
        expect(move.lift).toBeLessThanOrEqual(0.35)
        expect(Math.abs(move.sx - 1)).toBeLessThan(0.06)
        expect(Math.abs(move.sy - 1)).toBeLessThan(0.06)
      }
    }
  })
})

describe('an answer to a tap', () => {
  it('starts in the frame the finger lands and is over when it says it is', () => {
    for (const id of TOY_IDS) {
      const first = flat(tapped(id, 1 / 60)), rest = flat(tapped(id, TAPPED_MOVE[id].lasts))
      expect(first.some((value) => Math.abs(value) > 0.001), `${id} has not moved a frame after the tap`).toBe(true)
      expect(rest).toEqual([0, 0, 0, 0, 0])
    }
  })

  it('has its sounds fall inside it, in order, the first when the finger lands', () => {
    for (const id of TOY_IDS) {
      const { lasts, cues } = TAPPED_MOVE[id]
      expect(cues[0]).toBe(0)
      expect([...cues]).toEqual([...cues].sort((a, b) => a - b))
      expect(cues[cues.length - 1]).toBeLessThan(lasts)
    }
  })

  it('has a peg in the air until the frame its tok is heard, and on the floor from then on', () => {
    for (const id of ['pegA', 'pegB', 'pegC'] as const) {
      const land = TAPPED_MOVE[id].cues[1]
      expect(tapped(id, land - 1 / 60).lift).toBeGreaterThan(0)
      expect(tapped(id, land).lift).toBeCloseTo(0, 6)
      expect(tapped(id, land + 0.05).lift).toBeCloseTo(0, 6)
    }
  })
})

describe('the small things', () => {
  it('takes a hop up off the floor and back to it', () => {
    expect(arc(0)).toBe(0)
    expect(arc(0.5)).toBe(1)
    expect(arc(1)).toBeCloseTo(0)
    expect(arc(3)).toBeCloseTo(0)
  })

  it('never has the whole room blink at once', () => {
    let most = 0
    for (let i = 0; i < 60 * 60; i++) most = Math.max(most, TOY_IDS.filter((id) => blink(id, i / 60) > 0.25).length)
    expect(most).toBeLessThan(TOY_IDS.length)
    for (const id of TOY_IDS) expect(Array.from({ length: 600 }, (_, i) => blink(id, i / 60)).some((shut) => shut > 0.9), `${id} never blinks`).toBe(true)
  })

  it('keeps the cat breathing between 0 and 1, and flicks its tail harder at a rip', () => {
    for (let i = 0; i < 600; i++) {
      expect(catBreath(i / 60)).toBeGreaterThanOrEqual(0)
      expect(catBreath(i / 60)).toBeLessThanOrEqual(1)
    }
    const calm = Math.max(...Array.from({ length: 600 }, (_, i) => Math.abs(catTail(i / 60, 0))))
    const startled = Math.max(...Array.from({ length: 600 }, (_, i) => Math.abs(catTail(i / 60, 1))))
    expect(startled).toBeGreaterThan(calm)
  })
})
