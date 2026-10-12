import { describe, expect, it } from 'vitest'
import type { Build } from './build'
import { setUp } from './easel'
import { launchBoat, play, playUntil, visit } from './hands'
import { POND } from './layout'

// The pond's row of moored boats and their lamps must not read as a line of
// equal marks that counts: no two are the same size, height or step apart,
// and the row answers a new lamp with one chord, whatever its length.

const BEFORE: Build[] = [
  { hull: 'walnut', masts: ['twig', 'stem'], sails: ['feather', 'birch'], deck: ['cap'] },
  { hull: 'pod', masts: ['stem', null], sails: ['birch', null], deck: [] },
  { hull: 'bark', masts: [null, null], sails: [null, null], deck: ['pebble'] },
  { hull: 'bark', masts: ['stalk', null], sails: ['maple', null], deck: [] },
]

/** Plays a visit to the end of the lamp scene with `earlier` boats at the pond, and returns the scene's sounds by name. */
function lampScene(earlier: number): { sounds: string[]; lasted: number } {
  const v = visit(undefined, { pond: BEFORE.slice(0, earlier) })
  launchBoat(v)
  expect(playUntil(v, (w) => w.scene?.name === 'lamp')).toBe(true)
  v.game.heard()
  const sounds: string[] = []
  let lasted = 0
  for (let i = 0; i < 20 / (1 / 60) && v.game.w.scene; i++) {
    play(v, 1 / 60)
    lasted += 1 / 60
    for (const sound of v.game.heard().scene) sounds.push(sound.name)
  }
  expect(v.game.w.finished).toBe(true)
  return { sounds, lasted }
}

describe('the moored row', () => {
  it('answers a new lamp with one chord and in one span, whatever its length: nothing grows by one for each boat', () => {
    const none = lampScene(0)
    expect(none.sounds).not.toContain('chord')
    const runs = [1, 2, 3, 4].map((earlier) => lampScene(earlier))
    for (const run of runs) {
      expect(run.sounds.filter((name) => name === 'chord').length).toBe(1)
      // The same sounds, the same number of them, and the same length of scene, for a row of one and a row of four.
      expect([...run.sounds].sort()).toEqual([...runs[0].sounds].sort())
      expect(Math.abs(run.lasted - runs[0].lasted)).toBeLessThan(0.05)
    }
    expect(runs[0].sounds.filter((name) => name === 'chime').length).toBe(none.sounds.filter((name) => name === 'chime').length)
  })

  it('has no two boats of one size, at one height or one step apart, and each lamp is as large as its boat', () => {
    const rows = POND.rows
    const steps = rows.slice(1).map((row, i) => row.x - rows[i].x)
    const unlike = (values: number[], by: number): boolean => values.every((a, i) => values.every((b, j) => i === j || Math.abs(a - b) >= by))
    expect(unlike(steps, 6)).toBe(true)
    expect(unlike(rows.map((row) => row.s), 0.03)).toBe(true)
    expect(unlike(rows.map((row) => row.y), 2)).toBe(true)
    // The three to the right of the gnome are not on one level: each lies 20 units or more higher or lower than the others.
    expect(unlike(rows.slice(1).map((row) => row.y), 20)).toBe(true)
    // As drawn: four lamps lit behind the newest boat, each disc of its own size and at its own height.
    const v = visit(undefined, { pond: BEFORE })
    launchBoat(v)
    expect(playUntil(v, (w) => w.finished && !w.scene)).toBe(true)
    play(v, 0.5)
    const easel = setUp()
    const lit = (easel.view as unknown as { sheets: { props: { lit: { sheet: unknown } } } }).sheets.props.lit.sheet
    easel.frame(v.game.w)
    const discs = easel.surface.stamped.filter((stamped) => stamped.image === lit)
    expect(discs.length).toBe(5)
    const earlier = discs.filter((disc) => disc.w < Math.max(...discs.map((each) => each.w)) - 1)
    expect(earlier.length).toBe(4)
    expect(unlike(earlier.map((disc) => disc.w), 4)).toBe(true)
    expect(unlike(earlier.map((disc) => disc.y + disc.h / 2), 3)).toBe(true)
    const across = earlier.map((disc) => disc.x + disc.w / 2).sort((a, b) => a - b)
    expect(unlike(across.slice(1).map((x, i) => x - across[i]), 8)).toBe(true)
  })
})
