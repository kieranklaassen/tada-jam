import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { fits } from './layouts'
import { MAX_MARKS, MAX_POINTS } from './marks'
import { BESIDE, THROUGH, clearance, judge, makeMark, showFirst, type Told } from './play'
import { between, makeRng, pick } from './rng'
import { noFeels, type RiderKind } from './tastes'
import { MAX_RIDERS, NONE, SEATS, busyPlaces, freshWorld, inFlower, railAt, waitsAhead, wearsTuft, wetStretches, type Rider, type World } from './world'
import { DANDELION, ENGINE_START, PLACES, PUDDLE, TAR, distance, type PlaceId, type Pt } from './yard'

const line = (from: Pt, to: Pt, steps = 40): Pt[] => Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }))
const zigzag = (from: Pt, points = 5, pitch = 60, height = 110): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < points; i++) out.push(...line({ x: from.x + i * pitch, y: from.y + (i % 2 ? -height : 0) }, { x: from.x + (i + 1) * pitch, y: from.y + (i % 2 ? 0 : -height) }, 8))
  return out
}
const scribble = (c: Pt): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < 10; i++) out.push(...line({ x: c.x - 40 + i * 8, y: c.y + (i % 2 ? 35 : -35) }, { x: c.x - 32 + i * 8, y: c.y + (i % 2 ? -35 : 35) }, 6))
  return out
}
const ring = (c: Pt, r: number): Pt[] => Array.from({ length: 61 }, (_, i) => ({ x: c.x + Math.cos((i / 60) * Math.PI * 1.97) * r, y: c.y + Math.sin((i / 60) * Math.PI * 1.97) * r }))
const told = <K extends Told['what']>(list: Told[], what: K) => list.filter((t): t is Extract<Told, { what: K }> => t.what === what)
const trainAt = (w: World): Pt => ({ x: w.train.x, y: w.train.y })
const inPlay = (w: World): Rider => w.riders.find((r) => r.at === 'stop' || r.at === 'train')!
/** A world with one chosen rider waiting beside the train and its home across the tar. */
const withRider = (kind: RiderKind, home: PlaceId = 'mid-4', position = 'long-way'): World => ({
  ...freshWorld(null, 3), position, riders: [{ kind, stop: 'mid-2', home, at: 'stop', chalk: 0, tar: 0, felt: noFeels() }],
})
/**
 * Takes everyone in play home: whoever is aboard first, then whoever still waits. A straight line to where the
 * train is wanted; and where a figure in the way stops the train, a line off to one side first, as a child would
 * go round.
 */
const takeHome = (w: World): { world: World; told: Told[] } => {
  let world = w
  const all: Told[] = []
  const rng = makeRng(17)
  for (let guard = 0; guard < 60 && !world.finished; guard++) {
    const r = world.riders.find((x) => x.at === 'train') ?? world.riders.find((x) => x.at === 'stop')!
    const from = trainAt(world), to = r.at === 'train' ? railAt(r.home) : railAt(r.stop)
    let made = makeMark(world, line(from, to))
    if (distance(trainAt(made.world), from) < 20 && made.world.riders.find((x) => x.kind === r.kind)!.at === r.at) {
      made = makeMark(world, line(from, { x: between(rng, 150, 1050), y: between(rng, 200, 700) }))
    }
    world = made.world
    all.push(...made.told)
  }
  return { world, told: all }
}

describe('a first visit', () => {
  it('starts where the age says, with the youngest start for no age', () => {
    expect(freshWorld(null, 1).position).toBe('short-hop')
    expect(freshWorld(1, 1).position).toBe('short-hop')
    expect(freshWorld(2, 1).position).toBe('short-hop')
    expect(freshWorld(3, 1).position).toBe('long-way')
    expect(freshWorld(4, 1).position).toBe('up-and-down')
    expect(freshWorld(11, 1).position).toBe('up-and-down')
  })

  it('has the engine on its stub of rail and one rider waiting, laid out as the position sets', () => {
    for (let seed = 1; seed <= 30; seed++) for (const age of [null, 3, 4]) {
      const w = freshWorld(age, seed)
      // The first home lies ahead of the engine.
      expect(PLACES[w.riders[0].home].x).toBeGreaterThanOrEqual(ENGINE_START.x + 200)
      expect(w.riders.length).toBe(1)
      expect(w.riders[0].at).toBe('stop')
      expect(fits(w.position, PLACES[w.riders[0].stop], PLACES[w.riders[0].home], ENGINE_START)).toBe(true)
      expect(w.marks.length).toBe(1)
      expect(w.finished).toBe(false)
    }
    expect(freshWorld(null, 5)).toEqual(freshWorld(null, 5))
  })
})

