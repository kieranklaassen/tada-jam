import { describe, expect, it } from 'vitest'
import { CORD, MIDDLE, MOLE, OSTRICH, OSTRICH_HEAD, SACKS, WIPER, placeAt, shelfOf } from './layout'
import { PLACES, bare, copy, count, type Part, type Place } from './monster'
import { DRAG_OPEN, HIDE_S, LIFT_GRACE_S, MIME_S, Play, SEEN_S, meetingLength } from './play'
import { deserialize, freshWorld, refill, type World } from './save'
import type { Point } from './stage'

// Played through pointers, as a child plays it.

const FRAME = 1 / 60
let id = 0
function game(change: (w: World) => void = () => {}): Play {
  const w = freshWorld(6, 11)
  w.shown = true
  change(w)
  return new Play(w)
}
const run = (p: Play, s: number) => { for (let t = 0; t < s; t += FRAME) p.step(FRAME) }
function tap(p: Play, at: Point): void { const i = ++id; p.down(i, at); run(p, 0.1); p.up(i) }
function pick(p: Play, from: Point, to: Point): number { const i = ++id; p.down(i, from); p.step(FRAME); for (let k = 1; k <= 8; k++) { p.move(i, { x: from.x + (to.x - from.x) * k / 8, y: from.y + (to.y - from.y) * k / 8 }); p.step(FRAME) } return i }
/** Drags so that the magnet itself, not the finger, is at `to`. */
function drag(p: Play, from: Point, to: Point): void { const i = pick(p, from, to); p.move(i, { x: to.x, y: to.y + 8 }); p.up(i); run(p, LIFT_GRACE_S + 0.05) }
const put = (p: Play, part: Part, place: Place, who: 'a' | 'b' = 'b') => drag(p, shelfOf(part), placeAt(who, p.world[who].body, place))
const pullCord = (p: Play) => { const i = pick(p, { x: CORD.x, y: CORD.y }, { x: CORD.x, y: CORD.y + 70 }); p.up(i) }
const opened = (w: World) => { w.open = true; refill(w) }

