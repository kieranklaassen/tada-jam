import { describe, expect, it } from 'vitest'
import type { Customer } from './orders'
import { REACTIONS, SHEETS, newActor, poseOf, reactTo, stepActor, type Actor } from './cast'
import { AT_WINDOW, IN_QUEUE, SNOUT_GAP, SNOUT_REACH, TWINS_APART, fitOf, headOf, snoutReach, standsAt, twinsApart } from './seats'
import { QUEUE, WALL, WINDOW } from './stage'

const twins: Customer = { who: 'twins', fruit: 'long', shares: [{ num: 1, den: 2 }], carries: 'written', written: true, lined: true }

describe('where the customers stand', () => {
  it('keeps the twins\' snouts apart, nose to nose, in every seat: two that crossed would read as a sign', () => {
    // Each tip stops short of the middle of the pair, so there is paper between them.
    expect(TWINS_APART - SNOUT_REACH).toBeGreaterThanOrEqual(4)
    for (const seat of ['window', 0, 1] as const) {
      const s = fitOf(twins, seat).s
      expect(2 * (TWINS_APART - SNOUT_REACH) * s).toBeGreaterThanOrEqual(8)
    }
  })

  it('keeps paper between the two tips through everything the twins do, and moves neither of them to do it unless they are rolled flat', () => {
    const idles = Object.keys(SHEETS.twins.idle)
    const starts: [string, Actor, number][] = [
      ...idles.map((idle): [string, Actor, number] => [idle, { ...newActor('twins', 3), idle, idleAge: 0 }, SHEETS.twins.idle[idle]]),
      // One that is leaving has turned its back on the other: the two no longer stand nose to nose.
      ...REACTIONS.filter((reaction) => reaction !== 'leave').map((reaction): [string, Actor, number] => [reaction, reactTo(newActor('twins', 3), reaction), SHEETS.twins.react[reaction]]),
    ]
    for (const [name, start, seconds] of starts) {
      let actor = start
      for (let i = 0; i < Math.round(seconds * 120); i++) {
        actor = stepActor(actor, 1 / 120)
        const first = poseOf(actor, 0), second = poseOf(actor, 1)
        // The first twin stands on the left and leans in by leaning to the right; the second leans in by leaning to the left.
        const reaches = [snoutReach(first.lean, first.flat), snoutReach(-second.lean, second.flat)]
        const apart = twinsApart(reaches[0], reaches[1])
        expect(2 * apart - reaches[0] - reaches[1], name).toBeGreaterThanOrEqual(SNOUT_GAP - 1e-9)
        if (name !== 'flat') expect(apart, name).toBe(TWINS_APART)
      }
    }
    // Leaning in together they would cross, and both would give way.
    expect(twinsApart(snoutReach(0.22), snoutReach(0.22))).toBeGreaterThan(TWINS_APART)
    expect(snoutReach(0)).toBe(SNOUT_REACH)
  })

  it('stands the pair inside its own panel at that distance apart', () => {
    // A twin's back is 40 units behind its own middle.
    const reach = TWINS_APART + 40
    expect(standsAt('twins', 'window').x - reach * AT_WINDOW.twins).toBeGreaterThanOrEqual(WALL.x)
    for (const seat of [0, 1] as const) {
      const x = standsAt('twins', seat).x
      expect(x - reach * IN_QUEUE.twins).toBeGreaterThanOrEqual(WINDOW.x + WINDOW.w)
      expect(x + reach * IN_QUEUE.twins).toBeLessThanOrEqual(QUEUE[seat].x + QUEUE[seat].w + 12)
    }
    // And the face a mark is drawn round is the middle of the pair.
    expect(headOf(twins, 'window').x).toBe(standsAt('twins', 'window').x)
  })
})
