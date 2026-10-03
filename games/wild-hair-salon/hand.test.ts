import { describe, expect, it } from 'vitest'
import { GRID } from './grid'
import { BLADES, Hand, RUB_STROKE, type Happening } from './hand'
import { COLLAR_Y, HEAD, LOCK_X, STEP, tipY } from './layout'
import { TUFT_STEP, clippingBox, floorX, floorY, placeOnFloor, tuftPose, tuftTip, type Point } from './poses'
import { TUFTS } from './rules'
import type { Salon } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1, lock: 50, model: 44, seat: 'beside', cape: 'on',
  mane: Array(TUFTS).fill(60), ribbon: null, clippings: [], shown: { snip: true, pull: true, ribbon: false }, ...over,
})
const cells = (happenings: Happening[]) => happenings.filter((h) => h.kind === 'cell') as Extract<Happening, { kind: 'cell' }>[]
const onLock = (steps: number): Point => ({ x: LOCK_X, y: COLLAR_Y + steps * STEP })
const air: Point = { x: 980, y: 300 }
const tuftAt = (index: number, steps: number, t: number): Point => {
  const pose = tuftPose(index, steps), end = tuftTip(pose)
  return { x: HEAD.x + pose.base.x + (end.x - pose.base.x) * t, y: HEAD.y + pose.base.y + (end.y - pose.base.y) * t }
}
/** The finger position that puts the blades at a point. */
const bladesAt = (p: Point): Point => ({ x: p.x - BLADES.x, y: p.y - BLADES.y })

/** A whole drag: press, moves, then the end. Returns the salon and everything that happened. */
function drag(hand: Hand, s: Salon, points: Point[], seconds = 0.05): { salon: Salon; happenings: Happening[] } {
  const all: Happening[] = []
  let step = hand.press(s, points[0], 0)
  all.push(...step.happenings)
  points.slice(1).forEach((p, i) => { step = hand.move(step.salon, p, (i + 1) * seconds); all.push(...step.happenings) })
  step = hand.end(step.salon, points[points.length - 1])
  all.push(...step.happenings)
  return { salon: step.salon, happenings: all }
}

