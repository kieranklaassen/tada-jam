import { describe, expect, it } from 'vitest'
import { KINDS, SHAPES, crosses, ends, gap, isLong, reach, toStretch, wrap, type Kind, type Placed } from './parts'
import { CAP_GAP, FAN_STEP, hubOf, landingOn } from './placing'
import { fresh } from './save'
import { clearing, play, tapHeap, toyOf } from './testing'
import { newPart, placed, type Thing } from './things'
import { Toy } from './toy'

// The shapes the game itself lays down: the thing a first visit finds, and
// what taps on the heaps build. None of them may come out as a figure a
// reader could take for a letter, a numeral or a sign: no bar over posts, no
// sticks crossed at their middles, no two rings that touch. What a child
// lays by hand is the child's and is not held here.

const where = (thing: Thing): Placed[] => thing.parts.map((part) => placed(thing, part))

/** A thing built only by taps on the heaps, in this order, each part given time to land. */
function tapped(kinds: readonly Kind[]): Toy {
  const toy = toyOf(clearing([]))
  for (const kind of kinds) { tapHeap(toy, kind); play(toy, 1.2) }
  return toy
}

/** What holds of every thing the game lays by itself. The first `eyesOn` eyes sit on the thing; a small thing has no room on it for more. */
function wellLaid(thing: Thing, label: string, eyesOn = 4): void {
  const at = where(thing), first = at[0], hub = hubOf(thing), hubAt = { x: thing.x + hub.x, y: thing.y + hub.y }
  const long = at.filter((part, i) => i > 0 && isLong(part.kind))
  const ways: number[] = []
  for (const part of long) {
    const [ax, ay, bx, by] = ends(part)
    const nearA = Math.hypot(ax - hubAt.x, ay - hubAt.y), nearB = Math.hypot(bx - hubAt.x, by - hubAt.y)
    // It goes on by one end, at the thing's edge, and points away from there.
    expect(Math.min(nearA, nearB), `${label}: a ${part.kind} on by its end`).toBeLessThan(6)
    expect(Math.max(nearA, nearB), `${label}: a ${part.kind} pointing out`).toBeGreaterThan(2 * SHAPES[part.kind].half - 1)
    ways.push(nearA < nearB ? Math.atan2(by - ay, bx - ax) : Math.atan2(ay - by, ax - bx))
    // And never across the middle of the part laid first.
    const [fx, fy, gx, gy] = ends(first)
    if (isLong(first.kind)) expect(toStretch((fx + gx) / 2, (fy + gy) / 2, ax, ay, bx, by), `${label}: a ${part.kind} over the middle`).toBeGreaterThan(SHAPES[first.kind].half * 0.8)
  }
  // No two cross, and no two lie along one line.
  for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
    if (isLong(at[i].kind) && isLong(at[j].kind)) expect(crosses(at[i], at[j]), `${label}: ${at[i].kind} ${i} crosses ${at[j].kind} ${j}`).toBe(false)
  }
  for (let i = 0; i < ways.length; i++) for (let j = i + 1; j < ways.length; j++) expect(Math.abs(wrap(ways[i] - ways[j])), `${label}: two of the fan`).toBeGreaterThan(FAN_STEP * 0.9)
  // Eyes: a third of a cap between any two, and each on the thing.
  const eyes = at.filter((part) => part.kind === 'cap'), body = at.filter((part) => part.kind !== 'cap')
  for (let i = 0; i < eyes.length; i++) {
    for (let j = i + 1; j < eyes.length; j++) expect(gap(eyes[i], eyes[j]), `${label}: two eyes`).toBeGreaterThan(CAP_GAP - 0.5)
    if (body.length > 0 && i < eyesOn) expect(Math.min(...body.map((part) => reach(part, eyes[i].x, eyes[i].y))), `${label}: an eye on the thing`).toBeLessThan(SHAPES.cap.r * 0.35)
  }
}

