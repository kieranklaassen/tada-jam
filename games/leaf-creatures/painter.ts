import { HEAPS, ROW_AT } from './clearing'
import type { Tier } from './config'
import { pokedFor, type Creature } from './creatures'
import { drawLaid, lyingStill, settleOf } from './laid'
import { KINDS, SHAPES, type Kind } from './parts'
import { posedPart, type Posed } from './posed'
import { AHEAD, ROW, SLOTS, eyeKey, gazeOf, heapKey, partKey, slotKey, type Pen } from './pen'
import { caps, radius, type Part, type Thing } from './things'
import type { Toy } from './toy'

// The two kinds of picture the view keeps up to date itself, so that a frame
// stays a few stamps however full the clearing is.
// - The picture of the place (`laid`): the scenery with every loose part
//   and dug acorn that lies still stamped on to it. A thing is added
//   when it comes to rest; when it is lifted, changed or gone, its box is
//   wiped back to scenery and whatever else lies still there is stamped
//   again, in its own order.
// - The picture of the heaps (`row`): every heap that stands at rest. It is
//   laid over whatever is on the ground, once a frame, so a creature that
//   reaches behind a heap is behind it. It is made again in the frame a heap
//   begins to spring and in the frame one comes to rest.
// - One picture for each creature: its parts and eyes as they are posed now.
//   It is drawn again when the pose has changed, the creature longest
//   unpainted first, and only while the frame has room: a frame that would
//   pass `CAP` puts the redraw off to the next. A creature is therefore
//   redrawn a few times a second while it moves, which is the low boil of
//   this look, and travels, turns, hops and squashes smoothly in between,
//   since those are done where its picture is stamped.

/** A creature is drawn again only while the frame, with that, stays within this many stamps and strokes. */
export const CAP = 68
/** A picture that has waited `MOST_WAIT` seconds of the toy's clock, whatever the frame rate, is drawn again while the frame stays within this many: one such a frame, and never past it. */
export const HARD = 70
export const MOST_WAIT = 0.1

type Box = { x0: number; y0: number; x1: number; y1: number }
type Item = Box & { ref: object; sig: number; /** Where it lies and how it is turned, to tell a thing that has only been reckoned afresh from one that moved. */ px: number; py: number; pt: number; acorn: number; thing: Thing | null; part: Part | null; peeking: boolean }
type Kept = Box & { sig: number; px: number; py: number; pt: number }
const same = (item: Item, kept: Kept): boolean => item.sig === kept.sig && Math.abs(item.px - kept.px) < 0.75 && Math.abs(item.py - kept.py) < 0.75 && Math.abs(item.pt - kept.pt) < 0.006
type Sprite = { slot: number; sig: number; at: number; size: number; /** Its picture has been drawn; and its parts have left the picture of the place, so it is drawn from its own. */ posed: boolean; ready: boolean; /** The time on the toy's clock at which its pose first differed from its picture, or -1. */ since: number; /** The parts that are in its picture as it was last drawn. */ drawn: Set<Part> }

const pose: Posed = { x: 0, y: 0, turn: 0, along: 1, across: 1 }
const settled = { turn: 0, sx: 1, sy: 1, up: 0 }
const touch = (a: Box, b: Box): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const mix = (hash: number, value: number): number => Math.imul(hash ^ (value | 0), 0x01000193) >>> 0

export class Painter {
  /** Where the idle glow lies and how far it has grown out, 0 to 1; `at` is the toy's clock when it was last drawn, or -1 before that. */
  readonly glow = { x: 0, y: 0, out: 0, at: -1 }
  private epoch = -1
  private based = false
  private frame = 0
  private readonly items: Item[] = []
  private count = 0
  private readonly index = new Map<object, number>()
  private readonly inLayer = new Map<object, Kept>()
  private readonly sprites = new Map<Creature, Sprite>()
  private readonly stale: Creature[] = []
  private readonly dirty: Box[] = []
  /** The heaps that are in the picture of the heaps, as one number; -1 before it is made. */
  private inRow = -1
  /** How many creature pictures were drawn again in the last frame, and how many redraws waited for room. */
  redrawn = 0
  waited = 0
  /** The most seconds of the toy's clock any creature's picture has stayed behind its pose before it was drawn again. */
  longestWait = 0

  /** Whether a part or an acorn is in the picture of the place now, and so not to be drawn live. */
  holds(ref: object): boolean {
    return this.inLayer.has(ref)
  }

  /** Whether a heap is in the picture of the heaps now, and so not to be drawn live. */
  holdsHeap(kind: Kind): boolean {
    return (this.inRow & (1 << KINDS.indexOf(kind))) !== 0
  }

