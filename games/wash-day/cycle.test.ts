import { describe, expect, it } from 'vitest'
import { KINDS, mudLeft } from './cloth'
import { LADDER } from './config'
import { CLOTH, FEET_Y, FRIEND_KINDS, GATE, HOME, PLACE_X, PUDDLE, RAIL, SOAP, WAIT_FEET, WAIT_X, YARD_SCALE, heldAt, inBox, lineSpot, overlap } from './layout'
import { deserialize, type Save } from './save'
import { STAGE } from './stage'
import { DAMP } from './taste'
import { BOARD_SPOT, murky, type Yard } from './yard'
import { FRAME, callIn, carry, heard, open, play, reopened, rubClean, stored, tapAt, waitingAt, washAndDress, watch, withKinds, wringDry } from './testHands'
import * as V from './voices'

const GATE_AT = { x: GATE.x + GATE.w / 2, y: GATE.y + GATE.h / 2 }
const bodyAt = (friend: number) => ({ x: PLACE_X[friend], y: FEET_Y - (FRIEND_KINDS[friend] === 'heron' ? 232 : 180) * YARD_SCALE })
const wheres = (yard: Yard) => yard.friends.map((friend) => friend.where)
const saved = (yard: Yard): Save => JSON.parse(JSON.stringify(yard.toSave())) as Save
/** Dresses a friend in the yard in its own garment as it is, muddy: the quick way to a dressed friend. */
const dress = (yard: Yard, friend: number) => { carry(yard, heldAt(friend).x, heldAt(friend).y, bodyAt(friend).x, bodyAt(friend).y); watch(yard); play(yard, 0.2) }
const walkOff = (yard: Yard) => { tapAt(yard, GATE_AT.x, GATE_AT.y); const seconds = watch(yard); play(yard, 0.5); return seconds }

