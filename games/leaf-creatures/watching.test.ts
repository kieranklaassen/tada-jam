import { describe, expect, it } from 'vitest'
import { Cast } from './cast'
import { CAST, HEAPS } from './clearing'
import { MAX_LOOSE, TIERS } from './config'
import { bowlOver, type Creature } from './creatures'
import { Painter } from './painter'
import { SHAPES, type Kind } from './parts'
import { PALE } from './pen'
import { wheelOf } from './posed'
import { makeRng } from './rng'
import type { SavedThing } from './save'
import { DT, RecordingPen, again, clearing, drag, drawnAt, heard, many, play, tapHeap, thing, toyOf } from './testing'
import { SHIVERS } from './touching'
import type { Toy } from './toy'
import { CROSS, SMOOTHS } from './travel'
import { LIFT, drawFrame } from './view'

// What the sheet says and a reader found the code lacked: who the three
// look at, how often the toad croaks, and the small motions of a part as it
// is lifted, of one wheel with eyes, of a cross feather and of a full thing.

function standing(kinds: readonly Kind[], x = 590, y = 440): { toy: Toy; creature: Creature } {
  const toy = toyOf(clearing([thing(1, x, y, kinds, 1)]))
  toy.creatures[0].rest = 999
  return { toy, creature: toy.creatures[0] }
}

describe('the three look at the thing that answers, never at the finger', () => {
  it('turns the toad\'s eyes to wherever it is told the creature is, whatever the others are told to look at', () => {
    const cast = new Cast(), rng = makeRng(1)
    for (let f = 0; f < 180; f++) cast.step(DT, { x: 1100, y: 60 }, null, false, false, rng, { x: CAST.toad.x, y: CAST.toad.y + 400 })
    expect(cast.toad.lookY).toBeGreaterThan(0.9)
    expect(Math.abs(cast.toad.lookX)).toBeLessThan(0.05)
    // The wind children look where the first place says.
    expect(cast.big.lookX).toBeGreaterThan(0.9)
    expect(cast.big.lookY).toBeLessThan(0)
  })

  it('looks at the creature that comes to a finger on the ground, not at the finger', () => {
    const { toy, creature } = standing(['twig', 'twig', 'cap', 'cap'], 860, 470)
    // The finger lands at the far left of the ground and stays down; the creature is at the far right.
    toy.press(250, 400)
    expect(toy.heed?.at).toBe(creature.thing)
    play(toy, 0.25)
    const from = { x: creature.thing.x, y: creature.thing.y }
    // The small wind child sits above the creature: looking at the finger it would look hard left.
    expect(toy.cast.small.lookX).toBeGreaterThan(-0.6)
    expect(toy.cast.small.lookX).toBeLessThan((from.x - CAST.small.x) / 420 + 0.25)
    // The toad sits by the finger: looking at it, its eyes would hardly leave the middle; they go right, to the creature.
    expect(toy.cast.toad.lookX).toBeGreaterThan(0.35)
    toy.cancel()
  })

  it('leaves them looking where they were looking when a finger lands on bare ground and nobody can come', () => {
    const toy = toyOf(clearing([]))
    play(toy, 2)
    const before = [toy.cast.big.lookX, toy.cast.small.lookX, toy.cast.small.lookY]
    toy.press(250, 400)
    expect(toy.heed).toBeNull()
    play(toy, 1)
    // The small one keeps its eyes on the heap of round leaves.
    expect(toy.cast.small.lookX).toBeCloseTo(Math.max(-1, (HEAPS.round.x - CAST.small.x) / 420), 1)
    expect(Math.abs(toy.cast.big.lookX - before[0])).toBeLessThan(0.05)
    toy.cancel()
  })

  it('keeps the toad\'s glare on the scuttler that ran by, while a touch elsewhere draws the wind children\'s eyes away', () => {
    const { toy, creature } = standing(['twig', 'twig', 'twig', 'cap', 'cap'], 300, 470)
    play(toy, 3.2)
    heard(toy)
    // It runs off across the ground by itself, past the toad.
    creature.rest = 0; creature.target = { x: 820, y: 470 }
    let started = false
    for (let f = 0; f < 240 && !started; f++) { toy.step(DT); started = toy.cast.toad.glare > 0.9 }
    expect(started).toBe(true)
    expect(toy.toadAt?.at).toBe(creature.thing)
    // A finger lands on the big wind child, up in its tree: that is what answered, and the wind children look there.
    toy.press(CAST.big.x, CAST.big.y); toy.tap()
    expect(toy.heed?.at).toBe(CAST.big)
    play(toy, 1)
    expect(toy.cast.toad.glare).toBeGreaterThan(0.3)
    // Looking at the wind child, the toad would look up the page. It looks across, at the creature.
    expect(toy.cast.toad.lookY).toBeGreaterThan(-0.15)
    expect(toy.cast.toad.lookX).toBeGreaterThan(0.5)
    expect(toy.cast.small.lookY).toBeLessThan(0.1)
  })
})

