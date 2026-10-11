import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { CELLS, COLS, KINDS, ROWS, decodeMud, maskOf, mudLeft, type Kind } from './cloth'
import { LADDER } from './config'
import { BOARD, CAT, CLOTH, FEET_Y, FRIEND_KINDS, GATE, PLACE_X, PUDDLE, RAIL, RIDGES, SOAP, TUB, TUB_SLOTS, YARD_SCALE, heldAt, lineSpot, lineY, pegHome } from './layout'
import { GUST_EVERY, HAT_GUSTED, HAT_SWINGS, HICCUPS, LASTS, hatSway, linePose, windAt } from './motion'
import { BOARD_SPOT, CLAP_AFTER_GUST, CLAP_AFTER_PEG, CUFFS_WRUNG, SCARF_LENGTH, Yard, fliesOn, type Bubble } from './yard'
import { DAMP, SOAPY, anchorAtRest } from './taste'
import { FRAME, callIn, carry, cellAt, heard, muddiest, open, play, reopened, rubClean, tapAt, waitingAt, washAndDress, watch, withKinds, wringDry } from './testHands'
import * as V from './voices'

const GATE_AT = { x: GATE.x + GATE.w / 2, y: GATE.y + GATE.h / 2 }
/** A point in the tub's water, right of the board and clear of the friends. */
const WATER = { x: 372, y: 676 }
/** A point of bare linen: sky between the line and the hill. */
const SKY = { x: 700, y: 96 }
const TRIPLES: [Kind, Kind, Kind][] = [['sock', 'shirt', 'dungarees'], ['shirt', 'dungarees', 'sock'], ['dungarees', 'sock', 'shirt'], ['jumper', 'hat', 'scarf'], ['hat', 'scarf', 'jumper'], ['scarf', 'jumper', 'hat']]
const tripleOf = (kind: Kind) => TRIPLES.find((triple) => triple[0] === kind)!
/** The middle of a friend that stands at its place in the yard. */
const bodyAt = (friend: number) => ({ x: PLACE_X[friend], y: FEET_Y - (FRIEND_KINDS[friend] === 'heron' ? 232 : 180) * YARD_SCALE })

/** What a note is made of, whatever its pitch, loudness and moment: enough to tell one voice from another. */
const make = (note: Note) => `${note.kind}/${note.kind === 'tone' ? note.wave : note.q}/${note.attack}/${note.decay}`
const says = (notes: readonly Note[], voice: readonly Note[]) => voice.every((want) => notes.some((note) => make(note) === make(want)))

/** A yard whose pig holds this garment, with the pig called in. */
function yardFor(kind: Kind): Yard {
  const yard = withKinds(tripleOf(kind))
  callIn(yard, 0)
  heard(yard)
  return yard
}
const toBoard = (yard: Yard, friend = 0) => { const at = heldAt(friend); tapAt(yard, at.x, at.y); play(yard, 0.7); heard(yard); return yard.garmentAt('board')! }
const toRail = (yard: Yard) => { tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7); heard(yard); return yard.garmentAt('rail')! }
const toLine = (yard: Yard, place = 0) => { const at = lineSpot(place); tapAt(yard, at.x, at.y); play(yard, 0.7); heard(yard); return yard.garmentAt('line', place)! }

describe('the yard at rest', () => {
  it('opens on an empty yard with three muddy friends behind the gate, each holding its garment up', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const yard = open(seed)
      expect(yard.friends.every((friend) => friend.where === 'gate' && friend.clip && friend.holds !== null)).toBe(true)
      expect(yard.garments.every((garment) => garment.at === 'held' && mudLeft(garment.mud) > 0 && !garment.fly)).toBe(true)
      expect(yard.sceneRunning).toBe(false)
      expect(yard.finished).toBe(false)
    }
  })

  it('changes nothing a save holds while nobody touches it, and nothing starts by itself', () => {
    const yard = open()
    // A yard asks to be written once as it is made; the Mount writes it and clears the flags.
    expect(yard.changed && yard.urgent).toBe(true)
    yard.changed = false; yard.urgent = false
    const before = JSON.stringify(yard.toSave())
    play(yard, 30)
    expect(yard.changed).toBe(false)
    expect(yard.sceneRunning).toBe(false)
    expect(JSON.stringify(yard.toSave())).toBe(before)
    // The only sound is the wind in the line, now and then.
    expect(heard(yard).every((note) => note.kind === 'noise')).toBe(true)
  })
})

describe('the finger on the board', () => {
  const ready = (seed = 1) => { const yard = open(seed); callIn(yard, 0); const garment = toBoard(yard); return { yard, garment } }

  it('is answered when it lands: a dab on mud dimples the cloth, lifts mud and sounds, before any time passes', () => {
    const { yard, garment } = ready()
    const at = cellAt(muddiest(garment)), before = mudLeft(garment.mud)
    yard.changed = false
    yard.press(at.x, at.y)
    expect(yard.dimple.depth).toBe(1)
    expect(mudLeft(garment.mud)).toBeLessThan(before)
    expect(yard.loose.some((thread) => thread.what === 'mud')).toBe(true)
    expect(yard.heard.length).toBeGreaterThan(0)
    expect(yard.changed).toBe(true)
    expect(yard.water.cloud).toBeGreaterThan(0)
  })

  it('a rub lifts mud only where the finger went', () => {
    const yard = withKinds(['jumper', 'hat', 'scarf'])
    callIn(yard, 0)
    const garment = toBoard(yard)
    const cell = muddiest(garment), at = cellAt(cell), before = garment.mud.slice()
    yard.press(at.x, at.y)
    for (let n = 0; n < 16; n++) {
      yard.drag(at.x + (n % 2 ? 14 : -14), at.y)
      yard.step(FRAME)
    }
    yard.tap()
    expect(garment.mud[cell]).toBeLessThan(before[cell])
    garment.mud.forEach((level, i) => {
      expect(level).toBeLessThanOrEqual(before[i])
      if (Math.hypot((i % COLS) - (cell % COLS), Math.floor(i / COLS) - Math.floor(cell / COLS)) > 4) expect(level).toBe(before[i])
    })
  })

  it('a move that ends off the cloth still rubs the cloth it passed over', () => {
    const yard = withKinds(['sock', 'shirt', 'dungarees'])
    callIn(yard, 0)
    const garment = toBoard(yard)
    for (let cell = 0; cell < CELLS; cell++) if (maskOf('sock')[cell]) garment.mud[cell] = 1
    const row = 2, y = CLOTH.y + ((row + 0.5) / ROWS) * CLOTH.h
    // From bare wood left of the sock to bare wood right of it, in one move.
    yard.press(CLOTH.x + 4, y)
    yard.drag(CLOTH.x + CLOTH.w - 4, y)
    yard.tap()
    expect(garment.mud.filter((level, i) => Math.floor(i / COLS) === row && maskOf('sock')[i] && level === 0).length).toBeGreaterThan(0)
  })

  it('enough rubbing gets the garment clean, every kind of it, by dabs alone', () => {
    for (const kind of KINDS) {
      const yard = yardFor(kind)
      const garment = toBoard(yard)
      rubClean(yard)
      expect(mudLeft(garment.mud), kind).toBe(0)
    }
  })

  it('rubbing sings in the voice of what lies on the board, and stops when the hand stops', () => {
    const { yard, garment } = ready()
    const at = cellAt(muddiest(garment))
    yard.press(at.x, at.y)
    heard(yard)
    const notes: Note[] = []
    for (let n = 0; n < 30; n++) {
      yard.drag(at.x, CLOTH.y + 60 + (n % 2) * 80)
      yard.step(FRAME)
      notes.push(...heard(yard))
    }
    expect(notes.length).toBeGreaterThan(10)
    expect(says(notes, V.ridge(garment.kind, 0.5, 0.5))).toBe(true)
    // The wind is not the hand: the next gust is put off so that only the board could be heard.
    yard.gust = 0
    play(yard, 0.5)
    heard(yard)
    play(yard, 1)
    expect(yard.heard).toEqual([])
    yard.tap()
  })

  it('rubbing heaps suds and sends bubbles off, and a bubble pops under a finger', () => {
    const { yard } = ready()
    yard.press(BOARD_SPOT.x, BOARD_SPOT.y)
    for (let n = 0; n < 60 && yard.bubbles.length === 0; n++) {
      yard.drag(BOARD_SPOT.x + (n % 2 ? 50 : -50), BOARD_SPOT.y + 10)
      yard.step(FRAME)
    }
    yard.tap()
    expect(yard.knots.length).toBeGreaterThan(0)
    expect(yard.bubbles.length).toBeGreaterThan(0)
    const bubble = yard.bubbles[0], count = yard.bubbles.length
    heard(yard)
    yard.press(bubble.x, bubble.y)
    expect(yard.bubbles.length).toBe(count - 1)
    expect(yard.heard.length).toBeGreaterThan(0)
    yard.tap()
  })

  it('clean cloth squeaks and bare wood ticks dry: neither lifts anything', () => {
    const { yard, garment } = ready()
    rubClean(yard)
    heard(yard)
    const cloth = cellAt(maskOf(garment.kind).findIndex((on) => on))
    tapAt(yard, cloth.x, cloth.y)
    expect(heard(yard).length).toBeGreaterThan(0)
    tapAt(yard, BOARD.x + 6, BOARD.y + 60)
    expect(says(heard(yard), V.tickDry(0.2, 0.5))).toBe(true)
    expect(mudLeft(garment.mud)).toBe(0)
  })

  it('leaving the board with the finger down takes the garment along, and letting go off any place puts it back', () => {
    const { yard, garment } = ready()
    yard.press(BOARD_SPOT.x, BOARD_SPOT.y)
    for (let x = BOARD_SPOT.x; x < BOARD.x + BOARD.w + 80; x += 20) yard.drag(x, BOARD_SPOT.y - 200)
    expect(yard.carrying).toBe(true)
    expect(garment.at).toBe('board')
    yard.drag(SKY.x, SKY.y)
    yard.lift()
    yard.drop()
    expect(yard.carrying).toBe(false)
    expect(garment.at).toBe('board')
    expect(garment.fly).not.toBeNull()
  })
})

