import { describe, expect, it } from 'vitest'
import { arrangementOf, freshStay, readStay, withCast, writeStay } from './stay'
import { castById, neatOf, startOf } from './casts'
import { settled } from './mood'
import { roomings } from './solver'
import { bodyBox, fromPlain, lensOf, spotsOf, thingBox } from './inkPlaces'
import type { InkScene } from './inkScene'
import { FLIGHT_SECONDS, crowsAt, treeOf } from './inkSky'
import { layoutPage } from './layout'
import { placeOf, thing, type ThingKind } from './arrangement'
import { GUEST_IDS, type GuestId } from './guests'
import { roomUnder } from './hit'
import { pageOfArrangement } from './page'
import { GLANCE_SECONDS, HELD_SECONDS, KNOCK_SECONDS, LOOK_SECONDS, PAIR_BEATS, PORTER_COMES_IN, PORTER_REACH, Play, SWEEP_SECONDS, WHEEL_SECONDS } from './play'
import { demandOf } from './demand'
import { FETCH, NEAT } from './stage'
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
    // The page stays the bat's, which the child turned to by touching it: found as left, drawn from the same place.
    expect([toy.stay.from, toy.scene(page).view?.from, toy.scene(page).view?.inHand, toy.busy]).toEqual(['bat', 'bat', undefined, false])
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

  it('a room door, a bed, the boiler, the luggage and the bird cage each answer as themselves: their own sound, marks under the finger, and no lamp set swinging', () => {
    const mid = (rect: { x: number; y: number; w: number; h: number }) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 })
    const answers = (toy: Play, at: { x: number; y: number }, where = page) => {
      toy.takeSounds()
      toy.gesture({ type: 'press', at }, where)
      const scene = toy.scene(where)
      const heard = toy.takeSounds()
      run(toy, KNOCK_SECONDS + 0.05)
      return { heard, knocks: scene.knocks!.length, lamps: scene.lamps!.length }
    }
    const toy = fresh()
    expect(answers(toy, mid(page.rooms[1].door))).toEqual({ heard: [voices.roomDoor], knocks: 1, lamps: 0 })
    expect(answers(toy, mid(page.rooms[1].bed))).toEqual({ heard: [voices.bedSprings], knocks: 1, lamps: 0 })
    expect(answers(toy, { x: page.luggage.x + page.luggage.w / 2, y: page.luggage.y + page.luggage.h - 10 })).toEqual({ heard: [voices.luggage], knocks: 1, lamps: 0 })
    expect(answers(toy, { x: page.luggage.x + 26 * page.scale, y: page.luggage.y + 12 * page.scale })).toEqual({ heard: [voices.cage], knocks: 1, lamps: 0 })
    // The air of a room is still its lamp's.
    expect(answers(fresh(), middleOf(1))).toEqual({ heard: [voices.lamp], knocks: 0, lamps: 1 })
    // The five are five different sounds, and none is the plaster's knock, the lamp's chain or the paper's rustle.
    const five = [voices.roomDoor, voices.bedSprings, voices.boiler, voices.luggage, voices.cage]
    expect(new Set([...five, voices.knock, voices.lamp, voices.paper, voices.door].map((sound) => JSON.stringify(sound))).size).toBe(9)
    // A house with a boiler: its bay of the foundations rings; in a house with none, the same place is stone and knocks.
    const heated = begin('heat-and-snow/a')
    const bay = pageFor(heated).cellarBays[0]
    expect(answers(heated, mid(bay), pageFor(heated))).toEqual({ heard: [voices.boiler], knocks: 1, lamps: 0 })
    expect(answers(toy, mid(page.cellarBays[0]))).toEqual({ heard: [voices.knock], knocks: 1, lamps: 0 })
    // A room for two has a second bed against its other wall, and that is a bed too; in a room for one the same place is the room's air.
    const twins = begin('twin-rooms/a')
    const room = pageFor(twins).rooms[0]
    const second = { x: 2 * (room.rect.x + room.rect.w / 2) - (room.bed.x + room.bed.w / 2), y: room.bed.y + room.bed.h * 0.7 }
    expect(answers(twins, second, pageFor(twins)).heard).toEqual([voices.bedSprings])
    expect(answers(twins, { x: 2 * (pageFor(twins).rooms[1].rect.x + pageFor(twins).rooms[1].rect.w / 2) - (pageFor(twins).rooms[1].bed.x + pageFor(twins).rooms[1].bed.w / 2), y: pageFor(twins).rooms[1].bed.y + 4 }, pageFor(twins)).heard).not.toEqual([voices.bedSprings])
  })

  it('a tap on the luggage or the bird cage never turns a guest\'s page back: only bare paper does', () => {
    const toy = fresh()
    tap(toy, bodyOf(toy, 'troll'))
    run(toy, SWEEP_SECONDS + 0.1)
    expect(toy.scene(page).view).toMatchObject({ from: 'troll' })
    for (const at of [{ x: page.luggage.x + page.luggage.w / 2, y: page.luggage.y + page.luggage.h - 10 }, { x: page.luggage.x + 26 * page.scale, y: page.luggage.y + 12 * page.scale }]) {
      tap(toy, at)
      run(toy, SWEEP_SECONDS + 0.1)
      expect(toy.scene(page).view).toMatchObject({ from: 'troll' })
      expect(toy.stay.from).toBe('troll')
    }
    // Bare paper: the sky over the lobby.
    tap(toy, { x: page.lobby.x + page.lobby.w * 0.1, y: page.plate.y + 30 })
    run(toy, SWEEP_SECONDS + 0.1)
    expect(toy.scene(page).view ?? null).toBe(null)
  })

  it('a finger on the tree sends the crows up with a caw, turns no page, and they are down again in a few seconds', () => {
    const toy = fresh()
    tap(toy, bodyOf(toy, 'troll'))
    run(toy, SWEEP_SECONDS + 0.1)
    toy.takeSounds()
    expect(toy.scene(page).startled ?? null).toBe(null)
    const trunk = treeOf(page)[0]
    tap(toy, { x: trunk.mx, y: trunk.my })
    expect(toy.takeSounds()).toEqual([voices.caw])
    expect(toy.scene(page).startled).toBe(0)
    expect(toy.scene(page).view).toMatchObject({ from: 'troll' })
    run(toy, 1)
    expect(toy.scene(page).startled).toBeCloseTo(1, 1)
    expect(crowsAt(page, 'day', 0, toy.scene(page).startled ?? null).every((crow) => crow.aloft !== null)).toBe(true)
    run(toy, FLIGHT_SECONDS + 1)
    expect(toy.scene(page).startled ?? null).toBe(null)
    expect(toy.scene(page).view).toMatchObject({ from: 'troll' })
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
    // The first house has nothing in its cupboard: the guests and the wheel glow.
    expect(glow.glow).toEqual({ strength: 0.6, guests: ['troll', 'bat', 'blob'], wheel: true, things: [] })
    // Where there are things, each of them glows too, wherever it is: they can all be touched.
    const kit = begin('full-house/a')
    expect(kit.scene(pageFor(kit), { glow: 0.6, demo: null, demoIndex: -1 }).glow!.things).toEqual(Object.keys(kit.stay.kit))
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
    // The whumpf, and then the sneeze of whoever is nearest, in its own voice.
    const [touched, whumpf, sneeze] = toy.takeSounds()
    expect([touched, whumpf]).toEqual([voices.touched.quilt, voices.feathers])
    expect(GUEST_IDS.some((id) => JSON.stringify(sneeze.map((note) => ({ ...note, at: 0 }))) === JSON.stringify(voices.sneeze(id).map((note) => ({ ...note, at: 0 }))))).toBe(true)
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
    // He has trundled well out of his corner into the lobby, which is empty: it is seen.
    expect(toy.scene(where).porterAt!.dx).toBeCloseTo(PORTER_COMES_IN)
    expect(PORTER_COMES_IN).toBeGreaterThan(40)
    const shown = toy.scene(where).guests.filter((guest) => typeof guest.place === 'object').map((guest) => [guest.id, (guest.place as { room: number }).room])
    expect(shown).toEqual([['troll', 0], ['bat', 1], ['blob', 3]])
    stepFor(toy, 8)
    expect(toy.playing).toBe(false)
    // Everything is back exactly as the child had it, on the page and in the stay.
    expect(arrangementOf(toy.stay)).toEqual(mine)
    expect(toy.scene(where).guests.filter((guest) => typeof guest.place === 'object').map((guest) => [guest.id, (guest.place as { room: number }).room])).toEqual([['troll', 1], ['bat', 0], ['blob', 2]])
    expect(toy.scene(where).porterAt).toEqual({ dx: 0, dy: 0 })
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
    // The yeti is in the coach already; the rest follow it out as walkers, the bench guest among them.
    expect(toy.scene(where).guests.map((guest) => guest.id).sort()).toEqual(['lizard', 'troll'])
    stepFor(toy, 8)
    expect(toy.playing).toBe(false)
    expect(toy.scene(where).guests).toEqual([])
    expect(toy.scene(where).coachOpen).toBe(true)
  })

  it('put away in the middle of any scene and opened again, the house is as the scene left it and nothing replays', () => {
    /** The scenes the game has, each begun on a toy of its own: the two endings (a house settled, with the porter's neat way after it, and a lot sent away) and the changeover of coach-loads. */
    const scenes: [string, () => Play][] = [
      ['a house settled', () => { const toy = begin('two-guests/b'); toRoom(toy, 'troll', 0); stepFor(toy, 1); toRoom(toy, 'blob', 3); return toy }],
      ['a lot sent away', () => { const toy = begin('heat-and-snow/c'); carryOn(toy, pageFor(toy), 'yeti', centre(pageFor(toy).coach)); return toy }],
      ['the coach changing over', () => {
        const toy = begin('two-guests/b'); toRoom(toy, 'troll', 0); stepFor(toy, 1); toRoom(toy, 'blob', 3); stepFor(toy, 30)
        expect(toy.playing).toBe(false)
        toy.gesture({ type: 'press', at: centre(pageFor(toy).coach) }, pageFor(toy))
        return toy
      }],
    ]
    for (const [name, start] of scenes) {
      // How long the scene runs when it is left to play, and what it leaves.
      const whole = start()
      expect(whole.playing, name).toBe(true)
      let length = 0
      while (whole.playing && length < 60) { whole.step(1 / 60); length += 1 / 60 }
      expect(length, name).toBeGreaterThan(1)
      expect(length, name).toBeLessThan(60)
      const left = json(writeStay(whole.stay))
      // Put away at its first frame, a quarter, half and nine tenths of the way through, and opened again.
      for (const share of [0, 0.25, 0.5, 0.9]) {
        const toy = start()
        stepFor(toy, length * share)
        expect(toy.playing, `${name} at ${share}`).toBe(true)
        toy.rest()
        const saved = json(writeStay(toy.stay))
        // What is saved in the middle is already what the scene leaves: nothing is lost by leaving, and nothing is still to come.
        expect(saved, `${name} at ${share}`).toEqual(left)
        const back = new Play(readStay(saved, null), 1)
        expect(back.playing, `${name} at ${share}`).toBe(false)
        const where = pageFor(back)
        const opened = back.scene(where)
        stepFor(back, 3)
        // Nothing replays: no scene starts by itself, nobody walks anywhere, and no sound of an ending is made.
        expect(back.playing, `${name} at ${share}`).toBe(false)
        expect(json(writeStay(back.stay)), `${name} at ${share}`).toEqual(left)
        expect(back.scene(where).guests.map((guest) => [guest.id, guest.place]), `${name} at ${share}`).toEqual(opened.guests.map((guest) => [guest.id, guest.place]))
        expect(back.scene(where).guests.map((guest) => [guest.id, guest.place]), `${name} at ${share}`).toEqual(whole.scene(pageFor(whole)).guests.map((guest) => [guest.id, guest.place]))
      }
    }
    // And a house that was settled waits for the child's touch on the coach, as it did.
    const settledToy = scenes[0][1]()
    settledToy.rest()
    const back = new Play(readStay(json(writeStay(settledToy.stay)), null), 1)
    expect([back.playing, back.stay.finished]).toEqual([false, true])
    back.gesture({ type: 'press', at: centre(pageFor(back).coach) }, pageFor(back))
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

describe('the house keeps sounding for as long as the game is attended', () => {
  it('the tuba plays every step of its tune after a long while without a touch, as it does at first', () => {
    const toy = fresh()
    carry(toy, 'troll', middleOf(2)); stepFor(toy, 1)
    toy.gesture({ type: 'press', at: { x: page.wheel.x + page.wheel.w / 2, y: page.wheel.y + page.wheel.h / 2 } }, page)
    const count = (seconds: number) => { toy.takeSounds(); stepFor(toy, seconds); return toy.takeSounds().filter((sound) => sound[0].wave === 'triangle' && sound[0].peak === 0.07).length }
    const lively = count(8)
    expect(lively).toBeGreaterThan(0)
    stepFor(toy, 120)
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

describe('putting the game away makes no move the child did not make', () => {
  it('a touch the browser takes away in the middle of a carry sets nothing down, at a put-away or when the wait for the finger runs out; a finger that comes back carries on', () => {
    const start = () => {
      const toy = begin('two-guests/b')
      const where = pageFor(toy)
      const found = spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, where).find((one) => one.guest.id === 'troll')!
      const from = centre(bodyBox(found.spot, where)), over = centre(where.rooms[0].rect)
      toy.gesture({ type: 'press', at: from }, where)
      toy.gesture({ type: 'dragStart', from }, where)
      toy.gesture({ type: 'dragMove', from, at: over }, where)
      // What the Mount does on a pointer the browser cancels: the touch reports a lift, and the game is told it was taken.
      toy.gesture({ type: 'dragLift', from, at: over }, where)
      toy.takenAway()
      return { toy, where, from, over }
    }
    // Put away at once (a system gesture that leaves the app): the troll is back in the lobby.
    const away = start()
    away.toy.rest()
    away.toy.gesture({ type: 'dragEnd', from: away.from, at: away.over }, away.where)
    expect([placeOf(arrangementOf(away.toy.stay), 'troll'), away.toy.stay.moves, away.toy.stay.from]).toEqual(['lobby', 0, 'troll'])
    // Nobody comes back and the wait runs out: the same.
    const waited = start()
    waited.toy.gesture({ type: 'dragEnd', from: waited.from, at: waited.over }, waited.where)
    expect([placeOf(arrangementOf(waited.toy.stay), 'troll'), waited.toy.stay.moves]).toEqual(['lobby', 0])
    // Over the coach it sends nobody away.
    const coach = start()
    coach.toy.gesture({ type: 'dragEnd', from: coach.from, at: centre(coach.where.coach) }, coach.where)
    expect(coach.toy.stay.finished).toBe(false)
    // A finger that comes back carries on, and its set-down is the child's.
    const back = start()
    back.toy.gesture({ type: 'dragMove', from: back.from, at: back.over }, back.where)
    back.toy.gesture({ type: 'dragEnd', from: back.from, at: back.over }, back.where)
    expect(placeOf(arrangementOf(back.toy.stay), 'troll')).toBe(0)
  })

  it('a finger that had already let go made its move: put away inside the moment a drag waits for the finger to come back, the set-down is made and not lost', () => {
    const toy = begin('two-guests/b')
    const where = pageFor(toy)
    const found = spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, where).find((one) => one.guest.id === 'troll')!
    const from = centre(bodyBox(found.spot, where)), over = centre(where.rooms[0].rect)
    toy.gesture({ type: 'press', at: from }, where)
    toy.gesture({ type: 'dragStart', from }, where)
    toy.gesture({ type: 'dragMove', from, at: over }, where)
    // The finger lifts; the template's touch keeps the drag open for a moment. The game is put away in that moment.
    toy.gesture({ type: 'dragLift', from, at: over }, where)
    toy.rest()
    expect(placeOf(arrangementOf(toy.stay), 'troll')).toBe(0)
    expect(toy.takeSave()).toBe('now')
    // The drag end that the cleared touch sends afterwards changes nothing more.
    const made = toy.stay
    toy.gesture({ type: 'dragEnd', from, at: over }, where)
    expect(toy.stay).toEqual(made)
    // A finger that comes back before the put-away is carrying again: then nothing is set down.
    const back = begin('two-guests/b')
    back.gesture({ type: 'press', at: from }, where)
    back.gesture({ type: 'dragStart', from }, where)
    back.gesture({ type: 'dragLift', from, at: over }, where)
    back.gesture({ type: 'dragMove', from, at: over }, where)
    back.rest()
    expect(placeOf(arrangementOf(back.stay), 'troll')).toBe('lobby')
  })

  it('in the middle of a carry: what is in the hand goes back, and the touch that ends afterwards sets nothing down', () => {
    // The Mount's order on going to rest: the game rests first, then the touch is cleared, which ends the drag under the finger.
    const toy = begin('two-guests/b')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 0); stepFor(toy, 1)
    const before = toy.stay
    const scene = toy.scene(where)
    const found = spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, where).find((one) => one.guest.id === 'blob')!
    const from = fromPlain(where, scene.view ?? null, centre(bodyBox(found.spot, where)))
    toy.gesture({ type: 'press', at: from }, where)
    toy.gesture({ type: 'dragStart', from }, where)
    // Held over the one room that would settle the house, and then over the coach.
    for (const over of [centre(where.rooms[3].rect), centre(where.coach)]) {
      const held = begin('two-guests/b')
      toRoom(held, 'troll', 0); stepFor(held, 1)
      const mark = held.stay
      held.gesture({ type: 'press', at: from }, where)
      held.gesture({ type: 'dragStart', from }, where)
      held.gesture({ type: 'dragMove', from, at: over }, where)
      held.rest()
      held.gesture({ type: 'dragEnd', from, at: over }, where)
      expect({ ...held.stay, from: null }, 'the house as it was').toEqual({ ...mark, from: null })
      expect([held.playing, held.stay.finished, held.stay.moves]).toEqual([false, false, mark.moves])
    }
    expect(toy.stay.at).toEqual(before.at)
    // The same for a thing in the hand.
    const kit = begin('quilt/a')
    const page2 = pageFor(kit)
    const at = thingAtNow(kit, 'quilt')
    kit.gesture({ type: 'press', at }, page2)
    kit.gesture({ type: 'dragStart', from: at }, page2)
    kit.gesture({ type: 'dragMove', from: at, at: centre(page2.edges[0].rect) }, page2)
    kit.rest()
    kit.gesture({ type: 'dragEnd', from: at, at: centre(page2.edges[0].rect) }, page2)
    expect(thing(arrangementOf(kit.stay), 'quilt')!.at).toBe('cupboard')
    expect(kit.stay.moves).toBe(0)
  })

  it('the grown-up corner is the top right of the screen on every page, the bat upside-down page included', () => {
    const toy = fresh()
    carry(toy, 'bat', middleOf(1)); run(toy, 1)
    tap(toy, bodyOf(toy, 'bat')); run(toy, 1)
    expect(toy.scene(page).view!.from).toBe('bat')
    toy.takeSounds()
    // Top right of the screen: silent, though on the turned page it is the plain page's bottom left.
    toy.gesture({ type: 'press', at: { x: 1180 - 20, y: 20 } }, page)
    expect(toy.takeSounds()).toEqual([])
    expect(toy.scene(page).view!.from).toBe('bat')
    // Bottom left of the screen: the plain page's top right corner, and here it is only paper, which answers.
    toy.gesture({ type: 'press', at: { x: 20, y: 820 - 20 } }, page)
    expect(toy.takeSounds().length).toBeGreaterThan(0)
  })
})

describe('left through a day and a night: each thing answers the hour only when it has something to do', () => {
  const wheelOf = (toy: Play) => { const where = pageFor(toy); return { x: where.wheel.x + where.wheel.w / 2, y: where.wheel.y + where.wheel.h / 2 } }
  /** The notes the wheel's turn sounded after the wheel's own. */
  const after = (toy: Play): number => {
    toy.takeSounds()
    toy.gesture({ type: 'press', at: wheelOf(toy) }, pageFor(toy))
    const [chain] = toy.takeSounds()
    return chain.length - voices.wheelTurns(toy.stay.phase).length
  }

  it('a pipe with nothing passing and a quilt with nothing against it are quiet', () => {
    const toy = begin('full-house/c')
    const where = pageFor(toy)
    // Nobody is in a room yet: the pipe through a wall upstairs, where nothing built into the house reaches with any strength, carries nothing; the quilt on a floor stops nothing.
    carryThing(toy, 'pipe', centre(where.edges.find((edge) => edge.id === '4-5')!.rect)); stepFor(toy, 0.5)
    carryThing(toy, 'quilt', centre(where.edges.find((edge) => edge.id === '1-4')!.rect)); stepFor(toy, 0.5)
    expect(after(toy)).toBe(0)
    // The cook beside the pipe: by day its smell goes through it; at night it sleeps and the pipe is quiet again.
    toRoom(toy, 'cook', 4); stepFor(toy, 1)
    expect(toy.stay.phase).toBe('night')
    expect(after(toy)).toBe(voices.throughTheHour.pipe.length)
    expect(after(toy)).toBe(0)
  })

  it('the stove and the ice box sound at every hour, and a keeper of the alarm clock who will change its hours yawns', () => {
    const toy = begin('full-house/a')
    const where = pageFor(toy)
    carryThing(toy, 'stove', { x: where.rooms[4].rect.x + 100, y: where.rooms[4].rect.y + 60 }); stepFor(toy, 0.5)
    expect(after(toy)).toBe(voices.throughTheHour.stove.length)
    expect(after(toy)).toBe(voices.throughTheHour.stove.length)
    toRoom(toy, 'blob', 3); stepFor(toy, 1)
    carryThing(toy, 'clock', plainBodyOn(toy, 'blob')); stepFor(toy, 0.5)
    expect(after(toy)).toBe(voices.throughTheHour.stove.length + voices.yawn('blob').length)
    // With a guest who will not change its hours, the clock says nothing at the turn.
    toRoom(toy, 'lizard', 0); stepFor(toy, 1)
    carryThing(toy, 'clock', plainBodyOn(toy, 'lizard')); stepFor(toy, 0.5)
    expect(after(toy)).toBe(voices.throughTheHour.stove.length)
  })

  it('the alarm clock by a bed trills at dawn and at dusk and the sleeper there opens an eye at it; on a wall it gives its tock', () => {
    const toy = begin('full-house/a')
    const where = pageFor(toy)
    toRoom(toy, 'blob', 3); stepFor(toy, 1)
    carryThing(toy, 'clock', { x: where.rooms[3].rect.x + 60, y: where.rooms[3].rect.y + 40 }); stepFor(toy, 0.5)
    expect(thing(arrangementOf(toy.stay), 'clock')!.at).toEqual({ room: 3 })
    // To night: the blob is asleep in room 3.
    expect(after(toy)).toBe(voices.clockTrill.length)
    stepFor(toy, 1)
    expect(toy.scene(where).guests.find((guest) => guest.id === 'blob')!.looks).toBeDefined()
    stepFor(toy, 2)
    expect(toy.scene(where).guests.find((guest) => guest.id === 'blob')!.looks).toBeUndefined()
    carryThing(toy, 'clock', centre(where.edges.find((edge) => edge.id === '0-1')!.rect)); stepFor(toy, 0.5)
    expect(after(toy)).toBe(voices.throughTheHour.clock.length)
  })
})

describe("the fly's small buzz is heard only in its own room", () => {
  /** Every sound of a few seconds of the house's own time, as lists of notes. */
  const over = (toy: Play, seconds: number): string[] => {
    toy.takeSounds()
    stepFor(toy, seconds)
    return toy.takeSounds().map((sound) => JSON.stringify(sound))
  }
  const has = (sounds: string[], heard: 'plain' | 'loved' | 'minded' | 'faint') => sounds.includes(JSON.stringify(voices.buzz(heard)))

  it('on the plain page it is a thin whine, from the fly it is its own, and from a room-mate asleep it is a drill', () => {
    const toy = begin('twin-rooms/c')
    const where = pageFor(toy)
    toRoom(toy, 'fly', 0); stepFor(toy, 1)
    expect(has(over(toy, 6), 'plain')).toBe(true)
    // The bat sleeps by day in the same room of two beds.
    toRoom(toy, 'bat', 0); stepFor(toy, 1)
    expect(arrangementOf(toy.stay).guests.filter((guest) => guest.at === 0).map((guest) => guest.id).sort()).toEqual(['bat', 'fly'])
    toy.gesture({ type: 'press', at: plainBodyOn(toy, 'bat') }, where); toy.gesture({ type: 'tap', at: plainBodyOn(toy, 'bat') }, where)
    expect(toy.stay.from).toBe('bat')
    expect(has(over(toy, 6), 'minded')).toBe(true)
    // At night the fly sleeps and there is no buzz at all. (Back to the plain page first: the bat's page is turned half round, so the bat is touched where that page draws it.)
    tapOn(toy, fromPlain(where, toy.scene(where).view ?? null, plainBodyOn(toy, 'bat')))
    expect(toy.stay.from).toBe(null)
    const wheel = pageFor(toy).wheel
    toy.gesture({ type: 'press', at: { x: wheel.x + wheel.w / 2, y: wheel.y + wheel.h / 2 } }, where)
    expect(toy.stay.phase).toBe('night')
    const night = over(toy, 6)
    expect((['plain', 'loved', 'minded', 'faint'] as const).some((heard) => has(night, heard))).toBe(false)
  })
})

describe('every cell of the grid is seen as well as heard', () => {
  const guest = (toy: Play, id: GuestId) => toy.scene(pageFor(toy)).guests.find((one) => one.id === id)!
  const item = (toy: Play, kind: ThingKind) => toy.scene(pageFor(toy)).things.find((one) => one.kind === kind)!
  const thingOf = (toy: Play, kind: ThingKind) => thing(arrangementOf(toy.stay), kind)!.at
  const moments = (toy: Play) => (toy.scene(pageFor(toy)).moments ?? []).filter((one) => one.age >= 0).map((one) => one.kind)
  /** How far a figure is from rest this frame: the breathing of a guest left alone stays well under a tenth. */
  const moved = (body: InkScene['guests'][number]['body']) => (body ? Math.abs(body.sx - 1) + Math.abs(body.sy - 1) + Math.abs(body.rot) + (Math.abs(body.dx) + Math.abs(body.dy)) / 100 : 0)

  it('a guest set down on a wall is drawn at the wall, both neighbours stare, and it pops out into the nearer room', () => {
    // A house whose room 0 has two beds: with the bat lodged there and the blob next door, the wall between them has a neighbour on either side and a free bed on the nearer one.
    const toy = begin('twin-rooms/a')
    const where = pageFor(toy)
    toRoom(toy, 'bat', 0); stepFor(toy, 1)
    toRoom(toy, 'blob', 1); stepFor(toy, 1)
    const wall = where.edges.find((edge) => edge.id === '0-1')!.rect
    // On the wall, a little to the side of room 0.
    carryOn(toy, where, 'troll', { x: wall.x + wall.w * 0.3, y: wall.y + wall.h * 0.6 })
    // It is in the nearer room, and nobody has been moved for it.
    expect(placeOf(arrangementOf(toy.stay), 'troll')).toBe(0)
    expect([placeOf(arrangementOf(toy.stay), 'bat'), placeOf(arrangementOf(toy.stay), 'blob')]).toEqual([0, 1])
    stepFor(toy, 0.2)
    const stuck = guest(toy, 'troll').body!
    const spot = spotsOf(toy.scene(where).guests, where).find((one) => one.guest.id === 'troll')!.spot
    // Its feet are in the wall, and it is pressed thin.
    expect(Math.abs(spot.x + stuck.dx * where.scale - (wall.x + wall.w / 2))).toBeLessThan(6 * where.scale)
    expect(stuck.sx).toBeLessThan(0.75)
    // The neighbour on either side stares at it: toward the wall, each from its own side.
    expect(guest(toy, 'bat').looks).toBe('right')
    expect(guest(toy, 'blob').looks).toBe('left')
    // And then it is out, standing in the nearer room.
    stepFor(toy, 1.2)
    expect(Math.abs(guest(toy, 'troll').body!.dx)).toBeLessThan(3)
    expect(guest(toy, 'troll').place).toEqual({ room: 0 })
  })

  it('the quilt laid on a bed: whoever sleeps there tucks in; tapped, feathers fly and the nearest guest sneezes', () => {
    const toy = begin('quilt/c')
    const where = pageFor(toy)
    // The bat sleeps by day.
    toRoom(toy, 'bat', 3); stepFor(toy, 1.5)
    const still = moved(guest(toy, 'bat').body)
    carryThing(toy, 'quilt', { x: where.rooms[3].rect.x + 80, y: where.rooms[3].rect.y + 60 })
    expect(thing(arrangementOf(toy.stay), 'quilt')!.at).toEqual({ room: 3 })
    stepFor(toy, 0.5)
    expect(moved(guest(toy, 'bat').body)).toBeGreaterThan(still + 0.08)
    stepFor(toy, 1.5)
    tapOn(toy, thingAtNow(toy, 'quilt'))
    expect(moments(toy)).toContain('feathers')
    stepFor(toy, 0.8)
    // The bat is the nearest: it has snapped forward, and the spray is in the air.
    expect(moments(toy)).toContain('sneeze')
    expect(guest(toy, 'bat').body!.rot).toBeGreaterThan(0.05)
    stepFor(toy, 2)
    expect(moments(toy)).toEqual([])
  })

  it('the pipe stood in a corner: a guest leans to it and its breath comes back; tooted, it gives a puff of what passes', () => {
    const toy = begin('tower-and-pipe/a')
    const where = pageFor(toy)
    toRoom(toy, 'cook', 0); stepFor(toy, 1.2)
    // Set down on bare floor, clear of the cook.
    const cookAt = plainBodyOn(toy, 'cook'), floor = where.rooms[0].rect
    carryThing(toy, 'pipe', { x: cookAt.x < floor.x + floor.w / 2 ? floor.x + floor.w - 40 : floor.x + 40, y: floor.y + 24 })
    expect(thing(arrangementOf(toy.stay), 'pipe')!.at).toEqual({ room: 0 })
    expect(toy.takeSounds().some((sound) => JSON.stringify(sound.map((note) => ({ ...note, at: 0 }))) === JSON.stringify(voices.breathBack.map((note) => ({ ...note, at: 0 }))))).toBe(true)
    stepFor(toy, 0.75)
    expect(Math.abs(guest(toy, 'cook').body!.rot)).toBeGreaterThan(0.1)
    expect(moments(toy)).toContain('breath')
    stepFor(toy, 1.5)
    // Standing in a corner it carries nothing: an empty puff.
    tapOn(toy, thingAtNow(toy, 'pipe'))
    expect(toy.scene(where).moments!.find((one) => one.kind === 'puff')!.of).toBe(null)
    stepFor(toy, 1.2)
    // Through the cook's ceiling: its warmth and its smell go up only because the pipe is there, and the puff is of one of them.
    carryThing(toy, 'pipe', centre(where.edges.find((edge) => edge.id === '0-2')!.rect)); stepFor(toy, 0.5)
    tapOn(toy, thingAtNow(toy, 'pipe'))
    expect(['pong', 'warm']).toContain(toy.scene(where).moments!.find((one) => one.kind === 'puff')!.of)
  })

  it('the stove given to a guest: one hugs it, one sits on it and sags; the ice box: one sits in it, one goes over like a plank', () => {
    const toy = begin('stove-and-ice/a')
    toRoom(toy, 'lizard', 0); stepFor(toy, 1)
    toRoom(toy, 'yeti', 1); stepFor(toy, 1)
    const pose = (id: GuestId, kind: ThingKind, after: number) => { carryThing(toy, kind, plainBodyOn(toy, id)); stepFor(toy, after); const body = guest(toy, id).body!; stepFor(toy, 2.4); return body }
    // The lizard hugs the stove: toward it, and no higher off the floor.
    const hug = pose('lizard', 'stove', 0.8)
    expect(Math.abs(hug.dx)).toBeGreaterThan(8)
    expect(Math.abs(hug.dy)).toBeLessThan(4)
    // The yeti sits on it and sags: up onto it, and lower and wider than itself.
    const sag = pose('yeti', 'stove', 1.2)
    expect(sag.dy).toBeLessThan(-12)
    expect([sag.sy < 0.9, sag.sx > 1.08]).toEqual([true, true])
    // The yeti in the ice box as an armchair: up on it, leaning back.
    const chair = pose('yeti', 'ice', 0.9)
    expect(chair.dy).toBeLessThan(-18)
    expect(Math.abs(chair.rot)).toBeGreaterThan(0.08)
    // The lizard, stiff as a plank: narrow, and over on its side.
    const plank = pose('lizard', 'ice', 0.5)
    expect(plank.sx).toBeLessThan(0.88)
    expect(Math.abs(plank.rot)).toBeGreaterThan(0.2)
    // Each is over in a moment and leaves the guest as it was.
    expect(moved(guest(toy, 'lizard').body)).toBeLessThan(0.12)
  })

  it('the one knock of the plank is marked at its head on the page that is drawn: where it falls on the plain page, and enlarged with its room on its own page', () => {
    const knockOn = (own: boolean) => {
      const toy = begin('stove-and-ice/a')
      const where = pageFor(toy)
      toRoom(toy, 'lizard', 0); stepFor(toy, 1)
      // The page is the plain one, or the lizard's own with its room drawn large.
      if (!!toy.scene(where).view !== own) { tapOn(toy, fromPlain(where, toy.scene(where).view ?? null, plainBodyOn(toy, 'lizard'))); stepFor(toy, 1.5) }
      const view = toy.scene(where).view ?? null
      expect(view === null).toBe(!own)
      carryThing(toy, 'ice', fromPlain(where, view, plainBodyOn(toy, 'lizard')))
      // The marks last half a second from the knock itself, and there is the one knock.
      stepFor(toy, 0.6)
      const scene = toy.scene(where)
      const knocks = (scene.knocks ?? []).filter((one) => one.age >= 0)
      expect(knocks.length).toBe(1)
      return { at: { x: knocks[0].x, y: knocks[0].y }, view: scene.view ?? null }
    }
    const plain = knockOn(false), own = knockOn(true)
    expect(plain.view).toBe(null)
    expect(own.view).toMatchObject({ from: 'lizard', room: 0 })
    expect(own.view!.large).not.toBe(false)
    // Its head has tipped over into the wall, at the edge of its room or a little outside: it is still drawn with the room, so the marks go
    // with it. Taken back out of the large room, they are where the head falls on the plain page (to within the figure's own sway).
    const lens = lensOf(page, 0)!
    const back = { x: lens.from.x + (own.at.x - lens.to.x) / lens.scale, y: lens.from.y + (own.at.y - lens.to.y) / lens.scale }
    expect(Math.hypot(back.x - plain.at.x, back.y - plain.at.y)).toBeLessThan(5)
    // The large room moves the head by more than a finger's width of error: untransformed, the marks would hang in the air beside it.
    expect(Math.hypot(own.at.x - plain.at.x, own.at.y - plain.at.y)).toBeGreaterThan(8)
  })

  it('the stove on a wall scorches a patch that fades as it slides into the nearer room, and the ice box frosts one', () => {
    const toy = begin('stove-and-ice/a')
    const where = pageFor(toy)
    const wall = where.edges.find((edge) => edge.id === '0-1')!.rect
    carryThing(toy, 'stove', { x: wall.x + wall.w / 2 - 2, y: wall.y + wall.h * 0.5 })
    expect(thing(arrangementOf(toy.stay), 'stove')!.at).toEqual({ room: 0 })
    stepFor(toy, 0.1)
    expect(moments(toy)).toEqual(['scorch'])
    // Against the wall at first, well away from where it will stand.
    const against = item(toy, 'stove').body!
    expect(Math.abs(against.dx)).toBeGreaterThan(20)
    stepFor(toy, 0.7)
    const sliding = item(toy, 'stove').body!
    expect(Math.abs(sliding.dx)).toBeLessThan(Math.abs(against.dx))
    expect(Math.abs(sliding.dx)).toBeGreaterThan(0)
    stepFor(toy, 1.2)
    expect(item(toy, 'stove').body).toBeUndefined()
    expect(moments(toy)).toEqual([])
    carryThing(toy, 'ice', { x: wall.x + wall.w / 2 + 2, y: wall.y + wall.h * 0.5 })
    expect(thing(arrangementOf(toy.stay), 'ice')!.at).toEqual({ room: 1 })
    stepFor(toy, 0.1)
    expect(moments(toy)).toEqual(['frost'])
  })

  it('the pipe at a guest\'s mouth is blown, and the alarm clock in its hand is wound by one who will change its hours and thumped by one who will not', () => {
    const toy = begin('full-house/b')
    toRoom(toy, 'troll', 0); stepFor(toy, 1)
    toRoom(toy, 'lizard', 1); stepFor(toy, 1.5)
    const widest = (id: GuestId, kind: ThingKind) => {
      carryThing(toy, kind, plainBodyOn(toy, id))
      let most = 0, least = 1, turned = 0
      for (let t = 0; t < 1.4; t += 1 / 60) { toy.step(1 / 60); const body = guest(toy, id).body!; most = Math.max(most, body.sx); least = Math.min(least, body.sy); turned = Math.max(turned, Math.abs(body.rot)) }
      return { most, least, turned }
    }
    // The troll blows the pipe: cheeks out.
    expect(widest('troll', 'pipe').most).toBeGreaterThan(1.1)
    // The troll will change its hours: it winds the clock, rocking.
    expect(thingOf(toy, 'pipe')).toEqual({ guest: 'troll' })
    expect(widest('troll', 'clock').turned).toBeGreaterThan(0.04)
    // The lizard will not: one thump on the bell.
    expect(widest('lizard', 'clock').least).toBeLessThan(0.88)
  })

  it('none of it is saved: the stay after an act is the stay the set-down made', () => {
    const toy = begin('stove-and-ice/a')
    toRoom(toy, 'lizard', 0); stepFor(toy, 1)
    carryThing(toy, 'ice', plainBodyOn(toy, 'lizard'))
    const saved = json(writeStay(toy.stay))
    stepFor(toy, 3)
    expect(json(writeStay(toy.stay))).toEqual(saved)
  })
})

describe('what a scene moves is seen moving', () => {
  const item = (toy: Play, kind: ThingKind) => toy.scene(pageFor(toy)).things.find((one) => one.kind === kind)
  const off = (toy: Play, kind: ThingKind) => { const body = item(toy, kind)?.body; return body ? Math.hypot(body.dx, body.dy) : 0 }
  const until = (toy: Play, left: number) => { while (toy.playing && toy.sceneLeft > left) toy.step(1 / 60) }

  it('sent away: the porter rings, the things go to his trolley, he trundles them to his ladder and they go up to the cupboard', () => {
    const toy = begin('quilt/a')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 1); stepFor(toy, 1)
    carryThing(toy, 'quilt', centre(where.edges.find((edge) => edge.id === '0-1')!.rect)); stepFor(toy, 0.5)
    toy.scene(where)
    carryOn(toy, where, 'lizard', centre(where.coach))
    // In the stay the quilt is in the cupboard at once.
    expect(toy.stay.kit.quilt!.at).toBe('cupboard')
    expect(toy.playing).toBe(true)
    toy.takeSounds()
    stepFor(toy, 0.1)
    // On the page it is still on its wall, a long way from its shelf.
    const far = off(toy, 'quilt')
    expect(far).toBeGreaterThan(200)
    stepFor(toy, FETCH.call + FETCH.hop + 0.1)
    // On the trolley, beside the porter, while he trundles.
    const quilt = item(toy, 'quilt')!, slot = where.slots[0], u = where.scale
    const at = { x: slot.x + slot.w / 2 + quilt.body!.dx * u, y: slot.y + slot.h + quilt.body!.dy * u }
    expect(at.x).toBeGreaterThan(where.porter.x)
    expect(at.x).toBeLessThan(where.porter.x + where.porter.w)
    expect(at.y).toBeGreaterThan(where.porter.y)
    expect(Math.abs(toy.scene(where).porterAt!.dx)).toBeGreaterThan(PORTER_REACH / 2)
    expect(toy.takeSounds()).toEqual(expect.arrayContaining([voices.bell, voices.porterTrundles]))
    stepFor(toy, FETCH.trundle + FETCH.stow + 0.1)
    expect(off(toy, 'quilt')).toBe(0)
    stepFor(toy, 6)
    expect(toy.playing).toBe(false)
  })

  it('a touch ends it with the things already on their shelves', () => {
    const toy = begin('quilt/a')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 1); stepFor(toy, 1)
    carryThing(toy, 'quilt', centre(where.edges.find((edge) => edge.id === '0-1')!.rect)); stepFor(toy, 0.5)
    toy.scene(where)
    carryOn(toy, where, 'lizard', centre(where.coach))
    stepFor(toy, 0.6)
    expect(off(toy, 'quilt')).toBeGreaterThan(50)
    toy.gesture({ type: 'press', at: { x: 20, y: where.height - 20 } }, where)
    expect(off(toy, 'quilt')).toBe(0)
    expect(toy.scene(where).porterAt).toEqual({ dx: 0, dy: 0 })
  })

  it('the coach changes over: a thing the new coach-load has no use for is still seen going back, and is put away', () => {
    const toy = begin('quilt/a')
    const where = pageFor(toy)
    // The neat way of this cast, so the porter has nothing to show.
    carryThing(toy, 'quilt', centre(where.edges.find((edge) => edge.id === '0-1')!.rect)); stepFor(toy, 0.5)
    toRoom(toy, 'troll', 1); stepFor(toy, 1)
    toRoom(toy, 'lizard', 0); stepFor(toy, 1)
    toRoom(toy, 'yeti', 2)
    expect(toy.stay.finished).toBe(true)
    stepFor(toy, 12)
    expect(toy.playing).toBe(false)
    toy.scene(where)
    toy.gesture({ type: 'press', at: centre(where.coach) }, where)
    expect(toy.playing).toBe(true)
    const then = pageFor(toy)
    stepFor(toy, 0.2)
    // Whatever the new kit holds, the quilt is on the page, on its way from the wall.
    expect(toy.scene(then).things.some((one) => one.kind === 'quilt' && one.body && Math.hypot(one.body.dx, one.body.dy) > 100)).toBe(true)
    stepFor(toy, 10)
    expect(toy.playing).toBe(false)
    expect(toy.scene(then).things.map((one) => one.kind).sort()).toEqual(Object.keys(toy.stay.kit).sort())
    for (const one of toy.scene(then).things) expect(one.body).toBeUndefined()
  })

  it('the neat way is carried out: the thing the porter uses goes from the cupboard to its place, and back again', () => {
    const toy = begin('quilt/a')
    // Settled the child's own way, with the troll upstairs and the quilt left in the cupboard.
    toRoom(toy, 'troll', 3); stepFor(toy, 1)
    toRoom(toy, 'lizard', 0); stepFor(toy, 1)
    toRoom(toy, 'yeti', 2)
    expect(toy.stay.finished).toBe(true)
    const neat = NEAT.in + NEAT.move + NEAT.hold + NEAT.move + NEAT.out
    // A moment after he has come in: the page has the quilt on the wall, and it is still on its way there from its shelf.
    until(toy, neat - NEAT.in - 0.15)
    expect(toy.stay.shown).toEqual(['quilt'])
    expect(item(toy, 'quilt')!.at).toEqual({ edge: '0-1' })
    expect(off(toy, 'quilt')).toBeGreaterThan(100)
    until(toy, neat - NEAT.in - NEAT.move - 0.2)
    expect(off(toy, 'quilt')).toBe(0)
    // He puts it back: it leaves the wall for its shelf.
    until(toy, NEAT.move + NEAT.out - 0.15)
    expect(item(toy, 'quilt')!.at).toBe('cupboard')
    expect(off(toy, 'quilt')).toBeGreaterThan(100)
    until(toy, NEAT.out - 0.2)
    expect(off(toy, 'quilt')).toBe(0)
    stepFor(toy, 3)
    expect(toy.stay.kit.quilt!.at).toBe('cupboard')
  })

  it('the sauna: the yeti goes over to the stove and melts on it, steam puffs off it on the beat and the stove hops', () => {
    const toy = begin('stove-and-ice/a')
    const where = pageFor(toy)
    toRoom(toy, 'yeti', 4); stepFor(toy, 1)
    carryThing(toy, 'stove', { x: where.rooms[4].rect.x + 100, y: where.rooms[4].rect.y + 60 }); stepFor(toy, 1.5)
    tapOn(toy, thingAtNow(toy, 'stove')); stepFor(toy, 0.2)
    tapOn(toy, thingAtNow(toy, 'stove'))
    expect(toy.playing).toBe(true)
    toy.takeSounds()
    let puffs = 0, hopped = 0, lowest = 1, reached = 0
    while (toy.playing) {
      toy.step(1 / 60)
      const scene = toy.scene(where)
      puffs = Math.max(puffs, (scene.moments ?? []).filter((one) => one.kind === 'puff' && one.of === 'warm').length)
      hopped = Math.max(hopped, -(scene.things.find((one) => one.kind === 'stove')!.body?.dy ?? 0))
      const yeti = scene.guests.find((guest) => guest.id === 'yeti')!.body!
      lowest = Math.min(lowest, yeti.sy)
      reached = Math.max(reached, Math.abs(yeti.dx))
    }
    expect(puffs).toBeGreaterThanOrEqual(2)
    expect(hopped).toBeGreaterThan(3)
    expect(lowest).toBeLessThan(0.6)
    expect(reached).toBeGreaterThan(10)
    expect(toy.takeSounds().filter((sound) => sound === voices.saunaPuff).length).toBe(PAIR_BEATS - 2)
    // And up again as if nothing had happened.
    stepFor(toy, 0.5)
    expect(toy.scene(where).guests.find((guest) => guest.id === 'yeti')!.body!.sy).toBeGreaterThan(0.9)
  })

  it('the duet: the wall between the two takes a knock on each beat, both lamps swing, and the two bow to the wall', () => {
    const toy = begin('listener/b')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 1); stepFor(toy, 1)
    toRoom(toy, 'singer', 2); stepFor(toy, 1)
    expect(toy.playing).toBe(false)
    const wheel = where.wheel
    toy.gesture({ type: 'press', at: { x: wheel.x + wheel.w / 2, y: wheel.y + wheel.h / 2 } }, where)
    expect(toy.playing).toBe(true)
    const wall = where.edges.find((edge) => edge.id === '1-2')!.rect
    let knocks = 0, lamps = 0, bow = 0
    while (toy.playing) {
      toy.step(1 / 60)
      const scene = toy.scene(where)
      knocks = Math.max(knocks, (scene.knocks ?? []).filter((one) => Math.abs(one.x - (wall.x + wall.w / 2)) < 2).length)
      lamps = Math.max(lamps, scene.lamps!.length)
      if (toy.sceneLeft < 0.9 && toy.sceneLeft > 0.5) bow = Math.max(bow, Math.abs(scene.guests.find((guest) => guest.id === 'troll')!.body!.rot))
    }
    expect(knocks).toBeGreaterThanOrEqual(1)
    expect(lamps).toBe(2)
    expect(bow).toBeGreaterThan(0.1)
  })
})

