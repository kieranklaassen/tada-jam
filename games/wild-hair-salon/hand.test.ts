import { describe, expect, it } from 'vitest'
import { GRID } from './grid'
import { BLADES, Hand, RUB_STROKE, type Happening } from './hand'
import { MANES } from './kits'
import { BESIDE_X, COLLAR_Y, HEAD, LOCK_X, PEG, STEP } from './layout'
import { BUTTONS, clippingBox, crossedBy, floorX, floorY, onHead, placeOnFloor, placesOf, tuftPose, tuftTip, type Point } from './poses'
import { TUFTS } from './rules'
import type { Salon } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1, lock: 50, model: 44, seat: 'beside', cape: 'on',
  mane: Array(TUFTS).fill(60), ribbon: null, clippings: [], shown: { snip: true, pull: true, ribbon: false }, ...over,
})
const cells = (happenings: Happening[]) => happenings.filter((h) => h.kind === 'cell') as Extract<Happening, { kind: 'cell' }>[]
const tipY = (steps: number): number => COLLAR_Y + steps * STEP
const onLock = (steps: number): Point => ({ x: LOCK_X, y: tipY(steps) })
const onModel = (steps: number): Point => ({ x: BESIDE_X, y: tipY(steps) })
const air: Point = { x: 860, y: 90 }
const customer = { x: HEAD.x, y: HEAD.y, s: 1 }
const tuftAt = (index: number, steps: number, t: number): Point => {
  const pose = tuftPose('lion', index, steps), end = tuftTip(pose)
  return onHead(customer, { x: pose.base.x + (end.x - pose.base.x) * t, y: pose.base.y + (end.y - pose.base.y) * t })
}
/** The finger position that puts the blades at a point. */
const bladesAt = (p: Point): Point => ({ x: p.x - BLADES.x, y: p.y - BLADES.y })
const rubAt = (p: Point, n = 8): Point[] => [p, ...Array.from({ length: n }, (_, i) => ({ x: p.x + (i % 2 === 0 ? RUB_STROKE + 4 : -RUB_STROKE - 4), y: p.y }))]

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
const tap = (s: Salon, p: Point): { salon: Salon; happenings: Happening[] } => { const hand = new Hand(); const pressed = hand.press(s, p, 0); const done = hand.tap(pressed.salon, p); return { salon: done.salon, happenings: [...pressed.happenings, ...done.happenings] } }

