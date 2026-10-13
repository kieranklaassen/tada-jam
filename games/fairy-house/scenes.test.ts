import { describe, expect, it } from 'vitest'
import { FOLK, PERSONALITY } from './folk'
import { FOUND, HOLLOW, type Kind } from './kinds'
import { planEvening } from './evening'
import { build, laidOf, type Laid } from './rest'
import { deserialize, freshSave, serialize, type Save } from './save'
import { INSIDE, SUN_AT, TICK, Toy, type Show, type ShownThing } from './toy'
import { EVENING, SUNRISE, SUNSET } from './voices'

// The evening and the morning: what calls each, what each saves when it
// starts, how a touch ends it, and how the game is found again. Touches go in
// as stage points and time as seconds; there is no canvas.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const day = (things: Laid[], age: number | null = 7): Save => ({ ...freshSave(age), things: laidOf(build(things)) })
/** A house with a roof on two twigs over a bath on the root step, a bed on the floor below it, and a lamp. */
const FULL: Laid[] = [
  { id: idOf('cap', 0), x: 422 }, { id: idOf('twig', 0), x: 392 }, { id: idOf('twig', 1), x: 452 }, { id: idOf('leaf', 0), x: 422 },
  { id: idOf('moss', 0), x: 560 }, { id: idOf('leaf', 1), x: 560 },
  { id: idOf('pebble', 0), x: 648 }, { id: idOf('cap', 1), x: 648 },
]
const run = (toy: Toy, seconds: number): void => { for (let i = 0; i < Math.round(seconds / TICK); i++) toy.step(TICK) }
/** Plays until no scene is playing, and returns how long that took. */
function watch(toy: Toy): number {
  let seconds = 0
  while (toy.playing && seconds < 60) {
    toy.step(TICK)
    seconds += TICK
  }
  return seconds
}
/** The sun taken hold of and dragged to a height. The finger is still down. */
function holdSun(toy: Toy, toY: number): void {
  const from = toy.show(null).sun.y
  toy.press(SUN_AT.x, from)
  toy.dragStart()
  for (let i = 1; i <= 10; i++) {
    toy.dragMove(SUN_AT.x, from + ((toY - from) * i) / 10)
    toy.step(TICK * 2)
  }
}
const sunset = (toy: Toy): void => { holdSun(toy, SUN_AT.under); toy.drop() }
const sunrise = (toy: Toy): void => { holdSun(toy, SUN_AT.y); toy.drop() }
/** A game at evening, the scene watched to its end. */
function atEvening(things: Laid[] = FULL, seed = 3): Toy {
  const toy = new Toy(day(things), seed)
  sunset(toy)
  watch(toy)
  toy.sounds.length = 0
  toy.dirty = 'no'
  return toy
}
const stored = (toy: Toy): unknown => JSON.parse(JSON.stringify(serialize(toy.toSave())))
/** What of a frame is the state of the game, and not the wood's own life (the moth, the snail, the clock). */
function settled(show: Show): unknown {
  const { things, front, shadow, folk, stand, inside, dusk, puffs, spill, hand, glow } = show
  return JSON.parse(JSON.stringify({ things, front, shadow, folk, stand, inside, dusk, puffs, spill, hand, glow, sun: { y: show.sun.y, bob: show.sun.bob, glows: show.sun.glows }, owl: show.owl.duck, snail: show.snail.hidden }))
}
const froms = (toy: Toy): string[] => toy.sounds.map((sound) => sound.from)

describe('the sun', () => {
  it('rings and bobs when it is tapped, and nothing else happens', () => {
    const toy = new Toy(day(FULL), 1), before = toy.toSave()
    toy.press(SUN_AT.x, SUN_AT.y)
    expect(froms(toy)).toEqual(['sun'])
    toy.release()
    run(toy, 1)
    expect(toy.toSave()).toEqual(before)
    expect(toy.evening).toBe(false)
    expect(toy.playing).toBe(false)
    expect(toy.dirty).toBe('no')
  })

  it('takes the light with it as it is dragged: the dusk follows its height', () => {
    const toy = new Toy(day(FULL), 1)
    holdSun(toy, (SUN_AT.y + SUN_AT.setY) / 2)
    expect(toy.show(null).dusk).toBeCloseTo(0.5, 1)
    expect(toy.evening).toBe(false)
    toy.cancel()
  })

  it('starts the evening when it is let go below the hill, and saves the whole evening in that call', () => {
    const toy = new Toy(day(FULL), 1)
    const plan = planEvening(toy.toSave().things, [], [])
    holdSun(toy, SUN_AT.under)
    expect(toy.dirty).toBe('no')
    toy.sounds.length = 0
    toy.drop()
    expect(froms(toy)).toEqual(['sun'])
    expect(toy.dirty).toBe('now')
    expect(toy.playing).toBe(true)
    expect(toy.toSave()).toMatchObject({ finished: true, things: plan.things, snapped: plan.snapped, soaked: plan.soaked, asleep: plan.asleep })
  })

  it('goes back by itself when it is let go above the hill, and nothing has changed', () => {
    const toy = new Toy(day(FULL), 1), before = toy.toSave()
    holdSun(toy, SUN_AT.y + 60)
    toy.drop()
    expect(toy.playing).toBe(false)
    run(toy, 2)
    expect(toy.show(null).sun.y).toBeCloseTo(SUN_AT.y, 0)
    expect(toy.toSave()).toEqual(before)
    expect(toy.dirty).toBe('no')
  })
})

