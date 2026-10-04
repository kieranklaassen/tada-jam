import { describe, expect, it } from 'vitest'
import { CREATURES } from './creatures'
import { PLACARD, PLACARD_FIRST, placardAt, placardSize } from './folk'
import { CORNER } from './overlay'
import { beetleHome } from './hit'
import type { Ctx } from './ink'
import { drawPage, type MakeSheet } from './journal'
import { REFERENCE, layoutOf } from './layout'
import { restingBeetle, stillLive, type Live, type VisitorLive } from './live'
import { spikePage, type PageView, type VisitorKind } from './spikePage'
import { LIKES } from './visitors'
import { BODY, restingVisitor, visitorSpot, waitingSpot } from './walker'

type Call = [name: string, ...args: unknown[]]

/** A 2D context that draws nothing and writes down every call made on it. */
function recorder(): { ctx: Ctx; calls: Call[] } {
  const calls: Call[] = [], held: Record<string, unknown> = {}
  const gradient = { addColorStop: () => {} }
  const ctx = new Proxy(held, {
    get(target, name: string) {
      if (name in target) return target[name]
      if (name === 'getTransform') return () => ({ a: 2 })
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient
      if (name === 'measureText') return (text: string) => ({ width: text.length * 12 })
      return (...args: unknown[]) => { calls.push([name, ...args]) }
    },
    set(target, name: string, value) {
      target[name] = value
      return true
    },
  }) as unknown as Ctx
  return { ctx, calls }
}

const KINDS: readonly VisitorKind[] = ['snail', 'bee', 'moth', 'ladybird', 'ant']
const count = (calls: Call[], name: string) => calls.filter((call) => call[0] === name).length
const images = (calls: Call[]) => calls.filter(([name]) => name === 'drawImage')
const text = (calls: Call[]) => calls.filter(([name]) => name === 'fillText' || name === 'strokeText')

