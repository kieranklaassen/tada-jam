import { describe, expect, it } from 'vitest'
import { BeeMotion, CatMotion, DuckMotion, RIDE_S, STARTLE_S, SnailMotion, TEMPO, LAP_RADIUS, LAP_SWING, SIZE_ON_ROOF, PAWS_S } from './animalMotion'
import { ROOF_HEIGHT } from './places'
import { restChannels, type Channel, type Channels } from './scenes'

const FRAME = 1 / 60

/** Steps frames of 1/60 s. `step` plays one frame, and `each` sees the clock after it. */
function play(step: () => void, seconds: number, each?: (now: number) => void): void {
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    step()
    each?.((frame + 1) * FRAME)
  }
}

/** The scene channels at rest, with some of them set. */
function channelsWith(set: Partial<Record<Channel, number>> = {}): Channels {
  return { ...restChannels(), ...set }
}

const REST = restChannels()

/** Where the low side of the pool's rim is from the duck, and how high, as the yard gives it. */
const RIM = { far: 1.05, high: 1 }
/** How high the water of a full pool holds the duck. */
const DEEP = 0.92
/** How high a bud stands. */
const BUD_TOP = 1.4

const HOME = { x: 10.2, z: 2.6 }
const FACES = 2

/** The cat on the sand at her place, with no fire near and nothing happening. */
function cat(onRoof = false): { motion: CatMotion; step: () => void } {
  const motion = new CatMotion()
  motion.settle(HOME, FACES, onRoof)
  return { motion, step: () => motion.step(FRAME, false, false, false, 0.5) }
}

const dryDuck = (duck: DuckMotion, channels: Channels = REST) => () => duck.step(FRAME, false, 0, RIM, channels)
const wetDuck = (duck: DuckMotion, channels: Channels = REST) => () => duck.step(FRAME, true, DEEP, RIM, channels)

// --- No two animals move alike ---------------------------------------------------

/** One part of a pose over time. */
type Track = number[]

/** How often a track crosses its own middle value, turned into the seconds one swing takes. A part that never crosses has no period. */
function periodOf(track: Track, seconds: number): number {
  const mean = track.reduce((sum, value) => sum + value, 0) / track.length
  let crossings = 0
  for (let i = 1; i < track.length; i++) if (track[i - 1] - mean < 0 !== track[i] - mean < 0) crossings++
  return crossings < 2 ? Infinity : (2 * seconds) / crossings
}

/** What an animal's idle looks like over ten seconds: the parts of it that move, and the period of the busiest of them. */
function idleOf(pose: object, step: () => void): { moving: string[]; busiest: string | null; period: number } {
  const tracks: Record<string, Track> = Object.fromEntries(Object.keys(pose).map((key) => [key, []]))
  play(step, 10, () => {
    for (const [key, value] of Object.entries(pose)) tracks[key].push(Number(value))
  })
  const moving = Object.keys(tracks).filter((key) => Math.max(...tracks[key]) - Math.min(...tracks[key]) > 0.005)
  let busiest: string | null = null
  let period = Infinity
  for (const key of moving) {
    const swing = periodOf(tracks[key], 10)
    if (swing < period) {
      period = swing
      busiest = key
    }
  }
  return { moving, busiest, period }
}

function idles() {
  const { motion: catMotion, step: stepCat } = cat()
  const duck = new DuckMotion(), bee = new BeeMotion(), snail = new SnailMotion()
  return {
    cat: idleOf(catMotion.pose, stepCat),
    duck: idleOf(duck.pose, wetDuck(duck)),
    bee: idleOf(bee.pose, () => bee.step(FRAME, BUD_TOP, false, REST)),
    snail: idleOf(snail.pose, () => snail.step(FRAME, 0, false, REST)),
  }
}

