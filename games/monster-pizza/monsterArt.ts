import { CHARACTERS, type Customer } from './customers'
import { INK, colourIn, figure, line, outline, plain, solid, sprite, stamp, type Pen, type Sprite } from './marker'
import { restPose, type Pose } from './pose'
import { makeRng, seedFrom } from './rng'
import { bounds, ellipse, smooth, type Ring } from './shapes'

// How each customer is drawn. A customer stands with its feet at (0, 0) and
// grows upwards, so y is negative up its body. The coloured-in body is drawn
// once into a sprite; the face, the arms and the funniest part are pen lines
// drawn each frame from the pose, so they can move. A face says what its
// owner thinks: brows that lift, press and tilt, pupils that swell and
// shrink, cheeks that colour, and a mouth with a grin, a line, a pout, a
// small round o and a wide open shout.

export { restPose, type Pose }

function bodyRing(who: Customer): Ring {
  const { halfWidth: W, height: H } = CHARACTERS[who]
  switch (who) {
    case 'bim':
      return smooth([-0.86 * W, 30, -1.0 * W, -0.5 * H, -0.62 * W, -0.94 * H, 0, -H, 0.62 * W, -0.94 * H, 1.0 * W, -0.5 * H, 0.86 * W, 30], 5)
    case 'grum':
      return smooth([-0.84 * W, 30, -1.0 * W, -0.36 * H, -0.74 * W, -0.8 * H, -0.3 * W, -H, 0.3 * W, -H, 0.74 * W, -0.8 * H, 1.0 * W, -0.36 * H, 0.84 * W, 30], 5)
    case 'fizz':
      return smooth([-0.9 * W, 30, -0.86 * W, -0.3 * H, -0.44 * W, -0.44 * H, -0.4 * W, -0.62 * H, -0.92 * W, -0.8 * H, -0.56 * W, -H, 0.56 * W, -H, 0.92 * W, -0.8 * H, 0.4 * W, -0.62 * H, 0.44 * W, -0.44 * H, 0.86 * W, -0.3 * H, 0.9 * W, 30], 4)
    case 'mops': {
      // Fur: the outline goes in and out all the way round.
      const ring = ellipse(0, -0.48 * H, W, 0.56 * H, 52)
      for (let i = 0; i < ring.length; i += 2) {
        const k = (i / 2) % 2 === 0 ? 1.045 : 0.955
        ring[i] *= k
        ring[i + 1] = -0.48 * H + (ring[i + 1] + 0.48 * H) * k
      }
      return ring
    }
    case 'ooze':
      return smooth([-0.7 * W, 30, -1.02 * W, -0.06 * H, -0.84 * W, -0.3 * H, -1.0 * W, -0.52 * H, -0.6 * W, -0.9 * H, -0.2 * W, -0.86 * H, 0.1 * W, -H, 0.56 * W, -0.9 * H, 0.98 * W, -0.56 * H, 0.86 * W, -0.26 * H, 1.04 * W, -0.04 * H, 0.72 * W, 30], 5)
  }
}

/** Where the eyes sit, in its own units, and how big they are. */
export function eyes(who: Customer): { x: number; y: number; r: number }[] {
  const { halfWidth: W, height: H } = CHARACTERS[who]
  switch (who) {
    case 'bim':
      return [{ x: 0, y: -H - 86, r: 50 }]
    case 'grum':
      return [{ x: -0.22 * W, y: -0.8 * H, r: 38 }, { x: 0.22 * W, y: -0.8 * H, r: 38 }]
    case 'fizz':
      return [{ x: -0.4 * W, y: -0.89 * H, r: 31 }, { x: 0.4 * W, y: -0.89 * H, r: 31 }]
    case 'mops':
      return [{ x: -0.34 * W, y: -0.68 * H, r: 42 }, { x: 0.34 * W, y: -0.68 * H, r: 42 }]
    case 'ooze':
      return [{ x: -0.38 * W, y: -0.82 * H, r: 44 }, { x: 0.3 * W, y: -0.88 * H, r: 52 }]
  }
}

export type CustomerSprites = { body: Sprite }

