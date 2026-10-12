import { blink, eye, look, now } from './figures'
import { APPLES, APPLE_R, APPLE_Y, appleShown } from './hedgehog'
import { MOTHS, PLACES, WORMS, perch, wormPlace } from './layout'
import { MOTH_REACH, bedTilt } from './moths'
import { noise, type Sketch } from './sketch'
import { WORM_MIDDLE, WORM_REACH, lampShows, wormAt } from './worms'
import { SPIDER_REACH, type Wood } from './wood'

// The small things of the wood, written into one sketch: the moths, the
// glow-worms, the spider, the owl's loose feather and the red things the red
// light shows the hedgehog. Each is a part of its own: the view draws them
// all in the scraped line, and then, whole and in full, each part that a
// patch of the lantern touches. A patch never cuts a creature in two, and
// the distance a thing is shown lit at is the distance its model answers
// at: `MOTH_REACH`, `WORM_REACH` and the spider's round are read by both.
// A worm is also shown in full by its own lit lamp, and by no other's.

const PI = Math.PI
/** How far round a worm's lamp its own light scrapes the wax clear. */
export const LAMP = 38
/** The moths are drawn at this size: wings, a body and eyes that read at the smaller of the two surface sizes. */
const MOTH_SIZE = 1.5

const at = { x: 0, y: 0 }

/** Where worm `i`'s lamp is now, on the stage: the middle of the little round its own light scrapes clear. */
export function lampPlace(wood: Wood, i: number, out: { x: number; y: number }): { x: number; y: number } {
  wormAt(wood, i, out)
  out.x -= 34; out.y -= 44
  return out
}

/** Whether a patch of the lantern touches a round thing at `x`, `y` of radius `r`. */
export function touched(wood: Wood, x: number, y: number, r: number): boolean {
  return wood.touching(x, y, r) !== null
}

/** Which of the small things a pass writes: all of them, those drawn lit, or those the glow of a hung lantern lies on without lighting them. */
export type Pass = boolean | 'under'

/**
 * Whether a small round thing belongs to a pass. Lit means answered: a thing a patch touches is drawn lit while
 * the lantern is carried or stands in the wood. On the hook the glow lights nobody but what is `own` (the moths
 * that ride it, once it shows; a worm by its own lamp): the rest it lies on is written again over the glow as
 * the dark shows it.
 */
function inPass(wood: Wood, pass: Pass, x: number, y: number, r: number, own = false): boolean {
  if (pass === false) return true
  if (pass === true) return own || (!wood.hung && touched(wood, x, y, r))
  return wood.hung && wood.glow > 0 && !own && touched(wood, x, y, r)
}

/**
 * Writes the small things. With `lit` false, all of them, as the dark shows them. With `lit` true, only those
 * drawn lit, each whole, and the red things only where red lies on them. With `under`, those a hung lantern's
 * glow lies on and does not light.
 */
export function drawSmall(s: Sketch, wood: Wood, t: number, lit: Pass): void {
  drawSpider(s, wood, t, lit)
  drawFeather(s, wood, lit)
  drawWorms(s, wood, t, lit)
  drawMoths(s, wood, lit)
  if (lit === true) drawApples(s, wood)
}

// --- The moths -----------------------------------------------------------------

