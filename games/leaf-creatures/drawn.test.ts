import { describe, expect, it } from 'vitest'
import { BEDS, BED_REACH, CAST, HEAPS, castAt, heapAt, inGrownUpCorner } from './clearing'
import { TIERS } from './config'
import { poke, type Creature } from './creatures'
import type { Guidance } from './guidance'
import { Painter } from './painter'
import { KINDS, type Kind } from './parts'
import { ROW, slotKey } from './pen'
import { placed } from './things'
import { DT, RecordingPen, clearing, heard, play, tapHeap, thing, toyOf } from './testing'
import { partUnder } from './posed'
import { under } from './touching'
import type { Toy } from './toy'
import { drawFrame } from './view'

// What is drawn. Lesson 3: every number of a pose that the model keeps is
// read by the view, and a thing is touched where it is drawn. Lesson 9: no
// live stroke makes a sign. And the kept pictures: what lies still is in the
// picture of the place and is not drawn again until it changes.

const ALL: Kind[] = ['twig', 'twig', 'maple', 'willow', 'round', 'feather', 'seed', 'cap', 'cap', 'cap']
const acorns = [{ x: 760, y: 330, dug: true }, { x: 400, y: 300, dug: false }, { x: 420, y: 540, dug: false }]

/** A creature with a part of every kind and three eyes, a thing begun beside it, and one acorn dug up. */
function scene(): Toy {
  const toy = toyOf(clearing([thing(1, 560, 380, ALL, 1), thing(2, 800, 470, ['willow', 'cap'])], { acorns }))
  toy.creatures[0].rest = 999
  return toy
}

/** Twelve frames of a toy that stands still, written down: long enough for every kept picture to be made. */
function frames(toy: Toy, guidance: Guidance | null = null): string[] {
  const pen = new RecordingPen(), painter = new Painter(), all: string[] = []
  for (let f = 0; f < 12; f++) { pen.reset(); drawFrame(pen, toy, guidance, TIERS[0], painter); all.push(...pen.log) }
  return all
}

/** Whether a change to the toy changes what is drawn. */
function shows(change: (toy: Toy, creature: Creature) => void, guidance: Guidance | null = null): boolean {
  const plain = scene(), changed = scene()
  change(changed, changed.creatures[0])
  return JSON.stringify(frames(plain, guidance)) !== JSON.stringify(frames(changed, guidance))
}

