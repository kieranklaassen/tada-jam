import { describe, expect, it } from 'vitest'
import type { BirdPose } from './bird'
import type { CatPose } from './cat'
import { BROWN, ORANGE } from './colours'
import { TIERS } from './config'
import type { Guidance } from './guidance'
import { CAT, HELD, POOL } from './layout'
import { pack } from './marble'
import { drawsOf, recordedSheet, recorder } from './recording'
import { MID, PAPER_MID, SEED, coloured, dip, middle, play, pull, saved, savedAt, take, tap } from './rehearsal'
import { PLAIN, PRINT_CELLS } from './save'
import type { Show } from './scenes'
import { STEP, Toy, type Ripple } from './toy'
import { View } from './view'

const sources = import.meta.glob<string>('./*.ts', { query: '?raw', import: 'default', eager: true })
const SURFACES = [{ width: 1180, height: 820 }, { width: 1024, height: 768 }] as const
const all = (colour: number): string => pack(new Uint8Array(PRINT_CELLS).fill(colour))
const GLOW: Guidance = { glow: 1, demo: 0.45, demoIndex: 0 }

/** The real view on stand-in sheets, at a surface size and a tier. */
function rig(width: number, height: number, tier = 0) {
  const { make, made } = recorder()
  const screen = recordedSheet(width * 2, height * 2)
  const view = new View(screen.g, make)
  view.setTier(TIERS[tier])
  view.resize(width, height, TIERS[tier].dpr)
  const frame = (toy: Toy | null, guidance: Guidance | null = null): number => {
    const before = drawsOf(screen.count)
    view.draw(toy, guidance)
    const asked = drawsOf(screen.count) - before
    // The view's own count is the number the overlay and the perf handle report: it must be the true one.
    expect(view.drawn.stamps + view.drawn.pen).toBe(asked)
    return asked
  }
  return { view, frame, made, screen }
}

/** The busiest moments the game can legally reach, each built by play. */
const MOMENTS: Record<string, () => { toy: Toy; guidance: Guidance | null }> = {
  'at rest on a first visit': () => ({ toy: new Toy(saved(), SEED), guidance: null }),
  'idle with every tool out, four prints, the glow and the ghost hand': () => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(1), peg: 2 }, { cells: all(2), peg: 0 }, { cells: all(3), peg: 3 }, { cells: all(BROWN), peg: null }] }), SEED)
    coloured(toy)
    return { toy, guidance: GLOW }
  },
  'scene 1 at its busiest: the oldest print leaving, an earlier one flying, the sheet coming down, a wet paw, ripples': () => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(1), peg: 2 }, { cells: all(2), peg: 0 }, { cells: all(3), peg: 3 }, { cells: all(ORANGE), peg: null }] }), SEED)
    coloured(toy)
    tap(toy, CAT.paws[1].x, CAT.paws[1].y)
    for (let i = 0; i < 6; i++) tap(toy, POOL.x + 80 + i * 90, POOL.y + 120)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 0.35)
    return { toy, guidance: null }
  },
  'scene 1 with the sheet turning over and drips falling': () => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(1), peg: 2 }, { cells: all(2), peg: 0 }, { cells: all(3), peg: 3 }] }), SEED)
    coloured(toy)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 4.1)
    return { toy, guidance: null }
  },
  'scene 1 with a print the cat cannot stand held away by two claws, a drip falling, a print leaving the line': () => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(1), peg: 2 }, { cells: all(2), peg: 0 }, { cells: all(3), peg: 3 }, { cells: all(ORANGE), peg: 1 }] }), SEED)
    tap(toy, 1100, 800)
    toy.tray.cells.fill(BROWN)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 4.35)
    return { toy, guidance: null }
  },
  'the straw puffing on the water, its dimple drawn, among ripples, with a wet paw and the cat batting': () => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(1), peg: 2 }, { cells: all(2), peg: 0 }, { cells: all(3), peg: 3 }, { cells: all(BROWN), peg: null }] }), SEED)
    coloured(toy)
    tap(toy, CAT.paws[0].x, CAT.paws[0].y)
    for (let i = 0; i < 6; i++) tap(toy, 1100 - i * 30, 800)
    take(toy, 'straw')
    toy.press(MID.x + 100, POOL.y + 140)
    return { toy, guidance: null }
  },
  'scene 2: the new tool on its way, the cat\'s paw behind it, a print held': () => {
    const toy = new Toy(savedAt('straw', { prints: [{ cells: all(1), peg: 2 }, { cells: all(2), peg: 0 }, { cells: all(3), peg: 3 }] }), SEED)
    coloured(toy)
    take(toy, 'straw')
    tap(toy, MID.x, MID.y)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 7.6)
    return { toy, guidance: null }
  },
  'scene 3: the paw out over the water, tools and prints all there': () => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(1), peg: 2 }, { cells: all(2), peg: 0 }, { cells: all(3), peg: 3 }, { cells: all(BROWN), peg: null }] }), SEED)
    coloured(toy)
    play(toy, 90.3)
    return { toy, guidance: { glow: 0.5, demo: null, demoIndex: -1 } }
  },
  'scene 4: the print swinging, a drip falling, the cat looking up': () => {
    const toy = new Toy(savedAt('soap', { finished: true, prints: [{ cells: all(1), peg: 2 }, { cells: all(2), peg: 0 }, { cells: all(3), peg: 3 }, { cells: all(BROWN), peg: null }] }), SEED)
    tap(toy, 1100, 800)
    tap(toy, middle(HELD).x, middle(HELD).y)
    play(toy, 2.8)
    return { toy, guidance: null }
  },
  'the comb at work through three colours with the cat startled, combed and wet-pawed, eight ripples on the water': () => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(1), peg: 2 }, { cells: all(2), peg: 0 }, { cells: all(3), peg: 3 }, { cells: all(BROWN), peg: null }] }), SEED)
    coloured(toy)
    take(toy, 'comb')
    pull(toy, CAT.head.x - 60, CAT.head.y - 20, CAT.head.x + 60, CAT.head.y - 20, 12, 'drop')
    dip(toy, 0)
    tap(toy, CAT.paws[0].x, CAT.paws[0].y)
    take(toy, 'soap')
    tap(toy, CAT.head.x, CAT.head.y)
    tap(toy, POOL.x + 200, POOL.y + 60)
    for (let i = 0; i < 4; i++) tap(toy, 1100 - i * 40, 800)
    take(toy, 'comb')
    pull(toy, POOL.x + 90, POOL.y + 300, POOL.x + 560, POOL.y + 300, 20, null)
    return { toy, guidance: null }
  },
}