  /** The picture of a creature, or null until it has one: a creature just woken is still in the picture of the place. */
  pictureOf(creature: Creature): string | null {
    const sprite = this.sprites.get(creature)
    return sprite && sprite.ready ? slotKey(sprite.slot) : null
  }

  private add(ref: object, sig: number, x: number, y: number, rx: number, ry = rx): Item {
    let item = this.items[this.count]
    if (!item) { item = { ref, sig, px: 0, py: 0, pt: 0, acorn: -1, thing: null, part: null, peeking: false, x0: 0, y0: 0, x1: 0, y1: 0 }; this.items.push(item) }
    item.ref = ref; item.sig = sig; item.px = x; item.py = y; item.pt = 0; item.acorn = -1; item.thing = null; item.part = null; item.peeking = false
    item.x0 = x - rx; item.y0 = y - ry; item.x1 = x + rx; item.y1 = y + ry
    this.index.set(ref, this.count++)
    return item
  }

  /** Everything that lies still now, in the order it is drawn. */
  private gather(toy: Toy): void {
    this.count = 0
    this.index.clear()
    for (const thing of toy.things) {
      // A thing that has just woken stays in the picture of the place until its own picture is made.
      const waking = thing.awake
      if (waking) { const creature = toy.creatureOf(thing); if (!creature || this.sprites.get(creature)?.ready) continue }
      const peeking = !thing.awake && caps(thing) === 1
      const c = Math.cos(thing.turn), s = Math.sin(thing.turn)
      for (const part of thing.parts) {
        const held = waking ? this.inLayer.get(part) : undefined
        if (waking) {
          // It stays exactly as it was painted, wherever the waking has moved it by now.
          if (held) { const item = this.add(part, held.sig, 0, 0, 0); item.x0 = held.x0; item.y0 = held.y0; item.x1 = held.x1; item.y1 = held.y1; item.px = held.px; item.py = held.py; item.pt = held.pt; item.thing = thing; item.part = part; item.peeking = false }
          continue
        }
        if (!lyingStill(part)) continue
        const x = thing.x + part.x * c - part.y * s, y = thing.y + part.x * s + part.y * c
        const sig = mix(mix(11, part.look), peeking && part.kind === 'cap' ? 1 : 0)
        // The box its picture fills, turned as it lies, with room for the lid of an eye that peeks.
        const long = SHAPES[part.kind].long / 2 + 16, wide = SHAPES[part.kind].wide / 2 + 16
        const ct = Math.abs(Math.cos(thing.turn + part.turn)), st = Math.abs(Math.sin(thing.turn + part.turn))
        const item = this.add(part, sig, x, y, ct * long + st * wide + 2, st * long + ct * wide + (peeking ? 16 : 2))
        item.thing = thing; item.part = part; item.peeking = peeking; item.pt = thing.turn + part.turn
      }
    }
    // The dug acorns last: they lie on top of whatever lies loose.
    toy.acornShown.forEach((shown, i) => {
      const acorn = toy.acorns[i]
      if (!acorn.dug || shown.out !== 1 || shown.hop !== 0 || shown.dust !== 0 || shown.x !== acorn.x || shown.y !== acorn.y) return
      this.add(shown, mix(mix(7, acorn.x), acorn.y), shown.x, shown.y, 40, 42).acorn = i
    })
  }

  /** Which heaps stand at rest now, as one number. */
  private resting(toy: Toy): number {
    let mask = 0
    KINDS.forEach((kind, i) => { const heap = toy.heaps[kind]; if (heap.squash === 0 && heap.speed === 0) mask |= 1 << i })
    return mask
  }

  /** The picture of the heaps: every heap that stands at rest, in one picture that is laid over whatever is on the ground. It is made again when a heap begins to spring or comes to rest. */
  private row(pen: Pen, toy: Toy): void {
    const mask = this.resting(toy)
    if (mask === this.inRow) return
    this.inRow = mask
    pen.into(ROW, ROW_AT.w, ROW_AT.h)
    KINDS.forEach((kind, i) => { if (mask & (1 << i)) pen.stamp(heapKey(kind), HEAPS[kind].x - ROW_AT.x, HEAPS[kind].y - ROW_AT.y) })
    pen.out()
  }

  private paint(pen: Pen, toy: Toy, item: Item): void {
    if (item.acorn >= 0) { const shown = toy.acornShown[item.acorn]; pen.stamp('acorn', shown.x, shown.y, shown.spin) }
    else if (item.thing && item.part) drawLaid(pen, item.thing, item.part, item.peeking)
  }

