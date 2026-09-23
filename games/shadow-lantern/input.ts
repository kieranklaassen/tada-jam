// Direct-touch gestures. The tracker turns raw pointer events into intents;
// the controller decides what an intent does. One finger on a shape slides
// it (a quick tap turns it); a second finger that lands off the shapes while
// one is held twists that shape freely. At most three fingers act at once: a
// fourth means a resting hand, so every gesture is cancelled and nothing
// fires until the whole hand lifts.

export type Point = { x: number; y: number }

export type Target =
  | { kind: 'shape'; index: number }
  | { kind: 'sky'; index: number }
  | { kind: 'sleeper' }
  | { kind: 'lamp' }
  | { kind: 'backdrop' }

export type Intent =
  | { type: 'press'; pointerId: number; target: Target; at: Point }
  | { type: 'tap'; pointerId: number; target: Target; at: Point }
  | { type: 'dragStart'; pointerId: number; target: Target; at: Point }
  | { type: 'dragMove'; pointerId: number; target: Target; at: Point }
  | { type: 'dragEnd'; pointerId: number; target: Target; at: Point }
  /** Turn the held shape by `delta` radians, clockwise on screen. */
  | { type: 'twist'; index: number; delta: number }
  | { type: 'cancelAll'; pointerIds: number[] }

export const MAX_FINGERS = 3
export const TAP_SLOP = 14
export const TAP_MAX_MS = 450

type Track = {
  target: Target
  start: Point & { t: number }
  at: Point
  dragging: boolean
  /** A twist involved this finger, so lifting it is not a tap. */
  twisted: boolean
  /** Inert until it lifts (a spent twist finger, or part of a resting hand). */
  inert: boolean
}

type Twist = { pointerId: number; anchorId: number; index: number; angle: number }

function wrap(angle: number): number {
  let a = angle
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export class GestureTracker {
  private tracks = new Map<number, Track>()
  private twist: Twist | null = null
  private resting = false
  private readonly hitTest: (at: Point) => Target

  constructor(hitTest: (at: Point) => Target) {
    this.hitTest = hitTest
  }

  get activeCount(): number {
    return this.tracks.size
  }

  /** The shape a finger is holding (pressing or dragging), if any. */
  heldShape(pointerId: number): number | null {
    const track = this.tracks.get(pointerId)
    return track && !track.inert && track.target.kind === 'shape' ? track.target.index : null
  }

  down(pointerId: number, at: Point, t: number): Intent[] {
    const start = { x: at.x, y: at.y, t }
    if (this.resting) {
      this.tracks.set(pointerId, { target: { kind: 'backdrop' }, start, at: { ...at }, dragging: false, twisted: false, inert: true })
      return []
    }
    if (this.tracks.size >= MAX_FINGERS) {
      const pointerIds = [...this.tracks.keys()]
      this.resting = true
      this.twist = null
      for (const track of this.tracks.values()) track.inert = true
      this.tracks.set(pointerId, { target: { kind: 'backdrop' }, start, at: { ...at }, dragging: false, twisted: false, inert: true })
      return [{ type: 'cancelAll', pointerIds }]
    }
    const target = this.hitTest(at)
    const track: Track = { target, start, at: { ...at }, dragging: false, twisted: false, inert: false }
    this.tracks.set(pointerId, track)
    if (target.kind !== 'shape' && !this.twist) {
      const anchor = this.newestShapeFinger(pointerId)
      if (anchor) {
        const anchorTrack = this.tracks.get(anchor)!
        track.twisted = true
        anchorTrack.twisted = true
        this.twist = { pointerId, anchorId: anchor, index: (anchorTrack.target as { index: number }).index, angle: Math.atan2(at.y - anchorTrack.at.y, at.x - anchorTrack.at.x) }
        return []
      }
    }
    return [{ type: 'press', pointerId, target, at }]
  }

  move(pointerId: number, at: Point): Intent[] {
    const track = this.tracks.get(pointerId)
    if (!track || this.resting || track.inert) return []
    track.at.x = at.x
    track.at.y = at.y
    const intents: Intent[] = []
    const twist = this.twist
    if (twist && twist.pointerId === pointerId) return this.twistIntent(intents)
    if (!track.dragging && Math.hypot(at.x - track.start.x, at.y - track.start.y) > TAP_SLOP) {
      track.dragging = true
      intents.push({ type: 'dragStart', pointerId, target: track.target, at: { x: track.start.x, y: track.start.y } })
    }
    if (track.dragging) intents.push({ type: 'dragMove', pointerId, target: track.target, at })
    if (twist && twist.anchorId === pointerId) this.twistIntent(intents)
    return intents
  }

  up(pointerId: number, at: Point, t: number): Intent[] {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return []
    }
    if (!track || track.inert) return []
    if (this.twist && (this.twist.pointerId === pointerId || this.twist.anchorId === pointerId)) this.endTwist(pointerId)
    if (track.dragging) return [{ type: 'dragEnd', pointerId, target: track.target, at }]
    if (!track.twisted && t - track.start.t <= TAP_MAX_MS) return [{ type: 'tap', pointerId, target: track.target, at }]
    return []
  }

  cancel(pointerId: number): Intent[] {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return []
    }
    if (this.twist && (this.twist.pointerId === pointerId || this.twist.anchorId === pointerId)) this.endTwist(pointerId)
    if (track && !track.inert && track.dragging) return [{ type: 'dragEnd', pointerId, target: track.target, at: { ...track.at } }]
    return []
  }

  /** Forget every finger, e.g. when the theatre is put away mid-touch and the lift never arrives. */
  reset(): void {
    this.tracks.clear()
    this.twist = null
    this.resting = false
  }

  private endTwist(liftedId: number): void {
    const twist = this.twist!
    this.twist = null
    // The twisting finger outlives its anchor: it goes quiet until it lifts.
    if (twist.anchorId === liftedId) {
      const finger = this.tracks.get(twist.pointerId)
      if (finger) finger.inert = true
    }
  }

  private twistIntent(intents: Intent[]): Intent[] {
    const twist = this.twist!
    const finger = this.tracks.get(twist.pointerId)
    const anchor = this.tracks.get(twist.anchorId)
    if (!finger || !anchor) return intents
    const angle = Math.atan2(finger.at.y - anchor.at.y, finger.at.x - anchor.at.x)
    const delta = wrap(angle - twist.angle)
    twist.angle = angle
    if (delta !== 0) intents.push({ type: 'twist', index: twist.index, delta })
    return intents
  }

  private newestShapeFinger(except: number): number | null {
    let newest: number | null = null
    let newestT = -Infinity
    for (const [id, track] of this.tracks) {
      if (id === except || track.inert || track.target.kind !== 'shape') continue
      if (track.start.t >= newestT) {
        newest = id
        newestT = track.start.t
      }
    }
    return newest
  }
}
