import type { Id } from './cast'
import { CARRY_Z, type Game } from './game'
import { onPlane, type P3 } from './layout'
import { IdleLadder, type Guidance } from './guidance'
import { nextDemo, type Demo } from './guide'
import { inCorner } from './overlay'
import { Aim, inHome, type Target } from './targets'

// The path a touch takes, with no browser in it. The Mount passes pointer
// events in by their ids and surface pixels; a test does the same.
// - One finger works at a time. A finger that rests hands the work on: one
//   that landed on nothing that acts, or that has lain still for a second. A
//   finger that carries keeps it; a second finger is answered where it lands
//   and changes nothing.
// - A tap acts on its lift. A cancel, a lost capture and a put-away never act
//   for the child: what was carried goes back where it came from.
// - A lifted carry waits a moment for the finger to come back.
// - The grown-up's corner and the home control answer nothing and do not
//   count as a touch.

export const TAP_SLOP = 14
export const REST_S = 1
/** Seconds a lifted carry waits for the finger, and how near it must come back. */
export const LIFT_GRACE_S = 0.3
export const REGRAB = 140

type Contact = { id: number; x: number; y: number; landed: number; target: Target; carrying: boolean; spent: boolean }

export class Play {
  readonly aim = new Aim()
  readonly ladder = new IdleLadder(0)
  demo: Demo | null = null
  private working: Contact | null = null
  /** A carry whose finger has lifted, waiting for it to come back. */
  private lifted: { x: number; y: number; at: number } | null = null
  private grip: P3 = { x: 0, y: 0, z: 0 }
  private demoIndex = -1

  constructor(readonly game: Game) {}

  size(width: number, height: number): void { this.aim.size(width, height) }

  private acts(target: Target): boolean {
    return target.kind === 'sitter' || target.kind === 'nail' || (target.kind === 'small' && (target.what === 'maestro' || target.what === 'easel' || target.what === 'key' || target.what === 'shown'))
  }

  private rests(c: Contact): boolean {
    return !c.carrying && (c.spent || !this.acts(c.target) || this.game.time - c.landed >= REST_S)
  }

  down(id: number, x: number, y: number): boolean {
    const { aim, game } = this
    if (aim.width <= 0 || inCorner(x, y, aim.width) || inHome(x, y, aim.width)) return false
    this.ladder.touch(game.time)
    this.demo = null
    const lifted = this.lifted
    if (lifted && game.hand) {
      this.lifted = null
      if (Math.hypot(x - lifted.x, y - lifted.y) <= REGRAB) {
        this.working = { id, x, y, landed: game.time, target: { kind: 'sitter', id: game.hand.id }, carrying: true, spent: false }
        this.follow(x, y)
        return true
      }
      game.drop(aim.placeUnder(game, lifted.x, lifted.y))
    }
    const target = aim.at(game, x, y)
    if (this.working && !this.rests(this.working)) { this.answer(target); return true }
    // A touch in a scene lands it and is spent on that, whatever it lies on.
    const spent = game.interrupt()
    this.working = { id, x, y, landed: game.time, target, carrying: false, spent }
    this.answer(target)
    return true
  }

  /** What a landing finger is answered with. */
  private answer(target: Target): void {
    const { game } = this
    if (target.kind === 'sitter') game.pressed(target.id)
    else if (target.kind === 'nail') game.swingPicture(target.n)
    else if (target.kind === 'small') game.small(target.what)
    else game.small('floor')
  }

  move(id: number, x: number, y: number): void {
    const c = this.working
    if (!c || c.id !== id) return
    this.ladder.touch(this.game.time)
    if (c.spent || c.target.kind !== 'sitter') return
    if (!c.carrying) {
      if (Math.hypot(x - c.x, y - c.y) <= TAP_SLOP) return
      c.carrying = true
      this.pick(c.target.id, c.x, c.y)
    }
    this.follow(x, y)
  }

  private pick(id: Id, x: number, y: number): void {
    const { game, aim } = this, pose = game.poses[id]
    // Where on its body the finger has it, carried onto the plane it hangs in.
    const foot = aim.px(pose)
    const a = onPlane(aim.seeing, x, y, aim.width, aim.height, CARRY_Z), b = onPlane(aim.seeing, foot.x, foot.y, aim.width, aim.height, CARRY_Z)
    this.grip = { x: Math.max(-0.5, Math.min(0.5, b.x - a.x)), y: Math.max(-2.2, Math.min(-0.9, b.y - a.y)), z: 0 }
    game.take(id, { x: a.x + this.grip.x, y: a.y + this.grip.y, z: CARRY_Z })
  }

  private follow(x: number, y: number): void {
    const { aim, game } = this, p = onPlane(aim.seeing, x, y, aim.width, aim.height, CARRY_Z)
    game.carry({ x: p.x + this.grip.x, y: Math.max(-1.2, p.y + this.grip.y), z: CARRY_Z })
    this.at = { x, y }
  }
  private at = { x: 0, y: 0 }
  /** The place a carried one would go to now, for the view to light. */
  get over(): { x: number; y: number } | null { return this.game.hand ? this.at : null }

  up(id: number, x: number, y: number): void {
    const c = this.working
    if (!c || c.id !== id) return
    this.working = null
    this.ladder.touch(this.game.time)
    if (c.spent) return
    if (c.carrying) {
      this.follow(x, y)
      this.lifted = { x, y, at: this.game.time }
      return
    }
    this.tap(c.target)
  }

  private tap(target: Target): void {
    const { game } = this
    if (target.kind === 'sitter') game.tapped(target.id)
    else if (target.kind === 'small') {
      if (target.what === 'maestro' || target.what === 'easel') game.paint()
      else if (target.what === 'key') game.tappedKey()
    }
  }

  cancel(id: number): void {
    const c = this.working
    if (!c || c.id !== id) return
    this.working = null
    if (c.carrying) this.game.drop(null)
  }

  step(dt: number): Guidance {
    const { game } = this
    game.step(dt)
    if (this.lifted && game.time - this.lifted.at > LIFT_GRACE_S) {
      const { x, y } = this.lifted
      this.lifted = null
      game.drop(this.aim.placeUnder(game, x, y))
    }
    if (game.busy || this.working?.carrying) this.ladder.touch(game.time)
    const guidance = this.ladder.update(game.time)
    if (guidance.demoIndex !== this.demoIndex) {
      this.demoIndex = guidance.demoIndex
      this.demo = guidance.demoIndex >= 0 ? nextDemo(game, guidance.demoIndex) : null
    }
    return guidance
  }

  /** Put away: a carry whose finger had let go lands where it was let go; one still in the finger was never taken. */
  park(): void {
    const { game } = this
    if (this.lifted && game.hand) game.drop(this.aim.placeUnder(game, this.lifted.x, this.lifted.y))
    this.lifted = null
    this.working = null
    this.demo = null
    this.demoIndex = -1
    game.park()
    this.ladder.touch(game.time)
  }
}
