import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { BEARING, DIAL_RADIUS, DOG_HOME, KETTLE, LAMP_BODY, LAMP_HIGH, LAMP_LOW, REACH, RING_AWAY, TIN, apart, camperSpot, inFireCircle, litBy, obstacles, pinSpots, tentMiddle, wrap } from './ground'
import { CAMPERS, SITES, type Ring, type Site } from './world'

const every = (): Site[] => LADDER.flatMap((position) => [...SITES[position]])
const name = (site: Site) => `${site.position} ${SITES[site.position].indexOf(site)}`

describe('the ground plan of the camp', () => {
  it('gives every camper a bearing of its own, a good step from the next, and leaves the arc below the fire bare', () => {
    const bearings = CAMPERS.map((who) => wrap(BEARING[who])).sort((a, b) => a - b)
    for (let i = 1; i < bearings.length; i++) expect(bearings[i] - bearings[i - 1]).toBeGreaterThan(0.9)
    for (const who of CAMPERS) expect(Math.abs(wrap(BEARING[who] - Math.PI / 2)), who).toBeGreaterThan(0.9)
    expect(DOG_HOME.x).toBe(0)
    expect(DOG_HOME.y).toBeGreaterThan(DIAL_RADIUS + 30)
  })

  it('stands no tent or camper on another, on the fire, on the dog, on the tin or off the sheet, at any site', () => {
    for (const site of every()) {
      const blocks = obstacles(site)
      for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i], b = blocks[j]
        // A camper lies beside its own tent, and its three parts touch each other.
        const own = (one: string) => one.replace(/^tent of /, '').replace(/, (head|middle|feet|end)$/, '')
        if (own(a.name) === own(b.name)) continue
        expect(apart(a.at, b.at), `${a.name} and ${b.name} at ${name(site)}`).toBeGreaterThan(a.radius + b.radius - 6)
      }
      for (const block of blocks) {
        expect(block.at.x - block.radius, `${block.name} at ${name(site)}`).toBeGreaterThan(-380)
        expect(block.at.y - block.radius, `${block.name} at ${name(site)}`).toBeGreaterThan(-232)
        expect(block.at.y + block.radius, `${block.name} at ${name(site)}`).toBeLessThan(200)
        expect(block.at.x + block.radius, `${block.name} at ${name(site)}`).toBeLessThan(340)
      }
    }
    expect(apart(KETTLE, { x: 0, y: 0 })).toBeLessThan(DIAL_RADIUS - 12)
    // The tin lies whole inside the widest circle of the fire and whole outside the middle one.
    expect(apart(TIN, { x: 0, y: 0 }) - 24).toBeGreaterThan(REACH[2])
    expect(apart(TIN, { x: 0, y: 0 }) + 24).toBeLessThan(REACH[3])
  })

  it('draws the fire\'s circle so that it agrees with the rings: past every part of a camper of that ring, short of the middle of the next', () => {
    for (const who of CAMPERS) for (const ring of [1, 2, 3] as Ring[]) {
      const lying = camperSpot(who, ring), fire = { x: 0, y: 0 }
      for (const reach of [1, 2, 3] as Ring[]) {
        if (inFireCircle(ring, reach)) { expect(apart(lying.head, fire), `${who} ring ${ring} reach ${reach}`).toBeLessThan(REACH[reach]); expect(apart(lying.middle, fire)).toBeLessThan(REACH[reach]) }
        else expect(apart(lying.middle, fire), `${who} ring ${ring} reach ${reach}`).toBeGreaterThan(REACH[reach])
      }
      expect(apart(tentMiddle(who, ring), fire)).toBeGreaterThan(DIAL_RADIUS + 40)
      expect(RING_AWAY[ring]).toBeLessThan(REACH[ring])
    }
  })
})

describe('the lantern pins', () => {
  it('stand clear of every tent, camper and other pin, on the sheet', () => {
    for (const site of every()) {
      const pins = pinSpots(site)
      expect(pins.length).toBe(site.pins.length)
      pins.forEach((at, i) => {
        for (const block of obstacles(site)) expect(apart(at, block.at), `pin ${i} and ${block.name} at ${name(site)}`).toBeGreaterThanOrEqual(block.radius + LAMP_BODY - 4)
        pins.forEach((other, j) => { if (j > i) expect(apart(at, other), `pins ${i} and ${j} at ${name(site)}`).toBeGreaterThan(LAMP_BODY * 2) })
        expect(Math.abs(at.x), name(site)).toBeLessThan(330)
        expect(at.y, name(site)).toBeGreaterThan(-205)
        expect(at.y, name(site)).toBeLessThan(196)
      })
    }
  })

  it('light the camper they stand by on the low wick, and reach the camper they are toward on the high one', () => {
    for (const site of every()) site.pins.forEach((pin, i) => {
      expect(litBy(site, i, 0), `low wick, pin ${i} at ${name(site)}`).toEqual([pin.near[0]])
      const high = litBy(site, i, 1)
      expect(high, `high wick, pin ${i} at ${name(site)}`).toContain(pin.near[0])
      expect(high, `high wick, pin ${i} at ${name(site)}`).toContain(pin.far[0])
      expect(high.length, `the high wick lights more than the low at ${name(site)}`).toBeGreaterThan(1)
    })
    expect(LAMP_HIGH).toBeGreaterThan(LAMP_LOW * 2)
    expect(litBy(SITES.meadow[0], 0, 1)).toEqual([])
  })

  it('are the same every time they are asked for', () => {
    const site = SITES.summit[0]
    expect(pinSpots(site)).toBe(pinSpots(site))
    expect(pinSpots({ ...site })).toEqual(pinSpots(site))
  })
})
