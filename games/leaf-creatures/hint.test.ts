import { describe, expect, it } from 'vitest'
import { HEAPS } from './clearing'
import { MAX_CREATURES, MAX_LOOSE, TIERS } from './config'
import type { Guidance } from './guidance'
import { Painter } from './painter'
import { DT, RecordingPen, clearing, many, play, thing, toyOf } from './testing'
import type { Toy } from './toy'
import { GLOW_FROM, GLOW_TURN, drawFrame, hintAt } from './view'

// The idle ladder never points at an act that sends anything away. With as
// many creatures up as the clearing holds, one more waking sends the eldest
// off, so the glow and the ghost hand go to a creature that is there and
// never to the caps; with as many loose parts lying about as may, one more
// sends the oldest home, so they stay away.

const five = () => [0, 1, 2, 3, 4].map((i) => thing(i + 1, 380 + i * 100, 360 + (i % 2) * 120, ['twig', 'cap', 'cap'], i + 1))
const showing: Guidance = { glow: 1, demo: 0.4, demoIndex: 1 }

/** Where the glow and the ghost hand are drawn in a frame of this toy, or null for each that is not drawn. */
function drawn(toy: Toy): { glow: number[] | null; hand: number[] | null } {
  const pen = new RecordingPen()
  drawFrame(pen, toy, showing, TIERS[0], new Painter())
  const at = (key: string): number[] | null => { const line = pen.log.find((one) => one.startsWith(`|stamp|${key},`)); return line ? line.split('|')[2].split(',').slice(1, 3).map(Number) : null }
  return { glow: at('glow'), hand: at('hand') }
}

describe('the idle hint never points at an act that sends anything away', () => {
  it('points at the caps for a thing that wants its second eye while there is room for one more creature', () => {
    const toy = toyOf(clearing([...five().slice(0, 4), thing(20, 590, 300, ['round', 'cap'])]))
    expect(hintAt(toy, 0)).toBe(HEAPS.cap)
    expect(drawn(toy).glow?.[0]).toBe(HEAPS.cap.x)
  })

  it('with five creatures up, points at the creature woken last and never at the caps, whatever lies waiting for an eye; a tap there sends nobody off', () => {
    const toy = toyOf(clearing([...five(), thing(20, 590, 300, ['round', 'cap'])]))
    expect(toy.creatures).toHaveLength(MAX_CREATURES)
    const newest = toy.creatures.find((creature) => creature.thing.id === 5)!
    for (let demoIndex = 0; demoIndex < 8; demoIndex++) expect(hintAt(toy, demoIndex)).toBe(newest.thing)
    const { glow, hand } = drawn(toy)
    expect(glow?.[0]).toBe(newest.thing.x)
    expect(Math.abs(hand![0] - newest.thing.x)).toBeLessThan(10)
    // It goes with the creature as it walks.
    newest.rest = 0; newest.target = { x: 700, y: 300 }
    play(toy, 1)
    expect(drawn(toy).glow?.[0]).toBeCloseTo(newest.thing.x, 1)
    // A child who copies the hand pokes that creature: nobody walks off and nobody is lost.
    const at = hintAt(toy, 0)!
    toy.press(at.x, at.y); toy.tap()
    play(toy, 2)
    expect(toy.creatures.filter((creature) => !creature.leaving)).toHaveLength(MAX_CREATURES)
    expect(toy.away).toBeNull()
    expect(toy.things.find((one) => one.id === 20)?.awake).toBe(false)
  })

  it('points at a sleeper when all five sleep: a tap wakes it and sends nobody off', () => {
    const toy = toyOf(clearing(five().map((one) => ({ ...one, bedded: true }))))
    const at = hintAt(toy, 0)
    expect(at).toBe(toy.creatures.find((creature) => creature.thing.id === 5)!.thing)
  })

  it('stays away when as many loose parts lie about as may: one more would send the oldest home', () => {
    const loose = [0, 1, 2, 3].map((i) => thing(10 + i, 400 + i * 110, 300 + (i % 2) * 200, many('seed', MAX_LOOSE / 4)))
    const toy = toyOf(clearing(loose))
    for (let demoIndex = 0; demoIndex < 4; demoIndex++) expect(hintAt(toy, demoIndex)).toBeNull()
    expect(drawn(toy)).toEqual({ glow: null, hand: null })
    // One part fewer and it points at a heap again.
    const fewer = toyOf(clearing([...loose.slice(0, 3), thing(13, 730, 500, many('seed', MAX_LOOSE / 4 - 1))]))
    expect(hintAt(fewer, 0)).not.toBeNull()
    expect(drawn(fewer).glow).not.toBeNull()
    play(fewer, DT)
  })
})

