import { describe, expect, it } from 'vitest'
import { HOME, MEETING, PANES, PENDULUM, BELL, place, toPoint, zoneAt } from './layout'
import { Party, type PartyEvent } from './party'
import { BEAT_SECONDS, COATS, EFFECTS, GESTURES, GUESTS, THINGS, effectOf, moodOf, outcomeOf, type Side } from './rules'
import type { Point } from './stage'
import { deserialize, freshState, serialize } from './state'

const OVER = { u: 455, y: 340 }
const ON = { u: 455, y: 575 }
const UP = { u: 360, y: 120 }
const FACE = { u: 250, y: 240 }

function party(age: number | null = null) {
  const p = new Party(freshState(age))
  const seen: PartyEvent[] = []
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      p.step(1 / 60)
      seen.push(...p.take())
    }
  }
  const tap = (at: Point, id = 1) => {
    p.down(id, at)
    run(0.06)
    p.up(id, at)
  }
  const drag = (path: Point[], id = 1, each = 0.2) => {
    p.down(id, path[0])
    for (const at of path) {
      p.move(id, at)
      run(each)
    }
    p.up(id, path[path.length - 1])
  }
  const acts = (side: Side) => seen.filter((e) => e.type === 'act' && e.side === side).map((e) => (e.type === 'act' ? e.act : ''))
  return { p, seen, run, tap, drag, acts }
}

describe('rules', () => {
  it('gives every coat and effect an antic of its own', () => {
    const all = COATS.flatMap((coat) => EFFECTS.map((effect) => outcomeOf(coat, effect).antic))
    expect(new Set(all).size).toBe(COATS.length * EFFECTS.length)
  })
  it('lets every coat be left, and every coat be reached from clean', () => {
    const reached = new Set(['clean'])
    for (let i = 0; i < 4; i++) for (const coat of COATS) if (reached.has(coat)) for (const e of EFFECTS) reached.add(outcomeOf(coat, e).coat)
    expect([...reached].sort()).toEqual([...COATS].sort())
    for (const coat of COATS) expect(EFFECTS.some((e) => outcomeOf(coat, e).coat !== coat)).toBe(true)
  })
  it('gives the two guests at the table different answers to one movement', () => {
    for (const a of THINGS) for (const b of THINGS) for (const act of GESTURES) {
      const ea = effectOf(a, act), eb = effectOf(b, act)
      if (a !== b && ea && eb && ea !== eb) expect([ea, moodOf('walrus', ea)]).not.toEqual([eb, moodOf('dog', eb)])
    }
    expect(new Set(GUESTS.map((g) => EFFECTS.map((e) => moodOf(g, e)).join())).size).toBe(4)
  })
})

