import type { VehicleId } from './sites'
import type { Reaction } from './vehicles'

// How each vehicle moves. Pure numbers: the view turns a pose into a drawing.
// Every vehicle moves like itself, by what it is and what it carries:
// - the post van is brisk and light, and all of it is in its tower of parcels;
// - the jelly truck is slow and heavy, and everything it does shows on the jelly;
// - the piano mover is deliberate, and its piano's keys do its talking;
// - the giraffe bus is tall and sways, and its necks act for it;
// - the caterpillar bus is quick and small-footed, and its feet keep its time.
// A reaction is the vehicle's own to its ride (vehicles.ts): it never looks at
// the child, and a dislike is as good to watch as a like.

export type VehiclePose = {
  /** The body's rise, in cells. */
  bounce: number
  /** The body's tilt on its wheels, in radians, on top of the road's own slope. */
  pitch: number
  /** A creep along the road from where it stands, in cells: the want at rest. */
  creep: number
  /** Six channels for what it carries, each about 0: parcels, the jelly's wave, keys, necks, feet. What each means is that vehicle's own. */
  cargo: number[]
  /** The driver's face: -1 put out, 0 minding its business, 1 content. */
  face: number
  /** One more thing each vehicle has of its own: the van's driver out of the cab and at its tail, the jelly in the air, the piano rolled back, hats off, a hiccup. 0 to 1. */
  upset: number
}

const still = (): VehiclePose => ({ bounce: 0, pitch: 0, creep: 0, cargo: [0, 0, 0, 0, 0, 0], face: 0, upset: 0 })
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const swell = (t: number, a: number, b: number) => Math.sin(Math.PI * clamp01((t - a) / (b - a))) ** 2
const ease = (t: number, a: number, b: number) => { const u = clamp01((t - a) / (b - a)); return u * u * (3 - 2 * u) }

/** How long each vehicle's round of waiting lasts before it comes round again, in seconds: no two keep the same time. */
export const ROUND: Readonly<Record<VehicleId, number>> = { 'post-van': 5.2, 'jelly-truck': 7.4, 'piano-mover': 6.1, 'giraffe-bus': 8.3, 'caterpillar-bus': 2.9 }

/**
 * A vehicle waiting at a bank, minding its own cargo. `front` is true for the
 * one at the head of the line by the gap, which also shows the scene's want:
 * it creeps to the edge, looks down, looks across and backs up.
 */
export function waitPose(id: VehicleId, seconds: number, front: boolean, out: VehiclePose = still()): VehiclePose {
  Object.assign(out, still())
  const t = (seconds % ROUND[id]) / ROUND[id]
  if (front) out.creep = 0.45 * (ease(t, 0.05, 0.25) - ease(t, 0.7, 0.9))
  switch (id) {
    case 'post-van':
      // The tower of parcels sways, each parcel a little after the one under it; the van's nose dips as it looks down.
      for (let i = 0; i < 3; i++) out.cargo[i] = 0.05 * (i + 1) * Math.sin(2 * Math.PI * (2 * t - 0.12 * i))
      if (front) out.pitch = -0.1 * swell(t, 0.25, 0.5)
      break
    case 'jelly-truck':
      // The jelly never quite stops: a slow quiver, with a deeper wobble as the truck stops at the edge.
      out.cargo[0] = 0.04 * Math.sin(2 * Math.PI * 3 * t) + 0.12 * swell(t, 0.22, 0.42) * Math.sin(2 * Math.PI * 9 * t)
      out.bounce = -0.02 * swell(t, 0.22, 0.34)
      break
    case 'piano-mover':
      // It tunes the piano while it waits: one key at a time goes down, up the keyboard and back.
      for (let i = 0; i < 6; i++) out.cargo[i] = swell(t, 0.1 + 0.11 * i, 0.22 + 0.11 * i)
      out.face = 0.3 * swell(t, 0.76, 0.98)
      break
    case 'giraffe-bus':
      // The necks sway like reeds, out of step with one another, and one stretches to look across.
      for (let i = 0; i < 3; i++) out.cargo[i] = 0.16 * Math.sin(2 * Math.PI * (t + 0.31 * i)) + (i === 2 && front ? 0.5 * swell(t, 0.4, 0.68) : 0)
      break
    case 'caterpillar-bus':
      // It marks time on the spot: its feet fall into step and out again.
      for (let i = 0; i < 6; i++) out.cargo[i] = Math.max(0, Math.sin(2 * Math.PI * (2 * t - i * (0.08 + 0.09 * Math.sin(2 * Math.PI * seconds / 9.7)))))
      out.bounce = 0.02 * Math.abs(Math.sin(2 * Math.PI * 2 * t))
      break
  }
  return out
}

