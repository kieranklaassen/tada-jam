import * as THREE from 'three'
import { REACT_TIMES, SETTLE_SECONDS, WAKE_SECONDS, EXIT_SECONDS, type Creature } from '../brain'
import type { AnimalKey } from '../layout'
import { BEAR, BIRD, FISH, FOX, OWL, RABBIT } from './animals'
import type { Vec3Tuple } from './geometry'

// Six motion personalities. Nothing here is a shared walk cycle with
// different numbers: the owl waddles with a level head, the fox trots on
// diagonal pairs, the rabbit hops in discrete arcs with ears that follow
// through, the bear lumbers in a heavy pace, the fish hops on its tail,
// and the songbird bounces on two feet with jerky head turns. Each has its
// own yawn, two tricks (taken in turns), dangle, reactions, and sleeping
// pose. Poses are rigid part matrices, written allocation-free every frame.

const TAU = Math.PI * 2
const ORIGIN: Vec3Tuple = [0, 0, 0]

const euler = new THREE.Euler(0, 0, 0, 'YXZ')
const quaternion = new THREE.Quaternion()
const position = new THREE.Vector3()
const scale = new THREE.Vector3()
const back = new THREE.Matrix4()

export class Joints {
  readonly mats: THREE.Matrix4[]
  readonly data: Float32Array

  constructor(count: number, data?: Float32Array) {
    this.mats = Array.from({ length: count }, () => new THREE.Matrix4())
    this.data = data ?? new Float32Array(count * 16)
    this.flush()
  }

  /** Part i = parent · T(pivot + t) · R(yaw, pitch, roll) · S · T(-pivot). */
  set(i: number, parent: number, pivot: Vec3Tuple, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx, tx = 0, ty = 0, tz = 0): void {
    euler.set(rx, ry, rz, 'YXZ')
    quaternion.setFromEuler(euler)
    position.set(pivot[0] + tx, pivot[1] + ty, pivot[2] + tz)
    scale.set(sx, sy, sz)
    const m = this.mats[i]
    m.compose(position, quaternion, scale)
    back.makeTranslation(-pivot[0], -pivot[1], -pivot[2])
    m.multiply(back)
    if (parent >= 0) m.premultiply(this.mats[parent])
  }

  flush(): void {
    for (let i = 0; i < this.mats.length; i++) this.data.set(this.mats[i].elements, i * 16)
  }
}

function clamp01(k: number): number {
  return k < 0 ? 0 : k > 1 ? 1 : k
}

function ease(k: number): number {
  const u = clamp01(k)
  return u * u * (3 - 2 * u)
}

/** 0 outside [a, b], a smooth hump inside. */
function bell(k: number, a: number, b: number): number {
  if (k <= a || k >= b) return 0
  return Math.sin(((k - a) / (b - a)) * Math.PI)
}

function fract(x: number): number {
  return x - Math.floor(x)
}

function hash(n: number): number {
  return fract(Math.sin(n * 12.9898 + 4.1414) * 43758.5453)
}

function wrap(a: number): number {
  while (a > Math.PI) a -= TAU
  while (a < -Math.PI) a += TAU
  return a
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k
}

/** Eyes open (1) with a quick blink every `period` seconds. */
function blink(clock: number, period: number, offset: number): number {
  const p = (clock + offset) % period
  return p < 0.14 ? 0.12 + 0.88 * Math.abs(p / 0.07 - 1) : 1
}

/** A glance: holds a random angle, then turns briskly to the next one. */
function glance(clock: number, period: number, seed: number, amount: number): number {
  const i = Math.floor(clock / period + seed)
  const k = ease((fract(clock / period + seed) - 0.8) / 0.2)
  return lerp(hash(i + seed * 17) - 0.5, hash(i + 1 + seed * 17) - 0.5, k) * 2 * amount
}

/** A quick back-and-forth flick every `period` seconds. */
function flick(clock: number, period: number, offset: number): number {
  return bell(fract(clock / period + offset), 0, 0.08)
}

type Common = { look: number; eyes: number; breath: number; stir: number; curl: number; react: number; stage: number }
const k: Common = { look: 0, eyes: 1, breath: 0, stir: 0, curl: 0, react: 0, stage: 0 }

/** What every animal needs: gaze, blink, breath, how curled into sleep, reaction progress. */
function common(c: Creature, blinkPeriod: number): Common {
  k.look = Math.max(-1.3, Math.min(1.3, wrap(c.lookYaw - c.yaw))) * c.look
  k.eyes = blink(c.clock, blinkPeriod, c.index * 0.9)
  k.breath = 0.5 - 0.5 * Math.cos((TAU * c.clock) / c.motion.breath)
  k.stir = c.stirredAt >= 0 ? Math.max(0, 1 - (c.clock - c.stirredAt) / 1.6) : 0
  k.curl = c.mode === 'asleep' ? 1 : c.mode === 'settle' ? ease(c.modeT / (SETTLE_SECONDS * 0.8)) : c.mode === 'wake' ? 1 - ease(c.modeT / WAKE_SECONDS) : 0
  if (k.curl > 0) k.eyes = lerp(k.eyes, 0.07, ease(k.curl * 1.4))
  if (c.mode === 'asleep' && k.stir > 0) k.eyes = 0.07 + 0.6 * bell(k.stir, 0.35, 0.8)
  k.react = 0
  k.stage = 0
  if (c.mode === 'react' && c.reaction !== null && c.reaction !== 'settle') {
    const times = REACT_TIMES[c.reaction]
    const t = c.modeT
    k.stage = t < times[0] ? 0 : t < times[1] ? 1 : 2
    k.react = k.stage === 0 ? t / times[0] : k.stage === 1 ? (t - times[0]) / (times[1] - times[0]) : (t - times[1]) / Math.max(0.01, times[2] - times[1])
  }
  return k
}

