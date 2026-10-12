import { describe, expect, it } from 'vitest'
import { WAYS, newBody, partPose, stride, type Body, type PartPose, type StrideSound } from './gait'
import { KINDS, type Kind } from './parts'
import type { Way } from './things'

const DT = 1 / 60
const ALL: readonly Way[] = ['twig', 'maple', 'willow', 'round', 'feather', 'seed', 'cap']

/** Plays a way of going for `seconds` and keeps, frame by frame, how far it went and what it asked to be heard. */
function play(way: Way, n: number, seconds: number, go = true): { body: Body; went: number[]; lift: number[]; sounds: (StrideSound | null)[] } {
  const body = newBody(), went: number[] = [], lift: number[] = [], sounds: (StrideSound | null)[] = []
  for (let f = 0; f < Math.round(seconds / DT); f++) {
    let heard: StrideSound | null = null
    went.push(stride(body, way, n, DT, go, (sound) => { heard = sound }))
    lift.push(body.lift)
    sounds.push(heard)
  }
  return { body, went, lift, sounds }
}

const total = (list: readonly number[]): number => list.reduce((sum, v) => sum + v, 0)

describe('the ways of going', () => {
  it('each go at their own speed and in their own rhythm: no two cover the same ground or sound alike', () => {
    const far = ALL.map((way) => Math.round(total(play(way, 2, 6).went)))
    expect(new Set(far).size).toBe(ALL.length)
    for (const d of far) expect(d).toBeGreaterThan(60)
    const voices = ALL.map((way) => new Set(play(way, 2, 6).sounds.filter((s) => s !== null)))
    // Every way is heard, and no sound belongs to two ways.
    const seen = new Set<string>()
    for (const set of voices) {
      expect(set.size).toBeGreaterThan(0)
      for (const sound of set) { expect(seen.has(sound!)).toBe(false); seen.add(sound!) }
    }
    // The rhythm: some go in bursts with stops between, some never stop.
    const moving = ALL.map((way) => play(way, 2, 6).went.filter((d) => d > 0).length)
    expect(new Set(moving).size).toBeGreaterThanOrEqual(3)
    expect(Math.min(...moving)).toBeLessThan(Math.max(...moving) * 0.8)
  })

  it('go nowhere and make no sound when they do not want to travel', () => {
    for (const way of ALL) {
      const rest = play(way, 3, 2, false)
      expect(total(rest.went), way).toBe(0)
      expect(rest.sounds.every((s) => s === null), way).toBe(true)
    }
  })

  it('scuttles in bursts, with a patter in the very frame each foot comes down', () => {
    const body = newBody()
    let feet = 0, pauses = 0
    for (let f = 0; f < 240; f++) {
      const before = Math.floor(body.legs)
      let heard: StrideSound | null = null
      const d = stride(body, 'twig', 4, DT, true, (sound) => { heard = sound })
      const down = Math.floor(body.legs) !== before
      // Sight and sound on one clock: a foot down is heard in that frame, and nothing is heard in any other.
      expect(heard === 'foot').toBe(down)
      if (down) feet++
      if (d === 0) pauses++
    }
    expect(feet).toBeGreaterThan(20)
    expect(pauses).toBeGreaterThan(40)
  })

  it('hops: a beat at the take-off and one at the top, and a thump in the frame it comes down', () => {
    const { lift, sounds } = play('maple', 2, 4)
    let landings = 0
    for (let f = 1; f < lift.length; f++) {
      const cameDown = lift[f - 1] > 0 && lift[f] === 0
      expect(sounds[f] === 'land').toBe(cameDown)
      if (cameDown) landings++
      // A beat is only ever heard off the ground or in the frame of the take-off.
      if (sounds[f] === 'beat') expect(lift[f] > 0 || lift[f + 1] > 0).toBe(true)
    }
    expect(landings).toBeGreaterThanOrEqual(3)
    expect(sounds.filter((s) => s === 'beat').length).toBe(sounds.filter((s) => s === 'land').length * 2 + (lift[lift.length - 1] > 0 ? (lift[lift.length - 1] > lift[lift.length - 2] ? 1 : 2) : 0))
    expect(Math.max(...lift)).toBeCloseTo(WAYS.maple.height(2), 0)
  })

  it('finishes a hop it has begun: asked to stop in the air, it still comes down', () => {
    const body = newBody()
    let f = 0
    while (body.lift < 10 && f++ < 200) stride(body, 'maple', 2, DT, true, () => {})
    let landed = false
    for (let k = 0; k < 120; k++) stride(body, 'maple', 2, DT, false, (sound) => { if (sound === 'land') landed = true })
    expect(landed).toBe(true)
    expect(body.lift).toBe(0)
  })

  it('rolls slowly to a start and slowly to a stop, with a bump each time a wheel turns over', () => {
    const body = newBody()
    const first = stride(body, 'round', 1, DT, true, () => {})
    for (let f = 0; f < 200; f++) stride(body, 'round', 1, DT, true, () => {})
    const top = stride(body, 'round', 1, DT, true, () => {})
    expect(top).toBeGreaterThan(first * 20)
    const after = stride(body, 'round', 1, DT, false, () => {})
    expect(after).toBeGreaterThan(top * 0.9)
    let turns = 0, spinBefore = body.spin
    for (let f = 0; f < 300; f++) {
      let heard = false
      stride(body, 'round', 1, DT, true, (sound) => { heard = sound === 'turn' })
      expect(heard).toBe(Math.floor(body.spin / (Math.PI * 2)) !== Math.floor(spinBefore / (Math.PI * 2)))
      spinBefore = body.spin
      if (heard) turns++
    }
    expect(turns).toBeGreaterThan(2)
  })

  it('goes further, higher or faster with more parts of the kind that leads', () => {
    expect(total(play('twig', 9, 4).went)).toBeGreaterThan(total(play('twig', 1, 4).went))
    expect(Math.max(...play('maple', 5, 3).lift)).toBeGreaterThan(Math.max(...play('maple', 1, 3).lift))
    expect(total(play('round', 5, 6).went)).toBeGreaterThan(total(play('round', 1, 6).went))
    expect(WAYS.willow.swing(5)).toBeGreaterThan(WAYS.willow.swing(1))
    expect(WAYS.feather.show(4)).toBeGreaterThan(WAYS.feather.show(1))
  })
})

