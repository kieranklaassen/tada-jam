import { describe, expect, it } from 'vitest'
import { CUP_HOLDS, POT } from './forms'
import { callPot, carry, freeSpot, pickUp, pressPot, putDown, releasePot, settle, swapSeats, tapThing, thingAt, wringIfFull, type HandEvent } from './hands'
import { LIFT_AFTER, guestCircles, nextSitting, openGame, placeOf, seatOf, stored, tick, type Game, type GameEvent } from './host'
import { CLOTH, POT_ROW_Z, ROW_FRONT, TRAY } from './layout'
import { nextSeed } from './order'
import { POUR, clearOf, footprint, gapBetween, spoutSpot } from './pour'
import { freshTeaState, serializeTea, type TeaState } from './save'
import { pourInto, puddled, spill, teaOut, thingById, type GuestId, type Thing } from './world'

function play(game: Game, seconds: number): GameEvent[] {
  const events: GameEvent[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...tick(game, 1 / 60))
  return events
}
const at = (position: string, over: Partial<TeaState> = {}): Game => {
  const game = openGame(JSON.parse(JSON.stringify(serializeTea({ ...freshTeaState(null), position, finished: true, ...over }))), null)
  nextSitting(game)
  // The pot hops to the first cup of the new table: it has landed before anything is tried.
  for (let i = 0; i < 30; i++) tick(game, 1 / 60)
  return game
}
/** Takes a thing up and puts it down at a spot or on a guest. */
function move(game: Game, id: string, to: { x: number; z: number }, guest: GuestId | null = null): HandEvent[] {
  expect(pickUp(game, id)).not.toBe(null)
  carry(game, to)
  return putDown(game, to, guest)
}
const result = (events: HandEvent[]) => events.find((event) => event.type === 'put')
/** No two things that stand on the cloth themselves overlap, and nothing stands off the cloth. */
function expectApart(game: Game, label: string): void {
  const standing = game.world.things.filter((thing) => thing.on === null && thing.heldBy === null)
  for (let i = 0; i < standing.length; i++) {
    for (let j = i + 1; j < standing.length; j++) {
      const a = standing[i], b = standing[j]
      if (a.kind === 'pot' || b.kind === 'pot') continue
      expect(gapBetween(a, b), `${label}: ${a.id} and ${b.id}`).toBeGreaterThan(-1e-6)
    }
    expect(standing[i].x).toBeGreaterThan(CLOTH.minX)
    expect(standing[i].x).toBeLessThan(CLOTH.maxX)
    expect(standing[i].z).toBeGreaterThan(CLOTH.minZ)
    expect(standing[i].z).toBeLessThan(CLOTH.maxZ)
  }
}