describe('lesson 3: every pose value is read by the view', () => {
  it('draws a creature differently for every number its body keeps', () => {
    const body: Record<string, number> = { lift: 30, sway: 0.3, squash: -0.2, spin: 1.3, beat: 0.5, fan: 0.8, legs: 0.5, clock: 0.7, roll: 0.6, flip: 1, curl: 1, loose: 0.6 }
    for (const [name, value] of Object.entries(body)) {
      expect(shows((_toy, creature) => { (creature.body as unknown as Record<string, number>)[name] = value }), name).toBe(true)
    }
  })

  it('draws a creature differently for its eyes, lids, blinks, gaze, dizziness and a poke on each kind of part', () => {
    expect(shows((_toy, creature) => { creature.eyes = 2 }), 'eyes').toBe(true)
    expect(shows((_toy, creature) => { creature.lids = 0.5 }), 'drowsy lids').toBe(true)
    expect(shows((_toy, creature) => { creature.lids = 1 }), 'shut lids').toBe(true)
    expect(shows((_toy, creature) => { creature.blink = 1 }), 'blink').toBe(true)
    expect(shows((_toy, creature) => { creature.oddBlink = 1 }), 'the third eye').toBe(true)
    expect(shows((_toy, creature) => { creature.lookX = 1 }), 'gaze').toBe(true)
    expect(shows((_toy, creature) => { creature.lean = 1; creature.leanX = 1 }), 'lean').toBe(true)
    expect(shows((_toy, creature) => { creature.lookY = -1 }), 'gaze up').toBe(true)
    expect(shows((toy, creature) => { creature.dizzy = 1; toy.time = 0.21 }), 'dizzy').toBe(true)
    // A poke is seen a tenth of a second after it lands, whichever part it lands on.
    const after = (index: number): string => {
      const toy = scene()
      if (index >= 0) poke(toy.creatures[0], index, 0, 0)
      play(toy, 0.1)
      return JSON.stringify(frames(toy))
    }
    const unpoked = after(-1)
    for (let index = 0; index < ALL.length; index++) expect(after(index) !== unpoked, `poke ${ALL[index]}`).toBe(true)
  })

  it('draws the wind children, the toad and the fern differently for every number each keeps', () => {
    for (const who of ['big', 'small'] as const) {
      const wind: Record<string, number> = { lookX: 0.8, lookY: 0.8, puff: 1.05, blow: 0.8, blink: 1, strain: 0.7, hide: 1, whirl: 1.2 }
      for (const [name, value] of Object.entries(wind)) {
        expect(shows((toy) => { (toy.cast[who] as unknown as Record<string, number>)[name] = value }), `${who} ${name}`).toBe(true)
      }
      const hidden = (peek: number) => (toy: Toy): void => { toy.cast[who].hide = 1; toy.cast[who].peek = peek }
      expect(JSON.stringify(frames(apply(hidden(0)))) !== JSON.stringify(frames(apply(hidden(1)))), `${who} peek`).toBe(true)
    }
    expect(shows((toy) => { toy.cast.small.stir = 0.3 }), 'the small one\'s stirring hand').toBe(true)
    const toad: Record<string, number> = { lookX: 0.8, lookY: -0.8, lids: 0.7, throat: 0.25, squash: -0.2, flat: 0.8, glare: 1 }
    for (const [name, value] of Object.entries(toad)) expect(shows((toy) => { (toy.cast.toad as unknown as Record<string, number>)[name] = value }), `toad ${name}`).toBe(true)
    expect(shows((toy) => { toy.cast.toad.hat = { kind: 'maple', look: 0, turn: 0, age: 0.1 } }), 'hat').toBe(true)
    expect(shows((toy) => { toy.cast.fern.sway = 0.2 }), 'fern sway').toBe(true)
    expect(shows((toy) => { toy.cast.fern.sunk = 1 }), 'fern sunk').toBe(true)
  })

  it('draws a heap, an acorn, a part, the hand, a scuff, the air and the guidance differently for every number each keeps', () => {
    expect(shows((toy) => { toy.heaps.maple.squash = 0.2 }), 'heap').toBe(true)
    for (const [name, value] of Object.entries({ out: 0.5, hop: 0.6, dust: 1, spin: 1 })) {
      expect(shows((toy) => { (toy.acornShown[0] as unknown as Record<string, number>)[name] = value }), `acorn ${name}`).toBe(true)
    }
    expect(shows((toy) => { toy.things[1].parts[0].settle = 0.6 }), 'settle').toBe(true)
    expect(shows((toy) => { toy.things[1].parts[0].fall = 0.1 }), 'fall').toBe(true)
    expect(shows((toy) => { const part = toy.things[1].parts[0]; part.fall = 0.2; part.flight = 0.4; part.fromX = -300 }), 'flight').toBe(true)
    expect(shows((toy) => { toy.things[1].parts[0].inHand = true }), 'in the hand').toBe(true)
    const held = (more: (toy: Toy) => void) => (toy: Toy): void => { toy.press(HEAPS.maple.x, HEAPS.maple.y); toy.heaps.maple.squash = 0; toy.heaps.maple.speed = 0; more(toy) }
    const base = JSON.stringify(frames(apply(held(() => {}))))
    expect(JSON.stringify(frames(apply(held((toy) => { toy.hand!.jump = 20 })))) !== base, 'jump').toBe(true)
    expect(JSON.stringify(frames(apply(held((toy) => { toy.hand!.held = 0.4 })))) !== base, 'held').toBe(true)
    expect(JSON.stringify(frames(apply(held((toy) => { toy.hand!.waiting = true; toy.hand!.waited = 0.1 })))) !== base, 'waiting').toBe(true)
    expect(JSON.stringify(frames(apply(held((toy) => { toy.hand!.x += 40 })))) !== base, 'where it is').toBe(true)
    expect(JSON.stringify(frames(apply(held((toy) => { toy.hand!.fingerX += 40 })))) !== base, 'where the finger is').toBe(true)
    expect(shows((toy) => { toy.scuffs.push({ x: 300, y: 420, age: 0.2 }) }), 'scuff').toBe(true)
    expect(shows((toy) => { toy.air.loosen(500, 200, toy.airRng) }), 'leaf').toBe(true)
    expect(shows((toy) => { toy.air.gust = 0.4 }), 'gust').toBe(true)
    const glow: Guidance = { glow: 1, demo: null, demoIndex: -1 }, hand: Guidance = { glow: 1, demo: 0.4, demoIndex: 0 }
    expect(JSON.stringify(frames(scene(), glow)) !== JSON.stringify(frames(scene(), null))).toBe(true)
    expect(JSON.stringify(frames(scene(), hand)) !== JSON.stringify(frames(scene(), glow))).toBe(true)
  })
})

