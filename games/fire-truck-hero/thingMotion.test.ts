import { describe, expect, it } from 'vitest'
import { BLUR, BoatMotion, FireMotion, Gesture, PatchMotion, PoolMotion, SINK_S, SPIN, SeedMotion, WheelMotion, hump, levelForGulps } from './thingMotion'
import { ACTIONS, THINGS, type Action } from './things'

const FRAME = 1 / 60

/** The six plain things, each behind the same few calls, so one test can speak of them all. */
type Thing = { pose: object; settle(gulps: number): void; answer(action: Action, gulps: number, strength?: number): void; step(seconds: number): object }

/** The way the water pushes a boat in these tests: from the truck, off to the right and a little toward the child. */
const AWAY = { x: 0.8, z: 0.6 }

/** A boat as a thing like the others: `floating` is whether the pool under it is deep enough to float it. */
function boat(floating: boolean): Thing {
  const motion = new BoatMotion()
  return {
    pose: motion.pose,
    settle: (gulps) => motion.settle(gulps),
    answer: (action, gulps, strength) => motion.answer(action, gulps, floating, AWAY, strength),
    step: (seconds) => motion.step(seconds, floating),
  }
}

function wheel(): Thing {
  const motion = new WheelMotion()
  return { pose: motion.pose, settle: () => motion.settle(), answer: (action, gulps, strength) => motion.answer(action, gulps, strength), step: (seconds) => motion.step(seconds) }
}

const MAKERS = {
  fire: (): Thing => new FireMotion(),
  pool: (): Thing => new PoolMotion(),
  seed: (): Thing => new SeedMotion(),
  patch: (): Thing => new PatchMotion(),
  boat: (): Thing => boat(false),
  wheel,
} as const
type Plain = keyof typeof MAKERS
const PLAIN = Object.keys(MAKERS) as Plain[]

function play(thing: Thing, seconds: number, each?: (pose: Record<string, number>) => void): void {
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    thing.step(FRAME)
    each?.(thing.pose as Record<string, number>)
  }
}

/** Every number of a pose, as it stands now. A yes or no (the logs are wet) counts as 1 or 0. */
function numbers(pose: object): Record<string, number> {
  return Object.fromEntries(Object.entries(pose).flatMap(([key, value]) => (typeof value === 'number' || typeof value === 'boolean' ? [[key, Number(value)]] : [])))
}

/** A thing as a yard is found: settled where its water has it, with its pose filled in and no time played. */
function settled(make: () => Thing, gulps: number): Thing {
  const thing = make()
  thing.settle(gulps)
  thing.step(0)
  return thing
}

// --- Each cell of the grid is a motion of its own ------------------------------

/**
 * The gulps a thing holds before each way water reaches it, and the gulps the
 * rules hand on with the answer (world.ts): a first gulp, the gulp that brings
 * the fill, a gulp past the fill, a sweep (which leaves no water) and water
 * from a neighbour, which is a whole gulp of run-off for the things that soak
 * it up and only drops or a lift for the pool, the boat and the wheel.
 */
function watering(kind: Plain, action: Action): { held: number; now: number } {
  const { fill } = THINGS[kind]
  if (action === 'gulp') return { held: 0, now: 1 }
  if (action === 'fill') return { held: fill - 1, now: fill }
  if (action === 'too-much') return { held: fill, now: fill + 1 }
  if (action === 'sweep') return { held: 1, now: 1 }
  return kind === 'fire' || kind === 'seed' || kind === 'patch' ? { held: 1, now: 2 } : { held: 1, now: 1 }
}

/** How one part of a pose answered: which way it went furthest, how far, and whether it stayed there or came back. */
type Mark = { sign: 1 | -1; size: number; stays: boolean }
type Signature = Record<string, Mark>

/** Parts of a pose that move by less than this have not moved. */
const MOVED = 0.01