describe('a love is heard as well as seen', () => {
  const flat = (sound: readonly { at: number }[]) => JSON.stringify(sound.map((note) => ({ ...note, at: 0 })))
  const hums = (toy: Play, seconds: number, heard: 'plain' | 'loved') => {
    toy.takeSounds()
    stepFor(toy, seconds)
    const all = toy.takeSounds().map((sound) => JSON.stringify(sound))
    return voices.TUBA_TUNE.some((_, step) => { const hum = voices.hum(step, heard); return hum !== null && all.includes(JSON.stringify(hum)) })
  }

  it('the cook hums along to the tuba for as long as it reaches it: on the plain page and from its own place, and from nobody else\'s', () => {
    const toy = begin('alarm-clock/b')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 0); stepFor(toy, 1)
    toRoom(toy, 'cook', 1); stepFor(toy, 1)
    // By day the troll sleeps: no hum.
    expect(hums(toy, 6, 'plain')).toBe(false)
    // With the alarm clock the troll plays by day, next door to the cook.
    carryThing(toy, 'clock', plainBodyOn(toy, 'troll')); stepFor(toy, 1.5)
    expect(toy.scene(where).guests.find((guest) => guest.id === 'cook')!.mood).toBe('happier')
    expect(hums(toy, 6, 'plain')).toBe(true)
    tapOn(toy, plainBodyOn(toy, 'cook'))
    expect(toy.stay.from).toBe('cook')
    expect(hums(toy, 6, 'loved')).toBe(true)
    expect(hums(toy, 6, 'plain')).toBe(false)
  })

  it('the blob wrapped in the quilt lets out a long sigh, is drawn happier, and no other guest sighs', () => {
    const toy = begin('corridor/b')
    toRoom(toy, 'blob', 4); stepFor(toy, 1)
    toRoom(toy, 'troll', 2); stepFor(toy, 1); toy.takeSounds()
    carryThing(toy, 'quilt', plainBodyOn(toy, 'blob'))
    const wrapped = toy.takeSounds()
    expect(wrapped.some((sound) => flat(sound) === flat(voices.sigh('blob')))).toBe(true)
    const blob = toy.scene(pageFor(toy)).guests.find((guest) => guest.id === 'blob')!
    expect([blob.wrapped, blob.mood]).toEqual([true, 'happier'])
    stepFor(toy, 1)
    carryThing(toy, 'quilt', plainBodyOn(toy, 'troll'))
    expect(toy.takeSounds().some((sound) => flat(sound) === flat(voices.sigh('troll')))).toBe(false)
  })
})

