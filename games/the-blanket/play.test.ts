import { describe, expect, it } from 'vitest'
import { BASKET, BELL, FISH, HOOK, PLACES, SEATS, SITTERS, SPOTS, dropAt, sausageAt, spotAt, standAt, thingAt, type Spot, headSpot } from './layout'
import { freshWorld, inBasket, quiet, sausageSpot } from './model'
import { Play } from './play'
import type { Point } from './input'

let t = 0
const tap = (p: Play, at: Point, id = 1) => { p.down(id, at, (t += 50)); p.up(id, at, (t += 50)) }
const drag = (p: Play, a: Point, b: Point, end: 'up' | 'cancel' | 'hold' | 'clear' = 'up') => {
  p.down(1, a, (t += 50))
  for (let i = 1; i <= 8; i++) p.move(1, { x: a.x + (b.x - a.x) * i / 8, y: a.y + (b.y - a.y) * i / 8 })
  if (end === 'up') { p.up(1, b, (t += 50)); p.advance(0, (t += 400)) }
  if (end === 'cancel') p.cancel(1)
  if (end === 'clear') p.clear()
}
const body = (who: 'dog' | 'cat' | 'aunt' | 'grandpa') => ({ x: SEATS[who].x, y: SEATS[who].y - 60 })
const rest = (p: Play) => { for (let i = 0; i < 2000 && !quiet(p.world); i++) p.advance(1 / 60, (t += 17)) }

describe('the finger', () => {
  it('plays the whole trick with taps', () => {
    const p = new Play(freshWorld())
    tap(p, body('dog')); tap(p, SPOTS.teapot.at)
    expect(sausageSpot(p.world)).toBe('teapot')
    tap(p, body('dog'))
    expect(p.world.sitters.dog.target).toBe('dish')
    rest(p)
    expect(p.world.sitters.dog.phase).toBe('seat')
    tap(p, BELL); rest(p)
    expect(sausageSpot(p.world)).toBe('hook')
    tap(p, HOOK)
    expect(sausageSpot(p.world)).toBe('dish')
  })

  it('covers as the finger lands', () => {
    const p = new Play(freshWorld())
    p.down(1, body('cat'), 1)
    expect(p.world.sitters.cat.covered).toBe(true)
  })

  it('a slipped tap is a tap', () => {
    const p = new Play(freshWorld())
    p.down(1, SPOTS.boot.at, 1); p.move(1, { x: SPOTS.boot.at.x + 10, y: SPOTS.boot.at.y }); p.up(1, SPOTS.boot.at, 60)
    expect(sausageSpot(p.world)).toBe('boot')
  })

  it('carries the sausage into every place and onto a covered head', () => {
    for (const id of PLACES) {
      const p = new Play(freshWorld())
      drag(p, SPOTS.dish.at, SPOTS[id].at)
      expect(sausageSpot(p.world)).toBe(id)
    }
    const p = new Play(freshWorld())
    tap(p, body('aunt')); drag(p, SPOTS.dish.at, SEATS.aunt.head)
    expect(sausageSpot(p.world)).toBe('head:aunt')
  })

  it('a carry survives a lifted finger', () => {
    const p = new Play(freshWorld())
    drag(p, SPOTS.dish.at, { x: 450, y: 690 }, 'hold')
    p.up(1, { x: 450, y: 690 }, (t += 50)); p.advance(0, (t += 100))
    expect(p.world.held).not.toBe(null)
    p.down(2, { x: 460, y: 690 }, (t += 50)); p.move(2, SPOTS.boot.at); p.up(2, SPOTS.boot.at, (t += 50)); p.advance(0, (t += 400))
    expect(sausageSpot(p.world)).toBe('boot')
  })

  it('a finger taken away puts everything back', () => {
    for (const end of ['cancel', 'clear'] as const) {
      const p = new Play(freshWorld())
      drag(p, SPOTS.dish.at, SPOTS.boot.at, end)
      expect(sausageSpot(p.world)).toBe('dish')
      tap(p, body('dog')); drag(p, body('dog'), { x: 600, y: 650 }, end); rest(p)
      expect(p.world.sitters.dog.covered).toBe(true)
      drag(p, BASKET, SEATS.cat.head, end)
      expect(p.world.sitters.cat.covered).toBe(false)
      expect(inBasket(p.world)).toBe(3)
    }
  })

  it('a blanket is carried from the basket, and from one head to another', () => {
    const p = new Play(freshWorld())
    drag(p, BASKET, body('dog'))
    expect(p.world.sitters.dog.covered).toBe(true)
    drag(p, body('dog'), body('grandpa'))
    expect(p.world.sitters.grandpa.covered).toBe(true)
    expect(p.world.sitters.dog.phase).toBe('wind')
  })

  it('a blanket fits places and the bowl, and a tap takes it off', () => {
    const p = new Play(freshWorld())
    drag(p, BASKET, SPOTS.boot.at); drag(p, BASKET, FISH)
    expect(p.world.draped).toEqual(['boot', 'fish'])
    tap(p, SPOTS.boot.at); tap(p, FISH)
    expect(p.world.draped).toEqual([])
    expect(sausageSpot(p.world)).toBe('dish')
  })

  it('a palm neither acts nor stops the working finger, and a resting one hands over', () => {
    const p = new Play(freshWorld())
    drag(p, SPOTS.dish.at, { x: 450, y: 690 }, 'hold')
    p.down(2, body('cat'), (t += 10))
    expect(p.world.sitters.cat.covered).toBe(false)
    expect(p.pokes.length).toBeGreaterThan(1)
    p.move(1, SPOTS.boot.at); p.up(1, SPOTS.boot.at, (t += 10)); p.advance(0, (t += 400))
    expect(sausageSpot(p.world)).toBe('boot')
    const q = new Play(freshWorld())
    q.down(1, { x: 1150, y: 800 }, (t += 10)); tap(q, body('cat'), 2)
    expect(q.world.sitters.cat.covered).toBe(true)
  })

  it('somebody out of its seat is covered where it runs', () => {
    const p = new Play(freshWorld())
    tap(p, body('aunt')); tap(p, body('aunt'))
    for (let i = 0; i < 70; i++) p.advance(1 / 60, (t += 17))
    const at = p.world.sitters.aunt.at
    expect(at.x).not.toBe(SEATS.aunt.x)
    tap(p, { x: at.x, y: at.y - 90 })
    expect(p.world.sitters.aunt.covered).toBe(true)
  })

  it('every press is answered by a poke', () => {
    const p = new Play(freshWorld())
    for (const at of [{ x: 10, y: 10 }, BASKET, HOOK, FISH, BELL]) { const n = p.pokes.length; p.down(1, at, (t += 10)); p.up(1, at, (t += 10)); expect(p.pokes.length).toBe(n + 1) }
  })
})

