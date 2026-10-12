import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { DOOR, NOSE, PUDDLE_SLOT, SPOTS, STONE_SPOT, WHEEL, type P } from './layout'
import { blankSheets, emptyRecording, tracingContext } from './recorder'
import { ROOM_DOOR } from './room'
import { deserialize, freshSaved, serialize } from './save'
import { Finger } from './script'
import { step } from './step'
import { createToy, savedOf, type Toy, type ToySave } from './toy'
import { View } from './view'

// Parked equals loaded. A put-away settles the game as a load would find it:
// put away at any instant and opened again, nothing is lost and no scene
// replays. Each state below is put away at several instants, and the parked
// game is then held against the game opened from what was saved, field by
// field and picture by picture, now and for the seconds that follow.
// And nothing is pending on load: no flag that outlives its touch, no timer
// that is already full, nothing that starts or sounds by itself.

const FOOT: P = { x: 930, y: 500 }

/** Carries a thing to a point and lets it go there, without waiting for what follows. */
const carry = (f: Finger, thing: Parameters<Finger['reach']>[0], to: P): void => { const at = f.reach(thing); f.drag(at, to, `${thing} carried`) }
/** The same, with the finger still down at the end. */
const hold = (f: Finger, thing: Parameters<Finger['reach']>[0], to: P): void => { const at = f.reach(thing); f.down(at, `${thing} held`); f.wait(0.05); f.slide(at, to) }

/** Every state a put-away can fall in: how to get there, on a fresh game. */
const STATES: { name: string; reach: (f: Finger) => void; hand?: 'back' | 'down' }[] = [
  { name: 'a cover opening', reach: (f) => f.tap(SPOTS.stone.shut, 'open stone') },
  { name: 'a cover shutting', reach: (f) => { f.tap(SPOTS.log.shut, 'open log'); f.rest(); f.tap(SPOTS.log.away[0], 'shut log') } },
  { name: 'a first showing: what is under a cover coming up to be seen', reach: (f) => { f.tap(SPOTS.burrow.shut, 'open burrow'); f.wait(0.6) } },
  { name: 'a dweller doing its act', reach: (f) => { f.tap(SPOTS.grass.shut, 'open grass'); f.rest(); f.tap(SPOTS.grass.find, 'ladybird') } },
  { name: 'the hedgehog rolling up', reach: (f) => f.tap({ x: 160, y: 652 }, 'hedgehog') },
  { name: 'a thing only touched', reach: (f) => { const at = f.reach('worm'); f.down(at, 'touch worm') }, hand: 'back' },
  { name: 'a thing in the hand, the finger down', reach: (f) => hold(f, 'worm', FOOT), hand: 'back' },
  { name: 'a thing in the hand over the hedgehog, the finger down', reach: (f) => hold(f, 'worm', NOSE), hand: 'back' },
  { name: 'a thing hanging where it was let go', reach: (f) => carry(f, 'worm', FOOT), hand: 'down' },
  { name: 'a thing hanging over the toad\'s stone', reach: (f) => carry(f, 'worm', STONE_SPOT), hand: 'down' },
  { name: 'the woodlouse moving in: its first showing', reach: (f) => { carry(f, 'worm', FOOT); f.wait(0.4) } },
  { name: 'the scene of the hedgehog and the worm', reach: (f) => { carry(f, 'worm', NOSE); f.wait(0.35) } },
  { name: 'the scene of the toad\'s swap', reach: (f) => { carry(f, 'snail', STONE_SPOT); f.wait(0.35) } },
  { name: 'the scene of the jay\'s theft', reach: (f) => { f.put('worm', PUDDLE_SLOT, 'worm in the puddle'); carry(f, 'worm', FOOT); f.wait(0.35) } },
  { name: 'the turn of the year, with covers open', reach: (f) => { f.tap(SPOTS.grass.shut, 'open grass'); f.tap(SPOTS.stone.shut, 'open stone'); f.rest(); f.tap(WHEEL, 'wheel') } },
  { name: 'a thing on the path with the jay coming down', reach: (f) => { carry(f, 'snail', { x: 416, y: 690 }); f.wait(0.35) } },
  { name: 'a thing in the puddle', reach: (f) => { carry(f, 'snail', PUDDLE_SLOT); f.wait(0.35) } },
  { name: 'a thing sailing in through the door', reach: (f) => { carry(f, 'worm', DOOR); f.wait(0.32) } },
  { name: 'coming home, with a thing sent in', reach: (f) => { f.put('worm', DOOR, 'worm through the door'); f.tap(DOOR, 'door in') } },
  { name: 'the nest tipped out', reach: (f) => { f.put('worm', PUDDLE_SLOT, 'worm in the puddle'); f.put('worm', FOOT, 'wet worm'); f.tap({ x: 730, y: 304 }, 'nest') } },
  { name: 'the toad leaping home', reach: (f) => { f.put('snail', STONE_SPOT, 'snail on the stone'); const feet = { x: SPOTS.log.seat.x, y: SPOTS.log.seat.y - 60 }; f.tap(feet, 'toad') } },
  { name: 'a pair on the table doing what the two do', reach: (f) => { f.put('worm', DOOR, 'worm in'); f.put('snail', DOOR, 'snail in'); f.tap(DOOR, 'door in'); f.rest(); carry(f, 'worm', { x: 734, y: 628 }); f.wait(0.35) } },
  { name: 'in the room, a thing in the hand, the finger down', reach: (f) => { f.put('worm', DOOR, 'worm in'); f.tap(DOOR, 'door in'); f.rest(); hold(f, 'worm', { x: 500, y: 600 }) }, hand: 'back' },
  { name: 'a thing carried out of the door of the room, the finger down', reach: (f) => { f.put('worm', DOOR, 'worm in'); f.tap(DOOR, 'door in'); f.rest(); hold(f, 'worm', ROOM_DOOR); f.wait(0.2); f.slide(ROOM_DOOR, FOOT) }, hand: 'back' },
  { name: 'the slide back out to the wood', reach: (f) => { f.tap(DOOR, 'door in'); f.rest(); f.tap(ROOM_DOOR, 'door out') } },
  { name: 'a thing rolling off the full bowl', reach: (f) => { f.put('worm', DOOR, 'worm in'); f.put('snail', DOOR, 'snail in'); f.tap(DOOR, 'door in'); f.rest(); f.put('snail', { x: 150, y: 584 }, 'snail in the bowl'); carry(f, 'worm', { x: 150, y: 584 }); f.wait(0.35) } },
]

