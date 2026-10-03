import type { GameAudio } from './audio'
import type { Guidance } from './guidance'
import type { Gesture, Point } from './input'
import { placeOf, type Arrangement } from './arrangement'
import { HOLD_HEIGHT, Playground, type PlayEvent } from './motion'
import type { Frame } from './pose'
import { voiceOf } from './sound'
import type { Stage } from './view/stage'
import { chirp, creak, drag, knock, leap, levelHum, lift, poke, slide, thump, whoop } from './voices'
import { FRIEND_IDS, FRIENDS, PLANK, type FriendId } from './world'

// The toy: the finger, the playground and the sand, joined up. A press is
// answered when it lands; a tap sends a friend on or off the plank; a drag
// carries one; a finger in the sand leaves its mark. What the playground says
// happened becomes sound and sand here.

type Pressed = { kind: 'friend'; id: FriendId } | { kind: 'sand'; x: number; z: number } | { kind: 'other' }

/** A finger must travel this far over the sand before the groove grows, in tray units. */
const GROOVE_STEP = 0.14
/** The dry hiss of a finger in the sand sounds at most this often, in seconds. */
const HISS_EVERY = 0.09

export class Toy {
  readonly world: Playground
  private pressed: Pressed = { kind: 'other' }
  private said = 0
  private lastHiss = -1
  private lastDemo = -1
  private frameNow: Frame

  constructor(private readonly stage: Stage, private readonly audio: GameAudio, arrangement: Arrangement, seed: number) {
    this.world = new Playground(arrangement, seed)
    this.frameNow = this.world.frame()
  }

  get frame(): Frame {
    return this.frameNow
  }

  gesture(gesture: Gesture): void {
    const world = this.world
    if (gesture.type === 'press') {
      const hit = this.stage.pick(gesture.at.x, gesture.at.y, this.frameNow)
      if (hit.kind === 'friend') {
        world.touch(hit.id)
        this.pressed = { kind: 'friend', id: hit.id }
      } else if (hit.kind === 'plank') {
        world.tapPlank(hit.along)
        this.pressed = { kind: 'other' }
      } else if (hit.kind === 'sand') {
        world.pokeSand(hit.x, hit.z)
        this.pressed = { kind: 'sand', x: hit.x, z: hit.z }
      } else {
        this.audio.play(voiceOf(poke()))
        this.pressed = { kind: 'other' }
      }
      return
    }
    const pressed = this.pressed
    if (gesture.type === 'tap' && pressed.kind === 'friend') world.tapFriend(pressed.id)
    else if (gesture.type === 'dragStart' && pressed.kind === 'friend') world.grab(pressed.id)
    else if (gesture.type === 'dragMove') this.dragged(gesture.at)
    else if (gesture.type === 'dragEnd') world.release()
    if (gesture.type === 'tap' || gesture.type === 'pressEnd' || gesture.type === 'dragEnd') this.pressed = { kind: 'other' }
  }

  private dragged(at: Point): void {
    const pressed = this.pressed, world = this.world
    if (pressed.kind === 'friend' && world.held) {
      // The friend hangs with its middle under the finger.
      const over = this.stage.pointAt(at.x, at.y, HOLD_HEIGHT + FRIENDS[world.held].halfHeight)
      if (over) world.carryTo(over.x, over.z)
      return
    }
    if (pressed.kind !== 'sand') return
    const hit = this.stage.pick(at.x, at.y, this.frameNow)
    if (hit.kind !== 'sand') return
    if (Math.hypot(hit.x - pressed.x, hit.z - pressed.z) < GROOVE_STEP) return
    world.dragSand(pressed.x, pressed.z, hit.x, hit.z)
    pressed.x = hit.x
    pressed.z = hit.z
  }

  /** Plays `dt` seconds of game time, then turns what happened into sound and sand. */
  step(dt: number, guidance: Guidance): void {
    const world = this.world
    world.advance(dt)
    for (const event of world.takeEvents()) this.answer(event)
    // Idle: a warm ring in the sand under one friend who could hop on, and a wiggle each time a showing starts.
    const glowOn = guidance.glow > 0 ? this.inviting() : null
    if (guidance.demoIndex !== this.lastDemo) {
      this.lastDemo = guidance.demoIndex
      if (guidance.demoIndex >= 0 && glowOn) world.bodies[glowOn].squashV -= 4
    }
    this.frameNow = world.frame(guidance.glow, glowOn)
  }

  /** The friend the idle glow is on: the first one standing in the sand, biggest first. */
  private inviting(): FriendId | null {
    for (const id of ['bo', 'mog', 'pim', 'dot'] as const) if (placeOf(this.world.arrangement, id).at === 'sand' && this.world.bodies[id].mode === 'rest') return id
    return FRIEND_IDS.find((id) => this.world.bodies[id].mode === 'rest') ?? null
  }

  private answer(event: PlayEvent): void {
    const audio = this.audio, map = this.stage.map
    if (event.type === 'touch') audio.play(voiceOf(chirp(event.id, this.said++)))
    else if (event.type === 'leap') audio.play(voiceOf(leap(event.id)))
    else if (event.type === 'lift') audio.play(voiceOf(lift(event.id)))
    else if (event.type === 'toss') audio.play(voiceOf(whoop(event.id, event.speed)))
    else if (event.type === 'creak') audio.play(voiceOf(creak(event.strength)))
    else if (event.type === 'level') audio.play(voiceOf(levelHum()))
    else if (event.type === 'slide') audio.play(voiceOf(slide()))
    else if (event.type === 'land') {
      const spec = FRIENDS[event.id], hard = event.speed / 9
      audio.play(voiceOf(thump(spec.weight, event.on, hard)))
      if (event.on === 'sand') map.dimple(event.x, event.z, spec.radius * 0.8, Math.min(1, 0.35 + 0.16 * spec.weight))
    } else if (event.type === 'knock') {
      audio.play(voiceOf(knock(event.speed)))
      map.bite(event.x, PLANK.halfWidth, Math.min(1, event.speed / 3))
    } else if (event.type === 'poke') {
      audio.play(voiceOf(poke()))
      map.dimple(event.x, event.z, 0.24, 0.8)
    } else if (event.type === 'groove') {
      map.groove(event.x0, event.z0, event.x1, event.z1, 0.2)
      if (this.world.time - this.lastHiss >= HISS_EVERY) {
        this.lastHiss = this.world.time
        audio.play(voiceOf(drag(Math.hypot(event.x1 - event.x0, event.z1 - event.z0) / HISS_EVERY)))
      }
    }
  }
}
