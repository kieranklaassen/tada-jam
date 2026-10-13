import { DOOR, HEDGEHOG, SPOTS, STONE_SPOT, type P } from './layout'
import { LOUSE, MANNERS, bump, clamp01, ease, helloPose, settle, type FindPose } from './motion'
import { flipDelay, type Seasonal } from './seasonal'
import { drawn, hogShift, jayAway, jayBody, toadNow } from './things'
import { TURN, acting, amount, dwellerAt, homeOf, idleOf, isWet, progress, seconds, wormPlace, type Toy } from './toy'
import { SEASONS, THINGS, type FindId, type PlaceId, type Season } from './wood'

// How each animal holds itself at a moment of the model's clock, as plain
// numbers for the view. Each moves like itself and no two share a move: the
// hedgehog is quick and snuffling, the jay sharp and stepped, the toad slow
// and heavy. Every pose is read from the model and its clock, so the same
// moment always gives the same picture.

const TAU = Math.PI * 2
const span = (s: number, a: number, b: number): number => clamp01((s - a) / (b - a))
const smooth = (s: number, a: number, b: number): number => ease(span(s, a, b))
const hump = (s: number, a: number, b: number): number => bump(s, a, b)
/** Up quickly at `at`, and gone `lasts` seconds later. */
const jolt = (s: number, at: number, lasts = 0.25): number => (s < at || s > at + lasts ? 0 : Math.sin(((s - at) / lasts) * Math.PI))
/** A landing: a squash that rings out after the moment `at`. */
const thud = (s: number, at: number, depth: number): number => (s < at ? 0 : depth * Math.exp(-10 * (s - at)) * Math.cos(26 * (s - at)))

/** 1 while a blink is shut. Each animal has its own period and its own hold. */
function blink(time: number, period: number, hold: number, phase: number): number {
  const t = (((time + phase) % period) + period) % period
  return t < hold ? Math.sin((t / hold) * Math.PI) : 0
}

/** Quickly to a pose, held, quickly back: how the jay moves. */
const plateau = (u: number, edge = 0.15): number => ease(u / edge) * ease((1 - u) / edge)

/**
 * Where an eye looks: at the thing in the hand, then at what just happened, then at what its owner wants. Each
 * part from -1 to 1. It follows things and places, never a bare finger.
 */
export function gaze(toy: Toy, eye: P, want: P | null, room = false): P {
  // An eye sees what happens in the frame its owner is in: the wood, or for the toad on the table, the room.
  const carried = toy.hand?.carried && toy.room === room ? toy.hand.at : null
  const target = carried ?? (toy.time - toy.look.since < 2.2 && toy.look.room === room ? toy.look.at : want)
  if (!target) return { x: Math.sin(toy.time * 0.5) * 0.5, y: 0.15 }
  const dx = target.x - eye.x, dy = target.y - eye.y, far = Math.hypot(dx, dy)
  if (far < 1) return { x: 0, y: 0 }
  const reach = Math.min(1, far / 140)
  return { x: (dx / far) * reach, y: (dy / far) * reach }
}

/** Where the worm is, which is what the hedgehog wants: in the open (also up in the jay's nest), under its cover, or through the door of the house. */
export function wormSpot(toy: Toy): P {
  const worm = drawn(toy, 'worm')
  if (worm && !worm.room) return worm.at
  if (toy.things.worm.at === 'home') return SPOTS[homeOf(toy, 'worm') ?? wormPlace(toy)].find
  return DOOR
}

/** What shines, which is what the jay's eye is on: the button wherever it is in the wood, or anything wet. */
export function shinySpot(toy: Toy): P | null {
  for (const thing of THINGS) {
    if (thing !== 'button' && !isWet(toy, thing)) continue
    const seen = drawn(toy, thing)
    if (seen && !seen.room) return seen.at
    if (toy.things[thing].at === 'home') { const place = homeOf(toy, thing); if (place) return SPOTS[place].find }
  }
  return null
}

/** What the toad looks at: from whatever the child is carrying to the bare half of his stone, and back. */
export function toadWant(toy: Toy): P | null {
  if (!toy.hand?.carried || toy.room) return null
  return Math.floor(toy.time / 0.9) % 2 === 0 ? toy.hand.at : STONE_SPOT
}

