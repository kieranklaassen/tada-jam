import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { type Clutch, FIRST_SEED, layClutch } from './layout'
import { FORMS } from './places'
import { type Action, type Happening, type World, act, canTip, freshWorld, outcomeOf, singsRound, waitingOf } from './world'

/** Who stands on the hill, without the places they stand in. */
const bare = (hill: { kind: string; as: string }[]) => hill.map(({ kind, as }) => ({ kind, as }))


// Scripted play, one tap at a time. The clutches are written out by hand so each test reads as a little story.

const frozen = <T>(value: T): T => {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value) }
  return value
}

/** A world at a place, with a clutch of the test's own waiting at the edge and every way of asking already shown. */
function worldWith(next: Clutch, position = next.place): World {
  return { ...freshWorld(null), position, shown: [...FORMS], next, extra: 'dooo' }
}

/** Plays taps in order and returns the world and everything that happened. `act` must never change what it is given. */
function play(world: World, ...actions: Action[]): { world: World; happened: Happening[] } {
  const happened: Happening[] = []
  for (const action of actions) {
    const step = act(frozen(world), action)
    world = step.world
    happened.push(...step.happened)
  }
  return { world, happened }
}

const types = (happened: Happening[]) => happened.map((one) => one.type)
const slot = (at: number): Action => ({ type: 'slot', slot: at })
const edge: Action = { type: 'edge' }

const seekTwo = (): Clutch => ({ form: 'seek', place: 'two-eggs', kinds: ['pip', 'hoom'], slots: ['fresh', 'fresh'], queue: ['hoom', 'pip'], asker: null, wrong: 0 })
const seekThree = (): Clutch => ({ form: 'seek', place: 'three-eggs', kinds: ['pip', 'hoom', 'wheep'], slots: ['fresh', 'fresh', 'fresh'], queue: ['hoom', 'wheep', 'pip'], asker: null, wrong: 0 })

describe('a first visit', () => {
  it('opens on one who waits at the edge with the first clutch, and nothing else', () => {
    const world = freshWorld(null)
    expect(world.finished).toBe(true)
    expect(world.cycle).toBeNull()
    expect(bare(world.hill)).toEqual([])
    expect(world.position).toBe('two-eggs')
    expect(world.next).toEqual(layClutch('two-eggs', FIRST_SEED).clutch)
    expect(waitingOf(world)).toEqual({ what: 'grown', kind: world.next!.queue[0], withClutch: true, form: 'seek' })
    // No basket before the second clutch: nothing is on screen before it means something.
    expect(world.extra).toBeNull()
  })

  it('starts a child of four one place further on, and a saved place is not asked about here', () => {
    expect(freshWorld(2).position).toBe('two-eggs')
    expect(freshWorld(3).position).toBe('two-eggs')
    expect(freshWorld(4).position).toBe('three-eggs')
    expect(freshWorld(9).position).toBe('three-eggs')
    expect(freshWorld(1).position).toBe('two-eggs')
  })

  it('can be started at a place of the order for a still, and ignores a place it does not know', () => {
    expect(freshWorld(null, 5, 'leaf-piles').position).toBe('leaf-piles')
    expect(freshWorld(null, 5, 'leaf-piles').next!.place).toBe('leaf-piles')
    expect(freshWorld(null, 5, 'tenth').position).toBe('two-eggs')
  })

  it('is shown the way of asking once, by a pair that then stands on the hill', () => {
    const first = play(freshWorld(null), edge)
    expect(types(first.happened)).toEqual(['arrives', 'shows', 'settles', 'asks'])
    const shown = first.happened[1] as Extract<Happening, { type: 'shows' }>
    expect(shown.form).toBe('seek')
    expect(first.world.cycle!.kinds).not.toContain(shown.kind)
    expect(bare(first.world.hill)).toEqual([{ kind: shown.kind, as: 'family' }])
    expect(first.world.shown).toEqual(['seek'])
    expect(first.world.extra).toBeNull()
    expect(play(first.world, { type: 'basket' }).happened).toEqual([{ type: 'basket', kind: null }])
  })
})

