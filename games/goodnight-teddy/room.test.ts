import { describe, expect, it } from 'vitest'
import { PARTS } from './bear'
import { BED, CAT, CAT_NIGHT_X, CLOTH_IDS, CLOTH_SPOTS, CURTAIN, DOORWAY, DUCK, GROWN_UP, HOMES, HOME_CONTROL, LAMP, SLEEPER, TEDDY, TUB, WRIST_STRIP, catSpot, clothSpot, coveredBy, duckSpot, inSpot, landingOf, onTeddy, reachable, targetAt, whatAt, type Spot, type World } from './room'
import { WEARERS } from './save'
import { STAGE } from './stage'

const targets: [string, Spot][] = [...Object.entries(HOMES), ['lamp', LAMP], ['duck', DUCK], ['cat', CAT]]
/** Everything a child must be able to touch, in every phase: the small targets, the cat where it sleeps, the sleeper, and each place a cloth can lie. */
const touchable: [string, Spot][] = [
  ...targets, ['cat at night', { ...CAT, x: CAT_NIGHT_X }], ['sleeper', SLEEPER],
  ...CLOTH_IDS.flatMap((id) => Object.entries(CLOTH_SPOTS[id]).filter(([place]) => place !== 'teddy').map(([place, spot]): [string, Spot] => [`${id} on ${place}`, spot])),
]
const evening: World = { phase: 'evening', blanket: 'bed', pyjamas: 'peg', away: [], sitting: true, catX: CAT.x }
const rim = (spot: Spot, n = 24): { x: number; y: number }[] => Array.from({ length: n }, (_, k) => ({ x: spot.x + Math.cos((k / n) * Math.PI * 2) * spot.rx * 0.98, y: spot.y + Math.sin((k / n) * Math.PI * 2) * spot.ry * 0.98 }))

