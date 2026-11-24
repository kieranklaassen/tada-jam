import { describe, expect, it } from 'vitest'
import { ARM_ROOM, BUILD, CLOTH_ROOM } from './figures'
import { BED, KNOB, LAMP, LINE, MOON, PIECE, WARDROBE, WINDOW, bedX, pegOf } from './layout'
import { freshNight } from './night'
import { below, makeRng } from './rng'
import { Show } from './show'
import { GARMENTS, SLEEPERS } from './things'

// Nothing passes through anything. The real show plays at 60 frames a second under seeded hands and every frame
// is held to it. Three overlaps are meant: whatever is carried or flies is drawn in front of everything; a figure
// in the middle of a reaction may lean over its neighbour's bed, in front of it; two that scuttle past each other
// on the floor pass one behind the other.

describe('the room', () => {
  it('keeps what stands still apart', () => {
    expect(WARDROBE.x + WARDROBE.width).toBeLessThan(WINDOW.x - 20)
    expect(WINDOW.x + WINDOW.width).toBeLessThan(KNOB.x - KNOB.r)
    expect(WINDOW.x + WINDOW.width).toBeLessThan(LAMP.x - 66)
    expect(WINDOW.y + WINDOW.height).toBeLessThan(BED.head - 30)
    expect(BED.pitch).toBeGreaterThan(BED.width + 8)
    for (const garment of GARMENTS) {
      expect(pegOf(garment).x - PIECE.width / 2).toBeGreaterThan(WINDOW.x)
      expect(pegOf(garment).x + PIECE.width / 2).toBeLessThan(WINDOW.x + WINDOW.width)
      expect(pegOf(garment).y - 70).toBeGreaterThan(MOON.y)
    }
    expect(LINE.pitch).toBeGreaterThan(PIECE.width)
  })
  it('keeps everyone at rest over their own bed, with everything on', () => {
    for (const sleeper of SLEEPERS) {
      expect(ARM_ROOM + BUILD[sleeper].arm / 2).toBeLessThanOrEqual(BED.pitch / 2 + 2)
      expect(BUILD[sleeper].half * 1.12).toBeLessThanOrEqual(BED.pitch / 2)
    }
    expect(CLOTH_ROOM).toBeLessThanOrEqual(BED.pitch / 2)
  })
})

describe('the night as it is played', () => {
  it('never has two in one bed, two in one place on the floor, or a garment in two places', () => {
    const rng = makeRng(21), show = new Show({ ...freshNight(true), lit: false })
    const spots = [...GARMENTS.map(pegOf), ...[0, 1, 2, 3, 4].map((bed) => ({ x: bedX(bed), y: BED.top + 80 })), KNOB]
    const reached = new Set<string>()
    for (let act = 0; act < 700; act++) {
      const from = spots[below(rng, spots.length)], to = spots[below(rng, spots.length)]
      show.press(from)
      if (below(rng, 2) === 0) show.tap()
      else { show.dragMove(from, to); show.drop() }
      for (let i = 0; i < 20 + below(rng, 80); i++) {
        show.step(1 / 60)
        const beds = SLEEPERS.map((sleeper) => show.people[sleeper].bed).filter((bed) => bed !== null)
        if (new Set(beds).size !== beds.length) throw new Error(`two in a bed at ${show.t}`)
        const floor = SLEEPERS.map((sleeper) => show.people[sleeper]).filter((person) => person.bed === null)
        for (const a of floor) for (const b of floor) if (a !== b && show.light > 0.5 && a.depth === b.depth && Math.abs(a.x - b.x) < 60) throw new Error(`${a.sleeper} and ${b.sleeper} in one place`)
        const seen = SLEEPERS.flatMap((sleeper) => show.seenOn(sleeper))
        if (new Set(seen).size !== seen.length) throw new Error('a garment on two sleepers')
        for (const garment of seen) if (show.pieces[garment].at !== 'worn') throw new Error(`${garment} worn and ${show.pieces[garment].at}`)
        if (show.walking) reached.add(show.walking.other ? show.walking.by : 'bump')
        for (const person of floor) if (person.act === 'caught') reached.add('caught')
        if (show.scene) reached.add(show.lit ? 'reveal' : 'out')
      }
      show.takeSounds()
    }
    expect([...reached].sort()).toEqual(['bump', 'caught', 'out', 'reveal', 'skates', 'slippers'])
  })
})
