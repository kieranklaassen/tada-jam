import { describe, expect, it } from 'vitest'
import { BEDS, CAST, GROUND, HEAPS, inEllipse } from './clearing'
import { facing, type Creature } from './creatures'
import { WAYS } from './gait'
import { bowlFar, smell } from './meet'
import type { Kind } from './parts'
import { DT, again, clearing, heard, many, play, thing, toyOf } from './testing'
import type { Toy } from './toy'
import { EVERY } from './travel'

// What the creatures do by rule: how two meet, the habit each kind adds to
// a creature it does not lead, and the wrong use of each thing, which works
// and is funny. And the toad's hat.

const acorns = (dug = false) => [{ x: 590, y: 300, dug }, { x: 420, y: 520, dug }, { x: 760, y: 520, dug }]

function pair(a: readonly Kind[], b: readonly Kind[], more: Parameters<typeof thing>[5] = {}): { toy: Toy; a: Creature; b: Creature } {
  const toy = toyOf(clearing([thing(1, 430, 400, a, 1), thing(2, 740, 430, b, 2, more)]))
  for (const creature of toy.creatures) creature.again = 0
  return { toy, a: toy.creatures[0], b: toy.creatures[1] }
}

/** Plays until `done` says so, at most `seconds`; gives back every sound, or null if it never happened. */
function until(toy: Toy, seconds: number, done: (sounds: string[]) => boolean): string[] | null {
  const all: string[] = []
  for (let f = 0; f < seconds * 60; f++) {
    toy.step(DT)
    const sounds = heard(toy)
    all.push(...sounds)
    if (done(sounds)) return all
  }
  return null
}

/** Keeps a creature travelling: a finger calls it across the ground and back. */
function walked(toy: Toy, seconds: number, each: () => void = () => {}): string[] {
  const all: string[] = []
  for (let f = 0; f < seconds * 60; f++) {
    if (f % 240 === 0) { toy.cancel(); toy.press(f % 480 === 0 ? 860 : 320, f % 480 === 0 ? 470 : 380); heard(toy) }
    toy.step(DT)
    all.push(...heard(toy))
    each()
  }
  toy.cancel()
  return all
}