describe('the designed order', () => {
  it.each([[LADDER[0], 1], [LADDER[1], 2], [LADDER[2], 3]])('at %s, %i step in on the first touch of the gate', (position, count) => {
    const yard = withKinds(['sock', 'shirt', 'dungarees'], 1, position)
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    expect(wheres(yard).filter((where) => where === 'yard')).toHaveLength(count)
    expect(yard.position).toBe(position)
  })

  it('the first touch may be on any friend at the gate: that one steps in first', () => {
    const yard = open()
    tapAt(yard, waitingAt(2).x, waitingAt(2).y)
    expect(wheres(yard)).toEqual(['gate', 'gate', 'yard'])
    const two = withKinds(['sock', 'shirt', 'dungarees'], 1, LADDER[1])
    tapAt(two, waitingAt(2).x, waitingAt(2).y)
    expect(wheres(two)).toEqual(['yard', 'gate', 'yard'])
  })

  it('the harder option is the child\'s: any friend at the gate comes in when it is touched, at any place in the order and at any moment', () => {
    for (const age of [null, 2, 3, 4, 5, 9]) {
      const yard = open(3, age)
      callIn(yard, 0)
      // In the middle of the washing, with a garment on the board and a finger just lifted.
      tapAt(yard, heldAt(0).x, heldAt(0).y)
      for (let friend = 0; friend < 3; friend++) {
        if (yard.friends[friend].where !== 'gate') continue
        tapAt(yard, waitingAt(friend).x, waitingAt(friend).y)
        expect(yard.friends[friend].where, `age ${age}`).toBe('yard')
        watch(yard)
      }
      expect(wheres(yard)).toEqual(['yard', 'yard', 'yard'])
      // A touch on the gate while friends are in the yard never calls another in.
    }
  })

  it('a cycle with only those who stepped in is mixed: the position stays', () => {
    const yard = open()
    callIn(yard, 0)
    dress(yard, 0)
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    expect(yard.finished).toBe(true)
    expect(yard.position).toBe(LADDER[0])
  })

  it('a cycle with one more friend called in than stepped in went well: the position moves one place up, when the ending starts', () => {
    const yard = open()
    callIn(yard, 0)
    callIn(yard, 1)
    dress(yard, 0)
    dress(yard, 1)
    expect(yard.position).toBe(LADDER[0])
    yard.press(GATE_AT.x, GATE_AT.y)
    // Before any time has passed.
    expect(yard.position).toBe(LADDER[1])
    expect(yard.finished).toBe(true)
    yard.tap()
    watch(yard)
    // The next cycle at the new place: two step in.
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    expect(wheres(yard).filter((where) => where === 'yard')).toHaveLength(2)
    expect(yard.position).toBe(LADDER[1])
  })

  it('moves one place at a time, never down, and stays at the top', () => {
    const yard = open()
    const seen: string[] = []
    for (let cycle = 0; cycle < 5; cycle++) {
      callIn(yard, 0)
      for (let friend = 0; friend < 3; friend++) if (yard.friends[friend].where === 'gate') callIn(yard, friend)
      for (let friend = 0; friend < 3; friend++) dress(yard, friend)
      walkOff(yard)
      seen.push(yard.position)
    }
    expect(seen).toEqual([LADDER[1], LADDER[2], LADDER[2], LADDER[2], LADDER[2]])
    // A cycle that is only mixed, later: it does not go down.
    callIn(yard, 0)
    for (let friend = 0; friend < 3; friend++) dress(yard, friend)
    walkOff(yard)
    expect(yard.position).toBe(LADDER[2])
  })

  it('the garments are dealt: the three not held in this cycle are held in the next, in the other colourway, whatever the position', () => {
    const yard = open(5)
    for (let cycle = 0; cycle < 4; cycle++) {
      const held = yard.garments.map((garment) => garment.kind), colour = yard.friends[0].colour
      callIn(yard, 0)
      dress(yard, 0)
      walkOff(yard)
      const next = yard.garments.map((garment) => garment.kind)
      expect(new Set([...held, ...next]).size).toBe(KINDS.length)
      expect(yard.friends.every((friend) => friend.colour === (colour === 0 ? 1 : 0))).toBe(true)
      expect(yard.garments.every((garment) => garment.at === 'held' && mudLeft(garment.mud) > 0)).toBe(true)
    }
  })

  it('the hill keeps what the child made: the last three who walked off, as they were dressed, in the order they left, the oldest making way for a newer one', () => {
    const yard = open(5)
    const dressed: { kind: string; garment: string; mud: number }[] = []
    for (let cycle = 0; cycle < 4; cycle++) {
      callIn(yard, 0)
      if (cycle % 2) { washAndDress(yard, 0) } else dress(yard, 0)
      dressed.push({ kind: 'pig', garment: yard.friends[0].wears!.kind, mud: mudLeft(yard.friends[0].wears!.mud) })
      walkOff(yard)
      expect(yard.hill.length).toBe(Math.min(3, cycle + 1))
      expect(yard.hillShown).toEqual(yard.hill)
    }
    expect(yard.hill.map((leaver) => leaver.garment)).toEqual(dressed.slice(-3).map((one) => one.garment))
    expect(yard.hill.map((leaver) => leaver.mud.split('').reduce((sum, digit) => sum + Number(digit), 0))).toEqual(dressed.slice(-3).map((one) => one.mud))
    // The two that were washed stand there clean, and the one that was not stands there muddy.
    expect(yard.hill[0].mud).toMatch(/^0+$/)
    expect(yard.hill[1].mud).not.toMatch(/^0+$/)
    expect(yard.hill[2].mud).toMatch(/^0+$/)
  })
})