describe('the visitors, at rest and in motion', () => {
  const spike = spikePage(), layout = layoutOf(REFERENCE.w, REFERENCE.h)
  const pageOf = (kind: VisitorKind, more: Partial<NonNullable<PageView['visitor']>> = {}): PageView => ({ ...spike, visitor: { kind, wish: LIKES[kind], count: 1, ...more }, waiting: null })
  /** One frame of a page on sheets that have drawn that page at rest once: its calls, what it laid down, the sheets it made, and the page at rest. */
  const frame = (view: PageView, change: (live: Live) => void = () => {}, time = 2) => {
    const made: { calls: Call[] }[] = [], rest = recorder(), surface = recorder(), live = stillLive()
    const make: MakeSheet = (width, height) => {
      const sheet = recorder()
      made.push(sheet)
      return { canvas: { sheet: made.length, width, height } as unknown as CanvasImageSource, ctx: sheet.ctx }
    }
    const still = drawPage(rest.ctx, view, layout, time, 0, make)
    change(live)
    return { draws: drawPage(surface.ctx, view, layout, time, 0, make, live), calls: surface.calls, still, rest: rest.calls, made }
  }
  const standing = (kind: VisitorKind, set: Partial<VisitorLive> = {}): VisitorLive => ({ ...restingVisitor(kind), ...{ x: visitorSpot(layout, kind).x, y: visitorSpot(layout, kind).y }, ...set })
  const moved = (kind: VisitorKind, set: Partial<VisitorLive>, view = pageOf(kind)) => frame(view, (live) => { live.visitor = standing(kind, set) })

  it('draws them at the sizes the logic places them by', () => {
    for (const kind of KINDS) expect({ w: CREATURES[kind].w, h: CREATURES[kind].h }).toEqual(BODY[kind])
  })

  it.each(KINDS)('stands the %s where the logic says, at that size, on the page and at the edge', (kind) => {
    // With nobody on the page the one who waits is the first visitor, on the visitors' own ground; with one there, it waits at the edge beside the label.
    const home = visitorSpot(layout, kind), first = waitingSpot(layout, kind, true), edge = waitingSpot(layout, kind)
    const on = frame(pageOf(kind)), at = frame({ ...spike, visitor: null, waiting: { kind, wish: {}, count: 1 } }, () => {}, 0)
    const both = frame({ ...pageOf('snail'), waiting: { kind, wish: {}, count: 1 } }, () => {}, 0)
    expect(on.calls.some((call) => call[0] === 'translate' && call[1] === home.x && call[2] === home.y)).toBe(true)
    expect(at.calls.some((call) => call[0] === 'translate' && call[1] === first.x && call[2] === first.y)).toBe(true)
    expect(both.calls.some((call) => call[0] === 'translate' && call[1] === edge.x && call[2] === edge.y)).toBe(true)
    // Its kept drawing is as wide as its body at that scale, with the margin a pose needs.
    expect(images(on.calls).some((call) => Math.abs(Number(call[4]) - BODY[kind].w * 1.24 * home.s) < 1e-6)).toBe(true)
    expect(images(at.calls).some((call) => Math.abs(Number(call[4]) - BODY[kind].w * 1.24 * first.s) < 1e-6)).toBe(true)
    expect(images(both.calls).some((call) => Math.abs(Number(call[4]) - BODY[kind].w * 1.24 * edge.s) < 1e-6)).toBe(true)
    // The first one is nearly as large as it will stand, and stands on the visitors' ground; the next waits smaller, above it.
    expect(first.s).toBeGreaterThan(edge.s)
    expect(first.s).toBeLessThan(home.s)
    expect(first.x).toBeGreaterThan(home.x)
    expect(edge.y).toBeLessThan(layout.visitor.y)
  })

  it.each(KINDS)('draws the %s in motion from its numbers: its place, its lift, its turn, its parts and its legs or wings', (kind) => {
    const base = moved(kind, {}), spot = visitorSpot(layout, kind)
    expect(text(base.calls)).toEqual([])
    expect(base.calls.some((call) => call[0] === 'translate' && call[1] === spot.x && call[2] === spot.y)).toBe(true)
    expect(count(base.calls, 'save')).toBe(count(base.calls, 'restore'))
    expect(JSON.stringify(moved(kind, {}).calls)).toBe(JSON.stringify(base.calls))
    const lifted = moved(kind, { x: spot.x - 40, lift: 30 })
    expect(lifted.calls.some((call) => call[0] === 'translate' && call[1] === spot.x - 40 && call[2] === spot.y - 30)).toBe(true)
    for (const set of [{ part: 1 }, { part2: 1 }, { legs: 0.3 }, { turn: 2.6 }, { away: true }, { pose: { lean: -0.2, look: -1, breath: 1, sway: 0.5 } }] as Partial<VisitorLive>[]) {
      const other = moved(kind, set)
      expect(JSON.stringify(other.calls), Object.keys(set)[0]).not.toBe(JSON.stringify(base.calls))
      expect(text(other.calls)).toEqual([])
      expect(other.draws).toBeLessThan(base.still + 12)
    }
    // Turned, it goes round the middle of its body; facing away, it is mirrored.
    expect(moved(kind, { turn: 2.6 }).calls.some((call) => call[0] === 'rotate' && call[1] === 2.6)).toBe(true)
    expect(moved(kind, { away: true }).calls.some((call) => call[0] === 'scale' && call[1] === -1 && call[2] === 1)).toBe(true)
    // In motion a piece is laid over its own shape in bare paper, which is made from the piece and from no drawing of its own.
    expect(base.made.some((sheet) => count(sheet.calls, 'drawImage') === 3 && count(sheet.calls, 'fillRect') === 1)).toBe(true)
  })

  it('draws a visitor that is in motion though the page no longer holds it: one that is leaving', () => {
    const gone = frame({ ...spike, visitor: null, waiting: null }, (live) => { live.visitor = standing('ant', { away: true, legs: 0.2 }); live.waiting = { ...restingVisitor('bee'), x: 1100, y: 300 } })
    expect(gone.draws).toBeGreaterThan(gone.still + 2)
    expect(gone.calls.some((call) => call[0] === 'scale' && call[1] === -1)).toBe(true)
    expect(gone.calls.some((call) => call[0] === 'translate' && call[1] === 1100 && call[2] === 300)).toBe(true)
  })

  it('draws the wish of the one who waits open over its head, turned to the child: its own sketch, small, on a stalk of straw', () => {
    for (const kind of KINDS) {
      // Both where the first visitor waits, with nobody on the page, and where every later one does.
      for (const first of [true, false]) {
      const edge = waitingSpot(layout, kind, first), held = placardAt(layout, kind, edge.x, edge.y, edge.s), on = first ? null : pageOf('snail').visitor
      const plain = frame({ ...spike, visitor: on, waiting: null }), waiting = frame({ ...spike, visitor: on, waiting: { kind, wish: LIKES[kind], count: 2 } })
      // The scrap is one drawing more than the creature, and stands over its head, inside the page and clear of the grown-up's corner.
      const by = placardSize(layout, kind, edge.s)
      expect(by).toBeCloseTo(first ? PLACARD_FIRST : PLACARD, 6)
      const scrap = images(waiting.calls).filter((call) => Math.abs(Number(call[4]) - layout.wish.w * 1.5 * by) < 1e-6)
      expect(scrap).toHaveLength(1)
      expect(images(plain.calls).filter((call) => Math.abs(Number(call[4]) - layout.wish.w * 1.5 * by) < 1e-6)).toHaveLength(0)
      expect(held.y).toBeLessThan(edge.y - 20 * layout.k)
      expect(held.x).toBeGreaterThan(layout.waiting.x)
      expect(held.x).toBeLessThan(layout.waiting.x + layout.waiting.w)
      // The top of the scrap keeps out of the grown-up's corner.
      const tall = Math.min(layout.wish.h * 0.94, 190 * layout.k) * by
      expect(held.y - tall - 4 > CORNER || held.x + layout.wish.w * by * 0.5 < layout.w - CORNER, `${kind} ${first}`).toBe(true)
      expect(held.y - tall).toBeGreaterThan(0)
      // The numeral of a wish for two is on that sheet, and nowhere on the surface.
      expect(waiting.calls.filter((call) => call[0] === 'fillText')).toEqual([])
      }
    }
  })

  it('draws the visitor at the edge in motion too, at the size it waits at', () => {
    for (const kind of KINDS) {
      const edge = waitingSpot(layout, kind), view = { ...spike, visitor: null, waiting: { kind, wish: {}, count: 1 } }
      const waiting = frame(view, (live) => { live.waiting = { ...restingVisitor(kind), x: edge.x - 12, y: edge.y, lift: 9, legs: 0.4 } })
      expect(waiting.calls.some((call) => call[0] === 'translate' && call[1] === edge.x - 12 && call[2] === edge.y - 9)).toBe(true)
      expect(JSON.stringify(waiting.calls)).not.toBe(JSON.stringify(waiting.rest))
    }
  })

  it('stands the wish on its stalk in the wish’s own place, takes it along with a visitor on its way in, and leaves it when the visitor goes to a plant', () => {
    const rest = frame(pageOf('snail')), spot = visitorSpot(layout, 'snail'), wish = layout.wish
    const scrapOf = (calls: Call[]) => images(calls).find((call) => Number(call[4]) === wish.w * 1.5)!
    const home = scrapOf(rest.calls)
    // The foot of the scrap is at the foot of the wish's place, and the scrap is inside it.
    expect(Number(home[3]) + wish.h).toBeLessThanOrEqual(wish.y + wish.h)
    expect(Number(home[2]) + wish.w).toBeGreaterThan(wish.x + wish.w / 2)
    expect(Number(home[2]) + wish.w).toBeLessThan(wish.x + wish.w)
    expect(scrapOf(moved('snail', { x: spot.x - 90 }).calls)[2]).toBe(home[2])
    // On its way in from the edge the visitor still holds it over its head, at the size it held it at while it waited:
    // the same sheet, laid at the foot of the placard and scaled down.
    const edge = waitingSpot(layout, 'snail', true), held = placardAt(layout, 'snail', edge.x, edge.y, edge.s)
    const coming = moved('snail', { x: edge.x, y: edge.y, s: edge.s })
    const size = placardSize(layout, 'snail', edge.s)
    expect(size).toBeCloseTo(PLACARD_FIRST, 6)
    expect(placardSize(layout, 'snail', waitingSpot(layout, 'snail').s)).toBeCloseTo(PLACARD, 6)
    expect(coming.calls.some((call) => call[0] === 'translate' && Math.abs(Number(call[1]) - (held.x - 4 * layout.k * size)) < 1e-6 && Math.abs(Number(call[2]) - held.y) < 1e-6)).toBe(true)
    expect(coming.calls.some((call) => call[0] === 'scale' && Math.abs(Number(call[1]) - size) < 1e-6 && call[1] === call[2])).toBe(true)
    // Halfway there it is between the two in place and in size: larger than it was held, smaller than the label.
    const half = moved('snail', { x: (edge.x + spot.x) / 2, y: (edge.y + spot.y) / 2, s: (edge.s + spot.s) / 2 })
    const scales = half.calls.filter((call) => call[0] === 'scale' && call[1] === call[2] && Number(call[1]) > size + 1e-6 && Number(call[1]) < 1 - 1e-6)
    expect(scales.length).toBeGreaterThan(0)
    // It is laid first after the ground, before the plants, so that a plant set down before the visitor stands in front of it.
    expect(images(rest.calls).indexOf(home)).toBe(1)
  })

  it('shows a fuller wish rolled under the arm, unrolls it over the first, and swings the open one', () => {
    const big = { ...LIKES.snail }, view = pageOf('snail', { wish: { colour: 'red' }, big }), wish = layout.wish
    const scraps = (calls: Call[]) => images(calls).filter((call) => Number(call[call.length - 2]) >= wish.w * 1.5 - 1e-6 && Number(call[call.length - 2]) < wish.w * 2)
    const rolled = frame(view), plain = frame(pageOf('snail', { wish: { colour: 'red' } }))
    expect(rolled.draws).toBe(plain.draws + 1)
    expect(scraps(rolled.calls)).toHaveLength(1)
    const half = frame(view, (live) => { live.wish = { big: 0.6, shake: 0 } }), open = frame(view, (live) => { live.wish = { big: 1, shake: 0 } })
    // Half open, the first sketch is still there and the larger is cut off at the roll: nine numbers, not five.
    expect(scraps(half.calls).map((call) => call.length)).toEqual([6, 10])
    expect(half.draws).toBe(rolled.draws + 1)
    expect(scraps(open.calls)).toHaveLength(1)
    expect(Number(scraps(open.calls)[0][4])).toBeGreaterThan(Number(scraps(rolled.calls)[0][4]))
    expect(open.draws).toBe(plain.draws)
    const swung = frame(view, (live) => { live.wish = { big: 1, shake: 1 } })
    expect(count(swung.calls, 'rotate')).toBe(count(open.calls, 'rotate') + 1)
  })

  it('stands the plants a visitor has kept beside it, and sits one that has all it asked for down with them and no wish', () => {
    const look = LIKES.snail, plain = frame(pageOf('snail', { count: 3 }))
    for (const kept of [1, 2]) expect(frame(pageOf('snail', { count: 3, given: Array(kept).fill(look) })).draws).toBe(plain.draws + 1 + kept)
    const settled = frame(pageOf('snail', { count: 3, given: [look, look, look], settled: true }))
    // The ground line and three plants more; the stalk and the scrap less.
    expect(settled.draws).toBe(plain.draws + 1 + 3 - 2)
    expect(images(settled.calls).some((call) => Number(call[4]) === layout.wish.w * 1.5)).toBe(false)
    const first = images(frame(pageOf('snail', { given: [look] })).calls).find((call) => Math.abs(Number(call[2]) + 36 * layout.small - layout.given.x) < 1e-6)
    expect(first).toBeDefined()
  })
})