describe('pointer cancel never acts for the child', () => {
  it('starts no evening when the sun is dragged below the hill and the drag is taken away', () => {
    const toy = new Toy(day(FULL), 1), before = toy.toSave()
    holdSun(toy, SUN_AT.under)
    toy.cancel()
    expect(toy.playing).toBe(false)
    expect(toy.evening).toBe(false)
    expect(toy.dirty).toBe('no')
    run(toy, 2)
    expect(toy.toSave()).toEqual(before)
    expect(toy.show(null).dusk).toBeLessThan(0.02)
  })

  it('starts no morning when the sun is raised at evening and the drag is taken away', () => {
    const toy = atEvening(), before = toy.toSave()
    holdSun(toy, SUN_AT.y)
    toy.cancel()
    run(toy, 2)
    expect(toy.evening).toBe(true)
    expect(toy.toSave()).toEqual(before)
    expect(toy.dirty).toBe('no')
  })

  it('sets nothing down when a carried thing is taken away over the hollow', () => {
    const toy = new Toy(day([]), 1), pebble = FOUND[idOf('pebble')]
    toy.press(pebble.home.x, pebble.home.y - 12)
    toy.dragStart()
    toy.dragMove(640, 480)
    run(toy, 0.3)
    toy.cancel()
    run(toy, 2)
    expect(toy.toSave().things).toEqual([])
    expect(toy.dirty).toBe('no')
  })

  it('leaves no finger behind: after a press that was taken away the next press is a new one', () => {
    const toy = new Toy(day([]), 1), pebble = FOUND[idOf('pebble')]
    toy.press(SUN_AT.x, SUN_AT.y)
    toy.release()
    toy.press(pebble.home.x, pebble.home.y - 12)
    toy.release()
    toy.sounds.length = 0
    // Neither the sun nor the pebble is still in a hand: a drag now moves nothing.
    toy.dragStart()
    toy.dragMove(640, 480)
    toy.drop()
    run(toy, 1)
    expect(toy.toSave()).toEqual(day([]))
    expect(toy.busy).toBe(false)
  })
})

describe('what each scene saves when it starts', () => {
  it('the evening: the ending, the house as the three leave it, what snapped, what was soaked and where each sleeps', () => {
    const toy = new Toy(day(FULL), 1)
    sunset(toy)
    const atStart = toy.toSave()
    expect(atStart.finished).toBe(true)
    // The twigs under the roof are snapped and what the bath on the step flooded is soaked, before anything is seen.
    expect(atStart.snapped).toEqual([idOf('twig', 0), idOf('twig', 1)])
    expect(atStart.soaked).toContain(idOf('moss', 0))
    expect(atStart.asleep.map((entry) => entry.who)).toEqual(['fat', 'tidy', 'tiny'])
    expect(atStart.asleep[0]).toMatchObject({ who: 'fat', on: idOf('leaf', 1) })
    // What is shown runs behind what is saved: the twigs still stand whole on screen.
    expect(toy.show(null).things.some((thing) => thing.snapped || thing.wet)).toBe(false)
    watch(toy)
    expect(toy.toSave()).toEqual(atStart)
    expect(toy.show(null).things.filter((thing) => thing.snapped).map((thing) => thing.id)).toEqual([idOf('twig', 0), idOf('twig', 1)])
  })

  it('the morning: the day, and nobody asleep; the house, the snapped and the soaked stay as the evening left them', () => {
    const toy = atEvening(), evening = toy.toSave()
    sunrise(toy)
    expect(toy.dirty).toBe('now')
    const atStart = toy.toSave()
    expect(atStart).toEqual({ ...evening, finished: false, asleep: [] })
    watch(toy)
    expect(toy.toSave()).toEqual(atStart)
  })

  it('lasts as long as an ending may: the evening 10 to 25 seconds, the morning 5 to 8', () => {
    const fullest: Laid[] = [
      { id: idOf('leaf', 0), x: 420 }, { id: idOf('pebble', 0), x: 540 }, { id: idOf('leaf', 1), x: 550 }, { id: idOf('bark', 0), x: 760 }, { id: idOf('leaf', 2), x: 760 },
      { id: idOf('cap', 0), x: 650 }, { id: idOf('pebble', 1), x: 600 }, { id: idOf('cap', 1), x: 600 }, { id: idOf('twig', 0), x: 700 }, { id: idOf('feather', 0), x: 700 },
    ]
    for (const things of [[], FULL, fullest]) {
      const toy = new Toy(day(things), 1)
      sunset(toy)
      const evening = watch(toy)
      expect(evening, `evening of ${things.length} things`).toBeGreaterThanOrEqual(10)
      expect(evening, `evening of ${things.length} things`).toBeLessThanOrEqual(25)
      sunrise(toy)
      const morning = watch(toy)
      expect(morning).toBeGreaterThanOrEqual(5)
      expect(morning).toBeLessThanOrEqual(8)
    }
  })
})

