import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { fits } from './layouts'
import { MAX_MARKS, MAX_POINTS } from './marks'
import { STOP_SHORT, judge, makeMark, showFirst, type Told } from './play'
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
/** Takes whoever is in play home along one straight line. */
const takeHome = (w: World): { world: World; told: Told[] } => {
  let world = w
  const all: Told[] = []
  for (let guard = 0; guard < 16 && !world.finished; guard++) {
    const r = inPlay(world)
    const made = makeMark(world, line(trainAt(world), r.at === 'train' ? railAt(r.home) : railAt(r.stop)))
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
    const made = makeMark(w, [{ x: 600, y: 300 }])
    expect(told(made.told, 'began').length).toBe(1)
    expect(told(made.told, 'boarded')[0]).toMatchObject({ walked: true, rider: w.riders[0].kind })
    expect(made.world.riders.filter((r) => r.at === 'next').length).toBe(1)
    expect(new Set(made.world.riders.map((r) => r.kind)).size).toBe(made.world.riders.length)
    // A second mark does not begin anything again.
    expect(told(makeMark(made.world, [{ x: 700, y: 300 }]).told, 'began').length).toBe(0)
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
    expect(distance(trainAt(made.world), PLACES['mid-4'])).toBeLessThanOrEqual(STOP_SHORT + 1)
    expect(distance(trainAt(made.world), PLACES['mid-4'])).toBeGreaterThan(STOP_SHORT - 40)
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
    const first = makeMark(w, line(trainAt(w), { x: 450, y: 462 }))
    const second = makeMark(first.world, line({ x: 650, y: 462 }, railAt('mid-4')))
    const route = told(second.told, 'route')[0].route
    expect(route.legs.map((l) => l.on)).toEqual(['tar', 'chalk'])
    expect(route.legs[0].pts[0].x).toBeLessThan(470)
    expect(route.legs[0].pts[1].x).toBeGreaterThan(640)
    // The snail likes the slow way.
    expect(told(second.told, 'reaction').find((r) => r.feel === 'bump')).toMatchObject({ rider: 'snail', taste: 'like' })
    expect(second.world.riders.find((r) => r.kind === 'snail')!.tar).toBeGreaterThan(150)
  })

  it('works with taps alone: the rider gets home, and a trip made of taps steps the position down', () => {
    let w = withRider('chick')
    const all: Told[] = []
    for (const x of [450, 700, 950]) {
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
    for (const x of [450, 700, 950]) again = makeMark(again, [{ x, y: 462 }]).world
    expect(again.position).toBe('short-hop')
  })

  it('leaves the position where it was after a mixed cycle', () => {
    const w = withRider('frog')
    const half = makeMark(w, line(trainAt(w), { x: 520, y: 462 }))
    const rest = makeMark(half.world, [{ x: 940, y: 462 }])
    expect(told(rest.told, 'cycle')[0].outcome).toBe('mixed')
    expect(rest.world.position).toBe('long-way')
  })
})

describe('how a cycle is judged', () => {
  const home = (chalk: number, tar: number): Rider => ({ kind: 'frog', stop: 'mid-1', home: 'mid-4', at: 'home', chalk, tar, felt: noFeels() })
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
    expect(top.riders.filter((r) => r.at === 'pair').length).toBe(1)
    expect(top.riders.filter((r) => r.at === 'next').length).toBe(0)
    const done = takeHome(top).world
    const began = makeMark(done, [{ x: done.train.x + 5, y: done.train.y }]).world
    expect(began.riders.filter((r) => r.at === 'stop' || r.at === 'train').length).toBe(2)
    expect(began.riders.length).toBeLessThanOrEqual(MAX_RIDERS)
  })

  it('never holds more than two in play, one waiting and one at home, through a run of layouts for two', () => {
    let w = makeMark({ ...withRider('frog'), position: 'two-at-once' }, [{ x: 300, y: 462 }]).world
    for (let cycle = 0; cycle < 12; cycle++) {
      w = takeHome(w).world
      expect(w.finished).toBe(true)
      // The ending stands with the riders just taken home, and one waiting.
      expect(w.riders.filter(waitsAhead).length).toBe(1)
      w = makeMark(w, [{ x: w.train.x + 5, y: w.train.y }]).world
      expect(w.position).toBe('two-at-once')
      expect(w.riders.filter((r) => r.at === 'stop' || r.at === 'train').length).toBe(2)
      expect(w.riders.filter(waitsAhead).length).toBe(1)
      expect(w.riders.filter((r) => r.at === 'before').length).toBe(1)
      expect(w.riders.length).toBe(MAX_RIDERS)
      expect(w.riders.filter((r) => r.at === 'stop' || waitsAhead(r)).length).toBeLessThanOrEqual(3)
    }
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
      let cycles = 0
      for (let i = 0; i < 500; i++) {
        const c = { x: between(rng, 0, TAR.w), y: between(rng, 0, TAR.h) }
        const aim = inPlay(w)
        const shape = Math.floor(rng.next() * 7)
        const raw = shape === 0 ? [c] : shape === 1 ? line(trainAt(w), c) : shape === 2 ? zigzag(c) : shape === 3 ? ring(c, between(rng, 50, 140)) : shape === 4 ? scribble(c)
          : aim ? line(trainAt(w), aim.at === 'train' ? railAt(aim.home) : railAt(aim.stop)) : [c]
        const made = makeMark(w, raw)
        w = made.world
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
    }
  })
})