describe('no sound without sight', () => {
  it('always shows a leaf come loose where a finger presses the tree tops or the outer grass, with as many leaves in the air as there may be', () => {
    for (const at of [{ x: 640, y: 150 }, { x: 40, y: 700 }, { x: 1150, y: 760 }]) {
      const toy = toyOf(clearing([]))
      toy.air.most = TIERS[0].leaves
      // The sky is full: seven leaves that have been falling for a while.
      for (let i = 0; i < 40 && toy.air.leaves.length < toy.air.most; i++) toy.air.loosen(200 + i * 90, 60, toy.airRng)
      expect(toy.air.leaves).toHaveLength(toy.air.most)
      play(toy, 1)
      expect(toy.air.leaves).toHaveLength(toy.air.most)
      heard(toy)
      toy.press(at.x, at.y)
      expect(heard(toy), `${at.x},${at.y}`).toContain('frond')
      // A new leaf is in the air by the finger, in that call, and there are no more in the air than there may be.
      const fresh = toy.air.leaves.filter((leaf) => leaf.age === 0)
      expect(fresh).toHaveLength(1)
      expect(Math.abs(fresh[0].x - at.x)).toBeLessThanOrEqual(30)
      expect(Math.abs(fresh[0].y - at.y)).toBeLessThanOrEqual(15)
      expect(toy.air.leaves).toHaveLength(toy.air.most)
      toy.tap()
    }
  })

  it('still shows its leaf after a step down in quality has left more leaves in the air than there may be: one goes and one comes', () => {
    const toy = toyOf(clearing([]))
    toy.air.most = TIERS[0].leaves
    for (let i = 0; i < 40 && toy.air.leaves.length < toy.air.most; i++) toy.air.loosen(200 + i * 90, 60, toy.airRng)
    const up = toy.air.leaves.length
    play(toy, 1)
    // The tier steps down: fewer leaves may be in the air than are.
    toy.air.most = 3
    expect(up).toBeGreaterThan(toy.air.most + 2)
    heard(toy)
    toy.press(40, 700)
    expect(heard(toy)).toContain('frond')
    const fresh = toy.air.leaves.filter((leaf) => leaf.age === 0)
    expect(fresh).toHaveLength(1)
    expect(Math.abs(fresh[0].x - 40)).toBeLessThanOrEqual(30)
    expect(toy.air.leaves).toHaveLength(up)
    toy.tap()
  })

  for (const how of ['thrown along by a roller', 'in the air over a crawler'] as const) {
    it(`sounds a poke on a creature ${how} when the poke is seen to move it, not before`, () => {
      const { toy, creature } = standing(['twig', 'twig', 'twig', 'cap', 'cap'])
      play(toy, 0.5)
      if (how === 'thrown along by a roller') bowlOver(creature, 1, 0, 60)
      else creature.leap = { fromX: creature.thing.x, fromY: creature.thing.y, toX: creature.thing.x + 140, toY: creature.thing.y, t: 0, lasts: 0.75, high: 100, beats: 0 }
      for (let f = 0; f < 6; f++) toy.step(DT)
      heard(toy)
      const at = drawnAt(creature, 0)
      toy.press(at.x, at.y)
      toy.tap()
      // The lift is taken, and nothing of the poke is heard yet: it cannot play while the creature is thrown or in the air.
      expect(creature.poke?.kind).toBe('twig')
      expect(heard(toy).filter((key) => key.startsWith('poke-'))).toEqual([])
      let frames = 0, sounded = false
      while (!sounded && frames < 200) {
        const lift = creature.body.lift, busy = creature.tumble !== null || creature.leap !== null
        toy.step(DT); frames++
        sounded = heard(toy).includes('poke-twig')
        // In the frame it sounds the poke has begun to play: the creature is down from what it was in, and leaps aside.
        if (sounded) { expect(busy).toBe(false); expect(creature.poke!.t).toBeGreaterThan(0); expect(creature.body.lift).not.toBe(lift) }
        else expect(creature.poke!.t).toBe(0)
      }
      expect(sounded).toBe(true)
      expect(frames).toBeGreaterThan(10)
      // And it sounds once.
      expect(play(toy, 2).filter((key) => key === 'poke-twig')).toEqual([])
    })
  }
})