describe('the frame', () => {
  for (const { width, height } of SURFACES) {
    it(`costs under 80 draws at the busiest moments the game can reach, at ${width} by ${height}`, () => {
      const { frame } = rig(width, height)
      let most = 0, room = 0
      for (const [name, make] of Object.entries(MOMENTS)) {
        const { toy, guidance } = make()
        // Each moment is drawn as it stands, and through the next half second of play.
        let worst = frame(toy, guidance)
        for (let i = 0; i < 30; i++) {
          toy.step(STEP)
          worst = Math.max(worst, frame(toy, guidance))
        }
        expect(worst, name).toBeLessThan(80)
        most = Math.max(most, worst)
      }
      room = frame(null)
      expect(room).toBe(1)
      // The one number, the same at both sizes. A change that moves it is a change to look at.
      expect(most).toBe(BUSIEST)
    })
  }

  it('stamps what rests: at rest, one draw in five at most is drawn with the pen', () => {
    const { view, frame } = rig(1180, 820)
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(1), peg: 2 }, { cells: PLAIN.slice(0, 936), peg: null }] }), SEED)
    coloured(toy)
    play(toy, 3)
    const draws = frame(toy)
    expect(view.drawn.pen).toBeLessThanOrEqual(draws * 0.4)
    expect(draws).toBeLessThan(50)
  })

  it('paints the water again only where it changed, and not at all while it lies still', () => {
    const { frame, made } = rig(1180, 820)
    const toy = new Toy(savedAt('comb'), SEED)
    frame(toy)
    // The water's picture is the stand-in sheet that pixels are put on after the tiles were made.
    const puts = (): number => made.reduce((sum, sheet) => sum + sheet.count.puts, 0)
    const quiet = puts()
    for (let i = 0; i < 20; i++) {
      toy.step(STEP)
      frame(toy)
    }
    expect(puts()).toBe(quiet)
    tap(toy, MID.x, MID.y)
    frame(toy)
    expect(puts()).toBe(quiet + 1)
    play(toy, 1.5, () => frame(toy))
    const grown = puts()
    expect(grown).toBeGreaterThan(quiet + 5)
    play(toy, 1, () => frame(toy))
    expect(puts()).toBe(grown)
  })

  it('makes its pictures once: a frame bakes nothing, and a change of tier bakes only the water\'s picture', () => {
    const { view, frame, made } = rig(1180, 820)
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(1), peg: 2 }, { cells: all(BROWN), peg: null }] }), SEED)
    coloured(toy)
    frame(toy, GLOW)
    const sheets = made.length
    play(toy, 2, () => frame(toy, GLOW))
    expect(made.length).toBe(sheets)
    view.setTier(TIERS[1])
    expect(made.length).toBe(sheets)
    view.setTier(TIERS[2])
    expect(made.length).toBe(sheets + 1)
    frame(toy, GLOW)
    expect(made.length).toBe(sheets + 1)
  })

  it('draws the water with three pixels to a cell or more at every tier, so no tier shows the grid', () => {
    for (const tier of TIERS) {
      expect(tier.fine).toBeGreaterThanOrEqual(3)
      expect(tier.dpr).toBeLessThanOrEqual(2)
    }
    for (let tier = 0; tier < TIERS.length; tier++) {
      const { frame } = rig(1024, 768, tier)
      const toy = new Toy(savedAt('soap'), SEED)
      coloured(toy)
      expect(frame(toy, GLOW)).toBeLessThan(80)
    }
  })

  it('lays no sheen on the water while a finger is down, and lays it back after', () => {
    const { frame } = rig(1180, 820)
    const toy = new Toy(savedAt('comb'), SEED)
    const calm = frame(toy)
    toy.press(1100, 800)
    expect(toy.calm).toBe(0)
    // One ripple more for the knock, one fill fewer for the sheen.
    expect(frame(toy)).toBe(calm)
    toy.release('tap')
    play(toy, 2)
    expect(toy.calm).toBe(1)
    expect(frame(toy)).toBe(calm)
    expect(sources['./view.ts']).toContain('toy.calm > 0.01')
    // The asking corner and a tapped tool's hop are drawn from the model's own values.
    expect(sources['./view.ts']).toContain('toy.curl')
    expect(sources['./view.ts']).toContain('toy.dimple')
    expect(sources['./view.ts']).toContain('toy.toolPlace(tool)')
  })
})

