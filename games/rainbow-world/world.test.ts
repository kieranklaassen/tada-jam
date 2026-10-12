import { describe, expect, it } from 'vitest'
import { MAX_DEMOS } from './guidance'
import { BASKET, CAT, FIELD, feetCross, inField, onMat } from './layout'
import { FLIP, REAR, ROCK_KNOCKS } from './motion'
import { ALL_PIECES, ARCH_RING, PIECES, PIECE_IDS, type PieceId } from './pieces'
import { below, makeRng } from './rng'
import { STAGE } from './stage'
import { CARRIED, HELD, LIFT_GRACE, OFF_TAP, World, firstPlaces, homePlaces } from './world'

const FRAME = 1 / 60
/** Plays the world for a while at 60 frames a second and returns every sound it asked for, in order. */
function play(world: World, seconds: number, frame = FRAME): string[] {
  const heard: string[] = []
  for (let t = 0; t < seconds - 1e-9; t += frame) {
    world.step(frame)
    for (const sound of world.takeSounds()) heard.push(sound.piece ? `${sound.name}:${sound.piece}` : sound.name)
  }
  return heard
}
const names = (world: World): string[] => world.takeSounds().map((sound) => sound.name)
const home = (id: PieceId) => ({ x: PIECES[id].home.x, y: PIECES[id].home.y - 40 })
/** A tap: the finger lands and lifts where it landed. */
function tap(world: World, x: number, y: number): void {
  world.press(x, y)
  world.tap()
}
/** A tap on a thing by the mat and a tap on the mat. */
function put(world: World, id: PieceId, x: number, y: number): void {
  tap(world, home(id).x, home(id).y)
  tap(world, x, y)
}

