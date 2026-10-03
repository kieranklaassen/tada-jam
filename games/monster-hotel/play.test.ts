import { describe, expect, it } from 'vitest'
import { arrangementOf, freshStay, readStay, withCast, writeStay } from './stay'
import { castById } from './casts'
import { bodyBox, fromPlain, spotsOf, thingBox } from './inkPlaces'
import type { InkScene } from './inkScene'
import { layoutPage } from './layout'
import { placeOf, thing, type ThingKind } from './arrangement'
import type { GuestId } from './guests'
import { roomUnder } from './hit'
import { pageOfArrangement } from './page'
import { KNOCK_SECONDS, LOOK_SECONDS, PORTER_REACH, Play, QUIET_AFTER, SWEEP_SECONDS, WHEEL_SECONDS } from './play'
import * as voices from './voices'

const page = layoutPage(1180, 820, 'square')
const fresh = (seed = 1) => new Play(freshStay(null), seed)
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown

/** The middle of a guest's body on the screen, in whatever view the toy's page is in. */
function bodyOf(toy: Play, id: GuestId): { x: number; y: number } {
  const scene = toy.scene(page)
  const plain = pageOfArrangement(arrangementOf(toy.stay), null, true)
  const found = spotsOf(plain.guests, page).find((one) => one.guest.id === id)!
  const box = bodyBox(found.spot, page)
  return fromPlain(page, scene.view ?? null, { x: box.x + box.w / 2, y: box.y + box.h / 2 })
}
const middleOf = (room: number) => ({ x: page.rooms[room].rect.x + page.rooms[room].rect.w * 0.5, y: page.rooms[room].rect.y + page.rooms[room].rect.h * 0.3 })
const run = (toy: Play, seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) toy.step(1 / 60) }
const tap = (toy: Play, at: { x: number; y: number }) => { toy.gesture({ type: 'press', at }, page); toy.gesture({ type: 'tap', at }, page) }
/**
 * A whole carry: the finger lands on the guest, moves, and lets go over a
 * point of the plain page. While it is carried the page is that guest's (the
 * bat's is upside down, and the room it is held over is drawn large), so the
 * finger goes to where that point is drawn then.
 */
function carry(toy: Play, id: GuestId, plainTo: { x: number; y: number }): void {
  const from = bodyOf(toy, id)
  toy.gesture({ type: 'press', at: from }, page)
  toy.gesture({ type: 'dragStart', from }, page)
  // Go most of the way, then home in: each move can change the room held over, and with it where the point is drawn.
  let to = fromPlain(page, { from: id, room: roomUnder(page, plainTo), large: false, inHand: true }, plainTo)
  for (let i = 1; i <= 6; i++) {
    toy.gesture({ type: 'dragMove', from, at: { x: from.x + ((to.x - from.x) * i) / 6, y: from.y + ((to.y - from.y) * i) / 6 } }, page)
    toy.step(1 / 60)
  }
  for (let i = 0; i < 4; i++) {
    to = fromPlain(page, toy.scene(page).view ?? null, plainTo)
    toy.gesture({ type: 'dragMove', from, at: to }, page)
    toy.step(1 / 60)
  }
  toy.gesture({ type: 'dragEnd', from, at: to }, page)
}
/** The middle of a guest's body on the plain page. */
function plainBodyOf(toy: Play, id: GuestId): { x: number; y: number } {
  const found = spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, page).find((one) => one.guest.id === id)!
  const box = bodyBox(found.spot, page)
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}
const guestIn = (scene: InkScene, id: GuestId) => scene.guests.find((guest) => guest.id === id)!