describe('the glow never jumps across the frame at its full size', () => {
  /** One frame of this toy with this painter: where the glow is laid and how large. */
  const glowIn = (toy: Toy, painter: Painter, guidance: Guidance): { x: number; y: number; size: number } | null => {
    const pen = new RecordingPen()
    drawFrame(pen, toy, guidance, TIERS[0], painter)
    const line = pen.log.find((one) => one.startsWith('|stamp|glow,'))
    if (!line) return null
    const [x, y, , size] = line.split('|')[2].split(',').slice(1).map(Number)
    return { x, y, size }
  }
  /** The largest the glow is laid when it is drawn right in, or one frame out again: its breath makes it a little more or less. */
  const IN = (GLOW_FROM + (1 - GLOW_FROM) * (DT / GLOW_TURN)) * (1.22 + 0.07) + 0.01

  it('with nothing begun, draws back in under the willows before it grows out under the caps for the next showing, and the same going back', () => {
    const toy = toyOf(clearing([])), painter = new Painter()
    expect(hintAt(toy, -1)).toBe(HEAPS.willow)
    expect(hintAt(toy, 1)).toBe(HEAPS.cap)
    const between: Guidance = { glow: 1, demo: null, demoIndex: -1 }, showingCaps: Guidance = { glow: 1, demo: 0.05, demoIndex: 1 }
    let was = glowIn(toy, painter, between)!
    for (let f = 0; f < 30; f++) { toy.step(DT); was = glowIn(toy, painter, between)! }
    expect(was.x).toBe(HEAPS.willow.x)
    expect(was.size).toBeGreaterThan(1.1)
    for (const [guidance, heap] of [[showingCaps, HEAPS.cap], [between, HEAPS.willow]] as const) {
      let moved = 0, frames = 0, least = 9
      while (frames < 120 && !(was.x === heap.x && was.size > 1.1)) {
        toy.step(DT); frames++
        const now = glowIn(toy, painter, guidance)!
        // It goes from one heap to the other only in a frame in which it is drawn right in, before and after.
        if (now.x !== was.x) { moved++; expect(was.size).toBeLessThanOrEqual(IN); expect(now.size).toBeLessThanOrEqual(IN) }
        // And it shrinks and grows a little at a time, never in one step.
        expect(Math.abs(now.size - was.size)).toBeLessThan(0.08)
        least = Math.min(least, now.size)
        was = now
      }
      expect(moved).toBe(1)
      expect(was.x).toBe(heap.x)
      expect(was.size).toBeGreaterThan(1.1)
      // In and out again within about twice the turn.
      expect(frames * DT).toBeLessThan(GLOW_TURN * 2 + 0.2)
      expect(frames * DT).toBeGreaterThan(GLOW_TURN * 1.5)
    }
  })

  it('is whole in a first frame, goes along with a creature that walks without drawing in, and is gone at once at a touch', () => {
    const toy = toyOf(clearing(five())), painter = new Painter()
    const newest = toy.creatures.find((creature) => creature.thing.id === 5)!
    const idle: Guidance = { glow: 1, demo: null, demoIndex: -1 }
    const first = glowIn(toy, painter, idle)!
    expect(first.x).toBe(newest.thing.x)
    expect(first.size).toBeGreaterThan(1.1)
    newest.rest = 0; newest.target = { x: 760, y: 300 }
    const from = newest.thing.x
    for (let f = 0; f < 300; f++) {
      toy.step(DT)
      const now = glowIn(toy, painter, idle)!
      expect(now.x).toBeCloseTo(newest.thing.x, 1)
      expect(now.size).toBeGreaterThan(1.1)
    }
    expect(Math.abs(newest.thing.x - from)).toBeGreaterThan(60)
    // A touch takes the ladder back, and the glow with it: nothing is laid, and it comes again from under its heap.
    expect(glowIn(toy, painter, { glow: 0, demo: null, demoIndex: -1 })).toBeNull()
    toy.step(DT)
    expect(glowIn(toy, painter, { glow: 0.02, demo: null, demoIndex: -1 })!.size).toBeLessThanOrEqual(IN + 0.03)
  })
})

