import { ICICLE } from './blocks'
import { lampFrame, lampGlass } from './figures'
import { BLOCK_H, BOUGH, GROUND_Y } from './ground'
import { RIM_GROW, rimPush, type Cast, type Lamp, type Night, type Patch } from './night'
import { all, bar, placed, poly, type Print, type Shape } from './print'
import { addThing, outlineOf, type Drawn, type Pulls } from './things'
import type { LiveHole, Piece } from './toy'
import { MELT_S } from './toyPieces'

// How the view lays the things, the open water, the lamps and their light:
// each is a handful of fills for the whole clearing, however much stands in it.

/** A thing as it is drawn now. Every value the rules keep for it moves something here: its squash, its wobble, its turn, its warmth, its cap and its spin. */
export function drawnOf(piece: Piece, t: number, held: boolean, lit: boolean): Drawn {
  const afloat = piece.rest.place === 'afloat' && piece.mode === 'rest'
  const bob = afloat ? Math.sin(t * 2.1) * 3 : 0
  // A thing melting away sinks into a puddle; a warm one sags towards it.
  const melt = piece.mode === 'melt' ? Math.min(1, piece.age / MELT_S) : 0
  // Clear ice, which a thumb takes for good, shows it all the way: it is down to half its height before it goes.
  const sag = piece.kind === 'berry' || piece.kind === 'cloudy' ? 0 : piece.heat * (piece.kind === 'clear' ? 0.5 : 0.14)
  const flat = melt * 0.88 + sag
  const grip = held ? 1.04 : 1
  return {
    kind: piece.kind,
    len: piece.len,
    x: piece.x,
    y: piece.y + bob + (BLOCK_H / 2) * flat,
    turn: piece.turn + piece.wobble * 0.012 + (bob ? Math.sin(t * 1.3) * 0.03 : 0) + (piece.mode === 'hat' ? 0.08 : 0),
    sx: (1 - piece.squash * 0.05) * grip * (1 + melt * 0.25 + (piece.kind === 'clear' ? piece.heat * 0.1 : 0)),
    sy: (1 + piece.squash * 0.08) * grip * (1 - flat),
    hung: piece.kind === 'icicle' && piece.rest.place === 'hung' && piece.mode === 'rest',
    dent: piece.dent,
    cap: piece.cap ? piece.capAge : 0,
    heat: piece.heat,
    // A snowball afloat turns slowly.
    spin: piece.spin + (afloat && piece.kind === 'ball' ? t * 0.4 : 0),
    jiggle: -piece.wobble * 0.5,
    lit,
  }
}

/** One of the bough's icicles, hanging from its place. */
export function boughIcicle(to: Pulls, index: number, t: number): void {
  const root = BOUGH[index]
  addThing(to, { kind: 'icicle', len: ICICLE, x: root.x, y: root.y + BLOCK_H / 2, turn: Math.sin(t * 0.9 + index * 1.7) * 0.02, sx: 1, sy: 1, hung: true, dent: [], cap: 0, heat: 0, spin: 0, jiggle: 0, lit: false })
}

/**
 * Lays the pulls: at most six fills, and none for a pull with nothing in it. `between` is drawn after the
 * paper of the things and before their inks: whoever is behind the wall, seen where no block hides them and
 * through the ink of clear ice.
 */
export function lay(p: Print, pulls: Pulls, between?: () => void): void {
  if (pulls.under.length > 0) p.fill('paper', all(...pulls.under))
  if (pulls.lit.length > 0) p.fill('light', all(...pulls.lit))
  between?.()
  if (pulls.red.length > 0) p.fill('red', all(...pulls.red))
  if (pulls.blue.length > 0) p.fill('blue', all(...pulls.blue))
  if (pulls.cloud.length > 0) p.fill('cloud', all(...pulls.cloud))
  if (pulls.top.length > 0) p.fill('paper', all(...pulls.top))
}

/**
 * Where someone behind the wall shows: the air above the bank, less every thing that stands there, which hides
 * them. `through` is a block of clear ice that does not: the one a nose is pressed on.
 */
export function behindWall(standing: readonly Piece[], through: number, x0: number, y0: number, x1: number): Shape {
  return (g) => {
    poly(x0, y0, x1, y0, x1, GROUND_Y, x0, GROUND_Y)(g)
    for (const piece of standing) {
      if (piece.id === through) continue
      // Wound the other way round, so that it is a part left out of the air.
      const w = (piece.kind === 'icicle' ? 18 : piece.len) / 2, h = BLOCK_H / 2
      poly(piece.x - w, piece.y - h, piece.x - w, piece.y + h, piece.x + w, piece.y + h, piece.x + w, piece.y - h)(g)
    }
  }
}