describe('touch a guest, and the page is drawn again from where it stands', () => {
  it('opens on the first cast: two guests in the lobby staring at one door, one on the bench, the plain page, the coach waiting with its door shut', () => {
    const scene = fresh().scene(page)
    expect(scene.guests.map((guest) => [guest.id, guest.place, guest.staresAt])).toEqual([['troll', 'lobby', 3], ['bat', 'lobby', 3], ['blob', 'bench', null]])
    expect([scene.view, scene.sweep, scene.coach, scene.coachAt, scene.coachOpen, scene.things, scene.numerals]).toEqual([null, null, true, 0, false, [], true])
  })

  it('is answered when the finger lands, in the same call: a squash, a grunt, and the redraw starting at its feet', () => {
    const toy = fresh()
    const at = bodyOf(toy, 'troll')
    toy.gesture({ type: 'press', at }, page)
    const scene = toy.scene(page)
    expect(guestIn(scene, 'troll').body!.sy).toBeLessThan(0.97)
    // The troll has no room yet: the room it asks for keeps its ink, at its own size.
    expect(scene.view).toEqual({ from: 'troll', room: 3, large: false })
    expect(scene.under).toBe(null)
    expect(scene.sweep!.progress).toBe(0)
    // The sweep starts at the troll's feet, under the finger.
    expect(Math.abs(scene.sweep!.x - at.x)).toBeLessThan(60)
    expect(scene.sweep!.y).toBeGreaterThan(at.y)
    const sounds = toy.takeSounds()
    // Its own grunt first (the troll's is a low sawtooth), then the pen.
    expect(sounds.length).toBe(2)
    expect([sounds[0][0].wave, sounds[0][0].pitch < 110]).toEqual(['sawtooth', true])
    expect(sounds[1]).toEqual(voices.sweepTo('troll'))
    expect(toy.stay.from).toBe('troll')
    expect(toy.takeSave()).toBe('soon')
  })

  it('the sweep is over in about a third of a second, and the guest springs back when the finger lifts', () => {
    const toy = fresh()
    tap(toy, bodyOf(toy, 'troll'))
    run(toy, SWEEP_SECONDS / 2)
    expect(toy.scene(page).sweep!.progress).toBeGreaterThan(0.5)
    run(toy, SWEEP_SECONDS)
    expect(toy.scene(page).sweep).toBe(null)
    expect(toy.scene(page).view).toEqual({ from: 'troll', room: 3, large: false })
    run(toy, 3)
    const body = guestIn(toy.scene(page), 'troll').body!
    expect(Math.abs(body.sy - 1)).toBeLessThan(0.06)
  })

  it('a guest in a room has that room drawn large on its page', () => {
    const toy = fresh()
    carry(toy, 'troll', middleOf(2)); run(toy, 1)
    tap(toy, bodyOf(toy, 'troll'))
    expect(toy.scene(page).view).toEqual({ from: 'troll', room: 2 })
  })

  it('another guest takes the page straight over; the same guest again, or the paper, gives the plain page back', () => {
    const toy = fresh()
    tap(toy, bodyOf(toy, 'troll'))
    run(toy, 1)
    tap(toy, bodyOf(toy, 'bat'))
    let scene = toy.scene(page)
    expect([scene.view!.from, scene.under!.from]).toEqual(['bat', 'troll'])
    run(toy, 1)
    // The bat's page is upside down; the bat is still found where it is drawn.
    tap(toy, bodyOf(toy, 'bat'))
    scene = toy.scene(page)
    expect([scene.view, scene.under!.from, toy.stay.from]).toEqual([null, 'bat', null])
    run(toy, 1)
    tap(toy, bodyOf(toy, 'blob'))
    expect(toy.scene(page).view!.from).toBe('blob')
    run(toy, 1)
    toy.takeSounds()
    tap(toy, { x: 8, y: 400 })
    expect(toy.scene(page).view).toBe(null)
    expect(toy.takeSounds()).toEqual([voices.paper, voices.sweepPlain])
  })

  it('each guest grunts a different way each time, higher toward its head', () => {
    const toy = fresh()
    const first: number[] = []
    for (let i = 0; i < 3; i++) {
      toy.takeSounds()
      tap(toy, bodyOf(toy, 'bat'))
      first.push(toy.takeSounds()[0][0].pitch)
      run(toy, 2)
    }
    expect(new Set(first.map((pitch) => pitch.toFixed(1))).size).toBe(3)
  })
})

describe('carrying is looking', () => {
  it('a finger that lands on a guest and moves picks it up, and the page stays that guest while it is carried', () => {
    const toy = fresh()
    const from = bodyOf(toy, 'bat')
    toy.gesture({ type: 'press', at: from }, page)
    toy.gesture({ type: 'dragStart', from }, page)
    // Held over room 1.
    const over = fromPlain(page, { from: 'bat', room: null, large: false, inHand: true }, middleOf(1))
    toy.gesture({ type: 'dragMove', from, at: over }, page)
    toy.step(1 / 60)
    const scene = toy.scene(page)
    // The room it is held over is in full ink and at its own size: nothing is enlarged or turned under a carrying finger,
    // so the finger is over room 1 just where room 1 is on the plain page.
    expect(scene.view).toEqual({ from: 'bat', room: 1, large: false, inHand: true })
    expect(over).toEqual(middleOf(1))
    expect(guestIn(scene, 'bat').carried).toMatchObject({ x: over.x, y: over.y })
    expect(toy.busy).toBe(true)
    // Nothing is saved in the air: the house still has the bat in the lobby.
    expect(placeOf(arrangementOf(toy.stay), 'bat')).toBe('lobby')
    expect(toy.takeSounds()).toContainEqual(voices.lifted('bat'))
  })

  it('set down in a room it moves in, with its sound, and the plain page comes back from there', () => {
    const toy = fresh()
    carry(toy, 'troll', middleOf(2))
    expect(placeOf(arrangementOf(toy.stay), 'troll')).toBe(2)
    const scene = toy.scene(page)
    expect([scene.view, scene.under!.from, toy.stay.from]).toEqual([null, 'troll', null])
    expect(guestIn(scene, 'troll').carried).toBeUndefined()
    expect(toy.takeSounds()).toContainEqual(voices.movesIn)
    expect(toy.takeSave()).toBe('soon')
  })

  it('every way of setting a guest down in the toy works and has its own sound', () => {
    const toy = fresh()
    carry(toy, 'troll', middleOf(2)); run(toy, 1); toy.takeSounds()
    // On a guest in a single room: the two swap.
    carry(toy, 'bat', plainBodyOf(toy, 'troll'))
    expect([placeOf(arrangementOf(toy.stay), 'bat'), placeOf(arrangementOf(toy.stay), 'troll')]).toEqual([2, 'lobby'])
    expect(toy.takeSounds()).toContainEqual(voices.swaps); run(toy, 1)
    // On the wall between two rooms: stuck half through, then out into the nearer room.
    const wall = page.edges.find((edge) => edge.id === '0-1')!.rect
    carry(toy, 'troll', { x: wall.x + wall.w / 2, y: wall.y + wall.h / 2 })
    expect([0, 1]).toContain(placeOf(arrangementOf(toy.stay), 'troll'))
    expect(toy.takeSounds()).toContainEqual(voices.throughTheWall); run(toy, 1)
    // Back to the lobby, and the bench guest carried in and out again.
    carry(toy, 'troll', { x: page.lobby.x + page.lobby.w / 2, y: page.lobby.y + page.lobby.h / 2 })
    expect(placeOf(arrangementOf(toy.stay), 'troll')).toBe('lobby')
    expect(toy.takeSounds()).toContainEqual(voices.toLobby); run(toy, 1)
    carry(toy, 'blob', middleOf(3))
    expect(placeOf(arrangementOf(toy.stay), 'blob')).toBe(3); run(toy, 1); toy.takeSounds()
    carry(toy, 'blob', { x: page.kerb.x + page.kerb.w / 2, y: page.kerb.y + page.kerb.h / 2 })
    expect(placeOf(arrangementOf(toy.stay), 'blob')).toBe('bench')
    expect(toy.takeSounds()).toContainEqual(voices.toBench)
  })

  it('let go over nothing, it is put back where it stood', () => {
    const toy = fresh()
    const before = arrangementOf(toy.stay)
    carry(toy, 'troll', { x: 30, y: 30 })
    expect(arrangementOf(toy.stay)).toEqual(before)
    expect(toy.takeSounds()).toContainEqual(voices.putBack)
    expect(toy.scene(page).view).toBe(null)
  })

  it('a heavy guest hangs stiller from the finger than a light one', () => {
    const swing = (id: GuestId) => {
      const toy = fresh()
      const from = bodyOf(toy, id)
      toy.gesture({ type: 'press', at: from }, page)
      toy.gesture({ type: 'dragStart', from }, page)
      let most = 0
      for (let i = 1; i <= 20; i++) {
        toy.gesture({ type: 'dragMove', from, at: { x: from.x - i * 14, y: from.y - 40 } }, page)
        toy.step(1 / 60)
        most = Math.max(most, Math.abs(guestIn(toy.scene(page), id).carried!.swing))
      }
      return most
    }
    expect(swing('bat')).toBeGreaterThan(swing('troll'))
  })

  it('going to rest puts a carried guest back where it came from, at once', () => {
    const toy = fresh()
    const from = bodyOf(toy, 'bat')
    toy.gesture({ type: 'press', at: from }, page)
    toy.gesture({ type: 'dragStart', from }, page)
    toy.gesture({ type: 'dragMove', from, at: middleOf(0) }, page)
    toy.takeSave()
    toy.rest()
    expect(placeOf(arrangementOf(toy.stay), 'bat')).toBe('lobby')
    expect([toy.stay.from, toy.scene(page).view, toy.busy]).toEqual([null, null, false])
    expect(toy.takeSave()).toBe('now')
  })
})

