import { BED_SIZE } from './clearing'
import { pokedFor, type Creature } from './creatures'
import { partPose, type PartPose } from './gait'
import { SHAPES, reach, type Placed } from './parts'
import { NEARER, liftFor } from './reach'
import { count, radius } from './things'

// A creature as it is shown. Its picture is laid on the page turned,
// squashed, leaning, lifted and, asleep, smaller; and inside the picture
// each part is posed as its kind moves. The view draws with these numbers
// and the finger is answered by them, so a creature is touched where it is
// drawn, at rest, squashed, tumbling and asleep. Nothing here draws.

/** How much smaller a creature is drawn as it curls up to sleep: full size until it is half curled, the bed's size when asleep. */
export function creatureSize(creature: Creature): number {
  return 1 - (1 - BED_SIZE) * Math.max(0, creature.body.curl * 2 - 1)
}

/** How far a creature reaches from its middle as it is drawn on the ground. */
export function spanOf(creature: Creature): number {
  return radius(creature.thing) * creatureSize(creature)
}

/** Where a creature's picture is laid: its middle on the page, how it is turned, and how it is stretched along and down the page. `lift` is how far off the ground it is drawn. */
export type Shown = { x: number; y: number; turn: number; sx: number; sy: number; lift: number }

export function shownOf(creature: Creature, out: Shown): Shown {
  const { thing, body } = creature
  // Off the ground it is drawn nearer, and only as high as keeps all of it clear of the home control and the corner.
  const lift = liftFor(thing.x, thing.y, spanOf(creature), body.lift)
  const size = creatureSize(creature) * (1 + lift * NEARER)
  // Stroked, it leans into the finger: a vain one, with feathers on it, further.
  const lean = creature.lean * (10 + 5 * Math.min(3, count(thing, 'feather')))
  // On its back it is seen from below: turned over across the page.
  const over = Math.cos(Math.min(1, body.flip) * Math.PI), across = Math.abs(over) < 0.25 ? (over < 0 ? -0.25 : 0.25) : over
  out.x = thing.x + creature.leanX * lean; out.y = thing.y - lift + creature.leanY * lean
  out.turn = thing.turn + body.roll
  out.sx = (1 - 0.3 * body.squash) * size; out.sy = (1 + 0.5 * body.squash) * size * across
  out.lift = lift
  return out
}

/** A part of a creature as it is posed in the creature's own frame: where its middle is, how it is turned, and how it is stretched along and across itself. */
export type Posed = { x: number; y: number; turn: number; along: number; across: number }

const pose: PartPose = { turn: 0, along: 1, across: 1, out: 0 }

/** The one round leaf of a creature that is that leaf and its eyes and nothing else, or null. */
export function wheelOf(creature: Creature): { x: number; y: number } | null {
  let wheel: { x: number; y: number } | null = null
  for (const part of creature.thing.parts) {
    if (part.kind === 'cap') continue
    if (part.kind !== 'round' || wheel) return null
    wheel = part
  }
  return wheel
}

/** Poses part `i` of a creature. `index` is the part's place among the parts of its own kind. */
export function posedPart(creature: Creature, i: number, index: number, out: Posed): Posed {
  const part = creature.thing.parts[i], shape = SHAPES[part.kind]
  partPose(part.kind, creature.body, index, pokedFor(creature, i), pose)
  let px = part.x, py = part.y, turn = part.turn
  if (part.kind === 'round') turn += pose.turn
  else if (pose.turn !== 0 && shape.half > 0) {
    // Turned about its inner end: the end nearer the creature's middle stays where it is.
    const ax = Math.cos(turn) * shape.half, ay = Math.sin(turn) * shape.half
    const inner = Math.hypot(px - ax, py - ay) <= Math.hypot(px + ax, py + ay) ? -1 : 1
    const pivotX = px + inner * ax, pivotY = py + inner * ay
    turn += pose.turn
    px = pivotX - inner * Math.cos(turn) * shape.half; py = pivotY - inner * Math.sin(turn) * shape.half
  }
  const wheel = part.kind === 'cap' ? wheelOf(creature) : null
  if (wheel) {
    // One round leaf with its eyes on it: the eyes go round with the wheel.
    const dx = px - wheel.x, dy = py - wheel.y
    if (Math.hypot(dx, dy) <= SHAPES.round.long / 2) {
      partPose('round', creature.body, 0, null, pose)
      const c = Math.cos(pose.turn), s = Math.sin(pose.turn)
      px = wheel.x + dx * c - dy * s; py = wheel.y + dx * s + dy * c; turn += pose.turn
      partPose('cap', creature.body, index, pokedFor(creature, i), pose)
    }
  }
  if (pose.out !== 0) { const far = Math.hypot(px, py) || 1; px += (px / far) * pose.out; py += (py / far) * pose.out }
  // An eye that a finger is pulling at is stretched out after the finger.
  if (creature.tug && creature.tug.index === i) { px += creature.tug.x; py += creature.tug.y }
  out.x = px; out.y = py; out.turn = turn; out.along = pose.along; out.across = pose.across
  return out
}

const shown: Shown = { x: 0, y: 0, turn: 0, sx: 1, sy: 1, lift: 0 }
const posed: Posed = { x: 0, y: 0, turn: 0, along: 1, across: 1 }
const lying: Placed = { kind: 'cap', x: 0, y: 0, turn: 0 }

const near = { index: -1, far: Infinity }

/** The part of a creature whose outside is nearest a point of the page as it is drawn now, and how far outside it the point is, in page units (under 0 inside it). Of two equally near, the one drawn later, which lies on top. */
function nearest(creature: Creature, x: number, y: number): { index: number; far: number } {
  const { thing } = creature
  shownOf(creature, shown)
  // The point in the picture's own frame: the page's stretch undone, then the turn.
  const dx = (x - shown.x) / shown.sx, dy = (y - shown.y) / shown.sy
  const c = Math.cos(shown.turn), s = Math.sin(shown.turn), lx = dx * c + dy * s, ly = -dx * s + dy * c
  near.index = -1; near.far = Infinity
  const counts: Partial<Record<string, number>> = {}
  for (let i = 0; i < thing.parts.length; i++) {
    const part = thing.parts[i], index = counts[part.kind] ?? 0
    // A part still coming down on to it, or in the hand, is not in its picture.
    if (part.fall > 0 || part.inHand) continue
    counts[part.kind] = index + 1
    posedPart(creature, i, index, posed)
    lying.kind = part.kind; lying.x = posed.x - (creature.tug?.index === i ? creature.tug.x : 0); lying.y = posed.y - (creature.tug?.index === i ? creature.tug.y : 0); lying.turn = posed.turn
    const d = reach(lying, lx, ly)
    if (d <= near.far) { near.far = d; near.index = i }
  }
  near.far *= Math.min(Math.abs(shown.sx), Math.abs(shown.sy))
  return near
}

/** The part of a creature under a point of the page, or -1: the one whose outside is nearest as it is drawn now, within `within` page units. */
export function partUnder(creature: Creature, x: number, y: number, within: number): number {
  const found = nearest(creature, x, y)
  return found.far <= within ? found.index : -1
}

/** How far outside a creature's outline a point of the page is, as the creature is drawn now: under 0 on it. An eye that is being pulled counts where it sits, not where it is stretched to. */
export function outside(creature: Creature, x: number, y: number): number {
  return nearest(creature, x, y).far
}
