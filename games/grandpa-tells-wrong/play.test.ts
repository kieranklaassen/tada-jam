import { describe, expect, it } from 'vitest'
import { COCK, LAMP, SPOT, pictureAt, thingHome } from './layout'
import type { Point } from './input'
import { HAPPENS, LAMP_REST, Play, demoMove, type PlayEvent } from './play'
import { makeRng, below } from './rng'
import { deserialize, fresh, serialize, worldOf, type Save } from './save'
import { CAST, THINGS, run, same, sameTale, type Event, type Who } from './tale'

const STEP = 1 / 60
const LAMP_LASTS = HAPPENS[2] + LAMP_REST
/** Three things in a day: where the order of them is told wrong. */
const long = (): Save => ({ ...fresh(null), position: 'order' })
const heard = new WeakMap<Play, PlayEvent[]>()
const make = (save: Save = long(), seed = 5) => { const play = new Play(save, seed); heard.set(play, []); return play }
const wait = (play: Play, seconds: number) => { for (let i = 0; i < seconds * 60; i++) { play.step(STEP); heard.get(play)?.push(...play.take()) } }
const tap = (play: Play, at: Point) => { play.down(1, at); play.lift(1, at) }
const drag = (play: Play, from: Point, to: Point) => { play.down(1, from); play.move(1, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }); play.move(1, to); play.lift(1, to) }
const middle = (who: Who): Point => ({ x: SPOT[who].x, y: SPOT[who].y - 150 })
const GRANDPA: Point = { x: SPOT.grandpa.x, y: SPOT.grandpa.y - 220 }
const puppet = (i: number): Point => ({ x: pictureAt(i).x + 80, y: pictureAt(i).y + 70 })
const prop = (i: number): Point => ({ x: pictureAt(i).x + 280, y: pictureAt(i).y + 70 })

const DAY: Event[] = [{ who: 'pig', what: 'jam' }, { who: 'pig', what: 'pillow' }, { who: 'goose', what: 'water' }]
function live(play: Play, day: readonly Event[] = DAY) {
  for (const { who, what } of day) { drag(play, thingHome(what), middle(who)); wait(play, 1) }
}
function told(play: Play) {
  live(play)
  wait(play, 13)
}
const kinds = (play: Play, kind: PlayEvent['kind']) => heard.get(play)!.filter((event) => event.kind === kind).length

describe('a day', () => {
  it('is three happenings, dragged or thrown, and then dusk', () => {
    const play = make()
    drag(play, thingHome('jam'), middle('goose'))
    wait(play, 2)
    expect(play.save.day).toEqual([{ who: 'goose', what: 'jam' }])
    const asks = play.save.asks
    tap(play, thingHome('pants'))
    wait(play, 2)
    expect(play.save.day[1]).toEqual({ who: asks, what: 'pants' })
    tap(play, thingHome('mud'))
    wait(play, 0.8)
    expect(play.save.phase).toBe('dusk')
    expect(sameTale(play.save.first, play.save.day)).toBe(false)
    expect(play.save.told).toEqual(play.save.first)
    expect(play.evening).toBe(false)
    wait(play, 2.2)
    expect([play.evening, play.scene?.kind, play.up]).toEqual([true, 'dusk', 0])
    expect(play.shown).toEqual(worldOf(play.save))
  })
  it('loses nothing let go on nothing, on Grandpa or on the cock', () => {
    const play = make()
    for (const to of [{ x: 540, y: 150 }, GRANDPA, COCK, { x: 400, y: 700 }]) { drag(play, thingHome('jam'), to); wait(play, 2) }
    expect([play.save.day.length, play.flights.length, play.busy]).toEqual([0, 0, false])
    expect([kinds(play, 'splat'), kinds(play, 'snore'), kinds(play, 'duck')]).toEqual([1, 1, 1])
  })
  it('answers the finger when it lands, on every kind of thing', () => {
    for (const at of [thingHome('jam'), middle('pig'), GRANDPA, LAMP, COCK, { x: 560, y: 330 }, { x: 20, y: 810 }]) {
      const play = make()
      play.down(1, at)
      expect(play.take().length).toBeGreaterThan(0)
    }
  })
  it('puts a thing back when the finger is taken away, and ignores a second finger', () => {
    const play = make()
    play.down(1, thingHome('mud'))
    play.move(1, middle('pig'))
    play.down(2, thingHome('jam'))
    play.lift(2, thingHome('jam'))
    play.cancel(1)
    wait(play, 2)
    expect(play.save.day).toEqual([])
    expect(play.thingAt('mud').at).toEqual(thingHome('mud'))
  })
  it('happens at most three times, however fast', () => {
    const play = make()
    for (let i = 0; i < 12; i++) { tap(play, thingHome(THINGS[i % 6])); wait(play, 0.05) }
    wait(play, 8)
    expect(play.save.day).toHaveLength(3)
    expect(play.save.phase).toBe('told')
  })
})