describe('everything answers when the finger lands', () => {
  it('with a sound, at once, wherever it lands', () => {
    const points: [string, number, number][] = [
      ['the cat', CAT.x, CAT.y],
      ['the puddle', PUDDLE.x, PUDDLE.y],
      ['the tub', WATER.x, WATER.y],
      ['the line', 300, lineY(300)],
      ['bare linen', SKY.x, SKY.y],
      ['the soap', SOAP.x, SOAP.y],
      ['a peg', pegHome(3).x, pegHome(3).y],
      ['the bare board', BOARD_SPOT.x, BOARD_SPOT.y],
      ['the empty rail', RAIL.hang.x, RAIL.hang.y],
      ['an empty place of the line', lineSpot(1).x, lineSpot(1).y],
      ['the gate', GATE_AT.x, GATE_AT.y],
      ['a waiting friend', waitingAt(1).x, waitingAt(1).y],
      ['the pig in the yard', bodyAt(0).x, bodyAt(0).y],
      ["the pig's garment", heldAt(0).x, heldAt(0).y],
    ]
    for (const [name, x, y] of points) {
      const yard = open()
      callIn(yard, 0)
      heard(yard)
      yard.press(x, y)
      // The gate and a waiting friend start a scene, whose first sound is its first beat's.
      if (yard.sceneRunning) yard.step(FRAME)
      expect(yard.heard.length, name).toBeGreaterThan(0)
      yard.tap()
    }
  })

  it('a friend whose hands are empty answers a poke in a way that is not the last one, in its own voice', () => {
    const yard = open()
    callIn(yard, 0)
    toBoard(yard)
    const ways: number[] = []
    for (let n = 0; n < 6; n++) {
      tapAt(yard, bodyAt(0).x, bodyAt(0).y)
      ways.push(yard.friends[0].reaction!.variant)
      expect(yard.friends[0].reaction!.what).toBe('poke')
      expect(says(heard(yard), V.oink(ways[n], 0.5))).toBe(true)
      play(yard, 1.5)
    }
    ways.forEach((way, n) => { if (n > 0) expect(way).not.toBe(ways[n - 1]) })
  })

  it('the puddle throws mud at the board: saved at once, shown when it lands, and the friends take it each in its way', () => {
    const yard = open()
    callIn(yard, 0)
    const garment = toBoard(yard)
    const before = garment.mud.slice()
    tapAt(yard, PUDDLE.x, PUDDLE.y)
    expect(yard.dollops).toHaveLength(1)
    expect([...yard.mudShown(garment)]).toEqual(before)
    expect(decodeMud(yard.toSave().garments[garment.index].mud, garment.kind)).toEqual(garment.mud)
    heard(yard)
    play(yard, 0.7)
    expect(yard.dollops).toHaveLength(0)
    expect([...yard.mudShown(garment)]).toEqual(garment.mud)
    expect(yard.friends[0].reaction?.what).toBe('splat')
    for (let n = 0; n < 12; n++) tapAt(yard, PUDDLE.x, PUDDLE.y)
    expect(yard.dollops.length).toBeLessThanOrEqual(3)
    play(yard, 1)
    expect(garment.mud.every((level) => level >= 0 && level <= 3)).toBe(true)
  })
})

describe('the grid: every garment at every thing that happens to it', () => {
  it.each(KINDS)('%s: tub, board, soap, rail, line and wearer each answer in this garment\'s own voice', (kind) => {
    const yard = yardFor(kind)
    const garment = yard.garments[0]
    expect(garment.kind).toBe(kind)

    // Dropped in the tub.
    carry(yard, heldAt(0).x, heldAt(0).y, WATER.x, WATER.y)
    expect(garment.at).toBe('tub')
    heard(yard)
    play(yard, 0.7)
    expect(heard(yard)).toEqual(expect.arrayContaining(V.tubbed(kind)))
    expect(garment.wet).toBe(10)
    // Bubbles that rise from it drift off; one under the finger would be popped first.
    play(yard, 2.5)

    // On the board, rubbed.
    const slot = TUB_SLOTS[garment.n]
    tapAt(yard, slot.x, slot.y)
    expect(garment.at).toBe('board')
    play(yard, 0.7)
    heard(yard)
    const at = cellAt(muddiest(garment))
    yard.press(at.x, at.y)
    const rubbed: Note[] = [...heard(yard)]
    for (let n = 0; n < 12; n++) { yard.drag(at.x, at.y + (n % 2 ? 40 : -40)); yard.step(FRAME); rubbed.push(...heard(yard)) }
    yard.tap()
    expect(says(rubbed, V.ridge(kind, 0.5, 0.5))).toBe(true)

    // Soaped with the bar.
    heard(yard)
    tapAt(yard, SOAP.x, SOAP.y)
    expect(heard(yard)).toEqual(expect.arrayContaining(V.lathered(kind)))
    expect(garment.suds).toBeGreaterThanOrEqual(3)
    expect(yard.lather).toBe(0)

    // Wrung on the rail.
    toRail(yard)
    expect(garment.at).toBe('rail')
    tapAt(yard, RAIL.hang.x, RAIL.hang.y)
    expect(says(heard(yard), V.wrung(kind, 1, kind === 'hat', 0.5))).toBe(true)
    expect(garment.twist).toBe(1)

    // Pegged on the line.
    const place = lineSpot(0)
    tapAt(yard, place.x, place.y)
    expect(garment.at).toBe('line')
    heard(yard)
    play(yard, 0.7)
    expect(says(heard(yard), V.pegged(kind, 0.5))).toBe(true)

    // Worn.
    carry(yard, place.x, place.y, bodyAt(0).x, bodyAt(0).y)
    expect(garment.at).toBe('friend')
    expect(yard.friends[0].wears).toBe(garment)
    heard(yard)
    play(yard, 0.7)
    expect(says(heard(yard), V.donned(kind, 0.5))).toBe(true)
  })

  it('the sock gives all its water in one thin jet and hangs by one peg', () => {
    const yard = yardFor('sock')
    toBoard(yard); const sock = toRail(yard)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y)
    expect(sock.wet).toBe(0)
    expect(toLine(yard).pegs).toEqual([true, false])
  })

  it('the shirt runs out in two streams, two tenths a squeeze, and hangs by two pegs', () => {
    const yard = yardFor('shirt')
    toBoard(yard); const shirt = toRail(yard)
    const before = new Set(yard.loose)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y)
    expect(shirt.wet).toBe(8)
    // The sleeves are wound in over the front, so the cuffs lie side by side in the middle: one stream from each.
    const streams = yard.loose.filter((thread) => !before.has(thread) && thread.what === 'water')
    expect(new Set(streams.map((thread) => thread.x))).toEqual(new Set([RAIL.hang.x - CUFFS_WRUNG.dx, RAIL.hang.x + CUFFS_WRUNG.dx]))
    expect(CUFFS_WRUNG.dx).toBeLessThan(RAIL.hang.size * 0.15)
    expect(Math.min(...streams.map((thread) => thread.y))).toBe(RAIL.hang.y + CUFFS_WRUNG.dy)
    expect(wringDry(yard)).toBe(3)
    expect(toLine(yard).pegs).toEqual([true, true])
  })

  it('the dungarees groan three times and give nothing, then gush it all; in the tub two big bubbles rise from them', () => {
    const yard = yardFor('dungarees')
    carry(yard, heldAt(0).x, heldAt(0).y, WATER.x, WATER.y)
    play(yard, 0.7)
    expect(yard.bubbles.length).toBe(2)
    // Big ones: bigger than any the suds give off. They come up with the two glugs of its voice.
    for (const bubble of yard.bubbles) expect(bubble.r).toBeGreaterThanOrEqual(18)
    play(yard, 0.4)
    // A bubble over the garment is popped first, and the next tap takes the garment.
    const bubbles = yard.bubbles.length
    tapAt(yard, yard.bubbles[0].x, yard.bubbles[0].y)
    expect(yard.bubbles.length).toBe(bubbles - 1)
    play(yard, 2.5)
    tapAt(yard, TUB_SLOTS[0].x, TUB_SLOTS[0].y)
    play(yard, 0.7)
    const dungarees = toRail(yard)
    for (let n = 0; n < 3; n++) { tapAt(yard, RAIL.hang.x, RAIL.hang.y); expect(dungarees.wet).toBe(10) }
    heard(yard)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y)
    expect(dungarees.wet).toBe(0)
    expect(says(heard(yard), V.wrung('dungarees', 1, true, 0.5))).toBe(true)
    // The line dips under them more than under a sock.
    toLine(yard)
    const heavy = Math.max(...Array.from({ length: 30 }, () => { yard.step(FRAME); return Math.abs(yard.line.pull) }))
    const light = yardFor('sock')
    toBoard(light); toRail(light); toLine(light)
    expect(heavy).toBeGreaterThan(Math.max(...Array.from({ length: 30 }, () => { light.step(FRAME); return Math.abs(light.line.pull) })))
  })

  it('the jumper drinks the tub, makes the most suds of all, pours a little for every crossing of the finger and gives the water back', () => {
    const yard = yardFor('jumper')
    carry(yard, heldAt(0).x, heldAt(0).y, WATER.x, WATER.y)
    expect(yard.water.level).toBe(7)
    play(yard, 0.7)
    tapAt(yard, TUB_SLOTS[0].x, TUB_SLOTS[0].y)
    play(yard, 0.7)
    tapAt(yard, SOAP.x, SOAP.y)
    const jumper = yard.garmentAt('board')!
    expect(jumper.suds).toBe(10)
    expect(yard.knots.length).toBe(30)
    toRail(yard)
    // A finger that keeps crossing keeps it pouring.
    yard.press(RAIL.hang.x - 80, RAIL.hang.y)
    for (let n = 0; n < 3; n++) yard.drag(RAIL.hang.x + (n % 2 ? -80 : 80), RAIL.hang.y)
    yard.tap()
    expect(jumper.wet).toBeLessThan(5)
    expect(jumper.wet).toBeGreaterThan(0)
    expect(yard.water.level).toBeGreaterThan(7)
  })

  it('the hat gives one fat spurt a squeeze, and its soapy bobble squeaks when pressed and still rubs clean', () => {
    const yard = yardFor('hat')
    const hat = toBoard(yard)
    tapAt(yard, SOAP.x, SOAP.y)
    play(yard, 2)
    heard(yard)
    hat.mud[15] = 2
    const bobble = cellAt(15)
    tapAt(yard, bobble.x, bobble.y)
    expect(says(heard(yard), V.foamSqueak(0.5))).toBe(true)
    expect(hat.mud[15]).toBe(1)
    // The bobble rolls under a rubbing finger.
    yard.press(bobble.x, bobble.y)
    yard.drag(bobble.x + 24, bobble.y + 12)
    expect(yard.bobble.dx).toBeGreaterThan(0)
    yard.tap()
    toRail(yard)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y)
    expect(hat.wet).toBe(6)
    expect(yard.loose.some((drop) => drop.what === 'water' && drop.vy < -400)).toBe(true)
  })

  it('the scarf beads its water out a little at a time and hangs by one peg', () => {
    const yard = yardFor('scarf')
    toBoard(yard); const scarf = toRail(yard)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y)
    expect(scarf.wet).toBe(8.5)
    expect(wringDry(yard)).toBe(5)
    expect(toLine(yard).pegs).toEqual([true, false])
  })

  it('each garment takes the soap its own way: the suds lie differently on every one', () => {
    const lies = KINDS.map((kind) => {
      const yard = yardFor(kind)
      toBoard(yard)
      tapAt(yard, SOAP.x, SOAP.y)
      return JSON.stringify(yard.knots.map((knot) => [knot.u.toFixed(2), knot.v.toFixed(2)]))
    })
    expect(new Set(lies).size).toBe(KINDS.length)
  })
})

