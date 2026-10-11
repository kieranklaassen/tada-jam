import { describe, expect, it } from 'vitest'
import { POKE_S, PUFF_S, RIDE_BEAT, catPose, gullPose, handPoseOf, restPose, ridePose, spunPose, toyPose, whalePose, type CatDoing, type CatPose, type GullDoing, type GullPose, type Pose } from './motion'
import { KINDS, WEIGHT, type Kind } from './toys'

const numbers = (pose: Pose): number[] => [pose.x, pose.y, pose.z, pose.yaw, pose.pitch, pose.roll, pose.sx, pose.sy, pose.sz, pose.part.y, pose.part.yaw, pose.part.pitch, pose.part.roll, pose.part.s, pose.glow]

/** A toy's motion over a stretch of time, as one long list of numbers. */
function curve(kind: Kind, where: 'land' | 'sea', tapped: boolean): number[] {
  const out: number[] = [], pose = restPose()
  for (let i = 0; i < 60; i++) {
    const t = i / 30
    // The lighthouse's glow is its lamp, which every landed lighthouse has: it is no part of how it moves.
    // (The chimney's ball of smoke leaves every PUFF_S seconds, and the roof lifts by that clock.)
    out.push(...numbers(toyPose(kind, where, tapped ? 5 + t : 1 + t, tapped ? (t * POKE_S[kind]) / 2 : Infinity, WEIGHT[kind], 'graze', pose, (1 + t) % PUFF_S)).slice(0, 14))
  }
  return out
}

const distance = (a: number[], b: number[]): number => Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0))

describe('how the toys move', () => {
  it('gives no two toys the same motion: on the land, in the sea, or when tapped', () => {
    for (const where of ['land', 'sea'] as const) for (const tapped of [false, true]) {
      for (const a of KINDS) for (const b of KINDS) {
        if (a >= b) continue
        expect(distance(curve(a, where, tapped), curve(b, where, tapped)), `${a} and ${b}, ${where}, ${tapped ? 'tapped' : 'idle'}`).toBeGreaterThan(0.15)
      }
    }
  })

  it('moves each toy differently on the land and in the sea', () => {
    for (const kind of KINDS) expect(distance(curve(kind, 'land', false), curve(kind, 'sea', false)), kind).toBeGreaterThan(0.5)
  })

  it('answers a tap with something the idle motion does not do', () => {
    for (const kind of KINDS) for (const where of ['land', 'sea'] as const) {
      const pose = restPose()
      let most = 0
      for (let i = 1; i < 40; i++) {
        const poked = (i / 40) * POKE_S[kind]
        const tapped = numbers(toyPose(kind, where, 5 + poked, poked, WEIGHT[kind], 'graze', pose))
        const idle = numbers(toyPose(kind, where, 5 + poked, Infinity, WEIGHT[kind], 'graze', pose))
        most = Math.max(most, distance(tapped, idle))
      }
      // The boat afloat darts ahead, which the model does; its pose only lifts the bow.
      expect(most, `${kind} ${where}`).toBeGreaterThan(kind === 'boat' && where === 'sea' ? 0.1 : 0.12)
    }
  })

  it('keeps every number finite and every scale a size a thing can have', () => {
    const pose = restPose()
    for (const kind of KINDS) for (const where of ['land', 'sea'] as const) for (const grazing of ['munch', 'graze', 'ask'] as const) {
      for (let i = 0; i < 400; i++) {
        const age = i / 37, poked = i % 3 === 0 ? Infinity : (i % 50) / 30
        toyPose(kind, where, age, poked, WEIGHT[kind], grazing, pose)
        for (const value of numbers(pose)) expect(Number.isFinite(value)).toBe(true)
        for (const scale of [pose.sx, pose.sy, pose.sz]) {
          expect(scale).toBeGreaterThan(0.4)
          expect(scale).toBeLessThan(1.7)
        }
        expect(pose.part.s).toBeGreaterThan(0.1)
        // A toy keeps to its own ground: afloat, the tree lies off its middle along the shore, and the sheep and the boat are tipped about their middles.
        expect(Math.hypot(pose.x, pose.z)).toBeLessThanOrEqual(where === 'sea' ? { tree: 1.06, sheep: 0.33, boat: 0.16, lighthouse: 0.13, house: 0.13 }[kind] : 0.13)
      }
    }
  })

  it('squashes a landing more the heavier the toy, and is at rest soon after', () => {
    const light = restPose(), heavy = restPose()
    toyPose('house', 'land', 0, Infinity, 0, 'graze', light)
    toyPose('house', 'land', 0, Infinity, 1, 'graze', heavy)
    expect(heavy.sy).toBeLessThan(light.sy)
    expect(light.sy).toBeLessThan(1)
    toyPose('lighthouse', 'land', 3, Infinity, 1, 'graze', heavy)
    expect(heavy.sy).toBeCloseTo(1, 2)
  })

  it('has each toy say who it is with its one moving part as it leaves the ground, and then hang plain', () => {
    const part = (kind: Kind, held: number): number[] => { const pose = handPoseOf(kind, held, Infinity, restPose()); return [pose.part.y, pose.part.yaw, pose.part.pitch, pose.part.s - 1, pose.glow] }
    const hellos = KINDS.map((kind) => part(kind, 0.15))
    for (const hello of hellos) expect(hello.some((value) => Math.abs(value) > 0.05)).toBe(true)
    // No two with the same part in the same way.
    expect(new Set(hellos.map((hello) => hello.map((value) => (Math.abs(value) > 0.05 ? 1 : 0)).join(''))).size).toBe(KINDS.length)
    // It starts from rest, with no jump, and is over within half a second.
    for (const kind of KINDS) {
      expect(part(kind, 0).every((value) => Math.abs(value) < 1e-6)).toBe(true)
      expect(part(kind, 0.5).every((value) => Math.abs(value) < 1e-6)).toBe(true)
    }
  })

  it('rocks each toy in the hand at its own pace, and spins it once when it is tapped there', () => {
    const paces = KINDS.map((kind) => handPoseOf(kind, 0.4, Infinity, restPose()).roll)
    expect(new Set(paces.map((roll) => roll.toFixed(4))).size).toBe(KINDS.length)
    expect(handPoseOf('house', 1, 0.2, restPose()).yaw).toBeGreaterThan(1)
    expect(handPoseOf('house', 1, 0.45, restPose()).yaw).toBe(0)
  })
})