/** How far a vehicle's back wheels come off a stick it rides as a rail, as a tilt of the whole vehicle about its front axle, in radians. */
export const RAIL_TILT = 0.13

/**
 * A vehicle on the road: the same cargo, shaken by the drive. `seconds` is the
 * time on the run. `kerb` is 1 on a plank on edge: it wobbles across as on a
 * kerb, its body rocking on its wheels and hopping, and never dips under the road.
 */
export function drivePose(id: VehicleId, seconds: number, kerb = 0, out: VehiclePose = still()): VehiclePose {
  wheels(id, seconds, out)
  if (kerb > 0) {
    out.pitch -= 0.05 * kerb * Math.abs(Math.sin(seconds * 9))
    out.bounce += 0.035 * kerb * Math.abs(Math.cos(seconds * 9))
  }
  return out
}

function wheels(id: VehicleId, seconds: number, out: VehiclePose): VehiclePose {
  Object.assign(out, still())
  switch (id) {
    case 'post-van':
      out.bounce = 0.03 * Math.abs(Math.sin(seconds * 11))
      for (let i = 0; i < 3; i++) out.cargo[i] = -0.04 * (i + 1) + 0.03 * (i + 1) * Math.sin(seconds * 9 - 0.5 * i)
      break
    case 'jelly-truck':
      out.cargo[0] = 0.1 * Math.sin(seconds * 7)
      out.bounce = 0.015 * Math.sin(seconds * 5)
      break
    case 'piano-mover':
      out.bounce = 0.012 * Math.sin(seconds * 4)
      out.cargo[0] = 0.15 * Math.abs(Math.sin(seconds * 3))
      break
    case 'giraffe-bus':
      for (let i = 0; i < 3; i++) out.cargo[i] = -0.12 + 0.1 * Math.sin(seconds * 3.2 - 0.9 * i)
      out.pitch = 0.015 * Math.sin(seconds * 2.1)
      break
    case 'caterpillar-bus':
      for (let i = 0; i < 6; i++) out.cargo[i] = Math.max(0, Math.sin(seconds * 14 - i * 1.05))
      out.bounce = 0.02 * Math.abs(Math.sin(seconds * 14))
      break
  }
  return out
}

/**
 * The vehicle's reaction to its ride, at a share `t` of the way through it:
 * what its cargo and its driver do. Each vehicle has a like, a dislike and a
 * ride that is neither, and `amount` (0 to 1) says how much of it there was.
 */
