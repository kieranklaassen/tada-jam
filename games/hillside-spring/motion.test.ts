import { describe, expect, it } from 'vitest'
import { CREATURES, type CreatureKind } from './creatures'
import { addPose, MotionDirector, PERSONALITIES, resetPose, restPose, type Action, type ActionKind, type MotionPose, type PoseDelta } from './motion'

const KINDS: ActionKind[] = ['poke', 'cheer', 'arrive', 'delight']
const TAU = Math.PI * 2

function vector(d: PoseDelta): number[] {
  return [
    d.lift ?? 0,
    d.shift ?? 0,
    d.advance ?? 0,
    d.face ?? 0,
    d.squash ?? 0,
    d.lean ?? 0,
    d.roll ?? 0,
    d.spin ?? 0,
    d.headPitch ?? 0,
    d.headYaw ?? 0,
    d.headRoll ?? 0,
    (d.eyes ?? 1) - 1,
    d.awake ?? 0,
    d.curl ?? 0,
    d.mouth ?? 0,
    d.throat ?? 0,
    d.tongue ?? 0,
    d.tail ?? 0,
    ...(d.legs ?? [0, 0]),
    ...(d.wings ?? [0, 0]),
    ...(d.ears ?? [0, 0]),
  ]
}

function trajectory(action: Action): number[] {
  const values: number[] = []
  for (let i = 0; i <= 20; i++) values.push(...vector(action.sample(i / 20, 1, 1)))
  return values
}

const distance = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0))

function actions(kind: CreatureKind): { kind: ActionKind; action: Action }[] {
  return KINDS.flatMap((k) => PERSONALITIES[kind][k].map((action) => ({ kind: k, action })))
}

describe('motion personalities', () => {
  it('give every visitor several pokes and cheers, an arrival, and a set of rare delights', () => {
    for (const kind of CREATURES) {
      const p = PERSONALITIES[kind]
      expect(p.poke.length, `${kind} poke`).toBeGreaterThanOrEqual(2)
      expect(p.cheer.length, `${kind} cheer`).toBeGreaterThanOrEqual(2)
      expect(p.arrive.length, `${kind} arrive`).toBeGreaterThanOrEqual(1)
      expect(p.delight.length, `${kind} delight`).toBeGreaterThanOrEqual(3)
    }
  })

  it('share no action name between visitors or between kinds of action', () => {
    const owners = new Map<string, string>()
    for (const kind of CREATURES) {
      for (const { kind: k, action } of actions(kind)) {
        expect(owners.get(action.name), `${kind}/${k}/${action.name} reuses ${owners.get(action.name)}`).toBeUndefined()
        owners.set(action.name, `${kind}/${k}`)
      }
    }
  })

  it('make every action move differently from every other one (no near-copies)', () => {
    const all = CREATURES.flatMap((kind) => actions(kind).map(({ action }) => ({ id: `${kind}/${action.name}`, values: trajectory(action) })))
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) expect(distance(all[i].values, all[j].values), `${all[i].id} vs ${all[j].id}`).toBeGreaterThan(0.3)
    }
  })

  it('give each visitor its own travel gait', () => {
    const gait = (kind: CreatureKind) => {
      const values: number[] = []
      for (let i = 0; i <= 20; i++) values.push(...vector(PERSONALITIES[kind].travel(i / 20, 0)))
      return values
    }
    for (let i = 0; i < CREATURES.length; i++) {
      for (let j = i + 1; j < CREATURES.length; j++) expect(distance(gait(CREATURES[i]), gait(CREATURES[j])), `${CREATURES[i]} vs ${CREATURES[j]}`).toBeGreaterThan(0.3)
    }
  })

  it('start and end every action at rest, so nothing pops when one begins or finishes', () => {
    for (const kind of CREATURES) {
      for (const { kind: k, action } of actions(kind)) {
        const end = vector(action.sample(0.9999, 1, 1))
        const spin = 7
        end[spin] = Math.abs(Math.round(end[spin] / TAU) * TAU - end[spin])
        expect(Math.max(...end.map(Math.abs)), `${kind}/${action.name} end`).toBeLessThan(0.05)
        if (k === 'arrive') continue
        const start = vector(action.sample(0.0001, 1, 1))
        expect(Math.max(...start.map(Math.abs)), `${kind}/${action.name} start`).toBeLessThan(0.05)
      }
    }
  })

  it('pace idle life by nature: the tanuki breathes slowest, the sparrow fastest', () => {
    const crossings = (kind: CreatureKind) => {
      let count = 0
      let previous = PERSONALITIES[kind].idle(0, 0).squash ?? 0
      for (let t = 0.01; t < 20; t += 0.01) {
        const value = PERSONALITIES[kind].idle(t, 0).squash ?? 0
        if (Math.sign(value) !== Math.sign(previous)) count += 1
        previous = value
      }
      return count
    }
    expect(crossings('tanuki')).toBeLessThan(crossings('frog'))
    expect(crossings('frog')).toBeLessThan(crossings('sparrow'))
  })

  it('notice shared moments by temperament: the sparrow first, the tanuki last', () => {
    const { frog, sparrow, tanuki } = PERSONALITIES
    expect(sparrow.cueDelay[1]).toBeLessThanOrEqual(frog.cueDelay[0])
    expect(frog.cueDelay[1]).toBeLessThanOrEqual(tanuki.cueDelay[0])
  })
})

