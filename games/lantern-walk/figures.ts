import { BADGER_FACE, STREAM_ARRIVES, cheeksOf } from './badger'
import { FOX_SIZE, NECK, NECK_TURN, neckLift } from './fox'
import { PLACES } from './layout'
import { noise, type Sketch } from './sketch'
import type { Wood } from './wood'

// The four large creatures, written into a sketch from the wood's numbers
// and the time. Each has its own tempo, its own weight and its own funniest
// part, and no two share a move (view.test.ts):
//   owl        slow and heavy; the head is everything
//   fox        still in the body, quick in the ears and the tail
//   badger     rocks and sniffs; the cheeks
//   hedgehog   jitters; the spines ripple and the nose never rests
// Every pose value the model computes is read here, and every creature's
// eyes are on the lantern while it is lit. Each also has a `glance`: touched
// by a light it is not answering just now, it blinks (and the fox's ears
// both flick), so no creature is shown lit and does nothing.

/** How far a glance shuts the eyes: quite shut as it begins, open again before it is over. */
const wink = (glance: number) => Math.min(1, glance * 1.7)

const PI = Math.PI

/** A quick blink every `every` seconds: 0 open, 1 shut. */
export function blink(t: number, every: number, offset: number): number {
  const phase = (((t + offset) % every) + every) % every
  return phase < 0.16 ? 1 - Math.abs(phase / 0.08 - 1) : 0
}

/** A pulse that rises and falls once every `every` seconds, for `lasts` seconds: 0, up to 1, back to 0. */
export function now(t: number, every: number, lasts: number, offset: number): number {
  const phase = (((t + offset) % every) + every) % every
  return phase < lasts ? Math.sin((phase / lasts) * PI) : 0
}

const gaze = { x: 0, y: 0 }
const spot = { x: 0, y: 0 }

/** Which way an eye at the pen's own `x`, `y` looks to see the lantern, as a step of `reach` in the pen's own placement, so a head that is turned over or mirrored still looks the right way. In the dark it looks straight out. */
export function look(s: Sketch, wood: Wood, x: number, y: number, reach: number): { x: number; y: number } {
  gaze.x = 0; gaze.y = 0
  if (!wood.lit) return gaze
  s.at(x, y, spot)
  const far = Math.hypot(wood.lantern.x - spot.x, wood.lantern.y - spot.y)
  s.back(wood.lantern.x - spot.x, wood.lantern.y - spot.y, gaze)
  const length = Math.hypot(gaze.x, gaze.y) || 1
  const pull = (Math.min(1, far / 90) * reach) / length
  gaze.x *= pull; gaze.y *= pull
  return gaze
}

/** One eye: a scraped-clear white, a ring round it, and a pupil of wax. `lid` shuts it from 0 to 1. */
export function eye(s: Sketch, x: number, y: number, rx: number, ry: number, lid: number, lookX: number, lookY: number, pupil: number, turn = 0): void {
  if (rx < 1.5) return
  const open = 1 - Math.min(1, lid) * 0.93
  if (open > 0.14) {
    s.oval('whites', x, y, rx, ry * open, turn, 14)
    const squeeze = Math.min(1, rx / (pupil * 1.2))
    s.oval('pupils', x + lookX * squeeze, y + lookY * open, pupil * squeeze, Math.min(pupil, ry * open * 0.86), 0, 10)
  } else s.arc(x, y, rx, ry * 0.5, 0.15, PI - 0.15, 6, turn)
  s.arc(x, y, rx + 3, ry + 3, -PI * 1.02, 0.02, 8, turn)
}

// --- The owl -----------------------------------------------------------------

/**
 * The drops on the back of the owl's head, from the head's middle: where each is and how large. Scattered: their
 * heights, their sizes and the gaps between them do not go turn and turn about (layout.test.ts holds it).
 */
export const OWL_BACK: readonly (readonly [number, number, number])[] = [[-84, -18, 9], [-62, 12, 10], [-30, 24, 6], [12, -8, 5], [38, -26, 11], [80, 10, 7]]

/**
 * The three feathers of the owl's tail, which hang under the branch: each from, to. No two are of one length or
 * lean, and the two gaps between them are unlike (layout.test.ts holds it), so they are no tally of three.
 */
