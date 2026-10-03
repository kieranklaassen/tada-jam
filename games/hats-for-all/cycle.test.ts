import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { LEFT_ALONE_S, beginNext, due, finishIfReady, freshPace, markShown, startParade, touched, waited, waitingCrew, withWorld, type Pace } from './cycle'
import { layCrew } from './layout'
import { applyChange, bareSpots, changeDue, hatsInTile, ready, tapCreature, tapHat, type World } from './rules'
import { deserialize, freshSave, serialize, worldOf, type Saved } from './save'

/** Put away and opened again: through storage as text and back. */
function putAway(saved: Saved): Saved {
  return deserialize(JSON.parse(JSON.stringify(serialize(saved))))
}

/** One tap of a child who looks, or null when nothing is left to do. */
function carefulTap(world: World): World | null {
  const tower = world.crew.find((creature) => creature.hats.length > 1), bare = bareSpots(world)
  if (tower) return tapHat(world, tower.hats[tower.hats.length - 1]).world
  if (world.loose.length > 0) return tapHat(world, world.loose[0].hat).world
  if (bare.length > 0 && hatsInTile(world).length > 0) return tapCreature(world, bare[0]).world
  return null
}

/**
 * Plays one whole cycle to its parade. `slipFirst` takes a hat off a head and puts it back that many times
 * before anything else, each a slip. `between` runs after every tap and change, as a put-away would.
 */
function playCycle(start: Saved, slipFirst = 0, between: (saved: Saved) => Saved = (saved) => saved): Saved {
  let saved = start
  const step = (world: World): void => { saved = between(withWorld(saved, world)) }
  for (let i = 0; i < slipFirst; i++) {
    if (bareSpots(worldOf(saved)).length === saved.crew.length) step(carefulTap(worldOf(saved))!)
    const hatted = saved.crew.find((creature) => creature.hats.length === 1)!
    step(tapHat(worldOf(saved), hatted.hats[0]).world)
  }
  for (let guard = 0; guard < 60; guard++) {
    while (changeDue(worldOf(saved))) step(applyChange(worldOf(saved)).world)
    if (ready(worldOf(saved))) return between(finishIfReady(saved))
    step(carefulTap(worldOf(saved))!)
  }
  throw new Error('the cycle never ended')
}

describe('a cycle', () => {
  it('ends when the crew is ready and at no other moment', () => {
    let saved = freshSave(null)
    const before = saved.position
    expect(finishIfReady(saved)).toBe(saved)
    saved = withWorld(saved, carefulTap(worldOf(saved))!)
    expect(finishIfReady(saved)).toBe(saved)
    expect(saved.position).toBe(before)
    saved = playCycle(saved)
    expect(saved.finished).toBe(true)
    // Finishing it again moves nothing: the position moves once a cycle.
    expect(finishIfReady(saved)).toBe(saved)
  })

  it('is followed only on the child\'s touch, by the crew that was waiting', () => {
    const playing = freshSave(null)
    expect(beginNext(playing)).toBe(playing)
    const finished = playCycle(playing)
    // Left alone, a finished scene stays finished: nothing here reads a clock.
    expect(putAway(finished)).toEqual(finished)
    const waiting = waitingCrew(finished)
    expect(waitingCrew(putAway(finished))).toEqual(waiting)
    const next = beginNext(finished)
    expect(next.finished).toBe(false)
    expect(worldOf(next)).toEqual(waiting)
    expect(next.slips).toBe(0)
    expect(next.seed).not.toBe(finished.seed)
    expect(next.crew.every((creature) => creature.hats.length === 0)).toBe(true)
  })
})