/**
 * What a child would see of an answer in its first 0.6 s, set against a twin
 * left alone: each part of the pose that moved, the way and size of its
 * largest change, and whether it is still out there at the end.
 */
function signatureOf(answered: Thing, twin: Thing): Signature {
  const largest: Record<string, number> = {}
  let last: Record<string, number> = {}
  for (let frame = 0; frame < Math.round(0.6 / FRAME); frame++) {
    const a = numbers(answered.step(FRAME)), b = numbers(twin.step(FRAME))
    last = {}
    for (const key of Object.keys(a)) {
      const change = a[key] - b[key]
      last[key] = change
      if (Math.abs(change) > Math.abs(largest[key] ?? 0)) largest[key] = change
    }
  }
  const signature: Signature = {}
  for (const [key, change] of Object.entries(largest)) {
    if (Math.abs(change) > MOVED) signature[key] = { sign: change > 0 ? 1 : -1, size: Math.abs(change), stays: last[key] / change > 0.66 }
  }
  return signature
}

/** Two answers look alike when the same parts move the same way, by sizes within a quarter of each other, and end alike. */
function alike(a: Signature, b: Signature): boolean {
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((key) => {
    const other = b[key]
    if (!other || other.sign !== a[key].sign || other.stays !== a[key].stays) return false
    return Math.max(other.size, a[key].size) <= Math.min(other.size, a[key].size) * 1.25
  })
}

function show(signature: Signature): string {
  return Object.entries(signature).map(([key, mark]) => `${key} ${mark.sign > 0 ? 'up' : 'down'} ${mark.size.toFixed(2)} ${mark.stays ? 'stays' : 'back'}`).join(', ')
}

function answerOf(kind: Plain, action: Action, make: () => Thing = MAKERS[kind]): Signature {
  const { held, now } = watering(kind, action)
  const answered = settled(make, held), twin = settled(make, held)
  answered.answer(action, now)
  return signatureOf(answered, twin)
}

function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 2 ** 32
  }
}

/** Every pair of answers that look alike, by name. */
function alikePairs(answers: Record<string, Signature>): string[] {
  const names = Object.keys(answers)
  return names.flatMap((a, at) => names.slice(at + 1).filter((b) => alike(answers[a], answers[b])).map((b) => `${a} and ${b}: ${show(answers[a])}`))
}

describe('each way water reaches a thing', () => {
  it.each(['fire', 'pool', 'seed', 'patch', 'wheel'] as const)('gives the %s a motion of its own: a gulp, its fill, too much, a sweep and a neighbour all look different', (kind) => {
    const answers = Object.fromEntries(ACTIONS.map((action) => [action, answerOf(kind, action)]))
    for (const action of ACTIONS) expect(Object.keys(answers[action]), `${kind} / ${action}`).not.toHaveLength(0)
    expect(alikePairs(answers)).toEqual([])
  })

  it('gives the boat a motion of its own for a gulp, too much, a sweep and a neighbour, aground and afloat', () => {
    const swamped = (): Signature => {
      // Afloat, the rules empty a boat that got too much: it sinks, and comes up holding nothing.
      const answered = settled(() => boat(true), THINGS.boat.fill), twin = settled(() => boat(true), THINGS.boat.fill)
      answered.answer('too-much', 0)
      return signatureOf(answered, twin)
    }
    const answers = {
      gulp: answerOf('boat', 'gulp'),
      'too-much aground': answerOf('boat', 'too-much'),
      'too-much afloat': swamped(),
      sweep: answerOf('boat', 'sweep'),
      neighbour: answerOf('boat', 'neighbour', () => boat(true)),
    }
    for (const [name, answer] of Object.entries(answers)) expect(Object.keys(answer), name).not.toHaveLength(0)
    expect(alikePairs(answers)).toEqual([])
    // Its fill is told from too much, a sweep and a neighbour as well. It is not set against the single gulp here.
    const fill = answerOf('boat', 'fill')
    expect(alikePairs({ fill, 'too-much aground': answers['too-much aground'], 'too-much afloat': answers['too-much afloat'], sweep: answers.sweep, neighbour: answers.neighbour })).toEqual([])
  })

  it('is told apart by what moves, which way, how far, and whether it stays', () => {
    const mark = (size: number, more: Partial<Mark> = {}): Mark => ({ sign: 1, size, stays: false, ...more })
    expect(alike({ flat: mark(0.3) }, { flat: mark(0.33) })).toBe(true)
    expect(alike({ flat: mark(0.3) }, { flat: mark(0.6) })).toBe(false)
    expect(alike({ flat: mark(0.3) }, { lean: mark(0.3) })).toBe(false)
    expect(alike({ flat: mark(0.3) }, { flat: mark(0.3, { sign: -1 }) })).toBe(false)
    expect(alike({ flat: mark(0.3) }, { flat: mark(0.3, { stays: true }) })).toBe(false)
    expect(alike({ flat: mark(0.3) }, { flat: mark(0.3), lean: mark(0.2) })).toBe(false)
  })
})

