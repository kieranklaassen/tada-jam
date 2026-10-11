import type { MoleFace } from './cast'
import { through } from './cast'
import { ACTS, CHARM_EVERY_S, HAT_S, WALK_S, type ActName, type Game } from './game'
import { CAGE, rowOf, type Tool } from './layout'
import { MOLE_DUCKED, MOLE_TALL } from './shapes'

// How the mole holds himself, read off the game's own clock. Every act has
// its moments (`ACTS` in game.ts): the game makes a sound at each, and the
// pose here is at its far point at the same moment, so a blow is seen to
// land when it is heard. The view only draws what this says.

/** How long before a moment the paw starts toward it, and how long after it the paw comes back. */
export const WIND_S = 0.12
export const BACK_S = 0.16

/**
 * How far into its blow an act is at `t` seconds: 0 away from every moment, rising to exactly 1 at each moment
 * of the act and falling away after it.
 */
export function strikeOf(act: ActName, t: number): number {
  let most = 0
  for (const cue of ACTS[act].cues as readonly number[]) {
    const before = cue - t
    const k = before >= 0 ? 1 - before / WIND_S : 1 - (t - cue) / BACK_S
    if (k > most) most = k
  }
  // A blow speeds up into its moment.
  return most <= 0 ? 0 : most * most
}

/**
 * How far the rope held in a gas pocket leans, -1 to 1, `t` seconds into that act: it stands up at the act's
 * moment and is at one end of its sway at every hiss after it.
 */
export function swayOf(t: number): number {
  const from = t - ACTS.ropeCharm.cues[0]
  return from < 0 ? 0 : Math.cos((from * Math.PI) / CHARM_EVERY_S)
}

/** Which of the act's moments have passed at `t`. */
export function passed(act: ActName, t: number): number {
  let n = 0
  for (const cue of ACTS[act].cues as readonly number[]) if (t >= cue) n += 1
  return n
}

/** What is in his near paw: the tool he carries, and the pick for a blow of the pick. A mallet blow is the pick's on the wedge. */
export function heldIn(act: ActName | null, tool: Tool | null): 'pick' | Tool {
  if (act === 'swing' || act === 'judder' || act === 'mallet' || act === 'shake' || act === 'take' || act === 'put') return 'pick'
  return tool ?? 'pick'
}

export type MolePose = {
  /** Which way the block he works on lies: 0 level, 1 below, -1 above. */
  down: number
  /** What his near paw holds, the angle it is held at, how far the paw is pushed out toward the block, and how far into a blow it is. */
  held: 'pick' | Tool
  arm: number
  reach: number
  strike: number
  /** The whole body: tipped, lifted off the floor, shaken sideways, stepping, and scaled. Under a lamp that hangs in his block he is scaled down to duck. */
  lean: number
  roll: number
  lift: number
  bob: number
  shake: number
  stride: number
  wide: number
  tall: number
  /** The hat pulled down over his eyes, 0 to 1. */
  hatDown: number
  /** His ears, 0 up and 1 flat. */
  ears: number
  eyes: 'open' | 'shut' | 'wide' | 'cross'
  /** Sitting down hard, 0 to 1; spread out against the roof, 0 to 1. */
  sit: number
  spread: number
  /** His hat smoking. */
  smoke: boolean
  /** His far paw wiping his brow, 0 to 1, and his hat tipped back, 0 to 1: his own idle moves. */
  wipe: number
  tip: number
  /** His nose twitching, and his paws shaking a sting out. */
  nose: number
  sting: number
}

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t))
const REST = -2.05