describe('a touch ends a scene', () => {
  it('lands every beat where it was going, without its sounds, and is then an ordinary touch', () => {
    for (const after of [0.4, 2.2, 5, 9, 13]) {
      const toy = new Toy(day(FULL), 3)
      sunset(toy)
      toy.sounds.length = 0
      run(toy, after)
      // Whatever the scene queued in this very frame is dropped with it.
      toy.press(600, 150)
      expect(toy.playing, `after ${after}`).toBe(false)
      expect(toy.sceneCut).toBe(true)
      expect(toy.sounds.map((sound) => [sound.from, sound.scene]), `after ${after}`).toEqual([['wood', false]])
      toy.release()
      // The frame is the frame a load gives: a knock on the tree's bark raises no dust and leaves nothing behind.
      const loaded = new Toy(deserialize(stored(toy), 7), 3)
      const shown = toy.show(null)
      expect(shown.puffs).toHaveLength(0)
      expect(settled(shown), `after ${after}`).toEqual(settled(loaded.show(null)))
      // And nothing of the scene sounds afterwards.
      toy.sounds.length = 0
      run(toy, 6)
      expect(froms(toy)).toEqual([])
    }
  })

  it('flags the sounds of a scene that is being watched, and no other', () => {
    const toy = new Toy(day(FULL), 3)
    sunset(toy)
    // The ring of the sun as it is taken hold of belongs to that touch; the chime as it is let go is the scene's first sound.
    expect(toy.sounds.map((sound) => sound.scene)).toEqual([false, true])
    toy.sounds.length = 0
    watch(toy)
    expect(toy.sounds.length).toBeGreaterThan(12)
    expect(toy.sounds.every((sound) => sound.scene)).toBe(true)
    toy.sounds.length = 0
    toy.press(600, 150)
    expect(toy.sounds.every((sound) => !sound.scene)).toBe(true)
    expect(toy.sceneCut).toBe(false)
  })

  it('counts the chime of the sunset and of the sunrise as the first sound of its scene, and cuts it with the scene', () => {
    const toy = new Toy(day(FULL), 3)
    sunset(toy)
    expect(toy.sounds.filter((sound) => sound.voice === SUNSET).map((sound) => sound.scene)).toEqual([true])
    // A touch a moment later ends the scene: the chime goes with it, and the scene's gain is cut.
    toy.step(TICK * 6)
    toy.sceneCut = false
    toy.press(40, 40)
    expect(toy.sounds.some((sound) => sound.voice === SUNSET)).toBe(false)
    expect(toy.sceneCut).toBe(true)
    toy.release()
    toy.sounds.length = 0
    sunrise(toy)
    expect(toy.playing).toBe(true)
    expect(toy.sounds.filter((sound) => sound.voice === SUNRISE).map((sound) => sound.scene)).toEqual([true])
    toy.sceneCut = false
    toy.press(40, 40)
    expect(toy.sounds.some((sound) => sound.voice === SUNRISE)).toBe(false)
    expect(toy.sceneCut).toBe(true)
  })

  it('ends the morning the same way: the three are back at their places at once', () => {
    const toy = atEvening()
    sunrise(toy)
    run(toy, 1.6)
    toy.press(600, 150)
    toy.release()
    const show = toy.show(null)
    for (const who of FOLK) expect(show.stand[who]).toEqual({ x: PERSONALITY[who].feet.x, y: PERSONALITY[who].feet.y, turn: 0, scale: 1 })
    expect(show.inside).toEqual({ fat: false, tidy: false, tiny: false })
  })
})

describe('no scene plays on load', () => {
  it('opens on the finished evening, still, silent, with nothing pending', () => {
    const first = atEvening()
    const loaded = new Toy(deserialize(stored(first), 4), 9)
    expect(loaded.evening).toBe(true)
    expect(loaded.playing).toBe(false)
    expect(loaded.busy).toBe(false)
    expect(loaded.sounds).toEqual([])
    expect(loaded.dirty).toBe('no')
    const before = settled(loaded.show(null))
    expect(before).toMatchObject({ dusk: 1, puffs: [], spill: null, hand: null })
    run(loaded, 8)
    expect(loaded.sounds).toEqual([])
    expect(loaded.playing).toBe(false)
    expect(loaded.toSave()).toEqual(first.toSave())
    // The three lie where the state has them, each at the size it has in the hollow.
    const show = loaded.show(null)
    for (const who of FOLK) expect(show.stand[who].scale).toBe(INSIDE)
    expect(show.inside).toEqual({ fat: true, tidy: true, tiny: true })
  })

  it('opens by day after a morning, with the three at their places and no waking shown', () => {
    const first = atEvening()
    sunrise(first)
    // Put away the moment the morning starts.
    const loaded = new Toy(deserialize(stored(first), 4), 9)
    expect(loaded.evening).toBe(false)
    expect(loaded.playing).toBe(false)
    expect(loaded.sounds).toEqual([])
    run(loaded, 8)
    expect(loaded.sounds).toEqual([])
    expect(loaded.show(null).dusk).toBe(0)
  })

  it('opens an evening put away in its first second on the finished evening, not on its start', () => {
    const toy = new Toy(day(FULL), 3)
    sunset(toy)
    const loaded = new Toy(deserialize(stored(toy), 7), 3)
    watch(toy)
    run(toy, 3)
    run(loaded, 3)
    const a = toy.show(null), b = loaded.show(null)
    expect(b.things).toEqual(a.things)
    expect(b.front).toEqual(a.front)
    for (const who of FOLK) {
      expect(b.stand[who].x).toBeCloseTo(a.stand[who].x, 3)
      expect(b.stand[who].y).toBeCloseTo(a.stand[who].y, 3)
      expect(b.stand[who].turn).toBeCloseTo(a.stand[who].turn, 3)
      expect(b.stand[who].scale).toBe(a.stand[who].scale)
    }
  })
})

