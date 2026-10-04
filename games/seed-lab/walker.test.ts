import { describe, expect, it } from 'vitest'
import { CREATURES } from './creatures'
import { layoutOf } from './layout'
import { Director, type Actor } from './motion'
import { VISITORS } from './visitors'
import { BODY, Walker, restingVisitor, visitorSpot, waitingSpot } from './walker'

const FRAME = 1 / 60
const actor: Actor = {
  pause: [1, 2],
  weight: 0,
  tempo: 1,
  funniest: 'none',
  idle: {
    a: { seconds: 1, keys: [{ at: 0, set: {} }, { at: 0.5, set: { look: 0.5 } }, { at: 1, set: {} }] },
    b: { seconds: 1, keys: [{ at: 0, set: {} }, { at: 0.5, set: { lean: 0.3 } }, { at: 1, set: {} }] },
  },
  answer: {
    up: { seconds: 2, keys: [{ at: 0, set: {} }, { at: 0.25, set: { shift: -1 } }, { at: 0.5, set: { shift: -1, climb: 1, part: 1 } }, { at: 0.75, set: { shift: -1 } }, { at: 1, set: {} }] },
    hop: { seconds: 1, keys: [{ at: 0, set: {} }, { at: 0.5, set: { lift: 1, turn: 2, legs: 3 } }, { at: 1, set: {} }] },
  },
}
const walker = () => new Walker('snail', actor, new Director(5), { x: 500, y: 400 })
const play = (w: Walker, seconds: number, each: () => void = () => {}) => { for (let t = 0; t < seconds; t += FRAME) { w.step(FRAME); each() } }

describe('a visitor in motion', () => {
  it('plays the actions it is told one after another, and runs what follows each when it ends', () => {
    const w = walker(), log: string[] = []
    w.play('up', () => log.push('up'))
    w.after('hop', () => log.push('hop'))
    expect(w.busy).toBe(true)
    play(w, 1.9)
    expect(log).toEqual([])
    expect(w.doing).toBe('up')
    play(w, 0.2)
    expect(log).toEqual(['up'])
    expect(w.doing).toBe('hop')
    play(w, 1.1)
    expect(log).toEqual(['up', 'hop'])
    expect(w.busy).toBe(false)
  })

  it('measures a step against the plant it is answering: -1 is the foot of that plant, and a climb is its stem', () => {
    const w = walker(), out = restingVisitor('snail'), plant = { x: 420, y: 400, stem: 200 }
    w.play('up')
    play(w, 1)
    w.fill(out, 1, plant, 0)
    expect(out.x).toBeCloseTo(420, 0)
    expect(out.y).toBeCloseTo(200, 0)
    expect(out.part).toBeCloseTo(1, 1)
    play(w, 1.1)
    w.fill(out, 1, plant, 0)
    expect(out.x).toBeCloseTo(500, 3)
    expect(out.y).toBeCloseTo(400, 3)
  })

  it('lifts by its own height at the scale it is drawn, and turns and beats its legs as the action says', () => {
    const w = walker(), out = restingVisitor('snail')
    w.play('hop')
    play(w, 0.5)
    w.fill(out, 0.5, null, 0)
    expect(Math.abs(out.lift - BODY.snail.h * 0.5)).toBeLessThan(2)
    expect(out.turn).toBeCloseTo(2, 1)
    expect(out.legs).toBeGreaterThan(0)
  })

  it('lives by itself when nothing is asked of it, never the same thing twice running, and is not busy then', () => {
    const w = walker(), seen: string[] = []
    let before: string | null = null
    play(w, 30, () => { if (w.doing !== before) { if (w.doing) seen.push(w.doing); before = w.doing } })
    expect(seen.length).toBeGreaterThan(6)
    for (let at = 1; at < seen.length; at++) expect(seen[at]).not.toBe(seen[at - 1])
    expect(w.busy).toBe(false)
  })

  it('goes where it is sent over the seconds given, and says when it is there', () => {
    const w = walker()
    let there = false
    w.walk({ x: 700, y: 380 }, 1, () => { there = true })
    play(w, 0.5)
    expect(w.at.x).toBeGreaterThan(550)
    expect(w.at.x).toBeLessThan(650)
    expect(there).toBe(false)
    play(w, 0.6)
    expect(w.at).toEqual({ x: 700, y: 380 })
    expect(there).toBe(true)
  })

  it('drops everything when it is put at rest, and runs none of what was to follow', () => {
    const w = walker(), log: string[] = []
    w.play('up', () => log.push('up'))
    w.after('hop', () => log.push('hop'))
    play(w, 0.5)
    w.rest()
    play(w, 0.5)
    expect(log).toEqual([])
    expect(w.busy).toBe(false)
    const out = w.fill(restingVisitor('snail'), 1, null, 0)
    expect([out.x, out.y, out.turn, out.part]).toEqual([500, 400, 0, 0])
  })

  it('passes over an action the cast does not have, and still does what follows it', () => {
    const w = walker(), log: string[] = []
    w.play('cartwheel', () => log.push('cartwheel'))
    w.after('hop', () => log.push('hop'))
    expect(log).toEqual(['cartwheel'])
    expect(w.doing).toBe('hop')
  })
})

describe('where a visitor stands', () => {
  it('is drawn at the size the view draws it', () => {
    for (const who of VISITORS) expect(BODY[who]).toEqual({ w: CREATURES[who].w, h: CREATURES[who].h })
  })

  it('is inside its own place on the page, on the page and at the edge', () => {
    for (const [w, h] of [[1180, 820], [1024, 768], [820, 1180]]) {
      const layout = layoutOf(w, h)
      for (const who of VISITORS) {
        const on = visitorSpot(layout, who), edge = waitingSpot(layout, who)
        expect(on.x > layout.visitor.x && on.x < layout.visitor.x + layout.visitor.w).toBe(true)
        expect(edge.x > layout.waiting.x && edge.x < layout.waiting.x + layout.waiting.w).toBe(true)
        expect(on.s).toBeGreaterThan(0.3)
        expect(edge.s).toBeGreaterThan(0.2)
      }
    }
  })
})