describe('everything else answers a touch too', () => {
  it('the wheel turns the hour, with its sound, and the page is redrawn from the wheel outward', () => {
    const toy = fresh()
    toy.gesture({ type: 'press', at: { x: page.wheel.x + page.wheel.w / 2, y: page.wheel.y + page.wheel.h / 2 } }, page)
    const scene = toy.scene(page)
    expect([toy.stay.phase, scene.phase, scene.hourUnder]).toEqual(['night', 'night', 'day'])
    expect(scene.hourSweep!.progress).toBe(0)
    expect(scene.wheelTurn).toBeCloseTo(-Math.PI)
    expect(toy.takeSounds()).toEqual([voices.wheelTurns('night')])
    run(toy, WHEEL_SECONDS + 0.05)
    expect([toy.scene(page).hourSweep, toy.scene(page).wheelTurn]).toEqual([null, 0])
  })

  it('a touch in a room sets its lamp swinging, and the swing dies away', () => {
    const toy = fresh()
    toy.gesture({ type: 'press', at: middleOf(1) }, page)
    expect(toy.takeSounds()).toEqual([voices.lamp])
    toy.step(1 / 60)
    run(toy, 0.2)
    const lamp = toy.scene(page).lamps!
    expect(lamp.map((one) => one.room)).toEqual([1])
    expect(Math.abs(lamp[0].angle)).toBeGreaterThan(0.05)
    run(toy, 12)
    expect(toy.scene(page).lamps).toEqual([])
  })

  it('a knock on a wall leaves its marks for half a second, and every guest who is up looks toward it', () => {
    const toy = fresh()
    const wall = page.edges.find((edge) => edge.id === '0-1')!.rect
    toy.gesture({ type: 'press', at: { x: wall.x + wall.w / 2, y: wall.y + wall.h / 2 } }, page)
    expect(toy.takeSounds()).toEqual([voices.knock])
    const scene = toy.scene(page)
    expect(scene.knocks!.length).toBe(1)
    // The house is to the left of the lobby.
    expect(guestIn(scene, 'troll').looks).toBe('left')
    expect(guestIn(scene, 'bat').looks).toBe('left')
    run(toy, KNOCK_SECONDS + 0.05)
    expect(toy.scene(page).knocks).toEqual([])
    run(toy, LOOK_SECONDS)
    expect(guestIn(toy.scene(page), 'troll').looks).toBeUndefined()
  })

  it('no touch anywhere lands in silence, except in the corner that is the grown-up', () => {
    for (let x = 20; x < 1180; x += 58) {
      for (let y = 20; y < 820; y += 47) {
        const toy = fresh()
        toy.gesture({ type: 'press', at: { x, y } }, page)
        const corner = x >= 1180 - 72 && y <= 72
        expect(toy.takeSounds().length > 0, `${x}, ${y}`).toBe(!corner)
      }
    }
  })

  it('the tuba plays on its beat only while the troll is up in a room, and is heard as the place the page is drawn from hears it', () => {
    const toy = fresh()
    const notes = (seconds: number) => { toy.takeSounds(); run(toy, seconds); return toy.takeSounds() }
    // In the lobby, by day: nothing.
    expect(notes(3)).toEqual([])
    carry(toy, 'troll', middleOf(2)); run(toy, 1)
    expect(notes(3)).toEqual([])
    // Night: the troll plays, and on the plain page it is the plain tune.
    toy.gesture({ type: 'press', at: { x: page.wheel.x + page.wheel.w / 2, y: page.wheel.y + page.wheel.h / 2 } }, page)
    const plain = notes(3)
    expect(plain.length).toBeGreaterThanOrEqual(2)
    expect(plain.every((sound) => sound[0].wave === 'triangle' && sound[0].peak === 0.07)).toBe(true)
    // From the troll's own place it is the round tune; from the blob's bed next door, the flat blare.
    tap(toy, bodyOf(toy, 'troll'))
    expect(notes(3).filter((sound) => sound.length === 2 && sound[0].peak === 0.11).length).toBeGreaterThanOrEqual(2)
    carry(toy, 'blob', middleOf(3)); run(toy, 1)
    tap(toy, bodyOf(toy, 'blob'))
    expect(notes(3).filter((sound) => sound[0].wave === 'sawtooth').length).toBeGreaterThanOrEqual(2)
  })
})