const idleCat = (more: Partial<CatDoing> = {}): CatDoing => ({ leap: -1, reach: 1, hop: 0, poked: Infinity, patted: Infinity, startled: Infinity, landedOn: Infinity, splashed: Infinity, pounced: Infinity, crouched: false, spun: 0, stopped: Infinity, pulled: 0, twanged: Infinity, flooded: false, wary: 0, ...more })
const idleGull = (more: Partial<GullDoing> = {}): GullDoing => ({ flying: -1, place: 'buoy', lifted: Infinity, tickled: Infinity, poked: Infinity, craned: Infinity, dive: -1, surf: -1, dodge: 0, room: Infinity, ...more })

describe('how the residents move', () => {
  it('keeps the cat, the gull and the whale moving with nobody touching', () => {
    const cat = {} as CatPose, gull = {} as GullPose, whale = { rise: 0, lids: 1, tail: 0 }
    const seen = { tail: new Set<string>(), foot: new Set<string>(), rise: new Set<string>() }
    for (let i = 0; i < 100; i++) {
      const t = i / 5
      seen.tail.add(catPose(t, idleCat(), cat).tail.toFixed(2))
      seen.foot.add(gullPose(t, idleGull(), gull).y.toFixed(3))
      seen.rise.add(whalePose(t, Infinity, whale).rise.toFixed(3))
    }
    for (const values of Object.values(seen)) expect(values.size).toBeGreaterThan(10)
  })

  it('blinks the cat and never leaves its eyes shut', () => {
    const cat = {} as CatPose
    let shut = 0
    for (let i = 0; i < 1000; i++) if (catPose(i / 50, idleCat(), cat).lids < 0.5) shut += 1
    expect(shut).toBeGreaterThan(0)
    expect(shut).toBeLessThan(60)
  })

  it('gives the cat a pose of its own for each thing that happens to it', () => {
    const cat = {} as CatPose, rest = { ...catPose(1, idleCat(), cat) }
    // Spun: low, leaning back against the turn, its eyes going round.
    catPose(1, idleCat({ spun: 1 }), cat)
    expect(cat.rove).toBeGreaterThan(0.5)
    expect(cat.lean).toBeLessThan(-0.1)
    expect(cat.squash).toBeLessThan(rest.squash)
    // The island has stopped: it sways for a moment.
    expect(Math.abs(catPose(1.13, idleCat({ stopped: 0.2 }), cat).roll)).toBeGreaterThan(0.02)
    // A toy came down where it sat: a glare with flat ears, and then a paw to the mouth.
    expect(catPose(1, idleCat({ landedOn: 0.2 }), cat).ears).toBeGreaterThan(0.5)
    expect(catPose(1, idleCat({ landedOn: 1.2 }), cat).wash).toBeGreaterThan(0.3)
    // A splash beside it: it flinches back, shakes a paw, and hisses with flat ears.
    expect(catPose(1, idleCat({ splashed: 0.2 }), cat).lean).toBeLessThan(-0.05)
    expect(catPose(1, idleCat({ splashed: 0.42 }), cat).paw).toBeGreaterThan(0.5)
    expect(catPose(1, idleCat({ splashed: 1.2 }), cat).ears).toBe(1)
    // The light: it leans in to pounce, and waits crouched while the lighthouse stands in the sea.
    expect(catPose(1, idleCat({ pounced: 0.12 }), cat).lean).toBeGreaterThan(0.1)
    expect(catPose(1, idleCat({ crouched: true }), cat).squash).toBeLessThan(rest.squash)
    // Pulled by a finger it stretches, and let go it wobbles.
    expect(catPose(1, idleCat({ pulled: 1 }), cat).stretch).toBeGreaterThan(1.2)
    expect(catPose(1.07, idleCat({ twanged: 0.07 }), cat).stretch).not.toBeCloseTo(1, 2)
    // The wave: twice its size, ears flat.
    catPose(1, idleCat({ flooded: true }), cat)
    expect(cat.puff).toBeGreaterThanOrEqual(2)
    expect(cat.ears).toBeGreaterThan(0.9)
  })

  it('spreads the gull to fly and to ride, and folds it on its buoy', () => {
    const gull = {} as GullPose
    expect(gullPose(1, idleGull(), gull).spread).toBe(0)
    expect(gullPose(1, idleGull({ flying: 0.5 }), gull).spread).toBe(1)
    expect(gullPose(1, idleGull({ place: 'smoke', lifted: 0.3 }), gull).y).toBeGreaterThan(0.1)
    expect(gullPose(1, idleGull({ place: 'smoke' }), gull).spread).toBeGreaterThan(0.5)
  })

  it('gives the gull a pose of its own for a dive, a tickle, a swell and a toy coming down', () => {
    const gull = {} as GullPose
    expect(gullPose(1, idleGull({ dive: 0.4 }), gull).pitch).toBeGreaterThan(0.5)
    expect(gullPose(1, idleGull({ place: 'paddle', tickled: 0.1 }), gull).beak).toBeGreaterThan(0.3)
    expect(gullPose(1, idleGull({ surf: 0.3 }), gull).spread).toBeGreaterThan(0.5)
    expect(gullPose(1, idleGull({ craned: 0.2 }), gull).neck).toBeGreaterThan(0.1)
  })
})