describe('magnets', () => {
  it('go on by dragging and by two taps, on any place, and the shelf never runs out', () => {
    const p = game()
    for (const place of PLACES) put(p, 'eye', place)
    expect(count(p.world.b)).toBe(6)
    const q = game()
    tap(q, shelfOf('nose'))
    expect(q.ready).toBe('nose')
    tap(q, MIDDLE.b)
    expect(count(q.world.b)).toBe(1)
    expect(q.ready).toBeNull()
    tap(q, shelfOf('ear')); tap(q, shelfOf('ear'))
    expect(q.ready).toBeNull()
  })
  it('answer the moment the finger lands', () => {
    const p = game((w) => { w.b.on.upper = { part: 'eye', large: true }; opened(w); w.worn = { ostrich: 'nose', mole: 'hand' }; w.pairs.push([bare(), bare()]) })
    for (const at of [shelfOf('tail'), placeAt('b', 'round', 'upper'), MIDDLE.a, OSTRICH, MOLE, CORD, SACKS[0], SACKS[1], WIPER, { x: 720, y: 62 }, { x: 1000, y: 160 }, { x: 800, y: 565 }]) {
      p.heard = []
      const i = ++id
      p.down(i, at)
      expect(p.heard.length, JSON.stringify(at)).toBeGreaterThan(0)
      p.cancel(i)
    }
  })
  it('change size at a tap, and the body its shape', () => {
    const p = game((w) => { w.b.on.upper = { part: 'eye', large: true } })
    tap(p, placeAt('b', 'round', 'upper'))
    expect(p.world.b.on.upper!.large).toBe(false)
    tap(p, { x: MIDDLE.b.x + 100, y: MIDDLE.b.y + 30 })
    expect(p.world.b.body).toBe('tall')
    expect(p.world.b.on.upper).toEqual({ part: 'eye', large: false })
  })
  it('change places with one that was there, and one from the shelf sends it home', () => {
    const p = game((w) => { w.b.on.upper = { part: 'eye', large: true }; w.b.on.left = { part: 'hand', large: false } })
    drag(p, placeAt('b', 'round', 'upper'), placeAt('b', 'round', 'left'))
    expect(p.world.b.on.left).toEqual({ part: 'eye', large: true })
    expect(p.world.b.on.upper).toEqual({ part: 'hand', large: false })
    put(p, 'foot', 'left')
    expect(p.world.b.on.left!.part).toBe('foot')
    expect(p.flights.some((f) => f.part === 'eye')).toBe(true)
  })
  it('are worn by the ostrich and the mole, and can be taken off again', () => {
    const p = game()
    drag(p, shelfOf('nose'), OSTRICH_HEAD)
    drag(p, shelfOf('hand'), { x: MOLE.x, y: MOLE.y - 40 })
    expect(p.world.worn).toEqual({ ostrich: 'nose', mole: 'hand' })
    drag(p, { x: OSTRICH_HEAD.x, y: OSTRICH_HEAD.y - 66 }, placeAt('b', 'round', 'top'))
    expect(p.world.worn.ostrich).toBeNull()
    expect(p.world.b.on.top!.part).toBe('nose')
  })
  it('slide home from bare board and from the closed curtain', () => {
    const p = game()
    const before = JSON.stringify(p.saved())
    drag(p, shelfOf('ear'), { x: 300, y: 300 })
    expect(p.flights[0].kind).toBe('slide')
    drag(p, shelfOf('ear'), { x: 1080, y: 150 })
    expect(JSON.stringify(p.saved())).toBe(before)
    run(p, 2)
    expect(p.flights).toHaveLength(0)
  })
  it('wait out a lifted finger, and go on with it', () => {
    const p = game()
    const i = pick(p, shelfOf('ear'), { x: 900, y: 600 })
    p.up(i); run(p, LIFT_GRACE_S / 2)
    const j = ++id
    p.down(j, { x: 910, y: 610 })
    expect(p.carries[0].finger).toBe(j)
    p.move(j, { x: placeAt('b', 'round', 'bottom').x, y: placeAt('b', 'round', 'bottom').y })
    p.up(j); run(p, 0.4)
    expect(p.world.b.on.bottom!.part).toBe('ear')
  })
  it('go back to where they came from at a cancel, at a put-away and in what is saved', () => {
    const p = game((w) => { w.b.on.upper = { part: 'eye', large: false }; w.worn.mole = 'hand' })
    const before = JSON.stringify(p.saved())
    const i = pick(p, placeAt('b', 'round', 'upper'), { x: 1080, y: 150 })
    expect(JSON.stringify(p.saved())).toBe(before)
    p.cancel(i)
    expect(JSON.stringify(p.saved())).toBe(before)
    pick(p, placeAt('b', 'round', 'upper'), { x: 1080, y: 150 })
    p.clear()
    expect(JSON.stringify(p.saved())).toBe(before)
    expect(p.contacts.size).toBe(0)
    expect(p.carries).toHaveLength(0)
  })
  it('a second carry put in the place of a first that is then cancelled loses neither child anything on the board', () => {
    const p = game((w) => { w.b.on.upper = { part: 'eye', large: true } })
    const i = pick(p, placeAt('b', 'round', 'upper'), { x: 1080, y: 150 })
    put(p, 'nose', 'upper')
    p.cancel(i)
    expect(p.world.b.on.upper!.part).toBe('nose')
    expect(p.flights.some((f) => f.part === 'eye')).toBe(true)
  })
})

describe('fingers', () => {
  it('a resting finger deadens nothing, and a fourth gets a small answer', () => {
    const p = game()
    p.down(901, { x: 1000, y: 150 })
    put(p, 'eye', 'upper')
    expect(p.world.b.on.upper!.part).toBe('eye')
    for (const [n, part] of (['mouth', 'nose', 'ear'] as const).entries()) { p.down(910 + n, shelfOf(part)); p.move(910 + n, { x: 900 + n * 40, y: 640 }) }
    expect(p.carries).toHaveLength(3)
    p.heard = []
    p.down(920, shelfOf('foot')); p.move(920, { x: 700, y: 600 })
    expect(p.carries).toHaveLength(3)
    expect(p.heard.length).toBeGreaterThan(0)
  })
  it('one child holds the curtain while the other builds', () => {
    const p = game()
    p.down(930, { x: 300, y: 300 }); run(p, 0.5)
    expect(p.lift).toBeGreaterThan(0.9)
    put(p, 'tail', 'right')
    expect(p.world.b.on.right!.part).toBe('tail')
    expect(p.peeked).toBe(true)
    p.up(930); run(p, 0.6)
    expect(p.lift).toBeLessThan(0.02)
  })
})

