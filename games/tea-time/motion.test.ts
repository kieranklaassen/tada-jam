import { describe, expect, it } from 'vitest'
import { Director, PERSONALITIES, REST, add, kindOf, type Action, type ActionKind, type MoverKind, type Pose } from './motion'

const MOVERS: MoverKind[] = ['bear', 'mouse', 'hen', 'duckling']
const KINDS: ActionKind[] = ['poke', 'stream', 'tickle', 'step', 'reach', 'sip-right', 'sip-short', 'sip-over', 'wait', 'clink', 'settle', 'show', 'hat', 'arrive', 'joke']
const ANGLES = ['lean', 'roll', 'twist', 'headPitch', 'headYaw', 'headRoll', 'funny', 'funnyTwist'] as const
const CHANNELS = ['lift', 'squash', ...ANGLES, 'eyes'] as const

/** Every action is looked at through 41 samples, its first and last among them. */
const POINTS = 41
const samples = (action: Action): Pose[] => Array.from({ length: POINTS }, (_, i) => action.sample(i / (POINTS - 1)))
const EVERY = MOVERS.flatMap((who) => KINDS.flatMap((kind) => PERSONALITIES[who].actions[kind].map((action) => ({ who, kind, action }))))
const pairs = <T>(list: T[]): [T, T][] => list.flatMap((a, i) => list.slice(i + 1).map((b): [T, T] => [a, b]))

// The measure of a near-copy. An action's shape is its 41 samples of the ten
// offset channels and the eyes (less 1), a share of squash counted three times
// as heavy as a radian or a unit of lift. One shape is rescaled by the single
// amplitude that fits the other best, and what is left over is measured two
// ways: as a root-mean-square difference, which must be above NEAR, and as a
// share of the curve it was taken from, which must be above UNLIKE. The same
// curve at another size or another speed leaves nothing over, and fails both.
const NEAR = 0.03
const UNLIKE = 0.6
const WEIGHT: Record<(typeof CHANNELS)[number], number> = { lift: 1, squash: 3, lean: 1, roll: 1, twist: 1, headPitch: 1, headYaw: 1, headRoll: 1, funny: 1, funnyTwist: 1, eyes: 1 }
const shape = (action: Action): number[] => samples(action).flatMap((pose) => CHANNELS.map((channel) => (pose[channel] - (channel === 'eyes' ? 1 : 0)) * WEIGHT[channel]))
const dot = (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + x * b[i], 0)
const rms = (a: number[]) => Math.sqrt(dot(a, a) / a.length)
/** What is left of `a` when the best single amplitude of `b` is taken from it. */
const leftOver = (a: number[], b: number[]) => rms(a.map((x, i) => x - (dot(a, b) / dot(b, b)) * b[i]))
function apart(one: Action, other: Action): { rms: number; share: number } {
  const a = shape(one), b = shape(other)
  return { rms: Math.min(leftOver(a, b), leftOver(b, a)), share: leftOver(a, b) / rms(a) }
}
function expectUnlike(one: Action, other: Action) {
  const { rms: difference, share } = apart(one, other)
  expect(difference, `${one.name} and ${other.name}`).toBeGreaterThan(NEAR)
  expect(share, `${one.name} and ${other.name}`).toBeGreaterThan(UNLIKE)
}

