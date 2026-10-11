import { describe, expect, it } from 'vitest'
import { Farm } from './farm'
import { AT_TROUGH, BODY, BYSTANDER_REACH, CLOUDS, HELD_REACH, HENHOUSE, HENS, HOME, NEAR, RACK, ROOFTOP, SCATTER, SUN, THINGS, THING_REACH, VISIT, WALLOW_TARGET, doorTarget, henCircle, type Box, type Circle, type Point } from './layout'
import { goatRig, pigRig, ponyRig } from './motion'
import { STAGE, fit, toStage } from './stage'
import { freshState, type AnimalId, type GameState } from './state'

// Nothing passes through anything, and nothing the game brings to rest covers
// a target. A canvas game has no intersection audit, so this file is it: every
// place the game puts something down is held clear of every other target, at
// the size of the stills and at every other surface the jam may give it.

type Shape = { name: string; box?: Box; circle?: Circle }

const boxOf = (name: string, box: Box): Shape => ({ name, box })
const ring = (name: string, circle: Circle): Shape => ({ name, circle })

function touch(a: Shape, b: Shape): boolean {
  if (a.box && b.box) return a.box.x < b.box.x + b.box.w && b.box.x < a.box.x + a.box.w && a.box.y < b.box.y + b.box.h && b.box.y < a.box.y + a.box.h
  if (a.circle && b.circle) return Math.hypot(a.circle.x - b.circle.x, a.circle.y - b.circle.y) < a.circle.r + b.circle.r
  const box = (a.box ?? b.box)!, circle = (a.circle ?? b.circle)!
  const nx = Math.max(box.x, Math.min(circle.x, box.x + box.w)), ny = Math.max(box.y, Math.min(circle.y, box.y + box.h))
  return Math.hypot(circle.x - nx, circle.y - ny) < circle.r
}

/** Everything a touch can reach that is not a hen: the three large animals with what each is short of, the open door, the four things at home. */
function others(doorOpen = true): Shape[] {
  return [
    boxOf('pony', BODY.pony), boxOf('goat', BODY.goat), boxOf('pig', BODY.pig), boxOf('rack', RACK), boxOf('wallow', WALLOW_TARGET),
    boxOf('door', doorTarget(doorOpen ? 1 : 0)),
    ...THINGS.map((thing) => ring(thing, { ...HOME[thing], r: THING_REACH })),
  ]
}

const hensAt = (places: readonly Point[], what: string): Shape[] => places.map((place, i) => ring(`${what} hen ${HENS[i].id}`, henCircle(place, HENS[i].size)))

const open = (content: AnimalId[] = []): GameState => ({ ...freshState(null), door: 'open', content })
const play = (farm: Farm, seconds: number): void => { for (let t = 0; t < seconds; t += 1 / 60) farm.step(1 / 60) }
const tap = (farm: Farm, at: Point): void => { farm.press(at.x, at.y); farm.tap() }

