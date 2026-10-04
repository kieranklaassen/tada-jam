import * as THREE from 'three'
import { makeFigure, type Figure } from './figurines'
import { waitingSpot } from './hint'
import type { Spot } from './layout'
import { Director, kindOf, type ActionKind, type MoverKind, type Pose } from './motion'
import { sizeOfGuest } from './stage'
import type { GuestId } from './world'

// The guests on the stage: each figurine with its own director (motion.ts),
// where it stands, where it is walking to, and what it is looking at. The
// director says how a guest moves; this maps its pose onto the figurine's
// parts and walks it from spot to spot in its own step. Nothing here knows a
// rule: it is told who sits where, and what each one does.

/** Table units a second each kind of guest covers on foot when it is led by the finger. */
const PACE: Record<MoverKind, number> = { bear: 2.6, mouse: 5.2, hen: 3.8, duckling: 3.4 }
/** A party that comes in or goes out keeps one pace, so nobody overtakes anybody: each still steps in its own step. */
const PARTY_PACE = 3.4
/** A waiting guest stands before the gate, further off, and is drawn smaller; it grows as it comes in. */
const WAITING_SCALE = 0.5
/** Every guest sits with its head a little bowed, toward its cup. */
const NOD = 0.18
const ACROSS = new THREE.Vector3(1, 0, 0)

type Mover = {
  who: GuestId
  figure: Figure
  director: Director
  at: Spot
  to: Spot
  /** Where it set out from when it came in. */
  from: Spot
  /**
   * A walk past another guest: how far out of the row it steps to one side,
   * which leg of the walk it is on (1 stepping out, 2 along its lane, 3
   * stepping back in; 0 for a straight walk), and whom it is passing.
   */
  lane: number
  leg: 0 | 1 | 2 | 3
  passing: Mover | null
  /** It walks off the table and is gone when it gets there. */
  leaving: boolean
  /** It has just come in, and settles into its seat when it arrives. */
  entering: boolean
  /** Seconds it still waits at the gate before it sets off: a party comes in one behind another. */
  hold: number
  /** How far the cup in its paw is lifted over its head, 0 to 1: a guest on foot carries its cup high, out of everyone's way. */
  aloft: number
  /** How far it holds the cup in its paw over its head, 0 to 1: up while it is on foot, and all the while it stands at the gate. */
  raised: number
  /** It waits at the gate for the child's touch. */
  waiting: boolean
  /** What it looks at, or null for its own cup. */
  look: Spot | null
  yaw: number
  yawSpeed: number
  facing: number
}

export class Troupe {
  readonly group = new THREE.Group()
  private readonly movers: Mover[] = []
  private readonly glaze: THREE.Material
  private readonly segments: number
  private now = 0

  constructor(glaze: THREE.Material, segments: number) {
    this.glaze = glaze
    this.segments = segments
    this.group.name = 'guests'
  }

  private add(who: GuestId, at: Spot, seed: number): Mover {
    const figure = makeFigure(who, this.glaze, this.segments)
    const mover: Mover = { who, figure, director: new Director(who, seed, who === 'duckling-b' ? 0.3 : 0), at: { ...at }, to: { ...at }, from: { ...at }, lane: 0, leg: 0, passing: null, leaving: false, entering: false, hold: 0, aloft: 0, raised: 0, waiting: false, look: null, yaw: 0, yawSpeed: 0, facing: 0 }
    this.movers.push(mover)
    this.group.add(figure.root)
    return mover
  }

  private remove(mover: Mover): void {
    this.group.remove(mover.figure.root)
    mover.figure.root.traverse((node) => { if (node instanceof THREE.Mesh) node.geometry.dispose() })
    this.movers.splice(this.movers.indexOf(mover), 1)
  }

  private seated(who: GuestId): Mover | undefined {
    return this.movers.find((mover) => mover.who === who && !mover.leaving && !mover.waiting)
  }