describe('coming in', () => {
  it('is saved when it starts: the cycle has begun and those who step in are in the yard, before any time passes', () => {
    const yard = open()
    yard.changed = false
    yard.press(GATE_AT.x, GATE_AT.y)
    expect(yard.sceneRunning).toBe(true)
    expect(yard.changed).toBe(true)
    expect(yard.urgent).toBe(true)
    const save = saved(yard)
    expect(save.finished).toBe(false)
    expect(save.friends.map((friend) => friend.where)).toEqual(['yard', 'gate', 'gate'])
    expect(save.garments.every((garment) => garment.at === 'held')).toBe(true)
    yard.tap()
  })

  it('lasts four to five seconds, in the friend\'s own walk with its own steps, and ends with it at its place holding its garment out', () => {
    for (const position of LADDER) {
      const yard = withKinds(['sock', 'shirt', 'dungarees'], 1, position)
      tapAt(yard, GATE_AT.x, GATE_AT.y)
      heard(yard)
      let opened = 0, walked = false
      const seconds = watch(yard, () => { opened = Math.max(opened, yard.gate.open); walked = walked || yard.friends[0].walking })
      expect(seconds, position).toBeGreaterThanOrEqual(4)
      expect(seconds, position).toBeLessThanOrEqual(5)
      expect(opened).toBe(1)
      expect(walked).toBe(true)
      expect(yard.gate.open).toBe(0)
      const pig = yard.friends[0]
      expect([pig.x, pig.y, pig.scale, pig.clip, pig.walking]).toEqual([PLACE_X[0], FEET_Y, YARD_SCALE, false, false])
      expect(pig.holds).toBe(yard.garments[0])
      const notes = heard(yard)
      expect(notes.length).toBeGreaterThan(4)
    }
  })

  it('gives way to any touch: every beat that is left lands silently, and the touch is then an ordinary touch', () => {
    const yard = withKinds(['sock', 'shirt', 'dungarees'], 1, LADDER[2])
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    play(yard, 0.8)
    heard(yard)
    yard.press(PUDDLE.x, PUDDLE.y)
    expect(yard.sceneRunning).toBe(false)
    expect(yard.gate.open).toBe(0)
    yard.friends.forEach((friend, i) => expect([friend.x, friend.y, friend.scale, friend.clip, friend.walking]).toEqual([PLACE_X[i], FEET_Y, YARD_SCALE, false, false]))
    // The only sound is the puddle's own.
    expect(heard(yard)).toEqual(expect.arrayContaining(V.blop(0.5).map((note) => expect.objectContaining({ kind: note.kind, attack: note.attack, decay: note.decay }))))
    expect(yard.dollops.length).toBe(1)
    yard.tap()
  })
})

describe('putting it on', () => {
  it('is saved when it starts: the garment is on this friend with its pegs off, and the friend wears it there', () => {
    const yard = open()
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    rubClean(yard)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7)
    wringDry(yard)
    tapAt(yard, lineSpot(0).x, lineSpot(0).y); play(yard, 0.7)
    expect(saved(yard).garments[0]).toMatchObject({ at: 'line', n: 0 })
    yard.changed = false; yard.urgent = false
    yard.press(lineSpot(0).x, lineSpot(0).y)
    yard.tap()
    expect(yard.sceneRunning).toBe(true)
    expect(yard.urgent).toBe(true)
    const save = saved(yard)
    expect(save.garments[0]).toMatchObject({ at: 'friend', n: 0, pegs: [false, false] })
    expect(save.friends[0].wears).toBe(0)
    expect(save.friends[0].on).toBe(yard.friends[0].on)
  })

  it('lasts four to six seconds whatever the garment, its state and the wearer, and ends with the garment on', () => {
    for (const kinds of [['sock', 'shirt', 'dungarees'], ['jumper', 'hat', 'scarf']] as const) {
      for (let garment = 0; garment < 3; garment++) for (let friend = 0; friend < 3; friend++) for (const state of ['as it came', 'wet', 'soaped']) {
        const yard = withKinds(kinds, 1, LADDER[2])
        callIn(yard, 0)
        if (state === 'wet') { carry(yard, heldAt(garment).x, heldAt(garment).y, 372, 676); play(yard, 3) }
        if (state === 'soaped') {
          // Muddy and soapy at once is the longest answer there is: two beats, one after the other.
          carry(yard, heldAt(garment).x, heldAt(garment).y, BOARD_SPOT.x, BOARD_SPOT.y); play(yard, 0.7)
          tapAt(yard, SOAP.x, SOAP.y); play(yard, 2.5)
          expect(yard.garments[garment].suds, kinds[garment]).toBeGreaterThan(0)
          expect(mudLeft(yard.garments[garment].mud), kinds[garment]).toBeGreaterThan(0)
        }
        const from = yard.spotOf(yard.garments[garment])
        carry(yard, from.x, from.y, bodyAt(friend).x, bodyAt(friend).y)
        const name = `${kinds[garment]} on ${FRIEND_KINDS[friend]}, ${state}`
        expect(yard.sceneRunning, name).toBe(true)
        const seconds = watch(yard)
        expect(seconds, name).toBeGreaterThan(3.99)
        expect(seconds, name).toBeLessThanOrEqual(6)
        expect(yard.friends[friend].wears, name).toBe(yard.garments[garment])
        expect(yard.friends[friend].donning, name).toBe(1)
      }
    }
  })

  it('gives way to any touch, and the garment is on', () => {
    const yard = open()
    callIn(yard, 0)
    carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y)
    play(yard, 0.2)
    yard.press(PUDDLE.x, PUDDLE.y)
    yard.tap()
    expect(yard.sceneRunning).toBe(false)
    expect(yard.friends[0].wears).toBe(yard.garments[0])
    expect(yard.friends[0].donning).toBe(1)
    expect(yard.garments[0].fly).toBeNull()
  })
})

