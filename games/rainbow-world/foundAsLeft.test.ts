import { describe, expect, it } from 'vitest'
import { mat, middle, put, putOn, run, take, tap, tapBasket } from './drive'
import { BASKET, bodiesOverlap } from './layout'
import { PIECES, type PieceId } from './pieces'
import { freshSave, placesOf } from './save'
import { World, type Places } from './world'

// Found as left. Put away at any instant, the game is exactly what a load of its save would make it: the same
// places, nothing in hand, nothing in the air, no scene, no timer part way, nothing still to sound. And a load
// starts nothing and sounds nothing.

/** A world without its clock and its counters, which a load starts again from nothing. */
const still = (world: World): Record<string, unknown> => ({ ...world, time: 0, changes: 0, hushes: 0 })

/** A finger carries a thing to a point and stays down, for `held` seconds. */
const carry = (w: World, id: PieceId, x: number, y: number, held = 0.4): void => { const at = middle(w, id); w.press(at.x, at.y); w.dragStart(); w.dragMove(x, y); run(w, held) }
/** And lets it go, a moment before the put-away: it still waits in the air. */
const letGo = (w: World, id: PieceId, x: number, y: number): World => { carry(w, id, x, y, 0.2); w.dragEnd(); run(w, 0.1); return w }

/**
 * Every state a put-away can find the game in: a name, how a child gets there with taps and drags, and where
 * it is worth saying, what is found when the game is opened again. A state with `drops` is one where going to
 * rest makes the child's own drop, or sets down what the child still carried: only there may the save after
 * rest differ from the save before it.
 */