describe('the four animals', () => {
  it('no two share a move: what moves at idle, and how often it comes round, is different for each', () => {
    const idle = idles()
    const names = Object.keys(idle) as (keyof typeof idle)[]
    const signatures = names.map((name) => `${idle[name].moving.join(' ')} every ${idle[name].period.toFixed(1)}`)
    expect(new Set(signatures).size, signatures.join(' | ')).toBe(names.length)
    // The parts that move are a different set for each, and the busiest part of each swings at a pace of its own.
    for (const [at, a] of names.entries()) {
      for (const b of names.slice(at + 1)) {
        expect(idle[a].moving, `${a} and ${b}`).not.toEqual(idle[b].moving)
        const slower = Math.max(idle[a].period, idle[b].period), quicker = Math.min(idle[a].period, idle[b].period)
        expect(slower, `${a} and ${b}`).toBeGreaterThan(quicker * 1.3)
      }
    }
  })

  it('each idle like itself: the cat breathes and flicks her tail, the duck bobs, the bee flies round, the snail keeps still', () => {
    const idle = idles()
    expect(idle.cat.moving).toEqual(expect.arrayContaining(['squash', 'tail']))
    expect(idle.cat.moving).not.toContain('x')
    expect(idle.cat.moving).not.toContain('y')
    expect(idle.duck.busiest).toBe('y')
    expect(idle.bee.moving).toEqual(expect.arrayContaining(['x', 'y', 'z', 'turn']))
    expect(idle.snail.moving).toEqual([])
    // The quickest is the duck, then the bee, then the cat. The snail has no beat at all.
    expect(idle.duck.period).toBeLessThan(idle.bee.period)
    expect(idle.bee.period).toBeLessThan(idle.cat.period)
    expect(idle.snail.period).toBe(Infinity)
  })

  it('a duck on a dry floor moves other parts of itself than the cat, the bee or the snail do', () => {
    const duck = new DuckMotion()
    const dry = idleOf(duck.pose, dryDuck(duck))
    expect(dry.moving).toEqual(expect.arrayContaining(['tilt', 'beak']))
    for (const other of Object.values(idles())) expect(dry.moving).not.toEqual(other.moving)
  })

  it('give the duck by far the quickest beat and the snail by far the slowest', () => {
    const others = (name: keyof typeof TEMPO) => (Object.keys(TEMPO) as (keyof typeof TEMPO)[]).filter((other) => other !== name).map((other) => TEMPO[other])
    for (const tempo of others('duck')) expect(TEMPO.duck).toBeGreaterThan(tempo * 1.3)
    for (const tempo of others('snail')) expect(TEMPO.snail * 1.3).toBeLessThan(tempo)
  })

  it('have no opinion of the one who plays: no part of any pose is about them', () => {
    const keys = [new CatMotion().pose, new DuckMotion().pose, new BeeMotion().pose, new SnailMotion().pose].flatMap((pose) => Object.keys(pose))
    expect(keys.length).toBeGreaterThan(20)
    for (const key of keys) expect(key.toLowerCase()).not.toMatch(/child|player|praise|score/)
  })
})

// --- The cat -------------------------------------------------------------------