describe('the copy', () => {
  it('pours tea here and glue there, a beat later', () => {
    const g = party()
    g.tap(toPoint(0, OVER))
    g.run(0.45)
    expect(g.p.state.coats.walrus).toBe('wet')
    expect(g.p.state.coats.dog).toBe('clean')
    g.run(1.5)
    expect(g.p.state.coats.dog).toBe('gluey')
    const copy = g.seen.find((e) => e.type === 'act' && e.copy)
    expect(copy && 'side' in copy ? copy.side : -1).toBe(1)
  })
  it.each([[0, 'quick'], [1, 'steady'], [0, 'slow']] as const)('waits as long as the pendulum says, either aunt leading (%s, %s)', (side, beat) => {
    const g = party()
    g.p.state.beat = beat
    let lead = -1, copy = -1
    g.p.down(1, toPoint(side, ON))
    for (let i = 0; i < 300; i++) {
      g.p.step(1 / 60)
      for (const e of g.p.take()) if (e.type === 'act') { if (e.copy) { if (copy < 0) copy = i / 60 } else if (lead < 0) lead = i / 60 }
    }
    expect(copy - lead).toBeGreaterThan(BEAT_SECONDS[beat] - 0.02)
    expect(copy - lead).toBeLessThan(BEAT_SECONDS[beat] + 0.15)
  })
  it.each([0, 1] as const)('copies each gesture as the same gesture (side %s)', (side) => {
    const cases = [['tip', [OVER]], ['dab', [ON]], ['show', [UP]], ['self', [FACE]]] as const
    for (const [act, path] of cases) {
      const g = party()
      g.tap(toPoint(side, path[0]))
      g.run(3)
      expect(g.acts(side)).toEqual([act])
      expect(g.acts(side === 0 ? 1 : 0)).toEqual([act])
    }
  })
  it.each([0, 1] as const)('reads a shaken hand as a wave on both sides (side %s)', (side) => {
    const g = party()
    g.drag([...Array(8)].map((_, i) => toPoint(side, { u: i % 2 ? 360 : 250, y: 500 })), 1, 0.13)
    g.run(3)
    expect(g.acts(side)).toContain('wave')
    expect(g.acts(side === 0 ? 1 : 0)).toContain('wave')
    const tapped = party()
    tapped.tap(toPoint(side, HOME))
    tapped.run(3)
    expect(tapped.acts(side)).toEqual(['wave'])
    expect(tapped.acts(side === 0 ? 1 : 0)).toEqual(['wave'])
  })
  it('does nothing on the way over a guest or on the way home', () => {
    const g = party()
    g.tap(toPoint(0, UP))
    g.run(4)
    expect(g.acts(0)).toEqual(['show'])
    expect(g.p.hands.every((h) => Math.hypot(h.u - HOME.u, h.y - HOME.y) < 6)).toBe(true)
  })
  it('uses the thing the copier holds when she gets there', () => {
    const g = party()
    g.p.state.beat = 'slow'
    g.tap(toPoint(0, OVER))
    g.run(0.3)
    g.tap(place(2), 2)
    g.run(3)
    const copy = g.seen.find((e) => e.type === 'act' && e.copy)
    expect(copy && 'thing' in copy && copy.thing).toBe('horn')
  })
})

describe('two children', () => {
  it('moves both hands for two fingers, and neither copies', () => {
    const g = party()
    g.p.down(1, toPoint(0, OVER))
    g.run(0.05)
    g.p.down(2, toPoint(1, UP))
    g.run(2)
    expect(new Set(g.acts(0))).toEqual(new Set(['tip']))
    expect(new Set(g.acts(1))).toEqual(new Set(['show']))
    expect(g.p.copier).toBeNull()
  })
  it('copies the one who still has a finger down when the other lets go', () => {
    const g = party()
    g.p.down(1, toPoint(0, OVER))
    g.p.down(2, toPoint(1, UP))
    g.run(0.6)
    g.p.up(2, toPoint(1, UP))
    g.run(1.2)
    g.p.move(1, toPoint(0, ON))
    g.run(2)
    expect(g.acts(1)).toContain('dab')
  })
  it('answers an extra finger and lets the working one carry on', () => {
    const g = party()
    g.p.down(1, toPoint(0, OVER))
    g.run(0.2)
    g.p.down(2, toPoint(0, ON))
    expect(g.p.take().some((e) => e.type === 'extra')).toBe(true)
    expect(g.p.holds(1)).toBe(true)
  })
  it('gives way from a finger that rests', () => {
    const g = party()
    g.p.down(1, toPoint(0, { u: 540, y: 660 }))
    g.run(1.3)
    g.p.down(2, toPoint(0, OVER))
    expect(g.p.holds(2)).toBe(true)
  })
})

