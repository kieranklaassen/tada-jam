import { describe, expect, it } from 'vitest'
import { BEDS, EARTH, GROUND, HEAPS, HOLLOW, inEllipse, onEarth } from './clearing'
import { MAX_REACH, TIERS } from './config'
import { Painter } from './painter'
import { SHAPES } from './parts'
import { ROW, slotKey } from './pen'
import { pressOn, reachWith } from './placing'
import { read, write } from './save'
import { DT, RecordingPen, again, clearing, drag, kept, lying, play, tapHeap, thing, toyOf } from './testing'
import { newPart, placed } from './things'
import { Toy, putAway } from './toy'
import { drawFrame } from './view'

// Found as left. What a child leaves and what the child finds are the same
// to the last part: these tests set the clearing as it lies in the game
// that was put away beside the clearing as it lies in the game that was
// opened. They do not compare one reading of a record with another.

describe('a sleeper is found in its bed', () => {
  it('finds five sleepers each in the bed it lay in, and they stay there', () => {
    const toy = toyOf(clearing(BEDS.map((bed, i) => thing(i + 1, bed.x, bed.y, ['willow', 'maple', 'cap', 'cap'], i + 1, { bedded: true }))))
    play(toy, 3)
    const left = lying(toy)
    expect(left.map((one) => [(one as { x: number }).x, (one as { y: number }).y])).toEqual(BEDS.map((bed) => [bed.x, bed.y]))
    for (const found of [again(toy), putAway(toy, 6, 99)]) {
      expect(lying(found)).toEqual(left)
      play(found, 5)
      expect(lying(found)).toEqual(left)
      for (const creature of found.creatures) expect([creature.body.curl, creature.lids]).toEqual([1, 1])
    }
  })

  it('finds a creature that was bedded down by two strokes in the bed it went to, whenever the game is put away', () => {
    for (const after of [0, 1.5, 7]) {
      const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'willow', 'feather', 'cap', 'cap'], 1, { drowsy: true })]))
      toy.creatures[0].rest = 999
      const at = placed(toy.things[0], toy.things[0].parts[0])
      drag(toy, at.x - 40, at.y, at.x + 70, at.y)
      toy.drop()
      expect(toy.sceneKind).toBe('bedding')
      play(toy, after)
      const found = again(toy)
      expect([found.things[0].x, found.things[0].y, found.things[0].bedded], `after ${after}`).toEqual([BEDS[0].x, BEDS[0].y, true])
      expect(lying(found)).toEqual(kept(write(toy.saved())))
      // Played to its end, the game that was not put away has it in that same bed.
      play(toy, 8)
      expect(lying(toy)).toEqual(lying(found))
    }
  })

  it('finds a sleeper that was just woken where it stood up, under the fern, and not carried on to the ground', () => {
    const toy = toyOf(clearing([thing(1, BEDS[3].x, BEDS[3].y, ['willow', 'twig', 'cap', 'cap'], 1, { bedded: true })]))
    play(toy, 1)
    toy.press(BEDS[3].x, BEDS[3].y); toy.tap()
    play(toy, 0.3)
    const left = lying(toy)[0] as { x: number; y: number; bedded: boolean }
    expect(left.bedded).toBe(false)
    expect(inEllipse(left.x, left.y, GROUND)).toBe(false)
    expect(inEllipse(left.x, left.y, HOLLOW)).toBe(true)
    expect(lying(again(toy))).toEqual(lying(toy))
  })
})