describe('the door a guest asked for, beside the room it was given', () => {
  const glance = (toy: Play, id: GuestId) => toy.scene(pageFor(toy)).guests.find((guest) => guest.id === id)!.glancesAt

  it('given another room than the one it asked for, a guest glances once at the door it wanted; given that room, it does not', () => {
    const toy = begin('two-guests/c')
    const asked = demandOf(arrangementOf(toy.stay).house, 'troll')
    toRoom(toy, 'troll', asked === 0 ? 1 : 0)
    stepFor(toy, SWEEP_SECONDS + 0.2)
    expect(glance(toy, 'troll')).toBe(asked)
    stepFor(toy, GLANCE_SECONDS + 0.2)
    expect(glance(toy, 'troll')).toBeUndefined()
    toRoom(toy, 'bat', demandOf(arrangementOf(toy.stay).house, 'bat'))
    stepFor(toy, SWEEP_SECONDS + 0.2)
    expect(glance(toy, 'bat')).toBeUndefined()
  })

  it('as the settled day begins, every guest content in a room it did not ask for glances at the door it had asked for', () => {
    const toy = begin('two-guests/b')
    const house = arrangementOf(toy.stay).house
    const rooms = { troll: 0, blob: 3 } as const
    toRoom(toy, 'troll', rooms.troll); stepFor(toy, 2.5)
    toRoom(toy, 'blob', rooms.blob)
    expect(toy.stay.finished).toBe(true)
    stepFor(toy, 0.6)
    for (const id of ['troll', 'blob'] as const) expect(glance(toy, id), id).toBe(rooms[id] === demandOf(house, id) ? undefined : demandOf(house, id))
    // At least one of the two is content somewhere it did not ask for: that is what the house shows.
    expect((['troll', 'blob'] as const).some((id) => glance(toy, id) !== undefined)).toBe(true)
    stepFor(toy, GLANCE_SECONDS + 0.5)
    for (const id of ['troll', 'blob'] as const) expect(glance(toy, id)).toBeUndefined()
  })
})

