import { describe, expect, it } from 'vitest'
import { CAST, CORNER, EARTH, FERN, GROUND, HEAPS, HEAP_REACH, HOME, WRIST_STRIP, castAt, freeSpot, heapAt, inEllipse, inGrownUpCorner, onEarth } from './clearing'
import { MAX_CAPS, MAX_PARTS } from './config'
import { KINDS, MANNERS, SHAPES, gap, reach, touches, type Kind, type Placed } from './parts'
import { landingOn, pressOn } from './placing'
import { STAGE } from './stage'
import { caps, front, isFull, newPart, placed, wayOf, type Thing } from './things'

const at = (kind: Kind, x: number, y: number, turn = 0): Placed => ({ kind, x, y, turn })
const thing = (kinds: readonly Kind[], x = EARTH.x, y = EARTH.y): Thing => ({ id: 1, x, y, turn: 0, awake: false, woke: 0, drowsy: false, bedded: false, parts: kinds.map((kind, i) => newPart(kind, i * 20, 0, 0, 0)) })

describe('the parts', () => {
  it('touch when they overlap or nearly do, and not across a gap', () => {
    expect(touches(at('twig', 0, 0), at('twig', 0, 20))).toBe(true)
    expect(touches(at('twig', 0, 0), at('twig', 0, 60))).toBe(false)
    // Two twigs that cross far from their middles and their ends still touch.
    expect(gap(at('twig', 0, 0), at('twig', 30, 0, Math.PI / 2))).toBeLessThan(0)
    // End to end along one line: they touch only when the ends meet.
    expect(touches(at('willow', 0, 0), at('willow', 2 * SHAPES.willow.half + 2 * SHAPES.willow.r, 0))).toBe(true)
    expect(touches(at('willow', 0, 0), at('willow', 2 * SHAPES.willow.half + 2 * SHAPES.willow.r + 20, 0))).toBe(false)
  })

  it('are inside their own outline and outside it beyond their reach', () => {
    for (const kind of KINDS) {
      expect(reach(at(kind, 100, 100, 0.7), 100, 100)).toBeLessThan(0)
      expect(reach(at(kind, 100, 100, 0.7), 100 + SHAPES[kind].long, 100 + SHAPES[kind].long)).toBeGreaterThan(0)
    }
  })

  it('answer the hand each in its own way: no two kinds share a rope, a pace, a jump or a fall', () => {
    for (const field of ['rope', 'follow', 'jump', 'fall', 'slump', 'rustleEvery'] as const) expect(new Set(KINDS.map((kind) => MANNERS[kind][field])).size, field).toBe(KINDS.length)
  })
})

describe('the clearing', () => {
  it('keeps every heap a small hand apart from the next, clear of the wrist strip and off the earth', () => {
    const spots = KINDS.map((kind) => HEAPS[kind])
    for (const a of spots) {
      expect(a.y + HEAP_REACH).toBeLessThan(STAGE.height - WRIST_STRIP)
      expect(onEarth(a.x, a.y - HEAP_REACH)).toBe(false)
      for (const b of spots) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(150)
    }
    for (const kind of KINDS) expect(heapAt(HEAPS[kind].x, HEAPS[kind].y)).toBe(kind)
    // Between two heaps a finger is on the nearer one, never on neither.
    expect(heapAt((HEAPS.twig.x + HEAPS.maple.x) / 2 - 1, HEAPS.twig.y)).toBe('twig')
    expect(heapAt((HEAPS.twig.x + HEAPS.maple.x) / 2 + 1, HEAPS.twig.y)).toBe('maple')
  })

  it('rests nothing a child can tap under the home control or in the grown-up corner', () => {
    // The home control is a round button at the top centre; with a finger's width round it, it is clear of everything that answers as itself.
    for (let a = 0; a < 16; a++) {
      const x = HOME.x + Math.cos((a / 16) * Math.PI * 2) * (HOME.r + 24), y = HOME.y + Math.sin((a / 16) * Math.PI * 2) * (HOME.r + 24)
      expect(castAt(x, y)).toBeNull()
      expect(heapAt(x, y)).toBeNull()
      expect(inEllipse(x, y, GROUND, 60)).toBe(false)
    }
    for (const who of ['big', 'small', 'toad'] as const) {
      const c = CAST[who]
      // The far corner of each character's reach is outside the grown-up corner.
      expect(c.x + c.rx < STAGE.width - CORNER || c.y - c.ry > CORNER).toBe(true)
    }
    expect(inGrownUpCorner(STAGE.width - 10, 10)).toBe(true)
    expect(inGrownUpCorner(STAGE.width - CORNER - 1, 10)).toBe(false)
  })

  it('keeps the walking ground clear of the heaps, and the stump and the fern off the earth', () => {
    for (const kind of KINDS) expect(inEllipse(HEAPS[kind].x, HEAPS[kind].y - HEAP_REACH, GROUND)).toBe(false)
    expect(onEarth(CAST.toad.x + CAST.toad.rx, CAST.toad.y)).toBe(false)
    expect(onEarth(FERN.x - FERN.rx, FERN.y)).toBe(false)
  })

  it('begins the first thing in the middle of the earth and the next one away from it', () => {
    expect(freeSpot([])).toEqual({ x: EARTH.x, y: EARTH.y })
    const second = freeSpot([{ x: EARTH.x, y: EARTH.y }])
    expect(Math.hypot(second.x - EARTH.x, second.y - EARTH.y)).toBeGreaterThan(100)
    expect(onEarth(second.x, second.y)).toBe(true)
  })
})

