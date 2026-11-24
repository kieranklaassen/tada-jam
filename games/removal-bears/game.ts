import { caughtSide, held, place, size, swapped, type Cell, type Placing } from './cells'
import { cellsOf, leftOf, layHouse, middleOf, solvable } from './houses'
import { CELLS, type Kind } from './loads'
import { MOST_BUMPS, move, type Load, type Saved } from './save'
import { AT_WALL, BEARS, CARRY, CUB_Z, DEPTH, ENTER_Z, FLAT, LANE, SILL, SLOTS, SLOT_Z, drawnAt } from './space'
import { finishCycle } from './state'
import { voices, type Cue } from './voices'

// The whole game with no browser in it. Fingers arrive as targets and points
// as drawn, time as seconds; what is drawn and heard is read off. One thing
// happens at a time with the load in hand (an act), and what a finger asks for
// meanwhile waits its turn, so no touch is lost and none cuts through another.
// Everything that is saved is saved when an act starts (ART.md, "stored"); the
// act is a view of it.

export type Target =
  | { type: 'load' } | { type: 'bear'; who: 0 | 1 } | { type: 'opening'; i: number } | { type: 'cart' } | { type: 'cub' }
  | { type: 'inside'; i: number } | { type: 'wall'; u: number; v: number } | { type: 'cloth'; u: number; v: number } | { type: 'kitchen'; u: number; v: number }

export type Pose = { x: number; y: number; z: number; angle: number; flip: number; back: boolean; sx: number; sy: number; sz: number }
export type BearPose = { x: number; y: number; z: number; squash: number; lean: number; nod: number; hands: [P3, P3]; look: { u: number; v: number }; mood: 'calm' | 'strain' | 'flat' | 'glad' | 'ouch' | 'wait'; blink: number; wet: number; sit: number }
type P3 = { x: number; y: number; z: number }
export type Dent = { col: number; row: number; push: number; v: number }
export type Crumb = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; kind: 'sugar' | 'milk' | 'crumb'; size: number }

type Want = { do: 'turn' } | { do: 'swap' } | { do: 'heave'; i: number }
type Act =
  | { kind: 'turn'; t: number; lasts: number; from: { w: number; h: number }; to: { w: number; h: number }; a0: number; show?: boolean }
  | { kind: 'swap'; t: number; a0: number; show?: boolean }
  | { kind: 'walk'; t: number; i: number }
  | { kind: 'in'; t: number; i: number; load: number; x: number; cx: number; cy: number; fromY: number; slotX: number; last: boolean; said: number }
  | { kind: 'bump'; t: number; i: number; x: number; cx: number; cy: number; fromY: number; side: -1 | 0 | 1; blocked: Cell[]; near: boolean; show: boolean; said: number }
  | { kind: 'deliver'; t: number; load: number; fromX: number }
  | { kind: 'ending'; t: number; said: number }
  | { kind: 'move'; t: number; swappedHouse: boolean }

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v))
const span = (t: number, a: number, b: number): number => clamp((t - a) / (b - a), 0, 1)
const smooth = (t: number): number => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const arc = (t: number): number => 4 * t * (1 - t)
/** A settle that overshoots and rings. */
const ring = (t: number, many = 2, fade = 4): number => Math.exp(-fade * t) * Math.cos(many * Math.PI * 2 * t)

export const TICK = 1 / 120
/** A heave: the crouch, the flight, then through the wall or against it. */
const CROUCH = 0.2, FLY = 0.36
const FLOWN = CROUCH + FLY
export const ENDING = 8
export const MOVE = 1.9

export class Game {
  saved: Saved
  dirty: null | 'soon' | 'now' = null
  readonly cues: Cue[] = []
  act: Act | null = null
  readonly wants: Want[] = []
  time = 0

  /** How far the load's own spin has got, kept across turns so it never unwinds. */
  private angle = 0
  private x = 0
  private vx = 0
  private lift = 0
  private vLift = 0
  private press = 0
  private vPress = 0
  private dragX: number | null = null
  private dragLift = 0
  private dragFrom = 0
  private grabbed: { x: number; u: number; v: number } | null = null
  private rest = 0
  private cartX = 6
  private frontLift = 0
  private houseX = 0
  private readonly poke = [0, 0, 0]
  private readonly pokeV = [0, 0, 0]
  private readonly wetLeft = [0, 0]
  private finger = { u: 0, v: 2, since: 99 }
  private cubX = 0
  private cubHop = 0
  private cubOn = -1
  private cubPoke = 99
  private cartPoke = 99
  private readonly insidePoke = [99, 99, 99]
  private riderAt = 99
  riderEvent: { kind: Kind; what: 'turn' | 'swap' | 'bump' | 'in' | 'poke' | 'cub'; at: number } | null = null
  private count = 0
  private left = 0
  private half = 1.6
  readonly dents = new Map<string, Dent>()
  readonly crumbs: Crumb[] = []
  private chance = 12345
  private showing = false
  private begun = false

  constructor(saved: Saved) {
    this.saved = saved
    this.settle()
  }

  // --- what the view reads ---------------------------------------------------

  get hands(): number { return this.saved.loads.findIndex((l) => l.at === 'hands') }
  /** The load that waits on the cart: of this house, or the first of the next. */
  get waiting(): { kind: Kind; load: Load | null } | null {
    if (this.act?.kind === 'deliver') {
      const after = this.saved.loads.find((l) => l.at === 'cart')
      return after ? { kind: after.kind, load: after } : null
    }
    if (this.act?.kind === 'in' && !this.act.last) { const l = this.saved.loads.find((one) => one.at === 'cart'); return l ? { kind: l.kind, load: l } : null }
    if (this.saved.next) { const laid = this.saved.next.loads[0]; return this.act?.kind === 'in' ? null : { kind: laid.kind, load: { ...laid, at: 'cart', slot: 0 } } }
    const next = this.saved.loads.find((l) => l.at === 'cart')
    return next ? { kind: next.kind, load: next } : null
  }
  get sceneRunning(): boolean { return this.act !== null && this.act.kind !== 'walk' }
  get busy(): boolean { return this.act !== null || this.dragX !== null }
  get empty(): boolean { return this.hands < 0 }
  get front(): number { return this.frontLift }
  get house(): number { return this.houseX }
  get cart(): { x: number; squash: number } { return { x: this.cartX, squash: 1 + 0.12 * (this.cartPoke < 1 ? ring(this.cartPoke, 3) : 0) } }
  get bearsX(): number { return this.x }
  get spin(): number { return this.act?.kind === 'turn' ? 1 : 0 }

  /** The outline of the load in hand. */
  cells(load: Load | null = this.saved.loads[this.hands] ?? null): Cell[] { return load ? held(CELLS[load.kind], load.way) : [] }

  private extent(load: Load): { w: number; h: number } { return size(held(CELLS[load.kind], load.way)) }