describe('nothing given is refused or only heard', () => {
  it('a thing given to a guest with no room is seen in its hand and then on its way back to its shelf by the porter', () => {
    const toy = begin('quilt/a')
    const where = pageFor(toy), u = where.scale
    const lizard = spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, where).find((one) => one.guest.id === 'lizard')!
    carryThing(toy, 'quilt', plainBodyOn(toy, 'lizard'))
    expect(toy.stay.kit.quilt!.at).toBe('cupboard')
    expect(toy.takeSounds()).toContainEqual(voices.handedBack)
    const at = () => { const quilt = toy.scene(where).things.find((one) => one.kind === 'quilt')!, slot = where.slots[0]; return quilt.body ? { x: slot.x + slot.w / 2 + quilt.body.dx * u, y: slot.y + slot.h + quilt.body.dy * u } : null }
    stepFor(toy, 0.2)
    // Held: at the lizard, in the lobby.
    expect(Math.abs(at()!.x - lizard.spot.x)).toBeLessThan(30 * u)
    expect(at()!.y).toBeGreaterThan(where.lobby.y)
    stepFor(toy, HELD_SECONDS + 0.4)
    // On its way: it has left the lizard for the porter's end of the lobby.
    expect(at()!.x).toBeLessThan(lizard.spot.x - 20 * u)
    stepFor(toy, 1.5)
    expect(at()).toBe(null)
  })

  it('on the porter\'s trolley a thing goes where the trolley goes', () => {
    const toy = begin('quilt/a')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 1); stepFor(toy, 1)
    carryThing(toy, 'quilt', centre(where.edges.find((edge) => edge.id === '0-1')!.rect)); stepFor(toy, 0.5)
    toy.scene(where)
    carryOn(toy, where, 'lizard', centre(where.coach))
    const dx = () => toy.scene(where).things.find((one) => one.kind === 'quilt')!.body!.dx
    stepFor(toy, FETCH.call + FETCH.hop + 0.02)
    const onTrolley = dx(), porterWas = toy.scene(where).porterAt!.dx
    stepFor(toy, FETCH.trundle / 2)
    // Well into his trundle he is most of the way to the wall, and what is on his trolley has gone exactly as far.
    const gone = toy.scene(where).porterAt!.dx - porterWas
    expect(gone).toBeLessThan(-PORTER_REACH / 2)
    expect(dx() - onTrolley).toBeCloseTo(gone, 3)
  })
})