describe('found as left', () => {
  it('saved after any touch and opened again, the house and the page are the same, and nothing replays', () => {
    const toy = fresh(4)
    carry(toy, 'troll', middleOf(2)); run(toy, 1)
    toy.gesture({ type: 'press', at: { x: page.wheel.x + page.wheel.w / 2, y: page.wheel.y + page.wheel.h / 2 } }, page); run(toy, 1)
    tap(toy, bodyOf(toy, 'bat')); run(toy, 1)
    const back = new Play(readStay(json(writeStay(toy.stay)), null), 4)
    expect(back.stay).toEqual(toy.stay)
    const scene = back.scene(page)
    expect([scene.view, scene.sweep, scene.hourSweep, scene.phase]).toEqual([{ from: 'bat', room: 3, large: false }, null, null, 'night'])
    expect(scene.guests.map((guest) => [guest.id, guest.place])).toEqual(toy.scene(page).guests.map((guest) => [guest.id, guest.place]))
    expect(back.takeSounds()).toEqual([])
  })

  it('the same touches with the same seed give the same page, frame for frame', () => {
    const play = () => {
      const toy = fresh(9)
      const frames: InkScene[] = []
      tap(toy, bodyOf(toy, 'troll'))
      for (let i = 0; i < 90; i++) { toy.step(1 / 60); frames.push(toy.scene(page)) }
      carry(toy, 'bat', middleOf(1))
      for (let i = 0; i < 90; i++) { toy.step(1 / 60); frames.push(toy.scene(page)) }
      return frames
    }
    expect(play()).toEqual(play())
  })
})

describe('the idle ladder in its first form', () => {
  it('glows on what can be touched, and the ghost hand shows one move on the first waiting guest without changing anything', () => {
    const toy = fresh()
    const before = toy.stay
    const glow = toy.scene(page, { glow: 0.6, demo: null, demoIndex: -1 })
    expect(glow.glow).toEqual({ strength: 0.6, guests: ['troll', 'bat', 'blob'], wheel: true })
    expect(glow.hand).toBe(null)
    const pressing = toy.scene(page, { glow: 1, demo: 0.5, demoIndex: 0 })
    const troll = bodyOf(toy, 'troll')
    expect(pressing.hand!.down).toBe(true)
    expect(pressing.hand!.alpha).toBe(1)
    // The fingertip is on the troll, beside its middle, so the hand lies beside the figure.
    expect(pressing.hand!.x).toBeGreaterThan(troll.x)
    expect(pressing.hand!.x - troll.x).toBeLessThan(60)
    // The guest under the hand squashes and comes up a little, as it would under a finger, and goes back down.
    expect(guestIn(pressing, 'troll').body!.dy).toBeLessThan(-10)
    expect(guestIn(pressing, 'bat').body!.dy).toBeGreaterThan(-5)
    const arriving = toy.scene(page, { glow: 1, demo: 0.05, demoIndex: 0 })
    expect([arriving.hand!.down, arriving.hand!.alpha < 1, guestIn(arriving, 'troll').body!.dy > -5]).toEqual([false, true, true])
    const leaving = toy.scene(page, { glow: 1, demo: 0.95, demoIndex: 0 })
    expect([leaving.hand!.down, leaving.hand!.alpha < 1, guestIn(leaving, 'troll').body!.dy > -5]).toEqual([false, true, true])
    expect(toy.stay).toBe(before)
    expect(toy.takeSounds()).toEqual([])
    expect(toy.takeSave()).toBe('none')
  })

  it('with no guidance, or a touch in progress, nothing glows', () => {
    const toy = fresh()
    expect([toy.scene(page).glow, toy.scene(page).hand]).toEqual([null, null])
    expect(toy.scene(page, { glow: 0, demo: null, demoIndex: -1 }).glow).toBe(null)
  })
})

// --- The game on the toy ---------------------------------------------------------