describe('MotionDirector', () => {
  it('never plays the same variant twice in a row', () => {
    for (const kind of CREATURES) {
      const director = new MotionDirector(kind, 3)
      let last = ''
      for (let i = 0; i < 40; i++) {
        const name = director.poke(i * 4)
        expect(name).not.toBe(last)
        last = name
      }
    }
  })

  it('uses every variant over time', () => {
    const director = new MotionDirector('sparrow', 1)
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) seen.add(director.trigger('delight', i * 5))
    expect(seen.size).toBe(PERSONALITIES.sparrow.delight.length)
  })

  it('plays rare delights on its own while idle, and none while travelling', () => {
    for (const kind of CREATURES) {
      const director = new MotionDirector(kind, 2)
      let delights = 0
      for (let t = 0; t < 120; t += 1 / 30) {
        director.sample(t)
        if (director.current('delight', t) !== null && director.current('delight', t - 1 / 30) === null) delights += 1
      }
      expect(delights, kind).toBeGreaterThanOrEqual(5)
      expect(delights, kind).toBeLessThanOrEqual(40)

      const walking = new MotionDirector(kind, 2)
      for (let t = 0; t < 60; t += 1 / 30) {
        walking.sample(t, t * 2)
        expect(walking.current('delight', t)).toBeNull()
      }
    }
  })

  it('drops a delight the moment the child pokes', () => {
    const director = new MotionDirector('frog', 4)
    director.trigger('delight', 0)
    director.poke(0.2)
    expect(director.current('delight', 0.3)).toBeNull()
    expect(director.current('poke', 0.3)).not.toBeNull()
  })

  it('staggers one shared moment: each visitor cheers at its own moment, in temperament order', () => {
    const started = CREATURES.map((kind) => {
      const director = new MotionDirector(kind, 5)
      director.cue(0)
      for (let t = 0; t < 4; t += 1 / 60) {
        director.sample(t)
        if (director.current('cheer', t) !== null) return t
      }
      return Infinity
    })
    const [frog, sparrow, tanuki] = started
    expect(sparrow).toBeLessThan(frog)
    expect(frog).toBeLessThan(tanuki)
    expect(tanuki).toBeLessThan(4)
  })

  it('waits to cheer until a poke has finished, and lets a stale moment go', () => {
    const director = new MotionDirector('sparrow', 6)
    director.poke(0)
    director.cue(0)
    let cheeredAt = -1
    for (let t = 0; t < 3 && cheeredAt < 0; t += 1 / 60) {
      director.sample(t)
      if (director.current('cheer', t) !== null) cheeredAt = t
    }
    expect(cheeredAt).toBeGreaterThan(director.personality.poke[0].duration * 0.8)

    const sleepy = new MotionDirector('tanuki', 6)
    sleepy.cue(0)
    for (let t = 0; t < 12; t += 1 / 30) {
      if (t % 2.4 < 1 / 30) sleepy.poke(t)
      sleepy.sample(t)
    }
    expect(sleepy.pendingCue).toBeNull()
  })

  it('randomizes timing so two visitors of one kind do not move in lockstep', () => {
    const a = new MotionDirector('frog', 2)
    const b = new MotionDirector('frog', 4)
    let apart = false
    for (let t = 0; t < 5; t += 0.1) if (Math.abs(a.sample(t).squash - b.sample(t).squash) > 0.005) apart = true
    expect(apart).toBe(true)
  })

  it('keeps every pose finite and the eyes never fully vanish', () => {
    for (const kind of CREATURES) {
      const director = new MotionDirector(kind, 9)
      for (let t = 0; t < 30; t += 0.05) {
        if (Math.abs(t - 3) < 0.01) director.poke(t)
        if (Math.abs(t - 8) < 0.01) director.cue(t)
        if (Math.abs(t - 14) < 0.01) director.trigger('arrive', t)
        const pose = t > 20 && t < 22 ? director.sample(t, t * 3, 0.5) : director.sample(t)
        for (const value of [pose.lift, pose.squash, pose.spin, pose.headPitch, pose.curl, pose.throat, ...pose.legs, ...pose.wings, ...pose.ears]) expect(Number.isFinite(value)).toBe(true)
        expect(pose.eyes).toBeGreaterThan(0)
      }
    }
  })

  it('blends and resets every field of a pose (the field-by-field code must not miss a new one)', () => {
    const rest = restPose()
    for (const key of Object.keys(rest) as (keyof MotionPose)[]) {
      const pose = restPose()
      const isPair = Array.isArray(rest[key])
      addPose(pose, { [key]: isPair ? [0.5, 0.25] : 0.5 } as PoseDelta, 2)
      expect(pose[key], key).not.toEqual(rest[key])
      resetPose(pose)
      expect(pose[key], key).toEqual(rest[key])
    }
  })
})
