import { describe, expect, it } from 'vitest'
import { CANS, CATCH, CORD, CURTAIN, DRAWINGS, LARGE, MOLE, OSTRICH, REACH, SACKS, WIPER, bounds, catches, nearestPlace, placeAt, placeOn, shelfAt, targetAt } from './layout'
import { OUTLINE } from './magnets'
import { BODIES, PARTS, PLACES, bare } from './monster'
import { TRAY_TOP } from './room'
import { STAGE } from './stage'

// In place of the intersection audit: nothing that stands overlaps anything
// else that stands, for every monster there can be.

describe('where things stand', () => {
  it('keeps the six large parts of every body clear of each other', () => {
    for (const body of BODIES) PLACES.forEach((p, i) => PLACES.slice(i + 1).forEach((q) => {
      const a = placeOn(body, p), b = placeOn(body, q)
      expect(Math.hypot(a.x - b.x, a.y - b.y), `${body} ${p} ${q}`).toBeGreaterThanOrEqual(LARGE)
    }))
  })
  it('keeps both monsters on the board, clear of the tray, the mole, the ostrich and each other', () => {
    const a = bounds('a'), b = bounds('b')
    expect(a.x1).toBeLessThan(b.x0)
    expect(Math.max(a.y1, b.y1)).toBeLessThan(TRAY_TOP)
    expect(Math.min(a.y0, b.y0)).toBeGreaterThan(90)
    expect(a.x0).toBeGreaterThan(CORD.x + 23)
    expect(a.x0).toBeGreaterThanOrEqual(CURTAIN.x0 - 14)
    expect(a.x1).toBeLessThanOrEqual(CURTAIN.x1 + 14)
    for (const body of BODIES) for (const place of PLACES) for (const part of PARTS) {
      const p = placeAt('b', body, place)
      const x1 = p.x + Math.max(...OUTLINE[part].map((o) => o.x)), x0 = p.x + Math.min(...OUTLINE[part].map((o) => o.x)), y1 = p.y + Math.max(...OUTLINE[part].map((o) => o.y))
      if (x1 > MOLE.x - 98) expect(y1).toBeLessThan(MOLE.y - 124)
      if (x0 < OSTRICH.x + 78) expect(y1).toBeLessThan(OSTRICH.y - 90)
    }
  })
  it('draws every part within its box', () => {
    for (const part of PARTS) for (const p of OUTLINE[part]) expect(Math.max(Math.abs(p.x), Math.abs(p.y))).toBeLessThanOrEqual(51)
  })
  it('keeps the shelf, the sacks and the wiper apart and large enough to hit', () => {
    for (let i = 1; i < PARTS.length; i++) expect(shelfAt(i).x - shelfAt(i - 1).x).toBeGreaterThanOrEqual(96)
    expect(shelfAt(0).x - SACKS[1].x).toBeGreaterThanOrEqual(58 + 46)
    expect(SACKS[1].x - SACKS[0].x).toBeGreaterThanOrEqual(58 + 46)
    expect(WIPER.x - shelfAt(6).x).toBeGreaterThan(60 + 46)
    for (const p of [...SACKS, WIPER, ...DRAWINGS, ...CANS]) { expect(p.x).toBeGreaterThan(20); expect(p.x).toBeLessThan(STAGE.width - 20) }
  })
})

describe('what a finger lands on', () => {
  const s = { open: false, a: bare(), b: bare(), sacks: false, drawings: 0 }
  it('finds each thing at its middle', () => {
    for (let i = 0; i < PARTS.length; i++) expect(targetAt(shelfAt(i), s)).toEqual({ kind: 'shelf', part: PARTS[i] })
    expect(targetAt({ x: 795, y: 352 }, s)).toEqual({ kind: 'body', who: 'b' })
    expect(targetAt({ x: 312, y: 352 }, s).kind).toBe('curtain')
    expect(targetAt({ x: 312, y: 352 }, { ...s, open: true })).toEqual({ kind: 'body', who: 'a' })
    expect(targetAt(CORD, s).kind).toBe('cord')
    expect(targetAt(MOLE, s).kind).toBe('mole')
    expect(targetAt(OSTRICH, s).kind).toBe('ostrich')
    expect(targetAt(WIPER, s).kind).toBe('wiper')
    expect(targetAt(SACKS[1], { ...s, open: true, sacks: true })).toEqual({ kind: 'sack', i: 1 })
    expect(targetAt({ x: 1000, y: 120 }, s).kind).toBe('board')
  })
  it('never reaches the hidden monster through the cloth', () => {
    const a = bare()
    for (const p of PLACES) a.on[p] = { part: 'eye', large: true }
    for (let x = 92; x < 500; x += 12) for (let y = 70; y < 600; y += 12) expect(targetAt({ x, y }, { ...s, a }).kind).toBe('curtain')
  })
  it('takes a magnet let go near a place, at the nearest', () => {
    for (const body of BODIES) for (const place of PLACES) {
      const p = placeAt('b', body, place)
      expect(nearestPlace(p, 'b', body)).toEqual({ place, far: 0 })
      expect(catches({ x: p.x + 10, y: p.y }, 'b', bare(body))).toBe(place)
    }
    expect(catches({ x: 795 + REACH.round.w + CATCH + 160, y: 352 }, 'b', bare())).toBeNull()
  })
})
