import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GLOW_COATS, HAND, STIR, WIND_HAIR, handOutline, stirOutline, paintAcorn, paintAirLeaf, paintCheek, paintFlush, paintFrond, paintGlow, paintHand, paintLid, paintMitt, paintPupil, paintShade, paintShut, paintStir, paintToad, paintWind } from './castArt'
import { GUST_BEND, gustAxis } from './castView'
import { TIERS } from './config'
import type { Wax } from './crayon'
import { Painter } from './painter'
import { CAP_RIM, CAP_SCALE, SEED_STRIPES, TWIG_KNOTS, TWIG_OUTLINE, TWIG_PRESSED, capScales, paintEye, paintHeap, paintPale, paintPart } from './partArt'
import { KINDS } from './parts'
import { paintScenery } from './scenery'
import { DT, RecordingPen, clearing, thing, toyOf } from './testing'
import { SCUFF, drawFrame } from './view'

// The shapes the game itself draws, held where a test can hold them: the
// numbers a drawing is made from, and every line a crayon presses down,
// written down by a crayon that draws nothing. What a test cannot see is
// what a picture looks like: that is said under "Reader" in REFINEMENT.md.

type Pressed = { points: number[]; closed: boolean }
type Seen = { pressed: Pressed[]; scribbled: { x: number; y: number; r: number }[] }

/** A crayon that draws nothing and writes down every line it is asked to press and every patch it is asked to scribble. */
function crayon(): { wax: Wax; seen: Seen } {
  const seen: Seen = { pressed: [], scribbled: [] }
  const nothing: unknown = new Proxy(function () {}, { get: (_t, key) => (key === 'canvas' ? { width: 0, height: 0 } : nothing), apply: () => nothing, set: () => true })
  const wax = {
    ctx: nothing,
    jitter: () => 0,
    press: (points: readonly number[], _ink: unknown, _width: number, _alpha?: number, closed = false) => { seen.pressed.push({ points: [...points], closed }) },
    scribble: (_shape: unknown, box: { x: number; y: number; r: number }) => { seen.scribbled.push(box) },
    fill: (_shape: unknown, box: { x: number; y: number; r: number }) => { seen.scribbled.push(box) },
    fray: () => {},
    grain: () => {},
  }
  return { wax: wax as unknown as Wax, seen }
}

const had = (globalThis as { Path2D?: unknown }).Path2D
beforeAll(() => {
  // A path that keeps nothing: the drawings are made of them, and nothing here is put on a canvas.
  ;(globalThis as { Path2D?: unknown }).Path2D = class { moveTo(): void {} lineTo(): void {} quadraticCurveTo(): void {} bezierCurveTo(): void {} ellipse(): void {} arc(): void {} rect(): void {} closePath(): void {} addPath(): void {} }
})
afterAll(() => { (globalThis as { Path2D?: unknown }).Path2D = had })

/** How far a line turns from end to end, adding every bend whichever way it goes, and how far it turns one way more than the other. */
function turning(points: readonly number[]): { all: number; net: number; sharp: number } {
  let all = 0, net = 0, sharp = 0, last = 0
  for (let i = 2; i + 3 < points.length; i += 2) {
    const a = Math.atan2(points[i + 1] - points[i - 1], points[i] - points[i - 2]), b = Math.atan2(points[i + 3] - points[i + 1], points[i + 2] - points[i])
    let d = b - a
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    all += Math.abs(d); net += d
    // A sharp bend that goes the other way from the sharp bend before it: the tooth of a zigzag.
    if (Math.abs(d) > 1) { if (last !== 0 && Math.sign(d) !== last) sharp++; last = Math.sign(d) }
  }
  return { all, net: Math.abs(net), sharp }
}

