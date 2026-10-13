import { describe, expect, it } from 'vitest'
import type { Voice } from './audio'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder } from './guidance'
import { putAway } from './putAway'
import { SceneGain } from './sceneGain'

describe('putting the game away', () => {
  it('takes the idle ladder back to the bottom: parked while the hand was showing, it comes back with no glow and no hand', () => {
    const ladder = new IdleLadder(0)
    // Idle long enough for the glow and the ghost hand.
    const idle = IDLE_BEFORE_DEMO + 1
    const before = ladder.update(idle)
    expect(before.glow).toBeGreaterThan(0)
    expect(before.demo).not.toBeNull()
    putAway(new SceneGain(), ladder, idle)
    // The attended clock stands still while the game rests, so the first frame back is at the same second.
    const back = ladder.update(idle)
    expect(back.glow).toBe(0)
    expect(back.demo).toBeNull()
    // And it climbs again from there, as after a load.
    expect(ladder.update(idle + IDLE_BEFORE_GLOW - 0.1).glow).toBe(0)
    expect(ladder.update(idle + IDLE_BEFORE_DEMO + 0.5).demo).not.toBeNull()
  })

  it('closes the sound that was in the air', () => {
    const gains: { off: boolean }[] = []
    const context = { createGain: () => { const gain = { off: false, connect() {}, disconnect() { gain.off = true } }; gains.push(gain); return gain } } as unknown as AudioContext
    const scene = new SceneGain()
    const voice: Voice = () => {}
    scene.through(voice)(context, {} as AudioNode, 0)
    putAway(scene, new IdleLadder(0), 3)
    expect(gains[0].off).toBe(true)
  })
})
