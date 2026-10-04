import { describe, expect, it } from 'vitest'
import { MAX_MARKS, MAX_MARK_POINTS, MAX_POINTS, STEP, addMark, nextChalk, readMark, strength, tidy, type Mark } from './marks'
import { between, makeRng } from './rng'
import { CHALK_AREA, TAR, type Pt } from './yard'

// The shapes a small child makes, built by hand.
const straight = (from: Pt, to: Pt, steps = 30): Pt[] => Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }))
const arc = (cx: number, cy: number, r: number, from: number, to: number, steps = 60): Pt[] => Array.from({ length: steps + 1 }, (_, i) => {
  const a = from + ((to - from) * i) / steps
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
})
const zigzag = (points: number, pitch = 90, height = 80): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < points; i++) out.push(...straight({ x: 100 + i * pitch, y: i % 2 ? 300 - height : 300 }, { x: 100 + (i + 1) * pitch, y: i % 2 ? 300 : 300 - height }, 8))
  return out
}
/** Along, up and over and down across the way in, and along again: a loop the loop. */
const loopTheLoop = (): Pt[] => [
  ...straight({ x: 100, y: 520 }, { x: 480, y: 480 }, 14),
  ...arc(400, 400, 113, Math.PI / 4, Math.PI / 4 - Math.PI * 1.6, 50),
  ...straight({ x: 349, y: 501 }, { x: 616, y: 636 }, 12),
]
const scribble = (): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < 10; i++) out.push(...straight({ x: 300 + i * 9, y: i % 2 ? 380 : 300 }, { x: 300 + (i + 1) * 9, y: i % 2 ? 300 : 380 }, 6))
  return out
}
const read = (raw: Pt[]) => readMark(tidy(raw))

describe('a tidied mark', () => {
  it('is evened to the step, in whole units, on the tar', () => {
    const p = tidy(straight({ x: -50, y: 200.4 }, { x: 300.7, y: 200.4 }))
    expect(p[0]).toEqual({ x: CHALK_AREA.x0, y: 200 })
    for (const q of p) expect(Number.isInteger(q.x) && Number.isInteger(q.y)).toBe(true)
    for (let i = 1; i < p.length - 1; i++) expect(Math.abs(Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y) - STEP)).toBeLessThan(1.5)
  })

  it('is never longer than one mark may be', () => {
    const long = [...straight({ x: 0, y: 150 }, { x: TAR.w, y: 150 }, 200), ...straight({ x: TAR.w, y: 150 }, { x: 0, y: 700 }, 200), ...straight({ x: 0, y: 700 }, { x: TAR.w, y: 700 }, 200)]
    expect(tidy(long).length).toBe(MAX_MARK_POINTS)
  })
})