function apply(change: (toy: Toy) => void): Toy {
  const toy = scene()
  change(toy)
  return toy
}

/**
 * Where each part of a creature is on the page, read from what the pen was asked to draw and from nothing else:
 * the stamps that made its picture, and where that picture was laid down, turned and stretched.
 */
function onPage(toy: Toy, creature: Creature): { x: number; y: number }[] {
  const pen = new RecordingPen(), painter = new Painter()
  painter.prime(pen, toy, TIERS[0])
  const made = pen.log.filter((line) => line.startsWith(`${slotKey(0)}|stamp|`)).map((line) => line.split('|')[2].split(','))
  pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter)
  // The pose has not changed since the picture was made, so the frame lays it down and does not draw it again.
  expect(pen.log.filter((line) => line.startsWith(`${slotKey(0)}|`))).toEqual([])
  const laid = pen.log.find((line) => line.startsWith(`|sprite|${slotKey(0)}`))!.split('|')[2].split(',').slice(1).map(Number)
  const [x, y, turn, sx, sy] = laid, c = Math.cos(turn), s = Math.sin(turn)
  expect(made).toHaveLength(creature.thing.parts.length)
  return made.map((stamp) => ({ x: x + sx * (Number(stamp[1]) * c - Number(stamp[2]) * s), y: y + sy * (Number(stamp[1]) * s + Number(stamp[2]) * c) }))
}