describe('the rest of the yard goes through the wash too', () => {
  it('the cat on the board lies in the water, yowls up a scale as it is rubbed and comes up fluffed; then it goes back to its post', () => {
    const yard = open()
    carry(yard, CAT.x, CAT.y, BOARD_SPOT.x, BOARD_SPOT.y)
    expect(yard.cat.at).toBe('board')
    expect(yard.cat.wet).toBe(10)
    play(yard, 0.6)
    heard(yard)
    yard.press(BOARD_SPOT.x, BOARD_SPOT.y)
    const first = heard(yard)
    expect(yard.cat.fluff).toBe(1)
    for (let n = 0; n < 40 && yard.cat.fluff < 10; n++) yard.drag(BOARD_SPOT.x + (n % 2 ? 40 : -40), BOARD_SPOT.y)
    const last = heard(yard)
    yard.tap()
    expect(yard.cat.fluff).toBe(10)
    expect(Math.max(...last.map((note) => note.frequency))).toBeGreaterThan(Math.max(...first.map((note) => note.frequency)))
    tapAt(yard, BOARD_SPOT.x, BOARD_SPOT.y)
    expect(yard.cat.at).toBe('fence')
  })

  it('the cat on the rail cannot be twisted: it shakes itself, sprays everyone in the yard and goes back to its post', () => {
    const yard = open()
    callIn(yard, 0)
    carry(yard, CAT.x, CAT.y, RAIL.hang.x, RAIL.hang.y)
    expect(yard.cat.at).toBe('rail')
    play(yard, 0.6)
    heard(yard)
    const at = yard.catSpot()
    tapAt(yard, at.x, at.y)
    expect(says(heard(yard), V.brrrt(0.5))).toBe(true)
    expect(yard.friends[0].reaction?.what).toBe('dripped')
    expect(yard.friends[0].wet).toBeGreaterThan(0)
    play(yard, 1.2)
    expect(yard.cat.at).toBe('fence')
  })

  it('the cat pegged on the line hangs there and purrs, and a tap lets it down', () => {
    const yard = open()
    carry(yard, CAT.x, CAT.y, lineSpot(1).x, lineSpot(1).y)
    expect(yard.cat.at).toBe('line')
    expect(yard.cat.n).toBe(1)
    expect(says(heard(yard), V.purr(0.5))).toBe(true)
    play(yard, 0.6)
    tapAt(yard, lineSpot(1).x, lineSpot(1).y)
    expect(yard.cat.at).toBe('fence')
  })

  it('the cat hates water as cats do: dropped in the tub it is out again in the same breath, wet', () => {
    const yard = open()
    carry(yard, CAT.x, CAT.y, WATER.x, WATER.y)
    expect(yard.cat.at).toBe('fence')
    expect(yard.cat.wet).toBe(10)
    expect(says(heard(yard), V.hissed(0.5))).toBe(true)
  })

  it('a peg runs down the board and comes out shiny, squeaks on the rail, chains to another peg, and is flicked off a friend', () => {
    const yard = open()
    callIn(yard, 0)
    heard(yard)
    const from = (i: number) => yard.pegSpot(i)
    carry(yard, from(0).x, from(0).y, BOARD_SPOT.x, BOARD_SPOT.y)
    expect(yard.pegs[0].state).toBe('board')
    expect(yard.pegs[0].shiny).toBe(true)
    expect(says(heard(yard), V.clatter(0.5))).toBe(true)
    play(yard, 1.2)
    expect(yard.pegs[0].state).toBe('home')

    carry(yard, from(2).x, from(2).y, RAIL.hang.x, RAIL.hang.y)
    expect(yard.pegs[2].state).toBe('rail')
    expect(says(heard(yard), V.rubber(0.5))).toBe(true)
    play(yard, 1.4)
    expect(yard.pegs[2].state).toBe('home')

    carry(yard, from(4).x, from(4).y, pegHome(5).x, pegHome(5).y + 10)
    expect(yard.pegs[4].state).toBe('chain')
    expect(yard.pegs[4].to).toBe(5)
    expect(says(heard(yard), V.jingle(0.5))).toBe(true)
    tapAt(yard, from(4).x, from(4).y)
    expect(yard.pegs[4].state).toBe('home')

    play(yard, 0.5)
    carry(yard, from(3).x, from(3).y, bodyAt(0).x, bodyAt(0).y)
    expect(yard.pegs[3].state).toBe('friend')
    expect(yard.friends[0].reaction?.what).toBe('pegged')
    heard(yard)
    play(yard, 2.4)
    expect(yard.pegs[3].state).toBe('home')
    expect(says(heard(yard), V.pop(0.5))).toBe(true)
    // Where a loose peg is is not saved: opened again, every peg is at its place, and the shiny one is still shiny.
    const again = reopened(yard)
    expect(again.pegs.every((peg) => peg.state === 'home')).toBe(true)
    expect(again.pegs.map((peg) => peg.shiny)).toEqual([true, false, false, false, false, false])
  })

  it('the soap sledges down the bare board into the tub, shoots out of the rail, falls off the line onto whoever stands below, and soaps what lies on the board', () => {
    const yard = open()
    callIn(yard, 0)
    heard(yard)
    carry(yard, SOAP.x, SOAP.y, BOARD_SPOT.x, BOARD_SPOT.y)
    expect(yard.soap.at).toBe('tub')
    expect(yard.knots.length).toBe(18)
    expect(says(heard(yard), V.whee(0.5))).toBe(true)
    play(yard, 0.8)
    let at = yard.soapSpot()
    tapAt(yard, at.x, at.y)
    expect(yard.soap.at).toBe('dish')
    play(yard, 0.8)

    carry(yard, SOAP.x, SOAP.y, RAIL.hang.x, RAIL.hang.y)
    expect(yard.soap.at).toBe('tub')
    expect(says(heard(yard), V.pfft(0.5))).toBe(true)
    play(yard, 0.9)
    at = yard.soapSpot()
    tapAt(yard, at.x, at.y)
    play(yard, 0.8)

    carry(yard, SOAP.x, SOAP.y, lineSpot(0).x, lineSpot(0).y)
    expect(yard.soap.at).toBe('grass')
    heard(yard)
    play(yard, 0.5)
    expect(yard.friends[0].reaction?.what).toBe('bonk')
    expect(says(heard(yard), V.bonk(0.5))).toBe(true)
    at = yard.soapSpot()
    tapAt(yard, at.x, at.y)
    expect(yard.soap.at).toBe('dish')
    play(yard, 0.8)

    const garment = toBoard(yard)
    carry(yard, SOAP.x, SOAP.y, BOARD_SPOT.x, BOARD_SPOT.y)
    expect(garment.suds).toBeGreaterThanOrEqual(3)
    expect(yard.soap.at).toBe('dish')
  })

  it.each([0, 1, 2])('friend %i climbs into the tub in its own way, the mud lifts off its hide as it is rubbed, and clean it climbs out again', (friend) => {
    const yard = open(2, 5)
    callIn(yard, 0)
    expect(yard.friends.every((one) => one.where === 'yard')).toBe(true)
    toBoard(yard, friend)
    const one = yard.friends[friend]
    expect(one.hide.some((level) => level > 0)).toBe(true)
    heard(yard)
    carry(yard, bodyAt(friend).x, bodyAt(friend).y, WATER.x - 60, WATER.y - 30)
    expect(one.where).toBe('tub')
    expect(one.reaction?.what).toBe('climb')
    expect(says(heard(yard), V.climbIn(one.kind, 0.5))).toBe(true)
    play(yard, 1.2)
    const reach = one.kind === 'heron' ? 232 : 180
    for (let pass = 0; pass < 8 && one.hide.some((level) => level > 0); pass++) {
      yard.press(one.x, one.y - reach * YARD_SCALE)
      for (let n = 0; n < 60; n++) {
        const u = ((n * 7) % 20) / 20 - 0.5, v = ((n * 3) % 20) / 20 - 0.5
        yard.drag(Math.max(300, one.x + u * 130), one.y - reach * YARD_SCALE + v * reach * 1.4)
        yard.step(FRAME)
      }
      yard.tap()
    }
    expect(one.hide.every((level) => level === 0)).toBe(true)
    expect(says(heard(yard), V.tubVoice(one.kind, 0.5))).toBe(true)
    expect(yard.water.cloud).toBeGreaterThan(0)
    tapAt(yard, one.x + 20, one.y - reach * YARD_SCALE)
    expect(one.where).toBe('yard')
    expect(one.wet).toBe(10)
    play(yard, 2)
    expect(one.x).toBe(PLACE_X[friend])
  })

  it('a friend wrung on the rail is tickled: it laughs in its own voice and walks back to its place', () => {
    const yard = open()
    callIn(yard, 0)
    toBoard(yard)
    heard(yard)
    carry(yard, bodyAt(0).x, bodyAt(0).y, RAIL.hang.x, RAIL.hang.y)
    expect(yard.friends[0].reaction?.what).toBe('tickle')
    expect(says(heard(yard), V.laugh('pig', 0.5))).toBe(true)
    expect(yard.friends[0].where).toBe('yard')
    play(yard, 3)
    expect(yard.friends[0].x).toBe(PLACE_X[0])
    expect(yard.friends[0].y).toBe(FEET_Y)
  })

  it('a thing dropped into the puddle comes out muddy', () => {
    const yard = open()
    callIn(yard, 0)
    const garment = toBoard(yard)
    rubClean(yard)
    carry(yard, BOARD_SPOT.x, BOARD_SPOT.y, PUDDLE.x, PUDDLE.y)
    expect(garment.at).toBe('puddle')
    expect(mudLeft(garment.mud)).toBeGreaterThan(0)
    play(yard, 0.7)
    // Tapped where it lies it goes back to the board, since it is muddy again.
    tapAt(yard, garment.x, garment.y)
    expect(garment.at).toBe('board')
  })
})

