import { describe, expect, it } from 'vitest'
import * as cells from './cellVoices'
import { bowlOf, dishOf } from './forms'
import { ACTIONS, OBJECTS } from './grid'
import { callPot } from './hands'
import { GATE, WAITING } from './hint'
import { CLOTH, POT_ROW_Z } from './layout'
import { tick, dueShowing, nextSitting, openGame, placeOf, seatOf, stored, type Game } from './host'
import type { Point } from './input'
import { Play } from './play'
import { freshTeaState, serializeTea, type TeaState } from './save'
import { anchorOf, type Stage } from './stage'
import { pourInto, spill, thingById, type GuestId, type Thing } from './world'

// The game played through its own gestures on a stage that draws nothing and
// writes down what it was asked to show. What is held here: what each scene
// saves when it starts, that nothing replays on load, that a touch ends a
// scene and is then an ordinary touch, and that every cell of the grid has
// its own sound and its own motion.

const PX = 80
/** A stage with a flat camera straight above the table: 80 pixels to a unit. */
function stageOf(log: string[]): Stage {
  const sizes = (id: string) => {
    if (id.startsWith('cup-plain')) return { height: 0.4, girth: 0.45 }
    if (id.startsWith('cup')) return { height: bowlOf('house').rimY, girth: bowlOf('house').rimR }
    if (id.startsWith('saucer')) return { height: 0.11, girth: dishOf('house').rimR }
    if (id.startsWith('spoon')) return { height: 0.12, girth: 0.3 }
    if (id === 'bowl') return { height: 0.64, girth: 0.92 }
    return { height: 0.34, girth: 0.5 }
  }
  return {
    screenOf: (x, _y, z) => ({ x: 600 + x * PX, y: 400 + z * PX }),
    clothAt: (px, py) => ({ x: (px - 600) / PX, z: (py - 400) / PX }),
    sizeOf: sizes,
    showWorld: () => undefined,
    setParty: (guests, waiting, atOnce) => { log.push(`party:${guests.map((guest) => guest.who).join()}|${waiting.join()}|${atOnce}`) },
    guestDo: (who, kind) => { log.push(`do:${who}:${kind}`) },
    guestHold: (who, kind) => { log.push(`hold:${who}:${kind}`) },
    guestSettled: (who) => { log.push(`settled:${who}`) },
    guestLook: () => undefined,
    guestWalk: (who) => { log.push(`walk:${who}`) },
    guestsSeated: () => true,
    guestLeave: (who) => { log.push(`leave:${who}`) },
    guestsRest: () => { log.push('rest') },
    nudge: (id) => { log.push(`nudge:${id}`) },
    act: (id, act) => { log.push(`act:${id}:${act}`) },
    lift: (id) => { log.push(`lift:${id}`) },
    hold: (id, who, amount) => { if (who === null || amount === 0) log.push(`letgo:${id}`) },
    showTea: (id, amount) => { if (amount === null) log.push(`tea:${id}`) },
    leanPot: () => undefined,
    lean: (id, x, z) => { if (x !== 0 || z !== 0) log.push(`lean:${id}`) },
    splash: (on, reach) => { log.push(`splash:${typeof on === 'string' ? on : 'point'}:${reach}`) },
    runOver: (id) => { log.push(`runOver:${id}`) },
    tile: (px, py) => { log.push(`tile:${Math.round(px)},${Math.round(py)}`); return px > 1100 && py < 144 ? null : Math.floor(px / 100) % 5 },
    drop: () => { log.push('drop') },
    fan: (on) => { if (on) log.push('fan') },
    frame: () => ({ drawCalls: 1, triangles: 1 }),
  }
}

type Rig = { play: Play; game: Game; log: string[]; now: number; voices: string[]; changes: number[] }
function rig(game: Game): Rig {
  const log: string[] = []
  return { play: new Play(stageOf(log), game), game, log, now: 0, voices: [], changes: [] }
}
const at = (position: string, over: Partial<TeaState> = {}): Game => {
  const game = openGame(JSON.parse(JSON.stringify(serializeTea({ ...freshTeaState(null), position, finished: true, shown: ['pour', 'lay', 'halfway', 'twins', 'sizes'], ...over }))), null)
  nextSitting(game)
  // The pot hops to the first cup of the new table: it has landed before anything is tried.
  for (let i = 0; i < 30; i++) tick(game, 1 / 60)
  return game
}
/** Takes what the Mount would take after a gesture or a step. */
function settle(r: Rig): void {
  r.voices.push(...r.play.takeVoices().map((voice) => JSON.stringify(voice)))
  const change = r.play.takeChange()
  if (change > 0) r.changes.push(change)
}
function run(r: Rig, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    r.now += 1 / 60
    r.play.step(1 / 60, r.now)
    settle(r)
  }
}
/** A saucer and a spoon from the tray for every guest, as a child lays them. */
function layPlaces(r: Rig): void {
  for (const guest of r.game.tea.guests) {
    const place = placeOf(r.game, guest.who)
    drag(r, thingPoint(r, 'saucer-0'), pointOf(place))
    const spoon = r.game.world.things.find((thing) => thing.kind === 'spoon' && thing.z > 2.5)!
    drag(r, thingPoint(r, spoon.id), pointOf({ x: place.x - 1.32, z: place.z + 0.12 }))
  }
}
const pointOf = (spot: { x: number; z: number }): Point => ({ x: 600 + spot.x * PX, y: 400 + spot.z * PX })
const thingPoint = (r: Rig, id: string): Point => {
  if (id === 'pot') return pointOf(r.game.pot)
  if (id === 'gate') return pointOf(WAITING)
  const thing = thingById(r.game.world, id)!
  return pointOf(thing.heldBy ? anchorOf(thing, seatOf(r.game, thing.heldBy), thing.heldBy) : thing)
}
function tap(r: Rig, point: Point): void {
  r.play.gesture({ type: 'press', at: point })
  settle(r)
  r.play.gesture({ type: 'tap', at: point })
  settle(r)
}
function hold(r: Rig, point: Point, seconds: number): void {
  r.play.gesture({ type: 'press', at: point })
  settle(r)
  run(r, seconds)
  r.play.gesture({ type: 'tap', at: point })
  settle(r)
}
function drag(r: Rig, from: Point, to: Point, steps = 12): void {
  r.play.gesture({ type: 'press', at: from })
  settle(r)
  r.play.gesture({ type: 'dragStart', from })
  for (let i = 1; i <= steps; i++) {
    r.play.gesture({ type: 'dragMove', from, at: { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps } })
    settle(r)
  }
  r.play.gesture({ type: 'dragEnd', from, at: to })
  settle(r)
}
/** To and fro on the spot: the finger turns back before it has gone as far as the thing is wide. */
function rub(r: Rig, on: Point, reach = 22): void {
  r.play.gesture({ type: 'press', at: on })
  settle(r)
  r.play.gesture({ type: 'dragStart', from: on })
  for (let i = 0; i < 16; i++) {
    r.play.gesture({ type: 'dragMove', from: on, at: { x: on.x + reach * Math.sin((i + 1) * 1.3), y: on.y } })
    settle(r)
  }
  r.play.gesture({ type: 'dragEnd', from: on, at: on })
  settle(r)
}
/** Calls the pot to a cup and holds it for `seconds`. */
function pour(r: Rig, cup: string, seconds: number): void {
  tap(r, thingPoint(r, cup))
  run(r, 0.6)
  hold(r, thingPoint(r, 'pot'), seconds)
}

