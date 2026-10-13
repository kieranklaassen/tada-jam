import { describe, expect, it } from 'vitest'
import { COVERS, MANNERS, STONE_SCALE, coverPose, helloPose, settle } from './motion'
import { hedgehogPose, jayPose, toadPose } from './poses'
import { HEDGEHOG, JAY, TOAD_HOME, TOAD_RISE } from './layout'
import { press } from './rules'
import { freshWorld } from './save'
import { step } from './step'
import { IDLE, createToy } from './toy'
import { PLACES, type FindId } from './wood'

// Every character moves like itself. Nothing here shares a motion: each
// cover has its own time and its own curve, each find its own act, and each
// animal its own tempo and its own small things at idle.

const SHARES = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85]

describe('motion personality', () => {
  it('gives each cover its own time and its own way of getting there', () => {
    const ways = PLACES.map((place) => SHARES.map((u) => COVERS[place].curve(u, true).toFixed(3)).join(' '))
    expect(new Set(ways).size).toBe(PLACES.length)
    const times = PLACES.map((place) => `${COVERS[place].open}/${COVERS[place].shut}/${COVERS[place].settles}`)
    expect(new Set(times).size).toBe(PLACES.length)
    for (const place of PLACES) {
      expect(COVERS[place].curve(0, true)).toBeCloseTo(0, 6)
      expect(COVERS[place].curve(1, true)).toBeCloseTo(1, 6)
      expect(COVERS[place].curve(1, false)).toBeCloseTo(1, 6)
    }
    // The stone is the slowest thing to shift and the branch flap the quickest.
    expect(COVERS.stone.open).toBeGreaterThan(COVERS.branch.open)
    // The light ones spring past where they stop; the stone never does.
    expect(Math.max(...[0.3, 0.4, 0.5, 0.6].map((u) => COVERS.grass.curve(u, true)))).toBeGreaterThan(1)
    for (let u = 0; u <= 1; u += 0.05) expect(COVERS.stone.curve(u, true)).toBeLessThanOrEqual(1)
  })

  it('moves each cover from where it rests shut to somewhere else, and squashes only the stone on landing', () => {
    for (const place of PLACES) {
      const shut = coverPose(place, 0, 0, 99), open = coverPose(place, 1, 0, 99)
      expect(Math.abs(open.x - shut.x) + Math.abs(open.y - shut.y) + Math.abs(open.turn - shut.turn), place).toBeGreaterThan(0.3)
      for (const value of Object.values(coverPose(place, 0.5, 0.5, 0.05))) expect(Number.isFinite(value), place).toBe(true)
    }
    expect(coverPose('stone', 1, 0, 0.05).sy).toBeLessThan(STONE_SCALE)
    expect(coverPose('stone', 1, 0, 99).sy).toBeCloseTo(STONE_SCALE, 6)
  })

  it('gives each find an act of its own that begins and ends at rest', () => {
    const finds = Object.keys(MANNERS) as FindId[]
    const acts = finds.map((find) => SHARES.map((u) => Object.values(MANNERS[find].pose(u)).map((value) => value.toFixed(2)).join(',')).join(' '))
    expect(new Set(acts).size).toBe(finds.length)
    for (const find of finds) {
      for (const u of [0, 1]) {
        const pose = MANNERS[find].pose(u)
        expect(Math.abs(pose.dx) + Math.abs(pose.dy), `${find} at ${u}`).toBeLessThan(0.5)
        expect(Math.abs(Math.sin(pose.turn)), `${find} at ${u}`).toBeLessThan(0.01)
        expect(Math.abs(pose.sx), `${find} at ${u}`).toBeCloseTo(1, 1)
        expect(pose.sy, `${find} at ${u}`).toBeCloseTo(1, 1)
      }
      expect(MANNERS[find].length).toBeGreaterThanOrEqual(0.6)
      expect(MANNERS[find].length).toBeLessThanOrEqual(1.3)
    }
    expect(helloPose(1).sx).toBeCloseTo(1, 6)
    expect(helloPose(0).sx).toBeLessThan(0.7)
  })

  it('gives each animal its own tempo and its own small things', () => {
    const names = Object.values(IDLE).flatMap((idle) => idle.variants.map((variant) => variant.name))
    expect(new Set(names).size).toBe(names.length)
    for (const idle of Object.values(IDLE)) expect(idle.variants.length).toBeGreaterThanOrEqual(3)
    // Quick hedgehog, stepped jay, slow toad.
    expect(IDLE.hedgehog.gap[1]).toBeLessThan(IDLE.jay.gap[1])
    expect(IDLE.jay.gap[1]).toBeLessThan(IDLE.toad.gap[1])
    expect(IDLE.hedgehog.gap[0]).toBeLessThan(IDLE.jay.gap[0])
    expect(IDLE.jay.gap[0]).toBeLessThan(IDLE.toad.gap[0])
  })

  it('answers a touch on each animal with a pose that differs from its rest, at once and for a while', () => {
    const still = createToy({ ...freshWorld(null), finished: false }, 1)
    const poked = createToy({ ...freshWorld(null), finished: false }, 1)
    for (const at of [HEDGEHOG, JAY, { x: TOAD_HOME.x, y: TOAD_HOME.y - TOAD_RISE }]) press(poked, at)
    for (const toy of [still, poked]) step(toy, 0.2)
    expect(JSON.stringify(hedgehogPose(poked))).not.toBe(JSON.stringify(hedgehogPose(still)))
    expect(JSON.stringify(jayPose(poked))).not.toBe(JSON.stringify(jayPose(still)))
    expect(JSON.stringify(toadPose(poked))).not.toBe(JSON.stringify(toadPose(still)))
    // The toad's answer is the longest and the hedgehog's the quickest.
    expect(poked.acts.toad!.length).toBeGreaterThan(poked.acts.jay!.length)
    expect(poked.acts.jay!.length).toBeGreaterThan(poked.acts.hedgehog!.length)
  })

  it('settles: a spring ends where it is going', () => {
    expect(settle(0, 2, 4)).toBeCloseTo(0, 6)
    expect(settle(1, 2, 4)).toBeCloseTo(1, 6)
  })
})
