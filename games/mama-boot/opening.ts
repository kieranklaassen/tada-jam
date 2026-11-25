import type { Play } from './play'
import type { Beat, Finger } from './round'
import { fit } from './stage'
import type { Yard } from './yard'

// The hand opens the egg beside the boot. The boot is its mother. Then the
// hand touches the boot, and the chick does what its mother does.

export function openingBeats(yard: Yard): Beat[] {
  const egg = yard.asking
  if (!egg) return []
  let mother = egg.mother
  return [
    { wait: 1.6, from: () => yard.middle(egg) },
    {
      wait: 1.2,
      ready: () => { mother = egg.mother; return egg.opening === null && mother !== null && yard.of(mother) !== null },
      from: () => yard.middle(yard.of(mother!)!),
    },
  ]
}

/** The fingers of the game, reached in stage units. */
export function fingerOn(play: Play): Finger {
  const on = (at: { x: number; y: number }) => { const by = fit(play.width, play.height); return { x: by.x + at.x * by.scale, y: by.y + at.y * by.scale } }
  return {
    down: (id, at) => { const p = on(at); play.down(id, p.x, p.y) },
    move: (id, at) => { const p = on(at); play.move(id, p.x, p.y) },
    up: (id, at) => { const p = on(at); play.up(id, p.x, p.y) },
    cancel: (id) => play.cancel(id),
  }
}