describe('seek: a grown one asks, and the child finds its own', () => {
  it('hears on the first tap, opens on the second, and ends when everyone is found', () => {
    let { world, happened } = play(worldWith(seekTwo()), edge)
    expect(types(happened)).toEqual(['arrives', 'asks'])
    expect(world.cycle!.asker).toBe('hoom')
    expect(world.finished).toBe(false)
    expect(waitingOf(world)).toEqual({ what: 'grown', kind: 'pip', withClutch: false, form: 'seek' })

    ;({ world, happened } = play(world, slot(1)))
    expect(happened).toEqual([{ type: 'hears', slot: 1, kind: 'hoom', asker: 'hoom' }])
    expect(world.cycle!.slots).toEqual(['fresh', 'heard'])

    ;({ world, happened } = play(world, slot(1)))
    expect(types(happened)).toEqual(['meets', 'settles'])
    expect((happened[0] as Extract<Happening, { type: 'meets' }>).meeting.match).toBe(true)
    expect(bare(world.hill)).toEqual([{ kind: 'hoom', as: 'family' }])
    expect(world.cycle!.asker).toBeNull()
    expect(world.finished).toBe(false)

    // The next one waits at the edge until the child's touch, and then asks.
    ;({ world, happened } = play(world, edge))
    expect(happened).toEqual([{ type: 'asks', kind: 'pip' }])
    ;({ world, happened } = play(world, slot(0), slot(0)))
    expect(types(happened)).toEqual(['hears', 'meets', 'settles', 'ends'])
    expect(happened[3]).toEqual({ type: 'ends', found: ['hoom', 'pip'] })
    expect(world.finished).toBe(true)
    expect(world.position).toBe('three-eggs')
    expect(world.next!.place).toBe('three-eggs')
    expect(world.next!.kinds).not.toContain(world.extra)
    expect(waitingOf(world)!.withClutch).toBe(true)
  })

  it('lets the wrong one out all the same: it goes up the hill alone and its own finds it there', () => {
    let { world, happened } = play(worldWith(seekThree()), edge, slot(0), slot(0))
    expect(types(happened)).toEqual(['arrives', 'asks', 'hears', 'meets', 'settles'])
    const meets = happened[3] as Extract<Happening, { type: 'meets' }>
    expect(meets.meeting).toEqual({ asker: 'hoom', other: 'pip', askerDoes: 'delighted', otherDoes: 'delighted', match: false })
    expect(bare(world.hill)).toEqual([{ kind: 'pip', as: 'single' }])
    expect(world.cycle!.wrong).toBe(1)
    // The state stays: the asker still asks, the other hides are as they were.
    expect(world.cycle!.asker).toBe('hoom')
    expect(world.cycle!.slots).toEqual(['done', 'fresh', 'fresh'])

    ;({ world } = play(world, slot(1), slot(1), edge, slot(2), slot(2)))
    expect(bare(world.hill)).toEqual([{ kind: 'pip', as: 'single' }, { kind: 'hoom', as: 'family' }, { kind: 'wheep', as: 'family' }])
    expect(world.finished).toBe(false)

    // The grown pip comes in on a touch and finds its little one on the hill at once.
    ;({ world, happened } = play(world, edge))
    expect(types(happened)).toEqual(['asks', 'settles', 'finds', 'ends'])
    expect(world.hill[0]).toMatchObject({ kind: 'pip', as: 'family' })
    expect(world.finished).toBe(true)
    // One wrong attempt is a mixed cycle: the place stays.
    expect(world.position).toBe('three-eggs')
  })

  it('brings the next asker in on a tap on a hide, and that tap is never an attempt', () => {
    let { world } = play(worldWith(seekThree()), edge, slot(2), slot(1), slot(1))
    expect(world.cycle!.slots).toEqual(['fresh', 'done', 'heard'])
    expect(world.cycle!.asker).toBeNull()
    const step = play(world, slot(2))
    expect(step.happened).toEqual([{ type: 'asks', kind: 'wheep' }, { type: 'hears', slot: 2, kind: 'wheep', asker: 'wheep' }])
    expect(step.world.cycle!.slots).toEqual(['fresh', 'done', 'heard'])
    expect(step.world.cycle!.wrong).toBe(0)
    ;({ world } = play(step.world, slot(2)))
    expect(world.hill.map((resident) => resident.kind)).toEqual(['hoom', 'wheep'])
  })

  it('moves the place down after two wrong attempts, and never below the first', () => {
    const lost = play(worldWith(seekThree()), edge, slot(0), slot(0), slot(2), slot(2), slot(1), slot(1), edge, edge)
    expect(lost.world.finished).toBe(true)
    expect(lost.world.position).toBe('two-eggs')
    const bottom = play(worldWith(seekTwo()), edge, slot(0), slot(0), slot(1), slot(1), edge)
    expect(bottom.world.finished).toBe(true)
    expect(bottom.world.position).toBe('two-eggs')
  })

  it('answers a tap on the asker with a call from everyone still hidden', () => {
    const { world } = play(worldWith(seekThree()), edge, slot(1), slot(1), edge)
    const step = play(world, { type: 'asker' })
    expect(step.happened).toEqual([{ type: 'rollCall', asker: 'wheep', answers: [{ slot: 0, kind: 'pip' }, { slot: 2, kind: 'wheep' }] }])
    expect(step.world).toEqual(world)
  })

  it('lets the one who waits peek in before its turn, and it stays where it is', () => {
    const { world } = play(worldWith(seekThree()), edge)
    const step = play(world, edge)
    expect(step.happened).toEqual([{ type: 'peeks', kind: 'wheep' }])
    expect(step.world).toEqual(world)
  })
})

