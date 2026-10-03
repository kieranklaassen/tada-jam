import type { ActionId, Cell, ObjectId } from './grid'
import { HEAD, STEP } from './layout'
import { LOCK_ROOT, TUFT_STEP, crossedBy, dropPlace, tuftPose, whatIsAt, type FacePart, type Point } from './poses'
import { act, type Clipping, type ClippingPlace, type Deed, type Salon, type Target } from './world'

// The finger. It turns the gestures of a touch into the actions of the grid,
// with no tool to pick up first: landing on a thing and dragging pulls it,
// landing beside things brings the scissors, which snip what they cross, a
// tap pokes, and rubbing back and forth ruffles. Every press is answered the
// moment it lands. Pure: it reads no clock of its own (time is passed in, in
// seconds of play) and draws nothing; what happened comes back as a list for
// the view and the sound to act out.

/** Where the blades are, from the finger: above it, so the child sees what they cross. */
export const BLADES = { x: 0, y: -36 } as const
/** A stroke this long, then one back, is a rub. Three turns within this long is a ruffle. */
export const RUB_STROKE = 10
export const RUB_TURNS = 3
export const RUB_WINDOW = 0.9
/** How much a held strip must grow before the pull is heard again, in steps. */
export const PULL_EVERY = 3
/** How often a ruffle that keeps going answers again, in seconds. */
export const RUFFLE_EVERY = 0.3

export type Held =
  | { object: 'lock' }
  | { object: 'tuft'; index: number }
  | { object: 'face'; part: FacePart }
  | { object: 'clipping'; index: number }

export type Happening =
  /** A press landed on a thing: it is caught, at once. */
  | { kind: 'caught'; held: Held; at: Point }
  /** A press landed beside things: the scissors are in the hand, at once. */
  | { kind: 'scissors'; at: Point }
  /** A cell of the grid answered. */
  | { kind: 'cell'; object: ObjectId; action: ActionId; cell: Cell; held: Held | null; at: Point; rings: number | null; piece: Clipping | null; place: ClippingPlace | null }
  /** The scissors closed on nothing. */
  | { kind: 'airSnip'; at: Point }
  /** The thing in the fingers was let go. */
  | { kind: 'letGo'; held: Held; at: Point }
  /** The scissors left the hand. */
  | { kind: 'away' }

type Rub = { lastX: number; lastY: number; dirX: number; dirY: number; runX: number; runY: number; turns: number[]; ruffled: boolean; lastAnswer: number }

type Holding =
  | { mode: 'thing'; held: Held; start: Point; grip: number; before: number; heard: number; dragged: boolean; rub: Rub }
  | { mode: 'scissors'; last: Point; overFace: boolean; cut: boolean }

export type Step = { salon: Salon; happenings: Happening[] }

const targetOf = (held: Held): Target =>
  held.object === 'tuft' ? { object: 'tuft', index: held.index } : held.object === 'clipping' ? { object: 'clipping', index: held.index } : held.object === 'face' ? { object: 'face', who: 'chair' } : { object: 'lock' }

const blades = (p: Point): Point => ({ x: p.x + BLADES.x, y: p.y + BLADES.y })

export class Hand {
  private holding: Holding | null = null

  /** What the fingers hold now, for the view: a thing, the scissors, or nothing. */
  get held(): Held | 'scissors' | null {
    return !this.holding ? null : this.holding.mode === 'scissors' ? 'scissors' : this.holding.held
  }

  /** A ruffle is going on under the finger. */
  get ruffling(): boolean {
    return this.holding?.mode === 'thing' && this.holding.rub.ruffled
  }

  /** The root a held strip is pulled away from, and how many scene units one step of it is. */
  private static root(held: Held, salon: Salon): { root: Point; unit: number; length: number } | null {
    if (held.object === 'lock') return { root: LOCK_ROOT, unit: STEP, length: salon.lock }
    if (held.object !== 'tuft') return null
    const steps = salon.mane[held.index] ?? 0, pose = tuftPose(held.index, steps, salon.mane.length)
    return { root: { x: HEAD.x + pose.base.x, y: HEAD.y + pose.base.y }, unit: TUFT_STEP, length: steps }
  }

