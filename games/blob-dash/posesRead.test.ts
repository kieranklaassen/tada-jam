import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TIERS } from './config'
import { FRAME, fresh, piece } from './drive'
import { Count, standIn } from './recording'
import { View } from './view'

// Every number of a pose is drawn. The model works out how each of the cast
// and each blob stands; a number the view never reads is a motion the sheet
// promises and the child never sees. Here the pose functions hand the view
// their results wrapped, so that every field the view reads is noted, and a
// frame is drawn. A field no frame read fails by name.

const read = vi.hoisted(() => ({ seen: new Map<string, Set<string>>(), made: new Map<string, Set<string>>() }))

function noted<T extends object>(name: string, pose: T): T {
  const made = read.made.get(name) ?? new Set<string>(), seen = read.seen.get(name) ?? new Set<string>()
  read.made.set(name, made)
  read.seen.set(name, seen)
  for (const key of Object.keys(pose)) made.add(key)
  return new Proxy(pose, {
    get: (target, key) => {
      if (typeof key === 'string') seen.add(key)
      return Reflect.get(target, key)
    },
  })
}

vi.mock('./cast', async (original) => {
  const cast = await original<typeof import('./cast')>()
  return {
    ...cast,
    pigeonPose: (...args: Parameters<typeof cast.pigeonPose>) => noted('pigeon', cast.pigeonPose(...args)),
    ratPose: (...args: Parameters<typeof cast.ratPose>) => noted('rat', cast.ratPose(...args)),
    catPose: (...args: Parameters<typeof cast.catPose>) => noted('cat', cast.catPose(...args)),
    neighbourPose: (...args: Parameters<typeof cast.neighbourPose>) => noted('neighbour', cast.neighbourPose(...args)),
    cameraPose: (...args: Parameters<typeof cast.cameraPose>) => noted('camera', cast.cameraPose(...args)),
  }
})

vi.mock('./body', async (original) => {
  const body = await original<typeof import('./body')>()
  return { ...body, bodyOf: (...args: Parameters<typeof body.bodyOf>) => noted('blob', body.bodyOf(...args)) }
})

const W = 1180, H = 820, RATIO = 2
let view: View

beforeAll(() => {
  const count = new Count()
  view = new View(standIn(W * RATIO, H * RATIO, count), (w, h) => standIn(w, h, count))
  view.setTier(TIERS[0])
  view.resize(W, H, RATIO)
  // A loop in which everything happens: springs on beats and halves, every kind of piece, pokes, a clear-out.
  const toy = fresh(150, [0, 3, 6, 9, 12, 20, 25], [piece('drum', 2), piece('chime', 5), piece('splitter', 7), piece('tunnel', 10), piece('wall', 13), piece('flip', 15)], 3)
  view.lay(toy)
  for (let i = 0; i < 1200; i++) {
    toy.step(FRAME)
    view.draw(toy, null)
  }
})

describe('every number of a pose is drawn', () => {
  for (const who of ['pigeon', 'rat', 'cat', 'neighbour', 'camera', 'blob']) {
    it(`reads every field of the ${who}'s pose`, () => {
      const made = [...(read.made.get(who) ?? [])], seen = read.seen.get(who) ?? new Set<string>()
      expect(made.length).toBeGreaterThan(2)
      expect(made.filter((key) => !seen.has(key))).toEqual([])
    })
  }
})
