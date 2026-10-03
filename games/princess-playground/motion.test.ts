import { describe, expect, it } from 'vitest'
import { emptyArrangement, isSound, placeOf, putInSand, putOnEnd, type Arrangement } from './arrangement'
import { Playground, seeded, type PlayEvent } from './motion'
import { FRIEND_IDS, FRIENDS, MAX_TILT, homeOn, type FriendId } from './world'

/** The first ride as it is laid out: Pim on the left end, the others in the sand on the right. */
function firstRide(): Arrangement {
  return putOnEnd(emptyArrangement(), 'pim', 'left')
}

/** Plays `seconds` at 60 frames a second and returns every event. */
function play(world: Playground, seconds: number, each?: (world: Playground) => void): PlayEvent[] {
  const events: PlayEvent[] = []
  for (let t = 0; t < seconds; t += 1 / 60) {
    world.advance(1 / 60)
    events.push(...world.takeEvents())
    each?.(world)
  }
  return events
}

function peakOf(world: Playground, id: FriendId, seconds: number): number {
  let peak = 0
  play(world, seconds, (w) => { peak = Math.max(peak, w.bodies[id].y) })
  return peak
}

describe('the playground in motion', () => {
  it('tosses its riders a finger\'s width when the plank is tapped, never into the board, and leaves those in the sand where they are', () => {
    const world = new Playground(firstRide())
    world.advance(0)
    const rest = world.frame().poses.pim.y, bo = world.frame().poses.bo.y
    world.tapPlank(-2)
    let peak = -Infinity, lowest = Infinity, boPeak = -Infinity
    // The plank bobs under her too, so her lift is read against the seat she rides.
    play(world, 0.5, (w) => {
      const lift = w.frame().poses.pim.y - w.bodies.pim.y
      peak = Math.max(peak, lift)
      lowest = Math.min(lowest, lift)
      boPeak = Math.max(boPeak, w.frame().poses.bo.y)
    })
    expect(peak).toBeGreaterThan(0.1)
    expect(peak).toBeLessThan(0.2)
    expect(lowest).toBeGreaterThan(-0.03)
    expect(boPeak).toBeCloseTo(bo, 1)
    expect(rest).toBeGreaterThan(0)
  })

  it('shakes the plank four times for a chuckle, as far one way as the other, and lets it settle where it lay', () => {
    const world = new Playground(firstRide())
    world.advance(0)
    const lay = world.plank.tilt
    world.shake(0.4)
    let moved = 0
    play(world, 1, (w) => { moved = Math.max(moved, Math.abs(w.plank.tilt - lay)) })
    expect(moved).toBeGreaterThan(0.005)
    play(world, 2)
    expect(world.plank.tilt).toBeCloseTo(lay, 2)
    // A twin forked in the middle of a shake finishes it the same way.
    world.shake(0.4)
    play(world, 0.2)
    const twin = world.fork()
    play(world, 0.5)
    play(twin, 0.5)
    expect(twin.plank.tilt).toBeCloseTo(world.plank.tilt, 6)
  })

  it('shuts a friend\'s eyes for as long as a slow blink lasts', () => {
    const world = new Playground(firstRide())
    world.advance(0)
    world.blink('mog', 0.7)
    play(world, 0.5)
    expect(world.frame().poses.mog.lids).toBe(1)
    play(world, 0.4)
    expect(world.frame().poses.mog.lids).toBeLessThan(1)
  })

  it('puffs a friend out sideways, and leaves it as it was', () => {
    const world = new Playground(firstRide())
    world.advance(0)
    play(world, 1)
    const before = world.frame().poses.pim.squash
    world.act('pim', 'puff', 0.6)
    let flattest = before
    play(world, 0.6, (w) => { flattest = Math.min(flattest, w.frame().poses.pim.squash) })
    expect(flattest).toBeLessThan(before - 0.08)
    play(world, 0.5)
    expect(world.frame().poses.pim.squash).toBeCloseTo(before, 1)
  })

  it('starts at rest, as the arrangement has it, and a first frame plays no time', () => {
    const world = new Playground(firstRide())
    world.advance(0)
    expect(world.settled).toBe(true)
    expect(world.plank.tilt).toBeCloseTo(-MAX_TILT)
    expect(world.takeEvents()).toEqual([])
  })

  it('answers a touch at once, before any time has passed', () => {
    const world = new Playground(firstRide())
    world.touch('bo')
    expect(world.takeEvents()).toEqual([{ type: 'touch', id: 'bo' }])
    world.advance(1 / 60)
    expect(world.bodies.bo.squash).toBeLessThan(1)
  })

  it('a tap on Bo sends him onto his end, tips the plank and throws Pim', () => {
    const world = new Playground(firstRide())
    world.tapFriend('bo')
    const events = play(world, 6)
    const kinds = events.map((event) => event.type)
    expect(kinds).toContain('leap')
    expect(kinds).toContain('knock')
    expect(events.find((event) => event.type === 'toss')).toMatchObject({ id: 'pim' })
    // The order of the chain: he lands, then the plank knocks, then she flies.
    expect(kinds.indexOf('land')).toBeLessThan(kinds.indexOf('knock'))
    expect(kinds.indexOf('knock')).toBeLessThanOrEqual(kinds.indexOf('toss'))
    expect(world.settled).toBe(true)
    expect(world.plank.tilt).toBeCloseTo(MAX_TILT)
    expect(placeOf(world.arrangement, 'pim')).toMatchObject({ at: 'end', end: 'left' })
  })

  it('throws Pim higher the heavier the friend who lands', () => {
    const withBo = new Playground(firstRide())
    withBo.tapFriend('bo')
    const withMog = new Playground(firstRide())
    withMog.tapFriend('mog')
    const high = peakOf(withBo, 'pim', 5), low = peakOf(withMog, 'pim', 5)
    expect(high).toBeGreaterThan(low + 0.6)
    // High enough to be a fling, and not out of the top of the picture.
    expect(high).toBeGreaterThan(4)
    expect(high).toBeLessThan(8.5)
  })

  it('a friend too light to tip the plank dangles on the high end, and the plank only creaks', () => {
    const start = putInSand(putOnEnd(emptyArrangement(), 'bo', 'left'), 'pim', homeOn('pim', 'right'))
    const world = new Playground(start)
    world.tapFriend('pim')
    const events = play(world, 5)
    expect(events.some((event) => event.type === 'creak')).toBe(true)
    expect(events.some((event) => event.type === 'toss')).toBe(false)
    expect(world.plank.tilt).toBeCloseTo(-MAX_TILT)
    expect(world.bodies.pim.y).toBeGreaterThan(1.8)
  })

  it('floats level when both ends weigh the same, and says so once', () => {
    const world = new Playground(putOnEnd(emptyArrangement(), 'mog', 'left'))
    world.tapFriend('dot')
    const events = play(world, 12)
    expect(events.filter((event) => event.type === 'level').length).toBe(1)
    expect(Math.abs(world.plank.tilt)).toBeLessThan(0.02)
  })

  it('a second tap undoes the first, even in mid-hop', () => {
    const world = new Playground(firstRide())
    const before = JSON.stringify(placeOf(world.arrangement, 'mog').at)
    world.tapFriend('mog')
    play(world, 0.2)
    world.tapFriend('mog')
    play(world, 4)
    expect(JSON.stringify(placeOf(world.arrangement, 'mog').at)).toBe(before)
    expect(world.settled).toBe(true)
    expect(world.plank.tilt).toBeCloseTo(-MAX_TILT)
  })

  it('a carried friend let go over an end lands on it, and one let go over the middle slides to the low end', () => {
    const world = new Playground(firstRide())
    world.grab('mog')
    world.carryTo(3.1, -1)
    play(world, 0.6)
    expect(world.bodies.mog.y).toBeGreaterThan(2)
    world.release()
    play(world, 5)
    expect(placeOf(world.arrangement, 'mog')).toMatchObject({ at: 'end', end: 'right' })
    world.grab('dot')
    world.carryTo(0.2, -1)
    play(world, 0.6)
    world.release()
    const events = play(world, 5)
    expect(events.some((event) => event.type === 'slide')).toBe(true)
    expect(placeOf(world.arrangement, 'dot')).toMatchObject({ at: 'end', end: 'right' })
    expect(world.settled).toBe(true)
  })

  it('is the same play for the same touches', () => {
    const run = () => {
      const world = new Playground(firstRide(), 7)
      world.tapFriend('bo')
      play(world, 1.3)
      world.tapFriend('mog')
      play(world, 3)
      return JSON.stringify([world.plank, world.bodies])
    }
    expect(run()).toBe(run())
  })
})