describe('the error as a consequence', () => {
  it('half rubbed: the mud that was not rubbed off stays where it was, on the rail, on the line and on the wearer, and draws flies there', () => {
    const yard = open()
    callIn(yard, 0)
    const garment = toBoard(yard)
    const at = cellAt(muddiest(garment))
    tapAt(yard, at.x, at.y)
    const mud = garment.mud.slice()
    expect(mudLeft(mud)).toBeGreaterThan(0)
    toRail(yard); wringDry(yard); toLine(yard)
    expect(garment.mud).toEqual(mud)
    carry(yard, lineSpot(0).x, lineSpot(0).y, bodyAt(0).x, bodyAt(0).y)
    watch(yard)
    expect(garment.mud).toEqual(mud)
    expect(fliesOn(garment).length).toBeGreaterThan(0)
    for (const patch of fliesOn(garment)) expect(garment.mud[Math.floor(patch.v * ROWS) * COLS + Math.floor(patch.u * COLS)] + mudLeft(garment.mud)).toBeGreaterThan(0)
    heard(yard)
    play(yard, 8)
    expect(says(heard(yard), V.buzz(0.5))).toBe(true)
  })

  it('half wrung: it drips where it hangs, on whoever stands below, until the wind has dried it, and that takes longer the wetter it is', () => {
    const dry = (squeezes: number) => {
      const yard = yardFor('shirt')
      toBoard(yard); const shirt = toRail(yard)
      for (let n = 0; n < squeezes; n++) tapAt(yard, RAIL.hang.x, RAIL.hang.y)
      toLine(yard)
      const pig = yard.friends[0]
      let seconds = 0, dripped = 0
      while (shirt.wet > DAMP && seconds < 60) {
        yard.step(FRAME); seconds += FRAME
        if (pig.reaction?.what === 'dripped' && pig.reaction.age < FRAME * 1.5) dripped += 1
      }
      return { seconds, dripped, drops: says(heard(yard), V.drip(0.5)), wet: pig.wet }
    }
    const wet = dry(0), half = dry(2)
    expect(wet.dripped).toBeGreaterThan(1)
    expect(wet.drops).toBe(true)
    expect(wet.seconds).toBeGreaterThan(half.seconds * 1.5)
    expect(half.seconds).toBeGreaterThan(3)
  })

  it('still soapy: suds that were not wrung out trail bubbles off the garment on the line and on the wearer', () => {
    const yard = yardFor('jumper')
    toBoard(yard)
    tapAt(yard, SOAP.x, SOAP.y)
    play(yard, 2)
    const jumper = toRail(yard)
    toLine(yard)
    expect(jumper.suds).toBeGreaterThan(SOAPY)
    yard.bubbles.length = 0
    play(yard, 2)
    expect(yard.bubbles.length).toBeGreaterThan(0)
    carry(yard, lineSpot(0).x, lineSpot(0).y, bodyAt(0).x, bodyAt(0).y)
    watch(yard)
    yard.bubbles.length = 0
    play(yard, 2)
    expect(yard.bubbles.length).toBeGreaterThan(0)
  })

  it('one peg, or none: without a peg it slides off in the next gust, onto whoever stands below or onto the grass, and can be picked up again', () => {
    const yard = yardFor('shirt')
    toBoard(yard); const shirt = toRail(yard); wringDry(yard); toLine(yard)
    const tapPeg = (i: number) => tapAt(yard, yard.pegSpot(i).x, yard.pegSpot(i).y)
    tapPeg(0)
    expect(shirt.pegs).toEqual([false, true])
    play(yard, GUST_EVERY + 1)
    expect(shirt.at).toBe('line')
    tapPeg(1)
    expect(shirt.pegs).toEqual([false, false])
    heard(yard)
    play(yard, GUST_EVERY + 1)
    // The pig stands below with nothing on: it lands on the pig with a bonk, and no scene plays.
    expect(says(heard(yard), V.bonk(0.5))).toBe(true)
    expect(yard.sceneRunning).toBe(false)
    expect(shirt.at).toBe('friend')
    expect(yard.friends[0].wears).toBe(shirt)
    // Pulled off again and pegged, then unpegged above a pig that is dressed: it lands on the grass.
    const other = yard.garments[1]
    carry(yard, bodyAt(0).x, bodyAt(0).y, lineSpot(0).x, lineSpot(0).y)
    expect(shirt.at).toBe('line')
    expect(yard.friends[0].wears).toBeNull()
    callIn(yard, 1)
    carry(yard, heldAt(1).x, heldAt(1).y, bodyAt(0).x, bodyAt(0).y)
    watch(yard)
    expect(yard.friends[0].wears).toBe(other)
    tapPeg(0); tapPeg(1)
    play(yard, GUST_EVERY + 1)
    expect(shirt.at).toBe('grass')
    // Tapped where it lies, it goes back to the board, since it is still muddy.
    play(yard, 0.7)
    tapAt(yard, shirt.x, shirt.y)
    expect(shirt.at).toBe('board')
  })

  it('the wrong wearer: the garment goes on where it fits that body, and the friend answers this garment in this state by its own taste', () => {
    // The jumper on the pig: it trips.
    let yard = yardFor('jumper')
    carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y)
    play(yard, 2.1)
    expect(yard.friends[0].reaction?.what).toBe('trip')
    // A sock on the heron's beak: stiff as a plank.
    yard = withKinds(['sock', 'shirt', 'dungarees'], 1, LADDER[1])
    callIn(yard, 0)
    const heron = yard.friends[1]
    expect(heron.where).toBe('yard')
    carry(yard, heldAt(0).x, heldAt(0).y, heron.x - 80 * YARD_SCALE, heron.y - 384 * YARD_SCALE)
    expect(heron.on).toBe('beak')
    play(yard, 2.1)
    expect(heron.reaction?.what).toBe('plank')
    // The same sock, wet: the heron shudders first.
    watch(yard)
    const sock = yard.garments[0]
    carry(yard, heron.x - 80 * YARD_SCALE, heron.y - 384 * YARD_SCALE, WATER.x, WATER.y)
    expect(sock.at).toBe('tub')
    play(yard, 0.7)
    carry(yard, TUB_SLOTS[sock.n].x, TUB_SLOTS[sock.n].y, heron.x, heron.y - 60)
    expect(heron.on).toBe('foot')
    play(yard, 2.1)
    expect(heron.reaction?.what).toBe('shudder')
    // A muddy thing on the goat: it sneezes; a clean soapy one: it licks it.
    yard = withKinds(['sock', 'shirt', 'dungarees'], 1, LADDER[2])
    callIn(yard, 0)
    carry(yard, heldAt(2).x, heldAt(2).y, bodyAt(2).x, bodyAt(2).y)
    play(yard, 2.1)
    expect(yard.friends[2].reaction?.what).toBe('sneeze')
  })

  it('what a friend wore before comes off and lies at its feet', () => {
    const yard = open(1, 4)
    callIn(yard, 0)
    carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y)
    watch(yard)
    carry(yard, heldAt(1).x, heldAt(1).y, bodyAt(0).x, bodyAt(0).y)
    expect(yard.friends[0].wears).toBe(yard.garments[1])
    expect(yard.garments[0].at).toBe('grass')
  })

  it('the gate, with someone still in underwear: it rattles, that one crosses its arms, and nobody leaves', () => {
    const yard = open(1, 4)
    callIn(yard, 0)
    washAndDress(yard, 0)
    const before = JSON.stringify(yard.toSave())
    heard(yard)
    yard.changed = false
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    expect(yard.sceneRunning).toBe(false)
    expect(yard.finished).toBe(false)
    expect(yard.friends[1].reaction?.what).toBe('refuse')
    expect(yard.friends[0].reaction?.what ?? '').not.toBe('refuse')
    expect(says(heard(yard), V.rattleGate(0.5))).toBe(true)
    yard.step(FRAME)
    expect(yard.gate.rattle).not.toBe(0)
    expect(JSON.stringify(yard.toSave())).toBe(before)
    expect(yard.friends.map((friend) => friend.where)).toEqual(['yard', 'yard', 'gate'])
  })

  it('the state stays: a garment can be pulled off a wearer and taken back to the board, and nothing is tidied', () => {
    const yard = open()
    callIn(yard, 0)
    const garment = yard.garments[0]
    carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y)
    watch(yard)
    const mud = garment.mud.slice()
    const worn = yard.spotOf(garment)
    carry(yard, worn.x, worn.y, BOARD_SPOT.x, BOARD_SPOT.y)
    expect(garment.at).toBe('board')
    expect(yard.friends[0].wears).toBeNull()
    expect(garment.mud).toEqual(mud)
  })
})

