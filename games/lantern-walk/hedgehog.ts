import { foxLands } from './fox'
import { BODY_APART, FOX_LANE, HEDGEHOG_LANE, PAPER_BOX, PLACES, POLE } from './layout'
import { notice } from './seen'
import { SLOW, clamp, toward, type Wood } from './wood'

// The hedgehog. Its rule is any light that moves slowly: it walks inside it.
//   yellow, or plain   it trots along inside the patch, nose up, snuffling
//   red                it trots inside it and spikes the red thing the light shows it, to carry on its back
//   blue               it goes on tiptoe with its knees high, as if through cold water, and shivers
// A patch too small to walk in leaves it sitting at the edge. Two wrong uses work as well:
//   a rush   it pops into a ball and rolls after the light until a root stops it, then uncurls the wrong way up
//   unlit    it walks straight into the pole, sits down and rubs its nose
// The light on it is asked of the whole hedgehog as it is drawn (seen.ts): wherever it is shown lit, it answers,
// and where the light moves too fast for it to trot in, it starts and looks. It keeps to the right of the fox,
// a body's length from it, and each steps aside for the other.

export type Hedgehog = {
  x: number
  mode: 'stand' | 'trot' | 'tiptoe' | 'edge' | 'ball' | 'upside' | 'toPole' | 'rub'
  facing: number
  stride: number
  sniff: number
  shiver: number
  /** Seconds until its nose works again. */
  nose: number
  /** Sitting, 0 to 1. */
  sit: number
  /** How far the ball has turned, in turns, and which way it rolls. */
  roll: number
  way: number
  /** On its back, 0 to 1. */
  upside: number
  /** The paw rubbing the nose, 0 to 1. */
  rub: number
  /** 1 when something was just spiked, falling to 0, and which of the red things ride on its back, one bit each. */
  spiked: number
  carries: number
  t: number
  rest: number
  beat: number
  /** The ending: where it walks to, the mat. Null at every other time. */
  goTo: number | null
  /** Where it trots to, to the right, to let the fox by; null when nobody has asked. */
  aside: number | null
  /** 1 as it sees a light it is not answering: a blink and its nose up, falling to 0. */
  glance: number
  glanceWait: number
  saw: boolean
}

/** How far from the pole its feet stand when its nose is on it. */
export const HOG_NOSE = 100
/** Half the width of its room. */
const HOG_HALF = 106

/** The red things the red light shows it along its way: windfall apples, each lying in its own lane where it can come to it, seen only where red lies on them, one bit each in `carries` once spiked. */
export const APPLES: readonly number[] = [704, 772, 848]
/** How high an apple lies, just behind the hedgehog's track and as high as its back, and how big it is: the red that lies on the hedgehog can lie on it too. */
export const APPLE_Y = PLACES.hedgehog.y - 60
export const APPLE_R = 12
/** Whether the red light shows apple `i`: the red is the topmost patch that touches it as it is drawn. The view draws it then, and then only can it be spiked. */
export const appleShown = (w: Wood, i: number): boolean => w.shines && w.touching(APPLES[i], APPLE_Y, APPLE_R)?.paper === 'red'
/** A patch narrower than this, half its width, is too small to walk in. */
export const TOO_SMALL = 46

export function freshHedgehog(x: number): Hedgehog {
  return { x, mode: 'stand', facing: 1, stride: 0, sniff: 0, shiver: 0, nose: 0, sit: 0, roll: 0, way: 1, upside: 0, rub: 0, spiked: 0, carries: 0, t: 0, rest: 0, beat: 0, goTo: null, aside: null, glance: 0, glanceWait: 0, saw: false }
}

export const hogPoint = (x: number) => ({ x, y: PLACES.hedgehog.y - 40 })

/** The lantern has been let go low enough to hang where the hedgehog walks. */
const lanternLow = (w: Wood) => w.atRest && w.lantern.y + PAPER_BOX.bottom > PLACES.hedgehog.y - 126

/**
 * A place in its lane where it stands on nobody: right of the fox by a body's length, and no nearer a lantern
 * that has been let go than its nose can reach.
 */
function lane(w: Wood, x: number): number {
  let left = Math.max(HEDGEHOG_LANE.left, foxLands(w.fox) + BODY_APART), right: number = HEDGEHOG_LANE.right
  if (lanternLow(w)) {
    if (w.hedgehog.x >= w.lantern.x) left = Math.max(left, w.lantern.x + PAPER_BOX.right + HOG_NOSE)
    else right = Math.min(right, w.lantern.x + PAPER_BOX.left - HOG_NOSE)
  }
  return left > right ? w.hedgehog.x : clamp(x, left, right)
}