  /** Wipes a box of the picture of the place back to scenery and stamps again whatever lies still in it. */
  private repair(pen: Pen, toy: Toy, box: Box): void {
    pen.patch(box.x0, box.y0, box.x1, box.y1)
    pen.stamp('scenery', 0, 0)
    for (let i = 0; i < this.count; i++) if (this.inLayer.has(this.items[i].ref) && touch(this.items[i], box)) this.paint(pen, toy, this.items[i])
    pen.out()
  }

  /**
   * Makes the kept pictures from nothing: the place with everything that lies still on it, and the picture of
   * every creature. It does its work only when the pictures are new (a load, a put-away, a surface of another
   * size) and is called before the frame begins, so a clearing is whole in its first frame: no creature is ever
   * waiting for its picture.
   */
  prime(pen: Pen, toy: Toy, tier: Tier | null): void {
    if (this.based && pen.epoch === this.epoch) return
    this.epoch = pen.epoch; this.based = true
    this.inLayer.clear(); this.sprites.clear()
    this.inRow = -1
    this.row(pen, toy)
    // Every creature first, so that none of them is taken for a thing that lies still.
    for (let i = 0; i <= toy.creatures.length; i++) {
      const creature = i < toy.creatures.length ? toy.creatures[i] : toy.ghost
      const sprite = creature ? this.spriteFor(creature) : null
      if (creature && sprite) { this.draw(pen, creature, sprite, toy.time, tier?.boil ?? false); sprite.ready = true }
    }
    this.gather(toy)
    pen.patch(-1e5, -1e5, 1e5, 1e5)
    pen.stamp('scenery', 0, 0)
    for (let i = 0; i < this.count; i++) {
      const item = this.items[i]
      this.inLayer.set(item.ref, { sig: item.sig, px: item.px, py: item.py, pt: item.pt, x0: item.x0, y0: item.y0, x1: item.x1, y1: item.y1 })
      this.paint(pen, toy, item)
    }
    pen.out()
  }

  /** The picture kept for a creature, made if there is none yet and a place is free. */
  private spriteFor(creature: Creature): Sprite | null {
    let sprite = this.sprites.get(creature)
    if (sprite) return sprite
    const used = new Set<number>()
    for (const other of this.sprites.values()) used.add(other.slot)
    let slot = 0
    while (used.has(slot)) slot++
    if (slot >= SLOTS) return null
    sprite = { slot, sig: -1, at: -1, size: 0, posed: false, ready: false, since: -1, drawn: new Set() }
    this.sprites.set(creature, sprite)
    return sprite
  }

  /** Draws a creature's picture again as it is posed now. */
  private draw(pen: Pen, creature: Creature, sprite: Sprite, time: number, boil: boolean): void {
    const size = Math.ceil((radius(creature.thing) + 44) / 16) * 32
    sprite.size = Math.max(sprite.size, size)
    pen.into(slotKey(sprite.slot), sprite.size, sprite.size)
    sprite.drawn.clear()
    sprite.sig = this.poseOf(pen, creature, time, boil, sprite.drawn)
    pen.out()
    sprite.at = this.frame
    sprite.posed = true
  }

  /** Whether a part is in the picture its creature is drawn from now. One that is not is drawn live by the view. */
  shows(creature: Creature, part: Part): boolean {
    const sprite = this.sprites.get(creature)
    return sprite !== undefined && sprite.ready && sprite.drawn.has(part)
  }

  /** Whether a part that has left its creature (pulled off, or let go) is still in that creature's picture: until the picture is drawn without it, it is not drawn anywhere else. */
  stillOn(part: object): boolean {
    for (const sprite of this.sprites.values()) if (sprite.ready && sprite.drawn.has(part as Part)) return true
    return false
  }