// --- The amount of water shows in the thing, and stays -------------------------

describe('the water a thing holds', () => {
  it('shows as a flame that is lower for each gulp, gone at its fill, and never grows back', () => {
    const fire = new FireMotion()
    const heights = [1]
    let rose = 0
    for (let gulps = 1; gulps <= THINGS.fire.fill; gulps++) {
      fire.answer(gulps < THINGS.fire.fill ? 'gulp' : 'fill', gulps)
      let before = fire.pose.flame
      // A whole minute after each gulp: the flame only ever goes down.
      play(fire, 60, (pose) => {
        rose = Math.max(rose, pose.flame - before)
        before = pose.flame
      })
      heights.push(fire.pose.flame)
    }
    expect(rose).toBeLessThanOrEqual(1e-9)
    for (let gulps = 1; gulps <= THINGS.fire.fill; gulps++) expect(heights[gulps], `after ${gulps}`).toBeLessThan(heights[gulps - 1] - 0.1)
    expect(heights[THINGS.fire.fill]).toBeLessThan(0.001)
    expect(fire.pose.wet).toBe(true)
  })

  it('shows as a level in the pool that climbs with each gulp and does not drain', () => {
    const pool = new PoolMotion()
    let stood = 0
    for (let gulps = 1; gulps <= THINGS.pool.fill; gulps++) {
      pool.answer(gulps < THINGS.pool.fill ? 'gulp' : 'fill', gulps)
      let lowest = Infinity
      play(pool, 60, (pose) => { lowest = Math.min(lowest, pose.level) })
      // It never dips under where it stood before the gulp, and a minute on it stands at its new level.
      expect(lowest, `after ${gulps}`).toBeGreaterThanOrEqual(stood - 1e-6)
      expect(pool.pose.level).toBeCloseTo(levelForGulps(gulps), 4)
      expect(pool.pose.level).toBeGreaterThan(stood + 0.15)
      stood = pool.pose.level
    }
    // Full is just under the top of the wall, and too much stands over it.
    expect(stood).toBeLessThan(1)
    pool.answer('too-much', THINGS.pool.most)
    play(pool, 60)
    expect(pool.pose.level).toBeGreaterThan(1)
  })

  it('shows as a plant with a shoot at one gulp, leaves at two and a flower at three, and it keeps them', () => {
    const seed = new SeedMotion()
    play(seed, 60)
    // A seed that gets no water stays a seed.
    expect(seed.pose).toMatchObject({ soil: 0, shoot: 0, leaves: 0, bud: 0, flower: 0 })
    const stages: number[][] = []
    for (let gulps = 1; gulps <= THINGS.seed.fill; gulps++) {
      seed.answer(gulps < THINGS.seed.fill ? 'gulp' : 'fill', gulps)
      play(seed, 4)
      stages.push([seed.pose.shoot, seed.pose.leaves, seed.pose.flower].map((part) => Math.round(part * 100) / 100))
      expect(seed.pose.soil).toBe(1)
    }
    expect(stages).toEqual([[1, 0, 0], [1, 1, 0], [1, 1, 1]])
    // The bud gives way to the flower.
    expect(seed.pose.bud).toBeLessThan(0.01)
    play(seed, 60)
    expect(seed.pose.shoot).toBeCloseTo(1, 4)
    expect(seed.pose.leaves).toBeCloseTo(1, 4)
    expect(seed.pose.flower).toBeCloseTo(1, 4)
  })

  it('shows as a patch that is darker with each gulp, a puddle at its fill and mud past it', () => {
    const patch = new PatchMotion()
    const looks: number[][] = []
    for (let gulps = 1; gulps <= THINGS.patch.most; gulps++) {
      patch.answer(gulps < THINGS.patch.fill ? 'gulp' : gulps === THINGS.patch.fill ? 'fill' : 'too-much', gulps)
      play(patch, 4)
      looks.push([patch.pose.wet, patch.pose.puddle, patch.pose.mud].map((part) => Math.round(part * 100) / 100))
    }
    expect(looks).toEqual([[0.5, 0, 0], [1, 0, 0], [1, 1, 0], [1, 0, 1]])
    play(patch, 60)
    expect(patch.pose.mud).toBeCloseTo(1, 4)
  })
})