describe('every action', () => {
  it('comes as two pokes, two tickles and one of each other kind, under a name of its own', () => {
    for (const who of MOVERS) for (const kind of KINDS) {
      expect(PERSONALITIES[who].actions[kind].length, `${who} ${kind}`).toBe(kind === 'poke' || kind === 'tickle' ? 2 : 1)
      for (const action of PERSONALITIES[who].actions[kind]) expect(action.kind).toBe(kind)
    }
    expect(new Set(EVERY.map(({ action }) => action.name)).size).toBe(EVERY.length)
    expect(EVERY.length).toBe(68)
    expect((['bear', 'mouse', 'hen', 'duckling-a', 'duckling-b'] as const).map(kindOf)).toEqual([...MOVERS, 'duckling'])
  })

  it.each(EVERY)('$who $action.name starts and ends at rest and stays inside what the rig can do', ({ kind, action }) => {
    const all = samples(action)
    for (const channel of CHANNELS) {
      expect(Math.abs(all[0][channel] - REST[channel])).toBeLessThan(1e-6)
      if (kind !== 'settle') expect(Math.abs(all[POINTS - 1][channel] - REST[channel])).toBeLessThan(1e-6)
    }
    // The pose a settled guest keeps is plainly not the rest pose.
    if (kind === 'settle') expect(Math.max(...CHANNELS.map((channel) => Math.abs(all[POINTS - 1][channel] - REST[channel]) * WEIGHT[channel]))).toBeGreaterThan(0.25)
    for (const pose of all) {
      for (const channel of CHANNELS) expect(Number.isFinite(pose[channel])).toBe(true)
      expect(pose.lift >= -1e-9 && pose.lift <= 1.2, `lift ${pose.lift}`).toBe(true)
      expect(Math.abs(pose.squash)).toBeLessThanOrEqual(0.35)
      expect(pose.eyes >= 0 && pose.eyes <= 1.4, `eyes ${pose.eyes}`).toBe(true)
      for (const angle of ANGLES) expect(Math.abs(pose[angle])).toBeLessThanOrEqual(1.6)
    }
    expect(action.seconds).toBeGreaterThan(0)
  })
})

describe('no shared animations', () => {
  it.each(KINDS)('%s is a different curve for each kind of mover', (kind) => {
    for (const [a, b] of pairs(MOVERS)) {
      for (const one of PERSONALITIES[a].actions[kind]) for (const other of PERSONALITIES[b].actions[kind]) expectUnlike(one, other)
    }
  })

  it('gives each pair of movers really different tempos: a tenth apart or more in at least nine of the fourteen kinds', () => {
    for (const [a, b] of pairs(MOVERS)) {
      const differ = KINDS.filter((kind) => {
        const one = PERSONALITIES[a].actions[kind][0].seconds, other = PERSONALITIES[b].actions[kind][0].seconds
        return Math.abs(one - other) / Math.max(one, other) >= 0.1
      })
      expect(differ.length, `${a} and ${b}`).toBeGreaterThanOrEqual(9)
    }
  })

  it.each(MOVERS)('the %s has two pokes and two tickles that are not one curve twice, and no action that is a copy of another of its own', (who) => {
    const own = KINDS.flatMap((kind) => PERSONALITIES[who].actions[kind])
    expect(own.length).toBe(17)
    for (const [one, other] of pairs(own)) expectUnlike(one, other)
  })

  it('would catch the same curve played bigger, or at another speed', () => {
    const thud = PERSONALITIES.bear.actions.step[0]
    const bigger: Action = { ...thud, name: 'bigger', sample: (t) => add(thud.sample(t), add(thud.sample(t), REST)) }
    const quicker: Action = { ...thud, name: 'quicker', seconds: thud.seconds / 3 }
    for (const copy of [bigger, quicker]) {
      expect(apart(thud, copy).rms).toBeLessThan(NEAR / 100)
      expect(apart(thud, copy).share).toBeLessThan(UNLIKE / 100)
    }
    // And the smallest action in the game is itself well over the line, so the line means something for it.
    for (const { action } of EVERY) expect(rms(shape(action)), action.name).toBeGreaterThan(NEAR * 1.5)
  })
})

describe("the Hen's head", () => {
  const hen = PERSONALITIES.hen.actions
  it.each([...hen.poke, ...hen.wait, ...hen.show])('$name: it holds a pose and snaps to the next, never glides', (action) => {
    const equal = (a: number, b: number) => Math.abs(a - b) <= 1e-6
    let held = 0, jumps = 0
    for (const channel of ['headYaw', 'headPitch'] as const) {
      const values = samples(action).map((pose) => pose[channel])
      jumps += values.filter((value, i) => i > 0 && Math.abs(value - values[i - 1]) > 0.25).length
      // A stretch away from rest, counted once, where it starts: this sample and the two after it are the same.
      held += values.filter((value, i) => Math.abs(value) > 0.1 && (i === 0 || !equal(value, values[i - 1])) && i + 2 < POINTS && equal(value, values[i + 1]) && equal(value, values[i + 2])).length
    }
    expect(held).toBeGreaterThanOrEqual(2)
    expect(jumps).toBeGreaterThanOrEqual(2)
  })
})