export type HedgehogPose = {
  /** How far he has stepped from where he sits. */
  x: number
  y: number
  /** 0 unrolled, 1 a ball. Between the two the face tucks under and the back closes over it. */
  roll: number
  ballTurn: number
  ballScale: number
  shake: number
  faceTurn: number
  faceSlide: number
  kick: number
  /** How far the one eye is open between the spines when he is a ball. */
  peep: number
  breathe: number
  /** How far his spines fan out: the sneeze. */
  fan: number
  blink: number
  /** How far his eye is crossed towards his nose. */
  cross: number
  /** -1 a worried mouth, 0 flat, 1 a smile; and how far it is open. */
  mouth: number
  open: number
}

export function hedgehogPose(toy: Toy): HedgehogPose {
  const time = toy.time
  const rolling = progress(toy, 'hedgehog', 'roll'), unrolling = progress(toy, 'hedgehog', 'unroll')
  const huff = seconds(toy, 'hedgehog', 'huff'), sniff = progress(toy, 'hedgehog', 'sniff')
  const idle = idleOf(toy, 'hedgehog'), shift = hogShift(toy)
  const worm = wormSpot(toy)
  const aim = Math.max(-0.32, Math.min(0.32, Math.atan2(worm.y - (HEDGEHOG.y + 10), worm.x - (HEDGEHOG.x + 30)) * 0.9))
  const pose: HedgehogPose = {
    x: shift.x, y: shift.y,
    roll: rolling !== null ? ease(rolling * 1.15) : unrolling !== null ? Math.max(0, 1 - settle(unrolling, 1.5, 4)) : toy.rolled ? 1 : 0,
    ballTurn: rolling !== null ? (1 - ease(rolling)) * -1.6 : unrolling !== null ? unrolling * 0.9 : Math.sin(time * 1.9) * 0.05,
    ballScale: rolling !== null ? 0.82 + 0.18 * settle(rolling, 1.5, 4) : 1,
    shake: 0,
    faceTurn: aim, faceSlide: 0, kick: 0,
    peep: 0.55,
    breathe: 1 + 0.02 * Math.sin((time * TAU) / 1.25), fan: 0,
    blink: blink(time, 3.1, 0.12, 0.4), cross: 0, mouth: 0.5, open: 0,
  }
  // Poked again as a ball he is put out, not afraid: he swells once with a huff, turns his back on the finger so
  // that his nose and his eye go round out of sight, and comes slowly round again.
  if (huff !== null) {
    const away = smooth(huff, 0.08, 0.3) * (1 - smooth(huff, 0.45, HUFF))
    pose.ballScale = 1 + 0.1 * hump(huff, 0, 0.3)
    pose.ballTurn = -2.2 * away
    pose.peep = 0.55 * (1 - smooth(huff, 0, 0.12)) + 0.55 * smooth(huff, HUFF - 0.12, HUFF)
  }
  if (sniff !== null) { pose.faceSlide = bump(sniff, 0, 1) * 13; pose.faceTurn += Math.sin(sniff * TAU * 5) * 0.045; pose.mouth = 1; pose.open = bump(sniff, 0, 1) * 0.6 }
  if (idle?.name === 'nose-twitch') pose.faceTurn += Math.sin(idle.u * TAU * 4) * 0.05 * bump(idle.u, 0, 1)
  if (idle?.name === 'ear-flick') pose.faceTurn -= 0.08 * bump(idle.u, 0, 1)
  if (idle?.name === 'scratch') pose.kick = Math.abs(Math.sin(idle.u * TAU * 5)) * bump(idle.u, 0, 1)
  const act = acting(toy, 'hedgehog')
  if (!act) return pose
  const s = time - act.since
  switch (act.kind) {
    // The worm: he unrolls if he was a ball, snuffles at it, watches it dive, stares cross-eyed at the hole and sits back.
    case 'hog:worm': {
      const t = s - act.n
      if (t < 0) { const u = s / act.n; pose.roll = Math.max(0, 1 - settle(u, 1.5, 4)); pose.ballTurn = u * 0.9; break }
      pose.roll = 0
      pose.faceTurn = 0.3 * smooth(t, 0, 0.3) * (1 - smooth(t, 3.4, 4)) + Math.sin(t * 30) * 0.04 * hump(t, 0.1, 1.3)
      pose.faceSlide = 14 * hump(t, 0.1, 1.3) + 8 * smooth(t, 1.3, 1.9) * (1 - smooth(t, 3.4, 3.9)) - 10 * hump(t, 3.4, 4.2)
      pose.open = 0.6 * hump(t, 0.1, 1.3)
      pose.mouth = t > 1.9 ? -0.6 : 1
      pose.cross = smooth(t, 1.9, 2.1) * (1 - smooth(t, 3.4, 3.8))
      pose.blink = Math.max(jolt(t, 2.5, 0.14), jolt(t, 2.9, 0.14))
      break
    }
    // The snail: three nudges of his nose, he looks after it, and snorts when it comes back.
    case 'hog:snail':
      pose.faceSlide = 16 * Math.max(jolt(s, 0.25, 0.2), jolt(s, 0.55, 0.2), jolt(s, 0.85, 0.2)) - 8 * hump(s, 1.9, 2.3)
      pose.faceTurn = 0.2 * smooth(s, 1, 1.3) * (1 - smooth(s, 1.9, 2.2))
      pose.mouth = s > 1.2 ? -0.8 : 0.5
      pose.open = 0.5 * jolt(s, 2, 0.3)
      break
    // The feather: three sniffs, each higher, and a sneeze that fans his spines out.
    case 'hog:feather':
      pose.faceTurn = -0.1 * (smooth(s, 0.2, 0.3) + smooth(s, 0.5, 0.6) + smooth(s, 0.8, 0.9)) * (1 - smooth(s, 1.05, 1.15))
      pose.faceSlide = -6 * smooth(s, 0.2, 1) + 26 * jolt(s, 1.08, 0.3)
      pose.fan = hump(s, 1.08, 1.7)
      pose.blink = smooth(s, 0.9, 1.05) * (1 - smooth(s, 1.5, 1.7))
      pose.open = jolt(s, 1.08, 0.4)
      break
    // The acorn: a bite, his teeth judder on it, and a bat of his paw.
    case 'hog:acorn':
      pose.open = 0.9 * smooth(s, 0.2, 0.35) * (1 - smooth(s, 0.4, 0.46))
      pose.shake = s > 0.56 && s < 0.92 ? Math.sin(s * 74) * 4 : 0
      pose.blink = s > 0.5 && s < 1 ? 1 : pose.blink
      pose.mouth = s > 0.4 ? -1 : 0.5
      pose.kick = jolt(s, 1, 0.25)
      pose.faceSlide = 10 * jolt(s, 0.3, 0.2)
      break
    // The button: he sees himself, starts back, makes a face at the face, and pats it.
    case 'hog:button':
      pose.faceSlide = -18 * jolt(s, 0.3, 0.4) + 10 * hump(s, 0.8, 1.2)
      pose.cross = 0.6 * hump(s, 0.8, 1.2)
      pose.mouth = s > 0.7 && s < 1.3 ? -1 : 0.5
      pose.open = 0.8 * hump(s, 0.8, 1.2) + 0.5 * jolt(s, 1.5, 0.3)
      pose.kick = jolt(s, 1.2, 0.25)
      break
    // The apple: he rolls onto it, stands up with it on his spines, and walks one small proud circle.
    case 'hog:apple':
      pose.roll = 0.48 * hump(s, 0, 0.9)
      pose.kick = s > 0.9 && s < 2.4 ? Math.abs(Math.sin((s - 0.9) * Math.PI / 0.35)) : 0
      pose.faceTurn = -0.22 * smooth(s, 0.9, 1.1) * (1 - smooth(s, 2.3, 2.6))
      pose.mouth = 1
      break
    // A ball still: the snail's squelches rock him a little.
    case 'ball:snail':
      pose.ballTurn = Math.sin(s * 5.2) * 0.04 * hump(s, 0.3, 2.4)
      pose.peep = 0.8
      break
    // The ball shakes with giggles.
    case 'ball:feather':
      pose.shake = s > 0.4 && s < 1.4 ? Math.sin(s * 52) * 5 : 0
      pose.peep = 0.2
      break
    case 'ball:acorn':
      pose.ballScale = 1 - thud(s, 0.15, 0.1)
      pose.peep = 0.9 * hump(s, 0.3, 1.3)
      break
    // One eye opens between the spines to look at the glint, and shuts.
    case 'ball:button':
      pose.peep = hump(s, 0.4, 1.3)
      break
    case 'ball:apple':
      pose.ballScale = 1 - thud(s, 0.25, 0.12)
      break
    // The apple comes off his spines with a pop: he starts.
    case 'pulled':
      pose.shake = Math.sin(s * 50) * 5 * (1 - s / 0.5)
      pose.ballScale = 1 + 0.06 * jolt(s, 0, 0.2)
      break
  }
  return pose
}

