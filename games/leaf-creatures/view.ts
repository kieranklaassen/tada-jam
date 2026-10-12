import { strayAt } from './air'
import { drawAir, drawCast, drawFern } from './castView'
import { HEAPS, ROW_AT, WAIT_AT } from './clearing'
import { MAX_CREATURES, MAX_LOOSE, type Tier } from './config'
import type { Creature } from './creatures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { lettingGo } from './hand'
import { drawLaid } from './laid'
import { KINDS, SHAPES, type Kind } from './parts'
import { PALE, ROW, eyeKey, gazeOf, heapKey, partKey, type Pen } from './pen'
import type { Painter } from './painter'
import { shownOf, type Shown } from './posed'
import { caps, radius } from './things'
import { making } from './touching'
import type { Toy } from './toy'

// One frame of the clearing, drawn with the pen. What lies still is in the
// kept picture of the place and each creature is one kept picture
// (painter.ts), so a frame is a few stamps and the live strokes: the place,
// whatever is springing, falling or flying, the creatures, the three who
// watch, what is in the hand and in the air, and the idle guidance. Nothing
// here changes the toy.

const ghost: HandPose = { travel: 0, press: 0, opacity: 0 }
const at = { x: 0, y: 0 }
/** The most parts shown at once on their way back to their heaps. */
export const STRAYS_SHOWN = 6

const shown: Shown = { x: 0, y: 0, turn: 0, sx: 1, sy: 1, lift: 0 }

/** A creature: a patch of shade below it when it is off the ground, and its own picture, laid as posed.ts says it is shown. */
function drawCreature(pen: Pen, painter: Painter, creature: Creature): void {
  const key = painter.pictureOf(creature)
  const { thing } = creature
  // Until it has a picture of its own it is in the picture of the place, where it lay; whatever of it does not lie still there is drawn live.
  if (key === null) { for (const part of thing.parts) if (!painter.holds(part)) drawLaid(pen, thing, part, false); return }
  shownOf(creature, shown)
  // Off the ground: a patch of shade stays below, and the creature is drawn nearer.
  // The patch is the size of a small body however far the limbs reach, and lies on the ground under its middle.
  if (shown.lift > 1) { const r = Math.max(0.7, Math.min(1.7, radius(thing) / 100)); pen.stamp('shade', thing.x, thing.y + 14, 0, r, r, Math.min(0.5, 0.2 + shown.lift / 120)) }
  pen.sprite(key, shown.x, shown.y, shown.turn, shown.sx, shown.sy)
  // A part that is not in its picture yet (still coming down, or just landed) is drawn live, so nothing is unseen for a frame.
  for (const part of thing.parts) if (part.fall > 0 || !painter.shows(creature, part)) drawLaid(pen, thing, part, false)
}

/**
 * Where the idle ladder points: the heap whose part would be the next thing to lay. A thing that wants its second
 * eye points at the caps. It never points at an act that would send anything away. With as many creatures up as
 * the clearing holds, one more waking would send the eldest off, so it points at a creature that is there, the
 * one woken last: a tap on it is a poke, or wakes it if it sleeps. With as many loose parts lying about as may,
 * one more would send the oldest home, so it points at nothing.
 */
export function hintAt(toy: Toy, demoIndex: number): { x: number; y: number } | null {
  const staying = toy.creatures.filter((creature) => !creature.leaving)
  if (staying.length >= MAX_CREATURES) {
    const newest = staying.filter((creature) => !creature.inScene).reduce<Creature | null>((best, one) => (!best || one.thing.woke > best.thing.woke ? one : best), null)
    return newest ? newest.thing : null
  }
  let loose = 0
  for (const thing of toy.things) if (!thing.awake) loose += thing.parts.length
  if (loose >= MAX_LOOSE) return null
  const begun = making(toy, 'cap')
  if (begun && caps(begun) < 2) return HEAPS.cap
  const order: readonly Kind[] = ['willow', 'cap', 'twig', 'cap']
  return HEAPS[order[Math.max(0, demoIndex) % order.length]]
}

