import { describe, expect, it } from 'vitest'
import { FIXED, FULL, HEADS, IDS, SPECS, ROLLS, WEDGES, bits, type Id } from './layout'
import { MOUSE_BEATS, faults, freshWorld, isParcel, isTearing, parcels, quiet, specOf, topOf, wrapNothing, type World } from './model'
import { Play } from './play'
import { hintFor } from './guide'
import type { Point } from './input'
import { deserialize, serialize } from './state'
import { makeRng } from './rng'

let t = 0
const bare = (): World => { const w = freshWorld(); w.layers.bike = []; w.shown = true; return w }
const run = (p: Play, s: number) => { for (let i = 0; i < s * 60; i++) p.advance(1 / 60) }
const tap = (p: Play, at: Point, id = 1) => { p.down(id, at, (t += 60)); p.up(id, at, (t += 60)) }
const trace = (p: Play, pts: Point[], end = true) => {
  p.down(1, pts[0], (t += 60))
  for (const q of pts.slice(1)) p.move(1, q, (t += 16))
  if (end) p.up(1, pts[pts.length - 1], (t += 16))
}
/** A circle round a thing: from a share of a turn to another, at a share of its reach. */
const ring = (c: Point, rx: number, ry: number, from: number, to: number, wobble = 0): Point[] =>
  Array.from({ length: 41 }, (_, i) => {
    const a = (from + ((to - from) * i) / 40) * Math.PI * 2, k = 1 + wobble * Math.sin(i * 2.3)
    return { x: c.x + Math.cos(a) * rx * k, y: c.y + Math.sin(a) * ry * k }
  })
const round = (id: Id, from = 0, to = 1, k = 1.15, wobble = 0) => { const s = specOf(bare(), id)!; return ring(s.mid, s.rx * k, s.ry * k, from, to, wobble) }
const on = (id: Id): Point => specOf(freshWorld(), id)!.mid
const NOTHING: Point[] = ring({ x: 860, y: 170 }, 50, 50, 0, 1)

