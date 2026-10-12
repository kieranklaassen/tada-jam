import { describe, expect, it } from 'vitest'
import { BEACHES } from './beaches'
import { deltaAt, tower } from './field'
import { deserializeKingdom, serializeKingdom } from './kingdom'
import { Play } from './play'
import { JOURNEY_SECONDS } from './sun'
import { TAKEN, bucketPatch, isClear, patchesOf } from './things'

// Found as left: put away at any instant and opened again, the beach is the
// beach, nothing is in a hand or in the air, and nothing plays that the child
// did not ask for.

const DT = 1 / 60
const fresh = (age: number | null = 7): Play => new Play(deserializeKingdom(null, age), 1)
const steps = (play: Play, seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) play.step(DT)
}
const saved = (play: Play) => JSON.parse(JSON.stringify(serializeKingdom(play.toState())))
const reopened = (play: Play, age: number | null = 7): Play => new Play(deserializeKingdom(saved(play), age), 9)
/** Nothing in the air, nothing sounding, no scene, nothing in a hand. */
function quiet(play: Play): void {
  expect(play.playing).toBe(false)
  expect(play.heard).toEqual([])
  expect(play.voices).toEqual([])
  expect(play.grains).toEqual([])
  expect(play.rings).toEqual([])
  expect(play.finger).toBeNull()
  expect(play.poses.bucket.fly).toBeNull()
  expect(play.poses.shells.every((pose) => pose.fly === null)).toBe(true)
  expect(play.hat).toBe(-1)
}

describe('put away with something in the hand', () => {
  it('the bucket half way through a drag is found where it was taken from, with the furrow it had dug', () => {
    const play = fresh()
    const from = { x: play.things.bucket.x, z: play.things.bucket.z }
    // The wood it would knock against is out of its way.
    Object.assign(play.things.wood[1], { x: -2.6, z: 2.4 })
    play.press({ kind: 'bucket' })
    play.dragStart()
    for (let i = 1; i <= 20; i++) {
      play.drag(from.x - i * 0.04, from.z - i * 0.03, 0)
      play.step(DT)
    }
    expect(play.things.bucket.x).toBeLessThan(from.x - 0.5)
    const again = reopened(play)
    quiet(again)
    expect(again.things.bucket.x).toBeCloseTo(from.x, 5)
    expect(again.things.bucket.z).toBeCloseTo(from.z, 5)
    expect(deltaAt(again.field, from.x - 0.4, from.z - 0.3)).toBeLessThan(-0.1)
    // The touch taken away puts it back in this visit too.
    play.cancel()
    expect(play.things.bucket.x).toBeCloseTo(from.x, 5)
  })

  it('a shell and a piece of wood half way through a drag are found where they were taken from', () => {
    const play = fresh()
    const shell = { ...play.things.shells[1] }, piece = { ...play.things.wood[0] }
    play.press({ kind: 'shell', index: 1 })
    play.dragStart()
    play.drag(shell.x + 1, shell.z - 2, 0)
    let again = reopened(play)
    quiet(again)
    expect(again.things.shells[1]).toMatchObject({ x: shell.x, z: shell.z, state: 'lying' })
    play.release()
    play.press({ kind: 'wood', index: 0 })
    play.dragStart()
    play.drag(piece.x + 1.5, piece.z - 2.5, 0)
    again = reopened(play)
    quiet(again)
    expect(again.things.wood[0]).toEqual(piece)
  })

  it('a shell drag that is cancelled keeps nothing: the shell is where it was, the way up it was, pressed in or in the side of its tower as it was', () => {
    for (const state of ['lying', 'pressed', 'tower'] as const) for (const up of [true, false]) {
      const play = fresh()
      Object.assign(play.things.shells[1], { up, state })
      // A shell in a tower sits in the side of one: the tower it is in stands behind it.
      if (state === 'tower') tower(play.field, play.things.shells[1].x, play.things.shells[1].z - 0.5, 0, 1)
      const shell = { ...play.things.shells[1] }
      steps(play, 0.2)
      // The press turns over a shell that was pressed in or in a tower, and pops it out; then the finger drags it.
      play.press({ kind: 'shell', index: 1 })
      play.dragStart()
      for (let i = 1; i <= 12; i++) {
        play.drag(shell.x + i * 0.1, shell.z - i * 0.15, 0)
        play.step(DT)
      }
      expect(Math.hypot(play.things.shells[1].x - shell.x, play.things.shells[1].z - shell.z)).toBeGreaterThan(1)
      // Put away with it in the hand, it is found as it was.
      const again = reopened(play)
      quiet(again)
      expect(again.things.shells[1], `${state}, put away`).toEqual(shell)
      // The browser takes the finger away: nothing of the drag is kept, the turning over neither.
      play.cancel()
      expect(play.things.shells[1], `${state}, cancelled`).toEqual(shell)
      expect(play.toState().shells[1]).toEqual(shell)
      expect(play.poses.shells[1].fly).toBeNull()
      steps(play, 0.5)
      expect(play.things.shells[1], `${state}, after`).toEqual(shell)
    }
  })

  it('the sun in the hand, or on its way by itself, is found where it set out from, and no scene is owed', () => {
    const play = fresh()
    play.press({ kind: 'sun' })
    play.dragStart()
    play.drag(null, null, 0.8)
    play.step(DT)
    let again = reopened(play)
    quiet(again)
    expect(again.sun.t).toBe(0)
    expect(again.tide).toBe(0)
    play.release()
    steps(play, JOURNEY_SECONDS * 0.2)
    expect(play.sun.travelling).toBe(true)
    again = reopened(play)
    quiet(again)
    expect(again.sun.home).toBe('up')
    steps(again, 2)
    expect(again.playing).toBe(false)
    expect(again.sun.t).toBe(0)
    // The same at evening: the sun on its way up is found down, with the evening whole.
    const evening = new Play(BEACHES.evening(7), 1)
    const before = saved(evening)
    evening.press({ kind: 'sun' })
    evening.tap()
    steps(evening, JOURNEY_SECONDS * 0.8)
    expect(saved(evening)).toEqual(before)
  })
})

