import { describe, expect, it } from 'vitest'
import { carry, drag, loaded, names, nudge, run, strip, townWith, written } from './bench'
import { bandOf, fitFloor, reachTo } from './floor'
import { BASKET, BOX, CAT, EDGE, PLANT, ROLLS, ROLL_RADIUS, TOY_IDS, TOY_SIZE } from './layout'
import { deserializeTown, freshTown } from './save'
import { Town } from './town'

// Found as left. Put away at any instant and opened again, nothing is lost
// and nothing replays: a parked town and a loaded one are the same town.

const road = strip(0, 330, 300, 900, 300)

/** Every state the town can be put away in: a name, and how to get there. */
const STATES: [string, () => Town][] = [
  ['a first visit of a three-year-old', () => new Town(freshTown(3), 1)],
  ['a first visit with no age', () => new Town(freshTown(null), 1)],
  ['a first visit of a six-year-old', () => new Town(freshTown(6), 1)],
  ['the car driving', () => { const t = townWith([road], { car: { x: 420, y: 300, a: 0 } }); nudge(t); run(t, 1.1); return t }],
  ['the car in its three-point turn', () => { const t = townWith([road], { car: { x: 420, y: 300, a: 0 } }); nudge(t); run(t, 3.2); return t }],
  ['a strip being pulled', () => { const t = townWith([road]); t.press({ x: 400, y: 450 }); t.move({ x: 700, y: 480 }); run(t, 0.2); return t }],
  ['a strip just laid, the press still running', () => { const t = townWith([road]); drag(t, { x: 400, y: 450 }, { x: 800, y: 480 }); run(t, 0.05); return t }],
  ['a strip being peeled', () => { const t = townWith([road]); t.press({ x: 332, y: 300 }); t.move({ x: 500, y: 300 }); run(t, 0.2); return t }],
  ['a torn end lifted and not yet pulled', () => { const t = townWith([road]); t.press({ x: 332, y: 300 }); run(t, 0.2); return t }],
  ['a toy in the hand', () => { const t = townWith([road]); t.press({ x: 630, y: 645 }); t.move({ x: 600, y: 420 }); run(t, 0.3); return t }],
  ['a toy just tapped', () => { const t = townWith([road]); t.press({ x: 370, y: 540 }); t.lift(); run(t, 0.1); return t }],
  ['a toy hopping aside', () => { const t = townWith([road], { car: { x: 420, y: 300, a: 0 }, pegB: { x: 600, y: 300, a: 0 } }); nudge(t); let n = 0; while (!t.bodies.pegB.flight && n++ < 300) t.step(1 / 60); run(t, 0.1); return t }],
  ['the box going over', () => { const t = townWith([road]); t.press({ x: 120, y: 220 }); t.lift(); t.press({ x: 120, y: 220 }); t.lift(); run(t, 1.2); return t }],
  ['the toys going home', () => { const t = townWith([road], { car: { x: 420, y: 300, a: 0 } }); nudge(t); run(t, 1); t.press({ x: 120, y: 220 }); t.lift(); run(t, 1.1); return t }],
  ['the toys in the upright box', () => { const t = townWith([road]); t.press({ x: 120, y: 220 }); t.lift(); run(t, 5); return t }],
  ['the car nosed into a hedge', () => { const t = townWith([strip(2, 330, 300, 900, 300)]); carry(t, 'car', { x: 600, y: 300 }); run(t, 0.8); return t }],
  ['the car backing out of the hedge', () => { const t = townWith([strip(2, 330, 300, 900, 300)]); carry(t, 'car', { x: 600, y: 300 }); run(t, 1.8); return t }],
  ['a toy stuck under a new strip', () => { const t = townWith([], { train: { x: 600, y: 300, a: 0 } }); drag(t, { x: 380, y: 300 }, { x: 900, y: 300 }); run(t, 0.5); return t }],
  ['the bus at a stop, a peg in the air', () => { const t = townWith([strip(0, 300, 300, 950, 300)], { bus: { x: 400, y: 300, a: 0 }, pegA: { x: 560, y: 410, a: 0 } }); nudge(t); t.served.clear(); let n = 0; while (!t.bodies.pegA.flight?.started && n++ < 600) t.step(1 / 60); return t }],
  ['a peg riding the bus', () => { const t = townWith([strip(0, 300, 300, 950, 300)], { bus: { x: 400, y: 300, a: 0 }, pegA: { x: 560, y: 410, a: 0 } }); nudge(t); t.served.clear(); run(t, 5); return t }],
  ['the dog following the car', () => { const t = townWith([road], { car: { x: 420, y: 300, a: 0 }, dog: { x: 400, y: 440, a: 0 } }); nudge(t); run(t, 2); return t }],
  ['the duck under a bridge', () => { const t = townWith([strip(1, 330, 300, 900, 300), strip(0, 620, 130, 620, 500)], { duck: { x: 560, y: 300, a: 0 } }); nudge(t); run(t, 0.6); return t }],
  ['the train out of a tunnel with a leaf on its funnel', () => { const t = townWith([strip(3, 620, 130, 620, 520), strip(2, 330, 300, 900, 300)], { train: { x: 620, y: 200, a: Math.PI / 2 } }); nudge(t); let n = 0; while (t.bodies.train.leafAt === -Infinity && n++ < 600) t.step(1 / 60); return t }],
  ['the oldest strip lifting', () => { const t = townWith(Array.from({ length: 64 }, (_, k) => strip(1, 320 + (k % 16) * 38, 130 + Math.floor(k / 16) * 120, 320 + (k % 16) * 38, 215 + Math.floor(k / 16) * 120))); drag(t, { x: 400, y: 630 }, { x: 800, y: 630 }); run(t, 0.1); return t }],
  ['a roll just picked and the cat just touched', () => { const t = townWith([road]); t.press({ x: 1092, y: 300 }); t.lift(); nudge(t); run(t, 0.1); return t }],
]