  /**
   * The guests at the table and the party at the gate. A guest already at the
   * table walks to its seat if that has moved; one who is no longer in the
   * party walks out by the gate; a new one walks in from the gate, or with
   * `atOnce` is simply there.
   */
  setParty(guests: readonly { who: GuestId; seat: Spot }[], waiting: readonly GuestId[], atOnce: boolean): void {
    for (const mover of [...this.movers]) {
      if (mover.waiting || (atOnce && !guests.some((guest) => guest.who === mover.who))) this.remove(mover)
      else if (!mover.leaving && !guests.some((guest) => guest.who === mover.who)) {
        // It goes off along its row to the right, away from the gate the next party comes in by.
        mover.leaving = true
        mover.to = { x: 9.5, z: mover.at.z }
      }
    }
    const entering: Mover[] = []
    guests.forEach((guest, index) => {
      // A guest who is on its way out and is wanted again is a new arrival: the one leaving finishes leaving.
      let mover = this.seated(guest.who)
      if (!mover) {
        mover = this.add(guest.who, atOnce ? guest.seat : waitingSpot(index), 11 + index * 7)
        mover.entering = !atOnce
        if (!atOnce) {
          entering.push(mover)
          mover.raised = 1
        }
      }
      mover.to = { ...guest.seat }
      if (atOnce) mover.at = { ...guest.seat }
    })
    // They come in one behind another, the one for the farthest seat first, each far enough behind the last that the
    // two never touch: nobody passes anybody, and each stops at its own seat with the rest already past it.
    entering.sort((a, b) => b.to.x - a.to.x)
    entering.forEach((mover, index) => {
      const ahead = entering[index - 1]
      if (ahead) mover.hold = ahead.hold + (sizeOfGuest(ahead.who).walking + sizeOfGuest(mover.who).walking + 0.25 + Math.max(0, mover.at.x - ahead.at.x)) / PARTY_PACE
    })
    waiting.forEach((who, index) => {
      const mover = this.add(who, waitingSpot(index), 101 + index * 13)
      mover.waiting = true
      mover.raised = 1
    })
  }

  /** The guest of this name that a thing of the table goes with: the one at the table or on its way in, or else the one that waits at the gate. Never one that is walking off, which has taken its cup with it. */
  private holder(who: GuestId): Mover | undefined {
    return this.seated(who) ?? this.movers.find((candidate) => candidate.who === who && candidate.waiting)
  }

  do(who: GuestId, kind: ActionKind): void {
    const mover = this.seated(who)
    if (!mover) return
    if (kind === 'settle') mover.director.settled = false
    mover.director.trigger(kind, this.now)
  }

  /** A guest holds an action of this kind for as long as its cause lasts, or lets it go with null. */
  hold(who: GuestId, kind: ActionKind | null): void {
    const mover = this.seated(who)
    if (mover) mover.director.hold(kind, this.now)
  }

  settled(who: GuestId): void {
    const mover = this.seated(who)
    if (mover) mover.director.settled = true
  }

  look(who: GuestId, at: Spot | null): void {
    const mover = this.seated(who)
    if (mover) mover.look = at
  }

  /** A guest walks off along its row to the right, away from the gate the next party comes in by, and is then gone. */
  leave(who: GuestId): void {
    const mover = this.seated(who)
    if (!mover) return
    mover.leaving = true
    mover.leg = 0
    mover.passing = null
    mover.to = { x: 9.5, z: mover.at.z }
  }

  /**
   * A guest walks to a spot. With a lane it walks past the guest named: it
   * steps out of the row to its side first, walks along its lane, and steps
   * back in at its seat once the other is out of its way, so the two are as
   * far apart as the row allows for the whole of the passing.
   */
  walk(who: GuestId, to: Spot, lane = 0, past: GuestId | null = null): void {
    const mover = this.movers.find((candidate) => candidate.who === who && !candidate.waiting)
    if (!mover) return
    mover.to = { ...to }
    mover.lane = lane
    mover.leg = lane !== 0 ? 1 : 0
    mover.passing = lane !== 0 && past ? this.seated(past) ?? null : null
  }

  rest(): void {
    for (const mover of this.movers) mover.director.finish()
  }

  /** Every guest that is drawn, where it stands and how big it is at this moment: what a carried thing must rise over. */
  standing(): { who: GuestId; x: number; z: number; girth: number; height: number; scale: number }[] {
    return this.movers.map((mover) => {
      const size = sizeOfGuest(mover.who), scale = mover.figure.root.scale.y
      // Its ears and comb count: `crown` is over those.
      return { who: mover.who, x: mover.at.x, z: mover.at.z, girth: size.girth * scale, height: Math.max(size.height, size.crown) * scale, scale }
    })
  }

  /** Whether every guest of the party is at its seat: none is still walking in, or waiting its turn to. */
  seatedAll(): boolean {
    return this.movers.every((mover) => mover.leaving || mover.waiting || (!mover.entering && mover.hold <= 0))
  }

  /** Where a guest that is walking off is at this moment, or null once it has gone. */
  leavingSpot(who: GuestId): Spot | null {
    const mover = this.movers.find((candidate) => candidate.who === who && candidate.leaving)
    return mover ? mover.at : null
  }

