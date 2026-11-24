import { describe, expect, it } from 'vitest'
import { Crowd, REACTS, WATCHERS, strangeness, type Beast, type Look } from './crowd'
import { demosFor } from './demos'
import { MAX_DEMOS } from './guidance'
import { Hands } from './hands'
import { FOOD_RIGHT, HANG, LEFT, LINE_FLOOR, RIGHT, ROOM, STABLE, STABLE_ROOM, pegAt } from './layout'
import { Play } from './play'
import { deserialize, freshSave } from './save'
import { SOUNDS, notes } from './sound'
import { STAGE } from './stage'

const FRAME = 1 / 60
const chance = (): (() => number) => { let s = 31; return () => ((s = (s * 16807) % 2147483647) / 2147483647) }

describe('sound', () => {
  it.each(SOUNDS)('%s is in range, whoever is inside', (sound) => {
    for (const who of [null, 0, 1] as const) for (const n of [0, 3, 12]) for (const note of notes(sound, who, n)) {
      expect(note.frequency).toBeGreaterThan(30)
      expect(note.frequency).toBeLessThan(6000)
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(0.36)
      expect((note.delay ?? 0) + note.attack + note.decay).toBeLessThan(2)
    }
  })
  it('each is its own', () => {
    expect(new Set(SOUNDS.map((sound) => JSON.stringify(notes(sound)))).size).toBe(SOUNDS.length)
  })
})

describe('the save', () => {
  it.each([null, 3, 'x', [], {}, { v: 2 }, { v: 1 }, { v: 1, halves: [{ x: 'no', wear: 99 }, null], pegs: [1, 1, 1, -2, 'a'], food: [{}, { kind: 'apple', x: NaN }, 5], eaten: ['rock'], tied: true, ended: 'yes' }, { ...freshSave(), pegs: [0, 4, 1, 1, 2, 2, 3, 3] }])('reads %j as a whole yard', (raw) => {
    const saved = deserialize(raw)
    expect([...saved.halves.map((half) => half.wear), ...saved.pegs.filter((peg) => peg !== null)].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(saved.pegs).toHaveLength(8)
    expect(saved.ended).toBe(false)
    for (const half of saved.halves) expect(half.x >= LEFT && half.x <= RIGHT).toBe(true)
    expect(deserialize(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
  })
  it('opening it makes no sound and moves nothing on', () => {
    const play = new Play(deserialize({ ...freshSave(), ended: true, halves: [{ x: 160, sit: false, wear: 0 }, { x: 96, sit: false, wear: 4 }] }), chance())
    expect(play.heard).toEqual([])
    expect(play.changed).toBe(false)
    expect(play.door).toBe(1)
  })
})

describe('the crowd', () => {
  const beast: Beast = { front: 0, rear: 4, gap: 270, lift: 0, sit: false, tied: false, asleep: false }
  const look: Look = { doubt: 0, like: 0, lift: 0, tilt: 0, squash: 0, part: 0, mouth: 0, blink: 0 }
  const settle = (change: Partial<Beast>): Crowd => { const crowd = new Crowd(chance()); for (let t = 0; t < 4; t += FRAME) crowd.step(FRAME, { ...beast, ...change }); return crowd }
  it('believes a whole animal, and doubts in its own order', () => {
    expect(strangeness(beast)).toBe(0)
    const whole = settle({}), odd = settle({ gap: 520 })
    for (const who of ['farmer', 'cow', 'hen'] as const) expect(whole.states[who].doubt).toBeLessThan(0.05)
    expect(odd.states.hen.doubt).toBeGreaterThan(odd.states.farmer.doubt)
    expect(odd.states.farmer.doubt).toBeGreaterThanOrEqual(odd.states.cow.doubt)
    const wild = settle({ gap: 900, tied: true })
    for (const who of WATCHERS) expect(wild.states[who].doubt).toBeGreaterThan(0.8)
  })
  it('every answer ends, and stays small enough to be drawn', () => {
    for (const who of WATCHERS) for (const react of REACTS) {
      const crowd = settle({})
      crowd.react(who, react)
      for (let t = 0; t < 2.6; t += FRAME) {
        crowd.step(FRAME, beast)
        crowd.look(who, look)
        expect(Math.abs(look.squash)).toBeLessThan(0.5)
        expect(Math.abs(look.lift)).toBeLessThan(160)
      }
      expect(crowd.busy(who)).toBe(false)
    }
  })
})

describe('fingers', () => {
  it('three work, the rest are extra, and a lifted one makes room', () => {
    const hands = new Hands<string>()
    const at = { x: 0, y: 0 }
    const made = [1, 2, 3, 4].map((id) => hands.land(id, at, 'x', at, false).extra)
    expect(made).toEqual([false, false, false, true])
    hands.lift(2)
    expect(hands.land(5, at, 'x', at, false).extra).toBe(false)
    expect(hands.move(99, at)).toBeNull()
  })
})

describe('nothing stands in anything', () => {
  it('two ends that nobody holds never share a place once they have settled', () => {
    const rnd = chance()
    for (let n = 0; n < 60; n++) {
      const fresh = freshSave()
      const play = new Play(deserialize({ ...fresh, food: [], halves: [{ ...fresh.halves[0], x: LEFT + rnd() * (RIGHT - LEFT) }, { ...fresh.halves[1], x: LEFT + rnd() * (RIGHT - LEFT) }] }), rnd)
      for (let t = 0; t < 3; t += FRAME) play.step(FRAME)
      const inside = play.halves.every((half) => half.x < STABLE.right + 60)
      expect(Math.abs(play.gap)).toBeGreaterThan((inside ? STABLE_ROOM : ROOM) - 3)
    }
  })
  it('the line hangs clear of an animal on the ground and of the top of the stage', () => {
    for (let peg = 0; peg < 8; peg++) expect(pegAt(peg).y + HANG + 54).toBeLessThan(LINE_FLOOR + 20)
    expect(pegAt(3).y - 14).toBeGreaterThan(80)
    expect(FOOD_RIGHT).toBeLessThan(1076 - 85)
  })
  it('the ghost hand shows only moves that can be made from what is there, on the stage, and never into the stable', () => {
    for (const ended of [false, true]) for (let i = 0; i < MAX_DEMOS; i++) {
      const fresh = freshSave()
      const play = new Play({ ...fresh, ended, halves: ended ? [{ x: 160, sit: false, wear: 0 }, { x: 96, sit: false, wear: 4 }] : fresh.halves }, chance())
      for (const move of demosFor(play, i)) {
        for (const at of [move.from, move.to]) expect(at.x > 0 && at.x < STAGE.width && at.y > 0 && at.y < STAGE.height - 60).toBe(true)
        if (move.drag) expect(move.to.x).toBeGreaterThan(STABLE.mouth)
      }
    }
  })
})
