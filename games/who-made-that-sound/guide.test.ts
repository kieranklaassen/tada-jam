import { describe, expect, it } from 'vitest'
import { FIRST_SEED, stir } from './layout'
import { CALLS_AGAIN_AT, callsDue, handShowings, moveToShow, touchableOf, wantOf, wouldAttempt } from './guide'
import { IdleLadder } from './guidance'
import type { Clutch } from './layout'
import { direct } from './plays'
import { STAGE } from './stage'
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
  it('three times at most, each a moment after a showing of the ghost hand is over', () => {
    expect(CALLS_AGAIN_AT).toHaveLength(3)
    const shown = handShowings()
    CALLS_AGAIN_AT.forEach((at, i) => {
      expect(at).toBeGreaterThan(shown[i][1])
      expect(at - shown[i][1]).toBeLessThanOrEqual(1)
    })
    expect(callsDue(0)).toBe(0)
    expect(callsDue(CALLS_AGAIN_AT[0] - 0.01)).toBe(0)
    expect(callsDue(CALLS_AGAIN_AT[0])).toBe(1)
    expect(callsDue(CALLS_AGAIN_AT[1])).toBe(2)
    expect(callsDue(600)).toBe(3)
  })

  it('knows when the hand shows its move: the same moments the idle ladder plays it', () => {
    const shown = handShowings(), ladder = new IdleLadder(0)
    for (let idle = 0; idle < 120; idle += 0.05) {
      const within = shown.findIndex(([from, to]) => idle >= from && idle < to), guidance = ladder.update(idle)
      expect(guidance.demo !== null, `${idle.toFixed(2)} s`).toBe(within >= 0)
      expect(guidance.demoIndex).toBe(within)
    }
  })

  it('never covers the hand: no call starts before a showing is over, and each call with all its answers is over before the next showing starts', () => {
    const VIEW = { x: 0, y: 0, w: STAGE.width, h: STAGE.height }, shown = handShowings()
    // The longest roll calls there are: the slowest voices, a full row, a leaf place where every answer waits as long as the longest voice.
    const rows: Clutch[] = [
      { form: 'seek', place: 'three-eggs', kinds: ['hoom', 'brrl', 'wheep', 'dooo'], slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: ['hoom', 'brrl', 'wheep', 'dooo'], asker: null, wrong: 0 },
      { form: 'seek', place: 'leaf-piles', kinds: ['pip', 'tok', 'hoom', 'brrl'], slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: ['hoom', 'brrl', 'pip', 'tok'], asker: null, wrong: 0 },
      { form: 'seek', place: 'leaf-piles', kinds: ['pip', 'hoom', 'wheep'], slots: ['fresh', 'fresh', 'fresh'], queue: ['hoom', 'pip', 'wheep'], asker: null, wrong: 0 },
      { form: 'who', place: 'who-is-inside', kinds: ['hoom', 'brrl', 'dooo', 'wheep'], slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: ['hoom', 'brrl', 'dooo', 'wheep'], asker: null, wrong: 0 },
    ]
    let longest = 0
    for (const next of rows) {
      const world = act({ ...freshWorld(null), position: next.place, shown: ['seek', 'who', 'alike'], next }, { type: 'edge' }).world
      expect(world.cycle!.asker).not.toBeNull()
      const again = act(world, { type: 'asker' })
      const play = direct(again.happened, { type: 'asker' }, world, world, VIEW, 0)!
      // The one who asks and every one still hidden: a call each.
      expect(play.acts.filter((one) => one.do === 'call')).toHaveLength(1 + next.kinds.length)
      longest = Math.max(longest, play.seconds)
    }
    expect(longest).toBeGreaterThan(5)
    CALLS_AGAIN_AT.forEach((at, i) => {
      // After the showing before it, with the hand gone...
      expect(at).toBeGreaterThanOrEqual(shown[i][1])
      // ...and over, with a second to spare, before the next showing starts.
      expect(at + longest + 1, `call ${i + 1}`).toBeLessThanOrEqual(shown[i + 1][0])
      // No call starts inside any showing.
      for (const [from, to] of shown) expect(at < from || at >= to).toBe(true)
    })
  })
})
