import { describe, expect, it } from 'vitest'
import { ACTION_KINDS, CHANNELS, emptyPose, MotionDirector, PERSONALITIES, type Action, type Pose } from './motion'
import { ANIMALS } from './state'

function trace(action: Action): number[] {
  const values: number[] = []
  const pose = emptyPose()
  for (let i = 0; i <= 20; i++) {
    for (const channel of CHANNELS) pose[channel] = 0
    action.sample(i / 20, 1, 1, pose)
    for (const channel of CHANNELS) values.push(pose[channel])
  }
  return values
}

function distance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum)
}

function crossings(read: (pose: Pose) => number, idle: (t: number, phase: number, out: Pose) => void): number {
  let count = 0
  let last = 0
  const pose = emptyPose()
  for (let t = 0; t < 20; t += 1 / 60) {
    for (const channel of CHANNELS) pose[channel] = 0
    idle(t, 0.3, pose)
    const v = read(pose)
    if (last !== 0 && Math.sign(v) !== Math.sign(last)) count++
    last = v
  }
  return count
}

describe('motion personalities', () => {
  it('gives every animal several variants of every action and at least three delights besides the glance', () => {
    for (const animal of ANIMALS) {
      const p = PERSONALITIES[animal]
      for (const kind of ['poke', 'pet', 'row', 'hum', 'ask'] as const) expect(p[kind].length, `${animal} ${kind}`).toBeGreaterThanOrEqual(2)
      expect(p.delight.filter((a) => a.name !== 'glance').length, `${animal} delights`).toBeGreaterThanOrEqual(3)
    }
  })

  it('shares no action name between animals except the glance', () => {
    const owner = new Map<string, string>()
    for (const animal of ANIMALS) {
      for (const kind of ACTION_KINDS) {
        for (const action of PERSONALITIES[animal][kind]) {
          if (action.name === 'glance') continue
          expect(owner.get(action.name), `${action.name} in ${animal}`).toBeUndefined()
          owner.set(action.name, animal)
        }
      }
    }
  })

  it('has no near-copies: every pair of variants differs by more than 0.3 across all channels', () => {
    const all: { label: string; action: Action; values: number[] }[] = []
    for (const animal of ANIMALS) {
      for (const kind of ACTION_KINDS) {
        for (const action of PERSONALITIES[animal][kind]) {
          if (all.some((entry) => entry.action === action)) continue
          all.push({ label: `${animal}/${kind}/${action.name}`, action, values: trace(action) })
        }
      }
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) expect(distance(all[i].values, all[j].values), `${all[i].label} vs ${all[j].label}`).toBeGreaterThan(0.3)
    }
  })

  it('breathes and turns its head at the tempo of its nature: the bunny quickest, the bear slowest', () => {
    const breaths = ANIMALS.map((animal) => crossings((pose) => pose.squash, PERSONALITIES[animal].idle))
    const [bunny, penguin, fox, bear] = breaths
    expect(bunny).toBeGreaterThan(fox)
    expect(fox).toBeGreaterThan(penguin)
    expect(penguin).toBeGreaterThan(bear)
    const looks = ANIMALS.map((animal) => PERSONALITIES[animal].look)
    expect(looks[0]).toBeGreaterThan(looks[2])
    expect(looks[2]).toBeGreaterThan(looks[1])
    expect(looks[1]).toBeGreaterThan(looks[3])
  })

  it('answers a pattern at its own moment, so shared cues never move everyone on one frame', () => {
    const delays = ANIMALS.map((animal) => PERSONALITIES[animal].humDelay)
    expect(new Set(delays).size).toBe(ANIMALS.length)
    const blinks = ANIMALS.map((animal) => PERSONALITIES[animal].blinkLength)
    expect(new Set(blinks).size).toBe(ANIMALS.length)
  })
})

