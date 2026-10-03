import { describe, expect, it } from 'vitest'
import { readMark, tidy, type Mark } from './marks'
import { JOIN, along, restOf, routeAlong, routeCalled, routeTo, type Route } from './ride'
import { DANDELION, PUDDLE, type Pt } from './yard'

const line = (from: Pt, to: Pt, steps = 30): Pt[] => Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }))
const mark = (raw: Pt[]) => { const p = tidy(raw); return { p, reading: readMark(p) } }
const whats = (route: Route) => route.happenings.map((h) => h.what)
const train: Pt = { x: 150, y: 400 }
const zigzag = (): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < 5; i++) out.push(...line({ x: 200 + i * 90, y: i % 2 ? 320 : 400 }, { x: 290 + i * 90, y: i % 2 ? 400 : 320 }, 8))
  return out
}

describe('the ride a mark gives', () => {
  it('joins a mark that starts beside the train: all chalk, no bump', () => {
    const m = mark(line({ x: 150 + JOIN - 10, y: 400 }, { x: 700, y: 400 }))
    const route = routeAlong(train, m.p, m.reading, [])
    expect(route.legs.map((l) => l.on)).toEqual(['chalk', 'chalk'])
    expect(whats(route)).not.toContain('bump')
  })

  it('crosses a gap on bare tar, with the bump where the gap is', () => {
    const m = mark(line({ x: 450, y: 400 }, { x: 900, y: 400 }))
    const route = routeAlong(train, m.p, m.reading, [])
    expect(route.legs.map((l) => l.on)).toEqual(['tar', 'chalk'])
    const bumps = route.happenings.filter((h) => h.what === 'bump')
    expect(bumps.length).toBe(2)
    // Every bump lies on the tar leg, which is the gap.
    for (const b of bumps) expect(along(route, b.at).on).toBe('tar')
    expect(route.length).toBeCloseTo(300 + m.reading.length)
  })

  it('rides from the nearer end, whichever way the mark was drawn', () => {
    const m = mark(line({ x: 900, y: 400 }, { x: 250, y: 400 }))
    const route = routeAlong(train, m.p, m.reading, [])
    // The nearer end is the one the finger lifted at.
    expect(route.legs[0].pts[1].x).toBeLessThan(260)
    expect(restOf(route, { ...train, face: -1 })).toEqual({ x: 900, y: 400, face: 1 })
  })

  it('gives a fast run on a long straight, a corner at every corner, a loop on a loop', () => {
    const straight = mark(line({ x: 200, y: 400 }, { x: 800, y: 400 }))
    expect(whats(routeAlong(train, straight.p, straight.reading, []))).toEqual(['fast'])
    const zz = mark(zigzag())
    expect(whats(routeAlong(train, zz.p, zz.reading, [])).filter((w) => w === 'corner').length).toBe(4)
    const arc = (from: number, to: number) => Array.from({ length: 51 }, (_, i) => ({ x: 500 + Math.cos(from + ((to - from) * i) / 50) * 113, y: 300 + Math.sin(from + ((to - from) * i) / 50) * 113 }))
    const loop = mark([...line({ x: 200, y: 420 }, { x: 580, y: 380 }, 14), ...arc(Math.PI / 4, Math.PI / 4 - Math.PI * 1.6), ...line({ x: 449, y: 401 }, { x: 716, y: 536 }, 12)])
    expect(loop.reading.kind).toBe('loop')
    expect(whats(routeAlong(train, loop.p, loop.reading, [])).filter((w) => w === 'loop').length).toBe(1)
  })

  it('gives a splash on the way into the water, once for each way in', () => {
    const through = mark(line({ x: 380, y: PUDDLE.y }, { x: 820, y: PUDDLE.y }))
    expect(whats(routeAlong({ x: 370, y: 625 }, through.p, through.reading, [])).filter((w) => w === 'splash').length).toBe(1)
    const skip: Pt[] = []
    for (let i = 0; i < 6; i++) skip.push(...line({ x: 500 + i * 34, y: PUDDLE.y + (i % 2 ? -90 : 90) }, { x: 534 + i * 34, y: PUDDLE.y + (i % 2 ? 90 : -90) }, 8))
    const skipping = mark(skip)
    expect(whats(routeAlong({ x: 480, y: 700 }, skipping.p, skipping.reading, [])).filter((w) => w === 'splash').length).toBe(6)
  })

  it('twangs the dandelion in passing and clacks over a crossing', () => {
    const past = mark(line({ x: 480, y: DANDELION.y - 30 }, { x: 720, y: DANDELION.y - 26 }))
    expect(whats(routeAlong({ x: 470, y: 60 }, past.p, past.reading, []))).toContain('twang')
    const old: Mark = { c: 0, p: tidy(line({ x: 500, y: 250 }, { x: 500, y: 550 })) }
    const over = mark(line({ x: 200, y: 400 }, { x: 800, y: 400 }))
    expect(whats(routeAlong(train, over.p, over.reading, [old])).filter((w) => w === 'clack').length).toBe(1)
  })

  it('rides a ring once round and ends it as a roundabout, felt as one loop and not two', () => {
    const ring = mark(Array.from({ length: 61 }, (_, i) => ({ x: 600 + Math.cos((i / 60) * Math.PI * 1.97) * 120, y: 350 + Math.sin((i / 60) * Math.PI * 1.97) * 120 })))
    expect(ring.reading.ring).toBe(true)
    const w = whats(routeAlong({ x: 720, y: 350 }, ring.p, ring.reading, []))
    expect(w.filter((x) => x === 'roundabout').length).toBe(1)
    expect(w).not.toContain('loop')
  })

  it('gives a scribble as one happening in the middle of it', () => {
    const raw: Pt[] = []
    for (let i = 0; i < 10; i++) raw.push(...line({ x: 400 + i * 8, y: i % 2 ? 435 : 365 }, { x: 408 + i * 8, y: i % 2 ? 365 : 435 }, 6))
    const s = mark(raw)
    expect(s.reading.kind).toBe('scribble')
    expect(whats(routeAlong(train, s.p, s.reading, []))).toContain('scribble')
  })
})