/** Draws the parts of a customer that never change shape, once, at `density` device pixels to a unit. */
export function customerSprites(who: Customer, density: number): CustomerSprites {
  const c = CHARACTERS[who]
  const ring = bodyRing(who)
  const seed = seedFrom(who)
  const body = sprite(bounds(ring), density, 40, (g) => {
    const rng = makeRng(seed)
    colourIn(g, ring, c.body, rng, who === 'grum' ? 0.35 : -0.5, 24)
    // The paler patch on its front, coloured in the other way.
    // Grum's is his belly, which goes on wobbling after every move, so it is drawn each frame (`belly`, below).
    if (who !== 'grum') {
      const patch = who === 'fizz' ? ellipse(0, -0.2 * c.height, 0.5 * c.halfWidth, 0.14 * c.height) : ellipse(0, -0.22 * c.height, 0.56 * c.halfWidth, 0.2 * c.height)
      g.save()
      g.globalCompositeOperation = 'source-over'
      solid(g, patch, c.patch)
      g.restore()
      line(g, patch.slice(0, patch.length / 2 + 4), rng, 5, INK)
    }
    // Spots, stripes and tufts: a child gives every monster something of its own.
    // Grum's spots and Bim's patches are darker lumps of its own colour with no line round them, each a different size, so none reads as a ring or a row of bars.
    if (who === 'grum' || who === 'bim') {
      g.save()
      g.globalCompositeOperation = 'source-over'
      const spots = who === 'grum' ? ([[-0.62, -0.5, 24], [0.6, -0.56, 19], [-0.5, -0.24, 17], [0.66, -0.28, 22]] as const) : ([[-0.52, -0.62, 20], [0.5, -0.5, 15], [-0.3, -0.36, 13]] as const)
      for (const [sx, sy, r] of spots) {
        const x = sx * c.halfWidth, y = sy * c.height
        solid(g, smooth([x - r, y - r * 0.2, x - r * 0.4, y - r * 0.9, x + r * 0.6, y - r * 0.7, x + r, y + r * 0.1, x + r * 0.4, y + r * 0.8, x - r * 0.6, y + r * 0.6], 4), who === 'grum' ? '#6f44bd' : '#178f83')
      }
      g.restore()
    }
    // Ooze's blotches are runs of paler ooze with no line round them: lumpy at the top and hanging down.
    if (who === 'ooze') {
      g.save()
      g.globalCompositeOperation = 'source-over'
      for (const [sx, sy] of [[-0.7, -0.4], [0.72, -0.36], [0.5, -0.14]] as const) {
        const x = sx * c.halfWidth, y = sy * c.height
        solid(g, smooth([x - 12, y - 20, x + 9, y - 23, x + 15, y - 4, x + 11, y + 14, x + 3, y + 30, x - 8, y + 18, x - 16, y + 2], 4), '#bdf06a')
      }
      g.restore()
    }
    outline(g, ring, rng, 9)
  })
  return { body }
}

/** A colour a little darker than this one, for a fold in something of that colour. */
function shade(hex: string): string {
  const part = (i: number) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.78).toString(16).padStart(2, '0')
  return `#${part(1)}${part(3)}${part(5)}`
}

/** How far an eye closes before it is drawn shut: below this share of its height it is a lid and no longer a flattened white. */
const SHUT = 0.4

function eye(g: Pen, x: number, y: number, r: number, pose: Pose, rolls = false, lid = '#ffffff'): void {
  const open = 1 - pose.blink
  g.save()
  g.translate(x, y)
  if (open < SHUT) {
    // Shut, an eye is still a round ball, with its lid down over it in the customer's own colour and the crease of the lid low across it. Never a flat slit, which under a level brow would make two bars, and never a bare curve, which on a stalk would make a letter.
    plain(g, ellipse(0, 0, r, r, 20), lid, 6)
    // The lid's edge is a darker sliver of its own colour, low on the ball and filled: no line is drawn on a shut eye, since a curve on a ball is a face.
    const edge: number[] = []
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (0.16 + (i / 8) * 0.68)
      edge.push(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86)
    }
    for (let i = 8; i >= 0; i--) {
      const a = Math.PI * (0.16 + (i / 8) * 0.68)
      edge.push(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86 - r * 0.2 * Math.sin((i / 8) * Math.PI))
    }
    solid(g, edge, shade(lid))
    g.restore()
    return
  }
  g.scale(1, open)
  plain(g, ellipse(0, 0, r, r, 20), '#ffffff', 6)
  const p = r * 0.42 * pose.pupil
  // The eye that rolls goes round on top of where it was looking, and never out of its white.
  let lx = pose.lookX + (rolls ? pose.rollX : 0), ly = pose.lookY + (rolls ? pose.rollY : 0)
  const far = Math.hypot(lx, ly)
  if (rolls && far > 1) { lx /= far; ly /= far }
  const px = lx * (r - p) * 0.8, py = ly * (r - p) * 0.8
  solid(g, ellipse(px, py, p, p, 14), INK)
  // The dot of light a child always remembers to leave.
  solid(g, ellipse(px - p * 0.34, py - p * 0.36, p * 0.26, p * 0.26, 8), '#ffffff')
  g.restore()
}