describe('two creatures that meet', () => {
  it('a hopper teases a crawler: it leaps over, the crawler spins to look in that frame, and the hopper lands behind it', () => {
    const { toy, a, b } = pair(['maple', 'maple', 'cap', 'cap'], ['willow', 'willow', 'cap', 'cap'])
    expect(until(toy, 20, (sounds) => sounds.includes('spin'))).not.toBeNull()
    expect(a.leap).not.toBeNull()
    expect(b.twirl).not.toBe(0)
    const side = Math.sign(a.leap!.fromX - b.thing.x) || 1
    let high = 0
    until(toy, 3, () => { high = Math.max(high, a.body.lift); return a.leap === null })
    expect(high).toBeGreaterThan(80)
    // It came down on the other side of the crawler, and with a thump in that frame.
    const dx = a.thing.x - b.thing.x, dy = a.thing.y - b.thing.y
    expect(Math.sign(dx) === -side || Math.abs(dy) > 40).toBe(true)
    expect(a.body.lift).toBe(0)
  })

  it('a skittish crawler goes right round on the spot when it is teased', () => {
    const { toy, b } = pair(['maple', 'maple', 'cap', 'cap'], ['twig', 'twig', 'cap', 'cap'])
    expect(until(toy, 25, (sounds) => sounds.includes('spin'))).not.toBeNull()
    expect(b.twirl).toBeCloseTo(Math.PI * 2, 5)
  })

  it('a hopper never teases a sleeper, a hopper or a roller', () => {
    const sleeper = pair(['maple', 'maple', 'cap', 'cap'], ['willow', 'cap', 'cap'], { x: BEDS[0].x, y: BEDS[0].y, bedded: true })
    expect(until(sleeper.toy, 20, (sounds) => sounds.includes('spin'))).toBeNull()
    const roller = pair(['maple', 'maple', 'cap', 'cap'], ['round', 'cap', 'cap'])
    let leapt = false
    until(roller.toy, 20, () => { leapt ||= roller.a.leap !== null; return false })
    expect(leapt).toBe(false)
  })

  it('a roller bowls over whatever it rolls into: that one tumbles with its parts flapping and gets up bewildered and unhurt', () => {
    const { toy, a, b } = pair(['round', 'round', 'cap', 'cap'], ['willow', 'twig', 'cap', 'cap'])
    const parts = JSON.stringify(b.thing.parts.map((part) => [part.kind, part.x, part.y]))
    expect(until(toy, 25, (sounds) => sounds.includes('bonk'))).not.toBeNull()
    expect(b.tumble).not.toBeNull()
    expect(a.again).toBeGreaterThan(5)
    let flapped = 0, turned = 0
    until(toy, 3, () => { flapped = Math.max(flapped, b.body.beat); turned = Math.max(turned, Math.abs(b.body.roll)); return b.tumble === null })
    expect(flapped).toBeGreaterThan(0.5)
    expect(turned).toBeGreaterThan(3)
    expect([b.tumble, b.body.roll, b.body.lift]).toEqual([null, 0, 0])
    expect(b.dizzy).toBeGreaterThan(1)
    expect(JSON.stringify(b.thing.parts.map((part) => [part.kind, part.x, part.y]))).toBe(parts)
    expect(inEllipse(b.thing.x, b.thing.y, GROUND)).toBe(true)
  })

  it('more round leaves bowl further, and more seeds smell an acorn from further off', () => {
    expect(bowlFar(4)).toBeGreaterThan(bowlFar(1))
    expect(smell(4)).toBeGreaterThan(smell(1))
  })

  it('a feathered one smooths itself crossly, back turned, after being bowled over', () => {
    const { toy, b } = pair(['round', 'round', 'cap', 'cap'], ['willow', 'willow', 'feather', 'cap', 'cap'])
    expect(until(toy, 25, (sounds) => sounds.includes('bonk'))).not.toBeNull()
    const sounds = until(toy, 3, () => b.tumble === null)!
    expect(sounds).toContain('fan')
    expect(b.cross).toBeGreaterThan(1.5)
    expect(Math.abs(b.twirl)).toBeCloseTo(Math.PI, 5)
  })

  it('a feathered one fans at any creature that comes near', () => {
    const toy = toyOf(clearing([thing(1, 520, 420, ['willow', 'willow', 'feather', 'cap', 'cap'], 1), thing(2, 640, 420, ['seed', 'cap', 'cap'], 2)]))
    toy.creatures[0].again = 0; toy.creatures[0].rest = 99
    let fanned = 0
    const sounds = until(toy, 4, () => { fanned = Math.max(fanned, toy.creatures[0].body.fan); return false })
    expect(sounds).toBeNull()
    expect(fanned).toBeGreaterThan(0.6)
  })

  it('a strutter goes to be looked at: it walks up to the nearest creature, stops short of it and fans, its eyes on it', () => {
    const { toy, a, b } = pair(['feather', 'feather', 'cap', 'cap'], ['willow', 'cap', 'cap'])
    b.rest = 999
    play(toy, 14)
    expect(a.want.what).toBe('show')
    const far = Math.hypot(a.thing.x - b.thing.x, a.thing.y - b.thing.y)
    expect(far).toBeLessThan(190)
    expect(far).toBeGreaterThan(90)
    expect(a.body.fan).toBeGreaterThan(0.5)
  })

  it('a slitherer lies down beside a sleeper, half curled, and a shy one hides by the fern while a roller rolls', () => {
    const beside = pair(['willow', 'willow', 'cap', 'cap'], ['seed', 'cap', 'cap'], { x: BEDS[0].x, y: BEDS[0].y, bedded: true })
    play(beside.toy, 16)
    expect(beside.a.want.what).toBe('curl')
    expect(beside.a.body.curl).toBeGreaterThan(0.4)
    expect(Math.hypot(beside.a.thing.x - BEDS[0].x, beside.a.thing.y - BEDS[0].y)).toBeLessThan(190)
    const hiding = pair(['willow', 'willow', 'cap', 'cap'], ['round', 'round', 'cap', 'cap'])
    let hid = false
    until(hiding.toy, 12, () => { hid ||= hiding.a.want.what === 'hide'; return false })
    expect(hid).toBe(true)
  })

  it('a skittish one runs from a roller that comes near', () => {
    const toy = toyOf(clearing([thing(1, 520, 420, ['maple', 'maple', 'twig', 'cap', 'cap'], 1), thing(2, 700, 420, ['round', 'round', 'cap', 'cap'], 2)]))
    let fled = false
    until(toy, 12, () => { fled ||= toy.creatures[0].want.what === 'flee'; return false })
    expect(fled).toBe(true)
  })

  it('a seed nose leaves the others alone: its eyes are on the acorn it smells, whoever stands beside it', () => {
    const toy = toyOf(clearing([thing(1, 500, 380, ['seed', 'seed', 'cap', 'cap'], 1), thing(2, 560, 440, ['willow', 'cap', 'cap'], 2)], { acorns: acorns() }))
    toy.step(DT)
    expect(toy.creatures[0].want.what).toBe('dig')
  })

  it('never leaves two creatures standing on one another', () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['seed', 'cap', 'cap'], 1), thing(2, 596, 424, ['seed', 'cap', 'cap'], 2), thing(3, 590, 416, ['willow', 'cap', 'cap'], 3)], { acorns: acorns(true) }))
    play(toy, 6)
    for (const a of toy.creatures) for (const b of toy.creatures) if (a !== b) expect(Math.hypot(a.thing.x - b.thing.x, a.thing.y - b.thing.y)).toBeGreaterThan(34)
  })
})