describe('a thing', () => {
  it('faces the way its caps are, wherever the child put them', () => {
    const t = thing(['willow', 'cap', 'cap'])
    t.parts[0].x = 0; t.parts[1].x = 80; t.parts[2].x = 80; t.parts[2].y = 30
    expect(Math.cos(front(t))).toBeGreaterThan(0.8)
    // The same caps at the other end: it faces the other way.
    t.parts[1].x = -80; t.parts[2].x = -80
    expect(Math.cos(front(t))).toBeLessThan(-0.8)
  })

  it('travels by the kind it has most of, and of two that tie by the one laid first', () => {
    expect(wayOf(thing(['twig', 'maple', 'maple', 'cap', 'cap']))).toBe('maple')
    expect(wayOf(thing(['round', 'willow', 'cap', 'cap']))).toBe('round')
    expect(wayOf(thing(['willow', 'round', 'cap', 'cap']))).toBe('willow')
    // Nine legs and nobody: it works, and it scuttles.
    expect(wayOf(thing(['twig', 'twig', 'twig', 'twig', 'twig', 'twig', 'twig', 'twig', 'twig', 'cap', 'cap']))).toBe('twig')
    // Feathers and seeds lead only when no mover is there; caps alone waddle.
    expect(wayOf(thing(['feather', 'seed', 'cap', 'cap']))).toBe('feather')
    expect(wayOf(thing(['seed', 'cap', 'cap']))).toBe('seed')
    expect(wayOf(thing(['cap', 'cap']))).toBe('cap')
    expect(wayOf(thing(['feather', 'feather', 'feather', 'twig', 'cap', 'cap']))).toBe('twig')
  })

  it('takes a part that touches it and keeps it exactly where it was put', () => {
    const things: Thing[] = []
    let id = 1
    const first = pressOn(things, 'willow', 0, at('willow', 500, 400, 0.3), () => id++)
    expect(first.how).toBe('on')
    const second = pressOn(things, 'twig', 1, at('twig', 520, 430, 1.2), () => id++)
    expect(second.how).toBe('on')
    expect(things).toHaveLength(1)
    if (second.how !== 'on') return
    const where = placed(second.thing, second.part)
    expect(where.x).toBeCloseTo(520, 6); expect(where.y).toBeCloseTo(430, 6); expect(where.turn).toBeCloseTo(1.2, 6)
    // A part that touches nothing begins a thing of its own on the earth, and does nothing off it.
    expect(pressOn(things, 'seed', 0, at('seed', 760, 420), () => id++).how).toBe('on')
    expect(things).toHaveLength(2)
    expect(pressOn(things, 'seed', 0, at('seed', 60, 60), () => id++).how).toBe('off')
  })

  it('makes one thing of two that a part bridges', () => {
    const things: Thing[] = []
    let id = 1
    pressOn(things, 'round', 0, at('round', 500, 420), () => id++)
    pressOn(things, 'round', 0, at('round', 640, 420), () => id++)
    expect(things).toHaveLength(2)
    pressOn(things, 'willow', 0, at('willow', 570, 420), () => id++)
    expect(things).toHaveLength(1)
    expect(things[0].parts).toHaveLength(3)
  })

  it('shakes off one part more than it can carry', () => {
    const full = thing(Array.from({ length: MAX_PARTS }, () => 'twig' as const))
    expect(isFull(full, 'twig')).toBe(true)
    expect(isFull(full, 'cap')).toBe(false)
    expect(pressOn([full], 'maple', 0, at('maple', full.x, full.y), () => 9).how).toBe('shaken')
    const eyes = thing(Array.from({ length: MAX_CAPS }, () => 'cap' as const))
    expect(caps(eyes)).toBe(MAX_CAPS)
    expect(isFull(eyes, 'cap')).toBe(true)
  })

  it('lands a part that flies on by itself where it touches the thing, and a second cap a third of a cap clear of the first', () => {
    const t = thing(['willow'])
    for (const kind of ['twig', 'maple', 'round', 'feather', 'seed'] as const) {
      const where = landingOn(t, kind)!
      expect(t.parts.some((part) => touches(placed(t, part), where)), kind).toBe(true)
      t.parts.push(newPart(kind, where.x - t.x, where.y - t.y, where.turn, 0))
    }
    const one = landingOn(t, 'cap')!
    t.parts.push(newPart('cap', one.x - t.x, one.y - t.y, 0, 0))
    const two = landingOn(t, 'cap')!
    expect(Math.hypot(one.x - two.x, one.y - two.y) - 2 * SHAPES.cap.r).toBeCloseTo(SHAPES.cap.wide / 3, 1)
  })
})
