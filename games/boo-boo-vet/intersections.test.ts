// Nothing passes through anything: the game's own overlap tests, since the
// jam's audit reads only a three.js scene. The real model is played at 60
// frames a second with fixed input, through moments that reach every state,
// and each frame is measured for what a child would see cross: two animals in
// one place, a thing landing off the animal it was sent to, an animal sinking
// through the table or showing above it while it hides, a wrong thing on a
// frightened animal, two things on one spot, anything outside the room.

import { describe, expect, it } from 'vitest'
import { SPECIES, type Species } from './cast'
import { allTracks, cellLasts } from './cells'
import { MOVABLES, freshClinic, type Clinic } from './clinic'
import type { Guidance } from './guidance'
import { CARES, FITS, NEEDS, PLAIN, type Care, type Need } from './needs'
import { CART_IN_AT, COMING_SECONDS, FLIGHT_SECONDS, HIDE, SHIFT_SECONDS, cartShift, drag, drop, freshToy, lies, press, step, tap, type Toy, type Vec, hideSize } from './toy'
import { exchange, scene, type Item } from './toyScene'
import { roomFor } from './view/toyRoom'

const { room, garden, layout } = roomFor(1180, 820)
const FRAME = 1 / 60
const QUIET: Guidance = { glow: 0, demo: null, demoIndex: -1 }
const door: Vec = { x: room.waiting.x, y: room.waiting.y - 80 }

/** How far two animals on the floor may come to each other sideways before one must be well in front of the other, and how far in front. */
const SIDE_BY_SIDE = 150, IN_FRONT = 40
/** How far a thing may be drawn outside the room. */
const MARGIN = 60

function gameWith(species: Species, needs: Need[], waiting: Need[] = ['thirsty'], carrier: Need[] | null = null): Toy {
  const fresh = freshClinic(null, 5)
  const others = SPECIES.filter((candidate) => candidate !== species)
  const patient = (who: Species, has: Need[], fromCarrier = false) => ({ species: who, at: 'two', needs: has.map((need) => ({ need, step: PLAIN, met: false })), wrong: 0 as const, tried: [], cart: [...CARES], fromCarrier })
  const clinic: Clinic = { ...fresh, position: 'two', shown: [...CARES], table: patient(species, needs), waiting: patient(others[0], waiting), carrier: carrier ? patient(others[1], carrier, true) : null }
  return freshToy(clinic, false)
}

const figures = (items: Item[], who: string) => items.filter((item) => item.kind === 'figure' && item.who === who) as Extract<Item, { kind: 'figure' }>[]

/** What every frame of every moment is held to. */
function whole(toy: Toy, items: Item[], moment: string): void {
  const table = toy.clinic.table
  for (const item of items) {
    for (const value of Object.values(item)) if (typeof value === 'number') expect(Number.isFinite(value), moment).toBe(true)
    // Nothing is drawn outside the room, but for the cart and the things on it while it rolls out and in.
    if ((item.kind === 'figure' || item.kind === 'thing' || item.kind === 'part') && !toy.coming?.first && !(item.kind === 'thing' && cartShift(toy) > 0)) {
      expect(item.x, `${moment}: ${item.kind} left the room`).toBeGreaterThan(-MARGIN - 300 * Number(item.kind === 'part'))
      expect(item.x, `${moment}: ${item.kind} left the room`).toBeLessThan(layout.frame.w + MARGIN)
      expect(item.y).toBeGreaterThan(-MARGIN)
      expect(item.y).toBeLessThan(layout.frame.h + MARGIN)
    }
  }
  // The animal on the table sits on it, never in it; the one that hides stays under the table's top.
  const patient = figures(items, 'patient')[0]
  // While it goes under the table or comes out from under it by itself, it is on its way between the two.
  if (patient && table && !toy.coming && toy.t - toy.hidAt >= SHIFT_SECONDS) {
    const hidden = items.some((item) => item.kind === 'part' && item.part === 'shade')
    if (hidden) {
      const top = patient.y - room.bodies[table.species].h * patient.size * patient.sy
      expect(top, `${moment}: the one that hides shows above the table`).toBeGreaterThan(room.patient.y - 12 + 18)
      expect(Math.abs(patient.x - room.hide.x)).toBeLessThan(HIDE.w / 2)
    } else if (!toy.act.feat) {
      // A dunk for a drink or a heavy landing dips a little; it never goes through the table's top.
      expect(patient.y, `${moment}: sank into the table`).toBeLessThanOrEqual(room.patient.y + 30)
      expect(Math.abs(patient.x - room.patient.x), `${moment}: off the table's end`).toBeLessThanOrEqual(172)
    }
  }
  // No two things lie on one spot.
  const spots = MOVABLES.map((thing) => toy.clinic.things[thing]).filter((place) => place !== 'cart' && place !== 'patient' && place !== 'on-basket')
  expect(new Set(spots).size, `${moment}: two things on one spot`).toBe(spots.length)
  // Two animals on the floor never share a place: where they are side by side, one is well in front of the other.
  const walkers = [...figures(items, 'leaving'), ...(toy.coming ? figures(items, 'patient') : []), ...figures(items, 'waiting').filter((figure) => figure.alpha > 0.5)]
  for (let a = 0; a < walkers.length; a++) {
    for (let b = a + 1; b < walkers.length; b++) {
      if (walkers[a].alpha < 0.5 || walkers[b].alpha < 0.5) continue
      if (Math.abs(walkers[a].x - walkers[b].x) < SIDE_BY_SIDE) expect(Math.abs(walkers[a].y - walkers[b].y), `${moment}: ${walkers[a].who} and ${walkers[b].who} in one place`).toBeGreaterThan(IN_FRONT)
    }
  }
}

