import { describe, expect, it } from 'vitest'
import { FRAME_MOVES } from './frame'
import { THING_MOVES, knows } from './gestures'
import { GOES_IN, GRID, SENDS, SHORT, heldOf, playing, resolve, schedule, soundNames, type Held } from './pairings'
import { ACTS } from './voices'
import { PLACE_IDS, RING, THINGS, type PlaceId, type ThingId } from './yard'

const empty = (): Held => heldOf(() => 'floor')
const holding = (held: Partial<Record<PlaceId, ThingId>>): Held => ({ ...empty(), ...held })

/** Every way the other five things can lie in the five places, some of them empty. */
function* arrangements(carried: ThingId): Generator<Held> {
  const others = THINGS.filter((id) => id !== carried)
  function* fill(index: number, held: Held, used: Set<ThingId>): Generator<Held> {
    if (index === PLACE_IDS.length) { yield { ...held }; return }
    const place = PLACE_IDS[index]
    yield* fill(index + 1, { ...held, [place]: null }, used)
    for (const id of others) {
      if (used.has(id)) continue
      used.add(id)
      yield* fill(index + 1, { ...held, [place]: id }, used)
      used.delete(id)
    }
  }
  yield* fill(0, empty(), new Set())
}

describe('the grid', () => {
  it('has thirty cells, each with something seen and something heard, and no sound of a cell is left without a voice', () => {
    let cells = 0
    for (const thing of THINGS) for (const place of PLACE_IDS) {
      const cell = GRID[thing][place]
      cells++
      expect(cell.acts.length, `${thing} ${place}`).toBeGreaterThan(1)
      expect(cell.acts.some((act) => act.sound), `${thing} ${place}`).toBe(true)
      for (const act of cell.acts) {
        expect(act.at + act.len, `${thing} ${place} ${act.does}`).toBeLessThanOrEqual(cell.ends + 1e-9)
        if (act.sound) expect(ACTS[act.sound], act.sound).toBeDefined()
      }
    }
    expect(cells).toBe(30)
    for (const name of soundNames()) expect(ACTS[name]?.length, name).toBeGreaterThan(0)
    expect(Object.keys(ACTS).sort()).toEqual(soundNames().sort())
  })

  it('gives every act a move that somebody draws', () => {
    const drawn = (who: string, does: string): boolean =>
      who === 'thing' ? THING_MOVES.includes(does) : knows(who as never, does) || (FRAME_MOVES[who as keyof typeof FRAME_MOVES] ?? []).includes(does)
    for (const thing of THINGS) for (const place of PLACE_IDS) for (const act of GRID[thing][place].acts) expect(drawn(act.who, act.does), `${thing} ${place}: ${act.who} ${act.does}`).toBe(true)
    for (const place of PLACE_IDS) expect(drawn(SENDS[place].who, SENDS[place].does), place).toBe(true)
  })

  it('has no row and no column with one sound across it, and no two cells that sound alike', () => {
    const voice = (thing: ThingId, place: PlaceId): string => JSON.stringify(GRID[thing][place].acts.filter((act) => act.sound).map((act) => ACTS[act.sound!]))
    const all = new Set<string>()
    for (const thing of THINGS) {
      const row = new Set(PLACE_IDS.map((place) => voice(thing, place)))
      expect(row.size, thing).toBe(PLACE_IDS.length)
      for (const v of row) all.add(v)
    }
    for (const place of PLACE_IDS) expect(new Set(THINGS.map((thing) => voice(thing, place))).size, place).toBe(THINGS.length)
    expect(all.size).toBe(30)
  })

  it('plays a pairing by itself for 4 to 8 seconds, and has a short form of about a second and a half with a sound in it', () => {
    for (const thing of THINGS) for (const place of PLACE_IDS) {
      const plan = schedule(resolve(empty(), thing, place))
      expect(plan.round).toBe(false)
      expect(plan.total, `${thing} ${place}`).toBeGreaterThanOrEqual(4)
      expect(plan.total, `${thing} ${place}`).toBeLessThanOrEqual(8)
      const cell = GRID[thing][place], [w0, w1] = cell.short
      expect(w1 - w0).toBeCloseTo(SHORT, 5)
      expect(w0).toBeGreaterThanOrEqual(0)
      expect(w1).toBeLessThanOrEqual(cell.ends + 1e-9)
      expect(cell.acts.some((act) => act.sound && act.at >= w0 && act.at < w1), `${thing} ${place}: a sound in the short form`).toBe(true)
    }
  })
})