describe('making a mark', () => {
  it('begins the cycle on the first touch: the rider beside the train climbs aboard and the next one is drawn in', () => {
    const w = freshWorld(null, 2)
    // A tap right by the train, so that nothing but the beginning happens.
    const made = makeMark(w, [{ x: w.train.x + 20, y: w.train.y + 4 }])
    expect(told(made.told, 'began').length).toBe(1)
    expect(told(made.told, 'boarded')[0]).toMatchObject({ walked: true, rider: w.riders[0].kind })
    expect(made.world.riders.filter((r) => r.at === 'next').length).toBe(1)
    expect(new Set(made.world.riders.map((r) => r.kind)).size).toBe(made.world.riders.length)
    // A second mark does not begin anything again.
    expect(told(makeMark(made.world, [{ x: w.train.x + 40, y: w.train.y + 4 }]).told, 'began').length).toBe(0)
  })

  it('takes the rider home along a line: a cycle that goes well moves the position one step up', () => {
    const w = withRider('frog')
    const made = makeMark(w, line(trainAt(w), railAt('mid-4')))
    expect(told(made.told, 'home')[0]).toMatchObject({ rider: 'frog' })
    expect(told(made.told, 'cycle')[0].outcome).toBe('well')
    expect(made.world.finished).toBe(true)
    expect(made.world.position).toBe('up-and-down')
    expect(made.world.riders.find((r) => r.kind === 'frog')!.at).toBe('home')
    // The train stops short of the home, nose at its edge.
    // Beside the home, and not in it.
    expect(clearance(['mid-4'], trainAt(made.world))).toBeLessThanOrEqual(BESIDE)
    expect(clearance(['mid-4'], trainAt(made.world))).toBeGreaterThanOrEqual(0)
  })

  it('rides however much of a line exists: a line that stops short leaves the gap in plain view, and the state stays', () => {
    const w = withRider('frog')
    const short = makeMark(w, line(trainAt(w), { x: 600, y: 462 }))
    const stop = told(short.told, 'stopped')[0]
    expect(stop.why).toBe('end')
    expect(stop.shortBy[0].rider).toBe('frog')
    expect(stop.shortBy[0].gap).toBeGreaterThan(200)
    expect(short.world.finished).toBe(false)
    expect(short.world.riders.find((r) => r.kind === 'frog')!.at).toBe('train')
    expect(Math.abs(short.world.train.x - 600)).toBeLessThan(14)
    // The child adds one mark; the first is still there, and the rider gets home.
    const more = makeMark(short.world, line(trainAt(short.world), railAt('mid-4')))
    expect(more.world.marks.length).toBe(short.world.marks.length + 1)
    expect(more.world.marks.slice(0, short.world.marks.length)).toEqual(short.world.marks)
    expect(more.world.finished).toBe(true)
  })

  it('bumps across a gap between two marks, exactly where the gap is', () => {
    const w = withRider('snail')
    const first = makeMark(w, line(trainAt(w), { x: 600, y: 462 }))
    const second = makeMark(first.world, line({ x: 760, y: 462 }, railAt('mid-4')))
    const route = told(second.told, 'route')[0].route
    expect(route.legs.map((l) => l.on)).toEqual(['tar', 'chalk'])
    expect(route.legs[0].pts[0].x).toBeLessThan(620)
    expect(route.legs[0].pts[1].x).toBeGreaterThan(750)
    // The snail likes the slow way.
    expect(told(second.told, 'reaction').find((r) => r.feel === 'bump')).toMatchObject({ rider: 'snail', taste: 'like' })
    expect(second.world.riders.find((r) => r.kind === 'snail')!.tar).toBeGreaterThan(120)
  })

  it('works with taps alone: the rider gets home, and a trip made of taps steps the position down', () => {
    let w = withRider('chick')
    const all: Told[] = []
    for (const x of [640, 800, 950]) {
      const made = makeMark(w, [{ x, y: 462 }])
      w = made.world
      all.push(...made.told)
    }
    expect(w.finished).toBe(true)
    expect(told(all, 'cycle')[0].outcome).toBe('badly')
    expect(w.position).toBe('short-hop')
    // At the first place in the order there is nowhere lower to go.
    const lowest = { ...withRider('chick'), position: 'short-hop' }
    let again: World = lowest
    for (const x of [640, 800, 950]) again = makeMark(again, [{ x, y: 462 }]).world
    expect(again.position).toBe('short-hop')
  })

  it('leaves the position where it was after a mixed cycle', () => {
    const w = withRider('frog')
    const half = makeMark(w, line(trainAt(w), { x: 700, y: 462 }))
    const rest = makeMark(half.world, [{ x: 940, y: 462 }])
    expect(told(rest.told, 'cycle')[0].outcome).toBe('mixed')
    expect(rest.world.position).toBe('long-way')
  })
})