/** A game with the named cast just off the coach. */
const begin = (id: string, seed = 1): Play => {
  const cast = castById(id)!
  return new Play(withCast({ ...freshStay(null), position: cast.position }, cast), seed)
}
const pageFor = (toy: Play) => layoutPage(1180, 820, arrangementOf(toy.stay).house.shape)
const centre = (rect: { x: number; y: number; w: number; h: number }) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 })
/** Where a thing is on the screen just now. */
function thingAtNow(toy: Play, kind: ThingKind): { x: number; y: number } {
  const where = pageFor(toy)
  const scene = toy.scene(where)
  const plain = pageOfArrangement(arrangementOf(toy.stay), null, true)
  const box = thingBox(scene.things.find((item) => item.kind === kind)!, where, spotsOf(plain.guests, where))!
  return fromPlain(where, scene.view ?? null, centre(box))
}
/** Carries a thing to a point of the plain page (things are carried on the page as it is: no view comes with them). */
function carryThing(toy: Play, kind: ThingKind, to: { x: number; y: number }): void {
  const where = pageFor(toy)
  const from = thingAtNow(toy, kind)
  toy.gesture({ type: 'press', at: from }, where)
  toy.gesture({ type: 'dragStart', from }, where)
  for (let i = 1; i <= 5; i++) { toy.gesture({ type: 'dragMove', from, at: { x: from.x + ((to.x - from.x) * i) / 5, y: from.y + ((to.y - from.y) * i) / 5 } }, where); toy.step(1 / 60) }
  toy.gesture({ type: 'dragEnd', from, at: to }, where)
}
/** Carries a guest to the middle of a room, on whatever house the game has. */
function toRoom(toy: Play, id: GuestId, room: number): void {
  const where = pageFor(toy)
  const rect = where.rooms[room].rect
  carryOn(toy, where, id, { x: rect.x + rect.w * 0.5, y: rect.y + rect.h * 0.3 })
}
function carryOn(toy: Play, where: ReturnType<typeof layoutPage>, id: GuestId, plainTo: { x: number; y: number }): void {
  const scene = toy.scene(where)
  const found = spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, where).find((one) => one.guest.id === id)!
  const box = bodyBox(found.spot, where)
  const from = fromPlain(where, scene.view ?? null, centre(box))
  toy.gesture({ type: 'press', at: from }, where)
  toy.gesture({ type: 'dragStart', from }, where)
  let to = fromPlain(where, { from: id, room: roomUnder(where, plainTo), large: false, inHand: true }, plainTo)
  for (let i = 1; i <= 5; i++) { toy.gesture({ type: 'dragMove', from, at: { x: from.x + ((to.x - from.x) * i) / 5, y: from.y + ((to.y - from.y) * i) / 5 } }, where); toy.step(1 / 60) }
  for (let i = 0; i < 3; i++) { to = fromPlain(where, toy.scene(where).view ?? null, plainTo); toy.gesture({ type: 'dragMove', from, at: to }, where); toy.step(1 / 60) }
  toy.gesture({ type: 'dragEnd', from, at: to }, where)
}
const tapOn = (toy: Play, at: { x: number; y: number }) => { const where = pageFor(toy); toy.gesture({ type: 'press', at }, where); toy.gesture({ type: 'tap', at }, where) }
const stepFor = (toy: Play, seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) toy.step(1 / 60) }

describe('the five things', () => {
  it('lie in the cupboard, answer a finger at once, and do their own thing when tapped', () => {
    const toy = begin('full-house/a')
    const where = pageFor(toy)
    const kinds = toy.scene(where).things.map((item) => [item.kind, item.at])
    expect(kinds).toEqual([['quilt', 'cupboard'], ['clock', 'cupboard'], ['stove', 'cupboard']])
    const at = thingAtNow(toy, 'stove')
    toy.gesture({ type: 'press', at }, where)
    expect(toy.scene(where).things.find((item) => item.kind === 'stove')!.body!.sy).toBeLessThan(1)
    expect(toy.takeSounds()).toEqual([voices.touched.stove])
    toy.gesture({ type: 'tap', at }, where)
    // The dial turned a step, and roars to it; the numeral the page lays beside the flames is the dial.
    expect(toy.scene(where).things.find((item) => item.kind === 'stove')!.dial).toBe(2)
    expect(toy.takeSounds()).toEqual([voices.stoveDial(2)])
    expect(toy.takeSave()).toBe('soon')
    tapOn(toy, thingAtNow(toy, 'quilt'))
    expect(toy.takeSounds()).toEqual([voices.touched.quilt, voices.feathers])
    tapOn(toy, thingAtNow(toy, 'clock'))
    expect(toy.takeSounds()).toEqual([voices.touched.clock, voices.clockRings])
  })

  it('are carried on the page as it is, and each place has its own outcome and its own sound', () => {
    const toy = begin('full-house/a')
    const where = pageFor(toy)
    toRoom(toy, 'blob', 4); stepFor(toy, 1); toy.takeSounds()
    // The quilt onto the wall between rooms 3 and 4.
    const wall = where.edges.find((edge) => edge.id === '3-4')!.rect
    carryThing(toy, 'quilt', centre(wall))
    expect(thing(arrangementOf(toy.stay), 'quilt')!.at).toEqual({ edge: '3-4' })
    expect(toy.takeSounds()).toContainEqual(voices.quiltHangs)
    // No view came with it: the page stayed plain.
    expect(toy.scene(where).view).toBe(null)
    // The stove into a room, the clock to the blob (who will change its hours).
    carryThing(toy, 'stove', { x: where.rooms[0].rect.x + 100, y: where.rooms[0].rect.y + 60 })
    expect(thing(arrangementOf(toy.stay), 'stove')!.at).toEqual({ room: 0 })
    expect(toy.takeSounds()).toContainEqual(voices.stoveWarms)
    carryThing(toy, 'clock', plainBodyOn(toy, 'blob'))
    expect(thing(arrangementOf(toy.stay), 'clock')!.at).toEqual({ guest: 'blob' })
    expect(toy.takeSounds()).toContainEqual(voices.clockKept)
    // And back to the cupboard.
    carryThing(toy, 'stove', centre(where.cupboard))
    expect(thing(arrangementOf(toy.stay), 'stove')!.at).toBe('cupboard')
    expect(toy.takeSounds()).toContainEqual(voices.toCupboard)
  })

  it('a thing in the hand is saved where it came from, and going to rest puts it back', () => {
    const toy = begin('quilt/a')
    const where = pageFor(toy)
    const from = thingAtNow(toy, 'quilt')
    toy.gesture({ type: 'press', at: from }, where)
    toy.gesture({ type: 'dragStart', from }, where)
    toy.gesture({ type: 'dragMove', from, at: centre(where.rooms[1].rect) }, where)
    expect(toy.scene(where).things[0].carried).toMatchObject(centre(where.rooms[1].rect))
    expect(thing(arrangementOf(toy.stay), 'quilt')!.at).toBe('cupboard')
    toy.rest()
    expect(toy.scene(where).things[0].carried).toBeUndefined()
    expect(thing(arrangementOf(toy.stay), 'quilt')!.at).toBe('cupboard')
  })
})

