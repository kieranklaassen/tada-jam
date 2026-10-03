import { describe, expect, it } from 'vitest'
import { COLS, MUD_AT, PUDDLE_AT, ROWS, centreOf, pour } from './ground'
import { BELL, TRUCK, distance, type Place } from './layout'
import { placeOf } from './places'
import { restChannels, type Channels } from './scenes'
import { KINDS, THINGS, type Kind } from './things'
import { gulpOn, type Step, type Yard } from './world'
import { ARRANGEMENTS, layOut } from './yards'
import { PUFFS, RINGS, YardMotion } from './yardMotion'

const FRAME = 1 / 60
const REST = restChannels()

/** Every arrangement of every place, laid out fresh. */
const everyYard: Yard[] = Object.entries(ARRANGEMENTS).flatMap(([place, plans]) => plans.map((_, arrangement) => layOut(place, arrangement)))

/** The motion of a yard as it is found: settled, with one frame played so that every pose is filled in. */
function found(yard: Yard, seed = 1): YardMotion {
  const motion = new YardMotion(yard, seed)
  motion.settle(yard, REST)
  motion.step(FRAME, yard, REST)
  return motion
}

function play(motion: YardMotion, yard: Yard, seconds: number, each?: (now: number) => void, channels: Channels = REST): void {
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    motion.step(FRAME, yard, channels)
    each?.((frame + 1) * FRAME)
  }
}

/** Gives a thing gulps by the rules, and returns the yard as it then is. */
function watered(yard: Yard, index: number, gulps: number): Yard {
  let now = yard
  for (let gulp = 0; gulp < gulps; gulp++) now = gulpOn(now, index).yard
  return now
}

/** Tells the motion what a step of the rules said, as the game does. */
function tell(motion: YardMotion, before: Yard, step: Step): void {
  for (const event of step.events) {
    if (event.type === 'result' && event.thing >= 0) motion.result(event.thing, event.action, step.yard)
    else if (event.type === 'moved') motion.moved(event.thing, before, step.yard)
  }
}

const PARTS = ['fire', 'pool', 'seed', 'patch', 'boat', 'wheel', 'cat', 'duck', 'bee', 'snail'] as const
type Part = (typeof PARTS)[number]

/** The parts of two yards that stand differently at this moment. */
function unlike(a: YardMotion, b: YardMotion): Part[] {
  return PARTS.filter((part) => {
    const one = a[part].pose as Record<string, number | boolean>, other = b[part].pose as Record<string, number | boolean>
    return Object.keys(one).some((key) => Math.abs(Number(one[key]) - Number(other[key])) > 1e-9)
  })
}

const indexOf = (yard: Yard, kind: Kind) => yard.things.findIndex((thing) => thing.kind === kind)

describe('the motion of a yard', () => {
  it('plays every arrangement of every place for five seconds, and knows which thing is which', () => {
    expect(everyYard.length).toBeGreaterThanOrEqual(20)
    for (const yard of everyYard) {
      const name = `${yard.place} ${yard.arrangement}`
      const motion = new YardMotion(yard)
      expect(() => {
        motion.settle(yard, REST)
        play(motion, yard, 5)
      }, name).not.toThrow()
      for (const kind of KINDS) expect(motion.has[kind], `${name}: ${kind}`).toBe(indexOf(yard, kind))
      const held = new Set(yard.things.map((thing) => thing.kind))
      for (const kind of KINDS.filter((each) => !held.has(each))) expect(motion.has[kind], `${name}: ${kind}`).toBe(-1)
      for (const part of PARTS) for (const [key, value] of Object.entries(motion[part].pose)) expect(Number.isFinite(Number(value)), `${name}: ${part}.${key}`).toBe(true)
      expect(motion.time).toBeCloseTo(5, 6)
    }
  })

  it('plays a yard found with water in it, on the roof and over the rim, just the same', () => {
    for (const start of everyYard) {
      // Every thing watered past its fill, one after another: the cat is on the roof and the boat aground.
      let yard = start
      for (let index = 0; index < start.things.length; index++) yard = watered(yard, index, THINGS[start.things[index].kind].most + 1)
      const motion = new YardMotion(yard)
      expect(() => {
        motion.settle(yard, REST)
        play(motion, yard, 2)
      }, `${yard.place} ${yard.arrangement}`).not.toThrow()
      if (motion.has.cat >= 0) {
        const at = placeOf(yard, motion.has.cat)
        expect({ x: motion.cat.pose.x, z: motion.cat.pose.z }).toEqual(at)
      }
    }
  })

  it('plays no time on a frame of no length', () => {
    const yard = layOut('whole-garden', 0)
    const motion = found(yard)
    for (let index = 0; index < yard.things.length; index++) motion.result(index, 'gulp', yard)
    motion.rang(1)
    const snapshot = () => JSON.stringify([PARTS.map((part) => motion[part].pose), motion.bell, motion.time, motion.steam.puffs, motion.ripples.rings])
    const time = motion.time
    motion.step(0, yard, REST)
    const first = snapshot()
    for (let frame = 0; frame < 100; frame++) motion.step(0, yard, REST)
    expect(snapshot()).toBe(first)
    expect(motion.time).toBe(time)
    // Nothing has left the ground, turned or swung yet.
    expect(motion.cat.pose.y).toBe(0)
    expect(motion.wheel.pose.angle).toBe(0)
    expect(motion.bell).toEqual({ swing: 0, latch: 0 })
    play(motion, yard, 0.2)
    expect(snapshot()).not.toBe(first)
    expect(motion.cat.pose.y).toBeGreaterThan(0)
  })
})