describe('how a cycle is judged', () => {
  const home = (chalk: number, tar: number): Rider => ({ kind: 'frog', stop: 'mid-1', home: 'mid-4', at: 'home', chalk, tar, felt: noFeels() })
  it('counts only what a rider rides: its walk over to the train is neither chalk nor bare tar', () => {
    let rides = 0
    for (const seed of [2, 3, 5, 8]) {
      const w = freshWorld(null, seed), waits = w.riders[0]
      // It waits at its stop, a walk away from the train, and walks over as the first touch begins the cycle.
      const walk = distance(railAt(waits.stop), trainAt(w))
      expect(walk).toBeGreaterThan(60)
      const made = makeMark(w, [{ x: w.train.x + 20, y: w.train.y + 4 }])
      expect(told(made.told, 'boarded')[0]).toMatchObject({ walked: true, rider: waits.kind })
      const aboard = made.world.riders.find((r) => r.kind === waits.kind)!
      expect(aboard.at).toBe('train')
      // Aboard, it has ridden no further than the train went for the tap, which is less than the walk was.
      const went = distance(trainAt(made.world), trainAt(w))
      expect(went).toBeLessThan(walk - 30)
      expect(aboard.chalk + aboard.tar).toBeLessThanOrEqual(went + 1)
      // What it rides is counted: a line from the train is chalk for as far as the train rides it.
      const from = trainAt(made.world), rode = makeMark(made.world, line(from, { x: from.x + 40, y: from.y + 220 }))
      const route = told(rode.told, 'route')[0], after = rode.world.riders.find((r) => r.kind === waits.kind)!
      if (after.at !== 'train') continue
      expect(after.chalk - aboard.chalk + (after.tar - aboard.tar)).toBeLessThanOrEqual(route.ridden + 1)
      expect(after.chalk - aboard.chalk).toBeGreaterThan(route.ridden * 0.7)
      rides++
    }
    expect(rides).toBeGreaterThanOrEqual(3)
  })

  it('goes by the share of the way ridden on chalk', () => {
    expect(judge([home(750, 250)])).toBe('well')
    expect(judge([home(740, 260)])).toBe('mixed')
    expect(judge([home(250, 750)])).toBe('badly')
    expect(judge([home(260, 740)])).toBe('mixed')
    expect(judge([home(0, 0)])).toBe('mixed')
    // Two riders are judged together, and a rider from the cycle before is not counted.
    expect(judge([home(900, 100), home(100, 900)])).toBe('mixed')
    expect(judge([home(900, 100), { ...home(0, 5000), at: 'before' }])).toBe('well')
  })
})

describe('the riders react to the exact ride', () => {
  const rideOf = (kind: RiderKind, raw: (from: Pt) => Pt[]) => {
    const w = withRider(kind, 'top-4')
    const from = { x: w.train.x + 30, y: w.train.y }
    return makeMark(w, raw(from))
  }
  it('gives each rider its own taste for the same mark', () => {
    const corners = (kind: RiderKind) => told(rideOf(kind, (from) => zigzag(from)).told, 'reaction').filter((r) => r.feel === 'corner')
    expect(corners('frog').length).toBeGreaterThanOrEqual(3)
    expect(corners('frog').every((r) => r.taste === 'like')).toBe(true)
    expect(corners('cat').every((r) => r.taste === 'dislike')).toBe(true)
    expect(corners('chick').every((r) => r.taste === 'plain')).toBe(true)
  })

  it('carries what the ride did to the rider to the way it gets out at home', () => {
    const w = withRider('frog')
    const zz = makeMark(w, zigzag({ x: w.train.x + 30, y: w.train.y }, 5))
    const done = makeMark(zz.world, line(trainAt(zz.world), railAt('mid-4')))
    expect(told(done.told, 'home')[0]).toMatchObject({ rider: 'frog', how: 'corner', taste: 'like' })
  })

  it('reacts to a roundabout once, as to a loop', () => {
    const w = withRider('chick', 'top-4')
    const made = makeMark(w, ring({ x: w.train.x + 150, y: w.train.y }, 120))
    expect(told(made.told, 'happening').filter((h) => h.name === 'roundabout').length).toBe(1)
    expect(told(made.told, 'reaction').filter((r) => r.feel === 'loop')).toEqual([expect.objectContaining({ rider: 'chick', taste: 'like' })])
  })
})