describe('idle', () => {
  it('breathes at four tempos, the Bear slowest and the Mouse fastest', () => {
    const tempos = MOVERS.map((who) => PERSONALITIES[who].tempo)
    expect(new Set(tempos).size).toBe(4)
    expect([Math.min(...tempos), Math.max(...tempos)]).toEqual([PERSONALITIES.bear.tempo, PERSONALITIES.mouse.tempo])
  })

  it.each(MOVERS)('the %s stays small, keeps moving, and two of a kind are out of step', (who) => {
    const { idle } = PERSONALITIES[who]
    const poses = Array.from({ length: 600 }, (_, i) => idle(i * 0.05, 0.3))
    for (const pose of poses) {
      for (const angle of ANGLES) expect(Math.abs(pose[angle])).toBeLessThan(0.25)
      expect(Math.abs(pose.lift)).toBeLessThan(0.05)
      expect(Math.abs(pose.squash)).toBeLessThan(0.04)
      expect(pose.eyes).toBe(1)
    }
    const squashes = poses.map((pose) => pose.squash)
    expect(Math.max(...squashes) - Math.min(...squashes)).toBeGreaterThan(0.02)
    expect(idle(1, 0.3)).not.toEqual(idle(1, 0.8))
  })
})

/** The times a director's eyes start to close, looking every hundredth of a second with nothing else playing. */
function blinkStarts(director: Director, until: number): number[] {
  const starts: number[] = []
  let shut = false
  for (let now = 0; now < until; now += 0.01) {
    const closed = director.sample(now).eyes < 0.5
    if (closed && !shut) starts.push(Math.round(now * 100) / 100)
    shut = closed
  }
  return starts
}
const expectSame = (a: Pose, b: Pose) => { for (const channel of CHANNELS) expect(Math.abs(a[channel] - b[channel]), channel).toBeLessThan(1e-9) }

