import { describe, expect, it } from 'vitest'
import { stream } from './arrivals'
import { CAST, SPECIES, type Species } from './cast'
import { MOVABLES, freshClinic, type Clinic } from './clinic'
import { CARES, type Care } from './needs'
import { lasts, reactionFor, wornAt } from './reactions'
import { deserializeClinic, serializeClinic } from './save'
import { COMING_SECONDS, FLIGHT_SECONDS, REST_SPOTS, SEATED_AT, cancel, drag, drop, freshToy, keyPlace, lies, lift, press, reaches, settle, step, takeSave, strokeAt, takeSounds, tap, under, type Toy, type Vec } from './toy'
import { roomFor } from './view/toyRoom'

const { room } = roomFor(1180, 820)
const FRAME = 1 / 60

function toyWith(species: Species, seed = 3): Toy {
  const clinic = freshClinic(null, seed, true)
  const other = SPECIES.find((candidate) => candidate !== species)!
  return freshToy({ ...clinic, table: { ...clinic.table!, species }, waiting: { ...clinic.waiting, species: clinic.waiting.species === species ? other : clinic.waiting.species } })
}

function run(toy: Toy, seconds: number): void {
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) step(toy, room, FRAME)
}

/** Takes a thing from the cart and gives it with a tap. */
function give(toy: Toy, care: Care): void {
  press(toy, room, lies(toy, room, care)!)
  tap(toy)
}

const middleOf = (toy: Toy): Vec => ({ x: room.patient.x, y: room.patient.y - room.bodies[toy.clinic.table!.species].h / 2 })

describe('the finger lands on a care thing', () => {
  it('is answered in the same call: the thing is in the hand, its peel sounds, the mouse ducks', () => {
    for (const care of CARES) {
      const toy = toyWith('rabbit')
      run(toy, 1)
      press(toy, room, room.cart[care])
      expect(toy.hand).toMatchObject({ care, lifted: false })
      expect(toy.mouseDucked).toBe(toy.t)
      expect(takeSounds(toy).length).toBeGreaterThanOrEqual(2)
      expect(lies(toy, room, care) === null || care === 'plaster').toBe(true)
    }
  })

  it('needs no aim: a touch anywhere on the thing\'s place takes it', () => {
    const toy = toyWith('cat')
    for (const [dx, dy] of [[-60, -55], [60, 55], [0, 0], [-60, 55]]) {
      expect(under(toy, room, { x: room.cart.bowl.x + dx, y: room.cart.bowl.y + dy })).toEqual({ on: 'thing', care: 'bowl' })
    }
  })
})

describe('a tap sends the thing to the animal', () => {
  it('flies in one arc, lands, is saved at once, and the animal\'s own reaction starts within a fifth of a second', () => {
    const toy = toyWith('bear')
    give(toy, 'basket')
    expect(toy.hand).toBeNull()
    expect(toy.flights).toHaveLength(1)
    run(toy, FLIGHT_SECONDS + FRAME)
    expect(toy.flights).toHaveLength(0)
    expect(toy.clinic.things.basket).toBe('patient')
    expect(takeSave(toy)).toBe(2)
    expect(toy.playing?.reaction.id).toBe(reactionFor('bear', 'basket', null, 0).reaction.id)
    expect(toy.playing!.since).toBeGreaterThan(-0.2)
    expect(toy.landedAt).toBeCloseTo(toy.t, 1)
  })

  it('gives every animal an answer to every thing, with its voice, and leaves the thing where that animal wears it', () => {
    for (const species of SPECIES) {
      for (const care of CARES) {
        const toy = toyWith(species)
        give(toy, care)
        takeSounds(toy)
        run(toy, FLIGHT_SECONDS + FRAME)
        const reaction = toy.playing!.reaction
        expect(reaction.care).toBe(care)
        run(toy, lasts(reaction, species) + 0.3)
        expect(toy.playing, `${species} ${care}`).toBeNull()
        // The landing, and at least one call of the animal's own voice.
        expect(takeSounds(toy).length).toBeGreaterThanOrEqual(2)
        if (care !== 'plaster') expect(lies(toy, room, care)).toEqual(keyPlace(room, species, wornAt(species, care)))
        else expect(toy.clinic.things.plasters).toEqual(['patient'])
      }
    }
  }, 30_000)

  it('sets off a chain: a shake of water sends drops flying and the lamp above swings and rings', () => {
    const toy = toyWith('bear')
    give(toy, 'bowl')
    const before = toy.lampKnocked
    let most = 0
    for (let frame = 0; frame < 7 * 60; frame++) { step(toy, room, FRAME); most = Math.max(most, toy.drops.length) }
    expect(most).toBeGreaterThanOrEqual(3)
    expect(toy.lampKnocked).toBeGreaterThan(before)
  })

  it('can be done again and again: a thing on the animal is taken off and given once more, and a plain reaction never plays twice running', () => {
    const toy = toyWith('bear')
    const played: string[] = []
    for (let turn = 0; turn < 6; turn++) {
      give(toy, 'bowl')
      run(toy, FLIGHT_SECONDS + FRAME)
      played.push(toy.playing!.reaction.id)
      run(toy, 6)
    }
    for (let turn = 1; turn < played.length; turn++) expect(played[turn]).not.toBe(played[turn - 1])
    expect(new Set(played).size).toBe(2)
  })

  it('piles things on: each stays on the animal where it is worn', () => {
    const toy = toyWith('bear')
    for (const care of ['brush', 'blanket', 'basket'] as Care[]) {
      give(toy, care)
      run(toy, 7)
    }
    for (const care of ['brush', 'blanket', 'basket'] as const) expect(toy.clinic.things[care]).toBe('patient')
  })

  it('ends a reaction when its thing is taken off the animal in the middle of it', () => {
    const toy = toyWith('duck')
    give(toy, 'bowl')
    run(toy, 1.5)
    expect(toy.playing).not.toBeNull()
    press(toy, room, lies(toy, room, 'bowl')!)
    expect(toy.playing).toBeNull()
    expect(toy.hand?.care).toBe('bowl')
  })
})

