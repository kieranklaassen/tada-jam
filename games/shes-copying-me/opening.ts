import { GUEST, toPoint } from './layout'
import type { Party } from './party'
import type { Beat, Finger } from './round'

// The walrus asks for tea. The hand leads the aunt's hand with the teapot over
// its head, and her sister does the same with what she has got. Then the next
// guest asks.

export function openingBeats(party: Party): Beat[] {
  return [{ wait: 1.8, from: () => party.handPoint(0), to: () => toPoint(0, { u: GUEST.u, y: 330 }), carry: 1.3 }, { wait: 0.4, ready: () => party.asker === 1, from: () => party.at.fan, to: () => toPoint(1, { u: 250, y: 440 }), carry: 1.2 }, { wait: 0.7, from: () => party.handPoint(1), to: () => toPoint(1, { u: GUEST.u, y: 330 }), carry: 1.2 }]
}

export function fingerOn(party: Party): Finger {
  return {
    down: (id, at) => party.down(id, at),
    move: (id, at) => party.move(id, at),
    up: (id, at) => party.up(id, at),
    cancel: (id) => party.cancel(id),
  }
}
