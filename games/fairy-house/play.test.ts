import { describe, expect, it } from 'vitest'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW } from './guidance'
import { ForgivingTouch } from './input'
import { FOUND, type Kind } from './kinds'
import { Play } from './play'
import { build, laidOf, type Laid } from './rest'
import { freshSave, type Save } from './save'
import { SUN_AT, TICK } from './toy'

// The game with its idle ladder: what takes the ladder back to the bottom and
// what never does.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const day = (things: Laid[]): Save => ({ ...freshSave(7), things: laidOf(build(things)) })
const frames = (play: Play, seconds: number): void => { for (let i = 0; i < Math.round(seconds * 60); i++) play.frame(1 / 60) }
const pebble = FOUND[idOf('pebble')]

describe('the idle ladder', () => {
  it('starts at the bottom on load: no cue and no hand until the child has been idle a while', () => {
    const play = new Play(day([]), 1)
    frames(play, IDLE_BEFORE_GLOW - 0.2)
    expect(play.guidance).toMatchObject({ glow: 0, demo: null })
    expect(play.show().hand).toBeNull()
    frames(play, IDLE_BEFORE_DEMO - IDLE_BEFORE_GLOW + 1.5)
    expect(play.guidance!.demo).not.toBeNull()
    expect(play.show().hand).not.toBeNull()
    // The hand shows one move, and the cue lies on the one thing it takes.
    expect(play.show().things.filter((thing) => thing.glows)).toHaveLength(1)
  })

  it("is never reset by a character's own act: the three idle, blink and delight, and the hand still comes", () => {
    const play = new Play(day([]), 1)
    const delights = new Set<string>()
    let hand = false
    for (let i = 0; i < 60 * 14; i++) {
      play.frame(1 / 60)
      if (play.guidance!.demo !== null) hand = true
      for (const who of ['fat', 'tidy', 'tiny'] as const) if (play.toy.folk[who].doing) delights.add(play.toy.folk[who].doing!)
      // The three acting by themselves is never the game being busy.
      expect(play.toy.busy).toBe(false)
    }
    // They did things of their own all the while.
    expect(delights.size).toBeGreaterThanOrEqual(3)
    expect(hand).toBe(true)
  })

  it('is not reset by the sleepers breathing at evening, and then shows the sun raised', () => {
    const play = new Play({ ...day([]), finished: true, asleep: [{ who: 'fat', on: null, x: 640 }, { who: 'tidy', on: null, x: 640 }, { who: 'tiny', on: null, x: 640 }] }, 1)
    frames(play, IDLE_BEFORE_DEMO + 1.5)
    const show = play.show()
    expect(show.hand).not.toBeNull()
    // At evening the cue lies on the sun alone, the one thing that is dragged, and the hand goes up its track.
    expect(show.sun.glows).toBe(true)
    expect(show.things.some((thing) => thing.glows)).toBe(false)
    expect(Math.abs(show.hand!.x - show.sun.x)).toBeLessThan(38)
    expect(play.toy.demoMove(0)).toMatchObject({ sun: true, to: { y: SUN_AT.y } })
  })

  it('shows the sun pulled down every third time by day, and a carry the other times', () => {
    const play = new Play(day([]), 1)
    expect([0, 1, 2, 3, 4, 5].map((index) => play.toy.demoMove(index)!.sun)).toEqual([false, false, true, false, false, true])
    expect(play.toy.demoMove(2)).toMatchObject({ from: { y: SUN_AT.y }, to: { y: SUN_AT.under - 6 } })
    // The hand shows a move and makes none.
    expect(play.toy.evening).toBe(false)
  })

  it('stays at the bottom while a finger works, a thing is in the air or a scene plays', () => {
    const play = new Play(day([]), 1)
    play.act({ type: 'press', x: pebble.home.x, y: pebble.home.y - 12, corner: false })
    frames(play, 9)
    expect(play.guidance).toMatchObject({ glow: 0, demo: null })
    play.act({ type: 'tap' })
    // An evening is longer than the ladder's first rungs, and no hand comes up over it.
    play.act({ type: 'press', x: SUN_AT.x, y: SUN_AT.y, corner: false })
    play.act({ type: 'dragStart' })
    play.act({ type: 'dragMove', x: SUN_AT.x, y: SUN_AT.under })
    play.act({ type: 'dragEnd', x: SUN_AT.x, y: SUN_AT.under })
    expect(play.toy.playing).toBe(true)
    let shown = false
    while (play.toy.playing) {
      play.frame(1 / 60)
      if (play.guidance!.demo !== null || play.guidance!.glow > 0) shown = true
    }
    expect(shown).toBe(false)
    expect(play.seconds).toBeGreaterThan(10)
  })
})