describe('a drag carries the thing', () => {
  it('trails the finger and catches up', () => {
    const toy = toyWith('cat')
    press(toy, room, room.cart.brush)
    const to = { x: 700, y: 300 }
    drag(toy, room, to)
    step(toy, room, FRAME)
    expect(Math.hypot(toy.hand!.at.x - to.x, toy.hand!.at.y - to.y)).toBeGreaterThan(20)
    run(toy, 0.4)
    expect(Math.hypot(toy.hand!.at.x - to.x, toy.hand!.at.y - to.y)).toBeLessThan(3)
  })

  it('lands on the animal when let go on it, near it, or halfway there', () => {
    const toy = toyWith('dog')
    const target = middleOf(toy), from = room.cart.blanket
    expect(reaches(room, 'dog', from, target)).toBe(true)
    expect(reaches(room, 'dog', from, { x: target.x + 150, y: target.y })).toBe(true)
    expect(reaches(room, 'dog', from, { x: (from.x + target.x) / 2 - 5, y: (from.y + target.y) / 2 })).toBe(true)
    expect(reaches(room, 'dog', from, { x: from.x - 30, y: from.y })).toBe(false)
    press(toy, room, from)
    drag(toy, room, { x: (from.x + target.x) / 2 - 5, y: (from.y + target.y) / 2 })
    drop(toy, room)
    run(toy, FLIGHT_SECONDS + FRAME)
    expect(toy.clinic.things.blanket).toBe('patient')
  })

  it('survives a lifted finger: the thing waits where it is and is taken up again', () => {
    const toy = toyWith('dog')
    press(toy, room, room.cart.bowl)
    drag(toy, room, { x: 800, y: 300 })
    lift(toy)
    run(toy, 0.2)
    expect(toy.hand).toMatchObject({ care: 'bowl', lifted: true })
    press(toy, room, { x: 780, y: 310 })
    expect(toy.hand).toMatchObject({ care: 'bowl', lifted: false })
  })

  it('slides to rest on the nearest free named spot when let go elsewhere, and two things never share one', () => {
    const toy = toyWith('rabbit')
    // Four things let go in four empty places: under the table twice, and twice on the bare wall by the door.
    const where: Vec[] = [{ x: room.spots['floor-left'].x - 10, y: room.spots['floor-left'].y + 20 }, { x: room.spots['floor-right'].x + 10, y: room.spots['floor-right'].y + 20 }, { x: 110, y: 250 }, { x: 130, y: 300 }]
    ;(['bowl', 'brush', 'basket', 'blanket'] as const).forEach((care, index) => {
      press(toy, room, room.cart[care])
      drag(toy, room, where[index])
      drop(toy, room)
    })
    const places = MOVABLES.map((thing) => toy.clinic.things[thing])
    expect(places[0]).toBe('floor-left')
    expect(new Set(places).size).toBe(4)
    for (const place of places) expect(REST_SPOTS).toContain(place)
    expect(takeSave(toy)).toBe(1)
    // And each can be picked up again where it lies.
    for (const care of MOVABLES) expect(under(toy, room, lies(toy, room, care)!)).toEqual({ on: 'thing', care })
  })

  it('goes back on the cart when it is let go at its own place there', () => {
    const toy = toyWith('rabbit')
    press(toy, room, room.cart.brush)
    drag(toy, room, room.spots['floor-right'])
    drop(toy, room)
    expect(toy.clinic.things.brush).toBe('floor-right')
    press(toy, room, lies(toy, room, 'brush')!)
    drag(toy, room, { x: room.cart.brush.x + 20, y: room.cart.brush.y - 10 })
    drop(toy, room)
    expect(toy.clinic.things.brush).toBe('cart')
  })

  it('sticks a plaster on the mouse as a hat, and the sheet of plasters never leaves the cart', () => {
    const toy = toyWith('cat')
    press(toy, room, room.cart.plaster)
    drag(toy, room, { x: room.mouse.x, y: room.mouse.y - 40 })
    drop(toy, room)
    expect(toy.clinic.things.plasters).toEqual(['mouse'])
    expect(lies(toy, room, 'plaster')).toEqual(room.cart.plaster)
  })

  it('lets the one who waits take a thing as play', () => {
    const toy = toyWith('cat')
    press(toy, room, room.cart.brush)
    drag(toy, room, { x: room.waiting.x, y: room.waiting.y - 100 })
    drop(toy, room)
    expect(toy.doorPlay?.care).toBe('brush')
    expect(toy.clinic.things.brush).toBe('floor-left')
    expect(toy.clinic.waiting.needs).toEqual([])
  })
})

