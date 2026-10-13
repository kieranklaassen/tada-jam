import { describe, expect, it } from 'vitest'
import { ACTS } from './acts'
import { planEvening, sailBy } from './evening'
import { FOLK, type Who } from './folk'
import { FOUND, HOLLOW, KINDS, SUPPORTS, type Kind } from './kinds'
import { build, laidOf, topOf, type Laid } from './rest'
import { freshSave, type Save } from './save'
import { SUN_AT, TICK, Toy, type Show } from './toy'
import { EVENING } from './voices'

// A sound is the sound of something seen. Every evening act is played here
// in a house that holds its cell, step by step: each sound of an act comes
// in a step in which something is seen to change, the whoosh only when a
// slab sails, the bonk only into something. The same holds by day for every
// cell of the first grid.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const day = (things: Laid[]): Save => ({ ...freshSave(7), things: laidOf(build(things)) })
function sunset(toy: Toy): void {
  toy.press(SUN_AT.x, SUN_AT.y)
  toy.dragStart()
  toy.dragMove(SUN_AT.x, SUN_AT.under)
  toy.drop()
  toy.sounds.length = 0
}

/** One house for each act of the second grid, and for a house with none of a folk's things. */
const HOUSES: Record<string, Laid[]> = {
  'rug, bath and broom': [{ id: idOf('leaf'), x: 560 }, { id: idOf('cap'), x: 700 }, { id: idOf('feather'), x: 800 }],
  'bed, cradle and quilt': [{ id: idOf('moss'), x: 560 }, { id: idOf('leaf'), x: 560 }, { id: idOf('moss', 1), x: 680 }, { id: idOf('cap'), x: 680 }, { id: idOf('moss', 2), x: 790 }, { id: idOf('feather'), x: 790 }],
  // On the floor, where the leaf has room to lean down from its stone: on the root step it would lie flat, and be no slide.
  'slide and lamp': [{ id: idOf('pebble'), x: 540 }, { id: idOf('leaf'), x: 550 }, { id: idOf('pebble', 1), x: 720 }, { id: idOf('cap'), x: 720 }],
  'a tickler': [{ id: idOf('pebble'), x: 640 }, { id: idOf('feather'), x: 646 }],
  'roof, bell and flag': [{ id: idOf('twig'), x: 560 }, { id: idOf('twig', 1), x: 620 }, { id: idOf('leaf'), x: 590 }, { id: idOf('twig', 2), x: 720 }, { id: idOf('cap'), x: 720 }, { id: idOf('twig', 3), x: 800 }, { id: idOf('feather'), x: 802 }],
  'tablecloth, bowl and a dry sail': [{ id: idOf('bark'), x: 600 }, { id: idOf('leaf'), x: 600 }, { id: idOf('bark', 1), x: 770 }, { id: idOf('cap'), x: 730 }, { id: idOf('feather'), x: 800 }],
  'a bath on the step and a sail on the floor it floods': [{ id: idOf('cap'), x: 440 }, { id: idOf('bark'), x: 590 }, { id: idOf('feather'), x: 610 }],
  'a lamp with a stool in its way': [{ id: idOf('pebble'), x: 600 }, { id: idOf('cap'), x: 600 }, { id: idOf('pebble', 1), x: 760 }],
  'none of their things': [{ id: idOf('pebble'), x: 640 }],
}

type Step = { tick: number; before: Show; after: Show; sounds: string[]; voices: unknown[] }

/** Watches a scene to its end, and returns every step in which a sound was queued, with the frame before it and the frame of it. */
function watched(toy: Toy): Step[] {
  const steps: Step[] = []
  let tick = 0
  const copy = (show: Show): Show => JSON.parse(JSON.stringify(show)) as Show
  let before = copy(toy.show(null))
  while (toy.playing && tick < 60 / TICK) {
    const from = toy.sounds.length
    toy.step(TICK)
    tick += 1
    const after = copy(toy.show(null))
    if (toy.sounds.length > from) steps.push({ tick, before, after, sounds: toy.sounds.slice(from).map((sound) => sound.from), voices: toy.sounds.slice(from).map((sound) => sound.voice) })
    before = after
  }
  return steps
}

