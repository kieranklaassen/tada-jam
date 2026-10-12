import { describe, expect, it } from 'vitest'
import { mat, middle, named, put, putOn, run, take, tap, tapBasket } from './drive'
import { BASKET, shrinkFor, toField } from './layout'
import { PIECES, PIECE_IDS, type PieceId } from './pieces'
import { LID_TILT, RATTLES, TEETER } from './pose'
import { stand } from './stack'
import { World, homePlaces } from './world'

// The object-by-action grid, cell by cell: what one thing does when it is put on another. These are the short
// answers; the long ones are scenes (scenes.test.ts). Every cell is reached with taps alone, sounds at the
// moment the thing lands on its seat, and is in the things' resting places from the press on.

describe('a thing put on a thing: the short answers', () => {
  it('nests an arch in a standing arch: both bars as one clack, at the frame it lands', () => {
    const world = mat({ 'arch-large': { x: 500, y: 560 } })
    putOn(world, 'arch-middle', 'arch-large')
    // The pair is there from the press on, before anything has moved.
    expect(world.places()['arch-middle']).toEqual({ at: 'mat', x: 500, y: 560, on: 'arch-large', turned: false })
    expect(named(world.takeSounds())).toEqual(['pick:arch-middle', 'touch:arch-middle'])
    const heard = run(world, 1.5)
    expect(heard.map((each) => each.name)).toEqual(['clack'])
    expect(heard[0]).toMatchObject({ piece: 'arch-middle', other: 'arch-large' })
    // They stand at one foot, the smaller inside the larger.
    expect(stand(world.pieces, world.piece('arch-middle'))).toMatchObject({ x: 500, y: 560 })
  })

  it('lays an arch across a cradle as a lid that teeters, tick and tock on the two notes, slowing, and stays tilted', () => {
    const world = mat({ 'arch-large': { x: 500, y: 580, turned: true } })
    putOn(world, 'arch-middle', 'arch-large')
    world.takeSounds()
    const heard = run(world, 3)
    expect(named(heard)).toEqual(['tick:arch-middle', 'tick:arch-large', 'tick:arch-middle', 'tick:arch-large', 'tick:arch-middle'])
    const gaps = heard.slice(1).map((each, i) => each.at - heard[i].at)
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1])
    expect(gaps.length).toBe(TEETER.length - 1)
    const lid = world.piece('arch-middle')
    expect(lid.tilt).toBeCloseTo(LID_TILT, 5)
    // It lies on the rim, above the cradle's foot.
    expect(stand(world.pieces, lid).y).toBeLessThan(580 - 60)
  })

  it('drops an arch over a doll as a collar: a hollow bonk, then the doll squeaks and shuffles', () => {
    const world = mat({ 'doll-round': { x: 560, y: 580 } })
    putOn(world, 'arch-large', 'doll-round')
    expect(world.places()['arch-large'].on).toBe('doll-round')
    world.takeSounds()
    const heard = run(world, 0.8)
    expect(named(heard)).toEqual(['bonk:arch-large', 'squeak:doll-round'])
    expect(Math.abs(world.piece('doll-round').tilt)).toBeGreaterThan(0)
    run(world, 2)
    expect(world.piece('doll-round').tilt).toBe(0)
  })

  it('hangs an arch round the neck of the horse, which shakes it round with a rattle of dry knocks', () => {
    const world = mat({ horse: { x: 560, y: 600 } })
    putOn(world, 'arch-large', 'horse')
    world.takeSounds()
    const ring = world.piece('arch-large'), spins: number[] = []
    const heard: string[] = []
    for (let i = 0; i < 90; i++) { world.step(1 / 60); heard.push(...named(world.takeSounds())); spins.push(ring.spin) }
    expect(heard).toEqual(['tok:arch-large', ...RATTLES.map(() => 'rattle:arch-large')])
    expect(Math.max(...spins)).toBeGreaterThan(Math.PI * 3)
    expect(ring.spin).toBe(0)
    // It hangs in front of the horse's chest, off its middle.
    expect(Math.abs(stand(world.pieces, ring).x - 560)).toBeGreaterThan(40)
  })

  it('makes a rocking horse of the horse in a cradle: creak and creak, and a neigh upward', () => {
    const world = mat({ 'arch-large': { x: 560, y: 600, turned: true } })
    putOn(world, 'horse', 'arch-large')
    world.takeSounds()
    const tilts: number[] = [], heard: string[] = []
    for (let i = 0; i < 150; i++) { world.step(1 / 60); heard.push(...named(world.takeSounds())); tilts.push(world.piece('arch-large').tilt) }
    expect(heard).toEqual(['clop:horse', 'creak', 'creak', 'creak', 'creak', 'neigh:horse'])
    expect(Math.max(...tilts)).toBeGreaterThan(0.1)
    expect(Math.min(...tilts)).toBeLessThan(-0.05)
    expect(world.piece('horse').mood).toBeGreaterThan(0.9)
    expect(world.places().horse.on).toBe('arch-large')
  })

  it('tells the hill from the hammock: a held hum and peeking dolls over a standing arch, two soft knocks and a falling hum in a cradle', () => {
    const hill = mat({ 'arch-large': { x: 560, y: 600 }, 'doll-small': { x: 760, y: 600 } })
    putOn(hill, 'silk', 'arch-large')
    hill.takeSounds()
    const overHill = run(hill, 1.2)
    expect(named(overHill)).toEqual(['hum:arch-large'])
    expect(hill.look.peek).toBe(true)
    expect(hill.piece('arch-large').tilt).toBe(0)
    const hammock = mat({ 'arch-large': { x: 560, y: 600, turned: true } })
    putOn(hammock, 'silk', 'arch-large')
    hammock.takeSounds()
    const tilts: number[] = [], heard: string[] = []
    for (let i = 0; i < 90; i++) { hammock.step(1 / 60); heard.push(...named(hammock.takeSounds())); tilts.push(hammock.piece('arch-large').tilt) }
    expect(heard).toEqual(['humfall:arch-large', 'rock:arch-large', 'rock:arch-large'])
    expect(Math.max(...tilts)).toBeGreaterThan(0.1)
    expect(hammock.look.peek).toBe(false)
    // The silk hangs in the cradle, above its foot; over the hill it reaches the ground.
    expect(stand(hammock.pieces, hammock.piece('silk')).y).toBeLessThan(600)
    expect(stand(hill.pieces, hill.piece('silk')).y).toBe(600)
  })

  it('puts an arch under the silk that lies on the mat: it knocks down there and the silk is a hill over it', () => {
    const world = mat({ silk: { x: 560, y: 590 } })
    putOn(world, 'arch-large', 'silk')
    expect(world.places()['arch-large']).toMatchObject({ at: 'mat', x: 560, y: 590, on: null })
    expect(world.places().silk.on).toBe('arch-large')
    world.takeSounds()
    expect(named(run(world, 1))).toEqual(['knock:arch-large', 'hum:arch-large'])
  })

  it('puts the next thing on the top of a stack, and under the silk if the silk is the top', () => {
    const world = mat({ 'arch-large': { x: 560, y: 600 }, 'arch-middle': { x: 560, y: 600, on: 'arch-large' }, silk: { x: 560, y: 600, on: 'arch-middle' } })
    putOn(world, 'arch-small', 'arch-large')
    expect(world.places()['arch-small'].on).toBe('arch-middle')
    expect(world.places().silk.on).toBe('arch-small')
  })

  it('carries what rides on a thing with it, and sets a stack down whole on the mat where a single thing would fly to its place', () => {
    const world = mat({ horse: { x: 480, y: 600 }, 'arch-small': { x: 480, y: 600, on: 'horse' } })
    put(world, 'horse', 600, 560)
    run(world, 1)
    expect(world.places().horse).toMatchObject({ x: 600, y: 560 })
    expect(world.places()['arch-small']).toMatchObject({ at: 'mat', x: 600, y: 560, on: 'horse' })
    // A stack has no place by the mat. Its own empty place tapped, or another thing by the mat: it is set down on the mat, whole.
    for (const off of [{ x: PIECES.horse.home.x, y: PIECES.horse.home.y - 60 }, middle(world, 'doll-round')]) {
      take(world, 'horse')
      tap(world, off.x, off.y)
      expect(world.hand?.id === 'horse').toBe(false)
      expect(world.places().horse.at).toBe('mat')
      expect(world.places()['arch-small']).toMatchObject({ at: 'mat', on: 'horse' })
      run(world, 1)
      // It stands at the edge of the mat nearest the tap.
      const at = world.places().horse, edge = toField(off.x, off.y, shrinkFor(world.bulk(world.piece('horse'))))
      expect(Math.hypot(at.x - edge.x, at.y - edge.y)).toBeLessThan(40)
    }
    // The second tap was on a doll by the mat, which is now in hand.
    expect(world.hand?.id).toBe('doll-round')
    tap(world, 420, 520)
    run(world, 1)
    // A single thing flies to its place.
    put(world, 'doll-small', 700, 620)
    run(world, 1)
    take(world, 'doll-small')
    tap(world, PIECES['doll-small'].home.x, PIECES['doll-small'].home.y - 60)
    expect(world.places()['doll-small'].at).toBe('home')
    run(world, 1)
    expect([world.piece('doll-small').px, world.piece('doll-small').py]).toEqual([PIECES['doll-small'].home.x, PIECES['doll-small'].home.y])
  })

  it('never sets an arch on its back down at the foot of a standing arch: it comes down beside it, and the two bands close no ring', () => {
    /** An arch on its back and a standing arch that share a foot, the standing one not lying across the other as its lid. */
    const rings = (world: World): string[] => {
      const arches = world.pieces.filter((p) => p.def.kind === 'arch'), found: string[] = []
      for (const a of arches) for (const b of arches) {
        if (!a.turned || b.turned || a.at !== b.at || b.on === a.def.id) continue
        const at = stand(world.pieces, a), to = stand(world.pieces, b)
        if (Math.hypot(at.x - to.x, at.y - to.y) < a.def.halfWidth + b.def.halfWidth - 20) found.push(`${a.def.id} under ${b.def.id}`)
      }
      return found
    }
    // Two taps on the nest by the mat: the outermost arch is turned over in the hand. It comes down on the mat, on its back, and the nest keeps standing.
    const nest = mat({})
    take(nest, 'arch-large')
    const held = stand(nest.pieces, nest.piece('arch-large'))
    tap(nest, held.x, held.y - 90)
    expect(nest.hand).toBeNull()
    expect(nest.places()['arch-large']).toMatchObject({ at: 'mat', turned: true, on: null })
    run(nest, 3)
    expect(rings(nest)).toEqual([])
    // Sent back, it lies on its feet again, nested.
    take(nest, 'arch-large')
    tap(nest, PIECES['arch-large'].home.x, PIECES['arch-large'].home.y - 95)
    run(nest, 1)
    expect(nest.places()['arch-large']).toMatchObject({ at: 'home', turned: false })
    // On the mat, the top of a nest turned over in the hand comes down beside the nest.
    const three = mat({ 'arch-large': { x: 560, y: 600 }, 'arch-middle': { x: 560, y: 600, on: 'arch-large' }, 'arch-small': { x: 560, y: 600, on: 'arch-middle' } })
    take(three, 'arch-small')
    const small = stand(three.pieces, three.piece('arch-small'))
    tap(three, small.x, small.y - 40)
    run(three, 3)
    expect(three.places()['arch-small']).toMatchObject({ at: 'mat', turned: true, on: null })
    expect(Math.abs(three.places()['arch-small'].x - 560)).toBeGreaterThan(PIECES['arch-large'].reach)
    expect(rings(three)).toEqual([])
    // An arch on its back put on a standing arch comes down beside it too.
    putOn(three, 'arch-small', 'arch-large')
    run(three, 3)
    expect(three.places()['arch-small']).toMatchObject({ at: 'mat', turned: true, on: null })
    expect(rings(three)).toEqual([])
    // Two cups, one in the other; the lower one set back on its feet tips the upper one out beside it.
    const cups = mat({ 'arch-large': { x: 560, y: 600, turned: true }, 'arch-middle': { x: 560, y: 600, on: 'arch-large', turned: true } })
    // The outer cup is taken by its rim, where the inner one does not cover it.
    tap(cups, 560 - 90, 600 - 105)
    expect(cups.hand?.id).toBe('arch-large')
    const cup = stand(cups.pieces, cups.piece('arch-large'))
    tap(cups, cup.x - 90, cup.y - 105)
    run(cups, 3)
    expect(cups.places()['arch-large']).toMatchObject({ turned: false, on: null })
    expect(cups.places()['arch-middle']).toMatchObject({ at: 'mat', turned: true, on: null })
    expect(rings(cups)).toEqual([])
    // A save that holds what the game never makes is mended: by the mat every arch is on its feet, and a cup on a standing arch stands up.
    const places = homePlaces()
    places['arch-middle'] = { at: 'home', x: 0, y: 0, on: null, turned: true }
    places['arch-large'] = { at: 'mat', x: 560, y: 600, on: null, turned: false }
    places['arch-small'] = { at: 'mat', x: 560, y: 600, on: 'arch-large', turned: true }
    const loaded = new World(places)
    expect([loaded.places()['arch-middle'].turned, loaded.places()['arch-small'].turned]).toEqual([false, false])
    expect(rings(loaded)).toEqual([])
  })

  it('tips a doll out of a cradle that is set back on its feet: it tumbles to a free place beside it', () => {
    const world = mat({ 'arch-large': { x: 520, y: 600, turned: true }, 'doll-small': { x: 520, y: 600, on: 'arch-large' } })
    take(world, 'arch-large')
    const to = middle(world, 'arch-large')
    tap(world, to.x, to.y)
    expect(world.places()['arch-large'].turned).toBe(false)
    expect(world.places()['doll-small'].on).toBeNull()
    expect(Math.abs(world.places()['doll-small'].x - 520)).toBeGreaterThan(100)
    expect(named(run(world, 1.5)).includes('knock:doll-small')).toBe(true)
  })

  it('gives every pair of kinds an answer of its own: no two cells of the grid sound alike', () => {
    const cells: Record<string, string> = {}
    const lowers: [string, Parameters<typeof mat>[0], PieceId][] = [
      ['a standing arch', { 'arch-middle': { x: 560, y: 600 } }, 'arch-middle'],
      ['a cradle', { 'arch-middle': { x: 560, y: 600, turned: true } }, 'arch-middle'],
      ['a doll', { 'doll-round': { x: 560, y: 600 } }, 'doll-round'],
      ['the horse', { horse: { x: 560, y: 600 } }, 'horse'],
      ['the silk', { silk: { x: 560, y: 600 } }, 'silk'],
    ]
    for (const upper of ['arch-large', 'doll-tall', 'horse', 'silk'] as const) {
      for (const [name, things, lower] of lowers) {
        if (upper === lower) continue
        const world = mat(things)
        putOn(world, upper, lower)
        world.takeSounds()
        const heard = named(run(world, 4)).map((each) => each.split(':')[0])
        expect(heard.length, `${upper} on ${name}`).toBeGreaterThan(0)
        cells[`${PIECES[upper].kind} on ${name}`] = heard.join(' ')
      }
    }
    const answers = Object.values(cells)
    expect(new Set(answers).size, JSON.stringify(cells, null, 1)).toBe(answers.length)
  })
})