describe('the first-visit thing', () => {
  it('is plainly a body: a round leaf, one twig out to the side by its end, and one eye on the leaf; no bar lies over two posts', () => {
    const toy = new Toy(fresh(3, 1), 1), thing = toy.things[0]
    expect(thing.parts.map((part) => part.kind)).toEqual(['round', 'twig', 'cap'])
    wellLaid(thing, 'first visit')
    const [leaf, twig, eye] = where(thing), [ax, ay, bx, by] = ends(twig)
    // One end of the twig is on the leaf and the other well off it.
    expect(Math.min(reach(leaf, ax, ay), reach(leaf, bx, by))).toBeLessThan(0)
    expect(Math.max(reach(leaf, ax, ay), reach(leaf, bx, by))).toBeGreaterThan(50)
    expect(gap(eye, leaf)).toBeLessThan(-SHAPES.cap.r)
    expect(gap(eye, twig)).toBeGreaterThan(0)
  })

  it('lies as taps on the heaps would lay it', () => {
    const thing = new Toy(fresh(3, 1), 1).things[0]
    const bare: Thing = { ...thing, parts: [thing.parts[0]] }
    const twig = landingOn(bare, 'twig')!
    expect(Math.hypot(twig.x - (thing.x + thing.parts[1].x), twig.y - (thing.y + thing.parts[1].y))).toBeLessThan(2.5)
    expect(Math.abs(wrap(twig.turn - thing.parts[1].turn))).toBeLessThan(0.02)
    const eye = landingOn(bare, 'cap')!
    expect(Math.hypot(eye.x - (thing.x + thing.parts[2].x), eye.y - (thing.y + thing.parts[2].y))).toBeLessThan(2.5)
  })
})

describe('what taps build', () => {
  const body = KINDS.filter((kind) => kind !== 'cap')

  it('fans tapped twigs, willow leaves and feathers from one place on the edge: each on by its end, none across the middle, no two crossing', () => {
    for (const first of body) {
      const toy = tapped([first, 'twig', 'twig', 'willow', 'twig', 'feather', 'twig', 'willow', 'twig', 'feather', 'twig'])
      expect(toy.things, first).toHaveLength(1)
      expect(toy.things[0].parts, first).toHaveLength(11)
      wellLaid(toy.things[0], `${first} first`)
    }
    // Twigs and nothing else: the case that used to come out as a star.
    const sticks = tapped(['twig', 'twig', 'twig', 'twig', 'twig', 'twig', 'twig', 'twig', 'twig'])
    expect(sticks.things[0].parts).toHaveLength(9)
    wellLaid(sticks.things[0], 'twigs alone')
  })

  it('gives two tapped eyes a third of a cap between them, and sets each on the thing', () => {
    for (const first of body) {
      for (const more of [[], ['twig'], ['maple', 'round'], ['seed', 'feather', 'willow']] as Kind[][]) {
        const toy = tapped([first, ...more, 'cap', 'cap'])
        expect(toy.creatures, `${first} ${more}`).toHaveLength(1)
        wellLaid(toy.creatures[0].thing, `${first} ${more.join(' ')}`)
      }
    }
    // Eyes and nothing else, and a third and a fourth eye on a thing that lies still.
    const eyes = tapped(['cap', 'cap'])
    expect(eyes.creatures).toHaveLength(1)
    wellLaid(eyes.creatures[0].thing, 'eyes alone')
    for (const first of KINDS) {
      const thing: Thing = { id: 1, x: 590, y: 420, turn: 0, awake: false, woke: 0, drowsy: false, bedded: false, parts: [newPart(first, 0, 0, 0.3, 0)] }
      for (let n = first === 'cap' ? 1 : 0; n < 4; n++) { const at = landingOn(thing, 'cap')!; thing.parts.push(newPart('cap', at.x - thing.x, at.y - thing.y, 0, 0)) }
      wellLaid(thing, `four eyes on a ${first}`, 2)
    }
  })

  it('lays a tapped wing, round leaf or seed on the body and over no eye', () => {
    for (const first of body) {
      const toy = tapped([first, 'cap', 'maple', 'round', 'seed', 'maple', 'round', 'seed'])
      const thing = toy.things[0], at = where(thing)
      expect(thing.parts, first).toHaveLength(8)
      for (let i = 2; i < at.length; i++) {
        expect(gap(at[0], at[i]), `${first}: a ${at[i].kind} on the body`).toBeLessThan(0)
        expect(gap(at[1], at[i]), `${first}: a ${at[i].kind} over the eye`).toBeGreaterThan(0)
      }
    }
  })
})