describe('two children', () => {
  it('copies nothing when both let go, together or one after the other', () => {
    for (const gap of [0, 0.1, 0.5]) {
      const g = party()
      g.p.down(1, toPoint(0, OVER))
      g.p.down(2, toPoint(1, ON))
      g.run(0.6)
      g.p.up(1, toPoint(0, OVER))
      g.run(gap)
      g.p.up(2, toPoint(1, ON))
      g.run(3)
      expect([g.acts(0), g.acts(1)]).toEqual([['tip'], ['dab']])
      expect(g.p.touching).toBe(false)
    }
  })
  it('lets each carry a thing, and gives each where it was let go', () => {
    const g = party()
    g.p.down(1, place(0))
    g.p.move(1, toPoint(0, FACE))
    g.p.down(2, place(3))
    g.p.move(2, toPoint(1, FACE))
    const [a, b] = [g.p.state.table[0], g.p.state.table[3]]
    g.run(0.2)
    g.p.up(1, toPoint(0, FACE))
    g.run(0.5)
    expect(g.p.holds(2)).toBe(true)
    expect(g.p.state.held).toEqual([a, 'glue'])
    g.p.up(2, toPoint(1, FACE))
    g.run(0.5)
    expect(g.p.state.held).toEqual([a, b])
    expect(g.p.touching).toBe(false)
    g.tap(toPoint(0, OVER))
    expect(g.acts(0)).toBeDefined()
  })
  it('leaves the bell with the finger that has it, however still', () => {
    const g = party()
    g.p.state.coats.walrus = 'wet'
    g.p.down(1, { x: BELL.x - 10, y: BELL.y })
    g.p.move(1, { x: BELL.x, y: 500 })
    g.run(1.3)
    g.p.down(2, { x: BELL.x + 10, y: BELL.y })
    g.p.up(2, { x: BELL.x + 10, y: BELL.y })
    g.p.down(3, { x: 100, y: 700 })
    expect(g.p.scene).toBeNull()
    expect(g.p.holds(1)).toBe(true)
  })
})

describe('gestures after gestures', () => {
  it('does the dab of a drag that came through the place above', () => {
    const g = party()
    g.p.down(1, toPoint(0, OVER))
    g.run(0.22)
    g.p.move(1, toPoint(0, ON))
    g.run(3)
    expect(g.acts(0)).toEqual(['tip', 'dab'])
    expect(g.acts(1)).toEqual(['tip', 'dab'])
  })
  it('does not shake for a tap beside the hand, however long it lasts', () => {
    for (const held of [0.02, 0.1, 0.2]) {
      const g = party(), at = toPoint(0, { u: 200, y: 480 })
      g.p.down(1, at)
      g.run(held)
      g.p.up(1, at)
      g.run(2)
      expect(g.acts(0)).toEqual([])
    }
  })
  it('copies a movement once when the pendulum is changed in the middle of it', () => {
    for (const later of [0.3, 0.8, 1, 1.1, 1.4]) {
      const g = party()
      g.tap(toPoint(0, ON))
      g.run(later)
      g.tap(PENDULUM.bob)
      g.run(4)
      expect(g.acts(1)).toEqual(['dab'])
    }
  })
  it('does not move the copier for a cancelled finger', () => {
    const g = party()
    g.p.down(1, toPoint(0, OVER))
    g.run(0.3)
    g.p.cancel(1)
    for (let i = 0; i < 20; i++) {
      g.run(0.1)
      expect(Math.abs(g.p.hands[1].u - HOME.u)).toBeLessThan(2)
    }
  })
  it('does not end a scene of two by a meeting of hands that were down already', () => {
    const g = party()
    Object.assign(g.p.state.coats, { walrus: 'bubble', dog: 'gluey' })
    g.p.state.held = ['teapot', 'horn']
    g.p.state.table[g.p.state.table.indexOf('horn')] = 'glue'
    g.p.down(1, toPoint(0, MEETING))
    g.p.down(2, toPoint(1, ON))
    g.run(0.6)
    expect(g.p.scene?.kind).toBe('bubbles')
    g.p.move(2, toPoint(1, MEETING))
    g.run(0.6)
    expect(g.p.scene?.kind).toBe('bubbles')
  })
})

