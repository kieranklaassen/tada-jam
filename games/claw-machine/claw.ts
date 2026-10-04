import { HINGE_DROP, JAW_REACH } from './clawBuild'
import { RAIL } from './places'

// The claw as numbers: a trolley that runs to where the finger is, a cable
// that swings against every change of the trolley's speed, and a drop that
// always ends in a catch. No renderer and no clock: it is stepped by a fixed
// amount of game time, so the same touches always play the same way.

export type ClawPhase = 'ready' | 'dropping' | 'closing' | 'rising' | 'letting-go'

export type Claw = {
  /** The trolley, and where it is headed. */
  x: number
  z: number
  vx: number
  vz: number
  targetX: number
  targetZ: number
  /** Cable out, in world units, and how fast it is running. */
  length: number
  lengthV: number
  /** Swing of the cable in radians, toward +x and toward +z. */
  swingX: number
  swingZ: number
  swingVX: number
  swingVZ: number
  /** Jaws: 0 shut, 1 wide open. `grip` is how far they stay open around what they hold. */
  open: number
  openV: number
  grip: number
  /** Seconds the jaws still stay wide open after letting something go. */
  openFor: number
  squash: number
  squashV: number
  phase: ClawPhase
  /** Seconds into the phase. */
  t: number
  /** The finger is on the glass and the trolley follows it. */
  following: boolean
  /** A tap: drop (or let go) as soon as the trolley gets there. */
  dropOnArrival: boolean
  /** How heavy the thing in the jaws is: 0 nothing, 1 a small toy, 2 a big one. */
  load: number
  /** The height the hinge of the jaws rides at, and the height the hinge drops to. */
  rideY: number
  landY: number
  /** How far the hoist has come, for the ratchet, and the length of cable it started from. */
  ratchet: number
  riseFrom: number
}

export type ClawEvent =
  | { type: 'chirp'; distance: number } // the finger landed and the trolley set off
  | { type: 'jaws' } // the jaws snapped open as it landed
  | { type: 'tick' } // a stud of travel
  | { type: 'landed'; x: number; z: number; swing: number } // the jaws reached what was straight under the trolley
  | { type: 'closed' } // the jaws shut on what the scene gave them when they landed
  | { type: 'ratchet'; progress: number } // one click of the hoist
  | { type: 'up' } // the hoist is home
  | { type: 'let-go'; x: number; z: number } // the jaws opened under a load, over this point under the trolley

export const STEP = 1 / 120
const TROLLEY_PULL = 150
const TROLLEY_DAMP = 21
const TROLLEY_TOP_SPEED = 70
/** How long the jaws stay wide after they let something go. */
const STAYS_OPEN = 0.45
/** How fast the trolley moves while the claw is still lower than it has to ride here: it stands, so that teeth beside a knob or a toy never drag through it. */
const TROLLEY_CREEP = 0
const DROP_GRAVITY = 150
const DROP_TOP_SPEED = 46
const CLOSE_SECONDS = 0.16
const LET_GO_SECONDS = 0.14
export const REST_OPEN = 0.55

export function newClaw(x = 0, z = 6, rideY = 12.5): Claw {
  return {
    x, z, vx: 0, vz: 0, targetX: x, targetZ: z,
    length: RAIL.top - rideY - HINGE_DROP, lengthV: 0,
    swingX: 0, swingZ: 0, swingVX: 0, swingVZ: 0,
    open: REST_OPEN, openV: 0, grip: 0, openFor: 0, squash: 1, squashV: 0,
    phase: 'ready', t: 0, following: false, dropOnArrival: false, load: 0, rideY, landY: 0, ratchet: 0, riseFrom: 0,
  }
}

/** Where the tips of the jaws are when the cable hangs straight: the lowest point of the claw. */
export function tipY(claw: Claw): number {
  return RAIL.top - claw.length - HINGE_DROP - JAW_REACH
}