describe('setting a thing down on the mat', () => {
  it('lifts a thing the moment the finger lands on it, with its own short note', () => {
    const world = new World()
    world.press(home('doll-round').x, home('doll-round').y)
    expect(world.hand?.id).toBe('doll-round')
    expect(world.takeSounds()).toEqual([{ name: 'pick', piece: 'doll-round', gain: 0.9 }])
    play(world, 0.5)
    expect(world.piece('doll-round').lift).toBeCloseTo(HELD, 0)
  })

  it('knocks it down where the mat is tapped, and it stays there', () => {
    const world = new World()
    put(world, 'doll-round', 560, 560)
    // It left on the press: it is already on its way and already belongs to the mat.
    expect(world.hand).toBeNull()
    expect(world.piece('doll-round').flight).not.toBeNull()
    expect(world.places()['doll-round']).toEqual({ at: 'mat', x: 560, y: 560, on: null, turned: false })
    world.takeSounds()
    expect(play(world, 1)).toEqual(['knock:doll-round'])
    const doll = world.piece('doll-round')
    expect([doll.px, doll.py, doll.lift]).toEqual([560, 560, 0])
    play(world, 20)
    expect(world.places()['doll-round']).toEqual({ at: 'mat', x: 560, y: 560, on: null, turned: false })
  })

  it('gives each thing its own landing: a bar for each arch and doll, two pairs of hooves, a sigh and a bell', () => {
    const heard: Record<string, string[]> = {}
    for (const id of PIECE_IDS) {
      // A tap on the nest takes the outermost arch, so an inner one is reached with the outer ones already out.
      const places = homePlaces()
      if (id !== 'arch-large' && PIECES[id].kind === 'arch') places['arch-large'] = { at: 'mat', x: 380, y: 630, on: null, turned: false }
      if (id === 'arch-small') places['arch-middle'] = { at: 'mat', x: 800, y: 630, on: null, turned: false }
      const world = new World(places)
      put(world, id, 590, 520)
      heard[id] = [...names(world).slice(1), ...play(world, 1.5)]
    }
    for (const id of PIECE_IDS.filter((each) => PIECES[each].kind === 'arch' || PIECES[each].kind === 'doll')) expect(heard[id]).toEqual(['touch', `knock:${id}`])
    expect(heard.horse).toEqual(['touch', 'clop:horse', 'clop:horse', 'snort:horse'])
    expect(heard.silk).toEqual(['sigh', 'bell:silk'])
    expect(new Set(ALL_PIECES.map((piece) => piece.note)).size).toBe(PIECE_IDS.length)
  })

  it('answers the landing with more than the landing: a ring in the mat, a look, and a hop from whoever stands near', () => {
    const world = new World(firstPlaces(true))
    const small = world.piece('doll-small')
    put(world, 'doll-round', small.x - 150, small.y)
    play(world, 0.4)
    expect(world.ripples.length).toBe(1)
    expect(world.look.until).toBeGreaterThan(world.time)
    expect(small.hop).toBeGreaterThan(0)
    play(world, 2)
    expect(small.hop).toBe(0)
  })

  it('carries a thing under a dragging finger and drops it where the finger lets go', () => {
    const world = new World()
    world.press(home('horse').x, home('horse').y)
    world.dragStart()
    for (let i = 1; i <= 20; i++) {
      world.dragMove(home('horse').x + i * 22, home('horse').y)
      world.step(FRAME)
    }
    expect(world.piece('horse').lift).toBeGreaterThan(HELD)
    expect(world.piece('horse').lift).toBeLessThan(CARRIED + 12)
    world.dragEnd()
    play(world, 1.5)
    const horse = world.places().horse
    expect(horse.at).toBe('mat')
    expect(inField(horse.x, horse.y)).toBe(true)
  })

  it('lets a carried thing wait in the air for a lifted finger, on the world\'s own clock', () => {
    const world = new World()
    world.press(home('doll-tall').x, home('doll-tall').y)
    world.dragStart()
    world.dragMove(300, 380)
    play(world, 0.3)
    world.dragEnd()
    // With no step the wait never ends: nothing but the world's clock can end it.
    expect(world.hand?.mode).toBe('waiting')
    play(world, LIFT_GRACE * 0.5)
    expect(world.hand?.mode).toBe('waiting')
    // The finger comes back near it: the same carry goes on, and the thing has not been dropped.
    const doll = world.piece('doll-tall')
    world.press(doll.px + 20, doll.py - doll.lift - 100)
    expect(world.hand?.mode).toBe('drag')
    world.dragMove(590, 480)
    play(world, 0.4)
    world.dragEnd()
    play(world, LIFT_GRACE + 1)
    expect(world.hand).toBeNull()
    expect(world.places()['doll-tall'].at).toBe('mat')
  })

  it('counts a carry that was let go most of the way to the mat, and sends back one that was not', () => {
    const most = new World(), little = new World()
    for (const [world, reach] of [[most, 0.8], [little, 0.2]] as const) {
      const from = PIECES.silk.home
      world.press(from.x, from.y - 40)
      world.dragStart()
      // Toward the mat's near edge, from the silk's place on the right.
      world.dragMove(from.x + (FIELD.x + FIELD.rx - from.x) * reach, from.y - 40 + (FIELD.y - from.y) * reach)
      play(world, 0.5)
      world.dragEnd()
      play(world, 2)
    }
    expect(most.places().silk.at).toBe('mat')
    expect(little.places().silk.at).toBe('home')
  })

  it('puts a thing back where it came from when the carry is taken away, with no drop and no sound', () => {
    const world = new World()
    put(world, 'doll-small', 500, 560)
    play(world, 1)
    const before = world.places(), changes = world.changes
    world.press(500, 540)
    world.dragStart()
    world.dragMove(900, 300)
    play(world, 0.3)
    world.takeSounds()
    world.dragCancel()
    expect(play(world, 1)).toEqual([])
    expect(world.places()).toEqual(before)
    expect(world.changes).toBe(changes)
  })
})