describe('what each scene saves when it starts', () => {
  it('the showing: its mark, at once, so a put-away in the middle of it never plays it again', () => {
    const r = rig(openGame(null, null))
    expect(dueShowing(r.game)).toBe('pour')
    // It starts with the first step of play, before a touch can come to the table.
    run(r, 0.1)
    expect(r.log).toContain('do:bear:show')
    run(r, 1.4)
    expect(r.changes).toContain(2)
    const saved = JSON.parse(JSON.stringify(stored(r.game)))
    expect(saved.shown).toEqual(['pour'])
    // Put away in the middle of the showing and opened again: the table is found as left and the Bear shows nothing.
    run(r, 1.5)
    const back = rig(openGame(JSON.parse(JSON.stringify(stored(r.game))), null))
    run(back, 6)
    expect(back.log.filter((line) => line.includes(':show'))).toEqual([])
  })

  it('the showing leaves the table as it found it: the splash is drunk and the cup is empty', () => {
    const r = rig(openGame(null, null))
    run(r, 7)
    expect(thingById(r.game.world, 'cup-bear')!.tea).toBe(0)
    expect(r.game.tea.guests[0]).toMatchObject({ note: null, content: false })
    expect(r.game.pot.held).toBe(false)
    expect(r.play.busy).toBe(false)
  })

  it('the sip: what the guest found and the emptied cup, at once', () => {
    const r = rig(at('two-guests'))
    layPlaces(r)
    r.changes.length = 0
    pour(r, 'cup-bear', 4.3)
    r.changes.length = 0
    let saved: TeaState | null = null
    for (let i = 0; i < 120 && !saved; i++) {
      run(r, 1 / 60)
      if (r.log.includes('do:bear:sip-right')) saved = JSON.parse(JSON.stringify(stored(r.game)))
    }
    expect(saved, 'the Bear lifted his cup').not.toBe(null)
    expect(r.changes).toContain(2)
    expect(saved!.guests.find((guest) => guest.who === 'bear')).toMatchObject({ note: 'to-taste', content: true })
    expect(saved!.things.find((thing) => thing.id === 'cup-bear')!.tea).toBe(0)
    // Opened again in the middle of the sip: nothing is lost and the sip does not play again.
    const back = rig(openGame(saved, null))
    run(back, 5)
    expect(back.log.filter((line) => line.includes('sip-'))).toEqual([])
    expect(back.game.tea.finished).toBe(false)
  })

  it('the clink: the ended sitting, the moved position and the party at the gate, at once', () => {
    const r = rig(at('brim'))
    pour(r, 'cup-bear', 4.3)
    run(r, 1.0)
    expect(r.game.tea.finished).toBe(true)
    const saved: TeaState = JSON.parse(JSON.stringify(stored(r.game)))
    expect(saved).toMatchObject({ finished: true, position: 'drop' })
    expect(saved.waiting!.guests.map((guest) => guest.who)).toEqual(['mouse'])
    run(r, 12)
    expect(r.log).toContain('do:bear:clink')
    expect(r.log).toContain('do:bear:settle')
    expect(r.log.at(-1) === undefined).toBe(false)
    expect(r.log.filter((line) => line.startsWith('party:')).at(-1)).toBe('party:bear|mouse|false')
    // Opened again after the ending: the settled table, the party at the gate, and no clink.
    const back = rig(openGame(saved, null))
    run(back, 6)
    expect(back.log.filter((line) => line.includes('clink'))).toEqual([])
    expect(back.log[0]).toBe('party:bear|mouse|true')
    expect(back.log[1]).toBe('settled:bear')
  })

  it('the change of party: the new table, at once, and only on the child\'s touch', () => {
    const r = rig(at('brim'))
    pour(r, 'cup-bear', 4.3)
    run(r, 30)
    expect(r.game.tea.guests.map((guest) => guest.who)).toEqual(['bear'])
    r.changes.length = 0
    tap(r, thingPoint(r, 'gate'))
    expect(r.changes).toContain(2)
    const saved: TeaState = JSON.parse(JSON.stringify(stored(r.game)))
    expect(saved).toMatchObject({ finished: false, waiting: null })
    expect(saved.guests.map((guest) => guest.who)).toEqual(['mouse'])
    expect(r.log).toContain('leave:bear')
    run(r, 4)
    expect(r.log.filter((line) => line.startsWith('party:')).at(-1)).toBe('party:mouse||false')
  })
})