/** Where the hub is, with the swing: what the cable ends in. */
export function hubAt(claw: Claw): { x: number; y: number; z: number } {
  const dx = Math.sin(claw.swingX), dz = Math.sin(claw.swingZ), dy = Math.cos(claw.swingX) * Math.cos(claw.swingZ)
  const n = Math.hypot(dx, dy, dz)
  return { x: claw.x + (dx / n) * claw.length, y: RAIL.top - (dy / n) * claw.length, z: claw.z + (dz / n) * claw.length }
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** The finger landed, or moved while down. The first landing snaps the jaws open and sets the trolley off. */
export function follow(claw: Claw, x: number, z: number, events: ClawEvent[]): void {
  const landing = !claw.following
  claw.following = true
  claw.dropOnArrival = false
  claw.targetX = clamp(x, RAIL.minX, RAIL.maxX)
  claw.targetZ = clamp(z, RAIL.minZ, RAIL.maxZ)
  if (!landing) return
  events.push({ type: 'chirp', distance: Math.hypot(claw.targetX - claw.x, claw.targetZ - claw.z) })
  if (claw.phase === 'ready' && claw.load === 0) { claw.open = 1; claw.openV = 4; events.push({ type: 'jaws' }) }
}

/** The finger lifted: the claw drops where it is, or lets go of what it holds. With `tap`, it first runs to where the tap was. */
export function release(claw: Claw, tap: boolean): void {
  claw.following = false
  if (tap) { claw.dropOnArrival = true; return }
  claw.targetX = claw.x; claw.targetZ = claw.z
  act(claw)
}

/** How wide knocks to the cable can swing it, as an angle: knocks that fall in step with the swing add up no further. */
const KNOCKED_MOST = 0.36

/**
 * A knock to the cable (a wag of the finger, a bell rung): it sets the claw swinging. However the knocks fall,
 * they swing it no wider than KNOCKED_MOST; only the trolley's own starts and stops swing it wider than that.
 */
export function knock(claw: Claw, vx: number, vz: number): void {
  const stiffness = 62 / (1 + 0.35 * claw.load)
  const wide = (x: number, z: number, vx: number, vz: number) => x * x + z * z + (vx * vx + vz * vz) / stiffness
  const before = wide(claw.swingX, claw.swingZ, claw.swingVX, claw.swingVZ)
  const most = Math.max(before, KNOCKED_MOST * KNOCKED_MOST)
  const nx = claw.swingVX + vx, nz = claw.swingVZ + vz
  const after = wide(claw.swingX, claw.swingZ, nx, nz)
  // Too wide: as much of the knock as brings the swing to its limit, and no more.
  const room = Math.max(0, most - claw.swingX * claw.swingX - claw.swingZ * claw.swingZ) * stiffness
  const scale = after > most ? Math.sqrt(room / Math.max(1e-9, nx * nx + nz * nz)) : 1
  claw.swingVX = nx * scale; claw.swingVZ = nz * scale
}

/** The press ended without a lift that counts (the game was parked under the finger): the claw stays as it is. */
export function letBe(claw: Claw): void {
  // A claw the finger has already let go is on its way to its drop: that move was made, and it stands.
  if (claw.dropOnArrival) return
  claw.following = false
  claw.targetX = claw.x; claw.targetZ = claw.z
}

function act(claw: Claw): void {
  if (claw.phase !== 'ready') return
  claw.dropOnArrival = false
  claw.t = 0
  claw.phase = claw.load > 0 ? 'letting-go' : 'dropping'
  claw.lengthV = 0
}

/**
 * One fixed step. `rideY` is the height the hinge should ride at here (the
 * scene raises it over tall things) and `landY` the height the hinge stops at
 * when it drops: the scene sets it so that the teeth close beside the thing
 * under the jaws, or the shut jaws just touch a thing that cannot be held.
 */
export function stepClaw(claw: Claw, rideY: number, landY: number, events: ClawEvent[], dt = STEP): void {
  claw.t += dt
  // The trolley: pulled toward its target, damped, and never faster than its motor allows. It stands still
  // while the claw is down.
  const free = claw.phase === 'ready'
  const before = { vx: claw.vx, vz: claw.vz, x: claw.x, z: claw.z }
  if (free) {
    claw.vx += ((claw.targetX - claw.x) * TROLLEY_PULL - claw.vx * TROLLEY_DAMP) * dt
    claw.vz += ((claw.targetZ - claw.z) * TROLLEY_PULL - claw.vz * TROLLEY_DAMP) * dt
    // While the hoist still has to wind up to clear what is ahead, the trolley stands: the claw lifts, then goes.
    const low = claw.length - (RAIL.top - rideY - HINGE_DROP)
    const most = low > 0.35 ? TROLLEY_CREEP : TROLLEY_TOP_SPEED
    const speed = Math.hypot(claw.vx, claw.vz)
    if (speed > most) { claw.vx *= most / speed; claw.vz *= most / speed }
  } else {
    claw.vx *= Math.max(0, 1 - 30 * dt); claw.vz *= Math.max(0, 1 - 30 * dt)
  }
  claw.x += claw.vx * dt; claw.z += claw.vz * dt
  // The ends of the rail: the trolley stops there and bounces a little. (The game rings the bell that stands there.)
  for (const side of [-1, 1] as const) {
    const end = side < 0 ? RAIL.minX : RAIL.maxX
    if ((claw.x - end) * side > 0) {
      claw.x = end
      claw.vx = -claw.vx * 0.25
    }
  }
  claw.z = clamp(claw.z, RAIL.minZ, RAIL.maxZ)
  if (Math.floor(claw.x) !== Math.floor(before.x) || Math.floor(claw.z) !== Math.floor(before.z)) events.push({ type: 'tick' })

  // The cable swings against the trolley's change of speed. A load makes it swing slower and die down later.
  const heavy = 1 + 0.35 * claw.load
  // Under a crate, the heaviest load there is, the cable hangs plumb and stays so.
  const heaviest = claw.load >= 3
  const stiffness = 62 / heavy, damping = heaviest ? 30 : 2.6 / heavy, push = heaviest ? 0 : 0.011
  const ax = clamp((claw.vx - before.vx) / dt, -2600, 2600), az = clamp((claw.vz - before.vz) / dt, -2600, 2600)
  claw.swingVX += (-stiffness * claw.swingX - damping * claw.swingVX - ax * push) * dt
  claw.swingVZ += (-stiffness * claw.swingZ - damping * claw.swingVZ - az * push) * dt
  claw.swingX = clamp(claw.swingX + claw.swingVX * dt, -0.7, 0.7)
  claw.swingZ = clamp(claw.swingZ + claw.swingVZ * dt, -0.7, 0.7)
  // A drop comes down straight under the trolley however far the cable had swung: the swing is for the eye and
  // the ear, and where the claw lands never depends on the moment the finger lifts. The cable is pulled plumb
  // as it runs out.
  if (claw.phase === 'dropping') {
    const plumb = Math.max(0, 1 - 16 * dt)
    claw.swingX *= plumb; claw.swingZ *= plumb; claw.swingVX *= plumb; claw.swingVZ *= plumb
  }

  // The jaws and the squash are springs toward where the phase wants them.
  claw.openFor = Math.max(0, claw.openFor - dt)
  const wantOpen = claw.phase === 'dropping' || claw.phase === 'letting-go' || claw.openFor > 0 ? 1 : claw.phase === 'closing' || claw.phase === 'rising' || claw.load > 0 ? claw.grip : claw.following ? 1 : REST_OPEN
  // The jaws shut without overshooting: they stop beside what they hold and never bite into it.
  claw.openV += ((wantOpen - claw.open) * 420 - claw.openV * 41) * dt
  claw.open = clamp(claw.open + claw.openV * dt, 0, 1.06)
  claw.squashV += ((1 - claw.squash) * 520 - claw.squashV * 18) * dt
  claw.squash = clamp(claw.squash + claw.squashV * dt, 0.6, 1.4)

  claw.rideY = rideY
  claw.landY = landY
  const restLength = RAIL.top - rideY - HINGE_DROP
  if (claw.phase === 'ready') {
    // Winding to the riding height, and a tap's drop once the trolley is there and nearly still.
    claw.lengthV += ((restLength - claw.length) * 140 - claw.lengthV * 22) * dt
    claw.length += claw.lengthV * dt
    // It drops only once it is over the very point: its teeth close a hair beside what they hold, and a claw
    // that came down a little to one side would close into it.
    if (claw.dropOnArrival && Math.hypot(claw.targetX - claw.x, claw.targetZ - claw.z) < 0.1 && Math.hypot(claw.vx, claw.vz) < 4) { claw.x = claw.targetX; claw.z = claw.targetZ; claw.vx = 0; claw.vz = 0; act(claw) }
  } else if (claw.phase === 'dropping') {
    claw.lengthV = Math.min(DROP_TOP_SPEED, claw.lengthV + DROP_GRAVITY * dt)
    claw.length += claw.lengthV * dt
    const bottom = Math.max(restLength, RAIL.top - landY - HINGE_DROP)
    if (claw.length >= bottom) {
      claw.length = bottom
      claw.squash = 0.72; claw.squashV = 0
      events.push({ type: 'landed', x: claw.x, z: claw.z, swing: Math.hypot(claw.swingX, claw.swingZ) })
      claw.phase = 'closing'; claw.t = 0; claw.lengthV = 0
    }
  } else if (claw.phase === 'closing') {
    if (claw.t >= CLOSE_SECONDS) {
      events.push({ type: 'closed' })
      claw.phase = 'rising'; claw.t = 0; claw.ratchet = 0; claw.riseFrom = claw.length
    }
  } else if (claw.phase === 'rising') {
    // Up through a ratchet that clicks quicker the higher it gets. A heavier catch comes up slower.
    const seconds = 0.5 + 0.22 * claw.load
    const from = claw.riseFrom
    const progress = Math.min(1, claw.t / seconds), eased = progress * progress * (3 - 2 * progress)
    claw.length = from + (restLength - from) * eased
    const clicks = Math.floor(progress * progress * (7 + 2 * claw.load))
    if (clicks > claw.ratchet) { claw.ratchet = clicks; events.push({ type: 'ratchet', progress }) }
    if (progress >= 1) { claw.phase = 'ready'; claw.t = 0; claw.lengthV = 0; events.push({ type: 'up' }) }
  } else if (claw.phase === 'letting-go') {
    if (claw.t >= LET_GO_SECONDS) {
      // What falls comes down under the trolley, wherever its swing has carried it.
      events.push({ type: 'let-go', x: claw.x, z: claw.z })
      claw.load = 0; claw.grip = 0
      // The jaws stay wide for a moment: what they let go is still between them.
      claw.openFor = STAYS_OPEN
      claw.phase = 'ready'; claw.t = 0
    }
  }
}