function drawMoths(s: Sketch, wood: Wood, lit: Pass): void {
  const moths = wood.moths
  const open = wood.awake[0]
  for (let i = 0; i < MOTHS; i++) {
    const moth = moths.list[i]
    // On the hook the moths that ride the yellow glow are lit by it once it shows, and nobody else is.
    if (!inPass(wood, lit, moth.x, moth.y, MOTH_REACH, wood.hung && moth.mode === 'on' && wood.glow > 0)) continue
    const flying = moth.mode === 'out' || moth.mode === 'back' || moth.mode === 'orbit' || moth.mode === 'bump' || moth.mode === 'toCold'
    const walking = moth.mode === 'walk' || moth.mode === 'walkBack'
    const asleep = moth.mode === 'asleep'
    // On the bark each twitches on its own count; in the air the wings blur; on the light they open and shut slowly; folded, they are a sliver.
    const twitch = now(moth.beat, 2.3 + (i % 4) * 0.7, 0.18, i)
    const wide = flying ? 6 + 20 * Math.abs(Math.sin(moth.beat * 23)) : moth.mode === 'on' ? 16 + 3 * Math.sin(moth.beat * 2.4 + i) : moth.mode === 'cold' ? 12 + Math.sin(moth.beat * 2.4 + i) : walking ? 12 + 3 * Math.sin(moth.beat * 18) : 11 + twitch * 3 + moths.glance * 9
    const span = wide * (1 - 0.78 * moth.fold)
    const home = perch(i)
    const lean = flying ? Math.sin(moth.beat * 9) * 0.3 : moth.mode === 'bark' || moth.mode === 'cold' ? noise(i, 11) * 0.18 : walking ? Math.sin(moth.beat * 18) * 0.12 : asleep ? bedTilt(i) : noise(i, 4) * 0.7
    // Asleep they stand folded in two loose heaps, each leaning its own way and swelling as the snore goes round.
    const size = MOTH_SIZE * moth.size * (asleep ? 1 + moths.snore * 0.06 : 1)
    s.push(moth.x, moth.y, lean + moth.spin * PI * 2, size)
    s.shape('hide', [0, -13, span + 3, -19, span + 2, 3, span * 0.7, 14, 0, 13, -span * 0.7, 14, -span - 2, 3, -span - 3, -19])
    // Two wings a side: a large rounded one above and a small one below, with a spot in each large one.
    for (const side of [-1, 1]) {
      s.bend(side * 3, -8, side * span * 0.7, -24, side * span, -15, 5)
      s.bend(side * span, -15, side * (span + 3), -2, side * 3, 1, 5)
      s.bend(side * 3, 2, side * span * 0.8, 3, side * span * 0.66, 12, 4)
      s.bend(side * span * 0.66, 12, side * span * 0.3, 15, side * 3, 6, 4)
      if (span > 12) s.oval('lines', side * span * 0.58, -10, 3, 3, 0, 6)
    }
    // The body: a furry head, and a tail in rings.
    s.oval('lines', 0, -9, 4.6, 5, 0, 8)
    s.line([-3.4, -3, -3, 6, 0, 13, 3, 6, 3.4, -3])
    s.line([-3, 2, 3, 2]); s.line([-2.4, 7, 2.4, 7])
    // The feathered feelers lean towards the lantern: the yellow is what they want. In a line at a light they cannot place, they lean in to look.
    // Asleep, the feelers droop.
    const want = wood.lit && !asleep ? Math.max(-1, Math.min(1, (wood.lantern.x - home.x) / 320)) * 6 : 0
    const reach = asleep ? 4 : 11 + moths.peer * 7
    for (const side of [-1, 1]) {
      const tipX = side * (asleep ? 6 : 8) + want, tipY = -11 - reach
      s.bend(side * 2, -13, side * 5 + want * 0.5, -13 - reach * 0.7, tipX, tipY, 4)
      if (!asleep) { s.line([side * 4 + want * 0.4, -18, side * 8 + want * 0.4, -17]); s.line([side * 5.5 + want * 0.7, -22, side * 9.5 + want * 0.7, -20]) }
    }
    if (open > 0.5 && !asleep) {
      s.oval('whites', -3, -10, 2.6, 2.6, 0, 6); s.oval('whites', 3, -10, 2.6, 2.6, 0, 6)
      // Their eyes are on the lantern, like everyone's.
      for (const side of [-3, 3]) {
        const to = look(s, wood, side, -10, 1.4)
        s.oval('pupils', side + to.x, -10 + to.y, 1.1, 1.1, 0, 5)
      }
    } else { s.line([-5, -10, -1, -10]); s.line([1, -10, 5, -10]) }
    s.pop()
  }
}

// --- The glow-worms ------------------------------------------------------------