/** Every picture the game keeps, by name, drawn with the crayon that only writes down. */
function everyPicture(): Record<string, Seen> {
  const all: Record<string, Seen> = {}
  const draw = (name: string, paint: (wax: Wax) => void): void => { const { wax, seen } = crayon(); paint(wax); all[name] = seen }
  for (const kind of KINDS) { for (let look = 0; look < 3; look++) draw(`${kind} ${look}`, (wax) => paintPart(wax, kind, look)); draw(`heap of ${kind}`, (wax) => paintHeap(wax, kind)) }
  draw('pale wing', paintPale)
  for (const gaze of [0, 5, 16]) draw(`eye ${gaze}`, (wax) => paintEye(wax, 0, gaze))
  draw('big wind child', (wax) => paintWind(wax, 'big')); draw('small wind child', (wax) => paintWind(wax, 'small'))
  draw('toad', paintToad); draw('lid', paintLid); draw('frond', (wax) => paintFrond(wax, 236)); draw('ghost hand', paintHand); draw('glow', paintGlow)
  draw('acorn', paintAcorn); draw('flush', paintFlush); draw('shut eye', paintShut); draw('mitt', paintMitt); draw('stirring hand', paintStir)
  draw('shade', paintShade); draw('air leaf', (wax) => paintAirLeaf(wax, 0)); draw('pupil', paintPupil); draw('cheek', paintCheek)
  draw('the place', (wax) => paintScenery(wax, { x: 24, y: 24 }))
  return all
}

describe('what every pressed line is held to', () => {
  it('no pressed line curls: none turns on round more than three quarters of a circle, unless it closes on itself as a ring or an outline does', () => {
    const pictures = everyPicture()
    let lines = 0
    for (const [name, seen] of Object.entries(pictures)) {
      for (const line of seen.pressed) {
        lines++
        if (line.closed) continue
        const first = [line.points[0], line.points[1]], last = line.points.slice(-2)
        if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 3 && line.points.length > 6) continue
        expect(turning(line.points).net, `${name}: ${line.points.join(' ')}`).toBeLessThanOrEqual(Math.PI * 1.5)
      }
    }
    // The drawings were really made: hundreds of lines were pressed.
    expect(lines).toBeGreaterThan(300)
    expect(Object.keys(pictures).length).toBeGreaterThan(45)
  })

  it('no pressed line of a part, a hand, a wind child or the toad is a zigzag: at most one sharp bend goes back on the one before it', () => {
    for (const [name, seen] of Object.entries(everyPicture())) {
      // Grass, fronds and the far trees are in the place and are listed under "Reader".
      if (name === 'the place' || name === 'frond') continue
      for (const line of seen.pressed) if (!line.closed) expect(turning(line.points).sharp, `${name}: ${line.points.join(' ')}`).toBeLessThanOrEqual(1)
    }
  })
})

describe('a seed', () => {
  it('has stripes that run its length, bend, differ in length and meet at the tip: never level bars', () => {
    expect(SEED_STRIPES.length).toBe(2)
    const length = (line: readonly number[]): number => { let d = 0; for (let i = 2; i < line.length; i += 2) d += Math.hypot(line[i] - line[i - 2], line[i + 1] - line[i - 1]); return d }
    const lengths = SEED_STRIPES.map(length)
    expect(Math.max(...lengths) / Math.min(...lengths)).toBeGreaterThan(1.2)
    for (const line of SEED_STRIPES) {
      const xs = line.filter((_, i) => i % 2 === 0), ys = line.filter((_, i) => i % 2 === 1)
      // Along the seed, toward the tip, all the way.
      for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1])
      expect(xs[xs.length - 1] - xs[0]).toBeGreaterThan(2.5 * (Math.max(...ys) - Math.min(...ys)))
      // Bent: its middle is off the straight line between its ends.
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(4)
      expect(turning(line).all).toBeGreaterThan(0.3)
    }
    // They meet at the tip, and start apart on the two sides of the seed.
    const tips = SEED_STRIPES.map((line) => line.slice(-2)), starts = SEED_STRIPES.map((line) => line.slice(0, 2))
    expect(Math.hypot(tips[0][0] - tips[1][0], tips[0][1] - tips[1][1])).toBeLessThanOrEqual(3)
    expect(starts[0][1] * starts[1][1]).toBeLessThan(0)
    expect(Math.abs(starts[0][0] - starts[1][0])).toBeGreaterThan(6)
    // And the drawing presses these and no others.
    const { wax, seen } = crayon()
    paintPart(wax, 'seed', 0)
    expect(seen.pressed.map((line) => line.points)).toEqual(SEED_STRIPES.map((line) => [...line]))
  })
})

