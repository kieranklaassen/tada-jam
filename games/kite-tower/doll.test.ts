import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  ARM_JOINT,
  ARM_R,
  BlockField,
  BODY_R,
  DollGuard,
  DollPlace,
  DUCK,
  FACE_CELL,
  FLY_GRIP,
  FLY_RAISE,
  GRIP_REACH,
  HAIR,
  HAND_R,
  HAND_REACH,
  HEAD_R,
  HEAD_Y,
  NECK_Y,
  POM_R,
  POM_Y,
  SHOULDER,
  SPOOL_R,
  SPOOL_ROOM,
  armDirection,
  bodyDistance,
  fitHead,
  handAt,
  headDistance,
  keepOut,
  type HeadKind,
  type HeadPose,
} from './doll'
import { WATCHERS } from './layout'
import { PERSONALITIES, blankPose, type Doll, type PoseDelta } from './motion'
import { SHAPES } from './pieces'
import { BEAN, HERO, MOSS, armGeometry, bodyGeometry, faceGeometry, headGeometry } from './view/dolls'

const KIND: Record<Doll, HeadKind> = { pip: 'bob', moss: 'cap', bean: 'beanie' }
/** Each doll's arms at rest before its pose is added, as view/dolls.tsx sets them. */
const REST: Record<Doll, number> = { pip: 0.18, moss: 0.12, bean: 0.25 }
const SPECS = [HERO, MOSS, BEAN]
/** A touch, not a poke: what the geometry sampling below can resolve. */
const TOUCH = -0.002

type Arms = { raiseL: number; raiseR: number; forwardL: number; forwardR: number }
type Turn = { pitch: number; yaw: number; roll: number }

function radiusAt(a: number): number {
  return ARM_R + ((HAND_R - ARM_R) * a) / HAND_REACH
}

/** Points along an arm's axis in the doll's frame, placed the way three turns the rig's arm group. */
function armAxis(side: -1 | 1, raise: number, forward: number): { p: THREE.Vector3; r: number }[] {
  const euler = new THREE.Euler(forward, 0, side * raise)
  const shoulder = new THREE.Vector3(side * SHOULDER.x, SHOULDER.y, 0)
  return Array.from({ length: 25 }, (_, i) => {
    const a = (HAND_REACH * i) / 24
    return { p: new THREE.Vector3(0, -a, 0).applyEuler(euler).add(shoulder), r: radiusAt(a) }
  })
}

/** The smallest gaps from the arms to the head (with hair, hat and pom), to the body past the shoulder joint, and to each other. */
function gaps(kind: HeadKind, turn: Turn, arms: Arms): { head: number; body: number; arms: number } {
  const toHead = new THREE.Matrix4()
    .compose(new THREE.Vector3(0, HEAD_Y, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(turn.pitch, turn.yaw, turn.roll)), new THREE.Vector3(1, 1, 1))
    .invert()
  const left = armAxis(-1, arms.raiseL, arms.forwardL)
  const right = armAxis(1, arms.raiseR, arms.forwardR)
  let head = Infinity
  let body = Infinity
  let apart = Infinity
  for (const { p, r } of [...left, ...right]) {
    const h = p.clone().applyMatrix4(toHead)
    let d = headDistance(kind, h.x, h.y, h.z)
    if (kind === 'beanie') d = Math.min(d, Math.hypot(h.x, h.y - POM_Y, h.z) - POM_R)
    head = Math.min(head, d - r)
    body = Math.min(body, bodyDistance(p.x, p.y, p.z) - (r - ARM_JOINT))
  }
  for (const a of left) for (const b of right) apart = Math.min(apart, a.p.distanceTo(b.p) - a.r - b.r)
  return { head, body, arms: apart }
}

