import { describe, expect, it } from 'vitest'
import { ForgivingTouch, type Point } from './input'
import { ROPE, SHELF_ORDER, VESSELS, bodyMiddle, homeOf, onThing, slotOf } from './layout'
import { Play } from './play'
import { below, makeRng } from './rng'
import { deserialize, serialize } from './save'
import { PLACES, THINGS, thingOf, type Place, type ThingId } from './things'
import { WISHES, isMet } from './wishes'

// Played through the Mount's own path: pointers by id in stage units, and the
// seconds of each frame. Nothing is set by hand where play can reach it.

const FRAME = 1 / 60

class Hands {
  touch = new ForgivingTouch()
  ms = 0
  play: Play
  constructor(raw: unknown = null, age: number | null = null) { this.play = new Play(deserialize(raw, age), 9) }
  frames(n: number): this {
    for (let i = 0; i < n; i++) {
      this.ms += 1000 * FRAME
      this.play.act(this.touch.advance(this.ms))
      this.play.step(FRAME)
      check(this.play)
    }
    return this
  }
  down(at: Point, id = 1): this { this.play.act(this.touch.down(id, at, this.ms)); return this }
  move(at: Point, id = 1): this { this.play.act(this.touch.move(id, at)); return this }
  up(at: Point, id = 1): this {
    this.play.act(this.touch.up(id, at, this.ms))
    if (this.play.landsIn(at)) this.play.act(this.touch.letGo())
    return this
  }
  tap(at: Point): this { return this.down(at).frames(3).up(at).frames(2) }
  /** Somewhere a finger finds this thing. */
  where(id: ThingId): Point {
    const spot = this.play.spotOf(id), middle = bodyMiddle(id, spot)
    if (this.play.pick(middle) === id) return middle
    for (let y = spot.y - 290 * spot.s; y < spot.y; y += 5) for (let x = spot.x - 80; x < spot.x + 80; x += 6) if (this.play.pick({ x, y }) === id) return { x, y }
    return middle
  }
  carry(from: Point, to: Point): this {
    this.down(from).frames(2)
    for (let i = 1; i <= 8; i++) this.move({ x: from.x + ((to.x - from.x) * i) / 8, y: from.y + ((to.y - from.y) * i) / 8 }).frames(1)
    return this.up(to).frames(24)
  }
  put(id: ThingId, place: Place): this { return this.carry(this.where(id), over(place)) }
  settle(most = 60 * 60): this {
    for (let i = 0; i < most && (this.play.busy || i < 10); i++) this.frames(1)
    expect(this.play.busy).toBe(false)
    return this
  }
}

const over = (place: Place): Point => ({ x: VESSELS[place].x, y: VESSELS[place].rim - 30 })
const FLOOR: Point = { x: 520, y: 330 }

/** What must hold on every frame. */
function check(play: Play): void {
  for (const one of THINGS) {
    const spot = play.spotOf(one.id), now = play.shown[one.id]
    if (!Number.isFinite(spot.x + spot.y + spot.s)) throw new Error(`${one.id} is nowhere`)
    if (now.mode === 'butler' && play.errand.load[now.n] !== one.id) throw new Error(`${one.id} is in no hand`)
  }
  for (const id of play.errand.load) if (play.shown[id].mode !== 'butler') throw new Error(`he carries ${id}, which is elsewhere`)
}

function asSaved(play: Play): void {
  for (const one of THINGS) expect(play.shown[one.id]).toEqual({ mode: 'rest', where: play.house.at[one.id] })
  expect(play.errand.inside).toBe(play.house.butler)
}

describe('an idea', () => {
  it('a red sock in the soup: he carries in everything red, the king too, and stops', () => {
    const h = new Hands().put('red-sock', 'soup').settle()
    asSaved(h.play)
    expect(h.play.shown.king).toEqual({ mode: 'rest', where: 'soup' })
    expect(h.play.saved.dreaming).toBe(false)
  })
  it('is changed by a second thing while he is in the middle of the first', () => {
    const h = new Hands().put('red-sock', 'soup').frames(200).put('blue-sock', 'soup').settle()
    asSaved(h.play)
    expect(THINGS.filter((one) => h.play.house.at[one.id] === 'soup').map((one) => one.kind)).toEqual(['sock', 'sock', 'sock'])
  })
  it('everything takes him in as well, and the next act brings him out', () => {
    const h = new Hands().put('red-sock', 'bath').put('yellow-pot', 'bath').settle()
    expect(h.play.errand.inside).toBe('bath')
    asSaved(h.play)
    const gran = h.where('gran')
    h.carry(gran, FLOOR).settle()
    asSaved(h.play)
    expect(h.play.house.at.gran).toBe('home')
    expect(h.play.errand.inside).toBe('bath')
  })
  it('the king pulled out of the soup makes it socks', () => {
    const h = new Hands().put('red-sock', 'soup').settle()
    h.carry(h.where('king'), FLOOR).settle()
    expect(THINGS.filter((one) => h.play.house.at[one.id] === 'soup').map((one) => one.kind)).toEqual(['sock', 'sock', 'sock'])
    asSaved(h.play)
  })
  it('takes no longer than half a minute, even for the whole house', () => {
    const h = new Hands().put('red-sock', 'bed').put('yellow-pot', 'bed')
    h.settle(60 * 34)
  })
})