export const OWL_TAIL: readonly (readonly [number, number, number, number])[] = [[-24, 9, -33, 40], [-8, 12, -5, 56], [20, 10, 31, 34]]

export function drawOwl(s: Sketch, wood: Wood, t: number): void {
  const owl = wood.owl
  const breathe = Math.sin(t * 1.05) * 0.018
  // A slow question of a tilt, now and then; it never hurries.
  const tilt = Math.sin(t * 0.47) * 0.05 + now(t, 9.4, 1.6, 2.2) * 0.3
  // Peering, it leans off the branch towards the cold lantern, as far as its feet let it.
  const side = wood.lantern.x >= PLACES.owl.x ? 1 : -1
  s.push(PLACES.owl.x, PLACES.owl.y)
  // Its tail under the branch: three feathers, no two of one length, lean or distance apart.
  for (const [x, y, toX, toY] of OWL_TAIL) s.line([x, y, toX, toY])
  for (const foot of [-1, 1]) {
    s.arc(foot * 30, -3, 15, 10, PI, PI * 2, 5)
    // Three claws over the branch, splayed, each its own length: no three equal uprights.
    s.line([foot * 20, -2, foot * 16, 5]); s.line([foot * 30, -1, foot * 31, 10]); s.line([foot * 40, -2, foot * 46, 7])
  }
  s.push(0, 0, owl.lean * side * 0.2)
  s.push(0, 0, 0, 1, 1 + breathe)
  s.oval('hide', 0, -96, 98, 106)
  s.oval('lines', 0, -96, 98, 106, 0, 22)
  s.arc(-98, -100, 34, 70, -1.0, 1.1, 8, 0.1)
  s.arc(98, -100, 34, 70, PI - 1.1, PI + 1.0, 8, -0.1)
  // The breast feathers: a few drop shapes, each its own size and lean, scattered and never in a row.
  for (let k = 0; k < 7; k++) {
    const x = [-34, 4, 38, -14, 26, -40, 12][k] + noise(k, 31) * 5, y = [-112, -122, -104, -78, -70, -62, -40][k] + noise(k, 32) * 4
    const size = 7 + 5 * (0.5 + 0.5 * noise(k, 33)), lean = noise(k, 34) * 0.5
    s.push(x, y, lean)
    s.shape('lines', [0, -size, size * 0.7, 0, 0, size * 1.1, -size * 0.7, 0, 0, -size])
    s.pop()
  }
  s.pop()
  // The head: all of its comedy. Yaw slides the face off the side of it; roll turns it over like a wheel, and a rush spins it like a top.
  s.push(0, -196 + Math.sin(t * 1.05 - 0.6) * 2.4, owl.roll + owl.whirl * PI * 2 + tilt * (owl.away ? 0.2 : 1))
  s.oval('hide', 0, 0, 108, 84)
  s.oval('lines', 0, 0, 108, 84, 0, 22)
  s.line([-88, -46, -104, -96, -60, -70]); s.line([88, -46, 104, -96, 60, -70])
  const squash = Math.cos(owl.yaw * PI * 0.5), faceX = owl.yaw * 92
  if (squash > 0.1) {
    // Lit, and wanting the dark: it narrows its eyes against the candle. In the dark, and at a lantern that gives no light, they open to full size.
    const peering = owl.peering >= 0
    const narrow = wood.lit && !peering ? 0.4 : 0
    const wide = peering ? 1.12 + owl.lean * 0.1 : wood.lit ? 1 : 1.1
    const shut = blink(t, 6.3, 0)
    const asleep = 1 - wood.awake[2]
    for (const eyeSide of [-1, 1]) {
      const lid = Math.max(asleep, narrow, wink(owl.glance), eyeSide < 0 ? owl.lidLeft : owl.lidRight, peering ? 0 : eyeSide < 0 ? shut : blink(t, 6.3, -0.22))
      const ex = faceX + eyeSide * 46 * squash
      const at = look(s, wood, ex, -6, 15)
      eye(s, ex, -6, 40 * squash * wide, 40 * wide, lid, at.x, at.y, 15)
    }
    // The beak, which clacks.
    const gape = owl.clack * 12
    s.line([faceX - 10 * squash, 22, faceX, 40 - gape * 0.3, faceX + 10 * squash, 22])
    if (gape > 1) s.line([faceX - 8 * squash, 30 + gape * 0.4, faceX, 44 + gape, faceX + 8 * squash, 30 + gape * 0.4])
    s.line([faceX - 34 * squash, -50, faceX, -34, faceX + 34 * squash, -50])
  }
  // Where the face is not, the back of the head shows its feathers: drops scattered like the breast's, each its own size and lean.
  for (let k = 0; k < OWL_BACK.length; k++) {
    const [x, y, size] = OWL_BACK[k], lean = noise(k, 36) * 0.6
    if (Math.abs(x - faceX) <= 90 * squash + 16) continue
    s.push(x, y, lean)
    s.shape('lines', [0, -size, size * 0.7, 0, 0, size * 1.2, -size * 0.7, 0, 0, -size])
    s.pop()
  }
  s.pop()
  s.pop()
  s.pop()
}

