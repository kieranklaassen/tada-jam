import { describe, expect, it } from 'vitest'
import { ACTIONS, CELL_KEYS, GRID, OBJECTS, act, cellOf, keyOf, somePot } from './grid'
import { freshLab, type LabState } from './lab'
import { kitAt } from './order'
import { dab, plantAt, plantById, sow } from './page'
import { PACKETS, pack } from './plant'
import { CELL_VOICES, RANGE, noteOf, pitchOf, seedTick, wholeLength, type Part } from './voices'

const SEED = 20261003
const page = (): LabState => ({ ...freshLab(null, SEED), kit: kitAt('whole-plant') })

describe('the object-by-action grid', () => {
  it('is six objects by five actions', () => {
    expect(OBJECTS).toHaveLength(6)
    expect(ACTIONS).toHaveLength(5)
    expect(CELL_KEYS).toHaveLength(30)
    expect(new Set(CELL_KEYS).size).toBe(30)
  })

  it('gives every cell an answer that looks different from every other', () => {
    const shows = OBJECTS.flatMap((object) => ACTIONS.map((action) => cellOf(object, action).shows))
    expect(shows.every((show) => show.length > 0)).toBe(true)
    expect(new Set(shows).size).toBe(30)
  })

  it('gives every cell a voice that sounds different from every other', () => {
    expect(Object.keys(CELL_VOICES).sort()).toEqual([...CELL_KEYS].sort())
    expect(new Set(CELL_KEYS.map((key) => JSON.stringify(CELL_VOICES[key]))).size).toBe(30)
    // Not only different numbers: no two cells open with the same source at the same pitch.
    expect(new Set(CELL_KEYS.map((key) => `${CELL_VOICES[key][0].source}:${CELL_VOICES[key][0].pitch}`)).size).toBe(30)
  })

  it('has a right use for every object the child works with, and more wrong uses than right ones', () => {
    for (const object of OBJECTS) {
      const right = ACTIONS.filter((action) => GRID[object][action].right)
      if (object === 'beetle') expect(right).toEqual([])
      else expect(right.length, object).toBeGreaterThanOrEqual(1)
    }
    const all = OBJECTS.flatMap((object) => ACTIONS.map((action) => GRID[object][action]))
    expect(all.filter((cell) => !cell.right).length).toBeGreaterThan(all.filter((cell) => cell.right).length)
  })
})