describe('chalk laid on a thing chalks that thing', () => {
  it('stripes the engine with a zigzag, keeps no mark of it, and washes the stripes off in the water', () => {
    const w = withRider('frog', 'low-4')
    const striped = makeMark(w, zigzag({ x: w.train.x - 90, y: w.train.y - 30 }, 4, 45, 80))
    expect(told(striped.told, 'answer')[0]).toMatchObject({ thing: 'engine', kind: 'zigzag' })
    expect(striped.world.train.stripes).toBe(w.chalk)
    expect(striped.world.marks.length).toBe(w.marks.length)
    expect(told(striped.told, 'route').length).toBe(0)
    const washed = makeMark(striped.world, line({ x: 380, y: PUDDLE.y }, { x: 820, y: PUDDLE.y }))
    expect(washed.world.train.stripes).toBe(NONE)
  })

  it('tints the water with a scribble, and then the train that goes through it', () => {
    const w = withRider('frog', 'low-4')
    const tinted = makeMark(w, scribble({ x: PUDDLE.x, y: PUDDLE.y }))
    expect(tinted.world.water).toBe(w.chalk)
    expect(tinted.world.train.tint).toBe(NONE)
    const through = makeMark(tinted.world, line({ x: 380, y: PUDDLE.y }, { x: 820, y: PUDDLE.y }))
    expect(through.world.train.tint).toBe(w.chalk)
  })

  it('opens the dandelion inside a ring, for as long as the ring is there', () => {
    const w = withRider('frog')
    expect(inFlower(w.marks)).toBe(false)
    const ringed = makeMark(w, ring({ x: DANDELION.x, y: DANDELION.y - 20 }, 70))
    expect(told(ringed.told, 'answer')[0].thing).toBe('dandelion')
    expect(inFlower(ringed.world.marks)).toBe(true)
  })

  it('gives the dandelion a seed tuft under a scribble, read from the marks', () => {
    const w = withRider('frog')
    expect(wearsTuft(w.marks)).toBe(false)
    const tufted = makeMark(w, scribble({ x: DANDELION.x, y: DANDELION.y - 28 }))
    expect(told(tufted.told, 'answer')[0]).toMatchObject({ thing: 'dandelion', kind: 'scribble' })
    expect(wearsTuft(tufted.world.marks)).toBe(true)
  })

  it('reads where chalk lies dark in the water from the mark itself', () => {
    const w = withRider('frog', 'low-4')
    const through = makeMark(w, line({ x: 380, y: PUDDLE.y }, { x: 820, y: PUDDLE.y })).world
    const wet = wetStretches(through.marks[through.marks.length - 1])
    expect(wet.length).toBe(1)
    const mark = through.marks[through.marks.length - 1].p
    expect(mark[wet[0][0]].x).toBeGreaterThan(PUDDLE.x - PUDDLE.rx - 1)
    expect(mark[wet[0][1]].x).toBeLessThan(PUDDLE.x + PUDDLE.rx + 1)
    expect(wetStretches(w.marks[0])).toEqual([])
  })

  it('reads chalk on an empty home as chalk on bare tar, and the home answers the touch as well', () => {
    const w = withRider('frog')
    const tapped = makeMark(w, [PLACES['mid-4']])
    expect(told(tapped.told, 'answer')[0]).toMatchObject({ thing: 'tar', kind: 'tap' })
    expect(told(tapped.told, 'home-answered')).toEqual([{ what: 'home-answered', home: 'frog', sight: 'pond-ripple', sound: 'blip' }])
    expect(told(tapped.told, 'route').length).toBe(1)
    // The same answer for every kind of mark.
    const scribbled = makeMark(w, scribble(PLACES['mid-4']))
    expect(told(scribbled.told, 'home-answered')[0]).toMatchObject({ sight: 'pond-ripple', sound: 'blip' })
    // A mark elsewhere does not touch the home.
    expect(told(makeMark(w, [{ x: 600, y: 200 }]).told, 'home-answered')).toEqual([])
  })

  it('answers a tap on a rider with its trick and nothing else: no chalk stays and no ride starts', () => {
    const w = makeMark(withRider('cat'), [{ x: 900, y: 200 }]).world
    const waiting = w.riders.find((r) => r.at === 'next')!
    const poked = makeMark(w, [PLACES[waiting.stop]])
    expect(told(poked.told, 'answer')[0]).toMatchObject({ thing: 'rider', kind: 'tap', rider: waiting.kind })
    expect(poked.world.marks).toEqual(w.marks)
    expect(poked.world.train).toEqual(w.train)
    expect(poked.world.chalk).not.toBe(w.chalk)
  })
})