  press(salon: Salon, p: Point, now: number): Step {
    const touched = whatIsAt(salon, p)
    if (!touched) {
      this.holding = { mode: 'scissors', last: blades(p), overFace: false, cut: false }
      return { salon, happenings: [{ kind: 'scissors', at: p }] }
    }
    const held: Held = touched.object === 'lock' ? { object: 'lock' } : touched.object === 'tuft' ? { object: 'tuft', index: touched.index } : touched.object === 'face' ? { object: 'face', part: touched.part } : { object: 'clipping', index: touched.index }
    const strip = Hand.root(held, salon)
    this.holding = {
      mode: 'thing', held, start: p, dragged: false, heard: strip?.length ?? 0, before: strip?.length ?? 0,
      grip: strip ? Math.hypot(p.x - strip.root.x, p.y - strip.root.y) : 0,
      rub: { lastX: p.x, lastY: p.y, dirX: 0, dirY: 0, runX: 0, runY: 0, turns: [], ruffled: false, lastAnswer: now },
    }
    return { salon, happenings: [{ kind: 'caught', held, at: p }] }
  }

  move(salon: Salon, p: Point, now: number): Step {
    const holding = this.holding
    if (!holding) return { salon, happenings: [] }
    if (holding.mode === 'scissors') return this.snip(salon, holding, p)
    holding.dragged = true
    const happenings: Happening[] = []
    const { held, rub } = holding
    const turned = Hand.rubbed(rub, p, now)

    if (!rub.ruffled && rub.turns.length >= RUB_TURNS) {
      // It is a ruffle. A strip that grew a little under the first strokes is as long as before again.
      rub.ruffled = true
      rub.lastAnswer = now
      if (held.object === 'lock') salon = { ...salon, lock: holding.before }
      if (held.object === 'tuft') { const index = held.index; salon = { ...salon, mane: salon.mane.map((steps, i) => (i === index ? holding.before : steps)) } }
      return this.answer(salon, held, { action: 'ruffle' }, p, happenings)
    }
    if (rub.ruffled) {
      // A piece that was rubbed is gone; anything else keeps answering for as long as the rub goes on.
      if (held.object === 'clipping') return { salon, happenings }
      if (turned && now - rub.lastAnswer >= RUFFLE_EVERY) { rub.lastAnswer = now; return this.answer(salon, held, { action: 'ruffle' }, p, happenings) }
      return { salon, happenings }
    }

    const strip = Hand.root(held, salon)
    if (strip) {
      const to = holding.before + (Math.hypot(p.x - strip.root.x, p.y - strip.root.y) - holding.grip) / strip.unit
      if (to > strip.length + 0.5) {
        const done = act(salon, targetOf(held), { action: 'pull', to })
        salon = done.salon
        const length = Hand.root(held, salon)!.length
        if (done.cell && (length - holding.heard >= PULL_EVERY || holding.heard === holding.before)) {
          holding.heard = length
          happenings.push({ kind: 'cell', object: held.object, action: 'pull', cell: done.cell, held, at: p, rings: done.rings, piece: null, place: null })
        }
      }
    }
    return { salon, happenings }
  }

  /** The press ended where it began: a poke. With the scissors, the blades close on the air. */
  tap(salon: Salon, p: Point): Step {
    const holding = this.holding
    this.holding = null
    if (!holding) return { salon, happenings: [] }
    if (holding.mode === 'scissors') return { salon, happenings: [{ kind: 'airSnip', at: blades(p) }, { kind: 'away' }] }
    return this.answer(salon, holding.held, { action: 'poke' }, p, [])
  }

  /** The touch is over and was not a tap: what is held is put down where it is. */
  end(salon: Salon, p: Point): Step {
    const holding = this.holding
    this.holding = null
    if (!holding) return { salon, happenings: [] }
    if (holding.mode === 'scissors') return { salon, happenings: [...(holding.cut ? [] : [{ kind: 'airSnip' as const, at: blades(p) }]), { kind: 'away' }] }
    const { held, rub } = holding
    if (rub.ruffled || !holding.dragged) return { salon, happenings: [{ kind: 'letGo', held, at: p }] }
    // A cheek that was pulled snaps back; a piece that was carried lies where it is let go.
    if (held.object === 'face') return this.answer(salon, held, { action: 'pull' }, p, [])
    if (held.object === 'clipping') return this.answer(salon, held, { action: 'pull', drop: dropPlace(p) }, p, [])
    return { salon, happenings: [{ kind: 'letGo', held, at: p }] }
  }