/** Whether the house is seen to change between two frames: a thing, a puff or the spilt water. */
const houseChanged = (a: Show, b: Show): boolean => JSON.stringify([a.things, a.front, a.puffs.length, a.spill === null]) !== JSON.stringify([b.things, b.front, b.puffs.length, b.spill === null])
/** Whether one of the three is seen to move between two frames: where it stands, or any part of its pose, by more than a spring's last tremble. */
function folkMoved(a: Show, b: Show, who: Who): boolean {
  const stand = Math.abs(a.stand[who].x - b.stand[who].x) + Math.abs(a.stand[who].y - b.stand[who].y) + Math.abs(a.stand[who].turn - b.stand[who].turn) * 60
  const pa = a.folk[who], pb = b.folk[who]
  const pose = Math.abs(pa.lean - pb.lean) / 10 + Math.abs(pa.bob - pb.bob) * 10 + Math.abs(pa.part - pb.part) + Math.abs(pa.prop - pb.prop) + Math.abs(pa.open - pb.open) + Math.abs(pa.lid - pb.lid) + Math.abs(pa.wide - pb.wide) + Math.abs(pa.brow - pb.brow)
  return stand > 0.05 || pose > 0.004 || pa.mouth !== pb.mouth
}
const actorOf = (from: string): Who | null => {
  const name = from.slice(4)
  if (name in ACTS) return ACTS[name as keyof typeof ACTS].who
  if (name === 'snort' || name === 'wet') return 'fat'
  if (name.startsWith('wake ')) return name.slice(5) as Who
  return null
}

