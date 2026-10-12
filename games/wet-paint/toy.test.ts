import { describe, expect, it } from 'vitest'
import { BLUE, BROWN, GREEN, ORANGE, RED, VALUES, WATER, YELLOW } from './colours'
import { CAT, CLOTHS, HELD, HOLD_PAWS, MAT, PEGS, POOL, POT, SILL, TOOL, TOOL_IDS, TRAY, hungRect, inRect, lineY, onWater, whatIsAt, type ToolId } from './layout'
import { pack, tally, unpack } from './marble'
import { MID, PAPER_MID, cellAt, dip, heard, middle, play, printed, pull, saved, savedAt, take, tap } from './rehearsal'
import { PLAIN } from './save'
import { AWAY } from './scenes'
import { DAB, FAR, GRACE, REST, STEP, Toy, showingsOver } from './toy'
import { purrVoice } from './voices'
import { BLOOM, CELLS } from './tray'
import type { WaterState } from './water'

const count = (toy: Toy, colour: number): number => tally(toy.tray.cells, VALUES)[colour]

describe('a touch', () => {
  it('is answered when the finger lands: colour, ripples and a sound before any time has passed', () => {
    const toy = new Toy(saved(), 1)
    toy.press(MID.x, MID.y)
    expect(cellAt(toy, MID.x, MID.y)).toBe(RED)
    expect(toy.ripples).toHaveLength(1)
    expect(heard(toy).length).toBeGreaterThan(0)
    expect(toy.time).toBe(0)
    expect(toy.takeChanged()).toBeGreaterThan(0)
    expect(toy.inked).toBe(true)
  })

  it('lets the bloom go on spreading after the finger has lifted, and then lie still', () => {
    const toy = new Toy(saved(), 1)
    tap(toy, MID.x, MID.y)
    const spot = count(toy, RED)
    play(toy, 0.3)
    expect(count(toy, RED)).toBeGreaterThan(spot * 2)
    expect(toy.moving).toBe(true)
    play(toy, 1)
    expect(toy.moving).toBe(false)
    expect(count(toy, RED)).toBeGreaterThan(Math.PI * BLOOM.radius ** 2 * 0.9)
    const lying = toy.tray.version
    play(toy, 1)
    expect(toy.tray.version).toBe(lying)
  })

  it('is answered with a sound of its own at every place a finger can land, at once', () => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: PLAIN.slice(0, 936), peg: 1 }, { cells: PLAIN.slice(0, 936), peg: null }] }), 1)
    const places: [string, number, number][] = [
      ['the water', MID.x, MID.y],
      ['a pot', POT.x, POT.ys[1]],
      ['the cat', CAT.head.x, CAT.head.y - 30],
      ['its paw', CAT.paws[0].x, CAT.paws[0].y],
      ['the bird', toy.bird.pose.x, SILL.y - 20],
      ['the towel', CLOTHS[0].x, lineY(CLOTHS[0].x) + 50],
      ['the sock', CLOTHS[1].x, lineY(CLOTHS[1].x) + 40],
      ['the rim', TRAY.x + 10, TRAY.y + 300],
      ['the table', 1100, 800],
      ['the paper', PAPER_MID.x, PAPER_MID.y],
      ['a hung print', middle(hungRect(1)).x, middle(hungRect(1)).y],
      ['the held print', middle(HELD).x, middle(HELD).y],
      ...TOOL_IDS.map((tool): [string, number, number] => [tool, middle(TOOL[tool]).x, middle(TOOL[tool]).y]),
    ]
    const said = new Set<string>()
    for (const [name, x, y] of places) {
      toy.press(x, y)
      const notes = heard(toy)
      expect(notes.length, name).toBeGreaterThan(0)
      said.add(JSON.stringify(notes))
      toy.release('cancel')
      play(toy, 1.5)
      heard(toy)
    }
    expect(said.size).toBe(places.length)
    expect(toy.time).toBeCloseTo(places.length * 1.5, 6)
  })

  it('on a pot dips the stick there: the stick stands up, the liquid sloshes, and the next drop is that colour', () => {
    const toy = new Toy(saved(), 1)
    expect(toy.stick[0].value).toBe(1)
    dip(toy, 2)
    expect(toy.pot).toBe(2)
    expect(toy.takeChanged()).toBeGreaterThan(0)
    play(toy, 0.1)
    expect(Math.abs(toy.slosh[2].value)).toBeGreaterThan(0.01)
    play(toy, 1)
    expect(toy.stick[2].value).toBeCloseTo(1, 2)
    expect(toy.stick[0].value).toBeCloseTo(0, 2)
    tap(toy, MID.x, MID.y)
    expect(cellAt(toy, MID.x, MID.y)).toBe(BLUE)
  })

  it('that moves pulls the colour along, swishes while it does, and the water coasts on after the lift', () => {
    const toy = new Toy(saved(), 1)
    tap(toy, MID.x - 150, MID.y)
    play(toy, 1)
    heard(toy)
    expect(cellAt(toy, MID.x, MID.y)).toBe(WATER)
    pull(toy, MID.x - 150, MID.y, MID.x + 20, MID.y, 24, null)
    expect(cellAt(toy, MID.x, MID.y)).toBe(RED)
    expect(heard(toy).length).toBeGreaterThan(2)
    toy.release('drop')
    expect(toy.finger).toBeNull()
    expect(toy.moving).toBe(true)
    expect(cellAt(toy, MID.x + 60, MID.y)).toBe(WATER)
    play(toy, 3)
    expect(toy.moving).toBe(false)
    expect(cellAt(toy, MID.x + 60, MID.y)).toBe(RED)
  })

  it('makes the third colour by itself where the dipped colour is pulled through another', () => {
    const toy = new Toy(saved(), 1)
    dip(toy, 1)
    tap(toy, MID.x, MID.y)
    play(toy, 1)
    dip(toy, 0)
    expect(count(toy, ORANGE)).toBe(0)
    pull(toy, MID.x - 120, MID.y, MID.x + 100, MID.y, 30, 'cancel')
    play(toy, 2)
    expect(count(toy, ORANGE)).toBeGreaterThan(40)
    expect(count(toy, BROWN)).toBe(0)
  })

  it('on the cat strokes it with a finger that moves, and leaves the water alone', () => {
    const toy = new Toy(saved(), 1)
    toy.press(CAT.head.x - 40, CAT.head.y - 20)
    for (let i = 0; i < 20; i++) {
      toy.move(CAT.head.x - 40 + i * 6, CAT.head.y - 20)
      toy.step(STEP)
    }
    expect(toy.cat.pose.ruffle).toBeGreaterThan(0.2)
    toy.release('drop')
    expect(count(toy, WATER)).toBe(CELLS)
    expect(toy.takeChanged()).toBe(0)
  })
})