  loadPose(i: number): Pose | null {
    const load = this.saved.loads[i], act = this.act
    const pose: Pose = { x: 0, y: 0, z: 0, angle: -load.way.turn * Math.PI / 2, flip: 0, back: load.way.back, sx: 1, sy: 1, sz: 1 }
    const { h } = this.extent(load)
    if (load.at === 'cart') {
      if (this.waiting?.load !== load) return null
      pose.x = this.cartX; pose.y = 1.02 + h / 2; pose.z = LANE
      const jig = this.cartPoke < 1 ? ring(this.cartPoke, 3) * 0.08 : 0
      pose.sy = 1 - jig
      return pose
    }
    if (act?.kind === 'in' && act.load === i) return this.inPose(pose, act, h)
    if (load.at === 'in') {
      pose.x = SLOTS[load.slot] + this.houseX; pose.y = SILL + h / 2 + 0.02; pose.z = SLOT_Z
      const since = this.insidePoke[i]
      if (since < 1.2) { const k = ring(since, 2.5) * 0.1; pose.sy = 1 - k; pose.y -= (h * k) / 2 }
      return pose
    }
    return this.handPose(pose, load, h)
  }

  /** The load that waits for the next house, which is not one of this house's. */
  nextPose(): Pose | null {
    const next = this.saved.next
    if (!next || this.waiting === null) return null
    const laid = next.loads[0], { h } = size(cellsOf(laid))
    const jig = this.cartPoke < 1 ? ring(this.cartPoke, 3) * 0.08 : 0
    return { x: this.cartX, y: 1.02 + h / 2, z: LANE, angle: -laid.way.turn * Math.PI / 2, flip: 0, back: laid.way.back, sx: 1, sy: 1 - jig, sz: 1 }
  }

  private handPose(pose: Pose, load: Load, h: number): Pose {
    const act = this.act
    pose.x = this.x; pose.z = LANE; pose.angle = this.angle
    const base = CARRY + this.lift
    pose.y = base + h / 2
    const k = this.press * 0.12
    pose.sy = 1 - k; pose.sx = 1 + k * 0.4; pose.y -= (h * k) / 2
    if (!act) { pose.y += Math.sin(this.time * 1.7) * 0.015 + 0.015; return pose }
    if (act.kind === 'turn') {
      const t = act.t / act.lasts, spin = smooth(span(t, 0.24, 0.76))
      const c0 = CARRY + act.from.h / 2, c1 = CARRY + act.to.h / 2, corner = Math.hypot(act.from.w, act.from.h) / 2
      const top = Math.max(0.5, corner - Math.min(act.from.h, act.to.h) / 2 + 0.25)
      pose.angle = act.a0 - spin * Math.PI / 2
      pose.y = lerp(c0, c1, smooth(span(t, 0.1, 0.9))) + arc(span(t, 0.1, 0.9)) * top + this.lift
      const dip = arc(span(t, 0, 0.14)) * 0.1 + (t > 0.9 ? arc(span(t, 0.9, 1)) * 0.12 : 0)
      pose.sy = 1 - dip; pose.sx = 1 + dip * 0.4
      pose.y -= dip * 0.5
      return pose
    }
    if (act.kind === 'swap') {
      pose.angle = act.a0; pose.flip = Math.PI * smooth(span(act.t, 0.08, 0.92))
      pose.y += Math.abs(Math.sin(act.t * 14)) * 0.05
      return pose
    }
    if (act.kind === 'walk') { pose.y += Math.abs(Math.sin(act.t * 13)) * 0.1; return pose }
    if (act.kind === 'deliver') {
      const t = span(act.t, 0.12, 0.82), e = extentTurn(load)
      pose.x = lerp(act.fromX, this.x, smooth(t))
      pose.y = lerp(1.02 + e.h / 2, CARRY + e.h / 2, t) + arc(t) * 5
      pose.z = LANE + arc(t) * 3
      if (act.t > 0.82) { const d = ring(act.t - 0.82, 2.2) * 0.13; pose.sy = 1 - d; pose.y -= (d * e.h) / 2 }
      return pose
    }
    if (act.kind === 'bump') return this.bumpPose(pose, act, h)
    return pose
  }

  private heavePath(pose: Pose, t: number, act: { x: number; cx: number; cy: number; fromY: number }): void {
    const c = span(t, 0, CROUCH), f = span(t, CROUCH, FLOWN)
    pose.x = lerp(act.x, act.cx, smooth(f))
    pose.y = lerp(act.fromY - arc(c * 0.5 + (f > 0 ? 0.5 : 0)) * 0.28 * (f > 0 ? 0 : 1), act.cy, Math.sin(f * Math.PI / 2))
    pose.z = lerp(LANE, AT_WALL + 0.15, f * f)
    pose.sy = 1 + 0.12 * arc(f)
    pose.sx = 1 - 0.04 * arc(f)
  }

  private inPose(pose: Pose, act: Extract<Act, { kind: 'in' }>, h: number): Pose {
    const t = act.t
    this.heavePath(pose, t, act)
    if (t <= FLOWN) return pose
    const through = span(t, FLOWN, FLOWN + 0.2), drop = span(t, FLOWN + 0.2, FLOWN + 0.34), over = smooth(span(t, FLOWN + 0.5, FLOWN + 0.9)), back = smooth(span(t, FLOWN + 0.9, FLOWN + 1.15))
    pose.x = lerp(act.cx, act.slotX, over)
    const rest = SILL + h / 2 + 0.02
    pose.y = lerp(act.cy, rest, drop * drop)
    pose.z = lerp(lerp(AT_WALL + 0.15, ENTER_Z, through), SLOT_Z, back)
    pose.sz = 1 - 0.1 * arc(through)
    const land = t - FLOWN - 0.34
    if (land > 0 && land < 1) { const k = ring(land, 3, 6) * 0.16; pose.sy = 1 - k; pose.sx = 1; pose.y -= (k * h) / 2 }
    return pose
  }

  /** The times of a bump, from its contact: how long it presses, then falls, lies on a bear, hops back, and the bear comes up. */
  private static beats(near: boolean): { press: number; fall: number; lie: number; hop: number; rise: number } {
    const press = FLOWN + (near ? 1.0 : 0.5), fall = press + 0.4, lie = fall + 0.5, hop = lie + 0.42
    return { press, fall, lie, hop, rise: hop + 0.6 }
  }

