import { describe, expect, it } from 'vitest'
import { carry, drag, names, nudge, run, strip, townWith } from './bench'
import { offTape } from './floor'
import { BASKET, PLANT, TOY_SIZE } from './layout'
import { MAX_STRIPS, lengthOf } from './tape'

// What a finger does besides pulling tape: carrying a toy, sticking one
// down, peeling a strip, and touching the things that stand round the floor.

const heard = (town: ReturnType<typeof townWith>): string[] => town.takeSounds().map((sound) => sound.name)

describe('carrying a toy', () => {
  it('a toy under a finger that moves comes up with its own sound and follows the finger', () => {
    const town = townWith()
    town.press({ x: 630, y: 645 })
    expect(heard(town)).toEqual(['squash'])
    town.move({ x: 632, y: 640 })
    expect(town.bodies.duck.doing.is).toBe('stand')
    town.move({ x: 600, y: 400 })
    expect(heard(town)).toEqual(['pick-up'])
    expect(town.poseOf('duck')).toMatchObject({ x: 600, y: 400 })
    expect(town.poseOf('duck').lift).toBeGreaterThan(0)
  })

  it('a toy in the hand is saved where it was picked up, and set down it is saved where it stands', () => {
    const town = townWith()
    town.press({ x: 630, y: 645 })
    town.move({ x: 600, y: 400 })
    run(town, 0.3)
    expect((town.saved().toys as Record<string, unknown>).duck).toEqual({ x: 630, y: 645, a: 0 })
    town.lift()
    expect(heard(town)).toContain('set-down')
    expect((town.saved().toys as Record<string, unknown>).duck).toMatchObject({ x: 600, y: 400 })
  })

  it('set down on another toy it stands beside it; set down in the tipped box it rolls straight out with a rattle', () => {
    const town = townWith()
    carry(town, 'pegA', { x: 860, y: 540 })
    expect(Math.hypot(town.bodies.pegA.at.x - 860, town.bodies.pegA.at.y - 540)).toBeGreaterThan(40)
    town.takeSounds()
    carry(town, 'pegB', { x: 120, y: 220 })
    expect(heard(town)).toContain('box-rattle')
    const log = names(run(town, 1))
    expect(log).toContain('land-peg-b')
    expect(town.bodies.pegB.at.x).toBeGreaterThan(250)
    expect(town.state.out).toBe(true)
  })

  it('a toy is touched where it is drawn: on the move, in the air, and on the roof of the bus', () => {
    const town = townWith([strip(0, 330, 300, 900, 300)], { car: { x: 420, y: 300, a: 0 } })
    nudge(town)
    run(town, 1.3)
    const car = town.poseOf('car')
    expect(car.x).toBeGreaterThan(560)
    town.press({ x: car.x + 20, y: car.y })
    expect(heard(town)).toEqual(['parp'])
    town.lift()
    carry(town, 'pegC', town.poseOf('bus'))
    town.takeSounds()
    const roof = town.poseOf('pegC')
    town.press({ x: roof.x, y: roof.y })
    expect(heard(town)).toEqual(['hee-c'])
    town.lift()
  })
})

describe('tape that sticks a toy down', () => {
  it('a strip pulled across a standing toy sticks it: it strains, pops free with a thwip and then does what it does on that tape', () => {
    const town = townWith([], { train: { x: 600, y: 300, a: 0 } })
    town.press({ x: 1092, y: 560 })
    town.lift()
    town.takeSounds()
    drag(town, { x: 380, y: 300 }, { x: 900, y: 300 })
    expect(heard(town)).toContain('strain')
    expect(town.bodies.train.doing.is).toBe('stuck')
    const log = run(town, 3.2)
    const thwip = log.find((entry) => entry.name === 'thwip')!
    expect(thwip.frame).toBe(Math.round(0.9 * 60))
    expect(names(log)).toContain('chuff')
    expect(town.bodies.train.doing).toMatchObject({ is: 'ride', gait: 'chuff' })
  })
})

