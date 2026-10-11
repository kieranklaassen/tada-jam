import { describe, expect, it } from 'vitest'
import { CELLS, KINDS, decodeMud, mudLeft, type Kind } from './cloth'
import { FIRST_VISIT, LADDER } from './config'
import { FRIEND_KINDS } from './layout'
import { FRIENDS, PEGS, deal, deserialize, freshSave, serialize, theOtherThree, type Save } from './save'
import { STATE_VERSION } from './state'
import { HIDE_CELLS, decodeHide } from './taste'

/** What ctx.storage hands back on the next visit. */
const stored = (save: Save): unknown => JSON.parse(JSON.stringify(serialize(save)))
const raw = (save: Save) => stored(save) as Record<string, any>

describe('a first visit', () => {
  it('has three muddy friends behind the gate, one of each kind, each holding a different muddy garment', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const save = freshSave(null, seed)
      expect(save.friends.map((friend) => friend.kind)).toEqual([...FRIEND_KINDS])
      expect(save.friends.every((friend) => friend.where === 'gate' && friend.wears === -1)).toBe(true)
      expect(save.garments).toHaveLength(FRIENDS)
      expect(new Set(save.garments.map((garment) => garment.kind)).size).toBe(FRIENDS)
      save.garments.forEach((garment, i) => {
        expect(garment.at).toBe('held')
        expect(garment.owner).toBe(i)
        expect(mudLeft(decodeMud(garment.mud, garment.kind)!)).toBeGreaterThan(0)
      })
      for (const friend of save.friends) expect(decodeHide(friend.hide)!.some((level) => level > 0)).toBe(true)
      expect(save.finished).toBe(false)
      expect(save.hill).toEqual([])
    }
  })

  it('is the same yard for the same seed and another for another', () => {
    expect(freshSave(3, 7)).toEqual(freshSave(3, 7))
    expect(freshSave(3, 7)).not.toEqual(freshSave(3, 8))
  })

  it('starts where the age suggests: no age and the youngest at the first step, the oldest and older at the last', () => {
    expect(freshSave(null, 1).position).toBe(LADDER[0])
    expect(freshSave(1, 1).position).toBe(LADDER[0])
    expect(freshSave(3, 1).position).toBe(LADDER[0])
    expect(freshSave(4, 1).position).toBe(LADDER[1])
    expect(freshSave(5, 1).position).toBe(LADDER[2])
    expect(freshSave(6, 1).position).toBe(LADDER[2])
    expect(freshSave(40, 1).position).toBe(LADDER[2])
    for (const row of FIRST_VISIT) expect(LADDER).toContain(row.position)
  })

  it('the age only chooses where a first visit starts: a saved position wins over it', () => {
    const save = freshSave(3, 4)
    expect(deserialize(stored(save), 6, 4).position).toBe(LADDER[0])
    const older = freshSave(6, 4)
    expect(deserialize(stored(older), null, 4).position).toBe(LADDER[2])
  })
})

describe('the garments are dealt, never drawn by luck', () => {
  it('the next three are the three that were not held', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const held = freshSave(null, seed).garments.map((garment) => garment.kind)
      const next = theOtherThree(held)
      expect(next).toHaveLength(FRIENDS)
      expect(new Set<Kind>([...held, ...next]).size).toBe(KINDS.length)
    }
  })

  it('so every garment comes round within two cycles, and the same three come back the cycle after', () => {
    let held = freshSave(null, 3).garments.map((garment) => garment.kind), seed = 99
    const seen = new Set<Kind>(held)
    const first = [...held].sort()
    const dealt = deal(theOtherThree(held), 1, seed)
    held = dealt.garments.map((garment) => garment.kind); seed = dealt.seed
    held.forEach((kind) => seen.add(kind))
    expect(seen.size).toBe(KINDS.length)
    expect(deal(theOtherThree(held), 0, seed).garments.map((garment) => garment.kind).sort()).toEqual(first)
  })

  it('the stream says only who holds which and where the mud lies', () => {
    const kinds: Kind[] = ['sock', 'hat', 'scarf']
    const holders = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      const dealt = deal(kinds, 0, seed)
      expect(dealt.garments.map((garment) => garment.kind).sort()).toEqual([...kinds].sort())
      expect(deal(kinds, 0, seed)).toEqual(dealt)
      holders.add(dealt.garments.map((garment) => garment.kind).join())
    }
    expect(holders.size).toBeGreaterThan(1)
  })

  it('a list that is not three garments falls back to three', () => {
    expect(theOtherThree(['sock'])).toHaveLength(FRIENDS)
  })
})