function run(toy: Toy, seconds: number, moment: string): void {
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    step(toy, room, FRAME)
    whole(toy, scene(toy, room, garden, QUIET), moment)
  }
}

function give(toy: Toy, care: Care): void {
  press(toy, room, lies(toy, room, care)!)
  tap(toy)
}

describe('a thing sent to the animal', () => {
  it('lands on it: on its body, or at the edge of its hiding place when it hides, never beyond', () => {
    for (const species of SPECIES) {
      for (const need of NEEDS) {
        const toy = gameWith(species, [need])
        give(toy, 'bowl')
        let last: Extract<Item, { kind: 'thing' }> | null = null
        for (let frame = 0; frame < Math.round(FLIGHT_SECONDS / FRAME) - 1; frame++) {
          step(toy, room, FRAME)
          const flying = scene(toy, room, garden, QUIET).filter((item) => item.kind === 'thing' && item.care === 'bowl' && item.look === 'lifted') as Extract<Item, { kind: 'thing' }>[]
          if (flying.length > 0) last = flying[0]
        }
        expect(last, `${species} ${need}`).not.toBeNull()
        const body = room.bodies[species]
        if (need === 'scared') {
          // Beside the dark, on the floor: within reach of the hiding place and not inside it.
          expect(Math.abs(last!.x - room.hide.x)).toBeLessThan(HIDE.w / 2 + 60)
          expect(Math.abs(last!.x - room.hide.x), 'a wrong thing lands beside a frightened animal, never on it').toBeGreaterThan(60)
        } else {
          expect(Math.abs(last!.x - room.patient.x)).toBeLessThan(body.w / 2 + 30)
          expect(last!.y).toBeGreaterThan(room.patient.y - body.h - 30)
          expect(last!.y).toBeLessThan(room.patient.y + 10)
        }
      }
    }
  })
})

describe('every cell, every well scene and every secret', () => {
  it('keeps the frame whole from the landing to the end, for a large and a small animal', () => {
    for (const species of ['bear', 'hedgehog'] as Species[]) {
      for (const track of allTracks()) {
        const toy = gameWith(species, [track.need])
        const moment = `${species}: ${track.given} to ${track.need}`
        if (track.given === 'hand') { press(toy, room, track.need === 'scared' ? { x: room.hide.x, y: room.hide.y - 60 } : { x: room.patient.x, y: room.patient.y - 80 }); tap(toy) }
        else give(toy, track.given)
        run(toy, Math.min(10, cellLasts(track, species) + 1.5), moment)
      }
    }
  }, 60_000)

  it('never lays a wrong thing on a frightened animal: it comes to rest at the edge of the hiding place or over it', () => {
    for (const species of SPECIES) {
      for (const care of CARES.filter((thing) => thing !== FITS.scared)) {
        const toy = gameWith(species, ['scared'])
        give(toy, care)
        for (let frame = 0; frame < 6 * 60; frame++) {
          step(toy, room, FRAME)
          const items = scene(toy, room, garden, QUIET)
          const hider = figures(items, 'patient')[0]
          if (!hider || toy.flights.length > 0) continue
          const middle = { x: hider.x, y: hider.y - (room.bodies[species].h * hideSize(room, species)) / 2 }
          for (const item of items) {
            if (item.kind !== 'thing' || item.care !== care || item.look === 'lifted') continue
            const onCart = Math.abs(item.x - room.cart[care].x) < 2 && Math.abs(item.y - room.cart[care].y) < 2
            if (!onCart) expect(Math.hypot(item.x - middle.x, item.y - middle.y), `${species}: ${care} on the one that hides`).toBeGreaterThan(48)
          }
        }
      }
    }
  }, 60_000)

  it('keeps the frame whole through the well scene of every need and a touch in the middle of it', () => {
    for (const species of ['cat', 'bear'] as Species[]) {
      for (const need of NEEDS) {
        const toy = gameWith(species, [need])
        give(toy, CARES.find((care) => care !== FITS[need])!)
        run(toy, 5, `${species} ${need}: a miss`)
        give(toy, FITS[need])
        run(toy, 3, `${species} ${need}: the well scene`)
        press(toy, room, { x: 600, y: 60 })
        tap(toy)
        run(toy, 2, `${species} ${need}: after a touch in the scene`)
      }
    }
  }, 60_000)

  it('keeps the frame whole while two things make something', () => {
    for (const [one, other] of [['blanket', 'basket'], ['brush', 'bowl'], ['plaster', 'bowl'], ['brush', 'blanket'], ['plaster', 'blanket']] as [Care, Care][]) {
      const toy = gameWith('dog', ['cold'])
      press(toy, room, lies(toy, room, one)!)
      drag(toy, room, lies(toy, room, other)!)
      drop(toy, room)
      run(toy, 5, `${one} on ${other}`)
    }
  })
})

