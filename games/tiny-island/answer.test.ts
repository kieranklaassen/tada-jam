import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { answer, atPlay, type Hands } from './answer'
import { frame, lensOf, postsFor } from './camera'
import { Island } from './island'
import { CORNER } from './overlay'
import { fresh } from './save'
import { REAR_S } from './wash'
import { KINDS, LAND_Y, TRAY_SCALE, TRAY_TOP, TALL, slotOf, type Kind } from './toys'

// A gesture on the glass, answered by the island as the Mount has it answered: with a real camera and no canvas.

const SIZES = [[1180, 820], [1024, 768], [820, 1180]] as const

function at(width: number, height: number) {
  const camera = new THREE.PerspectiveCamera()
  frame(camera, width, height)
  const lens = lensOf(camera, width, height), island = new Island(fresh(4), 1, postsFor(width, height)), hands: Hands = { aside: false }
  const run = (seconds: number): void => { for (let t = 0; t < seconds; t += 1 / 60) island.step(1 / 60) }
  const press = (x: number, y: number): void => answer({ type: 'press', at: { x, y } }, island, lens, null, width, hands)
  const tap = (x: number, y: number): void => { press(x, y); answer({ type: 'tap', at: { x, y } }, island, lens, null, width, hands) }
  /** The middle of a toy in its slot, on the glass. */
  const slot = (kind: Kind): { x: number; y: number } => { const s = slotOf(kind); return lens.glass(s.x, TRAY_TOP + (TALL[kind] * TRAY_SCALE) / 2, s.z) }
  const set = (kind: Kind, x: number, z: number): void => {
    const from = slot(kind), to = lens.glass(x, LAND_Y, z)
    tap(from.x, from.y)
    tap(to.x, to.y)
    run(1)
  }
  return { lens, island, hands, run, press, tap, slot, set, width }
}

describe.each(SIZES)('a touch that ends the wash, on a surface of %i by %i', (width, height) => {
  const washing = () => {
    const game = at(width, height), { island, lens, tap, run, set } = game
    set('house', 1, 0.5)
    set('tree', -1.5, 0)
    const wave = lens.glass(island.posts.wave.x, 0.9, island.posts.wave.z)
    tap(wave.x, wave.y)
    run(REAR_S + 1.6)
    expect(island.washingNow).toBe(true)
    island.sounds.length = 0
    return { ...game, wave }
  }

  it('is answered as an ordinary touch: a finger on a slot gets the toy', () => {
    const { island, press, slot } = washing()
    // In the middle of the roll the house is on the crest, and its slot is empty.
    expect(island.standing().toys[KINDS.indexOf('house')].at).toBe('air')
    const house = slot('house')
    press(house.x, house.y)
    expect(island.washingNow).toBe(false)
    expect(island.hand).toBe('house')
    expect(island.sounds.map((sound) => sound.name)).toEqual(['tok', 'door'])
  })

  it('is answered as an ordinary touch: a finger where the wave lies at its edge gets the wave', () => {
    const { island, press, wave } = washing()
    // In the middle of the roll the wave is away from its edge.
    expect(Math.abs(island.standing().wave.x - island.posts.wave.x)).toBeGreaterThan(1)
    press(wave.x, wave.y)
    expect(island.washingNow).toBe(false)
    expect(island.standing().wave.x).toBe(island.posts.wave.x)
    // It rears again, with its yawn.
    expect(island.sounds.map((sound) => sound.name)).toEqual(['yawn'])
    expect(island.moving).toBe(true)
  })
})

describe("the grown-up's corner", () => {
  it('answers nothing: a press or a drag that starts there is not heard of by the island', () => {
    const { island, hands, press, run, width, lens } = at(1180, 820)
    run(8)
    island.sounds.length = 0
    const quiet = island.sinceTouch
    expect(quiet).toBeGreaterThan(7.9)
    const corner = { x: width - CORNER / 2, y: CORNER / 2 }, middle = { x: width / 2, y: 410 }
    press(corner.x, corner.y)
    expect(hands.aside).toBe(true)
    // The idle guidance is not put off by it, at the press or while the finger stays down.
    expect(atPlay(hands, true)).toBe(false)
    // The finger slides out of the corner and across the island.
    answer({ type: 'dragStart', from: corner }, island, lens, null, width, hands)
    answer({ type: 'dragMove', from: corner, at: middle }, island, lens, null, width, hands)
    answer({ type: 'dragEnd', from: corner, at: middle }, island, lens, null, width, hands)
    // Nothing sounded, nothing turned, and the island is as quiet as it was: its habits grow no louder.
    expect(island.sounds).toHaveLength(0)
    expect(island.sinceTouch).toBe(quiet)
    expect(island.moving).toBe(false)
    expect(island.dirty).toBe(false)
    // The next touch, anywhere else, is the child's.
    press(middle.x, middle.y)
    expect(hands.aside).toBe(false)
    expect(atPlay(hands, true)).toBe(true)
    expect(atPlay(hands, false)).toBe(false)
    expect(island.sinceTouch).toBe(0)
    expect(island.sounds.length).toBeGreaterThan(0)
  })
})