export type JayPose = {
  /** Where his middle is: on the rim of his nest, or where his flight has him. */
  x: number
  y: number
  /** 1 as he was cut, facing left; -1 turned about. */
  facing: number
  scale: number
  turn: number
  wing: number
  tail: number
  headTurn: number
  headX: number
  headY: number
  crest: number
  beak: number
  blink: number
}

export function jayPose(toy: Toy): JayPose {
  const time = toy.time, body = jayBody(toy), away = jayAway(toy)
  const ruffle = progress(toy, 'jay', 'ruffle'), ooh = progress(toy, 'jay', 'ooh'), rustle = progress(toy, 'nest', 'rustle')
  const idle = idleOf(toy, 'jay')
  const pose: JayPose = { x: body.x, y: body.y, facing: 1, scale: 1 + 0.012 * Math.sin((time * TAU) / 0.9), turn: 0, wing: 0, tail: 0, headTurn: 0, headX: 0, headY: 0, crest: 0.12, beak: 0, blink: Math.max(blink(time, 2.3, 0.09, 0), blink(time, 2.3, 0.09, 2.3 - 0.2)) }
  if (ruffle !== null) {
    const swell = Math.sqrt(bump(ruffle, 0, 1))
    pose.scale += RUFFLE * swell
    pose.turn = Math.sin(ruffle * TAU * 6) * 0.06 * swell
    pose.wing = -0.9 * swell
    pose.tail = 0.35 * swell
    pose.headTurn = Math.sin(ruffle * TAU * 5) * 0.25 * swell
    pose.crest = swell
    pose.beak = Math.abs(Math.sin(ruffle * TAU * 5.5)) * swell
  } else if (ooh !== null) {
    const stretch = plateau(ooh, 0.2)
    pose.headX = -12 * stretch
    pose.headY = -15 * stretch
    pose.turn = -0.12 * stretch
    pose.crest = 0.12 + 0.6 * stretch
    pose.beak = 0.5 * stretch
  } else if (rustle !== null) {
    pose.headTurn = 0.3 * plateau(rustle, 0.2)
    pose.headY = 6 * plateau(rustle, 0.2)
  } else if (idle?.name === 'head-tilt') {
    pose.headTurn = 0.38 * plateau(idle.u)
  } else if (idle?.name === 'tail-flick') {
    pose.tail = -0.45 * bump(idle.u, 0, 1)
  } else if (idle?.name === 'preen') {
    const down = plateau(idle.u)
    pose.headTurn = -0.85 * down
    pose.headX = 16 * down
    pose.headY = 20 * down
    pose.wing = -0.22 * Math.abs(Math.sin(idle.u * TAU * 4)) * down
  }
  const act = acting(toy, 'jay')
  if (!act) return pose
  const s = time - act.since, [family, thing] = act.kind.split(':')
  // In the air his wing beats; on the ground by a thing he bends to it.
  const flying = away > 0.05 && away < 0.999 ? 1 : 0
  if (flying) pose.wing = -0.5 - 0.6 * Math.sin(time * 26)
  const peck = (at: number): number => jolt(s, at - 0.08, 0.22)
  const bend = (amount: number): void => { pose.headTurn = -0.7 * amount; pose.headX = -10 * amount; pose.headY = 26 * amount }
  if (family === 'steal') {
    // His head snaps round, he drops from the nest and snatches; home, he preens with his back to the wood.
    pose.headTurn = -0.5 * jolt(s, 0.05, 0.5)
    pose.crest = Math.max(pose.crest, jolt(s, 0.3, 0.6))
    pose.beak = jolt(s, 0.45, 0.4)
    if (thing === 'apple') {
      // Too heavy: he tugs at it, flapping furiously, and gives up.
      const tug = span(s, 1.6, 1.7) * (1 - span(s, 3.1, 3.3))
      pose.wing = tug > 0 ? -0.6 - 0.7 * Math.sin(time * 40) : pose.wing
      pose.turn = 0.2 * tug + Math.sin(s * 15.7) * 0.06 * tug
      bend(Math.max(smooth(s, 1.4, 1.6) * (1 - smooth(s, 3.2, 3.4)), 0))
      pose.crest = Math.max(pose.crest, tug)
    } else {
      bend(peck(1.5) + (thing === 'acorn' ? peck(2.3) + peck(3.1) : 0))
      // On the way home each thing tells on him: the worm knotted round his beak makes him shake his head, the
      // snail's weight tips him forward, and the wet feather slaps him at each beat.
      const carrying = span(s, 1.7, 1.9) * (1 - span(s, 3, 3.2))
      if (thing === 'worm') pose.headTurn += 0.28 * Math.sin(s * 22) * carrying
      if (thing === 'snail') pose.turn = -0.16 * carrying
      if (thing === 'feather') pose.wing -= 0.5 * Math.max(hump(s, 2, 2.2), hump(s, 2.5, 2.7), hump(s, 3, 3.2))
      const home = thing === 'acorn' ? 4.4 : 3.6
      if (s > home) { pose.facing = -1; const down = plateau(span(s, home, act.length)); pose.headTurn = -0.85 * down; pose.headX = 16 * down; pose.headY = 20 * down; pose.wing = -0.22 * Math.abs(Math.sin(s * 9)) * down }
    }
  } else if (act.kind === 'path:worm') {
    // He looks, tilts his head, and looks away.
    pose.headX = -10 * hump(s, 0.2, 0.9)
    pose.headTurn = 0.42 * hump(s, 0.8, 1.6) - 0.6 * hump(s, 1.7, 2.5)
  } else if (act.kind === 'path:snail') {
    // He swoops at the shine, pecks the trail twice, finds nothing, and is offended.
    bend(peck(2.2) + peck(2.45))
    pose.crest = Math.max(pose.crest, hump(s, 2.8, 3.3))
    pose.beak = hump(s, 2.85, 3.2)
    pose.scale += 0.12 * hump(s, 2.8, 3.3)
  } else if (act.kind === 'path:feather') {
    // He looks at it, checks his own tail, and looks proud.
    pose.headX = -10 * hump(s, 0.4, 1.2)
    pose.headTurn = -0.95 * hump(s, 1.25, 1.95)
    pose.tail = -0.5 * hump(s, 1.3, 2.6)
    pose.scale += 0.1 * hump(s, 1.9, 2.7)
    pose.crest = Math.max(pose.crest, hump(s, 1.9, 2.7))
    pose.headY = -8 * hump(s, 1.9, 2.7)
  } else if (act.kind === 'path:acorn') {
    // He hops down, raps it once with his beak, cocks his head, and hops back up.
    bend(peck(2))
    pose.headTurn += 0.45 * hump(s, 2.1, 2.4)
  } else if (act.kind === 'path:apple') {
    // He runs on top of it as it turns, and falls off.
    const on = span(s, 1.9, 2) * (1 - span(s, 3, 3.05))
    pose.wing = on > 0 ? -0.5 - 0.5 * Math.sin(s * 31) : pose.wing
    pose.turn = Math.sin(s * 16) * 0.14 * on + smooth(s, 3, 3.2) * (1 - smooth(s, 3.3, 3.5)) * 1.3
    pose.beak = hump(s, 2.95, 3.3)
    pose.crest = Math.max(pose.crest, hump(s, 2.9, 3.5))
  } else if (act.kind === 'water:button') {
    // He lands on the bank, pecks at his own reflection, is splashed, and shakes himself dry.
    bend(peck(1.2))
    pose.y -= 18 * jolt(s, 1.4, 0.3)
    pose.crest = Math.max(pose.crest, hump(s, 1.4, 2.5))
    pose.turn = s > 1.9 && s < 2.4 ? Math.sin(s * 70) * 0.12 : 0
    pose.wing = s > 1.9 && s < 2.4 ? -0.4 - 0.3 * Math.sin(s * 70) : pose.wing
  } else if (act.kind === 'tipped') {
    // His nest is tipped out: he looks down after his things.
    bend(plateau(span(s, 0, 0.9), 0.2) * 0.8)
    pose.crest = Math.max(pose.crest, hump(s, 0, 0.9))
  }
  // He faces the thing he has flown down to when it lies to his right.
  if (away > 0.5 && act.to.x > pose.x && family !== 'water') pose.facing = -1
  return pose
}

