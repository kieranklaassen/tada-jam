import { describe, expect, it } from 'vitest'
import { MAKINGS, type Build } from './build'
import { setUp } from './easel'
import { partAt } from './finger'
import { HULL, OVER_EDDY, carryTo, launchBoat, pick, play, visit, type Visit } from './hands'
import { SEAT, shoreAt } from './layout'
import { nextMove } from './open'
import { hullShape } from './pieces'
import { fit } from './stage'
import { BLANKET_UP, boatShown, buildNow, partShown, type World } from './world'

// What stands and lies on the boat is touched where it is drawn, and each
// thing has room for a finger: a load or a blanket keeps 48 px each way with
// its neighbours counted, a mast is taken anywhere along it, and every part
// comes off again wherever the boat waits at the bank.

const DECKS: Record<string, Partial<Build>> = {
  'three loads, a blanket and two bare masts': { masts: ['twig', 'stem'], sails: [null, null], deck: ['berry', 'cap', 'pebble', 'birch'] },
  'three blankets and a load': { masts: [null, null], sails: [null, null], deck: ['birch', 'maple', 'feather', 'pebble'] },
  'two blankets, two loads and a sail': { masts: [null, 'twig'], sails: [null, 'maple'], deck: ['birch', 'berry', 'feather', 'cap'] },
}
const HULLS = ['bark', 'pod', 'walnut'] as const
/** The sizes: the still's, a tablet lying, and the same tablet standing. */
const SIZES = [[1180, 820], [1024, 768], [820, 1180]] as const
/** The smallest room a deck thing has on the tablet standing, in px: the stage is then 0.69 of its size and the decks are too short for 48. */
const UPRIGHT_LEAST = 38

/** A visit with the boat on its stone as built, the gnome on the stone or in his seat. */
function built(hull: (typeof HULLS)[number], deck: Partial<Build>, aboard: boolean): Visit {
  const v = visit({ hull, ...deck }, aboard ? { boat: { at: 'stone', x: SEAT.x, aboard: true } as never } : {})
  play(v, 0.6)
  return v
}

/** The run of points through the middle of `kind` that take it and nothing else, across and down, in stage units. */
function rooms(w: World, kind: string): { across: number; down: number } {
  const piece = w.pieces.find((each) => each.kind === kind)
  if (!piece) throw new Error(kind)
  const at = partShown(w, piece)
  expect(partAt(w, at.x, at.y)?.kind, kind).toBe(kind)
  const run = (dx: number, dy: number): number => {
    let length = 1
    for (const way of [1, -1]) {
      let i = 1
      while (i < 160 && partAt(w, at.x + way * i * dx, at.y + way * i * dy) === piece) i++
      length += i - 1
    }
    return length
  }
  return { across: run(1, 0), down: run(0, 1) }
}

