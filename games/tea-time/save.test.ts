import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { dishOf } from './forms'
import { FIRST_SEED, partyFor, setTable } from './order'
import { SHOWINGS } from './party'
import { MOST_THINGS, deserializeTea, freshTeaState, largestState, serializeTea, withWorld, worldOf, type TeaState } from './save'
import { STATE_VERSION } from './state'
import { CELL_HOLDS, PUDDLE_COLS, PUDDLE_ROWS, pourInto, puddled, teaOut, thingById, type Thing } from './world'

/** A stored record as storage hands it back: plain JSON, open to any damage a test does to it. */
type Stored = Record<string, any>
const stored = (state: TeaState): Stored => JSON.parse(JSON.stringify(serializeTea(state)))
const reopen = (state: TeaState, childAge: number | null = null): TeaState => deserializeTea(stored(state), childAge)
/** A table newly set for a position, as a damaged table is rebuilt. */
const seatedAt = (position: string): TeaState => deserializeTea({ v: STATE_VERSION, position, finished: false }, null)

/** A sitting some way in: the Bear's place laid and his cup poured until it ran over the saucer onto the cloth, the Hen's cup part poured in her wing, the sponge moved, two first lifts noted. */
function played(finished: boolean): TeaState {
  const open = seatedAt('three-guests')
  const world = worldOf(open)
  const cup = thingById(world, 'cup-bear')!, saucer = thingById(world, 'saucer-3')!
  Object.assign(saucer, { x: cup.x, z: cup.z, on: null })
  Object.assign(cup, { heldBy: null, on: saucer.id })
  pourInto(world, 'cup-bear', 1.5)
  pourInto(world, 'cup-hen', 0.43219)
  Object.assign(thingById(world, 'sponge')!, { x: -1.23456, z: 0.98765, tea: 0.07 })
  const state = withWorld(open, world)
  const guests = state.guests.map((guest, index) => ({ ...guest, note: (['not-to-taste', 'to-taste', null] as const)[index], content: index === 1 }))
  return { ...state, finished, shown: ['pour', 'lay'], guests, tools: { sponge: true, bowl: true }, waiting: finished ? partyFor('whose-cup', 99).party : null }
}

/** Every array and record inside a value, to see that two values share none. */
function partsOf(value: unknown, found: object[] = []): object[] {
  if (typeof value !== 'object' || value === null) return found
  found.push(value)
  for (const inner of Object.values(value)) partsOf(inner, found)
  return found
}
const shares = (a: unknown, b: unknown): boolean => partsOf(a).some((part) => partsOf(b).includes(part))

describe('a round trip through storage', () => {
  it('gives back a fresh state as it was, at either starting position', () => {
    for (const age of [null, 4, 6]) expect(reopen(freshTeaState(age), age)).toEqual(freshTeaState(age))
  })

  it.each([false, true])('finds a table that was played at as it was left (sitting ended: %s)', (finished) => {
    const state = played(finished)
    const back = reopen(state)
    expect(serializeTea(back)).toEqual(serializeTea(state))
    expect(reopen(back)).toEqual(back)
    // Of the party at the gate only who comes and with which cup is stored; the rest follows from that.
    if (finished) {
      expect(Object.keys(stored(state).waiting)).toEqual(['guests'])
      expect(back.waiting!.guests).toEqual(state.waiting!.guests)
      expect([...back.waiting!.trayCups].sort()).toEqual([...state.waiting!.trayCups].sort())
      expect(back.waiting!.laysOwnPlace).toBe(state.waiting!.laysOwnPlace)
    }
    // The stored grain is the only difference: a thousandth of a cupful, a hundredth of a unit.
    back.things.forEach((thing, index) => {
      const was = state.things[index]
      expect({ ...thing, x: 0, z: 0, tea: 0 }).toEqual({ ...was, x: 0, z: 0, tea: 0 })
      expect(Math.abs(thing.tea - was.tea)).toBeLessThanOrEqual(0.0005)
      expect(Math.hypot(thing.x - was.x, thing.z - was.z)).toBeLessThan(0.008)
    })
    expect(teaOut(worldOf(back))).toBeCloseTo(teaOut(worldOf(state)), 2)
    expect(thingById(worldOf(back), 'cup-bear')).toMatchObject({ tea: 1, on: 'saucer-3', heldBy: null })
    expect(thingById(worldOf(back), 'saucer-3')?.tea).toBe(dishOf('house').holds)
    expect(thingById(worldOf(back), 'cup-hen')).toMatchObject({ tea: 0.432, on: null, heldBy: 'hen' })
    expect(puddled(worldOf(back))).toBeCloseTo(0.3, 3)
    expect(back.guests.map((guest) => [guest.seat, guest.note, guest.content])).toEqual([[0, 'not-to-taste', false], [1, 'to-taste', true], [2, null, false]])
  })

  it('stores these keys and no others, and no tea for the pot', () => {
    const state = played(true)
    thingById(state, 'pot')!.tea = 3
    const out = serializeTea({ ...state, things: state.things.map((thing) => ({ ...thing, glow: 1 })), extra: [1] } as TeaState)
    expect(Object.keys(out)).toEqual(['v', 'position', 'finished', 'seed', 'shown', 'guests', 'things', 'tools', 'puddles', 'waiting'])
    for (const thing of out.things) expect(Object.keys(thing)).toEqual(['id', 'kind', 'size', 'ring', 'owner', 'x', 'z', 'on', 'heldBy', 'worn', 'tea'])
    expect(out.things.find((thing) => thing.kind === 'pot')?.tea).toBe(0)
    // A spot a hair left of the middle is stored as 0, as the stored text reads back.
    expect(Object.is(serializeTea({ ...state, things: [{ ...state.things[0], x: -0.001 }] }).things[0].x, 0)).toBe(true)
  })

  it('keeps seats the guests have swapped', () => {
    const state = played(false)
    const swapped = { ...state, guests: state.guests.map((guest, index) => ({ ...guest, seat: [2, 0, 1][index] })) }
    expect(reopen(swapped).guests.map((guest) => guest.seat)).toEqual([2, 0, 1])
  })
})