/**
 * A brow over an eye: a thick arc that hugs the top of the eye, a little way
 * off it. It lifts off the eye, presses down onto it and tilts about it, and
 * it always goes with its eye: it is never a level bar by itself on the wall
 * over a head, and never long enough to lie across anything else on the
 * head. `side` is -1 for the left eye, 1 for the right, 0 for a single one.
 */
function brow(g: Pen, x: number, y: number, r: number, side: number, pose: Pose, seed: number): void {
  const off = r + 5 + (pose.brow + 1) * 0.15 * r
  // A cross brow dips towards the nose and a worried one rises there.
  const tilt = side === 0 ? pose.frown * 0.25 : -side * pose.frown * 0.4
  const arc: number[] = []
  for (let i = 0; i <= 4; i++) {
    const a = -Math.PI * 0.72 + (i / 4) * Math.PI * 0.44 + tilt
    arc.push(x + Math.cos(a) * off, y + Math.sin(a) * off)
  }
  line(g, arc, makeRng(seed), 9)
}

function mouth(g: Pen, who: Customer, pose: Pose): void {
  const c = CHARACTERS[who]
  const y = -c.mouthAt * c.height
  const full = c.halfWidth * (who === 'fizz' ? 0.42 : 0.5)
  // Drawn in, the mouth is a small round o whatever else it was doing.
  const w = full * (1 - pose.pucker * 0.62)
  const rng = makeRng(seedFrom(who) + 7)
  const bend = pose.smile * 26
  if (pose.mouth < 0.06 && pose.pucker < 0.3) {
    // Shut: a grin, a flat line or a pout, and a wobble in it when the smile has gone.
    const wob = pose.smile < -0.2 ? 8 : 0
    line(g, [-w, y - bend * 0.5, -w * 0.5, y + bend * 0.7 + wob, 0, y + bend - wob, w * 0.5, y + bend * 0.7 + wob, w, y - bend * 0.5], rng, 8)
    return
  }
  const h = 14 + Math.max(pose.mouth, pose.pucker * 0.6) * full * 0.9
  // Open: a grin hangs from its corners, a wail is pulled down at them.
  const top = -h * 0.16 - bend * 0.3, low = h + bend * 0.2
  const hole = pose.pucker > 0.3 ? ellipse(0, y + h * 0.4, w, h * 0.62, 18) : smooth([-w, y - bend * 0.4, -w * 0.5, y + low, w * 0.5, y + low, w, y - bend * 0.4, w * 0.4, y + top, -w * 0.4, y + top], 4)
  plain(g, hole, '#5c1f33', 8)
  if (pose.tongue > 0.02) {
    const out = pose.tongue * c.height * (c.funniest === 'tongue' ? 0.5 : 0.22)
    plain(g, smooth([-w * 0.42, y + h * 0.5, -w * 0.36, y + h * 0.6 + out, 0, y + h * 0.7 + out * 1.08, w * 0.36, y + h * 0.6 + out, w * 0.42, y + h * 0.5], 4), '#ff7d9c', 6)
  } else if (pose.pucker <= 0.3) plain(g, ellipse(0, y + low * 0.8, w * 0.42, h * 0.24, 12), '#ff7d9c', 4)
  // Two blunt teeth: a monster, and a friendly one.
  if (pose.pucker <= 0.3) {
    solid(g, [-w * 0.5, y - 2 - bend * 0.2, -w * 0.2, y - 2 + top * 0.5, -w * 0.35, y + h * 0.34], '#ffffff')
    solid(g, [w * 0.5, y - 2 - bend * 0.2, w * 0.2, y - 2 + top * 0.5, w * 0.35, y + h * 0.34], '#ffffff')
  }
}

/** A drop of drool from the corner of the mouth: it hangs longer the more it wants the pizza. */
function drool(g: Pen, who: Customer, pose: Pose): void {
  if (pose.drool <= 0.05) return
  const c = CHARACTERS[who]
  const x = c.halfWidth * (who === 'fizz' ? 0.3 : 0.36), y = -c.mouthAt * c.height + 16
  const long = 14 + pose.drool * 46
  plain(g, smooth([x - 7, y, x + 7, y, x + 11, y + long, x, y + long + 13, x - 11, y + long], 4), '#bfe6fb', 4, '#5aa7d6')
}

