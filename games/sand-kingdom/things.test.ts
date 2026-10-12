import { describe, expect, it } from 'vitest'
import { cameraFor, project } from './camera'
import { base } from './field'
import { BEACH, SHELL_RADIUS, TAKEN, bucketPatch, firstThings, isClear, keep, patchesOf, reach, readThings, settle, woodPatches, writeThings } from './things'

describe('the things on a first visit', () => {
  it('stand the bucket heaped full for a child of 4 and younger and for no age, and empty from 5 on, with both ends open', () => {
    for (const age of [null, 1, 2, 3, 4]) expect(firstThings(age).bucket.holds, `age ${age}`).toBe('sand')
    for (const age of [5, 6, 7, 9, 14]) expect(firstThings(age).bucket.holds, `age ${age}`).toBe('nothing')
  })

  it('differ by age in nothing but how the bucket stands', () => {
    const young = firstThings(3), old = firstThings(7)
    expect({ ...young, bucket: { ...young.bucket, holds: 'x' } }).toEqual({ ...old, bucket: { ...old.bucket, holds: 'x' } })
  })

  it('lie well apart, clear of the folk and their rocks', () => {
    const things = firstThings(null)
    const all = [[bucketPatch(things.bucket)], ...things.shells.map((shell) => [{ x: shell.x, z: shell.z, r: SHELL_RADIUS }]), ...things.wood.map(woodPatches)]
    all.forEach((mine, index) => {
      expect(isClear(mine, TAKEN, 0.05), `thing ${index} clear of the folk's places`).toBe(true)
      all.forEach((other, at) => {
        if (at !== index) expect(isClear(mine, other, 0.15), `thing ${index} apart from thing ${at}`).toBe(true)
      })
    })
  })
})

describe('where a thing comes to rest', () => {
  it('is where it was going when nothing is in the way', () => {
    expect(settle(0, 3, (x, z) => [{ x, z, r: 0.6 }], TAKEN)).toEqual({ x: 0, z: 3 })
  })

  it('is beside what is in the way, never on it, wherever it was going', () => {
    const things = firstThings(null)
    for (let z = BEACH.z0; z <= BEACH.z1; z += 0.45) {
      for (let x = BEACH.x0; x <= BEACH.x1; x += 0.45) {
        const taken = [...TAKEN, ...patchesOf(things, { kind: 'shell', index: 0 })]
        const at = settle(x, z, (px, pz) => [{ x: px, z: pz, r: SHELL_RADIUS }], taken)
        expect(isClear([{ x: at.x, z: at.z, r: SHELL_RADIUS }], taken), `a shell let go at ${x.toFixed(1)}, ${z.toFixed(1)}`).toBe(true)
        expect(Math.abs(at.x)).toBeLessThanOrEqual(reach(at.z) + 1e-9)
      }
    }
  })

  it.each([[1180, 820], [1024, 768]] as const)('is on the surface, clear of its edges, anywhere on the beach at %i by %i', (width, height) => {
    const camera = cameraFor(width, height)
    for (let z = BEACH.z0; z <= BEACH.z1 + 1e-9; z += 0.4) {
      for (const side of [-1, 1]) {
        const at = keep(side * 99, z)
        const p = project(camera, at.x, base(at.z) + 0.1, at.z)
        expect(p.x, `the edge of the beach at z ${z.toFixed(1)}`).toBeGreaterThan(50)
        expect(p.x).toBeLessThan(width - 50)
        expect(p.y).toBeLessThan(height * 0.9)
      }
    }
  })
})

describe('the saved things', () => {
  it('round-trip through storage', () => {
    const things = firstThings(7)
    things.bucket = { x: -1.23, z: 4.56, holds: 'sand', shell: true, side: false }
    things.shells[1] = { x: 0, z: 0, up: false, state: 'bucket' }
    things.shells[2] = { x: 2.5, z: 3.25, up: false, state: 'tower' }
    things.wood[0] = { x: -3, z: 2, turn: 1.2 }
    expect(readThings(JSON.parse(JSON.stringify(writeThings(things))), null)).toEqual(things)
  })

  it('repair each field by itself and take a first-visit place for what cannot be read', () => {
    const fresh = firstThings(null)
    expect(readThings({}, null)).toEqual(fresh)
    expect(readThings({ bucket: 'x', shells: 7, wood: null }, 6)).toEqual(firstThings(6))
    const read = readThings({ bucket: { x: 999, z: 'a', holds: 'gold', side: 1 }, shells: [{ x: -99, z: 2, up: 0, state: 'gone' }, null], wood: [{ turn: 99 }] }, null)
    expect(Math.abs(read.bucket.x)).toBeLessThanOrEqual(BEACH.x1)
    expect(read.bucket.z).toBe(fresh.bucket.z)
    expect(read.bucket.holds).toBe(fresh.bucket.holds)
    expect(read.bucket.side).toBe(false)
    expect(read.shells[0]).toEqual({ x: BEACH.x0, z: 2, up: true, state: 'lying' })
    expect(read.shells[1]).toEqual(fresh.shells[1])
    expect(read.shells).toHaveLength(3)
    expect(read.wood[0]).toEqual({ x: fresh.wood[0].x, z: fresh.wood[0].z, turn: Math.PI })
    expect(read.wood).toHaveLength(2)
  })

  it('never hold two shells in the bucket, a shell in a bucket that does not know it, or anything in a bucket on its side', () => {
    const two = readThings({ bucket: { x: 0, z: 3, holds: 'sand', shell: true }, shells: [{ state: 'bucket' }, { state: 'bucket' }] }, null)
    expect(two.shells.filter((shell) => shell.state === 'bucket')).toHaveLength(1)
    const none = readThings({ bucket: { x: 0, z: 3, holds: 'sand', shell: false }, shells: [{ state: 'bucket' }] }, null)
    expect(none.shells[0].state).toBe('lying')
    const lost = readThings({ bucket: { x: 0, z: 3, holds: 'sand', shell: true }, shells: [] }, null)
    expect(lost.bucket.shell).toBe(false)
    const side = readThings({ bucket: { x: 0, z: 3, holds: 'water', shell: true, side: true }, shells: [{ state: 'bucket' }] }, null)
    expect(side.bucket.holds).toBe('nothing')
    expect(side.shells[0].state).toBe('lying')
  })
})

describe('the two boughs of a first visit', () => {
  it('lie well off level, far from parallel and not one above the other: together they are no sign', () => {
    for (const age of [null, 3, 7]) {
      const [one, other] = firstThings(age).wood
      // How far a bough is turned from level, whichever end is named first.
      const off = (turn: number): number => Math.abs(Math.atan(Math.tan(turn)))
      expect(off(one.turn)).toBeGreaterThan(0.35)
      expect(off(other.turn)).toBeGreaterThan(0.35)
      expect(off(one.turn - other.turn)).toBeGreaterThan(0.8)
      // Side by side on the sand and not stacked: what one covers from left to right, the other all but leaves free.
      const span = (wood: { x: number; turn: number }): [number, number] => {
        const xs = woodPatches({ ...wood, z: 0 }).flatMap((patch) => [patch.x - patch.r, patch.x + patch.r])
        return [Math.min(...xs), Math.max(...xs)]
      }
      const a = span(one), b = span(other)
      expect(Math.min(a[1], b[1]) - Math.max(a[0], b[0])).toBeLessThan(0.6)
    }
  })
})
