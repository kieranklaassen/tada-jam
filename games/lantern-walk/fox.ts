import { BODY_APART, FALLEN_WORM, FOX_LANE, FOX_LEAP, HEDGEHOG_LANE, PAPER_BOX, PLACES, wormPlace } from './layout'
import { notice, see } from './seen'
import { clamp, toward, type Wood } from './wood'

// The fox. Its rule is red: it gets up and follows the red patch three paces
// behind, stops when the lantern stops, sits and looks away as if it had not
// moved. Every other light is a wrong use, and it works:
//   yellow   it squints, its nose wrinkles, and it sneezes its tail to twice the size
//   blue     a puddle: it dabs it with a paw, shakes the paw and jumps over it
//   a rush   it pounces on the patch as on a mouse and lands on its nose
//   unlit    it creeps right up to the lantern and sniffs; its nose knocks the glass, where it can get that near
//   plain    it tilts its head further and further until it tips onto its side
// The light on it is asked of the whole fox as it is drawn (seen.ts): wherever it is shown lit, it answers.
// It keeps to its own lane (layout.ts) and to the left of the hedgehog, a body's length from it.

export type Fox = {
  x: number
  mode: 'sit' | 'walk' | 'pretend' | 'sneeze' | 'puddle' | 'pounce' | 'sniff' | 'tilt'
  facing: number
  stride: number
  /** Seconds into the act it is at. */
  t: number
  /** Seconds before it answers anything again. */
  rest: number
  /** The tail puffed up, 0 to 1. */
  puff: number
  /** How far the nose is wrinkled and the eyes squinted, 0 to 1. */
  squint: number
  /** The paw out over the puddle, 0 to 1, and how hard it shakes. */
  paw: number
  shake: number
  /** How high it is off the ground. */
  air: number
  /** Nose down and tail up, 0 to 1. */
  dive: number
  /** The neck stretched to the lantern, 0 to 1, and the start back from it. */
  reach: number
  recoil: number
  /** The head tilted, 0 to 1, and the fox on its side, 0 to 1. */
  tilt: number
  over: number
  /** Where a leap began and where it lands. */
  fromX: number
  toX: number
  /** Which beat of the act has sounded. */
  beat: number
  /** The ending: where it walks to, to sit just outside the red glow. Null at every other time. */
  goTo: number | null
  /** Its rule, as it begins: where it steps to, a pace into the red, before it sits and looks away. Null at every other time. */
  into: number | null
  /** Where it steps to, to the left, to let the hedgehog by; null when nobody has asked. */
  aside: number | null
  /** 1 while it creeps up to a lantern that gives no light, low and long; 0 at every other time. */
  creep: number
  /** How far the stretched neck is raised or lowered to the lantern's height, -1 to 1. */
  raise: number
  /** Which side its brush stands on as it sits, -1 to 1: the side away from the lantern, and it swishes round behind when the lantern crosses over. */
  brush: number
  /** 1 as it sees a light it is not answering: a blink and a flick of both ears, falling to 0. */
  glance: number
  glanceWait: number
  /** A light lay on it at the last step. */
  saw: boolean
}

/** Three paces: how far behind the red patch it follows. */
export const PACE = 104
export const BEHIND = PACE * 3
/** How far the neck stretches towards a lantern that gives no light, how far it can raise or lower its head, and how far the head turns to put the muzzle first. */
export const NECK = 60
export const NECK_RISE = 30
export const NECK_DIP = 100
export const NECK_TURN = 1.3
/** From the middle of its head to the tip of its muzzle, as figures.ts draws the head. */
export const MUZZLE = 60
/** How far off its head smells a lantern that gives no light, and gets up to creep to it: further than any other creature minds one, so the creep is a walk and not a lean. */
const SMELLS = 300