describe('taps that only nudge, and touches that are taken away', () => {
  it('a thing let go close to where it was picked up was only nudged: that is a tap', () => {
    const yard = open()
    callIn(yard, 0)
    const at = heldAt(0)
    yard.press(at.x, at.y)
    yard.drag(at.x + 12, at.y + 9)
    yard.lift()
    yard.drop()
    expect(yard.garments[0].at).toBe('board')
  })

  it('a touch that is taken away is not the child letting go: the thing goes back and no move is made', () => {
    const yard = open()
    callIn(yard, 0)
    const at = heldAt(0)
    yard.press(at.x, at.y)
    yard.drag(BOARD_SPOT.x, BOARD_SPOT.y)
    expect(yard.carrying).toBe(true)
    yard.cancel()
    expect(yard.carrying).toBe(false)
    expect(yard.garments[0].at).toBe('held')
    play(yard, 0.5)
    expect(yard.friends[0].holds).toBe(yard.garments[0])
  })
})

describe('what a frame holds', () => {
  it('stays bounded however long and hard the yard is played', () => {
    const yard = open(1, 5)
    callIn(yard, 0)
    toBoard(yard)
    for (let n = 0; n < 1500; n++) {
      const x = CLOTH.x + ((n * 37) % CLOTH.w), y = CLOTH.y + ((n * 53) % CLOTH.h)
      if (n % 50 === 0) { yard.tap(); tapAt(yard, PUDDLE.x, PUDDLE.y); tapAt(yard, SOAP.x, SOAP.y); tapAt(yard, WATER.x, WATER.y); yard.press(x, y) }
      yard.drag(x, y)
      yard.step(FRAME)
      yard.heard = []
      expect(yard.loose.length).toBeLessThanOrEqual(60)
      expect(yard.bubbles.length).toBeLessThanOrEqual(8)
      expect(yard.knots.length).toBeLessThanOrEqual(46)
      expect(yard.rings.length).toBeLessThanOrEqual(4)
      expect(yard.dollops.length).toBeLessThanOrEqual(3)
      expect(yard.runs.length).toBeLessThanOrEqual(8)
    }
    expect(yard.water.cloud).toBeLessThanOrEqual(10)
    expect(yard.garmentAt('board')!.suds).toBeLessThanOrEqual(10)
  })
})

describe('the sheet, sentence by sentence: what a reader found missing', () => {
  it('the first suds sprout in the frame the finger lands, on every cloth', () => {
    for (const kind of KINDS) {
      const yard = yardFor(kind)
      const garment = toBoard(yard)
      expect(yard.knots, kind).toHaveLength(0)
      const at = cellAt(muddiest(garment))
      yard.press(at.x, at.y)
      expect(yard.knots.length, kind).toBeGreaterThan(0)
      yard.tap()
    }
  })

  it('every ridge the finger crosses ticks: five ridges crossed in one frame are five ticks, one after another', () => {
    const yard = yardFor('jumper')
    toBoard(yard)
    const x = CLOTH.x + CLOTH.w / 2, y0 = RIDGES.y + RIDGES.gap * 2 + 12, y1 = y0 + RIDGES.gap * 5
    yard.press(x, y0)
    yard.step(FRAME)
    heard(yard)
    yard.drag(x, y1)
    yard.step(FRAME)
    const tick = make(V.ridge('jumper', 0.5, 0.5)[0])
    const ticks = heard(yard).filter((note) => make(note) === tick)
    expect(ticks).toHaveLength(5)
    const delays = ticks.map((note) => note.delay ?? 0)
    expect(new Set(delays).size).toBe(5)
    expect(Math.max(...delays)).toBeLessThan(FRAME)
    // And the next frame, with the finger still, is silent: a tick belongs to a ridge crossed.
    yard.step(FRAME)
    expect(heard(yard).filter((note) => make(note) === tick)).toHaveLength(0)
    yard.tap()
  })

  it('brown runs down the board into the tub from where the mud came off, and is gone when it reaches the water', () => {
    const yard = yardFor('shirt')
    const shirt = toBoard(yard)
    const at = cellAt(muddiest(shirt))
    expect(yard.runs).toHaveLength(0)
    yard.press(at.x, at.y)
    for (let n = 0; n < 6 && yard.runs.length === 0; n++) { yard.tap(); yard.press(at.x, at.y) }
    expect(yard.runs.length).toBeGreaterThan(0)
    const run = yard.runs[0], from = run.y
    expect(Math.hypot(run.x - at.x, from - at.y)).toBeLessThan(CLOTH.w * 0.2)
    yard.step(FRAME)
    expect(run.y).toBeGreaterThan(from)
    yard.tap()
    play(yard, 1.5)
    expect(yard.runs).toHaveLength(0)
    expect(from).toBeLessThan(TUB.y + 30)
  })

  it('the scarf is pulled across the ridges length by length: it comes with the finger, zips as each length lets go, and ticks sideways', () => {
    const yard = yardFor('scarf')
    toBoard(yard)
    const at = { x: CLOTH.x + CLOTH.w * 0.4, y: CLOTH.y + CLOTH.h * 0.39 }
    yard.press(at.x, at.y)
    yard.step(FRAME)
    heard(yard)
    yard.drag(at.x + 20, at.y)
    expect(yard.scarf.pull).toBe(20)
    yard.step(FRAME)
    // Pulled sideways it crosses ridges of its own, in the scarf's voice, though the finger went neither up nor down.
    const notes = heard(yard)
    expect(says(notes, V.ridge('scarf', 0.5, 0.5))).toBe(true)
    expect(says(notes, V.zip(0.5))).toBe(false)
    yard.drag(at.x + 20 + SCARF_LENGTH, at.y)
    expect(says(heard(yard), V.zip(0.5))).toBe(true)
    expect(yard.scarf.pull).toBe(20)
    // Let go, it settles back on the board.
    yard.tap()
    play(yard, 1)
    expect(Math.abs(yard.scarf.pull)).toBeLessThan(0.5)
  })

  it("the shirt's button pops with a ping when the shirt is on, stays off while it is worn and after a reopening, and is back when the shirt comes off", () => {
    const yard = withKinds(['shirt', 'dungarees', 'sock'])
    callIn(yard, 0)
    const shirt = toBoard(yard)
    rubClean(yard); toRail(yard); wringDry(yard); toLine(yard)
    expect(yard.buttonOff(shirt)).toBe(false)
    tapAt(yard, lineSpot(0).x, lineSpot(0).y)
    expect(yard.buttonOff(shirt)).toBe(false)
    heard(yard)
    let pinged = false
    for (let n = 0; n < 600 && !yard.buttonOff(shirt); n++) {
      yard.step(FRAME)
      const notes = heard(yard)
      if (says(notes, V.ping(0.5))) { pinged = true; expect(yard.buttonOff(shirt)).toBe(true) }
    }
    expect(pinged).toBe(true)
    watch(yard)
    expect(yard.buttonOff(shirt)).toBe(true)
    const again = reopened(yard)
    expect(again.buttonOff(again.garments[shirt.index])).toBe(true)
    // Pulled off the pig, the button is back.
    carry(yard, bodyAt(0).x, bodyAt(0).y, lineSpot(0).x, lineSpot(0).y)
    expect(yard.friends[0].wears).toBeNull()
    expect(yard.buttonOff(shirt)).toBe(false)
  })

  it('a touch on the rail beside the cat that hangs there makes it shake, the same as a touch on the cat', () => {
    const yard = open()
    callIn(yard, 0)
    carry(yard, CAT.x, CAT.y, RAIL.hang.x, RAIL.hang.y)
    play(yard, 0.6)
    heard(yard)
    tapAt(yard, RAIL.box.x + 24, RAIL.hang.y + 30)
    expect(yard.cat.shaking).toBeGreaterThan(0)
    expect(says(heard(yard), V.brrrt(0.5))).toBe(true)
    expect(yard.friends[0].reaction?.what).toBe('dripped')
    play(yard, 1.2)
    expect(yard.cat.at).toBe('fence')
  })

  it('a friend dropped into the puddle comes out muddy with a splat, and the mud is kept', () => {
    for (let friend = 0; friend < 3; friend++) {
      const yard = open(1, 5)
      callIn(yard, friend)
      const who = yard.friends[friend]
      toBoard(yard, friend)
      who.hide.fill(0)
      heard(yard)
      carry(yard, bodyAt(friend).x, bodyAt(friend).y, PUDDLE.x, PUDDLE.y)
      expect(who.hide.reduce((sum, level) => sum + level, 0), who.kind).toBeGreaterThan(0)
      expect(says(heard(yard), V.splat(0.5)), who.kind).toBe(true)
      expect(who.reaction?.what).toBe('splat')
      play(yard, 4)
      expect(who.where).toBe('yard')
      const again = reopened(yard)
      expect(again.friends[friend].hide).toEqual(who.hide)
    }
  })

  it('the heron shudders hardest at a damp thing with sleeves', () => {
    const variantFor = (kinds: [Kind, Kind, Kind]) => {
      const yard = withKinds(kinds)
      callIn(yard, 1)
      toBoard(yard, 1); toRail(yard)
      carry(yard, RAIL.hang.x, RAIL.hang.y, bodyAt(1).x, bodyAt(1).y)
      for (let n = 0; n < 400 && yard.friends[1].reaction?.what !== 'shudder'; n++) yard.step(FRAME)
      expect(yard.friends[1].reaction?.what).toBe('shudder')
      return yard.friends[1].reaction!.variant
    }
    expect(variantFor(['sock', 'shirt', 'dungarees'])).toBe(1)
    expect(variantFor(['hat', 'jumper', 'scarf'])).toBe(1)
    expect(variantFor(['shirt', 'dungarees', 'sock'])).toBe(0)
    expect(variantFor(['jumper', 'scarf', 'hat'])).toBe(0)
  })

  it('a tapped dry garment goes to its owner and to nobody else, even when the owner wears another thing and a neighbour stands bare', () => {
    const yard = withKinds(['sock', 'shirt', 'dungarees'])
    callIn(yard, 0); callIn(yard, 1)
    const sock = yard.garments[0], shirt = yard.garments[1]
    // The pig is dressed in the heron's shirt, and the heron stands bare.
    carry(yard, heldAt(1).x, heldAt(1).y, bodyAt(0).x, bodyAt(0).y)
    watch(yard)
    expect(yard.friends[0].wears).toBe(shirt)
    toBoard(yard); rubClean(yard); toRail(yard); wringDry(yard); toLine(yard)
    tapAt(yard, lineSpot(0).x, lineSpot(0).y)
    watch(yard)
    expect(yard.friends[0].wears).toBe(sock)
    expect(yard.friends[1].wears).toBeNull()
    // What the pig wore lies at its feet, to be picked up again.
    expect(shirt.at).toBe('grass')
  })

  it('a tapped dry garment whose owner sits in the tub stays on the line', () => {
    const yard = withKinds(['sock', 'shirt', 'dungarees'])
    callIn(yard, 0); callIn(yard, 1)
    const sock = toBoard(yard)
    rubClean(yard); toRail(yard); wringDry(yard); toLine(yard)
    carry(yard, bodyAt(0).x, bodyAt(0).y, WATER.x, WATER.y)
    play(yard, 1.5)
    expect(yard.friends[0].where).toBe('tub')
    tapAt(yard, lineSpot(0).x, lineSpot(0).y)
    play(yard, 1)
    expect(sock.at).toBe('line')
    expect(yard.friends[1].wears).toBeNull()
  })

  it('a wearer looks down at a muddy patch each time the flies are heard, the goat too', () => {
    for (let friend = 0; friend < 3; friend++) {
      const yard = open(1, 5)
      callIn(yard, friend)
      carry(yard, heldAt(friend).x, heldAt(friend).y, bodyAt(friend).x, bodyAt(friend).y)
      watch(yard)
      const who = yard.friends[friend]
      expect(who.wears).not.toBeNull()
      play(yard, 3)
      heard(yard)
      let looked = false
      for (let n = 0; n < 60 * 16 && !looked; n++) {
        yard.step(FRAME)
        const buzzed = says(heard(yard), V.buzz(0.5))
        if (buzzed && who.reaction?.what === 'patch') looked = true
      }
      expect(looked, who.kind).toBe(true)
    }
  })

  it('opened again, a garment left on the line without a peg stays where it was until a whole gust has built, however often the yard is opened', () => {
    const yard = yardFor('shirt')
    toBoard(yard); const shirt = toRail(yard); wringDry(yard); toLine(yard)
    tapAt(yard, yard.pegSpot(0).x, yard.pegSpot(0).y); tapAt(yard, yard.pegSpot(1).x, yard.pegSpot(1).y)
    expect(shirt.pegs).toEqual([false, false])
    expect(shirt.at).toBe('line')
    let again = reopened(yard)
    for (let visit = 0; visit < 4; visit++) {
      const mine = again.garments[shirt.index]
      // The first frame moves nothing, and neither do the next six seconds: the gust is still to come.
      again.step(FRAME)
      expect(mine.at).toBe('line')
      expect(again.friends[0].wears).toBeNull()
      play(again, 6)
      expect(mine.at).toBe('line')
      expect(again.friends[0].wears).toBeNull()
      again = reopened(again)
    }
    // Left open, the gust comes and the shirt slides off, as it does in a yard that was never put away.
    play(again, GUST_EVERY)
    expect(again.garments[shirt.index].at).not.toBe('line')
  })
})