/** The plain fields of a game: everything but its chance, which a load seeds afresh. */
function plain(toy: Toy): unknown {
  const { rng: _rng, scene, ...rest } = toy
  return JSON.parse(JSON.stringify({ ...rest, scene: scene === null ? null : 'scene' }))
}

/** What the view draws of a game at this moment, as a trace of everything asked of the context. */
function picture(view: View, toy: Toy): string[] {
  const { g, trace } = tracingContext()
  view.draw(g, 1180, 820, 2, { toy, guidance: null, tier: TIERS[0] })
  return trace
}

describe('parked equals loaded', () => {
  it.each(STATES)('$name', ({ name, reach, hand }) => {
    for (const later of [0, 0.15, 0.6, 1.4]) {
      const finger = new Finger(1, 30)
      reach(finger)
      if (later > 0 && hand === undefined) finger.wait(later)
      if (later > 0 && hand === 'down' && later < 0.3) finger.wait(later)
      if (later > 0.3 && hand !== undefined) continue
      const toy = finger.toy, before = savedOf(toy), inHand = toy.hand
      // The state is the one it is named for.
      if (later === 0) {
        if (hand !== undefined) expect(toy.hand, 'something is in the hand').not.toBeNull()
        if (name.includes('scene of') || name.includes('turn of the year') || name.includes('coming home')) expect(toy.scene, 'a scene is under way').not.toBeNull()
        if (hand === undefined) expect(Object.keys(toy.acts).length, 'something is moving').toBeGreaterThan(0)
        if (name.includes('toad leaping home')) expect(toy.acts.toad?.kind).toBe('home')
        if (name.includes('pair')) expect(toy.acts['thing:worm']?.kind).toBe('pair:worm+snail')
        if (name.includes('rolling off')) expect(toy.acts['thing:worm']?.kind).toBe('rolloff')
        if (name.includes('sailing in')) expect(toy.acts['thing:worm']?.kind).toBe('sent')
        if (name.includes('woodlouse')) expect(toy.acts['find:stone']?.kind).toBe('hello')
        if (name.includes('carried out of the door')) expect(toy.room).toBe(false)
      }
      const heard = finger.ears.heard.length
      finger.play.park()
      const saved = savedOf(toy)
      // The save: what was in the hand under a finger is back where it came from; what hung is set down where
      // it was let go, with what follows from that; and everything else was saved when it was caused.
      if (hand === 'back') expect(saved).toEqual(before)
      if (hand === 'down') { expect(inHand?.down).toBe(false); expect(saved.things[inHand!.thing]).not.toEqual({ at: 'home' }) }
      if (hand === undefined) expect(saved).toEqual(before)
      // Nothing is under way and nothing is pending.
      expect(toy.hand).toBeNull()
      expect(toy.scene).toBeNull()
      expect(toy.acts).toEqual({})
      expect(toy.sounds).toEqual([])
      expect(toy.arrivals).toEqual([])
      expect(toy.trail).toBeNull()
      expect(toy.perch).toEqual({ snail: false, feather: false })
      expect(finger.ears.closes.length).toBe(1)
      expect(finger.ears.heard.length).toBe(heard)
      // The idle ladder is taken back.
      expect(finger.play.guidance).toBeNull()
      // It is the game a load makes from what was saved, having gone through storage: field by field.
      const stored = deserialize(JSON.parse(JSON.stringify(serialize({ ...freshSaved(null), ...saved }))), null)
      const { v: _v, position: _position, ...world } = stored
      const loaded = createToy(world as ToySave, toy.seed, toy.time)
      expect(plain(toy)).toEqual({ ...(plain(loaded) as object), dirty: toy.dirty })
      // And picture by picture, now and through the next seconds: the same frames, so no scene replays.
      const view = new View(blankSheets(emptyRecording()))
      for (let i = 0; i < 90; i++) {
        expect(picture(view, toy)).toEqual(picture(view, loaded))
        step(toy, 1 / 30)
        step(loaded, 1 / 30)
      }
      expect(toy.sounds).toEqual([])
      expect(loaded.sounds).toEqual([])
    }
  })

  it('covers the states that matter: a thing in the hand, a scene under way, an ending, first showings', () => {
    const names = STATES.map((state) => state.name).join('; ')
    for (const word of ['in the hand', 'hanging', 'scene of the hedgehog', 'toad\'s swap', 'jay\'s theft', 'turn of the year', 'coming home', 'first showing', 'pair on the table', 'slide back out']) expect(names).toContain(word)
  })
})