/** How large the glow is laid as it comes and goes: from `GLOW_FROM` of its size when it is faintest to all of it. */
export const GLOW_FROM = 0.4

/** Seconds the glow takes to draw back in under one heap, and as long again to grow out from under another. */
export const GLOW_TURN = 0.35
/** How far the glow goes along with what it lies under without drawing in first: a creature that walks, not another heap. */
const GLOW_FOLLOWS = 60

/**
 * The breathing glow behind the heap the idle ladder points at: it lies under the heap, which is laid over the
 * ground after it. It is always laid whole, never thinned: thinned over the dark earth a yellow turns grey. It
 * comes by growing out from under its heap and goes by drawing back in. It never jumps across the frame at its
 * full size: when the ladder points at another heap it draws back in where it lies, and only then grows out there.
 * Any touch takes it away at once, as it takes the ladder back.
 */
function drawGlow(pen: Pen, toy: Toy, guidance: Guidance, glow: Painter['glow']): void {
  const target = guidance.glow > 0 ? hintAt(toy, guidance.demoIndex) : null
  const first = glow.at < 0, dt = first ? 0 : Math.max(0, Math.min(0.1, toy.time - glow.at))
  glow.at = toy.time
  if (!target) { glow.out = 0; return }
  const want = Math.min(1, guidance.glow)
  if (first || glow.out <= 0 || Math.hypot(target.x - glow.x, target.y - glow.y) <= GLOW_FOLLOWS) {
    // Where it lies, or going along with it; or drawn right in, and free to come out somewhere else.
    glow.out = first ? want : Math.min(want, glow.out + dt / GLOW_TURN)
    glow.x = target.x; glow.y = target.y
  } else {
    glow.out = Math.max(0, glow.out - dt / GLOW_TURN)
  }
  const breath = Math.sin(toy.time * 3), size = (GLOW_FROM + (1 - GLOW_FROM) * glow.out) * (1.22 + 0.07 * breath)
  pen.stamp('glow', glow.x, glow.y - 4, 0.08 * breath, size, size)
}

/** The ghost hand that shows one tap on that heap: over everything that stands on the ground, so nothing hides it. */
function drawGhostHand(pen: Pen, toy: Toy, guidance: Guidance): void {
  if (guidance.demo === null) return
  const target = hintAt(toy, guidance.demoIndex)
  if (!target) return
  handPose(guidance.demo, false, ghost)
  const size = 1 - 0.08 * ghost.press
  pen.stamp('hand', target.x + 6, target.y + 30 + (1 - ghost.press) * 18, -0.12, size, size, ghost.opacity * 0.95)
}

/** How long a part fresh in the hand takes to do what its kind does as it is lifted. */
export const LIFT = 0.45
/** How long the mark a finger leaves on bare earth is seen. */
export const SCUFF = 0.9

/** The mark a finger leaves on bare earth: a smudge that spreads and fades, and a puff of dust that rises from it. No line. */
function drawScuff(pen: Pen, mark: { x: number; y: number; age: number }): void {
  const p = mark.age / SCUFF, fade = 1 - p
  pen.dot(mark.x, mark.y + 2, 17 + 9 * p, 8 + 3 * p, 'soilDark', 0.6 * fade)
  pen.dot(mark.x + 15 + 6 * p, mark.y - 9 - 24 * p, 6 + 7 * p, 5 + 5 * p, 'soil', 0.7 * fade)
}

