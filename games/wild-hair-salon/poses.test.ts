import { describe, expect, it } from 'vitest'
import { MANES } from './kits'
import { BESIDE_X, COLLAR_Y, HEAD, LOCK_X, PEG, SCENE, STEP, STRIP_W } from './layout'
import { LOOKS } from './looks'
import { BUTTONS, SLOP, clippingBox, crossedBy, dropPlace, facePart, onEar, floorX, floorY, onHead, placeOnFloor, placesOf, ribbonShape, stripOf, tuftPose, tuftRoot, tuftTip, whatIsAt, type Point } from './poses'
import { TUFTS } from './rules'
import { CUSTOMERS } from './tastes'
import type { Salon } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1, lock: 70, model: 44, seat: 'beside', cape: 'on',
  mane: Array(TUFTS).fill(60), ribbon: null, clippings: [], shown: { snip: true, pull: true, ribbon: false }, ...over,
})
const tipY = (steps: number): number => COLLAR_Y + steps * STEP
const customer = { x: HEAD.x, y: HEAD.y, s: 1 }
const tipOf = (index: number, steps: number, who: (typeof CUSTOMERS)[number] = 'lion') => onHead(customer, tuftTip(tuftPose(who, index, steps)))
const rootOf = (index: number, who: (typeof CUSTOMERS)[number] = 'lion') => onHead(customer, tuftPose(who, index, 60).base)
const mid = (a: Point, b: Point, t = 0.5) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const centre = (box: { x: number; y: number; w: number; h: number }): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })

describe('where things are', () => {
  it.each(CUSTOMERS)('fans the nine tufts of the %s from cheek to cheek, each its own, inside the scene at any length', (who) => {
    const fan = Array.from({ length: TUFTS }, (_, i) => { const base = tuftPose(who, i, 4).base; return Math.atan2(base.x, -base.y) })
    for (let i = 1; i < TUFTS; i++) expect(fan[i]).toBeGreaterThan(fan[i - 1])
    expect(new Set(MANES[who].own.map((own) => `${own.lean}/${own.width}/${own.curl}`)).size).toBe(TUFTS)
    for (let i = 0; i < TUFTS; i++) {
      expect(tuftPose(who, i, 90).reach).toBeGreaterThan(tuftPose(who, i, 20).reach)
      for (const steps of [4, 100]) {
        const tip = tipOf(i, steps, who)
        expect(tip.x > 0 && tip.x < SCENE.w && tip.y > 0 && tip.y < SCENE.h, `tuft ${i} at ${steps}`).toBe(true)
      }
    }
  })

  it('gives each customer hair of a different shape', () => {
    const shape = (who: (typeof CUSTOMERS)[number]) => { const k = MANES[who]; return `${k.from}/${k.to}/${k.base}/${k.step}/${k.swell}/${k.droop}` }
    expect(new Set(CUSTOMERS.map(shape)).size).toBe(4)
  })

  it('maps a place along the floor to the scene and back, inside the scene', () => {
    for (const place of [0, 13, 46, 84, 100]) {
      expect(placeOnFloor(floorX(place))).toBe(place)
      expect(floorX(place) > 0 && floorX(place) < SCENE.w).toBe(true)
      expect(floorY(place) > 640 && floorY(place) < SCENE.h).toBe(true)
    }
    expect(placeOnFloor(-500)).toBe(0)
    expect(placeOnFloor(5000)).toBe(100)
  })

  it('knows the parts of a face, in the head\'s own units', () => {
    expect(facePart({ x: 0, y: 24 })).toBe('nose')
    expect(facePart({ x: -70, y: -60 })).toBe('ear')
    expect(facePart({ x: 0, y: 75 })).toBe('chin')
    expect(facePart({ x: -70, y: 0 })).toBe('cheek')
  })
})