describe('a kind that does not lead', () => {
  const HABIT_SOUND: Record<Exclude<Kind, 'cap'>, string> = { maple: 'beat', round: 'turn', twig: 'foot', feather: 'fan', seed: 'sniff', willow: 'curve' }

  it('still adds its habit every few strides, with its own sound in the frame the habit begins', () => {
    for (const kind of ['maple', 'round', 'twig', 'feather', 'seed', 'willow'] as const) {
      const lead: Kind = kind === 'willow' ? 'twig' : 'willow'
      const toy = toyOf(clearing([thing(1, 590, 420, [...many(lead, 3), kind, 'cap', 'cap'], 1)], { acorns: acorns(true) }))
      const creature = toy.creatures[0]
      let began = 0
      for (let f = 0; f < 1200; f++) {
        if (f % 240 === 0) { toy.cancel(); toy.press(f % 480 === 0 ? 860 : 320, 440); heard(toy) }
        // A habit is chosen at the end of a stride and begins to move in the next frame: that is the frame of its sound.
        const waiting = creature.habit !== null && creature.habit.t === 0
        toy.step(DT)
        const sounds = heard(toy)
        if (waiting && creature.habit && creature.habit.t > 0 && creature.habit.kind === kind) { began++; expect(sounds, kind).toContain(HABIT_SOUND[kind]) }
      }
      expect(began, kind).toBeGreaterThan(1)
    }
  })

  it('stops longer to fan the more feathers there are', () => {
    const lasts = (feathers: number): number => {
      const toy = toyOf(clearing([thing(1, 590, 420, [...many('willow', 4), ...many('feather', feathers), 'cap', 'cap'], 1)], { acorns: acorns(true) }))
      let most = 0
      walked(toy, 12, () => { most = Math.max(most, toy.creatures[0].habit?.lasts ?? 0) })
      return most
    }
    expect(lasts(3)).toBeGreaterThan(lasts(1))
  })
})

