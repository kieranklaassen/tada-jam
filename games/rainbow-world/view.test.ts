import { beforeAll, describe, expect, it } from 'vitest'
import { mat, put, putOn, run, take } from './drive'
import { LYING } from './basket'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO, IdleLadder, MAX_DEMOS, type Guidance } from './guidance'
import { useCanvases } from './paper'
import type { PieceId } from './pieces'
import { Recording, recordingCanvases } from './recording'
import type { Piece } from './thing'
import { RainbowView } from './view'
import { World } from './world'

// The view reads what the model computes. Held here: every pose value changes the picture, a thing that
// stands in front of another dims it, the silk is drawn as what it is in each place, and the idle hand shows a
// different thing each time it comes back and nothing while a scene plays.

const W = 1180, H = 820
let surface: Recording
let view: RainbowView

beforeAll(() => {
  useCanvases(recordingCanvases().make)
  surface = new Recording(W, H)
  view = new RainbowView({ getContext: () => surface.ctx } as unknown as HTMLCanvasElement, 1)
  view.setTier({ dpr: 1, motes: 0 })
  view.resize(W, H, 1)
})

function drawn(world: World, guidance: Guidance | null = null): { log: string; stamps: number } {
  surface.reset()
  const cost = view.draw(world, guidance)
  return { log: surface.log.join('\n'), stamps: cost.stamps }
}