describe('the finger', () => {
  it('answers a press the moment it lands: a thing is caught, the scissors are in the hand, or a button gives', () => {
    const hand = new Hand()
    expect(hand.press(salon(), onLock(20), 0).happenings).toEqual([{ kind: 'caught', held: { object: 'lock' }, at: onLock(20) }])
    expect(hand.held).toEqual({ object: 'lock' })
    const other = new Hand()
    expect(other.press(salon(), air, 0).happenings).toEqual([{ kind: 'scissors', at: air }])
    expect(other.held).toBe('scissors')
    const third = new Hand(), knot = placesOf(salon()).knot!
    expect(third.press(salon(), knot, 0).happenings).toEqual([{ kind: 'pressed', button: 'knot', at: knot }])
    expect(third.held).toBeNull()
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

  it('stores a held lock at the length it has, move by move, and never shortens it', () => {
    const hand = new Hand()
    let step = hand.press(salon(), onLock(40), 0)
    step = hand.move(step.salon, onLock(55), 0.05)
    expect(step.salon.lock).toBe(65)
    step = hand.move(step.salon, onLock(45), 0.1)
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
    const start = tuftAt(4, 60, 0.6), pose = tuftPose('lion', 4, 60)
    const away = { x: start.x + Math.sin(pose.angle) * 26, y: start.y - Math.cos(pose.angle) * 26 }
    const done = drag(new Hand(), salon(), [start, away])
    expect(done.salon.mane[4]).toBe(60 + Math.round(26 / MANES.lion.step))
    expect(cells(done.happenings)[0].cell).toBe(GRID.tuft.pull)
    expect(done.salon.mane.filter((steps) => steps === 60)).toHaveLength(TUFTS - 1)
  })

  it('draws the model out while it is held and lets it spring back: it is never any longer', () => {
    const hand = new Hand()
    let step = hand.press(salon(), onModel(20), 0)
    step = hand.move(step.salon, onModel(50), 0.05)
    expect(step.salon.model).toBe(44)
    expect(cells(step.happenings)).toMatchObject([{ cell: GRID.model.pull, sprangBack: true }])
    expect(hand.drawnOut).toBeGreaterThan(20)
    // Heard once, however long it is held out.
    step = hand.move(step.salon, onModel(60), 0.1)
    expect(cells(step.happenings)).toEqual([])
    step = hand.end(step.salon, onModel(60))
    expect(step.salon.model).toBe(44)
    expect(hand.drawnOut).toBe(0)
  })

  it('snips a strip where the blades cross it: the lock stays cut, the model grows back, and each piece is there to fall', () => {
    const y = tipY(30)
    const done = drag(new Hand(), salon(), [air, bladesAt({ x: BESIDE_X + 60, y }), bladesAt({ x: LOCK_X - 60, y })])
    expect(done.salon.lock).toBe(30)
    expect(done.salon.model).toBe(44)
    const snips = cells(done.happenings)
    expect(snips.map((h) => h.cell)).toEqual([GRID.model.snip, GRID.lock.snip])
    expect(snips[0]).toMatchObject({ sprangBack: true, piece: { len: 14, hue: 'poodle' } })
    expect(snips[1]).toMatchObject({ sprangBack: false, piece: { len: 20, hue: 'lion' } })
    expect(done.salon.clippings).toHaveLength(2)
    expect(done.happenings[done.happenings.length - 1]).toEqual({ kind: 'away' })
  })

  it('snips every tuft one long stroke crosses', () => {
    const a = tuftAt(3, 90, 0.7), b = tuftAt(5, 90, 0.7)
    const done = drag(new Hand(), salon({ mane: Array(TUFTS).fill(90), seat: 'across' }), [air, bladesAt({ x: a.x - 30, y: a.y }), bladesAt({ x: b.x + 30, y: b.y })])
    for (const index of [3, 4, 5]) expect(done.salon.mane[index]).toBeLessThan(90)
    // The stroke also crosses tufts on its way in from the side, and may cross one twice; every crossing is a cut.
    const snipped = cells(done.happenings).filter((h) => h.cell === GRID.tuft.snip).map((h) => (h.held as { index: number }).index)
    for (const index of [3, 4, 5]) expect(snipped).toContain(index)
    expect(done.salon.clippings).toEqual([])
  })

  it('closes the blades on the air when they cross nothing, and on a tap', () => {
    const done = drag(new Hand(), salon(), [air, { x: air.x + 40, y: air.y + 10 }])
    expect(done.happenings.map((h) => h.kind)).toEqual(['scissors', 'airSnip', 'away'])
    expect(tap(salon(), air).happenings.map((h) => h.kind)).toEqual(['scissors', 'airSnip', 'away'])
  })

  it('snips the air by a nose once when the blades come in over a face, the customer\'s or the friend\'s, and cuts nothing there', () => {
    const before = salon()
    const done = drag(new Hand(), before, [{ x: 330, y: 120 }, bladesAt({ x: HEAD.x - 160, y: HEAD.y }), bladesAt({ x: HEAD.x - 40, y: HEAD.y }), bladesAt({ x: HEAD.x, y: HEAD.y }), bladesAt({ x: HEAD.x + 20, y: HEAD.y })])
    const face = cells(done.happenings).filter((h) => h.cell === GRID.face.snip)
    expect(face).toMatchObject([{ held: { object: 'face', who: 'chair' } }])
    // On their way in the blades cut what hair they cross; over the face itself they cut nothing.
    expect(done.salon.lock).toBe(before.lock)
    expect(done.salon.clippings).toEqual([])
    const friend = placesOf(before).friend!
    const other = drag(new Hand(), before, [air, bladesAt({ x: friend.x + 150, y: friend.y }), bladesAt({ x: friend.x, y: friend.y })])
    expect(cells(other.happenings).filter((h) => h.cell === GRID.face.snip)).toMatchObject([{ held: { object: 'face', who: 'friend' } }])
  })

  it('pokes with a tap: a lock rings at its length, a face giggles where it was poked', () => {
    const [poke] = cells(tap(salon(), onLock(20)).happenings)
    expect(poke.cell).toBe(GRID.lock.poke)
    expect(poke.rings).toBe(50)
    const [model] = cells(tap(salon(), onModel(20)).happenings)
    expect(model).toMatchObject({ cell: GRID.model.poke, rings: 44 })
    const [giggle] = cells(tap(salon(), { x: HEAD.x, y: HEAD.y + 24 }).happenings)
    expect(giggle).toMatchObject({ cell: GRID.face.poke, held: { object: 'face', who: 'chair', part: 'nose' } })
    const friend = placesOf(salon()).friend!
    expect(cells(tap(salon(), { x: friend.x, y: friend.y + 45 }).happenings)[0]).toMatchObject({ cell: GRID.face.poke, held: { who: 'friend', part: 'chin' } })
  })

  it('ruffles with a rub: back and forth on a lock fans it out and leaves it as long as before', () => {
    const done = drag(new Hand(), salon(), rubAt(onLock(30)).map((p, i) => ({ x: p.x, y: p.y + (i % 2 === 0 ? 6 : -6) })))
    expect(done.salon.lock).toBe(50)
    expect(cells(done.happenings).filter((h) => h.cell === GRID.lock.ruffle).length).toBeGreaterThanOrEqual(1)
    expect(done.happenings[done.happenings.length - 1]).toMatchObject({ kind: 'letGo' })
    expect(cells(drag(new Hand(), salon(), rubAt(onModel(30))).happenings).some((h) => h.cell === GRID.model.ruffle)).toBe(true)
  })

  it('tells a pull from a rub: one long stroke never ruffles', () => {
    const done = drag(new Hand(), salon(), Array.from({ length: 30 }, (_, i) => ({ x: LOCK_X + Math.sin(i) * 3, y: onLock(30).y + i * 4 })))
    expect(cells(done.happenings).some((h) => h.action === 'ruffle')).toBe(false)
    expect(done.salon.lock).toBeGreaterThan(50)
  })

  it('rubs a head: the rub goes on answering for as long as it lasts, but not on every move', () => {
    const done = drag(new Hand(), salon(), rubAt({ x: HEAD.x - 60, y: HEAD.y }, 40))
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
    const from = { x: floorX(46), y: floorY(46) }, friend = placesOf(start).friend!
    const toFace = drag(new Hand(), start, [from, { x: 500, y: 500 }, { x: HEAD.x, y: HEAD.y + 42 }])
    expect(toFace.salon.clippings).toEqual([{ len: 20, hue: 'lion', on: 'face', who: 'chair', spot: 'lip' }])
    expect(cells(toFace.happenings)[0]).toMatchObject({ cell: GRID.clipping.pull, place: { on: 'face', spot: 'lip' } })
    const toFriend = drag(new Hand(), start, [from, { x: 700, y: 500 }, { x: friend.x, y: friend.y - 30 }])
    expect(toFriend.salon.clippings).toEqual([{ len: 20, hue: 'lion', on: 'face', who: 'friend', spot: 'brow' }])
    const toFloor = drag(new Hand(), start, [from, { x: 800, y: 600 }, { x: 900, y: 700 }])
    expect(toFloor.salon.clippings).toEqual([{ len: 20, hue: 'lion', on: 'floor', x: placeOnFloor(900) }])
    // While it is carried it is stored where it was picked up.
    const hand = new Hand()
    const mid = hand.move(hand.press(start, from, 0).salon, { x: 800, y: 400 }, 0.05)
    expect(mid.salon.clippings).toEqual(start.clippings)
  })

  it('pokes, snips and tidies a clipping', () => {
    const start = salon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 46 }] })
    const box = clippingBox(start, start.clippings[0])!, at = { x: box.x, y: box.y }
    expect(cells(tap(start, at).happenings)[0].cell).toBe(GRID.clipping.poke)
    const cut = drag(new Hand(), start, [{ x: box.x, y: box.y + 60 }, bladesAt({ x: box.x, y: box.y + 40 }), bladesAt({ x: box.x + 2, y: box.y - 40 })])
    expect(cut.salon.clippings.map((c) => c.len)).toEqual([10, 10])
    const rubbed = drag(new Hand(), start, rubAt(at))
    expect(rubbed.salon.clippings).toEqual([])
    expect(cells(rubbed.happenings).map((h) => h.cell)).toEqual([GRID.clipping.ruffle])
  })

  it('cuts the piece the blades cross, and no other, when the same stroke has just cut a lock and the floor was full', () => {
    // Twelve pieces: the lock's offcut takes the oldest away and moves the rest along the list.
    const pieces = Array.from({ length: 12 }, (_, i) => ({ len: 20 + i, hue: 'lion' as const, on: 'floor' as const, x: 4 + i * 5 }))
    const start = salon({ lock: 90, seat: 'across', clippings: pieces })
    // One move of the blades, through the lock and on down to a piece on the floor to the left of it.
    const box = clippingBox(start, start.clippings[6])!
    const a = { x: LOCK_X + 40, y: tipY(30) }, b = { x: box.x - (a.x - box.x) * 0.1, y: box.y + (box.y - a.y) * 0.1 }
    const crossed = crossedBy(start, a, b)
    expect(crossed[0]).toMatchObject({ object: 'lock' })
    const met = crossed.find((hit) => hit.object === 'clipping') as { index: number }
    expect(met.index).toBeGreaterThanOrEqual(2)
    const theOne = start.clippings[met.index], itsNeighbour = start.clippings[met.index + 1]
    const hand = new Hand()
    let step = hand.press(start, air, 0)
    step = hand.move(step.salon, bladesAt(a), 0.05)
    step = hand.move(step.salon, bladesAt(b), 0.1)
    expect(step.salon.lock).toBeLessThan(90)
    expect(step.salon.clippings).toHaveLength(12)
    expect(step.salon.clippings).not.toContain(theOne)
    expect(step.salon.clippings).toContain(itsNeighbour)
  })

  it('gives every press one ending, and holds nothing afterwards', () => {
    for (const first of [onLock(20), air, { x: HEAD.x, y: HEAD.y }, placesOf(salon()).knot!]) {
      const hand = new Hand()
      const pressed = hand.press(salon(), first, 0)
      const ended = hand.end(pressed.salon, first)
      expect(hand.held).toBeNull()
      expect(ended.happenings.length).toBeGreaterThanOrEqual(1)
      expect(hand.move(ended.salon, { x: 1, y: 1 }, 1).happenings).toEqual([])
      expect(hand.end(ended.salon, first).happenings).toEqual([])
    }
  })
})