export type ToadPose = {
  /** Where his feet are, and in which frame. */
  feetX: number
  feetY: number
  room: boolean
  y: number
  x: number
  turn: number
  sx: number
  sy: number
  throat: number
  headTilt: number
  headY: number
  mouth: number
  blinkLeft: number
  blinkRight: number
  /** He has his back to the child. */
  back: boolean
}

export function toadPose(toy: Toy): ToadPose {
  const time = toy.time, now = toadNow(toy)
  const croak = progress(toy, 'toad', 'croak'), idle = idleOf(toy, 'toad')
  const breathe = 1 + 0.025 * Math.sin((time * TAU) / 3.4)
  const both = blink(time, 5.7, 0.25, 1.3)
  const pose: ToadPose = { feetX: now.feet.x, feetY: now.feet.y, room: now.room, y: 0, x: 0, turn: 0, sx: 1, sy: breathe, throat: 1, headTilt: 0, headY: 0, mouth: 0, blinkLeft: both, blinkRight: both, back: false }
  if (croak !== null) {
    const t = croak * 1.3
    if (t < 0.5) {
      const fill = ease(t / 0.5)
      pose.throat = 1 + 1.7 * fill
      pose.headTilt = -0.1 * fill
      pose.headY = -8 * fill
      pose.sy = 1 + 0.05 * fill
    } else if (t < 1) {
      const up = Math.sin(((t - 0.5) / 0.5) * Math.PI), out = ease((t - 0.5) / 0.3)
      pose.y = -74 * up
      pose.throat = 2.7 - 1.7 * out + 0.08 * Math.sin(t * 80) * (1 - out)
      pose.mouth = 1 - 0.7 * ease((t - 0.8) / 0.2)
      pose.sy = 1 + 0.14 * up
      pose.sx = 1 - 0.08 * up
      pose.headTilt = -0.1 * (1 - out)
    } else {
      const since = t - 1, squash = 0.22 * Math.exp(-10 * since) * Math.cos(26 * since)
      pose.sy = 1 - squash
      pose.sx = 1 + squash
      pose.mouth = 0.3 * Math.exp(-8 * since)
    }
  } else if (idle?.name === 'throat-pulse') {
    pose.throat = 1 + 0.4 * Math.abs(Math.sin(idle.u * TAU))
  } else if (idle?.name === 'slow-wink') {
    pose.blinkLeft = Math.max(both, bump(idle.u, 0, 0.6))
    pose.blinkRight = Math.max(both, bump(idle.u, 0.4, 1))
  } else if (idle?.name === 'shift') {
    pose.turn = Math.sin(idle.u * TAU) * 0.05
    pose.x = Math.sin(idle.u * TAU) * 5
  }
  const act = acting(toy, 'toad')
  if (!act) return pose
  const s = time - act.since
  // In the air he stretches; landing, he squashes.
  if (now.leap !== null) {
    const up = Math.sin(now.leap * Math.PI)
    pose.y = -now.high * up
    pose.sy = 1 + 0.16 * up
    pose.sx = 1 - 0.09 * up
  }
  if (now.landed !== null) { const squash = thud(now.landed, 0, 0.24); pose.sy = 1 - squash; pose.sx = 1 + squash }
  const pulse = (at: number, lasts = 0.3, by = 1): void => { pose.throat = Math.max(pose.throat, 1 + by * jolt(s, at, lasts)); pose.mouth = Math.max(pose.mouth, 0.6 * jolt(s, at, lasts)) }
  const gather = (from: number, to: number): void => { const low = smooth(s, from, to) * (1 - span(s, to, to + 0.08)); pose.sy *= 1 - 0.2 * low; pose.sx *= 1 + 0.12 * low }
  // From where he has landed he croaks once.
  if (act.kind.startsWith('stone:') && now.landed !== null) pulse(act.kind === 'stone:apple' ? 2 : 3.1, 0.4, 1.2)
  switch (act.kind) {
    // The worm: a deep double croak, and he leaps.
    case 'stone:worm': pulse(0.4, 0.3, 1.5); pulse(0.8, 0.3, 1.5); gather(1.2, 1.7); break
    // The snail: two low croaks, pleased, his eyes half shut.
    case 'stone:snail': pulse(0.4, 0.35, 0.8); pulse(0.9, 0.35, 0.8); pose.blinkLeft = pose.blinkRight = Math.max(both, 0.6 * hump(s, 0.3, 1.4)); gather(1.2, 1.7); break
    // The feather: he sneezes in the middle of his leap and lands backwards, then hops round.
    case 'stone:feather': {
      pulse(0.5, 0.3, 1)
      gather(1.2, 1.7)
      pose.mouth = Math.max(pose.mouth, jolt(s, 2.1, 0.3))
      pose.turn = smooth(s, 2.1, 2.5) * TAU
      pose.back = s >= 2.3 && s < 3.4
      const round = jolt(s, 3.25, 0.3)
      pose.y -= 26 * round
      pose.sx *= 1 - 0.9 * round
      break
    }
    // The acorn: he knocks on it twice with a knuckle.
    case 'stone:acorn': { const lean = Math.max(jolt(s, 0.42, 0.2), jolt(s, 0.77, 0.2)); pose.x = -22 * lean; pose.turn = -0.16 * lean; pose.headY = 8 * lean; pulse(1.3, 0.25, 0.7); gather(1.35, 1.7); break }
    // The button: he sees himself, starts, and squeaks.
    case 'stone:button': pose.y -= 22 * jolt(s, 0.4, 0.3); pose.headTilt = -0.14 * hump(s, 0.4, 1.2); pulse(0.6, 0.3, 0.5); gather(1.2, 1.7); break
    // The apple: the stone tips and flings him, turning, into the air.
    case 'stone:apple': pose.turn = smooth(s, 0.4, 1.4) * TAU; pose.mouth = Math.max(pose.mouth, 0.8 * hump(s, 0.4, 1.4)); pose.throat = Math.max(pose.throat, 1 + 0.8 * hump(s, 0.4, 1.4)); break
    // Splashed by the apple, he blinks.
    case 'water:apple': pose.blinkLeft = pose.blinkRight = Math.max(jolt(s, 0.2, 0.3), jolt(s, 0.6, 0.3)); pose.sy *= 1 - 0.08 * jolt(s, 0.2, 0.3); break
    // Sent home: he gathers and leaps in one arc.
    case 'home': pose.throat = Math.max(pose.throat, 1 + 0.5 * hump(s, 0, 0.9)); break
  }
  return pose
}