// --- A yard found as it was left ------------------------------------------------

/** What moves by the clock alone and shows no water: the flicker of the flame, and wet logs adrift on their puddle. */
const BY_THE_CLOCK = ['flicker', 'logsX', 'logsZ', 'logsY', 'logsTurn']

describe('a thing found as it was left', () => {
  it.each(PLAIN)('stands where its water has it at once: nothing about the %s eases in', (kind) => {
    for (let gulps = 0; gulps <= THINGS[kind].most; gulps++) {
      const thing = MAKERS[kind]()
      thing.settle(gulps)
      const first = numbers(thing.step(FRAME))
      play(thing, 5)
      const later = numbers(thing.pose)
      for (const key of Object.keys(later).filter((part) => !BY_THE_CLOCK.includes(part))) {
        expect(Math.abs(first[key] - later[key]), `${kind} holding ${gulps}: ${key}`).toBeLessThanOrEqual(0.02 * Math.max(1, Math.abs(later[key])))
      }
    }
  })

  it('shows the water it held: the flame, the level, the plant, the patch and the water in the boat', () => {
    expect(settled(MAKERS.fire, 2).pose).toMatchObject({ flame: 0.46, wet: false })
    expect(settled(MAKERS.fire, 3).pose).toMatchObject({ flame: 0, wet: true })
    expect(settled(MAKERS.pool, 4).pose).toMatchObject({ level: levelForGulps(4) })
    expect(settled(MAKERS.seed, 2).pose).toMatchObject({ soil: 1, shoot: 1, leaves: 1, flower: 0 })
    expect(settled(MAKERS.patch, 3).pose).toMatchObject({ wet: 1, puddle: 1, mud: 0 })
    expect(settled(MAKERS.boat, 3).pose).toMatchObject({ water: 1 })
  })
})

// --- Working things do not fidget ----------------------------------------------