/** Asks the fox to step off to the left, so the hedgehog can come as far as `x`: it goes if it is only sitting. */
function makeWay(w: Wood, x: number): void {
  const fox = w.fox
  const to = Math.max(FOX_LANE.left, clamp(x, HEDGEHOG_LANE.left, HEDGEHOG_LANE.right) - BODY_APART)
  if (fox.x <= to || fox.goTo !== null || fox.rest > 0) return
  if (fox.mode === 'sit' || fox.mode === 'pretend') fox.aside = to
}

export function stepHedgehog(w: Wood, dt: number): void {
  const hog = w.hedgehog
  hog.t += dt
  hog.rest = Math.max(0, hog.rest - dt)
  hog.sniff = Math.max(0, hog.sniff - dt * 2.2)
  hog.shiver = Math.max(0, hog.shiver - dt * 1.6)
  hog.spiked = Math.max(0, hog.spiked - dt * 2.5)
  hog.nose = Math.max(0, hog.nose - dt)
  if (hog.goTo !== null) {
    // The ending: to the mat by the door.
    const before = hog.x
    hog.facing = hog.goTo >= hog.x ? 1 : -1
    hog.mode = 'trot'
    hog.sit = 0; hog.upside = 0
    hog.x = toward(hog.x, hog.goTo, 150 * dt)
    const stride = hog.stride
    hog.stride += Math.abs(hog.x - before) / 38
    if (Math.floor(stride * 2) !== Math.floor(hog.stride * 2)) w.sound('feet', (Math.floor(hog.stride * 2) % 2) * 0.6)
    if (hog.x === hog.goTo) { hog.goTo = null; hog.mode = 'stand' }
    return
  }
  if (hog.aside !== null) {
    // The fox is coming this way: it trots off to the right, out of its road.
    if (hog.mode !== 'stand' && hog.mode !== 'edge' && hog.mode !== 'trot' && hog.mode !== 'tiptoe') hog.aside = null
    else {
      const before = hog.x
      hog.facing = 1
      hog.mode = 'trot'
      hog.sit = toward(hog.sit, 0, dt * 4)
      hog.x = toward(hog.x, hog.aside, 190 * dt)
      const stride = hog.stride
      hog.stride += Math.abs(hog.x - before) / 38
      if (Math.floor(stride * 2) !== Math.floor(hog.stride * 2)) w.sound('feet', (Math.floor(hog.stride * 2) % 2) * 0.6)
      if (hog.x === hog.aside) { hog.aside = null; hog.mode = 'stand' }
      notice(hog, false, true, dt)
      return
    }
  }
  // The light on it is whatever patch touches any of it as it is drawn.
  const sight = w.sight.hedgehog
  const light = sight.light
  notice(hog, sight.touch !== null && w.shines, hog.mode === 'trot' || hog.mode === 'tiptoe' || hog.mode === 'ball' || hog.mode === 'upside' || hog.mode === 'edge', dt)

  if (hog.mode === 'ball') {
    // After the light, until a root stops it.
    const before = hog.roll
    hog.x += hog.way * 330 * dt
    hog.roll += dt * 2.6
    if (Math.floor(before * 2) !== Math.floor(hog.roll * 2)) w.sound('rumble', (Math.floor(hog.roll * 2) % 2) * 0.5)
    // The root at the end of its way, or where the fox sits if that comes first: it never rolls under the fox.
    const end = hog.way > 0 ? HEDGEHOG_LANE.right : Math.max(HEDGEHOG_LANE.left, foxLands(w.fox) + BODY_APART)
    if ((hog.x - end) * hog.way >= 0) {
      hog.x = end
      hog.mode = 'upside'
      hog.upside = 1
      hog.t = 0
      w.sound('root')
    }
    return
  }
  if (hog.mode === 'upside') {
    // The wrong way up, feet in the air, until it has rocked itself over.
    if (hog.t > 1.5) hog.upside = Math.max(0, hog.upside - dt * 3.5)
    if (hog.upside === 0) { hog.mode = 'stand'; hog.rest = 1.2; hog.roll = 0 }
    return
  }
  if (hog.mode === 'toPole' || hog.mode === 'rub') {
    stepPole(w, dt)
    return
  }
  hog.sit = toward(hog.sit, hog.mode === 'edge' ? 1 : 0, dt * 4)

  if (hog.rest <= 0 && sight.rush) {
    hog.mode = 'ball'
    hog.way = w.grip.vx >= 0 ? 1 : -1
    hog.roll = 0
    hog.sit = 0
    w.sound('pop')
    return
  }
  // A lantern that gives no light, with its pole down where a hedgehog walks.
  // It comes at the pole from the side the pole is on; from the lantern's side only when the lantern hangs clear above it.
  if (w.cold && hog.rest <= 0 && w.grip.y > 640 && Math.abs(w.grip.x - hog.x) < 330 && Math.abs(w.grip.x - hog.x) > 112 && (hog.x < w.grip.x || !lanternLow(w))) {
    hog.mode = 'toPole'
    hog.t = 0
    hog.beat = 0
    return
  }
  if (!light || w.speed > SLOW) {
    if (hog.mode !== 'edge' || !light) hog.mode = 'stand'
    return
  }
  const patch = sight.touch
  if (patch && patch.rx < TOO_SMALL) {
    // No room to walk in: it sits down at the edge, and sniffs at it.
    if (hog.mode !== 'edge') { hog.mode = 'edge'; hog.sniff = 1; w.sound('snuffle') }
    return
  }
  // Blue is cold water: on tiptoe, slowly, with a shiver.
  const cold = light === 'blue'
  const wish = patch ? patch.x : hog.x
  if (Math.abs(wish - hog.x) > 9) makeWay(w, wish)
  const goal = lane(w, wish)
  const before = hog.x
  if (Math.abs(goal - hog.x) > 9) hog.x = toward(hog.x, goal, (cold ? 58 : 118) * dt)
  const walked = Math.abs(hog.x - before)
  if (walked > 0) {
    hog.facing = goal >= before ? 1 : -1
    hog.mode = cold ? 'tiptoe' : 'trot'
    const stride = hog.stride
    hog.stride += walked / (cold ? 30 : 38)
    if (Math.floor(stride * 2) !== Math.floor(hog.stride * 2)) w.sound(cold ? 'tiptoe' : 'feet', (Math.floor(hog.stride * 2) % 2) * 0.6)
    w.meet('hedgehog')
  } else hog.mode = 'stand'
  // In red, whatever red thing the light shows it goes onto its back: the one its nose comes to, or one it finds under itself.
  if (light === 'red') {
    APPLES.forEach((apple, i) => {
      if ((hog.carries >> i) & 1 || !appleShown(w, i)) return
      if (Math.abs(hog.x + hog.facing * 100 - apple) > 10 && Math.abs(hog.x - apple) > 100) return
      hog.carries |= 1 << i
      hog.spiked = 1
      w.sound('spike', i / (APPLES.length - 1))
    })
  }
  // In the light its nose is never still.
  if (hog.nose <= 0) {
    hog.nose = cold ? 1.25 : 1.5
    if (cold) {
      hog.shiver = 1
      w.sound('shiver')
    } else {
      hog.sniff = 1
      w.sound('snuffle')
    }
  }
}