describe('trading', () => {
  it('trades hand to hand when one goes to the middle and the other follows, by drag or by tap', () => {
    for (const beat of ['quick', 'steady', 'slow'] as const) {
      const g = party()
      g.p.state.beat = beat
      g.tap(toPoint(0, MEETING))
      g.run(4)
      expect(g.p.state.held).toEqual(['glue', 'teapot'])
      expect(g.seen.filter((e) => e.type === 'scene')).toHaveLength(1)
    }
  })
  it('takes a tapped thing from the table, and another tap gives it back', () => {
    const g = party()
    g.tap(place(0))
    expect(g.p.state.held[0]).toBe('duster')
    expect(g.p.state.table[0]).toBe('teapot')
    g.tap(place(0))
    expect(g.p.state.held[0]).toBe('teapot')
  })
  it('gives a carried thing to the aunt it is let go on, across the room, over a lifted finger', () => {
    const g = party()
    g.drag([place(0), { x: 590, y: 600 }])
    g.run(0.15)
    g.p.down(3, { x: 600, y: 600 })
    g.p.move(3, toPoint(1, { u: 250, y: 420 }))
    g.p.up(3, toPoint(1, { u: 250, y: 420 }))
    g.run(0.5)
    expect(g.p.state.held[1]).toBe('duster')
    expect(g.p.state.table[0]).toBe('glue')
  })
  it('does not give a thing that only passed over, is let go elsewhere, or is taken away', () => {
    const g = party()
    g.drag([place(0), toPoint(0, { u: 250, y: 420 }), { x: 60, y: 760 }])
    g.run(0.5)
    expect(g.p.state.held[0]).toBe('teapot')
    g.p.down(1, place(0))
    g.p.move(1, toPoint(0, { u: 250, y: 420 }))
    g.p.cancel(1)
    g.run(0.5)
    expect(g.p.state.held[0]).toBe('teapot')
    g.p.down(1, place(0))
    g.p.move(1, toPoint(0, { u: 250, y: 420 }))
    g.p.clear()
    expect(g.p.state.held[0]).toBe('teapot')
  })
})

describe('the room', () => {
  it('changes a guest at the window, and back again', () => {
    const g = party()
    g.tap(PANES[0])
    expect(g.p.state.seated).toEqual(['goose', 'dog'])
    g.tap(PANES[0])
    expect(g.p.state.seated).toEqual(['walrus', 'dog'])
  })
  it('changes the wait at the pendulum', () => {
    const g = party()
    g.tap(PENDULUM.bob)
    expect(g.p.state.beat).toBe('steady')
  })
  it('tidies everything at the bell, saved at once', () => {
    const g = party()
    g.p.state.coats.pig = 'stiff'
    g.p.state.hair = ['gluey', 'wet']
    g.p.state.lips = [true, true]
    g.tap(BELL)
    expect(g.p.state.coats.pig).toBe('stiff')
    g.drag([BELL, { x: 590, y: 500 }])
    expect(Object.values(g.p.state.coats).every((c) => c === 'clean')).toBe(true)
    expect([g.p.state.hair, g.p.state.lips]).toEqual([['plain', 'plain'], [false, false]])
    expect(g.p.dirty).toBe(true)
    expect(g.p.scene?.kind).toBe('tidy')
  })
  it('keeps the bell away while there is nothing to tidy', () => {
    const g = party()
    g.drag([BELL, { x: 590, y: 500 }])
    expect(g.seen.some((e) => e.type === 'bell' || e.type === 'scene')).toBe(false)
  })
  it('claps on air when the copy comes to the middle and the leader has gone', () => {
    const g = party()
    g.p.state.beat = 'slow'
    g.drag([toPoint(0, HOME), toPoint(0, MEETING), toPoint(0, HOME)])
    g.run(3)
    expect(g.seen.filter((e) => e.type === 'miss')).toHaveLength(1)
    expect(g.p.state.held).toEqual(['teapot', 'glue'])
  })
  it.each([['feathered', 'gluey', 'duster', 'birds'], ['stiff', 'gluey', 'fan', 'statues'], ['bubble', 'gluey', 'horn', 'bubbles']] as const)('plays the scene of two guests alike (%s)', (coat, from, thing, kind) => {
    const g = party()
    g.p.state.coats.dog = coat
    g.p.state.coats.walrus = from
    const slot = g.p.state.table.indexOf(thing as never)
    g.p.state.table[slot] = 'teapot'
    g.p.state.held[0] = thing
    g.p.down(1, toPoint(0, thing === 'horn' ? ON : OVER))
    g.run(0.5)
    expect(g.p.scene?.kind).toBe(kind)
    if (kind === 'bubbles') expect(g.p.state.seated).toEqual(['dog', 'walrus'])
    g.p.down(2, toPoint(1, HOME))
    expect(g.p.scene).toBeNull()
  })
})

