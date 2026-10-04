import { describe, expect, it } from 'vitest'
import { type Clutch } from './layout'
import { FORMS } from './places'
import { direct } from './plays'
import { deserializeWorld, serializeWorld } from './save'
import { Show } from './show'
import { STAGE } from './stage'
import { type Action, type Happening, type World, act, freshWorld, waitingOf } from './world'

// What each scene saves when it starts (ART.md, "The scenes"). A scene's
// outcome is in the world before the scene plays, so a put-away in the middle
// of it loses nothing and nothing replays on load. These tests hold the list
// the sheet gives for each scene: exactly those fields change, and no other.

/** The fields of the world that differ, with the fields of the clutch on screen named one by one. */
function changed(before: World, after: World): string[] {
  const out: string[] = []
  for (const field of ['position', 'finished', 'rng', 'shown', 'hill', 'extra', 'next'] as const) if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) out.push(field)
  if (before.cycle === null || after.cycle === null || before.cycle.place !== after.cycle.place || JSON.stringify(before.cycle.kinds) !== JSON.stringify(after.cycle.kinds)) {
    if (JSON.stringify(before.cycle) !== JSON.stringify(after.cycle)) out.push('cycle')
  } else for (const field of ['slots', 'queue', 'asker', 'wrong'] as const) if (JSON.stringify(before.cycle[field]) !== JSON.stringify(after.cycle[field])) out.push(`cycle.${field}`)
  return out.sort()
}

function playing(world: World, ...actions: Action[]): World {
  for (const action of actions) world = act(world, action).world
  return world
}
const types = (happened: Happening[]) => happened.map((one) => one.type)
const slot = (at: number): Action => ({ type: 'slot', slot: at })

const seek = (): Clutch => ({ form: 'seek', place: 'three-eggs', kinds: ['pip', 'hoom', 'wheep'], slots: ['fresh', 'fresh', 'fresh'], queue: ['hoom', 'wheep', 'pip'], asker: null, wrong: 0 })
const who = (): Clutch => ({ form: 'who', place: 'who-is-inside', kinds: ['pip', 'tok', 'hoom'], slots: ['fresh', 'fresh', 'fresh'], queue: ['tok', 'hoom', 'pip'], asker: null, wrong: 0 })
const alike = (): Clutch => ({ form: 'alike', place: 'two-alike', kinds: ['pip', 'hoom', 'hoom', 'pip'], slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: [], asker: null, wrong: 0 })
const waiting = (next: Clutch): World => ({ ...freshWorld(null), position: next.place, shown: [...FORMS], next, extra: 'dooo' })