describe('what a guest asked for is seen beside what it has been given', () => {
  const glance = (toy: Play, id: GuestId) => toy.scene(pageFor(toy)).guests.find((one) => one.id === id)!.glancesAt ?? null

  it('opening the page of a guest in a room it did not ask for rings the room it asked for, for as long as the page is open, and it glances at that door again', () => {
    const toy = begin('two-guests/a')
    const where = pageFor(toy)
    const asked = demandOf(arrangementOf(toy.stay).house, 'troll')!
    const other = asked === 0 ? 1 : 0
    toRoom(toy, 'troll', other)
    // The first glance, at being given another room, is over, and the page is the plain one again.
    stepFor(toy, SWEEP_SECONDS + GLANCE_SECONDS + 0.5)
    if (toy.scene(where).view) { tapOn(toy, { x: where.lobby.x + where.lobby.w * 0.1, y: where.plate.y + 30 }); stepFor(toy, SWEEP_SECONDS + 0.2) }
    expect(toy.scene(where).view ?? null).toBe(null)
    expect(toy.scene(where).asked ?? null).toBe(null)
    expect(glance(toy, 'troll')).toBe(null)
    // Its page is opened: the room it asked for is ringed at once, and once the page has turned it glances at that door.
    tapOn(toy, plainBodyOn(toy, 'troll'))
    expect(toy.scene(where).asked).toBe(asked)
    stepFor(toy, SWEEP_SECONDS + 0.1)
    expect(glance(toy, 'troll')).toBe(asked)
    // The glance is long enough to be seen, and ends; the ring stays.
    expect(GLANCE_SECONDS).toBeGreaterThanOrEqual(2.5)
    stepFor(toy, GLANCE_SECONDS)
    expect(glance(toy, 'troll')).toBe(null)
    expect(toy.scene(where).asked).toBe(asked)
    stepFor(toy, 20)
    expect(toy.scene(where).asked).toBe(asked)
    // The page is turned back: no ring.
    tapOn(toy, fromPlain(where, toy.scene(where).view ?? null, plainBodyOn(toy, 'troll')))
    stepFor(toy, SWEEP_SECONDS + 0.1)
    expect(toy.scene(where).asked ?? null).toBe(null)
  })

  it('a guest in the room it asked for has nothing ringed and does not glance, and a guest with no room yet is shown the room it asks for as before', () => {
    const toy = begin('two-guests/a')
    const where = pageFor(toy)
    const asked = demandOf(arrangementOf(toy.stay).house, 'troll')!
    toRoom(toy, 'troll', asked)
    stepFor(toy, SWEEP_SECONDS + GLANCE_SECONDS + 0.5)
    if (!toy.scene(where).view) { tapOn(toy, plainBodyOn(toy, 'troll')); stepFor(toy, SWEEP_SECONDS + 0.1) }
    expect(toy.scene(where).view).toMatchObject({ from: 'troll', room: asked })
    expect(toy.scene(where).asked ?? null).toBe(null)
    expect(glance(toy, 'troll')).toBe(null)
    const fresh = begin('two-guests/a')
    tapOn(fresh, plainBodyOn(fresh, 'bat'))
    expect(fresh.scene(where).view).toEqual({ from: 'bat', room: demandOf(arrangementOf(fresh.stay).house, 'bat'), large: false })
    expect(fresh.scene(where).asked ?? null).toBe(null)
  })
})