describe('put away with something in the air', () => {
  it('a bucket lifting off its tower is found standing beside it, empty, with the tower built', () => {
    const play = fresh(3)
    const at = { x: play.things.bucket.x, z: play.things.bucket.z }
    play.press({ kind: 'bucket' })
    play.tap()
    play.step(DT)
    expect(play.poses.bucket.fly).not.toBeNull()
    const again = reopened(play, 3)
    quiet(again)
    expect(again.things.bucket.holds).toBe('nothing')
    expect(again.things.bucket.x).toBeCloseTo(play.things.bucket.x, 1)
    expect(deltaAt(again.field, at.x, at.z)).toBeGreaterThan(0.6)
    expect(isClear([bucketPatch(again.things.bucket)], [...TAKEN, ...patchesOf(again.things, { kind: 'bucket', index: 0 })])).toBe(true)
  })

  it('a shell the crab wears as a hat is found lying where the crab was going to set it down', () => {
    const play = new Play(BEACHES['wrong-evening'](7), 1)
    // A shell laid on the crab's line, and the other two out of its way in the bucket: it wears this one only, and
    // is not made to set it down beside itself to lift another.
    const line = play.folk.crab
    for (const index of [0, 1]) play.things.shells[index].state = 'bucket'
    steps(play, 3)
    Object.assign(play.things.shells[2], { x: line.x + 0.3, z: line.z + 0.2, state: 'lying' })
    let worn = false
    for (let t = 0; t < 20 && !worn; t += DT) {
      play.step(DT)
      worn = play.hat === 2
    }
    expect(worn).toBe(true)
    expect(play.drawn().shells[2].shown).toBe(false)
    const lies = { x: play.things.shells[2].x, z: play.things.shells[2].z }
    const again = reopened(play)
    quiet(again)
    expect(again.things.shells[2].state).toBe('lying')
    expect(again.things.shells[2].x).toBeCloseTo(lies.x, 1)
    expect(again.things.shells[2].z).toBeCloseTo(lies.z, 1)
    expect(again.drawn().shells[2].shown).toBe(true)
    // In this visit the crab sets it down there at its next dead stop.
    for (let t = 0; t < 20 && play.hat === 2; t += DT) play.step(DT)
    expect(play.hat).toBe(-1)
    steps(play, 1)
    expect(play.things.shells[2]).toMatchObject(lies)
  })
})

describe('the first visit and every visit after', () => {
  it('sets only how the bucket stands from the age: full for the youngest and for no age, empty from five, and never a gate', () => {
    expect(fresh(null).things.bucket.holds).toBe('sand')
    expect(fresh(2).things.bucket.holds).toBe('sand')
    expect(fresh(4).things.bucket.holds).toBe('sand')
    expect(fresh(5).things.bucket.holds).toBe('nothing')
    expect(fresh(12).things.bucket.holds).toBe('nothing')
    // Everything else is the same beach, and a saved beach opens the same whatever the age says now.
    const young = fresh(3), old = fresh(7)
    expect({ ...saved(young), bucket: null }).toEqual({ ...saved(old), bucket: null })
    expect(saved(reopened(young, 12))).toEqual(saved(young))
    expect(saved(reopened(old, null))).toEqual(saved(old))
  })

  it('waits for the child: an evening found on load stays an evening, and a day stays a day', () => {
    const evening = new Play(BEACHES.evening(7), 1)
    const before = saved(evening)
    steps(evening, 30)
    expect(evening.sun.home).toBe('down')
    expect(evening.sun.mode).toBe('rest')
    expect(saved(evening).sand).toBe(before.sand)
    const day = fresh()
    steps(day, 30)
    expect(day.sun.t).toBe(0)
    expect(day.playing).toBe(false)
    expect(day.dirty).toBe(false)
  })
})