describe('the Director', () => {
  it('plays the same run again from the same seed, and never sinks into the cloth', () => {
    const run = () => {
      const director = new Director('mouse', 5)
      const names = [director.trigger('arrive', 0.2), director.trigger('poke', 1), director.trigger('tickle', 1.2)]
      return { names, poses: Array.from({ length: 300 }, (_, i) => director.sample(i / 60)) }
    }
    const first = run()
    expect(run()).toEqual(first)
    for (const pose of first.poses) expect(pose.lift).toBeGreaterThanOrEqual(0)
    expect(first.poses.some((pose) => pose.lift > 0.1)).toBe(true)
  })

  it('blinks inside its own range, at other times for another seed, and not over eyes held wide', () => {
    const [low, high] = PERSONALITIES.hen.blinkEvery
    const one = blinkStarts(new Director('hen', 1), 60), other = blinkStarts(new Director('hen', 2), 60)
    expect(one.length).toBeGreaterThan(60 / high - 2)
    expect(one).not.toEqual(other)
    for (let i = 1; i < one.length; i++) {
      expect(one[i] - one[i - 1]).toBeGreaterThan(low - 0.03)
      expect(one[i] - one[i - 1]).toBeLessThan(high + 0.03)
    }
    // A hat holds the eyes wide: a blink that falls in the hold is not played.
    const hat = PERSONALITIES.hen.actions.hat[0], wide = new Director('hen', 1)
    wide.trigger('hat', one[2] - hat.seconds / 2)
    expect(wide.sample(one[2] + 0.05).eyes).toBeGreaterThan(1.2)
  })

  it('never plays the same poke twice running', () => {
    const director = new Director('bear', 3)
    const names = Array.from({ length: 30 }, (_, i) => director.trigger('poke', i * 2))
    for (let i = 1; i < names.length; i++) expect(names[i]).not.toBe(names[i - 1])
    expect(new Set(names).size).toBe(2)
  })

  it('lets one foreground action end another, and a poke end none', () => {
    const director = new Director('bear', 4), idle = new Director('bear', 4)
    const { show, reach, poke } = PERSONALITIES.bear.actions
    director.trigger('show', 0)
    expect(director.busy(0.4)).toBe(true)
    director.trigger('reach', 0.5)
    // The show would have run on; with the reach over, nothing is left of it.
    const after = 0.5 + reach[0].seconds + 0.01
    expect(after).toBeLessThan(show[0].seconds)
    expect(director.busy(after)).toBe(false)
    expectSame(director.sample(after), idle.sample(after))
    director.trigger('show', 10)
    director.trigger('poke', 10.1)
    expect(director.busy(10.2 + Math.max(...poke.map((action) => action.seconds)))).toBe(true)
  })

  it.each(MOVERS)('the %s holds its answer to the stream for as long as it is held, and plays it out when it is let go', (who) => {
    const guest = who === 'duckling' ? 'duckling-a' : who
    const director = new Director(guest, 4), idle = new Director(guest, 4)
    const action = PERSONALITIES[who].actions.stream[0]
    director.trigger('stream', 1)
    director.hold('stream', 1)
    // Long after the action's own length it is still in its middle: never at rest, and never past the held part.
    const far = (now: number) => { const pose = director.sample(now), under = idle.sample(now); return Math.max(...ANGLES.map((angle) => Math.abs(pose[angle] - under[angle]))) }
    for (const now of [1 + action.seconds * 0.5, 1 + action.seconds * 1.7, 1 + action.seconds * 4.3, 20, 60.37]) {
      expect(far(now)).toBeGreaterThan(0.05)
    }
    // Let go: it plays on from where it is and is over within its own length, with no jump at the moment it is let go.
    const before = director.sample(60.4)
    director.hold(null, 60.4)
    const after = director.sample(60.4)
    for (const angle of ANGLES) expect(Math.abs(after[angle] - before[angle])).toBeLessThan(1e-9)
    expect(far(60.4 + action.seconds + 0.01)).toBeLessThan(1e-9)
  })

  it('finishes at once into idle and a blink, and nothing else', () => {
    const director = new Director('duckling-a', 6), idle = new Director('duckling-a', 6)
    director.trigger('sip-right', 0)
    director.trigger('poke', 0.3)
    expect(Math.abs(director.sample(0.5).headPitch - idle.sample(0.5).headPitch)).toBeGreaterThan(0.01)
    director.finish()
    expect(director.busy(0.5)).toBe(false)
    expect(director.settled).toBe(false)
    for (const now of [0.5, 0.6, 2, 9]) expectSame(director.sample(now), idle.sample(now))
  })

  it.each(MOVERS)('the %s settles into its kept pose and keeps it over its idle', (who) => {
    const guest = who === 'duckling' ? 'duckling-a' : who
    const director = new Director(guest, 8), idle = new Director(guest, 8)
    const settle = PERSONALITIES[who].actions.settle[0], kept = settle.sample(1)
    director.trigger('settle', 1)
    director.sample(1 + settle.seconds / 2)
    expect(director.settled).toBe(false)
    const check = (now: number) => {
      const pose = director.sample(now), under = idle.sample(now)
      expect(director.settled).toBe(true)
      const moved = ANGLES.find((angle) => Math.abs(kept[angle]) > 0.1)!
      const amp = (pose[moved] - under[moved]) / kept[moved]
      expect(amp).toBeGreaterThanOrEqual(0.9)
      expect(amp).toBeLessThanOrEqual(1.1)
      for (const channel of ['squash', ...ANGLES] as const) expect(pose[channel] - under[channel]).toBeCloseTo(amp * kept[channel], 9)
      expect(pose.eyes).toBeLessThanOrEqual(kept.eyes + 1e-9)
      return amp
    }
    const amp = check(1 + settle.seconds + 0.01)
    director.finish()
    expect(check(30.3)).toBeCloseTo(amp, 9)
  })

  it('plays the second Duckling exactly as much later as it is told', () => {
    const first = new Director('duckling-a', 9), second = new Director('duckling-b', 9, 0.3)
    for (const director of [first, second]) director.trigger('arrive', 0.5)
    expect(second.sample(0.7).lift).toBe(0)
    expect(first.sample(0.7).lift).toBeGreaterThan(0.1)
    expect(second.busy(0.6)).toBe(true)
    for (let now = 0; now < 12; now += 0.037) expectSame(second.sample(now + 0.3), first.sample(now))
  })
})