describe('the cat', () => {
  it('leaps straight up at one gulp, within a third of a second, and lands again where she stood', () => {
    const { motion, step } = cat()
    step()
    motion.answer('gulp')
    let highest = 0, ears = 0
    play(step, 1 / 3, () => {
      highest = Math.max(highest, motion.pose.y)
      ears = Math.max(ears, motion.pose.ears)
      expect(motion.pose.x).toBe(HOME.x)
      expect(motion.pose.z).toBe(HOME.z)
    })
    expect(highest).toBeGreaterThan(0.2)
    expect(highest).toBeLessThan(0.5)
    expect(ears).toBeGreaterThan(0.5)
    play(step, 0.5)
    play(step, 3, () => expect(motion.pose.y).toBe(0))
  })

  it('shakes one paw after the leap and glares at the truck', () => {
    const { motion, step } = cat()
    motion.answer('gulp')
    let paw = 0, glared = 0
    play(step, 1.4, () => {
      paw = Math.max(paw, motion.pose.paw)
      glared = Math.max(glared, motion.pose.headTurn)
    })
    expect(paw).toBeGreaterThan(0.9)
    // The truck is half a radian to her side in these tests.
    expect(glared).toBeCloseTo(0.5, 6)
    play(step, 1)
    expect(motion.pose.paw).toBe(0)
  })

  it('shakes herself both ways at her fill, and is then still', () => {
    const { motion, step } = cat()
    motion.answer('fill')
    let left = 0, right = 0, highest = 0
    play(step, 0.8, () => {
      left = Math.min(left, motion.pose.shake)
      right = Math.max(right, motion.pose.shake)
      highest = Math.max(highest, motion.pose.y)
    })
    expect(left).toBeLessThan(-0.2)
    expect(right).toBeGreaterThan(0.2)
    // A shake is not a leap.
    expect(highest).toBe(0)
    play(step, 2, () => expect(motion.pose.shake).toBe(0))
  })

  it('is squashed flat for a moment by a sweep, with her ears down and her tail like a brush', () => {
    const { motion, step } = cat()
    motion.answer('sweep')
    let flattest = 1, ears = 0, tail = 0
    play(step, 0.7, () => {
      flattest = Math.min(flattest, motion.pose.squash)
      ears = Math.max(ears, motion.pose.ears)
      tail = Math.max(tail, motion.pose.tail)
      expect(motion.pose.y).toBe(0)
    })
    expect(flattest).toBeLessThan(0.65)
    expect(ears).toBeGreaterThan(0.9)
    expect(tail).toBe(1)
    play(step, 0.3)
    expect(motion.pose.squash).toBeGreaterThan(0.98)
    expect(motion.pose.ears).toBeCloseTo(0, 6)
  })

  it('tips her head for a moment at a drop from a neighbour: a sneeze', () => {
    const { motion, step } = cat()
    motion.answer('neighbour')
    let tipped = 0
    play(step, 0.45, () => {
      tipped = Math.min(tipped, motion.pose.headTilt)
      expect(motion.pose.y).toBe(0)
      expect(motion.pose.shake).toBe(0)
    })
    expect(tipped).toBeLessThan(-0.4)
    play(step, 0.2)
    expect(motion.pose.headTilt).toBe(0)
  })

  it('does not leap on the truck\'s roof, whatever comes: she goes on washing her paw', () => {
    for (const action of ['gulp', 'fill', 'too-much', 'sweep', 'neighbour'] as const) {
      const { motion, step } = cat(true)
      motion.answer(action)
      let highest = 0, washed = 0
      play(step, 3, () => {
        // Her height is the roof's, where she sits.
        highest = Math.max(highest, motion.pose.y - ROOF_HEIGHT)
        washed = Math.max(washed, motion.pose.paw)
        expect(motion.pose.shake).toBe(0)
        expect(motion.pose.headTilt).toBe(0)
        expect(motion.pose.squash).toBeGreaterThan(0.95)
      })
      expect(highest, action).toBeLessThan(0.06)
      expect(washed, action).toBeGreaterThan(0.9)
    }
  })

  it('walks from one place to another along a line, in hops, and arrives exactly', () => {
    const { motion, step } = cat()
    const to = { x: 6.6, z: 2.8 }
    step()
    motion.move(to, FACES, false)
    const far = Math.hypot(to.x - HOME.x, to.z - HOME.z)
    let offLine = 0, highest = 0, along = 0, wentBack = 0, hops = 0, up = false
    play(step, 3, () => {
      const { x, z, y } = motion.pose
      offLine = Math.max(offLine, Math.abs((x - HOME.x) * (to.z - HOME.z) - (z - HOME.z) * (to.x - HOME.x)) / far)
      const now = ((x - HOME.x) * (to.x - HOME.x) + (z - HOME.z) * (to.z - HOME.z)) / far
      wentBack = Math.max(wentBack, along - now)
      along = now
      highest = Math.max(highest, y)
      if (y > 0.08 && !up) hops++
      up = y > 0.08
    })
    expect(offLine).toBeLessThan(1e-9)
    expect(wentBack).toBeLessThan(1e-9)
    expect(highest).toBeGreaterThan(0.1)
    expect(highest).toBeLessThan(0.3)
    expect(hops).toBeGreaterThanOrEqual(2)
    expect(motion.pose.x).toBe(to.x)
    expect(motion.pose.z).toBe(to.z)
    expect(motion.pose.y).toBe(0)
    expect(motion.pose.turn).toBe(FACES)
  })

  it('starts a walk from where she is, without a jump in her place', () => {
    const { motion, step } = cat()
    step()
    motion.move({ x: 6.6, z: 2.8 }, FACES, false)
    let before = { x: motion.pose.x, z: motion.pose.z }, longest = 0
    play(step, 3, () => {
      longest = Math.max(longest, Math.hypot(motion.pose.x - before.x, motion.pose.z - before.z))
      before = { x: motion.pose.x, z: motion.pose.z }
    })
    // No frame carries her further than a quick animal goes in a sixtieth of a second.
    expect(longest).toBeLessThan(0.12)
  })

  it('jumps to the roof in one arc, far higher than a walk hops', () => {
    const walker = cat(), jumper = cat()
    walker.motion.move({ x: 6.6, z: 2.8 }, FACES, false)
    jumper.motion.move({ x: 1.35, z: 5.7 }, Math.PI, true)
    let hop = 0, arc = 0, peaks = 0, rising = false
    play(() => { walker.step(); jumper.step() }, 4, () => {
      hop = Math.max(hop, walker.motion.pose.y)
      if (rising && jumper.motion.pose.y < arc) peaks++
      rising = jumper.motion.pose.y > arc
      arc = Math.max(arc, jumper.motion.pose.y)
    })
    // The arc goes well above the roof she lands on, clear of the truck's light and nozzle.
    expect(arc).toBeGreaterThan(ROOF_HEIGHT + 1)
    expect(arc).toBeGreaterThan(hop * 4)
    expect(peaks).toBe(1)
    expect(jumper.motion.pose.x).toBe(1.35)
    expect(jumper.motion.pose.z).toBe(5.7)
    expect(jumper.motion.pose.y).toBe(ROOF_HEIGHT)
    // She is a small cat up there.
    expect(jumper.motion.pose.size).toBeCloseTo(SIZE_ON_ROOF, 2)
  })

  it('shuts her eyes by a fire, and opens them when it is out', () => {
    const motion = new CatMotion()
    motion.settle(HOME, FACES, false)
    play(() => motion.step(FRAME, true, false, false, 0.5), 3)
    expect(motion.pose.eyesShut).toBeGreaterThan(0.9)
    play(() => motion.step(FRAME, false, false, false, 0.5), 3)
    expect(motion.pose.eyesShut).toBeLessThan(0.1)
  })

  it('looks at the logs and at the truck when the fire she sat by goes out, and then turns her back with her tail up', () => {
    const { motion, step } = cat()
    motion.fireOut()
    let looked = 0, turnedWhileLooking = 0
    play(step, 1.3, () => {
      looked = Math.max(looked, motion.pose.headTurn)
      turnedWhileLooking = Math.max(turnedWhileLooking, Math.abs(motion.pose.turn - FACES))
    })
    // First the two looks, with her body still.
    expect(looked).toBeGreaterThan(0.45)
    expect(turnedWhileLooking).toBeLessThan(0.01)
    expect(motion.pose.tailUp).toBeLessThan(0.05)
    // Then her whole body comes round, and that is how she stays.
    play(step, 3)
    expect(Math.cos(motion.pose.turn - FACES)).toBeLessThan(-0.98)
    expect(motion.pose.tailUp).toBeGreaterThan(0.95)
    play(step, 5)
    expect(Math.cos(motion.pose.turn - FACES)).toBeLessThan(-0.98)
    expect(motion.pose.tailUp).toBeGreaterThan(0.95)
  })

  it('is found with her back turned where the fire is out, with nothing easing in', () => {
    const motion = new CatMotion()
    motion.settle(HOME, FACES, false, { warm: false, marooned: false, napping: false, putOut: true })
    motion.step(FRAME, false, false, false, 0.5)
    const first = motion.pose.turn
    expect(Math.cos(first - FACES)).toBeLessThan(-0.98)
    expect(motion.pose.tailUp).toBeGreaterThan(0.95)
    play(() => motion.step(FRAME, false, false, false, 0.5), 2)
    expect(motion.pose.turn).toBeCloseTo(first, 6)
  })

  it('lifts her paws one at a time out of creeping run-off, and only then moves over', () => {
    const { motion, step } = cat()
    motion.answer('neighbour', 1, true)
    motion.move({ x: HOME.x + 4, z: HOME.z }, FACES, false)
    let near = 0, far = 0, both = 0, movedWhileLifting = 0
    const lifts: string[] = []
    play(step, PAWS_S, () => {
      const { paw, pawFar } = motion.pose
      near = Math.max(near, paw)
      far = Math.max(far, pawFar)
      both = Math.max(both, Math.min(paw, pawFar))
      const up = paw > 0.5 ? 'near' : pawFar > 0.5 ? 'far' : ''
      if (up && lifts[lifts.length - 1] !== up) lifts.push(up)
      movedWhileLifting = Math.max(movedWhileLifting, Math.abs(motion.pose.x - HOME.x))
    })
    expect(near).toBeGreaterThan(0.9)
    expect(far).toBeGreaterThan(0.9)
    // Never two paws up at once, and each one twice.
    expect(both).toBeLessThan(0.05)
    expect(lifts).toEqual(['near', 'far', 'near', 'far'])
    expect(movedWhileLifting).toBeLessThan(1e-9)
    // She does not sneeze at it.
    expect(motion.pose.headTilt).toBe(0)
    play(step, 4)
    expect(motion.pose.x).toBe(HOME.x + 4)
    expect(motion.pose.pawFar).toBe(0)
  })

  it('sneezes at a flung drop and lifts no paw', () => {
    const { motion, step } = cat()
    motion.answer('neighbour')
    let tilt = 0, far = 0
    play(step, 0.6, () => {
      tilt = Math.min(tilt, motion.pose.headTilt)
      far = Math.max(far, motion.pose.pawFar)
    })
    expect(tilt).toBeLessThan(-0.3)
    expect(far).toBe(0)
  })

  it('sits bolt upright when she is marooned in the boat', () => {
    const motion = new CatMotion()
    motion.settle(HOME, FACES, false)
    // Asleep in the dry boat she lies low with her eyes shut.
    play(() => motion.step(FRAME, false, false, true, 0.5), 3)
    expect(motion.pose.squash).toBeLessThan(0.9)
    expect(motion.pose.eyesShut).toBeGreaterThan(0.9)
    play(() => motion.step(FRAME, false, true, false, 0.5), 2)
    expect(motion.pose.upright).toBeCloseTo(1, 2)
    expect(motion.pose.squash).toBeGreaterThan(1.1)
    expect(motion.pose.eyesShut).toBeLessThan(0.1)
  })

  it('plays no time on a frame of no length', () => {
    const motion = new CatMotion()
    motion.settle(HOME, FACES, false)
    motion.answer('gulp')
    motion.step(0, false, false, false, 0.5)
    expect(motion.pose.y).toBe(0)
  })
})

