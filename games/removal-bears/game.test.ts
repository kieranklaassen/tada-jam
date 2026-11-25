import { describe, expect, it } from 'vitest'
import { held, place, size, swapped, type Cell, type Way } from './cells'
import { Finger } from './finger'
import { Game, type Target } from './game'
import { middleOf } from './houses'
import { ForgivingTouch } from './input'
import { CELLS, KINDS, type Kind } from './loads'
import { deserialize, freshSave, serialize, type Saved } from './save'
import { BEARS, SILL, VIEW, drawnAt } from './space'

// Played through fingers on a surface of 1180 by 820, by the same path as the
// Mount: pointers, the touch tracker, the finger, the game.

const W = 1180, H = 820, HALF = Math.max(VIEW.half, ((VIEW.high - VIEW.low) / 2) * (W / H)), UNIT = W / (2 * HALF), MID = (VIEW.low + VIEW.high) / 2
const toUV = (x: number, y: number): { u: number; v: number } => ({ u: x / UNIT - HALF, v: MID + (H / 2 - y) / UNIT })
const toXY = (u: number, v: number): { x: number; y: number } => ({ x: (u + HALF) * UNIT, y: H / 2 - (v - MID) * UNIT })

class Child {
  readonly touch = new ForgivingTouch()
  readonly finger = new Finger(this.touch)
  now = 1000
  saves: Saved[] = []
  constructor(readonly game: Game) { game.begin() }
  private act(g: ReturnType<ForgivingTouch['down']>): void { this.finger.act(this.game, g, toUV, W); this.keep() }
  private keep(): void { if (this.game.dirty) { this.game.dirty = null; this.saves.push(JSON.parse(JSON.stringify(serialize(this.game.toSave)))) } }
  wait(seconds: number, each?: () => void): void {
    for (let t = 0; t < seconds; t += 1 / 60) { this.now += 1000 / 60; this.act(this.touch.advance(this.now)); this.game.step(1 / 60); this.keep(); each?.() }
  }
  down(u: number, v: number, id = 1): void { this.act(this.touch.down(id, toXY(u, v), this.now)) }
  move(u: number, v: number, id = 1): void { this.act(this.touch.move(id, toXY(u, v))) }
  up(u: number, v: number, id = 1): void { this.act(this.touch.up(id, toXY(u, v), this.now)) }
  cancel(id = 1): void { this.act(this.touch.cancel(id)) }
  tapAt(u: number, v: number): void { this.down(u, v); this.now += 60; this.up(u, v) }
  at(target: Target): { u: number; v: number } {
    const g = this.game
    if (target.type === 'load') { const p = g.loadPose(g.hands)!; return drawnAt(p.x, p.y, p.z + 0.43) }
    if (target.type === 'bear') { const b = g.bearPose(target.who); return drawnAt(b.x, BEARS[target.who].height * 0.6, b.z + 0.6) }
    if (target.type === 'opening') { const o = g.saved.openings[target.i]; return drawnAt(middleOf(o), SILL + size(o.cells).h / 2, 0) }
    return drawnAt(g.cart.x, 1.6, 4.9)
  }
  tap(target: Target): void { const { u, v } = this.at(target); this.tapAt(u, v) }
  /** Until nothing is happening. */
  settle(): void { this.wait(0.05); for (let i = 0; i < 40 && (this.game.busy || this.game.wants.length); i++) this.wait(0.5) }
}

const RECT: Cell[] = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]
const way = (turn: number, back = false): Way => ({ turn, back })
function house(loads: [Kind, number, boolean?][], openings = [{ x: 0, cells: RECT }], more: Partial<Saved> = {}): Saved {
  return { ...freshSave(2, 5), openings, shown: true, shownEnds: true, loads: loads.map(([kind, turn, back], i) => ({ kind, way: way(turn, back), at: i === 0 ? 'hands' : 'cart', slot: 0 })), ...more }
}
const child = (s: Saved): Child => new Child(new Game(s))