describe('what is put somewhere is seen to land there', () => {
  /** The furthest a figure got from rest over some seconds, by each of its numbers. */
  const most = (toy: Play, seconds: number, pick: (scene: InkScene) => InkScene['guests'][number]['body']) => {
    const out = { up: 0, lean: 0, thin: 1, flat: 1, aside: 0 }
    for (let t = 0; t < seconds; t += 1 / 60) {
      toy.step(1 / 60)
      const body = pick(toy.scene(pageFor(toy)))
      if (!body) continue
      out.up = Math.max(out.up, -body.dy); out.lean = Math.max(out.lean, Math.abs(body.rot)); out.thin = Math.min(out.thin, body.sx); out.flat = Math.min(out.flat, body.sy); out.aside = Math.max(out.aside, Math.abs(body.dx))
    }
    return out
  }
  const guestBody = (id: GuestId) => (scene: InkScene) => scene.guests.find((guest) => guest.id === id)!.body
  const thingBody = (kind: ThingKind) => (scene: InkScene) => scene.things.find((one) => one.kind === kind)!.body

  it('a guest set down in a room tests the bed, bouncing, with its bag landed at its feet; one that shares a room sets its room-mate bouncing too', () => {
    const toy = begin('twin-rooms/c')
    toRoom(toy, 'bat', 0)
    toy.step(1 / 60)
    // The bag thuds down with it, and is put away when the bed has been tested.
    expect(toy.scene(pageFor(toy)).guests.find((guest) => guest.id === 'bat')!.unpacks).toBe(true)
    stepFor(toy, 1.2)
    expect(toy.scene(pageFor(toy)).guests.find((guest) => guest.id === 'bat')!.unpacks).toBeUndefined()
    toRoom(toy, 'bat', 1); stepFor(toy, 0.02)
    expect(most(toy, 1.1, guestBody('bat')).up).toBeGreaterThan(6)
    stepFor(toy, 1.2)
    toRoom(toy, 'bat', 0); stepFor(toy, 1.2)
    toRoom(toy, 'blob', 0)
    expect(arrangementOf(toy.stay).guests.filter((guest) => guest.at === 0).length).toBe(2)
    expect(most(toy, 1.2, guestBody('blob')).up).toBeGreaterThan(6)
  })

  it('each thing has its own small move where it is put: the quilt pressed on, the pipe wobbling, the stove jumping, the ice box sloshing, the clock swinging and ringing', () => {
    const toy = begin('full-house/c')
    const where = pageFor(toy)
    const edge = (id: string) => centre(where.edges.find((one) => one.id === id)!.rect)
    const floor = (room: number) => ({ x: where.rooms[room].rect.x + where.rooms[room].rect.w / 2, y: where.rooms[room].rect.y + 30 })
    carryThing(toy, 'quilt', edge('0-1'))
    expect(most(toy, 0.7, thingBody('quilt')).thin).toBeLessThan(0.96)
    carryThing(toy, 'pipe', floor(2))
    expect(most(toy, 1.1, thingBody('pipe')).lean).toBeGreaterThan(0.08)
    carryThing(toy, 'ice', floor(4))
    expect(most(toy, 1.1, thingBody('ice')).aside).toBeGreaterThan(2)
    carryThing(toy, 'pipe', edge('1-4'))
    expect(most(toy, 0.8, thingBody('pipe')).lean).toBeGreaterThan(0.15)
    carryThing(toy, 'quilt', floor(5))
    expect(most(toy, 0.7, thingBody('quilt')).flat).toBeLessThan(0.85)
  })

  it('the alarm clock: ticking by a bed, swinging on a wall, shaking when rung; and its keeper yawns at the turn of the wheel', () => {
    const toy = begin('alarm-clock/a')
    const where = pageFor(toy)
    carryThing(toy, 'clock', { x: where.rooms[4].rect.x + where.rooms[4].rect.w / 2, y: where.rooms[4].rect.y + 30 })
    expect(most(toy, 0.8, thingBody('clock')).lean).toBeGreaterThan(0.04)
    carryThing(toy, 'clock', centre(where.edges.find((one) => one.id === '3-4')!.rect))
    expect(most(toy, 1.3, thingBody('clock')).lean).toBeGreaterThan(0.15)
    tapOn(toy, thingAtNow(toy, 'clock'))
    expect(most(toy, 0.7, thingBody('clock')).aside).toBeGreaterThan(0.5)
    // The troll will change its hours: with the clock in its hand it yawns when the wheel is turned.
    toRoom(toy, 'troll', 0); stepFor(toy, 1.2)
    carryThing(toy, 'clock', plainBodyOn(toy, 'troll')); stepFor(toy, 1.5)
    const wheel = where.wheel
    toy.gesture({ type: 'press', at: { x: wheel.x + wheel.w / 2, y: wheel.y + wheel.h / 2 } }, where)
    stepFor(toy, 0.7)
    expect(most(toy, 1.4, guestBody('troll')).up).toBeGreaterThan(1)
  })
})

describe('awake and content, a guest is heard at its one thing', () => {
  it('the cook\'s stew plops while it stews by day, and not at night or while it is cross', () => {
    const toy = begin('corridor/a')
    const heard = (seconds: number) => { toy.takeSounds(); stepFor(toy, seconds); const all = toy.takeSounds().map((sound) => JSON.stringify(sound)); return [0, 1].some((nth) => all.includes(JSON.stringify(voices.atItsThing('cook', nth, 'plain')))) }
    toRoom(toy, 'cook', 0); stepFor(toy, 1)
    expect(toy.scene(pageFor(toy)).guests.find((guest) => guest.id === 'cook')!.mood).not.toBe('cross')
    expect(heard(12)).toBe(true)
    const where = pageFor(toy)
    toy.gesture({ type: 'press', at: { x: where.wheel.x + where.wheel.w / 2, y: where.wheel.y + where.wheel.h / 2 } }, where)
    expect(heard(12)).toBe(false)
  })
})

describe('the neat way is shown at the hour it has somebody happier', () => {
  it('left at night, a neat way whose delight is by day is shown by day, as a view, and the page comes back to the night', () => {
    const cast = castById('tower-and-pipe/a')!
    // The neat way without its pipe, one guest short, at night: the last guest settles it, and the porter has the pipe to show.
    const neat = neatOf(cast)
    const stay = { ...withCast({ ...freshStay(null), position: cast.position }, cast), phase: 'night' as const, at: { ...Object.fromEntries(neat.guests.map((guest) => [guest.id, guest.at])), lizard: 'lobby' as const } }
    const toy = new Play(stay, 1)
    const where = pageFor(toy)
    toy.scene(where)
    toRoom(toy, 'lizard', 0)
    expect(toy.stay.finished).toBe(true)
    expect(toy.playing).toBe(true)
    const whole = NEAT.in + NEAT.move + NEAT.hold + NEAT.move + NEAT.out
    while (toy.playing && toy.sceneLeft > whole - NEAT.in - NEAT.move - 0.5) toy.step(1 / 60)
    // The held moment: his arrangement, by day, with the fly leaning into the smell the pipe brings it.
    const held = toy.scene(where)
    expect(held.phase).toBe('day')
    expect(held.things.find((item) => item.kind === 'pipe')!.at).toEqual({ edge: '2-4' })
    expect(held.guests.find((guest) => guest.id === 'fly')!.mood).toBe('happier')
    // Nothing of it is saved, and the page comes back to the night the child left.
    expect(toy.stay.phase).toBe('night')
    while (toy.playing) toy.step(1 / 60)
    expect(toy.scene(where).phase).toBe('night')
    expect(toy.stay.kit.pipe!.at).toBe('cupboard')
  })
})

describe('changing places, both are seen to walk', () => {
  it('the guest set down on another walks in from the door while the other walks out by it', () => {
    const toy = begin('two-guests/c')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 0); stepFor(toy, 1.5)
    carryOn(toy, where, 'bat', plainBodyOn(toy, 'troll'))
    expect([placeOf(arrangementOf(toy.stay), 'bat'), placeOf(arrangementOf(toy.stay), 'troll')]).toEqual([0, 'lobby'])
    toy.scene(where)
    stepFor(toy, 0.1)
    const scene = toy.scene(where), u = where.scale
    const bat = scene.guests.find((guest) => guest.id === 'bat')!.body!, troll = scene.guests.find((guest) => guest.id === 'troll')!.body!
    // Both are on the move: the bat a step in from the door of the room, which is beside where it will stand, and the troll on its way out by it.
    expect(Math.hypot(bat.dx, bat.dy) * u).toBeGreaterThan(4)
    expect(Math.hypot(troll.dx, troll.dy) * u).toBeGreaterThan(4)
    stepFor(toy, 1)
    const after = toy.scene(where)
    expect(Math.abs(after.guests.find((guest) => guest.id === 'bat')!.body!.dx)).toBeLessThan(3)
  })
})

describe('the coach changes over to a house of another shape', () => {
  it('every walk is laid out on the new house: the old guests are seen only from its front door on, and the new ones end in their places', () => {
    // A judged house at the third place, whose next coach-load is of the fourth: the square house gives way to the long one.
    const cast = castById('quilt/a')!, neat = neatOf(cast)
    const judged = { ...withCast({ ...freshStay(null), position: 'corridor' }, cast), at: Object.fromEntries([...neat.guests.map((guest) => [guest.id, guest.at]), [cast.bench, 'bench']]), finished: true }
    const toy = new Play(judged as ReturnType<typeof freshStay>, 1)
    const old = pageFor(toy)
    toy.scene(old)
    toy.gesture({ type: 'press', at: centre(old.coach) }, old)
    expect(toy.playing).toBe(true)
    const next = pageFor(toy)
    expect(next.shape).not.toBe(old.shape)
    const u = next.scale, street = next.lobby.y + next.lobby.h
    const leavers = neat.guests.map((guest) => guest.id)
    let seen = 0
    while (toy.playing) {
      toy.step(1 / 60)
      const scene = toy.scene(next)
      const spots = spotsOf(scene.guests, next)
      for (const { guest, spot } of spots) {
        if (!leavers.includes(guest.id) || !guest.body) continue
        seen++
        // A leaver is on the street side of the new house's front door, at or below the lobby floor: never up in a room.
        const at = { x: spot.x + guest.body.dx * u, y: spot.y + guest.body.dy * u }
        expect(at.y, guest.id).toBeGreaterThan(street - 12 * u)
        expect(at.x, guest.id).toBeGreaterThan(next.lobby.x)
      }
    }
    expect(seen).toBeGreaterThan(30)
    for (const guest of toy.scene(next).guests) expect(Math.abs(guest.body!.dx) + Math.abs(guest.body!.dy)).toBeLessThan(8)
  })
})

describe('what the quilt and the pipe do to what is heard', () => {
  const sounds = (toy: Play, seconds: number) => { toy.takeSounds(); stepFor(toy, seconds); return toy.takeSounds().map((sound) => JSON.stringify(sound)) }

  it('a guest rolled in the quilt makes no noise at all: the wrapped blob neither snores by night nor plumps its pillow by day', () => {
    const toy = begin('corridor/b')
    toRoom(toy, 'blob', 4); stepFor(toy, 1)
    const plumps = (all: string[]) => [0, 1].some((nth) => all.includes(JSON.stringify(voices.atItsThing('blob', nth, 'plain'))))
    const snores = (all: string[]) => all.some((sound) => [0, 1, 2, 3, 4, 5, 6, 7, 8].some((nth) => sound === JSON.stringify(voices.snore('blob', nth, 'plain'))))
    expect(plumps(sounds(toy, 24))).toBe(true)
    carryThing(toy, 'quilt', plainBodyOn(toy, 'blob')); stepFor(toy, 2)
    expect(plumps(sounds(toy, 24))).toBe(false)
    const where = pageFor(toy)
    toy.gesture({ type: 'press', at: { x: where.wheel.x + where.wheel.w / 2, y: where.wheel.y + where.wheel.h / 2 } }, where)
    expect(toy.stay.phase).toBe('night')
    expect(snores(sounds(toy, 24))).toBe(false)
  })

  it('the pipe at the fly\'s mouth carries its buzz a room further, and from the place of the sleeper it reaches there it is heard as that sleeper takes it', () => {
    const toy = begin('full-house/c')
    toRoom(toy, 'fly', 1); stepFor(toy, 1)
    toRoom(toy, 'bat', 4); stepFor(toy, 1)
    const minded = JSON.stringify(voices.buzz('minded'))
    tapOn(toy, plainBodyOn(toy, 'bat'))
    expect(toy.stay.from).toBe('bat')
    // In its own room only: from the bat's place upstairs nothing is heard of it.
    expect(sounds(toy, 6)).not.toContain(minded)
    tapOn(toy, fromPlain(pageFor(toy), toy.scene(pageFor(toy)).view ?? null, plainBodyOn(toy, 'bat')))
    expect(toy.stay.from).toBe(null)
    carryThing(toy, 'pipe', plainBodyOn(toy, 'fly')); stepFor(toy, 1.5)
    tapOn(toy, plainBodyOn(toy, 'bat'))
    expect(toy.stay.from).toBe('bat')
    expect(sounds(toy, 6)).toContain(minded)
  })
})

