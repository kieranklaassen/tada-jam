import { describe, expect, it } from 'vitest'
import { FULL } from './config'
import { LOG_FACE, LOG_GRAIN, STARS, ropeParts } from './marks'
import { turned } from './paint'
import { ROPE_WIDE } from './parts'

// The marks readers took for signs: stars that lay as two level bars, a
// ladder of two posts with rungs across and then a short rope with two dabs
// on it, and on the end of the log rings that closed into an oval and then
// nested arcs that opened like a fan. Each is held here, as numbers, since no
// test sees the paint: single tilted dabs, one knotted rope with one knot
// where it is short, and a few broken pieces of year rings round a heart
// that lies off the middle.

const DEGREES = Math.PI / 180

describe('the stars', () => {
  it('are one plump dab each, so no star is a pair of bars or a stack of strokes', () => {
    expect(STARS.length).toBeGreaterThan(6)
    for (const star of STARS) expect(star.rx / star.ry).toBeLessThan(1.5)
    // No two stars lie one above the other like the strokes of one sign.
    for (const a of STARS) for (const b of STARS) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(40)
  })

  it('are tilted, every one, and none lies level or stands upright', () => {
    for (const star of STARS) {
      const off = Math.abs(Math.sin(star.tilt)), up = Math.abs(Math.cos(star.tilt))
      expect(off, `the star at ${star.x}`).toBeGreaterThan(Math.sin(20 * DEGREES))
      expect(up, `the star at ${star.x}`).toBeGreaterThan(Math.cos(75 * DEGREES))
    }
  })

  it('are no two of a size or a tilt', () => {
    expect(new Set(STARS.map((star) => star.rx)).size).toBe(STARS.length)
    expect(new Set(STARS.map((star) => star.tilt)).size).toBe(STARS.length)
  })

  it('are painted at their tilt: a dab turned about its middle is longest along the tilt', () => {
    const star = STARS[0]
    const ends = turned([{ x: star.x - star.rx, y: star.y }, { x: star.x + star.rx, y: star.y }], star.x, star.y, star.tilt)
    expect(Math.atan2(ends[1].y - ends[0].y, ends[1].x - ends[0].x)).toBeCloseTo(star.tilt, 6)
    expect(Math.abs(ends[1].y - ends[0].y)).toBeGreaterThan(star.rx)
  })
})

describe('the rope under a bell house\'s door', () => {
  const SIZES = Array.from({ length: FULL }, (_, i) => i + 1)

  it('is one rope and nothing across it: no second post, and no knot wide enough to be a rung', () => {
    for (const size of SIZES) {
      const rope = ropeParts(size)
      // One line from the door to the moss, going down all the way: it never doubles back to make a second post.
      for (let i = 1; i < rope.line.length; i++) expect(rope.line[i].y).toBeGreaterThan(rope.line[i - 1].y)
      // A knot is a swelling on the rope, on the rope: under four times as wide as the rope is painted.
      for (const knot of rope.knots) {
        expect(knot.r * 2).toBeLessThan(ROPE_WIDE * 4)
        const nearest = Math.min(...rope.line.map((p) => Math.hypot(p.x - knot.x, p.y - knot.y)))
        expect(nearest).toBeLessThan(3.5)
      }
      // The frayed end is two short strands, far shorter than a rung was.
      expect(rope.tuft.length).toBe(2)
      for (const [a, b] of rope.tuft) expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(7)
    }
  })

  it('hangs askew and in a slack curve, never a straight upright line', () => {
    for (const size of SIZES) {
      const { line } = ropeParts(size), top = line[0], foot = line[line.length - 1]
      expect(Math.abs(foot.x - top.x), `size ${size}`).toBeGreaterThanOrEqual(4)
      // How far the rope bows off the straight line from its top to its foot.
      const length = Math.hypot(foot.x - top.x, foot.y - top.y)
      const bow = Math.max(...line.map((p) => Math.abs((foot.x - top.x) * (p.y - top.y) - (foot.y - top.y) * (p.x - top.x)) / length))
      expect(bow, `size ${size}`).toBeGreaterThan(1.5)
    }
  })

  it('has one knot on a rope too short for two, and never two dabs close together on a short line', () => {
    for (const size of SIZES) {
      const rope = ropeParts(size), top = rope.line[0], foot = rope.line[rope.line.length - 1], length = foot.y - top.y
      const knots = [...rope.knots].sort((a, b) => a.y - b.y)
      expect(knots.length, `size ${size}`).toBeGreaterThanOrEqual(1)
      expect(knots.length).toBeLessThanOrEqual(5)
      // Under about a finger's half of rope there is room for one knot and the tuft, and no more.
      if (length < 30) expect(knots.length, `size ${size}`).toBe(1)
      // Two knots on one rope lie well apart: farther than the two of them are wide together, and then some.
      for (let i = 1; i < knots.length; i++) expect(knots[i].y - knots[i - 1].y, `size ${size}`).toBeGreaterThan(1.5 * (knots[i].r + knots[i - 1].r))
      if (knots.length === 2) expect(knots[1].y - knots[0].y, `size ${size}`).toBeGreaterThan(15)
      // The one knot of a short rope is not at its end, where it would sit on the tuft like a second dab.
      expect(foot.y - knots[knots.length - 1].y, `size ${size}`).toBeGreaterThan(knots.length === 1 ? length * 0.4 : 2)
    }
    expect(ropeParts(1).knots.length).toBe(1)
    expect(ropeParts(FULL).knots.length).toBeGreaterThanOrEqual(3)
  })

  it('has knots no two of a size, and three or more at uneven steps', () => {
    for (const size of SIZES) {
      const knots = [...ropeParts(size).knots].sort((a, b) => a.y - b.y)
      expect(new Set(knots.map((knot) => knot.r)).size).toBe(knots.length)
      const steps = knots.slice(1).map((knot, i) => knot.y - knots[i].y)
      for (const step of steps) expect(step).toBeGreaterThan(4)
      for (let i = 1; i < steps.length; i++) expect(Math.abs(steps[i] - steps[i - 1]), `size ${size}`).toBeGreaterThan(1.5)
    }
  })

  it('frays into two strands of unequal length that are no mirrored pair', () => {
    const [[end, left], [, right]] = ropeParts(6).tuft
    expect(Math.abs(left.x - end.x)).not.toBeCloseTo(Math.abs(right.x - end.x), 1)
    expect(left.y).not.toBe(right.y)
  })

  it('is let down a share at a time: it grows longer, and a knot shows once the rope has reached it', () => {
    for (const size of [1, 6, FULL]) {
      const whole = ropeParts(size)
      let last = -Infinity, knots = 0
      for (const share of [0, 0.2, 0.45, 0.7, 1]) {
        const part = ropeParts(size, share), foot = part.line[part.line.length - 1]
        expect(foot.y).toBeGreaterThan(last)
        expect(part.knots.length).toBeGreaterThanOrEqual(knots)
        for (const knot of part.knots) expect(knot.y).toBeLessThanOrEqual(foot.y + 1e-6)
        last = foot.y
        knots = part.knots.length
      }
      expect(ropeParts(size, 0).knots.length).toBe(0)
      expect(knots).toBe(whole.knots.length)
    }
  })
})