describe('a round is a thing taken to a place that is full, and nothing else', () => {
  const none: Held = { nest: null, pond: null, scarecrow: null, bowl: null, line: null }

  it('plays the boot hat in full on an empty scarecrow while the pond holds something, and the thing the splash sends on in its short form', () => {
    for (const thing of THINGS) {
      if (thing === 'boot') continue
      const plan = schedule(resolve({ ...none, pond: thing }, 'boot', 'scarecrow'))
      expect(plan.round, thing).toBe(false)
      expect(plan.timed.map((step) => [step.thing, step.place, step.from]), thing).toEqual([['boot', 'scarecrow', 'paws'], [thing, 'bowl', 'splash']])
      expect([plan.timed[0].w0, plan.timed[0].w1], thing).toEqual([0, GRID.boot.scarecrow.ends])
      expect([plan.timed[1].w0, plan.timed[1].w1], thing).toEqual(GRID[thing].bowl.short)
      expect(plan.total, thing).toBeLessThanOrEqual(10)
    }
  })

  it('is a round when the scarecrow is full, or when the splash tips the pond into a bowl that is full', () => {
    const onFull = schedule(resolve({ ...none, scarecrow: 'ball', pond: 'egg' }, 'boot', 'scarecrow'))
    expect(onFull.round).toBe(true)
    const intoFullBowl = schedule(resolve({ ...none, pond: 'egg', bowl: 'ball' }, 'boot', 'scarecrow'))
    expect(intoFullBowl.round).toBe(true)
    for (const plan of [onFull, intoFullBowl]) for (const step of plan.timed) expect([step.w0, step.w1]).toEqual(GRID[step.thing][step.place].short)
    // A thing taken to an empty place with nothing in the pond is a pairing in full, as ever.
    const alone = schedule(resolve(none, 'boot', 'scarecrow'))
    expect(alone.round).toBe(false)
    expect(alone.timed).toHaveLength(1)
  })
})

describe('what is heard is seen', () => {
  it('lets a leaf fall for every rip the crow makes in the cabbage on the scarecrow, at the moment of the rip', () => {
    const acts = GRID.cabbage.scarecrow.acts
    const rips = acts.filter((act) => act.who === 'crow' && act.does === 'pull' && act.sound)
    const falls = acts.filter((act) => act.who === 'leaves' && act.does === 'drop')
    expect(rips).toHaveLength(4)
    expect(falls.map((act) => act.at)).toEqual(rips.map((act) => act.at))
  })
})

