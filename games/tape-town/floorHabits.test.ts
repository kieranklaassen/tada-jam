import { describe, expect, it } from 'vitest'
import { carry, drag, leastRoom, names, nudge, run, strip, townWith } from './bench'
import { TAPPED_MOVE } from './motion'
import { TOY_IDS } from './layout'
import { TAPPED } from './voices'

// The last two columns of the grid (the bare floor, and a tap), the dog's
// following, and the bus's line between two peg people.

describe('on the bare floor', () => {
  it('the car scoots to the nearest end of a road, a clack at each gap, and drives it', () => {
    const town = townWith([strip(0, 500, 300, 900, 300)])
    carry(town, 'car', { x: 380, y: 420 })
    const heard = names(run(town, 2))
    expect(heard).toContain('clack')
    expect(heard).toContain('purr')
    expect(town.bodies.car.doing.is).toBe('ride')
  })

  it('with no road the car turns one doughnut and parks with a beep, where it was set', () => {
    const town = townWith()
    carry(town, 'car', { x: 600, y: 300 })
    const start = town.frames
    expect(town.takeSounds().map((sound) => sound.name)).toEqual(['parp', 'pick-up', 'set-down', 'brrm'])
    const log = run(town, 1.5)
    expect(names(log)).toEqual(['beep'])
    expect(log[0].frame - start).toBe(60)
    expect(log[0].name).toBe('beep')
    expect(town.bodies.car.doing).toMatchObject({ is: 'stand', as: 'parked' })
    expect(Math.hypot(town.bodies.car.at.x - 600, town.bodies.car.at.y - 300)).toBeLessThan(1)
  })

  it('the bus lumbers to the nearest road with a drone, and with no road sinks on its springs', () => {
    const withRoad = townWith([strip(0, 500, 300, 900, 300)])
    carry(withRoad, 'bus', { x: 420, y: 420 })
    expect(names(run(withRoad, 2.5))).toContain('drone')
    const none = townWith()
    carry(none, 'bus', { x: 600, y: 300 })
    none.takeSounds()
    expect(names(run(none, 1.5))).toContain('pssh')
  })

  it('the duck waddles toward the nearest blue, and with no blue sits and preens', () => {
    const withBlue = townWith([strip(1, 500, 300, 900, 300)])
    carry(withBlue, 'duck', { x: 600, y: 440 })
    const heard = names(run(withBlue, 4))
    expect(heard).toContain('pat-pat')
    expect(withBlue.bodies.duck.doing).toMatchObject({ is: 'ride', gait: 'swim' })
    const none = townWith()
    carry(none, 'duck', { x: 600, y: 300 })
    none.takeSounds()
    expect(names(run(none, 2))).toContain('preen')
  })

  it('the train sits where it is, puffing and clanking, and will not move', () => {
    const town = townWith([strip(3, 500, 300, 900, 300)])
    carry(town, 'train', { x: 420, y: 440 })
    town.takeSounds()
    const heard = names(run(town, 4))
    expect(heard.filter((name) => name === 'clank').length).toBeGreaterThanOrEqual(2)
    expect(Math.hypot(town.bodies.train.at.x - 420, town.bodies.train.at.y - 440)).toBeLessThan(1)
  })

  it('the dog with nobody to follow turns round three times and lies down with a hmf', () => {
    const town = townWith()
    carry(town, 'dog', { x: 600, y: 300 })
    town.takeSounds()
    expect(names(run(town, 2.5))).toContain('hmf')
    expect(town.bodies.dog.doing).toMatchObject({ is: 'stand', as: 'lying' })
  })

  it('the dog follows whoever passed last, sniffing, and keeps behind them', () => {
    const town = townWith([strip(0, 330, 300, 900, 300)], { car: { x: 420, y: 300, a: 0 }, dog: { x: 400, y: 420, a: 0 } })
    nudge(town)
    const heard = names(run(town, 3))
    expect(heard).toContain('sniff')
    expect(town.leader?.id).toBe('car')
    expect(town.bodies.dog.doing).toMatchObject({ is: 'walk', follow: true })
    expect(Math.hypot(town.bodies.dog.at.x - town.bodies.car.at.x, town.bodies.dog.at.y - town.bodies.car.at.y)).toBeLessThan(330)
  })

  it('a stub is a whole road: the car spins on it like a top; the duck sits in a blue one as in a bath', () => {
    const town = townWith([strip(0, 569, 300, 631, 300), strip(1, 569, 450, 631, 450)])
    carry(town, 'car', { x: 600, y: 300 })
    carry(town, 'duck', { x: 600, y: 450 })
    const heard = names(run(town, 2))
    expect(heard.filter((name) => name === 'whirr').length).toBe(2)
    expect(heard).toContain('beep')
    expect(town.bodies.duck.doing).toMatchObject({ is: 'stand', as: 'bath' })
  })
})