describe('how a cycle ends and the next one starts', () => {
  it('leaves the ending standing: only a mark changes the world', () => {
    const done = takeHome(withRider('frog')).world
    expect(done.finished).toBe(true)
    expect(done.riders.some((r) => r.at === 'next')).toBe(true)
  })

  it('turns the tar over on the next mark, and a moved position shows on the rider after next', () => {
    const done = takeHome(withRider('frog')).world
    const waiting = done.riders.find((r) => r.at === 'next')!
    expect(done.position).toBe('up-and-down')
    const next = makeMark(done, [{ x: 600, y: 300 }])
    expect(told(next.told, 'began').length).toBe(1)
    expect(next.world.finished).toBe(false)
    expect(next.world.riders.find((r) => r.kind === 'frog')!.at).toBe('before')
    expect(['stop', 'train']).toContain(next.world.riders.find((r) => r.kind === waiting.kind)!.at)
    const afterNext = next.world.riders.find((r) => r.at === 'next')!
    // The one who waited was laid out before the cycle was judged; the new one lies as the new position sets.
    expect(Math.abs(PLACES[afterNext.stop].y - PLACES[afterNext.home].y)).toBeGreaterThanOrEqual(200)
  })

  it('does not take up the waiting rider for a line that only passes by', () => {
    const w = makeMark(withRider('frog', 'top-4', 'far-rider'), [{ x: 200, y: 462 }]).world
    const waiting = w.riders.find((r) => r.at === 'next')!
    const stop = PLACES[waiting.stop]
    // A line that comes near the stop, a train's length to one side of it, and goes on well clear of it.
    const side = stop.x > 600 ? -1 : 1, near = { x: stop.x + side * 150, y: stop.y + (stop.y > 400 ? -40 : 40) }
    const past = makeMark(w, [...line(trainAt(w), near), ...line(near, { x: near.x + side * 320, y: near.y }).slice(1)])
    expect(told(past.told, 'boarded').some((b) => b.rider === waiting.kind)).toBe(false)
    expect(past.world.riders.find((r) => r.kind === waiting.kind)!.at).toBe('next')
  })

  it('takes up the waiting rider for a line that ends at it, to one side of its middle, where a wagon is free', () => {
    const w = makeMark(withRider('frog', 'top-4', 'far-rider'), [{ x: 200, y: 462 }]).world
    const waiting = w.riders.find((r) => r.at === 'next')!
    const stop = PLACES[waiting.stop]
    const beside = makeMark(w, line(trainAt(w), { x: stop.x + (stop.x > 600 ? -150 : 150), y: stop.y + (stop.y > 400 ? -40 : 40) }))
    expect(told(beside.told, 'boarded').some((b) => b.rider === waiting.kind)).toBe(true)
    expect(told(beside.told, 'full')).toEqual([])
  })

  it('lets the child fetch the waiting rider early and carry both, and lays out another to wait', () => {
    const w = makeMark(withRider('frog', 'top-4', 'far-rider'), [{ x: 200, y: 462 }]).world
    const waiting = w.riders.find((r) => r.at === 'next')!
    const fetched = makeMark(w, line(trainAt(w), railAt(waiting.stop)))
    expect(told(fetched.told, 'boarded').some((b) => b.rider === waiting.kind && !b.walked)).toBe(true)
    expect(fetched.world.riders.filter((r) => r.at === 'train').length).toBe(2)
    expect(fetched.world.riders.filter((r) => r.at === 'next').length).toBe(1)
    expect(fetched.world.riders.length).toBeLessThanOrEqual(MAX_RIDERS)
  })

  it('lays a layout for two as two riders: only the first waits ahead, the second is drawn in when that cycle begins', () => {
    const top = makeMark({ ...withRider('frog'), position: 'two-at-once' }, [{ x: 300, y: 462 }]).world
    expect(top.riders.filter(waitsAhead).length).toBe(1)
    expect(top.ahead).toBe('two-at-once')
    const done = takeHome(top).world
    const began = makeMark(done, [{ x: done.train.x + 5, y: done.train.y }]).world
    expect(began.riders.filter((r) => r.at === 'stop' || r.at === 'train').length).toBe(2)
    expect(began.riders.length).toBeLessThanOrEqual(MAX_RIDERS)
  })

  it('goes by the layout the waiting rider was laid out from, whatever the position has moved to since', () => {
    // Laid out for one: a position that has since moved to the top brings no second rider for this one.
    const one = makeMark(withRider('frog', 'mid-4', 'far-rider'), [{ x: 300, y: 462 }]).world
    expect(one.ahead).toBe('far-rider')
    const doneOne = { ...takeHome(one).world, position: 'two-at-once' }
    expect(makeMark(doneOne, [{ x: doneOne.train.x + 5, y: doneOne.train.y }]).world.riders.filter((r) => r.at === 'stop' || r.at === 'train').length).toBe(1)
    // Laid out for two: a position that has since moved down still brings the second rider.
    const two = makeMark({ ...withRider('frog'), position: 'two-at-once' }, [{ x: 300, y: 462 }]).world
    const doneTwo = { ...takeHome(two).world, position: 'far-rider' }
    expect(makeMark(doneTwo, [{ x: doneTwo.train.x + 5, y: doneTwo.train.y }]).world.riders.filter((r) => r.at === 'stop' || r.at === 'train').length).toBe(2)
    // An unknown id is read as the position.
    const lost = { ...takeHome(two).world, ahead: 'groep-3' }
    expect(makeMark(lost, [{ x: lost.train.x + 5, y: lost.train.y }]).world.riders.filter((r) => r.at === 'stop' || r.at === 'train').length).toBe(2)
  })

  it('never holds more than two in play, one waiting and one at home, through a run of layouts for two', () => {
    let w = makeMark({ ...withRider('frog'), position: 'two-at-once' }, [{ x: 300, y: 462 }]).world
    for (let cycle = 0; cycle < 12; cycle++) {
      w = takeHome(w).world
      expect(w.finished).toBe(true)
      expect(w.riders.filter(waitsAhead).length).toBe(1)
      w = makeMark(w, [{ x: w.train.x + 5, y: w.train.y }]).world
      expect(w.position).toBe('two-at-once')
      expect(w.riders.filter((r) => r.at === 'stop' || r.at === 'train').length).toBe(2)
      expect(w.riders.filter(waitsAhead).length).toBe(1)
      expect(w.riders.length).toBeLessThanOrEqual(MAX_RIDERS)
      expect(w.riders.filter((r) => r.at === 'stop' || waitsAhead(r)).length).toBeLessThanOrEqual(3)
    }
  })

  it('leaves a waiting rider at its stop when both wagons are taken, and takes it the next time a wagon is free', () => {
    const seat = (kind: RiderKind, stop: PlaceId, home: PlaceId, at: Rider['at']): Rider => ({ kind, stop, home, at, chalk: 0, tar: 0, felt: noFeels() })
    const full: World = { ...freshWorld(null, 3), position: 'two-at-once', ahead: 'two-at-once', riders: [seat('frog', 'mid-2', 'low-4', 'train'), seat('cat', 'mid-3', 'low-1', 'train'), seat('snail', 'top-3', 'top-1', 'next')] }
    const came = makeMark(full, line(trainAt(full), railAt('top-3')))
    expect(told(came.told, 'full')).toEqual([expect.objectContaining({ rider: 'snail' })])
    expect(came.world.riders.find((r) => r.kind === 'snail')!.at).toBe('next')
    expect(came.world.riders.filter((r) => r.at === 'train').length).toBe(2)
    // One rider is taken home, and the train comes back with a wagon free.
    const freed = makeMark(came.world, line(trainAt(came.world), railAt('low-4'))).world
    expect(freed.riders.find((r) => r.kind === 'frog')!.at).toBe('home')
    const back = makeMark(freed, line(trainAt(freed), railAt('top-3')))
    expect(back.world.riders.find((r) => r.kind === 'snail')!.at).toBe('train')
  })
})