describe('the hidden position', () => {
  it('goes up one step after each cycle that goes well, to the last place, and stays there', () => {
    let saved = freshSave(null)
    const seen = [saved.position]
    for (let cycle = 0; cycle < LADDER.length + 2; cycle++) {
      saved = playCycle(saved)
      seen.push(saved.position)
      saved = beginNext(saved)
    }
    expect(seen.slice(0, LADDER.length)).toEqual([...LADDER])
    expect(seen.at(-1)).toBe(LADDER[LADDER.length - 1])
  })

  it('stays after a mixed cycle and goes down one step after one that goes badly, never below the first', () => {
    const at = (position: string): Saved => beginNext({ ...playCycle(freshSave(null)), position })
    expect(playCycle(at('one-comes'), 2).position).toBe('one-comes')
    expect(playCycle(at('one-comes'), 3).position).toBe('one-comes')
    expect(playCycle(at('one-comes'), 4).position).toBe('spare-hat')
    expect(playCycle(at(LADDER[0]), 6).position).toBe(LADDER[0])
  })

  it('never moves inside a cycle', () => {
    for (const position of LADDER) {
      const start = beginNext({ ...playCycle(freshSave(null)), position })
      playCycle(start, 2, (saved) => {
        if (!saved.finished) expect(saved.position).toBe(position)
        return saved
      })
    }
  })

  it('lays the very next crew out from the new position', () => {
    const finished = playCycle(beginNext({ ...playCycle(freshSave(null)), position: 'three-heads' }))
    expect(finished.position).toBe('one-leaves')
    expect(waitingCrew(finished).changes).toEqual(['leave'])
  })
})

describe('found as left', () => {
  it('a put-away after every tap and every change loses nothing and changes nothing', () => {
    for (const position of LADDER) {
      const start = beginNext({ ...playCycle(freshSave(null)), position })
      const straight = playCycle(start, 1)
      const interrupted = playCycle(start, 1, (saved) => {
        const back = putAway(saved)
        expect(back).toEqual(saved)
        return back
      })
      expect(interrupted).toEqual(straight)
    }
  })

  it('plays the first showing once: its outcome is in the first save, and the mark stays', () => {
    const fresh = freshSave(null)
    expect(fresh.shown).toBe(false)
    expect(putAway(fresh).shown).toBe(false)
    const shown = markShown(fresh)
    expect(shown.shown).toBe(true)
    expect(worldOf(shown)).toEqual(worldOf(fresh))
    expect(putAway(shown).shown).toBe(true)
    expect(markShown(shown)).toBe(shown)
    // No later crew has a leader who shows it again.
    expect(beginNext(playCycle(shown)).crew.every((creature) => creature.hats.length === 0)).toBe(true)
  })
})

/** A little over the wait, so a sum of sixtieths of a second is surely past it. */
const ALONE = LEFT_ALONE_S + 0.1

/** A child at the glass: taps come `gap` seconds apart, and the game plays whatever falls due in between, frame by frame. */
function play(start: Saved, taps: ((world: World) => World | null)[], gap: number, after = 0): { saved: Saved; pace: Pace; parades: number } {
  let saved = start, pace = freshPace(start), parades = 0
  const wait = (seconds: number): void => {
    for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
      pace = waited(pace, 1 / 60)
      const now = due(saved, pace)
      if (now === 'change') { saved = withWorld(saved, applyChange(worldOf(saved)).world); pace = touched(pace, saved) }
      if (now === 'parade') { ({ saved, pace } = startParade(saved, pace)); parades++ }
    }
  }
  for (const tap of taps) {
    const world = tap(worldOf(saved))
    if (world) { saved = withWorld(saved, world); pace = touched(pace, saved) }
    wait(gap)
  }
  wait(after)
  return { saved, pace, parades }
}

const at = (position: string): Saved => beginNext({ ...playCycle(freshSave(null)), position })
const everyHat = (saved: Saved) => saved.tile.map((_, hat) => (world: World) => tapHat(world, hat).world)

