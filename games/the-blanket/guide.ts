import { BELL, HOOK, PLACES, SEATS, SITTERS, SPOTS, sausageAt, spotAt, type PlaceId, type Spot, type Who } from './layout'
import type { Point } from './input'
import { quiet, sausageSpot, type World } from './model'

// What the idle guidance shows: one next act, chosen from the room. It shows a
// move, and the room shows what comes of it.

export type Hint = { from: Point; to: Point | null; glow: 'hook' | PlaceId | 'sausage' | 'bell' | Who }

const belly = (who: Who): Point => ({ x: SEATS[who].x, y: SEATS[who].y - 110 })

/** The places in the order the hand carries the sausage round, and who sits nearest to each. */
const ROUTE: readonly PlaceId[] = ['dish', 'teapot', 'boot', 'pot', 'gramophone']
const VICTIM: Record<PlaceId, Who> = { dish: 'dog', teapot: 'cat', boot: 'aunt', pot: 'grandpa', gramophone: 'dog' }
function nextVictim(spot: Spot): Who {
  const own = VICTIM[spot as PlaceId]
  return own ?? SITTERS.find((who) => spot !== `head:${who}`)!
}

export function hintFor(world: World): Hint | null {
  if (!quiet(world) || world.held) return null
  const spot = sausageSpot(world)
  if (spot === null) return null
  if (spot === 'hook') return { from: { x: HOOK.x, y: HOOK.y + 10 }, to: null, glow: 'hook' }
  const covered = SITTERS.filter((who) => world.sitters[who].covered)
  // Nobody knows where it is: the sausage itself is what to touch.
  if (covered.length === 0 && SITTERS.every((who) => world.sitters[who].belief === null)) return { from: PLACES.some((id) => id === spot && world.draped.includes(id)) ? spotAt(spot) : sausageAt(spot), to: null, glow: 'sausage' }
  if (covered.length === 0) {
    // One of them is asked for, a new one each time the sausage has moved on. One who does not know is shown it first.
    const who = nextVictim(spot)
    if (world.sitters[who].belief !== spot) return { from: PLACES.some((id) => id === spot && world.draped.includes(id)) ? spotAt(spot) : sausageAt(spot), to: null, glow: 'sausage' }
    return { from: belly(who), to: null, glow: who }
  }
  // Somebody believes what is no longer so: take the blanket off.
  const fooled = covered.find((who) => world.sitters[who].belief !== spot)
  if (fooled && covered.length > 1) return { from: BELL, to: null, glow: 'bell' }
  if (fooled) return { from: belly(fooled), to: null, glow: fooled }
  if (PLACES.some((id) => id === spot && world.draped.includes(id))) return { from: spotAt(spot), to: null, glow: 'sausage' }
  const at = ROUTE.findIndex((id) => id === spot)
  const to = ROUTE.map((_, i) => ROUTE[(at + 1 + i) % ROUTE.length]).find((id) => id !== spot && !world.draped.includes(id))
  return to ? { from: sausageAt(spot), to: SPOTS[to].at, glow: to } : null
}
