import { describe, expect, it } from 'vitest'
import { CAST, EARTH, FERN, HEAPS, inGrownUpCorner, onEarth } from './clearing'
import { KINDS, MANNERS, type Kind } from './parts'
import { fresh } from './save'
import { STAGE } from './stage'
import { caps, placed } from './things'
import { drawnAt } from './testing'
import { Toy } from './toy'

const DT = 1 / 60
/** A clearing with nothing on the earth (an older child's first visit), and one with the begun thing (a youngest child's). */
const bare = (): Toy => new Toy(fresh(6, 1), 1)
const begun = (): Toy => new Toy(fresh(3, 1), 1)

/** Takes what the toy has asked to be heard since the last call. */
function heard(toy: Toy): string[] {
  return toy.asked.splice(0).map((sound) => sound.key)
}

/** Plays one frame and gives back what was asked for in it. */
function frame(toy: Toy): string[] {
  toy.step(DT)
  return heard(toy)
}

function play(toy: Toy, seconds: number): string[] {
  const all: string[] = []
  for (let f = 0; f < Math.round(seconds / DT); f++) all.push(...frame(toy))
  return all
}

/** Lifts a part from its heap and lets it fly to the earth by itself, as a tap does. */
function tapHeap(toy: Toy, kind: Kind): void {
  toy.press(HEAPS[kind].x, HEAPS[kind].y)
  toy.tap()
}

/** Carries a part from its heap and lets go with the finger at a point of the stage. */
function carry(toy: Toy, kind: Kind, x: number, y: number): void {
  toy.press(HEAPS[kind].x, HEAPS[kind].y)
  for (let f = 1; f <= 40; f++) {
    toy.move(HEAPS[kind].x + ((x - HEAPS[kind].x) * f) / 40, HEAPS[kind].y + ((y - HEAPS[kind].y) * f) / 40)
    toy.step(DT)
  }
  for (let f = 0; f < 30; f++) toy.step(DT)
}

describe('the finger', () => {
  it('is answered where it lands, in the touch itself: a part is in the hand and is heard before any frame is played', () => {
    for (const kind of KINDS) {
      const toy = bare()
      toy.press(HEAPS[kind].x, HEAPS[kind].y)
      expect(toy.hand?.kind, kind).toBe(kind)
      expect(heard(toy), kind).toEqual([`lift-${kind}`])
      // The heap has been pushed, and the part has its jump to ring out.
      expect(toy.heaps[kind].speed, kind).toBeLessThan(0)
      expect(toy.hand!.jumpSpeed, kind).toBeGreaterThan(0)
    }
  })

  it('is answered wherever it lands on the stage, and by nothing in the grown-up corner', () => {
    const toy = begun()
    for (let x = 20; x < STAGE.width; x += 38) {
      for (let y = 20; y < STAGE.height; y += 38) {
        toy.press(x, y)
        const sounds = heard(toy)
        if (inGrownUpCorner(x, y)) expect(sounds, `${x},${y}`).toEqual([])
        else expect(sounds.length, `${x},${y}`).toBe(1)
        toy.cancel()
        toy.step(DT)
        heard(toy)
      }
    }
  })

  it('is answered by each of the three in the frame and by the fern as themselves, and nothing on the earth changes', () => {
    const toy = begun(), before = JSON.stringify(toy.saved())
    toy.press(CAST.toad.x, CAST.toad.y)
    expect(heard(toy)).toEqual(['croak'])
    expect(toy.cast.toad.squashSpeed).toBeLessThan(0)
    toy.press(CAST.big.x, CAST.big.y)
    expect(heard(toy)).toEqual(['puff'])
    expect(toy.cast.big.blowLeft).toBeGreaterThan(0)
    expect(toy.air.leaves.length).toBe(1)
    toy.press(FERN.x, FERN.y - 60)
    expect(heard(toy)).toEqual(['frond'])
    expect(toy.cast.fern.swaySpeed).not.toBe(0)
    expect(JSON.stringify(toy.saved())).toBe(before)
    expect(toy.changed).toBe(0)
  })

  it('carries a part that rustles as it goes, each rustle in the frame the part has gone far enough for it', () => {
    for (const kind of KINDS) {
      const toy = bare()
      toy.press(HEAPS[kind].x, HEAPS[kind].y)
      heard(toy)
      let rustles = 0
      for (let f = 1; f <= 60; f++) {
        toy.move(HEAPS[kind].x + (EARTH.x - HEAPS[kind].x) * (f / 60), HEAPS[kind].y + (EARTH.y - HEAPS[kind].y) * (f / 60))
        const sounds = frame(toy)
        expect(sounds.every((sound) => sound === `carry-${kind}`), kind).toBe(true)
        // The hand counts from nothing again in the frame of a rustle, and in no other.
        expect(sounds.length === 1, kind).toBe(toy.hand!.sinceRustle === 0)
        rustles += sounds.length
      }
      expect(rustles, kind).toBeGreaterThanOrEqual(1)
    }
  })

  it('keeps a part above a finger that holds still, where a small hand does not cover it', () => {
    for (const kind of KINDS) {
      const toy = bare()
      carry(toy, kind, EARTH.x, EARTH.y + 40)
      play(toy, 1.2)
      expect(toy.hand!.y, kind).toBeLessThan(EARTH.y + 40 - MANNERS[kind].rope * 0.8)
      expect(Math.abs(toy.hand!.x - EARTH.x), kind).toBeLessThan(MANNERS[kind].rope * 0.6)
    }
  })
})

