import { FACES } from './faces'
import { KIND, type Kind } from './fx'
import type { Play, Vehicle } from './play'
import { LAYOUT } from './props'
import { queueSpot } from './queue'
import type { Beat } from './scene'
import { driedNosePatch, type DriedPatch } from './showing'
import { dabCells, tally, type Surface } from './surface'
import * as voices from './voices'

// The short scenes, each a list of timed beats on the template's Scene and
// filled in from the state of play: who is leaving and what is on it, where
// the last dab landed, which patch has dried. A beat called with 1 leaves
// everything where it was taking it, so any touch can end a scene at once.

/** How big a mark a tyre leaves for every stretch of floor it covers: wide enough that the line holds together while it creeps and dries. */
export const TRACK = 0.09

/** How long a plate of dried mud that has cracked off is drawn where it fell: long enough to lie in its row while the newcomer rolls in. */
const CLOD_LIES = 4.2

/** A leaving vehicle sheds what is on it as far as this, in the bay's x: the left edge of what a tablet shows of the floor. */
const SHED_TO = -4.6

/** How far past its place the head of the queue goes before it is taken round to the door: past the right edge of the widest screen. */
const AWAY = 14
/** How high the head of the queue leaps off the end of the hill. */
const LEAP = 2.4

/** How long a drop hangs and swells at the tap before it falls, in seconds. */
const SWELL = 0.4

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

/** Beats in the order they end, so a touch that ends the scene leaves each vehicle where its last beat was taking it. */
function inOrder(beats: Beat[]): Beat[] {
  return beats.map((beat, index) => ({ beat, index })).sort((a, b) => a.beat.at + a.beat.lasts - (b.beat.at + b.beat.lasts) || a.index - b.index).map((entry) => entry.beat)
}

/**
 * Moves a vehicle between two spots in a row of hops, facing the way it faces: how a toy is walked along a shelf.
 * It is in the air between the spots, so it goes sideways without its wheels turning.
 */