describe('a cap', () => {
  it('is hatched with rows of small arcs, every one inside its rim and clear of its stalk, and with nothing else', () => {
    const scales = capScales()
    expect(scales.length).toBeGreaterThan(15)
    const rows = new Map<number, number[]>()
    for (const arc of scales) {
      for (let i = 0; i < arc.length; i += 2) expect(Math.hypot(arc[i], arc[i + 1])).toBeLessThan(CAP_RIM - 2)
      // Small, and an arc: its ends level and its middle lower.
      expect(arc[arc.length - 2] - arc[0]).toBeLessThan(CAP_SCALE.across)
      expect(arc[1]).toBe(arc[arc.length - 1])
      expect(arc[5] - arc[1]).toBeGreaterThan(2)
      rows.set(arc[1], [...(rows.get(arc[1]) ?? []), arc[0]])
    }
    // Rows, each set off from the next by half a scale, and no arc touching its neighbour in the row.
    expect(rows.size).toBeGreaterThanOrEqual(5)
    const starts = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, xs]) => xs.sort((a, b) => a - b))
    for (const xs of starts) for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(CAP_SCALE.across - 0.01)
    const across = CAP_SCALE.across
    for (let r = 1; r < starts.length; r++) expect((((starts[r][0] - starts[r - 1][0]) % across) + across) % across).toBeCloseTo(across / 2)
    const { wax, seen } = crayon()
    paintPart(wax, 'cap', 1)
    expect(seen.pressed.map((line) => line.points)).toEqual(scales)
  })
})

describe('a twig', () => {
  it('is one post with two knots and a broken end: one line pressed along it, nothing across it and nothing branching from it', () => {
    const { wax, seen } = crayon()
    paintPart(wax, 'twig', 0)
    expect(seen.pressed.map((line) => line.points)).toEqual(TWIG_PRESSED.map((line) => [...line]))
    expect(TWIG_PRESSED).toHaveLength(1)
    for (const line of TWIG_PRESSED) {
      const xs = line.filter((_, i) => i % 2 === 0), ys = line.filter((_, i) => i % 2 === 1)
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(8 * (Math.max(...ys) - Math.min(...ys)))
    }
    // One body and its knots are all that is filled: no side shoot.
    expect(seen.scribbled).toHaveLength(1 + TWIG_KNOTS.length)
    expect(TWIG_KNOTS).toHaveLength(2)
    expect(TWIG_KNOTS[0][2]).not.toBe(TWIG_KNOTS[1][2])
    expect(Math.abs(TWIG_KNOTS[0][0])).not.toBe(Math.abs(TWIG_KNOTS[1][0]))
    // The far end is broken: the outline goes in and out there, and the stem end is cut clean.
    const far: number[] = [], near: number[] = []
    for (let i = 0; i < TWIG_OUTLINE.length; i += 2) (TWIG_OUTLINE[i] > 40 ? far : TWIG_OUTLINE[i] < -40 ? near : []).push(TWIG_OUTLINE[i])
    expect(far.length).toBeGreaterThanOrEqual(5)
    let jags = 0
    for (let i = 2; i < far.length; i++) if ((far[i] - far[i - 1]) * (far[i - 1] - far[i - 2]) < 0) jags++
    expect(jags).toBeGreaterThanOrEqual(2)
    expect(near).toHaveLength(2)
  })
})