/** The hole the worm dived into, which the hedgehog stares at: where it is, and how far open, from 0 to 1. Null when there is none. */
export function holeOf(toy: Toy): { at: P; open: number } | null {
  const act = acting(toy, 'hedgehog', 'hog:worm')
  if (!act) return null
  const t = toy.time - act.since - act.n, open = smooth(t, 1.4, 1.9) * (1 - smooth(t, 3.7, 4.2))
  return open > 0.02 ? { at: { x: act.to.x, y: act.to.y + 20 }, open } : null
}

/** The wake behind the feather as it glides across the water: where the feather is, and how strong the wake, from 0 to 1. */
export function wakeOf(toy: Toy): { at: P; room: boolean; strength: number } | null {
  const act = acting(toy, 'thing:feather', 'water:feather')
  if (!act) return null
  const s = toy.time - act.since, strength = smooth(s, 0.1, 0.3) * (1 - smooth(s, 1.3, 1.7)), seen = drawn(toy, 'feather')
  return strength > 0.02 && seen ? { at: seen.at, room: seen.room, strength } : null
}

/** How far the toad's knuckle is out to the acorn on his stone: it knocks twice, with the two toks, from 0 to 1. */
export function knuckleOf(toy: Toy): number {
  const s = seconds(toy, 'toad', 'stone:acorn')
  return s === null ? 0 : Math.max(jolt(s, 0.42, 0.2), jolt(s, 0.77, 0.2))
}