describe('who stands where', () => {
  it('has nobody and nothing to touch but the door and the floor before the first pair comes in', () => {
    const empty = salon({ chair: null, friend: null, cape: 'off', clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 10 }] })
    expect(placesOf(empty)).toEqual({ customer: null, friend: null, lock: null, model: null, seatFree: null, knot: null, chair: false })
    expect(whatIsAt(empty, { x: LOCK_X, y: COLLAR_Y + 40 })).toBeNull()
    expect(whatIsAt(empty, { x: HEAD.x, y: HEAD.y })).toBeNull()
    expect(whatIsAt(empty, centre(BUTTONS.door))).toEqual({ object: 'button', button: 'door' })
    expect(whatIsAt(empty, { x: floorX(10), y: floorY(10) })).toEqual({ object: 'clipping', index: 0 })
  })

  it('hangs the model beside the lock with top ends level when the friend is beside the chair, and apart when it sits across the room', () => {
    const beside = placesOf(salon())
    expect(beside.model).toEqual({ x: BESIDE_X, y: COLLAR_Y, unit: STEP })
    expect(beside.lock).toEqual({ x: LOCK_X, y: COLLAR_Y, unit: STEP })
    expect(beside.seatFree).toBe('bench')
    const across = placesOf(salon({ seat: 'across' }))
    expect(Math.abs(across.model!.x - across.lock!.x)).toBeGreaterThan(300)
    expect(across.model!.unit).toBe(across.lock!.unit)
    expect(across.seatFree).toBe('stool')
    expect(across.friend!.x).toBeLessThan(250)
  })

  it('stands the pair cheek to cheek once the cape is off, whatever seat the friend had', () => {
    for (const seat of ['beside', 'across'] as const) {
      const off = placesOf(salon({ seat, cape: 'off' }))
      expect(off.model).toEqual({ x: BESIDE_X, y: COLLAR_Y, unit: STEP })
      expect(off.knot).toBeNull()
      expect(off.seatFree).toBeNull()
      expect(off.chair).toBe(true)
    }
    expect(placesOf(salon()).knot).not.toBeNull()
    expect(placesOf(salon()).chair).toBe(false)
  })
})

describe('what is under a finger', () => {
  it('finds each strip along its whole length, with room for a fingertip, and says how far down it was touched', () => {
    const s = salon()
    expect(whatIsAt(s, { x: LOCK_X, y: COLLAR_Y + 2 })).toMatchObject({ object: 'lock' })
    const low = whatIsAt(s, { x: LOCK_X - STRIP_W / 2 - SLOP + 1, y: tipY(60) })
    expect(low).toMatchObject({ object: 'lock' })
    expect((low as { along: number }).along).toBeCloseTo(60)
    expect(whatIsAt(s, { x: BESIDE_X + 4, y: tipY(30) })).toMatchObject({ object: 'model' })
    expect(whatIsAt(s, { x: LOCK_X, y: tipY(70) + SLOP + 4 })).not.toMatchObject({ object: 'lock' })
    const across = salon({ seat: 'across' }), model = placesOf(across).model!
    expect(whatIsAt(across, { x: model.x, y: model.y + 20 * STEP })).toMatchObject({ object: 'model' })
    expect(whatIsAt(across, { x: BESIDE_X, y: tipY(30) })).not.toMatchObject({ object: 'model' })
  })

  it('keeps a stub as big a target as a fingertip', () => {
    expect(whatIsAt(salon({ lock: 4 }), { x: LOCK_X, y: COLLAR_Y + 30 })).toMatchObject({ object: 'lock', along: 4 })
  })

  it('finds each tuft along its length, the customer\'s face in front of its mane, and the friend\'s whole head as its face', () => {
    // With the friend across the room every tuft is free; beside the chair the friend stands in front of the ones nearest it.
    const free = salon({ seat: 'across' }), s = salon()
    for (let i = 0; i < TUFTS; i++) {
      const hit = whatIsAt(free, mid(rootOf(i), tipOf(i, 60), 0.85))
      expect(hit, `tuft ${i}`).toMatchObject({ object: 'tuft', index: i })
    }
    expect(whatIsAt(s, { x: HEAD.x - 70, y: HEAD.y })).toEqual({ object: 'face', who: 'chair', part: 'cheek' })
    expect(whatIsAt(s, rootOf(4))).toMatchObject({ object: 'face', who: 'chair' })
    const friend = placesOf(s).friend!
    expect(whatIsAt(s, { x: friend.x + 20, y: friend.y - 30 })).toMatchObject({ object: 'face', who: 'friend' })
    expect(whatIsAt(s, { x: friend.x + 50, y: friend.y - 50 })).toMatchObject({ object: 'face', who: 'friend' })
  })

  it('finds a clipping where it lies or is worn, on top of whatever it is on', () => {
    const s = salon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 46 }, { len: 12, hue: 'lion', on: 'face', who: 'chair', spot: 'lip' }, { len: 12, hue: 'lion', on: 'face', who: 'friend', spot: 'brow' }] })
    const box = clippingBox(s, s.clippings[0])!
    expect(whatIsAt(s, { x: box.x + box.half, y: box.y })).toEqual({ object: 'clipping', index: 0 })
    expect(whatIsAt(s, { x: HEAD.x, y: HEAD.y + 42 })).toEqual({ object: 'clipping', index: 1 })
    const worn = clippingBox(s, s.clippings[2])!
    expect(whatIsAt(s, { x: worn.x, y: worn.y })).toEqual({ object: 'clipping', index: 2 })
    expect(worn.half).toBeLessThan(clippingBox(s, s.clippings[1])!.half)
  })

  it('lets a clipping go on the face under it, at the nearest spot, and on the floor anywhere else', () => {
    const s = salon(), friend = placesOf(s).friend!
    expect(dropPlace(s, { x: HEAD.x, y: HEAD.y - 50 })).toEqual({ on: 'face', who: 'chair', spot: 'brow' })
    expect(dropPlace(s, { x: HEAD.x + 10, y: HEAD.y + 40 })).toEqual({ on: 'face', who: 'chair', spot: 'lip' })
    expect(dropPlace(s, { x: friend.x, y: friend.y + 50 })).toEqual({ on: 'face', who: 'friend', spot: 'chin' })
    expect(dropPlace(s, { x: 900, y: 700 })).toEqual({ on: 'floor', x: placeOnFloor(900) })
    expect(dropPlace(salon({ chair: null, friend: null }), { x: HEAD.x, y: HEAD.y })).toEqual({ on: 'floor', x: placeOnFloor(HEAD.x) })
  })

  it('finds the things that move the game on, under everything else: the door, the empty seat, the knot, and the chair once the cape is off', () => {
    const s = salon()
    expect(whatIsAt(s, centre(BUTTONS.door))).toEqual({ object: 'button', button: 'door' })
    expect(whatIsAt(s, centre(BUTTONS.bench))).toEqual({ object: 'button', button: 'bench' })
    expect(whatIsAt(s, placesOf(s).knot!)).toEqual({ object: 'button', button: 'knot' })
    const across = salon({ seat: 'across' })
    expect(whatIsAt(across, { x: BUTTONS.stool.x + 56, y: BUTTONS.stool.y + 70 })).toEqual({ object: 'button', button: 'stool' })
    expect(whatIsAt(across, centre(BUTTONS.bench))).not.toEqual({ object: 'button', button: 'bench' })
    const off = salon({ cape: 'off' })
    expect(whatIsAt(off, { x: BUTTONS.chair.x + 30, y: BUTTONS.chair.y + 200 })).toEqual({ object: 'button', button: 'chair' })
    expect(whatIsAt(s, { x: BUTTONS.chair.x + 30, y: BUTTONS.chair.y + 200 })).toBeNull()
  })

  it('finds nothing in the air', () => {
    for (const p of [{ x: 860, y: 80 }, { x: 330, y: 120 }, { x: 800, y: 700 }]) expect(whatIsAt(salon(), p)).toBeNull()
  })
})