describe('a damaged record', () => {
  const good = (): TeaState => reopen(played(true))
  const find = (record: Stored, id: string): Stored => record.things.find((thing: Thing) => thing.id === id)
  const thingIs = (state: TeaState, id: string, over: Partial<Thing>): Partial<TeaState> => ({ things: state.things.map((thing) => (thing.id === id ? { ...thing, ...over } : thing)) })
  const guestIs = (state: TeaState, seat: number, over: object): Partial<TeaState> => ({ guests: state.guests.map((guest) => (guest.seat === seat ? { ...guest, ...over } : guest)) })
  const dry = (): Partial<TeaState> => ({ puddles: new Array<number>(PUDDLE_COLS * PUDDLE_ROWS).fill(0) })
  const same = (): Partial<TeaState> => ({})

  const fields: [string, (record: Stored) => void, (state: TeaState) => Partial<TeaState>][] = [
    ['a seed of 0', (r) => (r.seed = 0), () => ({ seed: FIRST_SEED })],
    ['a seed that is not whole', (r) => (r.seed = 1.5), () => ({ seed: FIRST_SEED })],
    ['a seed that is a word', (r) => (r.seed = 'seven'), () => ({ seed: FIRST_SEED })],
    ['showings that are not a list', (r) => (r.shown = 'pour'), () => ({ shown: [] })],
    ['an unknown showing and one stored twice', (r) => (r.shown = ['lay', 'dance', 'lay', 7, 'pour']), () => ({ shown: ['lay', 'pour'] })],
    ['tools that are not a record', (r) => (r.tools = [true, true]), () => ({ tools: { sponge: false, bowl: false } })],
    ['a tool mark that is neither true nor false', (r) => (r.tools.bowl = 'yes'), () => ({ tools: { sponge: true, bowl: false } })],
    ['a cloth with a cell missing', (r) => r.puddles.pop(), dry],
    ['a cloth with a cell that is not a number', (r) => (r.puddles[5] = null), dry],
    ['a cloth that is not a list', (r) => (r.puddles = { 0: 1 }), dry],
    ['a cell below nothing and one over what a cell holds', (r) => r.puddles.splice(0, 2, -1, 9), (s) => ({ puddles: [0, CELL_HOLDS, ...s.puddles.slice(2)] })],
    ['a note that is no note', (r) => (r.guests[0].note = 'yum'), (s) => guestIs(s, 0, { note: null })],
    ['a mark of having drunk that is not true or false', (r) => (r.guests[1].content = 'yes'), (s) => guestIs(s, 1, { content: false })],
    ['seats that are not 0 to n - 1', (r) => r.guests.forEach((guest: Stored) => (guest.seat = 7)), same],
    ['a guest nobody knows', (r) => r.guests.splice(1, 0, { who: 'fox', seat: 1, note: null, content: true }), same],
    ['a guest seated twice', (r) => r.guests.push({ ...r.guests[0], note: 'not-to-taste', content: true }), same],
    ['more tea than a cup holds', (r) => (find(r, 'cup-hen').tea = 7), (s) => thingIs(s, 'cup-hen', { tea: 1 })],
    ['less tea than none', (r) => (find(r, 'cup-hen').tea = -2), (s) => thingIs(s, 'cup-hen', { tea: 0 })],
    ['tea that is not a number', (r) => (find(r, 'cup-bear').tea = 'lots'), (s) => thingIs(s, 'cup-bear', { tea: 0 })],
    ['tea noted for the pot', (r) => (find(r, 'pot').tea = 3), same],
    ['a thing off the cloth', (r) => Object.assign(find(r, 'sponge'), { x: 99, z: -99 }), (s) => thingIs(s, 'sponge', { x: 6.3, z: -2.7 })],
    ['a thing standing on one that is not there', (r) => (find(r, 'cup-bear').on = 'saucer-9'), (s) => thingIs(s, 'cup-bear', { on: null })],
    ['a thing standing on itself', (r) => (find(r, 'cup-bear').on = 'cup-bear'), (s) => thingIs(s, 'cup-bear', { on: null })],
    ['two things standing on each other', (r) => { find(r, 'spoon-0').on = 'spoon-1'; find(r, 'spoon-1').on = 'spoon-0' }, (s) => thingIs(s, 'spoon-1', { on: 'spoon-0' })],
    ['a ring that is no amount', (r) => (find(r, 'cup-hen').ring = 2), (s) => thingIs(s, 'cup-hen', { ring: null })],
    ['an owner nobody knows', (r) => (find(r, 'cup-hen').owner = 'fox'), (s) => thingIs(s, 'cup-hen', { owner: null })],
    ['a cup in the paw of a guest who is not at the table', (r) => (find(r, 'cup-hen').heldBy = 'duckling-a'), (s) => thingIs(s, 'cup-hen', { heldBy: null })],
    ['records that cannot be things', (r) => r.things.push({ ...find(r, 'cup-hen') }, { ...find(r, 'pot'), id: 'pot-2' }, { ...find(r, 'bowl'), id: 'napkin', kind: 'napkin' }, { ...find(r, 'bowl'), id: 'bucket', size: 'bucket' }, { ...find(r, 'bowl'), id: '' }, { ...find(r, 'bowl'), id: 'lost', x: null }, 'cup', null), same],
  ]

  it.each(fields)('repairs %s and keeps the rest', (_, damage, repaired) => {
    const record = stored(good())
    damage(record)
    expect(deserializeTea(record, 6)).toEqual({ ...good(), ...repaired(good()) })
  })

  const tables: [string, (record: Stored) => void][] = [
    ['guests that are not a list', (r) => (r.guests = 'bear')],
    ['no guests', (r) => (r.guests = [])],
    ['only guests nobody knows', (r) => (r.guests = [{ who: 'fox', seat: 0, note: null, content: false }])],
    ['more guests than seats', (r) => (r.guests = ['bear', 'mouse', 'hen', 'duckling-a', 'duckling-b'].map((who, seat) => ({ who, seat, note: null, content: false })))],
    ['things that are not a list', (r) => (r.things = { pot: true })],
    ['no pot', (r) => (r.things = r.things.filter((thing: Thing) => thing.kind !== 'pot'))],
    ['more things than a table has', (r) => { while (r.things.length <= MOST_THINGS) r.things.push({ ...find(r, 'bowl'), id: `bowl-${r.things.length}` }) }],
  ]

  it.each(tables)('seats a new party at a newly set table for %s, and keeps the rest', (_, damage) => {
    const record = stored(good())
    damage(record)
    const laid = partyFor(good().position, good().seed)
    const back = deserializeTea(record, 6)
    expect(back).toEqual({ ...good(), finished: false, waiting: null, seed: laid.seed, things: setTable(laid.party).things, guests: laid.party.guests.map((guest, seat) => ({ who: guest.who, seat, note: null, content: false })) })
    expect(reopen(back)).toEqual(back)
  })

  const gates: [string, (record: Stored) => void][] = [
    ['nobody', (r) => (r.waiting = null)],
    ['a word', (r) => (r.waiting = 'gate')],
    ['a party of none', (r) => (r.waiting.guests = [])],
    ['a party of five', (r) => (r.waiting.guests = ['bear', 'mouse', 'hen', 'duckling-a', 'duckling-b'].map((who) => ({ who, cup: 'own' })))],
    ['a guest twice', (r) => (r.waiting.guests[1].who = r.waiting.guests[0].who)],
    ['a cup that is neither its own nor none', (r) => (r.waiting.guests[0].cup = 'borrowed')],
  ]

  it.each(gates)('lays out a party for the stored position when %s waits after an ended sitting', (_, damage) => {
    const record = stored(good())
    damage(record)
    const laid = partyFor(good().position, good().seed)
    expect(deserializeTea(record, null)).toEqual({ ...good(), waiting: laid.party, seed: laid.seed })
  })

  it('has someone waiting after every ended sitting, and nobody while one is open', () => {
    for (const position of LADDER) {
      const table = seatedAt(position)
      const ended = reopen({ ...table, finished: true, waiting: null })
      expect(ended.finished).toBe(true)
      expect(ended.waiting).toEqual(partyFor(position, table.seed).party)
      expect({ ...ended, waiting: null, seed: 0 }).toEqual({ ...table, finished: true, seed: 0 })
      expect(reopen({ ...table, finished: false, waiting: partyFor(position, 5).party })).toEqual(table)
    }
    expect(reopen(played(true)).waiting!.guests).toEqual(partyFor('whose-cup', 99).party.guests)
  })
})