describe('a press that comes to nothing', () => {
  it('puts the thing back where it lay and changes nothing', () => {
    const toy = toyWith('cat')
    const before = JSON.stringify(serializeClinic(toy.clinic))
    press(toy, room, room.cart.basket)
    cancel(toy)
    expect(toy.hand).toBeNull()
    expect(JSON.stringify(serializeClinic(toy.clinic))).toBe(before)
    expect(lies(toy, room, 'basket')).toEqual(room.cart.basket)
  })
})

describe('the hand alone', () => {
  it('strokes the animal: each has a place it loves and a place that makes it squirm, where that part is drawn on it', () => {
    for (const species of SPECIES) {
      const body = room.bodies[species], { strokeLoved, strokeSquirms } = CAST[species]
      expect(Object.keys(body.spots).sort(), species).toEqual([strokeLoved, strokeSquirms].sort())
      const toy = toyWith(species)
      const stroke = (at: Vec, manner: string) => {
        press(toy, room, { x: room.patient.x + at.x, y: room.patient.y + at.y })
        expect(toy.stroking, `${species} at ${at.x}, ${at.y}`).toMatchObject({ manner, letGo: -1 })
        expect(takeSounds(toy)).toHaveLength(1)
        tap(toy)
        run(toy, 0.6)
        expect(toy.stroking).toBeNull()
      }
      // On the middle of every round of a spot, the animal takes the stroke as that spot.
      for (const round of body.spots[strokeLoved]!) stroke(round, 'loved')
      for (const round of body.spots[strokeSquirms]!) stroke(round, 'squirms')
      // Every round lies on the animal's own drawing, so it can be touched.
      for (const round of Object.values(body.spots).flat()) {
        expect(round.x, species).toBeGreaterThanOrEqual(body.left)
        expect(round.x, species).toBeLessThanOrEqual(body.right)
        expect(-round.y, species).toBeLessThanOrEqual(body.h)
        expect(under(toy, room, { x: room.patient.x + round.x, y: room.patient.y + round.y })).toEqual({ on: 'patient' })
      }
    }
    // Anywhere else it leans in. The cat's tail is the cat's tail all the way up: its top is beside the chin's height and still makes it squirm.
    expect(strokeAt('cat', room.bodies.cat, { x: -104, y: -100 })).toBe('squirms')
    expect(strokeAt('cat', room.bodies.cat, { x: 0, y: -106 })).toBe('loved')
    expect(strokeAt('cat', room.bodies.cat, { x: 0, y: -50 })).toBe('leans')
    expect(strokeAt('bear', room.bodies.bear, { x: 0, y: -74 })).toBe('loved')
    expect(strokeAt('bear', room.bodies.bear, { x: 0, y: -200 })).toBe('leans')
    expect(strokeAt('rabbit', room.bodies.rabbit, { x: 0, y: -172 })).toBe('loved')
    expect(strokeAt('hedgehog', room.bodies.hedgehog, { x: 0, y: -126 })).toBe('squirms')
    expect(strokeAt('duck', room.bodies.duck, { x: 0, y: -84 })).toBe('leans')
  })
})

