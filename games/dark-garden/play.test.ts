import { describe, expect, it } from 'vitest'
import { FLAME, heart, LENGTH, PLACES, at } from './garden'
import type { Point } from './input'
import { Play, WAITING } from './play'
import { makeRng } from './rng'
import { allSet, deserialize, fresh, serialize, type Save } from './save'

const STEP = 1 / 60
const run = (play: Play, seconds: number) => { for (let i = 0; i < seconds * 60; i++) play.step(STEP) }
const tap = (play: Play, p: Point) => { play.act({ type: 'press', at: p }); play.act({ type: 'tap', at: p }) }
const pull = (play: Play, from: Point, ...way: Point[]) => {
  play.act({ type: 'press', at: from })
  play.act({ type: 'dragStart', from })
  for (const p of way) { play.act({ type: 'dragMove', from, at: p }); run(play, 2.6) }
  return () => play.act({ type: 'dragEnd', from, at: way[way.length - 1] })
}
const start = (save: Partial<Save> = {}) => { const play = new Play({ ...fresh(), shown: true, ...save }); run(play, 0.1); return play }
const body = (play: Play): Point => { const p = play.where(); return { x: p.x, y: p.y - 60 } }
const flame: Point = { x: FLAME.x, y: FLAME.y - 34 }

describe('a round', () => {
  it('is two taps: one on the walker, one on the dark', () => {
    const play = start()
    tap(play, body(play))
    run(play, 2.6)
    expect(play.walker.lit).toBe(true)
    tap(play, heart(PLACES[1]))
    run(play, 4)
    expect(play.save.set[1]).toBe('gnome')
    expect(play.sleeperAt(1)).toBe('toad')
    expect(play.walker.who).toBe('goose')
    expect(play.save.queue).toEqual(['goose', 'hare', 'bear', 'gnome'])
  })
  it('is one tap on a dark place, by way of the flame', () => {
    for (const place of PLACES) {
      const play = start()
      tap(play, heart(place))
      run(play, 6)
      expect(play.save.set[place.id]).toBe('gnome')
    }
  })
  it('is one drag in and out, straight across the hedges', () => {
    const play = start()
    const letGo = pull(play, body(play), flame, heart(PLACES[3]))
    expect(play.walker.lit).toBe(true)
    letGo()
    run(play, 4)
    expect(play.save.set[3]).toBe('gnome')
  })
  it('crosses the garden in under two and a half seconds', () => {
    const play = start()
    tap(play, body(play))
    let t = 0
    while (!play.walker.lit && t < 5) { play.step(STEP); t += STEP }
    expect(t).toBeLessThan(2.5)
  })
  it('stands where it was let go, unlit, and carries on', () => {
    const play = start(), p = at(900)
    pull(play, body(play), p)()
    run(play, 1)
    expect(play.walker.lit).toBe(false)
    expect(Math.abs(play.walker.u - 900)).toBeLessThan(20)
    expect(play.save.u).toBe(play.walker.u)
    tap(play, body(play))
    run(play, 2.6)
    expect(play.walker.lit).toBe(true)
  })
  it('does its joke and keeps the light when let go over an open place', () => {
    const play = start({ set: fresh().set.map((_, i) => (i === 5 ? 'bear' : null)), lit: true, u: LENGTH })
    pull(play, body(play), heart(PLACES[5]))()
    expect(play.shown[5].joke).toBeLessThan(0.2)
    run(play, 2)
    expect(play.walker.lit).toBe(true)
    expect(play.save.set.filter(Boolean)).toHaveLength(1)
  })
  it('goes back to where the drag began when the drag is taken away', () => {
    const play = start()
    play.act({ type: 'press', at: body(play) })
    play.act({ type: 'dragStart', from: body(play) })
    play.act({ type: 'dragMove', from: body(play), at: at(800) })
    run(play, 0.6)
    play.act({ type: 'dragCancel', from: at(0), at: at(800) })
    run(play, 1)
    expect(play.walker.u).toBe(0)
  })
  it('lets the child call up another, only while nothing is carried', () => {
    const play = start(), second = { x: WAITING[1].x, y: WAITING[1].y - 40 }
    tap(play, second)
    expect(play.walker.who).toBe('hare')
    run(play, 1)
    tap(play, body(play))
    run(play, 2.6)
    tap(play, second)
    expect(play.walker.who).toBe('hare')
    expect(play.walker.lit).toBe(true)
  })
})