// --- The fox -----------------------------------------------------------------

/** The band across the fox's brush, in the brush's own units: from, through, to. One bow, and no zigzag. */
export const BRUSH_BAND: readonly number[] = [-25, -82, -1, -70, 26, -84]

/** The band across the brush of the fox as it walks, creeps and leaps, in that brush's own units: the same one bow. */
export const LONG_BRUSH_BAND: readonly number[] = [-32, -72, -13, -61, 7, -74]
/** The one wrinkle over the fox's nose as it squints: from, through, to. A bow, not a level stroke. */
export const NOSE_WRINKLE: readonly number[] = [-13, 17, 1, 8, 12, 15]

const FOX_HEAD = [-62, -92, -24, -50, 0, -46, 24, -50, 62, -92, 70, -36, 86, -4, 58, 12, 30, 36, 0, 60, -30, 36, -58, 12, -86, -4, -70, -36]
const FOX_FACE = [...FOX_HEAD, FOX_HEAD[0], FOX_HEAD[1]]

function foxFace(s: Sketch, wood: Wood, t: number, lidLeft: number, lidRight: number, aside: number): void {
  const fox = wood.fox
  // The ears are the quick part: one flicks, then the other, never together.
  const flickLeft = now(t, 3.7, 0.22, 0) * 9 + fox.glance * 9, flickRight = now(t, 5.3, 0.22, 1.4) * 9 + fox.glance * 9
  s.shape('hide', FOX_HEAD)
  s.line(FOX_FACE)
  s.line([-56 - flickLeft, -80, -44, -48]); s.line([56 + flickRight, -80, 44, -48])
  const asleep = 1 - wood.awake[1]
  for (const side of [-1, 1]) {
    const at = look(s, wood, side * 32, -10, 8)
    const lid = Math.max(asleep, fox.squint * 0.8, wink(fox.glance), side < 0 ? lidLeft : lidRight)
    eye(s, side * 32, -10, 19, 13, lid, aside !== 0 ? aside * 9 : at.x, aside !== 0 ? -3 : at.y, 7.5, side * 0.28)
    s.line([side * 22, 38, side * 56, 30]); s.line([side * 22, 44, side * 56, 48])
  }
  // The nose wrinkles before a sneeze and at a sniff.
  const wrinkle = fox.squint * 5
  s.line([-17, 24 - wrinkle, 0, 36 - wrinkle, 17, 24 - wrinkle])
  // One wrinkle, bowed over the nose: never two level strokes one above the other.
  if (wrinkle > 1) s.bend(NOSE_WRINKLE[0], NOSE_WRINKLE[1] - wrinkle, NOSE_WRINKLE[2], NOSE_WRINKLE[3] - wrinkle, NOSE_WRINKLE[4], NOSE_WRINKLE[5] - wrinkle * 0.6, 5)
  s.oval('pupils', 0, 44 - wrinkle, 10, 8, 0, 8)
  s.oval('lines', 0, 44 - wrinkle, 10, 8, 0, 8)
}