describe('the toad starts once at a runner', () => {
  it('starts and glares once at a scuttler that runs about by its stump, not every few seconds, and once more when it has been away and runs by again', () => {
    const { toy, creature } = standing(['twig', 'twig', 'twig', 'cap', 'cap'], 300, 470)
    play(toy, 3.2)
    heard(toy)
    let starts = 0, was = 0, far = 0, ran = 0
    const run = (seconds: number): number => {
      const before = starts
      for (let f = 0; f < Math.round(seconds / DT); f++) {
        // It is kept running to and fro within sight of the stump.
        if (f % 15 === 0) { creature.rest = 0; creature.target = { x: f % 180 < 90 ? 340 : 250, y: 470 } }
        toy.step(DT)
        far = Math.max(far, Math.hypot(creature.thing.x - CAST.toad.x, creature.thing.y - CAST.toad.y))
        if (creature.body.speed > 20) ran++
        if (toy.cast.toad.glare > 0.95 && was <= 0.95) starts++
        was = toy.cast.toad.glare
      }
      return starts - before
    }
    expect(run(30)).toBe(1)
    // It ran about for that half minute within sight of the stump, fast enough to start the toad many times over.
    expect(far).toBeLessThan(320)
    expect(ran).toBeGreaterThan(300)
    // Away to the far side, and back at a run.
    creature.thing.x = 800
    play(toy, 1)
    creature.thing.x = 300
    expect(run(20)).toBe(1)
  })
  it('has started at a runner woken beside its stump by the end of the waking, and does not start again as it runs about there', () => {
    const toy = toyOf(clearing([thing(1, 300, 470, ['twig', 'twig', 'twig', 'cap'])]))
    tapHeap(toy, 'cap')
    let starts = 0, was = 0, ran = 0, far = 0
    const watch = (): void => {
      if (toy.cast.toad.glare > 0.95 && was <= 0.95) starts++
      was = toy.cast.toad.glare
    }
    for (let f = 0; f < 900 && (toy.scene || toy.creatures.length === 0); f++) { toy.step(DT); watch() }
    expect(toy.creatures).toHaveLength(1)
    expect(starts).toBe(1)
    const creature = toy.creatures[0]
    for (let f = 0; f < 1800; f++) {
      if (f % 15 === 0) { creature.rest = 0; creature.target = { x: f % 180 < 90 ? 340 : 250, y: 470 } }
      toy.step(DT); watch()
      far = Math.max(far, Math.hypot(creature.thing.x - CAST.toad.x, creature.thing.y - CAST.toad.y))
      if (creature.body.speed > 20) ran++
    }
    expect(far).toBeLessThan(320)
    expect(ran).toBeGreaterThan(300)
    expect(starts).toBe(1)
  })
})