/** How long the hedgehog's huff lasts: the length of its sound (voices.ts). */
const HUFF = 0.7

/** How much bigger than himself the jay swells when he is poked: by a third, which is as far as the open flap of the burrow beside him leaves room for. */
export const RUFFLE = 0.32

/** How far the toad's stone is tipped: it rocks like a seesaw when the apple comes down on its bare half. */
export function slabTilt(toy: Toy): number {
  const s = seconds(toy, 'slab')
  return s === null || s < 0.3 ? 0 : -0.2 * Math.exp(-3.2 * (s - 0.3)) * Math.cos(9 * (s - 0.3))
}

/** The angle a hanging piece swings at: a slow sway always, and a damped swing from the last knock near it. */
export function hangerAngle(toy: Toy, index: number): number {
  const sway = 0.022 * Math.sin(toy.time * 0.8 + index * 2.1)
  if (toy.knock.hanger !== index) return sway
  const since = toy.time - toy.knock.since
  return since < 0 || since > 6 ? sway : sway + 0.2 * Math.exp(-1.1 * since) * Math.sin(5.2 * since)
}

/** The wheel's angle: the season's quarter at the top, reached in three jerks, one to each clack. */
export function wheelAngle(toy: Toy): number {
  const target = -SEASONS.indexOf(toy.season) * (Math.PI / 2)
  const s = seconds(toy, 'wheel', 'turn')
  if (s === null) return target
  const jerks = TURN.clacks.reduce<number>((sum, at) => sum + ease((s - at) / 0.45), 0) / TURN.clacks.length
  return target + (Math.PI / 2) * (1 - jerks)
}