describe('an ear', () => {
  it('answers where each customer\'s ears are drawn: on top, at the sides, or standing up above the head', () => {
    const salonWith = (chair: (typeof CUSTOMERS)[number]): Salon => ({ chair, friend: chair === 'lion' ? 'poodle' : 'lion', waiting: ['yak', 'rabbit'], seed: 1, lock: 60, model: 44, seat: 'across', cape: 'on', mane: Array(TUFTS).fill(20), ribbon: null, clippings: [], shown: { snip: true, pull: true, ribbon: true } })
    for (const who of CUSTOMERS) {
      const ears = LOOKS[who].ears, middle = { x: -ears.x, y: ears.y - (ears.kind === 'long' ? ears.ry * 0.8 : 0) }
      expect(onEar(who, middle), who).toBe(true)
      expect(onEar(who, { x: 0, y: 30 }), who).toBe(false)
      expect(facePart(middle, who)).toBe('ear')
      // On the left ear of the one in the chair: a touch there is a touch on that ear.
      expect(whatIsAt(salonWith(who), { x: HEAD.x + middle.x, y: HEAD.y + middle.y }), who).toEqual({ object: 'face', who: 'chair', part: 'ear' })
    }
    // The rabbit's ears stand well above its head, and the poodle's are out at the sides of her face.
    expect(onEar('rabbit', { x: 40, y: -180 })).toBe(true)
    expect(onEar('poodle', { x: 110, y: 30 })).toBe(true)
    expect(onEar('lion', { x: 110, y: 30 })).toBe(false)
  })
})