// --- The duck ------------------------------------------------------------------

describe('the duck', () => {
  it('taps a dry pool floor with its beak, again and again', () => {
    const duck = new DuckMotion()
    const taps: number[] = []
    let beak = 0
    const peaks: number[] = []
    play(dryDuck(duck), 10, (now) => {
      if (duck.tapped) {
        if (taps.length > 0) peaks.push(beak)
        taps.push(now)
        beak = 0
      }
      beak = Math.max(beak, duck.pose.beak)
      expect(duck.pose.y).toBe(0)
    })
    peaks.push(beak)
    expect(taps.length).toBeGreaterThanOrEqual(3)
    expect(taps.length).toBeLessThanOrEqual(8)
    // Its beak goes down to the floor at every tap, and its head is up in between.
    for (const peak of peaks) expect(peak).toBeGreaterThan(0.9)
    for (let i = 1; i < taps.length; i++) expect(taps[i] - taps[i - 1]).toBeGreaterThan(1)
    play(dryDuck(duck), 1.2)
    expect(duck.pose.beak).toBe(0)
  })

  it('never taps once the water is deep', () => {
    const duck = new DuckMotion()
    play(wetDuck(duck), 10, () => {
      expect(duck.tapped).toBe(false)
      expect(duck.pose.beak).toBe(0)
    })
  })

  it('wriggles when water lands on the pool, one way and the other, and settles', () => {
    for (const afloat of [false, true]) {
      const duck = new DuckMotion()
      const step = afloat ? wetDuck(duck) : dryDuck(duck)
      step()
      duck.answer('gulp')
      let oneWay = 0, otherWay = 0
      play(step, 1, () => {
        oneWay = Math.max(oneWay, duck.pose.wiggle)
        otherWay = Math.min(otherWay, duck.pose.wiggle)
      })
      expect(oneWay).toBeGreaterThan(0.02)
      expect(otherWay).toBeLessThan(-0.003)
      play(step, 2)
      expect(Math.abs(duck.pose.wiggle)).toBeLessThan(0.001)
    }
  })

  it('wriggles less at a sweep or a neighbour\'s drops than at a gulp', () => {
    const most = (action: 'gulp' | 'sweep' | 'neighbour') => {
      const duck = new DuckMotion()
      duck.answer(action)
      let peak = 0
      play(wetDuck(duck), 1, () => { peak = Math.max(peak, duck.pose.wiggle) })
      return peak
    }
    expect(most('sweep')).toBeLessThan(most('gulp') * 0.7)
    expect(most('neighbour')).toBeLessThan(most('gulp') * 0.7)
    expect(most('sweep')).toBeGreaterThan(0)
  })

  it('bobs on the water when it is afloat, in quick little beats', () => {
    const duck = new DuckMotion()
    let lowest = Infinity, highest = -Infinity
    const heights: number[] = []
    play(wetDuck(duck), 5, () => {
      lowest = Math.min(lowest, duck.pose.y)
      highest = Math.max(highest, duck.pose.y)
      heights.push(duck.pose.y)
    })
    expect(highest - lowest).toBeGreaterThan(0.04)
    expect(highest - lowest).toBeLessThan(0.1)
    expect((highest + lowest) / 2).toBeCloseTo(DEEP, 2)
    expect(periodOf(heights, 5)).toBeCloseTo(1 / TEMPO.duck, 1)
  })

  it('rides out past the rim on too much water, and is all the way back within its ride', () => {
    const duck = new DuckMotion(), twin = new DuckMotion()
    const step = () => { wetDuck(duck)(); wetDuck(twin)() }
    play(step, 1)
    duck.answer('too-much')
    let furthest = 0, highest = 0, splashes = 0, splashedAt = 0, wriggled = 0
    play(step, RIDE_S, () => {
      furthest = Math.max(furthest, duck.pose.z - twin.pose.z)
      highest = Math.max(highest, duck.pose.y)
      // It goes out on the side toward the child, and not sideways.
      expect(duck.pose.x).toBe(twin.pose.x)
      if (duck.splashed) {
        splashes++
        splashedAt = duck.pose.z - twin.pose.z
      }
      if (splashes > 0) wriggled = Math.max(wriggled, Math.abs(duck.pose.wiggle))
    })
    expect(furthest).toBeGreaterThan(RIM.far)
    expect(furthest).toBeLessThan(RIM.far + 1.5)
    // Up over the wall on the way out.
    expect(highest).toBeGreaterThanOrEqual(RIM.high * 0.9)
    // Down on the sand, in the puddle the overflow made, it wriggles once: it likes puddles.
    expect(splashes).toBe(1)
    expect(splashedAt).toBeGreaterThan(RIM.far)
    expect(wriggled).toBeGreaterThan(0.15)
    expect(twin.splashed).toBe(false)
    step()
    // Back in its pool it is where a duck that never left is, and the last of its wriggle has all but died away.
    for (const key of ['x', 'z', 'y', 'turn', 'tilt', 'beak'] as const) expect(duck.pose[key]).toBe(twin.pose[key])
    expect(Math.abs(duck.pose.wiggle - twin.pose.wiggle)).toBeLessThan(0.02)
  })

  it('paddles along its own side of the pool in the ending, one way and back the other, and ends where it began', () => {
    const channels = channelsWith()
    const duck = new DuckMotion(), twin = new DuckMotion()
    const step = () => { wetDuck(duck, channels)(); wetDuck(twin)() }
    step()
    let nearSide = 0, farSide = 0, towardMiddle = 0
    const lasts = 3.6
    play(step, lasts, (now) => {
      nearSide = Math.max(nearSide, duck.pose.z - twin.pose.z)
      farSide = Math.min(farSide, duck.pose.z - twin.pose.z)
      towardMiddle = Math.max(towardMiddle, duck.pose.x - twin.pose.x)
      channels.lap = Math.min(1, now / lasts)
    })
    step()
    // It goes to both sides by the same way.
    expect(nearSide).toBeCloseTo(LAP_RADIUS * Math.sin(LAP_SWING), 2)
    expect(farSide).toBeCloseTo(-LAP_RADIUS * Math.sin(LAP_SWING), 2)
    // It keeps to its side: it never comes near the middle, where a boat may lie.
    expect(towardMiddle).toBeLessThan(LAP_RADIUS * 0.3)
    expect(duck.pose.x).toBeCloseTo(twin.pose.x, 9)
    expect(duck.pose.z).toBeCloseTo(twin.pose.z, 9)
    expect(duck.pose.turn).toBe(twin.pose.turn)
  })

  it('puts its head under and shakes in the ending', () => {
    const channels = channelsWith()
    const duck = new DuckMotion()
    let under = 0, oneWay = 0, otherWay = 0
    play(wetDuck(duck, channels), 1, (now) => {
      channels.dunk = now
      under = Math.max(under, duck.pose.tilt)
    })
    wetDuck(duck, channels)()
    expect(under).toBeGreaterThan(1)
    expect(duck.pose.tilt).toBeCloseTo(0, 6)
    play(wetDuck(duck, channels), 1, (now) => {
      channels.shake = now
      oneWay = Math.max(oneWay, duck.pose.wiggle)
      otherWay = Math.min(otherWay, duck.pose.wiggle)
    })
    wetDuck(duck, channels)()
    expect(oneWay).toBeGreaterThan(0.15)
    expect(otherWay).toBeLessThan(-0.15)
    expect(duck.pose.wiggle).toBeCloseTo(0, 6)
  })
})