describe('parked equals loaded', () => {
  const pebble = FOUND[idOf('pebble', 1)]
  const states: [string, () => Toy][] = [
    ['a first visit, untouched', () => new Toy(freshSave(null), 3)],
    ['a thing under the finger', () => { const toy = new Toy(day(FULL), 3); toy.press(pebble.home.x, pebble.home.y - 12); run(toy, 0.2); return toy }],
    ['a thing in the hand over the hollow', () => { const toy = new Toy(day(FULL), 3); toy.press(pebble.home.x, pebble.home.y - 12); toy.dragStart(); toy.dragMove(600, 470); run(toy, 0.3); return toy }],
    ['a thing of the house in the hand, with what rests on it', () => { const toy = new Toy(day(FULL), 3); toy.press(560, 590); toy.dragStart(); toy.dragMove(200, 300); run(toy, 0.3); return toy }],
    ['a thing in the air', () => { const toy = new Toy(day(FULL), 3); toy.press(pebble.home.x, pebble.home.y - 12); toy.dragStart(); toy.dragMove(600, 400); run(toy, 0.2); toy.drop(); run(toy, 0.05); return toy }],
    ['a thing tumbling home', () => { const toy = new Toy(day(FULL), 3); toy.press(pebble.home.x, pebble.home.y - 12); toy.dragStart(); toy.dragMove(200, 300); run(toy, 0.2); toy.drop(); run(toy, 0.2); return toy }],
    // Found as left is by construction: a thing that slid aside stays where it came to rest once what it slid from is gone.
    ['a slab that slid aside from a leaf, and the leaf then carried off', () => {
      const toy = new Toy(day([{ id: idOf('leaf', 2), x: 580 }]), 3), bark = FOUND[idOf('bark', 0)]
      toy.press(bark.home.x, bark.home.y - 12); toy.dragStart(); toy.dragMove(680 - 0, 540 + 12); run(toy, 0.2); toy.drop(); run(toy, 2)
      toy.press(580, 598); toy.dragStart(); toy.dragMove(200, 300); run(toy, 0.2); toy.drop(); run(toy, 0.1)
      return toy
    }],
    ['a table hopping over to its one twig, the other in the hand', () => {
      const toy = new Toy(day([{ id: idOf('twig', 2), x: 600 }, { id: idOf('twig', 3), x: 660 }, { id: idOf('bark', 0), x: 630 }]), 3)
      toy.press(600, 540); toy.dragStart(); toy.dragMove(200, 300); run(toy, 0.1)
      return toy
    }],
    // A thing let go under a roof: on its way down under it, and lying there with the roof over it.
    ...[0.04, 2].map((after): [string, () => Toy] => [`a thing let go under a roof, ${after} s on`, () => {
      const toy = new Toy(day([{ id: idOf('twig', 0), x: 610 }, { id: idOf('twig', 1), x: 690 }, { id: idOf('leaf', 0), x: 650 }]), 3), cap = FOUND[idOf('cap', 0)]
      toy.press(cap.home.x, cap.home.y - 12); toy.dragStart(); toy.dragMove(650, 596); run(toy, 0.2); toy.drop(); run(toy, after)
      expect(toy.busy).toBe(after < 1)
      expect(toy.toSave().things.map((thing) => thing.id)).toEqual([idOf('twig', 0), idOf('twig', 1), cap.id, idOf('leaf', 0)])
      return toy
    }]),
    // A see-saw with a stone on its low end and moss along it, and an acorn cap just let go on its high end: the slab is turning over.
    ...[0.05, 0.6, 3].map((after): [string, () => Toy] => [`a tipped see-saw with things on it, one just set on its high end, ${after} s on`, () => {
      const toy = new Toy(day([{ id: idOf('pebble', 0), x: 640 }, { id: idOf('bark', 0), x: 654 }]), 3)
      for (const [thing, x] of [[FOUND[idOf('pebble', 1)], 644], [FOUND[idOf('cap', 0)], 596]] as const) {
        toy.press(thing.home.x, thing.home.y - 12); toy.dragStart(); toy.dragMove(x, 420); run(toy, 0.2); toy.drop()
        if (thing.kind === 'pebble') run(toy, 2.5)
      }
      run(toy, after)
      const slab = toy.rested.find((rest) => rest.kind === 'bark')!
      // In the air, then landed with the slab still turning under it, then all at rest.
      const lean = toy.show(null).things.find((thing) => thing.id === slab.id)!.angle
      expect(toy.busy).toBe(after < 0.2)
      if (after < 0.2) expect(lean).toBeGreaterThan(0.3)
      else if (after < 1) expect(Math.abs(lean)).toBeLessThan(0.3)
      else expect(lean).toBeLessThan(-0.3)
      expect(slab.lies).toBe('tipped')
      expect(slab.side).toBe(-1)
      expect(toy.rested.filter((rest) => rest.tilt !== undefined).length).toBe(2)
      return toy
    }]),
    // A slab let go where a rug is in its way: put away while it slides along to free ground.
    ...[0.08, 0.25].map((after): [string, () => Toy] => [`a thing sliding aside, ${after} s after it was let go`, () => {
      const toy = new Toy(day([{ id: idOf('leaf', 2), x: 580 }]), 3), bark = FOUND[idOf('bark', 0)]
      toy.press(bark.home.x, bark.home.y - 12); toy.dragStart(); toy.dragMove(680, 552); run(toy, 0.2); toy.drop(); run(toy, after)
      // It is on its way: aside of where it was let go, and not yet where it will lie.
      const now = [...toy.show(null).things].find((thing) => thing.id === bark.id)!, rest = toy.rested.find((r) => r.id === bark.id)!
      expect(toy.busy).toBe(true)
      expect(Math.abs(rest.x - 680)).toBeGreaterThan(20)
      expect(Math.abs(now.x - rest.x)).toBeGreaterThan(5)
      return toy
    }]),
    ['the evening standing, a fallen roof reaching over the bed the fat one sleeps in', () => atEvening([{ id: idOf('moss'), x: 560 }, { id: idOf('leaf', 0), x: 560 }, { id: idOf('twig', 0), x: 470 }, { id: idOf('twig', 1), x: 530 }, { id: idOf('leaf', 1), x: 500 }])],
    ['the sun in the hand, below the hill', () => { const toy = new Toy(day(FULL), 3); holdSun(toy, SUN_AT.under); return toy }],
    ['one of the three poked, the owl ducked, dust in the air', () => { const toy = new Toy(day(FULL), 3); toy.press(PERSONALITY.fat.eyes.x, PERSONALITY.fat.eyes.y); toy.release(); toy.press(742, 168); toy.release(); toy.press(600, 150); toy.release(); run(toy, 0.1); return toy }],
    ...[0.3, 1.5, 3.4, 6, 8.5, 11, 14, 17].map((after): [string, () => Toy] => [`the evening ${after} s under way`, () => { const toy = new Toy(day(FULL), 3); sunset(toy); run(toy, after); return toy }]),
    ['the evening standing', () => atEvening()],
    ['the evening standing, a sleeper poked and a thing hopping', () => { const toy = atEvening(); const at = toy.show(null).stand.fat; toy.press(at.x + 30, at.y - 30); toy.release(); toy.press(648, 590); toy.release(); run(toy, 0.1); return toy }],
    ['the evening standing, the sun in the hand', () => { const toy = atEvening(); holdSun(toy, SUN_AT.y + 20); return toy }],
    ...[0.2, 1.4, 2.8, 4.4].map((after): [string, () => Toy] => [`the morning ${after} s under way`, () => { const toy = atEvening(); sunrise(toy); run(toy, after); return toy }]),
    ['the day after an evening', () => { const toy = atEvening(); sunrise(toy); watch(toy); return toy }],
  ]

  it.each(states)('%s', (_, make) => {
    const toy = make()
    toy.putAway()
    // Put away, nothing is in a hand, in the air, playing or queued.
    expect(toy.busy).toBe(false)
    expect(toy.playing).toBe(false)
    expect(toy.sounds).toEqual([])
    const loaded = new Toy(deserialize(stored(toy), 7), 3)
    expect(settled(toy.show(null))).toEqual(settled(loaded.show(null)))
    expect(loaded.toSave()).toEqual(toy.toSave())
    // And it stays so: opened again, nothing moves by itself but the three breathing.
    run(toy, 1.5)
    run(loaded, 1.5)
    expect(toy.sounds).toEqual([])
    expect(toy.show(null).things).toEqual(loaded.show(null).things)
    expect(toy.playing).toBe(false)
  })

  it('puts a carried thing back where it came from, since the finger had not let go', () => {
    const toy = new Toy(day(FULL), 3), before = toy.toSave()
    toy.press(560, 590)
    toy.dragStart()
    toy.dragMove(200, 300)
    run(toy, 0.3)
    toy.putAway()
    expect(toy.toSave()).toEqual(before)
  })

  it('starts no evening for a sun that was held below the hill', () => {
    const toy = new Toy(day(FULL), 3)
    holdSun(toy, SUN_AT.under)
    toy.putAway()
    expect(toy.evening).toBe(false)
    expect(toy.show(null).dusk).toBe(0)
  })
})

