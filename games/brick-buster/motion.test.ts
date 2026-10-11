import { describe, expect, it } from 'vitest'
import { MANNERS, Pose, REST_JAW, blinking, breath, gape, hidingFlame, idle } from './motion'

describe('poses', () => {
  it('springs to a target in its own manner, past it and back', () => {
    const pose = new Pose(MANNERS.bumper)
    pose.set('squash', 1)
    let most = 0
    for (let frame = 0; frame < 120; frame++) {
      pose.step(1 / 60)
      most = Math.max(most, pose.get('squash'))
    }
    expect(most, 'it overshoots').toBeGreaterThan(1.02)
    expect(pose.get('squash')).toBeCloseTo(1, 2)
    expect(pose.still).toBe(true)
  })

  it('eases to a target and is exactly there when the beat says', () => {
    const pose = new Pose(MANNERS.walrus)
    pose.set('fall', 1, 0.44)
    for (let frame = 0; frame < 26; frame++) pose.step(1 / 60)
    expect(pose.get('fall')).toBeLessThan(1)
    pose.step(1 / 60)
    expect(pose.get('fall')).toBe(1)
  })

  it('is there at once when a beat lasts no time, and lands every channel on request', () => {
    const pose = new Pose(MANNERS.elephant)
    pose.set('x', 300, 0)
    expect(pose.get('x')).toBe(300)
    pose.set('ears', 1)
    pose.land()
    expect(pose.get('ears')).toBe(1)
    expect(pose.still).toBe(true)
  })

  it('gives the same pose for one long frame as for the same time in short ones', () => {
    const a = new Pose(MANNERS.dragon), b = new Pose(MANNERS.dragon)
    a.set('neck', 1)
    b.set('neck', 1)
    a.step(0.1)
    for (let i = 0; i < 12; i++) b.step(0.1 / 12)
    expect(a.get('neck')).toBeCloseTo(b.get('neck'), 6)
  })
})

describe('every character moves like itself', () => {
  it('no two manners are alike', () => {
    const seen = new Set(Object.values(MANNERS).map((manner) => `${manner.stiffness}/${manner.damping}`))
    expect(seen.size).toBe(Object.keys(MANNERS).length)
  })

  it('the three large toys settle at clearly different speeds, and the elephant is the late one', () => {
    const settle = (name: 'dragon' | 'walrus' | 'elephant') => {
      const pose = new Pose(MANNERS[name])
      pose.set('part', 1)
      let frames = 0
      while (!pose.still && frames < 2000) { pose.step(1 / 60); frames += 1 }
      return frames
    }
    const dragon = settle('dragon'), walrus = settle('walrus'), elephant = settle('elephant')
    expect(walrus).toBeGreaterThan(dragon * 2)
    expect(elephant).toBeGreaterThan(dragon * 1.5)
    expect(Math.abs(walrus - elephant)).toBeGreaterThan(10)
    expect(MANNERS.elephant.late).toBeGreaterThan(MANNERS.walrus.late)
    expect(MANNERS.walrus.late).toBeGreaterThan(MANNERS.dragon.late)
  })

  it('no two toys idle alike: their idle moves do not follow each other', () => {
    const toys = ['dragon', 'walrus', 'elephant'] as const
    const run = (toy: (typeof toys)[number], key: 'bob' | 'part' | 'other') => Array.from({ length: 600 }, (_, i) => idle(toy, i / 20)[key])
    const alike = (a: number[], b: number[]) => {
      const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
      const ma = mean(a), mb = mean(b)
      let top = 0, da = 0, db = 0
      a.forEach((x, i) => { top += (x - ma) * (b[i] - mb); da += (x - ma) ** 2; db += (b[i] - mb) ** 2 })
      return Math.abs(top / Math.sqrt(da * db))
    }
    for (const key of ['bob', 'part'] as const) for (let i = 0; i < toys.length; i++) for (let j = i + 1; j < toys.length; j++) {
      expect(alike(run(toys[i], key), run(toys[j], key)), `${toys[i]} and ${toys[j]}, ${key}`).toBeLessThan(0.35)
    }
  })

  it('blinks are short, and two faces do not blink together all the time', () => {
    let shut = 0, together = 0
    for (let i = 0; i < 6000; i++) {
      const a = blinking(1, i / 60), b = blinking(2, i / 60)
      if (a) shut += 1
      if (a && b) together += 1
    }
    expect(shut / 6000).toBeLessThan(0.06)
    expect(shut).toBeGreaterThan(0)
    expect(together).toBeLessThan(shut / 2)
  })
})

describe('what the sheet promises of a thing at rest', () => {
  it('the dragon holds its mouth open towards the ball, and wider as the ball comes to its gate', () => {
    expect(REST_JAW).toBeGreaterThanOrEqual(0.25)
    expect(gape(0, Infinity)).toBe(REST_JAW)
    expect(gape(0, 400)).toBe(REST_JAW)
    expect(gape(0, 120)).toBeGreaterThan(gape(0, 200))
    expect(gape(0, 0)).toBeGreaterThan(REST_JAW + 0.4)
    expect(gape(0, 0)).toBeLessThanOrEqual(1)
    // What an answer asks for is still what is drawn.
    expect(gape(1, Infinity)).toBe(1)
    expect(gape(0.1, Infinity)).toBe(REST_JAW)
  })

  it('the dragon keeps trying to hide its flame: it squints at it and the flame shrinks to a spark, and then it gets out larger than before', () => {
    let least = 1, most = 1, looking = 0, usual = 0
    const frames = Math.round(7.3 * 60)
    for (let frame = 0; frame < frames; frame++) {
      const { size, looking: at } = hidingFlame(100 + frame / 60)
      least = Math.min(least, size)
      most = Math.max(most, size)
      if (at) looking += 1
      if (size === 1) usual += 1
      // The dragon looks at the flame only while it is holding it down.
      if (at) expect(size).toBeLessThanOrEqual(1)
    }
    expect(least).toBeLessThan(0.3)
    expect(least).toBeGreaterThan(0)
    expect(most).toBeGreaterThan(1.3)
    expect(looking / 60).toBeGreaterThan(1)
    expect(looking / 60).toBeLessThan(2)
    // Most of the time the flame burns as usual.
    expect(usual / frames).toBeGreaterThan(0.7)
  })

  it('an ice brick breathes a puff every few seconds, each brick at a moment of its own', () => {
    const puffing = (who: number) => {
      const starts: number[] = []
      let was = -1
      for (let frame = 0; frame < 60 * 30; frame++) {
        const now = breath(who, frame / 60)
        expect(now).toBeLessThanOrEqual(1)
        if (now >= 0 && was < 0) starts.push(frame / 60)
        if (now >= 0 && was >= 0) expect(now).toBeGreaterThan(was)
        was = now
      }
      return starts
    }
    const starts = [...Array(18).keys()].map(puffing)
    for (const of of starts) {
      expect(of.length).toBeGreaterThanOrEqual(5)
      expect(of.length).toBeLessThanOrEqual(11)
    }
    // Two bricks beside each other do not breathe in step.
    for (let who = 0; who + 1 < 18; who++) {
      const together = starts[who].filter((at) => starts[who + 1].some((other) => Math.abs(other - at) < 0.15)).length
      expect(together, `bricks ${who} and ${who + 1}`).toBeLessThanOrEqual(starts[who].length / 3)
    }
  })
})
