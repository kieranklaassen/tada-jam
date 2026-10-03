import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { beginNext, finishIfReady, markShown, waitingCrew, withWorld } from './cycle'
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
