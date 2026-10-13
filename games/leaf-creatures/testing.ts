import { HEAPS } from './clearing'
import { SHAPES, type Kind } from './parts'
import { CountingPen } from './pen'
import type { Creature } from './creatures'
import { posedPart, shownOf } from './posed'
import { fresh, read, write, type Saved, type SavedThing } from './save'
import { Toy } from './toy'

// What the tests of this game share: clearings made to order, a finger, and
// a pen that writes down what it is asked to draw. No game code imports
// this file.

export const DT = 1 / 60

/**
 * A saved thing with these parts: the others lie along x one below the other, five to a column, and the caps
 * stand in a column at their stem ends, so every part can be found by a finger. Two caps or more make it a creature.
 */
export function thing(id: number, x: number, y: number, kinds: readonly Kind[], woke = 0, more: Partial<SavedThing> = {}): SavedThing {
  const caps = kinds.filter((kind) => kind === 'cap').length
  let cap = 0, other = 0
  return {
    id, x, y, turn: 0, awake: caps >= 2, woke: caps >= 2 ? woke || id : 0, drowsy: false, bedded: false,
    parts: kinds.map((kind) => (kind === 'cap' ? { kind, x: -104, y: cap++ * 58, turn: 0 } : { kind, x: Math.floor(other / 5) * 150, y: (other++ % 5) * 36, turn: 0 })),
    ...more,
  }
}

export const many = (kind: Kind, n: number): Kind[] => Array.from({ length: n }, () => kind)
/** A clearing with these things on it and bare earth otherwise. */
export const clearing = (things: SavedThing[], more: Partial<Saved> = {}): Saved => ({ ...fresh(6, 7), things, ...more })
/** A toy of a clearing, in which a finger has already landed once: sounds are asked for. */
export function toyOf(saved: Saved, seed = 1): Toy {
  const toy = new Toy(saved, seed)
  toy.touched = true
  return toy
}

/** Takes what the toy has asked to be heard since the last call. */
export function heard(toy: Toy): string[] {
  return toy.asked.splice(0).map((sound) => sound.key)
}

/** Plays `seconds` and gives back everything asked for in them, in order. */
export function play(toy: Toy, seconds: number): string[] {
  const all: string[] = []
  for (let f = 0; f < Math.round(seconds / DT); f++) { toy.step(DT); all.push(...heard(toy)) }
  return all
}

/** Lifts a part from its heap and lets it fly to the earth by itself, as a tap does. */
export function tapHeap(toy: Toy, kind: Kind): void {
  toy.press(HEAPS[kind].x, HEAPS[kind].y)
  toy.tap()
}

/** A finger that lands at one point and drags to another in `steps` moves, a frame to each; it is still down when this returns. */
export function drag(toy: Toy, fromX: number, fromY: number, toX: number, toY: number, steps = 20): void {
  toy.press(fromX, fromY)
  for (let f = 1; f <= steps; f++) { toy.move(fromX + ((toX - fromX) * f) / steps, fromY + ((toY - fromY) * f) / steps); toy.step(DT) }
}

/** What a put-away and a new visit do: the record goes through the slot as text and is read back defensively. */
export const again = (toy: Toy, age: number | null = 6): Toy => new Toy(read(JSON.parse(JSON.stringify(write(toy.saved()))), age, 99), 99)

/** A pen that writes down every stamp and stroke with its numbers, to tell two frames apart. */
export class RecordingPen extends CountingPen {
  readonly log: string[] = []
  private note(what: string, values: readonly unknown[]): void {
    this.log.push(`${this.target ?? ''}|${what}|${values.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : Array.isArray(v) ? v.map((n: number) => Math.round(n * 10) / 10).join(' ') : String(v))).join(',')}`)
  }
  override reset(): void { super.reset(); this.log.length = 0 }
  override stamp(key: string, ...rest: unknown[]): void { super.stamp(key); this.note('stamp', [key, ...rest]) }
  override sprite(key: string, ...rest: unknown[]): void { super.stamp(key); this.note('sprite', [key, ...rest]) }
  override line(...all: unknown[]): void { super.line(); this.note('line', all) }
  override dot(...all: unknown[]): void { super.dot(); this.note('dot', all) }
}

/** Where the middle of part `i` of a creature is on the page as the creature is posed and laid down now. */
export function drawnAt(creature: Creature, i: number): { x: number; y: number } {
  const shown = shownOf(creature, { x: 0, y: 0, turn: 0, sx: 1, sy: 1, lift: 0 }), parts = creature.thing.parts
  let index = 0
  for (let k = 0; k < i; k++) if (parts[k].kind === parts[i].kind && parts[k].fall === 0 && !parts[k].inHand) index++
  const posed = posedPart(creature, i, index, { x: 0, y: 0, turn: 0, along: 1, across: 1 })
  const c = Math.cos(shown.turn), s = Math.sin(shown.turn)
  return { x: shown.x + shown.sx * (posed.x * c - posed.y * s), y: shown.y + shown.sy * (posed.x * s + posed.y * c) }
}

const DEG = Math.PI / 180

/** The clearing as it lies, read from the things themselves and not from a record of them: where each is, how it is turned, whether it sleeps, and every part of it. */
export function lying(toy: Toy): unknown[] {
  return toy.things.map((one) => ({
    id: one.id, x: Math.round(one.x), y: Math.round(one.y), turn: Math.round(one.turn / DEG), awake: toy.creatureOf(one) !== undefined, drowsy: one.drowsy, bedded: one.bedded,
    parts: one.parts.map((part) => ({ kind: part.kind, x: Math.round(part.x), y: Math.round(part.y), turn: Math.round(part.turn / DEG) })),
  }))
}

/** A record's things without their place in the order of waking, to set beside `lying`. */
export function kept(saved: Saved): unknown[] {
  return saved.things.map(({ woke: _woke, ...rest }) => rest)
}

/** Every part of a creature as it is drawn on the page now: its two ends and its middle, each with how far the part reaches from that point across itself. */
export function drawnPoints(creature: Creature): { x: number; y: number; r: number; kind: Kind }[] {
  const shown = shownOf(creature, { x: 0, y: 0, turn: 0, sx: 1, sy: 1, lift: 0 }), parts = creature.thing.parts
  const c = Math.cos(shown.turn), s = Math.sin(shown.turn), size = Math.max(Math.abs(shown.sx), Math.abs(shown.sy))
  const counts: Partial<Record<Kind, number>> = {}, out: { x: number; y: number; r: number; kind: Kind }[] = []
  parts.forEach((part, i) => {
    if (part.fall > 0 || part.inHand) return
    const index = counts[part.kind] ?? 0
    counts[part.kind] = index + 1
    const posed = posedPart(creature, i, index, { x: 0, y: 0, turn: 0, along: 1, across: 1 }), half = SHAPES[part.kind].half * posed.along
    for (const end of [-1, 0, 1]) {
      const px = posed.x + Math.cos(posed.turn) * half * end, py = posed.y + Math.sin(posed.turn) * half * end
      out.push({ x: shown.x + shown.sx * (px * c - py * s), y: shown.y + shown.sy * (px * s + py * c), r: SHAPES[part.kind].r * size, kind: part.kind })
    }
  })
  return out
}