describe('the toad croaks once for a slitherer', () => {
  const croaks = (toy: Toy, seconds: number): number => play(toy, seconds).filter((key) => key === 'croak').length

  it('croaks once when a slitherer comes near and rests there, not again and again, and once more when it has been away and comes back', () => {
    const { toy, creature } = standing(['willow', 'willow', 'cap', 'cap'], 620, 440)
    expect(croaks(toy, 5)).toBe(0)
    // It comes to rest beside the toad.
    creature.thing.x = 300; creature.thing.y = 440
    expect(croaks(toy, 40)).toBe(1)
    expect(toy.cast.toad.again).toBe(0)
    creature.thing.x = 760
    expect(croaks(toy, 5)).toBe(0)
    creature.thing.x = 300
    expect(croaks(toy, 30)).toBe(1)
  })

  it('has had its say about a slitherer by the end of its waking, and says nothing about one it is found beside', () => {
    const toy = toyOf(clearing([thing(1, 300, 440, ['willow', 'willow', 'cap'])]))
    tapHeap(toy, 'cap')
    const sounds = play(toy, 1)
    for (let f = 0; f < 600 && toy.scene; f++) { toy.step(DT); sounds.push(...heard(toy)) }
    expect(sounds.filter((key) => key === 'croak')).toHaveLength(1)
    expect(toy.creatures).toHaveLength(1)
    // It stays where its waking left it, beside the toad: nothing more is said.
    const creature = toy.creatures[0]
    creature.target = null; creature.rest = 999
    expect(Math.hypot(creature.thing.x - CAST.toad.x, creature.thing.y - CAST.toad.y)).toBeLessThan(260)
    expect(croaks(toy, 30)).toBe(0)
    const found = again(toy)
    found.touched = true
    found.creatures[0].rest = 999
    expect(croaks(found, 30)).toBe(0)
  })
})

/** The frames of a lift from a heap, written down: one frame a step for `seconds`. */
function lifting(toy: Toy, seconds: number): string[][] {
  const pen = new RecordingPen(), painter = new Painter(), all: string[][] = []
  for (let f = 0; f < Math.round(seconds / DT); f++) { toy.step(DT); pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter); all.push(pen.log.filter((line) => line.startsWith('|stamp|')).map((line) => line.split('|')[2])) }
  return all
}

describe('each kind is lifted in its own way', () => {
  it('flips a maple wing over to its pale side and back as it is lifted, and never again in the carry', () => {
    const toy = toyOf(clearing([]))
    toy.press(HEAPS.maple.x, HEAPS.maple.y)
    const frames = lifting(toy, LIFT + 1)
    const side = frames.map((stamps) => (stamps.some((stamp) => stamp.startsWith(`${PALE},`)) ? 'pale' : stamps.some((stamp) => /^maple-\d,/.test(stamp)) ? 'red' : 'none'))
    expect(side).not.toContain('none')
    const lift = Math.round(LIFT / DT)
    // Red, then pale, then red again, inside the lift; red ever after.
    expect(side.slice(0, lift).join(' ')).toMatch(/^(red )+(pale )+(red ?)+$/)
    expect(side.slice(lift)).not.toContain('pale')
    // Never the two sides at once.
    for (const stamps of frames) expect(stamps.filter((stamp) => /^maple-(\d|pale),/.test(stamp))).toHaveLength(1)
    toy.cancel()
  })

  it('unrolls a willow leaf from its stem as it is lifted: short at first, its stem end where the finger holds it, then its full length', () => {
    const toy = toyOf(clearing([]))
    toy.press(HEAPS.willow.x, HEAPS.willow.y)
    const frames = lifting(toy, LIFT + 0.5).map((stamps) => stamps.find((stamp) => /^willow-\d,/.test(stamp))!.split(',').map(Number))
    const lift = Math.round(LIFT / DT)
    // [key, x, y, turn, along, across]
    const along = frames.map((stamp) => stamp[4])
    expect(along[0]).toBeLessThan(0.5)
    for (let f = 1; f < lift - 1; f++) expect(along[f] - along[f - 1], `frame ${f}`).toBeGreaterThan(-0.06)
    expect(along[lift + 5]).toBeGreaterThan(1)
    // The stem end: back along the leaf from its middle by half its drawn length.
    const stem = (stamp: number[]): { x: number; y: number } => ({ x: stamp[1] - Math.cos(stamp[3]) * (SHAPES.willow.long / 2) * stamp[4], y: stamp[2] - Math.sin(stamp[3]) * (SHAPES.willow.long / 2) * stamp[4] })
    const rolled = stem(frames[0]), open = stem(frames[lift + 5])
    // It hangs by its stem above the heap from the first frame to the last: unrolling moves the tip, not the stem.
    expect(Math.abs(rolled.x - open.x)).toBeLessThan(6)
    expect(Math.abs(rolled.y - open.y)).toBeLessThan(30)
    toy.cancel()
  })

  it('has two fellows roll out of the heap after a seed as it is lifted and fall back, and none after a seed lifted from the earth', () => {
    const toy = toyOf(clearing([]))
    toy.press(HEAPS.seed.x, HEAPS.seed.y)
    const seeds = lifting(toy, LIFT + 0.5).map((stamps) => stamps.filter((stamp) => /^seed-\d,/.test(stamp)).length)
    const lift = Math.round(LIFT / DT)
    expect(seeds.slice(0, lift - 1).every((n) => n === 3)).toBe(true)
    expect(seeds.slice(lift + 1).every((n) => n === 1)).toBe(true)
    toy.cancel()
    const lying = toyOf(clearing([thing(1, 590, 420, ['seed'])]))
    lying.press(590, 420)
    expect(lying.hand?.from).not.toBeNull()
    expect(lifting(lying, 0.2).every((stamps) => stamps.filter((stamp) => /^seed-\d,/.test(stamp)).length === 1)).toBe(true)
    lying.cancel()
  })
})