describe('wrapping', () => {
  it.each(FIXED.map((id) => [id]))('a circle round the %s wraps it and nothing else', (id) => {
    const p = new Play(bare())
    trace(p, round(id))
    run(p, 1)
    expect(parcels(p.world)).toEqual([id])
    expect(IDS.filter((x) => topOf(p.world, x))).toEqual([id])
  })
  it.each(FIXED.map((id) => [id]))('a wobbly, broken and reversed circle wraps the %s', (id) => {
    const p = new Play(bare())
    trace(p, round(id, 0.1, 0.5, 1.05, 0.15)); trace(p, round(id, 1.1, 0.5, 1.05, 0.15))
    run(p, 1)
    expect(isParcel(p.world, id)).toBe(true)
  })
  it.each(FIXED.map((id) => [id]))('a scribble over the %s wraps it', (id) => {
    const p = new Play(bare()), s = SPECS[id]
    const pts = Array.from({ length: 80 }, (_, i) => ({ x: s.mid.x + Math.sin(i * 0.9) * s.rx * 0.8, y: s.mid.y + Math.sin(i * 0.37) * s.ry * 0.8 }))
    p.down(1, { x: s.mid.x, y: s.mid.y + s.ry * 0.5 }, (t += 60))
    for (const q of pts) p.move(1, q, (t += 16))
    p.up(1, pts[79], (t += 16)); run(p, 1)
    expect(isParcel(p.world, id)).toBe(true)
  })
  it.each(FIXED.map((id) => [id]))('four taps on one spot wrap the %s', (id) => {
    const p = new Play(bare()), at = { x: SPECS[id].mid.x + 10, y: SPECS[id].mid.y + 30 }
    for (let i = 0; i < 4; i++) tap(p, at)
    run(p, 1)
    expect(isParcel(p.world, id)).toBe(true)
  })
  it('lays paper as the finger lands', () => {
    const p = new Play(bare())
    p.down(1, on('tuba'), 1)
    expect(bits(topOf(p.world, 'tuba')!.cover)).toBe(3)
  })
  it('the half wrapped bicycle of the first frame is finished by its bare half', () => {
    const p = new Play(freshWorld())
    expect(bits(topOf(p.world, 'bike')!.cover)).toBe(8)
    trace(p, round('bike', -0.25, 0.25)); run(p, 1)
    expect(isParcel(p.world, 'bike')).toBe(true)
  })
  it('the finger that finished a thing lays nothing more on it', () => {
    const p = new Play(bare())
    trace(p, round('giraffe', 0, 3))
    expect(p.world.layers.giraffe).toHaveLength(1)
    expect(bits(topOf(p.world, 'giraffe')!.cover)).toBe(WEDGES)
  })
  it('three circles are three papers, and three rips take them off', () => {
    const p = new Play(bare())
    for (const paper of [0, 1, 2]) { tap(p, ROLLS[paper]); trace(p, round('giraffe', 0.02, 1, 1.25)); run(p, 1) }
    expect(p.world.layers.giraffe.map((l) => l.paper)).toEqual([0, 1, 2])
    trace(p, round('giraffe', 0.02, 1, 1.25)); run(p, 1)
    expect(p.world.layers.giraffe).toHaveLength(3)
    for (const left of [2, 1, 0]) { for (let i = 0; i < 3; i++) tap(p, on('giraffe')); expect(p.world.layers.giraffe).toHaveLength(left) }
  })
  it('one circle round two things ties them, and a rip of either undoes it', () => {
    const p = new Play(bare())
    trace(p, ring({ x: 625, y: 650 }, 330, 190, 0, 1.15)); run(p, 1)
    expect(p.world.ties.map((x) => [...x].sort())).toEqual([['bike', 'cat']])
    expect(parcels(p.world).sort()).toEqual(['bike', 'cat'])
    expect(p.world.walk).toBeNull()
    for (let i = 0; i < 3; i++) tap(p, on('cat'))
    expect(p.world.ties).toEqual([])
    expect(isParcel(p.world, 'bike')).toBe(true)
  })
  it('a circle of nothing is a parcel of nothing; a third puffs the oldest open', () => {
    const p = new Play(bare())
    trace(p, NOTHING); run(p, 0.2)
    expect(p.world.airs.air0).not.toBeNull()
    for (let i = 0; i < 3; i++) tap(p, { x: 860, y: 170 })
    expect(p.world.airs.air0).toBeNull()
    expect(p.world.events.some((e) => e.type === 'moth')).toBe(true)
    for (const y of [90, 170, 260]) trace(p, ring({ x: 940, y }, 34, 34, 0, 1.1))
    expect(faults(p.world)).toEqual([])
    expect(parcels(p.world)).toHaveLength(2)
  })
})

describe('ripping', () => {
  it('a swipe bursts it', () => {
    const p = new Play(bare())
    trace(p, round('bike')); run(p, 1)
    trace(p, [{ x: 360, y: 650 }, { x: 420, y: 660 }, { x: 480, y: 640 }, { x: 540, y: 650 }, { x: 600, y: 650 }])
    expect(topOf(p.world, 'bike')).toBeNull()
    expect(p.world.scraps.length).toBeGreaterThan(0)
  })
  it('a tear shows as the finger lands, and stays', () => {
    const p = new Play(bare())
    trace(p, round('tuba')); run(p, 1)
    p.down(1, on('tuba'), (t += 60)); p.cancel(1)
    expect(isTearing(p.world, 'tuba')).toBe(true)
    run(p, 2)
    expect(isTearing(p.world, 'tuba')).toBe(true)
  })
  it('the swipe that burst one paper leaves the one under it', () => {
    const p = new Play(bare())
    trace(p, round('tuba')); run(p, 1); trace(p, round('tuba', 0.02, 1, 1.3)); run(p, 1)
    expect(p.world.layers.tuba).toHaveLength(2)
    trace(p, Array.from({ length: 60 }, (_, i) => ({ x: 900 + (i % 10) * 10, y: 470 })))
    expect(p.world.layers.tuba).toHaveLength(1)
    expect(isParcel(p.world, 'tuba')).toBe(true)
  })
  it('the cat walks off in its paper, and a rip brings it home', () => {
    const p = new Play(bare())
    trace(p, round('cat')); run(p, 3)
    expect(p.world.catX).toBeLessThan(SPECS.cat.x - 20)
    const s = specOf(p.world, 'cat')!
    for (let i = 0; i < 3; i++) tap(p, s.mid)
    run(p, 1)
    expect(p.world.catX).toBe(SPECS.cat.x)
    expect(quiet(p.world)).toBe(true)
  })
})