describe('a sound is the sound of something seen: at evening', () => {
  it('plays every act of the second grid in these houses', () => {
    const played = new Set(Object.values(HOUSES).flatMap((things) => planEvening(laidOf(build(things)), [], []).parts.map((part) => part.act)))
    expect([...played].sort()).toEqual(Object.keys(ACTS).sort())
  })

  it.each(Object.entries(HOUSES))('in a house with %s, every sound of an act comes in a step in which its cause is seen', (_, things) => {
    const toy = new Toy(day(things), 3)
    sunset(toy)
    const steps = watched(toy)
    let acts = 0
    for (const step of steps) for (const from of step.sounds) {
      if (!from.startsWith('act ')) continue
      acts += 1
      const who = actorOf(from)
      const seen = houseChanged(step.before, step.after) || (who !== null && folkMoved(step.before, step.after, who)) || (from === 'act heap' && FOLK.some((one) => folkMoved(step.before, step.after, one)))
      expect(seen, `${from} at step ${step.tick}`).toBe(true)
    }
    expect(acts).toBeGreaterThan(2)
    // And the morning after: every yawn, snap and hop as the one who makes it is seen to wake.
    toy.press(SUN_AT.x, SUN_AT.setY)
    toy.dragStart()
    toy.dragMove(SUN_AT.x, SUN_AT.y)
    toy.drop()
    toy.sounds.length = 0
    for (const step of watched(toy)) for (const from of step.sounds) {
      if (!from.startsWith('act ')) continue
      const who = actorOf(from)
      expect(houseChanged(step.before, step.after) || (who !== null && folkMoved(step.before, step.after, who)), `morning ${from}`).toBe(true)
    }
  })

  it('whooshes only when a slab sails: over dry ground the tidy one polishes, and nothing sails and nothing is heard to', () => {
    const dry = new Toy(day(HOUSES['tablecloth, bowl and a dry sail']), 3)
    sunset(dry)
    const slab = idOf('bark', 1)
    const at = (toy: Toy): number => [...toy.show(null).things, ...toy.show(null).front].find((thing) => thing.id === slab)!.x
    const from = at(dry)
    const quiet = watched(dry)
    expect(quiet.some((step) => step.voices.includes(EVENING.sailOff))).toBe(false)
    expect(quiet.filter((step) => step.voices.includes(EVENING.squeak))).toHaveLength(3)
    expect(at(dry)).toBe(from)
    // Over ground a bath has spilt on this evening it sails, and the whoosh comes in the step the slab sets off.
    const wet = new Toy(day(HOUSES['a bath on the step and a sail on the floor it floods']), 3)
    sunset(wet)
    const bark = idOf('bark')
    const where = (show: Show): number => [...show.things, ...show.front].find((thing) => thing.id === bark)!.x
    const heard = watched(wet).filter((step) => step.voices.includes(EVENING.sailOff))
    expect(heard).toHaveLength(1)
    expect(where(heard[0].after)).not.toBe(where(heard[0].before))
    // The tidy one starts at it: only then are its eyes wide.
    expect(heard[0].after.folk.tidy.wide).toBeGreaterThanOrEqual(1)
    expect(wet.show(null).things.find((thing) => thing.id === bark)!.x).not.toBe(590)
  })

  it('stands the tidy one on the slab, beside the sail, while it polishes and while it sails', () => {
    for (const name of ['tablecloth, bowl and a dry sail', 'a bath on the step and a sail on the floor it floods']) {
      const toy = new Toy(day(HOUSES[name]), 3)
      const plan = planEvening(laidOf(build(HOUSES[name])), [], [])
      const part = plan.parts.find((p) => p.act === 'sail')!
      const feather = part.thing!
      const slabId = build(HOUSES[name]).find((rest) => rest.id === feather)!.under[0]
      sunset(toy)
      let polishing = 0, since = 0
      while (toy.playing) {
        toy.step(TICK)
        const show = toy.show(null)
        // From its first squeak for a second and a half: it polishes, and where the slab sails it rides.
        if (!toy.sounds.some((sound) => sound.from === 'act sail') || ++since > 1.5 / TICK) continue
        const all = [...show.things, ...show.front]
        const sail = all.find((thing) => thing.id === feather)!
        const slab = toy.rested.find((rest) => rest.id === slabId)!
        const shown = all.find((thing) => thing.id === slab.id)!
        const stand = show.stand.tidy
        // Its feet are on the slab's upper face, within the slab's length, and clear of the sail.
        expect(Math.abs(stand.x - shown.x), name).toBeLessThanOrEqual(slab.w / 2)
        polishing += 1
        expect(Math.abs(stand.y - (shown.y - slab.h)), name).toBeLessThan(26)
        expect(stand.y, name).toBeGreaterThan(topOf(slab) - 30)
        // Its hat is under the arch: it does not stand half a feather's height in the air.
        expect(stand.y - 330 * stand.scale, name).toBeGreaterThan(HOLLOW.floorY - HOLLOW.archRy)
        expect(Math.abs(stand.x - sail.x), name).toBeGreaterThan(20)
      }
      expect(polishing, name).toBeGreaterThan(150)
    }
  })

  it('walks the tiny one, the lamp over its eyes, into something: the bonk comes in the step it reaches a thing that gives, or the wall', () => {
    for (const [name, into] of [['a lamp with a stool in its way', idOf('pebble', 1)], ['slide and lamp', null]] as const) {
      const toy = new Toy(day(HOUSES[name]), 3)
      sunset(toy)
      const steps = watched(toy)
      const bonk = steps.find((step) => step.voices.includes(EVENING.bonk))!
      expect(bonk, name).toBeDefined()
      const stand = bonk.after.stand.tiny
      const half = 42 * stand.scale
      // What is nearest to it on its ground, in the way it walked.
      const walked = Math.sign(stand.x - bonk.before.stand.tiny.x) || 1
      const things = toy.rested.filter((rest) => rest.on === 'ground' && (rest.x - stand.x) * walked > 0 && rest.kind !== 'cap')
      const gaps = things.map((rest) => Math.abs(rest.x - stand.x) - rest.w / 2 - half)
      const wall = walked === 1 ? HOLLOW.right - stand.x - half : stand.x - Math.max(HOLLOW.left, stand.x < HOLLOW.stepRight ? HOLLOW.left : HOLLOW.stepRight) - half
      // It is touching the nearest of them, and has not walked into it.
      const nearest = Math.min(wall, ...gaps)
      expect(Math.abs(nearest), name).toBeLessThan(12)
      if (into !== null) {
        // The thing it walked into gives in that step or the next.
        const sy = (show: Show): number => show.things.find((thing) => thing.id === into)!.sy
        expect(sy(bonk.after) !== sy(bonk.before) || toy.rested.some((rest) => rest.id === into), name).toBe(true)
      }
    }
  })

  it('gets the tiny one into every acorn cap, and wets the fat one in the step the water reaches its bed', () => {
    // A cradle to the right of a bath: both are got into.
    const toy = new Toy(day([{ id: idOf('moss'), x: 720 }, { id: idOf('cap'), x: 720 }, { id: idOf('cap', 1), x: 580 }]), 3)
    sunset(toy)
    const inCap = new Set<number>()
    while (toy.playing) {
      toy.step(TICK)
      const show = toy.show(null)
      for (const thing of show.front) if (thing.kind === 'cap' && Math.abs(show.stand.tiny.x - thing.x) < 12) inCap.add(thing.id)
    }
    expect([...inCap].sort()).toEqual([idOf('cap'), idOf('cap', 1)])
    expect(toy.toSave().asleep.find((entry) => entry.who === 'tiny')!.on).toBe(idOf('cap'))
    // A bath on the root step above a bed: the fat one grumbles as its bed is soaked, and sleeps on with a pout.
    const wet = new Toy(day([{ id: idOf('cap'), x: 430 }, { id: idOf('moss'), x: 560 }, { id: idOf('leaf'), x: 560 }]), 3)
    sunset(wet)
    const steps = watched(wet)
    const grumble = steps.find((step) => step.sounds.includes('act wet'))!
    const soaked = (show: Show): boolean => [...show.things, ...show.front].find((thing) => thing.id === idOf('leaf'))!.wet
    expect(soaked(grumble.before)).toBe(false)
    expect(soaked(grumble.after)).toBe(true)
    for (let i = 0; i < 120; i++) wet.step(TICK)
    expect(wet.show(null).folk.fat.mouth).toBe('pout')
    const loaded = new Toy(wet.toSave(), 9)
    for (let i = 0; i < 120; i++) loaded.step(TICK)
    expect(loaded.show(null).folk.fat.mouth).toBe('pout')
    // In a dry bed it snores with its mouth open.
    const dryBed = new Toy(day([{ id: idOf('moss'), x: 560 }, { id: idOf('leaf'), x: 560 }]), 3)
    sunset(dryBed)
    watched(dryBed)
    for (let i = 0; i < 120; i++) dryBed.step(TICK)
    expect(dryBed.show(null).folk.fat.mouth).toBe('o')
  })
})