function cheeks(g: Pen, who: Customer, pose: Pose): void {
  if (pose.cheeks <= 0.03) return
  const c = CHARACTERS[who]
  const y = -c.mouthAt * c.height - 18, x = c.halfWidth * (who === 'fizz' ? 0.6 : 0.68)
  g.save()
  g.globalAlpha = Math.min(1, pose.cheeks)
  for (const side of [-1, 1]) solid(g, ellipse(side * x, y, 30, 20, 14), '#ff7a7a')
  g.restore()
}

function arm(g: Pen, who: Customer, side: -1 | 1, hand: { x: number; y: number } | null): void {
  const c = CHARACTERS[who]
  const sx = side * c.halfWidth * 0.86, sy = -c.height * (who === 'fizz' ? 0.36 : 0.44)
  // At rest a hand lies on the counter's edge.
  const to = hand ?? { x: side * (c.halfWidth + 30), y: -64 }
  const rng = makeRng(seedFrom(who) + 11 + side)
  const mx = (sx + to.x) / 2 + side * 20, my = Math.max(sy, to.y) + 36
  line(g, [sx, sy, mx, my, to.x, to.y], rng, 13, INK)
  plain(g, ellipse(to.x, to.y, 23, 23, 14), c.body, 6)
}

/**
 * Bim's eye stalk, from the top of its head to under its eye, in its own
 * units. Knotted, it grows, so the knot shows under the eye. The line never
 * crosses itself: a loop with a line through it would read as a sign.
 */
export function stalk(part: number, upset: number): number[] {
  const H = CHARACTERS.bim.height, top = -H - 60 - upset * STALK_GROWS
  // Knotted, it straightens: the bend it swings with at other times would make a hook of it.
  return [0, -H + 8, part * 36 * (1 - upset), -H - 36 - upset * 10, part * 12, top]
}

/**
 * The knot in Bim's stalk: one filled lump on the line, as a child draws a
 * knot in a string. It sits on the stalk itself, at its middle, however the
 * stalk is bent: a lump beside a hooked line would read as a sign. Nothing
 * sticks out of it. Null when there is none.
 */
export function knot(part: number, upset: number): { lump: Ring } | null {
  if (upset <= 0.02) return null
  const line = stalk(part, upset)
  // The middle of the curve the pen draws through those three points.
  const x = 0.25 * line[0] + 0.5 * line[2] + 0.25 * line[4], y = 0.25 * line[1] + 0.5 * line[3] + 0.25 * line[5], r = 19 * upset
  // Round and a little lumpy, with no waist: a pinched lump across a stalk would read as a bow.
  const lump: Ring = []
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2, far = r * (0.92 + 0.1 * Math.sin(k * 2.4))
    lump.push(x + Math.cos(a) * far, y + Math.sin(a) * far * 0.86)
  }
  return { lump }
}

