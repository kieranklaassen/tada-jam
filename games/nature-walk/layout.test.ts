import { describe, expect, it } from 'vitest'
import { coverPieces } from './footprints'
import { CORNER, SPOTS, TOAD_REACH, answerers, homeControl, type Spot } from './layout'
import { BOWL, EDGE_SPOTS, ROOM_DOOR, TABLE, TABLE_R } from './room'
import { GRAB, targetAt } from './rules'
import { freshWorld } from './save'
import { STAGE, fit } from './stage'
import { thingUnder } from './things'
import { createToy } from './toy'
import { PLACES, THINGS } from './wood'

// Kid-land is landscape. The frame is measured at the two sizes the stills
// are taken at.
const SURFACES = [{ width: 1180, height: 820 }, { width: 1024, height: 768 }] as const

/** A spot of the stage in the pixels of a surface. */
function onSurface(spot: Spot, surface: { width: number; height: number }): Spot {
  const by = fit(surface.width, surface.height)
  return { x: by.x + spot.x * by.scale, y: by.y + spot.y * by.scale, r: spot.r * by.scale }
}

const apart = (a: Spot, b: Spot): number => Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r
const wood = (open: boolean) => createToy({ ...freshWorld(null), open: open ? [...PLACES] : [], finished: false }, 1)

describe('what answers a touch', () => {
  it.each(SURFACES)('touch targets are 48 px or more at $width by $height, and far more for what is touched most', (surface) => {
    const scale = fit(surface.width, surface.height).scale
    for (const allOpen of [false, true]) {
      for (const { name, spot } of answerers(allOpen)) expect(onSurface(spot, surface).r * 2, name).toBeGreaterThanOrEqual(80)
    }
    // The six covers, which the finger touches most, are the largest things to touch after the animals.
    for (const place of PLACES) expect(onSurface(SPOTS[place].shut, surface).r * 2, place).toBeGreaterThanOrEqual(104)
    // A thing is taken from anywhere within its reach, wherever it lies; so is the toad wherever he sits.
    // What is touched most, a thing that is carried, answers 100 px across or more at the smaller size, as the sheet asks.
    expect(GRAB * 2 * scale, 'a thing').toBeGreaterThanOrEqual(100)
    expect(TOAD_REACH * 2 * scale, 'the toad').toBeGreaterThanOrEqual(48)
    // In the room: the bowl and the door.
    expect(BOWL.r * 2 * scale, 'the bowl').toBeGreaterThanOrEqual(48)
    expect(ROOM_DOOR.r * 2 * scale, 'the door of the room').toBeGreaterThanOrEqual(48)
    // Things sent in land far enough apart for each to be taken by itself.
    for (const a of EDGE_SPOTS) for (const b of EDGE_SPOTS) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y) * scale).toBeGreaterThanOrEqual(48)
    expect(TABLE_R * 2 * scale).toBeGreaterThanOrEqual(48)
  })

  it('is on the stage', () => {
    for (const { name, spot } of answerers(true)) {
      expect(spot.x, name).toBeGreaterThan(spot.r * 0.5)
      expect(spot.x, name).toBeLessThan(STAGE.width - spot.r * 0.5)
      expect(spot.y, name).toBeGreaterThan(spot.r)
      expect(spot.y, name).toBeLessThan(STAGE.height - spot.r * 0.5)
    }
    expect(TABLE.x0).toBeGreaterThan(BOWL.x + BOWL.r)
    expect(TABLE.x1).toBeLessThan(ROOM_DOOR.x - ROOM_DOOR.r)
  })

  it('answers as itself at its middle, with every cover shut and with every cover open', () => {
    for (const allOpen of [false, true]) {
      const toy = wood(allOpen)
      for (const { name, owner, spot } of answerers(allOpen)) {
        const target = targetAt(toy, spot)
        // Where a thing lies at home under an open cover, the touch lands on the thing itself.
        const landed = target.kind === 'thing' ? PLACES.find((place) => Math.hypot(SPOTS[place].find.x - spot.x, SPOTS[place].find.y - spot.y) < SPOTS[place].find.r) : 'place' in target ? target.place : target.kind === 'nest' ? 'jay' : target.kind
        expect(landed, `${name}, all ${allOpen ? 'open' : 'shut'}`).toBe(owner)
      }
    }
  })

  it('a cover is touched where it is drawn: shut, anywhere on it opens it; open, anywhere on it where it rests shuts it', () => {
    for (const place of PLACES) {
      for (const piece of coverPieces(place, false)) for (const disc of piece.discs) expect(targetAt(wood(false), disc), `${piece.name} at ${disc.x.toFixed(0)},${disc.y.toFixed(0)}`).toEqual({ kind: 'cover', place })
      const open = wood(true)
      // In spring a thing is at home under the log and under the stone: the touch on the hollow is the thing's.
      for (const piece of coverPieces(place, true)) {
        const mine = piece.discs.filter((disc) => { const target = targetAt(open, disc); return target.kind === 'cover' && target.place === place })
        expect(mine.length, piece.name).toBeGreaterThanOrEqual(Math.ceil(piece.discs.length / 2))
        // And no part of it is another place's or an animal's.
        for (const disc of piece.discs) { const target = targetAt(open, disc); expect('place' in target ? target.place : target.kind === 'thing' ? thingUnder(open, disc, GRAB) && place : target.kind === 'wood' ? place : target.kind, `${piece.name} at ${disc.x.toFixed(0)},${disc.y.toFixed(0)}`).toBe(place) }
      }
    }
    expect(THINGS.length).toBe(6)
  })

  it('keeps the shut covers and the animals clear of one another', () => {
    const list = answerers(false)
    for (const a of list) for (const b of list) if (a.owner < b.owner) expect(apart(a.spot, b.spot), `${a.name} and ${b.name}`).toBeGreaterThanOrEqual(0)
  })

  it('never lets a cover that stands open lie over another place, its find or an animal', () => {
    const list = answerers(true)
    for (const place of PLACES) {
      for (const away of SPOTS[place].away) {
        for (const other of list) {
          if (other.owner === place) continue
          // The middle of each stays its own, and what overlaps is less than a finger wide.
          expect(Math.hypot(away.x - other.spot.x, away.y - other.spot.y), `${place} away and ${other.name}`).toBeGreaterThan(Math.max(away.r, other.spot.r))
        }
      }
    }
  })

  it.each(SURFACES)('leaves the home control and the grown-up corner alone at $width by $height', (surface) => {
    const home = homeControl(surface.width)
    for (const allOpen of [false, true]) {
      for (const { name, spot } of answerers(allOpen)) {
        const at = onSurface(spot, surface)
        // Nothing that answers a touch within a finger of the home control.
        expect(apart(at, home), `${name} and the home control`).toBeGreaterThanOrEqual(24)
        // And nothing in the top right corner, which the grown-up holds.
        expect(at.x + at.r > surface.width - CORNER && at.y - at.r < CORNER, `${name} and the corner`).toBe(false)
      }
    }
  })
})
