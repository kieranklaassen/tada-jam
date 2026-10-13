import { describe, expect, it } from 'vitest'
import { SEATS, SNAIL, SUN } from './ground'
import { freshSave } from './save'
import { stepAt } from './shapes'
import { OUT, Village } from './village'
import { BELL, FRAME, ON_CART, PUFF, RED, carry, doorOf, fromLog, run, tap, village, type At } from './testkit'

// One clock for sight and sound. Every answer and every scene is a list of
// timed beats, and a beat sets its pose and queues its notes in the same
// call. This test plays every cell of the grid and every scene to its end
// and reads the log of beats that fired: a beat that sounded and moved
// nothing would be a sound with no picture.

const WATER: At = { x: 870, y: 742 }
const ROW = [860, 880, 900, 920, 940, 960, 980].map((x) => ({ x, y: 600 }))
const THREE = [RED, BELL, PUFF]
const HOUSES = { mushrooms: [{ ...RED, door: true }, { ...BELL, door: true }, { ...PUFF, door: true }, { id: 4, x: 900, y: 500, size: 2, door: true }], homes: { tall: 4, sleepy: 3, sneezy: 1, baker: 2 }, hatOff: true }
const cap = (m: { x: number; y: number }): At => ({ x: m.x, y: m.y - 60 })
const seat = (who: keyof typeof SEATS): At => ({ x: SEATS[who].x, y: SEATS[who].y - 100 })

/** Each is a touch, or a few; the village is then left alone until everything it started is over. */
const PLAYS: [string, () => Village, (v: Village) => void][] = [
  ['a mushroom grown from bare moss in each ground', () => village(), (v) => { for (const m of THREE) { v.press(m); run(v, 1); v.lift() } }],
  ['a mushroom held to full, and held on', () => village({ mushrooms: [RED] }), (v) => { v.press(cap(RED)); run(v, 2.5); v.lift() }],
  ['each kind poked', () => village({ mushrooms: THREE }), (v) => { for (const m of THREE) { tap(v, cap(m)); run(v, 1.5) } }],
  ['each kind pulled out', () => village({ mushrooms: THREE }), (v) => { for (const m of THREE) { carry(v, cap(m), { x: m.x, y: m.y - 60 - OUT - 40 }); v.lift(); run(v, 1.5) } }],
  ['each kind pulled a little and let go', () => village({ mushrooms: THREE }), (v) => { for (const m of THREE) { carry(v, cap(m), { x: m.x, y: m.y - 90 }); v.lift(); run(v, 0.6) } }],
  ['a door dropped into each kind', () => village({ mushrooms: THREE, homes: { tall: 9, sleepy: 9, sneezy: 9, baker: 9 } }), (v) => { for (const m of THREE) { carry(v, ON_CART, { x: m.x, y: m.y - 30 }); v.lift(); run(v, 1.5) } }],
  ['a door sent by a tap, and a cart with none to send', () => village({ mushrooms: [RED], homes: { tall: 9, sleepy: 9, sneezy: 9, baker: 9 } }), (v) => { tap(v, ON_CART); run(v, 1); tap(v, ON_CART) }],
  ['a door on a door, on the stream, on a path, on a gnome and on bare moss', () => village({ mushrooms: [{ ...RED, door: true }], paths: [ROW], homes: { tall: 9, sleepy: 9, sneezy: 9, baker: 9 } }), (v) => {
    for (const to of [cap(RED), WATER, { x: 920, y: 600 }, seat('sneezy'), { x: 600, y: 300 }]) { carry(v, ON_CART, to); v.lift(); run(v, 5) }
  }],
  ['a door taken off a house', () => village(HOUSES), (v) => { carry(v, doorOf(v, 1), { x: 880, y: 640 }); v.lift() }],
  ['a path drawn onto each kind', () => village({ mushrooms: THREE }), (v) => {
    for (const m of THREE) { const step = stepAt(m); carry(v, { x: step.x + 120, y: step.y + 40 }, step); v.lift(); run(v, 1) }
  }],
  ['the stream held, tapped, pulled up and paved', () => village(), (v) => {
    v.press(WATER); run(v, 2); v.lift(); run(v, 1)
    tap(v, { x: 730, y: 740 }); run(v, 1)
    carry(v, WATER, { x: WATER.x, y: WATER.y - 130 }); v.lift(); run(v, 1)
    carry(v, { x: 590, y: 520 }, { x: 800, y: 520 }, 20); v.lift()
  }],
  ['a path held, tapped, lifted and dropped, lifted and let roll, and crossed', () => village({ paths: [ROW] }), (v) => {
    v.press({ x: 920, y: 600 }); run(v, 0.8); v.lift(); run(v, 0.5)
    tap(v, { x: 920, y: 600 }); run(v, 1.5)
    carry(v, { x: 920, y: 540 }, { x: 920, y: 660 }); v.lift(); run(v, 0.6)
    carry(v, { x: 880, y: 600 }, { x: 880, y: 570 }); v.lift(); run(v, 0.5)
    carry(v, { x: 880, y: 600 }, { x: 880, y: 600 - OUT - 40 }); v.lift()
  }],
  ['the moss full of pebbles', () => village({ paths: [[360, 380, 400, 420, 440].flatMap((y) => Array.from({ length: 48 }, (_, i) => ({ x: 40 + 20 * i, y })))] }), (v) => { run(v, 1); carry(v, { x: 880, y: 620 }, { x: 980, y: 620 }); v.lift() }],
  ['the moss with no room', () => village({ mushrooms: [RED] }), (v) => { tap(v, { x: RED.x + 40, y: RED.y }) }],
  ['each gnome held, tapped and his hat pulled off', () => village(), (v) => {
    for (const who of ['tall', 'sleepy', 'sneezy', 'baker'] as const) {
      v.press(seat(who)); run(v, 1.2); v.lift(); run(v, 0.8)
      tap(v, seat(who)); run(v, 1.2)
      carry(v, seat(who), { x: seat(who).x, y: seat(who).y - 90 }); run(v, 0.4); v.lift(); run(v, 0.8)
    }
  }],
  ['a path drawn onto a gnome who waits', () => village(), (v) => { carry(v, { x: 880, y: 600 }, { x: 640, y: 540 }, 20); v.lift() }],
  ['the sun held, pulled a little, and the snail tapped', () => village(), (v) => {
    v.press(SUN); run(v, 1.2); v.lift(); run(v, 0.8)
    carry(v, SUN, { x: SUN.x, y: SUN.y + 30 }); v.lift(); run(v, 0.5)
    tap(v, { x: SNAIL.x, y: SNAIL.y - 20 })
  }],
  ['the cart comes', () => new Village(freshSave(3), 1), (v) => { tap(v, WATER) }],
  ['the first pebbles, and the sleepy one moves in', () => village({ mushrooms: [RED], shown: ['cart'] }), (v) => { tap(v, ON_CART) }],
  ['each gnome moves in by pebbles, to a house that fits him or does not', () => village({ mushrooms: [{ ...RED, door: true }, { ...PUFF, door: true }, { id: 4, x: 900, y: 500, size: 2, door: true }, { ...BELL, door: true }] }), (v) => {
    for (const m of [RED, PUFF, { x: 900, y: 500 }, BELL]) { const way = fromLog(stepAt(m), m.x < 520 ? 180 : 520); v.press(way[0]); for (const p of way.slice(1)) v.drag(p); v.lift(); run(v, 14) }
  }],
  ['each gnome is brought out for a walk', () => village({ ...HOUSES, paths: [fromLog(stepAt(RED)), fromLog({ x: 900, y: 516 }, 520), fromLog(stepAt(BELL), 520), fromLog(stepAt(PUFF), 180)] }), (v) => {
    for (const id of [1, 2, 3, 4]) { tap(v, doorOf(v, id)); run(v, 14) }
  }],
  ['a gnome walks a loop until he is dizzy', () => village({ mushrooms: [{ ...RED, door: true }], homes: { tall: null, sleepy: null, sneezy: 1, baker: null }, paths: [[{ x: 1000, y: 520 }, { x: 980, y: 540 }, { x: 960, y: 560 }, { x: 940, y: 580 }, { x: 920, y: 600 }, { x: 940, y: 620 }, { x: 960, y: 640 }, { x: 980, y: 620 }, { x: 1000, y: 600 }, { x: 980, y: 580 }, { x: 960, y: 560 }]] }), (v) => { tap(v, doorOf(v, 1)) }],
  ['night falls and morning comes', () => village(HOUSES), (v) => { tap(v, SUN); run(v, 14); tap(v, { x: SUN.x, y: 250 }) }],
  ['the village by itself for a minute, by day and by night', () => village({ ...HOUSES, mushrooms: [...HOUSES.mushrooms.slice(0, 2), { ...PUFF, door: true }, HOUSES.mushrooms[3]], homes: { tall: 4, sleepy: 2, sneezy: 3, baker: 1 }, paths: [fromLog(stepAt(RED))] }), (v) => { run(v, 60); tap(v, SUN); run(v, 30) }],
]