describe('what each scene saves when it starts', () => {
  it('the showing: the way of asking, the pair on the hill and the stream, with what the same touch brings in', () => {
    const before = freshWorld(null)
    const step = act(before, { type: 'edge' })
    expect(types(step.happened)).toEqual(['arrives', 'shows', 'settles', 'asks'])
    expect(changed(before, step.world)).toEqual(['cycle', 'finished', 'hill', 'next', 'rng', 'shown'])
  })

  it('the reunion: the hide done, nobody asking, the two on the hill and the stream', () => {
    const before = playing(waiting(seek()), { type: 'edge' }, slot(1))
    const step = act(before, slot(1))
    expect(types(step.happened)).toEqual(['meets', 'settles'])
    expect(changed(before, step.world)).toEqual(['cycle.asker', 'cycle.slots', 'hill', 'rng'])
  })

  it('the meeting that does not match: the hide done, the count, the one let out on the hill and the stream', () => {
    const before = playing(waiting(seek()), { type: 'edge' }, slot(0))
    const step = act(before, slot(0))
    expect(types(step.happened)).toEqual(['meets', 'settles'])
    expect(changed(before, step.world)).toEqual(['cycle.slots', 'cycle.wrong', 'hill', 'rng'])
  })

  it('a wrong knock in who-is-inside: the count and the stream only', () => {
    const before = playing(waiting(who()), { type: 'edge' }, slot(0))
    const step = act(before, slot(0))
    expect(types(step.happened)).toEqual(['meets'])
    expect(changed(before, step.world)).toEqual(['cycle.wrong', 'rng'])
  })

  it('the finding on the hill: the one who came no longer has to, and the one alone is a family in the same place', () => {
    const before = playing(waiting(seek()), { type: 'edge' }, slot(0), slot(0), slot(1), slot(1), { type: 'edge' }, slot(2), slot(2))
    const alone = before.hill.find((resident) => resident.as === 'single')!
    const step = act(before, { type: 'edge' })
    expect(types(step.happened).slice(0, 3)).toEqual(['asks', 'settles', 'finds'])
    // It was the last one, so the choir starts with it and saves its own fields too.
    expect(changed(before, step.world)).toEqual(['cycle.queue', 'extra', 'finished', 'hill', 'next', 'rng'].filter((field) => field !== 'extra' || before.extra === null).sort())
    expect(step.world.hill.find((resident) => resident.kind === alone.kind)).toEqual({ ...alone, as: 'family' })
  })

  it('the finding on the hill in two-alike: the hide done, and the one alone is twins in the same place', () => {
    const before = playing(waiting(alike()), { type: 'edge' }, slot(1), slot(1), slot(0), slot(0), slot(2), slot(2), slot(3))
    const alone = before.hill.find((resident) => resident.as === 'single')!
    const step = act(before, slot(3))
    expect(types(step.happened).slice(0, 2)).toEqual(['settles', 'finds'])
    // Its own: the hide, the hill, and the stream, which every attempt moves on. It was the last one, so the choir
    // starts with it and saves its own fields too.
    expect(types(step.happened)).toEqual(['settles', 'finds', 'ends'])
    expect(changed(before, step.world)).toEqual(['cycle.slots', 'finished', 'hill', 'next', 'rng'])
    expect(step.world.hill.find((resident) => resident.kind === alone.kind)).toEqual({ ...alone, as: 'twins' })
  })

  it('the choir: finished, the place, the clutch that will wait, the egg for an empty basket and the stream', () => {
    // A clutch of two, the egg of the basket tipped in so that the basket is empty at the end.
    const two: Clutch = { form: 'seek', place: 'two-eggs', kinds: ['pip', 'hoom'], slots: ['fresh', 'fresh'], queue: ['hoom', 'pip'], asker: null, wrong: 0 }
    const before = playing(waiting(two), { type: 'edge' }, { type: 'basket' }, slot(1), slot(1), { type: 'edge' }, slot(0), slot(0), { type: 'edge' }, slot(2))
    const step = act(before, slot(2))
    expect(types(step.happened)).toEqual(['meets', 'settles', 'ends'])
    const ending = changed(before, step.world).filter((field) => !['cycle.asker', 'cycle.slots', 'hill'].includes(field))
    expect(ending).toEqual(['extra', 'finished', 'next', 'position', 'rng'])
    expect(step.world.extra).not.toBeNull()
  })

  it('the round saves nothing: a tap on someone on the hill changes no field', () => {
    const before = playing(waiting(seek()), { type: 'edge' }, slot(1), slot(1))
    const step = act(before, { type: 'resident', resident: 0 })
    expect(changed(before, step.world)).toEqual([])
    expect(step.world).toEqual(before)
  })

  it('hearing saves only that the spot was heard, and a call from everyone saves nothing', () => {
    const before = playing(waiting(seek()), { type: 'edge' })
    expect(changed(before, act(before, slot(0)).world)).toEqual(['cycle.slots'])
    expect(changed(before, act(before, { type: 'asker' }).world)).toEqual([])
  })
})