function eyesAndMouth(J: Joints, eyes: number, mouth: number, head: number, eyesPart: number, mouthPart: number, eyePivot: Vec3Tuple, mouthPivot: Vec3Tuple): void {
  J.set(eyesPart, head, eyePivot, 0, 0, 0, 1, Math.max(0.06, eyes), 1)
  const m = Math.max(0.001, mouth)
  J.set(mouthPart, head, mouthPivot, 0, 0, 0, m, m, m)
}

// --- owl: waddle, level head, full head turn, wraps its wings to sleep -----------

function owl(c: Creature, J: Joints): void {
  const P = OWL
  const k = common(c, 4.6)
  const t = c.clock
  const m = c.modeT
  let bob = 0
  let roll = 0
  let pitch = 0
  let sy = 1
  let fluff = 1
  let hy = k.look
  let hp = 0
  let hr = 0
  let wl = 0.06
  let wr = 0.06
  let fl = 0
  let fr = 0
  let eyes = k.eyes
  let mouth = 0
  switch (c.mode) {
    case 'walk': {
      const ph = c.gait * TAU
      const a = Math.min(1, c.speed / 4)
      roll = Math.sin(ph) * 0.24 * a
      bob = Math.abs(Math.sin(ph)) * 0.35 * a
      fl = Math.max(0, Math.sin(ph)) * 1.4 * a
      fr = Math.max(0, -Math.sin(ph)) * 1.4 * a
      hr = -roll * 0.95
      wl = wr = 0.08 + Math.abs(Math.sin(ph)) * 0.08 * a
      break
    }
    case 'idle': {
      // Curious: a slow head sway, a long look over its shoulder now and then, and a deep tilt to alternate sides.
      const tilt = t / 4.2 + c.index * 0.2
      hy += Math.sin(t * 0.5 + c.index) * 0.45 + bell(fract(t / 9.5 + c.index * 0.3), 0.72, 0.96) * 1.9
      hr = Math.sin(t * 0.37) * 0.09 + bell(fract(tilt), 0.1, 0.6) * (Math.floor(tilt) % 2 === 0 ? 0.45 : -0.45)
      break
    }
    case 'yawn': {
      const u = m / c.motion.yawn
      hp = -0.42 * bell(u, 0, 0.8)
      wl = wr = 0.06 + 0.55 * bell(u, 0.05, 0.75)
      mouth = bell(u, 0.2, 0.8)
      eyes = Math.min(eyes, 1 - 0.85 * bell(u, 0.25, 0.8))
      sy = 1 + 0.07 * bell(u, 0, 0.7)
      hr = Math.sin(m * 28) * 0.24 * bell(u, 0.78, 1)
      break
    }
    case 'trick': {
      const u = m / c.motion.trick
      if (c.trickVariant === 1) {
        // Spreads both wings wide, hops up with a flap, and lands in a fluffed-up shake.
        const hop = bell(u, 0.25, 0.65)
        sy = 1 - 0.08 * bell(u, 0, 0.25)
        bob = hop * 3.2
        wl = wr = 0.06 + 1.45 * bell(u, 0.08, 0.78) + Math.sin(m * 21) * 0.3 * hop
        fl = fr = 0.5 * hop
        hp = -0.15 * hop
        fluff = 1 + 0.12 * bell(u, 0.7, 1)
        hr = Math.sin(m * 32) * 0.22 * bell(u, 0.72, 1)
        eyes = Math.min(eyes, 1 - 0.7 * bell(u, 0.72, 1))
        break
      }
      hy += ease((u - 0.1) / 0.75) * TAU
      bob = bell(u, 0, 0.22) * 0.8
      wl = wr = 0.06 + 0.3 * bell(u, 0.8, 1)
      break
    }
    case 'held': {
      const swing = Math.abs(c.swingX) + Math.abs(c.swingZ)
      hr = c.swingX * 0.95
      hp = -c.swingZ * 0.95
      const flap = Math.min(1, swing * 3)
      wl = wr = 0.3 + flap * (0.55 + 0.45 * Math.sin(t * 17))
      fl = fr = -0.7
      eyes = Math.max(eyes, 0.2)
      break
    }
    case 'fall':
      wl = wr = 1.1 + 0.45 * Math.sin(t * 22)
      fl = fr = -0.4
      break
    case 'toHome':
    case 'travel':
    case 'exit':
    case 'react':
      wl = wr = 0.7 + 0.75 * Math.sin(t * 19)
      fl = fr = -0.5
      pitch = 0.2
      if (c.mode === 'react' && k.stage === 0) hr = Math.sin(m * 24) * 0.25
      break
    case 'settle':
    case 'asleep':
    case 'wake':
      break
    default: {
      const unreachable: never = c.mode
      return unreachable
    }
  }
  if (k.curl > 0) {
    fluff = 1 + 0.09 * k.curl
    hp = lerp(hp, 0.28 + k.breath * 0.05, k.curl)
    hy = lerp(hy, Math.sin(t * 2.4) * 0.5 * k.stir, k.curl)
    wl = lerp(wl, -0.04, k.curl)
    wr = lerp(wr, -0.04, k.curl)
    sy = lerp(sy, 0.94 + k.breath * 0.04, k.curl)
  }
  if (c.mode === 'wake') {
    const u = m / WAKE_SECONDS
    wl += 1.1 * bell(u, 0.05, 0.5)
    wr += 1.1 * bell(u, 0.35, 0.8)
    mouth = bell(u, 0.15, 0.6)
  }
  const q = c.squash
  J.set(P.body, -1, ORIGIN, pitch, 0, roll, fluff * (1 + q * 0.3), fluff * sy * (1 - q * 0.4), fluff * (1 + q * 0.3), 0, bob, 0)
  J.set(P.head, P.body, P.neck, hp, hy, hr)
  eyesAndMouth(J, eyes, mouth, P.head, P.eyes, P.mouth, P.eyePivot, P.mouthPivot)
  J.set(P.wingL, P.body, P.shoulderL, 0, 0, wl)
  J.set(P.wingR, P.body, P.shoulderR, 0, 0, -wr)
  J.set(P.footL, -1, P.hipL, 0, 0, 0, 1, 1, 1, 0, fl + (k.curl > 0 ? -0.6 * k.curl : 0), 0)
  J.set(P.footR, -1, P.hipR, 0, 0, 0, 1, 1, 1, 0, fr + (k.curl > 0 ? -0.6 * k.curl : 0), 0)
}

