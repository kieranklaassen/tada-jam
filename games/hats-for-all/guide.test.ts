import { describe, expect, it } from 'vitest'
import { finishIfReady, waitingLead } from './cycle'
import { waits } from './game'
import { hint } from './guide'
import { dropHat, tapHat, type World } from './rules'
import type { Saved } from './save'

const save = (world: World): Saved => ({ v: 1, position: 'spare-hat', finished: false, seed: 1, shown: true, ...world })
const world = (hats: number): World => ({
  crew: [{ kind: 'bop', spot: 1, hats: [] }, { kind: 'lanky', spot: 2, hats: [] }], tile: Array.from({ length: hats }, () => 'cone' as const),
  loose: [], changes: [], guest: null, leaver: null, slips: 0,
})

describe('a game opened again with something held', () => {
  it('shows the crew as what to touch, and the hand taps the first of it; awake, it shows nothing while there is nothing to do but wait', () => {
    const w = tapHat(tapHat(world(2), 0).world, 1).world
    expect(hint(save(w))).toEqual({ glow: [], hand: null })
    const shown = hint(save(w), true)
    expect(shown.glow).toEqual(w.crew.map((creature) => ({ type: 'creature', who: creature.kind })))
    expect(shown.hand).toEqual(shown.glow[0])
    // Something nearer to do comes first, asleep or not.
    expect(hint(save(world(2)), true).hand?.type).toBe('hat')
  })
})

describe('the idle ladder', () => {
  it('glows on the hats in the tile while a head is bare, and the hand taps the one nearest a bare head', () => {
    const shown = hint(save(world(3)))
    expect(shown.glow).toEqual([{ type: 'hat', hat: 0 }, { type: 'hat', hat: 1 }, { type: 'hat', hat: 2 }])
    expect(shown.hand).toEqual({ type: 'hat', hat: 0 })
  })

  it('shows a tower\'s top before anything else, and then a loose hat', () => {
    let w = dropHat(world(3), 0, { on: 'head', spot: 1 }).world
    w = dropHat(w, 1, { on: 'head', spot: 1 }).world
    w = dropHat(w, 2, { on: 'floor', spot: 4 }).world
    expect(hint(save(w)).hand).toEqual({ type: 'hat', hat: 1 })
    w = tapHat(w, 1).world
    expect(hint(save(w))).toEqual({ glow: [{ type: 'hat', hat: 2 }], hand: { type: 'hat', hat: 2 } })
  })

  it('shows nothing while there is nothing to do but wait: a spare hat stays unlit when every head has one', () => {
    let w = world(3)
    w = tapHat(tapHat(w, 0).world, 1).world
    expect(hint(save(w))).toEqual({ glow: [], hand: null })
    // And a bare head with no hat left to give waits unlit too.
    expect(hint(save(tapHat(world(1), 0).world))).toEqual({ glow: [], hand: null })
  })

  it('shows the one who waits in the arch once the crew has paraded', () => {
    let w = world(2)
    w = tapHat(tapHat(w, 0).world, 1).world
    const finished = finishIfReady(save(w)), who = waits(waitingLead(finished))
    expect(hint(finished)).toEqual({ glow: [{ type: 'creature', who }], hand: { type: 'creature', who } })
    // A finished crew the child unsettled is shown how to set it right again, not the arch.
    const unsettled = { ...finished, ...tapHat(w, 0).world }
    expect(hint(unsettled).hand).toEqual({ type: 'hat', hat: 0 })
  })
})