describe('the idle glow', () => {
  it('is on the one thing the hand\'s move is made on, and on nothing else', () => {
    const screen = recordedSheet(2360, 1640)
    let shapes = 0
    const g = new Proxy(screen.g, {
      get(target, name) {
        const real = Reflect.get(target, name)
        if (name !== 'rect' && name !== 'ellipse') return real
        return () => { shapes += 1 }
      },
    })
    const view = new View(g, recorder().make)
    view.setTier(TIERS[0])
    view.resize(1180, 820, 2)
    const shapesOf = (toy: Toy, guidance: Guidance): number => {
      shapes = 0
      view.draw(toy, guidance)
      return shapes
    }
    // Every tool out and colour on the water: the hand's four turns are the water, a pot, the newest tool and the paper.
    const toy = new Toy(savedAt('soap'), SEED)
    coloured(toy)
    play(toy, 2)
    for (let index = -1; index < 4; index++) {
      const dark = shapesOf(toy, { glow: 0, demo: null, demoIndex: index })
      expect(shapesOf(toy, { glow: 1, demo: null, demoIndex: index }) - dark, `showing ${index}`).toBe(1)
    }
  })
})

/** The one draw number: the most the frame costs at the busiest legal moment, at both sizes. */
const BUSIEST = 54

describe('every value the model computes for the eye is read by the view', () => {
  // The lists are checked against the types, so a pose value that is added stops the typecheck here until it is listed.
  const CAT_KEYS: Record<keyof CatPose, true> = {
    lookX: true, lookY: true, turn: true, pupil: true, lid: true, earLeft: true, earRight: true, tail: true, tailTip: true, breath: true, tongue: true, wrinkle: true,
    lean: true, squash: true, ruffle: true, mouth: true, whiskers: true, pawLX: true, pawLY: true, pawRX: true, pawRY: true, tint: true, tintPaw: true, parting: true,
    smug: true, wind: true, bubble: true, cross: true, wiggle: true, hop: true, tilt: true, claws: true,
  }
  const BIRD_KEYS: Record<keyof BirdPose, true> = { x: true, lift: true, facing: true, peck: true, flap: true }
  const SHOW_KEYS: Record<keyof Show, true> = { under: true, sheet: true, holding: true, away: true, cheek: true, drips: true, leaving: true, fly: true, tool: true, hidden: true, direction: true }
  const RIPPLE_KINDS: Record<Ripple['kind'], true> = { ring: true, puff: true, lines: true, lens: true, bubble: true }

  it('reads every value of the cat\'s pose in the cat\'s drawing', () => {
    for (const key of Object.keys(CAT_KEYS)) expect(sources['./catArt.ts'], key).toMatch(new RegExp(`pose\\.${key}\\b`))
  })

  it('moves the drawing with every value of the pose: none is read and thrown away', () => {
    // A stand-in that writes down everything asked of it, with its numbers and the styles it was given. Two
    // poses that draw alike give the same record.
    const calls: string[] = []
    const sheet = recordedSheet(10, 10)
    const g = new Proxy(sheet.g, {
      get: (target, name) => {
        const value = Reflect.get(target, name)
        if (typeof name !== 'string' || typeof value !== 'function') return value
        return (...args: unknown[]) => {
          calls.push(`${name}(${args.map((arg) => (typeof arg === 'number' ? arg.toFixed(2) : typeof arg)).join()})`)
          return value(...args)
        }
      },
      set: (target, name, value) => {
        if (typeof value === 'string' || typeof value === 'number') calls.push(`${String(name)}=${typeof value === 'number' ? value.toFixed(2) : value}`)
        return Reflect.set(target, name, value)
      },
    })
    const view = new View(g, recorder().make)
    view.setTier(TIERS[0])
    view.resize(1180, 820, 2)
    const toy = new Toy(saved(), SEED)
    const base = { ...toy.cat.pose }
    const record = (pose: CatPose): string => {
      calls.length = 0
      Object.assign(toy.cat.pose, pose)
      view.draw(toy, null)
      return calls.join('|')
    }
    // Each value is set far from rest, on a cat with a wet paw off the rim, so the values that only show then
    // (which paw, what colour) show too.
    const wet: CatPose = { ...base, tint: 1, pawRX: base.pawRX + 40, pawRY: base.pawRY + 60 }
    const rest = record(wet)
    for (const key of Object.keys(CAT_KEYS) as (keyof CatPose)[]) {
      const far: CatPose = { ...wet, [key]: key === 'tint' ? 3 : key === 'tintPaw' ? 1 : key.startsWith('paw') ? wet[key] + 60 : 0.8 }
      expect(record(far), key).not.toBe(rest)
    }
    expect(rest.length).toBeGreaterThan(1000)
  })

  it('reads every value of the bird\'s pose, of what a scene shows and of what the model springs, and draws every kind of ripple', () => {
    const view = sources['./view.ts'], toy = sources['./toy.ts']
    for (const key of Object.keys(BIRD_KEYS)) expect(view, key).toMatch(new RegExp(`bird\\.${key}\\b`))
    // What a scene shows reaches the eye through the view, or through the places the model works out from it.
    for (const key of Object.keys(SHOW_KEYS)) expect(view + toy, key).toMatch(new RegExp(`show\\.${key}\\b`))
    for (const key of ['sheet', 'drips', 'tool']) expect(view, key).toMatch(new RegExp(`show\\.${key}\\b`))
    for (const key of ['slosh', 'stick', 'sway', 'jolt', 'paper', 'ripples', 'calm', 'water', 'inked', 'pot', 'tool', 'tools', 'held', 'prints', 'time']) expect(view, key).toMatch(new RegExp(`toy\\.${key}\\b`))
    expect(view).toMatch(/toy\.placed\(\)/)
    expect(view).toMatch(/toy\.toolPlace\(/)
    expect(toy).toMatch(/this\.swing\[print\.peg\]\.value/)
    for (const kind of Object.keys(RIPPLE_KINDS)) expect(view, kind).toContain(kind === 'bubble' ? '// A bubble' : `ripple.kind === '${kind}'`)
  })
})
