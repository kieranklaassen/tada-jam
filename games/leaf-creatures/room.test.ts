import { describe, expect, it } from 'vitest'
import { ACORN_REACH, BEDS, BED_REACH, CAST, EARTH, HEAPS, HEAP_DRAWN, HEAP_REACH, HEAP_SPACING, HOME, inEllipse, onEarth } from './clearing'
import { HEAP_NUDGE, HEAP_ROW, heapSize } from './partArt'
import { about } from './creatures'
import { KINDS, PICK_REACH, SHAPES, gap, type Kind } from './parts'
import { fit, STAGE, toStage } from './stage'
import { placed, radius } from './things'
import { DT, clearing, toyOf } from './testing'
import { ACORN_HIT, making, under } from './touching'
import type { Toy } from './toy'

// Room for a small finger, and room for every thing: what is touched is
// large enough at each surface the game is shown on with its neighbours
// counted, what the game sets down lies on free earth, and a heap is there
// to be tapped. And two rules of the folder itself: no test writes a file or
// reads the environment, and no document names a place on a machine.

const SURFACES = [[1180, 820], [1024, 768], [820, 1180]] as const
/** The two sizes kid-land is shown at: it is landscape only. */
const LANDSCAPE = [[1180, 820], [1024, 768]] as const
/** The least a touch target measures each way, in the surface's own pixels. */
const FINGER = 48