  /** Brings the kept pictures up to date before the frame is drawn. */
  keep(pen: Pen, toy: Toy): void {
    this.frame++
    // The Mount primes the pictures before the frame; a caller that has not is primed here.
    this.prime(pen, toy, null)
    this.row(pen, toy)
    this.gather(toy)
    // What was in the picture and no longer lies still as it did: its box is wiped and repaired, at once.
    const dirty = this.dirty
    dirty.length = 0
    for (const [ref, kept] of this.inLayer) {
      const i = this.index.get(ref)
      if (i !== undefined && same(this.items[i], kept)) continue
      // Boxes that touch are wiped as one; boxes far apart each on their own, so nothing between them is drawn again.
      let box: Box = { x0: kept.x0, y0: kept.y0, x1: kept.x1, y1: kept.y1 }
      // What still lies still, only otherwise, is painted as it is now in the same wipe.
      const now = i === undefined ? null : this.items[i]
      if (now) {
        box = { x0: Math.min(box.x0, now.x0), y0: Math.min(box.y0, now.y0), x1: Math.max(box.x1, now.x1), y1: Math.max(box.y1, now.y1) }
        kept.sig = now.sig; kept.px = now.px; kept.py = now.py; kept.pt = now.pt; kept.x0 = now.x0; kept.y0 = now.y0; kept.x1 = now.x1; kept.y1 = now.y1
      }
      for (let k = dirty.length - 1; k >= 0; k--) {
        if (!touch(dirty[k], box)) continue
        box = { x0: Math.min(box.x0, dirty[k].x0), y0: Math.min(box.y0, dirty[k].y0), x1: Math.max(box.x1, dirty[k].x1), y1: Math.max(box.y1, dirty[k].y1) }
        dirty.splice(k, 1)
        k = dirty.length
      }
      dirty.push(box)
      if (!now) this.inLayer.delete(ref)
    }
    for (const box of dirty) this.repair(pen, toy, box)
    // What has come to rest: stamped on top, or, where something that is drawn after it already lies there, by repairing its box.
    for (let i = 0; i < this.count; i++) {
      const item = this.items[i]
      if (this.inLayer.has(item.ref)) continue
      this.inLayer.set(item.ref, { sig: item.sig, px: item.px, py: item.py, pt: item.pt, x0: item.x0, y0: item.y0, x1: item.x1, y1: item.y1 })
      let under = false
      for (let j = i + 1; j < this.count && !under; j++) under = this.inLayer.has(this.items[j].ref) && touch(this.items[j], item)
      if (under) this.repair(pen, toy, item)
      else { pen.patch(item.x0, item.y0, item.x1, item.y1); this.paint(pen, toy, item); pen.out() }
    }
  }

  /**
   * The creatures' own pictures, brought up to date once the frame itself has been drawn, so that what the frame
   * has cost is known and not guessed: those of creatures that are gone are forgotten, and those whose pose has
   * changed are drawn again, the one longest unpainted first, while the frame has room. They are seen from the
   * next frame on.
   */
  bake(pen: Pen, toy: Toy, tier: Tier): void {
    for (const creature of this.sprites.keys()) if (creature !== toy.ghost && !toy.creatures.includes(creature)) this.sprites.delete(creature)
    const stale = this.stale
    stale.length = 0
    const consider = (creature: Creature): void => {
      const sprite = this.spriteFor(creature)
      if (!sprite) return
      const sig = this.poseOf(null, creature, toy.time, tier.boil, null)
      if (sig !== sprite.sig || !sprite.ready) { stale.push(creature); if (sprite.since < 0) sprite.since = toy.time }
      else sprite.since = -1
    }
    for (const creature of toy.creatures) consider(creature)
    if (toy.ghost) consider(toy.ghost)
    // A picture that shows a part its creature no longer has, or lacks one it has, comes first; then the one longest unpainted.
    const wrong = (creature: Creature): number => (this.sprites.get(creature)!.posed && this.partsOf(creature) !== this.sprites.get(creature)!.drawn.size ? 0 : 1)
    stale.sort((a, b) => wrong(a) - wrong(b) || this.sprites.get(a)!.at - this.sprites.get(b)!.at)
    this.redrawn = 0; this.waited = 0
    let forced = false
    for (const creature of stale) {
      const sprite = this.sprites.get(creature)!, thing = creature.thing
      // A picture that has waited a tenth of a second gets the room up to the hard limit, one such a frame: nothing is left behind for good.
      const must: boolean = !forced && (toy.time - sprite.since > MOST_WAIT || wrong(creature) === 0)
      const room = (must ? HARD : CAP) - pen.count
      if (sprite.ready || !sprite.posed) {
        const cost = this.costOf(creature)
        if (cost > room) { this.waited++; continue }
        if (must && cost > CAP - pen.count) forced = true
        this.draw(pen, creature, sprite, toy.time, tier.boil)
        this.redrawn++
        if (sprite.ready) { this.longestWait = Math.max(this.longestWait, toy.time - sprite.since); sprite.since = -1 }
        continue
      }
      // It has its own picture now. Its parts leave the picture of the place, in a frame of their own, and from then on it is drawn from its picture.
      let box: Box | null = null, others = 1
      for (const part of thing.parts) {
        const kept = this.inLayer.get(part)
        if (!kept) continue
        if (!box) box = { x0: kept.x0, y0: kept.y0, x1: kept.x1, y1: kept.y1 }
        else { box.x0 = Math.min(box.x0, kept.x0); box.y0 = Math.min(box.y0, kept.y0); box.x1 = Math.max(box.x1, kept.x1); box.y1 = Math.max(box.y1, kept.y1) }
      }
      if (box) for (let i = 0; i < this.count; i++) if (this.items[i].thing !== thing && this.inLayer.has(this.items[i].ref) && touch(this.items[i], box)) others++
      if (box && others > room) { this.waited++; continue }
      for (const part of thing.parts) this.inLayer.delete(part)
      if (box) this.repair(pen, toy, box)
      sprite.ready = true
      this.longestWait = Math.max(this.longestWait, toy.time - sprite.since)
      sprite.since = -1
    }
  }