describe('walking off', () => {
  it('is saved when it starts: finished, the position, the hill as dressed, the next three with their garments, and the seed', () => {
    const yard = open(4)
    callIn(yard, 0)
    callIn(yard, 2)
    dress(yard, 0)
    dress(yard, 2)
    const before = saved(yard)
    const worn = [yard.friends[0].wears!, yard.friends[2].wears!]
    yard.changed = false; yard.urgent = false
    yard.press(GATE_AT.x, GATE_AT.y)
    expect(yard.sceneRunning).toBe(true)
    expect(yard.urgent).toBe(true)
    const save = saved(yard)
    expect(save.finished).toBe(true)
    expect(save.position).toBe(LADDER[1])
    expect(save.hill.map((leaver) => [leaver.kind, leaver.garment])).toEqual([['pig', worn[0].kind], ['goat', worn[1].kind]])
    expect(save.hill.map((leaver) => leaver.on)).toEqual([before.friends[0].on, before.friends[2].on])
    expect(save.hill[0].mud).toBe(before.garments[worn[0].index].mud)
    expect(save.friends.every((friend) => friend.where === 'gate' && friend.wears === -1)).toBe(true)
    expect(save.garments.every((garment) => garment.at === 'held')).toBe(true)
    expect(new Set([...save.garments, ...before.garments].map((garment) => garment.kind)).size).toBe(KINDS.length)
    expect(save.seed).not.toBe(before.seed)
    // What the save holds reads back as it is.
    expect(deserialize(stored(yard), null, 9)).toEqual(save)
    yard.tap()
  })

  it('lasts eight to ten seconds and then the yard is still: the leavers small on the hill, the one never called gone down the lane, the next three behind the gate', () => {
    for (const called of [[0], [0, 1], [0, 1, 2]]) {
      const yard = open(4)
      callIn(yard, 0)
      for (const friend of called) if (yard.friends[friend].where === 'gate') callIn(yard, friend)
      for (const friend of called) dress(yard, friend)
      tapAt(yard, GATE_AT.x, GATE_AT.y)
      expect(yard.leaving).toHaveLength(3)
      heard(yard)
      let opened = 0
      const seconds = watch(yard, () => { opened = Math.max(opened, yard.gate.open) })
      expect(seconds, `${called.length} called`).toBeGreaterThanOrEqual(8)
      expect(seconds, `${called.length} called`).toBeLessThanOrEqual(10)
      expect(opened).toBe(1)
      expect(yard.gate.open).toBe(0)
      expect(yard.leaving).toHaveLength(0)
      expect(yard.ghosts).toHaveLength(0)
      expect(yard.hillShown).toEqual(yard.hill)
      expect(yard.hill).toHaveLength(called.length)
      yard.friends.forEach((friend, i) => expect([friend.x, friend.y, friend.hidden, friend.clip, friend.where]).toEqual([WAIT_X[i], WAIT_FEET[friend.kind], false, true, 'gate']))
      expect(heard(yard).length).toBeGreaterThan(6)
    }
  })

  it('gives way to any touch: the next three are behind the gate at once', () => {
    const yard = open(4)
    callIn(yard, 0)
    dress(yard, 0)
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    play(yard, 1)
    yard.press(PUDDLE.x, PUDDLE.y)
    yard.tap()
    expect(yard.sceneRunning).toBe(false)
    expect(yard.leaving).toHaveLength(0)
    expect(yard.gate.open).toBe(0)
    expect(yard.hillShown).toEqual(yard.hill)
    yard.friends.forEach((friend, i) => expect([friend.x, friend.y, friend.hidden]).toEqual([WAIT_X[i], WAIT_FEET[friend.kind], false]))
  })

  it('the finished yard stays as long as the child likes: nothing starts by itself, and the next cycle starts at the child\'s touch', () => {
    const yard = open(4)
    callIn(yard, 0)
    dress(yard, 0)
    walkOff(yard)
    yard.changed = false
    const before = JSON.stringify(yard.toSave())
    play(yard, 60)
    expect(yard.sceneRunning).toBe(false)
    expect(yard.finished).toBe(true)
    expect(yard.changed).toBe(false)
    expect(JSON.stringify(yard.toSave())).toBe(before)
    // Opened again, the same finished yard, and nothing plays.
    const again = reopened(yard)
    expect(again.finished).toBe(true)
    expect(again.sceneRunning).toBe(false)
    expect(again.toSave()).toEqual(yard.toSave())
    play(again, 5)
    expect(again.sceneRunning).toBe(false)
    again.press(waitingAt(1).x, waitingAt(1).y)
    expect(again.finished).toBe(false)
    expect(again.toSave().friends[1].where).toBe('yard')
  })
})