describe('the scenes', () => {
  it('shows one whole round once, untouched', () => {
    const play = new Play(fresh())
    run(play, 1)
    expect(play.save.shown).toBe(false)
    run(play, 9)
    expect(play.save.set[0]).toBe('gnome')
    expect(play.walker.who).toBe('goose')
    run(play, 20)
    expect(play.save.set.filter(Boolean)).toHaveLength(1)
  })
  it('gives way to a touch where it is', () => {
    const play = new Play(fresh())
    run(play, 2.4)
    const u = play.walker.u
    expect(u).toBeGreaterThan(50)
    play.act({ type: 'press', at: { x: 700, y: 60 } })
    play.act({ type: 'pressEnd', at: { x: 700, y: 60 } })
    run(play, 5)
    expect(play.save.set.every((one) => one === null)).toBe(true)
    expect(play.save).toMatchObject({ shown: true, to: null })
  })
  const full = (): Save => ({ ...fresh(), shown: true, set: fresh().set.map(() => 'bear') })
  it('plays the tune once after the last light, and never on load', () => {
    const last = { ...full(), set: full().set.map((one, i) => (i === 9 ? null : one)) }
    const play = start(last)
    tap(play, heart(PLACES[9]))
    let heard = 0, played = false
    for (let i = 0; i < 60 * 16; i++) { play.step(STEP); if (play.tune !== null) played = true; heard += play.cues.splice(0).filter((c) => c.cue === 'ring' && !c.soft).length }
    expect(played).toBe(true)
    expect(heard).toBe(10)
    expect(play.tune).toBeNull()
    expect(play.asksToBlow).toBe(true)
    const again = start(serialize(play.save))
    for (let i = 0; i < 300; i++) { again.step(STEP); expect(again.tune).toBeNull() }
  })
  it('does not blow anything out with the touch that ends the tune', () => {
    const play = start({ ...full(), set: full().set.map((one, i) => (i === 9 ? null : one)) })
    tap(play, heart(PLACES[9]))
    while (play.tune === null) play.step(STEP)
    run(play, 1)
    tap(play, { x: 152, y: 650 })
    run(play, 3)
    expect(play.tune).toBeNull()
    expect(allSet(play.save)).toBe(true)
  })
  it('blows the garden dark from the one in front only, stored at once, and the flame stands up again', () => {
    const play = start(full())
    tap(play, { x: WAITING[0].x, y: WAITING[0].y - 40 })
    run(play, 1)
    expect(allSet(play.save)).toBe(true)
    tap(play, body(play))
    expect(play.save.set.every((one) => one === null)).toBe(true)
    run(play, 6)
    expect(play.puff).toBeNull()
    expect(play.shown.every((one) => one.who === null)).toBe(true)
    expect(Math.abs(play.lean)).toBeLessThan(0.01)
    tap(play, body(play))
    run(play, 2.6)
    expect(play.walker.lit).toBe(true)
  })
  it('gives way to a touch in the middle of the puff', () => {
    const play = start(full())
    tap(play, body(play))
    run(play, 1.2)
    tap(play, { x: 700, y: 60 })
    run(play, 1)
    expect(play.puff).toBeNull()
    expect(play.shown.every((one) => one.who === null)).toBe(true)
  })
})

describe('the tune', () => {
  it('rings what a finger runs over, in the order of the path', () => {
    const play = start({ set: fresh().set.map((_, i) => (['bear', 'gnome', 'goose', 'hare'] as const)[i % 4]) })
    play.cues.length = 0
    const from = at(500)
    play.act({ type: 'press', at: from })
    play.act({ type: 'dragStart', from })
    for (let u = 500; u < LENGTH; u += 8) { play.act({ type: 'dragMove', from, at: at(u) }); play.step(STEP) }
    const order = play.cues.flatMap((c) => (c.cue === 'ring' ? [c.place] : []))
    expect(order.length).toBeGreaterThanOrEqual(9)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(Play.pitch(0, 'hare')).toBeGreaterThan(Play.pitch(0, 'bear'))
  })
})

describe('anything a child does', () => {
  it('loses nothing, always settles, and is found as left', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = makeRng(seed), play = new Play(fresh())
      const spot = (): Point => ({ x: rng.next() * 1180, y: rng.next() * 820 })
      for (let i = 0; i < 70; i++) {
        const kind = rng.next(), p = rng.next() < 0.4 ? body(play) : spot()
        if (kind < 0.55) tap(play, p)
        else {
          play.act({ type: 'press', at: p })
          play.act({ type: 'dragStart', from: p })
          for (let k = 0; k < 4; k++) { play.act({ type: 'dragMove', from: p, at: rng.next() < 0.3 ? flame : spot() }); run(play, rng.next() * 0.4) }
          play.act(rng.next() < 0.15 ? { type: 'dragCancel', from: p, at: spot() } : { type: 'dragEnd', from: p, at: spot() })
        }
        run(play, rng.next() * 1.2)
        const saved = serialize(play.save), back = deserialize(JSON.parse(JSON.stringify(saved)))
        expect(new Set(saved.queue).size).toBe(4)
        expect(saved.queue[0]).toBe(play.walker.who)
        // Opened again, only a walk on its way has been finished.
        const ahead = back.set.filter(Boolean).length - saved.set.filter(Boolean).length
        expect(ahead === 0 || (ahead === 1 && saved.to !== null)).toBe(true)
        expect(play.walker.u >= 0 && play.walker.u <= LENGTH).toBe(true)
      }
      run(play, 22)
      expect(play.busy).toBe(false)
      play.save.set.forEach((who, i) => expect(play.shown[i].who).toBe(who))
    }
  }, 30000)
})