describe('the parts of a creature', () => {
  /** How one kind of part moves over three seconds of a creature travelling: a list of numbers to compare. */
  function trace(kind: Kind, way: Way): number[] {
    const body = newBody(), out: number[] = [], pose: PartPose = { turn: 0, along: 1, across: 1, out: 0 }
    for (let f = 0; f < 180; f++) {
      stride(body, way, 2, DT, true, () => {})
      partPose(kind, body, 0, null, pose)
      out.push(Math.round(pose.turn * 100), Math.round(pose.along * 100), Math.round(pose.across * 100))
    }
    return out
  }

  it('each move as themselves: no two kinds share a motion, whatever the creature travels by', () => {
    for (const way of ALL) {
      const traces = KINDS.filter((kind) => kind !== 'cap').map((kind) => trace(kind, way).join())
      expect(new Set(traces).size, way).toBe(traces.length)
    }
  })

  it('all move, except the caps, which are eyes', () => {
    for (const kind of KINDS) {
      const moves = new Set(trace(kind, kind === 'cap' ? 'cap' : 'willow')).size > 3
      expect(moves, kind).toBe(kind !== 'cap')
    }
  })

  it('paddle the other way on the other side, so legs go in turn', () => {
    const body = newBody(), a: PartPose = { turn: 0, along: 1, across: 1, out: 0 }, b: PartPose = { turn: 0, along: 1, across: 1, out: 0 }
    for (let f = 0; f < 20; f++) stride(body, 'twig', 4, DT, true, () => {})
    partPose('twig', body, 0, null, a)
    partPose('twig', body, 1, null, b)
    expect(a.turn).toBeCloseTo(-b.turn, 6)
    expect(Math.abs(a.turn)).toBeGreaterThan(0)
  })
})
