import { describe, expect, it } from 'vitest'
import type { Build } from './build'
import { carry, drain, launch, poke, ringBehind, run, sail, saved, worldWith } from './drive'
import { press, tap } from './finger'
import { FRAME, LINE, MEET, PLACES, frameLeft } from './layout'
import { traitsOf } from './traits'
import { boatShown, buildNow } from './world'

// The brook journey is the child's: the boat goes where the water and the
// child's rings send it, nothing hurries it, a boat held at a place stays
// held until the child frees it or lifts it, and no place is a failure.

const BOATS: Record<string, Partial<Build>> = {
  plain: { masts: ['twig', null], sails: ['birch', null] },
  broad: { masts: ['twig', null], sails: ['maple', null] },
  bare: {},
  two: { masts: ['twig', 'stem'], sails: ['birch', 'feather'] },
  heavy: { masts: ['twig', null], sails: ['birch', null], deck: ['pebble'] },
  nut: { hull: 'walnut', masts: ['twig', null], sails: ['birch', null], deck: ['berry'] },
  tall: { masts: ['stalk', null], sails: ['maple', null] },
  pod: { hull: 'pod', deck: ['cap', 'berry', 'pebble'] },
  all: { hull: 'walnut', masts: ['stalk', 'twig'], sails: ['maple', 'feather'], deck: ['pebble', 'berry', 'cap'] },
}

describe('the brook journey', () => {
  for (const [name, build] of Object.entries(BOATS)) {
    it(`takes the ${name} boat from the eddy to the pond, through the six places in their order`, () => {
      const w = worldWith(build)
      launch(w)
      expect(w.boat.mode, 'afloat in the eddy').toBe('afloat')
      const seen: number[] = []
      const done = sail(w, (now) => {
        if (now.journey.reach !== null && seen[seen.length - 1] !== now.journey.reach) seen.push(now.journey.reach)
        return now.finished
      })
      expect(done, `reached ${seen.join(',')}, phase ${w.journey.phase} at frame ${w.frame}, x ${Math.round(w.boat.x)}`).toBe(true)
      expect(seen).toEqual([0, 1, 2, 3, 4, 5])
      expect(w.where).toBe('pond')
      expect(w.pond.length).toBe(1)
      // The boat reaches the pond as built: nothing was taken away on the way.
      expect(buildNow(w)).toEqual(w.pond[0])
      run(w, 12)
      expect(w.scene, 'the lamp scene is over and stays').toBeNull()
      expect(w.acts.length).toBe(0)
    })
  }

  it('keeps the boat inside its frame at every step of every journey', () => {
    for (const build of Object.values(BOATS)) {
      const w = worldWith(build)
      launch(w)
      sail(w, (now) => {
        if (now.boat.mode === 'brook' && now.journey.phase !== 'pan' && now.journey.phase !== 'out') {
          const x = now.boat.x + now.stage.boat.dx
          expect(x, `${now.journey.phase} at ${PLACES[now.frame]}`).toBeGreaterThan(60)
          expect(x, `${now.journey.phase} at ${PLACES[now.frame]}`).toBeLessThan(FRAME - 40)
          expect(now.cam).toBe(frameLeft(now.frame))
        }
        return now.finished
      })
    }
  })

  it('never hurries the boat: left alone on the eddy it stays there, and held at a place it stays held', () => {
    const w = worldWith(BOATS.heavy)
    launch(w)
    const before = saved(w)
    run(w, 30)
    expect(saved(w)).toBe(before)
    sail(w, (now) => now.journey.stuck)
    expect(PLACES[w.frame]).toBe('stones')
    const x = w.boat.x
    run(w, 30)
    expect(w.journey.phase).toBe('held')
    expect(w.boat.x).toBe(x)
    // A ring in front of it does not free it; a ring from behind does.
    poke(w, w.boat.x - 260, LINE + 40)
    run(w, 2)
    expect(w.journey.stuck).toBe(true)
    ringBehind(w)
    run(w, 1)
    expect(w.journey.stuck).toBe(false)
    expect(w.boat.x + w.stage.boat.dx).toBeLessThan(x)
  })

  it('frees a held boat when the child lifts it, and answers it again where it is set down', () => {
    const w = worldWith(BOATS.heavy)
    launch(w)
    sail(w, (now) => now.journey.stuck)
    // It is taken where it is drawn: the sill's pose has moved the picture.
    const at = boatShown(w)
    carry(w, { x: at.x, y: at.y - 30 }, { x: MEET.stones.x - 320, y: LINE - 40 })
    expect(w.journey.stuck).toBe(false)
    run(w, 1)
    expect(w.journey.phase).toBe('leave')
    expect(sail(w, (now) => now.finished)).toBe(true)
  })

  it('holds a boat with no sail short of the lilies until a ring from behind', () => {
    const w = worldWith(BOATS.bare)
    launch(w)
    let held = false
    sail(w, (now) => { held = held || (now.frame === 5 && now.journey.stuck); return held })
    expect(held).toBe(true)
    expect(w.finished).toBe(false)
    run(w, 20)
    expect(w.finished).toBe(false)
    ringBehind(w)
    run(w, 2)
    expect(w.finished).toBe(true)
  })

  it('answers every trait the boat has at a place, one after the other', () => {
    const w = worldWith(BOATS.all)
    const traits = traitsOf(buildNow(w))
    expect(traits.length).toBeGreaterThanOrEqual(4)
    launch(w)
    const ids = new Set<string>()
    sail(w, (now) => { for (const one of now.acts) if (one.brook) ids.add(one.act.id); return now.finished })
    for (const place of ['reeds', 'sprite', 'stones', 'branch'] as const) {
      const here = [...ids].filter((id) => id.startsWith(`${place}:`))
      expect(here.length, place).toBeGreaterThanOrEqual(traits.length)
    }
    expect([...ids].some((id) => id.startsWith('fall:'))).toBe(true)
  })

  it('lets a tap on one of the folk who is busy with the boat pass, and the journey goes on', () => {
    const w = worldWith(BOATS.bare)
    launch(w)
    sail(w, (now) => now.acts.some((one) => one.act.id === 'reeds:nosail'))
    run(w, 0.5)
    drain(w)
    press(w, 930, 500)
    tap(w)
    expect(drain(w).length, 'the touch is still answered').toBeGreaterThan(0)
    expect(w.acts.some((one) => one.act.id === 'reeds:nosail')).toBe(true)
    expect(sail(w, (now) => now.frame >= 1)).toBe(true)
  })
})