describe('the ribbon', () => {
  it('is nowhere until it is in the salon, and then hangs from its peg', () => {
    expect(ribbonShape(salon())).toBeNull()
    expect(ribbonShape(salon({ ribbon: { len: 44, at: 'peg' } }))).toEqual({ kind: 'hang', root: PEG, unit: STEP })
  })

  it('hangs beside a lock with its top end level with it, on the side away from the other lock', () => {
    const atLock = ribbonShape(salon({ ribbon: { len: 44, at: 'lock' } }))!
    expect(atLock).toMatchObject({ kind: 'hang', root: { y: COLLAR_Y } })
    expect((atLock as { root: Point }).root.x).toBeLessThan(LOCK_X - STRIP_W)
    for (const seat of ['beside', 'across'] as const) {
      const s = salon({ seat, ribbon: { len: 44, at: 'model' } }), model = placesOf(s).model!
      const shape = ribbonShape(s) as { kind: string; root: Point }
      expect(shape.root.y).toBe(model.y)
      expect(shape.root.x - model.x).toBeGreaterThan(STRIP_W)
    }
  })

  it('is found by its clip to be carried, and by its length to be pulled', () => {
    const s = salon({ ribbon: { len: 60, at: 'peg' } })
    expect(whatIsAt(s, { x: PEG.x, y: PEG.y - 14 })).toEqual({ object: 'ribbonClip' })
    expect(whatIsAt(s, { x: PEG.x, y: PEG.y + 40 * STEP })).toMatchObject({ object: 'ribbon' })
    expect((whatIsAt(s, { x: PEG.x, y: PEG.y + 40 * STEP }) as { along: number }).along).toBeCloseTo(40)
    expect(stripOf(s, 'ribbon')).toEqual({ root: PEG, unit: STEP, length: 60 })
  })

  it('is a thing to pick up, with no length to pull, while it is worn as a bow or a blindfold', () => {
    const bow = salon({ ribbon: { len: 60, at: 'mane', tuft: 4 } }), shape = ribbonShape(bow) as { kind: string; at: Point; as: string }
    expect(shape).toMatchObject({ kind: 'worn', as: 'bow' })
    expect(shape.at).toEqual(tipOf(4, 60))
    expect(whatIsAt(bow, shape.at)).toEqual({ object: 'ribbonClip' })
    expect(stripOf(bow, 'ribbon')).toBeNull()
    const blind = salon({ ribbon: { len: 60, at: 'face', who: 'friend' } })
    expect(ribbonShape(blind)).toMatchObject({ kind: 'worn', as: 'blindfold' })
    expect(whatIsAt(blind, (ribbonShape(blind) as { at: Point }).at)).toEqual({ object: 'ribbonClip' })
  })

  it('lies on the floor beside a piece, and goes back to its peg when what it hung on is gone', () => {
    const lying = salon({ ribbon: { len: 30, at: 'floor', x: 40 } }), shape = ribbonShape(lying) as { kind: string; from: Point }
    expect(shape.kind).toBe('lie')
    expect(shape.from.y).toBeGreaterThan(640)
    expect(whatIsAt(lying, { x: shape.from.x + 20 * STEP, y: shape.from.y })).toMatchObject({ object: 'ribbon' })
    const nobody = salon({ chair: null, friend: null, ribbon: { len: 30, at: 'lock' } })
    expect(ribbonShape(nobody)).toEqual({ kind: 'hang', root: PEG, unit: STEP })
  })
})