describe('motion director', () => {
  it('never plays the same variant twice in a row and uses every variant over time', () => {
    for (const animal of ANIMALS) {
      const director = new MotionDirector(animal, 3)
      for (const kind of ACTION_KINDS) {
        const seen = new Set<string>()
        let last = ''
        for (let i = 0; i < 60; i++) {
          const name = director.trigger(kind, i * 10)
          if (PERSONALITIES[animal][kind].length > 1) expect(name).not.toBe(last)
          seen.add(name)
          last = name
        }
        expect(seen.size).toBe(PERSONALITIES[animal][kind].length)
      }
    }
  })

  it('plays a handful of delights in two warm idle minutes, and none while quiet', () => {
    for (const animal of ANIMALS) {
      const director = new MotionDirector(animal, 7)
      const pose = emptyPose()
      let delights = 0
      let was: string | null = null
      for (let t = 0; t < 120; t += 1 / 30) {
        director.sample(t, false, false, pose)
        const now = director.playing('delight', t)
        if (now && now !== was) delights++
        if (now) expect(director.playing('ask', t)).toBeNull()
        was = now
      }
      expect(delights, animal).toBeGreaterThanOrEqual(5)
      expect(delights, animal).toBeLessThanOrEqual(25)

      const quiet = new MotionDirector(animal, 7)
      for (let t = 0; t < 60; t += 1 / 30) {
        quiet.sample(t, true, false, pose)
        expect(quiet.playing('delight', t)).toBeNull()
      }
    }
  })

  it('asks while cold and idle, and stops asking the moment something happens', () => {
    for (const animal of ANIMALS) {
      const director = new MotionDirector(animal, 11)
      const pose = emptyPose()
      let asks = 0
      let was: string | null = null
      for (let t = 0; t < 60; t += 1 / 30) {
        director.sample(t, false, true, pose)
        const now = director.playing('ask', t)
        if (now && now !== was) asks++
        expect(director.playing('delight', t)).toBeNull()
        was = now
      }
      expect(asks, animal).toBeGreaterThanOrEqual(5)

      let t = 60
      while (!director.playing('ask', t)) director.sample((t += 1 / 30), false, true, pose)
      director.trigger('row', t)
      expect(director.playing('ask', t)).toBeNull()
    }
  })

  it('answers a cold poke with an ask as soon as the shiver ends, unless the child is busy', () => {
    for (const animal of ANIMALS) {
      const director = new MotionDirector(animal, 13)
      const pose = emptyPose()
      director.sample(0, false, true, pose)
      director.trigger('poke', 0.1)
      let t = 0.1
      while (director.playing('poke', t)) director.sample((t += 1 / 30), false, true, pose)
      const ended = t
      while (!director.playing('ask', t) && t < ended + 1) director.sample((t += 1 / 30), false, true, pose)
      expect(director.playing('ask', t), animal).not.toBeNull()
      expect(t - ended, animal).toBeLessThan(0.4)

      const busy = new MotionDirector(animal, 13)
      busy.sample(0, false, true, pose)
      busy.trigger('poke', 0.1)
      for (let q = 0.1; q < 1.8; q += 1 / 30) {
        busy.sample(q, true, true, pose)
        expect(busy.playing('ask', q)).toBeNull()
      }
    }
  })

  it('drops a playing delight when a real action starts', () => {
    const director = new MotionDirector('bear', 5)
    const pose = emptyPose()
    let t = 0
    while (!director.playing('delight', t)) director.sample((t += 1 / 30), false, false, pose)
    director.trigger('pet', t)
    expect(director.playing('delight', t)).toBeNull()
    expect(director.playing('pet', t)).not.toBeNull()
  })

  it('blinks now and then, sometimes twice, and keeps the eyes open most of the time', () => {
    for (const animal of ANIMALS) {
      const director = new MotionDirector(animal, 2)
      const pose = emptyPose()
      let shut = 0
      let frames = 0
      for (let t = 0; t < 90; t += 1 / 60) {
        director.sample(t, true, false, pose)
        if (pose.shut > 0.5) shut++
        frames++
      }
      expect(shut, animal).toBeGreaterThan(0)
      expect(shut / frames, animal).toBeLessThan(0.1)
    }
  })

  it('lets two animals of one kind drift apart with different seeds', () => {
    const a = new MotionDirector('fox', 1)
    const b = new MotionDirector('fox', 2)
    const pa = emptyPose()
    const pb = emptyPose()
    let apart = 0
    for (let t = 0; t < 60; t += 1 / 30) {
      a.sample(t, false, false, pa)
      b.sample(t, false, false, pb)
      if (Math.abs(pa.tail - pb.tail) + Math.abs(pa.headYaw - pb.headYaw) > 0.05) apart++
    }
    expect(apart).toBeGreaterThan(300)
  })
})
