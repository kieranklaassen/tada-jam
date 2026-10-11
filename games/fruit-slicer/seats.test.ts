import { describe, expect, it } from 'vitest'
import type { Customer } from './orders'
import { REACTIONS, SHEETS, newActor, poseOf, reactTo, stepActor, type Actor } from './cast'
import { AT_WINDOW, IN_QUEUE, SNOUT_GAP, SNOUT_REACH, TICKET_TOP, TWINS_APART, fitOf, headOf, snoutReach, standsAt, touchBoxes, twinsApart } from './seats'
import { GROWN_UP, PAGE, QUEUE, WALL, WINDOW, inCorner, type Box } from './stage'

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

  it('keeps the grown-up\'s corner clear of everyone who waits and of every ticket, at any size of surface: it is given in the page\'s own units', () => {
    const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
    const whos = ['pelican', 'twins', 'ants', 'cat', 'boa'] as const
    for (const who of whos) {
      for (const written of [false, true]) {
        for (const fruit of ['long', 'middle', 'short'] as const) {
          const shares = who === 'cat' ? [{ num: 2, den: 3 }, { num: 3, den: 4 }] : who === 'boa' ? [{ num: 5, den: 4 }] : [{ num: 3, den: 4 }]
          const customer: Customer = { who, fruit, shares, carries: null, written, lined: true }
          for (const seat of ['window', 0, 1] as const) for (const box of touchBoxes(customer, seat)) expect(overlaps(box, GROWN_UP), `${who} ${fruit} ${seat}`).toBe(false)
        }
      }
    }
    // It lies in the top right of the page, over the end of the awning, and takes the margin beyond the page's edge with it.
    expect(GROWN_UP.x + GROWN_UP.w).toBe(PAGE.w)
    expect(GROWN_UP.y + GROWN_UP.h).toBeLessThan(TICKET_TOP)
    expect(inCorner({ x: PAGE.w - 20, y: 20 })).toBe(true)
    expect(inCorner({ x: PAGE.w + 30, y: -10 })).toBe(true)
    expect(inCorner({ x: PAGE.w - 20, y: TICKET_TOP + 4 })).toBe(false)
    expect(inCorner({ x: QUEUE[1].x + 40, y: 20 })).toBe(false)
    // It is big enough for a grown-up's finger on a page of the size the game is drawn for.
    expect(Math.min(GROWN_UP.w, GROWN_UP.h)).toBeGreaterThanOrEqual(48)
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