describe('one round leaf with its eyes on it', () => {
  const wheel = (parts: SavedThing['parts']): { toy: Toy; creature: Creature } => {
    const toy = toyOf(clearing([{ id: 1, x: 590, y: 440, turn: 0, awake: true, woke: 1, drowsy: false, bedded: false, parts }]))
    toy.creatures[0].rest = 999
    return { toy, creature: toy.creatures[0] }
  }
  const leaf = { kind: 'round' as const, x: 0, y: 0, turn: 0 }, eyes = [{ kind: 'cap' as const, x: -22, y: -4, turn: 0 }, { kind: 'cap' as const, x: 26, y: 4, turn: 0 }]

  it('carries the eyes round with the wheel: each keeps its place on the leaf as the leaf turns', () => {
    const { creature } = wheel([leaf, ...eyes])
    expect(wheelOf(creature)).toBe(creature.thing.parts[0])
    const middle = drawnAt(creature, 0), before = [drawnAt(creature, 1), drawnAt(creature, 2)]
    creature.body.spin = Math.PI / 2
    const after = [drawnAt(creature, 1), drawnAt(creature, 2)]
    for (const k of [0, 1]) {
      // A quarter turn about the middle of the leaf.
      expect(after[k].x - middle.x).toBeCloseTo(-(before[k].y - middle.y), 5)
      expect(after[k].y - middle.y).toBeCloseTo(before[k].x - middle.x, 5)
    }
    // The leaf's own middle does not move.
    expect(drawnAt(creature, 0)).toEqual(middle)
  })

  it('leaves the eyes where they are on a creature with two wheels, or with anything else on it, and an eye that is not on the leaf', () => {
    for (const parts of [[leaf, { ...leaf, x: 90 }, ...eyes], [leaf, { kind: 'twig' as const, x: 70, y: 0, turn: 0 }, ...eyes]]) {
      const { creature } = wheel(parts)
      expect(wheelOf(creature)).toBeNull()
      const before = drawnAt(creature, parts.length - 1)
      creature.body.spin = Math.PI / 2
      expect(drawnAt(creature, parts.length - 1)).toEqual(before)
    }
    const { creature } = wheel([leaf, eyes[0], { kind: 'cap' as const, x: 90, y: 0, turn: 0 }])
    const off = drawnAt(creature, 2)
    creature.body.spin = Math.PI / 2
    expect(drawnAt(creature, 2)).toEqual(off)
  })

  it('rolls with its eyes going round, and stops dizzy', () => {
    const { toy, creature } = wheel([leaf, ...eyes])
    const places = new Set<string>()
    creature.rest = 0; creature.target = { x: 300, y: 440 }
    let dizzy = 0
    for (let f = 0; f < 600; f++) {
      toy.step(DT)
      const eye = drawnAt(creature, 1), middle = drawnAt(creature, 0)
      places.add(`${Math.round(Math.atan2(eye.y - middle.y, eye.x - middle.x) * 4)}`)
      dizzy = Math.max(dizzy, creature.dizzy)
    }
    // The eye has been all the way round the leaf.
    expect(places.size).toBeGreaterThan(20)
    expect(dizzy).toBeGreaterThan(1)
  })
})