describe('the other taps', () => {
  it('turns the thing in hand over when it is tapped again, each kind in its own way', () => {
    const turned = (id: PieceId): string[] => {
      const world = new World()
      tap(world, home(id).x, home(id).y)
      world.takeSounds()
      world.press(home(id).x, home(id).y - HELD)
      const pressed = names(world)
      world.tap()
      expect(world.hand, id).toBeNull()
      expect(world.places()[id].turned, id).toBe(true)
      return [...pressed, ...names(world), ...play(world, 4)]
    }
    expect(turned('arch-large')).toEqual(['touch', ...ROCK_KNOCKS.map(() => 'rock:arch-large')])
    expect(turned('doll-small')).toEqual(['touch', 'chirp'])
    expect(turned('horse')).toEqual(['touch', 'whinny', 'clop:horse'])
    expect(turned('silk')).toEqual(['touch', 'pat:silk', 'pat:silk', 'pat:silk'])
  })

  it('rocks an arch to rest with knocks that grow softer and come sooner', () => {
    const world = new World()
    tap(world, home('arch-large').x, home('arch-large').y)
    tap(world, home('arch-large').x, home('arch-large').y - HELD)
    world.takeSounds()
    const at: number[] = [], gain: number[] = []
    for (let t = 0; t < 4; t += FRAME) {
      world.step(FRAME)
      for (const sound of world.takeSounds()) { at.push(world.time); gain.push(sound.gain) }
    }
    expect(at.length).toBe(ROCK_KNOCKS.length)
    expect(at[0]).toBeGreaterThanOrEqual(FLIP)
    for (let i = 1; i < at.length; i++) expect(gain[i]).toBeLessThan(gain[i - 1])
    for (let i = 2; i < at.length; i++) expect(at[i] - at[i - 1]).toBeLessThan(at[i - 1] - at[i - 2] + FRAME)
  })

  it('stops what a thing was still going to do when it is taken in hand again', () => {
    const world = new World()
    tap(world, home('horse').x, home('horse').y)
    tap(world, home('horse').x, home('horse').y - HELD)
    play(world, REAR * 0.5)
    world.press(home('horse').x, home('horse').y)
    world.takeSounds()
    expect(play(world, 2)).toEqual([])
  })

  it('sends a single thing in hand back to its place at a tap anywhere off the mat, and the cat, the sill and the pane answer that tap too', () => {
    for (const [x, y, own] of [[CAT.x, CAT.y - 40, 'mew'], [900, 760, 'soft'], [1160, 180, 'tink'], [40, 60, 'tink']] as const) {
      const world = new World()
      put(world, 'doll-tall', 600, 560)
      play(world, 1)
      tap(world, 600, 460)
      expect(world.hand?.id).toBe('doll-tall')
      world.takeSounds()
      // The same tap is answered twice over: what was touched answers as itself when the finger lands, and the thing sets off home when the finger lifts.
      world.press(x, y)
      expect(names(world)).toEqual([own])
      expect(world.hand?.id).toBe('doll-tall')
      play(world, 0.3)
      world.tap()
      expect(names(world)).toEqual(['touch'])
      expect(world.hand).toBeNull()
      expect(world.places()['doll-tall']).toEqual({ at: 'home', x: PIECES['doll-tall'].home.x, y: PIECES['doll-tall'].home.y, on: null, turned: false })
      expect(play(world, 1)).toContain('tok:doll-tall')
    }
  })

  it('never lets the heel of a hand send a thing home: a touch off the mat that stays down longer than a tap sends nothing anywhere', () => {
    for (const [x, y] of [[900, 760], [1160, 180], [CAT.x, CAT.y - 40]] as const) {
      const world = new World()
      put(world, 'doll-tall', 600, 560)
      play(world, 1)
      tap(world, 600, 460)
      const held = world.places()
      world.press(x, y)
      // It rests there, and lifts at last: the doll is still in hand, where it was.
      play(world, OFF_TAP + 0.1)
      world.tap()
      expect(world.hand?.id).toBe('doll-tall')
      expect(world.places()).toEqual(held)
      // It was taken away instead of lifting: the same.
      world.press(x, y)
      world.pressEnd()
      play(world, 1)
      expect(world.hand?.id).toBe('doll-tall')
      // And the next tap on the mat sets the doll down there.
      tap(world, 700, 600)
      expect(world.places()['doll-tall']).toMatchObject({ at: 'mat', x: 700, y: 600 })
    }
  })

  it('shows a tap on the sill: a ring opens on the wood where the finger landed, and the cat is told', () => {
    const world = new World()
    tap(world, 900, 760)
    expect(names(world)).toEqual(['soft'])
    expect(world.tinks.map((each) => [each.x, each.y, each.at])).toEqual([[900, 760, world.time]])
    expect(world.sillAt).toBe(world.time)
  })

  it('answers a tap on the lying basket in the tap itself', () => {
    const world = new World({ ...homePlaces(), 'doll-small': { at: 'basket', x: 0, y: 0, on: null, turned: false } }, 'tipped')
    tap(world, BASKET.x, BASKET.y - 70)
    expect(names(world)).toEqual(['wicker'])
    expect(world.basketAt).toBe(world.time)
    expect(world.scene).not.toBeNull()
  })

  it('never leaves a thing hanging: a finger that comes back within the grace and lifts again has let go again', () => {
    for (const lift of ['tap', 'pressEnd'] as const) {
      const world = new World(), horse = world.piece('horse')
      world.press(home('horse').x, home('horse').y)
      world.dragStart()
      world.dragMove(560, 520)
      play(world, 0.2)
      world.dragEnd()
      play(world, 0.1)
      // The finger comes back to it within the grace: the same carry goes on.
      world.press(horse.px, horse.py - horse.lift - horse.def.height / 2)
      expect(world.hand?.mode, lift).toBe('drag')
      // And lifts again where it landed: that is letting go again, not a tap and not nothing.
      if (lift === 'tap') world.tap()
      else world.pressEnd()
      expect(world.hand?.mode, lift).toBe('waiting')
      play(world, LIFT_GRACE + 0.05)
      expect(world.hand, lift).toBeNull()
      play(world, 1)
      expect(world.places().horse.at, lift).toBe('mat')
      expect([horse.lift, horse.flight], lift).toEqual([0, null])
    }
  })

  it('lets a carried thing sink and quiver while it waits for the finger, and drops it when the grace ends', () => {
    const world = new World(), doll = world.piece('doll-round')
    world.press(home('doll-round').x, home('doll-round').y)
    world.dragStart()
    world.dragMove(560, 480)
    play(world, 0.6)
    expect(doll.lift).toBeCloseTo(CARRIED, 0)
    world.dragEnd()
    const heights: number[] = []
    let quiver = 0
    for (let t = 0; t < LIFT_GRACE - FRAME; t += FRAME) { world.step(FRAME); heights.push(doll.lift); quiver = Math.max(quiver, Math.abs(doll.squash)) }
    // It is still the hand's, and it is not hanging: it sinks all the while and its paper quivers.
    expect(world.hand?.mode).toBe('waiting')
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeLessThan(heights[i - 1])
    expect(heights[heights.length - 1]).toBeLessThan(CARRIED * 0.75)
    expect(quiver).toBeGreaterThan(0.02)
    // The grace is the world's own time: when it ends the thing drops.
    world.step(FRAME * 2)
    expect(world.hand).toBeNull()
    expect(doll.flight).not.toBeNull()
  })

  it('makes the bare mat a paper drum: a thump, a ring, and the things by the mat hop', () => {
    const world = new World()
    world.press(590, 540)
    expect(names(world)).toEqual(['thump'])
    play(world, 0.1)
    expect(world.pieces.every((piece) => piece.hop > 0)).toBe(true)
    expect(world.places()).toEqual(homePlaces())
  })

  it('answers the basket, the cat and the pane as themselves, and changes nothing', () => {
    const world = new World()
    world.press(BASKET.x, BASKET.y - 60)
    world.press(CAT.x, CAT.y - 40)
    world.press(1160, 180)
    expect(names(world)).toEqual(['creak', 'mew', 'tink'])
    expect(world.changes).toBe(0)
  })

  it('answers every touch anywhere on the stage with a sound, in the touch itself', () => {
    const rng = makeRng(7), world = new World(firstPlaces(true))
    for (let i = 0; i < 400; i++) {
      world.press(rng.next() * STAGE.width, rng.next() * STAGE.height)
      expect(world.takeSounds().length, `touch ${i}`).toBeGreaterThan(0)
      if (rng.next() < 0.8) world.tap()
      play(world, rng.next() * 0.6)
    }
  })
})

