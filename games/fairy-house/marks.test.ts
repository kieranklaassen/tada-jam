import { describe, expect, it } from 'vitest'
import type { Sheet } from './art'
import { FOLK } from './folk'
import { FOUND } from './kinds'
import { INK } from './lie'
import { BRUSH_BRISTLES, CAP_STRIPES, FAR_BIRDS, HAND_CREASES, SHUT_FROM, TOWEL_FRINGE, TWIGS, WALL_MARKS, eyeFor, lash, puddle, type Stroke } from './marks'
import type { Pen } from './pencil'
import { freshSave } from './save'
import { STAGE } from './stage'
import { SUN_AT, TICK, Toy } from './toy'
import { FACE, View } from './view'

// The marks a reader could take for a numeral, a letter or a sign if they
// were drawn evenly. Each is held uneven here.

const chord = (s: Stroke): number => Math.hypot(s.points[4] - s.points[0], s.points[5] - s.points[1])
const heading = (s: Stroke): number => Math.atan2(s.points[5] - s.points[1], s.points[4] - s.points[0])
/** How far the middle of the curve lies off the straight line between its ends: positive on one side, negative on the other. */
function bow(s: Stroke): number {
  const [x0, y0, cx, cy, x1, y1] = s.points
  return ((cx - x0) * (y1 - y0) - (cy - y0) * (x1 - x0)) / chord(s) / 2
}
/** Whether a stroke is a level bar: straight, and its ends at one height. */
const levelBar = (s: Stroke): boolean => Math.abs(bow(s)) < 1 && Math.abs(s.points[5] - s.points[1]) < 1.5
const pairs = <T,>(list: readonly T[]): [T, T][] => list.flatMap((a, i) => list.slice(i + 1).map((b): [T, T] => [a, b]))
/** The area of a closed outline. */
function area(points: readonly number[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i += 2) {
    const j = (i + 2) % points.length
    sum += points[i] * points[j + 1] - points[j] * points[i + 1]
  }
  return Math.abs(sum) / 2
}
const spanOf = (points: readonly number[], axis: 0 | 1): number => {
  const values = points.filter((_, i) => i % 2 === axis)
  return Math.max(...values) - Math.min(...values)
}