/** Sneaking, leaping or nose-down: long and low, the head pushed out ahead and the brush held straight up behind. */
function foxLong(s: Sketch, wood: Wood, t: number): void {
  const fox = wood.fox
  const cycle = fox.stride * PI * 2
  const flying = fox.air > 0.05
  // On its nose, the whole fox tips forward over its front paws and the brush stands up.
  s.push(46 - fox.dive * 62, 0, fox.dive * 0.75)
  s.push(-46, 0)
  s.push(-70, -84, -0.15 + Math.sin(cycle) * 0.1 - fox.dive * 0.3, 1 + fox.puff * 0.5)
  s.oval('hide', -12, -44, 22, 50)
  s.oval('lines', -12, -44, 22, 50)
  // The band where the tip begins: one bowed stroke across the brush, as on the sitting fox.
  s.bend(LONG_BRUSH_BAND[0], LONG_BRUSH_BAND[1], LONG_BRUSH_BAND[2], LONG_BRUSH_BAND[3], LONG_BRUSH_BAND[4], LONG_BRUSH_BAND[5], 5)
  s.pop()
  const dip = flying ? 0 : Math.abs(Math.sin(cycle)) * 5
  for (let i = 0; i < 4; i++) {
    const hip = [-58, -38, 26, 46][i], phase = cycle + i * PI * 0.5
    const foot = flying ? hip + (i < 2 ? -30 : 30) : hip + Math.sin(phase) * 22
    const lift = flying ? 16 : Math.max(0, Math.cos(phase)) * 14
    s.line([hip, -44, (hip + foot) / 2 + 7, -22, foot, -lift])
  }
  s.oval('hide', -10, -62 + dip, 70, 34)
  s.oval('lines', -10, -62 + dip, 70, 34, 0, 20)
  s.push(54, -92 + dip + fox.shake * Math.sin(t * 44) * 4, 0.2, 0.62)
  foxFace(s, wood, t, 0.3, 0.3, 0)
  s.pop()
  s.pop()
  s.pop()
}