describe('nothing passes through anything', () => {
  // A child tapping and carrying whatever is nearest, quickly, for a long while.
  it('through two minutes of seeded play nobody sinks into the sand, the plank or the friend below', () => {
    for (const seed of [1, 2, 3, 4]) {
      const random = seeded(seed * 97)
      const world = new Playground(firstRide(), seed)
      let nextTouch = 0, worst = 0
      for (let t = 0; t < 120; t += 1 / 60) {
        if (t >= nextTouch) {
          nextTouch = t + 0.15 + random() * 1.4
          const id = FRIEND_IDS[Math.floor(random() * 4)]
          const act = random()
          if (world.held) world.release()
          else if (act < 0.6) world.tapFriend(id)
          else if (act < 0.85) {
            world.grab(id)
            world.carryTo((random() - 0.5) * 11, (random() - 0.5) * 6)
          } else world.tapPlank(random() < 0.5 ? -2 : 2)
        }
        world.advance(1 / 60)
        world.takeEvents()
        expect(isSound(world.arrangement)).toBe(true)
        for (const id of FRIEND_IDS) {
          const body = world.bodies[id]
          expect(Number.isFinite(body.y) && Number.isFinite(body.squash)).toBe(true)
          worst = Math.min(worst, body.y)
          expect(body.y).toBeLessThan(12)
        }
        // Each stack keeps its order, bottom first, whatever is in the air.
        for (const end of ['left', 'right'] as const) {
          const stack = world.arrangement[end].filter((id) => world.bodies[id].mode === 'rest' || world.bodies[id].mode === 'air')
          for (let level = 1; level < stack.length; level++) {
            const below = world.bodies[stack[level - 1]], body = world.bodies[stack[level]]
            if (world.arrangement[end].indexOf(stack[level]) - world.arrangement[end].indexOf(stack[level - 1]) !== 1) continue
            expect(body.y - below.y).toBeGreaterThan(FRIENDS[stack[level - 1]].halfHeight * 0.55)
          }
        }
      }
      // A body's bottom may press a hair into the sand on a hard landing, never further.
      expect(worst).toBeGreaterThan(-0.02)
    }
  }, 30_000)
})