describe('who: the hidden one asks, and the child sends the grown one whose voice it is', () => {
  const who = (): Clutch => ({ form: 'who', place: 'who-is-inside', kinds: ['pip', 'tok', 'hoom'], slots: ['fresh', 'fresh', 'fresh'], queue: ['tok', 'hoom', 'pip'], asker: null, wrong: 0 })

  it('opens the egg only for its own, and a wrong knock changes nothing but what is heard', () => {
    let { world, happened } = play(worldWith(who()), edge)
    expect(types(happened)).toEqual(['arrives', 'asks'])
    expect(waitingOf(world)).toEqual({ what: 'egg', kind: 'hoom', withClutch: false, form: 'who' })

    ;({ world, happened } = play(world, slot(0), slot(0)))
    expect(types(happened)).toEqual(['hears', 'meets'])
    expect((happened[1] as Extract<Happening, { type: 'meets' }>).meeting).toEqual({ asker: 'tok', other: 'pip', askerDoes: 'puzzled', otherDoes: 'puzzled', match: false })
    expect(world.cycle!.slots).toEqual(['heard', 'fresh', 'fresh'])
    expect(world.cycle!.asker).toBe('tok')
    expect(world.cycle!.wrong).toBe(1)
    expect(bare(world.hill)).toEqual([])

    ;({ world, happened } = play(world, slot(1), slot(1)))
    expect(types(happened)).toEqual(['hears', 'meets', 'settles'])
    expect(world.cycle!.slots).toEqual(['heard', 'done', 'fresh'])
    expect(bare(world.hill)).toEqual([{ kind: 'tok', as: 'family' }])

    ;({ world, happened } = play(world, slot(2), slot(2), edge, slot(0)))
    expect(types(happened)).toEqual(['asks', 'hears', 'meets', 'settles', 'asks', 'hears'])
    ;({ world, happened } = play(world, slot(0)))
    expect(types(happened)).toEqual(['meets', 'settles', 'ends'])
    expect(world.finished).toBe(true)
    expect(world.position).toBe('who-is-inside')
  })

  it('counts wrong knocks up to three and no further', () => {
    let { world } = play(worldWith(who()), edge, slot(0))
    for (let i = 0; i < 6; i++) ({ world } = play(world, slot(0)))
    expect(world.cycle!.wrong).toBe(3)
    expect(outcomeOf(world.cycle!.wrong)).toBe('badly')
  })
})