describe('lesson 3: a thing is touched where it is drawn', () => {
  const POSES: Record<string, (creature: Creature) => void> = {
    'at rest, its legs and leaves turned as they stopped': (creature) => { creature.body.legs = 0.5; creature.body.clock = 0.7; creature.body.sway = 0.3 },
    'squashed': (creature) => { creature.body.squash = 0.4 },
    'stretched in a landing': (creature) => { creature.body.squash = -0.3 },
    'tumbling': (creature) => { creature.body.roll = 1.2; creature.body.lift = 18; creature.body.beat = 0.8 },
    'lifted in a hop': (creature) => { creature.body.lift = 40 },
    'leaning into a stroke': (creature) => { creature.lean = 1; creature.leanX = 0.6; creature.leanY = 0.8 },
    'on its back': (creature) => { creature.body.flip = 1 },
    'fanned and coming apart': (creature) => { creature.body.fan = 1; creature.body.loose = 0.5 },
  }

  for (const [name, pose] of Object.entries(POSES)) {
    it(`finds each part of a creature where its picture shows it: ${name}`, () => {
      const toy = scene(), creature = toy.creatures[0]
      pose(creature)
      const drawn = onPage(toy, creature)
      creature.thing.parts.forEach((part, index) => {
        // The part itself, or one that is drawn over it there: parts are drawn in their order.
        const hit = under(toy, drawn[index].x, drawn[index].y) as { creature: Creature; index: number } | null
        expect(hit && 'creature' in hit ? hit.creature : null, `${part.kind} ${index}`).toBe(creature)
        expect(hit!.index, `${part.kind} ${index}`).toBeGreaterThanOrEqual(index)
        // And exactly under the finger, not merely within a small hand's reach of it.
        expect(partUnder(creature, drawn[index].x, drawn[index].y, 0), `${part.kind} ${index}`).toBeGreaterThanOrEqual(index)
      })
    })
  }

  it('does not find a part where it was pressed on once its pose has taken it elsewhere', () => {
    const small = (): Toy => { const toy = toyOf(clearing([thing(1, 560, 470, ['twig', 'cap', 'cap'], 1)])); toy.creatures[0].rest = 999; return toy }
    const standing = small(), hopping = small()
    hopping.creatures[0].body.lift = 40
    const low = onPage(standing, standing.creatures[0])[0], high = onPage(hopping, hopping.creatures[0])[0]
    expect(low.y - high.y).toBeGreaterThan(30)
    // Where its leg is drawn in the air there is nothing of it while it stands, and the other way round.
    expect(partUnder(standing.creatures[0], high.x, high.y, 0)).toBe(-1)
    expect(partUnder(hopping.creatures[0], high.x, high.y, 0)).toBe(0)
    expect(partUnder(hopping.creatures[0], low.x, low.y, 0)).toBe(-1)
    const turned = scene(), legs = turned.creatures[0]
    legs.body.legs = 0.5
    const twig = legs.thing.parts[0], lying = placed(legs.thing, twig), half = 50
    // The far tip of a leg that has swung away is bare ground: nothing of the creature is found exactly there.
    const drawn = onPage(turned, legs)[0]
    expect(Math.hypot(drawn.x - lying.x, drawn.y - lying.y)).toBeGreaterThan(8)
    expect(partUnder(legs, lying.x - Math.cos(lying.turn) * half, lying.y - Math.sin(lying.turn) * half + (drawn.y > lying.y ? -14 : 14), 0)).toBe(-1)
  })

  it('finds a loose part, a heap, a dug acorn, each of the three and a sleeper where each is drawn', () => {
    const toy = scene()
    const lying = placed(toy.things[1], toy.things[1].parts[0])
    toy.press(lying.x + 40, lying.y); expect(toy.hand?.from?.part).toBe(toy.things[1].parts[0]); toy.cancel()
    for (const kind of KINDS) { toy.press(HEAPS[kind].x, HEAPS[kind].y); expect(toy.hand?.kind, kind).toBe(kind); toy.cancel() }
    expect(under(toy, acorns[0].x, acorns[0].y)).toEqual({ acorn: 0 })
    expect(under(toy, acorns[1].x, acorns[1].y)).toBeNull()
    heard(toy)
    toy.press(CAST.toad.x, CAST.toad.y); toy.press(CAST.big.x, CAST.big.y); toy.press(CAST.small.x, CAST.small.y)
    expect(heard(toy)).toEqual(['croak', 'puff', 'puff'])
    const asleep = toyOf(clearing([thing(1, BEDS[1].x, BEDS[1].y, ['willow', 'cap', 'cap'], 1, { bedded: true })]))
    const sleeper = frames(asleep).find((line) => line.includes(`sprite|${slotKey(0)}`))!
    expect(sleeper.split(',').slice(1, 3).map(Number)).toEqual([BEDS[1].x, BEDS[1].y])
    asleep.press(BEDS[1].x + 20, BEDS[1].y - 20)
    expect(asleep.things[0].bedded).toBe(false)
  })

  it('wakes a sleeper at a touch on any part of it as it is drawn, small and curled up, however far from the middle of its bed', () => {
    const kinds: Kind[] = ['willow', 'willow', 'maple', 'twig', 'feather', 'cap', 'cap']
    for (const bed of BEDS) {
      const make = (): Toy => toyOf(clearing([thing(1, bed.x, bed.y, kinds, 1, { bedded: true })]))
      const drawn = onPage(make(), make().creatures[0])
      let far = 0
      drawn.forEach((at, index) => {
        // The heaps and the three stand in front of a sleeper and are touched first; everywhere else the sleeper is.
        if (heapAt(at.x, at.y) || castAt(at.x, at.y) || inGrownUpCorner(at.x, at.y)) return
        const toy = make()
        toy.press(at.x, at.y)
        expect(toy.things[0].bedded, `${kinds[index]} at ${Math.round(at.x)},${Math.round(at.y)}`).toBe(false)
        expect(heard(toy)).toEqual(['blink'])
        far = Math.max(far, Math.hypot(at.x - bed.x, at.y - bed.y))
      })
      // Some of it lies further from the middle of the bed than the bed's own reach, where a touch used to rustle the fern.
      expect(far).toBeGreaterThan(BED_REACH)
    }
  })

  it('gives the touch to whatever is drawn on top: of two creatures that overlap, the one nearer the bottom of the page', () => {
    const toy = toyOf(clearing([thing(1, 560, 400, ['round', 'cap', 'cap'], 1), thing(2, 560, 430, ['round', 'cap', 'cap'], 2)]))
    for (const creature of toy.creatures) creature.rest = 999
    const drawn = frames(toy).filter((line) => line.startsWith('|sprite|')).slice(-2).map((line) => Number(line.split(',')[2]))
    expect(drawn).toEqual([400, 430])
    expect(under(toy, 560, 415)).toEqual({ creature: toy.creatures[1], index: 0 })
  })
})