describe('the toy', () => {
  it('counts every quick tap and comes round after four', () => {
    const c = child(house([['granny', 0], ['bath', 1], ['sofa', 1]]))
    for (let i = 0; i < 3; i++) c.tap({ type: 'load' })
    c.settle()
    expect(c.game.saved.loads[0].way).toEqual(way(3))
    c.tap({ type: 'load' })
    c.settle()
    expect(c.game.saved.loads[0].way).toEqual(way(0))
  })

  it('answers when the finger lands, before it lifts', () => {
    const c = child(house([['lamp', 0], ['bath', 1], ['sofa', 1]])), { u, v } = c.at({ type: 'load' })
    c.down(u, v)
    expect(c.game.cues.length).toBeGreaterThan(0)
    c.wait(0.06)
    expect(c.game.loadPose(0)!.sy).toBeLessThan(0.99)
  })

  it('a tap on a bear changes ends: the outline is mirrored and the bears trade sides', () => {
    const c = child(house([['piano', 1], ['bath', 1], ['sofa', 1]])), before = c.game.cells()
    c.tap({ type: 'bear', who: 0 })
    c.settle()
    expect(c.game.saved.loads[0].way).toEqual(swapped(way(1)))
    expect(c.game.saved.wideLeft).toBe(false)
    expect(c.game.bearPose(0).x).toBeGreaterThan(c.game.bearPose(1).x)
    expect(c.game.cells().map(([x, y]) => `${size(before).w - 1 - x},${y}`).sort()).toEqual(before.map(String).sort())
    c.tap({ type: 'bear', who: 1 })
    c.settle()
    expect(c.game.saved.loads[0].way).toEqual(way(1))
  })

  it('the load never turns to a place it does not end in: each act starts where the one before ended', () => {
    const c = child(house([['giraffe', 0], ['bath', 1], ['sofa', 1]]))
    for (const what of ['load', 'bear', 'load', 'load', 'bear', 'load'] as const) {
      const last = c.game.loadPose(0)!
      c.tap(what === 'load' ? { type: 'load' } : { type: 'bear', who: 1 })
      let was = last
      c.wait(1.6, () => {
        const p = c.game.loadPose(0)!, jump = Math.hypot(p.x - was.x, p.y - was.y)
        expect(jump).toBeLessThan(0.4)
        was = p
      })
      c.settle()
    }
  })
})

describe('the drag', () => {
  it('carries the bears along, survives a lifted finger, and leaves them there', () => {
    const c = child(house([['bath', 0], ['sofa', 1], ['lamp', 2]])), { u, v } = c.at({ type: 'load' })
    c.down(u, v); c.move(u - 1, v); c.wait(0.3); c.up(u - 1, v); c.wait(0.15)
    c.down(u - 1, v); c.move(u - 2.5, v); c.wait(0.6); c.up(u - 2.5, v); c.wait(0.6)
    expect(c.game.bearsX).toBeCloseTo(-2.5, 0)
    expect(c.game.saved.loads[0].at).toBe('hands')
    expect(c.saves.at(-1)!.x).toBeCloseTo(-2.5, 0)
  })

  it('let go over an opening heaves it there', () => {
    const c = child(house([['bath', 0], ['sofa', 1], ['lamp', 2]])), { u, v } = c.at({ type: 'load' })
    c.down(u, v)
    for (let k = 0; k <= 10; k++) { c.move(u, v + k * 0.5); c.wait(0.03) }
    c.up(u, v + 5)
    c.settle()
    expect(c.game.saved.loads[0].at).toBe('in')
  })

  it('a drag that is taken away puts the bears back', () => {
    const c = child(house([['bath', 0], ['sofa', 1], ['lamp', 2]])), { u, v } = c.at({ type: 'load' })
    c.down(u, v); c.move(u + 2, v); c.wait(0.4)
    c.cancel()
    c.wait(1)
    expect(c.game.bearsX).toBeCloseTo(0, 1)
    expect(c.game.saved.x).toBe(0)
  })

  it('a second finger moves nothing, and a resting one hands over', () => {
    const c = child(house([['bath', 0], ['sofa', 1], ['lamp', 2]])), bear = c.at({ type: 'bear', who: 0 }), load = c.at({ type: 'load' })
    c.down(bear.u, bear.v, 1)
    c.down(load.u, load.v, 2); c.up(load.u, load.v, 2)
    expect(c.game.saved.loads[0].way).toEqual(way(0))
    c.wait(1.2)
    c.down(load.u, load.v, 3); c.up(load.u, load.v, 3)
    c.settle()
    expect(c.game.saved.loads[0].way).toEqual(way(1))
    c.up(bear.u, bear.v, 1)
    c.settle()
    expect(c.game.saved.wideLeft).toBe(true)
  })
})