describe('the saved yard', () => {
  it('round-trips, whatever seed the next visit brings', () => {
    const save = freshSave(4, 21)
    save.water = { cloud: 6, level: 7 }
    save.friends[0].where = 'yard'
    save.friends[1].where = 'yard'
    save.garments[0].at = 'line'; save.garments[0].n = 2; save.garments[0].pegs = [true, false]; save.garments[0].suds = 4
    save.garments[1].at = 'friend'; save.garments[1].n = 0
    save.friends[0].wears = 1; save.friends[0].on = save.friends[0].on
    save.cat = { at: 'rail', n: 0, wet: 3, fluff: 5 }
    save.soap = { at: 'grass', n: 1 }
    save.pegs = [true, false, false, true, false, false]
    save.hill = [{ kind: 'goat', colour: 1, garment: 'scarf', on: 'horns', mud: '0'.repeat(CELLS), wet: 2, suds: 0 }]
    const read = deserialize(stored(save), 4, 999)
    save.friends[0].on = read.friends[0].on
    expect(read).toEqual(save)
  })

  it('is small plain data: the largest state it can hold is well under half of what a slot allows', () => {
    const save = freshSave(null, 2)
    save.hill = FRIEND_KINDS.map((kind) => ({ kind, colour: 1 as const, garment: 'dungarees' as const, on: 'legs' as const, mud: '3'.repeat(CELLS), wet: 10, suds: 10 }))
    save.garments.forEach((garment) => { garment.mud = '3'.repeat(CELLS); garment.x = 1140.5; garment.y = 740.5 })
    const text = JSON.stringify(serialize(save))
    expect(text.length).toBeLessThan(4096)
    expect(text.length).toBeLessThan((64 * 1024) / 2)
    expect(JSON.parse(text)).toEqual(serialize(save))
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'yard'],
    ['an array', [1, 2]],
    ['a later version', { v: STATE_VERSION + 1, position: LADDER[0], finished: false }],
  ])('gives a fresh yard for %s', (_, value) => {
    expect(deserialize(value, null, 5)).toEqual(freshSave(null, 5))
  })

  it('keeps what it can read and repairs the rest, field by field', () => {
    const good = freshSave(null, 9)
    const slot = raw(good)
    slot.garments[1].mud = 'not a grid'
    slot.garments[1].suds = 'lots'
    slot.garments[1].wet = -4
    slot.garments[2].at = 'moon'
    slot.friends[0].hide = 7
    slot.friends[1].where = 'attic'
    slot.friends[2].colour = 'pink'
    slot.water = { cloud: 99, level: 'full' }
    slot.cat = { at: 'roof' }
    slot.soap = 4
    slot.pegs = 'yes'
    slot.hill = [{ kind: 'cow' }, 7, { kind: 'pig', garment: 'sock', on: 'horns', mud: 3 }]
    slot.seed = 'seven'
    const read = deserialize(slot, null, 9)
    expect(read.garments[0]).toEqual(good.garments[0])
    expect(read.garments[1].kind).toBe(good.garments[1].kind)
    expect(read.garments[1].mud).toBe('0'.repeat(CELLS))
    expect(read.garments[1].suds).toBe(0)
    expect(read.garments[1].wet).toBe(0)
    expect(read.garments[2].at).toBe('held')
    expect(read.friends[0].hide).toHaveLength(HIDE_CELLS)
    expect(read.friends[1].where).toBe('gate')
    expect(read.friends[2].colour).toBe(0)
    expect(read.water).toEqual({ cloud: 10, level: 10 })
    expect(read.cat).toEqual(good.cat)
    expect(read.soap).toEqual(good.soap)
    expect(read.pegs).toEqual(new Array(PEGS).fill(false))
    expect(read.hill).toEqual([{ kind: 'pig', colour: 0, garment: 'sock', on: 'ear', mud: '0'.repeat(CELLS), wet: 0, suds: 0 }])
    expect(Number.isInteger(read.seed)).toBe(true)
  })

  it('a slot whose friends or garments cannot be put back keeps the position and lays out a fresh cycle', () => {
    for (const damage of [
      (slot: Record<string, any>) => { slot.garments = [slot.garments[0]] },
      (slot: Record<string, any>) => { delete slot.garments },
      (slot: Record<string, any>) => { slot.friends = 'three' },
      (slot: Record<string, any>) => { slot.friends[1].kind = 'cow' },
      (slot: Record<string, any>) => { slot.garments[2].kind = slot.garments[0].kind },
      (slot: Record<string, any>) => { slot.garments[0].kind = 'cape' },
    ]) {
      const slot = raw(freshSave(5, 4))
      slot.finished = true
      damage(slot)
      const read = deserialize(slot, null, 4)
      expect(read.position).toBe(LADDER[2])
      expect(read.finished).toBe(false)
      expect(read.friends).toEqual(freshSave(null, 4).friends)
      expect(read.garments).toEqual(freshSave(null, 4).garments)
    }
  })

  it('holds one thing on the board, one on the rail and one at each place of the line; the rest goes into the tub', () => {
    for (const at of ['board', 'rail', 'line'] as const) {
      const slot = raw(freshSave(null, 4))
      slot.friends.forEach((friend: any) => { friend.where = 'yard' })
      slot.garments.forEach((garment: any) => { garment.at = at; garment.n = 1; garment.pegs = [true, true] })
      slot.cat = { at, n: 1, wet: 0, fluff: 0 }
      const read = deserialize(slot, null, 4)
      expect(read.garments.filter((garment) => garment.at === at)).toHaveLength(1)
      expect(read.garments.filter((garment) => garment.at === 'tub')).toHaveLength(2)
      expect(read.cat.at).toBe('fence')
      for (const garment of read.garments) if (garment.at !== 'line') expect(garment.pegs).toEqual([false, false])
      for (const garment of read.garments) if (garment.at === 'tub' || garment.at === 'board') expect(garment.wet).toBe(10)
    }
  })

  it('a friend wears one garment, only in the yard, on a place that garment fits', () => {
    const slot = raw(freshSave(null, 6))
    slot.friends.forEach((friend: any) => { friend.where = 'yard'; friend.on = 'nowhere' })
    slot.garments.forEach((garment: any) => { garment.at = 'friend'; garment.n = 2 })
    const read = deserialize(slot, null, 6)
    expect(read.garments.filter((garment) => garment.at === 'friend')).toHaveLength(1)
    expect(read.friends[2].wears).toBe(0)
    expect(read.friends[0].wears).toBe(-1)
    const gate = raw(freshSave(null, 6))
    gate.friends[0].where = 'yard'
    gate.garments[0].at = 'friend'; gate.garments[0].n = 1
    expect(deserialize(gate, null, 6).garments[0].at).toBe('tub')
  })

  it('a friend still at the gate still holds its garment, and the tub holds one friend', () => {
    const slot = raw(freshSave(null, 6))
    slot.garments[0].at = 'line'
    slot.friends[1].where = 'tub'
    slot.friends[2].where = 'tub'
    const read = deserialize(slot, null, 6)
    expect(read.garments[0].at).toBe('held')
    expect(read.friends[1].where).toBe('tub')
    expect(read.friends[2].where).toBe('yard')
    expect(read.garments[1].at).toBe('tub')
  })

  it('a finished cycle is one whose next three all wait at the gate', () => {
    const slot = raw(freshSave(null, 6))
    slot.finished = true
    expect(deserialize(slot, null, 6).finished).toBe(true)
    slot.friends[1].where = 'yard'
    expect(deserialize(slot, null, 6).finished).toBe(false)
  })

  it('keeps the last three on the hill and no more', () => {
    const slot = raw(freshSave(null, 6))
    slot.hill = Array.from({ length: 7 }, (_, i) => ({ kind: FRIEND_KINDS[i % 3], colour: i % 2, garment: KINDS[i % 6], on: 'torso', mud: '0'.repeat(CELLS), wet: 0, suds: 0 }))
    const read = deserialize(slot, null, 6)
    expect(read.hill).toHaveLength(FRIENDS)
    expect(read.hill[2].garment).toBe(KINDS[0])
  })

  it('a spot on the grass is brought back onto the lawn', () => {
    const slot = raw(freshSave(null, 6))
    slot.friends[0].where = 'yard'
    slot.garments[0].at = 'grass'; slot.garments[0].x = -4000; slot.garments[0].y = Number.NaN
    const read = deserialize(slot, null, 6).garments[0]
    expect(read.x).toBeGreaterThanOrEqual(430)
    expect(read.y).toBeGreaterThanOrEqual(500)
  })
})