type Found = (saved: Places, world: World) => void
const STATES: [string, () => World, Found?, 'drops'?][] = [
  ['a first visit of the youngest', () => new World(placesOf(freshSave(2)))],
  ['a first visit at five', () => new World(placesOf(freshSave(5)))],
  ['a thing in hand after a tap', () => { const w = mat({}); take(w, 'doll-round'); run(w, 0.3); return w }],
  ['a thing lifted off a stack', () => { const w = mat({ 'doll-round': { x: 520, y: 590 }, 'doll-small': { x: 520, y: 590, on: 'doll-round' } }); take(w, 'doll-small'); run(w, 0.2); return w }],
  ['a thing carried over the mat, the finger still down', () => { const w = mat({}); carry(w, 'horse', 520, 500); return w }, (saved) => {
    // It stays where the child had brought it.
    expect(saved.horse).toMatchObject({ at: 'mat', on: null })
    expect(Math.hypot(saved.horse.x - 520, saved.horse.y - 500 - PIECES.horse.height * 0.45)).toBeLessThan(60)
  }, 'drops'],
  ['a thing under a dragging finger off the mat', () => { const w = mat({}); const at = middle(w, 'horse'); w.press(at.x, at.y); w.dragStart(); w.dragMove(300, 150); run(w, 0.4); return w }],
  ['a stack carried from the mat to off the mat', () => { const w = mat({ 'doll-round': { x: 520, y: 590 }, 'doll-small': { x: 520, y: 590, on: 'doll-round' } }); const at = middle(w, 'doll-round'); w.press(at.x, at.y); w.dragStart(); w.dragMove(300, 150); run(w, 0.4); return w }],
  ['a thing let go over the mat, still waiting in the air', () => letGo(mat({}), 'horse', 560, 520), (saved) => expect(saved.horse).toMatchObject({ at: 'mat', on: null }), 'drops'],
  // The eight states the third reading found missing, each with what is found.
  ['the silk gathering at its place', () => { const w = mat({}); take(w, 'silk'); const at = middle(w, 'silk'); tap(w, at.x, at.y); run(w, 0.1); return w }, (saved, world) => {
    // Gathered, by the mat, and all the way gathered: no pat is still to come.
    expect(saved.silk).toEqual({ ...PIECES.silk.home, at: 'home', on: null, turned: true })
    expect(world.piece('silk').turnAt).toBe(-Infinity)
  }],
  ['the silk gathered, taken up again and on its way to the mat', () => { const w = mat({}); take(w, 'silk'); const at = middle(w, 'silk'); tap(w, at.x, at.y); run(w, 1.5); put(w, 'silk', 600, 560); run(w, 0.1); return w }, (saved) => expect(saved.silk).toMatchObject({ at: 'mat', on: null, turned: true })],
  ['a thing from the mat let go off the mat, still waiting', () => letGo(mat({ horse: { x: 700, y: 600 } }), 'horse', 300, 150), (saved) => {
    // The drop is the child's: a single thing let go off the mat is by the mat again.
    expect(saved.horse).toEqual({ ...PIECES.horse.home, at: 'home', on: null, turned: false })
  }, 'drops'],
  ['a thing let go over another thing, still waiting', () => { const w = mat({ 'doll-round': { x: 520, y: 590 } }); const to = middle(w, 'doll-round'); return letGo(w, 'doll-small', to.x, to.y) }, (saved) => {
    // It is on the thing it was let go over, and the scene of the two is not played to nobody.
    expect(saved['doll-small']).toEqual({ at: 'mat', x: 520, y: 590, on: 'doll-round', turned: false })
  }, 'drops'],
  ['a doll let go over a standing arch, still waiting', () => { const w = mat({ 'arch-large': { x: 520, y: 590 } }); const to = middle(w, 'arch-large'); return letGo(w, 'doll-small', to.x, to.y - 40) }, (saved) => {
    // Where the slide would have left it: on the mat beside the arch, on nothing.
    expect(saved['doll-small']).toMatchObject({ at: 'mat', on: null })
    // The same place as when the child stays and watches it slide.
    const watched = mat({ 'arch-large': { x: 520, y: 590 } }), to = middle(watched, 'arch-large')
    letGo(watched, 'doll-small', to.x, to.y - 40)
    run(watched, 9)
    expect(watched.scene).toBeNull()
    expect(saved).toEqual(watched.places())
    expect(Math.abs(saved['doll-small'].x - 520)).toBeGreaterThan(PIECES['arch-large'].halfWidth)
  }, 'drops'],
  ['a thing let go over the basket, still waiting', () => letGo(mat({}), 'doll-small', BASKET.x, BASKET.y - 60), (saved) => expect(saved['doll-small'].at).toBe('basket'), 'drops'],
  ['a thing carried over another thing, the finger still down', () => { const w = mat({ 'doll-round': { x: 520, y: 590 } }); const to = middle(w, 'doll-round'); carry(w, 'doll-small', to.x, to.y); return w }, (saved) => {
    // Not let go, it is not put on it: it stands on the mat clear of it, as near as there is room.
    expect(saved['doll-small']).toMatchObject({ at: 'mat', on: null })
    expect(bodiesOverlap(PIECES['doll-small'], saved['doll-small'].x, saved['doll-small'].y, PIECES['doll-round'], 520, 590)).toBe(false)
    expect(Math.hypot(saved['doll-small'].x - 520, saved['doll-small'].y - 590)).toBeLessThan(220)
    expect(saved['doll-round']).toEqual({ at: 'mat', x: 520, y: 590, on: null, turned: false })
  }, 'drops'],
  ['a thing carried over the basket, the finger still down', () => { const w = mat({}); carry(w, 'doll-small', BASKET.x, BASKET.y - 60); return w }, (saved) => {
    // Not let go, it is not the basket's: it is by the mat where it was.
    expect(saved['doll-small']).toEqual({ ...PIECES['doll-small'].home, at: 'home', on: null, turned: false })
  }],
  ...([0.3, 1.5] as const).map((after): [string, () => World, Found] => [`the tall doll under a load, ${after} s in`, () => { const w = mat({ 'doll-tall': { x: 520, y: 590 } }); putOn(w, 'doll-round', 'doll-tall'); run(w, after); return w }, (saved, world) => {
    // The load is on it, and its knees are as a load of the save bends them: no strain is left on its face.
    expect(saved['doll-round']).toEqual({ at: 'mat', x: 520, y: 590, on: 'doll-tall', turned: false })
    expect(world.piece('doll-tall').mood).toBe(new World(saved, world.basket).piece('doll-tall').mood)
  }]),
  ['a collar in the middle of the shuffle', () => { const w = mat({ 'doll-round': { x: 520, y: 590 } }); putOn(w, 'arch-large', 'doll-round'); run(w, 0.5); return w }, (saved, world) => {
    // The collar is round the doll, and the doll stands still where it stood.
    expect(saved['arch-large']).toEqual({ at: 'mat', x: 520, y: 590, on: 'doll-round', turned: false })
    expect([world.piece('doll-round').stir, world.piece('doll-round').px, world.piece('doll-round').tilt]).toEqual([null, 520, 0])
  }],
  ...([0.5, 2] as const).map((after): [string, () => World, Found] => [`the ghost horse, ${after} s in`, () => { const w = mat({ horse: { x: 520, y: 590 }, 'doll-small': { x: 720, y: 570 } }); putOn(w, 'silk', 'horse'); run(w, after); return w }, (saved) => {
    // The cloth is on the horse where the horse ends its run, and the doll where it ran to.
    expect(saved.silk).toMatchObject({ at: 'mat', on: 'horse', x: saved.horse.x, y: saved.horse.y })
    expect(saved['doll-small']).toMatchObject({ at: 'mat', on: null })
    expect(bodiesOverlap(PIECES['doll-small'], saved['doll-small'].x, saved['doll-small'].y, PIECES.horse, saved.horse.x, saved.horse.y)).toBe(false)
  }]),
  ['a doll put under the spread silk', () => { const w = mat({ silk: { x: 560, y: 600 } }); putOn(w, 'doll-small', 'silk'); run(w, 0.3); return w }, (saved) => {
    // The doll stands on the mat and the cloth is over it.
    expect(saved['doll-small']).toMatchObject({ at: 'mat', on: null })
    expect(saved.silk).toMatchObject({ at: 'mat', on: 'doll-small', x: saved['doll-small'].x, y: saved['doll-small'].y })
  }],
  ['an arch turned at its place, still in the air', () => { const w = mat({ 'arch-large': { x: 560, y: 590 } }); take(w, 'arch-large'); const at = middle(w, 'arch-large'); tap(w, at.x, at.y - 30); run(w, 0.1); return w }, (saved, world) => {
    // On its back where it stood, and lying still.
    expect(saved['arch-large']).toEqual({ at: 'mat', x: 560, y: 590, on: null, turned: true })
    expect([world.piece('arch-large').flight, world.piece('arch-large').stir]).toEqual([null, null])
  }],
  ['a tumble out of a cradle', () => { const w = mat({ 'arch-large': { x: 520, y: 590, turned: true }, 'doll-small': { x: 520, y: 590, on: 'arch-large' } }); take(w, 'arch-large'); const at = middle(w, 'arch-large'); tap(w, at.x, at.y + 10); run(w, 0.1); return w }, (saved) => {
    // The cradle is on its feet and the doll is on the mat beside it, on nothing.
    expect(saved['arch-large']).toEqual({ at: 'mat', x: 520, y: 590, on: null, turned: false })
    expect(saved['doll-small']).toMatchObject({ at: 'mat', on: null })
    expect(bodiesOverlap(PIECES['doll-small'], saved['doll-small'].x, saved['doll-small'].y, PIECES['arch-large'], 520, 590)).toBe(false)
  }],
  ['a thing in the air on its way to the mat', () => { const w = mat({}); put(w, 'doll-tall', 600, 560); run(w, 0.05); return w }],
  ['a thing on its way back to its place', () => { const w = mat({ horse: { x: 600, y: 600 } }); take(w, 'horse'); tap(w, 40, 60); run(w, 0.05); return w }],
  ['an arch still rocking after it was turned over', () => { const w = mat({ 'arch-large': { x: 560, y: 590 } }); take(w, 'arch-large'); const at = middle(w, 'arch-large'); tap(w, at.x, at.y - 30); run(w, 0.5); return w }],
  ['a lid still teetering', () => { const w = mat({ 'arch-large': { x: 520, y: 590, turned: true } }); putOn(w, 'arch-middle', 'arch-large'); run(w, 0.5); return w }],
  ['a rocking horse still rocking', () => { const w = mat({ 'arch-large': { x: 520, y: 590, turned: true } }); putOn(w, 'horse', 'arch-large'); run(w, 0.7); return w }],
  ['a ring still shaken round the horse\'s neck', () => { const w = mat({ horse: { x: 520, y: 590 } }); putOn(w, 'arch-large', 'horse'); run(w, 0.5); return w }],
  ['a thing on its way into the basket', () => { const w = mat({}); take(w, 'doll-small'); tapBasket(w); run(w, 0.1); return w }],
  ['a stack on its way into the basket', () => { const w = mat({ horse: { x: 520, y: 590 }, 'doll-round': { x: 520, y: 590, on: 'horse' } }); take(w, 'horse'); tapBasket(w); run(w, 0.15); return w }],
  ['a thing on its way into the lying basket', () => { const w = mat({}, 'tipped'); take(w, 'doll-tall'); tapBasket(w); run(w, 0.1); return w }],
  ['a doll ducking in the basket', () => { const w = mat({}); take(w, 'doll-small'); tapBasket(w); run(w, 0.5); return w }],
  ['a thing popping out of the basket', () => { const w = mat({}); take(w, 'doll-small'); tapBasket(w); run(w, 1); tapBasket(w); run(w, 0.1); return w }],
  ['the mat drummed and the cat poked', () => { const w = mat({ 'doll-tall': { x: 520, y: 590 } }); tap(w, 700, 560); tap(w, 410, 760); run(w, 0.2); return w }],
  ...([0.1, 1.2, 2.8, 4.4] as const).flatMap((after): [string, () => World][] => [
    [`the ghost, ${after} s in`, () => { const w = mat({ 'doll-tall': { x: 520, y: 590 }, 'doll-small': { x: 700, y: 560 } }); putOn(w, 'silk', 'doll-tall'); run(w, after); return w }],
    [`the ride, ${after} s in`, () => { const w = mat({ horse: { x: 520, y: 590 }, 'arch-large': { x: 720, y: 560 } }); putOn(w, 'doll-round', 'horse'); run(w, after); return w }],
    [`the tunnel, ${after} s in`, () => { const w = mat({ 'arch-large': { x: 520, y: 590 } }); putOn(w, 'horse', 'arch-large'); run(w, after); return w }],
    [`the slide, ${after} s in`, () => { const w = mat({ 'arch-large': { x: 520, y: 590 } }); putOn(w, 'doll-small', 'arch-large'); run(w, after); return w }],
    [`asleep, ${after} s in`, () => { const w = mat({ 'arch-large': { x: 520, y: 590, turned: true } }); putOn(w, 'doll-tall', 'arch-large'); run(w, after); return w }],
    [`the tower bows, ${after} s in`, () => { const w = mat({ 'doll-round': { x: 520, y: 590 } }); putOn(w, 'doll-tall', 'doll-round'); run(w, after); return w }],
    [`the carried horse, ${after} s in`, () => { const w = mat({ 'doll-round': { x: 520, y: 590 } }); putOn(w, 'horse', 'doll-round'); run(w, after); return w }],
    [`the march, ${after} s in`, () => { const w = mat({ 'doll-tall': { x: 520, y: 590 }, horse: { x: 700, y: 600 }, 'arch-large': { x: 400, y: 560, turned: true } }); tapBasket(w); run(w, after); return w }],
    [`the call, ${after} s in`, () => { const w = mat({}); tapBasket(w); run(w, after); return w }],
    [`out again, ${after} s in`, () => { const w = mat({ 'doll-tall': { x: 520, y: 590 }, horse: { x: 700, y: 600 } }); tapBasket(w); run(w, 6); tapBasket(w); run(w, after / 2); return w }],
  ]),
]