function hops(at: number, lasts: number, who: Vehicle, from: { x: number; z: number }, to: { x: number; z: number }, count: number, height: number, each?: (t: number) => void): Beat {
  return {
    at,
    lasts,
    play(progress) {
      const t = Math.min(1, progress)
      who.motion.homeX = lerp(from.x, to.x, t)
      who.motion.homeZ = lerp(from.z, to.z, t)
      who.motion.hop = t >= 1 ? 0 : Math.abs(Math.sin(t * Math.PI * count)) * height
      each?.(t)
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
  // Whatever is on it at all is in the trail at least once, however little of it there is.
  for (const [, count, kind] of counts) for (let i = 0; i < (count > 0 ? Math.max(1, Math.round((count / Math.max(1, t.body)) * 10)) : 0); i++) trail.push(kind)
  return { lead: lead[0], trail: trail.length ? trail : [KIND.dust] }
}

/**
 * The send-off and the roll-in: the ending of one wash and the beginning of
 * the next, about six seconds. The one that waits honks; the one in the bay
 * pulls back and goes, with the exit its surface gives it; the newcomer rolls
 * in and brakes; another noses up to the door. That other is the head of the
 * queue in the yard: it hops off the far end of the hill and comes round,
 * the one beside it hops along into its place, and the one that left hops up
 * from behind the bay into the place left free, muddy again. `arriving` is the mud the newcomer comes to the
 * door with; it wears it from when it is out of sight.
 */
export function sendOffScene(play: Play, leaving: Vehicle, incoming: Vehicle, newcomer: Vehicle, arriving: Surface, line: readonly { who: Vehicle; from: number; place: number }[]): Beat[] {
  const { lead, trail } = exitOf(leaving.surface)
  const horn = leaving.def.horn, size = leaving.def.moves.give > 1 ? 0.8 : 0.3
  const bay = LAYOUT.bay, door = LAYOUT.door, back = { x: bay.x + 0.32, z: bay.z }
  const mood = lead === 'shiny' ? 'proud' : lead === 'wet' ? 'wet' : lead === 'foam' ? 'bubbly' : lead === 'dull' ? 'plain' : 'muddy'
  // Soft mud leaves two brown tyre tracks behind it and wet paint two wet lines; whichever there is more of.
  const on = tally(leaving.surface)
  const tracks: Kind | null = on.s + on.m >= 3 && on.s + on.m >= on.w ? KIND.splat : on.w >= 3 ? KIND.drop : null
  const track = Math.max(...leaving.def.wheels.map((wheel) => wheel.z))
  let laidTo = back.x
  const lay = (): void => {
    if (tracks === null) return
    // A mark under each side's tyres for every stretch of floor covered, as far as the floor shows them.
    for (; laidTo - 0.3 >= leaving.motion.homeX && laidTo > -9; laidTo -= 0.3) {
      // A tyre lays its line down thick enough to be seen for some seconds: a single drop would be dry before the vehicle was gone.
      for (const side of [1, -1]) play.marks.push({ kind: tracks, x: laidTo, y: 0, z: leaving.motion.homeZ + side * track, size: TRACK, strength: 0.9 })
    }
  }
  let dropped = 0, glinted = 0
  const shed = (progress: number): void => {
    // What is on it comes off behind it as it goes, and lies where it lands.
    const due = Math.floor(progress * 26)
    const m = leaving.motion
    for (; dropped < due; dropped++) {
      // Only while it is in sight: what would fall past the edge of the floor is not thrown, so nothing is heard that is not seen.
      if (m.homeX + leaving.def.side.x1 < SHED_TO) continue
      const kind = trail[dropped % trail.length]
      const x = m.homeX + leaving.def.side.x1 - 0.6 * play.particles.random(), y = 0.5 + play.particles.random() * 1.3, z = m.homeZ + (play.particles.random() - 0.3) * 1.2
      if (kind === KIND.glint) play.particles.emit(kind, x, y + 0.4, z + 0.6, 0, 0, 0, 0.5, 0.6)
      else if (kind === KIND.splat) {
        // Soft mud is flung off the turning wheels, up and back.
        const wheel = leaving.def.wheels[dropped % leaving.def.wheels.length]
        play.particles.emit(kind, m.homeX + wheel.x + wheel.r * 0.6, wheel.r * 1.3, m.homeZ + (dropped % 2 ? 1 : -1) * wheel.z, 1.6 + play.particles.random() * 1.2, 1.6 + play.particles.random(), (play.particles.random() - 0.3) * 0.8, 0.1, 1.6)
      }
      else if (kind === KIND.blob) {
        play.particles.emit(kind, x, y + 0.5, z, 1.5, 1.2, 0.4, 0.2, 1.6)
        play.particles.emit(KIND.bubble, x, y + 0.6, z, 0.8, 0.8, 0.3, 0.14, 1.4)
      } else play.particles.emit(kind, x, y, z, 1.2 + play.particles.random(), kind === KIND.crumb ? 0.6 : 1.4, 0.4, kind === KIND.crumb ? 0.16 : kind === KIND.dust ? 0.4 : 0.1, kind === KIND.crumb ? CLOD_LIES : 1.6)
    }
  }
  const head = queueSpot(0), first = { x: head.x + 2.3, z: head.z }, away = { x: head.x + AWAY, z: head.z }
  const moves: Beat[] = [
    // The head of the queue takes one hop along the hill, in sight on any screen, and lands with a thump and a puff of dust, as every landing in the queue does.
    hops(0.25, 0.3, newcomer, head, first, 1, 0.5),
    cue(0.55, () => {
      play.say(voices.place.thump(), 0.5)
      play.particles.burst(KIND.dust, 3, first.x, head.ground + 0.2, head.z + 0.6, 1.0, 0.4, 0.3, 0.7)
    }),
    // Then one long leap off the far end of the hill and over the yard: it is in the air until it is out of sight on a screen of any shape, so it lands nowhere that could be seen and not heard.
    {
      at: 0.6,
      lasts: 1.2,
      play(progress) {
        const t = Math.min(1, progress), m = newcomer.motion
        m.homeX = lerp(first.x, away.x, t)
        m.ground = t >= 1 ? 0 : lerp(head.ground, 0, t)
        m.hop = t >= 1 ? 0 : Math.sin(t * Math.PI) * LEAP
      },
    },
    cue(1.9, () => {
      // Out of sight it comes down to the lane, nose ahead, in the mud it brings to the door.
      newcomer.surface = arriving
      newcomer.motion.turn = 0
      newcomer.motion.ground = 0
      newcomer.motion.hop = 0
      newcomer.motion.homeX = door.x + 7
      newcomer.motion.homeZ = door.z
    }),
  ]
  for (const { who, from, place } of line) {
    const to = queueSpot(place), m = who.motion
    const land = (at: number): Beat => cue(at, () => {
      play.say(voices.place.thump(), 0.7)
      m.kick(0, 1.2)
      m.express(FACES.boing)
      play.particles.burst(KIND.dust, 5, to.x, to.ground + 0.2, to.z + 0.6, 1.2, 0.4, 0.34, 0.8)
    })
    // A landing on the way, where the hop before the last comes down in sight on the hill: a thump and a puff there too.
    const touch = (at: number, x: number, z: number): Beat => cue(at, () => {
      play.say(voices.place.thump(), 0.5)
      play.particles.burst(KIND.dust, 3, x, to.ground + 0.2, z + 0.6, 1.0, 0.4, 0.3, 0.7)
    })
    const settle = (at: number): Beat => cue(at, () => {
      m.turn = to.turn
      m.ground = to.ground
      m.hop = 0
    })
    if (from >= 0 && from !== place) {
      // The one beside it hops along the hill into the place that came free, and lands with a thump.
      const was = queueSpot(from)
      moves.push(hops(2.0, 0.9, who, was, to, 2, 0.5, (t) => { m.turn = lerp(was.turn, to.turn, t) }), touch(2.45, (was.x + to.x) / 2, (was.z + to.z) / 2), settle(2.9), land(2.9))
    } else if (from < 0) {
      // The one that left has gone round behind the bay: it hops up onto the hill from there, muddy again and pleased with it.
      const behind = { x: to.x - 5.2, z: to.z }
      moves.push(cue(4.7, () => {
        m.turn = to.turn
        m.ground = to.ground
        m.lookAt = null
      }))
      // Three hops: the first lands out of sight behind the bay, the second on the hill where the wall ends, the third in its place.
      moves.push(hops(4.7, 1.6, who, behind, to, 3, 0.55), touch(4.7 + (1.6 * 2) / 3, lerp(behind.x, to.x, 2 / 3), to.z), settle(6.3), land(6.3))
      moves.push(cue(6.4, () => m.express(FACES.giggle)))
    }
  }
  return inOrder([
    ...moves,
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
        leaving.motion.shudder(1.4)
        leaving.motion.express(FACES.giggle)
        leaving.motion.kick(1.5, 0.9)
        leaving.motion.kick(-1.5, 0.9)
        play.particles.burst(KIND.drop, 14, leaving.motion.homeX, 1.6, leaving.motion.homeZ + 0.9, 2.4, 1.6, 0.08, 1.0)
      }
      leaving.motion.express(lead === 'shiny' ? { ...FACES.proud, seconds: 1.2 } : lead === 'dried' || lead === 'soft' ? FACES.cheeky : FACES.pleased)
      if (lead === 'shiny') for (const eye of leaving.def.eyes) play.particles.emit(KIND.glint, leaving.motion.homeX + eye.at[0] - 0.2, eye.at[1], leaving.motion.homeZ + eye.at[2] + 0.3, 0, 0, 0, 1.0, 0.5)
    }),
    // A shining one: a glint runs along it from nose to tail before it goes.
    {
      at: 0.45,
      lasts: 0.4,
      play(progress) {
        if (lead !== 'shiny') return
        const side = leaving.def.side, due = Math.floor(Math.min(1, progress) * 8)
        for (; glinted < due; glinted++) play.particles.emit(KIND.glint, leaving.motion.homeX + lerp(side.x0 + 0.3, side.x1 - 0.3, glinted / 7), 1.25 + (glinted % 2) * 0.3, leaving.motion.homeZ + 1.05, 0, 0, 0, 0.6, 0.55)
      },
    },
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
        lay()
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
      play.wobbles.push(incoming.def.id)
      incoming.motion.kick(-2, 1.3)
      incoming.motion.express(FACES.boing)
      const t = tally(incoming.surface)
      if (t.s + t.m) play.particles.burst(KIND.splat, 4, incoming.motion.homeX, 0.9, incoming.motion.homeZ + 0.95, 0.5, -0.2, 0.1, 1.2)
      if (t.c) play.particles.burst(KIND.crumb, 3, incoming.motion.homeX, 1.2, incoming.motion.homeZ + 0.95, 0.5, 0.2, 0.07, 1.4)
    }),
    drive(4.2, 1.8, newcomer, { x: door.x + 7, z: door.z }, door, outCubic),
    cue(6.0, () => {
      play.say(voices.brake(), 0.5)
      play.wobbles.push(newcomer.def.id)
      newcomer.motion.kick(-2, 0.8)
    }),
  ])
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
    who.motion.express(FACES.giggle)
    play.particles.burst(KIND.splat, 9, puddle.x, 0.15, puddle.z, 2.2, 3.0, 0.12, 1.4)
    play.particles.burst(KIND.drop, 6, puddle.x, 0.15, puddle.z, 1.8, 3.2, 0.07, 1.2)
  }
  const hop = (at: number, lasts: number, from: { x: number; z: number }, to: { x: number; z: number }, height: number): Beat =>
    drive(at, lasts, who, from, to, (t) => t, (progress) => { who.motion.hop = progress >= 1 ? 0 : Math.sin(progress * Math.PI) * height })
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
    // It rolls back out to the door on its wheels.
    drive(1.6, 0.6, who, inPuddle, door, outCubic, () => { who.motion.hop = 0 }),
    cue(2.2, () => {
      play.say(voices.brake(), 0.6)
      play.wobbles.push(who.def.id)
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
  let from: number | null = null
  const flourish: Beat[] = def.partSpins
    ? // The drum turns once, exactly: it gathers speed, slows, and stops where it started.
      // Whatever spin a touch had left on it is stopped first, and its idle rocking is still for as long as the scene runs.
      [{ at: 2.5, lasts: 1.7, play: (p: number) => { if (from === null) { m.stillPart(); from = m.turned } m.turned = from + Math.PI * 2 * (p >= 1 ? 1 : p * p * (3 - 2 * p)) } }]
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
    cue(0.2, () => { m.jolt(1.6); m.lookAt = { side: 0.75, up: 0.25 }; m.express({ ...FACES.proud, seconds: 4.2 }) }),
    cue(1.5, flash),
    cue(1.9, flash),
    cue(2.1, () => play.say(voices.horn(def.horn.low, def.horn.high, def.horn.hold, 'proud'))),
    ...flourish,
    cue(4.6, () => {
      play.say(voices.settle())
      m.jolt(-0.6)
      m.partTarget = 0
      m.lookAt = null
    }),
  ]
}

