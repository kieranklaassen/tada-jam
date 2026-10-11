import type { Point } from './input'
import type { CellKey } from './grid'
import { CREATURES, LAYERS, type CreatureId } from './sea'

// How everyone moves. Each character has a function of its own, with its own
// tempo, weight and funniest part, and no two share one: the shoal mills, the
// pufferfish hovers on a whirring tail, the turtle rows, the squid jets in
// pulses, the jellyfish beats and sinks, the shark patrols, the anglerfish
// hangs under its lamp, the octopus curls its arms and the blobfish breathes.
// The functions return numbers only; frame.ts turns them into what is drawn.

export type Pose = {
  /** The middle of the body, in stage units. */
  x: number
  y: number
  rot: number
  sx: number
  sy: number
  /** 1 facing right, -1 facing left. */
  face: 1 | -1
  /** The mouth, or the main thing it does, from 0 to 1. */
  open: number
  /** Two part angles, each character's own: a tail, flippers, arms, a lamp. */
  a: number
  b: number
  /** The eyelids, 0 open and 1 shut. */
  lid: number
  /** Its own light, 0 for none. */
  glow: number
  /** Its other form, from 0 to 1: the turtle drawn into its shell, the octopus moved into the boot. */
  alt: number
  /** The dye it is drawn in: 0 its own, 1 inked black, 2 cheese yellow. */
  tint: 0 | 1 | 2
  /** How much of it is out of sight, from 0 to 1: behind its ink, inside the boot. */
  hid: number
  /** What its eyes look at when that is not the hook. */
  look: Point | null
  /** How large its pupils are, 1 as painted. */
  pupil: number
  /** One more thing of its own, from 0 to 1: the octopus's second arm reaching, the light inside the shark, the sand over the blobfish, the bands of light on the squid, the pufferfish's spines out without swelling. */
  more: number
}

/** What a creature is doing in the sea. In the tub or in the air it is not in the sea, and the deck draws it. */
export type Mode = 'home' | 'hooked' | 'following' | 'flee' | 'return' | 'away'

export type Moving = {
  /** Its own drifting clock, which slows while it is busy with the hook. */
  t: number
  /** The game's clock, for what never stops: a whirring fin, a wobble. */
  now: number
  mode: Mode
  /** The answer it is giving, and the seconds since that began. */
  cell: CellKey | null
  since: number
  /** How busy it is with the hook, eased between 0 and 1. */
  act: number
  /** Where it has been carried from its drifting place. */
  off: Point
  /** Which way it is travelling while it follows, as an angle. */
  heading: number
  /** Seconds left of what lingers after an answer: the light inside the shark, the sand over the blobfish, the shoal's scatter. */
  extra: number
}

/** What a pose is made from besides the creature itself. */
export type Around = {
  hook: Point
  /** The nearest light that is not the creature's own, or null. */
  light: Point | null
  /** The bait on the hook shines: a spoon that flashes, or the glow stick below the sunlit water. */
  bright: boolean
}

export const TAU = Math.PI * 2
export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
export const span = (v: number, a: number, b: number): number => clamp01((v - a) / (b - a))
export const ease = (v: number): number => v * v * (3 - 2 * v)
/** 1 for `lasts` seconds once every `every` seconds. */
const blink = (t: number, every: number, lasts: number): number => ((t % every) + every) % every < lasts ? 1 : 0
/** A pulse that squeezes for the first `share` of each `period` and then lets go: 0, up to 1, back to 0, then rest. */
export const squeeze = (t: number, period: number, share: number): number => {
  const u = (((t / period) % 1) + 1) % 1
  return u < share ? Math.sin((Math.PI * u) / share) : 0
}
/** What a pulse does to height: up quickly during the squeeze, then a slow sinking back. */
const lifted = (t: number, period: number, share: number): number => {
  const u = (((t / period) % 1) + 1) % 1
  return u < share ? ease(u / share) : 1 - (u - share) / (1 - share)
}

function at(id: CreatureId, moving: Moving, dx: number, dy: number): Pose {
  const home = CREATURES[id].home
  return { x: home.x + dx + moving.off.x, y: home.y + dy + moving.off.y, rot: 0, sx: 1, sy: 1, face: 1, open: 0, a: 0, b: 0, lid: 0, glow: 0, alt: 0, tint: 0, hid: 0, look: null, pupil: 1, more: 0 }
}

