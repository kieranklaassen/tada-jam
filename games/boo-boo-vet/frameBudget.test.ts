// The frame budget, counted where the code exposes it: how many stickers a
// frame draws in the heaviest moments, and how many times a frame lays
// something over the whole surface. A canvas 2D game may do that once a
// frame; here it is the room's still ground, stamped once (pilot notes:
// two full-surface stamps cost about 9 ms a frame in software drawing).
//
// These counts hold on any machine. Frame rates are measured by the lead on
// a real graphics card.

import { describe, expect, it } from 'vitest'
import { SPECIES } from './cast'
import { freshClinic, type Clinic } from './clinic'
import type { Guidance } from './guidance'
import viewSource from './view/toyView.ts?raw'
import { CARES, FITS, PLAIN, type Care, type Need } from './needs'
import { COMING_SECONDS, drag, drop, freshToy, lies, needOnTable, press, step, tap, type Toy } from './toy'
import { scene, type Item } from './toyScene'
import { roomFor } from './view/toyRoom'

const { room, garden } = roomFor(1180, 820)
const FRAME = 1 / 60
const GLOWING: Guidance = { glow: 1, demo: 0.4, demoIndex: 0 }

/** The most stickers one frame may hold. Each is a sprite and, for most, one clipped fill for its gloss. */
const STICKERS_AT_MOST = 48
/** What the view draws besides the items: the ground, the gloss of its four still pieces, and the sprig in the garden. */
const ROOM_DRAWS = 1 + 4 + 2

/** How many draws a frame's items take: a sprite each, and a gloss for the ones that carry one. */
function draws(items: Item[]): number {
  let count = ROOM_DRAWS
  for (const item of items) count += item.kind === 'halo' || item.kind === 'hand' || item.kind === 'drop' || item.kind === 'ring' ? 1 : item.kind === 'mouse' && item.hat ? 4 : 2
  return count
}

/** The fullest room there can be: two needs, a carrier, three in the garden, things about, plasters stuck, everything the pairs make. */
function fullRoom(): Toy {
  const fresh = freshClinic(null, 9)
  const patient = (who: (typeof SPECIES)[number], needs: Need[], fromCarrier = false) => ({ species: who, at: 'two', needs: needs.map((need) => ({ need, step: PLAIN, met: false })), wrong: 0 as const, tried: [], cart: [...CARES], fromCarrier })
  const clinic: Clinic = {
    ...fresh, position: 'two', shown: [...CARES],
    table: patient('bear', ['itchy', 'cold']), waiting: patient('dog', ['sore', 'thirsty']), carrier: patient('cat', ['scared', 'itchy'], true),
    garden: [{ species: 'duck', keeps: ['bowl', 'blanket'] }, { species: 'rabbit', keeps: ['plaster', 'brush'] }, { species: 'hedgehog', keeps: ['basket', 'bowl'] }],
    things: { bowl: 'cart', blanket: 'cart', brush: 'cart', basket: 'cart', plasters: ['mouse', 'lamp'] },
    made: { den: false, foam: true, boat: true, crackle: true, patches: 3 },
  }
  return freshToy(clinic, false)
}

describe('the frame budget', () => {
  it('never draws more than the budget of stickers in a frame, in the fullest room through its busiest moments', () => {
    const toy = fullRoom()
    let most = 0, mostDraws = 0
    const run = (seconds: number) => {
      for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
        step(toy, room, FRAME)
        const items = scene(toy, room, garden, GLOWING)
        most = Math.max(most, items.length)
        mostDraws = Math.max(mostDraws, draws(items))
      }
    }
    const give = (care: Care) => { press(toy, room, lies(toy, room, care)!); tap(toy) }
    run(1)
    // Wrong things, each left lying about, with a thing in the hand and one in the air.
    for (const care of ['bowl', 'basket', 'plaster'] as Care[]) { give(care); run(2.5) }
    press(toy, room, lies(toy, room, 'bowl')!)
    drag(toy, room, { x: 600, y: 200 })
    run(0.5)
    drop(toy, room)
    // Then the things that fit, the well scene, and the exchange at the door with the carrier standing.
    while (needOnTable(toy)) { give(FITS[needOnTable(toy)!]); run(9.5) }
    press(toy, room, { x: room.waiting.x, y: room.waiting.y - 80 })
    tap(toy)
    run(COMING_SECONDS + 1)
    expect(most).toBeLessThanOrEqual(STICKERS_AT_MOST)
    // Under about a hundred small draws: a sprite and a clipped gloss for each sticker, and the ground once.
    expect(mostDraws).toBeLessThanOrEqual(2 * STICKERS_AT_MOST + ROOM_DRAWS)
    // And the fullest room is not an empty test: it does fill most of the budget.
    expect(most).toBeGreaterThan(30)
  })

  it('builds a frame\'s list in well under a millisecond on average, even on a slow shared machine', () => {
    const toy = fullRoom()
    for (let frame = 0; frame < 30; frame++) step(toy, room, FRAME)
    const frames = 3000
    const start = performance.now()
    for (let frame = 0; frame < frames; frame++) { step(toy, room, FRAME); scene(toy, room, garden, GLOWING) }
    // A frame has 16.7 ms; a hundredth of that for the list would already be too much, and a busy runner is given ten times that.
    expect((performance.now() - start) / frames).toBeLessThan(1.7)
  })

  it('lays the ground over the whole surface once a frame and nothing else', () => {
    // The view's own source, as text (a raw import: nothing is read from disk by this test).
    const view: string = viewSource
    expect(view.match(/g\.drawImage\(/g) ?? []).toHaveLength(1)
    expect(view).toContain('g.drawImage(backdrop, 0, 0)')
    // No fill or clear of the whole surface, no filter, no shadow blur and no second canvas composed per frame.
    for (const costly of ['fillRect(0, 0', 'shadowBlur', '.filter =', 'getImageData', 'createElement(']) expect(view, costly).not.toContain(costly)
  })
})