describe('a feathered creature that was bowled over smooths itself crossly', () => {
  it('turns its back and draws its feathers in flat and lets them out again, stroke after stroke, each one heard, and is then as it was', () => {
    const { toy, creature } = standing(['feather', 'feather', 'feather', 'cap', 'cap'])
    bowlOver(creature, 1, 0, 60)
    const facing = creature.thing.turn
    for (let f = 0; f < 200 && creature.tumble; f++) toy.step(DT)
    expect(creature.tumble).toBeNull()
    expect(creature.cross).toBeCloseTo(CROSS, 1)
    heard(toy)
    let dips = 0, flat = false, least = 0
    const fans: string[] = []
    const tip = drawnAt(creature, 0)
    let moved = 0
    for (let f = 0; f < Math.round((CROSS + 0.2) / DT); f++) {
      toy.step(DT)
      fans.push(...heard(toy).filter((key) => key === 'fan'))
      least = Math.min(least, creature.body.fan)
      if (creature.body.fan < -0.4 && !flat) { flat = true; dips++ }
      if (creature.body.fan > -0.1) flat = false
      const now = drawnAt(creature, 0)
      moved = Math.max(moved, Math.hypot(now.x - tip.x, now.y - tip.y))
    }
    expect(dips).toBe(SMOOTHS)
    expect(fans.length).toBeGreaterThanOrEqual(SMOOTHS - 1)
    expect(least).toBeLessThan(-0.6)
    // Its back is turned.
    expect(Math.abs(Math.abs(creature.thing.turn - facing) - Math.PI)).toBeLessThan(0.2)
    // And afterwards its feathers are out as they were.
    play(toy, 0.3)
    expect(creature.cross).toBe(0)
    expect(creature.body.fan).toBeGreaterThanOrEqual(0)
    expect(moved).toBeGreaterThan(3)
  })

  it('does nothing of the kind to a creature with no feather', () => {
    const { toy, creature } = standing(['twig', 'twig', 'cap', 'cap'])
    bowlOver(creature, 1, 0, 60)
    play(toy, 4)
    expect(creature.cross).toBe(0)
    expect(creature.body.fan).toBeGreaterThanOrEqual(0)
  })
})