describe('the kept pictures', () => {
  it('hold what lies still: a resting part, heap and acorn are stamped into the picture of the place once and not drawn again', () => {
    const toy = scene(), pen = new RecordingPen(), painter = new Painter()
    drawFrame(pen, toy, null, TIERS[0], painter)
    expect(pen.log.filter((line) => line.startsWith('laid|stamp|willow'))).toHaveLength(1)
    // The heaps at rest are in a picture of their own, made once.
    expect(pen.log.filter((line) => line.startsWith('laid|stamp|heap'))).toEqual([])
    expect(pen.log.filter((line) => line.startsWith(`${ROW}|stamp|heap`))).toHaveLength(KINDS.length)
    for (let f = 0; f < 12; f++) { pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter) }
    // At rest a frame is the place, the creature, the fern and the three, and nothing goes into a kept picture.
    expect(pen.kept).toBe(0)
    expect(pen.keys.filter((key) => /^(heap|acorn|willow|cap|twig)/.test(key))).toEqual([])
    expect(pen.keys.filter((key) => key === slotKey(0))).toHaveLength(1)
    expect(pen.count).toBeLessThan(30)
  })

  it('take a lifted part out in the frame it is lifted and draw it in the hand, and take it back when it has come to rest', () => {
    const toy = scene(), pen = new RecordingPen(), painter = new Painter()
    for (let f = 0; f < 12; f++) { pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter) }
    const lying = placed(toy.things[1], toy.things[1].parts[0])
    toy.press(lying.x + 40, lying.y)
    pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter)
    expect(pen.begun).toEqual(['laid'])
    expect(pen.keys.filter((key) => key.startsWith('>willow'))).toEqual([])
    expect(pen.keys.filter((key) => key.startsWith('willow'))).toHaveLength(1)
    toy.tap()
    let live = 0
    for (let f = 0; f < 90; f++) { toy.step(DT); pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter); live += pen.keys.filter((key) => key.startsWith('willow')).length }
    expect(live).toBeGreaterThan(3)
    expect(pen.keys.filter((key) => key.startsWith('willow') || key.startsWith('>'))).toEqual([])
  })

  it('draw a heap live only while it sinks and springs, and a creature from one picture a frame', () => {
    const toy = scene(), pen = new RecordingPen(), painter = new Painter()
    for (let f = 0; f < 12; f++) { pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter) }
    tapHeap(toy, 'round')
    toy.step(DT); pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter)
    expect(pen.keys.filter((key) => key === 'heap-round')).toHaveLength(1)
    for (let f = 0; f < 240; f++) { toy.step(DT); pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter); expect(pen.keys.filter((key) => key === slotKey(0)).length).toBeLessThanOrEqual(1) }
    expect(pen.keys.filter((key) => key === 'heap-round')).toEqual([])
  })
})