describe('a touch and a scene', () => {
  it('ends the table\'s scene and is then an ordinary touch', () => {
    const r = rig(openGame(null, null))
    run(r, 2.6)
    expect(r.log).toContain('do:bear:show')
    const before = r.log.length
    r.play.gesture({ type: 'press', at: thingPoint(r, 'pot') })
    settle(r)
    expect(r.log.slice(before)).toContain('rest')
    expect(r.log.slice(before)).toContain('nudge:pot')
    r.play.gesture({ type: 'tap', at: thingPoint(r, 'pot') })
    settle(r)
    run(r, 3)
    // The showing is over for good, and what it had poured is gone.
    expect(r.log.slice(before).filter((line) => line.includes(':show'))).toEqual([])
    expect(r.game.pot.held).toBe(false)
  })

  it('ends a guest\'s sip only when that guest or its cup is touched', () => {
    const r = rig(at('two-guests'))
    layPlaces(r)
    pourInto(r.game.world, 'cup-bear', 0.95)
    run(r, 1.2)
    expect(r.log).toContain('do:bear:sip-right')
    const mark = r.log.length
    tap(r, pointOf({ x: 0, z: 2 }))
    expect(r.log.slice(mark)).not.toContain('letgo:cup-bear')
    tap(r, thingPoint(r, 'cup-bear'))
    expect(r.log.slice(mark)).toContain('letgo:cup-bear')
    expect(r.log.slice(mark)).toContain('tea:cup-bear')
  })

  it('ends a sip when the pot is pressed while it stands by that cup, so a press that adds to the cup finds it under the spout', () => {
    const r = rig(at('brim'))
    // Too little: the Bear tips the cup back for a drop, and in the middle of that the child holds the pot again.
    pour(r, 'cup-bear', 1.2)
    run(r, 1.4)
    expect(r.log).toContain('do:bear:sip-short')
    const mark = r.log.length
    const before = thingById(r.game.world, 'cup-bear')!.tea
    hold(r, thingPoint(r, 'pot'), 1.0)
    expect(r.log.slice(mark)).toContain('letgo:cup-bear')
    expect(thingById(r.game.world, 'cup-bear')!.tea).toBeGreaterThan(before + 0.15)
    // A pour in two presses is never a miss.
    expect(r.game.tea.guests[0].note).toBe(null)
  })

  it('gives every press one ending: a thing in the hand is put down when the finger is taken away', () => {
    const r = rig(at('lay-a-place'))
    const from = thingPoint(r, 'spoon-0')
    r.play.gesture({ type: 'press', at: from })
    r.play.gesture({ type: 'dragStart', from })
    r.play.gesture({ type: 'dragMove', from, at: { x: from.x + 200, y: from.y - 100 } })
    expect(r.game.hand).not.toBe(null)
    // Put away with the spoon in the hand: it is saved where it was picked up.
    expect(stored(r.game).things.find((thing) => thing.id === r.game.hand!.id)).toMatchObject({ z: 3.1 })
    r.play.gesture({ type: 'dragEnd', from, at: { x: from.x + 200, y: from.y - 100 } })
    expect(r.game.hand).toBe(null)
    expect(r.play.busy).toBe(false)
  })
})