describe('laying a place', () => {
  it('takes the top saucer of the stack, lays it at the place, and the guest sets its cup on it', () => {
    const game = at('lay-a-place')
    const who = game.tea.guests[0].who
    expect(pickUp(game, 'saucer-0')).toBe('saucer-3')
    carry(game, placeOf(game, who))
    const events = putDown(game, { x: placeOf(game, who).x + 0.4, z: placeOf(game, who).z - 0.3 }, null)
    expect(result(events)).toMatchObject({ result: 'lay', id: 'saucer-3' })
    expect(events).toContainEqual({ type: 'set-cup', who, cup: `cup-${who}`, saucer: 'saucer-3' })
    expect(thingById(game.world, 'saucer-3')).toMatchObject(placeOf(game, who))
    expect(thingById(game.world, `cup-${who}`)).toMatchObject({ on: 'saucer-3', heldBy: null, ...placeOf(game, who) })
    expect(thingById(game.world, 'saucer-2')!.on).toBe('saucer-1')
  })

  it('lays a spoon by the place, and the Hen then has what she needs', () => {
    const game = at('halfway')
    move(game, 'saucer-0', placeOf(game, 'hen'))
    pourInto(game.world, 'cup-hen', 0.5)
    expect(play(game, LIFT_AFTER + 0.5)).toContainEqual({ type: 'waits', who: 'hen', why: 'no-spoon' })
    const spot = { x: placeOf(game, 'hen').x - 1.32, z: placeOf(game, 'hen').z + 0.1 }
    expect(result(move(game, 'spoon-3', spot))).toMatchObject({ result: 'lay' })
    const lifted = play(game, 2).find((event) => event.type === 'lift')
    expect(lifted).toMatchObject({ who: 'hen' })
  })

  it('puts a saucer back on the stack, and never stacks one that carries a cup', () => {
    const game = at('lay-a-place')
    const who = game.tea.guests[0].who
    move(game, 'saucer-0', placeOf(game, who))
    expect(result(move(game, 'saucer-3', { x: TRAY.saucers.x + 0.3, z: TRAY.saucers.z }))).toMatchObject({ result: 'set-down' })
    expectApart(game, 'a laden saucer by the stack')
    move(game, `cup-${who}`, { x: 0, z: 1.5 })
    expect(result(move(game, 'saucer-3', TRAY.saucers))).toMatchObject({ result: 'stack', onto: 'saucer-2' })
    expect(thingById(game.world, 'saucer-3')).toMatchObject({ on: 'saucer-2', ...TRAY.saucers })
  })

  it('slides a saucer under a cup that stands on the bare cloth', () => {
    const game = openGame(null, null)
    move(game, 'cup-bear', { x: -3.6, z: 2 })
    const cup = thingById(game.world, 'cup-bear')!
    expect(cup).toMatchObject({ on: null, x: -3.6, z: 2 })
    // His own saucer, the only one on the table at the first sitting.
    const events = move(game, 'saucer-3', { x: cup.x + 0.3, z: cup.z })
    expect(result(events)).toMatchObject({ result: 'cup-hops-on', onto: 'cup-bear' })
    expect(cup.on).toBe('saucer-3')
    expect(thingById(game.world, 'saucer-3')).toMatchObject({ x: cup.x, z: cup.z })
  })
})

describe('a cup', () => {
  it('tips all its tea into another cup, the bowl or the pot, and goes back where it came from', () => {
    const game = at('two-guests')
    for (const guest of game.tea.guests) move(game, 'saucer-0', placeOf(game, guest.who))
    pourInto(game.world, 'cup-mouse', 0.15)
    const events = move(game, 'cup-mouse', placeOf(game, 'bear'))
    expect(result(events)).toMatchObject({ result: 'tip-in', onto: 'cup-bear' })
    expect(thingById(game.world, 'cup-bear')!.tea).toBeCloseTo(0.15, 9)
    expect(thingById(game.world, 'cup-mouse')).toMatchObject({ tea: 0, ...placeOf(game, 'mouse') })
    move(game, 'cup-bear', { x: game.pot.x, z: game.pot.z })
    expect(teaOut(game.world)).toBe(0)
  })

  it('shows that the Mouse\'s drop fills the thimble and the Hen\'s cup tipped twice fills the Bear\'s', () => {
    const game = at('three-cups')
    const thimble = game.world.things.find((thing) => thing.kind === 'cup' && thing.size === 'thimble')!
    const small = game.world.things.find((thing) => thing.kind === 'cup' && thing.size === 'small')!
    const house = game.world.things.find((thing) => thing.kind === 'cup' && thing.size === 'house')!
    pourInto(game.world, small.id, CUP_HOLDS.small)
    move(game, small.id, house)
    pourInto(game.world, small.id, CUP_HOLDS.small)
    move(game, small.id, house)
    // Full but for the dots a brimful cup drips on its way: nothing is lost, they are on the cloth.
    expect(house.tea).toBeGreaterThan(0.99)
    expect(house.tea + puddled(game.world)).toBeCloseTo(1, 9)
    move(game, house.id, thimble)
    expect(thimble.tea).toBeCloseTo(CUP_HOLDS.thimble, 9)
    expect(puddled(game.world)).toBeCloseTo(1 - CUP_HOLDS.thimble, 9)
  })

  it('leaves a dotted trail when it is carried full to the brim, and none when it is not', () => {
    const game = openGame(null, null)
    pourInto(game.world, 'cup-bear', 1)
    pickUp(game, 'cup-bear')
    let dots = 0
    for (let step = 1; step <= 30; step++) if (carry(game, { x: -5.5 + step * 0.17, z: 2.6 }) > 0) dots++
    putDown(game, { x: -0.4, z: 2.6 }, null)
    expect(dots).toBeGreaterThanOrEqual(3)
    expect(dots).toBeLessThanOrEqual(6)
    const cup = thingById(game.world, 'cup-bear')!
    expect(cup.tea).toBeLessThan(0.98)
    expect(cup.tea + puddled(game.world)).toBeCloseTo(1, 9)
    // No longer brimful: it drips no more.
    pickUp(game, 'cup-bear')
    for (let step = 1; step <= 30; step++) expect(carry(game, { x: -0.4 - step * 0.17, z: 2.6 })).toBe(0)
    putDown(game, { x: -5.5, z: 2.6 }, null)
  })

  it('is a hat on a guest: it stays there, what was in it runs onto the cloth, and it is not a cup to drink from', () => {
    const game = openGame(null, null)
    pourInto(game.world, 'cup-bear', 0.4)
    const events = move(game, 'cup-bear', seatOf(game, 'bear'), 'bear')
    expect(result(events)).toMatchObject({ result: 'hat', guest: 'bear' })
    expect(thingById(game.world, 'cup-bear')).toMatchObject({ heldBy: 'bear', worn: true, tea: 0 })
    expect(puddled(game.world)).toBeCloseTo(0.4, 9)
    expect(play(game, 3).filter((event) => event.type === 'lift')).toEqual([])
    const back = openGame(JSON.parse(JSON.stringify(stored(game))), null)
    expect(thingById(back.world, 'cup-bear')).toMatchObject({ heldBy: 'bear', worn: true })
    // The child takes the hat off and sets it on its saucer again.
    move(game, 'cup-bear', placeOf(game, 'bear'))
    expect(thingById(game.world, 'cup-bear')).toMatchObject({ heldBy: null, worn: false })
    expect(thingById(game.world, 'cup-bear')!.on).toMatch(/^saucer-/)
  })
})

