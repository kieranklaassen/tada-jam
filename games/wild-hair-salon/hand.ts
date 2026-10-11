import type { ActionId, Cell, ObjectId } from './grid'
import { crossedBy, dropPlace, overAFace, stripOf, tuftRoot, whatIsAt, type Button, type FacePart, type Point, type Touched } from './poses'
import { act, type Clipping, type ClippingPlace, type Deed, type Salon, type Target, type Who } from './world'

// The finger. It turns the gestures of a touch into the actions of the grid,
// with no tool to pick up first: landing on a thing and dragging pulls it,
// landing beside things brings the scissors, which snip what they cross, a
// tap pokes, rubbing back and forth ruffles, and the ribbon is carried by its
// clip to whatever it is brought to. A few things are only touched to move
// the game on: the door, the empty seat, the cape's knot and the chair. Every
// press is answered the moment it lands. Pure: it reads no clock of its own
// (time is passed in, in seconds of play) and draws nothing; what happened
// comes back as a list for the game, the view and the sound to act on.

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
  | { object: 'model' }
  | { object: 'ribbon' }
  /** The ribbon, carried by its clip. */
  | { object: 'ribbonClip' }
  | { object: 'tuft'; index: number }
  | { object: 'face'; who: Who; part: FacePart }
  | { object: 'clipping'; index: number }

export type Happening =
  /** A press landed on a thing: it is caught, at once. */
  | { kind: 'caught'; held: Held; at: Point }
  /** A press landed beside things: the scissors are in the hand, at once. */
  | { kind: 'scissors'; at: Point }
  /** A press landed on something that moves the game on: it gives under the finger, at once. */
  | { kind: 'pressed'; button: Button; at: Point }
  /** That press ended: the game acts on it. */
  | { kind: 'button'; button: Button; at: Point }
  /** A cell of the grid answered. `sprangBack` says the hair was not under the cape and is as long as before. */
  | { kind: 'cell'; object: ObjectId; action: ActionId; cell: Cell; held: Held | null; at: Point; rings: number | null; piece: Clipping | null; place: ClippingPlace | null; sprangBack: boolean }
  /** The scissors closed on nothing. */
  | { kind: 'airSnip'; at: Point }
  /** The thing in the fingers was let go. */
  | { kind: 'letGo'; held: Held; at: Point }
  /** The scissors left the hand. */
  | { kind: 'away' }
  /** A press landed on one of the room's own two things: it answers for itself, at once, and nothing is in the hand. */
  | { kind: 'room'; thing: 'glass' | 'sweepings'; at: Point }
  /** A touch on an empty salon, where there is nothing to work on: the pair at the door look round at it. */
  | { kind: 'looked'; at: Point }

type Rub = { lastX: number; lastY: number; dirX: number; dirY: number; runX: number; runY: number; turns: number[]; ruffled: boolean; lastAnswer: number }

type Holding =
  | { mode: 'thing'; held: Held; start: Point; grip: number; before: number; heard: number; dragged: boolean; rub: Rub }
  | { mode: 'scissors'; last: Point; overFace: boolean; cut: boolean }
  | { mode: 'button'; button: Button; start: Point }
  /** A finger on an empty salon: there is nothing to cut, so no scissors come. */
  | { mode: 'empty' }

/** A press on the door, a seat or the chair counts when the finger comes off within this of where it went down: a swipe that only began there does not. The knot is pulled, so a drag from it counts however far it goes. */
export const BUTTON_SLOP = 70

export type Step = { salon: Salon; happenings: Happening[] }

const targetOf = (held: Held): Target => {
  switch (held.object) {
    case 'tuft': return { object: 'tuft', index: held.index }
    case 'clipping': return { object: 'clipping', index: held.index }
    case 'face': return { object: 'face', who: held.who }
    case 'ribbonClip': return { object: 'ribbon' }
    default: return { object: held.object }
  }
}