describe('the heave', () => {
  it('every load in every way goes in exactly when it fits, and otherwise comes back as it was', () => {
    for (const kind of KINDS) for (const back of [false, true]) for (let turn = 0; turn < 4; turn++) {
      const others = KINDS.filter((k) => k !== kind).slice(0, 2)
      const c = child(house([[kind, turn, back], [others[0], 0], [others[1], 0]])), fits = place(held(CELLS[kind], way(turn, back)), RECT).fits
      c.tap({ type: 'opening', i: 0 })
      c.settle()
      expect(c.game.saved.loads[0].at, `${kind} ${turn} ${back}`).toBe(fits ? 'in' : 'hands')
      expect(c.game.saved.loads[0].way).toEqual(way(turn, back))
      expect(c.game.saved.bumps).toBe(fits ? 0 : 1)
    }
  })

  it('dents exactly the cubes that were in the way, and presses the bear under them', () => {
    const c = child(house([['granny', 0], ['bath', 1], ['sofa', 1]]))
    // Upright she is three high: her head, on the left, is in the way.
    const put = place(c.game.cells(), RECT)
    let flat: [number, number] = [1, 1]
    const dented = new Set<string>()
    c.tap({ type: 'opening', i: 0 })
    c.wait(0.5)
    c.wait(3.6, () => { for (const key of c.game.dents.keys()) { if (Math.abs(c.game.dents.get(key)!.push) > 0.05) dented.add(key) } flat = [Math.min(flat[0], c.game.bearPose(0).squash), Math.min(flat[1], c.game.bearPose(1).squash)] })
    expect(put.blocked).toHaveLength(1)
    const [col, row] = [-1 + put.blocked[0][0], SILL + put.blocked[0][1]]
    expect([...dented]).toEqual([`${col},${row}`])
    expect(Math.min(...flat)).toBeLessThan(0.5)
    expect(Math.max(...flat)).toBeGreaterThan(0.7)
  })

  it('turns tapped while a load is in the air wait their turn', () => {
    const c = child(house([['sofa', 1], ['bath', 1], ['lamp', 1]]))
    c.tap({ type: 'opening', i: 0 })
    c.wait(0.3)
    c.game.tap({ type: 'load' })
    c.settle()
    expect(c.game.saved.loads[0].way).toEqual(way(2))
  })
})