describe('a sound is the sound of something seen: by day', () => {
  it('sounds every knock of every cell in a step in which that thing is seen to move', () => {
    let knocks = 0
    for (const kind of KINDS) for (const on of SUPPORTS) {
      const laid: Laid[] = on === 'ground' ? [] : [{ id: idOf(on, 0), x: 640 }]
      const id = idOf(kind, kind === on ? 1 : 0)
      const toy = new Toy({ ...freshSave(7), things: laid }, 3)
      toy.press(FOUND[id].home.x, FOUND[id].home.y - 8)
      toy.dragStart()
      toy.dragMove(652, 420)
      for (let i = 0; i < 30; i++) toy.step(TICK)
      toy.drop()
      toy.sounds.length = 0
      const lie = (): string => JSON.stringify(toy.show(null).things.find((thing) => thing.id === id))
      let before = lie()
      for (let i = 0; i < 6 / TICK; i++) {
        const from = toy.sounds.length
        toy.step(TICK)
        const after = lie()
        for (const sound of toy.sounds.slice(from)) if (sound.from === `knock ${id}`) {
          knocks += 1
          expect(after, `${kind} on ${on}`).not.toBe(before)
        }
        before = after
      }
    }
    expect(knocks).toBeGreaterThan(70)
  })
})

describe('a slab that cannot sail', () => {
  it('does not sail where neither way is free, and then nothing is heard to', () => {
    const shut: Laid[] = [{ id: idOf('cap'), x: 440 }, { id: idOf('pebble'), x: 530 }, { id: idOf('bark'), x: 650 }, { id: idOf('feather'), x: 650 }, { id: idOf('pebble', 1), x: 770 }]
    const house = build(shut)
    const slab = house.find((rest) => rest.id === idOf('bark'))!
    expect(sailBy(house, slab)).toBe(0)
    expect(planEvening(laidOf(house), [], []).parts.at(-1)).toMatchObject({ act: 'sail', sails: null })
    const toy = new Toy(day(shut), 3)
    sunset(toy)
    expect(watched(toy).some((step) => step.voices.includes(EVENING.sailOff))).toBe(false)
  })
})