function drawWorms(s: Sketch, wood: Wood, t: number, lit: Pass): void {
  const worms = wood.worms
  const open = wood.awake[3]
  for (let i = 0; i < WORMS; i++) {
    const home = wormPlace(i)
    wormAt(wood, i, at)
    const x = at.x, y = at.y
    const lamp = lampShows(wood, i)
    if (!inPass(wood, lit, x, y - WORM_MIDDLE, WORM_REACH, lamp)) continue
    const pulse = worms.pulse[i], duck = worms.duck[i]
    const away = y - home.y > 2 || Math.abs(x - home.x) > 2
    // Off the fern it hangs by a thread, or pulls itself up one.
    if (away) s.line([home.x, home.y - 4, (home.x + x) / 2 + Math.sin(t * 2 + i) * 2, (home.y + y) / 2, x, y - 14])
    // On its back after a fall, it waves its feet.
    const fallen = worms.drop.i === i && worms.drop.landed >= 0 && worms.drop.landed < 1.1
    // They inch where they sit, each a little out of step with the next.
    const hump = 3 + 3 * Math.sin(t * 1.3 + i * 1.9) + (fallen ? Math.sin(t * 19) * 3 : 0)
    const slope = away ? 0 : Math.cos((i / (WORMS - 1)) * PI) * 0.4
    s.push(x, y - 6, slope + (fallen ? PI : 0), 1.6, 1.6 * (1 - 0.5 * duck))
    s.shape('hide', [-18, 2, -16, -12, 10, -14, 22, -8, 22, 2])
    // An inchworm: one high loop behind and a low shoulder before it, never two humps alike.
    s.bend(-16, 0, -7, -17 - hump * 1.4, 1, -1, 5)
    s.bend(1, -1, 5, -6 - hump * 0.3, 9, -2, 3)
    s.line([-13, 1, 7, 1])
    s.oval('lines', 15, -6, 8.5, 8.5, 0, 10)
    if (open > 0.5) {
      s.oval('whites', 12, -8, 2.7, 2.7, 0, 6); s.oval('whites', 18.5, -8, 2.7, 2.7, 0, 6)
      for (const ex of [12, 18.5]) {
        const to = look(s, wood, ex, -8, 1.5)
        s.oval('pupils', ex + to.x, -8 + to.y, 1.1, 1.1, 0, 5)
      }
    }
    s.bend(12, -3, 15, 0, 19, -3, 3)
    s.line([16, -11, 21, -20])
    // The lamp held up at the tail: what it wants is to light it. Knocking on it, the stick jerks.
    const up = 15 + 5 * pulse + (lamp ? 0 : Math.sin(t * 0.9 + i) * 1.5) - worms.knock[i] * 6
    s.line([-16, 0, -22, -up])
    const flash = worms.flash[i]
    if (lamp) s.oval('whites', -23, -up - 9, 9 + 6 * pulse + 3 * flash, 9 + 6 * pulse + 3 * flash, 0, 10)
    else {
      // Unlit, the lamp is a bud with a point: a thing on a stalk, not a ring.
      s.shape('lines', [-23, -up - 15, -17, -up - 8, -18, -up - 2, -23, -up + 1, -28, -up - 2, -29, -up - 8, -23, -up - 15])
      // A knock on a lamp that will not light.
      if (worms.knock[i] > 0.3) { s.line([-33, -up - 14, -37, -up - 19]); s.line([-13, -up - 14, -9, -up - 19]) }
    }
    s.pop()
    // Ducked, its leaf is over it; as the leaf lifts, it peeps out from under.
    if (duck > 0.05 && !away) {
      const lift = (1 - duck) * 30
      s.push(x - 6, y - 22 - lift, slope - 0.2)
      s.shape('hide', [-30, 0, 0, -13, 34, 0, 0, 12])
      s.bend(-30, 0, 0, -16, 34, 0, 6); s.bend(-30, 0, 0, 14, 34, 0, 6)
      s.line([-24, 0, 28, 0])
      s.pop()
    }
  }
}

// --- The spider ------------------------------------------------------------------

function drawSpider(s: Sketch, wood: Wood, t: number, lit: Pass): void {
  const x = PLACES.spider.x, y = wood.spiderY
  if (!inPass(wood, lit, x, y, SPIDER_REACH)) return
  // It hangs a little to one side of its thread and holds it with one leg, so thread and body are no straight stroke over a round.
  s.line([x + 3, 70, x + 5 + Math.sin(t * 1.7 + 1) * 2.5, (70 + y) / 2, x + 9, y - 13])
  s.push(x, y, 0.22)
  s.oval('hide', 0, 0, 16, 18)
  s.shape('lines', [-12, -9, 0, -16, 12, -9, 15, 4, 8, 15, -8, 15, -15, 4, -12, -9])
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 4; leg++) {
      const reach = 22 + leg * 3 + Math.sin(t * 3.1 + leg * 1.4 + side) * 2.5
      s.line([side * 11, -8 + leg * 5, side * (reach - 4), -18 + leg * 9, side * reach, -4 + leg * 10])
    }
    const to = look(s, wood, side * 5, -3, 2)
    eye(s, side * 5.5, -3, 4.6, 4.6, blink(t, 5.1, side), to.x, to.y, 2.2)
  }
  s.pop()
}

// --- The owl's feather, and the red things ------------------------------------------

function drawFeather(s: Sketch, wood: Wood, lit: Pass): void {
  const feather = wood.owl.feather
  if (feather.t < 0 || !inPass(wood, lit, feather.x, feather.y, 16)) return
  s.push(feather.x, feather.y, feather.tilt)
  s.shape('hide', [-24, 0, 0, -8, 24, 0, 0, 8])
  s.bend(-24, 0, 0, -11, 24, 0, 6); s.bend(-24, 0, 0, 11, 24, 0, 6)
  s.line([-28, 1, 22, 0])
  for (let k = -2; k <= 2; k++) s.line([k * 8, 0, k * 8 + 4, k % 2 ? -5 : 5])
  s.pop()
}

/** Windfall apples along the hedgehog's way. Only red light shows them, and one that is spiked rides on the hedgehog. */
function drawApples(s: Sketch, wood: Wood): void {
  APPLES.forEach((x, i) => {
    if ((wood.hedgehog.carries >> i) & 1 || !appleShown(wood, i)) return
    s.push(x, APPLE_Y, noise(i, 44) * 0.3)
    s.oval('hide', 0, 0, APPLE_R, 11)
    s.oval('lines', 0, 0, APPLE_R, 11, 0, 10)
    s.line([0, -10, 3, -18]); s.bend(3, -16, 10, -22, 14, -15, 3)
    s.pop()
  })
}