const heldOf = (touched: Exclude<Touched, { object: 'button' } | { object: 'room' }>): Held => {
  switch (touched.object) {
    case 'tuft': return { object: 'tuft', index: touched.index }
    case 'clipping': return { object: 'clipping', index: touched.index }
    case 'face': return { object: 'face', who: touched.who, part: touched.part }
    default: return { object: touched.object }
  }
}

const blades = (p: Point): Point => ({ x: p.x + BLADES.x, y: p.y + BLADES.y })

export class Hand {
  private holding: Holding | null = null
  /** How far the held hair is drawn out past its own length, in steps: hair that springs back shows it and loses it. */
  drawnOut = 0

  /** What the fingers hold now, for the view: a thing, the scissors, or nothing. */
  get held(): Held | 'scissors' | null {
    return !this.holding || this.holding.mode === 'button' || this.holding.mode === 'empty' ? null : this.holding.mode === 'scissors' ? 'scissors' : this.holding.held
  }

  /** A ruffle is going on under the finger. */
  get ruffling(): boolean {
    return this.holding?.mode === 'thing' && this.holding.rub.ruffled
  }

  /** The root a held strip is pulled away from, how many scene units one step of it is, and its length. */
  private static root(held: Held, salon: Salon): { root: Point; unit: number; length: number } | null {
    if (held.object === 'lock' || held.object === 'model' || held.object === 'ribbon') return stripOf(salon, held.object)
    return held.object === 'tuft' ? tuftRoot(salon, held.index) : null
  }

  /** The finger is gone without letting go: nothing is held any more, and nothing it was on is done. */
  drop(): void {
    this.holding = null
    this.drawnOut = 0
  }

