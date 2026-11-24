import { describe, expect, it } from 'vitest'
import { BED, FIVE, R, SIDES, other, resting, sideOf, sideOfSheep, type Side } from './bed'
import { askers, hidden, makeGame, saveOf } from './game'
import { CRATE, DOG, HALF, MOUSE, QUILT, bottleAt } from './layout'
import { Play } from './play'
import { makeRng } from './rng'
import { firstSaved, type Saved } from './save'
import { voiceOfEvent, voiceOfPoke } from './voices'

const make = (over: Partial<Saved> = {}) => { const p = new Play(makeGame({ ...firstSaved(4, 9), shown: ['ridge', 'worn'], ...over })); p.advance(0.1, 0); return p }
let clock = 1000
const wait = (p: Play, s: number) => { for (let i = 0; i < s * 60; i++) { clock += 1000 / 60; p.advance(1 / 60, clock) } }
const tap = (p: Play, x: number, y: number, dx = 0) => { p.down(1, { x, y }, clock); if (dx) p.move(1, { x: x + dx, y }, clock); p.up(1, { x: x + dx, y }, (clock += 60)) }
const at = (p: Play, i: number) => ({ x: p.game.bed.sheep[i].x, y: p.game.bed.sheep[i].y })
const FREE: Partial<Saved> = { milk: null, finished: true }

describe('a finger on a sheep', () => {
  it('is answered as it lands, and sends it over on the lift, also when it slips', () => {
    for (const dx of [0, 10, 30]) for (let i = 0; i < FIVE; i++) {
      const p = make(FREE), was = sideOfSheep(p.game.bed, i)
      p.down(1, at(p, i), clock)
      expect(p.game.events.some((e) => e.type === 'squash' && e.who === i)).toBe(true)
      p.clear()
      p.game.events = []
      const q = make(FREE)
      tap(q, at(q, i).x, at(q, i).y, dx)
      wait(q, 3)
      expect(sideOfSheep(q.game.bed, i)).toBe(other(was))
    }
  })
  it('carries it, over the ridge and back, and lets a fling go where it leaves', () => {
    const p = make(FREE), i = 2
    const a = at(p, i), to = sideOf(a.x) === 'left' ? 900 : 400
    p.down(1, a, clock)
    for (let k = 1; k <= 20; k++) { p.move(1, { x: a.x + ((to - a.x) * k) / 20, y: a.y }, clock); wait(p, 0.03) }
    wait(p, 0.4)
    expect(sideOfSheep(p.game.bed, i)).not.toBe(sideOf(a.x))
    p.up(1, { x: to, y: a.y }, clock)
    expect(p.game.bed.held).toBe(null)
    wait(p, 4)
    expect(resting(p.game.bed)).toBe(true)
  })
  it('goes back over when the finger is taken away, and a save in hand is of where it came from', () => {
    const p = make(FREE), i = 2, a = at(p, i), home = sideOf(a.x), to = home === 'left' ? 900 : 400
    p.down(1, a, clock)
    for (let k = 1; k <= 20; k++) { p.move(1, { x: a.x + ((to - a.x) * k) / 20, y: a.y }, clock); wait(p, 0.03) }
    wait(p, 0.4)
    expect(saveOf(p.game).sides[i]).toBe(home)
    p.cancel(1)
    wait(p, 4)
    expect(sideOfSheep(p.game.bed, i)).toBe(home)
  })
  it('is not disturbed by a second finger, which is answered', () => {
    const p = make(FREE), a = at(p, 0)
    p.down(1, a, clock)
    p.pokes = []
    p.down(2, at(p, 1), clock + 20)
    expect(p.pokes).toHaveLength(1)
    p.up(2, at(p, 1), clock + 40)
    p.up(1, a, clock + 60)
    expect(p.game.bed.sheep[0].leap).not.toBe(null)
    expect(p.game.bed.sheep[1].leap).toBe(null)
  })
  it('hands over from a palm that rests', () => {
    const p = make(FREE)
    p.down(1, { x: 600, y: 810 }, clock)
    wait(p, 1.4)
    tap(p, 0, 0)
    p.down(2, at(p, 0), clock)
    p.up(2, at(p, 0), clock + 50)
    expect(p.game.bed.sheep[0].leap).not.toBe(null)
  })
})