describe('the telling', () => {
  it('comes by itself after dusk, one picture at a time, and a touch brings the next', () => {
    const play = make()
    live(play)
    for (let i = 0; i < 60 && play.scene?.kind !== 'telling'; i++) wait(play, 0.1)
    expect(play.save.phase).toBe('told')
    wait(play, 0.7)
    expect(play.up).toBe(1)
    tap(play, { x: 30, y: 400 })
    expect(play.up).toBe(2)
    expect(play.save.told).toEqual(play.save.first)
    wait(play, 9)
    expect([play.up, play.scene]).toEqual([3, null])
  })
  it('changes a puppet or a thing by one tap, and two pictures by a drag', () => {
    const play = make()
    told(play)
    const before = play.save.told
    tap(play, puppet(1))
    expect(play.save.told[1].who).toBe(CAST[(CAST.indexOf(before[1].who) + 1) % 5])
    tap(play, prop(0))
    expect(play.save.told[0].what).toBe(THINGS[(THINGS.indexOf(before[0].what) + 1) % 6])
    const now = play.save.told
    drag(play, puppet(0), puppet(2))
    expect(play.save.told).toEqual([now[2], now[1], now[0]])
    // A smear is a tap.
    drag(play, puppet(0), { x: puppet(0).x + 60, y: puppet(0).y })
    expect(play.save.told[0].who).not.toBe(now[2].who)
    expect(play.save.day).toEqual(DAY)
    expect(play.save.first).toEqual(before)
  })
  it('waits to be asked where the game was opened again at dusk', () => {
    for (const at of [GRANDPA, puppet(0), prop(2)]) {
      const day = make()
      live(day)
      const play = make(deserialize(serialize(day.save), null))
      wait(play, 20)
      expect([play.save.phase, play.busy]).toEqual(['dusk', false])
      tap(play, at)
      expect(play.save.phase).toBe('told')
    }
  })
  it('never marks a true story', () => {
    const save = { ...fresh(null), phase: 'told' as const, day: DAY, first: [DAY[0], DAY[1], { who: 'granny' as const, what: 'water' as const }], told: [DAY[0], DAY[1], { who: 'moon' as const, what: 'water' as const }] }
    const right = make(save)
    tap(right, puppet(2)) // moon to goose: the true one
    expect(right.save.told).toEqual(DAY)
    const other = make({ ...save, told: [DAY[0], DAY[1], { who: 'pig' as const, what: 'water' as const }] })
    tap(other, puppet(2))
    expect(right.take().map((event) => event.kind)).toEqual(other.take().map((event) => event.kind))
  })
})