describe('the ghost hand', () => {
  it('is an open hand seen from above with its fingers together, like the wind child\'s mitten: one top and no finger of its own, the thumb out to the side and lower', () => {
    const { wax, seen } = crayon()
    paintHand(wax)
    const outline = handOutline()
    // One line is pressed, and it is the outline of the hand, closed.
    expect(seen.pressed).toEqual([{ points: outline, closed: true }])
    // Its upper edge, above the thumb, goes up to one top and down again and never dips between: no finger stands
    // apart, so it shows no count and no single digit.
    const upper: { x: number; y: number }[] = []
    for (let i = 0; i < outline.length; i += 2) if (outline[i + 1] < HAND.thumb[1] - 6) upper.push({ x: outline[i], y: outline[i + 1] })
    expect(upper.length).toBeGreaterThanOrEqual(6)
    for (let i = 1; i < upper.length; i++) expect(upper[i].x).toBeGreaterThan(upper[i - 1].x)
    let turns = 0, way = 0
    for (let i = 1; i < upper.length; i++) { const now = Math.sign(upper[i].y - upper[i - 1].y); if (now !== 0 && way !== 0 && now !== way) turns++; if (now !== 0) way = now }
    expect(turns).toBe(1)
    expect(Math.min(...upper.map((point) => point.y))).toBe(HAND.top[1])
    expect(outline).toEqual(expect.arrayContaining([HAND.top[0], HAND.top[1]]))
    // It is as wide as a hand, not as a finger.
    expect(upper[upper.length - 1].x - upper[0].x).toBeGreaterThan(44)
    // The thumb is out to the side of it and lower than its top by most of its height.
    expect(HAND.thumb[0]).toBeLessThan(upper[0].x - 6)
    expect(HAND.thumb[1]).toBeGreaterThan(HAND.top[1] + 30)
    // It touches with its top, which the view puts on the heap.
    expect(HAND.top[1]).toBeLessThan(-34)
  })
})