describe('the train never comes to rest in a figure', () => {
  const seat = (kind: RiderKind, stop: PlaceId, home: PlaceId, at: Rider['at']): Rider => ({ kind, stop, home, at, chalk: 0, tar: 0, felt: noFeels() })
  // Someone already waits, far from every line here, so nobody new is laid out on the way.
  const waiting = seat('snail', 'top-4', 'low-1', 'next')
  const yard = (riders: Rider[]): World => ({ ...freshWorld(null, 3), riders: [...riders, waiting] })

  it('stops short of a rider at home that a line ends at, and is greeted; the ride is cut there', () => {
    const w = yard([seat('frog', 'mid-2', 'low-4', 'train'), seat('cat', 'top-1', 'mid-4', 'home')])
    const made = makeMark(w, line(trainAt(w), { x: 1080, y: 410 }))
    expect(told(made.told, 'greeted')).toEqual([expect.objectContaining({ rider: 'cat' })])
    expect(told(made.told, 'stopped')[0].why).toBe('greeted')
    expect(distance(trainAt(made.world), PLACES['mid-4'])).toBeGreaterThanOrEqual(THROUGH)
    expect(clearance(['mid-4'], trainAt(made.world))).toBeLessThanOrEqual(BESIDE)
    const route = told(made.told, 'route')[0]
    expect(route.ridden).toBeLessThan(route.route.length)
    // The whole line is still on the tar.
    expect(made.world.marks.length).toBe(w.marks.length + 1)
  })

  it('stops short of a home with nobody in it that a line ends at', () => {
    const w = yard([seat('frog', 'mid-2', 'low-4', 'train'), seat('chick', 'top-3', 'mid-4', 'stop')])
    const made = makeMark(w, line(trainAt(w), { x: 1080, y: 410 }))
    expect(told(made.told, 'stopped')[0].why).toBe('figure')
    expect(distance(trainAt(made.world), PLACES['mid-4'])).toBeGreaterThanOrEqual(THROUGH)
  })

  it('rides in front of a figure it only passes, and on to the end of the line', () => {
    const w = yard([seat('frog', 'mid-2', 'top-1', 'train'), seat('cat', 'top-2', 'mid-3', 'home')])
    // Along the rail that runs right under the cat's home, and well past it.
    const past = makeMark(w, line(trainAt(w), { x: 1080, y: 462 }))
    expect(told(past.told, 'stopped')[0].why).toBe('end')
    // The cat leans out and greets it as it comes by, once.
    expect(told(past.told, 'greeted').map((g) => g.rider)).toEqual(['cat'])
    expect(Math.abs(past.world.train.x - 1080)).toBeLessThan(14)
  })

  it('can always leave a figure it stands beside', () => {
    const beside = makeMark(yard([seat('frog', 'mid-2', 'low-4', 'train'), seat('cat', 'top-1', 'mid-4', 'home')]), line({ x: 480, y: 462 }, { x: 1080, y: 410 })).world
    for (const to of [{ x: 600, y: 300 }, { x: 1100, y: 200 }, { x: 700, y: 700 }]) {
      const away = makeMark(beside, line(trainAt(beside), to))
      expect(told(away.told, 'stopped')[0].why).toBe('end')
      expect(distance(trainAt(away.world), to)).toBeLessThan(14)
    }
  })
})