describe('the small cases', () => {
  it('finds a thing laid at the very rim of the earth where it was laid, and a part let go past the rim beside it on the earth', () => {
    const toy = toyOf(clearing([]))
    // As far right as the earth goes.
    let x = EARTH.x
    while (onEarth(x + 2, EARTH.y)) x += 2
    drag(toy, HEAPS.willow.x, HEAPS.willow.y, x, EARTH.y + SHAPES.willow.r + 26, 30)
    toy.drop()
    play(toy, 1)
    expect(toy.things).toHaveLength(1)
    const left = lying(toy)
    expect(lying(again(toy))).toEqual(left)
    // A second part let go beside it, past the rim, joins nothing where it was let go: it has come most of the way
    // from its heap, so it flutters on to the earth by itself, and lands on it.
    const far = x + 60
    expect(onEarth(far, EARTH.y)).toBe(false)
    drag(toy, HEAPS.twig.x, HEAPS.twig.y, far, EARTH.y + SHAPES.twig.r + 26, 30)
    toy.drop()
    play(toy, 1.5)
    for (const one of toy.things) for (const part of one.parts) { const at = placed(one, part); expect(onEarth(at.x, at.y), part.kind).toBe(true) }
    expect(toy.things.reduce((sum, one) => sum + one.parts.length, 0)).toBe(2)
    expect(lying(again(toy))).toEqual(lying(toy))
  })

  it('takes no part on to a thing never woken from off the earth: pressed on there it joins nothing, so such a thing never lies past the rim', () => {
    let x = EARTH.x
    while (onEarth(x + 2, EARTH.y)) x += 2
    const things = [{ id: 1, x, y: EARTH.y, turn: 0, awake: false, woke: 0, drowsy: false, bedded: false, parts: [newPart('willow', 0, 0, 0, 0)] }]
    // Touching the thing, and off the earth.
    const at = { kind: 'twig' as const, x: x + SHAPES.willow.half + 10, y: EARTH.y, turn: 0 }
    expect(onEarth(at.x, at.y)).toBe(false)
    expect(pressOn(things, 'twig', 0, at, () => 2)).toEqual({ how: 'off' })
    expect(things[0].parts).toHaveLength(1)
    // The same part a little further in is taken.
    expect(pressOn(things, 'twig', 0, { ...at, x: x - 20 }, () => 2).how).toBe('on')
  })

  it('keeps a part that a record puts far out: it is brought in to what a thing may reach, never dropped', () => {
    const raw = write(clearing([thing(1, 590, 420, ['willow', 'twig', 'cap'])]))
    raw.things[0].parts[1].x = 900
    const found = new Toy(read(JSON.parse(JSON.stringify(raw)), 6, 1), 1)
    expect(found.things[0].parts.map((part) => part.kind)).toEqual(['willow', 'twig', 'cap'])
    expect(reachWith(found.things[0], [])).toBeLessThanOrEqual(MAX_REACH)
    // And what the game itself makes never needs bringing in: found again, it lies as it lay.
    expect(lying(again(found))).toEqual(lying(found))
  })

  it('remembers which thing was being made: a part tapped after the game is found goes to that thing', () => {
    const toy = toyOf(clearing([thing(1, 430, 420, ['willow', 'twig']), thing(2, 760, 420, ['round', 'maple'])]))
    // The child adds to the first of the two, which the order of things alone would not choose.
    drag(toy, HEAPS.seed.x, HEAPS.seed.y, 430, 420 + SHAPES.seed.r + 26, 30)
    toy.drop()
    play(toy, 1)
    expect(toy.focus?.id).toBe(1)
    expect(write(toy.saved()).focus).toBe(1)
    const found = again(toy)
    expect(found.focus?.id).toBe(1)
    found.touched = true
    tapHeap(found, 'feather')
    play(found, 1.5)
    expect(found.things.find((one) => one.id === 1)!.parts.map((part) => part.kind)).toContain('feather')
    // Without the memory it goes to the other: the same record with the focus struck out.
    const blank = write(toy.saved()); blank.focus = 2
    const other = new Toy(read(JSON.parse(JSON.stringify(blank)), 6, 99), 99)
    other.touched = true
    tapHeap(other, 'feather')
    play(other, 1.5)
    expect(other.things.find((one) => one.id === 2)!.parts.map((part) => part.kind)).toContain('feather')
  })

  it('saves no thing as the one being made on a first visit, before the child has added to any, and a tapped part still goes to the thing found begun', () => {
    for (const age of [3, null, 6]) expect(write(new Toy(read(null, age, 1), 1).saved()).focus, `age ${age}`).toBe(0)
    const toy = new Toy(read(null, 3, 1), 1)
    toy.touched = true
    tapHeap(toy, 'twig')
    play(toy, 1.5)
    expect(toy.things).toHaveLength(1)
    expect(toy.things[0].parts).toHaveLength(4)
    expect(write(toy.saved()).focus).toBe(toy.things[0].id)
  })

  it('finds a thing awake, standing with both eyes open and nothing playing, when it was put away while its second cap was in the air', () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig', 'cap'])]))
    tapHeap(toy, 'cap')
    toy.step(DT)
    expect(toy.creatures).toHaveLength(0)
    expect(toy.things[0].parts.some((part) => part.fall > 0)).toBe(true)
    const found = again(toy)
    expect(found.creatures).toHaveLength(1)
    expect([found.creatures[0].eyes, found.scene, found.things[0].awake]).toEqual([2, null, true])
    expect(lying(found)).toEqual(kept(write(toy.saved())))
    for (let f = 0; f < 240; f++) { found.step(DT); expect(found.scene).toBeNull(); expect(found.asked).toEqual([]) }
  })

  it('wakes a thing when a touch that is taken away puts its first cap back beside a second that landed meanwhile: what is there and what is saved agree', () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig', 'cap'])]))
    tapHeap(toy, 'cap')
    toy.step(DT)
    // While the second cap is in the air, a finger lifts the first off the thing and holds it.
    const first = toy.things[0].parts.find((part) => part.kind === 'cap' && part.fall === 0)!
    const at = placed(toy.things[0], first)
    toy.press(at.x, at.y)
    expect(toy.hand?.from?.part).toBe(first)
    play(toy, 1.5)
    // The second has landed; with the first in the hand the thing has one cap lying on it and sleeps on.
    expect(toy.things[0].parts.filter((part) => part.kind === 'cap' && part.fall === 0)).toHaveLength(2)
    expect([toy.creatures.length, toy.things[0].awake]).toEqual([0, false])
    // The touch is taken away: the first cap is back where it lay, and the thing has its two eyes.
    toy.cancel()
    expect([toy.creatures.length, toy.things[0].awake, toy.sceneKind]).toEqual([1, true, 'waking'])
    expect(again(toy).things[0].awake).toBe(true)
  })

  it('brings a part down on a creature that is walking off as on any other: it does not hang over it', () => {
    const five = [0, 1, 2, 3, 4].map((i) => thing(i + 1, 380 + i * 100, 360 + (i % 2) * 120, ['twig', 'cap', 'cap'], i + 1))
    const toy = toyOf(clearing([...five, thing(20, 590, 300, ['round', 'cap'])]))
    tapHeap(toy, 'cap')
    for (let f = 0; f < 200 && !toy.creatures.some((creature) => creature.leaving); f++) toy.step(DT)
    const leaver = toy.creatures.find((creature) => creature.leaving)!
    expect(toy.things).not.toContain(leaver.thing)
    // A part pressed on to it a moment before it set out is still on its way down.
    const part = leaver.thing.parts[0]
    part.fall = 0.12
    const sounds = play(toy, 0.3)
    expect(part.fall).toBe(0)
    expect(sounds).toContain('press-twig')
  })
})

describe('heaps stand in front of sleepers', () => {
  it('lays the heaps over a sleeper as over anyone else, and the fern over both', () => {
    const toy = toyOf(clearing([thing(1, BEDS[0].x, BEDS[0].y, ['willow', 'willow', 'maple', 'cap', 'cap'], 1, { bedded: true })]))
    const pen = new RecordingPen(), painter = new Painter()
    for (let f = 0; f < 3; f++) { toy.step(DT); pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter) }
    const surface = pen.keys.filter((key) => !key.startsWith('>'))
    const sleeper = surface.indexOf(slotKey(0)), heaps = surface.indexOf(ROW), fern = surface.indexOf('frond')
    expect(sleeper).toBeGreaterThan(0)
    expect(heaps).toBeGreaterThan(sleeper)
    expect(fern).toBeGreaterThan(heaps)
  })
})
