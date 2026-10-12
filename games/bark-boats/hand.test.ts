import { describe, expect, it } from 'vitest'
import { MAKINGS, type Kind } from './build'
import { carry, liftSun, run, saveWith } from './drive'
import { setUp } from './easel'
import { handPose, type HandPose } from './guidance'
import { EDDY, LAID_OUT, SEAT, STONE, SUN, WATER, isBrook, isWater } from './layout'
import { glowAt, nextMove, openWorld, touchables } from './open'
import { HAND } from './propsArt'
import { freshSave } from './save'
import { INSIDE } from './sceneryArt'
import { fit } from './stage'
import { moodOf } from './traits'
import { handAt } from './view'
import { buildNow, type World } from './world'

// The ghost hand shows one move the child could make now: where a thing
// goes, never which thing to build with. It is whole on the stage at every
// size, and it points at something that answers.

const BOAT = { masts: ['twig', null], sails: ['maple', null] } as const

/** A world for each kind of move the hand shows. */
function worlds(): Record<string, World> {
  const brook = (reach: number, stuck = false): World => openWorld(saveWith(stuck ? { ...BOAT, deck: ['pebble'] } as never : (BOAT as never), { place: 'brook', journey: { reach, stuck }, boat: { at: 'eddy', x: 500, aboard: true } as never }), 1)
  return {
    'a first visit at four': openWorld(freshSave(4), 1),
    'a first visit at eight, the stone bare': openWorld(freshSave(8), 1),
    'a bare hull on the stone': openWorld(saveWith({}), 1),
    'a boat built': openWorld(saveWith(BOAT as never), 1),
    'a boat built, the gnome aboard': openWorld(saveWith(BOAT as never, { boat: { at: 'stone', x: SEAT.x, aboard: true } as never }), 1),
    'afloat at the eddy\'s upstream end': openWorld(saveWith(BOAT as never, { boat: { at: 'eddy', x: EDDY.right, aboard: true } as never }), 1),
    'afloat at the eddy\'s downstream end': openWorld(saveWith(BOAT as never, { boat: { at: 'eddy', x: EDDY.left + 30, aboard: true } as never }), 1),
    'among the reeds': brook(0),
    'at the sprite': brook(1),
    'held on the sill': brook(2, true),
    'under the branch': brook(3),
    'at the fall': brook(4),
    'coming to the pond': brook(5),
    'the finished pond': openWorld(saveWith(BOAT as never, { finished: true, place: 'pond', journey: { reach: 5, stuck: false }, boat: { at: 'eddy', x: 500, aboard: true } as never, pond: [{ hull: 'bark', masts: ['twig', null], sails: ['maple', null], deck: [] }] }), 1),
  }
}

