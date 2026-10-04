import { BODIES, type KindName } from './bodies'
import { clip, hold, hump, PERSONALITIES, ramp, rest, stride, walk, type ClipId } from './clips'
import { handPose, type Guidance, type HandPose } from './guidance'
import { BALLOON, bunchOffsets, bunchReach, CLOUDS, FAR_HILL, farGroundAt, FRIEND_GAP, FRIEND_SCALE, friendX, GROUND, groundAt, GROWN_UP_CORNER, HELD_HEIGHT, PARADE_SCALE, paradeSpot, seenAt, skySlots, viewFor, WAITING_SCALE, waitingSpot, type View } from './layout'
import { KIND_COLOURS, PALETTE, shade } from './palette'
import { copyPose, forwardOf, mirror, REST, restPose, spread, type Pose } from './pose'
import { LADDER } from './config'
import type { VoiceId } from './voices'
import { callNext, popHeld, sendBunch } from './play'
import { PARADE_LENGTH, type Marched, type Save } from './save'
import { Scene, sceneLength, type Beat } from './scene'
import { markShown, showingAtStart, type Showing } from './showings'
import type { Bunch, Given, Troop } from './world'

// The theatre plays what the rules decide. A touch is answered here the
// moment it lands (a squash and a squeak), the rules say at the lift what the
// bunch does (taken, refused or got away), and the theatre then shows it: the
// swoop, the friend's own catch or refusal or lift-off, the pop. It holds no
// rule of its own and draws nothing itself: each frame it tells a painter
// where every friend, balloon, string and shadow is, and hands back the
// sounds to play. No three.js, no DOM and no clock: time is passed in, and its
// small variations come from its own seeded stream.

/** What the theatre draws on: the stage, or a recorder in a test. */
export type Painter = {
  place(name: string, kind: KindName, pose: Pose): void
  drop(name: string): void
  balloon(x: number, y: number, z: number, wide: number, tall: number, lean: number, colour: string, glow?: number): void
  marcher(kind: KindName, x: number, y: number, z: number, scale: number, turn: number, lean: number): void
  hand(x: number, y: number, size: number, press: number): void
  cloud(index: number, squash: number): void
  string(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, colour: string, thick?: number): void
  shadow(x: number, y: number, z: number, wide: number, deep: number, colour: string): void
}

/** A sound to play: `after` is seconds from now, for a run of catches or one landing after another, and `pace` is how fast its parts follow each other, for a motion played faster than it was written. */
export type Sound = { voice: VoiceId; pitch: number; gain: number; after: number; pace: number }

/** What a point of the surface is on. */
export type Hit = { on: 'held'; friend: number } | { on: 'tug'; friend: number } | { on: 'bunch'; slot: number } | { on: 'friend'; friend: number } | { on: 'waiting' } | { on: 'cloud'; index: number } | { on: 'parade'; troop: number } | { on: 'farHill' } | { on: 'hill' } | { on: 'air' }

/** A bunch's place in the sky and its springs: how flat it is, how far it is pushed aside, how far the loose end of its string has whipped, and how long until it is back. */
type Place = { squash: number; squashSpeed: number; pressed: boolean; push: number; pushSpeed: number; whip: number; whipSpeed: number; away: number; grow: number }
type Flight = { bunch: Bunch; slot: number; given: Given; t: number; fromX: number; fromY: number; landed: boolean; after: number; friend: number; met?: boolean }
/** A balloon in a friend's hand. `bonk` is how long it is still on its way round to the friend's head, knocked by a refusal. */
type Held = { x: number; y: number; vx: number; vy: number; shown: boolean; bonk?: number }
/** A balloon that has got away. `flat` is one blown off going flat; `bump` is one that is heading for the cloud over the troop and has not met it yet. */
type Loose = { x: number; y: number; vx: number; vy: number; colour: string; flat: boolean; t: number; popAt: number; bump?: boolean }
type Scrap = { x: number; y: number; vx: number; vy: number; colour: string; life: number }
/** A drop of water from a cloud, and a dimple in the hill where it was touched. */
type Drop = { x: number; y: number; vx: number; vy: number; life: number }
type Dimple = { x: number; t: number }
/** `tug` is the bunch that carries a friend off, `hang` where its balloons hang from the friend and `second` whether the friend already held a balloon, both as they were when it took hold, `bumps` says that bunch is bigger than the whole troop and goes out by way of the cloud, `landAfter` is how much longer than its neighbour it hangs in the air before it comes down, when a whole troop was carried off, `fall` is the height it was at when a motion was cut short in the air and `fallT` how long it has been falling from there, `mirrored` has it refuse towards its other side, where the bunch hangs, `brisk` has the part of a refusal after it lands played faster, `speed` is how fast this playing of a motion runs, and `lastPoke` is which way it last took a poke. */
type Actor = { clip: ClipId | null; t: number; next: ClipId | null; tug: Bunch | null; hang?: { x: number; y: number }[]; second?: boolean; fall?: number; fallT?: number; bumps?: boolean; landAfter: number; mirrored?: boolean; brisk?: boolean; speed?: number; lastPoke?: ClipId }

/** A troop that is only passing: one that marches off, or one that crosses to show a new idea. Short-lived, and no part of the save. */
type Passing = { kind: KindName; size: number; held: boolean[]; actors: Actor[] }

/** How long a troop that passes by takes to cross, in seconds (the sheet: 4 to 6). */
export const PASS_BY = { shortest: 4, longest: 6 } as const

/** How long an ending may last, in seconds (the sheet: 5 to 7). */
export const ENDING = { shortest: 5, longest: 7 } as const

/** The side of the grown-up's corner, in logical pixels (`CORNER` in overlay.ts). */

/** How long before a bunch of another colour arrives the friend begins to refuse it, in seconds. */
const REFUSAL_LEAD = 0.12
/** The least a bunch of another colour hangs beside the friend before the refusal lands on it, in seconds: the beat in which the two colours are seen side by side. Every kind's refusal lands later than this after the bunch arrives, at the quickest it is ever played; a test holds it. */
export const SIDE_BY_SIDE = 0.3

/** Seconds a bunch takes from the sky to the friend, and before a new one drifts into its place. */
/**
 * The way over the far hill, from its middle: from the foot of its near side, where the near hill still hides it,
 * to the foot of its far side, to the left of the ring the parade walks by more than a friend's width. And how far
 * behind the one in front each friend of the troop follows, as a part of the way.
 */
const OVER_PATH = { x: -7.6, across: 0.8, z: 4.6, deep: 9, dip: 2.4 } as const
const OVER_LAG = 0.2
/** Seconds the oldest troop takes down from the far hill's ring and out of sight; and seconds the newest takes up to its place, once the oldest has gone and it has itself left by the edge in front. */
const RETIRES_IN = 1.3
const JOINS_IN = 1.2
/** Seconds a friend takes to fall to the ground when a motion that had it in the air is cut short by another. */
const FALLS_IN = 0.2
/** How much later each friend of a troop that was carried off comes down than the one before it, in seconds. */
const LAND_APART = 0.15
/** Seconds a held balloon takes to swing round onto its friend's head when a refusal knocks it. */
const BONK = 0.3
/** Seconds a troop on the far hill is in the air when it jumps at a touch. */
const FAR_JUMP = 0.45
/** The quickest a motion that a touch starts is ever played: no two playings run at quite the same speed. */
const QUICKEST = 1.07
/** How much higher than the rest a balloon with nobody under it hangs, in a bunch that is too many: clear of what the friends beside it hold. */
const SPARE_HIGHER = 0.6
/** How fast a balloon that got away darts at the cloud over the troop, in units a second. */
const BUMP_SPEED = 9
/** Seconds a troop that passed takes over the shoulder of the far hill, at its own pace. */
const OVER_HILL = 1.1
/** How many straight pieces a frog's bowed tongue is drawn in. */
const TONGUE_PIECES = 4
export const FLIGHT = 0.5
export const REGROW_AFTER = 0.45
const GROW = 0.5
/** How long a pop's scraps and a flat balloon last. */
const SCRAP_LIFE = 0.5
/** What a frame may hold of each passing thing, so the most a child can set off at once still fits the stage's batches. */
const MAX_FLIGHTS = 4
const MAX_LOOSE = 9
const MAX_SCRAPS = 21