describe('a touch always draws something', () => {
  it('bare paper creases under the finger, on the plain page too', () => {
    const toy = fresh()
    // Clear of the tree, which is the crows' and no bare paper.
    const sky = { x: page.width * 0.5, y: page.plate.y + 30 }
    toy.gesture({ type: 'press', at: sky }, page)
    const moments = toy.scene(page).moments ?? []
    expect(moments.map((one) => one.kind)).toEqual(['rustle'])
    expect([Math.round(moments[0].x), Math.round(moments[0].y)]).toEqual([Math.round(sky.x), Math.round(sky.y)])
    run(toy, 1)
    expect(toy.scene(page).moments).toEqual([])
  })
})

describe('the porter\'s way on a guest\'s page', () => {
  it('is drawn from where that guest stands in his house, and again from where the child put it once he has put things back', () => {
    const cast = castById('alarm-clock/a')!, neat = neatOf(cast), start = startOf(cast)
    // A house settled another way than his, with the clock in a guest's hand and one guest in another room than his way gives it.
    let mine: { rooms: Record<string, number>; holder: GuestId; who: GuestId } | null = null
    for (const rooms of roomings(cast, cast.guests)) {
      for (const holder of cast.guests) {
        const house = { ...start, guests: start.guests.map((guest) => ({ id: guest.id, at: rooms[guest.id] ?? guest.at })), things: start.things.map((item) => ({ ...item, at: { guest: holder } })) }
        const who = cast.guests.find((id) => rooms[id] !== placeOf(neat, id))
        const bare = { ...house, things: start.things }
        if (!mine && who && settled(house) && !settled(bare)) mine = { rooms, holder, who }
      }
    }
    expect(mine).not.toBe(null)
    const { rooms, holder, who } = mine!
    // The clock still in the cupboard, and the page left on that guest: giving the clock settles the house without leaving its page.
    const toy = new Play({ ...withCast({ ...freshStay(null), position: cast.position }, cast), at: { ...rooms, [cast.bench]: 'bench' }, from: who }, 1)
    const where = pageFor(toy)
    expect(toy.scene(where).view!.room).toBe(rooms[who])
    const scene = toy.scene(where), holderSpot = spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, where).find((one) => one.guest.id === holder)!
    const clockAt = fromPlain(where, scene.view ?? null, centre(thingBox({ kind: 'clock', at: 'cupboard' }, where, [])!)), to = fromPlain(where, scene.view ?? null, centre(bodyBox(holderSpot.spot, where)))
    toy.gesture({ type: 'press', at: clockAt }, where)
    toy.gesture({ type: 'dragStart', from: clockAt }, where)
    toy.gesture({ type: 'dragMove', from: clockAt, at: to }, where)
    toy.gesture({ type: 'dragEnd', from: clockAt, at: to }, where)
    expect([toy.stay.finished, toy.stay.from, toy.playing]).toEqual([true, who, true])
    const whole = NEAT.in + NEAT.move + NEAT.hold + NEAT.move + NEAT.out
    while (toy.playing && toy.sceneLeft > whole - NEAT.in - NEAT.move - 0.5) toy.step(1 / 60)
    // His held moment: the page is that guest's still, and its room is the one his way gives it.
    const held = toy.scene(where)
    expect(held.view!.from).toBe(who)
    expect(held.view!.room).toBe(placeOf(neat, who))
    while (toy.playing) toy.step(1 / 60)
    expect(toy.scene(where).view!.room).toBe(rooms[who])
    expect(toy.stay.from).toBe(who)
  })
})

describe('whoever sleeps where the quilt lies tucks in', () => {
  const body = (toy: Play, id: GuestId) => toy.scene(pageFor(toy)).guests.find((guest) => guest.id === id)!.body!
  /** The most a guest's figure sank and widened over some seconds: a tuck is lower and wider than its breathing. */
  const tucked = (toy: Play, id: GuestId, seconds: number) => { let most = 0; for (let t = 0; t < seconds; t += 1 / 60) { toy.step(1 / 60); const b = body(toy, id); most = Math.max(most, (b.sx - 1) + (1 - b.sy)) } return most }

  it('a lodger who falls asleep at a turn of the wheel with the quilt on its bed, and a sleeper set down there', () => {
    const toy = begin('quilt/c')
    const where = pageFor(toy)
    // The lizard is up by day. The quilt is laid on its bed: nothing to tuck yet.
    toRoom(toy, 'lizard', 0); stepFor(toy, 1.5)
    carryThing(toy, 'quilt', { x: where.rooms[0].rect.x + where.rooms[0].rect.w - 60, y: where.rooms[0].rect.y + 40 })
    expect(thing(arrangementOf(toy.stay), 'quilt')!.at).toEqual({ room: 0 })
    const awake = tucked(toy, 'lizard', 1.5)
    // The wheel is turned: the lizard sleeps, and tucks in.
    toy.gesture({ type: 'press', at: { x: where.wheel.x + where.wheel.w / 2, y: where.wheel.y + where.wheel.h / 2 } }, where)
    expect(tucked(toy, 'lizard', 2.5)).toBeGreaterThan(awake + 0.08)
    // The bat, asleep by day, set down in the room where the quilt lies: it tests the bed, and then tucks in.
    toy.gesture({ type: 'press', at: { x: where.wheel.x + where.wheel.w / 2, y: where.wheel.y + where.wheel.h / 2 } }, where)
    stepFor(toy, 2)
    carryThing(toy, 'quilt', { x: where.rooms[3].rect.x + 60, y: where.rooms[3].rect.y + 40 }); stepFor(toy, 1)
    toRoom(toy, 'bat', 3)
    stepFor(toy, 1.2)
    expect(tucked(toy, 'bat', 1.4)).toBeGreaterThan(0.1)
  })
})

describe('a lodger in the hand has left its room', () => {
  it('nothing is made in the room it left, nobody there is cross at it, and what would reach it is reckoned where it is held', () => {
    const toy = begin('two-guests/b')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 2); stepFor(toy, 1)
    toRoom(toy, 'blob', 3); stepFor(toy, 12)
    // Night: the tuba keeps the blob awake next door.
    toy.gesture({ type: 'press', at: { x: where.wheel.x + where.wheel.w / 2, y: where.wheel.y + where.wheel.h / 2 } }, where)
    stepFor(toy, 1)
    expect(toy.scene(where).guests.find((guest) => guest.id === 'blob')!.mood).toBe('cross')
    // The troll is picked up and held over the lobby: no noise leaves the room it lodged in, and the blob sleeps.
    const found = spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, where).find((one) => one.guest.id === 'troll')!
    const from = centre(bodyBox(found.spot, where))
    toy.gesture({ type: 'press', at: from }, where)
    toy.gesture({ type: 'dragStart', from }, where)
    toy.gesture({ type: 'dragMove', from, at: { x: where.lobby.x + where.lobby.w / 2, y: where.lobby.y + 40 } }, where)
    const held = toy.scene(where)
    expect(held.airs.filter((air) => air.kind === 'din')).toEqual([])
    expect(held.guests.find((guest) => guest.id === 'blob')!.mood).not.toBe('cross')
    // In the stay nothing has changed: it is saved where it came from.
    expect(placeOf(arrangementOf(toy.stay), 'troll')).toBe(2)
  })
})

describe('a touch that ends the porter\'s showing', () => {
  it('leaves everybody where the child had them at once: nobody is seen walking back from his places', () => {
    const toy = begin('two-guests/c')
    toRoom(toy, 'troll', 1); stepFor(toy, 1)
    toRoom(toy, 'bat', 0); stepFor(toy, 1)
    toRoom(toy, 'blob', 2)
    const where = pageFor(toy)
    const whole = NEAT.in + NEAT.move + NEAT.hold + NEAT.move + NEAT.out
    while (toy.playing && toy.sceneLeft > whole - NEAT.in - NEAT.move - 0.5) { toy.step(1 / 60); toy.scene(where) }
    // His held moment: the troll stands where his way has it.
    expect((toy.scene(where).guests.find((guest) => guest.id === 'troll')!.place as { room: number }).room).toBe(0)
    toy.gesture({ type: 'press', at: { x: 20, y: where.height - 20 } }, where)
    for (let frame = 0; frame < 20; frame++) {
      const scene = toy.scene(where)
      expect((scene.guests.find((guest) => guest.id === 'troll')!.place as { room: number }).room).toBe(1)
      for (const guest of scene.guests) expect(Math.abs(guest.body!.dx) + Math.abs(guest.body!.dy), guest.id).toBeLessThan(6)
      toy.step(1 / 60)
    }
  })
})

describe('the guest from the bench among five in the lobby', () => {
  it('has a standing place of its own by the front door, can be touched there, and can be carried out again', () => {
    const toy = begin('twin-rooms/a')
    const where = pageFor(toy)
    const lobby = () => spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, where).filter((one) => one.guest.place === 'lobby')
    expect(lobby().length).toBe(5)
    const bench = castById('twin-rooms/a')!.bench
    carryOn(toy, where, bench, { x: where.lobby.x + where.lobby.w / 2, y: where.lobby.y + 40 }); stepFor(toy, 1)
    const six = lobby()
    expect(six.length).toBe(6)
    // No two of the six stand in the same place.
    expect(new Set(six.map((one) => Math.round(one.spot.x))).size).toBe(6)
    // A finger on the middle of the bench guest takes the bench guest.
    const mine = six.find((one) => one.guest.id === bench)!
    const at = centre(bodyBox(mine.spot, where))
    toy.gesture({ type: 'press', at }, where); toy.gesture({ type: 'tap', at }, where)
    expect(toy.stay.from).toBe(bench)
    toy.gesture({ type: 'press', at }, where); toy.gesture({ type: 'tap', at }, where)
    // And it can be carried out to the bench again.
    carryOn(toy, where, bench, centre(where.kerb)); stepFor(toy, 1)
    expect(placeOf(arrangementOf(toy.stay), bench)).toBe('bench')
  })
})