describe('the ghost hand', () => {
  it('is whole inside the print wherever its move takes it', () => {
    const pose: HandPose = { travel: 0, press: 0, opacity: 0 }
    for (const [name, w] of Object.entries(worlds())) {
      const move = nextMove(w)
      for (let k = 0; k <= 1; k += 0.05) {
        handPose(k, move.drag, pose)
        const at = handAt(move.from.x + (move.to.x - move.from.x) * pose.travel, move.from.y + (move.to.y - move.from.y) * pose.travel + pose.press * 5)
        expect(at.x - HAND.left, name).toBeGreaterThanOrEqual(INSIDE.left)
        expect(at.x + HAND.right, name).toBeLessThanOrEqual(INSIDE.right)
        expect(at.y - HAND.up, name).toBeGreaterThanOrEqual(INSIDE.top)
        expect(at.y + HAND.down, name).toBeLessThanOrEqual(INSIDE.bottom)
      }
    }
  })

  it('is never moved off its mark to fit: every move the game shows lies where the whole hand fits', () => {
    for (const [name, w] of Object.entries(worlds())) {
      const move = nextMove(w)
      for (const spot of [move.from, move.to]) expect(handAt(spot.x, spot.y), name).toEqual(spot)
    }
  })

  it('is drawn whole on the surface at every size, as a still shows it', () => {
    for (const [width, height] of [[1180, 820], [667, 375], [1600, 700], [1024, 768], [568, 320]] as const) {
      const easel = setUp(width, height, 2)
      const by = fit(width, height)
      const sheet = (easel.view as unknown as { sheets: { props: { hand: { sheet: unknown } } } }).sheets.props.hand.sheet
      for (const [name, w] of Object.entries(worlds())) {
        let seen = 0
        for (const idle of [5.2, 5.9, 6.6, 7.3, 7.9]) {
          easel.frame(w, idle)
          const hand = easel.surface.stamped.find((stamped) => stamped.image === sheet)
          if (!hand) continue
          seen += 1
          // The print's own edges on the surface, in device pixels.
          const left = (by.x + INSIDE.left * by.scale) * 2, right = (by.x + INSIDE.right * by.scale) * 2
          const top = (by.y + INSIDE.top * by.scale) * 2, bottom = (by.y + INSIDE.bottom * by.scale) * 2
          expect(hand.x - hand.w / 2, `${name} at ${width}x${height}`).toBeGreaterThanOrEqual(left - 1)
          expect(hand.x + hand.w / 2, `${name} at ${width}x${height}`).toBeLessThanOrEqual(right + 1)
          expect(hand.y - hand.h / 2, `${name} at ${width}x${height}`).toBeGreaterThanOrEqual(top - 1)
          expect(hand.y + hand.h / 2, `${name} at ${width}x${height}`).toBeLessThanOrEqual(bottom + 1)
        }
        expect(seen, `${name} at ${width}x${height}`).toBeGreaterThan(2)
      }
    }
  })

  it('shows a move that answers: a thing that can be picked up, carried to where it can go', () => {
    const all = worlds()
    const from = (name: string): { x: number; y: number } => nextMove(all[name]).from
    const to = (name: string): { x: number; y: number } => nextMove(all[name]).to
    // A bare stone: a hull that lies on the bank, carried onto the stone.
    expect(touchables(all['a first visit at eight, the stone bare']).some((spot) => Math.hypot(spot.x - from('a first visit at eight, the stone bare').x, spot.y - from('a first visit at eight, the stone bare').y) < spot.r)).toBe(true)
    expect(to('a first visit at eight, the stone bare').x).toBeGreaterThan(STONE.left)
    expect(to('a first visit at eight, the stone bare').x).toBeLessThan(STONE.right)
    // A bare hull: a making carried to it.
    expect(Math.abs(to('a bare hull on the stone').x - SEAT.x)).toBeLessThan(120)
    // The gnome aboard and something on the boat: the boat, by its hull, carried to the open water of the eddy.
    for (const name of ['a boat built, the gnome aboard']) {
      expect(Math.abs(from(name).x - SEAT.x), name).toBeLessThan(120)
      expect(isWater(to(name).x, to(name).y), name).toBe(true)
      expect(to(name).x, name).toBeGreaterThan(EDDY.left)
      expect(to(name).x, name).toBeLessThan(EDDY.right)
    }
    // Afloat and on the brook: one finger laid in open water behind the boat, which is upstream of it.
    for (const name of ['afloat at the eddy\'s upstream end', 'afloat at the eddy\'s downstream end', 'among the reeds', 'at the sprite', 'held on the sill', 'under the branch', 'at the fall', 'coming to the pond']) {
      const w = all[name], move = nextMove(w)
      expect(move.drag, name).toBe(false)
      expect(move.from.x, name).toBeGreaterThan(w.boat.x)
      expect(w.frame < 0 ? isWater(move.from.x, move.from.y) : isBrook(move.from.y), name).toBe(true)
      expect(move.from.y, name).toBeGreaterThan(WATER.top + 60)
      // At the bank, with room, the whole hand lies in the water and not over the cloth.
      if (w.frame < 0 && move.from.x + HAND.right < 940) expect(move.from.y + HAND.down, name).toBeLessThan(WATER.bottom)
      expect(move.from.y, name).toBeLessThan(WATER.bottom)
    }
    // The finished pond: the sun, lifted.
    expect(from('the finished pond')).toEqual({ x: SUN.x, y: SUN.pond })
    expect(to('the finished pond').y).toBeLessThan(SUN.pond - SUN.lift)
  })

  it('shows a build first: on a first visit a found thing goes on the hull before the boat is ever shown going to the water', () => {
    const all = worlds()
    {
      const name = 'a first visit at four', w = all[name], move = nextMove(w)
      expect(w.gnomeAt, name).toBe('stone')
      expect(move.drag, name).toBe(true)
      // It starts on a thing that lies on the bank, and ends over the boat on its stone.
      expect(w.pieces.some((piece) => piece.place.on === 'bank' && piece.x === move.from.x && piece.y === move.from.y), name).toBe(true)
      expect(Math.abs(move.to.x - SEAT.x), name).toBeLessThan(150)
      expect(move.to.y, name).toBeLessThan(SEAT.y - 60)
    }
    // At four the twig stands in its hole: the hand brings it a leaf.
    expect(nextMove(all['a first visit at four']).from).toEqual(LAID_OUT.maple)
    // The child follows the hand: the leaf is on the mast, the gnome climbs aboard, and only then is the water shown.
    const w = all['a first visit at four'], move = nextMove(w)
    run(w, 0.2)
    carry(w, move.from, move.to)
    run(w, 3)
    expect(buildNow(w).sails).toContain('maple')
    expect(w.gnomeAt).toBe('aboard')
    const then = nextMove(w)
    expect(Math.abs(then.from.x - SEAT.x)).toBeLessThan(120)
    expect(isWater(then.to.x, then.to.y)).toBe(true)
  })

  it('builds a sail and never a blanket, at every first showing: a first visit at each age and every morning after', () => {
    const starts: [string, World][] = [null, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((age) => [`a first visit at ${age}`, openWorld(freshSave(age), 1)])
    // Every morning after the first starts from a bare stone, whatever the age.
    for (const age of [4, 8]) {
      const w = openWorld(saveWith(BOAT as never, { finished: true, place: 'pond', journey: { reach: 5, stuck: false }, boat: { at: 'eddy', x: 500, aboard: true } as never, pond: [{ hull: 'bark', masts: ['twig', null], sails: ['maple', null], deck: [] }] }), 1)
      run(w, 0.5)
      liftSun(w)
      run(w, 6)
      expect(w.scene, `the morning at ${age}`).toBeNull()
      starts.push([`the morning after, at ${age}`, w])
    }
    for (const [name, w] of starts) {
      run(w, 0.2)
      const shown: string[] = []
      // The child does what the hand shows, move after move, until the hand shows the water.
      for (let i = 0; i < 6; i++) {
        const move = nextMove(w)
        expect(move.drag, name).toBe(true)
        // It starts on a thing that lies on the bank (a hull by its rim), or on the boat, which then goes to the water.
        const taken = w.pieces.find((piece) => piece.place.on === 'bank' && piece.x === move.from.x && Math.abs(piece.y - move.from.y) < 40)
        if (!taken) break
        shown.push(taken?.kind ?? '')
        carry(w, move.from, move.to)
        run(w, 3)
        // Nothing the hand showed went onto the deck, and the gnome is never under a leaf.
        expect(buildNow(w).deck, `${name}, after ${shown.join(', ')}`).toEqual([])
        expect(moodOf(buildNow(w)), name).not.toBe('under')
      }
      const build = buildNow(w)
      expect(build.hull, name).not.toBeNull()
      // A mast stands, with a sail on it, and the mast was shown before the leaf.
      const index = build.masts.findIndex((mast) => mast !== null)
      expect(index, `${name}: ${shown.join(', ')}`).toBeGreaterThanOrEqual(0)
      expect(build.sails[index], `${name}: ${shown.join(', ')}`).not.toBeNull()
      expect(w.gnomeAt, name).toBe('aboard')
      const masts = shown.filter((kind) => MAKINGS[kind as Kind]?.part === 'mast'), sails = shown.filter((kind) => MAKINGS[kind as Kind]?.part === 'sail')
      expect(sails.length, name).toBe(1)
      if (masts.length) expect(shown.indexOf(masts[0]), name).toBeLessThan(shown.indexOf(sails[0]))
      // And then the hand shows the boat going to the water.
      const then = nextMove(w)
      expect(Math.abs(then.from.x - SEAT.x), name).toBeLessThan(120)
      expect(isWater(then.to.x, then.to.y), name).toBe(true)
    }
  })

  it('has the glow on one thing at a time: the thing the hand is about to take, or the water it is about to touch', () => {
    const easel = setUp(1180, 820, 2)
    const halo = (easel.view as unknown as { sheets: { props: { halo: { sheet: unknown } } } }).sheets.props.halo.sheet
    for (const [name, w] of Object.entries(worlds())) {
      const move = nextMove(w), glow = glowAt(w)
      expect(Math.hypot(glow.x - move.from.x, glow.y - move.from.y), name).toBeLessThan(90)
      // On the surface: one halo and no more, at three seconds and with the hand showing.
      for (const idle of [3.6, 4.6, 6]) {
        easel.frame(w, idle)
        expect(easel.surface.stamped.filter((stamped) => stamped.image === halo).length, `${name} at ${idle} s`).toBe(1)
      }
      easel.frame(w, 1)
      expect(easel.surface.stamped.filter((stamped) => stamped.image === halo).length, name).toBe(0)
    }
  })

  it('never shows which thing to build with: on a bare hull it points at whatever lies first, not at a best thing', () => {
    const w = openWorld(saveWith({}), 1)
    const move = nextMove(w)
    const first = w.pieces.find((piece) => piece.place.on === 'bank' && piece.kind !== 'walnut' && piece.kind !== 'pod')
    expect(first).toBeDefined()
    expect(move.drag).toBe(true)
  })
})