describe('the finger', () => {
  it('answers a press the moment it lands: a thing is caught, or the scissors are in the hand', () => {
    const hand = new Hand()
    expect(hand.press(salon(), onLock(20), 0).happenings).toEqual([{ kind: 'caught', held: { object: 'lock' }, at: onLock(20) }])
    expect(hand.held).toEqual({ object: 'lock' })
    const other = new Hand()
    expect(other.press(salon(), air, 0).happenings).toEqual([{ kind: 'scissors', at: air }])
    expect(other.held).toBe('scissors')
  })

  it('pulls a lock longer by as much as the finger moves away from its root, and it stays', () => {
    const hand = new Hand()
    const done = drag(hand, salon(), [onLock(40), onLock(52), onLock(70)])
    expect(done.salon.lock).toBe(80)
    expect(cells(done.happenings).every((h) => h.cell === GRID.lock.pull)).toBe(true)
    expect(cells(done.happenings).length).toBeGreaterThanOrEqual(2)
    expect(done.happenings[done.happenings.length - 1]).toMatchObject({ kind: 'letGo', held: { object: 'lock' } })
    expect(hand.held).toBeNull()
  })

  it('stores a held lock at the length it has, move by move', () => {
    const hand = new Hand()
    let step = hand.press(salon(), onLock(40), 0)
    step = hand.move(step.salon, onLock(55), 0.05)
    expect(step.salon.lock).toBe(65)
    step = hand.move(step.salon, onLock(45), 0.1)
    // Moving back up never shortens it.
    expect(step.salon.lock).toBe(65)
  })

  it('sounds the pull at once and then only as the lock grows, not on every move', () => {
    const hand = new Hand()
    let step = hand.press(salon(), onLock(40), 0)
    let heard = 0
    for (let i = 1; i <= 40; i++) { step = hand.move(step.salon, onLock(40 + i * 0.5), i * 0.02); heard += cells(step.happenings).length }
    expect(step.salon.lock).toBe(70)
    expect(heard).toBeGreaterThanOrEqual(5)
    expect(heard).toBeLessThanOrEqual(9)
  })

  it('pulls a tuft of the mane the same way', () => {
    const start = tuftAt(4, 60, 0.6), pose = tuftPose(4, 60)
    const away = { x: start.x + Math.sin(pose.angle) * 26, y: start.y - Math.cos(pose.angle) * 26 }
    const done = drag(new Hand(), salon(), [start, away])
    expect(done.salon.mane[4]).toBe(60 + Math.round(26 / TUFT_STEP))
    expect(cells(done.happenings)[0].cell).toBe(GRID.tuft.pull)
    expect(done.salon.mane.filter((steps) => steps === 60)).toHaveLength(TUFTS - 1)
  })

  it('snips the lock where the blades cross it, and the piece is there to fall', () => {
    const y = tipY(30)
    const done = drag(new Hand(), salon(), [air, bladesAt({ x: LOCK_X + 80, y }), bladesAt({ x: LOCK_X - 80, y })])
    expect(done.salon.lock).toBe(30)
    const [snip] = cells(done.happenings)
    expect(snip.cell).toBe(GRID.lock.snip)
    expect(snip.piece).toEqual(done.salon.clippings[0])
    expect(snip.piece?.len).toBe(20)
    expect(snip.at.y).toBeCloseTo(y)
    expect(done.happenings[done.happenings.length - 1]).toEqual({ kind: 'away' })
  })

  it('snips every tuft one long stroke crosses', () => {
    const a = tuftAt(3, 90, 0.7), b = tuftAt(5, 90, 0.7)
    const done = drag(new Hand(), salon({ mane: Array(TUFTS).fill(90) }), [air, bladesAt({ x: a.x - 30, y: a.y }), bladesAt({ x: b.x + 30, y: b.y })])
    for (const index of [3, 4, 5]) expect(done.salon.mane[index]).toBeLessThan(90)
    // The stroke also crosses the tufts on its way in from the side; every one it crosses is cut, each once.
    const snipped = cells(done.happenings).filter((h) => h.cell === GRID.tuft.snip).map((h) => (h.held as { index: number }).index)
    expect(new Set(snipped).size).toBe(snipped.length)
    for (const index of [3, 4, 5]) expect(snipped).toContain(index)
    expect(done.salon.clippings).toEqual([])
  })

  it('closes the blades on the air when they cross nothing, and on a tap', () => {
    const done = drag(new Hand(), salon(), [air, { x: air.x + 40, y: air.y + 10 }])
    expect(done.happenings.map((h) => h.kind)).toEqual(['scissors', 'airSnip', 'away'])
    const hand = new Hand()
    const pressed = hand.press(salon(), air, 0)
    expect(hand.tap(pressed.salon, air).happenings.map((h) => h.kind)).toEqual(['airSnip', 'away'])
  })

  it('snips the air by the nose once when the blades come in over the face, and cuts nothing there', () => {
    const before = salon()
    const done = drag(new Hand(), before, [{ x: 200, y: 200 }, bladesAt({ x: HEAD.x - 160, y: HEAD.y }), bladesAt({ x: HEAD.x - 40, y: HEAD.y }), bladesAt({ x: HEAD.x, y: HEAD.y }), bladesAt({ x: HEAD.x + 20, y: HEAD.y })])
    const face = cells(done.happenings).filter((h) => h.cell === GRID.face.snip)
    expect(face).toHaveLength(1)
    expect([done.salon.lock, done.salon.mane]).toEqual([before.lock, before.mane])
  })

  it('pokes with a tap: the lock rings at its length', () => {
    const hand = new Hand()
    const pressed = hand.press(salon(), onLock(20), 0)
    const [poke] = cells(hand.tap(pressed.salon, onLock(20)).happenings)
    expect(poke.cell).toBe(GRID.lock.poke)
    expect(poke.rings).toBe(50)
    const face = new Hand()
    const onNose = { x: HEAD.x, y: HEAD.y + 24 }
    const [giggle] = cells(face.tap(face.press(salon(), onNose, 0).salon, onNose).happenings)
    expect(giggle.cell).toBe(GRID.face.poke)
    expect(giggle.held).toEqual({ object: 'face', part: 'nose' })
  })

  it('ruffles with a rub: back and forth on the lock fans it out and leaves it as long as before', () => {
    const p = onLock(30)
    const rub = [p, ...Array.from({ length: 8 }, (_, i) => ({ x: p.x + (i % 2 === 0 ? RUB_STROKE + 4 : -RUB_STROKE - 4), y: p.y + (i % 2 === 0 ? 6 : -6) }))]
    const hand = new Hand()
    const done = drag(hand, salon(), rub)
    expect(done.salon.lock).toBe(50)
    const ruffles = cells(done.happenings).filter((h) => h.cell === GRID.lock.ruffle)
    expect(ruffles.length).toBeGreaterThanOrEqual(1)
    expect(done.happenings[done.happenings.length - 1]).toMatchObject({ kind: 'letGo' })
  })

  it('tells a pull from a rub: one long stroke never ruffles', () => {
    const done = drag(new Hand(), salon(), Array.from({ length: 30 }, (_, i) => ({ x: LOCK_X + Math.sin(i) * 3, y: onLock(30).y + i * 4 })))
    expect(cells(done.happenings).some((h) => h.action === 'ruffle')).toBe(false)
    expect(done.salon.lock).toBeGreaterThan(50)
  })

  it('rubs a head: the rub goes on answering for as long as it lasts, but not on every move', () => {
    const p = { x: HEAD.x - 60, y: HEAD.y }
    const rub = [p, ...Array.from({ length: 40 }, (_, i) => ({ x: p.x + (i % 2 === 0 ? 14 : -14), y: p.y }))]
    const done = drag(new Hand(), salon(), rub)
    const rubs = cells(done.happenings).filter((h) => h.cell === GRID.face.ruffle)
    expect(rubs.length).toBeGreaterThanOrEqual(3)
    expect(rubs.length).toBeLessThanOrEqual(8)
  })

  it('pulls a cheek, which snaps back when it is let go', () => {
    const p = { x: HEAD.x - 70, y: HEAD.y }
    const done = drag(new Hand(), salon(), [p, { x: p.x - 40, y: p.y }, { x: p.x - 90, y: p.y + 10 }])
    expect(cells(done.happenings).map((h) => h.cell)).toEqual([GRID.face.pull])
  })

  it('carries a clipping and lets it go: on a face it sticks at a spot, elsewhere it lies on the floor', () => {
    const start = salon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 46 }] })
    const from = { x: floorX(46), y: floorY(46) }
    const toFace = drag(new Hand(), start, [from, { x: 500, y: 500 }, { x: HEAD.x, y: HEAD.y + 42 }])
    expect(toFace.salon.clippings).toEqual([{ len: 20, hue: 'lion', on: 'face', who: 'chair', spot: 'lip' }])
    expect(cells(toFace.happenings)[0]).toMatchObject({ cell: GRID.clipping.pull, place: { on: 'face', spot: 'lip' } })
    const toFloor = drag(new Hand(), start, [from, { x: 700, y: 600 }, { x: 900, y: 700 }])
    expect(toFloor.salon.clippings).toEqual([{ len: 20, hue: 'lion', on: 'floor', x: placeOnFloor(900) }])
    // While it is carried it is stored where it was picked up.
    const hand = new Hand()
    const mid = hand.move(hand.press(start, from, 0).salon, { x: 700, y: 400 }, 0.05)
    expect(mid.salon.clippings).toEqual(start.clippings)
  })

  it('pokes, snips and tidies a clipping', () => {
    const start = salon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 46 }] })
    const box = clippingBox(start.clippings[0]), at = { x: box.x, y: box.y }
    const poke = new Hand()
    expect(cells(poke.tap(poke.press(start, at, 0).salon, at).happenings)[0].cell).toBe(GRID.clipping.poke)
    const cut = drag(new Hand(), start, [air, bladesAt({ x: box.x, y: box.y - 40 }), bladesAt({ x: box.x + 2, y: box.y + 40 })])
    expect(cut.salon.clippings.map((c) => c.len)).toEqual([10, 10])
    const rubbed = drag(new Hand(), start, [at, ...Array.from({ length: 8 }, (_, i) => ({ x: at.x + (i % 2 === 0 ? 14 : -14), y: at.y }))])
    expect(rubbed.salon.clippings).toEqual([])
    expect(cells(rubbed.happenings).map((h) => h.cell)).toEqual([GRID.clipping.ruffle])
  })

  it('gives every press one ending, and holds nothing afterwards', () => {
    for (const first of [onLock(20), air, { x: HEAD.x, y: HEAD.y }]) {
      const hand = new Hand()
      const pressed = hand.press(salon(), first, 0)
      const ended = hand.end(pressed.salon, first)
      expect(hand.held).toBeNull()
      expect(ended.happenings.length).toBeGreaterThanOrEqual(1)
      expect(hand.move(ended.salon, { x: 1, y: 1 }, 1).happenings).toEqual([])
      expect(hand.end(ended.salon, first).happenings).toEqual([])
    }
  })

  it('answers every random touch with something, and never leaves the lengths out of range', () => {
    let s = salon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 46 }] })
    let seed = 7
    const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
    for (let i = 0; i < 300; i++) {
      const hand = new Hand()
      const points = Array.from({ length: 2 + Math.floor(next() * 6) }, () => ({ x: next() * 1180, y: next() * 820 }))
      const done = next() < 0.3 ? (() => { const p = hand.press(s, points[0], 0); const t = hand.tap(p.salon, points[0]); return { salon: t.salon, happenings: [...p.happenings, ...t.happenings] } })() : drag(hand, s, points)
      expect(done.happenings.length, `touch ${i}`).toBeGreaterThanOrEqual(2)
      s = done.salon
      for (const steps of [s.lock, ...s.mane]) expect(Number.isInteger(steps) && steps >= 4 && steps <= 100).toBe(true)
      expect(s.clippings.length).toBeLessThanOrEqual(12)
    }
  })
})