export function freshFox(x: number): Fox {
  return { x, mode: 'sit', facing: -1, stride: 0, t: 0, rest: 0, puff: 0, squint: 0, paw: 0, shake: 0, air: 0, dive: 0, reach: 0, recoil: 0, tilt: 0, over: 0, fromX: x, toX: x, beat: 0, goTo: null, into: null, aside: null, creep: 0, raise: 0, brush: -1, glance: 0, glanceWait: 0, saw: false }
}

/** Where its head is when it sits: what a lantern that gives no light must come near. */
export const foxHead = (x: number) => ({ x: x - 8, y: PLACES.fox.y - 150 })
export const foxChest = (x: number) => ({ x, y: PLACES.fox.y - 66 })

/** The size the fox is drawn at (figures.ts draws it with this). */
export const FOX_SIZE = 0.92

/** How far the stretched head is moved up (negative) or down by `raise`, in the fox's own units. */
export const neckLift = (raise: number) => (raise >= 0 ? -raise * NECK_RISE : -raise * NECK_DIP)

/**
 * Where the tip of its muzzle is as it sits with its neck stretched `reach` of the way to the side `side` and
 * raised by `raise`: the head turns as it stretches, so the muzzle is the foremost part of the whole fox.
 * figures.ts draws the head from the same numbers, and a test holds the drawing to this.
 */
export function foxNose(x: number, side: number, reach: number, raise: number): { x: number; y: number } {
  const turn = NECK_TURN * reach
  return {
    x: x + (-10 + reach * NECK * side + side * MUZZLE * Math.sin(turn)) * FOX_SIZE,
    y: PLACES.fox.y + (-160 + reach * (10 + neckLift(raise)) + MUZZLE * Math.cos(turn)) * FOX_SIZE,
  }
}

/** How far from the lantern's middle the fox's feet stand when its stretched muzzle is on the glass. */
const noseStand = (side: number) => -PAPER_BOX.left + Math.abs(foxNose(0, side, 1, 0).x)

/** How far above and below the paper's middle the muzzle may land and still be on the glass. */
const ON_GLASS = PAPER_BOX.bottom - 10

/** Whether the lantern's paper hangs where the stretched muzzle can come: no higher and no lower than the neck goes. */
function noseHigh(w: Wood): boolean {
  return w.lantern.y >= foxNose(0, 1, 1, 1).y - ON_GLASS && w.lantern.y <= foxNose(0, 1, 1, -1).y + ON_GLASS
}

/**
 * A place in its lane where it stands on nobody: left of the hedgehog by a body's length, short of a glow-worm
 * lying on the ground, and no nearer a lantern that has been let go than its nose can reach.
 */
function lane(w: Wood, x: number): number {
  let left: number = FOX_LANE.left, right: number = Math.min(FOX_LANE.right, w.hedgehog.x - BODY_APART)
  const drop = w.worms.drop.i
  if (drop >= 0) {
    const worm = wormPlace(drop).x
    if (w.fox.x >= worm) left = Math.max(left, worm + FALLEN_WORM.right + 120)
    else right = Math.min(right, worm + FALLEN_WORM.left - 120)
  }
  if (w.atRest && w.lantern.y + PAPER_BOX.bottom > PLACES.fox.y - 264 && w.lantern.y + PAPER_BOX.top < PLACES.fox.y) {
    if (w.fox.x >= w.lantern.x) left = Math.max(left, w.lantern.x + noseStand(-1))
    else right = Math.min(right, w.lantern.x - noseStand(1))
  }
  return left > right ? w.fox.x : clamp(x, left, right)
}

/**
 * Where a leap lands: its own length the way it wants to go, where its lane has that much room that way, and
 * else the way its lane has more room. So a leap is seen as a leap wherever the lane allows one.
 */
function leap(w: Wood, way: number): number {
  const fox = w.fox
  const there = lane(w, fox.x + way * FOX_LEAP), back = lane(w, fox.x - way * FOX_LEAP)
  return Math.abs(there - fox.x) >= FOX_LEAP - 1 || Math.abs(there - fox.x) >= Math.abs(back - fox.x) ? there : back
}