describe('a spinning island', () => {
  it('leaves the lighthouse stiff and moves each of the other four in its own way', () => {
    const still = (kind: Kind, where: 'land' | 'sea'): Pose => toyPose(kind, where, 9.3, Infinity, WEIGHT[kind], 'graze', restPose())
    for (const where of ['land', 'sea'] as const) {
      expect(numbers(spunPose('lighthouse', where, 1, 2.1, still('lighthouse', where)))).toEqual(numbers(still('lighthouse', where)))
      const curves = (['boat', 'sheep', 'tree', 'house'] as const).map((kind) => {
        const out: number[] = []
        for (let i = 0; i < 30; i++) {
          const a = numbers(still(kind, where)), b = numbers(spunPose(kind, where, 1, i / 30, still(kind, where)))
          out.push(...b.map((n, j) => n - a[j]))
        }
        return out
      })
      if (where === 'land') for (const c of curves) expect(c.some((n) => Math.abs(n) > 0.01)).toBe(true)
      for (let a = 0; a < curves.length; a++) for (let b = a + 1; b < curves.length; b++) expect(curves[a]).not.toEqual(curves[b])
    }
  })

  it('changes nothing while the island stands still', () => {
    for (const kind of KINDS) {
      const pose = toyPose(kind, 'land', 3, Infinity, WEIGHT[kind], 'graze', restPose())
      expect(numbers(spunPose(kind, 'land', 0, 1, pose))).toEqual(numbers(toyPose(kind, 'land', 3, Infinity, WEIGHT[kind], 'graze', restPose())))
    }
  })
})

describe('a toy on the wave', () => {
  it('rides in its own way: the bottle bobs upright, the boat goes bow first, the sheep is on its back, the tree spins, the house is roof down', () => {
    const at = (kind: Kind): Pose => ridePose(kind, 1, -1.2, 2, restPose())
    expect(at('lighthouse').y).toBeLessThan(-0.2)
    expect(Math.abs(at('lighthouse').roll)).toBeLessThan(0.2)
    expect(at('boat').yaw).toBeCloseTo(-1.2, 2)
    expect(at('sheep').roll).toBeCloseTo(Math.PI, 2)
    expect(at('tree').yaw).toBeGreaterThan(10)
    expect(at('house').pitch).toBeCloseTo(Math.PI, 2)
    // The lamp blinks.
    const glow = new Set<number>()
    for (let i = 0; i < 40; i++) glow.add(ridePose('lighthouse', i / 40, 0, 2, restPose()).glow)
    expect(glow.size).toBe(2)
    for (const kind of KINDS) expect(RIDE_BEAT[kind]).toBeGreaterThan(0.2)
  })
})