// The sheet's grid: six things by five actions, every cell with a sound of its own.
describe('the object-by-action grid', () => {
  const AT = { x: POOL.x + 330, y: POOL.y + 300 }
  /** The water in each of the five states, with the place a touch lands in it. */
  const water: Record<WaterState, (toy: Toy) => void> = {
    plain: () => {},
    bloom: (toy) => {
      dip(toy, 1)
      tap(toy, AT.x, AT.y)
    },
    rings: (toy) => {
      dip(toy, 1)
      tap(toy, AT.x, AT.y)
      play(toy, 1)
      dip(toy, 2)
      tap(toy, AT.x, AT.y)
    },
    two: (toy) => {
      dip(toy, 1)
      tap(toy, AT.x - 46, AT.y)
      play(toy, 1)
      dip(toy, 2)
      tap(toy, AT.x + 46, AT.y)
    },
    mix: (toy) => {
      dip(toy, 1)
      tap(toy, AT.x, AT.y)
      play(toy, 1)
      dip(toy, 2)
      pull(toy, AT.x - 110, AT.y, AT.x + 90, AT.y, 30, 'cancel')
    },
  }
  const STATES: WaterState[] = ['plain', 'bloom', 'rings', 'two', 'mix']
  const ACTIONS = ['drop', 'pull', 'comb', 'straw', 'soap'] as const
  /** One cell of the grid: the water made ready, the action done with the first pot's stick or the tool, and what was heard and seen. */
  const cell = (state: WaterState, action: (typeof ACTIONS)[number]): { sounds: string; changed: boolean; ripples: string[]; beads: number } => {
    const toy = new Toy(savedAt('soap'), 3)
    water[state](toy)
    play(toy, 1.5)
    dip(toy, 0)
    if (action !== 'drop' && action !== 'pull') take(toy, action)
    play(toy, 0.5)
    heard(toy)
    toy.ripples = []
    const before = toy.tray.cells.slice(), had = tally(before, VALUES)
    const notes: unknown[] = [], kinds = new Set<string>()
    const watch = (): void => {
      notes.push(...heard(toy))
      for (const ripple of toy.ripples) kinds.add(ripple.kind)
    }
    if (action === 'drop' || action === 'soap') {
      tap(toy, AT.x, AT.y)
      watch()
      play(toy, 1.2, watch)
    } else if (action === 'straw') {
      toy.press(AT.x, AT.y)
      watch()
      play(toy, 0.6, watch)
      toy.release('drop')
    } else {
      toy.press(AT.x - 60, AT.y - 8)
      watch()
      for (let i = 1; i <= 24; i++) {
        toy.move(AT.x - 60 + i * 6, AT.y - 8)
        toy.step(STEP)
        watch()
      }
      toy.release('cancel')
      play(toy, 1.2, watch)
    }
    const after = toy.tray.cells, has = tally(after, VALUES)
    let changed = false
    for (let i = 0; i < after.length && !changed; i++) changed = after[i] !== before[i]
    // A bead is a colour the water did not hold before.
    let beads = 0
    for (const colour of [ORANGE, GREEN, 6, BROWN]) if (had[colour] === 0 && has[colour] > 0) beads += 1
    // Rounded, so two cells differ by what is played and not by a hair of pitch.
    return { sounds: JSON.stringify(notes, (_, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)), changed, ripples: [...kinds].sort(), beads }
  }

  const grid = new Map<string, ReturnType<typeof cell>>()
  for (const state of STATES) for (const action of ACTIONS) grid.set(`${state}/${action}`, cell(state, action))

  it('sounds different in every cell of the water: twenty-five cells, twenty-five sounds, and none silent', () => {
    const sounds = [...grid.values()].map((one) => one.sounds)
    for (const [name, one] of grid) expect(one.sounds.length, name).toBeGreaterThan(2)
    const twice = [...grid.keys()].filter((name) => [...grid.keys()].some((other) => other !== name && grid.get(other)!.sounds === grid.get(name)!.sounds))
    expect(twice).toEqual([])
    expect(new Set(sounds).size).toBe(25)
  })

  it('has no row and no column with one sound', () => {
    for (const state of STATES) expect(new Set(ACTIONS.map((action) => grid.get(`${state}/${action}`)!.sounds)).size).toBe(ACTIONS.length)
    for (const action of ACTIONS) expect(new Set(STATES.map((state) => grid.get(`${state}/${action}`)!.sounds)).size).toBe(STATES.length)
  })

  it('shows something in every cell: the water changes, or on plain water the ripples of that tool run', () => {
    for (const [name, one] of grid) expect(one.changed || one.ripples.length > 0, name).toBe(true)
    // Plain water holds no colour after a comb, a straw or soap: only the drop and the pull that follows it add any.
    expect(grid.get('plain/comb')).toMatchObject({ changed: false, ripples: ['lines'] })
    expect(grid.get('plain/straw')).toMatchObject({ changed: false, ripples: ['ring'] })
    expect(grid.get('plain/soap')!.changed).toBe(false)
    expect(grid.get('plain/soap')!.ripples).toEqual(['bubble', 'lens'])
    for (const state of STATES) expect(grid.get(`${state}/drop`)!.changed).toBe(true)
    for (const state of STATES.slice(1)) for (const action of ACTIONS) expect(grid.get(`${state}/${action}`)!.changed, `${state}/${action}`).toBe(true)
  })

  it('brings up beads of a mix where the sheet says so: a pull or a comb through two pot colours, and never from a tool on one colour', () => {
    expect(grid.get('two/pull')!.beads).toBeGreaterThan(0)
    expect(grid.get('two/comb')!.beads).toBeGreaterThan(0)
    expect(grid.get('mix/pull')!.beads).toBeGreaterThan(0)
    for (const action of ['comb', 'straw', 'soap'] as const) expect(grid.get(`bloom/${action}`)!.beads).toBe(0)
    for (const state of STATES) for (const action of ['straw', 'soap'] as const) expect(grid.get(`${state}/${action}`)!.beads, `${state}/${action}`).toBe(0)
  })

  it('works on the cat with every action, each with its own look and sound, and leaves the water alone but for three flicked blooms', () => {
    const on = (action: (typeof ACTIONS)[number]): { sounds: string; pose: Record<string, number>; water: number; seen: Record<string, number> } => {
      const toy = new Toy(savedAt('soap'), 3)
      if (action !== 'drop' && action !== 'pull') take(toy, action)
      heard(toy)
      const notes: unknown[] = [], seen: Record<string, number> = {}
      const watch = (): void => {
        notes.push(...heard(toy))
        for (const [key, value] of Object.entries(toy.cat.pose)) seen[key] = Math.max(seen[key] ?? 0, Math.abs(value))
      }
      const where = action === 'drop' ? CAT.paws[0] : { x: CAT.head.x - 50, y: CAT.head.y - 20 }
      toy.press(where.x, where.y)
      watch()
      if (action !== 'drop' && action !== 'soap') {
        for (let i = 1; i <= 30; i++) {
          toy.move(where.x + i * 4, where.y)
          toy.step(STEP)
          watch()
        }
      }
      toy.release('drop')
      play(toy, 2.5, watch)
      return { sounds: JSON.stringify(notes), pose: { ...toy.cat.pose }, water: CELLS - count(toy, WATER), seen }
    }
    const row = ACTIONS.map(on)
    expect(new Set(row.map((one) => one.sounds)).size).toBe(ACTIONS.length)
    for (const one of row) expect(one.sounds.length).toBeGreaterThan(2)
    const [drop, stroke, comb, straw, soap] = row
    // A drop on the paw: the paw is coloured, and three small blooms are flicked into the water.
    expect(drop.seen.tint).toBe(RED)
    expect(drop.water).toBeGreaterThan(60)
    expect(drop.water).toBeLessThan(400)
    expect(stroke.seen.ruffle).toBeGreaterThan(0.3)
    expect(comb.seen.parting).toBeGreaterThan(0.5)
    expect(comb.seen.smug).toBeGreaterThan(0.3)
    expect(straw.seen.wind).toBeGreaterThan(0.5)
    expect(soap.seen.bubble).toBeGreaterThan(0.5)
    expect(soap.seen.cross).toBeGreaterThan(0.5)
    for (const one of [stroke, comb, straw, soap]) expect(one.water).toBe(0)
  })
})