/** The eyes of the creature that waits behind the trees, between two trunks at the edge it left by; and the eyes of the one that waited before it, which shut and are gone. */
function drawWaiting(pen: Pen, toy: Toy): void {
  const away = toy.away
  if (away && !away.creature) {
    const at = WAIT_AT[away.side], blink = (toy.time + 1.2) % 3.7 < 0.13
    // They look in at the clearing, and a little down at whoever is on the ground.
    const gaze = gazeOf(-away.side, 0.35)
    let eye = 0
    for (const part of away.thing.parts) {
      if (part.kind !== 'cap' || eye > 1) continue
      const x = at.x + (eye++ === 0 ? -WAIT_EYES : WAIT_EYES), y = at.y + Math.sin(toy.time * 1.3 + eye) * 1.5
      if (blink) pen.stamp(partKey('cap', part.look), x, y, 0, WAIT_SIZE, WAIT_SIZE * 0.86)
      else pen.stamp(eyeKey(part.look, gaze), x, y, 0, WAIT_SIZE, WAIT_SIZE)
    }
  }
  const left = toy.left
  if (left) {
    const at = WAIT_AT[left.side], fade = 1 - left.age / 0.6
    left.looks.slice(0, 2).forEach((look, eye) => pen.stamp(partKey('cap', look), at.x + (eye === 0 ? -WAIT_EYES : WAIT_EYES), at.y + left.age * 30, 0, WAIT_SIZE * fade, WAIT_SIZE * 0.86 * fade, fade))
  }
}

/** How far to each side of the waiting place an eye shows, and how large: farther off than anything on the ground, so smaller. */
export const WAIT_EYES = 20
export const WAIT_SIZE = 0.66

const order: Creature[] = []
const byHeight = (a: Creature, b: Creature): number => a.thing.y - b.thing.y