// --- fox: diagonal trot, play-bow yawn, mouse pounce, curls with its tail over its nose

function fox(c: Creature, J: Joints): void {
  const P = FOX
  const k = common(c, 3.4)
  const t = c.clock
  const m = c.modeT
  let bob = 0
  let pitch = 0
  let roll = 0
  let yawB = 0
  let sy = 1
  let hy = k.look
  let hp = 0
  let hr = 0
  let tailP = 0.1
  let tailY = Math.sin(t * 1.3 + c.index) * 0.25
  let fl = 0
  let fr = 0
  let bl = 0
  let br = 0
  let legRoll = 0
  let legS = 1
  let earL = 0
  let earR = 0
  let eyes = k.eyes
  let mouth = 0
  switch (c.mode) {
    case 'walk': {
      const ph = c.gait * TAU
      const a = Math.min(1, c.speed / 8)
      fl = br = Math.sin(ph) * 0.65 * a
      fr = bl = -Math.sin(ph) * 0.65 * a
      bob = Math.abs(Math.sin(ph)) * 0.5 * a
      pitch = Math.sin(ph * 2) * 0.03
      tailY = Math.sin(ph - 1.3) * 0.35 * a
      tailP = 0.2 + 0.12 * a
      hp = -0.08 * a + Math.sin(ph * 2) * 0.03
      break
    }
    case 'idle': {
      // Alert: quick glances, ear flicks, and every few seconds the nose goes up to sniff the air.
      const sniff = bell(fract(t / 3.4 + c.index * 0.3), 0.05, 0.4)
      hy += glance(t, 2.1, c.index * 0.37, 0.5)
      hp = -0.38 * sniff + Math.sin(t * 19) * 0.05 * sniff
      earL = -0.5 * flick(t, 4.3, 0)
      earR = -0.5 * flick(t, 5.1, 0.4)
      break
    }
    case 'yawn': {
      const u = m / c.motion.yawn
      const bow = bell(u, 0, 0.85)
      pitch = 0.32 * bow
      fl = fr = -0.75 * bow
      bl = br = 0.15 * bow
      tailP = 0.2 + 0.9 * bow
      hp = -0.6 * bell(u, 0.25, 0.8)
      mouth = bell(u, 0.25, 0.8)
      eyes = Math.min(eyes, 1 - 0.85 * bell(u, 0.3, 0.8))
      roll = Math.sin(m * 26) * 0.2 * bell(u, 0.82, 1)
      earL = earR = -0.45 * bow
      break
    }
    case 'trick': {
      const u = m / c.motion.trick
      if (c.trickVariant === 1) {
        // Chases its own tail round a full circle, then sits back and pants.
        const run = bell(u, 0.02, 0.82)
        const sit = bell(u, 0.78, 1)
        yawB = TAU * ease((u - 0.05) / 0.75)
        hy += 0.75 * run
        tailY = 0.9 * run
        fl = Math.sin(m * 24) * 0.55 * run
        fr = -fl
        bl = fr + 0.6 * sit
        br = fl + 0.6 * sit
        bob = Math.abs(Math.sin(m * 24)) * 0.4 * run
        roll = -0.12 * run
        pitch = -0.3 * sit
        mouth = 0.5 * sit * (0.6 + 0.4 * Math.sin(m * 26))
        break
      }
      const crouch = bell(u, 0, 0.4)
      const v = clamp01((u - 0.3) / 0.42)
      if (u < 0.3) {
        pitch = -0.25 * crouch
        sy = 1 - 0.15 * crouch
        tailY = Math.sin(m * 20) * 0.3
      } else if (u < 0.72) {
        bob = Math.sin(Math.PI * v) * 7
        pitch = lerp(-0.5, 0.9, v)
        fl = fr = -1.0
        bl = br = 0.8
      } else {
        const w = (u - 0.72) / 0.28
        pitch = 0.55 * (1 - w)
        tailP = 0.9 * (1 - w)
        tailY = Math.sin(m * 18) * 0.45
      }
      break
    }
    case 'held': {
      // Carried by the scruff: the rump sinks and the paddling legs hang under it.
      const sag = 0.5 * ease(m / 0.35)
      pitch = -sag
      fl = sag - c.swingZ * 0.9 + Math.sin(t * 9) * 0.35
      fr = sag - c.swingZ * 0.9 + Math.sin(t * 9 + Math.PI) * 0.35
      bl = sag - c.swingZ * 0.9 + Math.sin(t * 9 + 1.6) * 0.3
      br = sag - c.swingZ * 0.9 + Math.sin(t * 9 + 4.7) * 0.3
      legRoll = c.swingX * 0.9
      tailP = -0.6 - sag * 0.6 + c.swingZ
      tailY = c.swingX * 1.5 + Math.sin(t * 3) * 0.3
      hp = sag * 0.7
      hy += Math.sin(t * 1.7) * 0.4
      break
    }
    case 'fall':
      fl = fr = -0.8
      bl = br = 0.8
      tailP = 0.8
      break
    case 'toHome':
    case 'exit':
    case 'travel':
      fl = fr = -1.1
      bl = br = 1.0
      tailP = 0.2
      pitch = -0.15
      break
    case 'react':
      switch (c.reaction) {
        case 'bump':
          if (k.stage === 0) {
            pitch = 0.2
            earL = earR = -0.7
          } else if (k.stage === 1) pitch = -TAU * ease(k.react)
          else hr = Math.sin(m * 9) * 0.3 * (1 - k.react)
          break
        case 'shiver':
          roll = Math.sin(t * 55) * 0.06
          earL = earR = -0.9
          tailP = -0.7
          sy = 0.92
          break
        case 'splash':
          if (k.stage === 1) {
            fl = fr = -0.8
            bl = br = 0.8
          } else if (k.stage === 2) {
            yawB = Math.sin(m * 32) * 0.45 * (1 - k.react)
            earL = earR = Math.sin(m * 30) * 0.5
          }
          break
        case 'slide':
          pitch = k.stage === 0 ? -1.3 : lerp(-1.3, 0, ease(k.react))
          fl = fr = Math.sin(t * 24) * 0.8
          bl = br = Math.sin(t * 24 + Math.PI) * 0.8
          earL = earR = -0.6
          break
        case 'tip':
          if (k.stage === 1) roll = TAU * ease(k.react)
          break
        default:
          break
      }
      break
    case 'settle':
    case 'asleep':
    case 'wake':
      break
    default: {
      const unreachable: never = c.mode
      return unreachable
    }
  }
  if (k.curl > 0) {
    const curl = k.curl
    bob = lerp(bob, -2.6, curl)
    fl = lerp(fl, -1.4, curl)
    fr = lerp(fr, -1.4, curl)
    bl = lerp(bl, 1.4, curl)
    br = lerp(br, 1.4, curl)
    legS = lerp(1, 0.5, curl)
    hy = lerp(hy, 1.5 + k.stir * Math.sin(t * 3) * 0.2, curl)
    hp = lerp(hp, 0.45, curl)
    tailY = lerp(tailY, 2.0, curl)
    tailP = lerp(tailP, -0.35, curl)
    yawB = lerp(yawB, -0.35, curl)
    sy = lerp(sy, 0.92 + k.breath * 0.05, curl)
    earL = lerp(earL, -0.5 + k.stir * Math.sin(t * 14) * 0.4, curl)
    earR = lerp(earR, -0.5, curl)
  }
  if (c.mode === 'wake') {
    const u = m / WAKE_SECONDS
    mouth = bell(u, 0.1, 0.55)
    fl -= 0.6 * bell(u, 0.45, 0.8)
    fr -= 0.6 * bell(u, 0.45, 0.8)
  }
  const q = c.squash
  J.set(P.body, -1, P.bodyPivot, pitch, yawB, roll, 1 + q * 0.3, sy * (1 - q * 0.4), 1 + q * 0.2, 0, bob, 0)
  J.set(P.legFL, P.body, P.hipFL, fl, 0, legRoll, 1, legS, 1)
  J.set(P.legFR, P.body, P.hipFR, fr, 0, legRoll, 1, legS, 1)
  J.set(P.legBL, P.body, P.hipBL, bl, 0, legRoll, 1, legS, 1)
  J.set(P.legBR, P.body, P.hipBR, br, 0, legRoll, 1, legS, 1)
  J.set(P.head, P.body, P.neck, hp, hy, hr)
  eyesAndMouth(J, eyes, mouth, P.head, P.eyes, P.mouth, P.eyePivot, P.mouthPivot)
  J.set(P.earL, P.head, P.earBaseL, earL, 0, 0)
  J.set(P.earR, P.head, P.earBaseR, earR, 0, 0)
  J.set(P.tail, P.body, P.tailBase, tailP, tailY, 0)
}

