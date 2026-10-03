import { describe, expect, it } from 'vitest'
import { placeAt } from './places'
import { Toybox, type ToyEvent } from './toybox'
import type { Toy } from './toys'
import { STACK_MOST, count } from './tray'

const small: Toy = { colour: 'red', kind: 'duck', size: 'small' }
const big: Toy = { colour: 'blue', kind: 'rocket', size: 'big' }

/** Taps a place: the finger lands and lifts at once, and the toy plays on until everything has settled. */
function tap(box: Toybox, place: number, seconds = 2.5): ToyEvent[] {
  const at = placeAt(place)
  box.point(at.x, at.z)
  box.lift()
  box.advance(seconds)
  return box.takeEvents()
}
const kinds = (events: ToyEvent[]) => events.map((event) => event.type).filter((type) => type !== 'tick' && type !== 'ratchet')

describe('the toy', () => {
  it('always closes on the toy it is put on, and lifts it', () => {
    const box = new Toybox([{ toy: small, place: 2 }])
    const events = tap(box, 2)
    expect(kinds(events)).toEqual(['chirp', 'clack', 'pop'])
    expect(box.held?.key).toBe(0)
    expect(box.held!.y).toBeGreaterThan(4)
    expect(count(box.tray)).toBe(0)
  })

  it('closes on a toy when the finger is only near it', () => {
    const box = new Toybox([{ toy: small, place: 2 }])
    const at = placeAt(2)
    box.point(at.x + 3.5, at.z - 2); box.lift(); box.advance(2.5)
    expect(box.held?.key).toBe(0)
  })

  it('lands on the same thing whatever the swing is when the finger lifts', () => {
    const outcome = (swing: number) => {
      const box = new Toybox([{ toy: small, place: 2 }, { toy: big, place: 7 }])
      const grab = placeAt(2), drop = placeAt(6)
      box.point(grab.x, grab.z)
      box.claw.swingX = swing; box.claw.swingVZ = swing * 8
      box.lift(); box.advance(2.5)
      const held = box.held?.key
      box.point(drop.x, drop.z)
      box.advance(0.4)
      box.claw.swingX = -swing; box.claw.swingZ = swing; box.claw.swingVX = swing * 12
      box.lift(); box.advance(2.5)
      return { held, tray: box.tray.map((stack) => stack.slice()), place: box.pieces[0].place }
    }
    const still = outcome(0)
    expect(still.held).toBe(0)
    expect(still.place).toBe(6)
    for (const swing of [0.2, -0.45, 0.69]) expect(outcome(swing)).toEqual(still)
  })

  it('pops a toy off a stack a step higher, and what is left settles', () => {
    const box = new Toybox([{ toy: small, place: 2 }, { toy: big, place: 3 }])
    tap(box, 2); tap(box, 3)
    const events = tap(box, 3)
    expect(events.find((event) => event.type === 'pop')).toEqual({ type: 'pop', heavy: 1, level: 1 })
    expect(kinds(events)).toEqual(['chirp', 'clack', 'pop', 'settle'])
  })

  it('rings the tray when there is nothing under it, with a note for the column, and hops the toys', () => {
    const box = new Toybox([{ toy: small, place: 0 }])
    const at = placeAt(4)
    box.point(at.x, at.z); box.lift()
    let highest = 0
    const events: ToyEvent[] = []
    for (let i = 0; i < 250; i++) { box.advance(0.01); highest = Math.max(highest, box.pieces[0].hop); events.push(...box.takeEvents()) }
    expect(kinds(events)).toEqual(['chirp', 'clack', 'bonk', 'bite'])
    expect(events.find((event) => event.type === 'bonk')).toEqual({ type: 'bonk', column: 4 })
    expect(highest).toBeGreaterThan(0.05)
    expect(box.pieces[0].hop).toBe(0)
  })

  it('lets a toy go onto the studs of the place it is over', () => {
    const box = new Toybox([{ toy: small, place: 2 }])
    tap(box, 2)
    const events = tap(box, 8)
    expect(kinds(events)).toEqual(['chirp', 'let-go', 'click'])
    const piece = box.pieces[0], at = placeAt(8)
    expect(piece.state).toBe('standing')
    expect([piece.x, piece.z]).toEqual([at.x, at.z])
    expect(box.tray[8]).toEqual([0])
    expect(box.held).toBeNull()
  })

  it('stands a toy on another, and takes the top one back off', () => {
    const box = new Toybox([{ toy: small, place: 2 }, { toy: big, place: 3 }])
    tap(box, 2)
    const events = tap(box, 3)
    expect(events.find((event) => event.type === 'click')).toEqual({ type: 'click', heavy: 1, level: 1 })
    expect(box.tray[3]).toEqual([1, 0])
    expect(box.pieces[0].y).toBeCloseTo(box.pieces[1].y + box.pieces[1].height, 5)
    tap(box, 3)
    expect(box.held?.key).toBe(0)
    expect(box.tray[3]).toEqual([1])
  })

  it('bounces a toy off a stack of three onto the nearest place with room', () => {
    const load = [0, 1, 2, 3].map((place) => ({ toy: small, place }))
    const box = new Toybox(load)
    for (const from of [1, 2]) { tap(box, from); tap(box, 0) }
    expect(box.tray[0].length).toBe(STACK_MOST)
    tap(box, 3)
    const events = tap(box, 0)
    expect(kinds(events)).toEqual(['chirp', 'let-go', 'boing', 'click'])
    expect(box.tray[0].length).toBe(STACK_MOST)
    expect(box.pieces[3].state).toBe('standing')
    expect(box.pieces[3].place).not.toBe(0)
  })

  it('never loses a toy and never leaves two on the same studs, whatever is tapped', () => {
    const box = new Toybox([0, 2, 4, 5, 7, 9].map((place, i) => ({ toy: i % 2 ? big : small, place })))
    // A fixed scatter of taps, some landing while the claw is still busy.
    let s = 12345
    for (let i = 0; i < 120; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      tap(box, s % 10, 0.2 + ((s >> 8) % 12) / 10)
    }
    box.advance(4)
    expect(count(box.tray) + (box.held ? 1 : 0)).toBe(6)
    for (const piece of box.pieces) {
      expect(piece.state === 'held').toBe(piece === box.held)
      if (piece.state !== 'standing') continue
      const level = box.tray[piece.place].indexOf(piece.key)
      expect(level).toBeGreaterThanOrEqual(0)
      expect(piece.y).toBeCloseTo(box.stackTop(piece.place, piece.key), 5)
      expect(Number.isFinite(piece.x + piece.y + piece.z)).toBe(true)
    }
    for (const stack of box.tray) expect(stack.length).toBeLessThanOrEqual(STACK_MOST)
  })

  it('rides the claw high enough to carry a toy over what stands near', () => {
    const box = new Toybox([{ toy: small, place: 0 }, { toy: big, place: 2 }])
    tap(box, 0)
    const from = placeAt(0), to = placeAt(4)
    let lowestGap = Infinity
    for (let i = 0; i <= 200; i++) {
      box.point(from.x + ((to.x - from.x) * i) / 200, from.z)
      box.advance(0.012)
      const held = box.held!
      // Its base against the top of the tall toy it passes over.
      if (Math.abs(held.x - placeAt(2).x) < 3.2) lowestGap = Math.min(lowestGap, held.y - box.stackTop(2))
    }
    expect(lowestGap).toBeGreaterThan(0.3)
  })

  it('plays the same taps the same way every time', () => {
    const play = () => {
      const box = new Toybox([{ toy: small, place: 2 }, { toy: big, place: 3 }])
      const events = [...tap(box, 2, 0.7), ...tap(box, 3, 0.4), ...tap(box, 6, 1.1)]
      return { events, pieces: box.pieces, claw: box.claw }
    }
    expect(play()).toEqual(play())
  })
})