describe('the one rule: a newcomer sends the thing that was there on to the next place', () => {
  it('passes the places in a ring of five', () => {
    let at: PlaceId = 'nest'
    const seen: PlaceId[] = []
    for (let i = 0; i < PLACE_IDS.length; i++) { seen.push(at); at = RING[at] }
    expect(at).toBe('nest')
    expect(new Set(seen).size).toBe(PLACE_IDS.length)
  })

  it('stops a thing that is sent on to an empty place', () => {
    const out = resolve(holding({ nest: 'egg' }), 'ball', 'nest')
    expect(out.steps.map((step) => [step.thing, step.place, step.from, step.sends])).toEqual([['ball', 'nest', 'paws', 'egg'], ['egg', 'pond', 'nest', null]])
    expect(out.floors).toEqual([])
    expect(out.held).toEqual(holding({ nest: 'ball', pond: 'egg' }))
  })

  it('sets a thing that comes round to where the round began down on the floor beside that place, after five outcomes', () => {
    const out = resolve(holding({ nest: 'egg', pond: 'ball', bowl: 'potato', line: 'clock', scarecrow: 'boot' }), 'cabbage', 'nest')
    expect(out.steps.map((step) => `${step.thing}>${step.place}`)).toEqual(['cabbage>nest', 'egg>pond', 'ball>bowl', 'potato>line', 'clock>scarecrow'])
    expect(out.floors).toEqual([{ thing: 'boot', from: 'scarecrow', beside: 'nest' }])
    expect(out.held).toEqual(holding({ nest: 'cabbage', pond: 'egg', bowl: 'ball', line: 'potato', scarecrow: 'clock' }))
  })

  it('has the goose, bolting from the boot hat, send on whatever is in the pond, floating or sunk, after the scarecrow\'s own old thing has gone its way', () => {
    const sunk = resolve(holding({ pond: 'potato' }), 'boot', 'scarecrow')
    expect(sunk.bolts).toBe(true)
    expect(sunk.steps.map((step) => `${step.thing}>${step.place}<${step.from}`)).toEqual(['boot>scarecrow<paws', 'potato>bowl<splash'])
    expect(sunk.held.pond).toBeNull()
    // The scarecrow's old thing goes to the nest and tips the nest's old thing into the pond she has just left.
    const both = resolve(holding({ pond: 'ball', scarecrow: 'cabbage', nest: 'egg', bowl: 'clock' }), 'boot', 'scarecrow')
    expect(both.steps.map((step) => `${step.thing}>${step.place}<${step.from}`)).toEqual(['boot>scarecrow<paws', 'cabbage>nest<scarecrow', 'egg>pond<nest', 'ball>bowl<splash', 'clock>line<bowl'])
    expect(both.held).toEqual(holding({ scarecrow: 'boot', nest: 'cabbage', pond: 'egg', bowl: 'ball', line: 'clock' }))
  })

  it('has her bolt the same when the boot reaches the scarecrow from the line in the middle of a round, with the pond full or empty', () => {
    const empty = resolve(holding({ line: 'boot' }), 'clock', 'line')
    expect(empty.bolts).toBe(true)
    expect(empty.steps.map((step) => `${step.thing}>${step.place}<${step.from}`)).toEqual(['clock>line<paws', 'boot>scarecrow<line'])
    const full = resolve(holding({ line: 'boot', pond: 'ball', scarecrow: 'egg' }), 'clock', 'line')
    expect(full.bolts).toBe(true)
    expect(full.steps.map((step) => `${step.thing}>${step.place}<${step.from}`)).toEqual(['clock>line<paws', 'boot>scarecrow<line', 'egg>nest<scarecrow', 'ball>bowl<splash'])
    expect(full.held).toEqual(holding({ line: 'clock', scarecrow: 'boot', nest: 'egg', bowl: 'ball' }))
    // A round that began at the nest: the thing just tipped into the pond is what she sends out, and the bowl has had its newcomer.
    const round = resolve(holding({ nest: 'ball', pond: 'potato', bowl: 'clock', line: 'boot', scarecrow: 'egg' }), 'cabbage', 'nest')
    expect(round.bolts).toBe(true)
    expect(round.steps).toHaveLength(5)
    expect(round.floors).toEqual([{ thing: 'egg', from: 'scarecrow', beside: 'nest' }, { thing: 'ball', from: 'splash', beside: 'bowl' }])
    expect(round.held).toEqual(holding({ nest: 'cabbage', bowl: 'potato', line: 'clock', scarecrow: 'boot' }))
    const plan = schedule(round)
    expect(plan.total).toBeLessThanOrEqual(10 + 1e-9)
    const splash = plan.travels.find((t) => t.thing === 'ball' && t.to === 'floor')!
    expect(plan.sounds.find((sound) => sound.sound === 'greatSplash')!.t).toBeCloseTo(splash.leaves, 5)
  })

  it('ends every round a child can set up after at most five outcomes and within 10 seconds, with every thing in one spot and no place holding two', () => {
    // 46,380 rounds: what is wrong is gathered and asserted once, so the test stays quick on a busy machine.
    let rounds = 0, longest = 0
    const wrong: string[] = []
    for (const carried of THINGS) {
      for (const before of arrangements(carried)) {
        for (const place of PLACE_IDS) {
          const out = resolve(before, carried, place)
          const plan = schedule(out)
          rounds++
          longest = Math.max(longest, plan.total)
          const placed = PLACE_IDS.map((id) => out.held[id]).filter((id): id is ThingId => id !== null)
          const was = PLACE_IDS.map((id) => before[id]).filter((id) => id !== null).length + 1
          const floored = out.floors.map((floor) => floor.thing)
          const ok = out.steps.length <= 5
            && plan.total <= 10 + 1e-9
            && new Set(placed).size === placed.length
            && placed.length + out.floors.length === was
            && out.floors.length <= 2
            && floored.every((thing) => !placed.includes(thing))
            && new Set(floored).size === floored.length
            && out.bolts === out.steps.some((step) => step.thing === 'boot' && step.place === 'scarecrow')
            // After the boot hat nothing that was in the pond when she landed is still in it.
            && !(out.bolts && out.held.pond !== null && out.held.pond === before.pond)
          if (!ok && wrong.length < 5) wrong.push(`${carried} into ${place} with ${JSON.stringify(before)}`)
        }
      }
    }
    expect(wrong).toEqual([])
    expect(rounds).toBe(6 * 1546 * 5)
    expect(longest).toBeGreaterThan(9)
  })
})