describe('a whole house', () => {
  it('ends by itself only in its ending, and the next one comes on a touch of the cart and nothing else', () => {
    const c = child(house([['bath', 0], ['sofa', 0], ['lamp', 2]]))
    c.tap({ type: 'opening', i: 0 }); c.settle()
    expect(c.game.empty).toBe(true)
    c.wait(20)
    expect(c.game.empty).toBe(true)
    c.tap({ type: 'cart' }); c.settle()
    expect(c.game.saved.loads[1].at).toBe('hands')
    c.tap({ type: 'opening', i: 0 }); c.settle()
    c.wait(2)
    c.tap({ type: 'cart' }); c.wait(3); c.settle()
    c.tap({ type: 'opening', i: 0 })
    expect(c.saves.at(-1)!.finished === true || c.game.saved.finished === false).toBe(true)
    c.settle(); c.wait(10)
    expect(c.game.saved.finished).toBe(true)
    expect(c.game.saved.position).toBe('own-opening')
    expect(c.game.front).toBe(1)
    const openings = JSON.stringify(c.game.saved.openings)
    c.wait(30)
    for (const who of [0, 1] as const) c.tap({ type: 'bear', who })
    c.wait(2)
    expect(JSON.stringify(c.game.saved.openings)).toBe(openings)
    c.tap({ type: 'cart' }); c.wait(5)
    expect(c.game.saved.finished).toBe(false)
    expect(c.game.saved.openings).toHaveLength(2)
    expect(c.game.hands).toBe(0)
    expect(c.game.front).toBe(0)
  })

  it('put away at any moment, everything is there when it is opened again and nothing plays', () => {
    const c = child(house([['bath', 1], ['sofa', 0], ['lamp', 2]]))
    const kinds = (s: Saved): string => s.loads.map((l) => l.kind).join()
    let last = c.saves.at(-1)
    const check = (): void => {
      if (c.game.saved === (last as unknown)) return
      const back = deserialize(JSON.parse(JSON.stringify(serialize(c.game.toSave))), 4, 1), again = new Game(back)
      expect(again.act).toBeNull()
      expect(kinds(back).split(',')).toHaveLength(3)
      again.begin(); again.step(3)
      expect(again.act).toBeNull()
      expect(back.loads.filter((l) => l.at === 'hands').length).toBeLessThanOrEqual(1)
    }
    let n = 0
    const each = (): void => { if (++n % 7 === 0) check() }
    c.tap({ type: 'load' }); c.wait(1, each)
    c.tap({ type: 'opening', i: 0 }); c.wait(3.5, each)
    c.tap({ type: 'cart' }); c.wait(2, each)
    c.tap({ type: 'load' }); c.wait(0.3, each); c.tap({ type: 'opening', i: 0 }); c.wait(5, each)
    c.tap({ type: 'load' }); c.tap({ type: 'load' }); c.tap({ type: 'load' }); c.wait(3, each); c.tap({ type: 'opening', i: 0 }); c.wait(4, each)
    c.tap({ type: 'cart' }); c.wait(3, each); c.tap({ type: 'opening', i: 0 }); c.wait(4, each); c.wait(8, each)
    expect(c.game.saved.finished).toBe(true)
    c.tap({ type: 'cart' }); c.wait(5, each)
    expect(c.game.saved.finished).toBe(false)
  }, 30000)
})

describe('the first showing', () => {
  for (const age of [null, 2, 3, 4, 5, 9]) it(`is one whole round and leaves two loads to the child, at ${age}`, () => {
    for (let seed = 1; seed < 12; seed++) {
      const c = child(freshSave(age, seed))
      c.wait(1.4)
      const early = c.saves[0]
      expect(early.shown).toBe(true)
      expect(early.loads.map((l) => l.at)).toEqual(['in', 'cart', 'cart'])
      let bumped = false
      c.wait(22, () => { bumped ||= c.game.act?.kind === 'bump' })
      expect(bumped).toBe(true)
      expect(c.game.saved.loads.map((l) => l.at)).toEqual(['in', 'cart', 'cart'])
      expect(c.game.saved.bumps).toBe(0)
      expect(c.game.act).toBeNull()
      expect(c.game.saved.loads[0].way).toEqual(early.loads[0].way)
      expect(c.game.saved.wideLeft).toBe(early.wideLeft)
    }
  })

  it('a touch ends it with the load inside', () => {
    const c = child(freshSave(2, 3))
    c.wait(3)
    c.tapAt(-7, 8)
    expect(c.game.saved.loads[0].at).toBe('in')
    c.wait(3)
    expect(c.game.act).toBeNull()
  })

  it('at five the showing of changing ends comes with the second load', () => {
    const c = child(freshSave(5, 3))
    c.wait(24)
    expect(c.game.saved.shownEnds).toBe(false)
    c.tap({ type: 'cart' }); c.wait(1.2)
    const before = c.game.saved.loads.find((l) => l.at === 'hands')!.way
    c.wait(5)
    expect(c.game.saved.shownEnds).toBe(true)
    expect(c.game.act).toBeNull()
    expect(c.game.saved.loads.find((l) => l.at === 'hands')!.way).toEqual(before)
  })

  it('the showing of changing ends leaves everything as it was', () => {
    const s = { ...house([['piano', 0], ['bath', 0], ['sofa', 0]]), position: 'other-side', shownEnds: false }, c = child(s)
    c.wait(6)
    expect(c.game.saved.shownEnds).toBe(true)
    expect(c.game.saved.loads[0].way).toEqual(way(0))
    expect(c.game.saved.wideLeft).toBe(true)
  })
})

