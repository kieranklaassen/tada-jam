import { describe, expect, it } from 'vitest'
import { CORNER } from './overlay'
import { STAGE } from './stage'
import { BALLOON, BASKET, BERG, CATAPULT, CHICK, CLOUD, CRATE, DRIFT, FLOORS, HOME_CONTROL, ICE_Y, IGLOO, PENGUIN, PUFFIN, SEALS, SEA_Y, SHELF_EDGE, SPOUT, SQUARE, WALRUS, WHALE, WHALE_EYE, inCloud, inDrift, inSpout, thingAt, type Thing } from './world'

/** What each thing takes up of the top of the shelf or the water, from left to right. */
const footprints: [string, number, number][] = [
  ['crate', CRATE.x0, CRATE.x1],
  ['near seal', SEALS[0].x - SEALS[0].r, SEALS[0].x + SEALS[0].r],
  ['igloo', IGLOO.x - IGLOO.r, IGLOO.x + IGLOO.r],
  ['drift', DRIFT.x - DRIFT.rx, DRIFT.x + DRIFT.rx],
  ['far seal', SEALS[1].x - SEALS[1].r, SEALS[1].x + SEALS[1].r],
  ['whale', WHALE.x - WHALE.r, WHALE.x + WHALE.r],
  ['iceberg', BERG.x0, BERG.x1],
]

describe('the landscape', () => {
  it('stands every thing in its own place along the ice and the water, and the drift behind the igloo and in front of the far seal', () => {
    for (let i = 1; i < footprints.length; i++) {
      // The drift lies in the gap between the igloo and the far seal and leans on both: the igloo stands in front of its near flank, and its far flank lies over the seal's tail.
      // And the whale's back lies under the water against the foot of the iceberg, whose wall is what a flight meets there.
      const lean = footprints[i][0] === 'drift' || footprints[i - 1][0] === 'drift' ? 24 : footprints[i][0] === 'iceberg' ? 30 : 0
      expect(footprints[i][1], `${footprints[i - 1][0]} and ${footprints[i][0]}`).toBeGreaterThanOrEqual(footprints[i - 1][2] - lean)
    }
    // Its crest is clear of both: what comes down on the drift comes down on the drift.
    expect(DRIFT.x - IGLOO.x).toBeGreaterThan(IGLOO.r)
    expect(SEALS[1].x - DRIFT.x).toBeGreaterThan(SEALS[1].r)
    // The things of the shelf are on the shelf, and the whale is in the water.
    for (const [name, x0, x1] of footprints.slice(0, 5)) {
      expect(x0, name).toBeGreaterThan(0)
      // The far seal lies at the very edge of the shelf, its belly out over the water by under a fifth of its width.
      expect(x1, name).toBeLessThanOrEqual(SHELF_EDGE + (name === 'far seal' ? SEALS[1].r * 0.4 : 0))
    }
    expect(SEALS[1].x).toBeLessThan(SHELF_EDGE)
    expect(WHALE.x - WHALE.r).toBeGreaterThan(SHELF_EDGE)
    expect(BERG.x0).toBeLessThan(STAGE.width)
    expect(BERG.x1).toBeGreaterThan(STAGE.width)
  })

  it('leaves bare ice to land on between the things of the shelf', () => {
    const gaps = footprints.slice(0, 5).map(([, , x1], i) => footprints[i + 1][1] - x1)
    // Between the kit and the near seal, and between the near seal and the igloo: each wider than the penguin.
    expect(gaps[0]).toBeGreaterThanOrEqual(PENGUIN.width * 0.9)
    expect(gaps[1]).toBeGreaterThanOrEqual(PENGUIN.width)
  })

  it('keeps the sky things clear of each other and of the catapult', () => {
    for (const puff of CLOUD) {
      expect(Math.hypot(puff.x - BALLOON.x, puff.y - BALLOON.y)).toBeGreaterThan(puff.r + BALLOON.r)
      expect(puff.x + puff.r).toBeLessThan(BASKET.x0)
      // The pouch is never pulled into the cloud.
      expect(Math.hypot(puff.x - CATAPULT.fork.x, puff.y - CATAPULT.fork.y)).toBeGreaterThan(puff.r + CATAPULT.reach * 0.2)
    }
    expect(BASKET.y0).toBeGreaterThan(BALLOON.y + BALLOON.r)
    expect(BALLOON.y - BALLOON.r).toBeGreaterThan(0)
  })

  it('stands the friends inside their own places', () => {
    // The chick in the igloo's doorway, inside the dome.
    expect(Math.hypot(CHICK.x - IGLOO.x, CHICK.y - CHICK.r - IGLOO.y)).toBeLessThanOrEqual(IGLOO.r + 1)
    expect(CHICK.y + CHICK.r).toBeLessThanOrEqual(ICE_Y)
    // The walrus in the face of the iceberg.
    expect(WALRUS.x - WALRUS.r).toBeGreaterThanOrEqual(BERG.x0)
    expect(WALRUS.y - WALRUS.r).toBeGreaterThanOrEqual(BERG.y0)
    expect(WALRUS.x + WALRUS.r).toBeLessThanOrEqual(STAGE.width)
    // The puffin at the rim of its basket.
    expect(PUFFIN.x).toBeGreaterThan(BASKET.x0)
    expect(PUFFIN.x).toBeLessThan(BASKET.x1)
    // The whale's eye under the water, behind its blowhole: the whale is far larger than the back a flight meets.
    expect(WHALE_EYE.x).toBeLessThan(WHALE.x)
    expect(WHALE_EYE.y - WHALE_EYE.r).toBeGreaterThan(SEA_Y)
  })

  it('puts the column of water over the blowhole, clear of the shelf and the iceberg', () => {
    expect(SPOUT.x).toBe(WHALE.x)
    expect(SPOUT.bottom).toBe(WHALE.y - WHALE.r)
    expect(SPOUT.x - SPOUT.half).toBeGreaterThan(SHELF_EDGE)
    expect(SPOUT.x + SPOUT.half).toBeLessThan(BERG.x0)
    expect(inSpout(SPOUT.x, SPOUT.bottom - 10)).toBe(true)
    expect(inSpout(SPOUT.x, SPOUT.top - 10)).toBe(false)
    expect(inSpout(SPOUT.x + SPOUT.half + 1, SPOUT.bottom - 10)).toBe(false)
  })

  it('knows the inside of the cloud and of the drift', () => {
    expect(inCloud(CLOUD[1].x, CLOUD[1].y)).toBe(true)
    expect(inCloud(CLOUD[1].x, CLOUD[1].y - CLOUD[1].r - 40)).toBe(false)
    expect(inDrift(DRIFT.x, DRIFT.y - DRIFT.ry + 2)).toBe(true)
    expect(inDrift(DRIFT.x, DRIFT.y - DRIFT.ry - 2)).toBe(false)
    expect(inDrift(DRIFT.x, DRIFT.y + 5)).toBe(false)
  })

  it('has three flat tops: the shelf, the iceberg and the lid of the crate', () => {
    expect(FLOORS.map((floor) => [floor.of, floor.top])).toEqual([['crate', CRATE.y0], ['ice', ICE_Y], ['berg', BERG.y0]])
  })

  it('lays the things out on the squares of the paper, which are a finger wide', () => {
    expect(STAGE.width % SQUARE).toBe(0)
    expect(STAGE.height % SQUARE).toBe(0)
    expect(ICE_Y % SQUARE).toBe(0)
  })
})