export class Theatre {
  /** The game as it is saved. Every touch that changes it changes it here, whole, before anything is seen to move. */
  save: Save
  /** What the save needs since it was last handed to storage: 0 nothing, 1 the outcome of a tap, 2 a cycle's end or a scene's start. The Mount saves either at once and sets it back. */
  unsaved: 0 | 1 | 2 = 0
  /** Sounds since the last time they were taken. */
  readonly sounds: Sound[] = []
  private time = 0
  private rng: number
  private places: Place[] = []
  private readonly flights: Flight[] = []
  private held: Held[] = []
  private readonly loose: Loose[] = []
  private readonly scraps: Scrap[] = []
  private actors: Actor[] = []
  private readonly waitingActor: Actor = { clip: null, t: 0, next: null, tug: null, landAfter: 0 }
  private pressedSlot = -1
  private readonly pose: Pose = restPose()
  private readonly hand = { x: 0, y: 0, z: 0 }
  private slotsFor = 0
  private slotsAt: { x: number; y: number }[] = []
  /** The short scene that is playing, and which one. */
  private scene: Scene | null = null
  private sceneKind: 'ending' | 'arrival' | null = null
  /** True while a touch is ending a scene: its beats land where they were going without playing their sounds or starting a motion. */
  private finishing = false
  /** An ending waits for the catch that causes it to be over. */
  private endingDue: { at: number; order: number[]; together: boolean } | null = null
  /** The arrival: the served troop marching off, a troop passing by to show a new idea, the next troop walking in, the one after coming to the edge. */
  private leaving: Passing | null = null
  private leaveU = 0
  private passer: (Passing & { idea: Showing['idea'] }) | null = null
  private passIn = 0
  private passOut = 0
  private passTook = false
  /** Where the balloons of a bunch that carries a friend off hang, from that friend: written by `hung`, and made once. */
  private readonly hangs = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]
  /**
   * The far hill's ring has a place for each troop, and a troop keeps its place for as long as it is there: `turned`
   * is how many have left since this visit began, so the troop at `parade[t]` stands at place `t + turned`.
   * `retiring` is the oldest of five on its way down from its place and out of sight, `u` of the way; `joining`
   * is how far the newest has come up to its place, 1 when it is there.
   */
  private turned = 0
  private retiring: { troop: Marched; place: number; u: number } | null = null
  private joining = 1
  /** When each troop on the far hill last began a jump, as an answer to a touch. */
  private readonly hopAt = [-9, -9, -9, -9]
  /** The troop that passed, on its way over the far hill, and how far over it is. */
  private over: Passing | null = null
  private overU = 0
  private walkIn = 1
  private nextIn = 1
  private skyIn = true
  /** At the opening of a new game the child's troop comes in from beyond the edge, so it is not seen until it walks. */
  private fromBeyond = false
  /** The friends who hold a balloon, in the order they came by it. Short-lived: as the game is found, those who hold one stand in it in the order they stand. */
  private took: number[] = []
  /** The other friends look at a friend whose balloon was popped, until this time. */
  private lookAt = { friend: -1, until: 0 }
  /** The clock the troop's breathing and swaying run on: it stands still while the troop looks at an empty hand. */
  private sway = 0
  /** The scenery answers too: each cloud is a pillow that squashes and sheds drops, and the hill is an air bed that wobbles. */
  private readonly clouds = CLOUDS.map(() => ({ squash: 1, speed: 0 }))
  private readonly drops: Drop[] = []
  private readonly dimples: Dimple[] = []
  private wobbled = -10
  /** When the cloud over the troop is bumped by balloons that got away, and until when the troop blinks under its drops. */
  private flinchUntil = -1
  private readonly far = { x: 0, y: 0, z: 0, turn: 0 }
  private readonly seen = { x: 0, y: 0, scale: 1 }
  private readonly ghost: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** The view of the last frame painted, for what happens between frames and needs to know where a cloud is seen. */
  private lastView: View = viewFor(1180, 820)

  /** `seed` is for the theatre's own small variations (a pitch, where a scrap flies); it lays out nothing. */
  constructor(save: Save, seed = 0x9e3779b9) {
    this.save = save
    this.rng = seed >>> 0 || 1
    this.setTheStage()
    // A new game that nobody has touched opens with the first showing already crossing. Its mark is in the save before it moves.
    const untouched = !save.finished && save.slips === 0 && save.parade.length === 0 && save.troop.held.every((holds) => !holds)
    const showing = untouched ? showingAtStart(save) : null
    if (showing) {
      this.save = { ...save, shown: markShown(save.shown, showing.marks) }
      this.arrive(null, showing)
    }
  }

  /** Which short scene is playing, if one is. A scene playing is not idleness. */
  get playing(): 'ending' | 'arrival' | null {
    return this.scene?.running ? this.sceneKind : null
  }

  get troop(): Troop { return this.save.troop }
  get sky(): readonly Bunch[] { return this.save.sky }
  get waiting(): { kind: KindName; size: number } { return this.save.next }

  /** Everything in its place for the troop and the sky of the save, as found: nothing in the air, nobody in the middle of anything. */
  private setTheStage(): void {
    const troop = this.save.troop
    this.places = this.save.sky.map(() => ({ squash: 0, squashSpeed: 0, pressed: false, push: 0, pushSpeed: 0, whip: 0, whipSpeed: 0, away: 0, grow: 1 }))
    this.held = troop.held.map((holds, i) => ({ x: friendX(i, troop.size) + 0.7, y: GROUND + HELD_HEIGHT, vx: 0, vy: 0, shown: holds }))
    this.actors = troop.held.map(() => ({ clip: null, t: 0, next: null, tug: null, landAfter: 0 }))
    this.took = troop.held.map((holds, i) => (holds ? i : -1)).filter((i) => i >= 0)
    this.flights.length = 0
    this.slotsFor = 0
    this.pressedSlot = -1
  }

  /** The places in the sky for this view, worked out once for each width. */
  private slots(view: View): { x: number; y: number }[] {
    if (this.slotsFor !== view.width + view.balloon * 1000) {
      // The largest bunch in this sky decides how near the top right corner the last place may be.
      this.slotsAt = skySlots(this.sky.length, view, Math.max(1, ...this.sky.map((bunch) => bunch.count)))
      this.slotsFor = view.width + view.balloon * 1000
    }
    return this.slotsAt
  }

  /** The friend's feet. */
  private spot(friend: number): { x: number; y: number } {
    const x = friendX(friend, this.troop.size)
    return { x, y: groundAt(x, 0) }
  }

  private random(): number {
    let s = this.rng
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    this.rng = s >>> 0
    return this.rng / 2 ** 32
  }

  private sound(voice: VoiceId, pitch = 1, gain = 1, after = 0, pace = 1): void {
    // Never quite the same twice: a few per cent either way.
    this.sounds.push({ voice, pitch: pitch * (0.95 + this.random() * 0.1), gain, after, pace })
  }

  /** What is under a point of the friends' plane. Whatever looks touchable is, and is read a little larger than it is drawn. */
  hit(x: number, y: number, view: View): Hit {
    for (let i = 0; i < this.held.length; i++) {
      const balloon = this.held[i]
      if (balloon.shown && Math.hypot(x - balloon.x, (y - balloon.y) / 1.12) < BALLOON * 1.2 * view.balloon) return { on: 'held', friend: i }
    }
    const slots = this.slots(view)
    for (let slot = 0; slot < slots.length; slot++) {
      if (this.places[slot].away > 0) continue
      const reach = bunchReach(this.sky[slot].count)
      if (Math.abs(x - slots[slot].x) < reach.x * view.balloon + 0.3 && Math.abs(y - slots[slot].y) < reach.y * view.balloon + 0.3) return { on: 'bunch', slot }
    }
    // The bunch that is carrying a friend off is in its hand too, for as long as it has hold. Where it has risen in
    // front of a bunch in the sky, the touch is the sky's: sending a balloon is the thing the child came to do.
    for (let i = 0; i < this.actors.length; i++) {
      const actor = this.actors[i]
      if (actor.clip !== 'liftOff' || !actor.tug) continue
      const spot = this.spot(i), top = spot.y + this.lift(this.troop.kind, actor.t) + HELD_HEIGHT + 0.5, hung = this.hung(i, actor.tug)
      for (let k = 0; k < actor.tug.count; k++) if (Math.hypot(x - spot.x - hung[k].x, (y - top - hung[k].y) / 1.12) < BALLOON * 1.2) return { on: 'tug', friend: i }
    }
    const kind = this.troop.kind, plan = BODIES[kind]
    for (let i = 0; i < this.troop.size; i++) {
      const spot = this.spot(i), tall = plan.height * FRIEND_SCALE
      if (Math.abs(x - spot.x) < plan.halfWidth * FRIEND_SCALE && y > spot.y - 0.2 && y < spot.y + tall + 0.25) return { on: 'friend', friend: i }
    }
    const first = waitingSpot(0, view), far = view.distance / (view.distance - first.z)
    const waitingPlan = BODIES[this.waiting.kind], wide = waitingPlan.halfWidth * FRIEND_SCALE * WAITING_SCALE * far
    const footY = groundAt(first.x, first.z) * far
    if (x < first.x * far + wide + 0.35 && y > footY - 0.3 && y < footY + waitingPlan.height * FRIEND_SCALE * WAITING_SCALE * far + 0.35) return { on: 'waiting' }
    for (let index = 0; index < CLOUDS.length; index++) {
      const cloud = CLOUDS[index], at = seenAt(cloud.x, cloud.y, cloud.z, view, this.seen)
      if (Math.abs(x - at.x) < 2.5 * cloud.scale * at.scale && Math.abs(y - at.y) < 0.95 * cloud.scale * at.scale) return { on: 'cloud', index }
    }
    // Below the friends' feet there is only the hill.
    if (y < groundAt(x, 0) - 0.25) return { on: 'hill' }
    // Above it, far off: a troop that goes round the far hill, with its balloons, or the far hill itself.
    // One that is still on its way up to the ring is not yet there to be touched.
    const parade = this.save.parade, arrived = this.leaving || this.joining < 1 ? parade.length - 1 : parade.length
    for (let t = 0; t < arrived; t++) {
      const body = BODIES[parade[t].kind]
      for (let m = 0; m < parade[t].size; m++) {
        const spot = paradeSpot(t + this.turned, m, this.time, this.far), at = seenAt(spot.x, spot.y, spot.z, view, this.seen), size = at.scale * PARADE_SCALE
        if (Math.abs(x - at.x) < body.halfWidth * FRIEND_SCALE * size + 0.3 && y > at.y - 0.3 && y < at.y + (HELD_HEIGHT + BALLOON) * size + 0.3) return { on: 'parade', troop: t }
      }
    }
    const back = view.distance / (view.distance - FAR_HILL.z)
    if (y / back < farGroundAt(x / back, FAR_HILL.z)) return { on: 'farHill' }
    // A near miss still counts: a small finger aimed at a bunch and landed beside it.
    let nearest = -1, nearestGap = 0.9
    for (let slot = 0; slot < slots.length; slot++) {
      if (this.places[slot].away > 0) continue
      const reach = bunchReach(this.sky[slot].count)
      const gap = Math.hypot(Math.max(0, Math.abs(x - slots[slot].x) - reach.x * view.balloon), Math.max(0, Math.abs(y - slots[slot].y) - reach.y * view.balloon))
      if (gap < nearestGap) { nearest = slot; nearestGap = gap }
    }
    return nearest >= 0 ? { on: 'bunch', slot: nearest } : { on: 'air' }
  }

  /** The finger landed. Everything is answered here, in this frame: a squash and a squeak, a pop, a poke. */
  press(x: number, y: number, view: View): void {
    this.pressedSlot = -1
    // The top right corner is the grown-up's: three quick taps there open the frame-rate overlay, and nothing of the game answers a touch in it.
    if (x > view.width / 2 - GROWN_UP_CORNER / view.pixelsPerUnit && y > view.height / 2 - GROWN_UP_CORNER / view.pixelsPerUnit) return
    // A touch ends a scene, and is then an ordinary touch.
    this.endScene()
    const hit = this.hit(x, y, view)
    this.pressedSlot = -1
    if (hit.on === 'bunch') {
      const place = this.places[hit.slot]
      place.pressed = true
      place.squashSpeed += 4
      // Its string whips: the loose end is flung to one side and lashes back.
      place.whipSpeed += hit.slot % 2 === 0 ? 7 : -7
      this.pressedSlot = hit.slot
      // Its neighbours bob away from it.
      for (let slot = 0; slot < this.places.length; slot++) if (slot !== hit.slot) this.places[slot].pushSpeed += Math.sign(slot - hit.slot) * 2.2 / Math.abs(slot - hit.slot)
      // More balloons under the finger squeak lower.
      this.sound('squeak', 1.12 - this.sky[hit.slot].count * 0.1)
    } else if (hit.on === 'held') {
      this.popHeld(hit.friend)
    } else if (hit.on === 'tug') {
      // A tap on a balloon a friend holds pops it at once, and the bunch that is carrying it off is one: the whole
      // bunch goes, one pop after another, and the friend comes down from where it is. Nothing of the troop's own
      // changes, so nothing is saved: that bunch had already got away.
      const actor = this.actors[hit.friend], spot = this.spot(hit.friend), kind = this.troop.kind
      const tug = actor.tug!, top = spot.y + this.lift(kind, actor.t) + HELD_HEIGHT + 0.5, hung = this.hung(hit.friend, tug)
      for (let k = 0; k < tug.count; k++) this.burst(spot.x + hung[k].x, top + hung[k].y, KIND_COLOURS[tug.colour])
      this.sound(`${kind}Startle`, 1.1, 0.8)
      actor.tug = null
      actor.bumps = false
      // It falls from the height it has reached: the lift-off goes on from the moment of its fall at which it is that high.
      const { letGo, land } = PERSONALITIES[kind].cue, high = this.lift(kind, actor.t)
      if (actor.t < letGo) {
        let from = letGo
        while (from < land && this.lift(kind, from) > high) from += 1 / 120
        actor.t = from
      }
    } else if (hit.on === 'friend') {
      this.act(hit.friend, 'poke')
      this.sound(`${this.troop.kind}Poke`)
      const balloon = this.held[hit.friend]
      if (balloon.shown) {
        // The balloon it holds bobs along on its string, which hums like a plucked rubber band.
        balloon.vy += 2.6
        balloon.vx += 1.2
        this.sound('stringHum', 1, 0.8, 0.05)
      }
    } else if (hit.on === 'waiting') {
      this.sound(`${this.waiting.kind}Poke`, 1.1, 0.7)
      this.callNext()
    } else if (hit.on === 'cloud') {
      this.shed(hit.index, view)
    } else if (hit.on === 'parade' || hit.on === 'farHill') {
      // Far off, so small and quiet: a troop that is touched squeaks in its kind's voice and jumps, and the others
      // on the far hill jump after it; the far hill itself answers like the near one, and everyone on it jumps.
      const parade = this.save.parade
      if (hit.on === 'parade') this.sound(`${parade[hit.troop].kind}Poke`, 1.45, 0.4)
      else this.sound('hillBoing', 1.5, 0.45)
      for (let t = 0; t < this.hopAt.length; t++) this.hopAt[t] = this.time + (hit.on === 'parade' ? (t === hit.troop ? 0 : 0.14) : t * 0.07)
      // The sky answers too, as it does to a touch on the air, so that an empty far hill is never a dead place.
      const slots = this.slots(view)
      for (let slot = 0; slot < slots.length; slot++) this.places[slot].pushSpeed += Math.sign(slots[slot].x - x || 1) * 0.8 / (1 + Math.abs(slots[slot].x - x))
    } else if (hit.on === 'hill') {
      // The hill is an air bed: a dimple where the finger is, and a wobble that everyone on it rides.
      this.sound('hillBoing', 0.9 + this.random() * 0.2)
      this.wobbled = this.time
      if (this.dimples.length >= 3) this.dimples.shift()
      this.dimples.push({ x, t: 0 })
    } else {
      this.sound('boop')
      const slots = this.slots(view)
      for (let slot = 0; slot < slots.length; slot++) this.places[slot].pushSpeed += Math.sign(slots[slot].x - x || 1) * 1.6 / (1 + Math.abs(slots[slot].x - x))
    }
  }

  /** The finger lifted or slid off: the bunch under it leaves the sky. A smeared tap counts as a tap. */
  release(view: View): void {
    const slot = this.pressedSlot
    this.pressedSlot = -1
    if (slot < 0) return
    const place = this.places[slot]
    place.pressed = false
    if (place.away > 0) return
    // Tapping a balloon always works. When as many bunches are in the air as the sky can show, the one that has
    // been there longest gets its answer at once and makes room.
    if (this.flights.length >= MAX_FLIGHTS) {
      const oldest = this.flights[0]
      if (!oldest.landed) this.land(oldest)
      this.settle(oldest, PERSONALITIES[this.troop.kind].cue, true)
      this.flights.shift()
    }
    const bunch = this.sky[slot]
    // The rules decide here, at the lift, and the save holds the outcome before the bunch has left the sky.
    const { save, events } = sendBunch(this.save, slot)
    this.save = save
    const first = events[0]
    if (!first) return
    const serves = events.find((event) => event.type === 'served')
    this.unsaved = serves ? 2 : Math.max(this.unsaved, 1) as 1 | 2
    if (first.type === 'taken') this.took.push(...first.takers)
    const given: Given = first.type === 'taken' ? { result: 'taken', takers: first.takers, served: serves !== undefined }
      : first.type === 'gotAway' ? { result: 'gotAway', grabber: first.grabber, spare: first.spare }
      : { result: 'refused' }
    const at = this.slots(view)[slot]
    // When every friend has one, the nearest friend is the one who grabs a bunch that is too many.
    const everyoneHolds = given.result === 'gotAway' && given.spare === bunch.count
    const friend = given.result === 'taken' ? given.takers[0] : given.result === 'gotAway' ? (everyoneHolds ? this.nearest(at.x, false) : given.grabber) : this.nearest(at.x, true)
    this.flights.push({ bunch, slot, given, t: 0, fromX: at.x, fromY: at.y, landed: false, after: 0, friend })
    // The ending follows the catch that causes it: when the last balloon is in a hand and the catch is over.
    if (serves && serves.type === 'served') this.endingDue = { at: this.time + FLIGHT + PERSONALITIES[this.troop.kind].lasts.catch * 0.7, order: [...this.took], together: serves.together }
    // The same bunch drifts back into the same place: the sky stays as it was.
    place.away = REGROW_AFTER
    place.grow = 0
    place.squash = 0
    place.squashSpeed = 0
    this.sound('letGo', 1.1 - bunch.count * 0.08)
    this.sound('whistle', 1, 0.8)
  }

  /** The press ended without a tap: the surface was parked or the browser took the finger. The bunch springs back and stays. */
  cancel(): void {
    if (this.pressedSlot >= 0) this.places[this.pressedSlot].pressed = false
    this.pressedSlot = -1
  }

  /** The friend nearest to `x`. With `wanting`, the nearest of those still without a balloon when there is one: it is the one looking for a balloon. */
  private nearest(x: number, wanting: boolean): number {
    let best = -1
    for (const only of wanting ? [true, false] : [false]) {
      for (let i = 0; i < this.troop.size; i++) {
        if (only && this.troop.held[i]) continue
        if (best < 0 || Math.abs(this.spot(i).x - x) < Math.abs(this.spot(best).x - x)) best = i
      }
      if (best >= 0) break
    }
    return best
  }

  private popHeld(friend: number): void {
    const { save, events } = popHeld(this.save, friend)
    if (events.length === 0) return
    this.save = save
    this.unsaved = Math.max(this.unsaved, 1) as 1 | 2
    const troop = save.troop
    this.took = this.took.filter((i) => i !== friend)
    const balloon = this.held[friend]
    balloon.shown = false
    this.burst(balloon.x, balloon.y, KIND_COLOURS[troop.kind])
    this.act(friend, 'popped')
    this.sound(`${troop.kind}Startle`)
    this.endingDue = null
    if (troop.held.filter((holds) => holds).length === troop.size - 1) {
      // A troop that had all its balloons, one friend alone too, stops swaying with a squeak of heels, and looks at the empty hand.
      this.lookAt.friend = friend
      this.lookAt.until = this.time + 1.4
      this.sound('heels', 1, 0.8, 0.12)
    }
  }

  /** The child touched the troop that waits. Before the troop on screen is served it only waves; after, it steps in. */
  private callNext(): void {
    // While a bunch is still in the air, or the last balloon is in a hand and the ending it causes has not begun,
    // the troop on screen is not yet seen to be served: the troop that waits only waves, as it does before. So the
    // ending always plays, and nothing in the air is cut off.
    const { save, events } = this.flights.length > 0 || this.endingDue ? { save: this.save, events: [] } : callNext(this.save)
    const event = events[0]
    if (!event || event.type !== 'steppedIn') {
      this.waitingActor.clip = 'wave'
      this.waitingActor.t = 0
      return
    }
    // The troop that marches off is drawn from what it was; the save already holds the troop that steps in.
    const was = this.save.troop, before = this.save.parade
    // The parade holds four: when a fifth is on its way the oldest leaves its place, and the rest keep theirs.
    this.retiring = before.length >= PARADE_LENGTH ? { troop: before[0], place: this.turned, u: 0 } : null
    if (this.retiring) this.turned += 1
    this.joining = 0
    // Whoever is in the air comes down as the troop sets off, from where it is, and a bunch that has hold of a
    // friend gets away: nobody is set on the ground between one frame and the next.
    const falls = this.actors.map((actor, i) => {
      this.cutShort(i)
      if (actor.tug) this.letLoose(i, actor.tug, this.spot(i).y + (actor.fall ?? 0) + HELD_HEIGHT + 0.5, false)
      return actor.fall ?? 0
    })
    this.save = save
    this.setTheStage()
    this.arrive({ kind: was.kind, size: was.size, balloons: event.marched.balloons }, event.showing, was.held)
    this.leaving?.actors.forEach((actor, i) => { actor.fall = falls[i]; actor.fallT = 0 })
  }

  /** Ends the scene that is playing: every beat lands where it was going, at once and in silence. */
  private endScene(): void {
    if (!this.scene?.running) return
    this.finishing = true
    this.scene.finish()
    this.finishing = false
    // On the far hill too, everything is where it was going.
    this.retiring = null
    this.joining = 1
    for (let i = 0; i < this.actors.length; i++) {
      const actor = this.actors[i]
      if (actor.clip !== 'proud' && actor.clip !== 'march') continue
      this.cutShort(i)
      actor.clip = null
    }
  }

  /** Something a beat starts (a motion, a sound), which a touch that ends the scene does not start. */
  private cue(start: () => void): Beat['play'] {
    return () => { if (!this.finishing) start() }
  }

  /**
   * The ending of a cycle: each friend's own proud move with its balloon, in the order the balloons were taken;
   * three steps on the spot together; the balloons bobbing up in a wave; and the troop settling to look up at
   * them. Its outcome is in the save already: the cycle was judged when the finger lifted.
   */
  private endCycle(order: readonly number[], together: boolean): void {
    const kind = this.troop.kind, p = PERSONALITIES[kind], size = this.troop.size
    // The friends take their turns in the order the balloons were taken. After a load that order is gone for those
    // who already held one: they go first, in the order they stand, and those served since follow as they were served.
    const turns = [...order, ...Array.from({ length: size }, (_, i) => i).filter((i) => !order.includes(i))]
    const gap = together ? 0.14 : Math.min(0.7, p.lasts.proud * 0.75)
    const beats: Beat[] = []
    turns.forEach((friend, k) => beats.push({ at: 0.15 + k * gap, lasts: 0, play: this.cue(() => { this.act(friend, 'proud'); this.sound(`${kind}Poke`, 1.18 + k * 0.05, 0.8) }) }))
    let at = 0.15 + (size - 1) * gap + p.lasts.proud
    beats.push({ at, lasts: 0, play: this.cue(() => { for (let i = 0; i < size; i++) this.act(i, 'march') }) })
    for (let step = 0; step < 3; step++) beats.push({ at: at + (p.lasts.march * (step + 0.5)) / 3, lasts: 0, play: this.cue(() => this.sound(`${kind}Step`, 1, 0.9)) })
    at += p.lasts.march
    for (let i = 0; i < size; i++) beats.push({ at: at + i * 0.16, lasts: 0, play: this.cue(() => { this.held[i].vy += 4.6; this.sound('bloop', 1 + i * 0.12, 0.5) }) })
    at += size * 0.16
    // The troop settles, each friend looking up at its balloon, for as long as it takes to make the scene whole.
    beats.push({ at, lasts: Math.max(0.8, ENDING.shortest - at), play: () => {} })
    // A slow kind in a troop of three would run long: its beats keep their order and come a little closer together.
    const length = sceneLength(beats), squeeze = Math.min(1, ENDING.longest / length)
    this.scene = new Scene(beats.map((beat) => ({ ...beat, at: beat.at * squeeze, lasts: beat.lasts * squeeze })))
    this.sceneKind = 'ending'
    this.scene.start(this.time, () => {})
  }

  /**
   * The arrival: the served troop marches off towards the far hill, a troop passes by when a new idea has come,
   * the next troop walks in and reaches up, the sky fills, and the troop after it comes to the edge. Everything
   * it changes in the save was changed before it starts, and is saved at once.
   */
  private arrive(marched: Marched | null, showing: Showing | null, held: readonly boolean[] = []): void {
    const actorsFor = (size: number): Actor[] => Array.from({ length: size }, () => ({ clip: null, t: 0, next: null, tug: null, landAfter: 0 }))
    const beats: Beat[] = []
    let at = 0
    this.walkIn = 0
    this.nextIn = 0
    this.skyIn = false
    this.leaving = null
    this.passer = null
    this.over = null
    this.hopAt.fill(-9)
    this.endingDue = null
    this.fromBeyond = marched === null
    if (marched) {
      this.leaving = { kind: marched.kind, size: marched.size, held: [...held], actors: actorsFor(marched.size) }
      this.leaveU = 0
      const lasts = PERSONALITIES[marched.kind].walk * 1.15
      beats.push({ at: 0, lasts, play: (u) => { this.leaveU = u; if (u >= 1) this.leaving = null } })
      at = showing ? lasts * 0.75 : 0.45
    }
    if (showing) {
      const p = PERSONALITIES[showing.kind]
      const passer = { kind: showing.kind, size: showing.size, held: Array.from({ length: showing.size }, () => false), actors: actorsFor(showing.size), idea: showing.idea }
      this.passer = passer
      this.passIn = 0
      this.passOut = 0
      this.passTook = false
      // In, a look up at what hangs low for it, the taking, and out: four to six seconds for any kind, the quick
      // ones looking a little longer and the slow ones wasting none.
      const turn = showing.idea === 'bunch' ? 0.06 : 0.2, after = 0.25 + (showing.size - 1) * turn
      // Its walk in, its walk out and its way over the far hill are the parts that can give: a slow kind steps a
      // little quicker here than when it comes to stay, so that the whole pass is over inside its six seconds.
      const taking = p.lasts.catch + after, quick = Math.min(1, (PASS_BY.longest - 0.15 - 0.35 - taking) / (p.walk * 2 + OVER_HILL))
      const out = p.walk * quick, over = OVER_HILL * quick
      const look = Math.max(0.35, PASS_BY.shortest + 0.2 - (out * 2 + over + taking))
      beats.push({ at, lasts: out, play: (u) => { this.passIn = u } })
      at += out + look
      // It takes what hangs low for it, in its kind's own way. Ended early, it simply has it.
      beats.push({ at, lasts: 0, play: () => {
        this.passTook = true
        passer.held.fill(true)
        if (this.finishing) return
        passer.actors.forEach((actor, k) => {
          actor.clip = 'catch'
          actor.t = -k * turn
          this.sound(`${showing.kind}Catch`, 1 + k * 0.05, k === 0 ? 1 : 0.8, k * turn)
        })
      } })
      at += p.lasts.catch + after
      beats.push({ at, lasts: out, play: (u) => { this.passOut = u; if (u >= 1) this.passer = null } })
      // Gone past the edge, it is seen once more, small and far off: over the shoulder of the far hill and out of sight.
      beats.push({ at: at + out, lasts: over, play: (u) => { this.overU = u; this.over = u < 1 ? passer : null } })
      // The child's troop walks in when the showing is over: the passing troop has left by the edge and gone over
      // the far hill. Until then the middle is empty and the far hill is where to look.
      at += out + over
    }
    const kind = this.troop.kind, walkFor = PERSONALITIES[kind].walk
    beats.push({ at, lasts: walkFor, play: (u) => { this.walkIn = u } })
    // The sky fills with the next bunches, one place after another.
    beats.push({ at: at + walkFor * 0.55, lasts: 0, play: () => {
      this.skyIn = true
      this.places.forEach((place, slot) => {
        place.grow = this.finishing ? 1 : 0
        place.away = this.finishing ? 0 : 0.001 + slot * 0.09
      })
    } })
    beats.push({ at: at + walkFor, lasts: PERSONALITIES[this.waiting.kind].walk * 0.8, play: (u) => { this.nextIn = u } })
    this.scene = new Scene(beats)
    this.sceneKind = 'arrival'
    this.scene.start(this.time, () => { this.unsaved = 2 })
  }

  /** A cloud is squeezed: it squeaks, squashes, and sheds a few drops. */
  private shed(index: number, view: View): void {
    const cloud = CLOUDS[index], at = seenAt(cloud.x, cloud.y, cloud.z, view, this.seen)
    this.clouds[index].speed -= 5
    this.sound('cloudSqueak', 0.9 + this.random() * 0.25)
    this.sound('patter', 1, 0.8, 0.22)
    if (this.drops.length > 14) this.drops.splice(0, this.drops.length - 14)
    for (let i = 0; i < 7; i++) this.drops.push({ x: at.x + (i / 6 - 0.5) * 3.2 * cloud.scale * at.scale, y: at.y - 0.35 * at.scale, vx: (this.random() - 0.5) * 0.6, vy: -this.random() * 1.5, life: 0.75 + this.random() * 0.25 })
  }

  /** A pop: the snap, and scraps of the balloon's colour thrown out. */
  private burst(x: number, y: number, colour: string): void {
    this.sound('pop', 0.9 + this.random() * 0.25)
    // The oldest scraps make room: they were nearly gone.
    if (this.scraps.length > MAX_SCRAPS - 7) this.scraps.splice(0, this.scraps.length - (MAX_SCRAPS - 7))
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + this.random() * 0.6, speed = 3.2 + this.random() * 2.6
      this.scraps.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed + 1, colour, life: SCRAP_LIFE })
    }
  }

  /** Starts a friend's motion. One that is being carried off finishes that first. */
  private act(friend: number, id: ClipId): void {
    const actor = this.actors[friend]
    if (actor.clip === 'liftOff') {
      if (id !== 'poke') actor.next = id
      return
    }
    // The director: a poke is never taken the same way twice running, and no motion a touch starts runs at quite the same speed twice.
    if (id === 'poke') {
      id = actor.lastPoke === 'poke' || (actor.lastPoke === undefined && this.random() < 0.5) ? 'pokeB' : 'poke'
      actor.lastPoke = id
    }
    this.cutShort(friend)
    actor.clip = id
    actor.t = 0
    actor.speed = id === 'proud' || id === 'march' ? 1 : QUICKEST - 0.14 + this.random() * 0.14
  }

  /**
   * A motion is about to be cut short by another. If it had the friend in the air, the friend falls from there
   * while the new motion begins, and is never set down on the ground between one frame and the next.
   */
  private cutShort(friend: number): void {
    const actor = this.actors[friend], kind = this.troop.kind
    let high = actor.fall ? actor.fall * (1 - ((actor.fallT ?? 0) / FALLS_IN) ** 2) : 0
    if (actor.clip && actor.t > 0) {
      const pose = copyPose(this.pose, REST)
      clip(kind, actor.clip, actor.t, BODIES[kind].height * FRIEND_SCALE, BODIES[kind].reach, pose)
      high += pose.y
    }
    actor.fall = high > 0.04 ? high : 0
    actor.fallT = 0
  }

  /** Plays `dt` seconds. */
  step(dt: number): void {
    this.time += dt
    if (this.time >= this.lookAt.until) this.sway += dt
    if (this.retiring && (this.retiring.u += dt / RETIRES_IN) >= 1) this.retiring = null
    if (!this.leaving && !this.retiring && this.joining < 1) this.joining = Math.min(1, this.joining + dt / JOINS_IN)
    const kind = this.troop.kind, personality = PERSONALITIES[kind]

    // The scene that is playing moves on, and whoever is walking in it is heard at each step.
    const leaveU = this.leaveU, passIn = this.passIn, passOut = this.passOut, walkIn = this.walkIn, nextIn = this.nextIn
    this.scene?.update(this.time)
    if (this.leaving) this.footfall(this.leaving.kind, leaveU, this.leaveU, 0.6)
    if (this.leaving) for (const actor of this.leaving.actors) if (actor.fall && (actor.fallT = (actor.fallT ?? 0) + dt) >= FALLS_IN) actor.fall = 0
    if (this.passer) {
      this.footfall(this.passer.kind, passIn, this.passIn, 0.8)
      this.footfall(this.passer.kind, passOut, this.passOut, 0.6)
      for (const actor of this.passer.actors) {
        if (!actor.clip) continue
        actor.t += dt
        if (actor.t >= PERSONALITIES[this.passer.kind].lasts[actor.clip]) actor.clip = null
      }
    }
    this.footfall(kind, walkIn, this.walkIn, 0.8)
    this.footfall(this.waiting.kind, nextIn, this.nextIn, 0.5)
    // An ending that is due starts when the catch that caused it is over and nothing is in the air.
    if (this.endingDue && this.time >= this.endingDue.at && !this.scene?.running && this.flights.length === 0) {
      const due = this.endingDue
      this.endingDue = null
      this.endCycle(due.order, due.together)
    }

    for (const place of this.places) {
      // A pressed bunch is held flat; let go, it springs back past round and settles.
      const target = place.pressed ? 1 : 0
      place.squashSpeed += ((target - place.squash) * 420 - place.squashSpeed * 17) * dt
      place.squash += place.squashSpeed * dt
      place.pushSpeed += (-place.push * 30 - place.pushSpeed * 4.5) * dt
      place.push += place.pushSpeed * dt
      place.whipSpeed += (-place.whip * 260 - place.whipSpeed * 8) * dt
      place.whip += place.whipSpeed * dt
      if (place.away > 0) {
        place.away -= dt
        if (place.away <= 0) { place.away = 0; this.sound('bloop', 0.9 + this.random() * 0.3, 0.6) }
      } else if (place.grow < 1) place.grow = Math.min(1, place.grow + dt / GROW)
    }

    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]
      flight.t += dt
      if (!flight.landed && flight.t >= FLIGHT) this.land(flight)
      if (flight.landed) {
        flight.after += dt
        if (this.settle(flight, personality.cue)) this.flights.splice(i, 1)
      } else if (flight.given.result === 'taken' && flight.t >= FLIGHT - personality.cue.grab) {
        // The friends who will take one start to meet it before it is there.
        // The ducks jump at once and the frogs' tongues go out together; the hippos yawn in a row, one after another, and the crabs snip in a row like scissors.
        const gap = kind === 'hippo' ? 0.17 : kind === 'crab' ? 0.06 : 0
        flight.given.takers.forEach((taker, k) => {
          // One that is being carried off has its hands full: its balloon is in its hand when it comes down.
          const actor = this.actors[taker]
          if (actor.clip === 'catch' || actor.clip === 'liftOff') return
          this.act(taker, 'catch')
          actor.t = -k * gap
        })
      } else if (flight.given.result === 'refused' && !flight.met && flight.t >= FLIGHT - REFUSAL_LEAD) {
        // The friend that will refuse it turns to look as it arrives: its answer begins well inside half a second of the touch.
        flight.met = true
        this.act(flight.friend, 'refuse')
        const actor = this.actors[flight.friend]
        // The motions are written for a bunch that hangs to the right of the friend as the child sees it; one that
        // hangs to its left is refused the other way round, never across the friend beside it.
        actor.mirrored = this.beside(flight.friend, flight.bunch.count).side < 0
        // A refusal is at its fullest where colour is new. From the position where bunches arrive it is shorter:
        // what follows the moment it lands on the bunch is played faster. The look before it is never hurried, so
        // the bunch always hangs beside the friend for its beat, the two colours side by side.
        actor.brisk = LADDER.indexOf(this.save.position) >= LADDER.indexOf('bunches-own-colour')
        // A friend that is being carried off refuses when it is down again: the bunch hangs beside its place and
        // waits for it, and the refusal is heard when it begins.
        if (actor.clip === 'refuse') this.sound(`${kind}Refuse`, 1, 1, 0, actor.speed ?? 1)
      }
    }

    for (let i = 0; i < this.actors.length; i++) {
      const actor = this.actors[i]
      if (actor.fall && (actor.fallT = (actor.fallT ?? 0) + dt) >= FALLS_IN) actor.fall = 0
      if (!actor.clip) continue
      const before = actor.t
      let step = dt * (actor.clip === 'liftOff' ? 1 : actor.speed ?? 1) * (actor.clip === 'refuse' && actor.brisk && actor.t >= personality.cue.hit ? 1.3 : 1)
      // A whole troop that was carried off comes down one after another: each friend hangs in the air where it let
      // go for a moment longer than the one before it.
      if (actor.clip === 'liftOff' && actor.landAfter > 0 && actor.t >= personality.cue.letGo) {
        const hung = Math.min(actor.landAfter, step)
        actor.landAfter -= hung
        step -= hung
      }
      actor.t += step
      if (actor.clip === 'liftOff') {
        const { letGo, land } = personality.cue
        if (before < letGo && actor.t >= letGo && actor.tug) {
          // It lets go: the whole bunch gets away, rising fast, and pops on its way.
          this.letLoose(i, actor.tug, this.spot(i).y + this.lift(kind, letGo) + HELD_HEIGHT + 0.5, actor.bumps === true)
          actor.tug = null
          actor.bumps = false
        }
        if (before < land && actor.t >= land) {
          this.sound(`${kind}Land`)
          // The hippo sits down so hard that the clouds bounce.
          if (kind === 'hippo') for (const cloud of this.clouds) cloud.speed += 3.5
        }
      }
      if (actor.t >= personality.lasts[actor.clip]) {
        actor.clip = actor.next
        actor.next = null
        actor.t = 0
        if (actor.clip === 'refuse') this.sound(`${kind}Refuse`, 1, 1, 0, actor.speed ?? 1)
      }
    }
    const waiting = this.waitingActor
    if (waiting.clip && (waiting.t += dt) >= PERSONALITIES[this.waiting.kind].lasts[waiting.clip]) waiting.clip = null

    // A held balloon is on a string: it follows the hand that holds it, late and bobbing.
    for (let i = 0; i < this.held.length; i++) {
      const balloon = this.held[i], spot = this.spot(i), actor = this.actors[i]
      const lifted = actor.clip === 'liftOff' ? this.lift(kind, actor.t) : 0
      let targetX = spot.x + 0.7 + Math.sin(this.time * 1.2 + i) * 0.1, targetY = spot.y + lifted + HELD_HEIGHT + Math.sin(this.time * 1.5 + i * 2) * 0.06, pull = 60, drag = 6
      if (balloon.bonk !== undefined && balloon.bonk > 0) {
        // Knocked by a refusal, it swings round on its string and comes down on its friend's head: its underside
        // on the top of the head, hard and fast, and then it is let go to bob back up.
        balloon.bonk -= dt
        targetX = spot.x + 0.08
        targetY = spot.y + lifted + BODIES[kind].height * FRIEND_SCALE + BALLOON * this.lastView.balloon * 0.92
        pull = 420
        drag = 22
      }
      balloon.vx += ((targetX - balloon.x) * pull - balloon.vx * drag) * dt
      balloon.vy += ((targetY - balloon.y) * pull - balloon.vy * drag) * dt
      balloon.x += balloon.vx * dt
      balloon.y += balloon.vy * dt
    }

    // More got away than the sky can show: the earliest pop now.
    for (let i = 0; i < this.loose.length - MAX_LOOSE; i++) this.loose[i].popAt = 0
    for (let i = this.loose.length - 1; i >= 0; i--) {
      const balloon = this.loose[i]
      balloon.t += dt
      if (balloon.flat) {
        // Going flat: it darts about wherever its neck points, slower and smaller.
        const turn = Math.sin(balloon.t * 23 + i) * 26 * dt
        const vx = balloon.vx * Math.cos(turn) - balloon.vy * Math.sin(turn), vy = balloon.vx * Math.sin(turn) + balloon.vy * Math.cos(turn)
        balloon.vx = vx * (1 - 0.9 * dt)
        balloon.vy = vy * (1 - 0.9 * dt) + 2.4 * dt
      } else if (balloon.bump) {
        // On its way to the cloud: when it is there it bumps it, the cloud squashes and sheds, and the balloon bounces off upwards.
        const cloud = CLOUDS[CLOUDS.length - 1], at = seenAt(cloud.x, cloud.y, cloud.z, this.lastView, this.seen)
        if (Math.abs(balloon.x - at.x) < 2.2 * cloud.scale * at.scale + BALLOON && Math.abs(balloon.y - at.y) < 0.55 * cloud.scale * at.scale + BALLOON) {
          balloon.bump = false
          balloon.vx = (balloon.x < at.x ? -1 : 1) * (2 + this.random() * 2)
          balloon.vy = 5 + this.random() * 2
          if (this.time >= this.flinchUntil - 0.6) {
            this.flinchUntil = this.time + 0.9
            this.shed(CLOUDS.length - 1, this.lastView)
          }
        }
      } else balloon.vy += 7 * dt
      balloon.x += balloon.vx * dt
      balloon.y += balloon.vy * dt
      if (balloon.t >= balloon.popAt) {
        if (!balloon.flat) this.burst(balloon.x, balloon.y, balloon.colour)
        this.loose.splice(i, 1)
      }
    }
    for (const cloud of this.clouds) {
      cloud.speed += ((1 - cloud.squash) * 160 - cloud.speed * 9) * dt
      cloud.squash += cloud.speed * dt
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i]
      drop.life -= dt
      drop.vy -= 11 * dt
      drop.x += drop.vx * dt
      drop.y += drop.vy * dt
      if (drop.life <= 0 || drop.y < groundAt(drop.x, 0)) this.drops.splice(i, 1)
    }
    for (let i = this.dimples.length - 1; i >= 0; i--) if ((this.dimples[i].t += dt) > 0.7) this.dimples.splice(i, 1)
    for (let i = this.scraps.length - 1; i >= 0; i--) {
      const scrap = this.scraps[i]
      scrap.life -= dt
      scrap.vy -= 9 * dt
      scrap.x += scrap.vx * dt
      scrap.y += scrap.vy * dt
      if (scrap.life <= 0) this.scraps.splice(i, 1)
    }
  }

  /** A step's sound when a walk passes from one step into the next. */
  private footfall(kind: KindName, before: number, now: number, gain: number): void {
    if (now <= before || now >= 1) return
    const steps = PERSONALITIES[kind].steps
    if (Math.floor(now * steps) !== Math.floor(before * steps) || before === 0) this.sound(`${kind}Step`, 1, gain)
  }

  /** How high a friend of this kind is off the ground this far into being carried off. */
  private lift(kind: KindName, t: number): number {
    const pose = this.pose
    copyPose(pose, REST)
    clip(kind, 'liftOff', t, BODIES[kind].height * FRIEND_SCALE, BODIES[kind].reach, pose)
    return pose.y
  }

  /** The bunch has reached the friend. */
  private land(flight: Flight): void {
    flight.landed = true
    const kind = this.troop.kind, given = flight.given
    if (given.result === 'taken') {
      given.takers.forEach((taker, k) => {
        const balloon = this.held[taker], spot = this.spot(taker)
        // It arrives above the hand that takes it and swings up onto its string.
        balloon.x = spot.x + 0.25
        balloon.y = spot.y + BODIES[kind].height * FRIEND_SCALE + 0.55
        balloon.vx = 2.2
        balloon.vy = 3.4
        balloon.shown = true
        // A bunch with one for each: the ducks' boings in a run, the frogs' twangs on top of one another, the hippos'
        // honks stepping down one after another, the crabs' clicks in a quick run.
        const gap = kind === 'hippo' ? 0.17 : kind === 'duck' ? 0.1 : kind === 'crab' ? 0.06 : 0.03
        const pitch = kind === 'hippo' ? 1 - k * 0.11 : kind === 'duck' ? 1 + k * 0.06 : 1
        this.sound(`${kind}Catch`, pitch, k === 0 ? 1 : 0.8, k * gap)
      })
      if (kind === 'frog' && given.takers.length > 1) this.sound('frogSlurp', 1, 1, 0.3)
    } else if (given.result !== 'refused') {
      const everyoneHolds = given.spare === flight.bunch.count
      if (everyoneHolds && flight.bunch.count === this.troop.size && this.troop.size > 1) {
        // One more for each of a troop that has its balloons: the whole troop is carried off at the same moment,
        // their squeaks climbing a scale together, and they come down one after another.
        for (let i = 0; i < this.troop.size; i++) this.carryOff(i, { colour: flight.bunch.colour, count: 1 }, 1 + i * 0.12, i * LAND_APART)
      } else {
        // A bunch bigger than the whole troop: its balloons bump the cloud on their way out, and it sheds its drops on the troop.
        this.carryOff(flight.friend, flight.bunch, 1, 0, everyoneHolds && flight.bunch.count > this.troop.size)
        // A balloon in each hand: the two rub together.
        if (everyoneHolds && flight.bunch.count === 1) this.sound('squeal', 1, 0.9, 0.15)
      }
    }
  }

  /**
   * How a bunch hangs over the friend it is carrying off: where each balloon is from the friend's middle, and how
   * much higher than the bunch's own height. When friends still reach, the bunch is pulled apart so that it is read
   * against them one for one: a balloon straight over the friend that grabbed it, one over each other friend that
   * still reaches, and the rest over the empty ground between two friends, with nobody under them. A friend that
   * already holds a balloon has the bunch, as it hung in the sky, on its other side.
   */
  private hung(friend: number, bunch: Bunch): readonly { x: number; y: number }[] {
    // The bunch that has hold of a friend hangs as it did when it took hold, whatever happens under it meanwhile.
    const actor = this.actors[friend]
    if (actor.tug === bunch && actor.hang) return actor.hang
    const places = this.hangs, count = bunch.count, offsets = bunchOffsets(count)
    if (this.held[friend].shown) {
      for (let k = 0; k < count; k++) { places[k].x = offsets[k].x - 0.75; places[k].y = offsets[k].y }
      return places
    }
    // One for each friend that still reaches, itself first and then the others from the left; the rest over the
    // gaps between two friends, nearest first, a little higher.
    let given = 0
    places[given].x = 0; places[given].y = 0; given += 1
    for (let j = 0; j < this.troop.size && given < count; j++) {
      if (j === friend || this.held[j].shown) continue
      places[given].x = (j - friend) * FRIEND_GAP; places[given].y = 0; given += 1
    }
    for (let spare = 0; given < count; spare++, given++) {
      places[given].x = (spare % 2 === 0 ? 1 : -1) * (Math.floor(spare / 2) + 0.5) * FRIEND_GAP
      places[given].y = SPARE_HIGHER
    }
    return places
  }

  /** A friend grabs more than it should have and is carried off. One already in the air just loses the new bunch. */
  private carryOff(friend: number, bunch: Bunch, pitch: number, landAfter: number, bumps = false): void {
    const actor = this.actors[friend], kind = this.troop.kind
    if (actor.clip !== 'liftOff') {
      this.cutShort(friend)
      actor.clip = 'liftOff'
      actor.t = 0
      actor.next = null
      actor.hang = this.hung(friend, bunch).slice(0, bunch.count).map((place) => ({ x: place.x, y: place.y }))
      actor.second = this.held[friend].shown
      actor.tug = bunch
      actor.bumps = bumps
      actor.landAfter = landAfter
      this.sound(`${kind}LiftOff`, pitch)
      return
    }
    this.letLoose(friend, bunch, this.spot(friend).y + HELD_HEIGHT, bumps)
  }

  /**
   * A bunch gets away from over a friend, from `top` high: rising fast, and popping on its way. One bigger than the
   * whole troop (`bumps`) goes out by way of the cloud that hangs over the troop: its balloons dart at it, bump it
   * and bounce off, and the cloud sheds its drops when the first one meets it.
   */
  private letLoose(friend: number, bunch: Bunch, top: number, bumps: boolean): void {
    const spot = this.spot(friend), hung = this.hung(friend, bunch), colour = KIND_COLOURS[bunch.colour]
    const last = CLOUDS[CLOUDS.length - 1], cloud = bumps ? seenAt(last.x, last.y, last.z, this.lastView, this.seen) : null
    for (let k = 0; k < bunch.count; k++) {
      const x = spot.x + hung[k].x, y = top + hung[k].y
      if (cloud) {
        const far = Math.hypot(cloud.x - x, cloud.y - y) || 1
        this.loose.push({ x, y, vx: ((cloud.x - x) / far) * BUMP_SPEED, vy: ((cloud.y - y) / far) * BUMP_SPEED, colour, flat: false, t: 0, popAt: far / BUMP_SPEED + 0.5 + k * 0.09, bump: true })
      } else this.loose.push({ x, y, vx: (this.random() - 0.5) * 3, vy: 6 + this.random() * 2, colour, flat: false, t: 0, popAt: 0.32 + k * 0.09 })
    }
  }

  /** What a landed bunch does after it lands. True when there is nothing left of it to play. */
  private settle(flight: Flight, cue: { hit: number }, now = false): boolean {
    if (flight.given.result !== 'refused') return true
    // The refusal lands on it at its own moment of the friend's motion, or at once if the friend was set to
    // something else or the bunch has to make room (`now`).
    const refusing = this.actors[flight.friend]
    if (!now && refusing.clip === 'refuse' && refusing.t < cue.hit) return false
    // Its friend is in the air and will refuse it when it is down: until then it hangs.
    if (!now && refusing.clip === 'liftOff' && refusing.next === 'refuse') return false
    // The refusal lands on it: it pops, or with the hippo it is blown away going flat.
    const kind = this.troop.kind, colour = KIND_COLOURS[flight.bunch.colour]
    const beside = this.beside(flight.friend, flight.bunch.count)
    bunchOffsets(flight.bunch.count).forEach((offset, k) => {
      const x = beside.x + offset.x, y = beside.y + offset.y
      if (kind === 'hippo') this.loose.push({ x, y, vx: beside.side * (7 + k), vy: 3 + k, colour, flat: true, t: 0, popAt: 0.85 })
      // The frog's puffed throat bounces it off: it flies from the frog for a quarter of a second, and then it pops.
      else if (kind === 'frog') this.loose.push({ x, y, vx: beside.side * (6.5 + k * 0.8), vy: -0.5 + k * 0.6, colour, flat: false, t: 0, popAt: 0.24 + k * 0.05 })
      else this.burst(x, y, colour)
    })
    if (kind === 'hippo') this.sound('raspberry')
    const mine = this.held[flight.friend]
    if (mine.shown) {
      // The refusal knocks the balloon it already holds, which swings round on its string and bumps it on the head.
      // It is flung out to the side the refused one hung on and comes round onto the head (see the held balloons, in `step`).
      mine.vx += beside.side * 5
      mine.bonk = BONK
      this.sound('bonk', 1, 1, BONK * 0.55)
    }
    return true
  }

  /** Where a refused bunch hangs for a beat: beside the friend's body, on the side with more room, the two colours side by side. */
  private beside(friend: number, count: number): { x: number; y: number; side: number } {
    const spot = this.spot(friend), plan = BODIES[this.troop.kind]
    const side = friend < (this.troop.size - 1) / 2 ? -1 : 1
    // Near enough to touch the friend, never over its face: a bunch is wider than one balloon and hangs further out.
    return { x: spot.x + side * (plan.halfWidth * FRIEND_SCALE * 0.72 + bunchReach(count).x), y: spot.y + plan.height * FRIEND_SCALE * 0.62, side }
  }

  /** Where a flight is going. */
  private target(flight: Flight): { x: number; y: number } {
    if (flight.given.result === 'refused') return this.beside(flight.friend, flight.bunch.count)
    const spot = this.spot(flight.friend), tall = BODIES[this.troop.kind].height * FRIEND_SCALE
    if (flight.given.result === 'taken' && flight.given.takers.length > 1) {
      // One for each: the bunch comes down over the middle of those who take from it.
      const takers = flight.given.takers
      return { x: (this.spot(takers[0]).x + this.spot(takers[takers.length - 1]).x) / 2, y: spot.y + tall + 0.75 }
    }
    return { x: spot.x + 0.25, y: spot.y + tall + 0.55 }
  }

  /**
   * Tells the painter where everything is now. `guidance` is what the idle ladder shows: a breathing glow on what
   * can be touched next, then a ghost hand that shows one move and never the answer. While the troop wants
   * balloons that is the bunches, the hand tapping one place after another whatever is in it; once the troop is
   * served it is the troop that waits. Nothing of it shows while a scene plays or a bunch is in the air.
   */
  paint(painter: Painter, view: View, guidance: Guidance | null = null): void {
    const kind = this.troop.kind, plan = BODIES[kind], colour = KIND_COLOURS[kind], cord = shade(colour, -0.3)
    const pose = this.pose, time = this.time
    this.lastView = view
    const idle = guidance && !this.playing && this.flights.length === 0 && this.pressedSlot < 0 ? guidance : null
    const glow = idle ? idle.glow * (0.65 + 0.35 * Math.sin(time * 3.2)) : 0
    const next = this.save.finished
    let shownSlot = -1, press = 0
    if (idle && idle.demo !== null) {
      handPose(idle.demo, false, this.ghost)
      press = this.ghost.press
      if (next) {
        const first = waitingSpot(0, view), at = seenAt(first.x, groundAt(first.x, first.z) + BODIES[this.waiting.kind].height * FRIEND_SCALE * WAITING_SCALE * 0.72, first.z, view, this.seen)
        painter.hand(at.x + BODIES[this.waiting.kind].halfWidth * FRIEND_SCALE * WAITING_SCALE * 0.6, at.y, this.ghost.opacity, press)
      } else if (this.sky.length > 0) {
        // One place after another, whatever hangs there: the hand shows that a bunch can be tapped, not which.
        shownSlot = (1 + Math.max(0, idle.demoIndex) * 2) % this.sky.length
        const at = this.slots(view)[shownSlot]
        painter.hand(at.x + bunchReach(this.sky[shownSlot].count).x * 0.45 * view.balloon, at.y - BALLOON * 0.35 * view.balloon, this.ghost.opacity, press)
      }
    }

    // The scenery: each cloud as squashed as it is, its drops, the dimples in the hill.
    for (let i = 0; i < this.clouds.length; i++) painter.cloud(i, this.clouds[i].squash)
    for (const drop of this.drops) painter.balloon(drop.x, drop.y, 0.5, 0.26, 0.3, Math.PI, PALETTE.drop)
    for (const dimple of this.dimples) {
      const grown = 0.9 + dimple.t * 3.4
      painter.shadow(dimple.x, groundAt(dimple.x, 2.4) + 0.03, 2.4, grown, grown * 0.5, PALETTE.shadow)
    }
    // The troops that were served, going round the far hill with the balloons they carried off. The one that is
    // still marching off in front has not got there yet; when it has left by the edge it comes up the far hill to
    // its place on the ring. The oldest of five goes down from its place and out of sight as the scene begins.
    const parade = this.save.parade
    for (let t = 0; t < parade.length; t++) {
      const newest = t === parade.length - 1
      // It is not on the far hill until it has left by the edge in front, and it waits for the oldest to be gone.
      if (newest && (this.leaving || this.retiring)) continue
      this.farTroop(painter, parade[t], t + this.turned, newest ? 1 - this.joining : 0, true, this.hopAt[t])
    }
    if (this.retiring) this.farTroop(painter, this.retiring.troop, this.retiring.place, this.retiring.u, false, -9)

    // The troop that passed by, going over the left shoulder of the far hill, clear of the ring the parade walks: up
    // from behind the near hill, over the top and down the far side, each friend a little behind the one in front.
    const over = this.over
    if (over) {
      const hue = shade(KIND_COLOURS[over.kind], 0.4), rate = PERSONALITIES[over.kind].steps / PERSONALITIES[over.kind].walk
      for (let m = 0; m < over.size; m++) {
        const s = this.overU * (1 + (over.size - 1) * OVER_LAG) - m * OVER_LAG
        if (s <= 0 || s >= 1) continue
        const x = FAR_HILL.x + OVER_PATH.x + OVER_PATH.across * s, z = FAR_HILL.z + OVER_PATH.z - OVER_PATH.deep * s
        // It comes up from the dip between the two hills and goes down into the one behind, so that it and its balloon
        // are below what hides them at both ends of the way and nothing appears or vanishes in plain sight.
        const sunk = (1 - ramp(s, 0, 0.14)) * OVER_PATH.dip + ramp(s, 0.88, 1) * OVER_PATH.dip * 0.5
        const step = time * rate + m * 0.4, hop = Math.abs(Math.sin(step * Math.PI)) * (over.kind === 'frog' ? 0.35 : 0.1), y = farGroundAt(x, z) + hop + 0.14 - sunk
        painter.marcher(over.kind, x, y, z, FRIEND_SCALE * PARADE_SCALE, Math.atan2(OVER_PATH.across, -OVER_PATH.deep), Math.sin(step * Math.PI) * 0.1)
        const by = y + HELD_HEIGHT * PARADE_SCALE + Math.sin(time * 1.4 + m) * 0.08
        painter.balloon(x + 0.3, by, z, PARADE_SCALE, PARADE_SCALE, 0.06, hue)
        painter.string(x + 0.3, by - BALLOON * 1.32 * PARADE_SCALE, z, x, y + BODIES[over.kind].height * FRIEND_SCALE * PARADE_SCALE * 0.95, z, hue, 0.03)
      }
    }

    // The bunches in their places.
    const slots = this.slots(view)
    for (let slot = 0; slot < slots.length; slot++) {
      const place = this.places[slot], bunch = this.sky[slot]
      if (place.away > 0 || !this.skyIn) continue
      const hue = KIND_COLOURS[bunch.colour], line = shade(hue, -0.3)
      // A new bunch drifts down into its place, small at first and a little past its size before it settles.
      // And as large as a balloon is on this surface (`balloon` in layout.ts).
      const grown = place.grow, size = (grown < 1 ? grown * (1 + Math.sin(grown * Math.PI) * 0.18) : 1) * view.balloon
      const bob = Math.sin(time * 1.1 + slot * 1.7) * 0.07 + (1 - grown) * (1 - grown) * 1.4
      const cx = slots[slot].x + place.push, cy = slots[slot].y + bob
      // Flat under the finger, and past round for a moment when it is let go; never flatter than a pillow can be.
      // The ghost hand's press shows what a touch does: the bunch under it squashes, and springs back when the hand lifts.
      const flat = Math.max(-0.35, Math.min(1.15, place.squash + (slot === shownSlot ? press * 0.75 : 0)))
      const wide = (1 + flat * 0.3) * size, tall = (1 - flat * 0.36) * size
      const knotX = cx, knotY = cy - BALLOON * 2.5 * size
      const offsets = bunchOffsets(bunch.count)
      for (let k = 0; k < offsets.length; k++) {
        const sway = Math.sin(time * 0.9 + slot * 2.3 + k * 1.3) * 0.05
        const x = cx + offsets[k].x * size * (1 + flat * 0.12) + sway * 0.4, y = cy + offsets[k].y * size
        const lean = (bunch.count > 1 ? -offsets[k].x * 0.42 : 0) + sway - place.pushSpeed * 0.04
        painter.balloon(x, y, -k * 0.02, wide, tall, lean, hue, next ? 0 : glow)
        const tailX = x + Math.sin(lean) * BALLOON * 1.32 * tall, tailY = y - Math.cos(lean) * BALLOON * 1.32 * tall
        if (bunch.count > 1) painter.string(tailX, tailY, 0, knotX, knotY, 0, line)
        else this.looseEnd(painter, tailX, tailY, Math.sin(time * 1.3 + slot) * 0.06 - place.pushSpeed * 0.05, 0.6 * size, place, line)
      }
      if (bunch.count > 1) this.looseEnd(painter, knotX, knotY, Math.sin(time * 1.3 + slot) * 0.06, 0.5 * size, place, line)
    }

    // The troop.
    for (let i = 0; i < this.troop.size; i++) {
      const actor = this.actors[i], spot = this.spot(i), name = `friend-${i}`
      copyPose(pose, REST)
      pose.x = spot.x
      pose.y = spot.y
      pose.scale = FRIEND_SCALE
      // It stands as one that holds a balloon only once the balloon is in its hand.
      rest(kind, this.held[i].shown, plan.reach, time, i, pose, this.sway)
      if (this.walkIn < 1) {
        // On its way in from the edge, where it waited: nearer, larger, and in its kind's own gait.
        // The friend at the head of the waiting troop, nearest the middle, goes furthest: nobody has to pass anybody.
        const from = waitingSpot(this.troop.size - 1 - i, view), gone = stride(kind, this.walkIn), beyond = this.fromBeyond ? 3.6 : 0
        pose.x = from.x - beyond + (spot.x - from.x + beyond) * gone
        // They spread out sideways before they come forward, so no friend walks through another.
        pose.z = from.z * (1 - gone * gone * gone)
        pose.y = groundAt(pose.x, pose.z) + (pose.y - spot.y)
        pose.scale = FRIEND_SCALE * (WAITING_SCALE + (1 - WAITING_SCALE) * gone)
        if (this.walkIn <= 0) {
          pose.armL = pose.armR = 0.2
          pose.turn = 0.45
          pose.nod = -0.25
        } else walk(kind, this.walkIn, 1, pose)
      }
      if (actor.clip) {
        const flip = actor.clip === 'refuse' && actor.mirrored === true
        // A mirrored motion is played on the mirrored resting pose and mirrored back, so only the motion changes sides.
        if (flip) mirror(pose)
        if (actor.t >= 0) clip(kind, actor.clip, actor.t, plan.height * FRIEND_SCALE, plan.reach, pose)
        if (flip) mirror(pose)
        // Whatever it does, the hand that holds a string stays up: the balloon is on the end of it.
        if (this.held[i].shown && (actor.clip !== 'liftOff' || kind === 'frog')) pose.armR = Math.max(pose.armR, plan.reach - 0.45)
        // A frog with a balloon in each hand has its other hand up too, while the bunch has hold of it.
        if (kind === 'frog' && actor.clip === 'liftOff' && actor.tug && (actor.second ?? this.held[i].shown)) pose.armL = Math.max(pose.armL, plan.reach - 0.45)
      }
      // What is left of a fall from a motion that was cut short in the air.
      if (actor.fall) pose.y += actor.fall * (1 - ((actor.fallT ?? 0) / FALLS_IN) ** 2)
      this.watch(i, pose)
      this.ride(pose, i)
      if (!actor.clip) {
        // A troop whose friend has lost its balloon looks at the empty hand; a served troop, left alone, looks to the troop that waits.
        // A positive turn looks to the child's right, where the friends with a higher place stand; the troop that waits is at the left edge.
        if (time < this.lookAt.until && i !== this.lookAt.friend) pose.headTurn = Math.sign(this.lookAt.friend - i) * 0.55
        else if (next && glow > 0) pose.headTurn -= 0.35 * glow
      }
      painter.place(name, kind, pose)
      const floor = groundAt(pose.x, pose.z), lifted = pose.y - floor
      // The shadow stays on the hill and shrinks as the friend leaves it.
      const shrunk = (1 / (1 + lifted * 0.5)) * (pose.scale / FRIEND_SCALE)
      painter.shadow(pose.x, floor + 0.02, pose.z + 0.1, plan.halfWidth * FRIEND_SCALE * 1.05 * shrunk, 0.55 * shrunk, shade(colour, -0.35))
      handOf(plan, pose, this.hand)
      const balloon = this.held[i]
      if (balloon.shown) {
        if (actor.clip === 'catch') this.byMouth(kind, actor.t, pose)
        const lean = (this.hand.x - balloon.x) * -0.2 + balloon.vx * 0.03, big = view.balloon
        painter.balloon(balloon.x, balloon.y, 0.3, big, big, lean, colour)
        painter.string(balloon.x + Math.sin(lean) * BALLOON * 1.32 * big, balloon.y - Math.cos(lean) * BALLOON * 1.32 * big, 0.3, this.hand.x, this.hand.y, this.hand.z, cord)
      }
      if (kind === 'frog' && actor.clip === 'catch') this.tongue(i, actor.t, pose, painter, shade(colour, 0.34))
      if (actor.clip === 'liftOff' && actor.tug) {
        // The bunch that is carrying it off, straining upwards on strings from its hand.
        const hue = KIND_COLOURS[actor.tug.colour], line = shade(hue, -0.3)
        // A friend that already holds a balloon takes the bunch in its other hand: a balloon in each, the frog too.
        // A frog that had none takes it with its tongue and hangs from that, mouth up, the strings gathered at the
        // tongue's tip.
        const other = actor.second ?? balloon.shown, byTongue = kind === 'frog' && !other
        if (byTongue) {
          const mouthX = pose.x, mouthY = pose.y + (plan.neck[1] + plan.mouth[1]) * pose.scale * pose.squash, mouthZ = pose.z + (plan.neck[2] + plan.mouth[2]) * pose.scale
          this.hand.x = pose.x - 0.1 + Math.sin(time * 9) * 0.04
          this.hand.y = pose.y + HELD_HEIGHT - 1.25
          this.hand.z = 0.3
          painter.string(mouthX, mouthY, mouthZ, this.hand.x, this.hand.y, this.hand.z, shade(colour, 0.34), 0.07)
        } else if (other) handOf(plan, pose, this.hand, true)
        const hung = this.hung(i, actor.tug)
        const topX = pose.x + Math.sin(time * 9) * 0.05, topY = pose.y + HELD_HEIGHT + 0.5
        for (let k = 0; k < actor.tug.count; k++) {
          const bx = topX + hung[k].x, by = topY + hung[k].y
          painter.balloon(bx, by, 0.25, 0.96, 1.08, Math.max(-0.35, Math.min(0.35, (this.hand.x - bx) * -0.14)), hue)
          painter.string(bx, by - BALLOON * 1.4, 0.25, this.hand.x, this.hand.y, this.hand.z, line)
        }
      }
    }
    for (let i = this.troop.size; i < 3; i++) painter.drop(`friend-${i}`)

    // Bunches on their way down, and those that hang beside a friend for the beat before it refuses them.
    for (const flight of this.flights) {
      const hue = KIND_COLOURS[flight.bunch.colour], to = this.target(flight)
      const { x, y, u } = this.along(flight)
      const speed = Math.sin(u * Math.PI)
      const lean = Math.atan2(to.x - flight.fromX, flight.fromY - to.y) * 0.5 * speed
      const settle = flight.landed ? Math.sin(flight.after * 30) * Math.exp(-flight.after * 9) * 0.12 : 0
      const offsets = bunchOffsets(flight.bunch.count)
      // It leaves the sky as large as it hung there. One that is taken stays so, since a held balloon is as large;
      // any other is its plain size by the time it reaches the friend.
      const big = flight.given.result === 'taken' ? view.balloon : 1 + (view.balloon - 1) * (1 - u)
      for (let k = 0; k < offsets.length; k++) {
        const bx = x + offsets[k].x * big, by = y + offsets[k].y * big
        painter.balloon(bx, by, 0.35 - k * 0.02, (1 - speed * 0.1 + settle) * big, (1 + speed * 0.16 - settle) * big, lean, hue)
        painter.string(bx + Math.sin(lean) * BALLOON * 1.32 * big, by - BALLOON * 1.32 * big, 0.35, x - Math.sin(lean) * 0.5, y - (BALLOON * 2.6 - speed * 0.3) * big, 0.35, shade(hue, -0.3))
      }
    }

    for (const balloon of this.loose) {
      const left = 1 - balloon.t / balloon.popAt
      const size = balloon.flat ? 0.35 + left * 0.65 : 1
      painter.balloon(balloon.x, balloon.y, 0.4, size * (balloon.flat ? 0.8 : 1), size * (balloon.flat ? 1.15 : 1.06), Math.atan2(-balloon.vx, balloon.vy) * (balloon.flat ? 1 : 0.3), balloon.colour)
    }
    for (const scrap of this.scraps) {
      const size = 0.22 * (scrap.life / SCRAP_LIFE)
      painter.balloon(scrap.x, scrap.y, 0.45, size, size * 0.7, scrap.x * 7 + scrap.life * 20, scrap.colour)
    }

    // The troop that waits at the edge: smaller, further back, looking at the balloons.
    const waitingPlan = BODIES[this.waiting.kind]
    for (let i = 0; i < 3; i++) {
      if (i >= this.waiting.size || this.nextIn <= 0) {
        painter.drop(`waiting-${i}`)
        continue
      }
      const spot = waitingSpot(i, view)
      copyPose(pose, REST)
      // It comes to the edge from beyond it.
      pose.x = spot.x - (1 - stride(this.waiting.kind, this.nextIn)) * 4.5
      pose.z = spot.z
      pose.y = groundAt(pose.x, spot.z)
      pose.scale = WAITING_SCALE * FRIEND_SCALE
      rest(this.waiting.kind, false, waitingPlan.reach, time, i + 5, pose)
      // They wait with their arms down: reaching is for the troop whose turn it is.
      pose.armL = pose.armR = 0.2
      pose.turn = 0.45
      pose.nod = -0.25
      if (this.nextIn < 1) walk(this.waiting.kind, this.nextIn, 1, pose)
      if (this.waitingActor.clip) clip(this.waiting.kind, this.waitingActor.clip, Math.max(0, this.waitingActor.t - i * 0.08), waitingPlan.height, waitingPlan.reach, pose)
      pose.glow = next ? glow : 0
      painter.place(`waiting-${i}`, this.waiting.kind, pose)
      painter.shadow(pose.x, groundAt(pose.x, spot.z) + 0.02, spot.z + 0.1, waitingPlan.halfWidth * 0.75, 0.36, PALETTE.shadow)
    }

    // The troop that marches off with its balloons, towards the far hill.
    const leaving = this.leaving
    for (let i = 0; i < 3; i++) {
      if (!leaving || i >= leaving.size) {
        painter.drop(`leaving-${i}`)
        continue
      }
      const way = view.width / 2 + 2.6 - friendX(0, leaving.size)
      this.passing(painter, `leaving-${i}`, leaving, i, friendX(i, leaving.size) + stride(leaving.kind, this.leaveU) * way, this.leaveU, i + 9)
    }

    // The troop that passes by to show a new idea: in from beyond the edge, a stop under what hangs low for it, and out the other side.
    const passer = this.passer
    for (let i = 0; i < 3; i++) {
      if (!passer || i >= passer.size) {
        painter.drop(`passer-${i}`)
        continue
      }
      // The troop keeps its places as it crosses, each friend as far from the next as when it stands.
      const stop = friendX(i, passer.size), way = view.width / 2 + 2.4 + friendX(passer.size - 1, passer.size), from = stop - way, to = stop + way
      const x = this.passOut > 0 ? stop + (to - stop) * stride(passer.kind, this.passOut) : from + (stop - from) * stride(passer.kind, this.passIn)
      this.passing(painter, `passer-${i}`, passer, i, x, this.passOut > 0 ? this.passOut : this.passIn, i + 13, passer.idea === 'bunch')
    }
    if (passer && !this.passTook) {
      // What hangs low for it: a balloon over each friend, or one bunch for the whole troop.
      const hue = KIND_COLOURS[passer.kind], line = shade(hue, -0.3), y = GROUND + HELD_HEIGHT + 0.75 + Math.sin(time * 1.3) * 0.06
      const drop = Math.min(1, this.passIn * 3), high = (1 - drop) * (1 - drop) * 3
      if (passer.idea === 'bunch') {
        const offsets = bunchOffsets(passer.size)
        for (let k = 0; k < offsets.length; k++) {
          const lean = -offsets[k].x * 0.42
          painter.balloon(offsets[k].x, y + 0.5 + offsets[k].y + high, 0.3, 1, 1, lean, hue)
          painter.string(offsets[k].x + Math.sin(lean) * BALLOON * 1.32, y + 0.5 + offsets[k].y + high - BALLOON * 1.32, 0.3, 0, y + 0.5 + high - BALLOON * 2.5, 0.3, line)
        }
      } else {
        for (let i = 0; i < passer.size; i++) {
          const x = friendX(i, passer.size) + 0.25
          painter.balloon(x, y + high, 0.3, 1, 1, 0, hue)
          painter.string(x, y + high - BALLOON * 1.32, 0.3, x, y + high - BALLOON * 1.32 - 0.5, 0.3, line)
        }
      }
    }
  }

  /**
   * One troop on the far hill, at `place` of the ring, with the balloons it carried off. `away` is how far it is
   * down the slope from its place (0 on the ring), and `coming` says it is on its way up and not down.
   */
  private farTroop(painter: Painter, troop: Marched, place: number, away: number, coming: boolean, hopAt: number): void {
    const time = this.time, rate = PERSONALITIES[troop.kind].steps / PERSONALITIES[troop.kind].walk, hue = shade(KIND_COLOURS[troop.kind], 0.4)
    for (let m = 0; m < troop.size; m++) {
      const at = paradeSpot(place, m, time, this.far, away), step = time * rate + m * 0.4
      // Its step, and the jump it gives when it or the far hill is touched, each friend a moment after the one in front.
      const hop = Math.abs(Math.sin(step * Math.PI)) * (troop.kind === 'frog' ? 0.35 : 0.1) + hump(time - hopAt - m * 0.07, 0, FAR_JUMP) * 1.1
      // The far hill slopes under them: they stand a little proud of it, so the uphill foot is not sunk in.
      painter.marcher(troop.kind, at.x, at.y + hop + 0.14, at.z, FRIEND_SCALE * PARADE_SCALE, away > 0 && coming ? at.turn + Math.PI : at.turn, Math.sin(step * Math.PI) * 0.1)
      if (m >= troop.balloons) continue
      const by = at.y + hop + HELD_HEIGHT * PARADE_SCALE + Math.sin(time * 1.4 + place + m) * 0.08
      painter.balloon(at.x + 0.3, by, at.z, PARADE_SCALE, PARADE_SCALE, 0.06, hue)
      painter.string(at.x + 0.3, by - BALLOON * 1.32 * PARADE_SCALE, at.z, at.x, at.y + hop + BODIES[troop.kind].height * FRIEND_SCALE * PARADE_SCALE * 0.95, at.z, hue, 0.03)
    }
  }

  /**
   * The loose end of a bunch's string, hanging `long` from where it is tied and drifting `drift` to the side. While
   * it whips it is drawn in two pieces, the tip lagging behind the middle, so it lashes like a string and does not
   * swing like a stick.
   */
  private looseEnd(painter: Painter, x: number, y: number, drift: number, long: number, place: Place, colour: string): void {
    if (Math.abs(place.whip) < 0.004 && Math.abs(place.whipSpeed) < 0.06) {
      painter.string(x, y, 0, x + drift, y - long, 0, colour)
      return
    }
    const midX = x + drift * 0.5 + place.whip * long * 0.5, midY = y - long * 0.5
    painter.string(x, y, 0, midX, midY, 0, colour)
    painter.string(midX, midY, 0, x + drift + (place.whip - place.whipSpeed * 0.035) * long, y - long * (1 - Math.min(0.25, Math.abs(place.whip) * 0.35)), 0, colour)
  }

  /** One friend of a troop that is only passing, at `x`, `u` of the way through its walk. One that holds a balloon carries it along. */
  private passing(painter: Painter, name: string, troop: Passing, i: number, x: number, u: number, seed: number, cross = false): void {
    const pose = this.pose, plan = BODIES[troop.kind], colour = KIND_COLOURS[troop.kind], actor = troop.actors[i]
    copyPose(pose, REST)
    pose.x = x
    pose.y = groundAt(x, 0)
    pose.scale = FRIEND_SCALE
    rest(troop.kind, troop.held[i], plan.reach, this.time, seed, pose)
    walk(troop.kind, u, 1, pose)
    if (actor.clip && actor.t >= 0) clip(troop.kind, actor.clip, actor.t, plan.height * FRIEND_SCALE, plan.reach, pose)
    // One that was in the air when its troop set off comes down as it goes.
    if (actor.fall) pose.y += actor.fall * (1 - ((actor.fallT ?? 0) / FALLS_IN) ** 2)
    painter.place(name, troop.kind, pose)
    painter.shadow(pose.x, groundAt(x, 0) + 0.02, 0.1, plan.halfWidth * FRIEND_SCALE * 1.05, 0.55, shade(colour, -0.35))
    if (!troop.held[i]) return
    handOf(plan, pose, this.hand)
    // Its balloon trails a little behind the hand as it goes.
    const trail = u > 0 && u < 1 ? -0.45 : 0.5
    const bx = this.hand.x + trail + Math.sin(this.time * 1.4 + seed) * 0.1, by = pose.y + HELD_HEIGHT + Math.sin(this.time * 1.7 + seed * 2) * 0.07
    const lean = (this.hand.x - bx) * -0.2
    // A duck or a hippo that passes takes the string by its mouth first, as its kind does.
    if (actor.clip === 'catch' && actor.t >= 0) this.byMouth(troop.kind, actor.t, pose)
    painter.balloon(bx, by, 0.3, 1, 1, lean, colour)
    const tailX = bx + Math.sin(lean) * BALLOON * 1.32, tailY = by - Math.cos(lean) * BALLOON * 1.32
    painter.string(tailX, tailY, 0.3, this.hand.x, this.hand.y, this.hand.z, shade(colour, -0.3))
    // A frog that passes takes its balloon as every frog does: the tongue out to it, and in again. Two or three
    // that take one bunch each go for the balloon on the far side of it, so their tongues cross in the air.
    if (troop.kind === 'frog' && actor.clip === 'catch' && actor.t >= 0) {
      const mouthY = pose.y + (plan.neck[1] + plan.mouth[1]) * pose.scale * pose.squash, mouthZ = (plan.neck[2] + plan.mouth[2]) * pose.scale
      const across = cross ? (troop.size - 1 - 2 * i) * FRIEND_GAP : 0
      this.lick(painter, pose.x, mouthY, mouthZ, tailX + across, tailY, 0.3, hold(actor.t, 0.1, 0.2, 0.3, 0.45), shade(colour, 0.34))
    }
  }

  /**
   * The duck catches the string in its beak and the hippo lets it drop into its yawn; the hand takes it as the catch
   * ends. Moves `this.hand`, which holds where the string hand is, to where the string is held `t` seconds into the catch.
   */
  private byMouth(kind: KindName, t: number, pose: Pose): void {
    if (kind !== 'duck' && kind !== 'hippo') return
    const plan = BODIES[kind], lasts = PERSONALITIES[kind].lasts.catch
    const taken = ramp(t, lasts * 0.55, lasts * 0.92)
    const c = Math.cos(pose.nod), n = Math.sin(pose.nod), wide = spread(pose.squash)
    const mx = pose.x + plan.mouth[0] * wide * pose.scale
    const my = pose.y + (plan.neck[1] + plan.mouth[1] * c - plan.mouth[2] * n) * pose.squash * pose.scale
    const mz = pose.z + (plan.neck[2] + plan.mouth[1] * n + plan.mouth[2] * c) * wide * pose.scale
    this.hand.x = mx + (this.hand.x - mx) * taken
    this.hand.y = my + (this.hand.y - my) * taken
    this.hand.z = mz + (this.hand.z - mz) * taken
  }

  /** The frog meets its balloon with its tongue: out to the balloon as it comes down, and in with it. */
  private tongue(friend: number, t: number, pose: Pose, painter: Painter, colour: string): void {
    const out = Math.min(1, Math.max(0, (t - 0.1) / 0.1))
    if (out <= 0) return
    for (const flight of this.flights) {
      if (flight.landed || flight.given.result !== 'taken') continue
      const k = flight.given.takers.indexOf(friend)
      if (k < 0) continue
      // When two or three frogs take from one bunch, each goes for the balloon on the far side of it, so the tongues cross in the air.
      const takers = flight.given.takers.length
      const at = this.along(flight), offset = bunchOffsets(flight.bunch.count)[takers > 1 ? takers - 1 - k : k], big = this.lastView.balloon
      const plan = BODIES.frog
      const mouthX = pose.x, mouthY = pose.y + (plan.neck[1] + plan.mouth[1]) * pose.scale * pose.squash, mouthZ = (plan.neck[2] + plan.mouth[2]) * pose.scale
      const tipX = at.x + offset.x * big, tipY = at.y + (offset.y - BALLOON * 1.25) * big
      this.lick(painter, mouthX, mouthY, mouthZ, tipX, tipY, 0.35, out, colour)
    }
  }

  /**
   * A frog's tongue, `out` of the way from its mouth to where it is going. It is flung, so it bows out and down on
   * its way like a thrown rope, and it ends in a fat sticky pad. Two tongues that cross are two bows with a pad
   * each, which read as tongues; two straight bars that crossed would read as a sign.
   */
  private lick(painter: Painter, fromX: number, fromY: number, fromZ: number, toX: number, toY: number, toZ: number, out: number, colour: string): void {
    const dx = toX - fromX, dy = toY - fromY, long = Math.hypot(dx, dy)
    if (long < 1e-3 || out <= 0) return
    // The bow is to the side the tongue leans to, and downwards: the middle of the rope lags behind its ends.
    const side = dx >= 0 ? 1 : -1, bow = Math.min(0.9, Math.abs(dx) * 0.42)
    const viaX = fromX + dx * 0.5 + (dy / long) * side * bow, viaY = fromY + dy * 0.5 - (Math.abs(dx) / long) * bow
    let x = fromX, y = fromY, z = fromZ
    for (let piece = 1; piece <= TONGUE_PIECES; piece++) {
      const u = (piece / TONGUE_PIECES) * out, v = 1 - u
      const nextX = v * v * fromX + 2 * v * u * viaX + u * u * toX, nextY = v * v * fromY + 2 * v * u * viaY + u * u * toY, nextZ = fromZ + (toZ - fromZ) * u
      painter.string(x, y, z, nextX, nextY, nextZ, colour, 0.07)
      if (piece === TONGUE_PIECES) {
        const step = Math.hypot(nextX - x, nextY - y) || 1
        painter.string(nextX, nextY, nextZ, nextX + ((nextX - x) / step) * 0.16, nextY + ((nextY - y) / step) * 0.16, nextZ, colour, 0.13)
      }
      x = nextX; y = nextY; z = nextZ
    }
  }

  /** Where a flight is now: up a little as it lets go of the sky, then down in a swoop. */
  private along(flight: Flight): { x: number; y: number; u: number } {
    const to = this.target(flight), u = Math.min(1, flight.t / FLIGHT), eased = u * u * (3 - 2 * u)
    return { x: flight.fromX + (to.x - flight.fromX) * eased, y: flight.fromY + (to.y - flight.fromY) * eased + Math.sin(u * Math.PI) * 0.5 * (1 - u), u }
  }

  /** A friend rides the wobble of the hill after it was touched, and blinks under a cloud's drops. */
  private ride(pose: Pose, seed: number): void {
    const since = this.time - this.wobbled
    if (since < 1.2) {
      const fade = Math.exp(-since * 3.2)
      pose.y += Math.max(0, Math.sin(since * 11 - seed * 0.6)) * 0.16 * fade
      pose.squash += Math.sin(since * 16 - seed * 0.6) * 0.07 * fade
    }
    if (this.time < this.flinchUntil) {
      pose.blink = 1
      pose.squash -= 0.05
      pose.nod += 0.25
    }
  }

  /** A friend at rest follows with its head whatever is coming down to it. */
  private watch(friend: number, pose: Pose): void {
    if (this.actors[friend].clip) return
    for (const flight of this.flights) {
      if (flight.landed || flight.friend !== friend) continue
      const u = Math.min(1, flight.t / FLIGHT)
      pose.headTurn += Math.max(-0.5, Math.min(0.5, (flight.fromX - pose.x) * 0.12)) * (1 - u)
      pose.nod -= 0.15 * (1 - u)
      pose.squash -= 0.05 * u
    }
  }
}

