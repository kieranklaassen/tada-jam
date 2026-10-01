// Rainbow World: a wool mat on a wooden floor, a nested wooden rainbow, peg
// dolls, carved animals, play silks, blocks, pine cones and stones, and a
// basket to tidy them into. Nothing here says what anything is. The child
// arranges; things rest where they are put.
//
// The world is a floor seen from a child's sitting height. Every object has a
// ground point (x, y), where y is also its depth on the floor, and a height z
// of its base above the floor. An object resting on another shares that
// object's ground depth and remembers it in `on`, so a doll rides when the
// horse is moved and a stack travels as one.

import { clamp, damp, ease, lerp, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { ARCH_R, ARCH_T, BASKET_H, BASKET_RX, SILK_HALF, STONES, blit, drawSilkDrape, drawSilkHeld, lightPoint, paintAll } from './art.ts'
import type { Ctx, Sprite } from './art.ts'

type Kind = 'arch' | 'doll' | 'horse' | 'sheep' | 'fox' | 'bird' | 'cube' | 'plank' | 'roof' | 'cone' | 'stone' | 'silk'

interface Obj {
  id: number
  kind: Kind
  // Which one: the arch's size, the doll's colours, the silk's colour.
  v: number
  x: number
  y: number
  z: number
  on: Obj | null
  // Turned the other way: an arch on its back, a doll lying down, a plank on
  // its end, an animal facing left, a silk gathered into a heap.
  turned: boolean
  held: boolean
  // Visual height above where it rests: the lift of a held thing, a fall.
  lift: number
  vl: number
  airborne: boolean
  // Walking bob, turn hop, lean, settle wobble, sideways slide, turn-over.
  hop: number
  jump: number
  step: number
  tilt: number
  wob: Spring
  offX: number
  offY: number
  spin: number
  shift: number
  flip: number
  vx: number
  px: number
  // Rocking, for an arch on its back.
  theta: number
  omega: number
  sway: number
  load: number
  // In the basket.
  basket: boolean
  slotX: number
  slotY: number
  slotR: number
  enter: number
  fromX: number
  fromY: number
  scale: number
  // The bird's hop.
  fly: number
  flyX: number
  flyY: number
  flyH: number
  // Silk.
  spread: number
  drape: number[] | null
  cover: Obj[]
  stamp: number
  hang: boolean
  trail: number
  // Draw order, rebuilt every frame.
  key: number
  top: boolean
}

interface Rest {
  h: number
  dx: number
  tol?: number
  // Stand beside the support at its own level (one arch inside another).
  sib?: boolean
}

interface Press {
  o: Obj
  offX: number
  offY: number
  dragging: boolean
}

const HOLD = 16
const GRAV = 2600
const FLOOR_TOP = 226
const FLOOR_BOT = 764
// The basket: BX is its middle, RIM the middle of its rim.
const BX = 1004
const RIM = 664
const TOP = 4
const DRAPE_N = 26

const isWalker = (o: Obj): boolean => o.kind === 'doll' || o.kind === 'horse' || o.kind === 'sheep' || o.kind === 'fox' || o.kind === 'bird'
const isAnimal = (o: Obj): boolean => o.kind === 'horse' || o.kind === 'sheep' || o.kind === 'fox' || o.kind === 'bird'
const facing = (o: Obj): number => (o.turned ? -1 : 1)
// Long things can bridge from one support to another.
const isWide = (o: Obj): boolean => (o.kind === 'plank' && !o.turned) || o.kind === 'roof' || (o.kind === 'arch' && !o.turned)

function halfW(o: Obj): number {
  switch (o.kind) {
    case 'arch':
      return ARCH_R[o.v]!
    case 'doll':
      return o.turned ? 52 : 21
    case 'horse':
      return 58
    case 'sheep':
      return 46
    case 'fox':
      return 56
    case 'bird':
      return 24
    case 'cube':
      return 29
    case 'plank':
      return o.turned ? 15 : 75
    case 'roof':
      return 64
    case 'cone':
      return 17
    case 'stone':
      return STONES[o.v]!.w
    case 'silk':
      return o.drape ? SILK_HALF : o.turned ? 60 : 150
  }
}

function tall(o: Obj): number {
  switch (o.kind) {
    case 'arch':
      return ARCH_R[o.v]!
    case 'doll':
      return o.turned ? 42 : 108
    case 'horse':
      return 106
    case 'sheep':
      return 68
    case 'fox':
      return 58
    case 'bird':
      return 38
    case 'cube':
      return 58
    case 'plank':
      return o.turned ? 150 : 30
    case 'roof':
      return 62
    case 'cone':
      return 48
    case 'stone':
      return STONES[o.v]!.h
    case 'silk':
      return o.turned ? 46 : 0
  }
}

function drapeH(o: Obj, dx: number): number | null {
  if (!o.drape || Math.abs(dx) > SILK_HALF) return null
  const f = ((dx + SILK_HALF) / (SILK_HALF * 2)) * DRAPE_N
  const i = Math.min(DRAPE_N - 1, Math.floor(f))
  return lerp(o.drape[i]!, o.drape[i + 1]!, f - i)
}

// The top of a thing's outline at a point across it, for a cloth to lie on.
function topAt(o: Obj, dx: number): number | null {
  const a = Math.abs(dx)
  if (a > halfW(o)) return null
  if (o.kind === 'arch') {
    const R = ARCH_R[o.v]!
    if (!o.turned) return Math.sqrt(R * R - dx * dx)
    const rin = R - ARCH_T
    return a >= rin ? R : R - Math.sqrt(rin * rin - dx * dx)
  }
  if (o.kind === 'roof') return 62 * (1 - a / 66)
  if (o.kind === 'silk') return o.drape ? drapeH(o, dx) : o.turned ? 44 * (1 - (a / 60) ** 2) : null
  if (o.kind === 'doll' && !o.turned) return 108 - a * 1.4
  return tall(o)
}

// The highest point of a thing, where the bird likes to sit.
function peak(o: Obj, dx: number): Rest {
  switch (o.kind) {
    case 'arch': {
      const R = ARCH_R[o.v]!
      return o.turned ? { dx: (dx < 0 ? -1 : 1) * (R - ARCH_T / 2), h: R + TOP } : { dx: 0, h: R + TOP }
    }
    case 'doll':
      return o.turned ? { dx: 0, h: 42 } : { dx: (o.v % 2 === 0 ? 1 : -1) * (3 + o.v), h: 107 }
    case 'horse':
      return { dx: 33 * facing(o), h: 108 }
    case 'sheep':
      return { dx: -7 * facing(o), h: 69 }
    case 'fox':
      return { dx: 2 * facing(o), h: 41 }
    case 'roof':
      return { dx: 0, h: 66 }
    case 'silk': {
      if (!o.drape) return { dx: -6, h: o.turned ? 44 : 0 }
      let best = 0
      for (let i = 1; i <= DRAPE_N; i++) if (o.drape[i]! > o.drape[best]!) best = i
      return { dx: -SILK_HALF + (best / DRAPE_N) * SILK_HALF * 2, h: o.drape[best]! }
    }
    case 'cube':
    case 'plank':
      return { dx: 0, h: tall(o) + TOP }
    default:
      return { dx: 0, h: tall(o) }
  }
}

// Where `o` would rest on `S` if put down `dx` across it, with its foot `up`
// above S's own foot. 'slide' means it is over S but cannot stay there.
function restOn(S: Obj, o: Obj, dx: number, up: number): Rest | 'slide' | null {
  const w = halfW(o)
  const a = Math.abs(dx)
  const wide = isWide(o)
  switch (S.kind) {
    case 'arch': {
      const R = ARCH_R[S.v]!
      if (!S.turned) {
        if (o.kind === 'arch' && !o.turned) {
          const Ro = ARCH_R[o.v]!
          // A bigger arch goes over a smaller one; a smaller one slips inside.
          if (Ro > R) return a < Ro * 0.5 ? { h: 0, dx: 0, tol: Ro * 0.45, sib: true } : null
          if (a < R * 0.5 && up < R * 0.45) return { h: 0, dx: 0, tol: R * 0.45, sib: true }
        }
        if (wide) {
          // A long thing balances on the crown, or lies level across it when
          // something else holds up its other end.
          if (a < R * 0.5) return { h: Math.sqrt(R * R - (dx * 0.3) ** 2) + TOP, dx: dx * 0.3 }
          return a <= w ? { h: R + TOP, dx } : null
        }
        if (a > R) return null
        if (a > R * 0.72) return 'slide'
        return { h: Math.sqrt(R * R - dx * dx) + TOP, dx }
      }
      if (a > R) return null
      const rin = R - ARCH_T
      if (o.kind === 'arch' && o.turned) return ARCH_R[o.v]! <= rin ? { h: R - ARCH_R[o.v]!, dx: 0, tol: 50 } : 'slide'
      if (rin < 30 || w > rin * 0.85) return 'slide'
      const lim = Math.max(0, rin * 0.88 - w)
      const d = clamp(dx, -lim, lim)
      const reach = Math.min(rin - 1, Math.abs(d) + w * 0.8)
      // Anywhere inside the bowl counts as putting it in the boat.
      return { h: R - Math.sqrt(rin * rin - reach * reach) + 2, dx: d, tol: R * 0.9 }
    }
    case 'cube':
      if (wide) return a <= 29 + w - 12 ? { h: 58 + TOP, dx } : null
      return a <= 40 ? { h: 58 + TOP, dx: clamp(dx, -22, 22) } : null
    case 'plank':
      if (S.turned) {
        if (wide) return a <= 15 + w - 12 ? { h: 150 + TOP, dx } : null
        return a <= 30 ? { h: 150 + TOP, dx: 0 } : null
      }
      if (wide) return a <= 75 + w - 12 ? { h: 30 + TOP, dx } : null
      return a <= 84 ? { h: 30 + TOP, dx: clamp(dx, -64, 64) } : null
    case 'roof':
      return a <= 58 ? 'slide' : null
    case 'horse':
      if (a > 56) return null
      return w <= 30 ? { h: 72, dx: -9 * facing(S), tol: 46 } : 'slide'
    case 'sheep':
      if (a > 44) return null
      return w <= 30 ? { h: 67, dx: -7 * facing(S), tol: 40 } : 'slide'
    case 'fox':
      if (a > 40) return null
      return w <= 24 ? { h: 41, dx: 3 * facing(S), tol: 34 } : 'slide'
    case 'silk': {
      const h = drapeH(S, dx)
      if (h === null || h < 14 || a > SILK_HALF - 36) return null
      return { h, dx }
    }
    default:
      return null
  }
}

function create(stage: Stage): Game {
  const { sfx, fx } = stage
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1
  const art = paintAll(clamp(Math.ceil(dpr), 1, 2))

  const objs: Obj[] = []
  const contents: Obj[] = []
  const presses = new Map<number, Press>()
  const dimples: { x: number; y: number; t: number }[] = []
  const order: Obj[] = []
  const above: Obj[] = []
  const flats: Obj[] = []
  const basketBob = spring(0, 210, 11)
  let nextId = 1
  let stamp = 0
  let birdCheckAt = -1
  let lastStepAt = -1
  let lastRockAt = -1

  const make = (kind: Kind, v: number, x: number, y: number): Obj => {
    const o: Obj = {
      id: nextId++,
      kind,
      v,
      x,
      y,
      z: 0,
      on: null,
      turned: false,
      held: false,
      lift: 0,
      vl: 0,
      airborne: false,
      hop: 0,
      jump: 0,
      step: 0,
      tilt: 0,
      wob: spring(0, 170, 8),
      offX: 0,
      offY: 0,
      spin: 0,
      shift: 0,
      flip: 0,
      vx: 0,
      px: x,
      theta: 0,
      omega: 0,
      sway: 0,
      load: 0,
      basket: false,
      slotX: 0,
      slotY: 0,
      slotR: 0,
      enter: 0,
      fromX: 0,
      fromY: 0,
      scale: 1,
      fly: 0,
      flyX: 0,
      flyY: 0,
      flyH: 0,
      spread: 1,
      drape: null,
      cover: [],
      stamp: 0,
      hang: false,
      trail: x,
      key: 0,
      top: false,
    }
    objs.push(o)
    return o
  }

  // ---- sound: the materials themselves, quietly ----

  const tok = (freq: number, vol: number, dur = 0.1): void => {
    sfx.tone({ freq, to: freq * 0.93, dur, type: 'sine', vol })
    sfx.tone({ freq: freq * 2.76, dur: dur * 0.35, type: 'sine', vol: vol * 0.28 })
    sfx.noise({ dur: 0.016, freq: 1700, vol: vol * 0.3, filter: 'bandpass', q: 1.2 })
  }
  const felt = (vol: number): void => {
    sfx.noise({ dur: 0.09, freq: 380, vol, filter: 'lowpass' })
    sfx.tone({ freq: 150, to: 92, dur: 0.1, type: 'sine', vol: vol * 0.8 })
  }
  const hush = (vol: number, opening: boolean): void => {
    sfx.noise({ dur: opening ? 0.5 : 0.28, freq: opening ? 3800 : 1900, to: opening ? 1700 : 4200, vol, filter: 'bandpass', q: 0.5 })
  }
  const wicker = (): void => {
    sfx.noise({ dur: 0.06, freq: 1500, vol: 0.05, filter: 'bandpass', q: 2.4 })
    sfx.noise({ dur: 0.08, freq: 2300, vol: 0.035, filter: 'bandpass', q: 2.4, delay: 0.07 })
    sfx.tone({ freq: 140, to: 100, dur: 0.09, type: 'sine', vol: 0.05 })
  }
  const chirp = (): void => {
    sfx.tone({ freq: 2350, to: 2900, dur: 0.07, type: 'sine', vol: 0.03 })
    sfx.tone({ freq: 2750, to: 2450, dur: 0.1, type: 'sine', vol: 0.026, delay: 0.13 })
  }
  // Wood has a pitch. The arches are a small pentatonic xylophone, biggest
  // lowest; everything else is tuned to the same five notes.
  const pitch = (o: Obj): number => {
    switch (o.kind) {
      case 'arch':
        return sfx.scale(o.v - 5)
      case 'doll':
        return sfx.scale(o.v + 1)
      case 'horse':
        return sfx.scale(-3)
      case 'sheep':
        return sfx.scale(-2)
      case 'fox':
        return sfx.scale(0)
      case 'bird':
        return sfx.scale(5)
      case 'cube':
        return sfx.scale(1 + o.v)
      case 'plank':
        return sfx.scale(-2 + o.v) * (o.turned ? 1.5 : 1)
      case 'roof':
        return sfx.scale(-1)
      case 'stone':
        return 1150 + o.v * 160
      default:
        return 900
    }
  }
  const knock = (o: Obj, vol: number): void => {
    if (o.kind === 'silk') return
    if (o.kind === 'cone') sfx.noise({ dur: 0.03, freq: 2600, vol: vol * 0.7, filter: 'bandpass', q: 3 })
    else if (o.kind === 'stone') tok(pitch(o), vol * 0.8, 0.035)
    else tok(pitch(o), vol, o.kind === 'arch' ? 0.2 : 0.1)
  }
  const landSound = (o: Obj, speed: number): void => {
    const k = clamp(speed / 300, 0.5, 1.35)
    if (o.kind === 'silk') return
    if (o.on === null) {
      felt(0.09 * k)
      knock(o, 0.07 * k)
    } else if (o.on.kind === 'silk') {
      felt(0.08 * k)
      knock(o, 0.03 * k)
    } else {
      knock(o, 0.13 * k)
      sfx.tone({ freq: pitch(o.on) * 0.5, dur: 0.08, type: 'sine', vol: 0.03 * k, delay: 0.012 })
    }
  }
  const stepSound = (o: Obj): void => {
    if (stage.time - lastStepAt < 0.085) return
    lastStepAt = stage.time
    if (o.kind === 'horse') {
      tok(420, 0.05, 0.045)
      sfx.tone({ freq: 340, to: 300, dur: 0.04, type: 'sine', vol: 0.035, delay: 0.07 })
    } else if (o.kind === 'bird') {
      tok(1500, 0.018, 0.025)
    } else {
      tok(pitch(o) * (o.kind === 'doll' ? 1.5 : 1.2), 0.032, 0.035)
    }
  }

  // ---- families ----

  const group = (o: Obj): Obj[] => {
    const out = [o]
    for (let i = 0; i < out.length; i++) for (const m of objs) if (m.on === out[i] && !m.basket) out.push(m)
    return out
  }
  const shiftGroup = (o: Obj, dx: number, dy: number, dz: number): void => {
    if (dx === 0 && dy === 0 && dz === 0) return
    for (const m of group(o)) {
      m.x += dx
      m.y += dy
      m.z += dz
    }
  }
  const heldChain = (o: Obj): boolean => {
    for (let m: Obj | null = o; m; m = m.on) if (m.held) return true
    return false
  }
  const liftOf = (o: Obj): number => {
    let sum = 0
    for (let m: Obj | null = o; m; m = m.on) sum += m.lift + m.hop + m.jump
    return sum
  }
  // The arch whose rocking carries this thing: the lowest arch on its back
  // under it (or itself).
  const cradleOf = (o: Obj): Obj | null => {
    let found: Obj | null = null
    for (let m: Obj | null = o; m; m = m.on) if (m.kind === 'arch' && m.turned) found = m
    return found
  }
  const riders = (o: Obj): Obj[] => objs.filter((m) => m.on === o && !m.basket)
  const covered = (o: Obj): boolean => objs.some((s) => s.drape !== null && s.cover.includes(o))
  const free = (o: Obj): boolean => !o.basket && !heldChain(o) && o.fly === 0

  // ---- drapes ----

  const computeDrape = (silk: Obj): void => {
    const h: number[] = []
    let most = 0
    for (let i = 0; i <= DRAPE_N; i++) {
      const x = silk.x - SILK_HALF + (i / DRAPE_N) * SILK_HALF * 2
      let top = 0
      if (i > 0 && i < DRAPE_N) {
        for (const c of silk.cover) {
          const t = topAt(c, x - c.x)
          if (t !== null) top = Math.max(top, t + c.z + (silk.y - c.y) + 14)
        }
      }
      h.push(top)
      most = Math.max(most, top)
    }
    if (most < 44) {
      silk.drape = null
      return
    }
    // A cloth hangs taut between the highest things under it: the upper hull.
    const hull: number[] = []
    for (let i = 0; i <= DRAPE_N; i++) {
      while (hull.length >= 2) {
        const a = hull[hull.length - 2]!
        const b = hull[hull.length - 1]!
        if ((h[b]! - h[a]!) * (i - a) <= (h[i]! - h[a]!) * (b - a)) hull.pop()
        else break
      }
      hull.push(i)
    }
    const out: number[] = []
    for (let k = 0; k < hull.length - 1; k++) {
      const a = hull[k]!
      const b = hull[k + 1]!
      // Between the things that hold it up, the cloth sags a little.
      const sag = (b - a) * ((SILK_HALF * 2) / DRAPE_N) * 0.07
      for (let i = a; i < b; i++) {
        const u = (i - a) / (b - a)
        out.push(Math.max(h[i]!, lerp(h[a]!, h[b]!, u) - Math.sin(Math.PI * u) * sag))
      }
    }
    out.push(0)
    // Cloth rounds off corners, but never sinks into what it lies on.
    for (let pass = 0; pass < 2; pass++) {
      const prev = out.slice()
      for (let i = 1; i < DRAPE_N; i++) out[i] = Math.max(h[i]!, (prev[i - 1]! + prev[i]! * 2 + prev[i + 1]!) / 4)
    }
    silk.drape = out
  }

  // ---- finding a place to rest ----

  const restFor = (S: Obj, o: Obj, dx: number, up: number): Rest | 'slide' | null => {
    const r = restOn(S, o, dx, up)
    if (o.kind !== 'bird' || (r !== null && r !== 'slide')) return r
    if (S.kind === 'bird' || Math.abs(dx) > halfW(S)) return null
    if (S.kind === 'silk' && !S.drape && !S.turned) return null
    const pk = peak(S, dx)
    return { h: pk.h, dx: pk.dx, tol: 44 }
  }

  // Something has lost what it stood on: it comes down onto whatever is
  // beneath it, or the mat.
  const resettle = (o: Obj, except: Obj | null): void => {
    const mine = group(o)
    let best: Obj | null = null
    let bestRest: Rest | null = null
    let bestAbs = 0
    for (const S of objs) {
      if (S === except || mine.includes(S) || !free(S) || Math.abs(S.y - o.y) > 46) continue
      const r = restFor(S, o, o.x - S.x, 999)
      if (r === null || r === 'slide' || r.sib) continue
      const abs = S.z + r.h
      if (abs <= o.z + 4 && abs > bestAbs) {
        best = S
        bestRest = r
        bestAbs = abs
      }
    }
    const before = o.y - o.z
    if (best && bestRest) shiftGroup(o, best.x + bestRest.dx - o.x, best.y - o.y, bestAbs - o.z)
    else shiftGroup(o, 0, 0, -o.z)
    o.on = best
    o.lift += o.y - o.z - before
    o.vl = 0
    o.airborne = true
  }

  const refreshDrapes = (): void => {
    for (const silk of objs) {
      if (!silk.drape) continue
      silk.cover = silk.cover.filter((c) => free(c) && Math.abs(c.x - silk.x) < SILK_HALF + 10 && c.y <= silk.y && silk.y - c.y < 60)
      computeDrape(silk)
      for (const m of riders(silk)) {
        const r = silk.drape ? restOn(silk, m, m.x - silk.x, 999) : null
        if (r !== null && r !== 'slide') {
          const dz = silk.z + r.h - m.z
          shiftGroup(m, 0, 0, dz)
          m.lift = Math.max(0, m.lift - dz)
          if (m.lift > 0) m.airborne = true
        } else {
          resettle(m, silk)
        }
      }
      if (!silk.drape) {
        silk.cover = []
        silk.y = clamp(silk.y + 20, FLOOR_TOP + 40, FLOOR_BOT - 52)
        silk.stamp = ++stamp
        silk.spread = 0.7
      }
    }
  }

  const sceneChanged = (): void => {
    refreshDrapes()
    birdCheckAt = stage.time + 1.2
  }

  // A thing has come to rest: the sound of it, a wobble, and the scene is new.
  const landed = (o: Obj, speed: number): void => {
    o.airborne = false
    landSound(o, speed)
    const wobble = o.kind === 'doll' || o.kind === 'cone' ? 1.6 : o.kind === 'arch' || o.kind === 'cube' || o.kind === 'plank' || o.kind === 'roof' ? 0.35 : 0.8
    o.wob.kick((o.id % 2 === 0 ? 1 : -1) * wobble * clamp(speed / 300, 0.6, 1.6))
    const cradle = o.on ? cradleOf(o.on) : null
    if (o.kind === 'arch' && o.turned && !cradle) o.omega += (o.vx >= 0 ? 1 : -1) * 2.2
    if (cradle) cradle.omega += (o.x >= cradle.x ? 1 : -1) * 1.1
    sceneChanged()
  }

  // Lift a thing (and whatever rides on it) free of what it stood on.
  const detach = (o: Obj): void => {
    const dz = o.z
    for (const m of group(o)) {
      m.y -= dz
      m.z -= dz
    }
    o.on = null
    if (o.kind === 'silk') {
      for (const m of riders(o)) resettle(m, o)
      o.drape = null
      o.cover = []
    }
    refreshDrapes()
  }

  const inBasketZone = (x: number, y: number): boolean => ((x - BX) / 152) ** 2 + ((y - (RIM + 28)) / 98) ** 2 <= 1
  // Nothing may come to rest hidden behind the basket: there, it goes in.
  const behindBasket = (o: Obj): boolean => Math.abs(o.x - BX) < BASKET_RX + 12 && o.y > RIM - 30

  const toBasket = (o: Obj, late: number): void => {
    o.fromX = o.x + o.offX
    o.fromY = o.y - o.z - liftOf(o)
    o.on = null
    o.basket = true
    o.held = false
    o.z = 0
    o.lift = 0
    o.vl = 0
    o.airborne = false
    o.hop = 0
    o.jump = 0
    o.tilt = 0
    o.theta = 0
    o.omega = 0
    o.fly = 0
    o.spin = 0
    o.hang = false
    o.drape = null
    o.cover = []
    const n = contents.length
    const reach = Math.max(8, 118 - halfW(o) * 0.62)
    o.slotX = clamp(((n * 73 + 31) % 200) - 100, -reach, reach)
    o.slotY = (n * 37) % 26
    o.slotR = (((n * 53) % 100) / 100 - 0.5) * (o.kind === 'arch' ? 0.5 : 1.0)
    o.enter = 1 + late
    contents.push(o)
    stage.after(0.3 + late * 0.36, () => {
      wicker()
      knock(o, 0.05)
      basketBob.kick(1.4)
    })
  }

  // Put a thing down where it is being held.
  const drop = (o: Obj, p: Pointer): void => {
    const members = group(o)
    if (inBasketZone(p.x, p.y) || inBasketZone(o.x, o.y - o.lift - tall(o) * 0.35) || behindBasket(o)) {
      members.forEach((m, i) => toBasket(m, i * 0.18))
      birdCheckAt = stage.time + 1.2
      return
    }
    if (o.kind === 'silk') {
      dropSilk(o)
      return
    }
    // What the child sees as the thing's foot.
    const vb = o.y - o.lift
    let best: Obj | null = null
    let bestRest: Rest | null = null
    let bestD = Infinity
    let slide: Obj | null = null
    let slideD = Infinity
    for (const S of objs) {
      if (members.includes(S) || !free(S)) continue
      const base = S.y - S.z
      const dx = o.x - S.x
      const r = restFor(S, o, dx, base - vb)
      if (r === null) continue
      if (r === 'slide') {
        const d = Math.abs(vb - (base - (topAt(S, dx) ?? 0)))
        if (d <= 36 && d < slideD) {
          slide = S
          slideD = d
        }
        continue
      }
      // A place that already has something standing on it is taken (a
      // cradle is the exception: friends share a boat).
      if (!r.sib && !(S.kind === 'arch' && S.turned)) {
        const level = S.z + r.h
        const at = S.x + r.dx
        const taken = objs.some((m) => m !== S && m.kind !== 'bird' && !members.includes(m) && free(m) && Math.abs(m.y - S.y) < 3 && Math.abs(m.z - level) < 8 && Math.abs(m.x - at) < halfW(m) + halfW(o) - 8)
        if (taken) continue
      }
      const d = Math.abs(vb - (base - r.h))
      const tol = r.tol ?? clamp(r.h * 0.42, 30, 60)
      // A wide tolerance is a kindness, not a preference: weigh it down.
      const score = d * (30 / tol)
      if (d <= tol && score < bestD) {
        best = S
        bestRest = r
        bestD = score
      }
    }
    // A long thing with its middle past the edge needs something under its
    // other end, or it tips off.
    if (best && bestRest && !bestRest.sib && isWide(o) && Math.abs(o.x - best.x) > halfW(best) + 4) {
      const first: Obj = best
      const level = first.z + bestRest.h
      const side = Math.sign(o.x - first.x)
      const partner = objs.some((S) => {
        if (S === first || members.includes(S) || !free(S) || Math.abs(S.y - first.y) > 40 || Math.sign(S.x - o.x) !== side) return false
        const r = restOn(S, o, o.x - S.x, 999)
        return r !== null && r !== 'slide' && !r.sib && Math.abs(S.z + r.h - level) < 14
      })
      if (!partner) {
        slide = first
        best = null
      }
    }
    o.vl = 0
    o.airborne = true
    if (best && bestRest) {
      const nx = best.x + bestRest.dx
      const nz = bestRest.sib ? best.z : best.z + bestRest.h
      o.offX += o.x - nx
      shiftGroup(o, nx - o.x, best.y - o.y, nz - o.z)
      o.on = bestRest.sib ? best.on : best
      o.lift = o.y - o.z - vb
      if (o.lift <= 0.5) landed(o, 240)
      return
    }
    let nx = clamp(o.x, 30, W - 30)
    let ny = clamp(o.y, FLOOR_TOP, FLOOR_BOT)
    if (slide && !best) {
      const side = o.x >= slide.x ? 1 : -1
      nx = clamp(slide.x + side * (halfW(slide) + halfW(o) + 8), 30, W - 30)
      ny = clamp(slide.y + 2, FLOOR_TOP, FLOOR_BOT)
    }
    o.offX += o.x - nx
    shiftGroup(o, nx - o.x, ny - o.y, 0)
    o.on = null
    o.lift = o.y - vb
    if (o.lift <= 0.5) landed(o, 240)
  }

  const dropSilk = (o: Obj): void => {
    const px = o.x
    const py = o.y - 70
    o.hang = false
    o.turned = false
    o.airborne = false
    o.lift = 0
    o.vl = 0
    // It lands on whatever the finger was holding it over, or whatever stands
    // where the cloth comes down.
    const under = objs.filter((c) => {
      if (c === o || c.kind === 'silk' || !free(c)) return false
      const foot = c.y - c.z
      const over = Math.abs(c.x - px) < halfW(c) + 50 && py > foot - tall(c) - 46 && py < foot + 16
      const beneath = ((c.x - px) / 128) ** 2 + ((c.y - (py + 64)) / 62) ** 2 <= 1
      return over || beneath
    })
    if (under.length > 0) {
      let baseY = 0
      for (const c of under) baseY = Math.max(baseY, c.y)
      o.cover = objs.filter((c) => c !== o && c.kind !== 'silk' && free(c) && Math.abs(c.x - px) < SILK_HALF - 14 && c.y <= baseY && baseY - c.y < 48)
      o.x = px
      o.y = baseY + 1
      o.z = 0
      computeDrape(o)
    }
    if (o.drape) {
      o.spread = 0
    } else {
      o.cover = []
      o.x = clamp(px, 180, W - 180)
      o.y = clamp(py + 64, FLOOR_TOP + 36, FLOOR_BOT - 52)
      o.spread = 0.25
      o.stamp = ++stamp
    }
    hush(0.04, true)
    sceneChanged()
  }

  // ---- turning things over (a tap) ----

  const turnAnim = (o: Obj, spin: number, shift: number, hop: number, seconds: number, done?: () => void): void => {
    stage.tween(
      seconds,
      (t) => {
        o.spin = spin * (1 - t)
        o.shift = shift * (1 - t)
        o.jump = Math.sin(Math.PI * Math.min(1, t * 1.15)) * hop
      },
      ease.inOutQuad,
      () => {
        o.spin = 0
        o.shift = 0
        o.jump = 0
        done?.()
      },
    )
  }

  const turn = (o: Obj): void => {
    const loads = riders(o).filter((m) => m.kind !== 'bird')
    const birds = riders(o).filter((m) => m.kind === 'bird')
    const dir = o.id % 2 === 0 ? 1 : -1
    switch (o.kind) {
      case 'arch': {
        if (loads.length > 0) {
          // A full cradle is rocked, not tipped out; a loaded bridge only shivers.
          if (o.turned) o.omega += 1.7 * dir
          else o.wob.kick(0.5 * dir)
          knock(o, 0.05)
          return
        }
        for (const b of birds) resettle(b, o)
        o.turned = !o.turned
        o.theta = 0
        o.omega = 0
        // Turned over where it stands inside the rainbow, it would land on
        // the others: it rolls out towards the child instead.
        if (o.turned && o.on === null && objs.some((m) => m !== o && m.kind === 'arch' && !m.turned && free(m) && Math.abs(m.x - o.x) < 4 && Math.abs(m.y - o.y) < 2)) {
          const ny = clamp(o.y + 76, FLOOR_TOP, FLOOR_BOT)
          o.offY = o.y - ny
          o.y = ny
        }
        knock(o, 0.04)
        turnAnim(o, Math.PI * dir, 0, 34 + ARCH_R[o.v]! * 0.12, 0.5, () => {
          landSound(o, 300)
          if (o.turned) o.omega = 2.3 * dir
          sceneChanged()
        })
        return
      }
      case 'doll': {
        for (const b of birds) resettle(b, o)
        const was = tall(o) / 2
        o.turned = !o.turned
        const lie = (o.v % 2 === 0 ? 1 : -1) * (Math.PI / 2)
        knock(o, 0.035)
        turnAnim(o, o.turned ? -lie : lie, tall(o) / 2 - was, 10, 0.42, () => {
          landSound(o, 220)
          sceneChanged()
        })
        return
      }
      case 'plank': {
        if (loads.length > 0) {
          o.wob.kick(0.4 * dir)
          knock(o, 0.05)
          return
        }
        for (const b of birds) resettle(b, o)
        const was = tall(o) / 2
        o.turned = !o.turned
        knock(o, 0.04)
        turnAnim(o, (Math.PI / 2) * dir, tall(o) / 2 - was, 26, 0.46, () => {
          landSound(o, 300)
          o.wob.kick(0.25 * dir)
          sceneChanged()
        })
        return
      }
      case 'cube': {
        knock(o, 0.04)
        if (loads.length > 0) {
          o.wob.kick(0.4 * dir)
          return
        }
        turnAnim(o, (Math.PI / 2) * dir, 0, 22, 0.4, () => landSound(o, 260))
        return
      }
      case 'horse':
      case 'sheep':
      case 'fox':
      case 'bird': {
        o.turned = !o.turned
        for (const m of riders(o)) shiftGroup(m, -2 * (m.x - o.x), 0, 0)
        o.flip = 1
        stepSound(o)
        stage.tween(
          0.4,
          (t) => {
            o.flip = 1 - t
            o.jump = Math.sin(Math.PI * t) * 12
          },
          ease.inOutQuad,
          () => {
            o.flip = 0
            o.jump = 0
            landSound(o, 200)
            if (o.kind === 'bird') chirp()
          },
        )
        return
      }
      case 'silk': {
        if (o.drape) {
          o.spread = 0.82
          hush(0.03, false)
          return
        }
        o.turned = !o.turned
        if (o.turned) {
          o.spread = 0.3
          hush(0.035, false)
        } else {
          o.spread = 0.25
          o.stamp = ++stamp
          o.y = clamp(o.y, FLOOR_TOP + 36, FLOOR_BOT - 52)
          o.x = clamp(o.x, 180, W - 180)
          hush(0.04, true)
        }
        sceneChanged()
        return
      }
      default: {
        // Roof, cones and stones: a small hop and a wobble.
        o.wob.kick((o.kind === 'roof' ? 0.5 : 2.2) * dir)
        knock(o, 0.05)
        stage.tween(0.26, (t) => (o.jump = Math.sin(Math.PI * t) * 9), ease.linear, () => {
          o.jump = 0
          landSound(o, 200)
        })
      }
    }
  }

  // ---- the bird ----

  let bird: Obj | null = null

  const birdLooks = (): void => {
    const b = bird
    if (!b || b.basket) return
    if (presses.size > 0 || b.fly > 0 || b.lift !== 0 || heldChain(b)) {
      birdCheckAt = stage.time + 0.6
      return
    }
    let best: Obj | null = null
    let bestPeak: Rest | null = null
    let bestH = b.z + 22
    for (const S of objs) {
      if (S === b || S === b.on || !free(S) || S.lift !== 0 || S.spin !== 0 || covered(S)) continue
      if (S.kind === 'silk' && !S.drape && !S.turned) continue
      const pk = peak(S, b.x - S.x)
      const h = S.z + pk.h
      if (h > bestH) {
        best = S
        bestPeak = pk
        bestH = h
      }
    }
    if (!best || !bestPeak) return
    const fromX = b.x
    const fromY = b.y - b.z
    b.on = best
    b.x = best.x + bestPeak.dx
    b.y = best.y
    b.z = bestH
    b.flyX = fromX - b.x
    b.flyY = fromY - (b.y - b.z)
    b.flyH = 46 + Math.abs(b.flyX) * 0.1
    b.fly = 1
    if (Math.abs(b.flyX) > 6) b.turned = b.flyX > 0
    for (let i = 0; i < 3; i++) sfx.noise({ dur: 0.035, freq: 900, vol: 0.022, filter: 'bandpass', q: 1.5, delay: i * 0.075 })
  }

  // ---- the first scene: laid out like an invitation ----

  const stand = (kind: Kind, v: number, x: number, y: number, turned = false): Obj => {
    const o = make(kind, v, x, y)
    o.turned = turned
    return o
  }
  const putOn = (o: Obj, S: Obj, dx: number): void => {
    const r = restFor(S, o, dx, 999)
    if (r === null || r === 'slide') return
    o.on = S
    o.x = S.x + r.dx
    o.y = S.y
    o.z = S.z + r.h
  }

  for (let i = 0; i < ARCH_R.length; i++) stand('arch', i, 318, 452)
  const dollAt: [number, number][] = [
    [548, 372],
    [612, 392],
    [676, 370],
    [740, 394],
    [804, 374],
  ]
  dollAt.forEach(([x, y], i) => stand('doll', i, x, y))
  stand('horse', 0, 640, 560)
  stand('sheep', 0, 800, 590)
  stand('fox', 0, 488, 612)
  bird = stand('bird', 0, 915, 548)
  const plankA = stand('plank', 0, 962, 372)
  const plankB = stand('plank', 1, 962, 372)
  putOn(plankB, plankA, 0)
  const roof = stand('roof', 0, 962, 372)
  putOn(roof, plankB, 0)
  const cubeA = stand('cube', 0, 1052, 492)
  const cubeB = stand('cube', 1, 1052, 492)
  putOn(cubeB, cubeA, 0)
  stand('cone', 0, 138, 560)
  stand('cone', 1, 186, 592)
  stand('stone', 0, 118, 632)
  stand('stone', 1, 232, 566)
  stand('stone', 2, 180, 650)
  stand('silk', 0, 150, 730, true)
  stand('silk', 1, 290, 742, true)
  stand('silk', 2, 430, 730, true)

  // ---- hit testing ----

  const strong = (o: Obj, px: number, py: number): boolean => {
    const lx = px - o.x
    const ly = o.y - o.z - py
    if (o.kind === 'arch') {
      const R = ARCH_R[o.v]!
      const d = Math.hypot(lx, ly - (o.turned ? R : 0))
      if (o.turned ? ly > R + 8 : ly < -8) return false
      return d <= R + 8 && d >= R - ARCH_T - 8
    }
    if (o.kind === 'silk' && o.drape) {
      const h = drapeH(o, lx)
      return h !== null && ly > -18 && ly < h + 8
    }
    if (o.kind === 'silk' && !o.turned) return (lx / 150) ** 2 + (ly / 60) ** 2 <= 1
    return Math.abs(lx) <= halfW(o) + 6 && ly >= -8 && ly <= tall(o) + 8
  }
  const near = (o: Obj, px: number, py: number): number => {
    const lx = Math.abs(px - o.x)
    const ly = o.y - o.z - py
    return Math.hypot(Math.max(0, lx - halfW(o)), Math.max(0, -ly, ly - tall(o)))
  }
  const pick = (px: number, py: number): Obj | null => {
    for (let i = order.length - 1; i >= 0; i--) {
      const o = order[i]!
      if (!o.held && o.fly === 0 && strong(o, px, py)) return o
    }
    let best: Obj | null = null
    let bestD = 38
    for (let i = order.length - 1; i >= 0; i--) {
      const o = order[i]!
      if (o.held || o.fly > 0 || (o.kind === 'silk' && o.drape)) continue
      const d = near(o, px, py)
      if (d < bestD) {
        best = o
        bestD = d
      }
    }
    if (best) return best
    for (let i = flats.length - 1; i >= 0; i--) {
      const o = flats[i]!
      if (!o.held && strong(o, px, py)) return o
    }
    return null
  }

  const basketHit = (px: number, py: number): boolean => Math.abs(px - BX) < BASKET_RX + 8 && py > RIM - (contents.length > 0 ? 64 : 34) && py < RIM + BASKET_H + 10

  const rebuild = (): void => {
    order.length = 0
    above.length = 0
    flats.length = 0
    for (const o of objs) o.load = 0
    for (const o of objs) {
      if (o.basket) continue
      if (o.on && o.on.kind === 'arch' && o.on.turned && o.kind !== 'bird') o.on.load++
      let level = 0
      for (let m = o.on; m; m = m.on) level++
      o.key = o.y * 100 + level + o.z * 0.0001
      o.top = heldChain(o) || o.fly > 0
      if (o.top) above.push(o)
      else if (o.kind === 'silk' && !o.turned && !o.drape) flats.push(o)
      else order.push(o)
    }
    order.sort((a, b) => a.key - b.key || a.id - b.id)
    above.sort((a, b) => a.key - b.key || a.id - b.id)
    flats.sort((a, b) => a.stamp - b.stamp)
  }
  rebuild()

  // ---- drawing ----

  const spriteOf = (o: Obj): Sprite => {
    switch (o.kind) {
      case 'arch':
        return (o.turned ? art.archBack : art.arch)[o.v]!
      case 'doll':
        return (o.turned ? art.dollAsleep : art.doll)[o.v]!
      case 'horse':
        return art.horse
      case 'sheep':
        return art.sheep
      case 'fox':
        return art.fox
      case 'bird':
        return art.bird
      case 'cube':
        return art.cube[o.v]!
      case 'plank':
        return (o.turned ? art.plankUp : art.plank)[o.v]!
      case 'roof':
        return art.roof
      case 'cone':
        return art.cone[o.v]!
      case 'stone':
        return art.stone[o.v]!
      case 'silk':
        return art.silkHeap[o.v]!
    }
  }

  // The thing itself, with its foot at the origin.
  const body = (g: Ctx, o: Obj): void => {
    const s = spriteOf(o)
    if (isAnimal(o)) {
      const f = facing(o) * (o.flip > 0 ? Math.cos(Math.PI * o.flip) : 1)
      g.scale(Math.abs(f) < 0.08 ? 0.08 : f, 1)
    }
    const lying = o.kind === 'doll' && o.turned
    if (lying || o.spin !== 0) {
      const lie = lying ? (o.v % 2 === 0 ? 1 : -1) * (Math.PI / 2) : 0
      g.translate(0, -tall(o) / 2 + o.shift)
      g.rotate(lie + o.spin)
      g.translate(0, lying ? 54 : tall(o) / 2)
    }
    blit(g, s)
  }

  const drawFlat = (g: Ctx, o: Obj): void => {
    const t = stage.time
    const k = o.spread
    g.save()
    g.translate(o.x, o.y - o.lift * 0.5)
    g.scale(0.4 + 0.6 * k, 0.55 + 0.45 * k)
    blit(g, art.silkFlat[o.v]!)
    g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.45 + o.id)
    g.translate(Math.sin(t * 0.3 + o.id * 2) * 7, 0)
    blit(g, art.silkSheen[o.v]!)
    g.restore()
  }

  const drawObj = (g: Ctx, o: Obj): void => {
    let x = o.x + o.offX
    let y = o.y + o.offY - o.z - liftOf(o)
    if (o.fly > 0) {
      const e = ease.inOutQuad(o.fly)
      x += o.flyX * e
      y += o.flyY * e - Math.sin(Math.PI * (1 - o.fly)) * o.flyH
    }
    if (o.kind === 'silk' && o.hang) {
      drawSilkHeld(g, o.v, x, y - 70, o.trail, stage.time)
      return
    }
    if (o.kind === 'silk' && o.drape) {
      drawSilkDrape(g, o.v, x, y, o.drape, 1 + (1 - o.spread) * 0.35)
      return
    }
    if (o.kind === 'silk' && !o.turned) {
      drawFlat(g, o)
      return
    }
    g.save()
    const c = cradleOf(o)
    if (c && c.theta !== 0) {
      const R = ARCH_R[c.v]!
      const cx = c.x + c.offX
      const cy = c.y - c.z - liftOf(c) - R
      g.translate(cx + R * c.theta, cy)
      g.rotate(c.theta)
      g.translate(-cx, -cy)
    }
    g.translate(x, y)
    const rot = o.tilt + o.wob.value * 0.1 + (o.fly > 0 ? Math.sin(o.fly * 16) * 0.16 : 0)
    if (rot !== 0) g.rotate(rot)
    if (o.scale !== 1) g.scale(o.scale, o.scale)
    if (o.kind === 'silk') {
      const k = 0.7 + 0.3 * o.spread
      g.scale(2 - k, k)
    }
    body(g, o)
    g.restore()
  }

  const drawShadow = (g: Ctx, o: Obj): void => {
    // Arches nested in one another cast one shadow, not seven.
    if (o.kind === 'arch' && !o.turned && order.some((m) => m.kind === 'arch' && !m.turned && m.v < o.v && Math.abs(m.x - o.x) < 3 && Math.abs(m.y - o.y) < 2 && m.z === o.z)) return
    const up = o.lift + o.hop + o.jump
    const w = halfW(o)
    const k = 1 + clamp(up, 0, 80) / 90
    g.globalAlpha = 0.2 / k
    g.beginPath()
    g.ellipse(o.x + o.offX + 5, o.y + o.offY + 3, w * 0.98 * k, clamp(w * 0.2, 5, 15) * k, 0, 0, Math.PI * 2)
    g.fill()
  }

  const drawInBasket = (g: Ctx, o: Obj): void => {
    const e = clamp(o.enter, 0, 1)
    const k = e * e * (3 - 2 * e)
    const tx = BX + o.slotX
    const ty = RIM + 20 + o.slotY + basketBob.value * 5
    g.save()
    g.translate(lerp(tx, o.fromX, k), lerp(ty, o.fromY, k) - Math.sin(Math.PI * (1 - e)) * (e > 0 ? 44 : 0))
    g.rotate(o.slotR * (1 - k))
    const s = lerp(0.66, 1, k)
    g.scale(s, s)
    body(g, o)
    g.restore()
  }

  const leaves = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ u: 0.12 + ((i * 0.37) % 0.8), v: 0.1 + ((i * 0.53) % 0.8), s: 0.9 + (i % 3) * 0.45, w: 0.21 + i * 0.043, p: i * 1.9 }))
  const motes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => ({ u: (i * 0.619) % 1, v: (i * 0.383) % 1, w: 0.05 + (i % 5) * 0.012, p: i * 2.3 }))

  return {
    update(dt) {
      const t = stage.time
      for (const o of objs) {
        if (o.basket) {
          if (o.enter > 0) o.enter = Math.max(0, o.enter - dt / 0.36)
          continue
        }
        if (o.held) {
          o.lift = damp(o.lift, HOLD, 24, dt)
          o.vl = 0
        } else if (o.lift > 0 || o.vl !== 0) {
          o.vl -= GRAV * dt
          o.lift += o.vl * dt
          if (o.lift <= 0) {
            const speed = -o.vl
            o.lift = 0
            if (speed > 430) {
              o.vl = speed * 0.18
            } else {
              o.vl = 0
            }
            if (o.airborne) landed(o, speed)
          }
        } else if (o.lift < 0) {
          o.lift = o.lift > -0.4 ? 0 : damp(o.lift, 0, 16, dt)
        }

        o.vx = damp(o.vx, (o.x - o.px) / Math.max(dt, 0.001), 14, dt)
        o.px = o.x
        if (o.held && !isWalker(o) && o.kind !== 'silk') o.tilt = damp(o.tilt, clamp(-o.vx * 0.00035, -0.2, 0.2), 9, dt)
        else if (!(o.held && isWalker(o))) o.tilt = damp(o.tilt, 0, 10, dt)
        if (!o.held) o.hop = o.hop < 0.3 ? 0 : damp(o.hop, 0, 16, dt)
        o.wob.update(dt)
        if (Math.abs(o.offX) > 0.2) o.offX = damp(o.offX, 0, 11, dt)
        else o.offX = 0
        if (Math.abs(o.offY) > 0.2) o.offY = damp(o.offY, 0, 7, dt)
        else o.offY = 0
        o.scale = Math.abs(1 - o.scale) < 0.004 ? 1 : damp(o.scale, 1, 13, dt)
        if (o.spread < 1) o.spread = Math.min(1, o.spread + dt * 2.2 * (1.15 - o.spread))
        if (o.hang) o.trail = damp(o.trail, o.x, 5, dt)

        if (o.fly > 0) {
          o.fly = Math.max(0, o.fly - dt / 0.8)
          if (o.fly === 0) {
            landSound(o, 220)
            chirp()
            o.wob.kick(1.2)
          }
        }

        if (o.kind === 'arch' && o.turned) {
          const riding = o.on ? cradleOf(o.on) !== null : false
          if (riding) {
            o.theta = 0
            o.omega = 0
          } else if (o.held) {
            o.omega = 0
            o.theta = damp(o.theta, clamp(-o.vx * 0.0005, -0.35, 0.35), 8, dt)
          } else {
            // A rocker: a soft spring about level, losing a little each swing.
            const before = o.theta - o.sway
            let free0 = before
            o.omega += (-16 * free0 - 0.75 * o.omega) * dt
            free0 = clamp(free0 + o.omega * dt, -0.5, 0.5)
            if (Math.abs(free0) < 0.0015 && Math.abs(o.omega) < 0.01) {
              free0 = 0
              o.omega = 0
            }
            if (before * free0 < 0 && Math.abs(o.omega) > 0.55 && t - lastRockAt > 0.18) {
              lastRockAt = t
              sfx.tone({ freq: pitch(o) * 0.5, to: pitch(o) * 0.46, dur: 0.07, type: 'sine', vol: Math.min(0.05, Math.abs(o.omega) * 0.02) })
            }
            // Someone in the cradle keeps it gently rocking, without a sound.
            const want = o.load > 0 ? 0.055 * Math.sin(t * 2.0 + o.id) : 0
            o.sway = damp(o.sway, want, 2.5, dt)
            o.theta = free0 + o.sway
          }
        } else if (o.theta !== 0) {
          o.theta = 0
          o.omega = 0
          o.sway = 0
        }
      }
      for (let i = dimples.length - 1; i >= 0; i--) {
        dimples[i]!.t += dt / 0.55
        if (dimples[i]!.t >= 1) dimples.splice(i, 1)
      }
      basketBob.update(dt)
      if (birdCheckAt > 0 && t >= birdCheckAt) {
        birdCheckAt = -1
        birdLooks()
      }
      rebuild()
    },

    draw(g) {
      const t = stage.time
      g.drawImage(art.room, 0, 0, W, H)

      // Leaf shadows stir inside the window light.
      for (const leaf of leaves) {
        const [x, y] = lightPoint(leaf.u + Math.sin(t * leaf.w + leaf.p) * 0.05, leaf.v + Math.cos(t * leaf.w * 0.8 + leaf.p) * 0.04)
        const s = 120 * leaf.s
        g.drawImage(art.leaf.c, x - s / 2, y - s * 0.3, s, s * 0.6)
      }

      for (const d of dimples) {
        g.globalAlpha = 0.16 * (1 - d.t)
        g.fillStyle = '#6b4a22'
        g.beginPath()
        g.ellipse(d.x, d.y, 26 + d.t * 16, 10 + d.t * 6, 0, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1

      for (const o of flats) drawFlat(g, o)

      g.fillStyle = '#3c2408'
      for (const o of order) if (o.on === null && !(o.kind === 'silk' && o.drape)) drawShadow(g, o)
      g.globalAlpha = 0.2
      g.beginPath()
      g.ellipse(BX + 6, RIM + BASKET_H - 6, 122, 20, 0, 0, Math.PI * 2)
      g.fill()
      for (const o of above) if (o.on === null && o.fly === 0 && !o.hang) drawShadow(g, o)
      g.globalAlpha = 1

      for (const o of order) drawObj(g, o)

      // The basket: its inside, what is in it, then its woven front.
      const bob = basketBob.value
      g.save()
      g.translate(BX, RIM)
      g.scale(1 + bob * 0.012, 1 - bob * 0.02)
      blit(g, art.basketBack)
      g.restore()
      for (const o of contents) if (o.enter <= 0) drawInBasket(g, o)
      g.save()
      g.translate(BX, RIM)
      g.scale(1 + bob * 0.012, 1 - bob * 0.02)
      blit(g, art.basketFront)
      g.restore()
      for (const o of contents) if (o.enter > 0 && o.enter <= 1) drawInBasket(g, o)

      for (const o of above) drawObj(g, o)

      // Dust in the sunbeam.
      g.fillStyle = '#fff6dc'
      for (const m of motes) {
        const v = (m.v - t * m.w * 0.2 + 100) % 1
        const [x, y] = lightPoint(m.u + Math.sin(t * 0.4 + m.p) * 0.03, v)
        g.globalAlpha = 0.5 * Math.sin(Math.PI * v) * (0.6 + 0.4 * Math.sin(t * 1.3 + m.p))
        g.beginPath()
        g.arc(x, y - 30, 1.7, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1
    },

    down(p: Pointer) {
      rebuild()
      if (basketHit(p.x, p.y)) {
        basketBob.kick(1.2)
        wicker()
        if (contents.length === 0) return
        // Take out whatever is nearest the finger, the newest first.
        let at = contents.length - 1
        let score = Infinity
        contents.forEach((o, i) => {
          const s = Math.abs(BX + o.slotX - p.x) - i * 2.5
          if (o.enter <= 0 && s < score) {
            score = s
            at = i
          }
        })
        const o = contents[at]!
        if (o.enter > 0) return
        contents.splice(at, 1)
        o.basket = false
        o.scale = 0.66
        o.x = p.x
        o.y = p.y + Math.min(60, tall(o) * 0.4)
        o.px = o.x
        o.z = 0
        o.on = null
        o.held = true
        o.lift = 0
        o.wob.value = 0
        o.wob.vel = 0
        if (o.kind === 'doll') o.turned = false
        if (o.kind === 'silk') {
          o.hang = true
          o.turned = false
          o.trail = o.x
          o.y = p.y + 70
        }
        presses.set(p.id, { o, offX: o.x - p.x, offY: o.y - p.y, dragging: true })
        knock(o, 0.03)
        return
      }
      const o = pick(p.x, p.y)
      if (!o) {
        // Bare mat or floor: a soft pat.
        if (p.y > 200) {
          dimples.push({ x: p.x, y: p.y, t: 0 })
          felt(0.06)
          fx.burst(p.x, p.y, { count: 3, color: '#fffaf0', speed: 36, life: 0.7, size: 2.4, gravity: -12, drag: 0.94, angle: -Math.PI / 2, spread: 2.2 })
        } else {
          // The wall and the far floor: a knock, and a little dust in the light.
          tok(196, 0.05, 0.06)
          fx.burst(p.x, p.y, { count: 4, color: '#fff6dc', speed: 30, life: 0.9, size: 2.2, gravity: 10, drag: 0.93 })
        }
        return
      }
      o.held = true
      o.fly = 0
      presses.set(p.id, { o, offX: o.x - p.x, offY: o.y - o.z - p.y, dragging: false })
      if (o.kind === 'silk') hush(0.03, false)
      else knock(o, 0.045)
    },

    move(p: Pointer) {
      const press = presses.get(p.id)
      if (!press) return
      const o = press.o
      if (!press.dragging) {
        if (Math.hypot(p.x - p.startX, p.y - p.startY) < 12) return
        press.dragging = true
        detach(o)
        if (o.kind === 'silk') {
          o.hang = true
          o.turned = false
          o.trail = o.x
          o.x = p.x
          o.y = p.y + 70
        }
        // Measured from where the finger went down, so the thing does not
        // lag behind by the distance it took to notice the drag.
        press.offX = o.x - p.startX
        press.offY = o.y - p.startY
      }
      const nx = clamp(p.x + press.offX, 26, W - 26)
      const ny = clamp(p.y + press.offY, 70, FLOOR_BOT + 30)
      const moved = Math.hypot(nx - o.x, ny - o.y)
      shiftGroup(o, nx - o.x, ny - o.y, 0)
      if (isWalker(o) && moved > 0) {
        // Walked along, the way a child hops a toy across the floor.
        const stride = o.kind === 'horse' ? 46 : o.kind === 'bird' ? 26 : 34
        const before = Math.floor(o.step)
        o.step += moved / stride
        const amp = o.kind === 'horse' ? 13 : o.kind === 'doll' ? 8 : 9
        o.hop = Math.abs(Math.sin(o.step * Math.PI)) * amp
        o.tilt = Math.sin(o.step * Math.PI) * (o.kind === 'doll' ? 0.11 : 0.05)
        if (Math.floor(o.step) !== before) stepSound(o)
      }
    },

    up(p: Pointer) {
      const press = presses.get(p.id)
      if (!press) return
      presses.delete(p.id)
      const o = press.o
      o.held = false
      if (!press.dragging) {
        // A quick touch turns the thing over; a long still hold only lifts it
        // and sets it down again.
        if (stage.time - p.downAt < 0.5) {
          o.airborne = false
          turn(o)
        } else {
          o.airborne = true
        }
        return
      }
      drop(o, p)
      rebuild()
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'rainbow-world',
    name: 'Rainbow World',
    emoji: '🌈',
    ages: [3, 7],
    set: 'gentle',
    pitch: 'A wooden rainbow, peg dolls, animals, silks and blocks on a wool mat. Build a bridge, a boat, a house, a hill; tidy it into the basket when the story is done.',
    howTo: 'Drag anything anywhere; it stays where you put it. Tap a thing to turn it over. Drop things in the basket to tidy up, and pull them out again.',
    basedOn: 'Waldorf open-ended toys: the stacking rainbow, peg dolls, play silks, carved animals; the kindergarten tidy-up basket',
    whyFun: 'Wood that knocks like a little xylophone when you set it down, an arch that rocks on its back, silk that floats open, and a doll that walks where your finger walks it.',
  },
  create,
}