describe('what a last reader found', () => {
  const seat = (kind: RiderKind, stop: PlaceId, home: PlaceId, at: Rider['at']): Rider => ({ kind, stop, home, at, chalk: 0, tar: 0, felt: noFeels() })

  it('lets the waiting rider into a free wagon though nobody can be laid out in its place yet', () => {
    // Four riders on the tar and none at home: one aboard, two at their stops, one waiting ahead.
    const w: World = { ...freshWorld(null, 3), position: 'two-at-once', ahead: 'two-at-once', riders: [seat('frog', 'mid-2', 'top-4', 'train'), seat('cat', 'top-1', 'low-4', 'stop'), seat('snail', 'low-1', 'top-2', 'stop'), seat('chick', 'mid-4', 'low-3', 'next')] }
    const made = makeMark(w, line(trainAt(w), railAt('mid-4')))
    expect(told(made.told, 'full')).toEqual([])
    expect(told(made.told, 'boarded').map((b) => b.rider)).toContain('chick')
    expect(made.world.riders.filter((r) => r.at === 'train').length).toBe(2)
  })

  it('does not chalk a rider that the chalk never touched, and melts a scribble into the water only where half of it is in', () => {
    const w: World = { ...freshWorld(null, 3), riders: [seat('frog', 'mid-2', 'top-4', 'train'), seat('cat', 'mid-3', 'low-4', 'stop'), seat('snail', 'top-1', 'low-1', 'next')] }
    // A wide zigzag whose middle lies over the cat and whose chalk stays well away from it.
    const cat = PLACES['mid-3'], wide: Pt[] = []
    for (let i = 0; i < 4; i++) wide.push(...line({ x: cat.x - 280 + i * 140, y: cat.y + (i % 2 ? -200 : 200) }, { x: cat.x - 280 + (i + 1) * 140, y: cat.y + (i % 2 ? 200 : -200) }, 20).filter((q) => distance(q, cat) > 90))
    const made = makeMark(w, wide)
    expect(told(made.told, 'answer')[0].thing).not.toBe('rider')
    // A scribble mostly on the tar beside the puddle: it stays on the tar, and the water keeps its colour.
    const beside: Pt[] = []
    for (let i = 0; i < 10; i++) beside.push(...line({ x: 400 + i * 8, y: i % 2 ? 620 : 540 }, { x: 408 + i * 8, y: i % 2 ? 540 : 620 }, 6))
    const dry = makeMark(w, beside)
    expect(told(dry.told, 'answer')[0].thing).not.toBe('puddle')
    expect(dry.world.water).toBe(w.water)
  })

  it('lets both riders out where the train stops beside both their homes', () => {
    const fresh = freshWorld(null, 3)
    const w: World = { ...fresh, position: 'two-at-once', ahead: 'two-at-once', train: { ...fresh.train, x: 940, y: 300 }, riders: [{ ...seat('frog', 'mid-2', 'low-3', 'train'), chalk: 200 }, { ...seat('cat', 'mid-1', 'low-4', 'train'), chalk: 200 }, seat('snail', 'top-1', 'top-2', 'next')] }
    // Straight down between the two homes on the low row: the train comes beside both at once.
    const made = makeMark(w, line(trainAt(w), { x: 940, y: 690 }))
    expect(told(made.told, 'home').map((h) => h.rider).sort()).toEqual(['cat', 'frog'])
    expect(made.world.riders.filter((r) => r.at === 'train')).toEqual([])
    expect(made.world.finished).toBe(true)
  })
})

describe('only taps', () => {
  it('counts every hop between taps as bare tar, with its bump, however short the hop', () => {
    const seat = (kind: RiderKind, stop: PlaceId, home: PlaceId, at: Rider['at']): Rider => ({ kind, stop, home, at, chalk: 0, tar: 0, felt: noFeels() })
    // No chalk on the tar at all: every tap lands on bare tar.
    let w: World = { ...freshWorld(null, 3), marks: [], riders: [seat('frog', 'mid-2', 'mid-4', 'train'), seat('snail', 'top-1', 'low-1', 'next')] }
    const bumps: number[] = []
    for (let i = 1; i <= 5; i++) {
      const made = makeMark(w, [{ x: w.train.x + 66, y: w.train.y }])
      bumps.push(told(made.told, 'happening').filter((h) => h.name === 'bump').length)
      w = made.world
    }
    const frog = w.riders.find((r) => r.kind === 'frog')!
    expect(bumps.every((n) => n >= 1)).toBe(true)
    expect(frog.chalk).toBe(0)
    expect(frog.tar).toBeGreaterThan(300)
  })
})

describe('a line whose two ends meet', () => {
  const seat = (kind: RiderKind, stop: PlaceId, home: PlaceId, at: Rider['at']): Rider => ({ kind, stop, home, at, chalk: 0, tar: 0, felt: noFeels() })
  const ringAt = (c: Pt, r: number): Pt[] => Array.from({ length: 61 }, (_, i) => ({ x: c.x + Math.cos((i / 60) * Math.PI * 1.97) * r, y: c.y + Math.sin((i / 60) * Math.PI * 1.97) * r }))

  it('leaves the home reached last when the tar turns over, whichever rider the world named first', () => {
    // Two aboard; the one named second gets home first, the one named first last.
    let w: World = { ...freshWorld(null, 3), position: 'two-at-once', ahead: 'two-at-once', riders: [seat('frog', 'mid-2', 'top-4', 'train'), seat('snail', 'mid-1', 'low-1', 'train')] }
    w = makeMark(w, line(trainAt(w), railAt('low-1'))).world
    expect(w.riders.find((r) => r.kind === 'snail')!.at).toBe('home')
    w = makeMark(w, line(trainAt(w), railAt('top-4'))).world
    expect(w.finished).toBe(true)
    // The next mark turns the tar over: the frog's home, reached last, is the one that stays.
    w = makeMark(w, [{ x: 600, y: 330 }]).world
    expect(w.riders.filter((r) => r.at === 'before').map((r) => r.kind)).toEqual(['frog'])
    expect(w.riders.some((r) => r.kind === 'snail' && r.home === 'low-1')).toBe(false)
  })

  it('feels a ring as a loop though the ride is cut short on it, past half-way', () => {
    const w: World = { ...freshWorld(null, 3), riders: [seat('chick', 'mid-2', 'top-3', 'train'), seat('snail', 'top-1', 'low-1', 'next')] }
    // A ring from below that comes beside the chick's nest only on its way back.
    const made = makeMark(w, ringAt({ x: 700, y: 520 }, 150))
    expect(made.world.riders.find((r) => r.kind === 'chick')!.at).toBe('home')
    expect(told(made.told, 'happening').some((h) => h.name === 'roundabout')).toBe(false)
    expect(told(made.told, 'happening').filter((h) => h.name === 'loop').length).toBe(1)
    expect(made.world.riders.find((r) => r.kind === 'chick')!.felt.loop).toBe(1)
  })

  it('is a roundabout once it has been ridden all the way round, and an ordinary ride where a rider gets home on it', () => {
    const riders = (home: PlaceId): World => ({ ...freshWorld(null, 3), riders: [seat('frog', 'mid-2', home, 'train'), seat('snail', 'top-1', 'low-1', 'next')] })
    // Clear of every home: all the way round.
    const round = makeMark(riders('top-1'), ringAt({ x: 700, y: 430 }, 200))
    expect(told(round.told, 'happening').some((h) => h.name === 'roundabout')).toBe(true)
    expect(told(round.told, 'route')[0].ridden).toBe(told(round.told, 'route')[0].route.length)
    // Past the frog's home: the frog gets out there, which ends the ride, and it is no roundabout.
    const home = makeMark(riders('top-4'), ringAt({ x: 700, y: 430 }, 200))
    expect(home.world.riders.find((r) => r.kind === 'frog')!.at).toBe('home')
    expect(told(home.told, 'happening').some((h) => h.name === 'roundabout')).toBe(false)
  })
})