describe('the kind of a mark, read from its shape', () => {
  it('reads a dot as a tap', () => {
    expect(read([{ x: 50, y: 50 }]).kind).toBe('tap')
    expect(read([{ x: 50, y: 50 }, { x: 56, y: 54 }]).kind).toBe('tap')
  })

  it('reads a straight line as a line with one long run', () => {
    const r = read(straight({ x: 100, y: 300 }, { x: 700, y: 330 }))
    expect(r.kind).toBe('line')
    expect(r.runs.length).toBe(1)
    expect(r.corners).toEqual([])
    expect(r.loops).toEqual([])
  })

  it('reads a bend and a hill as lines with no run and no corner', () => {
    const bend = read(arc(400, 400, 150, Math.PI, Math.PI * 1.9))
    expect(bend.kind).toBe('line')
    expect(bend.corners).toEqual([])
    expect(bend.runs).toEqual([])
    expect(bend.ring).toBe(false)
  })

  it('keeps a wobbly line a line: a shaky hand is not a zigzag', () => {
    const rng = makeRng(5)
    const wobbly = straight({ x: 100, y: 300 }, { x: 800, y: 320 }, 70).map((p) => ({ x: p.x + between(rng, -3, 3), y: p.y + between(rng, -3, 3) }))
    expect(read(wobbly).kind).toBe('line')
  })

  it('reads sharp corners back and forth as a zigzag and finds each corner', () => {
    const r = read(zigzag(5))
    expect(r.kind).toBe('zigzag')
    expect(r.corners.length).toBe(4)
    const one = read(zigzag(2))
    expect(one.kind).toBe('line')
    expect(one.corners.length).toBe(1)
  })

  it('reads a line that crosses itself going round as a loop', () => {
    const r = read(loopTheLoop())
    expect(r.kind).toBe('loop')
    expect(r.loops.length).toBe(1)
    expect(r.loops[0].from).toBeGreaterThan(150)
    expect(r.loops[0].to).toBeLessThan(r.length - 150)
    expect(r.ring).toBe(false)
  })

  it('reads a line whose ends meet as a ring, which is a loop', () => {
    const r = read(arc(500, 400, 120, 0, Math.PI * 1.96))
    expect(r.ring).toBe(true)
    expect(r.kind).toBe('loop')
    expect(read(arc(500, 400, 120, 0, Math.PI * 1.2)).ring).toBe(false)
  })

  it('reads a lot of chalk in a small place as a scribble', () => {
    expect(read(scribble()).kind).toBe('scribble')
    // Round and round on one spot is a scribble too.
    expect(read(arc(500, 400, 60, 0, Math.PI * 5, 120)).kind).toBe('scribble')
    // A ring gone round twice, wider than a spot, is still a loop, however much chalk it took.
    expect(read(arc(500, 400, 110, 0, Math.PI * 3.97, 150)).kind).toBe('loop')
    expect(read(arc(600, 560, 175, 0, Math.PI * 3.2, 150)).kind).toBe('loop')
  })
})

describe('the chalk the tar holds', () => {
  const mark = (points: number, c = 0): Mark => ({ c, p: Array.from({ length: points }, (_, i) => ({ x: i, y: 0 })) })

  it('rubs out the oldest mark past the cap on marks', () => {
    let marks: Mark[] = []
    for (let i = 0; i < MAX_MARKS + 3; i++) marks = addMark(marks, mark(4, i))
    expect(marks.length).toBe(MAX_MARKS)
    expect(marks[0].c).toBe(3)
    expect(marks[marks.length - 1].c).toBe(MAX_MARKS + 2)
  })

  it('rubs out the oldest marks past the cap on points, and always keeps the newest', () => {
    let marks: Mark[] = []
    for (let i = 0; i < 12; i++) marks = addMark(marks, mark(MAX_MARK_POINTS, i))
    expect(marks.reduce((sum, m) => sum + m.p.length, 0)).toBeLessThanOrEqual(MAX_POINTS)
    expect(marks[marks.length - 1].c).toBe(11)
    expect(addMark([], mark(MAX_POINTS + 50)).length).toBe(1)
  })

  it('shows every mark at full strength but the oldest, which pales in two steps as the tar fills', () => {
    expect(strength(MAX_MARKS - 1, MAX_MARKS)).toBe(1)
    expect(strength(0, 3)).toBe(1)
    expect(strength(0, MAX_MARKS - 2)).toBe(1)
    expect(strength(0, MAX_MARKS - 1)).toBe(0.7)
    expect(strength(0, MAX_MARKS)).toBe(0.45)
    expect(strength(1, MAX_MARKS)).toBe(0.7)
    for (let i = 2; i < MAX_MARKS; i++) expect(strength(i, MAX_MARKS)).toBe(1)
    // A tar of a few long marks reaches the cap on points first: the oldest pales toward that one too.
    expect(strength(0, 7, MAX_POINTS - 2 * MAX_MARK_POINTS)).toBe(1)
    expect(strength(0, 7, MAX_POINTS - 2 * MAX_MARK_POINTS + 1)).toBe(0.7)
    expect(strength(0, 7, MAX_POINTS - MAX_MARK_POINTS + 1)).toBe(0.45)
    expect(strength(1, 7, MAX_POINTS)).toBe(1)
    expect(strength(0, 1, MAX_POINTS)).toBe(1)
  })

  it('takes the five chalks in a fixed order', () => {
    expect([0, 1, 2, 3, 4].map(nextChalk)).toEqual([1, 2, 3, 4, 0])
  })
})
