import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { Game, type Sink } from './game'
import { LOADS, TAKEN_WITH } from './lapState'
import { laidOut } from './props'
import { POND, layOut, pondPlaque } from './scenery'
import { LENGTH, PLACES } from './trail'
import { MESHES, MOST_LIGHTS, MOST_PLAQUES, drawn } from './view/budget'

// The frame budget, counted with no renderer: every plaque is one flat
// rectangle of two triangles in one of ten meshes, so what a frame costs is
// how many rectangles are in sight. The lead's bar for this game: tier 1,
// where touch devices start, under 100 thousand triangles; tier 0 under 200
// thousand; fewer than 60 draws; no shadow maps and no post pass.

const quiet: Sink = { play: () => {}, hush: () => {}, save: () => {} }

describe('the frame budget', () => {
  const standing = layOut()
  const lies = laidOut()
  const laid = [
    { s: POND.s - POND.halfS, long: pondPlaque().h },
    { s: lies.stream.s, long: lies.stream.plaque.h },
    { s: lies.mud.s, long: lies.mud.plaque.h },
    ...lies.puddles.map((one) => ({ s: one.s, long: one.plaque.h })),
  ]
  /** The fullest the board gets: something in the fox's hands, the goose out, the puddle laid, everything a lap can leave. */
  const fullest = (at: number, load: (typeof LOADS)[number]): Game =>
    new Game({ v: 1, position: 'pond', finished: false, at, lane: 1, load, lies: null, left: TAKEN_WITH[load], marks: { wet: true, muddy: true, berries: true, ruffles: 3 }, fox: { wet: true, muddy: true, burrs: true, leaves: true }, trail: { gooseRides: load === 'ladder', puddle: true, flowers: true, mushrooms: true, leftovers: [{ obstacle: 'branch', lane: 0 }, { obstacle: 'brambles', lane: 0 }, { obstacle: 'log', lane: 0 }] } }, () => null, 1, 48, quiet)

  const most = TIERS.map(() => ({ triangles: 0, plaques: 0, setting: 0, shades: 0, draws: 0 }))
  for (let at = 0; at < LENGTH; at += 10) {
    for (const load of at % 40 === 0 ? LOADS : (['balloons'] as const)) {
      const game = fullest(at, load)
      TIERS.forEach((tier, i) => {
        const frame = drawn(tier, game.stage, at, standing, laid)
        for (const key of ['triangles', 'plaques', 'setting', 'shades', 'draws'] as const) most[i][key] = Math.max(most[i][key], frame[key])
      })
    }
  }

  it('draws under 200 thousand triangles at tier 0 and under 100 thousand at tier 1, wherever the fox is', () => {
    expect(most[0].triangles).toBeLessThan(200_000)
    expect(most[1].triangles).toBeLessThan(100_000)
    // What it really is: a few thousand, at every tier, and the cheaper tiers draw less.
    for (const one of most) expect(one.triangles).toBeLessThan(4000)
    for (let i = 1; i < most.length; i++) expect(most[i].triangles).toBeLessThanOrEqual(most[i - 1].triangles)
    expect(most[TIERS.length - 1].triangles).toBeLessThan(most[0].triangles)
    expect(most[0].triangles).toBeGreaterThan(800)
  })

  it('is ten draws at every tier: one for each mesh, far under the sixty allowed', () => {
    expect(MESHES.length).toBe(10)
    expect(new Set(MESHES).size).toBe(MESHES.length)
    for (const one of most) expect(one.draws).toBeLessThan(60)
  })

  it('never holds more plaques, things of the setting or lights than their meshes have room for', () => {
    expect(most[0].plaques).toBeLessThanOrEqual(MOST_PLAQUES)
    expect(most[0].setting).toBeLessThanOrEqual(standing.length + 8)
    expect(most[0].shades).toBeLessThanOrEqual(standing.length + 64)
    expect(MOST_LIGHTS).toBeGreaterThanOrEqual(LOADS.length + 1)
  })

  it('saves pixels, distance and loose beads from tier to tier, and never changes what a thing is made of', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].dpr).toBeLessThan(TIERS[i - 1].dpr)
      expect(TIERS[i].reach).toBeLessThan(TIERS[i - 1].reach)
      expect(TIERS[i].loose).toBeLessThan(TIERS[i - 1].loose)
    }
    expect(TIERS[0].dpr).toBeLessThanOrEqual(2)
    // The nearest haze still shows the next obstacle well before the fox is at it.
    expect(TIERS[TIERS.length - 1].reach).toBeGreaterThan(PLACES.branch - PLACES.stream + 200)
  })

  it('says what each tier draws at the most', () => {
    // Held here so the art guide's numbers cannot drift from the code.
    expect(most.map((one) => `${one.triangles} triangles, ${one.plaques} plaques, ${one.setting} of the setting`)).toEqual([
      '910 triangles, 114 plaques, 155 of the setting',
      '820 triangles, 110 plaques, 143 of the setting',
      '742 triangles, 98 plaques, 132 of the setting',
      '670 triangles, 97 plaques, 119 of the setting',
    ])
  })
})