/** Open water: the overprint, one fill for every hole. The ice that takes a hole back grows in from its two ends. */
export function drawHoles(p: Print, holes: readonly LiveHole[]): void {
  if (holes.length === 0) return
  p.fill('ink', all(...holes.map((hole) => placed(hole.x, hole.y, hole.angle, 1, 1, bar(0, 0, Math.max(0, hole.len * (1 - hole.closing)), BLOCK_H * (1 - hole.closing * 0.5), 6)))))
}

/** A shape laid on the ground in front of the wall as a thing's light is. */
const laid = (cast: Cast, shape: Shape): Shape => (g) => {
  g.save()
  g.transform(cast.a, 0, cast.c, cast.d, cast.e, cast.f)
  shape(g)
  g.restore()
}
/**
 * The light that has crossed an icicle: three shards, each from its own place along the icicle's foot and none
 * touching another, no two the same length, width or lean, the longest reaching into the next row. They spread
 * as they go and meet nowhere, so they are splinters of light and no arrowhead. Each is four corners, from its
 * near end to its far end.
 */
export const SHARDS: readonly (readonly number[])[] = [
  [-13, -17, -8, -19, -17, 14, -23, 12],
  [-2, -8, 3, -9, 5, 35, -1, 31],
  [10, -23, 14, -21, 23, 3, 18, 4],
]
const shards: Shape = all(...SHARDS.map((corners) => poly(...corners)))
/** The rim of light of a thing that stops the light: its outline, grown, pushed away from its lamp and outward from the wall. */
const rim = (patch: Patch): Shape => {
  const push = rimPush(patch.cast)
  return laid(patch.cast, placed(push.x, push.y, 0, 1, 1, outlineOf(patch.kind, patch.len, RIM_GROW)))
}

/**
 * The lamps' light on the ground in front of the wall. Each thing the light comes through lies there in its
 * own outline, row by row as the wall stands: whole through clear ice, red through the berry block, broken
 * into specks with no edge through cloudy ice, and as spreading shards through an icicle. A thing that stops
 * the light lies there too, unlit, with a rim of light on its two far sides, an arc and never a ring: a snow
 * block as its own shape, a snowball as a round spot. Light is bare paper left out of the night's pull, on the snow and on the ice alike, and an unlit shape
 * is the night's sheet stamped back through it. At most four stamps and fills.
 */
export function drawLight(p: Print, night: Night, stampNight: () => void): void {
  const shapeOf = (patch: Patch, grow = 0): Shape => laid(patch.cast, patch.tone === 'fan' ? shards : outlineOf(patch.kind, patch.len, grow))
  const dark = night.patches.filter((patch) => patch.tone === 'dark')
  const whole = night.patches.filter((patch) => patch.tone !== 'soft' && patch.tone !== 'dark')
  if (whole.length + dark.length > 0) {
    p.fill('light', all(...whole.map((patch) => shapeOf(patch)), ...dark.map(rim)))
  }
  const red = night.patches.filter((patch) => patch.tone === 'red')
  if (red.length > 0) p.fill('red', all(...red.map((patch) => shapeOf(patch))))
  const soft = night.patches.filter((patch) => patch.tone === 'soft')
  if (soft.length > 0) p.fill('spark', all(...soft.map((patch) => shapeOf(patch, 3))))
  if (dark.length > 0) p.within(all(...dark.map((patch) => shapeOf(patch))), stampNight)
}

/** Where a lamp is drawn from, and how large: one hung in a hollow hangs from the block over it, one with no hollow stands on the bank. */
function lampAt(lamp: Lamp, index: number, t: number): { x: number; y: number; turn: number; scale: number } {
  if (lamp.hung) return { x: lamp.x, y: lamp.y - BLOCK_H / 2, turn: Math.sin(t * 1.3 + index * 2.1) * 0.07, scale: 0.64 }
  return { x: lamp.x, y: GROUND_Y - 66 * 0.9, turn: 0, scale: 0.9 }
}

/** The lamps that are hung and lit: every frame is one fill of the overprint, and every glass one fill of bare paper. */
export function drawLamps(p: Print, lamps: readonly Lamp[], t: number): void {
  if (lamps.length === 0) return
  const each = (part: (x: number, y: number, turn: number) => Shape): Shape => all(...lamps.map((lamp, index) => {
    const at = lampAt(lamp, index, t)
    return placed(at.x, at.y, 0, at.scale, at.scale, part(0, 0, at.turn))
  }))
  p.fill('ink', each(lampFrame))
  p.fill('light', each(lampGlass))
}