// --- rabbit: discrete hops, ear follow-through, sits up to yawn, binky, loaf ---------

function rabbit(c: Creature, J: Joints): void {
  const P = RABBIT
  const k = common(c, 3.9)
  const t = c.clock
  const m = c.modeT
  let bob = 0
  let pitch = 0
  let roll = 0
  let yawB = 0
  let sy = 1
  let hy = k.look
  let hp = 0
  let hr = 0
  let earLP = 0
  let earRP = 0
  let earLY = 0
  let earRY = 0
  let earLR = 0
  let earRR = 0
  let hind = 0
  let hindS = 1
  let front = 0
  let frontS = 1
  let eyes = k.eyes
  let mouth = 0
  switch (c.mode) {
    case 'walk': {
      const u = fract(c.gait)
      const a = Math.min(1, c.speed / 6)
      if (u < 0.6) {
        const v = u / 0.6
        const hop = Math.sin(Math.PI * v)
        bob = hop * 2.6 * a
        pitch = lerp(-0.35, 0.3, v) * a
        hind = 0.9 * (1 - v) * a
        front = -0.5 * v * a
        earLP = earRP = -0.45 * hop * a
      } else {
        const e = (u - 0.6) / 0.4
        pitch = 0.3 * (1 - e) * a
        earLP = earRP = Math.sin(e * Math.PI * 2.5) * Math.exp(-e * 3) * 0.4 * a
        hind = -0.15 * a
      }
      break
    }
    case 'idle': {
      earLY = Math.sin(t * 0.9 + c.index) * 0.35
      earRY = Math.sin(t * 1.25 + 1) * 0.35
      hp = Math.sin(t * 22) * 0.035 * bell(fract(t / 2.7), 0, 0.3)
      const up = bell(fract(t / 8.3 + c.index * 0.2), 0.75, 1)
      pitch = -0.4 * up
      bob = 1.2 * up
      front = -0.8 * up
      hy += glance(t, 3.3, c.index * 0.21, 0.35)
      break
    }
    case 'yawn': {
      const u = m / c.motion.yawn
      const tall = bell(u, 0, 0.9)
      pitch = -0.45 * tall
      bob = 1.6 * tall
      front = -0.9 * tall
      earLP = earRP = -0.9 * bell(u, 0.1, 0.72) + 0.45 * bell(u, 0.7, 1)
      mouth = 0.85 * bell(u, 0.25, 0.7)
      eyes = Math.min(eyes, 1 - 0.8 * bell(u, 0.3, 0.7))
      break
    }
    case 'trick': {
      const u = m / c.motion.trick
      if (c.trickVariant === 1) {
        // Sits up tall and thumps its hind feet twice, ears swivelling.
        const tall = bell(u, 0, 1)
        const thump = bell(u, 0.3, 0.42) + bell(u, 0.55, 0.67)
        pitch = -0.5 * tall + 0.12 * thump
        bob = 1.8 * tall - 0.5 * thump
        front = -0.95 * tall
        hind = -0.6 * thump
        earLY = Math.sin(m * 17) * 0.5 * tall
        earRY = -earLY
        earLP = earRP = -0.2 * thump
        hp = Math.sin(m * 22) * 0.06 * tall
        break
      }
      const leap = bell(u, 0.1, 0.8)
      bob = leap * 6.5
      yawB = Math.sin(Math.PI * clamp01((u - 0.1) / 0.7)) * 1.1
      hy -= yawB * 0.6
      hind = 1.3 * bell(u, 0.3, 0.6)
      earLP = earRP = -0.5 * leap
      break
    }
    case 'held': {
      earLR = -(0.9 + c.swingX * 0.8)
      earRR = 0.9 - c.swingX * 0.8
      earLP = earRP = 0.3 - c.swingZ
      const kick = Math.max(0, Math.sin(t * 5)) ** 4
      hind = 1.1 * kick - c.swingZ
      front = -0.3 - c.swingZ
      break
    }
    case 'fall':
      earLP = earRP = -0.3
      hind = 0.6
      front = -0.6
      break
    case 'toHome':
    case 'exit':
    case 'travel':
      hind = 1.1
      front = -0.8
      earLP = earRP = -0.8
      break
    case 'react':
      switch (c.reaction) {
        case 'shiver':
          roll = Math.sin(t * 60) * 0.07
          earLP = earRP = -1.1
          sy = 0.9
          break
        case 'splash':
          if (k.stage === 2) {
            yawB = Math.sin(m * 30) * 0.4 * (1 - k.react)
            earLR = Math.sin(m * 30) * 0.8
            earRR = -earLR
          }
          break
        case 'tip':
        case 'bump':
          if (k.stage === 1) roll = (c.reaction === 'tip' ? TAU : -TAU) * ease(k.react)
          break
        case 'slide':
          pitch = k.stage === 0 ? -1.2 : lerp(-1.2, 0, ease(k.react))
          hind = Math.sin(t * 26) * 0.7
          front = Math.sin(t * 26 + Math.PI) * 0.7
          break
        default:
          break
      }
      break
    case 'settle':
    case 'asleep':
    case 'wake':
      break
    default: {
      const unreachable: never = c.mode
      return unreachable
    }
  }
  if (k.curl > 0) {
    const curl = k.curl
    sy = lerp(sy, 0.8 + k.breath * 0.04, curl)
    bob = lerp(bob, -0.6, curl)
    hind = lerp(hind, -0.3, curl)
    hindS = lerp(1, 0.8, curl)
    frontS = lerp(1, 0.3, curl)
    earLP = lerp(earLP, -1.35, curl)
    earRP = lerp(earRP, -1.35 + k.stir * Math.sin(t * 12) * 0.5, curl)
    hp = lerp(hp, 0.25, curl)
    hy = lerp(hy, 0, curl)
  }
  if (c.mode === 'wake') {
    const u = m / WAKE_SECONDS
    earLP += 1.2 * ease((u - 0.15) / 0.2)
    earRP += 1.2 * ease((u - 0.4) / 0.2)
    mouth = 0.7 * bell(u, 0.5, 0.85)
  }
  const q = c.squash
  J.set(P.body, -1, P.bodyPivot, pitch, yawB, roll, 1 + q * 0.35, sy * (1 - q * 0.45), 1 + q * 0.3, 0, bob, 0)
  J.set(P.head, P.body, P.neck, hp, hy, hr)
  eyesAndMouth(J, eyes, mouth, P.head, P.eyes, P.mouth, P.eyePivot, P.mouthPivot)
  J.set(P.earL, P.head, P.earBaseL, earLP, earLY, earLR)
  J.set(P.earR, P.head, P.earBaseR, earRP, earRY, earRR)
  J.set(P.hindL, P.body, P.hipL, hind, 0, 0, 1, hindS, 1)
  J.set(P.hindR, P.body, P.hipR, hind, 0, 0, 1, hindS, 1)
  J.set(P.front, P.body, P.shoulder, front, 0, 0, 1, frontS, 1)
  J.set(P.tail, P.body, P.tailBase, 0, 0, 0, 1 + 0.15 * Math.sin(t * 7) * (c.mode === 'walk' ? 1 : 0))
}