// Whatever a later scene will save is saved with the scene that makes it certain. The last reunion of a clutch,
// the last knock that opens and the last finding are each followed by the choir on the same touch, so the one
// save that is made when the touch is answered already holds the ending: a game put away during the first of
// the two scenes is found with its cycle finished and plays no ending on load.
describe('the last scene of a clutch saves the ending with it', () => {
  const VIEW = { x: 0, y: 0, w: STAGE.width, h: STAGE.height }
  const two: Clutch = { form: 'seek', place: 'two-eggs', kinds: ['pip', 'hoom'], slots: ['fresh', 'fresh'], queue: ['hoom', 'pip'], asker: null, wrong: 0 }

  /** The last tap of a clutch, played as the Mount plays it: how often it saved, and what a load of that save shows. */
  function lastTap(before: World, action: Action) {
    const show = new Show(before, VIEW), step = act(before, action)
    let saves = 0, saved: unknown = null
    show.retarget(step.world, VIEW)
    show.start(direct(step.happened, action, before, step.world, VIEW, 0)!, () => { saves += 1; saved = JSON.parse(JSON.stringify(serializeWorld(step.world))) })
    // Put away in the middle of the first of the two scenes: nothing more is saved, and this is what is loaded.
    for (let i = 0; i < 60; i++) show.step(1 / 60)
    const loaded = deserializeWorld(saved, null)
    return { step, saves, loaded, playing: show.playing, reloaded: new Show(loaded, VIEW) }
  }

  it.each([
    ['the last reunion', playing(waiting(two), { type: 'edge' }, slot(1), slot(1), { type: 'edge' }, slot(0)), slot(0), ['meets', 'settles', 'ends']],
    ['the last knock that opens, in who-is-inside', playing(waiting(who()), { type: 'edge' }, slot(1), slot(1), slot(2), slot(2), slot(0)), slot(0), ['meets', 'settles', 'ends']],
    ['the last reunion of a row of pairs', playing(waiting(alike()), { type: 'edge' }, slot(1), slot(1), slot(2), slot(2), slot(0), slot(0), slot(3)), slot(3), ['meets', 'settles', 'ends']],
    ['the last finding, of one who comes to ask', playing(waiting(two), { type: 'edge' }, slot(0), slot(0), slot(1), slot(1)), { type: 'edge' } as Action, ['asks', 'settles', 'finds', 'ends']],
    ['the last finding in a row of pairs', playing(waiting(alike()), { type: 'edge' }, slot(1), slot(1), slot(0), slot(0), slot(2), slot(2), slot(3)), slot(3), ['settles', 'finds', 'ends']],
  ] as [string, World, Action, string[]][])('%s', (_, before, action, happens) => {
    const { step, saves, loaded, playing: stillPlaying, reloaded } = lastTap(before, action)
    expect(types(step.happened)).toEqual(happens)
    // One save, when the touch is answered, and it holds everything the choir saves.
    expect(saves).toBe(1)
    expect(stillPlaying).toBe(true)
    expect(changed(before, step.world)).toEqual(expect.arrayContaining(['finished', 'next', 'rng']))
    expect(loaded).toEqual(step.world)
    expect(loaded.finished).toBe(true)
    expect(loaded.next).not.toBeNull()
    expect(loaded.cycle!.slots.every((one) => one === 'done')).toBe(true)
    // Found as left: the next clutch waits at the edge for the child's touch, and no scene plays.
    expect(waitingOf(loaded)).not.toBeNull()
    expect(reloaded.playing).toBe(false)
    expect(reloaded.moving).toBe(false)
    expect(reloaded.due(60)).toEqual([])
    expect(reloaded.picture.things.some((thing) => thing.key === 'edge')).toBe(true)
  })

  it('moves the place with that same save, so a load never judges the cycle a second time', () => {
    const before = playing(waiting(two), { type: 'edge' }, slot(1), slot(1), { type: 'edge' }, slot(0))
    const { step, loaded } = lastTap(before, slot(0))
    expect(before.position).toBe('two-eggs')
    expect(step.world.position).toBe('three-eggs')
    expect(loaded.position).toBe('three-eggs')
    expect(loaded.next!.place).toBe('three-eggs')
    // Another load of the same save, and a tap that brings the next clutch in, leave the place where it is.
    const again = deserializeWorld(JSON.parse(JSON.stringify(serializeWorld(loaded))), null)
    expect(again.position).toBe('three-eggs')
    expect(act(again, { type: 'edge' }).world.position).toBe('three-eggs')
  })
})

