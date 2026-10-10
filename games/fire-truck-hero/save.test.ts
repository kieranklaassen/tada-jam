import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { COLS, MOST, ROWS, levelOf, pour } from './ground'
import { SPOTS } from './layout'
import { deserializeSave, driveOn, freshSave, serializeSave, toSave, withYard, yardOf, type Save } from './save'
import { STATE_VERSION } from './state'
import { KINDS, THINGS } from './things'
import { gulpOn, gulpOnGround, type Yard } from './world'
import { TURNS, arrangementsOf, isYardSpec, layOut, nextYardSpec } from './yards'

const stored = (save: Save): unknown => JSON.parse(JSON.stringify(serializeSave(save)))
const gulps = (yard: Yard, index: number, count: number): Yard => (count > 0 ? gulps(gulpOn(yard, index).yard, index, count - 1) : yard)

/** A whole garden well played in: the pool run over, the boat aground, the cat on the roof, mud, and the want met. */
function played(): Save {
  let yard = layOut('whole-garden', 0)
  yard = gulps(gulps(gulps(yard, 0, 7), 4, 4), 3, 2)
  for (let gulp = 0; gulp < 4; gulp++) yard = gulpOnGround(yard, 5.5, 8.5).yard
  yard = gulpOnGround(yard, 9.5, 8.5).yard
  return toSave({ v: STATE_VERSION, position: 'whole-garden', finished: yard.met }, yard, { place: 'whole-garden', arrangement: 1 }, 7, ['pool', 'boat', 'seed'])
}

/** Every rule a save must keep, whatever it was read from. */
function expectLegal(save: Save): void {
  expect(Object.keys(save).sort()).toEqual(['finished', 'next', 'position', 'seen', 'things', 'turn', 'v', 'wet', 'yard'])
  expect(save.v).toBe(STATE_VERSION)
  expect(LADDER).toContain(save.position)
  expect(typeof save.finished).toBe('boolean')
  for (const spec of [save.yard, save.next]) expect(isYardSpec(spec.place, spec.arrangement)).toBe(true)
  const plan = arrangementsOf(save.yard.place)[save.yard.arrangement]
  expect(save.things).toHaveLength(plan.things.length)
  save.things.forEach((thing, index) => {
    const { kind } = plan.things[index]
    expect(Number.isInteger(thing.gulps) && thing.gulps >= 0 && thing.gulps <= THINGS[kind].most).toBe(true)
    if (thing.spot === 'in') expect(plan.things[index].in).toBeDefined()
    else if (thing.spot === 'roof') expect(kind).toBe('cat')
    else expect(SPOTS[thing.spot]).toBeDefined()
    if (kind !== 'cat' && thing.spot !== 'in') expect(thing.spot).toBe(plan.things[index].spot)
  })
  expect(save.wet).toMatch(new RegExp(`^[0-3]{${COLS * ROWS}}$`))
  expect(Number.isInteger(save.turn) && save.turn >= 0 && save.turn < TURNS).toBe(true)
  expect(save.seen.every((kind) => KINDS.includes(kind))).toBe(true)
  expect(new Set(save.seen).size).toBe(save.seen.length)
  expect(JSON.parse(JSON.stringify(save))).toEqual(save)
  expect(() => yardOf(save)).not.toThrow()
}

describe('a first visit', () => {
  it('lays out the first yard of the position for the age, with the next one chosen', () => {
    for (const [age, position] of [[null, 'one-thing'], [1, 'one-thing'], [2, 'one-thing'], [3, 'two-things'], [4, 'afloat'], [9, 'afloat']] as const) {
      const save = freshSave(age)
      expectLegal(save)
      expect(save).toMatchObject({ v: STATE_VERSION, position, finished: false, yard: nextYardSpec(position, 0), next: nextYardSpec(position, 1), turn: 2, seen: [] })
      expect(save.wet).toBe('0'.repeat(COLS * ROWS))
      expect(yardOf(save)).toEqual(layOut(position, 0))
    }
  })
})

describe('a round trip', () => {
  it('keeps every field', () => {
    const save = played()
    expectLegal(save)
    expect(save.finished).toBe(true)
    expect(save.things).toEqual([{ gulps: 5, spot: 1 }, { gulps: 0, spot: 1 }, { gulps: 3, spot: 3 }, { gulps: 0, spot: 2 }, { gulps: 4, spot: 'roof' }])
    expect(deserializeSave(stored(save), 2)).toEqual(save)
    expect(serializeSave(save)).toEqual(save)
    expect(deserializeSave(stored(freshSave(3)), 3)).toEqual(freshSave(3))
  })

  it('gives back the yard as it was left: every thing where it was with its water, the sand at its level, the want met', () => {
    let yard = gulps(gulps(layOut('whole-garden', 2), 0, 3), 2, 3)
    yard = gulps(gulpOnGround(yard, 5.5, 8.5).yard, 4, 2)
    const save = toSave({ v: STATE_VERSION, position: 'downhill', finished: false }, yard, { place: 'downhill', arrangement: 2 }, 11, [])
    const back = yardOf(deserializeSave(stored(save)))
    // The wheel's spin is a view of what is, and is not saved.
    expect(yard.things[4].gulps).toBe(2)
    expect(back.things).toEqual(yard.things.map((thing) => (thing.kind === 'wheel' ? { ...thing, gulps: 0 } : thing)))
    expect(back.things[1]).toEqual({ kind: 'boat', spot: 1, gulps: 0, in: 0 })
    expect(back.things[2].in).toBeUndefined()
    expect(back.ground.map(levelOf)).toEqual(yard.ground.map(levelOf))
    expect({ ...back, things: [], ground: [] }).toEqual({ ...yard, things: [], ground: [] })
    expect(yardOf(played()).met).toBe(true)
    expect(toSave(played(), yardOf(played()), played().next, played().turn, played().seen)).toEqual(played())
  })
})