describe('a spoon, a saucer and the sponge', () => {
  it('stirs in a cup, rests on a saucer, balances on a nose', () => {
    const game = openGame(null, null)
    const place = placeOf(game, 'bear')
    expect(result(move(game, 'spoon-3', place))).toMatchObject({ result: 'stir', onto: 'cup-bear' })
    expect(thingById(game.world, 'spoon-3')).toMatchObject({ on: 'cup-bear', ...place })
    expect(result(move(game, 'spoon-3', { x: place.x + 0.85, z: place.z }))).toMatchObject({ result: 'rest' })
    expect(result(move(game, 'spoon-3', seatOf(game, 'bear'), 'bear'))).toMatchObject({ result: 'nose-balance' })
    expect(thingById(game.world, 'spoon-3')).toMatchObject({ heldBy: 'bear', worn: true })
  })

  it('lets a saucer slide off a guest onto the cloth, and the sponge wipe a face and land beside', () => {
    const game = at('two-guests')
    expect(result(move(game, 'saucer-0', seatOf(game, 'bear'), 'bear'))).toMatchObject({ result: 'flat-hat' })
    expect(thingById(game.world, 'saucer-3')).toMatchObject({ heldBy: null, on: null })
    spill(game.world, { x: 3, z: 0 }, 0.2)
    play(game, 0.1)
    expect(result(move(game, 'sponge', seatOf(game, 'bear'), 'bear'))).toMatchObject({ result: 'wipe-face' })
    expectApart(game, 'after a hat and a wipe')
  })

  it('dabs a thimbleful out of a cup and lies on it; a tap then gives the tea back; anywhere else a tap squirts a drop', () => {
    const game = openGame(null, null)
    spill(game.world, { x: 3, z: 0 }, 0.01)
    play(game, 0.1)
    pourInto(game.world, 'cup-bear', 0.6)
    expect(result(move(game, 'sponge', placeOf(game, 'bear')))).toMatchObject({ result: 'dab', onto: 'cup-bear' })
    expect(thingById(game.world, 'sponge')).toMatchObject({ on: 'cup-bear' })
    expect(thingById(game.world, 'cup-bear')!.tea).toBeCloseTo(0.6 - CUP_HOLDS.thimble, 9)
    expect(tapThing(game, 'sponge')[0]).toMatchObject({ type: 'tapped', gave: CUP_HOLDS.thimble, squirted: 0 })
    expect(thingById(game.world, 'cup-bear')!.tea).toBeCloseTo(0.6, 9)
    // Let go on the cloth it wrings itself out, so it can always wipe again; tea poured on it it keeps, and a tap squirts a drop.
    move(game, 'sponge', placeOf(game, 'bear'))
    const put = move(game, 'sponge', { x: -3, z: 1.5 })
    expect(result(put)).toMatchObject({ result: 'set-down' })
    expect(thingById(game.world, 'sponge')!.tea).toBe(0)
    expect(tapThing(game, 'sponge')[0]).toMatchObject({ squirted: 0 })
    pourInto(game.world, 'sponge', 0.2)
    const before = puddled(game.world)
    expect(tapThing(game, 'sponge')[0]).toMatchObject({ squirted: 0.03 })
    expect(puddled(game.world)).toBeCloseTo(before + 0.03, 9)
  })
})