export function drawFox(s: Sketch, wood: Wood, t: number): void {
  const fox = wood.fox
  const lift = fox.air * (fox.mode === 'sneeze' ? 14 : 58)
  // Walking, leaping, or creeping up to a lantern that gives no light, it is long and low.
  const long = fox.mode === 'walk' || fox.mode === 'pounce' || (fox.mode === 'puddle' && fox.beat >= 3) || fox.creep > 0
  if (long) {
    s.push(fox.x, PLACES.fox.y - lift, 0, fox.facing * FOX_SIZE, FOX_SIZE)
    foxLong(s, wood, t)
    s.pop()
    return
  }
  // Sitting. Before it has seen red it sits half turned away with one eye on the lantern; after a walk it
  // sits with its nose in the air and both eyes on anything else. Tipped over, it lies on its side.
  const pretending = fox.mode === 'pretend'
  const away = wood.lantern.x >= fox.x ? -1 : 1
  const side = -away
  // Lying on its side it draws itself in a little, so it is no longer than its room.
  s.push(fox.x, PLACES.fox.y - lift + fox.over * 12 * FOX_SIZE, 0, FOX_SIZE * (1 - fox.over * 0.2))
  s.push(0, -126, fox.over * 1.4 * side)
  s.push(0, 126)
  // The brush stands up beside it, and a sneeze puffs it to twice the size.
  // Puffed up it stands stiff: the swish comes back as the puff goes down, so the big brush never leaves the fox's room.
  const swish = (Math.sin(t * 2.3) * 0.07 + now(t, 4.9, 0.5, 0.8) * 0.22) * (1 - Math.min(1, fox.puff))
  const big = 1 + fox.puff
  s.push((74 - (big - 1) * 36) * fox.brush, -2, swish * (fox.brush >= 0 ? 1 : -1), big * (fox.brush >= 0 ? 1 : -1), big)
  // A brush, not a ring: narrow where it joins, fat in the middle, and a ragged tip of its own colour.
  s.oval('hide', 0, -58, 30, 58)
  s.shape('lines', [-8, 0, -25, -28, -30, -60, -23, -90, -11, -103, -13, -115, -3, -107, 2, -116, 8, -106, 17, -111, 15, -97, 26, -78, 30, -50, 22, -22, 8, 0])
  // The band where the tip begins: one bowed stroke across the brush.
  s.bend(BRUSH_BAND[0], BRUSH_BAND[1], BRUSH_BAND[2], BRUSH_BAND[3], BRUSH_BAND[4], BRUSH_BAND[5], 6)
  s.line([-9, -44, -5, -28]); s.line([9, -56, 12, -40])
  if (fox.puff > 0.2) s.fringe(0, -58, 30, 58, PI * 1.1, PI * 1.9, 9, 9 * fox.puff, 0)
  s.pop()
  s.oval('hide', 6, -76, 62, 82)
  s.oval('lines', 6, -76, 62, 82, 0, 20)
  s.line([-28, -116, -15, -100, -26, -87, -11, -74, -22, -60])
  // A front paw: on the ground, or out over the puddle, or shaken dry.
  const pawX = -31 + side * fox.paw * 46, pawY = -3 - fox.paw * 20 + fox.shake * Math.sin(t * 48) * 9
  s.line([-24, -44, pawX + 5, pawY - 1]); s.line([6, -44, 4, -4])
  s.arc(pawX, pawY, 13, 8, PI, PI * 2, 4); s.arc(-1, -3, 13, 8, PI, PI * 2, 4)
  // The head: tilted further and further at a light it cannot make out, stretched to a lantern that gives none, jerked back when the glass knocks.
  // Stretched right out, the head turns to put the muzzle first, and its tip is where `foxNose` says: on the glass, if the fox stands near enough.
  const reachX = fox.reach * NECK * side - fox.recoil * 26 * side, reachY = fox.reach * (10 + neckLift(fox.raise))
  const tip = fox.tilt * 1.15 * side
  const level = 1 - fox.reach
  s.push(-10 + reachX, -160 + reachY + Math.sin(t * 1.6) * 1.5 * level, (tip + (pretending ? away * 0.34 : away * 0.12) * (1 - fox.tilt)) * level - side * NECK_TURN * fox.reach)
  if (pretending) foxFace(s, wood, t, 0.25, 0.25, away)
  else foxFace(s, wood, t, away < 0 ? 0.35 : 0.9, away < 0 ? 0.9 : 0.35, 0)
  s.pop()
  s.pop()
  s.pop()
  s.pop()
}

// --- The badger --------------------------------------------------------------

/** The stripe through the badger's right eye, in the head's own units: a closed patch, its first point also its last. */
export const BADGER_STRIPE: readonly number[] = [13, -62, 21, -42, 22, -20, 13, 12, 31, 20, 47, 4, 51, -16, 43, -53, 13, -62]
/** The badger's teeth as it grins: where each hangs from the lip, how wide and how long. Five, with a gap where a sixth is gone. */
export const BADGER_TEETH: readonly (readonly [number, number, number])[] = [[-41, 8, 9], [-30, 11, 15], [-16, 12, 18], [14, 7, 11], [26, 9, 8]]

