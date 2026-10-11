import { describe, expect, it } from 'vitest'
import { Island } from './island'
import type { Target } from './pick'
import { TAP, type Cue } from './voices'
import { RIM_SEAT } from './place'
import { makeRng } from './rng'
import { deserialize, fresh, serialize } from './save'
import { BARE_S, REAR_S, WASH_S } from './wash'
import { BOAT_LANE_R, FOOT, GAP, KINDS, LAND_Y, RIM_OUT, SEA_LANE_R, TALL, TRAY_TOP, TRAY_Z, lidAt, slotOf, type Kind } from './toys'

const run = (island: Island, seconds: number): void => { for (let t = 0; t < seconds; t += 1 / 60) island.step(1 / 60) }
const quiet = (island: Island): void => { island.sounds.length = 0; island.dirty = island.urgent = false }
const names = (island: Island): string[] => island.sounds.map((sound) => sound.name)
const land = (x: number, z: number): Target => ({ kind: 'land', x, z })
const where = (island: Island, kind: Kind): string => island.state.toys[KINDS.indexOf(kind)].where
const shown = (island: Island, kind: Kind) => island.show().toys[KINDS.indexOf(kind)]

/** Takes a toy from the tray and sets it down with two taps, and lets it land. */
function set(island: Island, kind: Kind, target: Target): void {
  island.press({ kind: 'slot', toy: kind })
  island.release()
  island.press(target)
  island.release()
  run(island, 1)
}

describe('setting a toy down', () => {
  it('answers the finger on a toy in the tray at once: it is in the hand, with a sound, and nothing is saved', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'slot', toy: 'house' })
    expect(island.hand).toBe('house')
    // The tok of the finger, and the toy's own voice with it: the house says its door.
    expect(names(island)).toEqual(['tok', 'door'])
    expect(island.dirty).toBe(false)
    // It has left its slot before any time passes.
    expect(shown(island, 'house').y).toBeGreaterThan(TRAY_TOP + 1)
  })

  it('has each toy say who it is as it leaves its slot, each with a voice of its own', () => {
    const voices = KINDS.map((kind) => {
      const island = new Island(fresh(4))
      island.press({ kind: 'slot', toy: kind })
      expect(island.handFor).toBe(0)
      return names(island).join(' ')
    })
    expect(new Set(voices).size).toBe(KINDS.length)
    for (const voice of voices) expect(voice.startsWith('tok ')).toBe(true)
  })

  it('saves the toy where it will land the moment the island is tapped, before it has landed', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'slot', toy: 'house' })
    island.release()
    island.press(land(1, 0.5))
    expect(island.state.toys[4]).toEqual({ kind: 'house', where: 'land', x: 1, z: 0.5 })
    expect(island.dirty).toBe(true)
    expect(island.hand).toBeNull()
    expect(shown(island, 'house').on).toBe('world')
  })

  it('lands it with a knock and its own first sound, and it stands on the island from then on', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'slot', toy: 'house' })
    island.release()
    island.press(land(1, 0.5))
    quiet(island)
    run(island, 0.5)
    expect(names(island)).toContain('knock')
    expect(names(island)).toContain('door')
    const house = shown(island, 'house')
    expect(house.on).toBe('island')
    expect(house.x).toBe(1)
    expect(house.y).toBeCloseTo(LAND_Y, 1)
  })

  it('knocks lower the heavier the toy', () => {
    const pitch = (kind: Kind): number => {
      const island = new Island(fresh(4))
      island.press({ kind: 'slot', toy: kind })
      island.press(land(0, 1))
      quiet(island)
      // (The cat sits there, so the toy is a fifth of a second longer on its way.)
      run(island, 0.8)
      return island.sounds.find((sound) => sound.name === 'knock')!.pitch!
    }
    expect(pitch('lighthouse')).toBeLessThan(pitch('house'))
    expect(pitch('house')).toBeLessThan(pitch('sheep'))
  })

  it('splashes a toy set down in the sea, and stands it on the ring of the sea', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'slot', toy: 'house' })
    island.press({ kind: 'sea', x: 0, z: 4.4 })
    quiet(island)
    run(island, 0.5)
    expect(names(island)).toContain('splash')
    const house = island.state.toys[4]
    expect(house.where).toBe('sea')
    expect(Math.hypot(house.x, house.z)).toBeCloseTo(SEA_LANE_R, 1)
  })

  it('sets a toy aimed at a toy down beside it', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(0, 0))
    island.press({ kind: 'slot', toy: 'tree' })
    island.release()
    island.press({ kind: 'toy', toy: 'house' })
    const tree = island.state.toys[3], house = island.state.toys[4]
    expect(tree.where).toBe('land')
    expect(Math.hypot(tree.x - house.x, tree.z - house.z)).toBeGreaterThanOrEqual(FOOT.tree + FOOT.house + GAP - 1e-6)
    quiet(island)
    run(island, 0.5)
    expect(names(island)).toContain('bump')
  })

  it('sets a toy let go on the rim or over open sea down just inside the rim', () => {
    for (const target of [{ kind: 'rim', x: 6.2, z: 0 }, { kind: 'open', x: 9, z: -1 }] as Target[]) {
      const island = new Island(fresh(4))
      island.press({ kind: 'slot', toy: 'tree' })
      island.press(target)
      expect(where(island, 'tree')).toBe('sea')
      expect(island.state.toys[3].x).toBeGreaterThan(3)
    }
  })

  it('puts a toy in the hand back when the tray or another toy of the tray is tapped', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'slot', toy: 'house' })
    island.press({ kind: 'tray', x: 0, z: TRAY_Z })
    expect(island.hand).toBeNull()
    island.press({ kind: 'slot', toy: 'house' })
    island.press({ kind: 'slot', toy: 'tree' })
    expect(island.hand).toBe('tree')
    expect(island.dirty).toBe(false)
    expect(island.state.toys.every((toy) => toy.where === 'tray')).toBe(true)
  })

  it('spins a toy that is tapped again in the hand, and does no harm', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'slot', toy: 'house' })
    quiet(island)
    island.press({ kind: 'slot', toy: 'house' })
    expect(names(island)).toEqual(['whip'])
    expect(island.hand).toBe('house')
  })

  it('answers every kind of target with a sound', () => {
    const targets: Target[] = [{ kind: 'slot', toy: 'boat' }, { kind: 'cat' }, { kind: 'gull' }, { kind: 'wave' }, { kind: 'whale' }, land(0, 2), { kind: 'sea', x: 4, z: 0 }, { kind: 'rim', x: 6.2, z: 0 }, { kind: 'open', x: 9, z: 0 }, { kind: 'tray', x: 0, z: TRAY_Z }, { kind: 'sky' }]
    for (const target of targets) {
      const island = new Island(fresh(2))
      island.press(target)
      expect(island.sounds.length, target.kind).toBeGreaterThan(0)
    }
    const island = new Island(fresh(2))
    quiet(island)
    island.press({ kind: 'toy', toy: 'house' })
    expect(names(island)).toEqual(['lid'])
  })
})

describe('carrying a toy', () => {
  const carry = (island: Island, kind: Kind, x: number, z: number): void => {
    island.press({ kind: 'slot', toy: kind })
    island.dragStart()
    island.drag({ x, z })
  }

  it('shows where it will land under the fingertip all the way, and lands it there', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'slot', toy: 'tree' })
    island.dragStart()
    for (const [x, z] of [[0.4, 2.2], [1.4, 1.2], [1.8, 0.2], [1.2, -0.4]]) {
      island.drag({ x, z })
      run(island, 0.2)
      const spot = island.show().spot
      expect(spot && Math.hypot(spot.x - x, spot.z - z)).toBeLessThan(0.01)
    }
    island.drop()
    run(island, 1.5)
    const tree = shown(island, 'tree')
    expect(Math.hypot(tree.x - 1.2, tree.z + 0.4)).toBeLessThan(0.01)
  })

  it('has the cat shrink back from a toy that is carried toward its seat, and get out of its way when it is over the seat', () => {
    const island = new Island(fresh(4))
    run(island, 1)
    const cat = { x: island.show().cat.x, z: island.show().cat.z }, wary = (): number => (island as unknown as { cat: { doing: { wary: number } } }).cat.doing.wary
    const moved = (): number => Math.hypot(island.show().cat.x - cat.x, island.show().cat.z - cat.z)
    island.press({ kind: 'slot', toy: 'sheep' })
    island.dragStart()
    // Far off, the cat sits as it sat.
    const near = FOOT.sheep + 0.84 + GAP
    island.drag({ x: cat.x, z: cat.z + near + 3 })
    run(island, 0.5)
    expect(wary()).toBeLessThan(0.05)
    expect(moved()).toBeLessThan(0.01)
    // The toy comes nearer, from the tray: it shrinks back, and stays.
    island.drag({ x: cat.x, z: cat.z + near + 0.3 })
    run(island, 0.5)
    expect(wary()).toBeGreaterThan(0.7)
    expect(moved()).toBeLessThan(0.01)
    // The ring is on its seat: it goes, before the toy is let go.
    island.drag({ x: cat.x, z: cat.z })
    run(island, 1)
    // No further than it has to: the sheep's ground reaches the seats next to this one, so it is the one after.
    expect(moved()).toBeGreaterThan(1)
    expect(moved()).toBeLessThan(3.1)
    expect(where(island, 'sheep')).toBe('tray')
  })

  it('sets it down where the finger lets go, saved at that moment', () => {
    const island = new Island(fresh(4))
    carry(island, 'sheep', 1, 1)
    expect(island.dirty).toBe(false)
    expect(island.show().spot).not.toBeNull()
    island.drop()
    expect(island.state.toys[2]).toEqual({ kind: 'sheep', where: 'land', x: 1, z: 1 })
    expect(island.dirty).toBe(true)
  })

  it('waits in the air for a finger that lifted for a moment', () => {
    const island = new Island(fresh(4))
    carry(island, 'sheep', 1, 1)
    island.lift()
    run(island, 0.2)
    expect(where(island, 'sheep')).toBe('tray')
    expect(shown(island, 'sheep').y).toBeGreaterThan(LAND_Y + 0.5)
    island.drag({ x: -1, z: 1 })
    island.drop()
    expect(island.state.toys[2].x).toBe(-1)
  })

  it('goes back where it came from when the drag is taken away, and nothing is changed', () => {
    const island = new Island(fresh(4))
    const before = JSON.stringify(island.state)
    carry(island, 'sheep', 1, 1)
    island.cancel()
    run(island, 1)
    expect(JSON.stringify(island.state)).toBe(before)
    expect(island.dirty).toBe(false)
    const sheep = shown(island, 'sheep')
    expect(sheep.x).toBe(slotOf('sheep').x)
    expect(sheep.y).toBeCloseTo(TRAY_TOP, 1)
  })

  it('puts a standing toy back on its own spot when its drag is taken away', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1, 0.5))
    quiet(island)
    island.press({ kind: 'toy', toy: 'house' })
    island.dragStart()
    island.drag({ x: -2, z: 0 })
    island.cancel()
    run(island, 1)
    expect(island.state.toys[4]).toEqual({ kind: 'house', where: 'land', x: 1, z: 0.5 })
    expect(island.dirty).toBe(false)
  })

  it('counts a drag from the tray as done from half-way to the rim, and takes the toy back before that', () => {
    const half = (TRAY_Z + RIM_OUT) / 2
    const near = new Island(fresh(4))
    carry(near, 'tree', 0, half + 0.3)
    near.drop()
    expect(where(near, 'tree')).toBe('tray')
    expect(near.dirty).toBe(false)
    const far = new Island(fresh(4))
    carry(far, 'tree', 0, half - 0.4)
    far.drop()
    expect(where(far, 'tree')).toBe('sea')
  })

  it('takes a toy carried back over the tray home', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1, 0.5))
    island.press({ kind: 'toy', toy: 'house' })
    island.dragStart()
    island.drag({ x: 0, z: TRAY_Z })
    island.drop()
    expect(where(island, 'house')).toBe('tray')
  })
})