describe('the pot and the guests', () => {
  it('lets the Bear drink from the spout: what is poured at him is gone, and on the Mouse it runs onto the cloth', () => {
    const game = at('two-guests')
    callPot(game, { id: null, guest: 'bear', spot: seatOf(game, 'bear') })
    play(game, 0.6)
    expect(game.overGuest).toBe('bear')
    pressPot(game)
    play(game, 1)
    releasePot(game)
    play(game, 1)
    expect(teaOut(game.world)).toBe(0)
    pickUp(game, 'pot')
    carry(game, seatOf(game, 'mouse'))
    expect(result(putDown(game, seatOf(game, 'mouse'), 'mouse'))).toMatchObject({ result: 'drink-from-spout', guest: 'mouse' })
    play(game, 0.6)
    expect(game.overGuest).toBe('mouse')
    expect(Math.hypot(spoutSpot(game.pot).x - seatOf(game, 'mouse').x, spoutSpot(game.pot).z - seatOf(game, 'mouse').z - 0.5)).toBeLessThan(1e-6)
    pressPot(game)
    play(game, 1)
    releasePot(game)
    play(game, 1)
    expect(puddled(game.world)).toBeGreaterThan(0.1)
  })

  it('empties the bowl back into the pot', () => {
    const game = at('drop', { tools: { sponge: true, bowl: true } })
    pourInto(game.world, 'bowl', 1.2)
    const bowl = thingById(game.world, 'bowl')!
    Object.assign(bowl, { x: -1, z: 0.5 })
    pickUp(game, 'pot')
    carry(game, { x: bowl.x - Math.cos(game.pot.heading) * 2.75, z: bowl.z - Math.sin(game.pot.heading) * 2.75 })
    expect(game.pot.over).toBe('bowl')
    expect(result(putDown(game, bowl, null))).toMatchObject({ result: 'empty-bowl', onto: 'bowl' })
    expect(bowl.tea).toBe(0)
  })

  it('swaps two guests\' seats with their cups: on the saucer at the new place, or in the paw where none lies', () => {
    const game = at('two-guests')
    const [left, right] = game.tea.guests.map((guest) => guest.who)
    move(game, 'saucer-0', placeOf(game, left))
    const leftPlace = placeOf(game, left), rightPlace = placeOf(game, right)
    expect(swapSeats(game, left, right)).toEqual([{ type: 'swap', a: left, b: right }])
    expect(placeOf(game, left)).toEqual(rightPlace)
    expect(placeOf(game, right)).toEqual(leftPlace)
    expect(thingById(game.world, `cup-${right}`)).toMatchObject({ on: 'saucer-3', heldBy: null, ...leftPlace })
    expect(thingById(game.world, `cup-${left}`)).toMatchObject({ on: null, heldBy: left, worn: false, ...rightPlace })
    expect(swapSeats(game, left, left)).toEqual([])
  })
})

