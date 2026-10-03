import { describe, expect, it } from 'vitest'
import { emptyArrangement, putOnEnd, type Arrangement } from './arrangement'
import { restFrame, restTilt, restingAt } from './rest'
import { FRIEND_IDS, FRIENDS, MAX_TILT, PLANK, type FriendId } from './world'

const on = (left: FriendId[], right: FriendId[]): Arrangement => {
  let a = emptyArrangement()
  for (const id of left) a = putOnEnd(a, id, 'left')
  for (const id of right) a = putOnEnd(a, id, 'right')
  return a
}

describe('how a load finds the world', () => {
  it('the plank rests on its heavier end, or level when the two ends weigh the same, an empty plank included', () => {
    expect(restTilt(on(['pim'], []))).toBeCloseTo(-MAX_TILT)
    expect(restTilt(on(['pim'], ['bo']))).toBeCloseTo(MAX_TILT)
    expect(restTilt(on(['mog'], ['dot']))).toBe(0)
    expect(restTilt(on(['bo', 'pim'], ['mog', 'dot']))).toBe(0)
    expect(restTilt(on([], []))).toBe(0)
  })

  it('every friend sits or stands where it belongs: nobody in the air, nobody in the sand or the plank', () => {
    for (const a of [on([], []), on(['pim'], ['bo']), on(['bo', 'mog', 'dot', 'pim'], []), on(['mog'], ['dot'])]) {
      const frame = restFrame(a)
      for (const id of FRIEND_IDS) {
        const pose = frame.poses[id], at = restingAt(a, id, frame.tilt)
        expect(pose).toMatchObject(at)
        expect(pose.squash).toBe(1)
        expect(pose.y).toBeGreaterThanOrEqual(0)
      }
      // The low end's seat is at the sand or above it, and each friend of a stack stands above the one below.
      for (const end of ['left', 'right'] as const) {
        a[end].forEach((id, level) => {
          expect(frame.poses[id].y).toBeGreaterThanOrEqual(PLANK.thickness - 1e-9)
          if (level > 0) expect(frame.poses[id].y - frame.poses[a[end][level - 1]].y).toBeGreaterThan(FRIENDS[a[end][level - 1]].halfHeight)
        })
      }
    }
  })
})
