import { describe, expect, it } from 'vitest'
import { insideWalk, WAKE_LANDING } from './layout'
import { attach, defaultWorkshop, deserialize, detach, MAX_AWAKE, noseHue, putToSleep, serialize, takeFromTray, turntableFree, wake } from './state'

describe('workshop state', () => {
  it('starts with one blank pink lump on the turntable and nobody awake', () => {
    const state = defaultWorkshop()
    expect(state.sleeper?.parts).toEqual([])
    expect(state.sleeper?.hue).toBe(2)
    expect(state.awake).toEqual([])
  })

  it('regrows a tray slot in the next colour', () => {
    const state = defaultWorkshop()
    const first = takeFromTray(state, 'legStub')
    const second = takeFromTray(state, 'legStub')
    expect(second).not.toBe(first)
    expect(takeFromTray(state, 'legStub')).not.toBe(second)
  })

  it('refuses a part when the family is full, and gives parts back', () => {
    const state = defaultWorkshop()
    const lump = state.sleeper!
    expect(attach(lump, { kind: 'tailCurl', hue: 0 })).toBe(true)
    expect(attach(lump, { kind: 'tailLong', hue: 1 })).toBe(false)
    expect(detach(lump, 0)).toEqual({ kind: 'tailCurl', hue: 0 })
    expect(detach(lump, 3)).toBeNull()
  })

  it('wakes the sleeper beside the turntable and brings a new lump in the next colour', () => {
    const state = defaultWorkshop()
    const lump = state.sleeper!
    attach(lump, { kind: 'legStub', hue: 0 })
    const woken = wake(state)
    expect(woken?.id).toBe(lump.id)
    expect(state.awake).toHaveLength(1)
    expect({ x: woken!.x, z: woken!.z }).toEqual(WAKE_LANDING)
    expect(insideWalk(WAKE_LANDING)).toBe(true)
    expect(state.sleeper?.id).not.toBe(lump.id)
    expect(state.sleeper?.hue).not.toBe(lump.hue)
  })

  it('leaves the turntable empty once four critters are awake', () => {
    const state = defaultWorkshop()
    for (let i = 0; i < MAX_AWAKE; i++) wake(state)
    expect(state.awake).toHaveLength(MAX_AWAKE)
    expect(state.sleeper).toBeNull()
    expect(wake(state)).toBeNull()
  })

  it('puts a critter back to sleep on a free turntable only', () => {
    const state = defaultWorkshop()
    attach(state.sleeper!, { kind: 'eye', hue: 1 })
    const woken = wake(state)!
    expect(turntableFree(state)).toBe(true)
    attach(state.sleeper!, { kind: 'horn', hue: 0 })
    expect(putToSleep(state, woken.id)).toBe(false)
    state.sleeper!.parts = []
    expect(putToSleep(state, woken.id)).toBe(true)
    expect(state.sleeper?.id).toBe(woken.id)
    expect(state.awake).toHaveLength(0)
  })

  it('gives every body a nose in a contrasting colour', () => {
    expect(noseHue(0)).not.toBe(0)
    expect(noseHue(1)).not.toBe(1)
    expect(noseHue(2)).not.toBe(2)
  })

  it('round-trips through serialize and deserialize', () => {
    const state = defaultWorkshop()
    attach(state.sleeper!, { kind: 'legLong', hue: 1 })
    attach(state.sleeper!, { kind: 'head', hue: 0 })
    wake(state)
    takeFromTray(state, 'horn')
    const copy = deserialize(JSON.parse(JSON.stringify(serialize(state))))
    expect(copy).toEqual(serialize(state))
    expect(JSON.stringify(serialize(state)).length).toBeLessThan(64 * 1024)
  })

  it('defaults on garbage and older versions', () => {
    for (const raw of [null, 42, 'x', [], { v: 0 }, { v: 2, awake: [] }]) {
      expect(deserialize(raw)).toEqual(defaultWorkshop())
    }
  })

  it('repairs a corrupt save instead of crashing', () => {
    const state = deserialize({
      v: 1,
      sleeper: { id: 3, hue: 9, parts: [{ kind: 'eye', hue: 0 }, { kind: 'wing', hue: 1 }, 'x'], x: 'a' },
      awake: [
        { id: 3, hue: 0, parts: [] },
        { id: 5, hue: 1, parts: Array.from({ length: 9 }, () => ({ kind: 'legStub', hue: 2 })), x: 1e9, z: -1e9, heading: NaN, seed: -4 },
        null,
        { id: 6 },
        { id: 7 },
        { id: 8 },
        { id: 9 },
      ],
      tray: { legStub: 2, eye: 7 },
      nextHue: 'pink',
      nextId: -1,
    })
    expect(state.sleeper?.hue).toBe(2)
    expect(state.sleeper?.parts).toEqual([{ kind: 'eye', hue: 0 }])
    expect(state.awake.map((critter) => critter.id)).toEqual([5, 6, 7, 8])
    expect(state.awake[0].parts).toHaveLength(6)
    expect(insideWalk(state.awake[0])).toBe(true)
    expect(Number.isFinite(state.awake[0].heading)).toBe(true)
    expect(state.awake[0].seed).toBeGreaterThanOrEqual(0)
    expect(state.tray.legStub).toBe(2)
    expect(state.tray.eye).toBe(1)
    expect(state.nextId).toBeGreaterThan(8)
  })

  it('brings a new lump when a save has an empty turntable and room to wake', () => {
    const state = deserialize({ v: 1, sleeper: null, awake: [], tray: {}, nextHue: 0, nextId: 4 })
    expect(state.sleeper?.id).toBe(4)
    expect(state.sleeper?.hue).toBe(0)
  })
})