describe('the ride a tap gives', () => {
  it('trundles to a dot on bare tar, bumping', () => {
    const route = routeTo(train, { x: 650, y: 400 })
    expect(route.legs.map((l) => l.on)).toEqual(['tar'])
    expect(whats(route)).toEqual(['bump', 'bump', 'bump'])
    expect(restOf(route, { ...train, face: 1 })).toEqual({ x: 650, y: 400, face: 1 })
  })

  it('goes nowhere for a tap where the train already stands', () => {
    const route = routeTo(train, train)
    expect(route.legs).toEqual([])
    expect(restOf(route, { ...train, face: -1 })).toEqual({ ...train, face: -1 })
  })

  it('rides a line it stands on to the tapped spot, at speed and with no bump', () => {
    const p = tidy(line({ x: 150, y: 400 }, { x: 900, y: 400 }))
    const m: Mark = { c: 0, p }
    const route = routeCalled(train, { x: 600, y: 410 }, m, readMark(p), [m])
    expect(route.legs.every((l) => l.on === 'chalk')).toBe(true)
    expect(whats(route)).not.toContain('bump')
    const end = restOf(route, { ...train, face: 1 })
    expect(Math.abs(end.x - 600)).toBeLessThan(2)
    // And back again, the other way along the same line.
    const back = routeCalled({ x: 600, y: 400 }, { x: 200, y: 400 }, m, readMark(p), [m])
    expect(restOf(back, { x: 600, y: 400, face: 1 }).face).toBe(-1)
  })

  it('comes to the nearer end of a line it does not stand on, then rides to the spot', () => {
    const p = tidy(line({ x: 500, y: 200 }, { x: 1000, y: 200 }))
    const m: Mark = { c: 0, p }
    const route = routeCalled(train, { x: 800, y: 200 }, m, readMark(p), [m])
    expect(route.legs.map((l) => l.on)).toEqual(['tar', 'chalk'])
    expect(route.legs[1].pts[0]).toEqual({ x: 500, y: 200 })
  })
})
