import { describe, expect, it } from 'vitest'
import { ROOMS } from './rooms'
import { defaultState, deserialize, serialize } from './state'
import { computeLayout, isWalkable, resolveRoom, tileId, UP } from './world'

const rooms = ROOMS.map(resolveRoom)

describe('saved state', () => {
  it('starts in the first diorama with every diorama at its start', () => {
    const state = defaultState(rooms)
    expect(state.current).toBe('first-turn')
    for (const room of rooms) expect(state.rooms[room.def.key]).toEqual({ groups: [...room.startArrangement], walker: room.startTile })
  })

  it('round-trips through JSON', () => {
    const state = defaultState(rooms)
    state.current = 'ferry'
    const ferry = rooms[1]
    state.rooms.ferry = { groups: [0], walker: ferry.startTile }
    const back = deserialize(JSON.parse(JSON.stringify(serialize(state))), rooms)
    expect(back).toEqual(state)
  })

  it('keeps a wanderer standing on a platform', () => {
    const ferry = rooms[1]
    const raft = ferry.cells.findIndex((cell) => cell.group === 0)
    const tile = tileId(raft, UP)
    expect(isWalkable(computeLayout(ferry, [0]), tile)).toBe(true)
    const back = deserialize({ v: 1, current: 'ferry', rooms: { ferry: { groups: [0], walker: tile } } }, rooms)
    expect(back.rooms.ferry).toEqual({ groups: [0], walker: tile })
  })

  it('never throws on hostile shapes and repairs to valid values', () => {
    const hostile: unknown[] = [
      null,
      undefined,
      42,
      'x',
      [],
      { v: 2 },
      { v: 1, current: 7, rooms: [] },
      { v: 1, current: 'nowhere', rooms: { ferry: 'raft' } },
      { v: 1, current: 'ferry', rooms: { ferry: { groups: [99], walker: -5 } } },
      { v: 1, current: 'crank', rooms: { crank: { groups: [1.5, 'up'], walker: 1e12 } } },
      { v: 1, rooms: { 'first-turn': { groups: [-7], walker: null }, __proto__: { polluted: true } } },
    ]
    for (const raw of hostile) {
      const state = deserialize(raw, rooms)
      expect(rooms.some((room) => room.def.key === state.current)).toBe(true)
      for (const room of rooms) {
        const save = state.rooms[room.def.key]
        expect(save.groups).toHaveLength(room.def.groups.length)
        expect(isWalkable(computeLayout(room, save.groups), save.walker)).toBe(true)
      }
      expect(Object.keys(state.rooms).sort()).toEqual(rooms.map((room) => room.def.key).sort())
    }
  })

  it('clamps slides to their stops and wraps turns', () => {
    const state = deserialize({ v: 1, current: 'ferry', rooms: { ferry: { groups: [99] }, 'first-turn': { groups: [-7] } } }, rooms)
    expect(state.rooms.ferry.groups).toEqual([4])
    expect(state.rooms['first-turn'].groups).toEqual([1])
  })

  it('falls back to the start when a saved wanderer tile is not walkable there', () => {
    const crank = rooms[4]
    const state = deserialize({ v: 1, current: 'crank', rooms: { crank: { groups: [-1, 0], walker: crank.doorTile + 6000 } } }, rooms)
    expect(state.rooms.crank).toEqual({ groups: [-1, 0], walker: crank.startTile })
  })
})
