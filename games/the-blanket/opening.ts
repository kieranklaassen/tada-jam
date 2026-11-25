import { SEATS, SPOTS, sausageAt } from './layout'
import { quiet } from './model'
import type { Play } from './play'
import type { Beat } from './round'

// The trick, played once for real: a blanket on the dog, the sausage moved
// while it cannot see, the blanket off again. It runs to the empty dish.

export function openingBeats(play: Play): Beat[] {
  const dog = () => ({ x: SEATS.dog.x, y: SEATS.dog.y - 110 })
  const still = () => quiet(play.world)
  return [
    { wait: 1.1, ready: still, from: dog },
    { wait: 0.9, from: () => sausageAt('dish'), to: () => SPOTS.teapot.at, carry: 1.1 },
    { wait: 1.2, from: dog },
  ]
}