describe('turning the island', () => {
  it('turns one peg on for a tap on the rim, with a clunk, and saves the turn when it has come to rest', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'rim', x: 6.2, z: 0 })
    expect(names(island)).toEqual(['clunk'])
    island.release()
    quiet(island)
    run(island, 4)
    expect(island.state.turn).toBeCloseTo(Math.PI / 4, 1)
    expect(island.dirty).toBe(true)
    expect(island.moving).toBe(false)
    expect(names(island)).toContain('rumble')
  })

  it('follows a finger that slides, and runs on when it is flicked', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'rim', x: 6.2, z: 0 })
    island.dragStart()
    for (let i = 1; i <= 20; i++) {
      const a = i * 0.03
      island.drag({ x: Math.cos(a) * 6.2, z: Math.sin(a) * 6.2 })
      island.step(1 / 60)
    }
    const held = island.state.turn
    // The point under the finger stayed under it.
    expect(Math.PI * 2 - held).toBeCloseTo(0.6, 1)
    island.drop()
    run(island, 2)
    expect(Math.PI * 2 - island.state.turn).toBeGreaterThan(0.8)
  })

  it('runs on after a flick as the Mount tells it: the lift, a third of a second, and then the end of the drag', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'rim', x: 6.2, z: 0 })
    island.dragStart()
    for (let i = 1; i <= 12; i++) {
      const a = i * 0.07
      island.drag({ x: Math.cos(a) * 6.2, z: Math.sin(a) * 6.2 })
      island.step(1 / 60)
    }
    const fast = Math.abs(island.turning)
    expect(fast).toBeGreaterThan(2)
    // The finger leaves the glass. The drag is not over for the Mount for another 0.3 s, in case the finger comes back.
    island.lift()
    const lifted = island.state.turn
    run(island, 0.3)
    // It has run on meanwhile, and is still running.
    expect(Math.abs(island.turning)).toBeGreaterThan(fast * 0.2)
    const run1 = Math.abs(lifted - island.state.turn)
    expect(run1).toBeGreaterThan(0.3)
    island.drop()
    expect(Math.abs(island.turning)).toBeGreaterThan(fast * 0.2)
    const dropped = island.state.turn
    run(island, 0.5)
    expect(Math.abs(dropped - island.state.turn)).toBeGreaterThan(0.1)
    // And comes to rest by itself, and is saved there.
    run(island, 8)
    expect(island.moving).toBe(false)
    expect(island.dirty).toBe(true)
  })

  it('is taken hold of again by a finger that comes back to the rim after a flick: each stroke of a scrub turns it, with a clunk, and a finger that stays stops it', () => {
    const island = new Island(fresh(4))
    /** One stroke along the rim, from the angle `from`, as far as `by`: the finger slides, and leaves the glass. */
    const stroke = (from: number, by: number): void => {
      for (let i = 0; i <= 8; i++) {
        const a = from + (by * i) / 8
        island.drag({ x: Math.cos(a) * 6.2, z: Math.sin(a) * 6.2 })
        island.step(1 / 60)
      }
      island.lift()
    }
    island.press({ kind: 'rim', x: 6.2, z: 0 })
    island.dragStart()
    stroke(0, 0.5)
    quiet(island)
    // The finger is back within a fifth of a second each time: the Mount sends no press, only the slide (input.ts).
    for (const [from, by] of [[0, 0.5], [0.5, -0.5], [0, 0.5]] as const) {
      run(island, 0.15)
      const before = island.state.turn
      quiet(island)
      // It lands: the island is held where the finger is, with a clunk, and no longer runs on.
      island.drag({ x: Math.cos(from) * 6.2, z: Math.sin(from) * 6.2 })
      expect(names(island)).toEqual(['clunk'])
      const held = island.state.turn
      expect(held).toBe(before)
      stroke(from, by)
      // The point under the finger stayed under it: the island turned as far as the finger slid, the way it slid.
      expect(Math.sin(held - island.state.turn - by)).toBeCloseTo(0, 1)
      expect(Math.cos(held - island.state.turn - by)).toBeGreaterThan(0.9)
    }
    // It runs on from the last stroke. A finger that comes back and stays stops it.
    run(island, 0.1)
    expect(Math.abs(island.turning)).toBeGreaterThan(1)
    island.drag({ x: 6.2, z: 0 })
    const stopped = island.state.turn
    run(island, 0.6)
    expect(island.turning).toBe(0)
    expect(island.state.turn).toBe(stopped)
    // The drag ends there: the island stays, and is saved.
    island.drop()
    run(island, 1)
    expect(island.state.turn).toBe(stopped)
    expect(island.moving).toBe(false)
  })

  it('turns from bare land too, after its thump', () => {
    const island = new Island(fresh(4))
    island.press(land(2, 0))
    expect(names(island)).toEqual(['thump'])
    island.dragStart()
    island.drag({ x: 0, z: 2 })
    expect(island.state.turn).not.toBe(0)
  })

  it('carries the toys round with it, and leaves their saved places alone', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1, 0.5))
    const before = { ...island.state.toys[4] }
    island.press({ kind: 'rim', x: 6.2, z: 0 })
    island.release()
    run(island, 4)
    expect(island.state.toys[4]).toEqual(before)
    expect(island.show().turn).toBeCloseTo(Math.PI / 4, 1)
  })
})

describe('neighbours', () => {
  it('sends the sheep to the tree in one bound, whichever of the two is set down second', () => {
    for (const order of [['tree', 'sheep'], ['sheep', 'tree']] as const) {
      const island = new Island(fresh(4))
      set(island, order[0], land(order[0] === 'tree' ? -1 : 1.5, 0))
      set(island, order[1], land(order[1] === 'tree' ? -1 : 1.5, 0))
      run(island, 1)
      const sheep = island.state.toys[2], tree = island.state.toys[3]
      expect(Math.hypot(sheep.x - tree.x, sheep.z - tree.z)).toBeCloseTo(FOOT.sheep + FOOT.tree + GAP + 0.02, 1)
      expect(shown(island, 'sheep').x).toBeCloseTo(sheep.x, 2)
    }
  })

  it('lets the sheep eat the crown small, and pops it back', () => {
    const island = new Island(fresh(4))
    set(island, 'tree', land(-1, 0))
    set(island, 'sheep', land(1.5, 0))
    quiet(island)
    let least = 1
    for (let i = 0; i < 600; i++) {
      island.step(1 / 60)
      least = Math.min(least, shown(island, 'tree').crown)
    }
    expect(least).toBeLessThan(0.6)
    expect(names(island)).toContain('crunch')
    expect(names(island)).toContain('pop')
    expect(names(island)).toContain('hic')
  })

  it('stands the sheep in the boat, and takes it home with the boat', () => {
    const island = new Island(fresh(4))
    set(island, 'boat', { kind: 'sea', x: 5, z: 0 })
    expect(Math.hypot(island.state.toys[1].x, island.state.toys[1].z)).toBeCloseTo(BOAT_LANE_R, 1)
    island.press({ kind: 'slot', toy: 'sheep' })
    island.release()
    island.press({ kind: 'toy', toy: 'boat' })
    expect(where(island, 'sheep')).toBe('boat')
    run(island, 1)
    island.press({ kind: 'toy', toy: 'boat' })
    island.dragStart()
    island.drag({ x: 0, z: TRAY_Z })
    island.drop()
    expect(where(island, 'boat')).toBe('tray')
    expect(where(island, 'sheep')).toBe('tray')
  })

  it('moves the cat off a seat a toy is set down on, with a yowl', () => {
    const island = new Island(fresh(4))
    const before = island.show().cat
    const seat = { x: before.x, z: before.z }
    island.press({ kind: 'slot', toy: 'house' })
    island.release()
    quiet(island)
    island.press({ kind: 'cat' })
    run(island, 1.2)
    expect(names(island)).toContain('mrow')
    const cat = island.show().cat, house = island.state.toys[4]
    expect(Math.hypot(house.x - seat.x, house.z - seat.z)).toBeLessThan(0.2)
    expect(Math.hypot(cat.x - house.x, cat.z - house.z)).toBeGreaterThan(FOOT.house + 0.8)
  })

  it('sends the gull to ride the smoke of a house on the land, and home when the house is gone', () => {
    const island = new Island(fresh(4))
    const buoy = { ...island.show().gull }
    set(island, 'house', land(1, 0.5))
    run(island, 1.5)
    const riding = island.show().gull
    expect(Math.hypot(riding.x - 1, riding.z - 0.5)).toBeLessThan(1)
    expect(riding.pose.spread).toBe(1)
    island.press({ kind: 'toy', toy: 'house' })
    island.dragStart()
    island.drag({ x: 0, z: TRAY_Z })
    island.drop()
    run(island, 2)
    expect(island.show().gull.x).toBeCloseTo(buoy.x, 2)
  })
})

/** Steps the island and gathers what is heard, calling `each` after every step. */
function listen(island: Island, seconds: number, each: () => void = () => {}): string[] {
  const heard: string[] = []
  for (let t = 0; t < seconds; t += 1 / 60) {
    island.step(1 / 60)
    heard.push(...names(island))
    island.sounds.length = 0
    each()
  }
  return heard
}

/** Spins the island fast by a finger on the rim for that long, and lets go. */
function spin(island: Island, seconds: number, each: () => void = () => {}): string[] {
  const heard: string[] = []
  island.press({ kind: 'rim', x: 6.5, z: 0 })
  island.dragStart()
  for (let i = 1; i <= seconds * 60; i++) {
    const a = i * 0.16
    island.drag({ x: Math.cos(a) * 6.5, z: Math.sin(a) * 6.5 })
    island.step(1 / 60)
    heard.push(...names(island))
    island.sounds.length = 0
    each()
  }
  island.drop()
  return heard
}