describe('the limits are answered', () => {
  it('shakes a full thing that was never woken when one part too many is pressed on to it: the parts nearest ring out as if just pressed on', () => {
    const toy = toyOf(clearing([thing(1, 500, 400, many('twig', 14))]))
    const full = toy.things[0], at = { x: full.x + 10, y: full.y + 20 }
    drag(toy, HEAPS.twig.x, HEAPS.twig.y, at.x, at.y + SHAPES.twig.r + 26 + 60, 30)
    heard(toy)
    toy.drop()
    expect(heard(toy)).toContain('back')
    expect(full.parts).toHaveLength(14)
    expect(full.parts.filter((part) => part.settle === 1)).toHaveLength(SHIVERS)
    expect(toy.air.strays.map((stray) => stray.kind)).toEqual(['twig'])
    // It is seen: those parts are drawn live while they settle.
    const pen = new RecordingPen(), painter = new Painter()
    drawFrame(pen, toy, null, TIERS[0], painter)
    toy.step(DT); pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter)
    expect(pen.keys.filter((key) => /^twig-\d/.test(key)).length).toBeGreaterThanOrEqual(SHIVERS)
  })

  it('sends home the loose part that was laid longest ago when one more than may lie about is pressed on, even when it is on the very thing that took the new one', () => {
    // Thirteen parts and an eye laid first, ten laid after them: twenty-four in all.
    const first = thing(1, 430, 380, ['seed', ...many('willow', 12), 'cap']), second = thing(2, 780, 400, many('round', 10))
    const toy = toyOf(clearing([first, second]))
    expect(toy.things.reduce((sum, one) => sum + one.parts.length, 0)).toBe(MAX_LOOSE)
    const oldest = toy.things[0].parts[0]
    expect(oldest.kind).toBe('seed')
    // The twenty-fifth goes on to the first thing, by hand.
    const on = toy.things[0], lies = { x: on.x + on.parts[1].x, y: on.y + on.parts[1].y }
    drag(toy, HEAPS.twig.x, HEAPS.twig.y, lies.x, lies.y + SHAPES.twig.r + 26 + 60, 30)
    heard(toy)
    toy.drop()
    expect(on.parts.some((part) => part.kind === 'twig')).toBe(true)
    expect(on.parts).not.toContain(oldest)
    expect(toy.things[1].parts).toHaveLength(10)
    expect(toy.air.strays.map((stray) => stray.kind)).toEqual(['seed'])
    expect(heard(toy)).toContain('puff')
    expect(toy.cast.small.blowLeft).toBeGreaterThan(0)
    expect(toy.things.reduce((sum, one) => sum + one.parts.length, 0)).toBe(MAX_LOOSE)
  })

  it('counts what is laid in this visit after what was found: the part laid first in the visit outlasts everything that was already there', () => {
    const toy = toyOf(clearing([thing(1, 430, 380, ['seed', ...many('willow', 11)]), thing(2, 780, 400, many('round', 11))]))
    // The twenty-fourth is laid now, on the second thing; the twenty-fifth too.
    for (const _ of [0, 1]) { toy.focus = toy.things[toy.things.length - 1]; tapHeap(toy, 'feather'); play(toy, 1.2) }
    expect(toy.things[0].parts.some((part) => part.kind === 'seed')).toBe(false)
    expect(toy.things.flatMap((one) => one.parts).filter((part) => part.kind === 'feather')).toHaveLength(2)
  })
})

describe('the wind children blow at every waking', () => {
  const blows = (toy: Toy, seconds: number): number => {
    let n = 0
    for (let f = 0; f < Math.round(seconds / DT); f++) { toy.step(DT); n += toy.cast.events.filter((event) => event.who === 'big' && event.what === 'blow').length }
    return n
  }

  it('blows when a wind child was tapped a moment before the second cap lands', () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig', 'cap'])]))
    tapHeap(toy, 'cap')
    for (let f = 0; f < 200 && toy.things[0].parts[3].fall > 2 * DT; f++) toy.step(DT)
    // Both of them have just been tapped and are letting their breath out.
    toy.cast.puffOnce('big'); toy.cast.puffOnce('small')
    expect(blows(toy, 1)).toBe(1)
    expect(toy.creatures).toHaveLength(1)
    expect(toy.air.gust).toBeGreaterThanOrEqual(0)
  })

  it('blows for each of two wakings that come close together', () => {
    const toy = toyOf(clearing([thing(1, 430, 420, ['willow', 'twig', 'cap']), thing(2, 760, 420, ['round', 'cap'])]))
    toy.focus = toy.things[0]
    tapHeap(toy, 'cap')
    let n = 0
    for (let f = 0; f < 200 && toy.creatures.length < 1; f++) n += blows(toy, DT)
    n += blows(toy, 0.3)
    toy.focus = toy.things[1]
    tapHeap(toy, 'cap')
    for (let f = 0; f < 200 && toy.creatures.length < 2; f++) n += blows(toy, DT)
    n += blows(toy, 1)
    expect(toy.creatures).toHaveLength(2)
    expect(n).toBe(2)
  })
})