describe('the finger', () => {
  it('a tap gives nothing away: whatever is tapped, nothing moves house', () => {
    const h = new Hands()
    const before = JSON.stringify(serialize(h.play.saved))
    for (let x = 40; x < 1180; x += 70) for (let y = 120; y < 800; y += 70) h.tap({ x, y })
    expect(JSON.stringify(serialize(h.play.saved))).toBe(before)
  })
  it('a lift of a moment is not a let-go', () => {
    const h = new Hands()
    const at = h.where('red-sock')
    h.down(at).frames(1).move({ x: at.x, y: 500 }).frames(1).up({ x: at.x, y: 500 }).frames(8)
    expect(h.play.holding).toBe('red-sock')
    h.down({ x: at.x + 20, y: 510 }, 2).move(over('soup'), 2).frames(2).up(over('soup'), 2).frames(30)
    expect(h.play.house.at['red-sock']).toBe('soup')
  })
  it('a palm takes nothing from the finger', () => {
    const h = new Hands()
    const at = h.where('red-sock')
    h.down(at).move({ x: at.x, y: 500 }).frames(1).down({ x: 700, y: 700 }, 5).frames(3)
    expect(h.play.holding).toBe('red-sock')
  })
  it('a cancel and a put-away put it back, and say nothing to the butler', () => {
    for (const end of ['cancel', 'clear'] as const) {
      const h = new Hands()
      const at = h.where('red-sock')
      h.down(at).move(over('soup')).frames(3)
      h.play.act(end === 'cancel' ? h.touch.cancel(1) : h.touch.clear())
      h.settle()
      expect(h.play.shown['red-sock']).toEqual({ mode: 'rest', where: 'home' })
      expect(h.play.saved.begun).toBe(false)
    }
  })
  it('a thing let go on nobody flies home, on somebody is worn and then goes home', () => {
    const h = new Hands().carry(new Hands().where('blue-hat'), FLOOR)
    h.settle()
    h.carry(h.where('blue-hat'), bodyMiddle('king', homeOf('king')))
    expect(h.play.shown['blue-hat'].mode).toBe('worn')
    h.frames(200)
    expect(h.play.shown['blue-hat']).toEqual({ mode: 'rest', where: 'home' })
    expect(h.play.saved.begun).toBe(false)
  })
  it('a person at home is too heavy', () => {
    const h = new Hands()
    h.carry(h.where('king'), over('soup')).settle()
    expect(h.play.house.at.king).toBe('home')
  })
  it('back into the place it was lifted from says nothing', () => {
    const h = new Hands().put('red-sock', 'soup').settle()
    const before = h.play.house
    h.carry(h.where('king'), { x: VESSELS.soup.x - 40, y: VESSELS.soup.rim - 60 }).settle()
    expect(h.play.house).toBe(before)
  })
  it('a thing can be taken out of his hands', () => {
    const h = new Hands().put('red-sock', 'soup')
    for (let i = 0; i < 1200 && h.play.errand.load.length === 0; i++) h.frames(1)
    const id = h.play.errand.load[0]
    h.carry(h.where(id), over('bath')).settle()
    expect(h.play.house.at[id]).toBe('bath')
    asSaved(h.play)
  })
  it('only a pull rings the bell, and then everything is home', () => {
    const h = new Hands().put('red-sock', 'bath').put('yellow-pot', 'bath').settle()
    const at = { x: ROPE.x, y: ROPE.y }
    h.tap(at)
    expect(h.play.house.at.king).toBe('bath')
    h.carry(at, { x: at.x, y: at.y + 90 }).settle()
    asSaved(h.play)
    expect(THINGS.every((one) => h.play.house.at[one.id] === 'home')).toBe(true)
  })
})

describe('the wish', () => {
  it('is there from the start, is met, and the next waits for a poke, in a tidy house', () => {
    const h = new Hands()
    expect(h.play.dreaming).toBe(true)
    h.put('yellow-hat', 'bed').settle()
    expect(h.play.dreaming).toBe(true)
    expect(WISHES[h.play.saved.wish].id).toBe('king-soup')
    h.put('red-hat', 'soup')
    for (let i = 0; i < 3000 && h.play.scene === null; i++) h.frames(1)
    expect(h.play.scene).not.toBeNull()
    expect(h.play.saved.dreaming).toBe(false)
    h.tap({ x: 620, y: 420 })
    expect(h.play.scene).toBeNull()
    h.frames(600)
    expect(h.play.dreaming).toBe(false)
    h.tap(h.where('gran')).frames(200)
    expect(THINGS.every((one) => h.play.house.at[one.id] === 'home')).toBe(true)
    expect(h.play.dreaming).toBe(true)
    expect(isMet(WISHES[h.play.saved.wish], h.play.house)).toBe(false)
  })
  it('put away after the drop and before he has done it: found done, and nothing replays', () => {
    const h = new Hands().put('yellow-hat', 'bed').settle()
    h.put('red-hat', 'soup').frames(20)
    const again = new Hands(JSON.parse(JSON.stringify(serialize(h.play.saved))))
    asSaved(again.play)
    again.frames(300)
    expect(again.play.scene).toBeNull()
    expect(again.play.saved.dreaming).toBe(false)
  })
})