describe('found as left', () => {
  /** The yard's save reads back as it is, and a yard opened from it saves the same again. */
  const holds = (yard: Yard) => {
    const save = saved(yard)
    expect(deserialize(stored(yard), null, 777)).toEqual(save)
    const again = reopened(yard)
    expect(saved(again)).toEqual(save)
    return again
  }

  it('put away at any instant of a whole cycle, a drag and a scene included, and opened again, nothing is lost', () => {
    for (const seed of [1, 2, 3]) {
      const yard = open(seed, 4)
      let frame = 0
      const each = () => { if (frame++ % 9 === 0) holds(yard) }
      tapAt(yard, GATE_AT.x, GATE_AT.y)
      watch(yard, each)
      tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7, each)
      const at = yard.spotOf(yard.garments[0])
      yard.press(at.x, at.y)
      for (let n = 0; n < 40; n++) { yard.drag(at.x + (n % 2 ? 60 : -60), at.y + n - 20); yard.step(FRAME); each() }
      yard.tap()
      tapAt(yard, PUDDLE.x, PUDDLE.y); holds(yard)
      tapAt(yard, 262, 398); play(yard, 1, each)
      tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7, each)
      for (let n = 0; n < 3; n++) { tapAt(yard, RAIL.hang.x, RAIL.hang.y); each() }
      tapAt(yard, lineSpot(1).x, lineSpot(1).y); play(yard, 6, each)
      carry(yard, lineSpot(1).x, lineSpot(1).y, bodyAt(1).x, bodyAt(1).y, each)
      watch(yard, each)
      carry(yard, heldAt(1).x, heldAt(1).y, PUDDLE.x, PUDDLE.y, each); play(yard, 0.7, each)
      carry(yard, PUDDLE.x, PUDDLE.y - 6, bodyAt(0).x, bodyAt(0).y, each)
      watch(yard, each)
      carry(yard, bodyAt(1).x, bodyAt(1).y, 372, 676, each); play(yard, 0.7, each)
      const floats = yard.garments.find((garment) => garment.at === 'tub')!
      carry(yard, yard.spotOf(floats).x, yard.spotOf(floats).y, bodyAt(1).x, bodyAt(1).y, each)
      watch(yard, each)
      expect(yard.friends.filter((friend) => friend.wears).length).toBe(2)
      tapAt(yard, GATE_AT.x, GATE_AT.y)
      expect(yard.finished).toBe(true)
      watch(yard, each)
      play(yard, 2, each)
      expect(frame).toBeGreaterThan(1500)
    }
  })

  it('a thing in the hand is never saved in the air: under a dragging finger it is saved where it came from', () => {
    const yard = open()
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    yard.press(BOARD_SPOT.x, BOARD_SPOT.y)
    for (let x = BOARD_SPOT.x; x < 700; x += 20) yard.drag(x, 300)
    expect(yard.carrying).toBe(true)
    expect(saved(yard).garments[0].at).toBe('board')
    const again = holds(yard)
    expect(again.carrying).toBe(false)
    expect(again.garments[0].at).toBe('board')
    expect(again.garments[0].fly).toBeNull()
  })

  it('opened again in the middle of a scene, the yard is as the scene leaves it and no scene replays', () => {
    const yard = open(2)
    yard.press(GATE_AT.x, GATE_AT.y)
    let again = holds(yard)
    expect(again.sceneRunning).toBe(false)
    expect([again.friends[0].x, again.friends[0].y, again.friends[0].clip]).toEqual([PLACE_X[0], FEET_Y, false])
    expect(again.gate.open).toBe(0)
    yard.tap(); watch(yard)
    carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y)
    again = holds(yard)
    expect(again.sceneRunning).toBe(false)
    expect(again.friends[0].wears).toBe(again.garments[0])
    expect(again.friends[0].donning).toBe(1)
    expect(again.friends[0].reaction).toBeNull()
    watch(yard)
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    play(yard, 2)
    again = holds(yard)
    expect(again.sceneRunning).toBe(false)
    expect(again.leaving).toHaveLength(0)
    expect(again.hillShown).toEqual(again.hill)
    expect(again.friends.every((friend) => friend.where === 'gate' && !friend.hidden)).toBe(true)
    play(again, 3)
    expect(again.heard.every((note) => note.kind === 'noise')).toBe(true)
  })

  it('a yard opened again is at rest: nothing in the air, nothing in the hand, no sound', () => {
    const yard = open(3)
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y)
    tapAt(yard, PUDDLE.x, PUDDLE.y)
    const again = reopened(yard)
    expect(again.garments.every((garment) => garment.fly === null)).toBe(true)
    expect(again.dollops).toHaveLength(0)
    expect(again.loose).toHaveLength(0)
    expect(again.heard).toEqual([])
    expect(again.garments.map((garment) => garment.mud)).toEqual(yard.garments.map((garment) => garment.mud))
  })

  it('drying runs on game time and is saved as the garment\'s wetness; suds that were left lie the same way each time', () => {
    const yard = open(5)
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    tapAt(yard, 262, 398); play(yard, 2)
    expect(yard.garments[0].suds).toBeGreaterThan(0)
    const one = reopened(yard), two = reopened(yard)
    expect(one.knots.length).toBeGreaterThan(0)
    expect(one.knots).toEqual(two.knots)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7)
    tapAt(yard, lineSpot(0).x, lineSpot(0).y); play(yard, 4)
    const wet = yard.garments[0].wet
    expect(wet).toBeLessThan(10)
    expect(wet).toBeGreaterThan(DAMP)
    const again = reopened(yard)
    expect(again.garments[0].wet).toBe(Math.round(wet))
    // Time that passes while the game is put away dries nothing: no clock is read.
    expect(reopened(again).garments[0].wet).toBe(Math.round(wet))
  })

  it('the stream of chance carries on where it stopped: the next dollop and the next three are the same after a reopening', () => {
    const yard = open(8)
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    tapAt(yard, PUDDLE.x, PUDDLE.y); play(yard, 1)
    const again = reopened(yard)
    tapAt(yard, PUDDLE.x, PUDDLE.y); tapAt(again, PUDDLE.x, PUDDLE.y)
    expect(again.garments[0].mud).toEqual(yard.garments[0].mud)
    for (const one of [yard, again]) {
      play(one, 1)
      carry(one, BOARD_SPOT.x, BOARD_SPOT.y, bodyAt(0).x, bodyAt(0).y); watch(one)
      tapAt(one, GATE_AT.x, GATE_AT.y); watch(one)
    }
    expect(saved(again)).toEqual(saved(yard))
  })

  it('what it saves is whole numbers and short strings, well under the cap', () => {
    const yard = open(1, 5)
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    yard.press(BOARD_SPOT.x, BOARD_SPOT.y)
    for (let n = 0; n < 9; n++) { yard.drag(BOARD_SPOT.x + (n % 2 ? 37 : -37), BOARD_SPOT.y); yard.step(FRAME) }
    yard.tap()
    tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y)
    tapAt(yard, lineSpot(0).x, lineSpot(0).y); play(yard, 3.3)
    const save = yard.toSave()
    for (const value of [save.water.cloud, save.water.level, save.cat.wet, save.cat.fluff, save.seed]) expect(Number.isInteger(value)).toBe(true)
    for (const garment of save.garments) for (const value of [garment.wet, garment.suds, garment.x, garment.y, garment.n]) expect(Number.isInteger(value)).toBe(true)
    for (const friend of save.friends) expect(Number.isInteger(friend.wet)).toBe(true)
    expect(JSON.stringify(save).length).toBeLessThan(4096)
  })
})