describe('every cell of the grid', () => {
  /** Does one cell's act on a fresh table and returns the sounds it made and the motions the stage was asked for. */
  function cell(object: string, action: string): { voice: string; motion: string } {
    const r = rig(at('two-guests', { tools: { sponge: true, bowl: true } }))
    layPlaces(r)
    pourInto(r.game.world, 'cup-bear', 0.3)
    run(r, 2.5)
    const world = r.game.world
    const who: GuestId = 'bear'
    const id = object === 'cup' ? 'cup-bear' : object === 'saucer' ? 'saucer-0' : object === 'spoon' ? 'spoon-0' : object === 'guest' ? `guest:${who}` : object
    const point = object === 'guest' ? pointOf({ x: seatOf(r.game, who).x, z: seatOf(r.game, who).z }) : thingPoint(r, id)
    const free = pointOf({ x: -3.2, z: 1.6 })
    r.voices.length = 0
    r.log.length = 0
    if (action === 'tap') tap(r, point)
    else if (action === 'rub') rub(r, point)
    else if (action === 'carry') {
      // Carried a long way and still in the hand: the sounds and motions of the carrying itself.
      r.play.gesture({ type: 'press', at: point })
      r.voices.length = 0
      r.log.length = 0
      r.play.gesture({ type: 'dragStart', from: point })
      for (let i = 1; i <= 14; i++) {
        r.play.gesture({ type: 'dragMove', from: point, at: { x: point.x + ((free.x - point.x) * i) / 14, y: point.y + ((free.y - point.y) * i) / 14 } })
        settle(r)
        run(r, 0.05)
      }
    } else if (action === 'put') {
      // Put on the thing the grid names first for it.
      const onto = object === 'cup' ? thingPoint(r, 'bowl') : object === 'saucer' ? pointOf({ x: seatOf(r.game, 'mouse').x, z: seatOf(r.game, 'mouse').z }) : object === 'spoon' ? thingPoint(r, 'cup-mouse') : object === 'pot' ? pointOf(seatOf(r.game, 'mouse')) : object === 'sponge' ? thingPoint(r, 'cup-bear') : pointOf(seatOf(r.game, 'mouse'))
      r.play.gesture({ type: 'press', at: point })
      settle(r)
      r.voices.length = 0
      r.log.length = 0
      r.play.gesture({ type: 'dragStart', from: point })
      for (let i = 1; i <= 12; i++) r.play.gesture({ type: 'dragMove', from: point, at: { x: point.x + ((onto.x - point.x) * i) / 12, y: point.y + ((onto.y - point.y) * i) / 12 } })
      r.play.takeVoices()
      r.log.length = 0
      r.play.gesture({ type: 'dragEnd', from: point, at: onto })
      settle(r)
      run(r, 0.3)
    } else {
      // The pot is brought over the thing and held.
      if (object === 'pot') drag(r, thingPoint(r, 'pot'), pointOf({ x: 0, z: 2.4 }))
      else if (object === 'guest') drag(r, thingPoint(r, 'pot'), pointOf(seatOf(r.game, who)))
      else if (object === 'saucer') { Object.assign(thingById(world, 'saucer-0')!, { x: -3, z: 1.4 }); tap(r, pointOf({ x: -3, z: 1.4 })) }
      else if (object === 'spoon') { Object.assign(thingById(world, 'spoon-0')!, { x: -3, z: 1.4 }); tap(r, pointOf({ x: -3, z: 1.4 })) }
      else if (object === 'sponge') { Object.assign(thingById(world, 'sponge')!, { x: -3, z: 1.4 }); tap(r, pointOf({ x: -3.9, z: 0.6 })); run(r, 0.6); drag(r, thingPoint(r, 'pot'), pointOf({ x: -3 + 2.332, z: 1.4 + 1.4575 - 0.95 })) }
      else tap(r, point)
      run(r, 0.8)
      r.voices.length = 0
      r.log.length = 0
      hold(r, thingPoint(r, 'pot'), 1.0)
      // The press and the first drop are the same for every pour; what tells the cells apart is the running stream.
      r.voices.splice(0, 2)
    }
    const motion = r.log.filter((line) => line.startsWith('act:') || line.startsWith('do:') || line.startsWith('walk:') || line.startsWith('lift:') || line === 'fan' || line.startsWith('nudge:')).join(' ')
    // Everything the cell sounded, in order: a press may open two cells alike, and what follows tells them apart.
    return { voice: r.voices.join('|'), motion }
  }

  it('has a sound of its own and a motion of its own', () => {
    const seen: { cell: string; voice: string; motion: string }[] = []
    for (const object of OBJECTS) {
      for (const action of ACTIONS) {
        const found = cell(object, action)
        expect(found.voice, `${object} ${action} makes a sound`).not.toBe('')
        expect(found.motion, `${object} ${action} moves`).not.toBe('')
        seen.push({ cell: `${object} ${action}`, ...found })
      }
    }
    expect(seen).toHaveLength(30)
    for (let i = 0; i < seen.length; i++) {
      for (let j = i + 1; j < seen.length; j++) {
        expect(seen[i].voice === seen[j].voice && seen[i].motion === seen[j].motion, `${seen[i].cell} and ${seen[j].cell} are alike`).toBe(false)
      }
    }
    // And the sounds alone: no two cells sound the same.
    const voices = new Map<string, string>()
    for (const each of seen) {
      expect(voices.get(each.voice), `${each.cell} sounds like ${voices.get(each.voice)}`).toBeUndefined()
      voices.set(each.voice, each.cell)
    }
  })
})

describe('found as left', () => {
  it('opens on the table as it was put away: tea, puddles, things, a hat, and the guests\' notes', () => {
    const r = rig(at('two-guests'))
    layPlaces(r)
    pourInto(r.game.world, 'cup-mouse', 0.7)
    spill(r.game.world, { x: 1, z: 1.5 }, 0.2)
    run(r, 3)
    drag(r, thingPoint(r, 'spoon-1'), pointOf(seatOf(r.game, 'bear')))
    const saved = JSON.parse(JSON.stringify(stored(r.game)))
    const back = rig(openGame(saved, null))
    expect(stored(back.game)).toEqual(stored(r.game))
    expect(thingById(back.game.world, 'spoon-1') as Thing).toMatchObject({ heldBy: 'bear', worn: true })
    expect(back.game.tea.guests.find((guest) => guest.who === 'mouse')!.note).toBe('not-to-taste')
    run(back, 6)
    expect(back.log.filter((line) => line.startsWith('do:') && !line.endsWith(':wait'))).toEqual([])
  })
})

describe('after the first showing', () => {
  it('the pot stands by the Bear\'s cup, and a hold on it pours his cup full', () => {
    const r = rig(openGame(null, null))
    run(r, 7)
    expect(r.game.pot.over).toBe('cup-bear')
    hold(r, thingPoint(r, 'pot'), 4.3)
    expect(thingById(r.game.world, 'cup-bear')!.tea).toBeGreaterThan(0.85)
    run(r, 2)
    expect(r.log).toContain('do:bear:sip-right')
  })
})