describe('left alone', () => {
  it('is what the parade waits for: nothing starts the instant the last head is hatted', () => {
    const start = at('three-heads')
    const quick = play(start, everyHat(start), 0.5)
    expect(ready(worldOf(quick.saved))).toBe(true)
    expect(quick.parades).toBe(0)
    expect(quick.saved.finished).toBe(false)
    const waitedFor = play(start, everyHat(start), 0.5, ALONE)
    expect(waitedFor.parades).toBe(1)
    expect(waitedFor.saved.finished).toBe(true)
  })

  it('means a child who taps every hat cannot finish once a hat is spare, however long they wait after', () => {
    for (const position of ['spare-hat', 'one-comes', 'spares-and-one-leaves', 'comes-and-goes']) for (let n = 0; n < 12; n++) {
      const start = { ...at(position), ...layCrew(position, 77 + n * 131).world }
      const after = play(start, everyHat(start), 1, 10)
      expect(after.parades, position).toBe(0)
      expect(after.saved.finished, position).toBe(false)
      expect(after.saved.loose.length, position).toBeGreaterThan(0)
    }
  })

  it('lets the same child finish where there are as many hats as heads', () => {
    for (const position of ['two-heads', 'three-heads']) {
      const start = at(position)
      expect(play(start, everyHat(start), 1, ALONE).saved.finished).toBe(true)
    }
  })

  it('at one-leaves needs one tap more, on the tossed hat, and nothing else', () => {
    const start = at('one-leaves')
    const tossed = play(start, everyHat(start), 1, ALONE)
    expect(tossed.saved.crew.length).toBe(2)
    expect(tossed.saved.loose.length).toBe(1)
    expect(tossed.parades).toBe(0)
    const home = play(tossed.saved, [(world) => tapHat(world, world.loose[0].hat).world], 0, ALONE)
    expect(home.parades).toBe(1)
    expect(home.saved.finished).toBe(true)
  })

  it('holds the cycle\'s change back too, until the crew has been left alone', () => {
    const start = at('one-comes')
    const careful = (world: World) => carefulTap(world)
    const busy = play(start, [careful, careful, careful], 0.5)
    expect(busy.saved.changes).toEqual(['come'])
    const calm = play(start, [careful, careful, careful], 0.5, ALONE)
    expect(calm.saved.changes).toEqual([])
    expect(calm.saved.crew.length).toBe(start.crew.length + 1)
    expect(calm.parades).toBe(0)
  })
})

describe('a finished crew', () => {
  it('still answers every touch, parades again each time its pairs are set right, and is judged once', () => {
    const start = at('three-heads')
    const first = play(start, everyHat(start), 0.5, ALONE)
    expect(first.saved.position).toBe('one-leaves')
    // The child takes a hat off the finished crew and gives it back.
    const off = (world: World) => tapHat(world, world.crew[0].hats[0]).world
    const unsettled = play(first.saved, [off], 0, 5)
    expect(unsettled.saved.finished).toBe(true)
    expect(unsettled.parades).toBe(0)
    expect(bareSpots(worldOf(unsettled.saved)).length).toBe(1)
    const again = play(unsettled.saved, [(world) => carefulTap(world)], 0, ALONE)
    expect(again.parades).toBe(1)
    expect(again.saved.position).toBe('one-leaves')
    expect(again.saved.finished).toBe(true)
    // And once more, every time.
    const third = play(again.saved, [off, (world) => carefulTap(world)], 0.5, ALONE)
    expect(third.parades).toBe(1)
    expect(third.saved.position).toBe('one-leaves')
  })

  it('does not parade again on load, and is found unsettled if it was left unsettled', () => {
    const start = at('two-heads')
    const finished = play(start, everyHat(start), 0.5, ALONE).saved
    expect(play(putAway(finished), [], 0, 10).parades).toBe(0)
    const off = withWorld(finished, tapHat(worldOf(finished), finished.crew[0].hats[0]).world)
    const back = putAway(off)
    expect(back).toEqual(off)
    expect(back.finished).toBe(true)
    expect(bareSpots(worldOf(back)).length).toBe(1)
    // The waiting crew comes in on the child's touch whatever state the finished crew is in.
    expect(beginNext(back).finished).toBe(false)
  })

  it('found mid-wait after a put-away has its first parade then, since it never had one', () => {
    const start = at('two-heads')
    const hatted = play(start, everyHat(start), 0.5).saved
    expect(hatted.finished).toBe(false)
    expect(play(putAway(hatted), [], 0, ALONE).parades).toBe(1)
  })
})