function plainBodyOn(toy: Play, id: GuestId): { x: number; y: number } {
  const where = pageFor(toy)
  const found = spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, where).find((one) => one.guest.id === id)!
  return centre(bodyBox(found.spot, where))
}

describe('a cycle on the page', () => {
  it('the settled day plays when the house is settled, over a stay that already holds its outcome, and saves at once', () => {
    const toy = begin('two-guests/b')
    toRoom(toy, 'troll', 0); stepFor(toy, 1); toy.takeSave()
    toRoom(toy, 'blob', 2)
    // Settled another way than the neat one (troll 0, blob 3)? No: 0 and 2 share a floor edge. Move the blob across.
    expect(toy.stay.finished).toBe(false)
    stepFor(toy, 1)
    toRoom(toy, 'blob', 3)
    expect(toy.stay.finished).toBe(true)
    expect(toy.stay.position).toBe('heat-and-snow')
    expect(toy.takeSave()).toBe('now')
    expect(toy.playing).toBe(true)
    expect(toy.busy).toBe(true)
    expect(toy.sceneLeft).toBeGreaterThan(7.5)
    expect(toy.sceneLeft).toBeLessThan(10)
    // One hour of each kind goes by: the page shows night, then the child's day again. The stay's hour never changes.
    const where = pageFor(toy)
    stepFor(toy, 1.2)
    expect([toy.scene(where).phase, toy.stay.phase]).toEqual(['night', 'day'])
    stepFor(toy, 3.6)
    expect(toy.scene(where).phase).toBe('day')
    stepFor(toy, 5)
    expect(toy.playing).toBe(false)
    // The judged house waits: the coach's door stands open, and nothing else happens by itself.
    expect(toy.scene(where).coachOpen).toBe(true)
    const before = toy.stay
    stepFor(toy, 30)
    expect(toy.stay).toBe(before)
  })

  it('a touch ends the scene at once, in silence, and is then an ordinary touch', () => {
    const toy = begin('two-guests/b')
    toRoom(toy, 'troll', 0); stepFor(toy, 1)
    toRoom(toy, 'blob', 3)
    stepFor(toy, 1.5)
    const where = pageFor(toy)
    expect(toy.scene(where).phase).toBe('night')
    toy.takeSounds()
    toy.gesture({ type: 'press', at: centre(where.rooms[1].rect) }, where)
    expect(toy.playing).toBe(false)
    const scene = toy.scene(where)
    expect([scene.phase, scene.hourSweep]).toEqual(['day', null])
    // The touch itself was answered: the lamp of the room it landed in, and nothing from the scene.
    expect(toy.takeSounds()).toEqual([voices.lamp])
    expect(scene.lamps!.map((lamp) => lamp.room)).toEqual([1])
  })

  it('the porter comes in after the settled day, shows the neat way, and puts everything back; the mark is saved when he comes in', () => {
    const toy = begin('two-guests/c')
    toRoom(toy, 'troll', 1); stepFor(toy, 1)
    toRoom(toy, 'bat', 0); stepFor(toy, 1)
    toRoom(toy, 'blob', 2)
    expect(toy.playing).toBe(true)
    const mine = arrangementOf(toy.stay)
    const where = pageFor(toy)
    // Through the settled day: nothing marked yet.
    stepFor(toy, toy.sceneLeft - 6.5)
    expect(toy.stay.shown).toEqual([])
    toy.takeSave()
    stepFor(toy, 1.5)
    // He has come in: the place is marked and saved at once, and the page shows the neat arrangement with the guests walking to it.
    expect(toy.stay.shown).toEqual(['two-guests'])
    expect(toy.takeSave()).toBe('now')
    expect(toy.scene(where).porterAt!.dx).toBeCloseTo(-PORTER_REACH)
    const shown = toy.scene(where).guests.filter((guest) => typeof guest.place === 'object').map((guest) => [guest.id, (guest.place as { room: number }).room])
    expect(shown).toEqual([['troll', 0], ['bat', 1], ['blob', 3]])
    stepFor(toy, 8)
    expect(toy.playing).toBe(false)
    // Everything is back exactly as the child had it, on the page and in the stay.
    expect(arrangementOf(toy.stay)).toEqual(mine)
    expect(toy.scene(where).guests.filter((guest) => typeof guest.place === 'object').map((guest) => [guest.id, (guest.place as { room: number }).room])).toEqual([['troll', 1], ['bat', 0], ['blob', 2]])
    expect(toy.scene(where).porterAt).toEqual({ dx: -0, dy: 0 })
  })

  it('a settled day cut short before the porter comes in marks nothing, and he comes on the next settled day of that place', () => {
    const toy = begin('two-guests/c')
    toRoom(toy, 'troll', 1); stepFor(toy, 1)
    toRoom(toy, 'bat', 0); stepFor(toy, 1)
    toRoom(toy, 'blob', 2)
    stepFor(toy, 3)
    const where = pageFor(toy)
    toy.gesture({ type: 'press', at: { x: 8, y: 400 } }, where)
    toy.gesture({ type: 'tap', at: { x: 8, y: 400 } }, where)
    expect(toy.playing).toBe(false)
    expect(toy.stay.shown).toEqual([])
    // Put away in the middle instead: the same.
    const other = begin('two-guests/c')
    toRoom(other, 'troll', 1); stepFor(other, 1)
    toRoom(other, 'bat', 0); stepFor(other, 1)
    toRoom(other, 'blob', 2)
    stepFor(other, 3)
    other.rest()
    expect([other.playing, other.stay.shown, other.stay.finished]).toEqual([false, [], true])
    expect(other.takeSave()).toBe('now')
  })

  it('the coach only honks until the cycle is judged; then a touch changes it over, and the new guests walk in from its door', () => {
    const toy = begin('two-guests/b')
    const where = pageFor(toy)
    const coach = centre(where.coach)
    toy.gesture({ type: 'press', at: coach }, where)
    expect(toy.takeSounds()).toEqual([voices.horn])
    expect(toy.scene(where).coachOpen).toBe(true)
    stepFor(toy, 1)
    expect(toy.scene(where).coachOpen).toBe(false)
    toRoom(toy, 'troll', 0); stepFor(toy, 1)
    toRoom(toy, 'blob', 3); stepFor(toy, 12)
    toy.takeSave()
    const old = toy.stay.cast
    toy.gesture({ type: 'press', at: coach }, where)
    // The stay holds the new coach-load from the first moment of the scene, saved at once.
    expect(toy.stay.cast).not.toBe(old)
    expect([toy.stay.finished, toy.stay.round, toy.stay.moves, toy.stay.from]).toEqual([false, 1, 0, null])
    expect(castById(toy.stay.cast)!.position).toBe('heat-and-snow')
    expect(toy.takeSave()).toBe('now')
    expect(toy.playing).toBe(true)
    const then = pageFor(toy)
    stepFor(toy, 0.6)
    const scene = toy.scene(then)
    // The old guests are on the page only as walkers; the new ones are still in the coach.
    const ids = scene.guests.map((guest) => guest.id)
    expect(ids).toEqual(expect.arrayContaining(['troll', 'blob', ...castById(toy.stay.cast)!.guests]))
    expect(scene.coachOpen).toBe(true)
    stepFor(toy, 8)
    expect(toy.playing).toBe(false)
    const after = toy.scene(then)
    expect(after.guests.map((guest) => guest.id).sort()).toEqual([...castById(toy.stay.cast)!.guests, castById(toy.stay.cast)!.bench].sort())
    expect([after.coachAt, after.coachOpen]).toEqual([0, false])
    for (const guest of after.guests) expect(Math.abs(guest.body!.dx) + Math.abs(guest.body!.dy)).toBeLessThan(8)
  })

  it('a guest carried out to the coach before the house is settled sends the lot away, and the house is empty at once', () => {
    const toy = begin('heat-and-snow/a')
    const where = pageFor(toy)
    toRoom(toy, 'lizard', 1); stepFor(toy, 1); toy.takeSave()
    carryOn(toy, where, 'yeti', centre(where.coach))
    expect([toy.stay.finished, toy.stay.position]).toEqual([true, 'two-guests'])
    expect(Object.values(toy.stay.at)).toEqual(['gone', 'gone', 'gone'])
    expect(toy.takeSave()).toBe('now')
    expect(toy.playing).toBe(true)
    stepFor(toy, 0.8)
    // They file out as walkers, the bench guest among them.
    expect(toy.scene(where).guests.map((guest) => guest.id).sort()).toEqual(['lizard', 'troll', 'yeti'])
    stepFor(toy, 8)
    expect(toy.playing).toBe(false)
    expect(toy.scene(where).guests).toEqual([])
    expect(toy.scene(where).coachOpen).toBe(true)
  })

  it('put away in the middle of any scene and opened again, the house is as the scene left it and nothing replays', () => {
    const toy = begin('two-guests/b')
    toRoom(toy, 'troll', 0); stepFor(toy, 1)
    toRoom(toy, 'blob', 3); stepFor(toy, 2)
    toy.rest()
    const back = new Play(readStay(json(writeStay(toy.stay)), null), 1)
    expect(back.stay).toEqual(toy.stay)
    expect([back.playing, back.stay.finished]).toEqual([false, true])
    const where = pageFor(back)
    stepFor(back, 3)
    expect(back.playing).toBe(false)
    expect(back.scene(where).phase).toBe('day')
    // The coach waits for the child's touch.
    back.gesture({ type: 'press', at: centre(where.coach) }, where)
    expect(back.playing).toBe(true)
  })

  it('a guest whose room another takes walks to its new place instead of jumping', () => {
    const toy = begin('two-guests/b')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 0); stepFor(toy, 1)
    toy.scene(where)
    carryOn(toy, where, 'blob', plainBodyOn(toy, 'troll'))
    const scene = toy.scene(where)
    const troll = scene.guests.find((guest) => guest.id === 'troll')!
    expect(troll.place).toBe('lobby')
    // It is drawn where it stood a moment ago, and walks from there: out by its room's door, and in at the house end of the lobby.
    expect(Math.abs(troll.body!.dx) + Math.abs(troll.body!.dy)).toBeGreaterThan(100)
    const seen: { x: number; y: number }[] = []
    for (let i = 0; i < 40; i++) {
      toy.step(1 / 60)
      const now = toy.scene(where).guests.find((guest) => guest.id === 'troll')!
      if (now.body!.sx > 0.5) seen.push({ x: now.body!.dx, y: now.body!.dy })
    }
    // It never crosses the wall between: at one moment it is at its room's door, and the next at the house end of the lobby.
    const jumps = seen.slice(1).map((at, i) => Math.abs(at.x - seen[i].x)).filter((step) => step > 40)
    expect(jumps.length).toBe(1)
    expect(seen.length).toBe(40)
    stepFor(toy, 1)
    const later = toy.scene(where).guests.find((guest) => guest.id === 'troll')!
    expect(Math.abs(later.body!.dx) + Math.abs(later.body!.dy)).toBeLessThan(8)
  })

  it('a pairing plays every time its combination is made, and changes no field', () => {
    const toy = begin('stove-and-ice/a')
    const where = pageFor(toy)
    toRoom(toy, 'yeti', 4); stepFor(toy, 1)
    carryThing(toy, 'stove', { x: where.rooms[4].rect.x + 100, y: where.rooms[4].rect.y + 60 }); stepFor(toy, 1)
    tapOn(toy, thingAtNow(toy, 'stove')); stepFor(toy, 0.2)
    expect(toy.playing).toBe(false)
    const before = toy.stay
    tapOn(toy, thingAtNow(toy, 'stove'))
    expect(toy.playing).toBe(true)
    expect({ ...toy.stay, kit: before.kit }).toEqual(before)
    stepFor(toy, 0.3)
    expect(toy.takeSounds()).toContainEqual(voices.sauna)
    // The yeti sags: wider and lower than it stands.
    stepFor(toy, 1.5)
    const yeti = toy.scene(where).guests.find((guest) => guest.id === 'yeti')!
    expect(yeti.body!.sy).toBeLessThan(0.93)
    stepFor(toy, 3)
    expect(toy.playing).toBe(false)
  })
})