describe('a result on a thing', () => {
  it('moves that thing, and the animal that lives with it, and nothing else in the yard', () => {
    let tried = 0
    for (const start of everyYard.filter((yard) => yard.things.length > 1)) {
      for (let index = 0; index < start.things.length; index++) {
        const { kind } = start.things[index]
        // The yard holds the gulp for both. Only one of the two is told of it.
        const yard = gulpOn(start, index).yard
        const told = found(yard), twin = found(yard)
        told.result(index, 'gulp', yard)
        const moved = new Set<Part>()
        for (let frame = 0; frame < 30; frame++) {
          told.step(FRAME, yard, REST)
          twin.step(FRAME, yard, REST)
          for (const part of unlike(told, twin)) moved.add(part)
        }
        const own: Part[] = kind === 'pool' ? ['pool', 'duck'] : kind === 'seed' ? ['seed', 'bee'] : [kind]
        expect([...moved].sort(), `${start.place} ${start.arrangement}: a gulp on the ${kind}`).toEqual([...own].sort())
        tried++
      }
    }
    expect(tried).toBeGreaterThan(30)
  })

  it('on nothing is nothing: an index the yard does not hold moves no part of it', () => {
    const yard = layOut('whole-garden', 1)
    const told = found(yard), twin = found(yard)
    told.result(-1, 'gulp', yard)
    told.result(9, 'fill', yard)
    told.shown(9, yard)
    told.moved(9, yard, yard)
    play(told, yard, 0.5)
    play(twin, yard, 0.5)
    expect(unlike(told, twin)).toEqual([])
    expect(told.steam.alive).toBe(0)
  })
})