describe('a part pressed on', () => {
  it('rests exactly where it was put, and is heard in the frame it touches down and in no frame before', () => {
    for (const kind of KINDS) {
      const toy = bare()
      carry(toy, kind, EARTH.x + 30, EARTH.y + 50)
      const at = { x: toy.hand!.x, y: toy.hand!.y, turn: toy.hand!.turn }
      heard(toy)
      toy.drop()
      expect(toy.hand, kind).toBeNull()
      expect(toy.things, kind).toHaveLength(1)
      const part = toy.things[0].parts[0], where = placed(toy.things[0], part)
      expect(where.x, kind).toBeCloseTo(at.x, 6); expect(where.y, kind).toBeCloseTo(at.y, 6); expect(where.turn, kind).toBeCloseTo(at.turn, 6)
      expect(toy.changed, kind).toBe(2)
      let frames = 0
      while (part.fall > 0 && frames++ < 60) {
        const sounds = frame(toy)
        expect(sounds.includes(`press-${kind}`), kind).toBe(part.fall === 0)
      }
      expect(part.fall, kind).toBe(0)
    }
  })

  it('bounces as its kind does, each bounce heard in the frame of the bounce', () => {
    for (const kind of KINDS) {
      const toy = bare()
      tapHeap(toy, kind)
      heard(toy)
      const part = toy.things[0].parts[0]
      expect(part.fall, kind).toBeGreaterThan(0)
      let presses = 0
      for (let f = 0; f < 240; f++) {
        const left = part.bounces, wasInAir = part.fall > 0
        const sounds = frame(toy).filter((sound) => sound === `press-${kind}`)
        const touchedDown = wasInAir && part.fall === 0, bounced = !wasInAir && part.bounces < left
        expect(sounds.length, kind).toBe(touchedDown || bounced ? 1 : 0)
        presses += sounds.length
      }
      expect(presses, kind).toBe(1 + MANNERS[kind].bounces)
    }
  })

  it('sticks to what it touches: a second part let go on the first makes one thing of the two', () => {
    const toy = bare()
    carry(toy, 'willow', EARTH.x, EARTH.y + 60)
    toy.drop()
    carry(toy, 'twig', EARTH.x + 20, EARTH.y + 70)
    toy.drop()
    expect(toy.things).toHaveLength(1)
    expect(toy.things[0].parts.map((part) => part.kind)).toEqual(['willow', 'twig'])
  })

  it('flies to the thing being made when it is only tapped, and begins one when there is none', () => {
    const toy = begun()
    tapHeap(toy, 'maple')
    expect(toy.things).toHaveLength(1)
    expect(toy.things[0].parts).toHaveLength(4)
    const none = bare()
    tapHeap(none, 'maple')
    expect(none.things).toHaveLength(1)
    expect(none.things[0].x).toBeCloseTo(EARTH.x, 0)
  })

  it('goes back to its heap when it is let go near the heap, and flutters to the earth when it came half of the way', () => {
    const near = bare()
    carry(near, 'seed', HEAPS.seed.x - 30, HEAPS.seed.y - 20)
    heard(near)
    near.drop()
    expect(heard(near)).toEqual(['back'])
    expect(near.things).toHaveLength(0)
    expect(near.air.strays).toHaveLength(1)
    // It lands back in its heap, heard in the frame it lands.
    let landedAt = -1
    for (let f = 0; f < 120 && landedAt < 0; f++) if (frame(near).includes('home')) { landedAt = f; expect(near.air.strays).toHaveLength(0) }
    expect(landedAt).toBeGreaterThan(5)

    const far = bare()
    // Well over half of the way from its heap, and beside the earth, not on it.
    carry(far, 'seed', 848, 264)
    expect(onEarth(far.hand!.x, far.hand!.y)).toBe(false)
    far.drop()
    expect(far.things).toHaveLength(1)
  })

  it('is put back as it was when the touch is taken away', () => {
    const toy = begun(), before = JSON.stringify(toy.saved())
    const first = placed(toy.things[0], toy.things[0].parts[0])
    toy.press(first.x, first.y)
    expect(toy.hand?.from).not.toBeNull()
    toy.move(200, 300)
    play(toy, 0.5)
    // Lifted from the earth and carried off, it is still saved where it lay.
    expect(JSON.stringify(toy.saved())).toBe(before)
    toy.cancel()
    expect(toy.hand).toBeNull()
    expect(toy.things[0].parts.every((part) => !part.inHand)).toBe(true)
    expect(JSON.stringify(toy.saved())).toBe(before)
  })
})