describe('a thing nobody waters', () => {
  it.each(['pool', 'seed', 'patch', 'boat', 'wheel'] as const)('does not move at all: the %s has no idle fidget', (kind) => {
    for (let gulps = 0; gulps <= THINGS[kind].most; gulps++) {
      const thing = settled(MAKERS[kind], gulps)
      const start = numbers(thing.pose)
      let most = 0
      play(thing, 10, (pose) => {
        for (const key of Object.keys(start)) most = Math.max(most, Math.abs(Number(pose[key]) - start[key]))
      })
      expect(most, `${kind} holding ${gulps}`).toBeLessThanOrEqual(1e-6)
    }
  })

  it('has one exception, the flame, which flickers all the time and does nothing else', () => {
    for (let gulps = 0; gulps <= THINGS.fire.fill; gulps++) {
      const fire = settled(MAKERS.fire, gulps)
      const start = numbers(fire.pose)
      let most = 0, flickered = 0
      play(fire, 10, (pose) => {
        for (const key of Object.keys(start).filter((part) => part !== 'flicker')) most = Math.max(most, Math.abs(Number(pose[key]) - start[key]))
        flickered = pose.flicker - start.flicker
      })
      expect(flickered).toBeCloseTo(10, 6)
      expect(most, `holding ${gulps}`).toBeLessThanOrEqual(1e-6)
    }
  })
})

// --- The wheel -----------------------------------------------------------------

describe('the wheel', () => {
  /** Plays the wheel and adds up how far it turned, in whole turns, and when it last moved. */
  function spin(motion: WheelMotion, seconds: number): { turns: number; stoppedAt: number } {
    let turned = 0, stoppedAt = 0
    for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
      const before = motion.pose.angle
      motion.step(FRAME)
      const step = (motion.pose.angle - before + Math.PI * 2) % (Math.PI * 2)
      turned += step
      if (step > 0) stoppedAt = (frame + 1) * FRAME
    }
    return { turns: turned / (Math.PI * 2), stoppedAt }
  }

  it('turns part of the way round for one gulp, and stops by itself within a few seconds', () => {
    const motion = new WheelMotion()
    motion.answer('gulp', 1)
    const { turns, stoppedAt } = spin(motion, 12)
    expect(turns).toBeGreaterThan(0.25)
    expect(turns).toBeLessThan(1)
    expect(stoppedAt).toBeLessThan(6)
    expect(motion.pose.speed).toBe(0)
  })

  it('spins steadily at its fill, and keeps spinning for as long as the stream holds', () => {
    const motion = new WheelMotion()
    motion.answer('fill', THINGS.wheel.fill)
    spin(motion, 3)
    let slowest = Infinity, fastest = 0
    for (let frame = 0; frame < 60 * 30; frame++) {
      motion.step(FRAME)
      slowest = Math.min(slowest, motion.pose.speed)
      fastest = Math.max(fastest, motion.pose.speed)
    }
    expect(slowest).toBeGreaterThan(SPIN * 0.98)
    expect(fastest).toBeLessThanOrEqual(SPIN + 1e-9)
    expect(motion.pose.shuffle).toBe(0)
  })

  it('slows to a stop when the stream stops', () => {
    const motion = new WheelMotion()
    motion.answer('fill', THINGS.wheel.fill)
    spin(motion, 3)
    motion.runDown()
    let before = motion.pose.speed, rose = 0
    for (let frame = 0; frame < 60 * 8; frame++) {
      motion.step(FRAME)
      rose = Math.max(rose, motion.pose.speed - before)
      before = motion.pose.speed
    }
    expect(rose).toBe(0)
    expect(motion.pose.speed).toBe(0)
    const stood = motion.pose.angle
    spin(motion, 2)
    expect(motion.pose.angle).toBe(stood)
  })

  it('spins to a blur with too much, faster than at its fill, and shuffles on its stand', () => {
    const steady = new WheelMotion(), blurred = new WheelMotion()
    steady.answer('fill', THINGS.wheel.fill)
    blurred.answer('too-much', THINGS.wheel.most)
    spin(steady, 3)
    let shuffled = 0
    for (let frame = 0; frame < 60 * 3; frame++) {
      blurred.step(FRAME)
      shuffled = Math.max(shuffled, Math.abs(blurred.pose.shuffle))
    }
    expect(blurred.pose.speed).toBeGreaterThan(steady.pose.speed * 2)
    expect(blurred.pose.speed).toBeLessThanOrEqual(BLUR)
    expect(shuffled).toBeGreaterThan(0.01)
  })

  it('is turned further by a gulp than by run-off creeping under it, and a sweep is one flick that dies away', () => {
    const turnsOf = (action: Action, gulps: number) => {
      const motion = new WheelMotion()
      motion.answer(action, gulps)
      const spun = spin(motion, 12)
      expect(motion.pose.speed, action).toBe(0)
      return spun.turns
    }
    expect(turnsOf('neighbour', 0)).toBeLessThan(turnsOf('gulp', 1) * 0.5)
    expect(turnsOf('sweep', 0)).toBeGreaterThan(0.25)
    expect(turnsOf('sweep', 0)).toBeLessThan(1)
  })
})