// --- bear: heavy pace, sits back to stretch, belly drum, limp dangle, slumps asleep ---

function bear(c: Creature, J: Joints): void {
  const P = BEAR
  const k = common(c, 5.2)
  const t = c.clock
  const m = c.modeT
  let bob = 0
  let pitch = 0
  let roll = 0
  let yawB = 0
  let sx = 1
  let sy = 1
  let hy = k.look
  let hp = 0.08
  let hr = 0
  let armL = 0
  let armR = 0
  let armRollL = 0
  let armRollR = 0
  let legL = 0
  let legR = 0
  let eyes = k.eyes
  let mouth = 0
  switch (c.mode) {
    case 'walk': {
      const ph = c.gait * TAU
      const a = Math.min(1, c.speed / 4)
      armL = legL = Math.sin(ph) * 0.45 * a
      armR = legR = -Math.sin(ph) * 0.45 * a
      roll = Math.sin(ph) * 0.1 * a
      yawB = Math.sin(ph) * 0.07 * a
      hy -= Math.sin(ph) * 0.16 * a
      hp = 0.18 * a
      bob = Math.abs(Math.sin(ph)) * 0.55 * a
      break
    }
    case 'idle': {
      roll = Math.sin(t * 0.7) * 0.04
      sy = 1 + k.breath * 0.03
      const s = bell(fract(t / 12 + c.index * 0.1), 0.6, 0.95)
      pitch = -0.7 * s
      armL = -0.4 * s
      armR = -1.2 * s + Math.sin(t * 16) * 0.25 * s
      hr = 0.2 * s
      eyes = Math.min(eyes, 1 - 0.4 * s)
      break
    }
    case 'yawn': {
      const u = m / c.motion.yawn
      const sit = bell(u, 0, 0.95)
      pitch = -0.85 * sit
      armL = armR = -2.3 * bell(u, 0.1, 0.85)
      armRollL = 0.5 * bell(u, 0.2, 0.8)
      armRollR = -armRollL
      mouth = 1.25 * bell(u, 0.25, 0.8)
      hp = 0.08 - 0.5 * bell(u, 0.2, 0.8)
      eyes = Math.min(eyes, 1 - 0.9 * bell(u, 0.25, 0.8))
      break
    }
    case 'trick': {
      const u = m / c.motion.trick
      if (c.trickVariant === 1) {
        // Rears right up on its hind legs, swaying to keep its balance, and gives the child a big, slow wave.
        const rear = bell(u, 0, 1)
        const up = bell(u, 0.08, 0.95)
        pitch = -1.15 * rear
        bob = 2.5 * rear
        roll = Math.sin(m * 3.2) * 0.12 * rear
        armR = -2.5 * up
        armRollR = Math.sin(m * 6.5) * 0.55 * up
        armL = -0.35 * rear
        hp = 0.08 + 0.35 * rear
        hr = -0.22 * rear
        hy += 0.2 * rear
        mouth = 0.55 * rear
        break
      }
      const sit = bell(u, 0, 1)
      pitch = -0.8 * sit
      armL = (-1.0 + Math.sin(t * 16) * 0.35) * sit
      armR = (-1.0 + Math.sin(t * 16 + Math.PI) * 0.35) * sit
      hr = Math.sin(t * 6) * 0.15 * sit
      mouth = 0.4 * sit
      break
    }
    case 'held': {
      // Heavy and limp: the rump sags slowly and all four legs hang straight down.
      const sag = 0.42 * ease(m / 0.5)
      pitch = -sag
      armL = armR = sag - c.swingZ + Math.sin(t * 2.1) * 0.08
      legL = legR = sag - c.swingZ + Math.sin(t * 2.1 + 1) * 0.1
      armRollL = armRollR = c.swingX
      hp = 0.45 + sag * 0.5 + c.swingZ * 0.5
      eyes = Math.min(eyes, 0.55)
      mouth = 0.35 * bell(fract(t / 3.2), 0.3, 0.6)
      break
    }
    case 'fall':
      armL = armR = -2.0 + Math.sin(t * 10) * 0.3
      break
    case 'toHome':
    case 'exit':
    case 'travel':
      armL = armR = -1.4
      legL = legR = 0.8
      break
    case 'react':
      switch (c.reaction) {
        case 'bump':
          if (k.stage === 0) {
            roll = Math.sin(m * 22) * 0.1
            sx = 1.05
          } else if (k.stage === 1) pitch = -1.2 * Math.sin(Math.PI * k.react)
          else hy += Math.sin(m * 10) * 0.4 * (1 - k.react)
          break
        case 'splash':
          if (k.stage === 2) yawB = Math.sin(m * 28) * 0.35 * (1 - k.react)
          break
        case 'tip':
          if (k.stage === 1) roll = TAU * ease(k.react)
          break
        case 'shiver':
          roll = Math.sin(t * 40) * 0.05
          break
        case 'slide':
          pitch = k.stage === 0 ? -1.1 : lerp(-1.1, 0, ease(k.react))
          armL = Math.sin(t * 20) * 0.6
          armR = Math.sin(t * 20 + Math.PI) * 0.6
          break
        default:
          break
      }
      break
    case 'settle':
    case 'asleep':
    case 'wake':
      break
    default: {
      const unreachable: never = c.mode
      return unreachable
    }
  }
  if (k.curl > 0) {
    const curl = k.curl
    pitch = lerp(pitch, -1.25, curl)
    // Rolled back around the rump, the seat would float; settle it onto the ground.
    bob -= 3.2 * curl
    hp = lerp(hp, 0.85, curl)
    armL = lerp(armL, -0.9 + k.stir * Math.sin(t * 15) * 0.25, curl)
    armR = lerp(armR, -0.9, curl)
    legL = lerp(legL, -1.2, curl)
    legR = lerp(legR, -1.2, curl)
    sx = lerp(sx, 1 + k.breath * 0.06, curl)
    sy = lerp(sy, 1 + k.breath * 0.05, curl)
    hr = lerp(hr, 0.25, curl)
    mouth = lerp(mouth, 0.2 + 0.15 * k.breath, curl)
  }
  if (c.mode === 'wake') {
    const u = m / WAKE_SECONDS
    armL -= 1.6 * bell(u, 0.25, 0.85)
    armR -= 1.6 * bell(u, 0.25, 0.85)
    mouth = 1.1 * bell(u, 0.2, 0.75)
  }
  const q = c.squash
  J.set(P.body, -1, P.rump, pitch, yawB, roll, sx * (1 + q * 0.3), sy * (1 - q * 0.35), 1 + q * 0.2, 0, bob, 0)
  J.set(P.head, P.body, P.neck, hp, hy, hr)
  eyesAndMouth(J, eyes, mouth, P.head, P.eyes, P.mouth, P.eyePivot, P.mouthPivot)
  J.set(P.armL, P.body, P.shoulderL, armL, 0, armRollL)
  J.set(P.armR, P.body, P.shoulderR, armR, 0, armRollR)
  J.set(P.legL, P.body, P.hipL, legL, 0, 0)
  J.set(P.legR, P.body, P.hipR, legR, 0, 0)
}

