import { KIND, type Kind } from './fx'
import type { Play, Vehicle } from './play'
import { LAYOUT } from './props'
import type { Beat } from './scene'
import { driedNosePatch, type DriedPatch } from './showing'
import { dabCells, tally, type Surface } from './surface'
import * as voices from './voices'

// The short scenes, each a list of timed beats on the template's Scene and
// filled in from the state of play: who is leaving and what is on it, where
// the last dab landed, which patch has dried. A beat called with 1 leaves
// everything where it was taking it, so any touch can end a scene at once.

const outCubic = (t: number): number => 1 - (1 - t) ** 3
const inQuad = (t: number): number => t * t
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const cue = (at: number, run: () => void): Beat => ({ at, lasts: 0, play: run })

/** Moves a vehicle between two spots of the floor. */
function drive(at: number, lasts: number, who: Vehicle, from: { x: number; z: number }, to: { x: number; z: number }, ease: (t: number) => number, each?: (progress: number) => void): Beat {
  return {
    at,
    lasts,
    play(progress) {
      const t = ease(progress)
      who.motion.homeX = lerp(from.x, to.x, t)
      who.motion.homeZ = lerp(from.z, to.z, t)
      each?.(progress)
    },
  }
}

/** What leads on a vehicle as it leaves, and so which exit it makes. */
type Exit = 'dried' | 'soft' | 'foam' | 'wet' | 'dull' | 'shiny'

function exitOf(surface: Surface): { lead: Exit; trail: Kind[] } {
  const t = tally(surface)
  const counts: [Exit, number, Kind][] = [['dried', t.c, KIND.crumb], ['soft', t.s + t.m, KIND.splat], ['foam', t.foam, KIND.blob], ['wet', t.w, KIND.drop], ['shiny', t.p, KIND.glint], ['dull', t.d, KIND.dust]]
  let lead = counts[0]
  for (const entry of counts) if (entry[1] > lead[1]) lead = entry
  // The trail is every state on it, in the shares it holds: the lead comes first and the others add theirs.
  const trail: Kind[] = []
  for (const [, count, kind] of counts) for (let i = 0; i < Math.round((count / Math.max(1, t.body)) * 10); i++) trail.push(kind)
  return { lead: lead[0], trail: trail.length ? trail : [KIND.dust] }
}

/**
 * The send-off and the roll-in: the ending of one wash and the beginning of
 * the next, about six seconds. The one that waits honks; the one in the bay
 * pulls back and goes, with the exit its surface gives it; the newcomer rolls
 * in and brakes; another noses up to the door.
 */
export function sendOffScene(play: Play, leaving: Vehicle, incoming: Vehicle, newcomer: Vehicle): Beat[] {
  const { lead, trail } = exitOf(leaving.surface)
  const horn = leaving.def.horn, size = leaving.def.moves.give > 1 ? 0.8 : 0.3
  const bay = LAYOUT.bay, door = LAYOUT.door, back = { x: bay.x + 0.32, z: bay.z }
  const mood = lead === 'shiny' ? 'proud' : lead === 'wet' ? 'wet' : lead === 'foam' ? 'bubbly' : lead === 'dull' ? 'plain' : 'muddy'
  let dropped = 0
  const shed = (progress: number): void => {
    // What is on it comes off behind it as it goes, and lies where it lands.
    const due = Math.floor(progress * 26)
    const m = leaving.motion
    for (; dropped < due; dropped++) {
      const kind = trail[dropped % trail.length]
      const x = m.homeX + leaving.def.side.x1 - 0.6 * play.particles.random(), y = 0.5 + play.particles.random() * 1.3, z = m.homeZ + (play.particles.random() - 0.3) * 1.2
      if (kind === KIND.glint) play.particles.emit(kind, x, y + 0.4, z + 0.6, 0, 0, 0, 0.5, 0.6)
      else if (kind === KIND.blob) {
        play.particles.emit(kind, x, y + 0.5, z, 1.5, 1.2, 0.4, 0.2, 1.6)
        play.particles.emit(KIND.bubble, x, y + 0.6, z, 0.8, 0.8, 0.3, 0.14, 1.4)
      } else play.particles.emit(kind, x, y, z, 1.2 + play.particles.random(), kind === KIND.crumb ? 0.6 : 1.4, 0.4, kind === KIND.crumb ? 0.16 : kind === KIND.dust ? 0.4 : 0.1, 1.6)
    }
  }
  return [
    cue(0, () => {
      play.say(voices.horn(incoming.def.horn.low, incoming.def.horn.high, incoming.def.horn.hold, 'call'))
      incoming.motion.kick(0, 0.7)
      leaving.motion.lookAt = { side: 1.5, up: 0.2 }
    }),
    drive(0.15, 0.6, leaving, bay, back, outCubic),
    cue(0.45, () => {
      play.say(voices.horn(horn.low, horn.high, horn.hold, mood))
      if (lead === 'wet') {
        // It shakes itself like a dog before it goes.
        play.say(voices.shake())
        leaving.motion.kick(1.5, 0.9)
        leaving.motion.kick(-1.5, 0.9)
        play.particles.burst(KIND.drop, 14, leaving.motion.homeX, 1.6, leaving.motion.homeZ + 0.9, 2.4, 1.6, 0.08, 1.0)
      }
      if (lead === 'shiny') for (const eye of leaving.def.eyes) play.particles.emit(KIND.glint, leaving.motion.homeX + eye.at[0] - 0.2, eye.at[1], leaving.motion.homeZ + eye.at[2] + 0.3, 0, 0, 0, 1.0, 0.5)
    }),
    cue(0.8, () => {
      play.say(voices.rev(size))
      leaving.motion.lookAt = null
      leaving.motion.jolt(-0.5)
    }),
    // It swings to the far side of the lane early, clear of the rack, and gathers speed.
    {
      at: 0.8,
      lasts: 2.2,
      play(progress) {
        leaving.motion.homeX = lerp(back.x, LAYOUT.exit.x, inQuad(progress))
        leaving.motion.homeZ = lerp(back.z, LAYOUT.exit.z, outCubic(Math.min(1, progress * 2.2)))
        shed(progress)
      },
    },
    cue(1.3, () => { if (lead === 'dried') play.say(voices.clods()) }),
    cue(3.0, () => { play.leaving = null }),
    cue(2.2, () => play.say(voices.rev(incoming.def.moves.give > 1 ? 0.8 : 0.3), 0.8)),
    drive(2.2, 2.2, incoming, door, bay, outCubic),
    cue(4.4, () => {
      // It brakes, its nose dips, and its mud wobbles and drips.
      play.say(voices.brake())
      incoming.motion.kick(-2, 1.3)
      const t = tally(incoming.surface)
      if (t.s + t.m) play.particles.burst(KIND.splat, 4, incoming.motion.homeX, 0.9, incoming.motion.homeZ + 0.95, 0.5, -0.2, 0.1, 1.2)
      if (t.c) play.particles.burst(KIND.crumb, 3, incoming.motion.homeX, 1.2, incoming.motion.homeZ + 0.95, 0.5, 0.2, 0.07, 1.4)
    }),
    drive(4.2, 1.8, newcomer, { x: door.x + 7, z: door.z }, door, outCubic),
    cue(6.0, () => {
      play.say(voices.brake(), 0.5)
      newcomer.motion.kick(-2, 0.8)
    }),
  ]
}