describe('the idle ladder: one thing a child would want next', () => {
  const inside = (yard: Yard) => {
    const want = yard.want()!
    expect(want.x).toBeGreaterThan(0); expect(want.x).toBeLessThan(STAGE.width)
    expect(want.y).toBeGreaterThan(0); expect(want.y).toBeLessThan(STAGE.height)
    expect(overlap({ x: want.x - 30, y: want.y - 30, w: 60, h: 60 }, HOME)).toBe(false)
    return want
  }

  it('follows the job once through: the gate, the garment held out, the mud, the rail, the wringing, the line, the wearer, the gate', () => {
    const yard = open()
    expect(inside(yard)).toMatchObject({ how: 'tap', x: GATE_AT.x, y: GATE_AT.y })
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    expect(yard.want()).toBeNull()
    watch(yard)
    expect(inside(yard)).toMatchObject({ how: 'tap', x: heldAt(0).x, y: heldAt(0).y })
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    const rub = inside(yard)
    expect(rub.how).toBe('rub')
    expect(inBox(CLOTH, rub.x, rub.y)).toBe(true)
    rubClean(yard)
    expect(inside(yard)).toMatchObject({ how: 'tap', x: RAIL.hang.x, y: RAIL.hang.y })
    tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7)
    expect(inside(yard)).toMatchObject({ how: 'tap', x: RAIL.hang.x, y: RAIL.hang.y })
    wringDry(yard)
    expect(inside(yard)).toMatchObject({ how: 'tap', x: lineSpot(0).x, y: lineSpot(0).y })
    tapAt(yard, lineSpot(0).x, lineSpot(0).y); play(yard, 0.7)
    expect(inside(yard)).toMatchObject({ how: 'tap', x: lineSpot(0).x, y: lineSpot(0).y })
    tapAt(yard, lineSpot(0).x, lineSpot(0).y)
    expect(yard.want()).toBeNull()
    watch(yard)
    expect(inside(yard)).toMatchObject({ how: 'tap', x: GATE_AT.x, y: GATE_AT.y })
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    watch(yard)
    expect(inside(yard)).toMatchObject({ how: 'tap', x: GATE_AT.x, y: GATE_AT.y })
  })

  it('points at nothing while a thing is in the hand, and always at something while the yard waits', () => {
    const yard = open(2, 5)
    callIn(yard, 0)
    yard.press(heldAt(1).x, heldAt(1).y)
    yard.drag(700, 300)
    expect(yard.want()).toBeNull()
    yard.lift(); yard.drop()
    play(yard, 0.5)
    inside(yard)
    // A garment on the grass, one in the tub and one worn: still one want.
    carry(yard, heldAt(0).x, heldAt(0).y, 372, 676); play(yard, 0.7)
    inside(yard)
    carry(yard, heldAt(2).x, heldAt(2).y, bodyAt(2).x, bodyAt(2).y); watch(yard)
    inside(yard)
  })
})