/** The mole's pose now. */
export function molePose(game: Game, face: MoleFace): MolePose {
  const mole = game.mole, world = game.world
  const down = Math.sign(rowOf(mole.to) - rowOf(world.mole.at))
  const aim = down > 0 ? 1.3 : down < 0 ? -1.3 : 0.12
  const pose: MolePose = {
    down, held: heldIn(mole.act, world.mole.tool), arm: REST, reach: 0, strike: 0, lean: 0, roll: 0, lift: 0, bob: 0, shake: 0, stride: 0,
    wide: 1, tall: mole.duck ? MOLE_DUCKED / MOLE_TALL : 1, hatDown: 0, ears: 0, eyes: 'open', sit: 0, spread: 0, smoke: false,
    wipe: 0, tip: 0, nose: face.nose, sting: face.sting,
  }
  // The hat: knocked down by a finger, and pulled down for as long as he stands in white light.
  pose.hatDown = Math.max(mole.hat > 0 ? Math.min(1, (HAT_S - mole.hat) / 0.07, mole.hat / 0.25) : 0, mole.dazzled ? 1 : 0)
  if (mole.cross > 0 || mole.hang) { pose.ears = 1; pose.eyes = 'cross' }

  if (mole.mode === 'walk') {
    const k = clamp01(mole.t / WALK_S)
    pose.bob = -Math.abs(Math.sin(k * Math.PI)) * 5
    pose.stride = Math.sin(k * Math.PI * 2) * 7
    pose.lean = 0.1
  } else if (mole.mode === 'act' && mole.act) {
    const act = mole.act, t = mole.t
    const strike = strikeOf(act, t), done = passed(act, t)
    pose.strike = strike
    pose.arm = REST + (aim - REST) * strike
    pose.reach = strike
    pose.lean = 0.16 * strike - 0.1 * (1 - strike) * (strike > 0 ? 1 : 0)
    if (down !== 0) pose.lean += (down > 0 ? 0.28 : -0.2) * (0.4 + 0.6 * strike)
    switch (act) {
      case 'judder': {
        const s = 1 - clamp01(t / ACTS.judder.length)
        pose.shake = Math.sin(t * 85) * 5 * s
        pose.arm = aim - 0.5 + Math.sin(t * 70) * 0.35 * s
        pose.lean = -0.12 * s
        pose.eyes = 'wide'
        break
      }
      case 'wedgeEarth':
        // In to the hilt, a long heave, out with a pop, and down he sits.
        if (done >= 1 && done < 2) { pose.reach = 1; pose.lean = -0.3 * clamp01((t - ACTS.wedgeEarth.cues[0]) / 0.7); pose.arm = aim }
        if (done >= 2) { pose.lean = -0.25; pose.arm = REST }
        if (done >= 3) { pose.sit = 1; pose.lean = 0; pose.eyes = 'wide' }
        break
      case 'spoutMake':
        // The jet is in his eye until it settles to a drip.
        if (done >= 1) { pose.eyes = 'shut'; pose.lean = -0.22 * (1 - clamp01((t - 0.6) / 0.4)); pose.hatDown = Math.max(pose.hatDown, 0.3) }
        break
      case 'ventMake':
        // He holds the wedge in while the gas whistles out, as far from it as his arm allows.
        if (done >= 1) { pose.reach = 1; pose.arm = aim; pose.lean = -0.26; pose.ears = 1; pose.eyes = 'shut' }
        break
      case 'prise':
        if (done >= 2) { pose.hatDown = Math.max(pose.hatDown, 1 - clamp01((t - ACTS.prise.cues[1]) / 0.25)); pose.eyes = 'wide' }
        break
      case 'gong':
        // His teeth go on rattling.
        if (done >= 1) { pose.shake = Math.sin(t * 90) * 3 * (1 - clamp01((t - 0.22) / 0.85)); pose.eyes = 'wide' }
        break
      case 'catchGas':
      case 'float':
        // Hanging from the handle of a bucket full of gas.
        if (act === 'float' || done >= 1) { pose.arm = -Math.PI / 2; pose.reach = 0.6; pose.lift = act === 'float' && mole.afloat ? 8 : 0; pose.eyes = 'wide'; pose.stride = Math.sin(t * 9) * 4 }
        break
      case 'tip':
      case 'tipFeet':
        if (done >= 1) pose.arm = aim + 1.5 * (1 - clamp01((t - ACTS[act].cues[0]) / 0.5))
        // Blown back over him: he stands in it with his eyes shut.
        if (act === 'tipFeet' && done >= 3) { pose.eyes = 'shut'; pose.lean = 0.2 * (1 - clamp01((t - ACTS.tipFeet.cues[2]) / 0.8)); pose.shake = Math.sin(t * 40) * 2 }
        break
      case 'ropeEarth':
        if (done >= 1 && done < 2) { pose.reach = 1; pose.arm = aim; pose.lean = -0.2 * clamp01((t - ACTS.ropeEarth.cues[0]) / 0.6) }
        break
      case 'ropeSaw':
        pose.arm = aim
        pose.reach = 0.5 + 0.5 * Math.sin(t * 18)
        break
      case 'ropeTwang':
        // The rope goes taut, and it puts him on his back.
        if (done >= 1) { pose.lean = -0.3; pose.arm = aim; pose.reach = 1 }
        if (done >= 2) { pose.roll = -Math.PI / 2; pose.lean = 0; pose.eyes = 'wide'; pose.reach = 0 }
        break
      case 'haul':
        if (done >= 1) { pose.arm = aim; pose.reach = 1 - strikeOf('haul', t) * 0.6; pose.lean = -0.34 * strikeOf('haul', t) }
        break
      case 'ropeBob':
        if (done >= 2) { pose.arm = 1.5; pose.reach = 0.2; pose.lean = 0.2 }
        break
      case 'ropeCharm':
        if (done >= 1) { pose.arm = aim; pose.reach = 1; pose.eyes = 'wide' }
        break
      case 'hang':
        pose.arm = -1.4
        pose.lift = 4 * strike
        break
      case 'take':
      case 'put':
        pose.lean = 0.5 * strike
        pose.arm = 1.2 * strike + REST * (1 - strike)
        break
      case 'refuse': {
        // No room for it there: he shakes his head, hugs the bucket in and pats what is in it.
        const k = clamp01(t / ACTS.refuse.length)
        pose.shake = Math.sin(k * Math.PI * 6) * 3.5 * (1 - k)
        pose.lean = -0.08
        pose.arm = REST + 0.5 * strike
        pose.reach = 0
        pose.ears = 0.6
        break
      }
      case 'shake':
        // Like a dog: a twist one way and the other at every flap.
        pose.roll = (done % 2 ? 1 : -1) * 0.3 * strike
        pose.wide = 1 + 0.12 * strike
        pose.eyes = 'shut'
        break
      default:
        break
    }
  } else if (mole.mode === 'scene') {
    if (mole.pose === 'shoot') { pose.tall = 1.12; pose.wide = 0.9; pose.arm = -1.5; pose.eyes = 'wide' }
    if (mole.pose === 'splat') { pose.spread = 1; pose.smoke = true; pose.eyes = game.sceneAge % 0.6 < 0.12 && game.sceneAge > 1.4 && game.sceneAge < 2.7 ? 'shut' : 'wide' }
    if (mole.pose === 'glare') { pose.spread = 1; pose.smoke = true; pose.ears = 1; pose.eyes = 'cross' }
    if (mole.pose === 'swept') {
      const shaken = game.shaking > 0 ? game.time - game.shaking : 1
      pose.roll = shaken < 0.2 ? Math.sin((shaken / 0.2) * Math.PI) * 0.3 * (Math.floor(game.shaking * 5) % 2 ? 1 : -1) : game.swept ? -0.5 : 0
      pose.eyes = shaken < 0.2 ? 'shut' : 'wide'
      pose.wide = shaken < 0.2 ? 1.1 : 1
    }
    if (mole.pose === 'ride') pose.bob = Math.sin(game.staging.wind * Math.PI * 2) * 1.5
    if (mole.pose === null) {
      // Stepping out of the cage into the new burrow.
      pose.bob = -Math.abs(Math.sin(game.stepping * Math.PI)) * 5
      pose.stride = Math.sin(game.stepping * Math.PI * 2) * 7
      pose.lean = 0.1
    }
  } else {
    if (mole.hang) { pose.spread = 1; pose.smoke = false }
    // At rest: his own idle moves, and nothing while a lamp makes him duck.
    const p = through(face.idleBeat) ?? 0
    if (face.idle === 'sniff') pose.lean = -0.12 * Math.sin(p * Math.PI) + Math.sin(p * 44) * 0.035
    if (face.idle === 'wipe') pose.wipe = Math.sin(p * Math.PI)
    if (face.idle === 'tip' && !mole.duck && pose.hatDown === 0) pose.tip = Math.sin(p * Math.PI)
    // In the cage he waits with his pick down.
    if (world.mole.at === CAGE) pose.arm = 1.2
  }
  if (face.sting > 0 && mole.mode !== 'act') pose.shake += Math.sin(face.time * 60) * 2.5 * face.sting
  return pose
}