describe('steam', () => {
  /** A yard whose fire has just had its fill, with the motion that saw it happen. */
  function fireOut(seed = 1): { yard: Yard; motion: YardMotion } {
    const yard = watered(layOut('one-thing', 0), 0, THINGS.fire.fill)
    const motion = found(watered(layOut('one-thing', 0), 0, THINGS.fire.fill - 1), seed)
    motion.result(0, 'fill', yard)
    return { yard, motion }
  }

  it('rises from a fire that is put out as one fat cloud, which climbs, swells, thins and is gone within four seconds', () => {
    const { yard, motion } = fireOut()
    const fire = placeOf(yard, 0)
    const first = new Map<number, { y: number; size: number }>(), peak = new Map<number, number>(), last = new Map<number, { y: number; size: number }>()
    let fell = 0, most = 0, goneAt = -1
    play(motion, yard, 4, (now) => {
      most = Math.max(most, motion.steam.alive)
      motion.steam.puffs.forEach((puff, slot) => {
        if (!puff.alive || puff.age < 0) return
        if (!first.has(slot)) {
          first.set(slot, { y: puff.y, size: puff.size })
          expect(Math.abs(puff.x - fire.x)).toBeLessThan(0.6)
          expect(Math.abs(puff.z - fire.z)).toBeLessThan(0.4)
        }
        fell = Math.max(fell, (last.get(slot)?.y ?? puff.y) - puff.y)
        last.set(slot, { y: puff.y, size: puff.size })
        peak.set(slot, Math.max(peak.get(slot) ?? 0, puff.size))
      })
      if (goneAt < 0 && now > 0.5 && motion.steam.alive === 0) goneAt = now
    })
    expect(most).toBeGreaterThanOrEqual(8)
    expect(first.size).toBe(most)
    expect(fell).toBe(0)
    for (const [slot, born] of first) {
      expect(last.get(slot)!.y - born.y, `puff ${slot} climbs`).toBeGreaterThan(0.8)
      expect(peak.get(slot)!, `puff ${slot} swells`).toBeGreaterThan(born.size * 2)
      expect(last.get(slot)!.size, `puff ${slot} thins`).toBeLessThan(peak.get(slot)! * 0.3)
    }
    expect(goneAt).toBeGreaterThan(1.5)
    expect(goneAt).toBeLessThanOrEqual(4)
    expect(motion.steam.puffs.some((puff) => puff.alive)).toBe(false)
  })

  it('is a small puff for one gulp on the flame, and tiny pips for a neighbour\'s drops', () => {
    const yard = watered(layOut('one-thing', 0), 0, 1)
    const sizes = (action: 'gulp' | 'fill' | 'neighbour' | 'sweep') => {
      const motion = found(yard)
      motion.result(0, action, yard)
      let count = 0, biggest = 0
      play(motion, yard, 3, () => {
        count = Math.max(count, motion.steam.alive)
        for (const puff of motion.steam.puffs) if (puff.alive && puff.age >= 0) biggest = Math.max(biggest, puff.size)
      })
      return { count, biggest }
    }
    const gulp = sizes('gulp'), cloud = sizes('fill'), pips = sizes('neighbour')
    expect(gulp.count).toBeLessThan(cloud.count / 2)
    expect(gulp.biggest).toBeLessThan(cloud.biggest)
    expect(pips.biggest).toBeLessThan(gulp.biggest)
    expect(pips.count).toBeGreaterThan(0)
    // A stream that only passes the flame makes none.
    expect(sizes('sweep').count).toBe(0)
  })

  it('is never more than the stage can draw, however many fires go out at once', () => {
    const { yard, motion } = fireOut()
    let most = 0
    play(motion, yard, 6, () => {
      motion.result(0, 'fill', yard)
      motion.result(0, 'gulp', yard)
      motion.result(0, 'neighbour', yard)
      most = Math.max(most, motion.steam.puffs.filter((puff) => puff.alive).length)
      expect(motion.steam.alive).toBeLessThanOrEqual(PUFFS)
    })
    expect(most).toBe(PUFFS)
    expect(motion.steam.puffs).toHaveLength(PUFFS)
    play(motion, yard, 4)
    expect(motion.steam.alive).toBe(0)
  })

  it('is the same puffs for the same yard, and other puffs for another', () => {
    const a = fireOut(5), b = fireOut(5), other = fireOut(6)
    for (const { yard, motion } of [a, b, other]) play(motion, yard, 0.7)
    expect(a.motion.steam.puffs).toEqual(b.motion.steam.puffs)
    expect(a.motion.steam.puffs).not.toEqual(other.motion.steam.puffs)
  })

  it('goes on rising a little from the wet logs while the ending plays, and stops with it', () => {
    const { yard, motion } = fireOut()
    play(motion, yard, 4)
    expect(motion.steam.alive).toBe(0)
    let during = 0
    play(motion, yard, 3, () => { during = Math.max(during, motion.steam.alive) }, { ...REST, steam: 0.5 })
    expect(during).toBeGreaterThan(0)
    expect(during).toBeLessThanOrEqual(PUFFS)
    play(motion, yard, 4, undefined, { ...REST, steam: 1 })
    expect(motion.steam.alive).toBe(0)
  })
})