describe('the tub clears between one three and the next', () => {
  /** A whole cycle by a child who washes all three: how much darker the tub grew at each garment. */
  const cycle = (yard: Yard): number[] => {
    const steps: number[] = []
    for (let friend = 0; friend < 3; friend++) {
      if (yard.friends[friend].where !== 'yard') callIn(yard, friend)
      const before = murky(yard.murk)
      washAndDress(yard, friend)
      steps.push(murky(yard.murk) - before)
    }
    return steps
  }

  it('the fourth garment and the tenth cloud the water by a step a child can see, as the first did', () => {
    const yard = open(3)
    const steps: number[] = []
    for (let n = 0; n < 4; n++) {
      steps.push(...cycle(yard))
      walkOff(yard)
    }
    expect(steps).toHaveLength(12)
    console.info(`wash-day tub: how much darker each of twelve garments made it, of 0.85: ${steps.map((step) => step.toFixed(2)).join(' ')}`)
    // A tenth of the way from clear to its darkest is the least of them; the darkest the draw lays on is 0.85.
    steps.forEach((step, n) => expect(step, `garment ${n + 1}`).toBeGreaterThan(0.08))
    expect(steps[3]).toBeGreaterThan(0.08)
    expect(steps[9]).toBeGreaterThan(0.08)
  })

  it('the mud sinks while the washed ones walk off: saved clear when the walk starts, shown sinking, and never back', () => {
    const yard = open(3)
    cycle(yard)
    const dark = yard.murk
    expect(dark).toBeGreaterThan(2)
    expect(saved(yard).water.cloud).toBeGreaterThan(2)
    yard.press(GATE_AT.x, GATE_AT.y)
    // Before any time has passed the save holds clear water, and the tub still shows what was in it.
    expect(saved(yard).water.cloud).toBe(0)
    expect(yard.murk).toBe(dark)
    yard.tap()
    let last = yard.murk
    watch(yard, () => { expect(yard.murk).toBeLessThanOrEqual(last); last = yard.murk })
    expect(yard.murk).toBe(0)
    // Put away in the middle of the walk and opened again: clear water, and nothing sinks a second time.
    const again = open(3)
    cycle(again)
    tapAt(again, GATE_AT.x, GATE_AT.y)
    play(again, 0.5)
    expect(again.murk).toBeGreaterThan(0)
    const opened = reopened(again)
    expect(opened.murk).toBe(0)
    expect(opened.sceneRunning).toBe(false)
  })

  it('while garments are washed the cloud only rises: nothing clears under the child\'s hands', () => {
    const yard = open(3)
    callIn(yard, 0)
    washAndDress(yard, 0)
    const cloud = yard.water.cloud
    play(yard, 20)
    expect(yard.water.cloud).toBe(cloud)
    expect(yard.murk).toBe(cloud)
  })
})