describe('alike: nobody asks, and the first one let out asks for the other that sounds like it', () => {
  const alike = (): Clutch => ({ form: 'alike', place: 'two-alike', kinds: ['pip', 'hoom', 'hoom', 'pip'], slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: [], asker: null, wrong: 0 })

  it('waits as a clutch, and a first opening is free', () => {
    const before = worldWith(alike())
    expect(waitingOf(before)).toEqual({ what: 'clutch', kind: null, withClutch: true, form: 'alike' })
    let { world, happened } = play(before, edge)
    expect(types(happened)).toEqual(['arrives'])
    expect(waitingOf(world)).toBeNull()
    ;({ world, happened } = play(world, slot(1), slot(1)))
    expect(happened).toEqual([{ type: 'hears', slot: 1, kind: 'hoom', asker: null }, { type: 'stepsOut', slot: 1, kind: 'hoom' }])
    expect(world.cycle!.asker).toBe('hoom')
    expect(world.cycle!.wrong).toBe(0)

    ;({ world, happened } = play(world, slot(2), slot(2)))
    expect(types(happened)).toEqual(['hears', 'meets', 'settles'])
    expect(bare(world.hill)).toEqual([{ kind: 'hoom', as: 'twins' }])
    ;({ world, happened } = play(world, slot(0), slot(0), slot(3), slot(3)))
    expect(types(happened)).toEqual(['hears', 'stepsOut', 'hears', 'meets', 'settles', 'ends'])
    expect(bare(world.hill)).toEqual([{ kind: 'hoom', as: 'twins' }, { kind: 'pip', as: 'twins' }])
    expect(world.finished).toBe(true)
  })

  it('lets two wrong ones of a kind find each other on the hill', () => {
    let { world, happened } = play(worldWith(alike()), edge, slot(1), slot(1), slot(0), slot(0))
    expect(bare(world.hill)).toEqual([{ kind: 'pip', as: 'single' }])
    ;({ world, happened } = play(world, slot(3), slot(3)))
    expect(types(happened)).toEqual(['hears', 'meets', 'settles'])
    expect(bare(world.hill)).toEqual([{ kind: 'pip', as: 'twins' }])
    expect(world.cycle!.wrong).toBe(2)
    ;({ world } = play(world, slot(2), slot(2)))
    expect(world.finished).toBe(true)
    expect(bare(world.hill)).toEqual([{ kind: 'pip', as: 'twins' }, { kind: 'hoom', as: 'twins' }])
  })

  it('joins one let out freely to the other of its kind already alone on the hill', () => {
    let { world } = play(worldWith(alike()), edge, slot(1), slot(1), slot(0), slot(0), slot(2), slot(2))
    expect(bare(world.hill)).toEqual([{ kind: 'pip', as: 'single' }, { kind: 'hoom', as: 'twins' }])
    const step = play(world, slot(3), slot(3))
    expect(types(step.happened)).toEqual(['hears', 'settles', 'finds', 'ends'])
    ;({ world } = step)
    expect(world.hill[0]).toMatchObject({ kind: 'pip', as: 'twins' })
  })
})

describe('the basket: one more egg, if the child wants it', () => {
  it('tips its egg into the row, and its grown one joins those who will come', () => {
    let { world } = play(worldWith(seekTwo()), edge)
    const extra = world.extra!
    expect(canTip(world)).toBe(true)
    const step = play(world, { type: 'basket' })
    expect(step.happened).toEqual([{ type: 'tips', slot: 2, kind: extra }])
    ;({ world } = step)
    expect(world.cycle!.kinds).toEqual(['pip', 'hoom', extra])
    expect(world.cycle!.queue).toEqual(['pip', extra])
    expect(world.extra).toBeNull()
    expect(play(world, { type: 'basket' }).happened).toEqual([{ type: 'basket', kind: null }])
  })

  it('keeps its egg when there is no room, in a row of pairs, and between clutches', () => {
    const full: Clutch = { form: 'seek', place: 'three-eggs', kinds: ['pip', 'hoom', 'wheep', 'brrl'], slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: ['hoom', 'wheep', 'pip', 'brrl'], asker: null, wrong: 0 }
    for (const clutch of [full, { form: 'alike', place: 'two-alike', kinds: ['pip', 'hoom', 'hoom', 'pip'], slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: [], asker: null, wrong: 0 } as Clutch]) {
      const { world } = play(worldWith(clutch), edge)
      expect(canTip(world)).toBe(false)
      const step = play(world, { type: 'basket' })
      expect(step.happened).toEqual([{ type: 'basket', kind: world.extra }])
      expect(step.world).toEqual(world)
    }
    const between = play(worldWith(seekTwo()), edge, slot(1), slot(1), edge, slot(0), slot(0)).world
    expect(between.finished).toBe(true)
    expect(canTip(between)).toBe(false)
  })

  it('still holds the same egg when the next clutch comes, and that kind is never in the clutch', () => {
    let { world } = play(worldWith(seekTwo()), edge)
    const extra = world.extra
    ;({ world } = play(world, slot(1), slot(1), edge, slot(0), slot(0)))
    expect(world.next!.kinds).not.toContain(extra)
    ;({ world } = play(world, edge))
    expect(world.extra).toBe(extra)
  })

  /** Plays the clutch on screen to its end without a wrong attempt. */
  const finish = (world: World): World => {
    while (!world.finished) {
      const cycle = world.cycle!
      const at = cycle.asker === null ? -1 : cycle.kinds.indexOf(cycle.asker)
      ;({ world } = at < 0 ? play(world, edge) : play(world, slot(at), slot(at)))
    }
    return world
  }

  it('gets its next egg when the next clutch is laid out, once its egg has been tipped in', () => {
    let { world } = play(worldWith(seekTwo()), edge, { type: 'basket' })
    expect(world.extra).toBeNull()
    world = finish(world)
    expect(world.extra).not.toBeNull()
    expect(world.next!.kinds).not.toContain(world.extra)
    const laid = world.extra
    ;({ world } = play(world, edge))
    expect(world.extra).toBe(laid)
  })

  it('is not there in the first clutch of a first visit, and holds its first egg when the second is laid out', () => {
    let { world } = play(freshWorld(null), edge)
    expect(world.extra).toBeNull()
    expect(canTip(world)).toBe(false)
    world = finish(world)
    expect(world.extra).not.toBeNull()
    expect(world.next!.kinds).not.toContain(world.extra)
  })

  it('tips into a row of grown ones too: the egg joins those that will come to the stone', () => {
    const who: Clutch = { form: 'who', place: 'who-is-inside', kinds: ['pip', 'tok', 'hoom'], slots: ['fresh', 'fresh', 'fresh'], queue: ['tok', 'hoom', 'pip'], asker: null, wrong: 0 }
    const { world, happened } = play(worldWith(who), edge, { type: 'basket' })
    expect(happened[happened.length - 1]).toEqual({ type: 'tips', slot: 3, kind: 'dooo' })
    expect(world.cycle!.kinds).toEqual(['pip', 'tok', 'hoom', 'dooo'])
    expect(world.cycle!.queue).toEqual(['hoom', 'pip', 'dooo'])
  })
})