  private answer(salon: Salon, held: Held, deed: Deed, p: Point, happenings: Happening[]): Step {
    const before = salon.clippings
    const done = act(salon, targetOf(held), deed)
    if (!done.cell) return { salon: done.salon, happenings }
    const place = deed.action === 'pull' && deed.drop ? deed.drop : null
    const piece = done.salon.clippings.find((c) => !before.includes(c)) ?? null
    happenings.push({ kind: 'cell', object: held.object, action: deed.action, cell: done.cell, held, at: p, rings: done.rings, piece, place })
    return { salon: done.salon, happenings }
  }

  /** The scissors moved: they close on whatever their blades crossed since the last move. */
  private snip(salon: Salon, holding: Extract<Holding, { mode: 'scissors' }>, p: Point): Step {
    const happenings: Happening[] = []
    const to = blades(p)
    let cutClipping = false
    for (const crossed of crossedBy(salon, holding.last, to)) {
      if (crossed.object === 'face') {
        // Once for each time the blades come in over the face.
        if (holding.overFace) continue
        holding.overFace = true
        const done = act(salon, { object: 'face', who: 'chair' }, { action: 'snip', at: 0 })
        if (done.cell) happenings.push({ kind: 'cell', object: 'face', action: 'snip', cell: done.cell, held: null, at: crossed.where, rings: null, piece: null, place: null })
        continue
      }
      // One piece on the floor for each stroke: cutting one moves the others along the list.
      if (crossed.object === 'clipping' && cutClipping) continue
      const target: Target = crossed.object === 'lock' ? { object: 'lock' } : crossed.object === 'tuft' ? { object: 'tuft', index: crossed.index } : { object: 'clipping', index: crossed.index }
      const before = salon.clippings
      const done = act(salon, target, { action: 'snip', at: crossed.object === 'clipping' ? 0 : crossed.at })
      if (!done.cell) continue
      if (crossed.object === 'clipping') cutClipping = true
      holding.cut = true
      salon = done.salon
      const piece = crossed.object === 'clipping' ? null : (salon.clippings.find((c) => !before.includes(c)) ?? null)
      const held: Held | null = crossed.object === 'lock' ? { object: 'lock' } : crossed.object === 'tuft' ? { object: 'tuft', index: crossed.index } : null
      happenings.push({ kind: 'cell', object: crossed.object, action: 'snip', cell: done.cell, held, at: crossed.where, rings: done.rings, piece, place: null })
    }
    const dx = to.x - HEAD.x, dy = to.y - HEAD.y
    if ((dx * dx) / (HEAD.rx * HEAD.rx) + (dy * dy) / (HEAD.ry * HEAD.ry) > 1) holding.overFace = false
    holding.last = to
    return { salon, happenings }
  }

  /** Follows the finger for a rub: a stroke one way and then back is a turn. Says whether this move made a turn. */
  private static rubbed(rub: Rub, p: Point, now: number): boolean {
    let turned = false
    const dx = p.x - rub.lastX, dy = p.y - rub.lastY
    rub.lastX = p.x
    rub.lastY = p.y
    const along = (delta: number, dir: 'dirX' | 'dirY', run: 'runX' | 'runY'): void => {
      if (delta === 0) return
      const sign = Math.sign(delta)
      if (sign === rub[dir]) { rub[run] += Math.abs(delta); return }
      if (rub[dir] !== 0 && rub[run] >= RUB_STROKE) { rub.turns.push(now); turned = true }
      rub[dir] = sign
      rub[run] = Math.abs(delta)
    }
    along(dx, 'dirX', 'runX')
    along(dy, 'dirY', 'runY')
    rub.turns = rub.turns.filter((t) => now - t <= RUB_WINDOW)
    return turned
  }
}
