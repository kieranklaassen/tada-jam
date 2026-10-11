import { beatsOf, type CellKey } from './grid'
import type { Point } from './input'
import { disc, line, ring, sprite, type Item } from './items'
import { TAU, clamp01, ease, hang, puffed, span, squeeze, yawned, type Fish, type Pose } from './motion'
import { PARTS } from './rig'
import { CREATURES, SEABED } from './sea'

// What each cell of the grid looks like (ART.md, the "What is seen" column):
// for every bait and creature, what the creature does with its body, what
// becomes of the bait, and whatever else is drawn for the moment. Every act
// reads its moments from the cell's own timeline (grid.ts), the one the rules
// sound it by, so that a thing is drawn doing what it is heard doing.
// Numbers only: an act changes a pose, a bait or a fish, or adds items to the
// frame's list.

/** Where the anglerfish's lamp is: its own light, and the part of it the hook is brought to. */
export function anglerBulb(pose: Pose): Point {
  const from = hang(pose, PARTS.anglerLamp.x, PARTS.anglerLamp.y), turn = pose.rot + pose.face * pose.a
  const x = PARTS.anglerBulb.x * pose.face, y = PARTS.anglerBulb.y
  return { x: from.x + x * Math.cos(turn) - y * Math.sin(turn), y: from.y + x * Math.sin(turn) + y * Math.cos(turn) }
}

/** The moment of an answer that is being drawn. */
export type Moment = {
  key: CellKey
  /** Seconds since the answer began. */
  t: number
  /** The game's clock, for what shakes or whirrs. */
  now: number
  hook: Point
  /** Where a bait hangs on the hook when nobody has hold of it. */
  at: Point
  /** When each of the answer's sounds falls, in order. */
  beats: readonly number[]
}

/** The bait as it is drawn: where its top is, how it is turned and stretched, and how much of it is left. */
export type BaitPose = { x: number; y: number; rot: number; sx: number; sy: number; a: number; spring: boolean }

export type Act = {
  /** What the creature does with its body. */
  pose?(p: Pose, m: Moment): void
  /** What becomes of the bait while it is on the hook. */
  bait?(b: BaitPose, m: Moment, p: Pose): void
  /** Whatever else is drawn, over the creature. `a` is how much light reaches it there. */
  draw?(out: Item[], m: Moment, p: Pose, a: number): void
  /** What each fish of the shoal does. `middle` is the shoal's middle. */
  fish?(f: Fish, index: number, m: Moment, middle: Pose): void
}

const bump = (t: number, from: number, to: number): number => Math.sin(Math.PI * span(t, from, to))
const mix = (a: number, b: number, u: number): number => a + (b - a) * u
/** Which way the hook is from a body: 1 to its right, -1 to its left. */
const toward = (p: Pose, m: Moment): 1 | -1 => (m.hook.x >= p.x ? 1 : -1)
/** Crumbs flying out from a point, `age` seconds after they started. */
function crumbs(out: Item[], x: number, y: number, age: number, count: number, spread: number, dirX: number, a: number): void {
  if (age < 0 || age > 0.6) return
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU + i * 1.3, far = spread * (0.5 + 0.5 * ((i * 7) % 5) / 4) * age / 0.6
    disc(out, x + Math.cos(angle) * far + dirX * far * 0.9, y + Math.sin(angle) * far * 0.7 + 60 * age * age, 2.6, 2.6, 'ochre', a * (1 - age / 0.6))
  }
}
/** A bubble blown from a point, growing for a while. */
function snoreBubble(out: Item[], x: number, y: number, age: number, a: number): void {
  if (age >= 0 && age < 0.6) ring(out, x, y - 10 * age, 4 + 14 * Math.sin((Math.PI * age) / 0.6), a, 1.6)
}

const mouthOf: Record<'puffer' | 'turtle' | 'shark' | 'angler' | 'blobfish', { x: number; y: number }> = { puffer: PARTS.pufferMouth, turtle: PARTS.turtleMouth, shark: { x: 132, y: 16 }, angler: { x: 66, y: 20 }, blobfish: PARTS.blobfishMouth }

/** The bait carried from the hook to a point and back: `go` is how far it has gone, 0 on the hook and 1 at the point. */
function carried(b: BaitPose, to: Point, go: number): void {
  b.x = mix(b.x, to.x, go)
  b.y = mix(b.y, to.y, go)
}