describe('the view reads the model', () => {
  it('shows every pose value: each one changes the picture of the thing it belongs to', () => {
    const poses: [PieceId, keyof Pick<Piece, 'tilt' | 'duck' | 'shut' | 'mood' | 'way' | 'spin' | 'lift' | 'hop' | 'squash'>, number][] = [
      ['doll-tall', 'tilt', 0.3], ['doll-tall', 'duck', 0.6], ['doll-tall', 'shut', 1], ['doll-tall', 'mood', 1], ['doll-tall', 'mood', -1], ['doll-tall', 'way', -1],
      ['doll-tall', 'lift', 30], ['doll-tall', 'hop', 20], ['doll-tall', 'squash', 0.3],
      ['horse', 'tilt', 0.3], ['horse', 'duck', 0.6], ['horse', 'shut', 1], ['horse', 'mood', 1], ['horse', 'mood', -1], ['horse', 'way', -1], ['horse', 'hop', 20],
      ['arch-large', 'tilt', 0.3], ['arch-large', 'spin', 1], ['arch-large', 'lift', 30], ['arch-large', 'squash', 0.3],
      ['silk', 'tilt', 0.3], ['silk', 'lift', 30],
    ]
    for (const [id, field, value] of poses) {
      const world = mat({ [id]: { x: 560, y: 600 } })
      const before = drawn(world).log
      ;(world.piece(id) as Record<string, unknown>)[field] = value
      expect(drawn(world).log === before, `${id}.${field}`).toBe(false)
    }
  })

  it('leans whatever rests on a thing with it, so a rider is drawn and touched on its seat', () => {
    const world = mat({ 'doll-round': { x: 560, y: 600 }, 'doll-small': { x: 560, y: 600, on: 'doll-round' } })
    const before = drawn(world).log
    world.piece('doll-round').tilt = 0.4
    const leaning = drawn(world).log
    expect(leaning === before).toBe(false)
    // The picture and the touch use the same place: a tap where the rider is now drawn takes the rider.
    const rider = world.piece('doll-small')
    const up = 0.8 * world.piece('doll-round').def.height + rider.def.height * 0.5
    const got = world.hit(560 + up * Math.sin(0.4), 600 - up * Math.cos(0.4))
    expect(got.kind === 'piece' && got.piece === rider).toBe(true)
  })

  it('lays a pale veil under a thing that stands in front of another, and none where they stand apart', () => {
    const apart = drawn(mat({ 'doll-tall': { x: 400, y: 600 }, 'doll-round': { x: 720, y: 600 } })).stamps
    const behind = drawn(mat({ 'doll-tall': { x: 520, y: 560 }, 'doll-round': { x: 560, y: 620 } })).stamps
    expect(behind - apart).toBe(1)
  })

  it('draws the silk as what it is in each place: lying in folds by the mat, spread on the mat, a hill, a hammock, a ghost', () => {
    const pictures = [
      drawn(mat({ 'arch-large': { x: 560, y: 600 } })).log,
      drawn(mat({ 'arch-large': { x: 560, y: 600 }, silk: { x: 760, y: 600 } })).log,
      drawn(mat({ 'arch-large': { x: 560, y: 600 }, silk: { x: 560, y: 600, on: 'arch-large' } })).log,
      drawn(mat({ 'arch-large': { x: 560, y: 600, turned: true }, silk: { x: 560, y: 600, on: 'arch-large' } })).log,
    ]
    expect(new Set(pictures).size).toBe(pictures.length)
    // The hammock hangs: it is the one drawn upside down, with a negative stretch up and down.
    const flipped = (log: string): boolean => log.split('\n').some((line) => line.startsWith('scale(') && Number(line.slice(6).split(',')[1].replace(')', '')) < 0)
    expect(flipped(pictures[3])).toBe(true)
    expect(flipped(pictures[2])).toBe(false)
  })

  it('shows a different thing each time the idle hand comes back, and shows each of them once', () => {
    const world = mat({ 'doll-small': { x: 700, y: 580 } }), ladder = new IdleLadder(0)
    const hands: string[] = []
    let last = -1
    for (let t = 0; t < 400; t += 0.25) {
      const guidance = ladder.update(t)
      if (guidance.demo === null || guidance.demoIndex === last) continue
      last = guidance.demoIndex
      // The hand is the last sprite stamped in the frame.
      const mid = ladder.update(t + DEMO_SECONDS * 0.4), frame = drawn(world, mid)
      const translates = frame.log.split('\n').filter((line) => line.startsWith('translate('))
      hands.push(translates[translates.length - 1])
    }
    expect(hands.length).toBe(MAX_DEMOS)
    expect(new Set(hands).size).toBe(MAX_DEMOS)
    // After the last showing the ladder is quiet for good: no glow and no hand, however long the child waits.
    const late = ladder.update(4000)
    expect([late.glow, late.demo]).toEqual([0, null])
  })

  it('shows no glow and no hand while a scene plays', () => {
    const world = mat({ 'arch-large': { x: 560, y: 600 } }), ladder = new IdleLadder(0)
    const idle = ladder.update(IDLE_BEFORE_DEMO + 1)
    const quiet = drawn(world, null).stamps
    expect(drawn(world, idle).stamps).toBeGreaterThan(quiet)
    putOn(world, 'doll-small', 'arch-large')
    run(world, 1)
    expect(world.scene).not.toBeNull()
    expect(drawn(world, idle).stamps).toBe(drawn(world, null).stamps)
  })

  it('draws a thing in hand over everything, and what is in the basket with the basket', () => {
    const world = mat({ 'doll-tall': { x: 560, y: 600 } })
    const before = drawn(world)
    take(world, 'doll-round')
    run(world, 0.3)
    expect(drawn(world).log === before.log).toBe(false)
    // A doll in the basket looks out of it on its own veil, between the basket's back and its front: one stamp more than with the doll by the mat.
    const basket = new World({ ...mat({}).places(), 'doll-small': { at: 'basket', x: 0, y: 0, on: null, turned: false } })
    expect(drawn(basket).stamps).toBe(drawn(mat({})).stamps + 1)
    basket.tip = 1
    expect(drawn(basket).log === drawn(mat({})).log).toBe(false)
  })

  it('draws nothing of a thing that is in the basket and does not look out, and what looks out inside one window', () => {
    const inBasket = (ids: PieceId[], tipped: boolean): World => {
      const places = mat({}).places()
      for (const id of ids) places[id] = { at: 'basket', x: 0, y: 0, on: null, turned: false }
      return new World(places, tipped ? 'tipped' : 'upright')
    }
    for (const tipped of [false, true]) {
      const empty = drawn(inBasket([], tipped)), hidden = drawn(inBasket(['arch-large', 'arch-middle', 'arch-small', 'silk'], tipped))
      // The arches and the silk are in the basket and out of sight: the picture has four things fewer and no window.
      expect(hidden.stamps, `tipped ${tipped}`).toBe(empty.stamps - 4)
      expect(surface.count('clip')).toBe(0)
      // The horse and three dolls are in it: three of them look out, each on its veil, and the fourth is not drawn.
      const full = drawn(inBasket(['doll-tall', 'doll-round', 'doll-small', 'horse'], tipped))
      expect(full.stamps, `tipped ${tipped}`).toBe(empty.stamps - 8 + 9)
      expect(surface.count('clip')).toBe(1)
    }
    // The basket on its side is one stamp, upright two: its back, and its front over what is in it.
    expect(drawn(inBasket([], false)).stamps).toBe(drawn(inBasket([], true)).stamps + 1)
  })

  it('lights the two things the hand will show when nothing lies by the mat, and gives the lying basket under the finger on the frame of the tap', () => {
    const spots: [PieceId, number, number][] = [['arch-large', 420, 520], ['arch-middle', 600, 500], ['arch-small', 760, 520], ['doll-tall', 380, 600], ['doll-round', 520, 620], ['doll-small', 660, 630], ['horse', 800, 610], ['silk', 590, 570]]
    const full = mat(Object.fromEntries(spots.map(([id, x, y]) => [id, { x, y }])))
    // The light alone, without the hand.
    const idle: Guidance = { ...new IdleLadder(0).update(IDLE_BEFORE_DEMO + 1), demo: null }
    expect(idle.glow).toBeGreaterThan(0)
    expect(drawn(full, idle).stamps).toBe(drawn(full, null).stamps + 2)
    // One thing by the mat: the light is round that one alone, as before.
    const seven = mat(Object.fromEntries(spots.slice(0, 7).map(([id, x, y]) => [id, { x, y }])))
    expect(drawn(seven, idle).stamps).toBe(drawn(seven, null).stamps + 1)
    // The lying basket with no head in it: the picture of the basket changes on the frame of the tap, before any time has passed.
    const lying = mat({ horse: { x: 500, y: 600 } }, 'tipped')
    run(lying, 3)
    // What follows the basket's place in the picture: its stamp at rest, a squeeze while it gives.
    const mouth = (): string => { const lines = drawn(lying).log.split('\n'); return lines[lines.indexOf(`translate(${LYING.x.toFixed(3)},${LYING.y.toFixed(3)})`) + 1].split('(')[0] }
    expect(mouth()).toBe('drawImage')
    lying.press(LYING.x, LYING.y)
    lying.tap()
    expect(mouth()).toBe('scale')
  })

  it('shows the silk turned at its place as the sound says: it gathers into a heap, and turned again it falls open', () => {
    const world = mat({ 'doll-small': { x: 700, y: 580 } }), silk = world.piece('silk')
    run(world, 1)
    const open = drawn(world)
    silk.turned = true
    silk.turnAt = world.time
    run(world, 0.06)
    // On the way both are in the picture, the folds fading and the heap coming: one stamp more.
    const between = drawn(world)
    expect(between.stamps).toBe(open.stamps + 1)
    run(world, 2)
    const heaped = drawn(world)
    expect(heaped.stamps).toBe(open.stamps)
    expect(heaped.log === open.log).toBe(false)
    silk.turned = false
    silk.turnAt = world.time
    run(world, 2)
    expect(drawn(world).stamps).toBe(open.stamps)
    expect(drawn(world).log === heaped.log).toBe(false)
  })

  it('ripples the silk on the mat at every landing, the bump at the foot of the slide among them', () => {
    const world = mat({ 'arch-large': { x: 520, y: 590 }, silk: { x: 860, y: 600 } })
    putOn(world, 'doll-small', 'arch-large')
    world.takeSounds()
    let bumped = false
    for (let i = 0; i < 1200 && !bumped; i++) bumped = run(world, 1 / 60).some((sound) => sound.name === 'bump')
    expect(bumped).toBe(true)
    expect(world.time - world.landedAt).toBeLessThan(0.02)
    run(world, 0.1)
    const stirred = drawn(world).log, was = world.landedAt
    world.landedAt = -Infinity
    expect(drawn(world).log === stirred).toBe(false)
    world.landedAt = was
    // And a thing set down by hand: the silk is still again, and stirs at the knock.
    run(world, 3)
    world.landedAt = -Infinity
    put(world, 'doll-round', 680, 640)
    let knocked = false
    for (let i = 0; i < 240 && !knocked; i++) knocked = run(world, 1 / 60).some((sound) => sound.name === 'knock')
    expect(knocked).toBe(true)
    expect(world.time - world.landedAt).toBeLessThan(0.02)
  })

  it('shows a tap on the sill: a ring on the wood, and the cat\'s tail flicks', () => {
    const world = mat({})
    run(world, 1)
    world.press(900, 760)
    world.tap()
    run(world, 0.1)
    const shown = drawn(world), at = world.sillAt, rings = world.tinks
    // Without the cat being told, the picture is another one; and without the ring, it has one stroke less.
    world.sillAt = -Infinity
    expect(drawn(world).log === shown.log).toBe(false)
    world.sillAt = at
    world.tinks = []
    surface.reset()
    const bare = view.draw(world, null).pen
    world.tinks = rings
    surface.reset()
    expect(view.draw(world, null).pen).toBeGreaterThan(bare)
  })
})