describe('room for a small finger', () => {
  it('fits the whole stage into each surface, so what holds on the stage holds at 1180 by 820, 1024 by 768 and 820 by 1180', () => {
    for (const [width, height] of SURFACES) {
      const by = fit(width, height)
      expect(by.x).toBeGreaterThanOrEqual(0)
      expect(by.y).toBeGreaterThanOrEqual(0)
      expect(by.x + STAGE.width * by.scale).toBeLessThanOrEqual(width + 0.01)
      expect(by.y + STAGE.height * by.scale).toBeLessThanOrEqual(height + 0.01)
    }
  })

  it('gives every heap, part, sleeper, acorn and each of the three 48 pixels each way at all three sizes, neighbours counted', () => {
    for (const [width, height] of SURFACES) {
      const scale = fit(width, height).scale, label = `${width}x${height}`
      // A heap: its own reach, and no more than half of the way to the next heap.
      expect(2 * Math.min(HEAP_REACH, HEAP_SPACING / 2) * scale, label).toBeGreaterThanOrEqual(FINGER)
      // A part where it lies: its narrow side with a small hand's reach round it.
      for (const kind of KINDS) expect(2 * (SHAPES[kind].r + PICK_REACH) * scale, `${label} ${kind}`).toBeGreaterThanOrEqual(FINGER)
      // A sleeper: its reach, which is no more than half of the way to the nearest other bed.
      let nearest = Infinity
      for (const a of BEDS) for (const b of BEDS) if (a !== b) nearest = Math.min(nearest, Math.hypot(a.x - b.x, a.y - b.y))
      expect(BED_REACH).toBeLessThanOrEqual(nearest / 2)
      expect(2 * BED_REACH * scale, label).toBeGreaterThanOrEqual(FINGER)
      expect(2 * ACORN_REACH * scale, label).toBeGreaterThanOrEqual(FINGER)
      for (const who of ['big', 'small', 'toad'] as const) expect(2 * Math.min(CAST[who].rx, CAST[who].ry) * scale, `${label} ${who}`).toBeGreaterThanOrEqual(FINGER)
    }
  })

  it('touches a heap as far as it is drawn, at 1180 by 820 and 1024 by 768: an outer twig end or leaf tip takes from that heap, and between two heaps the nearer one gives', () => {
    // The touch reaches as far as the heap's picture does: the back row, a nudge, and half of the longest part as it is drawn there, lying level.
    for (const kind of KINDS) expect(HEAP_DRAWN.rx, kind).toBeGreaterThanOrEqual(Math.min(95, HEAP_ROW + HEAP_NUDGE / 2 + (SHAPES[kind].long / 2) * heapSize(kind)))
    const first = KINDS.reduce((a, b) => (HEAPS[a].x < HEAPS[b].x ? a : b)), last = KINDS.reduce((a, b) => (HEAPS[a].x > HEAPS[b].x ? a : b))
    for (const [width, height] of LANDSCAPE) {
      const by = fit(width, height), label = `${width}x${height}`
      const taken = (x: number, y: number): Kind | undefined => {
        // A pixel of the surface, as the Mount hands it on.
        const at = toStage({ x: by.x + x * by.scale, y: by.y + y * by.scale }, by)
        const toy = toyOf(clearing([]))
        toy.press(at.x, at.y)
        const kind = toy.hand?.kind
        toy.cancel()
        return kind
      }
      for (const kind of KINDS) {
        const heap = HEAPS[kind]
        // Its top, its foot, and a part end a little to each side of its middle, high and low.
        for (const [dx, dy] of [[0, -50], [0, 60], [-40, -40], [40, -40], [-60, 30], [60, 30]]) expect(taken(heap.x + dx, heap.y + dy), `${label} ${kind} ${dx},${dy}`).toBe(kind)
      }
      // The outer ends of the row: the twig that sticks out furthest to the left, the seed furthest to the right.
      expect(taken(HEAPS[first].x - 92, HEAPS[first].y + 4), label).toBe(first)
      expect(taken(HEAPS[last].x + 92, HEAPS[last].y + 4), label).toBe(last)
      // Along the whole row, pixel by pixel, a finger is on a heap, and it is the nearer one.
      for (let px = Math.ceil(by.x + (HEAPS[first].x - 92) * by.scale); px <= by.x + (HEAPS[last].x + 92) * by.scale; px += 3) {
        const x = (px - by.x) / by.scale
        const nearer = KINDS.reduce((a, b) => (Math.abs(HEAPS[a].x - x) <= Math.abs(HEAPS[b].x - x) ? a : b))
        const got = taken(x, HEAPS[first].y + 6)
        if (Math.abs(Math.abs(HEAPS[nearer].x - x) - HEAP_SPACING / 2) > 1) expect(got, `${label} at ${Math.round(x)}`).toBe(nearer)
        else expect(got, `${label} at ${Math.round(x)}`).toBeDefined()
      }
    }
  })

  it('gives a dug acorn 48 pixels each way at 1180 by 820 and 1024 by 768 even with a part lying right beside it', () => {
    // The two sizes kid-land is shown at. A tall surface is not built for: there the same acorn measures under 48.
    for (const [width, height] of LANDSCAPE) expect(2 * ACORN_HIT * fit(width, height).scale, `${width}x${height}`).toBeGreaterThanOrEqual(FINGER)
    // A willow leaf lies with its edge against the acorn, on each side of it in turn.
    for (const side of [-1, 1]) {
      const acorn = { x: 590, y: 420, dug: true }
      const beside = { id: 1, x: acorn.x + side * (SHAPES.willow.r + 14), y: acorn.y, turn: 90, awake: false, woke: 0, drowsy: false, bedded: false, parts: [{ kind: 'willow' as const, x: 0, y: 0, turn: 0 }] }
      const toy = toyOf(clearing([beside], { acorns: [acorn, { x: 400, y: 300, dug: false }, { x: 420, y: 540, dug: false }] }))
      // Everywhere within the acorn's own reach the acorn is what is touched, on the side of the leaf too.
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const x = acorn.x + Math.cos(angle) * (ACORN_HIT - 1), y = acorn.y + Math.sin(angle) * (ACORN_HIT - 1)
        expect(under(toy, x, y), `side ${side} angle ${angle.toFixed(2)}`).toEqual({ acorn: 0 })
      }
      // And the leaf is still there to be lifted, beyond that.
      expect(under(toy, beside.x + side * 30, acorn.y + 50)).toEqual({ thing: toy.things[0], index: 0 })
    }
  })

  it('keeps the targets out of one another: no heap reaches a bed, one of the three, the earth or the home control', () => {
    for (const kind of KINDS) {
      const heap = HEAPS[kind]
      for (const bed of BEDS) expect(Math.hypot(heap.x - bed.x, heap.y - bed.y), kind).toBeGreaterThan(HEAP_REACH + BED_REACH)
      for (const who of ['big', 'small', 'toad'] as const) expect(inEllipse(heap.x, heap.y, CAST[who], HEAP_REACH), kind).toBe(false)
      expect(inEllipse(heap.x, heap.y, EARTH, HEAP_REACH), kind).toBe(false)
      expect(Math.hypot(heap.x - HOME.x, heap.y - HOME.y)).toBeGreaterThan(HEAP_REACH + HOME.r + 24)
    }
    for (const bed of BEDS) {
      expect(onEarth(bed.x, bed.y)).toBe(false)
      for (const who of ['big', 'small', 'toad'] as const) expect(inEllipse(bed.x, bed.y, CAST[who], BED_REACH)).toBe(false)
    }
  })

  it('draws a seed as large as the other parts, and its heap as large as theirs', () => {
    expect(SHAPES.seed.long).toBeGreaterThanOrEqual(SHAPES.round.long)
    expect(SHAPES.seed.wide).toBeGreaterThanOrEqual(SHAPES.willow.wide)
    expect(SHAPES.seed.r).toBeGreaterThan(SHAPES.willow.r)
  })
})

/** What must hold of a clearing at any moment a child could look at it. */
function holds(toy: Toy, label: string): void {
  const loose = toy.things.filter((thing) => !thing.awake)
  for (const thing of loose) {
    for (const part of thing.parts) {
      if (part.fall > 0) continue
      const at = placed(thing, part)
      // On the earth, and on no acorn that has come up.
      expect(inEllipse(at.x, at.y, EARTH, 40), `${label}: a ${part.kind} off the earth`).toBe(true)
      for (const acorn of toy.acorns) if (acorn.dug) expect(Math.hypot(acorn.x - at.x, acorn.y - at.y), `${label}: a ${part.kind} on an acorn`).toBeGreaterThan(20)
      // On no other thing: two things that touch are one thing.
      for (const other of loose) {
        if (other === thing) continue
        for (const theirs of other.parts) if (theirs.fall === 0) expect(gap(at, placed(other, theirs)), `${label}: a ${part.kind} on a ${theirs.kind}`).toBeGreaterThan(0)
      }
    }
  }
  // A dug acorn lies on the ground, clear of the rim.
  for (const acorn of toy.acorns) if (acorn.dug) expect(inEllipse(acorn.x, acorn.y, EARTH, 60), `${label}: an acorn`).toBe(true)
}

