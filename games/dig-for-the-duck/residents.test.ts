import { describe, expect, it } from 'vitest'
import { BOOT_COUNT, GARMENTS, SHIRT, TEMPO, WORM_SEGMENTS, badgerPose, duckPose, gazeAt, molePose, wormPose, type Now } from './residents'
import { ANSWER_NAMES, SCENE_NAMES, partsAt, type AnswerName, type Parts, type SceneName } from './timeline'

// Every resident moves like itself: its own tempo, its own part that moves
// first, its own answer to a tap. And every number a pose gives is finite at
// every moment, since the view turns each one into a place or an angle.

const never = Object.fromEntries(ANSWER_NAMES.map((name) => [name, Infinity])) as Record<AnswerName, number>
const at = (time: number, since: Partial<Record<AnswerName, number>> = {}, value = 0): Now => ({
  time, since: { ...never, ...since }, scenes: Object.fromEntries(SCENE_NAMES.map((name) => [name, partsAt(name, value)])) as Record<SceneName, Parts>,
})
const numbers = (pose: object): number[] => Object.values(pose).flat() as number[]

describe('the residents', () => {
  it('no two share a tempo', () => {
    expect(new Set(Object.values(TEMPO)).size).toBe(4)
  })

  it('every number of every pose is finite: at rest, in the middle of every scene, at its end, and in the middle of every answer', () => {
    const middle = Object.fromEntries(ANSWER_NAMES.map((name) => [name, 0.2])) as Record<AnswerName, number>
    for (const now of [at(0), at(3.3), at(977.7), at(5, {}, 0.5), at(5, {}, 1), at(7.7, middle), at(7.7, middle, 0.5)]) {
      for (const pose of [duckPose(now, false, false), duckPose(now, true, true), molePose(now, 0), molePose(now, 0.4), wormPose(now, 0, false), wormPose(now, 0.5, true), badgerPose(now)]) {
        for (const value of numbers(pose)) expect(Number.isFinite(value)).toBe(true)
      }
    }
  })

  it('all four are alive with no touch: each pose changes from one moment to the next', () => {
    const poses = (time: number): string[] => [duckPose(at(time), false, false), molePose(at(time), 0), wormPose(at(time), 0, false), badgerPose(at(time))].map((pose) => JSON.stringify(pose))
    const a = poses(1.0), b = poses(1.4)
    for (let i = 0; i < 4; i++) expect(a[i]).not.toBe(b[i])
  })

  it('the duck snaps its head from one lean to the next and floats only when afloat', () => {
    const tilts = new Set<number>()
    for (let beat = 0; beat < 5; beat++) tilts.add(Math.round(duckPose(at(beat * TEMPO.duck + 0.5), false, false).tilt * 100))
    expect(tilts.size).toBeGreaterThanOrEqual(4)
    expect(duckPose(at(3.1), false, false).bob).toBe(0)
    expect(duckPose(at(3.1), true, false).bob).not.toBe(0)
    expect(duckPose(at(3.1), true, true).sunk).toBeGreaterThan(0.5)
    expect(duckPose(at(3.1), false, true).sunk).toBe(0)
  })

  it('the worm leans as a wave from tail to head, has as many boots to fill as stand in the row, and goes wide-eyed at water', () => {
    const pose = wormPose(at(2.2), 0, false)
    expect(pose.lean.length).toBe(WORM_SEGMENTS)
    expect(new Set(pose.lean.map((lean) => Math.round(lean * 100))).size).toBe(WORM_SEGMENTS)
    expect(pose.filled.length).toBe(BOOT_COUNT)
    expect(wormPose(at(2.2), 0.3, false).wide).toBeGreaterThan(pose.wide)
    // It stops polishing once it wears its boots.
    const worn = wormPose(at(0.6, {}, 1), 0, false)
    expect(worn.worn).toBe(3)
    expect(worn.polish).toBe(0)
    expect(worn.squelch).toBeGreaterThanOrEqual(0)
  })

  it('the badger has a piece of washing for each peg, and each sags only once the rain has reached it', () => {
    const dry = badgerPose(at(4)), rained = badgerPose(at(4, {}, 1))
    expect(dry.swing.length).toBe(GARMENTS)
    expect(dry.sag).toEqual([0, 0, 0, 0])
    expect(rained.sag).toEqual([1, 1, 1, 1])
    expect(rained.umbrella).toBe(1)
    // Rained on and left alone, she is back at her place with every piece wrung.
    expect([rained.back, ...rained.along, ...rained.wring]).toEqual([1, 1, 1, 1, 1, 0, 0, 0, 0])
    // A tap makes her snap the peg, and the shirt flaps.
    const snapped = badgerPose(at(4, { badgerSnap: 0.05 }))
    expect(snapped.snap).toBeGreaterThan(0)
    expect(snapped.swing[SHIRT]).not.toBe(dry.swing[SHIRT])
  })

  it('the mole lifts his feet off a wet floor, looks over his glasses only at what he has just poured, and turns half round as the chair floats', () => {
    expect(molePose(at(4), 0.2).feet).toBeGreaterThan(0.9)
    expect(molePose(at(4), 0).peer).toBe(0)
    const pouring: Now = at(4)
    pouring.scenes.showClay = { ...pouring.scenes.showClay, peerAt: 0.5 }
    expect(molePose(pouring, 0).peer).toBe(1)
    const afloat = molePose(at(4, {}, 1), 0)
    // With both of his scenes at their end he has been set down again.
    expect(afloat.float).toBe(0)
    const up: Now = at(4)
    up.scenes.moleAfloat = partsAt('moleAfloat', 1)
    expect(molePose(up, 0)).toMatchObject({ float: 1, turn: -1, slippers: 1, shade: 1 })
  })

  it('a gaze follows the finger and rests when there is none', () => {
    expect(gazeAt(100, 100, null, { x: 0.3, y: 0.2 })).toEqual({ x: 0.3, y: 0.2 })
    const gaze = gazeAt(100, 100, { x: 400, y: 100 }, { x: 0, y: 0 })
    expect(gaze.x).toBeCloseTo(1)
    expect(gaze.y).toBeCloseTo(0)
    expect(gazeAt(100, 100, { x: 100, y: 100 }, { x: 1, y: 1 })).toEqual({ x: 0, y: 0 })
  })
})
