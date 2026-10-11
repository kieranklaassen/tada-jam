import { describe, expect, it } from 'vitest'
import { KIND, seatOf } from './kinds'
import { GATE_TOUCH, holePoint, meets, pick, streetPoint, type Ray } from './pick'
import { CROWD, GATE, KEEPER, MAYOR } from './places'
import { HOVER, Play, liftOf, type World } from './play'
import { FLOAT } from './seen'
import { STREET } from './street'

const world = (over: Partial<World> = {}): World => ({ hole: { x: 0, z: 0 }, belly: [], breath: [], street: [], ...over })
const MAYOR_X = -4.8

/** A line of sight from high on the near side down to a point of the scene, as the game's eye has it. */
function at(x: number, y: number, z: number): Ray {
  const ox = 0, oy = 18, oz = 15, long = Math.hypot(x - ox, y - oy, z - oz)
  return { ox, oy, oz, dx: (x - ox) / long, dy: (y - oy) / long, dz: (z - oz) / long }
}

describe('where a line of sight meets the street', () => {
  it('is the point it was aimed at', () => {
    const point = streetPoint(at(3, 0, -1))!
    expect(point.x).toBeCloseTo(3)
    expect(point.z).toBeCloseTo(-1)
  })

  it('is nowhere when the line looks up', () => {
    expect(streetPoint({ ox: 0, oy: 5, oz: 0, dx: 0, dy: 0.1, dz: -1 })).toBeNull()
  })

  it('meets an upright drum on its side or its top, and misses beside it', () => {
    expect(meets(at(2, 1, 0), 2, 0, 0.5, 0, 2)).toBeLessThan(Infinity)
    expect(meets(at(2, 2, 0), 2, 0, 0.5, 0, 2)).toBeLessThan(Infinity)
    expect(meets(at(4, 0, 0), 2, 0, 0.5, 0, 2)).toBe(Infinity)
  })
})

