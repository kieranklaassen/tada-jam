import { describe, expect, it } from 'vitest'
import { COLLAR_Y, HEAD, LOCK_X, SCENE, STRIP_W, tipY } from './layout'
import { SLOP, clippingBox, crossedBy, dropPlace, facePart, floorX, floorY, placeOnFloor, tuftPose, tuftTip, whatIsAt } from './poses'
import { TUFTS } from './rules'
import type { Salon } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1, lock: 70, model: 44, seat: 'beside', cape: 'on',
  mane: Array(TUFTS).fill(60), ribbon: null, clippings: [], shown: { snip: true, pull: true, ribbon: false }, ...over,
})
const tipOf = (index: number, steps: number) => { const end = tuftTip(tuftPose(index, steps)); return { x: HEAD.x + end.x, y: HEAD.y + end.y } }
const rootOf = (index: number) => { const pose = tuftPose(index, 60); return { x: HEAD.x + pose.base.x, y: HEAD.y + pose.base.y } }
const mid = (a: { x: number; y: number }, b: { x: number; y: number }, t = 0.5) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

describe('where things are', () => {
  it('fans nine tufts from cheek to cheek over the top, each its own, all inside the scene at any length', () => {
    const angles = Array.from({ length: TUFTS }, (_, i) => tuftPose(i, 50).angle)
    for (let i = 1; i < TUFTS; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1])
    expect(new Set(Array.from({ length: TUFTS }, (_, i) => `${tuftPose(i, 50).width}/${tuftPose(i, 50).curl}`)).size).toBe(TUFTS)
    for (let i = 0; i < TUFTS; i++) for (const steps of [4, 100]) {
      const tip = tipOf(i, steps)
      expect(tip.x > 0 && tip.x < SCENE.w && tip.y > 0 && tip.y < SCENE.h, `tuft ${i} at ${steps}`).toBe(true)
    }
  })

  it('draws a tuft longer the longer it is', () => {
    for (let i = 0; i < TUFTS; i++) expect(tuftPose(i, 90).reach).toBeGreaterThan(tuftPose(i, 20).reach)
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

  it('lets a clipping go on the face at the nearest spot, and on the floor anywhere else', () => {
    expect(dropPlace({ x: HEAD.x, y: HEAD.y - 50 })).toEqual({ on: 'face', who: 'chair', spot: 'brow' })
    expect(dropPlace({ x: HEAD.x + 10, y: HEAD.y + 40 })).toEqual({ on: 'face', who: 'chair', spot: 'lip' })
    expect(dropPlace({ x: HEAD.x, y: HEAD.y + 84 })).toEqual({ on: 'face', who: 'chair', spot: 'chin' })
    expect(dropPlace({ x: 900, y: 500 })).toEqual({ on: 'floor', x: placeOnFloor(900) })
  })

  it('knows the parts of a face', () => {
    expect(facePart({ x: HEAD.x, y: HEAD.y + 24 })).toBe('nose')
    expect(facePart({ x: HEAD.x - 70, y: HEAD.y - 60 })).toBe('ear')
    expect(facePart({ x: HEAD.x, y: HEAD.y + 75 })).toBe('chin')
    expect(facePart({ x: HEAD.x - 70, y: HEAD.y })).toBe('cheek')
  })
})

describe('what is under a finger', () => {
  it('finds the lock along its whole length, with room for a fingertip, and says how far down it was touched', () => {
    const s = salon()
    expect(whatIsAt(s, { x: LOCK_X, y: COLLAR_Y + 2 })).toMatchObject({ object: 'lock' })
    const low = whatIsAt(s, { x: LOCK_X + STRIP_W / 2 + SLOP - 1, y: tipY(60) })
    expect(low).toMatchObject({ object: 'lock' })
    expect((low as { along: number }).along).toBeCloseTo(60)
    expect(whatIsAt(s, { x: LOCK_X, y: tipY(70) + SLOP + 4 })).toBeNull()
    expect(whatIsAt(s, { x: LOCK_X + STRIP_W / 2 + SLOP + 3, y: tipY(40) })).toBeNull()
  })

  it('keeps a stub as big a target as a fingertip', () => {
    const stub = salon({ lock: 4 })
    expect(whatIsAt(stub, { x: LOCK_X, y: COLLAR_Y + 30 })).toMatchObject({ object: 'lock', along: 4 })
  })

  it('finds each tuft along its length, and the face in front of the mane', () => {
    const s = salon()
    for (let i = 0; i < TUFTS; i++) {
      const hit = whatIsAt(s, mid(rootOf(i), tipOf(i, 60), 0.8))
      expect(hit, `tuft ${i}`).toMatchObject({ object: 'tuft', index: i })
      expect((hit as { along: number }).along).toBeCloseTo(48, 0)
    }
    expect(whatIsAt(s, { x: HEAD.x - 70, y: HEAD.y })).toEqual({ object: 'face', part: 'cheek' })
    expect(whatIsAt(s, rootOf(4))).toMatchObject({ object: 'face' })
  })

  it('finds a clipping where it lies, on top of whatever it lies on', () => {
    const s = salon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 46 }, { len: 12, hue: 'lion', on: 'face', who: 'chair', spot: 'lip' }] })
    const box = clippingBox(s.clippings[0])
    expect(whatIsAt(s, { x: box.x + box.half, y: box.y })).toEqual({ object: 'clipping', index: 0 })
    expect(whatIsAt(s, { x: HEAD.x, y: HEAD.y + 42 })).toEqual({ object: 'clipping', index: 1 })
    expect(whatIsAt(s, { x: box.x + box.half + SLOP + 5, y: box.y })).toBeNull()
  })

  it('finds nothing in the air, and only the floor with nobody in the chair', () => {
    const s = salon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 10 }] })
    for (const p of [{ x: 60, y: 60 }, { x: 1100, y: 400 }, { x: 300, y: 620 }]) expect(whatIsAt(s, p)).toBeNull()
    const empty = { ...s, chair: null, friend: null }
    expect(whatIsAt(empty, { x: LOCK_X, y: COLLAR_Y + 40 })).toBeNull()
    expect(whatIsAt(empty, { x: HEAD.x, y: HEAD.y })).toBeNull()
    expect(whatIsAt(empty, { x: floorX(10), y: floorY(10) })).toEqual({ object: 'clipping', index: 0 })
  })
})

