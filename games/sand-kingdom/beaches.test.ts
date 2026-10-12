import { describe, expect, it } from 'vitest'
import { BEACHES, MOAT, beachOf } from './beaches'
import { SEA, decode, makeField } from './field'
import { type Kingdom, deserializeKingdom, serializeKingdom } from './kingdom'
import { planFor } from './plan'
import { Play } from './play'
import { TAKEN, bucketPatch, isClear, patchesOf, shellPatch, woodPatches } from './things'
import { EVENING_SEA, flood } from './water'

// The prepared beaches the stills, the audit and the evening tests start
// from: each is a beach the game itself could save, and each brings the folk
// to what its name says.

function planOf(state: Kingdom) {
  const field = makeField()
  decode(state.sand, field)
  return planFor(field, flood(field, EVENING_SEA, state.dug, SEA), state)
}

describe('the prepared beaches', () => {
  it('are beaches the game could have saved: they read back as themselves, and nothing lies on anything', () => {
    for (const [name, build] of Object.entries(BEACHES)) {
      const state = build(7)
      const back = deserializeKingdom(JSON.parse(JSON.stringify(serializeKingdom(state))), 7)
      expect(back, name).toEqual(serializeKingdom(state))
      expect(JSON.stringify(state).length, name).toBeLessThan(16_000)
      // Each thing clear of the rocks, the log and every other thing.
      const others = (skip: { kind: 'bucket' | 'shell' | 'wood'; index: number }) => [...TAKEN, ...patchesOf(state, skip)]
      expect(isClear([bucketPatch(state.bucket)], others({ kind: 'bucket', index: 0 })), `${name} bucket`).toBe(true)
      state.shells.forEach((shell, index) => {
        if (shell.state === 'lying' || shell.state === 'pressed') expect(isClear([shellPatch(shell)], others({ kind: 'shell', index })), `${name} shell ${index}`).toBe(true)
      })
      state.wood.forEach((wood, index) => expect(isClear(woodPatches(wood), others({ kind: 'wood', index })), `${name} wood ${index}`).toBe(true))
    }
  })

  it('are the same beach at any age but for how the bucket stands', () => {
    for (const build of Object.values(BEACHES)) expect(build(3).sand).toBe(build(null).sand)
    expect(BEACHES.kingdom(null).sun).toBe('up')
    expect(BEACHES.evening(null).sun).toBe('down')
  })

  it('the kingdom at evening has something right for everyone', () => {
    const plan = planOf(BEACHES.evening(7))
    expect(plan.crab.kind).toBe('ring')
    expect(plan.crab.kind === 'ring' && plan.crab.wet).toBe(true)
    expect(plan.star).toMatchObject({ on: 'tower' })
    expect(plan.star.on === 'tower' && Math.hypot(plan.star.x - MOAT.x, plan.star.z - MOAT.z)).toBeLessThan(0.3)
    expect(plan.eel.kind).toBe('groove')
    expect(plan.eel.kind === 'groove' && plan.eel.bridge).not.toBeNull()
    expect(plan.gulls).toMatchObject({ kind: 'wall', flat: true })
    expect(plan.bored).toBe(false)
  })

  it('the wrong beach at evening has each thing a little wrong', () => {
    const plan = planOf(BEACHES['wrong-evening'](7))
    // An open moat the water cannot reach: the crab walks to the gap, on a dry bank.
    expect(plan.crab).toMatchObject({ kind: 'groove', wet: false })
    // No tower: the starfish takes the crab's back.
    expect(plan.star).toEqual({ on: 'crab' })
    // A wet groove with nothing across it, and wood lying near.
    expect(plan.eel.kind === 'groove' && plan.eel.bridge).toBeNull()
    expect(plan.eel.kind === 'groove' && plan.eel.wood).not.toBeNull()
    expect(plan.gulls).toMatchObject({ kind: 'wall', flat: false })
    expect(plan.bored).toBe(false)
  })

  it('the bare beach at evening brings no one but the bored small crabs', () => {
    const plan = planOf(BEACHES.bare(7))
    expect(plan).toEqual({ crab: { kind: 'home' }, star: { on: 'rock' }, eel: { kind: 'rock' }, gulls: { kind: 'log' }, bored: true })
    const play = new Play(BEACHES.bare(7), 1)
    expect(play.folk.small.crabs.every((crab) => crab.shown > 0.9)).toBe(true)
  })

  it('are asked for by name, and an unknown name is the child\'s own beach', () => {
    expect(beachOf('?beach=evening')).toBe(BEACHES.evening)
    expect(beachOf('?chrome=0&beach=wrong-evening&seed=3')).toBe(BEACHES['wrong-evening'])
    expect(beachOf('?beach=nowhere')).toBeNull()
    expect(beachOf('?beach=toString')).toBeNull()
    expect(beachOf('')).toBeNull()
  })
})