describe('one touch', () => {
  it('is answered in every cell, whatever it names: no cell refuses and none throws', () => {
    const state = dab(page(), 1, 2).state
    for (const object of OBJECTS) {
      for (const action of ACTIONS) {
        for (const touch of [{}, { plant: 2, dustFrom: 1, packet: 'pink' as const, pot: { row: 'tray' as const, slot: 2 }, fromPot: { row: 'shelf' as const, slot: 0 } }, { plant: 99 }]) {
          const answer = act(state, { object, action, ...touch })
          expect(answer.cell).toBe(cellOf(object, action))
          expect(answer.key).toBe(keyOf(object, action))
          expect(answer.state.plants.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('changes the page only in the cells that say they do', () => {
    const state = dab(page(), 1, 2).state
    const full = { plant: 2, dustFrom: 1, packet: 'pink' as const, pot: { row: 'tray' as const, slot: 2 }, fromPot: { row: 'shelf' as const, slot: 0 } }
    for (const object of OBJECTS) for (const action of ACTIONS) if (cellOf(object, action).does === 'nothing') expect(act(state, { object, action, ...full }).state).toBe(state)
  })

  it('dust on a plant in bloom sets a pod: the cross', () => {
    const answer = act(page(), { object: 'plant', action: 'dust', plant: 2, dustFrom: 1 })
    expect(answer.events).toEqual([{ type: 'pod-set', on: 2, dust: 1 }])
  })

  it('a pod bursts whether it is poked, wetted, carried or offered, and the same six young come of it', () => {
    const state = dab(page(), 1, 2).state
    const broods = (['poke', 'wet', 'carry', 'offer'] as const).map((action) => act(state, { object: 'pod', action, plant: 2 }).state.plants.filter((plant) => plant.row === 'tray').map((plant) => plant.pairs))
    for (const brood of broods) expect(brood).toEqual(state.pods[0].seeds)
  })

  it('dust on a pod changes nothing: it is already set', () => {
    const state = dab(page(), 1, 2).state
    expect(act(state, { object: 'pod', action: 'dust', plant: 2, dustFrom: 1 }).state).toBe(state)
  })

  it('a packet seed grows where it is carried, and in some pot when it is poked, wetted or offered', () => {
    const carried = act(page(), { object: 'seed', action: 'carry', packet: 'short', pot: { row: 'shelf', slot: 4 } })
    expect(plantAt(carried.state, 'shelf', 4)!.pairs).toBe(PACKETS.short)
    for (const action of ['poke', 'wet', 'offer'] as const) expect(plantAt(act(page(), { object: 'seed', action, packet: 'pink' }).state, 'tray', 0)!.pairs).toBe(PACKETS.pink)
  })

  it('a runner bud roots a copy where it is carried, and creeps to some pot by itself when wetted', () => {
    const carried = act(page(), { object: 'bud', action: 'carry', plant: 1, pot: { row: 'tray', slot: 3 } })
    expect(plantAt(carried.state, 'tray', 3)!.from).toEqual({ how: 'runner', of: 1 })
    expect(plantAt(act(page(), { object: 'bud', action: 'wet', plant: 1 }).state, 'tray', 0)!.from).toEqual({ how: 'runner', of: 1 })
  })

  it('soil is wetted by the can and dried by the blotter, and a pot carried to a pot trades places', () => {
    const dried = act(page(), { object: 'soil', action: 'wet', pot: { row: 'tray', slot: 1 }, blot: true })
    expect(dried.state.dry[7]).toBe(true)
    expect(act(dried.state, { object: 'soil', action: 'wet', pot: { row: 'tray', slot: 1 } }).state.dry[7]).toBe(false)
    const swapped = act(page(), { object: 'soil', action: 'carry', fromPot: { row: 'shelf', slot: 0 }, pot: { row: 'tray', slot: 5 } })
    expect(plantById(swapped.state, 1)).toMatchObject({ row: 'tray', slot: 5 })
  })

  it('a plant carried moves, and a plant offered is answered by the visitor', () => {
    expect(plantById(act(page(), { object: 'plant', action: 'carry', plant: 1, pot: { row: 'tray', slot: 2 } }).state, 1)).toMatchObject({ row: 'tray', slot: 2 })
    const red = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
    const served: LabState = { ...page(), plants: [...page().plants, { id: 9, pairs: red, dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }], visitor: { who: 'snail', at: 'colour', count: 1, big: false, given: [], pods: 0 } }
    expect(act(served, { object: 'plant', action: 'offer', plant: 9 }).events.map((event) => event.type)).toEqual(['answered', 'ending'])
  })

  it('finds some pot: a free one in the tray first, then the shelf, then the tray’s first', () => {
    expect(somePot(page())).toEqual({ row: 'tray', slot: 0 })
    let state = page()
    for (let slot = 0; slot < 6; slot++) state = sow(state, 'pink', 'tray', slot).state
    expect(somePot(state)).toEqual({ row: 'shelf', slot: 2 })
    for (let slot = 2; slot < 6; slot++) state = sow(state, 'pink', 'shelf', slot).state
    expect(somePot(state)).toEqual({ row: 'tray', slot: 0 })
  })
})

describe('the voices', () => {
  const inside = (value: number, [low, high]: readonly [number, number]) => value >= low && value <= high
  const check = (parts: readonly Part[], name: string) => {
    expect(parts.length, name).toBeGreaterThan(0)
    for (const part of parts) {
      expect(inside(part.pitch, RANGE.pitch), `${name} pitch ${part.pitch}`).toBe(true)
      if (part.glideTo !== undefined) expect(inside(part.glideTo, RANGE.pitch), `${name} glide ${part.glideTo}`).toBe(true)
      expect(inside(part.peak, RANGE.peak), `${name} peak ${part.peak}`).toBe(true)
      expect(inside(part.attack, RANGE.attack), `${name} attack ${part.attack}`).toBe(true)
      expect(inside(part.length, RANGE.length), `${name} length ${part.length}`).toBe(true)
      expect(inside(part.after ?? 0, RANGE.after), `${name} after ${part.after}`).toBe(true)
      expect(part.source === 'tone' ? part.wave !== undefined && part.q === undefined : part.q !== undefined && part.wave === undefined, `${name} source`).toBe(true)
    }
    expect(inside(wholeLength(parts), RANGE.whole), `${name} whole ${wholeLength(parts)}`).toBe(true)
  }

  it('each stay inside the stated ranges of pitch, peak, attack and length', () => {
    for (const key of CELL_KEYS) check(CELL_VOICES[key], key)
    for (const joints of [1, 2, 4] as const) for (const colour of ['red', 'pink', 'white'] as const) for (const variant of [0, 1, 2]) check(noteOf(joints, colour, variant), `note ${joints} ${colour} ${variant}`)
    for (let index = 0; index < 6; index++) check(seedTick(index), `seed tick ${index}`)
  })

  it('never sum to more than a safe peak where the parts of one voice sound together', () => {
    for (const key of CELL_KEYS) {
      const together = CELL_VOICES[key].filter((part) => (part.after ?? 0) < 0.03).reduce((sum, part) => sum + part.peak, 0)
      expect(together, key).toBeLessThanOrEqual(0.28)
    }
  })

  it('give a plant a note that follows its size: the taller, the lower', () => {
    for (const colour of ['red', 'pink', 'white'] as const) {
      expect(pitchOf(4, colour)).toBeLessThan(pitchOf(2, colour))
      expect(pitchOf(2, colour)).toBeLessThan(pitchOf(1, colour))
    }
  })

  it('give each height and colour its own note, and three variants of each pluck', () => {
    const pitches = ([1, 2, 4] as const).flatMap((joints) => (['red', 'pink', 'white'] as const).map((colour) => Math.round(pitchOf(joints, colour))))
    expect(new Set(pitches).size).toBe(9)
    expect(new Set([0, 1, 2].map((variant) => JSON.stringify(noteOf(2, 'pink', variant)))).size).toBe(3)
    expect(noteOf(2, 'pink', 3)).toEqual(noteOf(2, 'pink', 0))
  })

  it('run six seeds up a short scale as they land', () => {
    const pitches = Array.from({ length: 6 }, (_, index) => seedTick(index)[0].pitch)
    for (let index = 1; index < 6; index++) expect(pitches[index]).toBeGreaterThan(pitches[index - 1])
  })
})
