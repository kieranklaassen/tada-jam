import { MAKINGS, deckSpot, isBlanket, shapeOf, type Build } from './build'
import { drawGnome, type GnomeStamps } from './gnomeArt'
import { FALL_DROP, LINE, MEET, PLACES, POND, type Spot } from './layout'
import { HOLE_DROP, type MakingStamps } from './makingsArt'
import { onBoat, seatOf, slotOf } from './pieces'
import { INK, flat, oval, printOnce, stamp, type G, type Stamp } from './print'
import type { PropStamps } from './propsArt'
import { BLANKET_UP, boatPose, buildNow, seatOffset, type World } from './world'

// The boat as the child built it: everything at rest on it is stamped at
// the hull's own lean, squash and facing, and afloat nothing of it shows
// below the water. And the boats moored at the pond, each printed once as
// one small sheet when the pond's list changes.

/** Where the lamp stands on a boat, from its keel point: in the acorn cap, else at the top of a mast, else on the bow. */
export function lampSpot(build: Build): Spot {
  const shape = shapeOf(build)
  const cap = build.deck.indexOf('cap')
  if (cap >= 0) { const at = deckSpot(build, cap); return { x: at.x, y: at.y - 2 } }
  for (const index of [0, 1] as const) {
    const mast = build.masts[index]
    if (mast) return { x: shape.holes[index] + 14, y: shape.deck - MAKINGS[mast].length + 46 }
  }
  return { x: -shape.halfWidth + 30, y: shape.rim + 6 }
}

/** A boat as built, standing still, with its keel point at 0, 0: for the moored boats. */
function drawBuild(g: G, makings: MakingStamps, props: PropStamps, build: Build): void {
  if (!build.hull) return
  const shape = shapeOf(build)
  for (const index of [0, 1] as const) {
    const mast = build.masts[index], sail = build.sails[index]
    if (mast) stamp(g, makings[mast], shape.holes[index], shape.deck - MAKINGS[mast].length / 2)
    if (mast && sail) stamp(g, makings[sail], shape.holes[index], shape.deck - MAKINGS[mast].length * 0.6)
  }
  stamp(g, makings[build.hull], 0, 0)
  build.deck.forEach((kind, index) => {
    const at = deckSpot(build, index)
    stamp(g, makings[kind], at.x, at.y, isBlanket(build, index) ? 1.25 : 0)
  })
  const lamp = lampSpot(build)
  stamp(g, props.lamp, lamp.x, lamp.y)
}

/** How much smaller a moored boat's sheet is printed, and the room it takes from its keel point. */
const MOORED = { left: 180, up: 330, w: 360, h: 350 } as const

/** One boat moored at the pond, with its lamp shut, printed at the size it is drawn: the largest of the row's, or full size for the boat that came last, in the morning. */
export function printMoored(build: Build, density: number, makings: MakingStamps, props: PropStamps, s: number = POND.scale): Stamp {
  return printOnce(MOORED.w * s, MOORED.h * s, MOORED.left * s, MOORED.up * s, density, (g) => {
    g.scale(s, s)
    drawBuild(g, makings, props, build)
  })
}

/** The water line for the boat now: lower below the lip of the fall. */
export function waterAt(w: World, x: number): number {
  const fall = w.frame >= 0 && PLACES[w.frame] === 'fall'
  return LINE + 3 + (w.journey.low || (fall && x < MEET.fall.at - 10) ? FALL_DROP : 0)
}

export type BoatSheets = { makings: MakingStamps; props: PropStamps; gnome: GnomeStamps }

/**
 * The boat and everything at rest on it, with the frame's left edge at `ox`. `seated` says whether the gnome
 * is drawn in his seat, and `lamp` whether his lamp is still on his back.
 */