/** Where a point of a body lies on the stage: `x` and `y` are from the body's pivot, drawn facing right. */
export function hang(pose: { x: number; y: number; rot: number; sx: number; sy: number; face: 1 | -1 }, x: number, y: number): Point {
  const lx = x * pose.sx * pose.face, ly = y * pose.sy
  const cos = Math.cos(pose.rot), sin = Math.sin(pose.rot)
  return { x: pose.x + lx * cos - ly * sin, y: pose.y + lx * sin + ly * cos }
}

/** Where a creature would be if nothing had carried it off: the place on its stretch that its own clock gives. */
export function driftOf(id: CreatureId, t: number): Point {
  const pose = POSES[id]({ t, now: 0, mode: 'home', cell: null, since: 0, act: 0, off: { x: 0, y: 0 }, heading: 0, extra: 0 }, FAR)
  return { x: pose.x, y: pose.y }
}
const FAR: Around = { hook: { x: -9999, y: -9999 }, light: null, bright: false }

/** How far the blobfish has sagged: not at all at its own depth, and a little more with every layer above it. */
export function sagAt(y: number): number {
  return y >= LAYERS.midnight.top ? 0 : y >= LAYERS.twilight.top ? 0.5 * ease(span(y, LAYERS.midnight.top, LAYERS.midnight.top - 60)) : 0.5 + 0.5 * ease(span(y, LAYERS.twilight.top, LAYERS.twilight.top - 60))
}

/** How round the pufferfish is, by the seconds since it was poked: up at once with a little too much, held, then let out. */
export function puffed(react: number | null): number {
  if (react === null) return 0
  if (react < 0.25) return 1.15 * ease(react / 0.25)
  if (react < 0.45) return 1.15 - 0.15 * span(react, 0.25, 0.45)
  if (react < 1.2) return 1
  return 1 - ease(span(react, 1.2, 2.3))
}

/** How wide the blobfish yawns, by the seconds since it began. */
export function yawned(react: number | null): number {
  if (react === null) return 0
  if (react < 1) return ease(react)
  if (react < 1.5) return 1
  return 1 - ease(span(react, 1.5, 2.4))
}

