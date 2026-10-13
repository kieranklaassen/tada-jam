import { describe, expect, it } from 'vitest'
import { BEDS, CAST, HEAPS } from './clearing'
import { TIERS, type Tier } from './config'
import type { Guidance } from './guidance'
import type { Kind } from './parts'
import { MOST_WAIT, Painter } from './painter'
import { CountingPen, ROW, slotKey, spillOf } from './pen'
import { fresh } from './save'
import { fit } from './stage'
import { placed } from './things'
import { DT, clearing, many, tapHeap, thing, toyOf } from './testing'
import { MOST_LEAVING, Toy } from './toy'
import { drawFrame } from './view'

// The frame budget. The game is a 2D canvas, so what is counted is every
// stamp of a kept picture and every live stroke of a frame, those that go
// into the kept pictures included, by the same `drawFrame` the canvas uses,
// drawn with a pen that only counts. The jam's bar is under about 80.

/** No frame of the game may make this many stamps and strokes. */
const BAR = 80
/** The most that the fullest legal clearing has been counted to make in one frame. The test fails when a change raises it. */
const FULLEST = 68
/** The game's draw number: the most any frame has been counted to make, in any of the cases below: a part in the hand, a waking, the eyes coming off, a part lifted out of the middle, a seed with its fellows, five that stay with three on their way off, and five asleep. */
const MOST = 72
/** What making every kept picture of the fullest clearing takes, once, before the first frame: stamps into kept pictures only. */
const PRIMED = 180
/** The three surfaces the count is given for. The frame is drawn in stage units and fitted, so each gives the same count: the test draws at each to hold that. */
const SURFACES = [[1180, 820], [1024, 768], [820, 1180]] as const

const idle: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
const four: Kind[] = ['cap', 'cap', 'cap', 'cap']
/** Five creatures of fourteen parts and four caps each, every way of going among them, and twenty-four loose parts in four things that each want a second eye. */
function fullest(): Toy {
  const bodies: Kind[][] = [
    [...many('twig', 8), ...many('feather', 3), ...many('seed', 3)],
    [...many('maple', 8), ...many('willow', 3), ...many('round', 3)],
    [...many('willow', 8), ...many('twig', 6)],
    [...many('round', 8), ...many('feather', 6)],
    [...many('feather', 7), ...many('seed', 7)],
  ]
  const creatures = bodies.map((kinds, i) => thing(i + 1, 300 + i * 110, 300 + (i % 2) * 90, [...kinds, ...four], i + 1))
  const loose = [0, 1, 2, 3].map((i) => thing(10 + i, 400 + i * 120, 290 + ((i + 1) % 2) * 110, ['willow', 'twig', 'maple', 'round', 'seed', 'cap']))
  // And one more creature waits behind the trees, its eyes showing.
  const waiting = { side: -1 as const, thing: thing(40, -200, 300, ['twig', 'cap', 'cap'], 1) }
  const toy = toyOf(clearing([...creatures, ...loose], { acorns: [{ x: 300, y: 420, dug: true }, { x: 880, y: 420, dug: true }, { x: 590, y: 560, dug: true }], waiting }))
  toy.air.most = TIERS[0].leaves
  return toy
}

type Run = { most: number; live: number; /** What making the kept pictures took, before the first frame. */ primed: number; redrawn: Map<string, number>; surface: string[][]; painter: Painter }