describe('parked equals loaded', () => {
  for (const [name, make] of STATES) {
    it(`put away with ${name}, the town is the one a load would find`, () => {
      const town = make()
      town.rest()
      const parked = written(town), fresh = written(loaded(town))
      expect(parked).toEqual(fresh)
      expect(parked.hand).toEqual([false, false, false, false])
      expect((parked.short as unknown[]).slice(0, 5)).toEqual([0, 0, 0, false, false])
      expect(parked.sounds).toEqual([])
    })
  }

  it('put away under a finger that is still down, nothing the finger had not finished is done for it', () => {
    const pulling = STATES[5][1](), peeling = STATES[7][1](), holding = STATES[9][1]()
    pulling.rest()
    peeling.rest()
    holding.rest()
    expect(pulling.state.strips.length).toBe(1)
    expect(peeling.state.strips.length).toBe(1)
    expect(holding.bodies.duck.at).toMatchObject({ x: 630, y: 645 })
  })

  it('put away in the air, a toy is where it was going', () => {
    const town = STATES[11][1]()
    const to = { ...town.bodies.pegB.at }
    town.rest()
    expect(town.poseOf('pegB')).toMatchObject({ x: Math.round(to.x), y: Math.round(to.y), lift: 0 })
  })

  it('a parked town and a loaded town go on the same way', () => {
    for (const [, make] of STATES.slice(3)) {
      const town = make()
      town.rest()
      const twin = loaded(town)
      nudge(town)
      nudge(twin)
      expect(names(run(town, 3))).toEqual(names(run(twin, 3)))
    }
  })
})

describe('nothing starts or sounds on load', () => {
  it('a loaded town makes no sound until it is touched, however long it is watched', () => {
    for (const [name, make] of STATES) {
      const town = make()
      town.rest()
      const fresh = loaded(town)
      // No sound: what a habit leaves on the floor (a ripple, a puff) is not sound and is drawn as ever.
      expect(names(run(fresh, 6)), name).toEqual([])
      expect(fresh.playing, name).toBe(false)
    }
  })

  it('no clock is part way on load: nothing was just tapped, landed, ripped or honked', () => {
    const town = loaded(STATES[3][1]())
    const short = written(town)
    expect(short.times).toEqual(Array(9).fill(false))
    for (const id of TOY_IDS) expect((short.toys as Record<string, { tapped: boolean; landed: boolean }>)[id]).toMatchObject({ tapped: false, landed: false })
    expect(town.level).toBe(0)
  })

  it('a toy found on a tape where it does its funny thing waits for the child, and does it at the first touch', () => {
    const town = townWith([strip(2, 330, 300, 900, 300)], { car: { x: 600, y: 300, a: 0 } })
    expect(town.bodies.car.doing).toMatchObject({ is: 'stand', as: 'dormant' })
    expect(names(run(town, 3))).toEqual([])
    nudge(town)
    expect(names(run(town, 2.5))).toContain('wheel-spin')
  })

  it('the town grows quiet while it is only watched, and is as loud as ever at the next touch', () => {
    const town = townWith([road], { car: { x: 420, y: 300, a: 0 } })
    nudge(town)
    expect(names(run(town, 5))).toContain('purr')
    run(town, 40)
    expect(names(run(town, 5))).toEqual([])
    nudge(town)
    expect(names(run(town, 3))).toContain('purr')
  })
})