describe('nothing goes through anything', () => {
  it('swings a leap of the cat round the gull that rides the smoke, and never takes it through the gull', () => {
    const rng = makeRng(11)
    let leaps = 0
    for (let round = 0; round < 40; round++) {
      // A first visit at two: the house stands on the land and the gull rides its smoke.
      const island = new Island(fresh(2))
      run(island, 1)
      for (const kind of ['lighthouse', 'tree', 'sheep', 'boat'] as const) {
        const a = rng.next() * Math.PI * 2, r = rng.next() * 2.4
        island.press({ kind: 'slot', toy: kind })
        island.release()
        island.press(land(Math.cos(a) * r, Math.sin(a) * r))
        island.release()
        let before = { ...island.show().gull }
        for (let t = 0; t < 1.5; t += 1 / 60) {
          island.step(1 / 60)
          const frame = island.show(), cat = frame.cat, gull = frame.gull
          // The gull where it rides, not on its way there.
          const rides = Math.hypot(gull.x - before.x, gull.z - before.z) < 0.001 && gull.y > LAND_Y + TALL.house
          before = { x: gull.x, y: gull.y, z: gull.z } as typeof before
          if (cat.y > LAND_Y + 0.2) leaps += 1
          if (!rides || cat.y + 2.3 < gull.y - 0.2 || cat.y > gull.y + 1.9) continue
          expect(Math.hypot(cat.x - gull.x, cat.z - gull.z)).toBeGreaterThan(1.5)
        }
      }
    }
    expect(leaps).toBeGreaterThan(200)
  })

  it('has the cat out from under a toy that is set down on its seat before the toy comes down there', () => {
    for (const kind of KINDS) {
      const island = new Island(fresh(4))
      run(island, 1)
      const seat = { x: island.show().cat.x, z: island.show().cat.z }
      island.press({ kind: 'slot', toy: kind })
      island.release()
      run(island, 0.2)
      island.press(land(seat.x, seat.z))
      island.release()
      let least = Infinity
      for (let i = 0; i < 60; i++) {
        island.step(1 / 60)
        const cat = island.show().cat, toy = shown(island, kind)
        // While the two are at one height: the cat as a post as wide as its body, the toy as wide as its ground.
        if (toy.y < cat.y + cat.pose.y + 2.3 && cat.y + cat.pose.y < toy.y + TALL[kind]) least = Math.min(least, Math.hypot(cat.x - toy.x, cat.z - toy.z) - FOOT[kind] - 0.7)
      }
      expect(least).toBeGreaterThan(-0.05)
      // And the toy stands where the cat sat.
      expect(Math.hypot(shown(island, kind).x - seat.x, shown(island, kind).z - seat.z)).toBeLessThan(0.01)
    }
  })

  it('flies a toy up and over a tall toy that stands on its way', () => {
    const island = new Island(fresh(4))
    set(island, 'lighthouse', land(0, 0))
    island.press({ kind: 'slot', toy: 'house' })
    island.release()
    island.press(land(-0.8, -1.9))
    island.release()
    let over = 0
    listen(island, 1, () => {
      const house = shown(island, 'house'), tower = shown(island, 'lighthouse')
      if (Math.hypot(house.x - tower.x, house.z - tower.z) < FOOT.house + FOOT.lighthouse) {
        over += 1
        expect(house.y).toBeGreaterThanOrEqual(LAND_Y + TALL.lighthouse)
      }
    })
    expect(over).toBeGreaterThan(2)
    expect(where(island, 'house')).toBe('land')
    expect(shown(island, 'house').y).toBeCloseTo(LAND_Y, 1)
  })

  it('lifts a carried toy over whatever the finger takes it across, however fast', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(0, 1))
    island.press({ kind: 'slot', toy: 'sheep' })
    island.dragStart()
    // One jump of the finger from the tray to right over the house.
    island.drag({ x: 0.2, z: 1.1 })
    expect(shown(island, 'sheep').y).toBeGreaterThanOrEqual(LAND_Y + TALL.house)
    for (let x = 4; x >= -4; x -= 0.25) {
      island.drag({ x, z: 1.3 })
      island.step(1 / 60)
      const sheep = shown(island, 'sheep')
      if (Math.abs(x) < FOOT.sheep + FOOT.house) expect(sheep.y).toBeGreaterThanOrEqual(LAND_Y + TALL.house)
    }
    island.cancel()
  })

  it('carries a toy round a toy it cannot clear inside the frame, on the side of the child, with its ring under the finger', () => {
    const island = new Island(fresh(4))
    set(island, 'lighthouse', land(0, -0.5))
    island.press({ kind: 'slot', toy: 'sheep' })
    island.dragStart()
    let last = { x: 4, z: 9 }
    for (let x = 4; x >= -4; x -= 0.1) {
      // Straight through the lighthouse, a little behind its middle.
      island.drag({ x, z: -0.6 })
      island.step(1 / 60)
      const sheep = shown(island, 'sheep'), off = Math.hypot(sheep.x, sheep.z + 0.5)
      // Never in it, never over it, and under the lid.
      expect(off).toBeGreaterThanOrEqual(FOOT.sheep + FOOT.lighthouse - 1e-6)
      expect(sheep.y + TALL.sheep).toBeLessThanOrEqual(lidAt(sheep.z) + 1e-6)
      // In front of it while the finger is in it.
      if (Math.abs(x) < 0.5) expect(sheep.z).toBeGreaterThan(-0.5 + FOOT.lighthouse)
      // It slides round: no jump from one frame to the next.
      if (x < 3.95) expect(Math.hypot(sheep.x - last.x, sheep.z - last.z)).toBeLessThan(0.6)
      last = { x: sheep.x, z: sheep.z }
      // The ring is where the finger is, or the nearest place a sheep can stand.
      const spot = island.show().spot!
      expect(Math.hypot(spot.x - x, spot.z + 0.6)).toBeLessThan(FOOT.sheep + FOOT.lighthouse + GAP + 0.3)
    }
    island.cancel()
  })

  it('takes the sheep to the tree over a house that stands between them', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(0, -0.9))
    set(island, 'sheep', land(-1.9, 0.9))
    expect(where(island, 'sheep')).toBe('land')
    island.press({ kind: 'slot', toy: 'tree' })
    island.release()
    island.press(land(1.9, 0.9))
    island.release()
    listen(island, 2.5, () => {
      const sheep = shown(island, 'sheep'), house = shown(island, 'house')
      if (Math.hypot(sheep.x - house.x, sheep.z - house.z) < FOOT.house + FOOT.sheep - 0.05) expect(sheep.y).toBeGreaterThanOrEqual(LAND_Y + TALL.house)
    })
    expect(where(island, 'tree')).toBe('land')
    expect(Math.hypot(island.state.toys[2].x - island.state.toys[3].x, island.state.toys[2].z - island.state.toys[3].z)).toBeLessThan(FOOT.sheep + FOOT.tree + 0.3)
  })

  it('takes the gull to the smoke and home over a lighthouse that stands on its way', () => {
    const island = new Island(fresh(4))
    set(island, 'lighthouse', land(-1.9, -0.1))
    set(island, 'house', land(1.6, 0))
    let near = 0
    const watch = (): void => {
      const gull = island.show().gull, tower = shown(island, 'lighthouse')
      if (Math.hypot(gull.x - tower.x, gull.z - tower.z) < FOOT.lighthouse + 0.5) {
        near += 1
        expect(gull.y).toBeGreaterThanOrEqual(LAND_Y + TALL.lighthouse)
      }
    }
    listen(island, 2, watch)
    island.press({ kind: 'toy', toy: 'house' })
    island.dragStart()
    island.drag({ x: 0, z: TRAY_Z })
    island.drop()
    listen(island, 2.5, watch)
    expect(island.show().gull.x).toBe(island.posts.buoy.x)
  })
})

describe('a toy tapped where it stands', () => {
  const tapped = (kind: Kind, target: Target): string[] => {
    const island = new Island(fresh(4))
    set(island, kind, target)
    run(island, 2.5)
    quiet(island)
    island.press({ kind: 'toy', toy: kind })
    island.release()
    return listen(island, 1.6)
  }
  const sea: Target = { kind: 'sea', x: 0, z: 4.35 }

  it('answers with its own trick on the land', () => {
    expect(tapped('lighthouse', land(0, 0))).toEqual(expect.arrayContaining(['blink', 'whoosh']))
    expect(tapped('boat', land(0, 0))).toContain('splat')
    expect(tapped('sheep', land(0, 0))).toEqual(expect.arrayContaining(['bigBaa', 'poof']))
    expect(tapped('tree', land(0, 0))).toEqual(expect.arrayContaining(['shake', 'pop']))
    expect(tapped('house', land(0, 0))).toEqual(expect.arrayContaining(['clap', 'bigPuff']))
  })

  it('answers in the sea too, the boat with its toot', () => {
    expect(tapped('boat', sea)).toContain('toot')
    expect(tapped('sheep', sea)).toContain('bigBaa')
    expect(tapped('lighthouse', sea)).toContain('blink')
    expect(tapped('tree', sea).length).toBeGreaterThan(0)
    expect(tapped('house', sea).length).toBeGreaterThan(0)
  })

  it('moves the toy at once: the pose of a tapped toy is not the pose it had', () => {
    for (const kind of KINDS) {
      const island = new Island(fresh(4))
      set(island, kind, land(0, 0))
      run(island, 2.5)
      const numbers = (): string => { const p = shown(island, kind).pose; return [p.y, p.yaw, p.pitch, p.roll, p.sx, p.sy, p.part.y, p.part.yaw, p.part.pitch, p.part.roll, p.part.s, p.glow].map((n) => n.toFixed(3)).join() }
      const plain = new Set<string>()
      for (let i = 0; i < 20; i++) { island.step(1 / 60); plain.add(numbers()) }
      island.press({ kind: 'toy', toy: kind })
      island.release()
      let moved = false
      for (let i = 0; i < 20; i++) { island.step(1 / 60); if (!plain.has(numbers())) moved = true }
      expect(moved, kind).toBe(true)
    }
  })
})

describe('the island spun under the toys', () => {
  const all = (): Island => {
    const island = new Island(fresh(4))
    set(island, 'lighthouse', land(-1.2, -1.6))
    set(island, 'house', land(1.5, -0.5))
    set(island, 'tree', land(-1.9, 0.9))
    set(island, 'boat', land(1.2, 1.6))
    set(island, 'sheep', land(0.2, 0.5))
    run(island, 3)
    quiet(island)
    return island
  }

  it('gives each of the five and the cat its own sound, and a stagger when it stops', () => {
    const island = all()
    const heard = spin(island, 1.5)
    for (const name of ['whirr', 'skree', 'slideBaa', 'swish', 'clackclack']) expect(heard, name).toContain(name)
    const after = listen(island, 6)
    expect(after).toContain('stagger')
    expect(island.moving).toBe(false)
  })

  it('smears the beam, swings the boat like a needle and flings the crown, and all is as it was when it has stopped', () => {
    const island = all()
    const before = KINDS.map((kind) => ({ ...island.state.toys[KINDS.indexOf(kind)] }))
    let smear = 0, flap = 0
    spin(island, 1.5, () => { smear = Math.max(smear, island.show().smear); flap = Math.max(flap, island.show().flap) })
    expect(smear).toBeGreaterThan(0.5)
    expect(flap).toBeGreaterThan(0.3)
    listen(island, 6)
    expect(island.show().smear).toBeLessThan(0.05)
    KINDS.forEach((_, i) => expect(island.state.toys[i]).toEqual(before[i]))
  })

  it('lets the boat surf backward in the sea, and winds up the gull, which whips back when the island stops', () => {
    const island = new Island(fresh(4))
    set(island, 'boat', { kind: 'sea', x: 5, z: 0 })
    quiet(island)
    const heard = spin(island, 2)
    expect(heard).toContain('surf')
    expect(Math.abs(island.show().gull.head)).toBeGreaterThan(0.5)
    expect(listen(island, 6)).toContain('wrrrip')
  })

  it('drags the cat round with its claws in, its eyes rolling', () => {
    const island = all()
    let rove = 0
    const heard = spin(island, 1.5, () => { rove = Math.max(rove, island.show().cat.pose.rove) })
    expect(heard).toContain('skrrt')
    expect(rove).toBeGreaterThan(0.5)
  })
})

