import { describe, expect, it } from 'vitest'
import { MotionDirector, PERSONALITIES, type ActionKind, type MotionPose, type Species } from './motion'

const SPECIES = Object.keys(PERSONALITIES) as Species[]
const KINDS: ActionKind[] = ['react', 'eat', 'poke', 'arrive', 'delight']

function trajectory(species: Species, kind: ActionKind, name: string): number[] {
  const action = PERSONALITIES[species][kind].find((a) => a.name === name)!
  const values: number[] = []
  for (let i = 0; i <= 20; i++) {
    const d = action.sample(i / 20, 1, 1)
    values.push(d.lift ?? 0, d.squash ?? 0, d.lean ?? 0, d.roll ?? 0, d.twist ?? 0, d.headPitch ?? 0, d.headYaw ?? 0, d.headRoll ?? 0, d.headDrop ?? 0, (d.eyes ?? 1) - 1, d.mouth ?? 0, (d.nose ?? 0) * 0.3, d.cheeks ?? 0, d.quills ?? 0, ...(d.armUp ?? [0, 0]), ...(d.armForward ?? [0, 0]), ...(d.ears ?? [0, 0]))
  }
  return values
}

const distance = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0))

describe('motion personalities', () => {
  it('give every species several variants of each action and a set of rare delights', () => {
    for (const species of SPECIES) {
      const p = PERSONALITIES[species]
      expect(p.react.length, `${species} react`).toBeGreaterThanOrEqual(2)
      expect(p.eat.length, `${species} eat`).toBeGreaterThanOrEqual(2)
      expect(p.poke.length, `${species} poke`).toBeGreaterThanOrEqual(2)
      expect(p.delight.length, `${species} delight`).toBeGreaterThanOrEqual(3)
    }
  })

  it('share no action between species except the neighbour glance', () => {
    const owners = new Map<string, Species>()
    for (const species of SPECIES) {
      for (const kind of KINDS) {
        for (const action of PERSONALITIES[species][kind]) {
          if (action.name === 'glance') continue
          expect(owners.get(action.name), `${action.name} reused`).toBeUndefined()
          owners.set(action.name, species)
        }
      }
    }
  })

  it('make every variant move differently from every other one (no near-copies)', () => {
    const all: { id: string; values: number[] }[] = []
    for (const species of SPECIES) for (const kind of KINDS) for (const a of PERSONALITIES[species][kind]) all.push({ id: `${species}/${a.name}`, values: trajectory(species, kind, a.name) })
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        if (all[i].id.endsWith('/glance') && all[j].id.endsWith('/glance')) continue
        expect(distance(all[i].values, all[j].values), `${all[i].id} vs ${all[j].id}`).toBeGreaterThan(0.3)
      }
    }
  })

  it('pace idle life by nature: the bear breathes slowest, the hedgehog fastest', () => {
    const period = (species: Species) => {
      let crossings = 0
      let previous = PERSONALITIES[species].idle(0, 0).squash ?? 0
      for (let t = 0.01; t < 10; t += 0.01) {
        const value = PERSONALITIES[species].idle(t, 0).squash ?? 0
        if (Math.sign(value) !== Math.sign(previous)) crossings += 1
        previous = value
      }
      return crossings
    }
    expect(period('bear')).toBeLessThan(period('rabbit'))
    expect(period('rabbit')).toBeLessThan(period('hedgehog'))
  })

  it('gives the bear the laziest head turns and the rabbit the quickest', () => {
    expect(PERSONALITIES.bear.look.stiffness).toBeLessThan(PERSONALITIES.hedgehog.look.stiffness)
    expect(PERSONALITIES.hedgehog.look.stiffness).toBeLessThan(PERSONALITIES.rabbit.look.stiffness)
  })
})