// --- fish: tail hops, puffs up to yawn, backflips, flip-flops when held, floats asleep

function fish(c: Creature, J: Joints): void {
  const P = FISH
  const k = common(c, 6)
  const t = c.clock
  const m = c.modeT
  let bob = 0
  let pitch = 0
  let roll = 0
  let yawB = 0
  let puff = 1
  let tailY = Math.sin(t * 3.1 + c.index) * 0.3
  let fins = 0.2 + Math.sin(t * 6) * 0.4
  let dorsal = 0
  let hy = k.look * 0.4
  let eyes = k.eyes
  let mouth = 0.25
  switch (c.mode) {
    case 'walk': {
      const u = fract(c.gait)
      const a = Math.min(1, c.speed / 6)
      bob = Math.sin(Math.PI * u) * 2.6 * a
      pitch = lerp(-0.35, 0.35, u) * a
      tailY = Math.sin(u * TAU * 2) * 0.7 * a
      yawB = Math.sin(u * TAU * 2 + 1) * 0.1 * a
      fins = 0.3 + Math.sin(t * 10) * 0.4
      break
    }
    case 'idle':
      bob = 0.5 + Math.sin(t * 2.4) * 0.35
      mouth = 0.25 + 0.5 * bell(fract(t / 3.3 + c.index * 0.3), 0, 0.12)
      break
    case 'yawn': {
      const u = m / c.motion.yawn
      const pf = bell(u, 0, 0.85)
      puff = 1 + 0.28 * pf
      mouth = 0.25 + 1.3 * bell(u, 0.2, 0.75)
      fins = 0.2 + 0.9 * pf
      dorsal = -0.3 * pf
      yawB = Math.sin(m * 40) * 0.12 * bell(u, 0.8, 1)
      eyes = Math.min(eyes, 1 - 0.6 * bell(u, 0.3, 0.75))
      break
    }
    case 'trick': {
      const u = m / c.motion.trick
      if (c.trickVariant === 1) {
        // A sideways barrel roll in the air, fins spread wide and mouth round.
        bob = bell(u, 0.05, 0.85) * 6
        roll = TAU * ease((u - 0.1) / 0.68)
        fins = 0.2 + 1.0 * bell(u, 0.05, 0.9)
        tailY = Math.sin(m * 26) * 0.5
        mouth = 0.25 + 0.6 * bell(u, 0.2, 0.8)
        break
      }
      bob = bell(u, 0.05, 0.85) * 7.5
      pitch = -TAU * ease((u - 0.08) / 0.72)
      tailY = Math.sin(m * 20) * 0.6
      break
    }
    case 'held':
    case 'fall':
      yawB = Math.sin(t * 12) * 0.45
      tailY = Math.sin(t * 12 - 1.2) * 1.1
      fins = 0.4 + Math.sin(t * 14) * 0.8
      mouth = 0.25 + 0.3 * Math.abs(Math.sin(t * 7))
      eyes = Math.max(eyes, 0.2)
      break
    case 'toHome':
      tailY = Math.sin(t * 22) * 0.6
      break
    case 'react':
    case 'travel':
      roll = 1.35
      tailY = Math.sin((c.mode === 'travel' ? c.gait : t * 3) * TAU) * 1.0
      yawB = Math.sin((c.mode === 'travel' ? c.gait : t * 3) * TAU + 1) * 0.25
      mouth = 0.25 + 0.4 * Math.abs(Math.sin(t * 9))
      break
    case 'exit': {
      const u = m / EXIT_SECONDS
      pitch = lerp(-0.7, 0.7, u)
      tailY = Math.sin(m * 24) * 0.7
      break
    }
    case 'settle':
    case 'asleep':
    case 'wake':
      break
    default: {
      const unreachable: never = c.mode
      return unreachable
    }
  }
  if (k.curl > 0) {
    const curl = k.curl
    bob = lerp(bob, -3.3 + Math.sin(t * 1.2) * 0.25, curl)
    roll = lerp(roll, 0.28, curl)
    pitch = lerp(pitch, -0.1 + k.breath * 0.05, curl)
    tailY = lerp(tailY, Math.sin(t * 0.8) * 0.25 + k.stir * Math.sin(t * 18) * 0.5, curl)
    fins = lerp(fins, 0.3 + Math.sin(t * 1.4) * 0.15, curl)
    mouth = lerp(mouth, 0.2 + 0.1 * k.breath, curl)
  }
  const q = c.squash
  J.set(P.body, -1, P.center, pitch, yawB + hy, roll, puff * (1 + q * 0.35), puff * (1 - q * 0.45), puff * (1 + q * 0.1), 0, bob, 0)
  J.set(P.tail, P.body, P.tailBase, 0, tailY, 0)
  eyesAndMouth(J, eyes, mouth, P.body, P.eyes, P.mouth, P.eyePivot, P.mouthPivot)
  J.set(P.finL, P.body, P.finBaseL, 0, 0, fins)
  J.set(P.finR, P.body, P.finBaseR, 0, 0, -fins)
  J.set(P.dorsal, P.body, P.dorsalBase, dorsal, 0, 0)
}