describe('room for every thing', () => {
  /** A child who only taps heaps: every kind in turn with a cap after every second part, a little under two a second. */
  function tapper(seed: number, taps: number, each: (toy: Toy, tap: number, kind: Kind) => void): Toy {
    const toy = toyOf(clearing([]), seed)
    const order: Kind[] = ['willow', 'twig', 'cap', 'maple', 'round', 'cap', 'feather', 'seed', 'cap', 'twig', 'cap']
    for (let tap = 0; tap < taps; tap++) {
      const kind = order[(tap + seed) % order.length]
      toy.press(HEAPS[kind].x, HEAPS[kind].y)
      each(toy, tap, kind)
      if (toy.hand) toy.tap(); else toy.cancel()
      for (let f = 0; f < 36; f++) toy.step(DT)
    }
    return toy
  }

  it('lets a tap on a heap reach the heap however full the clearing is, whoever is wandering', () => {
    for (const seed of [1, 2, 3]) {
      let reached = 0
      tapper(seed, 150, (toy, _tap, kind) => { if (toy.hand?.kind === kind && toy.hand.from === null) reached++ })
      expect(reached, `seed ${seed}`).toBe(150)
    }
  })

  it('sets every tapped part down on free earth: on no other thing, on no acorn, and never off the earth', () => {
    for (const seed of [1, 2, 3]) {
      const toy = tapper(seed, 150, (played, tap) => holds(played, `seed ${seed} tap ${tap}`))
      // A child who taps heaps ends with creatures and a thing begun, not with crumbs.
      expect(toy.creatures.length, `seed ${seed}`).toBeGreaterThanOrEqual(3)
      expect(toy.things.filter((thing) => !thing.awake).length, `seed ${seed}`).toBeLessThanOrEqual(2)
      for (const creature of toy.creatures) if (about(creature)) expect(radius(creature.thing)).toBeGreaterThan(20)
    }
  })

  it('sends a tapped part to the thing the child began, not to a stray part laid down since', () => {
    const toy = toyOf(clearing([]))
    for (const kind of ['willow', 'twig'] as const) { toy.press(HEAPS[kind].x, HEAPS[kind].y); toy.tap(); for (let f = 0; f < 60; f++) toy.step(DT) }
    expect(toy.things).toHaveLength(1)
    const begun = toy.things[0]
    // A single part is carried off and set down by itself, far from the thing.
    toy.press(HEAPS.maple.x, HEAPS.maple.y)
    for (let f = 1; f <= 20; f++) { toy.move(HEAPS.maple.x + (330 - HEAPS.maple.x) * f / 20, HEAPS.maple.y + (480 - HEAPS.maple.y) * f / 20); toy.step(DT) }
    for (let f = 0; f < 30; f++) toy.step(DT)
    toy.drop()
    for (let f = 0; f < 60; f++) toy.step(DT)
    expect(toy.things).toHaveLength(2)
    expect(making(toy, 'cap')).toBe(begun)
    toy.press(HEAPS.cap.x, HEAPS.cap.y); toy.tap()
    for (let f = 0; f < 60; f++) toy.step(DT)
    expect(begun.parts.map((part) => part.kind)).toEqual(['willow', 'twig', 'cap'])
    expect(under(toy, HEAPS.cap.x, HEAPS.cap.y)).toBeNull()
  })
})

describe('the folder', () => {
  const files = import.meta.glob('./*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const names = Object.keys(files)

  it('lessons 10 and 13: no test writes a file or reads the environment, and no file names a place on a machine or an address', () => {
    expect(names.length).toBeGreaterThan(60)
    expect(names).toContain('./ART.md')
    expect(names).toContain('./REFINEMENT.md')
    // Written in halves, so this file does not find itself.
    const inTests = ['write' + 'File', 'append' + 'File', 'mkdir' + 'Sync', 'process' + '.env', 'node:' + 'fs', "from 'f" + "s'", 'child_' + 'process']
    const anywhere = ['/ho' + 'me/', '/tm' + 'p/', '/Us' + 'ers/', 'wave-' + 'scratch', 'work' + 'tree', 'scratch' + 'pad', 'ht' + 'tp://', 'ht' + 'tps://', 'local' + 'host']
    for (const name of names) {
      const text = files[name]
      if (name.endsWith('.test.ts') || name === './testing.ts') for (const word of inTests) expect(text.includes(word), `${name}: ${word}`).toBe(false)
      for (const word of anywhere) expect(text.includes(word), `${name}: ${word}`).toBe(false)
    }
  })
})