export function drawBadger(s: Sketch, wood: Wood, t: number): void {
  const badger = wood.badger
  const asleep = badger.mode === 'asleep', grin = badger.mode === 'grin'
  const breath = badger.breath, manner = badger.manner
  const rock = Math.sin(t * 0.8) * 0.03
  const back = asleep ? -0.3 : grin ? -0.08 : 0
  // It starts up with a hop: a small one when a shrug is to follow, so that hop, shrug and head never leave its room.
  s.push(PLACES.badger.x, PLACES.badger.y - Math.sin(badger.start * PI) * (badger.shrug > 0 ? 8 : 16), back + rock)
  s.oval('hide', -72, -9, 32, 14); s.oval('hide', 80, -9, 32, 14)
  s.oval('lines', -72, -9, 32, 14, 0, 12); s.oval('lines', 80, -9, 32, 14, 0, 12)
  const belly = 1 + badger.snore * 0.06 + Math.sin(t * 1.3) * 0.012
  s.oval('hide', 0, -92, 130, 100)
  s.oval('lines', 0, -92, 130 * belly, 100, 0, 24)
  s.fringe(0, -92, 130 * belly, 100, PI * 1.06, PI * 1.94, 15, 13, 0.3)
  s.arc(0, -72, 72, 62, 0.35, PI - 0.35, 10)
  // Its paws are folded on its belly, at the ends of two short arms; a shrug lifts both.
  const shrug = Math.sin(Math.min(1, (1 - badger.shrug) * 2.2) * PI) * (badger.shrug > 0 ? 1 : 0)
  for (const side of [-1, 1]) {
    s.bend(side * 112, -128 - shrug * 16, side * (96 + shrug * 26), -74 - shrug * 30, side * (54 + shrug * 44), -70 - shrug * 34, 6)
    s.oval('lines', side * (40 + shrug * 62), -68 - shrug * 38, 19, 13, side * 0.2, 10)
  }
  // The head, and the cheeks that are the point of it.
  const full = Math.max(breath, badger.farPuff * 0.6)
  const big = 1 + (manner === 0 ? 0.34 : 0.1) * full
  const sniff = now(t, 3.9, 0.7, 0.5)
  // The head swells downwards and sideways as the cheeks fill: its crown stays where it is.
  const tall = 1 + (big - 1) * 0.55
  s.push(14, -176 - shrug * 8 + 63 * (tall - 1), sniff * 0.07 * Math.sin(t * 21) + badger.about * 0.16, big, tall)
  s.oval('hide', 0, 0, 86, 63)
  s.oval('lines', 0, 0, 86, 63, 0, 22)
  const lidDown = 1 - wood.awake[5]
  for (const side of [-1, 1]) {
    s.arc(side * 64, -46, 16, 14, PI * 0.95, PI * 2.05, 5)
    // The stripe through each eye is one closed patch from brow to cheek, wider at the cheek: no wedge stands open over the eye.
    s.shape('lines', BADGER_STRIPE.map((v, i) => (i % 2 ? v : v * side)))
    // The dark stripe through each eye, hatched with three strokes that slope, each its own length: nothing level, nothing even.
    s.line([side * 17, -54, side * 40, -40]); s.line([side * 21, -30, side * 35, -34]); s.line([side * 19, -2, side * 44, 12])
    const shut = Math.max(lidDown, wink(badger.glance), asleep || (manner === 2 && breath > 0.15) ? 1 : grin ? 0.55 : blink(t, 4.4, side * 0.1))
    const at = look(s, wood, side * 33, -12, 4)
    // As the cheeks fill, the eyes cross; after a miss they go from side to side, looking for the light.
    const lookX = badger.about !== 0 ? badger.about * 5 : breath > 0.1 && manner === 0 ? -side * 5 : at.x
    eye(s, side * 33, -12, 12, 12, shut, lookX, badger.about !== 0 ? 0 : at.y, 5)
  }
  s.oval('pupils', 0, 27 + sniff * 3, 17, 12, 0, 10)
  s.oval('lines', 0, 27 + sniff * 3, 17, 12, 0, 10)
  if (grin) {
    s.line([-48, 36, 48, 36]); s.bend(-48, 36, 0, 78, 48, 36, 10)
    // Every tooth is a closed peg hanging from the lip, no two alike, with a gap where one is gone: no open zigzag.
    for (const [x, wide, long] of BADGER_TEETH) s.shape('lines', [x, 37, x + wide, 37, x + wide - 1.5, 35 + long, x + wide * 0.5, 37 + long, x + 1.5, 35 + long, x, 37])
  } else if (asleep) s.oval('lines', 0, 50, 9 + badger.snore * 5, 5 + badger.snore * 9, 0, 10)
  else if (badger.raspberry > 0.02) {
    // The raspberry: the lips flap.
    const flap = Math.sin(t * 60) * 4 * badger.raspberry
    s.bend(-20, 46, 0, 52 + flap, 20, 46, 6); s.bend(-20, 46, 0, 60 - flap, 20, 46, 6)
  } else if (breath > 0.02 && manner === 1) s.oval('lines', 34, 44, 8, 5, 0, 8)
  else if (breath > 0.02 && manner === 2) {
    s.oval('pupils', 0, 52, 14 + 12 * breath, 6 + 30 * breath, 0, 12)
    s.oval('lines', 0, 52, 14 + 12 * breath, 6 + 30 * breath, 0, 12)
  } else s.oval('lines', 0, 48, 6, 6, 0, 8)
  // The cheeks: half full as it sits, which is what it wants, and filling as it draws breath.
  const cheeks = cheeksOf(badger)
  if (cheeks > 0.02) for (const side of [-1, 1]) s.arc(side * 60, 26, 16 + 20 * cheeks, 14 + 16 * cheeks, side > 0 ? -PI * 0.6 : PI * 0.4, side > 0 ? PI * 0.6 : PI * 1.6, 8)
  s.pop()
  s.pop()
}