describe('ripples', () => {
  const pool = () => {
    const yard = watered(layOut('one-thing', 2), 0, 2)
    return { yard, motion: found(yard) }
  }
  const live = (motion: YardMotion) => motion.ripples.rings.filter((ring) => ring.alive && ring.age >= 0)

  it('are one ring for a gulp on the pool, which widens and is gone within a second', () => {
    const { yard, motion } = pool()
    motion.result(0, 'gulp', yard)
    let before = 0, shrank = 0, widest = 0, goneAt = -1
    play(motion, yard, 1, (now) => {
      const rings = live(motion)
      expect(rings.length).toBeLessThanOrEqual(1)
      if (rings.length === 0) {
        if (goneAt < 0) goneAt = now
        return
      }
      shrank = Math.max(shrank, before - rings[0].radius)
      before = rings[0].radius
      widest = Math.max(widest, rings[0].radius)
    })
    expect(shrank).toBe(0)
    expect(widest).toBeGreaterThan(0.8)
    // It stays inside the pool.
    expect(widest).toBeLessThanOrEqual(1.1)
    expect(goneAt).toBeGreaterThan(0.5)
    expect(goneAt).toBeLessThanOrEqual(1)
  })

  it('are a row of small rings for a sweep and a patter of smaller ones for a neighbour\'s drops', () => {
    const rings = (action: 'gulp' | 'sweep' | 'neighbour') => {
      const { yard, motion } = pool()
      motion.result(0, action, yard)
      const seen = new Set<number>()
      let widest = 0
      play(motion, yard, 1.5, () => {
        motion.ripples.rings.forEach((ring, slot) => {
          if (!ring.alive || ring.age < 0) return
          seen.add(slot)
          widest = Math.max(widest, ring.radius)
        })
      })
      expect(live(motion)).toHaveLength(0)
      return { count: seen.size, widest }
    }
    const gulp = rings('gulp'), sweep = rings('sweep'), drops = rings('neighbour')
    expect(gulp.count).toBe(1)
    expect(sweep.count).toBe(3)
    expect(drops.count).toBe(4)
    expect(sweep.widest).toBeLessThan(gulp.widest * 0.6)
    expect(drops.widest).toBeLessThan(sweep.widest * 0.7)
  })

  it('are never more than the stage can draw, however fast the water comes', () => {
    const { yard, motion } = pool()
    let most = 0
    play(motion, yard, 5, () => {
      motion.result(0, 'neighbour', yard)
      motion.result(0, 'sweep', yard)
      motion.result(0, 'gulp', yard)
      most = Math.max(most, motion.ripples.rings.filter((ring) => ring.alive).length)
    })
    expect(most).toBe(RINGS)
    expect(motion.ripples.rings).toHaveLength(RINGS)
    play(motion, yard, 2)
    expect(motion.ripples.rings.some((ring) => ring.alive)).toBe(false)
  })
})

describe('the bell', () => {
  /** Plays a while and gives the widest the bell swung. */
  function swingOver(motion: YardMotion, yard: Yard, seconds: number): number {
    let widest = 0
    play(motion, yard, seconds, () => { widest = Math.max(widest, Math.abs(motion.bell.swing)) })
    return widest
  }

  it('lifts the latch a third at each ring, all the way at the third, and swings each time until the swing dies away', () => {
    const yard = layOut('one-thing', 0)
    const motion = found(yard)
    expect(motion.bell).toEqual({ swing: 0, latch: 0 })
    for (const ring of [1, 2, 3]) {
      motion.rang(ring)
      expect(swingOver(motion, yard, 1), `ring ${ring}`).toBeGreaterThan(0.03)
      expect(motion.bell.latch, `ring ${ring}`).toBeCloseTo(ring / 3, 2)
      expect(swingOver(motion, yard, 6)).toBeLessThan(0.1)
      expect(Math.abs(motion.bell.swing), `ring ${ring}`).toBeLessThan(0.002)
      expect(motion.bell.latch, `ring ${ring}`).toBeCloseTo(ring / 3, 4)
    }
    expect(motion.bell.latch).toBeCloseTo(1, 4)
  })

  it('swings both ways', () => {
    const yard = layOut('one-thing', 0)
    const motion = found(yard)
    motion.rang(1)
    let oneWay = 0, otherWay = 0
    play(motion, yard, 2, () => {
      oneWay = Math.max(oneWay, motion.bell.swing)
      otherWay = Math.min(otherWay, motion.bell.swing)
    })
    expect(oneWay).toBeGreaterThan(0.03)
    expect(otherWay).toBeLessThan(-0.015)
  })

  it('drops the latch again when it is let down, and a settled yard starts with it down', () => {
    const yard = layOut('one-thing', 0)
    const motion = found(yard)
    motion.rang(1)
    motion.rang(2)
    play(motion, yard, 1.5)
    expect(motion.bell.latch).toBeCloseTo(2 / 3, 2)
    motion.latchDown()
    let highest = 0
    play(motion, yard, 1.5, () => { highest = Math.max(highest, motion.bell.latch) })
    expect(highest).toBeLessThanOrEqual(2 / 3 + 0.01)
    expect(motion.bell.latch).toBeCloseTo(0, 3)
    // The lift of the latch is not kept: the same yard found again has it down.
    motion.rang(3)
    play(motion, yard, 1.5)
    expect(found(yard).bell.latch).toBe(0)
  })

  it('never lifts the latch past open, however often it rings', () => {
    const yard = layOut('one-thing', 0)
    const motion = found(yard)
    let highest = 0
    for (let ring = 1; ring <= 12; ring++) {
      motion.rang(ring)
      play(motion, yard, 0.1, () => { highest = Math.max(highest, motion.bell.latch) })
    }
    play(motion, yard, 2)
    expect(highest).toBeLessThanOrEqual(1.1)
    expect(motion.bell.latch).toBeCloseTo(1, 3)
  })
})