describe('nothing starts or sounds on load, and no timer is full', () => {
  it.each([['by day', () => day(FULL)], ['at evening', () => atEvening().toSave()], ['on a first visit', () => freshSave(null)]] as [string, () => Save][])('%s', (_, save) => {
    const toy = new Toy(deserialize(JSON.parse(JSON.stringify(serialize(save()))), 4), 11)
    expect(toy.sounds).toEqual([])
    expect(toy.busy).toBe(false)
    expect(toy.dirty).toBe('no')
    expect(toy.sceneCut).toBe(false)
    const show = toy.show(null)
    expect(show).toMatchObject({ puffs: [], spill: null, shadow: null, hand: null, glow: 0 })
    expect(show.owl.duck).toBe(0)
    expect(show.snail.hidden).toBe(0)
    expect(show.sun.bob).toBe(0)
    // Nothing is squashed or swinging: each thing is pressed and hangs only as its lie has it (moss bulged under a bed, a flag hanging), and stays so.
    const lies = (): unknown => JSON.parse(JSON.stringify([...toy.show(null).things, ...toy.show(null).front].map((thing) => [thing.id, thing.x, thing.y, thing.angle, thing.sx, thing.sy, thing.swing])))
    const found = lies()
    for (const thing of [...show.things, ...show.front]) if (thing.kind !== 'moss' && thing.form !== 'flag') expect([thing.sx, thing.sy, thing.swing]).toEqual([1, 1, 0])
    const counts = toy.counts()
    // Two seconds in, nobody has answered anything, nothing has knocked and nothing has sounded.
    run(toy, 2)
    expect(toy.sounds).toEqual([])
    expect(toy.counts()).toEqual(counts)
    if (!toy.evening) expect(lies()).toEqual(found)
  })
})

describe('while the evening stands', () => {
  it('carries nothing in the hollow: a touch on a thing makes it hop with its own sound', () => {
    const toy = atEvening(), before = toy.toSave()
    const lamp = toy.rested.find((r) => r.cell.is === 'lamp')!
    toy.press(lamp.x, lamp.y - 12)
    expect(froms(toy)).toEqual([`lift ${lamp.id}`])
    toy.dragStart()
    toy.dragMove(200, 300)
    run(toy, 0.3)
    toy.drop()
    run(toy, 1)
    expect(toy.toSave()).toEqual(before)
    expect(toy.dirty).toBe('no')
    expect(toy.show(null).things.find((thing) => thing.id === lamp.id)).toMatchObject({ x: lamp.x, y: lamp.y })
  })

  it('carries nothing from the forest floor either', () => {
    const toy = atEvening(), before = toy.toSave()
    const moss = FOUND[idOf('moss', 2)]
    toy.press(moss.home.x, moss.home.y - 12)
    toy.dragStart()
    toy.dragMove(640, 480)
    toy.drop()
    run(toy, 1)
    expect(toy.toSave()).toEqual(before)
  })

  it('has each sleeper answer a touch as itself, where it lies, and the house is as it was', () => {
    const toy = atEvening(), before = toy.toSave()
    for (const who of FOLK) {
      const at = toy.show(null).stand[who]
      const answers = toy.counts().answers[who]
      toy.sounds.length = 0
      // A point of its body where it lies: a third of its height up from its feet, along its own turn.
      const up = PERSONALITY[who].reach.height * 0.33 * at.scale
      toy.press(at.x + Math.sin(at.turn) * up, at.y - Math.cos(at.turn) * up)
      toy.release()
      expect(froms(toy), who).toEqual([`folk ${who}`])
      expect(toy.counts().answers[who]).toBe(answers + 1)
    }
    run(toy, 3)
    expect(toy.toSave()).toEqual(before)
    expect(toy.dirty).toBe('no')
  })

  it('lets the sun be dragged, the one thing that is: raised above the hill it starts the morning', () => {
    const toy = atEvening()
    sunrise(toy)
    expect(toy.playing).toBe(true)
    expect(toy.evening).toBe(false)
    watch(toy)
    // By day the house is as the three left it, and can be changed again.
    const lamp = toy.rested.find((r) => r.cell.is === 'lamp')!
    toy.press(lamp.x, lamp.y - 12)
    toy.dragStart()
    toy.dragMove(200, 300)
    toy.drop()
    run(toy, 2)
    expect(toy.rested.some((r) => r.id === lamp.id)).toBe(false)
  })

  it('makes a snapped twig whole and a soaked thing dry once it is back on the forest floor', () => {
    const toy = atEvening()
    sunrise(toy)
    watch(toy)
    const twig = idOf('twig', 0)
    expect(toy.toSave().snapped).toContain(twig)
    const stump = toy.rested.find((r) => r.id === twig)!
    expect(stump.h).toBe(54)
    toy.press(stump.x, stump.y - 30)
    toy.dragStart()
    toy.dragMove(120, 300)
    toy.drop()
    run(toy, 2)
    expect(toy.toSave().snapped).not.toContain(twig)
    expect(toy.show(null).things.find((thing) => thing.id === twig)).toMatchObject({ snapped: false, wet: false, x: FOUND[twig].home.x })
    // Carried to another place in the hollow, a stump stays a stump.
    const other = toy.rested.find((r) => r.id === idOf('twig', 1))!
    toy.press(other.x, other.y - 30)
    toy.dragStart()
    toy.dragMove(740, 500)
    toy.drop()
    run(toy, 2)
    expect(toy.toSave().snapped).toEqual([idOf('twig', 1)])
    expect(toy.rested.find((r) => r.id === idOf('twig', 1))).toMatchObject({ h: 54, snapped: true })
  })
})