describe('what lies on the deck', () => {
  it('has a finger\'s room of its own, 48 px each way lying at 1180 by 820 and at 1024 by 768, neighbours counted; standing at 820 by 1180 the things share the deck', () => {
    let least = Infinity
    for (const hull of HULLS) {
      for (const [name, deck] of Object.entries(DECKS)) {
        for (const aboard of [false, true]) {
          const v = built(hull, deck, aboard), w = v.game.w
          for (const kind of deck.deck ?? []) {
            const room = rooms(w, kind)
            for (const [width, height] of SIZES) {
              const scale = fit(width, height).scale
              const label = `${kind} on the ${hull}, ${name}, gnome ${aboard ? 'aboard' : 'on the stone'}, at ${width} by ${height}`
              if (height > width) least = Math.min(least, room.across * scale, room.down * scale)
              else {
                expect(room.across * scale, `${label}, across`).toBeGreaterThanOrEqual(48)
                expect(room.down * scale, `${label}, down`).toBeGreaterThanOrEqual(48)
              }
            }
          }
        }
      }
    }
    // Standing, the smallest room is what it is said to be, no smaller.
    expect(Math.floor(least)).toBe(UPRIGHT_LEAST)
  })

  it('shares the deck with no dead gap: between two things that lie side by side every point takes a thing, the nearer middle first', () => {
    let pairs = 0
    for (const hull of HULLS) {
      for (const [name, deck] of Object.entries(DECKS)) {
        const w = built(hull, deck, false).game.w
        const lying = (deck.deck ?? []).map((kind) => w.pieces.find((each) => each.kind === kind)).filter((piece) => piece !== undefined)
        const spots = lying.map((piece) => ({ piece, at: partShown(w, piece) })).sort((a, b) => a.at.x - b.at.x)
        for (let i = 1; i < spots.length; i++) {
          const a = spots[i - 1], b = spots[i]
          // Side by side: within each other's reach. Further apart there is deck between them, and the deck is the hull's.
          if (Math.hypot(b.at.x - a.at.x, b.at.y - a.at.y) >= MAKINGS[a.piece.kind].reach + MAKINGS[b.piece.kind].reach) continue
          pairs += 1
          for (let k = 0; k <= 20; k++) {
            const x = a.at.x + ((b.at.x - a.at.x) * k) / 20, y = a.at.y + ((b.at.y - a.at.y) * k) / 20
            const taken = partAt(w, x, y)
            expect(taken, `${hull}, ${name}, between ${a.piece.kind} and ${b.piece.kind}`).not.toBe(null)
            // At either end it is the thing itself.
            if (k === 0) expect(taken).toBe(a.piece)
            if (k === 20) expect(taken).toBe(b.piece)
          }
        }
      }
    }
    expect(pairs).toBeGreaterThan(12)
  })

  it('is touched where it is drawn: a blanket over the gnome\'s head is taken up there, and not at the seat it has left', () => {
    const v = built('bark', { masts: [null, null], sails: [null, null], deck: ['maple'] }, true), w = v.game.w
    play(v, 2)
    expect(w.stage.gnome.hide).toBeGreaterThan(0.9)
    const leaf = w.pieces.find((each) => each.kind === 'maple')
    if (!leaf) throw new Error('maple')
    const at = partShown(w, leaf)
    // The view stamps the leaf where the model says it is, with the gnome under it and with him out from under it.
    const easel = setUp(), by = fit(1180, 820)
    const sheet = (easel.view as unknown as { sheets: { makings: { maple: { sheet: unknown } } } }).sheets.makings.maple.sheet
    easel.frame(w)
    const stamped = easel.surface.stamped.filter((each) => each.image === sheet)
    expect(stamped.length).toBe(1)
    const drawn = { x: (stamped[0].x / 2 - by.x) / by.scale, y: (stamped[0].y / 2 - by.y) / by.scale }
    expect(Math.hypot(drawn.x - at.x, drawn.y - at.y)).toBeLessThan(12)
    expect(partAt(w, at.x, at.y)).toBe(leaf)
    // Where it would lie with nobody under it, there is the gnome now.
    expect(partAt(w, at.x, at.y + BLANKET_UP + 6)).toBe(null)
  })
})

describe('a mast', () => {
  it('is taken anywhere along it, at its top and at its foot, and gives way only inside the room of a load that lies against it', () => {
    for (const hull of HULLS) {
      for (const deck of [[], ['berry', 'cap', 'pebble']] as const) {
        const v = built(hull, { masts: ['twig', 'stalk'], sails: [null, null], deck: [...deck] }, false), w = v.game.w
        const shape = hullShape(hull)
        for (const kind of ['twig', 'stalk'] as const) {
          const mast = w.pieces.find((each) => each.kind === kind)
          if (!mast) throw new Error(kind)
          const middle = partShown(w, mast)
          const length = kind === 'twig' ? 170 : 250
          // From its top down to the rim of the hull, every 6 units.
          for (let up = length / 2 - 4; up >= shape.deck - shape.rim - length / 2 + 4; up -= 6) {
            const at = partShown(w, mast, up)
            const taken = partAt(w, at.x, at.y)
            const beside = w.pieces.find((each) => each.place.on === 'deck' && Math.hypot(partShown(w, each).x - at.x, partShown(w, each).y - at.y) < 29)
            expect(taken?.kind, `the ${kind} on the ${hull}, ${Math.round(up - (shape.deck - shape.rim - length / 2))} above the rim, with ${deck.length} loads`).toBe(beside ? beside.kind : kind)
          }
          expect(middle.y).toBeLessThan(boatShown(w).y)
        }
        if (deck.length > 0) continue
        // On the side of the hull, below the rim, the finger has the boat and no mast.
        const keel = boatShown(w)
        expect(partAt(w, keel.x + shape.holes[0], keel.y + shape.rim + 30)).toBe(null)
        v.game.press(keel.x + shape.holes[0], keel.y + shape.rim + 30, false)
        expect(w.hand?.on).toBe('boat')
        v.game.pressEnd()
      }
    }
  })
})