/** Runs the guard as the rig does: head first, then the right arm, then the left. */
function guarded(kind: HeadKind, turn: Turn, ask: Arms): { turn: Turn; arms: Arms } {
  const guard = new DollGuard(kind)
  if (kind === 'beanie') guard.setPom(0, POM_Y, 0)
  const head = guard.turnHead(turn.pitch, turn.yaw, turn.roll, { pitch: 0, roll: 0 })
  guard.beginArms()
  const raiseR = guard.arm(1, ask.raiseR, ask.forwardR)
  const raiseL = guard.arm(-1, ask.raiseL, ask.forwardL)
  return { turn: { pitch: head.pitch, yaw: turn.yaw, roll: head.roll }, arms: { raiseL, raiseR, forwardL: ask.forwardL, forwardR: ask.forwardR } }
}

/** How the watchers' heads follow what they look at, at the ends of the neck's range. */
const LOOKS: Turn[] = [
  { pitch: 0, yaw: 0, roll: 0 },
  { pitch: 0.35, yaw: 0.7, roll: 0 },
  { pitch: -0.5, yaw: -0.7, roll: 0 },
]

type Sample = { doll: Doll; action: string; turn: Turn; arms: Arms }

/** Every reaction, cheer, poke and delight of every doll, frame by frame at the strongest amplitude the director plays. */
function personalitySamples(): Sample[] {
  const out: Sample[] = []
  for (const doll of ['pip', 'moss', 'bean'] as const) {
    const p = PERSONALITIES[doll]
    for (const action of [...p.react, ...p.cheer, ...p.poke, ...p.delight]) {
      for (let t = 0; t <= action.duration; t += 1 / 30) {
        const pose: PoseDelta = blankPose()
        action.sample(t, 1.15, pose)
        for (const look of LOOKS) {
          out.push({
            doll,
            action: action.name,
            turn: { pitch: look.pitch + pose.headPitch, yaw: look.yaw + pose.headYaw, roll: pose.headRoll },
            arms: { raiseL: REST[doll] + pose.raiseL, raiseR: REST[doll] + pose.raiseR, forwardL: pose.forwardL, forwardR: pose.forwardR },
          })
        }
      }
    }
  }
  return out
}

/** Pip's own route and kite poses from view/dolls.tsx: reaching on tiptoe, climbing, hopping, dropping, grabbing the kite. */
function pipSamples(): Sample[] {
  const out: Sample[] = []
  const add = (action: string, arms: Arms) => {
    for (const look of LOOKS) out.push({ doll: 'pip', action, turn: look, arms })
  }
  for (let reach = 0; reach <= 1; reach += 0.1) {
    for (const side of [-1, 1]) {
      const raise = 0.18 + reach * 2.75 + 0.08 * reach
      const toward = 0.4 * reach
      const away = 1.7 * reach
      add('reach', {
        raiseL: raise - (side < 0 ? toward : away),
        raiseR: raise - (side < 0 ? away : toward),
        forwardL: side < 0 ? 0.35 * reach : 0,
        forwardR: side < 0 ? 0 : 0.35 * reach,
      })
    }
  }
  for (let k = 0; k <= 1; k += 0.05) {
    const climb = k < 0.25 ? 0.3 + 2.5 * (k / 0.25) : k < 0.75 ? 2.8 - 1.9 * ((k - 0.25) / 0.5) : 0.9 - 0.5 * ((k - 0.75) / 0.25)
    const forward = k < 0.25 ? 0 : k < 0.75 ? -0.9 * ((k - 0.25) / 0.5) : 0
    add('climb', { raiseL: climb, raiseR: climb, forwardL: forward, forwardR: forward })
    add('hop', { raiseL: 0.6 + Math.sin(k * Math.PI) * 1.8, raiseR: 0.6 + Math.sin(k * Math.PI) * 1.8, forwardL: 0, forwardR: 0 })
    add('fly', { raiseL: FLY_RAISE, raiseR: FLY_RAISE, forwardL: Math.sin(k * 6) * 0.12, forwardR: 0 })
  }
  add('drop', { raiseL: 2.8, raiseR: 2.8, forwardL: 0, forwardR: 0 })
  add('grab', { raiseL: 3.0, raiseR: 3.0, forwardL: 0, forwardR: 0 })
  return out
}