/** The badger's breath on its way to the candle, a puff that goes nowhere, and the smoke after the flame: lines in the air, written in stage units. */
export function drawBreath(s: Sketch, wood: Wood): void {
  const badger = wood.badger
  const mouthX = BADGER_FACE.x + 2, mouthY = BADGER_FACE.y + 40
  const dx = wood.lantern.x - mouthX, dy = wood.lantern.y - mouthY
  const far = Math.hypot(dx, dy) || 1
  const nx = -dy / far, ny = dx / far
  if (badger.mode === 'draw' && badger.manner === 1) {
    // The thin stream from the corner of the mouth, reaching further as the breath goes on.
    const reach = Math.min(1, badger.breath / STREAM_ARRIVES)
    const points: number[] = []
    for (let i = 0; i <= 10; i++) {
      const along = (i / 10) * reach
      const wave = Math.sin(i * 1.3 + badger.t * 22) * 5
      points.push(mouthX + 30 + (dx - 30) * along + nx * wave, mouthY + dy * along + ny * wave)
    }
    s.line(points)
  }
  if (badger.mode === 'grin' && badger.t < 0.45 && !wood.lit && wood.smoke < 0.6) {
    // The puff itself: three curls that cross the gap and are gone.
    const along = 0.15 + (badger.t / 0.45) * 0.85
    for (let k = -1; k <= 1; k++) {
      const x = mouthX + dx * along + nx * k * 22, y = mouthY + dy * along + ny * k * 22
      s.arc(x, y, 15, 9, -1.2, 2.6, 6, Math.atan2(dy, dx))
    }
  }
  // A miss, or a puff from far off: curls that leave the mouth and die a little way out.
  const lost = badger.mode === 'miss' ? Math.min(1, badger.t / 0.5) : badger.farPuff > 0 ? 1 - badger.farPuff : -1
  if (lost >= 0 && lost < 1) {
    for (let k = -1; k <= 1; k++) s.arc(mouthX + 40 + lost * 130, mouthY - 6 + k * 18 * (0.4 + lost), 13 * (1 - lost * 0.5), 8, -1.2, 2.6, 6, 0)
  }
  if (!wood.lit && wood.smoke < 2.6) {
    const rise = wood.smoke * 46, x = wood.lantern.x, y = wood.lantern.y - 48
    const points: number[] = []
    for (let i = 0; i <= 8; i++) points.push(x + Math.sin(i * 0.9 + wood.smoke * 3) * (3 + i * 1.4), y - (rise * i) / 8)
    s.line(points)
  }
}

// --- The hedgehog --------------------------------------------------------------

/** The hedgehog is drawn at this size, so that it keeps under the fox's lane (layout.ts). */
const HOG_SIZE = 0.82