describe('reaching for the bowl', () => {
  it('looks different for each species and starts at different speeds, so guests never reach in lockstep', () => {
    const poses = SPECIES.map((species) => PERSONALITIES[species].reach(1, 0, 0))
    const vector = (d: (typeof poses)[number]) => [d.lift ?? 0, d.squash ?? 0, d.lean ?? 0, d.headPitch ?? 0, ...(d.armUp ?? [0, 0]), ...(d.armForward ?? [0, 0]), ...(d.ears ?? [0, 0])]
    for (let i = 0; i < poses.length; i++) for (let j = i + 1; j < poses.length; j++) expect(distance(vector(poses[i]), vector(poses[j]))).toBeGreaterThan(0.3)
    const after = (species: Species) => {
      const director = new MotionDirector(species, 1)
      for (let t = 0; t <= 0.5; t += 1 / 60) director.sample(t, true, 1)
      return director.sample(0.5, true, 1)
    }
    const responses = SPECIES.map((species) => PERSONALITIES[species].reachResponse)
    expect(new Set(responses).size).toBe(SPECIES.length)
    expect(after('bear').armForward[0]).toBeLessThan(PERSONALITIES.bear.reach(1, 0, 0).armForward![0] * 0.8)
  })
})

describe('MotionDirector', () => {
  it('never plays the same variant twice in a row', () => {
    const director = new MotionDirector('rabbit', 3)
    let last = ''
    for (let i = 0; i < 50; i++) {
      const name = director.trigger('react', i * 2)
      expect(name).not.toBe(last)
      last = name
    }
  })

  it('uses every variant over time', () => {
    const director = new MotionDirector('bear', 1)
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) seen.add(director.trigger('delight', i * 5))
    expect(seen.size).toBe(PERSONALITIES.bear.delight.length)
  })

  it('plays rare delights on its own while idle, and never while busy or quiet', () => {
    const director = new MotionDirector('hedgehog', 2)
    let delights = 0
    for (let t = 0; t < 120; t += 1 / 30) {
      director.sample(t)
      if (director.current('delight', t) !== null && director.current('delight', t - 1 / 30) === null) delights += 1
    }
    expect(delights).toBeGreaterThanOrEqual(5)
    expect(delights).toBeLessThanOrEqual(25)

    const quiet = new MotionDirector('hedgehog', 2)
    for (let t = 0; t < 60; t += 1 / 30) quiet.sample(t, true)
    expect(quiet.current('delight', 59.9)).toBeNull()
  })

  it('drops a delight the moment something real happens', () => {
    const director = new MotionDirector('bear', 4)
    director.trigger('delight', 0)
    director.trigger('eat', 0.2)
    expect(director.current('delight', 0.3)).toBeNull()
    expect(director.current('eat', 0.3)).not.toBeNull()
  })

  it('randomizes timing so two guests of one species do not move in lockstep', () => {
    const a = new MotionDirector('hedgehog', 2)
    const b = new MotionDirector('hedgehog', 4)
    const pa: MotionPose[] = []
    const pb: MotionPose[] = []
    for (let t = 0; t < 5; t += 0.1) {
      pa.push(a.sample(t))
      pb.push(b.sample(t))
    }
    expect(pa.some((pose, i) => Math.abs(pose.squash - pb[i].squash) > 0.005)).toBe(true)
  })

  it('keeps every pose finite and the eyes never fully vanish', () => {
    for (const species of SPECIES) {
      const director = new MotionDirector(species, 9)
      for (let t = 0; t < 30; t += 0.05) {
        if (Math.abs(t - 3) < 0.01) director.trigger('react', t)
        if (Math.abs(t - 8) < 0.01) director.trigger('eat', t)
        if (Math.abs(t - 14) < 0.01) director.trigger('poke', t)
        const pose = director.sample(t)
        for (const value of [pose.lift, pose.squash, pose.headPitch, pose.mouth, ...pose.armUp, ...pose.ears]) expect(Number.isFinite(value)).toBe(true)
        expect(pose.eyes).toBeGreaterThan(0)
      }
    }
  })
})