describe('the first showing of a thing', () => {
  /** The most one part of a pose reaches in the half second after something is done. */
  function peak(yard: Yard, act: (motion: YardMotion) => void, read: (motion: YardMotion) => number): number {
    const motion = found(yard)
    act(motion)
    let most = 0
    play(motion, yard, 0.5, () => { most = Math.max(most, read(motion)) })
    return most
  }

  it('is the one-gulp answer at half size: the flame ducks half as flat', () => {
    const yard = layOut('one-thing', 0)
    const whole = peak(yard, (motion) => motion.result(0, 'gulp', yard), (motion) => motion.fire.pose.flat)
    const half = peak(yard, (motion) => motion.shown(0, yard), (motion) => motion.fire.pose.flat)
    expect(whole).toBeGreaterThan(0.2)
    expect(half / whole).toBeCloseTo(0.5, 2)
  })

  it('is the one-gulp answer at half size: the cat leaps half as high', () => {
    const yard = layOut('two-things', 0)
    const cat = indexOf(yard, 'cat')
    const whole = peak(yard, (motion) => motion.result(cat, 'gulp', yard), (motion) => motion.cat.pose.y)
    const half = peak(yard, (motion) => motion.shown(cat, yard), (motion) => motion.cat.pose.y)
    expect(whole).toBeGreaterThan(0.2)
    expect(half / whole).toBeCloseTo(0.5, 2)
  })

  it('gives no water: the flame stands as tall after it as before', () => {
    const yard = layOut('one-thing', 0)
    const motion = found(yard)
    motion.shown(0, yard)
    play(motion, yard, 3, () => expect(motion.fire.pose.flame).toBeCloseTo(1, 9))
    expect(motion.fire.pose.flat).toBeCloseTo(0, 3)
  })
})