/** A surface with the dried mud on these patches turned to soft mud, and everything else as it is. */
export function softened(surface: Surface, cells: readonly number[]): Surface {
  return surface.map((patch, cell) => (patch === 'c' && cells.includes(cell) ? 's' : patch))
}

/** The dried patch on a vehicle's nose that a drop from the tap can reach, or null. */
export function openDriedPatch(who: Vehicle): DriedPatch | null {
  return driedNosePatch(who.def, who.surface)
}

/**
 * The drip, a first showing, about four seconds: the vehicle creeps up until
 * its dried patch is under the tap, a drop falls on it, the patch darkens to
 * soft mud and drips, the vehicle goes cross-eyed at it and shakes its nose,
 * and the mud is still there. Returns the patches the drop softens: the save
 * takes them when the scene starts, and the vehicle shows them when the drop
 * lands. Whatever else is on the vehicle, or lands on it meanwhile, stays.
 */
export function dripScene(play: Play, who: Vehicle, patch: DriedPatch): { beats: Beat[]; soften: number[] } {
  const tap = LAYOUT.tap, bay = LAYOUT.bay, m = who.motion
  const under = { x: tap.x - patch.x, z: bay.z }
  // The drop wets the dried mud it lands on and whatever dried mud touches that patch; nothing else.
  const soften = dabCells(patch.col, patch.row).filter((cell) => who.surface[cell] === 'c')
  const fall = Math.sqrt((2 * Math.max(0.2, tap.y - 0.1 - patch.y - 0.2)) / 7.5)
  return {
    soften,
    beats: [
      drive(0, 0.9, who, bay, under, outCubic),
      cue(0.9, () => {
        // A drop swells at the tap's mouth, where the vehicle is looking.
        m.lookAt = { side: 0.2, up: 0.5 }
        play.say(voices.drip())
        play.particles.emit(KIND.bead, tap.x, tap.y - 0.17, tap.z, 0, 0, 0, 0.26, SWELL)
      }),
      // Then it lets go. The drop lives exactly as long as its fall, so it ends on the patch.
      cue(0.9 + SWELL, () => play.particles.emit(KIND.drop, tap.x, tap.y - 0.17, tap.z, 0, 0, 0, 0.26, fall)),
      cue(0.9 + SWELL + fall, () => {
        who.surface = softened(who.surface, soften)
        play.say(voices.poke.squelch(), 0.6)
        play.say(voices.puzzled(who.def.horn.low, who.def.horn.high))
        m.express({ ...FACES.puzzled, seconds: 2.4 })
        play.particles.burst(KIND.drop, 9, tap.x, patch.y + 0.2, m.homeZ + 0.9, 1.4, 1.6, 0.07, 0.8)
        play.particles.burst(KIND.splat, 2, tap.x, patch.y, m.homeZ + 0.98, 0.2, -0.3, 0.09, 1.3)
        m.cross = 1
        m.lookAt = { side: 0.1, up: -0.1 }
      }),
      // It stays cross-eyed at the patch for a long moment: the mud is still there.
      cue(1.4 + SWELL + fall, () => { m.cross = 1 }),
      cue(1.8 + SWELL + fall, () => { m.kick(-2, 0.7); m.cross = 1 }),
      cue(2.1 + SWELL + fall, () => m.kick(-2, -0.7)),
      drive(2.4 + SWELL + fall, 0.9, who, under, bay, outCubic),
      cue(3.3 + SWELL + fall, () => { m.lookAt = null }),
    ],
  }
}