describe('what a finger is on', () => {
  it('the bare street, at the point under the finger', () => {
    const target = pick(at(3, 0, 1), new Play(world()), MAYOR_X)
    expect(target.on).toBe('street')
    expect(target.x).toBeCloseTo(3)
    expect(target.z).toBeCloseTo(1)
  })

  it('the hole, a little outside its rim too', () => {
    const play = new Play(world({ hole: { x: 1, z: 1 } }))
    expect(pick(at(1.2, 0, 1.1), play, MAYOR_X).on).toBe('hole')
    expect(pick(at(1 + play.mouth / 2 + 0.15, 0, 1), play, MAYOR_X).on).toBe('hole')
    expect(pick(at(1 + play.mouth / 2 + 0.5, 0, 1), play, MAYOR_X).on).toBe('street')
  })

  it('a thing, touched anywhere on its body and not only at its foot', () => {
    const play = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: ['drummer'], x: 2, z: -1 }] }))
    const top = pick(at(2, KIND.drummer.height * 0.9, -1), play, MAYOR_X)
    expect(top).toMatchObject({ on: 'thing', x: 2, z: -1 })
    // The street behind his head, as the eye sees it, is still him.
    const behind = streetPoint(at(2, KIND.drummer.height * 0.9, -1))!
    expect(behind.z).toBeLessThan(-1 - KIND.drummer.width / 2)
  })

  it('a small thing, with a foot wide enough for a finger', () => {
    const play = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: ['pie'], x: 2, z: 1 }] }))
    expect(pick(at(2 + 0.5, 0.01, 1), play, MAYOR_X).on).toBe('thing')
    expect(pick(at(2 + 0.9, 0, 1), play, MAYOR_X).on).toBe('street')
  })

  it('the nearer of two things that stand one behind the other', () => {
    const play = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: ['drummer'], x: 0, z: -1.2 }, { parts: ['dog'], x: 0, z: 1 }] }))
    const target = pick(at(0, 0.5, 1), play, MAYOR_X)
    expect(target.on === 'thing' && target.thing.parts[0]).toBe('dog')
  })

  it('each thing of a standing stack where it is drawn: the finger is on the part it touches', () => {
    const parts = ['drummer', 'dog', 'hat'] as const
    const play = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: [...parts], x: 2, z: 0 }] }))
    parts.forEach((kind, part) => {
      const middle = seatOf(parts, part) + (part < parts.length - 1 ? (seatOf(parts, part + 1) - seatOf(parts, part)) / 2 : KIND[kind].height / 2)
      const target = pick(at(2, middle, KIND[kind].width * 0.4), play, MAYOR_X)
      expect(target, kind).toMatchObject({ on: 'thing', part, x: 2, z: 0 })
    })
    // A thing alone is its own only part.
    const alone = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: ['hat'], x: 2, z: 0 }] }))
    expect(pick(at(2, 0.2, 0), alone, MAYOR_X)).toMatchObject({ on: 'thing', part: 0 })
  })

  it('a thing riding on the breath is touched as itself, each where it hangs, and the hole under a stack is found on the thing at the bottom of it', () => {
    const parts = ['dog', 'hat', 'pie'] as const, play = new Play(world({ belly: ['pie', 'pie'], breath: [...parts] }))
    parts.forEach((kind, part) => {
      // The middle of its front, as high as it hangs.
      const y = HOVER + seatOf(parts, part) + (part < 2 ? (seatOf(parts, part + 1) - seatOf(parts, part)) / 2 : KIND[kind].height / 2)
      expect(pick(at(0, y, Math.max(0.55, KIND[kind].width / 2) - 0.05), play, MAYOR_X), kind).toMatchObject({ on: 'rider', part })
    })
    // What shows of the mouth in front of the stack is the hole still.
    expect(pick(at(0, 0, play.mouth / 2), play, MAYOR_X).on).toBe('hole')
    // The stack hides the mouth: the ghost hand taps the middle of the thing at the bottom of it, which the model takes as a touch on the hole too.
    const point = holePoint(play)
    expect(point).toEqual({ x: 0, y: HOVER + KIND.dog.height / 2, z: 0 })
    // With nothing riding the hole is found at its middle.
    const bare = new Play(world({ belly: ['pie'] }))
    expect(holePoint(bare)).toEqual({ x: 0, y: 0, z: 0 })
    expect(pick(at(0, 0, 0), bare, MAYOR_X).on).toBe('hole')
  })

  it('a thing that still waits down in the mouth is not there to touch, and pushes nothing up: the finger finds what hangs where it hangs', () => {
    // A pie rides, clear of the dog. The balloon that comes up under it is wider: the dog steps aside first, and the balloon waits in the mouth.
    const play = new Play(world({ hole: { x: 0, z: 0 }, belly: ['balloon'], breath: ['pie'], street: [{ parts: ['dog'], x: 1.6, z: 0 }] }))
    play.press({ on: 'hole', x: 0, z: 0 })
    play.tap()
    expect(play.riders.map((rider) => rider.wait > 0)).toEqual([true, false])
    play.step(1 / 60)
    expect(play.riders[0].wait).toBeGreaterThan(0)
    // The pie hangs as it hung, at the bottom: it has not been pushed up by a thing that is not up yet.
    expect(play.riders[1].y).toBeCloseTo(HOVER, 2)
    expect(pick(at(0, HOVER + KIND.pie.height / 2, 0.5), play, MAYOR_X)).toMatchObject({ on: 'rider', part: 0 })
    expect(play.riding.map((rider) => rider.kind)).toEqual(['pie'])
  })

  it('the mayor, the gate keeper and the gate', () => {
    const play = new Play(world())
    expect(pick(at(MAYOR_X, MAYOR.floor + 3 * MAYOR.size, MAYOR.z + 0.5), play, MAYOR_X).on).toBe('mayor')
    expect(pick(at(KEEPER.x, 3, KEEPER.z), play, MAYOR_X).on).toBe('keeper')
    expect(pick(at(GATE.x + 0.6, 1.5, GATE.z), play, MAYOR_X).on).toBe('gate')
  })

  it('each head of the crowd by itself, beyond the far kerb and on the near side', () => {
    const play = new Play(world())
    CROWD.forEach((one, head) => {
      const target = pick(at(one.x, 2 * one.size, one.z), play, MAYOR_X)
      expect(target, `head ${head}`).toMatchObject({ on: 'crowd', head })
    })
    expect(CROWD.some((one) => one.back)).toBe(true)
    expect(CROWD.some((one) => !one.back)).toBe(true)
  })

  it('a thing on its way is touched where it is seen, and one still behind the gate is not there to touch', () => {
    const play = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: ['dog'], x: 2, z: 1 }] }))
    const dog = play.things[0]
    dog.sx = -2
    dog.sz = 0
    expect(pick(at(-2, 0.3, 0), play, MAYOR_X).on).toBe('thing')
    expect(pick(at(2, 0.3, 1), play, MAYOR_X).on).toBe('street')
    dog.away = true
    expect(pick(at(-2, 0.3, 0), play, MAYOR_X).on).toBe('street')
  })

  it('a thing in the air is touched where it is drawn at its height: hanging, hopping down, leaping over another, bouncing', () => {
    const stood = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: ['hat', 'pie'], x: 2, z: 0 }] }))
    const play = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: ['hat', 'pie'], x: 2, z: 0 }] }))
    const stack = play.things[0], parts = stack.parts
    /** Lines of sight onto the near side of each part as it stands, low, in the middle and high. */
    const sights = [0, 1].flatMap((part) => [0.2, 0.5, 0.8].map((up) => at(2, seatOf(parts, part) + up * KIND[parts[part]].height, Math.max(0.55, KIND[parts[part]].width / 2))))
    const up = (label: string): void => {
      const lift = liftOf(stack), seen = new Set<number>()
      expect(lift, label).toBeGreaterThan(0.6)
      for (const sight of sights) {
        // The same line of sight, as much higher as the thing is: it meets the same part of it.
        const standing = pick(sight, stood, MAYOR_X), lifted = pick({ ...sight, oy: sight.oy + lift }, play, MAYOR_X)
        expect(standing.on, label).toBe('thing')
        expect(lifted.on, label).toBe('thing')
        if (standing.on === 'thing' && lifted.on === 'thing') { expect(lifted.part, label).toBe(standing.part); seen.add(lifted.part ?? 0) }
      }
      expect([...seen].sort(), label).toEqual([0, 1])
      // Under its foot, where it would be touched if it stood, the finger is on the street.
      expect(pick(at(2, 0.1, 0.5), stood, MAYOR_X).on, label).toBe('thing')
      expect(pick(at(2, 0.1, 0.5), play, MAYOR_X).on, label).toBe('street')
    }
    // Hanging where it rode, waiting its turn; then part of the way down.
    stack.hop = 0
    stack.air = HOVER
    up('hanging')
    stack.hop = 0.3
    stack.air = HOVER * (1 - 0.09)
    up('hopping down')
    // Leaping over another on its step aside.
    stack.hop = 1
    stack.air = 0
    stack.leap = 2.4
    up('leaping')
    // Two balloons in their long bounce.
    stack.leap = 0
    stack.walk = { fromX: 2, fromZ: 0, steps: 1, seconds: 1.3, phase: 0.5, heard: 1, lift: 2.2, aside: false, over: 0 }
    up('bouncing')
    stack.walk = null
    expect(liftOf(stack)).toBe(0)
    expect(pick(at(2, 0.1, 0.5), play, MAYOR_X).on).toBe('thing')
  })

  it('a balloon on top of a stack is touched where it floats, above its seat, standing or on the breath', () => {
    const play = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: ['hat', 'balloon'], x: 2, z: 0 }, { parts: ['balloon'], x: -1, z: 0 }] }))
    // A line of sight that passes just over the back of the balloon as it sits: it meets the top of one that floats, and passes over one that does not.
    const back = -(Math.max(0.55, KIND.balloon.width / 2) + 0.2), seat = seatOf(['hat', 'balloon'], 1)
    const top = pick(at(2, seat + KIND.balloon.height + 0.3, back), play, MAYOR_X)
    expect(top.on === 'thing' && top.part).toBe(1)
    expect(FLOAT).toBeGreaterThan(0.3)
    // A balloon that stands alone floats no higher than it is.
    expect(pick(at(-1, KIND.balloon.height + 0.3, back), play, MAYOR_X).on).toBe('street')
    const riding = new Play(world({ hole: { x: 2, z: 0 }, breath: ['hat', 'balloon'] }))
    expect(pick(at(2, HOVER + seat + KIND.balloon.height + 0.3, back), riding, MAYOR_X)).toMatchObject({ on: 'rider', part: 1 })
    const plain = new Play(world({ hole: { x: 2, z: 0 }, breath: ['hat', 'pie'] }))
    expect(pick(at(2, HOVER + seatOf(['hat', 'pie'], 1) + KIND.pie.height + 0.3, -(Math.max(0.55, KIND.pie.width / 2) + 0.2)), plain, MAYOR_X).on).toBe('street')
  })

  it('the gate is touched on its leaves and posts; its arch, over them, is scenery', () => {
    expect(pick(at(GATE.x - GATE.half, GATE_TOUCH - 0.1, GATE.z), new Play(world()), MAYOR_X).on).toBe('gate')
    expect(pick(at(GATE.x, GATE_TOUCH - 0.1, GATE.z), new Play(world()), MAYOR_X).on).toBe('gate')
    for (const across of [-1, -0.5, 0, 0.5, 1]) expect(pick(at(GATE.x + across * GATE.half, GATE_TOUCH + 0.1, GATE.z), new Play(world()), MAYOR_X).on, `${across}`).not.toBe('gate')
    expect(pick(at(GATE.x, GATE.high, GATE.z), new Play(world()), MAYOR_X).on).not.toBe('gate')
    // Its tallest bar, and the bar the gate keeper holds, are inside it.
    expect(GATE_TOUCH).toBeGreaterThan(0.12 + 2.5 + 0.16 * 4)
    expect(GATE_TOUCH).toBeLessThan(GATE.high - 0.5)
  })

  it('always names a point on the street for the hole to come to', () => {
    const play = new Play(world())
    for (const ray of [at(99, 0, -99), at(MAYOR_X, MAYOR.floor + 3 * MAYOR.size, MAYOR.z), at(KEEPER.x, 3, KEEPER.z), at(GATE.x, 2, GATE.z), at(CROWD[0].x, 1, CROWD[0].z), at(CROWD[CROWD.length - 1].x, 1, CROWD[CROWD.length - 1].z), { ox: 0, oy: 5, oz: 0, dx: 0, dy: 0.2, dz: -1 }]) {
      const target = pick(ray, play, MAYOR_X)
      expect(target.x).toBeGreaterThanOrEqual(STREET.x0)
      expect(target.x).toBeLessThanOrEqual(STREET.x1)
      expect(target.z).toBeGreaterThanOrEqual(STREET.z0)
      expect(target.z).toBeLessThanOrEqual(STREET.z1)
    }
  })
})
