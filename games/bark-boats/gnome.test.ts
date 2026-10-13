import { describe, expect, it } from 'vitest'
import { carry, run, worldWith } from './drive'
import { setUp } from './easel'
import { LAID_OUT, SEAT } from './layout'
import { gaze } from './rig'
import { step } from './tick'
import { SCOOT, STEP, buildNow, gnomeSpot, partsToLookAt, seatOffset } from './world'

// Three things the sheet says of the gnome that a reader found were not
// drawn: aboard he points downstream, he sits as far from a pebble as the
// deck allows, and before he climbs aboard he looks at each part of the boat
// in turn.

const ABOARD = { boat: { at: 'stone', x: SEAT.x, aboard: true } as never }

describe('the gnome aboard', () => {
  it('points downstream, holds it, lets his arm drop and points again; and the view draws the arm out', () => {
    const w = worldWith({ masts: ['twig', null], sails: ['birch', null] }, ABOARD)
    let most = 0, least = 1, ups = 0, was = 0
    const easel = setUp()
    for (let i = 0; i < 12 / STEP; i++) {
      step(w, STEP)
      const point = w.stage.gnome.point
      if (point >= 1 && was < 1) ups += 1
      most = Math.max(most, point); least = Math.min(least, point)
      was = point
    }
    expect([least, most]).toEqual([0, 1])
    expect(ups).toBeGreaterThanOrEqual(2)
    // The same instant drawn with his arm at his side and with it out: two pictures.
    w.stage.gnome.point = 0
    const down = easel.frame(w).digest
    w.stage.gnome.point = 1
    expect(easel.frame(w).digest).not.toBe(down)
  })

  it('does not point while his arms say something else: folded over a pebble, up for a broad sail, or in an answer', () => {
    for (const build of [{ deck: ['pebble'] }, { masts: ['twig', null], sails: ['maple', null] }] as const) {
      const w = worldWith(build as never, ABOARD)
      let most = 0
      for (let i = 0; i < 8 / STEP; i++) { step(w, STEP); most = Math.max(most, w.stage.gnome.point) }
      expect(most).toBe(0)
    }
  })

  it('sits as far from a pebble as the deck allows: he shuffles astern when it lands, in a move that is seen, and back when it is gone', () => {
    const w = worldWith({ masts: ['twig', null] }, ABOARD)
    run(w, 0.3)
    const seat = seatOffset(w).x
    carry(w, LAID_OUT.pebble, { x: SEAT.x, y: SEAT.y - 50 })
    let last = seatOffset(w).x, most = 0
    for (let i = 0; i < 2 / STEP; i++) {
      step(w, STEP)
      const now = seatOffset(w).x
      most = Math.max(most, Math.abs(now - last))
      last = now
    }
    expect(buildNow(w).deck).toEqual(['pebble'])
    expect(last).toBe(seat + SCOOT)
    expect(most).toBeLessThan(3)
    expect(gnomeSpot(w).x).toBe(w.boat.x + seat + SCOOT)
    // Found again, he is already there.
    expect(seatOffset(worldWith({ deck: ['pebble'] }, ABOARD)).x).toBe(seat + SCOOT)
    expect(seatOffset(worldWith({ deck: ['berry'] }, ABOARD)).x).toBe(seat)
  })
})

describe('the gnome looks the boat over', () => {
  it('at each part in turn, the keel first and the top last, before he climbs aboard', () => {
    const w = worldWith({ masts: ['twig', null], sails: ['maple', null] })
    run(w, 0.3)
    carry(w, LAID_OUT.berry, { x: SEAT.x, y: SEAT.y - 50 })
    expect(w.scene?.name).toBe('aboard')
    run(w, 0.2)
    const parts = partsToLookAt(w)
    // The keel, the berry on the deck, the twig, the leaf on it.
    expect(parts.length).toBe(4)
    for (let i = 1; i < parts.length; i++) expect(parts[i].y).toBeLessThanOrEqual(parts[i - 1].y)
    const seen: string[] = []
    for (let i = 0; i < 0.55 / STEP; i++) {
      step(w, STEP)
      const look = `${w.stage.gnome.lookX.toFixed(2)},${w.stage.gnome.lookY.toFixed(2)}`
      if (seen[seen.length - 1] !== look) seen.push(look)
    }
    const at = gnomeSpot(w)
    const wanted = parts.map((part) => gaze({ x: at.x, y: at.y - 90 }, part)).map((eyes) => `${eyes.x.toFixed(2)},${eyes.y.toFixed(2)}`)
    expect(new Set(wanted).size).toBe(parts.length)
    expect(seen).toEqual(wanted.slice(wanted.indexOf(seen[0])))
    expect(seen.length).toBeGreaterThanOrEqual(3)
  })
})
