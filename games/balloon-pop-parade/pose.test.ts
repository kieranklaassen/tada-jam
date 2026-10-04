import { describe, expect, it } from 'vitest'
import { copyPose, REST, restPose, type Pose } from './pose'

describe('a pose', () => {
  it('is copied whole: every channel, so none is left over from the friend before', () => {
    const from = restPose(), into = restPose()
    const keys = Object.keys(from) as (keyof Pose)[]
    keys.forEach((key, i) => { from[key] = 100 + i; into[key] = -1 })
    expect(copyPose(into, from)).toEqual(from)
    expect(keys.length).toBe(21)
  })

  it('has a rest that cannot be written to', () => {
    expect(REST).toEqual(restPose())
    expect(Object.isFrozen(REST)).toBe(true)
  })
})
