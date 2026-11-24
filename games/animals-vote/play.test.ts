import { describe, expect, it } from 'vitest'
import { hintFor } from './guide'
import type { Point } from './input'
import { BASKET, BELL, COLX, MOLE, PLAQUE, SNACK_HOME, SPOTS, cellAt, plaqueAt, snackAt } from './layout'
import { Play, RESULT } from './play'
import { deserialize, serialize } from './save'
import type { Animal } from './things'
import { columnOf, freshTown, here, onGround, type Town } from './town'

// The path the Mount takes: the same calls, with no browser.

class Child {
  now = 0
  readonly play: Play
  constructor(town: Town = freshTown(null)) { this.play = new Play(town) }
  get town() { return this.play.town }
  run(seconds: number): void { for (let t = 0; t < seconds - 1e-9; t += 1 / 60) { this.now += 1000 / 60; this.play.advance(1 / 60, this.now) } }
  tap(at: Point, id = 1): void { this.play.down(id, at, this.now); this.run(0.05); this.play.up(id, at, this.now) }
  drag(from: Point, to: Point, id = 1): void { this.play.down(id, from, this.now); for (let k = 1; k <= 6; k++) this.play.move(id, { x: from.x + ((to.x - from.x) * k) / 6, y: from.y + ((to.y - from.y) * k) / 6 }); this.play.up(id, to, this.now); this.run(0.4) }
}
const body = (who: Animal): Point => ({ x: SPOTS[who].x, y: SPOTS[who].y - SPOTS[who].h * 0.4 })
const six = (): Town => deserialize({ v: 1, position: 'both-at-once', count: 6, ballot: ['fly', 'sleep', null], columns: [[], [], []] }, null)