describe('the wind children', () => {
  it('have hair that is tufts of scribble with no line to it', () => {
    for (const who of ['big', 'small'] as const) {
      const { wax, seen } = crayon()
      paintWind(wax, who)
      // Each tuft is scribbled where the hair is, twice over.
      for (const [x, y] of WIND_HAIR[who]) expect(seen.scribbled.filter((box) => box.x === x && box.y === y).length, `${who} tuft at ${x},${y}`).toBe(2)
      // No line is pressed as hair: none lies wholly within a tuft. (The outline of the head passes under the tufts that sit on it.)
      for (const line of seen.pressed) {
        for (const [x, y, r] of WIND_HAIR[who]) {
          let outside = 0
          for (let i = 0; i < line.points.length; i += 2) if (Math.hypot(line.points[i] - x, line.points[i + 1] - y) > r + 4) outside++
          expect(outside, `${who}: a line drawn as the tuft at ${x},${y}`).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('the small wind child\'s hand', () => {
  it('is an open hand with its fingers together, like a mitten: one rounded top and no finger of its own, a thumb out to the side and lower, and a scribbled puff of wind beside it', () => {
    const { wax, seen } = crayon()
    paintStir(wax)
    // One line is pressed, and it is the outline of the hand, closed.
    expect(seen.pressed).toHaveLength(1)
    expect(seen.pressed[0].closed).toBe(true)
    expect(seen.pressed[0].points).toEqual(stirOutline())
    // Read from the outline itself. Its upper edge, above the thumb, goes up to one top and down again and never
    // dips between: no finger stands up from it, so it shows no count and no single digit.
    const outline = stirOutline(), upper: { x: number; y: number }[] = []
    for (let i = 0; i < outline.length; i += 2) if (outline[i + 1] < STIR.thumb[1] - 6) upper.push({ x: outline[i], y: outline[i + 1] })
    expect(upper.length).toBeGreaterThanOrEqual(6)
    for (let i = 1; i < upper.length; i++) expect(upper[i].x).toBeGreaterThan(upper[i - 1].x)
    let turns = 0, way = 0
    for (let i = 1; i < upper.length; i++) { const now = Math.sign(upper[i].y - upper[i - 1].y); if (now !== 0 && way !== 0 && now !== way) turns++; if (now !== 0) way = now }
    expect(turns).toBe(1)
    expect(Math.min(...upper.map((point) => point.y))).toBe(STIR.top)
    // It is as wide as a hand, not as a finger.
    expect(upper[upper.length - 1].x - upper[0].x).toBeGreaterThan(44)
    // The thumb is out to the side of it and lower than its top by most of its height.
    expect(STIR.thumb[0]).toBeLessThan(upper[0].x - 6)
    expect(STIR.thumb[1]).toBeGreaterThan(STIR.top + 30)
    // The wind it stirs is a puff of scribble with nothing pressed in it.
    expect(seen.scribbled.some((box) => box.x === STIR.puff.x && box.y === STIR.puff.y)).toBe(true)
  })
})

describe('the idle glow', () => {
  it('is a warm yellow light: a solid pale coat first, yellows over it, and no coat that is dark or grey', () => {
    const [first, ...rest] = GLOW_COATS
    // Solid: no ground shows between its strokes or through them.
    expect(first.stroke.alpha).toBe(1)
    expect(first.stroke.width).toBeGreaterThanOrEqual(first.stroke.gap * 2)
    expect(rest.length).toBeGreaterThanOrEqual(1)
    for (const { ink } of GLOW_COATS) {
      const [red, green, blue] = ink
      // Light and warm: red and green high, blue the least.
      expect(red).toBeGreaterThanOrEqual(230)
      expect(green).toBeGreaterThanOrEqual(200)
      expect(blue).toBeLessThan(green)
    }
  })

  it('is laid whole whenever it is laid, however faint the hint: it comes by growing, and never as a thin wash over the dark earth', () => {
    const sizes: number[] = []
    for (const glow of [0.02, 0.2, 0.5, 0.8, 1]) {
      const toy = toyOf(clearing([])), pen = new RecordingPen()
      drawFrame(pen, toy, { glow, demo: null, demoIndex: -1 }, TIERS[0], new Painter())
      const stamps = pen.log.filter((line) => line.startsWith('|stamp|glow,')).map((line) => line.split('|')[2].split(','))
      expect(stamps).toHaveLength(1)
      // No alpha is given, or it is 1.
      expect(stamps[0][6] === undefined || Number(stamps[0][6]) === 1, `glow ${glow}: ${stamps[0].join(',')}`).toBe(true)
      sizes.push(Number(stamps[0][4]))
    }
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1])
    expect(sizes[0]).toBeGreaterThan(0.45)
  })
})

describe('the live strokes', () => {
  /** Every live line of 600 frames of a storm: gusts every two and a half seconds, a finger on bare earth now and then. */
  function storm(seed = 1, frames = 600): { lines: { points: number[]; ink: string }[]; dots: number } {
    const toy = toyOf(clearing([thing(1, 500, 440, ['twig', 'twig', 'maple', 'cap', 'cap'], 1), thing(2, 720, 470, ['twig', 'twig', 'cap', 'cap'], 2)]), seed)
    const pen = new RecordingPen(), painter = new Painter(), lines: { points: number[]; ink: string }[] = []
    let dots = 0
    for (let f = 0; f < frames; f++) {
      if (f % 150 === 20) { toy.cast.breatheIn('big', true); toy.cast.breatheIn('small', true) }
      if (f % 200 === 100) { toy.press(300, 420); toy.tap() }
      toy.step(DT)
      pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter)
      for (const line of pen.log) {
        if (line.startsWith('|dot|')) dots++
        if (!line.startsWith('|line|')) continue
        const fields = line.split('|')[2].split(',')
        lines.push({ points: fields[0].split(' ').map(Number), ink: fields[1] })
      }
    }
    return { lines, dots }
  }

  it('draws a gust as lines that wave and never loop: each goes on along its own way from end to end, bends to both sides of it, and none is a straight dash', () => {
    const gusts = storm().lines.filter((line) => line.ink === 'gust')
    expect(gusts.length).toBeGreaterThan(300)
    const axes = [0, 1, 2, 3, 4, 5, 6, 7].map(gustAxis)
    let waved = 0
    for (const { points } of gusts) {
      // The way it sweeps along: that of the line it is a stretch of, which is the one its first point lies nearest.
      const off = (axis: (typeof axes)[number], x: number, y: number): number => ((x - axis.x0) * (axis.y1 - axis.y0) - (y - axis.y0) * (axis.x1 - axis.x0)) / Math.hypot(axis.x1 - axis.x0, axis.y1 - axis.y0)
      const axis = axes.reduce((best, one) => (Math.abs(off(one, points[0], points[1])) + Math.abs(off(one, points[18], points[19])) < Math.abs(off(best, points[0], points[1])) + Math.abs(off(best, points[18], points[19])) ? one : best))
      const long = Math.hypot(axis.x1 - axis.x0, axis.y1 - axis.y0)
      const along = (x: number, y: number): number => ((x - axis.x0) * (axis.x1 - axis.x0) + (y - axis.y0) * (axis.y1 - axis.y0)) / long
      const sides: number[] = []
      for (let i = 0; i < points.length; i += 2) {
        // It never goes back along its way: so it cannot cross itself.
        if (i > 0) expect(along(points[i], points[i + 1]) - along(points[i - 2], points[i - 1]), points.join(' ')).toBeGreaterThan(0)
        sides.push(off(axis, points[i], points[i + 1]))
      }
      // Not a straight dash.
      const ex = points[18] - points[0], ey = points[19] - points[1], chord = Math.hypot(ex, ey)
      let bend = 0
      for (let i = 2; i < 18; i += 2) bend = Math.max(bend, Math.abs((points[i] - points[0]) * ey - (points[i + 1] - points[1]) * ex) / chord)
      expect(bend).toBeGreaterThanOrEqual(GUST_BEND - 0.3)
      // A wave: it swings one way and back.
      let ups = 0, downs = 0
      for (let i = 1; i < sides.length; i++) { if (sides[i] > sides[i - 1] + 0.3) ups++; if (sides[i] < sides[i - 1] - 0.3) downs++ }
      if (ups > 0 && downs > 0) waved++
    }
    expect(waved).toBeGreaterThan(gusts.length * 0.8)
  })

  it('leans every gust line: at any seed no line, and no stretch of one, is steeper than half-way between level and upright, so none is a long wave stood on end', () => {
    // The ways the lines sweep along lean well under that by themselves.
    // (A gust has five lines at most, on the top tier.)
    for (let i = 0; i < Math.max(...TIERS.map((tier) => tier.gustLines)); i++) { const axis = gustAxis(i); expect(Math.abs(axis.y1 - axis.y0), `line ${i}`).toBeLessThan(Math.abs(axis.x1 - axis.x0) * 0.45) }
    let seen = 0
    for (let seed = 1; seed <= 8; seed++) {
      for (const { points } of storm(seed, 320).lines.filter((line) => line.ink === 'gust')) {
        seen++
        // From end to end, and stretch by stretch.
        expect(Math.abs(points[19] - points[1]), points.join(' ')).toBeLessThanOrEqual(Math.abs(points[18] - points[0]))
        for (let i = 2; i < points.length; i += 2) expect(Math.abs(points[i + 1] - points[i - 1]), points.join(' ')).toBeLessThanOrEqual(Math.abs(points[i] - points[i - 2]))
      }
    }
    expect(seen).toBeGreaterThan(800)
  })

  it('marks bare earth under a finger with a smudge and a puff of dust, two dots and no line, and one mark at a time', () => {
    const toy = toyOf(clearing([]))
    const pen = new RecordingPen(), painter = new Painter()
    drawFrame(pen, toy, null, TIERS[0], painter)
    pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter)
    const quiet = { lines: pen.log.filter((line) => line.startsWith('|line|')).length, dots: pen.log.filter((line) => line.startsWith('|dot|')).length }
    toy.press(300, 420); toy.tap()
    toy.press(340, 440); toy.tap()
    expect(toy.scuffs).toHaveLength(1)
    toy.step(DT)
    pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter)
    expect(pen.log.filter((line) => line.startsWith('|line|')).length).toBe(quiet.lines)
    const dots = pen.log.filter((line) => line.startsWith('|dot|')).map((line) => line.split('|')[2].split(','))
    expect(dots.length).toBe(quiet.dots + 2)
    // The smudge lies where the finger was, wider than it is high; the dust is smaller, and above it.
    const marks = dots.filter((dot) => Math.hypot(Number(dot[0]) - 340, Number(dot[1]) - 440) < 40)
    expect(marks).toHaveLength(2)
    expect(Number(marks[0][2])).toBeGreaterThan(Number(marks[0][3]) * 1.5)
    expect(Number(marks[1][1])).toBeLessThan(Number(marks[0][1]))
    expect(Number(marks[1][2])).toBeLessThan(Number(marks[0][2]))
    // It fades and is gone.
    for (let f = 0; f < Math.round(SCUFF / DT) + 2; f++) toy.step(DT)
    expect(toy.scuffs).toEqual([])
    // No line in soil is ever drawn, in a storm with the finger on the earth again and again.
    expect(storm().lines.filter((line) => line.ink.startsWith('soil'))).toEqual([])
  })
})