export function drawBoat(g: G, sheets: BoatSheets, w: World, ox: number, seated: boolean, lamp: boolean): void {
  const boat = w.boat, rig = w.stage.boat, pieces = w.pieces
  const build = buildNow(w)
  if (!build.hull) return
  const shape = shapeOf(build)
  const x = boat.x + rig.dx + ox, y = boat.y + rig.dy
  const inHand = w.hand?.on === 'boat'
  const wet = (boat.mode === 'afloat' || boat.mode === 'brook' || boat.mode === 'fall') && !inHand
  const water = waterAt(w, boat.x + rig.dx)
  // Its turn and stretch have one home, so the finger finds the gnome where he is drawn.
  const pose = boatPose(w)
  const billow = boat.billow + rig.billow
  g.save()
  if (wet) {
    g.beginPath()
    g.rect(x - 420, 0, 840, water)
    g.clip()
  }
  g.translate(x, y)
  g.rotate(pose.turn)
  g.scale(pose.sx, pose.sy)
  const resting = pieces.filter((piece) => piece.mode === 'rest' && onBoat(piece))
  const offer = boat.offer
  for (const piece of resting) {
    if (piece.place.on !== 'mast') continue
    const seat = seatOf(piece, pieces)
    // A mast leans to take the leaf that is offered to it.
    const lean = offer?.on === 'sail' && offer.index === piece.place.index ? 0.07 : 0
    stamp(g, sheets.makings[piece.kind], seat.x, seat.y, piece.squash * 0.1 + lean)
  }
  for (const piece of resting) {
    if (piece.place.on !== 'sail') continue
    const seat = seatOf(piece, pieces)
    // A sail bellies downstream when there is wind in it, and a feather shivers.
    stamp(g, sheets.makings[piece.kind], seat.x - billow * 12, seat.y, -billow * 0.1 + piece.squash * 0.1 + piece.swing * 0.2, 1 + billow * 0.14, 1 - piece.squash * 0.2)
  }
  stamp(g, sheets.makings[build.hull], 0, 0)
  if (offer?.on === 'mast') {
    // The hole a mast would go into darkens.
    oval(g, shape.holes[offer.index], shape.deck + HOLE_DROP, 12, 5.4)
    flat(g, INK.line)
  }
  for (const piece of resting) {
    const slot = slotOf(piece, pieces)
    if (!slot || slot.on !== 'deck' || isBlanket(build, slot.index)) continue
    // The berry the gnome has set on its pad is drawn there.
    if (piece.kind === 'berry' && w.show.berry > 0) continue
    const seat = seatOf(piece, pieces)
    // A berry rolls to its place from where it landed.
    stamp(g, sheets.makings[piece.kind], seat.x + piece.roll * 34, seat.y, piece.roll * 4, 1 + piece.squash * 0.25, 1 - piece.squash * 0.25)
  }
  const seat = seatOffset(w), hide = w.stage.gnome.hide
  if (seated) {
    // Turned about with the boat, he faces the way it came.
    drawGnome(g, sheets.gnome, w.stage.gnome, seat, lamp)
  }
  for (const piece of resting) {
    const slot = slotOf(piece, pieces)
    if (!slot || slot.on !== 'deck' || !isBlanket(build, slot.index)) continue
    const at = seatOf(piece, pieces)
    // A blanket lies over his seat, and over his head while he is under it.
    stamp(g, sheets.makings[piece.kind], at.x, at.y - (seated ? hide * BLANKET_UP : 0), 1.25, 1 + piece.squash * 0.2, 1 - piece.squash * 0.2)
  }
  g.restore()
  if (wet && boat.mode !== 'fall') stamp(g, sheets.props.curl, x, water, 0, (MAKINGS[build.hull].hw + 18) / 172, 1)
  if (boat.wet > 0 && inHand) {
    // Lifted out of the water it drips: drops of unequal size, falling from under the hull.
    g.beginPath()
    for (const [dx, r] of [[-90, 3], [-14, 4.4], [66, 2.6]] as const) {
      const dy = y + 10 + ((w.time * 190 + dx * 3) % 60)
      g.moveTo(x + dx + r, dy)
      g.ellipse(x + dx, dy, r, r * 1.7, 0, 0, Math.PI * 2)
    }
    flat(g, 'rgba(246,240,222,0.9)')
  }
}