/** Asks the hedgehog to step off to the right, so the fox can come as far as `x`: it goes if it is only standing or walking. */
function makeWay(w: Wood, x: number): void {
  const hog = w.hedgehog
  const to = Math.min(HEDGEHOG_LANE.right, clamp(x, FOX_LANE.left, FOX_LANE.right) + BODY_APART)
  if (hog.x >= to || hog.goTo !== null) return
  if (hog.mode === 'stand' || hog.mode === 'edge' || hog.mode === 'trot' || hog.mode === 'tiptoe') hog.aside = to
}

/** Where the fox's feet will be once a leap it has begun is over: the hedgehog keeps clear of that too. */
export const foxLands = (fox: Fox): number => (fox.mode === 'pounce' || fox.mode === 'puddle' ? Math.max(fox.x, fox.toX) : fox.goTo !== null ? Math.max(fox.x, fox.goTo) : fox.x)

function start(fox: Fox, mode: Fox['mode']): void {
  fox.mode = mode
  fox.t = 0
  fox.beat = 0
}

/** Plays beat `n` of the act once, when its time has come. */
function beat(fox: Fox, n: number, at: number): boolean {
  if (fox.beat !== n || fox.t < at) return false
  fox.beat = n + 1
  return true
}

/** Seconds it leans into a red its lane does not let it step into, before it sits: long enough to be seen. */
export const LEANS = 0.6
/** How far it tips forward over its front paws as it leans, of the tip a pounce ends in. */
export const LEAN = 0.3

/** Seconds it sits looking away by a hung lantern before it sits as it always does: long enough to be seen. */
export const LOOKS_AWAY = 2.5

/** It sits and looks away as if it had not moved, and hums. */
export function lookAway(w: Wood): void {
  const fox = w.fox
  fox.goTo = null
  fox.into = null
  fox.mode = 'pretend'
  fox.t = 0
  w.sound('hum')
}

/** The ending: it comes to a place in its lane, sits there and looks away. Where it stands there already, it sits and looks away at once. */
export function comeTo(w: Wood, x: number): void {
  w.fox.goTo = clamp(x, FOX_LANE.left, FOX_LANE.right)
}

