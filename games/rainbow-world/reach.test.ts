import { describe, expect, it } from 'vitest'
import { mat, putOn, run, take, tap, tapBasket } from './drive'
import { BASKET_BOX, LYING } from './basket'
import { BASKET, CAT, GROWN_UP_CORNER, HOME_CONTROL, MAT, SLIVER, bodiesOverlap } from './layout'
import { PIECES, PIECE_IDS, type PieceId } from './pieces'
import { topOf } from './shape'
import { onShape } from './hit'
import { fit } from './stage'
import { TOP_LIMIT, stand } from './stack'
import { MIN_TARGET, World, firstPlaces, homePlaces } from './world'

// What a finger can reach, on the two surfaces kid-land has: 1180 by 820 and 1024 by 768, both landscape.
// Every target is 48 CSS pixels or more each way, is touched where it is drawn in every state, lies clear of
// the jam's round home control at the top centre and of the grown-up's corner at the top right, and the things
// the game itself sets down do not lie over each other.

const SIZES = [{ width: 1180, height: 820 }, { width: 1024, height: 768 }] as const
/** The jam's home control: 48 pixels round, 10 from the top, in the middle. */
const HOME = { r: 24, top: 10 }

/** Worlds in every kind of state a thing can be in, each reached with taps. */
function states(): [string, World][] {
  const made: [string, World][] = [['every thing by the mat', new World()], ['a first visit of the youngest', new World(firstPlaces(true))]]
  const add = (name: string, world: World, settle = 6): void => { run(world, settle); made.push([name, world]) }
  const nest = mat({ 'arch-large': { x: 520, y: 590 }, 'arch-middle': { x: 520, y: 590, on: 'arch-large' }, 'arch-small': { x: 520, y: 590, on: 'arch-middle' }, silk: { x: 740, y: 600 } })
  add('a nest of three and the silk on the mat', nest)
  const cradle = mat({ 'arch-large': { x: 480, y: 600, turned: true }, 'arch-middle': { x: 480, y: 600, on: 'arch-large' }, 'doll-small': { x: 720, y: 600 } })
  add('a lid on a cradle', cradle)
  const sleeper = mat({ 'arch-large': { x: 480, y: 600, turned: true } }); putOn(sleeper, 'doll-round', 'arch-large'); add('a doll asleep in a cradle', sleeper)
  const tower = mat({ 'doll-round': { x: 590, y: 640 } }); putOn(tower, 'doll-tall', 'doll-round'); run(tower, 6); putOn(tower, 'doll-small', 'doll-tall'); add('a tower of three dolls', tower)
  const rider = mat({ horse: { x: 560, y: 600 } }); putOn(rider, 'doll-small', 'horse'); run(rider, 7); putOn(rider, 'arch-large', 'horse'); add('a rider and a ring on the horse', rider)
  const ghost = mat({ 'doll-tall': { x: 520, y: 600 }, 'doll-small': { x: 700, y: 580 } }); putOn(ghost, 'silk', 'doll-tall'); add('a ghost and a doll that ran', ghost)
  const collar = mat({ 'doll-round': { x: 560, y: 600 } }); putOn(collar, 'arch-large', 'doll-round'); add('a collar on a doll', collar)
  const carried = mat({ 'doll-round': { x: 520, y: 600 } }); putOn(carried, 'horse', 'doll-round'); add('the horse carried by a doll', carried)
  const hill = mat({ 'arch-large': { x: 560, y: 600 } }); putOn(hill, 'silk', 'arch-large'); add('a hill', hill)
  const inHand = mat({ 'doll-tall': { x: 560, y: 600 } }); take(inHand, 'doll-tall'); add('a thing in hand', inHand, 0.5)
  const full = new World()
  const spots: Record<PieceId, [number, number]> = { 'arch-large': [420, 520], 'arch-middle': [610, 500], 'arch-small': [780, 520], 'doll-tall': [400, 620], 'doll-round': [560, 630], 'doll-small': [700, 630], horse: [500, 570], silk: [690, 570] }
  for (const id of PIECE_IDS) { take(full, id); tap(full, ...spots[id]); run(full, 6) }
  made.push(['all eight on the mat', full])
  const basket = mat({}); take(basket, 'doll-tall'); tapBasket(basket); add('a doll in the basket', basket)
  const tipped = mat({ 'doll-tall': { x: 520, y: 590 }, horse: { x: 700, y: 600 } }); tapBasket(tipped); add('the basket on its side, full', tipped, 8)
  return made
}