export const ACTS: Record<CellKey, Act> = {
  // --- The worm ---------------------------------------------------------------
  'worm.shoal': {
    // The whole shoal spins round the worm as a funnel and nibbles it away to nothing.
    fish(f, index, m) {
      const closing = span(m.t, 0, m.beats[2] + 0.4), leaving = ease(span(m.t, 1.2, 1.5))
      const angle = (index / 6) * TAU + m.t * 9, far = mix(60, 20, closing)
      const x = m.at.x + far * Math.cos(angle), y = m.at.y + 14 + far * 0.45 * Math.sin(angle) - 26 * closing * (index % 2 ? 1 : -1) * 0.3
      f.x = mix(x, f.x, leaving)
      f.y = mix(y, f.y, leaving)
      f.face = Math.sin(angle) < 0 ? 1 : -1
      f.rot = 0.5 * Math.cos(angle) * f.face * (1 - leaving)
    },
    bait(b, m) { b.sx = b.sy = 1 - span(m.t, 0, 1.2) },
  },
  'worm.puffer': {
    // It sucks the worm in like a noodle, finds the hook, and blows up round.
    pose(p, m) {
      p.face = toward(p, m)
      const swell = ease(span(m.t, m.beats[1], m.beats[1] + 0.3))
      p.pupil = m.t > 0.6 && m.t < m.beats[1] ? 0.55 : 1
      p.open = swell
      p.sx = p.sy = 1 + 0.55 * swell
      p.x += p.face * 8 * bump(m.t, 0, 0.6)
    },
    bait(b, m, p) {
      const suck = ease(span(m.t, 0.05, 0.6)), mouth = hang(p, mouthOf.puffer.x, mouthOf.puffer.y)
      carried(b, mouth, suck)
      b.rot = mix(0, -Math.PI / 2 * p.face, suck)
      b.sx = 1 - 0.5 * suck
      b.sy = (1 + 0.5 * bump(m.t, 0.05, 0.6)) * (1 - span(m.t, 0.35, 0.65))
    },
  },
  'worm.turtle': {
    // It chews the worm off the hook in three slow bites without ever touching the barb, then blinks.
    pose(p, m) {
      let lunge = 0
      for (let i = 0; i < 3; i++) lunge += bump(m.t, m.beats[i] - 0.14, m.beats[i] + 0.16)
      p.x += p.face * 11 * lunge
      p.rot += 0.05 * lunge
      p.lid = m.t > m.beats[3] + 0.25 && m.t < m.beats[3] + 0.45 ? 1 : 0
      p.a *= 0.3
      p.b *= 0.3
    },
    bait(b, m) {
      // A third of the worm goes with each bite, from the bottom up.
      let left = 3
      for (let i = 0; i < 3; i++) if (m.t >= m.beats[i]) left--
      b.sy = left / 3
    },
    draw(out, m, p, a) {
      const mouth = hang(p, mouthOf.turtle.x, mouthOf.turtle.y)
      for (let i = 0; i < 3; i++) crumbs(out, mouth.x, mouth.y, m.t - m.beats[i], 3, 16, p.face, a)
      // Its jaw works as it chews.
      const chew = Math.abs(Math.sin(m.t * 13)) * (m.t < m.beats[3] ? 1 : 0)
      disc(out, mouth.x - p.face * 8, mouth.y + 3, 5, 1.2 + 2.6 * chew, 'dark', a)
    },
  },
  'worm.squid': {
    // Two long arms shoot out, snatch the worm, and the squid jets off backwards with it.
    pose(p, m) {
      const jet = ease(span(m.t, m.beats[0], m.beats[0] + 0.3)) * (1 - ease(span(m.t, 1.1, 2)))
      p.y -= 96 * jet
      p.a = 1 - 0.4 * bump(m.t, m.beats[0], 1)
      p.sy = 1 + 0.08 * bump(m.t, m.beats[0], 0.9)
      p.open = 1 - span(m.t, 0.4, 1.4)
    },
    draw(out, m, p, a) {
      // The two arms: out to the worm, and back in with it.
      const out2 = m.t < m.beats[0] ? ease(span(m.t, 0, m.beats[0])) : 1 - ease(span(m.t, m.beats[0], m.beats[0] + 0.4))
      const hold = { x: mix(p.x, m.at.x, out2), y: mix(p.y + 70, m.at.y + 12, out2) }
      for (const side of [-1, 1]) {
        const from = hang(p, side * 9, 44)
        line(out, [from.x, from.y, (from.x + hold.x) / 2 + side * 10, (from.y + hold.y) / 2, hold.x + side * 3, hold.y], 3.4, 'ochre', a)
      }
      if (m.t >= m.beats[0]) sprite(out, 'worm', hold.x, hold.y - 10, 0.5, 1, 1 - span(m.t, 0.5, 1.1), a)
    },
  },
  'worm.jelly': {
    // A tentacle brushes the worm, which frizzes into a tight spring and then uncurls and droops again.
    pose(p, m) {
      p.a += 0.4 * bump(m.t, 0, m.beats[0] + 0.25) * toward(p, m)
      p.glow = Math.min(1, p.glow + 0.4 * bump(m.t, m.beats[0], m.beats[0] + 0.3))
    },
    bait(b, m) {
      b.spring = m.t >= m.beats[0] && m.t < m.beats[1]
      b.rot = b.spring ? 0.2 * Math.sin(m.now * 50) : 0
      b.sy = m.t >= m.beats[1] ? mix(0.55, 1, ease(span(m.t, m.beats[1], m.beats[1] + 0.4))) : 1
    },
    draw(out, m, p, a) {
      const from = hang(p, 20 * toward(p, m), 60), reach = bump(m.t, 0, m.beats[0] + 0.3)
      line(out, [from.x, from.y, mix(from.x, m.at.x, reach * 0.6), mix(from.y, m.at.y, reach * 0.4) + 12, mix(from.x, m.at.x, reach), mix(from.y + 40, m.at.y + 14, reach)], 2.4, 'cream', a * reach)
    },
  },
  'worm.shark': {},
  'worm.angler': {
    // It swings its lamp over to look, and snaps.
    pose(p, m) {
      p.face = toward(p, m)
      const look = ease(span(m.t, 0, m.beats[0])), snap = bump(m.t, m.beats[1] - 0.12, m.beats[1] + 0.2)
      p.a = mix(p.a, 0.75, look)
      p.glow = m.t >= m.beats[0] && m.t < m.beats[0] + 0.12 ? 1.5 : Math.max(p.glow, 0.9 * look)
      p.look = m.at
      p.x += p.face * 26 * snap
      p.y -= 44 * snap
      p.sx = 1 + 0.08 * snap
    },
  },
  'worm.octopus': {
    // One arm unhooks the worm as tidily as a waiter, and a second arm pats the hook.
    pose(p, m) {
      p.open = m.t < m.beats[0] ? ease(span(m.t, 0, 0.35)) : 1 - ease(span(m.t, m.beats[0], m.beats[0] + 0.3))
      p.more = Math.max(bump(m.t, m.beats[1] - 0.14, m.beats[1] + 0.12), bump(m.t, m.beats[2] - 0.12, m.beats[2] + 0.14))
    },
    draw(out, m, p, a) {
      // The worm on its way into the pot, in the arm that took it.
      if (m.t < m.beats[0] || m.t > m.beats[0] + 0.3) return
      const go = ease(span(m.t, m.beats[0], m.beats[0] + 0.3)), from = hang(p, PARTS.octopusArms[0].x, PARTS.octopusArms[0].y)
      sprite(out, 'worm', mix(m.at.x, from.x, go), mix(m.at.y, from.y, go), 0.3, 1, 1 - 0.6 * go, a)
    },
  },
  'worm.blobfish': {
    // It opens its mouth and waits.
    pose(p, m) {
      p.open = ease(span(m.t, 0, 0.8))
      p.sy *= 1 + 0.06 * p.open
      p.look = m.at
    },
  },
  'worm.blobfish.gulp': {
    // The worm is lowered right into the mouth, and the mouth shuts on it.
    pose(p, m) {
      p.open = 1 - ease(span(m.t, 0, m.beats[0] + 0.05))
      p.sx *= 1 + 0.07 * bump(m.t, m.beats[0], 0.5)
      p.lid = m.t > m.beats[0] ? 0.9 * bump(m.t, m.beats[0], 0.5) : 0
    },
  },

  // --- The shiny spoon --------------------------------------------------------
  'spoon.shoal': {
    // Every fish turns at once, the whole shoal flashes back like a mirror, and it streams after the spoon.
    fish(f, index, m, middle) {
      f.face = m.hook.x >= f.x ? 1 : -1
      f.rot = 0
      const gather = ease(span(m.t, m.beats[1], 1.1))
      f.x = mix(f.x, middle.x + (index - 2.5) * 27 * -f.face, gather)
      f.y = mix(f.y, middle.y, gather)
    },
    draw(out, m, p) {
      // The flash: every fish at once, and the spoon answering.
      const flash = bump(m.t, 0, 0.35)
      for (let i = 0; i < 6; i++) disc(out, p.x + 78 * Math.sin(i * 1.05 + m.now), p.y + 28 * Math.sin(i * 1.7 + 1), 3 + 6 * flash, 3 + 6 * flash, 'cream', 0.9 * flash)
    },
  },
  'spoon.puffer': {
    // It sees the flash and swells in fright.
    pose(p, m) {
      const swell = ease(span(m.t, m.beats[0], m.beats[0] + 0.2))
      p.face = toward(p, m)
      p.pupil = 0.5
      p.open = swell
      p.sx = p.sy = 1 + 0.55 * swell
    },
  },
  'spoon.turtle': {
    // It sees itself in the spoon, likes what it sees, and turns its head from side to side.
    pose(p, m) {
      p.rot += 0.13 * Math.sin((m.t - m.beats[0]) * 7.8) * span(m.t, 0, m.beats[0])
      p.pupil = 1.35
      p.look = m.at
      p.x += p.face * 6 * ease(span(m.t, 0, 0.4))
    },
    draw(out, m, p, a) {
      // The smile it gives itself at each hum.
      const mouth = hang(p, mouthOf.turtle.x - 10, mouthOf.turtle.y + 4), smile = Math.max(bump(m.t, m.beats[0], m.beats[0] + 0.5), bump(m.t, m.beats[1], m.beats[1] + 0.5))
      line(out, [mouth.x - 7, mouth.y - 2 * smile, mouth.x, mouth.y + 3 * smile, mouth.x + 7, mouth.y - 2 * smile], 2, 'dark', a * smile)
    },
  },
  'spoon.squid': {
    // With no light near it taps the dull spoon three times with one arm, as on a triangle.
    pose(p, m) { p.look = m.at },
    bait(b, m) {
      for (const at of m.beats) if (m.t >= at) b.rot += 0.35 * Math.sin((m.t - at) * 30) * Math.max(0, 1 - (m.t - at) / 0.25)
    },
    draw(out, m, p, a) {
      let tap = 0
      for (const at of m.beats) tap = Math.max(tap, bump(m.t, at - 0.12, at + 0.1))
      const from = hang(p, 9 * toward(p, m), 44)
      line(out, [from.x, from.y, (from.x + m.at.x) / 2, from.y + 26, mix(from.x, m.at.x, 0.4 + 0.6 * tap), mix(from.y + 40, m.at.y + 20, 0.4 + 0.6 * tap)], 3.4, 'ochre', a)
    },
  },
  'spoon.squid.lit': {
    // The spoon flashes: a cloud of ink, and the squid gathers itself to bolt.
    pose(p, m) {
      p.open = 1
      p.pupil = 0.6
      p.sy = 1 - 0.12 * bump(m.t, 0, m.beats[1])
      p.a = 0.6
    },
  },
  'spoon.jelly': {
    // Its own glow flashes in the spoon, and it sways with its reflection as with a partner.
    pose(p, m) {
      p.rot += 0.3 * Math.sin((m.t * TAU) / 0.8)
      p.a -= 0.18 * Math.sin((m.t * TAU) / 0.8)
      p.glow = 1
    },
    bait(b, m) { b.rot -= 0.3 * Math.sin((m.t * TAU) / 0.8) },
    draw(out, m) {
      const glint = 0.5 + 0.5 * Math.cos((m.t * TAU) / 0.8)
      disc(out, m.at.x, m.at.y + 26, 3 + 5 * glint, 3 + 5 * glint, 'cream', 0.9 * glint)
    },
  },
  'spoon.shark': {
    // It bites the spoon, its teeth ring, and it shakes its head until one tooth drops out and a new one slides in.
    pose(p, m) {
      const shut = m.t >= m.beats[0], shake = span(m.t, m.beats[0] + 0.05, m.beats[1]) * (1 - span(m.t, 1.25, 1.4))
      p.open = shut ? (m.t > 1.5 ? 0.15 + 0.5 * bump(m.t, 1.5, 2) : 0.15) : ease(span(m.t, 0, 0.2))
      p.rot += 0.2 * Math.sin(m.now * 30) * shake * p.face
      p.a *= 0.3
    },
    bait(b, m, p) {
      const jaw = hang(p, mouthOf.shark.x - 8, mouthOf.shark.y - 4), held = span(m.t, 0.15, m.beats[0]) * (1 - ease(span(m.t, 1.5, 1.9)))
      carried(b, { x: jaw.x, y: jaw.y - 16 }, held)
      b.rot += (0.9 * p.face + p.rot) * held
    },
    draw(out, m, p, a) {
      // The tooth that drops, and the new one that slides down into its place.
      const fall = span(m.t, 1.3, 1.95), from = hang(p, 143, 16)
      if (m.t >= 1.3 && fall < 1) sprite(out, 'tooth', from.x + 12 * fall, mix(from.y, SEABED - 6, fall * fall), 4 * fall, 1, 1, a)
      const slide = ease(span(m.t, 1.45, 1.9))
      if (m.t >= 1.45) sprite(out, 'tooth', from.x, from.y - 16 + 11 * slide, 0, p.face, 1, a * slide)
    },
  },
  'spoon.angler': {
    // Its lamp flashes in the spoon and dazzles it: its eyes go round in circles and it drifts in a slow loop.
    pose(p, m) {
      const dazed = span(m.t, m.beats[0], m.beats[0] + 0.2) * (1 - span(m.t, 1.9, 2.2)), round = ((m.t - m.beats[1]) * TAU) / 1.6
      p.glow = m.t < m.beats[0] + 0.14 ? 1.6 : p.glow
      const eye = hang(p, CREATURES.angler.eyes[0].x, CREATURES.angler.eyes[0].y)
      p.look = { x: eye.x + 60 * Math.cos(m.now * 11), y: eye.y + 60 * Math.sin(m.now * 11) }
      p.x += 24 * Math.sin(round) * dazed
      p.y += 24 * (1 - Math.cos(round)) * dazed
      p.rot += 0.18 * Math.sin(round) * dazed
      p.a += 0.3 * Math.sin(m.now * 7) * dazed
    },
    draw(out, m) {
      const flash = bump(m.t, m.beats[0] - 0.05, m.beats[0] + 0.25)
      sprite(out, 'halo', m.at.x, m.at.y + 24, 0, 0.5 + flash, 0.5 + flash, flash, true)
    },
  },
  'spoon.octopus': {
    // It takes the spoon, polishes it on its own head, and hangs it back on the hook.
    pose(p, m) {
      p.open = 1
      p.lid = m.t > m.beats[0] && m.t < 1.4 ? 1 : p.lid
      p.sy += 0.04 * Math.sin(m.now * 19) * span(m.t, m.beats[0], m.beats[0] + 0.1) * (1 - span(m.t, 1.3, 1.4))
    },
    bait(b, m, p) {
      const top = hang(p, 0, -96), up = ease(span(m.t, 0.3, m.beats[0])) * (1 - ease(span(m.t, 1.4, m.beats[2])))
      const rub = m.t > m.beats[0] && m.t < 1.4 ? 16 * Math.sin(((m.t - m.beats[0]) * TAU) / 0.175) : 0
      carried(b, { x: top.x + rub, y: top.y - 18 }, up)
      b.rot = mix(b.rot, Math.PI / 2, up)
    },
    draw(out, m) {
      const gleam = bump(m.t, m.beats[2] - 0.04, m.beats[2] + 0.2)
      disc(out, m.at.x + 2, m.at.y + 22, 2 + 7 * gleam, 2 + 7 * gleam, 'cream', gleam)
    },
  },
  'spoon.blobfish': {
    // With no light near it stares past the spoon at nothing.
    pose(p) {
      p.look = { x: p.x - p.face * 400, y: p.y - 260 }
      p.lid = 0.35
    },
  },
  'spoon.blobfish.lit': {
    // With a light near it sees its own face in the spoon, and lets out its breath.
    pose(p, m) {
      const out = ease(span(m.t, m.beats[0], m.beats[0] + 0.9))
      p.look = m.at
      p.pupil = m.t < m.beats[0] ? 1.4 : 1.4 - 0.4 * out
      p.sy *= 1 - 0.1 * out * (1 - span(m.t, 1.3, 1.6))
      p.sx *= 1 + 0.07 * out * (1 - span(m.t, 1.3, 1.6))
      p.open = 0.3 * bump(m.t, m.beats[0], 1.4)
    },
    draw(out, m, p, a) {
      const mouth = hang(p, mouthOf.blobfish.x + 14, mouthOf.blobfish.y)
      for (let i = 0; i < 3; i++) {
        const age = m.t - m.beats[0] - i * 0.22
        if (age > 0 && age < 0.8) ring(out, mouth.x + p.face * 30 * age + 5 * Math.sin(age * 9 + i), mouth.y - 60 * age, 3 + 5 * age, a * (1 - age / 0.8))
      }
    },
  },

  // --- The glow stick ---------------------------------------------------------
  'glow.shoal': {
    // The shoal swims round the stick; one fish bumps its nose on it and shakes its head.
    fish(f, index, m) {
      const settle = ease(span(m.t, 0, 0.3)) * (1 - ease(span(m.t, 0.95, 1.2))), angle = (index / 6) * TAU + m.t * 2.6
      let x = m.at.x + 62 * Math.cos(angle), y = m.at.y + 28 + 30 * Math.sin(angle), face: 1 | -1 = Math.sin(angle) < 0 ? 1 : -1, rot = 0.3 * Math.cos(angle) * face
      if (index === 0) {
        // The one that bumps: straight at the stick, back off, and a shake of the head.
        const dart = bump(m.t, m.beats[0] - 0.16, m.beats[0] + 0.16), from = m.at.x - 62
        x = mix(from, m.at.x - 20, dart)
        y = m.at.y + 28
        face = 1
        rot = m.t > m.beats[0] ? 0.35 * Math.sin(m.now * 30) * (1 - span(m.t, m.beats[0], 1.05)) : 0
      }
      f.x = mix(f.x, x, settle)
      f.y = mix(f.y, y, settle)
      f.face = face
      f.rot = rot
    },
    bait(b, m) { b.rot += m.t > m.beats[0] ? 0.25 * Math.sin((m.t - m.beats[0]) * 20) * (1 - span(m.t, m.beats[0], 1)) : 0 },
  },
  'glow.puffer': {
    // It boxes the stick with its nose, left and right, like a punch bag.
    pose(p, m) {
      p.face = toward(p, m)
      const hit = bump(m.t, m.beats[0] - 0.1, m.beats[0] + 0.12) + bump(m.t, m.beats[1] - 0.1, m.beats[1] + 0.12)
      p.x += p.face * 16 * hit
      p.y += 10 * bump(m.t, m.beats[0] + 0.12, m.beats[1] - 0.1) - 5
      p.rot = -0.25 * p.face * bump(m.t, m.beats[0] + 0.1, m.beats[1])
    },
    bait(b, m, p) {
      for (let i = 0; i < 2; i++) if (m.t >= m.beats[i]) b.rot += (i ? -0.6 : 0.6) * p.face * Math.cos((m.t - m.beats[i]) * 14) * Math.max(0, 1 - (m.t - m.beats[i]) / 0.5)
    },
  },
  'glow.turtle': {
    // It blinks at it slowly, shuts its eyes and dozes off where it floats.
    pose(p, m) {
      const shut = ease(span(m.t, 0, 0.6)) * (1 - span(m.t, 2.3, 2.5)), sunk = ease(span(m.t, 0.5, 1.1)) * (1 - ease(span(m.t, 2.2, 2.6)))
      p.lid = shut
      p.y += 9 * sunk
      p.rot += 0.11 * sunk
      p.a *= 1 - sunk
      p.b *= 1 - sunk
    },
    draw(out, m, p, a) {
      const nose = hang(p, 122, -6)
      for (const at of m.beats) snoreBubble(out, nose.x + p.face * 6, nose.y, m.t - at, a)
    },
  },
  'glow.squid': {
    // It answers the light with bands of light running down its own skin, and hovers face to face with the stick.
    pose(p, m) {
      const level = ease(span(m.t, 0, 0.4)) * (1 - ease(span(m.t, 1.3, 1.6)))
      p.y += Math.max(-44, Math.min(44, m.at.y + 20 - (p.y + 24))) * level
      p.rot = 0
      p.more = 1
      p.look = m.at
    },
  },
  'glow.squid.bye': {
    // The stick leaves, and it waves one arm.
    draw(out, m, p, a) {
      const from = hang(p, 9, 44), wave = Math.sin(m.t * 16) * bump(m.t, 0, 0.8)
      line(out, [from.x, from.y, from.x + 26, from.y - 6, from.x + 44 + 10 * wave, from.y - 34 - 6 * wave, from.x + 50 + 18 * wave, from.y - 60], 3.4, 'ochre', a * bump(m.t, 0, 0.8) ** 0.4)
    },
  },
  'glow.jelly': {
    // It beats in time with the glow, grows brighter, and drifts after the light.
    pose(p, m) {
      // On the answer's own clock, so that each beat of the bell is a breath of the sound (grid.ts: `breathe` at 0 and 0.7).
      const beat = squeeze(m.t, 0.7, 0.4)
      p.sx = 1 - 0.16 * beat
      p.sy = 1 + 0.12 * beat
      p.glow = Math.min(1, 0.6 + 0.4 * span(m.t, 0, 1) + 0.2 * beat)
      p.rot += 0.1 * toward(p, m) * span(m.t, 0, 1)
    },
  },
  'glow.shark': {
    // It swallows the stick, and its belly lights up from inside.
    pose(p, m) {
      p.open = m.t < m.beats[0] ? ease(span(m.t, 0, 0.2)) : 0.1
      p.more = Math.max(p.more, ease(span(m.t, 0.4, 0.9)))
      p.glow = 0.7 * p.more
      p.x += p.face * 14 * bump(m.t, 0.15, 0.45)
    },
    bait(b, m, p) {
      const jaw = hang(p, mouthOf.shark.x - 20, mouthOf.shark.y - 2), go = ease(span(m.t, 0.1, m.beats[0]))
      carried(b, jaw, go)
      b.rot = mix(b.rot, (Math.PI / 2) * p.face, go)
      b.sy = 1 - 0.5 * go
    },
  },
  'glow.angler': {
    // It falls for the light: its own lamp droops shyly, and its heart thumps twice.
    pose(p, m) {
      const fallen = ease(span(m.t, 0, 0.5)), thump = bump(m.t, m.beats[1], m.beats[1] + 0.14) + bump(m.t, m.beats[1] + 0.17, m.beats[1] + 0.31)
      p.face = toward(p, m)
      p.a = mix(p.a, 0.95, fallen)
      p.glow = mix(p.glow, 0.45, fallen)
      p.look = m.at
      p.pupil = 1 + 0.3 * fallen
      p.sx = 1 + 0.07 * thump
      p.sy = 1 + 0.07 * thump
    },
  },
  'glow.octopus': {
    // It carries the stick into its pot, which glows through its cracks with the shadows of arms inside, then hands it back out.
    pose(p, m) {
      const inside = ease(span(m.t, 0.4, m.beats[0])) * (1 - ease(span(m.t, 1.8, 2.2)))
      p.open = 1
      p.y += 34 * inside
      p.lid = 0
    },
    bait(b, m, p) {
      const pot = { x: CREATURES.octopus.home.x + PARTS.pot.x, y: CREATURES.octopus.home.y + PARTS.pot.y - 60 }
      const go = ease(span(m.t, 0.3, m.beats[0])) * (1 - ease(span(m.t, 1.8, 2.3)))
      carried(b, pot, go)
      b.a = 1 - span(go, 0.8, 1)
      void p
    },
    draw(out, m) {
      const on = span(m.t, m.beats[0] - 0.1, m.beats[0] + 0.1) * (1 - span(m.t, 1.75, 1.9))
      if (on <= 0) return
      const pot = { x: CREATURES.octopus.home.x + PARTS.pot.x, y: CREATURES.octopus.home.y + PARTS.pot.y }
      sprite(out, 'potGlow', pot.x, pot.y, 0, 1, 1, on * (0.75 + 0.25 * Math.sin(m.now * 23)), true)
      // The shadows of two arms going about inside.
      for (const side of [-1, 1]) {
        const sway = Math.sin(m.now * 3.1 + side)
        line(out, [pot.x + side * 30, pot.y + 46, pot.x + side * 14 + 12 * sway, pot.y + 20, pot.x + side * 22 - 10 * sway, pot.y - 8], 7, 'dark', 0.5 * on)
      }
    },
  },
  'glow.blobfish': {
    // It squints, grumbles, turns to face the other way and pulls sand over itself.
    pose(p, m) {
      p.lid = 0.7
      const grumble = Math.max(bump(m.t, m.beats[0], m.beats[0] + 0.4), bump(m.t, m.beats[1], m.beats[1] + 0.4))
      p.rot += 0.035 * Math.sin(m.now * 38) * grumble
      if (m.t >= 1) p.face = 1
      p.sx *= 1 - 0.5 * bump(m.t, 0.85, 1.15)
      p.more = ease(span(m.t, 1.2, 1.9))
    },
  },

  // --- The cheese -------------------------------------------------------------
  'cheese.shoal': {
    // Each fish takes one taste, spits out a crumb, and the whole shoal turns its tails to the cheese.
    fish(f, index, m) {
      const taste = bump(m.t, index * 0.09, index * 0.09 + 0.2)
      f.x = mix(f.x, m.at.x - 18 * (f.x > m.at.x ? -1 : 1), taste)
      f.y = mix(f.y, m.at.y + 20, taste)
      if (m.t >= m.beats[1]) { f.face = f.x >= m.at.x ? 1 : -1; f.rot = 0 }
    },
    draw(out, m, p, a) {
      for (let i = 0; i < 6; i++) crumbs(out, m.at.x + (i - 2.5) * 20, m.at.y + 20 + 6 * (i % 2), m.t - m.beats[0] - (i % 3) * 0.07, 1, 20, i % 2 ? 1 : -1, a)
      void p
    },
  },
  'cheese.puffer': {
    // It sniffs once, goes cross-faced with its spines out, and sneezes itself backwards.
    pose(p, m) {
      p.face = toward(p, m)
      let sniff = 0
      for (let i = 0; i < 3; i++) sniff += bump(m.t, m.beats[i], m.beats[i] + 0.16)
      p.sx = p.sy = 1 + 0.07 * sniff
      const cross = span(m.t, 0.55, 0.65) * (1 - span(m.t, 1.4, 1.6))
      p.more = cross
      p.b = cross
      const back = ease(span(m.t, m.beats[3], m.beats[3] + 0.14)) - ease(span(m.t, 1, 1.6))
      p.x -= p.face * 74 * back
      p.rot = -0.5 * p.face * bump(m.t, m.beats[3], 1.2)
      p.lid = m.t > m.beats[3] && m.t < m.beats[3] + 0.3 ? 1 : 0
    },
    draw(out, m, p, a) {
      const mouth = hang(p, mouthOf.puffer.x + 6, mouthOf.puffer.y)
      crumbs(out, mouth.x, mouth.y, m.t - m.beats[3], 7, 46, p.face, a)
    },
  },
  'cheese.turtle': {
    // It wrinkles its nose and pulls head, flippers and tail into its shell, which rocks where it floats.
    pose(p, m) {
      const inside = m.t >= m.beats[0] && m.t < 1.7
      p.alt = inside ? 1 : 0
      p.rot = inside ? 0.3 * Math.sin((m.t - m.beats[0]) * 9) * (1 - span(m.t, m.beats[0], 1.7)) : p.rot - 0.07 * bump(m.t, 0, m.beats[0])
      p.lid = m.t < m.beats[0] ? 0.45 : p.lid
    },
    draw(out, m, p, a) {
      // The wrinkles on its nose, before it goes in.
      if (m.t >= m.beats[0]) return
      const nose = hang(p, 112, -12)
      line(out, [nose.x - 5, nose.y - 2, nose.x, nose.y - 5, nose.x + 5, nose.y - 2], 1.8, 'dark', a)
    },
  },
  'cheese.squid': {
    // One whiff and it is gone behind the biggest ink cloud it has.
    pose(p, m) {
      p.hid = span(m.t, m.beats[0], m.beats[0] + 0.12) * (1 - span(m.t, 1.1, 1.4))
      p.open = 1 - span(m.t, 1.1, 1.4)
    },
  },
  'cheese.jelly': {
    // The cheese stretches into long strings between its tentacles, like a cat's cradle.
    pose(p, m) { p.a += 0.14 * Math.sin(m.t * 5) },
    bait(b, m) { b.sx = 1 - 0.18 * bump(m.t, 0.1, 1.5); b.sy = 1 - 0.18 * bump(m.t, 0.1, 1.5) },
    draw(out, m, p, a) {
      const pull = bump(m.t, 0, 1.6) ** 0.5
      for (let i = 0; i < 4; i++) {
        const to = hang(p, -30 + i * 20, 62 + (i % 2) * 34), twang = Math.max(...m.beats.map((at) => (m.t >= at ? Math.max(0, 1 - (m.t - at) / 0.4) : 0)))
        const mx = (m.at.x + to.x) / 2 + 5 * twang * Math.sin(m.now * 44 + i), my = (m.at.y + 22 + to.y) / 2 + 10
        line(out, [m.at.x, m.at.y + 22, mx, my, mix(m.at.x, to.x, pull), mix(m.at.y + 22, to.y, pull)], 1.8, 'ochre', a * pull)
      }
    },
  },
  'cheese.shark': {
    // It bites, goes cross-eyed, spits it out in a cloud of crumbs and wipes its tongue on the line.
    pose(p, m) {
      const wiping = span(m.t, 1.15, 1.3) * (1 - span(m.t, 2, 2.2))
      p.open = m.t < m.beats[0] ? ease(span(m.t, 0, 0.15)) : m.t < m.beats[1] ? 0.12 : 0.8 * (1 - 0.3 * wiping) * (1 - span(m.t, 2.05, 2.2)) + 0.1
      if (m.t >= m.beats[0] + 0.1 && m.t < m.beats[1]) { p.look = hang(p, 176, -6); p.pupil = 0.7 }
      p.rot += 0.07 * Math.sin(m.now * 15) * wiping * p.face
      p.a *= 0.4
    },
    bait(b, m, p) {
      const jaw = hang(p, mouthOf.shark.x - 14, mouthOf.shark.y - 12), held = span(m.t, 0.1, m.beats[0]) * (1 - ease(span(m.t, m.beats[1], m.beats[1] + 0.15)))
      carried(b, jaw, held)
    },
    draw(out, m, p, a) {
      const mouth = hang(p, mouthOf.shark.x, mouthOf.shark.y)
      crumbs(out, mouth.x, mouth.y, m.t - m.beats[1], 8, 56, p.face, a)
      // Its tongue, out and scrubbing up and down the line above the hook.
      const wiping = span(m.t, 1.15, 1.3) * (1 - span(m.t, 2, 2.2))
      if (wiping > 0) {
        const tip = { x: mix(mouth.x, m.hook.x, wiping), y: mix(mouth.y, m.hook.y - 76 + 14 * Math.sin(m.t * 15), wiping) }
        line(out, [mouth.x - p.face * 14, mouth.y + 4, (mouth.x + tip.x) / 2, mouth.y + 8, tip.x, tip.y], 7, 'ochre', a)
      }
    },
  },
  'cheese.angler': {
    // It dips its lamp into the cheese like a fork into a pot, and licks it clean.
    pose(p, m) {
      const dip = bump(m.t, 0.1, 0.7), lick = bump(m.t, 0.75, 1.5)
      p.face = toward(p, m)
      p.a = mix(p.a, 0.7, dip)
      p.a = mix(p.a, 1.5, lick)
      p.look = lick > 0.2 ? null : m.at
      p.y -= 10 * dip
    },
    draw(out, m, p, a) {
      // Its tongue comes out to the bulb.
      const lick = bump(m.t, m.beats[1] - 0.2, m.beats[1] + 0.35), mouth = hang(p, mouthOf.angler.x, mouthOf.angler.y)
      disc(out, mouth.x + p.face * 8, mouth.y - 8 - 10 * lick, 6, 5 + 9 * lick, 'ochre', a * Math.min(1, lick * 3), 0.2 * p.face)
    },
  },
  'cheese.octopus': {
    // It turns cheese-yellow with holes and holds quite still beside the cheese, so that there are two.
    pose(p, m) {
      const still = m.t >= 0.1 && m.t < m.beats[1]
      p.tint = still ? 2 : 0
      // It turns back with a pop: a quick stretch and a shake of its arms.
      const pop = bump(m.t, m.beats[1], m.beats[1] + 0.4)
      p.sy += 0.14 * pop
      p.sx -= 0.08 * pop
      p.a += 0.6 * Math.sin(m.t * 30) * pop
      if (!still) return
      p.y = CREATURES.octopus.home.y
      p.sy = 1
      p.a = 0
      p.b = 0
      p.lid = 0
      p.look = { x: p.x + 500, y: p.y - 26 }
    },
    draw(out, m, p) {
      if (m.t < 0.1 || m.t >= m.beats[1]) return
      for (const [x, y, r] of [[-20, -62, 7], [18, -70, 5], [8, -44, 6], [-26, -6, 6], [24, 2, 8]] as const) disc(out, p.x + x, p.y + y, r, r * 0.9, 'dark', 0.55)
    },
  },
  'cheese.blobfish': {
    // The one thing it wants: its eyes go wide, its nostrils open, and it crawls after the smell.
    pose(p, m) {
      let sniff = 0
      for (let i = 0; i < 3; i++) sniff += bump(m.t, m.beats[i], m.beats[i] + 0.2)
      p.pupil = 1 + 0.35 * ease(span(m.t, 0, 0.3))
      p.look = m.at
      p.sx *= 1 + 0.05 * sniff
      p.x += p.face * 10 * ease(span(m.t, m.beats[3], 1.6))
    },
    draw(out, m, p, a) {
      const open = ease(span(m.t, 0, 0.3))
      for (const y of [-4, 6]) { const at = hang(p, 104, y + 2); disc(out, at.x, at.y, 2.6 * open, 3.2 * open, 'dark', a) }
    },
  },

  // --- The old boot -----------------------------------------------------------
  'boot.shoal': {
    // The shoal pours in at the top of the boot and out through the hole in the toe, round and round.
    fish(f, index, m) {
      const settle = ease(span(m.t, 0, 0.25)) * (1 - ease(span(m.t, 1.5, 1.8))), u = (((m.t * 0.9 + index / 6) % 1) + 1) % 1
      const top = { x: m.at.x, y: m.at.y - 4 }, toe = { x: m.at.x + 44, y: m.at.y + 48 }
      let x: number, y: number, a = 1, face: 1 | -1 = 1
      if (u < 0.3) { const v = u / 0.3; x = mix(top.x - 60, top.x, v); y = mix(top.y - 46, top.y, v * v); face = 1 }
      else if (u < 0.5) { x = mix(top.x, toe.x, (u - 0.3) / 0.2); y = mix(top.y, toe.y, (u - 0.3) / 0.2); a = 0 }
      else if (u < 0.75) { const v = (u - 0.5) / 0.25; x = toe.x + 50 * v; y = toe.y - 30 * v * v; face = 1 }
      else { const v = (u - 0.75) / 0.25; x = mix(toe.x + 50, top.x - 60, v); y = mix(toe.y - 30, top.y - 46, v) - 40 * Math.sin(Math.PI * v); face = -1 }
      f.x = mix(f.x, x, settle)
      f.y = mix(f.y, y, settle)
      f.a = mix(1, a, settle)
      f.face = face
      f.rot = 0
    },
  },
  'boot.puffer': {
    // It hides inside the boot, then swells until the boot bulges round and pops off.
    pose(p, m) {
      const inside = m.t < m.beats[2], go = ease(span(m.t, 0, 0.45))
      p.face = toward(p, m)
      if (inside) { p.x = mix(p.x, m.at.x + 10, go); p.y = mix(p.y, m.at.y + 34, go); p.hid = span(m.t, 0.3, 0.45) }
      else { const out = 1 - ease(span(m.t, m.beats[2] + 0.2, 2)); p.x = mix(p.x, m.at.x + 10, out); p.y = mix(p.y, m.at.y + 34, out); p.open = out; p.sx = p.sy = 1 + 0.55 * out }
    },
    bait(b, m) {
      const bulge = ease(span(m.t, m.beats[0], m.beats[2])) * (m.t < m.beats[2] ? 1 : 0), off = bump(m.t, m.beats[2], 1.95)
      b.sx = 1 + 0.5 * bulge + 0.04 * Math.sin(m.now * 30) * bulge
      b.sy = 1 + 0.4 * bulge
      b.y -= 74 * off
      b.rot += 2.2 * span(m.t, m.beats[2], 1.95) * (m.t < 1.95 ? 1 : 0)
    },
  },
  'boot.turtle': {
    // It puts one flipper into the boot and tries to walk; it goes round in a circle.
    pose(p, m) {
      const round = TAU * ease(span(m.t, 0.4, 2)), on = ease(span(m.t, 0.2, 0.45)) * (1 - ease(span(m.t, 1.95, 2.2)))
      p.x += 30 * Math.sin(round) * on
      p.y += 30 * (1 - Math.cos(round)) * on * 0.6
      p.rot += 0.22 * Math.sin(round * 2) * on
      p.a = mix(p.a, -0.5 + 0.5 * Math.sin(m.t * 10.5), on)
    },
    bait(b, m, p) {
      const on = ease(span(m.t, 0.2, 0.45)) * (1 - ease(span(m.t, 1.95, 2.2)))
      const from = hang(p, PARTS.turtleFront.x, PARTS.turtleFront.y), angle = p.rot + p.face * (1.75 + p.a)
      carried(b, { x: from.x + p.face * 56 * Math.cos(angle), y: from.y + 56 * Math.sin(angle) - 8 }, on)
    },
  },
  'boot.squid': {
    // It wears the boot as a helmet and jets about bumping into things.
    pose(p, m) {
      const on = ease(span(m.t, 0.15, 0.4)) * (1 - ease(span(m.t, 1.6, 1.9)))
      const dash = (at: number): number => ease(span(m.t, at - 0.22, at)) - ease(span(m.t, at + 0.02, at + 0.3))
      p.x += (52 * dash(m.beats[0]) - 52 * dash(m.beats[1])) * on
      p.y -= 50 * dash(m.beats[2]) * on
      p.rot = (0.3 * dash(m.beats[0]) - 0.3 * dash(m.beats[1])) * on
      p.sy = 1 - 0.1 * Math.max(bump(m.t, m.beats[0], m.beats[0] + 0.14), bump(m.t, m.beats[1], m.beats[1] + 0.14), bump(m.t, m.beats[2], m.beats[2] + 0.14))
    },
    bait(b, m, p) {
      const on = ease(span(m.t, 0.15, 0.4)) * (1 - ease(span(m.t, 1.6, 1.95))), top = hang(p, 0, -70)
      carried(b, { x: top.x, y: top.y }, on)
      b.rot = mix(b.rot, Math.PI + p.rot, on)
    },
  },
  'boot.jelly': {
    // It settles on the boot like a wig on a head.
    pose(p, m) {
      const go = ease(span(m.t, 0.05, m.beats[0]))
      p.x = mix(p.x, m.at.x + 4, go)
      p.y = mix(p.y, m.at.y - 8, go)
      p.rot = 0.14 * Math.sin((m.t - m.beats[0]) * 14) * (m.t > m.beats[0] ? 1 - span(m.t, m.beats[0], 1.2) : 0)
      p.sy = 1 - 0.16 * bump(m.t, m.beats[0] - 0.05, m.beats[0] + 0.25)
    },
  },
  'boot.shark': {
    // It worries the boot like a dog with a slipper, then lets it go.
    pose(p, m) {
      const worry = span(m.t, 0.1, m.beats[0]) * (1 - span(m.t, 1.65, 1.8))
      p.open = m.t < 0.12 ? ease(span(m.t, 0, 0.1)) : 0.14 + 0.5 * bump(m.t, 1.7, 2)
      p.rot += 0.24 * Math.sin(m.now * 26) * worry * p.face
      p.a = 0.5 * Math.sin(m.now * 26 + 1) * worry
    },
    bait(b, m, p) {
      const jaw = hang(p, mouthOf.shark.x - 12, mouthOf.shark.y - 18), held = span(m.t, 0.05, 0.15) * (1 - ease(span(m.t, 1.7, 1.95)))
      carried(b, jaw, held)
      b.rot += (0.6 * Math.sin(m.now * 26) + 0.4 * p.face) * held
    },
  },
  'boot.angler': {
    // It fishes for the boot: dangles its lamp at it and waits. The boot does nothing, and the lamp dims.
    pose(p, m) {
      const dangle = span(m.t, 0, m.beats[0] + 0.2), given = ease(span(m.t, m.beats[1] - 0.1, m.beats[1] + 0.4)) * (1 - ease(span(m.t, 2, 2.2)))
      p.face = toward(p, m)
      p.a = mix(p.a, 0.55 + 0.12 * Math.sin(m.t * 6.5) * (1 - given), dangle)
      p.a = mix(p.a, 1.05, given)
      p.glow = mix(Math.max(p.glow, 0.95), 0.2, given)
      p.look = m.at
      p.lid = 0.35 * given
    },
  },
  'boot.octopus': {
    // It moves out of its pot and into the boot.
    pose(p, m) {
      const go = ease(span(m.t, m.beats[0], 0.9))
      p.x = mix(p.x, m.at.x + 6, go)
      p.y = mix(p.y, m.at.y + 30, go) - 30 * Math.sin(Math.PI * go)
      p.sx = p.sy = 1 - 0.3 * go
      p.a = Math.sin(m.t * 14)
      p.alt = span(m.t, 0.85, 0.95)
    },
  },
  'boot.blobfish': {
    // It lays its head on the boot as on a pillow and sleeps.
    pose(p, m) {
      const down = ease(span(m.t, 0.1, m.beats[0])) * (1 - ease(span(m.t, 2.15, 2.4)))
      p.rot += 0.2 * p.face * down
      p.y += 4 * down
      p.lid = m.t > m.beats[0] + 0.1 && m.t < 2.2 ? 1 : p.lid
    },
    bait(b, m) {
      const down = ease(span(m.t, 0.1, m.beats[0])) * (1 - ease(span(m.t, 2.15, 2.4)))
      b.sy = 1 - 0.14 * down
      b.sx = 1 + 0.1 * down
    },
    draw(out, m, p, a) {
      const nose = hang(p, 106, -6)
      for (let i = 1; i < 3; i++) snoreBubble(out, nose.x, nose.y - 8, m.t - m.beats[i], a)
    },
  },

  // --- Nothing on the hook: the toy --------------------------------------------
  // The shoal parts round the hook like a curtain and closes behind it: that is how its fish always swim (motion.ts).
  'none.shoal': {
    draw(out, m, p, a) {
      // A shimmer runs through it as it parts.
      const sweep = bump(m.t, 0, 0.5)
      // (A loose scatter of sparks of different sizes, not a row.)
      for (const [x, y, r] of [[-64, -34, 2.2], [-18, 2, 3.2], [8, -22, 1.8], [52, 22, 2.7]]) disc(out, p.x + x + 30 * span(m.t, 0, 0.5), p.y + y, r * sweep, r * sweep, 'cream', a * sweep)
    },
  },
  'none.puffer': {
    // Poked, it swells, floats up a little way, and lets its air out.
    pose(p, m) {
      const puff = puffed(m.t), letting = m.t > m.beats[1] ? 1 - span(m.t, m.beats[1], 2.3) : 0
      p.sx = p.sy = 1 + 0.55 * puff
      p.open = clamp01(puff)
      p.rot = 0.16 * Math.sin(m.now * 31) * letting
      p.y -= 46 * ease(span(m.t, 0, 0.5)) * (1 - ease(span(m.t, m.beats[1], 2.4)))
    },
    draw(out, m, p, a) {
      // Its air comes out in three flutters of bubbles.
      const mouth = hang(p, mouthOf.puffer.x + 8, mouthOf.puffer.y)
      for (let i = 1; i < 4; i++) {
        const age = m.t - m.beats[i]
        if (age > 0 && age < 0.3) for (let k = 0; k < 2; k++) ring(out, mouth.x + p.face * (10 + 50 * age + k * 12), mouth.y - 20 * age - k * 7, 2.5 + k, a * (1 - age / 0.3), 1.4)
      }
    },
  },
  'none.turtle': {
    // It leans its shell against the hook for a scratch, eyes shut, one back flipper thumping.
    pose(p, m) {
      const lean = ease(span(m.t, 0, 0.3))
      p.rot -= 0.2 * lean
      p.a *= 1 - lean
      // The flipper comes down once for every knock, on the answer's own clock (game.ts: a knock each 0.28 seconds).
      p.b = 0.75 * Math.abs(Math.sin((Math.PI * m.t) / KNOCK_EVERY)) * lean
      p.lid = lean
    },
  },
  'none.squid': {
    // It startles, leaves a small puff of ink, jets away backwards and creeps back.
    pose(p, m) {
      const startled = 1 - span(m.t, 0.3, 1.6)
      p.y -= 100 * ease(span(m.t, 0, 0.3)) * (1 - ease(span(m.t, 1.2, 2.6)))
      p.rot += 0.1 * startled * Math.sin(m.now * 26)
      p.a -= 0.3 * startled
      p.open = startled
      p.pupil = 1 - 0.4 * startled
    },
  },
  'none.jelly': {
    // It twines its tentacles round the line and swings under the hook for a while, then lets go.
    pose(p, m) {
      const swinging = 1 - span(m.t, 2.2, 3)
      p.rot = 0.34 * Math.sin(m.now * 4.2) * swinging
      p.a -= p.rot * 0.6
      p.glow = Math.min(1, p.glow + 0.2 * swinging)
    },
  },
  'none.shark': {
    // It opens wide and uses the hook as a toothpick.
    pose(p, m) {
      const wide = ease(span(m.t, 0, 0.25))
      p.open = 0.1 + 0.9 * wide
      p.rot -= 0.1 * wide * p.face
      p.a *= 1 - 0.75 * wide
    },
  },
  'none.angler': {
    // Its lamp line and the fishing line tangle, and it pulls; then it lets go and its lamp whips about.
    pose(p, m) {
      const pulling = m.t < m.beats[2] ? ease(span(m.t, 0, 0.35)) : 0, loose = m.t >= m.beats[2] ? 1 - span(m.t, m.beats[2], 2.3) : 0
      p.a = 0.5 * pulling + 0.6 * Math.sin(m.now * 23) * loose + p.a * (1 - pulling) * (1 - loose)
      p.y += 9 * pulling
      p.rot = 0.08 * pulling
      if (loose > 0) p.glow = 0.35 + 0.65 * Math.abs(Math.sin(m.now * 17))
    },
    draw(out, m, p, a) {
      // The knot: the lamp's line wound round the fishing line just above the hook, with the lamp caught in it, until it lets go.
      if (m.t >= m.beats[2]) return
      const tight = ease(span(m.t, 0, 0.3)), pts: number[] = []
      for (let i = 0; i <= 14; i++) {
        const u = i / 14, angle = u * TAU * 2.25
        pts.push(m.hook.x + (9 - 4 * u) * Math.cos(angle) * (1.4 - 0.4 * tight), m.hook.y - 84 + 20 * u + (5 - 2 * u) * Math.sin(angle))
      }
      line(out, pts, 2.6, 'cream', Math.min(1, a + 0.3))
      // And the strand of the lamp's own line that is caught in it, pulled straight from the lamp to the knot.
      const bulb = anglerBulb(p)
      line(out, [bulb.x, bulb.y, mix(bulb.x, m.hook.x, 0.5), mix(bulb.y, m.hook.y - 74, 0.5) + 6 * (1 - tight), m.hook.x, m.hook.y - 74], 2, 'cream', Math.min(1, a + 0.3) * tight)
    },
  },
  'none.octopus': {
    // It takes the hook in one arm and shakes it three times, like a hand.
    pose(p, m) {
      p.open = ease(span(m.t, 0, 0.2)) * (1 - ease(span(m.t, 1.4, 1.7)))
      p.sy += 0.06 * p.open
    },
  },
  'none.blobfish': {
    // It yawns one huge bubble.
    pose(p, m) {
      p.open = yawned(m.t)
      p.sy *= 1 + 0.1 * p.open
      p.lid = Math.max(p.lid, 0.9 * p.open)
    },
  },
}

/** The moment of an answer, for its act. */
/** The turtle's scratch: one knock of its back flipper for each stretch of this many seconds. The rules sound it and the figure draws it from this one number. */
export const KNOCK_EVERY = 0.28

export function momentOf(key: CellKey, t: number, now: number, hook: Point, at: Point): Moment {
  return { key, t, now, hook, at, beats: BEATS[key] }
}
const BEATS = Object.fromEntries((Object.keys(ACTS) as CellKey[]).map((key) => [key, beatsOf(key)])) as Record<CellKey, number[]>
