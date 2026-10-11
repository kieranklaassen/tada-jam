import { describe, expect, it } from 'vitest'
import type { Kind } from './kinds'
import { airborne } from './motion'
import { Play, liftOf, type Cue, type Thing, type World } from './play'
import { makeRng } from './rng'
import { Scene, sceneLength } from './scene'
import { Stage, enterBeats, enterOutcome, floatBeats, showWaiting } from './scenes'
import { STOCK, layStreet } from './street'
import { notesOf } from './voices'

// One rule for every landing in the game: whatever comes down onto the street
// is heard in the frame it touches it, and not before. Here every kind of
// landing is played frame by frame and held to that: a stack hopping down
// from the breath, a thing leaping over another, each hop of the hat and each
// bounce of a balloon, the long bounce of two balloons, the float's tower,
// each thing of the float tipping over, and each thing of a new street
// stopping on its spot or hopping and bouncing its way there.

const FRAME = 1 / 60
const world = (over: Partial<World> = {}): World => ({ hole: { x: 0, z: 0.5 }, belly: [], breath: [], street: [], ...over })
const DOWN = 1e-9
/** The scenes are watched from a moment that is no beat's edge, so no frame falls within a rounding of one. */
const OFF = 0.0007

/** The sound of a landing starts in its frame: its first note has no delay. */
function atOnce(cue: Cue): void {
  expect(Math.min(...notesOf(cue).map((note) => note.delay ?? 0)), JSON.stringify(cue)).toBe(0)
}

/** How a thing was before a frame: how far through its hop down, and how many steps of a walk that leaves the street it had landed. */
type Was = { hop: number; landed: number; lands: boolean }

function before(thing: Thing): Was {
  const walk = thing.walk
  return { hop: thing.hop, landed: walk ? Math.floor(walk.phase) : 0, lands: walk !== null && (walk.over > 0 || walk.lift > 0 || airborne(thing.parts[0])) }
}

