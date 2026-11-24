import { describe, expect, it } from 'vitest'
import { House, WAIT } from './house'
import { moveToShow } from './guide'
import { PLACES, REACH, SUN, type Spot } from './layout'
import { OWNERS } from './owners'
import { makeRng } from './rng'
import { deserialize, freshState, serialize, type GameState } from './save'
import { DEEP, THINGS, type ThingId } from './things'
import { VOICES } from './voices'

const DT = 1 / 60
const old = (edit: (s: GameState) => void = () => {}): GameState => { const s = freshState(); s.shown = s.begun = true; edit(s); return s }
const run = (h: House, s: number): void => { for (let t = 0; t < s; t += DT) h.step(DT) }
const tapAt = (h: House, p: Spot): void => { const on = h.at(p); h.press(on, p); run(h, 0.08); h.tap(on) }
const tap = (h: House, id: ThingId): void => tapAt(h, h.homeOf(id))
const drag = (h: House, id: ThingId, to: Spot): void => { const p = h.homeOf(id), on = h.at(p); h.press(on, p); expect(h.take(on, p)).toBe(true); h.move(to); h.drop() }
const FOOT = { x: 540, y: 320 }

/** Every thing is in exactly one place, and that place knows it. */
function whole(h: House): void {
  const inShoes = OWNERS.flatMap((o) => h.shoes[o])
  expect(new Set(inShoes).size).toBe(inShoes.length)
  for (const o of OWNERS) expect(h.shoes[o].length).toBeLessThanOrEqual(DEEP)
  for (const id of THINGS) {
    const t = h.things[id]
    expect(t.where === 'shoe', `${id} ${t.where}`).toBe(inShoes.includes(id))
    expect(t.where === 'air').toBe(t.flight !== null)
    expect(t.where === 'hand').toBe(h.hand === id)
    expect(t.where === 'act').toBe(h.acts.some((a) => !a.home && a.found.includes(id)))
    expect(t.where === 'head').toBe(h.headed?.id === id)
    expect(Number.isFinite(t.x + t.y)).toBe(true)
  }
}

describe('the round', () => {
  it('goes in on a tap, waits, goes off, and leaves an empty boot', () => {
    const h = new House(old())
    tap(h, 'frog'); run(h, 1)
    expect(h.shoes.oma).toEqual(['frog'])
    run(h, WAIT - 0.6)
    expect(h.busy).toBe(false)
    run(h, 0.8)
    expect(h.busy).toBe(true)
    expect(h.toState().shoes.oma).toEqual([])
    run(h, 8)
    expect(h.busy).toBe(false)
    expect(h.things.frog.where).toBe('home')
  })
  it('is two touches: a thing, and the foot', () => {
    const h = new House(old())
    tap(h, 'porridge'); run(h, 0.8); tapAt(h, FOOT)
    expect(h.busy).toBe(true)
  })
  it('takes a second thing and puts the first back for a third', () => {
    const h = new House(old())
    tap(h, 'frog'); run(h, 0.8); tap(h, 'bell'); run(h, 0.8); tap(h, 'mouse'); run(h, 0.7)
    expect(h.shoes.oma).toEqual(['bell', 'mouse'])
  })
  it('never goes in by itself on load', () => {
    const h = new House(old((s) => { s.shoes.oma = ['carrot'] }))
    run(h, 12)
    expect(h.busy).toBe(false)
    tapAt(h, FOOT)
    expect(h.busy).toBe(true)
  })
  it('keeps a thing that is touched meanwhile, and makes way once it has been seen', () => {
    const h = new House(old())
    tap(h, 'bell'); run(h, 0.8); tapAt(h, FOOT); run(h, 0.4)
    tap(h, 'carrot')
    expect(h.things.carrot.queued).toBe(true)
    run(h, 2.2); tapAt(h, { x: 400, y: 60 })
    run(h, 2)
    expect(h.shoes.oma).toEqual(['carrot'])
  })
  it('tickles when the boot is empty', () => {
    const h = new House(old())
    tapAt(h, FOOT)
    expect(h.busy).toBe(false)
    expect(h.sounds).toContain('giggle.oma')
  })
  it('puts a thing on a head, and sneezes it off', () => {
    const h = new House(old())
    drag(h, 'porridge', { x: 275, y: 200 }); run(h, 0.8)
    expect(h.headed?.id).toBe('porridge')
    run(h, 2.6)
    expect(h.things.porridge.where).toBe('home')
  })
  it('takes a drag that was only partly done', () => {
    const h = new House(old())
    drag(h, 'frog', { x: 720, y: 420 }); run(h, 0.8)
    expect(h.shoes.oma).toEqual(['frog'])
  })
  it('puts back what the browser took out of the hand', () => {
    const h = new House(old())
    const p = h.homeOf('frog'), on = h.at(p)
    h.press(on, p); h.take(on, p); h.move({ x: 500, y: 300 }); h.cancel()
    expect(h.things.frog.where).toBe('home')
  })
})

