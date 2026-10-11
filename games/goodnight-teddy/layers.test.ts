import { describe, expect, it } from 'vitest'
import { Finger, spotOf, walkEverything } from './finger'
import { freshFur } from './fur'
import { Game } from './game'
import { layersOf, type LayerId } from './layers'
import { BED, CLOTH_IDS, CLOTH_SPOTS, DUCK, DUCK_LIFT, LAMP, SLEEPER, THING_IDS, TUB, WASH_IDS, catSpot, clothSpot, inSpot } from './room'
import { WEARERS, freshSave } from './save'

// Nothing is drawn through anything. A canvas has no depth: what is in front is whatever is painted later, so the
// rule is held on the paint order (layers.ts), which the view follows and nothing else decides. This asks the
// order about every state a child can reach: each cloth on each of the five, the towel and the jug in the hand
// over everyone, and every frame of the walk through the grid and the scenes (finger.ts).

const before = (order: LayerId[], back: LayerId, front: LayerId): boolean => order.indexOf(back) < order.indexOf(front)

/** What must hold of the paint order whatever the room is doing. Returns what is wrong, or nothing. */
function faults(game: Game): string[] {
  const order = layersOf(game), out: string[] = [], has = (id: LayerId): boolean => order.includes(id)
  const want = (ok: boolean, what: string): void => { if (!ok) out.push(what) }
  want(new Set(order).size === order.length, 'a layer is painted twice')
  // Teddy is painted once: in the room, in the doorway, or behind the glass.
  want([has('teddy'), has('through'), has('outside')].filter(Boolean).length === 1, 'Teddy is not painted exactly once')
  // Behind the glass he is behind the curtain and the door; in the doorway he is behind the door's leaf and in front of the garden.
  if (has('outside')) want(before(order, 'sky', 'outside') && before(order, 'outside', 'curtain'), 'Teddy outside is not behind the room')
  if (has('through')) want(before(order, 'doorway', 'through') && before(order, 'through', 'leaf'), 'Teddy in the doorway is not between the garden and the leaf')
  // Each carried thing is painted once: at its place, in the air, or on whoever wears it.
  for (const id of THING_IDS) {
    const thing = game.things[id], away = thing.mode !== 'home'
    const worn = !away && WEARERS.includes(thing.place as never)
    want([has(`rest:${id}`), has(`air:${id}`), worn].filter(Boolean).length === 1, `${id} is not painted exactly once`)
    want(has(`air:${id}`) === away, `${id} in the air is not over the room`)
  }
  // What is in the hand or in the air is over everyone, the falling water under the jug that pours it.
  const firstAir = order.findIndex((id) => id.startsWith('air:'))
  if (firstAir >= 0) want(order.slice(firstAir).every((id) => id.startsWith('air:')), 'something is painted over a thing in the hand')
  if (has('stream')) want(before(order, 'teddy', 'stream') || !has('teddy'), 'the water falls behind Teddy')
  if (has('stream')) want(before(order, 'cat', 'stream') || !has('cat'), 'the water falls behind the cat')
  want(before(order, 'lip', 'bits'), 'the flying bits are behind the bath')
  // The bath: the duck sits in the water, behind the front lip, on the raft or the dome and under what it wears.
  want(before(order, 'duck', 'lip'), 'the duck is in front of the bath')
  for (const id of ['ripple', 'raft', 'dome'] as const) if (has(id)) want(before(order, id, 'duck'), `the duck is under the ${id}`)
  for (const id of ['duckCloth', 'suds'] as const) if (has(id)) want(before(order, 'duck', id) && before(order, id, 'lip'), `the ${id} is not between the duck and the lip`)
  if (has('corner')) want(before(order, 'lip', 'corner'), 'the blanket corner is behind the rim it hangs over')
  if (has('lampCloth')) want(before(order, 'lamp', 'lampCloth'), 'the lamp shows through what it wears')
  want(before(order, 'light', 'lamp'), "the lamp's light is painted over its shade")
  // A cloth someone wears has its layer; nobody is painted wearing one that is elsewhere.
  for (const id of CLOTH_IDS) {
    want(has('lampCloth') || !game.worn(id, 'lamp'), `${id} on the lamp is not painted`)
    want(has('duckCloth') || !game.worn(id, 'duck'), `${id} on the duck is not painted`)
  }
  want(has('lampCloth') === (game.worn('pyjamas', 'lamp') || game.worn('blanket', 'lamp')), 'the lamp is painted in a cloth it does not wear')
  want(has('duckCloth') === (game.worn('pyjamas', 'duck') || game.worn('blanket', 'duck')), 'the duck is painted in a cloth it does not wear')
  want(has('raft') === game.worn('pyjamas', 'tub'), 'the raft and the record disagree')
  want((has('corner') || has('dome')) === game.worn('blanket', 'tub'), 'the sunk blanket and the record disagree')
  // The bed: the cat behind it is behind whoever lies on it, the cat on it sits in front, and it is painted once.
  want(has('cat') !== has('catBehind'), 'the cat is not painted exactly once')
  if (has('catBehind') && has('teddy')) want(before(order, 'catBehind', 'teddy'), 'the cat behind the bed is in front of Teddy')
  if (has('cat') && has('teddy')) want(before(order, 'teddy', 'cat'), 'the cat on the bed is behind Teddy')
  // The things at their places are behind Teddy, so a thing never shows through him as he walks past.
  for (const id of THING_IDS) if (has(`rest:${id}`) && has('teddy')) want(before(order, `rest:${id}`, 'teddy'), `${id} at its place is in front of Teddy`)
  // While he sleeps the blanket is on him or on its way: it never lies folded on the bed under him.
  if (game.rec.phase === 'night' && game.sceneId === null) want(game.worn('blanket', 'teddy'), 'he sleeps without the blanket')
  return out
}

