import { describe, expect, it } from 'vitest'
import { SPECIES } from '../cast'
import { CARES } from '../needs'
import { REST_SPOTS } from '../toy'
import { BOTTOM_STRIP } from './layout'
import { roomFor, toRoom } from './toyRoom'

const SIZES: readonly [number, number][] = [[1180, 820], [1024, 768], [820, 1180]]

describe('the room the toy plays in', () => {
  it('keeps every place a finger must reach inside the frame and out of the bottom strip, at every size', () => {
    for (const [width, height] of SIZES) {
      const { room, layout } = roomFor(width, height)
      const places = [...REST_SPOTS.map((spot) => room.spots[spot]), ...CARES.map((care) => room.cart[care])]
      for (const place of places) {
        expect(place.x - room.thing.w / 2).toBeGreaterThanOrEqual(0)
        expect(place.x + room.thing.w / 2).toBeLessThanOrEqual(layout.frame.w)
        expect(place.y + room.thing.h / 2, `${width}x${height}`).toBeLessThanOrEqual(layout.frame.h * (1 - BOTTOM_STRIP))
      }
    }
  })

  it('gives every thing a place of its own: no two resting spots overlap, and none lies on the cart', () => {
    for (const [width, height] of SIZES) {
      const { room } = roomFor(width, height)
      const spots = REST_SPOTS.map((spot) => room.spots[spot])
      const apart = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) >= room.thing.w || Math.abs(a.y - b.y) >= room.thing.h
      for (let a = 0; a < spots.length; a++) {
        for (let b = a + 1; b < spots.length; b++) expect(apart(spots[a], spots[b]), `${width}x${height} ${REST_SPOTS[a]} ${REST_SPOTS[b]}`).toBe(true)
        for (const care of CARES) expect(apart(spots[a], room.cart[care]), `${width}x${height} ${REST_SPOTS[a]} ${care}`).toBe(true)
      }
    }
  })

  it('knows every animal\'s size and the places on it', () => {
    const { room } = roomFor(1180, 820)
    for (const species of SPECIES) {
      const body = room.bodies[species]
      expect(body.w).toBeGreaterThan(100)
      expect(body.h).toBeGreaterThan(100)
      for (const anchor of Object.values(body.anchors)) expect(anchor.y).toBeLessThanOrEqual(0)
    }
  })

  it('takes a finger on the surface to the room and back, whatever the surface', () => {
    for (const [width, height] of SIZES) {
      const { room, layout } = roomFor(width, height)
      const onSurface = { x: layout.ox + room.cart.bowl.x * layout.scale, y: layout.oy + room.cart.bowl.y * layout.scale }
      const back = toRoom(layout, onSurface.x, onSurface.y)
      expect(back.x).toBeCloseTo(room.cart.bowl.x)
      expect(back.y).toBeCloseTo(room.cart.bowl.y)
    }
  })
})
