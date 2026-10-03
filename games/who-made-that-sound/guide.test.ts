import { describe, expect, it } from 'vitest'
import { FIRST_SEED, stir } from './layout'
import { CALLS_AGAIN_AT, callsDue, moveToShow, touchableOf, wantOf, wouldAttempt } from './guide'
import { type Action, type World, act, freshWorld, waitingOf } from './world'

/** Every world a long random game passes through. */
function reached(): World[] {
  const worlds: World[] = [freshWorld(null)]
  let world = freshWorld(null), rng = stir(FIRST_SEED, 5)
  for (let i = 0; i < 3000; i++) {
    rng = stir(rng, i)
    const roll = rng % 10, spot = (rng >>> 8) % 4
    // Mostly right attempts, so the game climbs through every way of asking.
    const cycle = world.cycle
    const right = cycle && !world.finished && cycle.asker !== null ? cycle.kinds.findIndex((kind, at) => kind === cycle.asker && cycle.slots[at] !== 'done') : spot
    const action: Action = roll < 5 ? { type: 'slot', slot: right } : roll < 7 ? { type: 'slot', slot: spot } : roll < 9 ? { type: 'edge' } : { type: 'basket' }
    world = act(world, action).world
    worlds.push(world)
  }
  return worlds
}

describe('one obvious want', () => {
  it('is the one who waits at the edge when a world is fresh', () => {
    const world = freshWorld(null)
    expect(wantOf(world)).toEqual({ who: 'waiting', kind: world.next!.queue[0] })
    expect(moveToShow(world)).toEqual({ on: 'edge' })
    expect(touchableOf(world)).toEqual({ edge: true, slots: [], asker: false, basket: false, residents: [] })
  })

  it('is always exactly one thing, in every state of a long game', () => {
    const forms = new Set<string>()
    for (const world of reached()) {
      const want = wantOf(world)
      if (world.cycle) forms.add(world.cycle.form)
      if (want.who === 'asker') expect(want.kind).toBe(world.cycle!.asker)
      if (want.who === 'waiting') expect(waitingOf(world)).not.toBeNull()
      if (want.who === 'row') {
        expect(world.cycle!.form).toBe('alike')
        expect(world.cycle!.asker).toBeNull()
      }
    }
    expect([...forms].sort()).toEqual(['alike', 'seek', 'who'])
  })
})

describe('the move the ghost hand shows', () => {
  it('always exists, is something a tap would answer, and changes the world or lets something be heard', () => {
    for (const world of reached()) {
      const move = moveToShow(world)
      expect(move).not.toBeNull()
      const touchable = touchableOf(world)
      if (move!.on === 'edge') expect(touchable.edge).toBe(true)
      if (move!.on === 'asker') expect(touchable.asker).toBe(true)
      if (move!.on === 'slot') expect(touchable.slots).toContain(move!.slot)
      const action: Action = move!.on === 'slot' ? { type: 'slot', slot: move!.slot } : { type: move!.on }
      expect(act(world, action).happened[0].type).not.toBe('nothing')
    }
  })

  it('is never an attempt while someone asks: it shows how to hear, not which hide to open', () => {
    for (const world of reached()) {
      const move = moveToShow(world)!
      expect(wouldAttempt(world, move)).toBe(false)
      if (move.on !== 'slot' || world.cycle!.asker === null) continue
      const step = act(world, { type: 'slot', slot: move.slot })
      expect(step.happened.map((one) => one.type)).toEqual(['hears'])
      expect(step.world.cycle!.wrong).toBe(world.cycle!.wrong)
    }
  })

  it('shows a tap on the asker once every hide has been heard', () => {
    let world = act(freshWorld(null), { type: 'edge' }).world
    for (const slot of [0, 1]) world = act(world, { type: 'slot', slot }).world
    expect(world.cycle!.slots).toEqual(['heard', 'heard'])
    expect(moveToShow(world)).toEqual({ on: 'asker' })
  })
})

describe('the one at the stone calls again', () => {
  it('soon, then at longer gaps, three times at most', () => {
    expect(CALLS_AGAIN_AT).toHaveLength(3)
    expect(CALLS_AGAIN_AT[0]).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < CALLS_AGAIN_AT.length; i++) expect(CALLS_AGAIN_AT[i] - CALLS_AGAIN_AT[i - 1]).toBeGreaterThanOrEqual(8)
    expect(callsDue(0)).toBe(0)
    expect(callsDue(2.5)).toBe(1)
    expect(callsDue(11)).toBe(2)
    expect(callsDue(600)).toBe(3)
  })
})
