import { HOOK_GRIP, HOOK_NEAR, MOTHS, PLACES, POLE, REACH, WIRE, WORMS, perch, wormPlace } from './layout'
import { MOTH_REACH } from './moths'
import { BIG, fallOf, formOf, restLight, restTouch, type Big } from './seen'
import type { Bucket } from './sketch'
import type { Paper } from './sheet'
import { CREATURES, clamp, onHook, restPlace, type Creature, type Patch, type Wood } from './wood'
import { WORM_MIDDLE, WORM_REACH } from './worms'

// Where the ghost hand carries the lantern to. For each creature it is a
// place of the grip from which the sheet in hand lays a light on that
// creature (the light of its rule on top, where the sheet has that paper)
// and at which the lantern, let go, would stand on nobody. It is worked out
// from the sheet and from the creatures as they are drawn, by the same
// questions the wood asks of the light where it is (seen.ts), so the hand
// shows a move that does something with the lantern the child has, and
// never parks the lantern on a creature's chest. A lantern with no window
// is carried up beside each creature, which is how that one is answered.

export type Spot = { name: Creature; x: number; y: number }

/** The paper of each creature's rule, where its rule is one colour. */
const RULE: Partial<Record<Creature, Paper>> = { moths: 'yellow', fox: 'red', worms: 'blue' }

/** Points well inside each creature as it is drawn, for the middle of a patch to be tried on. */
function targets(w: Wood, name: Creature): number[] {
  switch (name) {
    case 'owl': return [PLACES.owl.x, 210, PLACES.owl.x, 130, PLACES.owl.x - 56, 250, PLACES.owl.x + 56, 250]
    case 'badger': { const x = PLACES.badger.x, y = PLACES.badger.y; return [x, y - 76, x, y - 150, x - 76, y - 56, x + 74, y - 56, x, y - 220] }
    case 'fox': { const x = w.fox.x, y = PLACES.fox.y; return [x - 9, y - 147, x + 5, y - 70, x, y - 114, x - 50, y - 154, x + 40, y - 154, x - 9, y - 200] }
    case 'hedgehog': { const x = w.hedgehog.x, y = PLACES.hedgehog.y; return [x, y - 60, x - 40, y - 56, x + 40, y - 56, x, y - 93] }
    case 'moths': { const out: number[] = []; for (const i of [2, 3, 4, 5, 1, 6]) { const at = perch(i); out.push(at.x, at.y) } return out }
    case 'worms': { const out: number[] = []; for (const i of [2, 1, 3, 0, 4]) { const at = wormPlace(i); out.push(at.x, at.y - WORM_MIDDLE) } return out }
  }
}

const isBig = (name: Creature): name is Big => (BIG as readonly string[]).includes(name)
const fell = { x: 0, y: 0 }
const NUDGES: readonly (readonly [number, number])[] = [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6], [0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]

/** The light that would lie on a creature, topmost, with the grip at rest at a point: null when none would. */
function lightOn(w: Wood, name: Creature, form: Bucket | null, gx: number, gy: number): Patch | null {
  if (form) return restLight(w, form, gx, gy)
  let top: Patch | null = null
  const count = name === 'moths' ? MOTHS : WORMS
  for (let i = 0; i < count; i++) {
    const at = name === 'moths' ? perch(i) : wormPlace(i)
    const patch = name === 'moths' ? restTouch(w, at.x, at.y, MOTH_REACH, gx, gy) : restTouch(w, at.x, at.y - WORM_MIDDLE, WORM_REACH, gx, gy)
    if (!patch) continue
    // The glow-worms answer one by one: one of them under its own rule's light is enough.
    if (name === 'worms' && patch.paper === RULE.worms) return patch
    if (!top || w.patches.indexOf(patch) > w.patches.indexOf(top)) top = patch
  }
  return top
}

/** The hand's place for each creature it has one for, with the sheet in hand and the creatures where they stand. */
export function handSpots(w: Wood): Spot[] {
  const rooms = w.rooms()
  const spots: Spot[] = []
  for (const name of CREATURES) {
    const points = targets(w, name)
    const form = isBig(name) ? formOf(w, name) : null
    let best = Infinity, bx = 0, by = 0
    const offer = (gx: number, gy: number, lit: boolean, cost: number) => {
      const at = restPlace(clamp(gx, REACH.left, REACH.right), clamp(gy, REACH.top, REACH.bottom), rooms)
      const x = at.x, y = at.y
      // Never where letting go would hang the lantern: the hand shows a carry, not the way home.
      if (Math.hypot(x - HOOK_GRIP.x, y - HOOK_GRIP.y) <= HOOK_NEAR + 30 || onHook(x, y)) return
      let more = cost
      if (lit) {
        const light = lightOn(w, name, form, x, y)
        if (!light) return
        // The light of the creature's own rule on top, wherever the sheet can lay it so; any other only failing that.
        if (RULE[name] !== undefined && light.paper !== RULE[name]) more += 5000
      }
      const far = more + Math.hypot(x - gx, y - gy)
      if (far < best) { best = far; bx = x; by = y }
    }
    if (w.patches.length === 0) {
      // No window: the lantern itself goes up beside the creature.
      offer(points[0] - POLE.x, points[1] - POLE.y - WIRE, false, 0)
    } else {
      for (const patch of w.patches) {
        fallOf(patch, 0, 0, fell)
        const offX = fell.x, offY = fell.y
        for (let i = 0; i < points.length; i += 2) {
          for (const [nx, ny] of NUDGES) offer(points[i] - offX - nx * patch.rx, points[i + 1] - offY - ny * patch.ry, true, i)
        }
      }
    }
    if (best < Infinity) spots.push({ name, x: bx, y: by })
  }
  return spots
}