describe('the guests and a puddle', () => {
  it('the Ducklings paddle in a puddle by their place, each once, and again only for a new one', () => {
    const r = rig(at('twins'))
    spill(r.game.world, { x: placeOf(r.game, 'duckling-a').x, z: placeOf(r.game, 'duckling-a').z + 1.2 }, 0.3)
    run(r, 3)
    expect(r.log.filter((line) => line === 'do:duckling-a:stream')).toHaveLength(1)
    expect(r.log.filter((line) => line === 'do:duckling-b:stream')).toHaveLength(0)
    r.game.world.puddles.fill(0)
    run(r, 1)
    spill(r.game.world, { x: placeOf(r.game, 'duckling-a').x, z: placeOf(r.game, 'duckling-a').z + 1.2 }, 0.3)
    run(r, 1)
    expect(r.log.filter((line) => line === 'do:duckling-a:stream')).toHaveLength(2)
  })
})

describe('a guest led by the finger', () => {
  const seats = (r: Rig) => r.game.tea.guests.slice().sort((a, b) => a.seat - b.seat).map((guest) => guest.who)
  const guestPoint = (r: Rig, who: GuestId): Point => pointOf(seatOf(r.game, who))

  it('changes seats with its neighbour when it is let go at the neighbour\'s seat', () => {
    const r = rig(at('three-guests', { seed: 9 }))
    const [left, middle, right] = seats(r)
    drag(r, guestPoint(r, left), guestPoint(r, middle))
    expect(seats(r)).toEqual([middle, left, right])
  })

  it('never walks past a third guest: let go at the far seat, it changes with the neighbour on that side', () => {
    const r = rig(at('three-guests', { seed: 9 }))
    const [left, middle, right] = seats(r)
    drag(r, guestPoint(r, left), guestPoint(r, right))
    expect(seats(r)).toEqual([middle, left, right])
  })

  it('goes back to its own seat when it is let go short of its neighbour', () => {
    const r = rig(at('three-guests', { seed: 9 }))
    const before = seats(r)
    const from = guestPoint(r, before[0])
    drag(r, from, { x: from.x + 1.2 * PX, y: from.y })
    expect(seats(r)).toEqual(before)
  })
})

describe('put away with a finger down, or in the middle of a showing', () => {
  it('puts the thing in the hand back where it was picked up, and makes no move the child did not make', () => {
    const r = rig(at('lay-a-place'))
    const who = r.game.tea.guests[0].who
    const cup = thingById(r.game.world, `cup-${who}`)!
    pourInto(r.game.world, cup.id, 0.4)
    // The cup is carried from the paw to over the guest's head: let go there it would be a hat, and its tea on the cloth.
    const from = thingPoint(r, cup.id), over = pointOf(seatOf(r.game, who))
    r.play.gesture({ type: 'press', at: from })
    r.play.gesture({ type: 'dragStart', from })
    r.play.gesture({ type: 'dragMove', from, at: over })
    expect(r.game.hand).not.toBe(null)
    r.play.cancel()
    expect(r.game.hand).toBe(null)
    expect(cup).toMatchObject({ heldBy: who, worn: false, tea: 0.4 })
    expect(r.play.busy).toBe(false)
  })

  it('sends a led guest back to its seat, with no change of seats', () => {
    const r = rig(at('two-guests'))
    const before = r.game.tea.guests.map((guest) => `${guest.who}:${guest.seat}`)
    const [left, right] = r.game.tea.guests.slice().sort((a, b) => a.seat - b.seat)
    const from = pointOf(seatOf(r.game, left.who)), to = pointOf(seatOf(r.game, right.who))
    r.play.gesture({ type: 'press', at: from })
    r.play.gesture({ type: 'dragStart', from })
    r.play.gesture({ type: 'dragMove', from, at: to })
    r.play.cancel()
    expect(r.game.tea.guests.map((guest) => `${guest.who}:${guest.seat}`)).toEqual(before)
  })

  it('stores the table as a showing found it for as long as the showing plays, with its mark', () => {
    for (const position of ['brim', 'lay-a-place']) {
      const r = rig(position === 'brim' ? openGame(null, null) : at(position, { shown: ['pour'] }))
      const found = JSON.stringify({ ...r.play.stored(), shown: [] })
      for (let i = 0; i < 40 && !r.log.some((line) => line.endsWith(':show')); i++) run(r, 0.25)
      expect(r.log.some((line) => line.endsWith(':show'))).toBe(true)
      // At every moment of the showing: the Bear's splash is not in his cup, and no place is laid that the child did not lay.
      for (let i = 0; i < 16; i++) {
        run(r, 0.25)
        expect(JSON.stringify({ ...r.play.stored(), shown: [] }), `${position} at ${i}`).toBe(found)
      }
      run(r, 4)
      expect(JSON.stringify({ ...r.play.stored(), shown: [] })).toBe(found)
      expect(r.play.stored().shown).toContain(position === 'brim' ? 'pour' : 'lay')
    }
  })
})

describe('a tap on the pot', () => {
  it('lets out its puff of steam and gives one drop; a hold that ran a stream does not toot', () => {
    const r = rig(openGame(null, null))
    tap(r, pointOf(r.game.pot))
    expect(r.log.filter((line) => line === 'act:pot:toot')).toHaveLength(1)
    run(r, 1)
    expect(thingById(r.game.world, 'cup-bear')!.tea).toBeCloseTo(0.012, 9)
    hold(r, pointOf(r.game.pot), 1)
    expect(r.log.filter((line) => line === 'act:pot:toot')).toHaveLength(1)
  })
})