describe('more neighbours', () => {
  it('sounds a horn from the sheep in the boat each time the boat passes the front, and boings it on the land', () => {
    const island = new Island(fresh(4))
    set(island, 'boat', { kind: 'sea', x: 5, z: 0 })
    set(island, 'sheep', { kind: 'toy', toy: 'boat' })
    expect(where(island, 'sheep')).toBe('boat')
    quiet(island)
    const heard: string[] = []
    for (let i = 0; i < 40 && !heard.includes('horn'); i++) { island.press({ kind: 'sky' }); island.release(); heard.push(...listen(island, 1)) }
    expect(heard).toContain('horn')
    const ashore = new Island(fresh(4))
    set(ashore, 'boat', land(0, 0))
    set(ashore, 'sheep', { kind: 'toy', toy: 'boat' })
    expect(where(ashore, 'sheep')).toBe('boat')
    quiet(ashore)
    ashore.press({ kind: 'sky' })
    expect(listen(ashore, 4)).toContain('boingBaa')
  })

  it('carries the sheep with the boat when the boat is lifted, and sends it to its own slot when the boat goes home', () => {
    const island = new Island(fresh(4))
    set(island, 'boat', land(0, 0))
    set(island, 'sheep', { kind: 'toy', toy: 'boat' })
    island.press({ kind: 'toy', toy: 'boat' })
    island.dragStart()
    island.drag({ x: 1.5, z: 1 })
    run(island, 0.2)
    const boat = shown(island, 'boat'), sheep = shown(island, 'sheep')
    expect(Math.hypot(sheep.x - boat.x, sheep.z - boat.z)).toBeLessThan(0.6)
    expect(sheep.y).toBeGreaterThan(boat.y)
    island.drop()
    run(island, 1)
    expect(where(island, 'sheep')).toBe('boat')
    expect(island.state.toys[1]).toMatchObject({ where: 'land', x: 1.5, z: 1 })
    island.press({ kind: 'toy', toy: 'boat' })
    island.dragStart()
    island.drag({ x: 0, z: TRAY_Z })
    island.drop()
    expect(where(island, 'boat')).toBe('tray')
    expect(island.state.toys[2]).toEqual({ kind: 'sheep', where: 'tray', x: 0, z: 0 })
    run(island, 1.5)
    expect(shown(island, 'sheep').x).toBe(slotOf('sheep').x)
    expect(shown(island, 'sheep').y).toBeCloseTo(TRAY_TOP, 1)
  })

  it('has the cat pounce on the light of the lamp each time it passes, and pat the boat that flaps on the land', () => {
    const island = new Island(fresh(4))
    set(island, 'lighthouse', land(-1.6, -1.4))
    quiet(island)
    island.press({ kind: 'sky' })
    const heard = listen(island, 9)
    expect(heard).toContain('patpat')
    const fish = new Island(fresh(4))
    set(fish, 'boat', land(1.8, -1))
    quiet(fish)
    fish.press({ kind: 'sky' })
    expect(listen(fish, 6)).toEqual(expect.arrayContaining(['pat', 'slap']))
  })

  it('glares and washes a paw when a toy has come down where the cat sat, and flinches from a splash beside it', () => {
    const island = new Island(fresh(4))
    const seat = { x: island.show().cat.x, z: island.show().cat.z }
    island.press({ kind: 'slot', toy: 'house' })
    island.release()
    island.press({ kind: 'cat' })
    island.release()
    const heard = listen(island, 1.2)
    expect(heard).toContain('mrow')
    expect(Math.hypot(shown(island, 'house').x - seat.x, shown(island, 'house').z - seat.z)).toBeLessThan(0.3)
    let glared = false, washed = false
    listen(island, 3, () => { const pose = island.show().cat.pose; if (pose.ears > 0.9 && pose.lids < 0.5) glared = true; if (pose.wash > 0.5) washed = true })
    expect(glared || washed).toBe(true)
    expect(washed).toBe(true)
  })

  it('sends the gull to paddle beside a house in the sea, where the bubbles tickle it, and up over the boat that passes', () => {
    const island = new Island(fresh(4))
    set(island, 'house', { kind: 'sea', x: -4.35, z: 0 })
    run(island, 2)
    const gull = island.show().gull, house = shown(island, 'house')
    expect(Math.hypot(gull.x - house.x, gull.z - house.z)).toBeLessThan(2.6)
    expect(gull.y).toBeLessThan(0.2)
    quiet(island)
    island.press({ kind: 'sky' })
    const heard = listen(island, 8)
    expect(heard).toContain('blop')
    expect(heard).toContain('kyahihi')
    set(island, 'boat', { kind: 'sea', x: 0, z: 5.75 })
    quiet(island)
    let rose = 0
    const more: string[] = []
    for (let i = 0; i < 30; i++) { island.press({ kind: 'sky' }); more.push(...listen(island, 1, () => { rose = Math.max(rose, island.show().gull.y) })) }
    expect(rose).toBeGreaterThan(TALL.boat)
    expect(more).toContain('kwuk')
  })

  it('has the gull dive after a toy that splashes into the sea, and come up with nothing', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'slot', toy: 'tree' })
    island.release()
    island.press({ kind: 'sea', x: -4.35, z: 0 })
    island.release()
    let low = Infinity, pitched = 0
    const heard = listen(island, 3.5, () => { const gull = island.show().gull; low = Math.min(low, gull.y); pitched = Math.max(pitched, gull.pose.pitch) })
    expect(heard).toContain('splish')
    expect(low).toBeLessThan(0)
    expect(pitched).toBeGreaterThan(0.5)
    expect(island.show().gull.x).toBe(island.posts.buoy.x)
  })

  it('sounds the drops of the whale as they come down, after its blow', () => {
    const island = new Island(fresh(4))
    run(island, 1)
    quiet(island)
    island.press({ kind: 'whale' })
    island.release()
    const patter = island.sounds.find((sound) => sound.name === 'pitpat')
    expect(patter?.delay).toBeGreaterThan(0.3)
  })

  it('squeezes rain from a cloud and bounces the sun, each with its sound', () => {
    const island = new Island(fresh(4))
    quiet(island)
    island.press({ kind: 'cloud', index: 1, x: 0, y: 4, z: -9, size: 1 })
    expect(names(island)).toEqual(['pitpat'])
    expect(island.show().clouds[1]).toBe(0)
    expect(island.show().particles.length).toBeGreaterThan(0)
    quiet(island)
    island.press({ kind: 'sun' })
    expect(names(island)).toEqual(['bong'])
    expect(island.show().sun).toBe(0)
  })
})