describe('a thing that goes somewhere else', () => {
  /** Waters the cat to her fill by the rules, telling the motion of each gulp, and returns the yards before and after she moved. */
  function soakCat(start: Yard, motion: YardMotion): { before: Yard; after: Yard } {
    const cat = indexOf(start, 'cat')
    let yard = start
    for (let gulp = 1; gulp < THINGS.cat.fill; gulp++) {
      const step = gulpOn(yard, cat)
      tell(motion, yard, step)
      yard = step.yard
      play(motion, yard, 0.6)
    }
    const step = gulpOn(yard, cat)
    expect(step.events.some((event) => event.type === 'moved' && event.thing === cat)).toBe(true)
    tell(motion, yard, step)
    return { before: yard, after: step.yard }
  }

  it('takes the soaked cat from her old place to her new one over time, and she arrives exactly', () => {
    const start = layOut('two-things', 0)
    const cat = indexOf(start, 'cat')
    const motion = found(start)
    const { before, after } = soakCat(start, motion)
    const from = placeOf(before, cat), to = placeOf(after, cat)
    expect(distance(from, to)).toBeGreaterThan(2)
    motion.step(FRAME, after, REST)
    // She has not jumped there: a frame on she is still by her old place.
    expect(distance(motion.cat.pose, from)).toBeLessThan(0.2)
    let longest = 0, last: Place = { x: motion.cat.pose.x, z: motion.cat.pose.z }, arrivedAt = -1, hopped = 0
    play(motion, after, 5, (now) => {
      longest = Math.max(longest, distance(motion.cat.pose, last))
      last = { x: motion.cat.pose.x, z: motion.cat.pose.z }
      hopped = Math.max(hopped, motion.cat.pose.y)
      if (arrivedAt < 0 && distance(motion.cat.pose, to) === 0) arrivedAt = now
    })
    expect(longest).toBeLessThan(0.15)
    expect(hopped).toBeGreaterThan(0.05)
    expect(arrivedAt).toBeGreaterThan(0.5)
    expect({ x: motion.cat.pose.x, z: motion.cat.pose.z }).toEqual(to)
    expect(motion.cat.pose.y).toBe(0)
  })

  it('walks the cat round a thing that stands between, not through it', () => {
    // The fire burns on the spot between the cat and the driest free place.
    const start = layOut('two-things', 2)
    const cat = indexOf(start, 'cat'), fire = placeOf(start, indexOf(start, 'fire'))
    const motion = found(start)
    const { before, after } = soakCat(start, motion)
    const from = placeOf(before, cat), to = placeOf(after, cat)
    const straight = Math.abs((fire.x - from.x) * (to.z - from.z) - (fire.z - from.z) * (to.x - from.x)) / distance(from, to)
    expect(straight).toBeLessThan(1)
    let nearest = Infinity
    play(motion, after, 6, () => { nearest = Math.min(nearest, distance(motion.cat.pose, fire)) })
    expect(nearest).toBeGreaterThan(1.5)
    expect({ x: motion.cat.pose.x, z: motion.cat.pose.z }).toEqual(to)
  })

  it('jumps the cat onto the truck\'s roof when she gets too much, in one high arc', () => {
    const start = layOut('two-things', 0)
    const cat = indexOf(start, 'cat')
    const motion = found(start)
    const { after } = soakCat(start, motion)
    play(motion, after, 5)
    const step = gulpOn(after, cat)
    expect(step.yard.things[cat].spot).toBe('roof')
    tell(motion, after, step)
    let highest = 0
    play(motion, step.yard, 4, () => { highest = Math.max(highest, motion.cat.pose.y) })
    expect(highest).toBeGreaterThan(1)
    expect({ x: motion.cat.pose.x, z: motion.cat.pose.z }).toEqual(placeOf(step.yard, cat))
  })
})

describe('a boat that the overflow carries off', () => {
  it('rides from where it floated, up over the rim, to where it lies aground, in about a second', () => {
    let yard = layOut('afloat', 0)
    const pool = indexOf(yard, 'pool'), boat = indexOf(yard, 'boat')
    const motion = found(yard)
    let before = yard, carried = false
    for (let gulp = 0; gulp <= THINGS.pool.fill && !carried; gulp++) {
      const step = gulpOn(yard, pool)
      tell(motion, yard, step)
      carried = step.events.some((event) => event.type === 'moved' && event.thing === boat)
      before = yard
      yard = step.yard
      if (!carried) play(motion, yard, 0.5)
    }
    expect(carried).toBe(true)
    const from = placeOf(before, boat), to = placeOf(yard, boat)
    expect(distance(from, to)).toBeGreaterThan(1)
    const where = (): Place => ({ x: to.x + motion.boat.pose.carryX + motion.boat.pose.pushX, z: to.z + motion.boat.pose.carryZ + motion.boat.pose.pushZ })
    motion.step(FRAME, yard, REST)
    // A frame on it has not jumped: it is still by where it floated.
    expect(distance(where(), from)).toBeLessThan(0.1)
    let last = where(), longest = 0, highest = 0, landedAt = -1
    play(motion, yard, 3, (now) => {
      longest = Math.max(longest, distance(where(), last))
      last = where()
      highest = Math.max(highest, motion.boat.pose.carryY)
      if (landedAt < 0 && distance(where(), to) < 1e-9 && motion.boat.pose.carryY === 0) landedAt = now
    })
    expect(longest).toBeLessThan(0.1)
    expect(highest).toBeGreaterThan(0.3)
    expect(landedAt).toBeGreaterThan(0.6)
    expect(landedAt).toBeLessThan(1.5)
  })
})