describe('what is not this game\'s record', () => {
  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'tea'],
    ['an array', [1, 2, 3]],
    ['a version above the current one', { ...serializeTea(played(true)), v: STATE_VERSION + 1 }],
    ['no version', { ...serializeTea(played(true)), v: undefined }],
  ])('gives a fresh state for %s, at the starting position of the given age', (_, raw) => {
    for (const age of [null, 3, 4, 5, 6, 9]) expect(deserializeTea(raw, age)).toEqual(freshTeaState(age))
  })

  it('opens a first visit on a guest already sitting, wanting tea, at a dry table', () => {
    const fresh = freshTeaState(null)
    expect(fresh).toMatchObject({ v: STATE_VERSION, position: LADDER[0], finished: false, shown: [], tools: { sponge: false, bowl: false }, waiting: null })
    expect(fresh.guests).toEqual([{ who: 'bear', seat: 0, note: null, content: false }])
    expect(thingById(fresh, 'cup-bear')).toMatchObject({ on: 'saucer-3', tea: 0 })
    expect(teaOut(fresh)).toBe(0)
    expect(Number.isInteger(fresh.seed) && fresh.seed !== 0).toBe(true)
  })

  it('starts by age only on a first visit: a saved position wins, and no age gives the first position', () => {
    expect(FIRST_VISIT.map((row) => row.position)).toEqual(['brim', 'lay-a-place'])
    expect([null, 4, 5].map((age) => freshTeaState(age).position)).toEqual(['brim', 'brim', 'brim'])
    const six = freshTeaState(6)
    expect(six.position).toBe('lay-a-place')
    expect(six.guests.length).toBe(1)
    expect(thingById(six, `cup-${six.guests[0].who}`)).toMatchObject({ heldBy: six.guests[0].who, on: null })
    expect(deserializeTea(stored(seatedAt('twins')), 6).position).toBe('twins')
    expect(deserializeTea(stored(seatedAt('brim')), 6).position).toBe('brim')
    expect(deserializeTea(stored(seatedAt('three-cups')), null).position).toBe('three-cups')
    expect(deserializeTea({ ...stored(seatedAt('twins')), position: 'retired-step' }, 6).position).toBe('lay-a-place')
  })
})

