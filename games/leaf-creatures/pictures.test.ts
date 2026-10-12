import { describe, expect, it } from 'vitest'
import { HEAPS } from './clearing'
import { TIERS, type Tier } from './config'
import type { Creature } from './creatures'
import { Painter } from './painter'
import { KINDS, type Kind } from './parts'
import { CountingPen, slotKey, type Pen } from './pen'
import { outside } from './posed'
import { DT, RecordingPen, again, clearing, drawnAt, tapHeap, thing, toyOf } from './testing'
import type { Part } from './things'
import { PULL_CLEAR } from './touching'
import type { Toy } from './toy'
import { show } from './visit'

// The kept pictures never leave a part unseen and never show it twice, not
// for one frame: whatever is not in the picture of the place or in its
// creature's own picture as that is laid down in this frame is drawn live,
// and nothing else is. And the pictures are there in the first draw after
// the slot is read, attended or not.

/** A painter that says, once the frame is drawn and before the pictures are brought up to date for the next, what that frame showed. */
class Watched extends Painter {
  seen: (() => void) | null = null
  override bake(pen: Pen, toy: Toy, tier: Tier): void { this.seen?.(); super.bake(pen, toy, tier) }
}

/**
 * Plays and draws a frame, and holds it to this: of the parts in play, every one that is neither in the picture of
 * the place nor in a creature's picture is drawn live, once, and no other part is drawn live at all.
 */
function frame(toy: Toy, pen: RecordingPen, painter: Watched, parts: () => Part[], creatures: () => Creature[], f: number): void {
  toy.step(DT)
  const live: Partial<Record<Kind, number>> = {}
  painter.seen = () => {
    for (const part of parts()) {
      const kept = (painter.holds(part) ? 1 : 0) + (painter.stillOn(part) ? 1 : 0)
      // Never in two kept pictures at once.
      expect(kept, `frame ${f}: ${part.kind} kept`).toBeLessThanOrEqual(1)
      if (kept === 0) live[part.kind] = (live[part.kind] ?? 0) + 1
    }
  }
  pen.reset()
  show(pen, painter, toy, null, TIERS[0], () => {})
  // A part fresh from its heap is nobody's yet: it is in the hand, drawn once.
  if (toy.hand && !toy.hand.from && !toy.hand.was) live[toy.hand.kind] = (live[toy.hand.kind] ?? 0) + 1
  for (const kind of KINDS) {
    const drawn = pen.keys.filter((key) => (kind === 'cap' ? /^(cap|eye)-\d/ : kind === 'maple' ? /^maple-(\d|pale)/ : new RegExp(`^${kind}-\\d`)).test(key)).length
    expect(drawn, `frame ${f}: ${kind} drawn live`).toBe(live[kind] ?? 0)
  }
  // Each creature that has a picture is laid down from it once.
  for (const creature of creatures()) { const key = painter.pictureOf(creature); if (key) expect(pen.keys.filter((one) => one === key).length, `frame ${f}`).toBeLessThanOrEqual(1) }
}