describe('a press on the pot always pours', () => {
  it('pours when the pot lands, if the finger came down while it was in the air', () => {
    const r = rig(openGame(null, null))
    // Called away, and pressed in mid-hop on its way back to the cup.
    r.play.heard(callPot(r.game, { id: null, guest: null, spot: { x: -4, z: 2 } }))
    run(r, 0.6)
    tap(r, thingPoint(r, 'cup-bear'))
    expect(r.game.pot.hop).not.toBe(null)
    r.play.gesture({ type: 'press', at: pointOf(r.game.pot) })
    settle(r)
    run(r, 1.5)
    expect(thingById(r.game.world, 'cup-bear')!.tea).toBeGreaterThan(0.15)
    r.play.gesture({ type: 'tap', at: pointOf(r.game.pot) })
    settle(r)
  })

  it('pours again for a finger that let go after it had drifted and came straight back', () => {
    const r = rig(openGame(null, null))
    const from = pointOf(r.game.pot), drifted = { x: from.x + 20, y: from.y + 6 }
    r.play.gesture({ type: 'press', at: from })
    r.play.gesture({ type: 'dragStart', from })
    r.play.gesture({ type: 'dragMove', from, at: drifted })
    run(r, 1)
    r.play.gesture({ type: 'dragLift', from, at: drifted })
    run(r, 0.1)
    const had = thingById(r.game.world, 'cup-bear')!.tea
    expect(r.game.pot.held).toBe(false)
    // The input tracker reports the finger that comes back within its grace as one more move of the same drag.
    r.play.gesture({ type: 'dragMove', from, at: { x: from.x + 60, y: from.y - 30 } })
    expect(r.game.pot.held).toBe(true)
    run(r, 1)
    r.play.gesture({ type: 'dragEnd', from, at: { x: from.x + 60, y: from.y - 30 } })
    settle(r)
    expect(thingById(r.game.world, 'cup-bear')!.tea).toBeGreaterThan(had + 0.15)
    expect(r.game.pot.held).toBe(false)
  })
})

describe('the Mouse and a puddle', () => {
  it('minds a puddle by her place whether or not she has tea, once for each puddle', () => {
    const r = rig(at('drop'))
    spill(r.game.world, { x: placeOf(r.game, 'mouse').x, z: placeOf(r.game, 'mouse').z + 1.1 }, 0.3)
    run(r, 2)
    expect(thingById(r.game.world, 'cup-mouse')!.tea).toBe(0)
    expect(r.log.filter((line) => line === 'do:mouse:wait')).toHaveLength(1)
    run(r, 4)
    expect(r.log.filter((line) => line === 'do:mouse:wait')).toHaveLength(1)
  })
})

describe('a finger that had already let go', () => {
  it('has made its put: a put-away in the moment after leaves the thing where it was let go', () => {
    const r = rig(at('lay-a-place'))
    const who = r.game.tea.guests[0].who
    const from = thingPoint(r, 'saucer-0'), to = pointOf(placeOf(r.game, who))
    r.play.gesture({ type: 'press', at: from })
    r.play.gesture({ type: 'dragStart', from })
    r.play.gesture({ type: 'dragMove', from, at: to })
    r.play.gesture({ type: 'dragLift', from, at: to })
    r.play.cancel()
    expect(r.game.hand).toBe(null)
    expect(thingById(r.game.world, `cup-${who}`)!.on).toBe('saucer-3')
  })
})

describe('a place shown being laid', () => {
  it('starts when the party has sat down, is marked only then, and leaves the table as it found it', () => {
    const r = rig(at('drop', { shown: ['pour'] }))
    pourInto(r.game.world, 'cup-mouse', 0.15)
    run(r, 16)
    expect(r.game.tea).toMatchObject({ finished: true, position: 'lay-a-place' })
    tap(r, thingPoint(r, 'gate'))
    // During the walk-in nothing is marked: a put-away now keeps the showing for when the game is opened.
    run(r, 1)
    expect(r.play.stored().shown).not.toContain('lay')
    const during = rig(openGame(JSON.parse(JSON.stringify(r.play.stored())), null))
    run(during, 0.2)
    expect(during.log.some((line) => line.endsWith(':show'))).toBe(true)
    // Left to play: the showing starts as the arrival ends, and what is stored all through it is the table as found.
    for (let i = 0; i < 40 && !r.log.some((line) => line.endsWith(':show')); i++) run(r, 0.25)
    expect(r.play.stored().shown).toContain('lay')
    const found = JSON.stringify(r.play.stored())
    run(r, 10)
    expect(JSON.stringify(r.play.stored())).toBe(found)
    const who = r.game.tea.guests[0].who
    expect(thingById(r.game.world, `cup-${who}`)).toMatchObject({ heldBy: who, on: null })
  })

  it('is undone at once by a touch, with every saucer back on the stack', () => {
    const r = rig(at('drop', { shown: ['pour'] }))
    pourInto(r.game.world, 'cup-mouse', 0.15)
    run(r, 16)
    tap(r, thingPoint(r, 'gate'))
    for (let i = 0; i < 40 && !r.log.some((line) => line.endsWith(':show')); i++) run(r, 0.25)
    run(r, 1.2)
    // A touch on the bare cloth in the middle of the showing.
    r.play.gesture({ type: 'press', at: pointOf({ x: 3, z: 2 }) })
    settle(r)
    r.play.gesture({ type: 'tap', at: pointOf({ x: 3, z: 2 }) })
    settle(r)
    const saucers = r.game.world.things.filter((thing) => thing.kind === 'saucer')
    expect(saucers).toHaveLength(4)
    expect(saucers.every((thing) => Math.abs(thing.x + 5.1) < 0.01 && Math.abs(thing.z - 3) < 0.01)).toBe(true)
    expect(r.game.hand).toBe(null)
  })

  it('is not shown to a child who has already laid a place', () => {
    const r = rig(at('lay-a-place', { shown: ['pour'] }))
    layPlaces(r)
    expect(r.game.tea.shown).toContain('lay')
    run(r, 5)
    expect(r.log.some((line) => line.endsWith(':show'))).toBe(false)
  })
})