describe('the hill', () => {
  it('answers a tap on anyone who stands there, and a tap where nobody stands is nothing', () => {
    const { world } = play(worldWith(seekTwo()), edge, slot(1), slot(1))
    expect(play(world, { type: 'resident', resident: 0 }).happened).toEqual([{ type: 'calls', resident: 0, kind: 'hoom', as: 'family' }])
    // It stands above the egg it came out of: the second of two eggs is on the right half of the hill.
    expect(world.hill[0].place).toBe(2)
    expect(play(world, { type: 'resident', resident: 3 }).happened).toEqual([{ type: 'nothing' }])
    expect(play(world, slot(9)).happened).toEqual([{ type: 'nothing' }])
    expect(play(world, slot(1)).happened).toEqual([{ type: 'nothing' }])
    expect(play(world, { type: 'asker' }).happened).toEqual([{ type: 'nothing' }])
  })

  it('lets two of one family sing a round, and no other two', () => {
    expect(singsRound('pip', 'tok')).toBe(true)
    expect(singsRound('dooo', 'wheep')).toBe(true)
    expect(singsRound('pip', 'pip')).toBe(false)
    expect(singsRound('pip', 'hoom')).toBe(false)
  })

  it('keeps one of a kind: a new family takes the place of the old one of its kind', () => {
    let world = worldWith(seekTwo())
    world = { ...world, hill: [{ kind: 'hoom', as: 'family', place: 0 }, { kind: 'dooo', as: 'twins', place: 3 }] }
    ;({ world } = play(world, edge, slot(1), slot(1)))
    expect(bare(world.hill)).toEqual([{ kind: 'dooo', as: 'twins' }, { kind: 'hoom', as: 'family' }])
  })

  it('holds four at most: the oldest goes over the top, never one who waits alone for its own', () => {
    let world = worldWith(seekThree())
    world = { ...world, hill: [{ kind: 'tok', as: 'family', place: 1 }, { kind: 'brrl', as: 'family', place: 3 }, { kind: 'dooo', as: 'twins', place: 0 }] }
    let happened: Happening[]
    ;({ world, happened } = play(world, edge, slot(0), slot(0), slot(2), slot(2)))
    expect(happened.filter((one) => one.type === 'leaves')).toEqual([{ type: 'leaves', kind: 'tok', place: 1 }])
    expect(bare(world.hill)).toEqual([{ kind: 'brrl', as: 'family' }, { kind: 'dooo', as: 'twins' }, { kind: 'pip', as: 'single' }, { kind: 'wheep', as: 'single' }])
    ;({ world, happened } = play(world, slot(1), slot(1)))
    expect(happened.filter((one) => one.type === 'leaves')).toEqual([{ type: 'leaves', kind: 'brrl', place: 3 }])
    expect(world.hill.map((resident) => resident.kind)).toEqual(['dooo', 'pip', 'wheep', 'hoom'])
  })
})

it('judges a cycle by its wrong attempts alone', () => {
  expect([0, 1, 2, 3].map(outcomeOf)).toEqual(['well', 'mixed', 'badly', 'badly'])
  expect(LADDER).toContain(freshWorld(null).position)
})