describe('the wave', () => {
  const full = (): Island => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1, 0.5))
    set(island, 'tree', land(-1.5, 0))
    set(island, 'boat', { kind: 'sea', x: 5, z: 0 })
    quiet(island)
    return island
  }
  const out = (island: Island): string[] => island.state.toys.map((toy) => `${toy.where} ${toy.x} ${toy.z}`)

  it('rears first, with a yawn, and moves and saves nothing while it does', () => {
    const island = full(), before = out(island)
    island.press({ kind: 'wave' })
    island.release()
    expect(names(island)).toEqual(['yawn'])
    run(island, REAR_S - 0.1)
    expect(out(island)).toEqual(before)
    expect(island.dirty).toBe(false)
    expect(island.washingNow).toBe(false)
    expect(island.moving).toBe(true)
    const wave = island.show().wave
    expect(wave.rear).toBeGreaterThan(0.9)
    expect(wave.lids).toBe(1)
    // It has not left its edge.
    expect(wave.x).toBe(island.posts.wave.x)
  })

  it('sinks back with a short yawn when it is touched again while it rears, and nothing has happened', () => {
    const island = full(), before = out(island)
    island.press({ kind: 'wave' })
    island.release()
    run(island, 0.7)
    quiet(island)
    island.press({ kind: 'wave' })
    island.release()
    expect(names(island)).toEqual(['yawnDown'])
    run(island, 4)
    expect(out(island)).toEqual(before)
    expect(island.dirty).toBe(false)
    expect(island.show().wave.rear).toBe(0)
    expect(island.moving).toBe(false)
    expect(shown(island, 'house').on).toBe('island')
    // And a touch after that rears it again.
    island.press({ kind: 'wave' })
    expect(names(island)).toContain('yawn')
  })

  it('saves every toy in the tray at the start of the wash, and leaves the turn alone', () => {
    const island = full()
    island.state.turn = 1
    island.press({ kind: 'wave' })
    island.release()
    run(island, REAR_S + 0.05)
    expect(island.washingNow).toBe(true)
    expect(island.state.toys.every((toy) => toy.where === 'tray' && toy.x === 0 && toy.z === 0)).toBe(true)
    expect(island.state.turn).toBe(1)
    expect(island.dirty).toBe(true)
    expect(island.urgent).toBe(true)
    expect(names(island)).toContain('roll')
    // Saved, and not yet moved: the house still stands on the land.
    expect(shown(island, 'house').y).toBeCloseTo(LAND_Y, 1)
  })

  it('takes the toys onto its crest one after another, each with the sound of its ride, and never rolls over one that is still going up', () => {
    const island = full()
    island.press({ kind: 'wave' })
    island.release()
    run(island, REAR_S)
    quiet(island)
    const heard: string[] = []
    for (let i = 0; i < 60 * 2.6; i++) {
      island.step(1 / 60)
      heard.push(...names(island))
      island.sounds.length = 0
      const frame = island.show()
      for (const kind of ['house', 'tree', 'boat'] as const) {
        const toy = shown(island, kind)
        // A toy that has not left the ground is ahead of the wave's lip.
        if (toy.y < 0.5) expect(toy.x, kind).toBeLessThan(frame.wave.x - 1)
      }
    }
    for (const name of ['swoosh', 'topWhirr', 'gloop']) expect(heard).toContain(name)
    // Nearest the wave first: the boat at the right, the house, and the tree last.
    expect(heard.indexOf('swoosh')).toBeLessThan(heard.indexOf('gloop'))
    expect(heard.indexOf('gloop')).toBeLessThan(heard.indexOf('topWhirr'))
    for (const kind of ['house', 'tree', 'boat'] as const) expect(shown(island, kind).y).toBeGreaterThan(1)
  })

  it('stands them in their slots one after another, and lies down at its edge with a sigh', () => {
    const island = full()
    island.press({ kind: 'wave' })
    island.release()
    run(island, REAR_S)
    quiet(island)
    const heard: string[] = []
    for (let i = 0; i < 60 * (WASH_S + 0.4); i++) { island.step(1 / 60); heard.push(...names(island)); island.sounds.length = 0 }
    // The boat drops in with a clack, the tree plunks, the house is turned over with its broad knock.
    expect(heard.filter((name) => ['clack', 'plunk', 'knock'].includes(name))).toEqual(['clack', 'plunk', 'knock'])
    expect(heard).toContain('sigh')
    for (const kind of KINDS) {
      expect(shown(island, kind).y).toBeCloseTo(TRAY_TOP, 1)
      expect(shown(island, kind).x).toBeCloseTo(slotOf(kind).x, 2)
    }
    const wave = island.show().wave
    expect(wave.x).toBe(island.posts.wave.x)
    expect(wave.rear).toBe(0)
    expect(wave.lids).toBeGreaterThan(0.4)
    expect(wave.lids).toBeLessThan(0.6)
    expect(island.moving).toBe(false)
  })

  it('gives way to any touch at once: the toys are in their slots and the touch is answered', () => {
    const island = full()
    island.press({ kind: 'wave' })
    island.release()
    run(island, REAR_S + 0.8)
    quiet(island)
    island.press({ kind: 'slot', toy: 'house' })
    expect(island.hand).toBe('house')
    for (const kind of ['tree', 'boat'] as const) {
      const toy = shown(island, kind)
      expect(toy.x).toBe(slotOf(kind).x)
      expect(toy.y).toBeCloseTo(TRAY_TOP, 1)
    }
    expect(island.show().wave.rear).toBe(0)
    expect(island.washingNow).toBe(false)
    // What had not sounded yet stays quiet.
    run(island, 3)
    expect(names(island)).not.toContain('clack')
    expect(names(island)).not.toContain('sigh')
  })

  it('puts a carried toy back and empties the hand when the wash starts', () => {
    const island = full()
    island.press({ kind: 'wave' })
    island.release()
    island.press({ kind: 'slot', toy: 'sheep' })
    island.release()
    expect(where(island, 'sheep')).toBe('tray')
    run(island, REAR_S + 0.1)
    expect(island.hand).toBeNull()
    expect(island.washingNow).toBe(true)
  })

  it('rolls over the bare island with nothing out, too, and saves it as it was', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'wave' })
    island.release()
    expect(names(island)).toContain('yawn')
    run(island, REAR_S + 0.5)
    expect(island.show().wave.x).toBeLessThan(island.posts.wave.x - 1)
    run(island, BARE_S)
    expect(island.state.toys.every((toy) => toy.where === 'tray')).toBe(true)
    expect(island.show().wave.x).toBe(island.posts.wave.x)
    expect(island.moving).toBe(false)
  })

  it('sends the cat to the back of the rim, puffed up, and the gull surfing on its buoy, and both home again', () => {
    const island = full()
    island.press({ kind: 'wave' })
    island.release()
    run(island, REAR_S + 1.6)
    const frame = island.show()
    expect(Math.hypot(frame.cat.x, frame.cat.z)).toBeGreaterThan(RIM_OUT)
    expect(frame.cat.pose.puff).toBe(2)
    expect(frame.buoyLift).toBeGreaterThan(0)
    expect(frame.gull.pose.spread).toBeGreaterThan(0.5)
    run(island, WASH_S + 1)
    const after = island.show()
    expect(Math.hypot(after.cat.x, after.cat.z)).toBeLessThan(3)
    expect(after.cat.pose.puff).toBe(1)
    expect(after.buoyLift).toBe(0)
  })
})

describe('found as left', () => {
  it('writes nothing until the child changes something, however long the island is watched', () => {
    for (const age of [null, 2, 4]) {
      const island = new Island(fresh(age))
      run(island, 40)
      expect(island.dirty).toBe(false)
    }
  })

  it('comes back from its save with every toy where it stood, at rest, and without a sound', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1, 0.5))
    set(island, 'tree', { kind: 'sea', x: -4, z: 1 })
    set(island, 'lighthouse', land(-1.4, -1))
    island.press({ kind: 'rim', x: 6.2, z: 0 })
    island.release()
    run(island, 4)
    const saved = JSON.parse(JSON.stringify(serialize(island.state)))
    const back = new Island(deserialize(saved, 2))
    expect(back.sounds).toHaveLength(0)
    expect(back.dirty).toBe(false)
    expect(back.moving).toBe(false)
    expect(back.hand).toBeNull()
    for (const kind of KINDS) {
      const a = shown(island, kind), b = shown(back, kind)
      expect(b.on).toBe(a.on)
      expect(b.x).toBeCloseTo(a.x, 1)
      expect(b.z).toBeCloseTo(a.z, 1)
      // Nothing drops in: a toy that is out stands on its ground from the first frame.
      if (b.on === 'island' && kind !== 'tree') expect(b.pose.sy).toBeGreaterThan(0.97)
    }
    expect(back.show().turn).toBeCloseTo(island.show().turn, 2)
    // The cat is in the seat worked out from the toys and the turn, which here is the seat it had.
    expect(back.show().cat.x).toBeCloseTo(island.show().cat.x, 2)
  })

  it("finds the cat in the seat it had: parked and returned is the same as saved and loaded, after each kind of hop", () => {
    const seatOf = (island: Island): number => (island as unknown as { cat: { seat: number } }).cat.seat
    const derived = (island: Island): number => seatOf(new Island({ ...deserialize(JSON.parse(JSON.stringify(serialize(island.state))), 4), cat: undefined }))
    const island = new Island(fresh(4))
    run(island, 1)
    let kept = 0
    /** The island as it is in the hand, and the island read from what it would write at this moment. */
    const same = (): void => {
      const loaded = new Island(deserialize(JSON.parse(JSON.stringify(serialize(island.state))), 4))
      expect(seatOf(loaded)).toBe(seatOf(island))
      expect(loaded.sounds).toHaveLength(0)
      // Parked and returned: it sits on. Saved and loaded: it sits on there too, and no leap is played.
      run(island, 3)
      run(loaded, 3)
      expect(seatOf(loaded)).toBe(seatOf(island))
      expect(loaded.show().cat.x).toBeCloseTo(island.show().cat.x, 2)
      expect(loaded.show().cat.z).toBeCloseTo(island.show().cat.z, 2)
      expect(loaded.sounds.map((sound) => sound.name)).not.toContain('mrow')
      expect(loaded.dirty).toBe(false)
      if (seatOf(island) !== derived(island)) kept += 1
    }
    same()
    // A toy set down on its seat: it hops to the next one.
    const first = seatOf(island), at = (): { x: number; z: number } => ({ x: island.show().cat.x, z: island.show().cat.z })
    set(island, 'tree', land(at().x, at().z))
    expect(seatOf(island)).not.toBe(first)
    same()
    // A toy carried over its seat and taken back to the tray: it has hopped, nothing else has changed, and the hop is written.
    quiet(island)
    const second = seatOf(island), seat = at()
    island.press({ kind: 'slot', toy: 'lighthouse' })
    island.dragStart()
    island.drag(seat)
    run(island, 1)
    expect(seatOf(island)).not.toBe(second)
    expect(island.dirty).toBe(true)
    island.drag({ x: 0, z: TRAY_Z })
    island.drop()
    run(island, 1)
    expect(where(island, 'lighthouse')).toBe('tray')
    same()
    // More toys, the island turned, a toy taken away, and the wash.
    set(island, 'house', land(at().x, at().z))
    same()
    island.press({ kind: 'rim', x: 6.2, z: 0 })
    island.release()
    run(island, 3)
    same()
    set(island, 'sheep', land(at().x, at().z))
    same()
    island.press({ kind: 'toy', toy: 'tree' })
    island.dragStart()
    island.drag({ x: 0, z: TRAY_Z })
    island.drop()
    run(island, 2)
    same()
    island.press({ kind: 'wave' })
    island.release()
    run(island, REAR_S + WASH_S + 3)
    same()
    // The test would hold of a seat worked out from the toys alone, too: here it was another seat at least twice.
    expect(kept).toBeGreaterThanOrEqual(2)
  })

  it('sits the cat in the seat worked out from the toys when the record names none, or one it cannot have', () => {
    const toys = fresh(4).toys.map((toy) => (toy.kind === 'tree' ? { kind: 'tree' as const, where: 'land' as const, x: -0.87, z: 1.52 } : toy))
    const seatOf = (cat: number | undefined): number => (new Island({ ...fresh(4), toys, cat }) as unknown as { cat: { seat: number } }).cat.seat
    const worked = seatOf(undefined)
    // The tree stands in the first seat.
    expect(worked).not.toBe(0)
    expect(seatOf(0)).toBe(worked)
    // A free seat it names is the seat it has.
    const other = [1, 2, 3, 4, 5, 6].find((seat) => seat !== worked && seatOf(seat) === seat)
    expect(other).toBeDefined()
  })

  it('put away with a toy in the hand or in the finger, finds it in the tray', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'slot', toy: 'house' })
    expect(serialize(island.state).toys[4].where).toBe('tray')
    island.dragStart()
    island.drag({ x: 1, z: 1 })
    expect(serialize(island.state).toys[4].where).toBe('tray')
  })

  it('put away in the middle of the wave, finds every toy in its slot', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1, 0.5))
    island.press({ kind: 'wave' })
    run(island, REAR_S + 0.5)
    const back = new Island(deserialize(JSON.parse(JSON.stringify(serialize(island.state))), 4))
    expect(shown(back, 'house').y).toBeCloseTo(TRAY_TOP, 1)
    expect(back.show().wave.rear).toBe(0)
    expect(back.moving).toBe(false)
    expect(back.sounds).toHaveLength(0)
  })

  it('put away while the wave is still rearing, finds every toy where it stood and the wave lying down', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1, 0.5))
    island.press({ kind: 'wave' })
    run(island, REAR_S - 0.3)
    const back = new Island(deserialize(JSON.parse(JSON.stringify(serialize(island.state))), 4))
    expect(shown(back, 'house').y).toBeCloseTo(LAND_Y, 1)
    expect(back.show().wave.rear).toBe(0)
    expect(back.moving).toBe(false)
  })
})