  /** How big a guest is drawn at this moment: half size at the gate, full size at the table. */
  scaleOf(who: GuestId): number {
    const mover = this.holder(who)
    return mover ? mover.figure.root.scale.y : 1
  }

  /** How far a guest has the cup from its place over its head at this moment, 0 on the saucer to 1 overhead: up while it is on foot. */
  aloftOf(who: GuestId): number {
    const mover = this.holder(who)
    return mover ? mover.aloft : 0
  }

  /** How far a guest holds the cup in its paw over its head at this moment, 0 in the paw to 1 overhead: up while it is on foot or stands at the gate, where a cup held out would be in its neighbour. */
  raisedOf(who: GuestId): number {
    const mover = this.holder(who)
    return mover ? mover.raised : 0
  }

  /** Whether a guest is drawn at the table, so a cup in its paw can be drawn too. */
  has(who: GuestId): boolean {
    return this.seated(who) !== undefined
  }

  /** Where a guest stands now, which is not its seat while it walks. */
  spotOf(who: GuestId): Spot | null {
    const mover = this.holder(who)
    return mover ? mover.at : null
  }

  /** How far a guest is lifted at this moment, for the cup in its paw to ride along. */
  ride(who: GuestId): number {
    const mover = this.seated(who)
    return mover ? mover.figure.root.position.y : 0
  }

  /**
   * Where a point of a guest's head is at this moment, and how the head is
   * tipped and turned: what it wears sits there and goes with every hop,
   * stretch, nod and turn. The point is given as it is when the guest sits
   * still: how high above the cloth, and how far before its middle. Returns
   * null for a guest that is not at the table.
   */
  onHead(who: GuestId, height: number, forward: number, out: THREE.Vector3): { pitch: number; yaw: number; roll: number } | null {
    const mover = this.seated(who)
    if (!mover) return null
    const { head, root, headAt } = mover.figure
    out.set(0, height - headAt, forward).applyAxisAngle(ACROSS, -NOD)
    head.updateWorldMatrix(true, false)
    out.applyMatrix4(head.matrixWorld)
    return { pitch: head.rotation.x - NOD + root.rotation.x, yaw: head.rotation.y + root.rotation.y, roll: head.rotation.z + root.rotation.z }
  }

  /** One frame: each guest walks, moves like itself, and looks at what it is watching. `watch` is where the pot is. */
  update(dt: number, now: number, watch: Spot, shadow: (x: number, z: number, size: number) => void): void {
    this.now = now
    for (const mover of [...this.movers]) {
      const kind = kindOf(mover.who)
      // Where it is heading on this leg of its walk: out to its lane, along it, or to the spot itself.
      const goal = mover.leg === 1 ? { x: mover.at.x, z: mover.to.z + mover.lane } : mover.leg === 2 ? { x: mover.to.x, z: mover.to.z + mover.lane } : mover.to
      const dx = goal.x - mover.at.x, dz = goal.z - mover.at.z
      const gap = Math.hypot(dx, dz)
      mover.hold = Math.max(0, mover.hold - dt)
      const walking = gap > 0.02 && mover.hold <= 0
      mover.aloft += ((walking || mover.leg !== 0 ? 1 : 0) - mover.aloft) * Math.min(1, dt * (walking ? 12 : 5))
      mover.raised += ((walking || mover.leg !== 0 || mover.waiting || mover.entering ? 1 : 0) - mover.raised) * Math.min(1, dt * (walking ? 12 : 5))
      if (walking) {
        const pace = Math.min(gap, (mover.leaving || mover.entering ? PARTY_PACE : PACE[kind]) * dt)
        mover.at.x += (dx / gap) * pace
        mover.at.z += (dz / gap) * pace
        // One step of its own walk after another, for as long as it is on its way.
        if (!mover.director.busy(now)) mover.director.trigger('step', now)
      } else if (mover.leg !== 0) {
        mover.at = { ...goal }
        // The end of a leg. It steps back into the row only when the one it passed is out of its way.
        const other = mover.passing && this.movers.includes(mover.passing) ? mover.passing : null
        const clear = !other || Math.abs(other.at.x - mover.at.x) >= sizeOfGuest(other.who).walking + sizeOfGuest(mover.who).walking + 0.1 || (other.leg === 0 && Math.abs(other.at.z - other.to.z) < 0.02 && Math.abs(other.at.x - mover.at.x) > 0.5)
        if (mover.leg === 1) mover.leg = 2
        else if (mover.leg === 2 && clear) mover.leg = 3
        else if (mover.leg === 3) {
          mover.leg = 0
          mover.passing = null
        }
      } else if (mover.hold <= 0 && (gap > 0 || mover.leaving || mover.entering)) {
        // It is there, to the hair or exactly: one that leaves is gone, one that comes in has arrived.
        mover.at = { ...mover.to }
        if (mover.leaving) {
          this.remove(mover)
          continue
        }
        if (mover.entering) {
          mover.entering = false
          mover.director.trigger('arrive', now)
        }
      }
      // It turns the way it walks, and faces the child when it stands.
      const want = walking ? Math.atan2(dx, dz) : 0
      mover.facing += Math.atan2(Math.sin(want - mover.facing), Math.cos(want - mover.facing)) * Math.min(1, dt * 9)
      // The Ducklings settle against each other: each leans toward the side its twin sits on.
      const twin = mover.who === 'duckling-a' ? this.seated('duckling-b') : mover.who === 'duckling-b' ? this.seated('duckling-a') : undefined
      mover.director.side = twin && twin.at.x > mover.at.x ? -1 : 1
      const pose = mover.director.sample(now)
      this.pose(mover, pose, dt, watch, walking)
      // A guest on its way in grows from its size at the gate to its size at the table over the first stretch of the walk.
      const grown = mover.waiting ? 0 : mover.entering ? Math.min(1, Math.hypot(mover.at.x - mover.from.x, mover.at.z - mover.from.z) / 1.6) : 1
      const scale = WAITING_SCALE + (1 - WAITING_SCALE) * grown
      mover.figure.root.scale.setScalar(scale)
      // One that has walked off the table is gone.
      if (mover.leaving && mover.at.x > 8.4) {
        this.remove(mover)
        continue
      }
      shadow(mover.at.x, mover.at.z + 0.1 * scale, sizeOfGuest(mover.who).girth * 1.45 * scale * (1 - Math.min(0.4, pose.lift * 0.3)))
    }
  }