describe('found as left', () => {
  it('does not copy or do anything after a put-away', () => {
    const g = party()
    g.p.down(1, toPoint(0, OVER))
    g.run(0.3)
    g.p.clear()
    const before = serialize(g.p.state)
    g.seen.length = 0
    g.run(3)
    expect(serialize(g.p.state)).toEqual(before)
    expect(g.seen.filter((e) => e.type === 'act')).toEqual([])
  })
  it('never plays a cancelled movement in the copy', () => {
    const g = party()
    g.p.down(1, toPoint(0, OVER))
    g.run(0.05)
    g.p.cancel(1)
    g.run(3)
    expect(g.seen.filter((e) => e.type === 'act')).toEqual([])
  })
  it('keeps the six things and the four guests whatever is done', () => {
    const g = party()
    let s = 7
    const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
    for (let i = 0; i < 400; i++) {
      const at = { x: rnd() * 1180, y: rnd() * 820 }, id = 1 + Math.floor(rnd() * 3)
      const what = rnd()
      if (what < 0.4) g.p.down(id, at)
      else if (what < 0.7) g.p.move(id, at)
      else if (what < 0.93) g.p.up(id, at)
      else if (what < 0.97) g.p.cancel(id)
      else g.p.clear()
      g.run(rnd() * 0.3)
      const saved = JSON.parse(JSON.stringify(serialize(g.p.state)))
      expect(deserialize(saved)).toEqual(g.p.state)
    }
    for (const id of [1, 2, 3]) g.p.up(id, { x: 60, y: 60 })
    g.run(0.5)
    expect(g.p.touching).toBe(false)
  })
})

describe('the save', () => {
  it('round-trips, is small, and repairs damage group by group', () => {
    const state = freshState(5)
    state.coats.pig = 'bubble'
    expect(deserialize(JSON.parse(JSON.stringify(state)))).toEqual(state)
    expect(JSON.stringify(state).length).toBeLessThan(1000)
    const broken = { ...JSON.parse(JSON.stringify(state)), held: ['teapot', 'teapot'], hair: 3, beat: 'soon' }
    const back = deserialize(broken)
    expect(back.held).toEqual(['teapot', 'glue'])
    expect(back.coats.pig).toBe('bubble')
    for (const raw of [null, undefined, 3, 'x', [], {}, { v: 2 }]) expect(deserialize(raw).seated).toEqual(['walrus', 'dog'])
  })
  it('sets the first wait by age, with no gate and both ends open', () => {
    expect([null, 1, 3, 4, 5, 6, 12].map((age) => freshState(age).beat)).toEqual(['quick', 'quick', 'quick', 'steady', 'steady', 'slow', 'slow'])
    expect(deserialize({ v: 1, beat: 'quick' }, 7).beat).toBe('quick')
  })
})

it('has no place where two gestures mean the same spot', () => {
  expect([OVER, ON, UP, FACE, MEETING, HOME].map(zoneAt)).toEqual(['tip', 'dab', 'show', 'self', 'meet', null])
})