/** Which side a stained piece shows and how far it has flipped: 1 is flat to the eye, 0 is edge on. */
export function flipOf(toy: Toy, piece: Pick<Seasonal, 'x'>): { season: Season; flat: number } {
  const s = seconds(toy, 'wheel', 'turn')
  if (s === null) return { season: toy.season, flat: 1 }
  const u = clamp01((s - 0.5 - flipDelay(piece) * TURN.wave) / TURN.flip)
  return { season: u < 0.5 ? toy.turnedFrom : toy.season, flat: Math.abs(Math.cos(u * Math.PI)) }
}

/** How far the view has slid from the wood (0) into the room at the table (1). */
export function slideOf(toy: Toy): number {
  const act = acting(toy, 'view')
  if (!act) return toy.room ? 1 : 0
  const s = toy.time - act.since
  return act.kind === 'in' ? ease(s / 1.3) : 1 - ease(s / 0.8)
}

const ALIVE: ReadonlySet<string> = new Set(['ladybird', 'tadpole', 'skater', 'caterpillar', 'beetle', 'moth', 'sleeper', 'bubble', 'woodlouse'])

/**
 * Who lives under a cover (a dweller, or the woodlouse that moved in), whether it can be seen yet, and how it is
 * drawn at this moment. A thing that is at home there is not here: it is drawn as the thing it is.
 */