/**
 * The puddle, about three seconds: the vehicle that waits hops in, splashes
 * twice and hops back out muddier. `after` is its surface once muddied, or
 * null when the puddle has no more to add, and then it only splashes.
 */
export function puddleScene(play: Play, who: Vehicle, after: Surface | null): Beat[] {
  const door = LAYOUT.door, puddle = LAYOUT.puddle
  const inPuddle = { x: door.x - 0.1, z: puddle.z - 0.55 }
  const splash = (): void => {
    play.say(voices.splash())
    who.motion.kick(-1.5, 1.2)
    play.particles.burst(KIND.splat, 9, puddle.x, 0.15, puddle.z, 2.2, 3.0, 0.12, 1.4)
    play.particles.burst(KIND.drop, 6, puddle.x, 0.15, puddle.z, 1.8, 3.2, 0.07, 1.2)
  }
  const hop = (at: number, lasts: number, from: { x: number; z: number }, to: { x: number; z: number }, height: number): Beat =>
    drive(at, lasts, who, from, to, (t) => t, (progress) => { who.motion.hop = Math.sin(Math.min(1, progress) * Math.PI) * height })
  if (!after) {
    return [
      cue(0, () => play.say(voices.horn(who.def.horn.low, who.def.horn.high, who.def.horn.hold, 'plain'), 0.7)),
      hop(0.05, 0.4, door, door, 0.25),
      cue(0.45, splash),
    ]
  }
  return [
    cue(0, () => play.say(voices.rev(who.def.moves.give > 1 ? 0.8 : 0.3))),
    hop(0.1, 0.5, door, inPuddle, 0.55),
    cue(0.6, () => {
      splash()
      who.surface = after
    }),
    hop(0.8, 0.4, inPuddle, inPuddle, 0.35),
    cue(1.2, splash),
    cue(1.3, () => play.say(voices.horn(who.def.horn.low, who.def.horn.high, who.def.horn.hold, 'muddy'), 0.8)),
    hop(1.6, 0.6, inPuddle, door, 0.5),
    cue(2.2, () => {
      play.say(voices.brake(), 0.6)
      who.motion.kick(0, 0.9)
      play.particles.burst(KIND.splat, 5, door.x - 1.6, 0.8, door.z + 0.95, 0.6, -0.2, 0.1, 1.2)
    }),
    // A beat of rest, so the scene ends on the vehicle standing muddy at the door.
    { at: 2.2, lasts: 0.6, play: () => {} },
  ]
}

/**
 * The shine, about five seconds: a glint runs from the last dab to the far
 * end, the body rises, the lamps flash twice, its own horn, its own flourish,
 * and it settles.
 */