describe('the hull', () => {
  it('is what the hand shows the boat lifted by, and a finger there has the boat and no part of it, on every hull however full its deck', () => {
    for (const hull of HULLS) {
      for (const deck of [['berry', 'cap', 'pebble', 'birch'], ['pebble'], []] as const) {
        const v = built(hull, { masts: ['twig', 'stalk'], sails: ['maple', 'feather'], deck: [...deck] }, true), w = v.game.w
        const move = nextMove(w)
        // With a sail up and the gnome aboard, the hand shows the boat going to the water.
        expect(move.to.y, `${hull} with ${deck.length} on deck`).toBeLessThan(shoreAt(move.to.x))
        expect(partAt(w, move.from.x, move.from.y), `${hull} with ${deck.length} on deck`).toBe(null)
        v.game.press(move.from.x, move.from.y, false)
        expect(w.hand?.on, `${hull} with ${deck.length} on deck`).toBe('boat')
        v.game.pressEnd()
      }
    }
  })
})

describe('every part can be pulled off again, wherever the boat waits at the bank', () => {
  it('afloat in the eddy as on the stone: a part wobbles under the finger, comes off when it is pulled, lies where it is put, and goes back on', () => {
    const v = visit()
    launchBoat(v)
    play(v, 2.5)
    const w = v.game.w
    expect(w.boat.mode).toBe('afloat')
    const leaf = w.pieces.find((each) => each.kind === 'maple')
    if (!leaf) throw new Error('maple')
    const at = partShown(w, leaf)
    // A tap on the sail lifts nothing: not the sail, and not the boat.
    v.game.press(at.x, at.y, false)
    expect(w.hand).toMatchObject({ on: 'piece', pulled: false })
    v.game.tap()
    play(v, 0.3)
    expect(w.boat.mode).toBe('afloat')
    expect(buildNow(w).sails[0]).toBe('maple')
    // Pulled, it comes off and lies on the bank where it is put.
    const sand = { x: 760, y: shoreAt(760) + 90 }
    carryTo(v, partShown(w, leaf), sand)
    play(v, 1)
    expect(buildNow(w).sails[0]).toBe(null)
    expect(leaf.place.on).toBe('bank')
    expect(v.game.save().boat.sails).toEqual([null, null])
    // Then the mast it was on, and the berry on the deck.
    for (const kind of ['twig', 'berry'] as const) {
      const part = w.pieces.find((each) => each.kind === kind)
      if (!part) throw new Error(kind)
      carryTo(v, partShown(w, part), { x: sand.x + (kind === 'twig' ? 120 : 220), y: sand.y })
      play(v, 1)
      expect(part.place.on, kind).toBe('bank')
    }
    expect(buildNow(w)).toMatchObject({ masts: [null, null], deck: [] })
    expect(w.boat.mode).toBe('afloat')
    // By its hull the boat is still lifted, and a thing let go on it afloat goes back on.
    pick(v, { x: leaf.x, y: leaf.y }, { x: boatShown(w).x, y: boatShown(w).y - 60 })
    v.game.dragEnd()
    play(v, 1)
    expect(buildNow(w).deck).toEqual(['maple'])
    const keel = boatShown(w)
    v.game.press(keel.x + 84, keel.y - 12, false)
    expect(w.hand?.on).toBe('boat')
    v.game.pressEnd()
  })

  it('on the brook nothing comes off: the boat sails as it left the bank', () => {
    const v = visit()
    launchBoat(v)
    void HULL; void OVER_EDDY
    // Found waiting at the reeds, the sail is not to be had: the finger on it has the boat.
    const found = visit(undefined, { place: 'brook', journey: { reach: 0, stuck: false }, boat: { at: 'eddy', x: 500, aboard: true } as never })
    play(found, 0.3)
    const w = found.game.w, leaf = w.pieces.find((each) => each.kind === 'maple')
    if (!leaf) throw new Error('maple')
    const at = partShown(w, leaf)
    found.game.press(at.x, at.y, false)
    expect(w.hand?.on).not.toBe('piece')
    found.game.pressEnd()
    expect(buildNow(w).sails[0]).toBe('maple')
  })
})