describe('nothing is drawn through anything', () => {
  it('holds the paint order in every frame of the walk through the grid, the hand and the scenes', () => {
    const found = new Set<string>()
    let frames = 0
    walkEverything((game) => { frames += 1; for (const fault of faults(game)) found.add(`${fault} (${game.rec.phase} ${game.sceneId ?? ''})`) })
    expect(frames).toBeGreaterThan(20000)
    expect([...found]).toEqual([])
  })

  it.each(CLOTH_IDS.flatMap((id) => WEARERS.map((who) => [id, who] as const)))('holds it with the %s on %s, at rest and with the towel and the jug in the hand over them', (id, who) => {
    const game = new Game({ ...freshSave(null), fur: freshFur([]), mudPlaces: [] }, 2), finger = new Finger(game)
    finger.use(id, who, 0, 7)
    expect(game.worn(id, who)).toBe(true)
    expect(faults(game)).toEqual([])
    for (const wash of WASH_IDS) {
      finger.take(wash).move(spotOf(who, game))
      const order = layersOf(game)
      expect(faults(game), wash).toEqual([])
      expect(order[order.length - 1], wash).toBe(`air:${wash}`)
      finger.wait(0.5)
      expect(faults(game), wash).toEqual([])
      finger.drop().wait(4)
      expect(faults(game), wash).toEqual([])
    }
    // Found as left: the same order from the saved record.
    expect(layersOf(new Game(game.toSave(), 2))).toEqual(layersOf(game))
  })

  it('lays each cloth where its wearer is, so it is found by the finger where it is seen', () => {
    for (const id of CLOTH_IDS) for (const who of ['duck', 'cat', 'lamp'] as const) {
      const game = new Game({ ...freshSave(null), [id]: who }, 1), spot = clothSpot(id, game.world())
      const wearer = who === 'duck' ? spotOf('duck', game) : who === 'cat' ? catSpot(game.world()) : LAMP
      expect(inSpot(spot, wearer), `${id} on ${who}`).toBe(true)
      expect(game.rests()[id]).toMatchObject({ x: wearer.x })
    }
    // In the bath the raft lies on the water under the duck, and the sunk blanket hangs over the rim beside it.
    expect(CLOTH_SPOTS.pyjamas.tub.y).toBeGreaterThan(TUB.water - 4)
    expect(DUCK.y - DUCK_LIFT.raft + DUCK.ry).toBeLessThanOrEqual(CLOTH_SPOTS.pyjamas.tub.y + CLOTH_SPOTS.pyjamas.tub.ry)
    expect(CLOTH_SPOTS.blanket.tub.y - CLOTH_SPOTS.blanket.tub.ry).toBeGreaterThanOrEqual(TUB.rim)
    expect(CLOTH_SPOTS.blanket.tub.x - CLOTH_SPOTS.blanket.tub.rx).toBeGreaterThan(DUCK.x)
    // In bed he lies on the mattress line, clear of the lamp above him.
    expect(SLEEPER.y + SLEEPER.ry).toBeGreaterThanOrEqual(BED.top)
    expect(inSpot(LAMP, { x: SLEEPER.x, y: SLEEPER.y - SLEEPER.ry })).toBe(false)
  })
})