  /**
   * A creature's parts and eyes as they are posed now, in its own frame: with a pen they are drawn, and either
   * way the pose comes back as one number, so two poses that would draw alike are known without drawing.
   */
  /** How many parts of a creature belong in its picture now: those that have touched down and are not in the hand. */
  private partsOf(creature: Creature): number {
    let n = 0
    for (const part of creature.thing.parts) if (part.fall === 0 && !part.inHand) n++
    return n
  }

  /** How many stamps drawing a creature's picture again takes: one for each part in it, and one more for each eye while its lids are half down. */
  private costOf(creature: Creature): number {
    const drowsy = creature.lids > 0.25 && creature.lids <= 0.9
    return this.partsOf(creature) + (drowsy ? Math.min(creature.eyes, caps(creature.thing)) : 0)
  }

  private poseOf(pen: Pen | null, creature: Creature, time: number, boil: boolean, drawn: Set<Part> | null): number {
    const { thing, body } = creature
    // The boil: a creature that is moving is drawn from the next of its drawings eight times a second.
    const shift = boil && creature.moved ? Math.floor(time * 8) % 3 : 0
    let sig = mix(mix(13, thing.parts.length), shift)
    let eye = 0
    const counts: Partial<Record<Kind, number>> = {}
    const spin = thing.turn + body.roll
    for (let i = 0; i < thing.parts.length; i++) {
      const part = thing.parts[i]
      if (part.fall > 0 || part.inHand) continue
      drawn?.add(part)
      const index = counts[part.kind] ?? 0
      counts[part.kind] = index + 1
      const poked = pokedFor(creature, i)
      posedPart(creature, i, index, pose)
      const px = pose.x, py = pose.y, turn = pose.turn
      settleOf(part.kind, part.settle, settled)
      const sx = pose.along * settled.sx, sy = pose.across * settled.sy
      sig = mix(mix(mix(mix(mix(sig, Math.round(px * 2)), Math.round(py * 2)), Math.round((turn + settled.turn) * 40)), Math.round(sx * 40)), Math.round(sy * 40) + Math.round(settled.up))
      if (part.kind !== 'cap') {
        pen?.stamp(partKey(part.kind, part.look + shift), px, py - settled.up, turn + settled.turn, sx, sy)
        continue
      }
      // A cap on a creature is an eye once it has turned over: shut, half shut or open, its pupil where the creature looks.
      const open = eye < creature.eyes
      const blink = eye === 2 ? Math.max(creature.blink, creature.oddBlink) : creature.blink
      eye++
      const own = poked !== null && poked.kind === 'cap' && poked.own
      const hidden = own || (poked !== null && poked.kind === 'feather') || (poked !== null && poked.kind === 'maple' && poked.u < 0.42)
      const state = !open || hidden || blink > 0.4 || creature.lids > 0.9 ? 0 : creature.lids > 0.25 ? 1 : 2
      // The pupil points where the creature looks on the page, whichever way the creature and its cap are turned; a dizzy one's goes round.
      let gaze = AHEAD
      if (state > 0) {
        if (creature.dizzy > 0) gaze = Math.floor(time * 12 + eye * 5) % 16
        else { const c = Math.cos(-spin - turn), s = Math.sin(-spin - turn); gaze = gazeOf(creature.lookX * c - creature.lookY * s, creature.lookX * s + creature.lookY * c) }
      }
      sig = mix(mix(sig, state), gaze)
      if (!pen) continue
      if (state === 0) { pen.stamp(partKey('cap', part.look), px, py, turn, sx, sy * (open ? 0.86 : 1)); continue }
      pen.stamp(eyeKey(part.look + shift, gaze), px, py, turn, sx, sy)
      // Drowsy: the cap comes half down over the eye again.
      if (state === 1) pen.stamp(partKey('cap', part.look), px + Math.sin(turn) * 14, py - Math.cos(turn) * 14, turn, sx, 0.56 * sy)
    }
    return sig
  }
}