describe('the sheet, sentence by sentence: what a second reader found missing', () => {
  it('the goat hiccups bubbles: three leave its mouth in the beat it licks a soapy thing', () => {
    const yard = withKinds(['sock', 'shirt', 'dungarees'])
    callIn(yard, 2)
    toBoard(yard, 2)
    rubClean(yard)
    tapAt(yard, SOAP.x, SOAP.y); play(yard, 2.5)
    const goat = yard.friends[2]
    carry(yard, BOARD_SPOT.x, BOARD_SPOT.y, bodyAt(2).x, bodyAt(2).y)
    expect(yard.sceneRunning).toBe(true)
    const mouth = anchorAtRest('goat', 'snout')
    const hiccups = () => yard.bubbles.filter((bubble) => bubble.age < 0 && Math.abs(bubble.x - (goat.x + mouth.x * goat.scale)) < 1 && bubble.y < goat.y - 150)
    expect(hiccups()).toHaveLength(0)
    for (let n = 0; n < 400 && goat.reaction?.what !== 'lick'; n++) yard.step(FRAME)
    expect(goat.reaction?.what).toBe('lick')
    expect(hiccups()).toHaveLength(3)
    // They rise from there one after another.
    play(yard, 1.5)
    expect(yard.bubbles.filter((bubble) => bubble.age > 0 && bubble.y < goat.y - 150).length).toBeGreaterThanOrEqual(3)
  })

  it('a friend that wears or holds a thing answers a pull as itself: the thing comes away, the wearer jiggles in its own voice, the holder lets go', () => {
    const yard = withKinds(['sock', 'shirt', 'dungarees'])
    callIn(yard, 0); callIn(yard, 1)
    const sock = washAndDress(yard, 0)
    expect(yard.friends[0].wears).toBe(sock)
    play(yard, 1.5)
    heard(yard)
    // The pig wears the sock on its ear: a pull at its belly takes the sock, and the pig answers.
    yard.press(bodyAt(0).x, bodyAt(0).y)
    for (let n = 1; n <= 6; n++) { yard.drag(bodyAt(0).x + n * 14, bodyAt(0).y); yard.step(FRAME) }
    expect(yard.carried).toMatchObject({ what: 'garment', i: sock.index })
    expect(yard.friends[0].reaction?.what).toBe('poke')
    const oinks = heard(yard)
    expect([0, 1, 2].some((variant) => says(oinks, V.oink(variant, 0.5)))).toBe(true)
    yard.cancel()
    expect(yard.friends[0].wears).toBe(sock)
    // The heron still holds its shirt: a pull at the heron takes the shirt, and the heron lets go in its own voice.
    play(yard, 1.5)
    heard(yard)
    yard.press(bodyAt(1).x, bodyAt(1).y + 40)
    for (let n = 1; n <= 6; n++) { yard.drag(bodyAt(1).x + n * 14, bodyAt(1).y + 40); yard.step(FRAME) }
    expect(yard.carried).toMatchObject({ what: 'garment', i: 1 })
    expect(yard.friends[1].reaction?.what).toBe('toss')
    expect(says(heard(yard), V.unsure('heron', 0.5))).toBe(true)
    yard.cancel()
  })

  it('a second friend at a tub that is taken balks at the rim in its own voice and is splashed by the bather', () => {
    const yard = withKinds(['sock', 'shirt', 'dungarees'])
    callIn(yard, 0); callIn(yard, 1)
    toBoard(yard, 0)
    tapAt(yard, heldAt(1).x, heldAt(1).y); play(yard, 0.7)
    carry(yard, bodyAt(0).x, bodyAt(0).y, WATER.x, WATER.y); play(yard, 1.5)
    expect(yard.friends[0].where).toBe('tub')
    heard(yard)
    yard.loose.length = 0
    carry(yard, bodyAt(1).x, bodyAt(1).y, WATER.x, WATER.y)
    const heron = yard.friends[1]
    expect(heron.where).toBe('yard')
    expect(heron.reaction?.what).toBe('refuse')
    expect(yard.friends[0].reaction?.what).toBe('tickle')
    const notes = heard(yard)
    expect(says(notes, V.unsure('heron', 0.5))).toBe(true)
    expect(says(notes, V.laugh('pig', 0.5))).toBe(true)
    expect(yard.loose.filter((drop) => drop.what === 'water').length).toBeGreaterThanOrEqual(8)
    expect(heron.wet).toBeGreaterThan(0)
    play(yard, 3)
    expect(heron.x).toBe(yard.homeOf(heron).x)
  })

  it('the cat let go on a rail or a place of the line that is taken bats at what hangs there with a cross mew, and goes back', () => {
    const yard = yardFor('shirt')
    toBoard(yard); const shirt = toRail(yard)
    carry(yard, CAT.x, CAT.y, RAIL.hang.x, RAIL.hang.y)
    expect(yard.cat.at).toBe('fence')
    expect(yard.cat.reaction).toMatchObject({ what: 'poke', variant: 1 })
    expect(says(heard(yard), V.mew(1, 0.5))).toBe(true)
    expect(shirt.twist).toBe(1)
    play(yard, 1)
    wringDry(yard); toLine(yard)
    play(yard, 0.5)
    heard(yard)
    carry(yard, CAT.x, CAT.y, lineSpot(0).x, lineSpot(0).y)
    expect(yard.cat.at).toBe('fence')
    expect(yard.cat.reaction).toMatchObject({ what: 'poke', variant: 1 })
    expect(says(heard(yard), V.mew(1, 0.5))).toBe(true)
    expect(yard.line.speed).toBeGreaterThan(0)
  })

  it('each patch draws its flies: every patch of mud on a worn garment is given, however many there are', () => {
    const yard = yardFor('jumper')
    const jumper = yard.garments[0]
    jumper.mud.fill(0)
    const lone = [33, 35, 37, 53, 55, 57, 73, 75].filter((cell) => maskOf('jumper')[cell])
    expect(lone.length).toBeGreaterThan(5)
    for (const cell of lone) jumper.mud[cell] = 2
    expect(fliesOn(jumper)).toHaveLength(lone.length)
  })

  it('a lift ticks what the finger crossed since the last frame: no ridge is thrown away', () => {
    const yard = yardFor('jumper')
    toBoard(yard)
    const x = CLOTH.x + CLOTH.w / 2, y0 = RIDGES.y + RIDGES.gap * 2 + 12
    const tick = make(V.ridge('jumper', 0.5, 0.5)[0])
    yard.press(x, y0)
    yard.step(FRAME)
    heard(yard)
    yard.drag(x, y0 + RIDGES.gap * 5)
    yard.tap()
    expect(heard(yard).filter((note) => make(note) === tick)).toHaveLength(5)
    // And a new press before any frame does the same for a finger that was lifted in the middle of a drag.
    yard.press(x, y0)
    heard(yard)
    yard.drag(x, y0 + RIDGES.gap * 3)
    yard.lift()
    yard.press(x, y0)
    expect(heard(yard).filter((note) => make(note) === tick).length).toBeGreaterThanOrEqual(3)
    yard.tap()
  })

  it('the first three are written as the yard is first drawn: put away before any touch, it opens on the same three', () => {
    for (const age of [null, 3, 4, 5, 9]) {
      const first = open(12345, age)
      expect(first.changed && first.urgent).toBe(true)
      const again = reopened(first)
      expect(again.garments.map((garment) => [garment.kind, garment.owner, garment.mud.join('')])).toEqual(first.garments.map((garment) => [garment.kind, garment.owner, garment.mud.join('')]))
      expect(again.friends.map((friend) => [friend.kind, friend.colour, friend.hide.join('')])).toEqual(first.friends.map((friend) => [friend.kind, friend.colour, friend.hide.join('')]))
      expect(again.position).toBe(first.position)
    }
  })

  it('the cat pegged on the line purrs for as long as it hangs there', () => {
    const yard = open()
    carry(yard, CAT.x, CAT.y, lineSpot(1).x, lineSpot(1).y)
    play(yard, 0.6)
    yard.gust = 0
    heard(yard)
    for (let round = 0; round < 2; round++) {
      play(yard, 3)
      expect(says(heard(yard), V.purr(0.5))).toBe(true)
    }
    // Back on its post it is quiet again.
    tapAt(yard, lineSpot(1).x, lineSpot(1).y)
    play(yard, 1)
    heard(yard)
    yard.gust = 0
    play(yard, 4)
    expect(says(heard(yard), V.purr(0.5))).toBe(false)
  })
})