describe('peg doll guard', () => {
  it('measures the real doll meshes: head, hair, hat and face inside its head model, the body inside its lathe, each arm inside its capsule', () => {
    for (const spec of SPECS) {
      for (const g of [headGeometry(spec), faceGeometry(spec.kind)]) {
        const at = g.getAttribute('position')
        for (let i = 0; i < at.count; i++) expect(headDistance(spec.kind, at.getX(i), at.getY(i), at.getZ(i)), `${spec.name} head`).toBeLessThan(0.001)
      }
      const body = bodyGeometry(spec).getAttribute('position')
      for (let i = 0; i < body.count; i++) expect(bodyDistance(body.getX(i), body.getY(i), body.getZ(i)), `${spec.name} body`).toBeLessThan(0.001)
      const arm = armGeometry(spec).getAttribute('position')
      for (let i = 0; i < arm.count; i++) {
        const a = Math.min(HAND_REACH, Math.max(0, -arm.getY(i)))
        expect(Math.hypot(arm.getX(i), arm.getY(i) + a, arm.getZ(i)) - radiusAt(a), `${spec.name} arm`).toBeLessThan(0.001)
      }
    }
  })

  it('paints each face on top of the head, never tucked under the hair, the hat or the beanie cuff, with the features where they were', () => {
    for (const spec of SPECS) {
      const head = new THREE.Mesh(headGeometry(spec), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
      const face = faceGeometry(spec.kind)
      const at = face.getAttribute('position')
      const ray = new THREE.Raycaster()
      for (let i = 0; i < at.count; i++) {
        const v = new THREE.Vector3(at.getX(i), at.getY(i), at.getZ(i))
        const out = v.clone().normalize()
        ray.set(v, out)
        const hit = ray.intersectObject(head)[0]
        // Walking straight out from the face, the first head surface met is entered (a brim overhead), never left (hair, hat or cuff over the face).
        if (hit) expect(hit.face!.normal.dot(out), `${spec.name} face vertex ${i} under ${hit.distance.toFixed(3)}`).toBeLessThan(0)
      }
      // The atlas cell still spans the same arc: its upper edge at FACE_CELL.top, the chin at FACE_CELL.bottom.
      const uv = face.getAttribute('uv')
      for (let i = 0; i < at.count; i++) {
        const theta = Math.acos(at.getY(i) / Math.hypot(at.getX(i), at.getY(i), at.getZ(i)))
        expect(uv.getY(i)).toBeCloseTo(1 - (theta - FACE_CELL.top) / (FACE_CELL.bottom - FACE_CELL.top), 6)
      }
    }
  })

  it('turns arms and head in the same order three turns the rig', () => {
    const d = { x: 0, y: 0, z: 0 }
    for (const [side, raise, forward] of [
      [1, 0.4, 0.3],
      [-1, 2.6, -0.9],
      [1, 3.0, 1.2],
    ] as const) {
      const v = new THREE.Vector3(0, -1, 0).applyEuler(new THREE.Euler(forward, 0, side * raise))
      armDirection(side, raise, forward, d)
      expect(d.x).toBeCloseTo(v.x, 9)
      expect(d.y).toBeCloseTo(v.y, 9)
      expect(d.z).toBeCloseTo(v.z, 9)
    }
    const guard = new DollGuard('bob')
    guard.head(0.3, -0.6, 0.2)
    const local = new THREE.Vector3(0.1, HEAD_R + 0.2, 0.25)
    const world = local.clone().applyEuler(new THREE.Euler(0.3, -0.6, 0.2)).add(new THREE.Vector3(0, HEAD_Y, 0))
    expect(guard.headDistanceAt(world.x, world.y, world.z)).toBeCloseTo(headDistance('bob', local.x, local.y, local.z), 9)
  })

  it("keeps every doll's arms out of its own head, hat, pom, body and other arm through every gesture", () => {
    for (const s of [...personalitySamples(), ...pipSamples()]) {
      const g = guarded(KIND[s.doll], s.turn, s.arms)
      const gap = gaps(KIND[s.doll], g.turn, g.arms)
      const where = `${s.doll} ${s.action} ask ${s.arms.raiseL.toFixed(2)}/${s.arms.raiseR.toFixed(2)}`
      expect(gap.head, `${where} head`).toBeGreaterThan(TOUCH)
      expect(gap.body, `${where} body`).toBeGreaterThan(TOUCH)
      expect(gap.arms, `${where} arms`).toBeGreaterThan(TOUCH)
    }
  })

  it('used to let the big cheers pass through the head, hat and pom, and now eases them to the touch', () => {
    const through = new Set<string>()
    for (const s of personalitySamples()) if (gaps(KIND[s.doll], s.turn, s.arms).head < -0.02) through.add(`${s.doll} ${s.action}`)
    for (const name of ['moss arms-up-rock', 'moss big-slow-wave', 'moss big-stretch', 'bean duck-and-cover', 'bean spin-bounce', 'bean star-jumps', 'bean wave-both-arms']) {
      expect(through, name).toContain(name)
    }
  })

  it('leaves every gesture that stays below the head exactly as the doll plays it', () => {
    let untouched = 0
    for (const s of [...personalitySamples(), ...pipSamples()]) {
      if (Math.max(s.arms.raiseL, s.arms.raiseR) > 2.3) continue
      const g = guarded(KIND[s.doll], s.turn, s.arms)
      expect(g.arms.raiseL, `${s.doll} ${s.action} left`).toBe(s.arms.raiseL)
      expect(g.arms.raiseR, `${s.doll} ${s.action} right`).toBe(s.arms.raiseR)
      untouched++
    }
    expect(untouched).toBeGreaterThan(3000)
  })

  it('keeps the big cheers high and still swinging', () => {
    const range = new Map<string, { lo: number; hi: number }>()
    for (const s of personalitySamples()) {
      const g = guarded(KIND[s.doll], s.turn, s.arms)
      const key = `${s.doll} ${s.action}`
      const r = range.get(key) ?? { lo: Infinity, hi: -Infinity }
      r.lo = Math.min(r.lo, g.arms.raiseR)
      r.hi = Math.max(r.hi, g.arms.raiseR)
      range.set(key, r)
    }
    for (const name of ['moss arms-up-rock', 'moss big-stretch', 'bean spin-bounce', 'bean star-jumps']) expect(range.get(name)!.hi, name).toBeGreaterThan(2.6)
    // The waves' swing over the middle of the gesture, not just the lift into it.
    for (const doll of ['moss', 'bean'] as const) {
      const wave = PERSONALITIES[doll].cheer.find((a) => a.name === (doll === 'moss' ? 'big-slow-wave' : 'wave-both-arms'))!
      let lo = Infinity
      let hi = -Infinity
      for (let t = wave.duration * 0.35; t < wave.duration * 0.65; t += 1 / 30) {
        const pose = blankPose()
        wave.sample(t, 1.15, pose)
        const g = guarded(KIND[doll], { pitch: 0, yaw: 0, roll: 0 }, { raiseL: REST[doll] + pose.raiseL, raiseR: REST[doll] + pose.raiseR, forwardL: pose.forwardL, forwardR: pose.forwardR })
        lo = Math.min(lo, g.arms.raiseR)
        hi = Math.max(hi, g.arms.raiseR)
      }
      expect(hi - lo, `${doll} wave swing`).toBeGreaterThan(0.4)
    }
  })

  it('eases a nod or tilt back just before the face or hair would dip into the body', () => {
    for (const spec of SPECS) {
      const shells: THREE.Vector3[] = []
      for (const g of [headGeometry(spec), faceGeometry(spec.kind)]) {
        const at = g.getAttribute('position')
        for (let i = 0; i < at.count; i++) {
          const v = new THREE.Vector3(at.getX(i), at.getY(i), at.getZ(i))
          // The bare ball turns in place in its neck; only what sits outside it can swing into the body.
          if (v.length() > HEAD_R + 0.003) shells.push(v)
        }
      }
      for (const pitch of [-1, -0.5, 0, 0.5, 1]) {
        for (const roll of [-0.6, 0, 0.6]) {
          for (const yaw of [-0.9, 0, 0.9]) {
            const guard = new DollGuard(spec.kind)
            const turn = guard.turnHead(pitch, yaw, roll, { pitch: 0, roll: 0 })
            const euler = new THREE.Euler(turn.pitch, yaw, turn.roll)
            for (const v of shells) {
              const p = v.clone().applyEuler(euler)
              expect(bodyDistance(p.x, p.y + HEAD_Y, p.z), `${spec.name} ${pitch}/${yaw}/${roll}`).toBeGreaterThan(TOUCH)
            }
            if (pitch === 0 && roll === 0) expect(turn).toEqual({ pitch: 0, roll: 0 })
          }
        }
      }
    }
  }, 60_000)

  it("keeps each watcher's head, hair and hat behind the deepest block wherever he turns his head", () => {
    const back = -Math.max(...Object.values(SHAPES).map((shape) => shape.depth)) / 2
    for (const [spec, home] of [
      [MOSS, WATCHERS[0]],
      [BEAN, WATCHERS[1]],
    ] as const) {
      let reach = POM_R
      for (const g of [headGeometry(spec), faceGeometry(spec.kind)]) {
        const at = g.getAttribute('position')
        for (let i = 0; i < at.count; i++) reach = Math.max(reach, Math.hypot(at.getX(i), at.getZ(i)))
      }
      expect(home.z + reach * spec.scale, spec.name).toBeLessThan(back - 0.05)
    }
  })

  it("holds the kite spool in Pip's right hand, clear of her head wherever she looks in flight", () => {
    for (const yaw of [-0.3, 0, 0.3]) {
      for (const pitch of [-0.2, 0, 0.2]) {
        const guard = new DollGuard('bob')
        guard.turnHead(pitch, yaw, 0, { pitch: 0, roll: 0 })
        guard.beginArms()
        expect(guard.arm(1, FLY_RAISE, 0)).toBe(FLY_RAISE)
      }
    }
    const hand = handAt(1, FLY_RAISE, 0, { x: 0, y: 0, z: 0 })
    expect(Math.hypot(FLY_GRIP.x - hand.x, FLY_GRIP.y - hand.y)).toBeCloseTo(HAND_R + SPOOL_R + 0.01, 9)
    // The grip is past the fingers along the arm, above her head's middle.
    expect(FLY_GRIP.y).toBeGreaterThan(HEAD_Y)
  })
})

describe('BlockField', () => {
  const cube = SHAPES.cube.parts[0]

  it('measures from inside and outside a block, through its sides and its front and back faces, whichever way its outline winds', () => {
    for (const points of [cube, [...cube].reverse()]) {
      const field = new BlockField()
      expect(field.empty).toBe(true)
      field.add(points, 2, 0.5, 0, 1, SHAPES.cube.depth)
      expect(field.empty).toBe(false)
      expect(field.roomDistance(2, 0.5, 0)).toBeCloseTo(-0.5, 9)
      expect(field.roomDistance(3, 0.5, 0)).toBeCloseTo(0.5, 9)
      expect(field.roomDistance(2, 1.2, 0)).toBeCloseTo(0.2, 9)
      expect(field.roomDistance(2, 0.5, SHAPES.cube.depth / 2 + 0.3)).toBeCloseTo(0.3, 9)
      // Just off a corner it reads a little short, never long.
      expect(field.roomDistance(2.8, 1.4, 0)).toBeLessThanOrEqual(Math.hypot(0.3, 0.4) + 1e-9)
    }
  })

  it('turns and scales a block as it is drawn, and reads in the doll’s own frame', () => {
    const field = new BlockField()
    field.add(cube, 0, 0, Math.PI / 4, 1.1, SHAPES.cube.depth)
    // The corner of a cube turned an eighth points straight up, at half its diagonal times its scale.
    expect(field.roomDistance(0, 0.5 * Math.SQRT2 * 1.1 + 0.1, 0)).toBeGreaterThan(0.07)
    expect(field.roomDistance(0, 0.5 * Math.SQRT2 * 1.1 - 0.05, 0)).toBeLessThan(0)
    // A doll standing at x = 3: a point 3 to her left is in the middle of the block.
    field.frame.set([1, 0, 0, 3, 0, 1, 0, 0, 0, 0, 1, 0])
    expect(field.distance(-3, 0, 0)).toBeCloseTo(field.roomDistance(0, 0, 0), 9)
    field.clear()
    expect(field.empty).toBe(true)
    expect(field.roomDistance(0, 0, 0)).toBe(Infinity)
  })

  it('pushes a point out through the nearest side, or out past the front face when that is shorter', () => {
    const field = new BlockField()
    field.add(cube, 0, 0.5, 0, 1, SHAPES.cube.depth)
    const side = { x: 0.4, y: 0.5, z: 0 }
    expect(field.pushOut(side, 0.05)).toBe(true)
    expect(side).toEqual({ x: expect.closeTo(0.55, 9), y: 0.5, z: 0 })
    const front = { x: 0, y: 0.5, z: SHAPES.cube.depth / 2 - 0.02 }
    expect(field.pushOut(front, 0.05)).toBe(true)
    expect(front.x).toBe(0)
    expect(front.z).toBeCloseTo(SHAPES.cube.depth / 2 + 0.05, 9)
    const clear = { x: 1, y: 0.5, z: 0 }
    expect(field.pushOut(clear, 0.05)).toBe(false)
  })
})

describe('fitHead', () => {
  /** Wood filling everything above `ceiling`. */
  const under = (ceiling: number) => (_x: number, y: number) => ceiling - y
  const top = HEAD_Y + HEAD_R + HAIR

  function headTop(pose: HeadPose): number {
    return pose.lift + HEAD_Y * pose.squash + (HEAD_R + HAIR) * Math.max(pose.squash, 1 / Math.sqrt(pose.squash))
  }

  it('leaves the pose alone with no block over her', () => {
    const pose = { lift: 0.3, roll: 0.2, squash: 1.08 }
    fitHead(() => Infinity, 0, 0, 0, 1, pose)
    expect(pose).toEqual({ lift: 0.3, roll: 0.2, squash: 1.08 })
  })

  it('eases a spring and a stretch back together under a low board, so she still springs, just not into it', () => {
    const ceiling = top + 0.15
    const pose = { lift: 0.3, roll: 0.1, squash: 1.08 }
    fitHead(under(ceiling), 0, 0, 0, 1, pose)
    expect(headTop(pose)).toBeLessThanOrEqual(ceiling)
    expect(pose.lift).toBeGreaterThan(0.03)
    expect(pose.lift / 0.3).toBeCloseTo((pose.squash - 1) / 0.08, 1)
  })

  it('ducks under a block lower than her head, never below DUCK', () => {
    const ceiling = top - 0.15
    const pose = { lift: 0.2, roll: 0.2, squash: 1.05 }
    fitHead(under(ceiling), 0, 0, 0, 1, pose)
    expect(pose.lift).toBe(0)
    expect(pose.roll).toBe(0)
    expect(pose.squash).toBeLessThan(1)
    expect(pose.squash).toBeGreaterThanOrEqual(DUCK)
    expect(headTop(pose)).toBeLessThanOrEqual(ceiling)
    const lower = { lift: 0, roll: 0, squash: 1 }
    fitHead(under(1), 0, 0, 0, 1, lower)
    expect(lower.squash).toBeCloseTo(DUCK, 1)
    expect(lower.squash).toBeGreaterThanOrEqual(DUCK)
  })
})

describe('keepOut', () => {
  function standing(): DollPlace {
    const place = new DollPlace()
    place.set = true
    place.neck.y = NECK_Y
    place.head.y = HEAD_Y
    place.shoulderL.x = -SHOULDER.x
    place.shoulderL.y = SHOULDER.y
    place.handL.x = -SHOULDER.x - 0.1
    place.handL.y = SHOULDER.y - HAND_REACH
    place.shoulderR.x = SHOULDER.x
    place.shoulderR.y = SHOULDER.y
    place.handR.x = SHOULDER.x + 0.1
    place.handR.y = SHOULDER.y - HAND_REACH
    return place
  }

  it('drapes a string over her head and body instead of through them', () => {
    const place = standing()
    const inHead = { x: 0.1, y: HEAD_Y + 0.1, z: 0 }
    expect(keepOut(place, inHead, 0.02)).toBe(true)
    expect(Math.hypot(inHead.x, inHead.y - HEAD_Y, inHead.z)).toBeGreaterThanOrEqual(HEAD_R + HAIR + 0.02 - 1e-9)
    const inBody = { x: 0, y: 0.6, z: 0.1 }
    expect(keepOut(place, inBody, 0.02)).toBe(true)
    expect(Math.hypot(inBody.x, inBody.z)).toBeGreaterThanOrEqual(BODY_R + 0.02 - 1e-9)
    const clear = { x: 2, y: 1, z: 0 }
    expect(keepOut(place, clear, 0.02)).toBe(false)
  })

  it('does nothing before the rig has posed the doll', () => {
    const p = { x: 0, y: HEAD_Y, z: 0 }
    expect(keepOut(new DollPlace(), p, 0.02)).toBe(false)
    expect(p.y).toBe(HEAD_Y)
  })
})

describe('DollGuard.hold', () => {
  it('stops the arm before the spool in her hand meets a block the hand alone would clear', () => {
    const d = { x: 0, y: 0, z: 0 }
    armDirection(1, FLY_RAISE, 0, d)
    const hand = { x: SHOULDER.x + d.x * HAND_REACH, y: SHOULDER.y + d.y * HAND_REACH }
    const spool = { x: SHOULDER.x + d.x * GRIP_REACH, y: SHOULDER.y + d.y * GRIP_REACH }
    // A board just over the hand, low enough to catch the spool.
    const ceiling = (hand.y + HAND_R + spool.y + SPOOL_ROOM) / 2
    expect(ceiling - hand.y).toBeGreaterThan(HAND_R + 0.02)
    expect(ceiling - spool.y).toBeLessThan(SPOOL_ROOM)
    const guard = new DollGuard('bob')
    guard.head(0, 0, 0)
    guard.setObstacle((_x, y) => ceiling - y)
    guard.beginArms()
    expect(guard.arm(1, FLY_RAISE, 0), 'empty-handed').toBe(FLY_RAISE)
    guard.hold(1, GRIP_REACH, SPOOL_ROOM)
    guard.beginArms()
    const raise = guard.arm(1, FLY_RAISE, 0)
    expect(raise).toBeLessThan(FLY_RAISE)
    armDirection(1, raise, 0, d)
    expect(ceiling - (SHOULDER.y + d.y * GRIP_REACH)).toBeGreaterThanOrEqual(SPOOL_ROOM)
    guard.beginArms()
    expect(guard.arm(-1, FLY_RAISE, 0), 'the other hand is empty').toBe(FLY_RAISE)
    guard.hold(0)
    guard.beginArms()
    expect(guard.arm(1, FLY_RAISE, 0), 'let go').toBe(FLY_RAISE)
  })
})