/** Draws the frame. `guidance` is what the idle ladder shows now, or null before the first frame. */
export function drawFrame(pen: Pen, toy: Toy, guidance: Guidance | null, tier: Tier, painter: Painter): void {
  // First whatever has to change in the kept pictures, then the frame itself.
  painter.keep(pen, toy)
  pen.stamp('laid', 0, 0)
  for (const mark of toy.scuffs) drawScuff(pen, mark)
  if (guidance) drawGlow(pen, toy, guidance, painter.glow)
  for (const thing of toy.things) {
    if (thing.awake) continue
    const peeking = caps(thing) === 1
    for (const part of thing.parts) if (!painter.holds(part)) drawLaid(pen, thing, part, peeking)
  }
  // A dug acorn lies on top of whatever lies loose, as a nut does on leaves, and under whoever walks about.
  toy.acornShown.forEach((shown) => {
    if (shown.dust > 0) {
      // Earth flies where a nose digs.
      const kick = Math.sin(toy.time * 30)
      pen.dot(shown.x - 22 - kick * 8, shown.y - 6 - Math.abs(kick) * 16, 7, 5, 'soilDark', 0.8)
      pen.dot(shown.x + 20 + kick * 6, shown.y - 2 - Math.abs(Math.cos(toy.time * 30)) * 18, 5, 6, 'soil', 0.8)
    }
    if (shown.out > 0.02 && !painter.holds(shown)) pen.stamp('acorn', shown.x, shown.y - shown.hop * 26, shown.spin, 0.3 + 0.7 * shown.out, 0.3 + 0.7 * shown.out)
  })
  // Sleepers lie under the fern's front fronds; of the rest, the one nearest the bottom of the page is drawn last, on top.
  order.length = 0
  for (const creature of toy.creatures) if (creature.thing.bedded) drawCreature(pen, painter, creature); else order.push(creature)
  order.sort(byHeight)
  for (const creature of order) drawCreature(pen, painter, creature)
  if (toy.ghost) drawCreature(pen, painter, toy.ghost)
  // The eyes that wait between the trunks are never covered: they show over whoever stands there, and take the tap.
  drawWaiting(pen, toy)
  // The heaps stand at the front, over whoever reaches behind them. Those at rest are one picture; one that sinks
  // or springs is drawn live, from its foot.
  pen.stamp(ROW, ROW_AT.x, ROW_AT.y)
  for (const kind of KINDS) {
    const heap = toy.heaps[kind], place = HEAPS[kind]
    if (!painter.holdsHeap(kind)) pen.stamp(heapKey(kind), place.x, place.y - heap.squash * 44, 0, 1 - heap.squash * 0.4, 1 + heap.squash)
  }
  if (guidance) drawGhostHand(pen, toy, guidance)
  drawFern(pen, toy.cast, toy.time)
  drawCast(pen, toy.cast)
  for (let i = Math.max(0, toy.air.strays.length - STRAYS_SHOWN); i < toy.air.strays.length; i++) {
    const stray = toy.air.strays[i]
    // A part that has let go of a creature is in the air once the creature's picture is drawn without it: never in both.
    if (stray.was && painter.stillOn(stray.was)) continue
    strayAt(stray, at)
    pen.stamp(partKey(stray.kind, stray.look), at.x, at.y, stray.turn, 0.9, 0.9)
  }
  const hand = toy.hand
  if (hand) {
    // Each kind is carried in its own way: a wing flaps, a round leaf twirls, a cap rocks, a seed swings, a feather floats tip up.
    let turn = hand.turn, across = 1, along = 1, key = partKey(hand.kind, hand.look)
    // And each is lifted in its own way, in the first moments after the finger lands on it.
    const lift = Math.min(1, hand.held / LIFT), fresh = lift < 1 && !hand.pulled
    if (hand.kind === 'maple') {
      // A wing flips over to its pale side and back as it is lifted, and then flaps.
      if (fresh) { const over = Math.cos(lift * Math.PI * 2); across = Math.max(0.08, Math.abs(over)); if (over < 0) key = PALE }
      else across = 1 - 0.4 * Math.abs(Math.sin((hand.held - LIFT) * 5))
    }
    else if (hand.kind === 'round') turn += hand.held * 3 + hand.sinceRustle * 0.07
    else if (hand.kind === 'cap') turn += 0.32 * Math.sin(hand.held * 7)
    else if (hand.kind === 'seed') turn += 0.5 * Math.sin(hand.held * 9)
    else if (hand.kind === 'feather') turn += 0.16 * Math.sin(hand.held * 2.2)
    else if (hand.kind === 'willow') {
      // A willow leaf hangs rolled up from the finger and unrolls like a ribbon, from its stem to its tip.
      if (fresh) along = 0.22 + 0.78 * lift * (2 - lift)
      else across = 1 + 0.2 * Math.sin(hand.held * 8)
    }
    const size = 1.1 + hand.jump / 90
    // The patch of shade lies under the finger, on the ground; the part rides above it.
    pen.stamp('shade', hand.fingerX + 4, hand.fingerY + 6, 0, 0.8, 0.8, 0.45)
    if (hand.kind === 'seed' && fresh && !hand.from) {
      // A seed rolls into the hand with two of its fellows chasing it: they roll up out of the heap after it and fall back.
      const up = Math.sin(lift * Math.PI)
      for (const side of [-1, 1]) {
        const x = hand.startX + (hand.x - hand.startX) * 0.55 * up + side * (14 + 10 * lift), y = hand.startY + (hand.y - hand.startY) * 0.55 * up
        pen.stamp(partKey('seed', hand.look + (side < 0 ? 1 : 2)), x, y, hand.held * 14 * side, 0.8, 0.8)
      }
    }
    // What is rolled up hangs by its stem end, which stays where it was.
    const back = (1 - along) * (SHAPES[hand.kind].long / 2) * size
    // A part whose finger has lifted sinks a little and quivers: it is letting go, not hung there.
    const letting = lettingGo(hand)
    turn += letting.quiver
    const hx = hand.x - Math.cos(turn) * back, hy = hand.y - (hand.waiting ? 0 : hand.jump * 0.3) + letting.sink - Math.sin(turn) * back
    // An eye that was pulled off is in the hand once its creature's picture is drawn without it: never in both.
    if (!(hand.was && painter.stillOn(hand.was))) pen.stamp(key, hx, hy, turn, size * along, size * across)
  }
  drawAir(pen, toy.air, tier.gustLines)
  // Last, with what the frame has cost known: the creatures' own pictures for the next frame.
  painter.bake(pen, toy, tier)
}