  private pose(mover: Mover, pose: Pose, dt: number, watch: Spot, walking: boolean): void {
    const { figure } = mover
    // It leans and rolls on the rim of its foot, never through the cloth: the rim that goes down stays on the table.
    const dip = figure.foot * (Math.abs(Math.sin(pose.lean)) + Math.abs(Math.sin(pose.roll)))
    figure.root.position.set(mover.at.x, (Math.max(0, pose.lift) + dip) * figure.root.scale.y, mover.at.z)
    figure.root.rotation.set(pose.lean, mover.facing + pose.twist, pose.roll)
    figure.body.scale.set(1 - pose.squash * 0.5, 1 + pose.squash, 1 - pose.squash * 0.5)
    // The head turns toward what the guest watches on a spring of its own: a waiting guest watches the table, a seated one its cup and the pot.
    const target = mover.look ?? (mover.waiting ? { x: 0, z: 0.3 } : Math.sin(this.now * 0.5 + mover.at.x) > 0.55 ? watch : null)
    const wantYaw = target && !walking ? Math.max(-1.1, Math.min(1.1, Math.atan2(target.x - mover.at.x, target.z - mover.at.z))) : 0
    const look = mover.director.personality.look
    mover.yawSpeed += (look.stiffness * (wantYaw - mover.yaw) - look.damping * mover.yawSpeed) * Math.min(dt, 0.05)
    mover.yaw += mover.yawSpeed * Math.min(dt, 0.05)
    figure.head.rotation.set(NOD + pose.headPitch, mover.yaw + pose.headYaw, pose.headRoll)
    figure.eyes.scale.y = Math.max(0.05, pose.eyes)
    const kind = kindOf(mover.who)
    if (kind === 'bear') figure.funny.rotation.set(-pose.funny, 0, pose.funnyTwist)
    else if (kind === 'mouse') figure.funny.rotation.set(0, pose.funnyTwist, pose.funny)
    // Her whiskers do what her tail does, about her snout: a twitch at rest, a spin when she is poked.
    if (figure.whiskers) figure.whiskers.rotation.z = (pose.funny + pose.funnyTwist) * 1.2
    else if (kind === 'hen') figure.funny.rotation.set(pose.funny, 0, pose.funnyTwist)
    else figure.funny.rotation.set(-pose.funny, pose.funnyTwist, 0)
  }

  dispose(): void {
    for (const mover of [...this.movers]) this.remove(mover)
  }
}