describe('play', () => {
  it('answers as the finger lands and acts on the lift', () => {
    const c = new Child()
    c.play.down(1, body('pig'), 0)
    expect(c.play.pokes).toHaveLength(1)
    expect(columnOf(c.town, 'pig')).toBe(-1)
    c.play.up(1, body('pig'), 60)
    expect(columnOf(c.town, 'pig')).toBe(1)
  })
  it('takes a tap that slips for a tap, and carries on after a lift', () => {
    const c = new Child()
    c.drag(body('pig'), { x: body('pig').x + 30, y: body('pig').y + 20 })
    expect(columnOf(c.town, 'pig')).toBe(1)
    const d = new Child()
    const to = cellAt(0, 0)
    d.play.down(1, body('mouse'), 0); d.play.move(1, { x: 330, y: 600 }); d.play.up(1, { x: 330, y: 600 }, 20)
    d.play.down(2, { x: 335, y: 600 }, 120); d.play.move(2, to); d.play.up(2, to, 200)
    d.run(0.5)
    expect(columnOf(d.town, 'mouse')).toBe(0)
  })
  it('can do the whole first vote by taps, and meets the first wish', () => {
    const c = new Child()
    for (const who of here(c.town)) { c.tap(body(who)); c.run(0.6) }
    c.tap(BELL)
    expect(c.town.finished).toBe(true)
    expect(c.play.show!.result).toMatchObject({ won: ['mud'], met: true, ran: [] })
    c.run(c.play.show!.end + 0.1)
    expect(c.play.show).toBeNull()
    c.tap(BELL)
    expect(c.town).toMatchObject({ finished: false, count: 5, ballot: ['dance', 'sleep', null] })
    expect(hintFor(c.play, 0)!.on).toBe('pig')
  })
  it('a touch ends what is shown and does nothing more', () => {
    const c = new Child()
    c.tap(BELL)
    c.run(1)
    const was = serialize(c.town)
    c.tap(body('pig'))
    expect(c.play.show).toBeNull()
    expect(serialize(c.town)).toEqual(was)
    c.tap(BELL); c.run(2)
    c.drag(body('cat'), cellAt(1, 0))
    expect(c.play.held).toBeNull()
  })
  it('keeps the vote when the wish is still open, shows the changing move, and takes one change', () => {
    const c = new Child(freshTown(6))
    for (const who of here(c.town)) c.tap(body(who))
    c.tap(BELL)
    expect(c.play.unmet).toBe(true)
    c.run(20)
    c.tap(BELL)
    expect(onGround(c.town)).toHaveLength(0)
    const hint = hintFor(c.play, 0)!
    expect(hint.to).not.toBeNull()
    c.drag(hint.from, hint.to!)
    c.tap(BELL)
    expect(c.play.show!.result).toMatchObject({ won: ['sleep'], met: true })
  })
  it('hides one, baits, feeds, turns and opens, each by one touch', () => {
    const c = new Child(six())
    c.drag(body('pig'), { x: BASKET.x, y: BASKET.y - 30 })
    expect(c.town.hidden).toBe('pig')
    c.tap({ x: BASKET.x, y: BASKET.y - 60 })
    expect(c.town.hidden).toBeNull()
    c.drag(SNACK_HOME.cheese, plaqueAt(0))
    expect(c.town.columns[0]).toEqual(['mouse', 'cat', 'pig'])
    c.tap(snackAt('cheese', 0))
    expect(c.town.snacks.cheese).toBe(1)
    c.drag(SNACK_HOME.bun, body('elephant'))
    expect(c.play.events.at(-1)).toMatchObject({ type: 'eat', who: 'elephant' })
    c.drag(SNACK_HOME.bun, MOLE)
    expect(c.play.cues.some((q) => q.type === 'mole')).toBe(true)
    c.tap(plaqueAt(2))
    expect(c.town.ballot[2]).not.toBeNull()
    c.tap(plaqueAt(0))
    expect(c.town.ballot[0]).not.toBe('fly')
  })
  it('offers no basket, snack or third picture before the sixth animal', () => {
    const c = new Child()
    c.tap(SNACK_HOME.bun); c.tap(plaqueAt(2)); c.drag(body('pig'), { x: BASKET.x, y: BASKET.y - 20 })
    expect(c.town.snacks.bun).toBeNull()
    expect(c.town.ballot[2]).toBeNull()
    expect(c.town.hidden).toBeNull()
  })
  it('puts back what it carried when the finger is taken or the game is parked', () => {
    for (const end of ['cancel', 'clear'] as const) {
      const c = new Child()
      c.tap(body('pig'))
      const was = serialize(c.town)
      c.play.down(1, cellAt(1, 0), c.now); c.play.move(1, { x: 300, y: 300 })
      expect(c.play.held).not.toBeNull()
      if (end === 'cancel') c.play.cancel(1); else c.play.clear()
      expect(c.play.held).toBeNull()
      expect(serialize(c.town)).toEqual(was)
    }
  })
  it('answers a second finger and lets a resting one hand over', () => {
    const c = new Child()
    c.play.down(1, body('pig'), 0)
    c.play.down(2, body('cat'), 100)
    expect(c.play.pokes).toHaveLength(2)
    c.play.up(2, body('cat'), 150)
    expect(columnOf(c.town, 'cat')).toBe(-1)
    c.play.down(3, body('cat'), 1500); c.play.up(3, body('cat'), 1560)
    expect(columnOf(c.town, 'cat')).toBeGreaterThanOrEqual(0)
  })
  it('is found as left at any instant, with nothing playing', () => {
    const c = new Child()
    let seed = 7
    const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const spots = [BELL, MOLE, body('pig'), body('elephant'), body('goat'), body('giraffe'), plaqueAt(0), plaqueAt(2), SNACK_HOME.bun, SNACK_HOME.cheese, cellAt(0, 0), cellAt(1, 1), { x: COLX[2], y: PLAQUE.y }, { x: BASKET.x, y: BASKET.y - 20 }, { x: 590, y: 350 }]
    for (let i = 0; i < 3000; i++) {
      const at = spots[Math.floor(next() * spots.length)]
      if (next() < 0.4) c.drag(at, spots[Math.floor(next() * spots.length)]); else c.tap(at)
      if (next() < 0.3) c.run(next() * RESULT)
      const saved = JSON.parse(JSON.stringify(serialize(c.town)))
      const again = deserialize(saved, null)
      expect(serialize(again)).toEqual(saved)
      expect(new Play(again).show).toBeNull()
      c.play.events = []; c.play.cues = []; c.play.pokes = []
    }
  })
})
