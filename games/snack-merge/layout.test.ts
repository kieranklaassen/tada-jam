import { describe, expect, it } from 'vitest'
import { BIGGEST, radiusOf } from './kinds'
import { BACK_JARS, BACK_SHELF, BAG, CORNER_SIZE, COUNTER_Y, HANDLE, HANG_Y, HOME, JAR, MOUSE, OVER_JAR, PLACES, RAIL, SEAT, SHELF, SHELF_REACH, STAGE, TAIL, TROLLEY, WINDOW, clawReach, overJar, resting, tappable, type Box } from './layout'
import { CORNER } from './overlay'
import { zoneAt } from './play'
import { fit } from './stage'

/** A box of the stage in the pixels of a surface of `width` by `height`. */
function onSurface(box: Box, width: number, height: number): Box {
  const by = fit(width, height)
  return { left: by.x + box.left * by.scale, right: by.x + box.right * by.scale, top: by.y + box.top * by.scale, bottom: by.y + box.bottom * by.scale }
}

const overlap = (a: Box, b: Box): boolean => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

/** Tablets lying and standing, the still's own size, and a wide window. */
const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [1366, 1024], [820, 1180], [768, 1024], [1600, 820]]

describe('the layout', () => {
  it('keeps everything a child taps clear of the home control at the top centre', () => {
    for (const [width, height] of SURFACES) {
      const home: Box = { left: width / 2 - HOME.size / 2, right: width / 2 + HOME.size / 2, top: HOME.top, bottom: HOME.top + HOME.size }
      for (const box of tappable()) expect(overlap(onSurface(box, width, height), home)).toBe(false)
      // The snack under the claw hangs under it too, wherever the claw stands.
      const hang: Box = { left: JAR.left, right: JAR.right, top: HANG_Y - BIGGEST, bottom: HANG_Y + BIGGEST }
      expect(onSurface(hang, width, height).top).toBeGreaterThanOrEqual(home.bottom)
    }
  })

  it('runs the rail and its trolley below the home control, wherever the claw stands', () => {
    for (const [width, height] of SURFACES) {
      const home: Box = { left: width / 2 - HOME.size / 2, right: width / 2 + HOME.size / 2, top: HOME.top, bottom: HOME.top + HOME.size }
      const trolley: Box = { left: RAIL.left - TROLLEY.half, right: RAIL.right + TROLLEY.half, top: RAIL.y - TROLLEY.up, bottom: RAIL.y + TROLLEY.down }
      expect(overlap(onSurface(trolley, width, height), home)).toBe(false)
    }
  })

  it('keeps everything a child taps clear of the grown-up corner on a surface of the stage\'s shape', () => {
    expect(CORNER_SIZE).toBe(CORNER)
    for (const [width, height] of [[1180, 820], [1024, 712]] as const) {
      const corner: Box = { left: width - CORNER, right: width, top: 0, bottom: CORNER }
      for (const box of tappable()) expect(overlap(onSurface(box, width, height), corner)).toBe(false)
    }
  })

  it('stands no jar of the back shelf in the grown-up corner, where a press never reaches the game', () => {
    const last = BACK_SHELF.left + BACK_JARS.inset + (BACK_JARS.count - 1) * BACK_JARS.step + BACK_JARS.width
    expect(last).toBeLessThanOrEqual(BACK_SHELF.right)
    for (const [width, height] of [...SURFACES, [1024, 712]] as const) {
      const corner: Box = { left: width - CORNER, right: width, top: 0, bottom: CORNER }
      expect(overlap(onSurface(BACK_SHELF, width, height), corner)).toBe(false)
    }
  })

  it('gives every target a child taps at least 48 pixels at the still\'s size', () => {
    for (const box of tappable()) {
      expect(box.right - box.left).toBeGreaterThanOrEqual(48)
      expect(box.bottom - box.top).toBeGreaterThanOrEqual(48)
    }
  })

  it('stands the shelf places and the counter places apart, and on the stage', () => {
    const all = tappable()
    for (let i = 0; i < all.length; i++) {
      expect(all[i].left).toBeGreaterThanOrEqual(0)
      expect(all[i].right).toBeLessThanOrEqual(STAGE.width)
      expect(all[i].top).toBeGreaterThanOrEqual(0)
      expect(all[i].bottom).toBeLessThanOrEqual(STAGE.height)
    }
    for (let i = 0; i < SHELF.length; i++) for (let j = i + 1; j < SHELF.length; j++) expect(Math.hypot(SHELF[i].x - SHELF[j].x, SHELF[i].y - SHELF[j].y)).toBeGreaterThanOrEqual(2 * radiusOf(1))
    for (let i = 1; i < PLACES.length; i++) expect(PLACES[i].x - PLACES[i - 1].x).toBeGreaterThanOrEqual(2 * BIGGEST)
    expect(SHELF_REACH).toBeGreaterThanOrEqual(radiusOf(1))
  })

  it('keeps the shelf, the handle, the window, the bag, the mouse and the monster out of the slide over the jar', () => {
    const slide: Box = { left: OVER_JAR.left, right: OVER_JAR.right, top: 0, bottom: OVER_JAR.bottom }
    const around = (p: { x: number; y: number }, r: number): Box => ({ left: p.x - r, right: p.x + r, top: p.y - r, bottom: p.y + r })
    for (const place of SHELF) expect(overlap(around(place, SHELF_REACH), slide)).toBe(false)
    for (const box of [HANDLE, WINDOW, BAG, SEAT, TAIL, around(MOUSE, MOUSE.half)]) expect(overlap(box, slide)).toBe(false)
    for (const place of PLACES) expect(place.y - BIGGEST).toBeGreaterThanOrEqual(OVER_JAR.bottom)
  })

  it('lets the claw reach from wall to wall and never past the glass or the rail', () => {
    for (const k of [1, 3, 7]) {
      const reach = clawReach(radiusOf(k))
      expect(reach.min - radiusOf(k)).toBeGreaterThanOrEqual(JAR.left)
      expect(reach.max + radiusOf(k)).toBeLessThanOrEqual(JAR.right)
      expect(reach.min).toBeGreaterThanOrEqual(RAIL.left)
      expect(reach.max).toBeLessThanOrEqual(RAIL.right)
    }
    expect(HANG_Y + BIGGEST).toBeLessThan(JAR.rim)
    expect(JAR.floor).toBeLessThanOrEqual(COUNTER_Y + 20)
  })

  it('lets nothing the game brings to rest cover the shelf, the handle, a counter place or the space over the jar, at every surface', () => {
    for (const [width, height] of SURFACES) {
      const aimed = [...tappable(), overJar()].map((box) => onSurface(box, width, height))
      for (const still of resting()) for (const box of aimed) expect(overlap(onSurface(still, width, height), box)).toBe(false)
    }
  })

  it('never takes a tap on a target for something behind it', () => {
    const full = [7, 7, 7, 7]
    SHELF.forEach((place, i) => {
      for (const [dx, dy] of [[0, 0], [44, 0], [0, SHELF_REACH - 1], [-44, 0], [0, -SHELF_REACH + 1]]) expect(zoneAt({ x: place.x + dx, y: place.y + dy }, full)).toEqual({ type: 'shelf', thing: i })
    })
    PLACES.forEach((place, i) => {
      for (const [dx, dy] of [[0, 0], [BIGGEST, 0], [0, BIGGEST], [-BIGGEST, 0], [0, -BIGGEST]]) expect(zoneAt({ x: place.x + dx, y: place.y + dy }, full)).toEqual({ type: 'place', place: i })
    })
    for (const x of [HANDLE.left, (HANDLE.left + HANDLE.right) / 2, HANDLE.right]) for (const y of [HANDLE.top, (HANDLE.top + HANDLE.bottom) / 2, HANDLE.bottom]) expect(zoneAt({ x, y }, full).type).toBe('handle')
    const over = overJar()
    for (const x of [over.left, (over.left + over.right) / 2, over.right]) for (const y of [RAIL.y + 40, JAR.rim, JAR.floor, over.bottom]) expect(zoneAt({ x, y }, full).type).toBe('jar')
  })
})