describe('the rest of the bed', () => {
  it('deals milk from the dog and from the crate, also in the middle of an act', () => {
    for (const d of [DOG, CRATE]) {
      const p = make(FREE)
      tap(p, d.x, d.y)
      expect(p.game.save.milk).toHaveLength(FIVE)
    }
    const p = make(FREE)
    tap(p, at(p, 0).x, at(p, 0).y)
    wait(p, 3)
    expect(p.game.scene?.kind).toBe('act')
    tap(p, CRATE.x, CRATE.y)
    expect(p.game.scene?.kind).toBe('deal')
    expect(p.game.save.milk).toHaveLength(FIVE)
  })
  it('pulls the quilt up with a tap and takes it off with one, or with the hand', () => {
    for (const side of SIDES) {
      const p = make(FREE), x = HALF[side].mid
      tap(p, x, QUILT.roll + 30)
      expect(p.game.save.quilt).toBe(side)
      for (let i = 0; i < FIVE; i++) expect(hidden(p.game, i)).toBe(sideOfSheep(p.game.bed, i) === side)
      tap(p, HALF[other(side)].mid, QUILT.roll + 30)
      expect(p.game.save.quilt).toBe(other(side))
      tap(p, HALF[other(side)].mid, QUILT.hem + 20)
      expect(p.game.save.quilt).toBe(null)
      p.down(1, { x, y: QUILT.roll + 30 }, clock)
      for (let k = 1; k <= 10; k++) p.move(1, { x, y: QUILT.roll + 30 - k * 40 }, clock)
      p.up(1, { x, y: QUILT.roll - 370 }, clock + 300)
      expect(p.game.save.quilt).toBe(side)
      p.down(1, { x, y: QUILT.hem + 20 }, clock + 400)
      for (let k = 1; k <= 10; k++) p.move(1, { x, y: QUILT.hem + 20 + k * 40 }, clock)
      p.up(1, { x, y: QUILT.hem + 420 }, clock + 700)
      expect(p.game.save.quilt).toBe(null)
    }
  })
  it('shoves who is under it, and everybody stays in bed', () => {
    const p = make({ ...FREE, quilt: 'left' }), i = p.game.bed.sheep.findIndex((s) => sideOf(s.x) === 'left')
    const a = at(p, i)
    p.down(1, { x: a.x - 90, y: a.y }, clock)
    for (let k = 1; k <= 20; k++) { p.move(1, { x: a.x - 90 + k * 22, y: a.y }, clock); wait(p, 0.03) }
    p.up(1, { x: a.x + 350, y: a.y }, clock)
    wait(p, 4)
    for (const s of p.game.bed.sheep) { expect(s.x).toBeGreaterThan(BED.left + R - 1); expect(s.x).toBeLessThan(BED.right - R + 1) }
  })
  it('answers a finger on every thing with a sound', () => {
    const p = make({ quilt: 'left' })
    wait(p, 0.5)
    const spots = [at(p, 4), { x: 400, y: 450 }, { x: 400, y: QUILT.hem + 20 }, { x: 900, y: QUILT.roll + 30 }, bottleAt('left', 0, 2), DOG, CRATE, MOUSE, { x: BED.crest, y: 650 }, { x: 1080, y: 650 }, { x: 600, y: 790 }]
    const kinds = new Set<string>()
    for (const [i, s] of spots.entries()) for (const slide of [false, true]) {
      p.pokes = []
      p.game.events = []
      p.down(1, i === 4 ? { x: s.x, y: s.y - 40 } : s, clock)
      const poke = p.pokes[0]
      kinds.add(poke.thing.kind)
      const notes = [...voiceOfPoke({ ...poke, slide }, i), ...p.game.events.flatMap((e) => voiceOfEvent(e, i))]
      expect(notes.length).toBeGreaterThan(0)
      for (const n of notes) { expect(n.peak).toBeLessThanOrEqual(0.3); expect(n.frequency).toBeGreaterThan(30); expect(n.frequency).toBeLessThan(6000) }
      p.clear()
    }
    expect(kinds.size).toBeGreaterThanOrEqual(11)
  })
  it('plays every sound in range', () => {
    const p = make(FREE)
    for (let n = 0; n < 60; n++) {
      tap(p, at(p, n % FIVE).x, at(p, n % FIVE).y)
      wait(p, 7)
      for (const e of p.game.events.splice(0)) for (const x of voiceOfEvent(e, n)) { expect(x.peak).toBeGreaterThan(0); expect(x.peak).toBeLessThanOrEqual(0.3); expect(x.frequency).toBeGreaterThan(30); expect(x.frequency).toBeLessThan(6000) }
    }
  })
  it('never wedges under random fingers', () => {
    const rng = makeRng(3)
    for (const sides of [['left', 'left', 'left', 'left', 'left'], ['left', 'right', 'left', 'right', 'right']] as Side[][]) {
      const p = make({ sides })
      for (let i = 0; i < 900; i++) {
        const q = () => ({ x: rng.next() * 1180, y: rng.next() * 820 }), id = 1 + Math.floor(rng.next() * 3), k = rng.next()
        if (k < 0.4) p.down(id, q(), clock)
        else if (k < 0.7) p.move(id, q(), clock)
        else if (k < 0.92) p.up(id, q(), clock)
        else p.cancel(id)
        wait(p, 0.08)
        p.pokes = []; p.game.events = []
        expect(saveOf(p.game).sides).toHaveLength(FIVE)
      }
      p.clear()
      wait(p, 6)
      expect(resting(p.game.bed)).toBe(true)
      expect(p.game.bed.held ?? p.game.bed.hand).toBe(null)
      if (p.game.save.milk && p.game.scene === null) expect(askers(p.game).length).toBeGreaterThan(0)
    }
  })
})