describe('the timeline of a scene', () => {
  it('starts each sound when its act starts, in a pairing by itself and in the short form of a round', () => {
    for (const thing of THINGS) for (const place of PLACE_IDS) {
      const cell = GRID[thing][place]
      const alone = schedule(resolve(empty(), thing, place))
      expect(alone.sounds[0]).toEqual({ t: 0, sound: 'putIn' })
      for (const act of cell.acts) if (act.sound) expect(alone.sounds, `${thing} ${place} ${act.does}`).toContainEqual({ t: GOES_IN + act.at, sound: act.sound })
      const other = THINGS.find((id) => id !== thing)!
      const round = schedule(resolve(holding({ [place]: other }), thing, place))
      expect(round.round).toBe(true)
      expect(round.sounds[0]).toEqual({ t: 0, sound: SENDS[place].sound })
      const [w0, w1] = cell.short
      for (const act of cell.acts) {
        if (!act.sound) continue
        const inside = act.at >= w0 && act.at < w1
        const found = round.sounds.some((sound) => sound.sound === act.sound && Math.abs(sound.t - (GOES_IN + act.at - w0)) < 1e-9)
        expect(found, `${thing} ${place} ${act.does} in the short form`).toBe(inside)
      }
    }
  })

  it('has every thing that is sent on leave when its place is taken and arrive as its own pairing starts, one pairing at a time', () => {
    const plan = schedule(resolve(holding({ nest: 'egg', pond: 'ball', bowl: 'potato', line: 'clock', scarecrow: 'boot' }), 'cabbage', 'nest'))
    expect(plan.timed.map((step) => step.at)).toEqual([0, 1.9, 3.8, 5.7, 7.6].map((t) => expect.closeTo(t, 5)))
    for (const step of plan.timed) {
      const travel = plan.travels.find((t) => t.thing === step.thing && t.to === step.place)!
      expect(travel.arrives).toBeCloseTo(step.at + GOES_IN, 5)
      if (step.from !== 'paws') expect(travel.leaves).toBeCloseTo(plan.timed.find((other) => other.sends === step.thing)!.at, 5)
    }
    const floor = plan.travels.find((t) => t.to === 'floor')!
    expect(floor.thing).toBe('boot')
    expect(plan.sounds[plan.sounds.length - 1]).toEqual({ t: floor.arrives, sound: 'land:boot' })
    expect(plan.total).toBeCloseTo(10, 5)
    expect(playing(plan, 2)?.index).toBe(1)
    expect(playing(plan, 9.9)?.index).toBe(4)
  })
})
