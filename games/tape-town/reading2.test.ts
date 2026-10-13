import { describe, expect, it } from 'vitest'
import { DT, drag, leastRoom, loaded, names, nudge, run, strip, townWith } from './bench'
import { fitFloor } from './floor'
import { rideOn } from './going'
import { TAPE_WIDTH } from './layout'
import { fit } from './stage'
import { lengthOf, type Strip } from './tape'
import { END_REACH, isWhole, peelNeeds, toyAt } from './touch'
import type { Town } from './town'
import { honk } from './voices'

// What the second reader found, each held by a test: a tap meets what is
// seen; a toy whose tape is peeled from under, beside or over it is settled
// at once; a short strip is one thing and a peel is a pull that is seen; a
// full floor is a calm one; and the small things after them.

const along = (s: Strip, d: number) => { const l = lengthOf(s); return { x: s.ax + ((s.bx - s.ax) * d) / l, y: s.ay + ((s.by - s.ay) * d) / l } }
/** The child peels a strip: a finger on its first end, pulled back along it to the other. */
const peel = (town: Town, s: Strip): void => drag(town, { x: s.ax, y: s.ay }, { x: s.bx, y: s.by }, 12)

describe('a tap meets what is seen', () => {
  const road = () => strip(0, 330, 300, 900, 300), river = () => strip(1, 620, 130, 620, 500)

  it('on a bridge a tap on the car or the bus on top gets that toy, and whoever is under is met only where nothing seen is on top of it', () => {
    for (const top of ['car', 'bus'] as const) {
      const town = townWith([road(), river()], { duck: { x: 620, y: 300, a: Math.PI / 2 }, [top]: { x: 700, y: 300, a: 0 } })
      expect(town.bodies.duck.hidden, top).toBe(true)
      // Both are under this finger: the one on the bridge is the one that is seen.
      expect(toyAt(town, { x: 650, y: 300 }), top).toBe(top)
      // Past the top toy's tail, only the duck is there.
      expect(toyAt(town, { x: 585, y: 300 }), top).toBe('duck')
      town.press({ x: 650, y: 300 })
      expect(town.hold?.id, top).toBe(top)
    }
  })

  it('a peg on the roof of the bus is met before the bus, and a toy in the air before the ones it flies over', () => {
    const town = townWith([road()], { bus: { x: 500, y: 300, a: 0 }, pegA: { x: 500, y: 300, a: 0 } })
    town.state.riding.pegA = true
    const roof = town.poseOf('pegA')
    expect(toyAt(town, { x: roof.x, y: roof.y })).toBe('pegA')
  })
})

