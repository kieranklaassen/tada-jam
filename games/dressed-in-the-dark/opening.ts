import { BED, KNOB, bedX, pegOf } from './layout'
import type { Beat, Finger, Spot } from './round'
import type { Show } from './show'
import { LOVES } from './things'

// The hand puts the lamp out, carries the cold one the thing it dreams of, and
// puts the lamp on, and there is the joy. Then the lamp asks again.

export function openingBeats(show: Show): Beat[] {
  const still = () => !show.busy
  const cord = () => ({ x: KNOB.x, y: KNOB.y })
  const dreamer = () => show.cold ?? 'hen'
  return [
    { wait: 1.6, ready: still, from: cord },
    { wait: 1.4, ready: () => still() && !show.lit, from: () => pegOf(LOVES[dreamer()]), to: () => ({ x: bedX(show.people[dreamer()].bed ?? 2), y: BED.top + 60 }), carry: 1.3 },
    { wait: 1.2, ready: () => still() && show.asksLamp, from: cord },
  ]
}

/** The same finger the child has, in stage units, without the browser in between. */
export function fingerOn(show: Show): Finger {
  let from: Spot = { x: 0, y: 0 }, moved = false
  return {
    down: (_id, at) => { from = at; moved = false; show.press(at) },
    move: (_id, at) => { moved = true; show.dragMove(from, at) },
    up: () => { if (moved) show.drop(); else show.tap() },
    cancel: () => show.back(),
  }
}