describe('what the game brings to rest', () => {
  it('stands the hens that are out clear of the door, of every thing and of every other animal, in their patch and by the full trough', () => {
    for (const [what, places] of [['out', HENS.map((hen) => hen.home)], ['fed', AT_TROUGH], ['scattered', SCATTER]] as const) {
      for (const hen of hensAt(places, what)) for (const other of others()) expect(touch(hen, other), `${hen.name} and the ${other.name}`).toBe(false)
    }
  })

  it('sits the fed hens fluffed up by the full trough without one touching the next', () => {
    // A hen's card runs 90 units behind her feet and 66 in front, at her size; fed, she is fluffed up by an eighth.
    const fluffed = 1.125
    const span = (i: number): [number, number] => {
      const at = AT_TROUGH[i], size = HENS[i].size * fluffed
      const facesRight = at.x <= 324
      return facesRight ? [at.x - 90 * size, at.x + 66 * size] : [at.x - 66 * size, at.x + 90 * size]
    }
    for (let i = 0; i + 1 < HENS.length; i++) expect(span(i)[1], `${HENS[i].id} and ${HENS[i + 1].id}`).toBeLessThan(span(i + 1)[0])
  })

  it('has a hen that has crossed the yard peck beside the other animal and not on it, clear of every thing', () => {
    for (const animal of ['pony', 'goat', 'pig'] as const) {
      for (const hen of hensAt(VISIT[animal], `by the ${animal}`)) for (const other of others()) expect(touch(hen, other), `${hen.name} and the ${other.name}`).toBe(false)
    }
  })

  it('puts the hens where the model says: at rest and visiting, each is at the spot these tests hold clear', () => {
    const farm = new Farm(open(), 1)
    farm.hens.forEach((hen, i) => expect(hen).toMatchObject(HENS[i].home))
    const fed = new Farm(open(['hens']), 1)
    fed.hens.forEach((hen, i) => expect(hen).toMatchObject(AT_TROUGH[i]))
    // Walking between two spots, a hen is a hen wherever she is: a tap on her is hers and never the thing behind her.
    tap(farm, HOME.scoop)
    play(farm, 0.8)
    tap(farm, { x: BODY.pig.x + BODY.pig.w / 2, y: BODY.pig.y + BODY.pig.h / 2 })
    for (let t = 0; t < 6; t += 1 / 20) {
      play(farm, 1 / 20)
      farm.hens.forEach((hen, i) => {
        const circle = henCircle(hen, HENS[i].size)
        const target = farm.targetAt({ x: circle.x, y: circle.y })
        expect(target.kind === 'animal' && target.animal === 'hens', `hen ${i} at ${t.toFixed(2)}`).toBe(true)
      })
    }
  })

  it('lets a settled animal lie clear of the things and of its neighbours', () => {
    const rigs = { pony: ponyRig, goat: goatRig, pig: pigRig }
    for (const animal of ['pony', 'goat', 'pig'] as const) {
      let dx = 0, down = 0
      for (let t = 0; t < 30; t += 1 / 10) {
        const rig = rigs[animal](t, 1, null, 0, 1, false)
        dx = Math.max(dx, Math.abs(rig.dx))
        // The goat folds down onto its own legs and does not sink; the pig sinks into its mud.
        down = Math.max(down, animal === 'goat' ? 0 : rig.dy)
      }
      const body = BODY[animal]
      const settled = boxOf(`settled ${animal}`, { x: body.x - dx, y: body.y, w: body.w + dx * 2, h: body.h + down })
      const mine = animal === 'goat' ? ['goat', 'rack'] : animal === 'pig' ? ['pig', 'wallow'] : ['pony']
      for (const other of [...others(), ...hensAt(AT_TROUGH, 'fed')]) if (!mine.includes(other.name)) expect(touch(settled, other), `${settled.name} and the ${other.name}`).toBe(false)
      expect(body.y + body.h + down, animal).toBeLessThanOrEqual(STAGE.height)
    }
  })

  it('hangs a lifted thing over its own place only: it covers no hen, no animal, no door and no other thing, and a tap on it is its own', () => {
    for (const thing of THINGS) {
      const farm = new Farm(open(), 1)
      tap(farm, HOME[thing])
      play(farm, 2)
      const hand = farm.hand!
      expect(hand.mode).toBe('held')
      expect(hand.x).toBeCloseTo(HOME[thing].x, 3)
      expect(hand.y).toBeCloseTo(HOME[thing].y + NEAR.down, 3)
      const held = ring(`lifted ${thing}`, { x: hand.x, y: hand.y, r: HELD_REACH })
      const rest = [...others().filter((other) => other.name !== thing), ...hensAt(HENS.map((hen) => hen.home), 'out'), ...hensAt(AT_TROUGH, 'fed'), ...hensAt(SCATTER, 'scattered'), ...hensAt(VISIT.pony, 'by the pony'), ...hensAt(VISIT.goat, 'by the goat, at the wallow\'s rim,'), ...hensAt(VISIT.pig, 'by the pig, at the wallow\'s rim,')]
      for (const other of rest) expect(touch(held, other), `${held.name} and the ${other.name}`).toBe(false)
      expect(farm.targetAt({ x: hand.x, y: hand.y }).kind).toBe('hand')
      // It stays on the page: larger and nearer, and still above the bottom edge.
      expect(hand.y + HELD_REACH).toBeLessThanOrEqual(STAGE.height)
    }
  })

  it('answers a tap on the cat on the roof as the cat, and keeps the hatch its own', () => {
    const farm = new Farm(open(['hens', 'goat', 'pig']), 1)
    tap(farm, HOME.brush)
    play(farm, 0.8)
    tap(farm, { x: BODY.pony.x + BODY.pony.w / 2, y: BODY.pony.y + BODY.pony.h / 2 })
    play(farm, 12)
    expect(farm.cat).toBe(1)
    expect(farm.targetAt(ROOFTOP).kind).toBe('cat')
    expect(farm.targetAt({ x: HENHOUSE.hatch.x + 48, y: HENHOUSE.hatch.y + 40 }).kind).toBe('hatch')
    const cat = ring('cat', { ...ROOFTOP, r: BYSTANDER_REACH })
    for (const other of [...others(), boxOf('hatch', HENHOUSE.hatch), ...CLOUDS.map((cloud, i) => ring(`cloud ${i}`, { ...cloud, r: BYSTANDER_REACH })), ring('sun', { x: SUN.x, y: SUN.high, r: BYSTANDER_REACH })]) {
      expect(touch(cat, other), `the cat and the ${other.name}`).toBe(false)
    }
  })
})