describe('nothing is pending on load', () => {
  it('no flag outlives its touch, no timer is full, nothing starts or sounds: from a first visit and from every state above', () => {
    const saves: ToySave[] = [{ ...freshSaved(null), finished: false } as ToySave, { ...freshSaved(7), finished: true } as ToySave]
    for (const state of STATES) { const finger = new Finger(1, 30); state.reach(finger); finger.wait(0.5); saves.push(savedOf(finger.toy)) }
    for (const saved of saves) {
      const finger = new Finger(3, 30, () => {}, saved)
      const toy = finger.toy
      expect(toy.acts).toEqual({})
      expect(toy.hand).toBeNull()
      expect(toy.scene).toBeNull()
      expect(toy.sounds).toEqual([])
      expect(toy.cut).toEqual({ scene: false, all: false })
      expect(toy.dirty).toBe(false)
      // No timer is due at the moment of the load: every animal waits its own while, and so does the stir under a cover.
      for (const who of ['hedgehog', 'jay', 'toad'] as const) expect(toy.idle[who].next).toBeGreaterThan(toy.time + 0.5)
      expect(toy.stir.next).toBeGreaterThan(toy.time + 0.5)
      for (const place of Object.keys(toy.covers) as (keyof typeof toy.covers)[]) expect(toy.covers[place].greeted).toBe(true)
      finger.wait(0)
      const first = savedOf(toy)
      // Left alone for half a minute: nothing is heard, nothing is saved anew, and the ladder starts from the bottom.
      finger.play.step(0)
      expect(finger.play.guidance?.glow).toBe(0)
      finger.wait(2.9)
      expect(finger.play.guidance?.glow).toBe(0)
      finger.wait(27)
      expect(finger.ears.heard).toEqual([])
      expect(savedOf(toy)).toEqual(first)
      expect(toy.dirty).toBe(false)
      expect(toy.scene).toBeNull()
    }
  })
})