// --- The boat ------------------------------------------------------------------

describe('the boat', () => {
  it('goes down when it is swamped afloat, rolls right over, and comes up again empty, all within two seconds', () => {
    const motion = new BoatMotion()
    motion.settle(THINGS.boat.fill)
    motion.step(0, true)
    expect(motion.pose.water).toBe(1)
    motion.answer('too-much', 0, true, AWAY)
    let deepest = 0, mostRoll = 0, upAt = -1, waterAsItCameUp = 1
    for (let frame = 1; frame <= 120; frame++) {
      const before = motion.pose.sunk
      motion.step(FRAME, true)
      deepest = Math.max(deepest, motion.pose.sunk)
      mostRoll = Math.max(mostRoll, motion.pose.roll)
      if (upAt < 0 && before > 0 && motion.pose.sunk <= 0.001) {
        upAt = frame * FRAME
        waterAsItCameUp = motion.pose.water
      }
    }
    expect(deepest).toBeGreaterThan(0.95)
    expect(mostRoll).toBeCloseTo(Math.PI * 2, 5)
    expect(upAt).toBeGreaterThan(0.5)
    expect(upAt).toBeLessThanOrEqual(SINK_S)
    expect(waterAsItCameUp).toBe(0)
    // Two seconds on it is the right way up, on the water, with nothing in it.
    expect(motion.pose.sunk).toBe(0)
    expect(motion.pose.roll).toBe(0)
    expect(motion.pose.water).toBeLessThan(0.01)
  })

  it('brims over and rocks when it is given too much on the sand, and stays the right way up', () => {
    const motion = new BoatMotion()
    motion.settle(THINGS.boat.fill)
    motion.answer('too-much', THINGS.boat.most, false, AWAY)
    let brimmed = 0, rocked = 0
    for (let frame = 0; frame < 120; frame++) {
      motion.step(FRAME, false)
      brimmed = Math.max(brimmed, motion.pose.brim)
      rocked = Math.max(rocked, Math.abs(motion.pose.rock))
      expect(motion.pose.sunk).toBe(0)
      expect(motion.pose.roll).toBe(0)
    }
    expect(brimmed).toBeGreaterThan(0.95)
    expect(rocked).toBeGreaterThan(0.2)
    expect(motion.pose.brim).toBeCloseTo(0, 9)
    expect(motion.pose.water).toBeCloseTo(1, 2)
  })

  it('is pushed away from the truck by a gulp on the sand, a hand\'s width and no more however many gulps come', () => {
    const motion = new BoatMotion()
    motion.settle(0)
    motion.answer('gulp', 1, false, AWAY)
    for (let frame = 0; frame < 60; frame++) motion.step(FRAME, false)
    // Along the way the water came, and not back.
    expect(motion.pose.pushX).toBeGreaterThan(0.1)
    expect(motion.pose.pushZ).toBeGreaterThan(0.08)
    expect(motion.pose.pushZ / motion.pose.pushX).toBeCloseTo(AWAY.z / AWAY.x, 2)
    let furthest = 0
    for (let gulp = 0; gulp < 40; gulp++) {
      motion.answer(gulp % 3 === 2 ? 'sweep' : 'gulp', Math.min(THINGS.boat.fill - 1, gulp + 2), false, AWAY)
      for (let frame = 0; frame < 20; frame++) {
        motion.step(FRAME, false)
        furthest = Math.max(furthest, Math.hypot(motion.pose.pushX, motion.pose.pushZ))
      }
    }
    expect(furthest).toBeGreaterThan(0.2)
    expect(furthest).toBeLessThan(0.45)
  })

  it('is not pushed by a gulp while it floats, only rocked', () => {
    const motion = new BoatMotion()
    motion.answer('gulp', 1, true, AWAY)
    let rocked = 0
    for (let frame = 0; frame < 60; frame++) {
      motion.step(FRAME, true)
      rocked = Math.max(rocked, Math.abs(motion.pose.rock))
    }
    expect(rocked).toBeGreaterThan(0.2)
    expect(motion.pose.pushX).toBe(0)
    expect(motion.pose.pushZ).toBe(0)
  })
})

