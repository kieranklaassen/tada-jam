import { TRAY, placeSpot, seatSpot, spoonSpot, type Spot } from './layout'
import { LIKES } from './party'
import { restingPot, spoutSpot, stationFor, thingUnder, type Pot } from './pour'
import { emptyWorld, pourInto, spill, type GuestId, type Thing, type World } from './world'

// The two tables the Mount can open on before the game is built on the toy.
// Both are plain worlds with a fixed layout, so a still of either is the same
// on every load.
// - The toy's table: a plain cloth, the pot, and one cup on its saucer.
// - The look's table: the game's real scene, three guests at a laid table
//   with tea at each one's ring, for judging the look.

const thing = (id: string, kind: Thing['kind'], at: Spot, over: Partial<Thing> = {}): Thing => ({ id, kind, size: 'house', ring: null, owner: null, x: at.x, z: at.z, on: null, heldBy: null, tea: 0, ...over })

export type Tableau = { world: World; pot: Pot; guests: { who: GuestId; x: number; z: number }[] }

/** One cup on its saucer in the middle of the cloth, the pot beside it with its spout over the cup, and the sponge waiting in the tray until the first spill. */
export function toyTable(): Tableau {
  const world = emptyWorld()
  // Nearer the child than a guest's place would be, and a little left of the middle, so cup and pot sit in the middle of the surface.
  const place = { x: -0.9, z: placeSpot(1, 0).z + 0.8 }
  world.things.push(thing('saucer-0', 'saucer', place), thing('cup', 'cup', place, { on: 'saucer-0' }))
  const station = stationFor(place)
  const pot = restingPot(station, station.heading)
  pot.over = thingUnder(world, spoutSpot(pot))
  return { world, pot, guests: [] }
}

/** The Bear, the Hen and the Mouse at a laid table, each cup filled to its ring, the tray along the near edge and one small puddle. */
export function lookTable(): Tableau {
  const world = emptyWorld()
  const party: ('bear' | 'hen' | 'mouse')[] = ['mouse', 'bear', 'hen']
  const guests = party.map((who, seat) => ({ who, ...seatSpot(party.length, seat) }))
  party.forEach((who, seat) => {
    const place = placeSpot(party.length, seat)
    world.things.push(thing(`saucer-${seat}`, 'saucer', place))
    world.things.push(thing(`cup-${who}`, 'cup', place, { on: `saucer-${seat}`, owner: who, ring: LIKES[who] }))
    world.things.push(thing(`spoon-${seat}`, 'spoon', spoonSpot(party.length, seat)))
    pourInto(world, `cup-${who}`, LIKES[who])
  })
  world.things.push(thing('saucer-3', 'saucer', TRAY.saucers), thing('spoon-3', 'spoon', TRAY.spoons))
  world.things.push(thing('sponge', 'sponge', TRAY.sponge), thing('bowl', 'bowl', TRAY.bowl))
  spill(world, { x: -1.6, z: 1.1 }, 0.3)
  const pot = restingPot(TRAY.pot, Math.PI * 1.12)
  return { world, pot, guests }
}