describe('what stands in front', () => {
  it('lays a heap over a creature that reaches behind it, the ghost hand over that heap, and keeps the shade of a hop the size of a small body', () => {
    const toy = toyOf(clearing([thing(1, 590, 560, ALL, 1)]))
    toy.creatures[0].rest = 999
    toy.creatures[0].body.lift = 30
    const hand: Guidance = { glow: 1, demo: 0.4, demoIndex: 1 }
    const pen = new RecordingPen(), painter = new Painter()
    for (let f = 0; f < 12; f++) { pen.reset(); drawFrame(pen, toy, hand, TIERS[0], painter) }
    const surface = pen.keys.filter((key) => !key.startsWith('>'))
    // The heaps at rest are one picture, laid once over everything that stands on the ground; the glow lies under it.
    const creature = surface.indexOf(slotKey(0)), heaps = surface.indexOf(ROW)
    expect(creature).toBeGreaterThan(0)
    expect(surface.filter((key) => key === ROW)).toHaveLength(1)
    expect(heaps).toBeGreaterThan(creature)
    expect(surface.indexOf('hand')).toBeGreaterThan(heaps)
    expect(surface.indexOf('glow')).toBeLessThan(creature)
    expect(surface.filter((key) => key.startsWith('heap-'))).toEqual([])
    const shade = pen.log.find((line) => line.startsWith('|stamp|shade'))!.split(',').map(Number)
    expect(shade[4]).toBeLessThanOrEqual(1.7)
    expect(shade[6]).toBeLessThanOrEqual(0.5)
  })
})

describe('lesson 9: no live line is a level bar', () => {
  // This holds two things and no more: no line drawn live is long and level, and no two level lines lie one above
  // the other. What else the game draws or places is held in art.test.ts and shapes.test.ts, and what no test sees
  // is said under "Reader" in REFINEMENT.md.
  it('draws no live line that is long and level, and no two level lines one above the other, in a storm with every creature about', () => {
    const toy = toyOf(clearing([thing(1, 500, 380, ALL, 1), thing(2, 700, 470, ['twig', 'twig', 'cap', 'cap'], 2)]))
    const pen = new RecordingPen(), painter = new Painter()
    let lines = 0
    for (let f = 0; f < 600; f++) {
      if (f % 150 === 20) { toy.cast.breatheIn('big'); toy.cast.breatheIn('small') }
      if (f === 300) toy.press(300, 420)
      toy.step(DT)
      pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter)
      const level: { y: number; x0: number; x1: number }[] = []
      for (const line of pen.log) {
        if (!line.includes('|line|')) continue
        lines++
        const points = line.split('|')[2].split(',')[0].split(' ').map(Number)
        const xs = points.filter((_, i) => i % 2 === 0), ys = points.filter((_, i) => i % 2 === 1)
        const wide = Math.max(...xs) - Math.min(...xs), high = Math.max(...ys) - Math.min(...ys)
        // A level bar: long, and flat from end to end. A mouth is short and a gust curls.
        expect(wide > 24 && high < 3, line).toBe(false)
        if (high < 3) level.push({ y: ys[0], x0: Math.min(...xs), x1: Math.max(...xs) })
      }
      for (const a of level) for (const b of level) if (a !== b) expect(Math.abs(a.y - b.y) < 40 && a.x0 < b.x1 && b.x0 < a.x1).toBe(false)
    }
    expect(lines).toBeGreaterThan(600)
    play(toy, 0.1)
  })
})
