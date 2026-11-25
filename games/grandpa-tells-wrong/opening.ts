import { COCK, LAMP, SPOT, pictureAt, thingHome } from './layout'
import type { Play } from './play'
import type { Beat, Finger } from './round'
import { dayLength } from './save'

// The opening round: a day of things given to whoever asks, a change in his
// picture, the lamp, and the cock. Played through the game's own fingers.

export function openingBeats(play: Play): Beat[] {
  const free = () => !play.busy
  const picture = (): { x: number; y: number } => {
    const box = pictureAt(0, play.count)
    return { x: box.x + box.width * 0.26, y: box.y + 80 }
  }
  const give: Beat = { wait: 1.4, ready: free, from: () => thingHome(play.wish), to: () => ({ x: SPOT[play.save.asks].x, y: SPOT[play.save.asks].y - 120 }), carry: 1.2 }
  return [
    ...Array.from({ length: dayLength(play.save) }, () => give),
    // Long enough for the protest to be seen.
    { wait: 2.2, ready: () => free() && play.up > 0, from: picture },
    { wait: 2.4, ready: free, from: () => LAMP },
    { wait: 1.4, ready: () => free() && play.night, from: () => COCK },
  ]
}

export function fingerOn(play: Play): Finger {
  return {
    down: (id, at) => play.down(id, at),
    move: (id, at) => play.move(id, at),
    up: (id, at) => play.lift(id, at),
    cancel: (id) => play.cancel(id),
  }
}
