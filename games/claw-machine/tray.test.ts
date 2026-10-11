import { describe, expect, it } from 'vitest'
import { PLACES, placeAt, placeUnder } from './places'
import { STACK_MOST, count, emptyTray, nearestFree, nearestPlace, nearestToy, nearestWithRoom, put, remove, take, whereIs } from './tray'

describe('the tray', () => {
  it('has a place under every point of itself and takes the edge place for a point off it', () => {
    for (let place = 0; place < PLACES; place++) {
      const at = placeAt(place)
      expect(placeUnder(at.x, at.z)).toBe(place)
      expect(nearestPlace(at.x + 1.3, at.z - 2)).toBe(place)
    }
    expect(placeUnder(-100, 3)).toBe(-1)
    expect(nearestPlace(-100, -100)).toBe(0)
    expect(nearestPlace(100, 100)).toBe(PLACES - 1)
  })

  it('stacks toys bottom first and gives back the top one', () => {
    const tray = emptyTray()
    put(tray, 3, 11); put(tray, 3, 12)
    expect(whereIs(tray, 12)).toEqual({ place: 3, level: 1 })
    expect(take(tray, 3)).toBe(12)
    expect(take(tray, 3)).toBe(11)
    expect(take(tray, 3)).toBeNull()
    expect(whereIs(tray, 11)).toBeNull()
  })

  it('finds the nearest free place, and none when every place is taken', () => {
    const tray = emptyTray()
    const at = placeAt(6)
    expect(nearestFree(tray, at.x, at.z)).toBe(6)
    put(tray, 6, 1)
    const next = nearestFree(tray, at.x, at.z)
    expect([1, 5, 7]).toContain(next)
    expect(nearestFree(tray, at.x, at.z, next)).not.toBe(next)
    for (let place = 0; place < PLACES; place++) if (tray[place].length === 0) put(tray, place, 100 + place)
    expect(nearestFree(tray, at.x, at.z)).toBe(-1)
    expect(count(tray)).toBe(PLACES)
  })

  it('lets a toy go on a stack until the stack is full', () => {
    const tray = emptyTray()
    const at = placeAt(2)
    for (let i = 0; i < STACK_MOST; i++) { expect(nearestWithRoom(tray, at.x, at.z)).toBe(2); put(tray, 2, i) }
    expect(nearestWithRoom(tray, at.x, at.z)).not.toBe(2)
  })

  it('closes on a toy only within reach', () => {
    const tray = emptyTray()
    put(tray, 0, 7)
    const at = placeAt(0)
    expect(nearestToy(tray, at.x + 3, at.z, 4.5)).toBe(0)
    expect(nearestToy(tray, at.x + 7, at.z, 4.5)).toBe(-1)
    remove(tray, 7)
    expect(nearestToy(tray, at.x, at.z, 4.5)).toBe(-1)
  })
})