describe('an island nobody is touching', () => {
  it('goes quiet: a habit is heard after a touch, more softly for a while, and then not at all', () => {
    const island = new Island(fresh(2))
    island.press(land(-2, 1))
    quiet(island)
    run(island, 5)
    const loud = island.sounds.filter((sound) => sound.name === 'whoomp')
    expect(loud.length).toBeGreaterThan(0)
    run(island, 16)
    quiet(island)
    run(island, 30)
    expect(island.sounds).toHaveLength(0)
  })

  it('keeps moving all the same', () => {
    const island = new Island(fresh(2))
    run(island, 30)
    const tails = new Set<string>()
    for (let i = 0; i < 60; i++) {
      island.step(1 / 60)
      tails.add(island.show().cat.pose.tail.toFixed(3))
    }
    expect(tails.size).toBeGreaterThan(20)
    expect(island.show().particles.length).toBeGreaterThan(0)
  })

  it('has the cat pat the bare ground three times while toys wait, and then let be: heard after a touch, softly the second time, and then only seen', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'sky' })
    island.release()
    quiet(island)
    const cat = inner<{ cat: { pats: number; doing: { patted: number } } }>(island).cat
    let seen = 0
    for (let t = 0; t < 60; t += 1 / 60) {
      island.step(1 / 60)
      if (cat.doing.patted === 0) seen += 1
    }
    expect(seen).toBe(3)
    expect(island.sounds.filter((sound) => sound.name === 'pat').map((sound) => sound.gain)).toEqual([1, 0.4])
  })

  it('is not loud when it is opened: nothing on it sounds until it is touched, and the cat still pats the ground', () => {
    for (const game of [new Island(fresh(2)), new Island(fresh(4)), load(new Island(fresh(2)))]) {
      const cat = inner<{ cat: { doing: { patted: number } } }>(game).cat
      let seen = 0
      for (let t = 0; t < 30; t += 1 / 60) {
        game.step(1 / 60)
        if (cat.doing.patted === 0) seen += 1
      }
      expect(game.sounds).toHaveLength(0)
      expect(seen).toBe(3)
    }
  })

  it('plays the same island from the same seed', () => {
    const play = (): string => {
      const island = new Island(fresh(2), 5)
      set(island, 'tree', { kind: 'sea', x: 4, z: 0 })
      island.press({ kind: 'whale' })
      run(island, 3)
      return JSON.stringify(island.show().particles)
    }
    expect(play()).toBe(play())
  })
})

// --- The first reading of the folder: what the sheet says and the code did not do ---------------------

const WASH_SOUNDS = ['yawn', 'roll', 'ffft', 'kyahaha', 'sigh', 'glug', 'swoosh', 'baaGlub', 'topWhirr', 'gloop']
const load = (island: Island): Island => new Island(deserialize(JSON.parse(JSON.stringify(serialize(island.state))), 4))
const inner = <T>(island: Island): T => island as unknown as T

describe('a wash ended by a touch', () => {
  const full = (): Island => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1, 0.5))
    set(island, 'tree', land(-1.5, 0))
    set(island, 'sheep', land(1.2, -1.6))
    set(island, 'boat', { kind: 'sea', x: 5, z: 0 })
    quiet(island)
    return island
  }

  it("says every sound of the wave through the wave's own gain, each when its moment comes on the game's clock", () => {
    const island = full(), heard: { name: string; wash?: boolean; delay?: number }[] = []
    island.press({ kind: 'wave' })
    island.release()
    for (let t = 0; t < REAR_S + WASH_S + 2; t += 1 / 60) {
      heard.push(...island.sounds.map((sound) => ({ ...sound })))
      island.sounds.length = 0
      island.step(1 / 60)
    }
    for (const name of ['yawn', 'roll', 'ffft', 'kyahaha', 'sigh', 'swoosh', 'baaGlub', 'topWhirr', 'gloop']) expect(heard.map((sound) => sound.name), name).toContain(name)
    for (const sound of heard) {
      // Marked for the gain that the end of the wash drops, and never handed to the audio clock ahead of its time.
      if (WASH_SOUNDS.includes(sound.name)) expect(sound, sound.name).toMatchObject({ wash: true })
      if (sound.wash) expect(sound.delay, sound.name).toBeUndefined()
    }
  })

  it('is silent from that frame: what the wave was sounding is cut, what it had queued is dropped, and nothing of it sounds later', () => {
    // Ended at each moment of the roll: before the cat's hiss, between two rides, during the long roll.
    for (const after of [0.02, 0.12, 0.5, 1.1, 2.4]) {
      const island = full()
      island.press({ kind: 'wave' })
      island.release()
      run(island, REAR_S)
      quiet(island)
      // (A sound of the wave said in the very step the touch lands in is still in the list.)
      for (let t = 0; t < after; t += 1 / 60) { island.sounds.length = 0; island.step(1 / 60) }
      island.hushed = false
      island.press({ kind: 'sky' })
      island.release()
      expect(island.hushed, `${after}`).toBe(true)
      // Only the touch's own answer is left to play.
      expect(names(island), `${after}`).toEqual(['wind'])
      quiet(island)
      const later = listen(island, 6)
      for (const name of WASH_SOUNDS) expect(later, `${name} after ${after}`).not.toContain(name)
    }
  })

  it('does not run the rising yawn under the yawn down when the wave is called off', () => {
    const island = full()
    island.press({ kind: 'wave' })
    island.release()
    expect(island.sounds).toEqual([{ name: 'yawn', wash: true }])
    quiet(island)
    run(island, 0.4)
    island.press({ kind: 'wave' })
    island.release()
    // The yawn going up is cut, and the yawn going down is an ordinary sound.
    expect(island.hushed).toBe(true)
    expect(island.sounds).toEqual([{ name: 'yawnDown' }])
  })

  it('leaves the tree its whole crown in the tray, as a loaded game has it', () => {
    const island = new Island(fresh(4))
    set(island, 'tree', land(-1, 0))
    set(island, 'sheep', land(1.5, 0))
    // The sheep eats the crown down.
    for (let t = 0; t < 12 && shown(island, 'tree').crown > 0.8; t += 1 / 60) island.step(1 / 60)
    expect(shown(island, 'tree').crown).toBeLessThanOrEqual(0.8)
    island.press({ kind: 'wave' })
    island.release()
    run(island, REAR_S + 1.2)
    expect(island.washingNow).toBe(true)
    island.press({ kind: 'sky' })
    island.release()
    run(island, 1.5)
    expect(shown(island, 'tree').on).toBe('world')
    expect(shown(island, 'tree').crown).toBeCloseTo(1, 2)
    expect(shown(load(island), 'tree').crown).toBe(1)
  })
})

describe("a tap's answer, sound by sound", () => {
  const places = { lighthouse: [land(-1.2, -1.6), { kind: 'sea', x: -3, z: 3 }], boat: [land(1.2, 1.6), { kind: 'sea', x: 5, z: 0 }], sheep: [land(1.6, 1.2), { kind: 'sea', x: 3, z: 3 }], tree: [land(-1.9, 0.9), { kind: 'sea', x: -4.25, z: 0 }], house: [land(1.5, -0.5), { kind: 'sea', x: 4, z: 1 }] } satisfies Record<Kind, Target[]>
  /** Every toy, on the land and in the sea, standing there for two seconds. */
  const each = (play: (island: Island, kind: Kind, cues: readonly Cue[], label: string) => void): void => {
    for (const kind of KINDS) for (const sea of [false, true]) {
      const island = new Island(fresh(4))
      set(island, kind, places[kind][sea ? 1 : 0])
      run(island, 2)
      quiet(island)
      play(island, kind, TAP[kind][sea ? 'sea' : 'land'], `${kind} ${sea ? 'sea' : 'land'}`)
    }
  }

  it('says each sound in the frame its pose arrives, on the game clock, and none ahead of its time', () => {
    each((island, kind, cues, label) => {
      island.press({ kind: 'toy', toy: kind })
      island.release()
      // In the frame of the touch: what starts with it, and nothing queued for later.
      expect(names(island), label).toEqual(cues.filter((cue) => cue.at === 0).map((cue) => cue.name))
      for (const sound of island.sounds) expect(sound.delay, label).toBeUndefined()
      island.sounds.length = 0
      const heard: { name: string; at: number }[] = []
      for (let i = 1; i <= 120; i++) {
        island.step(1 / 60)
        for (const sound of island.sounds) if (cues.some((cue) => cue.name === sound.name)) heard.push({ name: sound.name, at: i / 60 })
        island.sounds.length = 0
      }
      const later = cues.filter((cue) => cue.at > 0)
      expect(heard.map((sound) => sound.name), label).toEqual(later.map((cue) => cue.name))
      heard.forEach((sound, i) => expect(Math.abs(sound.at - later[i].at), `${label} ${sound.name}`).toBeLessThan(1 / 60 + 1e-6))
    })
  })

  it('says no more of it for a toy that is lifted, whenever the finger starts to slide', () => {
    for (const after of [0, 0.05, 0.1, 0.2, 0.3, 0.5]) {
      each((island, kind, cues, label) => {
        island.press({ kind: 'toy', toy: kind })
        island.sounds.length = 0
        const before = listen(island, after)
        island.dragStart()
        island.drag({ x: 0, z: 4 })
        // What had sounded by then had its moment; from the lift on, nothing of the answer.
        for (const name of before) if (cues.some((cue) => cue.name === name)) expect(cues.filter((cue) => cue.name === name).some((cue) => cue.at <= after + 1 / 60), `${label} ${name}`).toBe(true)
        const carried = listen(island, 2)
        island.drop()
        const landed = listen(island, 2)
        for (const cue of cues) {
          expect(carried, `${label} ${cue.name} lifted after ${after}`).not.toContain(cue.name)
          expect(landed, `${label} ${cue.name} set down after ${after}`).not.toContain(cue.name)
        }
      })
    }
  })
})

describe('one clock for a habit and its sound', () => {
  /** Plays the island and says, for each ball of smoke that left the chimney, how far the roof was lifted just before it and a moment after. */
  const roofs = (island: Island, seconds: number): { before: number; after: number }[] => {
    const out: { before: number; after: number }[] = []
    let smoke = 0, last = 0, since = Infinity
    for (let t = 0; t < seconds; t += 1 / 60) {
      island.step(1 / 60)
      since += 1 / 60
      const frame = island.show(), now = frame.particles.filter((p) => p.tint === 'smoke' && p.age < 1 / 60 + 1e-6).length, lift = frame.toys[4].pose.part.y
      if (now > 0 && smoke === 0) { out.push({ before: last, after: 0 }); since = 0 }
      if (since > 0.15 && since < 0.2 && out.length > 0) out[out.length - 1].after = lift
      smoke = now
      last = lift
    }
    return out
  }

  it('lifts the roof with the ball of smoke: set down, and found as left on load', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1.5, -0.5))
    run(island, 1)
    for (const game of [island, load(island)]) {
      const seen = roofs(game, 9)
      expect(seen.length).toBeGreaterThanOrEqual(4)
      for (const roof of seen) {
        expect(roof.before).toBeLessThan(0.005)
        expect(roof.after).toBeGreaterThan(0.03)
      }
    }
    // Found as left: the roof lies flat until the first ball leaves.
    const loaded = load(island)
    loaded.step(1 / 60)
    expect(loaded.show().toys[4].pose.part.y).toBeLessThan(0.005)
  })

  it('lifts the roof with the ball again after the island was spun', () => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1.5, -0.5))
    spin(island, 1.5)
    run(island, 6)
    const seen = roofs(island, 7)
    expect(seen.length).toBeGreaterThanOrEqual(3)
    for (const roof of seen) {
      expect(roof.before).toBeLessThan(0.005)
      expect(roof.after).toBeGreaterThan(0.03)
    }
  })

  it('says the log\'s "glonk" as it rolls half over: set down, and on load', () => {
    const island = new Island(fresh(4))
    set(island, 'tree', { kind: 'sea', x: -4.25, z: 0 })
    for (const game of [island, load(island)]) {
      let heard = 0
      quiet(game)
      for (let t = 0; t < 5.9; t += 1 / 60) {
        inner<{ unheard: number }>(game).unheard = 0
        game.step(1 / 60)
        if (names(game).includes('glonk')) {
          heard += 1
          // Lying flat again: half a turn, a whole turn, and so on.
          const rolled = shown(game, 'tree').pose.yaw / Math.PI
          expect(Math.abs(rolled - Math.round(rolled))).toBeLessThan(0.01)
        }
        game.sounds.length = 0
      }
      expect(heard).toBe(1)
    }
  })
})