describe('found as left', () => {
  it('saves a thing in hand where it came from and a thing in the air where it is going', () => {
    const world = new World()
    tap(world, home('doll-round').x, home('doll-round').y)
    expect(world.places()).toEqual(homePlaces())
    world.press(560, 560)
    expect(world.piece('doll-round').flight).not.toBeNull()
    expect(world.places()['doll-round']).toEqual({ at: 'mat', x: 560, y: 560, on: null, turned: false })
  })

  it('has nothing in hand once the game has gone to rest', () => {
    const held = new World()
    tap(held, home('silk').x, home('silk').y)
    held.settle()
    expect(held.hand).toBeNull()
    expect(held.places()).toEqual(homePlaces())
    // A thing the finger had already let go is dropped: that drop was the child's.
    const dropped = new World()
    dropped.press(home('doll-tall').x, home('doll-tall').y)
    dropped.dragStart()
    dropped.dragMove(590, 480)
    play(dropped, 0.5)
    dropped.dragEnd()
    dropped.settle()
    expect(dropped.places()['doll-tall'].at).toBe('mat')
  })

  it('opens as it was left, with nothing moving and no sound', () => {
    const before = new World(firstPlaces(true))
    put(before, 'arch-large', 420, 500)
    put(before, 'horse', 760, 620)
    play(before, 2)
    const again = new World(before.places())
    expect(again.places()).toEqual(before.places())
    expect(play(again, 3)).toEqual([])
    expect(again.pieces.every((piece) => piece.lift === 0 && piece.hop === 0 && piece.flight === null)).toBe(true)
  })
})