export function shineScene(play: Play, who: Vehicle, fromX: number): Beat[] {
  const def = who.def, m = who.motion
  const far = Math.abs(def.side.x1 - fromX) > Math.abs(def.side.x0 - fromX) ? def.side.x1 - 0.3 : def.side.x0 + 0.3
  let laid = 0
  const flash = (): void => {
    for (const eye of def.eyes) play.particles.emit(KIND.glint, m.homeX + eye.at[0] - 0.25, eye.at[1], m.homeZ + eye.at[2] + 0.3, 0, 0, 0, 1.1, 0.4)
    m.blink()
  }
  const flourish: Beat[] = def.partSpins
    ? [cue(2.5, () => m.fling(9))]
    : def.moves.partStiffness > 150 && def.partSwing > 1
      ? // A light flap rattles: four quick flings.
        [0, 1, 2, 3].map((i) => cue(2.5 + i * 0.28, () => { m.fling(14); play.say(voices.poke.ring(), 0.4) }))
      : [
          { at: 2.5, lasts: 0.7, play: (p: number) => { m.partTarget = def.partSwing * outCubic(p) } },
          { at: 3.5, lasts: 0.7, play: (p: number) => { m.partTarget = def.partSwing * (1 - inQuad(p)) } },
        ]
  return [
    {
      at: 0,
      lasts: 1.4,
      play(progress) {
        const due = Math.floor(progress * 12)
        for (; laid < due; laid++) play.particles.emit(KIND.glint, m.homeX + lerp(fromX, far, laid / 11), 1.0 + ((laid * 7) % 5) * 0.25, m.homeZ + 1.05, 0, 0, 0, 0.6, 0.6)
      },
    },
    cue(0.2, () => { m.jolt(1.6); m.lookAt = { side: 0.75, up: 0.25 } }),
    cue(1.5, flash),
    cue(1.9, flash),
    cue(2.1, () => play.say(voices.horn(def.horn.low, def.horn.high, def.horn.hold, 'proud'))),
    ...flourish,
    cue(4.6, () => {
      play.say(voices.sigh())
      m.jolt(-0.6)
      m.partTarget = 0
      m.lookAt = null
    }),
  ]
}

/** The dried patch on a vehicle's nose that a drop from the tap can reach, or null. */
export function openDriedPatch(who: Vehicle): DriedPatch | null {
  return driedNosePatch(who.def, who.surface)
}

/**
 * The drip, a first showing, about four seconds: the vehicle creeps up until
 * its dried patch is under the tap, a drop falls on it, the patch darkens to
 * soft mud and drips, the vehicle goes cross-eyed at it and shakes its nose,
 * and the mud is still there. Returns the surface with the patch softened,
 * which the save takes when the scene starts.
 */
export function dripScene(play: Play, who: Vehicle, patch: DriedPatch): { beats: Beat[]; surface: Surface } {
  const tap = LAYOUT.tap, bay = LAYOUT.bay, m = who.motion
  const under = { x: tap.x - patch.x, z: bay.z }
  const surface = who.surface.slice()
  // The drop wets the dried mud it lands on and whatever dried mud touches that patch; nothing else.
  for (const cell of dabCells(patch.col, patch.row)) if (surface[cell] === 'c') surface[cell] = 's'
  const fall = Math.sqrt((2 * Math.max(0.2, tap.y - 0.1 - patch.y - 0.2)) / 7.5)
  return {
    surface,
    beats: [
      drive(0, 0.9, who, bay, under, outCubic),
      cue(0.9, () => {
        m.lookAt = { side: 0.2, up: 0.5 }
        play.say(voices.drip())
        // The drop lives exactly as long as its fall, so it ends on the patch.
        play.particles.emit(KIND.drop, tap.x, tap.y - 0.1, tap.z, 0, 0, 0, 0.26, fall)
      }),
      cue(0.9 + fall, () => {
        who.surface = surface
        play.say(voices.poke.squelch(), 0.6)
        play.say(voices.puzzled(who.def.horn.low, who.def.horn.high))
        play.particles.burst(KIND.drop, 9, tap.x, patch.y + 0.2, m.homeZ + 0.9, 1.4, 1.6, 0.07, 0.8)
        play.particles.burst(KIND.splat, 2, tap.x, patch.y, m.homeZ + 0.98, 0.2, -0.3, 0.09, 1.3)
        m.cross = 1
        m.lookAt = { side: 0.1, up: -0.1 }
      }),
      // It stays cross-eyed at the patch for a long moment: the mud is still there.
      cue(1.5 + fall, () => { m.cross = 1 }),
      cue(2.0 + fall, () => { m.kick(-2, 0.7); m.cross = 1 }),
      cue(2.3 + fall, () => m.kick(-2, -0.7)),
      drive(2.7 + fall, 0.9, who, under, bay, outCubic),
      cue(3.6 + fall, () => { m.lookAt = null }),
    ],
  }
}