describe('the evening, as the house fills it in', () => {
  it('plays the three in the order of the sheet: the fat one, the tiny one, the tidy one', () => {
    const toy = new Toy(day(FULL), 3)
    sunset(toy)
    toy.sounds.length = 0
    watch(toy)
    const acts = froms(toy).filter((from) => from.startsWith('act ')).filter((from, index, all) => all.indexOf(from) === index)
    // The roof first (the leaf further left), then the bed; the lamp before the bath (caps from the right); the bath before the sweeping.
    // The bath on the root step spills over the bed below it, and the fat one, asleep there, grumbles at the wet.
    expect(acts).toEqual(['act roof', 'act bed', 'act lamp', 'act bath', 'act wet', 'act noFeather', 'act heap'])
  })

  it('sets the lamp back on its stone when the tiny one has worn it', () => {
    const toy = new Toy(day([{ id: idOf('pebble'), x: 648 }, { id: idOf('cap'), x: 648 }]), 3)
    const lamp = toy.rested[1]
    sunset(toy)
    let worn = false
    while (toy.playing) {
      toy.step(TICK)
      const show = toy.show(null)
      if (show.front.some((thing) => thing.id === lamp.id && Math.abs(thing.x - lamp.x) > 20)) worn = true
    }
    // It was on the tiny one's head and away from the stone, and is back where it rests.
    expect(worn).toBe(true)
    expect(toy.show(null).things.find((thing) => thing.id === lamp.id)).toMatchObject({ x: lamp.x, y: lamp.y, form: 'down', extra: 'glow' })
    expect(toy.toSave().things).toEqual(laidOf([toy.rested[0], lamp]))
  })

  /** Watches an evening and returns, for each crack heard, the step it came in and how many twigs were shown snapped before and after that step. */
  function cracks(toy: Toy): { step: number; before: number; after: number }[] {
    const heard: { step: number; before: number; after: number }[] = []
    const snapped = (): number => toy.show(null).things.filter((thing) => thing.snapped).length
    sunset(toy)
    toy.sounds.length = 0
    let steps = 0
    while (toy.playing) {
      const before = snapped(), sounds = toy.sounds.length
      toy.step(TICK)
      steps += 1
      for (const sound of toy.sounds.slice(sounds)) if (sound.voice === EVENING.crack || sound.voice === EVENING.crackLow) heard.push({ step: steps, before, after: snapped() })
    }
    return heard
  }

  it('cracks once for each twig that snaps, in the step it snaps, one after the other; and not at all when nothing snaps', () => {
    const roof: Laid[] = [{ id: idOf('twig', 0), x: 600 }, { id: idOf('twig', 1), x: 700 }, { id: idOf('leaf', 0), x: 650 }]
    const toy = new Toy(day(roof), 3)
    const first = cracks(toy)
    // Two twigs: two cracks, each in the step one more twig is seen snapped, a good few steps apart.
    expect(first.map(({ before, after }) => [before, after])).toEqual([[0, 1], [1, 2]])
    expect(first[1].step - first[0].step).toBeGreaterThan(30)
    expect(toy.toSave().snapped).toEqual([idOf('twig', 0), idOf('twig', 1)])
    // The next evening the roof lies on two stumps: the fat one climbs on and sits, and nothing cracks.
    sunrise(toy)
    watch(toy)
    expect(toy.rested.find((rest) => rest.kind === 'leaf')?.cell.is).toBe('roof')
    const second = cracks(toy)
    expect(second).toEqual([])
    expect(froms(toy).filter((from) => from === 'act roof')).toHaveLength(1)
    // A parasol on one twig: one crack.
    const parasol = cracks(new Toy(day([{ id: idOf('twig', 0), x: 640 }, { id: idOf('leaf', 0), x: 640 }]), 3))
    expect(parasol.map(({ before, after }) => [before, after])).toEqual([[0, 1]])
  })

  it('draws a roof that came down beside a bed and reaches over it in front of the fat one asleep in that bed, and whatever lies on that roof with it', () => {
    // A roof on the root step, its tip over the bed on the floor beside the step: the fat one tries it first, from the left.
    const roof = idOf('leaf', 1), bed = idOf('leaf', 0)
    const toy = new Toy(day([{ id: idOf('moss'), x: 560 }, { id: bed, x: 560 }, { id: idOf('twig', 0), x: 470 }, { id: idOf('twig', 1), x: 530 }, { id: roof, x: 500 }]), 3)
    expect(toy.rested.find((rest) => rest.id === roof)!.cell.is).toBe('roof')
    const ids = (things: readonly ShownThing[]): number[] => things.map((thing) => thing.id)
    // By day nothing is in front of anyone.
    expect(toy.show(null).front).toEqual([])
    sunset(toy)
    watch(toy)
    const save = toy.toSave(), lain = toy.rested.find((rest) => rest.id === roof)!
    expect(save.snapped.length).toBeGreaterThan(0)
    expect(save.asleep.find((entry) => entry.who === 'fat')!.on).toBe(bed)
    // The roof lies on a stump on the root step, and its tip is over the bed where the fat one lies.
    const fat = toy.show(null).stand.fat, half = PERSONALITY.fat.reach.halfWidth * fat.scale
    expect(lain.x + lain.w / 2).toBeGreaterThan(fat.x - half + 10)
    expect(lain.y).toBeLessThan(fat.y)
    for (const show of [toy.show(null), new Toy(deserialize(JSON.parse(JSON.stringify(serialize(save)))), 9).show(null)]) {
      expect(ids(show.front)).toContain(roof)
      expect(ids(show.front)).toContain(bed)
      expect(ids(show.things)).not.toContain(roof)
    }
    // In the morning the three are out of the hollow, and the roof is behind them again with everything else.
    sunrise(toy)
    watch(toy)
    expect(toy.show(null).front).toEqual([])
  })

  it('raises the dust of the ceiling at the broom that sweeps it, up where the flag is held, and none at the feet', () => {
    const flag = idOf('feather', 0)
    const toy = new Toy(day([{ id: idOf('twig', 0), x: 650 }, { id: flag, x: 650 }]), 3)
    expect(toy.rested.find((rest) => rest.id === flag)!.lies).toBe('flag')
    sunset(toy)
    const seen = new Set<string>()
    let swept = 0
    for (let seconds = 0; toy.playing && seconds < 60; seconds += TICK) {
      toy.step(TICK)
      const show = toy.show(null), broom = [...show.things, ...show.front].find((thing) => thing.id === flag)!
      // While the flag is up in its hand, over its head.
      const up = broom.form === 'loose' && broom.y < HOLLOW.floorY - 110
      for (const puff of show.puffs) {
        const key = `${puff.seed}`
        if (puff.kind !== 'dust' || seen.has(key)) continue
        seen.add(key)
        if (!up) continue
        swept += 1
        expect(Math.hypot(puff.x - broom.x, puff.y - broom.y), `dust at ${puff.x}, ${puff.y} with the broom at ${broom.x}, ${broom.y}`).toBeLessThan(30)
        expect(puff.y).toBeLessThan(HOLLOW.floorY - 110)
      }
    }
    // A puff for each high swish.
    expect(swept).toBeGreaterThanOrEqual(2)
  })

  it('raises dust on the ground only, where a landing is: none up on a roof that lies on its stumps, none on a leaf that lies flat on a stone', () => {
    const houses: [string, Laid[]][] = [
      ['a roof', [{ id: idOf('twig', 0), x: 600 }, { id: idOf('twig', 1), x: 700 }, { id: idOf('leaf', 0), x: 650 }]],
      ['a rug', [{ id: idOf('leaf', 0), x: 650 }]],
      ['a slide', [{ id: idOf('pebble', 0), x: 650 }, { id: idOf('leaf', 0), x: 660 }]],
      ['a tablecloth', [{ id: idOf('bark', 0), x: 650 }, { id: idOf('leaf', 0), x: 650 }]],
      ['a leaf flat on a stone', [{ id: idOf('bark', 0), x: 650 }, { id: idOf('pebble', 0), x: 650 }, { id: idOf('leaf', 0), x: 650 }]],
    ]
    for (const [name, things] of houses) {
      const toy = new Toy(day(things), 3)
      // Two evenings: in the second the roof lies on its stumps, and the fat one sits down on it up there.
      for (const evening of [1, 2]) {
        sunset(toy)
        let dust = 0
        for (let seconds = 0; toy.playing && seconds < 60; seconds += TICK) {
          toy.step(TICK)
          for (const puff of toy.show(null).puffs) {
            if (puff.kind !== 'dust') continue
            dust += 1
            // On the floor of the hollow or on its root step, and nowhere above them.
            // (a thing that sinks into the earth as it lands raises it from where it sank to, a little lower, and a
            // leaf that goes home raises it on the forest floor, below the hollow)
            expect((puff.y >= HOLLOW.stepY && puff.y <= HOLLOW.stepY + 12) || puff.y >= HOLLOW.floorY, `${name}, evening ${evening}: dust at ${puff.x}, ${puff.y}`).toBe(true)
          }
        }
        // The tidy one sweeps the floor every evening: there is dust to be seen.
        expect(dust, `${name}, evening ${evening}`).toBeGreaterThan(0)
        sunrise(toy)
        watch(toy)
      }
    }
  })

  it('has the fat one lie down on a leaf that lies flat on a stone as on a rug: it does not slide, and nothing zips', () => {
    const toy = new Toy(day([{ id: idOf('bark', 0), x: 650 }, { id: idOf('pebble', 0), x: 650 }, { id: idOf('leaf', 0), x: 650 }]), 3)
    expect(toy.rested.find((rest) => rest.kind === 'leaf')).toMatchObject({ lies: 'flat', on: 'pebble' })
    sunset(toy)
    watch(toy)
    expect(toy.sounds.filter((sound) => sound.from === 'act rug').map((sound) => sound.voice)).toEqual([EVENING.rugDown, EVENING.rugHmpf])
    expect(froms(toy)).not.toContain('act slide')
    expect(toy.sounds.some((sound) => sound.voice === EVENING.slideZip || sound.voice === EVENING.slideBump)).toBe(false)
    // A leaf that leans from its stone to the ground is a slide still: the zip and the bump.
    const slide = new Toy(day([{ id: idOf('pebble', 0), x: 650 }, { id: idOf('leaf', 0), x: 660 }]), 3)
    sunset(slide)
    watch(slide)
    expect(slide.sounds.filter((sound) => sound.from === 'act slide').map((sound) => sound.voice)).toEqual([EVENING.slideZip, EVENING.slideBump])
  })

  it('ends where a load would have it: an evening watched to its end stands as the saved one', () => {
    for (const things of [FULL, [], [{ id: idOf('moss'), x: 700 }, { id: idOf('cap'), x: 700 }, { id: idOf('bark'), x: 560 }, { id: idOf('feather'), x: 560 }, { id: idOf('cap', 1), x: 440 }]]) {
      const toy = atEvening(things)
      run(toy, 4)
      const loaded = new Toy(deserialize(stored(toy), 7), 3)
      run(loaded, 4)
      const a = toy.show(null), b = loaded.show(null)
      expect(a.things).toEqual(b.things)
      expect(a.front).toEqual(b.front)
      expect(a.inside).toEqual(b.inside)
      for (const who of FOLK) for (const key of ['x', 'y', 'turn', 'scale'] as const) expect(a.stand[who][key], `${who} ${key}`).toBeCloseTo(b.stand[who][key], 2)
    }
  })

  it('keeps the three inside the hollow all evening, feet on a thing or on the ground', () => {
    const toy = new Toy(day(FULL), 3)
    sunset(toy)
    watch(toy)
    const show = toy.show(null)
    for (const who of FOLK) {
      expect(show.stand[who].x, who).toBeGreaterThan(HOLLOW.left)
      expect(show.stand[who].x, who).toBeLessThan(HOLLOW.right)
      expect(show.stand[who].y, who).toBeLessThanOrEqual(HOLLOW.floorY + 1)
    }
  })
})