const POSES: Record<CreatureId, (moving: Moving, around: Around) => Pose> = {
  // The middle of the shoal; each fish has its own place round it (`shoalFish`).
  shoal(m) {
    return at('shoal', m, 26 * Math.sin(m.t * 0.5), 10 * Math.sin(m.t * 0.83))
  },
  puffer(m) {
    // Its stretch runs from under the net to the kelp, and it is under the net for about a fifth of the way round.
    const pose = at('puffer', m, 75 * Math.sin(m.t * 0.4), 6 * Math.sin((TAU * m.t) / 1.1))
    pose.face = Math.cos(m.t * 0.4) >= 0 ? 1 : -1
    pose.a = 0.55 * Math.sin(m.now * 19)
    if (m.mode === 'hooked' || m.mode === 'flee') {
      // On the hook it is a spinning ball; bolting, a balloon.
      pose.open = 1
      pose.sx = pose.sy = 1.55
      if (m.mode === 'hooked') pose.rot = m.now * 5
      else pose.sy = 1.62
    }
    return pose
  },
  turtle(m) {
    const round = (TAU * m.t) / 9.5
    const pose = at('turtle', m, 22 * Math.sin(round), 9 * Math.sin((TAU * m.t) / 4.7 + 1))
    // At the kelp end of its stretch it rubs its shell on the frond.
    const rubbing = m.mode === 'home' ? ease(span(-Math.sin(round), 0.86, 0.97)) : 0
    pose.rot = 0.03 * Math.sin((TAU * m.t) / 4.7) + 0.09 * rubbing * Math.sin(m.now * 9)
    pose.a = 0.45 * Math.sin((TAU * m.t) / 2.6)
    pose.b = 0.32 * Math.sin((TAU * m.t) / 2.6 + 2.2)
    pose.lid = Math.max(0.8 * rubbing, blink(m.t, 7.3, 0.35))
    if (m.mode === 'following') {
      // It paddles after its reflection, turning its head from side to side.
      pose.rot = 0.13 * Math.sin(m.now * 2.4)
      pose.a = 0.6 * Math.sin(m.now * 3.2)
      pose.b = 0.5 * Math.sin(m.now * 3.2 + 2.2)
      pose.face = Math.cos(m.heading) >= 0 ? 1 : -1
    }
    return pose
  },
  squid(m, around) {
    const pose = at('squid', m, 50 * Math.sin(m.t * 0.3), -16 * lifted(m.t, 3.2, 0.18))
    // It hangs back from the hook, leaning away, with its eyes on it.
    const dx = pose.x - around.hook.x, near = 1 - span(Math.hypot(dx, pose.y - around.hook.y), 140, 360)
    pose.rot = 0.06 * Math.sin(m.t * 0.7) + 0.12 * near * Math.sign(dx || 1)
    pose.a = 1 - 0.25 * squeeze(m.t, 3.2, 0.18)
    if (m.mode === 'flee') { pose.a = 0.55; pose.sy = 1.1; pose.sx = 0.92; pose.open = 1; pose.rot = 0 }
    return pose
  },
  jelly(m, around) {
    const beat = squeeze(m.t, 2.4, 0.3)
    const pose = at('jelly', m, 14 * Math.sin(m.t * 0.21), -12 * lifted(m.t, 2.4, 0.3))
    pose.sx = 1 - 0.14 * beat
    pose.sy = 1 + 0.1 * beat
    // It leans toward the nearest light.
    const lean = around.light ? 0.16 * Math.max(-1, Math.min(1, (around.light.x - pose.x) / 200)) * (1 - span(Math.hypot(around.light.x - pose.x, around.light.y - pose.y), 260, 520)) : 0
    pose.rot = lean
    pose.a = 0.12 * Math.sin(m.t * 1.1) - lean * 0.6
    pose.glow = 0.5 + 0.3 * beat
    if (m.mode === 'following') {
      const fast = squeeze(m.now, 1.2, 0.35)
      pose.sx = 1 - 0.16 * fast
      pose.sy = 1 + 0.12 * fast
      pose.glow = 0.8 + 0.2 * fast
    }
    if (m.mode === 'hooked') {
      // Sitting on the boot it wobbles like a wig.
      pose.rot = 0.12 * Math.sin(m.now * 5)
      pose.a = -pose.rot
    }
    return pose
  },
  shark(m) {
    const round = (TAU * m.t) / 15
    const pose = at('shark', m, 150 * Math.sin(round), 7 * Math.sin(m.t * 0.9))
    pose.face = Math.cos(round) >= 0 ? 1 : -1
    pose.a = 0.3 * Math.sin(m.now * 5.2)
    // It patrols with its mouth a little open.
    pose.open = 0.1
    // The stick it swallowed lights it from inside for a while.
    pose.more = Math.min(1, m.extra / 1.5)
    pose.glow = 0.7 * pose.more
    return pose
  },
  angler(m) {
    const pose = at('angler', m, 6 * Math.sin(m.t * 0.33), 5 * Math.sin((TAU * m.t) / 5.2))
    pose.a = 0.25 * Math.sin((TAU * m.t) / 3.4)
    pose.glow = 0.78 + 0.22 * Math.sin(m.now * 2.1)
    if (m.mode === 'following') {
      // In love with the light, its own lamp droops shyly and it paddles after.
      pose.a = 0.95 + 0.08 * Math.sin(m.now * 3)
      pose.glow = 0.45
      pose.face = Math.cos(m.heading) >= 0 ? 1 : -1
      pose.rot = 0.06 * Math.sin(m.now * 4)
    }
    if (m.mode === 'hooked') {
      // It comes up with its lamp lighting the way.
      pose.a = -0.3 + 0.1 * Math.sin(m.now * 3)
      pose.glow = 1
      pose.rot = -0.5
    }
    return pose
  },
  octopus(m) {
    const pose = at('octopus', m, 0, 3 * Math.sin((TAU * m.t) / 4.1))
    pose.a = 0.3 * Math.sin(m.t * 1.9)
    // One arm sorts shells at the mouth of the pot: out to a shell, and back with it.
    pose.b = 0.5 + 0.5 * Math.sin(m.t * 0.9)
    pose.sy = 1 + 0.05 * Math.sin((TAU * m.t) / 4.1)
    pose.lid = blink(m.t, 5.1, 0.22)
    // In the boot it is a boot with eyes and arms, and smaller than it looked in its pot.
    if (m.mode === 'hooked') { pose.alt = 1; pose.sx = pose.sy = 0.7; pose.rot = 0.1 * Math.sin(m.now * 3) }
    return pose
  },
  blobfish(m) {
    const breath = Math.sin((TAU * m.t) / 5.6)
    const pose = at('blobfish', m, 0, 0)
    // It lies with its nose toward the boat.
    pose.face = -1
    pose.sy = 1 + 0.06 * breath
    pose.sx = 1 - 0.035 * breath
    pose.lid = blink(m.t, 6.2, 0.3)
    if (m.extra > 0 && m.mode === 'home') {
      // Turned away from the light, with sand pulled over itself, until it has forgotten why.
      pose.face = 1
      pose.more = Math.min(1, m.extra / 0.8)
    }
    if (m.mode === 'following' || m.mode === 'hooked') {
      const sag = sagAt(pose.y)
      // A trim fish at its own depth, it sags only as it is drawn up.
      pose.sy = 1 + 0.42 * sag
      pose.sx = 1 - 0.1 * sag
      pose.lid = Math.max(pose.lid, 0.4 * sag)
      if (m.mode === 'following') {
        // It crawls after the smell: it gathers itself and stretches out, over and over, with its eyes wide.
        const crawl = Math.sin(m.now * 4.2)
        pose.sx *= 1 + 0.08 * crawl
        pose.sy *= 1 - 0.06 * crawl
        pose.pupil = 1.35
        pose.lid = 0
        pose.face = Math.cos(m.heading) >= 0 ? 1 : -1
      } else pose.rot = 0.5 * pose.face
    }
    return pose
  },
}