describe('the wrong use of each thing', () => {
  const alone = (kinds: readonly Kind[]): { toy: Toy; creature: Creature } => {
    const toy = toyOf(clearing([thing(1, 590, 420, kinds, 1)], { acorns: acorns(true) }))
    return { toy, creature: toy.creatures[0] }
  }

  it('twigs and eyes alone scuttle fastest of all and trip over their own legs every third burst', () => {
    expect(WAYS.twig.speed(9)).toBeGreaterThan(Math.max(WAYS.round.top(9), WAYS.willow.speed(9), WAYS.maple.reach(9) / (WAYS.maple.crouch + WAYS.maple.air + WAYS.maple.rest)))
    const { toy, creature } = alone([...many('twig', 6), 'cap', 'cap'])
    let nose = 0
    const sounds = walked(toy, 12, () => { nose = Math.max(nose, creature.body.roll) })
    expect(sounds.filter((sound) => sound === 'trip').length).toBeGreaterThan(1)
    expect(nose).toBeGreaterThan(0.7)
    expect(EVERY.twig).toBe(3)
  })

  it('maple wings alone beat so hard that it lands on its back and flaps itself over', () => {
    const { toy, creature } = alone(['maple', 'maple', 'maple', 'cap', 'cap'])
    let onBack = 0
    walked(toy, 10, () => { onBack = Math.max(onBack, creature.body.flip) })
    expect(onBack).toBe(1)
    play(toy, 2)
    expect(creature.body.flip).toBe(0)
  })

  it('a willow leaf with the caps at its tail end slithers tail first, because the eyes lead', () => {
    const tailFirst = thing(1, 590, 420, ['willow', 'cap', 'cap'], 1)
    // The caps stand at the leaf's tip, not at its stem.
    tailFirst.parts[1].x = 104; tailFirst.parts[2].x = 104
    const toy = toyOf(clearing([tailFirst], { acorns: acorns(true) }))
    const creature = toy.creatures[0], from = { x: creature.thing.x, y: creature.thing.y }
    toy.press(300, 420); play(toy, 3)
    const went = Math.atan2(creature.thing.y - from.y, creature.thing.x - from.x)
    expect(Math.cos(went - facing(creature))).toBeGreaterThan(0.7)
    // The caps are in front as it goes left: they are further left than the leaf's middle.
    const c = Math.cos(creature.thing.turn), s = Math.sin(creature.thing.turn), cap = creature.thing.parts[1]
    expect(creature.thing.x + cap.x * c - cap.y * s).toBeLessThan(creature.thing.x)
    toy.cancel()
  })

  it('one round leaf with its eyes on it stops dizzy', () => {
    const { toy, creature } = alone(['round', 'cap', 'cap'])
    toy.press(820, 440); play(toy, 2.5); toy.cancel()
    expect(creature.body.speed).toBeGreaterThan(40)
    let dizzy = 0
    until(toy, 10, () => { dizzy = Math.max(dizzy, creature.dizzy); return false })
    expect(dizzy).toBeGreaterThan(1.5)
  })

  it('feathers alone fan so proudly that it tips over backwards, and seeds alone sneeze themselves along', () => {
    const feathers = alone(['feather', 'feather', 'cap', 'cap'])
    let back = 0
    walked(feathers.toy, 14, () => { back = Math.min(back, feathers.creature.body.roll) })
    expect(back).toBeLessThan(-1)
    const seeds = alone(['seed', 'seed', 'cap', 'cap'])
    expect(walked(seeds.toy, 14).filter((sound) => sound === 'sneeze').length).toBeGreaterThan(0)
  })

  it('caps alone waddle off, each step heard, and a third cap blinks out of turn', () => {
    const { toy, creature } = alone(['cap', 'cap', 'cap'])
    let odd = false
    const sounds = walked(toy, 8, () => { odd ||= creature.oddBlink > 0.5 && creature.blink === 0 })
    expect(sounds.filter((sound) => sound === 'rock').length).toBeGreaterThan(4)
    expect(odd).toBe(true)
  })
})

describe('a part pressed on to the toad', () => {
  /** Carries a part from its heap to the toad and lets go. */
  function hat(toy: Toy, kind: Kind): void {
    toy.press(HEAPS[kind].x, HEAPS[kind].y)
    for (let f = 1; f <= 30; f++) { toy.move(HEAPS[kind].x + ((CAST.toad.x - HEAPS[kind].x) * f) / 30, HEAPS[kind].y + ((CAST.toad.y + 20 - HEAPS[kind].y) * f) / 30); toy.step(DT) }
    heard(toy)
    toy.drop()
  }

  it('is worn as a hat, heard in the touch, and the toad looks up at it', () => {
    const toy = toyOf(clearing([]))
    hat(toy, 'maple')
    expect(heard(toy)).toEqual(['press-maple'])
    expect(toy.cast.toad.hat?.kind).toBe('maple')
    expect(toy.things).toHaveLength(0)
    play(toy, 1)
    expect(toy.cast.toad.lookY).toBeLessThan(-0.7)
  })

  it('slides back to its heap at the toad\'s next gulp, heard in that frame, and is gone on load', () => {
    const toy = toyOf(clearing([]))
    hat(toy, 'feather')
    expect(again(toy).cast.toad.hat).toBeNull()
    expect(toy.saved().things).toEqual([])
    const sounds = until(toy, 8, (heardNow) => heardNow.includes('gulp'))
    expect(sounds).not.toBeNull()
    expect(toy.cast.toad.hat).toBeNull()
    expect(toy.air.strays.map((stray) => stray.kind)).toEqual(['feather'])
    expect(play(toy, 2)).toContain('home')
  })

  it('sends the hat it had home when it is given another', () => {
    const toy = toyOf(clearing([]))
    hat(toy, 'twig')
    hat(toy, 'round')
    expect(toy.cast.toad.hat?.kind).toBe('round')
    expect(toy.air.strays.map((stray) => stray.kind)).toEqual(['twig'])
  })
})