describe('a cradle before the last', () => {
  it('is rocked in with open eyes and left with a hop and no sigh; in the last one its eyes fall shut and it sighs once', () => {
    const first = idOf('cap', 1), last = idOf('cap', 0)
    const toy = new Toy(day([{ id: idOf('moss'), x: 560 }, { id: last, x: 560 }, { id: idOf('moss', 1), x: 700 }, { id: first, x: 700 }]), 3)
    const plan = planEvening(toy.toSave().things, [], [])
    expect(plan.parts.filter((part) => part.who === 'tiny').map((part) => [part.act, part.thing, part.sleeps])).toEqual([['cradle', first, false], ['cradle', last, true]])
    sunset(toy)
    toy.sounds.length = 0
    // How long its eyes are shut at a stretch while it is in each cradle: a blink is short.
    const shut = { [first]: 0, [last]: 0 }
    let run = 0, sighs = 0, sighedIn = -1
    for (let i = 0; i < 40 / TICK && toy.playing; i++) {
      const heard = toy.sounds.length
      toy.step(TICK)
      const show = toy.show(null)
      const inCradle = [first, last].find((id) => show.front.some((thing) => thing.id === id)) ?? -1
      run = inCradle >= 0 && show.folk.tiny.lid > 0.6 ? run + 1 : 0
      if (inCradle >= 0) shut[inCradle] = Math.max(shut[inCradle], run * TICK)
      for (const sound of toy.sounds.slice(heard)) {
        if (sound.voice !== EVENING.sigh) continue
        sighs += 1
        sighedIn = inCradle
      }
    }
    expect(shut[first]).toBeLessThan(0.2)
    expect(shut[last]).toBeGreaterThan(0.4)
    expect(sighs).toBe(1)
    expect(sighedIn).toBe(last)
    expect(toy.toSave().asleep.find((entry) => entry.who === 'tiny')).toMatchObject({ on: last })
  })
})