describe('the house goes quiet when nobody touches it', () => {
  it('the tuba thins after a while and stops, and comes back with a touch', () => {
    const toy = fresh()
    carry(toy, 'troll', middleOf(2)); stepFor(toy, 1)
    toy.gesture({ type: 'press', at: { x: page.wheel.x + page.wheel.w / 2, y: page.wheel.y + page.wheel.h / 2 } }, page)
    const count = (seconds: number) => { toy.takeSounds(); stepFor(toy, seconds); return toy.takeSounds().filter((sound) => sound[0].wave === 'triangle' && sound[0].peak === 0.07).length }
    const lively = count(8)
    stepFor(toy, QUIET_AFTER[0] - 8)
    const thin = count(8)
    stepFor(toy, QUIET_AFTER[1])
    const quiet = count(8)
    expect(lively).toBeGreaterThan(thin)
    expect(thin).toBeGreaterThan(0)
    expect(quiet).toBe(0)
    toy.gesture({ type: 'press', at: { x: 8, y: 400 } }, page)
    expect(count(8)).toBe(lively)
  })
})

describe('the whole idle ladder', () => {
  it('shows one verb a showing and goes down the list: a waiting guest lifted, then a cross guest touched, then a thing lifted from the cupboard', () => {
    const toy = begin('quilt/b')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 0); stepFor(toy, 1)
    toRoom(toy, 'blob', 2); stepFor(toy, 1)
    // The yeti waits in the lobby; the blob is cross (too warm over the boiler); the quilt lies in the cupboard.
    const first = toy.scene(where, { glow: 1, demo: 0.5, demoIndex: 0 })
    expect(first.guests.find((guest) => guest.id === 'yeti')!.body!.dy).toBeLessThan(-10)
    const second = toy.scene(where, { glow: 1, demo: 0.3, demoIndex: 1 })
    const blob = plainBodyOn(toy, 'blob')
    expect(Math.abs(second.hand!.x - blob.x)).toBeLessThan(60)
    expect(second.guests.find((guest) => guest.id === 'yeti')!.body!.dy).toBeGreaterThan(-5)
    const third = toy.scene(where, { glow: 1, demo: 0.5, demoIndex: 2 })
    expect(third.things.find((item) => item.kind === 'quilt')!.body!.dy).toBeLessThan(-10)
    // None of it touched the house.
    expect(thing(arrangementOf(toy.stay), 'quilt')!.at).toBe('cupboard')
    expect(toy.takeSounds().filter((sound) => sound === voices.touched.quilt)).toEqual([])
  })

  it('shows nothing while a scene plays, and the coach when the cycle has been judged', () => {
    const toy = begin('two-guests/b')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 0); stepFor(toy, 1)
    toRoom(toy, 'blob', 3)
    expect([toy.scene(where, { glow: 1, demo: 0.5, demoIndex: 0 }).hand, toy.scene(where, { glow: 1, demo: 0.5, demoIndex: 0 }).glow]).toEqual([null, null])
    stepFor(toy, 12)
    const hand = toy.scene(where, { glow: 1, demo: 0.5, demoIndex: 0 }).hand!
    expect(Math.abs(hand.x - centre(where.coachDoor).x)).toBeLessThan(40)
    // One thing is wanted now, and nothing else glows to compete with it.
    expect(toy.scene(where, { glow: 1, demo: 0.5, demoIndex: 0 }).glow).toBe(null)
  })
})