/**
 * Where a posed friend's string hand is (or its other hand, with `left`), in world units: the same sum the meshes make (the arm's swing about the
 * shoulder, the squash, then the whole toy's turn, lean and bow about its feet), done in numbers so the theatre
 * needs no renderer. A test holds it against the meshes.
 */
export function handOf(plan: { hand: readonly [number, number, number]; shoulder: readonly [number, number, number]; lowest: number }, pose: Pose, out: { x: number; y: number; z: number }, left = false): { x: number; y: number; z: number } {
  // The right arm is the left one mirrored: each swings out to its own side, then forwards.
  const side = left ? -1 : 1, swing = left ? -Math.max(plan.lowest, pose.armL) : Math.max(plan.lowest, pose.armR), forward = left ? pose.armLForward : pose.armRForward
  let x = -side * plan.hand[0], y = plan.hand[1], z = plan.hand[2], c = Math.cos(swing), s = Math.sin(swing), t = 0
  t = x * c - y * s; y = x * s + y * c; x = t
  // Round to the front on its way, the left arm one way about and the right the other.
  const round = -side * forwardOf(Math.abs(swing))
  c = Math.cos(round); s = Math.sin(round)
  t = x * c + z * s; z = -x * s + z * c; x = t
  c = Math.cos(-forward); s = Math.sin(-forward)
  t = y * c - z * s; z = y * s + z * c; y = t
  const wide = spread(pose.squash)
  x = (x - side * plan.shoulder[0]) * wide
  y = (y + plan.shoulder[1]) * pose.squash
  z = (z + plan.shoulder[2]) * wide
  c = Math.cos(pose.lean); s = Math.sin(pose.lean)
  t = x * c - y * s; y = x * s + y * c; x = t
  c = Math.cos(pose.turn); s = Math.sin(pose.turn)
  t = x * c + z * s; z = -x * s + z * c; x = t
  c = Math.cos(pose.bow); s = Math.sin(pose.bow)
  t = y * c - z * s; z = y * s + z * c; y = t
  out.x = pose.x + x * pose.scale
  out.y = pose.y + y * pose.scale
  out.z = pose.z + z * pose.scale
  return out
}