describe('a damaged record', () => {
  const junk: unknown[] = [null, undefined, [], {}, 7, -1, 1.5, 1e308, Number.NaN, Infinity, '', 'x', true, [1, 2], { place: 'x' }, { place: 'afloat', arrangement: 99 }, [null, 7, 'x', {}, []], 'roof', 'in']

  it('that is not a record of this game, or is of a later version, gives a first visit', () => {
    for (const raw of [...junk.filter((value) => JSON.stringify(value) !== '{}'), { ...played(), v: STATE_VERSION + 1 }, { ...played(), v: '1' }]) {
      expect(deserializeSave(raw, 3)).toEqual(freshSave(3))
    }
    expect(deserializeSave({})).toEqual(freshSave(null))
  })

  it('has each field repaired by itself, without throwing, and keeps the rest', () => {
    const good = played()
    for (const field of Object.keys(good).filter((key) => key !== 'v') as (keyof Save)[]) {
      const missing: Record<string, unknown> = { ...good }
      delete missing[field]
      for (const raw of [missing, ...junk.map((value) => ({ ...good, [field]: value }))]) {
        const save = deserializeSave(raw, 2)
        expectLegal(save)
        // A yard that cannot be read takes its things, its sand and its ending with it. Every other field stands alone.
        const lost: (keyof Save)[] = field === 'yard' ? ['yard', 'things', 'wet', 'finished'] : [field]
        for (const kept of (Object.keys(good) as (keyof Save)[]).filter((key) => !lost.includes(key))) expect(save[kept], `${kept} after ${field}`).toEqual(good[kept])
      }
    }
  })

  it('with an unknown place or arrangement gives a freshly laid out yard at the position', () => {
    for (const yard of [{ place: 'nowhere', arrangement: 0 }, { place: 'whole-garden', arrangement: 4 }, { place: 'whole-garden', arrangement: -1 }, { place: 'whole-garden' }]) {
      const save = deserializeSave({ ...played(), yard }, 2)
      expect(save.yard).toEqual(nextYardSpec('whole-garden', 7))
      expect(yardOf(save)).toEqual(layOut('whole-garden', save.yard.arrangement))
      expect(save.finished).toBe(false)
      // What waits beyond the gate is never the yard on screen again.
      expect(deserializeSave({ ...played(), yard, next: null }, 2).next).not.toEqual(save.yard)
    }
    expect(deserializeSave({ ...played(), position: 'nowhere', yard: null }, 3)).toMatchObject({ position: 'two-things', yard: nextYardSpec('two-things', 7) })
  })

  it('has things that do not match the arrangement repaired one by one', () => {
    const good = played()
    const read = (things: unknown) => deserializeSave({ ...good, things }, 2).things
    // Wrong count: a missing thing is as it was laid out, and one too many is dropped.
    expect(read(good.things.slice(0, 2))).toEqual([...good.things.slice(0, 2), { gulps: 0, spot: 3 }, { gulps: 0, spot: 2 }, { gulps: 0, spot: 0 }])
    expect(read([...good.things, { gulps: 1, spot: 4 }, 7])).toEqual(good.things)
    // Gulps out of range are none, and the thing beside it is kept.
    for (const bad of [-1, 6, 1.5, Number.NaN, 1e308, '2', null]) expect(read([{ gulps: bad, spot: 1 }, ...good.things.slice(1)])).toEqual([{ gulps: 0, spot: 1 }, ...good.things.slice(1)])
    expect(read([{ gulps: 5, spot: 1 }, { gulps: 5, spot: 'in' }, ...good.things.slice(2)])[1]).toEqual({ gulps: 0, spot: 'in' })
    expect(read([...good.things.slice(0, 3), { gulps: 3, spot: 2 }, good.things[4]])[3]).toEqual({ gulps: 0, spot: 2 })
    // A spot that is not a spot, or not one this thing can be at, is where the thing was laid out.
    for (const bad of [7, -1, 2.5, 'attic', 'roof', 'in', null, 4]) expect(read([{ gulps: 5, spot: bad }, ...good.things.slice(1)])[0]).toEqual({ gulps: 5, spot: 1 })
    for (const bad of [0, 4, 'roof', 9]) expect(read([good.things[0], { gulps: 2, spot: bad }, ...good.things.slice(2)])[1]).toEqual({ gulps: 2, spot: 'in' })
    // The cat walks to any free spot or the roof, and never onto a spot something stands on.
    for (const free of [0, 4, 'roof']) expect(read([...good.things.slice(0, 4), { gulps: 3, spot: free }])[4]).toEqual({ gulps: 3, spot: free })
    for (const bad of [1, 2, 3, 5, 'in', 'boat']) expect(read([...good.things.slice(0, 4), { gulps: 3, spot: bad }])[4]).toEqual({ gulps: 3, spot: 0 })
  })

  it('keeps only known kinds in seen, each once, reads a damaged cell of sand as dry, and a turn out of range as the first', () => {
    expect(deserializeSave({ ...played(), seen: ['cat', 'dog', 'cat', 7, null, 'fire', ['pool'], 'wheel', 'fire'] }).seen).toEqual(['cat', 'fire', 'wheel'])
    const wet = `x93${played().wet.slice(3)}`
    expect(deserializeSave({ ...played(), wet }).wet).toBe(`003${played().wet.slice(3)}`)
    for (const turn of [-1, TURNS, 2.5, 1e308, Number.NaN, '3']) expect(deserializeSave({ ...played(), turn }).turn).toBe(0)
    expect(deserializeSave({ ...played(), turn: TURNS - 1 }).turn).toBe(TURNS - 1)
  })
})