describe('nothing is in one place with another', () => {
  it('at home and in each place every thing has a spot of its own that a finger can find', () => {
    for (const where of ['home', ...PLACES] as const) {
      const spots = THINGS.map((one) => ({ id: one.id, spot: where === 'home' ? homeOf(one.id) : slotOf(one.id, where) }))
      for (const a of spots) for (const b of spots) if (a.id < b.id && (where === 'home' || (thingOf(a.id).heavy === thingOf(b.id).heavy))) {
        const apart = Math.hypot(bodyMiddle(a.id, a.spot).x - bodyMiddle(b.id, b.spot).x, bodyMiddle(a.id, a.spot).y - bodyMiddle(b.id, b.spot).y)
        expect(apart, `${a.id} and ${b.id} at ${where}`).toBeGreaterThan(where === 'home' ? 96 : 24)
      }
    }
  })
  it('a full place still shows every face, and each can be pulled out', () => {
    for (const place of PLACES) {
      const h = new Hands().put('red-sock', place).put('yellow-pot', place).settle()
      const found = new Set<ThingId>()
      for (let x = VESSELS[place].x - 200; x < VESSELS[place].x + 200; x += 6) for (let y = 380; y < VESSELS[place].rim + 34; y += 6) {
        const id = h.play.pick({ x, y })
        if (id) found.add(id)
      }
      expect(THINGS.map((one) => one.id).filter((id) => !found.has(id)), place).toEqual([])
    }
  })
  it('the shelf mixes colours and kinds, and the places stand apart', () => {
    for (let i = 1; i < SHELF_ORDER.length; i++) {
      const [a, b] = [SHELF_ORDER[i - 1], SHELF_ORDER[i]].map((id) => id.split('-'))
      expect(a[0]).not.toBe(b[0])
      expect(a[1]).not.toBe(b[1])
    }
    expect(VESSELS.bed.x + VESSELS.bed.half).toBeLessThan(VESSELS.soup.x - VESSELS.soup.half)
    expect(VESSELS.soup.x + VESSELS.soup.half).toBeLessThan(VESSELS.bath.x - VESSELS.bath.half)
    for (const one of THINGS) expect(onThing(one.id, homeOf(one.id), { x: ROPE.x, y: ROPE.y })).toBe(false)
  })
})

describe('any play', () => {
  it('settles as saved, opens as left, and never breaks', { timeout: 60000 }, () => {
    const rng = makeRng(41)
    for (let run = 0; run < 14; run++) {
      const h = new Hands()
      for (let i = 0; i < 14; i++) {
        const at = { x: below(rng, 1180), y: 90 + below(rng, 720) }, to = { x: below(rng, 1180), y: 90 + below(rng, 720) }
        const id = THINGS[below(rng, THINGS.length)].id
        if (rng.next() < 0.6) h.carry(h.where(id), rng.next() < 0.7 ? over(PLACES[below(rng, 3)]) : to)
        else if (rng.next() < 0.5) h.carry(at, to)
        else h.tap(at)
        h.frames(below(rng, 240))
        const stored = JSON.parse(JSON.stringify(serialize(h.play.saved)))
        const again = new Play(deserialize(stored, null), 2)
        asSaved(again)
      }
      h.settle()
      asSaved(h.play)
    }
  })
})


describe('what the review found', () => {
  it('the ghost hand followed meets every dream, one after the other, for ever', { timeout: 60000 }, () => {
    const h = new Hands()
    for (let wish = 0; wish <= WISHES.length; wish++) {
      const was = h.play.saved.wish
      for (let n = 0; n < 8 && h.play.saved.dreaming; n++) {
        const move = h.play.demo()!
        expect(move, WISHES[was].id).not.toBeNull()
        h.carry(move.from, move.to)
        h.frames(60 * 30)
      }
      expect(h.play.saved.dreaming, WISHES[was].id).toBe(false)
      expect(h.play.demo()!.what).toBe('gran')
      h.tap(h.where('gran')).frames(240)
      expect(h.play.dreaming).toBe(true)
    }
  })
  it('what the child takes out of his hands is told to him', () => {
    const h = new Hands()
    h.carry(h.where('red-sock'), over('soup'))
    for (let i = 0; i < 900 && h.play.shown.king.mode !== 'butler'; i++) h.frames(1)
    expect(h.play.shown.king.mode).toBe('butler')
    const king = h.where('king')
    h.down(king).frames(1).move({ x: 560, y: 480 }).frames(2).move({ x: 700, y: 480 }).up({ x: 700, y: 480 }).frames(900)
    expect(h.play.house.at.king).toBe('home')
    expect(h.play.shown.king).toMatchObject({ mode: 'rest', where: 'home' })
  })
})