describe('the grown-up corner', () => {
  it('answers nothing and does not reset the idle ladder, pressed, held or dragged', () => {
    const play = new Play(day([]), 1), before = play.toy.toSave()
    frames(play, IDLE_BEFORE_GLOW + 1.5)
    const glow = play.guidance!.glow
    expect(glow).toBeGreaterThan(0)
    // The corner lies over the wood at the top right; on a small surface it may lie over the sun.
    play.act({ type: 'press', x: SUN_AT.x, y: SUN_AT.y, corner: true })
    expect(play.toy.sounds).toEqual([])
    expect(play.toy.busy).toBe(false)
    frames(play, 1.2)
    play.act({ type: 'dragStart' })
    play.act({ type: 'dragMove', x: SUN_AT.x, y: SUN_AT.under })
    play.act({ type: 'dragEnd', x: SUN_AT.x, y: SUN_AT.under })
    expect(play.toy.sounds).toEqual([])
    expect(play.toy.evening).toBe(false)
    expect(play.toy.toSave()).toEqual(before)
    // The ladder went on climbing all the while.
    expect(play.guidance!.demo).not.toBeNull()
    play.act({ type: 'press', x: 600, y: 150, corner: true })
    play.act({ type: 'tap' })
    expect(play.toy.sounds).toEqual([])
  })

  it('does not end a scene', () => {
    const play = new Play(day([]), 1)
    play.act({ type: 'press', x: SUN_AT.x, y: SUN_AT.y, corner: false })
    play.act({ type: 'dragStart' })
    play.act({ type: 'dragEnd', x: SUN_AT.x, y: SUN_AT.under })
    frames(play, 2)
    play.act({ type: 'press', x: 1170, y: 20, corner: true })
    play.act({ type: 'tap' })
    expect(play.toy.playing).toBe(true)
    expect(play.toy.sceneCut).toBe(false)
  })
})

describe('putting the game away', () => {
  it('takes the idle ladder back to the bottom', () => {
    const play = new Play(day([]), 1)
    frames(play, IDLE_BEFORE_DEMO + 1)
    expect(play.guidance!.demo).not.toBeNull()
    play.putAway()
    expect(play.guidance).toMatchObject({ glow: 0, demo: null, demoIndex: -1 })
    expect(play.show().hand).toBeNull()
    frames(play, IDLE_BEFORE_GLOW - 0.5)
    expect(play.guidance!.glow).toBe(0)
  })

  it('lets go of a finger that was down: the next frames are idle ones', () => {
    const play = new Play(day([]), 1)
    play.act({ type: 'press', x: pebble.home.x, y: pebble.home.y - 12, corner: false })
    play.act({ type: 'dragStart' })
    play.act({ type: 'dragMove', x: 640, y: 480 })
    frames(play, 0.4)
    play.putAway()
    expect(play.toy.busy).toBe(false)
    expect(play.toy.toSave().things).toEqual([])
    frames(play, IDLE_BEFORE_GLOW + 1.3)
    expect(play.guidance!.glow).toBeGreaterThan(0.9)
  })
})

describe('a tap for the youngest', () => {
  it('may last 0.45 seconds and is still a tap: the thing hops and drops back, and nothing has changed', () => {
    // The touch module puts no time limit on a tap.
    const touch = new ForgivingTouch()
    expect(touch.down(1, { x: 500, y: 600 }, 0).map((gesture) => gesture.type)).toEqual(['press'])
    expect(touch.move(1, { x: 506, y: 604 }).map((gesture) => gesture.type)).toEqual([])
    expect(touch.up(1, { x: 506, y: 604 }, 450).map((gesture) => gesture.type)).toEqual(['tap'])
    // And the game takes it as one, however long the finger rested.
    const play = new Play(day([{ id: idOf('moss'), x: 640 }]), 1), before = play.toy.toSave()
    play.act({ type: 'press', x: 640, y: 590, corner: false })
    for (let i = 0; i < Math.round(0.45 / TICK); i++) play.frame(TICK)
    play.act({ type: 'tap' })
    frames(play, 1.5)
    expect(play.toy.toSave()).toEqual(before)
    expect(play.toy.dirty).toBe('no')
    expect(play.toy.busy).toBe(false)
    // The same on the sun: held for 0.45 seconds without moving, it starts nothing.
    play.act({ type: 'press', x: SUN_AT.x, y: SUN_AT.y, corner: false })
    for (let i = 0; i < Math.round(0.45 / TICK); i++) play.frame(TICK)
    play.act({ type: 'tap' })
    expect(play.toy.evening).toBe(false)
    expect(play.toy.playing).toBe(false)
  })
})

describe('age is a first-visit default and nothing more', () => {
  it('lets a child of any age, or of none, carry every one of the eighteen things, call the evening and raise the sun', () => {
    for (const age of [null, 2, 4, 5, 7, 12]) {
      const play = new Play(freshSave(age), 1)
      const inHouse = new Set(play.toy.rested.map((r) => r.id))
      for (const found of FOUND) {
        if (inHouse.has(found.id)) continue
        play.toy.sounds.length = 0
        play.act({ type: 'press', x: found.home.x, y: found.home.y - 12, corner: false })
        expect(play.toy.sounds.map((sound) => sound.from), `age ${age}, thing ${found.id}`).toEqual([`lift ${found.id}`])
        play.act({ type: 'tap' })
        frames(play, 0.5)
      }
      play.act({ type: 'press', x: SUN_AT.x, y: SUN_AT.y, corner: false })
      play.act({ type: 'dragStart' })
      play.act({ type: 'dragEnd', x: SUN_AT.x, y: SUN_AT.under })
      expect(play.toy.evening, `age ${age}`).toBe(true)
    }
  })

  it('never reads the age after the first visit: a saved house opens the same at every age', () => {
    const saved = day([{ id: idOf('bark'), x: 640 }])
    const shows = [null, 3, 9].map(() => JSON.stringify(new Play(saved, 1).show().things))
    expect(new Set(shows).size).toBe(1)
  })
})