/** Where a creature is and how it holds itself, before any answer to the hook is laid over it (acts.ts). */
export function poseOf(id: CreatureId, moving: Moving, around: Around): Pose {
  return POSES[id](moving, around)
}

export const SHOAL_SIZE = 6
/** How far the shoal keeps from a hook in its midst: it parts round it like a curtain. */
export const SHOAL_PARTS_AT = 62

/** How long the shoal is scattered when a hunter goes by, in seconds. */
export const SHOAL_SCATTERS = 1.4

export type Fish = { x: number; y: number; face: 1 | -1; rot: number; a: number }

/**
 * Where fish `index` of the shoal is, given the shoal's middle and where the hook is. At home each mills on a loop
 * of its own, turns to anything bright, and one that would swim within reach of the hook is pushed out to the edge
 * of it. Following, the shoal streams as a ribbon along the way it is going.
 */
export function shoalFish(index: number, middle: Point, m: Moving, around: Around, out: Fish): Fish {
  const t = m.t, hook = around.hook
  out.a = 1
  if (m.mode === 'following' || m.mode === 'return') {
    // A ribbon: one fish after another along the heading, with a ripple running down it.
    const along = (index - (SHOAL_SIZE - 1) / 2) * 27, wave = 9 * Math.sin(m.now * 6 - index * 0.9)
    const cos = Math.cos(m.heading), sin = Math.sin(m.heading)
    out.x = middle.x - cos * along - sin * wave
    out.y = middle.y - sin * along * 0.5 + cos * wave
    out.face = cos >= 0 ? 1 : -1
    out.rot = Math.max(-0.5, Math.min(0.5, Math.atan2(sin, Math.abs(cos)))) * out.face
    return out
  }
  const along = t * 0.8 + index * (TAU / SHOAL_SIZE)
  out.x = middle.x + 78 * Math.sin(along)
  out.y = middle.y + 30 * Math.sin(t * 1.3 + index * 1.7)
  out.face = Math.cos(along) >= 0 ? 1 : -1
  // The shoal turns to whatever shines.
  if (around.bright && Math.hypot(hook.x - middle.x, hook.y - middle.y) < 420) out.face = hook.x >= out.x ? 1 : -1
  const dx = out.x - hook.x, dy = out.y - hook.y
  const near = Math.hypot(dx, dy)
  if (near < SHOAL_PARTS_AT) {
    // Straight out from the hook; a fish right on it goes up or down by turns.
    const ux = near > 0.001 ? dx / near : 0, uy = near > 0.001 ? dy / near : index % 2 ? 1 : -1
    out.x = hook.x + ux * SHOAL_PARTS_AT
    out.y = hook.y + uy * SHOAL_PARTS_AT
  }
  out.rot = 0.25 * Math.cos(t * 1.3 + index * 1.7) * out.face
  if (m.extra > 0) {
    // A hunter is going by: every fish darts its own way, and they gather again.
    const far = 86 * Math.sin(Math.PI * clamp01(m.extra / SHOAL_SCATTERS))
    out.x += far * Math.cos(index * 2.4 + 1)
    out.y += far * 0.5 * Math.sin(index * 2.4 + 1)
    out.rot = 0.5 * Math.sin(m.now * 30 + index)
  }
  return out
}

