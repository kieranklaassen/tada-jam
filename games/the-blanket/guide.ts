import { BELL, HOOK, PLACES, SEATS, SITTERS, SPOTS, sausageAt, spotAt, type Who } from './layout'
import type { Point } from './input'
import { quiet, sausageSpot, type World } from './model'

// What the idle guidance shows: one next act, chosen from the room. It shows a
// move, and the room shows what comes of it.

export type Hint = { from: Point; to: Point | null; glow: 'hook' | 'sitters' | 'places' | 'sausage' | 'bell' | Who }

const belly = (who: Who): Point => ({ x: SEATS[who].x, y: SEATS[who].y - 110 })

export function hintFor(world: World): Hint | null {
  if (!quiet(world) || world.held) return null
  const spot = sausageSpot(world)
  if (spot === null) return null
  if (spot === 'hook') return { from: { x: HOOK.x, y: HOOK.y + 10 }, to: null, glow: 'hook' }
  const covered = SITTERS.filter((who) => world.sitters[who].covered)
  // Nobody knows where it is: the sausage itself is what to touch.
  if (covered.length === 0 && SITTERS.every((who) => world.sitters[who].belief === null)) return { from: PLACES.some((id) => id === spot && world.draped.includes(id)) ? spotAt(spot) : sausageAt(spot), to: null, glow: 'sausage' }
  if (covered.length === 0) return { from: belly('dog'), to: null, glow: 'sitters' }
  // Somebody believes what is no longer so: take the blanket off.
  const fooled = covered.find((who) => world.sitters[who].belief !== spot)
  if (fooled && covered.length > 1) return { from: BELL, to: null, glow: 'bell' }
  if (fooled) return { from: belly(fooled), to: null, glow: fooled }
  if (PLACES.some((id) => id === spot && world.draped.includes(id))) return { from: spotAt(spot), to: null, glow: 'sausage' }
  const to = PLACES.find((id) => id !== spot && id !== 'dish' && !world.draped.includes(id))
  return to ? { from: sausageAt(spot), to: SPOTS[to].at, glow: 'places' } : null
}