describe('put away before a guest has answered, or before the guests have clinked', () => {
  it('still plays the mishap of a cup with too much: the bowl comes out and the guest is noted, once', () => {
    const r = rig(at('drop', { shown: ['pour'] }))
    pourInto(r.game.world, 'cup-mouse', 0.8)
    // Put away before she has lifted it.
    const back = rig(openGame(JSON.parse(JSON.stringify(r.play.stored())), null))
    run(back, 3)
    expect(back.log).toContain('do:mouse:sip-over')
    expect(back.game.tea.guests[0].note).toBe('not-to-taste')
    expect(back.game.tea.tools.bowl).toBe(true)
    // Put away again after it: nothing more comes of the same cup.
    const again = rig(openGame(JSON.parse(JSON.stringify(back.play.stored())), null))
    run(again, 4)
    expect(again.log.filter((line) => line.startsWith('do:mouse:sip'))).toEqual([])
  })

  it('stores the sitting as not yet ended until the clink starts, so the clink is not lost', () => {
    const r = rig(openGame(null, null))
    run(r, 6)
    pourInto(r.game.world, 'cup-bear', 0.95)
    for (let i = 0; i < 40 && !r.game.tea.finished; i++) run(r, 0.1)
    expect(r.game.tea.finished).toBe(true)
    // The Bear is still drinking: what is stored is the sitting before its end, with the Bear content.
    const mid = JSON.parse(JSON.stringify(r.play.stored()))
    expect(mid).toMatchObject({ finished: false, waiting: null, position: 'brim' })
    expect(mid.guests[0]).toMatchObject({ content: true })
    const back = rig(openGame(mid, null))
    run(back, 8)
    expect(back.log).toContain('do:bear:clink')
    expect(back.game.tea).toMatchObject({ finished: true, position: 'drop' })
    expect(back.game.tea.waiting!.guests.map((guest) => guest.who)).toEqual(r.game.tea.waiting!.guests.map((guest) => guest.who))
    // Left to play, the clink starts and the ended sitting is stored.
    run(r, 6)
    expect(r.log).toContain('do:bear:clink')
    expect(r.play.stored()).toMatchObject({ finished: true, position: 'drop' })
  })

  it('brings the pot to the sponge and to a guest when they are tapped', () => {
    const r = rig(at('drop', { shown: ['pour'], tools: { sponge: true, bowl: false } }))
    tap(r, thingPoint(r, 'sponge'))
    run(r, 0.6)
    expect(r.game.pot.over).toBe('sponge')
    tap(r, pointOf(seatOf(r.game, 'mouse')))
    run(r, 0.6)
    expect(r.game.overGuest).toBe('mouse')
  })
})