describe('an act goes to the thing and never past it', () => {
  it('the stove at three flames given to the yeti: the sauna carries it to the stove once, not twice', () => {
    const toy = begin('stove-and-ice/a')
    const where = pageFor(toy), u = where.scale
    toRoom(toy, 'yeti', 4); stepFor(toy, 1.5)
    tapOn(toy, thingAtNow(toy, 'stove')); stepFor(toy, 0.3)
    tapOn(toy, thingAtNow(toy, 'stove')); stepFor(toy, 0.3)
    expect(thing(arrangementOf(toy.stay), 'stove')!.dial).toBe(3)
    carryThing(toy, 'stove', plainBodyOn(toy, 'yeti'))
    expect(toy.playing).toBe(true)
    const spot = spotsOf(pageOfArrangement(arrangementOf(toy.stay), null, true).guests, where).find((one) => one.guest.id === 'yeti')!.spot
    const box = thingBox({ kind: 'stove', at: { room: 4 } }, where, [])!
    const reach = Math.abs(box.x + box.w / 2 - spot.x) / u
    let furthest = 0
    while (toy.playing) { toy.step(1 / 60); furthest = Math.max(furthest, Math.abs(toy.scene(where).guests.find((guest) => guest.id === 'yeti')!.body!.dx)) }
    expect(furthest).toBeGreaterThan(reach * 0.8)
    expect(furthest).toBeLessThan(reach + 4)
  })

  it('a guest that has taken to the stove goes to where the stove is from wherever it now stands, also when the wheel is turned in the middle of it', () => {
    const toy = begin('stove-and-ice/a')
    const where = pageFor(toy), u = where.scale
    toRoom(toy, 'lizard', 0); stepFor(toy, 1.5)
    carryThing(toy, 'stove', plainBodyOn(toy, 'lizard')); stepFor(toy, 0.5)
    toy.gesture({ type: 'press', at: { x: where.wheel.x + where.wheel.w / 2, y: where.wheel.y + where.wheel.h / 2 } }, where)
    const box = thingBox({ kind: 'stove', at: { room: 0 } }, where, [])!, stoveX = box.x + box.w / 2
    for (let t = 0; t < 1.5; t += 1 / 60) {
      toy.step(1 / 60)
      const scene = toy.scene(where)
      const lizard = spotsOf(scene.guests, where).find((one) => one.guest.id === 'lizard')!
      const drawnAt = lizard.spot.x + lizard.guest.body!.dx * u
      // Between where it stood, where it stands now (asleep, in the bed) and the stove: never beyond the stove and never through a wall.
      const stood = where.rooms[0].stand.x
      expect(drawnAt).toBeGreaterThanOrEqual(Math.min(stood, lizard.spot.x, stoveX) - 4 * u)
      expect(drawnAt).toBeLessThanOrEqual(Math.max(stood, lizard.spot.x, stoveX) + 4 * u)
    }
  })
})

describe('the pipe and the quilt keep sounding while they have something to do', () => {
  it('a pipe that starts to carry at a set-down whooshes without waiting for the wheel, and a quilt with something against it patters', () => {
    const toy = begin('full-house/c')
    const where = pageFor(toy)
    const heard = (kind: 'whoosh' | 'patter', seconds: number) => { toy.takeSounds(); stepFor(toy, seconds); const all = toy.takeSounds().map((sound) => JSON.stringify(sound)); return [0, 1].some((nth) => all.includes(JSON.stringify(voices.steady(kind, nth, 'plain')))) }
    toRoom(toy, 'cook', 4); stepFor(toy, 1)
    expect(heard('whoosh', 8)).toBe(false)
    carryThing(toy, 'pipe', centre(where.edges.find((edge) => edge.id === '4-5')!.rect)); stepFor(toy, 0.5)
    expect(heard('whoosh', 8)).toBe(true)
    // The singer sings at night; a quilt on her wall has her noise pressed against it.
    toRoom(toy, 'singer', 1); stepFor(toy, 1)
    carryThing(toy, 'quilt', centre(where.edges.find((edge) => edge.id === '1-2')!.rect)); stepFor(toy, 0.5)
    expect(heard('patter', 8)).toBe(false)
    toy.gesture({ type: 'press', at: { x: where.wheel.x + where.wheel.w / 2, y: where.wheel.y + where.wheel.h / 2 } }, where)
    expect(heard('patter', 8)).toBe(true)
  })
})

describe('a thing in the hand has left its place', () => {
  it('the quilt lifted off a wall stops nothing there while it is in the hand, and the stay still has it on the wall', () => {
    const toy = begin('quilt/b')
    const where = pageFor(toy)
    toRoom(toy, 'troll', 0); stepFor(toy, 1)
    toRoom(toy, 'blob', 1); stepFor(toy, 1)
    carryThing(toy, 'quilt', centre(where.edges.find((edge) => edge.id === '0-1')!.rect)); stepFor(toy, 1)
    toy.gesture({ type: 'press', at: { x: where.wheel.x + where.wheel.w / 2, y: where.wheel.y + where.wheel.h / 2 } }, where)
    stepFor(toy, 1)
    // Whether the blob is kept awake by a noise: its other troubles in this house (the cold from the snow hole) are not what this is about.
    const blob = () => (toy.scene(where).guests.find((guest) => guest.id === 'blob')!.turnedTo === 'left' ? 'cross' : 'content')
    const through = () => toy.scene(where).airs.some((air) => air.kind === 'din' && air.rooms.join('-') === '0-1')
    // Night: the tuba plays, the quilt stops it, and no noise reaches the blob.
    expect([blob(), through()]).toEqual(['content', false])
    const at = thingAtNow(toy, 'quilt')
    toy.gesture({ type: 'press', at }, where)
    toy.gesture({ type: 'dragStart', from: at }, where)
    toy.gesture({ type: 'dragMove', from: at, at: { x: at.x + 200, y: at.y - 150 } }, where)
    // In the hand: the noise goes through the bare wall and the blob is cross at once.
    expect([blob(), through()]).toEqual(['cross', true])
    expect(thing(arrangementOf(toy.stay), 'quilt')!.at).toEqual({ edge: '0-1' })
    // Put away with it in the hand: it is back on the wall, and the blob sleeps again.
    toy.rest()
    expect([blob(), through()]).toEqual(['content', false])
  })
})

describe('a pairing plays every time its combination is made', () => {
  it('the yeti lifted out of the room with the stove at three flames and set back into it makes the sauna again', () => {
    const toy = begin('stove-and-ice/a')
    const where = pageFor(toy)
    toRoom(toy, 'yeti', 4); stepFor(toy, 1)
    carryThing(toy, 'stove', { x: where.rooms[4].rect.x + 100, y: where.rooms[4].rect.y + 60 }); stepFor(toy, 1.5)
    tapOn(toy, thingAtNow(toy, 'stove')); stepFor(toy, 0.2)
    tapOn(toy, thingAtNow(toy, 'stove'))
    expect(toy.playing).toBe(true)
    stepFor(toy, 5)
    expect(toy.playing).toBe(false)
    const before = toy.stay
    // Up out of its room and down again in the same room, in one carry: the house is as it was, and the two do their thing again.
    carryOn(toy, where, 'yeti', { x: where.rooms[4].rect.x + where.rooms[4].rect.w * 0.3, y: where.rooms[4].rect.y + 50 })
    expect(arrangementOf(toy.stay)).toEqual(arrangementOf(before))
    expect(toy.stay.moves).toBe(before.moves)
    expect(toy.playing).toBe(true)
    toy.takeSounds()
    stepFor(toy, 0.3)
    expect(toy.takeSounds()).toContainEqual(voices.sauna)
  })
})

describe('the outer sides of the house on the page', () => {
  it('the quilt carried to the floor over the boiler hangs there and stops its warmth, with a patter while it does', () => {
    const toy = begin('quilt/a')
    const where = pageFor(toy)
    toRoom(toy, 'yeti', 0); stepFor(toy, 1.5)
    expect(toy.scene(where).guests.find((guest) => guest.id === 'yeti')!.mood).toBe('cross')
    const under = where.edges.find((edge) => edge.id === 'under-0')!.rect
    carryThing(toy, 'quilt', centre(under)); stepFor(toy, 1)
    expect(thing(arrangementOf(toy.stay), 'quilt')!.at).toEqual({ edge: 'under-0' })
    const scene = toy.scene(where)
    expect(scene.guests.find((guest) => guest.id === 'yeti')!.mood).not.toBe('cross')
    expect(scene.bunches).toEqual([0])
    // Saved and found as left.
    const back = readStay(JSON.parse(JSON.stringify(writeStay(toy.stay))), null)
    expect(back.kit.quilt!.at).toEqual({ edge: 'under-0' })
  })

  it('a guest set on an outer wall sticks in it and steps out into its room; a thing on the ceiling under the roof is fixed there', () => {
    const toy = begin('alarm-clock/a')
    const where = pageFor(toy)
    const left = where.edges.find((edge) => edge.id === 'left-3')!.rect
    carryOn(toy, where, 'troll', centre(left))
    expect(placeOf(arrangementOf(toy.stay), 'troll')).toBe(3)
    expect(toy.takeSounds()).toContainEqual(voices.throughTheWall)
    stepFor(toy, 1.5)
    carryThing(toy, 'clock', centre(where.edges.find((edge) => edge.id === 'over-4')!.rect)); stepFor(toy, 0.5)
    expect(thing(arrangementOf(toy.stay), 'clock')!.at).toEqual({ edge: 'over-4' })
  })
})

describe('a guest who is in both coach-loads is one guest', () => {
  it('at a changeover nobody is on the page twice: it files out with the old ones and gets off again when it has got on', () => {
    // The first house settled, as a fresh save has it: the troll and the bat, with the blob on the bench. The next coach-load is of the place below, and has the troll again, for the bench.
    const toy = fresh()
    carry(toy, 'troll', middleOf(2)); run(toy, 1)
    carry(toy, 'bat', middleOf(1))
    expect(toy.stay.finished).toBe(true)
    run(toy, 20)
    toy.scene(page)
    const old = castById(toy.stay.cast)!
    toy.gesture({ type: 'press', at: { x: page.coach.x + page.coach.w / 2, y: page.coach.y + page.coach.h / 2 } }, page)
    const next = castById(toy.stay.cast)!
    const olds = [...old.guests, old.bench], news = [...next.guests, next.bench]
    const shared = news.filter((id) => olds.includes(id))
    expect(shared).toContain('troll')
    /** For each guest, frame by frame, whether it is seen on the page (and not in the coach). */
    const seenAt = new Map<GuestId, boolean[]>([...new Set([...olds, ...news])].map((id) => [id, []]))
    let frames = 0
    while (toy.playing) {
      toy.step(1 / 60)
      const seen = toy.scene(page).guests.filter((guest) => !guest.body || guest.body.sx > 0.01).map((guest) => guest.id)
      expect(new Set(seen).size, `frame ${frames}: ${seen.join(' ')}`).toBe(seen.length)
      for (const [id, list] of seenAt) list.push(seen.includes(id))
      frames++
    }
    expect(frames).toBeGreaterThan(200)
    /** The stretches of frames a guest is seen and not seen, in order. */
    const runs = (list: boolean[]) => list.reduce<{ seen: boolean; from: number; to: number }[]>((out, seen, frame) => {
      const last = out[out.length - 1]
      if (last && last.seen === seen) last.to = frame; else out.push({ seen, from: frame, to: frame })
      return out
    }, [])
    // The frames between which the old coach-load who are not coming back go aboard: each is on the page, and then is not, and stays away.
    const gone = olds.filter((id) => !news.includes(id)).map((id) => runs(seenAt.get(id)!))
    for (const stretches of gone) expect(stretches.map((one) => one.seen)).toEqual([true, false])
    const firstGone = Math.min(...gone.map((stretches) => stretches[0].to)), lastGone = Math.max(...gone.map((stretches) => stretches[0].to))
    for (const id of shared) {
      const stretches = runs(seenAt.get(id)!)
      // On the page, then in the coach, then on the page again: it files out, and gets off only when it has got on.
      expect(stretches.map((one) => one.seen), id).toEqual([true, false, true])
      // It is aboard for a moment that can be seen (it is the last on and the first off), and it is on the page at the end.
      expect(stretches[1].to - stretches[1].from + 1, id).toBeGreaterThanOrEqual(5)
      expect(stretches[2].to, id).toBe(frames - 1)
      // It files out with the old ones: it goes aboard in the same file, no later than the last of them, and within three seconds of the first.
      expect(stretches[0].to, id).toBeLessThanOrEqual(lastGone)
      expect(Math.abs(stretches[0].to - firstGone), id).toBeLessThan(180)
    }
    // And at the end everybody of the new coach-load is in its place.
    expect(toy.scene(page).guests.map((guest) => guest.id).sort()).toEqual([...news].sort())
  })
})