describe('the first visit', () => {
  it('shows one whole round by itself, and then asks', () => {
    const h = new House(freshState())
    expect(h.toState().shown).toBe(false)
    run(h, 2); expect(h.toState().shown).toBe(true)
    run(h, 2.2); expect(h.busy).toBe(true)
    run(h, 8)
    expect(h.opener).toBe(null); expect(h.shoes.oma).toEqual([]); expect(h.peeking).toBe(null)
    const m = moveToShow(h, { glow: 1, demo: 0.5, demoIndex: 0 })!
    expect(m.thing).toBe('porridge')
  })
  it('gives way to any touch at any instant, with everything home', () => {
    for (let at = 0; at < 9; at += 0.31) {
      const h = new House(freshState())
      run(h, at); const on = h.at({ x: 400, y: 60 }); h.press(on, { x: 400, y: 60 }); h.tap(on); run(h, 1.5)
      whole(h)
      if (at > 0.1) expect(THINGS.every((id) => h.things[id].where === 'home'), `${at}`).toBe(true)
    }
  })
  it('only dips the sun until a foot has gone in', () => {
    const h = new House(freshState())
    tapAt(h, SUN); expect(h.phase).toBe('day')
    tap(h, 'frog'); run(h, 12); tapAt(h, SUN)
    expect(h.phase).toBe('sunset')
  })
})

describe('the others, and the night', () => {
  it('changes the owner only by a touch, and each comes round', () => {
    const h = new House(old())
    for (const o of [...OWNERS.slice(1), OWNERS[0]]) { tapAt(h, { x: 30, y: 440 }); run(h, 2); expect(h.owner).toBe(o) }
    run(h, 30); expect(h.owner).toBe(OWNERS[0])
  })
  it('fills five shoes in turn, and in the morning everyone finds what was laid', () => {
    const h = new House(old())
    tapAt(h, SUN); run(h, 2)
    for (const id of THINGS) { tap(h, id); run(h, 0.2) }
    run(h, 1)
    expect(OWNERS.map((o) => h.shoes[o].length)).toEqual([2, 2, 1, 1, 1])
    tapAt(h, SUN)
    expect(Object.values(h.toState().shoes).flat()).toEqual([])
    expect(h.toState().night).toBe(false)
    let t = 0
    for (; h.phase !== 'day' && t < 30; t += 1) run(h, 1)
    expect(t).toBeLessThanOrEqual(25)
    run(h, 2); whole(h)
    expect(THINGS.every((id) => h.things[id].where === 'home')).toBe(true)
  })
  it('tips a shoe out', () => {
    const h = new House(old((s) => { s.night = true; s.shoes.goose = ['bell'] }))
    const m = h.mouthOf('goose'); tapAt(h, { x: m.x + 10, y: m.y + 60 }); run(h, 1)
    expect(h.shoes.goose).toEqual([])
  })
})

describe('whatever a child does', () => {
  it('loses nothing, over long random play with put-aways, and asks only for sounds there are', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const rng = makeRng(seed), r = (): number => rng.next()
      let h = new House(freshState())
      for (let i = 0; i < 260; i++) {
        const p = { x: r() * 1180, y: r() * 820 }, k = r()
        const on = k < 0.5 ? h.at(h.homeOf(THINGS[Math.floor(r() * THINGS.length)])) : k < 0.58 ? h.at(SUN) : h.at(p)
        h.press(on, p)
        if (r() < 0.5) { if (h.take(on, p)) { h.move({ x: r() * 1180, y: r() * 820 }); run(h, 0.1); whole(h); if (r() < 0.8) h.drop(); else h.cancel() } else h.tap(on) } else h.tap(on)
        run(h, r() * (i % 9 === 0 ? 5 : 0.6))
        whole(h)
        for (const s of h.sounds.splice(0)) expect(VOICES[s], s).toBeDefined()
        for (const g of h.groups()) expect(Number.isFinite(g.frame.pose.dx + g.frame.pose.dy + g.place.x)).toBe(true)
        if (r() < 0.06) {
          h.settle(); whole(h)
          const kept = JSON.parse(JSON.stringify(serialize(h.toState()))) as unknown
          const again = new House(deserialize(kept))
          expect(serialize(again.toState())).toEqual(kept)
          expect(THINGS.map((id) => again.things[id].where)).toEqual(THINGS.map((id) => h.things[id].where))
          h = again
        }
      }
    }
  }, 30_000)
})

describe('the room', () => {
  it('keeps the things apart and clear of everything else that answers', () => {
    const h = new House(old())
    for (const a of THINGS) {
      for (const b of THINGS) if (a < b) expect(Math.hypot(PLACES[a].x - PLACES[b].x, PLACES[a].y - PLACES[b].y)).toBeGreaterThanOrEqual(105)
      expect(h.at(PLACES[a])).toEqual({ kind: 'thing', id: a })
      expect(Math.hypot(PLACES[a].x - SUN.x, PLACES[a].y - SUN.y)).toBeGreaterThan(REACH + SUN.r)
      expect(PLACES[a].x + 55).toBeLessThan(1180)
    }
    expect(h.at(FOOT).kind).toBe('foot')
    expect(h.at({ x: 540, y: 600 }).kind).toBe('boot')
    expect(h.at({ x: 275, y: 290 }).kind).toBe('owner')
    expect(h.at({ x: 30, y: 440 }).kind).toBe('peek')
  })
})

describe('a save', () => {
  it('reads anything without a fault', () => {
    for (const raw of [null, 3, 'x', [], {}, { v: 2 }, { v: 1, owner: 'x', shoes: 4 }, { v: 1, night: true, shoes: { oma: ['frog', 'frog', 'bell', 'mouse'], bear: ['frog', 7] } }]) {
      const s = deserialize(raw), h = new House(s)
      run(h, 0.5); whole(h)
      expect(JSON.stringify(serialize(s)).length).toBeLessThan(600)
    }
    expect(deserialize({ v: 1, night: true, shoes: { oma: ['frog', 'frog', 'bell', 'mouse'], bear: ['frog'] } }).shoes).toMatchObject({ oma: ['frog', 'bell'], bear: [] })
  })
})