export function stepFox(w: Wood, dt: number): void {
  const fox = w.fox
  fox.t += dt
  fox.rest = Math.max(0, fox.rest - dt)
  fox.puff = Math.max(0, fox.puff - dt / 3.5)
  fox.recoil = Math.max(0, fox.recoil - dt * 1.6)
  if (fox.goTo !== null) {
    // The ending: it comes as near the red glow as it dares, sits, and looks away. It never walks up onto the
    // hedgehog: where that still stands in its road it sits down a body's length short and goes on when the road is clear.
    makeWay(w, fox.goTo)
    const to = fox.goTo >= fox.x ? Math.max(fox.x, Math.min(fox.goTo, w.hedgehog.x - BODY_APART)) : fox.goTo
    if (to === fox.x && to !== fox.goTo) { fox.mode = 'sit'; return }
    const before = fox.x
    fox.mode = 'walk'
    fox.dive = 0
    fox.facing = fox.goTo >= fox.x ? 1 : -1
    fox.x = toward(fox.x, to, 175 * dt)
    const stride = fox.stride
    fox.stride += Math.abs(fox.x - before) / 104
    if (Math.floor(stride * 4) !== Math.floor(fox.stride * 4)) w.sound('pad', (Math.floor(fox.stride * 4) % 4) / 3)
    if (fox.x === fox.goTo) lookAway(w)
    return
  }
  if (fox.aside !== null) {
    // The hedgehog is coming this way: the fox gets up, steps off to the left and sits again, as if it had meant to.
    if (fox.mode !== 'sit' && fox.mode !== 'pretend' && fox.mode !== 'walk') fox.aside = null
    else {
      const before = fox.x
      fox.mode = 'walk'
      fox.dive = 0
      fox.into = null
      fox.facing = -1
      fox.x = toward(fox.x, fox.aside, 175 * dt)
      const stride = fox.stride
      fox.stride += Math.abs(fox.x - before) / PACE
      if (Math.floor(stride * 4) !== Math.floor(fox.stride * 4)) w.sound('pad', (Math.floor(fox.stride * 4) % 4) / 3)
      if (fox.x === fox.aside) { fox.aside = null; fox.mode = 'pretend'; fox.t = 0; w.sound('hum') }
      notice(fox, false, true, dt)
      return
    }
  }
  // Its brush stands on the side away from the lantern.
  if (w.lantern.x > fox.x + 40) fox.brush = toward(fox.brush, -1, dt * 5)
  else if (w.lantern.x < fox.x - 40) fox.brush = toward(fox.brush, 1, dt * 5)
  else fox.brush = toward(fox.brush, fox.brush >= 0 ? 1 : -1, dt * 5)
  const head = foxHead(fox.x)
  // The light on it is whatever patch touches any of it as it is drawn.
  const sight = w.sight.fox
  const light = sight.light
  fox.creep = fox.mode === 'sniff' ? fox.creep : 0

  if (fox.mode === 'sit' || fox.mode === 'pretend') {
    fox.squint = toward(fox.squint, 0, dt * 3)
    fox.tilt = toward(fox.tilt, 0, dt * 2)
    fox.reach = toward(fox.reach, 0, dt * 3)
    if (fox.reach === 0) fox.raise = 0
    if (fox.rest <= 0) {
      if (w.darkNear(head.x, head.y, SMELLS)) start(fox, 'sniff')
      else if (sight.rush) start(fox, 'pounce')
      else if (light === 'yellow') start(fox, 'sneeze')
      else if (light === 'blue') start(fox, 'puddle')
      else if (light === 'plain') start(fox, 'tilt')
      else if (light === 'red' && fox.mode === 'sit') {
        // Its rule begins where it is seen and heard: it gets up and steps a pace into the red.
        const red = sight.touch
        fox.mode = 'walk'
        fox.t = 0
        fox.into = fox.x + (red && red.x < fox.x ? -PACE : PACE)
      }
    }
  }
  // Touched by a light it is not answering (it is resting, or it has had its red and sits pretending), it still shows that it saw.
  notice(fox, sight.touch !== null && w.shines, fox.mode !== 'sit' && fox.mode !== 'pretend', dt)

  switch (fox.mode) {
    case 'pretend':
    case 'walk': {
      const red = w.patchOf('red')
      // By a hung lantern it sits looking away long enough to be seen, and then sits as it always does.
      if (w.hung) { if (fox.mode === 'walk' || fox.t > LOOKS_AWAY) fox.mode = 'sit'; fox.into = null; fox.dive = 0; break }
      if (!w.shines || !red) { fox.mode = 'sit'; fox.into = null; fox.dive = 0; break }
      if (fox.into !== null) {
        // The pace into the red, four pads; then it sits, looks away and hums, and the walk has met it.
        makeWay(w, fox.into)
        const goal = lane(w, fox.into)
        fox.facing = fox.into >= fox.x ? 1 : -1
        const before = fox.x
        fox.x = toward(fox.x, goal, 175 * dt)
        const stride = fox.stride
        fox.stride += Math.abs(fox.x - before) / PACE
        if (Math.floor(stride * 4) !== Math.floor(fox.stride * 4)) w.sound('pad', (Math.floor(fox.stride * 4) % 4) / 3)
        if (fox.x === goal) {
          // Where its lane ends before it has gone half a pace, it turns to the red and leans into it, nose first,
          // and only then sits: the meeting is never one step with nothing seen.
          if (Math.abs(fox.into - goal) > PACE / 2 && fox.t < LEANS) { fox.dive = Math.min(LEAN, (fox.t / LEANS) * LEAN * 2); break }
          fox.dive = 0
          lookAway(w)
          w.meet('fox')
        }
        break
      }
      // Three paces behind the red patch, as far as its lane lets it.
      const far = red.x - fox.x
      const facing = far >= 0 ? 1 : -1
      const wish = red.x - facing * BEHIND
      if (fox.mode === 'walk' || Math.abs(far) > BEHIND + 45) makeWay(w, wish)
      const goal = lane(w, wish)
      if (fox.mode === 'pretend') {
        if (Math.abs(far) <= BEHIND + 45 || Math.abs(goal - fox.x) <= 12) break
        fox.mode = 'walk'
      }
      fox.facing = facing
      const before = fox.x
      fox.x = toward(fox.x, goal, 175 * dt)
      const stride = fox.stride
      fox.stride += Math.abs(fox.x - before) / PACE
      // Four pads to a pace.
      if (Math.floor(stride * 4) !== Math.floor(fox.stride * 4)) w.sound('pad', (Math.floor(fox.stride * 4) % 4) / 3)
      if (fox.x === goal && (goal !== wish || Math.abs(w.grip.vx) < 25)) {
        // The lantern has stopped, or the lane has ended: it sits and looks away as if it had not moved.
        fox.mode = 'pretend'
        fox.t = 0
        w.sound('hum')
      }
      break
    }
    case 'sneeze': {
      // A sniff that rises, then the burst.
      if (beat(fox, 0, 0)) w.sound('sniff')
      fox.squint = Math.min(1, fox.t / 0.8)
      if (beat(fox, 1, 0.85)) {
        fox.puff = 1
        fox.air = 1
        w.sound('sneeze')
      }
      fox.air = Math.max(0, fox.air - dt * 4)
      if (fox.t > 1.5) done(fox, 2.2)
      break
    }
    case 'puddle': {
      // A dab, a shake of the paw, and a jump over it.
      fox.paw = fox.t < 1.05 ? Math.min(1, fox.t / 0.3) : Math.max(0, fox.paw - dt * 6)
      if (beat(fox, 0, 0.3)) w.sound('plip')
      if (beat(fox, 1, 0.55)) { fox.shake = 1; w.sound('shake') }
      fox.shake = Math.max(0, fox.shake - dt * 2.2)
      // While it dabs, the hedgehog is asked out of the road, so there is a whole leap of room when the jump comes.
      if (fox.beat < 3) makeWay(w, fox.x + FOX_LEAP)
      if (beat(fox, 2, 1.1)) {
        const patch = sight.touch
        fox.fromX = fox.x
        fox.toX = leap(w, patch && patch.x < fox.x ? -1 : 1)
        const faced = fox.facing
        fox.facing = fox.toX >= fox.x ? 1 : -1
        // It has turned about in this step: what light lies on it is asked again of the fox as it now stands.
        if (fox.facing !== faced) see(w)
        w.sound('hop')
      }
      if (fox.beat >= 3) {
        const along = Math.min(1, (fox.t - 1.1) / 0.6)
        fox.x = fox.fromX + (fox.toX - fox.fromX) * along
        fox.air = Math.sin(along * Math.PI)
        // It lands, and the landing goes through it to the tip of its tail.
        if (beat(fox, 3, 1.7)) { fox.air = 0; fox.x = fox.toX; fox.puff = Math.max(fox.puff, 0.3); w.sound('thud') }
      }
      if (fox.t > 2.1) done(fox, 2.4)
      break
    }
    case 'pounce': {
      // A scrabble, a leap, and it lands on its nose with its tail in the air.
      if (beat(fox, 0, 0)) {
        const way = w.grip.vx >= 0 ? 1 : -1
        const faced = fox.facing
        fox.fromX = fox.x
        fox.toX = leap(w, way)
        fox.facing = fox.toX >= fox.x ? 1 : -1
        if (fox.facing !== faced) see(w)
        w.sound('scrabble')
      }
      const along = clamp((fox.t - 0.22) / 0.33, 0, 1)
      fox.x = fox.fromX + (fox.toX - fox.fromX) * along
      fox.air = Math.sin(along * Math.PI)
      if (beat(fox, 1, 0.55)) { fox.dive = 1; fox.air = 0; w.sound('thump') }
      if (beat(fox, 2, 0.8)) { fox.shake = 1; w.sound('squeak') }
      fox.shake = Math.max(0, fox.shake - dt * 2.2)
      if (fox.t > 1.5) fox.dive = Math.max(0, fox.dive - dt * 4)
      if (fox.t > 1.8) done(fox, 1.6)
      break
    }
    case 'sniff': {
      // It creeps up to the cold lantern as near as its lane lets it, stretches its neck out, sniffs twice, and
      // where the nose reaches the glass it knocks it and starts back. A lantern it cannot reach it only sniffs at.
      if (!w.darkNear(head.x, head.y, SMELLS + 40) && fox.beat < 4) { fox.creep = 0; done(fox, 0.8); break }
      const side = w.lantern.x >= fox.x ? 1 : -1
      if (fox.beat === 0) {
        makeWay(w, w.lantern.x - side * noseStand(side))
        const stand = lane(w, w.lantern.x - side * noseStand(side))
        fox.creep = 1
        fox.facing = side
        const before = fox.x
        fox.x = toward(fox.x, stand, 120 * dt)
        const stride = fox.stride
        fox.stride += Math.abs(fox.x - before) / PACE
        if (Math.floor(stride * 4) !== Math.floor(fox.stride * 4)) w.sound('pad', (Math.floor(fox.stride * 4) % 4) / 3)
        if (fox.x !== stand) break
        fox.creep = 0
        fox.beat = 1
        fox.t = 0
      }
      fox.reach = fox.beat >= 4 ? Math.max(0, fox.reach - dt * 7) : Math.min(1, fox.t / 0.9)
      // The nose goes up or down to where the paper hangs, as far as the neck allows.
      const level = foxNose(fox.x, side, 1, 0).y
      const off = level - w.lantern.y
      fox.raise = toward(fox.raise, clamp(off / ((off >= 0 ? NECK_RISE : NECK_DIP) * FOX_SIZE), -1, 1), dt * 3)
      if (beat(fox, 1, 0.3)) { fox.squint = 0.5; w.sound('noseSniff', 0) }
      if (beat(fox, 2, 0.65)) { fox.squint = 0.5; w.sound('noseSniff', 1) }
      fox.squint = Math.max(0, fox.squint - dt * 2)
      if (beat(fox, 3, 1.0)) {
        // Only a nose that is seen to reach the glass knocks it.
        const nose = foxNose(fox.x, side, 1, fox.raise)
        const glass = w.lantern.x - side * -PAPER_BOX.left
        if (Math.abs(nose.x - glass) <= 9 && noseHigh(w)) {
          fox.recoil = 1
          w.bump(side * 1.5)
          w.sound('dong')
        }
      }
      if (fox.t > 1.7) done(fox, 3)
      break
    }
    case 'tilt': {
      // Further and further, until it tips onto its side.
      if (beat(fox, 0, 0)) w.sound('whine')
      if (light !== 'plain' && fox.beat < 2) { done(fox, 0.8); break }
      fox.tilt = Math.min(1, fox.t / 1.7)
      if (beat(fox, 1, 1.75)) { fox.over = 1; w.sound('flop') }
      if (fox.t > 3.1) {
        fox.over = Math.max(0, fox.over - dt * 3)
        fox.tilt = Math.max(0, fox.tilt - dt * 3)
        if (fox.over === 0) done(fox, 2)
      }
      break
    }
    default:
      break
  }
}

function done(fox: Fox, rest: number): void {
  fox.mode = 'sit'
  fox.creep = 0
  fox.rest = rest
  fox.air = 0
  fox.dive = 0
  fox.paw = 0
  fox.over = 0
}