describe('the curtain', () => {
  it('shows only while it is held, however it ends, and a tap never opens it', () => {
    const p = game()
    tap(p, { x: 300, y: 300 })
    run(p, 0.4)
    // Even a tap gives a glimpse.
    expect(p.lift).toBeGreaterThan(0.9)
    expect(p.world.open).toBe(false)
    run(p, 1.5)
    expect(p.lift).toBeLessThan(0.02)
    p.down(940, { x: 300, y: 300 }); run(p, 0.4); p.cancel(940); run(p, 1.3)
    expect(p.lift).toBeLessThan(0.02)
    expect(p.world.open).toBe(false)
  })
  it('opens when it is drawn well aside, and not for a finger that wanders', () => {
    const p = game()
    p.world.b.on.top = { part: 'ear', large: true }
    const i = pick(p, { x: 480, y: 300 }, { x: 480 - DRAG_OPEN + 20, y: 300 })
    p.up(i); run(p, 1)
    expect(p.world.open).toBe(false)
    expect(p.aside).toBe(0)
    p.up(pick(p, { x: 480, y: 300 }, { x: 480 - DRAG_OPEN - 10, y: 310 }))
    expect(p.meeting).not.toBeNull()
  })
  it('opens for a pulled cord, and for a tapped one once the twin has as many parts', () => {
    const p = game((w) => { w.b.on.top = { part: 'tail', large: true } })
    tap(p, CORD)
    expect(p.world.open).toBe(false)
    pullCord(p)
    expect(p.world.open).toBe(true)
    expect(p.meeting).not.toBeNull()
    const q = game((w) => { for (const place of PLACES) w.b.on[place] = { part: 'tail', large: true } })
    tap(q, CORD)
    expect(q.meeting).not.toBeNull()
  })
  it('a cord pulled with nothing on the twin ends nothing: the ostrich has a look', () => {
    const p = game()
    pullCord(p)
    expect(p.world.open).toBe(false)
    expect(p.mime).not.toBeNull()
  })
})

describe('the meeting', () => {
  it('is saved as over when it starts', () => {
    const p = game((w) => { w.b = copy(w.a) })
    p.urgent = false
    pullCord(p)
    expect(p.urgent).toBe(true)
    const back = deserialize(JSON.parse(JSON.stringify(p.saved())), null, 1)
    expect(back.open).toBe(true)
    expect(back.sacks).not.toBeNull()
    expect(back.pairs).toHaveLength(1)
    expect(back.place).toBe('small-and-large')
    const q = new Play(back)
    expect(q.meeting).toBeNull()
    expect(q.aside).toBe(1)
  })
  it('compares every place, takes it, and then nothing starts by itself', () => {
    const p = game((w) => { w.b.on.bottom = { part: 'tail', large: true } })
    pullCord(p)
    const length = meetingLength(p.meeting!)
    expect(length).toBeGreaterThan(5)
    expect(length).toBeLessThan(9)
    run(p, length + 0.1)
    expect(p.meeting).toBeNull()
    const then = JSON.stringify(p.saved())
    run(p, 60)
    expect(JSON.stringify(p.saved())).toBe(then)
  })
  it('keeps three pairs', () => {
    const p = game()
    for (let i = 0; i < 5; i++) { put(p, 'ear', 'top'); pullCord(p); run(p, 10); pullCord(p); run(p, 3) }
    expect(p.world.pairs).toHaveLength(3)
  })
  it('lands at a touch, and the touch is answered', () => {
    const p = game((w) => { w.b.on.top = { part: 'ear', large: true } })
    pullCord(p); run(p, 1)
    tap(p, shelfOf('eye'))
    expect(p.meeting).toBeNull()
    expect(p.aside).toBe(1)
    expect(p.ready).toBe('eye')
  })
  it('afterwards either can be changed, and a place made alike is answered by both', () => {
    const p = game((w) => { w.a = bare(); w.a.on.upper = { part: 'eye', large: true }; w.a.on.lower = { part: 'nose', large: true }; opened(w) })
    run(p, 1)
    put(p, 'eye', 'upper', 'b')
    expect(p.since('a:upper')).toBeLessThan(0.6)
    put(p, 'nose', 'lower', 'b')
    expect(p.since('hopBoth')).toBeLessThan(0.6)
    put(p, 'foot', 'bottom', 'a')
    expect(p.world.a.on.bottom!.part).toBe('foot')
  })
})