describe('the grain on the end of the log', () => {
  const RAD = Math.PI / 180
  const pieces = LOG_GRAIN.pieces
  const sweep = (piece: { from: number; to: number }): number => piece.to - piece.from
  /** A point of a piece, at an angle in degrees, from the middle of the log's end. */
  const at = (r: number, angle: number): { x: number; y: number } => ({ x: LOG_GRAIN.dx + r * Math.cos(angle * RAD), y: LOG_GRAIN.dy + r * Math.sin(angle * RAD) })
  const onFace = (p: { x: number; y: number }): boolean => (p.x / (LOG_FACE.rx - 2.5)) ** 2 + (p.y / (LOG_FACE.ry - 2.5)) ** 2 < 1
  /** How many degrees two pieces share, as seen from the heart. */
  const shared = (a: { from: number; to: number }, b: { from: number; to: number }): number => {
    let most = 0
    for (const turn of [-360, 0, 360]) most = Math.max(most, Math.min(a.to, b.to + turn) - Math.max(a.from, b.from + turn))
    return Math.max(0, most)
  }

  it('is off-centre: the heart the pieces lie round is on the end of the log and not in its middle', () => {
    expect(onFace({ x: LOG_GRAIN.dx, y: LOG_GRAIN.dy })).toBe(true)
    expect(Math.hypot(LOG_GRAIN.dx, LOG_GRAIN.dy)).toBeGreaterThan(5)
  })

  it('is broken: every piece is a short arc that lies on the end with both its ends, and none is a half ring', () => {
    expect(pieces.length).toBeGreaterThanOrEqual(3)
    for (const piece of pieces) {
      expect(sweep(piece), `the piece at ${piece.r}`).toBeGreaterThan(30)
      expect(sweep(piece), `the piece at ${piece.r}`).toBeLessThanOrEqual(90)
      for (const angle of [piece.from, (piece.from + piece.to) / 2, piece.to]) expect(onFace(at(piece.r, angle)), `the piece at ${piece.r}`).toBe(true)
    }
  })

  it('is no fan of nested arcs: a piece and the next one out lie on different sides of the heart', () => {
    for (let i = 1; i < pieces.length; i++) expect(shared(pieces[i - 1], pieces[i]), `the pieces at ${pieces[i - 1].r} and ${pieces[i].r}`).toBe(0)
    // And no direction from the heart is crossed by more than two pieces.
    for (let angle = 0; angle < 360; angle += 5) expect(pieces.filter((piece) => shared(piece, { from: angle, to: angle + 0.01 }) > 0).length).toBeLessThanOrEqual(2)
  })

  it('closes no ring: all the pieces together leave more than a third of the way round open, in three gaps or more', () => {
    let open = 0, gaps = 0, before = true
    for (let angle = 0; angle < 360; angle += 1) {
      const covered = pieces.some((piece) => shared(piece, { from: angle, to: angle + 0.01 }) > 0)
      if (!covered) open += 1
      if (!covered && before) gaps += 1
      before = covered
    }
    expect(open).toBeGreaterThan(120)
    expect(gaps).toBeGreaterThanOrEqual(3)
  })

  it('is uneven: no two pieces of a length or a width, and the steps between them differ', () => {
    expect(new Set(pieces.map((piece) => sweep(piece))).size).toBe(pieces.length)
    expect(new Set(pieces.map((piece) => piece.wide)).size).toBe(pieces.length)
    const steps = pieces.slice(1).map((piece, i) => piece.r - pieces[i].r)
    for (const step of steps) expect(step).toBeGreaterThan(4)
    expect(new Set(steps).size).toBe(steps.length)
  })
})