// --- Nothing runs away ---------------------------------------------------------

/** The least and the most each part of a pose may ever be. A part not named here must only stay a number. */
const BOUNDS: Record<Plain, Record<string, readonly [number, number]>> = {
  fire: { flame: [0, 1.2], flat: [0, 0.8], lean: [-0.7, 0.7], spit: [0, 1], logsX: [-0.2, 0.2], logsZ: [-0.2, 0.2], logsY: [0, 0.1], logsTurn: [-0.6, 0.6] },
  pool: { level: [0, 1.2], bonk: [-0.5, 0.5], slosh: [-1.5, 1.5], spill: [0, 1] },
  seed: { soil: [0, 1], shoot: [0, 1.2], leaves: [0, 1.2], bud: [0, 1.2], flower: [0, 1.2], pop: [-0.5, 0.5], flutter: [-1, 1], nod: [0, 1], saucer: [0, 1] },
  patch: { wet: [0, 1], puddle: [0, 1.2], mud: [0, 1], blot: [-0.5, 0.5], line: [0, 1] },
  boat: { rock: [-1.5, 1.5], roll: [0, Math.PI * 2], sunk: [0, 1], water: [0, 1.2], pushX: [-0.45, 0.45], pushZ: [-0.45, 0.45], bob: [-1, 1], brim: [0, 1] },
  wheel: { angle: [0, Math.PI * 2], speed: [0, BLUR * 2], shuffle: [-0.05, 0.05] },
}

describe('whatever comes, and however fast', () => {
  it.each(PLAIN)('keeps the %s within sensible bounds through 300 answers at uneven moments', (kind) => {
    const random = seeded(PLAIN.indexOf(kind) + 11)
    const { most } = THINGS[kind]
    const floating = () => random() < 0.5
    let thing = MAKERS[kind](), gulps = 0
    const broken: string[] = []
    for (let answer = 0; answer < 300; answer++) {
      if (answer % 25 === 0) {
        // A new yard, found as it was left with some water in the thing.
        gulps = Math.floor(random() * (most + 1))
        thing = kind === 'boat' ? boat(floating()) : MAKERS[kind]()
        thing.settle(gulps)
      }
      const action = ACTIONS[Math.floor(random() * ACTIONS.length)]
      // Water only ever comes: a sweep leaves none, and the rest add a gulp up to the most a thing holds.
      if (action !== 'sweep') gulps = Math.min(most, gulps + 1)
      thing.answer(action, gulps, random() < 0.2 ? 0.5 : 1)
      for (let frames = Math.floor(random() * 30); frames >= 0; frames--) {
        const pose = numbers(thing.step(random() < 0.1 ? FRAME * 4 : FRAME))
        for (const [key, value] of Object.entries(pose)) {
          const [least, greatest] = BOUNDS[kind][key] ?? [-Infinity, Infinity]
          if (!Number.isFinite(value) || value < least - 1e-9 || value > greatest + 1e-9) broken.push(`${key} was ${value} after answer ${answer} (${action})`)
        }
      }
    }
    expect(broken.slice(0, 5)).toEqual([])
  })
})