// --- On deck ----------------------------------------------------------------

/** The cat's opinion of each catch that can land in the tub, the same every time (ART.md, "The characters and their fixed tastes"). */
export const OPINIONS = { puffer: 'opPuffer', jelly: 'opJelly', angler: 'opAngler', octopus: 'opOctopus', blobfish: 'opBlobfish', squid: 'opSquid' } as const
export type Catch = keyof typeof OPINIONS
export const isCatch = (id: CreatureId): id is Catch => id in OPINIONS

export type CatAct = 'stretch' | 'tilt' | 'yawn' | 'flinch' | 'twitch' | 'cling' | 'shake' | 'dream' | 'ride' | 'sleepy' | 'wake' | 'duck' | 'settle' | (typeof OPINIONS)[Catch]
/** How long each thing the cat does lasts, in seconds. */
export const CAT_ACTS: Record<CatAct, number> = { stretch: 1.3, tilt: 0.9, yawn: 1.5, flinch: 0.8, twitch: 0.45, cling: 1.4, shake: 1, dream: 1.6, ride: 0.9, sleepy: 0.8, wake: 1.2, duck: 0.8, settle: 1, opPuffer: 2.2, opJelly: 1.8, opAngler: 2.4, opOctopus: 2.2, opBlobfish: 2.4, opSquid: 2.6 }
/** When the dreaming cat's paw meets the water: the two plips of `CAT_BEATS.dream`, which are written from these. */
export const DREAM_PATS = [0.5, 1] as const
/** How long before a purr the arm lifts off the cat's head, to come down on the purr. */
export const PAT_LIFTS = 0.3
/**
 * The octopus's arm on the cat's head, `since` seconds into the cat's opinion of it: how far it has reached (0 to 1)
 * and how it bobs there. It is out for as long as the cat nods and purrs, and pats on the purr's own beats.
 */
export function patOf(since: number): { reach: number; bob: number } | null {
  const reach = ease(span(since, 0.1, 0.25)) * (1 - ease(span(since, 1.9, 2.2)))
  if (reach < 0.02) return null
  const purrs = CAT_BEATS.opOctopus!.map((beat) => beat.at)
  // It lifts off the head before each purr and comes down on it: the pat is the purr's own beat.
  let bob = 0
  for (const at of purrs) { const u = (since - (at - PAT_LIFTS)) / PAT_LIFTS; if (u > 0 && u < 1) bob = Math.sin(Math.PI * u) }
  return { reach, bob }
}
/** The drop of drool on the chin of the cat that dreams of the shoal: how far it has run (0 to 1), or null when there is none. */
export function droolOf(act: CatAct | null, since: number): number | null {
  return act === 'dream' && since > 0.2 && since < 1.5 ? span(since, 0.2, 1.3) : null
}
/** How long the mew of a cat that is touched while busy shows on it, in seconds. */
export const CAT_MEW_SHOWS = 0.4
/** The cat's duck: flat by this many seconds in, and it stays flat until this many (the rules hold it there while a catch is on its way over). */
export const CAT_IS_DOWN = 0.12, CAT_STAYS_DOWN = 0.55
/** What the cat does when it is touched: one of these, never the same twice running. */
export const CAT_MEWS: readonly CatAct[] = ['stretch', 'tilt', 'yawn']
/** The moments the cat sounds inside what it does, in seconds from its start. What it sounds at the start, the rules sound. */
export const CAT_BEATS: Partial<Record<CatAct, readonly { at: number; cue: 'plip' | 'catPrick' | 'catLick' | 'catFrizz' | 'catPounce' | 'catSplash' | 'catPurr' | 'catSag' | 'catInked' | 'catSneeze' }[]>> = {
  dream: DREAM_PATS.map((at) => ({ at, cue: 'plip' as const })),
  opPuffer: [{ at: 0.4, cue: 'catPrick' }, { at: 1, cue: 'catLick' }],
  opJelly: [{ at: 0.35, cue: 'catFrizz' }],
  opAngler: [{ at: 0.9, cue: 'catPounce' }, { at: 1.4, cue: 'catSplash' }],
  opOctopus: [{ at: 0.6, cue: 'catPurr' }, { at: 1.3, cue: 'catPurr' }],
  opBlobfish: [{ at: 0.9, cue: 'catSag' }],
  opSquid: [{ at: 0.3, cue: 'catInked' }, { at: 2, cue: 'catSneeze' }],
}