describe('the sheet, sentence by sentence: what a third reader found missing', () => {
  /** Eight bubbles in the air, as many as a frame holds, off to one side where no hand goes. */
  const fill = (yard: Yard): Bubble[] => {
    yard.bubbles.length = 0
    for (let n = 0; n < 8; n++) yard.bubbles.push({ x: 900 + n * 4, y: 220, r: 10, vx: 0, vy: 0, age: 0.5, wobble: n })
    return [...yard.bubbles]
  }
  /** What the yard has made since: `made` new bubbles, all of them kept, and the oldest of the eight popped to make room, one for one. */
  const madeRoom = (yard: Yard, were: readonly Bubble[], least: number, most = least) => {
    const made = yard.bubbles.filter((bubble) => !were.includes(bubble))
    expect(made.length).toBeGreaterThanOrEqual(least)
    expect(made.length).toBeLessThanOrEqual(most)
    // A count that is given exactly is held exactly: each new one took the place of the oldest. (A rubbing finger pops what it crosses, so there the count is loose.)
    expect(yard.bubbles.length).toBeLessThanOrEqual(8)
    if (least === most) {
      expect(yard.bubbles.length).toBe(8)
      expect(yard.bubbles.filter((bubble) => were.includes(bubble))).toEqual(were.slice(made.length))
    }
    return made
  }

  it('a bubble that is heard is always seen: with eight in the air the oldest pops to make room, wherever a bubble is made', () => {
    // Out of the sock's toe, the shirt's two cuffs and the dungarees' two pockets, as the bar goes over them.
    for (const [kind, count] of [['sock', 1], ['shirt', 4], ['dungarees', 2]] as const) {
      const yard = yardFor(kind)
      toBoard(yard)
      const were = fill(yard)
      const threads = yard.loose.filter((thread) => thread.what === 'suds').length
      tapAt(yard, SOAP.x, SOAP.y); play(yard, 2.5)
      madeRoom(yard, were, count)
      // The ones that made room popped: their threads flew.
      expect(yard.loose.filter((thread) => thread.what === 'suds').length + 60).toBeGreaterThan(threads)
    }
    // Off a soapy garment as it is rubbed.
    const rubbed = yardFor('jumper')
    toBoard(rubbed)
    let were = fill(rubbed)
    rubbed.press(BOARD_SPOT.x, BOARD_SPOT.y)
    for (let n = 0; n < 40; n++) { rubbed.drag(BOARD_SPOT.x + (n % 2 ? 50 : -50), BOARD_SPOT.y + 10); rubbed.step(FRAME) }
    rubbed.tap()
    madeRoom(rubbed, were, 1, 8)
    // Off it on the line while it is soapy.
    tapAt(rubbed, SOAP.x, SOAP.y); play(rubbed, 2)
    toRail(rubbed); toLine(rubbed)
    were = fill(rubbed)
    play(rubbed, 2)
    madeRoom(rubbed, were, 1, 8)
    // Out of the dungarees' pockets in the tub.
    const tub = yardFor('dungarees')
    were = fill(tub)
    carry(tub, heldAt(0).x, heldAt(0).y, WATER.x, WATER.y); play(tub, 1.2)
    for (const bubble of madeRoom(tub, were, 2)) expect(bubble.r).toBeGreaterThanOrEqual(18)
    // Blown by the pig in the tub and hiccuped by the goat there.
    for (const friend of [0, 2]) {
      const yard = open(2, 5)
      callIn(yard, 0)
      toBoard(yard, friend)
      const one = yard.friends[friend]
      carry(yard, bodyAt(friend).x, bodyAt(friend).y, WATER.x - 60, WATER.y - 30); play(yard, 1.2)
      were = fill(yard)
      yard.press(one.x, one.y - 180 * YARD_SCALE)
      for (let n = 0; n < 40; n++) { yard.drag(Math.max(300, one.x + (n % 2 ? 50 : -50)), one.y - 180 * YARD_SCALE + (n % 7) * 10); yard.step(FRAME) }
      yard.tap()
      madeRoom(yard, were, 1, 8)
    }
    // Knocked out of a friend by the soap that falls off the line.
    const bonked = open()
    callIn(bonked, 0)
    were = fill(bonked)
    carry(bonked, SOAP.x, SOAP.y, lineSpot(0).x, lineSpot(0).y); play(bonked, 0.5)
    expect(bonked.friends[0].reaction?.what).toBe('bonk')
    madeRoom(bonked, were, 1)
  })

  /** A yard whose goat has just been handed a clean, soapy sock of its own. */
  const lickingGoat = () => {
    const yard = withKinds(['shirt', 'dungarees', 'sock'])
    callIn(yard, 2)
    toBoard(yard, 2)
    rubClean(yard)
    tapAt(yard, SOAP.x, SOAP.y); play(yard, 2.5)
    carry(yard, BOARD_SPOT.x, BOARD_SPOT.y, bodyAt(2).x, bodyAt(2).y)
    return yard
  }

  it('the goat hiccups once for each bubble: a hiccup with a bleat in it, a hop and a bubble, three times, and all three bubbles although the air is full', () => {
    const yard = lickingGoat()
    const goat = yard.friends[2]
    const were = fill(yard)
    heard(yard)
    const notes: Note[] = []
    for (let n = 0; n < 400 && goat.reaction?.what !== 'lick'; n++) { yard.step(FRAME); notes.push(...heard(yard)) }
    expect(goat.reaction?.what).toBe('lick')
    // Three hiccups are asked for in that frame, each to sound when its bubble leaves the mouth.
    const [hic, ...bleat] = V.hiccup(0.5)
    const hics = notes.filter((note) => make(note) === make(hic) && note.frequency >= 400 && note.frequency <= 440 && note.glideTo === 800)
    expect(hics.map((note) => note.delay)).toEqual([...HICCUPS])
    expect(bleat.length).toBeGreaterThan(0)
    for (const note of bleat) expect(notes.filter((other) => make(other) === make(note)).length).toBeGreaterThanOrEqual(3)
    const mouth = anchorAtRest('goat', 'snout')
    const made = madeRoom(yard, were, 3)
    made.map((bubble) => -bubble.age).sort().forEach((wait, n) => expect(Math.abs(wait - HICCUPS[n])).toBeLessThanOrEqual(FRAME + 1e-9))
    for (const bubble of made) expect(Math.abs(bubble.x - (goat.x + mouth.x * goat.scale))).toBeLessThan(1)
    // The answer lasts long enough for all three, and each bubble shows as its hiccup comes.
    expect(LASTS.lick).toBeGreaterThan(HICCUPS[2] + 0.28)
    for (let n = 0; n < HICCUPS.length; n++) {
      while ((goat.reaction?.age ?? 9) < HICCUPS[n] + 0.02) yard.step(FRAME)
      expect(goat.reaction?.what).toBe('lick')
      expect(made.filter((bubble) => bubble.age >= 0)).toHaveLength(n + 1)
    }
  })

  it('the goat wears a muddy thing with its neck at full stretch for as long as it wears it: through its answer, standing, opened again, and walking off', () => {
    const yard = withKinds(['shirt', 'sock', 'dungarees'])
    callIn(yard, 2)
    const goat = yard.friends[2]
    expect(goat.stretch).toBe(0)
    carry(yard, heldAt(2).x, heldAt(2).y, bodyAt(2).x, bodyAt(2).y)
    // Not while it catches the thing and gets into it, and not before it has sneezed.
    let sneezed = false
    for (let n = 0; n < 900 && yard.sceneRunning; n++) {
      yard.step(FRAME)
      if (goat.reaction?.what === 'sneeze') sneezed = true
      if (!sneezed) expect(goat.stretch).toBe(0)
    }
    expect(sneezed).toBe(true)
    expect(goat.wears?.kind).toBe('dungarees')
    expect(goat.stretch).toBe(1)
    // It stays so: long after the answer is over, whatever else it answers.
    play(yard, 6)
    expect(goat.reaction).toBeNull()
    expect(goat.stretch).toBe(1)
    tapAt(yard, bodyAt(2).x + 200, 700); play(yard, 1)
    expect(goat.stretch).toBe(1)
    // Put away and opened again, it is found as left: stretched from the first frame.
    expect(reopened(yard).friends[2].stretch).toBe(1)
    // Rubbed clean on the wearer it would come down; pulled off, it comes down at once.
    const other = reopened(yard)
    carry(other, bodyAt(2).x, bodyAt(2).y, 700, 700); play(other, 0.5)
    expect(other.friends[2].wears).toBeNull()
    expect(other.friends[2].stretch).toBe(0)
    // Walking off in it, it is stretched all the way out of the gate.
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    expect(yard.finished).toBe(true)
    let walked = 0
    watch(yard, () => { for (const leaver of yard.leaving) if (leaver.kind === 'goat') { expect(leaver.stretch).toBe(1); walked += 1 } })
    expect(walked).toBeGreaterThan(60)
    // A clean thing leaves its neck where it was.
    const clean = lickingGoat()
    watch(clean); play(clean, 1)
    expect(clean.friends[2].wears?.kind).toBe('sock')
    expect(clean.friends[2].stretch).toBe(0)
  })

  it("the sock's stripes flash as mud comes off it, and no other garment's do", () => {
    const yard = yardFor('sock')
    const sock = toBoard(yard)
    expect(yard.flash).toBe(0)
    const at = cellAt(muddiest(sock))
    tapAt(yard, at.x, at.y)
    expect(yard.flash).toBe(1)
    play(yard, 0.1)
    expect(yard.flash).toBeGreaterThan(0)
    expect(yard.flash).toBeLessThan(1)
    play(yard, 0.3)
    expect(yard.flash).toBe(0)
    const shirt = yardFor('shirt')
    const lies = cellAt(muddiest(toBoard(shirt)))
    tapAt(shirt, lies.x, lies.y)
    expect(shirt.flash).toBe(0)
  })

  it("the shirt's sleeves clap when its voice on the line does: as it is pegged and a moment into each gust", () => {
    expect(CLAP_AFTER_PEG).toBeGreaterThan(0.3)
    expect(CLAP_AFTER_GUST(0)).toBeLessThan(CLAP_AFTER_GUST(2))
    const yard = yardFor('shirt')
    toBoard(yard); toRail(yard)
    const shirt = yard.garmentAt('rail')!
    heard(yard)
    tapAt(yard, lineSpot(0).x, lineSpot(0).y)
    // Its voice is asked for as it lands, to sound from then: that is when the view begins the clap.
    let landed = -1
    for (let n = 0; n < 60 && landed < 0; n++) { yard.step(FRAME); if (says(heard(yard), V.pegged('shirt', 0.5))) landed = shirt.since }
    // The voice it lands with holds the clack of the peg and then, 0.06 seconds on, its own: the clap begins with that.
    expect(landed).toBeGreaterThan(0)
    expect(Math.abs(landed + 0.06 - CLAP_AFTER_PEG)).toBeLessThan(0.03)
    // And in a gust: the voice is asked for at the gust, to sound `CLAP_AFTER_GUST` later.
    for (let n = 0; n < 60 * (GUST_EVERY + 1); n++) {
      yard.step(FRAME)
      const notes = heard(yard)
      if (!says(notes, V.pegged('shirt', 0.5))) continue
      expect(yard.gust).toBeLessThan(0.05)
      expect(Math.min(...notes.filter((note) => V.pegged('shirt', 0.5).some((want) => make(want) === make(note))).map((note) => note.delay ?? 0))).toBeCloseTo(CLAP_AFTER_GUST(shirt.n), 6)
      return
    }
    throw new Error('no gust blew the shirt')
  })

  it('a wet cat drips: a drop falls from it for each tenth of water it loses', () => {
    const yard = open()
    carry(yard, CAT.x, CAT.y, WATER.x, WATER.y); play(yard, 2)
    expect(yard.cat.at).toBe('fence')
    expect(yard.cat.wet).toBeGreaterThan(8)
    const wet = Math.floor(yard.cat.wet)
    let drops = 0
    for (let n = 0; n < 60 * 10; n++) {
      yard.step(FRAME)
      drops += yard.loose.filter((thread) => thread.what === 'water' && thread.vx === 0 && thread.age < FRAME * 1.5 && Math.abs(thread.x - CAT.x) < 30).length
    }
    expect(drops).toBe(wet - Math.floor(yard.cat.wet))
    expect(drops).toBeGreaterThanOrEqual(3)
  })

  it('the heron shudders the drops off: water flies from both its wings as it shudders', () => {
    const yard = withKinds(['sock', 'shirt', 'dungarees'])
    callIn(yard, 1)
    const heron = yard.friends[1]
    carry(yard, heldAt(1).x, heldAt(1).y, WATER.x, WATER.y); play(yard, 1)
    const shirt = yard.garments[1]
    expect(shirt.wet).toBe(10)
    const at = yard.spotOf(shirt)
    carry(yard, at.x, at.y, bodyAt(1).x, bodyAt(1).y)
    let seen = false
    for (let n = 0; n < 900 && yard.sceneRunning; n++) {
      const before = new Set(yard.loose)
      yard.step(FRAME)
      if (heron.reaction?.what !== 'shudder' || heron.reaction.age > FRAME * 1.5) continue
      const thrown = yard.loose.filter((thread) => !before.has(thread) && thread.what === 'water')
      expect(thrown.filter((thread) => thread.x < heron.x).length).toBeGreaterThanOrEqual(3)
      expect(thrown.filter((thread) => thread.x > heron.x).length).toBeGreaterThanOrEqual(3)
      seen = true
    }
    expect(seen).toBe(true)
  })
})