// --- No time, no motion --------------------------------------------------------

describe('a frame of no length', () => {
  it.each(PLAIN)('plays no time for the %s, whatever it was just asked to do', (kind) => {
    for (const action of ACTIONS) {
      const { held, now } = watering(kind, action)
      const thing = settled(MAKERS[kind], held)
      thing.answer(action, now)
      const first = numbers(thing.step(0))
      for (let frame = 0; frame < 100; frame++) thing.step(0)
      expect(numbers(thing.pose), `${kind} / ${action}`).toEqual(first)
      // Then time runs, and the answer plays.
      play(thing, 0.3)
      expect(numbers(thing.pose), `${kind} / ${action}`).not.toEqual(first)
    }
  })

  it('leaves every spring and every clock where it was', () => {
    const fire = new FireMotion(), pool = new PoolMotion(), seed = new SeedMotion(), patch = new PatchMotion(), boatMotion = new BoatMotion(), wheelMotion = new WheelMotion()
    fire.answer('gulp', 1)
    pool.answer('gulp', 1)
    seed.answer('gulp', 1)
    patch.answer('gulp', 1)
    boatMotion.answer('gulp', 1, false, AWAY)
    wheelMotion.answer('gulp', 1)
    expect(fire.step(0)).toMatchObject({ flame: 1, flat: 0, flicker: 0 })
    expect(pool.step(0)).toMatchObject({ level: 0, bonk: 0 })
    expect(seed.step(0)).toMatchObject({ shoot: 0, pop: 0 })
    expect(patch.step(0)).toMatchObject({ wet: 0, blot: 0 })
    expect(boatMotion.step(0, false)).toMatchObject({ rock: 0, water: 0, pushX: 0, pushZ: 0 })
    expect(wheelMotion.step(0)).toMatchObject({ angle: 0 })
  })
})

// --- The two small tools ---------------------------------------------------------

describe('a gesture', () => {
  it('is over before it begins, plays once through its length, and is then over again', () => {
    const gesture = new Gesture()
    gesture.step(1)
    expect(gesture.through(0.5)).toBe(1)
    expect(gesture.playing(0.5)).toBe(false)
    gesture.start()
    expect(gesture.through(0.5)).toBe(0)
    expect(gesture.playing(0.5)).toBe(true)
    gesture.step(0.2)
    expect(gesture.through(0.5)).toBeCloseTo(0.4, 9)
    gesture.step(0.4)
    expect(gesture.through(0.5)).toBe(1)
    expect(gesture.playing(0.5)).toBe(false)
    // A longer look at the same gesture is still part of the way through.
    expect(gesture.through(1.2)).toBeCloseTo(0.5, 9)
  })

  it('can be put at its end', () => {
    const gesture = new Gesture()
    gesture.start()
    gesture.step(0.1)
    gesture.end()
    expect(gesture.through(100)).toBe(1)
    gesture.step(1)
    expect(gesture.playing(100)).toBe(false)
  })
})

describe('a hump', () => {
  it('starts at nothing, is whole in the middle, comes back to nothing, and is nothing outside', () => {
    expect(hump(0)).toBe(0)
    expect(hump(0.5)).toBeCloseTo(1, 9)
    expect(hump(1)).toBeCloseTo(0, 9)
    expect(hump(-3)).toBe(0)
    expect(hump(7)).toBeCloseTo(0, 9)
    for (let step = 0; step < 10; step++) {
      // Up all the way to the middle, and the same way down.
      expect(hump((step + 1) / 20)).toBeGreaterThan(hump(step / 20))
      expect(hump(step / 20)).toBeCloseTo(hump(1 - step / 20), 9)
    }
  })
})