describe('a smeared tap', () => {
  it('is a tap on a thing, a lone picture and the night sky', () => {
    const play = make(fresh(4))
    drag(play, thingHome('mud'), { x: thingHome('mud').x + 30, y: thingHome('mud').y - 20 })
    wait(play, 9)
    expect(play.save.day).toHaveLength(1)
    const before = play.save.told[0].who, at = { x: pictureAt(0, 1).x + 80, y: 720 }
    drag(play, at, { x: at.x + 120, y: at.y })
    expect(play.save.told[0].who).not.toBe(before)
    tap(play, LAMP)
    wait(play, 9)
    drag(play, { x: 300, y: 200 }, { x: 340, y: 220 })
    expect(play.save.phase).toBe('day')
  })
  it('has the second of two quick throws splat and hop home, on a day of one', () => {
    const play = make(fresh(4))
    tap(play, thingHome('mud'))
    tap(play, thingHome('jam'))
    wait(play, 1.5)
    expect([play.save.day.length, kinds(play, 'splat'), play.flights.length]).toEqual([1, 1, 0])
  })
})

describe('a first day', () => {
  it('is one thing, one picture, and whoever it really happened to saying so', () => {
    const play = make(fresh(4))
    drag(play, thingHome('mud'), middle('pig'))
    wait(play, 9)
    expect([play.save.day.length, play.count, play.up, play.busy]).toEqual([1, 1, 1, false])
    expect(play.save.told[0].who).not.toBe('pig')
    expect(play.wronged).toEqual(['pig'])
    expect(kinds(play, 'protest')).toBe(1)
    wait(play, 20)
    expect(kinds(play, 'protest')).toBe(1)
    const only = { x: pictureAt(0, 1).x + 80, y: 720 }
    for (let i = 0; i < 5 && play.save.told[0].who !== 'pig'; i++) { tap(play, only); wait(play, 2) }
    expect(play.wronged).toEqual([])
    tap(play, LAMP)
    wait(play, 8)
    expect([play.night, play.save.position]).toEqual([true, 'what'])
    tap(play, { x: 300, y: 200 })
    wait(play, 3)
    expect(play.save.phase).toBe('day')
  })
  it('comes to three, and to nobody saying so where the order is the joke', () => {
    const play = make()
    told(play)
    expect([play.count, play.wronged.length]).toEqual([3, 0])
  })
})

describe('the lamp', () => {
  const lamp = (over: Partial<Save>) => {
    const play = make({ ...fresh(null), phase: 'told', day: DAY, first: DAY.map((event, i) => (i === 1 ? { who: 'granny', what: 'pillow' } : event)), told: DAY, ...over })
    tap(play, LAMP)
    heard.get(play)!.push(...play.take())
    return play
  }
  it('makes the told story the day, whichever it is', () => {
    const lie: Event[] = [{ who: 'moon', what: 'jam' }, { who: 'moon', what: 'pillow' }, { who: 'grandpa', what: 'balloon' }]
    const play = lamp({ told: lie })
    expect(play.save.finished).toBe(true)
    wait(play, 1)
    expect(kinds(play, 'unravel')).toBe(1)
    wait(play, LAMP_LASTS)
    expect(play.shown).toEqual(run(play.save.base, lie))
    expect([play.shown.moon.coat, play.shown.grandpa.up, play.shown.pig.coat]).toEqual(['feathers', true, 'bare'])
    expect([kinds(play, 'astonished'), kinds(play, 'remembers')]).toEqual([3, 0])
  })
  it('has him remember only where he had it wrong', () => {
    const play = lamp({})
    wait(play, LAMP_LASTS + 1)
    expect([kinds(play, 'astonished'), kinds(play, 'remembers'), kinds(play, 'land')]).toEqual([0, 1, 3])
  })
  it('is moved on beat by beat by a touch, and shows every happening on the way', () => {
    const play = lamp({})
    for (let i = 0; i < 30 && play.scene; i++) { wait(play, 0.1); tap(play, { x: 300, y: 350 }) }
    heard.get(play)!.push(...play.take())
    wait(play, 0.1)
    expect(play.scene).toBeNull()
    expect(kinds(play, 'land')).toBe(3)
    expect(play.shown).toEqual(worldOf(play.save))
  })
  it('leaves a night that stays until the cock is touched, and the mess is still on', () => {
    const play = lamp({})
    wait(play, 200)
    expect(play.night).toBe(true)
    for (const at of [puppet(0), prop(1), GRANDPA, LAMP]) tap(play, at)
    expect(play.save.told).toEqual(DAY)
    tap(play, COCK)
    wait(play, 4)
    expect([play.save.phase, play.save.day.length, play.night]).toEqual(['day', 0, false])
    expect(play.shown.pig.coat).toBe('feathers')
  })
})