// --- songbird: two-footed hops, jerky head, wing stretch, trill, fluffed ball asleep ---

function songbird(c: Creature, J: Joints): void {
  const P = BIRD
  const k = common(c, 2.6)
  const t = c.clock
  const m = c.modeT
  let bob = 0
  let pitch = 0
  let roll = 0
  let fx = 1
  let fy = 1
  let hy = k.look
  let hp = 0
  let hr = 0
  let hdy = 0
  let wl = 0.05
  let wr = 0.05
  let tailP = 0
  let legsP = 0
  let legsS = 1
  let eyes = k.eyes
  let mouth = 0
  switch (c.mode) {
    case 'walk': {
      const u = fract(c.gait)
      const a = Math.min(1, c.speed / 5)
      bob = Math.sin(Math.PI * u) * 1.6 * a
      pitch = lerp(-0.2, 0.25, u) * a
      tailP = 0.5 * Math.exp(-u * 6) * a
      hy += (hash(Math.floor(c.gait) + c.index) - 0.5) * 1.2
      legsS = 1 - 0.4 * Math.sin(Math.PI * u) * a
      break
    }
    case 'idle': {
      const step = Math.floor(t * 1.7 + c.index)
      hy += (hash(step) - 0.5) * 1.4
      hr = (hash(step + 7) - 0.5) * 0.6
      tailP = Math.sin(t * 4) * 0.15
      bob = 0.8 * bell(fract(t / 3.1 + c.index * 0.2), 0, 0.12)
      wl = wr = 0.05 + 0.4 * flick(t, 5.3, 0.2)
      break
    }
    case 'yawn': {
      const u = m / c.motion.yawn
      fx = fy = 1 + 0.2 * bell(u, 0, 0.9)
      wl = 0.05 + 1.2 * bell(u, 0.05, 0.5)
      wr = 0.05 + 1.2 * bell(u, 0.45, 0.9)
      mouth = bell(u, 0.2, 0.7)
      tailP = 0.4 * bell(u, 0, 0.9)
      eyes = Math.min(eyes, 1 - 0.8 * bell(u, 0.25, 0.7))
      break
    }
    case 'trick': {
      if (c.trickVariant === 1) {
        // Flutters up and hovers a moment, looking about, then drops back onto its feet.
        const hover = bell(m / c.motion.trick, 0, 0.95)
        bob = 5 * hover
        wl = wr = 0.3 + 1.1 * Math.abs(Math.sin(m * 26)) * hover
        legsP = 0.5 * hover
        legsS = 1 - 0.35 * hover
        tailP = -0.35 * hover
        hy += Math.sin(m * 5) * 0.7 * hover
        pitch = -0.12 * hover
        break
      }
      fx = fy = 1.15
      wl = wr = 0.5 + 0.5 * Math.sin(t * 34)
      bob = Math.abs(Math.sin(t * 14)) * 0.9
      hp = -0.3
      mouth = 0.5 + 0.5 * Math.sin(t * 30)
      break
    }
    case 'held':
      wl = wr = 0.8 + 0.7 * Math.sin(t * 30)
      legsP = -c.swingZ
      tailP = 0.3
      break
    case 'fall':
    case 'toHome':
    case 'travel':
    case 'exit':
    case 'react':
      wl = wr = 0.6 + 0.9 * Math.sin(t * 26)
      legsS = 0.5
      pitch = 0.1
      break
    case 'settle':
    case 'asleep':
    case 'wake':
      break
    default: {
      const unreachable: never = c.mode
      return unreachable
    }
  }
  if (k.curl > 0) {
    const curl = k.curl
    fx = lerp(fx, 1.25, curl)
    fy = lerp(fy, 1.12 + k.breath * 0.04, curl)
    hy = lerp(hy, 2.5 + k.stir * Math.sin(t * 6) * 0.4, curl)
    hp = lerp(hp, 0.5, curl)
    hdy = -0.6 * curl
    legsS = lerp(legsS, 0.3, curl)
    tailP = lerp(tailP, -0.2, curl)
    wl = lerp(wl, 0, curl)
    wr = lerp(wr, 0, curl)
  }
  if (c.mode === 'wake') {
    const u = m / WAKE_SECONDS
    roll = Math.sin(m * 30) * 0.2 * bell(u, 0.6, 0.9)
    wl += 1.0 * bell(u, 0.3, 0.7)
    wr += 1.0 * bell(u, 0.3, 0.7)
  }
  const q = c.squash
  J.set(P.body, -1, ORIGIN, pitch, 0, roll, fx * (1 + q * 0.35), fy * (1 - q * 0.45), fx * (1 + q * 0.3), 0, bob, 0)
  J.set(P.head, P.body, P.neck, hp, hy, hr, 1, 1, 1, 0, hdy, 0)
  eyesAndMouth(J, eyes, mouth, P.head, P.eyes, P.mouth, P.eyePivot, P.mouthPivot)
  J.set(P.wingL, P.body, P.shoulderL, 0, 0, wl)
  J.set(P.wingR, P.body, P.shoulderR, 0, 0, -wr)
  J.set(P.tail, P.body, P.tailBase, tailP, 0, 0)
  J.set(P.legs, P.body, P.hip, legsP, 0, 0, 1, legsS, 1, 0, -bob * 0.3, 0)
}

export const POSE: Record<AnimalKey, (c: Creature, J: Joints) => void> = { owl, fox, rabbit, bear, fish, songbird }