export type CatPose = {
  /** Where it has gone from its seat, in stage units along the deck and up from it. */
  x: number
  lift: number
  rot: number
  sx: number
  sy: number
  head: number
  tail: number
  lid: number
  open: number
  /** How large its pupils are. */
  pupil: number
  /** Where its free paw reaches to, from its seat, or null while both paws rest on the rim. */
  paw: Point | null
  /** Every hair on end, from 0 to 1. */
  frizz: number
  /** Inked black. */
  inked: boolean
  /** Curled up, from 0 to 1: asleep in the empty tub. */
  curl: number
}

/**
 * The cat. `slot` is where the catch it has an opinion of lies, from the cat's seat; `asleep` is the trip over and
 * the cat curled up in the tub, `tub` where the tub's middle is from its seat.
 */
export function catPose(t: number, now: number, act: CatAct | null, since: number, slot: Point, asleep: boolean, tub: Point, poked = CAT_MEW_SHOWS): CatPose {
  const pose: CatPose = { x: 0, lift: 0, rot: 0, sx: 1, sy: 1 + 0.015 * Math.sin((TAU * t) / 3.1), head: 0.04 * Math.sin((TAU * t) / 6.3), tail: 0.5 * Math.sin((TAU * t) / 2.3) + 0.2 * Math.sin((TAU * t) / 0.9), lid: blink(t, 4.4, 0.16), open: 0, pupil: 1, paw: null, frizz: 0, inked: false, curl: 0 }
  if (asleep) {
    // Curled up in the empty tub, breathing slowly, with the tip of its tail over its nose.
    pose.x = tub.x
    pose.lift = -tub.y
    pose.curl = 1
    pose.sy = 0.62 + 0.03 * Math.sin((TAU * t) / 4.2)
    pose.sx = 1.12
    pose.lid = 1
    pose.head = 0.5
    pose.tail = 1.3
  }
  if (act === null) return pose
  const u = clamp01(since / CAT_ACTS[act]), arc = Math.sin(Math.PI * u)
  const at = (from: number, to: number): number => span(since, from, to)
  switch (act) {
    case 'stretch': pose.sy += 0.16 * arc; pose.sx -= 0.07 * arc; pose.head -= 0.3 * arc; pose.open = arc > 0.5 ? 0.6 : 0; pose.tail = 0.9 * arc; break
    case 'tilt': pose.head += 0.5 * arc; pose.open = u < 0.5 ? 0.5 : 0; break
    case 'yawn': pose.open = arc; pose.lid = arc > 0.3 ? 1 : pose.lid; pose.head -= 0.18 * arc; break
    case 'flinch': pose.lift += 16 * Math.sin(Math.PI * span(u, 0, 0.5)); pose.sx -= 0.1 * arc; pose.sy += 0.1 * arc; pose.tail = 1.1; pose.open = u < 0.4 ? 0.8 : 0; pose.head += 0.12 * Math.sin(now * 40) * (1 - u); break
    case 'twitch': pose.head += 0.16 * Math.sin(u * TAU * 2) * (1 - u); break
    case 'cling': pose.sy -= 0.14 * arc; pose.sx += 0.1 * arc; pose.tail = 1.2 * arc; pose.lid = 0; pose.pupil = 0.7; break
    // It shakes itself dry, from the head down.
    case 'shake': pose.rot = 0.16 * Math.sin(now * 34) * (1 - u); pose.head += 0.3 * Math.sin(now * 34 + 1) * (1 - u); pose.lid = u < 0.7 ? 1 : 0; pose.tail = 0.8 * Math.sin(now * 20); break
    // The shoal is at the hull: it leans over the rail and pats the water, and its mouth hangs open.
    case 'dream': pose.rot = 0.32 * ease(Math.min(at(0, 0.3), 1 - at(1.3, 1.6))); pose.paw = { x: 46, y: 28 + 12 * Math.abs(Math.sin(Math.PI * at(DREAM_PATS[0] - 0.25, DREAM_PATS[0] + 0.75) * 2)) }; pose.open = 0.5; pose.pupil = 1.3; pose.tail = 1.2 * Math.sin(now * 6); break
    // It rides the wave down the deck and back.
    case 'ride': pose.x = 64 * arc; pose.rot = 0.3 * Math.sin(TAU * u); pose.sy -= 0.1 * arc; pose.tail = 1.3; pose.pupil = 0.7; pose.open = 0.5 * arc; break
    // A catch is coming up to swing in over its head: it flattens itself, ears back, before the catch leaves the water, and watches it go by.
    case 'duck': { const down = ease(at(0, CAT_IS_DOWN)) * (1 - ease(at(CAT_STAYS_DOWN, 0.8))); pose.sy -= 0.4 * down; pose.sx += 0.14 * down; pose.head += 0.3 * down; pose.pupil = 1.3; pose.tail = 0.2; break }
    // The trip is over: it steps into the empty tub and curls up.
    case 'settle': { const go = ease(at(0, 0.6)), curl = ease(at(0.5, 1)); pose.x = tub.x * go; pose.lift = -tub.y * go + 22 * Math.sin(Math.PI * at(0, 0.6)); pose.curl = curl; pose.sy += (0.62 - pose.sy) * curl; pose.sx += 0.12 * curl; pose.lid = curl > 0.5 ? 1 : pose.lid; pose.head += (0.5 - pose.head) * curl; pose.tail += (1.3 - pose.tail) * curl; break }
    case 'sleepy': pose.head += 0.12 * Math.sin(u * TAU * 2) * (1 - u); pose.lid = u > 0.2 && u < 0.6 ? 0.45 : 1; break
    // It wakes: out of the tub, a long stretch, and back to its seat.
    case 'wake': pose.x = tub.x * (1 - ease(at(0, 0.6))); pose.lift = -tub.y * (1 - ease(at(0, 0.6))) + 22 * Math.sin(Math.PI * at(0, 0.6)); pose.sy += 0.18 * Math.sin(Math.PI * at(0.5, 1.2)); pose.head -= 0.3 * Math.sin(Math.PI * at(0.5, 1.2)); pose.open = since > 0.7 && since < 1 ? 0.7 : 0; break
    case 'opPuffer': {
      // One pat, a pricked paw, and a glare while it licks the paw.
      const beats = CAT_BEATS.opPuffer!
      if (since < beats[0].at + 0.08) pose.paw = { x: slot.x * ease(at(0.1, beats[0].at)), y: slot.y * ease(at(0.1, beats[0].at)) }
      else if (since < beats[1].at) { pose.paw = { x: -18, y: -62 - 14 * Math.sin(now * 30) * (1 - at(beats[0].at, beats[1].at)) }; pose.lift += 12 * Math.sin(Math.PI * at(beats[0].at, beats[0].at + 0.3)); pose.open = 0.7 * (1 - at(beats[0].at, beats[0].at + 0.4)) }
      else { pose.paw = { x: -16, y: -58 + 5 * Math.sin((since - beats[1].at) * TAU / 0.32) }; pose.lid = 0.45; pose.head += 0.22; pose.open = 0.25 * (1 - at(1.9, 2.2)) }
      break
    }
    case 'opJelly': {
      // One poke, and every hair stands on end.
      const poke = CAT_BEATS.opJelly![0].at
      if (since < poke) pose.paw = { x: slot.x * ease(at(0, poke)), y: slot.y * ease(at(0, poke)) }
      pose.frizz = since >= poke ? 1 - ease(at(1.3, 1.8)) : 0
      pose.sy += 0.16 * pose.frizz
      pose.sx += 0.12 * pose.frizz
      pose.pupil = 1 - 0.45 * pose.frizz
      pose.tail = pose.frizz > 0 ? 1.4 : pose.tail
      pose.rot = 0.05 * Math.sin(now * 46) * pose.frizz
      break
    }
    case 'opAngler': {
      // It chases the lamp like a spot of light on a wall, pounces, misses and falls into the tub.
      const [pounce, splash] = CAT_BEATS.opAngler!.map((beat) => beat.at)
      if (since < pounce) { pose.head += 0.35 * Math.sin(since * 9); pose.sy -= 0.12 * at(0.4, pounce); pose.pupil = 1.4; pose.tail = 1.2 * Math.sin(now * 12) }
      else if (since < splash) { const fly = at(pounce, splash); pose.x = slot.x * fly * 0.86; pose.lift = 40 * Math.sin(Math.PI * fly) - (slot.y + 10) * fly; pose.rot = -0.9 * fly; pose.pupil = 1.4 }
      else { const out = ease(at(1.9, 2.4)); pose.x = slot.x * 0.86 * (1 - out); pose.lift = -(slot.y + 10) * (1 - out) - 8 + 24 * Math.sin(Math.PI * out); pose.rot = -0.9 * (1 - at(splash, splash + 0.2)); pose.lid = since < 1.9 ? 1 : 0; pose.sy -= 0.2 * (1 - out) }
      break
    }
    case 'opOctopus': {
      // An arm pats it on the head, and it purrs against its will.
      const purr = CAT_BEATS.opOctopus![0].at
      pose.head += 0.1 * Math.sin(Math.PI * at(0.25, purr) * 2)
      if (since >= purr) { const on = 1 - ease(at(1.9, 2.2)); pose.lid = on > 0.5 ? 1 : 0; pose.rot = 0.02 * Math.sin(now * 60) * on; pose.sy -= 0.05 * on; pose.sx += 0.04 * on; pose.tail = 0.3 * on }
      break
    }
    case 'opBlobfish': {
      // It stares, is stared at, and slowly sags to match.
      const sag = ease(at(CAT_BEATS.opBlobfish![0].at, 1.9)) * (1 - ease(at(2.1, 2.4)))
      pose.head -= 0.25 * Math.min(1, since / 0.3) * (1 - sag)
      pose.sy -= 0.34 * sag
      pose.sx += 0.22 * sag
      pose.lid = 0.45 * (sag > 0.3 ? 1 : 0)
      pose.head += 0.3 * sag
      pose.tail = pose.tail * (1 - sag)
      break
    }
    case 'opSquid': {
      // It is inked, and is a black cat with two round eyes until it sneezes.
      const [inked, sneeze] = CAT_BEATS.opSquid!.map((beat) => beat.at)
      pose.inked = since >= inked + 0.06 && since < sneeze + 0.2
      if (since >= inked && since < sneeze) { pose.pupil = 1.5; pose.sy -= 0.06 * (1 - at(inked, inked + 0.3)); pose.head -= 0.3 * at(sneeze - 0.5, sneeze) }
      if (since >= sneeze) { const kick = 1 - at(sneeze, sneeze + 0.5); pose.head += 0.5 * kick; pose.lift += 10 * kick; pose.lid = kick > 0.4 ? 1 : 0; pose.open = 0.8 * kick }
      break
    }
  }
  // Touched while it is busy with a catch or lying flat: it does not leave off, and mews over its shoulder with a lash of the tail.
  if (poked < CAT_MEW_SHOWS) {
    const mew = Math.sin(Math.PI * (poked / CAT_MEW_SHOWS))
    pose.open = Math.max(pose.open, 0.8 * mew)
    pose.tail += 1.1 * mew
    pose.head -= 0.14 * mew
  }
  return pose
}