describe('the tools and the cycle', () => {
  it('takes a tool up with a tap and puts it down with a tap on a pot, and the stick always works', () => {
    const toy = new Toy(savedAt('straw'), 1)
    expect(toy.tools).toEqual(['comb', 'straw'])
    take(toy, 'comb')
    expect(toy.tool).toBe('comb')
    expect(toy.toolPlace('comb')!.lifted).toBe(true)
    expect(toy.toolPlace('straw')!.lifted).toBe(false)
    expect(toy.toolPlace('soap')).not.toBeNull()
    play(toy, 0.5)
    for (const stick of toy.stick) expect(stick.value).toBeLessThan(0.1)
    dip(toy, 1)
    expect(toy.tool).toBe('finger')
    expect(toy.pot).toBe(1)
    tap(toy, MID.x, MID.y)
    expect(cellAt(toy, MID.x, MID.y)).toBe(YELLOW)
    // A tool that has not come to the table cannot be touched: its place is the table.
    take(toy, 'soap')
    expect(toy.tool).toBe('finger')
  })

  it('marks a tool as used when it touches the water, and not when it touches the cat', () => {
    const toy = new Toy(savedAt('soap'), 1)
    take(toy, 'comb')
    tap(toy, CAT.head.x, CAT.head.y - 20)
    expect(toy.used).toEqual([])
    tap(toy, MID.x, MID.y)
    take(toy, 'soap')
    tap(toy, MID.x, MID.y)
    tap(toy, MID.x + 30, MID.y)
    expect(toy.used).toEqual(['comb', 'soap'])
  })

  const cycle = (position: string, act: (toy: Toy) => void): Toy => {
    const toy = new Toy(savedAt(position), 1)
    act(toy)
    play(toy, 1.5)
    printed(toy)
    return toy
  }

  it('goes well when the newest tool has touched this water, and the place moves up one step and no more', () => {
    expect(cycle('finger', (toy) => tap(toy, MID.x, MID.y)).position).toBe('comb')
    expect(cycle('comb', (toy) => {
      tap(toy, MID.x, MID.y)
      take(toy, 'comb')
      tap(toy, MID.x, MID.y)
    }).position).toBe('straw')
    expect(cycle('straw', (toy) => {
      tap(toy, MID.x, MID.y)
      take(toy, 'straw')
      tap(toy, MID.x + 40, MID.y)
    }).position).toBe('soap')
    expect(cycle('soap', (toy) => {
      tap(toy, MID.x, MID.y)
      take(toy, 'soap')
      tap(toy, MID.x + 80, MID.y)
    }).position).toBe('soap')
  })

  it('is mixed otherwise, and the place stays: plain water, an older tool, or the newest tool on the cat only', () => {
    expect(cycle('finger', () => {}).position).toBe('finger')
    expect(cycle('straw', (toy) => {
      tap(toy, MID.x, MID.y)
      take(toy, 'comb')
      tap(toy, MID.x, MID.y)
    }).position).toBe('straw')
    expect(cycle('comb', (toy) => {
      tap(toy, MID.x, MID.y)
      take(toy, 'comb')
      tap(toy, CAT.head.x, CAT.head.y - 20)
    }).position).toBe('comb')
  })

  it('never moves the place down, and never twice for one water: the plain water after a print takes no print and moves nothing', () => {
    const toy = cycle('finger', (game) => tap(game, MID.x, MID.y))
    expect(toy.position).toBe('comb')
    expect(toy.finished).toBe(true)
    printed(toy)
    expect(toy.position).toBe('comb')
    expect(toy.prints).toHaveLength(1)
    for (const position of ['finger', 'comb', 'straw', 'soap']) {
      const game = cycle(position, () => {})
      expect(game.position).toBe(position)
    }
  })

  it('brings the new tool to the table in the scene that follows the print, so it lies there on the very next tray', () => {
    const toy = new Toy(savedAt('finger'), 1)
    tap(toy, MID.x, MID.y)
    play(toy, 1)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    expect(toy.position).toBe('comb')
    expect(toy.tools).toEqual(['comb'])
    // Behind the cat until the cat fetches it, in the scene that follows.
    expect(toy.toolPlace('comb')).toBeNull()
    expect(toy.shown).toEqual([])
    play(toy, 12)
    expect(toy.playing).toBe(false)
    expect(toy.shown).toEqual(['comb'])
    const lying = toy.toolPlace('comb')!
    expect(lying).toMatchObject({ ...middle(TOOL.comb), lifted: false })
    expect(cellAt(toy, MID.x, MID.y)).toBe(WATER)
    expect(toy.tray.cells.every((value) => value === WATER)).toBe(true)
  })

  it('starts the next cycle on the first touch of the water, of a pot, or of the paw that flicks colour in, and on nothing else', () => {
    for (const [name, touch, begins] of [
      ['the water', (toy: Toy) => tap(toy, MID.x, MID.y), true],
      ['a pot', (toy: Toy) => dip(toy, 1), true],
      ['the paw on the rim, once the print is hung', (toy: Toy) => {
        tap(toy, middle(HELD).x, middle(HELD).y)
        play(toy, 6)
        expect(toy.finished).toBe(true)
        tap(toy, CAT.paws[0].x, CAT.paws[0].y)
      }, true],
      // A paw that holds the print answers, and starts nothing: that touch was meant for the print.
      ['a paw that holds the print', (toy: Toy) => {
        tap(toy, HOLD_PAWS[0].x, HOLD_PAWS[0].y)
        expect(toy.held).toBeGreaterThanOrEqual(0)
        expect(toy.cat.pose.tint).not.toBe(WATER)
      }, false],
      ['the cat', (toy: Toy) => tap(toy, CAT.head.x, CAT.head.y - 30), false],
      ['the bird', (toy: Toy) => tap(toy, toy.bird.pose.x, SILL.y - 20), false],
      ['the table', (toy: Toy) => tap(toy, 1100, 800), false],
      ['the held print', (toy: Toy) => tap(toy, middle(HELD).x, middle(HELD).y), false],
    ] as const) {
      const toy = cycle('comb', (game) => tap(game, MID.x, MID.y))
      expect(toy.finished, name).toBe(true)
      touch(toy)
      expect(toy.finished, name).toBe(!begins)
    }
  })

  it('keeps the last four prints: the oldest leaves the line when a fifth is taken, and is gone from the save at once', () => {
    const toy = new Toy(savedAt('finger'), 1)
    const cells: string[] = []
    for (let n = 0; n < 4; n++) {
      dip(toy, n % 3)
      tap(toy, MID.x - 200 + n * 90, MID.y)
      play(toy, 1)
      printed(toy)
      cells.push(toy.prints[toy.prints.length - 1].cells)
      tap(toy, middle(HELD).x, middle(HELD).y)
      play(toy, 6)
    }
    expect(toy.prints.map((print) => print.peg)).toEqual([0, 1, 2, 3])
    expect(toy.held).toBe(-1)
    tap(toy, MID.x, MID.y)
    play(toy, 1)
    toy.takeChanged()
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    // In the same touch: four prints, the oldest gone, the newest in the paws, and that is what a save holds.
    expect(toy.takeChanged()).toBe(2)
    expect(toy.prints).toHaveLength(4)
    expect(toy.prints.map((print) => print.cells).slice(0, 3)).toEqual(cells.slice(1))
    expect(toy.prints[3].peg).toBeNull()
    expect(toy.toSave().prints.map((print) => print.peg)).toEqual([1, 2, 3, null])
    // It is seen to go: pulled down behind the cat while the cat hops.
    expect(toy.show.leaving).toMatchObject({ cells: cells[0], peg: 0 })
    expect(toy.placed().filter((place) => place.behind)).toHaveLength(1)
    play(toy, 1)
    expect(toy.show.leaving).toBeNull()
    expect(toy.placed().filter((place) => place.behind)).toHaveLength(0)
  })

  it('hangs a print the cat still held on the lowest free peg when the next print is taken', () => {
    const toy = new Toy(savedAt('finger'), 1)
    tap(toy, MID.x, MID.y)
    play(toy, 1)
    printed(toy)
    expect(toy.prints.map((print) => print.peg)).toEqual([null])
    dip(toy, 2)
    tap(toy, MID.x, MID.y)
    play(toy, 1)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    expect(toy.prints.map((print) => print.peg)).toEqual([0, null])
    expect(toy.toSave().prints.map((print) => print.peg)).toEqual([0, null])
  })

  it('hangs the held print with a tap on the lowest free peg, and with a drag on the free peg nearest where it is let go', () => {
    const held = (): Toy => {
      const toy = new Toy(savedAt('finger', { prints: [{ cells: PLAIN.slice(0, 936), peg: 0 }, { cells: PLAIN.slice(0, 936), peg: null }] }), 1)
      toy.press(1100, 800)
      toy.release('tap')
      return toy
    }
    const tapped = held()
    tap(tapped, middle(HELD).x, middle(HELD).y)
    expect(tapped.prints[1].peg).toBe(1)
    // A drag that went only part of the way up counts, and takes the nearest free peg.
    const dragged = held()
    pull(dragged, middle(HELD).x, middle(HELD).y, PEGS[3].x - 30, HELD.y - 60, 12, 'drop')
    // Let go, it hangs where it is for the grace, and then the lift is the drop.
    expect(dragged.prints[1].peg).toBeNull()
    play(dragged, GRACE + 0.05)
    expect(dragged.prints[1].peg).toBe(3)
    // Near a peg that is taken, it goes to the nearest one that is free.
    const crowded = held()
    pull(crowded, middle(HELD).x, middle(HELD).y, PEGS[0].x, 80, 12, 'drop')
    play(crowded, GRACE + 0.05)
    expect(crowded.prints[1].peg).toBe(1)
    // A drag that took it less than its own width from the paws, and not above the cat, brings it back to them.
    const short = held()
    pull(short, middle(HELD).x, middle(HELD).y, middle(HELD).x + 80, middle(HELD).y + 10, 12, 'drop')
    heard(short)
    play(short, GRACE + 0.05)
    expect(heard(short).length).toBeGreaterThan(0)
    play(short, 0.5)
    expect(short.prints[1].peg).toBeNull()
    expect(short.playing).toBe(false)
    expect(short.placed()[1]).toMatchObject({ x: HELD.x, y: HELD.y })
  })

  it('draws every print where it is touched, at rest: a hung one on its peg, the held one in the paws', () => {
    const toy = new Toy(savedAt('finger', { prints: [{ cells: PLAIN.slice(0, 936), peg: 2 }, { cells: PLAIN.slice(0, 936), peg: 0 }, { cells: PLAIN.slice(0, 936), peg: null }] }), 1)
    play(toy, 2)
    const places = toy.placed()
    expect(places).toHaveLength(3)
    expect(places[0]).toMatchObject({ ...hungRect(2), pegged: true, behind: false })
    expect(places[1]).toMatchObject({ ...hungRect(0), pegged: true })
    expect(places[2]).toMatchObject({ ...HELD, pegged: false, tilt: 0 })
    for (const tool of ['comb', 'straw', 'soap'] as ToolId[]) expect(toy.toolPlace(tool)).toMatchObject(middle(TOOL[tool]))
  })
})