describe('the next one', () => {
  it('comes from a sack that is carried or tapped, and not from one let go near home', () => {
    const p = game((w) => { opened(w); w.b.on.upper = { part: 'eye', large: true } })
    const next = JSON.stringify(p.world.sacks![1])
    drag(p, SACKS[1], { x: SACKS[1].x + 40, y: SACKS[1].y - 60 })
    expect(p.world.open).toBe(true)
    drag(p, SACKS[1], MIDDLE.a)
    expect(p.world.open).toBe(false)
    expect(JSON.stringify(p.world.a)).toBe(next)
    expect(p.world.own).toBe(false)
    expect(count(p.world.b)).toBe(0)
    expect(p.world.sacks).toBeNull()
    // An early one is looked at first: the curtain waits.
    run(p, 2)
    expect(p.aside).toBe(1)
    run(p, HIDE_S + SEEN_S - 1.6)
    const q = game((w) => opened(w))
    tap(q, SACKS[0])
    expect(q.world.open).toBe(false)
    expect(p.hiding).toBeNull()
    expect(p.flights).toHaveLength(0)
    expect(p.aside).toBe(0)
  })
  it('a pulled cord hides the child\'s own, which moves nothing', () => {
    const p = game((w) => { opened(w); w.place = 'bodies' })
    put(p, 'tail', 'top', 'a')
    const mine = JSON.stringify(p.world.a)
    pullCord(p); run(p, 2)
    expect(p.world).toMatchObject({ open: false, own: true })
    expect(JSON.stringify(p.world.a)).toBe(mine)
    for (const place of PLACES) { const s = p.world.a.on[place]; if (s) put(p, s.part, place) }
    pullCord(p)
    expect(p.world.place).toBe('bodies')
  })
  it('a magnet held through a hiding is put back on the shelf and never on the new twin', () => {
    const p = game((w) => { opened(w); w.b.on.upper = { part: 'eye', large: true } })
    const i = pick(p, placeAt('b', 'round', 'upper'), { x: 1080, y: 150 })
    pullCord(p); run(p, 2)
    p.cancel(i)
    expect(count(p.world.b)).toBe(0)
  })
})

describe('the first kind of round', () => {
  const view = () => { const p = new Play(freshWorld(4, 11)); run(p, 0.1); return p }
  it('stands open, with the twin bare and its missing parts known', () => {
    const p = view()
    expect(p.inView).toBe(true)
    expect(p.missing()).toHaveLength(3)
    expect(p.aside).toBe(1)
  })
  it('is met the moment the last part is on, and the next place comes', () => {
    const p = view()
    for (const one of p.missing()) { expect(p.meeting).toBeNull(); put(p, one.part, one.place) }
    expect(p.meeting!.same).toBe(true)
    expect(p.world.place).toBe('a-few')
    expect(p.world.sacks).not.toBeNull()
    run(p, 10)
    expect(p.inView).toBe(false)
  })
  it('is met however the twin looks when the cord is pulled with enough on it, and never before', () => {
    const p = view()
    pullCord(p)
    expect(p.inView).toBe(true)
    expect(p.meeting).toBeNull()
    for (const place of ['left', 'bottom', 'top'] as const) put(p, 'tail', place)
    tap(p, CORD)
    expect(p.meeting!.same).toBe(false)
    expect(p.world.place).toBe('in-view')
    run(p, 12)
    tap(p, SACKS[0]); run(p, 2)
    expect(p.inView).toBe(true)
    expect(p.missing()).toHaveLength(3)
    for (const one of p.missing()) put(p, one.part, one.place)
    run(p, 10)
    drag(p, SACKS[1], MIDDLE.a); run(p, 5)
    expect(p.world.open).toBe(false)
  })
  it('stirs what belongs together while nobody plays, a few times, and then is quiet', () => {
    const p = view()
    let stirs = 0, last = 99
    for (let t = 0; t < 90; t += FRAME) { p.step(FRAME); const s = Math.min(...PLACES.map((x) => p.since(`need:${x}`)).filter((x) => x >= 0)); if (s < last - 0.5 && s < 0.1) stirs++; last = s }
    expect(stirs).toBe(5)
  })
  it('is found as left', () => {
    const p = view()
    const one = p.missing()[0]
    put(p, one.part, one.place)
    const q = new Play(deserialize(JSON.parse(JSON.stringify(p.saved())), null, 1))
    expect(q.inView).toBe(true)
    expect(q.missing()).toHaveLength(2)
  })
})