describe('what the scissors cross', () => {
  it('cuts a strip where its middle is crossed, and nothing when the blades pass below its end or only brush its edge', () => {
    const s = salon({ ribbon: { len: 50, at: 'peg' } })
    const across = crossedBy(s, { x: LOCK_X - 20, y: tipY(40) }, { x: LOCK_X + 16, y: tipY(40) })
    expect(across).toMatchObject([{ object: 'lock' }])
    expect((across[0] as { at: number }).at).toBeCloseTo(40)
    expect(crossedBy(s, { x: LOCK_X - 20, y: tipY(80) }, { x: LOCK_X + 16, y: tipY(80) })).toEqual([])
    expect(crossedBy(s, { x: LOCK_X - 30, y: tipY(40) }, { x: LOCK_X - 4, y: tipY(40) })).toEqual([])
    expect(crossedBy(s, { x: BESIDE_X - 14, y: tipY(20) }, { x: BESIDE_X + 14, y: tipY(20) })).toMatchObject([{ object: 'model' }])
    expect(crossedBy(s, { x: PEG.x - 14, y: PEG.y + 30 * STEP }, { x: PEG.x + 14, y: PEG.y + 30 * STEP })).toMatchObject([{ object: 'ribbon' }])
  })

  it('cuts both locks in one stroke, in the order it meets them', () => {
    const hits = crossedBy(salon(), { x: LOCK_X - 20, y: tipY(20) }, { x: BESIDE_X + 20, y: tipY(20) })
    expect(hits.map((hit) => hit.object)).toEqual(['lock', 'model'])
  })

  it('cuts every tuft a long stroke crosses, in the order it meets them', () => {
    const s = salon({ mane: Array(TUFTS).fill(90) })
    const a = mid(rootOf(3), tipOf(3, 90), 0.7), b = mid(rootOf(5), tipOf(5, 90), 0.7)
    const hits = crossedBy(s, { x: a.x - 30, y: a.y }, { x: b.x + 30, y: b.y }).filter((hit) => hit.object === 'tuft') as { index: number; at: number }[]
    expect(hits.map((hit) => hit.index)).toEqual([3, 4, 5])
    for (const hit of hits) expect(hit.at > 20 && hit.at < 90).toBe(true)
  })

  it('cuts a tuft where it was crossed: the stump ends at the blades, whatever the customer and however long the tuft', () => {
    for (const who of CUSTOMERS) for (const steps of [40, 90]) for (const t of [0.75, 0.9]) {
      const s = salon({ chair: who, friend: CUSTOMERS.find((other) => other !== who)!, mane: Array(TUFTS).fill(steps) })
      const root = rootOf(4, who), tip = tipOf(4, steps, who), at = mid(root, tip, t)
      // Across the tuft, at right angles to it.
      const along = { x: (tip.x - root.x) / Math.hypot(tip.x - root.x, tip.y - root.y), y: (tip.y - root.y) / Math.hypot(tip.x - root.x, tip.y - root.y) }
      const hit = crossedBy(s, { x: at.x - along.y * 20, y: at.y + along.x * 20 }, { x: at.x + along.y * 20, y: at.y - along.x * 20 }).find((found) => found.object === 'tuft' && found.index === 4) as { at: number } | undefined
      if (!hit) continue
      // A tuft cut to that many steps reaches from its root to where the blades were, to within a step's rounding.
      const left = Math.max(0, Math.round(hit.at))
      expect(Math.abs(tuftPose(who, 4, left).reach - Math.hypot(at.x - root.x, at.y - root.y)), `${who} ${steps} ${t}`).toBeLessThan(MANES[who].step * 1.5)
    }
  })

  it('crosses a face once, as the blades come in over the middle of it, and cuts no hair inside it', () => {
    const s = salon()
    const hits = crossedBy(s, { x: HEAD.x - 200, y: HEAD.y }, { x: HEAD.x, y: HEAD.y })
    expect(hits.filter((hit) => hit.object === 'face')).toMatchObject([{ who: 'chair' }])
    expect(crossedBy(s, { x: HEAD.x - 20, y: HEAD.y }, { x: HEAD.x + 20, y: HEAD.y })).toEqual([])
    const friend = placesOf(s).friend!
    expect(crossedBy(s, { x: friend.x + 120, y: friend.y }, { x: friend.x, y: friend.y }).filter((hit) => hit.object === 'face')).toMatchObject([{ who: 'friend' }])
  })

  it('cuts a piece on the floor, and leaves one that is worn', () => {
    const s = salon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 30 }, { len: 12, hue: 'lion', on: 'face', who: 'chair', spot: 'brow' }] })
    const box = clippingBox(s, s.clippings[0])!
    expect(crossedBy(s, { x: box.x, y: box.y - 30 }, { x: box.x + 4, y: box.y + 30 })).toMatchObject([{ object: 'clipping', index: 0 }])
  })

  it('gives the finger the root of whatever it holds', () => {
    const s = salon()
    expect(stripOf(s, 'lock')).toEqual({ root: { x: LOCK_X, y: COLLAR_Y, unit: STEP }, unit: STEP, length: 70 })
    expect(stripOf(s, 'model')!.length).toBe(44)
    expect(stripOf(s, 'ribbon')).toBeNull()
    expect(tuftRoot(s, 2)).toMatchObject({ root: rootOf(2), unit: MANES.lion.step, length: 60 })
    expect(tuftRoot(salon({ chair: null, friend: null }), 2)).toBeNull()
  })
})