  private bumpPose(pose: Pose, act: Extract<Act, { kind: 'bump' }>, h: number): Pose {
    const t = act.t, b = Game.beats(act.near)
    this.heavePath(pose, t, act)
    if (t <= FLOWN) return pose
    pose.sy = 1; pose.sx = 1
    if (t <= b.press) {
      const p = t - FLOWN
      // Pressed flat against the wall: the depth halves, the outline spreads a little, and it shivers.
      const flat = Math.min(1, p / 0.06) * (1 - 0.25 * ring(p, 4, 5))
      pose.sz = 1 - 0.45 * clamp(flat, 0, 1.2)
      pose.z = (DEPTH * pose.sz) / 2 + 0.03
      pose.x = act.cx
      pose.y = act.cy
      if (act.near) pose.angle = this.angle + Math.sin(p * 34) * 0.03 * span(p, 0.1, 0.9)
      return pose
    }
    const on = this.fallenOn(act), f = span(t, b.press, b.fall), top = this.flatTop(act.side) + h / 2
    if (t <= b.fall) {
      pose.x = lerp(act.cx, on, smooth(f)); pose.y = lerp(act.cy, top, f * f); pose.z = lerp(AT_WALL, LANE, smooth(span(f, 0, 0.8)))
      pose.angle = this.angle + Math.sin(f * Math.PI) * -act.side * 0.22
      return pose
    }
    if (t <= b.lie) {
      const k = ring(t - b.fall, 3, 6) * 0.2
      pose.x = on; pose.z = LANE; pose.sy = 1 - k; pose.sx = 1 + k * 0.3; pose.y = top - (h * k) / 2
      return pose
    }
    const o = span(t, b.lie, b.hop)
    pose.x = lerp(on, this.x, smooth(o)); pose.z = LANE
    pose.y = lerp(top, CARRY + h / 2, o) + arc(o) * 1.1
    if (t > b.hop) { const k = ring(t - b.hop, 3, 6) * 0.1; pose.sy = 1 - k; pose.y = CARRY + h / 2 - (h * k) / 2; pose.x = this.x }
    return pose
  }

  /** Which bear stands on a side, -1 the left. */
  bearOn(side: -1 | 1): 0 | 1 { return (side === -1) === this.saved.wideLeft ? 0 : 1 }
  private sideOf(who: 0 | 1): -1 | 1 { return this.bearOn(-1) === who ? -1 : 1 }

  private bearX(side: -1 | 1, half = this.half): number { return this.x + side * (half + BEARS[this.bearOn(side)].radius + 0.06) }
  /** Where the load comes down after it was caught: over the bear on that side, pushed a little outward, or between both. */
  private fallenOn(act: Extract<Act, { kind: 'bump' }>): number {
    if (act.side === 0) return this.x
    return this.bearX(act.side, this.restHalf()) + act.side * 0.55
  }
  private flatTop(side: -1 | 0 | 1): number {
    const tall = (s: -1 | 1): number => BEARS[this.bearOn(s)].height * FLAT
    return (side === 0 ? Math.max(tall(-1), tall(1)) : tall(side)) + 0.05
  }
  private restHalf(): number {
    const i = this.hands
    return i < 0 ? 1.5 : this.extent(this.saved.loads[i]).w / 2
  }