describe('found as left', () => {
  it.each(STATES)('parked equals loaded: %s', (_name, reach, found, drops) => {
    const world = reach()
    // What a save taken at this instant holds.
    const before = { places: world.places(), basket: world.basket }
    world.settle()
    const saved = { places: world.places(), basket: world.basket }
    // Going to rest moved nothing the child had not moved: the save is the same after it as before. The one
    // exception is a thing the child has let go that had not dropped yet, or still carried: the drop is the
    // child's, and rest makes it, and a thing still carried over the mat stays where the child had brought it.
    if (!drops) expect(saved).toEqual(before)
    found?.(saved.places, world)
    const loaded = new World(saved.places, saved.basket)
    expect(still(world)).toEqual(still(loaded))
    // And both are still and silent from then on: no flag outlives the touch, and no timer is part way.
    for (const each of [world, loaded]) {
      expect(run(each, 4), 'sounds after rest').toEqual([])
      expect(each.scene).toBeNull()
      expect(each.hand).toBeNull()
      expect(each.places()).toEqual(saved.places)
    }
  })

  it.each(STATES)('a load starts nothing and sounds nothing: %s', (_name, reach) => {
    const world = reach()
    const loaded = new World(world.places(), world.basket), before = loaded.changes
    expect(loaded.takeSounds()).toEqual([])
    expect(run(loaded, 6)).toEqual([])
    expect(loaded.changes).toBe(before)
    for (const p of loaded.pieces) expect([p.px, p.py, p.lift, p.hop, p.flight, p.led, p.stir], p.def.id).toEqual([p.x, p.y, 0, 0, null, false, null])
  })

  it('saves a thing in hand where it came from, on what it rested on, and a thing in the air where it is going', () => {
    const world = mat({ 'doll-round': { x: 520, y: 590 }, 'doll-small': { x: 520, y: 590, on: 'doll-round' } })
    take(world, 'doll-small')
    expect(world.places()['doll-small']).toEqual({ at: 'mat', x: 520, y: 590, on: 'doll-round', turned: false })
    tap(world, 720, 600)
    expect(world.piece('doll-small').flight).not.toBeNull()
    expect(world.places()['doll-small']).toEqual({ at: 'mat', x: 720, y: 600, on: null, turned: false })
  })

  it('finds a thing that was on its way into the basket in the basket: put away then, it is inside and not on the rim; tapped then, it is never in hand while it is the basket\'s', () => {
    for (const tipped of [false, true]) {
      const world = mat({}, tipped ? 'tipped' : 'upright')
      take(world, 'doll-small')
      tapBasket(world)
      run(world, 0.1)
      const doll = world.piece('doll-small')
      expect([doll.at, doll.flight !== null, doll.far < 1]).toEqual(['basket', true, true])
      // A finger on it in the air means the basket: the doll is not taken in hand as the basket's.
      const at = { x: doll.px, y: doll.py - doll.lift - doll.def.height * 0.4 }
      expect(world.hit(at.x, at.y).kind).not.toBe('piece')
      // Put away in that instant, it is where a load puts a doll that is in the basket: inside, looking out, and nowhere near the rim's middle in the air.
      world.settle()
      const loaded = new World(world.places(), world.basket), there = loaded.piece('doll-small')
      expect(world.places()['doll-small'].at).toBe('basket')
      expect([doll.px, doll.py, doll.far, doll.flight]).toEqual([there.px, there.py, 1, null])
      expect(world.hand).toBeNull()
    }
    // Tapped while it flies in: the basket answers, and no thing is in hand while it is marked as in the basket.
    const world = mat({})
    take(world, 'doll-small')
    tapBasket(world)
    run(world, 0.1)
    const doll = world.piece('doll-small')
    tap(world, doll.px, doll.py - doll.lift - doll.def.height * 0.4)
    for (let i = 0; i < 120; i++) { run(world, 1 / 60); expect(world.hand !== null && world.piece(world.hand.id).at === 'basket').toBe(false) }
  })

  it('sets a stack that was dragged off the mat and let go down whole on the nearest edge of the mat, and sends a single thing home', () => {
    const world = mat({ 'doll-round': { x: 520, y: 590 }, 'doll-small': { x: 520, y: 590, on: 'doll-round' }, horse: { x: 760, y: 600 } })
    const drag = (id: 'doll-round' | 'horse', x: number, y: number): void => { const at = middle(world, id); world.press(at.x, at.y); world.dragStart(); world.dragMove(x, y); run(world, 0.3); world.dragEnd(); run(world, 2) }
    drag('doll-round', 300, 150)
    expect(world.hand).toBeNull()
    expect(world.places()['doll-round']).toMatchObject({ at: 'mat', on: null })
    expect(world.places()['doll-small']).toMatchObject({ at: 'mat', on: 'doll-round' })
    // The nearest edge: up and to the left of where it stood, towards where it was let go.
    expect(world.places()['doll-round'].x).toBeLessThan(520)
    expect(world.places()['doll-round'].y).toBeLessThan(590)
    drag('horse', 300, 150)
    expect(world.places().horse.at).toBe('home')
  })
})