describe('what a finger finds', () => {
  const things: Thing[] = ['nearSeal', 'farSeal', 'chick', 'igloo', 'walrus', 'berg', 'puffin', 'balloon', 'whale', 'whaleEye', 'whaleBack', 'whaleTail', 'cloud', 'crate', 'drift']

  it('gives every thing a place a finger can find: a round of 48 units or more fits inside it', () => {
    // The igloo is found on its dome round the chick, who stands in its doorway: a round of 30 fits on the dome beside it. Its size as a target is measured in touch.test.ts.
    const across = (thing: Thing): number => (thing === 'igloo' ? 15 : 24)
    const fits = new Set<Thing>()
    for (let x = 0; x <= STAGE.width; x += 4) for (let y = 0; y <= STAGE.height; y += 4) {
      const thing = thingAt(x, y)
      if (thing === 'paper' || fits.has(thing)) continue
      let whole = true
      for (let a = 0; a < 12 && whole; a++) whole = thingAt(x + Math.cos((a * Math.PI) / 6) * across(thing), y + Math.sin((a * Math.PI) / 6) * across(thing)) === thing
      if (whole) fits.add(thing)
    }
    expect([...fits].sort()).toEqual([...things].sort())
  })

  it('has nothing but bare paper under the home control at the top centre', () => {
    for (let a = 0; a < 24; a++) for (const r of [0, 12, HOME_CONTROL.r, HOME_CONTROL.r + 10]) {
      expect(thingAt(HOME_CONTROL.x + Math.cos((a * Math.PI) / 12) * r, HOME_CONTROL.y + Math.sin((a * Math.PI) / 12) * r)).toBe('paper')
    }
    expect(HOME_CONTROL).toEqual({ x: STAGE.width / 2, y: 10 + 24, r: 24 })
    // And the penguin cannot be taken hold of from there.
    expect(Math.hypot(HOME_CONTROL.x - CATAPULT.rest.x, HOME_CONTROL.y - CATAPULT.rest.y)).toBeGreaterThan(CATAPULT.grip + HOME_CONTROL.r)
  })

  it('has nothing but bare paper in the grown-up corner at the top right', () => {
    for (let x = STAGE.width - CORNER; x <= STAGE.width; x += 6) for (let y = 0; y <= CORNER; y += 6) expect(thingAt(x, y)).toBe('paper')
  })

  it('finds the nearest thing first where two lie over each other', () => {
    expect(thingAt(CHICK.x, CHICK.y)).toBe('chick')
    expect(thingAt(WALRUS.x, WALRUS.y)).toBe('walrus')
    expect(thingAt(PUFFIN.x, PUFFIN.y)).toBe('puffin')
    expect(thingAt(BERG.x0 + 10, BERG.y0 + 4)).toBe('berg')
  })
})