describe('the morning, filled in from where each lay', () => {
  it('wakes each where it slept, on what it slept on, and takes it back to its place', () => {
    const toy = atEvening()
    const beds = toy.toSave().asleep
    const bed = toy.rested.find((r) => r.id === beds[0].on)!
    const lay = toy.show(null).stand
    expect(lay.fat.x).toBeCloseTo(bed.x, 0)
    sunrise(toy)
    toy.sounds.length = 0
    // In its first second nobody has moved yet: the light comes up first.
    run(toy, 0.5)
    expect(toy.show(null).stand.fat.x).toBeCloseTo(lay.fat.x, 3)
    watch(toy)
    const woke = froms(toy).filter((from) => from.startsWith('act wake'))
    expect(woke).toEqual(['act wake fat', 'act wake tiny', 'act wake tidy'])
    const show = toy.show(null)
    for (const who of FOLK) expect(show.stand[who]).toEqual({ x: PERSONALITY[who].feet.x, y: PERSONALITY[who].feet.y, turn: 0, scale: 1 })
    expect(show.inside).toEqual({ fat: false, tidy: false, tiny: false })
    expect(show.dusk).toBeLessThan(0.01)
  })

  it('wakes those of the heap from the floor', () => {
    const toy = atEvening([])
    const lay = toy.show(null).stand
    for (const who of FOLK) expect(lay[who].y, who).toBeLessThanOrEqual(HOLLOW.floorY)
    sunrise(toy)
    run(toy, 0.9)
    // The fat one has begun to wake; the tidy one still lies as it lay.
    expect(toy.show(null).stand.tidy).toEqual(lay.tidy)
  })
})