describe('nothing stands in anything', () => {
  it('finds every thing a free place or a thing to rest on however the mat is tapped, and never moves a foot off the field', { timeout: 30000 }, () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = makeRng(seed), world = new World()
      const order = [...PIECE_IDS].sort(() => rng.next() - 0.5)
      for (const id of order) {
        // Many taps aim at the same few places, as a small child's do.
        const x = FIELD.x + (below(rng, 5) - 2) * 60 + rng.next() * 20, y = FIELD.y + (below(rng, 3) - 1) * 50
        tap(world, home(id).x, home(id).y)
        tap(world, x, y)
        play(world, 0.3)
      }
      play(world, 1.5)
      // A tap that lands on a thing makes a pair, so some things rest on others; the feet are those of the things on the bare mat.
      expect(world.pieces.filter((piece) => piece.at === 'mat').length, `seed ${seed}`).toBeGreaterThanOrEqual(5)
      const onIt = world.pieces.filter((piece) => piece.at === 'mat' && piece.on === null)
      for (const a of onIt) {
        expect(inField(a.x, a.y), `seed ${seed}: ${a.def.id}`).toBe(true)
        expect(onMat(a.x - a.def.reach, a.y) && onMat(a.x + a.def.reach, a.y), `seed ${seed}: ${a.def.id} on the mat`).toBe(true)
        for (const b of onIt) if (a !== b) expect(feetCross(a.def, a.x, a.y, b.def, b.x, b.y), `seed ${seed}: ${a.def.id} in ${b.def.id}`).toBe(false)
      }
    }
  })
})