describe('the room', () => {
  it('no two targets cover each other', () => {
    const at: [string, Point, number][] = [...PLACES.map((id): [string, Point, number] => [id, SPOTS[id].at, SPOTS[id].r]), ['bell', BELL, 60], ['hook', HOOK, 60], ['fish', FISH, 66], ['basket', BASKET, 72]]
    for (let i = 0; i < at.length; i++) for (let j = 0; j < i; j++) {
      const d = Math.hypot(at[i][1].x - at[j][1].x, at[i][1].y - at[j][1].y)
      expect(d, `${at[i][0]} ${at[j][0]}`).toBeGreaterThan(at[i][2] + at[j][2])
    }
    for (const [name, p, r] of at) for (const who of SITTERS) {
      const s = SEATS[who]
      const dx = Math.max(0, Math.abs(p.x - s.x) - s.bodyW / 2), dy = Math.max(0, s.top.y - 30 - p.y, p.y - s.y - 10)
      expect(Math.hypot(dx, dy), `${name} ${who}`).toBeGreaterThan(r * 0.5)
    }
    for (const [, p] of at) expect(p.y).toBeLessThan(770)
  })

  it('every target answers at its middle, with the sausage in any place', () => {
    for (const id of PLACES) {
      expect(thingAt(SPOTS[id].at, null)).toEqual({ kind: 'place', id })
      expect(dropAt(SPOTS[id].at)).toEqual({ kind: 'place', id })
      for (const other of PLACES) if (other !== id) expect(thingAt(SPOTS[id].at, sausageAt(other)).kind).toBe('place')
    }
    for (const who of SITTERS) expect(thingAt(SEATS[who].head, null)).toEqual({ kind: 'sitter', who })
  })

  it('from every seat the places and the string lie in clearly different directions', () => {
    for (const who of SITTERS) {
      const spots: Spot[] = [...PLACES, 'hook']
      const angles = spots.map((s) => Math.atan2(spotAt(s).y - SEATS[who].head.y, spotAt(s).x - SEATS[who].head.x))
      for (let i = 0; i < spots.length; i++) for (let j = 0; j < i; j++) {
        const d = Math.abs(Math.atan2(Math.sin(angles[i] - angles[j]), Math.cos(angles[i] - angles[j]))) * 180 / Math.PI
        expect(d, `${who}: ${spots[i]} ${spots[j]}`).toBeGreaterThan(9)
      }
    }
  })

  it('hunters at one spot stand apart and on the stage', () => {
    for (const spot of [...PLACES, 'hook', ...SITTERS.map(headSpot)] as Spot[]) {
      const at = [0, 1, 2].map((i) => standAt(spot, i))
      for (const p of at) { expect(p.x).toBeGreaterThan(40); expect(p.x).toBeLessThan(1140) }
    }
  })
})