describe('an animal with two needs of which one is fear', () => {
  it('is seen to go under the table and to come out again: it never jumps from the one place to the other, and the frame stays whole', () => {
    for (const species of ['bear', 'rabbit'] as Species[]) {
      for (const [needs, cares] of [[['cold', 'scared'], ['blanket', 'basket']], [['scared', 'cold'], ['basket', 'blanket']], [['scared', 'cold'], ['blanket', 'basket']], [['cold', 'scared'], ['basket', 'blanket']], [['scared', 'sore'], ['plaster', 'basket']], [['scared', 'itchy'], ['brush', 'basket']], [['scared', 'thirsty'], ['bowl', 'basket']], [['sore', 'scared'], ['plaster', 'basket']], [['thirsty', 'scared'], ['basket', 'bowl']]] as [Need[], Care[]][]) {
        const toy = gameWith(species, needs)
        const moment = `${species} ${needs.join(' and ')}, given ${cares.join(' then ')}`
        let last: { x: number; y: number } | null = null, furthest = 0
        const watch = (seconds: number) => {
          for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
            step(toy, room, FRAME)
            const items = scene(toy, room, garden, QUIET)
            whole(toy, items, moment)
            const figure = items.find((item) => (item.kind === 'figure' && item.who === 'patient') || (item.kind === 'part' && item.part === 'ball')) as { x: number; y: number } | undefined
            // Out of sight under the blanket it has no place to compare; otherwise it never moves further in a frame than a quick animal can.
            if (figure && last) furthest = Math.max(furthest, Math.hypot(figure.x - last.x, figure.y - last.y))
            last = figure ?? null
          }
        }
        watch(1)
        give(toy, cares[0])
        // One that hides and is helped with its other need first is not brought out by that thing: it stays under.
        const staysUnder = needs[0] === 'scared' && cares[0] !== 'basket'
        if (staysUnder) for (let frame = 0; frame < 12 * 60; frame++) { step(toy, room, FRAME); whole(toy, scene(toy, room, garden, QUIET), moment); expect(toy.hid, moment).toBe(true) }
        else watch(12)
        last = null
        give(toy, cares[1])
        watch(12)
        expect(toy.clinic.table!.needs.every((entry) => entry.met), moment).toBe(true)
        // In every other order it changed place by itself at least once; and never in a jump.
        if (!staysUnder) expect(toy.hidAt, moment).toBeGreaterThan(0)
        expect(furthest, moment).toBeLessThan(60)
      }
    }
  }, 240_000)
})

describe('the exchange at the door', () => {
  it('never puts two animals in one place, whatever the newcomer needs and wherever it comes from', () => {
    for (const from of ['door', 'carrier'] as const) {
      for (const need of [null, ...NEEDS]) {
        for (const species of ['bear', 'hedgehog'] as Species[]) {
          for (let frame = 0; frame <= COMING_SECONDS * 60; frame++) {
            const { leaving, arriving } = exchange(room, frame / 60, { from, need, first: false, species })
            const moment = `${from} ${need} ${species} at ${(frame / 60).toFixed(2)} s`
            if (leaving && leaving.alpha >= 0.5 && Math.abs(leaving.x - arriving.x) < SIDE_BY_SIDE) expect(Math.abs(leaving.y - arriving.y), moment).toBeGreaterThan(IN_FRONT)
            // The one who waits still sits at the door when the newcomer comes out of the carrier: the newcomer goes over
            // it, and is clear of it sideways by the time it is down at the height of the tallest animal's head.
            if (from === 'carrier' && arriving.y > room.waiting.y - 256) expect(Math.abs(arriving.x - room.waiting.x), moment).toBeGreaterThanOrEqual(SIDE_BY_SIDE)
            expect(Number.isFinite(arriving.x + arriving.y + arriving.size)).toBe(true)
          }
        }
      }
    }
  })

  it('keeps the frame whole through a coming in from the door and one from the carrier, with a give in the middle', () => {
    for (const from of ['door', 'carrier'] as const) {
      for (const need of NEEDS) {
        const toy = gameWith('rabbit', ['cold'], [need], [need])
        give(toy, 'blanket')
        run(toy, 10, 'the one before')
        press(toy, room, from === 'door' ? door : { x: room.carrier.x, y: room.carrier.y - 70 })
        tap(toy)
        // The cart is out of the room while the one on the table gets down; the give is made once it is back in,
        // while the newcomer is still on its way to the table.
        run(toy, CART_IN_AT + 0.05, `${from} ${need}: coming in`)
        give(toy, 'bowl')
        run(toy, COMING_SECONDS + 4, `${from} ${need}: a give during the coming in`)
      }
    }
  }, 60_000)
})