export function drawHedgehog(s: Sketch, wood: Wood, t: number): void {
  const hog = wood.hedgehog
  const y = PLACES.hedgehog.y
  if (hog.mode === 'ball') {
    // A ball of spines, rolling.
    s.push(hog.x, y - 68 * HOG_SIZE, hog.roll * PI * 2 * hog.way, HOG_SIZE)
    s.oval('hide', 0, 0, 56, 56)
    s.oval('lines', 0, 0, 52, 52, 0, 18)
    s.fringe(0, 0, 52, 52, 0, PI * 2, 22, 12, 0.4)
    s.fringe(0, 0, 30, 30, 0.2, PI * 2 + 0.2, 12, 11, 0.4)
    s.pop()
    return
  }
  const tiptoe = hog.mode === 'tiptoe', moving = hog.mode === 'trot' || hog.mode === 'tiptoe' || hog.mode === 'toPole'
  const cycle = hog.stride * PI * 2
  const rise = tiptoe ? 17 : 0
  // It is never quite still: a jitter in the body, and spines that ripple when it shivers.
  const jitter = noise(Math.floor(t * 11), 5) * (0.7 + hog.shiver * 2.6)
  const bob = moving ? Math.abs(Math.sin(cycle)) * 4 : 0
  s.push(hog.x + jitter, y, 0, hog.facing * HOG_SIZE, HOG_SIZE)
  // The wrong way up: flipped over like a pancake, on its spines, feet in the air and waving. It never leaves its own room on the way over.
  s.push(0, -64, Math.sin(hog.upside * PI) * 0.22, 1, 1 - 2 * hog.upside)
  s.push(0, 64)
  // Sitting, the back end is down and the front paws are off the ground.
  s.push(-60, 0, -hog.sit * 0.3)
  s.push(60, 0)
  for (let i = 0; i < 4; i++) {
    const hip = [-46, -20, 22, 48][i]
    const wave = hog.upside > 0.5 ? Math.sin(t * 13 + i * 1.7) * 10 : 0
    const swing = moving ? Math.sin(cycle + i * PI) * (tiptoe ? 6 : 11) : wave
    // Standing at the dark's edge it holds one front foot up, ready to go.
    const lift = moving ? Math.max(0, Math.cos(cycle + i * PI)) * (tiptoe ? 15 : 6) : i === 3 && hog.sit < 0.1 && hog.upside < 0.1 ? 9 + Math.sin(t * 2.1) * 2 : 0
    // A front paw rubs the nose it has just bumped.
    if (i === 3 && hog.rub > 0) s.line([hip, -24, hip + 30, -30, 98 + Math.sin(t * 17) * 5, -46])
    else s.line([hip, -24 - rise, hip + 7, -12 - rise * 0.5 - lift, hip + swing, -lift])
  }
  s.push(0, -rise - bob)
  s.oval('hide', 0, -52, 88, 54)
  s.arc(0, -52, 88, 54, PI * 0.98, PI * 2.1, 14)
  s.line([-88, -50, -80, -24, -40, -19, 40, -19, 74, -26])
  const ripple = hog.shiver * 0.5 + now(t, 5.6, 0.9, 1.1) * 0.25
  s.fringe(0, -52, 88, 54, PI * 1.02, PI * 1.86, 15, 21, -0.3, ripple)
  s.fringe(0, -52, 62, 36, PI * 1.06, PI * 1.8, 11, 17, -0.3, ripple)
  s.fringe(0, -52, 36, 19, PI * 1.12, PI * 1.74, 7, 14, -0.3, ripple)
  // What it has spiked rides low on its back, among the spines; the newest one bounces as it lands.
  for (let i = 0; i < 3; i++) {
    if (!((hog.carries >> i) & 1)) continue
    const ax = -44 + i * 30, ay = -92 - (i === 1 ? 8 : 0) - hog.spiked * 7
    s.oval('hide', ax, ay, 11, 10)
    s.oval('lines', ax, ay, 11, 10, 0, 9)
    s.line([ax, ay - 10, ax + 3, ay - 16])
  }
  const nose = (hog.sniff + now(t, 2.9, 0.5, 0)) * Math.sin(t * 26) * 3.2 - hog.sniff * 7
  s.line([58, -84, 90, -60 + nose * 0.5, 108, -44 + nose])
  s.line([108, -44 + nose, 86, -27, 72, -24])
  s.oval('pupils', 111, -46 + nose, 8, 8, 0, 8)
  s.oval('lines', 111, -46 + nose, 8, 8, 0, 8)
  const at = look(s, wood, 76, -58, 4)
  eye(s, 76, -58, 11, 11, Math.max(1 - wood.awake[4], hog.rub * 0.8, wink(hog.glance), blink(t, 3.1, 1.7)), at.x, at.y, 5)
  s.arc(56, -84, 10, 13, PI, PI * 2, 4)
  s.pop()
  s.pop()
  s.pop()
  s.pop()
  s.pop()
  s.pop()
}