describe('at every surface size', () => {
  // The size of the stills, tablets upright and on their side, and two phones on their side.
  const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [1366, 1024], [1194, 834], [820, 1180], [768, 1024], [667, 375], [844, 390], [1400, 700]]

  /** Every target and bystander where it rests, and what the game brings to rest. */
  function everything(): Shape[] {
    return [
      ...others(true), boxOf('door shut', doorTarget(0)),
      ...hensAt(HENS.map((hen) => hen.home), 'out'), ...hensAt(AT_TROUGH, 'fed'), ...hensAt(SCATTER, 'scattered'),
      ...(['pony', 'goat', 'pig'] as const).flatMap((animal) => hensAt(VISIT[animal], `by the ${animal}`)),
      ...THINGS.map((thing) => ring(`lifted ${thing}`, { x: HOME[thing].x, y: HOME[thing].y + NEAR.down, r: HELD_REACH })),
      boxOf('hatch', HENHOUSE.hatch),
      ring('sun low', { x: SUN.x, y: SUN.low, r: BYSTANDER_REACH }), ring('sun at the top of its slot', { x: SUN.x, y: SUN.high, r: BYSTANDER_REACH }),
      ...CLOUDS.map((cloud, i) => ring(`cloud ${i}`, { ...cloud, r: BYSTANDER_REACH })),
      ring('cat on the roof', { ...ROOFTOP, r: BYSTANDER_REACH }),
    ]
  }

  it('keeps all of it out from under the home control and out of the grown-up corner', () => {
    for (const [width, height] of SURFACES) {
      const by = fit(width, height)
      // The home control: 48 px round, 10 px from the top, at the top centre, with a finger's margin round it.
      const centre = toStage({ x: width / 2, y: 34 }, by)
      const control = ring('home control', { x: centre.x, y: centre.y, r: (24 + 8) / by.scale })
      // The grown-up corner: 72 px square at the top right of the surface.
      const from = toStage({ x: width - 72, y: 0 }, by), to = toStage({ x: width, y: 72 }, by)
      const corner = boxOf('grown-up corner', { x: from.x, y: from.y, w: to.x - from.x, h: to.y - from.y })
      for (const shape of everything()) {
        expect(touch(shape, control), `${shape.name} under the home control at ${width} by ${height}`).toBe(false)
        expect(touch(shape, corner), `${shape.name} in the grown-up corner at ${width} by ${height}`).toBe(false)
      }
    }
  })

  it('keeps every target on the page, whole, at every size: the stage is fitted whole into the surface', () => {
    for (const [width, height] of SURFACES) {
      const by = fit(width, height)
      expect(by.x).toBeGreaterThanOrEqual(0)
      expect(by.y).toBeGreaterThanOrEqual(0)
      expect(STAGE.width * by.scale + by.x).toBeLessThanOrEqual(width + 1e-6)
      expect(STAGE.height * by.scale + by.y).toBeLessThanOrEqual(height + 1e-6)
    }
    for (const shape of everything()) {
      const box = shape.box ?? { x: shape.circle!.x - shape.circle!.r, y: shape.circle!.y - shape.circle!.r, w: shape.circle!.r * 2, h: shape.circle!.r * 2 }
      expect(box.x + box.w / 2, shape.name).toBeGreaterThan(0)
      expect(box.x + box.w / 2, shape.name).toBeLessThan(STAGE.width)
      expect(box.y + box.h / 2, shape.name).toBeGreaterThan(0)
      expect(box.y + box.h / 2, shape.name).toBeLessThan(STAGE.height)
    }
  })
})