describe('age is only a first-visit default', () => {
  it('a saved town opens the same whatever the age', () => {
    const saved = JSON.parse(JSON.stringify(STATES[3][1]().saved()))
    const towns = [3, 7, null].map((age) => written(new Town(deserializeTown(saved, age), 1)))
    expect(towns[1]).toEqual(towns[0])
    expect(towns[2]).toEqual(towns[0])
  })

  it('every toy, tape and crossing is there for every age from the first touch', () => {
    for (const age of [3, 5, 7, null]) {
      const town = new Town(freshTown(age), 1)
      expect(town.state.out).toBe(true)
      for (const roll of ROLLS) { town.press(roll); town.lift() }
      expect(town.state.roll).toBe(3)
      drag(town, { x: 400, y: 500 }, { x: 800, y: 520 })
      expect(town.state.strips.at(-1)!.kind).toBe(3)
    }
  })
})

describe('the home control', () => {
  const SIZES: [number, number][] = [[1180, 820], [1024, 768], [1366, 1024], [844, 390], [820, 1180]]

  for (const [width, height] of SIZES) {
    it(`at ${width} by ${height} nothing a child touches lies under it, and nothing the child does puts anything there`, () => {
      for (const age of [3, 6]) {
        const town = new Town(freshTown(age), 1)
        town.setSurface(width, fitFloor(width, height))
        const home = town.home, clearOf = (x: number, y: number, r: number): number => Math.hypot(x - home.x, y - home.y) - home.r - r
        for (const roll of ROLLS) expect(clearOf(roll.x, roll.y, ROLL_RADIUS)).toBeGreaterThan(0)
        expect(reachTo({ x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2, a: 0 }, { long: BOX.w, wide: BOX.h }, home)).toBeGreaterThan(home.r)
        expect(reachTo({ x: BASKET.x, y: BASKET.y, a: 0 }, { long: BASKET.rx * 2, wide: BASKET.ry * 2 }, home)).toBeGreaterThan(home.r)
        expect(clearOf(PLANT.x, PLANT.y, PLANT.r)).toBeGreaterThan(0)
        expect(reachTo({ x: CAT.x, y: CAT.y, a: 0 }, { long: CAT.rx * 2, wide: CAT.ry * 2 }, home)).toBeGreaterThan(home.r)
        // A strip pulled along the very top, and a toy carried up to the control and let go.
        drag(town, { x: home.x - 250, y: home.y }, { x: home.x + 250, y: home.y })
        carry(town, 'duck', { x: home.x, y: home.y })
        carry(town, 'bus', { x: home.x + 30, y: home.y + home.r })
        run(town, 6)
        for (const laid of town.state.strips) { const band = bandOf(laid); expect(reachTo(band.pose, band.size, home)).toBeGreaterThan(home.r) }
        for (const id of TOY_IDS) expect(reachTo(town.poseOf(id), TOY_SIZE[id], home), id).toBeGreaterThan(home.r)
        expect(town.field.y0).toBeGreaterThanOrEqual(home.y + home.r)
        expect(EDGE).toBeGreaterThanOrEqual(TOY_SIZE.bus.wide / 2)
      }
    })

    it(`at ${width} by ${height} a finger on the home control changes nothing and makes no sound`, () => {
      const town = new Town(freshTown(3), 1)
      town.setSurface(width, fitFloor(width, height))
      const before = JSON.stringify(town.saved())
      town.press({ x: town.home.x + 6, y: town.home.y + 4 })
      town.move({ x: town.home.x + 200, y: town.home.y + 300 })
      town.lift()
      expect(town.takeSounds()).toEqual([])
      expect(JSON.stringify(town.saved())).toBe(before)
    })
  }
})