export function findPose(toy: Toy, place: PlaceId): { find: FindId | 'woodlouse'; shown: boolean; pose: FindPose; fade: number } | null {
  const cover = toy.covers[place], a = amount(toy, place)
  // The woodlouse trundles out of sight as the thing comes home.
  const leaving = progress(toy, `find:${place}`, 'louseOut')
  if (leaving !== null) return { find: 'woodlouse', shown: a > 0.3, pose: { dx: 64 * leaving, dy: 0, turn: leaving * 9, sx: 1, sy: 1, own: 1 }, fade: 1 - leaving }
  const find = dwellerAt(toy, place)
  if (find !== 'woodlouse' && toy.things[find as keyof typeof toy.things]) return null
  const hello = progress(toy, `find:${place}`, 'hello'), acted = progress(toy, `find:${place}`, 'act')
  let pose: FindPose
  if (hello !== null) pose = helloPose(hello)
  else if (acted !== null) pose = (find === 'woodlouse' ? LOUSE : MANNERS[find]).pose(acted)
  else if (cover.open && !cover.greeted) pose = helloPose(0)
  else pose = { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1, own: 0 }
  if (ALIVE.has(find) && hello === null && acted === null) pose.sy *= 1 + 0.03 * Math.sin(toy.time * 2.2 + SPOTS[place].find.x)
  return { find, shown: a > 0.3, pose, fade: 1 }
}