describe('the peel', () => {
  const laid = strip(0, 400, 300, 800, 300)

  it('a finger on a torn end lifts it in that frame with a creak', () => {
    const town = townWith([laid])
    town.press({ x: 404, y: 304 })
    expect(heard(town)).toEqual(['creak'])
    expect(town.grip).toMatchObject({ mode: 'lifted', end: 0 })
  })

  it('pulled back along the strip it comes off with a long rip, and is gone when the finger lifts', () => {
    const town = townWith([laid])
    town.press({ x: 404, y: 304 })
    town.takeSounds()
    for (let x = 440; x <= 800; x += 40) town.move({ x, y: 310 })
    const ticks = heard(town)
    expect(ticks.length).toBeGreaterThan(6)
    expect(new Set(ticks)).toEqual(new Set(['peel-tick']))
    expect(town.state.strips.length).toBe(1)
    town.lift()
    expect(heard(town)).toEqual(['peel-off'])
    expect(town.state.strips.length).toBe(0)
    expect((town.saved().strips as unknown[]).length).toBe(0)
  })

  it('comes off over its own length, following the finger: a short pull back that is let go lays the strip back with a pat, and nothing is lost or laid', () => {
    for (const to of [470, 560, 700]) {
      const town = townWith([laid])
      town.press({ x: 404, y: 304 })
      for (let x = 440; x <= to; x += 30) town.move({ x, y: 306 })
      expect(town.grip).toMatchObject({ mode: 'peel' })
      expect(town.grip!.d).toBeGreaterThan(to - 440)
      town.takeSounds()
      town.lift()
      expect(heard(town), `let go at ${to}`).toEqual(['pat'])
      expect(town.state.strips, `let go at ${to}`).toEqual([laid])
      expect(town.grip).toBeNull()
      expect(town.pull).toBeNull()
    }
    // And the same pull carried on to the far end takes it off.
    const town = townWith([laid])
    town.press({ x: 404, y: 304 })
    for (let x = 440; x <= 770; x += 30) town.move({ x, y: 306 })
    town.lift()
    expect(town.state.strips.length).toBe(0)
  })

  it('a toy on a strip that is peeled stops and waits where it stood', () => {
    const town = townWith([laid], { car: { x: 600, y: 300, a: 0 } })
    nudge(town)
    run(town, 0.3)
    town.press({ x: 404, y: 304 })
    town.move({ x: 470, y: 300 })
    const at = { ...town.bodies.car.at }
    run(town, 0.5)
    expect(town.bodies.car.at).toEqual(at)
    town.move({ x: 780, y: 300 })
    town.lift()
    run(town, 1)
    expect(town.bodies.car.at).toEqual(at)
    expect(town.bodies.car.doing).toMatchObject({ is: 'stand', as: 'parked' })
  })

  it('pulled any other way the end drops back with a pat and a new strip is laid from there, so joining two roads never peels one', () => {
    const town = townWith([laid])
    town.press({ x: 796, y: 300 })
    town.takeSounds()
    town.move({ x: 830, y: 330 })
    expect(heard(town)).toContain('pat')
    expect(town.grip).toBeNull()
    town.move({ x: 900, y: 420 })
    town.lift()
    expect(town.state.strips.length).toBe(2)
    expect(town.state.strips[0]).toEqual(laid)
    expect(lengthOf(town.state.strips[1])).toBeGreaterThan(100)
  })

  it('lifted with no pull, the end drops back with a pat and a stub is laid there', () => {
    const town = townWith([laid])
    town.press({ x: 404, y: 304 })
    town.lift()
    expect(heard(town).slice(0, 2)).toEqual(['creak', 'pat'])
    expect(town.state.strips.length).toBe(2)
  })

  it('when the floor is full, one more strip lifts the oldest with its own small rip, seen as it goes', () => {
    const town = townWith(Array.from({ length: MAX_STRIPS }, (_, k) => strip(1, 320 + (k % 16) * 38, 130 + Math.floor(k / 16) * 120, 320 + (k % 16) * 38, 215 + Math.floor(k / 16) * 120)))
    const oldest = town.state.strips[0]
    town.takeSounds()
    drag(town, { x: 400, y: 630 }, { x: 800, y: 630 })
    expect(heard(town)).toContain('small-rip')
    expect(town.state.strips.length).toBe(MAX_STRIPS)
    expect(town.state.strips).not.toContain(oldest)
    expect(town.lifting.map((lifting) => lifting.strip)).toEqual([oldest])
    run(town, 0.5)
    expect(town.lifting).toEqual([])
  })

  it('nothing in the model counts strips or roads for the child: the town has no tally to show', () => {
    const town = townWith([laid])
    expect(Object.keys(town.saved()).sort()).toEqual(['finished', 'out', 'position', 'riding', 'roll', 'strips', 'toys', 'v'])
  })
})

describe('the things that stand round the floor', () => {
  it('the basket of wool and the plant answer a touch, each in its own way; nothing drawn is dead', () => {
    const town = townWith()
    town.press({ x: BASKET.x, y: BASKET.y })
    expect(heard(town)).toEqual(['pomf'])
    expect(town.basketAt).toBe(town.time)
    town.lift()
    town.press({ x: PLANT.x, y: PLANT.y })
    expect(heard(town)).toEqual(['frond'])
    expect(town.plantAt).toBe(town.time)
    town.lift()
    town.press({ x: 600, y: 790 })
    expect(heard(town)).toEqual(['pff'])
    town.lift()
    town.press({ x: 500, y: 20 })
    expect(heard(town)).toEqual(['tok'])
  })

  it('the cat opens an eye when something honks, and turns an ear at every rip', () => {
    const town = townWith()
    expect(town.honkAt).toBe(-Infinity)
    town.press({ x: 330, y: 650 })
    expect(town.honkAt).toBe(town.time)
    town.lift()
    drag(town, { x: 500, y: 300 }, { x: 700, y: 300 })
    expect(town.ripAt).toBe(town.time)
  })

  it('a strip laid by the child may cross a toy, but the game still keeps its own hops off it', () => {
    const town = townWith([strip(0, 330, 300, 900, 300)], { car: { x: 420, y: 300, a: 0 }, pegA: { x: 600, y: 300, a: 0 } })
    nudge(town)
    run(town, 2)
    for (const laid of town.state.strips) expect(offTape(laid, town.bodies.pegA.at, TOY_SIZE.pegA)).toBeGreaterThanOrEqual(4)
  })
})