describe('put away in a showing or after odd touches', () => {
  it('what is stored is what is on the screen whenever nothing is happening', () => {
    let chance = 7
    const roll = (): number => { chance = (Math.imul(chance, 1664525) + 1013904223) >>> 0; return chance / 2 ** 32 }
    for (let run = 0; run < 30; run++) {
      const c = child({ ...freshSave([null, 3, 4, 5][run % 4], run + 1) })
      c.wait(roll() * 1.5)
      for (let n = 0; n < 60; n++) {
        const what = roll()
        if (what < 0.3) c.tap({ type: 'cart' })
        else if (what < 0.55 && c.game.hands >= 0) c.tap({ type: 'load' })
        else if (what < 0.65) c.tap({ type: 'bear', who: roll() < 0.5 ? 0 : 1 })
        else if (what < 0.8) c.tap({ type: 'opening', i: Math.floor(roll() * c.game.saved.openings.length) })
        else { const u = roll() * 14 - 7, v = roll() * 9 - 1; c.down(u, v); c.move(u + roll() * 4 - 2, v + roll() * 4); c.wait(roll()); if (roll() < 0.3) c.cancel(); else c.up(u, v) }
        c.wait(roll() * roll() * 4)
        if (roll() < 0.1) { c.game.rested(); c.wait(0.02) }
        expect(Number.isFinite(c.game.bearPose(0).x + c.game.bearPose(1).x + c.game.cart.x)).toBe(true)
      }
      c.settle(); c.wait(12)
      expect(c.game.act).toBeNull()
      const stored = c.saves.at(-1)
      if (stored) {
        expect(stored.loads).toEqual(serialize(c.game.saved).loads)
        expect(stored.wideLeft).toBe(c.game.saved.wideLeft)
        if (c.game.hands >= 0) expect(stored.x).toBeCloseTo(c.game.bearsX, 1)
      }
      // And the house can be finished from there.
      for (let n = 0; n < 60 && !c.game.saved.finished; n++) {
        if (c.game.empty) { c.tap({ type: 'cart' }); c.wait(3); continue }
        const into = c.game.saved.openings.findIndex((o) => place(c.game.cells(), o.cells).fits)
        if (into >= 0) c.tap({ type: 'opening', i: into })
        else if (n % 5 === 4) c.tap({ type: 'bear', who: 0 })
        else c.tap({ type: 'load' })
        c.settle()
      }
      expect(c.game.saved.finished).toBe(true)
    }
  }, 60000)

  it('a heave tapped twice with a turn between is made once and never walks for ever', () => {
    const c = child(house([['sofa', 1], ['bath', 1], ['lamp', 1]]))
    for (const what of ['load', 'opening', 'load', 'opening'] as const) c.tap(what === 'load' ? { type: 'load' } : { type: 'opening', i: 0 })
    c.settle()
    expect(c.game.act).toBeNull()
    expect(c.game.wants).toHaveLength(0)
  })

  it('the cart tapped during the last heave brings nothing', () => {
    const c = child(house([['bath', 0], ['sofa', 0], ['lamp', 2]]))
    for (let k = 0; k < 2; k++) { c.tap({ type: 'opening', i: 0 }); c.settle(); c.tap({ type: 'cart' }); c.wait(3) }
    c.tap({ type: 'opening', i: 0 }); c.wait(0.3); c.tap({ type: 'cart' })
    c.wait(25)
    expect(c.game.saved.finished).toBe(true)
  })
})

describe('what stands where', () => {
  it('a load in the hands and the bears stay clear of every opening, as drawn', () => {
    for (const kind of KINDS) for (let turn = 0; turn < 4; turn++) {
      const c = child(house([[kind, turn], ['bath', 0], ['sofa', 0]].slice(0, 1).concat(KINDS.filter((k) => k !== kind).slice(0, 2).map((k) => [k, 0])) as [Kind, number][])), p = c.game.loadPose(0)!, e = size(c.game.cells())
      expect(drawnAt(0, p.y + e.h / 2, p.z - 0.43).v).toBeLessThan(drawnAt(0, SILL, 0).v)
    }
    for (const b of BEARS) expect(drawnAt(0, b.height, 3).v).toBeLessThan(drawnAt(0, SILL, 0).v)
  })
})