describe.each(SIZES)('on a surface of $width by $height', (size) => {
  const by = fit(size.width, size.height)
  const px = (x: number, y: number): { x: number; y: number } => ({ x: x * by.scale + by.x, y: y * by.scale + by.y })
  const underHome = (x: number, y: number): boolean => { const at = px(x, y); return Math.hypot(at.x - size.width / 2, at.y - (HOME.top + HOME.r)) < HOME.r }
  const inCorner = (x: number, y: number): boolean => { const at = px(x, y); return at.x > size.width - GROWN_UP_CORNER && at.y < GROWN_UP_CORNER }

  it('touches every thing where it is drawn, in every state', () => {
    for (const [name, world] of states()) {
      for (const p of world.pieces) {
        if (p.at === 'basket') continue
        // Arches by the mat are one target, the outermost.
        if (p.at === 'home' && p.def.kind === 'arch' && world.pieces.find((each) => each.at === 'home' && each.def.kind === 'arch') !== p) continue
        const at = stand(world.pieces, p), high = p.def.kind === 'arch' ? (p.turned ? 12 : p.def.height - 12) : p.def.height * 0.5
        const got = world.hit(at.x, at.y - high)
        // What the finger gets is the thing drawn there, or one drawn over it on the same stack: never a thing behind.
        const front = got.kind === 'piece' ? got.piece : null
        expect(front, `${name}: ${p.def.id}`).not.toBeNull()
        if (front !== p) {
          const over = stand(world.pieces, front!)
          expect(world.pieces.indexOf(front!) >= 0 && Math.abs(over.x - at.x) < front!.def.halfWidth + 6 && over.y >= at.y - high, `${name}: a tap on ${p.def.id} took ${front!.def.id}`).toBe(true)
        }
      }
    }
  })

  it('gives every target 48 pixels or more each way, measured by what a touch takes, with an empty hand and with a thing in hand', () => {
    const least = 48 / by.scale
    // How far a touch still takes the thing, from its middle, each way along one line.
    const span = (world: World, id: PieceId, dx: number, dy: number): number => {
      const at = stand(world.pieces, world.piece(id)), mid = { x: at.x, y: at.y - PIECES[id].height / 2 }
      const takes = (k: number): boolean => { const got = world.hit(mid.x + dx * k, mid.y + dy * k); return got.kind === 'piece' && got.piece.def.id === id }
      let far = 0
      for (const way of [1, -1]) for (let k = way; Math.abs(k) < 400 && takes(k); k += way) far += 1
      return far + (takes(0) ? 1 : 0)
    }
    for (const id of PIECE_IDS) {
      expect(PIECES[id].halfWidth * 2, id).toBeGreaterThanOrEqual(least)
      for (const turned of PIECES[id].kind === 'arch' ? [false, true] : [false]) for (const inHand of [false, true]) {
        const world = mat({ [id]: { x: 590, y: 600, turned } })
        if (inHand) { take(world, id === 'doll-round' ? 'doll-tall' : 'doll-round'); run(world, 0.4) }
        const name = `${id}${turned ? ', on its back' : ''}${inHand ? ', with a thing in hand' : ''}`
        expect(span(world, id, 1, 0), `${name}: across`).toBeGreaterThanOrEqual(least)
        expect(span(world, id, 0, 1), `${name}: up and down`).toBeGreaterThanOrEqual(least)
      }
    }
    for (const box of [{ halfWidth: (BASKET_BOX.right - BASKET_BOX.left) / 2, height: BASKET_BOX.bottom - BASKET_BOX.top }, { halfWidth: LYING.r, height: LYING.r * 2 }, CAT]) {
      expect(box.halfWidth * 2).toBeGreaterThanOrEqual(least)
      expect(box.height).toBeGreaterThanOrEqual(least)
    }
    expect(Math.min(MAT.rx, MAT.ry) * 2).toBeGreaterThanOrEqual(least * 4)
  })

  it('touches the silk where the cloth is drawn: anywhere on a ghost, a hill or a hammock it is the cloth, and only what shows outside the cloth is the thing under it', () => {
    const got = (w: World, x: number, y: number): string => { const target = w.hit(x, y); return target.kind === 'piece' ? target.piece.def.id : target.kind }
    const over = (lower: PieceId, turned = false): World => { const w = mat({ [lower]: { x: 560, y: 610, turned } }); putOn(w, 'silk', lower); run(w, 8); return w }
    // A ghost: the cloth hangs from over the doll's head to its foot, and is the cloth all the way.
    for (const lower of ['doll-tall', 'doll-round', 'doll-small', 'horse'] as const) {
      const world = over(lower), at = stand(world.pieces, world.piece(lower)), def = PIECES[lower]
      for (const [up, across] of [[4, 1], [0.25 * def.height, 1], [0.5 * def.height, 1], [0.75 * def.height, 0.7], [def.height, 0]] as const) for (const side of [-1, 0, 1]) expect(got(world, at.x + side * across * def.halfWidth, at.y - up), `${lower} at ${side * across}, ${up}`).toBe('silk')
      // The cloth is a dome: beside its top, where no cloth is drawn, a finger is not on it.
      for (const side of [-1, 1]) expect(onShape(world.pieces, world.piece('silk'), at.x + side * (def.halfWidth + 10), at.y - def.height - 4), `${lower}: beside the top`).toBe(false)
      expect(onShape(world.pieces, world.piece('silk'), at.x, at.y - def.height), lower).toBe(true)
    }
    // The round doll's ghost shows nothing outside the cloth: a tap anywhere on it takes the cloth off, and the doll stays where it stands. A ghost is not carried.
    for (const [side, up] of [[0, 0.5], [-0.8, 0.2], [0.8, 0.2], [0, 0.95]] as const) {
      const round = over('doll-round'), at = stand(round.pieces, round.piece('doll-round')), def = PIECES['doll-round']
      round.press(at.x + side * def.halfWidth, at.y - up * def.height)
      round.tap()
      expect(round.hand?.id, `${side}, ${up}`).toBe('silk')
      expect(round.places()['doll-round']).toMatchObject({ at: 'mat', on: null })
    }
    // What shows outside the cloth is still the thing: the tip of the tall hat, the horse's ears.
    const tall = over('doll-tall'), hat = stand(tall.pieces, tall.piece('doll-tall'))
    expect(got(tall, hat.x + 14, hat.y - 238)).toBe('doll-tall')
    const ghostHorse = over('horse'), horse = ghostHorse.piece('horse'), head = stand(ghostHorse.pieces, horse)
    expect(got(ghostHorse, head.x + (horse.turned ? -60 : 60), head.y - 184)).toBe('horse')
    // A hill covers the whole arch, and a nest as its outermost arch.
    const hill = over('arch-large')
    for (const [dx, up] of [[0, 100], [-100, 20], [100, 20], [0, 40], [60, 80]] as const) expect(got(hill, 560 + dx, 610 - up)).toBe('silk')
    const nest = mat({ 'arch-large': { x: 560, y: 610 }, 'arch-small': { x: 560, y: 610, on: 'arch-large' } })
    putOn(nest, 'silk', 'arch-small'); run(nest, 8)
    expect(nest.places().silk.on).toBe('arch-small')
    for (const [dx, up] of [[0, 100], [-100, 20], [100, 20], [0, 30]] as const) expect(got(nest, 560 + dx, 610 - up)).toBe('silk')
    // Spread on the mat it is a pool, not a box: with a doll in hand, a tap in the empty corner of its box is the mat, and no ghost.
    const pond = mat({ silk: { x: 560, y: 610 } })
    take(pond, 'doll-tall'); run(pond, 0.4)
    expect(got(pond, 560, 610 - 42)).toBe('silk')
    for (const [dx, up] of [[-84, 94], [84, 94], [-86, 2], [86, 2]] as const) expect(got(pond, 560 + dx, 610 - up), `corner ${dx}, ${up}`).toBe('mat')
    // By the mat it lies in folds with one corner lifted: the lifted corner is the silk, and the empty corner across from it is not.
    const lying = new World(), home = PIECES.silk.home
    expect(got(lying, home.x + 80, home.y - 100)).toBe('silk')
    expect(got(lying, home.x - 86, home.y - 110)).not.toBe('silk')
    // A hammock is the cloth in the cradle's hollow, and the cradle's band under it is the cradle.
    const hammock = over('arch-large', true)
    expect(got(hammock, 560, 610 - 105 + 30)).toBe('silk')
    expect(got(hammock, 560, 610 - 8)).toBe('arch-large')
  })

  it('keeps every thing, in every state, clear of the home control and of the grown-up corner', () => {
    for (const [name, world] of states()) {
      for (const p of world.pieces) {
        // Its highest point as drawn: the tip of a hat, the ears.
        const at = stand(world.pieces, p), top = at.y - Math.max(topOf(p.def.id), MIN_TARGET)
        for (const x of [at.x - p.def.halfWidth, at.x, at.x + p.def.halfWidth]) {
          expect(underHome(x, top), `${name}: ${p.def.id} under the home control`).toBe(false)
          expect(inCorner(x, top), `${name}: ${p.def.id} in the corner`).toBe(false)
        }
        // No stack reaches above the line the model keeps free.
        if (p.at === 'mat') expect(at.y - topOf(p.def.id), `${name}: ${p.def.id}`).toBeGreaterThanOrEqual(TOP_LIMIT - 1)
      }
    }
    // The line itself is below the control on both surfaces, and the mat, the basket and the places by the mat are below the line.
    expect(px(0, TOP_LIMIT).y).toBeGreaterThan(HOME.top + HOME.r * 2)
    expect(HOME_CONTROL.y + HOME_CONTROL.r).toBeLessThan(TOP_LIMIT)
    for (const id of PIECE_IDS) expect(homePlaces()[id].y - PIECES[id].height, id).toBeGreaterThan(TOP_LIMIT)
    expect(MAT.y - MAT.ry).toBeGreaterThan(TOP_LIMIT)
    expect(BASKET.y - BASKET.height - 30).toBeGreaterThan(TOP_LIMIT)
  })

  it('sets down what a scene or an answer brings to rest clear of every other thing, by more than a sliver nowhere', () => {
    const cases: [string, World, (w: World) => void, PieceId[]][] = [
      ['a doll at the foot of the slide', mat({ 'arch-large': { x: 600, y: 600 }, 'doll-tall': { x: 420, y: 600 } }), (w) => putOn(w, 'doll-small', 'arch-large'), ['doll-small']],
      ['the horse at the mouth', mat({ 'arch-middle': { x: 640, y: 600 }, 'doll-tall': { x: 400, y: 640 } }), (w) => putOn(w, 'horse', 'arch-middle'), ['horse']],
      ['the horse on the far side', mat({ 'arch-small': { x: 520, y: 600 }, horse: { x: 380, y: 560 }, 'doll-small': { x: 380, y: 560, on: 'horse' } }), (w) => putOn(w, 'horse', 'arch-small'), ['horse']],
      ['dolls that ran and the ghost', mat({ 'doll-tall': { x: 560, y: 600 }, 'doll-small': { x: 680, y: 560 }, 'doll-round': { x: 440, y: 620 } }), (w) => putOn(w, 'silk', 'doll-tall'), ['doll-tall', 'doll-small', 'doll-round']],
      ['a doll that staggered off under the horse', mat({ 'doll-round': { x: 460, y: 600 }, 'doll-small': { x: 640, y: 610 } }), (w) => putOn(w, 'horse', 'doll-round'), ['doll-round']],
      ['a stack sent off the mat, set down on the mat instead', mat({ horse: { x: 480, y: 600 }, 'doll-small': { x: 480, y: 600, on: 'horse' }, 'doll-tall': { x: 330, y: 590 }, 'arch-middle': { x: 700, y: 560 } }), (w) => { take(w, 'horse'); tap(w, PIECES.horse.home.x, PIECES.horse.home.y - 60) }, ['horse']],
      ['an arch turned over at the nest', mat({ 'doll-round': { x: 345, y: 520 }, 'doll-small': { x: 420, y: 620 } }), (w) => { take(w, 'arch-large'); const at = stand(w.pieces, w.piece('arch-large')); tap(w, at.x, at.y - 90) }, ['arch-large']],
      ['an arch on its back put on a standing arch', mat({ 'arch-large': { x: 560, y: 600 }, 'arch-middle': { x: 330, y: 560, turned: true }, 'doll-tall': { x: 760, y: 610 } }), (w) => { take(w, 'arch-middle'); const at = stand(w.pieces, w.piece('arch-large')); tap(w, at.x, at.y - 90) }, ['arch-middle']],
      ['a doll tipped out of a cradle', mat({ 'arch-large': { x: 520, y: 600, turned: true }, 'doll-small': { x: 520, y: 600, on: 'arch-large' }, 'doll-tall': { x: 760, y: 640 } }), (w) => { take(w, 'arch-large'); const at = stand(w.pieces, w.piece('arch-large')); tap(w, at.x, at.y - 40) }, ['doll-small']],
    ]
    for (const [name, world, cause, moved] of cases) {
      cause(world)
      run(world, 8)
      const roots = world.pieces.filter((p) => p.at === 'mat' && p.on === null)
      for (const id of moved) {
        const p = world.piece(id)
        expect(p.on, `${name}: ${id}`).toBeNull()
        for (const q of roots) if (q !== p) expect(bodiesOverlap(world.bulk(p), p.x, p.y, world.bulk(q), q.x, q.y), `${name}: ${id} over ${q.def.id}`).toBe(false)
        // Nor over the basket, nor over a place by the mat.
        expect(p.x + p.def.halfWidth - SLIVER, `${name}: ${id} over the basket`).toBeLessThan(BASKET.x - BASKET.halfWidth)
        for (const home of PIECE_IDS.map((each) => PIECES[each])) expect(bodiesOverlap(world.bulk(p), p.x, p.y, home, home.home.x, home.home.y), `${name}: ${id} over the place of ${home.id}`).toBe(false)
        // And a tap on it gets it, or what it carries.
        const got = world.hit(p.x, p.y - p.def.height * 0.4)
        expect(got.kind === 'piece' && (got.piece === p || got.piece.x === p.x), `${name}: a tap on ${id}`).toBe(true)
      }
    }
  })

  it('never lets a lifted stack rise under the home control: in the hand it is held lower and sits closer together, as on the mat', () => {
    const tower = (): World => { const w = mat({ 'doll-round': { x: 590, y: 560 } }); putOn(w, 'doll-tall', 'doll-round'); run(w, 6); putOn(w, 'doll-small', 'doll-tall'); run(w, 6); return w }
    /** The highest point of every thing is clear of the control and of the line the model keeps free. */
    const clear = (world: World, when: string): void => {
      for (const p of world.pieces) {
        const at = stand(world.pieces, p), top = at.y - topOf(p.def.id)
        for (const x of [at.x - 30, at.x, at.x + 30]) expect(underHome(x, top), `${when}: ${p.def.id} under the home control`).toBe(false)
        if (p.at === 'mat') expect(top, `${when}: ${p.def.id}`).toBeGreaterThan(TOP_LIMIT - 1)
      }
    }
    // Lifted by a tap, right under the control.
    const tapped = tower()
    take(tapped, 'doll-round')
    for (let i = 0; i < 60; i++) { run(tapped, 1 / 60); clear(tapped, `lifted, frame ${i}`) }
    // The whole tower is still drawn, squeezed: nothing was left behind.
    expect(tapped.piece('doll-small').on).toBe('doll-tall')
    // Carried as high as a finger can go, to the very top of the stage and under the control.
    const carried = tower(), at = stand(carried.pieces, carried.piece('doll-round'))
    carried.press(at.x, at.y - 60)
    carried.dragStart()
    for (const y of [400, 250, 120, 40, 4]) {
      carried.dragMove(590, y)
      for (let i = 0; i < 20; i++) { run(carried, 1 / 60); clear(carried, `carried to ${y}, frame ${i}`) }
    }
    // A single tall thing too: the tip of its hat stays clear.
    const single = mat({ 'doll-tall': { x: 590, y: 560 } }), doll = stand(single.pieces, single.piece('doll-tall'))
    single.press(doll.x, doll.y - 60)
    single.dragStart()
    for (const y of [300, 120, 4]) {
      single.dragMove(590, y)
      for (let i = 0; i < 20; i++) { run(single, 1 / 60); clear(single, `one doll carried to ${y}, frame ${i}`) }
    }
  })

  it('takes a tap by shape: on a hat\'s tip, the bobble, the ears and the forelock it is the thing; in the corner of an arch\'s box it is not the arch', () => {
    const world = mat({ 'doll-tall': { x: 420, y: 600 }, 'doll-small': { x: 590, y: 640 }, horse: { x: 760, y: 610 } })
    const got = (w: World, x: number, y: number): string => { const target = w.hit(x, y); return target.kind === 'piece' ? target.piece.def.id : target.kind }
    // Each of these points is above the box the thing was touched by before, and on what is drawn.
    for (const [id, dx, up] of [['doll-tall', 14, 238], ['doll-tall', 0, 222], ['doll-small', 11, 176], ['doll-small', -20, 150], ['horse', 60, 186], ['horse', 40, 168], ['horse', 96, 140], ['horse', -88, 90]] as const) {
      const at = stand(world.pieces, world.piece(id))
      expect(up > PIECES[id].height || Math.abs(dx) > 0, id).toBe(true)
      expect(got(world, at.x + dx, at.y - up), `${id} at ${dx}, ${up}`).toBe(id)
    }
    // An arch is its band. In the corner of its box nothing of it is drawn: with a thing in hand that is the mat, and what stands there is touched there.
    const arch = mat({ 'arch-large': { x: 560, y: 600 }, 'doll-small': { x: 470, y: 520 } })
    expect(got(arch, 560 - 96, 600 - 98)).toBe('doll-small')
    expect(got(arch, 560 + 96, 600 - 98)).toBe('mat')
    expect(got(arch, 560, 600 - 90)).toBe('arch-large')
    // What shows through the arch is touched through it, and where nothing shows a finger in the hollow means the arch.
    const through = mat({ 'arch-large': { x: 560, y: 620 }, 'doll-small': { x: 560, y: 560 } })
    expect(got(through, 560, 620 - 40)).toBe('doll-small')
    expect(got(mat({ 'arch-large': { x: 560, y: 620 } }), 560, 620 - 40)).toBe('arch-large')
    // Of two things drawn at one point, the one in front is taken: the doll that stands before the arch's band.
    const front = mat({ 'arch-large': { x: 560, y: 590 }, 'doll-round': { x: 650, y: 640 } })
    expect(got(front, 650, 640 - 60)).toBe('doll-round')
    expect(got(front, 560 - 88, 590 - 20)).toBe('arch-large')
  })
})