describe('what a reader of the sheet looked for', () => {
  it('draws the tea that runs down the outside of a cup that is over its rim, for as long as it patters', () => {
    const r = rig(openGame(null, null))
    hold(r, thingPoint(r, 'pot'), 4)
    expect(r.log).not.toContain('runOver:cup-bear')
    hold(r, thingPoint(r, 'pot'), 5)
    expect(r.log.filter((line) => line === 'runOver:cup-bear').length).toBeGreaterThan(3)
  })

  it('has a rubbed saucer squeak under every stroke and flash once in the rub', () => {
    const r = rig(at('full-table', { tools: { sponge: true, bowl: true } }))
    rub(r, thingPoint(r, 'saucer-0'))
    expect(r.log.filter((line) => line === 'act:saucer-0:flash')).toHaveLength(1)
    expect(r.log.filter((line) => line === 'splash:saucer-0:1.6')).toHaveLength(1)
    expect(r.voices.length).toBeGreaterThan(3)
    // The next rub flashes again.
    rub(r, thingPoint(r, 'saucer-0'))
    expect(r.log.filter((line) => line === 'act:saucer-0:flash')).toHaveLength(2)
  })

  it('opens the gate to a finger that slid on it, and not to a touch that was called off', () => {
    const ended = () => {
      const r = rig(openGame(null, null))
      pourInto(r.game.world, 'cup-bear', 0.95)
      run(r, 16)
      expect(r.game.tea).toMatchObject({ finished: true })
      return r
    }
    const slid = ended(), gate = thingPoint(slid, 'gate')
    drag(slid, gate, { x: gate.x + 40, y: gate.y + 10 })
    expect(slid.game.tea.finished).toBe(false)
    expect(slid.log).toContain('leave:bear')
    // Put away with the finger still on the gate: nobody is let in.
    const off = ended()
    off.play.gesture({ type: 'press', at: gate })
    off.play.gesture({ type: 'dragStart', from: gate })
    off.play.gesture({ type: 'dragMove', from: gate, at: { x: gate.x + 40, y: gate.y } })
    off.play.cancel()
    expect(off.game.tea.finished).toBe(true)
    expect(off.log).not.toContain('leave:bear')
  })

  it('rings the bell for a touch anywhere on the gate, its arch and its bell too, and lets a waiting party in', () => {
    const r = rig(openGame(null, null))
    const bell = pointOf(GATE)
    run(r, 13)
    // Nobody waits yet: the bell rings, the gate wobbles, and nothing else comes of it.
    const before = r.voices.length
    tap(r, bell)
    expect(r.log).toContain('nudge:gate')
    expect(r.voices.slice(before)).toContain(JSON.stringify(cells.gateBell))
    expect(r.log.some((line) => line.startsWith('leave:'))).toBe(false)
    // The sitting ends and a party waits: the same touch on the bell lets it in.
    pourInto(r.game.world, 'cup-bear', 0.95)
    run(r, 16)
    expect(r.game.tea.finished).toBe(true)
    tap(r, bell)
    expect(r.log).toContain('leave:bear')
    expect(r.game.tea.finished).toBe(false)
  })

  it('has a guest answer the stream for as long as the stream is on it', () => {
    const r = rig(at('two-guests', { tools: { sponge: true, bowl: true } }))
    drag(r, thingPoint(r, 'pot'), pointOf(seatOf(r.game, 'mouse')))
    run(r, 1)
    r.log.length = 0
    r.play.gesture({ type: 'press', at: thingPoint(r, 'pot') })
    settle(r)
    run(r, 5)
    // Five seconds into the pour the Mouse still holds her answer: nothing has let it go.
    expect(r.log.filter((line) => line.startsWith('hold:'))).toEqual(['hold:mouse:stream'])
    r.play.gesture({ type: 'tap', at: thingPoint(r, 'pot') })
    settle(r)
    run(r, 0.5)
    expect(r.log.filter((line) => line.startsWith('hold:'))).toEqual(['hold:mouse:stream', 'hold:mouse:null'])
  })

  it('has one guest after another do its small joke at a quiet table, and none under a finger or beside a pour', () => {
    const r = rig(at('two-guests'))
    const jokes = () => r.log.filter((line) => line.endsWith(':joke'))
    const [first, second] = r.game.tea.guests.map((guest) => guest.who)
    run(r, 5)
    expect(jokes()).toEqual([])
    run(r, 2)
    expect(jokes()).toEqual([`do:${first}:joke`])
    expect(r.voices).toContain(JSON.stringify(cells.jokeCall(first === 'duckling-a' || first === 'duckling-b' ? 'duckling' : first)))
    run(r, 15)
    expect(jokes()).toEqual([`do:${first}:joke`, `do:${second}:joke`])
    // A finger on the cloth: nothing more for as long as it is down, and not at once when it lifts.
    const bare = pointOf({ x: 3.4, z: 2.4 })
    r.play.gesture({ type: 'press', at: bare })
    settle(r)
    run(r, 40)
    r.play.gesture({ type: 'tap', at: bare })
    settle(r)
    run(r, 5)
    expect(jokes()).toHaveLength(2)
    run(r, 10)
    expect(jokes()).toHaveLength(3)
    // A pour: none while the tea runs.
    r.play.gesture({ type: 'press', at: thingPoint(r, 'pot') })
    settle(r)
    run(r, 30)
    expect(jokes()).toHaveLength(3)
    r.play.gesture({ type: 'tap', at: thingPoint(r, 'pot') })
  })

  it('has a touched tile of the wall answer with a ring for its picture, and the grown-ups\' corner answer nothing', () => {
    const r = rig(at('two-guests'))
    // Beyond the far edge of the cloth is the wall (the stage here looks straight down, so the wall is further up the surface).
    const wall = (x: number): Point => ({ x, y: 400 + (CLOTH.minZ - 2.2) * PX })
    r.voices.length = 0
    tap(r, wall(420))
    expect(r.log.filter((line) => line.startsWith('tile:'))).toHaveLength(1)
    expect(r.voices).toEqual([JSON.stringify(cells.tileRing(4))])
    tap(r, wall(730))
    expect(r.voices).toEqual([JSON.stringify(cells.tileRing(4)), JSON.stringify(cells.tileRing(2))])
    // Nothing else comes of it: the pot stays, no guest is poked, and nothing is saved.
    expect(r.log.filter((line) => line.startsWith('do:') || line.startsWith('nudge:'))).toEqual([])
    expect(r.changes).toEqual([])
    // The stage says no tile answers in the corner: then there is no sound at all.
    r.voices.length = 0
    r.play.gesture({ type: 'press', at: { x: 1150, y: 20 } })
    settle(r)
    r.play.gesture({ type: 'tap', at: { x: 1150, y: 20 } })
    settle(r)
    expect(r.voices).toEqual([])
  })

  it('sets a pot down with its slosh wherever it is let go, in the guests\' row too, and never in that row', () => {
    const r = rig(at('two-guests'))
    const from = thingPoint(r, 'pot'), to = pointOf({ x: 3.3, z: -2.0 })
    r.play.gesture({ type: 'press', at: from })
    r.play.gesture({ type: 'dragStart', from })
    for (let i = 1; i <= 12; i++) r.play.gesture({ type: 'dragMove', from, at: { x: from.x + ((to.x - from.x) * i) / 12, y: from.y + ((to.y - from.y) * i) / 12 } })
    settle(r)
    r.voices.length = 0
    r.play.gesture({ type: 'dragEnd', from, at: to })
    settle(r)
    const sloshes = Array.from({ length: 60 }, (_, turn) => JSON.stringify(cells.insideSlosh(turn)))
    expect(r.voices.some((voice) => sloshes.includes(voice))).toBe(true)
    run(r, 1)
    expect(r.game.pot.hop).toBe(null)
    expect(r.game.pot.z).toBeGreaterThanOrEqual(POT_ROW_Z - 1e-9)
  })

  it('never starts a showing under a finger that is on the table', () => {
    const r = rig(openGame(null, null))
    const bare = pointOf({ x: 3.4, z: 2.4 })
    r.play.gesture({ type: 'press', at: bare })
    settle(r)
    run(r, 3)
    expect(r.log).not.toContain('do:bear:show')
    r.play.gesture({ type: 'tap', at: bare })
    settle(r)
    run(r, 0.3)
    expect(r.log).toContain('do:bear:show')
  })
})