/** It walks straight into the pole, sits down and rubs its nose. */
function stepPole(w: Wood, dt: number): void {
  const hog = w.hedgehog
  if (hog.mode === 'toPole') {
    if (!w.cold || w.grip.y <= 640) { hog.mode = 'stand'; hog.rest = 1; return }
    const pole = w.grip.x - 6, rests = w.want.x + POLE.x
    hog.facing = pole >= hog.x ? 1 : -1
    let goal = clamp(pole - hog.facing * HOG_NOSE, Math.max(HEDGEHOG_LANE.left, foxLands(w.fox) + BODY_APART), HEDGEHOG_LANE.right)
    // A lantern let go low hangs to the right of its pole: coming from that side, the hedgehog stops short of the paper and never walks under it.
    if (lanternLow(w) && hog.x >= rests) goal = Math.max(goal, Math.min(HEDGEHOG_LANE.right, rests + PAPER_BOX.right + HOG_HALF))
    const before = hog.x
    hog.x = toward(hog.x, goal, 118 * dt)
    const stride = hog.stride
    hog.stride += Math.abs(hog.x - before) / 38
    if (Math.floor(stride * 2) !== Math.floor(hog.stride * 2)) w.sound('feet', (Math.floor(hog.stride * 2) % 2) * 0.6)
    if (hog.x !== goal) return
    if (Math.abs(pole - hog.facing * HOG_NOSE - hog.x) > 6) { hog.mode = 'stand'; hog.rest = 2; return }
    hog.mode = 'rub'
    hog.t = 0
    hog.beat = 0
    hog.sniff = 1
    w.bump(hog.facing * 1.2)
    w.sound('bonk')
    return
  }
  hog.sit = toward(hog.sit, hog.t < 1.9 ? 1 : 0, dt * 5)
  hog.rub = hog.t > 0.35 && hog.t < 1.8 ? 1 : 0
  if (hog.beat === 0 && hog.t > 0.4) { hog.beat = 1; hog.shiver = 0.6; w.sound('peep') }
  if (hog.t > 2.2) { hog.mode = 'stand'; hog.rest = 4 }
}