describe('the ostrich', () => {
  it('mimes every fact in turn, one at a tap, and does not move the game', () => {
    const p = game((w) => { w.a = bare('wide'); w.a.on.top = { part: 'foot', large: false }; w.a.on.lower = { part: 'eye', large: true } })
    const before = JSON.stringify(p.saved())
    expect(p.facts()).toEqual([{ kind: 'body', body: 'wide' }, { kind: 'part', place: 'top', part: 'foot', large: false }, { kind: 'part', place: 'lower', part: 'eye', large: true }])
    for (const fact of [...p.facts(), p.facts()[0]]) { tap(p, OSTRICH); expect(p.mime!.fact).toEqual(fact); run(p, MIME_S + 0.1); expect(p.mime).toBeNull() }
    expect(JSON.stringify(p.saved())).toBe(before)
    tap(p, OSTRICH)
    put(p, 'eye', 'lower')
    expect(p.mime).not.toBeNull()
  })
  it('gives the first showing once, when nothing has been touched for a while, and it is owed until it starts', () => {
    const p = new Play(freshWorld(6, 3))
    run(p, 1); tap(p, WIPER); run(p, 1)
    expect(p.mime).toBeNull()
    expect(p.saved().shown).toBe(false)
    run(p, 0.7)
    expect(p.mime).not.toBeNull()
    expect(p.saved().shown).toBe(true)
    tap(p, WIPER)
    expect(p.mime).toBeNull()
    const q = new Play(deserialize(JSON.parse(JSON.stringify(p.saved())), null, 1))
    run(q, 10)
    expect(q.mime).toBeNull()
  })
})

describe('left alone before a shut curtain', () => {
  it('the ostrich has a look three times, then all is quiet', () => {
    const p = game()
    let mimes = 0, on = false
    for (let s = 0; s < 120; s += FRAME) { p.step(FRAME); if (p.mime && !on) mimes++; on = p.mime !== null }
    expect(mimes).toBe(3)
  })
  it('the wiper wipes what it is drawn over', () => {
    const p = game()
    p.up(pick(p, { x: 1000, y: 130 }, { x: 1050, y: 200 }))
    expect(p.strokes[0].age).toBeLessThan(1)
    pick(p, WIPER, { x: 1040, y: 190 })
    expect(p.strokes[0].age).toBeGreaterThanOrEqual(6)
  })
})

describe('anything at all', () => {
  it('survives a thousand random touches with the board always sound', () => {
    let s = 17
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    const p = game()
    for (let i = 0; i < 1500; i++) {
      const f = 2000 + Math.floor(r() * 5), at = { x: r() * 1180, y: r() * 820 }, k = r()
      if (k < 0.35) p.down(f, at); else if (k < 0.75) p.move(f, at); else if (k < 0.93) p.up(f); else if (k < 0.98) p.cancel(f); else p.clear()
      for (let n = 0; n < 6; n++) p.step(FRAME * (1 + r() * 4))
      if (!p.world.open) expect(p.world.sacks).toBeNull()
      expect(deserialize(JSON.parse(JSON.stringify(p.saved())), null, 1)).toBeTruthy()
      expect(p.strokes.length).toBeLessThanOrEqual(9)
      p.heard = []
    }
    p.clear(); run(p, 1)
    expect(p.saved()).toEqual(JSON.parse(JSON.stringify(p.saved())))
  })
})
