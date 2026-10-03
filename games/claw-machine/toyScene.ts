import { hubAt } from './claw'
import type { Picture, Shadow, ToyLook } from './picture'
import { TRAY } from './places'
import { sceneryLooks } from './scenery'
import { Toybox, type ToyEvent } from './toybox'
import type { Toy } from './toys'
import { nearestPlace } from './tray'

// The toy as the Mount shows it at load: the same seven toys on the same
// places every time, the claw over them, and the gobblers looking on.

const LOAD: readonly { toy: Toy; place: number }[] = [
  { toy: { colour: 'red', kind: 'duck', size: 'small' }, place: 0 },
  { toy: { colour: 'blue', kind: 'rocket', size: 'big' }, place: 1 },
  { toy: { colour: 'yellow', kind: 'car', size: 'small' }, place: 3 },
  { toy: { colour: 'yellow', kind: 'duck', size: 'big' }, place: 5 },
  { toy: { colour: 'red', kind: 'car', size: 'big' }, place: 7 },
  { toy: { colour: 'blue', kind: 'duck', size: 'small' }, place: 8 },
  { toy: { colour: 'red', kind: 'rocket', size: 'small' }, place: 9 },
]

export function newToybox(): Toybox {
  return new Toybox(LOAD)
}

/** How hard the gobblers start at what just happened: a thud, a bell or a bonk makes them jump. */
export function joltOf(events: readonly ToyEvent[]): number {
  let jolt = 0
  for (const event of events) {
    if (event.type === 'bonk' || event.type === 'buffer' || event.type === 'boing') jolt = Math.max(jolt, 1)
    else if (event.type === 'click') jolt = Math.max(jolt, event.heavy > 1 ? 1 : 0.4)
  }
  return jolt
}

/** The picture of the toy at `time` seconds, with `jolt` running from 1 to 0 after something startling. */
export function toyPicture(box: Toybox, time: number, jolt: number): Picture {
  const claw = box.claw, hub = hubAt(claw)
  const resting = claw.phase === 'ready' && !claw.following && !claw.dropOnArrival
  const toys: ToyLook[] = [], shadows: Shadow[] = []
  for (const piece of box.pieces) {
    toys.push({ key: piece.key, toy: piece.toy, x: piece.x, y: piece.y, z: piece.z, squash: piece.squash, leanX: piece.leanX, leanZ: piece.leanZ, scale: 1 })
    // A toy in the jaws has no shadow of its own: the one under the trolley says where it will come down.
    if (piece.state === 'held') continue
    // Its shadow lies on whatever is under it and thins as the toy rises.
    const under = nearestPlace(piece.x, piece.z)
    const ground = piece.state === 'standing' ? box.stackTop(piece.place, piece.key) : box.stackTop(under, piece.key)
    const lift = Math.max(0, piece.y - ground)
    shadows.push({ x: piece.x, y: ground, z: piece.z, r: piece.heavy > 1 ? 3.3 : 2.1, a: Math.max(0.25, 1 - lift / 16) })
  }
  // The shadow of the claw lies straight under the trolley and the swing never moves it: it is where the claw,
  // or the toy in its jaws, will land.
  const below = nearestPlace(claw.x, claw.z)
  shadows.push({ x: claw.x, y: box.held ? box.stackTop(below) : Math.max(TRAY.top, claw.landY), z: claw.z, r: box.held ? (box.held.heavy > 1 ? 3.1 : 2) : 1.7, a: 0.75 })
  // A start is a quick squash that springs back: down first, then up past rest.
  const start = jolt > 0 ? Math.sin((1 - jolt) * Math.PI * 2) * jolt : 0
  const scenery = sceneryLooks(time, hub, -start)
  return {
    toys: toys.concat(scenery.snacks),
    gobblers: scenery.gobblers,
    // Left alone, the claw is never quite still: the cable sways a hair and the jaws work a little.
    claw: {
      x: claw.x, z: claw.z, length: claw.length,
      swingX: claw.swingX + (resting ? 0.012 * Math.sin(time * 1.3) : 0), swingZ: claw.swingZ + (resting ? 0.008 * Math.sin(time * 0.9 + 1) : 0),
      open: claw.open + (resting && !box.held ? 0.06 * Math.sin(time * 1.1) : 0), squash: claw.squash,
    },
    shadows,
  }
}