describe('the rim tapped', () => {
  it('ticks once for each peg, whatever the length of a frame', () => {
    for (const dt of [1 / 30, 1 / 60, 1 / 90, 1 / 120, 0.021]) {
      const island = new Island(fresh(4))
      for (const side of [6.2, 6.2, -6.2, 6.2]) {
        quiet(island)
        island.press({ kind: 'rim', x: side, z: 0 })
        island.release()
        let pegs = 0
        for (let t = 0; t < 4; t += dt) {
          island.step(dt)
          pegs += names(island).filter((name) => name === 'peg').length
          island.sounds.length = 0
        }
        expect(pegs, `${dt}`).toBe(1)
        expect(island.moving).toBe(false)
      }
    }
  })
})

describe('the cat landed on', () => {
  it('glares at the toy that took its seat when it has come down', () => {
    const island = new Island(fresh(4))
    run(island, 1)
    const seat = { x: island.show().cat.x, z: island.show().cat.z }
    island.press({ kind: 'slot', toy: 'tree' })
    island.release()
    island.press(land(seat.x, seat.z))
    island.release()
    const cat = inner<{ cat: { leap: number; lookX: number; lookY: number; by: string | null; doing: { landedOn: number } } }>(island).cat
    for (let t = 0; t < 3 && !(cat.leap < 0 && cat.doing.landedOn < 1); t += 1 / 60) island.step(1 / 60)
    expect(cat.by).toBe('tree')
    run(island, 0.5)
    expect(cat.doing.landedOn).toBeLessThan(0.8)
    // Where its eyes would be on the tree, and where on the tray: they are on the tree.
    const sits = island.show().cat, tree = shown(island, 'tree')
    const look = (x: number, y: number, z: number): { x: number; y: number } => {
      const dx = x - sits.x, dy = y - (sits.y + 1), dz = z - sits.z, far = Math.max(0.5, Math.hypot(dx, dy, dz))
      return { x: Math.max(-1, Math.min(1, (dx / far) * 1.4)), y: Math.max(-1, Math.min(1, ((dy - dz * 0.5) / far) * 1.4)) }
    }
    const onTree = look(tree.x, tree.y + TALL.tree * 0.5, tree.z), onTray = look(0, 0.5, TRAY_Z)
    expect(Math.hypot(onTree.x - onTray.x, onTree.y - onTray.y)).toBeGreaterThan(0.5)
    expect(Math.hypot(cat.lookX - onTree.x, cat.lookY - onTree.y)).toBeLessThan(0.1)
    // And then it looks away again.
    run(island, 2)
    expect(Math.hypot(cat.lookX - onTray.x, cat.lookY - onTray.y)).toBeLessThan(0.1)
  })
})

describe('the house afloat on a spun island', () => {
  it('makes no clack while nothing flaps, and clacks on the land', () => {
    const afloat = new Island(fresh(4))
    set(afloat, 'house', { kind: 'sea', x: 4, z: 1 })
    let flap = 0
    const heard = spin(afloat, 1.5, () => { flap = Math.max(flap, afloat.show().flap) })
    expect(flap).toBe(0)
    expect(heard).not.toContain('clackclack')
    const ashore = new Island(fresh(4))
    set(ashore, 'house', land(1.5, -0.5))
    expect(spin(ashore, 1.5)).toContain('clackclack')
  })
})

describe('the gull found as left', () => {
  const HOUSES: Target[] = [land(1.5, -0.5), land(-1.6, 0.3), land(0.3, -1.9), land(0, 2), { kind: 'sea', x: -4.1, z: -1.1 }, { kind: 'sea', x: 3, z: 3 }, { kind: 'sea', x: 0, z: 4.25 }, { kind: 'sea', x: -3, z: -3 }]
  const gullAt = (island: Island) => { const gull = island.show().gull; return { x: gull.x, z: gull.z } }

  it('is where a gull that stayed would be, and no flight plays on load', () => {
    for (const house of HOUSES) for (const boat of [false, true]) for (const turn of [0, 2.4]) {
      const parked = new Island(fresh(4))
      if (turn) { inner<{ state: { turn: number } }>(parked).state.turn = turn; run(parked, 0.1) }
      if (boat) set(parked, 'boat', { kind: 'sea', x: 5, z: 0 })
      set(parked, 'house', house)
      run(parked, 3)
      const loaded = load(parked), label = `${house.kind} ${JSON.stringify(house)} boat ${boat} turn ${turn}`
      const first = gullAt(loaded)
      expect(Math.hypot(first.x - gullAt(parked).x, first.z - gullAt(parked).z), label).toBeLessThan(0.05)
      // It stays there: nothing takes off.
      for (let t = 0; t < 3; t += 1 / 60) {
        loaded.step(1 / 60)
        if (boat) continue
        const now = gullAt(loaded)
        expect(Math.hypot(now.x - first.x, now.z - first.z), label).toBeLessThan(0.05)
      }
      expect(inner<{ gull: { doing: { flying: number } } }>(loaded).gull.doing.flying, label).toBe(-1)
    }
  })

  it('keeps to its buoy on load where it kept to it in play: every toy afloat, the house at the back of the sea', () => {
    const saved = { ...fresh(4), toys: fresh(4).toys.map((toy) => ({ ...toy })) }
    const out = { lighthouse: [0, -4.25], boat: [5.75, 0], sheep: [3, 3], tree: [-3.51, 2.39], house: [-4.1, -1.1] } as const
    saved.toys = KINDS.map((kind) => ({ kind, where: 'sea' as const, x: out[kind][0], z: out[kind][1] }))
    const island = new Island(deserialize(JSON.parse(JSON.stringify(serialize(saved))), 4))
    const first = gullAt(island)
    for (let t = 0; t < 4; t += 1 / 60) {
      island.step(1 / 60)
      const now = gullAt(island)
      expect(Math.hypot(now.x - first.x, now.z - first.z)).toBeLessThan(0.05)
    }
  })
})