describe('the room', () => {
  it('gives every small target about 100 across or more, inside the stage', () => {
    for (const [name, spot] of touchable) {
      expect(spot.rx * 2, name).toBeGreaterThanOrEqual(100)
      expect(spot.ry * 2, name).toBeGreaterThanOrEqual(64)
      expect(spot.x - spot.rx, name).toBeGreaterThanOrEqual(0)
      expect(spot.x + spot.rx, name).toBeLessThanOrEqual(STAGE.width)
    }
    for (const [name, spot] of targets) expect(spot.ry * 2, name).toBeGreaterThanOrEqual(100)
  })

  it('stands the targets well apart: at least 140 between middles, and no two overlap', () => {
    for (let a = 0; a < targets.length; a++) {
      for (let b = a + 1; b < targets.length; b++) {
        const [nameA, A] = targets[a], [nameB, B] = targets[b]
        expect(Math.hypot(A.x - B.x, A.y - B.y), `${nameA} and ${nameB}`).toBeGreaterThanOrEqual(140)
        for (const p of rim(A)) expect(inSpot(B, p), `${nameA} and ${nameB}`).toBe(false)
      }
    }
  })

  it('rests nothing a child can touch under the home control, in the grown-up corner or on the wrist strip', () => {
    for (const [name, spot] of touchable) {
      const dx = Math.max(0, Math.abs(spot.x - HOME_CONTROL.x) - spot.rx), dy = Math.max(0, Math.abs(spot.y - HOME_CONTROL.y) - spot.ry)
      expect(Math.hypot(dx, dy), name).toBeGreaterThan(HOME_CONTROL.r + 20)
      expect(spot.x + spot.rx <= GROWN_UP.left || spot.y - spot.ry >= GROWN_UP.bottom, name).toBe(true)
      expect(spot.y + spot.ry, name).toBeLessThanOrEqual(WRIST_STRIP)
    }
    // Teddy is large, and his ears stay clear of the control too.
    expect(onTeddy({ x: HOME_CONTROL.x, y: HOME_CONTROL.y + HOME_CONTROL.r + 20 })).toBe(false)
    expect(onTeddy({ x: STAGE.width - 36, y: 36 })).toBe(false)
  })

  it('keeps the curtain and the door, which start the morning and the evening, as large as the rest and clear of the control, the corner and the strip', () => {
    for (const [name, spot] of [['curtain', CURTAIN], ['door', DOORWAY]] as const) {
      expect(spot.rx * 2, name).toBeGreaterThanOrEqual(100)
      expect(spot.ry * 2, name).toBeGreaterThanOrEqual(100)
      expect(spot.y + spot.ry, name).toBeLessThanOrEqual(WRIST_STRIP)
      // The part a child must touch: every point of it that is the curtain or the door is outside the control and the corner.
      for (let x = spot.x - spot.rx; x <= spot.x + spot.rx; x += 8) for (let y = spot.y - spot.ry; y <= spot.y + spot.ry; y += 8) {
        if (!inSpot(spot, { x, y })) continue
        expect(Math.hypot(x - HOME_CONTROL.x, y - HOME_CONTROL.y), name).toBeGreaterThan(HOME_CONTROL.r + 10)
        expect(x < GROWN_UP.left || y > GROWN_UP.bottom, name).toBe(true)
      }
    }
    // A touch on the curtain while he sleeps reaches the curtain: at the place the idle hand shows, nobody is in the way.
    const night: World = { ...evening, phase: 'night', blanket: 'teddy', sitting: false, catX: CAT_NIGHT_X }
    expect(whatAt({ x: CURTAIN.x + 30, y: CURTAIN.y + 20 }, night)).toEqual({ kind: 'curtain' })
    const morning: World = { ...evening, phase: 'morning', sitting: false }
    expect(whatAt({ x: DOORWAY.x + 24, y: DOORWAY.y + 60 }, morning)).toEqual({ kind: 'door' })
    // In the evening the door is part of the wall.
    expect(whatAt({ x: DOORWAY.x + 24, y: DOORWAY.y + 60 }, evening)).toEqual({ kind: 'room' })
  })

  it('keeps every small target clear of the bear, so a finger meant for one never lands on him', () => {
    for (const [name, spot] of targets) for (const at of rim(spot, 16)) expect(onTeddy(at), name).toBe(false)
  })

  it('says what a finger lands on', () => {
    expect(whatAt(HOMES.soap, evening)).toEqual({ kind: 'thing', id: 'soap' })
    expect(whatAt(HOMES.jug, evening)).toEqual({ kind: 'thing', id: 'jug' })
    expect(whatAt(HOMES.towel, evening)).toEqual({ kind: 'thing', id: 'towel' })
    expect(whatAt(HOMES.blanket, evening)).toEqual({ kind: 'thing', id: 'blanket' })
    expect(whatAt(HOMES.pyjamas, evening)).toEqual({ kind: 'thing', id: 'pyjamas' })
    expect(whatAt(LAMP, evening)).toEqual({ kind: 'who', id: 'lamp' })
    expect(whatAt(DUCK, evening)).toEqual({ kind: 'who', id: 'duck' })
    expect(whatAt(CAT, evening)).toEqual({ kind: 'who', id: 'cat' })
    expect(whatAt({ x: TEDDY.x, y: TEDDY.y - 170 }, evening)).toEqual({ kind: 'who', id: 'teddy' })
    expect(whatAt({ x: TEDDY.x, y: 60 }, evening)).toEqual({ kind: 'room' })
    expect(whatAt({ x: 180, y: 660 }, evening)).toEqual({ kind: 'tub' })
    // A thing that is out of its place cannot be picked up from it.
    expect(whatAt(HOMES.soap, { ...evening, away: ['soap'] })).toEqual({ kind: 'room' })
  })

  it('takes a touch on a cloth for the cloth, wherever it lies, and never for whoever is beneath it', () => {
    for (const id of CLOTH_IDS) for (const place of WEARERS) {
      const world: World = { ...evening, [id]: place }
      if (place === 'teddy') {
        // On him it is found by his shape: his belly under either, his head under neither.
        expect(whatAt({ x: TEDDY.x, y: TEDDY.y - 170 }, world), `${id} on teddy`).toEqual({ kind: 'thing', id })
        expect(whatAt({ x: TEDDY.x, y: TEDDY.y - 380 }, world), `${id} on teddy`).toEqual({ kind: 'who', id: 'teddy' })
        continue
      }
      const spot = clothSpot(id, world)
      expect(whatAt(spot, world), `${id} on ${place}`).toEqual({ kind: 'thing', id })
    }
    // The duck on its raft is above the pyjamas and can still be squeezed.
    const raft: World = { ...evening, pyjamas: 'tub' }
    expect(whatAt({ x: duckSpot(raft).x, y: duckSpot(raft).y - 30 }, raft)).toEqual({ kind: 'who', id: 'duck' })
    // Under the blanket the pyjamas cannot be reached: the blanket is.
    const both: World = { ...evening, blanket: 'teddy', pyjamas: 'teddy' }
    expect(whatAt({ x: TEDDY.x, y: TEDDY.y - 170 }, both)).toEqual({ kind: 'thing', id: 'blanket' })
    // The sunk blanket keeps a corner over the rim, clear of the duck, large enough to touch.
    const sunk = CLOTH_SPOTS.blanket.tub
    expect(sunk.rx * 2).toBeGreaterThanOrEqual(100)
    for (const p of rim(sunk)) expect(inSpot(DUCK, p)).toBe(false)
  })

  it('leaves what he wears on him while he sleeps or a scene moves him', () => {
    const asleep: World = { phase: 'night', blanket: 'teddy', pyjamas: 'teddy', away: [], sitting: false, catX: CAT_NIGHT_X }
    expect(whatAt(SLEEPER, asleep)).toEqual({ kind: 'who', id: 'teddy' })
    expect(whatAt({ x: TEDDY.x, y: TEDDY.y - 170 }, asleep)).toEqual({ kind: 'room' })
    expect(whatAt({ x: CAT_NIGHT_X, y: CAT.y }, asleep)).toEqual({ kind: 'who', id: 'cat' })
    // The sleeper and the cat at the foot of the bed do not lie over each other.
    for (const p of rim(catSpot(asleep))) expect(inSpot(SLEEPER, p)).toBe(false)
  })

  it('covers his body with a cloth and never his face', () => {
    for (const id of CLOTH_IDS) {
      expect(coveredBy(id, 0, -170), id).toBe(true)
      expect(coveredBy(id, 0, -380), id).toBe(false)
      expect(reachable(0, -380, { blanket: 'teddy', pyjamas: 'teddy' })).toBe(true)
      expect(reachable(0, -170, { blanket: id === 'blanket' ? 'teddy' : 'bed', pyjamas: id === 'pyjamas' ? 'teddy' : 'peg' })).toBe(false)
    }
    // The blanket covers his legs, which the pyjamas leave bare.
    const foot = PARTS.body[1]
    expect(coveredBy('blanket', foot.x, foot.y)).toBe(true)
    expect(coveredBy('pyjamas', foot.x, foot.y)).toBe(false)
  })

  it('finds who a carried thing is over, the small ones before the large, and where falling water lands', () => {
    expect(targetAt(DUCK, evening)).toBe('duck')
    expect(targetAt(CAT, evening)).toBe('cat')
    expect(targetAt(LAMP, evening)).toBe('lamp')
    expect(targetAt({ x: TEDDY.x, y: TEDDY.y - 170 }, evening)).toBe('teddy')
    expect(targetAt({ x: 180, y: 660 }, evening)).toBe('tub')
    expect(targetAt({ x: TEDDY.x, y: 60 }, evening)).toBeNull()
    // While he is not on the rug there is nobody there to be over.
    expect(targetAt({ x: TEDDY.x, y: TEDDY.y - 170 }, { ...evening, phase: 'night', sitting: false })).toBeNull()
    expect(landingOf(TEDDY.x, 100, evening).on).toBe('teddy')
    expect(landingOf(DUCK.x, 300, evening).on).toBe('duck')
    expect(landingOf(CAT.x, 200, evening).on).toBe('cat')
    expect(landingOf(LAMP.x, 100, evening).on).toBe('lamp')
    expect(landingOf(300, 300, evening)).toEqual({ on: 'tub', y: TUB.water })
    expect(landingOf(700, 100, { ...evening, sitting: false }).on).toBe('floor')
    expect(landingOf(BED.left + 60, 300, { ...evening, catX: CAT.x }).on).toBe('floor')
  })
})