describe('the sheet, sentence by sentence: what a fourth reader found missing', () => {
  it("the hat's bobble is heard when it is seen to knock: tok at the end of each swing on the line, to one side and then the other, louder in a gust, and never off the line", () => {
    const yard = yardFor('hat')
    const isKnock = (note: Note) => make(note) === make(V.knock(0, 0.5)[0])
    // Held, on the board and on the rail it hangs still: no knock.
    toBoard(yard)
    play(yard, 3)
    toRail(yard)
    play(yard, 3)
    expect(heard(yard).filter(isKnock)).toHaveLength(0)
    const hat = toLine(yard)
    expect(hat.pegs[0] || hat.pegs[1]).toBe(true)
    const knocks: { swing: number; loud: number; pitch: number; gust: number }[] = []
    for (let n = 0; n < 60 * (GUST_EVERY * 2 + 2); n++) {
      yard.step(FRAME)
      for (const note of heard(yard).filter(isKnock)) {
        // What the view draws in this frame: the bobble as far out as this swing takes it, within a frame's worth.
        const pose = linePose('hat', yard.time, windAt(yard.time), yard.gust, hat.wet, hat.pegs[0], hat.pegs[1])
        knocks.push({ swing: pose.bobble / hatSway(windAt(yard.time), yard.gust), loud: note.peak, pitch: note.frequency, gust: yard.gust })
      }
    }
    // One at the end of every swing, and none between.
    const swings = Math.round((GUST_EVERY * 2 + 2) * HAT_SWINGS / Math.PI)
    expect(Math.abs(knocks.length - swings)).toBeLessThanOrEqual(1)
    for (const knock of knocks) expect(Math.abs(knock.swing)).toBeGreaterThan(0.995)
    // Tok to one side, tok to the other.
    for (let n = 1; n < knocks.length; n++) {
      expect(Math.sign(knocks[n].swing)).toBe(-Math.sign(knocks[n - 1].swing))
      expect(knocks[n].pitch > 500).toBe(!(knocks[n - 1].pitch > 500))
    }
    // The loudest are the ones in a gust, where it swings widest.
    const inGust = knocks.filter((knock) => knock.gust > 0.7 && knock.gust < HAT_GUSTED - 0.7), calm = knocks.filter((knock) => knock.gust > HAT_GUSTED)
    expect(inGust.length).toBeGreaterThan(0)
    expect(Math.max(...inGust.map((knock) => knock.loud))).toBeGreaterThanOrEqual(Math.max(...calm.map((knock) => knock.loud)))
    // Carried off the line, it is quiet again.
    carry(yard, lineSpot(0).x, lineSpot(0).y, BOARD_SPOT.x, BOARD_SPOT.y); play(yard, 0.8)
    heard(yard)
    play(yard, 4)
    expect(heard(yard).filter(isKnock)).toHaveLength(0)
  })

  it('a dab lifts mud wherever it lands on the dungarees, the pockets too: with only pocket mud left the first dab takes a step off, and the water clouds with it', () => {
    const yard = yardFor('dungarees')
    const dungarees = toBoard(yard)
    for (let cell = 0; cell < CELLS; cell++) dungarees.mud[cell] = 0
    const pocket = Math.floor(0.55 * ROWS) * COLS + Math.floor(0.35 * COLS)
    dungarees.mud[pocket] = 3
    const at = cellAt(pocket)
    for (let left = 2; left >= 0; left--) {
      const cloud = yard.water.cloud
      tapAt(yard, at.x, at.y)
      yard.step(FRAME)
      expect(dungarees.mud[pocket]).toBe(left)
      expect(yard.water.cloud).toBeGreaterThan(cloud)
    }
  })
})
