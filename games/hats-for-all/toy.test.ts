import { describe, expect, it } from 'vitest'
import { hash } from './motion'
import { placeOf, type World } from './rules'
import { BODY, HAT_HEIGHT, SLAB } from './sizes'
import { ROW_Z, TILE_Z, holeX, spotX } from './stage'
import { Toy, type CreaturePose, type Target } from './toy'

/** The toy's own scene: three creatures and four hats, so one hat has no head. */
function scene(): World {
  return {
    crew: [{ kind: 'bop', spot: 1, hats: [] }, { kind: 'lanky', spot: 2, hats: [] }, { kind: 'wig', spot: 3, hats: [] }],
    tile: ['cone', 'dome', 'brim', 'cone'],
    loose: [], changes: [], guest: null, leaver: null, slips: 0,
  }
}

const pose = (): CreaturePose => ({ x: 0, y: 0, z: 0, squash: 1, lean: 0, gazeX: 0, gazeY: 0, pat: 0, mouth: 0, eyes: 1 })

function run(toy: Toy, seconds: number, each?: () => void): void {
  for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
    toy.step(1 / 60)
    each?.()
  }
}

function tap(toy: Toy, target: Target): void {
  toy.press(target)
  toy.release(target, true)
}

describe('the toy', () => {
  it('answers when the finger lands: the hat gives and the foam sounds before any lift or frame', () => {
    const toy = new Toy(scene())
    toy.press({ type: 'hat', hat: 0 })
    expect(toy.cues.length).toBe(1)
    toy.step(0)
    expect(toy.hatPose(0).squash).toBeLessThan(0.8)
    // Held, it stays down; let go without a tap, it springs back and stays in its hole.
    run(toy, 0.5)
    expect(toy.hatPose(0).squash).toBeLessThan(0.75)
    toy.release({ type: 'hat', hat: 0 }, false)
    run(toy, 1)
    expect(toy.hatPose(0).squash).toBeCloseTo(1, 1)
    expect(placeOf(toy.world, 0)).toEqual({ at: 'tile' })
  })

  it('pops a tapped hat out, turns it over in the air and lands it upright on the nearest bare head', () => {
    const toy = new Toy(scene())
    tap(toy, { type: 'hat', hat: 0 })
    let highest = 0, turned = 0
    run(toy, 0.3, () => { highest = Math.max(highest, toy.hatPose(0).y); turned = Math.max(turned, toy.hatPose(0).flip) })
    expect(highest).toBeGreaterThan(BODY.bop.top)
    expect(turned).toBeGreaterThan(1)
    run(toy, 3)
    const hat = toy.hatPose(0)
    expect(hat.up).toBe(1)
    expect(hat.flip).toBe(0)
    expect(hat.x).toBeCloseTo(spotX(1), 0)
    expect(hat.y).toBeCloseTo(BODY.bop.top, 0)
    // Out with a pop, down with a bap, and the creature says something: four voices and the press before them.
    expect(toy.cues.length).toBeGreaterThanOrEqual(4)
  })

  it('squashes the creature a hat lands on, and it springs back', () => {
    const toy = new Toy(scene())
    // The hat at the far right goes to the jelly loaf, the nearest bare head.
    tap(toy, { type: 'hat', hat: 3 })
    let lowest = 1
    run(toy, 4, () => { lowest = Math.min(lowest, toy.creaturePose(3, pose()).squash) })
    expect(placeOf(toy.world, 3)).toEqual({ at: 'head', spot: 3, level: 0 })
    expect(lowest).toBeLessThan(0.8)
    expect(toy.creaturePose(3, pose()).squash).toBeCloseTo(1, 0)
  })

  it('presses a hat tapped on a head back into its own hole', () => {
    const toy = new Toy(scene())
    tap(toy, { type: 'hat', hat: 1 })
    run(toy, 2)
    tap(toy, { type: 'hat', hat: 1 })
    run(toy, 2)
    const hat = toy.hatPose(1)
    expect([hat.x, hat.y, hat.z, hat.up]).toEqual([holeX(1, 4), SLAB / 2, TILE_Z + HAT_HEIGHT.dome / 2, 0])
  })

  it('lets the hat with no head come out anyway, and it scuttles on the floor in front of the row', () => {
    const toy = new Toy(scene())
    for (const hat of [0, 1, 2, 3]) { tap(toy, { type: 'hat', hat }); run(toy, 1.5) }
    expect(placeOf(toy.world, 3).at).toBe('loose')
    const before = toy.cues.length, from = toy.hatPose(3).x
    run(toy, 2)
    expect(toy.cues.length).toBeGreaterThan(before + 3)
    expect(toy.hatPose(3).x).not.toBe(from)
    expect(toy.hatPose(3).z).toBeGreaterThan(ROW_Z + 1)
  })

  it('makes whatever stands near a poke in the floor hop, and come down again', () => {
    const toy = new Toy(scene())
    toy.press({ type: 'floor', x: spotX(1), z: ROW_Z + 1.5 })
    let highest = 0
    run(toy, 0.4, () => { highest = Math.max(highest, toy.creaturePose(1, pose()).y) })
    expect(highest).toBeGreaterThan(0.15)
    expect(toy.dimples.length).toBe(1)
    run(toy, 3)
    expect(toy.creaturePose(1, pose()).y).toBeCloseTo(0, 1)
    expect(toy.dimples.length).toBe(0)
  })

  it('stays finite and above the floor through anything a small hand does', () => {
    const toy = new Toy(scene())
    for (let i = 0; i < 400; i++) {
      const r = hash(i), which = Math.floor(hash(i + 0.5) * 5)
      const target: Target = r < 0.5 ? { type: 'hat', hat: which % 4 } : r < 0.75 ? { type: 'creature', spot: which } : r < 0.85 ? { type: 'arch' } : { type: 'floor', x: which * 3 - 6, z: 1 }
      toy.press(target)
      toy.release(target, hash(i + 0.25) < 0.8)
      run(toy, hash(i + 0.75) * 0.5, () => {
        for (let hat = 0; hat < 4; hat++) {
          const p = toy.hatPose(hat)
          for (const n of [p.x, p.y, p.z, p.up, p.flip, p.tilt, p.squash]) expect(Number.isFinite(n)).toBe(true)
          expect(p.y).toBeGreaterThanOrEqual(0)
          expect(p.squash).toBeGreaterThan(0.2)
        }
        for (const spot of toy.spots) {
          const c = toy.creaturePose(spot, pose())
          expect(Number.isFinite(c.squash + c.lean + c.y + c.gazeX + c.gazeY)).toBe(true)
          expect(c.y).toBeGreaterThanOrEqual(0)
          expect(c.squash).toBeGreaterThan(0.3)
        }
      })
    }
  })
})