/** Plays and draws `frames` frames, doing `each` before every one, and keeps the most any frame made. */
function run(toy: Toy, frames: number, tier: Tier, each: (f: number) => void = () => {}, guidance: Guidance | null = idle, dt = DT): Run {
  const pen = new CountingPen(), painter = new Painter()
  // As the Mount does: the kept pictures are made with the pen's own, before the first frame, and are no part of a frame.
  painter.prime(pen, toy, tier)
  const out: Run = { most: 0, live: 0, redrawn: new Map(), surface: [], painter, primed: pen.count }
  pen.reset()
  for (let f = 0; f < frames; f++) {
    each(f)
    toy.step(dt)
    pen.reset()
    drawFrame(pen, toy, guidance, tier, painter)
    out.most = Math.max(out.most, pen.count)
    out.live = Math.max(out.live, pen.count - pen.kept)
    for (const key of pen.begun) if (key !== 'laid' && key !== ROW) out.redrawn.set(key, (out.redrawn.get(key) ?? 0) + 1)
    out.surface.push(pen.keys.filter((key) => !key.startsWith('>')))
    expect(pen.unknown, `frame ${f}`).toEqual([])
    expect(pen.target, `frame ${f}`).toBeNull()
  }
  return out
}

/** Everything at once: a full sky, a gust every two seconds, a hat on the toad, and the idle guidance drawn as well. */
function storm(toy: Toy): (f: number) => void {
  return (f) => {
    while (toy.air.leaves.length < toy.air.most) toy.air.loosen(200 + toy.air.leaves.length * 90, 120, toy.airRng)
    if (f % 120 === 0) { toy.cast.breatheIn('big'); toy.cast.breatheIn('small') }
    if (!toy.cast.toad.hat) toy.cast.toad.hat = { kind: 'maple', look: 0, turn: 0, age: 0 }
  }
}