describe('a toy whose tape is peeled is settled at once, as a load would settle it', () => {
  it('a duck nested in a hedge that is peeled stands whole on the boards, and goes to its river if one lies', () => {
    for (const blue of [false, true]) {
      const hedge = strip(2, 400, 300, 800, 300), river = strip(1, 400, 520, 800, 520)
      const town = townWith(blue ? [hedge, river] : [hedge], { duck: { x: 600, y: 300, a: 0 } })
      nudge(town)
      run(town, 2.2)
      expect(town.bodies.duck.doing).toMatchObject({ is: 'stand', as: 'nested' })
      town.takeSounds()
      peel(town, hedge)
      const doing = town.bodies.duck.doing
      // Not a lone tail on bare boards: it is a whole duck again in the call that takes the hedge away.
      expect(doing.is === 'stand' && (doing.as === 'nested' || doing.as === 'reeds')).toBe(false)
      if (blue) expect(doing).toMatchObject({ is: 'walk', gait: 'waddle' })
      else expect(doing).toMatchObject({ is: 'stand', as: 'parked' })
      // Settled in silence: the peel is heard, and nothing of the duck's.
      expect(names(run(town, 0)).filter((name) => name !== 'creak' && !name.startsWith('peel'))).toEqual([])
    }
  })

  it('a duck in the reeds whose river is peeled does not pop out onto another river: no strip is held by its place in a list', () => {
    const river = strip(1, 330, 300, 900, 300), hedge = strip(2, 620, 130, 620, 500), other = strip(1, 330, 560, 900, 560)
    const town = townWith([river, hedge, other], { duck: { x: 480, y: 300, a: 0 } })
    nudge(town)
    run(town, 3)
    expect(town.bodies.duck.doing).toMatchObject({ is: 'stand', as: 'reeds' })
    const at = { ...town.bodies.duck.at }
    peel(town, river)
    expect(town.state.strips).toHaveLength(2)
    run(town, 3)
    const duck = town.bodies.duck
    expect(Math.hypot(duck.at.x - at.x, duck.at.y - at.y)).toBeLessThan(TAPE_WIDTH)
    expect(duck.hidden).toBe(false)
    expect(duck.doing.is === 'stand' && duck.doing.as === 'reeds').toBe(false)
  })

  it('a rider keeps its own strip when an earlier one of the same tape is peeled from the list', () => {
    const first = strip(0, 330, 200, 900, 200), second = strip(0, 330, 480, 900, 480)
    const town = townWith([first, second], { car: { x: 500, y: 480, a: 0 } })
    nudge(town)
    run(town, 0.5)
    const own = town.state.strips[1]
    peel(town, first)
    const doing = town.bodies.car.doing
    expect(doing).toMatchObject({ is: 'ride', kind: 0 })
    if (doing.is === 'ride') expect(town.nets[0].strips[doing.rider.s]).toBe(own)
    run(town, 1)
    expect(Math.abs(town.bodies.car.at.y - 480)).toBeLessThan(1)
  })

  it('a car where two roads meet keeps the road it is on when an earlier strip is peeled, though the other road has taken its place in the list', () => {
    const first = strip(0, 330, 180, 520, 180), along = strip(0, 330, 480, 900, 480), across = strip(0, 640, 300, 640, 520)
    const town = townWith([first, along, across], { car: { x: 560, y: 480, a: 0 }, dog: { x: 340, y: 110, a: 0 } })
    nudge(town)
    for (let k = 0; k < 240 && Math.abs(town.bodies.car.at.x - 640) > 20; k++) run(town, DT)
    const before = town.bodies.car.doing
    if (before.is !== 'ride') throw new Error('the car is not riding')
    const own = town.nets[0].strips[before.rider.s]
    expect(Math.abs(town.bodies.car.at.x - 640)).toBeLessThanOrEqual(20)
    peel(town, first)
    const doing = town.bodies.car.doing
    expect(doing).toMatchObject({ is: 'ride', kind: 0 })
    if (doing.is === 'ride') expect(town.nets[0].strips[doing.rider.s]).toBe(own)
  })

  it('a duck under a bridge whose road is peeled from over it is seen again in that call, and swims on', () => {
    const road = strip(0, 330, 300, 900, 300), river = strip(1, 620, 130, 620, 500)
    const town = townWith([road, river], { duck: { x: 620, y: 300, a: Math.PI / 2 } })
    expect(town.bodies.duck.hidden).toBe(true)
    peel(town, road)
    expect(town.bodies.duck.hidden).toBe(false)
    expect(town.bodies.duck.doing).toMatchObject({ is: 'ride', kind: 1 })
  })

  it('a bus on a bridge whose road is peeled from under it does not stand on the duck that was under it', () => {
    const road = strip(0, 330, 300, 900, 300), river = strip(1, 620, 130, 620, 500)
    const town = townWith([road, river], { duck: { x: 620, y: 300, a: Math.PI / 2 }, bus: { x: 620, y: 300, a: 0 } })
    expect(leastRoom(town).room).toBeGreaterThanOrEqual(0)
    peel(town, road)
    let least = Infinity
    run(town, 2, [], () => { least = Math.min(least, leastRoom(town).room) })
    expect(least).toBeGreaterThanOrEqual(0)
    expect(town.bodies.bus.hidden || town.bodies.duck.hidden).toBe(false)
  })

  it('whoever was not on the tape that changed is left as it was', () => {
    const road = strip(0, 330, 200, 900, 200), hedge = strip(2, 400, 480, 800, 480)
    const town = townWith([road, hedge], { duck: { x: 600, y: 480, a: 0 } })
    nudge(town)
    run(town, 2.2)
    const before = { ...town.bodies.duck.doing }
    peel(town, road)
    expect(town.bodies.duck.doing).toMatchObject(before)
  })
})

