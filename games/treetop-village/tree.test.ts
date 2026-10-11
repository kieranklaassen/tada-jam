import { describe, expect, it } from 'vitest'
import { STAGE } from './stage'
import { BASKET, BODY, CORNER, FOLK, HOME, HOME_CONTROL, KIND_COUNT, LANDINGS, PLACES, SUN, SUN_R, basketSlot, dist, standAt, toPlace } from './tree'

describe('the oak', () => {
  it('has a dozen places, seven rises and five spans, each between two landings', () => {
    expect(PLACES).toHaveLength(12)
    expect(PLACES.filter((place) => place.fit === 'rise')).toHaveLength(7)
    expect(PLACES.filter((place) => place.fit === 'span')).toHaveLength(5)
    for (const place of PLACES) {
      const from = LANDINGS[place.from], to = LANDINGS[place.to]
      expect(place.pa.y).toBe(from.y)
      expect(place.pb.y).toBe(to.y)
      // A rise goes up the page from `pa`; a span runs level, left to right.
      if (place.fit === 'rise') expect(to.y).toBeLessThan(from.y)
      else { expect(to.y).toBe(from.y); expect(place.pb.x).toBeGreaterThan(place.pa.x) }
      // Each peg stands on its own landing.
      expect(place.pa.x).toBeGreaterThanOrEqual(from.x0)
      expect(place.pa.x).toBeLessThanOrEqual(from.x1)
      expect(place.pb.x).toBeGreaterThanOrEqual(to.x0)
      expect(place.pb.x).toBeLessThanOrEqual(to.x1)
    }
  })

  it('joins every landing to the meadow through its places', () => {
    const reached = new Set([0])
    for (let round = 0; round < PLACES.length; round++) for (const place of PLACES) if (reached.has(place.from) || reached.has(place.to)) { reached.add(place.from); reached.add(place.to) }
    expect(reached.size).toBe(LANDINGS.length)
  })

  it('gives each walker its own spot on every landing, clear of the foot of every rise that starts there', () => {
    LANDINGS.forEach((_, landing) => {
      const spots = FOLK.map((folk) => standAt(folk, landing))
      for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) expect(Math.abs(spots[i].x - spots[j].x), `${FOLK[i]} and ${FOLK[j]} on landing ${landing}`).toBeGreaterThanOrEqual(30)
      for (const place of PLACES) {
        if (place.fit !== 'rise' || place.from !== landing) continue
        FOLK.forEach((folk, index) => {
          // The middle of a rise is never behind a walker's card: a finger can always take hold of the piece there.
          const middle = { x: (place.pa.x + place.pb.x) / 2, y: (place.pa.y + place.pb.y) / 2 }
          const body = BODY[folk]
          const covered = Math.abs(middle.x - spots[index].x) <= body.w / 2 && middle.y >= spots[index].y - body.h
          expect(covered, `${folk} in front of the rise from landing ${landing}`).toBe(false)
        })
      }
    })
  })

  it('keeps every place, door, standing spot and basket slot on the stage, clear of the home control and the grown-up corner', () => {
    const forbidden = (x: number, y: number): boolean => Math.hypot(x - HOME_CONTROL.x, y - HOME_CONTROL.y) < HOME_CONTROL.r + 24 || (x > STAGE.width - CORNER && y < CORNER)
    const points = [
      ...PLACES.flatMap((place) => [place.pa, place.pb]),
      ...FOLK.map((folk) => HOME[folk].door),
      ...LANDINGS.flatMap((_, landing) => FOLK.map((folk) => { const spot = standAt(folk, landing); return { x: spot.x, y: spot.y - BODY[folk].h } })),
      ...Array.from({ length: KIND_COUNT }, (_, index) => basketSlot(index)),
      { x: SUN.x + SUN_R, y: SUN.y - SUN_R },
    ]
    for (const point of points) {
      expect(point.x).toBeGreaterThan(0)
      expect(point.x).toBeLessThan(STAGE.width)
      expect(point.y).toBeGreaterThan(0)
      expect(point.y).toBeLessThan(STAGE.height)
      expect(forbidden(point.x, point.y)).toBe(false)
    }
    expect(BASKET.y1).toBeLessThan(STAGE.height)
  })

  it('gives each basket slot a target a small finger can hit', () => {
    expect((BASKET.x1 - BASKET.x0) / KIND_COUNT).toBeGreaterThanOrEqual(64)
    expect(BASKET.y1 - BASKET.y0).toBeGreaterThanOrEqual(64)
  })

  it('measures how far a touch is from a place along its whole length', () => {
    const place = PLACES[7]
    expect(toPlace({ x: (place.pa.x + place.pb.x) / 2, y: place.pa.y - 20 }, place)).toBeCloseTo(20)
    expect(toPlace({ x: place.pa.x - 30, y: place.pa.y }, place)).toBeCloseTo(30)
    expect(dist(place.pa, place.pb)).toBe(place.pb.x - place.pa.x)
  })

  it('has each door on the trunk at the height of its own landing', () => {
    for (const folk of FOLK) expect(HOME[folk].door.y).toBe(LANDINGS[HOME[folk].landing].y)
  })
})