describe('nothing is undrawn or drawn twice, not for one frame', () => {
  it('at a waking: from the tap, through the cap landing and the thing becoming a creature, to its first steps', () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig', 'round', 'cap'])]))
    const pen = new RecordingPen(), painter = new Watched()
    for (let f = 0; f < 5; f++) frame(toy, pen, painter, () => toy.things[0].parts, () => toy.creatures, f)
    tapHeap(toy, 'cap')
    let woke = -1
    for (let f = 5; f < 420; f++) {
      frame(toy, pen, painter, () => toy.things[0].parts, () => toy.creatures, f)
      if (woke < 0 && toy.creatures.length === 1) woke = f
    }
    expect(woke).toBeGreaterThan(5)
    expect(painter.pictureOf(toy.creatures[0])).not.toBeNull()
  })

  it('when parts are carried to a creature that is walking about and pressed on to it, and when it is poked', () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['twig', 'twig', 'cap', 'cap'], 1)]))
    const pen = new RecordingPen(), painter = new Watched(), all = (): Part[] => toy.things.flatMap((one) => one.parts)
    const creature = toy.creatures[0]
    for (let f = 0; f < 400; f++) {
      for (const [start, kind] of [[30, 'feather'], [150, 'cap'], [270, 'maple']] as const) {
        if (f === start) toy.press(HEAPS[kind].x, HEAPS[kind].y)
        // The finger goes to just below the creature, so the part it holds lies on it, and lets go.
        if (f > start && f < start + 40) toy.move(creature.thing.x, creature.thing.y + 70)
        if (f === start + 40) toy.drop()
      }
      if (f === 380) { const at = drawnAt(creature, 0); toy.press(at.x, at.y); toy.tap() }
      frame(toy, pen, painter, all, () => toy.creatures, f)
    }
    // At least one of the three was taken on by the creature while it moved.
    expect(creature.thing.parts.length).toBeGreaterThan(4)
  })

  it('when a spare eye is pulled off, carried, and put back by a cancel: it is on the creature or in the hand, never both, never neither', () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig', 'cap', 'cap', 'cap'], 1)]))
    toy.creatures[0].rest = 999
    const creature = toy.creatures[0], pen = new RecordingPen(), painter = new Watched(), all = (): Part[] => creature.thing.parts
    for (let f = 0; f < 10; f++) frame(toy, pen, painter, all, () => toy.creatures, f)
    const eye = 2, at = drawnAt(creature, eye)
    toy.press(at.x, at.y)
    let y = at.y
    for (let f = 10; f < 120; f++) {
      if (toy.grip) { while (outside(creature, at.x, y) < Math.min(PULL_CLEAR + 2, (f - 9) * 6)) y -= 1; toy.move(at.x, y) }
      else if (f < 80) toy.move(at.x + (f - 20) * 3, y - 30)
      else if (f === 80) toy.cancel()
      frame(toy, pen, painter, all, () => toy.creatures, f)
      // The hand's cap is one of the creature's parts all the while, so it is counted once with them.
      if (toy.hand) expect(toy.hand.was).toBe(creature.thing.parts[eye])
    }
    expect([toy.hand, creature.eyes, creature.thing.parts.some((part) => part.inHand)]).toEqual([null, 3, false])
  })

  it('when the eyes come off and the parts go home one after another, until the last has left', () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig', 'maple', 'cap', 'cap'], 1)]))
    toy.creatures[0].rest = 999
    const creature = toy.creatures[0], first = [...creature.thing.parts]
    const pen = new RecordingPen(), painter = new Watched()
    // In play: what is still on the creature, what is in the hand, and what is on its way home (of the last few that are shown).
    const inPlay = (): Part[] => first.filter((part) => creature.thing.parts.includes(part) || toy.hand?.was === part || toy.air.strays.slice(-6).some((stray) => stray.was === part))
    for (let f = 0; f < 10; f++) frame(toy, pen, painter, inPlay, () => [creature], f)
    const eye = 3, at = drawnAt(creature, eye)
    toy.press(at.x, at.y)
    let y = at.y, off = -1
    for (let f = 10; f < 420; f++) {
      if (toy.grip) { while (outside(creature, at.x, y) < Math.min(PULL_CLEAR + 2, (f - 9) * 6)) y -= 1; toy.move(at.x, y) }
      if (off < 0 && toy.sceneKind === 'eyes') off = f
      frame(toy, pen, painter, inPlay, () => [creature], f)
    }
    expect(off).toBeGreaterThan(10)
    expect(toy.ghost).toBeNull()
    toy.cancel()
  })
})

describe('the pictures are there in the first draw', () => {
  const full = (): Toy => toyOf(clearing([0, 1, 2, 3, 4].map((i) => thing(i + 1, 330 + i * 120, 380 + (i % 2) * 90, ['willow', 'twig', 'cap', 'cap'], i + 1, { bedded: i === 4 }))))

  it('shows every creature from its own picture in the first draw after the slot is read, with nothing played, and that draw is an ordinary frame', () => {
    // Read, and drawn once, with no step: what the load does, attended or not.
    const found = again(full()), pen = new CountingPen(), painter = new Painter()
    show(pen, painter, found, null, TIERS[0], () => pen.reset())
    for (let slot = 0; slot < 5; slot++) expect(pen.keys.filter((key) => key === slotKey(slot))).toHaveLength(1)
    expect(pen.kept).toBe(0)
    expect(pen.count).toBeLessThan(40)
    // A painter that is not primed before the frame begins shows them too, but makes every picture inside the frame.
    const late = new CountingPen()
    show(late, new Painter(), again(full()), null, TIERS[0], () => {})
    expect(late.kept).toBeGreaterThan(20)
  })

  it('and again after a put-away, when the painter is new and the clearing was not played in between', () => {
    const toy = full(), pen = new CountingPen()
    show(pen, new Painter(), toy, null, TIERS[0], () => pen.reset())
    const parked = again(toy), painter = new Painter()
    show(pen, painter, parked, null, TIERS[0], () => pen.reset())
    for (const creature of parked.creatures) expect(painter.pictureOf(creature)).not.toBeNull()
    expect(pen.keys.filter((key) => key.startsWith('creature-'))).toHaveLength(5)
  })
})