  bearPose(who: 0 | 1): BearPose {
    const side = this.sideOf(who), body = BEARS[who], act = this.act, i = this.hands
    const load = act?.kind === 'in' ? this.loadPose(act.load) : i >= 0 ? this.loadPose(i) : null
    const breathe = Math.sin(this.time * (who === 0 ? 1.5 : 2.6) + who) * (who === 0 ? 0.012 : 0.008)
    const pose: BearPose = {
      x: this.bearX(side), y: 0, z: LANE, squash: 1 + breathe, lean: 0, nod: 0, hands: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }], look: { u: 0, v: 0 }, mood: 'calm',
      blink: 0, wet: clamp(this.wetLeft[who], 0, 1), sit: 0,
    }
    const beat = (this.time * (who === 0 ? 0.21 : 0.37) + who * 0.4) % 1
    pose.blink = beat < 0.035 ? 1 : 0
    const poke = this.poke[who]
    pose.squash *= 1 - poke * 0.22
    if (who === 1) pose.lean += Math.sin(this.time * 1.1) * 0.02
    let edge = load ? load.x + side * (this.half + 0.02) : 0, gripY = load ? load.y - 0.1 : 0, gripZ = LANE
    let grip = load !== null && (act === null || act.kind === 'turn' || act.kind === 'walk' || act.kind === 'swap')
    let up = 0
    if (!act && i >= 0) pose.squash -= who === 0 ? 0.02 : 0
    if (act?.kind === 'turn') {
      const t = act.t / act.lasts
      pose.squash -= arc(span(t, 0, 0.2)) * 0.1 + arc(span(t, 0.86, 1)) * 0.1
      pose.mood = 'strain'
      if (t > 0.1 && t < 0.88) { grip = false; up = 0.8 }
    } else if (act?.kind === 'swap') {
      const a = Math.PI * smooth(span(act.t, 0.08, 0.92)), r = this.half + body.radius + 0.06
      // The load in hand turns with them, so nothing between them moves: the one that was behind in the saved state is on its way to where it is now.
      pose.x = this.x - side * Math.cos(a) * r
      pose.z = LANE + side * Math.sin(a) * r
      pose.y = Math.abs(Math.sin(act.t * 14 + who)) * 0.12
      edge = this.x - side * Math.cos(a) * this.half; gripZ = LANE + side * Math.sin(a) * this.half
      pose.mood = 'strain'
    } else if (act?.kind === 'walk') {
      const s = act.t * 13 + who * 1.2
      pose.y = Math.abs(Math.sin(s)) * (who === 0 ? 0.1 : 0.16)
      pose.lean = Math.sin(s) * (who === 0 ? 0.07 : 0.04)
      pose.mood = 'strain'
    } else if (act?.kind === 'in' || act?.kind === 'bump') {
      const t = act.t
      pose.squash -= arc(span(t, 0, CROUCH + 0.1)) * 0.2
      pose.squash += arc(span(t, CROUCH, FLOWN)) * 0.08
      up = span(t, 0.05, 0.15); grip = t < 0.06
      pose.mood = 'strain'
      if (act.kind === 'in') {
        const won = t - FLOWN - 0.34
        if (won > 0) { pose.mood = 'glad'; up = 1 - span(won, 0, 0.4); pose.y = who === 1 ? arc(span(won, 0.02, 0.3)) * 0.35 : 0; if (who === 0) pose.squash -= Math.max(0, ring(won, 2, 4)) * 0.12 }
      } else this.bumped(pose, act, who, side)
    } else if (act?.kind === 'deliver') {
      up = span(act.t, 0, 0.2) * (1 - span(act.t, 0.78, 0.84)); grip = act.t >= 0.82
      if (act.t > 0.82) pose.squash -= Math.max(0, ring(act.t - 0.82, 2, 4)) * 0.14
      pose.mood = act.t < 0.82 ? 'wait' : 'strain'
    } else if (act?.kind === 'ending') {
      const down = smooth(span(act.t, 3 + who * 0.25, 3.5 + who * 0.25))
      pose.sit = down; pose.mood = 'glad'; pose.lean = -side * 0.1 * down
      up = arc(span(act.t, 1.2, 2.6)) * 1
    } else if (act?.kind === 'move') { pose.sit = 1 - smooth(span(act.t, 1.2, 1.6)); pose.mood = 'wait' }
    else if (this.saved.finished) { pose.sit = 1; pose.mood = 'glad'; pose.lean = -side * 0.1; pose.blink = who === 0 ? 1 : pose.blink }
    else if (i < 0) pose.mood = 'wait'
    // Where it looks: the finger for a moment, else the load, the cart, or the opening it is under.
    const focus = this.finger.since < 1.2 ? this.finger : load ? drawnAt(load.x, load.y, load.z) : this.saved.finished ? drawnAt(side * -2, 5.5, 0) : drawnAt(this.cartX, 1.6, LANE)
    const idle = Math.floor(this.time / 4 + who * 0.5) % 4
    pose.look = act === null && this.finger.since > 1.2 && load && idle === 1 ? drawnAt(this.nearest().x, 5, 0) : { u: focus.u, v: focus.v }
    if (who === 1 && load && !act) pose.nod = clamp(Math.sin(load.angle) * 0.1, -0.1, 0.1)
    // Hands.
    const s = pose.squash, sy = pose.y - pose.sit * 0.5
    const inner: P3 = grip && load ? { x: edge, y: gripY, z: gripZ + 0.3 } : { x: pose.x - side * (body.radius * (1.02 - 0.25 * up) + 0.12), y: sy + body.height * s * lerp(0.3, 1.02, up), z: pose.z + 0.35 }
    const outer: P3 = grip && load ? { x: edge, y: gripY - 0.28, z: gripZ - 0.3 } : { x: pose.x + side * (body.radius * (1.02 - 0.25 * up) + 0.16), y: sy + body.height * s * lerp(0.3, 1.02, up), z: pose.z + 0.25 }
    if (i < 0 && act === null && !this.saved.finished) { // Empty arms held out to the cart.
      inner.x = pose.x + body.radius + 0.35; inner.y = body.height * 0.42 + Math.sin(this.time * 3 + who) * 0.05; inner.z = pose.z + 0.4
      outer.x = pose.x + body.radius + 0.3; outer.y = body.height * 0.36 + Math.sin(this.time * 3 + who) * 0.05; outer.z = pose.z - 0.1
      if (side === -1) { inner.x = pose.x + body.radius + 0.3 }
    }
    pose.hands = [inner, outer]
    return pose
  }

  private bumped(pose: BearPose, act: Extract<Act, { kind: 'bump' }>, who: 0 | 1, side: -1 | 1): void {
    const t = act.t, b = Game.beats(act.near), hit = act.side === 0 || act.side === side
    if (t > FLOWN && t < b.press) { pose.nod = 0.1 * Math.sin((t - FLOWN) * 30) * (act.near ? 1 : 0.4); pose.mood = act.near ? 'strain' : 'ouch' }
    if (!hit) {
      if (t > b.press) { pose.mood = 'ouch'; pose.lean = -side * 0.12 * arc(span(t, b.fall, b.rise)) }
      if (t > b.hop) pose.mood = 'strain'
      return
    }
    // It steps out from under the load's side, is pressed, lies flat under it, and comes up past its height and back.
    const out = smooth(span(t, b.press, b.press + 0.16)) * (1 - smooth(span(t, b.hop, b.hop + 0.1)))
    const apart = act.side === 0 ? side * (1.75 + 0.02) - (pose.x - this.x) : side * 0.55
    pose.x += apart * out
    if (t > b.press) pose.mood = t < b.fall - 0.05 ? 'ouch' : t < b.hop ? 'flat' : who === 0 ? 'glad' : 'ouch'
    // Pressed as the load arrives, and never higher than the load's underside.
    const pressed = span(t, b.fall - 0.16, b.fall - 0.02)
    let squash = lerp(1, FLAT, pressed)
    if (t > b.fall) squash = FLAT * (1 - 0.1 * Math.max(0, ring(t - b.fall, 3, 6)))
    if (t > b.hop + 0.1) { const up = t - b.hop - 0.1; squash = 1 - ring(up, who === 0 ? 1.4 : 3.2, who === 0 ? 8 : 5) * (1 - FLAT) * (up < 0.02 ? 1 : 1) }
    pose.squash = squash
  }

  cubPose(): { x: number; y: number; z: number; roll: number; squash: number; duck: number; glad: number } {
    const act = this.act, hop = Math.max(0, Math.sin(this.time * 4.4)) * 0.16, pat = { x: this.cubX + this.houseX, y: SILL + 0.02, z: CUB_Z, roll: 0, squash: 1, duck: 0, glad: 0 }
    if (this.cubPoke < 0.8) pat.squash = 1 - ring(this.cubPoke, 2.5) * 0.25
    if (act?.kind === 'ending' && act.t > 2.6) {
      const n = clamp(Math.floor((act.t - 2.6) / 1.75), 0, 2), k = (act.t - 2.6 - n * 1.75) / 1.75
      this.cubOn = n
      const to = this.perch(n), from = n === 0 ? pat : this.perch(n - 1)
      const j = span(k, 0, 0.26)
      pat.x = lerp(from.x, to.x, smooth(j)); pat.y = lerp(from.y, to.y, j) + arc(j) * 1.1; pat.z = lerp(from.z, to.z, smooth(span(j, 0.3, 0.8)))
      pat.y = Math.max(pat.y, j > 0.3 && j < 1 ? Math.max(from.y, to.y) : pat.y)
      const on = span(k, 0.26, 0.34)
      pat.roll = lerp(n === 0 ? 0 : 0, to.roll, on)
      if (k > 0.3) { pat.y += Math.abs(Math.sin((k - 0.3) * 13)) * 0.3 * (1 - k) ; pat.glad = 1 }
      return pat
    }
    if (this.saved.finished && act?.kind !== 'in' && !(act?.kind === 'ending')) {
      const to = this.perch(2)
      pat.x = to.x; pat.y = to.y + Math.abs(Math.sin(this.time * 2)) * 0.03; pat.z = to.z; pat.roll = to.roll; pat.glad = 1
      return pat
    }
    if (act?.kind === 'in' || act?.kind === 'bump') pat.duck = smooth(span(act.t, 0.05, 0.3)) * (1 - smooth(span(act.t, 1.4, 1.8)))
    else pat.y += hop * (this.empty ? 0.3 : 1)
    pat.squash *= 1 - pat.duck * 0.45
    return pat
  }

  /** The cub's place on a load in the loft, and the way up it copies. */
  perch(n: number): { x: number; y: number; z: number; roll: number } {
    const load = this.saved.loads.find((l) => l.at === 'in' && l.slot === n) ?? this.saved.loads[0], cells = this.cells(load), { w, h } = size(cells)
    const tops = cells.filter((c) => c[1] === h - 1), col = tops[Math.floor(tops.length / 2)][0]
    const quarter = load.kind === 'bath' && load.way.turn % 2 === 1 ? 1 : load.way.turn
    const roll = quarter === 2 ? Math.PI : quarter === 0 ? 0 : Math.PI / 2
    return { x: SLOTS[load.slot] + this.houseX + col - (w - 1) / 2, y: SILL + h + 0.06, z: SLOT_Z, roll }
  }

  insidePoked(i: number): number { return this.insidePoke[i] }

  // --- fingers ---------------------------------------------------------------

  /** Any press first lands a scene that is only being watched. */
  press_(target: Target, u: number, v: number): void {
    this.finger = { u, v, since: 0 }
    if (this.showing || this.act?.kind === 'ending') this.land()
    this.grabbed = { x: this.x, u, v }
    switch (target.type) {
      case 'load': this.vPress += 7; this.say(voices.squeeze(this.count++)); break
      case 'bear': this.pokeV[target.who] += 6; this.say(voices.bear(target.who, this.count++)); this.puff(this.bearPose(target.who).x, 1.6, LANE + 1, 'crumb', 3); break
      case 'opening': this.say(voices.knock(target.i, this.count++)); this.rim(target.i, 1.6); break
      case 'cart': this.cartPoke = 0; this.say(voices.mouse(this.count++)); break
      case 'cub': this.cubPoke = 0; this.say(voices.cub(this.count++)); break
      case 'inside': this.pokeInside(target.i); break
      case 'wall': this.dent(Math.round(target.u), Math.floor(target.v / Math.cos(0.2)), 2.2); this.say(voices.sugar(this.count++)); this.puff(target.u, target.v + 0.1, 0.3, 'sugar', 4); break
      case 'cloth': this.say(voices.cloth(this.count++)); this.puff(target.u, 0.1, 6, 'crumb', 4); break
      case 'kitchen': this.say(voices.jar(target.u, this.count++)); break
    }
  }

  /** The finger came up where it went down. */
  tap(target: Target): void {
    this.letPress()
    if (this.saved.finished || this.act?.kind === 'move') {
      if (target.type === 'cart' && this.act === null && this.saved.next) this.startMove()
      return
    }
    if (target.type === 'cart') { if (this.empty && this.act === null) this.deliver(); return }
    if (target.type === 'load') this.want({ do: 'turn' })
    else if (target.type === 'bear') this.want({ do: 'swap' })
    else if (target.type === 'opening') this.want({ do: 'heave', i: target.i })
  }

  private want(want: Want): void {
    // With nothing in hand, or a load on its way in, there is nothing to turn: the touch was answered where it landed.
    if (this.empty || this.act?.kind === 'in' || this.act?.kind === 'deliver' && want.do === 'heave') return
    const last = this.wants[this.wants.length - 1]
    if (want.do === 'heave' && (last?.do === 'heave' || this.act?.kind === 'walk' || this.act?.kind === 'bump')) return
    if (this.wants.length < 6) this.wants.push(want)
    this.next()
  }

  dragStart(target: Target): void {
    if (target.type !== 'load' || this.act || this.empty) { this.grabbed = null; return }
    this.dragX = this.x; this.dragFrom = this.x; this.dragLift = 0
    this.say(voices.lift(this.count++))
  }

  dragTo(u: number, v: number): void {
    this.finger = { u, v, since: 0 }
    if (this.dragX === null || !this.grabbed) return
    this.dragX = clamp(this.grabbed.x + u - this.grabbed.u, -4.6, 4.6)
    this.dragLift = clamp(v - this.grabbed.v, 0, 1.5)
    this.rest = 0
  }

  /** The finger let go. Carried up before an opening is heaved there; anywhere else the bears stay where they were brought. */
  letGo(u: number, v: number): void {
    this.letPress()
    if (this.dragX === null || !this.grabbed) return
    const rose = v - this.grabbed.v
    this.dragX = null; this.dragLift = 0
    this.saved = { ...this.saved, x: clamp(this.x, -4.5, 4.5) }
    this.dirty = 'soon'
    const i = this.openingAt(u, v)
    if (i >= 0 && rose > 0.9) this.want({ do: 'heave', i })
    else this.say(voices.down(this.count++))
  }

  /** The drag was taken away: the bears go back to where they were. */
  cancel(): void {
    this.letPress()
    if (this.dragX === null) return
    this.back = this.dragFrom
    this.dragX = null; this.dragLift = 0
  }
  private back: number | null = null

  pressEnd(): void { this.letPress() }
  private letPress(): void { this.grabbed = this.dragX === null ? null : this.grabbed }

  /** A second finger takes nothing from the first and is answered where it lands. */
  extra(u: number, v: number): void { this.puff(u, v + 0.2, 6, 'sugar', 2); this.say(voices.sugar(this.count++)) }

  openingAt(u: number, v: number): number {
    const y = v / Math.cos(0.2)
    return this.saved.openings.findIndex((o) => Math.abs(u - middleOf(o)) < size(o.cells).w / 2 + 0.6 && y > SILL - 0.5 && y < SILL + 3.5)
  }

  private nearest(): { x: number; i: number } {
    let best = 0
    this.saved.openings.forEach((o, i) => { if (Math.abs(middleOf(o) - this.x) < Math.abs(middleOf(this.saved.openings[best]) - this.x)) best = i })
    return { x: middleOf(this.saved.openings[best]), i: best }
  }

  // --- time ------------------------------------------------------------------

  /** Called once when the slot has been read: whatever is owed a first showing starts. */
  begin(): void { this.begun = true }

  /** The game was put away and is looked at again: what was being watched has ended. */
  rested(): void {
    this.cancel()
    if (this.showing || this.act?.kind === 'ending') this.land()
  }

  step(seconds: number): void {
    this.left += seconds
    while (this.left >= TICK) { this.left -= TICK; this.tick(TICK) }
  }

  private tick(dt: number): void {
    this.time += dt
    this.finger.since += dt; this.cartPoke += dt; this.cubPoke += dt; this.rest += dt; this.riderAt += dt
    for (let i = 0; i < 3; i++) this.insidePoke[i] += dt
    for (let i = 0; i < 2; i++) this.wetLeft[i] = Math.max(0, this.wetLeft[i] - dt / 3)
    if (this.begun && this.time > 1.2 && !this.act && this.dragX === null && this.hands >= 0) this.owed()
    const pull = (x: number, v: number, to: number, k: number, d: number): [number, number] => { const nv = v + ((to - x) * k - v * d) * dt; return [x + nv * dt, nv] }
    ;[this.press, this.vPress] = pull(this.press, this.vPress, 0, 320, 16)
    for (let i = 0; i < 3; i++) [this.poke[i], this.pokeV[i]] = pull(this.poke[i], this.pokeV[i], 0, 220, 11)
    if (this.dragX !== null) [this.x, this.vx] = pull(this.x, this.vx, this.dragX, 260, 28)
    else if (this.back !== null) {
      ;[this.x, this.vx] = pull(this.x, this.vx, this.back, 200, 28)
      if (Math.abs(this.x - this.back) < 0.01) this.back = null
    } else if (this.empty && this.act?.kind !== 'in' && this.act?.kind !== 'bump') [this.x, this.vx] = pull(this.x, this.vx, 0, 26, 10)
    else this.vx = 0
    ;[this.lift, this.vLift] = pull(this.lift, this.vLift, this.act ? 0 : this.dragLift, 200, 22)
    const act = this.act
    if (act) { act.t += dt; this.play(act, dt) }
    // The space the bears leave for the load.
    if (act?.kind === 'turn') {
      const t = act.t / act.lasts, corner = Math.hypot(act.from.w, act.from.h) / 2 + 0.04
      this.half = t < 0.5 ? lerp(act.from.w / 2, corner, smooth(span(t, 0, 0.22))) : lerp(corner, act.to.w / 2, smooth(span(t, 0.78, 0.98)))
    } else {
      const to = this.act?.kind === 'in' ? 1.5 : this.restHalf()
      this.half += (to - this.half) * Math.min(1, dt * 14)
      if (this.hands >= 0 && !act) this.half = Math.max(this.half, to)
    }
    // The cart keeps clear of the bears, and is out of the street while a house moves.
    const right = this.bearX(1) + BEARS[this.bearOn(1)].radius + 2.2, cartTo = Math.max(6, right)
    this.cartX += (cartTo - this.cartX) * Math.min(1, dt * 7)
    if (this.cartX < right - 0.45) this.cartX = right - 0.45
    const behind = this.nearest(), cubTo = this.cubSpot(behind.i)
    if (Math.abs(cubTo - this.cubX) > 0.02) this.cubX += clamp(cubTo - this.cubX, -dt * 5, dt * 5)
    for (const [key, d] of this.dents) {
      d.v += (-d.push * 190 - d.v * 9) * dt; d.push += d.v * dt
      if (d.push > 0.3) { d.push = 0.3; d.v = Math.min(d.v, 0) }
      if (d.push < -0.14) { d.push = -0.14; d.v = Math.max(d.v, 0) }
      if (Math.abs(d.push) < 0.002 && Math.abs(d.v) < 0.02) this.dents.delete(key)
    }
    for (let i = this.crumbs.length - 1; i >= 0; i--) {
      const c = this.crumbs[i]
      c.vy -= 13 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.life -= dt
      if (c.y < 0.06 && c.vy < 0) { c.y = 0.06; c.vy *= -0.3; c.vx *= 0.6; c.vz *= 0.6 }
      if (c.life <= 0) this.crumbs.splice(i, 1)
    }
  }

  private cubSpot(i: number): number {
    const o = this.saved.openings[i], bottom = o.cells.filter((c) => c[1] === 0).map((c) => c[0])
    return leftOf(o) + (bottom.length ? Math.max(...bottom) : 0)
  }

  /** The showings that are owed: the toss and the heave of a first visit, and the change of ends. */
  private owed(): void {
    const s = this.saved
    if (!s.shown) {
      this.saved = { ...s, shown: true }; this.dirty = 'now'; this.showing = true
      this.showWants = ['turn', 'turn', 'turn', 'turn', 'heave']
      this.nextShow()
    } else if (!s.shownEnds && (s.position === 'other-side' || s.position === 'full-house') && s.loads.filter((l) => l.at === 'cart').length === 2) {
      this.saved = { ...s, shownEnds: true }; this.dirty = 'now'; this.showing = true
      this.showWants = ['swap', 'swap']
      this.nextShow()
    }
  }
  private showWants: ('turn' | 'swap' | 'heave')[] = []
  private nextShow(): void {
    const want = this.showWants.shift()
    if (!want) { this.showing = false; return }
    if (want === 'turn') this.startTurn(0.62, true)
    else if (want === 'swap') this.startSwap(true)
    else this.startHeave(0, true)
  }

  private next(): void {
    if (this.act || this.dragX !== null) return
    if (this.showing) { this.nextShow(); if (this.act) return }
    const want = this.wants.shift()
    if (!want || this.empty) { this.wants.length = 0; return }
    if (want.do === 'turn') this.startTurn(this.wants.length > 1 ? 0.3 : this.wants.length > 0 ? 0.4 : 0.56)
    else if (want.do === 'swap') this.startSwap()
    else { this.back = null; this.act = { kind: 'walk', t: 0, i: want.i } }
  }

  private setWay(i: number, way: Load['way'], show = false): void {
    this.saved = { ...this.saved, loads: this.saved.loads.map((l, n) => (n === i ? { ...l, way } : l)) }
    if (!show) this.dirty = 'soon'
  }

  private startTurn(lasts: number, show = false): void {
    const i = this.hands, load = this.saved.loads[i], from = this.extent(load)
    this.act = { kind: 'turn', t: 0, lasts, from, to: { w: from.h, h: from.w }, a0: this.angle, show }
    this.setWay(i, { ...load.way, turn: (load.way.turn + 1) % 4 }, show)
    this.say([...voices.toss(lasts), ...voices.rider(load.kind, 'turn', (load.way.turn + 1) % 4, lasts)])
    this.rider(load.kind, 'turn')
  }

  private startSwap(show = false): void {
    const i = this.hands, load = this.saved.loads[i]
    this.act = { kind: 'swap', t: 0, a0: this.angle, show }
    this.setWay(i, swapped(load.way), show)
    this.saved = { ...this.saved, wideLeft: !this.saved.wideLeft }
    this.say([...voices.shuffle(), ...voices.rider(load.kind, 'swap', 0, 0.5)])
    this.rider(load.kind, 'swap')
  }

  private startHeave(i: number, show = false): void {
    const at = this.hands, load = this.saved.loads[at], o = this.saved.openings[i], cells = this.cells(load), put = place(cells, o.cells), { w, h } = size(cells)
    const cx = leftOf(o) + put.dx + (w - 1) / 2, cy = SILL + put.dy + h / 2, x = this.x, fromY = CARRY + h / 2 + this.lift
    this.saved = { ...this.saved, x }
    if (put.fits && !show) return this.goIn(i, at, load, put, { x, cx, cy: cy + 0.02, fromY })
    const side = caughtSide(cells, put)
    this.act = { kind: 'bump', t: 0, i, x, cx, cy: cy + 0.02, fromY, side, blocked: put.blocked, near: put.blocked.length === 1, show, said: 0 }
    if (!show) { this.saved = { ...this.saved, bumps: Math.min(MOST_BUMPS, this.saved.bumps + 1) }; this.dirty = 'now' }
    this.say(voices.heave())
  }

  private goIn(i: number, at: number, load: Load, _put: Placing, way: { x: number; cx: number; cy: number; fromY: number }): void {
    const s = this.saved, taken = new Set(s.loads.filter((l) => l.at === 'in').map((l) => l.slot)), middle = middleOf(s.openings[i])
    const slot = [0, 1, 2].filter((n) => !taken.has(n)).sort((a, b) => Math.abs(SLOTS[a] - middle) - Math.abs(SLOTS[b] - middle))[0]
    const loads = s.loads.map((l, n): Load => (n === at ? { ...l, at: 'in', slot } : l)), last = loads.every((l) => l.at === 'in')
    this.act = { kind: 'in', t: 0, i, load: at, ...way, slotX: SLOTS[slot], last, said: 0 }
    this.saved = { ...s, loads }
    if (last) {
      const done = finishCycle(this.saved, s.bumps <= loads.length ? 'well' : s.bumps > loads.length * 3 ? 'badly' : 'mixed')
      const laid = layHouse(done.position, s.seed)
      this.saved = { ...done, next: { openings: laid.openings, loads: laid.loads }, seed: laid.seed }
    }
    this.wants.length = 0
    this.dirty = 'now'
    this.say(voices.heave())
    this.inAngle = this.angle
    this.pendingRider = load.kind
  }
  inAngle = 0
  private pendingRider: Kind = 'bath'

  private deliver(): void {
    const i = this.saved.loads.findIndex((l) => l.at === 'cart')
    if (i < 0) return
    this.saved = { ...this.saved, loads: this.saved.loads.map((l, n): Load => (n === i ? { ...l, at: 'hands' } : l)) }
    this.angle = -this.saved.loads[i].way.turn * Math.PI / 2
    this.act = { kind: 'deliver', t: 0, load: i, fromX: this.cartX }
    this.dirty = 'now'
    this.say(voices.spring())
  }

  /** The next house: everything about it is saved at once, with its first load in the bears' hands. */
  private startMove(): void {
    const s = this.saved, next = s.next!
    this.old = { ...s }
    this.pendingMove = { ...s, openings: next.openings, loads: move({ openings: next.openings, loads: next.loads }).map((l) => ({ ...l, at: 'cart' as const })), next: null, finished: false, bumps: 0, x: 0 }
    this.act = { kind: 'move', t: 0, swappedHouse: false }
    this.dirty = 'now'
    this.say(voices.rumble())
  }
  private old: Saved | null = null
  private pendingMove: Saved | null = null
  /** What is saved: while the old house is still rolling off, already the new one. */
  get toSave(): Saved {
    const s = this.pendingMove ?? this.saved
    // A load in the air is saved in the hands it is going to.
    return this.act?.kind === 'move' ? { ...s, loads: s.loads.map((l, n): Load => (n === 0 ? { ...l, at: 'hands' } : l)) } : s
  }

  private play(act: Act, dt: number): void {
    switch (act.kind) {
      case 'turn':
        if (act.t >= act.lasts) { this.angle = act.a0 - Math.PI / 2; this.act = null; this.half = act.to.w / 2; this.vPress += 2.5; this.say(voices.caught(this.count++)); this.next() }
        return
      case 'swap':
        if (act.t >= 1) { this.angle = -act.a0; this.act = null; this.say(voices.caught(this.count++)); this.next() }
        return
      case 'walk': {
        const to = middleOf(this.saved.openings[act.i]), step = 7.5 * dt
        if (Math.floor(act.t * 13 / Math.PI) !== Math.floor((act.t - dt) * 13 / Math.PI)) this.say(voices.step(this.count++))
        // A turn asked for on the way is made before the heave.
        if (Math.abs(to - this.x) <= step) { this.x = to; this.act = null; if (this.wants.length > 0) { this.wants.push({ do: 'heave', i: act.i }); this.next() } else this.startHeave(act.i) } else this.x += Math.sign(to - this.x) * step
        return
      }
      case 'in': return this.playIn(act)
      case 'bump': return this.playBump(act)
      case 'deliver':
        if (act.t >= 0.82 && act.t - dt < 0.82) { this.say(voices.caught(this.count++)); this.say(voices.rider(this.saved.loads[act.load].kind, 'poke', 0, 0.1)) }
        if (act.t >= 1.2) { this.act = null; this.next() }
        return
      case 'ending': return this.playEnding(act)
      case 'move': {
        const out = span(act.t, 0, 0.75), back = span(act.t, 0.75, 1.6)
        this.houseX = act.t < 0.75 ? -18 * out * out : 18 * (1 - smooth(back))
        if (!act.swappedHouse && act.t >= 0.75) {
          act.swappedHouse = true
          this.saved = this.pendingMove!; this.pendingMove = null; this.old = null
          this.frontLift = 0; this.cubOn = -1; this.x = 0; this.angle = 0
          this.cubX = this.cubSpot(this.nearest().i)
          this.dirty = 'now'
        }
        if (act.t >= MOVE) { this.houseX = 0; this.act = null; this.deliver() }
      }
    }
  }

  private playIn(act: Extract<Act, { kind: 'in' }>): void {
    if (act.said === 0 && act.t >= FLOWN) { act.said = 1; this.say(voices.pop()); this.rim(act.i, 1.3) }
    if (act.said === 1 && act.t >= FLOWN + 0.34) {
      act.said = 2
      const load = this.saved.loads[act.load]
      this.say([...voices.thump(), ...voices.rider(load.kind, 'in', load.way.turn, 0.1)])
      // The piano going in makes the dog, if it is in, howl in its sleep.
      if (load.kind === 'piano') { const dog = this.saved.loads.findIndex((l) => l.kind === 'sofa' && l.at === 'in'); if (dog >= 0) { this.say(voices.howl(0.5)); this.insidePoke[dog] = 0 } }
      this.rider(load.kind, 'in')
      this.puff(act.cx, SILL + 0.1, -1, 'crumb', 6)
      this.puff(act.cx - 1, SILL + 0.2, 0.3, 'sugar', 4)
      this.puff(act.cx + 1, SILL + 0.2, 0.3, 'sugar', 4)
    }
    if (act.t < FLOWN + 1.25) return
    this.act = act.last ? { kind: 'ending', t: 0, said: 0 } : null
    this.x = act.x
  }

  private playBump(act: Extract<Act, { kind: 'bump' }>): void {
    const b = Game.beats(act.near), load = this.saved.loads[this.hands], o = this.saved.openings[act.i]
    if (act.said === 0 && act.t >= FLOWN) {
      act.said = 1
      this.say([...voices.bump(act.blocked.length), ...voices.rider(load.kind, 'bump', load.way.turn, 0.08)])
      this.rider(load.kind, 'bump')
      act.blocked.forEach((c, n) => {
        const col = leftOf(o) + c[0], row = SILL + c[1]
        this.dent(col, row, 5 + n * 0.3)
        this.puff(col, row + 0.5, 0.5, 'sugar', 4)
      })
    }
    // Strained against for as long as it presses.
    if (act.t > FLOWN && act.t < b.press && act.near) for (const c of act.blocked) this.dent(leftOf(o) + c[0], SILL + c[1], 0.35)
    if (act.said === 1 && act.t >= b.press) { act.said = 2; this.say(act.near ? voices.cork() : voices.peel()) }
    if (act.said === 2 && act.t >= b.fall) {
      act.said = 3
      const sides: (-1 | 1)[] = act.side === 0 ? [-1, 1] : [act.side]
      for (const side of sides) {
        const who = this.bearOn(side)
        this.say(voices.squashed(who))
        this.puff(this.bearX(side), 0.8, LANE + 1.2, 'sugar', 8)
        if (load.kind === 'bath') { this.wetLeft[who] = 1.4; this.puff(this.bearX(side), 2, LANE + 0.8, 'milk', 14) }
      }
    }
    if (act.said === 3 && act.t >= b.hop) { act.said = 4; this.say([...voices.caught(this.count++), ...voices.boing(act.side === 0 ? 2 : this.bearOn(act.side))]) }
    if (act.t < b.rise) return
    this.act = null
    this.x = act.x
    this.next()
  }

  private playEnding(act: Extract<Act, { kind: 'ending' }>): void {
    this.frontLift = smooth(span(act.t, 1, 2.5))
    const at = (n: number, t: number, what: () => void): void => { if (act.said === n && act.t >= t) { act.said = n + 1; what() } }
    at(0, 0.9, () => this.say(voices.open()))
    for (let n = 0; n < 3; n++) at(1 + n, 2.6 + n * 1.75 + 0.45, () => {
      const i = this.saved.loads.findIndex((l) => l.slot === n)
      this.insidePoke[i] = 0
      this.say([...voices.cub(n), ...voices.rider(this.saved.loads[i].kind, 'cub', this.saved.loads[i].way.turn, 0.05)])
      this.rider(this.saved.loads[i].kind, 'cub')
    })
    at(4, 3.4, () => this.say(voices.flop()))
    if (act.t >= ENDING) this.land()
  }

  /** A watched scene lands where it was going. */
  private land(): void {
    if (this.showing) {
      // The load is back in the hands as it was before the showing.
      const act = this.act, i = this.hands
      let turn = this.saved.loads[i].way.turn
      let back = this.saved.loads[i].way.back
      const turnsLeft = this.showWants.filter((w) => w === 'turn').length, swapsLeft = this.showWants.filter((w) => w === 'swap').length
      turn = (turn + turnsLeft) % 4
      if (swapsLeft % 2 === 1) { ({ turn, back } = swapped({ turn, back })); this.saved = { ...this.saved, wideLeft: !this.saved.wideLeft } }
      this.setWay(i, { turn, back }, true)
      this.angle = -turn * Math.PI / 2
      if (act?.kind === 'bump') this.x = act.x
      this.showWants = []; this.showing = false; this.act = null
      this.half = this.restHalf()
      return
    }
    if (this.act?.kind === 'ending') { this.act = null; this.frontLift = 1; this.x = 0; this.half = 1.5 }
  }

  /** Sets everything to where the saved state has it: nothing eases in. */
  private settle(): void {
    const s = this.saved, i = this.hands
    this.x = i >= 0 ? s.x : 0
    this.angle = i >= 0 ? -s.loads[i].way.turn * Math.PI / 2 : 0
    this.half = this.restHalf()
    this.frontLift = s.finished ? 1 : 0
    this.cartX = Math.max(6, this.bearX(1) + BEARS[this.bearOn(1)].radius + 2.2)
    this.cubX = this.cubSpot(this.nearest().i)
  }

  // --- small things ----------------------------------------------------------

  private rider(kind: Kind, what: NonNullable<Game['riderEvent']>['what']): void { this.riderEvent = { kind, what, at: this.time }; this.riderAt = 0; if (kind === 'bath' && what === 'turn') this.milk() }

  private milk(): void {
    const pose = this.hands >= 0 ? this.loadPose(this.hands) : null
    if (pose) for (let n = 0; n < 10; n++) this.drop(pose.x + (this.roll() - 0.5) * 1.6, pose.y + 0.6, LANE + 0.5, 'milk')
  }

  private pokeInside(i: number): void {
    this.insidePoke[i] = 0
    const load = this.saved.loads[i]
    this.say(voices.rider(load.kind, 'poke', load.way.turn, 0))
    this.rider(load.kind, 'poke')
  }

  private dent(col: number, row: number, kick: number): void {
    const key = `${col},${row}`, d = this.dents.get(key)
    if (d) d.v = Math.min(6, d.v + kick)
    else if (this.dents.size < 24) this.dents.set(key, { col, row, push: 0, v: Math.min(6, kick) })
  }

  /** The cubes round an opening all give a little. */
  private rim(i: number, kick: number): void {
    const o = this.saved.openings[i], open = new Set(o.cells.map(String)), left = leftOf(o)
    for (const [x, y] of o.cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) if (!open.has(`${x + dx},${y + dy}`)) this.dent(left + x + dx, SILL + y + dy, kick)
  }

  private roll(): number { this.chance = (Math.imul(this.chance, 1664525) + 1013904223) >>> 0; return this.chance / 2 ** 32 }
  private drop(x: number, y: number, z: number, kind: Crumb['kind']): void {
    if (this.crumbs.length >= 70) return
    this.crumbs.push({ x, y, z, vx: (this.roll() - 0.5) * 3.4, vy: 1.5 + this.roll() * 3, vz: 0.4 + this.roll() * 1.6, life: 0.9 + this.roll() * 0.5, kind, size: 0.07 + this.roll() * 0.08 })
  }
  private puff(x: number, y: number, z: number, kind: Crumb['kind'], many: number): void { for (let n = 0; n < many; n++) this.drop(x + (this.roll() - 0.5) * 0.6, y, z, kind) }

  private say(notes: Cue): void { if (notes.length) this.cues.push(notes) }

  /** For the guide: what one move can be shown on. */
  moves(): { load: boolean; opening: number; bear: boolean; cart: boolean } {
    const i = this.hands
    return {
      load: i >= 0, opening: i >= 0 ? this.nearest().i : -1, cart: i < 0,
      bear: i >= 0 && !solvable(this.saved.loads[i], this.saved.openings).byTurning,
    }
  }
}

function extentTurn(load: Load): { w: number; h: number } { return size(held(CELLS[load.kind], load.way)) }