describe('sight and sound share one clock', () => {
  it.each(PLAYS)('%s', (_name, make, play) => {
    const v = make()
    v.takeFired()
    play(v)
    const fired = v.takeFired()
    let left = 40
    while (v.busy && left > 0) { v.step(FRAME); left -= FRAME; fired.push(...v.takeFired()) }
    expect(v.busy).toBe(false)
    expect(fired.length).toBeGreaterThan(0)
    expect(fired.filter((beat) => beat.sound && !beat.moved)).toEqual([])
  })

  it('answers in the call of the touch itself, for every thing a finger can land on', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }, BELL, PUFF], paths: [ROW], homes: { tall: null, sleepy: null, sneezy: 1, baker: null } })
    for (const at of [{ x: 900, y: 460 }, cap(RED), cap(BELL), cap(PUFF), doorOf(v, 1), WATER, { x: 920, y: 600 }, seat('tall'), seat('sleepy'), seat('baker'), SUN, { x: SNAIL.x, y: SNAIL.y - 20 }, ON_CART, { x: 600, y: 200 }, { x: 300, y: 790 }]) {
      run(v, 3)
      v.takeNotes(); v.takeFired()
      v.press(at)
      expect(v.takeNotes().length, `a note at ${at.x}, ${at.y}`).toBeGreaterThan(0)
      expect(v.takeFired().some((beat) => beat.moved), `a move at ${at.x}, ${at.y}`).toBe(true)
      v.takeAway()
    }
  })
})