describe('what the idle hand may show', () => {
  it('offers a thing by the mat, and with a thing in hand a free place on the mat', () => {
    const world = new World()
    const first = world.offers()[0], doll = PIECES['doll-round']
    expect(first).toEqual({ x: doll.home.x, y: doll.home.y - doll.height * 0.5 })
    tap(world, home('doll-round').x, home('doll-round').y)
    const to = world.offers()[0]
    expect(inField(to.x, to.y)).toBe(true)
  })

  it('shows each thing once in an idle stretch: no two of its offers are the same', () => {
    for (const first of [true, false]) for (const withHand of [false, true]) {
      const world = new World(firstPlaces(first))
      if (withHand) tap(world, home('doll-round').x, home('doll-round').y)
      const offers = world.offers()
      expect(offers.length).toBeGreaterThanOrEqual(2)
      expect(offers.length).toBeLessThanOrEqual(MAX_DEMOS)
      expect(new Set(offers.map((each) => `${Math.round(each.x)},${Math.round(each.y)}`)).size).toBe(offers.length)
    }
  })

  it('has something to show with all eight on the mat: a thing to take and another to put it on, never nothing and never the basket', () => {
    const spots: [PieceId, number, number][] = [['arch-large', 420, 520], ['arch-middle', 600, 500], ['arch-small', 760, 520], ['doll-tall', 380, 600], ['doll-round', 520, 620], ['doll-small', 660, 630], ['horse', 800, 610], ['silk', 590, 570]]
    const places = homePlaces()
    for (const [id, x, y] of spots) places[id] = { at: 'mat', x, y, on: null, turned: false }
    for (const basket of ['upright', 'tipped'] as const) {
      const world = new World(places, basket), offers = world.offers()
      expect(offers.length).toBe(2)
      const shown = offers.map((at) => world.hit(at.x, at.y))
      for (const each of shown) expect(each.kind === 'piece' && each.piece.at === 'mat').toBe(true)
      expect(shown[0].kind === 'piece' && shown[1].kind === 'piece' && shown[0].piece !== shown[1].piece).toBe(true)
      expect(world.offered().length).toBe(2)
    }
    // A crowded mat, as a child left it in a still: the horse stands before the large arch and the silk over the round doll's skirt. A tap where the hand shows takes the thing the light is round, and no other.
    const crowded: [PieceId, number, number][] = [['arch-large', 383, 521], ['arch-middle', 800, 520], ['arch-small', 590, 650], ['doll-tall', 470, 590], ['doll-round', 710, 590], ['doll-small', 590, 500], ['horse', 419, 618], ['silk', 770, 618]]
    for (const [id, x, y] of crowded) places[id] = { at: 'mat', x, y, on: null, turned: false }
    const full = new World(places), lit = full.offered()
    expect(lit.length).toBe(2)
    full.offers().forEach((at, i) => { const target = full.hit(at.x, at.y); expect(target.kind === 'piece' && target.piece).toBe(lit[i]) })
    // A doll whose middle is behind another is not the one shown: the hand could only point at the one in front.
    const hidden = homePlaces()
    for (const id of PIECE_IDS) hidden[id] = { at: 'basket', x: 0, y: 0, on: null, turned: false }
    for (const [id, x, y] of [['doll-small', 500, 560], ['doll-round', 500, 600], ['horse', 760, 600]] as const) hidden[id] = { at: 'mat', x, y, on: null, turned: false }
    const behind = new World(hidden)
    expect(behind.offered().map((p) => p.def.id)).toEqual(['doll-round', 'horse'])
    behind.offers().forEach((at, i) => { const target = behind.hit(at.x, at.y); expect(target.kind === 'piece' && target.piece).toBe(behind.offered()[i]) })
    // The hand points at a standing arch on its band, not into its hollow, where another thing shows.
    const arch = full.piece('arch-middle'), aimed = new World({ ...homePlaces(), 'arch-middle': { at: 'mat', x: 600, y: 560, on: null, turned: false } }).offers()
    expect(aimed.some((at) => at.x === 600 && 560 - at.y > ARCH_RING['arch-middle'].inner && 560 - at.y < ARCH_RING['arch-middle'].outer)).toBe(true)
    expect(arch.def.height * 0.5).toBeLessThan(ARCH_RING['arch-middle'].inner)
    // All eight in one tower and its neighbours: one thing on the bare mat is still something to show.
    for (const [id] of spots.slice(1)) places[id] = { at: 'basket', x: 0, y: 0, on: null, turned: false }
    const one = new World(places).offers()
    expect(one.length).toBe(1)
    // And with a thing by the mat again, the things by the mat come first, as before.
    places.horse = homePlaces().horse
    const again = new World(places), first = again.hit(again.offers()[0].x, again.offers()[0].y)
    expect(first.kind === 'piece' && first.piece.def.id).toBe('horse')
  })

  it('never offers the basket while anything stands on the mat: one copied tap must not march a build away', () => {
    const onBasket = (world: World): boolean => world.offers().some((at) => world.hit(at.x, at.y).kind === 'basket')
    // The mat is bare: the basket is among the offers, with an empty hand and with a thing in hand.
    const bare = new World()
    expect(onBasket(bare)).toBe(true)
    tap(bare, home('doll-round').x, home('doll-round').y)
    expect(onBasket(bare)).toBe(true)
    // One thing on the mat, or more, with an empty hand or a thing in hand, the basket upright or lying: no offer is the basket.
    for (const tipped of [false, true]) {
      const world = new World({ ...firstPlaces(true) }, tipped ? 'tipped' : 'upright')
      expect(onBasket(world)).toBe(false)
      put(world, 'horse', 500, 600)
      play(world, 1)
      expect(onBasket(world)).toBe(false)
      tap(world, home('doll-round').x, home('doll-round').y)
      expect(onBasket(world)).toBe(false)
    }
  })
})