// --- The bee -------------------------------------------------------------------

describe('the bee', () => {
  const LAP_S = 1 / TEMPO.bee

  /** How far she turns round the pot, and her distances from its middle, over some seconds. */
  function flight(bee: BeeMotion, open: boolean, seconds: number, channels: Channels = REST) {
    let turned = 0, before: number | null = null
    const far: number[] = []
    play(() => bee.step(FRAME, BUD_TOP, open, channels), seconds, () => {
      const angle = Math.atan2(bee.pose.z, bee.pose.x)
      if (before !== null) {
        let change = angle - before
        if (change > Math.PI) change -= 2 * Math.PI
        if (change < -Math.PI) change += 2 * Math.PI
        turned += change
      }
      before = angle
      far.push(Math.hypot(bee.pose.x, bee.pose.z))
    })
    return { turned, far }
  }

  /** How many separate times a run of distances dips under a line. */
  function dips(far: number[], under: number): number {
    let count = 0
    for (let i = 1; i < far.length; i++) if (far[i] < under && far[i - 1] >= under) count++
    return count
  }

  it('circles the pot all the time: once right round in every beat of hers', () => {
    for (const open of [false, true]) {
      const bee = new BeeMotion()
      for (let lap = 0; lap < 4; lap++) expect(Math.abs(flight(bee, open, LAP_S).turned), `lap ${lap}`).toBeGreaterThan(2 * Math.PI * 0.97)
    }
  })

  it('bumps the closed bud once a lap, and never bumps an open flower', () => {
    const waiting = new BeeMotion(), content = new BeeMotion()
    const round = flight(content, true, LAP_S * 4).far
    const radius = Math.min(...round)
    expect(radius).toBeGreaterThan(0.6)
    expect(Math.max(...round) - radius).toBeLessThan(1e-9)
    for (let lap = 0; lap < 4; lap++) {
      const far = flight(waiting, false, LAP_S).far
      expect(dips(far, radius * 0.5), `lap ${lap}`).toBe(1)
      // Right up to the bud, and out again to her round.
      expect(Math.min(...far)).toBeLessThan(radius * 0.3)
      expect(Math.max(...far)).toBeCloseTo(radius, 6)
    }
  })

  it('dips down to the bud as she bumps it', () => {
    const bee = new BeeMotion()
    let lowestNear = Infinity, lowestFar = Infinity
    play(() => bee.step(FRAME, BUD_TOP, false, REST), LAP_S * 2, () => {
      if (Math.hypot(bee.pose.x, bee.pose.z) < 0.4) lowestNear = Math.min(lowestNear, bee.pose.y)
      else if (Math.hypot(bee.pose.x, bee.pose.z) > 0.9) lowestFar = Math.min(lowestFar, bee.pose.y)
    })
    expect(lowestNear).toBeLessThan(lowestFar - 0.15)
    // She meets the bud at its top and does not go through it.
    expect(lowestNear).toBeGreaterThan(BUD_TOP - 0.05)
  })

  it('goes up by more than a unit when drops come, zigzagging, and is back down when the water has stopped', () => {
    const bee = new BeeMotion(), twin = new BeeMotion()
    const step = () => { bee.step(FRAME, BUD_TOP, false, REST); twin.step(FRAME, BUD_TOP, false, REST) }
    play(step, 0.5)
    bee.answer()
    let highest = 0, oneSide = 0, otherSide = 0
    play(step, STARTLE_S, () => {
      highest = Math.max(highest, bee.pose.y - twin.pose.y)
      oneSide = Math.max(oneSide, bee.pose.x - twin.pose.x)
      otherSide = Math.min(otherSide, bee.pose.x - twin.pose.x)
      expect(bee.pose.y).toBeGreaterThanOrEqual(twin.pose.y - 1e-9)
    })
    expect(highest).toBeGreaterThan(1)
    expect(highest).toBeLessThan(2)
    expect(oneSide).toBeGreaterThan(0.15)
    expect(otherSide).toBeLessThan(-0.15)
    step()
    expect(bee.pose).toEqual(twin.pose)
  })

  it('sits still in the middle of the open flower once she has landed, with her wings nearly at rest', () => {
    const bee = new BeeMotion()
    const landed = channelsWith({ beeLands: 1 })
    bee.step(FRAME, BUD_TOP, true, landed)
    const first = { ...bee.pose }
    play(() => bee.step(FRAME, BUD_TOP, true, landed), 3, () => {
      expect(bee.pose.x).toBeCloseTo(0, 12)
      expect(bee.pose.z).toBeCloseTo(0, 12)
      expect(bee.pose.y).toBe(first.y)
    })
    expect(first.y).toBeGreaterThan(BUD_TOP)
    expect(first.y).toBeLessThan(BUD_TOP + 0.42)
    expect(bee.pose.landed).toBe(1)
    expect(bee.pose.wings).toBeLessThan(0.5)
  })

  it('comes in to land smoothly as the ending brings her down, and never lands on a closed bud', () => {
    const channels = channelsWith()
    const bee = new BeeMotion()
    let far = Infinity, grew = 0
    play(() => bee.step(FRAME, BUD_TOP, true, channels), 1.6, (now) => {
      const gap = Math.hypot(bee.pose.x, bee.pose.z)
      grew = Math.max(grew, gap - far)
      far = gap
      channels.beeLands = Math.min(1, now / 1.6)
    })
    expect(grew).toBeLessThanOrEqual(1e-9)
    const closed = new BeeMotion()
    closed.step(FRAME, BUD_TOP, false, channelsWith({ beeLands: 1 }))
    expect(closed.pose.landed).toBe(0)
    expect(Math.hypot(closed.pose.x, closed.pose.z)).toBeGreaterThan(0.5)
    expect(closed.pose.wings).toBe(1)
  })
})