describe('no mark of the look is drawn evenly', () => {
  it('bows every stripe of the nightcap and turns each with the cap: no two alike in length, width, heading or spacing', () => {
    expect(CAP_STRIPES.length).toBeGreaterThanOrEqual(3)
    for (const stripe of CAP_STRIPES) expect(Math.abs(bow(stripe))).toBeGreaterThan(1.5)
    for (const [a, b] of pairs(CAP_STRIPES)) {
      expect(Math.abs(chord(a) - chord(b))).toBeGreaterThan(2)
      expect(Math.abs(a.width - b.width)).toBeGreaterThan(0.3)
      // They follow the cap's curve: no two run the same way.
      expect(Math.abs(heading(a) - heading(b))).toBeGreaterThan(0.15)
    }
    // From the brow round to the tail each lies turned further than the one before, as the cap turns.
    const turns = CAP_STRIPES.map(heading)
    for (let i = 1; i < turns.length; i++) expect(turns[i]).toBeGreaterThan(turns[i - 1])
    const gaps = CAP_STRIPES.slice(1).map((stripe, i) => Math.hypot(stripe.points[0] - CAP_STRIPES[i].points[0], stripe.points[1] - CAP_STRIPES[i].points[1]))
    for (const [a, b] of pairs(gaps)) expect(Math.abs(a - b)).toBeGreaterThan(3)
  })

  it('gives every twig a look of its own, so that two posts side by side are never twins: each bends its own way and shoots at its own side and height', () => {
    // One look for each twig in the wood.
    expect(TWIGS.length).toBe(FOUND.filter((found) => found.kind === 'twig').length)
    const at = (points: readonly number[], axis: 0 | 1): number[] => points.filter((_, i) => i % 2 === axis)
    /** Where the stem's middle is at a height: the bend of the post. */
    const middleAt = (stem: readonly number[], y: number): number => {
      const cuts: number[] = []
      for (let i = 0; i < stem.length; i += 2) {
        const j = (i + 2) % stem.length
        const [x0, y0, x1, y1] = [stem[i], stem[i + 1], stem[j], stem[j + 1]]
        if ((y0 - y) * (y1 - y) < 0) cuts.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0))
      }
      return (Math.min(...cuts) + Math.max(...cuts)) / 2
    }
    /** The longest shoot of a twig: which side it grows on, where it leaves the stem and how far out it reaches. */
    const shootOf = (look: (typeof TWIGS)[number]): { side: number; from: number; out: number } => {
      const longest = [...look.shoots].sort((a, b) => Math.max(...at(b.points, 0).map(Math.abs)) - Math.max(...at(a.points, 0).map(Math.abs)))[0]
      const out = at(longest.points, 0).reduce((far, x) => (Math.abs(x) > Math.abs(far) ? x : far), 0)
      return { side: Math.sign(out), from: longest.points[1], out: Math.abs(out) }
    }
    for (const look of TWIGS) {
      // Every stem stands in the room a twig takes and is as high as a twig, so each carries alike: only the look differs.
      expect(Math.min(...at(look.stem, 0))).toBeGreaterThanOrEqual(INK.twig.x)
      expect(Math.max(...at(look.stem, 0))).toBeLessThanOrEqual(INK.twig.x + INK.twig.w)
      expect(Math.min(...at(look.stem, 1))).toBe(INK.twig.y)
      expect(Math.max(...at(look.stem, 1))).toBe(0)
      expect(Math.min(...at(look.stump, 1))).toBeGreaterThanOrEqual(INK.stump.y)
      expect(Math.min(...at(look.stump, 1))).toBeLessThanOrEqual(INK.stump.y + 3)
      expect(Math.min(...at(look.stump, 0))).toBeGreaterThanOrEqual(INK.stump.x)
      expect(Math.max(...at(look.stump, 0))).toBeLessThanOrEqual(INK.stump.x + INK.stump.w)
      // It has a shoot, which stands out from the stem: a post alone is a bare stroke.
      expect(look.shoots.length).toBeGreaterThanOrEqual(1)
      expect(shootOf(look).out).toBeGreaterThan(INK.twig.w / 2 + 5)
      // And what sticks out of it stays inside its picture.
      for (const shoot of look.shoots) for (const x of at(shoot.points, 0)) expect(Math.abs(x)).toBeLessThanOrEqual(20)
    }
    for (const [a, b] of pairs(TWIGS)) {
      const [sa, sb] = [shootOf(a), shootOf(b)]
      // Their shoots differ: on the other side, or leaving the stem at another height by a fifth of the twig or more.
      expect(sa.side !== sb.side || Math.abs(sa.from - sb.from) > 22).toBe(true)
      // Their stems bend differently: somewhere along it the two middles are apart.
      const apart = Math.max(...[-15, -35, -55, -75, -95].map((y) => Math.abs(middleAt(a.stem, y) - middleAt(b.stem, y))))
      expect(apart).toBeGreaterThanOrEqual(1.5)
      // They do not bear the same number of shoots in the same places.
      expect(JSON.stringify(a.shoots)).not.toBe(JSON.stringify(b.shoots))
      // Snapped, their splinters differ too.
      expect(JSON.stringify(a.stump.slice(6))).not.toBe(JSON.stringify(b.stump.slice(6)))
    }
    // Side by side on the stage each is drawn from its own picture, whole and snapped.
    const twigs = FOUND.filter((found) => found.kind === 'twig')
    for (const snapped of [false, true]) {
      const toy = new Toy({ ...freshSave(7), things: twigs.map((found, i) => ({ id: found.id, x: 560 + 70 * i })), snapped: snapped ? twigs.map((found) => found.id) : [] }, 1)
      const calls: string[] = []
      const pen = new Proxy({}, { get: (_, name) => (...args: unknown[]) => { if (name === 'drawImage') calls.push(String((args[0] as { n?: number }).n)) }, set: () => true }) as unknown as Pen
      let sheets = 0
      const view = new View(pen, () => ({ width: 0, height: 0, n: ++sheets, getContext: () => pen }) as unknown as Sheet, 1)
      view.resize(STAGE.width, STAGE.height, 1, 1)
      const show = toy.show(null)
      const frame = (things: typeof show.things): string[] => { calls.length = 0; view.draw({ ...show, things, front: [] }); return [...calls] }
      const bare = frame([])
      const standing = show.things.filter((thing) => thing.kind === 'twig')
      expect(standing.every((thing) => thing.housed && thing.snapped === snapped)).toBe(true)
      // Four more pictures than a frame with no things, and no two of them the same picture.
      const added = frame(standing).filter((sheet) => { const at = bare.indexOf(sheet); if (at < 0) return true; bare.splice(at, 1); return false })
      expect(added.length).toBe(twigs.length)
      expect(new Set(added).size).toBe(twigs.length)
    }
  })

  it('draws the bristles of the brush and the fringe of the towel as used things, not as combs: no two as long, no two gaps beside each other as wide, not all leaning one way', () => {
    for (const row of [BRUSH_BRISTLES, TOWEL_FRINGE]) {
      const gaps = row.slice(1).map(([x], i) => x - row[i][0])
      for (const gap of gaps) expect(gap).toBeGreaterThan(0)
      for (let i = 1; i < gaps.length; i++) expect(Math.abs(gaps[i] - gaps[i - 1])).toBeGreaterThanOrEqual(1.5)
      for (const [a, b] of pairs(row)) expect(Math.abs(a[1] - b[1])).toBeGreaterThanOrEqual(1)
      // The longest is half as long again as the shortest, or more.
      const longs = row.map(([, long]) => long)
      expect(Math.max(...longs) / Math.min(...longs)).toBeGreaterThanOrEqual(1.5)
      const leans = row.map(([, , lean]) => lean)
      expect(Math.max(...leans)).toBeGreaterThan(0)
      expect(Math.min(...leans)).toBeLessThan(0)
      expect(new Set(leans).size).toBeGreaterThanOrEqual(Math.min(3, row.length))
    }
    expect(BRUSH_BRISTLES.length).toBeGreaterThanOrEqual(5)
  })

  it('scatters the four far birds: no two as high, as large, as fast or as far apart, and not in a row', () => {
    expect(FAR_BIRDS).toHaveLength(4)
    for (const [a, b] of pairs(FAR_BIRDS)) {
      expect(Math.abs(a[1] - b[1]), 'height').toBeGreaterThanOrEqual(3)
      expect(Math.abs(a[2] - b[2]), 'size').toBeGreaterThanOrEqual(1)
      expect(Math.abs(a[3] - b[3]), 'rise').toBeGreaterThanOrEqual(3)
    }
    const sizes = FAR_BIRDS.map(([, , long]) => long), heights = FAR_BIRDS.map(([, up]) => up)
    // The largest is twice the smallest, and the highest starts well over the lowest.
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThanOrEqual(2)
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThanOrEqual(15)
    // Not evenly spaced, and neither rising nor falling in a line from left to right.
    const gaps = FAR_BIRDS.slice(1).map(([x], i) => x - FAR_BIRDS[i][0])
    for (const gap of gaps) expect(gap).toBeGreaterThan(0)
    for (let i = 1; i < gaps.length; i++) expect(Math.abs(gaps[i] - gaps[i - 1])).toBeGreaterThanOrEqual(1.5)
    const steps = heights.slice(1).map((h, i) => Math.sign(h - heights[i]))
    expect(new Set(steps).size).toBe(2)
    // Their wings are bent, some one way and some the other.
    const bends = FAR_BIRDS.map(([, , , , bend]) => bend)
    expect(Math.max(...bends)).toBeGreaterThan(0)
    expect(Math.min(...bends)).toBeLessThan(0)
  })

  it('draws the two creases of the ghost hand unequal and bowed, each its own way', () => {
    const [long, short] = HAND_CREASES
    expect(HAND_CREASES).toHaveLength(2)
    expect(chord(long) / chord(short)).toBeGreaterThan(1.6)
    for (const crease of HAND_CREASES) expect(Math.abs(bow(crease))).toBeGreaterThan(1)
    expect(Math.sign(bow(long))).not.toBe(Math.sign(bow(short)))
    expect(long.width).not.toBe(short.width)
    expect(long.points[1]).not.toBe(short.points[1])
  })

  it('draws the grain by the knot as bowed curves, and no level dash under it', () => {
    for (const bend of WALL_MARKS.grain) {
      // Three points, which the pencil draws as one curve.
      expect(bend.length).toBe(6)
      const [ax, ay, mx, my, bx, by] = bend
      // The middle point stands well off the line between the ends: a bow, not a bar.
      const off = Math.abs((bx - ax) * (my - ay) - (by - ay) * (mx - ax)) / Math.hypot(bx - ax, by - ay)
      expect(off).toBeGreaterThan(10)
    }
    // And the knot has one such bend, over it: nothing is drawn under it.
    const lowest = Math.max(...WALL_MARKS.knot.filter((_, i) => i % 2 === 1))
    for (const bend of WALL_MARKS.grain) expect(Math.max(bend[1], bend[3], bend[5])).toBeLessThan(lowest)
  })

  it('draws the marks in the back wall as a knot and a stub, not as two like ovals', () => {
    const { knot, stub } = WALL_MARKS
    // One is more than twice the other, and they have different numbers of corners.
    expect(area(knot) / area(stub)).toBeGreaterThan(2)
    expect(knot.length).not.toBe(stub.length)
    // The knot is long and the stub is not: an oval and a like oval have one shape.
    const long = (points: readonly number[]): number => spanOf(points, 0) / spanOf(points, 1)
    expect(long(knot) / long(stub)).toBeGreaterThan(1.5)
    // Neither is an oval: its corners lie at different distances from its middle.
    for (const points of [knot, stub]) {
      const xs = points.filter((_, i) => i % 2 === 0), ys = points.filter((_, i) => i % 2 === 1)
      const cx = xs.reduce((a, b) => a + b) / xs.length, cy = ys.reduce((a, b) => a + b) / ys.length
      const far = xs.map((x, i) => Math.hypot((x - cx) / spanOf(points, 0), (ys[i] - cy) / spanOf(points, 1)))
      expect(Math.max(...far) / Math.min(...far)).toBeGreaterThan(1.25)
    }
  })

  it('spills the water as one uneven puddle: thick here and thin there, its lobes of different lengths', () => {
    for (const [from, to] of [[420, 560], [500, 880], [610, 700]] as const) {
      const points = puddle(from, to, 600)
      const xs = points.filter((_, i) => i % 2 === 0), ys = points.filter((_, i) => i % 2 === 1)
      // One closed shape from end to end.
      expect(Math.min(...xs)).toBe(from)
      expect(Math.max(...xs)).toBe(to)
      const half = xs.indexOf(to)
      const upper = xs.slice(0, half + 1).map((x, i) => [x, ys[i]]), lower = xs.slice(half + 1).map((x, i) => [x, ys[half + 1 + i]]).reverse()
      // How thick it is at each of its inner points: no two neighbours alike, and the thickest at least three times the thinnest.
      const thick = lower.map(([x, y]) => y - upper.find(([ux]) => ux === x)![1])
      expect(Math.max(...thick) / Math.min(...thick)).toBeGreaterThan(2)
      for (let i = 1; i < thick.length; i++) expect(Math.abs(thick[i] - thick[i - 1])).toBeGreaterThan(1.5)
      // Its lobes are of different lengths: the steps along it are no two neighbours alike.
      const steps = lower.slice(1).map(([x], i) => x - lower[i][0])
      for (let i = 1; i < steps.length; i++) expect(Math.abs(steps[i] - steps[i - 1]) / (to - from)).toBeGreaterThan(0.02)
      // Its upper edge is not level either.
      expect(Math.max(...upper.map(([, y]) => y)) - Math.min(...upper.map(([, y]) => y))).toBeGreaterThan(2)
    }
  })

  it('shuts an eye to a curved lash with its outer end low, never to a level bar, and keeps an open eye open', () => {
    for (const r of [7, 10, 11]) {
      const left: Stroke = { points: lash(r, 1), width: 2.4 }, right: Stroke = { points: lash(r, -1), width: 2.4 }
      for (const stroke of [left, right]) {
        expect(levelBar(stroke)).toBe(false)
        expect(Math.abs(bow(stroke))).toBeGreaterThan(r * 0.35)
        // It bows down: its middle is lower than both of its ends.
        expect(stroke.points[3]).toBeGreaterThan(Math.max(stroke.points[1], stroke.points[5]))
        // The outer end is the lower one.
        expect(stroke.points[1] - stroke.points[5]).toBeGreaterThan(r * 0.3)
      }
      // The two of a face mirror each other.
      expect(left.points.map((v, i) => (i % 2 === 0 ? -v : v))).toEqual([...right.points])
      // Open, an eye is never lower than three tenths of its width; from there on it is a lash.
      for (let lid = 0; lid <= 1.0001; lid += 0.05) {
        const eye = eyeFor(r, lid)
        if (eye.shut) expect(lid).toBeGreaterThanOrEqual(SHUT_FROM - 1e-9)
        else expect(eye.ry / eye.rx).toBeGreaterThan(0.29)
      }
    }
  })

  it('draws the three asleep with lashes and no flat whites or pupils', () => {
    /** A canvas that keeps every ellipse and every curve it is asked for. */
    const seen = { ellipses: [] as number[][], curves: [] as number[][] }
    const nothing = (): void => {}
    const calls: Record<string, (...args: number[]) => void> = {
      ellipse: (...args) => { seen.ellipses.push(args) },
      quadraticCurveTo: (...args) => { seen.curves.push(args) },
    }
    const pen = new Proxy({}, { get: (_, name) => (typeof name === 'string' && calls[name]) || nothing, set: () => true }) as unknown as Pen
    const make = (): Sheet => ({ width: 0, height: 0, getContext: () => pen })
    const view = new View(pen, make, 1)
    view.resize(STAGE.width, STAGE.height, 2, 2)
    const toy = new Toy(freshSave(7), 3)
    const lashesOf = (): number => {
      seen.ellipses.length = 0
      seen.curves.length = 0
      view.draw(toy.show(null))
      let count = 0
      for (const who of FOLK) FACE[who].eyes.forEach(([ex, ey], index) => {
        const [, , cx, cy, x1, y1] = lash(FACE[who].r, index === 0 ? 1 : -1)
        if (seen.curves.some((curve) => Math.abs(curve[0] - (ex + cx)) < 1e-6 && Math.abs(curve[1] - (ey + cy)) < 1e-6 && Math.abs(curve[2] - (ex + x1)) < 1e-6 && Math.abs(curve[3] - (ey + y1)) < 1e-6)) count += 1
      })
      return count
    }
    const flat = (): number => seen.ellipses.filter(([x, y, rx, ry]) => FOLK.some((who) => FACE[who].eyes.some(([ex, ey]) => Math.abs(x - ex) < FACE[who].r && Math.abs(y - ey) < FACE[who].r)) && ry < rx * 0.29).length
    for (let i = 0; i < 12; i++) toy.step(TICK)
    // Awake at the start of the day the tidy one and the tiny one have their eyes open.
    expect(lashesOf()).toBeLessThanOrEqual(2)
    expect(flat()).toBe(0)
    toy.press(SUN_AT.x, SUN_AT.y)
    toy.dragStart()
    toy.dragMove(SUN_AT.x, SUN_AT.under)
    toy.drop()
    for (let i = 0; toy.playing && i < 60 / TICK; i++) toy.step(TICK)
    for (let i = 0; i < 3 / TICK; i++) toy.step(TICK)
    for (const who of FOLK) expect(toy.show(null).folk[who].lid).toBeGreaterThanOrEqual(SHUT_FROM)
    expect(lashesOf()).toBe(6)
    expect(flat()).toBe(0)
    // And at no step of a blink is an eye a bar.
    const day = new Toy(freshSave(7), 5)
    for (let i = 0; i < 20 / TICK; i++) {
      day.step(TICK)
      if (i % 3 !== 0) continue
      seen.ellipses.length = 0
      view.draw(day.show(null))
      expect(flat()).toBe(0)
    }
  })
})