describe('nothing comes to rest in anything', () => {
  it('through four hundred picks and puts all over the table, at every position', () => {
    for (const position of ['brim', 'two-guests', 'three-cups', 'full-table']) {
      const game = at(position, { tools: { sponge: true, bowl: true } })
      let seed = 99
      const draw = () => ((seed = nextSeed(seed)) % 100000) / 100000
      for (let turn = 0; turn < 400; turn++) {
        const pool = game.world.things.filter((thing) => thing.kind !== 'pot')
        const thing: Thing = pool[Math.floor(draw() * pool.length)]
        const to = { x: CLOTH.minX + draw() * (CLOTH.maxX - CLOTH.minX), z: CLOTH.minZ + draw() * (CLOTH.maxZ - CLOTH.minZ) }
        const onGuest = draw() < 0.1 ? game.tea.guests[Math.floor(draw() * game.tea.guests.length)].who : null
        if (pickUp(game, thing.id) === null) continue
        carry(game, to)
        putDown(game, to, onGuest)
        settle(game.world)
        expectApart(game, `${position}, turn ${turn}`)
        expect(game.hand).toBe(null)
      }
      expect(Number.isFinite(teaOut(game.world))).toBe(true)
    }
  })

  it('finds a free spot beside a crowd, and the thing a spot is on', () => {
    const game = openGame(null, null)
    const place = placeOf(game, 'bear')
    expect(thingAt(game.world, place, '')!.id).toBe('cup-bear')
    expect(thingAt(game.world, { x: place.x + 0.85, z: place.z }, '')!.kind).toBe('saucer')
    expect(thingAt(game.world, { x: -3, z: 1 }, '')).toBeUndefined()
    const free = freeSpot(game.world, { ...thingById(game.world, 'spoon-3')!, id: 'another', kind: 'cup' }, place)!
    expect(Math.hypot(free.x - place.x, free.z - place.z)).toBeGreaterThan(1.5)
  })
})

describe('a full sponge', () => {
  it('wrings itself out in the hand, so one long carry wipes a puddle of any size', () => {
    const game = openGame(null, null)
    spill(game.world, { x: -2, z: 1.5 }, 1.2)
    play(game, 0.1)
    pickUp(game, 'sponge')
    let turn = 0
    for (let lap = 0; lap < 40 && puddled(game.world) > 0.001; lap++) {
      for (let i = 0; i <= 30; i++, turn++) {
        carry(game, { x: -4 + i * 0.13, z: 0.4 + (lap % 5) * 0.5 })
        wringIfFull(game, 'sponge')
      }
    }
    expect(puddled(game.world)).toBeLessThan(0.001)
    expect(turn).toBeGreaterThan(30)
    // A sponge that lies on a cup keeps its tea, to give back at a tap.
    putDown(game, { x: 3, z: 1 }, null)
    pourInto(game.world, 'cup-bear', 0.9)
    for (let i = 0; i < 3; i++) move(game, 'sponge', placeOf(game, 'bear'))
    expect(wringIfFull(game, 'sponge')).toBe(0)
    expect(thingById(game.world, 'sponge')!.tea).toBeGreaterThan(0.1)
  })
})