describe('what a child would notice', () => {
  const four = [0, 1, 2, 3].map((peg) => ({ cells: pack(new Uint8Array(1872).fill(1 + peg)), peg }))
  const holding = (position = 'soap'): Toy => {
    const toy = new Toy(savedAt(position, { prints: [{ cells: PLAIN.slice(0, 936), peg: 0 }, { cells: PLAIN.slice(0, 936), peg: null }] }), 1)
    tap(toy, 1100, 800)
    heard(toy)
    return toy
  }

  it('takes no print of plain water: the corner lifts and settles, the cat looks at the water, and stray taps never clear the line', () => {
    const toy = new Toy(savedAt('finger', { prints: four }), 1)
    const before = JSON.stringify(toy.prints)
    for (let n = 0; n < 6; n++) {
      toy.press(PAPER_MID.x, PAPER_MID.y)
      expect(heard(toy).length, 'the corner answers when the finger lands').toBeGreaterThan(0)
      play(toy, 0.15)
      expect(toy.paper.lift.value).toBeGreaterThan(0.3)
      toy.release('tap')
      expect(toy.playing).toBe(false)
      play(toy, 1)
      expect(Math.abs(toy.paper.lift.value)).toBeLessThan(0.05)
      // The cat looks at the water, not at the child and not at the paper.
      expect(toy.cat.pose.lookY).toBeGreaterThan(0.6)
      play(toy, 1)
    }
    expect(JSON.stringify(toy.prints)).toBe(before)
    expect(toy.finished).toBe(false)
    expect(count(toy, WATER)).toBe(CELLS)
    // With colour on the water the same tap takes a print.
    tap(toy, MID.x, MID.y)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    expect(toy.playing).toBe(true)
    expect(toy.held).toBe(3)
  })

  it('keeps giving to a finger that rests: the bloom under it grows slowly with its sound, up to a size, and a save in the middle of it is exact', () => {
    const toy = new Toy(saved(), 1)
    toy.press(MID.x, MID.y)
    play(toy, 0.8)
    const one = count(toy, RED)
    heard(toy)
    // Never one drop and silence: in every second of the rest there is more colour and a sound.
    let last = one
    for (let second = 0; second < 4; second++) {
      play(toy, 1)
      expect(heard(toy).length, `second ${second}`).toBeGreaterThan(0)
      expect(count(toy, RED), `second ${second}`).toBeGreaterThan(last)
      last = count(toy, RED)
    }
    // A save taken while it swells is the water played out to rest, with zero cells differing.
    const twin = new Toy(saved(), 1)
    twin.press(MID.x, MID.y)
    play(twin, 1.9)
    const kept = twin.toSave().tray
    twin.release('tap')
    play(twin, 3)
    expect(pack(twin.tray.cells)).toBe(kept)
    // Up to a size: about twice as wide as one drop makes it, and then it lies still under the finger.
    play(toy, 6)
    const full = count(toy, RED)
    expect(full).toBeGreaterThan(one * 2.5)
    expect(full).toBeLessThan(Math.PI * (BLOOM.radius ** 2 + REST.radius ** 2) * 1.08)
    heard(toy)
    play(toy, 3)
    expect(count(toy, RED)).toBe(full)
    expect(heard(toy)).toHaveLength(0)
    // A finger that moves is pulling, not resting.
    const moved = new Toy(saved(), 1)
    pull(moved, MID.x, MID.y, MID.x + 60, MID.y, 12, null)
    play(moved, 4)
    expect(count(moved, RED)).toBeLessThan(one * 1.2)
  })

  it('puts a tool down with a tap on the tool itself or on its cloth, and the tapped tool hops', () => {
    const toy = new Toy(savedAt('soap'), 1)
    const lying = toy.toolPlace('comb')!.y
    take(toy, 'comb')
    expect(toy.tool).toBe('comb')
    heard(toy)
    take(toy, 'comb')
    expect(toy.tool).toBe('finger')
    expect(heard(toy).length).toBeGreaterThan(0)
    // It is seen: the tool hops on its cloth, and comes to rest where it lay.
    let highest = lying
    play(toy, 0.3, () => { highest = Math.min(highest, toy.toolPlace('comb')!.y) })
    expect(highest).toBeLessThan(lying - 4)
    play(toy, 1.5)
    expect(toy.toolPlace('comb')).toMatchObject({ y: expect.closeTo(lying, 0), lifted: false })
    expect(toy.stick[toy.pot].value).toBeGreaterThan(0.9)
    // The bare cloth between two tools puts down what is in the hand, and is the table when the hand is empty.
    const bare = { x: MAT.x + MAT.w / 2, y: (TOOL.comb.y + TOOL.comb.h + TOOL.straw.y) / 2 }
    expect(whatIsAt(bare.x, bare.y, { birdX: 0, tools: TOOL_IDS, held: false, hung: [] }).kind).toBe('mat')
    take(toy, 'straw')
    tap(toy, bare.x, bare.y)
    expect(toy.tool).toBe('finger')
    heard(toy)
    tap(toy, bare.x, bare.y)
    expect(heard(toy).length).toBeGreaterThan(0)
    expect(toy.ripples.some((ripple) => ripple.kind === 'puff')).toBe(true)
  })

  it('makes no sound without a sight: a dragged soap opens a hole for each squeak, and the straw is heard only while its dent deepens', () => {
    const soaped = (drag: boolean): { far: number; notes: number; lenses: number } => {
      const toy = new Toy(savedAt('soap'), 1)
      for (let n = 0; n < 4; n++) tap(toy, MID.x - 120 + n * 80, MID.y)
      play(toy, 1.2)
      take(toy, 'soap')
      play(toy, 0.3)
      heard(toy)
      let lenses = 0, seen = 0
      const watch = (): void => {
        const now = toy.ripples.filter((ripple) => ripple.kind === 'lens').length
        if (now > seen) lenses += now - seen
        seen = now
      }
      toy.press(MID.x - 150, MID.y)
      watch()
      if (drag) for (let i = 1; i <= 60; i++) {
        toy.move(MID.x - 150 + i * 5, MID.y)
        toy.step(STEP)
        watch()
      }
      toy.release('drop')
      const notes = heard(toy).length
      play(toy, 2)
      // Four holes along the way from where the soap landed.
      return { far: cellAt(toy, MID.x - 150 + 4 * 46, MID.y), notes, lenses }
    }
    const tapped = soaped(false), dragged = soaped(true)
    expect(dragged.lenses).toBeGreaterThanOrEqual(5)
    expect(dragged.notes).toBeGreaterThan(tapped.notes * 3)
    expect(tapped.far).not.toBe(WATER)
    expect(dragged.far).toBe(WATER)

    const toy = new Toy(savedAt('soap'), 1)
    tap(toy, MID.x, MID.y)
    play(toy, 1.2)
    take(toy, 'straw')
    play(toy, 0.3)
    heard(toy)
    toy.press(MID.x + 20, MID.y)
    let deepened = -1, lastNote = -1, notes = 0
    play(toy, 4, () => {
      const said = heard(toy).length
      if (said > 0) {
        lastNote = toy.time
        notes += said
      }
      if (deepened < 0 && toy.tray.breath >= 1) deepened = toy.time
    })
    expect(deepened).toBeGreaterThan(0)
    expect(notes).toBeGreaterThan(2)
    expect(lastNote).toBeLessThanOrEqual(deepened + 1e-6)
    // The straw moves, the dent has more to do, and it is heard again.
    for (let i = 1; i <= 10; i++) {
      toy.move(MID.x + 20 + i * 6, MID.y)
      toy.step(STEP)
    }
    play(toy, 0.3)
    expect(heard(toy).length).toBeGreaterThan(0)
  })

  it('hangs a held print carried further than its own width or let go above the cat, and brings one let go nearer back to the paws', () => {
    expect(FAR).toBe(HELD.w)
    // Carried far, whichever way: the hanging, seen and heard, on the free peg nearest where it was let go.
    for (const [dx, dy, peg] of [[160, 30, 1], [-200, 60, 1], [20, 300, 1], [640, 420, 3], [40, -200, 1]] as const) {
      const off = holding()
      pull(off, middle(HELD).x, middle(HELD).y, middle(HELD).x + dx, middle(HELD).y + dy, 8, 'drop')
      play(off, GRACE + 0.05)
      expect(off.prints[1].peg, `${dx},${dy}`).toBe(peg)
      expect(off.playing).toBe(true)
      let notes = 0
      play(off, 1, () => { notes += heard(off).length })
      expect(notes, `${dx},${dy}`).toBeGreaterThan(0)
    }
    // Let go above the cat it is hung, though it was taken by its top edge and went less than its width.
    const up = holding()
    pull(up, middle(HELD).x, HELD.y + 6, middle(HELD).x, CAT.head.y - CAT.head.ry - 10, 8, 'drop')
    play(up, GRACE + 0.05)
    expect(up.prints[1].peg).toBe(1)
    // Dragged a little, it comes back to the paws with a rustle, seen on its way.
    for (const [dx, dy] of [[22, 6], [90, 40], [-60, 110]] as const) {
      const near = holding()
      pull(near, middle(HELD).x, middle(HELD).y, middle(HELD).x + dx, middle(HELD).y + dy, 6, 'drop')
      heard(near)
      // For the grace it hangs where it was let go.
      play(near, GRACE - 0.05)
      expect(near.placed()[1]).toMatchObject({ x: HELD.x + dx, y: HELD.y + dy })
      expect(heard(near)).toEqual([])
      play(near, 0.1)
      expect(heard(near).length, `${dx},${dy}`).toBeGreaterThan(0)
      const way = near.placed()[1]
      expect(Math.hypot(way.x - HELD.x, way.y - HELD.y)).toBeGreaterThan(1)
      expect(Math.hypot(way.x - HELD.x, way.y - HELD.y)).toBeLessThan(Math.hypot(dx, dy))
      play(near, 0.5)
      expect(near.prints[1].peg).toBeNull()
      expect(near.playing).toBe(false)
      expect(near.placed()[1]).toMatchObject({ x: HELD.x, y: HELD.y })
    }
  })

  it('lets a carry survive a lifted finger: the print and the corner of paper hang where they were let go, and a finger that lands on them again carries on', () => {
    // The held print: let go on its way, taken again within the grace, carried on to the line.
    const toy = holding()
    pull(toy, middle(HELD).x, middle(HELD).y, middle(HELD).x + 60, middle(HELD).y - 40, 6, 'drop')
    play(toy, GRACE * 0.5)
    const hung = toy.placed()[1]
    expect(hung).toMatchObject({ x: HELD.x + 60, y: HELD.y - 40 })
    toy.press(hung.x + 20, hung.y + 30)
    // It does not jump under the finger, and nothing has been hung.
    expect(toy.placed()[1]).toMatchObject({ x: hung.x, y: hung.y })
    expect(toy.prints[1].peg).toBeNull()
    for (let i = 1; i <= 8; i++) {
      toy.move(hung.x + 20 + i * 50, hung.y + 30 - i * 20)
      toy.step(STEP)
    }
    toy.release('drop')
    play(toy, GRACE + 0.05)
    expect(toy.prints[1].peg).toBe(1)
    // A finger that lands somewhere else in the grace: the lift was the drop, and the touch is its own.
    const other = holding()
    pull(other, middle(HELD).x, middle(HELD).y, PEGS[3].x, 90, 8, 'drop')
    tap(other, MID.x, MID.y + 80)
    expect(other.prints[1].peg).toBe(3)
    expect(cellAt(other, MID.x, MID.y + 80)).not.toBe(WATER)
    // Put away in the grace is no drop: the print is in the paws.
    const parked = holding()
    pull(parked, middle(HELD).x, middle(HELD).y, PEGS[3].x, 90, 8, 'drop')
    parked.putAway()
    play(parked, 1)
    expect(parked.prints[1].peg).toBeNull()
    expect(parked.placed()[1]).toMatchObject({ x: HELD.x, y: HELD.y })

    // The corner of paper: dragged toward the tray and let go, it hangs lifted and pulled, and no sheet is laid yet.
    const paper = new Toy(saved(), 1)
    tap(paper, MID.x, MID.y)
    play(paper, 1)
    pull(paper, PAPER_MID.x, PAPER_MID.y, PAPER_MID.x + 50, PAPER_MID.y + 40, 6, 'drop')
    play(paper, GRACE * 0.5)
    expect(paper.playing).toBe(false)
    expect(paper.paper.dx).toBe(50)
    expect(paper.paper.lift.value).toBeGreaterThan(0.5)
    // Taken again where it hangs, it carries on; let go, the grace runs again, and then the sheet is laid.
    paper.press(PAPER_MID.x + 50, PAPER_MID.y + 40)
    expect(paper.playing).toBe(false)
    paper.move(PAPER_MID.x + 60, PAPER_MID.y + 50)
    paper.release('drop')
    expect(paper.prints).toHaveLength(0)
    play(paper, GRACE + 0.05)
    expect(paper.prints).toHaveLength(1)
    expect(paper.playing).toBe(true)
    // Put away in the grace lays nothing.
    const kept = new Toy(saved(), 1)
    tap(kept, MID.x, MID.y)
    play(kept, 1)
    pull(kept, PAPER_MID.x, PAPER_MID.y, PAPER_MID.x + 50, PAPER_MID.y + 40, 6, 'drop')
    kept.putAway()
    play(kept, 1)
    expect(kept.prints).toHaveLength(0)
    expect(count(kept, WATER)).toBeLessThan(CELLS)

    // A tool in the hand hangs where it was let go for the grace, and then is back over its place.
    const comb = new Toy(savedAt('comb'), 1)
    take(comb, 'comb')
    pull(comb, MID.x - 100, MID.y, MID.x + 60, MID.y, 8, 'drop')
    expect(comb.toolPlace('comb')).toMatchObject({ x: MID.x + 60 + 30, y: MID.y - 44, lifted: true })
    play(comb, GRACE + 0.05)
    expect(comb.toolPlace('comb')!.x).toBe(TOOL.comb.x + TOOL.comb.w / 2)
    // A pull through the water is not a carry: it ended at the lift, and the water coasted from there.
    expect(comb.tool).toBe('comb')
  })

  it('does not move a tapped held print under the finger before it flies, and leaves a print whose scene a touch ended hanging still', () => {
    const toy = holding()
    // Taken by a corner: it stays where the cat holds it.
    toy.press(HELD.x + 70, HELD.y + 12)
    expect(toy.placed()[1]).toMatchObject({ x: HELD.x, y: HELD.y })
    toy.step(STEP)
    expect(toy.placed()[1]).toMatchObject({ x: HELD.x, y: HELD.y })
    toy.release('tap')
    // It flies from the paws: its first place is the paws' place.
    expect(toy.placed()[1]).toMatchObject({ x: HELD.x, y: HELD.y })
    play(toy, 0.9)
    expect(Math.abs(toy.swing[1].value) + Math.abs(toy.swing[1].speed)).toBeGreaterThan(0.05)
    // A touch ends the scene: the print hangs still.
    tap(toy, 1100, 800)
    expect(toy.playing).toBe(false)
    expect(toy.swing.map((spring) => [spring.value, spring.speed])).toEqual(PEGS.map(() => [0, 0]))
    play(toy, 1)
    expect(toy.swing.map((spring) => [spring.value, spring.speed])).toEqual(PEGS.map(() => [0, 0]))
  })

  it('lands nothing unseen under a held print: flicked blooms and the cat\'s dab land clear of it', () => {
    const clear = (x: number, y: number): boolean => !inRect(x, y, HELD, 10)
    for (const paw of [0, 1]) {
      const toy = new Toy(savedAt('soap', { finished: true, prints: [{ cells: PLAIN.slice(0, 936), peg: 0 }, { cells: PLAIN.slice(0, 936), peg: null }] }), 1)
      tap(toy, 1100, 800)
      tap(toy, HOLD_PAWS[paw].x, HOLD_PAWS[paw].y)
      const landed: { x: number; y: number }[] = []
      play(toy, 1.2, () => { for (const ripple of toy.ripples) if (ripple.kind === 'ring' && !landed.some((at) => at.x === ripple.x && at.y === ripple.y)) landed.push({ x: ripple.x, y: ripple.y }) })
      expect(landed).toHaveLength(3)
      for (const at of landed) {
        expect(clear(at.x, at.y), `paw ${paw}: ${at.x},${at.y}`).toBe(true)
        expect(onWater(at.x, at.y)).toBe(true)
      }
      expect(toy.held).toBe(1)
      expect(toy.finished).toBe(true)
    }
    // The dab, with colour right under the print.
    const toy = holding()
    tap(toy, middle(HELD).x + 10, HELD.y + HELD.h + 30)
    play(toy, showingsOver() - 0.5)
    let at: { x: number; y: number } | null = null
    play(toy, 4, () => {
      const ring = toy.ripples.find((ripple) => ripple.kind === 'ring')
      if (ring && !at) at = { x: ring.x, y: ring.y }
    })
    expect(at).not.toBeNull()
    const dab = at!
    expect(clear(dab.x, dab.y)).toBe(true)
    expect(Math.hypot(dab.x - CAT.paws[1].x, dab.y - CAT.paws[1].y)).toBeLessThanOrEqual(DAB.most + 1e-6)
    expect(toy.held).toBe(1)
  })

  it('opens with the paws already on a held print, and sounds the wind on the cat for as long as it shows', () => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: PLAIN.slice(0, 936), peg: null }] }), 1)
    expect(toy.cat.pose).toMatchObject({ pawLX: HOLD_PAWS[0].x, pawLY: HOLD_PAWS[0].y, pawRX: HOLD_PAWS[1].x, pawRY: HOLD_PAWS[1].y })
    toy.step(STEP)
    expect(toy.cat.pose.pawLX).toBeCloseTo(HOLD_PAWS[0].x, 3)
    expect(toy.cat.pose.pawRY).toBeCloseTo(HOLD_PAWS[1].y, 3)
    // The straw held on the cat: a rush of wind is heard again and again while its ears lie flat, and not after.
    const blown = new Toy(savedAt('soap'), 1)
    take(blown, 'straw')
    play(blown, 0.3)
    heard(blown)
    blown.press(CAT.head.x, CAT.head.y - 30)
    let gaps = 0, since = 0, notes = heard(blown).length
    expect(notes).toBeGreaterThan(0)
    play(blown, 2, () => {
      const said = heard(blown).length
      since = said > 0 ? 0 : since + STEP
      gaps = Math.max(gaps, since)
      notes += said
    })
    expect(blown.cat.pose.wind).toBeGreaterThan(0.9)
    expect(notes).toBeGreaterThan(6)
    expect(gaps).toBeLessThan(0.3)
    blown.release('drop')
    // The sneeze follows, and then it is quiet.
    play(blown, 0.6)
    heard(blown)
    let after = 0
    play(blown, 2, () => { after += heard(blown).length })
    expect(after).toBe(0)
    expect(blown.cat.pose.wind).toBeLessThan(0.05)
  })

  it('holds a print it cannot stand away by two claws: the paws come to its top edge, a claw out on each', () => {
    const look = (colour: number): { claws: number; top: number; pawL: number; pawR: number; away: number } => {
      const toy = new Toy(saved(), 1)
      toy.tray.cells.fill(colour)
      tap(toy, PAPER_MID.x, PAPER_MID.y)
      let best = { claws: 0, top: 0, pawL: 0, pawR: 0, away: 0 }
      play(toy, 7, () => {
        const pose = toy.cat.pose, held = toy.placed().find((place) => !place.pegged)
        if (held && pose.claws >= best.claws) best = { claws: pose.claws, top: held.y, pawL: pose.pawLY, pawR: pose.pawRY, away: toy.show.away }
      })
      expect(toy.cat.pose.claws).toBeLessThan(0.05)
      return best
    }
    const sour = look(BROWN)
    expect(sour.claws).toBeGreaterThan(0.85)
    // The print is out at arm's length, and each paw is at its top edge, where the claw hooks over it.
    expect(sour.top).toBeGreaterThan(HELD.y + AWAY * 0.8)
    expect(Math.abs(sour.pawL - sour.top)).toBeLessThan(12)
    expect(Math.abs(sour.pawR - sour.top)).toBeLessThan(12)
    // Any other print is held at its sides, with no claw out.
    expect(look(RED).claws).toBeLessThan(0.05)
    expect(look(ORANGE).claws).toBeLessThan(0.05)
  })

  it('draws the straw\'s dimple for as long as it puffs, on plain water too: no puff without it, and it goes when the puff does', () => {
    const toy = new Toy(savedAt('soap'), 1)
    take(toy, 'straw')
    play(toy, 0.3)
    heard(toy)
    expect(toy.dimple).toBeNull()
    toy.press(MID.x, MID.y)
    expect(heard(toy).length).toBeGreaterThan(0)
    expect(toy.dimple).toEqual({ x: MID.x, y: MID.y, deep: 0 })
    let puffs = 0, bare = 0, last = 0
    play(toy, 3, () => {
      if (heard(toy).length > 0) {
        puffs += 1
        if (!toy.dimple) bare += 1
      }
      if (toy.dimple) last = toy.time
    })
    expect(puffs).toBeGreaterThan(3)
    expect(bare).toBe(0)
    // The dent is as deep as it goes: the dimple and the puff are both gone, with the straw still down.
    expect(toy.dimple).toBeNull()
    expect(last).toBeLessThan(1.3)
    // The straw moves: the dimple is back, where the straw is.
    for (let i = 1; i <= 6; i++) {
      toy.move(MID.x + i * 10, MID.y)
      toy.step(STEP)
    }
    expect(toy.dimple).toMatchObject({ x: MID.x + 60, y: MID.y })
    toy.release('drop')
    expect(toy.dimple).toBeNull()
  })

  it('has the cat dab within its reach and in the water, wherever the nearest colour lies', () => {
    for (const [x, y] of [[POOL.x + POOL.w - 30, POOL.y + 30], [POOL.x + 30, POOL.y + 30], [POOL.x + POOL.w - 30, POOL.y + POOL.h - 30], [MID.x, MID.y], [CAT.paws[1].x + 150, POOL.y + 12]] as const) {
      const toy = new Toy(saved(), 1)
      tap(toy, x, y)
      play(toy, showingsOver() - 0.5)
      expect(toy.playing).toBe(false)
      let at: { x: number; y: number } | null = null
      play(toy, 4, () => {
        const ring = toy.ripples.find((ripple) => ripple.kind === 'ring')
        if (ring && !at) at = { x: ring.x, y: ring.y }
      })
      expect(at, `${x},${y}`).not.toBeNull()
      const dab = at!, home = CAT.paws[1]
      expect(Math.hypot(dab.x - home.x, dab.y - home.y), `${x},${y}`).toBeLessThanOrEqual(DAB.most + 1e-6)
      expect(onWater(dab.x, dab.y)).toBe(true)
      expect(dab.y).toBeGreaterThanOrEqual(POOL.y + DAB.in)
    }
    expect(DAB.most).toBe(140)
  })

  it('loses nothing the child made when a print is taken: colour still in the air lands first and is in the print', () => {
    const toy = new Toy(saved(), 1)
    tap(toy, MID.x, MID.y)
    play(toy, 1.2)
    dip(toy, 2)
    // A drop on the paw: three blooms are flicked, and the paper is tapped before the first has landed.
    tap(toy, CAT.paws[1].x, CAT.paws[1].y - 12)
    expect(toy.moving).toBe(true)
    expect(count(toy, BLUE)).toBe(0)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    expect(toy.playing).toBe(true)
    const print = unpack(toy.prints[0].cells, 1872)!
    expect(tally(print, VALUES)[BLUE]).toBeGreaterThanOrEqual(3)
    expect(tally(print, VALUES)[RED]).toBeGreaterThan(0)
    // It is seen on the water the sheet comes down on.
    expect(tally(toy.water, VALUES)[BLUE]).toBeGreaterThan(40)
    // With plain water and colour in the air, the same tap lands it and takes the print of it.
    const plain = new Toy(saved(), 1)
    tap(plain, CAT.paws[1].x, CAT.paws[1].y - 12)
    tap(plain, PAPER_MID.x, PAPER_MID.y)
    expect(plain.prints).toHaveLength(1)
    expect(tally(unpack(plain.prints[0].cells, 1872)!, VALUES)[RED]).toBeGreaterThanOrEqual(3)
  })

  it('is still a cat while it holds a print: it purrs when stroked, bats at the straw\'s dent, and is touched on the paws where they hold', () => {
    const toy = holding()
    play(toy, 0.5)
    heard(toy)
    const purr = purrVoice(0)[1]
    const notes: unknown[] = []
    toy.press(CAT.head.x - 60, CAT.head.y - 50)
    for (let i = 1; i <= 40; i++) {
      toy.move(CAT.head.x - 60 + i * 4, CAT.head.y - 50)
      toy.step(STEP)
      notes.push(...heard(toy))
    }
    expect(toy.cat.pose.ruffle).toBeGreaterThan(0.2)
    toy.release('drop')
    play(toy, 0.6, () => notes.push(...heard(toy)))
    expect((notes as { kind: string; frequency: number }[]).some((note) => note.kind === purr.kind && note.frequency === purr.frequency)).toBe(true)
    expect(toy.held).toBe(1)
    // The straw's dent: the right paw leaves the print to bat at it, and comes back to hold.
    play(toy, 2)
    const holds = toy.cat.pose.pawRX
    take(toy, 'straw')
    toy.press(MID.x + 120, POOL.y + 120)
    let reached = 0
    play(toy, 0.4, () => { reached = Math.max(reached, Math.hypot(toy.cat.pose.pawRX - holds, toy.cat.pose.pawRY - (HELD.y + HELD.h * 0.55))) })
    toy.release('tap')
    expect(reached).toBeGreaterThan(40)
    play(toy, 1.5)
    expect(toy.cat.pose.pawRX).toBeCloseTo(holds, 0)
    // The paw is touched beside the print, where it is drawn.
    dip(toy, 2)
    heard(toy)
    toy.press(HELD.x - 24, HELD.y + HELD.h * 0.55 - 22)
    toy.release('tap')
    expect(toy.cat.pose.tint).toBe(BLUE)
  })

  it('has the cat say what it thinks of a print once, when it holds it up, and not again at the hanging', () => {
    const toy = new Toy(saved(), 1)
    toy.tray.cells.fill(BROWN)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    let up = 0
    play(toy, 7, () => { up += heard(toy).length })
    expect(up).toBeGreaterThan(0)
    const plain = new Toy(saved(), 1)
    plain.tray.cells.fill(RED)
    printed(plain)
    const hang = (game: Toy): string => {
      heard(game)
      tap(game, middle(HELD).x, middle(HELD).y)
      const notes: unknown[] = []
      play(game, 6, () => notes.push(...heard(game)))
      return JSON.stringify(notes)
    }
    // A print it dislikes is hung with the same sounds as any other.
    expect(hang(toy)).toBe(hang(plain))
  })

  it('keeps every line of colour in a print: a line one cell wide on the water is on the sheet', () => {
    const toy = new Toy(saved(), 1)
    const cells = toy.tray.cells
    // One line across, one down, and one on the slant, each one cell wide.
    for (let x = 20; x < 180; x++) cells[40 * 208 + x] = RED
    for (let y = 60; y < 130; y++) cells[y * 208 + 101] = BLUE
    for (let i = 0; i < 60; i++) cells[(70 + i) * 208 + 30 + i] = YELLOW
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    const print = unpack(toy.prints[0].cells, 1872)!
    for (let x = 20; x < 180; x += 4) expect(print[10 * 52 + (x >> 2)], `across ${x}`).toBe(RED)
    for (let y = 60; y < 128; y += 4) expect(print[(y >> 2) * 52 + 25], `down ${y}`).toBe(BLUE)
    // On the slant too, all but the last cell or two of each tip.
    for (let i = 2; i < 58; i++) expect(print[((70 + i) >> 2) * 52 + ((30 + i) >> 2)], `slant ${i}`).toBe(YELLOW)
    // And clear water stays clear: a lone cell of colour is not a line.
    expect(print[30 * 52 + 45]).toBe(WATER)
  })

  it('has the corner of paper ask while there is colour on the water, and not over plain water', () => {
    const toy = new Toy(saved(), 1)
    play(toy, 2)
    expect(toy.asking).toBe(0)
    tap(toy, MID.x, MID.y)
    play(toy, 2)
    expect(toy.asking).toBeGreaterThan(0.95)
    printed(toy)
    expect(toy.asking).toBeLessThan(0.05)
  })

  it('lets the oldest print be heard as it goes: a click and a flutter in the frame it leaves its peg', () => {
    const fifth = (prints: typeof four): number => {
      const toy = new Toy(savedAt('finger', { prints }), 1)
      tap(toy, 1100, 800)
      tap(toy, MID.x, MID.y)
      play(toy, 1)
      heard(toy)
      toy.press(PAPER_MID.x, PAPER_MID.y)
      heard(toy)
      toy.release('tap')
      expect(toy.show.leaving !== null).toBe(prints.length === 4)
      toy.step(STEP)
      return heard(toy).length
    }
    expect(fifth(four)).toBeGreaterThan(fifth(four.slice(0, 3)))
  })
})