describe('the save as the child plays', () => {
  it('finishes the cycle with the gulp that meets the want, once, and moves the position one step', () => {
    let save = freshSave(3)
    let yard = yardOf(save)
    for (let gulp = 0; gulp < 5; gulp++) {
      yard = gulpOn(yard, yard.want).yard
      save = withYard(save, yard)
      expect(save.finished).toBe(gulp >= 2)
      expect(save.position).toBe(gulp >= 2 ? 'afloat' : 'two-things')
    }
    expect(yardOf(save)).toEqual(yard)
    // Found as left: the yard is finished on load, so its ending is not said again.
    expect(gulpOn(yardOf(deserializeSave(stored(save))), yard.want).events.some((event) => event.type === 'want-met')).toBe(false)
  })

  it('drives on to the yard that waited, laid out fresh, and shows a moved position in the yard after next', () => {
    const before = withYard(freshSave(3), gulps(yardOf(freshSave(3)), 0, 3))
    const after = driveOn(before, yardOf(before))
    expectLegal(after)
    expect(after).toMatchObject({ position: 'afloat', finished: false, yard: before.next, turn: 3, seen: [] })
    expect(after.yard.place).toBe('two-things')
    expect(after.next).toEqual(nextYardSpec('afloat', 2))
    expect(yardOf(after)).toEqual(layOut(before.next.place, before.next.arrangement))
    // Left with nothing watered, the yard went badly and the position steps down. With a puddle made, it stays.
    expect(driveOn(after, yardOf(after)).position).toBe('two-things')
    expect(driveOn(after, gulps(gulpOnGround(yardOf(after), 9.5, 8.5).yard, 1, 3)).position).toBe('afloat')
  })

  it('never lets the same yard wait behind itself, wraps the turn, and keeps what was seen', () => {
    let save: Save = { ...freshSave(2), seen: ['fire'] }
    for (let yard = 0; yard < 60; yard++) {
      const next = driveOn(save, yard % 3 ? gulps(yardOf(save), yardOf(save).want, 3 + (yard % 2)) : yardOf(save))
      expectLegal(next)
      expect(next.yard).toEqual(save.next)
      expect(next.next).not.toEqual(next.yard)
      expect(next.seen).toEqual(['fire'])
      save = next
    }
    expect(new Set(LADDER).has(save.position)).toBe(true)
  })
})

describe('the size of a save', () => {
  it('is under half of 64 KB at its largest: a whole garden with every thing at its most, every cell mud and every kind seen', () => {
    let largest = 0
    arrangementsOf('whole-garden').forEach((plan, number) => {
      let yard = layOut('whole-garden', number)
      const things = yard.things.map((thing) => ({ ...thing, gulps: THINGS[thing.kind].most, spot: thing.kind === 'cat' ? ('roof' as const) : thing.spot }))
      let ground = yard.ground
      for (let cell = 0; cell < COLS * ROWS; cell++) ground = pour(ground, (cell % COLS) + 0.5, Math.floor(cell / COLS) + 0.5, MOST)
      yard = { ...yard, things, ground, met: true }
      const save = toSave({ v: STATE_VERSION, position: 'round-and-round', finished: true }, yard, { place: 'round-and-round', arrangement: 2 }, TURNS - 1, KINDS)
      expectLegal(save)
      expect(save.wet).toBe('3'.repeat(COLS * ROWS))
      expect(plan.things.length).toBeGreaterThanOrEqual(4)
      largest = Math.max(largest, new TextEncoder().encode(JSON.stringify(serializeSave(save))).length)
    })
    expect(largest).toBeGreaterThan(COLS * ROWS)
    expect(largest).toBeLessThan(32 * 1024)
    expect(largest).toBeLessThan(1024)
  })
})