describe('sound in the frame it lands', () => {
  it('holds for every landing in the game: stacks, leaps, hops and bounces in minutes of play as it comes, the float\'s tower and each thing of it, and every thing of a street coming in', () => {
    const seen = { stacks: 0, leaps: 0, hops: 0, bounces: 0, long: 0, tower: 0, clacks: 0, arrivals: 0, hopsIn: 0 }

    /** One frame of play, with every landing in it held to its sound. */
    const frame = (play: Play, label: string): void => {
      const was = new Map<Thing, Was>(play.things.map((thing) => [thing, before(thing)]))
      play.step(FRAME)
      let thumps = 0
      for (const [thing, then] of was) {
        // A stack hopping down from the breath: its thump.
        if (then.hop < 1 && thing.hop >= 1) {
          thumps += 1
          seen.stacks += 1
          expect(play.cues, label).toContainEqual({ type: 'setdown', parts: thing.parts, x: thing.sx, z: thing.sz })
          // It is on the street in this frame.
          expect(liftOf(thing), label).toBeCloseTo(0, 9)
        }
        // A step that leaves the street: one sound for each that has landed in this frame, and none for one still in the air.
        if (then.lands) {
          const now = thing.walk ? Math.floor(thing.walk.phase) : then.landed + 1, landed = now - then.landed
          const heard = play.cues.filter((cue) => cue.type === 'step' && cue.parts === thing.parts)
          expect(heard.length, label).toBe(landed)
          if (landed > 0) {
            for (const cue of heard) atOnce(cue)
            if (!thing.walk) expect(liftOf(thing), label).toBeCloseTo(0, 9)
            const bottom: Kind = thing.parts[0]
            if (thing.walk === null && thing.parts.length >= 2 && bottom === 'balloon' && thing.parts[thing.parts.length - 1] === 'balloon') seen.long += 1
            else if (bottom === 'hat') seen.hops += landed
            else if (bottom === 'balloon') seen.bounces += landed
            else seen.leaps += landed
          }
        }
      }
      // And no thump without a landing.
      const downs = play.cues.filter((cue) => cue.type === 'setdown')
      expect(downs.length, label).toBe(thumps)
      for (const cue of downs) atOnce(cue)
    }

    // Play as it comes, on the two fuller streets: taps on the street, on the hole and on things.
    for (const id of ['some', 'many']) {
      for (let seed = 1; seed <= 10; seed++) {
        const rng = makeRng(seed * 11 + 7)
        const play = new Play(world({ hole: { x: 5.2, z: 1.6 }, street: [...layStreet(id, 1 + (seed % 12))] }))
        for (let act = 0; act < 60; act++) {
          const pick = rng.next()
          if (pick < 0.4) play.press({ on: 'street', x: -6 + rng.next() * 12, z: -1.8 + rng.next() * 4 })
          else if (pick < 0.8) play.press({ on: 'hole', x: play.x, z: play.z })
          else if (play.things.length > 0) { const thing = play.things[Math.floor(rng.next() * play.things.length)]; play.press({ on: 'thing', thing, x: thing.x, z: thing.z }) }
          play.tap()
          play.cues.length = 0
          for (let i = 0; i < 3 + Math.floor(rng.next() * 70); i++) {
            frame(play, `${id} ${seed} act ${act} frame ${i}`)
            play.cues.length = 0
          }
        }
      }
    }

    // The hat hops and a balloon bounces out from under a burp, and a stack on the hat hops to where it stands.
    for (const kind of ['hat', 'balloon'] as const) {
      const play = new Play(world({ hole: { x: 0, z: 0 }, belly: ['pie', 'pie', 'pie', 'dog', 'tuba'], street: [{ parts: [kind], x: 1.3, z: 0.2 }, { parts: [kind, 'pie'], x: -1.5, z: 0.3 }] }))
      for (let burp = 0; burp < 2; burp++) {
        play.press({ on: 'hole', x: 0, z: 0 })
        play.tap()
        play.cues.length = 0
        for (let i = 0; i < 90; i++) { frame(play, `${kind} burp ${burp} frame ${i}`); play.cues.length = 0 }
      }
      play.press({ on: 'street', x: 4.5, z: 1.5 })
      play.tap()
      play.cues.length = 0
      for (let i = 0; i < 240; i++) { frame(play, `${kind} away frame ${i}`); play.cues.length = 0 }
    }

    // The float: the tower touches down, and then each thing of it as the tower tips over.
    for (const id of ['few', 'many']) {
      const parts = [...STOCK[id]], play = new Play(world({ breath: parts })), stage = new Stage()
      play.press({ on: 'street', x: -4.5, z: 1.5 })
      let cue: (Cue & { type: 'float' }) | null = null
      for (let i = 0; i < 60 && !cue; i++) {
        play.step(FRAME)
        for (const one of play.cues) if (one.type === 'float') cue = one
        play.cues.length = 0
      }
      expect(cue).not.toBeNull()
      const beats = floatBeats(stage, play, cue!.parts, { x: cue!.x, z: cue!.z }, [])
      const scene = new Scene(beats)
      scene.start(0, () => {})
      let heights: number[] = parts.map(() => 1), tower = true
      for (let time = OFF; time < sceneLength(beats) + 0.2; time += FRAME) {
        play.step(FRAME)
        scene.update(time)
        const float = stage.float
        if (float) {
          const now = float.parts.map((part) => part.y)
          if (float.tower) {
            const landed = now[0] < DOWN && heights[0] >= DOWN
            expect(play.cues.filter((one) => one.type === 'thud').length, `${id} at ${time}`).toBe(landed ? 1 : 0)
            if (landed) { seen.tower += 1; for (const one of play.cues) if (one.type === 'thud') atOnce(one) }
          } else if (!tower && float.gait === 0) {
            // Tipping: a clack for each thing that came down onto the street in this frame.
            const landed = now.filter((y, index) => y < DOWN && heights[index] >= DOWN).length
            const clacks = play.cues.filter((one) => one.type === 'clack')
            expect(clacks.length, `${id} at ${time}`).toBe(landed)
            seen.clacks += landed
            for (const one of clacks) atOnce(one)
          }
          tower = float.tower
          heights = now
        }
        play.cues.length = 0
      }
    }

    // A street coming in: each thing stops on its spot with its own sound, and one that hops or bounces in is heard as each hop lands.
    for (const [id, seed] of [['some', 9], ['many', 5], ['few', 2]] as const) {
      const play = new Play(world({ hole: { x: -3, z: 1 } })), stage = new Stage()
      showWaiting(stage, id, seed)
      enterOutcome({ v: 1 as const, position: id, finished: true, seed }, play)
      const beats = enterBeats(stage, play, 0.8), scene = new Scene(beats)
      scene.start(0, () => {})
      const gaits = new Map<Thing, number>(), coming = new Map<Thing, boolean>(play.things.map((thing) => [thing, true]))
      for (let time = OFF; time < sceneLength(beats) + 0.2; time += FRAME) {
        play.step(FRAME)
        scene.update(time)
        let stopped = 0
        for (const thing of play.things) {
          if (coming.get(thing) && !thing.coming) {
            stopped += 1
            expect(play.cues, `${id} at ${time}`).toContainEqual({ type: 'arrive', kind: thing.parts[0] })
            expect(liftOf(thing)).toBe(0)
          }
          if (airborne(thing.parts[0]) && coming.get(thing)) {
            const then = gaits.get(thing) ?? 0
            const landed = thing.coming ? Math.floor(thing.gait) - Math.floor(then) : 1
            const heard = play.cues.filter((one) => one.type === 'step' && one.parts === thing.parts)
            expect(heard.length, `${id} ${thing.parts[0]} at ${time}`).toBe(landed)
            seen.hopsIn += landed
            for (const one of heard) atOnce(one)
            gaits.set(thing, thing.gait)
          }
          coming.set(thing, thing.coming)
        }
        const arrives = play.cues.filter((one) => one.type === 'arrive')
        expect(arrives.length, `${id} at ${time}`).toBe(stopped)
        seen.arrivals += stopped
        for (const one of arrives) atOnce(one)
        play.cues.length = 0
      }
      expect(play.things.every((thing) => !thing.coming)).toBe(true)
    }

    // Every kind of landing was reached.
    expect(seen.stacks).toBeGreaterThan(20)
    expect(seen.leaps).toBeGreaterThan(5)
    expect(seen.hops).toBeGreaterThanOrEqual(4)
    expect(seen.bounces).toBeGreaterThanOrEqual(4)
    expect(seen.tower).toBe(2)
    expect(seen.clacks).toBe(STOCK.few.length + STOCK.many.length)
    expect(seen.arrivals).toBe(STOCK.some.length + STOCK.many.length + STOCK.few.length)
    expect(seen.hopsIn).toBeGreaterThan(10)
  })

  it('the long bounce of two balloons: its boing rises with it, and the landing at the end of it is heard in its frame', () => {
    const play = new Play(world({ breath: ['balloon', 'pie', 'balloon'], street: [{ parts: ['hat'], x: -5, z: 2 }] }))
    play.press({ on: 'street', x: 4, z: 0 })
    play.tap()
    play.cues.length = 0
    let stack: Thing | undefined, high = 0, set = -1, secret = -1, landed = -1
    for (let frame = 0; frame < 300 && landed < 0; frame++) {
      const walked = stack?.walk ?? null
      play.step(FRAME)
      stack = play.things.find((thing) => thing.parts.length === 3)
      if (play.cues.some((cue) => cue.type === 'setdown')) set = frame
      if (play.cues.some((cue) => cue.type === 'secret' && cue.which === 'bounce')) secret = frame
      if (stack) high = Math.max(high, liftOf(stack))
      const steps = play.cues.filter((cue) => cue.type === 'step')
      if (walked && stack && !stack.walk) {
        landed = frame
        expect(steps).toHaveLength(1)
        expect(liftOf(stack)).toBeCloseTo(0, 9)
        expect(stack.squash).toBeGreaterThan(0)
      } else expect(steps, `frame ${frame}`).toEqual([])
      play.cues.length = 0
    }
    // The hop down is heard as it lands, the long boing starts in that frame, and the bounce's own landing is heard at its end and not at its start.
    expect(set).toBeGreaterThanOrEqual(0)
    expect(secret).toBe(set)
    expect(landed).toBeGreaterThan(set + 60)
    expect(high).toBeGreaterThan(2)
  })
})