describe('the ribbon in the fingers', () => {
  const withRibbon = (over: Partial<Salon> = {}): Salon => salon({ ribbon: { len: 60, at: 'peg' }, shown: { snip: true, pull: true, ribbon: true }, ...over })
  const clip: Point = { x: PEG.x, y: PEG.y - 14 }
  const onRibbon = (steps: number): Point => ({ x: PEG.x, y: PEG.y + steps * STEP })

  it('runs longer when it is pulled, is cut where it is crossed, twangs at a tap and spins at a rub', () => {
    expect(drag(new Hand(), withRibbon(), [onRibbon(40), onRibbon(60)]).salon.ribbon).toEqual({ len: 80, at: 'peg' })
    const cut = drag(new Hand(), withRibbon(), [air, bladesAt({ x: PEG.x + 50, y: PEG.y + 25 * STEP }), bladesAt({ x: PEG.x - 50, y: PEG.y + 25 * STEP })])
    expect(cut.salon.ribbon).toEqual({ len: 25, at: 'peg' })
    expect(cut.salon.clippings).toMatchObject([{ len: 35, hue: 'ribbon' }])
    expect(cells(tap(withRibbon(), onRibbon(30)).happenings)[0].cell).toBe(GRID.ribbon.poke)
    const spun = drag(new Hand(), withRibbon(), rubAt(onRibbon(30)))
    expect(spun.salon.ribbon).toEqual({ len: 60, at: 'peg' })
    expect(cells(spun.happenings).some((h) => h.cell === GRID.ribbon.ruffle)).toBe(true)
  })

  it('is carried by its clip to whatever it is let go over, and keeps its length', () => {
    const start = withRibbon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 80 }] }), friend = placesOf(start).friend!
    const to = (p: Point) => drag(new Hand(), start, [clip, { x: 800, y: 300 }, p])
    expect(to(onLock(20)).salon.ribbon).toEqual({ len: 60, at: 'lock' })
    expect(cells(to(onLock(20)).happenings).map((h) => h.cell)).toEqual([GRID.lock.ribbon])
    expect(to(onModel(20)).salon.ribbon).toEqual({ len: 60, at: 'model' })
    expect(to(tuftAt(2, 60, 0.8)).salon.ribbon).toEqual({ len: 60, at: 'mane', tuft: 2 })
    expect(to({ x: HEAD.x, y: HEAD.y }).salon.ribbon).toEqual({ len: 60, at: 'face', who: 'chair' })
    expect(to({ x: friend.x, y: friend.y }).salon.ribbon).toEqual({ len: 60, at: 'face', who: 'friend' })
    expect(to({ x: floorX(80), y: floorY(80) }).salon.ribbon).toEqual({ len: 60, at: 'floor', x: 80 })
  })

  it('goes round the head when it is let go on a piece that is stuck on a face, and answers as it does on the face itself', () => {
    const start = withRibbon({ clippings: [{ len: 20, hue: 'lion', on: 'face', who: 'friend', spot: 'lip' }] })
    const box = clippingBox(start, start.clippings[0])!
    const done = drag(new Hand(), start, [clip, { x: 800, y: 300 }, { x: box.x, y: box.y }])
    expect(done.salon.ribbon).toEqual({ len: 60, at: 'face', who: 'friend' })
    const cell = cells(done.happenings)[0]
    expect(cell.cell).toBe(GRID.face.ribbon)
    expect(cell.held).toMatchObject({ object: 'face', who: 'friend' })
    expect(done.salon.clippings).toEqual(start.clippings)
  })

  it('goes back to its peg when it is let go over nothing, or over a thing that only moves the game on', () => {
    const away = withRibbon({ ribbon: { len: 60, at: 'lock' } })
    const clipAt = { x: LOCK_X - 36, y: COLLAR_Y - 14 }
    for (const p of [air, { x: BUTTONS.door.x + 80, y: BUTTONS.door.y + 200 }]) {
      const done = drag(new Hand(), away, [clipAt, { x: 700, y: 200 }, p])
      expect(done.salon.ribbon).toEqual({ len: 60, at: 'peg' })
      expect(cells(done.happenings).map((h) => h.cell)).toEqual([GRID.ribbon.ribbon])
    }
  })

  it('is stored where it was picked up while it is carried, and is never rubbed by a wandering finger', () => {
    const hand = new Hand()
    let step = hand.press(withRibbon(), clip, 0)
    expect(step.happenings).toEqual([{ kind: 'caught', held: { object: 'ribbonClip' }, at: clip }])
    for (const p of rubAt({ x: 700, y: 300 }, 12)) { step = hand.move(step.salon, p, 0.05); expect(step.happenings).toEqual([]) }
    expect(step.salon.ribbon).toEqual({ len: 60, at: 'peg' })
    expect(hand.held).toEqual({ object: 'ribbonClip' })
  })

  it('measures off: brought to the model and cut to it, then brought to the lock, it carries the model\'s length across the room', () => {
    let s = withRibbon({ seat: 'across', lock: 70, model: 44, ribbon: { len: 80, at: 'peg' } })
    const model = placesOf(s).model!
    s = drag(new Hand(), s, [clip, { x: 500, y: 200 }, { x: model.x, y: model.y + 20 * STEP }]).salon
    expect(s.ribbon).toEqual({ len: 80, at: 'model' })
    const hung = { x: model.x + 36, y: model.y }
    s = drag(new Hand(), s, [{ x: hung.x + 70, y: 440 }, bladesAt({ x: hung.x + 30, y: hung.y + 44 * STEP }), bladesAt({ x: hung.x - 16, y: hung.y + 44 * STEP })]).salon
    expect(s.ribbon).toEqual({ len: 44, at: 'model' })
    s = drag(new Hand(), s, [{ x: hung.x, y: hung.y - 14 }, { x: 400, y: 300 }, onLock(30)]).salon
    expect(s.ribbon).toEqual({ len: 44, at: 'lock' })
    s = drag(new Hand(), s, [air, bladesAt({ x: LOCK_X + 30, y: tipY(44) }), bladesAt({ x: LOCK_X - 14, y: tipY(44) })]).salon
    expect(s.lock).toBe(s.model)
  })
})