describe('the one who waits', () => {
  it('comes in on the child\'s touch, the one on the table goes out, and it is saved at once', () => {
    const toy = toyWith('bear')
    const waiting = toy.clinic.waiting.species
    press(toy, room, { x: room.waiting.x, y: room.waiting.y - 80 })
    expect(toy.coming).toMatchObject({ leaving: 'bear', arriving: waiting })
    expect(toy.clinic.table!.species).toBe(waiting)
    expect(toy.clinic.garden.map((kept) => kept.species)).toEqual(['bear'])
    expect(takeSave(toy)).toBe(2)
    run(toy, COMING_SECONDS + FRAME)
    expect(toy.coming).toBeNull()
  })

  it('never comes in by itself', () => {
    const toy = toyWith('bear')
    const table = toy.clinic.table
    run(toy, 120)
    expect(toy.clinic.table).toBe(table)
    expect(toy.coming).toBeNull()
  })

  it('lets a thing given during the exchange arrive just after the newcomer has sat down', () => {
    const toy = toyWith('bear')
    press(toy, room, { x: room.waiting.x, y: room.waiting.y - 80 })
    tap(toy)
    run(toy, 0.3)
    give(toy, 'bowl')
    run(toy, SEATED_AT - 0.3 - 0.05)
    expect(toy.flights).toHaveLength(1)
    expect(toy.playing).toBeNull()
    run(toy, 0.3)
    expect(toy.playing?.reaction.care).toBe('bowl')
  })
})

describe('found as left', () => {
  it('saves nothing in the air: at rest, a thing in the hand is back where it lay and a thing in flight has landed', () => {
    const toy = toyWith('cat')
    give(toy, 'brush')
    press(toy, room, room.cart.bowl)
    drag(toy, room, { x: 600, y: 200 })
    settle(toy, room)
    expect(toy.hand).toBeNull()
    expect(toy.flights).toHaveLength(0)
    expect(toy.clinic.things).toMatchObject({ brush: 'patient', bowl: 'cart' })
  })

  it('reads the room back exactly after every move of a long careless play, and every press makes a sound', () => {
    const random = stream(77)
    const toy = toyWith('dog', 9)
    const anywhere = (): Vec => ({ x: random() * 1180, y: random() * 820 })
    for (let move = 0; move < 2500; move++) {
      const roll = random()
      const at = roll < 0.45 ? room.cart[CARES[Math.floor(random() * CARES.length)]] : anywhere()
      takeSounds(toy)
      const hadHand = toy.hand !== null
      press(toy, room, at)
      // Every touch is answered: a press always sounds, unless it only takes up a thing that was waiting in the air.
      if (!hadHand) expect(takeSounds(toy).length, `move ${move}`).toBeGreaterThan(0)
      const then = random()
      if (then < 0.4) tap(toy)
      else if (then < 0.85) { drag(toy, room, anywhere()); run(toy, random() * 0.3); if (random() < 0.2) lift(toy); else drop(toy, room) }
      else cancel(toy)
      run(toy, random() * 1.2)
      if (move % 25 === 0) {
        const kept: Toy = { ...toy, clinic: toy.clinic }
        settle(kept, room)
        toy.flights = []
        toy.hand = null
        toy.clinic = kept.clinic
        const saved: Clinic = deserializeClinic(JSON.parse(JSON.stringify(serializeClinic(toy.clinic))), null, 1, undefined, true)
        expect(saved, `move ${move}`).toEqual(toy.clinic)
      }
      expect(toy.clinic.position).toBe('bowl')
      expect(toy.clinic.table!.needs).toEqual([])
      // No two things ever lie on the same named spot.
      const spots = MOVABLES.map((thing) => toy.clinic.things[thing]).filter((place) => place !== 'cart' && place !== 'patient')
      expect(new Set(spots).size, `move ${move}`).toBe(spots.length)
    }
  }, 30_000)
})