describe('the basket', () => {
  it('takes a thing that is put on it, with a wicker thump, and a doll ducks and comes up with a squeak', () => {
    const world = mat({})
    take(world, 'doll-round')
    tapBasket(world)
    expect(world.places()['doll-round']).toMatchObject({ at: 'basket', on: null })
    world.takeSounds()
    const ducks: number[] = [], heard: string[] = []
    for (let i = 0; i < 90; i++) { world.step(1 / 60); heard.push(...named(world.takeSounds())); ducks.push(world.piece('doll-round').duck) }
    expect(heard).toEqual(['wicker', 'squeak:doll-round'])
    expect(Math.max(...ducks)).toBeGreaterThan(0.9)
    expect(world.piece('doll-round').duck).toBeLessThan(0.05)
    // It shows over the rim.
    expect(world.piece('doll-round').py - PIECES['doll-round'].height).toBeLessThan(BASKET.y - BASKET.height)
  })

  it('gives the small doll, who likes the basket, a squeak of glee in it', () => {
    const world = mat({})
    take(world, 'doll-small')
    tapBasket(world)
    world.takeSounds()
    expect(named(run(world, 1.5))).toEqual(['wicker', 'glee:doll-small'])
  })

  it('pops one thing back out to its place for each tap while it holds any, the smallest first, and does nothing else', () => {
    const world = mat({ 'doll-tall': { x: 560, y: 600 } })
    for (const id of ['horse', 'doll-small'] as const) { take(world, id); tapBasket(world); run(world, 1) }
    tapBasket(world)
    expect(world.scene).toBeNull()
    expect(world.places()['doll-small'].at).toBe('home')
    expect(world.places().horse.at).toBe('basket')
    expect(world.places()['doll-tall'].at).toBe('mat')
    expect(named(world.takeSounds())).toEqual(['pop:doll-small'])
    expect(named(run(world, 1))).toEqual(['tok:doll-small'])
    tapBasket(world)
    expect(world.places().horse.at).toBe('home')
    expect(world.basket).toBe('upright')
    expect(PIECE_IDS.filter((id) => world.places()[id].at === 'basket')).toEqual([])
  })
})