/** The part of each customer that overdoes everything. */
function funniest(g: Pen, who: Customer, pose: Pose, under: boolean): void {
  const c = CHARACTERS[who]
  const rng = makeRng(seedFrom(who) + 3)
  const W = c.halfWidth, H = c.height, p = pose.part
  if (who === 'bim' && under) {
    line(g, stalk(p, pose.upset), rng, 11)
    const tied = knot(p, pose.upset)
    if (tied) {
      solid(g, tied.lump, INK)
    }
  }
  if (who === 'grum' && !under) {
    figure(g, [-0.5 * W, -0.96 * H, -0.42 * W, -1.12 * H - p * 12, -0.28 * W, -0.99 * H], '#fff2c9', rng, 0.4, 6, 10)
    figure(g, [0.5 * W, -0.96 * H, 0.42 * W, -1.12 * H - p * 12, 0.28 * W, -0.99 * H], '#fff2c9', rng, 0.4, 6, 10)
  }
  if (who === 'fizz' && under) {
    for (const k of [-1, 0, 1]) {
      // Drooping, each one hangs over to its own side with its knob below the top of the head.
      const droop = pose.upset
      const tx = (k === 0 ? 0.34 * droop : k * (0.5 + 0.42 * droop)) * W + p * 20 * (k + 0.5) * (1 - droop), ty = -H - 76 + Math.abs(k) * 18 + droop * (118 - Math.abs(k) * 22)
      // The three stalks rise from the middle of its crown, between its eyes, so none runs across a brow.
      line(g, [k * 0.12 * W, -H + 8, (k * 0.3 * W + tx) / 2 + 8, -H - 40 + droop * 8, tx, ty], rng, 8)
      plain(g, ellipse(tx, ty, 15, 15, 12), '#ffd21f', 5)
    }
  }
  if (who === 'mops' && !under) {
    for (const side of [-1, 1]) {
      const lift = p * 0.9
      const ex = side * (0.8 * W + lift * 30), ey = -0.86 * H - lift * 100
      figure(g, smooth([side * 0.62 * W, -0.92 * H, ex + side * 44, ey - 8, ex + side * 68, ey + 120 - lift * 90, ex + side * 18, ey + 144 - lift * 104], 4), c.body, rng, side * 0.6, 8, 17)
    }
    // Every hair on end: short strokes standing straight out of the fur, all the way round.
    if (pose.upset > 0.02) {
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * (0.94 + (i / 13) * 1.12), cos = Math.cos(a), sin = Math.sin(a)
        const out = 1.05 + (0.12 + (i % 3) * 0.04) * pose.upset
        line(g, [cos * W * 1.05, -0.48 * H + sin * 0.56 * H * 1.05, cos * W * out, -0.48 * H + sin * 0.56 * H * out], rng, 6)
      }
    }
  }
}

/**
 * Ooze drips: a drop of it gathers at its side, hangs longer, lets go and
 * falls behind the counter, again and again. `pose.drip` is how far through
 * one drop it is.
 */
function drip(g: Pen, pose: Pose): void {
  const u = pose.drip
  if (u <= 0.01) return
  const c = CHARACTERS.ooze
  const hang = Math.min(1, u / 0.6), fall = u < 0.6 ? 0 : (u - 0.6) / 0.4
  const x = 0.93 * c.halfWidth, y = -0.2 * c.height + hang * 14 + fall * fall * 190, long = 10 + hang * 22
  // Thin where it hangs from and round where it is heaviest; filled, with no line round it.
  solid(g, smooth([x - 4, y - long, x + 4, y - long, x + 10, y - 2, x + 9, y + 10, x, y + 15, x - 9, y + 10, x - 10, y - 2], 4), '#7fbf1f')
}

/** How much taller Bim's stalk stands while it is knotted, in its own units. */
const STALK_GROWS = 56
/** Where Fizz's neck is thinnest, as a share of its height: a limp neck bends there. */
const NECK_AT = 0.53

/** The outline of Grum's belly for a swing of his funniest part: it swells, sags and shifts to one side. */
export function bellyRing(part: number): Ring {
  const c = CHARACTERS.grum, p = Math.max(-1.5, Math.min(2.2, part))
  return ellipse(p * 5, -0.22 * c.height + Math.abs(p) * 4, 0.56 * c.halfWidth * (1 + 0.07 * p), 0.2 * c.height * (1 + 0.05 * p))
}

/**
 * Grum's belly: the pale patch on his front, drawn each frame so that it
 * swells and swings with `part` after the rest of him has stopped. A pepper
 * on his pizza lights it like a lamp, and steam stands out of both ears.
 */
function belly(g: Pen, pose: Pose): void {
  const c = CHARACTERS.grum, W = c.halfWidth, H = c.height, p = Math.max(-1.5, Math.min(2.2, pose.part))
  const rng = makeRng(seedFrom('grum') + 5)
  const patch = bellyRing(pose.part)
  solid(g, patch, c.patch)
  const lit = pose.upset
  if (lit > 0.02) {
    g.save()
    g.globalAlpha = Math.min(1, lit)
    solid(g, patch, '#ffd84a')
    solid(g, ellipse(p * 5, -0.22 * H, 0.3 * W, 0.11 * H, 16), '#fff3b0')
    g.restore()
    // Specks of light over it, uneven, as a child draws a lamp that is on: filled, with no strokes fanning out.
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (1.1 + i * 0.2), far = 1.22 + (i % 2) * 0.12 + 0.12 * lit
      solid(g, ellipse(Math.cos(a) * 0.56 * W * far, -0.22 * H + Math.sin(a) * 0.2 * H * (far + 0.14), 7 + (i % 2) * 3, 6, 8), '#ffd84a')
    }
    // Steam from both ears: two puffs a side, the second further out and bigger.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const out = (0.4 + i * 0.5) * lit, r = (18 + i * 13) * (0.5 + 0.5 * lit)
        // It goes up more than out: the card hangs close beside him, and steam must not go under it.
        const x = side * (0.8 * W + out * 20), y = -0.86 * H - out * 110 - i * 6
        plain(g, smooth([x - r, y, x - r * 0.5, y - r * 0.8, x + r * 0.3, y - r, x + r, y - r * 0.2, x + r * 0.6, y + r * 0.7, x - r * 0.4, y + r * 0.6], 3), '#ffffff', 4, '#8fa9bf')
      }
    }
  }
  line(g, patch.slice(0, patch.length / 2 + 4), rng, 5, INK)
}