describe('a tap', () => {
  it('every toy answers a tap in the frame the finger lands, with its own sounds on their own beats', () => {
    for (const id of TOY_IDS) {
      const town = townWith()
      const at = town.poseOf(id)
      town.press({ x: at.x, y: at.y })
      const first = town.takeSounds().map((sound) => sound.name)
      expect(first[0]).toBe(TAPPED[id][0].name)
      town.lift()
      const log = run(town, 1.2)
      TAPPED_MOVE[id].cues.slice(1).forEach((cue, k) => {
        const heard = log.find((entry) => entry.name === TAPPED[id][k + 1].name)
        expect(heard, `${id} ${k}`).toBeDefined()
        expect(Math.abs(heard!.frame - cue * 60)).toBeLessThanOrEqual(1.01)
      })
    }
  })
})

describe('the bus line', () => {
  it('stops beside a peg with a hiss and a ding; the peg hops aboard, and hops off at the next peg', () => {
    const town = townWith([strip(0, 300, 300, 960, 300)], { bus: { x: 400, y: 300, a: 0 }, pegA: { x: 560, y: 410, a: 0 }, pegB: { x: 800, y: 410, a: 0 } })
    nudge(town)
    town.served.clear()
    const log = run(town, 4.2)
    const heard = names(log)
    expect(heard).toContain('door-hiss')
    expect(heard).toContain('hup')
    expect(heard).toContain('stop-ding')
    expect(town.state.riding.pegA).toBe(true)
    const more = names(run(town, 5))
    expect(more).toContain('hop-peg-a')
    expect(town.state.riding.pegA).toBe(false)
    expect(town.state.riding.pegB).toBe(true)
    // The one who got off stands on bare floor beside the road, not on it.
    expect(Math.abs(town.bodies.pegA.at.y - 300)).toBeGreaterThan(69)
  })

  it('a peg set on the bus by the child rides it, and is saved as riding', () => {
    const town = townWith([], { bus: { x: 500, y: 300, a: 0 }, pegC: { x: 700, y: 400, a: 0 } })
    carry(town, 'pegC', { x: 505, y: 300 })
    expect(town.state.riding.pegC).toBe(true)
    expect(town.takeSounds().map((sound) => sound.name)).toContain('hup')
    const on = town.poseOf('pegC')
    expect(Math.hypot(on.x - 500, on.y - 300)).toBeLessThan(5)
  })

  it('a strip pulled for somebody who wants it calls them: the car revs at a grey strip as it comes off the roll', () => {
    const town = townWith([], { car: { x: 420, y: 200, a: 0 } })
    town.press({ x: 500, y: 400 })
    town.move({ x: 560, y: 400 })
    expect(town.takeSounds().map((sound) => sound.name)).toContain('rev')
    town.move({ x: 800, y: 400 })
    town.lift()
    run(town, 1.5)
    expect(town.bodies.car.doing).toMatchObject({ is: 'ride', gait: 'drive' })
    drag(town, { x: 884, y: 762 }, { x: 884, y: 762 }, 1)
  })
})

describe('set down by the child on a tape it travels', () => {
  it('a train let go askew on its rail, with a peg beside the rail, is set along the rail clear of the peg and chuffs off', () => {
    const town = townWith([strip(3, 660, 480, 950, 480)], { train: { x: 600, y: 640, a: Math.PI / 2 }, pegA: { x: 685, y: 530, a: 0 } })
    nudge(town)
    carry(town, 'train', { x: 760, y: 480 })
    const train = town.bodies.train
    expect(Math.abs(train.at.y - 480)).toBeLessThan(1)
    expect(Math.abs(Math.sin(train.at.a))).toBeLessThan(0.01)
    expect(train.doing).toMatchObject({ is: 'ride', kind: 3 })
    expect(leastRoom(town).room).toBeGreaterThanOrEqual(0)
    // The peg was not moved to make room: the child's arrangement is kept.
    expect(town.poseOf('pegA')).toMatchObject({ x: 685, y: 530 })
  })

  it('a car let go across a road is turned along it, facing the way it was nearest to facing', () => {
    const town = townWith([strip(0, 400, 300, 900, 300)], { car: { x: 620, y: 470, a: 2.4 } })
    nudge(town)
    carry(town, 'car', { x: 640, y: 310 })
    expect(town.bodies.car.at.y).toBeCloseTo(300, 0)
    expect(Math.cos(town.bodies.car.at.a)).toBeLessThan(-0.99)
  })
})