describe('size and sharing', () => {
  const bytes = (state: TeaState): number => new TextEncoder().encode(JSON.stringify(serializeTea(state))).length

  it('keeps the largest legal state under half of the 64 KB cap', () => {
    const largest = largestState()
    expect(bytes(largest)).toBeLessThan(32768)
    // It is legal: it comes back from storage as it is, with nothing repaired.
    expect(reopen(largest)).toEqual(largest)
    expect([largest.guests.length, largest.things.length, largest.waiting?.guests.length, largest.waiting?.trayCups.length]).toEqual([4, MOST_THINGS, 4, 4])
    expect(largest.shown).toEqual([...SHOWINGS])
    expect(largest.puddles.every((amount) => amount === CELL_HOLDS)).toBe(true)
    // And it is the largest: no table of the designed order, however wet, is bigger or has a longer id.
    const longest = Math.max(...largest.things.map((thing) => thing.id.length))
    for (const position of LADDER) for (const seed of [1, 2, 3, 4, 5, 6]) {
      const table = deserializeTea({ v: STATE_VERSION, position, finished: true, seed, puddles: largest.puddles }, null)
      expect(bytes(table)).toBeLessThan(bytes(largest))
      for (const thing of table.things) expect(thing.id.length).toBeLessThanOrEqual(longest)
    }
  })

  it('returns nothing that shares an array or a record with what it was given', () => {
    const state = played(true), record = stored(state), world = worldOf(state)
    expect(shares(serializeTea(state), state)).toBe(false)
    expect(shares(deserializeTea(record, null), record)).toBe(false)
    expect(shares(world, state)).toBe(false)
    expect(shares(withWorld(state, world), state) || shares(withWorld(state, world), world)).toBe(false)
    expect(shares(freshTeaState(null), freshTeaState(null)) || shares(largestState(), largestState())).toBe(false)
    pourInto(world, 'cup-mouse', 0.5)
    expect(worldOf(state)).not.toEqual(world)
    expect(withWorld(state, world)).toEqual({ ...state, things: world.things, puddles: world.puddles })
  })
})