describe('the things that move the game on', () => {
  it('give under the finger at once and act when the press ends, by a tap or after a drag', () => {
    const s = salon(), places = placesOf(s)
    const door = { x: BUTTONS.door.x + 80, y: BUTTONS.door.y + 200 }
    expect(tap(s, door).happenings).toEqual([{ kind: 'pressed', button: 'door', at: door }, { kind: 'button', button: 'door', at: door }])
    const pulled = drag(new Hand(), s, [places.knot!, { x: places.knot!.x - 80, y: places.knot!.y + 60 }])
    expect(pulled.happenings.map((h) => h.kind)).toEqual(['pressed', 'button'])
    expect(pulled.salon).toBe(s)
    expect(tap(s, { x: BUTTONS.bench.x + 100, y: BUTTONS.bench.y + 60 }).happenings[1]).toMatchObject({ kind: 'button', button: 'bench' })
    const off = salon({ cape: 'off' })
    expect(tap(off, { x: BUTTONS.chair.x + 30, y: BUTTONS.chair.y + 200 }).happenings[1]).toMatchObject({ kind: 'button', button: 'chair' })
  })
})

describe('any touch at all', () => {
  it('answers every random touch with something, and never leaves the salon out of range', () => {
    let s = salon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 46 }], ribbon: { len: 50, at: 'peg' } })
    let seed = 7
    const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
    for (let i = 0; i < 400; i++) {
      const hand = new Hand()
      const points = Array.from({ length: 2 + Math.floor(next() * 6) }, () => ({ x: next() * 1180, y: next() * 820 }))
      const done = next() < 0.3 ? tap(s, points[0]) : drag(hand, s, points)
      expect(done.happenings.length, `touch ${i}`).toBeGreaterThanOrEqual(2)
      s = done.salon
      for (const steps of [s.lock, ...s.mane, s.ribbon!.len]) expect(Number.isInteger(steps) && steps >= 4 && steps <= 100).toBe(true)
      expect(s.model).toBe(44)
      expect(s.clippings.length).toBeLessThanOrEqual(12)
    }
  })
})