describe('put away and returned is the same as saved and loaded', () => {
  const full = (): Island => {
    const island = new Island(fresh(4))
    set(island, 'house', land(1, 0.5))
    set(island, 'tree', land(-1.5, 0))
    set(island, 'sheep', land(1.2, -1.6))
    set(island, 'boat', { kind: 'sea', x: 5, z: 0 })
    run(island, 2)
    quiet(island)
    return island
  }
  const picture = (island: Island): string => JSON.stringify(island.show())

  /** Puts the game away as the Mount does, and holds the game that comes back to the game its save loads, frame by frame, with nothing in motion and nothing sounding. */
  const putAway = (island: Island, label: string): Island => {
    const back = island.rested(4), loaded = load(island)
    expect(back.sounds, label).toHaveLength(0)
    expect(back.moving, label).toBe(false)
    expect(back.hand, label).toBeNull()
    expect(back.washingNow, label).toBe(false)
    expect(picture(back), label).toBe(picture(loaded))
    const first = KINDS.map((kind) => ({ ...shown(back, kind) }))
    for (let t = 0; t < 3; t += 1 / 60) {
      back.step(1 / 60)
      loaded.step(1 / 60)
      expect(picture(back), label).toBe(picture(loaded))
      // Nothing flies back, lands or leaps after the return, and nothing of what was going on is heard.
      expect(back.moving, label).toBe(false)
      for (const name of [...WASH_SOUNDS, 'knock', 'splash', 'clack', 'bump', 'mrow', 'yawnDown']) expect(names(back), `${label} ${name}`).not.toContain(name)
    }
    for (const kind of KINDS) {
      // Every toy stands where it stood in the first frame after the return (the boat afloat sails on from there).
      const now = shown(back, kind)
      expect(now.on, `${label} ${kind}`).toBe(first[KINDS.indexOf(kind)].on)
      if (kind !== 'boat' && !(kind === 'sheep' && where(back, 'sheep') === 'boat')) expect(Math.hypot(now.x - first[KINDS.indexOf(kind)].x, now.z - first[KINDS.indexOf(kind)].z), `${label} ${kind}`).toBeLessThan(0.2)
    }
    return back
  }

  it('for a toy in the hand: it is back in its slot', () => {
    const island = full()
    set(island, 'house', { kind: 'tray', x: 0, z: TRAY_Z })
    island.press({ kind: 'slot', toy: 'lighthouse' })
    island.release()
    run(island, 0.3)
    expect(island.hand).toBe('lighthouse')
    const back = putAway(island, 'hand')
    expect(shown(back, 'lighthouse').y).toBeCloseTo(TRAY_TOP, 2)
    expect(back.waiting).toContain('lighthouse')
  })

  it('for a rearing wave: it lies at its edge, and no wash starts after the return', () => {
    const island = full()
    island.press({ kind: 'wave' })
    island.release()
    run(island, 0.5)
    const back = putAway(island, 'rear')
    run(back, REAR_S + 2)
    expect(back.washingNow).toBe(false)
    expect(back.show().wave.rear).toBe(0)
    expect(back.show().wave.x).toBe(back.posts.wave.x)
    expect(where(back, 'house')).toBe('land')
    expect(shown(back, 'house').on).toBe('island')
  })

  it('for a wash put away at any moment of it: every toy is in its slot, the wave is at its edge, and nothing of the wash plays or sounds', () => {
    for (const after of [0.05, 0.6, 1.5, 2.6, 3.4, 4.8]) {
      const island = full()
      island.press({ kind: 'wave' })
      island.release()
      run(island, REAR_S + after)
      expect(island.washingNow, `${after}`).toBe(true)
      const back = putAway(island, `wash ${after}`)
      for (const kind of KINDS) {
        expect(where(back, kind), `${after} ${kind}`).toBe('tray')
        expect(shown(back, kind).y, `${after} ${kind}`).toBeCloseTo(TRAY_TOP, 2)
      }
      expect(back.show().wave.x).toBe(back.posts.wave.x)
      expect(back.show().buoyLift).toBe(0)
    }
  })

  it('for a toy in the air: it stands where it was going, and comes down with no knock after the return', () => {
    const island = full()
    set(island, 'house', { kind: 'tray', x: 0, z: TRAY_Z })
    quiet(island)
    island.press({ kind: 'slot', toy: 'house' })
    island.release()
    island.press(land(1, 0.5))
    island.release()
    island.step(1 / 60)
    expect(shown(island, 'house').y).toBeGreaterThan(LAND_Y + 0.5)
    const back = putAway(island, 'air')
    expect(shown(back, 'house').on).toBe('island')
    expect(shown(back, 'house').y).toBeCloseTo(LAND_Y, 1)
  })

  it('for a carried toy that the put-away took from the finger: it is back where it stood, without flying there', () => {
    const island = full()
    island.press({ kind: 'toy', toy: 'house' })
    island.dragStart()
    island.drag({ x: -2, z: 3 })
    run(island, 0.4)
    // The Mount ends the touch first: the drag is cancelled, and the toy is on its way back.
    island.cancel()
    const back = putAway(island, 'carried')
    expect(shown(back, 'house').x).toBeCloseTo(1, 1)
    expect(shown(back, 'house').y).toBeCloseTo(LAND_Y, 1)
  })

  it('for an island that was spinning, with the gull in the air and the crown eaten: it is still, the gull is in its place and the tree is whole', () => {
    const island = full()
    // The sheep by the tree eats the crown down.
    set(island, 'sheep', land(-0.2, 0.3))
    for (let t = 0; t < 12 && shown(island, 'tree').crown > 0.8; t += 1 / 60) island.step(1 / 60)
    expect(shown(island, 'tree').crown).toBeLessThanOrEqual(0.8)
    // The house goes home and the gull takes off for its buoy; the island is flicked.
    island.press({ kind: 'slot', toy: 'lighthouse' })
    island.release()
    island.press({ kind: 'tray', x: 0, z: TRAY_Z })
    island.release()
    spin(island, 0.5)
    run(island, 0.2)
    expect(island.moving).toBe(true)
    expect(shown(island.rested(4), 'tree').crown).toBe(1)
    const back = putAway(island, 'spin')
    expect(back.turning).toBe(0)
    expect(inner<{ gull: { doing: { flying: number } } }>(back).gull.doing.flying).toBe(-1)
  })

  it('for a cat in the middle of a leap, and one waiting on the rim with a seat free: it sits in its seat', () => {
    const island = full()
    const seat = { x: island.show().cat.x, z: island.show().cat.z }
    set(island, 'house', { kind: 'tray', x: 0, z: TRAY_Z })
    island.press({ kind: 'slot', toy: 'house' })
    island.release()
    island.press(land(seat.x, seat.z))
    island.release()
    run(island, 0.25)
    const leaping = putAway(island, 'leap')
    expect(leaping.show().cat.pose.y ?? 0).toBeLessThan(0.3)
    // On the back of the rim with seats free, as when it waits for the gull to come down or for a way round.
    const waiting = new Island(fresh(4))
    set(waiting, 'house', land(1, 0.5))
    const cat = inner<{ cat: { seat: number; from: number } }>(waiting).cat
    cat.seat = cat.from = RIM_SEAT
    waiting.state.cat = RIM_SEAT
    const back = putAway(waiting, 'waiting')
    expect(inner<{ cat: { seat: number } }>(back).cat.seat).not.toBe(RIM_SEAT)
  })

  it('keeps a first visit a first visit, and what the child changed', () => {
    for (const age of [null, 2, 4]) {
      const island = new Island(fresh(age))
      run(island, 5)
      const back = island.rested(age)
      expect(back.state.toys).toEqual(fresh(age).toys)
      expect(back.dirty).toBe(false)
    }
    const island = full()
    const back = island.rested(4)
    expect(JSON.parse(JSON.stringify(serialize(back.state)))).toEqual(JSON.parse(JSON.stringify(serialize(island.state))))
  })
})

describe('the gull tapped', () => {
  it('cries, and its buoy clangs only when it is on the buoy and the buoy rocks', () => {
    const onBuoy = new Island(fresh(4))
    onBuoy.press({ kind: 'gull' })
    expect(onBuoy.sounds).toEqual([{ name: 'kyah' }, { name: 'clang', delay: 0.2 }])
    onBuoy.step(1 / 60)
    expect(onBuoy.show().buoy).not.toBe(0)
    for (const house of [land(1.5, -0.5), { kind: 'sea', x: 3, z: 3 }] as Target[]) {
      const away = new Island(fresh(4))
      set(away, 'house', house)
      run(away, 3)
      expect(Math.abs(away.show().gull.x - away.posts.buoy.x)).toBeGreaterThan(1)
      quiet(away)
      const buoy = inner<{ buoy: { x: number; v: number } }>(away).buoy, before = { ...buoy }
      away.press({ kind: 'gull' })
      expect(away.sounds).toEqual([{ name: 'kyah' }])
      // The buoy is not pushed: it lies as the gull's lift-off left it.
      expect(buoy).toEqual(before)
    }
  })

  it('leaves the buoy alone while the gull is off it: in a dive beside it, and on its way home to it', () => {
    type Gull = { gull: { doing: { place: string; flying: number; dive: number } }; buoy: { x: number; v: number } }
    // A splash in the sea: sure it is a fish, the gull dives off its buoy.
    const diving = new Island(fresh(4))
    set(diving, 'tree', { kind: 'sea', x: 3, z: 3 })
    let dived = false
    for (let t = 0; t < 4 && !dived; t += 1 / 60) { diving.step(1 / 60); dived = inner<Gull>(diving).gull.doing.dive > 0.3 }
    expect(dived).toBe(true)
    expect(inner<Gull>(diving).gull.doing.place).toBe('buoy')
    quiet(diving)
    const under = inner<Gull>(diving).buoy, was = { ...under }
    diving.press({ kind: 'gull' })
    expect(diving.sounds).toEqual([{ name: 'kyah' }])
    expect(under).toEqual(was)
    // The house goes home and the gull flies back from its smoke: its place is the buoy already, and it is not there yet.
    const homing = new Island(fresh(4))
    set(homing, 'house', land(1.5, -0.5))
    run(homing, 3)
    homing.press({ kind: 'toy', toy: 'house' })
    homing.dragStart()
    homing.drag({ x: 0, z: TRAY_Z })
    homing.drop()
    let flying = false
    for (let t = 0; t < 4 && !flying; t += 1 / 60) { homing.step(1 / 60); const g = inner<Gull>(homing).gull.doing; flying = g.place === 'buoy' && g.flying > 0.2 && g.flying < 0.8 }
    expect(flying).toBe(true)
    quiet(homing)
    const buoy = inner<Gull>(homing).buoy, before = { ...buoy }
    homing.press({ kind: 'gull' })
    expect(homing.sounds).toEqual([{ name: 'kyah' }])
    expect(buoy).toEqual(before)
    // Landed, it stands on the buoy again, and the buoy clangs under it.
    run(homing, 3)
    quiet(homing)
    homing.press({ kind: 'gull' })
    expect(names(homing)).toEqual(['kyah', 'clang'])
  })
})

describe('the boat afloat', () => {
  it('hisses its wake with each creak for as long as it sails, as loud as the island is', () => {
    const island = new Island(fresh(4))
    set(island, 'boat', { kind: 'sea', x: 5, z: 0 })
    quiet(island)
    const heard: { name: string; gain?: number }[] = []
    for (let t = 0; t < 12; t += 1 / 60) {
      island.step(1 / 60)
      const now = island.sounds.filter((sound) => sound.name === 'creak' || sound.name === 'wake')
      // Never one without the other.
      expect(now.map((sound) => sound.name)).toEqual(now.length > 0 ? ['creak', 'wake'] : [])
      heard.push(...now.map((sound) => ({ name: sound.name, gain: sound.gain })))
      island.sounds.length = 0
    }
    expect(heard.filter((sound) => sound.name === 'wake').length).toBeGreaterThanOrEqual(2)
    // Softer when the island has not been touched for a while.
    expect(heard[1].gain).toBeGreaterThan(heard[heard.length - 1].gain!)
  })
})

describe('the sheep aboard, tapped', () => {
  it('jumps straight up off the deck with its fleece puffed out, with its "BAA" and its "poof": on the land and afloat', () => {
    for (const boat of [land(1.2, 1.6), { kind: 'sea', x: 5, z: 0 }] as Target[]) {
      const island = new Island(fresh(4))
      set(island, 'boat', boat)
      island.press({ kind: 'slot', toy: 'sheep' })
      island.release()
      island.press({ kind: 'toy', toy: 'boat' })
      island.release()
      run(island, 3)
      expect(where(island, 'sheep')).toBe('boat')
      quiet(island)
      island.press({ kind: 'toy', toy: 'sheep' })
      island.release()
      expect(names(island)).toEqual(['bigBaa'])
      let up = 0, ball = 0, head = 0
      const heard: string[] = []
      for (let t = 0; t < 1; t += 1 / 60) {
        island.step(1 / 60)
        heard.push(...names(island))
        island.sounds.length = 0
        const pose = shown(island, 'sheep').pose
        up = Math.max(up, pose.y)
        ball = Math.max(ball, pose.sy)
        head = Math.min(head, pose.part.pitch)
      }
      expect(up).toBeGreaterThan(0.7)
      expect(ball).toBeGreaterThan(1.15)
      expect(heard).toContain('poof')
      // And it stands on the deck again as it stood.
      run(island, 1)
      expect(shown(island, 'sheep').pose.y).toBe(0)
      expect(shown(island, 'sheep').pose.sy).toBe(1)
    }
  })
})

describe('the ring under a carried toy', () => {
  it('shows the whole way where the toy will come down: on its slot in the tray where it would go home', () => {
    const island = new Island(fresh(4))
    island.press({ kind: 'slot', toy: 'house' })
    island.dragStart()
    const slot = slotOf('house')
    // Near the tray, where a toy let go hops back into its slot; then out over the land; then back.
    for (const [x, z, home] of [[0, TRAY_Z - 1, true], [1, 0.5, false], [slot.x, TRAY_Z, true], [-9, TRAY_Z, true]] as const) {
      island.drag({ x, z })
      island.step(1 / 60)
      const spot = island.show().spot
      expect(spot, `${x} ${z}`).not.toBeNull()
      if (home) {
        // On the slot it is marked as home: the view draws a whole disc there, not a ring.
        expect(spot).toMatchObject({ x: slot.x, y: TRAY_TOP, z: slot.z, home: true })
        expect(spot!.r).toBeGreaterThan(0.5)
      } else {
        expect(spot!.y).toBe(LAND_Y)
        expect(spot!.home).toBe(false)
      }
    }
    // And let go there, that is where it goes.
    island.drop()
    run(island, 1)
    expect(where(island, 'house')).toBe('tray')
    expect(island.show().spot).toBeNull()
  })
})