describe('the beetle', () => {
  const view = spikePage(), layout = layoutOf(REFERENCE.w, REFERENCE.h)
  const frame = (change: (live: Live) => void) => {
    const made: { calls: Call[] }[] = [], rest = recorder(), surface = recorder(), live = stillLive()
    const make: MakeSheet = (width, height) => {
      const sheet = recorder()
      made.push(sheet)
      return { canvas: { sheet: made.length, width, height } as unknown as CanvasImageSource, ctx: sheet.ctx }
    }
    const still = drawPage(rest.ctx, view, layout, 2, 0, make)
    change(live)
    return { draws: drawPage(surface.ctx, view, layout, 2, 0, make, live), calls: surface.calls, still, rest: rest.calls }
  }

  it('is at rest with its new numbers at rest', () => {
    const rest = frame((live) => { live.beetle = { ...restingBeetle(), cases: 0, sink: 0 } })
    expect(JSON.stringify(rest.calls)).toBe(JSON.stringify(rest.rest))
  })

  it('holds its wing cases up over its back, the thin wings under them', () => {
    const half = frame((live) => { live.beetle = { ...restingBeetle(), cases: 0.5 } }), full = frame((live) => { live.beetle = { ...restingBeetle(), cases: 1 } })
    // Its belly, and the cases over their own shape in bare paper.
    expect(full.draws).toBe(full.still + 3)
    expect(JSON.stringify(full.calls)).not.toBe(JSON.stringify(half.calls))
    expect(count(full.calls, 'rotate')).toBeGreaterThan(count(full.rest, 'rotate'))
    expect(text(full.calls)).toEqual([])
  })

  it('digs itself into the soil it stands on, cut off at the soil line', () => {
    const place = layout.shelf[5], dug = (sink: number) => frame((live) => { live.beetle = { ...restingBeetle(), at: { x: place.x, y: place.soil }, sink } })
    const deep = dug(1), on = dug(0)
    expect(count(deep.calls, 'clip')).toBe(count(on.calls, 'clip') + 1)
    expect(deep.calls.some((call) => call[0] === 'ellipse' && call[1] === place.x && call[2] === place.soil)).toBe(true)
    expect(JSON.stringify(dug(0.5).calls)).not.toBe(JSON.stringify(deep.calls))
    expect(count(deep.calls, 'save')).toBe(count(deep.calls, 'restore'))
  })

  it('leaves the loupe out when it is in the hand', () => {
    const held = frame((live) => { live.loupe = { x: 400, y: 300 } })
    expect(held.draws).toBe(held.still + 1)
    // The last thing laid is the loupe's own kept drawing, which is 100 of the beetle's units wide.
    const wide = 100 * beetleHome(layout).s, lying = images(held.rest).find((call) => Math.abs(Number(call[4]) - wide) < 1e-6)!
    expect(images(held.calls)[images(held.calls).length - 1][1]).toBe(lying[1])
    expect(images(held.calls).filter((call) => call[2] === lying[2] && call[3] === lying[3])).toHaveLength(0)
  })
})