describe('what the scissors cross', () => {
  it('cuts the lock where its middle is crossed, and nothing when the blades pass below its end or only brush its edge', () => {
    const s = salon()
    const across = crossedBy(s, { x: LOCK_X - 60, y: tipY(40) }, { x: LOCK_X + 60, y: tipY(40) })
    expect(across).toHaveLength(1)
    expect(across[0]).toMatchObject({ object: 'lock' })
    expect((across[0] as { at: number }).at).toBeCloseTo(40)
    expect(crossedBy(s, { x: LOCK_X - 60, y: tipY(80) }, { x: LOCK_X + 60, y: tipY(80) })).toEqual([])
    expect(crossedBy(s, { x: LOCK_X - 60, y: tipY(40) }, { x: LOCK_X - 4, y: tipY(40) })).toEqual([])
  })

  it('cuts every tuft a long stroke crosses, in the order it meets them', () => {
    const s = salon({ mane: Array(TUFTS).fill(90) })
    const a = mid(rootOf(3), tipOf(3, 90), 0.7), b = mid(rootOf(5), tipOf(5, 90), 0.7)
    const hits = crossedBy(s, { x: a.x - 30, y: a.y }, { x: b.x + 30, y: b.y }).filter((hit) => hit.object === 'tuft') as { index: number; at: number }[]
    expect(hits.map((hit) => hit.index)).toEqual([3, 4, 5])
    for (const hit of hits) expect(hit.at > 20 && hit.at < 90).toBe(true)
  })

  it('crosses the face once, as the blades come in over the middle of it, and cuts no hair inside it', () => {
    const s = salon()
    const hits = crossedBy(s, { x: HEAD.x - 200, y: HEAD.y }, { x: HEAD.x, y: HEAD.y })
    expect(hits.filter((hit) => hit.object === 'face')).toHaveLength(1)
    expect(crossedBy(s, { x: HEAD.x - 20, y: HEAD.y }, { x: HEAD.x + 20, y: HEAD.y })).toEqual([])
  })

  it('cuts a piece on the floor, and leaves one that is worn', () => {
    const s = salon({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 30 }, { len: 12, hue: 'lion', on: 'face', who: 'chair', spot: 'brow' }] })
    const box = clippingBox(s.clippings[0])
    expect(crossedBy(s, { x: box.x, y: box.y - 30 }, { x: box.x + 4, y: box.y + 30 })).toMatchObject([{ object: 'clipping', index: 0 }])
  })
})