describe('a stub is one thing, and a peel is a pull that is seen', () => {
  const stubAt = (town: Town): Strip => {
    town.press({ x: 600, y: 400 })
    town.lift()
    run(town, 0.6)
    town.takeSounds()
    return town.state.strips[0]
  }
  const pullFrom = (town: Town, s: Strip, from: number, by: number, across = 0): string[] => {
    const a = along(s, from), l = lengthOf(s), ux = (s.bx - s.ax) / l, uy = (s.by - s.ay) / l
    drag(town, a, { x: a.x + ux * by - uy * across, y: a.y + uy * by + ux * across }, 8)
    return town.takeSounds().map((sound) => sound.name)
  }

  it('a strip shorter than three reaches of an end has no two ends: a finger anywhere on it lifts it once', () => {
    const town = townWith([], {})
    const stub = stubAt(town)
    expect(isWhole(stub)).toBe(true)
    expect(isWhole(strip(0, 300, 300, 300 + END_REACH * 3 + 1, 300))).toBe(false)
    for (const d of [0, lengthOf(stub) / 2, lengthOf(stub)]) {
      town.press(along(stub, d))
      expect(town.grip?.strip).toBe(stub)
      expect(town.takeSounds().map((sound) => sound.name)).toEqual(['creak'])
      town.cancel()
    }
  })

  it('a pull through a stub of half its length takes nothing off: it lies down again with a pat', () => {
    const town = townWith([], {})
    const stub = stubAt(town)
    expect(peelNeeds(stub)).toBeGreaterThanOrEqual(TAPE_WIDTH)
    expect(peelNeeds(stub)).toBeGreaterThanOrEqual(lengthOf(stub))
    for (const from of [0, lengthOf(stub) / 2]) {
      const heard = pullFrom(town, stub, from, TAPE_WIDTH * 0.75)
      expect(heard).toContain('pat')
      expect(heard).not.toContain('peel-off')
      expect(town.state.strips).toEqual([stub])
    }
  })

  it('a pull along a stub of its own length, either way and from anywhere on it, takes it off', () => {
    for (const [from, by] of [[0, 1.1], [0.5, 1.1], [1, -1.1], [0.5, -1.1]]) {
      const town = townWith([], {})
      const stub = stubAt(town), heard = pullFrom(town, stub, from * lengthOf(stub), by * lengthOf(stub))
      expect(heard, `${from} ${by}`).toContain('peel-off')
      expect(town.state.strips, `${from} ${by}`).toEqual([])
    }
  })

  it('pulled across, a stub is not peeled: a new strip is laid from there', () => {
    const town = townWith([], {})
    const stub = stubAt(town)
    pullFrom(town, stub, lengthOf(stub) / 2, 0, 120)
    expect(town.state.strips).toHaveLength(2)
    expect(town.state.strips[0]).toBe(stub)
  })

  it('on a strip long enough to have ends, each end is its own: a finger at an end lifts it, a finger further in lays tape, and the strip comes off by a pull of its length less a tape-width', () => {
    const long = strip(0, 400, 400, 400 + END_REACH * 3 + 8, 400)
    const town = townWith([long], {})
    town.press({ x: 400 + END_REACH - 2, y: 400 })
    expect(town.grip).toMatchObject({ end: 0 })
    town.cancel()
    town.press({ x: long.bx - END_REACH + 2, y: 400 })
    expect(town.grip).toMatchObject({ end: 1 })
    town.cancel()
    town.takeSounds()
    town.press({ x: (long.ax + long.bx) / 2, y: 400 })
    expect(town.grip).toBeNull()
    expect(town.takeSounds().map((sound) => sound.name)).toEqual(['stick'])
    town.cancel()
    expect(peelNeeds(long)).toBeGreaterThanOrEqual(TAPE_WIDTH / 2)
    expect(peelNeeds(long)).toBe(lengthOf(long) - TAPE_WIDTH)
  })
})