describe('the pot on a full table', () => {
  it('finds free room to pour into every cup and at every guest, clear of every thing and every guest, at every position', () => {
    const unreached: string[] = []
    for (const position of ['three-guests', 'three-cups', 'full-table']) {
      for (const seed of [3, 5, 8, 12, 77]) {
        const game = at(position, { seed, tools: { sponge: true, bowl: true } })
        for (const guest of game.tea.guests) {
          move(game, 'saucer-0', placeOf(game, guest.who))
          const spoon = game.world.things.find((thing) => thing.kind === 'spoon' && thing.z > 2.5)
          if (spoon) move(game, spoon.id, { x: placeOf(game, guest.who).x - 1.32, z: placeOf(game, guest.who).z + 0.12 })
        }
        // The pot has gone with the first cup to its saucer, or out of the way of a place: it has landed before it is called.
        play(game, 1)
        const targets = [
          ...game.world.things.filter((thing) => thing.kind === 'cup').map((thing) => ({ id: thing.id as string | null, guest: null as GuestId | null, spot: { x: thing.x, z: thing.z } })),
          ...game.tea.guests.map((guest) => ({ id: null, guest: guest.who as GuestId | null, spot: seatOf(game, guest.who) })),
        ]
        for (const target of targets) {
          const stood = { x: game.pot.x, z: game.pot.z }
          callPot(game, target)
          play(game, 0.6)
          const label = `${position}, seed ${seed}, ${target.id ?? target.guest}`
          expect(game.pot.hop, label).toBe(null)
          // Every cup can be poured into. A guest whose place is laid, at a table too full to stand before it, is the
          // one thing the pot may not come to: it then stays where it stood, never in the row.
          if (target.guest && game.overGuest !== target.guest) {
            unreached.push(label)
            expect(Math.hypot(game.pot.x - stood.x, game.pot.z - stood.z), label).toBeLessThan(1e-3)
            expect(game.pot.z - POT.bellyR, label).toBeGreaterThanOrEqual(ROW_FRONT - 1e-9)
            continue
          }
          expect(clearOf(game.world, game.pot, 1.0, guestCircles(game)), label).toBe(true)
          expect(game.pot.reach, label).toBeLessThanOrEqual(POUR.farthest + 1e-9)
          // Never in the guests' row: the pot is in front of everybody, where a finger finds it.
          expect(game.pot.z - POT.bellyR, label).toBeGreaterThanOrEqual(ROW_FRONT - 1e-9)
          const want = target.guest ? { x: target.spot.x, z: target.spot.z + 0.5 } : target.spot
          expect(Math.hypot(spoutSpot(game.pot).x - want.x, spoutSpot(game.pot).z - want.z), label).toBeLessThan(1e-6)
          if (target.id) expect(game.pot.over, label).toBe(target.id)
          else expect(game.overGuest, label).toBe(target.guest)
        }
      }
    }
    // Only at three cups, while the three plain cups still stand on the tray behind the laid places.
    expect(unreached.every((label) => label.startsWith('three-cups') || label.startsWith('full-table'))).toBe(true)
    expect(unreached.length).toBeLessThan(15)
  })

  it('stands in front of a place, on the child\'s side, when one or two guests sit at laid places with the tools out', () => {
    for (const position of ['brim', 'drop', 'lay-a-place', 'two-guests', 'halfway', 'twins', 'whose-cup']) {
      const game = at(position, { seed: 7, tools: { sponge: true, bowl: true } })
      for (const guest of game.tea.guests) {
        if (!game.world.things.some((thing) => thing.kind === 'saucer' && Math.hypot(thing.x - placeOf(game, guest.who).x, thing.z - placeOf(game, guest.who).z) < 0.1)) move(game, 'saucer-0', placeOf(game, guest.who))
      }
      for (const cup of game.world.things.filter((thing) => thing.kind === 'cup' && thing.on !== null)) {
        callPot(game, { id: cup.id, guest: null, spot: cup })
        play(game, 0.6)
        expect(game.pot.z, `${position}, ${cup.id}`).toBeGreaterThan(cup.z + 0.5)
        expect(game.pot.z - 1.0, `${position}, ${cup.id}`).toBeGreaterThanOrEqual(ROW_FRONT)
      }
    }
  })

  it('is called to the front of the guests\' row by a tap on the cloth in it', () => {
    const game = at('brim')
    callPot(game, { id: null, guest: null, spot: { x: -4, z: -2.4 } })
    play(game, 0.6)
    expect(spoutSpot(game.pot).z).toBeGreaterThanOrEqual(ROW_FRONT)
    expect(game.pot.z - 1.0).toBeGreaterThanOrEqual(ROW_FRONT)
  })

  it('comes to a cup in a paw when that cup is tapped, and pours into it there', () => {
    const game = at('lay-a-place')
    const who = game.tea.guests[0].who
    const cup = thingById(game.world, `cup-${who}`)!
    expect(cup.heldBy).toBe(who)
    callPot(game, { id: cup.id, guest: null, spot: cup })
    play(game, 0.6)
    expect(game.pot.over).toBe(cup.id)
    // Its spout is over the cup where the paw holds it, before the guest, and not over the empty place.
    expect(spoutSpot(game.pot).z).toBeLessThan(placeOf(game, who).z - 0.3)
    pressPot(game)
    play(game, 1)
    releasePot(game)
    expect(cup.tea).toBeGreaterThan(0.1)
    expect(puddled(game.world)).toBe(0)
    // Called to the bare place instead, it pours on the cloth: the cup is not there.
    const before = cup.tea
    callPot(game, { id: null, guest: null, spot: placeOf(game, who) })
    play(game, 0.6)
    expect(game.pot.over).toBe(null)
    pressPot(game)
    play(game, 0.5)
    releasePot(game)
    play(game, 0.5)
    expect(cup.tea).toBe(before)
    expect(puddled(game.world)).toBeGreaterThan(0)
  })

  it('pours on what is under its spout now: a cup carried off since it came gets nothing', () => {
    const game = openGame(null, null)
    callPot(game, { id: 'cup-bear', guest: null, spot: thingById(game.world, 'cup-bear')! })
    play(game, 0.6)
    expect(game.pot.over).toBe('cup-bear')
    move(game, 'cup-bear', { x: -4, z: 2.5 })
    pressPot(game)
    play(game, 0.6)
    releasePot(game)
    play(game, 0.5)
    expect(thingById(game.world, 'cup-bear')!.tea).toBe(0)
    expect(game.pot.over).toBe('saucer-3')
    expect(thingById(game.world, 'saucer-3')!.tea).toBeGreaterThan(0)
  })

  it('waits beside the first guest\'s cup in its paw, goes with the cup to its saucer, and makes room for the next place and its spoon', () => {
    const game = at('two-guests', { seed: 3 })
    const [first, second] = [...game.tea.guests].sort((a, b) => a.seat - b.seat)
    expect(game.pot.over).toBe(`cup-${first.who}`)
    expect(thingById(game.world, `cup-${first.who}`)!.heldBy).toBe(first.who)
    move(game, 'saucer-0', placeOf(game, first.who))
    play(game, 0.6)
    // Beside the cup on its saucer now, its spout over it.
    expect(game.pot.over).toBe(`cup-${first.who}`)
    expect(Math.hypot(spoutSpot(game.pot).x - placeOf(game, first.who).x, spoutSpot(game.pot).z - placeOf(game, first.who).z)).toBeLessThan(1e-6)
    // The second place and its spoon are laid where they belong, whatever stood there.
    expect(result(move(game, 'saucer-0', placeOf(game, second.who)))).toMatchObject({ result: 'lay' })
    const spoon = game.world.things.find((thing) => thing.kind === 'spoon' && thing.z > 2.5)!
    const beside = { x: placeOf(game, second.who).x - 1.32, z: placeOf(game, second.who).z + 0.12 }
    expect(result(move(game, spoon.id, beside))).toMatchObject({ result: 'lay' })
    expect(spoon).toMatchObject({ x: beside.x, z: beside.z })
    play(game, 1.2)
    expect(game.pot.hop).toBe(null)
    expect(clearOf(game.world, game.pot, 1.0, guestCircles(game))).toBe(true)
  })

  it('hops out of the way when a place is laid where it stands', () => {
    const game = at('three-guests', { seed: 3 })
    const [first, second] = game.tea.guests
    move(game, 'saucer-0', placeOf(game, first.who))
    callPot(game, { id: `cup-${first.who}`, guest: null, spot: thingById(game.world, `cup-${first.who}`)! })
    play(game, 0.6)
    // Beside the first cup it stands where the second place will be laid.
    const events = move(game, 'saucer-0', placeOf(game, second.who))
    expect(result(events)).toMatchObject({ result: 'lay' })
    expect(thingById(game.world, `cup-${second.who}`)!.on).not.toBe(null)
    play(game, 0.6)
    expect(game.pot.hop).toBe(null)
    expect(clearOf(game.world, game.pot, 1.0, guestCircles(game))).toBe(true)
  })

  it('hops out of the guests\' row when two of them change seats', () => {
    const game = at('three-guests', { seed: 3 })
    for (const guest of game.tea.guests) move(game, 'saucer-0', placeOf(game, guest.who))
    // Called to pour for the middle guest on a laid table, it stands between two guests.
    callPot(game, { id: null, guest: game.tea.guests[1].who, spot: seatOf(game, game.tea.guests[1].who) })
    play(game, 0.6)
    const inRow = game.pot.z - 1.0 < ROW_FRONT
    swapSeats(game, game.tea.guests[0].who, game.tea.guests[1].who)
    play(game, 0.8)
    expect(game.pot.hop).toBe(null)
    expect(game.pot.z - 1.0).toBeGreaterThanOrEqual(ROW_FRONT)
    expect(clearOf(game.world, game.pot, 1.0, guestCircles(game))).toBe(true)
    if (inRow) expect(game.pot.over).toBe(null)
  })

  it('sets nothing down in the guests\' row: a thing let go there comes down in front of it', () => {
    const game = at('two-guests', { tools: { sponge: true, bowl: true } })
    for (const id of ['spoon-0', 'sponge', 'saucer-0']) {
      for (const x of [-4, -2.1, 0, 2.1, 4]) {
        move(game, id, { x, z: -1.6 })
        const thing = game.world.things.find((candidate) => candidate.heldBy === null && candidate.on === null && Math.abs(candidate.x - x) < 3 && candidate.kind === (id === 'sponge' ? 'sponge' : id.startsWith('spoon') ? 'spoon' : 'saucer') && candidate.z < 2.4)
        if (thing) expect(thing.z - footprint(thing), `${id} at ${x}`).toBeGreaterThanOrEqual(ROW_FRONT - 1e-9)
      }
    }
    expectApart(game, 'after the row')
  })

  it('is kept in front of the guests when it is carried, and is on a guest when its spout is over one', () => {
    const game = at('two-guests')
    pickUp(game, 'pot')
    carry(game, seatOf(game, 'bear'))
    expect(game.pot.z).toBeGreaterThanOrEqual(POT_ROW_Z)
    expect(clearOf(game.world, game.pot, 1.0, guestCircles(game))).toBe(true)
  })
})

