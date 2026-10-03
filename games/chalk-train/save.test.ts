import { describe, expect, it } from 'vitest'
import { MAX_MARKS, MAX_MARK_POINTS, MAX_POINTS, type Mark } from './marks'
import { makeMark, showFirst } from './play'
import { between, makeRng } from './rng'
import { deserialize, serialize, type Saved } from './save'
import { FELT_CAP, RIDERS, noFeels } from './tastes'
import { MAX_RIDERS, SEATS, freshWorld, railAt, type Rider, type World } from './world'
import { PLACE_IDS, TAR, type Pt } from './yard'

const line = (from: Pt, to: Pt, steps = 40): Pt[] => Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }))
/** Through storage and back: plain JSON, as the shell keeps it. */
const stored = (world: World): unknown => JSON.parse(JSON.stringify(serialize(world)))
const sound = (w: World) => {
  expect(w.riders.length).toBeLessThanOrEqual(MAX_RIDERS)
  expect(w.riders.filter((r) => r.at === 'train').length).toBeLessThanOrEqual(SEATS)
  expect(w.marks.length).toBeLessThanOrEqual(MAX_MARKS)
  expect(w.marks.reduce((sum, m) => sum + m.p.length, 0)).toBeLessThanOrEqual(MAX_POINTS)
  expect(w.finished || w.riders.some((r) => r.at === 'stop' || r.at === 'train')).toBe(true)
}