describe('frame budget', () => {
  it(`draws the fullest clearing with every creature travelling in at most ${FULLEST} stamps and strokes a frame, under the bar of ${BAR}, at 1180 by 820, 1024 by 768 and 820 by 1180`, () => {
    const counts = SURFACES.map(([width, height]) => {
      // What the surface changes is how the stage is fitted and how far the place is painted past it, never what a frame draws.
      const by = fit(width, height), spill = spillOf(by)
      expect(by.scale).toBeGreaterThan(0)
      expect(spill.x * by.scale).toBeGreaterThanOrEqual(by.x)
      expect(spill.y * by.scale).toBeGreaterThanOrEqual(by.y)
      const toy = fullest(), gusts = storm(toy)
      // A finger on the ground calls all five (set here as the toy keeps it, since no bare ground is left to press), so all five travel and are redrawn as often as the frame has room for.
      return run(toy, 600, TIERS[0], (f) => { gusts(f); toy.finger = { x: Math.floor(f / 180) % 2 === 0 ? 800 : 380, y: 430 } }).most
    })
    expect(counts[1]).toBe(counts[0])
    expect(counts[2]).toBe(counts[0])
    expect(counts[0]).toBeLessThan(BAR)
    expect(counts[0]).toBe(FULLEST)
  })

  it(`makes at most ${MOST} in any frame with a part in the hand as well, in the frames of a waking and of the eyes coming off, when a part is lifted out of the middle of everything, with three creatures on their way off at once, and with five asleep`, () => {
    const held = fullest(), gusts = storm(held)
    held.press(HEAPS.feather.x, HEAPS.feather.y)
    const inHand = run(held, 300, TIERS[0], (f) => { gusts(f); held.move(300 + f, 400) }).most
    expect(inHand).toBeLessThan(BAR)
    // A waking in a clearing that is otherwise as full as it may be.
    const waking = fullest()
    waking.things.splice(4, 1); waking.creatures.splice(4, 1)
    for (const creature of waking.creatures) creature.rest = 999
    const eyes = storm(waking)
    const atWaking = run(waking, 420, TIERS[0], (f) => { eyes(f); if (f === 30) tapHeap(waking, 'cap') }).most
    expect(atWaking).toBeLessThan(BAR)
    expect(waking.creatures).toHaveLength(5)
    // The eyes come off the largest creature: its parts fly home while every heap springs.
    const apart = fullest(), storming = storm(apart)
    const creature = apart.creatures[0], cap = () => creature.thing.parts.findIndex((part) => part.kind === 'cap')
    // It has two eyes and stands nearest the bottom of the page, so the finger finds it on top.
    creature.thing.parts.splice(cap(), 1); creature.thing.parts.splice(cap(), 1); creature.eyes = 2
    creature.thing.y = 500; creature.rest = 999
    const most = run(apart, 480, TIERS[0], (f) => {
      storming(f)
      if (f !== 10) return
      const at = placed(creature.thing, creature.thing.parts[cap()])
      apart.press(at.x, at.y)
      for (let k = 1; k <= 40 && apart.grip; k++) apart.move(at.x - k * 12, at.y - k * 12)
      expect(apart.sceneKind).toBe('eyes')
    }).most
    expect(most).toBeLessThan(BAR)
    // The one number: no frame of any of these, at any of the three sizes, makes more.
    // A part is lifted out of the middle of everything that lies loose, carried about and pressed on again.
    const dense = fullest(), blowing = storm(dense)
    for (const one of dense.creatures) one.rest = 999
    const from = placed(dense.things[6], dense.things[6].parts[2])
    const lifted = run(dense, 240, TIERS[0], (f) => {
      blowing(f)
      if (f === 20) { dense.press(from.x, from.y); expect(dense.hand?.from).not.toBeNull() }
      if (f > 20 && f < 80) dense.move(from.x + (f - 20) * 3, from.y - (f - 20) * 2)
      if (f === 80) dense.drop()
      if (f === 150) { dense.press(from.x + 20, from.y); dense.tap() }
    }).most
    // A seed lifted from its heap, with its two fellows rolling after it, and a finger's mark on the earth.
    const seeds = fullest(), wind = storm(seeds)
    const withFellows = run(seeds, 200, TIERS[0], (f) => {
      wind(f)
      if (f % 50 === 10) { seeds.cancel(); seeds.scuffs.push({ x: 600, y: 300, age: 0 }); seeds.press(HEAPS.seed.x, HEAPS.seed.y) }
      if (f % 50 > 10) seeds.move(HEAPS.seed.x + 40, HEAPS.seed.y - 120)
    }).most
    // Five that stay and three on their way off at once: three things wake one straight after another, and each sends the eldest off.
    const crowd = fullest(), gale = storm(crowd), begun = crowd.things.filter((one) => !one.awake)
    let leaving = 0
    const leavers = run(crowd, 420, TIERS[0], (f) => {
      gale(f)
      const next = [20, 32, 44].indexOf(f)
      if (next >= 0) { crowd.focus = begun[next]; tapHeap(crowd, 'cap') }
      leaving = Math.max(leaving, crowd.creatures.filter((creature) => creature.leaving).length)
    }).most
    expect(leaving).toBe(MOST_LEAVING)
    // Five asleep under the fern, behind the heaps, with a part in the hand over them.
    const beds = fullest(), breeze = storm(beds)
    beds.creatures.forEach((creature, i) => { creature.thing.bedded = true; creature.thing.x = BEDS[i].x; creature.thing.y = BEDS[i].y; creature.body.curl = 1 })
    beds.press(HEAPS.maple.x, HEAPS.maple.y)
    const asleep = run(beds, 200, TIERS[0], (f) => { breeze(f); beds.move(1000 + (f % 60), 560) }).most
    expect(Math.max(inHand, atWaking, most, lifted, withFellows, leavers, asleep)).toBeLessThanOrEqual(MOST)
  })

  it('never lets the picture of a travelling creature go stale: each is drawn again at least four times a second and none waits longer than an eighth of a second, even in the fullest clearing', () => {
    const toy = fullest(), gusts = storm(toy)
    const out = run(toy, 600, TIERS[0], (f) => { gusts(f); toy.finger = { x: Math.floor(f / 180) % 2 === 0 ? 800 : 380, y: 430 } })
    expect(out.redrawn.size).toBe(5)
    for (const [key, times] of out.redrawn) expect(times, key).toBeGreaterThan(40)
    // No picture stays behind its pose for longer than an eighth of a second.
    expect(out.painter.longestWait).toBeLessThanOrEqual(0.135)
  })

  it('counts that wait in seconds on the toy\'s clock, not in frames: at thirty frames a second and at a hundred and twenty a picture that finds no room waits the same tenth of a second, and then its turn', () => {
    for (const rate of [30, 120]) {
      const toy = fullest(), gusts = storm(toy), per = rate / 60
      const out = run(toy, 10 * rate, TIERS[0], (f) => { gusts(Math.floor(f / per)); toy.finger = { x: Math.floor(f / (3 * rate)) % 2 === 0 ? 800 : 380, y: 430 } }, idle, 1 / rate)
      expect(out.redrawn.size, `${rate}`).toBe(5)
      // Some picture found no room and waited its tenth of a second: counted in frames that would be a twentieth at this rate, or a fifth.
      expect(out.painter.longestWait, `${rate}`).toBeGreaterThan(MOST_WAIT)
      // Then one picture a frame goes past the room, so the last of five has four frames more to wait.
      expect(out.painter.longestWait, `${rate}`).toBeLessThanOrEqual(MOST_WAIT + 5 / rate + 0.001)
      expect(out.most, `${rate}`).toBeLessThanOrEqual(MOST)
    }
  })

  it('makes the kept pictures before the first frame and not in one: every creature is in the first frame from its own picture, and that frame is under the bar', () => {
    const toy = fullest()
    const pen = new CountingPen(), painter = new Painter()
    painter.prime(pen, toy, TIERS[0])
    // The one-off: the place with everything that lies still, and each creature's picture. It is made when the pictures are (a load, a put-away, a surface of another size), and is no frame.
    expect(pen.count).toBeLessThanOrEqual(PRIMED)
    expect(pen.kept).toBe(pen.count)
    for (const creature of toy.creatures) expect(painter.pictureOf(creature)).not.toBeNull()
    for (let f = 0; f < 15; f++) {
      toy.step(DT)
      pen.reset()
      drawFrame(pen, toy, null, TIERS[0], painter)
      expect(pen.count, `frame ${f}`).toBeLessThan(BAR)
      // Each of the five is laid down once, from its own picture, from the first frame on.
      for (let slot = 0; slot < 5; slot++) expect(pen.keys.filter((key) => key === slotKey(slot)), `frame ${f}`).toHaveLength(1)
    }
    // Take the priming out of the Mount's order and the first frame has to do it: a frame that primes is far over the bar.
    const late = new CountingPen()
    drawFrame(late, fullest(), null, TIERS[0], new Painter())
    expect(late.count).toBeGreaterThan(BAR)
  })

  it('makes one composite of the whole surface a frame and no more: the picture of the place, once', () => {
    const toy = fullest()
    const out = run(toy, 120, TIERS[0], storm(toy))
    for (const keys of out.surface) {
      expect(keys.filter((key) => key === 'laid')).toHaveLength(1)
      expect(keys).not.toContain('scenery')
      expect(keys[0]).toBe('laid')
    }
  })

  it('draws a first visit at rest in under 30', () => {
    const toy = new Toy(fresh(3, 1), 1)
    const out = run(toy, 240, TIERS[0], () => {}, null)
    expect(out.most).toBeLessThan(45)
    const pen = new CountingPen(), painter = new Painter()
    for (let f = 0; f < 5; f++) { pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter) }
    expect(pen.count).toBeLessThan(30)
  })

  it('asks no more of a weaker device: each tier down lets fewer leaves into the air and draws a gust with no more lines', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].leaves).toBeLessThan(TIERS[i - 1].leaves)
      expect(TIERS[i].gustLines).toBeLessThanOrEqual(TIERS[i - 1].gustLines)
      expect(TIERS[i].dpr).toBeLessThan(TIERS[i - 1].dpr)
    }
    const counts = TIERS.map((tier) => {
      const toy = fullest()
      toy.air.most = tier.leaves
      const gusts = storm(toy)
      return run(toy, 300, tier, gusts).live
    })
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
    expect(CAST.big.x).toBeLessThan(CAST.small.x)
  })
})
