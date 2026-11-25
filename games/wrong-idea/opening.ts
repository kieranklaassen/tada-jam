import type { Gesture } from './input'
import { bodyMiddle } from './layout'
import type { Play } from './play'
import type { Beat, Finger, Spot } from './round'

// The grandmother dreams of somebody in the soup. The hand carries one small
// thing there, the butler has his idea and fetches all that are like it, the
// dream comes true, and she laughs. Touched, she dreams of the next.

export function openingBeats(play: Play): Beat[] {
  const first = play.demo()
  if (!first || first.what !== 'thing') return []
  return [
    { wait: 2, from: () => first.from, to: () => first.to, carry: 1.4 },
    { wait: 0.8, ready: () => !play.saved.dreaming && !play.busy, from: () => bodyMiddle('gran', play.spotOf('gran')) },
  ]
}

/** The same finger the child has, in stage units, without the browser in between. */
export function fingerOn(play: Play): Finger {
  let from: Spot = { x: 0, y: 0 }, moved = false
  const act = (gesture: Gesture) => play.act([gesture])
  return {
    down: (_id, at) => { from = at; moved = false; act({ type: 'press', at }) },
    move: (_id, at) => { if (!moved) act({ type: 'dragStart', from }); moved = true; act({ type: 'dragMove', from, at }) },
    up: (_id, at) => act(moved ? { type: 'dragEnd', from, at } : { type: 'tap', at }),
    cancel: (_id) => act(moved ? { type: 'dragCancel', from, at: from } : { type: 'pressEnd', at: from }),
  }
}