describe('the saved world', () => {
  it('is found exactly as it was left, at any instant of play', () => {
    const rng = makeRng(8)
    let w = showFirst(freshWorld(3, 8)).world
    for (let i = 0; i < 200; i++) {
      const aim = w.riders.find((r) => r.at === 'stop' || r.at === 'train')
      const c = { x: between(rng, 0, TAR.w), y: between(rng, 0, TAR.h) }
      const raw = i % 3 === 0 ? [c] : i % 3 === 1 && aim ? line({ x: w.train.x, y: w.train.y }, aim.at === 'train' ? railAt(aim.home) : railAt(aim.stop)) : line({ x: w.train.x, y: w.train.y }, c)
      w = makeMark(w, raw).world
      expect(deserialize(stored(w), null, 1)).toEqual(w)
    }
  })

  it('saves no ride in progress: the train is saved where its ride comes to rest', () => {
    const w = makeMark(freshWorld(null, 2), line({ x: 220, y: 460 }, { x: 700, y: 300 })).world
    const saved = serialize(w)
    expect(Object.keys(saved).sort()).toEqual(['ahead', 'chalk', 'finished', 'marks', 'position', 'riders', 'seed', 'shown', 'train', 'v', 'water'])
    expect(Math.abs(saved.train.x - 700)).toBeLessThan(14)
  })

  it('gives a first visit for anything that is not its record, or that a newer build wrote', () => {
    const fresh = freshWorld(null, 5)
    for (const junk of [null, undefined, 7, 'x', [], {}, { v: 99 }, { v: '1' }]) expect(deserialize(junk, null, 5)).toEqual(fresh)
    expect(deserialize(null, 4, 5).position).toBe('up-and-down')
  })

  it('lets a saved position win over the age, and an unknown position fall back to the first-visit default', () => {
    const w = { ...freshWorld(null, 2), position: 'far-rider' }
    expect(deserialize(stored(w), 2, 1).position).toBe('far-rider')
    expect(deserialize({ ...(stored(w) as Saved), position: 'groep-3' }, 4, 1).position).toBe('up-and-down')
  })

  it('repairs each damaged field by itself and keeps the rest', () => {
    const w = makeMark(showFirst(freshWorld(null, 6)).world, line({ x: 300, y: 300 }, { x: 600, y: 320 })).world
    const good = stored(w) as Saved
    const withBad = (patch: Record<string, unknown>) => deserialize({ ...good, ...patch }, null, 9)
    expect(withBad({ marks: 'gone' }).marks).toEqual([])
    expect(withBad({ marks: 'gone' }).riders).toEqual(w.riders)
    expect(withBad({ train: null }).train).toMatchObject({ face: 1, stripes: -1, tint: -1 })
    expect(withBad({ train: null }).marks).toEqual(w.marks)
    expect(withBad({ water: 77 }).water).toBe(-1)
    expect(withBad({ chalk: 2.5 }).chalk).toBe(0)
    expect(withBad({ seed: -4 }).seed).toBe(9)
    expect(withBad({ shown: 'yes' }).shown).toBe(false)
    expect(withBad({ ahead: 'groep-3' }).ahead).toBe(w.position)
    expect(withBad({ ahead: 'two-at-once' }).ahead).toBe('two-at-once')
    expect(withBad({ train: { x: 1e9, y: -50, f: 3, s: 9, t: 'pink' } }).train).toEqual({ x: TAR.w, y: 0, face: 1, stripes: -1, tint: -1 })
  })

  it('drops a damaged mark or rider and keeps its neighbours', () => {
    const w = makeMark(freshWorld(null, 6), line({ x: 300, y: 300 }, { x: 600, y: 320 })).world
    const good = stored(w) as Saved
    const marks = [...good.marks, { c: 1, p: [1, 2, 3] }, { c: 1, p: ['a', 'b'] }, 'x', { c: 9, p: [5000, -5, 10, 10] }]
    const read = deserialize({ ...good, marks }, null, 1)
    expect(read.marks.length).toBe(w.marks.length + 1)
    expect(read.marks[read.marks.length - 1]).toEqual({ c: 0, p: [{ x: TAR.w, y: 0 }, { x: 10, y: 10 }] })
    const riders = [...good.riders, { k: 'dragon', s: 'mid-1', h: 'mid-2', a: 'stop', c: 0, t: 0, f: [] }, { k: 'cat', s: 'nowhere', h: 'mid-2', a: 'stop' }, 5]
    expect(deserialize({ ...good, riders }, null, 1).riders).toEqual(w.riders)
  })

  it('never opens on a tar with nobody in play, whatever was saved', () => {
    const w = freshWorld(null, 6)
    for (const riders of [undefined, [], 'none', [{ k: 'frog', s: 'mid-2', h: 'mid-2', a: 'stop' }]]) {
      const read = deserialize({ ...(stored(w) as Saved), riders }, null, 1)
      sound(read)
      expect(read.riders.some((r) => r.at === 'stop')).toBe(true)
      // And the game plays on from there.
      sound(makeMark(read, [{ x: 600, y: 300 }]).world)
    }
  })

  it('holds a record to the caps whatever it claims: riders, seats, marks, tallies and trips', () => {
    const many: Rider[] = RIDERS.flatMap((kind, i) => [{ kind, stop: PLACE_IDS[i * 2], home: PLACE_IDS[i * 2 + 1], at: 'train' as const, chalk: 1e12, tar: -5, felt: { ...noFeels(), loop: 400 } }])
    const w: World = { ...freshWorld(null, 1), riders: many }
    const read = deserialize(stored(w), null, 1)
    sound(read)
    expect(read.riders[0].felt.loop).toBeLessThanOrEqual(FELT_CAP)
    expect(read.riders[0].chalk).toBeLessThanOrEqual(99999)
    expect(read.riders[0].tar).toBe(0)
  })

  it('keeps a largest legal state under half of the 64 KB cap', () => {
    // As much chalk as the tar holds, at the far corner where every number is longest, and four riders with long trips.
    const marks: Mark[] = []
    for (let m = 0; marks.reduce((sum, x) => sum + x.p.length, 0) < MAX_POINTS && m < MAX_MARKS; m++) {
      const left = MAX_POINTS - marks.reduce((sum, x) => sum + x.p.length, 0)
      marks.push({ c: 4, p: Array.from({ length: Math.min(MAX_MARK_POINTS, left) }, (_, i) => ({ x: TAR.w - (i % 9), y: TAR.h - 100 - (i % 7) })) })
    }
    const riders: Rider[] = RIDERS.map((kind, i) => ({ kind, stop: PLACE_IDS[i * 2], home: PLACE_IDS[i * 2 + 1], at: i < 2 ? 'train' : i === 2 ? 'next' : 'before', chalk: 99999, tar: 99999, felt: { fast: 9, corner: 9, loop: 9, splash: 9, bump: 9, scribble: 9 } }))
    const largest: World = { ...freshWorld(null, 0xffffffff), position: 'round-the-water', ahead: 'round-the-water', seed: 0xffffffff, marks, riders, chalk: 4, water: 4, shown: true, train: { x: TAR.w, y: TAR.h, face: -1, stripes: 4, tint: 4 } }
    const bytes = new TextEncoder().encode(JSON.stringify(serialize(largest))).length
    expect(marks.reduce((sum, x) => sum + x.p.length, 0)).toBe(MAX_POINTS)
    expect(bytes).toBeLessThan(32 * 1024)
    // And it reads back whole.
    expect(deserialize(JSON.parse(JSON.stringify(serialize(largest))), null, 1)).toEqual(largest)
  })
})