describe('the way the snail glides', () => {
  const patchYards = everyYard.filter((yard) => indexOf(yard, 'patch') >= 0)
  const OUT: Channels = { ...REST, snailOut: 1 }
  const THERE: Channels = { ...REST, snailOut: 1, glide: 1 }

  /** Where the snail starts and where it ends up in this yard, in yard units. */
  function wayOf(yard: Yard): { from: Place; to: Place; home: Place } {
    const motion = new YardMotion(yard)
    motion.settle(yard, REST)
    const home = placeOf(yard, motion.has.patch)
    motion.step(FRAME, yard, OUT)
    const from = { x: home.x + motion.snail.pose.x, z: home.z + motion.snail.pose.z }
    motion.step(FRAME, yard, THERE)
    return { from, to: { x: home.x + motion.snail.pose.x, z: home.z + motion.snail.pose.z }, home }
  }

  /** The nearest the way comes to anything else that stands in the yard, the truck and the bell among them. */
  function clearance(yard: Yard, from: Place, to: Place): number {
    const patch = indexOf(yard, 'patch')
    const others = [TRUCK, BELL, ...yard.things.map((_, index) => index).filter((index) => index !== patch).map((index) => placeOf(yard, index))]
    let least = Infinity
    for (let step = 0; step <= 40; step++) {
      const point = { x: from.x + ((to.x - from.x) * step) / 40, z: from.z + ((to.z - from.z) * step) / 40 }
      for (const other of others) least = Math.min(least, distance(point, other))
    }
    return least
  }

  const puddleAt = (yard: Yard, cells: readonly number[], gulps: number): Yard => ({ ...yard, ground: cells.reduce((ground, cell) => pour(ground, centreOf(cell).x, centreOf(cell).z, gulps), yard.ground) })

  it('stays on its own patch in a yard with no puddle on the sand', () => {
    expect(patchYards.length).toBeGreaterThanOrEqual(4)
    for (const yard of patchYards) {
      const { from, to, home } = wayOf(yard)
      expect(distance(from, home)).toBeLessThan(0.8)
      expect(distance(to, home)).toBeLessThan(0.8)
      expect(distance(from, to)).toBeGreaterThan(0.5)
      expect(clearance(yard, from, to)).toBeGreaterThan(1.5)
    }
  })

  it('is clear of every other thing, the truck and the bell, wherever on the sand a puddle or mud stands', () => {
    let toPuddle = 0
    for (const start of patchYards) {
      for (const gulps of [PUDDLE_AT, MUD_AT]) {
        for (let cell = 0; cell < COLS * ROWS; cell++) {
          const yard = puddleAt(start, [cell], gulps)
          const { from, to, home } = wayOf(yard)
          expect(clearance(yard, from, to), `${start.place} ${start.arrangement}, water in cell ${cell}`).toBeGreaterThan(1.5)
          if (distance(to, home) > 1) {
            // When it leaves its patch it goes to the wet place and to nowhere else.
            expect(to.x).toBeCloseTo(centreOf(cell).x, 9)
            expect(to.z).toBeCloseTo(centreOf(cell).z, 9)
            toPuddle++
          }
        }
      }
    }
    expect(toPuddle).toBeGreaterThan(20)
  })

  it('is clear of everything with many puddles on the sand at once', () => {
    let state = 12345
    const random = () => {
      state ^= state << 13
      state ^= state >>> 17
      state ^= state << 5
      return (state >>> 0) / 2 ** 32
    }
    for (const start of patchYards) {
      for (let round = 0; round < 40; round++) {
        const cells = Array.from({ length: 1 + Math.floor(random() * 12) }, () => Math.floor(random() * COLS * ROWS))
        const yard = puddleAt(puddleAt(start, cells.slice(0, 6), PUDDLE_AT), cells.slice(6), MUD_AT)
        const { from, to } = wayOf(yard)
        expect(clearance(yard, from, to), `${start.place} ${start.arrangement}, water in cells ${cells.join(' ')}`).toBeGreaterThan(1.5)
      }
    }
  })

  it('goes to mud before a puddle, the wettest place', () => {
    const start = layOut('one-thing', 3)
    const home = placeOf(start, 0)
    const cellNear = (dx: number, dz: number) => Math.floor(home.z + dz) * COLS + Math.floor(home.x + dx)
    const puddle = cellNear(2, 0), mud = cellNear(-2, 1)
    const yard = puddleAt(puddleAt(start, [puddle], PUDDLE_AT), [mud], MUD_AT)
    const { to } = wayOf(yard)
    expect(to.x).toBeCloseTo(centreOf(mud).x, 9)
    expect(to.z).toBeCloseTo(centreOf(mud).z, 9)
    const onlyPuddle = wayOf(puddleAt(start, [puddle], PUDDLE_AT)).to
    expect(onlyPuddle.x).toBeCloseTo(centreOf(puddle).x, 9)
  })
})
