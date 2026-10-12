import { describe, expect, it } from 'vitest'
import type { Build } from './build'
import { HEAVY, launchBoat, play, playUntil, visit, type Visit } from './hands'
import { MEET, PLACES } from './layout'
import { STEP, boatShown, type World } from './world'

// "A tap on it, or a lift the shell takes away, changes nothing", while a
// place is answering the boat: the answer goes on and is given, the boat
// does not jump back to where the answer began, and at the fall it never
// drifts past the lip at the upper water level. Held here at every place,
// for a tap, a press taken away and a lift the shell takes away.

const BUILDS: Record<string, Partial<Build> | undefined> = { 'a sailed boat with a berry': undefined, 'a heavy boat': HEAVY, 'a boat with no sail': { masts: ['twig', null], sails: [null, null], deck: [] } }

/** A visit with the boat in the middle of the answer of place `frame`. */
function answering(frame: number, build: Partial<Build> | undefined): Visit {
  const v = build ? visit(build) : visit()
  launchBoat(v)
  expect(playUntil(v, (w) => w.frame === frame && w.journey.phase === 'answer' && w.acts.some((run) => run.brook), 200), PLACES[frame]).toBe(true)
  play(v, 0.3)
  expect(v.game.w.journey.phase).toBe('answer')
  return v
}

/** Plays the place out and says what it gave: each answer in order, where the boat was when the place let it go, and whether it was ever past the lip at the upper level. */
function given(v: Visit, frame: number): { ids: string[]; x: number; held: boolean; high: boolean } {
  const ids: string[] = []
  let x = 0, held = false, high = false, gone = false
  const look = (w: World): boolean => {
    if (w.frame !== frame || (w.finished && !w.scene)) return true
    for (const run of w.acts) if (run.brook && ids[ids.length - 1] !== run.act.id) ids.push(run.act.id)
    if (w.journey.phase === 'held') held = true
    if (!gone && (w.journey.phase === 'leave' || w.journey.phase === 'moor' || w.finished)) { gone = true; x = w.boat.x }
    if (PLACES[frame] === 'fall' && !w.journey.low && w.hand?.on !== 'boat' && boatShown(w).x < MEET.fall.at - 30 && w.journey.phase !== 'answer') high = true
    return false
  }
  expect(playUntil(v, look, 120)).toBe(true)
  return { ids, x: Math.round(x), held, high }
}

const TOUCHES: Record<string, (v: Visit) => void> = {
  'a tap': (v) => { const at = boatShown(v.game.w); v.game.press(at.x + 60, at.y - 12, false); v.game.tap() },
  'a press taken away': (v) => { const at = boatShown(v.game.w); v.game.press(at.x + 60, at.y - 12, false); play(v, STEP * 3, true); v.game.pressEnd() },
  'a lift the shell takes away': (v) => {
    const at = boatShown(v.game.w)
    v.game.press(at.x + 60, at.y - 12, false)
    v.game.dragStart()
    expect(v.game.w.hand?.on).toBe('boat')
    for (let i = 1; i <= 6; i++) { v.game.dragMove(at.x + 60 + i * 12, at.y - 12 - i * 14); play(v, STEP, true) }
    v.game.dragCancel()
  },
}

describe('a touch on the boat while a place answers it', () => {
  for (const [name, build] of Object.entries(BUILDS)) {
    for (let frame = 0; frame < PLACES.length; frame++) {
      // At the pond only a boat with no sail is answered before the lamp scene, which a touch ends like any scene.
      if (PLACES[frame] === 'pond' && name !== 'a boat with no sail') continue
      it(`changes nothing at the ${PLACES[frame]}, for ${name}: the answer goes on and is given, and the boat does not jump back`, () => {
        const plain = given(answering(frame, build), frame)
        expect(plain.ids.length).toBeGreaterThan(0)
        expect(plain.high).toBe(false)
        for (const [touch, make] of Object.entries(TOUCHES)) {
          const v = answering(frame, build)
          const w = v.game.w
          const running = w.acts.filter((run) => run.brook).map((run) => run.act.id)
          const before = { shown: boatShown(w).x, x: w.boat.x, t: w.acts.find((run) => run.brook)?.t ?? 0 }
          v.game.changed()
          make(v)
          // Nothing is in the hand, the same answer is still playing from where it was, and nothing is to be saved.
          expect(w.hand, touch).toBe(null)
          expect(w.journey.phase, touch).toBe('answer')
          expect(w.acts.filter((run) => run.brook).map((run) => run.act.id), touch).toEqual(running)
          expect(w.acts.find((run) => run.brook)?.t ?? 0, touch).toBeGreaterThanOrEqual(before.t)
          // Under a finger that rests on the boat and does not pull, the answer does not wait: it has gone on meanwhile.
          if (touch === 'a press taken away') expect(w.acts.find((run) => run.brook)?.t ?? 0, touch).toBeGreaterThan(before.t + STEP * 2)
          expect(w.boat.x, touch).toBe(before.x)
          expect(v.game.changed(), touch).toBe('no')
          play(v, STEP)
          // The boat is drawn where the answer has it, not back where the answer began.
          expect(Math.abs(boatShown(w).x - before.shown), touch).toBeLessThan(40)
          // The place gives the same answers and lets the boat go where it would have (a lift stills the boat's own drift, a unit or two).
          const after = given(v, frame)
          expect({ ...after, x: 0 }, touch).toEqual({ ...plain, x: 0 })
          expect(Math.abs(after.x - plain.x), touch).toBeLessThanOrEqual(2)
        }
      })
    }
  }

  it('lifted out of the fall\'s answer and set down above the lip, the boat goes over the fall again: it never drifts past the lip at the upper level', () => {
    const v = answering(4, undefined)
    const at = boatShown(v.game.w)
    v.game.press(at.x + 60, at.y - 12, false)
    v.game.dragStart()
    const to = { x: MEET.fall.at + 90, y: at.y - 12 }
    for (let i = 1; i <= 6; i++) { v.game.dragMove(at.x + 60 + ((to.x - at.x - 60) * i) / 6, to.y); play(v, STEP, true) }
    v.game.dragEnd()
    expect(v.game.w.journey.low).toBe(false)
    const after = given(v, 4)
    expect(after.high).toBe(false)
    expect(after.ids.some((id) => id.startsWith('fall:'))).toBe(true)
  })
})