describe('the rest of the room', () => {
  it('the door sends the family through every parcel, and it is saved as done at once', () => {
    const p = new Play(bare())
    trace(p, round('tuba')); trace(p, round('bike')); trace(p, round('grandpa')); run(p, 1)
    expect(parcels(p.world)).toHaveLength(3)
    tap(p, { x: 1120, y: 300 })
    expect(Object.values(serialize(p.world).layers).flat()).toEqual([])
    run(p, 0.5); expect(p.world.visit).not.toBeNull()
    run(p, 10)
    expect(p.world.visit).toBeNull()
    expect(parcels(p.world)).toEqual([])
  })
  it('what the child wraps again during a visit is kept', () => {
    const p = new Play(bare())
    trace(p, round('tuba')); trace(p, round('grandpa')); run(p, 1); tap(p, { x: 1120, y: 300 })
    for (let i = 0; i < 3; i++) tap(p, on('grandpa'))
    for (let i = 0; i < 4; i++) tap(p, on('grandpa'))
    run(p, 12)
    expect(parcels(p.world)).toEqual(['grandpa'])
  })
  it('with no parcel they only look in', () => {
    const p = new Play(bare()); tap(p, { x: 1120, y: 300 })
    expect(p.world.visit).toBeNull()
    expect(p.world.events.some((e) => e.type === 'noses')).toBe(true)
  })
  it('the mouse shows the whole of it once, and any touch ends it', () => {
    const p = new Play(freshWorld()); run(p, 1)
    expect(p.world.mouse).not.toBeNull()
    expect(serialize(p.world).shown).toBe(true)
    tap(p, on('tree')); expect(p.world.mouse).toBeNull()
    run(p, 3); expect(p.world.mouse).toBeNull()
    tap(p, { x: 1040, y: 700 }); expect(p.world.mouse).not.toBeNull()
    run(p, MOUSE_BEATS.end + 0.1); expect(p.world.mouse).toBeNull()
  })
  it('a tapped scrap is eaten', () => {
    const w = bare(); w.scraps = [{ x: 600, y: 790 - 20, paper: 0, turn: 0 }]
    const p = new Play(w); w.scraps[0].x = 700; w.scraps[0].y = 765; tap(p, { x: 700, y: 768 })
    expect(w.scraps).toEqual([])
  })
  it('shows one next act at each stage', () => {
    const p = new Play(freshWorld())
    expect(hintFor(p.world)).toMatchObject({ kind: 'circle', id: 'bike', wedges: 8 })
    trace(p, round('bike', -0.25, 0.25)); run(p, 1)
    expect(hintFor(p.world)).toMatchObject({ kind: 'rip', id: 'bike' })
    for (let i = 0; i < 3; i++) tap(p, on('bike'))
    expect(hintFor(p.world)).toMatchObject({ kind: 'circle', id: 'cat' })
    trace(p, round('tuba')); trace(p, round('tree')); run(p, 1)
    expect(hintFor(p.world)).toMatchObject({ kind: 'door' })
  })
  it('a resting palm does not deafen the room', () => {
    const p = new Play(bare())
    p.down(9, { x: 600, y: 790 }, 0); t = 3000
    p.down(1, on('tuba'), t)
    expect(topOf(p.world, 'tuba')).not.toBeNull()
    p.down(2, on('tree'), t + 10)
    expect(topOf(p.world, 'tree')).toBeNull()
    expect(p.pokes[p.pokes.length - 1].touched.kind).toBe('room')
  })
})