function place(g: Pen, x: number, y: number, size: number, pose: Pose): void {
  g.translate(x, y)
  g.scale(size, size)
  g.translate(0, -pose.lift)
  g.rotate(pose.lean)
  g.scale(pose.sx, pose.sy)
}

/**
 * Draws one customer with its feet at (x, y), `size` times its own size: the
 * body and the face. The view clips this at the counter, so the feet are
 * behind it. Returns how many figures it drew, for the grown-up handle.
 */
export function drawCustomer(g: Pen, who: Customer, sprites: CustomerSprites, x: number, y: number, size: number, pose: Pose): number {
  g.save()
  place(g, x, y, size, pose)
  const limp = who === 'fizz' && pose.upset > 0.02
  if (limp) {
    // A neck gone limp as a noodle: the body stands, and the head hangs over from where the neck is thinnest.
    const c = CHARACTERS.fizz, neck = -NECK_AT * c.height
    g.save()
    g.beginPath()
    g.rect(-c.halfWidth * 3, neck, c.halfWidth * 6, c.height)
    g.clip()
    stamp(g, sprites.body)
    g.restore()
    g.translate(0, neck)
    g.rotate(pose.upset * LIMP)
    g.translate(0, -neck)
    funniest(g, who, pose, true)
    g.save()
    g.beginPath()
    g.rect(-c.halfWidth * 3, neck - c.height, c.halfWidth * 6, c.height)
    g.clip()
    stamp(g, sprites.body)
    g.restore()
    // The bend itself, coloured in over the cut.
    solid(g, ellipse(0, neck, 0.43 * c.halfWidth, 0.3 * c.halfWidth, 14), c.body)
  } else {
    funniest(g, who, pose, true)
    stamp(g, sprites.body)
  }
  if (who === 'grum') belly(g, pose)
  if (who === 'ooze') drip(g, pose)
  funniest(g, who, pose, false)
  cheeks(g, who, pose)
  const all = eyes(who)
  all.forEach((e, i) => {
    const ex = e.x + (who === 'bim' ? pose.part * 12 : 0), ey = e.y - (who === 'bim' ? pose.upset * STALK_GROWS : 0)
    eye(g, ex, ey, e.r, pose, i === 0, CHARACTERS[who].body)
    brow(g, ex, ey, e.r, all.length === 1 ? 0 : i === 0 ? -1 : 1, pose, seedFrom(who) + 19 + i)
  })
  mouth(g, who, pose)
  drool(g, who, pose)
  g.restore()
  return limp ? 6 : who === 'grum' ? 5 : 4
}

/** How far Fizz's head hangs over when its neck goes limp, in radians. */
const LIMP = 0.7

/**
 * Where a point of Fizz's head is when its neck has gone limp, in its own units: the head has turned about the
 * neck. For anyone else, and for Fizz with its neck up, the point is where it was.
 */
export function onLimpHead(who: Customer, pose: Pose, x: number, y: number): { x: number; y: number } {
  if (who !== 'fizz' || pose.upset <= 0.02) return { x, y }
  const neck = -NECK_AT * CHARACTERS.fizz.height, a = pose.upset * LIMP, cos = Math.cos(a), sin = Math.sin(a)
  return { x: x * cos - (y - neck) * sin, y: neck + x * sin + (y - neck) * cos }
}

/** The arms, drawn after the counter so a hand can reach over it onto the table. */
export function drawArms(g: Pen, who: Customer, x: number, y: number, size: number, pose: Pose): number {
  g.save()
  place(g, x, y, size, pose)
  arm(g, who, -1, pose.handL)
  arm(g, who, 1, pose.handR)
  g.restore()
  return 2
}
