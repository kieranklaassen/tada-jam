import type { Guidance } from './guidance'
import { ANKLE, PEEK, STAGE_PLACE, SUN, type Spot } from './layout'
import type { House } from './house'
import { OWNERS } from './owners'
import { THINGS, type ThingId } from './things'

// What the hand shows an idle child: the one move that comes next, from what
// was just done. Nothing in the boot: a thing goes in. Something in it: the
// foot. Later, whoever looks round the edge and the sun.

export type Move = { from: Spot; to: Spot; drag: boolean; thing: ThingId | null }

export function moveToShow(house: House, guidance: Guidance): Move | null {
  if (!house.calm || house.busy || house.opener !== null) return null
  const tap = (at: Spot): Move => ({ from: at, to: at, drag: false, thing: null })
  const n = Math.max(0, guidance.demoIndex)
  const home = THINGS.filter((id) => house.things[id].where === 'home')
  if (house.phase === 'night') {
    const bare = OWNERS.find((o) => house.shoes[o].length === 0)
    if (bare && home.length > 0 && n % 2 === 0) { const id = home[n % home.length]; return { from: house.homeOf(id), to: house.mouthOf(bare), drag: true, thing: id } }
    return tap(SUN)
  }
  if (house.shoes[house.owner].length > 0) return tap(house.world(STAGE_PLACE, { x: ANKLE.x + 40, y: ANKLE.y + 30 }))
  if (house.begun && n === 1) return tap({ x: PEEK.x + 30, y: PEEK.y })
  if (house.begun && n === 3) return tap(SUN)
  const id = (['porridge', 'bell', 'frog'] as const)[n % 3]
  return { from: house.homeOf(id), to: house.mouthOf(house.owner), drag: true, thing: id }
}