  press(salon: Salon, p: Point, now: number): Step {
    this.drawnOut = 0
    const touched = whatIsAt(salon, p)
    if (!touched) {
      // No tool before it means anything: until the first pair has come in there is no hair and nothing lies about, and no scissors come.
      if (salon.chair === null && salon.clippings.length === 0 && salon.ribbon === null) {
        this.holding = { mode: 'empty' }
        return { salon, happenings: [{ kind: 'looked', at: p }] }
      }
      this.holding = { mode: 'scissors', last: blades(p), overFace: false, cut: false }
      return { salon, happenings: [{ kind: 'scissors', at: p }] }
    }
    if (touched.object === 'button') {
      this.holding = { mode: 'button', button: touched.button, start: p }
      return { salon, happenings: [{ kind: 'pressed', button: touched.button, at: p }] }
    }
    if (touched.object === 'room') {
      // The room's own things answer the moment the finger lands, and nothing is held. The face in the looking glass is
      // the customer's face: a touch on it there is a poke, where the finger is on it.
      this.holding = { mode: 'empty' }
      const room: Happening = { kind: 'room', thing: touched.thing, at: p }
      if (touched.thing === 'sweepings') return { salon, happenings: [room] }
      const poked = this.answer(salon, { object: 'face', who: 'chair', part: touched.part }, { action: 'poke' }, p, [])
      this.holding = { mode: 'empty' }
      return { salon: poked.salon, happenings: [room, ...poked.happenings] }
    }
    const held = heldOf(touched)
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
    if (!holding || holding.mode === 'button' || holding.mode === 'empty') return { salon, happenings: [] }
    if (holding.mode === 'scissors') return this.snip(salon, holding, p)
    holding.dragged = true
    const happenings: Happening[] = []
    const { held, rub } = holding
    // The ribbon in the fingers is carried, however the finger wanders: it is never rubbed.
    if (held.object === 'ribbonClip') return { salon, happenings }
    const turned = Hand.rubbed(rub, p, now)

    if (!rub.ruffled && rub.turns.length >= RUB_TURNS) {
      // It is a ruffle. A strip that grew a little under the first strokes is as long as before again.
      rub.ruffled = true
      rub.lastAnswer = now
      this.drawnOut = 0
      if (held.object === 'lock' && salon.cape === 'on') salon = { ...salon, lock: holding.before }
      if (held.object === 'ribbon' && salon.ribbon) salon = { ...salon, ribbon: { ...salon.ribbon, len: holding.before } }
      if (held.object === 'tuft' && salon.cape === 'on') { const index = held.index; salon = { ...salon, mane: salon.mane.map((steps, i) => (i === index ? holding.before : steps)) } }
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
        const before = salon.clippings
        const done = act(salon, targetOf(held), { action: 'pull', to })
        salon = done.salon
        const length = Hand.root(held, salon)?.length ?? strip.length
        // Hair that springs back is drawn out for as long as it is held, and is no longer for it.
        this.drawnOut = Math.max(0, Math.min(40, to - length))
        const first = holding.heard === holding.before
        if (done.cell && (done.sprangBack ? first : length - holding.heard >= PULL_EVERY || first)) {
          holding.heard = done.sprangBack ? holding.before + 1 : length
          happenings.push({ kind: 'cell', object: targetOf(held).object as ObjectId, action: 'pull', cell: done.cell, held, at: p, rings: done.rings, piece: salon.clippings.find((c) => !before.includes(c)) ?? null, place: null, sprangBack: done.sprangBack })
        }
      } else this.drawnOut = 0
    }
    return { salon, happenings }
  }

  /** The press ended where it began: a poke. With the scissors, the blades close on the air. */
  tap(salon: Salon, p: Point): Step {
    const holding = this.holding
    this.holding = null
    this.drawnOut = 0
    if (!holding) return { salon, happenings: [] }
    if (holding.mode === 'empty') return { salon, happenings: [{ kind: 'away' }] }
    if (holding.mode === 'button') return { salon, happenings: [{ kind: 'button', button: holding.button, at: p }] }
    if (holding.mode === 'scissors') return { salon, happenings: [{ kind: 'airSnip', at: blades(p) }, { kind: 'away' }] }
    return this.answer(salon, holding.held, { action: 'poke' }, p, [])
  }

  /** The touch is over and was not a tap: what is held is put down where it is. */
  end(salon: Salon, p: Point): Step {
    const holding = this.holding
    this.holding = null
    this.drawnOut = 0
    if (!holding) return { salon, happenings: [] }
    if (holding.mode === 'empty') return { salon, happenings: [{ kind: 'away' }] }
    if (holding.mode === 'button') {
      const swiped = holding.button !== 'knot' && Math.hypot(p.x - holding.start.x, p.y - holding.start.y) > BUTTON_SLOP
      // A swipe that only began there: the finger has gone away and the thing is not touched.
      return { salon, happenings: swiped ? [{ kind: 'away' }] : [{ kind: 'button', button: holding.button, at: p }] }
    }
    if (holding.mode === 'scissors') return { salon, happenings: [...(holding.cut ? [] : [{ kind: 'airSnip' as const, at: blades(p) }]), { kind: 'away' }] }
    const { held, rub } = holding
    if (rub.ruffled || !holding.dragged) return { salon, happenings: [{ kind: 'letGo', held, at: p }] }
    // A cheek that was pulled snaps back; a piece that was carried lies where it is let go; the ribbon hangs beside what it was brought to.
    if (held.object === 'face') return this.answer(salon, held, { action: 'pull' }, p, [])
    if (held.object === 'clipping') return this.answer(salon, held, { action: 'pull', drop: dropPlace(salon, p) }, p, [])
    if (held.object === 'ribbonClip') return this.bring(salon, p)
    return { salon, happenings: [{ kind: 'letGo', held, at: p }] }
  }

  /** The ribbon was let go over something: it goes to that thing, or back to its peg when it was let go over nothing. */
  private bring(salon: Salon, p: Point): Step {
    // What is under the finger, as if the ribbon itself were not there.
    const under = whatIsAt({ ...salon, ribbon: null }, p)
    // A piece stuck on a face is part of that face to the ribbon, which goes round the head.
    const worn = under?.object === 'clipping' ? salon.clippings[under.index] : null
    const held: Held = worn?.on === 'face' ? { object: 'face', who: worn.who, part: 'cheek' }
      : !under || under.object === 'button' || under.object === 'room' || under.object === 'ribbon' || under.object === 'ribbonClip' ? { object: 'ribbon' } : heldOf(under)
    const done = act(salon, targetOf(held), { action: 'ribbon' })
    if (!done.cell) return { salon, happenings: [{ kind: 'letGo', held: { object: 'ribbonClip' }, at: p }] }
    return { salon: done.salon, happenings: [{ kind: 'cell', object: targetOf(held).object as ObjectId, action: 'ribbon', cell: done.cell, held, at: p, rings: null, piece: null, place: null, sprangBack: false }] }
  }

  private answer(salon: Salon, held: Held, deed: Deed, p: Point, happenings: Happening[]): Step {
    const before = salon.clippings
    const target = targetOf(held)
    const done = act(salon, target, deed)
    if (!done.cell) return { salon: done.salon, happenings }
    const place = deed.action === 'pull' && deed.drop ? deed.drop : null
    const piece = done.salon.clippings.find((c) => !before.includes(c)) ?? null
    happenings.push({ kind: 'cell', object: target.object as ObjectId, action: deed.action, cell: done.cell, held, at: p, rings: done.rings, piece, place, sprangBack: done.sprangBack })
    return { salon: done.salon, happenings }
  }

  /** The scissors moved: they close on whatever their blades crossed since the last move. */
  private snip(salon: Salon, holding: Extract<Holding, { mode: 'scissors' }>, p: Point): Step {
    const happenings: Happening[] = []
    const to = blades(p)
    let cutClipping = false
    // The pieces as they lay when the blades moved: a cut earlier in this stroke can take one away and move the rest along the list.
    const lay = salon.clippings
    for (const crossed of crossedBy(salon, holding.last, to)) {
      if (crossed.object === 'face') {
        // Once for each time the blades come in over a face.
        if (holding.overFace) continue
        holding.overFace = true
        const done = act(salon, { object: 'face', who: crossed.who }, { action: 'snip', at: 0 })
        if (done.cell) happenings.push({ kind: 'cell', object: 'face', action: 'snip', cell: done.cell, held: { object: 'face', who: crossed.who, part: 'nose' }, at: crossed.where, rings: null, piece: null, place: null, sprangBack: false })
        continue
      }
      // One piece on the floor for each stroke: cutting one moves the others along the list.
      if (crossed.object === 'clipping' && cutClipping) continue
      const now = crossed.object === 'clipping' ? salon.clippings.indexOf(lay[crossed.index]) : 0
      if (now < 0) continue
      const target: Target = crossed.object === 'tuft' ? { object: 'tuft', index: crossed.index } : crossed.object === 'clipping' ? { object: 'clipping', index: now } : { object: crossed.object }
      const before = salon.clippings
      const done = act(salon, target, { action: 'snip', at: crossed.object === 'clipping' ? 0 : crossed.at })
      if (!done.cell) continue
      if (crossed.object === 'clipping') cutClipping = true
      holding.cut = true
      salon = done.salon
      const piece = crossed.object === 'clipping' ? null : (salon.clippings.find((c) => !before.includes(c)) ?? null)
      const held: Held | null = crossed.object === 'tuft' ? { object: 'tuft', index: crossed.index } : crossed.object === 'clipping' ? null : { object: crossed.object }
      happenings.push({ kind: 'cell', object: crossed.object, action: 'snip', cell: done.cell, held, at: crossed.where, rings: done.rings, piece, place: null, sprangBack: done.sprangBack })
    }
    if (!overAFace(salon, to)) holding.overFace = false
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