describe('the first showing', () => {
  it('lays a short line toward the home, takes the rider aboard and leaves a gap for the child', () => {
    const w = freshWorld(null, 4)
    const shown = showFirst(w)
    expect(shown.world.shown).toBe(true)
    expect(shown.world.marks.length).toBe(2)
    expect(shown.world.riders.find((r) => r.kind === w.riders[0].kind)!.at).toBe('train')
    expect(shown.world.finished).toBe(false)
    expect(told(shown.told, 'stopped')[0].shortBy[0].gap).toBeGreaterThan(0)
    // It plays once.
    const again = showFirst(shown.world)
    expect(again.told).toEqual([])
    expect(again.world).toEqual(shown.world)
  })
})

describe('any play at all', () => {
  it('keeps the world whole through hundreds of random marks, and cycles keep finishing', () => {
    for (const seed of [1, 2, 3]) {
      const rng = makeRng(seed)
      let w = showFirst(freshWorld(pick(rng, [null, 2, 3, 4]), seed)).world
      let cycles = 0, rests = 0, inFigure = 0
      for (let i = 0; i < 500; i++) {
        const c = { x: between(rng, 0, TAR.w), y: between(rng, 0, TAR.h) }
        const aim = inPlay(w)
        const shape = Math.floor(rng.next() * 7)
        const raw = shape === 0 ? [c] : shape === 1 ? line(trainAt(w), c) : shape === 2 ? zigzag(c) : shape === 3 ? ring(c, between(rng, 50, 140)) : shape === 4 ? scribble(c)
          : aim ? line(trainAt(w), aim.at === 'train' ? railAt(aim.home) : railAt(aim.stop)) : [c]
        const figuresBefore = w.riders.flatMap((r) => [r.home, ...(r.at === 'stop' || waitsAhead(r) ? [r.stop] : [])])
        const from = trainAt(w)
        const made = makeMark(w, raw)
        w = made.world
        // At rest the engine's body stands in no figure, unless the mark left it where it was.
        const figuresNow = w.riders.flatMap((r) => [r.home, ...(r.at === 'stop' || waitsAhead(r) ? [r.stop] : [])]).filter((place) => figuresBefore.includes(place))
        if (told(made.told, 'route').length && distance(from, trainAt(w)) > 12) {
          rests++
          if (clearance(figuresNow, trainAt(w)) < -14) inFigure++
        }
        cycles += told(made.told, 'cycle').length
        expect(told(made.told, 'cycle').length === 1).toBe(w.finished)
        expect(w.riders.length).toBeLessThanOrEqual(MAX_RIDERS)
        expect(w.riders.filter((r) => r.at === 'train').length).toBeLessThanOrEqual(SEATS)
        expect(new Set(w.riders.map((r) => r.kind)).size).toBe(w.riders.length)
        expect(new Set(busyPlaces(w.riders)).size).toBe(busyPlaces(w.riders).length)
        expect(w.riders.filter((r) => r.at === 'stop' || waitsAhead(r)).length).toBeLessThanOrEqual(3)
        expect(LADDER).toContain(w.position)
        expect(w.marks.length).toBeLessThanOrEqual(MAX_MARKS)
        expect(w.marks.reduce((sum, m) => sum + m.p.length, 0)).toBeLessThanOrEqual(MAX_POINTS)
        expect(w.train.x >= 0 && w.train.x <= TAR.w && w.train.y >= 0 && w.train.y <= TAR.h).toBe(true)
        // After the first mark someone always waits for the cycle to come.
        expect(w.riders.filter(waitsAhead).length).toBe(1)
      }
      expect(cycles).toBeGreaterThan(20)
      // Allowed, with a cap: a ride that ends between two figures that stand side by side on one row. They leave
      // less room than the engine is wide, and it stands across the edge of both. Measured: 21 rests of 440.
      expect(rests).toBeGreaterThan(150)
      expect(inFigure / rests, `${inFigure} of ${rests}`).toBeLessThanOrEqual(0.07)
    }
  })
})