describe('the quiet', () => {
  it('counts from the end of the last touch and never runs under a held finger', () => {
    const town = townWith([], {})
    town.press({ x: 600, y: 400 })
    run(town, 40)
    expect(town.level).toBe(1)
    town.move({ x: 700, y: 400 })
    run(town, 40)
    expect(town.level).toBe(1)
    town.lift()
    run(town, 14)
    expect(town.level).toBe(1)
    run(town, 11)
    expect(town.level).toBeCloseTo(0.5, 1)
    run(town, 11)
    expect(town.level).toBe(0)
  })

  it('takes only sound: the cat\'s eye still opens at a honk nobody hears', () => {
    const town = townWith([], {})
    nudge(town)
    run(town, 40)
    expect(town.level).toBe(0)
    town.hum(honk)
    expect(town.takeSounds()).toEqual([])
    expect(town.honkAt).toBe(town.time)
  })
})

describe('a surface of another size', () => {
  it('never moves or takes away a saved strip or a toy: the stage is fitted to the surface and the floor stays in stage units', () => {
    const strips = [strip(0, 300, 112, 950, 112), strip(1, 400, 112, 420, 180), strip(3, 500, 130, 900, 200)]
    const town = townWith(strips, { duck: { x: 600, y: 113, a: 0 }, pegA: { x: 320, y: 104, a: 0 } })
    const before = JSON.stringify(town.saved()), field = { ...town.field }
    for (const [width, height] of [[844, 390], [667, 375], [1024, 768], [820, 1180], [1180, 820]]) {
      town.setSurface(width, fitFloor(width, height))
      expect(JSON.stringify(town.saved()), `${width}x${height}`).toBe(before)
      expect(town.field, `${width}x${height}`).toEqual(field)
      // The home control is above the bare floor on the stage of every surface.
      expect(town.home.y + town.home.r, `${width}x${height}`).toBeLessThanOrEqual(town.field.y0)
      const by = fitFloor(width, height)
      expect(by.y + 820 * by.scale).toBeLessThanOrEqual(height + 0.001)
      expect(by.x).toBeCloseTo((width - 1180 * by.scale) / 2, 6)
    }
    // Where the plain fit keeps the control off the floor, the fit is the plain fit.
    for (const [width, height] of [[1180, 820], [820, 1180], [1024, 768], [1366, 1024]]) expect(fitFloor(width, height)).toEqual(fit(width, height))
    expect(fitFloor(0, 0).scale).toBe(0)
    expect(fitFloor(400, 60).scale).toBe(0)
  })
})

describe('after a load', () => {
  it('the bus stops for a peg that stands beside it, and does not call again for one it has just set down behind it', () => {
    const road = strip(0, 330, 300, 900, 300)
    const beside = townWith([road], { bus: { x: 500, y: 300, a: 0 }, pegA: { x: 508, y: 400, a: 0 } })
    beside.bodies.bus.doing = rideOn(0, { s: 0, d: 170, dir: 1, skip: -1 }, 'rumble')
    const found = loaded(beside)
    expect(found.served.has('pegA')).toBe(false)
    let least = Infinity
    run(found, 1.5, [], () => { least = Math.min(least, leastRoom(found).room) })
    expect(found.state.riding.pegA).toBe(true)
    expect(least).toBeGreaterThanOrEqual(0)
    const behind = townWith([road], { bus: { x: 500, y: 300, a: 0 }, pegA: { x: 400, y: 400, a: 0 } })
    const again = loaded(behind)
    expect(again.served.has('pegA')).toBe(true)
    run(again, 1.5)
    expect(again.state.riding.pegA).toBe(false)
    expect(again.bodies.bus.at.x).toBeGreaterThan(560)
  })
})