/** How long the gull's hop lasts. */
export const GULL_HOP = 0.7
/** The gull: it looks about and preens, hops when touched, and leans to watch a catch come up (`watching`, 0 to 1). */
export function gullPose(t: number, hop: number | null, watching: number): { lift: number; rot: number; sy: number } {
  // It looks about, and every so often tucks its beak under a wing.
  const preen = blink(t, 7.1, 0.9) * Math.sin(Math.PI * span(t % 7.1, 0, 0.9)) * (1 - watching)
  const pose = { lift: 0, rot: 0.05 * Math.sin((TAU * t) / 2.9) + 0.5 * preen - 0.34 * watching, sy: 1 + 0.08 * watching }
  if (hop === null) return pose
  const u = clamp01(hop / GULL_HOP)
  pose.lift = 22 * Math.sin(Math.PI * u)
  pose.rot = -0.3 * Math.sin(Math.PI * u)
  pose.sy = 1 + 0.14 * Math.sin(Math.PI * u) - 0.12 * span(u, 0.85, 1)
  return pose
}

/** The boat rocks on the swell, dips when something pulls on the line, and heels when it is rocked hard (`heel`, in radians). */
export function boatPose(t: number, dip: number, heel: number): { rot: number; lift: number } {
  return { rot: 0.018 * Math.sin((TAU * t) / 3.4) + dip * 0.004 + heel, lift: 2 * Math.sin((TAU * t) / 3.4 + 1) + dip }
}