describe('found as left', () => {
  it('holds the outcome at every instant of a whole day and night, and nothing replays', () => {
    const play = make()
    const check = () => {
      const again = make(deserialize(serialize(play.save), null))
      expect(again.save).toEqual(play.save)
      expect(again.shown).toEqual(worldOf(play.save))
      expect([again.scene, again.flights.length, again.busy]).toEqual([null, 0, false])
      wait(again, 0.5)
      expect(again.save).toEqual(play.save)
    }
    const go = (seconds: number) => { for (let i = 0; i < seconds * 10; i++) { wait(play, 0.1); check() } }
    for (const event of DAY) { drag(play, thingHome(event.what), middle(event.who)); check(); go(1) }
    go(12)
    tap(play, puppet(1)); check(); go(1)
    tap(play, LAMP); check(); go(10)
    tap(play, COCK); check(); go(3)
  })
  it('lands a thing the child had let go when it is put away, and puts back one still in the hand', () => {
    const play = make()
    drag(play, thingHome('jam'), middle('pig'))
    play.clear()
    expect(play.save.day).toHaveLength(1)
    play.down(1, thingHome('mud'))
    play.move(1, middle('goose'))
    play.clear()
    expect([play.save.day.length, play.held]).toEqual([1, null])
  })
})

describe('any fingers at all', () => {
  it('find no dead end, and every scene ends', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const play = make(seed % 2 ? fresh(null) : long(), seed), rng = makeRng(seed * 77)
      let nights = 0
      for (let i = 0; i < 1500; i++) {
        const at = { x: below(rng, 1180), y: below(rng, 820) }, to = { x: below(rng, 1180), y: below(rng, 820) }
        const kind = below(rng, 6), id = 1 + below(rng, 2)
        if (kind === 0) play.down(id, at)
        else if (kind === 1) play.move(id, to)
        else if (kind === 2) play.cancel(id)
        else if (kind === 3) { play.lift(id, to); tap(play, at) }
        else if (kind === 4) { play.lift(1, to); play.lift(2, to); drag(play, at, to) }
        else tap(play, [LAMP, GRANDPA, COCK, thingHome(THINGS[below(rng, 6)])][below(rng, 4)])
        wait(play, below(rng, 40) / 60)
        if (play.save.finished) nights += 1
        expect(play.save.day.length).toBeLessThanOrEqual(3)
      }
      play.lift(1, { x: 0, y: 0 }); play.lift(2, { x: 0, y: 0 })
      wait(play, 12)
      expect([play.scene, play.busy, play.held]).toEqual([null, false, null])
      expect(play.shown).toEqual(worldOf(play.save))
      expect(nights).toBeGreaterThan(0)
    }
  })
})

describe('the ghost hand', () => {
  it('shows moves that can be made, and not the answer', () => {
    const play = make()
    const flies = demoMove(play, 0)
    drag(play, flies.from, flies.to!)
    wait(play, 2)
    expect(play.save.day).toHaveLength(1)
    const dusk = make()
    told(dusk)
    // Always the puppet in the middle, wherever he is wrong.
    expect(demoMove(dusk, 0)).toEqual(demoMove(make({ ...dusk.save, first: DAY, told: DAY }), 0))
    tap(dusk, demoMove(dusk, 0).from)
    expect(same(dusk.save.told[1], dusk.save.first[1])).toBe(false)
  })
})
