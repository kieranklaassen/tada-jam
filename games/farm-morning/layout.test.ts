import { describe, expect, it } from 'vitest'
import { BODY, BYSTANDER_REACH, CLOUDS, DOOR, GROWN_UP_CORNER, HENHOUSE, HENS, HEN_HEAD, HEN_REACH, HOME, HOME_CONTROL, MIDDLE, ROOST, STEP, SUN, THINGS, THING_REACH, USE_AT, VISIT, WRIST_LINE, centreOf, doorBox, henCircle, inBox, sunY, type Box, type Circle } from './layout'
import { STAGE } from './stage'

const boxOf = (c: Circle): Box => ({ x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 })
const overlap = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Every target of the game at rest, by name. */
function targets(): Record<string, Box> {
  const all: Record<string, Box> = { ...BODY, 'door shut': doorBox(0), 'door open': doorBox(1) }
  for (const thing of THINGS) all[thing] = boxOf({ ...HOME[thing], r: THING_REACH })
  for (const hen of HENS) all[`hen ${hen.id}`] = boxOf(henCircle(hen.home, hen.size))
  return all
}

describe('the page', () => {
  it('gives every target 130 stage units or more across, which is over 100 pixels on a tablet', () => {
    // A tablet of 1024 by 768 shows the stage at 0.87 of its size.
    const tablet = Math.min(1024 / STAGE.width, 768 / STAGE.height)
    for (const [name, box] of Object.entries(targets())) {
      expect(Math.min(box.w, box.h), name).toBeGreaterThanOrEqual(130)
      expect(Math.min(box.w, box.h) * tablet, name).toBeGreaterThan(100)
    }
    expect(HEN_REACH * 2).toBeGreaterThanOrEqual(130)
  })

  it('keeps every target, and every bystander, out from under the home control and the grown-up corner', () => {
    const bystanders: Record<string, Box> = { sun: boxOf({ x: SUN.x, y: SUN.high, r: BYSTANDER_REACH }), hatch: HENHOUSE.hatch }
    CLOUDS.forEach((cloud, i) => { bystanders[`cloud ${i}`] = boxOf({ ...cloud, r: BYSTANDER_REACH }) })
    for (const [name, box] of Object.entries({ ...targets(), ...bystanders })) {
      expect(overlap(box, HOME_CONTROL), name).toBe(false)
      expect(overlap(box, GROWN_UP_CORNER), name).toBe(false)
    }
  })

  it('keeps the middle of every target above the strip where wrists rest, and every target on the page', () => {
    for (const [name, box] of Object.entries(targets())) {
      expect(centreOf(box).y, name).toBeLessThanOrEqual(WRIST_LINE)
      expect(box.x, name).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w, name).toBeLessThanOrEqual(STAGE.width)
      expect(box.y + box.h, name).toBeLessThanOrEqual(STAGE.height)
    }
  })

  it('lays the four things well apart on their step, clear of the hens and of every animal', () => {
    for (const a of THINGS) {
      expect(inBox(HOME[a], STEP), a).toBe(true)
      for (const b of THINGS) if (a !== b) expect(Math.hypot(HOME[a].x - HOME[b].x, HOME[a].y - HOME[b].y), `${a} and ${b}`).toBeGreaterThanOrEqual(THING_REACH * 2 + 16)
      const reach = boxOf({ ...HOME[a], r: THING_REACH })
      for (const hen of HENS) expect(overlap(reach, boxOf(henCircle(hen.home, hen.size))), `${a} and the ${hen.id} hen`).toBe(false)
      for (const [animal, body] of Object.entries(BODY)) expect(overlap(reach, body), `${a} and the ${animal}`).toBe(false)
    }
  })

  it('stands the large animals apart from one another and from the door', () => {
    const bodies = Object.entries(BODY)
    for (const [a, boxA] of bodies) {
      for (const [b, boxB] of bodies) if (a !== b) expect(overlap(boxA, boxB), `${a} and ${b}`).toBe(false)
      expect(overlap(boxA, doorBox(1)), `${a} and the open door`).toBe(false)
    }
  })

  it('leaves most of the door free of the hens that stand in front of it', () => {
    const door = doorBox(0)
    const top = Math.min(...HENS.map((hen) => henCircle(hen.home, hen.size).y - HEN_REACH))
    expect(top - door.y).toBeGreaterThanOrEqual(190)
  })

  it('slides the door clear of its opening, and keeps it on the henhouse wall', () => {
    expect(doorBox(0).x).toBeLessThanOrEqual(HENHOUSE.opening.x)
    expect(doorBox(0).x + DOOR.w).toBeGreaterThanOrEqual(HENHOUSE.opening.x + HENHOUSE.opening.w)
    expect(doorBox(1).x).toBeGreaterThanOrEqual(HENHOUSE.opening.x + HENHOUSE.opening.w)
    expect(doorBox(1).x + DOOR.w).toBeLessThanOrEqual(HENHOUSE.wall.x + HENHOUSE.wall.w)
    // Inside, each hen stands on the henhouse floor with her head behind a hole of the shut door.
    expect(ROOST).toHaveLength(HENS.length)
    ROOST.forEach((place, i) => {
      const hole = DOOR.holes[i]
      expect(place.x + HEN_HEAD.x * HENS[i].size).toBeCloseTo(DOOR.shutX + hole.x)
      expect(place.y + HEN_HEAD.y * HENS[i].size).toBeCloseTo(DOOR.y + hole.y)
      expect(place.y).toBeLessThanOrEqual(HENHOUSE.opening.y + HENHOUSE.opening.h)
    })
  })

  it('brings visiting hens to rest on bare ground, never on a thing or on another animal', () => {
    for (const [animal, places] of Object.entries(VISIT)) {
      expect(places).toHaveLength(HENS.length)
      for (const place of places) {
        for (const thing of THINGS) expect(Math.hypot(place.x - HOME[thing].x, place.y - HOME[thing].y), `${animal}: ${thing}`).toBeGreaterThan(THING_REACH + 20)
        expect(inBox(place, STEP), `${animal}: the step`).toBe(false)
      }
    }
  })

  it('tips a thing out above the animal it is used on', () => {
    for (const animal of ['pony', 'goat', 'pig'] as const) {
      expect(USE_AT[animal].y, animal).toBeLessThan(MIDDLE[animal].y)
      expect(Math.abs(USE_AT[animal].x - MIDDLE[animal].x), animal).toBeLessThan(BODY[animal].w / 2)
    }
  })

  it('raises the sun with each content animal, from its low morning place to the top of its slot', () => {
    expect(sunY(0)).toBe(SUN.low)
    expect(sunY(4)).toBe(SUN.high)
    for (let n = 1; n <= 4; n++) expect(sunY(n)).toBeLessThan(sunY(n - 1))
  })
})