export function reactPose(id: VehicleId, reaction: Reaction, t: number, out: VehiclePose = still()): VehiclePose {
  Object.assign(out, still())
  const { mood, amount } = reaction, hold = ease(t, 0.05, 0.25) - ease(t, 0.8, 1)
  out.face = mood === 'like' ? hold : mood === 'dislike' ? -hold : 0
  switch (id) {
    case 'post-van':
      if (mood === 'like') {
        // The parcels stand: the tower gives one neat hop and the driver whistles.
        for (let i = 0; i < 3; i++) out.cargo[i] = 0
        out.bounce = 0.08 * swell(t, 0.1, 0.3) + 0.05 * swell(t, 0.35, 0.5)
      } else if (mood === 'dislike') {
        // The parcels slide off the back one at a time. Then the driver gets out, walks to the tail and restacks them, and gets in again.
        const off = 1 + Math.round(2 * amount)
        for (let i = 0; i < 3; i++) if (3 - i <= off) out.cargo[i] = -1.6 * (ease(t, 0.1 + 0.12 * (2 - i), 0.3 + 0.12 * (2 - i)) - ease(t, 0.78, 0.96))
        out.upset = ease(t, 0.52, 0.68) - ease(t, 0.92, 1)
      } else for (let i = 0; i < 3; i++) out.cargo[i] = -0.12 * (i + 1) * amount * hold
      break
    case 'jelly-truck':
      if (mood === 'like') out.cargo[0] = (0.2 + 0.25 * amount) * Math.sin(2 * Math.PI * 2 * t) * hold
      else if (mood === 'dislike') {
        // The jelly jumps and lands on the cab roof, and slides back to its plate.
        out.upset = ease(t, 0.1, 0.3) - ease(t, 0.75, 0.95)
        out.cargo[0] = 0.35 * swell(t, 0.3, 0.5) * Math.sin(2 * Math.PI * 12 * t)
      } else if (reaction.act === 'driver-yawns') out.pitch = 0.05 * swell(t, 0.2, 0.7)
      else out.cargo[0] = 0.08 * Math.sin(2 * Math.PI * 10 * t) * hold
      break
    case 'piano-mover':
      if (mood === 'like') for (let i = 0; i < 6; i++) out.cargo[i] = swell(t, 0.12 + 0.03 * i, 0.3 + 0.03 * i) + swell(t, 0.45 + 0.02 * i, 0.62 + 0.02 * i)
      else if (mood === 'dislike') {
        // The piano rolls backward off its place and the mover hauls it back.
        out.upset = (0.4 + 0.6 * amount) * (ease(t, 0.08, 0.35) - ease(t, 0.6, 0.95))
        out.pitch = -0.04 * swell(t, 0.08, 0.4)
      } else out.upset = 0.15 * amount * hold
      break
    case 'giraffe-bus':
      if (mood === 'like') for (let i = 0; i < 3; i++) out.cargo[i] = 0.55 * swell(t, 0.1 + 0.08 * i, 0.9 - 0.05 * i)
      else {
        // The necks duck in a wave from the front. The hats that stay behind on a part are the saved state's to show.
        for (let i = 0; i < 3; i++) out.cargo[i] = -0.9 * swell(t, 0.08 + 0.12 * i, 0.5 + 0.12 * i)
        out.upset = ease(t, 0.15, 0.4) - ease(t, 0.85, 1)
      }
      break
    case 'caterpillar-bus':
      if (mood === 'like') for (let i = 0; i < 6; i++) out.cargo[i] = Math.max(0, Math.sin(2 * Math.PI * (6 * t - i / 6))) * hold
      else if (mood === 'dislike') {
        // It loses step: the feet fall anyhow, and it hiccups.
        for (let i = 0; i < 6; i++) out.cargo[i] = Math.max(0, Math.sin(2 * Math.PI * (5 * t * (1 + 0.37 * ((i * 5) % 3)) + 0.23 * i))) * hold
        out.upset = swell(t, 0.2, 0.3) + swell(t, 0.45, 0.55) + swell(t, 0.68, 0.78)
        out.bounce = 0.1 * out.upset
      } else for (let i = 0; i < 6; i++) out.cargo[i] = 0.5 * Math.max(0, Math.sin(2 * Math.PI * (4 * t - i / 5))) * hold
      break
  }
  return out
}

/** A vehicle touched: a start that is its own, added to whatever it was doing. `since` is the seconds since the touch. */
export function poke(id: VehicleId, since: number, pose: VehiclePose): VehiclePose {
  if (since >= 0.7) return pose
  const t = since / 0.7, jolt = Math.sin(Math.PI * t) * (1 - t)
  if (id === 'post-van') { pose.bounce += 0.14 * jolt; pose.cargo[2] += 0.2 * jolt }
  if (id === 'jelly-truck') pose.cargo[0] += 0.4 * jolt * Math.sin(t * 30)
  if (id === 'piano-mover') for (let i = 0; i < 6; i++) pose.cargo[i] = Math.max(pose.cargo[i], jolt)
  if (id === 'giraffe-bus') for (let i = 0; i < 3; i++) pose.cargo[i] += 0.5 * jolt
  if (id === 'caterpillar-bus') { pose.bounce += 0.2 * jolt; for (let i = 0; i < 6; i++) pose.cargo[i] = jolt }
  return pose
}