// --- The snail -----------------------------------------------------------------

describe('the snail', () => {
  /** Its feelers after five seconds on a patch that holds these gulps. */
  function feelersAfter(snail: SnailMotion, gulps: number, heat = false, channels: Channels = REST): number {
    play(() => snail.step(FRAME, gulps, heat, channels), 5)
    return snail.pose.feelers
  }

  it('keeps its feelers in on a dry patch, and stays in its shell', () => {
    const snail = new SnailMotion()
    play(() => snail.step(FRAME, 0, false, REST), 10, () => {
      expect(snail.pose.feelers).toBe(0)
      expect(snail.pose.out).toBe(0)
    })
  })

  it('puts its feelers out further with each gulp on its patch', () => {
    const snail = new SnailMotion()
    const out = [1, 2, 3].map((gulps) => feelersAfter(snail, gulps))
    expect(out[0]).toBeGreaterThan(0.2)
    expect(out[1]).toBeGreaterThan(out[0] + 0.05)
    expect(out[2]).toBeGreaterThan(out[1] + 0.05)
    // Water alone does not bring it all the way out: that is its ending.
    expect(out[2]).toBeLessThan(0.9)
    expect(snail.pose.out).toBe(0)
  })

  it('pulls its feelers in from the heat of a fire, slowly', () => {
    const snail = new SnailMotion()
    const out = feelersAfter(snail, 2)
    snail.step(FRAME, 2, true, REST)
    // One thing at a time, very slowly: a frame of heat has hardly moved them.
    expect(snail.pose.feelers).toBeGreaterThan(out * 0.95)
    expect(feelersAfter(snail, 2, true)).toBeLessThan(0.02)
    expect(feelersAfter(snail, 2, false)).toBeCloseTo(out, 2)
  })

  it('comes out of its shell when its ending brings it out', () => {
    const snail = new SnailMotion()
    const out = channelsWith({ snailOut: 1 })
    expect(feelersAfter(snail, 3, false, out)).toBeCloseTo(1, 2)
    expect(snail.pose.out).toBe(1)
  })

  it('glides along a way of several points, leg by leg, at one pace, and arrives exactly', () => {
    const snail = new SnailMotion()
    const from = { x: 0.25, z: 0.25 }
    const way = [{ x: 1.25, z: 0.25 }, { x: 1.25, z: 2.25 }, { x: 3.25, z: 2.25 }]
    snail.settle(from, way)
    const channels = channelsWith({ snailOut: 1 })
    const points = [from, ...way]
    let offWay = 0, pace = 0, last = { ...from }
    const paces: number[] = []
    play(() => snail.step(FRAME, 3, false, channels), 5, (now) => {
      const { x, z } = snail.pose
      // How far it is from the nearest leg of its way.
      let gap = Infinity
      for (let leg = 0; leg < way.length; leg++) {
        const a = points[leg], b = points[leg + 1]
        const long = Math.hypot(b.x - a.x, b.z - a.z)
        const share = Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / (long * long)))
        gap = Math.min(gap, Math.hypot(x - (a.x + (b.x - a.x) * share), z - (a.z + (b.z - a.z) * share)))
      }
      offWay = Math.max(offWay, gap)
      pace = Math.hypot(x - last.x, z - last.z)
      if (now > 0.1 && now < 4.9) paces.push(pace)
      last = { x, z }
      channels.glide = Math.min(1, now / 5)
    })
    snail.step(FRAME, 3, false, channels)
    expect(offWay).toBeLessThan(1e-9)
    // One pace all the way: it does not hurry down a long leg. A corner, cut across by one frame's step, is a little shorter.
    expect(Math.max(...paces) / Math.min(...paces)).toBeLessThan(1.5)
    expect(snail.pose.x).toBe(3.25)
    expect(snail.pose.z).toBe(2.25)
    // It ends facing along its last leg.
    expect(snail.pose.turn).toBeCloseTo(0, 6)
  })

  it('glides from its place to its goal in a straight line, and arrives exactly', () => {
    const snail = new SnailMotion()
    const from = { x: 0.25, z: 0.25 }, to = { x: -1.5, z: 1 }
    snail.settle(from, [to])
    const channels = channelsWith({ snailOut: 1 })
    snail.step(FRAME, 3, false, channels)
    expect(snail.pose.x).toBe(from.x)
    expect(snail.pose.z).toBe(from.z)
    const far = Math.hypot(to.x - from.x, to.z - from.z)
    let offLine = 0, along = 0, wentBack = 0, stretched = 0
    play(() => snail.step(FRAME, 3, false, channels), 5.2, (now) => {
      const { x, z } = snail.pose
      offLine = Math.max(offLine, Math.abs((x - from.x) * (to.z - from.z) - (z - from.z) * (to.x - from.x)) / far)
      const gone = ((x - from.x) * (to.x - from.x) + (z - from.z) * (to.z - from.z)) / far
      wentBack = Math.max(wentBack, along - gone)
      along = gone
      stretched = Math.max(stretched, Math.abs(snail.pose.out - 1))
      channels.glide = Math.min(1, now / 5.2)
    })
    snail.step(FRAME, 3, false, channels)
    expect(offLine).toBeLessThan(1e-9)
    expect(wentBack).toBeLessThan(1e-9)
    expect(snail.pose.x).toBe(to.x)
    expect(snail.pose.z).toBe(to.z)
    // It faces the way it goes, stretches and gathers on the way, and is itself again when it is there.
    expect(snail.pose.turn).toBeCloseTo(Math.atan2(to.z - from.z, to.x - from.x), 9)
    expect(stretched).toBeGreaterThan(0.05)
    expect(snail.pose.out).toBe(1)
  })
})