describe('the save', () => {
  it('holds the room at any moment of random play, and reads back the same', () => {
    const rng = makeRng(5), p = new Play(freshWorld())
    for (let i = 0; i < 500; i++) {
      const a = { x: rng.next() * 1180, y: rng.next() * 820 }
      if (rng.next() < 0.5) tap(p, a)
      else { const r = 40 + rng.next() * 160; trace(p, ring(a, r, r, 0, 0.4 + rng.next(), 0.1), rng.next() < 0.9); if (rng.next() < 0.5) p.clear(); else p.up(1, a, t) }
      run(p, rng.next() * 0.6)
      expect(faults(p.world)).toEqual([])
      const save = serialize(p.world), back = deserialize(JSON.parse(JSON.stringify(save)))
      expect(faults(back)).toEqual([])
      expect(serialize(back)).toEqual(save)
      expect(JSON.stringify(save).length).toBeLessThan(32_000)
    }
  })
  it('a damaged save opens', () => {
    for (const raw of [null, 3, [], { v: 2 }, { v: 1, layers: { cat: [{ paper: 9 }], air0: [{ paper: 0, cover: FULL }], bike: 'x' }, ties: [['cat', 'cat'], 4], scraps: [null], airs: 7 }]) expect(faults(deserialize(raw))).toEqual([])
  })
})

describe('found in review', () => {
  it('a slow finger keeps its work when a second one lands', () => {
    const p = new Play(bare()), pts = ring(SPECS.tuba.mid, 120, 140, 0, 0.6)
    p.down(1, pts[0], 0)
    let at = 0
    for (let i = 1; i < pts.length; i++) for (let k = 1; k <= 8; k++) p.move(1, { x: pts[i - 1].x + ((pts[i].x - pts[i - 1].x) * k) / 8, y: pts[i - 1].y + ((pts[i].y - pts[i - 1].y) * k) / 8 }, (at += 16))
    p.down(2, on('tree'), at + 5)
    expect(topOf(p.world, 'tree')).toBeNull()
    expect(p.hand).not.toBeNull()
  })
  it('a trembling palm is still a resting one', () => {
    const p = new Play(bare())
    p.down(9, { x: 600, y: 790 }, 0)
    for (let i = 1; i < 120; i++) p.move(9, { x: 600 + (i % 2) * 8, y: 790 }, i * 16)
    p.down(1, on('tuba'), 2000)
    expect(topOf(p.world, 'tuba')).not.toBeNull()
  })
  it('what the child begins to wrap again is not the family\'s, in the room or in the save', () => {
    const p = new Play(bare())
    trace(p, round('tuba')); run(p, 1)
    tap(p, { x: 1120, y: 300 })
    expect(p.world.visit).not.toBeNull()
    trace(p, round('tuba', 0, 0.4))
    expect(topOf(deserialize(JSON.parse(JSON.stringify(serialize(p.world)))), 'tuba')).not.toBeNull()
    run(p, 8)
    expect(p.world.layers.tuba.length).toBe(2)
  })
  it('a parcel of nothing ripped from under the family leaves nobody going to it', () => {
    const p = new Play(bare())
    trace(p, NOTHING); run(p, 0.2)
    tap(p, { x: 1120, y: 300 }); run(p, 0.6)
    const s = specOf(p.world, 'air0')!
    for (let i = 0; i < 3; i++) tap(p, s.mid)
    expect(p.world.airs.air0).toBeNull()
    for (const m of p.world.visit?.members ?? []) expect(m.target).toBeNull()
  })
  it('a parcel of nothing stays off faces and rolls', () => {
    for (const c of [{ x: 770, y: 120 }, { x: 168, y: 350 }, { x: 160, y: 720 }, { x: 810, y: 600 }]) {
      const p = new Play(bare())
      wrapNothing(p.world, c, 50)
      const a = p.world.airs.air0!
      for (const [x, y, r] of HEADS) expect(Math.hypot(a.at.x - x, a.at.y - y)).toBeGreaterThan(r * 0.6 + a.r * 0.6)
      for (const q of ROLLS) expect(Math.abs(a.at.x - q.x) > a.r + 40 || Math.abs(a.at.y - q.y) > a.r + 40).toBe(true)
    }
  })
  it('a door tapped in an empty room can still be shown', () => {
    const p = new Play(bare())
    tap(p, { x: 1120, y: 300 })
    expect(p.world.known.door).toBe(false)
  })
  it('put away in a visit, the scraps are on the floor', () => {
    const p = new Play(bare())
    trace(p, round('tuba')); run(p, 1)
    tap(p, { x: 1120, y: 300 })
    expect(serialize(p.world).scraps.length).toBe(1)
  })
})