describe('a pot let go in the guests\' row', () => {
  it('is set down on the nearest free spot in front of the places, also when it was carried to a guest it has no room to stand before', () => {
    const game = at('three-cups', { seed: 3, tools: { sponge: true, bowl: true } })
    for (const guest of game.tea.guests) {
      move(game, 'saucer-0', placeOf(game, guest.who))
      const spoon = game.world.things.find((thing) => thing.kind === 'spoon' && thing.z > 2.5)
      if (spoon) move(game, spoon.id, { x: placeOf(game, guest.who).x - 1.32, z: placeOf(game, guest.who).z + 0.12 })
    }
    play(game, 1)
    // The guest in the middle, with the three plain cups still on the tray behind the laid places: no room before it.
    const middle = game.tea.guests[1].who
    callPot(game, { id: null, guest: middle, spot: seatOf(game, middle) })
    play(game, 0.6)
    expect(game.overGuest).not.toBe(middle)
    pickUp(game, 'pot')
    carry(game, seatOf(game, middle))
    // In the hand it is already kept in front of the row.
    expect(game.pot.z).toBeGreaterThanOrEqual(POT_ROW_Z - 1e-9)
    expect(result(putDown(game, seatOf(game, middle), middle))).toMatchObject({ result: 'set-down' })
    play(game, 0.8)
    expect(game.pot.hop).toBe(null)
    expect(game.overGuest).not.toBe(middle)
    expect(game.pot.z).toBeGreaterThanOrEqual(POT_ROW_Z - 1e-9)
    expect(clearOf(game.world, game.pot, 1.0, guestCircles(game))).toBe(true)
    // A guest it has room before is still served from the spout, as ever.
    const last = game.tea.guests[2].who
    pickUp(game, 'pot')
    carry(game, seatOf(game, last))
    expect(result(putDown(game, seatOf(game, last), last))).toMatchObject({ result: 'drink-from-spout', guest: last })
  })
})

describe('a thing put down on the stack of saucers', () => {
  it('stands on the top saucer, wherever on the stack the finger let go', () => {
    const game = at('three-guests', { seed: 9 })
    const stack = game.world.things.filter((thing) => thing.kind === 'saucer' && Math.hypot(thing.x - TRAY.saucers.x, thing.z - TRAY.saucers.z) < 0.05)
    const top = stack.find((saucer) => !stack.some((other) => other.on === saucer.id))!
    expect(stack.length).toBeGreaterThan(1)
    const spoon = game.world.things.find((thing) => thing.kind === 'spoon')!
    move(game, spoon.id, { x: TRAY.saucers.x + 0.3, z: TRAY.saucers.z - 0.2 })
    expect(spoon.on).toBe(top.id)
    expect(thingAt(game.world, TRAY.saucers, spoon.id)!.id).toBe(top.id)
  })
})
