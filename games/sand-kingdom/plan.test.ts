import { describe, expect, it } from 'vitest'
import { type Field, base, furrow, groove, heightAt, makeField, pat, tower } from './field'
import { STAR_ROCK } from './layout'
import { BANK_WALK, CRAB_BACK, type Plan, planFor } from './plan'
import { type Things, firstThings } from './things'
import { EVENING_SEA, flood, wall } from './water'

/** A groove dug through points, as a finger digs it. */
function dig(field: Field, points: readonly (readonly [number, number])[]): void {
  for (let i = 1; i < points.length; i++) groove(field, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
}
/** A ring of groove round a point. */
function ring(field: Field, x: number, z: number, r: number, gap = 0): void {
  const points: [number, number][] = []
  for (let i = 0; i <= 24; i++) {
    const turn = gap + (i / 24) * (Math.PI * 2 - gap)
    points.push([x + Math.cos(turn) * r, z + Math.sin(turn) * r])
  }
  dig(field, points)
}
/** The things put out of the way, at the bottom of the beach, so a plan is about the sand alone. */
function aside(): Things {
  const things = firstThings(5)
  things.bucket.x = 5.2
  things.bucket.z = -1.6
  things.wood[0] = { x: -4.4, z: -1.6, turn: 0 }
  things.wood[1] = { x: 2.6, z: -1.6, turn: 0 }
  things.shells.forEach((shell, index) => {
    shell.x = -5.5 + index * 0.1
    shell.z = 7.3 - index * 1.3
  })
  return things
}
function plan(field: Field, dug: number[] = [], things: Things = aside()): Plan {
  return planFor(field, flood(field, EVENING_SEA, dug, 0), things)
}

describe('what the beach holds for the folk at evening', () => {
  it('is nothing on a smooth beach: each stays at its own place, and the bored small crabs come', () => {
    expect(plan(makeField())).toEqual({ crab: { kind: 'home' }, star: { on: 'rock' }, eel: { kind: 'rock' }, gulls: { kind: 'log' }, bored: true })
  })

  it('gives the crab a closed ring of groove to patrol, all the way round on its bank, and says whether the water reached it', () => {
    const field = makeField()
    // Well clear of the rocks: with the starfish on its back, the two of them need the whole bank free.
    ring(field, -0.8, 4.4, 1.3)
    const dry = plan(field)
    expect(dry.crab.kind).toBe('ring')
    if (dry.crab.kind === 'ring') {
      expect(dry.crab.wet).toBe(false)
      // Its line is on the bank, outside the groove, and never in the groove.
      for (const point of dry.crab.path) {
        expect(Math.hypot(point.x + 0.8, point.z - 4.4)).toBeGreaterThan(1.3 + BANK_WALK * 0.6)
        expect(heightAt(field, point.x, point.z)).toBeGreaterThan(base(point.z) - 0.1)
      }
    }
    // A channel from the sea to the ring: now the water reaches it.
    dig(field, [[-0.8, -2.5], [-0.8, 0], [-0.8, 3.2]])
    const wet = plan(field)
    expect(wet.crab.kind).toBe('ring')
    if (wet.crab.kind === 'ring') expect(wet.crab.wet).toBe(true)
    expect(wet.bored).toBe(false)
  })

  it('gives the crab a ring with a gap as a line to walk to the gap and back', () => {
    const field = makeField()
    ring(field, 0, 3.6, 1.5, 1.2)
    const open = plan(field)
    expect(open.crab.kind).toBe('groove')
    if (open.crab.kind === 'groove') expect(open.crab.path.length).toBeGreaterThanOrEqual(4)
  })

  it('sends the starfish to the tallest tower, and with no tower to the back of the crab where the crab walks a bank', () => {
    const field = makeField()
    expect(plan(field).star).toEqual({ on: 'rock' })
    // A ring and no tower: the crab on its bank is the highest thing there is.
    const moat = makeField()
    ring(moat, 0, 3.6, 1.5)
    expect(plan(moat).star).toEqual({ on: 'crab' })
    expect(CRAB_BACK).toBeGreaterThan(STAR_ROCK.top - base(STAR_ROCK.z))
    tower(field, -1, 3, 0, 1)
    const one = plan(field)
    expect(one.star.on).toBe('tower')
    if (one.star.on === 'tower') expect(Math.hypot(one.star.x + 1, one.star.z - 3)).toBeLessThan(0.4)
    // A second tier somewhere else is taller: it goes there.
    tower(field, 2, 2, 0, 1)
    tower(field, 2, 2, 0.7, 0.7)
    const two = plan(field)
    if (two.star.on === 'tower') expect(Math.hypot(two.star.x - 2, two.star.z - 2)).toBeLessThan(0.4)
    expect(two.star.on).toBe('tower')
  })

  it('sends the eel to a groove with water in it, and under the driftwood that lies across', () => {
    const field = makeField()
    dig(field, [[2, -2.5], [2, 0], [2, 2], [2, 4]])
    const open = plan(field)
    expect(open.eel.kind).toBe('groove')
    if (open.eel.kind === 'groove') {
      expect(open.eel.bridge).toBe(null)
      // The driftwood here lies beside the groove's sea end, near enough for its nose.
      expect(open.eel.wood).toEqual({ x: 2.6, z: -1.6 })
    }
    // Driftwood lying near: something for its nose.
    const near = aside()
    near.wood[1] = { x: 3.6, z: 2, turn: Math.PI / 2 }
    const sniff = plan(field, [], near)
    expect(sniff.eel.kind).toBe('groove')
    if (sniff.eel.kind === 'groove') expect(sniff.eel.wood).toEqual({ x: 3.6, z: 2 })
    // Driftwood across: a dark way through.
    const across = aside()
    across.wood[1] = { x: 2, z: 2, turn: 0 }
    const dark = plan(field, [], across)
    expect(dark.eel.kind).toBe('groove')
    if (dark.eel.kind === 'groove') {
      expect(dark.eel.bridge).not.toBe(null)
      const at = dark.eel.path[dark.eel.bridge!]
      expect(Math.hypot(at.x - 2, at.z - 2)).toBeLessThan(0.6)
    }
    // A groove the water cannot reach is no place for it.
    const dry = makeField()
    dig(dry, [[-2, 3], [0, 3.5], [2, 3]])
    expect(plan(dry).eel).toEqual({ kind: 'rock' })
  })

  it('gives the gulls a wall long enough for three: flat where it was patted, lumpy where it was not', () => {
    const field = makeField()
    // The banks of a furrow the bucket ploughed are a wall with a lumpy top.
    furrow(field, -2.5, 3.5, 2.5, 3.5)
    const lumpy = plan(field)
    expect(lumpy.gulls.kind).toBe('wall')
    if (lumpy.gulls.kind === 'wall') {
      expect(lumpy.gulls.flat).toBe(false)
      expect(lumpy.gulls.perches).toHaveLength(3)
    }
    // Patted along one bank, it holds them.
    for (let x = -2.2; x <= 2.2; x += 0.35) pat(field, x, 3.5 - 0.9)
    const flat = plan(field)
    expect(flat.gulls.kind).toBe('wall')
    if (flat.gulls.kind === 'wall') expect(flat.gulls.flat).toBe(true)
  })

  it('sends the gulls to the next best row when something lies on the best one, and leaves them on the log only when no row of any wall is clear', () => {
    const field = makeField()
    // The two banks of a furrow: the near one patted flat, the far one lumpy.
    furrow(field, -2.5, 3.5, 2.5, 3.5)
    for (let x = -2.2; x <= 2.2; x += 0.35) pat(field, x, 3.5 - 0.9)
    const best = plan(field).gulls
    expect(best.kind).toBe('wall')
    if (best.kind !== 'wall') return
    expect(best.flat).toBe(true)
    const clearOf = (perches: readonly { x: number; z: number }[], at: { x: number; z: number }, r: number): boolean =>
      perches.every((perch) => Math.hypot(perch.x - at.x, perch.z - at.z) >= 0.6 + r - 1e-6 && Math.hypot(perch.x - at.x, perch.z + 0.6 - at.z) >= 0.5 + r - 1e-6)
    // A shell on the middle of the best row: the same flat wall is long enough for a row beside the shell.
    const shell = aside()
    Object.assign(shell.shells[0], { x: best.perches[1].x, z: best.perches[1].z, state: 'lying' })
    const beside = plan(field, [], shell).gulls
    expect(beside.kind).toBe('wall')
    if (beside.kind !== 'wall') return
    expect(beside.flat).toBe(true)
    expect(beside.perches).not.toEqual(best.perches)
    expect(clearOf(beside.perches, shell.shells[0], 0.3)).toBe(true)
    // A bough along the whole of the flat bank: the next best row is on the lumpy bank, and they try that.
    const bough = aside()
    bough.wood[0] = { x: 0, z: best.perches[1].z, turn: 0 }
    bough.wood[1] = { x: 0, z: best.perches[1].z + 0.6, turn: 0 }
    const lumpy = plan(field, [], bough).gulls
    expect(lumpy.kind).toBe('wall')
    if (lumpy.kind !== 'wall') return
    expect(lumpy.flat).toBe(false)
    expect(Math.abs(lumpy.perches[1].z - best.perches[1].z)).toBeGreaterThan(1)
    for (const piece of bough.wood) for (const along of [-0.9, -0.45, 0, 0.45, 0.9]) expect(clearOf(lumpy.perches, { x: piece.x + along, z: piece.z }, 0.42)).toBe(true)
    // And with the bucket and the shells along the lumpy bank too, no row of either wall is clear: the log.
    const full = aside()
    full.wood = bough.wood.map((piece) => ({ ...piece }))
    full.bucket.x = lumpy.perches[1].x
    full.bucket.z = lumpy.perches[1].z
    full.shells.forEach((one, index) => Object.assign(one, { x: -2.2 + index * 2.2, z: lumpy.perches[1].z, state: 'lying' }))
    expect(plan(field, [], full).gulls.kind).toBe('log')
    // The best row alone, as it was asked for before: with the shell on it, that one row is not clear.
    expect(clearOf(wall(field)!.perches, shell.shells[0], 0.3)).toBe(false)
  })

  it('keeps the gulls off the tower the starfish lies on: a row of raised sand that takes in the tower is no wall for them', () => {
    const field = makeField()
    // One tower, and the bank of a short furrow that runs up to its foot: together they are long enough for three.
    tower(field, 0, 4, 0, 1)
    furrow(field, 1.7, 3.2, 2.5, 3.2)
    const row = wall(field)
    expect(row).not.toBeNull()
    // The fixture is the case: the row found on the sand stands one gull on the tower.
    expect(Math.min(...row!.perches.map((perch) => Math.hypot(perch.x, perch.z - 4)))).toBeLessThan(0.6)
    const made = plan(field)
    expect(made.star).toMatchObject({ on: 'tower' })
    expect(made.gulls.kind).toBe('log')
  })

  it('does not send the starfish to a tower the bucket stands right against: there it has no room to lie clear of it', () => {
    const field = makeField()
    tower(field, 0, 4, 0, 1)
    // Beside the tower where a turned-out bucket comes to stand: the starfish lies there, turned to it.
    const beside = aside()
    Object.assign(beside.bucket, { x: 1.55, z: 4.25 })
    expect(plan(field, [], beside).star.on).toBe('tower')
    // Right against the foot of the tower, and lying on its side there: no room, and no ring for the crab, so it stays on its rock.
    const against = aside()
    Object.assign(against.bucket, { x: 1.0, z: 4.2 })
    expect(plan(field, [], against).star.on).toBe('rock')
    const lying = aside()
    Object.assign(lying.bucket, { x: 1.5, z: 4.2, side: true })
    expect(plan(field, [], lying).star.on).toBe('rock')
  })

  it('keeps every evening place clear of the bucket, the shells and the driftwood', () => {
    const field = makeField()
    ring(field, 0, 3.6, 1.5)
    furrow(field, -3.5, 1.2, 0.5, 1.2)
    const things = firstThings(null)
    // The bucket on the crab's bank, and wood on the gulls' wall.
    things.bucket.x = 0
    things.bucket.z = 3.6 + 1.5 + BANK_WALK
    things.wood[0] = { x: -1.5, z: 0.4, turn: 0 }
    const made = plan(field, [], things)
    const clear = (x: number, z: number, r: number, what: string) => {
      expect(Math.hypot(x - things.bucket.x, z - things.bucket.z), `${what} and the bucket`).toBeGreaterThanOrEqual(0.6 + r - 1e-6)
      for (const piece of things.wood) for (const along of [-0.8, 0, 0.8]) expect(Math.hypot(x - (piece.x + Math.cos(piece.turn) * along), z - (piece.z + Math.sin(piece.turn) * along)), `${what} and the wood`).toBeGreaterThanOrEqual(0.42 + r - 1e-6)
    }
    if (made.crab.kind !== 'home') for (const point of made.crab.path) clear(point.x, point.z, 0.95, 'the crab')
    if (made.gulls.kind === 'wall') for (const perch of made.gulls.perches) clear(perch.x, perch.z, 0.35, 'a gull')
  })
})