describe('the waking', () => {
  /** The begun thing with a second cap on its way. */
  function capInTheAir(): Toy {
    const toy = begun()
    tapHeap(toy, 'cap')
    heard(toy)
    return toy
  }

  it('begins in the frame the second cap lands, with the wind children breathing in', () => {
    const toy = capInTheAir(), thing = toy.things[0], cap = thing.parts[thing.parts.length - 1]
    expect(caps(thing)).toBe(2)
    expect(thing.awake).toBe(false)
    let frames = 0
    while (!thing.awake && frames++ < 120) {
      const sounds = frame(toy)
      expect(sounds.includes('press-cap')).toBe(cap.fall === 0)
      expect(thing.awake).toBe(cap.fall === 0)
    }
    expect(toy.creatures).toHaveLength(1)
    expect(toy.cast.big.blowIn).toBeGreaterThan(0)
    expect(toy.sceneKind).toBe('waking')
    expect(toy.changed).toBe(2)
    // The gust reaches the toad when the blow starts, and flattens it.
    play(toy, 0.5)
    expect(toy.cast.toad.flat).toBeGreaterThan(0.5)
  })

  it('is heard on the clock it is seen on: the gust in the frame the blow starts, each eye in the frame it opens', () => {
    const toy = capInTheAir(), thing = toy.things[0]
    let gusts = 0, eyes = 0
    for (let f = 0; f < 240; f++) {
      const gustBefore = toy.air.gust, eyesBefore = toy.creatures[0]?.eyes ?? 0
      const sounds = frame(toy)
      const began = gustBefore < 0 && toy.air.gust >= 0
      expect(sounds.includes('gust')).toBe(began)
      if (began) { gusts++; expect(toy.cast.big.blowLeft).toBeGreaterThan(0) }
      const opened = (toy.creatures[0]?.eyes ?? 0) - eyesBefore
      expect(sounds.filter((sound) => sound === 'blink').length).toBe(opened)
      eyes += opened
    }
    expect(gusts).toBe(1)
    expect(eyes).toBe(2)
    expect(thing.awake).toBe(true)
    expect(toy.air.leaves.length).toBeGreaterThan(3)
  })

  it('is over by itself in under eight seconds, and then the creature goes where a finger calls it', () => {
    const toy = capInTheAir()
    play(toy, 7.5)
    const creature = toy.creatures[0]
    expect(toy.scene).toBeNull()
    expect(creature.inScene).toBe(false)
    expect(creature.eyes).toBe(2)
    toy.press(820, 470)
    expect(heard(toy)).toEqual(['pat'])
    const sounds = play(toy, 7)
    expect(Math.hypot(creature.thing.x - 820, creature.thing.y - 470)).toBeLessThan(60)
    // The begun thing is a round leaf with one twig, the leaf laid first: it rolls there, and is heard doing it.
    expect(sounds.filter((sound) => sound === 'turn').length).toBeGreaterThan(0)
  })

  it('makes a creature that answers a poke in the touch, as the part poked, and holds still to be dressed', () => {
    const toy = capInTheAir()
    play(toy, 7.5)
    const creature = toy.creatures[0], thing = creature.thing
    const twig = thing.parts.findIndex((part) => part.kind === 'twig'), at = drawnAt(creature, twig)
    // The finger lands: the creature gives under it at once. The lift makes it a poke.
    toy.press(at.x, at.y)
    expect(heard(toy)).toEqual(['feel'])
    expect(creature.held).toBe(twig)
    toy.tap()
    expect(heard(toy)).toEqual(['poke-twig'])
    expect(creature.poke?.kind).toBe('twig')
    expect(toy.hand).toBeNull()
    expect(toy.grip).toBeNull()
    play(toy, 1.5)
    expect(creature.poke).toBeNull()
    toy.press(HEAPS.feather.x, HEAPS.feather.y)
    toy.move(HEAPS.feather.x, HEAPS.feather.y - 80)
    play(toy, 0.5)
    const still = { x: thing.x, y: thing.y }
    play(toy, 2)
    expect(thing.x).toBe(still.x); expect(thing.y).toBe(still.y)
    toy.cancel()
  })
})
